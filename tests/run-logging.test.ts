import { describe, expect, it } from "vitest";
import { formatResultLog, formatTimelineLog } from "../src/main/run-logging";
import type { RunEventRecord, TestRunRecord } from "../src/shared/types";

describe("run logging", () => {
  it("formats timeline logs from the same event data used by the UI", () => {
    const event: RunEventRecord = {
      id: "event-1",
      runId: "run-1",
      eventType: "app_launch",
      tsMs: 2251,
      payloadJson: JSON.stringify({ app: "西瓜说", target: "/Applications/西瓜说.app", sample: "folder/zh.wav" }),
    };

    const line = formatTimelineLog(event, new Map());

    expect(line).toContain("[timeline] run=run-1");
    expect(line).toContain("event=app_launch");
    expect(line).toContain("title=后台启动目标App");
    expect(line).toContain("detail=西瓜说 已尝试后台启动");
    expect(line).toContain("sample=zh.wav");
  });

  it("formats result logs with run outcome and timeline size", () => {
    const record: TestRunRecord = {
      id: "run-1",
      runSessionId: "session-1",
      appId: "xiguashuo",
      appName: "西瓜说",
      sampleId: "sample-1",
      samplePath: "folder/zh.wav",
      status: "success",
      phase: "completed",
      rawText: "hello",
      normalizedText: "hello",
      triggerStopToFirstCharMs: 830,
      triggerStopToFinalTextMs: 1100,
      inputEventCount: 1,
      finalTextLength: 5,
      createdAt: "2026-03-24T01:00:00.000Z",
      timeline: [
        {
          id: "event-1",
          runId: "run-1",
          eventType: "trigger_start",
          tsMs: 100,
          payloadJson: JSON.stringify({ chord: "Ctrl + 1" }),
        },
      ],
    };

    const line = formatResultLog(record);

    expect(line).toContain("[result] run=run-1");
    expect(line).toContain("status=success");
    expect(line).toContain("app=西瓜说");
    expect(line).toContain("sample=zh.wav");
    expect(line).toContain("events=1");
    expect(line).toContain("first_char_ms=830");
  });
});
