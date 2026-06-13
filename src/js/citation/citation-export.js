/**
 * @fileoverview 引用导出模块
 * 提供纯文本/Markdown 格式化导出及剪贴板复制功能。
 * @module CitationExport
 */

(function () {
  'use strict';

  /**
   * @typedef {Object} CitationExport
   * @property {Function} exportToText      - 导出纯文本
   * @property {Function} exportToMarkdown  - 导出 Markdown 编号列表
   * @property {Function} copyToClipboard   - 复制到剪贴板
   */

  /**
   * 将引用行数组拼接为纯文本。
   *
   * @param {Array<string>} lines - 引用字符串数组
   * @param {string} [sep='\n']   - 行分隔符
   * @return {string} 拼接后的纯文本
   */
  function exportToText(lines, sep) {
    if (!lines || lines.length === 0) return '';
    if (sep === undefined) sep = '\n';
    return lines.join(sep);
  }

  /**
   * 将引用行数组格式化为 Markdown 编号列表。
   *
   * @param {Array<string>} lines    - 引用字符串数组
   * @param {boolean} [ordered=true] - 是否使用有序列表（1. 2. 3.）
   * @return {string} Markdown 字符串
   */
  function exportToMarkdown(lines, ordered) {
    if (!lines || lines.length === 0) return '';
    if (ordered === undefined) ordered = true;

    var result = '';
    for (var i = 0; i < lines.length; i++) {
      if (ordered) {
        result += (i + 1) + '. ' + lines[i];
      } else {
        result += '- ' + lines[i];
      }
      if (i < lines.length - 1) {
        result += '\n\n';
      }
    }
    return result;
  }

  /**
   * 复制文本到系统剪贴板。
   * 优先使用现代 Clipboard API，失败时回退到 textarea + execCommand 方案。
   *
   * @param {string} text - 待复制文本
   * @return {Promise<void>}
   */
  function copyToClipboard(text) {
    // 现代 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        return fallbackCopy(text);
      });
    }
    return fallbackCopy(text);
  }

  /**
   * 剪贴板回退方案 —— 使用 textarea + document.execCommand('copy')。
   * @param {string} text
   * @return {Promise<void>}
   */
  function fallbackCopy(text) {
    return new Promise(function (resolve, reject) {
      try {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        var successful = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (successful) {
          resolve();
        } else {
          reject(new Error('execCommand("copy") 返回 false'));
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * 导出为 Word HTML 格式 (.doc)。
   * Word 可原生打开 HTML 文件，自动渲染为文档格式。
   *
   * @param {Array<string>} lines - 引用字符串数组
   * @param {boolean} ordered - 是否带编号
   * @return {string} Word 兼容的 HTML 字符串
   */
  function exportToWord(lines, ordered) {
    var items = (ordered !== false)
      ? lines.map(function (l, i) { return '<p style="margin-bottom:8px;padding-left:36px;text-indent:-36px;">[' + (i + 1) + '] ' + _escapeHTML(l) + '</p>'; })
      : lines.map(function (l) { return '<p style="margin-bottom:8px;">' + _escapeHTML(l) + '</p>'; });

    return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">'
      + '<head><meta charset="UTF-8"><style>body{font-family:"Times New Roman",SimSun,serif;font-size:12pt;line-height:2;margin:72pt;}</style></head>'
      + '<body>' + items.join('\n') + '</body></html>';
  }

  /**
   * 导出为 BibTeX 格式 (.bib)。
   * 兼容 BibLaTeX 和传统 BibTeX。
   *
   * @param {Array<Object>} items - 文献条目数组
   * @return {string} BibTeX 格式字符串
   */
  function exportToBibTeX(items) {
    var usedKeys = {};
    var entries = items.map(function (item, idx) {
      var key = _bibtexKey(item);
      // 防冲突：添加序号后缀
      var suffix = '';
      if (usedKeys[key] !== undefined) {
        suffix = String.fromCharCode(97 + usedKeys[key]); // a, b, c...
        usedKeys[key]++;
      } else {
        usedKeys[key] = 0;
      }
      key = key + suffix;
      
      // 文献类型推断（5种）: article / book / inproceedings / phdthesis / online
      var type = 'book';
      if (item.journal) {
        type = 'article';
      } else {
        var tlower = (item.title || '').toLowerCase();
        if (/\b(conference|proceedings|symposium|workshop)\b/i.test(tlower)) type = 'inproceedings';
        else if (/\b(dissertation|thesis|ph\.?d\.?|博士|硕士)\b/i.test(tlower)) type = 'phdthesis';
      }
      var lines = ['@' + type + '{' + key + ','];

      if (item.authors) lines.push('  author = {' + _bibtexAuthors(item.authors) + '},');
      if (item.title)  lines.push('  title = {' + _escapeBibTeX(item.title) + '},');
      if (item.journal) lines.push('  journal = {' + _escapeBibTeX(item.journal) + '},');
      if (item.year)   lines.push('  year = {' + item.year + '},');
      if (item.volume) lines.push('  volume = {' + item.volume + '},');
      if (item.issue)  lines.push('  number = {' + item.issue + '},');
      // 页码：- 转 --
      if (item.pages)  lines.push('  pages = {' + String(item.pages).replace(/-/g, '--') + '},');
      if (item.doi)    lines.push('  doi = {' + item.doi + '},');
      if (item.publisher) lines.push('  publisher = {' + _escapeBibTeX(item.publisher) + '},');

      lines.push('}');
      return lines.join('\n');
    });

    return entries.join('\n\n') + '\n';
  }

  // ---- BibTeX 辅助函数 ----

  function _bibtexKey(item) {
    var author = (item.authors || '').split(/[,;]/)[0].trim().replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
    if (!author) author = 'unknown';
    return author + (item.year || '0000') + ((item.title || '').replace(/[^a-zA-Z]/g, '').substring(0, 8));
  }

  function _bibtexAuthors(authorsStr) {
    // 使用 CitationAuthor 解析器（统一逗号/分号处理）
    var parsed = [];
    if (window.CitationAuthor && typeof window.CitationAuthor.parseAuthors === 'function') {
      parsed = window.CitationAuthor.parseAuthors(authorsStr);
    } else {
      // 回退：按逗号分号拆
      parsed = authorsStr.split(/[,;]+/).map(function (a) {
        var p = a.trim().split(/\s+/);
        return { family: p.length > 1 ? p[p.length - 1] : p[0] || '', given: p.length > 1 ? p.slice(0, -1).join(' ') : '' };
      });
    }
    return parsed.map(function (a) {
      return (a.family || '') + (a.given ? ', ' + a.given : '');
    }).filter(function (s) { return s.length > 0; }).join(' and ');
  }

  function _escapeBibTeX(text) {
    // 仅转义 BibTeX 特殊字符，不转义 DOI/URL 中的下划线
    return String(text).replace(/[&%$#{}~^\\]/g, '\\$&');
  }

  function _escapeHTML(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ---- 暴露全局 API ----
  window.CitationExport = {
    exportToText: exportToText,
    exportToMarkdown: exportToMarkdown,
    exportToWord: exportToWord,
    exportToBibTeX: exportToBibTeX,
    copyToClipboard: copyToClipboard,
  };
})();
