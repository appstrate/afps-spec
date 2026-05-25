// SPDX-License-Identifier: Apache-2.0

/**
 * Smoke test — ensures the types module resolves and that the key AFPS 2.0
 * contracts are exported (type-shape is validated by tsc; this guards
 * against accidental export removals at the module level).
 */

import { describe, it, expect } from "bun:test";
import * as types from "../src/index.ts";
import type {
  DependencyRef,
  SkillRef,
  McpServerRef,
  IntegrationRef,
  Tool,
  ToolContext,
  ToolResult,
  RunEvent,
} from "../src/index.ts";

// Compile-time assertions: the 2.0 dependency-ref set and the runtime
// tool protocol must remain exported. (Verified by tsc, not at runtime.)
type _Refs = [DependencyRef, SkillRef, McpServerRef, IntegrationRef];
type _Protocol = [Tool, ToolContext, ToolResult, RunEvent];

describe("@afps-spec/types module", () => {
  it("resolves as a value module", () => {
    expect(typeof types).toBe("object");
  });
});
