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

  // ---- 暴露全局 API ----
  window.CitationExport = {
    exportToText: exportToText,
    exportToMarkdown: exportToMarkdown,
    copyToClipboard: copyToClipboard,
  };
})();
