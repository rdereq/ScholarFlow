const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, shell, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const https = require('https');

// autoUpdater 延迟加载，避免在 app 就绪前访问 app.getVersion() 导致崩溃
let autoUpdater = null;

// 注意 [ELEC-008]: 当前未启用加密。如果未来存储敏感数据（如 API Key），需添加 encryptionKey
// const store = new Store({ encryptionKey: '...' });
const store = new Store();

// 强制设置应用语言为简体中文
app.commandLine.appendSwitch('lang', 'zh-CN');

// 视图菜单（已移除开发者工具与刷新项）
const viewSubmenu = [
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
      devTools: false,         // 禁用开发者工具
      webviewTag: true         // 启用 webview 标签（用于 PDF 查看）
    },
    icon: path.join(__dirname, 'src/assets/app.ico') // 窗口图标
  });

  // 安全：拦截 F12 / Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+R 等开发者与刷新快捷键
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const ctrlOrMeta = input.control || input.meta;
    const altKey = input.alt;
    const key = (input.key || '').toLowerCase();
    const code = input.code || '';
    // 阻止开发者工具相关快捷键
    if (code === 'F12') {
      event.preventDefault();
      return;
    }
    if (ctrlOrMeta && input.shift && (key === 'i' || key === 'j' || key === 'c')) {
      event.preventDefault();
      return;
    }
    // 阻止刷新快捷键
    if ((ctrlOrMeta && key === 'r') || code === 'F5' || (ctrlOrMeta && altKey && key === 'r') || (ctrlOrMeta && input.shift && key === 'r')) {
      event.preventDefault();
      return;
    }
    // 阻止查看源代码
    if (ctrlOrMeta && key === 'u') {
      event.preventDefault();
      return;
    }
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
  // 延迟加载 electron-updater（避免在 app 就绪前访问 app.getVersion() 导致崩溃）
  if (!autoUpdater) {
    const updater = require('electron-updater');
    autoUpdater = updater.autoUpdater;
  }
  
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

  // 配置更新源（支持多源，异步获取最新 tag）
  configureAutoUpdaterSource().then(() => {
    autoUpdater.autoDownload = true;        // 发现更新后自动下载
    autoUpdater.autoInstallOnAppQuit = true; // 退出时自动安装（备用方案）
    autoUpdater.allowPrerelease = false;     // 不接受预发布版本
  }).catch((e) => {
    console.error('[AutoUpdate] 配置更新源失败:', e.message);
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;
  });

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

  // 启动检查（延迟 3 秒确保窗口就绪）—— 支持 GitHub 失败自动回退镜像源
  setTimeout(() => {
    autoUpdater.checkForUpdates().then((info) => {
      console.log('[AutoUpdate] GitHub 检查完成:', info ? info.updateInfo?.version : '无更新');
    }).catch((e) => {
      console.error('[AutoUpdate] GitHub 检查失败:', e.message);
      // 关键修复：GitHub 不通时自动切换到镜像源重试
      const currentSource = getUpdateSourceConfig().source;
      if (currentSource === 'github') {
        switchToMirrorAndRetry().then((result) => {
          if (!result.found && result.error) {
            sendUpdaterStatus('error', {
              message: '无法连接到更新服务器，请检查网络或稍后重试。当前已尝试 GitHub 官方源与镜像加速源。',
              code: 'ALL_SOURCES_FAILED'
            });
          }
        });
      } else {
        sendUpdaterStatus('error', { message: e.message, code: 'CHECK_FAILED' });
      }
    });
  }, 3000);

  // 定期检查（30 分钟）—— 同样支持 GitHub 失败时切换到镜像源
  updateCheckIntervalId = setInterval(() => {
    autoUpdater.checkForUpdates().catch((e) => {
      console.error('[AutoUpdate] 定期检查更新失败:', e.message);
      const currentSource = getUpdateSourceConfig().source;
      if (currentSource === 'github') {
        switchToMirrorAndRetry();
      }
    });
  }, 30 * 60 * 1000);
}

// IPC: 获取应用版本号
ipcMain.handle('app:getVersion', async () => {
  return app.getVersion();
});

// ============================================================
// 更新源配置
// ============================================================

/**
 * 预设的更新源
 * 用户可以选择不同的更新源来解决网络问题
 */
const UPDATE_SOURCES = {
  github: {
    name: 'GitHub',
    provider: 'github',
    owner: 'rdereq',
    repo: 'ScholarFlow',
    description: 'GitHub 官方源（需科学上网）'
  },
  mirror: {
    name: 'GitHub 镜像',
    url: 'https://gh-proxy.com/https://github.com/rdereq/ScholarFlow/releases/download',
    description: 'GitHub 镜像加速（推荐国内用户）'
  }
};

/**
 * 获取当前更新源配置
 */
function getUpdateSourceConfig() {
  const savedSource = store.get('updateSource') || 'github';
  return {
    source: savedSource,
    config: UPDATE_SOURCES[savedSource] || UPDATE_SOURCES.github
  };
}

/**
 * 设置更新源
 */
function setUpdateSourceConfig(source) {
  if (!UPDATE_SOURCES[source]) {
    throw new Error('Invalid update source');
  }
  store.set('updateSource', source);
}

// IPC: 获取更新源列表
ipcMain.handle('updater:getSources', async () => {
  return {
    sources: UPDATE_SOURCES,
    current: getUpdateSourceConfig()
  };
});

// IPC: 设置更新源
ipcMain.handle('updater:setSource', async (_event, source) => {
  try {
    setUpdateSourceConfig(source);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

/**
 * 配置 autoUpdater 的更新源（修复 v1.3.2+）
 * 
 * 核心设计（经过网络测试验证）：
 *   GitHub 直连  → 超时（无科学上网环境）
 *   API 路由镜像 → 403 Forbidden（被代理拒绝）
 *   页面 HTML  → 403 Forbidden（被代理拒绝）
 *   文件下载路由 → ✅ 正常工作！
 * 
 * 因此镜像源使用 GitHub 的 /releases/latest/download/ 作为静态 feed URL，
 * 由 GitHub 的 302 重定向自动指向最新 tag，无需先获取 tag。
 * 
 * @returns {Promise<void>}
 */
async function configureAutoUpdaterSource() {
  const { source } = getUpdateSourceConfig();

  if (source === 'github') {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'rdereq',
      repo: 'ScholarFlow'
    });
    console.log('[AutoUpdate] 使用 GitHub 官方更新源');
  } else if (source === 'mirror') {
    // 关键修复：使用静态 feed URL，GitHub 的 /releases/latest/download/ 
    // 会 302 重定向到最新 tag 的下载路径，无需额外 API 调用
    const mirrorFeedUrl = 'https://gh-proxy.com/https://github.com/rdereq/ScholarFlow/releases/latest/download';
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: mirrorFeedUrl,
      useMultipleRangeRequest: false,
      channel: 'latest'
    });
    console.log('[AutoUpdate] 使用 GitHub 镜像更新源:', mirrorFeedUrl);
  }
}

/**
 * 首次检查更新失败时，自动切换到镜像源并重试（修复 v1.3.2+）
 * 解决：未科学上网时 GitHub 不通，自动尝试镜像加速源
 * 
 * @returns {Promise<{swapped: boolean, found: boolean, error?: string}>}
 */
async function switchToMirrorAndRetry() {
  try {
    console.log('[AutoUpdate] GitHub 直连失败，切换到镜像加速源...');
    setUpdateSourceConfig('mirror');
    await configureAutoUpdaterSource();

    const result = await autoUpdater.checkForUpdates();
    if (result && result.updateInfo && result.updateInfo.version) {
      if (isNewerVersion(app.getVersion(), result.updateInfo.version)) {
        console.log('[AutoUpdate] 镜像源发现新版本:', result.updateInfo.version);
        return { swapped: true, found: true };
      }
    }
    console.log('[AutoUpdate] 镜像源检查完成，已是最新版本');
    return { swapped: true, found: false };
  } catch (e) {
    console.error('[AutoUpdate] 镜像源也失败:', e.message);
    return { swapped: true, found: false, error: e.message };
  }
}

/**
 * 比较版本号，判断是否有新版本（修复 v1.3.2+）
 * 旧实现：只逐位比较 latest > current，不处理 latest < current 的反向情况
 * 新实现：逐位比较，发现 latest 小于 current 时立即返回 false
 */
function isNewerVersion(current, latest) {
  const parseVersion = (v) => {
    const versionStr = String(v).replace(/^v/, '');
    return versionStr.split('.').map(p => parseInt(p, 10) || 0);
  };

  const currentParts = parseVersion(current);
  const latestParts = parseVersion(latest);

  for (let i = 0; i < 3; i++) {
    const cur = currentParts[i] || 0;
    const lat = latestParts[i] || 0;
    if (lat > cur) return true;   // latest 更大 → 有新版本
    if (lat < cur) return false;  // latest 更小 → 不是新版本
  }
  return false;  // 相等
}

// IPC: 手动触发检查更新（修复 v1.3.2+ — 支持 GitHub 失败自动回退镜像）
ipcMain.handle('updater:checkNow', async () => {
  if (!app.isPackaged) return { status: 'dev_mode' };
  // 检查 app-update.yml 是否存在
  const updateYmlPath = path.join(process.resourcesPath, 'app-update.yml');
  if (!fs.existsSync(updateYmlPath)) {
    return { status: 'error', message: 'app-update.yml not found. Please use the installer version for auto-updates.' };
  }
  try {
    // 重新配置更新源（用户可能更改了设置）
    await configureAutoUpdaterSource();

    const currentVersion = app.getVersion();

    // 1) 先尝试当前配置的更新源
    let latestVersion = null;
    let sourceUsed = getUpdateSourceConfig().source;

    try {
      const result = await autoUpdater.checkForUpdates();
      latestVersion = result.updateInfo?.version;
    } catch (primaryErr) {
      // 2) 如果 GitHub 源失败，自动切换到镜像源重试
      if (sourceUsed === 'github') {
        console.log('[AutoUpdate] GitHub 失败，切换镜像源重试...');
        try {
          setUpdateSourceConfig('mirror');
          await configureAutoUpdaterSource();
          const result2 = await autoUpdater.checkForUpdates();
          latestVersion = result2.updateInfo?.version;
          sourceUsed = 'mirror';
          console.log('[AutoUpdate] 镜像源成功，版本:', latestVersion);
        } catch (mirrorErr) {
          console.error('[AutoUpdate] 镜像源也失败:', mirrorErr.message);
          // 3) 两个源都失败，恢复为 github 配置，下一次再尝试
          setUpdateSourceConfig('github');
          return {
            status: 'error',
            message: '无法连接到更新服务器，请检查网络或稍后重试。已尝试 GitHub 官方源与镜像加速源。',
            code: 'ALL_SOURCES_FAILED'
          };
        }
      } else {
        throw primaryErr;
      }
    }

    // 比较版本，确认是否有真正的新版本
    if (latestVersion && isNewerVersion(currentVersion, latestVersion)) {
      return {
        status: 'checked',
        version: latestVersion,
        currentVersion: currentVersion
      };
    } else {
      return {
        status: 'not-available',
        version: currentVersion,
        currentVersion: currentVersion
      };
    }
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
// - 精确 key：白名单内
// - 前缀 key：scholarflow_data_* 用户隔离数据，scholarflow_user_* 单用户记录
const ALLOWED_STORE_KEYS = new Set(['scholarflow_data', 'scholarflow_lang', 'scholarflow_users', 'scholarflow_currentUser']);
const ALLOWED_STORE_PREFIXES = ['scholarflow_data_', 'scholarflow_user_'];

function _isAllowedStoreKey(key) {
  if (typeof key !== 'string' || key.length === 0 || key.length > 200) return false;
  if (ALLOWED_STORE_KEYS.has(key)) return true;
  for (const prefix of ALLOWED_STORE_PREFIXES) {
    if (key.indexOf(prefix) === 0) return true;
  }
  return false;
}

ipcMain.handle('store:get', (_, key) => {
  if (!_isAllowedStoreKey(key)) {
    console.warn('[IPC] store:get refused for key:', key);
    return undefined;
  }
  const value = store.get(key);
  console.log(`[IPC] store:get key=${key}, size=${typeof value === 'string' ? value.length : 'N/A'}`);
  return value;
});

ipcMain.handle('store:set', (_, key, value) => {
  if (!_isAllowedStoreKey(key)) {
    console.warn('[IPC] store:set refused for key:', key);
    return;
  }
  if (typeof value !== 'string') {
    console.warn('[IPC] store:set refused — value is not a string, type:', typeof value);
    return;
  }
  // 防止存储过大数据导致性能问题
  if (value.length > 50 * 1024 * 1024) {
    console.warn('[Store] Value exceeds 50MB limit, refusing to store');
    return;
  }
  try {
    store.set(key, value);
    console.log(`[IPC] store:set ✓ key=${key}, size=${Math.round(value.length / 1024)}KB`);
  } catch (err) {
    console.error('[IPC] store:set failed for key ' + key + ':', err);
  }
});

ipcMain.handle('store:delete', (_, key) => {
  if (!_isAllowedStoreKey(key)) {
    console.warn('[IPC] store:delete refused for key:', key);
    return;
  }
  try {
    store.delete(key);
    console.log('[IPC] store:delete ✓ key=' + key);
  } catch (err) {
    console.error('[IPC] store:delete failed for key ' + key + ':', err);
  }
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

// 多文件选择（支持同时选多个文件，用于批量导入）
ipcMain.handle('dialog:selectMultiFile', (_, filters) => {
  let safeFilters = [];
  if (Array.isArray(filters)) {
    safeFilters = filters.filter(f =>
      f && typeof f === 'object' &&
      typeof f.name === 'string' && f.name.length <= 100 &&
      Array.isArray(f.extensions) && f.extensions.every(ext => typeof ext === 'string' && ext.length <= 20)
    );
  }
  return dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: safeFilters
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths;
    }
    return [];
  });
});

// 文件夹选择（用于批量导入 PDF 文件夹）
ipcMain.handle('dialog:selectFolder', () => {
  return dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });
});

// 列出文件夹内的 PDF 文件
ipcMain.handle('file:listPDFs', (_, folderPath) => {
  try {
    if (!folderPath || typeof folderPath !== 'string') return [];
    const fsMod = require('fs');
    const pathMod = require('path');
    if (!fsMod.existsSync(folderPath)) return [];
    const files = fsMod.readdirSync(folderPath);
    const pdfFiles = files
      .filter(f => /\.pdf$/i.test(f))
      .map(f => pathMod.join(folderPath, f))
      .filter(fp => {
        try { return fsMod.statSync(fp).isFile(); } catch (e) { return false; }
      });
    return pdfFiles;
  } catch (e) {
    console.error('[file:listPDFs] error:', e.message);
    return [];
  }
});

// 读取文件内容为 base64（用于在渲染进程用 pdf.js 解析）
// 限制：最大 50MB，防止大文件占用过多内存
ipcMain.handle('file:readAsBase64', (_, filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') return null;
    const fsMod = require('fs');
    if (!fsMod.existsSync(filePath)) return null;
    const stat = fsMod.statSync(filePath);
    if (!stat.isFile()) return null;
    if (stat.size > 50 * 1024 * 1024) {
      console.warn('[file:readAsBase64] file too large (>50MB):', filePath);
      return null;
    }
    const buf = fsMod.readFileSync(filePath);
    return {
      base64: buf.toString('base64'),
      fileName: filePath.split(/[\/\\]/).pop(),
      size: buf.length
    };
  } catch (e) {
    console.error('[file:readAsBase64] error:', e.message);
    return null;
  }
});

// 读取文本文件内容（用于 BibTeX / RIS / XML / CSV 等文本格式）
ipcMain.handle('file:readAsText', (_, filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') return null;
    const fsMod = require('fs');
    if (!fsMod.existsSync(filePath)) return null;
    const buf = fsMod.readFileSync(filePath);
    // 尝试 UTF-8，必要时回退 GBK（针对中文知网导出）
    let content;
    try {
      content = buf.toString('utf8');
      if (content.indexOf('\ufffd') !== -1 && content.length > 0) {
        // 含有替换字符，尝试 GBK 编码
        const iconv = require('iconv-lite');
        if (iconv && iconv.decode) {
          try { content = iconv.decode(buf, 'gbk'); } catch (ee) { /* keep utf8 */ }
        }
      }
    } catch (ee) {
      content = buf.toString('utf8');
    }
    return {
      content: content,
      fileName: filePath.split(/[\/\\]/).pop()
    };
  } catch (e) {
    console.error('[file:readAsText] error:', e.message);
    return null;
  }
});

// Module 3: Clipboard Operations — 使用顶层已引入的 clipboard

ipcMain.handle('clipboard:writeText', async (_, text) => {
  try {
    clipboard.writeText(String(text || ''));
    return true;
  } catch (e) {
    console.error('[Clipboard] writeText error:', e);
    return false;
  }
});

ipcMain.handle('clipboard:writeImage', async (_, dataUrl) => {
  try {
    // dataUrl is base64 image string like "data:image/png;base64,..."
    if (!dataUrl || typeof dataUrl !== 'string') return false;

    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buf = Buffer.from(base64Data, 'base64');

    // Determine format from data URL
    const format = (dataUrl.match(/data:image\/(\w+)/) || [])[1] || 'png';

    const { nativeImage } = require('electron');
    const img = nativeImage.createFromBuffer(buf);
    clipboard.writeImage(img);

    return true;
  } catch (e) {
    console.error('[Clipboard] writeImage error:', e);
    return false;
  }
});

ipcMain.handle('clipboard:readText', async () => {
  try {
    return clipboard.readText();
  } catch (e) {
    console.error('[Clipboard] readText error:', e);
    return '';
  }
});
