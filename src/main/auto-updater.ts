import pkg from "electron-updater";
const { autoUpdater, MacUpdater } = pkg;
import { BrowserWindow, dialog, app, shell } from "electron";
import log from "electron-log";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";

const execAsync = promisify(exec);

// 配置日志
autoUpdater.logger = log;
// @ts-expect-error - level exists on logger
autoUpdater.logger.transports.file.level = "info";

// 配置更新选项
autoUpdater.autoDownload = false; // 不自动下载，让用户决定
autoUpdater.autoInstallOnAppQuit = true; // 退出时自动安装

// 允许不安全的更新（开发环境无签名）
// @ts-expect-error - allowDowngrade exists
autoUpdater.allowDowngrade = false;
// @ts-expect-error - allowPrerelease exists
autoUpdater.allowPrerelease = false;

// macOS 特殊处理：禁用代码签名验证（仅用于开发/测试）
if (process.platform === 'darwin') {
  try {
    // @ts-expect-error - accessing internal property
    if (autoUpdater.httpExecutor) {
      log.info("配置 macOS 更新器跳过签名验证");
    }
  } catch (err) {
    log.warn("无法配置 macOS 更新器", err);
  }
}

let mainWindow: BrowserWindow | undefined;
let updateCheckInProgress = false; // 防止重复检查
let downloadInProgress = false; // 防止重复下载

export function setupAutoUpdater(window: BrowserWindow): void {
  mainWindow = window;

  // 检查更新错误
  autoUpdater.on("error", (error) => {
    log.error("更新检查失败:", error);
    updateCheckInProgress = false;
    downloadInProgress = false;
  });

  // 检查更新时
  autoUpdater.on("checking-for-update", () => {
    log.info("正在检查更新...");
    updateCheckInProgress = true;
  });

  // 有可用更新
  autoUpdater.on("update-available", (info) => {
    log.info("发现新版本:", info.version);
    
    if (!mainWindow || downloadInProgress) return;

    dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "发现新版本",
      message: `发现新版本 ${info.version}`,
      detail: "是否立即下载更新？",
      buttons: ["立即下载", "稍后"],
      defaultId: 0,
      cancelId: 1,
    }).then((result) => {
      if (result.response === 0) {
        downloadInProgress = true;
        log.info("开始下载更新...");
        autoUpdater.downloadUpdate().catch((err) => {
          log.error("下载更新失败:", err);
          downloadInProgress = false;
        });
      }
    }).catch((err) => {
      log.error("显示更新对话框失败:", err);
    });
  });

  // 没有可用更新
  autoUpdater.on("update-not-available", (info) => {
    log.info("当前已是最新版本:", info.version);
    updateCheckInProgress = false;
  });

  // 下载进度
  autoUpdater.on("download-progress", (progress) => {
    const percent = Math.floor(progress.percent);
    log.info(`下载进度: ${percent}%`);
    
    if (mainWindow) {
      mainWindow.setProgressBar(progress.percent / 100);
    }
  });

  // 下载完成
  autoUpdater.on("update-downloaded", (info) => {
    log.info("更新下载完成:", info.version);
    downloadInProgress = false;
    updateCheckInProgress = false;
    
    if (mainWindow) {
      mainWindow.setProgressBar(-1); // 清除进度条
    }

    if (!mainWindow) return;

    dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "更新就绪",
      message: `新版本 ${info.version} 已下载完成`,
      detail: '点击"立即安装"将自动替换应用并重启',
      buttons: ["立即安装", "稍后"],
      defaultId: 0,
      cancelId: 1,
    }).then(async (result) => {
      if (result.response === 0) {
        try {
          await installUpdate(info.version);
        } catch (error) {
          log.error("安装更新失败:", error);
          dialog.showErrorBox("安装失败", `无法安装更新: ${error}`);
        }
      }
    }).catch((err) => {
      log.error("显示更新对话框失败:", err);
    });
  });
}

/**
 * 手动安装更新（绕过 Squirrel 签名验证）
 */
async function installUpdate(version: string): Promise<void> {
  const cacheDir = join(app.getPath('home'), 'Library/Caches/voice-typing-contest-updater/pending');
  const zipPath = join(cacheDir, `VoiceTypingContest-${version}-arm64.zip`);
  const appPath = app.getPath('exe').replace('/Contents/MacOS/VoiceTypingContest', '');
  
  log.info(`开始安装更新: ${zipPath} -> ${appPath}`);
  log.info(`应用路径: ${appPath}`);
  log.info(`ZIP 路径: ${zipPath}`);
  
  // 创建安装脚本
  const script = `#!/bin/bash
set -e  # 遇到错误立即退出
set -x  # 显示执行的命令

echo "=== 开始更新安装 ===" >> /tmp/vtc-update.log 2>&1

# 等待应用退出
sleep 2

# 解压新版本到临时目录
TMP_DIR=$(mktemp -d)
echo "临时目录: $TMP_DIR" >> /tmp/vtc-update.log 2>&1

echo "解压 ${zipPath}" >> /tmp/vtc-update.log 2>&1
unzip -q "${zipPath}" -d "$TMP_DIR" >> /tmp/vtc-update.log 2>&1

# 保留应用包结构，只替换内容（保留权限）
# 这样 macOS 不会认为这是一个新应用
echo "替换应用内容 ${appPath}" >> /tmp/vtc-update.log 2>&1

# 删除旧的 Contents 目录
rm -rf "${appPath}/Contents"

# 复制新的 Contents 目录
cp -R "$TMP_DIR/VoiceTypingContest.app/Contents" "${appPath}/"

# 更新 Info.plist（如果有的话）
if [ -f "$TMP_DIR/VoiceTypingContest.app/Contents/Info.plist" ]; then
  cp -f "$TMP_DIR/VoiceTypingContest.app/Contents/Info.plist" "${appPath}/Contents/"
fi

# 清理
rm -rf "$TMP_DIR"
rm -f "${zipPath}"

echo "=== 更新安装完成 ===" >> /tmp/vtc-update.log 2>&1

# 重新启动应用
sleep 1
open "${appPath}" >> /tmp/vtc-update.log 2>&1

echo "=== 应用已重启 ===" >> /tmp/vtc-update.log 2>&1
`;
  
  const scriptPath = '/tmp/vtc-update-install.sh';
  const fs = await import('node:fs/promises');
  await fs.writeFile(scriptPath, script, { mode: 0o755 });
  
  log.info(`安装脚本已创建: ${scriptPath}`);
  log.info(`日志文件: /tmp/vtc-update.log`);
  
  // 执行安装脚本并退出应用
  exec(`bash "${scriptPath}" &`);
  
  setTimeout(() => {
    log.info("退出应用以开始安装");
    app.quit();
  }, 500);
}

/**
 * 手动检查更新
 */
export function checkForUpdates(): void {
  if (updateCheckInProgress) {
    log.info("更新检查已在进行中，跳过");
    return;
  }
  
  autoUpdater.checkForUpdates().catch((error) => {
    log.error("检查更新失败:", error);
    updateCheckInProgress = false;
    
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: "error",
        title: "检查更新失败",
        message: "无法检查更新",
        detail: error.message || String(error),
      }).catch((err) => {
        log.error("显示错误对话框失败:", err);
      });
    }
  });
}
