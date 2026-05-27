/**
 * @fileoverview 引用生成 UI 模块 — 弹窗 + 预览 + 复制/导出
 *
 * 零外部依赖，纯原生 DOM 操作，所有样式通过 inline style 注入。
 * 暴露 window.CitationUI。
 *
 * 依赖：
 *   - window.Citation        (generate / generateList / getFormatNames)
 *   - window.CitationExport  (exportToText / exportToMarkdown / copyToClipboard)
 *
 * @module CitationUI
 */

(function () {
  'use strict';

  // =========================================================================
  //  内部状态
  // =========================================================================

  /** @type {Array<Object>} 当前选中文献列表 */
  var _selectedItems = [];

  /** @type {string} 当前选中的引用格式名 */
  var _currentFormat = '';

  /** @type {string} 当前导出格式：'plain' | 'markdown' */
  var _currentExportType = 'plain';

  /** @type {boolean} 是否带编号导出 */
  var _numberLines = true;

  // 缓存 DOM 引用，避免重复查询
  var _overlayEl = null;
  var _previewEl = null;
  var _formatSelectEl = null;
  var _exportSelectEl = null;
  var _numberCheckEl = null;
  var _countLabelEl = null;
  var _containerEl = null;

  // =========================================================================
  //  常量
  // =========================================================================

  /** localStorage 键：默认格式 */
  var STORAGE_KEY_DEFAULT_FORMAT = 'citation_default_format';

  /** 所有可用格式名（保持与 CitationFormats 注册顺序一致） */
  var ALL_FORMATS = [
    'APA 7th',
    'MLA 9th',
    'Chicago 17th (作者-日期)',
    'Chicago 17th (注释-书目)',
    'GB/T 7714-2015',
    'IEEE',
  ];

  // =========================================================================
  //  辅助函数
  // =========================================================================

  /**
   * 读取用户偏好的默认格式。
   * @return {string}
   */
  function _loadDefaultFormat() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY_DEFAULT_FORMAT);
      if (saved && ALL_FORMATS.indexOf(saved) !== -1) {
        return saved;
      }
    } catch (e) { /* localStorage 不可用 */ }
    return ALL_FORMATS[0];
  }

  /**
   * 保存用户偏好的默认格式。
   * @param {string} formatName
   */
  function _saveDefaultFormat(formatName) {
    try {
      localStorage.setItem(STORAGE_KEY_DEFAULT_FORMAT, formatName);
    } catch (e) { /* 静默失败 */ }
  }

  /**
   * 刷新预览区内容。
   */
  function _refreshPreview() {
    if (!_previewEl || _selectedItems.length === 0) return;

    var lines;
    try {
      lines = window.Citation.generateList(_selectedItems, _currentFormat);
    } catch (e) {
      _previewEl.textContent = '[预览生成失败: ' + e.message + ']';
      return;
    }

    if (!lines || lines.length === 0) {
      _previewEl.textContent = '';
      return;
    }

    _previewEl.textContent = lines.join('\n\n');
  }

  /**
   * 生成导出内容。
   * @return {string}
   */
  function _buildExportContent() {
    if (_selectedItems.length === 0) return '';

    var lines = window.Citation.generateList(_selectedItems, _currentFormat);

    if (_currentExportType === 'markdown') {
      return window.CitationExport.exportToMarkdown(lines, _numberLines);
    }

    // 纯文本
    if (_numberLines) {
      var numbered = [];
      for (var i = 0; i < lines.length; i++) {
        numbered.push((i + 1) + '. ' + lines[i]);
      }
      return window.CitationExport.exportToText(numbered);
    }
    return window.CitationExport.exportToText(lines);
  }

  /**
   * 触发文件下载。
   * @param {string} content
   * @param {string} filename
   * @param {string} mimeType
   */
  function _downloadFile(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // 异步清理，确保下载触发后再回收
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  // =========================================================================
  //  DOM 构建
  // =========================================================================

  /**
   * 惰性创建对话框（首次调用 showModal 时触发）。
   * 所有元素使用 inline style，不依赖外部 CSS。
   */
  function _ensureDialog() {
    if (_overlayEl) return;

    // -- 遮罩层 --
    _overlayEl = document.createElement('div');
    _overlayEl.setAttribute('data-citation-ui', 'overlay');
    _overlayEl.style.cssText = [
      'position: fixed',
      'top: 0',
      'left: 0',
      'width: 100%',
      'height: 100%',
      'background: rgba(0, 0, 0, 0.5)',
      'z-index: 10000',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    ].join(';');

    // -- 容器 --
    _containerEl = document.createElement('div');
    _containerEl.setAttribute('data-citation-ui', 'container');
    _containerEl.style.cssText = [
      'background: #ffffff',
      'border-radius: 12px',
      'box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18)',
      'width: 660px',
      'max-width: 92vw',
      'max-height: 85vh',
      'display: flex',
      'flex-direction: column',
      'z-index: 10001',
      'color: #1f2937',
      'overflow: hidden',
    ].join(';');

    // -- 头部 --
    var headerEl = document.createElement('div');
    headerEl.setAttribute('data-citation-ui', 'header');
    headerEl.style.cssText = [
      'display: flex',
      'align-items: center',
      'justify-content: space-between',
      'padding: 18px 24px',
      'border-bottom: 1px solid #e5e7eb',
      'flex-shrink: 0',
    ].join(';');

    var titleEl = document.createElement('h3');
    titleEl.textContent = '生成引用';
    titleEl.style.cssText = 'margin: 0; font-size: 18px; font-weight: 600; color: #111827;';

    var closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.setAttribute('aria-label', '关闭');
    closeBtn.style.cssText = [
      'background: none',
      'border: none',
      'font-size: 20px',
      'color: #9ca3af',
      'cursor: pointer',
      'padding: 4px 8px',
      'line-height: 1',
      'border-radius: 4px',
      'transition: color 0.15s, background 0.15s',
    ].join(';');
    closeBtn.addEventListener('mouseenter', function () {
      closeBtn.style.color = '#1f2937';
      closeBtn.style.background = '#f3f4f6';
    });
    closeBtn.addEventListener('mouseleave', function () {
      closeBtn.style.color = '#9ca3af';
      closeBtn.style.background = 'none';
    });
    closeBtn.addEventListener('click', closeModal);

    headerEl.appendChild(titleEl);
    headerEl.appendChild(closeBtn);

    // -- 主体 --
    var bodyEl = document.createElement('div');
    bodyEl.setAttribute('data-citation-ui', 'body');
    bodyEl.style.cssText = [
      'padding: 20px 24px',
      'flex: 1 1 auto',
      'overflow-y: auto',
      'display: flex',
      'flex-direction: column',
      'gap: 14px',
    ].join(';');

    // 计数标签
    _countLabelEl = document.createElement('p');
    _countLabelEl.style.cssText = 'margin: 0; font-size: 14px; color: #6b7280;';
    bodyEl.appendChild(_countLabelEl);

    // 预览区
    _previewEl = document.createElement('pre');
    _previewEl.style.cssText = [
      'background: #f9fafb',
      'border: 1px solid #e5e7eb',
      'border-radius: 8px',
      'padding: 16px',
      'margin: 0',
      'font-size: 13px',
      'font-family: "SF Mono", "Fira Code", "Consolas", "Monaco", monospace',
      'color: #1f2937',
      'white-space: pre-wrap',
      'word-break: break-word',
      'max-height: 340px',
      'overflow-y: auto',
      'line-height: 1.65',
      'min-height: 100px',
      'resize: vertical',
    ].join(';');
    bodyEl.appendChild(_previewEl);

    // 控件行
    var controlsEl = document.createElement('div');
    controlsEl.style.cssText = [
      'display: flex',
      'align-items: center',
      'gap: 18px',
      'flex-wrap: wrap',
      'font-size: 14px',
    ].join(';');

    // 引用格式下拉
    var fmtLabel = document.createElement('label');
    fmtLabel.style.cssText = 'display: flex; align-items: center; gap: 6px; color: #374151;';
    fmtLabel.appendChild(document.createTextNode('引用格式：'));
    _formatSelectEl = document.createElement('select');
    _formatSelectEl.style.cssText = [
      'padding: 6px 10px',
      'border: 1px solid #d1d5db',
      'border-radius: 6px',
      'background: #ffffff',
      'font-size: 13px',
      'color: #1f2937',
      'cursor: pointer',
      'outline: none',
    ].join(';');
    _formatSelectEl.addEventListener('change', function () {
      _currentFormat = _formatSelectEl.value;
      _saveDefaultFormat(_currentFormat);
      _refreshPreview();
    });
    fmtLabel.appendChild(_formatSelectEl);
    controlsEl.appendChild(fmtLabel);

    // 导出格式下拉
    var expLabel = document.createElement('label');
    expLabel.style.cssText = 'display: flex; align-items: center; gap: 6px; color: #374151;';
    expLabel.appendChild(document.createTextNode('导出格式：'));
    _exportSelectEl = document.createElement('select');
    _exportSelectEl.style.cssText = _formatSelectEl.style.cssText;
    _exportSelectEl.addEventListener('change', function () {
      _currentExportType = _exportSelectEl.value;
    });
    expLabel.appendChild(_exportSelectEl);
    controlsEl.appendChild(expLabel);

    // 带编号复选框
    var cbLabel = document.createElement('label');
    cbLabel.style.cssText = 'display: flex; align-items: center; gap: 5px; color: #374151; cursor: pointer;';
    _numberCheckEl = document.createElement('input');
    _numberCheckEl.type = 'checkbox';
    _numberCheckEl.checked = _numberLines;
    _numberCheckEl.style.cssText = 'cursor: pointer;';
    _numberCheckEl.addEventListener('change', function () {
      _numberLines = _numberCheckEl.checked;
    });
    cbLabel.appendChild(_numberCheckEl);
    cbLabel.appendChild(document.createTextNode('带编号导出'));
    controlsEl.appendChild(cbLabel);

    bodyEl.appendChild(controlsEl);

    // -- 底部按钮 --
    var footerEl = document.createElement('div');
    footerEl.setAttribute('data-citation-ui', 'footer');
    footerEl.style.cssText = [
      'display: flex',
      'align-items: center',
      'justify-content: flex-end',
      'gap: 10px',
      'padding: 16px 24px',
      'border-top: 1px solid #e5e7eb',
      'flex-shrink: 0',
    ].join(';');

    // 按钮工厂
    function _makeBtn(text, isPrimary) {
      var btn = document.createElement('button');
      btn.textContent = text;
      btn.style.cssText = [
        'padding: 9px 20px',
        'border-radius: 8px',
        'font-size: 14px',
        'font-weight: 500',
        'cursor: pointer',
        'border: 1px solid',
        'transition: background 0.15s, box-shadow 0.15s',
        isPrimary
          ? 'background: #2563eb; color: #ffffff; border-color: #2563eb;'
          : 'background: #ffffff; color: #374151; border-color: #d1d5db;',
      ].join(';');
      btn.addEventListener('mouseenter', function () {
        if (isPrimary) {
          btn.style.background = '#1d4ed8';
          btn.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.3)';
        } else {
          btn.style.background = '#f9fafb';
        }
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.background = isPrimary ? '#2563eb' : '#ffffff';
        btn.style.boxShadow = 'none';
      });
      return btn;
    }

    var copyBtn = _makeBtn('复制到剪贴板', true);
    copyBtn.addEventListener('click', function () {
      if (_selectedItems.length === 0) return;
      var content = _previewEl.textContent;
      window.CitationExport.copyToClipboard(content).then(function () {
        _flashButton(copyBtn, '#16a34a');
      }).catch(function () {
        _flashButton(copyBtn, '#dc2626');
      });
    });

    var exportBtn = _makeBtn('导出为文件', true);
    exportBtn.addEventListener('click', function () {
      if (_selectedItems.length === 0) return;
      var content = _buildExportContent();
      if (!content) return;
      var ext = _currentExportType === 'markdown' ? '.md' : '.txt';
      var mime = _currentExportType === 'markdown' ? 'text/markdown' : 'text/plain';
      _downloadFile(content, 'references' + ext, mime);
    });

    var cancelBtn = _makeBtn('取消', false);
    cancelBtn.addEventListener('click', closeModal);

    footerEl.appendChild(copyBtn);
    footerEl.appendChild(exportBtn);
    footerEl.appendChild(cancelBtn);

    // -- 组装 --
    _containerEl.appendChild(headerEl);
    _containerEl.appendChild(bodyEl);
    _containerEl.appendChild(footerEl);
    _overlayEl.appendChild(_containerEl);

    // 点击遮罩层关闭
    _overlayEl.addEventListener('click', function (e) {
      if (e.target === _overlayEl) {
        closeModal();
      }
    });

    // ESC 关闭
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _overlayEl && _overlayEl.parentNode) {
        closeModal();
      }
    });

    document.body.appendChild(_overlayEl);
  }

  /**
   * 按钮短暂变色反馈。
   * @param {HTMLElement} btn
   * @param {string} color
   */
  function _flashButton(btn, color) {
    var origBg = btn.style.background;
    btn.style.background = color;
    setTimeout(function () {
      btn.style.background = origBg;
    }, 600);
  }

  // =========================================================================
  //  填充下拉选项（首次显示时执行一次）
  // =========================================================================

  var _optionsPopulated = false;

  function _populateSelects() {
    if (_optionsPopulated) return;

    // 引用格式下拉
    var frag = document.createDocumentFragment();
    for (var i = 0; i < ALL_FORMATS.length; i++) {
      var opt = document.createElement('option');
      opt.value = ALL_FORMATS[i];
      opt.textContent = ALL_FORMATS[i];
      if (ALL_FORMATS[i] === _currentFormat) {
        opt.selected = true;
      }
      frag.appendChild(opt);
    }
    _formatSelectEl.appendChild(frag);

    // 导出格式下拉
    var expFrag = document.createDocumentFragment();
    var plainOpt = document.createElement('option');
    plainOpt.value = 'plain';
    plainOpt.textContent = '纯文本 (.txt)';
    plainOpt.selected = (_currentExportType === 'plain');
    expFrag.appendChild(plainOpt);

    var mdOpt = document.createElement('option');
    mdOpt.value = 'markdown';
    mdOpt.textContent = 'Markdown (.md)';
    mdOpt.selected = (_currentExportType === 'markdown');
    expFrag.appendChild(mdOpt);

    _exportSelectEl.appendChild(expFrag);

    _optionsPopulated = true;
  }

  // =========================================================================
  //  Public API
  // =========================================================================

  /**
   * 显示引用生成对话框。
   *
   * @param {Array<Object>} items - 选中的文献项数组
   */
  function showModal(items) {
    _selectedItems = items || [];
    _currentFormat = _loadDefaultFormat();
    _currentExportType = 'plain';
    _numberLines = true;

    _ensureDialog();
    _populateSelects();

    // 更新格式下拉选中项
    _formatSelectEl.value = _currentFormat;

    // 更新计数标签
    _countLabelEl.textContent = '已选文献：' + _selectedItems.length + ' 篇';

    // 刷新预览
    _refreshPreview();

    // 显示
    _overlayEl.style.display = 'flex';
  }

  /**
   * 关闭对话框。
   */
  function closeModal() {
    if (_overlayEl) {
      _overlayEl.style.display = 'none';
    }
  }

  // ---- 暴露全局 API ----
  window.CitationUI = {
    showModal: showModal,
    closeModal: closeModal,
  };
})();
