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

  /** 内部格式注册表 (名→函数)
   * @type {Object<string, Function>}
   */
  var _formats = {};

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
      _formats[name] = fn;
    },

    /**
     * 生成单条文献的引用字符串。
     * @param {Object} item          - 文献项
     * @param {string} formatName    - 格式名，如 "IEEE"
     * @return {string}
     */
    generate: function (item, formatName) {
      if (!item) return '';
      if (typeof item !== 'object') return '';

      var fn = _formats[formatName];
      if (!fn) return '';
      try { return fn(item); }
      catch (e) { console.error('[Citation] format error', e); return ''; }
    },

    /**
     * 批量生成。IEEE/GB/T 7714 需要编号前缀。
     * @param {Array<Object>} items
     * @param {string} formatName
     * @return {Array<string>}
     */
    generateList: function (items, formatName) {
      if (!items || items.length === 0) return [];

      var isNumbered = (formatName === 'IEEE' || formatName === 'GB/T 7714-2015');

      var result = [];
      for (var i = 0; i < items.length; i++) {
        var s = this.generate(items[i], formatName);
        if (isNumbered) {
          result.push('[' + (i + 1) + '] ' + s);
        } else {
          result.push(s);
        }
      }
      return result;
    },

    /** 获取所有已注册格式名称列表。 */
    getFormatNames: function () {
      return Object.keys(_formats);
    },
  };

  window.Citation = Citation;

  // ---- 自动注册 citation-formats.js 中预定义的所有格式 ----
  if (window.CitationFormats && typeof window.CitationFormats === 'object') {
    var src = window.CitationFormats;
    var keys = Object.keys(src);
    for (var k = 0; k < keys.length; k++) {
      Citation.register(keys[k], src[keys[k]]);
    }
  }

  // ============================================================
  //  刷新自定义格式
  // ============================================================
  function refreshCustomFormats() {
    if (!window.CitationTemplates || typeof window.CitationTemplates.getAll !== 'function') return;
    var templates = window.CitationTemplates.getAll();
    for (var i = 0; i < templates.length; i++) {
      var t = templates[i];
      Citation.register(t.name, function (item) {
        return window.CitationTemplates.generate(item, t.name);
      });
    }
  }
  window.CitationRefreshCustom = refreshCustomFormats;

  setTimeout(refreshCustomFormats, 100);
})();
