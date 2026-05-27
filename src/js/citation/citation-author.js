/**
 * @fileoverview 作者名解析与多格式格式化模块
 * 支持中英文作者名的解析，以及 APA/MLA/Chicago/GB-T/IEEE 五种引用格式的作者格式化。
 * @module CitationAuthor
 */

(function () {
  'use strict';

  /**
   * @typedef {Object} ParsedAuthor
   * @property {string} family - 姓氏（中文名时为完整姓名）
   * @property {string} given  - 名（首字母或全名，中文名时为空）
   */

  // ---------------------------------------------------------------------------
  //  解析
  // ---------------------------------------------------------------------------

  /**
   * 解析原始作者字符串为结构化数组。
   *
   * 规则：
   *   - 英文名：按逗号拆 → 每段 trim → 再按空格拆，最后一段为 given，其余为 family
   *   - 中文名：直接按逗号/分号拆 → 每个即完整姓名（family = 全名，given = ''）
   *   - 空输入返回空数组
   *
   * @param {string} raw - 原始作者字符串，如 "Smith, J., Brown, A." 或 "王五,赵六"
   * @return {Array<ParsedAuthor>}
   */
  function parseAuthors(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim() === '') {
      return [];
    }

    var rawTrimmed = raw.trim();

    // 检测是否中文名
    var isChinese = window.CitationLang
      ? window.CitationLang.detectLanguage(rawTrimmed) === 'zh'
      : false;

    if (isChinese) {
      // 中文名：按逗号/分号/中文标点拆分，每段即为完整姓名
      var parts = rawTrimmed.split(/[,;，；]+/);
      var result = [];
      for (var i = 0; i < parts.length; i++) {
        var name = parts[i].trim();
        if (name.length > 0) {
          result.push({ family: name, given: '' });
        }
      }
      return result;
    }

    // 英文名：按逗号拆分
    var segments = rawTrimmed.split(',');
    var authors = [];

    for (var j = 0; j < segments.length; j++) {
      var seg = segments[j].trim();
      if (seg === '') continue;

      var tokens = seg.split(/\s+/);
      if (tokens.length === 1) {
        // 单个词 → 整体为 family
        authors.push({ family: tokens[0], given: '' });
      } else {
        // 最后一个词为 given，其余为 family
        var given = tokens[tokens.length - 1];
        var family = tokens.slice(0, tokens.length - 1).join(' ');
        authors.push({ family: family, given: given });
      }
    }

    return authors;
  }

  // ---------------------------------------------------------------------------
  //  工具
  // ---------------------------------------------------------------------------

  /**
   * 获取英文名首字母大写形式。
   * @param {string} given - 名（如 "John" 或 "J."）
   * @return {string} 首字母大写 + 句点，如 "J."
   */
  function getInitial(given) {
    if (!given || given.length === 0) return '';
    return given.charAt(0).toUpperCase() + '.';
  }

  // ---------------------------------------------------------------------------
  //  APA 7th
  // ---------------------------------------------------------------------------

  /**
   * APA 7th 作者格式化。
   *
   *   1 作者:  "Smith, J."
   *   2 作者:  "Smith, J., & Brown, A."
   *   3+ 作者: "Smith, J., Brown, A., & Lee, C."
   *
   * @param {Array<ParsedAuthor>} authors
   * @return {string}
   */
  function formatAuthorAPA(authors) {
    if (!authors || authors.length === 0) return '';

    var parts = [];
    for (var i = 0; i < authors.length; i++) {
      var a = authors[i];
      var givenInit = a.given ? getInitial(a.given) : '';
      if (givenInit) {
        parts.push(a.family + ', ' + givenInit);
      } else {
        parts.push(a.family);
      }
    }

    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return parts[0] + ', & ' + parts[1];

    var last = parts.pop();
    return parts.join(', ') + ', & ' + last;
  }

  // ---------------------------------------------------------------------------
  //  MLA 9th
  // ---------------------------------------------------------------------------

  /**
   * MLA 9th 作者格式化。
   *
   *   1 作者:  "Smith, John"
   *   2 作者:  "Smith, John, and Alice Brown"
   *   3+ 作者: "Smith, John, et al."
   *
   * @param {Array<ParsedAuthor>} authors
   * @return {string}
   */
  function formatAuthorMLA(authors) {
    if (!authors || authors.length === 0) return '';

    var first = authors[0];
    var name = first.family + (first.given ? ', ' + first.given : '');

    if (authors.length === 1) return name;
    if (authors.length === 2) {
      var second = authors[1];
      return name + ', and ' + (second.given ? second.given + ' ' : '') + second.family;
    }

    return name + ', et al.';
  }

  // ---------------------------------------------------------------------------
  //  GB/T 7714-2015
  // ---------------------------------------------------------------------------

  /**
   * GB/T 7714-2015 作者格式化。
   *
   *   中文: "王五,赵六."    （逗号分隔 + 句号收尾）
   *   英文: "SMITH J, BROWN A." （姓氏全大写 + 空格 + 名首字母大写）
   *
   * 内部通过 CitationLang.detectLanguage 检测第一作者姓名来决定中/英文子格式。
   *
   * @param {Array<ParsedAuthor>} authors
   * @return {string}
   */
  function formatAuthorGB776(authors) {
    if (!authors || authors.length === 0) return '';

    var isChinese = false;
    if (authors[0].family) {
      isChinese = window.CitationLang
        ? window.CitationLang.detectLanguage(authors[0].family) === 'zh'
        : false;
    }

    var parts = [];
    for (var i = 0; i < authors.length; i++) {
      var a = authors[i];
      if (isChinese) {
        parts.push(a.family);
      } else {
        var familyUpper = a.family.toUpperCase();
        var givenInit = a.given ? getInitial(a.given) : '';
        parts.push(familyUpper + (givenInit ? ' ' + givenInit : ''));
      }
    }

    var delimiter = isChinese ? ',' : ', ';
    return parts.join(delimiter) + '.';
  }

  // ---------------------------------------------------------------------------
  //  IEEE
  // ---------------------------------------------------------------------------

  /**
   * IEEE 作者格式化。
   *
   *   "J. Smith, A. Brown"
   *
   * @param {Array<ParsedAuthor>} authors
   * @return {string}
   */
  function formatAuthorIEEE(authors) {
    if (!authors || authors.length === 0) return '';

    var parts = [];
    for (var i = 0; i < authors.length; i++) {
      var a = authors[i];
      var givenInit = a.given ? getInitial(a.given) : '';
      parts.push((givenInit ? givenInit + ' ' : '') + a.family);
    }

    return parts.join(', ');
  }

  // ---------------------------------------------------------------------------
  //  Chicago
  // ---------------------------------------------------------------------------

  /**
   * Chicago 作者格式化（作者-日期 与 注释-书目 共用）。
   *
   *   1 作者:  "Smith, John"
   *   2 作者:  "Smith, John, and Alice Brown"
   *   3+ 作者: "Smith, John, Alice Brown, and Charlie Lee"
   *
   * @param {Array<ParsedAuthor>} authors
   * @return {string}
   */
  function formatAuthorChicago(authors) {
    if (!authors || authors.length === 0) return '';

    var parts = [];
    for (var i = 0; i < authors.length; i++) {
      var a = authors[i];
      parts.push(a.family + (a.given ? ', ' + a.given : ''));
    }

    if (parts.length === 1) return parts[0];
    if (parts.length === 2) {
      return parts[0] + ', and ' + (authors[1].given ? authors[1].given + ' ' : '') + authors[1].family;
    }

    var last = parts.pop();
    return parts.join(', ') + ', and ' + last;
  }

  // ---- 暴露全局 API ----
  window.CitationAuthor = {
    parseAuthors: parseAuthors,
    formatAuthorAPA: formatAuthorAPA,
    formatAuthorMLA: formatAuthorMLA,
    formatAuthorGB776: formatAuthorGB776,
    formatAuthorIEEE: formatAuthorIEEE,
    formatAuthorChicago: formatAuthorChicago,
  };
})();
