# Dream Lab 使用说明

仓库已连接完成，**无需再做任何一次性配置**。

| 项目 | 值 |
|---|---|
| 远程仓库 | https://github.com/cyanmaple1009-ai/dreamlab （private） |
| 默认分支 | `main` |
| 提交身份 | Haru `<wolf152633@163.com>` |
| 认证方式 | GitHub CLI 浏览器登录（凭证存于 Windows 凭据管理器） |

**以后免密**：认证凭证已由 `gh auth login` 写入 Windows 凭据管理器，
所有 git 操作不会再要求登录，也不需要维护任何 token。

---

## 日常操作

```powershell
cd 'C:\Project\Dream Lab'

git status                  # 查看当前改动
git add -A                  # 暂存全部改动
git commit -m "改动说明"     # 提交
git push                    # 推送（上游已绑定，不用再写 origin main）
git pull                    # 拉取远程更新
```

查看历史：

```powershell
git log --oneline --graph
```

---

## 认证状态管理

```powershell
gh auth status        # 查看当前登录状态
gh auth logout        # 退出登录（会清除凭证）
gh auth login         # 重新登录（新开终端跑，按提示走浏览器授权）
```

---

## 常见报错

| 报错关键字 | 含义与处理 |
|---|---|
| `Please tell me who you are` | 提交身份丢失，执行 `git config --global user.name "Haru"` 和 `git config --global user.email "wolf152633@163.com"` |
| `Authentication failed` | 凭证失效，重跑 `gh auth login` |
| `Repository not found` | 登录账号不是 `cyanmaple1009-ai`，用 `gh auth status` 确认 |
| `failed to push some refs` | 远程比本地新，先 `git pull --rebase origin main` 再推 |
| `SEC_E_NO_CREDENTIALS` | 出现在受限沙箱环境里；在普通 PowerShell 窗口执行即可正常联网 |

---

## 忽略规则

`.gitignore` 已屏蔽以下内容，避免误提交到远程：

- 环境变量文件：`.env`、`.env.*`
- 密钥与证书：`*.key`、`*.pem`、`*.p12`、`*.pfx`、`id_rsa`、`id_ed25519`
- 凭证文件：`.git-credentials`、`credentials.json`、`*token*.txt`、`*token*.json`、`*.secret`
- 依赖与构建产物：`node_modules/`、`dist/`、`build/`、`__pycache__/` 等

需要放行被忽略的文件时用：

```powershell
git add -f 文件名
```
