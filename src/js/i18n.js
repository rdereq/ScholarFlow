/**
 * ============================================================
 * ScholarFlow - Internationalization (i18n) Module
 * ============================================================
 * 
 * 本模块负责管理应用程序的多语言支持，包括：
 * - 英文和中文的翻译字符串
 * - 当前语言状态管理
 * - 语言切换功能
 * - 翻译函数 t()
 * 
 * @module i18n
 * @version 1.0.0
 */

// ============================================================
// 当前语言状态
// ============================================================

/**
 * 当前使用的语言代码
 * 'en' = 英文, 'zh' = 中文
 * @type {string}
 */
let currentLang = 'en';

// 从 Electron store 读取保存的语言设置
(async () => {
  try {
    const savedLang = await window.electronAPI.store.get('scholarflow_lang');
    if (savedLang) {
      currentLang = savedLang;
    }
  } catch (e) {
    console.warn('Load language failed', e);
  }
})();

// ============================================================
// 翻译字符串定义
// ============================================================

/**
 * 国际化翻译表
 * 包含英文和中文的所有界面文本
 * @constant {Object}
 */
const I18N = {
  // =========================================================
  // 英文翻译
  // =========================================================
  en: {
    // Sidebar - 侧边栏
    literatureTracker: 'Literature Tracker',
    navMain: 'Main',
    navDashboard: 'Dashboard',
    navLibrary: 'Literature Library',
    navNotes: 'Notes',
    navStats: 'Statistics',
    navSystem: 'System',
    navSettings: 'Settings',
    researcher: 'Researcher',

    // User management - 用户管理
    userManagement: 'Users',
    createUser: 'New User',
    userName: 'User Name',
    userNamePlaceholder: 'Enter name (1-12 chars)',
    userNameRequired: 'Name is required',
    userNameTooLong: 'Name must be 1-12 characters',
    switchUser: 'Switch',
    deleteUser: 'Delete',
    deleteUserConfirm: 'Delete this user and all their data?',
    cannotDeleteCurrentUser: 'Cannot delete the current user',
    mustKeepOneUser: 'At least one user must exist',
    userCreated: 'User created',
    userDeleted: 'User deleted',
    userSwitched: 'Switched to',
    avatarColor: 'Avatar Color',
    createdAt: 'Created',
    currentUser: 'Current',

    // Software Update - 软件更新
    softwareUpdate: 'Software Update',
    currentVersion: 'Current Version',
    checkUpdate: 'Check for Updates',
    checking: 'Checking...',
    checkingForUpdate: 'Checking for updates...',
    updateNotAvailable: 'You are up to date',
    updateAlreadyLatest: 'You are already on the latest version',
    updateDevMode: 'Update not available in development mode',
    updateFound: 'New version available: ',
    updateCheckFailed: 'Check failed: ',
    autoUpdateDesc: 'The app will automatically check for updates. When a new version is found, it will be downloaded and you will be prompted to install.',
    update_ready_title: 'Update Ready',
    update_ready_version: 'Version',
    update_ready_downloaded: 'has been downloaded',
    update_later: 'Later',
    update_restart: 'Restart & Install',
    update_failed: 'Update Failed',
    update_unknown_error: 'An unknown error occurred during the update process.',

    // Top bar - 顶部栏
    searchPlaceholder: 'Search literature, notes, tags...',
    addLiterature: 'Add Literature',

    // Dashboard - 仪表盘
    dashboard: 'Dashboard',
    readingOverview: 'Reading progress overview',
    totalLiterature: 'Total Literature',
    completionRate: 'Completion Rate',
    thisWeekRead: 'This Week Read',
    totalReadingTime: 'Total Reading Time',
    readingStatus: 'Reading Status',
    remindersGoals: 'Reminders & Goals',
    overdue: 'Overdue',
    dueSoon: 'Due Soon',
    dOverdue: 'd overdue',
    dLeft: 'd left',
    weeklyGoal: 'Weekly Goal',
    weeklyTime: 'Weekly Time',
    goal: 'goal',
    papers: 'papers',
    readingActivity30: 'Reading Activity (Past 30 Days)',
    recentlyActive: 'Recently Active',
    viewAll: 'View All',

    // Table headers - 表格列标题
    thTitle: 'Title',
    thStatus: 'Status',
    thProgress: 'Progress',
    thPriority: 'Priority',
    thLastRead: 'Last Read',
    thYear: 'Year',
    thJournal: 'Journal',
    thTime: 'Time',
    thDeadline: 'Deadline',

    // Library - 文献库
    libraryTitle: 'Literature Library',
    of: 'of',
    allStatus: 'All Status',
    allPriority: 'All Priority',
    allFolders: 'All Folders',
    allTags: 'All Tags',
    recentActivity: 'Recent Activity',
    yearNewest: 'Year (newest)',
    progress: 'Progress',
    titleAZ: 'Title A-Z',
    priority: 'Priority',
    noLitFound: 'No literature found.',
    pages: 'pages',

    // Detail - 详情页
    backToLibrary: 'Back to Library',
    metadata: 'Metadata',
    edit: 'Edit',
    journal: 'Journal',
    year: 'Year',
    doi: 'DOI',
    quartile: 'Quartile',
    impactFactor: 'Impact Factor',
    impactFactorField: 'Impact Factor',
    pagesLabel: 'Pages',
    abstract: 'Abstract',
    readingProgress: 'Reading Progress',
    status: 'Status',
    overallProgress: 'Overall Progress',
    pageProgress: 'Page Progress',
    imradSection: 'IMRAD Section Progress',
    deadline: 'Deadline',
    readTime: 'Read time',
    last: 'Last',
    startReading: 'Start Reading',
    clickToStop: 'Click to Stop',
    notes: 'Notes',
    newNote: '+ New Note',
    noNotesYet: 'No notes yet. Create your first note!',
    deleteLiterature: 'Delete Literature',
    pdfViewer: 'PDF Viewer',
    uploadPdfHere: 'Upload a PDF to preview here',
    uploadPdf: 'Upload PDF',
    deleteConfirm: 'Are you sure? This will also delete associated notes.',

    // Notes page - 笔记页面
    notesTitle: 'Notes',
    notesAcross: 'notes across your library',
    exportAllMd: 'Export All (MD)',
    all: 'All',
    updated: 'Updated',
    noNotesFound: 'No notes found.',

    // Note modal - 笔记模态框
    editNote: 'Edit Note',
    newNoteTitle: 'New Note',
    noteTitle: 'Title',
    template: 'Template',
    tplBlank: 'Blank',
    tplInnovation: 'Core Innovation',
    tplMethod: 'Research Method',
    tplCritique: 'Critical Analysis',
    contentMd: 'Content (Markdown)',
    tags: 'Tags',
    tagsComma: 'Tags (comma-separated)',
    cancel: 'Cancel',
    save: 'Save',
    saveNote: 'Save Note',
    delete: 'Delete',
    deleteNoteConfirm: 'Delete this note?',
    titleRequired: 'Title is required',

    // Stats - 统计页面
    statsTitle: 'Statistics & Analytics',
    monthlyTrend: 'Monthly Trend',
    researchFields: 'Research Fields',
    readingHeatmap: 'Reading Heatmap (90 Days)',
    completionFunnel: 'Completion Funnel',
    streaksMilestones: 'Streaks & Milestones',
    dayStreak: 'Day Streak',
    papersCompleted: 'Papers Completed',
    totalHoursRead: 'Total Hours Read',
    notesCreated: 'Notes Created',
    sessions: 'Sessions',
    hours: 'Hours',
    total: 'Total',
    started: 'Started',
    completed: 'Completed',
    deepRead: 'Deep Read',
    reading: 'Reading',

    // Settings - 设置页面
    settingsTitle: 'Settings',
    readingGoals: 'Reading Goals',
    dailyGoal: 'Daily goal (papers)',
    weeklyGoalSetting: 'Weekly goal (papers)',
    weeklyHoursGoal: 'Weekly reading hours goal',
    monthlyHoursGoal: 'Monthly reading hours goal',
    folders: 'Folders',
    addFolder: '+ Add',
    dataBackup: 'Data Backup & Export',
    fullBackupJson: 'Full Backup (JSON)',
    exportBibtex: 'Export BibTeX',
    exportAllNotesMd: 'Export All Notes (MD)',
    importBackup: 'Import Backup',
    tagsManagement: 'Tags',
    folderNamePrompt: 'Folder name:',
    backupSuccess: 'Backup imported successfully!',
    backupInvalid: 'Invalid backup file format.',
    backupError: 'Error parsing backup file.',
    editFieldsHint: 'Edit fields directly on the detail page.',
    editMetadata: 'Edit Literature',

    // PDF viewer - PDF阅读器
    pdfUploaded: 'PDF uploaded:',
    pdfViewerNote: '(Full PDF.js viewer would render here in production)',
    pdfPage: 'Page',
    pdfOf: 'of',
    pdfZoomIn: 'Zoom In',
    pdfZoomOut: 'Zoom Out',
    pdfFitWidth: 'Fit Width',
    pdfFullscreen: 'Fullscreen',
    pdfExitFullscreen: 'Exit Fullscreen',
    pdfPrevPage: 'Previous Page',
    pdfNextPage: 'Next Page',
    pdfLoading: 'Loading PDF...',
    pdfOpenNewTab: 'Open in New Tab',
    pdfReplace: 'Replace PDF',
    pdfRemove: 'Remove PDF',
    pdfDragHint: 'Drop PDF file here',

    // Add literature modal - 添加文献模态框
    addLitTitle: 'Add Literature',
    doiFetch: 'Enter DOI to auto-fetch...',
    fetch: 'Fetch',
    manualEntry: 'Manual Entry',
    bibtexImport: 'BibTeX Import',
    titleField: 'Title',
    authorsField: 'Authors',
    yearField: 'Year',
    journalField: 'Journal/Conference',
    doiField: 'DOI',
    quartileField: 'Quartile',
    ifField: 'Impact Factor',
    totalPages: 'Total Pages',
    abstractField: 'Abstract',
    keywordsField: 'Keywords (comma-separated)',
    folderField: 'Folder',
    none: 'None',
    tagsField: 'Tags',
    priorityField: 'Priority',
    deadlineField: 'Deadline',
    addLitBtn: 'Add Literature',
    pasteBibtex: 'Paste BibTeX entries',
    importBtn: 'Import',
    fetching: 'Fetching...',
    noTagData: 'No tag data yet. Add tags to your literature to see the distribution.',
    noLitData: 'No literature yet. Add papers to see the completion funnel.',
    deleteTag: 'Delete this tag',
    doiFetchFail: 'Could not fetch DOI. Check the DOI and try again.',
    imported: 'Imported',
    entries: 'entries.',
    noValidEntries: 'No valid entries found.',

    // Search - 搜索
    literature: 'Literature',

    // Chart tooltips - 图表提示
    chartReading: 'Reading',
    min: 'min',

    // Save error
    saveError: 'Failed to save data. Please try again.',

    // Auto Update - 自动更新
    checking_for_update: 'Checking for updates...',
    downloading_update: 'Downloading',
    from_version: 'from',
    update_ready_title: 'Update Ready',
    update_ready_version: 'Version',
    update_ready_downloaded: 'has been downloaded',
    update_later: 'Later',
    update_restart: 'Restart & Install',
    update_failed: 'Update Failed',
    update_unknown_error: 'An unknown error occurred during the update process.',
    close: 'Close'
  },

  // =========================================================
  // 中文翻译
  // =========================================================
  zh: {
    // Sidebar - 侧边栏
    literatureTracker: '文献追踪器',
    navMain: '导航',
    navDashboard: '仪表盘',
    navLibrary: '文献库',
    navNotes: '笔记',
    navStats: '统计分析',
    navSystem: '系统',
    navSettings: '设置',
    researcher: '研究者',

    // User management - 用户管理
    userManagement: '用户管理',
    createUser: '新建用户',
    userName: '用户名',
    userNamePlaceholder: '输入名称（1-12字符）',
    userNameRequired: '请输入用户名',
    userNameTooLong: '名称长度为1-12个字符',
    switchUser: '切换',
    deleteUser: '删除',
    deleteUserConfirm: '删除此用户及其所有数据？',
    cannotDeleteCurrentUser: '无法删除当前用户',
    mustKeepOneUser: '至少需要保留一个用户',
    userCreated: '用户已创建',
    userDeleted: '用户已删除',
    userSwitched: '已切换到',
    avatarColor: '头像颜色',
    createdAt: '创建时间',
    currentUser: '当前',

    // Software Update - 软件更新
    softwareUpdate: '软件更新',
    currentVersion: '当前版本',
    checkUpdate: '检查更新',
    checking: '检查中...',
    checkingForUpdate: '正在检查更新...',
    updateNotAvailable: '已是最新版本',
    updateAlreadyLatest: '当前已是最新版本',
    updateDevMode: '开发模式无法检查更新',
    updateFound: '发现新版本: ',
    updateCheckFailed: '检查失败: ',
    autoUpdateDesc: '软件会自动检查更新。发现新版本时会自动下载并提示安装。',
    update_ready_title: '更新就绪',
    update_ready_version: '版本',
    update_ready_downloaded: '已下载完成',
    update_later: '稍后',
    update_restart: '立即重启安装',
    update_failed: '更新失败',
    update_unknown_error: '更新过程中发生未知错误。',

    // Top bar - 顶部栏
    searchPlaceholder: '搜索文献、笔记、标签...',
    addLiterature: '添加文献',

    // Dashboard - 仪表盘
    dashboard: '仪表盘',
    readingOverview: '阅读进度总览',
    totalLiterature: '文献总数',
    completionRate: '完成率',
    thisWeekRead: '本周已读',
    totalReadingTime: '累计阅读时长',
    readingStatus: '阅读状态',
    remindersGoals: '提醒与目标',
    overdue: '已逾期',
    dueSoon: '即将到期',
    dOverdue: '天逾期',
    dLeft: '天剩余',
    weeklyGoal: '周目标',
    weeklyTime: '本周时间',
    goal: '目标',
    papers: '篇',
    readingActivity30: '阅读活动（近30天）',
    recentlyActive: '最近活跃',
    viewAll: '查看全部',

    // Table headers - 表格列标题
    thTitle: '标题',
    thStatus: '状态',
    thProgress: '进度',
    thPriority: '优先级',
    thLastRead: '上次阅读',
    thYear: '年份',
    thJournal: '期刊',
    thTime: '时长',
    thDeadline: '截止日期',

    // Library - 文献库
    libraryTitle: '文献库',
    of: '/',
    allStatus: '全部状态',
    allPriority: '全部优先级',
    allFolders: '全部文件夹',
    allTags: '全部标签',
    recentActivity: '最近活跃',
    yearNewest: '年份（最新）',
    progress: '进度',
    titleAZ: '标题 A-Z',
    priority: '优先级',
    noLitFound: '未找到文献。',
    pages: '页',

    // Detail - 详情页
    backToLibrary: '返回文献库',
    metadata: '元数据',
    edit: '编辑',
    journal: '期刊',
    year: '年份',
    doi: 'DOI',
    quartile: '分区',
    impactFactor: '影响因子',
    impactFactorField: '影响因子',
    pagesLabel: '页数',
    abstract: '摘要',
    readingProgress: '阅读进度',
    status: '状态',
    overallProgress: '整体进度',
    pageProgress: '页码进度',
    imradSection: 'IMRAD章节进度',
    deadline: '截止日期',
    readTime: '阅读时长',
    last: '上次',
    startReading: '开始阅读',
    clickToStop: '点击停止',
    notes: '笔记',
    newNote: '+ 新建笔记',
    noNotesYet: '暂无笔记，创建你的第一条笔记吧！',
    deleteLiterature: '删除文献',
    pdfViewer: 'PDF 阅读器',
    uploadPdfHere: '上传PDF文件以预览',
    uploadPdf: '上传PDF',
    deleteConfirm: '确定要删除吗？关联的笔记也会被一并删除。',

    // Notes page - 笔记页面
    notesTitle: '笔记',
    notesAcross: '条笔记',
    exportAllMd: '导出全部 (MD)',
    all: '全部',
    updated: '更新于',
    noNotesFound: '未找到笔记。',

    // Note modal - 笔记模态框
    editNote: '编辑笔记',
    newNoteTitle: '新建笔记',
    noteTitle: '标题',
    template: '模板',
    tplBlank: '空白',
    tplInnovation: '核心创新点',
    tplMethod: '研究方法',
    tplCritique: '批判性分析',
    contentMd: '内容（Markdown）',
    tags: '标签',
    tagsComma: '标签（逗号分隔）',
    cancel: '取消',
    save: '保存',
    saveNote: '保存笔记',
    delete: '删除',
    deleteNoteConfirm: '确定删除此笔记？',
    titleRequired: '标题不能为空',

    // Stats - 统计页面
    statsTitle: '统计分析',
    monthlyTrend: '月度趋势',
    researchFields: '研究领域分布',
    readingHeatmap: '阅读热力图（90天）',
    completionFunnel: '完成漏斗',
    streaksMilestones: '连续打卡与里程碑',
    dayStreak: '连续天数',
    papersCompleted: '已完成文献',
    totalHoursRead: '累计阅读小时',
    notesCreated: '笔记数量',
    sessions: '阅读次数',
    hours: '小时',
    total: '总计',
    started: '已开始',
    completed: '已完成',
    deepRead: '精读',
    reading: '阅读',

    // Settings - 设置页面
    settingsTitle: '设置',
    readingGoals: '阅读目标',
    dailyGoal: '每日目标（篇）',
    weeklyGoalSetting: '每周目标（篇）',
    weeklyHoursGoal: '每周阅读小时目标',
    monthlyHoursGoal: '月度阅读小时目标',
    folders: '文件夹',
    addFolder: '+ 添加',
    dataBackup: '数据备份与导出',
    fullBackupJson: '完整备份 (JSON)',
    exportBibtex: '导出 BibTeX',
    exportAllNotesMd: '导出全部笔记 (MD)',
    importBackup: '导入备份',
    tagsManagement: '标签',
    folderNamePrompt: '文件夹名称：',
    backupSuccess: '备份导入成功！',
    backupInvalid: '无效的备份文件格式。',
    backupError: '解析备份文件时出错。',
    editFieldsHint: '请在详情页直接编辑字段。',
    editMetadata: '编辑文献信息',

    // PDF viewer - PDF阅读器
    pdfUploaded: 'PDF已上传：',
    pdfViewerNote: '（正式版将在此渲染完整PDF.js阅读器）',
    pdfPage: '页',
    pdfOf: '/',
    pdfZoomIn: '放大',
    pdfZoomOut: '缩小',
    pdfFitWidth: '适应宽度',
    pdfFullscreen: '全屏',
    pdfExitFullscreen: '退出全屏',
    pdfPrevPage: '上一页',
    pdfNextPage: '下一页',
    pdfLoading: '正在加载PDF...',
    pdfOpenNewTab: '在新标签页打开',
    pdfReplace: '替换PDF',
    pdfRemove: '移除PDF',
    pdfDragHint: '拖放PDF文件到此处',

    // Add literature modal - 添加文献模态框
    addLitTitle: '添加文献',
    doiFetch: '输入DOI自动获取元数据...',
    fetch: '获取',
    manualEntry: '手动录入',
    bibtexImport: 'BibTeX导入',
    titleField: '标题',
    authorsField: '作者',
    yearField: '年份',
    journalField: '期刊/会议',
    doiField: 'DOI',
    quartileField: '分区',
    ifField: '影响因子',
    totalPages: '总页数',
    abstractField: '摘要',
    keywordsField: '关键词（逗号分隔）',
    folderField: '文件夹',
    none: '无',
    tagsField: '标签',
    priorityField: '优先级',
    deadlineField: '截止日期',
    addLitBtn: '添加文献',
    pasteBibtex: '粘贴BibTeX条目',
    importBtn: '导入',
    fetching: '获取中...',
    noTagData: '暂无标签数据，为文献添加标签后可查看分布。',
    noLitData: '暂无文献数据，添加论文后可查看完成漏斗。',
    deleteTag: '删除此标签',
    doiFetchFail: '无法获取DOI信息，请检查后重试。',
    imported: '已导入',
    entries: '条记录。',
    noValidEntries: '未找到有效条目。',

    // Search - 搜索
    literature: '文献',

    // Chart tooltips - 图表提示
    chartReading: '阅读',
    min: '分钟',

    // Save error
    saveError: '保存数据失败，请重试。',

    // Auto Update - 自动更新
    checking_for_update: '正在检查更新...',
    downloading_update: '正在下载更新',
    from_version: '当前版本',
    update_ready_title: '更新就绪',
    update_ready_version: '版本',
    update_ready_downloaded: '已下载完成',
    update_later: '稍后',
    update_restart: '重启并安装',
    update_failed: '更新失败',
    update_unknown_error: '在更新过程中发生了未知错误。',
    close: '关闭'
  }
};

// ============================================================
// 翻译函数
// ============================================================

/**
 * 翻译函数
 * 根据当前语言返回对应的翻译字符串
 * 如果当前语言没有该键，则回退到英文；如果英文也没有，则返回键名
 * @param {string} key 翻译键名
 * @returns {string} 翻译后的字符串
 */
function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || I18N.en[key] || key;
}

/**
 * 设置当前语言
 * 切换应用程序的语言，并保存到持久化存储
 * 触发界面重新渲染以更新所有文本
 * @async
 * @param {string} lang 语言代码 ('en' 或 'zh')
 * @returns {Promise<void>}
 */
async function setLang(lang) {
  currentLang = lang;
  try {
    // 使用 electron-store 存储语言设置
    await window.electronAPI.store.set('scholarflow_lang', lang);
  } catch (e) {
    console.warn('Save language failed', e);
  }
  // 更新静态侧边栏和顶部栏
  renderSidebar();
  renderTopbar();
  // 重新渲染当前页面
  switchPage(currentPage, currentDetailId);
}

// ============================================================
// 模块导出
// ============================================================

if (typeof window !== 'undefined') {
  window.currentLang = currentLang;
  window.I18N = I18N;
  window.t = t;
  window.setLang = setLang;
}
