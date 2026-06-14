/**
 * ============================================================
 * ScholarFlow - Import/Export Module (v1.4)
 * ============================================================
 *
 * 本模块提供多格式文献元数据的导入和导出功能：
 *
 * 导入格式：
 *   - RIS (.ris)
 *   - EndNote XML (.xml, .enw)
 *   - Zotero RDF (.rdf)
 *   - Mendeley CSV (.csv)
 *   - CNKI / 知网 文本导出 (.txt, .net)
 *   - BibTeX (.bib) - 增强版
 *   - DOI 列表 (批量)
 *   - PDF 文件夹 (自动提取元数据)
 *
 * 导出格式：
 *   - RIS, BibTeX, EndNote XML
 *   - CSV, JSON, 纯文本
 *
 * 辅助功能：
 *   - 导入进度条 / 批量操作报告
 *   - 重复文献检测与合并
 *   - 无效数据提示
 *
 * @module import-export
 * @version 1.4.0
 */

(function () {
  'use strict';

  // ============================================================
  // 内部常量
  // ============================================================

  /** @type {Object<string,string>} RIS 字段标签到字段名的映射 */
  const RIS_TAG_MAP = {
    'TY': 'type',       'A1': 'authors', 'AU': 'authors',
    'TI': 'title',      'T1': 'title',   'JO': 'journal',
    'JF': 'journal',    'BT': 'title',   'T2': 'journal',
    'PY': 'year',       'Y1': 'year',    'DA': 'year',
    'VL': 'volume',     'IS': 'issue',   'CP': 'issue',
    'SP': 'startPage',  'EP': 'endPage', 'PG': 'pages',
    'DO': 'doi',        'DI': 'doi',     'UR': 'url',
    'L1': 'url',        'AB': 'abstract','N2': 'abstract',
    'KW': 'keywords',   'K1': 'keywords',
    'SN': 'isbn',       'M3': 'type',    'PB': 'publisher',
    'CY': 'place',      'LA': 'language','RP': 'status',
    'AN': 'accessionNo'
  };

  /** @type {Object<string,string>} 文献类型映射 */
  const RIS_TYPE_MAP = {
    'JOUR': 'article', 'BOOK': 'book', 'CHAP': 'incollection',
    'CONF': 'inproceedings', 'CPAPER': 'inproceedings',
    'THES': 'phdthesis', 'RPRT': 'techreport', 'MGZN': 'misc'
  };

  // ============================================================
  // 通用辅助函数
  // ============================================================

  function _trim(s) { return (s == null) ? '' : String(s).trim(); }

  /**
   * 字符串标准化用于查重比较。
   * 保留中文（\u4e00-\u9fa5）和常用拉丁字母数字，去除标点空格。
   * 不再移除所有非 ASCII 字符 — 中文作者名会被保留用于查重。
   */
  function _norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[\s\-_.,;:!?'"()\[\]{}<>\/\\|`~@#$%^&*+=]+/g, '')
      .replace(/[^\x00-\x7f\u4e00-\u9fa5]/g, '');
  }

  function _normTitle(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
  }

  function _bibtexKey(item) {
    var author = (item.authors || '').split(/[,;]/)[0].trim()
      .replace(/[^a-zA-Z0-9]/g, '').substring(0, 10) || 'unknown';
    return author + (item.year || '0000') + ((item.title || '').replace(/[^a-zA-Z]/g, '').substring(0, 6));
  }

  function _escapeBibTeX(text) {
    return String(text || '').replace(/[&%$#{}~^\\]/g, '\\$&');
  }

  function _escapeXML(text) {
    return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  function _escapeCSV(text) {
    if (text == null) return '';
    var s = String(text);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function _today() { return new Date().toISOString().split('T')[0]; }

  /** 标准化文献记录，确保所有字段符合 appData.literature 结构 */
  function _normalizeLit(raw, defaultFields) {
    var lit = defaultFields || {};
    lit.id = null; // let caller set id
    lit.title = _trim(raw.title || raw.TI || '');
    lit.authors = _trim(raw.authors || raw.AU || raw.author || '');
    lit.journal = _trim(raw.journal || raw.JO || raw.booktitle || '');
    lit.year = parseInt(raw.year || raw.PY || raw.Y1) || new Date().getFullYear();
    lit.doi = _trim(raw.doi || raw.DO || '').replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
    lit.volume = _trim(raw.volume || raw.VL || '');
    lit.issue = _trim(raw.issue || raw.IS || '');
    lit.pages = _trim(raw.pages || (raw.startPage ? raw.startPage + '-' + (raw.endPage || '') : '') || '');
    lit.publisher = _trim(raw.publisher || raw.PB || '');
    lit.isbn = _trim(raw.isbn || raw.SN || '');
    lit.abstract = _trim(raw.abstract || raw.AB || '');
    lit.keywords = Array.isArray(raw.keywords) ? raw.keywords.filter(Boolean)
      : (raw.keywords ? String(raw.keywords).split(/[,;]/).map(function(k){return k.trim();}).filter(Boolean) : []);
    lit.url = _trim(raw.url || raw.UR || '');
    lit.type = _trim(raw.type || 'article');
    // 保留/合并用户自定义字段（quartile, impactFactor 必须优先使用 raw 中的值）
    if (raw.quartile != null && String(raw.quartile).trim() !== '') {
      lit.quartile = String(raw.quartile).trim();
    } else if (lit.quartile === undefined) {
      lit.quartile = '';
    }
    if (raw.impactFactor != null && raw.impactFactor !== '' && !isNaN(Number(raw.impactFactor))) {
      lit.impactFactor = Number(raw.impactFactor);
    } else if (lit.impactFactor === undefined) {
      lit.impactFactor = null;
    }
    // tags：优先使用 raw.tags；若为空则从 keywords 派生，确保 DOI 批量导入的研究领域标签可用
    if (Array.isArray(raw.tags) && raw.tags.length) {
      lit.tags = raw.tags.filter(Boolean);
    } else if (Array.isArray(lit.keywords) && lit.keywords.length) {
      lit.tags = lit.keywords.slice();
    } else if (!Array.isArray(lit.tags)) {
      lit.tags = [];
    }
    lit.status = lit.status || 'unread';
    lit.progress = lit.progress || 0;
    lit.priority = lit.priority || 'medium';
    lit.folder = lit.folder || null;
    lit.tags = lit.tags || [];
    lit.totalReadTime = lit.totalReadTime || 0;
    lit.pageProgress = lit.pageProgress || { current: 0, total: 0 };
    lit.sectionProgress = lit.sectionProgress || { introduction:0, methods:0, results:0, discussion:0, conclusion:0 };
    lit.deadline = lit.deadline || null;
    lit.createdAt = lit.createdAt || _today();
    lit.lastReadAt = lit.lastReadAt || null;
    return lit;
  }

  // ============================================================
  // 重复文献检测
  // ============================================================

  /** @typedef {Object} DuplicateResult
   *  @property {boolean} isDuplicate  是否重复
   *  @property {number|null} index    在已存在数组中的索引（如果是重复）
   *  @property {string} reason        原因描述
   */

  /**
   * 检查文献是否与现有库中的条目重复。
   * 优先级：DOI 精确匹配 > 标题+年份+作者 模糊匹配。
   * @param {Object} item 标准化的文献条目（尚未入库）
   * @param {Array<Object>} existing 现有文献库（appData.literature）
   * @returns {DuplicateResult}
   */
  function detectDuplicate(item, existing) {
    if (!item.title) return { isDuplicate:false, index:null, reason:'' };

    // 1) DOI 精确匹配
    var cleanDOI = String(item.doi || '').trim().toLowerCase().replace(/^doi:/,'');
    if (cleanDOI) {
      for (var i = 0; i < existing.length; i++) {
        var eDOI = String(existing[i].doi || '').trim().toLowerCase().replace(/^doi:/,'');
        if (eDOI && eDOI === cleanDOI) {
          return { isDuplicate:true, index:i, reason:'DOI: ' + cleanDOI };
        }
      }
    }

    // 2) 标题 + 年份 + 首位作者 模糊匹配
    var normTitle = _normTitle(item.title);
    if (normTitle.length >= 12) {
      var firstAuthor = _norm((item.authors || '').split(/[,;]/)[0] || '');
      for (var j = 0; j < existing.length; j++) {
        var e = existing[j];
        var eTitle = _normTitle(e.title);
        if (eTitle === normTitle && String(e.year) === String(item.year)) {
          var eAuthor = _norm((e.authors || '').split(/[,;]/)[0] || '');
          if (firstAuthor && eAuthor && firstAuthor === eAuthor) {
            return { isDuplicate:true, index:j, reason:'标题+年份+首作者 匹配' };
          }
          if (!firstAuthor || !eAuthor) {
            return { isDuplicate:true, index:j, reason:'标题+年份 匹配' };
          }
        }
      }
    }

    return { isDuplicate:false, index:null, reason:'' };
  }

  /** 合并两条文献的信息（用 newItem 的非空字段补全 existing）。返回合并后的文献。 */
  function mergeLiterature(existing, newItem) {
    var merged = {};
    for (var k in existing) merged[k] = existing[k];
    var targets = ['title','authors','journal','doi','abstract','volume','issue','pages','publisher','keywords'];
    for (var i = 0; i < targets.length; i++) {
      var key = targets[i];
      if (!merged[key] && newItem[key]) merged[key] = newItem[key];
      else if (newItem[key] && String(newItem[key]).length > String(merged[key] || '').length) {
        // 更长的内容通常更完整
        if (key === 'title') {
          // 标题优先保留已有（用户可能手动改过），不替换
        } else {
          merged[key] = newItem[key];
        }
      }
    }
    // 合并关键词
    if (Array.isArray(newItem.keywords) && newItem.keywords.length) {
      var mergedKW = Array.isArray(merged.keywords) ? merged.keywords.slice() : [];
      newItem.keywords.forEach(function (kw){ if (mergedKW.indexOf(kw) === -1) mergedKW.push(kw); });
      merged.keywords = mergedKW;
    }
    // 合并 tags（确保 DOI 导入的研究领域标签不会丢失）
    var mergedTG = Array.isArray(merged.tags) ? merged.tags.slice() : [];
    if (Array.isArray(newItem.tags) && newItem.tags.length) {
      newItem.tags.forEach(function (tg){ if (mergedTG.indexOf(tg) === -1) mergedTG.push(tg); });
    }
    // 如果已有 tags 为空但 keywords 有数据，从 keywords 派生 tags
    if (mergedTG.length === 0 && Array.isArray(merged.keywords) && merged.keywords.length) {
      mergedTG = merged.keywords.slice();
    }
    merged.tags = mergedTG;
    return merged;
  }

  // ============================================================
  // 1. RIS 解析器
  // ============================================================

  /**
   * 解析 RIS 文本为文献对象数组。
   * RIS 规范：每行以 "  TAG  - value" 形式，条目间以 ER - 结束。
   * @param {string} text RIS 格式文本
   * @returns {Array<Object>}
   */
  function parseRIS(text) {
    var results = [];
    if (!text) return results;

    var lines = text.split(/\r?\n/);
    var current = {};
    var authors = [];
    var keywords = [];
    var inEntry = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line.trim()) continue;

      // 匹配 TAG - value 格式
      var m = line.match(/^([A-Z][A-Z0-9])\s*-\s*(.*)$/);
      if (!m) continue;

      var tag = m[1].toUpperCase();
      var value = m[2];

      if (tag === 'TY') {
        inEntry = true;
        current = {};
        authors = [];
        keywords = [];
        current.type = RIS_TYPE_MAP[value.toUpperCase()] || 'article';
      } else if (tag === 'ER') {
        if (inEntry) {
          current.authors = authors.join('; ');
          current.keywords = keywords;
          var norm = _normalizeLit(current);
          if (norm.title || norm.doi) results.push(norm);
          inEntry = false;
        }
      } else if (RIS_TAG_MAP[tag]) {
        var field = RIS_TAG_MAP[tag];
        if (field === 'authors') {
          authors.push(value);
        } else if (field === 'keywords') {
          if (value) keywords.push(value);
        } else {
          if (current[field]) current[field] += ' ' + value;
          else current[field] = value;
        }
      }
    }

    // 处理最后一条（即使没有 ER 结束）
    if (inEntry) {
      current.authors = authors.join('; ');
      current.keywords = keywords;
      var norm2 = _normalizeLit(current);
      if (norm2.title || norm2.doi) results.push(norm2);
    }

    return results;
  }

  /** 将文献条目数组导出为 RIS 格式 */
  function exportRIS(items) {
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var typeTag = 'JOUR';
      if (it.type === 'book' || it.type === 'incollection') typeTag = 'BOOK';
      else if (it.type === 'inproceedings' || it.type === 'conference') typeTag = 'CONF';
      else if (it.type === 'phdthesis' || it.type === 'mastersthesis') typeTag = 'THES';

      out.push('TY  - ' + typeTag);
      if (it.authors) {
        String(it.authors).split(/[;]/).forEach(function (a){
          var name = a.trim();
          if (name) out.push('AU  - ' + name);
        });
      }
      if (it.title) out.push('TI  - ' + it.title);
      if (it.journal) out.push('JO  - ' + it.journal);
      if (it.year) out.push('PY  - ' + it.year);
      if (it.volume) out.push('VL  - ' + it.volume);
      if (it.issue) out.push('IS  - ' + it.issue);
      if (it.pages) out.push('SP  - ' + String(it.pages).split(/[-–]/)[0]);
      if (it.pages && /[-–]/.test(it.pages)) out.push('EP  - ' + String(it.pages).split(/[-–]/)[1]);
      if (it.doi) out.push('DO  - ' + it.doi);
      if (it.abstract) out.push('AB  - ' + it.abstract);
      if (Array.isArray(it.keywords)) {
        it.keywords.forEach(function (kw){ out.push('KW  - ' + kw); });
      }
      if (it.publisher) out.push('PB  - ' + it.publisher);
      out.push('ER  - ');
      out.push('');
    }
    return out.join('\n');
  }

  // ============================================================
  // 2. EndNote XML 解析器
  // ============================================================

  /**
   * 解析 EndNote XML 格式（标准 <xml><records><record>...）
   * @param {string} text XML 文本
   * @returns {Array<Object>}
   */
  function parseEndNoteXML(text) {
    var results = [];
    if (!text) return results;
    try {
      var parser = new DOMParser();
      var doc = parser.parseFromString(text, 'text/xml');
      if (doc.getElementsByTagName('parsererror').length > 0) return results;

      var records = doc.getElementsByTagName('record');
      for (var i = 0; i < records.length; i++) {
        var rec = records[i];
        var raw = {};

        // 标题
        var titles = rec.getElementsByTagName('titles')[0];
        if (titles) {
          var t = titles.getElementsByTagName('title')[0];
          raw.title = t ? t.textContent.trim() : '';
          var secondary = titles.getElementsByTagName('secondary-title')[0];
          raw.journal = secondary ? secondary.textContent.trim() : '';
        }

        // 作者
        var contributors = rec.getElementsByTagName('contributors')[0];
        if (contributors) {
          var authorEls = contributors.getElementsByTagName('author');
          var authorArr = [];
          for (var a = 0; a < authorEls.length; a++) {
            var style = authorEls[a].getElementsByTagName('style')[0];
            var name = (style ? style.textContent : authorEls[a].textContent).trim();
            if (name) authorArr.push(name);
          }
          raw.authors = authorArr.join('; ');
        }

        // 年份
        var datesEl = rec.getElementsByTagName('dates')[0];
        if (datesEl) {
          var yearEls = datesEl.getElementsByTagName('year');
          if (yearEls.length) raw.year = yearEls[0].textContent.trim();
        }
        if (!raw.year) {
          var pubDates = rec.getElementsByTagName('pub-dates')[0];
          if (pubDates) {
            var dateEl = pubDates.getElementsByTagName('date')[0];
            if (dateEl) raw.year = dateEl.textContent.trim().match(/\d{4}/)[0] || '';
          }
        }

        // DOI
        var doiEls = rec.getElementsByTagName('electronic-resource-num');
        if (doiEls.length) {
          var d = doiEls[0].getElementsByTagName('style')[0];
          raw.doi = (d ? d.textContent : doiEls[0].textContent).trim();
        }

        // 卷/期/页
        var volEls = rec.getElementsByTagName('volume')[0];
        if (volEls) raw.volume = volEls.textContent.trim();
        var numEls = rec.getElementsByTagName('number')[0];
        if (numEls) raw.issue = numEls.textContent.trim();
        var pagesEl = rec.getElementsByTagName('pages')[0];
        if (pagesEl) raw.pages = pagesEl.textContent.trim();

        // 摘要
        var absEls = rec.getElementsByTagName('abstract')[0];
        if (absEls) {
          var absStyle = absEls.getElementsByTagName('style')[0];
          raw.abstract = (absStyle ? absStyle.textContent : absEls.textContent).trim();
        }

        // 关键词
        var kwEls = rec.getElementsByTagName('keywords')[0];
        if (kwEls) {
          var kwItems = kwEls.getElementsByTagName('keyword');
          var kwArr = [];
          for (var k = 0; k < kwItems.length; k++) {
            var kwS = kwItems[k].getElementsByTagName('style')[0];
            var kwName = (kwS ? kwS.textContent : kwItems[k].textContent).trim();
            if (kwName) kwArr.push(kwName);
          }
          raw.keywords = kwArr;
        }

        // 出版商
        var pbEls = rec.getElementsByTagName('publisher')[0];
        if (pbEls) {
          var pbS = pbEls.getElementsByTagName('style')[0];
          raw.publisher = (pbS ? pbS.textContent : pbEls.textContent).trim();
        }

        var lit = _normalizeLit(raw);
        if (lit.title || lit.doi) results.push(lit);
      }
    } catch (e) {
      console.warn('[Import] EndNote XML 解析失败:', e.message);
    }
    return results;
  }

  /** 导出为 EndNote XML 格式 */
  function exportEndNoteXML(items) {
    var out = ['<?xml version="1.0" encoding="UTF-8"?>',
      '<xml>', '  <records>'];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      out.push('    <record>');
      if (it.title) {
        out.push('      <titles><title><style>' + _escapeXML(it.title) + '</style></title></titles>');
      }
      if (it.authors) {
        out.push('      <contributors><authors>');
        String(it.authors).split(/[;]/).forEach(function (a){
          var name = a.trim();
          if (name) out.push('        <author><style>' + _escapeXML(name) + '</style></author>');
        });
        out.push('      </authors></contributors>');
      }
      if (it.journal) {
        out.push('      <titles><secondary-title><style>' + _escapeXML(it.journal) + '</style></secondary-title></titles>');
      }
      if (it.year) out.push('      <dates><year>' + _escapeXML(it.year) + '</year></dates>');
      if (it.volume) out.push('      <volume><style>' + _escapeXML(it.volume) + '</style></volume>');
      if (it.issue) out.push('      <number><style>' + _escapeXML(it.issue) + '</style></number>');
      if (it.pages) out.push('      <pages><style>' + _escapeXML(it.pages) + '</style></pages>');
      if (it.doi) out.push('      <electronic-resource-num><style>' + _escapeXML(it.doi) + '</style></electronic-resource-num>');
      if (it.abstract) out.push('      <abstract><style>' + _escapeXML(it.abstract) + '</style></abstract>');
      if (Array.isArray(it.keywords) && it.keywords.length) {
        out.push('      <keywords>');
        it.keywords.forEach(function (kw){
          out.push('        <keyword><style>' + _escapeXML(kw) + '</style></keyword>');
        });
        out.push('      </keywords>');
      }
      if (it.publisher) out.push('      <publisher><style>' + _escapeXML(it.publisher) + '</style></publisher>');
      out.push('    </record>');
    }
    out.push('  </records>', '</xml>');
    return out.join('\n');
  }

  // ============================================================
  // 3. Zotero RDF 解析器
  // ============================================================

  /**
   * 解析 Zotero RDF/XML 格式（Zotero 导出的 RDF）。
   * Zotero RDF 使用命名空间：z: http://www.zotero.org/namespaces/export#
   * @param {string} text RDF XML 文本
   * @returns {Array<Object>}
   */
  function parseZoteroRDF(text) {
    var results = [];
    if (!text) return results;
    try {
      var parser = new DOMParser();
      var doc = parser.parseFromString(text, 'text/xml');
      if (doc.getElementsByTagName('parsererror').length > 0) return results;

      // Zotero RDF 的顶层为 <rdf:RDF>，内部条目是 <z:Article> 等元素
      var allElements = doc.getElementsByTagName('*');
      var itemElements = [];
      for (var e = 0; e < allElements.length; e++) {
        var tagName = allElements[e].tagName;
        if (/^(z:|.*[\/#])(Article|Book|BookSection|ConferencePaper|Thesis|Report|MagazineArticle|NewspaperArticle|Webpage|Manuscript|Patent|Interview|Film|Letter|Misc)$/i.test(tagName)
            || /(article|book|inproceedings|incollection|phdthesis|mastersthesis|techreport|misc)$/i.test(tagName)) {
          itemElements.push(allElements[e]);
        }
      }

      // 回退：抓取 dcterms:title / bib:authors 等元素
      if (itemElements.length === 0) {
        itemElements = [];
        var titles = doc.getElementsByTagName('title');
        for (var t = 0; t < titles.length; t++) {
          var parent = titles[t].parentNode;
          if (parent && parent.nodeName !== 'html' && itemElements.indexOf(parent) === -1) {
            itemElements.push(parent);
          }
        }
      }

      for (var i = 0; i < itemElements.length; i++) {
        var el = itemElements[i];
        var raw = {};

        // 标题：查找 dcterms:title / dc:title / z:title
        var title = _findByLocalName(el, 'title');
        if (title) raw.title = title.textContent.trim();

        // 作者：dc:creator / z:author
        var authorArr = [];
        var creatorEls = _findAllByLocalName(el, 'creator');
        for (var c = 0; c < creatorEls.length; c++) {
          var cname = creatorEls[c].textContent.trim();
          if (cname) authorArr.push(cname);
        }
        if (authorArr.length === 0) {
          var authorEls2 = _findAllByLocalName(el, 'authors');
          for (var ca = 0; ca < authorEls2.length; ca++) {
            String(authorEls2[ca].textContent).split(/[;,]/).forEach(function (n){
              if (n.trim()) authorArr.push(n.trim());
            });
          }
        }
        if (authorArr.length === 0) {
          var authorEls3 = _findAllByLocalName(el, 'author');
          for (var cb = 0; cb < authorEls3.length; cb++) {
            var aname = authorEls3[cb].textContent.trim();
            if (aname) authorArr.push(aname);
          }
        }
        raw.authors = authorArr.join('; ');

        // 期刊/出版商：z:publicationTitle / dc:publisher / dc:source
        var journal = _findByLocalName(el, 'publicationtitle') ||
                      _findByLocalName(el, 'seriesTitle') ||
                      _findByLocalName(el, 'journal') ||
                      _findByLocalName(el, 'source');
        if (journal) raw.journal = journal.textContent.trim();
        var publisher = _findByLocalName(el, 'publisher');
        if (publisher) raw.publisher = publisher.textContent.trim();

        // 年份：dc:date
        var dateEl = _findByLocalName(el, 'date');
        if (dateEl) {
          var yearMatch = dateEl.textContent.trim().match(/\d{4}/);
          if (yearMatch) raw.year = yearMatch[0];
        }

        // DOI：prism:doi / dc:identifier
        var doiEl = _findByLocalName(el, 'DOI') || _findByLocalName(el, 'doi') || _findByLocalName(el, 'identifier');
        if (doiEl) {
          var doiText = doiEl.textContent.trim();
          var doiM = doiText.match(/10\.\d{4,9}\/[-._;()\/:A-Z0-9]+/i);
          raw.doi = doiM ? doiM[0] : doiText;
        }

        // 卷/期/页
        var volEl = _findByLocalName(el, 'volume');
        if (volEl) raw.volume = volEl.textContent.trim();
        var issueEl = _findByLocalName(el, 'issue') || _findByLocalName(el, 'number');
        if (issueEl) raw.issue = issueEl.textContent.trim();
        var pagesEl = _findByLocalName(el, 'pages');
        if (pagesEl) raw.pages = pagesEl.textContent.trim();

        // 摘要：dcterms:abstract / dc:description
        var absEl = _findByLocalName(el, 'abstract') || _findByLocalName(el, 'description');
        if (absEl) raw.abstract = absEl.textContent.trim();

        // ------ 关键词/便签（多层回退） ------
        var kws = [];
        // 1. dc:subject / z:tags / z:tag
        var subjectEls = _findAllByLocalName(el, 'subject');
        for (var s = 0; s < subjectEls.length; s++) {
          var subjText = subjectEls[s].textContent.trim();
          if (subjText) {
            // subject 可能是 "keyword1; keyword2" 或单个词
            if (/[,;，；]/.test(subjText)) {
              subjText.split(/[,;，；]/).forEach(function (kw){
                if (kw.trim()) kws.push(kw.trim());
              });
            } else {
              kws.push(subjText);
            }
          }
        }
        // 2. z:tags / z:tag / tags / keyword
        var tagNames = ['tags', 'tag', 'keyword', 'keywords'];
        for (var tn = 0; tn < tagNames.length; tn++) {
          var kEls = _findAllByLocalName(el, tagNames[tn]);
          for (var k = 0; k < kEls.length; k++) {
            var kText = kEls[k].textContent.trim();
            if (kText) {
              kText.split(/[,;，；]/.test(kText) ? /[,;，；]/ : /\s+/).forEach(function (kw){
                if (kw.trim() && kws.indexOf(kw.trim()) === -1) kws.push(kw.trim());
              });
            }
          }
        }
        if (kws.length) raw.keywords = kws;

        var lit = _normalizeLit(raw);
        if (lit.title || lit.doi) results.push(lit);
      }
    } catch (e) {
      console.warn('[Import] Zotero RDF 解析失败:', e.message);
    }
    return results;
  }

  function _findByLocalName(el, name) {
    var lower = name.toLowerCase();
    var all = el.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) {
      if (all[i].localName && all[i].localName.toLowerCase() === lower) return all[i];
    }
    return null;
  }
  function _findAllByLocalName(el, name) {
    var lower = name.toLowerCase();
    var all = el.getElementsByTagName('*');
    var results = [];
    for (var i = 0; i < all.length; i++) {
      if (all[i].localName && all[i].localName.toLowerCase() === lower) results.push(all[i]);
    }
    return results;
  }

  // ============================================================
  // 4. Mendeley CSV 解析器
  // ============================================================

  /**
   * 解析 Mendeley CSV 格式（包含标题行）。
   * 常见字段：Title, Authors, Year, Journal, DOI, Abstract, Tags, Pages, Volume, Issue, Publisher
   * @param {string} text
   * @returns {Array<Object>}
   */
  function parseMendeleyCSV(text) {
    var results = [];
    if (!text) return results;

    var rows = _parseCSV(text);
    if (rows.length < 2) return results;

    var headers = rows[0].map(function (h){return h.trim().toLowerCase();});
    var idx = function (name){
      var best = -1;
      for (var i = 0; i < headers.length; i++) {
        if (headers[i] === name.toLowerCase()) return i;
        if (headers[i].indexOf(name.toLowerCase()) !== -1 && best === -1) best = i;
      }
      return best;
    };

    var ti = idx('title');
    var ai = idx('authors');
    var yi = idx('year');
    var ji = idx('journal');
    var di = idx('doi');
    var abi = idx('abstract');
    var ki = idx('tags');
    if (ki === -1) ki = idx('keywords');
    if (ki === -1) ki = idx('keyword');
    var pi = idx('pages');
    var vi = idx('volume');
    var isi = idx('issue');
    var pbi = idx('publisher');

    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      if (!row || row.length === 0) continue;
      var raw = {};
      if (ti !== -1) raw.title = row[ti];
      if (ai !== -1) raw.authors = String(row[ai] || '').replace(/\s+and\s+/gi, '; ');
      if (yi !== -1) raw.year = row[yi];
      if (ji !== -1) raw.journal = row[ji];
      if (di !== -1) raw.doi = row[di];
      if (abi !== -1) raw.abstract = row[abi];
      if (ki !== -1 && row[ki]) {
        raw.keywords = String(row[ki]).split(/[,;]/).map(function (k){return k.trim();}).filter(Boolean);
      }
      if (pi !== -1) raw.pages = row[pi];
      if (vi !== -1) raw.volume = row[vi];
      if (isi !== -1) raw.issue = row[isi];
      if (pbi !== -1) raw.publisher = row[pbi];

      var lit = _normalizeLit(raw);
      if (lit.title || lit.doi) results.push(lit);
    }
    return results;
  }

  /** 简易 CSV 解析器（支持引号嵌套） */
  function _parseCSV(text) {
    var rows = [];
    var curRow = [];
    var curVal = '';
    var inQuotes = false;

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i+1] === '"') { curVal += '"'; i++; }
          else inQuotes = false;
        } else curVal += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { curRow.push(curVal); curVal = ''; }
        else if (ch === '\n') { curRow.push(curVal); rows.push(curRow); curRow = []; curVal = ''; }
        else if (ch === '\r') { /* skip */ }
        else curVal += ch;
      }
    }
    if (curVal || curRow.length) { curRow.push(curVal); rows.push(curRow); }
    return rows;
  }

  // ============================================================
  // 5. CNKI / 知网 文本格式解析
  // ============================================================

  /**
   * 解析 CNKI (知网) 导出文本（支持多种中文文本格式）。
   *
   * 支持的格式:
   *   1) 标签-值格式（每行: 题名：... 或 题名: ...）
   *   2) 中文引用格式: [1] 张三, 李四. 论文题名[J]. 计算机学报, 2024, 47(3): 456-468.
   *   3) 知网NoteExpress导出格式（多行，每项一个标签）
   *   4) 【摘要】/【关键词】方括号格式
   *
   * 常见字段: 题名、作者、机构、刊名、年、卷、期、页码、
   *           摘要、关键词、DOI、中图分类号、基金、作者简介
   * @param {string} text
   * @returns {Array<Object>}
   */
  function parseCNKI(text) {
    var results = [];
    if (!text) return results;

    // 归一化: 统一换行、清理BOM
    var cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // ---------- 尝试解析: 引用格式块（以 [数字] 开头, 或 [数字] 与换行分隔） ----------
    var citationBlocks = cleanText.match(/\[\d+\][\s\S]*?(?=\n\s*\[\d+\]|$)/g);
    if (citationBlocks && citationBlocks.length > 0 && /\[(\d+)\]/.test(cleanText.trim().substring(0, 50))) {
      for (var ci = 0; ci < citationBlocks.length; ci++) {
        var item = _parseCNKICitationBlock(citationBlocks[ci]);
        if (item && (item.title || item.doi)) {
          results.push(_normalizeLit(item));
        }
      }
      if (results.length > 0) return results;
    }

    // ---------- 回退解析: 标签-值格式（支持空行分隔多条记录） ----------
    var blocks = cleanText.split(/\n\s*\n/);
    for (var b = 0; b < blocks.length; b++) {
      var block = blocks[b].trim();
      if (!block) continue;

      var raw = {};
      var lines = block.split(/\n/);
      var currentKey = null;

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;

        // 跳过明显的元数据行
        if (/^下载|^来源|^数据库|^引用|^NoteExpress|^EndNote|^Refworks/i.test(line)) continue;

        // 尝试匹配: 【标签】内容
        var bracketM = line.match(/^【([^】]+)】\s*(.*)$/);
        if (bracketM) {
          currentKey = bracketM[1];
          _applyCNKIField(raw, currentKey, bracketM[2] || '');
          continue;
        }

        // 尝试匹配: 中文标签：值（含全角/半角冒号）
        //   允许标签内容包含 "关键词; Key words" 这种中英混合
        var labelM = line.match(/^([\u4e00-\u9fa5A-Za-z][\u4e00-\u9fa5A-Za-z\/\-（）\(\)\s]{0,19})[：:]\s*(.*)$/);
        if (labelM) {
          currentKey = labelM[1].trim();
          _applyCNKIField(raw, currentKey, labelM[2] || '');
          continue;
        }

        // 尝试匹配: "DOI 10.xxxx" （无冒号的格式）
        if (/^DOI\s+10\.\d+/i.test(line) && !raw.doi) {
          var doiM = line.match(/(10\.\d{4,9}\/[-._;()\/:A-Z0-9\u4e00-\u9fa5]+)/i);
          if (doiM) { raw.doi = doiM[1].trim(); continue; }
        }

        // 续行: 如果前面有识别过的标签，则作为该标签值的延续
        if (currentKey && raw[currentKey] !== undefined) {
          raw[currentKey] = (raw[currentKey] || '') + ' ' + line;
        }
      }

      if (raw.title || raw.doi) {
        results.push(_normalizeLit(raw));
      }
    }

    return results;
  }

  /**
   * 从中文引用格式（[1] 作者. 题名[J]. 期刊, 年, 卷(期): 页码.）提取字段
   */
  function _parseCNKICitationBlock(block) {
    var trimmed = block.trim();
    if (!trimmed) return null;

    var raw = {};

    // 去掉开头的 [数字] 标记
    var content = trimmed.replace(/^\s*\[\d+\]\s*/, '');

    // 提取 DOI（优先级最高，格式最固定）
    var doiM = content.match(/(10\.\d{4,9}\/[-._;()\/:A-Z0-9\u4e00-\u9fa5]+)/i);
    if (doiM) {
      raw.doi = doiM[1].trim();
      content = content.substring(0, doiM.index).trim() +
                content.substring(doiM.index + doiM[1].length).trim();
    }

    // 提取关键词 "关键词： xxx; yyy" 或 "Keywords: xxx"
    var kwMatch = content.match(/(关键词|关键字|Keywords?)[：:]\s*([^\n]+)/);
    if (kwMatch && kwMatch[2]) {
      raw.keywords = kwMatch[2].split(/[;；,，]/).map(function(s){return s.trim();}).filter(Boolean);
      content = content.substring(0, kwMatch.index).trim();
    }

    // 提取摘要 "摘要： xxx" 或 "【摘要】xxx"
    var absMatch = content.match(/(摘要|Abstract|【摘要】)[：:]?\s*([^\n]+[\s\S]{0,500})/);
    if (absMatch && absMatch[2]) {
      raw.abstract = absMatch[2].trim().replace(/\s+/g, ' ');
      content = content.substring(0, absMatch.index).trim();
    }

    // 核心引用格式解析（单行）
    //   作者1, 作者2. 文献题名[文献类型标识]. 期刊名, 年, 卷(期): 起-止页.
    //   张三, 李四. 基于深度学习的自然语言处理研究[J]. 计算机学报, 2024, 47(3): 456-468.
    //   或者英文格式: Smith J, Doe E. Title of Paper[J]. Journal Name, 2024, 47(3): 456-468.
    var mainLines = content.split(/\n/);
    for (var li = 0; li < mainLines.length; li++) {
      var line = mainLines[li].trim();
      if (!line) continue;

      // 文献类型标识: [J] 期刊, [M] 专著, [C] 会议, [D] 学位论文, [R] 报告, [P] 专利
      var typeMarker = line.match(/\[([JMCDEPRGSTBH])\]/);
      if (typeMarker) {
        raw.type = typeMarker[1];
        var parts = line.split(/\[[JMCDEPRGSTBH]\]/);
        // 第一部分: 作者. 题名
        var beforeType = parts[0].trim();
        // 第二部分: 期刊信息
        var afterType = parts.length > 1 ? parts[1].trim() : '';

        // 从 afterType 中提取期刊名, 年份, 卷(期), 页码
        // 格式: 期刊名, 年, 卷(期): 起-止页.
        var afterParts = afterType.match(/^[,，。.\s]*([^,，]+?)[,，。.\s]+(\d{4})[，,\.\s]*([^\(（:：]*?)?[\(（]?\s*(\d*)\s*[\)）]?\s*[:：]\s*(\d+[\-–—到至至]*\d*)/);
        if (afterParts) {
          raw.journal = afterParts[1].trim().replace(/^[，,。.]+/, '').trim();
          raw.year = afterParts[2];
          raw.volume = afterParts[3] ? afterParts[3].trim() : '';
          raw.issue = afterParts[4] ? afterParts[4].trim() : '';
          raw.pages = afterParts[5];
        } else {
          // 简化解析: 尝试匹配 "期刊名, 年, 卷" 格式
          var simpleParts = afterType.match(/^[,，。.\s]*([^,，]+?)[,，。.\s]+(\d{4})/);
          if (simpleParts) {
            raw.journal = simpleParts[1].trim().replace(/^[，,。.]+/, '').trim();
            raw.year = simpleParts[2];
          } else {
            raw.journal = afterType.replace(/[.\s]+$/, '').trim();
          }
          var yearInRemainder = afterType.match(/\b(19|20)\d{2}\b/);
          if (yearInRemainder && !raw.year) raw.year = yearInRemainder[0];
          var pagesInRemainder = afterType.match(/(\d+[\-–—]\d+)\D*$/);
          if (pagesInRemainder && !raw.pages) raw.pages = pagesInRemainder[1];
        }

        // 从 beforeType 中提取作者和题名
        // 规则: 最后一个 "." 或 "。" 分隔作者和题名
        // 策略: 从右向左找第一个分隔，右边是题名，左边是作者
        var bt = beforeType;
        var authorTitleMatch = bt.match(/^([^\.。]+?)[\.。]\s*(.+)$/);
        if (authorTitleMatch) {
          raw.authors = authorTitleMatch[1].trim().replace(/[,，;；]/g, '; ');
          raw.title = authorTitleMatch[2].trim();
        } else {
          raw.title = bt;
        }
      } else {
        // 无文献类型标识，当作标签-值格式的一部分
        if (!raw.title) {
          var firstColon = line.indexOf('：');
          if (firstColon === -1) firstColon = line.indexOf(':');
          if (firstColon > 0 && firstColon < 15) {
            var label = line.substring(0, firstColon).trim();
            var value = line.substring(firstColon + 1).trim();
            _applyCNKIField(raw, label, value);
          } else if (line.length > 5 && !raw.title) {
            raw.title = line;
          }
        }
      }
    }

    return raw;
  }

  function _applyCNKIField(raw, key, value) {
    var k = String(key || '').trim();
    var v = String(value || '').trim();
    if (!k) return;

    // 标题
    if (/^(题名|标题|篇名|题目|Title|Titles|题名（英）|Title（英）)$/.test(k)) {
      if (v) raw.title = v;
      return;
    }

    // 作者
    if (/^(作者|著者|Authors?|Author)$/.test(k)) {
      if (v) raw.authors = v.replace(/\s*[,，;；]\s*/g, '; ');
      return;
    }

    // 机构 / 单位
    if (/^(机构|单位|Author Affiliation|Affiliation|Institution)$/.test(k)) {
      raw.affiliation = v; return;
    }

    // 期刊 / 刊名 / 来源
    if (/^(刊名|期刊|来源|来源期刊|Source|Journal|Source Title|SourceTitle)$/.test(k)) {
      if (v) raw.journal = v;
      return;
    }

    // 年份
    if (/^(年|年份|出版年|Year|Publication Year)$/.test(k)) {
      var ym = v.match(/\d{4}/);
      if (ym) raw.year = ym[0];
      return;
    }

    // DOI
    if (/^(DOI|doi|Doi|DO I)$/.test(k)) {
      var doiMatch = v.match(/(10\.\d{4,9}\/[-._;()\/:A-Z0-9\u4e00-\u9fa5]+)/i);
      if (doiMatch) raw.doi = doiMatch[1].trim();
      else if (v) raw.doi = v;
      return;
    }

    // 摘要
    if (/^(摘要|文摘|Abstract|【摘要】)$/.test(k)) {
      if (v) raw.abstract = v.replace(/\s+/g, ' ');
      return;
    }

    // 关键词
    if (/^(关键词|关键字|Key\s*words?|Keywords?|【关键词】)$/i.test(k)) {
      if (v) raw.keywords = v.split(/[;；,，\s]+/).map(function (kw){return kw.trim();}).filter(Boolean);
      return;
    }

    // 页码
    if (/^(页码|Pages?|Page)$/.test(k)) { if (v) raw.pages = v; return; }
    // 卷
    if (/^(卷|Volume|Vol|V\.)$/.test(k)) { if (v) raw.volume = v.match(/\d+/) ? v.match(/\d+/)[0] : v; return; }
    // 期
    if (/^(期|期次|Issue|No|Number|N\.)$/.test(k)) { if (v) raw.issue = v.match(/\d+/) ? v.match(/\d+/)[0] : v; return; }
    // 卷/期 复合
    if (/^(年卷期|卷期|Vol\. Issue|Vol\. Iss)$/.test(k)) {
      var yrM = v.match(/\d{4}/); if (yrM && !raw.year) raw.year = yrM[0];
      var volM = v.match(/[Vv]ol[.\s]*(\d+)/); if (volM) raw.volume = volM[1];
      var issM = v.match(/[Ii]ss?[.\s]*(\d+)/); if (issM) raw.issue = issM[1];
      return;
    }

    // 出版社 / 出版地
    if (/^(出版社|Publisher|出版地|Place)$/.test(k)) { if (v) raw.publisher = v; return; }

    // 中图分类号 / 基金 / 作者简介（保留字段）
    if (/^(中图分类号|中图法分类号|CLC|基金|Fund|作者简介|Biography|第一作者|通讯作者|【基金】|【作者简介】)$/.test(k)) {
      raw[k] = v; return;
    }

    // 其他未识别的标签 -> 保留为额外字段
    raw[k] = v;
  }

  // ============================================================
  // 6. BibTeX 解析器（增强版）
  // ============================================================

  /**
   * 解析 BibTeX 文本为文献对象数组。
   * 比原有 crud.js 更健壮：处理嵌套花括号、多行值、and 连接的作者。
   * @param {string} text
   * @returns {Array<Object>}
   */
  function parseBibTeX(text) {
    var results = [];
    if (!text) return results;

    // 正则匹配每条 @type{key, ... }
    var entries = text.match(/@(\w+)\s*\{([^,]+),([\s\S]*?)\}\s*(?=@|$)/gi);
    if (!entries) return results;

    for (var ei = 0; ei < entries.length; ei++) {
      var full = entries[ei];
      var typeMatch = full.match(/^@(\w+)/i);
      var type = typeMatch ? typeMatch[1].toLowerCase() : 'article';

      // 拆分字段：使用花括号平衡解析
      var bodyMatch = full.match(/^@\w+\s*\{[^,]+,([\s\S]*)\}\s*$/i);
      if (!bodyMatch) continue;
      var body = bodyMatch[1];
      var fields = _parseBibTeXFields(body);

      var raw = {
        title: _stripBraces(fields.title || fields.title || ''),
        authors: _stripBraces(fields.author || fields.Author || fields.AUTHOR || '').replace(/\s+and\s+/gi, '; '),
        journal: _stripBraces(fields.journal || fields.booktitle || fields.Journal || fields.Booktitle || ''),
        year: _stripBraces(fields.year || ''),
        doi: _stripBraces(fields.doi || fields.DOI || fields.Doi || ''),
        volume: _stripBraces(fields.volume || ''),
        issue: _stripBraces(fields.number || fields.issue || ''),
        pages: _stripBraces(fields.pages || '').replace(/[-–]/g, '-'),
        publisher: _stripBraces(fields.publisher || ''),
        abstract: _stripBraces(fields.abstract || ''),
        keywords: fields.keywords ? _stripBraces(fields.keywords).split(/[,;]/).map(function(k){return k.trim();}).filter(Boolean) : [],
        type: type
      };

      var lit = _normalizeLit(raw);
      if (lit.title || lit.doi) results.push(lit);
    }
    return results;
  }

  function _stripBraces(s) {
    return String(s || '').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
  }

  function _parseBibTeXFields(body) {
    var fields = {};
    var i = 0, len = body.length;
    while (i < len) {
      // 跳过空白和逗号
      while (i < len && /[\s,]/.test(body[i])) i++;
      if (i >= len) break;

      // 读取字段名
      var nameStart = i;
      while (i < len && /[A-Za-z0-9_\-]/.test(body[i])) i++;
      var name = body.substring(nameStart, i).toLowerCase();
      if (!name) { i++; continue; }

      // 跳过 '='
      while (i < len && body[i] !== '=') i++;
      i++; // skip '='
      while (i < len && /\s/.test(body[i])) i++;

      // 读取值：支持 {...} 和 "..."
      var value = '';
      if (body[i] === '{') {
        var depth = 1;
        i++;
        var valStart = i;
        while (i < len && depth > 0) {
          if (body[i] === '{') depth++;
          else if (body[i] === '}') {
            depth--;
            if (depth === 0) { value = body.substring(valStart, i); break; }
          }
          i++;
        }
        i++; // 跳过最后一个 '}'
      } else if (body[i] === '"') {
        i++;
        var vStart2 = i;
        while (i < len && body[i] !== '"') i++;
        value = body.substring(vStart2, i);
        i++;
      } else {
        var vStart3 = i;
        while (i < len && body[i] !== ',') i++;
        value = body.substring(vStart3, i);
      }

      fields[name] = value;
    }
    return fields;
  }

  // ============================================================
  // 7. DOI 批量解析（通过 CrossRef / OpenAlex）
  // ============================================================

  /**
   * 通过 DOI 批量获取文献元数据（三数据源）。
   * 并行查询 CrossRef、Semantic Scholar、OpenAlex，并合并结果。
   * 查询逻辑与单篇 DOI 查询 (crud.js) 保持一致，以确保关键词/标签质量相同。
   *
   * @param {Array<string>} doiList DOI 列表
   * @param {Function} [onProgress] 进度回调 function(current, total, action, doi)
   * @returns {Promise<{items:Array<Object>, errors:Array<string>}>}
   */
  function fetchDOIBatch(doiList, onProgress) {
    var settings = _getDOISettings();
    var opts = { mailto: settings.mailto, cnkiToken: settings.cnkiToken, concurrency: 3, delayPerRequest: 150 };
    if (!window.DOIClient) return Promise.resolve({ items: [], errors: ['DOIClient 未加载'] });
    return window.DOIClient.fetchDOIBatch(doiList, opts, onProgress).then(function (result) {
      var items = (result.items || []).map(function (meta) {
        var raw = {
          title: meta.title, authors: meta.authors, journal: meta.journal,
          year: meta.year, doi: meta.doi, abstract: meta.abstract,
          volume: meta.volume, issue: meta.issue, pages: meta.pages,
          keywords: Array.isArray(meta.allTags) ? meta.allTags.slice() : [],
          tags: Array.isArray(meta.allTags) ? meta.allTags.slice() : []
        };
        return _normalizeLit(raw);
      });
      return { items: items, errors: result.errors || [] };
    });
  }

  /**
   * 获取用户配置的 mailto 邮箱 / CNKI Token（从全局 appData.settings）
   */
  function _getDOISettings() {
    try {
      if (typeof window !== 'undefined' && window.appData && window.appData.settings) {
        return {
          mailto: window.appData.settings.doiEmail || 'scholarflow@example.com',
          cnkiToken: window.appData.settings.cnkiToken || ''
        };
      }
    } catch (e) { /* 忽略 */ }
    return { mailto: 'scholarflow@example.com', cnkiToken: '' };
  }

  // ============================================================
  // 8. PDF 元数据提取（浏览器端）
  // ============================================================

  /**
   * 从 PDF 文件内容提取元数据（标题、作者、DOI、摘要等）。
   * @param {ArrayBuffer} arrayBuffer - PDF 文件内容
   * @param {string} [fileName] - 文件名（用于回退时显示）
   * @returns {Promise<Object>} 标准化的文献条目
   */
  function extractPDFMetadata(arrayBuffer, fileName) {
    if (!window.pdfjsLib) {
      return Promise.reject(new Error('PDF.js 未加载'));
    }

    return window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
      .then(function (pdf) {
        var title = (pdf._pdfInfo && pdf._pdfInfo.Title) || '';
        var authors = (pdf._pdfInfo && pdf._pdfInfo.Author) || '';
        var subject = (pdf._pdfInfo && pdf._pdfInfo.Subject) || '';
        var keywords = (pdf._pdfInfo && pdf._pdfInfo.Keywords) || '';

        // 从第一页文本中提取 DOI
        return pdf.getPage(1).then(function (page) {
          return page.getTextContent().then(function (content) {
            var firstPageText = content.items.map(function (item){ return item.str; }).join(' ');
            var doiMatch = firstPageText.match(/10\.\d{4,9}\/[-._;()\/:A-Z0-9]+/i);
            var doi = doiMatch ? doiMatch[0] : '';

            // 如果元数据没有标题，使用文件名
            if (!title && fileName) {
              title = fileName.replace(/\.pdf$/i, '');
            }

            // 如果没有作者，从文本前500字符尝试提取
            if (!authors) {
              var authorGuess = firstPageText.substring(0, 500)
                .match(/(by|By|作者：?)\s*([A-Za-z\u4e00-\u9fa5][A-Za-z\u4e00-\u9fa5\s,.·\-]+)/);
              if (authorGuess) authors = authorGuess[2].trim();
            }

            // 提取前 500 字符作为摘要
            var abstractText = firstPageText.substring(0, 500).trim();

            var raw = {
              title: title,
              authors: authors,
              journal: subject,
              year: '',
              doi: doi,
              abstract: abstractText,
              keywords: keywords ? keywords.split(/[,;]/).map(function (k){return k.trim();}).filter(Boolean) : []
            };
            return _normalizeLit(raw);
          });
        });
      });
  }

  // ============================================================
  // 9. 导出器：CSV / JSON / 纯文本
  // ============================================================

  function exportCSV(items) {
    var headers = ['Title','Authors','Year','Journal','Volume','Issue','Pages','DOI','Publisher','Abstract','Keywords'];
    var rows = [headers.join(',')];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var row = [
        _escapeCSV(it.title), _escapeCSV(it.authors), _escapeCSV(it.year),
        _escapeCSV(it.journal), _escapeCSV(it.volume), _escapeCSV(it.issue),
        _escapeCSV(it.pages), _escapeCSV(it.doi), _escapeCSV(it.publisher),
        _escapeCSV(it.abstract),
        _escapeCSV(Array.isArray(it.keywords) ? it.keywords.join('; ') : '')
      ];
      rows.push(row.join(','));
    }
    return rows.join('\n');
  }

  function exportJSON(items) {
    var simplified = items.map(function (it){
      return {
        title: it.title, authors: it.authors, year: it.year,
        journal: it.journal, doi: it.doi, volume: it.volume,
        issue: it.issue, pages: it.pages, publisher: it.publisher,
        abstract: it.abstract, keywords: it.keywords || [],
        status: it.status, priority: it.priority, tags: it.tags || [],
        createdAt: it.createdAt
      };
    });
    return JSON.stringify(simplified, null, 2);
  }

  function exportPlainText(items) {
    var lines = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var line = String(i + 1) + '. ';
      if (it.authors) line += it.authors + '. ';
      line += (it.title || '(无标题)') + '.';
      if (it.journal) line += ' ' + it.journal;
      if (it.year) line += ', ' + it.year;
      if (it.volume || it.issue) line += ', ' + (it.volume || '') + '(' + (it.issue || '') + ')';
      if (it.pages) line += ': ' + it.pages;
      if (it.doi) line += '. DOI: ' + it.doi;
      lines.push(line);
    }
    return lines.join('\n\n');
  }

  function exportBibTeX(items) {
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var type = it.type || 'article';
      var key = _bibtexKey(it) + '_' + (i + 1);
      out.push('@' + type + '{' + key + ',');
      if (it.title) out.push('  title = {' + _escapeBibTeX(it.title) + '},');
      if (it.authors) out.push('  author = {' + _escapeBibTeX(it.authors) + '},');
      if (it.journal) out.push('  journal = {' + _escapeBibTeX(it.journal) + '},');
      if (it.year) out.push('  year = {' + it.year + '},');
      if (it.volume) out.push('  volume = {' + it.volume + '},');
      if (it.issue) out.push('  number = {' + it.issue + '},');
      if (it.pages) out.push('  pages = {' + it.pages + '},');
      if (it.doi) out.push('  doi = {' + it.doi + '},');
      if (it.publisher) out.push('  publisher = {' + _escapeBibTeX(it.publisher) + '},');
      if (it.abstract) out.push('  abstract = {' + _escapeBibTeX(it.abstract) + '},');
      if (Array.isArray(it.keywords) && it.keywords.length) {
        out.push('  keywords = {' + it.keywords.join('; ') + '},');
      }
      out.push('}');
      out.push('');
    }
    return out.join('\n');
  }

  // ============================================================
  // 10. 统一格式检测 + 批处理入口
  // ============================================================

  /** 根据文件扩展名/内容嗅探自动选择合适的解析器（v1.4.1 改进） */
  function detectFormat(fileName, content) {
    var c = (content || '').toString();
    var ext = (fileName || '').split('.').pop().toLowerCase();

    // 1) RIS 格式: 以 "TY  - X" 开头 或 .ris/.enw 扩展名
    if (ext === 'ris' || ext === 'enw' || /^TY\s*-\s*\w+/m.test(c)) {
      return 'ris';
    }

    // 2) BibTeX 格式: 以 @article{key, 等条目声明开头
    if (ext === 'bib' || ext === 'bibtex' || /^\s*@\w+\s*\{[^,\s]+/m.test(c)) {
      return 'bibtex';
    }

    // 3) EndNote XML 格式: 检测 <records><record> 或 <xml> 包裹结构
    var hasXmlTag = /<\s*(xml|records|record|ref-list|ref)[\s>]/i.test(c) ||
                     /<\s*\/\s*(records|record|xml|ref)\s*>/i.test(c);
    var hasEndNoteField = /<\s*(electronic-resource-num|contributors|secondary-title|pub-dates|keywords|abstract|titles)\b/i.test(c);
    if (ext === 'xml' && (hasXmlTag || hasEndNoteField)) return 'endnote';
    if (hasXmlTag && hasEndNoteField) return 'endnote';
    if (hasXmlTag && /<\s*style[>\s]/i.test(c)) return 'endnote';

    // 4) Zotero RDF 格式: RDF 命名空间 + 文献条目
    var hasRdf = /<\s*rdf:RDF/i.test(c) || /xmlns:rdf\s*=/i.test(c);
    var hasZotero = /<\s*z:|z:Article|z:Book|bibo:Article|dcterms:/i.test(c);
    if (ext === 'rdf' && hasRdf) return 'zotero';
    if (hasRdf && hasZotero) return 'zotero';

    // 5) Mendeley CSV 格式: 第一行为表头，包含 Title/Authors/Year/Journal/DOI 等
    var firstLine = c.split(/\r?\n/)[0] || '';
    if (ext === 'csv') return 'mendeley';
    if (firstLine.indexOf(',') !== -1 && firstLine.split(',').length >= 3) {
      var hl = firstLine.toLowerCase();
      var metaHits = 0;
      if (/title|题名/i.test(hl)) metaHits++;
      if (/author|作/i.test(hl)) metaHits++;
      if (/journal|source|source title|刊名/i.test(hl)) metaHits++;
      if (/doi/i.test(hl)) metaHits++;
      if (/year|年/i.test(hl)) metaHits++;
      if (/abstract|摘要/i.test(hl)) metaHits++;
      if (/keyword|tag|关键词/i.test(hl)) metaHits++;
      if (metaHits >= 2) return 'mendeley';
    }

    // 6) CNKI / 知网文本: 中文字段标签 + 冒号
    if (ext === 'net') return 'cnki';
    var cnkiPatterns = [
      '题名：', '题名:', '篇名：', '篇名:', '论文题目：',
      '作者：', '作者:', '著者：',
      '刊名：', '刊名:', '期刊：', '来源：', '来源期刊：',
      '年：', '年:', '出版年：',
      '关键词：', '关键词:', '关键字：',
      '摘要：', '摘要:', '文摘：',
      'DOI：', 'DOI:', 'DOI ', 'doi:',
      '卷：', '期：', '页码：',
      '机构：', '单位：',
      '【摘要】', '【关键词】', '【基金】', '【作者简介】',
      '中图分类号'
    ];
    for (var ci = 0; ci < cnkiPatterns.length; ci++) {
      if (c.indexOf(cnkiPatterns[ci]) !== -1) return 'cnki';
    }
    // 标准中文引用格式: [1] 张三. 论文题名[J]. 计算机学报, 2024, 47(3): 456-468.
    if (/^\s*\[\d+\]\s*[^\n]*[\u4e00-\u9fa5][^\n]*\./m.test(c)) return 'cnki';
    // 中文文本回退: 如果大部分文本是中文且未识别到其他格式，则当作 CNKI 尝试解析
    var cnCount = (c.match(/[\u4e00-\u9fa5]/g) || []).length;
    if (cnCount > 20 && cnCount / Math.max(c.length, 1) > 0.15) return 'cnki';

    return 'unknown';
  }

  /** 按格式解析文本内容 */
  function parseText(text, format) {
    switch (format) {
      case 'ris': return parseRIS(text);
      case 'bibtex': return parseBibTeX(text);
      case 'endnote': return parseEndNoteXML(text);
      case 'zotero': return parseZoteroRDF(text);
      case 'mendeley': return parseMendeleyCSV(text);
      case 'cnki': return parseCNKI(text);
      default: return [];
    }
  }

  /** 按格式导出 */
  function exportByFormat(items, format) {
    switch (format) {
      case 'ris': return { content: exportRIS(items), ext: 'ris', mime: 'application/x-research-info-systems' };
      case 'bibtex': return { content: exportBibTeX(items), ext: 'bib', mime: 'application/x-bibtex' };
      case 'endnote': return { content: exportEndNoteXML(items), ext: 'xml', mime: 'application/xml' };
      case 'csv': return { content: exportCSV(items), ext: 'csv', mime: 'text/csv' };
      case 'json': return { content: exportJSON(items), ext: 'json', mime: 'application/json' };
      case 'text': return { content: exportPlainText(items), ext: 'txt', mime: 'text/plain' };
      default: return { content: exportPlainText(items), ext: 'txt', mime: 'text/plain' };
    }
  }

  // ============================================================
  // 11. 期刊指标增强（分区 / 影响因子）
  // ============================================================

  /**
   * 通过 OpenAlex Sources API 查询期刊信息。
   * 与单篇 DOI 查询逻辑保持一致：提取 2yr_mean_citedness 作为 IF，
   * 基于 IF 估算分区 (Q1/Q2/Q3/Q4)，与 crud.js fetchJournalInfo 保持一致。
   *
   * @param {string} journalName 期刊名
   * @returns {Promise<{impactFactor:number|null, quartile:string|null}>}
   */
  function fetchJournalInfo(journalName) {
    if (!journalName || !String(journalName).trim()) return Promise.resolve({ impactFactor: null, quartile: null });
    if (!window.DOIClient) return Promise.resolve({ impactFactor: null, quartile: null });
    var mailto = 'scholarflow@example.com';
    try {
      if (window.appData && window.appData.settings && window.appData.settings.doiEmail) mailto = window.appData.settings.doiEmail;
    } catch (e) {}
    return window.DOIClient.fetchJournalInfo(journalName, null, mailto).then(function (info) {
      if (!info) return { impactFactor: null, quartile: null };
      return { impactFactor: info.impactFactor != null ? info.impactFactor : null, quartile: info.quartile || null };
    }).catch(function () { return { impactFactor: null, quartile: null }; });
  }

  /**
   * 对一批已解析的文献条目补充期刊信息（分区+影响因子）。
   * 为了避免过多请求，仅对有期刊名且尚未包含 quartile/impactFactor 的条目进行查询。
   * 查询以串行方式执行以避免 API 限流。
   *
   * @param {Array<Object>} items 已解析的文献条目
   * @param {Function} [onProgress] 进度回调 function(current, total, action, info)
   * @returns {Promise<Array<Object>>} 增强后的条目列表
   */
  function enrichWithJournalInfo(items, onProgress) {
    if (!Array.isArray(items) || items.length === 0) {
      return Promise.resolve(items || []);
    }

    var results = items.slice();
    var i = 0;

    function next() {
      if (i >= results.length) return Promise.resolve(results);
      var item = results[i];
      var journal = item && (item.journal || item.publisher);
      var hasIF = item && (item.impactFactor != null || item.quartile);
      var idxCurrent = i;
      i++;

      // 已有 IF/分区或无期刊名：跳过
      if (!journal || hasIF) {
        return next();
      }

      if (onProgress) onProgress(idxCurrent + 1, results.length, '查询期刊指标', journal);

      return fetchJournalInfo(journal).then(function (info) {
        if (info) {
          if (info.impactFactor != null) item.impactFactor = info.impactFactor;
          if (info.quartile) item.quartile = info.quartile;
        }
        // 节流 150ms，避免 API 限流
        return new Promise(function (r) { setTimeout(r, 150); });
      }).then(next);
    }

    return next();
  }

  // ============================================================
  // 12. 批量导入处理（带进度、重复检测、错误报告）
  // ============================================================

  /**
   * 批量导入处理。对每个解析出的条目执行：
   *   1. 标题验证（无标题视为无效）
   *   2. 重复文献检测
   *   3. 根据策略（导入/合并/跳过）写入现有库
   * 返回 { imported, duplicates, invalid, errors }
   *
   * @param {Array<Object>} parsedItems 从解析器得到的条目数组
   * @param {Array<Object>} existingLiterature appData.literature
   * @param {Object} options { strategy: 'import_all'|'skip_duplicates'|'merge' }
   * @param {Function} [onProgress] function(current, total, action, info)
   * @returns {{imported:number, duplicates:number, invalid:number, messages:Array<string>}}
   */
  function processBatchImport(parsedItems, existingLiterature, options, onProgress) {
    var imported = 0, duplicates = 0, invalid = 0;
    var messages = [];
    var duplicateDetails = []; // 新增：详细重复条目
    var total = parsedItems.length;
    var strategy = (options && options.strategy) || 'skip_duplicates';

    for (var i = 0; i < total; i++) {
      var item = parsedItems[i];
      if (onProgress) onProgress(i + 1, total, '处理条目', item.title || item.doi || '(无标题)');

      if (!item.title && !item.doi) {
        invalid++;
        messages.push('第 ' + (i + 1) + ' 条：缺少标题和 DOI，跳过');
        continue;
      }

      var dup = detectDuplicate(item, existingLiterature);
      if (dup.isDuplicate) {
        duplicates++;
        // 收集重复文献详情
        var existingItem = existingLiterature[dup.index];
        duplicateDetails.push({
          index: i + 1,
          title: item.title || item.doi || '(无标题)',
          doi: item.doi || '',
          matchedBy: dup.reason || '重复',
          existingTitle: existingItem ? (existingItem.title || existingItem.doi || '(无标题)') : ''
        });
        if (strategy === 'merge') {
          existingLiterature[dup.index] = mergeLiterature(existingLiterature[dup.index], item);
          messages.push('第 ' + (i + 1) + ' 条已合并到条目 #' + (dup.index + 1) + '（' + dup.reason + '）');
        } else if (strategy === 'import_all') {
          var fullLit = Object.assign({}, item, {
            id: 'import_' + Date.now() + '_' + i,
            createdAt: _today()
          });
          existingLiterature.push(fullLit);
          imported++;
        } else {
          // skip_duplicates（默认）
          messages.push('第 ' + (i + 1) + ' 条已存在，已跳过（' + dup.reason + '）');
        }
      } else {
        // 从 keywords 派生 tags，确保 DOI 批量导入的研究领域标签也能被其他功能使用
        var derivedTags = Array.isArray(item.tags) && item.tags.length ? item.tags.slice()
          : (Array.isArray(item.keywords) ? item.keywords.slice() : []);
        var newLit = Object.assign({}, item, {
          id: 'lit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
          createdAt: _today(),
          status: 'unread',
          progress: 0,
          priority: 'medium',
          folder: null,
          tags: derivedTags,
          totalReadTime: 0,
          pageProgress: { current: 0, total: 0 },
          sectionProgress: { introduction: 0, methods: 0, results: 0, discussion: 0, conclusion: 0 },
          deadline: null,
          lastReadAt: null
        });
        existingLiterature.push(newLit);
        imported++;
      }
    }

    return {
      imported: imported,
      duplicates: duplicates,
      invalid: invalid,
      total: total,
      messages: messages,
      duplicateDetails: duplicateDetails // 新增
    };
  }

  // ============================================================
  // 全局暴露
  // ============================================================

  window.ImportExport = {
    // 解析器
    parseRIS: parseRIS,
    parseBibTeX: parseBibTeX,
    parseEndNoteXML: parseEndNoteXML,
    parseZoteroRDF: parseZoteroRDF,
    parseMendeleyCSV: parseMendeleyCSV,
    parseCNKI: parseCNKI,

    // 导出器
    exportRIS: exportRIS,
    exportBibTeX: exportBibTeX,
    exportEndNoteXML: exportEndNoteXML,
    exportCSV: exportCSV,
    exportJSON: exportJSON,
    exportPlainText: exportPlainText,

    // 高级功能
    detectFormat: detectFormat,
    parseText: parseText,
    exportByFormat: exportByFormat,
    fetchDOIBatch: fetchDOIBatch,
    fetchJournalInfo: fetchJournalInfo,
    enrichWithJournalInfo: enrichWithJournalInfo,
    extractPDFMetadata: extractPDFMetadata,
    detectDuplicate: detectDuplicate,
    mergeLiterature: mergeLiterature,
    processBatchImport: processBatchImport,

    // 辅助
    normalizeLit: _normalizeLit
  };

})();
