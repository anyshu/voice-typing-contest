# 自动更新功能

本应用已集成 `electron-updater` 实现自动更新功能，可从 GitHub Releases 自动下载和安装新版本。

## 工作原理

1. **更新检查**：应用启动后 3 秒自动检查更新（仅生产环境）
2. **版本对比**：从 GitHub Releases 读取 `latest-mac.yml` 文件获取最新版本信息
3. **用户确认**：发现新版本时弹出对话框询问是否下载
4. **后台下载**：用户确认后在后台下载更新包（.zip 格式）
5. **安装提示**：下载完成后提示用户重启应用
6. **自动安装**：应用退出时自动安装更新

## 配置说明

### package.json

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "anyshu",
      "repo": "voice-typing-contest"
    }
  }
}
```

### GitHub Actions 工作流

`.github/workflows/release-dmg.yml` 会在 tag 推送时自动：

1. 编译应用
2. 生成 DMG 和 ZIP 安装包
3. 生成 `latest-mac.yml` 更新清单
4. 上传到 GitHub Release

## 发版流程

```bash
# 1. 更新版本号
npm version patch  # 或 minor/major

# 2. 推送 tag 触发发版
git push origin main --tags

# 3. GitHub Actions 自动执行构建和发布
# 等待 workflow 完成后，用户即可收到更新通知
```

## 手动检查更新

用户可以在"关于"页面点击"检查更新"按钮手动触发更新检查。

## 开发环境说明

- 开发模式（`pnpm dev`）**不会**启用自动更新
- 仅在打包后的生产版本中启用
- 通过检测 `process.env.ELECTRON_RENDERER_URL` 来判断环境

## 更新文件说明

### latest-mac.yml

electron-builder 自动生成的更新清单文件，包含：

- 最新版本号
- 下载地址（GitHub Release assets）
- 文件哈希（用于校验完整性）
- 发布日期

### .zip 文件

macOS 自动更新使用 ZIP 格式（不是 DMG）：

- 体积更小
- 下载更快
- 支持增量更新

## 用户体验

### 首次启动检查
- 应用启动 3 秒后静默检查更新
- 有更新时弹出友好提示

### 下载过程
- Dock 图标显示下载进度
- 可以继续使用应用

### 安装时机
- 用户可选择"立即重启"或"稍后重启"
- 选择"稍后"时，下次退出应用时自动安装

## 注意事项

1. **GitHub Token**：CI 中的 `GITHUB_TOKEN` 有权限上传 Release assets
2. **版本号格式**：遵循 semver（如 `0.2.2`）
3. **Tag 格式**：必须以 `v` 开头（如 `v0.2.2`）
4. **网络要求**：用户需要能访问 GitHub API 和 Releases

## 故障排查

### 更新检查失败

可能原因：
- 网络连接问题
- GitHub API 限流
- 配置的仓库信息不正确

日志位置：
- macOS: `~/Library/Logs/Voice Typing Contest/main.log`

### 下载失败

- 检查网络连接
- 查看 Release 中是否存在对应的 ZIP 文件
- 确认 `latest-mac.yml` 文件存在且格式正确

## 测试更新功能

1. 修改 `package.json` 中的版本号（如 `0.2.3`）
2. 提交并推送 tag：`git tag v0.2.3 && git push --tags`
3. 等待 GitHub Actions 完成构建
4. 使用旧版本应用，应该收到更新提示

## 相关文件

- `src/main/auto-updater.ts` - 自动更新逻辑
- `src/main/main.ts` - 集成自动更新
- `src/main/preload.ts` - 暴露更新 API
- `src/renderer/components/VersionNotesPanel.vue` - 检查更新按钮
- `.github/workflows/release-dmg.yml` - 发版工作流

