const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');

// 注意 [ELEC-008]: 当前未启用加密。如果未来存储敏感数据（如 API Key），需添加 encryptionKey
// const store = new Store({ encryptionKey: '...' });
const store = new Store();

// 强制设置应用语言为简体中文
app.commandLine.appendSwitch('lang', 'zh-CN');

// 安全修复 [SEC-003]: 生产环境隐藏开发者工具菜单
// 打包后的应用不应暴露 DevTools、重新加载等调试功能，防止用户/攻击者执行任意代码
const viewSubmenu = app.isPackaged ? [
  { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
  { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
  { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
  { type: 'separator' },
  { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' }
] : [
  { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
  { label: '强制重新加载', accelerator: 'Shift+CmdOrCtrl+R', role: 'forceReload' },
  { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
  { type: 'separator' },
  { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
  { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
  { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
  { type: 'separator' },
  { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' }
];

// 定义中文菜单模板
const template = [
  {
    label: '文件', // 原 File
    submenu: [
      { label: '新建', accelerator: 'CmdOrCtrl+N' },
      { label: '打开', accelerator: 'CmdOrCtrl+O' },
      { label: '保存', accelerator: 'CmdOrCtrl+S' },
      { type: 'separator' },
      { label: '退出', role: 'quit' }
    ]
  },
  {
    label: '编辑', // 原 Edit
    submenu: [
      { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
      { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
      { type: 'separator' },
      { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
      { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
      { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' }
    ]
  },
  {
    label: '视图', // 原 View
    submenu: viewSubmenu
  },
  {
    label: '窗口', // 原 Window
    submenu: [
      { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
      { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' }
    ]
  },
  {
    label: '帮助', // 原 Help
    submenu: [
      { label: '关于', role: 'about' }
    ]
  }
];

// 构建并设置菜单
const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

// 避免多实例
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow;
let tray = null;

// 安全修复 [SEC-010]: 保存更新定时器引用，以便在窗口关闭时清理
let updateCheckIntervalId = null;

// 安全修复 [ELEC-009]: 标记应用是否正在退出，用于区分关闭窗口和退出应用
let isQuitting = false;

// 用户退出偏好设置键名
const EXIT_PREF_KEY = 'exitPreference';
// 可能的值：'ask'（每次询问）、'minimize'（直接最小化）、'quit'（直接退出）

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'src/preload.js'),
      contextIsolation: true,  // 安全隔离
      nodeIntegration: false,  // 禁用渲染进程Node.js集成
      webviewTag: true         // 启用 webview 标签（用于 PDF 查看）
    },
    icon: path.join(__dirname, 'src/assets/app.ico') // 窗口图标
  });

  // 安全修复 [ELEC-001]: 拦截 window.open 调用，防止创建不受控的新窗口
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 安全修复 [ELEC-004]: 阻止渲染进程导航到非本地文件
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://')) return;
    event.preventDefault();
    console.warn('[Security] Blocked navigation to:', url);
  });

  // 加载本地HTML文件
  mainWindow.loadFile('src/index.html');

  // 开发环境打开调试工具
  // mainWindow.webContents.openDevTools();

  // 关闭窗口时的交互逻辑
  mainWindow.on('close', (event) => {
    if (isQuitting) return; // 正在退出，不拦截

    event.preventDefault();

    // 读取用户退出偏好
    const pref = getUserExitPreference();

    if (pref === 'minimize') {
      // 用户偏好：直接最小化到托盘
      mainWindow.hide();
      return;
    }

    if (pref === 'quit') {
      // 用户偏好：直接退出
      isQuitting = true;
      app.quit();
      return;
    }

    // 默认行为（pref === 'ask'）：弹出确认对话框
    showExitConfirmDialog();
  });

  // 系统托盘
  createTray();
}

// ============================================================
// 自动更新模块 (electron-updater)
// ============================================================

/** @type {import('electron-updater').UpdateInfo | null} */
let updateInfo = null;

/**
 * 向渲染进程发送更新状态
 * @param {string} type 事件类型: checking, available, not-available, progress, downloaded, error, installing
 * @param {*} data 附加数据
 */
function sendUpdaterStatus(type, data = null) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('updater:status', { type, data });
}

/**
 * 初始化自动更新
 * - 应用启动后自动检查新版本
 * - 发现更新时自动下载并提示安装
 * - 更新失败时向用户展示错误信息
 */
function initAutoUpdater() {
  // 仅在打包后的应用中启用（开发环境跳过）
  if (!app.isPackaged) {
    console.log('[AutoUpdate] 开发模式，跳过自动更新');
    return;
  }

  // 检查 app-update.yml 是否存在，不存在则跳过自动更新（避免 ENOENT 弹窗）
  const updateYmlPath = path.join(process.resourcesPath, 'app-update.yml');
  if (!fs.existsSync(updateYmlPath)) {
    console.log('[AutoUpdate] app-update.yml 不存在，跳过自动更新');
    return;
  }

  autoUpdater.autoDownload = true;        // 发现更新后自动下载
  autoUpdater.autoInstallOnAppQuit = true; // 退出时自动安装（备用方案）
  autoUpdater.allowPrerelease = false;     // 不接受预发布版本

  // ---- 事件监听 ----

  // 检查更新中
  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdate] 正在检查更新...');
    sendUpdaterStatus('checking');
  });

  // 发现可用更新
  autoUpdater.on('update-available', (info) => {
    updateInfo = info;
    console.log(`[AutoUpdate] 发现新版本: v${info.version} (当前: v${app.getVersion()})`);
    console.log(`[AutoUpdate] 发布说明: ${info.releaseNotes || '无'}`);
    sendUpdaterStatus('available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes || '',
      currentVersion: app.getVersion()
    });
  });

  // 无可用更新
  autoUpdater.on('update-not-available', (info) => {
    console.log(`[AutoUpdate] 已是最新版本: v${app.getVersion()}`);
    sendUpdaterStatus('not-available', { currentVersion: app.getVersion() });
  });

  // 下载进度
  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    const speedMB = (progressObj.bytesPerSecond / 1024 / 1024).toFixed(2);
    const transferredMB = (progressObj.transferred / 1024 / 1024).toFixed(1);
    const totalMB = (progressObj.total / 1024 / 1024).toFixed(1);
    console.log(`[AutoUpdate] 下载进度: ${percent}% (${transferredMB}/${totalMB} MB) ${speedMB} MB/s`);
    sendUpdaterStatus('progress', {
      percent,
      speed: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total
    });
  });

  // 下载完成
  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[AutoUpdate] 下载完成: v${info.version}, 准备安装`);
    sendUpdaterStatus('downloaded', {
      version: info.version,
      releaseNotes: info.releaseNotes || ''
    });
  });

  // 更新错误
  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdate] 错误:', err.message || err);
    sendUpdaterStatus('error', {
      message: err.message || String(err),
      code: err.code || 'UNKNOWN'
    });
  });

  // 启动检查（延迟3秒确保窗口就绪）
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((e) => {
      console.error('[AutoUpdate] 检查更新失败:', e.message);
      sendUpdaterStatus('error', { message: e.message, code: 'CHECK_FAILED' });
    });
  }, 3000);

  // 安全修复 [SEC-010]: 保存定时器引用以便后续清理
  updateCheckIntervalId = setInterval(() => {
    autoUpdater.checkForUpdates().catch((e) => {
      console.error('[AutoUpdate] 定期检查更新失败:', e.message);
    });
  }, 30 * 60 * 1000);
}

// IPC: 手动触发检查更新
ipcMain.handle('updater:checkNow', async () => {
  if (!app.isPackaged) return { status: 'dev_mode' };
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      status: result.updateInfo ? 'checked' : 'not-available',
      version: result.updateInfo?.version || app.getVersion()
    };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
});

// IPC: 下载完成后立即安装重启
ipcMain.handle('updater:installAndRestart', async () => {
  if (!app.isPackaged) return { status: 'dev_mode' };
  try {
    await autoUpdater.quitAndInstall(true, true);
    return { status: 'installing' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
});

// ============================================================
// 退出确认对话框与用户偏好管理
// ============================================================

/**
 * 获取用户退出偏好
 * @returns {'ask'|'minimize'|'quit'}
 */
function getUserExitPreference() {
  try {
    const prefPath = path.join(app.getPath('userData'), 'preferences.json');
    if (fs.existsSync(prefPath)) {
      const data = JSON.parse(fs.readFileSync(prefPath, 'utf8'));
      return data[EXIT_PREF_KEY] || 'ask';
    }
  } catch (err) {
    console.warn('[ExitPref] 读取偏好失败:', err.message);
  }
  return 'ask'; // 默认每次询问
}

/**
 * 保存用户退出偏好
 * @param {'ask'|'minimize'|'quit'} pref
 */
function saveUserExitPreference(pref) {
  try {
    const prefPath = path.join(app.getPath('userData'), 'preferences.json');
    let data = {};
    if (fs.existsSync(prefPath)) {
      data = JSON.parse(fs.readFileSync(prefPath, 'utf8'));
    }
    data[EXIT_PREF_KEY] = pref;
    fs.writeFileSync(prefPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('[ExitPref] 偏好已保存:', pref);
  } catch (err) {
    console.warn('[ExitPref] 保存偏好失败:', err.message);
  }
}

/**
 * 显示退出确认对话框
 */
function showExitConfirmDialog() {
  const { dialog } = require('electron');

  dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'ScholarFlow',
    message: '您想如何操作？',
    detail: '可以选择最小化到系统托盘，或退出应用程序。',
    buttons: ['最小化到托盘', '退出程序', '取消'],
    defaultId: 0,     // 默认选中"最小化到托盘"
    cancelId: 2,      // ESC / 关闭对话框 = 取消
    noLink: true
  }).then(({ response }) => {
    if (response === 0) {
      // 最小化到托盘
      mainWindow.hide();
    } else if (response === 1) {
      // 退出程序 → 二次确认
      showQuitConfirmDialog();
    }
    // response === 2: 取消，什么都不做
  }).catch(err => {
    console.warn('[ExitDialog]', err.message);
    // 出错时默认最小化
    mainWindow.hide();
  });
}

/**
 * 退出二次确认对话框（询问是否记住选择）
 */
function showQuitConfirmDialog() {
  const { dialog } = require('electron');

  dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'ScholarFlow',
    message: '确认退出程序？',
    detail: '退出后需要重新打开应用程序才能继续使用。',
    buttons: ['仅本次退出', '以后都直接退出', '取消'],
    defaultId: 0,
    cancelId: 2,
    noLink: true
  }).then(({ response }) => {
    if (response === 0) {
      // 仅本次退出
      isQuitting = true;
      app.quit();
    } else if (response === 1) {
      // 以后都直接退出 → 保存偏好
      saveUserExitPreference('quit');
      isQuitting = true;
      app.quit();
    }
    // response === 2: 取消
  }).catch(err => {
    console.warn('[QuitDialog]', err.message);
  });
}

function createTray() {
  const trayIcon = nativeImage.createFromPath(path.join(__dirname, 'src/assets/app.ico'));
  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示窗口', click: () => { mainWindow.show(); mainWindow.focus(); } },
    // 安全修复 [ELEC-009]: 退出时设置 isQuitting 标志，确保真正退出
    { label: '退出', click: () => { isQuitting = true; app.quit(); } }
  ]);
  tray.setToolTip('ScholarFlow - 文献阅读追踪器');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => { mainWindow.show(); mainWindow.focus(); });
}

// 应用就绪后创建窗口
app.whenReady().then(() => {
  // 确保至少存在一个默认用户
  ensureDefaultUser();

  createWindow();

  // 初始化自动更新
  initAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 安全修复 [ELEC-009]: 有系统托盘时，窗口全部关闭不退出应用
// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') app.quit();
// });

// 退出前清理资源
app.on('before-quit', () => {
  isQuitting = true;
  if (updateCheckIntervalId) {
    clearInterval(updateCheckIntervalId);
    updateCheckIntervalId = null;
  }
});

// 安全修复 [SEC-002]: IPC 通道添加 key 白名单验证，防止任意存储读写
const ALLOWED_STORE_KEYS = new Set(['scholarflow_data', 'scholarflow_lang', 'scholarflow_users', 'scholarflow_currentUser']);

ipcMain.handle('store:get', (_, key) => {
  if (typeof key !== 'string' || !ALLOWED_STORE_KEYS.has(key)) return undefined;
  return store.get(key);
});

ipcMain.handle('store:set', (_, key, value) => {
  if (typeof key !== 'string' || !ALLOWED_STORE_KEYS.has(key)) return;
  if (typeof value !== 'string') return;
  // 防止存储过大数据导致性能问题
  if (value.length > 50 * 1024 * 1024) return;
  store.set(key, value);
});

ipcMain.handle('store:delete', (_, key) => {
  if (typeof key !== 'string' || !ALLOWED_STORE_KEYS.has(key)) return;
  store.delete(key);
});

// ============================================================
// 用户管理 IPC 通道
// ============================================================

// 预设头像颜色
const AVATAR_COLORS = ['#3399ff', '#6c5ce7', '#00b894', '#e17055', '#d63031', '#00cec9', '#e84393', '#6d4c41'];

/**
 * 获取或初始化用户列表
 */
function getUserList() {
  try {
    const raw = store.get('scholarflow_users');
    if (raw && typeof raw === 'string') {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[User] 解析用户列表失败:', e.message);
  }
  return [];
}

/**
 * 保存用户列表
 */
function saveUserList(users) {
  store.set('scholarflow_users', JSON.stringify(users));
}

/**
 * 确保至少存在一个默认用户（首次启动时调用）
 */
function ensureDefaultUser() {
  const users = getUserList();
  if (users.length === 0) {
    const defaultUser = {
      id: 'u_default',
      name: '研究者',
      avatarColor: '#3399ff',
      createdAt: new Date().toISOString()
    };
    saveUserList([defaultUser]);
    store.set('scholarflow_currentUser', defaultUser.id);
    console.log('[User] 已创建默认用户:', defaultUser.name);
    return defaultUser;
  }
  // 确保有当前用户
  const currentId = store.get('scholarflow_currentUser');
  if (!currentId) {
    store.set('scholarflow_currentUser', users[0].id);
  }
  return null;
}

// 获取当前用户
ipcMain.handle('user:getCurrent', () => {
  const users = getUserList();
  const currentId = store.get('scholarflow_currentUser');
  return users.find(u => u.id === currentId) || users[0] || null;
});

// 获取所有用户列表
ipcMain.handle('user:list', () => {
  return getUserList();
});

// 创建新用户
ipcMain.handle('user:create', (_, name, avatarColor) => {
  if (typeof name !== 'string' || name.trim().length === 0) {
    return { error: 'Name is required' };
  }
  const trimmed = name.trim().substring(0, 12);
  if (trimmed.length === 0) {
    return { error: 'Name is required' };
  }
  const color = AVATAR_COLORS.includes(avatarColor) ? avatarColor : AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const newUser = {
    id: 'u_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    name: trimmed,
    avatarColor: color,
    createdAt: new Date().toISOString()
  };
  const users = getUserList();
  users.push(newUser);
  saveUserList(users);
  console.log('[User] 创建用户:', newUser.name, newUser.id);
  return { user: newUser };
});

// 切换用户
ipcMain.handle('user:switch', (_, userId) => {
  if (typeof userId !== 'string') return { error: 'Invalid userId' };
  const users = getUserList();
  const target = users.find(u => u.id === userId);
  if (!target) return { error: 'User not found' };
  store.set('scholarflow_currentUser', userId);
  console.log('[User] 切换到用户:', target.name);
  return { user: target };
});

// 删除用户
ipcMain.handle('user:delete', (_, userId) => {
  if (typeof userId !== 'string') return { error: 'Invalid userId' };
  const currentId = store.get('scholarflow_currentUser');
  if (userId === currentId) return { error: 'Cannot delete current user' };
  const users = getUserList();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return { error: 'User not found' };
  if (users.length <= 1) return { error: 'Must keep at least one user' };
  // 删除用户数据
  try { store.delete('scholarflow_data_' + userId); } catch (e) { /* ignore */ }
  users.splice(idx, 1);
  saveUserList(users);
  console.log('[User] 删除用户:', userId);
  return { success: true };
});

// 更新用户信息
ipcMain.handle('user:update', (_, userId, updates) => {
  if (typeof userId !== 'string') return { error: 'Invalid userId' };
  if (!updates || typeof updates !== 'object') return { error: 'Invalid updates' };
  const users = getUserList();
  const user = users.find(u => u.id === userId);
  if (!user) return { error: 'User not found' };
  if (updates.name !== undefined) {
    const trimmed = String(updates.name).trim().substring(0, 12);
    if (trimmed.length === 0) return { error: 'Name is required' };
    user.name = trimmed;
  }
  if (updates.avatarColor !== undefined && AVATAR_COLORS.includes(updates.avatarColor)) {
    user.avatarColor = updates.avatarColor;
  }
  saveUserList(users);
  console.log('[User] 更新用户:', user.name);
  return { user };
});

// 窗口控制
ipcMain.on('window:minimize', () => {
  mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window:close', () => {
  mainWindow.close();
});

// 文件选择
// 安全修复 [ELEC-002]: 验证 filters 参数结构，防止恶意构造
ipcMain.handle('dialog:selectFile', (_, filters) => {
  let safeFilters = [];
  if (Array.isArray(filters)) {
    safeFilters = filters.filter(f =>
      f && typeof f === 'object' &&
      typeof f.name === 'string' && f.name.length <= 100 &&
      Array.isArray(f.extensions) && f.extensions.every(ext => typeof ext === 'string' && ext.length <= 20)
    );
  }
  return dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: safeFilters
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });
});
