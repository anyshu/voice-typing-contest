export type VersionNoteFeature = {
  title: string;
  body: string;
};

export interface VersionNotesContent {
  headline: string;
  summary: string;
  focusTags: string[];
  highlights: VersionNoteFeature[];
  limitations: string[];
  nextSteps: string[];
}

export const currentVersionNotes: VersionNotesContent = {
  headline: "先把整轮测试流程跑通，再逐步补齐真实 App 兼容性。",
  summary: "这一版已经能把样本、目标 App、热键和运行参数串起来，支持直接发起批量测试，并把结果沉淀到本地。当前重点不是做一个花哨壳子，而是先把问题暴露清楚、把每轮结果留下来，方便后续逐个补稳定性。",
  focusTags: ["批量测试", "结果落库", "内建自测", "问题定位"],
  highlights: [
    {
      title: "配置路径已经完整",
      body: "现在可以在一个地方管理样本、目标 App、热键和输出设备，不用再靠分散脚本临时拼流程。",
    },
    {
      title: "整轮测试可以直接发起",
      body: "主控台已经能按当前配置执行一整轮测试，并持续反馈当前进度、关键事件和最新状态。",
    },
    {
      title: "结果会沉淀到本地",
      body: "每轮测试结果会写入本地数据库，也支持在历史页按轮查看和导出，方便回头做横向对比。",
    },
    {
      title: "可先用内建自测做流程自检",
      body: "接真实目标 App 前，可以先跑内建自测确认主链路正常，先分离流程问题，再看 App 兼容性问题。",
    },
  ],
  limitations: [
    "真实目标 App 仍需要逐个验证兼容性和触发稳定性，现阶段还不能假设所有 App 都能一次配置后长期稳定运行。",
    "部分运行链路目前还有兼容性兜底，这意味着它能先跑起来，但还不是最终形态。",
    "当前版本优先保证流程可跑通、问题可定位，所以在文案细节、信息组织和体验打磨上还有继续优化空间。",
  ],
  nextSteps: [
    "补齐真实目标 App 的回归验证，尽快把常见失败模式收敛成稳定配置。",
    "继续把说明类内容从大组件里拆出去，避免 UI 结构和静态文案长期耦合。",
    "把版本说明逐步演进成真正可维护的 release notes，而不是零散静态文本。",
  ],
};
