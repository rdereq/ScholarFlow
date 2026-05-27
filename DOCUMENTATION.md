# ScholarFlow 完整文档

> 学术文献阅读追踪器 - 管理您的研究文献、笔记和阅读进度

[![GitHub release](https://img.shields.io/github/v/release/rdereq/ScholarFlow?style=flat-square)](https://github.com/rdereq/ScholarFlow/releases)
[![License](https://img.shields.io/github/license/rdereq/ScholarFlow?style=flat-square)](LICENSE)

---

## 目录

1. [项目简介](#项目简介)
2. [功能特性](#功能特性)
3. [快速开始](#快速开始)
4. [使用指南](#使用指南)
5. [更新日志](#更新日志)
6. [技术栈](#技术栈)
7. [项目结构](#项目结构)
8. [开发指南](#开发指南)
9. [贡献指南](#贡献指南)
10. [许可证](#许可证)

---

## 项目简介

ScholarFlow 是一款专为学术研究者设计的文献阅读追踪工具。它帮助您：

- 📚 **管理文献**：集中管理您的研究文献库
- 📝 **记录笔记**：为每篇文献编写结构化笔记
- 📊 **追踪进度**：可视化您的阅读习惯和进度
- 🔄 **自动更新**：保持软件始终最新

### 核心优势

- **本地存储**：所有数据保存在本地，保护隐私
- **多语言支持**：中英文界面自由切换
- **现代化界面**：优雅的 Indigo 主题设计
- **开源免费**：MIT 许可证，永久免费使用

---

## 功能特性

### 📖 文献管理

| 功能 | 说明 |
|------|------|
| **DOI 自动获取** | 输入 DOI 自动填充文献信息（标题、作者、期刊等） |
| **多格式导入** | 支持 DOI、BibTeX、手动录入 |
| **完整元数据** | 标题、作者、年份、期刊、影响因子、Quartile、页数 |
| **文件夹分类** | 使用文件夹组织文献 |
| **标签系统** | 使用标签标记文献主题 |
| **优先级管理** | 高/中/低优先级管理阅读计划 |
| **截止日期** | 设置阅读截止日期 |

### 📝 笔记系统

- **Markdown 编辑器**：强大的 Markdown 支持
- **笔记模板**：内置创新点、方法论、批判性分析等模板
- **自动填充**：模板自动关联文献标题、作者等信息
- **文献关联**：笔记自动关联到对应文献

### 📊 数据分析

- **阅读统计**：可视化阅读习惯和进度
- **仪表盘**：Dashboard 展示阅读数据概览
- **阅读计时器**：记录阅读时长

### 🔄 自动更新

- **多更新源**：支持 GitHub 官方源和镜像源（推荐国内用户）
- **静默检测**：启动时自动检查新版本
- **一键更新**：发现新版本自动下载并提示安装
- **版本说明**：更新时显示详细的版本变更内容

### 🌐 国际化

- **双语言**：支持英文和简体中文
- **实时切换**：无需重启即可切换语言

### 🎨 界面设计

- **现代风格**：Playfair Display + Plus Jakarta Sans 字体组合
- **Indigo 主题**：专业优雅的品牌配色
- **深色/浅色**：支持深色和浅色主题

### 💾 数据安全

- **本地存储**：所有数据保存在本地，隐私安全
- **备份/恢复**：一键备份和恢复数据
- **多用户**：支持多用户切换，数据隔离

---

## 快速开始

### 系统要求

- **操作系统**：Windows 10/11 64位
- **内存**：4GB RAM 或更高
- **存储**：500MB 可用空间

### 下载安装

从 [Releases](https://github.com/rdereq/ScholarFlow/releases) 下载最新版本：

| 平台 | 文件 | 说明 |
|------|------|------|
| Windows | `ScholarFlow-1.3.0-Setup.exe` | Windows 安装包 |

**安装步骤**：

1. 下载安装程序
2. 双击运行 `ScholarFlow-1.3.0-Setup.exe`
3. 按安装向导完成安装
4. 从开始菜单或桌面快捷方式启动应用

### 从源码运行

```bash
# 克隆仓库
git clone https://github.com/rdereq/ScholarFlow.git
cd ScholarFlow/ScholarFlow-Win

# 安装依赖
npm install

# 启动开发服务器
npm start
```

### 构建安装包

```bash
# 安装依赖
npm install

# 构建 Windows 安装包
npm run build
```

构建完成后，安装包位于 `dist` 目录。

---

## 使用指南

### 首次使用

1. **创建用户**：首次启动时创建您的用户账户
2. **选择主题**：选择深色或浅色主题
3. **选择语言**：选择界面语言（中文/英文）

### 添加文献

1. 点击左侧 **+** 按钮打开添加文献面板
2. 选择输入方式：
   - **DOI 获取**：输入 DOI 后点击获取按钮自动填充信息
   - **手动录入**：填写文献信息
   - **BibTeX**：粘贴 BibTeX 格式内容导入
3. 选择文件夹、添加标签、设置优先级
4. 点击保存

### 阅读文献

1. 点击文献卡片进入文献详情页
2. 点击 **阅读** 按钮打开 PDF 阅读器
3. 使用阅读计时器记录阅读时长
4. 阅读完成后标记为已读

### 记笔记

1. 点击文献卡片进入文献详情页
2. 点击 **添加笔记** 按钮
3. 选择笔记模板或从空白开始
4. 编写笔记内容
5. 点击保存

### 生成引用

1. 进入 Library 页面
2. 选中文献（支持 Ctrl/⌘ 多选）
3. 点击顶栏 **📋 复制引用** 按钮
4. 选择引用格式（APA/MLA/Chicago/GB/T 7714/IEEE）
5. 引用自动复制到剪贴板

### 数据备份

1. 点击左下角 **设置** 图标
2. 选择 **数据管理**
3. 点击 **导出备份** 保存数据文件
4. 需要时点击 **导入备份** 恢复数据

### 检查更新

1. 点击左下角 **设置** 图标
2. 在软件更新卡片中查看当前版本
3. 点击 **检查更新** 手动检查
4. 发现新版本后按提示下载安装

---

## 更新日志

### [1.3.0] - 2025-01-27

#### 🆕 新增：参考文献引用生成

**6 种引用格式支持**：
- **APA 7th** - 美国心理学会格式，社科领域标准
- **MLA 9th** - 现代语言协会格式，人文领域标准
- **Chicago 17th（作者-日期）** - 芝加哥格式变体
- **Chicago 17th（注释-书目）** - 传统芝加哥格式
- **GB/T 7714-2015** - 中国国家标准，中英文自动切换
- **IEEE** - 电气电子工程师学会格式，工程领域标准

**主要功能**：
- 📋 **一键复制引用**：选中文献后一键复制引用到剪贴板
- 📤 **批量导出**：导出全部文献引用为 .txt 文件
- 🎯 **格式快速切换**：下拉菜单切换格式，偏好自动保存
- ⌨️ **Ctrl+多选**：按住 Ctrl/⌘ 点击文献卡片可多选
- 🖱️ **右键菜单**：右键生成引用或导出参考文献列表
- 🛡️ **缺值容错**：智能处理缺失数据，不崩溃

#### 🔧 修复与优化

- **安全性增强**：生产版本隐藏 F12 开发者工具、Ctrl+R 重新加载
- **代码清理**：移除 8 个开发测试文件
- **PDF 查看器**：移除约 30 行调试诊断日志
- **废弃代码清理**

#### 📝 暂存功能

- PDF 标注功能暂时禁用，将在后续版本重新开发

### [1.2.0] - 2024-12-15

- 多用户支持：创建、切换、删除用户配置
- 用户头像颜色自定义
- 用户数据隔离
- 自动更新源配置优化
- 镜像源支持（国内用户友好）

### [1.1.0] - 2024-11-20

- DOI 自动获取文献元数据
- 多源查询：CrossRef、Semantic Scholar、OpenAlex
- 期刊影响因子和分区自动填充
- BibTeX 导入稳定性修复
- 数据保存性能优化

### [1.0.0] - 2024-10-01

- 文献阅读追踪核心功能
- 笔记管理
- 阅读统计
- 多语言支持（中/英）
- 明暗主题切换

---

## 技术栈

| 技术 | 用途 |
|------|------|
| [Electron](https://www.electronjs.org/) | 桌面应用框架 |
| HTML5/CSS3/JS | 前端界面 |
| [electron-store](https://github.com/electron-userland/electron-store) | 本地数据存储 |
| [pdf.js](https://mozilla.github.io/pdf.js/) | PDF 文件渲染 |
| [electron-updater](https://www.electron.build.org/auto-update) | 自动更新功能 |
| [electron-builder](https://www.electron.build/) | 应用打包发布 |

---

## 项目结构

```
ScholarFlow-Win/
├── src/
│   ├── index.html          # 主页面 HTML
│   ├── main.js             # Electron 主进程
│   ├── preload.js          # 预加载脚本（IPC 桥接）
│   ├── styles.css          # 全局样式
│   └── js/
│       ├── app.js          # 应用核心逻辑
│       ├── data.js         # 数据层和工具函数
│       ├── crud.js         # 文献和笔记 CRUD 操作
│       ├── i18n.js         # 国际化（英/中）
│       ├── pdf.js          # PDF 阅读器模块
│       ├── updater.js      # 自动更新 UI 模块
│       ├── utils.js        # 通用工具函数
│       └── pages/          # 页面组件
│           ├── dashboard.js    # 仪表盘
│           ├── literature.js   # 文献列表
│           ├── library.js      # 文献库（引用功能）
│           ├── notes.js        # 笔记页面
│           └── settings.js     # 设置页面
├── assets/                 # 静态资源
├── dist/                   # 构建输出目录
├── package.json
├── electron-builder.yml
├── CHANGELOG.md            # 更新日志
├── README.md               # 英文说明
├── README_zh.md            # 中文说明
└── LICENSE                 # MIT 许可证
```

---

## 开发指南

### 环境准备

- Node.js 18.x 或更高版本
- npm 9.x 或更高版本
- Git

### 开发命令

```bash
# 安装依赖
npm install

# 启动开发模式（热重载）
npm start

# 运行代码检查
npm run lint

# 构建应用
npm run build

# 打包（仅生成，不发布）
npx electron-builder --win --x64 --dir --publish never
```

### 镜像配置（国内用户）

如果遇到下载 Electron 缓慢，可以设置镜像：

```powershell
# PowerShell
$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
$env:ELECTRON_BUILDER_BINARIES_MIRROR='https://npmmirror.com/mirrors/electron-builder-binaries/'
```

### 发布流程

1. 更新 `package.json` 中的版本号
2. 更新 `CHANGELOG.md`
3. 提交代码：`git commit -m "release: v1.x.x"`
4. 创建标签：`git tag v1.x.x`
5. 推送标签：`git push origin v1.x.x`
6. GitHub Actions 自动构建并发布 Release

---

## 贡献指南

欢迎提交 Issue 和 Pull Request！

### 提交 Issue

- 描述问题时请提供复现步骤
- 附上错误截图或日志
- 说明您的操作系统和软件版本

### 提交 Pull Request

1. Fork 本仓库
2. 创建您的特性分支：`git checkout -b feature/my-feature`
3. 提交更改：`git commit -m 'feat: add some feature'`
4. 推送到分支：`git push origin feature/my-feature`
5. 创建 Pull Request

### 代码规范

- 使用 ESLint 检查代码
- 遵循现有代码风格
- 添加必要的注释
- 更新相关文档

---

## 许可证

本项目采用 [MIT 许可证](LICENSE)。

```
MIT License

Copyright (c) 2024-2025 ScholarFlow Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 致谢

- [Electron](https://www.electronjs.org/) - 使用 Electron 框架
- [pdf.js](https://mozilla.github.io/pdf.js/) - PDF 渲染
- [electron-builder](https://www.electron.build/) - 打包工具
- [electron-updater](https://www.electron.build.org/auto-update) - 自动更新

---

## 联系方式

- **GitHub**: https://github.com/rdereq/ScholarFlow
- **Issues**: https://github.com/rdereq/ScholarFlow/issues
- **Releases**: https://github.com/rdereq/ScholarFlow/releases

---

**ScholarFlow** - 让文献阅读更高效 🖋️

*最后更新：2025-01-27*
