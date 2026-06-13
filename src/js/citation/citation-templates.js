/**
 * @fileoverview 自定义引用格式模板引擎
 * 允许用户创建、编辑、删除自定义引用格式。
 *
 * 模板语法：{author} {year} {title} {journal} {volume} {issue} {pages} {doi} {publisher}
 * 特殊标记：*{title}* = 斜体标题
 *
 * @module CitationTemplates
 */

(function () {
  'use strict';

  var STORAGE_KEY = 'citation_custom_formats';

  /**
   * 从 localStorage 加载自定义格式集合。
   * @return {Array<{name: string, template: string}>}
   */
  function _load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * 保存自定义格式集合到 localStorage。
   * @param {Array<Object>} formats
   */
  function _save(formats) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formats));
    } catch (e) {
      console.warn('[CitationTemplates] 保存失败:', e.message);
    }
  }

  /**
   * 根据模板字符串和文献条目生成引用。
   * 支持字段占位符：{author} {year} {title} {journal} {volume} {issue} {pages} {doi}
   * 特殊语法：*{title}* 将标题渲染为斜体（HTML <i>）。
   *
   * @param {Object} item - 文献条目
   * @param {string} template - 格式模板字符串
   * @return {string} 生成的引用字符串
   */
  function renderTemplate(item, template) {
    var authors = window.CitationAuthor
      ? window.CitationAuthor.parseAuthors(fb(item.authors)).map(function (a) {
          return (a.family || '') + (a.given ? ', ' + a.given.charAt(0) + '.' : '');
        }).join('; ')
      : fb(item.authors);

    var replacements = {
      author: authors || '',
      year: item.year || '',
      title: fb(item.title),
      journal: fb(item.journal),
      volume: fb(item.volume),
      issue: fb(item.issue),
      pages: fb(item.pages),
      doi: fb(item.doi),
      publisher: fb(item.publisher || ''),
    };

    // 先处理 *{field}* 斜体标记
    var result = template.replace(/\*\{(\w+)\}\*/g, function (match, field) {
      return replacements[field] ? '<i>' + replacements[field] + '</i>' : '';
    });

    // 再处理普通 {field}
    result = result.replace(/\{(\w+)\}/g, function (match, field) {
      return replacements[field] !== undefined ? replacements[field] : match;
    });

    // 清理多余空白和连续标点
    result = result.replace(/\s{2,}/g, ' ').replace(/\s*,\s*,/g, ',').replace(/\s*\.\s*\./g, '.').trim();

    return result;
  }

  /**
   * @param {*} v
   * @param {string} [fallback='']
   * @return {string}
   */
  function fb(v, fallback) {
    fallback = fallback !== undefined ? fallback : '';
    return (v != null && String(v).trim() !== '') ? String(v).trim() : fallback;
  }

  // =========================================================================
  //  对外 API
  // =========================================================================

  var CitationTemplates = {

    /**
     * 获取所有自定义格式。
     * @return {Array<{name: string, template: string}>}
     */
    getAll: function () {
      return _load();
    },

    /**
     * 添加一条自定义格式。
     * @param {string} name - 格式名称
     * @param {string} template - 模板字符串
     * @return {boolean} 是否添加成功（名称不能重复）
     */
    add: function (name, template) {
      if (!name || !template) return false;
      var formats = _load();
      if (formats.some(function (f) { return f.name === name; })) return false;
      formats.push({ name: name, template: template });
      _save(formats);
      return true;
    },

    /**
     * 删除一条自定义格式。
     * @param {string} name
     */
    remove: function (name) {
      var formats = _load().filter(function (f) { return f.name !== name; });
      _save(formats);
    },

    /**
     * 更新一条自定义格式。
     * @param {string} oldName - 原名称
     * @param {string} newName - 新名称
     * @param {string} template - 新模板
     * @return {boolean}
     */
    update: function (oldName, newName, template) {
      var formats = _load();
      var idx = formats.findIndex(function (f) { return f.name === oldName; });
      if (idx === -1) return false;
      formats[idx] = { name: newName, template: template };
      _save(formats);
      return true;
    },

    /**
     * 用给定条目和格式名渲染引用。
     * @param {Object} item - 文献条目
     * @param {string} formatName - 格式名称
     * @return {string}
     */
    generate: function (item, formatName) {
      var formats = _load();
      var found = formats.find(function (f) { return f.name === formatName; });
      if (!found) return '';
      return renderTemplate(item, found.template);
    },
  };

  // ---- 暴露全局 API ----
  window.CitationTemplates = CitationTemplates;
})();
