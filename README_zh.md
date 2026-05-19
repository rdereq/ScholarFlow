# ScholarFlow 📚

> 学术文献阅读追踪器 - 管理您的研究文献、笔记和阅读进度

[![GitHub release](https://img.shields.io/github/v/release/rdereq/ScholarFlow?style=flat-square)](https://github.com/rdereq/ScholarFlow/releases)
[![License](https://img.shields.io/github/license/rdereq/ScholarFlow?style=flat-square)](LICENSE)

[English](README.md) | **中文**

## ✨ 功能特性

### 📖 文献管理
- **DOI 自动获取**: 输入 DOI 自动填充文献信息
- **多格式导入**: 支持 DOI、BibTeX、手动录入
- **完整元数据**: 标题、作者、年份、期刊、影响因子、Quartile、页数
- **文件夹分类**: 使用文件夹组织文献
- **标签系统**: 使用标签标记文献主题
- **优先级管理**: 高/中/低优先级管理阅读计划
- **截止日期**: 设置阅读截止日期

### 📝 笔记系统
- **Markdown 编辑器**: 强大的 Markdown 支持
- **笔记模板**: 内置创新点、方法论、批判性分析等模板
- **自动填充**: 模板自动关联文献标题、作者等信息
- **文献关联**: 笔记自动关联到对应文献

### 📊 数据分析
- **阅读统计**: 可视化阅读习惯和进度
- **仪表盘**: Dashboard 展示阅读数据概览
- **阅读计时器**: 记录阅读时长

### 🔄 自动更新
- **静默检测**: 启动时自动检查新版本
- **一键更新**: 发现新版本自动下载并提示安装
- **版本说明**: 更新时显示详细的版本变更内容

### 🌐 国际化
- **双语言**: 支持英文和简体中文
- **实时切换**: 无需重启即可切换语言

### 🎨 界面设计
- **现代风格**: Playfair Display + Plus Jakarta Sans 字体组合
- **Indigo 主题**: 专业优雅的品牌配色
- **深色/浅色**: 支持深色和浅色主题

### 💾 数据安全
- **本地存储**: 所有数据保存在本地，隐私安全
- **备份/恢复**: 一键备份和恢复数据
- **多用户**: 支持多用户切换，数据隔离

## 📸 截图

*截图将在后续版本中添加*

## 🚀 快速开始

### 下载安装

从 [Releases](https://github.com/rdereq/ScholarFlow/releases) 下载最新版本：

| 平台 | 文件 | 说明 |
|------|------|------|
| Windows | `ScholarFlow-1.1.0-Setup.exe` | Windows 安装包 |

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

## 📖 使用指南

### 添加文献

1. 点击左侧 **+** 按钮打开添加文献面板
2. 选择输入方式：
   - **DOI 获取**: 输入 DOI 后点击获取按钮自动填充信息
   - **手动录入**: 填写文献信息
   - **BibTeX**: 粘贴 BibTeX 格式内容导入
3. 选择文件夹、添加标签、设置优先级
4. 点击保存

### 记笔记

1. 点击文献卡片进入文献详情页
2. 点击 **添加笔记** 按钮
3. 选择笔记模板或从空白开始
4. 编写笔记内容
5. 点击保存

### 检查更新

1. 点击左下角 **设置** 图标
2. 在软件更新卡片中查看当前版本
3. 点击 **检查更新** 手动检查

## 🔧 技术栈

| 技术 | 用途 |
|------|------|
| [Electron](https://www.electronjs.org/) | 桌面应用框架 |
| HTML5/CSS3/JS | 前端界面 |
| [electron-store](https://github.com/electron-userland/electron-store) | 本地数据存储 |
| [pdf.js](https://mozilla.github.io/pdf.js/) | PDF 文件渲染 |
| [electron-updater](https://www.electron.build.org/auto-update) | 自动更新功能 |
| [electron-builder](https://www.electron.build/) | 应用打包发布 |

## 📁 项目结构

```
ScholarFlow-Win/
├── src/
│   ├── index.html          # 主页面 HTML
│   ├── main.js             # Electron 主进程
│   ├── preload.js          # 预加载脚本（IPC 桥接）
│   └── js/
│       ├── app.js          # 应用核心逻辑
│       ├── data.js         # 数据层和工具函数
│       ├── crud.js         # 文献和笔记 CRUD 操作
│       ├── i18n.js         # 国际化（英/中）
│       ├── pdf.js          # PDF 阅读器模块
│       ├── updater.js      # 自动更新 UI 模块
│       └── pages/          # 页面组件
│           ├── dashboard.js  # 仪表盘
│           ├── literature.js # 文献列表
│           ├── notes.js      # 笔记页面
│           └── settings.js   # 设置页面
├── package.json
├── electron-builder.yml
└── README.md
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 开源许可证

本项目采用 [MIT 许可证](LICENSE)。

---

**ScholarFlow** - 让文献阅读更高效 🖋️
