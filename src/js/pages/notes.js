/**
 * ============================================================
 * ScholarFlow - Notes Page Module
 * ============================================================
 * 
 * 本模块负责渲染笔记页面，包括：
 * - 笔记卡片列表
 * - 标签过滤器
 * - 笔记导出功能
 * 
 * @module pages/notes
 * @version 1.0.0
 */

// ============================================================
// 主渲染函数
// ============================================================

/**
 * 渲染笔记页面
 * 显示所有笔记的卡片列表，支持按标签过滤
 */
function renderNotesPage() {
  const page = document.getElementById('page-notes');
  const allNotes = appData.notes;

  // 收集所有标签
  const allTags = [...new Set(allNotes.flatMap(n => n.tags || []))];

  // 生成页面HTML
  page.innerHTML = `
    <div class="animate-in">
      <!-- 页面标题和导出按钮 -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div>
          <h1 class="section-title">${escapeHtml(t('notesTitle'))}</h1>
          <p style="color:var(--text-muted);font-size:14px;margin-top:2px;">${allNotes.length} ${escapeHtml(t('notesAcross'))}</p>
        </div>
        <button class="btn btn-primary" id="exportAllNotesBtn">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          ${escapeHtml(t('exportAllMd'))}
        </button>
      </div>

      <!-- 标签过滤器 -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px;" id="notesTagFilter">
        <button class="btn btn-sm btn-primary" data-tag="all">${escapeHtml(t('all'))}</button>
        ${allTags.map(t => '<button class="btn btn-sm btn-secondary" data-tag="' + escapeAttr(t) + '">' + escapeHtml(t) + '</button>').join('')}
      </div>

      <!-- 笔记列表容器 -->
      <div id="notesList" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px;"></div>
    </div>
  `;

  // 附加事件监听器
  attachNotesPageListeners();

  // 渲染笔记卡片
  const notesList = document.getElementById('notesList');
  if (notesList) {
    notesList.innerHTML = renderNoteCardsSafe(allNotes);
    attachNoteCardListeners(notesList);
  }
}

// ============================================================
// 事件监听器
// ============================================================

/**
 * 为笔记页面附加事件监听器
 */
function attachNotesPageListeners() {
  // 导出全部笔记按钮
  const exportBtn = document.getElementById('exportAllNotesBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportAllNotes);

  // 标签过滤器按钮
  const tagFilter = document.getElementById('notesTagFilter');
  if (tagFilter) {
    tagFilter.querySelectorAll('[data-tag]').forEach(btn => {
      btn.addEventListener('click', () => {
        // 更新按钮样式
        tagFilter.querySelectorAll('[data-tag]').forEach(b => {
          b.classList.remove('btn-primary');
          b.classList.add('btn-secondary');
        });
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');

        // 渲染过滤后的笔记
        renderFilteredNotes(btn.dataset.tag);
      });
    });
  }
}

// ============================================================
// 笔记卡片渲染
// ============================================================

/**
 * 渲染笔记卡片列表（兼容旧代码）
 * @param {Array} notes 笔记列表
 * @returns {string} 笔记卡片的HTML字符串
 */
function renderNoteCards(notes) {
  return renderNoteCardsSafe(notes);
}

/**
 * 安全地渲染笔记卡片列表
 * 生成笔记卡片的HTML，包含标题、内容预览、标签和更新时间
 * @param {Array} notes 笔记列表
 * @returns {string} 笔记卡片的HTML字符串
 */
function renderNoteCardsSafe(notes) {
  // 空状态处理
  if (!notes.length) {
    return '<div class="empty-state"><p>' + escapeHtml(t('noNotesFound')) + '</p></div>';
  }

  return notes.map(n => {
    const lit = appData.literature.find(l => l.id === n.litId);
    const safeId = escapeAttr(n.id);

    // Module 4: 查找与笔记关联的标注
    const linkedAnns = (n.annotationIds && typeof window.annotationState !== 'undefined')
      ? (window.annotationState.annotations || []).filter(a => n.annotationIds.includes(a.id))
      : [];

    return '<div class="note-card notes-page-card" data-note-id="' + safeId + '" style="cursor:pointer;">' +
      // 标题和导出按钮
      '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px;">' +
        '<h3 style="font-size:15px;font-weight:600;">' + escapeHtml(n.title) + '</h3>' +
        '<button class="btn-icon export-note-btn" data-note-id="' + safeId + '" style="border:none;flex-shrink:0;" title="Export">' +
          '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>' +
        '</button>' +
      '</div>' +
      // 关联文献链接
      (lit ? '<div class="note-lit-link" data-lit-id="' + escapeAttr(lit.id) + '" style="font-size:12px;color:var(--accent);margin-bottom:6px;cursor:pointer;">&#128214; ' + escapeHtml(lit.title.slice(0, 50)) + (lit.title.length > 50 ? '...' : '') + '</div>' : '') +
      // 内容预览
      '<div style="font-size:13px;color:var(--text-secondary);line-height:1.5;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-line;">' + escapeHtml((n.content || '').replace(/[#*]/g, '').slice(0, 200)) + '</div>' +
      // 标签
      '<div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap;">' + (n.tags || []).map(t => '<span class="tag">' + escapeHtml(t) + '</span>').join('') + '</div>' +
      // Module 4: 关联标注列表
      (linkedAnns.length > 0
        ? '<div class="note-related-annotations">' +
            '<div class="note-related-annotations-header" onclick="(function(el){const list=el.nextElementSibling;if(list){list.style.display=list.style.display===\'none\'?\'block\':\'none\';}})(this)">' +
              '&#128196; ' + escapeHtml(t('pdfRelatedAnnotations')) + ' (' + linkedAnns.length + ')' +
            '</div>' +
            '<div id="related-anns-' + safeId + '">' +
              linkedAnns.map(a =>
                '<div class="note-related-annotation-item" onclick="(function(id,p){if(typeof goToPage===\'function\')goToPage(p);if(typeof switchPage===\'function\')switchPage(\'detail\',currentDetailId);})(\'' + a.id + '\',' + a.pageNum + ')">' +
                  '<span class="note-annotation-text-preview">"' + escapeHtml((a.selectedText || '').slice(0, 50)) + (a.selectedText && a.selectedText.length > 50 ? '...' : '') + '"</span>' +
                  '<span class="note-annotation-pagenum">' + escapeHtml(t('pdfPage')) + ' ' + a.pageNum + '</span>' +
                '</div>'
              ).join('') +
            '</div>' +
          '</div>'
        : ''
      ) +
      // 更新时间
      '<div style="font-size:11px;color:var(--text-muted);margin-top:6px;">' + escapeHtml(t('updated')) + ': ' + formatDate(n.updatedAt) + '</div>' +
    '</div>';
  }).join('');
}

// ============================================================
// 事件监听器附加
// ============================================================

/**
 * 为笔记卡片附加事件监听器
 * @param {HTMLElement} container 笔记列表容器元素
 */
function attachNoteCardListeners(container) {
  // 卡片点击事件（打开编辑）
  container.querySelectorAll('.notes-page-card').forEach(el => {
    el.addEventListener('click', (e) => {
      // 如果点击的是导出按钮，不打开编辑
      if (e.target.closest('.export-note-btn')) return;
      openEditNoteModal(el.dataset.noteId);
    });
  });

  // 导出按钮点击事件
  container.querySelectorAll('.export-note-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportNote(btn.dataset.noteId);
    });
  });

  // 关联文献链接点击事件
  container.querySelectorAll('.note-lit-link').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      switchPage('detail', el.dataset.litId);
    });
  });
}

// ============================================================
// 过滤功能
// ============================================================

/**
 * 根据标签过滤并渲染笔记
 * @param {string} tag 标签名称，'all' 表示显示全部
 */
function renderFilteredNotes(tag) {
  const notes = tag === 'all' ? appData.notes : appData.notes.filter(n => (n.tags || []).includes(tag));
  const container = document.getElementById('notesList');
  if (container) {
    container.innerHTML = renderNoteCardsSafe(notes);
    attachNoteCardListeners(container);
  }
}

// ============================================================
// 模块导出
// ============================================================

if (typeof window !== 'undefined') {
  window.renderNotesPage = renderNotesPage;
  window.renderNoteCards = renderNoteCards;
  window.renderNoteCardsSafe = renderNoteCardsSafe;
  window.attachNoteCardListeners = attachNoteCardListeners;
  window.renderFilteredNotes = renderFilteredNotes;
}
