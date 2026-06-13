# <div align="center">📚 ScholarFlow</div>

<div align="center">

  <img src="https://img.shields.io/badge/Platform-Windows%20x64-0078D6?style=flat-square" />
  <img src="https://img.shields.io/badge/Version-1.3.1-4F46E5?style=flat-square" />
  <a href="https://github.com/rdereq/ScholarFlow/releases"><img src="https://img.shields.io/github/v/release/rdereq/ScholarFlow?style=flat-square&color=10B981" /></a>
  <a href="https://github.com/rdereq/ScholarFlow/blob/main/LICENSE"><img src="https://img.shields.io/github/license/rdereq/ScholarFlow?style=flat-square&color=F59E0B" /></a>

  <h3>学术文献管理与引用生成 — 一站式研究阅读工具</h3>

  <p align="center">
    <a href="#-核心功能">核心功能</a> ·
    <a href="#-下载安装">下载安装</a> ·
    <a href="#-快速上手指南">快速上手</a> ·
    <a href="#-支持的引用格式">引用格式</a> ·
    <a href="#-批量导出">批量导出</a> ·
    <a href="#-技术栈">技术栈</a>
  </p>
</div>

---

## 🎯 项目简介

**ScholarFlow** 是一款跨平台的桌面学术文献管理软件，专为研究人员和学生设计。从文献录入、PDF 阅读、笔记撰写，到一键生成规范引用、批量导出参考文献，ScholarFlow 覆盖学术研究的完整工作流。

本仓库为 **Windows 版本** (`ScholarFlow-Win/`)，所有数据存储在本地，无需账号、不上传云端。

> **最新版本 v1.3.1**：引用格式系统全面重构 — **6 种主流学术引用格式** 按官方规范实现，支持连字符名、多中间名、Early Access、文章号等高级场景。[查看更新日志 →](CHANGELOG.md)

---

## ✨ 核心功能

### 📖 文献管理

| 功能 | 说明 |
|------|------|
| **多方式录入** | DOI 自动获取元数据 · BibTeX 粘贴导入 · 手动录入 |
| **完整元数据** | 标题 · 作者 · 年份 · 期刊 / 出版社 · 卷 · 期 · 页码 · 文章号 · DOI |
| **组织分类** | 文件夹 (Folders) · 标签系统 (Tags) · 优先级 (高/中/低) · 截止日期 |
| **全文搜索** | 按标题、作者、标签快速检索 |

### 📝 PDF 阅读与笔记

| 功能 | 说明 |
|------|------|
| **内置 PDF 阅读器** | 基于 pdf.js，支持缩放、跳转、目录浏览 |
| **Markdown 笔记** | 支持 Markdown 语法，自动关联所属文献 |
| **笔记模板** | 创新点 · 方法论 · 批判性分析 · 文献综述 等预设模板 |
| **阅读计时器** | 记录每篇文献的阅读时长，培养专注阅读习惯 |
| **多笔记管理** | 每篇文献可关联多条笔记，按标签分类 |

### 📋 引用生成 (v1.3.1 全面升级)

ScholarFlow 的核心功能 — 根据每篇文献的元数据，按 6 种主流学术引用格式**一键生成规范引用**。

> 所有格式均依据官方规范：**APA 7th / MLA 9th / Chicago 17 / GB/T 7714-2015 / IEEE**

#### 支持的 6 种引用格式

| 格式 | 适用学科 | 输出示例 |
|------|---------|---------|
| **APA 7th** | 心理学 · 教育学 · 社科 | Smith, J., Brown, A., & Lee, C. (2024). Deep learning for natural language processing. Nature Machine Intelligence, 6(3), 245–258. https://doi.org/10.1038/s42256-024-00001 |
| **MLA 9th** | 文学 · 语言学 · 人文 | Smith, John, Alice Brown, and Charlie Lee. "Deep Learning for Natural Language Processing." Nature Machine Intelligence, vol. 6, no. 3, Mar. 2024, pp. 245–258. https://doi.org/10.1038/s42256-024-00001 |
| **Chicago Author-Date** | 社科 · 自然科学 | Smith, John, Alice Brown, and Charlie Lee. 2024. "Deep Learning for Natural Language Processing." Nature Machine Intelligence 6, no. 3 (March): 245–258. https://doi.org/10.1038/s42256-024-00001 |
| **Chicago Notes & Bibliography** | 历史 · 人文 | Smith, John, Alice Brown, and Charlie Lee. "Deep Learning for Natural Language Processing." Nature Machine Intelligence 6, no. 3 (March 2024): 245–258. https://doi.org/10.1038/s42256-024-00001 |
| **GB/T 7714-2015** | 中文学术 | SMITH J, BROWN A, LEE C. Deep learning for natural language processing[J]. Nature Machine Intelligence, 2024, 6(3): 245-258. https://doi.org/10.1038/s42256-024-00001 |
| **IEEE** | 工程 · 计算机科学 | [1] J. Smith, A. Brown, and C. Lee, "Deep learning for natural language processing," Nature Machine Intelligence, vol. 6, no. 3, pp. 245–258, Mar. 2024. doi: 10.1038/s42256-024-00001 |

#### 高级特性

- **连字符名支持**：`Bohm-Jung Yang` → `B.-J. Yang` (IEEE) / `Yang, B.-J.` (APA)
- **多中间名支持**：`Mohammad Saeed Bahramy` → `M. S. Bahramy`
- **Early Access 识别**：未分配卷期页码的论文自动标注 `Early Access`
- **文章号支持**：Nature Communications 等期刊使用 `Art. no. 1524` 替代页码
- **月份缩写**：自动转换数字月份为 `Feb.` / `March` 等格式
- **DOI URL 规范化**：纯 DOI `10.xxx/yyy` 自动补全为 `https://doi.org/10.xxx/yyy`
- **作者截断规则**：APA ≤20 全列 / ≥21 首 19+省略号+末位 · MLA >3 位用 `et al.` · GB/T >3 位列前 3 位+等
- **中文作者格式**：GB/T 保留中文全名；APA/MLA/IEEE 保持原样不做大写

### 📤 批量导出

支持 **4 种文件格式**将选中文献或整个书库导出为参考文献列表：

| 格式 | 扩展名 | 用途 |
|------|--------|------|
| **纯文本 TXT** | `.txt` | 粘贴到 Word、邮件等任意编辑器 |
| **Markdown** | `.md` | 放入 Notion、GitHub、GitBook 等支持 Markdown 的平台 |
| **Word HTML** | `.doc.html` | Microsoft Word / WPS 可直接打开的富文本 |
| **BibTeX** | `.bib` | LaTeX、Overleaf、Zotero、JabRef 等工具通用引用库格式 |

在文献详情页 / 文献库中，**Ctrl+点击多选** → 右键 "导出参考文献" → 选择格式即可。

### 🎨 自定义引用模板

除 6 种内置格式外，ScholarFlow 支持**自定义引用模板**（设置 → 引用 → 自定义格式）：

- 支持占位符：`{author}` `{year}` `{title}` `{journal}` `{volume}` `{issue}` `{pages}` `{doi}` `{publisher}`
- 支持斜体标记：`*{journal}*` → *Journal Name*
- 模板可编辑、删除、设为默认
- 重启后自动恢复，与文献数据一起存储

### 📊 数据分析仪表盘

- **阅读总时长**：累计阅读分钟数
- **文献数量**：已录入文献统计
- **笔记统计**：累计笔记条数
- **活动热力图**：直观展示阅读节奏
- **阅读进度**：可视化各文献的阅读状态

### 🌐 其他亮点

- **双语界面**：English / 简体中文一键切换，无需重启
- **深/浅色主题**：支持两种外观模式
- **多用户隔离**：支持不同用户独立数据存储
- **完整备份/恢复**：一键 JSON 导出导入
- **自动更新**：启动时检查 GitHub Release，发现新版本自动下载提示升级

---

## 📦 下载安装

### Windows 用户（推荐）

前往 [GitHub Releases](https://github.com/rdereq/ScholarFlow/releases) 下载最新版本安装程序：

```
📄 ScholarFlow-1.3.1-Setup.exe  ← 双击安装
```

首次启动后，**应用将自动检查后续更新**，发现新版本时一键升级即可。

---

## 🚀 快速上手指南

### 1️⃣ 录入第一篇文献

| 步骤 | 操作 |
|------|------|
| 1 | 左侧导航栏点击 **文献库** → 点击顶部 **+** 按钮 |
| 2 | 在对话框 **DOI 栏** 输入 `10.1038/s42256-024-00001` → 点击 "获取" |
| 3 | 系统自动填充标题、作者、期刊、年份等信息 |
| 4 | 点击 **保存** — 你的第一篇文献已入库 ✓ |

> 也可选择 **手动填写**、**粘贴 BibTeX** 或 **导入 PDF** 自动识别。

### 2️⃣ 阅读与笔记

1. 点击任意文献卡片 → 进入文献详情页
2. 点击 **📄 打开 PDF** → 内置阅读器打开
3. 点击 **📝 添加笔记** → 选择模板（如"创新点摘要"）→ 开始编写
4. 笔记自动关联到当前文献，可在文献详情页查看

### 3️⃣ 生成引用

**单条引用**（文献详情页）：
- 点击 **📋 复制引用** → 即复制当前格式的引用到剪贴板

**批量引用**（文献库页面）：
1. **Ctrl+点击** 选择多篇文献
2. 顶部导航栏 → **📤 导出全部**（或右键 → 导出参考文献列表）
3. 选择格式（如 APA 7th）→ 选择导出方式（TXT/MD/Word/BibTeX）→ 保存文件

### 4️⃣ 设置默认引用格式

进入 **设置** → **引用**，在"当前格式"下拉中选择你最常用的格式（如 APA 7th）。
后续所有 "复制引用" / "导出" 都会默认使用此格式。

---

## 🛠 开发者指南

### 从源码运行

```bash
# 克隆仓库
git clone https://github.com/rdereq/ScholarFlow.git
cd ScholarFlow/ScholarFlow-Win

# 安装依赖
npm install

# 启动 Electron 应用（开发模式）
npm start
```

### 构建安装包

```bash
cd ScholarFlow-Win
npm run build
# → 输出: dist/ScholarFlow-1.3.1-Setup.exe
```

### 项目结构

```
ScholarFlow-Win/
├── src/
│   ├── index.html                # 主页面（单页应用）
│   ├── main.js                   # Electron 主进程
│   ├── preload.js                # 预加载脚本（IPC Bridge）
│   ├── css/                      # 样式（Indigo 主题）
│   └── js/
│       ├── app.js                # 应用核心逻辑
│       ├── data.js               # 数据层
│       ├── crud.js               # CRUD 操作 & 状态管理
│       ├── i18n.js               # 国际化 (EN / 中文)
│       ├── updater.js            # 自动更新
│       ├── pdf-viewer.js         # PDF 阅读器
│       ├── citation/             # ⭐ 引用生成模块 (v1.3.1 核心)
│       │   ├── citation-author.js      # 作者名解析 & 格式化
│       │   ├── citation-formats.js     # 6 种引用格式实现
│       │   ├── citation-engine.js      # 统一引擎 / 注册表
│       │   ├── citation-export.js      # 4 种导出格式
│       │   ├── citation-templates.js   # 自定义引用模板
│       │   ├── citation-ui.js          # 引用对话框 & 面板 UI
│       │   └── language-detect.js      # 中英文自动检测
│       └── pages/                # 页面组件
│           ├── dashboard.js      # 数据仪表盘
│           ├── library.js        # 文献库
│           ├── detail.js         # 文献详情
│           ├── notes.js          # 笔记管理
│           └── settings.js       # 设置面板
├── package.json
├── CHANGELOG.md                  # 版本更新日志
└── README.md                     # 你正在看的这份文档
```

### 引用系统扩展

如需新增一种引用格式（如 ACS 或 Vancouver），只需在 [citation-formats.js](src/js/citation/citation-formats.js) 中：

1. 编写一个 `function formatYourFormat(item) → string`
2. 注册到 `window.CitationFormats['Your Format'] = formatYourFormat`
3. 自动出现在"设置 → 引用 → 当前格式"下拉中

---

## 🔧 技术栈

| 层级 | 技术 |
|------|------|
| **桌面框架** | [Electron](https://www.electronjs.org/) |
| **前端** | 原生 HTML5 + CSS3 + 原生 JavaScript（无框架依赖） |
| **存储** | [electron-store](https://github.com/sindresorhus/electron-store) (JSON 本地持久化) |
| **PDF 渲染** | [pdf.js](https://mozilla.github.io/pdf.js/) |
| **自动更新** | [electron-updater](https://www.electron.build/auto-update) |
| **构建打包** | [electron-builder](https://www.electron.build/) |
| **发布** | GitHub Releases |

---

## 📝 更新日志

详细的版本变更见 [CHANGELOG.md](CHANGELOG.md)，这里是最新一次重要更新：

> **v1.3.1** — 2026-06-13
>
> - ✅ **引用格式系统全面重构**：6 种主流学术引用格式按官方规范实现
> - ✅ **作者解析引擎升级**：连字符名、多中间名、Family,Given 格式、中文/英文混合
> - ✅ **批量导出增强**：TXT / Markdown / Word / BibTeX 四种格式
> - ✅ **38 项单元测试全部通过**
> - 🔧 修复 IEEE 双重编号、Early Access 识别、Art. no. 文章号支持

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

如果你在使用中发现某种期刊的引用格式不规范、或者期望新增某类格式（如 ACS、Vancouver、Nature 等），请附上示例元数据，我会优先处理。

---

## 📄 许可证

本项目采用 **MIT 许可证**，详见 [LICENSE](LICENSE)。

---

<div align="center">

### **ScholarFlow** — 让文献阅读更高效 · 让引用生成更简单

</div>
