/**
 * @fileoverview 中英文语言检测模块
 * 基于 Unicode CJK 字符范围检测文本语言，用于 GB/T 7714 等格式的中英文自动切换。
 * @module CitationLang
 */

(function () {
  'use strict';

  /**
   * CJK 字符 Unicode 范围
   *   基本汉字: 4E00–9FFF
   *   扩展 A:   3400–4DBF
   *   兼容汉字: F900–FAFF
   * @const {Array<Array<number>>}
   */
  var CJK_RANGES = [
    [0x4E00, 0x9FFF],
    [0x3400, 0x4DBF],
    [0xF900, 0xFAFF],
  ];

  /**
   * CJK 字符判定阈值 — 文本中 CJK 字符占比超过此值即判定为中文。
   * @const {number}
   */
  var CJK_THRESHOLD = 0.3;

  /**
   * 判断单个字符是否属于 CJK Unicode 范围。
   * @param {string} char - 单个字符
   * @return {boolean} 是否为 CJK 字符
   */
  function isCJK(char) {
    var code = char.charCodeAt(0);
    for (var i = 0; i < CJK_RANGES.length; i++) {
      if (code >= CJK_RANGES[i][0] && code <= CJK_RANGES[i][1]) {
        return true;
      }
    }
    return false;
  }

  /**
   * 检测文本语言。
   * 遍历所有非空白字符，统计 CJK 字符占比。若占比超过 30% 返回 `'zh'`，否则返回 `'en'`。
   *
   * @param {string} text - 待检测文本
   * @return {'zh'|'en'} 语言标识
   *
   * @example
   * detectLanguage('深度学习在自然语言处理中的应用');  // → 'zh'
   * @example
   * detectLanguage('Machine learning in NLP');           // → 'en'
   * @example
   * detectLanguage('');                                   // → 'en'
   */
  function detectLanguage(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return 'en';
    }

    var cjkCount = 0;
    var totalCount = 0;

    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      // 跳过空白字符
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        continue;
      }
      totalCount++;
      if (isCJK(ch)) {
        cjkCount++;
      }
    }

    if (totalCount === 0) {
      return 'en';
    }

    var ratio = cjkCount / totalCount;
    return ratio > CJK_THRESHOLD ? 'zh' : 'en';
  }

  // ---- 暴露全局 API ----
  window.CitationLang = {
    detectLanguage: detectLanguage,
  };
})();
