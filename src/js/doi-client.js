/**
 * ScholarFlow — DOI Client (共享模块)
 *
 * 统一封装 DOI 元数据查询逻辑，供 crud.js（单篇 DOI 表单）
 * 与 import-export.js（DOI 批量导入）共用，避免两份维护副本。
 *
 * 设计要点：
 *   - 中文 DOI 检测：10.3969 / 10.3724 / ...
 *   - 多源合并策略：CrossRef + OpenAlex + Semantic Scholar + (可选) CNKI
 *   - 指数退避重试（最多 3 次，429/5xx/网络错误自动重试）
 *   - 期刊 IF/分区估算：基于 OpenAlex Sources API
 *   - 并发控制：批量导入时同时查询 3 个 DOI（由调用方控制）
 */
(function () {
  'use strict';

  // ======================== 常量 ========================

  const CHINESE_DOI_PREFIXES = [
    '10.3969', '10.3724', '10.13209', '10.13345',
    '10.13873', '10.11936', '10.13368', '10.12310'
  ];

  const DOI_SOURCES = {
    crossref: {
      name: 'CrossRef',
      url: (doi) => `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
      timeout: 10000
    },
    openalex: {
      name: 'OpenAlex',
      url: (doi) => `https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`,
      timeout: 10000
    },
    semanticscholar: {
      name: 'Semantic Scholar',
      url: (doi) => `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=title,authors,year,venue,abstract,citationCount,influentialCitationCount,fieldsOfStudy`,
      timeout: 10000
    },
    cnki: {
      name: 'CNKI',
      url: (doi, apiKey) => {
        if (apiKey) return `https://api.cnki.net/metadata/v1/article?doi=${encodeURIComponent(doi)}&token=${encodeURIComponent(apiKey)}`;
        return null; // 无 Token 时跳过 CNKI，避免无效请求
      },
      timeout: 12000
    }
  };

  // ======================== 工具函数 ========================

  /** 判断 DOI 是否为中文期刊 DOI */
  function isChineseDOI(doi) {
    if (!doi) return false;
    const d = String(doi).toLowerCase().trim();
    return CHINESE_DOI_PREFIXES.some(prefix => d.startsWith(prefix));
  }

  /** 从 OpenAlex inverted index 重建摘要 */
  function reconstructAbstract(invertedIndex) {
    if (!invertedIndex || typeof invertedIndex !== 'object') return '';
    const wordPositions = [];
    Object.keys(invertedIndex).forEach(function (word) {
      const positions = invertedIndex[word];
      if (!Array.isArray(positions)) return;
      positions.forEach(function (pos) { wordPositions[pos] = word; });
    });
    return wordPositions.filter(Boolean).join(' ');
  }

  /**
   * 统一格式作者名：
   *   - "Family, Given"  → "Family, Given"  （保持不变，但 trim）
   *   - "Given Family"   → "Family, Given"  （尝试推断）
   *   - "中文姓名"       → 原样保留
   *   - "FAMILY GIVEN"  → "Family, Given"  （大小写规范化）
   *
   * 无法安全推断英文姓名时，直接 trim 返回，避免搞乱顺序。
   */
  function _formatAuthorName(rawName) {
    var s = String(rawName || '').trim();
    if (!s) return '';

    // 若已经是 "Family, Given" 格式，直接返回
    if (s.indexOf(',') !== -1) return s.replace(/\s*,\s*/g, ', ').trim();

    // 中文字符：原样返回
    if (/[\u4e00-\u9fa5]/.test(s)) return s;

    // "Given Family" → 尝试提取最后一个空格后的部分作为 family
    // 注意：此推断仅适用于 "First Last" 这种最简单的形式
    var parts = s.split(/\s+/).filter(Boolean);
    if (parts.length === 2) return parts[1] + ', ' + parts[0];
    if (parts.length > 2) {
      // 可能是 "First Middle Last"：把最后一个词作为 family
      var family = parts[parts.length - 1];
      var given = parts.slice(0, -1).join(' ');
      return family + ', ' + given;
    }
    return s;
  }

  /** 合并作者列表，统一用 "; " 分隔 */
  function _joinAuthors(arr) {
    if (!Array.isArray(arr)) return '';
    return arr.filter(Boolean).map(function (a) { return _formatAuthorName(a); }).join('; ');
  }

  // ======================== 重试 Fetch ========================

  /**
   * 带指数退避重试的 fetch
   * - 网络错误、429 Too Many Requests、5xx 自动重试
   * - 最多 retryMax 次（默认 3），首次延迟 500ms，后续 ×2
   */
  function _fetchJSON(url, options, retryMax, _retryCount) {
    if (retryMax == null) retryMax = 3;
    if (_retryCount == null) _retryCount = 0;
    return fetch(url, options).then(function (r) {
      if (r.status === 429 || (r.status >= 500 && r.status < 600)) {
        if (_retryCount < retryMax) {
          var delay = Math.min(1000 * Math.pow(2, _retryCount), 5000); // 500/1000/2000/4000
          return new Promise(function (res) { setTimeout(res, delay); }).then(function () {
            return _fetchJSON(url, options, retryMax, _retryCount + 1);
          });
        }
        throw new Error('HTTP ' + r.status);
      }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).catch(function (err) {
      if (_retryCount < retryMax) {
        var delay = Math.min(1000 * Math.pow(2, _retryCount), 5000);
        return new Promise(function (res) { setTimeout(res, delay); }).then(function () {
          return _fetchJSON(url, options, retryMax, _retryCount + 1);
        });
      }
      throw err;
    });
  }

  // ======================== 各数据源解析 ========================

  function parseCrossRefData(item) {
    if (!item) return null;
    var authors = Array.isArray(item.author)
      ? item.author.map(function (a) {
          var n = (a.family || '') + (a.given ? ', ' + a.given : '');
          return n.trim();
        }).filter(Boolean)
      : [];
    var journal = Array.isArray(item['container-title']) && item['container-title'].length
      ? String(item['container-title'][0])
      : '';
    var year = '';
    var parts = (item.issued && item.issued['date-parts']) || (item.created && item.created['date-parts'])
      || (item.published && item.published['date-parts']);
    if (Array.isArray(parts) && parts.length) year = String(parts[0][0] || '');

    var absText = (item.abstract || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    var subjects = Array.isArray(item.subject) ? item.subject.map(function (s) { return String(s); }) : [];

    var keywords = [];
    if (Array.isArray(item.keywords) && item.keywords.length) {
      item.keywords.forEach(function (kw) {
        if (typeof kw === 'string' && kw.trim()) keywords.push(kw.trim());
        else if (kw && typeof kw === 'object') {
          var val = kw.keyword || kw.Keyword || kw.value || kw.text || kw.name;
          if (typeof val === 'string' && val.trim()) keywords.push(val.trim());
          else if (Array.isArray(kw.keyword) || Array.isArray(kw.Keyword)) {
            var arr = kw.keyword || kw.Keyword;
            arr.forEach(function (s) { if (s && s.trim()) keywords.push(s.trim()); });
          }
        }
      });
    }

    return {
      title: (Array.isArray(item.title) && item.title.length) ? String(item.title[0]) : '',
      authors: _joinAuthors(authors),
      journal: journal,
      year: year,
      abstract: absText,
      pages: item.page || '',
      subjects: subjects,
      keywords: keywords,
      doi: item.DOI || '',
      citationCount: Number(item['is-referenced-by-count'] || 0)
    };
  }

  function parseSemanticScholarData(data) {
    if (!data) return null;
    return {
      title: data.title || '',
      authors: (data.authors || []).map(function (a) { return (a.name || '').trim(); }).filter(Boolean).join('; '),
      journal: data.venue || '',
      year: data.year || '',
      abstract: data.abstract || '',
      citationCount: Number(data.citationCount || 0),
      influentialCitationCount: Number(data.influentialCitationCount || 0),
      fieldsOfStudy: Array.isArray(data.fieldsOfStudy) ? data.fieldsOfStudy.map(function (s) { return String(s); }) : [],
      doi: (data.externalIds && data.externalIds.DOI) ? data.externalIds.DOI : ''
    };
  }

  function parseOpenAlexData(data) {
    if (!data) return null;
    var authors = (data.authorships || []).map(function (as) {
      return (as.author && as.author.display_name) || '';
    }).filter(Boolean);

    var journal = (data.host_venue && data.host_venue.display_name)
      || (data.primary_location && data.primary_location.source && data.primary_location.source.display_name)
      || '';

    return {
      title: data.display_name || '',
      authors: _joinAuthors(authors),
      journal: journal,
      year: data.publication_year || '',
      abstract: data.abstract_inverted_index ? reconstructAbstract(data.abstract_inverted_index) : '',
      citationCount: Number(data.cited_by_count || 0),
      concepts: (data.concepts || []).map(function (c) { return (c && c.display_name) || ''; }).filter(Boolean),
      doi: String(data.doi || '').replace('https://doi.org/', '')
    };
  }

  function parseCNKIData(data) {
    if (!data) return null;
    // 模式 A：open.cnki.net 官方 API
    if (data.data || (data.code && data.result)) {
      var item = data.data || data.result || {};
      var authors = Array.isArray(item.authors || item.Authors)
        ? (item.authors || item.Authors).map(function (a) {
            return typeof a === 'string' ? a : (a.name || a.authorName || a.AuthorName || '');
          }).filter(Boolean)
        : [];
      var yearMatch = String(item.year || item.PubYear || item.publishTime || '').match(/\d{4}/);
      var kw = Array.isArray(item.keywords) ? item.keywords
        : (item.Keywords ? String(item.Keywords).split(/[,;，；]/).map(function (s) { return s.trim(); }).filter(Boolean) : []);
      return {
        title: String(item.title || item.Title || item.ArticleTitle || '').trim(),
        authors: _joinAuthors(authors),
        journal: String(item.journal || item.JournalName || item.sourceTitle || '').trim(),
        year: yearMatch ? yearMatch[0] : '',
        abstract: String(item.abstract || item.Abstract || item.Summary || '').replace(/<[^>]+>/g, '').trim(),
        keywords: kw,
        doi: String(item.doi || item.DOI || '').trim(),
        volume: String(item.volume || item.Volume || '').trim(),
        issue: String(item.issue || item.Issue || '').trim(),
        pages: String(item.pages || item.Page || '').trim(),
        citationCount: Number(item.citationCount || item.CitedCount || 0)
      };
    }
    return null;
  }

  // ======================== 单个数据源查询 ========================

  /**
   * 查询单个数据源，返回解析后的对象，失败返回 null
   * @param {string} sourceKey 'crossref' | 'openalex' | 'semanticscholar' | 'cnki'
   * @param {string} doi 标准化 DOI
   * @param {AbortSignal} [signal] 可选的取消信号
   * @param {Object} [opts] { mailto: string, cnkiToken: string }
   */
  function fetchSingleSource(sourceKey, doi, signal, opts) {
    var config = DOI_SOURCES[sourceKey];
    if (!config) return Promise.resolve(null);

    var mailto = (opts && opts.mailto) || 'scholarflow@example.com';
    var cnkiToken = (opts && opts.cnkiToken) || '';

    var finalUrl = config.url(doi, cnkiToken);
    if (!finalUrl) return Promise.resolve(null); // 如 CNKI 无 Token

    if (sourceKey === 'crossref' || sourceKey === 'openalex') {
      finalUrl += (finalUrl.indexOf('?') === -1 ? '?' : '&') + 'mailto=' + encodeURIComponent(mailto);
    }

    var headers = { 'Accept': 'application/json' };
    var fetchOpts = { headers: headers };
    if (signal) fetchOpts.signal = signal;

    return _fetchJSON(finalUrl, fetchOpts, 3).then(function (data) {
      if (sourceKey === 'crossref') return data.message ? parseCrossRefData(data.message) : null;
      if (sourceKey === 'semanticscholar') return parseSemanticScholarData(data);
      if (sourceKey === 'openalex') return parseOpenAlexData(data);
      if (sourceKey === 'cnki') return parseCNKIData(data);
      return null;
    }).catch(function (err) {
      console.warn('[DOIClient] ' + config.name + ' fetch failed:', err && err.message);
      return null;
    });
  }

  // ======================== 多源合并 ========================

  /**
   * 合并多源结果，按优先级取非空值；数组字段合并去重；数值字段取最大
   */
  function mergeSourceData(results, isChinese) {
    var merged = {
      title: '', authors: '', journal: '', year: '',
      abstract: '', pages: '', volume: '', issue: '',
      subjects: [], citationCount: 0, influentialCitationCount: 0,
      fieldsOfStudy: [], concepts: [], keywords: [], doi: ''
    };

    var priority = isChinese
      ? ['cnki', 'crossref', 'openalex', 'semanticscholar']
      : ['crossref', 'openalex', 'cnki', 'semanticscholar'];

    for (var i = 0; i < priority.length; i++) {
      var source = priority[i];
      var data = results[source];
      if (!data) continue;

      if (!merged.title && data.title) merged.title = data.title;
      if (!merged.authors && data.authors) merged.authors = data.authors;
      if (!merged.journal && data.journal) merged.journal = data.journal;
      if (!merged.year && data.year) merged.year = data.year;
      if (!merged.abstract && data.abstract) merged.abstract = data.abstract;
      if (!merged.pages && data.pages) merged.pages = data.pages;
      if (!merged.doi && data.doi) merged.doi = data.doi;
      if (!merged.volume && data.volume) merged.volume = data.volume;
      if (!merged.issue && data.issue) merged.issue = data.issue;

      if (data.citationCount) merged.citationCount = Math.max(merged.citationCount, Number(data.citationCount) || 0);
      if (data.influentialCitationCount) merged.influentialCitationCount = Math.max(merged.influentialCitationCount, Number(data.influentialCitationCount) || 0);

      // 合并数组字段
      function _mergeArray(target, src) {
        if (!Array.isArray(src)) return;
        for (var j = 0; j < src.length; j++) {
          var v = String(src[j] || '').trim();
          if (!v) continue;
          if (target.indexOf(v) === -1) target.push(v);
        }
      }
      _mergeArray(merged.subjects, data.subjects);
      _mergeArray(merged.fieldsOfStudy, data.fieldsOfStudy);
      _mergeArray(merged.concepts, data.concepts);
      _mergeArray(merged.keywords, data.keywords);
    }
    return merged;
  }

  // ======================== 顶层 API：获取单篇 DOI 元数据 ========================

  /**
   * 通过 DOI 获取合并后的元数据（多源并行查询）
   * @param {string} doi 原始 DOI（自动标准化，去除前缀）
   * @param {Object} [opts] { mailto: string, cnkiToken: string, timeout: number }
   * @returns {Promise<Object|null>} 合并后的统一结构对象，所有源失败返回 null
   */
  function fetchDOIMetadata(doi, opts) {
    var cleanDOI = String(doi || '').trim()
      .replace(/^https?:\/\//, '')
      .replace(/^doi:\s*/i, '')
      .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
      .trim();
    if (!cleanDOI) return Promise.resolve(null);

    var chinese = isChineseDOI(cleanDOI);
    var hasCNKIToken = !!(opts && opts.cnkiToken);

    var tasks = [];
    var keys = [];

    if (chinese && hasCNKIToken) { tasks.push(fetchSingleSource('cnki', cleanDOI, null, opts)); keys.push('cnki'); }
    tasks.push(fetchSingleSource('crossref', cleanDOI, null, opts)); keys.push('crossref');
    tasks.push(fetchSingleSource('openalex', cleanDOI, null, opts)); keys.push('openalex');
    tasks.push(fetchSingleSource('semanticscholar', cleanDOI, null, opts)); keys.push('semanticscholar');

    return Promise.all(tasks.map(function (t) { return t.catch(function () { return null; }); })).then(function (raw) {
      var results = {};
      var status = [];
      for (var i = 0; i < keys.length; i++) {
        results[keys[i]] = raw[i];
        if (raw[i]) status.push(DOI_SOURCES[keys[i]] ? DOI_SOURCES[keys[i]].name : keys[i]);
      }
      console.log('[DOIClient] ' + cleanDOI + ' 数据源: ' + (status.join(', ') || '全部失败'));

      var merged = mergeSourceData(results, chinese);
      if (!merged.title && !merged.authors) return null;
      // 合并 keyword/concepts/fieldsOfStudy 为统一 keywords 数组（供调用方使用）
      var allTags = [];
      function _push(arr) {
        if (!Array.isArray(arr)) return;
        for (var i = 0; i < arr.length; i++) if (allTags.indexOf(arr[i]) === -1) allTags.push(arr[i]);
      }
      _push(merged.keywords);
      _push(merged.subjects);
      _push(merged.fieldsOfStudy);
      _push(merged.concepts);
      merged.allTags = allTags;
      merged.isChinese = chinese;
      merged.doi = cleanDOI;
      return merged;
    });
  }

  // ======================== 批量 DOI：并发控制 ========================

  /**
   * 批量查询 DOI 元数据（限制并发数，避免被限流）
   * @param {Array<string>} doiList
   * @param {Object} [opts] { mailto, cnkiToken, concurrency: 3, delayPerRequest: 150 }
   * @param {Function} [onProgress] function(current, total, action, doi)
   * @returns {Promise<{items:Array, errors:Array}>}
   */
  function fetchDOIBatch(doiList, opts, onProgress) {
    var list = (doiList || []).map(function (d) {
      return String(d || '').trim()
        .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
        .replace(/^doi:\s*/i, '')
        .trim();
    }).filter(Boolean);
    var total = list.length;
    var concurrency = (opts && opts.concurrency) ? Number(opts.concurrency) : 3;
    if (concurrency < 1) concurrency = 1;

    var results = [];
    var errors = [];
    var idx = 0;
    var inflight = 0;
    var done = false;

    return new Promise(function (resolve) {
      function finalize() {
        if (!done && inflight === 0 && idx >= total) {
          done = true;
          resolve({ items: results, errors: errors });
        }
      }
      function spawn() {
        while (inflight < concurrency && idx < total) {
          var doi = list[idx];
          idx++;
          inflight++;
          if (onProgress) onProgress(idx, total, '正在解析 DOI', doi);
          fetchDOIMetadata(doi, opts).then(function (item) {
            if (item) results.push(item);
            else errors.push('未找到 DOI: ' + doi);
          }).catch(function (e) {
            errors.push('DOI 失败 ' + doi + ': ' + (e.message || e));
          }).then(function () {
            inflight--;
            // 固定小间隔后再触发下一批（避免瞬间峰值触发限流）
            var delay = (opts && typeof opts.delayPerRequest === 'number') ? opts.delayPerRequest : 150;
            setTimeout(function () { spawn(); finalize(); }, delay);
          });
        }
        finalize();
      }
      spawn();
    });
  }

  // ======================== 期刊 IF / 分区 ========================

  /**
   * 从 OpenAlex Sources API 查询期刊影响因子与分区估计
   * @param {string} journalName 期刊名（模糊匹配）
   * @param {AbortSignal} [signal]
   * @param {string} [mailto] 可选的 mailto 邮箱
   */
  function fetchJournalInfo(journalName, signal, mailto) {
    if (!journalName) return Promise.resolve(null);
    var url = 'https://api.openalex.org/sources?search=' + encodeURIComponent(journalName);
    var m = mailto || 'scholarflow@example.com';
    url += '&mailto=' + encodeURIComponent(m);

    return _fetchJSON(url, { signal: signal, headers: { 'Accept': 'application/json' } }, 2).then(function (data) {
      if (!data || !data.results || !data.results.length) return null;
      var bestMatch = data.results[0];
      if (!bestMatch) return null;

      // 提取 IF（如果有）
      var impactFactor = null;
      if (bestMatch.impact_factor && bestMatch.impact_factor.value != null) {
        impactFactor = Number(bestMatch.impact_factor.value);
      } else if (bestMatch.summary_stats && bestMatch.summary_stats['2yr_mean_citedness']) {
        impactFactor = Number(bestMatch.summary_stats['2yr_mean_citedness']);
      } else if (bestMatch.cited_by_count != null) {
        // 没有 IF 时用 cited_by_count / works_count 估算（非常粗略）
        var wc = Number(bestMatch.works_count || 0);
        if (wc > 0) impactFactor = Math.round(Number(bestMatch.cited_by_count) / wc * 10) / 10;
      }

      // 估算分区
      var quartile = '';
      if (impactFactor != null) {
        if (impactFactor >= 5) quartile = 'Q1';
        else if (impactFactor >= 2) quartile = 'Q2';
        else if (impactFactor >= 1) quartile = 'Q3';
        else if (impactFactor > 0) quartile = 'Q4';
      }
      // 也看看 OpenAlex 的 topic 信息（若有）
      if (!quartile && Array.isArray(bestMatch.counts_by_year) && bestMatch.counts_by_year.length) {
        // 无足够信息，留空
      }

      return {
        journalName: bestMatch.display_name || journalName,
        impactFactor: impactFactor,
        quartile: quartile,
        worksCount: Number(bestMatch.works_count || 0),
        citedByCount: Number(bestMatch.cited_by_count || 0)
      };
    }).catch(function (err) {
      console.warn('[DOIClient] fetchJournalInfo failed:', err && err.message);
      return null;
    });
  }

  // ======================== 导出到 window ========================

  window.DOIClient = {
    CHINESE_DOI_PREFIXES: CHINESE_DOI_PREFIXES,
    isChineseDOI: isChineseDOI,
    reconstructAbstract: reconstructAbstract,
    parseCrossRefData: parseCrossRefData,
    parseSemanticScholarData: parseSemanticScholarData,
    parseOpenAlexData: parseOpenAlexData,
    parseCNKIData: parseCNKIData,
    fetchSingleSource: fetchSingleSource,
    mergeSourceData: mergeSourceData,
    fetchDOIMetadata: fetchDOIMetadata,
    fetchDOIBatch: fetchDOIBatch,
    fetchJournalInfo: fetchJournalInfo,
    _fetchJSON: _fetchJSON
  };
})();
