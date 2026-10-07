<#
  setup-remote.ps1 — 把本地代码库连接到 GitHub 远程仓库

  用途：本机当前没有安装 Git，且沙箱环境阻断了 TLS，本脚本用于在
  解除限制后（或由你在自己的终端里）完成：装 Git → 初始化仓库 →
  连接远程 → 推送。

  用法：
    # 方式一：交互式，会提示你粘贴 token
    pwsh -NoProfile -File .\setup-remote.ps1

    # 方式二：直接传入 token
    pwsh -NoProfile -File .\setup-remote.ps1 -Token 'github_pat_xxx'

  安全说明：
    token 不会被写进脚本、仓库或 .git/config 的远程地址。脚本用
    Git Credential Manager 把它存进 Windows 凭据管理器，之后 git
    操作会自动取用，无需重复输入。
#>

[CmdletBinding()]
param(
    [string]$Token,
    [string]$RepoUrl = 'https://github.com/cyanmaple1009-ai/dreamlab.git',
    [string]$Branch  = 'main',
    [string]$UserName = 'cyanmaple1009-ai',
    [string]$UserEmail = ''
)

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Warn2($msg){ Write-Host "    !!  $msg" -ForegroundColor Yellow }

# ---------------------------------------------------------------- 1. 检查 Git
Write-Step '检查 Git 是否可用'

function Get-GitExe {
    $cmd = Get-Command git -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($p in @(
        'C:\Program Files\Git\cmd\git.exe',
        'C:\Program Files (x86)\Git\cmd\git.exe',
        "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
    )) { if (Test-Path $p) { return $p } }
    return $null
}

$git = Get-GitExe

if (-not $git) {
    Write-Warn2 '未找到 Git，尝试用 winget 安装'
    $wg = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $wg) {
        throw '本机没有 winget，无法自动安装。请手动安装 Git：https://git-scm.com/download/win'
    }
    winget install --id Git.Git -e --source winget `
        --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
        throw "winget 安装失败（退出码 $LASTEXITCODE）。若报错含网络或 TLS 字样，说明当前环境仍有网络限制；请在普通终端里手动安装，或把本会话切到完全权限后重试。"
    }
    $git = Get-GitExe
    if (-not $git) { throw '处理完成，但未检测到 git.exe。请重开一个终端后重试。' }
}
Write-Ok "git: $git"
& $git --version

# ------------------------------------------------- 2. 校验远程可达 + 认证
Write-Step '校验远程仓库可达性与凭证'

if (-not $Token) {
    $secure = Read-Host -Prompt '请粘贴 GitHub token（输入不回显）' -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try   { $Token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

if ([string]::IsNullOrWhiteSpace($Token)) { throw 'token 为空，已中止。' }

# 用 base64 组装 Authorization 头，避免 token 出现在命令行参数里
$pair   = "x-access-token:$Token"
$b64    = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
$apiUrl = $RepoUrl -replace '^https://github\.com/', 'https://api.github.com/repos/' -replace '\.git$', ''

try {
    $resp = Invoke-RestMethod -Uri $apiUrl -Headers @{ Authorization = "Basic $b64" } `
                              -UserAgent 'dreamlab-setup' -TimeoutSec 30
    Write-Ok "远程仓库确认存在：$($resp.full_name)（私有：$($resp.private)）"
} catch {
    $code = $null
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    switch ($code) {
        401 { throw 'token 无效或已过期（401）。请重新生成。' }
        403 { throw 'token 权限不足（403）。需要该仓库的 Contents: Read and write。' }
        404 { throw '仓库未找到（404）。请确认仓库名与 token 的仓库授权范围是否包含 dreamlab。' }
        default { throw "远程校验失败：$($_.Exception.Message)" }
    }
}

# ------------------------------------------------------- 3. 初始化本地仓库
Write-Step '初始化本地仓库'

if (Test-Path (Join-Path $PWD '.git')) {
    Write-Warn2 '当前目录已是 Git 仓库，跳过 init'
} else {
    & $git init -b $Branch
    Write-Ok "已初始化，默认分支 $Branch"
}

if ($UserEmail) {
    & $git config user.name  $UserName
    & $git config user.email $UserEmail
    Write-Ok "提交身份：$UserName <$UserEmail>"
} else {
    $curName  = & $git config user.name
    $curEmail = & $git config user.email
    if (-not $curName -or -not $curEmail) {
        Write-Warn2 '尚未配置提交身份。首次提交前请先执行：'
        Write-Host "        git config user.name  `"你的名字`"" -ForegroundColor Gray
        Write-Host "        git config user.email `"你的邮箱`"" -ForegroundColor Gray
    } else {
        Write-Ok "提交身份：$curName <$curEmail>"
    }
}

# ------------------------------------------------------ 4. 配置凭证存储
Write-Step '配置凭证存储（Git Credential Manager）'

& $git config --global credential.helper manager
if ($LASTEXITCODE -eq 0) {
    Write-Ok 'credential.helper = manager（token 存入 Windows 凭据管理器）'
} else {
    Write-Warn2 '无法启用 manager，改用 store 作为回退'
    & $git config --global credential.helper store
}

# 写入凭据，后续 git 操作自动使用，无需重复输入
$gcm = 'C:\Program Files\Git\mingw64\bin\git-credential-manager.exe'
if (-not (Test-Path $gcm)) {
    $gcm = (Get-ChildItem 'C:\Program Files\Git' -Filter 'git-credential-manager*.exe' `
            -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
}
if ($gcm) {
    "protocol=https`nhost=github.com`nusername=x-access-token`npassword=$Token`n" |
        & $gcm store 2>$null
    Write-Ok '凭证已写入 Windows 凭据管理器'
} else {
    Write-Warn2 '未找到 git-credential-manager，将在首次推送时提示输入'
}

# ------------------------------------------------------ 5. 连接远程仓库
Write-Step '连接远程仓库'

$existing = & $git remote
if ($existing -contains 'origin') {
    & $git remote set-url origin $RepoUrl
    Write-Ok "origin 已更新为 $RepoUrl"
} else {
    & $git remote add origin $RepoUrl
    Write-Ok "origin 已添加 $RepoUrl"
}

# ------------------------------------------------------ 6. 首次提交并推送
Write-Step '首次提交并推送'

& $git add -A
$staged = & $git diff --cached --name-only
if ($staged) {
    Write-Host '    将提交以下文件：' -ForegroundColor Gray
    $staged | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
    & $git commit -m 'chore: 初始化仓库骨架'
    Write-Ok '已创建首次提交'
} else {
    Write-Warn2 '没有待提交的改动，跳过提交'
}

$hasCommits = & $git rev-parse --verify HEAD 2>$null
if ($hasCommits) {
    & $git push -u origin $Branch
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "已推送到 origin/$Branch"
    } else {
        Write-Warn2 "推送失败（退出码 $LASTEXITCODE）。若远程已有内容，先执行：git pull --rebase origin $Branch"
    }
} else {
    Write-Warn2 '尚无提交，跳过推送'
}

# ------------------------------------------------------------ 7. 结果
Write-Step '完成，当前状态'
& $git status
& $git remote -v
