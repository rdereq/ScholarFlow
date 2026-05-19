/**
 * ============================================================
 * ScholarFlow - Auto Update UI Module
 * ============================================================
 *
 * 负责渲染更新进度条、状态提示和安装按钮
 * 依赖: window.electronAPI.updater (preload 暴露)
 */

// ============================================================
// 状态管理
// ============================================================

const updateState = {
  status: 'idle',       // idle | checking | available | downloading | downloaded | error
  percent: 0,
  version: null,
  releaseNotes: '',
  errorMessage: ''
};

/** 更新状态变化时的回调列表 */
let updateListeners = [];

/**
 * 订阅更新状态变化
 * @param {Function} callback 回调函数，参数为 updateState
 */
function onUpdateStateChange(callback) {
  updateListeners.push(callback);
}

/**
 * 触发所有监听器
 */
function emitUpdateState() {
  updateListeners.forEach(cb => cb({ ...updateState }));
}

/**
 * 格式化字节大小
 * @param {number} bytes 字节数
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ============================================================
// DOM 操作
// ============================================================

let updateBarEl = null;
let updateOverlayEl = null;

/**
 * 创建或获取更新进度条容器
 */
function ensureUpdateBar() {
  if (document.getElementById('autoUpdateBar')) return document.getElementById('autoUpdateBar');

  const bar = document.createElement('div');
  bar.id = 'autoUpdateBar';
  bar.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: 0',
    'right: 0',
    'height: 0',
    'z-index: 9999',
    'background: linear-gradient(135deg, #4f46e5, #6366f1)',
    'transition: height 0.3s ease',
    'overflow: hidden',
    'display: flex',
    'align-items: center',
    'justify-content: center'
  ].join(';');
  bar.innerHTML = '<div id="autoUpdateText" style="color:#fff;font-size:12px;font-family:Plus Jakarta Sans,sans-serif;white-space:nowrap;opacity:0;transition:opacity 0.2s;"></div>';

  document.body.appendChild(bar);
  updateBarEl = bar;
  return bar;
}

/**
 * 显示/隐藏进度条
 * @param {boolean} show 是否显示
 * @param {number} percent 进度百分比
 * @param {string} text 提示文字
 */
function showProgress(show, percent = 0, text = '') {
  const bar = ensureUpdateBar();

  if (show && percent > 0) {
    bar.style.height = '32px';
    bar.innerHTML = `<div style="position:absolute;left:0;top:0;bottom:0;background:rgba(255,255,255,0.25);width:${percent}%;transition:width 0.3s;"></div><div id="autoUpdateText" style="color:#fff;font-size:12px;font-family:Plus Jakarta Sans,sans-serif;white-space:nowrap;position:relative;z-index:1;display:flex;align-items:center;gap:8px;"><span>${text}</span><span style="opacity:0.8;">${percent}%</span></div>`;
  } else if (show) {
    bar.style.height = '36px';
    bar.innerHTML = `<div id="autoUpdateText" style="color:#fff;font-size:12px;font-family:Plus Jakarta Sans,sans-serif;white-space:nowrap;position:relative;z-index:1;">${text}</div>`;
  } else {
    setTimeout(() => { if (bar) bar.style.height = '0'; }, show ? 0 : 300);
  }
}

/**
 * 创建更新完成后的操作弹窗
 */
function showUpdateComplete(version, releaseNotes) {
  if (document.getElementById('updateCompleteModal')) return;

  const overlay = document.createElement('div');
  overlay.id = 'updateCompleteModal';
  overlay.style.cssText = [
    'position: fixed', 'inset: 0', 'z-index: 10000',
    'background: rgba(0,0,0,0.5)', 'backdrop-filter: blur(4px)',
    'display: flex', 'align-items: center', 'justify-content: center'
  ].join(';');

  overlay.innerHTML = `
    <div style="background:var(--bg-card);border-radius:16px;padding:32px;max-width:420px;width:90%;box-shadow:var(--shadow-lg);text-align:center;">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#25965d" stroke-width="2" style="margin-bottom:16px;">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <h3 style="font-family:'Playfair Display',serif;font-size:20px;color:var(--text-primary);margin-bottom:8px;">${t('update_ready_title') || 'Update Ready'}</h3>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:6px;">
        ${t('update_ready_version') || 'Version'} <strong>v${version}</strong> ${t('update_ready_downloaded') || 'has been downloaded'}
      </p>
      ${releaseNotes ? `<div style="text-align:left;background:var(--bg-page);border-radius:8px;padding:12px;margin-top:12px;max-height:120px;overflow-y:auto;"><p style="font-size:11px;color:var(--text-secondary);margin:0;line-height:1.6;">${escapeHtml(releaseNotes).replace(/\n/g, '<br>')}</p></div>` : ''}
      <div style="display:flex;gap:12px;justify-content:center;margin-top:20px;">
        <button onclick="dismissUpdateModal()" style="padding:8px 20px;border:1px solid var(--border-color);border-radius:8px;background:transparent;color:var(--text-secondary);cursor:pointer;font-size:13px;font-family:Plus Jakarta Sans,sans-serif;">
          ${t('update_later') || 'Later'}
        </button>
        <button onclick="installAndRestart()" style="padding:8px 24px;border:none;border-radius:8px;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;cursor:pointer;font-size:13px;font-weight:600;font-family:Plus Jakarta Sans,sans-serif;">
          ${t('update_restart') || 'Restart & Install'}
        </button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  updateOverlayEl = overlay;
}

/**
 * 创建更新错误提示弹窗
 */
function showErrorModal(message, code) {
  if (document.getElementById('updateErrorModal')) return;

  const overlay = document.createElement('div');
  overlay.id = 'updateErrorModal';
  overlay.style.cssText = [
    'position: fixed', 'inset: 0', 'z-index: 10000',
    'background: rgba(0,0,0,0.4)', 'display: flex',
    'align-items: flex-start', 'justify-content: center', 'padding-top:80px'
  ].join(';');

  overlay.innerHTML = `
    <div style="background:#fef2f2;border-left:3px solid #d4354f;border-radius:0 8px 8px 0;padding:14px 18px;max-width:480px;width:90%;box-shadow:var(--shadow-md);">
      <p style="font-size:13px;font-weight:600;color:#b82940;margin:0 0 6px 0;font-family:'DM Sans',sans-serif;">
        ${t('update_failed') || 'Update Failed'}
      </p>
      <p style="font-size:12px;color:var(--text-secondary);margin:0;line-height:1.5;">
        ${escapeHtml(message || t('update_unknown_error') || 'An unknown error occurred during the update process.')}
        ${code !== 'UNKNOWN' ? `<code style="background:rgba(0,0,0,0.06);padding:1px 5px;border-radius:3px;font-size:11px;">[${escapeHtml(code)}]</code>` : ''}
      </p>
      <button onclick="this.parentElement.parentElement.remove()" style="margin-top:10px;padding:4px 14px;border:1px solid #fecaca;border-radius:6px;background:transparent;color:#b82940;cursor:pointer;font-size:11px;font-family:Plus Jakarta Sans,sans-serif;">
        ${t('close') || 'Close'}
      </button>
    </div>`;

  document.body.appendChild(overlay);

  // 自动消失
  setTimeout(() => {
    if (document.getElementById('updateErrorModal')) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.5s';
      setTimeout(() => overlay.remove(), 500);
    }
  }, 8000);
}

// ============================================================
// 全局函数（供 HTML onclick 调用）
// ============================================================

window.dismissUpdateModal = function () {
  if (updateOverlayEl) { updateOverlayEl.remove(); updateOverlayEl = null; }
};

window.installAndRestart = async function () {
  if (!window.electronAPI?.updater) return;
  try {
    await window.electronAPI.updater.installAndRestart();
  } catch (e) {
    console.error('[AutoUpdateUI] 安装失败:', e);
  }
};

// ============================================================
// 核心逻辑：处理主进程发来的更新事件
// ============================================================

/**
 * 处理更新状态消息
 * @param {{ type: string, data: any }} statusMsg
 */
function handleUpdaterStatus(statusMsg) {
  const { type, data } = statusMsg;

  switch (type) {
    case 'checking':
      updateState.status = 'checking';
      updateState.errorMessage = '';
      showProgress(true, 0, t('checking_for_update') || 'Checking for updates...');
      break;

    case 'available':
      updateState.status = 'downloading';
      updateState.version = data.version;
      updateState.releaseNotes = data.releaseNotes;
      showProgress(true, 0,
        `${t('downloading_update') || 'Downloading'} v${data.version}${data.currentVersion ? ` (${t('from_version') || 'from'} v${data.currentVersion})` : ''}`
      );
      break;

    case 'not-available':
      updateState.status = 'idle';
      showProgress(false);
      break;

    case 'progress': {
      updateState.percent = data.percent;
      const speed = formatBytes(data.speed);
      const transferred = formatBytes(data.transferred);
      const total = formatBytes(data.total);
      showProgress(true, data.percent,
        `${transferred}/${total} (${speed}/s)`
      );
      break;
    }

    case 'downloaded':
      updateState.status = 'downloaded';
      showProgress(false);
      showUpdateComplete(data.version || updateState.version, data.releaseNotes || updateState.releaseNotes);
      break;

    case 'error':
      updateState.status = 'error';
      updateState.errorMessage = data.message;
      showProgress(false);
      showErrorModal(data.message, data.code);
      break;
  }

  emitUpdateState();
}

/**
 * 初始化自动更新模块
 * 必须在 DOM 加载完成后调用
 */
function initAutoUpdaterUI() {
  // 检查 API 可用性
  if (!window.electronAPI?.updater) {
    console.log('[AutoUpdateUI] updater API 不可用（可能运行在浏览器中）');
    return false;
  }

  // 监听主进程的更新事件
  window.electronAPI.updater.onStatusChange(handleUpdaterStatus);

  console.log('[AutoUpdateUI] 初始化完成');
  return true;
}

// 全局暴露
if (typeof window !== 'undefined') {
  window.initAutoUpdaterUI = initAutoUpdaterUI;
  window.updateState = updateState;
  window.onUpdateStateChange = onUpdateStateChange;
}
