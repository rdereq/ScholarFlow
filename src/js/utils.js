/**
 * ============================================================
 * ScholarFlow - Utilities Module
 * ============================================================
 * 
 * 本模块提供应用程序通用的工具函数，包括：
 * - 日期格式化
 * - 时间格式化（分钟转小时/分钟）
 * - 日期计算（距离截止日期天数）
 * - 主题颜色获取
 * - 文件下载
 * - 图表大小调整管理
 * 
 * @module utils
 * @version 1.0.0
 */

// ============================================================
// 日期和时间格式化
// ============================================================

/**
 * 格式化日期
 * 将日期字符串或日期对象格式化为本地化的日期显示格式
 * @param {string|Date|null} d 日期字符串、Date对象或null
 * @returns {string} 格式化后的日期字符串，如果输入无效则返回 '—'
 */
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(
    currentLang === 'zh' ? 'zh-CN' : 'en-US',
    { year: 'numeric', month: '2-digit', day: '2-digit' }
  );
}

/**
 * 格式化分钟数为可读字符串
 * 将分钟数转换为 "Xh Ymin" 或 "Xmin" 格式
 * @param {number} m 分钟数
 * @returns {string} 格式化后的时间字符串
 */
function formatMinutes(m) {
  if (!m) return '0min';
  if (m < 60) return m + 'min';
  return Math.floor(m / 60) + 'h ' + m % 60 + 'min';
}

/**
 * 计算距离目标日期的天数
 * 正数表示未来，负数表示已过期
 * @param {string|Date} d 目标日期
 * @returns {number|null} 距离的天数，如果输入无效则返回 null
 */
function daysUntil(d) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

// ============================================================
// 主题和样式
// ============================================================

/**
 * 获取当前主题的颜色配置
 * 根据当前主题（亮色/暗色）返回对应的颜色值
 * @returns {Object} 包含各种颜色值的对象
 * @property {string} text - 主文本颜色
 * @property {string} textMuted - 次要文本颜色
 * @property {string} bg - 背景颜色
 * @property {string} cardBg - 卡片背景颜色
 * @property {string} border - 边框颜色
 * @property {string} accent - 强调色
 * @property {string} grid - 网格线颜色
 */
function getThemeColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    text: isDark ? '#f0ede8' : '#2a251e',
    textMuted: isDark ? '#8a7e6b' : '#a89d8c',
    bg: isDark ? '#1a1610' : '#faf9f7',
    cardBg: isDark ? '#2a251e' : '#ffffff',
    border: isDark ? '#3d362d' : '#e0dbd2',
    accent: isDark ? '#3399ff' : '#0077e6',
    grid: isDark ? '#3d362d' : '#f0ede8'
  };
}

// ============================================================
// 文件操作
// ============================================================

/**
 * 下载文件到本地
 * 创建临时 Blob URL 并触发下载
 * @param {string} name 文件名
 * @param {string} content 文件内容
 * @param {string} type MIME 类型
 */
function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// 图表大小调整管理
// ============================================================

/**
 * 图表大小调整处理器存储对象
 * 用于存储每个图表的 resize 事件处理器，以便后续清理
 * @type {Object}
 */
const _chartResizeHandlers = {};

/**
 * 为图表附加窗口大小调整监听器
 * 当窗口大小变化时自动调整图表大小
 * @param {Object} chart ECharts 图表实例
 * @param {string} key 图表的唯一标识键
 */
function attachChartResize(chart, key) {
  const handler = () => {
    try {
      chart.resize();
    } catch (e) {
      // 忽略图表已销毁时的错误
    }
  };
  _chartResizeHandlers[key] = handler;
  window.addEventListener('resize', handler);
}

/**
 * 移除图表的大小调整监听器
 * 防止内存泄漏，在销毁图表前调用
 * @param {string} key 图表的唯一标识键
 */
function removeChartResize(key) {
  if (_chartResizeHandlers[key]) {
    window.removeEventListener('resize', _chartResizeHandlers[key]);
    delete _chartResizeHandlers[key];
  }
}

// ============================================================
// 输入验证和清理
// ============================================================

/**
 * 清理输入字符串
 * 移除控制字符并限制长度，防止注入攻击
 * @param {*} val 输入值
 * @param {number} [maxLength] 最大长度限制
 * @returns {string} 清理后的字符串
 */
function sanitizeInput(val, maxLength) {
  if (!val) return '';
  let s = String(val).trim();
  if (maxLength && s.length > maxLength) {
    s = s.substring(0, maxLength);
  }
  // 移除控制字符，防止潜在问题
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  return s;
}

// ============================================================
// 模块导出
// ============================================================

if (typeof window !== 'undefined') {
  window.formatDate = formatDate;
  window.formatMinutes = formatMinutes;
  window.daysUntil = daysUntil;
  window.getThemeColors = getThemeColors;
  window.downloadFile = downloadFile;
  window.attachChartResize = attachChartResize;
  window.removeChartResize = removeChartResize;
  window.sanitizeInput = sanitizeInput;
}
