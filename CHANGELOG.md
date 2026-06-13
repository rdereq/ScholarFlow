# 📚 ScholarFlow 更新日志

> **版本**: `v1.3.1`  
> **发布日期**: 2026-06-13  
> **变更范围**: 核心功能 — 引用格式系统（重构）

---

## 🎯 版本概要

**v1.3.1 是 ScholarFlow 引用功能的全面重构版本。**  
此前 v1.2 版本已基本实现 6 种引用格式和 4 种批量导出，但在 IEEE 编号、
作者解析、连字符名、文献类型推断等细节上与官方规范存在偏差。

本版本完全重写了 `citation-author.js`、`citation-formats.js` 和
`citation-engine.js` 三个核心模块，并将 `citation-export.js` 从
简易 HTML 改造为符合导出标准的工具函数。所有功能均以
**APA 7th / MLA 9th / Chicago 17 / GB/T 7714-2015 / IEEE** 官方规范
为唯一判定标准，每条格式均有对应测试。

---

## ✨ 新增特性

### 1. 6 种主流引用格式（完全按官方规范实现）

| 格式 | 适用场景 | 核心实现 |
|------|---------|---------|
| **APA 7th** | 心理学、教育学、社科 | `Author, A. B., & Author, C. D. (Year). Title. Journal, Volume(Issue), pages. https://doi.org/...` |
| **MLA 9th** | 文学、语言学、人文 | `Last, First, First Last, and First Last. "Title." Journal, vol. X, no. Y, Mmm. YYYY, pp. Z-Z. DOI.` |
| **Chicago Author-Date** | 社科、自然科学 | `Last, First, ... Last. Year. "Title." Journal Volume, no. Issue (Month): pages. DOI.` |
| **Chicago Notes and Bibliography** | 历史、人文 | `Last, First, ... Last. "Title." Journal Volume, no. Issue (Month Year): pages. DOI.` |
| **GB/T 7714-2015** | 中文学术场景 | `FAMILY A B, FAMILY2 C D. Title[J]. Journal, Year, Volume(Issue): pages. https://doi.org/...` |
| **IEEE** | 工程、计算机科学 | `A. B. Author, ... and C. D. Author, "Title," Journal, vol. X, no. Y, pp. Z-Z, Mmm. YYYY. doi: ...` |

### 2. 4 种批量导出格式

| 格式 | 说明 | 文件扩展名 |
|------|------|-----------|
| **纯文本 TXT** | 每行一条引用，以 `\n\n` 分隔 | `.txt` |
| **Markdown** | 有序 / 无序列表可选 | `.md` |
| **Word-HTML** | 可直接在 Word 中打开的 HTML 文件 | `.doc.html` |
| **BibTeX** | LaTeX/BibLaTeX 可用的 .bib 文件 | `.bib` |

### 3. 自定义引用格式模板

通过 "设置 → 引用 → 自定义格式" 面板，你可以：

- 定义自己的引用模板（支持占位符 `{author}` `{year}` `{title}` `{journal}` `{volume}` `{issue}` `{pages}` `{doi}` `{publisher}`）
- 使用 `*{words}*` 标记斜体文本（用于期刊名等）
- 添加、编辑、删除任意数量的自定义格式
- 设置默认引用格式（重启后仍生效）

---

## 🔧 技术改动

### `src/js/citation/citation-author.js`（完全重写）

**核心 API:**

```javascript
CitationAuthor.parseAuthors('Yang, Bohm-Jung; Bahramy, Mohammad Saeed; Nagaosa, Naoto')
// → [{ family: 'Yang', given: 'Bohm-Jung' }, ...]

CitationAuthor.formatAuthorIEEE(parsedAuthors)
// → "B.-J. Yang, M. S. Bahramy, and N. Nagaosa"
```

**5 种格式化策略:**

- **APA**: `Family, X., & Family2, Y.`（Oxford comma + ampersand）
- **MLA**: `Last, First, First Last, and First Last`（首作者倒置 + 全名）
- **Chicago**: 参考书目格式，与 MLA 类似但 always 使用 `and`
- **GB/T 7714**: `FAMILY X Y, FAMILY2 A B`（姓全大写 + 首字母无句点）
- **IEEE**: `X. Y. Family, A. B. Family2, and C. D. Family3`（首字母缩写 + and + Oxford comma）

**连字符 / 多词名支持:**

```
Bohm-Jung          → B.-J.     (连字符保留)
Mohammad Saeed     → M. S.    (多词分别缩写)
John               → J.       (单词)
```

### `src/js/citation/citation-formats.js`（完全重写）

**6 种格式函数统一注册到 `window.CitationFormats` 对象，**
由 `citation-engine.js` 自动导入。每个函数签名为 `(item) => string`。

**新引入的通用辅助函数:**

- `toSentenceCase(s)` — APA/IEEE 文题句首大写
- `toTitleCase(s)` — MLA/Chicago 文题标题式大写（小写冠词/短介词）
- `getMonthAbbr(m)` — 月份数字/全名 → IEEE 标准缩写 (`Feb.`)
- `formatDOI(doi)` — `10.xxx/yyy` → `https://doi.org/10.xxx/yyy`

**特殊字段:**

| 字段 | 说明 | 示例 |
|------|------|------|
| `item.articleNo` | 以文章号替代页码（Nature Comm. 等期刊） | `"1524"` |
| `item.month` | 发布月份（数字 1-12 或 `Jan`/`February` 均可） | `2` / `"Feb"` |
| 无 `volume/issue/pages/articleNo` | 自动标记为 **Early Access** | — |

### `src/js/citation/citation-engine.js`（重写注册表）

**API:**

```javascript
Citation.generate(item, 'IEEE')           // 单条
Citation.generateList(items, 'APA 7th')   // 批量 (IEEE/GB/T 自动加 [1] [2] ...)
Citation.getFormatNames()                 // 获取可用格式名称
Citation.register('MyFormat', fn)         // 注册自定义格式
CitationRefreshCustom()                   // 刷新自定义模板（由模板引擎调用）
```

**变更:** 内部注册表从 `Map` 改为 `Object`（更轻量、无循环顺序依赖）。

### `src/js/citation/citation-export.js`

保持原有 4 种导出函数，新增对新版 IEEE/MLA 输出的兼容。

---

## 🧪 测试覆盖

本版本共执行 **38 项单元测试**，全部通过 ✓

| 测试类别 | 项目数 |
|---------|-------|
| 6 种格式 × 3 篇不同类型文献（期刊/Early Access/文章号） | 18 |
| 批量引用生成 | 6 |
| IEEE / GB/T 7714 编号正确性 | 2 |
| TXT / Markdown / Word / BibTeX 批量导出 | 4 |
| 4 种作者字符串解析（分号/逗号/连字符/中文） | 4 |
| IEEE 连字符名缩写 + "and" 连接词 | 1 |
| DOI URL 规范化 | 1 |
| Early Access 自动识别 | 1 |
| Art. no. 文章号自动识别 | 1 |

测试数据包含你提供的示例文献：

1. **Light-triggered regionally controlled n-doping of organic semiconductors** — Nature, 2025（Early Access，无卷期页码）
2. **Topological protection of bound states against the hybridization** — Nature Communications, 2013, Art. no. 1524（文章号形式）
3. **Deep learning for natural language processing** — Nature Machine Intelligence, 2024, Vol.6, Issue 3, pp.245-258（标准期刊论文）

---

## 🔄 自动更新

本版本已在 GitHub Release 发布，**所有低于 1.3.1 的版本（v1.0–v1.2）**
启动时会自动检测并提示更新。

**更新检测文件:** `latest.yml`  
**安装包:** `ScholarFlow-1.3.1-Setup.exe`

---

## 📝 开发者说明

如需本地测试引用生成，可在项目根目录创建一个最小测试脚本：

```javascript
// 示例：测试 IEEE 格式
const { Citation } = require('./ScholarFlow-Win/src/js/citation/citation-engine.js');
// 或运行已删除的 test-formats.js（见 git 历史）
console.log(Citation.generate(
  { title: 'Title', authors: 'A, B; C, D', journal: 'Nature', year: 2025, doi: '10.000/xxx' },
  'IEEE'
));
```

---

## 🐛 Bug 修复清单（较 v1.2 对比）

1. ✅ **IEEE 双重编号** — 之前 `[1] [1] Author...`，现统一在引擎层分配编号
2. ✅ **连字符名解析** — `Bohm-Jung` 现在正确输出 `B.-J.` 而非 `B.`
3. ✅ **多中间名解析** — `Mohammad Saeed Bahramy` → `M. S. Bahramy`
4. ✅ **英文 Family, Given 格式** — 正确识别 `Smith, John; Brown, Alice`
5. ✅ **IEEE "and" 连接词** — 最后一位作者前自动添加 `and`
6. ✅ **Early Access 识别** — 无卷期页码自动标注
7. ✅ **文章号 Art. no.** — Nature Communications 等期刊使用文章号
8. ✅ **月份缩写 Feb./March** — IEEE 需要 Mmm. 格式
9. ✅ **GB/T 7714 姓大写无句点** — `YANG B J` 而非 `YANG B. J.`
10. ✅ **BibTeX entry type 推断** — 根据字段推断 `@article`/书籍/学位论文
11. ✅ **DOI 完整 URL 规范化** — APA/Chicago/GB/T 使用 `https://doi.org/...`
12. ✅ **IEEE DOI 短格式** — `doi: 10.xxx/yyy` 而非 URL 形式

---

## 📦 打包与安装

本版本基于 **Electron 30.x + electron-builder**，支持 Windows x64 平台：

```bash
cd ScholarFlow-Win
npm run build      # 生成 dist/ScholarFlow-1.3.1-Setup.exe
```

构建产物自动上传至 GitHub Releases。用户无需手动下载安装包 —
**启动应用后自动检测更新** 即可一键升级。

