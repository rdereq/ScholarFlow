/**
 * @fileoverview 引用格式引擎核心
 * 提供格式注册、单条/批量引用生成、格式列表查询等调度能力。
 *
 * 依赖：window.CitationFormats（由 citation-formats.js 提供）
 *
 * @module Citation
 */

(function () {
  'use strict';

  /**
   * 内部格式注册表。
   * 默认从 window.CitationFormats 继承已注册的格式。
   * @type {Map<string, Function>}
   */
  var _formats = (window.CitationFormats instanceof Map)
    ? new Map(window.CitationFormats)
    : new Map();

  // =========================================================================
  //  Public API
  // =========================================================================

  var Citation = {

    /**
     * 注册一种引用格式。
     * @param {string} name - 格式名称，如 "APA 7th"
     * @param {Function} fn  - 格式函数，签名为 (item: Object) => string
     */
    register: function (name, fn) {
      if (typeof name !== 'string' || typeof fn !== 'function') {
        console.warn('[Citation] register() 需要 (name: string, fn: function)');
        return;
      }
      _formats.set(name, fn);
    },

    /**
     * 生成单条文献的引用字符串。
     * @param {Object} item          - 文献项（LiteratureItem 兼容对象）
     * @param {string} formatName    - 格式名，如 "IEEE"
     * @return {string} 格式化后的引用字符串；未知格式时返回占位提示
     */
    generate: function (item, formatName) {
      if (!item) return '';

      var fn = _formats.get(formatName);
      if (!fn) {
        return '[引用生成失败: 未知格式 "' + formatName + '"]';
      }

      try {
        return fn(item);
      } catch (e) {
        console.error('[Citation] 格式 "' + formatName + '" 生成失败:', e);
        return '[引用生成失败: ' + formatName + ']';
      }
    },

    /**
     * 批量生成多条文献的引用字符串。
     * IEEE 格式会自动分配编号 [1], [2], ...
     *
     * @param {Array<Object>} items - 文献项数组
     * @param {string} formatName   - 格式名
     * @return {Array<string>} 引用字符串数组
     */
    generateList: function (items, formatName) {
      if (!items || items.length === 0) return [];

      var isIEEE = (formatName === 'IEEE');
      var self = this;

      return items.map(function (item, idx) {
        if (isIEEE) {
          // IEEE 按序号编号 [1], [2], ...
          var fn = _formats.get('IEEE');
          if (fn) {
            try {
              return '[' + (idx + 1) + '] ' + fn(item);
            } catch (e) {
              console.error('[Citation] IEEE 批量生成失败 (index=' + (idx + 1) + '):', e);
              return '[引用生成失败: IEEE #' + (idx + 1) + ']';
            }
          }
        }
        return self.generate(item, formatName);
      });
    },

    /**
     * 获取所有已注册格式的名称列表。
     * @return {Array<string>}
     */
    getFormatNames: function () {
      return Array.from(_formats.keys());
    },
  };

  // ---- 暴露全局 API ----
  window.Citation = Citation;

  // ---- 自动注册 citation-formats.js 中预定义的所有格式 ----
  if (window.CitationFormats && typeof window.CitationFormats.forEach === 'function') {
    window.CitationFormats.forEach(function(fn, name) {
      Citation.register(name, fn);
    });
  }
})();
