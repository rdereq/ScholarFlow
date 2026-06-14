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
 * - DOI 元数据源设置（mailto、CNKI Token）
 * - 软件更新
 *
 * @module pages/settings
 * @version 1.4.0
 */

// ============================================================
// 辅助工具函数
// ============================================================

/**
 * 安全获取 settings 对象，确保关键字段存在
 */
function getSafeSettings() {
  try {
    if (!appData.settings || typeof appData.settings !== 'object') {
      appData.settings = { theme: 'light', noteTemplates: [] };
    }
    return appData.settings;
  } catch (e) {
    return { theme: 'light', noteTemplates: [] };
  }
}

/**
 * 安全获取 goals 对象
 */
function getSafeGoals() {
  try {
    if (!appData.goals || typeof appData.goals !== 'object') {
      appData.goals = { daily: 2, weekly: 10, weeklyHours: 10, monthlyHours: 20 };
    }
    return appData.goals;
  } catch (e) {
    return { daily: 2, weekly: 10, weeklyHours: 10, monthlyHours: 20 };
  }
}



// ============================================================
// 主渲染函数
// ============================================================

/**
 * 渲染设置页面
 * 显示所有可配置的设置选项
 */
function renderSettingsPage() {
  try {
    const page = document.getElementById('page-settings');
    if (!page) {
      console.error('[settings] page-settings element not found');
      return;
    }

    const settings = getSafeSettings();
    const goals = getSafeGoals();

    // 生成页面 HTML - 使用字符串拼接（避免模板字符串中可能出现的特殊字符问题）
    var html = '<div class="animate-in">';

    // 标题
    html += '<h1 class="section-title" style="margin-bottom:20px;">' +
            escapeHtml(t('settingsTitle')) + '</h1>';

    // 网格容器开始
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">';

    // ============================================================
    // 卡片 1：阅读目标设置
    // ============================================================
    html += '<div class="card">' +
      '<div class="card-header"><span style="font-weight:600;">' +
      escapeHtml(t('readingGoals')) +
      '</span></div>' +
      '<div class="card-body">' +
        '<div class="form-group">' +
          '<label class="form-label">' + escapeHtml(t('dailyGoal')) + '</label>' +
          '<input type="number" class="input" id="setGoalDaily" value="' + (parseInt(goals.daily, 10) || 2) + '" min="1">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">' + escapeHtml(t('weeklyGoalSetting')) + '</label>' +
          '<input type="number" class="input" id="setGoalWeekly" value="' + (parseInt(goals.weekly, 10) || 10) + '" min="1">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">' + escapeHtml(t('weeklyHoursGoal')) + '</label>' +
          '<input type="number" class="input" id="setGoalWeeklyH" value="' + (parseInt(goals.weeklyHours, 10) || 10) + '" min="1">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">' + escapeHtml(t('monthlyHoursGoal')) + '</label>' +
          '<input type="number" class="input" id="setGoalMonthlyH" value="' + (parseInt(goals.monthlyHours, 10) || 20) + '" min="1">' +
        '</div>' +
      '</div>' +
    '</div>';

    // ============================================================
    // 卡片 2：文件夹管理
    // ============================================================
    html += '<div class="card">' +
      '<div class="card-header">' +
        '<span style="font-weight:600;">' + escapeHtml(t('folders')) + '</span>' +
        '<button class="btn btn-primary btn-sm" id="addFolderBtn">' + escapeHtml(t('addFolder')) + '</button>' +
      '</div>' +
      '<div class="card-body" id="foldersSettings"></div>' +
    '</div>';

    // ============================================================
    // 卡片 3：数据备份与导出
    // ============================================================
    html += '<div class="card">' +
      '<div class="card-header"><span style="font-weight:600;">' + escapeHtml(t('dataBackup')) + '</span></div>' +
      '<div class="card-body">' +
        '<div style="display:flex;flex-direction:column;gap:8px;">' +
          '<button class="btn btn-secondary" id="exportBackupBtn" style="justify-content:center;">' +
            '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">' +
              '<path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>' +
            '</svg>' +
            escapeHtml(t('fullBackupJson')) +
          '</button>' +
          '<button class="btn btn-secondary" id="exportBibtexBtn" style="justify-content:center;">' +
            escapeHtml(t('exportBibtex')) +
          '</button>' +
          '<button class="btn btn-secondary" id="exportNotesMdBtn" style="justify-content:center;">' +
            escapeHtml(t('exportAllNotesMd')) +
          '</button>' +
          '<label class="btn btn-secondary" style="justify-content:center;cursor:pointer;" id="importBackupLabel">' +
            '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">' +
              '<path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4 4m0 0l4-4m-4 4V4"/>' +
            '</svg>' +
            escapeHtml(t('importBackup')) +
            '<input type="file" accept=".json" style="display:none;" id="importFileInput">' +
          '</label>' +
        '</div>' +
      '</div>' +
    '</div>';

    // ============================================================
    // 卡片 4：标签管理
    // ============================================================
    html += '<div class="card">' +
      '<div class="card-header"><span style="font-weight:600;">' + escapeHtml(t('tagsManagement')) + '</span></div>' +
      '<div class="card-body" id="settingsTagsBody"></div>' +
    '</div>';

    // ============================================================
    // 卡片 5：DOI 元数据源设置
    // ============================================================
    html += '<div class="card">' +
      '<div class="card-header"><span style="font-weight:600;">DOI 元数据源设置</span></div>' +
      '<div class="card-body">' +
        '<div class="form-group">' +
          '<label class="form-label">邮箱（mailto）</label>' +
          '<input type="email" class="input" id="doiEmailInput" placeholder="your@email.com" value="' +
            escapeAttr(settings.doiEmail || '') + '">' +
          '<div style="font-size:11px;color:var(--text-muted);margin-top:6px;line-height:1.5;">' +
            escapeHtml(t('doiMailtoDesc')) +
          '</div>' +
        '</div>' +
        '<div class="form-group" style="margin-top:12px;">' +
          '<label class="form-label">CNKI 开放平台 Token（可选）</label>' +
          '<input type="password" class="input" id="cnkiTokenInput" placeholder="例如：abc123xyz..." value="' +
            escapeAttr(settings.cnkiToken || '') + '">' +
          '<div style="font-size:11px;color:var(--text-muted);margin-top:6px;line-height:1.5;">' +
            escapeHtml(t('doiCNKIDesc')) +
          '</div>' +
        '</div>' +
        '<button class="btn btn-primary" id="saveDOISettingsBtn" style="margin-top:8px;">保存 DOI 设置</button>' +
        '<div id="doiSettingsStatus" style="font-size:12px;color:var(--text-secondary);margin-top:8px;display:none;"></div>' +
      '</div>' +
    '</div>';

    // ============================================================
    // 卡片 6：软件更新
    // ============================================================
    html += '<div class="card">' +
      '<div class="card-header"><span style="font-weight:600;">' + escapeHtml(t('softwareUpdate')) + '</span></div>' +
      '<div class="card-body">' +
        '<div style="display:flex;flex-direction:column;gap:12px;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;">' +
            '<div>' +
              '<div style="font-size:13px;font-weight:500;color:var(--text-primary);">' +
                escapeHtml(t('currentVersion')) +
              '</div>' +
              '<div id="currentVersionDisplay" style="font-size:12px;color:var(--text-muted);">v1.0.0</div>' +
            '</div>' +
            '<button class="btn btn-primary" id="checkUpdateBtn" style="min-width:100px;">' +
              escapeHtml(t('checkUpdate')) +
            '</button>' +
          '</div>' +
          '<div id="updateStatusArea" style="font-size:12px;color:var(--text-secondary);display:none;"></div>' +
          '<div style="border-top:1px solid var(--border-light);padding-top:12px;margin-top:4px;">' +
            '<div style="font-size:13px;font-weight:500;color:var(--text-primary);margin-bottom:8px;">' +
              escapeHtml(t('updateSource')) +
            '</div>' +
            '<select id="updateSourceSelect" class="input" style="margin-bottom:8px;">' +
              '<option value="github">GitHub</option>' +
              '<option value="mirror">GitHub 镜像（推荐国内用户）</option>' +
            '</select>' +
            '<div id="updateSourceDesc" style="font-size:11px;color:var(--text-muted);"></div>' +
          '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);line-height:1.5;">' +
            escapeHtml(t('autoUpdateDesc')) +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

    // 网格和动画容器结束
    html += '</div></div>';

    // 赋值 innerHTML
    page.innerHTML = html;
    html = null; // 释放内存

    // 附加事件监听器
    attachSettingsListeners();

    // 渲染文件夹列表
    renderFoldersList();

    // 渲染标签列表
    renderTagsList();

    // 动态获取并显示当前版本号
    loadAndDisplayVersion();

  } catch (err) {
    console.error('[settings] renderSettingsPage failed:', err);
    const page = document.getElementById('page-settings');
    if (page) {
      page.innerHTML =
        '<div class="animate-in" style="padding:40px;text-align:center;">' +
          '<h2 style="color:var(--text-primary);margin-bottom:20px;">设置页面加载失败</h2>' +
          '<div style="color:var(--text-muted);font-size:14px;line-height:1.8;">' +
            '<p>错误信息：' + escapeHtml(err.message || String(err)) + '</p>' +
            '<p style="margin-top:20px;">请尝试重启应用，如果问题持续，请联系开发者。</p>' +
            '<button class="btn btn-primary" style="margin-top:12px;" onclick="if(typeof renderSettingsPage === \'function\') renderSettingsPage();">重试</button>' +
          '</div>' +
        '</div>';
    }
  }
}

/**
 * 加载并显示当前应用版本号
 */
async function loadAndDisplayVersion() {
  const versionEl = document.getElementById('currentVersionDisplay');
  if (!versionEl) return;

  try {
    if (window.electronAPI && window.electronAPI.app && window.electronAPI.app.getVersion) {
      const version = await window.electronAPI.app.getVersion();
      versionEl.textContent = 'v' + version;
    }
  } catch (e) {
    console.log('[Settings] 获取版本号失败:', e.message);
  }
}

// ============================================================
// 事件监听器
// ============================================================

/**
 * 为设置页面附加事件监听器
 */
function attachSettingsListeners() {
  try {
    // 目标设置绑定
    const s = getSafeSettings();
    const g = getSafeGoals();

    const bindGoal = function(id, key) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', function() {
          try {
            appData.goals[key] = parseInt(el.value) || (key === 'daily' ? 2 : 1);
            saveData();
          } catch (e) {
            console.error('[settings] goal bind error:', e);
          }
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

    // 导出 BibTeX 按钮（通过 ImportExport 命名空间访问
    const exportBibtexBtn = document.getElementById('exportBibtexBtn');
    if (exportBibtexBtn) exportBibtexBtn.addEventListener('click', function() {
      if (window.ImportExport && window.ImportExport.exportBibTeX) {
        const result = window.ImportExport.exportBibTeX(appData.literature);
        try {
          const blob = new Blob([result], {type: 'application/x-bibtex;charset=utf-8'});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'scholarflow_library.bib';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
        } catch (e) {
          console.error('[settings] exportBibTeX write failed:', e);
          alert('导出失败: ' + e.message);
        }
      } else {
        alert('导出功能暂不可用');
      }
    });

    // 导出笔记按钮
    const exportNotesMdBtn = document.getElementById('exportNotesMdBtn');
    if (exportNotesMdBtn) exportNotesMdBtn.addEventListener('click', exportAllNotes);

    // 导入备份
    const importLabel = document.getElementById('importBackupLabel');
    const importInput = document.getElementById('importFileInput');
    if (importLabel && importInput) {
      importLabel.addEventListener('click', function() { importInput.click(); });
    }

    // 检查更新按钮
    const checkUpdateBtn = document.getElementById('checkUpdateBtn');
    if (checkUpdateBtn) checkUpdateBtn.addEventListener('click', checkForUpdate);

    // 更新源选择
    initUpdateSourceSelector();

    // DOI API 设置保存
    const saveDOIBtn = document.getElementById('saveDOISettingsBtn');
    if (saveDOIBtn) {
      saveDOIBtn.addEventListener('click', function() {
        try {
          const emailVal = document.getElementById('doiEmailInput').value.trim();
          const tokenVal = document.getElementById('cnkiTokenInput').value.trim();

          if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
            alert('邮箱格式不正确，请重新输入');
            return;
          }

          // 确保 settings 对象存在
          const safeSettings = getSafeSettings();
          safeSettings.doiEmail = emailVal;
          safeSettings.cnkiToken = tokenVal;
          appData.settings = safeSettings;

          saveData();

          const statusEl = document.getElementById('doiSettingsStatus');
          if (statusEl) {
            statusEl.style.display = 'block';
            var msg = '✓ DOI 设置已保存';
            var parts = [];
            if (emailVal) parts.push('邮件：' + emailVal);
            else parts.push('邮件：未设置');
            if (tokenVal) parts.push('已配置 CNKI Token');
            if (parts.length) msg += '（' + parts.join('；') + '）';
            statusEl.textContent = msg;
            setTimeout(function() { statusEl.style.display = 'none'; }, 4000);
          }
        } catch (e) {
          console.error('[settings] DOI 设置保存失败:', e);
          alert('设置保存失败：' + e.message);
        }
      });
    }

    if (importInput) {
      importInput.addEventListener('change', async function() {
        try {
          await importBackup();
        } catch (e) {
          console.error('[Import] 失败:', e);
          alert('备份导入失败：' + (e.message || e));
        }
      });
    }
  } catch (e) {
    console.error('[settings] attachSettingsListeners failed:', e);
  }
}

/**
 * 初始化更新源选择器
 */
async function initUpdateSourceSelector() {
  try {
    const selectEl = document.getElementById('updateSourceSelect');
    const descEl = document.getElementById('updateSourceDesc');

    if (!selectEl || !window.electronAPI || !window.electronAPI.updater || !window.electronAPI.updater.getSources) return;

    try {
      const result = await window.electronAPI.updater.getSources();
      const sources = result.sources;
      const current = result.current;

      // 设置当前选中的更新源
      selectEl.value = current.source;

      // 更新描述
      updateSourceDescription(current.source, sources, descEl);

      // 监听选择变化
      selectEl.addEventListener('change', async function() {
        try {
          const newSource = selectEl.value;
          updateSourceDescription(newSource, sources, descEl);
          await window.electronAPI.updater.setSource(newSource);
        } catch (e) {
          console.error('[settings] update source change failed:', e);
        }
      });
    } catch (e) {
      console.error('[settings] init update source selector failed:', e);
    }
  } catch (e) {
    console.error('[settings] initUpdateSourceSelector failed:', e);
  }
}

/**
 * 更新更新源描述
 */
function updateSourceDescription(source, sources, descEl) {
  try {
    if (!descEl || !sources || !sources[source]) return;
    descEl.textContent = sources[source].description || '';
  } catch (e) {
    console.error('[settings] updateSourceDescription failed:', e);
  }
}

// ============================================================
// 文件夹列表渲染
// ============================================================

/**
 * 渲染文件夹列表
 * 显示所有文件夹及其包含的文献数量
 */
function renderFoldersList() {
  try {
    const foldersEl = document.getElementById('foldersSettings');
    if (!foldersEl) return;

    const folders = Array.isArray(appData.folders) ? appData.folders : [];
    if (!folders.length) {
      foldersEl.innerHTML = '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:12px;">暂无文件夹，点击上方按钮添加</div>';
      return;
    }

    var innerHtml = '';
    for (var i = 0; i < folders.length; i++) {
      var f = folders[i];
      var count = 0;
      if (Array.isArray(appData.literature)) {
        for (var j = 0; j < appData.literature.length; j++) {
          if (appData.literature[j] && appData.literature[j].folder === f.id) count++;
        }
      }
      innerHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
        '<div style="width:12px;height:12px;border-radius:3px;background:' + escapeAttr(f.color || '#4f46e5') + ';flex-shrink:0;"></div>' +
        '<span style="flex:1;font-size:14px;">' + escapeHtml(f.name || '') + '</span>' +
        '<span style="font-size:12px;color:var(--text-muted);">' + count + ' 篇</span>' +
        '<button class="btn-edit btn-sm" onclick="renameFolder(\'' + f.id + '\')" style="font-size:12px;padding:2px 8px;">重命名</button>' +
        '<button class="btn-delete btn-sm" onclick="deleteFolder(\'' + f.id + '\')" style="font-size:12px;padding:2px 8px;">删除</button>' +
      '</div>';
    }
    foldersEl.innerHTML = innerHtml;
  } catch (e) {
    console.error('[settings] renderFoldersList failed:', e);
  }
}

/**
 * 删除文件夹
 * 文件夹内的文献不会被删除，仅移除文件夹分组标记
 */
function deleteFolder(folderId) {
  try {
    if (!confirm('确定删除该文件夹吗？（文件夹内的文献不会被删除，仅移除分组标记）')) return;
    appData.folders = (appData.folders || []).filter(function(f) { return f.id !== folderId; });
    // 清除文献中的该文件夹引用
    appData.literature.forEach(function(lit) {
      if (lit && lit.folder === folderId) lit.folder = null;
    });
    saveData();
    renderFoldersList();
    // 如果正在库视图中，刷新显示
    if (typeof renderLibrary === 'function') renderLibrary();
  } catch (e) {
    console.error('[settings] deleteFolder failed:', e);
  }
}

/**
 * 重命名文件夹
 */
function renameFolder(folderId) {
  try {
    var folder = (appData.folders || []).find(function(f) { return f.id === folderId; });
    if (!folder) return;
    var newName = prompt('文件夹新名称：', folder.name);
    if (!newName || !newName.trim()) return;
    folder.name = newName.trim().substring(0, 50);
    saveData();
    renderFoldersList();
  } catch (e) {
    console.error('[settings] renameFolder failed:', e);
  }
}

// ============================================================
// 标签列表渲染
// ============================================================

/**
 * 渲染标签列表
 * 显示所有标签及其关联的文献数量，支持删除标签
 */
function renderTagsList() {
  try {
    const tagsBody = document.getElementById('settingsTagsBody');
    if (!tagsBody) return;

    const tags = Array.isArray(appData.tags) ? appData.tags : [];

    if (!tags.length) {
      tagsBody.innerHTML = '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:12px;">暂无自定义标签</div>';
      return;
    }

    var innerHtml = '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    for (var i = 0; i < tags.length; i++) {
      var tg = tags[i];
      if (!tg) continue;

      var count = 0;
      if (Array.isArray(appData.literature)) {
        for (var j = 0; j < appData.literature.length; j++) {
          var litTags = appData.literature[j] && appData.literature[j].tags;
          if (Array.isArray(litTags) && litTags.indexOf(tg) !== -1) count++;
        }
      }

      innerHtml += '<span class="tag" style="display:inline-flex;align-items:center;gap:4px;">' +
        escapeHtml(tg) +
        '<span style="color:var(--text-muted);font-size:10px;">(' + count + ')</span>' +
        '<button data-tag-name="' + escapeAttr(tg) + '" class="delete-tag-btn" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:13px;line-height:1;padding:0 2px;margin-left:2px;" title="' + escapeHtml(t('deleteTag')) + '">&times;</button>' +
      '</span>';
    }
    innerHtml += '</div>';
    tagsBody.innerHTML = innerHtml;

    // 附加删除标签按钮事件
    var btns = tagsBody.querySelectorAll('.delete-tag-btn');
    for (var k = 0; k < btns.length; k++) {
      (function(btn) {
        btn.addEventListener('click', function() { deleteTag(btn.dataset.tagName); });
      })(btns[k]);
    }
  } catch (e) {
    console.error('[settings] renderTagsList failed:', e);
  }
}

// ============================================================
// 文件夹管理
// ============================================================

/**
 * 添加新文件夹
 * 显示内联输入框让用户输入文件夹名称，自动分配颜色
 */
function addFolder() {
  try {
    // 检查是否已存在输入框
    if (document.getElementById('folderInputContainer')) return;

    const container = document.getElementById('foldersSettings');
    if (!container) return;

    // 创建内联输入框
    const inputContainer = document.createElement('div');
    inputContainer.id = 'folderInputContainer';
    inputContainer.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;padding:12px;background:var(--bg-secondary);border-radius:8px;border:1px solid var(--border-color);';
    inputContainer.innerHTML =
      '<input type="text" class="input" id="folderNameInput" placeholder="' + escapeHtml(t('folderNamePrompt')) + '" maxlength="50" style="flex:1;">' +
      '<button class="btn btn-primary btn-sm" id="confirmAddFolder">' + escapeHtml(t('save')) + '</button>' +
      '<button class="btn btn-sm" id="cancelAddFolder">' + escapeHtml(t('cancel')) + '</button>';

    // 插入到列表开头
    container.insertBefore(inputContainer, container.firstChild);

    // 聚焦输入框
    const input = document.getElementById('folderNameInput');
    if (input) input.focus();

    // 绑定确认按钮
    document.getElementById('confirmAddFolder').addEventListener('click', function() {
      const name = input.value;
      if (!name || !name.trim()) {
        inputContainer.remove();
        return;
      }

      // 安全修复：清理文件夹名称，限制长度并去除首尾空白
      const cleanName = name.trim().substring(0, 50);
      if (!cleanName) {
        inputContainer.remove();
        return;
      }

      // 预定义颜色列表（使用新的 Indigo 品牌色）
      const colors = ['#4f46e5', '#d4354f', '#2fb872', '#e09800', '#7c3aed', '#06b6d4'];

      if (!Array.isArray(appData.folders)) appData.folders = [];
      appData.folders.push({
        id: generateId(),
        name: cleanName,
        color: colors[appData.folders.length % colors.length]
      });

      saveData();
      renderFoldersList();
    });

    // 绑定取消按钮
    document.getElementById('cancelAddFolder').addEventListener('click', function() {
      inputContainer.remove();
    });

    // 绑定回车键
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        document.getElementById('confirmAddFolder').click();
      }
    });

    // 绑定 ESC 键
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        inputContainer.remove();
      }
    });
  } catch (e) {
    console.error('[settings] addFolder failed:', e);
  }
}

// ============================================================
// 软件更新
// ============================================================

/**
 * 手动检查更新
 */
async function checkForUpdate() {
  try {
    const btn = document.getElementById('checkUpdateBtn');
    const statusArea = document.getElementById('updateStatusArea');

    if (!btn || !window.electronAPI || !window.electronAPI.updater) {
      if (statusArea) {
        statusArea.style.display = 'block';
        statusArea.textContent = t('updateNotAvailable');
      }
      return;
    }

    // 禁用按钮并显示检查中状态
    btn.disabled = true;
    btn.textContent = t('checking');
    if (statusArea) {
      statusArea.style.display = 'block';
      statusArea.textContent = t('checkingForUpdate');
    }

    try {
      const result = await window.electronAPI.updater.checkNow();

      if (result.status === 'dev_mode') {
        if (statusArea) statusArea.textContent = t('updateDevMode');
      } else if (result.status === 'checked') {
        if (statusArea) statusArea.textContent = (t('updateFound') + 'v' + result.version);
      } else if (result.status === 'not-available') {
        if (statusArea) statusArea.textContent = (t('updateAlreadyLatest') + result.version);
      } else if (result.status === 'error') {
        if (statusArea) statusArea.textContent = (t('updateCheckFailed') + result.message);
      }
    } catch (e) {
      if (statusArea) statusArea.textContent = (t('updateCheckFailed') + e.message);
    }

    // 恢复按钮状态
    btn.disabled = false;
    btn.textContent = t('checkUpdate');
  } catch (e) {
    console.error('[settings] checkForUpdate failed:', e);
  }
}

// ============================================================
// 模块导出
// ============================================================

if (typeof window !== 'undefined') {
  window.renderSettingsPage = renderSettingsPage;
  window.addFolder = addFolder;
  window.deleteFolder = deleteFolder;
  window.renameFolder = renameFolder;
  window.checkForUpdate = checkForUpdate;
}
