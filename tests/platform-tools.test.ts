// SPDX-License-Identifier: CC-BY-4.0
// Copyright 2026 Appstrate contributors

/**
 * Platform-tool packages — behavioural conformance.
 *
 * Each of the five reserved AFPS 1.3 platform tools is shipped as a
 * standalone `@afps/*` package. This suite loads the actual package
 * entrypoints (not a copy) and asserts the canonical contract each
 * must honour: name, parameter shape, event type, and return value.
 */

import { describe, it, expect } from "bun:test";
import type { Tool, ToolContext } from "../schema/src/interfaces.ts";

import memoryTool from "../packages/memory/src/index.ts";
import stateTool from "../packages/state/src/index.ts";
import outputTool from "../packages/output/src/index.ts";
import reportTool from "../packages/report/src/index.ts";
import logTool from "../packages/log/src/index.ts";
import { PLATFORM_TOOLS as COMPAT } from "../packages/platform-compat/src/index.ts";

function makeCtx() {
  const events: Array<Record<string, unknown>> = [];
  const ctx: ToolContext = {
    emit: (e) => {
      events.push(e as unknown as Record<string, unknown>);
    },
    workspace: "/tmp",
    runId: "run_1",
    toolCallId: "call_a",
    signal: new AbortController().signal,
  };
  return { ctx, events };
}

function assertEnvelopeBase(event: Record<string, unknown>): void {
  expect(typeof event.type).toBe("string");
  expect(typeof event.timestamp).toBe("number");
  expect(event.runId).toBe("run_1");
  expect(event.toolCallId).toBe("call_a");
}

describe("@afps/memory", () => {
  it("emits memory.added with content", async () => {
    const { ctx, events } = makeCtx();
    await memoryTool.execute({ content: "hello" }, ctx);
    expect(events).toHaveLength(1);
    assertEnvelopeBase(events[0]!);
    expect(events[0]!.type).toBe("memory.added");
    expect(events[0]!.content).toBe("hello");
  });

  it("declares required parameter `content`", () => {
    const tool: Tool = memoryTool;
    const required = (tool.parameters as { required: string[] }).required;
    expect(required).toEqual(["content"]);
    expect(tool.name).toBe("add_memory");
  });
});

describe("@afps/state", () => {
  it("emits state.set with arbitrary payload", async () => {
    const { ctx, events } = makeCtx();
    await stateTool.execute({ state: { step: 2, done: false } }, ctx);
    assertEnvelopeBase(events[0]!);
    expect(events[0]!.type).toBe("state.set");
    expect(events[0]!.state).toEqual({ step: 2, done: false });
  });
});

describe("@afps/output", () => {
  it("emits output.emitted with data", async () => {
    const { ctx, events } = makeCtx();
    await outputTool.execute({ data: ["a", "b"] }, ctx);
    expect(events[0]!.type).toBe("output.emitted");
    expect(events[0]!.data).toEqual(["a", "b"]);
  });
});

describe("@afps/report", () => {
  it("emits report.appended with content", async () => {
    const { ctx, events } = makeCtx();
    await reportTool.execute({ content: "one" }, ctx);
    expect(events[0]!.type).toBe("report.appended");
    expect(events[0]!.content).toBe("one");
  });
});

describe("@afps/log", () => {
  it("emits log.written with level + message", async () => {
    const { ctx, events } = makeCtx();
    await logTool.execute({ level: "warn", message: "slow" }, ctx);
    expect(events[0]!.type).toBe("log.written");
    expect(events[0]!.level).toBe("warn");
    expect(events[0]!.message).toBe("slow");
  });

  it("accepts info/warn/error levels only (enforced by runtime parsers, not by the tool itself)", () => {
    const required = (logTool.parameters as { required: string[] }).required;
    expect(required.sort()).toEqual(["level", "message"]);
  });
});

describe("@afps/platform-compat", () => {
  it("re-exports the five tools keyed by their canonical tool names", () => {
    expect(Object.keys(COMPAT).sort()).toEqual(
      ["add_memory", "log", "output", "report", "set_state"].sort(),
    );
    expect(COMPAT.add_memory).toBe(memoryTool);
    expect(COMPAT.set_state).toBe(stateTool);
    expect(COMPAT.output).toBe(outputTool);
    expect(COMPAT.report).toBe(reportTool);
    expect(COMPAT.log).toBe(logTool);
  });
});
