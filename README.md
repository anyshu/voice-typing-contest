# Voice Typing Contest

一个给 macOS 用的本地语音输入横评工具。

它不是单纯“放音频 + 看结果”的 demo，而是尽量把每个目标 App 放进同一套可重复的测试流程里：同一批样本、同一套触发方式、同一个文本接收区、同一种结果落库方式，最后把可比较的数据沉淀到本地 SQLite。

## 参考展示

https://github.com/user-attachments/assets/dde909e5-a18f-4d18-b6a8-4868375619b6

## 这项目主要解决什么

- 用同一批音频样本跑多个 voice typing App
- 用统一热键流程触发目标 App，减少人工操作差异
- 把输出文本收敛到内置输入框，方便对比最终结果
- 记录首字时间、最终完成时间、状态、失败原因、原始文本
- 支持先跑内建自测，把“工具链问题”和“目标 App 兼容性问题”分开看

## 评测方式

这工具当前采用的是一套偏“流程控制”的评测法，重点是先保证可重复，再谈横向比较：

1. 为所有目标 App 准备同一批音频样本
2. 每个 App 都配置自己的全局热键和触发模式
3. 开始正式运行前，工具会先弹一个确认框，提醒你暂时不要碰鼠标和键盘
4. 工具把测试窗口拉回前台，并聚焦到统一输入框
5. 通过 helper 发送热键，随后把音频播到选定输出设备
6. 观察输入框中的首个字符出现时间、最终文本稳定时间和最终文本内容
7. 把整轮时间线、状态、重试关系和原始结果写入本地数据库

这意味着它更像“同流程 bench harness”，而不是直接给 ASR 算法打分的离线评测框架。

补充几点当前实现细节：

- `hold_release` 类型的 App 会优先走“按住热键 + 播放音频 + 松开热键”这一条单 helper 会话路径，减少 `Fn` 这类修饰键被拆断的风险
- 如果 native helper 暂时不支持这条组合命令，应用会自动退回较旧的分步 hotkey / play / release 路径
- 内建自测不依赖真实目标 App，可以先验证输入检测区、时间线、落库和历史视图是不是通的

## 结果怎么看

当前版本已经能稳定产出几类核心结果：

- `status`：本条样本是成功、失败还是取消
- `first-char latency`：首字出现延迟，适合看“启动反应速度”
- `final latency`：最终文本稳定耗时，适合看“整句完成速度”
- `raw text`：目标 App 实际打出来的文本
- `failure reason`：例如权限缺失、结果超时、空结果等
- `timeline`：每一步关键事件的时间线，便于回放问题发生在哪一段
- `retry chain`：失败后重跑会保留重试链路，历史页默认展示最新一次结果

如果样本带有 `expectedText`，后续还可以在这套结果基础上继续加准确率相关统计；当前仓库的重点仍然是先把流程和结果采集做扎实。

## 当前实现结果

截至 `v0.1.13`，项目已经把“能不能持续、成批、可回看地跑起来”这一层打通了：

- 可以管理目标 App、样本目录、热键、输出设备和运行参数
- 内建预置目前包含 Xiguashuo、闪电说、Wispr Flow、Typeless 和“内建自测”
- 页面结构已经拆成 `主控台`、`运行前检查`、`样本管理`、`App管理`、`测试历史`、`设置`、`怎么开始`、`常见问题`、`关于`
- 可以直接发起一整轮批量测试，而不是手动逐条点
- 可以把结果落到本地 SQLite，并在历史页按轮查看
- 支持导出 ZIP 结果包（内含 `results.csv`、`system-info.csv`、`system-summary.csv`），也支持把兼容 CSV 重新导入成历史记录
- 支持按固定采样间隔记录测试期间的 CPU / 内存占用，并在主控台展示平均值与峰值
- 支持内建自测，用来先验证工具链本身是否通顺
- 支持失败样本重试，方便补跑和定位偶发问题
- 样本页支持预览播放，历史页支持按 session 展开和查看每条样本的 tooltip 详情
- FAQ 页已经收录了一个高频问题：有些目标 App 会在听写时自动静音其他活动音频

换句话说，这个版本的“结果”还不是某个 App 的最终排名，而是已经具备了产出可比较 benchmark 数据的基础设施。

## 技术栈

桌面端基于 Electron + Vue，本地结果存储使用 SQLite，macOS 侧系统级动作优先通过原生 helper 完成；开发环境下如果 Swift helper 不可用，会退回 fallback helper。

## 运行前准备

在跑真实 App 之前，建议先准备好：

- macOS
- Node.js 22+
- `pnpm`
- Xcode Command Line Tools
- Swift toolchain
- 如有需要，可以先安装 BlackHole 或其他虚拟音频设备，用来尽量减少测试时外部声音的干扰；目前西瓜说 / 闪电说这类场景会更建议这样配置
- 已安装并配置好的目标语音输入 App

补充说明：

- 如果真实 App 还没配完，可以先跑内建自测
- 自动化真实 App 时，需要授予 Accessibility 权限
- `Fn` 在 macOS / Electron 里不总能稳定录到，所以 UI 里提供了单独的“设为 Fn”按钮

## 从源码运行

```bash
pnpm install
pnpm helper:build
pnpm dev
```

如果 Swift helper 构建失败，项目会退回 fallback helper，方便继续本地开发；但真实评测建议仍以原生 helper 为准。

## 当前界面结构

- `主控台`：看当前进度、输入检测区、整轮时间线、最近一轮统计
- `运行前检查`：检查权限、设备、样本和 app 可运行性
- `样本管理`：扫描目录、启用/停用样本、预览播放
- `App管理`：新增/编辑目标 App、录热键、设定触发方式
- `测试历史`：按 session 查看结果、导出 CSV、导入 CSV、单条重试
- `设置`：全局运行参数、数据库路径、输出设备、样本根目录
- `怎么开始`：给首次使用者的最短路径说明
- `常见问题`：收录当前最常见的排障项
- `关于`：说明评测方法、当前结果和下一步计划

## 首次配置建议顺序

1. 如果准备测试西瓜说 / 闪电说，可以先安装 BlackHole 或其他虚拟音频设备，但这不是必须项
2. 先到 `App管理` 给每个目标 App 配好全局热键和触发方式
3. 确认目标 App 的输入链路指向你的测试音频路径
4. 打开 Voice Typing Contest，在 `设置` 里选择输出设备
5. 在 `样本管理` 里选择样本目录，或者先用内建自测
6. 到 `运行前检查` 看一遍权限、设备和 app 状态
7. 授予 Accessibility 权限
8. 先跑一轮内建自测，再开始真实横评

## 常用命令

```bash
pnpm dev           # 本地开发
pnpm build         # 构建应用
pnpm test          # 运行测试
pnpm helper:build  # 构建 debug helper
pnpm helper:release
pnpm dist:mac      # 打包 macOS 安装产物
```

打包产物默认输出到 `release/`。

## GitHub 上放置 dmg 的推荐方式

不要把 `.dmg` 直接提交进仓库历史，仓库会越来越重，后面也很难清理。这个项目现在更适合用 GitHub Releases 来放安装包。

仓库里已经补了一条自动发布工作流：`.github/workflows/release-dmg.yml`。

它会：

- 推送 `v*` tag 时，在 GitHub Actions 的 macOS runner 上执行 `pnpm test`
- 接着执行 `pnpm dist:mac`
- 把生成的 `release/*.dmg` 和 `release/*.zip` 上传到对应的 GitHub Release
- 同时把同一批产物挂到 Actions artifact，方便回看构建结果

常见发布步骤：

```bash
git tag v0.1.13
git push origin v0.1.13
```

推上去后，去 GitHub 的 `Actions` / `Releases` 页面就能拿到 dmg。

补充说明：

- 当前发布链显式关闭 Developer ID 签名，但会在打包后重新补一个一致的 ad-hoc 签名，避免 Electron 默认留下的损坏签名状态继续触发“已损坏”弹窗
- 这意味着 GitHub Release 里的包默认仍是“未验证开发者”状态；首次打开时，用户需要到“系统设置 > 隐私与安全性”里点“仍要打开”，或者在 Finder 里右键应用后选择“打开”
- 为了让 CI 上的打包路径稳定，helper 构建脚本现在会把 Swift 编译出的 `vtc-helper` 复制到固定的 `native/helper/.build/release/vtc-helper`
- 同时也会把 `vtc-audioctl` 放到同一个稳定 release 路径，避免 electron-builder 在干净 CI 环境里漏资源

推荐给最终用户的安装步骤：

1. 从 GitHub Release 下载最新的 `arm64-mac.zip`
2. 解压后把 `Voice Typing Contest.app` 拖到 `/Applications`
3. 如果首次打开被 macOS 拦住，先执行：

```bash
xattr -dr com.apple.quarantine "/Applications/Voice Typing Contest.app"
open "/Applications/Voice Typing Contest.app"
```

4. 如果系统仍提示未验证开发者，再到“系统设置 > 隐私与安全性”里点“仍要打开”

## 目录结构

- `src/renderer`：界面与交互
- `src/main`：测试流程编排、IPC、结果持久化
- `src/shared`：共享类型与工具
- `native/helper`：macOS 原生 helper
- `native/coreaudio-tool`：CoreAudio 相关辅助工具
- `docs/design.md`：产品/架构设计
- `docs/ui-design.md`：界面结构与文案参考
- `docs/ui-dev-spec.md`：当前 UI 开发规格

## 权限说明

真实自动化路径主要依赖：

- Accessibility：发送热键、焦点恢复
- Automation：部分激活 / 重启目标 App 的流程
- Input Monitoring：当前主要用于诊断

当前 preflight 的策略是：

- 只要启用的目标里还有至少一个 app 真正可跑，缺失的 app 可以先跳过，不会阻塞整轮
- 如果一个可跑的 app 都没有，才会阻塞开始
- 如果只跑内建自测，则不要求真实 app 安装完成
