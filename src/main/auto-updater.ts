import pkg from "electron-updater";
const { autoUpdater } = pkg;
import { BrowserWindow, dialog } from "electron";
import log from "electron-log";

// 配置日志
autoUpdater.logger = log;
// @ts-expect-error - level exists on logger
autoUpdater.logger.transports.file.level = "info";

// 配置更新选项
autoUpdater.autoDownload = false; // 不自动下载，让用户决定
autoUpdater.autoInstallOnAppQuit = true; // 退出时自动安装

let mainWindow: BrowserWindow | undefined;

export function setupAutoUpdater(window: BrowserWindow): void {
  mainWindow = window;

  // 检查更新错误
  autoUpdater.on("error", (error) => {
    log.error("更新检查失败:", error);
  });

  // 检查更新时
  autoUpdater.on("checking-for-update", () => {
    log.info("正在检查更新...");
  });

  // 有可用更新
  autoUpdater.on("update-available", (info) => {
    log.info("发现新版本:", info.version);
    
    if (!mainWindow) return;

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
        autoUpdater.downloadUpdate();
      }
    }).catch((err) => {
      log.error("显示更新对话框失败:", err);
    });
  });

  // 没有可用更新
  autoUpdater.on("update-not-available", (info) => {
    log.info("当前已是最新版本:", info.version);
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
    
    if (mainWindow) {
      mainWindow.setProgressBar(-1); // 清除进度条
    }

    if (!mainWindow) return;

    dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "更新就绪",
      message: `新版本 ${info.version} 已下载完成`,
      detail: "重启应用后将自动安装更新",
      buttons: ["立即重启", "稍后重启"],
      defaultId: 0,
      cancelId: 1,
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    }).catch((err) => {
      log.error("显示重启对话框失败:", err);
    });
  });
}

/**
 * 手动检查更新
 */
export function checkForUpdates(): void {
  autoUpdater.checkForUpdates().catch((error) => {
    log.error("检查更新失败:", error);
    
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
