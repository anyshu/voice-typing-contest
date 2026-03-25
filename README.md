# Voice Typing Contest

一个给 macOS 用的本地语音输入横评工具。

它不是单纯“放音频 + 看结果”的 demo，而是尽量把每个目标 App 放进同一套可重复的测试流程里：同一批样本、同一套触发方式、同一个文本接收区、同一种结果落库方式，最后把可比较的数据沉淀到本地 SQLite。

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
3. 工具把测试窗口拉回前台，并聚焦到统一输入框
4. 通过辅助进程发送热键，随后把音频播到选定虚拟设备
5. 观察输入框中的首个字符出现时间、最终文本稳定时间和最终文本内容
6. 把整轮时间线、状态和原始结果写入本地数据库

这意味着它更像“同流程 bench harness”，而不是直接给 ASR 算法打分的离线评测框架。

## 结果怎么看

当前版本已经能稳定产出几类核心结果：

- `status`：本条样本是成功、失败还是取消
- `first-char latency`：首字出现延迟，适合看“启动反应速度”
- `final latency`：最终文本稳定耗时，适合看“整句完成速度”
- `raw text`：目标 App 实际打出来的文本
- `failure reason`：例如权限缺失、结果超时、空结果等
- `timeline`：每一步关键事件的时间线，便于回放问题发生在哪一段

如果样本带有 `expectedText`，后续还可以在这套结果基础上继续加准确率相关统计；当前仓库的重点仍然是先把流程和结果采集做扎实。

## 当前实现结果

截至 `v0.1.3`，项目已经把“能不能持续、成批、可回看地跑起来”这一层打通了：

- 可以管理目标 App、样本目录、热键、输出设备和运行参数
- 内建预置目前包含 Xiguashuo、闪电说、Wispr Flow、Typeless 和“内建自测”
- 可以直接发起一整轮批量测试，而不是手动逐条点
- 可以把结果落到本地 SQLite，并在历史页按轮查看
- 支持导出 CSV，也支持把兼容 CSV 重新导入成历史记录
- 支持内建自测，用来先验证工具链本身是否通顺
- 支持失败样本重试，方便补跑和定位偶发问题

换句话说，这个版本的“结果”还不是某个 App 的最终排名，而是已经具备了产出可比较 benchmark 数据的基础设施。

## 技术栈

桌面端基于 Electron + Vue，本地结果存储使用 SQLite，macOS 侧系统级动作通过原生 helper 完成。

## 运行前准备

在跑真实 App 之前，建议先准备好：

- macOS
- Node.js 20+
- `pnpm`
- Xcode Command Line Tools
- Swift toolchain
- 如有需要，可以先安装 BlackHole 或其他虚拟音频设备，用来尽量减少测试时外部声音的干扰；目前西瓜说 / 闪电说这类场景会更建议这样配置
- 已安装并配置好的目标语音输入 App

补充说明：

- 如果真实 App 还没配完，可以先跑内建自测
- 自动化真实 App 时，需要授予 Accessibility 权限

## 从源码运行

```bash
pnpm install
pnpm helper:build
pnpm dev
```

如果 Swift helper 构建失败，项目会退回 fallback helper，方便继续本地开发；但真实评测建议仍以原生 helper 为准。

## 首次配置建议顺序

1. 如果准备测试西瓜说 / 闪电说，可以先安装 BlackHole 或其他虚拟音频设备，但这不是必须项
2. 给每个目标 App 配好全局热键
3. 确认目标 App 的输入链路指向你的测试音频路径
4. 打开 Voice Typing Contest，选择输出设备
5. 选择样本目录，或者先用内建自测
6. 授予 Accessibility 权限
7. 先跑一轮自测，再开始真实横评

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

## 目录结构

- `src/renderer`：界面与交互
- `src/main`：测试流程编排、IPC、结果持久化
- `src/shared`：共享类型与工具
- `native/helper`：macOS 原生 helper
- `native/coreaudio-tool`：CoreAudio 相关辅助工具
- `docs/design.md`：产品/架构设计
- `docs/ui-design.md`：界面结构与文案参考

## 权限说明

真实自动化路径主要依赖：

- Accessibility：发送热键、焦点恢复
- Automation：部分激活 / 重启目标 App 的流程
- Input Monitoring：当前主要用于诊断
