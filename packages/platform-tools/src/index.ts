// SPDX-License-Identifier: Apache-2.0

/**
 * `@afps/platform-tools` — reference TypeScript implementations of the
 * five AFPS 1.3 reserved platform tools: `log`, `memory` (add_memory),
 * `output`, `report`, `state` (set_state).
 *
 * Each tool ships as a named export for targeted use, plus the
 * `PLATFORM_TOOLS` map (keyed by canonical tool name) for runtimes
 * that auto-inject the whole set — e.g. pre-1.3 compatibility shims,
 * or 1.3+ runners that let agents omit the boilerplate when they want
 * the full platform surface.
 *
 * The manifest files are shipped alongside the source and reachable
 * via the `./manifests/<tool>.json` subpath exports. A bundle builder
 * can embed them verbatim or let the runtime resolve them from the
 * installed package.
 *
 * Spec reference: AFPS 1.3 §8.1 (reserved core domains).
 */

import type { Tool } from "@afps-spec/types";

import logTool from "./log.ts";
import memoryTool from "./memory.ts";
import outputTool from "./output.ts";
import reportTool from "./report.ts";
import stateTool from "./state.ts";

export { logTool, memoryTool, outputTool, reportTool, stateTool };

/**
 * Canonical map keyed by the tool's wire name (matching the `name`
 * field of each tool's manifest). Drop into a runner's tool registry
 * to inject the whole AFPS platform-tool set at once.
 */
export const PLATFORM_TOOLS: Record<string, Tool> = {
  log: logTool,
  add_memory: memoryTool,
  output: outputTool,
  report: reportTool,
  set_state: stateTool,
};
