# ScholarFlow

> 专为研究人员、学者和学生设计的文献阅读追踪软件

[English](#english) | [中文](#中文)

---

## 中文

### 📖 简介

**ScholarFlow** 是一款专为学术研究人员设计的文献阅读追踪软件，帮助用户系统化管理学术文献、追踪阅读进度、记录研究笔记，并提供详细的阅读统计分析。

### ✨ 主要功能

| 功能 | 描述 |
|------|------|
| 📚 **文献管理** | 添加、编辑、分类管理学术文献 |
| 📊 **阅读追踪** | 记录阅读进度、时间和状态 |
| 📝 **笔记系统** | 支持 Markdown 格式的研究笔记 |
| 📈 **统计分析** | 可视化阅读数据和趋势 |
| 👥 **多用户支持** | 独立用户数据隔离 |
| 💾 **数据备份** | JSON 格式导出与恢复 |
| 🌐 **中英文界面** | 一键切换语言 |

### 🖥️ 系统要求

- **操作系统**: Windows 10/11 (64位)
- **内存**: 建议 4GB 以上
- **磁盘空间**: 至少 200MB 可用空间

### 🚀 安装与使用

#### 安装步骤

1. 下载 `ScholarFlow-1.0.0-Setup.exe` 安装程序
2. 双击运行，选择安装目录
3. 选择是否创建桌面快捷方式
4. 点击安装完成
5. 双击桌面图标启动软件

#### 界面布局

- **侧边栏**: Logo、主导航（仪表盘/文献库/笔记/统计）、用户管理、语言/主题切换
- **顶部栏**: 全局搜索、添加文献按钮
- **内容区**: 根据导航显示对应功能页面

### 📚 核心功能详解

#### 1. 仪表盘
- 统计卡片：文献总数、完成率、本周阅读、总阅读时长
- 阅读状态分布饼图
- 逾期提醒与周目标进度

#### 2. 文献库
- 添加文献：标题、作者、期刊、年份、DOI、摘要等
- 筛选排序：状态、优先级、文件夹、标签
- 阅读进度追踪

#### 3. 文献详情
- 元数据编辑
- 阅读进度调节（总体进度 + IMRAD 各部分进度）
- 阅读计时器
- Markdown 笔记支持
- PDF 阅读器集成

#### 4. 笔记管理
- 集中管理所有研究笔记
- 预设模板：空白、核心创新、研究方法、批判分析
- Markdown 语法支持

#### 5. 统计分析
- 月度阅读趋势图
- 阅读热力图（90天）
- 完成漏斗分析
- 连续阅读天数与里程碑

#### 6. 设置
- 阅读目标设置（日/周/月）
- 文件夹管理
- 数据备份与导出（JSON/BibTeX/Markdown）
- 数据导入恢复

### 👥 多用户管理

- 每个用户拥有独立数据空间
- 支持创建、切换、删除用户
- 数据完全隔离

### ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + F` | 聚焦搜索框 |
| `Ctrl + N` | 添加新文献 |
| `Ctrl + S` | 保存当前编辑 |
| `Esc` | 关闭弹窗/取消编辑 |
| `← / →` | PDF 上一页/下一页 |
| `+ / -` | PDF 放大/缩小 |
| `F11` | PDF 全屏 |

### 💾 数据备份

- **备份**: 设置 → 完整备份（JSON）→ 选择保存位置
- **恢复**: 设置 → 导入备份 → 选择 JSON 文件
- 建议定期备份，可在不同电脑间迁移数据

---

## English

### 📖 Introduction

**ScholarFlow** is a literature reading tracking software designed for academic researchers, scholars, and students. It helps users systematically manage academic literature, track reading progress, record research notes, and provide detailed reading statistics.

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| 📚 **Literature Management** | Add, edit, and categorize academic papers |
| 📊 **Reading Tracking** | Track reading progress, time, and status |
| 📝 **Note System** | Markdown-supported research notes |
| 📈 **Statistics** | Visual reading data and trends |
| 👥 **Multi-User** | Independent user data isolation |
| 💾 **Data Backup** | JSON export and restore |
| 🌐 **Bilingual UI** | One-click language switch |

### 🖥️ System Requirements

- **OS**: Windows 10/11 (64-bit)
- **RAM**: 4GB+ recommended
- **Storage**: At least 200MB free space

### 🚀 Installation

1. Download `ScholarFlow-1.0.0-Setup.exe`
2. Run the installer and select installation directory
3. Choose whether to create desktop shortcut
4. Complete installation
5. Launch from desktop icon

### ⌨️ Keyboard Shortcuts

| Shortcut | Function |
|----------|----------|
| `Ctrl + F` | Focus search box |
| `Ctrl + N` | Add new paper |
| `Ctrl + S` | Save current edit |
| `Esc` | Close modal/Cancel edit |
| `← / →` | PDF previous/next page |
| `+ / -` | PDF zoom in/out |
| `F11` | PDF fullscreen |

---

## 🛠️ Development

### Tech Stack

- **Framework**: Electron
- **Frontend**: HTML, CSS, JavaScript
- **Storage**: electron-store (JSON-based)

### Build from Source

```bash
# Clone repository
git clone https://github.com/rdereq/ScholarFlow.git
cd ScholarFlow

# Install dependencies
npm install

# Run in development mode
npm start

# Build for Windows
npm run build
```

### Project Structure

```
ScholarFlow/
├── main.js              # Electron main process
├── package.json         # Project configuration
├── src/
│   ├── index.html       # Main HTML entry
│   ├── styles.css       # Global styles
│   ├── preload.js       # Preload script
│   ├── js/
│   │   ├── app.js       # Main application logic
│   │   ├── crud.js      # CRUD operations
│   │   ├── data.js      # Data management
│   │   ├── i18n.js      # Internationalization
│   │   ├── pdf.js       # PDF viewer
│   │   ├── updater.js   # Auto-updater
│   │   ├── utils.js     # Utilities
│   │   └── pages/       # Page modules
│   └── assets/          # Icons and images
└── dist/                # Build output (excluded from git)
```

---

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📧 Contact

For questions or suggestions, please visit the [GitHub Issues](https://github.com/rdereq/ScholarFlow/issues) page.

---

**Version**: 1.0.0  
**Last Updated**: May 2026
