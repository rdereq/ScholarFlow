/**
 * @fileoverview 单条文献引用格式生成器
 *
 * 提供 6 种主流格式的单条引用生成函数，供 citation-engine.js 调用。
 *   - APA 7th
 *   - MLA 9th
 *   - Chicago Author-Date
 *   - Chicago Notes and Bibliography (参考书目条目)
 *   - GB/T 7714-2015
 *   - IEEE
 *
 * 辅助工具：
 *   - fb()           取字段值，空值返回 ''
 *   - toSentenceCase() 将 "TITLE OF PAPER" → "Title of paper"（句首大写）
 *   - toTitleCase()    将 "title of paper" → "Title of Paper"
 *   - getMonthAbbr()   月份 → IEEE 标准缩写 (Feb.)
 *   - getFullMonth()   月份 → 全名 (February)
 *   - formatDOI()      DOI 号转完整 URL
 *
 * @module CitationFormats
 */

(function () {
  'use strict';

  // =========================================================
  //  通用工具
  // =========================================================

  /** 空/undefined → '' */
  function fb(v) { return (v === undefined || v === null) ? '' : String(v); }

  /**
   * 句首大写（Sentence case）。
   * 仅将第一个字母大写；专有名词保留（简单处理：原输入已是正确大小写的即保留）。
   * "Deep Learning for Natural Language Processing" → "Deep learning for natural language processing"
   */
  function toSentenceCase(s) {
    if (!s || s.length === 0) return '';
    // 首字母大写 + 其余字母小写（但英文常见词保留小写逻辑让 CSS / 后续处理决定）
    var first = s.charAt(0).toUpperCase();
    var rest = s.slice(1).toLowerCase();
    return first + rest;
  }

  /**
   * 标题式大写（Title case）。
   * "topological protection of bound states against the hybridization" →
   * "Topological Protection of Bound States against the Hybridization"
   *
   * 规则：首词、末词必大写；其余实词大写；冠词/短介词/连词小写。
   */
  function toTitleCase(s) {
    if (!s || s.length === 0) return '';

    var lowerSet = {
      'a': 1, 'an': 1, 'the': 1,
      'and': 1, 'or': 1, 'but': 1, 'nor': 1, 'so': 1, 'yet': 1,
      'in': 1, 'on': 1, 'at': 1, 'by': 1, 'for': 1, 'of': 1, 'to': 1,
      'with': 1, 'as': 1, 'from': 1, 'into': 1, 'through': 1,
      'during': 1, 'before': 1, 'after': 1, 'above': 1, 'below': 1,
      'between': 1, 'out': 1, 'off': 1, 'over': 1, 'under': 1,
      'is': 1, 'am': 1, 'are': 1, 'was': 1, 'were': 1, 'be': 1, 'been': 1,
      'being': 1, 'have': 1, 'has': 1, 'had': 1, 'do': 1, 'does': 1, 'did': 1,
    };

    var words = s.split(/\s+/);
    var result = [];
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (w.length === 0) { result.push(w); continue; }
      // 首词/末词：强制大写
      if (i === 0 || i === words.length - 1) {
        result.push(w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      } else if (lowerSet[w.toLowerCase()]) {
        result.push(w.toLowerCase());
      } else {
        result.push(w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      }
    }
    return result.join(' ');
  }

  /** 将 "1" / "Jan" / "February" → "Feb." (IEEE 标准缩写) */
  function getMonthAbbr(m) {
    if (!m) return '';
    var key = String(m).trim().toLowerCase();
    var map = {
      '1': 'Jan', '01': 'Jan', 'jan': 'Jan', 'january': 'Jan',
      '2': 'Feb', '02': 'Feb', 'feb': 'Feb', 'february': 'Feb',
      '3': 'Mar', '03': 'Mar', 'mar': 'Mar', 'march': 'Mar',
      '4': 'Apr', '04': 'Apr', 'apr': 'Apr', 'april': 'Apr',
      '5': 'May', '05': 'May', 'may': 'May',
      '6': 'Jun', '06': 'Jun', 'jun': 'Jun', 'june': 'Jun',
      '7': 'Jul', '07': 'Jul', 'jul': 'Jul', 'july': 'Jul',
      '8': 'Aug', '08': 'Aug', 'aug': 'Aug', 'august': 'Aug',
      '9': 'Sep', '09': 'Sep', 'sep': 'Sep', 'sept': 'Sep', 'september': 'Sep',
      '10': 'Oct', 'oct': 'Oct', 'october': 'Oct',
      '11': 'Nov', 'nov': 'Nov', 'november': 'Nov',
      '12': 'Dec', 'dec': 'Dec', 'december': 'Dec',
    };
    var found = map[key];
    return found ? found + '.' : '';
  }

  /** 将月份 → 完整英文 (February) */
  function getFullMonth(m) {
    if (!m) return '';
    var key = String(m).trim().toLowerCase();
    var map = {
      '1': 'January', '01': 'January', 'jan': 'January', 'january': 'January',
      '2': 'February', '02': 'February', 'feb': 'February', 'february': 'February',
      '3': 'March', '03': 'March', 'mar': 'March', 'march': 'March',
      '4': 'April', '04': 'April', 'apr': 'April', 'april': 'April',
      '5': 'May', '05': 'May', 'may': 'May',
      '6': 'June', '06': 'June', 'jun': 'June', 'june': 'June',
      '7': 'July', '07': 'July', 'jul': 'July', 'july': 'July',
      '8': 'August', '08': 'August', 'aug': 'August', 'august': 'August',
      '9': 'September', '09': 'September', 'sep': 'September', 'sept': 'September', 'september': 'September',
      '10': 'October', 'oct': 'October', 'october': 'October',
      '11': 'November', 'nov': 'November', 'november': 'November',
      '12': 'December', 'dec': 'December', 'december': 'December',
    };
    return map[key] || '';
  }

  /** 将 DOI 号规范化为 URL (若已是 http 开头则原样返回) */
  function formatDOI(doiRaw) {
    if (!doiRaw || doiRaw.length === 0) return '';
    var s = doiRaw.trim();
    if (/^https?:\/\//i.test(s)) return s;
    return 'https://doi.org/' + s.replace(/^doi:\s*/i, '');
  }

  // =========================================================
  //  APA 7th
  // =========================================================
  /**
   * APA 7th 期刊论文引用。
   *
   * 标准：
   *   Author, A. B., & Author, C. D. (Year). Title of paper.
   *   Journal Name, Volume(Issue), page-page. https://doi.org/xxxx
   *
   * 大小写：文章标题 sentence case；期刊名 title case + 斜体。
   *
   * @param {Object} item - 文献对象
   * @return {string}
   */
  function formatAPA(item) {
    var authors = window.CitationAuthor
      ? window.CitationAuthor.formatAuthorAPA(window.CitationAuthor.parseAuthors(fb(item.authors)))
      : fb(item.authors);

    var year = fb(item.year);
    var title = toSentenceCase(fb(item.title));
    var journal = fb(item.journal);
    var volume = fb(item.volume);
    var issue = fb(item.issue);
    var pages = fb(item.pages);
    var articleNo = fb(item.articleNo);
    var doi = formatDOI(fb(item.doi));

    var out = [];

    if (authors) out.push(authors);
    if (year) out.push(' (' + year + ')');
    else out.push(' (n.d.)');
    out.push('. ' + title + '.');

    if (journal) {
      out.push(' ' + journal);
      if (volume) {
        out.push(', ' + volume);
        if (issue) out.push('(' + issue + ')');
      }
      if (pages) out.push(', ' + pages);
      else if (articleNo) out.push(', Article ' + articleNo);
      out.push('.');
    }

    if (doi) out.push(' ' + doi);

    return out.join('');
  }

  // =========================================================
  //  MLA 9th
  // =========================================================
  /**
   * MLA 9th 期刊论文引用。
   *
   * 标准：
   *   Author Last, First, First Last, and First Last.
   *   "Title of Article." *Journal Title*, vol. X, no. Y,
   *   Mmm. YYYY, pp. Z-Z. https://doi.org/xxxx
   *
   * 大小写：文章标题 title case + 双引号；期刊名 title case + 斜体。
   *
   * @param {Object} item
   * @return {string}
   */
  function formatMLA(item) {
    var authors = window.CitationAuthor
      ? window.CitationAuthor.formatAuthorMLA(window.CitationAuthor.parseAuthors(fb(item.authors)))
      : fb(item.authors);

    var title = toTitleCase(fb(item.title));
    var journal = toTitleCase(fb(item.journal));
    var volume = fb(item.volume);
    var issue = fb(item.issue);
    var year = fb(item.year);
    var month = getMonthAbbr(fb(item.month));
    var pages = fb(item.pages);
    var doi = formatDOI(fb(item.doi));

    var out = [];
    out.push(authors + '.');
    if (title) out.push(' "' + title + '."');
    if (journal) {
      out.push(' ' + journal);
      var jparts = [];
      if (volume) jparts.push('vol. ' + volume);
      if (issue) jparts.push('no. ' + issue);
      // 日期：月份+年份 或仅年份
      if (month && year) jparts.push(month + ' ' + year);
      else if (year) jparts.push(year);
      if (pages) jparts.push('pp. ' + pages);
      if (jparts.length > 0) out.push(', ' + jparts.join(', '));
      out.push('.');
    }
    if (doi) out.push(' ' + doi);

    return out.join('');
  }

  // =========================================================
  //  Chicago Author-Date
  // =========================================================
  /**
   * Chicago 作者-日期 期刊论文引用。
   *
   * 标准：
   *   Author, First, First Last, and First Last. Year.
   *   "Title of Article." Journal Title Volume, no. Issue
   *   (Month): pages. https://doi.org/xxxx
   *
   * 大小写：文章标题 title case + 双引号；期刊 title case + 斜体；卷号无逗号跟期刊。
   *
   * @param {Object} item
   * @return {string}
   */
  function formatChicagoAuthorDate(item) {
    var authors = window.CitationAuthor
      ? window.CitationAuthor.formatAuthorChicago(window.CitationAuthor.parseAuthors(fb(item.authors)))
      : fb(item.authors);

    var title = toTitleCase(fb(item.title));
    var journal = toTitleCase(fb(item.journal));
    var year = fb(item.year);
    var month = getFullMonth(fb(item.month));
    var volume = fb(item.volume);
    var issue = fb(item.issue);
    var pages = fb(item.pages);
    var articleNo = fb(item.articleNo);
    var doi = formatDOI(fb(item.doi));

    var out = [];
    out.push(authors);
    if (year) out.push('. ' + year);
    else out.push('.');
    if (title) out.push('. "' + title + '."');

    if (journal) {
      out.push(' ' + journal);
      var after = [];
      if (volume) after.push(' ' + volume);
      if (issue) after.push(', no. ' + issue);
      // (Month): pages
      if (pages || articleNo) {
        var parentPart = '';
        if (month) parentPart = month;
        var pageStr = pages ? pages : 'Article ' + articleNo;
        if (parentPart) after.push(' (' + parentPart + '): ' + pageStr);
        else after.push(': ' + pageStr);
      } else if (month) {
        after.push(' (' + month + ')');
      }
      out.push(after.join('') + '.');
    } else if (pages || articleNo) {
      out.push(': ' + (pages || ('Article ' + articleNo)));
    }

    if (doi) out.push(' ' + doi);

    return out.join('');
  }

  // =========================================================
  //  Chicago Notes and Bibliography (参考书目)
  // =========================================================
  /**
   * Chicago 注释-书目（参考书目条目）。
   *
   * 标准：
   *   Author Last, First, First Last, and First Last.
   *   "Title of Article." Journal Title Volume, no. Issue
   *   (Month Year): pages. https://doi.org/xxxx.
   *
   * 区别于 AD 主要是：年份与月份共同放在括号中；无独立年份前置。
   *
   * @param {Object} item
   * @return {string}
   */
  function formatChicagoNotesBib(item) {
    var authors = window.CitationAuthor
      ? window.CitationAuthor.formatAuthorChicago(window.CitationAuthor.parseAuthors(fb(item.authors)))
      : fb(item.authors);

    var title = toTitleCase(fb(item.title));
    var journal = toTitleCase(fb(item.journal));
    var year = fb(item.year);
    var month = getFullMonth(fb(item.month));
    var volume = fb(item.volume);
    var issue = fb(item.issue);
    var pages = fb(item.pages);
    var articleNo = fb(item.articleNo);
    var doi = formatDOI(fb(item.doi));

    var out = [];
    out.push(authors);
    if (title) out.push('. "' + title + '."');

    if (journal) {
      out.push(' ' + journal);
      var after = [];
      if (volume) after.push(' ' + volume);
      if (issue) after.push(', no. ' + issue);

      // (Month Year): pages
      var dateInParen = '';
      if (month && year) dateInParen = month + ' ' + year;
      else if (year) dateInParen = year;

      if (pages || articleNo) {
        var pageStr = pages ? pages : 'Article ' + articleNo;
        if (dateInParen) after.push(' (' + dateInParen + '): ' + pageStr);
        else after.push(': ' + pageStr);
      } else if (dateInParen) {
        after.push(' (' + dateInParen + ')');
      }
      out.push(after.join('') + '.');
    }

    if (doi) out.push(' ' + doi);

    return out.join('');
  }

  // =========================================================
  //  GB/T 7714-2015
  // =========================================================
  /**
   * GB/T 7714-2015 顺序编码制 —— 期刊论文条目本体。
   *
   * 标准（期刊论文）：
   *   作者. 文献题名[J]. 刊名, 出版年, 卷(期): 起止页码. DOI
   *   英文作者：FAMILY A B, FAMILY2 C D.
   *   >3 位作者：前 3 位 + ", 等" / ", et al"
   *
   * 本函数返回不带 [序号] 前缀的条目正文。编号由调用方统一添加。
   *
   * @param {Object} item
   * @return {string}
   */
  function formatGBT7714(item) {
    var authors = window.CitationAuthor
      ? window.CitationAuthor.formatAuthorGB776(window.CitationAuthor.parseAuthors(fb(item.authors)))
      : fb(item.authors);

    var title = fb(item.title);
    var journal = fb(item.journal);
    var year = fb(item.year);
    var volume = fb(item.volume);
    var issue = fb(item.issue);
    var pages = fb(item.pages);
    var doi = formatDOI(fb(item.doi));

    var out = [];
    out.push(authors + '.');
    if (title) out.push(' ' + title + '[J].');
    if (journal) {
      out.push(' ' + journal);
      var jparts = [];
      if (year) jparts.push(year);
      if (volume && issue) jparts.push(volume + '(' + issue + ')');
      else if (volume) jparts.push(volume);
      else if (issue) jparts.push('(' + issue + ')');
      if (jparts.length > 0) out.push(', ' + jparts.join(', '));
      if (pages) out.push(': ' + pages);
      out.push('.');
    }
    if (doi) out.push(' ' + doi + '.');

    return out.join('');
  }

  // =========================================================
  //  IEEE
  // =========================================================
  /**
   * IEEE 期刊论文引用（单条，不带编号）。
   *
   * 标准：
   *   A. B. Author, C. D. Author, and E. F. Author,
   *   "Title of paper," *Journal Name*, vol. X, no. Y,
   *   pp. Z-Z, Mmm. YYYY. doi: 10.xxx/yyy
   *
   * 特殊：
   *   - 无页码 → 用 Art. no. XXXX
   *   - 无卷号期号页码 → 用 Early Access 替代
   *   - 编号 ([1]) 由批量生成的调用方添加
   *
   * @param {Object} item
   * @return {string}
   */
  function formatIEEE(item) {
    var authors = window.CitationAuthor
      ? window.CitationAuthor.formatAuthorIEEE(window.CitationAuthor.parseAuthors(fb(item.authors)))
      : fb(item.authors);

    var title = toSentenceCase(fb(item.title));
    var journal = toTitleCase(fb(item.journal));
    var year = fb(item.year);
    var month = getMonthAbbr(fb(item.month));
    var volume = fb(item.volume);
    var issue = fb(item.issue);
    var pages = fb(item.pages);
    var articleNo = fb(item.articleNo);
    var doi = fb(item.doi);

    var out = [];
    if (authors) out.push(authors + ',');
    if (title) out.push(' "' + title + ',"');

    if (journal) {
      out.push(' ' + journal);
      var jparts = [];
      if (volume) {
        jparts.push('vol. ' + volume);
        if (issue) jparts.push('no. ' + issue);
        if (pages) jparts.push('pp. ' + pages);
        else if (articleNo) jparts.push('Art. no. ' + articleNo);
      } else if (pages) {
        jparts.push('pp. ' + pages);
      } else if (articleNo) {
        jparts.push('Art. no. ' + articleNo);
      } else {
        jparts.push('Early Access');
      }

      var dateStr = '';
      if (month && year) dateStr = month + ' ' + year;
      else if (year) dateStr = year;
      if (dateStr) jparts.push(dateStr);

      out.push(', ' + jparts.join(', ') + '.');
    }

    if (doi) out.push(' doi: ' + doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '') + '.');

    return out.join('');
  }

  // =========================================================
  //  注册 —— 供 citation-engine.js 调用
  // =========================================================
  window.CitationFormats = {
    'APA 7th': formatAPA,
    'MLA 9th': formatMLA,
    'Chicago Author-Date': formatChicagoAuthorDate,
    'Chicago Notes and Bibliography': formatChicagoNotesBib,
    'GB/T 7714-2015': formatGBT7714,
    'IEEE': formatIEEE,
  };
})();
