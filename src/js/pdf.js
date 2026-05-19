/**
 * ============================================================
 * ScholarFlow - PDF Viewer Module
 * ============================================================
 * 
 * 本模块负责PDF文件的管理和查看，包括：
 * - PDF文件上传（通过文件选择或拖拽）
 * - PDF数据存储（使用 IndexedDB）
 * - PDF阅读器渲染（使用 Electron webview 标签）
 * - 全屏模式支持
 * - Blob URL内存管理
 * 
 * @module pdf
 * @version 1.0.0
 */

// ============================================================
// IndexedDB 存储
// ============================================================

/** PDF存储的数据库名称 */
const PDF_DB_NAME = 'ScholarFlowPDFs';

/** PDF存储的数据库版本 */
const PDF_DB_VERSION = 1;

/**
 * 打开或创建PDF IndexedDB数据库
 * @returns {Promise<IDBDatabase>} 数据库实例
 */
function openPdfDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PDF_DB_NAME, PDF_DB_VERSION);

    // 首次打开时创建对象存储
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore('pdfs');
    };

    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

/**
 * 存储PDF数据到 IndexedDB
 * @param {string} litId 文献ID（作为键）
 * @param {ArrayBuffer} arrayBuffer PDF二进制数据
 * @returns {Promise<void>}
 */
async function storePdfData(litId, arrayBuffer) {
  const db = await openPdfDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pdfs', 'readwrite');
    tx.objectStore('pdfs').put(arrayBuffer, litId);
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}

/**
 * 从 IndexedDB 获取PDF数据
 * @param {string} litId 文献ID
 * @returns {Promise<ArrayBuffer|null>} PDF二进制数据，不存在则返回null
 */
async function getPdfData(litId) {
  const db = await openPdfDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pdfs', 'readonly');
    const req = tx.objectStore('pdfs').get(litId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = e => reject(e.target.error);
  });
}

/**
 * 从 IndexedDB 删除PDF数据
 * @param {string} litId 文献ID
 * @returns {Promise<void>}
 */
async function removePdfData(litId) {
  const db = await openPdfDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pdfs', 'readwrite');
    tx.objectStore('pdfs').delete(litId);
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}

// ============================================================
// PDF 状态管理
// ============================================================

/**
 * PDF阅读器状态对象
 * @type {Object}
 * @property {string|null} blobUrl 当前Blob URL
 * @property {string|null} litId 当前显示的文献ID
 * @property {boolean} isFullscreen 是否处于全屏模式
 */
let pdfState = {
  blobUrl: null,
  litId: null,
  isFullscreen: false
};

/**
 * 清理之前的Blob URL以防止内存泄漏
 * 每次创建新URL之前应调用此函数
 */
function cleanupPdfBlobUrl() {
  if (pdfState.blobUrl) {
    URL.revokeObjectURL(pdfState.blobUrl);
    pdfState.blobUrl = null;
  }
}

// ============================================================
// PDF 上传处理
// ============================================================

/**
 * 处理PDF文件上传事件
 * 从文件输入框获取文件并保存到IndexedDB
 * @param {Event} event 文件选择事件
 */
function handlePdfUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return;

  // 安全修复 [SEC-009]: 添加 PDF 文件大小限制，防止磁盘空间耗尽
  const MAX_PDF_SIZE = 100 * 1024 * 1024; // 100MB
  if (file.size > MAX_PDF_SIZE) {
    alert(file.size > 500 * 1024 * 1024
      ? (t('pdfTooLarge') || 'PDF file is too large. Maximum size is 100MB.')
      : (t('pdfTooLarge') || 'PDF file is too large. Maximum size is 100MB.'));
    return;
  }

  const litId = currentDetailId;
  if (!litId) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    const data = e.target.result;
    storePdfData(litId, data).then(() => {
      const lit = appData.literature.find(l => l.id === litId);
      if (lit) {
        lit.pdfFileName = file.name;
        saveData();
      }
      renderPdfViewerArea(litId);
    });
  };

  reader.onerror = function (_e) {
    // FileReader error - silently ignore
  };

  reader.readAsArrayBuffer(file);
}

/**
 * 处理PDF文件拖放上传
 * 从拖放事件获取文件并保存到IndexedDB
 * @param {DragEvent} event 拖放事件
 */
function handlePdfDrop(event) {
  const files = event.dataTransfer.files;
  if (!files.length) return;

  const file = files[0];

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return;

  // 安全修复 [ELEC-006]: 拖拽上传也需要文件大小限制，防止绕过 handlePdfUpload 的检查
  const MAX_PDF_SIZE = 100 * 1024 * 1024; // 100MB
  if (file.size > MAX_PDF_SIZE) {
    alert(t('pdfTooLarge') || 'PDF file is too large. Maximum size is 100MB.');
    return;
  }

  const litId = currentDetailId;
  if (!litId) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    const data = e.target.result;
    storePdfData(litId, data).then(() => {
      const lit = appData.literature.find(l => l.id === litId);
      if (lit) {
        lit.pdfFileName = file.name;
        saveData();
      }
      renderPdfViewerArea(litId);
    });
  };

  reader.onerror = function (_e) {
    // FileReader error - silently ignore
  };

  reader.readAsArrayBuffer(file);
}

// ============================================================
// PDF 阅读器渲染
// ============================================================

/**
 * 渲染PDF阅读器区域
 * 根据是否有PDF数据显示上传占位符或PDF阅读器
 * @param {string} litId 文献ID
 */
async function renderPdfViewerArea(litId) {
  const area = document.getElementById('pdfViewerArea');
  if (!area) return;

  cleanupPdfBlobUrl();

  let pdfData = null;
  try {
    pdfData = await getPdfData(litId);
  } catch (e) {
    // IndexedDB read failed
  }

  // 如果没有PDF数据，显示上传占位符
  if (!pdfData) {
    area.innerHTML = `
      <div class="pdf-viewer-placeholder" id="pdfDropZone"
           ondragover="event.preventDefault();this.classList.add('dragover');"
           ondragleave="this.classList.remove('dragover');"
           ondrop="event.preventDefault();this.classList.remove('dragover');handlePdfDrop(event);">
        <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" stroke-width="1.5">
          <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
        </svg>
        <p style="color:var(--text-muted);font-size:14px;">${t('pdfViewer')}</p>
        <p style="color:var(--text-muted);font-size:12px;">${t('uploadPdfHere')}</p>
        <p style="color:var(--text-muted);font-size:11px;">${t('pdfDragHint')}</p>
        <button class="btn btn-primary btn-sm" onclick="document.getElementById('pdfUploadInput').click()">${t('uploadPdf')}</button>
        <input type="file" id="pdfUploadInput" accept=".pdf" style="display:none;" onchange="handlePdfUpload(event)">
      </div>
    `;
    return;
  }

  // 创建Blob URL用于预览
  const blob = new Blob([pdfData], { type: 'application/pdf' });
  pdfState.blobUrl = URL.createObjectURL(blob);
  pdfState.litId = litId;

  // 获取存储的文件名
  const lit = appData.literature.find(l => l.id === litId);
  const fileName = (lit && lit.pdfFileName) ? lit.pdfFileName : 'PDF';

  // 渲染PDF阅读器界面
  area.innerHTML = `
    <div class="pdf-viewer-container" id="pdfViewerContainer">
      <!-- 工具栏 -->
      <div class="pdf-toolbar">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" stroke-width="2">
          <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
        </svg>
        <span class="pdf-filename" title="${fileName}">${fileName}</span>
        
        <div class="separator"></div>

        <!-- 新标签页打开 -->
        <button class="btn-icon" onclick="pdfOpenNewTab()" title="${t('pdfOpenNewTab')}">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6m4-3h6v6m-11 5L21 3"/>
          </svg>
        </button>

        <!-- 全屏切换 -->
        <button class="btn-icon" onclick="pdfToggleFullscreen()" title="${t('pdfFullscreen')}" id="pdfFullscreenBtn">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M4 8V4h4m12 0h-4v0M4 16v4h4m8 0h4v-4"/>
          </svg>
        </button>

        <div style="flex:1;"></div>

        <!-- 替换PDF -->
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('pdfReplaceInput').click()" style="font-size:11px;">
          ${t('pdfReplace')}
        </button>
        <input type="file" id="pdfReplaceInput" accept=".pdf" style="display:none;" onchange="handlePdfUpload(event)">

        <!-- 移除PDF -->
        <button class="btn btn-secondary btn-sm" onclick="handlePdfRemove()" style="font-size:11px;color:#d4354f;">
          ${t('pdfRemove')}
        </button>
      </div>

      <!-- webview 容器（替代 iframe，解决打包后 PDF 无法打开的问题） -->
      <div class="pdf-iframe-wrap" id="pdfIframeWrap">
        <webview id="pdfWebview" src="${pdfState.blobUrl}" allowpopups plugins disablewebsecurity style="width:100%;height:100%;min-height:500px;"></webview>
      </div>
    </div>

    <!-- 全屏退出按钮 -->
    <button id="pdfExitFullscreenBtn" class="pdf-fullscreen-exit" style="display:none;" onclick="pdfToggleFullscreen()">
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 002 2h3M3 16h3a2 2 0 012 2v3"/>
      </svg>
      ${t('pdfExitFullscreen')}
    </button>
  `;
}

// ============================================================
// PDF 控制操作
// ============================================================

/**
 * 在新标签页中打开当前PDF
 */
function pdfOpenNewTab() {
  if (pdfState.blobUrl) {
    window.open(pdfState.blobUrl, '_blank');
  }
}

/**
 * 切换PDF全屏模式
 */
function pdfToggleFullscreen() {
  const container = document.getElementById('pdfViewerContainer');
  if (!container) return;

  pdfState.isFullscreen = !pdfState.isFullscreen;
  container.classList.toggle('fullscreen', pdfState.isFullscreen);

  const btn = document.getElementById('pdfFullscreenBtn');
  if (btn) {
    btn.title = pdfState.isFullscreen ? t('pdfExitFullscreen') : t('pdfFullscreen');
  }

  const exitBtn = document.getElementById('pdfExitFullscreenBtn');
  if (exitBtn) {
    exitBtn.style.display = pdfState.isFullscreen ? 'flex' : 'none';
  }
}

/**
 * 移除当前PDF文件
 * 从IndexedDB删除数据并清理相关状态
 */
async function handlePdfRemove() {
  if (!currentDetailId) return;

  if (!confirm(currentLang === 'zh' ? '确定移除此PDF文件？' : 'Remove this PDF file?')) return;

  cleanupPdfBlobUrl();

  await removePdfData(currentDetailId);

  const lit = appData.literature.find(l => l.id === currentDetailId);
  if (lit) {
    delete lit.pdfFileName;
    saveData();
  }

  pdfState.litId = null;
  pdfState.isFullscreen = false;

  renderPdfViewerArea(currentDetailId);
}

// ============================================================
// 键盘快捷键
// ============================================================

document.addEventListener('keydown', e => {
  if (currentPage !== 'detail') return;

  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

  if (e.key === 'Escape' && pdfState.isFullscreen) {
    pdfToggleFullscreen();
  } else if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    pdfToggleFullscreen();
  }
});

window.addEventListener('beforeunload', cleanupPdfBlobUrl);

// ============================================================
// 模块导出
// ============================================================

if (typeof window !== 'undefined') {
  window.PDF_DB_NAME = PDF_DB_NAME;
  window.PDF_DB_VERSION = PDF_DB_VERSION;
  window.openPdfDB = openPdfDB;
  window.storePdfData = storePdfData;
  window.getPdfData = getPdfData;
  window.removePdfData = removePdfData;
  window.pdfState = pdfState;
  window.cleanupPdfBlobUrl = cleanupPdfBlobUrl;
  window.handlePdfUpload = handlePdfUpload;
  window.handlePdfDrop = handlePdfDrop;
  window.renderPdfViewerArea = renderPdfViewerArea;
  window.pdfOpenNewTab = pdfOpenNewTab;
  window.pdfToggleFullscreen = pdfToggleFullscreen;
  window.handlePdfRemove = handlePdfRemove;
}
