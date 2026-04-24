// SPDX-License-Identifier: Apache-2.0

/**
 * Behavioural conformance for the five reserved AFPS 1.3 platform
 * tools. Exercises each tool's contract directly: name, parameter
 * shape, event type, payload fields — plus the `PLATFORM_TOOLS` map
 * that lets a runner inject the whole set at once.
 */

import { describe, it, expect } from "bun:test";
import type { Tool, ToolContext } from "@afps-spec/types";

import {
  logTool,
  memoryTool,
  outputTool,
  reportTool,
  stateTool,
  PLATFORM_TOOLS,
} from "../src/index.ts";

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

describe("memoryTool", () => {
  it("emits memory.added with content", async () => {
    const { ctx, events } = makeCtx();
    await memoryTool.execute({ content: "hello" }, ctx);
    expect(events).toHaveLength(1);
    assertEnvelopeBase(events[0]!);
    expect(events[0]!.type).toBe("memory.added");
    expect(events[0]!.content).toBe("hello");
  });

  it("declares required parameter `content` and name `add_memory`", () => {
    const tool: Tool = memoryTool;
    const required = (tool.parameters as { required: string[] }).required;
    expect(required).toEqual(["content"]);
    expect(tool.name).toBe("add_memory");
  });
});

describe("stateTool", () => {
  it("emits state.set with arbitrary payload", async () => {
    const { ctx, events } = makeCtx();
    await stateTool.execute({ state: { step: 2, done: false } }, ctx);
    assertEnvelopeBase(events[0]!);
    expect(events[0]!.type).toBe("state.set");
    expect(events[0]!.state).toEqual({ step: 2, done: false });
  });

  it("uses the wire name `set_state`", () => {
    expect(stateTool.name).toBe("set_state");
  });
});

describe("outputTool", () => {
  it("emits output.emitted with data", async () => {
    const { ctx, events } = makeCtx();
    await outputTool.execute({ data: ["a", "b"] }, ctx);
    expect(events[0]!.type).toBe("output.emitted");
    expect(events[0]!.data).toEqual(["a", "b"]);
  });
});

describe("reportTool", () => {
  it("emits report.appended with content", async () => {
    const { ctx, events } = makeCtx();
    await reportTool.execute({ content: "one" }, ctx);
    expect(events[0]!.type).toBe("report.appended");
    expect(events[0]!.content).toBe("one");
  });
});

describe("logTool", () => {
  it("emits log.written with level + message", async () => {
    const { ctx, events } = makeCtx();
    await logTool.execute({ level: "warn", message: "slow" }, ctx);
    expect(events[0]!.type).toBe("log.written");
    expect(events[0]!.level).toBe("warn");
    expect(events[0]!.message).toBe("slow");
  });

  it("declares level + message as required", () => {
    const required = (logTool.parameters as { required: string[] }).required;
    expect(required.sort()).toEqual(["level", "message"]);
  });
});

describe("PLATFORM_TOOLS map", () => {
  it("exposes the five tools keyed by their canonical wire names", () => {
    expect(Object.keys(PLATFORM_TOOLS).sort()).toEqual(
      ["add_memory", "log", "output", "report", "set_state"].sort(),
    );
    expect(PLATFORM_TOOLS.add_memory).toBe(memoryTool);
    expect(PLATFORM_TOOLS.set_state).toBe(stateTool);
    expect(PLATFORM_TOOLS.output).toBe(outputTool);
    expect(PLATFORM_TOOLS.report).toBe(reportTool);
    expect(PLATFORM_TOOLS.log).toBe(logTool);
  });

  it("each key matches the tool's declared `name` field", () => {
    for (const [wireName, tool] of Object.entries(PLATFORM_TOOLS)) {
      expect(tool.name).toBe(wireName);
    }
  });
});

describe("manifest consistency", () => {
  const cases: Array<[string, Tool, string]> = [
    ["log", logTool, "log"],
    ["memory", memoryTool, "add_memory"],
    ["output", outputTool, "output"],
    ["report", reportTool, "report"],
    ["state", stateTool, "set_state"],
  ];

  for (const [file, tool, expectedToolName] of cases) {
    it(`manifests/${file}.json describes ${expectedToolName}`, async () => {
      const manifest = (await import(`../manifests/${file}.json`, { with: { type: "json" } }))
        .default as { tool: { name: string; inputSchema: unknown } };
      expect(manifest.tool.name).toBe(expectedToolName);
      expect(manifest.tool.inputSchema).toEqual(tool.parameters as unknown);
    });
  }
});
