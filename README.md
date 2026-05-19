# ScholarFlow 📚

> 学术文献阅读追踪器 - 管理您的研究文献、笔记和阅读进度

[English](README.md) | [中文](README_zh.md)

[![GitHub release](https://img.shields.io/github/v/release/rdereq/ScholarFlow?style=flat-square)](https://github.com/rdereq/ScholarFlow/releases)
[![License](https://img.shields.io/github/license/rdereq/ScholarFlow?style=flat-square)](LICENSE)

## ✨ 特性

### 📖 文献管理
- **多格式支持**: 添加 DOI 自动获取文献信息，支持 DOI、BibTeX、手动录入
- **元数据管理**: 标题、作者、年份、期刊、影响因子、 quartile、页数等
- **文件夹分类**: 使用文件夹组织文献
- **标签系统**: 使用标签标记文献主题
- **优先级设置**: 高/中/低优先级管理阅读计划
- **截止日期**: 设置阅读截止日期

### 📝 笔记系统
- **Markdown 笔记**: 强大的 Markdown 编辑器
- **模板支持**: 内置创新点、方法论、批判性分析等笔记模板
- **模板变量**: 自动填充文献标题、作者等信息
- **关联文献**: 笔记自动关联到对应文献

### 📊 数据分析
- **阅读统计**: 可视化您的阅读习惯
- **Dashboard**: 仪表盘展示阅读进度、统计数据
- **阅读计时器**: 记录阅读时长

### 🔄 自动更新
- **多更新源**: 支持 GitHub 官方源和镜像源（推荐国内用户）
- **自动检测**: 应用启动时自动检查更新
- **一键更新**: 发现新版本自动下载并提示安装
- **发布说明**: 更新时显示版本变更内容

### 🌐 国际化
- **多语言**: 支持英文和简体中文
- **实时切换**: 无需重启即可切换语言

### 🎨 界面设计
- **现代风格**: 使用 Playfair Display 和 Plus Jakarta Sans 字体
- **Indigo 主题**: 专业的品牌配色
- **深色/浅色**: 支持深色和浅色主题切换

### 💾 数据安全
- **本地存储**: 所有数据保存在本地
- **备份/恢复**: 支持数据完整备份和恢复
- **多用户**: 支持切换不同用户，数据隔离

## 📸 截图

*截图将在发布时添加*

## 🚀 快速开始

### 下载安装

从 [Releases](https://github.com/rdereq/ScholarFlow/releases) 页面下载最新版本的安装程序：

- **Windows**: `ScholarFlow-1.2.0-Setup.exe`

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
npm run build
```

构建完成后，安装包位于 `dist` 目录。

## 📖 使用指南

### 添加文献

1. 点击左侧 **+** 按钮添加新文献
2. 输入 DOI 并点击获取，或手动输入文献信息
3. 选择文件夹、标签，设置优先级
4. 点击保存

### 记笔记

1. 点击文献卡片进入详情页
2. 点击 **添加笔记** 按钮
3. 选择笔记模板或从空白开始
4. 编写笔记后点击保存

### 检查更新

1. 点击左下角 **设置** 图标
2. 在软件更新卡片中查看当前版本
3. 点击 **检查更新** 手动检查新版本

## 🔧 技术栈

- **框架**: [Electron](https://www.electronjs.org/)
- **前端**: HTML5, CSS3, JavaScript
- **存储**: [electron-store](https://github.com/electron-userland/electron-store)
- **PDF**: [pdf.js](https://mozilla.github.io/pdf.js/)
- **更新**: [electron-updater](https://www.electron.build.org/auto-update)
- **构建**: [electron-builder](https://www.electron.build/)

## 📝 项目结构

```
ScholarFlow-Win/
├── src/
│   ├── index.html          # 主页面
│   ├── main.js             # Electron 主进程
│   ├── preload.js          # 预加载脚本
│   └── js/
│       ├── app.js          # 应用核心
│       ├── data.js         # 数据层
│       ├── crud.js         # CRUD 操作
│       ├── i18n.js         # 国际化
│       ├── pdf.js          # PDF 阅读器
│       ├── updater.js      # 自动更新
│       └── pages/          # 页面组件
│           ├── dashboard.js
│           ├── literature.js
│           ├── notes.js
│           └── settings.js
├── package.json
└── electron-builder.yml
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

## 🙏 致谢

- [Electron](https://www.electronjs.org/) - 使用 Electron 框架
- [pdf.js](https://mozilla.github.io/pdf.js/) - PDF 渲染
- [electron-builder](https://www.electron.build/) - 打包工具
- [electron-updater](https://www.electron.build.org/auto-update) - 自动更新

---

**ScholarFlow** - 让文献阅读更高效
