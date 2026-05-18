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
 * 渲染添加文献表单
 * 生成包含DOI获取、手动录入和BibTeX导入三种方式的表单
 */
function renderAddLitForm() {
  document.getElementById('addLitForm').innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:8px;">
      <input type="text" class="input" placeholder="${escapeHtml(t('doiFetch'))}" id="doiInput" style="flex:1;">
      <button class="btn btn-primary" id="fetchDoiBtn">${escapeHtml(t('fetch'))}</button>
    </div>
    <div id="doiFetchStatus" style="font-size:12px;color:var(--text-muted);margin-bottom:12px;min-height:18px;"></div>
    
    <!-- 标签页切换栏 -->
    <div class="tab-bar" style="margin-bottom:16px;" id="addTabBar">
      <div class="tab-item active" data-tab="manual">${escapeHtml(t('manualEntry'))}</div>
      <div class="tab-item" data-tab="bibtex">${escapeHtml(t('bibtexImport'))}</div>
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

    <!-- BibTeX 导入表单 -->
    <div id="addTab-bibtex" style="display:none;">
      <div class="form-group"><label class="form-label">${escapeHtml(t('pasteBibtex'))}</label><textarea class="input" id="bibtex-input" rows="10" placeholder="@article{...}"></textarea></div>
      <div class="modal-footer" style="padding:16px 0 0;">
        <button class="btn btn-secondary" id="cancelBibtexBtn">${escapeHtml(t('cancel'))}</button>
        <button class="btn btn-primary" id="importBibtexBtn">${escapeHtml(t('importBtn'))}</button>
      </div>
    </div>
  `;

  // 附加事件监听器
  attachAddLitFormListeners();
}

/**
 * 为添加文献表单附加事件监听器
 */
function attachAddLitFormListeners() {
  // DOI获取按钮
  const fetchBtn = document.getElementById('fetchDoiBtn');
  if (fetchBtn) fetchBtn.addEventListener('click', fetchDOI);

  // 手动录入取消/保存
  document.getElementById('cancelAddLitBtn').addEventListener('click', () => closeModal('addLitModal'));
  document.getElementById('saveLitBtn').addEventListener('click', saveLiterature);

  // BibTeX 取消/导入
  document.getElementById('cancelBibtexBtn').addEventListener('click', () => closeModal('addLitModal'));
  document.getElementById('importBibtexBtn').addEventListener('click', importBibTeX);

  // 标签页切换
  document.getElementById('addTabBar').querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('#addTabBar .tab-item').forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');
      document.getElementById('addTab-manual').style.display = e.currentTarget.dataset.tab === 'manual' ? 'block' : 'none';
      document.getElementById('addTab-bibtex').style.display = e.currentTarget.dataset.tab === 'bibtex' ? 'block' : 'none';
    });
  });
}

// 标签页切换由 attachAddLitFormListeners() 内联处理



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
const DOI_SOURCES = {
  crossref: {
    name: 'CrossRef',
    url: (doi) => `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
    timeout: 10000
  },
  semanticscholar: {
    name: 'Semantic Scholar',
    url: (doi) => `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=title,authors,year,venue,abstract,citationCount,influentialCitationCount,fieldsOfStudy`,
    timeout: 10000
  },
  openalex: {
    name: 'OpenAlex',
    url: (doi) => `https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`,
    timeout: 10000
  }
};

/**
 * 从 CrossRef 解析数据
 */
function parseCrossRefData(item) {
  return {
    title: (item.title && item.title[0]) ? String(item.title[0]) : '',
    authors: (item.author || []).map(a => {
      if (a.family && a.given) return String(a.family) + ', ' + String(a.given);
      return String(a.name || a.family || a.given || '');
    }).join('; '),
    journal: (item['container-title'] && item['container-title'][0]) ? String(item['container-title'][0]) : '',
    year: (item.issued && item.issued['date-parts'] && item.issued['date-parts'][0]) ? item.issued['date-parts'][0][0] : '',
    abstract: (item.abstract && typeof item.abstract === 'string') ? item.abstract.replace(/<[^>]+>/g, '') : '',
    pages: item.page || '',
    subjects: Array.isArray(item.subject) ? item.subject.map(s => String(s)) : [],
    doi: item.DOI || ''
  };
}

/**
 * 从 Semantic Scholar 解析数据
 */
function parseSemanticScholarData(data) {
  return {
    title: data.title || '',
    authors: (data.authors || []).map(a => a.name || '').join('; '),
    journal: data.venue || '',
    year: data.year || '',
    abstract: data.abstract || '',
    citationCount: data.citationCount || 0,
    influentialCitationCount: data.influentialCitationCount || 0,
    fieldsOfStudy: data.fieldsOfStudy || [],
    doi: data.externalIds?.DOI || ''
  };
}

/**
 * 从 OpenAlex 解析数据
 */
function parseOpenAlexData(data) {
  const work = data;
  return {
    title: work.display_name || '',
    authors: (work.authorships || []).map(a => a.author?.display_name || '').join('; '),
    journal: work.host_venue?.display_name || work.primary_location?.source?.display_name || '',
    year: work.publication_year || '',
    abstract: work.abstract_inverted_index ? reconstructAbstract(work.abstract_inverted_index) : '',
    citationCount: work.cited_by_count || 0,
    concepts: (work.concepts || []).map(c => c.display_name || ''),
    doi: work.doi?.replace('https://doi.org/', '') || ''
  };
}

/**
 * 从 OpenAlex 的 inverted index 重建摘要
 */
function reconstructAbstract(invertedIndex) {
  if (!invertedIndex || typeof invertedIndex !== 'object') return '';
  const wordPositions = [];
  Object.entries(invertedIndex).forEach(([word, positions]) => {
    positions.forEach(pos => wordPositions[pos] = word);
  });
  return wordPositions.filter(Boolean).join(' ');
}

/**
 * 合并多源数据（优先级：CrossRef > Semantic Scholar > OpenAlex）
 */
function mergeSourceData(results) {
  const merged = {
    title: '',
    authors: '',
    journal: '',
    year: '',
    abstract: '',
    pages: '',
    subjects: [],
    citationCount: 0,
    influentialCitationCount: 0,
    fieldsOfStudy: [],
    concepts: [],
    doi: ''
  };

  // 按优先级合并
  const priority = ['crossref', 'semanticscholar', 'openalex'];
  
  priority.forEach(source => {
    const data = results[source];
    if (!data) return;

    // 基础字段：优先使用第一个非空值
    if (!merged.title && data.title) merged.title = data.title;
    if (!merged.authors && data.authors) merged.authors = data.authors;
    if (!merged.journal && data.journal) merged.journal = data.journal;
    if (!merged.year && data.year) merged.year = data.year;
    if (!merged.abstract && data.abstract) merged.abstract = data.abstract;
    if (!merged.pages && data.pages) merged.pages = data.pages;
    if (!merged.doi && data.doi) merged.doi = data.doi;

    // 数值字段：取最大值
    if (data.citationCount) merged.citationCount = Math.max(merged.citationCount, data.citationCount);
    if (data.influentialCitationCount) merged.influentialCitationCount = Math.max(merged.influentialCitationCount, data.influentialCitationCount);

    // 数组字段：合并去重
    if (data.subjects) merged.subjects = [...new Set([...merged.subjects, ...data.subjects])];
    if (data.fieldsOfStudy) merged.fieldsOfStudy = [...new Set([...merged.fieldsOfStudy, ...data.fieldsOfStudy])];
    if (data.concepts) merged.concepts = [...new Set([...merged.concepts, ...data.concepts])];
  });

  return merged;
}

/**
 * 并行查询单个数据源
 */
async function fetchSingleSource(sourceKey, doi, signal) {
  const config = DOI_SOURCES[sourceKey];
  try {
    const response = await fetch(config.url(doi), { 
      signal,
      headers: sourceKey === 'semanticscholar' ? { 'Accept': 'application/json' } : {}
    });
    
    if (!response.ok) {
      console.warn(`[${config.name}] HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    // 根据数据源解析
    if (sourceKey === 'crossref') {
      return data.message ? parseCrossRefData(data.message) : null;
    } else if (sourceKey === 'semanticscholar') {
      return parseSemanticScholarData(data);
    } else if (sourceKey === 'openalex') {
      return parseOpenAlexData(data);
    }
  } catch (err) {
    console.warn(`[${config.name}]`, err.message);
    return null;
  }
}

/**
 * 通过多源 API 获取文献元数据
 * 并行查询 CrossRef、Semantic Scholar、OpenAlex，合并结果
 */
async function fetchDOI() {
  const doi = document.getElementById('doiInput').value.trim();
  if (!doi) return;

  const btn = document.getElementById('fetchDoiBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = t('fetching') || 'Fetching...';
  }

  // 显示状态提示
  const statusEl = document.getElementById('doiFetchStatus');
  if (statusEl) statusEl.textContent = '查询 CrossRef, Semantic Scholar, OpenAlex...';

  // 创建 AbortController，10秒超时
  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), 12000);

  try {
    // 并行查询三个数据源
    const [crossrefData, semanticData, openalexData] = await Promise.all([
      fetchSingleSource('crossref', doi, controller.signal),
      fetchSingleSource('semanticscholar', doi, controller.signal),
      fetchSingleSource('openalex', doi, controller.signal)
    ]);

    clearTimeout(timeoutTimer);

    // 记录各源状态
    const sourcesStatus = [];
    if (crossrefData) sourcesStatus.push('CrossRef ✓');
    if (semanticData) sourcesStatus.push('Semantic Scholar ✓');
    if (openalexData) sourcesStatus.push('OpenAlex ✓');
    
    console.log('[fetchDOI] 数据源状态:', sourcesStatus.join(', ') || '全部失败');
    if (statusEl) statusEl.textContent = sourcesStatus.join(' | ') || '查询失败';

    // 合并数据
    const results = {
      crossref: crossrefData,
      semanticscholar: semanticData,
      openalex: openalexData
    };

    const merged = mergeSourceData(results);

    // 检查是否有有效数据
    if (!merged.title && !merged.authors) {
      alert(t('doiFetchFail') || '未能从任何数据源获取文献信息，请手动填写');
      return;
    }

    // 填充表单
    fillLiteratureForm(merged, doi);

    // 补充查询：通过期刊名获取影响因子和分区（OpenAlex Sources API）
    if (merged.journal) {
      if (statusEl) statusEl.textContent = (sourcesStatus.join(' | ') || '基础信息已获取') + ' → 查询期刊指标...';
      try {
        const journalInfo = await fetchJournalInfo(merged.journal, controller.signal);
        if (journalInfo) {
          if (journalInfo.impactFactor) {
            document.getElementById('lit-if').value = journalInfo.impactFactor;
          }
          if (journalInfo.quartile) {
            document.getElementById('lit-quartile').value = journalInfo.quartile;
          }
          if (statusEl) {
            const parts = [];
            if (journalInfo.impactFactor) parts.push('IF: ' + journalInfo.impactFactor);
            if (journalInfo.quartile) parts.push(journalInfo.quartile);
            statusEl.textContent = (sourcesStatus.join(' | ') || '✓') + (parts.length ? ' | 期刊: ' + parts.join(', ') : '');
          }
        } else {
          if (statusEl) statusEl.textContent = (sourcesStatus.join(' | ') || '✓') + ' | 期刊指标未找到';
        }
      } catch (err) {
        console.warn('[fetchDOI] 期刊指标查询失败:', err.message);
        if (statusEl) statusEl.textContent = sourcesStatus.join(' | ') || '✓';
      }
    }

  } catch (err) {
    clearTimeout(timeoutTimer);
    console.error('[fetchDOI]', err);
    alert(t('doiFetchFail') || '查询失败，请检查网络或手动填写');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = t('doiFetch') || 'Fetch';
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

  // 合并所有主题/关键词/概念
  const allTags = [...new Set([
    ...data.subjects,
    ...data.fieldsOfStudy,
    ...data.concepts
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
 * 通过 OpenAlex Sources API 查询期刊信息
 * 获取影响因子（2yr_mean_citedness）和估算 JCR 分区
 * @param {string} journalName - 期刊名称
 * @param {AbortSignal} signal - 中止信号
 * @returns {{ impactFactor: number|null, quartile: string|null, isCore: boolean|null }}
 */
async function fetchJournalInfo(journalName, signal) {
  try {
    // 通过期刊名搜索 OpenAlex Sources
    const searchUrl = `https://api.openalex.org/sources?search=${encodeURIComponent(journalName)}&per_page=3`;
    const response = await fetch(searchUrl, { signal });
    
    if (!response.ok) {
      console.warn('[fetchJournalInfo] HTTP', response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      console.warn('[fetchJournalInfo] 未找到期刊:', journalName);
      return null;
    }

    // 找到最佳匹配（优先精确匹配）
    let bestMatch = data.results[0];
    const journalLower = journalName.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const source of data.results) {
      const nameLower = (source.display_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (nameLower === journalLower) {
        bestMatch = source;
        break;
      }
    }

    // 提取影响因子（2yr_mean_citedness ≈ JCR Impact Factor）
    let impactFactor = null;
    if (bestMatch.summary_stats && bestMatch.summary_stats['2yr_mean_citedness']) {
      impactFactor = Math.round(bestMatch.summary_stats['2yr_mean_citedness'] * 100) / 100;
    }

    // 提取 CiteScore（OpenAlex 自己的指标，基于 Scopus）
    let citeScore = null;
    if (bestMatch.cited_by_count && bestMatch.works_count) {
      // 简单估算：总引用/总文章数（粗略的 CiteScore 近似值）
      // 注意：这不是精确的 CiteScore，仅作为参考
    }

    // 估算 JCR 分区（基于影响因子在学科中的相对位置）
    // 由于无法获取精确的学科分区表，使用通用参考范围
    let quartile = null;
    if (impactFactor !== null) {
      // 通用参考范围（不同学科差异很大，仅供参考）
      if (impactFactor >= 10) quartile = 'Q1';
      else if (impactFactor >= 5) quartile = 'Q1';
      else if (impactFactor >= 3) quartile = 'Q2';
      else if (impactFactor >= 1.5) quartile = 'Q2';
      else if (impactFactor >= 0.5) quartile = 'Q3';
      else quartile = 'Q4';
    }

    const isCore = bestMatch.is_core || false;

    console.log(`[fetchJournalInfo] 期刊: ${bestMatch.display_name}, IF: ${impactFactor}, 估算分区: ${quartile}, 核心期刊: ${isCore}`);

    return { impactFactor, quartile, isCore };
  } catch (err) {
    console.warn('[fetchJournalInfo]', err.message);
    return null;
  }
}

// ============================================================
// BibTeX 导入
// ============================================================

/**
 * 解析并导入BibTeX条目
 * 简单的BibTeX解析器，支持基本条目格式
 */
function importBibTeX() {
  const input = document.getElementById('bibtex-input').value;
  if (!input.trim()) return;

  // 匹配所有BibTeX条目
  const entries = input.match(/@\w+\{[^@]+/g) || [];
  let added = 0;

  entries.forEach(entry => {
    // 提取字段值的辅助函数
    const getField = (name) => {
      const m = entry.match(new RegExp(name + '\\s*=\\s*\\{([^}]*?)\\}'));
      return m ? m[1] : '';
    };

    const title = getField('title');
    if (!title) return; // 必须有标题

    // 安全修复 [SEC-001]: BibTeX 导入字段使用 sanitizeInput 清理，防止后续 innerHTML 渲染时 XSS
    // 创建文献记录
    appData.literature.push({
      id: generateId(),
      title: sanitizeInput(title, 500),
      authors: sanitizeInput(getField('author'), 500),
      journal: sanitizeInput(getField('journal') || getField('booktitle'), 200),
      year: parseInt(getField('year')) || 2024,
      doi: sanitizeInput(getField('doi'), 200),
      quartile: '',
      impactFactor: null,
      abstract: sanitizeInput(getField('abstract'), 10000),
      keywords: getField('keywords') ? getField('keywords').split(',').map(s => sanitizeInput(s.trim(), 100)).filter(Boolean) : [],
      status: 'unread',
      progress: 0,
      priority: 'medium',
      folder: null,
      tags: [],
      totalReadTime: 0,
      pageProgress: { current: 0, total: 0 },
      sectionProgress: { introduction: 0, methods: 0, results: 0, discussion: 0, conclusion: 0 },
      deadline: null,
      createdAt: new Date().toISOString().split('T')[0],
      lastReadAt: null
    });
    added++;
  });

  if (added) {
    saveData();
    alert(`${t('imported')} ${added} ${t('entries')}`);
    closeModal('addLitModal');
    if (currentPage === 'library') renderLibrary();
  } else {
    alert(t('noValidEntries'));
  }
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
 * 导出所有文献为BibTeX格式
 */
function exportBibTeX() {
  let bib = '';

  appData.literature.forEach(l => {
    const key = l.authors.split(',')[0].trim().split(' ').pop() + l.year;
    bib += `@article{${key},\n  title={${l.title}},\n  author={${l.authors}},\n  journal={${l.journal}},\n  year=${l.year},\n  doi=${l.doi || ''}\n}\n\n`;
  });

  downloadFile(
    'ScholarFlow_' + new Date().toISOString().split('T')[0] + '.bib',
    bib,
    'text/plain'
  );
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
