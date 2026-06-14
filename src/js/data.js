/**
 * ============================================================
 * ScholarFlow - Data Layer Module
 * ============================================================
 * 
 * 本模块负责管理应用程序的所有数据操作，包括：
 * - 常量定义（状态映射、优先级映射、IMRAD章节定义）
 * - 内存数据存储结构
 * - 数据持久化（通过 Electron store API）
 * - 数据加载和初始化
 * 
 * @module data
 * @version 1.0.0
 */

// ============================================================
// 常量定义 - 文献阅读状态映射
// ============================================================

/**
 * 文献阅读状态映射表
 * 定义了所有可能的阅读状态及其对应的标签、徽章样式和图标
 * @constant {Object}
 */
const STATUS_MAP = {
  unread: { label: '待读', badge: 'badge-unread', icon: '◯' },
  reading: { label: '在读', badge: 'badge-reading', icon: '◐' },
  skim_done: { label: '泛读完成', badge: 'badge-skim', icon: '◑' },
  deep_done: { label: '精读完成', badge: 'badge-deep', icon: '●' },
  reread: { label: '需重读', badge: 'badge-reread', icon: '↻' },
  archived: { label: '归档', badge: 'badge-archived', icon: '▣' }
};

/**
 * 文献优先级映射表
 * 定义了高、中、低三种优先级及其对应的标签、样式类和图标
 * @constant {Object}
 */
const PRIORITY_MAP = {
  high: { label: '高', class: 'priority-high', icon: '▲' },
  medium: { label: '中', class: 'priority-medium', icon: '◆' },
  low: { label: '低', class: 'priority-low', icon: '▽' }
};

/**
 * IMRAD论文章节定义
 * 学术论文的标准结构：引言、方法、结果、讨论、结论
 * @constant {Array<Object>}
 */
const IMRAD_SECTIONS = [
  { key: 'introduction', label: '引言/Introduction' },
  { key: 'methods', label: '方法/Methods' },
  { key: 'results', label: '结果/Results' },
  { key: 'discussion', label: '讨论/Discussion' },
  { key: 'conclusion', label: '结论/Conclusion' }
];

// ============================================================
// 内存数据存储
// ============================================================

/**
 * 应用程序内存数据存储对象
 * 包含所有运行时数据，包括文献、笔记、标签、文件夹等
 * @type {Object}
 */
let currentUserId = null; // 当前用户 ID（用于数据隔离）

let appData = {
  literature: [],      // 文献列表
  notes: [],           // 笔记列表
  tags: [],            // 全局标签列表
  folders: [],         // 文件夹列表
  readingSessions: [], // 阅读会话记录
  goals: {             // 阅读目标设置
    daily: 2,          // 每日目标（篇）
    weekly: 10,        // 每周目标（篇）
    weeklyHours: 10,   // 每周阅读时长目标（小时）
    monthlyHours: 20   // 每月阅读时长目标（小时）
  },
  settings: {          // 应用设置
    theme: 'light',    // 主题（light/dark）
    noteTemplates: []  // 笔记模板
  }
};

// ============================================================
// 工具函数
// ============================================================

/**
 * 生成唯一标识符
 * 安全修复 [SEC-008]: 改用 crypto.randomUUID() 生成密码学安全的 UUID，避免可预测 ID
 * @returns {string} 生成的唯一ID
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // 降级方案：保留旧逻辑作为兼容
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

// ============================================================
// 数据持久化操作
// ============================================================

/**
 * 保存数据到持久化存储
 * 使用 Electron 的 store API 将数据保存到本地
 * 包含数据大小验证，防止存储过大导致的问题
 * @async
 * @returns {Promise<void>}
 */
async function saveData() {
  try {
    if (currentUserId === null || currentUserId === undefined) {
      console.error('[Save Error] currentUserId is null, cannot save data. User may not be initialized yet.');
      return;
    }
    const dataStr = JSON.stringify(appData);
    // 验证数据大小不超过50MB
    if (dataStr.length > 50 * 1024 * 1024) {
      console.warn('[Save] Data size exceeds safe limit, attempting anyway...');
    }
    const storeKey = 'scholarflow_data_' + currentUserId;
    console.log(`[Save] 保存数据到 key=${storeKey}, 文献数=${appData.literature ? appData.literature.length : 0}, 大小=${Math.round(dataStr.length / 1024)}KB`);
    await window.electronAPI.store.set(storeKey, dataStr);
    console.log('[Save] ✓ 数据保存成功');
  } catch (e) {
    console.error('[Save Error]', e);
    alert(t('saveError') || 'Failed to save data. Please try again.');
  }
}

/**
 * 从持久化存储加载数据
 * 从 Electron store 读取数据并解析到内存
 * 安全修复 [ELEC-007]: 添加数据结构验证，防止损坏数据导致应用崩溃
 * @async
 * @returns {Promise<boolean>} 是否成功加载数据
 */
async function loadData() {
  try {
    const storeKey = 'scholarflow_data_' + currentUserId;
    console.log(`[Load] 从 key=${storeKey} 加载数据`);
    const saved = await window.electronAPI.store.get(storeKey);
    if (saved && typeof saved === 'string' && saved.length > 0) {
      let parsed;
      try {
        parsed = JSON.parse(saved);
      } catch (parseErr) {
        console.error('[Load Error] Corrupt data detected, initializing fresh:', parseErr);
        return false;
      }
      if (!parsed || typeof parsed !== 'object') return false;

      // 安全修复 [ELEC-012]: 必须**原地修改** appData，不能重新赋值
      // - 其他模块通过 `window.appData` 引用了初始 appData 对象
      // - 若用 `appData = {...}` 重新赋值，则本地变量指向新对象，但 window.appData 仍指向旧对象
      // - 导致 UI 渲染、saveData 等操作读到的是不同对象，数据持久化失效
      appData.literature = Array.isArray(parsed.literature) ? parsed.literature : [];
      appData.notes = Array.isArray(parsed.notes) ? parsed.notes : [];
      appData.tags = Array.isArray(parsed.tags) ? parsed.tags : [];
      appData.folders = Array.isArray(parsed.folders) ? parsed.folders : [];
      appData.readingSessions = Array.isArray(parsed.readingSessions) ? parsed.readingSessions : [];
      appData.goals = (parsed.goals && typeof parsed.goals === 'object') ? parsed.goals : { daily: 2, weekly: 10, weeklyHours: 10, monthlyHours: 20 };
      appData.settings = (parsed.settings && typeof parsed.settings === 'object') ? parsed.settings : { theme: 'light', noteTemplates: [] };

      // 同步 window.appData（确保通过 window 访问时也拿到同样对象）
      if (typeof window !== 'undefined') {
        window.appData = appData;
      }

      // 数据迁移 v1.4.0+：确保 tags 字段从 keywords 派生
      let migratedCount = 0;
      appData.literature.forEach(function (lit) {
        if (!lit) return;
        const hasTags = Array.isArray(lit.tags) && lit.tags.length > 0;
        const hasKeywords = Array.isArray(lit.keywords) && lit.keywords.length > 0;
        if (!hasTags && hasKeywords) {
          lit.tags = lit.keywords.slice();
          migratedCount++;
        } else if (!Array.isArray(lit.tags)) {
          lit.tags = [];
        }
        if (!Array.isArray(lit.keywords)) lit.keywords = [];
      });
      if (migratedCount > 0) {
        console.log('[Data Migration] 已为 ' + migratedCount + ' 篇文献从 keywords 派生出 tags');
      }
      console.log(`[Load] ✓ 数据加载成功，共 ${appData.literature.length} 篇文献`);
      return true;
    }
    console.log('[Load] 无已保存数据');
  } catch (e) {
    console.error('[Load Error]', e);
  }
  return false;
}

// ============================================================
// 用户初始化
// ============================================================

/**
 * 初始化当前用户并加载数据
 * 应用启动时调用，获取当前用户 ID 并加载对应用户数据
 * @returns {Object|null} 当前用户信息
 */
async function initCurrentUser() {
  try {
    const currentUser = await window.electronAPI.user.getCurrent();
    if (currentUser) {
      currentUserId = currentUser.id;
      console.log('[Init] 当前用户:', currentUser.name, '(' + currentUserId + ')');
      return currentUser;
    }
  } catch (e) {
    console.error('[Init] 获取当前用户失败:', e);
  }
  return null;
}

// ============================================================
// XSS 防护工具函数
// ============================================================

/**
 * HTML 转义函数
 * 防止 XSS 攻击，将特殊字符转换为 HTML 实体
 * @param {*} str 需要转义的字符串
 * @returns {string} 转义后的安全字符串
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * HTML 属性转义函数
 * 专门用于转义 HTML 属性值，防止属性注入攻击
 * @param {*} str 需要转义的字符串
 * @returns {string} 转义后的安全字符串
 */
function escapeAttr(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ============================================================
// 初始化演示数据
// ============================================================

/**
 * 初始化演示数据
 * 首次运行应用程序时，将数据初始化为空状态
 * 安全修复 [ELEC-012]: 必须原地修改 appData 对象，不能重新赋值
 */
function initDemoData() {
  appData.literature = [];
  appData.notes = [];
  appData.tags = [];
  appData.folders = [];
  appData.readingSessions = [];
  appData.goals = { daily: 2, weekly: 10, weeklyHours: 10, monthlyHours: 20 };
  appData.settings = { theme: 'light', noteTemplates: [] };
  // 同步 window.appData 引用
  if (typeof window !== 'undefined') {
    window.appData = appData;
  }
  console.log('[Init] 已初始化为空数据状态');
  saveData();
}

// ============================================================
// 模块导出
// ============================================================

// 在浏览器环境中将变量挂载到 window 对象
if (typeof window !== 'undefined') {
  window.STATUS_MAP = STATUS_MAP;
  window.PRIORITY_MAP = PRIORITY_MAP;
  window.IMRAD_SECTIONS = IMRAD_SECTIONS;
  window.appData = appData;
  window.generateId = generateId;
  window.saveData = saveData;
  window.loadData = loadData;
  window.initCurrentUser = initCurrentUser;
  window.currentUserId = () => currentUserId;
  window.escapeHtml = escapeHtml;
  window.escapeAttr = escapeAttr;
  window.initDemoData = initDemoData;
}
