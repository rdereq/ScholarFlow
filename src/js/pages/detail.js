/**
 * ============================================================
 * ScholarFlow - Detail Page Module
 * ============================================================
 * 
 * 本模块负责渲染文献详情页面，包括：
 * - 文献元数据展示
 * - PDF阅读器区域
 * - 阅读进度控制（状态、整体进度、页码进度、IMRAD章节进度）
 * - 笔记列表
 * - 删除文献功能
 * 
 * @module pages/detail
 * @version 1.0.0
 */

// ============================================================
// 主渲染函数
// ============================================================

/**
 * 渲染文献详情页面
 * 显示指定文献的完整信息和操作控件
 * @param {string} litId 文献ID
 */
function renderDetailPage(litId) {
  const l = appData.literature.find(x => x.id === litId);
  if (!l) return;

  const folder = appData.folders.find(f => f.id === l.folder);
  const notes = appData.notes.filter(n => n.litId === litId);
  const safeId = escapeAttr(l.id);

  const page = document.getElementById('page-detail');

  // 生成页面HTML
  page.innerHTML = `
    <div class="animate-in">
      <!-- 返回按钮和标题 -->
      <div style="margin-bottom:20px;">
        <button class="btn btn-secondary btn-sm" onclick="switchPage('library')" style="margin-bottom:12px;">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M15 19l-7-7 7-7"/></svg> ${escapeHtml(t('backToLibrary'))}
        </button>
        <h1 class="section-title" style="font-size:22px;line-height:1.3;">${escapeHtml(l.title)}</h1>
        <p style="color:var(--text-secondary);font-size:14px;margin-top:4px;">${escapeHtml(l.authors || '')}</p>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center;">
          <span class="badge ${STATUS_MAP[l.status].badge}">${escapeHtml(STATUS_MAP[l.status].label)}</span>
          <span class="${PRIORITY_MAP[l.priority].class}" style="font-size:12px;font-weight:600;">${escapeHtml(PRIORITY_MAP[l.priority].icon + ' ' + PRIORITY_MAP[l.priority].label)}</span>
          ${folder ? '<span class="tag" style="border-color:' + folder.color + ';color:' + folder.color + ';">' + escapeHtml(folder.name) + '</span>' : ''}
          ${(l.tags || []).map(tg => '<span class="tag">' + escapeHtml(tg) + '</span>').join('')}
        </div>
      </div>

      <!-- 主内容区域 -->
      <div class="detail-split">
        <!-- 左侧：PDF阅读器 + 元数据 -->
        <div style="overflow-y:auto;display:flex;flex-direction:column;gap:16px;">
          <!-- PDF阅读器区域 -->
          <div id="pdfViewerArea" data-lit-id="${safeId}"></div>

          <!-- 元数据卡片 -->
          <div class="card">
            <div class="card-header">
              <span style="font-weight:600;font-size:15px;">${escapeHtml(t('metadata'))}</span>
              <button class="btn btn-secondary btn-sm" id="editLitBtn">${escapeHtml(t('edit'))}</button>
            </div>
            <div class="card-body">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
                <div><span style="color:var(--text-muted);">${escapeHtml(t('journal'))}:</span> <strong>${escapeHtml(l.journal || '')}</strong></div>
                <div><span style="color:var(--text-muted);">${escapeHtml(t('year'))}:</span> <strong>${escapeHtml(l.year || '')}</strong></div>
                <div><span style="color:var(--text-muted);">${escapeHtml(t('doi'))}:</span> <strong style="font-family:'JetBrains Mono',monospace;font-size:12px;">${escapeHtml(l.doi || '—')}</strong></div>
                <div><span style="color:var(--text-muted);">${escapeHtml(t('quartile'))}:</span> <strong>${escapeHtml(l.quartile || '—')}</strong></div>
                <div><span style="color:var(--text-muted);">${escapeHtml(t('impactFactor'))}:</span> <strong>${escapeHtml(String(l.impactFactor || '—'))}</strong></div>
                <div><span style="color:var(--text-muted);">${escapeHtml(t('pagesLabel'))}:</span> <strong>${escapeHtml(l.pageProgress ? String(l.pageProgress.total) : '-')}</strong></div>
              </div>
              ${l.abstract ? '<div style="margin-top:12px;"><div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">' + escapeHtml(t('abstract')) + '</div><p style="font-size:13px;line-height:1.6;color:var(--text-secondary);">' + escapeHtml(l.abstract) + '</p></div>' : ''}
              ${l.keywords && l.keywords.length ? '<div style="margin-top:10px;display:flex;gap:4px;flex-wrap:wrap;">' + l.keywords.map(k => '<span class="tag">' + escapeHtml(k) + '</span>').join('') + '</div>' : ''}
            </div>
          </div>
        </div>

        <!-- 右侧：进度控制 + 笔记 -->
        <div class="detail-sidebar">
          <!-- 进度控制卡片 -->
          <div class="card">
            <div class="card-header"><span style="font-weight:600;font-size:15px;">${escapeHtml(t('readingProgress'))}</span></div>
            <div class="card-body">
              <!-- 状态选择 -->
              <div class="form-group">
                <label class="form-label">${escapeHtml(t('status'))}</label>
                <select class="input" id="detailStatusSelect">
                  ${Object.entries(STATUS_MAP).map(([k, v]) => '<option value="' + escapeAttr(k) + '"' + (l.status === k ? ' selected' : '') + '>' + escapeHtml(v.label) + '</option>').join('')}
                </select>
              </div>

              <!-- 整体进度 -->
              <div class="form-group">
                <label class="form-label">${escapeHtml(t('overallProgress'))}: <strong id="overallProgressLabel">${l.progress}%</strong></label>
                <input type="range" id="overallProgressSlider" min="0" max="100" value="${l.progress}" style="width:100%;accent-color:var(--accent);" oninput="document.getElementById('overallProgressLabel').textContent=this.value+'%'">
              </div>

              <!-- 页码进度 -->
              <div class="form-group">
                <label class="form-label">${escapeHtml(t('pageProgress'))}</label>
                <div style="display:flex;align-items:center;gap:8px;">
                  <input type="number" id="pageProgressInput" class="input" style="width:70px;" value="${l.pageProgress ? l.pageProgress.current : 0}" min="0" max="${l.pageProgress ? l.pageProgress.total : 999}">
                  <span style="color:var(--text-muted);font-size:13px;">/ ${l.pageProgress ? l.pageProgress.total : '?'} ${escapeHtml(t('pages'))}</span>
                </div>
                ${l.pageProgress && l.pageProgress.total > 0 ? '<input type="range" min="0" max="' + l.pageProgress.total + '" value="' + (l.pageProgress.current || 0) + '" style="width:100%;accent-color:var(--accent);margin-top:4px;" id="pageRangeSlider">' : ''}
              </div>

              <!-- IMRAD章节进度 -->
              <div class="form-group">
                <label class="form-label">${escapeHtml(t('imradSection'))}</label>
                ${IMRAD_SECTIONS.map(s => {
                  const val = l.sectionProgress ? l.sectionProgress[s.key] || 0 : 0;
                  const labelParts = s.label.split('/');
                  const displayLabel = labelParts[currentLang === 'zh' ? 0 : 1] || labelParts[0];
                  return '<div style="margin-bottom:8px;">' +
                    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">' +
                      '<span style="font-size:12px;color:var(--text-secondary);">' + escapeHtml(displayLabel) + '</span>' +
                      '<span style="font-size:12px;font-weight:600;color:var(--accent);" id="sectionLabel_' + s.key + '">' + val + '%</span>' +
                    '</div>' +
                    '<input type="range" min="0" max="100" value="' + val + '" style="width:100%;accent-color:var(--accent);" id="sectionSlider_' + s.key + '" data-section="' + s.key + '">' +
                  '</div>';
                }).join('')}
              </div>

              <!-- 优先级和截止日期 -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div class="form-group">
                  <label class="form-label">${escapeHtml(t('priority'))}</label>
                  <select class="input" id="detailPrioritySelect">
                    ${Object.entries(PRIORITY_MAP).map(([k, v]) => '<option value="' + escapeAttr(k) + '"' + (l.priority === k ? ' selected' : '') + '>' + escapeHtml(v.icon + ' ' + v.label) + '</option>').join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">${escapeHtml(t('deadline'))}</label>
                  <input type="date" class="input" id="detailDeadlineInput" value="${l.deadline || ''}">
                </div>
              </div>

              <!-- 阅读统计 -->
              <div style="font-size:12px;color:var(--text-muted);display:flex;justify-content:space-between;margin-top:8px;">
                <span>${escapeHtml(t('readTime'))}: ${formatMinutes(l.totalReadTime)}</span>
                <span>${escapeHtml(t('last'))}: ${formatDate(l.lastReadAt)}</span>
              </div>

              <!-- 阅读计时器按钮 -->
              <button class="btn btn-primary" style="width:100%;margin-top:12px;justify-content:center;" id="timerBtn-${safeId}">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                ${escapeHtml(t('startReading'))}
              </button>
            </div>
          </div>

          <!-- 笔记卡片 -->
          <div class="card">
            <div class="card-header">
              <span style="font-weight:600;font-size:15px;">${escapeHtml(t('notes'))} (${notes.length})</span>
              <button class="btn btn-primary btn-sm" id="newNoteBtn">${escapeHtml(t('newNote'))}</button>
            </div>
            <div class="card-body" style="padding:${notes.length ? '12px' : '20px'};" id="detailNotesBody"></div>
          </div>

          <!-- 删除文献按钮 -->
          <button class="btn btn-secondary" style="width:100%;justify-content:center;color:#d4354f;border-color:#d4354f33;" id="deleteLitBtn">${escapeHtml(t('deleteLiterature'))}</button>
        </div>
      </div>
    </div>
  `;

  // 附加事件监听器
  attachDetailPageListeners(safeId, l);

  // 渲染笔记列表
  renderDetailNotes(notes);

  // 初始化PDF阅读器
  renderPdfViewerArea(litId);
}

// ============================================================
// 事件监听器附加
// ============================================================

/**
 * 为详情页面附加事件监听器
 * @param {string} safeId 安全的文献ID
 * @param {Object} lit 文献对象
 */
function attachDetailPageListeners(safeId, lit) {
  // 编辑按钮
  const editBtn = document.getElementById('editLitBtn');
  if (editBtn) editBtn.addEventListener('click', () => openEditLitModal(safeId));

  // 计时器按钮
  const timerBtn = document.getElementById('timerBtn-' + safeId);
  if (timerBtn) timerBtn.addEventListener('click', () => toggleReadingTimer(safeId));

  // 新建笔记按钮
  const newNoteBtn = document.getElementById('newNoteBtn');
  if (newNoteBtn) newNoteBtn.addEventListener('click', () => openNewNoteModal(safeId));

  // 删除按钮
  const deleteBtn = document.getElementById('deleteLitBtn');
  if (deleteBtn) deleteBtn.addEventListener('click', () => deleteLiterature(safeId));

  // 状态选择
  const statusSel = document.getElementById('detailStatusSelect');
  if (statusSel) {
    statusSel.addEventListener('change', (e) => updateLitField(safeId, 'status', e.target.value));
  }

  // 整体进度滑块
  const overallSlider = document.getElementById('overallProgressSlider');
  if (overallSlider) {
    overallSlider.addEventListener('input', (e) => {
      const lbl = document.getElementById('overallProgressLabel');
      if (lbl) lbl.textContent = e.target.value + '%';
    });
    overallSlider.addEventListener('change', (e) => updateLitField(safeId, 'progress', parseInt(e.target.value)));
  }

  // 页码进度输入
  const pageInput = document.getElementById('pageProgressInput');
  if (pageInput) {
    pageInput.addEventListener('input', (e) => updatePageProgressLive(safeId, parseInt(e.target.value) || 0, lit.pageProgress ? lit.pageProgress.total : 0));
    pageInput.addEventListener('change', (e) => updatePageProgress(safeId, parseInt(e.target.value) || 0, lit.pageProgress ? lit.pageProgress.total : 0));
  }

  const pageRangeSlider = document.getElementById('pageRangeSlider');
  if (pageRangeSlider) {
    pageRangeSlider.addEventListener('input', (e) => {
      const pi = document.getElementById('pageProgressInput');
      if (pi) pi.value = e.target.value;
      updatePageProgressLive(safeId, parseInt(e.target.value), lit.pageProgress ? lit.pageProgress.total : 0);
    });
    pageRangeSlider.addEventListener('change', (e) => updatePageProgress(safeId, parseInt(e.target.value), lit.pageProgress ? lit.pageProgress.total : 0));
  }

  // IMRAD章节滑块
  IMRAD_SECTIONS.forEach(s => {
    const slider = document.getElementById('sectionSlider_' + s.key);
    if (slider) {
      slider.addEventListener('input', (e) => updateSectionProgressLive(safeId, s.key, parseInt(e.target.value)));
      slider.addEventListener('change', (e) => updateSectionProgress(safeId, s.key, parseInt(e.target.value)));
    }
  });

  // 优先级选择
  const priSel = document.getElementById('detailPrioritySelect');
  if (priSel) {
    priSel.addEventListener('change', (e) => updateLitField(safeId, 'priority', e.target.value));
  }

  // 截止日期输入
  const deadlineInput = document.getElementById('detailDeadlineInput');
  if (deadlineInput) {
    deadlineInput.addEventListener('change', (e) => updateLitField(safeId, 'deadline', e.target.value || null));
  }
}

// ============================================================
// 笔记列表渲染
// ============================================================

/**
 * 渲染详情页面的笔记列表
 * @param {Array} notes 笔记列表
 */
function renderDetailNotes(notes) {
  const notesBody = document.getElementById('detailNotesBody');
  if (!notesBody) return;

  if (!notes.length) {
    notesBody.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:13px;">' + escapeHtml(t('noNotesYet')) + '</div>';
  } else {
    notesBody.innerHTML = notes.map(n => {
      const nSafeId = escapeAttr(n.id);
      const contentPreview = escapeHtml((n.content || '').replace(/[#*]/g, '').slice(0, 120));
      return '<div class="note-card detail-note-item" data-note-id="' + nSafeId + '" style="margin-bottom:8px;cursor:pointer;">' +
        '<div style="font-weight:500;font-size:14px;margin-bottom:4px;">' + escapeHtml(n.title) + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + contentPreview + '...</div>' +
        '<div style="display:flex;gap:4px;margin-top:6px;">' + (n.tags || []).map(tg => '<span class="tag">' + escapeHtml(tg) + '</span>').join('') + '</div>' +
        '<div style="font-size:11px;color:var(--text-muted);margin-top:4px;">' + formatDate(n.updatedAt) + '</div>' +
      '</div>';
    }).join('');

    notesBody.querySelectorAll('.detail-note-item').forEach(el => {
      el.addEventListener('click', () => openEditNoteModal(el.dataset.noteId));
    });
  }
}

// ============================================================
// 模块导出
// ============================================================

if (typeof window !== 'undefined') {
  window.renderDetailPage = renderDetailPage;
}
