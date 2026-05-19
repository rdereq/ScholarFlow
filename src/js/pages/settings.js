/**
 * ============================================================
 * ScholarFlow - Settings Page Module
 * ============================================================
 * 
 * 本模块负责渲染设置页面，包括：
 * - 阅读目标设置（每日、每周、每月）
 * - 文件夹管理
 * - 数据备份与导出
 * - 标签管理
 * 
 * @module pages/settings
 * @version 1.0.0
 */

// ============================================================
// 主渲染函数
// ============================================================

/**
 * 渲染设置页面
 * 显示所有可配置的设置选项
 */
function renderSettingsPage() {
  const page = document.getElementById('page-settings');

  // 生成页面HTML
  page.innerHTML = `
    <div class="animate-in">
      <h1 class="section-title" style="margin-bottom:20px;">${escapeHtml(t('settingsTitle'))}</h1>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <!-- 阅读目标设置 -->
        <div class="card">
          <div class="card-header"><span style="font-weight:600;">${escapeHtml(t('readingGoals'))}</span></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('dailyGoal'))}</label>
              <input type="number" class="input" id="setGoalDaily" value="${appData.goals.daily}" min="1">
            </div>
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('weeklyGoalSetting'))}</label>
              <input type="number" class="input" id="setGoalWeekly" value="${appData.goals.weekly}" min="1">
            </div>
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('weeklyHoursGoal'))}</label>
              <input type="number" class="input" id="setGoalWeeklyH" value="${appData.goals.weeklyHours}" min="1">
            </div>
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('monthlyHoursGoal'))}</label>
              <input type="number" class="input" id="setGoalMonthlyH" value="${appData.goals.monthlyHours}" min="1">
            </div>
          </div>
        </div>

        <!-- 文件夹管理 -->
        <div class="card">
          <div class="card-header">
            <span style="font-weight:600;">${escapeHtml(t('folders'))}</span>
            <button class="btn btn-primary btn-sm" id="addFolderBtn">${escapeHtml(t('addFolder'))}</button>
          </div>
          <div class="card-body" id="foldersSettings"></div>
        </div>

        <!-- 数据备份与导出 -->
        <div class="card">
          <div class="card-header"><span style="font-weight:600;">${escapeHtml(t('dataBackup'))}</span></div>
          <div class="card-body">
            <div style="display:flex;flex-direction:column;gap:8px;">
              <button class="btn btn-secondary" id="exportBackupBtn" style="justify-content:center;">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                ${escapeHtml(t('fullBackupJson'))}
              </button>
              <button class="btn btn-secondary" id="exportBibtexBtn" style="justify-content:center;">${escapeHtml(t('exportBibtex'))}</button>
              <button class="btn btn-secondary" id="exportNotesMdBtn" style="justify-content:center;">${escapeHtml(t('exportAllNotesMd'))}</button>
              <label class="btn btn-secondary" style="justify-content:center;cursor:pointer;" id="importBackupLabel">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4 4m0 0l4-4m-4 4V4"/></svg>
                ${escapeHtml(t('importBackup'))}
                <input type="file" accept=".json" style="display:none;" id="importFileInput">
              </label>
            </div>
          </div>
        </div>

        <!-- 标签管理 -->
        <div class="card">
          <div class="card-header"><span style="font-weight:600;">${escapeHtml(t('tagsManagement'))}</span></div>
          <div class="card-body" id="settingsTagsBody"></div>
        </div>

        <!-- 软件更新 -->
        <div class="card">
          <div class="card-header"><span style="font-weight:600;">${escapeHtml(t('softwareUpdate') || '软件更新')}</span></div>
          <div class="card-body">
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div>
                  <div style="font-size:13px;font-weight:500;color:var(--text-primary);">${escapeHtml(t('currentVersion') || '当前版本')}</div>
                  <div id="currentVersionDisplay" style="font-size:12px;color:var(--text-muted);">v1.0.0</div>
                </div>
                <button class="btn btn-primary" id="checkUpdateBtn" style="min-width:100px;">
                  ${escapeHtml(t('checkUpdate') || '检查更新')}
                </button>
              </div>
              <div id="updateStatusArea" style="font-size:12px;color:var(--text-secondary);display:none;"></div>
              
              <!-- 更新源选择 -->
              <div style="border-top:1px solid var(--border-light);padding-top:12px;margin-top:4px;">
                <div style="font-size:13px;font-weight:500;color:var(--text-primary);margin-bottom:8px;">${escapeHtml(t('updateSource') || '更新源')}</div>
                <select id="updateSourceSelect" class="input" style="margin-bottom:8px;">
                  <option value="github">GitHub（需科学上网）</option>
                  <option value="mirror">GitHub 镜像（推荐国内用户）</option>
                  <option value="custom">自定义服务器</option>
                </select>
                <div id="customUrlArea" style="display:none;">
                  <input type="text" id="customUpdateUrl" class="input" placeholder="https://your-server.com/updates" style="margin-bottom:8px;">
                </div>
                <div id="updateSourceDesc" style="font-size:11px;color:var(--text-muted);"></div>
              </div>
              
              <div style="font-size:11px;color:var(--text-muted);line-height:1.5;">
                ${escapeHtml(t('autoUpdateDesc') || '软件会自动检查更新。发现新版本时会自动下载并提示安装。')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // 附加事件监听器
  attachSettingsListeners();

  // 渲染文件夹列表
  renderFoldersList();

  // 渲染标签列表
  renderTagsList();

  // 动态获取并显示当前版本号
  loadAndDisplayVersion();
}

/**
 * 加载并显示当前应用版本号
 */
async function loadAndDisplayVersion() {
  const versionEl = document.getElementById('currentVersionDisplay');
  if (!versionEl) return;

  try {
    if (window.electronAPI?.app?.getVersion) {
      const version = await window.electronAPI.app.getVersion();
      versionEl.textContent = 'v' + version;
    }
  } catch (e) {
    console.log('[Settings] 获取版本号失败');
  }
}

// ============================================================
// 事件监听器
// ============================================================

/**
 * 为设置页面附加事件监听器
 */
function attachSettingsListeners() {
  // 目标设置绑定
  const bindGoal = (id, key) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        appData.goals[key] = parseInt(el.value) || (key === 'daily' ? 2 : 1);
        saveData();
      });
    }
  };
  bindGoal('setGoalDaily', 'daily');
  bindGoal('setGoalWeekly', 'weekly');
  bindGoal('setGoalWeeklyH', 'weeklyHours');
  bindGoal('setGoalMonthlyH', 'monthlyHours');

  // 添加文件夹按钮
  const addFolderBtn = document.getElementById('addFolderBtn');
  if (addFolderBtn) addFolderBtn.addEventListener('click', addFolder);

  // 导出备份按钮
  const exportBackupBtn = document.getElementById('exportBackupBtn');
  if (exportBackupBtn) exportBackupBtn.addEventListener('click', exportFullBackup);

  // 导出BibTeX按钮
  const exportBibtexBtn = document.getElementById('exportBibtexBtn');
  if (exportBibtexBtn) exportBibtexBtn.addEventListener('click', exportBibTeX);

  // 导出笔记按钮
  const exportNotesMdBtn = document.getElementById('exportNotesMdBtn');
  if (exportNotesMdBtn) exportNotesMdBtn.addEventListener('click', exportAllNotes);

  // 导入备份
  const importLabel = document.getElementById('importBackupLabel');
  const importInput = document.getElementById('importFileInput');
  if (importLabel && importInput) {
    importLabel.addEventListener('click', () => importInput.click());
  }

  // 检查更新按钮
  const checkUpdateBtn = document.getElementById('checkUpdateBtn');
  if (checkUpdateBtn) checkUpdateBtn.addEventListener('click', checkForUpdate);

  // 更新源选择
  initUpdateSourceSelector();

  if (importInput) {
    importInput.addEventListener('change', importBackup);
  }
}

/**
 * 初始化更新源选择器
 */
async function initUpdateSourceSelector() {
  const selectEl = document.getElementById('updateSourceSelect');
  const customUrlArea = document.getElementById('customUrlArea');
  const customUrlInput = document.getElementById('customUpdateUrl');
  const descEl = document.getElementById('updateSourceDesc');

  if (!selectEl || !window.electronAPI?.updater?.getSources) return;

  try {
    const result = await window.electronAPI.updater.getSources();
    const { sources, current } = result;

    // 设置当前选中的更新源
    selectEl.value = current.source;

    // 显示自定义 URL 输入框（如果选择了自定义）
    if (current.source === 'custom' && customUrlArea) {
      customUrlArea.style.display = 'block';
      if (customUrlInput) customUrlInput.value = current.customUrl || '';
    }

    // 更新描述
    updateSourceDescription(current.source, sources, descEl);

    // 监听选择变化
    selectEl.addEventListener('change', async () => {
      const newSource = selectEl.value;

      // 显示/隐藏自定义 URL 输入框
      if (customUrlArea) {
        customUrlArea.style.display = newSource === 'custom' ? 'block' : 'none';
      }

      // 更新描述
      updateSourceDescription(newSource, sources, descEl);

      // 保存设置
      const customUrl = newSource === 'custom' && customUrlInput ? customUrlInput.value : '';
      await window.electronAPI.updater.setSource(newSource, customUrl);
    });

    // 监听自定义 URL 输入
    if (customUrlInput) {
      customUrlInput.addEventListener('change', async () => {
        if (selectEl.value === 'custom') {
          await window.electronAPI.updater.setSource('custom', customUrlInput.value);
        }
      });
    }
  } catch (e) {
    console.log('[Settings] 初始化更新源选择器失败:', e);
  }
}

/**
 * 更新更新源描述
 */
function updateSourceDescription(source, sources, descEl) {
  if (!descEl || !sources[source]) return;
  descEl.textContent = sources[source].description || '';
}

// ============================================================
// 文件夹列表渲染
// ============================================================

/**
 * 渲染文件夹列表
 * 显示所有文件夹及其包含的文献数量
 */
function renderFoldersList() {
  const foldersEl = document.getElementById('foldersSettings');
  if (!foldersEl) return;

  foldersEl.innerHTML = appData.folders.map(f =>
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
      '<div style="width:12px;height:12px;border-radius:3px;background:' + f.color + ';flex-shrink:0;"></div>' +
      '<span style="flex:1;font-size:14px;">' + escapeHtml(f.name) + '</span>' +
      '<span style="font-size:12px;color:var(--text-muted);">' + appData.literature.filter(l => l.folder === f.id).length + ' papers</span>' +
    '</div>'
  ).join('');
}

// ============================================================
// 标签列表渲染
// ============================================================

/**
 * 渲染标签列表
 * 显示所有标签及其关联的文献数量，支持删除标签
 */
function renderTagsList() {
  const tagsBody = document.getElementById('settingsTagsBody');
  if (!tagsBody) return;

  tagsBody.innerHTML =
    '<div style="display:flex;flex-wrap:wrap;gap:6px;">' +
    appData.tags.map(tg => {
      const safeTag = escapeAttr(tg);
      return '<span class="tag" style="display:inline-flex;align-items:center;gap:4px;">' + escapeHtml(tg) +
        ' <span style="color:var(--text-muted);font-size:10px;">' + appData.literature.filter(l => (l.tags || []).includes(tg)).length + '</span>' +
        '<button data-tag-name="' + safeTag + '" class="delete-tag-btn" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:13px;line-height:1;padding:0 2px;margin-left:2px;" title="' + escapeAttr(t('deleteTag')) + '">&times;</button></span>';
    }).join('') + '</div>';

  // 附加删除标签按钮事件
  tagsBody.querySelectorAll('.delete-tag-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteTag(btn.dataset.tagName));
  });
}

// ============================================================
// 文件夹管理
// ============================================================

/**
 * 添加新文件夹
 * 显示内联输入框让用户输入文件夹名称，自动分配颜色
 */
function addFolder() {
  // 检查是否已存在输入框
  if (document.getElementById('folderInputContainer')) return;

  const container = document.getElementById('foldersSettings');
  if (!container) return;

  // 创建内联输入框
  const inputContainer = document.createElement('div');
  inputContainer.id = 'folderInputContainer';
  inputContainer.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;padding:12px;background:var(--bg-secondary);border-radius:8px;border:1px solid var(--border-color);';
  inputContainer.innerHTML = `
    <input type="text" class="input" id="folderNameInput" placeholder="${escapeHtml(t('folderNamePrompt'))}" maxlength="50" style="flex:1;">
    <button class="btn btn-primary btn-sm" id="confirmAddFolder">${escapeHtml(t('save') || '保存')}</button>
    <button class="btn btn-sm" id="cancelAddFolder">${escapeHtml(t('cancel') || '取消')}</button>
  `;

  // 插入到列表开头
  container.insertBefore(inputContainer, container.firstChild);

  // 聚焦输入框
  const input = document.getElementById('folderNameInput');
  if (input) input.focus();

  // 绑定确认按钮
  document.getElementById('confirmAddFolder').addEventListener('click', () => {
    const name = input.value;
    if (!name) {
      inputContainer.remove();
      return;
    }

    // 安全修复 [SEC-011]: 清理文件夹名称，限制长度并去除首尾空白
    const cleanName = name.trim().substring(0, 50);
    if (!cleanName) {
      inputContainer.remove();
      return;
    }

    // 预定义颜色列表（使用新的 Indigo 品牌色）
    const colors = ['#4f46e5', '#d4354f', '#2fb872', '#e09800', '#7c3aed', '#06b6d4'];

    appData.folders.push({
      id: generateId(),
      name: cleanName,
      color: colors[appData.folders.length % colors.length]
    });

    saveData();
    renderSettingsPage();
  });

  // 绑定取消按钮
  document.getElementById('cancelAddFolder').addEventListener('click', () => {
    inputContainer.remove();
  });

  // 绑定回车键
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('confirmAddFolder').click();
    }
  });

  // 绑定 ESC 键
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      inputContainer.remove();
    }
  });
}

// ============================================================
// 软件更新
// ============================================================

/**
 * 手动检查更新
 */
async function checkForUpdate() {
  const btn = document.getElementById('checkUpdateBtn');
  const statusArea = document.getElementById('updateStatusArea');
  
  if (!btn || !window.electronAPI?.updater) {
    if (statusArea) {
      statusArea.style.display = 'block';
      statusArea.textContent = t('updateNotAvailable') || '更新功能仅在打包后的应用中可用';
    }
    return;
  }

  // 禁用按钮并显示检查中状态
  btn.disabled = true;
  btn.textContent = t('checking') || '检查中...';
  if (statusArea) {
    statusArea.style.display = 'block';
    statusArea.textContent = t('checkingForUpdate') || '正在检查更新...';
  }

  try {
    const result = await window.electronAPI.updater.checkNow();

    if (result.status === 'dev_mode') {
      if (statusArea) statusArea.textContent = t('updateDevMode') || '开发模式无法检查更新';
    } else if (result.status === 'checked') {
      if (statusArea) statusArea.textContent = (t('updateFound') || '发现新版本: ') + 'v' + result.version;
    } else if (result.status === 'not-available') {
      if (statusArea) statusArea.textContent = t('updateAlreadyLatest') || '已是最新版本 v' + result.version;
    } else if (result.status === 'error') {
      if (statusArea) statusArea.textContent = (t('updateCheckFailed') || '检查失败: ') + result.message;
    }
  } catch (e) {
    if (statusArea) statusArea.textContent = (t('updateCheckFailed') || '检查失败: ') + e.message;
  }

  // 恢复按钮状态
  btn.disabled = false;
  btn.textContent = t('checkUpdate') || '检查更新';
}

// ============================================================
// 模块导出
// ============================================================

if (typeof window !== 'undefined') {
  window.renderSettingsPage = renderSettingsPage;
  window.addFolder = addFolder;
  window.checkForUpdate = checkForUpdate;
}
