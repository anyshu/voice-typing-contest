import type { RunEventRecord } from "./types";

export function safeTimelinePayload(item: RunEventRecord): Record<string, unknown> {
  try {
    return JSON.parse(item.payloadJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function timelineTailName(value: unknown): string {
  const text = typeof value === "string" ? value : "";
  if (!text) return "-";
  const normalized = text.replace(/\\/g, "/");
  return normalized.split("/").filter(Boolean).pop() ?? text;
}

export function timelineTitle(item: RunEventRecord): string {
  const labels: Record<string, string> = {
    pre_run_prompt: "开始前提示",
    pre_run_acknowledged: "已确认开始",
    pre_run_begin: "正式开始测试",
    app_start: "开始处理应用",
    sample_start: "开始处理样本",
    focus_input: "聚焦检测框",
    selftest_mode: "进入内建自测",
    app_launch: "后台启动目标应用",
    app_launch_wait: "等待应用启动",
    pre_hotkey_wait: "等待热键发送",
    focus_input_wait: "等待检测框稳定",
    trigger_start: "发送触发热键",
    audio_start: "开始播放样本",
    audio_end: "样本播放完成",
    trigger_stop: "发送收口热键",
    input_observed: "检测到文本输入",
    between_samples_wait: "等待下一条样本",
    app_close_wait: "等待关闭应用",
    app_close: "关闭目标应用",
    run_failed: "动作失败",
  };
  return labels[item.eventType] ?? item.eventType;
}

export function timelineDetail(item: RunEventRecord): string {
  const payload = safeTimelinePayload(item);
  switch (item.eventType) {
    case "pre_run_prompt":
      return `已弹出开始提示：${String(payload.message ?? "请先不要动鼠标键盘。")}`;
    case "pre_run_acknowledged":
      return `测试员已确认：${String(payload.message ?? "知道了，开始正式测试。")}`;
    case "pre_run_begin":
      return "提示对话框已关闭，正式测试开始。";
    case "app_start":
      return `切到应用：${String(payload.app ?? "目标应用")}。`;
    case "sample_start":
      return `样本：${timelineTailName(payload.sample ?? "-")}。`;
    case "focus_input":
      return "把焦点拉回输入检测区，后面的文本应该落在这里。";
    case "selftest_mode":
      return `当前使用的是 ${String(payload.app ?? "内建自测")}。`;
    case "app_launch":
      return `${String(payload.app ?? "目标应用")} 已尝试后台启动，目标是 ${timelineTailName(payload.target)}。`;
    case "app_launch_wait":
      return `等待 ${String(payload.delayMs ?? 0)} ms，让 ${String(payload.app ?? "目标应用")} 启动稳定。`;
    case "focus_input_wait":
      return `等待 ${String(payload.delayMs ?? 0)} ms，再开始发送热键。`;
    case "pre_hotkey_wait":
      return `等待 ${String(payload.delayMs ?? 0)} ms，确保 ${String(payload.app ?? "目标应用")} 已经准备好接热键。`;
    case "trigger_start":
      return `触发热键：${String(payload.chord ?? "-")}`;
    case "audio_start":
      return `播放样本：${timelineTailName(payload.playableSamplePath ?? payload.sample)}`;
    case "audio_end":
      return "音频已经播完，准备收尾。";
    case "trigger_stop":
      return "收口热键已经发出。";
    case "input_observed":
      return `共观察到 ${String(payload.count ?? 0)} 次输入事件。`;
    case "between_samples_wait":
      return `等待 ${String(payload.delayMs ?? 0)} ms，再切到下一条样本。`;
    case "app_close_wait":
      return `等待 ${String(payload.delayMs ?? 0)} ms，然后关闭 ${String(payload.app ?? "目标应用")}。`;
    case "app_close":
      return `${String(payload.app ?? "目标应用")} 已发送关闭指令。`;
    case "run_failed":
      return `${String(payload.app ?? "目标应用")} / ${timelineTailName(payload.sample)} 未完成，请看结果列表里的失败详情。`;
    default:
      return item.payloadJson === "{}" ? "无额外信息" : item.payloadJson;
  }
}
