/**
 * @fileoverview 引用格式注册模块
 * 定义 APA 7th / MLA 9th / Chicago 17th (作者-日期 & 注释-书目) /
 * GB/T 7714-2015 / IEEE 共 6 种格式函数，存入 window.CitationFormats。
 *
 * T01 阶段：骨架实现，格式函数返回基础格式化字符串。
 * T02 阶段将完善各格式的精确模板。
 *
 * @module CitationFormats
 */

(function () {
  'use strict';

  /**
   * 格式函数签名
   * @callback FormatFunction
   * @param {Object} item - LiteratureItem，来自 appData.literature
   * @return {string} 格式化后的引用字符串
   */

  // ---- 全局引用格式注册表 (Map) ----
  var formatMap = new Map();

  // =========================================================================
  //  通用工具函数
  // =========================================================================

  /**
   * 字段缺值 fallback —— 返回字符串，避免 undefined/null。
   * @param {*} value
   * @param {string} [fallback='']
   * @return {string}
   */
  function fb(value, fallback) {
    if (fallback === undefined) fallback = '';
    return (value !== undefined && value !== null && value !== '') ? String(value) : fallback;
  }

  function inferType(item) {
    var title = (item.title || '').toLowerCase();
    if (item.journal) return 'journal';
    if (/\b(conference|proceedings|symposium|workshop)\b/i.test(title)) return 'conference';
    if (/\b(dissertation|thesis|ph\.?d\.?|博士|硕士)\b/i.test(title)) return 'thesis';
    return 'book';
  }
  var GB_TYPE_MAP = { journal: 'J', book: 'M', conference: 'C', thesis: 'D' };
  /**
   * 智能拼接 —— 过滤空字符串后按分隔符拼接，避免多余标点。
   * @param {Array<string>} parts
   * @param {string} [delimiter=', ']
   * @return {string}
   */
  function joinWithDelimiter(parts, delimiter) {
    if (delimiter === undefined) delimiter = ', ';
    return parts.filter(function (p) { return p !== ''; }).join(delimiter);
  }

  /**
   * 获取年份显示文本 —— 缺失时返回 "[n.d.]"。
   * @param {Object} item
   * @return {string}
   */
  function getYear(item) {
    var year = fb(item.year);
    return year !== '' ? year : '[n.d.]';
  }

  // =========================================================================
  //  APA 7th
  // =========================================================================

  /**
   * APA 7th 格式。
   *
   * 期刊:  Author, A. A., & Author, B. B. (Year). Title. Journal, Vol(Issue), Pages. DOI
   * 书籍:  Author, A. A. (Year). Title. Publisher.
   *
   * @param {Object} item
   * @return {string}
   */
  function formatAPA7th(item) {
    var authors = window.CitationAuthor
      ? window.CitationAuthor.parseAuthors(fb(item.authors))
      : [];
    var authorStr = window.CitationAuthor
      ? window.CitationAuthor.formatAuthorAPA(authors)
      : fb(item.authors);

    var title = fb(item.title);
    var journal = fb(item.journal);
    var year = getYear(item);
    var volume = fb(item.volume);
    var issue = fb(item.issue);
    var pages = fb(item.pages);
    var doi = fb(item.doi);
    var publisher = fb(item.publisher);

    // 构建作者+年份前缀
    var head = authorStr ? authorStr + ' (' + year + '). ' : '(' + year + '). ';

    // 期刊论文
    if (journal) {
      var volIssue = '';
      if (volume) {
        volIssue = volume;
        if (issue) volIssue += '(' + issue + ')';
      }
      var sourceParts = [journal];
      if (volIssue) sourceParts.push(volIssue);
      if (pages) sourceParts.push(pages);
      var source = joinWithDelimiter(sourceParts);

      var suffixParts = [];
      if (doi) suffixParts.push('https://doi.org/' + doi);
      var suffix = suffixParts.length > 0 ? ' ' + suffixParts.join(' ') : '';

      return head + title + '. ' + source + '.' + suffix;
    }

    // 书籍
    var bookParts = [head + title + '.'];
    if (publisher) bookParts.push(publisher + '.');
    return bookParts.join(' ');
  }

  // =========================================================================
  //  MLA 9th
  // =========================================================================

  /**
   * MLA 9th 格式。
   *
   * 期刊:  Author. "Title." Journal, vol. Vol, no. Issue, Year, pp. Pages.
   *
   * @param {Object} item
   * @return {string}
   */
  function formatMLA9th(item) {
    var authors = window.CitationAuthor
      ? window.CitationAuthor.parseAuthors(fb(item.authors))
      : [];
    var authorStr = window.CitationAuthor
      ? window.CitationAuthor.formatAuthorMLA(authors)
      : fb(item.authors);

    var title = fb(item.title);
    var journal = fb(item.journal);
    var year = getYear(item);
    var volume = fb(item.volume);
    var issue = fb(item.issue);
    var pages = fb(item.pages);
    var doi = fb(item.doi);
    var publisher = fb(item.publisher);

    var parts = [];

    if (authorStr) parts.push(authorStr + '.');

    // 标题用引号
    parts.push('"' + title + '."');

    // MLA: 期刊 vs 书籍
    if (journal) {
      var sourceParts = [];
      sourceParts.push(journal);
      if (volume) sourceParts.push('vol. ' + volume);
      if (issue) sourceParts.push('no. ' + issue);
      if (year) sourceParts.push(year);
      if (pages) sourceParts.push('pp. ' + pages);
      parts.push(joinWithDelimiter(sourceParts) + '.');
      if (doi) parts.push('DOI: ' + doi + '.');
    } else {
      if (publisher) parts.push(publisher + ',');
      if (year) parts.push(year + '.');
    }

    return parts.join(' ');
  }

  // =========================================================================
  //  Chicago 17th — 作者-日期
  // =========================================================================

  /**
   * Chicago 17th (作者-日期)。
   *
   * 期刊:  Author. Year. "Title." Journal Vol (Issue): Pages. DOI
   *
   * @param {Object} item
   * @return {string}
   */
  function formatChicagoAuthorDate(item) {
    var authors = window.CitationAuthor
      ? window.CitationAuthor.parseAuthors(fb(item.authors))
      : [];
    var authorStr = window.CitationAuthor
      ? window.CitationAuthor.formatAuthorChicago(authors)
      : fb(item.authors);

    var title = fb(item.title);
    var journal = fb(item.journal);
    var year = getYear(item);
    var volume = fb(item.volume);
    var issue = fb(item.issue);
    var pages = fb(item.pages);
    var doi = fb(item.doi);
    var publisher = fb(item.publisher);

    var parts = [];

    if (authorStr) parts.push(authorStr + '.');
    parts.push(year + '.');

    // 标题用引号
    parts.push('"' + title + '."');

    // 来源: 期刊 vs 书籍
    if (journal) {
      var sourceParts = [journal];
      var volIssueStr = volume;
      if (issue) volIssueStr += ' (' + issue + ')';
      if (volIssueStr) sourceParts.push(volIssueStr);
      if (pages) sourceParts.push(': ' + pages);
      parts.push(joinWithDelimiter(sourceParts) + '.');
      if (doi) parts.push('https://doi.org/' + doi + '.');
    } else {
      if (publisher) parts.push(publisher + '.');
    }

    return parts.join(' ');
  }

  // =========================================================================
  //  Chicago 17th — 注释-书目
  // =========================================================================

  /**
   * Chicago 17th (注释-书目)。
   *
   * 期刊:  Author. "Title." Journal Vol, no. Issue (Year): Pages.
   *
   * @param {Object} item
   * @return {string}
   */
  function formatChicagoNotesBib(item) {
    var authors = window.CitationAuthor
      ? window.CitationAuthor.parseAuthors(fb(item.authors))
      : [];
    var authorStr = window.CitationAuthor
      ? window.CitationAuthor.formatAuthorChicago(authors)
      : fb(item.authors);

    var title = fb(item.title);
    var journal = fb(item.journal);
    var year = getYear(item);
    var volume = fb(item.volume);
    var issue = fb(item.issue);
    var pages = fb(item.pages);
    var publisher = fb(item.publisher);

    var parts = [];

    if (authorStr) parts.push(authorStr + '.');
    parts.push('"' + title + '."');

    if (journal) {
      var sourceParts = [journal];
      if (volume) sourceParts.push(volume);
      if (issue) sourceParts.push('no. ' + issue);
      if (year) sourceParts.push('(' + year + ')');
      if (pages) sourceParts.push(pages);
      parts.push(joinWithDelimiter(sourceParts) + '.');
    } else {
      if (publisher) parts.push(publisher + ',');
      if (year) parts.push(year + '.');
    }

    return parts.join(' ');
  }

  // =========================================================================
  //  GB/T 7714-2015
  // =========================================================================

  /**
   * GB/T 7714-2015。
   *
   * 中文期刊: 作者. 题名[J]. 刊名, 年, 卷(期): 页码. DOI.
   * 英文期刊: AUTHOR A, AUTHOR B. Title[J]. Journal, Year, Volume(Issue): Pages. DOI.
   *
   * 内部通过 CitationLang.detectLanguage(title) 自动切换中/英文子格式。
   *
   * @param {Object} item
   * @return {string}
   */
  function formatGBT7714(item) {
    var title = fb(item.title);
    var isChinese = window.CitationLang
      ? window.CitationLang.detectLanguage(title) === 'zh'
      : false;

    var authors = window.CitationAuthor
      ? window.CitationAuthor.parseAuthors(fb(item.authors))
      : [];
    var authorStr = window.CitationAuthor
      ? window.CitationAuthor.formatAuthorGB776(authors)
      : fb(item.authors);

    var journal = fb(item.journal);
    var year = fb(item.year);
    var volume = fb(item.volume);
    var issue = fb(item.issue);
    var pages = fb(item.pages);
    var doi = fb(item.doi);
    var refType = GB_TYPE_MAP[inferType(item)] || 'M';

    if (isChinese) {
      // 中文子格式 — 全角标点
      var zhParts = [];
      if (authorStr) zhParts.push(authorStr);
      zhParts.push(title + '[' + refType + '].');

      var zhSourceParts = [];
      if (journal) zhSourceParts.push(journal);
      if (year) zhSourceParts.push(year);
      var volIssueZh = '';
      if (volume) volIssueZh = volume;
      if (issue) volIssueZh += '(' + issue + ')';
      if (volIssueZh) zhSourceParts.push(volIssueZh);
      if (pages) zhSourceParts.push(pages);
      zhParts.push(zhSourceParts.join(', ') + '.');

      if (doi) zhParts.push('DOI: ' + doi + '.');

      return zhParts.join(' ');
    }

    // 英文子格式 — 半角标点
    var enParts = [];
    if (authorStr) enParts.push(authorStr);
    enParts.push(title + '[' + refType + '].');

    var enSourceParts = [];
    if (journal) enSourceParts.push(journal);
    if (year) enSourceParts.push(String(year));
    var volIssueEn = '';
    if (volume) volIssueEn = volume;
    if (issue) volIssueEn += '(' + issue + ')';
    if (volIssueEn) enSourceParts.push(volIssueEn);
    if (pages) enSourceParts.push(pages);
    enParts.push(enSourceParts.join(', ') + '.');

    if (doi) enParts.push('DOI: ' + doi + '.');

    return enParts.join(' ');
  }

  // =========================================================================
  //  IEEE
  // =========================================================================

  /**
   * IEEE 格式。
   *
   *   期刊: [N] A. Author, "Title," Journal, vol. Vol, no. Issue, pp. Pages, Year.
   *
   * 编号 [N] 由批量生成时统一分配，单条调用时固定为 [1]。
   *
   * @param {Object} item
   * @param {number} [index=1] - 引用编号
   * @return {string}
   */
  function formatIEEE(item, index) {
    if (index === undefined) index = 1;

    var authors = window.CitationAuthor
      ? window.CitationAuthor.parseAuthors(fb(item.authors))
      : [];
    var authorStr = window.CitationAuthor
      ? window.CitationAuthor.formatAuthorIEEE(authors)
      : fb(item.authors);

    var title = fb(item.title);
    var journal = fb(item.journal);
    var year = fb(item.year);
    var volume = fb(item.volume);
    var issue = fb(item.issue);
    var pages = fb(item.pages);
    var doi = fb(item.doi);
    var publisher = fb(item.publisher);

    var parts = [];

    if (authorStr) parts.push(authorStr + ',');

    parts.push('"' + title + ',"');

    if (journal) {
      var sourceParts = [];
      sourceParts.push(journal);
      if (volume) sourceParts.push('vol. ' + volume);
      if (issue) sourceParts.push('no. ' + issue);
      if (pages) sourceParts.push('pp. ' + pages);
      if (year) sourceParts.push(String(year));
      parts.push(joinWithDelimiter(sourceParts) + '.');
      if (doi) parts.push('doi: ' + doi + '.');
    } else {
      if (publisher) parts.push(publisher + ',');
      if (year) parts.push(year + '.');
    }

    return parts.join(' ');
  }

  // =========================================================================
  //  注册所有格式
  // =========================================================================

  formatMap.set('APA 7th', formatAPA7th);
  formatMap.set('MLA 9th', formatMLA9th);
  formatMap.set('Chicago 17th (作者-日期)', formatChicagoAuthorDate);
  formatMap.set('Chicago 17th (注释-书目)', formatChicagoNotesBib);
  formatMap.set('GB/T 7714-2015', formatGBT7714);
  formatMap.set('IEEE', formatIEEE);

  // ---- 暴露全局 API ----
  window.CitationFormats = formatMap;
})();
