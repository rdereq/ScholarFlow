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
    installAndRestart: () => ipcRenderer.invoke('updater:installAndRestart')
  },
  // 用户管理
  user: {
    getCurrent: () => ipcRenderer.invoke('user:getCurrent'),
    list: () => ipcRenderer.invoke('user:list'),
    create: (name, avatarColor) => ipcRenderer.invoke('user:create', name, avatarColor),
    switch: (userId) => ipcRenderer.invoke('user:switch', userId),
    delete: (userId) => ipcRenderer.invoke('user:delete', userId),
    update: (userId, updates) => ipcRenderer.invoke('user:update', userId, updates)
  }
});
