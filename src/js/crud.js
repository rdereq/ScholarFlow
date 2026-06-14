/**
 * ============================================================
 * ScholarFlow - CRUD Operations Module
 * ============================================================
 * 
 * 本模块负责所有文献和笔记的增删改查操作，包括：
 * - 文献添加（手动录入、DOI获取、BibTeX导入）
 * - 文献编辑和删除
 * - 笔记的增删改查
 * - 标签管理（删除标签）
 * - 文件夹管理（添加文件夹）
 * - 数据导出功能（JSON备份、BibTeX、Markdown笔记）
 * - 数据导入功能（JSON备份导入）
 * 
 * @module crud
 * @version 1.0.0
 */

// ============================================================
// 文献添加表单渲染
// ============================================================

/**
 * 渲染添加文献表单（v1.4）
 * 支持：手动录入、DOI单条获取、BibTeX/RIS/EndNote/Zotero/Mendeley/CNKI文本粘贴、
 *       多格式文件批量导入、DOI列表批量获取、PDF文件夹自动提取元数据
 */
function renderAddLitForm() {
  document.getElementById('addLitForm').innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:8px;">
      <input type="text" class="input" placeholder="${escapeHtml(t('doiFetch'))}" id="doiInput" style="flex:1;">
      <button class="btn btn-primary" id="fetchDoiBtn">${escapeHtml(t('fetch'))}</button>
    </div>
    <div id="doiFetchStatus" style="font-size:12px;color:var(--text-muted);margin-bottom:12px;min-height:18px;"></div>

    <!-- 重复检测策略（全局选项，始终可见） -->
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;display:flex;align-items:center;gap:8px;">
      <span>重复文献处理：</span>
      <select id="dupStrategy" class="input" style="padding:4px 8px;font-size:12px;flex:1;max-width:240px;">
        <option value="skip">跳过（默认）</option>
        <option value="merge">合并信息</option>
        <option value="import_all">全部导入</option>
      </select>
    </div>

    <!-- 标签页切换栏 -->
    <div class="tab-bar" style="margin-bottom:16px;" id="addTabBar">
      <div class="tab-item active" data-tab="manual">手动录入</div>
      <div class="tab-item" data-tab="text">文本导入</div>
      <div class="tab-item" data-tab="file">文件导入</div>
      <div class="tab-item" data-tab="doi">DOI批量</div>
      <div class="tab-item" data-tab="pdf">PDF文件夹</div>
    </div>

    <!-- 手动录入表单 -->
    <div id="addTab-manual">
      <div class="form-group"><label class="form-label">${escapeHtml(t('titleField'))} *</label><input type="text" class="input" id="lit-title"></div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label class="form-label">${escapeHtml(t('authorsField'))}</label><input type="text" class="input" id="lit-authors" placeholder="Author1, Author2, ..."></div>
        <div class="form-group"><label class="form-label">${escapeHtml(t('yearField'))}</label><input type="number" class="input" id="lit-year" placeholder="2024"></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label class="form-label">${escapeHtml(t('journalField'))}</label><input type="text" class="input" id="lit-journal"></div>
        <div class="form-group"><label class="form-label">${escapeHtml(t('doiField'))}</label><input type="text" class="input" id="lit-doi"></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
        <div class="form-group"><label class="form-label">${escapeHtml(t('quartileField'))}</label><select class="input" id="lit-quartile"><option value="">&mdash;</option><option>Q1</option><option>Q2</option><option>Q3</option><option>Q4</option><option>N/A</option></select></div>
        <div class="form-group"><label class="form-label">${escapeHtml(t('ifField'))}</label><input type="number" step="0.1" class="input" id="lit-if"></div>
        <div class="form-group"><label class="form-label">${escapeHtml(t('totalPages'))}</label><input type="number" class="input" id="lit-pages"></div>
      </div>

      <div class="form-group"><label class="form-label">${escapeHtml(t('abstractField'))}</label><textarea class="input" id="lit-abstract" rows="3"></textarea></div>
      <div class="form-group"><label class="form-label">${escapeHtml(t('keywordsField'))}</label><input type="text" class="input" id="lit-keywords" placeholder="keyword1, keyword2"></div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label class="form-label">${escapeHtml(t('folderField'))}</label><select class="input" id="lit-folder"><option value="">${escapeHtml(t('none'))}</option>${appData.folders.map(f => '<option value="' + escapeAttr(f.id) + '">' + escapeHtml(f.name) + '</option>').join('')}</select></div>
        <div class="form-group"><label class="form-label">${escapeHtml(t('tagsField'))}</label><input type="text" class="input" id="lit-tags" placeholder="tag1, tag2"></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label class="form-label">${escapeHtml(t('priorityField'))}</label><select class="input" id="lit-priority"><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></select></div>
        <div class="form-group"><label class="form-label">${escapeHtml(t('deadlineField'))}</label><input type="date" class="input" id="lit-deadline"></div>
      </div>

      <div class="modal-footer" style="padding:16px 0 0;">
        <button class="btn btn-secondary" id="cancelAddLitBtn">${escapeHtml(t('cancel'))}</button>
        <button class="btn btn-primary" id="saveLitBtn">${escapeHtml(t('addLitBtn'))}</button>
      </div>
    </div>

    <!-- 文本导入表单 (BibTeX / RIS / EndNote XML / Zotero RDF / Mendeley CSV / CNKI 文本) -->
    <div id="addTab-text" style="display:none;">
      <div class="form-group">
        <label class="form-label">格式：</label>
        <select id="textFormat" class="input" style="padding:6px 8px;">
          <option value="auto">自动识别</option>
          <option value="bibtex">BibTeX</option>
          <option value="ris">RIS</option>
          <option value="endnote">EndNote XML</option>
          <option value="zotero">Zotero RDF</option>
          <option value="mendeley">Mendeley CSV</option>
          <option value="cnki">CNKI/知网 文本</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">粘贴文献数据（支持多条，空行分隔）</label>
        <textarea class="input" id="text-input" rows="10" placeholder="@article{...} 或 TY - JOUR 或 &lt;xml&gt;&lt;records&gt;... 或 题名：..."></textarea>
      </div>
      <div class="modal-footer" style="padding:16px 0 0;">
        <button class="btn btn-secondary" id="cancelTextBtn">取消</button>
        <button class="btn btn-primary" id="importTextBtn">导入</button>
      </div>
    </div>

    <!-- 文件导入表单 -->
    <div id="addTab-file" style="display:none;">
      <div class="form-group" style="font-size:12px;color:var(--text-muted);line-height:1.6;">
        支持的文件格式：<b>.bib</b> (BibTeX)、<b>.ris</b>、<b>.xml</b> (EndNote)、<b>.rdf</b> (Zotero)、<b>.csv</b> (Mendeley)、<b>.net</b>/.txt (CNKI/知网)<br>
        可同时选择多个文件进行批量导入
      </div>
      <div class="modal-footer" style="padding:16px 0 0;display:flex;flex-direction:column;align-items:stretch;gap:8px;">
        <button class="btn btn-secondary" id="cancelFileBtn">取消</button>
        <button class="btn btn-primary" id="selectFilesBtn">选择文件导入…</button>
      </div>
    </div>

    <!-- DOI 批量获取表单 -->
    <div id="addTab-doi" style="display:none;">
      <div class="form-group" style="font-size:12px;color:var(--text-muted);line-height:1.6;">
        每行输入一个 DOI（可带或不带 <code>https://doi.org/</code> 前缀），系统会通过 CrossRef API 逐条获取元数据。
      </div>
      <div class="form-group">
        <label class="form-label">DOI 列表（每行一个）</label>
        <textarea class="input" id="doiBatch-input" rows="10" placeholder="10.1038/nature12345&#10;https://doi.org/10.1016/j.cell.2020.01.001&#10;10.1109/ICCV.2019.00000"></textarea>
      </div>
      <div class="modal-footer" style="padding:16px 0 0;">
        <button class="btn btn-secondary" id="cancelDoiBatchBtn">取消</button>
        <button class="btn btn-primary" id="importDoiBatchBtn">批量获取</button>
      </div>
    </div>

    <!-- PDF 文件夹批量导入 -->
    <div id="addTab-pdf" style="display:none;">
      <div class="form-group" style="font-size:12px;color:var(--text-muted);line-height:1.6;">
        选择包含 PDF 文件的文件夹，系统将使用 PDF.js 解析每篇 PDF 的标题、作者、DOI 和首页文本（前 500 字）作为摘要。
        <br>注意：若 PDF 文件未携带元数据，将使用文件名作为标题，其余字段留空。
      </div>
      <div class="modal-footer" style="padding:16px 0 0;">
        <button class="btn btn-secondary" id="cancelPdfBtn">取消</button>
        <button class="btn btn-primary" id="selectPdfFolderBtn">选择 PDF 文件夹…</button>
      </div>
    </div>

    <!-- 进度显示区（共享） -->
    <div id="importProgress" style="display:none;margin-top:16px;padding:12px;background:var(--bg-color);border:1px solid var(--border-color);border-radius:8px;">
      <div style="font-weight:600;margin-bottom:8px;" id="importProgressTitle">正在处理…</div>
      <div style="height:6px;background:var(--border-color);border-radius:3px;overflow:hidden;margin-bottom:8px;">
        <div id="importProgressBar" style="height:100%;width:0%;background:var(--accent-color,#0077e6);transition:width 0.25s;"></div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);min-height:18px;" id="importProgressText">准备中…</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px;max-height:120px;overflow-y:auto;white-space:pre-wrap;font-family:monospace;" id="importProgressLog"></div>
    </div>
  `;

  attachAddLitFormListeners();
}

/**
 * 为添加文献表单附加事件监听器（v1.4）
 */
function attachAddLitFormListeners() {
  // DOI 单条获取按钮
  const fetchBtn = document.getElementById('fetchDoiBtn');
  if (fetchBtn) fetchBtn.addEventListener('click', fetchDOI);

  // 手动录入
  const cancelEl = document.getElementById('cancelAddLitBtn');
  if (cancelEl) cancelEl.addEventListener('click', () => closeModal('addLitModal'));
  const saveEl = document.getElementById('saveLitBtn');
  if (saveEl) saveEl.addEventListener('click', saveLiterature);

  // 文本导入
  const ctBtn = document.getElementById('cancelTextBtn');
  if (ctBtn) ctBtn.addEventListener('click', () => closeModal('addLitModal'));
  const itBtn = document.getElementById('importTextBtn');
  if (itBtn) itBtn.addEventListener('click', importFromText);

  // 文件导入
  const cfBtn = document.getElementById('cancelFileBtn');
  if (cfBtn) cfBtn.addEventListener('click', () => closeModal('addLitModal'));
  const sfBtn = document.getElementById('selectFilesBtn');
  if (sfBtn) sfBtn.addEventListener('click', importFromFiles);

  // DOI 批量
  const cdBtn = document.getElementById('cancelDoiBatchBtn');
  if (cdBtn) cdBtn.addEventListener('click', () => closeModal('addLitModal'));
  const idBtn = document.getElementById('importDoiBatchBtn');
  if (idBtn) idBtn.addEventListener('click', importFromDOIBatch);

  // PDF 文件夹
  const cpBtn = document.getElementById('cancelPdfBtn');
  if (cpBtn) cpBtn.addEventListener('click', () => closeModal('addLitModal'));
  const spBtn = document.getElementById('selectPdfFolderBtn');
  if (spBtn) spBtn.addEventListener('click', importFromPDFFolder);

  // 标签页切换
  const tabs = document.querySelectorAll('#addTabBar .tab-item');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('#addTabBar .tab-item').forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const activeTab = e.currentTarget.dataset.tab;
      ['manual', 'text', 'file', 'doi', 'pdf'].forEach(t => {
        const el = document.getElementById('addTab-' + t);
        if (el) el.style.display = (t === activeTab) ? 'block' : 'none';
      });
    });
  });
}

/** 获取当前选择的重复检测策略 */
function getDupStrategy() {
  const el = document.getElementById('dupStrategy');
  if (!el) return 'skip';
  return el.value || 'skip';
}

/** 更新共享进度显示 */
function updateImportProgress(title, text, current, total, logLines) {
  const bar = document.getElementById('importProgress');
  if (!bar) return;
  bar.style.display = 'block';
  const titleEl = document.getElementById('importProgressTitle');
  if (titleEl && title) titleEl.textContent = title;
  const textEl = document.getElementById('importProgressText');
  if (textEl && text !== undefined) textEl.textContent = text;
  const pbar = document.getElementById('importProgressBar');
  if (pbar && total > 0 && current !== undefined) {
    const pct = Math.min(100, Math.round((current / total) * 100));
    pbar.style.width = pct + '%';
  }
  if (logLines && Array.isArray(logLines)) {
    const logEl = document.getElementById('importProgressLog');
    if (logEl) logEl.textContent = logLines.slice(-20).join('\n');
  }
}

/** 导入完成后的收尾处理 */
function finalizeImportResult(result, startMessages) {
  const totalCount = result.total || 0;
  const importedCount = result.imported || 0;
  const duplicatesCount = result.duplicates || 0;
  const invalidCount = result.invalid || 0;

  // 构造顶部汇总信息
  const msg = [];
  msg.push(`处理完毕：共 ${totalCount} 条，新增 ${importedCount} 条，重复/合并 ${duplicatesCount} 条，无效 ${invalidCount} 条。`);

  // 重复文献醒目提醒
  if (duplicatesCount > 0) {
    msg.push('');
    msg.push('═══════════════════════════════════════');
    msg.push(`⚠ 提醒：检测到 ${duplicatesCount} 篇文献已存在于文献库中，已${
      (getDupStrategy() === 'merge') ? '合并' : (getDupStrategy() === 'import_all') ? '重复导入' : '跳过'
    }。`);
    msg.push('═══════════════════════════════════════');
    if (result.duplicateDetails && result.duplicateDetails.length) {
      const showLimit = Math.min(result.duplicateDetails.length, 15);
      for (let d = 0; d < showLimit; d++) {
        const dd = result.duplicateDetails[d];
        let line = '• [第' + dd.index + '条] ' + dd.title;
        if (dd.doi) line += ' (DOI: ' + dd.doi + ')';
        line += ' → 匹配：' + dd.matchedBy;
        msg.push(line);
      }
      if (result.duplicateDetails.length > showLimit) {
        msg.push('  …另有 ' + (result.duplicateDetails.length - showLimit) + ' 篇未列出');
      }
    }
  }

  if (result.messages && result.messages.length) {
    msg.push('', '--- 详细信息 ---');
    for (var i = 0; i < Math.min(result.messages.length, 50); i++) {
      msg.push('• ' + result.messages[i]);
    }
  }
  updateImportProgress('完成', msg[0], 1, 1, msg);
  setTimeout(() => {
    alert(msg.join('\n'));
    saveData();
    closeModal('addLitModal');
    if (currentPage === 'library' && typeof renderLibrary === 'function') renderLibrary();
  }, 250);
}

/** 从粘贴文本解析并导入（统一使用 window.ImportExport） */
async function importFromText() {
  const inputEl = document.getElementById('text-input');
  const formatEl = document.getElementById('textFormat');
  if (!inputEl) return;
  const text = inputEl.value.trim();
  if (!text) { alert('请输入文献数据'); return; }

  const fmt = (formatEl && formatEl.value !== 'auto') ? formatEl.value
    : (window.ImportExport && window.ImportExport.detectFormat ? window.ImportExport.detectFormat('', text) : 'bibtex');

  if (!window.ImportExport) {
    // 回退到旧的 BibTeX 简单解析（保留兼容）
    fallbackImportBibTeX(text);
    return;
  }

  updateImportProgress('解析文本…', '识别格式：' + fmt, 1, 1, ['识别格式：' + fmt]);

  let parsed = [];
  try {
    parsed = window.ImportExport.parseText(text, fmt);
  } catch (e) {
    alert('解析失败：' + e.message);
    return;
  }

  if (!parsed || parsed.length === 0) {
    alert('未识别到有效的文献条目，请检查输入格式或手动选择格式。');
    return;
  }

  // 增强：为每个条目查询分区 / 影响因子（与单篇 DOI 保持一致）
  try {
    if (window.ImportExport.enrichWithJournalInfo) {
      parsed = await window.ImportExport.enrichWithJournalInfo(parsed,
        function (cur, tot, action, info) {
          updateImportProgress(action + '…', info || `(${cur}/${tot})`, cur, tot);
        });
    }
  } catch (_ignore) { /* 失败则使用已解析数据继续 */ }

  const result = window.ImportExport.processBatchImport(
    parsed,
    appData.literature,
    { strategy: getDupStrategy() },
    function (cur, tot, action, info) {
      updateImportProgress('批量导入中…', action + '：' + (info || ''), cur, tot);
    }
  );
  finalizeImportResult(result);
}

/** 从文件导入（多文件，多格式） */
async function importFromFiles() {
  if (!window.electronAPI) {
    alert('当前环境不支持文件 API');
    return;
  }
  try {
    const filters = [
      { name: '文献数据文件', extensions: ['bib', 'ris', 'xml', 'rdf', 'csv', 'net', 'txt'] },
      { name: 'BibTeX', extensions: ['bib'] },
      { name: 'RIS', extensions: ['ris'] },
      { name: 'EndNote XML', extensions: ['xml'] },
      { name: 'Zotero RDF', extensions: ['rdf'] },
      { name: 'Mendeley CSV', extensions: ['csv'] },
      { name: 'CNKI/知网文本', extensions: ['net', 'txt'] },
      { name: '所有文件', extensions: ['*'] }
    ];
    const paths = await window.electronAPI.selectMultiFile(filters);
    if (!paths || paths.length === 0) return;

    updateImportProgress('读取文件…', `共 ${paths.length} 个文件，准备解析`, 0, paths.length, []);

    const allParsed = [];
    const readErrors = [];
    for (let i = 0; i < paths.length; i++) {
      const p = paths[i];
      updateImportProgress('读取文件…', `(${i+1}/${paths.length}) ${p.split(/[\\/]/).pop()}`, i + 1, paths.length);
      try {
        const data = await window.electronAPI.file.readAsText(p);
        if (data && data.content) {
          const fileName = data.fileName || p;
          let fmt = 'bibtex';
          if (window.ImportExport && window.ImportExport.detectFormat) {
            fmt = window.ImportExport.detectFormat(fileName, data.content);
          }
          let parsed = [];
          if (window.ImportExport) parsed = window.ImportExport.parseText(data.content, fmt);
          else parsed = fallbackParseBibTeX(data.content);
          if (parsed && parsed.length) {
            allParsed.push.apply(allParsed, parsed);
            readErrors.push(`✔ ${fileName}：解析到 ${parsed.length} 条`);
          } else {
            readErrors.push(`✘ ${fileName}：未识别到条目`);
          }
        }
      } catch (err) {
        readErrors.push(`✘ ${p.split(/[\\/]/).pop()}：读取失败 - ${err.message}`);
      }
    }

    if (allParsed.length === 0) {
      alert('未能从所选文件中解析出任何有效文献条目。\n\n' + readErrors.slice(0, 10).join('\n'));
      return;
    }

    // 增强：为每个条目查询分区 / 影响因子（与单篇 DOI 保持一致）
    try {
      if (window.ImportExport.enrichWithJournalInfo) {
        allParsed = await window.ImportExport.enrichWithJournalInfo(allParsed,
          function (cur, tot, action, info) {
            updateImportProgress(action + '…', info || `(${cur}/${tot})`, cur, tot, readErrors);
          });
      }
    } catch (_ignore) { /* 失败则使用已解析数据继续 */ }

    const result = window.ImportExport.processBatchImport(
      allParsed,
      appData.literature,
      { strategy: getDupStrategy() },
      function (cur, tot, action, info) {
        updateImportProgress('批量导入中…', action + '：' + (info || ''), cur, tot, readErrors);
      }
    );
    finalizeImportResult(result, readErrors);
  } catch (e) {
    alert('文件导入失败：' + e.message);
  }
}

/** DOI 批量获取（通过 CrossRef） */
async function importFromDOIBatch() {
  const input = document.getElementById('doiBatch-input');
  if (!input) return;
  const doiText = input.value.trim();
  if (!doiText) { alert('请输入至少一个 DOI'); return; }

  const lines = doiText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (lines.length === 0) { alert('请输入至少一个 DOI'); return; }

  // 去除 DOI 的各种前缀
  const doiList = lines.map(l => l.replace(/^https?:\/\/(dx\.)?doi\.org\//, '').replace(/^doi:\s*/, ''));
  updateImportProgress('通过 CrossRef 获取…', `共 ${doiList.length} 个 DOI`, 0, doiList.length, []);

  if (!window.ImportExport) {
    alert('导入模块未就绪');
    return;
  }

  try {
    const fetched = await window.ImportExport.fetchDOIBatch(doiList,
      function (cur, tot, action, info) {
        updateImportProgress(action + '…', info || `(${cur}/${tot})`, cur, tot);
      });
    // 增强：为每个 DOI 条目查询分区 / 影响因子（与单篇 DOI 保持一致）
    let itemsToImport = fetched.items || [];
    try {
      if (window.ImportExport.enrichWithJournalInfo) {
        itemsToImport = await window.ImportExport.enrichWithJournalInfo(itemsToImport,
          function (cur, tot, action, info) {
            updateImportProgress(action + '…', info || `(${cur}/${tot})`, cur, tot,
              (fetched.errors && fetched.errors.length ? fetched.errors : []));
          });
      }
    } catch (_ignore) { /* 失败则使用已获取数据继续 */ }

    const result = window.ImportExport.processBatchImport(
      itemsToImport,
      appData.literature,
      { strategy: getDupStrategy() },
      function (cur, tot, action, info) {
        updateImportProgress('写入数据库…', action + '：' + (info || ''), cur, tot,
          (fetched.errors && fetched.errors.length ? fetched.errors : []));
      }
    );
    if (fetched.errors && fetched.errors.length) {
      result.messages = (result.messages || []).concat(fetched.errors);
    }
    finalizeImportResult(result);
  } catch (e) {
    alert('DOI 批量获取失败：' + e.message);
  }
}

/** PDF 文件夹批量导入（通过 pdf.js 提取元数据） */
async function importFromPDFFolder() {
  if (!window.electronAPI) { alert('当前环境不支持文件 API'); return; }
  try {
    const folderPath = await window.electronAPI.selectFolder();
    if (!folderPath) return;
    const pdfs = await window.electronAPI.file.listPDFs(folderPath);
    if (!pdfs || pdfs.length === 0) {
      alert('所选文件夹中没有找到 PDF 文件');
      return;
    }

    updateImportProgress('准备解析 PDF…', `共 ${pdfs.length} 个 PDF 文件`, 0, pdfs.length, []);
    const logs = [];
    const parsed = [];
    for (let i = 0; i < pdfs.length; i++) {
      const p = pdfs[i];
      const fname = p.split(/[\\/]/).pop();
      updateImportProgress(`解析 PDF (${i+1}/${pdfs.length})`, fname, i + 1, pdfs.length);
      try {
        const base64 = await window.electronAPI.file.readAsBase64(p);
        if (!base64 || !base64.base64) { logs.push('✘ ' + fname + ': 无法读取'); continue; }

        // Base64 -> ArrayBuffer
        const binary = atob(base64.base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let b = 0; b < len; b++) bytes[b] = binary.charCodeAt(b);

        let lit = null;
        if (window.ImportExport && typeof window.ImportExport.extractPDFMetadata === 'function') {
          try {
            lit = await window.ImportExport.extractPDFMetadata(bytes.buffer, base64.fileName || fname);
          } catch (pdfErr) {
            logs.push('⚠ ' + fname + ': PDF 解析失败 - ' + pdfErr.message);
          }
        }

        if (!lit) {
          // 回退：使用文件名作为标题
          lit = {
            id: null,
            title: fname.replace(/\.pdf$/i, ''),
            authors: '',
            journal: '',
            year: '',
            doi: '',
            abstract: '',
            keywords: [],
            status: 'unread', progress: 0, priority: 'medium',
            folder: null, tags: [], totalReadTime: 0,
            pageProgress: { current: 0, total: 0 },
            sectionProgress: { introduction: 0, methods: 0, results: 0, discussion: 0, conclusion: 0 },
            deadline: null,
            createdAt: new Date().toISOString().split('T')[0],
            lastReadAt: null
          };
        }
        if (lit) parsed.push(lit);
        logs.push('✔ ' + fname + ': ' + (lit.title || '(未命名)'));
      } catch (err) {
        logs.push('✘ ' + fname + ': ' + err.message);
      }
    }

    if (parsed.length === 0) {
      alert('未成功解析任何 PDF 文件');
      return;
    }

    // 增强：为每个 PDF 条目查询分区 / 影响因子（与单篇 DOI 保持一致）
    try {
      if (window.ImportExport.enrichWithJournalInfo) {
        parsed = await window.ImportExport.enrichWithJournalInfo(parsed,
          function (cur, tot, action, info) {
            updateImportProgress(action + '…', info || `(${cur}/${tot})`, cur, tot, logs);
          });
      }
    } catch (_ignore) { /* 失败则使用已解析数据继续 */ }

    const result = window.ImportExport.processBatchImport(
      parsed,
      appData.literature,
      { strategy: getDupStrategy() },
      function (cur, tot, action, info) {
        updateImportProgress('写入数据库…', action + '：' + (info || ''), cur, tot, logs);
      }
    );
    result.messages = (result.messages || []).concat(logs);
    finalizeImportResult(result, logs);
  } catch (e) {
    alert('PDF 文件夹导入失败：' + e.message);
  }
}

// ---------- 旧代码的兼容层（旧 BibTeX 函数作为回退） ----------

/** 简单 BibTeX 回退解析（当 window.ImportExport 不可用时使用） */
function fallbackParseBibTeX(text) {
  const results = [];
  const entries = text.match(/@\w+\{[^@]+/g) || [];
  entries.forEach(entry => {
    const getField = (name) => {
      const m = entry.match(new RegExp(name + '\\s*=\\s*\\{([^}]*?)\\}'));
      return m ? m[1] : '';
    };
    const title = getField('title');
    if (!title) return;
    results.push({
      title: title,
      authors: getField('author'),
      journal: getField('journal') || getField('booktitle'),
      year: parseInt(getField('year')) || 0,
      doi: getField('doi'),
      abstract: getField('abstract'),
      keywords: getField('keywords') ? getField('keywords').split(',').map(s => s.trim()).filter(Boolean) : []
    });
  });
  return results;
}

/** BibTeX 简单导入（旧逻辑的包装） */
function fallbackImportBibTeX(text) {
  const items = fallbackParseBibTeX(text);
  let added = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it.title) continue;
    appData.literature.push({
      id: typeof generateId === 'function' ? generateId() : 'id_' + Date.now() + '_' + i,
      title: sanitizeInput(it.title, 500),
      authors: sanitizeInput(it.authors, 500),
      journal: sanitizeInput(it.journal, 200),
      year: it.year || new Date().getFullYear(),
      doi: sanitizeInput(it.doi, 200),
      quartile: '', impactFactor: null,
      abstract: sanitizeInput(it.abstract, 10000),
      keywords: (it.keywords || []).map(k => sanitizeInput(k, 100)).filter(Boolean),
      status: 'unread', progress: 0, priority: 'medium',
      folder: null, tags: [], totalReadTime: 0,
      pageProgress: { current: 0, total: 0 },
      sectionProgress: { introduction: 0, methods: 0, results: 0, discussion: 0, conclusion: 0 },
      deadline: null,
      createdAt: new Date().toISOString().split('T')[0],
      lastReadAt: null
    });
    added++;
  }
  saveData();
  alert(`导入 ${added} 条`);
  closeModal('addLitModal');
  if (currentPage === 'library' && typeof renderLibrary === 'function') renderLibrary();
}



// ============================================================
// 文献 CRUD 操作
// ============================================================

/**
 * 保存新文献（从手动录入表单）
 * 验证输入数据并创建新的文献记录
 */
function saveLiterature() {
  const title = document.getElementById('lit-title').value.trim();
  if (!title) {
    alert(t('titleRequired'));
    return;
  }

  // ====== 重复文献检测（新增功能）======
  const doiValue = document.getElementById('lit-doi').value.trim().replace(/^https?:\/\//, '');
  const yearValue = parseInt(document.getElementById('lit-year').value);
  const authorsValue = document.getElementById('lit-authors').value.trim();
  const journalValue = document.getElementById('lit-journal').value.trim();

  // 构造临时条目用于 detectDuplicate
  const tentativeItem = {
    title: title,
    authors: authorsValue,
    journal: journalValue,
    year: (yearValue >= 1900 && yearValue <= 2100) ? yearValue : new Date().getFullYear(),
    doi: doiValue
  };

  let dupFound = null;
  if (window.ImportExport && typeof window.ImportExport.detectDuplicate === 'function') {
    dupFound = window.ImportExport.detectDuplicate(tentativeItem, appData.literature);
  }

  if (dupFound && dupFound.isDuplicate) {
    const existing = appData.literature[dupFound.index];
    const existingTitle = (existing && existing.title) ? existing.title : '(无标题)';
    const existingYear = (existing && existing.year) ? existing.year : '';
    const existingDOI = (existing && existing.doi) ? existing.doi : '';
    const existingAuthors = (existing && existing.authors) ? existing.authors : '';

    const details = [];
    details.push('⚠ 文献库中已存在该文献');
    details.push('');
    details.push('匹配方式：' + (dupFound.reason || '重复'));
    details.push('');
    details.push('—— 已存在文献 ——');
    details.push('标题：' + existingTitle);
    if (existingYear) details.push('年份：' + existingYear);
    if (existingAuthors) details.push('作者：' + existingAuthors);
    if (existingDOI) details.push('DOI：' + existingDOI);
    details.push('');
    details.push('是否仍然要添加？（将创建重复条目）');

    const confirmMsg = details.join('\n');
    const userChoice = confirm(confirmMsg);
    if (!userChoice) {
      // 用户取消：关闭弹窗并刷新
      closeModal('addLitModal');
      if (currentPage === 'library' && typeof renderLibrary === 'function') renderLibrary();
      return;
    }
  }
  // ====== 重复文献检测 END ======

  // 处理关键词和标签
  const kw = document.getElementById('lit-keywords').value
    .split(',').map(s => s.trim()).filter(Boolean).filter(k => k.length <= 100);
  const tg = document.getElementById('lit-tags').value
    .split(',').map(s => s.trim()).filter(Boolean).filter(t => t.length <= 50);
  
  // 验证页数
  const pages = Math.min(Math.max(0, parseInt(document.getElementById('lit-pages').value) || 0), 9999);

  // 验证年份
  const yearVal = parseInt(document.getElementById('lit-year').value);
  const year = (yearVal >= 1900 && yearVal <= 2100) ? yearVal : new Date().getFullYear();

  // 验证影响因子
  const ifVal = document.getElementById('lit-if').value;
  const impactFactor = parseFloat(ifVal) || null;
  if (impactFactor !== null && (impactFactor < 0 || impactFactor > 1000)) impactFactor = null;

  // 创建新文献对象
  const newLit = {
    id: generateId(),
    title: sanitizeInput(title, 500),
    authors: sanitizeInput(document.getElementById('lit-authors').value, 500),
    journal: sanitizeInput(document.getElementById('lit-journal').value, 200),
    year: year,
    doi: sanitizeInput(document.getElementById('lit-doi').value, 200).replace(/^https?:\/\//, ''),
    quartile: sanitizeInput(document.getElementById('lit-quartile').value, 10),
    impactFactor: impactFactor,
    abstract: sanitizeInput(document.getElementById('lit-abstract').value, 10000),
    keywords: kw,
    status: 'unread',
    progress: 0,
    priority: ['high', 'medium', 'low'].includes(document.getElementById('lit-priority').value)
      ? document.getElementById('lit-priority').value
      : 'medium',
    folder: document.getElementById('lit-folder').value || null,
    tags: tg,
    totalReadTime: 0,
    pageProgress: { current: 0, total: pages },
    sectionProgress: {
      introduction: 0,
      methods: 0,
      results: 0,
      discussion: 0,
      conclusion: 0
    },
    deadline: document.getElementById('lit-deadline').value || null,
    createdAt: new Date().toISOString().split('T')[0],
    lastReadAt: null
  };

  // 将新标签添加到全局列表
  tg.forEach(t => {
    if (!appData.tags.includes(t)) appData.tags.push(t);
  });

  // 保存数据
  appData.literature.push(newLit);
  saveData();
  closeModal('addLitModal');

  // 刷新当前页面
  if (currentPage === 'library') renderLibrary();
  else if (currentPage === 'dashboard') renderDashboard();
}

/**
 * 更新文献字段
 * @param {string} id 文献ID
 * @param {string} field 字段名
 * @param {*} value 新值
 */
function updateLitField(id, field, value) {
  const lit = appData.literature.find(l => l.id === id);
  if (!lit) return;

  lit[field] = value;
  
  // 如果是进度或状态变更，更新最后阅读时间
  if (field === 'progress' || field === 'status') {
    lit.lastReadAt = new Date().toISOString().split('T')[0];
  }

  saveData();
  syncProgressUI(lit);
}

/**
 * 更新页码进度
 * @param {string} id 文献ID
 * @param {number} current 当前页码
 * @param {number} total 总页数
 */
function updatePageProgress(id, current, total) {
  const lit = appData.literature.find(l => l.id === id);
  if (!lit) return;

  lit.pageProgress = { current, total };
  if (total > 0) {
    lit.progress = Math.round(current / total * 100);
  }
  lit.lastReadAt = new Date().toISOString().split('T')[0];
  saveData();
  syncProgressUI(lit);
}

/**
 * 实时更新页码进度显示（不保存到存储）
 * @param {string} id 文献ID
 * @param {number} current 当前页码
 * @param {number} total 总页数
 */
function updatePageProgressLive(_id, current, total) {
  if (total > 0) {
    const pct = Math.round(current / total * 100);
    const label = document.getElementById('overallProgressLabel');
    const slider = document.getElementById('overallProgressSlider');
    if (label) label.textContent = pct + '%';
    if (slider) slider.value = pct;
  }
}

/**
 * 更新IMRAD章节进度
 * @param {string} id 文献ID
 * @param {string} section 章节名称
 * @param {number} value 进度百分比
 */
function updateSectionProgress(id, section, value) {
  const lit = appData.literature.find(l => l.id === id);
  if (!lit || !lit.sectionProgress) return;

  lit.sectionProgress[section] = Math.min(100, Math.max(0, value));

  // 从所有章节重新计算整体进度
  const vals = Object.values(lit.sectionProgress);
  lit.progress = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  lit.lastReadAt = new Date().toISOString().split('T')[0];
  saveData();
  syncProgressUI(lit);
}

/**
 * 实时更新章节进度显示（不保存到存储）
 * @param {string} id 文献ID
 * @param {string} section 章节名称
 * @param {number} value 进度百分比
 */
function updateSectionProgressLive(_id, section, value) {
  // 更新对应章节的标签
  const label = document.getElementById('sectionLabel_' + section);
  if (label) label.textContent = value + '%';

  // 重新计算整体预览
  let total = 0, count = 0;
  const sections = ['introduction', 'methods', 'results', 'discussion', 'conclusion'];
  sections.forEach(s => {
    const sl = document.getElementById('sectionSlider_' + s);
    if (sl) {
      total += parseInt(sl.value) || 0;
      count++;
    }
  });

  if (count > 0) {
    const pct = Math.round(total / count);
    const overallLabel = document.getElementById('overallProgressLabel');
    const overallSlider = document.getElementById('overallProgressSlider');
    if (overallLabel) overallLabel.textContent = pct + '%';
    if (overallSlider) overallSlider.value = pct;
  }
}

/**
 * 同步详情页面上的所有进度指示器
 * @param {Object} lit 文献对象
 */
function syncProgressUI(lit) {
  if (!lit) return;

  const overallLabel = document.getElementById('overallProgressLabel');
  const overallSlider = document.getElementById('overallProgressSlider');

  if (overallLabel) overallLabel.textContent = lit.progress + '%';
  if (overallSlider) overallSlider.value = lit.progress;

  // 同步页码进度
  const pageInput = document.getElementById('pageProgressInput');
  if (pageInput && lit.pageProgress) pageInput.value = lit.pageProgress.current;
}

/**
 * 删除文献
 * 同时删除关联的所有笔记
 * @param {string} id 文献ID
 */
function deleteLiterature(id) {
  if (!confirm(t('deleteConfirm'))) return;

  appData.literature = appData.literature.filter(l => l.id !== id);
  appData.notes = appData.notes.filter(n => n.litId !== id);

  saveData();
  switchPage('library');
}

// ============================================================
// 文献编辑模态框
// ============================================================

/**
 * 打开编辑文献信息模态框
 * 动态生成包含所有可编辑字段的模态框
 * @param {string} litId 文献ID
 */
function openEditLitModal(litId) {
  const lit = appData.literature.find(l => l.id === litId);
  if (!lit) return;

  const safeId = escapeAttr(litId);

  // 构建编辑模态框HTML
  const modalHtml = `
  <div id="editLitModal" class="modal-overlay open">
    <div class="modal" style="max-width:560px;">
      <div class="modal-header">
        <h3 style="font-size:17px;font-weight:600;">${escapeHtml(t('editMetadata'))}</h3>
        <button class="btn-icon" id="closeEditLitBtn">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="modal-body" style="max-height:70vh;overflow-y:auto;">
        <div class="form-group"><label class="form-label">${escapeHtml(t('titleField'))}</label><input class="input" id="edit-title" value="${escapeAttr(lit.title)}"></div>
        
        <div class="form-group"><label class="form-label">${escapeHtml(t('authorsField'))}</label><input class="input" id="edit-authors" value="${escapeAttr(lit.authors || '')}"></div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group"><label class="form-label">${escapeHtml(t('journalField'))}</label><input class="input" id="edit-journal" value="${escapeAttr(lit.journal || '')}"></div>
          <div class="form-group"><label class="form-label">${escapeHtml(t('yearField'))}</label><input class="input" type="number" id="edit-year" value="${escapeAttr(String(lit.year || ''))}"></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group"><label class="form-label">${escapeHtml(t('doiField'))}</label><input class="input" id="edit-doi" value="${escapeAttr(lit.doi || '')}"></div>
          <div class="form-group"><label class="form-label">${escapeHtml(t('quartileField'))}">
            <select class="input" id="edit-quartile">
              <option value="">—</option>
              ${['Q1', 'Q2', 'Q3', 'Q4'].map(q => '<option value="' + escapeAttr(q) + '"' + (lit.quartile === q ? ' selected' : '') + '>' + escapeHtml(q) + '</option>').join('')}
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group"><label class="form-label">${escapeHtml(t('impactFactorField'))}</label><input class="input" type="number" step="0.01" id="edit-if" value="${escapeAttr(String(lit.impactFactor || ''))}"></div>
          <div class="form-group"><label class="form-label">${escapeHtml(t('pagesLabel'))}</label><input class="input" type="number" id="edit-pages" value="${escapeAttr(lit.pageProgress ? String(lit.pageProgress.total) : '')}"></div>
        </div>

        <div class="form-group"><label class="form-label">${escapeHtml(t('abstractField'))}</label><textarea class="input" id="edit-abstract" rows="4" style="resize:vertical;">${escapeHtml(lit.abstract || '')}</textarea></div>
        
        <div class="form-group"><label class="form-label">${escapeHtml(t('keywordsField'))}</label><input class="input" id="edit-keywords" value="${escapeAttr((lit.keywords || []).join(', '))}"></div>
        
        <div class="form-group"><label class="form-label">${escapeHtml(t('tagsField'))}</label><input class="input" id="edit-tags" value="${escapeAttr((lit.tags || []).join(', '))}"></div>
        
        <div class="form-group"><label class="form-label">${escapeHtml(t('folderField'))}">
          <select class="input" id="edit-folder">
            <option value="">—</option>
            ${appData.folders.map(f => '<option value="' + escapeAttr(f.id) + '"' + (lit.folder === f.id ? ' selected' : '') + '>' + escapeHtml(f.name) + '</option>').join('')}
          </select>
        </div>
      </div>

      <div style="padding:12px 20px;display:flex;justify-content:flex-end;gap:8px;border-top:1px solid var(--border-color);">
        <button class="btn btn-secondary" id="cancelEditLitBtn">${escapeHtml(t('cancel'))}</button>
        <button class="btn btn-primary" id="saveEditLitBtn" data-lit-id="${safeId}">${escapeHtml(t('save'))}</button>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // 附加事件监听器
  attachEditLitModalListeners();
}

/**
 * 为编辑文献模态框附加事件监听器
 */
function attachEditLitModalListeners() {
  // 点击遮罩关闭
  const overlay = document.getElementById('editLitModal');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  // 关闭按钮
  const closeBtn = document.getElementById('closeEditLitBtn');
  if (closeBtn) closeBtn.addEventListener('click', () => {
    var m = document.getElementById('editLitModal');
    if (m) m.remove();
  });

  // 取消按钮
  const cancelBtn = document.getElementById('cancelEditLitBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', () => {
    var m = document.getElementById('editLitModal');
    if (m) m.remove();
  });

  // 保存按钮
  const saveBtn = document.getElementById('saveEditLitBtn');
  if (saveBtn) saveBtn.addEventListener('click', function () {
    saveEditLit(this.dataset.litId);
  });
}

/**
 * 保存编辑后的文献信息
 * @param {string} litId 文献ID
 */
function saveEditLit(litId) {
  const lit = appData.literature.find(l => l.id === litId);
  if (!lit) return;

  const title = (document.getElementById('edit-title').value || '').trim();
  if (!title) {
    alert(t('titleRequired'));
    return;
  }

  // 使用 sanitizeInput 清理输入
  lit.title = sanitizeInput(title, 500);
  lit.authors = sanitizeInput(document.getElementById('edit-authors').value, 500);
  lit.journal = sanitizeInput(document.getElementById('edit-journal').value, 200);

  const yr = parseInt(document.getElementById('edit-year').value);
  lit.year = (yr >= 1900 && yr <= 2100) ? yr : lit.year;

  lit.doi = sanitizeInput(document.getElementById('edit-doi').value, 200).replace(/^https?:\/\//, '');

  const qVal = sanitizeInput(document.getElementById('edit-quartile').value, 10);
  lit.quartile = ['Q1', 'Q2', 'Q3', 'Q4'].includes(qVal) ? qVal : null;

  const ifV = parseFloat(document.getElementById('edit-if').value);
  lit.impactFactor = (!isNaN(ifV) && ifV >= 0 && ifV <= 1000) ? ifV : null;

  lit.abstract = sanitizeInput(document.getElementById('edit-abstract').value, 10000);
  lit.keywords = (document.getElementById('edit-keywords').value || '').split(',').map(s => s.trim()).filter(Boolean).filter(k => k.length <= 100);
  lit.tags = (document.getElementById('edit-tags').value || '').split(',').map(s => s.trim()).filter(Boolean).filter(t => t.length <= 50);
  lit.folder = document.getElementById('edit-folder').value || null;

  const newPages = parseInt(document.getElementById('edit-pages').value) || 0;
  if (newPages > 0) {
    lit.pageProgress = {
      current: lit.pageProgress ? lit.pageProgress.current : 0,
      total: newPages
    };
  }

  // 将新标签添加到全局列表
  (lit.tags || []).forEach(tg => {
    if (!appData.tags.includes(tg)) appData.tags.push(tg);
  });

  saveData();

  // 关闭模态框并刷新页面
  const modal = document.getElementById('editLitModal');
  if (modal) modal.remove();
  renderDetailPage(litId);
}

// ============================================================
// DOI 获取 - 多源并行查询
// ============================================================

/**
 * 多源文献元数据查询配置
 * 优先级：CrossRef > Semantic Scholar > OpenAlex
 */
// ============================================================
// 中文 DOI 支持：多源元数据查询（新版
// ============================================================

function isChineseDOI(doi) {
  if (window.DOIClient && typeof window.DOIClient.isChineseDOI === 'function')
    return window.DOIClient.isChineseDOI(doi);
  if (!doi) return false;
  var d = String(doi).toLowerCase().trim();
  var prefixes = ['10.3969', '10.3724', '10.13209', '10.13345', '10.13873', '10.11936', '10.13368', '10.12310'];
  return prefixes.some(function (prefix) { return d.indexOf(prefix) === 0; });
}





/**
 * 通过 DOI 获取文献元数据（通过 DOIClient 共享模块）。
 * - 中文 DOI 自动调整数据源优先级
 * - 失败时提供手动输入表单
 * - 自动补充期刊 IF / 分区（通过 DOIClient.fetchJournalInfo）
 * - 自动查重
 */
async function fetchDOI() {
  const doi = document.getElementById('doiInput').value.trim();
  if (!doi) return;

  const cleanDOI = doi.replace(/^https?:\/\//, '').replace(/^doi:\s*/i, '').trim();

  // UI：禁用按钮，显示状态
  const btn = document.getElementById('fetchDoiBtn');
  const statusEl = document.getElementById('doiFetchStatus');
  if (btn) { btn.disabled = true; btn.textContent = '查询中...'; }

  try {
    const chinese = isChineseDOI(cleanDOI);
    if (statusEl) statusEl.textContent = chinese ? '中文 DOI，正在查询多源数据...' : '查询 CrossRef, OpenAlex, Semantic Scholar...';

    // 调用 DOIClient 共享模块
    var mailto = (window.appData && window.appData.settings && window.appData.settings.doiEmail) || 'scholarflow@example.com';
    var cnkiToken = (window.appData && window.appData.settings && window.appData.settings.cnkiToken) || '';

    var meta = null;
    if (window.DOIClient) {
      meta = await window.DOIClient.fetchDOIMetadata(cleanDOI, { mailto: mailto, cnkiToken: cnkiToken });
    }

    if (!meta) {
      alert('未能从任何数据源获取文献信息，请手动填写。\n提示：若为中文核心期刊 DOI（如 10.3969/...），可能需要在设置中配置 CNKI Token。');
      return;
    }

    if (statusEl) {
      statusEl.textContent = (chinese ? '中文期刊查询完成' : '查询完成') + '（标题: ' + (meta.title || '').substring(0, 30) + '）';
    }

    // 填充表单字段
    if (document.getElementById('lit-title')) document.getElementById('lit-title').value = meta.title || '';
    if (document.getElementById('lit-year')) document.getElementById('lit-year').value = meta.year || '';
    if (document.getElementById('lit-authors')) document.getElementById('lit-authors').value = meta.authors || '';
    if (document.getElementById('lit-journal')) document.getElementById('lit-journal').value = meta.journal || '';
    if (document.getElementById('lit-abstract')) document.getElementById('lit-abstract').value = meta.abstract || '';
    if (document.getElementById('lit-volume')) document.getElementById('lit-volume').value = meta.volume || '';
    if (document.getElementById('lit-issue')) document.getElementById('lit-issue').value = meta.issue || '';
    if (document.getElementById('lit-pages')) document.getElementById('lit-pages').value = meta.pages || '';
    if (document.getElementById('lit-doi')) document.getElementById('lit-doi').value = cleanDOI;

    // 补充查询期刊 IF / 分区
    if (meta.journal && window.DOIClient) {
      try {
        const jinfo = await window.DOIClient.fetchJournalInfo(meta.journal, null, mailto);
        if (jinfo) {
          if (document.getElementById('lit-if') && jinfo.impactFactor != null) {
            document.getElementById('lit-if').value = jinfo.impactFactor;
          }
          if (document.getElementById('lit-quartile') && jinfo.quartile) {
            document.getElementById('lit-quartile').value = jinfo.quartile;
          }
          if (statusEl) {
            statusEl.textContent += ' | 期刊信息补充完成';
          }
        }
      } catch (err) {
        console.warn('[fetchDOI] 期刊指标查询失败:', err);
      }
    }

    // 关键词/标签合并（若表单有关键词字段）
    if (document.getElementById('lit-keywords') && Array.isArray(meta.allTags)) {
      document.getElementById('lit-keywords').value = meta.allTags.slice(0, 10).join('; ');
    }

    // ====== DOI 重复文献检测
    if (window.ImportExport && typeof window.ImportExport.detectDuplicate === 'function') {
      var dupCheckItem = { title: meta.title || '', authors: meta.authors || '', doi: cleanDOI || '' };
      var dupResult = window.ImportExport.detectDuplicate(dupCheckItem, window.appData.literature);
      if (dupResult.isDuplicate) {
        if (statusEl) {
          statusEl.textContent = '⚠ 文献库中已存在该文献（' + (dupResult.reason || '重复') + '）';
          statusEl.style.color = '#ff8800';
          statusEl.style.fontWeight = 'bold';
        }
        alert('⚠ 提醒：文献库中已存在该文献！\n匹配方式：' + (dupResult.reason || '重复') + '\n\n您可以修改表单后点击保存以手动确认。');
      }
    }
  } catch (err) {
    console.error('[fetchDOI]', err);
    alert('查询失败，请检查网络或手动填写');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '查询';
    }
  }
}

/**
 * 填充文献表单
 */
function fillLiteratureForm(data, doi) {
  // 基础字段
  if (data.title) document.getElementById('lit-title').value = data.title;
  if (data.authors) document.getElementById('lit-authors').value = data.authors;
  if (data.journal) document.getElementById('lit-journal').value = data.journal;
  if (data.year) document.getElementById('lit-year').value = data.year;
  if (doi) document.getElementById('lit-doi').value = doi;

  // 摘要（优先使用最长的）
  if (data.abstract) {
    document.getElementById('lit-abstract').value = data.abstract;
  }

  // 页数计算
  if (data.pages) {
    const parts = String(data.pages).split('-');
    if (parts.length === 2) {
      const totalP = parseInt(parts[1]) - parseInt(parts[0]) + 1;
      if (totalP > 0 && totalP < 9999) {
        document.getElementById('lit-pages').value = totalP;
      }
    }
  }

  // 合并所有主题/关键词/概念（支持 CNKI keywords + CrossRef subjects + OpenAlex concepts + Semantic fieldsOfStudy）
  const allTags = [...new Set([
    ...(Array.isArray(data.keywords) ? data.keywords : []),
    ...(Array.isArray(data.subjects) ? data.subjects : []),
    ...(Array.isArray(data.fieldsOfStudy) ? data.fieldsOfStudy : []),
    ...(Array.isArray(data.concepts) ? data.concepts : [])
  ])].filter(Boolean);

  if (allTags.length > 0) {
    const tagsStr = allTags.join(', ');
    const tagsEl = document.getElementById('lit-tags');
    const kwEl = document.getElementById('lit-keywords');
    
    if (tagsEl) tagsEl.value = tagsStr;
    if (kwEl) kwEl.value = tagsStr;
  }

  // 影响因子提示（如果有引用数据）
  if (data.citationCount > 0 || data.influentialCitationCount > 0) {
    console.log(`[fetchDOI] 引用数: ${data.citationCount}, 高影响力引用: ${data.influentialCitationCount}`);
  }
}

/**
 * 通过 OpenAlex Sources API 查询期刊信息（使用 DOIClient 共享模块）
 * @param {string} journalName - 期刊名称
 * @param {AbortSignal} signal - 中止信号（兼容旧签名，实际在 DOIClient 内部使用）
 */
async function fetchJournalInfo(journalName, signal) {
  if (!journalName) return null;
  if (!window.DOIClient) return null;
  try {
    var mailto = (window.appData && window.appData.settings && window.appData.settings.doiEmail) || 'scholarflow@example.com';
    return await window.DOIClient.fetchJournalInfo(journalName, signal, mailto);
  } catch (err) {
    console.warn('[fetchJournalInfo]', err.message);
    return null;
  }
}

// ============================================================
// BibTeX 导入
// ============================================================

/**
 * 兼容旧入口 importBibTeX() — 现在转发到新的文本导入函数
 */
function importBibTeX() {
  if (typeof importFromText === 'function') return importFromText();
  fallbackImportBibTeX(document.getElementById('bibtex-input') ? document.getElementById('bibtex-input').value : '');
}

// ============================================================
// 笔记 CRUD 操作
// ============================================================

/**
 * 打开新建笔记模态框
 * @param {string} litId 关联的文献ID
 */
function openNewNoteModal(litId) {
  const safeLitId = escapeAttr(litId);

  document.getElementById('noteModalTitle').textContent = t('newNoteTitle');

  document.getElementById('noteEditForm').innerHTML = `
    <div class="form-group"><label class="form-label">${escapeHtml(t('noteTitle'))}</label><input type="text" class="input" id="note-title" value=""></div>
    
    <div class="form-group">
      <label class="form-label">${escapeHtml(t('template'))}</label>
      <select class="input" id="note-template">
        <option value="">${escapeHtml(t('tplBlank'))}</option>
        <option value="innovation">${escapeHtml(t('tplInnovation'))}</option>
        <option value="research_method">${escapeHtml(t('tplMethod'))}</option>
        <option value="critique">${escapeHtml(t('tplCritique'))}</option>
      </select>
    </div>
    
    <div class="form-group"><label class="form-label">${escapeHtml(t('contentMd'))}</label><textarea class="input" id="note-content" rows="12" style="font-family:'JetBrains Mono',monospace;font-size:13px;"></textarea></div>
    <div class="form-group"><label class="form-label">${escapeHtml(t('tagsComma'))}</label><input type="text" class="input" id="note-tags"></div>
    
    <div class="modal-footer" style="padding:16px 0 0;">
      <button class="btn btn-secondary" id="cancelNewNoteBtn">${escapeHtml(t('cancel'))}</button>
      <button class="btn btn-primary" id="saveNewNoteBtn" data-lit-id="${safeLitId}">${escapeHtml(t('saveNote'))}</button>
    </div>
  `;

  // 附加事件监听器
  document.getElementById('cancelNewNoteBtn').addEventListener('click', () => closeModal('noteEditModal'));
  document.getElementById('saveNewNoteBtn').addEventListener('click', function () {
    saveNote(null, this.dataset.litId);
  });

  // 模板选择
  const tplSel = document.getElementById('note-template');
  if (tplSel) tplSel.addEventListener('change', function () {
    applyNoteTemplate(this.value);
  });

  openModal('noteEditModal');
}

/**
 * 打开编辑笔记模态框
 * @param {string} noteId 笔记ID
 */
function openEditNoteModal(noteId) {
  const note = appData.notes.find(n => n.id === noteId);
  if (!note) return;

  const safeId = escapeAttr(noteId);

  document.getElementById('noteModalTitle').textContent = t('editNote');

  document.getElementById('noteEditForm').innerHTML = `
    <div class="form-group"><label class="form-label">${escapeHtml(t('noteTitle'))}</label><input type="text" class="input" id="note-title" value="${escapeHtml(note.title)}"></div>
    <div class="form-group"><label class="form-label">${escapeHtml(t('contentMd'))}</label><textarea class="input" id="note-content" rows="12" style="font-family:'JetBrains Mono',monospace;font-size:13px;">${escapeHtml(note.content || '')}</textarea></div>
    <div class="form-group"><label class="form-label">${escapeHtml(t('tagsComma'))}</label><input type="text" class="input" id="note-tags" value="${escapeHtml((note.tags || []).join(', '))}"></div>
    <div class="modal-footer" style="padding:16px 0 0;">
      <button class="btn" style="color:#d4354f;margin-right:auto;" id="deleteNoteBtn">${escapeHtml(t('delete'))}</button>
      <button class="btn btn-secondary" id="cancelNoteBtn">${escapeHtml(t('cancel'))}</button>
      <button class="btn btn-primary" id="saveNoteBtn">${escapeHtml(t('save'))}</button>
    </div>
  `;

  // 附加事件监听器
  document.getElementById('deleteNoteBtn').addEventListener('click', () => deleteNote(safeId));
  document.getElementById('cancelNoteBtn').addEventListener('click', () => closeModal('noteEditModal'));
  document.getElementById('saveNoteBtn').addEventListener('click', () => saveNote(safeId, note.litId));

  openModal('noteEditModal');
}

/**
 * 应用笔记模板
 * 根据选择的模板类型填充笔记内容
 * @param {string} tpl 模板类型标识
 */
function applyNoteTemplate(tpl) {
  const ta = document.getElementById('note-content');
  if (!ta) return;

  // 模板定义
  const templates = {
    innovation: '## 核心创新点\n\n\n## 研究方法\n\n\n## 实验结论\n\n\n## 可复用价值\n\n\n## 个人思考\n',
    research_method: '## 研究方法\n\n\n## 关键公式/算法\n\n\n## 实验设置\n\n\n## 结果分析\n\n\n## 局限性\n\n\n## 个人思考\n',
    critique: '## 主要贡献\n\n\n## 优点\n\n\n## 缺点/局限\n\n\n## 与其他工作的关系\n\n\n## 未来方向\n\n\n## 引用金句\n'
  };

  if (templates[tpl]) ta.value = templates[tpl];
}

/**
 * 保存笔记（新建或更新）
 * @param {string|null} noteId 笔记ID，null表示新建
 * @param {string} litId 关联的文献ID
 */
function saveNote(noteId, litId) {
  const rawTitle = (document.getElementById('note-title').value || '').trim();
  const content = (document.getElementById('note-content').value || '');
  const tags = (document.getElementById('note-tags').value || '').split(',').map(s => s.trim()).filter(Boolean).filter(t => t.length <= 50);

  if (!rawTitle) {
    alert(t('titleRequired'));
    return;
  }

  // 清理输入
  const title = rawTitle.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  if (title.length > 500) return alert(t('titleRequired'));

  const safeContent = typeof content === 'string' ? content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') : '';

  if (noteId) {
    // 更新现有笔记
    const note = appData.notes.find(n => n.id === noteId);
    if (note) {
      note.title = title;
      note.content = safeContent;
      note.tags = tags;
      note.updatedAt = new Date().toISOString().split('T')[0];
    }
  } else {
    // 创建新笔记
    appData.notes.push({
      id: generateId(),
      litId,
      title: title,
      template: '',
      content: safeContent,
      tags,
      highlights: [],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    });
  }

  saveData();
  closeModal('noteEditModal');

  // 刷新当前页面
  if (currentPage === 'detail' && currentDetailId) renderDetailPage(currentDetailId);
  else if (currentPage === 'notes') renderNotesPage();
}

/**
 * 删除笔记
 * @param {string} noteId 笔记ID
 */
function deleteNote(noteId) {
  if (!confirm(t('deleteNoteConfirm'))) return;

  appData.notes = appData.notes.filter(n => n.id !== noteId);
  saveData();
  closeModal('noteEditModal');

  if (currentPage === 'detail' && currentDetailId) renderDetailPage(currentDetailId);
  else if (currentPage === 'notes') renderNotesPage();
}

// ============================================================
// 标签管理
// ============================================================

/**
 * 删除标签
 * 从全局标签列表及所有关联文献和笔记中移除该标签
 * @param {string} tagName 要删除的标签名
 */
function deleteTag(tagName) {
  // 计算关联文献数量
  const litCount = appData.literature.filter(l => (l.tags || []).includes(tagName)).length;

  // 构建确认消息
  const msg = currentLang === 'zh'
    ? `确定删除标签「${tagName}」吗？该标签关联了 ${litCount} 篇文献，删除后将从所有文献中移除。`
    : `Delete tag "${tagName}"? It is linked to ${litCount} paper(s) and will be removed from all literature.`;

  if (!confirm(msg)) return;

  // 从全局列表移除
  appData.tags = appData.tags.filter(t => t !== tagName);

  // 从所有文献中移除
  appData.literature.forEach(l => {
    if (l.tags) l.tags = l.tags.filter(t => t !== tagName);
  });

  // 从所有笔记中移除
  appData.notes.forEach(n => {
    if (n.tags) n.tags = n.tags.filter(t => t !== tagName);
  });

  saveData();
  renderSettingsPage();
}

// ============================================================
// 数据导出功能
// ============================================================

/**
 * 导出单个笔记为Markdown文件
 * @param {string} noteId 笔记ID
 */
function exportNote(noteId) {
  const note = appData.notes.find(n => n.id === noteId);
  if (!note) return;

  const lit = appData.literature.find(l => l.id === note.litId);

  let md = `# ${note.title}\n\n`;
  if (lit) md += `> Paper: ${lit.title}\n> Authors: ${lit.authors}\n\n`;
  md += note.content;

  downloadFile(note.title + '.md', md, 'text/markdown');
}

/**
 * 导出全部笔记为Markdown文件
 */
function exportAllNotes() {
  let md = '# ScholarFlow - All Notes\n\n';

  appData.notes.forEach(n => {
    const lit = appData.literature.find(l => l.id === n.litId);
    md += `---\n\n## ${n.title}\n\n`;
    if (lit) md += `> Paper: ${lit.title}\n\n`;
    md += n.content + '\n\n';
  });

  downloadFile('ScholarFlow_Notes_' + new Date().toISOString().split('T')[0] + '.md', md, 'text/markdown');
}

/**
 * 导出完整数据备份为JSON文件
 */
function exportFullBackup() {
  downloadFile(
    'ScholarFlow_Backup_' + new Date().toISOString().split('T')[0] + '.json',
    JSON.stringify(appData, null, 2),
    'application/json'
  );
}

/**
 * 导出所有文献（v1.4 多格式支持）
 * @param {string} [format] 导出格式：bibtex / ris / endnote / csv / json / text，默认 bibtex
 */
function exportBibTeX(format) {
  const fmt = format || 'bibtex';
  const today = new Date().toISOString().split('T')[0];
  const items = appData.literature;

  // 使用新的多格式导出器（若可用）
  if (window.ImportExport && window.ImportExport.exportByFormat) {
    const exportKey = ({
      bibtex: 'bibtex',
      ris: 'ris',
      endnote: 'endnote',
      csv: 'csv',
      json: 'json',
      text: 'text'
    })[fmt] || 'bibtex';
    const result = window.ImportExport.exportByFormat(items, exportKey);
    downloadFile('ScholarFlow_' + today + '.' + result.ext, result.content, result.mime || 'text/plain');
    return;
  }

  // 回退：旧的简单 BibTeX 格式
  let bib = '';
  if (items && items.forEach) {
    items.forEach(l => {
      const key = (l.authors ? l.authors.split(',')[0].trim().split(' ').pop() : 'ref') + l.year;
      bib += `@article{${key},\n  title={${l.title}},\n  author={${l.authors}},\n  journal={${l.journal}},\n  year=${l.year},\n  doi=${l.doi || ''}\n}\n\n`;
    });
  }
  downloadFile('ScholarFlow_' + today + '.bib', bib, 'text/plain');
}

// ============================================================
// 数据导入功能
// ============================================================

/**
 * 导入JSON备份文件
 * 替换当前所有数据为备份中的数据
 * 安全修复 [SEC-006]: 添加深度验证防止原型污染和恶意数据注入
 * @param {Event} event 文件选择事件
 */
function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);

      // 深度验证：确保数据结构正确，防止原型污染
      if (!data || typeof data !== 'object') throw new Error('Invalid');
      if (!Array.isArray(data.literature)) throw new Error('Invalid');
      if (!Array.isArray(data.notes)) throw new Error('Invalid');

      // 使用结构化重建，仅提取已知的安全字段，避免 __proto__ 等原型污染
      const cleanData = {
        literature: data.literature,
        notes: data.notes,
        tags: Array.isArray(data.tags) ? data.tags : [],
        folders: Array.isArray(data.folders) ? data.folders : [],
        readingSessions: Array.isArray(data.readingSessions) ? data.readingSessions : [],
        goals: (data.goals && typeof data.goals === 'object') ? data.goals : { daily: 2, weekly: 10, weeklyHours: 10, monthlyHours: 20 },
        settings: (data.settings && typeof data.settings === 'object') ? data.settings : { theme: 'light', noteTemplates: [] }
      };

      appData = cleanData;
      saveData();
      alert(t('backupSuccess'));
      switchPage(currentPage);
    } catch (err) {
      alert(t('backupError'));
    }
  };

  reader.readAsText(file);
}

// ============================================================
// 阅读计时器
// ============================================================

/** 当前激活的计时器对应的文献ID */
let activeTimer = null;

/** 计时器间隔引用 */
let timerInterval = null;

/** 计时器开始时间戳 */
let timerStart = null;

/**
 * 切换阅读计时器的开始/停止状态
 * @param {string} litId 文献ID
 */
function toggleReadingTimer(litId) {
  const btn = document.getElementById('timerBtn-' + litId);
  if (!btn) return;

  if (activeTimer === litId) {
    // 停止计时器
    clearInterval(timerInterval);

    // 计算经过的时间（分钟）
    const elapsed = Math.round((Date.now() - timerStart) / 60000);

    if (elapsed > 0) {
      // 更新文献阅读时长和会话记录
      const lit = appData.literature.find(l => l.id === litId);
      if (lit) {
        lit.totalReadTime += elapsed;
        lit.lastReadAt = new Date().toISOString().split('T')[0];
      }
      appData.readingSessions.push({
        date: new Date().toISOString().split('T')[0],
        minutes: elapsed,
        litId
      });
      saveData();
    }

    activeTimer = null;
    timerInterval = null;
    timerStart = null;

    // 恢复按钮样式
    btn.innerHTML = `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> ${t('startReading')}`;
    btn.classList.remove('btn-secondary');
    btn.classList.add('btn-primary');
    btn.style.borderColor = '';
    btn.style.color = '';
  } else {
    // 开始计时（先停止其他正在运行的计时器）
    if (activeTimer) toggleReadingTimer(activeTimer);

    activeTimer = litId;
    timerStart = Date.now();

    // 更新按钮样式为运行状态
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
    btn.style.borderColor = '#d4354f';
    btn.style.color = '#d4354f';

    // 更新计时器显示
    const updateTimer = () => {
      const m = Math.floor((Date.now() - timerStart) / 60000);
      const s = Math.floor(((Date.now() - timerStart) % 60000) / 1000);
      btn.innerHTML = `⏱ ${m}:${s.toString().padStart(2, '0')} — ${t('clickToStop')}`;
    };
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
  }
}

// ============================================================
// 模块导出
// ============================================================

if (typeof window !== 'undefined') {
  window.renderAddLitForm = renderAddLitForm;
  window.saveLiterature = saveLiterature;
  window.updateLitField = updateLitField;
  window.updatePageProgress = updatePageProgress;
  window.updatePageProgressLive = updatePageProgressLive;
  window.updateSectionProgress = updateSectionProgress;
  window.updateSectionProgressLive = updateSectionProgressLive;
  window.syncProgressUI = syncProgressUI;
  window.deleteLiterature = deleteLiterature;
  window.openEditLitModal = openEditLitModal;
  window.saveEditLit = saveEditLit;
  window.fetchDOI = fetchDOI;
  window.importBibTeX = importBibTeX;
  window.openNewNoteModal = openNewNoteModal;
  window.openEditNoteModal = openEditNoteModal;
  window.applyNoteTemplate = applyNoteTemplate;
  window.saveNote = saveNote;
  window.deleteNote = deleteNote;
  window.deleteTag = deleteTag;
  window.exportNote = exportNote;
  window.exportAllNotes = exportAllNotes;
  window.exportFullBackup = exportFullBackup;
  window.exportBibTeX = exportBibTeX;
  window.importBackup = importBackup;
  window.toggleReadingTimer = toggleReadingTimer;
  window.activeTimer = activeTimer;
}
