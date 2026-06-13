# ScholarFlow v1.3.0 Release 上传脚本
# 使用方法：在 PowerShell 中运行此脚本

$ErrorActionPreference = "Stop"

# 配置
$version = "v1.3.0"
$repo = "rdereq/ScholarFlow"
$setupFile = "C:\Users\123\Desktop\ScholarFlow\ScholarFlow-Win\dist\ScholarFlow-1.3.0-Setup.exe"

# 检查文件是否存在
if (-not (Test-Path $setupFile)) {
    Write-Error "安装程序不存在: $setupFile"
    Write-Host "请先运行打包命令: npx electron-builder --win --x64"
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ScholarFlow $version Release 上传工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 gh CLI
$ghPath = ""
if (Get-Command gh -ErrorAction SilentlyContinue) {
    $ghPath = "gh"
} elseif (Test-Path "$env:TEMP\gh\bin\gh.exe") {
    $ghPath = "$env:TEMP\gh\bin\gh.exe"
} else {
    Write-Host "正在下载 GitHub CLI..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri 'https://github.com/cli/cli/releases/download/v2.67.0/gh_2.67.0_windows_amd64.zip' -OutFile "$env:TEMP\gh.zip"
    Expand-Archive "$env:TEMP\gh.zip" -DestinationPath "$env:TEMP\gh" -Force
    $ghPath = "$env:TEMP\gh\bin\gh.exe"
}

Write-Host "GitHub CLI: $ghPath" -ForegroundColor Gray
& $ghPath --version
Write-Host ""

# 检查认证状态
Write-Host "检查 GitHub 认证状态..." -ForegroundColor Yellow
$authStatus = & $ghPath auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "需要登录 GitHub" -ForegroundColor Yellow
    Write-Host "请在弹出的浏览器中完成认证..." -ForegroundColor Cyan
    & $ghPath auth login --web
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "GitHub 登录失败"
        exit 1
    }
}

Write-Host "GitHub 认证通过!" -ForegroundColor Green
Write-Host ""

# Release 说明
$releaseNotes = @"
## 🆕 新增：参考文献引用生成

### 6 种引用格式支持
- **APA 7th** - 美国心理学会格式，社科领域标准
- **MLA 9th** - 现代语言协会格式，人文领域标准
- **Chicago 17th（作者-日期）** - 芝加哥格式变体
- **Chicago 17th（注释-书目）** - 传统芝加哥格式
- **GB/T 7714-2015** - 中国国家标准，中英文自动切换
- **IEEE** - 电气电子工程师学会格式，工程领域标准

### 主要功能
- 📋 **一键复制引用**：选中文献后一键复制引用到剪贴板，绿色 toast 提示
- 📤 **批量导出**：导出全部文献引用为 .txt 文件
- 🎯 **格式快速切换**：下拉菜单切换格式，偏好自动保存
- ⌨️ **Ctrl+多选**：按住 Ctrl/⌘ 点击文献卡片可多选
- 🖱️ **右键菜单**：右键生成引用或导出参考文献列表
- 🛡️ **缺值容错**：智能处理缺失数据，不崩溃

### 🔧 修复与优化
- 安全性增强：生产版本隐藏 F12 开发者工具、Ctrl+R 重新加载
- 代码清理：移除 8 个开发测试文件
- PDF 查看器：移除约 30 行调试诊断日志
- 废弃代码清理

### 📝 暂存功能
- PDF 标注功能暂时禁用，将在后续版本重新开发

## 安装说明

1. 下载 `ScholarFlow-1.3.0-Setup.exe`
2. 双击运行安装程序
3. 按向导完成安装

**系统要求**: Windows 10/11 64位

## 校验信息

- 文件: ScholarFlow-1.3.0-Setup.exe
- 大小: $([math]::Round((Get-Item $setupFile).Length / 1MB, 2)) MB
- SHA256: $((Get-FileHash $setupFile -Algorithm SHA256).Hash)
"@

# 检查 Release 是否已存在
Write-Host "检查 Release $version 是否存在..." -ForegroundColor Yellow
$existingRelease = & $ghPath release view $version --repo $repo 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Release $version 已存在!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请选择操作:" -ForegroundColor Cyan
    Write-Host "1. 删除现有 Release 并重新创建"
    Write-Host "2. 仅上传/更新安装包"
    Write-Host "3. 取消"
    
    $choice = Read-Host "请输入选项 (1-3)"
    
    switch ($choice) {
        "1" {
            Write-Host "删除现有 Release..." -ForegroundColor Yellow
            & $ghPath release delete $version --repo $repo --yes
            if ($LASTEXITCODE -ne 0) {
                Write-Error "删除 Release 失败"
                exit 1
            }
            # 继续创建新 Release
        }
        "2" {
            Write-Host "上传安装包到现有 Release..." -ForegroundColor Yellow
            & $ghPath release upload $version $setupFile --repo $repo --clobber
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "========================================" -ForegroundColor Green
                Write-Host "上传成功!" -ForegroundColor Green
                Write-Host "========================================" -ForegroundColor Green
                Write-Host ""
                Write-Host "Release URL: https://github.com/$repo/releases/tag/$version" -ForegroundColor Cyan
            } else {
                Write-Error "上传失败"
                exit 1
            }
            exit 0
        }
        default {
            Write-Host "操作已取消" -ForegroundColor Yellow
            exit 0
        }
    }
}

# 创建 Release
Write-Host ""
Write-Host "创建 Release $version..." -ForegroundColor Yellow
$tempNotesFile = [System.IO.Path]::GetTempFileName()
$releaseNotes | Out-File -FilePath $tempNotesFile -Encoding UTF8

& $ghPath release create $version `
    --repo $repo `
    --title "ScholarFlow v1.3.0" `
    --notes-file $tempNotesFile `
    --target main `
    $setupFile

Remove-Item $tempNotesFile

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Release 创建成功!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "版本: $version" -ForegroundColor White
    Write-Host "文件: ScholarFlow-1.3.0-Setup.exe" -ForegroundColor White
    Write-Host "大小: $([math]::Round((Get-Item $setupFile).Length / 1MB, 2)) MB" -ForegroundColor White
    Write-Host ""
    Write-Host "Release URL:" -ForegroundColor Cyan
    Write-Host "https://github.com/$repo/releases/tag/$version" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Error "Release 创建失败"
    exit 1
}
