/**
 * ============================================================
 * ScholarFlow - Library Page Module
 * ============================================================
 * 
 * 本模块负责渲染文献库页面，包括：
 * - 文献列表（卡片视图和表格视图）
 * - 过滤器（状态、优先级、文件夹、标签）
 * - 排序功能
 * - 文献卡片和表格行渲染
 * 
 * @module pages/library
 * @version 1.0.0
 */

// ============================================================
// 主渲染函数
// ============================================================

// ============================================================
// 批量选择状态（引用功能）
// ============================================================
let _selectedLitIds = new Set();

/**
 * 渲染文献库页面
 * 根据当前过滤器设置生成文献列表
 */
function renderLibrary() {
  // 切换视图/过滤时清空选取
  _selectedLitIds.clear();
  // 复制文献列表进行过滤
  let filtered = [...appData.literature];
  const f = libraryFilters;

  // 应用过滤器
  if (f.status !== 'all') filtered = filtered.filter(l => l.status === f.status);
  if (f.priority !== 'all') filtered = filtered.filter(l => l.priority === f.priority);
  if (f.folder !== 'all') filtered = filtered.filter(l => l.folder === f.folder);
  if (f.tag !== 'all') filtered = filtered.filter(l => (l.tags || []).includes(f.tag));

  // 应用排序
  if (f.sort === 'lastReadAt') {
    filtered.sort((a, b) => (b.lastReadAt || '') > (a.lastReadAt || '') ? 1 : -1);
  } else if (f.sort === 'year') {
    filtered.sort((a, b) => b.year - a.year);
  } else if (f.sort === 'progress') {
    filtered.sort((a, b) => b.progress - a.progress);
  } else if (f.sort === 'title') {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  } else if (f.sort === 'priority') {
    const po = { high: 0, medium: 1, low: 2 };
    filtered.sort((a, b) => po[a.priority] - po[b.priority]);
  }

  // 获取页面容器
  const page = document.getElementById('page-library');

  // 生成页面HTML
  page.innerHTML = `
    <div class="animate-in">
      <!-- 页面标题和视图切换 -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
        <div>
          <h1 class="section-title">${escapeHtml(t('libraryTitle'))}</h1>
          <p style="color:var(--text-muted);font-size:14px;margin-top:2px;">${filtered.length} ${escapeHtml(t('of'))} ${appData.literature.length} ${escapeHtml(t('papers'))}</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <!-- 卡片视图按钮 -->
          <button class="btn-icon ${libraryView === 'card' ? 'active' : ''}" onclick="libraryView='card';renderLibrary();" title="Card View" style="${libraryView === 'card' ? 'background:var(--accent-bg);color:var(--accent);border-color:var(--accent);' : ''}">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-1a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/></svg>
          </button>
          <!-- 表格视图按钮 -->
          <button class="btn-icon" onclick="libraryView='table';renderLibrary();" title="Table View" style="${libraryView === 'table' ? 'background:var(--accent-bg);color:var(--accent);border-color:var(--accent);' : ''}">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
          </button>
        </div>
        <!-- 引用导出按钮组 -->
        <div style="display:flex;gap:4px;align-items:center;border-left:1px solid var(--border-color);padding-left:12px;margin-left:4px;">
          <select id="citation-quick-format" style="font-size:12px;padding:4px 6px;border:1px solid var(--border-color);border-radius:6px;background:var(--bg-card);color:var(--text-primary);cursor:pointer;" onchange="citationFormat=this.value;localStorage.setItem('citation_default_format',this.value);">
            <option value="APA 7th">APA 7th</option>
            <option value="MLA 9th">MLA 9th</option>
            <option value="Chicago 17th (作者-日期)">Chicago (作者-日期)</option>
            <option value="Chicago 17th (注释-书目)">Chicago (注释-书目)</option>
            <option value="GB/T 7714-2015">GB/T 7714-2015</option>
            <option value="IEEE">IEEE</option>
          </select>
          <button class="btn btn-primary btn-sm" onclick="handleQuickCopyCitations()" style="font-size:12px;padding:4px 10px;white-space:nowrap;" title="复制选中文献的引用">
            📋 ${escapeHtml(t('copyCitation') || '复制引用')}
          </button>
          <button class="btn btn-secondary btn-sm" onclick="handleExportAllCitations()" style="font-size:12px;padding:4px 10px;white-space:nowrap;" title="导出文献引用为文件">
            📤 ${escapeHtml(t('exportAll') || '导出')}
          </button>
          <select id="citation-quick-export" style="font-size:12px;padding:4px 6px;border:1px solid var(--border-color);border-radius:6px;background:var(--bg-card);color:var(--text-primary);cursor:pointer;" onchange="citationExportType=this.value;localStorage.setItem('citation_export_type',this.value);">
            <option value="txt">纯文本 .txt</option>
            <option value="md">Markdown .md</option>
            <option value="doc">Word .doc.html</option>
            <option value="bib">BibTeX .bib</option>
            <option value="ris">RIS .ris</option>
            <option value="endnote">EndNote .xml</option>
            <option value="csv">CSV .csv</option>
            <option value="json">JSON .json</option>
          </select>
        </div>
      </div>

      <!-- 过滤器栏 -->
      <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;align-items:center;">
        <!-- 状态过滤器 -->
        <select class="input" style="width:auto;min-width:120px;" onchange="libraryFilters.status=this.value;renderLibrary();">
          <option value="all">${escapeHtml(t('allStatus'))}</option>
          ${Object.entries(STATUS_MAP).map(([k, v]) => `<option value="${escapeAttr(k)}" ${f.status === k ? 'selected' : ''}>${escapeHtml(v.label)}</option>`).join('')}
        </select>
        
        <!-- 优先级过滤器 -->
        <select class="input" style="width:auto;min-width:100px;" onchange="libraryFilters.priority=this.value;renderLibrary();">
          <option value="all">${escapeHtml(t('allPriority'))}</option>
          ${Object.entries(PRIORITY_MAP).map(([k, v]) => `<option value="${escapeAttr(k)}" ${f.priority === k ? 'selected' : ''}>${escapeHtml(v.icon + ' ' + v.label)}</option>`).join('')}
        </select>
        
        <!-- 文件夹过滤器 -->
        <select class="input" style="width:auto;min-width:130px;" onchange="libraryFilters.folder=this.value;renderLibrary();">
          <option value="all">${escapeHtml(t('allFolders'))}</option>
          ${appData.folders.map(fd => `<option value="${escapeAttr(fd.id)}" ${f.folder === fd.id ? 'selected' : ''}>${escapeHtml(fd.name)}</option>`).join('')}
        </select>
        
        <!-- 标签过滤器 -->
        <select class="input" style="width:auto;min-width:130px;" onchange="libraryFilters.tag=this.value;renderLibrary();">
          <option value="all">${escapeHtml(t('allTags'))}</option>
          ${appData.tags.map(t => `<option value="${escapeAttr(t)}" ${f.tag === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
        </select>
        
        <div style="flex:1;"></div>
        
        <!-- 排序选择器 -->
        <select class="input" style="width:auto;min-width:130px;" onchange="libraryFilters.sort=this.value;renderLibrary();">
          <option value="lastReadAt" ${f.sort === 'lastReadAt' ? 'selected' : ''}>${escapeHtml(t('recentActivity'))}</option>
          <option value="year" ${f.sort === 'year' ? 'selected' : ''}>${escapeHtml(t('yearNewest'))}</option>
          <option value="progress" ${f.sort === 'progress' ? 'selected' : ''}>${escapeHtml(t('progress'))}</option>
          <option value="title" ${f.sort === 'title' ? 'selected' : ''}>${escapeHtml(t('titleAZ'))}</option>
          <option value="priority" ${f.sort === 'priority' ? 'selected' : ''}>${escapeHtml(t('priority'))}</option>
        </select>
      </div>

      <!-- 文献列表容器 -->
      <div id="libraryContent"></div>
    </div>
  `;

  // 渲染文献列表内容
  const libContent = document.getElementById('libraryContent');
  if (libContent) {
    libContent.innerHTML = libraryView === 'card' ? renderLibraryCards(filtered) : renderLibraryTable(filtered);

    // 附加点击事件监听器（支持 Ctrl+多选）
    libContent.querySelectorAll('.lit-card').forEach(el => {
      el.addEventListener('click', (e) => {
        const litId = el.dataset.litId;
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          _toggleSelection(el, litId);
        } else {
          _selectedLitIds.clear();
          _clearAllSelectionStyles();
          switchPage('detail', litId);
        }
      });
    });
    libContent.querySelectorAll('.lib-table-row').forEach(el => {
      el.addEventListener('click', (e) => {
        const litId = el.dataset.litId;
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          _toggleSelection(el, litId);
        } else {
          _selectedLitIds.clear();
          _clearAllSelectionStyles();
          switchPage('detail', litId);
        }
      });
    });
  }

  // 事件委托：右键菜单（引用功能 T04）
  setTimeout(() => {
    const pageEl = document.getElementById('page-library');
    if (pageEl && !pageEl._citationContextReady) {
      pageEl._citationContextReady = true;
      pageEl.addEventListener('contextmenu', (e) => {
        const litEl = e.target.closest('[data-lit-id]');
        if (!litEl) return;
        e.preventDefault();
        const litId = litEl.getAttribute('data-lit-id');
        if (!_selectedLitIds.has(litId)) {
          _selectedLitIds.add(litId);
          litEl.classList.add('lit-selected');
        }
        const selectedItems = appData.literature.filter(l => _selectedLitIds.has(l.id));
        if (selectedItems.length > 0 && typeof showCitationContextMenu === 'function') {
          showCitationContextMenu(e.clientX, e.clientY, selectedItems);
        }
      });
    }
  }, 0);

  // 恢复已保存的引用格式偏好
  setTimeout(() => {
    const sel = document.getElementById('citation-quick-format');
    const saved = localStorage.getItem('citation_default_format');
    if (sel && saved) sel.value = saved;
  }, 10);
}
// <<< renderLibrary 在此处闭合

// ============================================================
// 卡片视图渲染
// ============================================================

/**
 * 渲染文献卡片视图
 * 以卡片形式展示文献列表，每篇文献显示为一个卡片
 * @param {Array} items 文献列表
 * @returns {string} 卡片视图的HTML字符串
 */
function renderLibraryCards(items) {
  // 空状态处理
  if (!items.length) {
    return `<div class="empty-state">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
      </svg>
      <p>${escapeHtml(t('noLitFound'))}</p>
    </div>`;
  }

  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;">
    ${items.map(l => {
      // 获取文件夹信息
      const folder = appData.folders.find(f => f.id === l.folder);
      
      // 计算截止日期
      const deadline = l.deadline ? daysUntil(l.deadline) : null;
      const safeId = escapeAttr(l.id);
      
      // 处理作者显示
      const authorList = (l.authors || '').split(',');
      const displayAuthors = authorList.slice(0, 2).map(a => escapeHtml(a.trim())).join(', ') + (authorList.length > 2 ? ' et al.' : '');
      
      // 生成截止日期提示
      let deadlineDiv = '';
      if (deadline !== null && deadline <= 7 && l.status !== 'deep_done' && l.status !== 'archived') {
        const dlColor = deadline < 0 ? '#d4354f' : '#e09800';
        const dlPrefix = deadline < 0 ? '⚠ ' : '📅 ';
        const dlSuffix = deadline < 0 ? escapeHtml(' ' + t('dOverdue')) : escapeHtml(' ' + t('dLeft'));
        deadlineDiv = '<div style="font-size:11px;margin-top:6px;color:' + dlColor + ';font-weight:500;">' + dlPrefix + Math.abs(deadline) + dlSuffix + '</div>';
      }

      // 生成卡片HTML
      return '<div class="lit-card" data-lit-id="' + safeId + '">' +
        '<div style="display:flex;align-items:start;justify-content:space-between;gap:8px;margin-bottom:8px;">' +
          '<span class="badge ' + STATUS_MAP[l.status].badge + '">' + escapeHtml(STATUS_MAP[l.status].label) + '</span>' +
          '<span class="' + PRIORITY_MAP[l.priority].class + '" style="font-size:12px;font-weight:600;">' + escapeHtml(PRIORITY_MAP[l.priority].icon) + '</span>' +
        '</div>' +
        '<h3 style="font-family:\'Crimson Pro\',\'Noto Serif SC\',serif;font-size:16px;font-weight:600;line-height:1.35;margin-bottom:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + escapeHtml(l.title) + '</h3>' +
        '<p style="font-size:12px;color:var(--text-muted);margin-bottom:10px;">' + displayAuthors + ' &middot; ' + escapeHtml(l.journal || '') + ' &middot; ' + escapeHtml(l.year || '') + '</p>' +
        '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px;">' +
          (l.tags || []).slice(0, 3).map(t => '<span class="tag">' + escapeHtml(t) + '</span>').join('') +
          (folder ? '<span class="tag" style="border-color:' + folder.color + ';color:' + folder.color + ';">' + escapeHtml(folder.name) + '</span>' : '') +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
          '<div class="progress-bar" style="flex:1;"><div class="progress-fill" style="width:' + l.progress + '%;background:' + (l.progress >= 100 ? '#2fb872' : l.progress > 50 ? '#e09800' : 'var(--accent)') + ';"></div></div>' +
          '<span style="font-size:12px;font-family:\'JetBrains Mono\',monospace;color:var(--text-muted);min-width:36px;text-align:right;">' + l.progress + '%</span>' +
        '</div>' +
        deadlineDiv +
        '<div style="font-size:11px;color:var(--text-muted);margin-top:6px;display:flex;justify-content:space-between;">' +
          '<span>' + (l.totalReadTime ? formatMinutes(l.totalReadTime) : '') + '</span>' +
          '<span>' + (l.pageProgress ? l.pageProgress.current + '/' + l.pageProgress.total + escapeHtml(' pages') : '') + '</span>' +
        '</div>' +
      '</div>';
    }).join('')}
  </div>`;
}

// ============================================================
// 表格视图渲染
// ============================================================

/**
 * 渲染文献表格视图
 * 以表格形式展示文献列表，适合查看大量文献
 * @param {Array} items 文献列表
 * @returns {string} 表格视图的HTML字符串
 */
function renderLibraryTable(items) {
  // 空状态处理
  if (!items.length) {
    return `<div class="empty-state"><p>${escapeHtml(t('noLitFound'))}</p></div>`;
  }

  return `<div class="card" style="overflow-x:auto;">
    <table class="data-table">
      <thead>
        <tr>
          <th>${escapeHtml(t('thTitle'))}</th>
          <th>${escapeHtml(t('thStatus'))}</th>
          <th>${escapeHtml(t('thProgress'))}</th>
          <th>${escapeHtml(t('thPriority'))}</th>
          <th>${escapeHtml(t('thYear'))}</th>
          <th>${escapeHtml(t('thJournal'))}</th>
          <th>${escapeHtml(t('thTime'))}</th>
          <th>${escapeHtml(t('thDeadline'))}</th>
        </tr>
      </thead>
      <tbody>
      ${items.map(l => {
        const safeId = escapeAttr(l.id);
        const authorFirst = escapeHtml((l.authors || '').split(',')[0]);
        const dlColor = (l.deadline && daysUntil(l.deadline) < 0) ? '#d4354f' : 'var(--text-muted)';
        const dlText = l.deadline ? formatDate(l.deadline) : '—';

        return '<tr data-lit-id="' + safeId + '" class="lib-table-row">' +
          '<td style="max-width:280px;">' +
            '<div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(l.title) + '</div>' +
            '<div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + authorFirst + ' et al.</div>' +
          '</td>' +
          '<td><span class="badge ' + STATUS_MAP[l.status].badge + '">' + escapeHtml(STATUS_MAP[l.status].label) + '</span></td>' +
          '<td style="width:110px;">' +
            '<div style="display:flex;align-items:center;gap:6px;">' +
              '<div class="progress-bar" style="flex:1;"><div class="progress-fill" style="width:' + l.progress + '%;background:' + (l.progress >= 100 ? '#2fb872' : 'var(--accent)') + ';"></div></div>' +
              '<span style="font-size:11px;font-family:\'JetBrains Mono\',monospace;color:var(--text-muted);">' + l.progress + '%</span>' +
            '</div>' +
          '</td>' +
          '<td><span class="' + PRIORITY_MAP[l.priority].class + '" style="font-size:12px;">' + escapeHtml(PRIORITY_MAP[l.priority].icon + ' ' + PRIORITY_MAP[l.priority].label) + '</span></td>' +
          '<td style="font-size:13px;">' + escapeHtml(l.year || '') + '</td>' +
          '<td style="font-size:13px;max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(l.journal || '') + '</td>' +
          '<td style="font-size:12px;color:var(--text-muted);font-family:\'JetBrains Mono\',monospace;">' + formatMinutes(l.totalReadTime) + '</td>' +
          '<td style="font-size:12px;">' + (l.deadline ? '<span style="color:' + dlColor + ';">' + dlText + '</span>' : '—') + '</td>' +
        '</tr>';
      }).join('')}
      </tbody>
    </table>
  </div>`;
}

// ============================================================
// 批量选择辅助函数
// ============================================================

function _toggleSelection(el, litId) {
  if (_selectedLitIds.has(litId)) {
    _selectedLitIds.delete(litId);
    el.classList.remove('lit-selected');
  } else {
    _selectedLitIds.add(litId);
    el.classList.add('lit-selected');
  }
}

function _clearAllSelectionStyles() {
  document.querySelectorAll('.lit-selected').forEach(el => el.classList.remove('lit-selected'));
}

// ============================================================
// 模块导出
// ============================================================

if (typeof window !== 'undefined') {
  window.renderLibrary = renderLibrary;
  window.renderLibraryCards = renderLibraryCards;
  window.renderLibraryTable = renderLibraryTable;
}
