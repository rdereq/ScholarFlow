/**
 * ============================================================
 * ScholarFlow - PDF Viewer Core Module (v1.3.0)
 * ============================================================
 * 
 * 本模块负责 PDF 文件的渲染和交互，包括：
 * - PDF.js 集成与页面渲染
 * - 翻页、缩放、全屏功能
 * - PDF 内全文搜索
 * - 目录提取与导航
 * - 双页/单页切换
 * - 滚动/翻页模式
 * - 阅读位置记忆
 * - 夜间模式适配
 * 
 * @module pdf-viewer
 * @version 1.3.0
 */

// ============================================================
// PDF.js 配置与初始化
// ============================================================

// PDF.js worker 路径
const PDFJS_WORKER_SRC = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

// PDF 阅读器状态
let pdfViewerState = {
  // 文档相关
  doc: null,                    // PDF 文档对象
  litId: null,                  // 当前文献 ID
  blobUrl: null,                // Blob URL
  
  // 页面相关
  currentPage: 1,               // 当前页码
  totalPages: 0,                // 总页数
  pageRendering: false,         // 是否正在渲染
  pendingPage: null,            // 待渲染的页码
  
  // 缩放相关
  scale: 1.0,                   // 当前缩放比例
  defaultScale: 1.0,            // 默认缩放比例
  minScale: 0.25,               // 最小缩放
  maxScale: 4.0,                // 最大缩放
  fitWidthScale: 1.0,           // 适应宽度缩放比例
  
  // 视图模式
  viewMode: 'single',           // 'single' | 'double' 单页/双页
  scrollMode: 'vertical',       // 'vertical' | 'horizontal' | 'page' 滚动模式
  
  // 全屏
  isFullscreen: false,          // 是否全屏
  
  // 搜索
  searchText: '',               // 搜索文本
  searchResults: [],            // 搜索结果
  currentSearchIndex: -1,       // 当前搜索结果索引
  
  // 目录
  outline: [],                  // PDF 目录
  
  // 夜间模式
  nightMode: false,             // 夜间模式
  
  // 阅读位置记忆
  lastPosition: null,           // 上次阅读位置
  
  // 渲染缓存
  pageCache: new Map(),         // 页面渲染缓存
  canvasList: [],               // Canvas 列表
  
  // 文本层
  textLayers: [],               // 文本层（用于选择和搜索）
  
  // 标注层
  annotationLayer: null,        // 标注层容器
  inkLayer: null,               // 手写层容器
};

// ============================================================
// IndexedDB 存储（保留原有功能）
// ============================================================

const PDF_DB_NAME = 'ScholarFlowPDFs';
const PDF_DB_VERSION = 2; // 升级版本以支持标注存储

/**
 * 打开或创建 PDF IndexedDB 数据库
 */
function openPdfDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PDF_DB_NAME, PDF_DB_VERSION);
    
    req.onupgradeneeded = e => {
      const db = e.target.result;
      // PDF 文件存储
      if (!db.objectStoreNames.contains('pdfs')) {
        db.createObjectStore('pdfs');
      }
      // 标注数据存储
      if (!db.objectStoreNames.contains('annotations')) {
        db.createObjectStore('annotations');
      }
      // 阅读位置存储
      if (!db.objectStoreNames.contains('positions')) {
        db.createObjectStore('positions');
      }
    };
    
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

/**
 * 存储 PDF 数据到 IndexedDB
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
 * 从 IndexedDB 获取 PDF 数据
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
 * 从 IndexedDB 删除 PDF 数据
 */
async function removePdfData(litId) {
  const db = await openPdfDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['pdfs', 'annotations', 'positions'], 'readwrite');
    tx.objectStore('pdfs').delete(litId);
    tx.objectStore('annotations').delete(litId);
    tx.objectStore('positions').delete(litId);
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}

/**
 * 保存阅读位置
 */
async function saveReadingPosition(litId, position) {
  const db = await openPdfDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('positions', 'readwrite');
    tx.objectStore('positions').put({
      litId,
      page: position.page,
      scale: position.scale,
      viewMode: position.viewMode,
      scrollMode: position.scrollMode,
      scrollTop: position.scrollTop,
      updatedAt: new Date().toISOString()
    }, litId);
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}

/**
 * 获取阅读位置
 */
async function getReadingPosition(litId) {
  const db = await openPdfDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('positions', 'readonly');
    const req = tx.objectStore('positions').get(litId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = e => reject(e.target.error);
  });
}

// ============================================================
// PDF 文档加载
// ============================================================

/**
 * 初始化 PDF.js
 */
async function initPdfJs() {
  if (typeof pdfjsLib === 'undefined') {
    // 动态加载 PDF.js
    await loadScript('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs');
  }
  
  // 设置 worker
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
  }
}

/**
 * 动态加载脚本
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.type = 'module';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * 加载 PDF 文档
 */
async function loadPdfDocument(arrayBuffer, litId) {
  try {
    // 清理旧文档
    if (pdfViewerState.doc) {
      pdfViewerState.doc.destroy();
      pdfViewerState.doc = null;
    }
    
    // 清理缓存
    pdfViewerState.pageCache.clear();
    pdfViewerState.canvasList = [];
    pdfViewerState.textLayers = [];
    
    // 加载新文档
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
      cMapPacked: true,
    });
    
    pdfViewerState.doc = await loadingTask.promise;
    pdfViewerState.totalPages = pdfViewerState.doc.numPages;
    pdfViewerState.litId = litId;
    pdfViewerState.currentPage = 1;
    
    // 提取目录
    await loadPdfOutline();
    
    // 恢复上次阅读位置
    const lastPos = await getReadingPosition(litId);
    if (lastPos) {
      pdfViewerState.lastPosition = lastPos;
      pdfViewerState.currentPage = lastPos.page || 1;
      pdfViewerState.scale = lastPos.scale || 1.0;
      pdfViewerState.viewMode = lastPos.viewMode || 'single';
      pdfViewerState.scrollMode = lastPos.scrollMode || 'vertical';
    }
    
    return true;
  } catch (error) {
    console.error('[PDF] 加载文档失败:', error);
    return false;
  }
}

/**
 * 加载 PDF 目录
 */
async function loadPdfOutline() {
  try {
    pdfViewerState.outline = await pdfViewerState.doc.getOutline() || [];
  } catch (error) {
    console.warn('[PDF] 提取目录失败:', error);
    pdfViewerState.outline = [];
  }
}

// ============================================================
// 页面渲染
// ============================================================

/**
 * 渲染单页
 */
async function renderPage(pageNum, canvas, textLayerDiv = null) {
  if (!pdfViewerState.doc) return null;
  
  const page = await pdfViewerState.doc.getPage(pageNum);
  const viewport = page.getViewport({ scale: pdfViewerState.scale });
  
  // 设置 canvas 尺寸
  const outputScale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = Math.floor(viewport.width) + 'px';
  canvas.style.height = Math.floor(viewport.height) + 'px';
  
  const ctx = canvas.getContext('2d');
  ctx.scale(outputScale, outputScale);
  
  // 渲染页面
  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
  };
  
  // 夜间模式滤镜
  if (pdfViewerState.nightMode) {
    renderContext.background = '#1a1a1a';
  }
  
  await page.render(renderContext).promise;
  
  // 渲染文本层
  if (textLayerDiv) {
    textLayerDiv.innerHTML = '';
    const w = Math.floor(viewport.width);
    const h = Math.floor(viewport.height);
    textLayerDiv.style.width = w + 'px';
    textLayerDiv.style.height = h + 'px';
    
    const textContent = await page.getTextContent();
    await renderTextLayer(textLayerDiv, viewport, textContent);
    
    textLayerDiv.style.width = w + 'px';
    textLayerDiv.style.height = h + 'px';
    textLayerDiv.style.zIndex = '100';
    textLayerDiv.style.pointerEvents = 'auto';
    textLayerDiv.style.userSelect = 'text';
    
    storeTextContent(pageNum, textContent, viewport);

    // 存储文本内容数据供标注使用（包含字符位置信息）
    if (!pdfViewerState.pageTextContents) {
      pdfViewerState.pageTextContents = {};
    }
    pdfViewerState.pageTextContents[pageNum] = {
      items: textContent.items,
      viewport: viewport
    };
  }
  
  return page;
}

/**
 * 渲染文本层
 */
async function renderTextLayer(container, viewport, textContent) {
  // 使用 PDF.js 的文本层渲染
  if (pdfjsLib.renderTextLayer) {
    try {
      // PDF.js 3.x/4.x 兼容的参数
      await pdfjsLib.renderTextLayer({
        textContentSource: textContent,
        container: container,
        viewport: viewport,
        textDivs: [],  // 重要：用于收集文本 div 元素
      }).promise;
    } catch (e) {
      console.error('[PDF] renderTextLayer error:', e);
      renderTextLayerManual(container, viewport, textContent);
    }
  } else {
    // 手动渲染文本层（简化版）
    renderTextLayerManual(container, viewport, textContent);
  }
}

/**
 * 手动渲染文本层（简化版）
 */
function renderTextLayerManual(container, viewport, textContent) {
  container.innerHTML = '';
  
  // 计算字体缩放因子（item.height 是 PDF 单位，需乘以 viewport scale）
  const fontSizeScale = pdfViewerState.scale || 1.0;
  
  textContent.items.forEach((item, idx) => {
    const span = document.createElement('span');
    span.textContent = item.str;
    span.style.position = 'absolute';
    span.style.whiteSpace = 'pre';
    span.style.color = 'transparent';
    // 关键修复：item.height 是 PDF 用户空间单位，必须乘以 scale 才能得到正确的 viewport 像素值
    span.style.fontSize = Math.max(1, item.height * fontSizeScale) + 'px';
    // 使用 viewport 的转换方法将 PDF 坐标转换为 viewport 坐标
    const [vx, vy] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
    // 考虑字体基线偏移：PDF 的 y 坐标是字符基线，DOM 的 top 是边界框顶部
    // 向上偏移字体高度的大约 80%（ascender 部分）
    span.style.left = vx + 'px';
    span.style.top = (vy - item.height * fontSizeScale * 0.9) + 'px';
    container.appendChild(span);
  });
  
}

/**
 * 计算适应宽度缩放比例
 */
async function calculateFitWidthScale(containerWidth) {
  if (!pdfViewerState.doc) return 1.0;
  
  const page = await pdfViewerState.doc.getPage(1);
  const viewport = page.getViewport({ scale: 1.0 });
  
  // 留出边距
  const padding = 40;
  return (containerWidth - padding) / viewport.width;
}

// ============================================================
// PDF 阅读器 UI 渲染
// ============================================================

/**
 * 渲染 PDF 阅读器区域
 */
async function renderPdfViewerArea(litId) {
  const area = document.getElementById('pdfViewerArea');
  if (!area) return;
  
  // 清理旧的 Blob URL
  cleanupPdfBlobUrl();
  
  // 获取 PDF 数据
  let pdfData = null;
  try {
    pdfData = await getPdfData(litId);
  } catch (e) {
    console.error('[PDF] 读取数据失败:', e);
  }
  
  // 没有 PDF 数据时显示上传占位符
  if (!pdfData) {
    renderPdfPlaceholder(area);
    return;
  }
  
  // 创建 Blob URL
  const blob = new Blob([pdfData], { type: 'application/pdf' });
  pdfViewerState.blobUrl = URL.createObjectURL(blob);
  pdfViewerState.litId = litId;
  
  // 获取文件名
  const lit = appData.literature.find(l => l.id === litId);
  const fileName = (lit && lit.pdfFileName) ? lit.pdfFileName : 'PDF';
  
  // 渲染阅读器 UI
  area.innerHTML = `
    <div class="pdf-viewer-container" id="pdfViewerContainer">
      <!-- 工具栏 -->
      <div class="pdf-toolbar">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" stroke-width="2">
          <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
        </svg>
        <span class="pdf-filename" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</span>
        
        <div class="separator"></div>
        
        <!-- 页码控制 -->
        <div class="pdf-page-control">
          <button class="btn-icon" id="pdfPrevPage" title="${t('pdfPrevPage')}">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <input type="number" id="pdfPageInput" class="input" style="width:50px;text-align:center;padding:2px 4px;font-size:12px;" value="1" min="1">
          <span style="font-size:12px;color:var(--text-muted);">/ <span id="pdfTotalPages">0</span></span>
          <button class="btn-icon" id="pdfNextPage" title="${t('pdfNextPage')}">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
        
        <div class="separator"></div>
        
        <!-- 缩放控制 -->
        <div class="pdf-zoom-control">
          <button class="btn-icon" id="pdfZoomOut" title="${t('pdfZoomOut')}">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/>
            </svg>
          </button>
          <span id="pdfScaleLabel" style="font-size:12px;min-width:45px;text-align:center;">100%</span>
          <button class="btn-icon" id="pdfZoomIn" title="${t('pdfZoomIn')}">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6m-3-3h6"/>
            </svg>
          </button>
          <button class="btn-icon" id="pdfFitWidth" title="${t('pdfFitWidth')}">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M4 8V4h4m12 0h-4v0M4 16v4h4m8 0h4v-4"/>
            </svg>
          </button>
        </div>
        
        <div class="separator"></div>
        
        <!-- 视图模式 -->
        <div class="pdf-view-mode">
          <button class="btn-icon ${pdfViewerState.viewMode === 'single' ? 'active' : ''}" id="pdfSinglePage" title="${t('pdfSinglePage')}">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <rect x="5" y="3" width="14" height="18" rx="2"/>
            </svg>
          </button>
          <button class="btn-icon ${pdfViewerState.viewMode === 'double' ? 'active' : ''}" id="pdfDoublePage" title="${t('pdfDoublePage')}">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="8" height="18" rx="1"/><rect x="14" y="3" width="8" height="18" rx="1"/>
            </svg>
          </button>
          <div class="separator"></div>
          <button class="btn-icon ${pdfViewerState.scrollMode === 'page' ? 'active' : ''}" id="pdfPageModeBtn" title="${t('pdfPageMode')}">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-1zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/>
            </svg>
          </button>
        </div>
        
        <div class="separator"></div>
        
        <!-- 搜索 -->
        <div class="pdf-search">
          <button class="btn-icon" id="pdfSearchBtn" title="${t('pdfSearch')}">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </button>
        </div>
        
        <!-- 目录 -->
        <button class="btn-icon" id="pdfOutlineBtn" title="${t('pdfOutline')}">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M4 6h16M4 12h16M4 18h10"/>
          </svg>
        </button>
        
        <!-- 夜间模式 -->
        <button class="btn-icon" id="pdfNightMode" title="${t('pdfNightMode')}">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
          </svg>
        </button>
        
        <div style="flex:1;"></div>
        
        <div class="separator"></div>
        
        <!-- 全屏 -->
        <button class="btn-icon" id="pdfFullscreenBtn" title="${t('pdfFullscreen')}">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M4 8V4h4m12 0h-4v0M4 16v4h4m8 0h4v-4"/>
          </svg>
        </button>

        <!-- Module 3: Export text dropdown -->
        <div class="pdf-export-dropdown">
          <button class="btn btn-secondary btn-sm" id="pdfExportBtn" style="font-size:11px;">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            ${t('pdfExportText')}
          </button>
          <div class="pdf-export-menu" id="pdfExportMenu">
            <button onclick="exportPdfText('current')">${t('pdfExportCurrentPage')}</button>
            <button onclick="exportPdfText('all')">${t('pdfExportAll')}</button>
            <hr class="pdf-context-menu-separator" style="border:none;border-top:1px solid var(--border-light);margin:4px 0;">
            <button onclick="copyCurrentPageAsImage()">${t('pdfCopyPageAsImage')}</button>
          </div>
        </div>
        
        <!-- 更多操作 -->
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('pdfReplaceInput').click()" style="font-size:11px;">
          ${t('pdfReplace')}
        </button>
        <input type="file" id="pdfReplaceInput" accept=".pdf" style="display:none;" onchange="handlePdfUpload(event)">
        
        <button class="btn btn-secondary btn-sm" onclick="handlePdfRemove()" style="font-size:11px;color:#d4354f;">
          ${t('pdfRemove')}
        </button>
      </div>
      
      <!-- 主内容区 -->
      <div class="pdf-main-area">
        <!-- 侧边栏（目录/搜索结果） -->
        <div class="pdf-sidebar" id="pdfSidebar" style="display:none;">
          <div class="pdf-sidebar-header">
            <span id="pdfSidebarTitle">${t('pdfOutline')}</span>
            <button class="btn-icon" onclick="closePdfSidebar()" style="border:none;width:24px;height:24px;">×</button>
          </div>
          <div class="pdf-sidebar-content" id="pdfSidebarContent"></div>
        </div>
        
        <!-- PDF 内容区 -->
        <div class="pdf-content" id="pdfContent">
          <!-- 加载指示器 -->
          <div class="pdf-loading" id="pdfLoading">
            <div class="pdf-spinner"></div>
            <span>${t('pdfLoading')}</span>
          </div>

          <!-- 页面容器 -->
          <div class="pdf-pages-container" id="pdfPagesContainer"></div>

          <!-- Module 2: Page mode navigation arrows -->
          <button class="pdf-page-nav-arrow prev" id="pdfPageNavPrev" title="${t('pdfPrevPageNav')}">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button class="pdf-page-nav-arrow next" id="pdfPageNavNext" title="${t('pdfNextPageNav')}">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
          </button>

          <!-- Module 2: Page indicator dots -->
          <div class="pdf-page-indicator" id="pdfPageIndicator" style="display:none;"></div>

          <!-- Module 3: Context menu -->
          <div class="pdf-context-menu" id="pdfContextMenu" style="display:none;"></div>
        </div>
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
  
  // 初始化 PDF.js 并加载文档
  await initPdfJs();
  const loaded = await loadPdfDocument(pdfData, litId);
  
  if (loaded) {
    // 设置总页数
    document.getElementById('pdfTotalPages').textContent = pdfViewerState.totalPages;
    
    // 计算适应宽度缩放
    const contentEl = document.getElementById('pdfContent');
    if (contentEl) {
      pdfViewerState.fitWidthScale = await calculateFitWidthScale(contentEl.clientWidth);
      if (!pdfViewerState.lastPosition) {
        pdfViewerState.scale = pdfViewerState.fitWidthScale;
      }
    }
    
    // 渲染页面
    await renderAllPages();
    
    // 绑定事件
    bindPdfViewerEvents();
    
    // 恢复阅读位置
    if (pdfViewerState.lastPosition && pdfViewerState.lastPosition.scrollTop) {
      setTimeout(() => {
        const container = document.getElementById('pdfContent');
        if (container) {
          container.scrollTop = pdfViewerState.lastPosition.scrollTop;
        }
      }, 100);
    }
  }
}

/**
 * 渲染 PDF 上传占位符
 */
function renderPdfPlaceholder(area) {
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
}

/**
 * 渲染所有页面
 */
async function renderAllPages() {
  const container = document.getElementById('pdfPagesContainer');
  if (!container || !pdfViewerState.doc) return;
  
  // 隐藏加载指示器
  const loading = document.getElementById('pdfLoading');
  if (loading) loading.style.display = 'none';
  
  // 清空容器
  container.innerHTML = '';
  pdfViewerState.canvasList = [];
  pdfViewerState.textLayers = [];
  
  // 根据视图模式渲染
  if (pdfViewerState.viewMode === 'double') {
    await renderDoublePages(container);
  } else {
    await renderSinglePages(container);
  }
  
  // 更新缩放显示
  updateScaleLabel();
}

/**
 * 渲染单页模式
 */
async function renderSinglePages(container) {
  for (let i = 1; i <= pdfViewerState.totalPages; i++) {
    const pageWrapper = createPageWrapper(i);
    container.appendChild(pageWrapper);
    pdfViewerState.canvasList.push(pageWrapper.querySelector('canvas'));
    pdfViewerState.textLayers.push(pageWrapper.querySelector('.pdf-text-layer'));
  }
  
  // 渲染可见页面
  await renderVisiblePages();
}

/**
 * 渲染双页模式
 */
async function renderDoublePages(container) {
  for (let i = 1; i <= pdfViewerState.totalPages; i += 2) {
    const spreadDiv = document.createElement('div');
    spreadDiv.className = 'pdf-spread';
    spreadDiv.dataset.leftPage = i;
    spreadDiv.dataset.rightPage = i + 1 <= pdfViewerState.totalPages ? i + 1 : '';
    
    // 左页
    const leftWrapper = createPageWrapper(i);
    spreadDiv.appendChild(leftWrapper);
    pdfViewerState.canvasList.push(leftWrapper.querySelector('canvas'));
    pdfViewerState.textLayers.push(leftWrapper.querySelector('.pdf-text-layer'));
    
    // 右页
    if (i + 1 <= pdfViewerState.totalPages) {
      const rightWrapper = createPageWrapper(i + 1);
      spreadDiv.appendChild(rightWrapper);
      pdfViewerState.canvasList.push(rightWrapper.querySelector('canvas'));
      pdfViewerState.textLayers.push(rightWrapper.querySelector('.pdf-text-layer'));
    }
    
    container.appendChild(spreadDiv);
  }
  
  await renderVisiblePages();
}

/**
 * 创建页面包装器
 */
function createPageWrapper(pageNum) {
  const wrapper = document.createElement('div');
  wrapper.className = 'pdf-page-wrapper';
  wrapper.dataset.page = pageNum;
  
  wrapper.innerHTML = `
    <div class="pdf-page-container">
      <canvas class="pdf-canvas"></canvas>
      <div class="pdf-annotation-layer" data-page="${pageNum}"></div>
      <div class="pdf-ink-layer" data-page="${pageNum}"></div>
      <div class="pdf-text-layer"></div>
    </div>
    <div class="pdf-page-label">${t('pdfPage')} ${pageNum}</div>
  `;
  
  return wrapper;
}

/**
 * 渲染可见页面（懒加载）
 */
async function renderVisiblePages() {
  const container = document.getElementById('pdfContent');
  if (!container) return;
  
  const scrollTop = container.scrollTop;
  const clientHeight = container.clientHeight;
  
  const wrappers = container.querySelectorAll('.pdf-page-wrapper');
  
  for (const wrapper of wrappers) {
    const rect = wrapper.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // 判断是否在视口内
    const isVisible = rect.bottom > containerRect.top - 500 && rect.top < containerRect.bottom + 500;
    
    if (isVisible) {
      const pageNum = parseInt(wrapper.dataset.page);
      const canvas = wrapper.querySelector('canvas');
      const textLayer = wrapper.querySelector('.pdf-text-layer');
      
      if (canvas && !canvas.dataset.rendered) {
        await renderPage(pageNum, canvas, textLayer);
        canvas.dataset.rendered = 'true';
      }
    }
  }
}

// ============================================================
// 事件绑定
// ============================================================

/**
 * 绑定 PDF 阅读器事件
 */
function bindPdfViewerEvents() {
  
  // 翻页按钮
  document.getElementById('pdfPrevPage')?.addEventListener('click', () => {
    if (pdfViewerState.scrollMode === 'page') {
      const step = pdfViewerState.viewMode === 'double' ? 2 : 1;
      pageModeGoToPage(pdfViewerState.currentPage - step);
    } else {
      goToPrevPage();
    }
  });
  document.getElementById('pdfNextPage')?.addEventListener('click', () => {
    if (pdfViewerState.scrollMode === 'page') {
      const step = pdfViewerState.viewMode === 'double' ? 2 : 1;
      pageModeGoToPage(pdfViewerState.currentPage + step);
    } else {
      goToNextPage();
    }
  });
  
  // 页码输入
  document.getElementById('pdfPageInput')?.addEventListener('change', (e) => {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= pdfViewerState.totalPages) {
      goToPage(page);
    }
  });
  
  // 缩放按钮
  document.getElementById('pdfZoomIn')?.addEventListener('click', () => zoomIn());
  document.getElementById('pdfZoomOut')?.addEventListener('click', () => zoomOut());
  document.getElementById('pdfFitWidth')?.addEventListener('click', () => fitToWidth());
  
  // 视图模式
  document.getElementById('pdfSinglePage')?.addEventListener('click', () => setViewMode('single'));
  document.getElementById('pdfDoublePage')?.addEventListener('click', () => setViewMode('double'));

  // Module 2: Page mode toggle
  document.getElementById('pdfPageModeBtn')?.addEventListener('click', () => {
    const newMode = pdfViewerState.scrollMode === 'vertical' ? 'page' : 'vertical';
    setScrollMode(newMode);
  });

  // Module 2: Page mode navigation arrows
  document.getElementById('pdfPageNavPrev')?.addEventListener('click', () => {
    const step = pdfViewerState.viewMode === 'double' ? 2 : 1;
    pageModeGoToPage(pdfViewerState.currentPage - step);
  });
  document.getElementById('pdfPageNavNext')?.addEventListener('click', () => {
    const step = pdfViewerState.viewMode === 'double' ? 2 : 1;
    pageModeGoToPage(pdfViewerState.currentPage + step);
  });
  
  // 搜索
  document.getElementById('pdfSearchBtn')?.addEventListener('click', () => toggleSearchPanel());
  
  // 目录
  document.getElementById('pdfOutlineBtn')?.addEventListener('click', () => toggleOutlinePanel());
  
  // 夜间模式
  document.getElementById('pdfNightMode')?.addEventListener('click', () => toggleNightMode());
  
  // 全屏
  document.getElementById('pdfFullscreenBtn')?.addEventListener('click', () => pdfToggleFullscreen());
  
  // 标注功能已禁用
  
  // 初始化标注文本选择事件（已禁用）
  /*
  if (typeof initTextSelectionListener === 'function') {
    initTextSelectionListener();
  }
  */
  
  // 滚动事件（懒加载 + 页码更新）
  const contentEl = document.getElementById('pdfContent');
  if (contentEl) {
    contentEl.addEventListener('scroll', debounce(() => {
      renderVisiblePages();
      updateCurrentPageFromScroll();
      saveCurrentPosition();
    }, 100));

    // Module 3: Context menu on PDF area
    contentEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showPdfContextMenu(e.clientX, e.clientY);
    });

    // Click outside to hide context menu
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.pdf-context-menu')) {
        hidePdfContextMenu();
      }
    });
  }

  // Module 3: Export dropdown toggle
  const exportBtn = document.getElementById('pdfExportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = document.getElementById('pdfExportMenu');
      if (menu) menu.classList.toggle('show');
    });
  }
  // Close export menu on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.pdf-export-dropdown')) {
      const menu = document.getElementById('pdfExportMenu');
      if (menu) menu.classList.remove('show');
    }
  });
  
  // 键盘快捷键
  document.addEventListener('keydown', handlePdfKeyboard);
}

/**
 * 处理键盘快捷键
 */
function handlePdfKeyboard(e) {
  if (currentPage !== 'detail') return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  switch (e.key) {
    case 'ArrowLeft':
    case 'PageUp':
      e.preventDefault();
      if (pdfViewerState.scrollMode === 'page') {
        const step = pdfViewerState.viewMode === 'double' ? 2 : 1;
        pageModeGoToPage(pdfViewerState.currentPage - step);
      } else {
        goToPrevPage();
      }
      break;
    case 'ArrowRight':
    case 'PageDown':
    case ' ':
      e.preventDefault();
      if (pdfViewerState.scrollMode === 'page') {
        const step = pdfViewerState.viewMode === 'double' ? 2 : 1;
        pageModeGoToPage(pdfViewerState.currentPage + step);
      } else {
        goToNextPage();
      }
      break;
    case 'Home':
      e.preventDefault();
      if (pdfViewerState.scrollMode === 'page') {
        pageModeGoToPage(1);
      } else {
        goToPage(1);
      }
      break;
    case 'End':
      e.preventDefault();
      if (pdfViewerState.scrollMode === 'page') {
        pageModeGoToPage(pdfViewerState.totalPages);
      } else {
        goToPage(pdfViewerState.totalPages);
      }
      break;
    case '+':
    case '=':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomIn();
      }
      break;
    case '-':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomOut();
      }
      break;
    case 'f':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        toggleSearchPanel();
      }
      break;
    case 'c':
      // Module 3: Ctrl+Shift+C 复制选中文本
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        copySelectedText();
      }
      break;
    case 'Escape':
      if (pdfViewerState.isFullscreen) {
        pdfToggleFullscreen();
      }
      // Close context menu
      hidePdfContextMenu();
      // Close export menu
      const menu = document.getElementById('pdfExportMenu');
      if (menu) menu.classList.remove('show');
      // Exit page mode
      if (pdfViewerState.scrollMode === 'page' && !e.target.closest('.pdf-note-link-dialog-overlay')) {
        setScrollMode('vertical');
      }
      break;
  }
}

// ============================================================
// 页面导航
// ============================================================

/**
 * 跳转到指定页
 */
function goToPage(pageNum) {
  if (pageNum < 1 || pageNum > pdfViewerState.totalPages) return;
  
  pdfViewerState.currentPage = pageNum;
  
  // 更新输入框
  const input = document.getElementById('pdfPageInput');
  if (input) input.value = pageNum;
  
  // 滚动到页面
  const wrapper = document.querySelector(`.pdf-page-wrapper[data-page="${pageNum}"]`);
  if (wrapper) {
    const container = document.getElementById('pdfContent');
    if (container) {
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

/**
 * 上一页
 */
function goToPrevPage() {
  if (pdfViewerState.currentPage > 1) {
    goToPage(pdfViewerState.currentPage - 1);
  }
}

/**
 * 下一页
 */
function goToNextPage() {
  if (pdfViewerState.currentPage < pdfViewerState.totalPages) {
    goToPage(pdfViewerState.currentPage + 1);
  }
}

/**
 * 从滚动位置更新当前页码
 */
function updateCurrentPageFromScroll() {
  const container = document.getElementById('pdfContent');
  if (!container) return;
  
  const scrollTop = container.scrollTop;
  const wrappers = container.querySelectorAll('.pdf-page-wrapper');
  
  for (const wrapper of wrappers) {
    const rect = wrapper.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    if (rect.top <= containerRect.top + 100 && rect.bottom > containerRect.top) {
      const pageNum = parseInt(wrapper.dataset.page);
      if (pageNum !== pdfViewerState.currentPage) {
        pdfViewerState.currentPage = pageNum;
        const input = document.getElementById('pdfPageInput');
        if (input) input.value = pageNum;
      }
      break;
    }
  }
}

// ============================================================
// 缩放控制
// ============================================================

/**
 * 放大
 */
function zoomIn() {
  const newScale = Math.min(pdfViewerState.scale * 1.25, pdfViewerState.maxScale);
  setScale(newScale);
}

/**
 * 缩小
 */
function zoomOut() {
  const newScale = Math.max(pdfViewerState.scale / 1.25, pdfViewerState.minScale);
  setScale(newScale);
}

/**
 * 适应宽度
 */
function fitToWidth() {
  setScale(pdfViewerState.fitWidthScale);
}

/**
 * 设置缩放比例
 */
async function setScale(scale) {
  pdfViewerState.scale = scale;
  updateScaleLabel();
  
  // 重新渲染所有页面
  const canvases = document.querySelectorAll('.pdf-canvas');
  canvases.forEach(c => c.dataset.rendered = '');
  
  await renderVisiblePages();
  
  // 触发缩放事件，通知标注模块重新渲染
  window.dispatchEvent(new CustomEvent('pdfScaleChanged', { detail: { scale } }));
  
  saveCurrentPosition();
}

/**
 * 更新缩放标签
 */
function updateScaleLabel() {
  const label = document.getElementById('pdfScaleLabel');
  if (label) {
    label.textContent = Math.round(pdfViewerState.scale * 100) + '%';
  }
}

// ============================================================
// 视图模式
// ============================================================

/**
 * 设置视图模式
 */
async function setViewMode(mode) {
  pdfViewerState.viewMode = mode;
  
  // 更新按钮状态
  document.getElementById('pdfSinglePage')?.classList.toggle('active', mode === 'single');
  document.getElementById('pdfDoublePage')?.classList.toggle('active', mode === 'double');
  
  // 重新渲染
  await renderAllPages();
  saveCurrentPosition();
}

// ============================================================
// 全屏模式
// ============================================================

/**
 * 切换全屏模式
 */
function pdfToggleFullscreen() {
  const container = document.getElementById('pdfViewerContainer');
  if (!container) return;
  
  pdfViewerState.isFullscreen = !pdfViewerState.isFullscreen;
  container.classList.toggle('fullscreen', pdfViewerState.isFullscreen);
  
  // 更新按钮标题
  const btn = document.getElementById('pdfFullscreenBtn');
  if (btn) {
    btn.title = pdfViewerState.isFullscreen ? t('pdfExitFullscreen') : t('pdfFullscreen');
  }
  
  // 显示/隐藏退出按钮
  const exitBtn = document.getElementById('pdfExitFullscreenBtn');
  if (exitBtn) {
    exitBtn.style.display = pdfViewerState.isFullscreen ? 'flex' : 'none';
  }
}

// ============================================================
// 搜索功能
// ============================================================

/**
 * 切换搜索面板
 */
function toggleSearchPanel() {
  const sidebar = document.getElementById('pdfSidebar');
  const title = document.getElementById('pdfSidebarTitle');
  const content = document.getElementById('pdfSidebarContent');
  
  if (!sidebar || !content) return;
  
  if (sidebar.style.display === 'none' || !sidebar.dataset.mode || sidebar.dataset.mode !== 'search') {
    sidebar.style.display = 'block';
    sidebar.dataset.mode = 'search';
    if (title) title.textContent = t('pdfSearch');
    
    content.innerHTML = `
      <div style="padding:12px;">
        <div style="display:flex;gap:6px;margin-bottom:12px;">
          <input type="text" id="pdfSearchInput" class="input" placeholder="${t('pdfSearchPlaceholder')}" style="flex:1;padding:6px 10px;font-size:13px;">
          <button class="btn btn-primary btn-sm" onclick="searchPdfText()">${t('pdfSearch')}</button>
        </div>
        <div id="pdfSearchResults" style="max-height:calc(100vh - 200px);overflow-y:auto;"></div>
      </div>
    `;
    
    // 绑定回车搜索
    document.getElementById('pdfSearchInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') searchPdfText();
    });
  } else {
    closePdfSidebar();
  }
}

/**
 * 搜索 PDF 文本
 */
async function searchPdfText() {
  const input = document.getElementById('pdfSearchInput');
  if (!input || !pdfViewerState.doc) return;
  
  const query = input.value.trim();
  if (!query) return;
  
  pdfViewerState.searchText = query;
  pdfViewerState.searchResults = [];
  
  const resultsContainer = document.getElementById('pdfSearchResults');
  if (resultsContainer) {
    resultsContainer.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);">${t('pdfSearching')}</div>`;
  }
  
  // 在所有页面中搜索
  for (let i = 1; i <= pdfViewerState.totalPages; i++) {
    try {
      const page = await pdfViewerState.doc.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map(item => item.str).join(' ');
      
      // 查找匹配项
      const regex = new RegExp(query, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        pdfViewerState.searchResults.push({
          pageNum: i,
          text: match[0],
          context: text.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30)
        });
      }
    } catch (e) {
      console.warn(`[PDF] 搜索第 ${i} 页失败:`, e);
    }
  }
  
  // 显示结果
  if (resultsContainer) {
    if (pdfViewerState.searchResults.length === 0) {
      resultsContainer.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);">${t('pdfNoResults')}</div>`;
    } else {
      resultsContainer.innerHTML = `
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">
          ${t('pdfSearchResultsCount').replace('{count}', pdfViewerState.searchResults.length)}
        </div>
        ${pdfViewerState.searchResults.map((r, i) => `
          <div class="pdf-search-result" data-index="${i}" style="padding:8px;border-radius:6px;cursor:pointer;margin-bottom:4px;background:var(--bg-secondary);" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='var(--bg-secondary)'">
            <div style="font-size:12px;font-weight:600;color:var(--accent);">${t('pdfPage')} ${r.pageNum}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">...${escapeHtml(r.context)}...</div>
          </div>
        `).join('')}
      `;
      
      // 绑定点击事件
      resultsContainer.querySelectorAll('.pdf-search-result').forEach(el => {
        el.addEventListener('click', () => {
          const index = parseInt(el.dataset.index);
          const result = pdfViewerState.searchResults[index];
          if (result) {
            goToPage(result.pageNum);
          }
        });
      });
    }
  }
}

// ============================================================
// 目录功能
// ============================================================

/**
 * 切换目录面板
 */
function toggleOutlinePanel() {
  const sidebar = document.getElementById('pdfSidebar');
  const title = document.getElementById('pdfSidebarTitle');
  const content = document.getElementById('pdfSidebarContent');
  
  if (!sidebar || !content) return;
  
  if (sidebar.style.display === 'none' || !sidebar.dataset.mode || sidebar.dataset.mode !== 'outline') {
    sidebar.style.display = 'block';
    sidebar.dataset.mode = 'outline';
    if (title) title.textContent = t('pdfOutline');
    
    renderOutline(content);
  } else {
    closePdfSidebar();
  }
}

/**
 * 渲染目录
 */
function renderOutline(container) {
  if (pdfViewerState.outline.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);">${t('pdfNoOutline')}</div>`;
    return;
  }
  
  container.innerHTML = renderOutlineItems(pdfViewerState.outline, 0);
  
  // 绑定点击事件
  container.querySelectorAll('.pdf-outline-item').forEach(el => {
    el.addEventListener('click', async () => {
      const dest = el.dataset.dest;
      if (dest) {
        try {
          const ref = JSON.parse(dest);
          const pageIndex = await pdfViewerState.doc.getPageIndex(ref);
          goToPage(pageIndex + 1);
        } catch (e) {
          console.warn('[PDF] 跳转目录失败:', e);
        }
      }
    });
  });
}

/**
 * 渲染目录项
 */
function renderOutlineItems(items, level) {
  return items.map(item => {
    const dest = item.dest ? JSON.stringify(item.dest) : '';
    const hasChildren = item.items && item.items.length > 0;
    
    return `
      <div class="pdf-outline-item" data-dest="${escapeAttr(dest)}" style="padding:6px 12px;padding-left:${12 + level * 16}px;cursor:pointer;border-radius:4px;font-size:13px;transition:background 0.15s;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
        ${escapeHtml(item.title)}
      </div>
      ${hasChildren ? renderOutlineItems(item.items, level + 1) : ''}
    `;
  }).join('');
}

/**
 * 关闭侧边栏
 */
function closePdfSidebar() {
  const sidebar = document.getElementById('pdfSidebar');
  if (sidebar) {
    sidebar.style.display = 'none';
  }
}

// ============================================================
// 夜间模式
// ============================================================

/**
 * 切换夜间模式
 */
function toggleNightMode() {
  pdfViewerState.nightMode = !pdfViewerState.nightMode;
  
  const container = document.getElementById('pdfViewerContainer');
  if (container) {
    container.classList.toggle('pdf-night-mode', pdfViewerState.nightMode);
  }
  
  // 更新按钮状态
  const btn = document.getElementById('pdfNightMode');
  if (btn) {
    btn.classList.toggle('active', pdfViewerState.nightMode);
  }
  
  // 重新渲染页面
  document.querySelectorAll('.pdf-canvas').forEach(c => c.dataset.rendered = '');
  renderVisiblePages();
}

// ============================================================
// 阅读位置保存
// ============================================================

/**
 * 保存当前位置
 */
function saveCurrentPosition() {
  if (!pdfViewerState.litId) return;
  
  const container = document.getElementById('pdfContent');
  const scrollTop = container ? container.scrollTop : 0;
  
  saveReadingPosition(pdfViewerState.litId, {
    page: pdfViewerState.currentPage,
    scale: pdfViewerState.scale,
    viewMode: pdfViewerState.viewMode,
    scrollMode: pdfViewerState.scrollMode,
    scrollTop: scrollTop
  });
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 防抖函数
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * 清理 Blob URL
 */
function cleanupPdfBlobUrl() {
  if (pdfViewerState.blobUrl) {
    URL.revokeObjectURL(pdfViewerState.blobUrl);
    pdfViewerState.blobUrl = null;
  }
}

// ============================================================
// PDF 上传处理
// ============================================================

function _processPdfFile(file) {
  if (!file) return;
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    alert('请选择 PDF 文件');
    return;
  }
  if (file.size > 100 * 1024 * 1024) {
    alert('文件过大（超过 100MB），请选择较小的 PDF 文件');
    return;
  }
  if (!window.DOIClient) var _dummy = null; // 静默使用全局上下文
  if (typeof currentDetailId === 'undefined' || !currentDetailId) {
    console.warn('[PDF] 当前未打开文献详情页');
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    storePdfData(currentDetailId, e.target.result).then(function() {
      var lit = appData.literature.find(function(l) { return l.id === currentDetailId; });
      if (lit) {
        lit.pdfFileName = file.name;
        saveData();
      }
      renderPdfViewerArea(currentDetailId);
    }).catch(function(err) {
      console.error('[PDF] 存储失败:', err);
      alert('PDF 存储失败: ' + (err.message || err));
    });
  };
  reader.onerror = function() { console.error('[PDF] 文件读取失败'); alert('PDF 读取失败'); };
  reader.readAsArrayBuffer(file);
}

/**
 * 处理 PDF 文件上传
 */
function handlePdfUpload(event) {
  var file = event.target.files && event.target.files[0];
  if (file) _processPdfFile(file);
  // 重置 input，允许重新上传同一文件
  event.target.value = '';
}

/**
 * 处理 PDF 文件拖放上传
 */
function handlePdfDrop(event) {
  var files = event.dataTransfer && event.dataTransfer.files;
  if (!files || !files.length) return;
  var file = files[0];
  if (file) _processPdfFile(file);
}

/**
 * 移除 PDF 文件
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
  
  pdfViewerState.litId = null;
  pdfViewerState.isFullscreen = false;
  
  renderPdfViewerArea(currentDetailId);
}

/**
 * 在新标签页打开 PDF
 */
function pdfOpenNewTab() {
  if (pdfViewerState.blobUrl) {
    window.open(pdfViewerState.blobUrl, '_blank');
  }
}

// ============================================================
// 键盘快捷键监听
// ============================================================

document.addEventListener('keydown', e => {
  if (currentPage !== 'detail') return;
  
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  
  if (e.key === 'Escape' && pdfViewerState.isFullscreen) {
    pdfToggleFullscreen();
  } else if (e.key === 'f' || e.key === 'F') {
    if (!e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      pdfToggleFullscreen();
    }
  }
});

// ============================================================
// Module 2: Scroll/Page Mode - 滚动/翻页模式
// ============================================================

/**
 * 切换滚动模式 / 翻页模式
 */
function toggleScrollMode() {
  const newMode = pdfViewerState.scrollMode === 'vertical' ? 'page' : 'vertical';
  setScrollMode(newMode);
}

/**
 * 设置滚动模式
 */
function setScrollMode(mode) {
  pdfViewerState.scrollMode = mode;
  const contentEl = document.getElementById('pdfContent');
  const container = document.getElementById('pdfViewerContainer');
  const pageModeBtn = document.getElementById('pdfPageModeBtn');
  const navPrev = document.getElementById('pdfPageNavPrev');
  const navNext = document.getElementById('pdfPageNavNext');
  const indicator = document.getElementById('pdfPageIndicator');

  if (mode === 'page') {
    // 翻页模式
    contentEl?.classList.add('page-mode');
    container?.classList.add('page-mode-active');
    if (pageModeBtn) pageModeBtn.classList.add('active');
    // 显示导航箭头
    if (navPrev) navPrev.style.display = 'flex';
    if (navNext) navNext.style.display = 'flex';
    if (indicator) indicator.style.display = 'flex';
    // 渲染当前页
    showCurrentPageInPageMode();
    updatePageIndicator();
  } else {
    // 滚动模式（默认）
    contentEl?.classList.remove('page-mode');
    container?.classList.remove('page-mode-active');
    if (pageModeBtn) pageModeBtn.classList.remove('active');
    if (navPrev) navPrev.style.display = '';
    if (navNext) navNext.style.display = '';
    if (indicator) indicator.style.display = 'none';
    // 显示所有页面
    showAllPagesInScrollMode();
  }

  saveCurrentPosition();
}

/**
 * 翻页模式下显示当前页
 */
function showCurrentPageInPageMode() {
  const wrappers = document.querySelectorAll('.pdf-page-wrapper');
  wrappers.forEach(w => w.classList.add('hidden-page'));

  if (pdfViewerState.viewMode === 'double') {
    // 双页模式：当前页和下一页
    const currentWrapper = document.querySelector(`.pdf-page-wrapper[data-page="${pdfViewerState.currentPage}"]`);
    if (currentWrapper) currentWrapper.classList.remove('hidden-page');

    // 找到同一 spread 的另一页
    const spread = currentWrapper?.closest('.pdf-spread');
    if (spread) {
      spread.querySelectorAll('.pdf-page-wrapper').forEach(w => w.classList.remove('hidden-page'));
    }
  } else {
    const currentWrapper = document.querySelector(`.pdf-page-wrapper[data-page="${pdfViewerState.currentPage}"]`);
    if (currentWrapper) currentWrapper.classList.remove('hidden-page');
  }
}

/**
 * 滚动模式下显示所有页面
 */
function showAllPagesInScrollMode() {
  document.querySelectorAll('.pdf-page-wrapper').forEach(w => w.classList.remove('hidden-page'));
}

/**
 * 翻页模式下的翻页导航
 */
function pageModeGoToPage(pageNum) {
  if (pageNum < 1 || pageNum > pdfViewerState.totalPages) return;

  // 双页模式下调整到奇数起始页
  let targetPage = pageNum;
  if (pdfViewerState.viewMode === 'double' && targetPage % 2 === 0) {
    targetPage = Math.max(1, targetPage - 1);
  }

  pdfViewerState.currentPage = targetPage;
  const input = document.getElementById('pdfPageInput');
  if (input) input.value = targetPage;

  showCurrentPageInPageMode();
  updatePageIndicator();

  // 确保当前可见页面已渲染
  const wrapper = document.querySelector(`.pdf-page-wrapper[data-page="${targetPage}"]`);
  if (wrapper) {
    const canvas = wrapper.querySelector('canvas');
    const textLayer = wrapper.querySelector('.pdf-text-layer');
    if (canvas && !canvas.dataset.rendered) {
      renderPage(targetPage, canvas, textLayer).then(() => {
        canvas.dataset.rendered = 'true';
      });
    }
  }

  saveCurrentPosition();
}

/**
 * 更新页码指示器点
 */
function updatePageIndicator() {
  const indicator = document.getElementById('pdfPageIndicator');
  if (!indicator || pdfViewerState.scrollMode !== 'page') return;

  const totalDots = pdfViewerState.viewMode === 'double'
    ? Math.ceil(pdfViewerState.totalPages / 2)
    : pdfViewerState.totalPages;

  let dotsHtml = '';
  for (let i = 0; i < totalDots; i++) {
    const isActive = pdfViewerState.viewMode === 'double'
      ? (Math.ceil(pdfViewerState.currentPage / 2) === i + 1)
      : (pdfViewerState.currentPage === i + 1);
    dotsHtml += `<div class="pdf-page-dot ${isActive ? 'active' : ''}" data-dot-index="${i + 1}"></div>`;
  }

  indicator.innerHTML = dotsHtml;

  indicator.querySelectorAll('.pdf-page-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.dotIndex);
      const targetPage = pdfViewerState.viewMode === 'double' ? (idx - 1) * 2 + 1 : idx;
      pageModeGoToPage(targetPage);
    });
  });
}

// ============================================================
// Module 3: Context Menu & Export - 右键菜单与导出
// ============================================================

/**
 * 显示右键上下文菜单
 */
function showPdfContextMenu(x, y) {
  const menu = document.getElementById('pdfContextMenu');
  if (!menu) return;

  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();

  menu.innerHTML = `
    ${selectedText ? `
      <button class="pdf-context-menu-item" onclick="copySelectedText()">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        ${t('pdfCopyText')}
      </button>
      <button class="pdf-context-menu-item" onclick="copyAsQuote()">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M7 8h10M7 12h4m1 8l-4-4 4-4m6 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h8"/></svg>
        ${t('pdfCopyAsQuote')}
      </button>
      <button class="pdf-context-menu-item" onclick="quickHighlightSelection()">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        ${t('pdfAnnotateSelection')}
      </button>
      <div class="pdf-context-menu-separator"></div>
    ` : ''}
    <button class="pdf-context-menu-item" onclick="copyCurrentPageAsImage()">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
      ${t('pdfCopyPageAsImage')}
    </button>
  `;

  // Position the menu
  menu.style.display = 'block';

  const menuRect = menu.getBoundingClientRect();
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  menu.style.left = (x + menuRect.width > viewportW ? x - menuRect.width : x) + 'px';
  menu.style.top = (y + menuRect.height > viewportH ? y - menuRect.height : y) + 'px';
}

/**
 * 隐藏右键菜单
 */
function hidePdfContextMenu() {
  const menu = document.getElementById('pdfContextMenu');
  if (menu) menu.style.display = 'none';
}

/**
 * 复制选中文本到剪贴板
 */
async function copySelectedText() {
  const text = window.getSelection()?.toString().trim();
  if (!text) {
    alert(t('pdfNoSelection'));
    return;
  }

  try {
    if (window.electronAPI?.clipboard?.writeText) {
      await window.electronAPI.clipboard.writeText(text);
    } else {
      await navigator.clipboard.writeText(text);
    }
    console.log('[PDF] Text copied:', text.length, 'chars');
  } catch (e) {
    console.warn('[PDF] Copy failed:', e);
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
  }

  hidePdfContextMenu();
}

/**
 * 复制为引用格式
 */
async function copyAsQuote() {
  const text = window.getSelection()?.toString().trim();
  if (!text) {
    alert(t('pdfNoSelection'));
    return;
  }

  // 获取文献信息用于引用格式
  const lit = appData.literature.find(l => l.id === pdfViewerState.litId);
  const authorPart = lit?.authors ? lit.authors.split(',')[0].trim() : 'Author';
  const yearPart = lit?.year || 'YYYY';
  const quoteText = `${authorPart}(${yearPart}) p.${pdfViewerState.currentPage}: ${text}`;

  try {
    if (window.electronAPI?.clipboard?.writeText) {
      await window.electronAPI.clipboard.writeText(quoteText);
    } else {
      await navigator.clipboard.writeText(quoteText);
    }
  } catch (e) {
    console.warn('[PDF] Copy as quote failed:', e);
  }

  hidePdfContextMenu();
}

/**
 * 快速高亮选中文本（无需先开启标注模式）
 */
function quickHighlightSelection() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.toString().trim()) {
    alert(t('pdfNoSelection'));
    return;
  }

  // 标注功能已禁用（2026-05-27）
  /*
  const wasAnnotationMode = annotationState.annotationMode;
  if (!wasAnnotationMode) {
    toggleAnnotationMode();
  }
  setAnnotationTool('highlight');

  // 触发文本选择处理
  handleTextSelection({ target: selection.anchorNode?.parentElement });

  // 如果之前没开标注模式，关闭它
  if (!wasAnnotationMode) {
    setTimeout(() => toggleAnnotationMode(), 100);
  }
  */
  alert('标注功能开发中...');

  hidePdfContextMenu();
}

/**
 * 导出 PDF 文本
 */
async function exportPdfText(scope) {
  if (!pdfViewerState.doc) return;

  const statusLabel = document.getElementById('pdfScaleLabel');
  if (statusLabel) {
    const orig = statusLabel.textContent;
    statusLabel.textContent = t('pdfExportingText');
    setTimeout(() => { if (statusLabel) statusLabel.textContent = orig; }, 2000);
  }

  let fullText = '';

  if (scope === 'current') {
    // 只导出当前页
    const page = await pdfViewerState.doc.getPage(pdfViewerState.currentPage);
    const tc = await page.getTextContent();
    fullText = tc.items.map(i => i.str).join(' ');
    fullText = `--- ${t('pdfPage')} ${pdfViewerState.currentPage} ---\n\n${fullText}`;
  } else {
    // 导出全部
    for (let i = 1; i <= pdfViewerState.totalPages; i++) {
      try {
        const page = await pdfViewerState.doc.getPage(i);
        const tc = await page.getTextContent();
        fullText += `\n=== ${t('pdfPage')} ${i} ===\n`;
        fullText += tc.items.map(item => item.str).join(' ') + '\n';
      } catch (e) {
        console.warn(`[Export] Page ${i} error:`, e);
      }
    }
  }

  // 写入剪贴板或下载
  try {
    if (window.electronAPI?.clipboard?.writeText) {
      await window.electronAPI.clipboard.writeText(fullText);
    } else {
      await navigator.clipboard.writeText(fullText);
    }
    console.log(`[PDF] Exported ${fullText.length} chars (${scope})`);
  } catch (e) {
    // Fallback: download as file
    downloadAsTxt(fullText, scope === 'current' ? `page_${pdfViewerState.currentPage}.txt` : 'all_pages.txt');
  }

  // 关闭下拉菜单
  const exportMenu = document.getElementById('pdfExportMenu');
  if (exportMenu) exportMenu.classList.remove('show');
}

/**
 * 复制当前页面为图片
 */
async function copyCurrentPageAsImage() {
  const canvas = document.querySelector(
    `.pdf-page-wrapper[data-page="${pdfViewerState.currentPage}"] canvas`
  );
  if (!canvas) {
    alert('No canvas found for current page');
    return;
  }

  try {
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      if (window.electronAPI?.clipboard?.writeImage) {
        const reader = new FileReader();
        reader.onload = async () => {
          await window.electronAPI.clipboard.writeImage(reader.result);
          console.log('[PDF] Page image copied to clipboard');
        };
        reader.readAsDataURL(blob);
      } else {
        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `page_${pdfViewerState.currentPage}.png`;
        a.click(); URL.revokeObjectURL(url);
      }
    }, 'image/png');
  } catch (e) {
    console.warn('[PDF] Copy page as image failed:', e);
  }

  hidePdfContextMenu();
  const exportMenu = document.getElementById('pdfExportMenu');
  if (exportMenu) exportMenu.classList.remove('show');
}

/**
 * 下载 TXT 文件（fallback 导出方式）
 */
function downloadAsTxt(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click(); URL.revokeObjectURL(url);
}

// ============================================================
// Module 4: Note Linking helpers (used by annotation module)
// ============================================================

/**
 * 获取当前文献的所有笔记列表
 */
function getNotesForCurrentLit() {
  if (!pdfViewerState.litId) return [];
  return (appData.notes || []).filter(n => n.litId === pdfViewerState.litId);
}

/**
 * 根据ID获取笔记
 */
function getNoteById(noteId) {
  return (appData.notes || []).find(n => n.id === noteId);
}

/**
 * 获取与指定笔记关联的所有标注
 */
function getAnnotationsForNote(noteId) {
  if (!annotationState.annotations) return [];
  return annotationState.annotations.filter(a => a.noteId === noteId);
}

/**
 * 创建笔记并关联标注（一键生成功能）
 */
async function createNoteFromAnnotation(annotation) {
  if (!annotation || !pdfViewerState.litId) return null;

  const title = (annotation.selectedText || '').slice(0, 20) || t('pdfNoteCreatedFromAnnotation');
  const content = [
    `> **${t('pdfPage')}** ${annotation.pageNum}`,
    '',
    annotation.selectedText || '',
  ].join('\n');

  const newNote = {
    id: generateId(),
    title,
    content,
    litId: pdfViewerState.litId,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    annotationIds: [annotation.id],
  };

  appData.notes.push(newNote);
  await saveData();

  // 关联标注
  annotation.noteId = newNote.id;
  if (pdfViewerState.litId) {
    saveAnnotations(pdfViewerState.litId, annotationState.annotations);
  }

  return newNote;
}

/**
 * 跳转到笔记页面并定位到目标笔记
 */
function goToNoteAndHighlight(noteId) {
  switchPage('notes');
  // 延迟等待渲染完成
  setTimeout(() => {
    const card = document.querySelector(`[data-note-id="${noteId}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.style.boxShadow = '0 0 0 3px var(--accent)';
      setTimeout(() => { card.style.boxShadow = ''; }, 2000);
    }
  }, 300);
}

// ============================================================
// 页面卸载时清理
// ============================================================

window.addEventListener('beforeunload', () => {
  cleanupPdfBlobUrl();
  saveCurrentPosition();
});

// ============================================================
// 模块导出
// ============================================================

if (typeof window !== 'undefined') {
  // 状态
  window.pdfViewerState = pdfViewerState;
  
  // 数据库操作
  window.openPdfDB = openPdfDB;
  window.storePdfData = storePdfData;
  window.getPdfData = getPdfData;
  window.removePdfData = removePdfData;
  window.saveReadingPosition = saveReadingPosition;
  window.getReadingPosition = getReadingPosition;
  
  // 渲染
  window.renderPdfViewerArea = renderPdfViewerArea;
  window.renderAllPages = renderAllPages;
  
  // 导航
  window.goToPage = goToPage;
  window.goToPrevPage = goToPrevPage;
  window.goToNextPage = goToNextPage;
  
  // 缩放
  window.zoomIn = zoomIn;
  window.zoomOut = zoomOut;
  window.fitToWidth = fitToWidth;
  window.setScale = setScale;
  
  // 视图模式
  window.setViewMode = setViewMode;

  // Module 2: Scroll/Page Mode
  window.setScrollMode = setScrollMode;
  window.toggleScrollMode = toggleScrollMode;
  window.pageModeGoToPage = pageModeGoToPage;
  window.showCurrentPageInPageMode = showCurrentPageInPageMode;
  window.showAllPagesInScrollMode = showAllPagesInScrollMode;
  window.updatePageIndicator = updatePageIndicator;
  
  // 全屏
  window.pdfToggleFullscreen = pdfToggleFullscreen;
  
  // 搜索
  window.searchPdfText = searchPdfText;
  window.toggleSearchPanel = toggleSearchPanel;
  
  // 目录
  window.toggleOutlinePanel = toggleOutlinePanel;
  window.closePdfSidebar = closePdfSidebar;
  
  // 夜间模式
  window.toggleNightMode = toggleNightMode;
  
  // 上传处理
  window.handlePdfUpload = handlePdfUpload;
  window.handlePdfDrop = handlePdfDrop;
  window.handlePdfRemove = handlePdfRemove;
  window.pdfOpenNewTab = pdfOpenNewTab;
  window.cleanupPdfBlobUrl = cleanupPdfBlobUrl;

  // Module 3: Context Menu & Export
  window.showPdfContextMenu = showPdfContextMenu;
  window.hidePdfContextMenu = hidePdfContextMenu;
  window.copySelectedText = copySelectedText;
  window.copyAsQuote = copyAsQuote;
  window.quickHighlightSelection = quickHighlightSelection;
  window.exportPdfText = exportPdfText;
  window.copyCurrentPageAsImage = copyCurrentPageAsImage;
  window.downloadAsTxt = downloadAsTxt;

  // Module 4: Note Linking helpers
  window.getNotesForCurrentLit = getNotesForCurrentLit;
  window.getNoteById = getNoteById;
  window.getAnnotationsForNote = getAnnotationsForNote;
  window.createNoteFromAnnotation = createNoteFromAnnotation;
  window.goToNoteAndHighlight = goToNoteAndHighlight;
  
  // 常量
  window.PDF_DB_NAME = PDF_DB_NAME;
  window.PDF_DB_VERSION = PDF_DB_VERSION;
}
