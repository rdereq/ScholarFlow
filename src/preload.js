const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 本地存储API（替代localStorage）
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key) => ipcRenderer.invoke('store:delete', key)
  },
  // 窗口控制
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  // 文件选择（用于PDF上传）
  selectFile: (filters) => ipcRenderer.invoke('dialog:selectFile', filters),
  // 多文件选择（用于批量导入）
  selectMultiFile: (filters) => ipcRenderer.invoke('dialog:selectMultiFile', filters),
  // 文件夹选择（用于批量导入 PDF 文件夹）
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  // 文件读取（用于批量导入时解析 BibTeX/RIS/XML/CSV/PDF）
  file: {
    readAsText: (filePath) => ipcRenderer.invoke('file:readAsText', filePath),
    readAsBase64: (filePath) => ipcRenderer.invoke('file:readAsBase64', filePath),
    listPDFs: (folderPath) => ipcRenderer.invoke('file:listPDFs', folderPath)
  },
  // 应用信息
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion')
  },
  // 自动更新
  updater: {
    /** 监听更新状态变化 */
    onStatusChange: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('updater:status', handler);
      return () => ipcRenderer.removeListener('updater:status', handler);
    },
    /** 手动检查更新 */
    checkNow: () => ipcRenderer.invoke('updater:checkNow'),
    /** 立即安装并重启 */
    installAndRestart: () => ipcRenderer.invoke('updater:installAndRestart'),
    /** 获取更新源列表 */
    getSources: () => ipcRenderer.invoke('updater:getSources'),
    /** 设置更新源 */
    setSource: (source) => ipcRenderer.invoke('updater:setSource', source)
  },
  // 用户管理
  user: {
    getCurrent: () => ipcRenderer.invoke('user:getCurrent'),
    list: () => ipcRenderer.invoke('user:list'),
    create: (name, avatarColor) => ipcRenderer.invoke('user:create', name, avatarColor),
    switch: (userId) => ipcRenderer.invoke('user:switch', userId),
    delete: (userId) => ipcRenderer.invoke('user:delete', userId),
    update: (userId, updates) => ipcRenderer.invoke('user:update', userId, updates)
  },
  // 剪贴板操作
  clipboard: {
    writeText: (text) => ipcRenderer.invoke('clipboard:writeText', text),
    writeImage: (dataUrl) => ipcRenderer.invoke('clipboard:writeImage', dataUrl),
    readText: () => ipcRenderer.invoke('clipboard:readText')
  }
});
