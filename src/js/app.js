/**
 * ============================================================
 * ScholarFlow - Application Core Module
 * ============================================================
 * 
 * 本模块是应用程序的核心，负责管理：
 * - 应用状态（当前页面、详情ID、视图模式等）
 * - 页面导航和路由
 * - 侧边栏和顶部栏渲染
 * - 主题切换
 * - 全局搜索
 * - 模态框控制
 * 
 * @module app
 * @version 1.0.0
 */

// ============================================================
// 应用状态
// ============================================================

/**
 * 当前显示的页面
 * @type {string}
 */
let currentPage = 'dashboard';

/**
 * 当前查看的文献详情ID
 * @type {string|null}
 */
let currentDetailId = null;

/**
 * 文献库视图模式
 * 'card' = 卡片视图, 'table' = 表格视图
 * @type {string}
 */
let libraryView = 'card';

/**
 * 文献库过滤器配置
 * @type {Object}
 */
let libraryFilters = {
  status: 'all',   // 状态过滤
  priority: 'all', // 优先级过滤
  folder: 'all',   // 文件夹过滤
  tag: 'all',      // 标签过滤
  sort: 'lastReadAt' // 排序方式
};

/**
 * 图表实例存储对象
 * 用于管理页面上的 ECharts 实例，便于销毁和重建
 * @type {Object}
 */
let chartInstances = {};

// ============================================================
// 页面导航
// ============================================================

/**
 * 切换页面
 * 根据页面名称显示对应的内容，并触发相应的渲染函数
 * @param {string} page 页面名称 (dashboard, library, detail, notes, stats, settings)
 * @param {string} [litId] 文献ID（仅在 detail 页面时需要）
 */
function switchPage(page, litId) {
  // 安全修复 [ELEC-013]: 页面切换时销毁旧图表实例并清理 resize 监听器，防止内存泄漏
  Object.entries(chartInstances).forEach(([key, chart]) => {
    if (chart && !chart.isDisposed()) chart.dispose();
    removeChartResize(key);
  });
  chartInstances = {};

  currentPage = page;

  // 隐藏所有页面
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // 显示目标页面
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  // 更新侧边栏激活状态
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  // 根据页面类型调用对应的渲染函数
  if (page === 'detail' && litId) {
    currentDetailId = litId;
    renderDetailPage(litId);
  } else if (page === 'dashboard') {
    renderDashboard();
  } else if (page === 'library') {
    renderLibrary();
  } else if (page === 'notes') {
    renderNotesPage();
  } else if (page === 'stats') {
    renderStatsPage();
  } else if (page === 'settings') {
    renderSettingsPage();
  }

  // 关闭移动端侧边栏
  document.getElementById('sidebar').classList.remove('open');
}

/**
 * 切换侧边栏显示状态（移动端）
 * 在移动设备上显示/隐藏侧边栏
 */
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  sb.classList.toggle('open');
  document.querySelector('.mobile-overlay').classList.toggle('hidden');
}

// ============================================================
// 主题管理
// ============================================================

/**
 * 切换明暗主题
 * 在亮色和暗色主题之间切换，并保存设置
 */
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  appData.settings.theme = next;
  saveData();

  // 重新渲染图表以适应新主题
  Object.values(chartInstances).forEach(c => {
    if (c && !c.isDisposed()) c.dispose();
  });
  chartInstances = {};

  if (currentPage === 'dashboard') renderDashboard();
  else if (currentPage === 'stats') renderStatsPage();
}

// ============================================================
// 模态框控制
// ============================================================

/**
 * 打开模态框
 * @param {string} id 模态框元素的ID
 */
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

/**
 * 关闭模态框
 * @param {string} id 模态框元素的ID
 */
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

/**
 * 打开添加文献模态框
 * 初始化表单并显示模态框
 */
function openAddLiteratureModal() {
  document.getElementById('addLitModalTitle').textContent = t('addLitTitle');
  renderAddLitForm();
  openModal('addLitModal');
}

// ============================================================
// 全局搜索
// ============================================================

/**
 * 处理全局搜索
 * 根据搜索关键词在文献和笔记中查找匹配项，并显示下拉结果
 * @param {string} q 搜索关键词
 */
function handleGlobalSearch(q) {
  const results = document.getElementById('searchResults');

  // 关键词太短时不显示结果
  if (!q || q.length < 2) {
    results.style.display = 'none';
    return;
  }

  const lower = q.toLowerCase();

  // 在文献中搜索
  const litMatches = appData.literature.filter(l =>
    l.title.toLowerCase().includes(lower) ||
    l.authors.toLowerCase().includes(lower) ||
    (l.keywords || []).some(k => k.toLowerCase().includes(lower)) ||
    (l.abstract || '').toLowerCase().includes(lower)
  ).slice(0, 5);

  // 在笔记中搜索
  const noteMatches = appData.notes.filter(n =>
    n.title.toLowerCase().includes(lower) ||
    n.content.toLowerCase().includes(lower) ||
    (n.tags || []).some(t => t.toLowerCase().includes(lower))
  ).slice(0, 3);

  // 没有匹配结果时隐藏下拉框
  if (litMatches.length === 0 && noteMatches.length === 0) {
    results.style.display = 'none';
    return;
  }

  // 构建搜索结果HTML
  let html = '';

  // 文献结果
  if (litMatches.length) {
    html += `<div style="padding:8px 16px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">${escapeHtml(t('literature'))}</div>`;
    litMatches.forEach(l => {
      const safeId = escapeAttr(l.id);
      html += `<div style="padding:8px 16px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:background 0.1s;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''" data-lit-id="${safeId}" class="search-result-lit">
        <span class="badge ${STATUS_MAP[l.status].badge}" style="flex-shrink:0;">${escapeHtml(STATUS_MAP[l.status].label)}</span>
        <div style="min-width:0;"><div style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(l.title)}</div><div style="font-size:12px;color:var(--text-muted);">${escapeHtml((l.authors || '').split(',')[0])} et al. &middot; ${escapeHtml(l.year)}</div></div>
      </div>`;
    });
  }

  // 笔记结果
  if (noteMatches.length) {
    html += `<div style="padding:8px 16px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;border-top:1px solid var(--border-light);">${escapeHtml(t('notes'))}</div>`;
    noteMatches.forEach(n => {
      const lit = appData.literature.find(l => l.id === n.litId);
      html += `<div style="padding:8px 16px;cursor:pointer;transition:background 0.1s;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''" class="search-result-note">
        <div style="font-size:14px;font-weight:500;">${escapeHtml(n.title)}</div>
        <div style="font-size:12px;color:var(--text-muted);">${lit ? escapeHtml(lit.title.slice(0, 40)) + '...' : ''}</div>
      </div>`;
    });
  }

  results.innerHTML = html;

  // 安全地附加事件监听器
  results.querySelectorAll('.search-result-lit').forEach(el => {
    el.addEventListener('click', () => {
      results.style.display = 'none';
      document.getElementById('globalSearch').value = '';
      switchPage('detail', el.dataset.litId);
    });
  });

  results.querySelectorAll('.search-result-note').forEach(el => {
    el.addEventListener('click', () => {
      results.style.display = 'none';
      document.getElementById('globalSearch').value = '';
      switchPage('notes');
    });
  });
}

// 点击外部关闭搜索结果
 document.addEventListener('click', e => {
  if (!e.target.closest('#searchResults') && !e.target.closest('#globalSearch')) {
    document.getElementById('searchResults').style.display = 'none';
  }
});

// ============================================================
// 侧边栏渲染
// ============================================================

/**
 * 渲染侧边栏
 * 根据当前语言和页面状态生成侧边栏内容
 */
function renderSidebar() {
  const sb = document.getElementById('sidebar');
  sb.innerHTML = `
    <div style="padding: 20px 20px 12px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:36px;height:36px;background:var(--accent);border-radius:10px;display:flex;align-items:center;justify-content:center;">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#fff" stroke-width="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
        </div>
        <div>
          <div style="font-family:'Crimson Pro',serif;font-size:20px;font-weight:600;letter-spacing:-0.02em;">ScholarFlow</div>
          <div style="font-size:11px;color:var(--text-muted);">${t('literatureTracker')}</div>
        </div>
      </div>
    </div>
    <div style="padding:8px 0;flex:1;overflow-y:auto;">
      <div style="padding:0 12px 8px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;">${t('navMain')}</div>
      <div class="nav-item ${currentPage === 'dashboard' ? 'active' : ''}" onclick="switchPage('dashboard')" data-page="dashboard">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-2a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z"/></svg>
        ${t('navDashboard')}
      </div>
      <div class="nav-item ${currentPage === 'library' ? 'active' : ''}" onclick="switchPage('library')" data-page="library">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
        ${t('navLibrary')}
      </div>
      <div class="nav-item ${currentPage === 'notes' ? 'active' : ''}" onclick="switchPage('notes')" data-page="notes">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        ${t('navNotes')}
      </div>
      <div class="nav-item ${currentPage === 'stats' ? 'active' : ''}" onclick="switchPage('stats')" data-page="stats">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
        ${t('navStats')}
      </div>
      <div style="padding:16px 12px 8px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;">${t('navSystem')}</div>
      <div class="nav-item ${currentPage === 'settings' ? 'active' : ''}" onclick="switchPage('settings')" data-page="settings">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>
        ${t('navSettings')}
      </div>
    </div>
    <div class="sidebar-bottom">
      <div class="sidebar-user" onclick="toggleUserPanel()" style="cursor:pointer;" title="${escapeHtml(t('userManagement'))}">
        <div class="sidebar-avatar" id="sidebarAvatar" style="background:var(--accent);">R</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name" id="sidebarUserName">${escapeHtml(t('researcher'))}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:4px;">
        <button class="btn-icon" onclick="setLang(currentLang==='en'?'zh':'en')" title="切换语言/Language" style="border:none;font-size:12px;font-weight:600;width:30px;height:30px;">${currentLang === 'zh' ? 'EN' : '中'}</button>
        <button class="btn-icon" onclick="toggleTheme()" title="Toggle theme" style="border:none;">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
        </button>
      </div>
    </div>
    <!-- 用户管理面板 -->
    <div id="userPanel" class="user-panel" style="display:none;"></div>
  `;
}

// ============================================================
// 用户管理
// ============================================================

// 预设头像颜色
const AVATAR_COLORS = ['#3399ff', '#6c5ce7', '#00b894', '#e17055', '#d63031', '#00cec9', '#e84393', '#6d4c41'];

let userPanelOpen = false;

/**
 * 切换用户管理面板
 */
async function toggleUserPanel() {
  const panel = document.getElementById('userPanel');
  if (userPanelOpen) {
    panel.style.display = 'none';
    userPanelOpen = false;
    return;
  }
  await renderUserPanel();
  panel.style.display = 'block';
  userPanelOpen = true;
}

/**
 * 渲染用户管理面板
 */
async function renderUserPanel() {
  const panel = document.getElementById('userPanel');
  const currentUser = await window.electronAPI.user.getCurrent();
  const users = await window.electronAPI.user.list();
  const currentId = currentUser ? currentUser.id : '';

  panel.innerHTML = `
    <div style="padding:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <span style="font-size:14px;font-weight:600;color:var(--text-primary);">${escapeHtml(t('userManagement'))}</span>
        <button class="btn-icon" onclick="toggleUserPanel()" style="border:none;width:24px;height:24px;font-size:16px;color:var(--text-muted);">×</button>
      </div>
      <div id="userList" style="display:flex;flex-direction:column;gap:6px;max-height:240px;overflow-y:auto;">
        ${users.map(u => `
          <div class="user-card ${u.id === currentId ? 'active' : ''}" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;border:1px solid var(--border-color);cursor:pointer;transition:all 0.15s;">
            <div style="width:32px;height:32px;border-radius:8px;background:${escapeAttr(u.avatarColor || '#3399ff')};display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:600;flex-shrink:0;">${escapeHtml((u.name || '?')[0].toUpperCase())}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:500;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(u.name)}</div>
              ${u.id === currentId ? `<div style="font-size:11px;color:var(--accent);">${escapeHtml(t('currentUser'))}</div>` : ''}
            </div>
            ${u.id !== currentId ? `
              <button class="btn-icon" onclick="event.stopPropagation();switchUser('${escapeAttr(u.id)}')" style="border:none;width:28px;height:28px;font-size:11px;color:var(--accent);flex-shrink:0;" title="${escapeHtml(t('switchUser'))}">${escapeHtml(t('switchUser'))}</button>
              <button class="btn-icon" onclick="event.stopPropagation();deleteUser('${escapeAttr(u.id)}','${escapeAttr(u.name)}')" style="border:none;width:28px;height:28px;font-size:11px;color:var(--text-muted);flex-shrink:0;" title="${escapeHtml(t('deleteUser'))}">×</button>
            ` : ''}
          </div>
        `).join('')}
      </div>
      <div id="userCreateArea" style="margin-top:10px;"></div>
      <button class="btn btn-primary" onclick="showCreateUserForm()" style="width:100%;margin-top:8px;padding:8px;font-size:13px;">+ ${escapeHtml(t('createUser'))}</button>
    </div>
  `;
}

/**
 * 显示创建用户表单
 */
function showCreateUserForm() {
  const area = document.getElementById('userCreateArea');
  if (!area) return;
  area.innerHTML = `
    <div style="padding:10px;background:var(--bg-secondary);border-radius:8px;border:1px solid var(--border-color);">
      <div style="margin-bottom:8px;">
        <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px;">${escapeHtml(t('userName'))}</label>
        <div style="display:flex;gap:6px;align-items:center;">
          <input type="text" class="input" id="newUserName" placeholder="${escapeHtml(t('userNamePlaceholder'))}" maxlength="12" style="flex:1;padding:6px 10px;font-size:13px;" oninput="document.getElementById('nameCharCount').textContent=this.value.length+'/12'">
          <span id="nameCharCount" style="font-size:11px;color:var(--text-muted);min-width:30px;">0/12</span>
        </div>
      </div>
      <div style="margin-bottom:8px;">
        <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px;">${escapeHtml(t('avatarColor'))}</label>
        <div style="display:flex;gap:6px;">
          ${AVATAR_COLORS.map((c, i) => `<div class="avatar-color-option" onclick="selectAvatarColor(this,'${c}')" data-color="${c}" style="width:24px;height:24px;border-radius:6px;background:${c};cursor:pointer;border:2px solid ${i === 0 ? 'var(--text-primary)' : 'transparent'};transition:border 0.15s;"></div>`).join('')}
        </div>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn btn-primary" onclick="createUser()" style="flex:1;padding:6px;font-size:13px;">${escapeHtml(t('save'))}</button>
        <button class="btn" onclick="document.getElementById('userCreateArea').innerHTML=''" style="flex:1;padding:6px;font-size:13px;">${escapeHtml(t('cancel'))}</button>
      </div>
    </div>
  `;
  // 聚焦输入框
  setTimeout(() => { const input = document.getElementById('newUserName'); if (input) input.focus(); }, 50);
}

let selectedAvatarColor = AVATAR_COLORS[0];

function selectAvatarColor(el, color) {
  selectedAvatarColor = color;
  document.querySelectorAll('.avatar-color-option').forEach(e => e.style.border = '2px solid transparent');
  el.style.border = '2px solid var(--text-primary)';
}

/**
 * 创建新用户
 */
async function createUser() {
  const nameInput = document.getElementById('newUserName');
  const name = nameInput ? nameInput.value.trim() : '';
  if (!name) {
    alert(t('userNameRequired'));
    return;
  }
  if (name.length > 12) {
    alert(t('userNameTooLong'));
    return;
  }
  const result = await window.electronAPI.user.create(name, selectedAvatarColor);
  if (result.error) {
    alert(result.error);
    return;
  }
  // 切换到新用户
  await switchUser(result.user.id);
}

/**
 * 切换用户
 */
async function switchUser(userId) {
  const result = await window.electronAPI.user.switch(userId);
  if (result.error) {
    alert(result.error);
    return;
  }
  // 重新初始化当前用户数据
  await initCurrentUser();
  // 重新加载数据
  const loaded = await loadData();
  if (!loaded) {
    // 新用户无数据，初始化空数据
    appData.literature = [];
    appData.notes = [];
    appData.tags = [];
    appData.folders = [];
    appData.readingSessions = [];
    appData.goals = { daily: 2, weekly: 10, weeklyHours: 10, monthlyHours: 20 };
    appData.settings = { theme: document.documentElement.getAttribute('data-theme') || 'light', noteTemplates: [] };
  }
  // 刷新界面
  renderSidebar();
  renderTopbar();
  switchPage('dashboard');
  // 关闭面板
  userPanelOpen = false;
  document.getElementById('userPanel').style.display = 'none';
}

/**
 * 删除用户
 */
async function deleteUser(userId, userName) {
  if (!confirm(t('deleteUserConfirm'))) return;
  const result = await window.electronAPI.user.delete(userId);
  if (result.error) {
    alert(result.error);
    return;
  }
  // 刷新用户面板
  await renderUserPanel();
}

/**
 * 更新侧边栏用户显示
 */
async function updateSidebarUser() {
  const currentUser = await window.electronAPI.user.getCurrent();
  if (!currentUser) return;
  const avatar = document.getElementById('sidebarAvatar');
  const nameEl = document.getElementById('sidebarUserName');
  if (avatar) {
    avatar.style.background = currentUser.avatarColor || 'var(--accent)';
    avatar.textContent = (currentUser.name || '?')[0].toUpperCase();
  }
  if (nameEl) {
    nameEl.textContent = currentUser.name;
  }
}

// ============================================================
// 顶部栏渲染
// ============================================================

/**
 * 渲染顶部栏
 * 根据当前语言生成顶部栏内容，包括搜索框和添加按钮
 */
function renderTopbar() {
  const tb = document.getElementById('topbar');
  tb.innerHTML = `
    <button class="mobile-menu-btn btn-icon" onclick="toggleSidebar()" style="display:none;">
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
    </button>
    <div style="position:relative;flex:1;max-width:480px;">
      <input type="text" class="input input-search" placeholder="${t('searchPlaceholder')}" id="globalSearch" oninput="handleGlobalSearch(this.value)">
    </div>
    <div style="flex:1;"></div>
    <div style="display:flex;align-items:center;gap:8px;">
      <button class="btn btn-primary" onclick="openAddLiteratureModal()">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 4v16m8-8H4"/></svg>
        ${t('addLiterature')}
      </button>
    </div>
  `;
}

// ============================================================
// 引用功能 — 快捷导出（简化版，替代复杂弹窗）
// ============================================================

/** 当前默认引用格式 */
let citationFormat = localStorage.getItem('citation_default_format') || 'APA 7th';

/**
 * 快捷复制选中文献的引用到剪贴板
 * 优先使用批量选择集，否则使用单篇文献
 */
function handleQuickCopyCitations() {
  // 尝试获取 library.js 中的选中集
  let items;
  if (typeof _selectedLitIds !== 'undefined' && _selectedLitIds.size > 0) {
    items = appData.literature.filter(l => _selectedLitIds.has(l.id));
  } else {
    items = appData.literature;
  }

  if (!items.length) {
    console.log('[Citation] 无文献可导出');
    return;
  }

  const fmt = citationFormat || 'APA 7th';
  let lines;
  try {
    lines = window.Citation.generateList(items, fmt);
  } catch (e) {
    console.error('[Citation] 生成失败:', e);
    return;
  }

  const text = window.CitationExport.exportToText(lines);
  window.CitationExport.copyToClipboard(text).then(() => {
    _showCitationToast(items.length, fmt);
  }).catch(() => {
    _showCitationToast(items.length, fmt, true);
  });
}

/**
 * 导出全部文献引用为文件
 */
function handleExportAllCitations() {
  // 优先使用选中集，否则导出全部
  var items;
  if (typeof _selectedLitIds !== 'undefined' && _selectedLitIds.size > 0) {
    items = appData.literature.filter(function (l) { return _selectedLitIds.has(l.id); });
  } else {
    items = appData.literature || [];
  }
  if (!items.length) return;

  // 读取导出格式
  var expSel = document.getElementById('citation-quick-export');
  var expType = expSel ? expSel.value : 'txt';

  // 数据导出格式（非引用格式化的格式）直接使用 ImportExport 模块
  var dataFormats = {
    ris: { ext: 'ris', mime: 'application/x-research-info-systems' },
    endnote: { ext: 'xml', mime: 'application/xml' },
    csv: { ext: 'csv', mime: 'text/csv' },
    json: { ext: 'json', mime: 'application/json' }
  };
  if (dataFormats[expType] && window.ImportExport) {
    var result = window.ImportExport.exportByFormat(items, expType);
    if (result && result.content) {
      var fname = 'ScholarFlow_' + new Date().toISOString().split('T')[0] + '.' + (result.ext || dataFormats[expType].ext);
      if (typeof window.downloadFile === 'function') {
        window.downloadFile(fname, result.content, result.mime || dataFormats[expType].mime);
      }
      return;
    }
  }

  // 引用导出格式（txt/md/doc/bib）使用原有 Citation 引擎
  var fmt = citationFormat || 'APA 7th';
  var lines = window.Citation.generateList(items, fmt);

  var text, filename, mime;
  if (expType === 'md') {
    text = window.CitationExport.exportToMarkdown(lines, true);
    filename = 'references.md'; mime = 'text/markdown';
  } else if (expType === 'doc') {
    text = window.CitationExport.exportToWord(lines, true);
    filename = 'references.doc.html'; mime = 'text/html';
  } else if (expType === 'bib') {
    text = window.CitationExport.exportToBibTeX(items);
    filename = 'references.bib'; mime = 'text/plain';
  } else {
    text = window.CitationExport.exportToText(lines);
    filename = 'references.txt'; mime = 'text/plain;charset=utf-8';
  }

  if (typeof window.downloadFile === 'function') {
    window.downloadFile(filename, text, mime);
  }
}

/**
 * 详情页复制单篇文献引用
 */
function handleCopyCitationForDetail(litId) {
  var lit = appData.literature.find(function (l) { return l.id === litId; });
  if (!lit) return;
  var fmt = citationFormat || 'APA 7th';
  var lines = window.Citation.generateList([lit], fmt);
  var text = window.CitationExport.exportToText(lines);
  window.CitationExport.copyToClipboard(text).then(function () {
    _showCitationToast(1, fmt);
  }).catch(function () {
    _showCitationToast(1, fmt, true);
  });
}

/**
 * Toast 提示
 */
function _showCitationToast(count, fmt, isError) {
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#2fb872;color:#fff;padding:10px 24px;border-radius:8px;font-size:14px;z-index:50000;box-shadow:0 4px 16px rgba(0,0,0,0.2);transition:opacity 0.3s;';
  if (isError) {
    toast.style.background = '#e74c3c';
    toast.textContent = '❌ 复制失败，请手动复制';
  } else {
    toast.textContent = '✅ 已复制 ' + count + ' 条引用 (' + fmt + ')';
  }
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// ============================================================
// 模块导出
// ============================================================

if (typeof window !== 'undefined') {
  window.currentPage = currentPage;
  window.currentDetailId = currentDetailId;
  window.libraryView = libraryView;
  window.libraryFilters = libraryFilters;
  window.chartInstances = chartInstances;
  window.switchPage = switchPage;
  window.toggleSidebar = toggleSidebar;
  window.toggleTheme = toggleTheme;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.openAddLiteratureModal = openAddLiteratureModal;
  window.handleGlobalSearch = handleGlobalSearch;
  window.renderSidebar = renderSidebar;
  window.renderTopbar = renderTopbar;
  // 引用功能
  window.showCitationContextMenu = showCitationContextMenu;
  window.citationFormat = citationFormat;
  window.handleQuickCopyCitations = handleQuickCopyCitations;
  window.handleExportAllCitations = handleExportAllCitations;
  window.handleCopyCitationForDetail = handleCopyCitationForDetail;
}

// ============================================================
// 引用功能 — 右键菜单（T04）
// ============================================================

let _contextMenuEl = null;

function showCitationContextMenu(x, y, selectedItems) {
  if (_contextMenuEl) {
    _contextMenuEl.parentNode?.removeChild(_contextMenuEl);
    _contextMenuEl = null;
  }

  const count = selectedItems.length;

  _contextMenuEl = document.createElement('div');
  _contextMenuEl.setAttribute('data-citation-ui', 'context-menu');
  _contextMenuEl.style.cssText = 'position:fixed;z-index:20000;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.14);padding:6px 0;min-width:240px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;color:#1f2937;';

  // 防溢出定位
  const menuW = 260, menuH = 110;
  _contextMenuEl.style.left = Math.min(x, window.innerWidth - menuW - 8) + 'px';
  _contextMenuEl.style.top = Math.min(y, window.innerHeight - menuH - 8) + 'px';

  // 菜单项
  const citeLabel = count > 1 ? '📋 生成所选文献引用（' + count + ' 篇）' : '📋 生成此文献引用';
  _contextMenuEl.appendChild(_makeMenuItem(citeLabel, () => {
    window.CitationUI.showModal(selectedItems);
    _destroyCitationMenu();
  }));

  _contextMenuEl.appendChild(_makeMenuItem('📤 导出参考文献列表', () => {
    _exportAllCitations();
    _destroyCitationMenu();
  }));

  document.body.appendChild(_contextMenuEl);

  setTimeout(() => {
    document.addEventListener('click', _onDocClickForMenu, { once: true });
    document.addEventListener('contextmenu', _onDocClickForMenu, { once: true });
  }, 0);
}

function _makeMenuItem(label, onClick) {
  const item = document.createElement('div');
  item.textContent = label;
  item.style.cssText = 'padding:10px 16px;cursor:pointer;white-space:nowrap;';
  item.addEventListener('mouseenter', () => { item.style.background = '#f3f4f6'; });
  item.addEventListener('mouseleave', () => { item.style.background = ''; });
  item.addEventListener('click', onClick);
  return item;
}

function _onDocClickForMenu(e) {
  if (_contextMenuEl && !_contextMenuEl.contains(e.target)) {
    _destroyCitationMenu();
  }
}

function _destroyCitationMenu() {
  if (_contextMenuEl) {
    _contextMenuEl.parentNode?.removeChild(_contextMenuEl);
    _contextMenuEl = null;
  }
}

function _exportAllCitations() {
  const items = window.appData?.literature || [];
  if (!items.length) return;
  const fmt = localStorage.getItem('citation_default_format') || 'APA 7th';
  const lines = window.Citation.generateList(items, fmt);
  const text = window.CitationExport.exportToText(lines);
  if (typeof window.downloadFile === 'function') {
    window.downloadFile('references.txt', text, 'text/plain');
  }
}
