export type VersionNoteFeature = {
  title: string;
  body: string;
};

export interface VersionNotesContent {
  headline: string;
  summary: string;
  focusTags: string[];
  methodology: VersionNoteFeature[];
  currentResults: string[];
  nextSteps: string[];
}

export const currentVersionNotes: VersionNotesContent = {
  headline: "先把评测方式做得可重复，再去看不同 App 的横向结论。",
  summary: "这个页面不再只是版本碎碎念，而是把这工具到底怎么测、现在能产出什么结果、以及下一步准备补什么，一次讲清楚。当前版本的重点是先保证整轮流程可跑、可回看、可导出。",
  focusTags: ["同样本", "同流程", "结果落库", "历史回看"],
  methodology: [
    {
      title: "同一批样本",
      body: "所有目标 App 共用同一批音频样本，避免每个 App 各测各的，保证横向比较时输入条件一致。",
    },
    {
      title: "同一套触发链路",
      body: "测试窗口会先聚焦内置输入框，再通过统一热键流程触发目标 App，并把音频发到指定虚拟设备。",
    },
    {
      title: "同一个文本接收区",
      body: "目标 App 的输出统一写进 benchmark 输入框，便于稳定观察首字时间、最终文本和失败状态。",
    },
    {
      title: "同一种结果沉淀",
      body: "每条样本都会保存状态、延迟、原始文本、失败原因和时间线，方便后续复盘和导出。",
    },
  ],
  currentResults: [
    "已经可以直接发起整轮批量测试，并在主控台看到实时进度、当前步骤和最新状态。",
    "历史页已经能按轮查看结果，也能导出 CSV、导入兼容 CSV，并对失败样本做单条重试。",
    "当前可稳定采集的核心指标包括状态、首字延迟、最终完成延迟、CPU、内存、原始文本和失败原因。",
    "内建自测已经可用，适合先验证工具链本身，再去看真实目标 App 的兼容性问题。",
    "现阶段更适合得出“流程是否稳定、哪一步容易失败、哪些 App 需要继续调”这类结论，而不是直接给出最终排行榜。",
  ],
  nextSteps: [
    "继续补真实目标 App 的回归验证，把常见失败模式尽快收敛成稳定配置。",
    "在已有结果采集基础上补更多统计视角，比如准确率、分位数延迟和更清晰的横向摘要。",
    "把说明页继续整理成更像 about / methodology 的长期文档，而不是临时版本文案。",
  ],
};
