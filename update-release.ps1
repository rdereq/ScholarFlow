# ScholarFlow Release 更新脚本 - 修复中文乱码
param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    
    [Parameter(Mandatory=$true)]
    [string]$ReleaseId
)

$ErrorActionPreference = "Stop"

# 设置 UTF-8 编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# Release 说明（中文）
$releaseBody = @"
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

下载 `ScholarFlow-1.3.0-Setup.exe` 运行安装程序。

支持 Windows 10/11 64位系统。
"@

# 创建 JSON 数据
$updateData = @{
    body = $releaseBody
} | ConvertTo-Json -Depth 3

# 将 JSON 写入文件（UTF-8 编码）
$jsonFile = "$env:TEMP\release_update.json"
[System.IO.File]::WriteAllText($jsonFile, $updateData, [System.Text.Encoding]::UTF8)

# 设置请求头
$headers = @{
    Authorization = "token $Token"
    Accept = "application/vnd.github.v3+json"
}

Write-Host "Updating release $ReleaseId..." -ForegroundColor Yellow

try {
    # 使用 -InFile 参数发送文件内容
    $response = Invoke-RestMethod `
        -Uri "https://api.github.com/repos/rdereq/ScholarFlow/releases/$ReleaseId" `
        -Method Patch `
        -Headers $headers `
        -InFile $jsonFile `
        -ContentType "application/json; charset=utf-8"
    
    Write-Host "✅ Release updated successfully!" -ForegroundColor Green
    Write-Host "Release URL: $($response.html_url)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to update release: $_" -ForegroundColor Red
    exit 1
} finally {
    # 清理临时文件
    if (Test-Path $jsonFile) {
        Remove-Item $jsonFile -Force
    }
}
