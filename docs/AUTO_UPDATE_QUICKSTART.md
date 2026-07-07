# 自动更新功能 - 快速入门

## 🎯 功能概述

为 Voice Typing Contest 添加了完整的自动更新功能：
- 启动时自动检查更新
- 支持手动检查更新
- 友好的用户交互
- 从 GitHub Releases 自动下载安装

## 🚀 快速开始

### 发布新版本

```bash
# 1. 更新版本号（会自动更新 package.json 和 git tag）
npm version patch   # 0.2.2 → 0.2.3
# 或
npm version minor   # 0.2.2 → 0.3.0
# 或
npm version major   # 0.2.2 → 1.0.0

# 2. 推送代码和标签
git push origin main --tags
```

就这么简单！GitHub Actions 会自动：
1. 构建应用
2. 生成安装包（DMG + ZIP）
3. 生成更新清单（latest-mac.yml）
4. 发布到 GitHub Releases

### 用户获取更新

**自动方式：**
- 用户启动应用
- 3 秒后自动检查更新
- 有新版本时弹窗提示

**手动方式：**
- 打开应用
- 点击侧边栏"关于"
- 点击"检查更新"按钮

## 📁 文件说明

### 新增文件
- `src/main/auto-updater.ts` - 自动更新核心逻辑
- `docs/AUTO_UPDATE.md` - 完整文档
- `docs/AUTO_UPDATE_TEST.md` - 测试指南
- `docs/AUTO_UPDATE_SUMMARY.md` - 功能总结

### 修改文件
- `package.json` - 添加 publish 配置
- `src/main/main.ts` - 集成自动更新
- `src/main/preload.ts` - 添加 API
- `src/renderer/components/VersionNotesPanel.vue` - 添加按钮
- `.github/workflows/release-dmg.yml` - 更新工作流

## ✅ 验证清单

发版前检查：
- [ ] `package.json` 版本号已更新
- [ ] `git tag` 已创建并推送
- [ ] GitHub Actions workflow 运行成功
- [ ] Release 页面有新版本
- [ ] Release 包含 `.zip` 和 `latest-mac.yml`

## 🔍 故障排查

### 更新检查失败
**查看日志：**
```bash
open ~/Library/Logs/Voice\ Typing\ Contest/
# 查看 main.log
```

**可能原因：**
- 网络连接问题
- GitHub API 限流
- 仓库配置错误

### 下载失败
**检查 Release：**
1. 打开 https://github.com/anyshu/voice-typing-contest/releases
2. 确认最新 Release 存在
3. 确认包含 ZIP 文件
4. 确认包含 latest-mac.yml

## 💡 提示

1. **开发环境不会触发更新**
   - 只在打包后的应用中生效
   - 使用 `pnpm dev` 运行时不会检查更新

2. **版本号必须递增**
   - electron-updater 只会提示版本号更高的更新
   - 使用语义化版本号（semver）

3. **首次发版**
   - 第一次配置时，确保 GitHub Release 公开
   - 私有仓库需要额外的 token 配置

## 📚 更多信息

- [完整文档](./AUTO_UPDATE.md)
- [测试指南](./AUTO_UPDATE_TEST.md)
- [electron-updater 官方文档](https://www.electron.build/auto-update)
