# 自动更新功能测试指南

## 快速测试步骤

### 1. 准备测试环境

```bash
# 确保当前版本号较低（如 0.2.2）
cat package.json | grep version

# 构建当前版本
pnpm dist:mac
```

### 2. 创建测试 Release

```bash
# 更新版本号为测试版本
npm version 0.2.3

# 提交并打 tag
git add package.json
git commit -m "chore: bump version to 0.2.3"
git tag v0.2.3

# 推送到 GitHub
git push origin main --tags
```

### 3. 等待 GitHub Actions

- 打开 GitHub 仓库的 Actions 页面
- 等待 workflow 完成（约 5-10 分钟）
- 检查 Releases 页面是否有新版本

### 4. 测试自动更新

```bash
# 安装旧版本（0.2.2）
open release/Voice\ Typing\ Contest-0.2.2-arm64.dmg

# 启动应用
# 等待 3 秒，应该弹出更新提示
```

### 5. 测试手动检查

- 打开应用
- 点击侧边栏"关于"
- 点击"检查更新"按钮
- 应该看到更新提示对话框

## 预期行为

### 启动时自动检查

1. 应用启动后 3 秒
2. 控制台输出：`正在检查更新...`
3. 如果有更新，弹出对话框：
   - 标题：发现新版本
   - 内容：发现新版本 0.2.3
   - 按钮：[立即下载] [稍后]

### 下载过程

1. 用户点击"立即下载"
2. Dock 图标显示进度条
3. 控制台输出下载进度：`下载进度: 10%`, `20%`...

### 下载完成

1. 进度条消失
2. 弹出对话框：
   - 标题：更新就绪
   - 内容：新版本 0.2.3 已下载完成
   - 说明：重启应用后将自动安装更新
   - 按钮：[立即重启] [稍后重启]

### 安装更新

- 点击"立即重启"：应用立即退出并安装
- 点击"稍后重启"：下次退出时自动安装

## 常见问题

### Q: 没有弹出更新提示？

A: 检查以下内容：
1. 确认在生产版本中运行（不是 `pnpm dev`）
2. 检查版本号是否正确（package.json）
3. 查看日志文件是否有错误
4. 确认 GitHub Release 已发布

### Q: 下载失败？

A: 可能原因：
1. 网络连接问题
2. GitHub Releases 中缺少 ZIP 文件
3. `latest-mac.yml` 文件格式错误

### Q: 如何回滚版本？

A: 
```bash
# 删除远程 tag
git push origin :refs/tags/v0.2.3

# 删除 GitHub Release
# 在 GitHub 网站手动删除

# 重置本地版本
git reset --hard HEAD^
npm version 0.2.2
```

## 日志位置

- macOS: `~/Library/Logs/Voice Typing Contest/main.log`
- 打开方式：`open ~/Library/Logs/Voice\ Typing\ Contest/`

## 调试技巧

### 查看更新清单

```bash
# 下载 latest-mac.yml
curl -L https://github.com/anyshu/voice-typing-contest/releases/latest/download/latest-mac.yml

# 查看内容
cat latest-mac.yml
```

### 手动触发更新检查

在应用中打开开发者工具（如果启用）：

```javascript
// 在控制台执行
window.vtc.checkForUpdates()
```

### 模拟旧版本

临时修改 `package.json` 中的版本号为更低的值（如 `0.1.0`），然后重新构建。

## 生产环境检查清单

- [ ] `package.json` 中的版本号已更新
- [ ] `publish.owner` 和 `publish.repo` 配置正确
- [ ] GitHub Actions workflow 已启用
- [ ] GITHUB_TOKEN 权限正确
- [ ] Release 中包含 `.zip` 文件
- [ ] Release 中包含 `latest-mac.yml` 文件
- [ ] 用户可以访问 GitHub API

