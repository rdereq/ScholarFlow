/**
 * @fileoverview 作者名解析与多格式格式化模块
 * 支持中英文作者名的解析，以及 APA/MLA/Chicago/GB-T/IEEE 五种引用格式的作者格式化。
 *
 * 本模块仅负责【作者字段】的格式化，不处理整个引用条目。
 * 每个 formatAuthorXxx 函数返回完整的作者字符串（不含尾部标点）。
 *
 * @module CitationAuthor
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  //  解析
  // ---------------------------------------------------------------------------

  /**
   * 解析原始作者字符串为结构化数组。
   *
   * 规则：
   *   - 英文名：自动识别 "Family, Given; Family, Given" (BibTeX 风格)
   *                      或 "Given Family, Given Family" (自然顺序)
   *                      或 "A. B. Family, C. D. Family2" (IEEE 风格)
   *   - 中文名：按逗号/分号/中文标点拆分
   *   - 空输入返回空数组
   *
   * 算法：先看整个字符串是否包含分号。若包含，以分号为作者分隔符；
   *       否则以逗号为作者分隔符。每段内：若段内包含逗号 → "Family, Given"；
   *       若段内为纯空格分隔 → "Given1 Given2 Family"（最后一词为姓）。
   *
   * @param {string} raw - 原始作者字符串，如 "Smith, John; Brown, A." 或 "王五,赵六"
   * @return {Array<ParsedAuthor>}
   */
  function parseAuthors(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim() === '') return [];

    var rawTrimmed = raw.trim();

    // ---- 中文名检测 ----
    var isChinese = window.CitationLang
      ? window.CitationLang.detectLanguage(rawTrimmed) === 'zh'
      : false;

    if (isChinese) {
      var parts = rawTrimmed.split(/[,;，；]+/);
      var result = [];
      for (var i = 0; i < parts.length; i++) {
        var name = parts[i].trim();
        if (name.length > 0) result.push({ family: name, given: '' });
      }
      return result;
    }

    // ==== 英文名解析 ====
    var authorSegments;
    var hasSemicolon = (rawTrimmed.indexOf(';') !== -1);
    if (hasSemicolon) {
      authorSegments = rawTrimmed.split(/;+/);
    } else {
      authorSegments = rawTrimmed.split(/,+/);
    }

    var authors = [];

    // ---- 启发式：无分号 且 所有段均为单词 → 两两配对 Family, Given ----
    // （如 "X. Wang, Y. Ding, Z. Liu" 或 "Wang, John, Brown, Alice"）
    if (!hasSemicolon && authorSegments.length > 0) {
      var allSingleWord = true;
      for (var k = 0; k < authorSegments.length; k++) {
        var t = authorSegments[k].trim().replace(/\.+$/, '').trim();
        if (t === '') continue;
        var tk = t.split(/\s+/).filter(function (x) { return x.length > 0; });
        if (tk.length > 1) { allSingleWord = false; break; }
      }
      if (allSingleWord && authorSegments.length > 1) {
        var cleaned = [];
        for (var m = 0; m < authorSegments.length; m++) {
          var sc = authorSegments[m].trim().replace(/\.+$/, '').trim();
          if (sc !== '') cleaned.push(sc);
        }
        if (cleaned.length % 2 === 0 && cleaned.length >= 2) {
          for (var p = 0; p < cleaned.length; p += 2) {
            authors.push({ family: cleaned[p], given: cleaned[p + 1] || '' });
          }
          return authors;
        }
      }
    }

    // ---- 逐段处理 ----
    for (var j = 0; j < authorSegments.length; j++) {
      var seg = authorSegments[j].trim().replace(/\.+$/, '').trim();
      if (seg === '') continue;

      var innerCommaIdx = seg.indexOf(',');
      if (innerCommaIdx !== -1) {
        var fp = seg.substring(0, innerCommaIdx).trim();
        var gp = seg.substring(innerCommaIdx + 1).trim();
        if (fp) {
          authors.push({ family: fp, given: gp });
          continue;
        }
      }

      var toks = seg.split(/\s+/).filter(function (tt) { return tt.length > 0; });
      if (toks.length === 0) continue;
      if (toks.length === 1) {
        authors.push({ family: toks[0], given: '' });
      } else {
        var g = toks.slice(0, toks.length - 1).join(' ');
        var f = toks[toks.length - 1];
        authors.push({ family: f, given: g });
      }
    }

    return authors;
  }

  // ---------------------------------------------------------------------------
  //  工具
  // ---------------------------------------------------------------------------

  /**
   * 将 given name 转为首字母形式（带句点）。
   * 支持：连字符名 → `B.-J.`，多词名 → `M. S.`，单字名 → `N.`。
   *
   * @param {string} given - 如 "John" / "Bohm-Jung" / "Mohammad Saeed"
   * @return {string} 如 "J." / "B.-J." / "M. S."
   */
  function getInitial(given) {
    if (!given || given.length === 0) return '';

    return given.split(/\s+/).filter(function (w) { return w.length > 0; })
      .map(function (w) {
        var hyphenParts = w.split(/-/);
        return hyphenParts.map(function (p) {
          if (!p) return '';
          var ch = p.charAt(0).toUpperCase();
          return ch + '.';
        }).join('-');
      }).join(' ');
  }

  /**
   * 首字母但不带句点（GB/T 7714 需要）。
   * "Mohammad Saeed" → "MS"，"Bohm-Jung" → "BJ"
   */
  function getInitialNoDot(given) {
    if (!given || given.length === 0) return '';

    var s = given.split(/\s+/).filter(function (w) { return w.length > 0; })
      .map(function (w) {
        return w.split(/-/).map(function (p) {
          return p ? p.charAt(0).toUpperCase() : '';
        }).join('');
      }).join('');
    return s;
  }

  // ---------------------------------------------------------------------------
  //  APA 7th
  // ---------------------------------------------------------------------------

  /**
   * APA 7th 作者格式化。
   *
   *   1 作者:       "Smith, J."
   *   2 作者:       "Smith, J., & Brown, A."
   *   3–20 作者:    "Smith, J., Brown, A., & Lee, C."          （全部列出 + Oxford &）
   *   ≥21 作者:     "Smith, J., ..., & Last, F. M."             （前 19 + … + 最后一位）
   *   中文作者:     "王五, 赵六, & 张三"                          （全名 + 逗号 + &）
   *
   * @param {Array<ParsedAuthor>} authors
   * @return {string}
   */
  function formatAuthorAPA(authors) {
    if (!authors || authors.length === 0) return '';

    var n = authors.length;
    var parts = [];

    for (var i = 0; i < n; i++) {
      var a = authors[i];
      var gi = a.given ? getInitial(a.given) : '';
      if (gi) {
        parts.push(a.family + ', ' + gi);
      } else {
        parts.push(a.family);
      }
    }

    // ≥21 位作者：保留前 19 + 省略 + 最后一位
    if (n >= 21) {
      var first19 = parts.slice(0, 19).join(', ');
      return first19 + ', …, & ' + parts[n - 1];
    }

    if (n === 1) return parts[0];
    if (n === 2) return parts[0] + ', & ' + parts[1];

    var last = parts.pop();
    return parts.join(', ') + ', & ' + last;
  }

  // ---------------------------------------------------------------------------
  //  MLA 9th
  // ---------------------------------------------------------------------------

  /**
   * MLA 9th 作者格式化。
   *
   *   1 作者:       "Smith, John"
   *   2 作者:       "Smith, John, and Alice Brown"
   *   3 作者:       "Smith, John, Alice Brown, and Charlie Lee"
   *   >3 作者:      "Smith, John, et al."   （可配置但此处采用最常见的 et al. 截断）
   *
   *   注意：第一位作者 "姓, 名" 倒置；其余作者 "名 姓" 正序。
   *
   * @param {Array<ParsedAuthor>} authors
   * @return {string}
   */
  function formatAuthorMLA(authors) {
    if (!authors || authors.length === 0) return '';

    var n = authors.length;
    var first = authors[0];

    // 第一作者：Family, Given（given 若为首字母则补全为可读形式）
    // MLA 推荐给出全名；若只有首字母也可 → 保留原样
    var firstStr = first.family + (first.given ? ', ' + first.given : '');

    if (n === 1) return firstStr;
    if (n === 2) {
      var second = authors[1];
      return firstStr + ', and ' + (second.given ? second.given + ' ' : '') + second.family;
    }
    if (n === 3) {
      var s2 = authors[1];
      var s3 = authors[2];
      return firstStr
        + ', ' + (s2.given ? s2.given + ' ' : '') + s2.family
        + ', and ' + (s3.given ? s3.given + ' ' : '') + s3.family;
    }

    // >3 位作者：标准 MLA 写法 first author + et al.
    return firstStr + ', et al.';
  }

  // ---------------------------------------------------------------------------
  //  GB/T 7714-2015
  // ---------------------------------------------------------------------------

  /**
   * GB/T 7714-2015 作者格式化。
   *
   *   中文:   "王五, 赵六, 张三."     （若 >3 位: "王五, 赵六, 张三, 等."）
   *   英文:   "YANG B J, BAHRAMY M S, NAGAOSA N."
   *           （姓全大写 + 空格 + 名首字母大写无句点；>3 位作者 + ", et al."）
   *
   * 规则：
   *   - 检测第一作者姓是否含中文来判断中英
   *   - ≤3 全列；>3 位列前 3 位 + 等/et al.
   *   - 英文作者：FAMILY + 空格 + InitialsNoDot
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

    var n = authors.length;
    var limit = n > 3 ? 3 : n;
    var parts = [];

    for (var i = 0; i < limit; i++) {
      var a = authors[i];
      if (isChinese) {
        parts.push(a.family); // 中文：仅保留姓（这里其实是全名）
      } else {
        var famUp = a.family.toUpperCase();
        var initNoDot = a.given ? getInitialNoDot(a.given) : '';
        // 姓与首字母之间加空格
        parts.push(famUp + (initNoDot ? ' ' + initNoDot.split('').join(' ') : ''));
        // 如果 getInitialNoDot("Bohm-Jung") → "BJ" 我们要 B J → split join 处理
        // 这里要修正：连字符的 getInitialNoDot 返回 "BJ" 已对，split('').join(' ') 得 "B J"
      }
    }

    var delim = isChinese ? ', ' : ', ';
    var suffix = '';
    if (n > 3) {
      suffix = isChinese ? ', 等' : ', et al';
    }
    return parts.join(delim) + suffix;
  }

  // ---------------------------------------------------------------------------
  //  IEEE
  // ---------------------------------------------------------------------------

  /**
   * IEEE 作者格式化。
   *
   *   1 作者:   "J. Smith"
   *   2 作者:   "J. Smith and A. Brown"
   *   3+ 作者:  "J. Smith, A. Brown, and C. Lee"    （Oxford comma + and）
   *   中文作者:  "王五, 赵六, and 张三"                （直接用全名）
   *
   * 注：IEEE 中文作者通常保留全名，不强制转为 A. 姓。
   *
   * @param {Array<ParsedAuthor>} authors
   * @return {string}
   */
  function formatAuthorIEEE(authors) {
    if (!authors || authors.length === 0) return '';

    var n = authors.length;
    var parts = [];

    for (var i = 0; i < n; i++) {
      var a = authors[i];
      var gi = a.given ? getInitial(a.given) : '';
      if (gi) {
        parts.push(gi + ' ' + a.family);
      } else {
        parts.push(a.family);
      }
    }

    if (n === 1) return parts[0];
    if (n === 2) return parts[0] + ' and ' + parts[1];

    var last = parts.pop();
    return parts.join(', ') + ', and ' + last;
  }

  // ---------------------------------------------------------------------------
  //  Chicago (Author-Date & Notes and Bibliography 共用)
  // ---------------------------------------------------------------------------

  /**
   * Chicago 作者格式化（参考书目条目用）。
   *
   *   1 作者:   "Smith, John"
   *   2 作者:   "Smith, John, and Alice Brown"
   *   3+ 作者:  "Smith, John, Alice Brown, and Charlie Lee"
   *
   *   中文作者: "王五, 赵六, and 张三"  （直接保留全名；姓在前名在后无空格拆）
   *
   * 规则：所有作者均为 "Family, Given"（第一作者）与 "Given Family"（后续作者）。
   * 注意：Chicago 参考书目第一作者倒置，其余作者正序。
   *
   * @param {Array<ParsedAuthor>} authors
   * @return {string}
   */
  function formatAuthorChicago(authors) {
    if (!authors || authors.length === 0) return '';

    var n = authors.length;
    var first = authors[0];
    var firstStr = first.family + (first.given ? ', ' + first.given : '');

    if (n === 1) return firstStr;
    if (n === 2) {
      var s2 = authors[1];
      return firstStr + ', and ' + (s2.given ? s2.given + ' ' : '') + s2.family;
    }

    var others = [];
    for (var i = 1; i < n - 1; i++) {
      var a = authors[i];
      others.push((a.given ? a.given + ' ' : '') + a.family);
    }
    var last = authors[n - 1];
    var lastStr = (last.given ? last.given + ' ' : '') + last.family;

    return firstStr + (others.length > 0 ? ', ' + others.join(', ') : '') + ', and ' + lastStr;
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
