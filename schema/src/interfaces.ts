// SPDX-License-Identifier: CC-BY-4.0
// Copyright (c) 2026 Appstrate contributors

/**
 * AFPS Runtime Interfaces (schemaVersion 1.3+)
 *
 * Vendor-neutral interfaces that any AFPS-compliant runtime must expose
 * to its runners. The spec defines the shape; the runtime supplies default
 * implementations for the "internal" resolvers (Bundled*), and runners
 * provide their own "external" resolvers (ProviderResolver + EventSink).
 *
 * Source of truth: ../spec.md §8 (Runtime Interfaces)
 */

// ─────────────────────────────────────────────
// Primitives shared across interfaces
// ─────────────────────────────────────────────

/**
 * Minimal view of a loaded bundle passed to resolvers.
 *
 * Concrete runtime implementations may expose a richer shape, but every
 * AFPS-compliant runtime MUST at least satisfy this surface.
 */
export interface Bundle {
  /** Parsed agent manifest (agent.afps.yaml). */
  manifest: unknown;
  /** Digest of the bundle (SHA-256 hex) — used for signing and cache keys. */
  digest: string;
  /** Read a file from the bundle by relative path (e.g. "prompt.md"). */
  read(path: string): Promise<Uint8Array>;
  /** Read a file as UTF-8 text. */
  readText(path: string): Promise<string>;
  /** Check whether a file exists in the bundle. */
  exists(path: string): Promise<boolean>;
}

/** A dependency reference as declared in the agent manifest. */
export interface DependencyRef {
  /** Scoped package name (e.g. "@afps/memory"). */
  name: string;
  /** Semver range the resolver matches against (e.g. "^1.0.0"). */
  version: string;
}

export type ToolRef = DependencyRef;
export type ProviderRef = DependencyRef;
export type SkillRef = DependencyRef;

export interface PreludeRef extends DependencyRef {
  /**
   * When true, resolvers MAY skip this prelude if it cannot be resolved.
   * When false/undefined, missing preludes MUST fail the run fail-closed.
   */
  optional?: boolean;
}

/**
 * JSON-Schema-shaped parameter definition for a tool.
 * Kept as `unknown` at this layer to avoid pinning a specific JSON Schema
 * library; runtimes and tools are free to use their preferred typing.
 */
export type JSONSchema = Record<string, unknown>;

// ─────────────────────────────────────────────
// Tool — what the LLM sees at runtime
// ─────────────────────────────────────────────

/**
 * A Tool is the unit of capability surfaced to the LLM. Tools produced by
 * `ToolResolver` and by `ProviderResolver` share this contract — the LLM
 * cannot tell them apart.
 */
export interface Tool {
  /** Tool name as exposed to the LLM (e.g. "add_memory", "gmail_call"). */
  name: string;
  description: string;
  parameters: JSONSchema;
  /**
   * Execute the tool with parsed arguments. MUST NOT throw for normal
   * business failures — encode those as a non-ok ToolResult so the LLM
   * can recover. Throwing should be reserved for runtime faults.
   */
  execute(args: unknown, ctx: ToolContext): Promise<ToolResult>;
}

/**
 * Contract passed to a Tool at execution time.
 *
 * The context is the only path by which a tool communicates with the
 * rest of the runtime: via structured events (emit), the workspace
 * (on-disk scratch area), and cancellation (signal).
 */
export interface ToolContext {
  /** Emit a RunEvent to the runner's EventSink. Non-blocking. */
  emit(event: RunEvent): void;
  /** Absolute path to the run's scratch workspace directory. */
  workspace: string;
  /** Abort signal tied to the run; tool implementations SHOULD respect it. */
  signal: AbortSignal;
  /** Stable identifier for the current run. */
  runId: string;
  /** LLM-assigned identifier for this specific tool call, when available. */
  toolCallId?: string;
}

/**
 * Tool result surfaced back to the LLM.
 *
 * The `content` array mirrors the MCP/Anthropic tool-result format so that
 * runtimes can forward results with minimal translation. Binary payloads
 * SHOULD be surfaced as file references (see spec §8.4) rather than inline
 * bytes.
 */
export interface ToolResult {
  content: Array<
    | { type: "text"; text: string }
    | { type: "image"; data: string; mimeType: string }
    | { type: "resource"; uri: string; mimeType?: string }
  >;
  isError?: boolean;
}

// ─────────────────────────────────────────────
// RunEvent — open envelope for tool-emitted signals
// ─────────────────────────────────────────────

/**
 * RunEvent — open envelope emitted by tools during a run.
 *
 * The envelope (`type`, `timestamp`, `runId`) is stable so any EventSink
 * can route events without understanding their payload. The payload itself
 * is an open index signature so tools — including third-party tools — can
 * carry whatever data they need without amending the spec.
 *
 * Reserved `type` namespaces for core AFPS packages:
 *   - memory.*   (@afps/memory)
 *   - state.*    (@afps/state)
 *   - output.*   (@afps/output)
 *   - report.*   (@afps/report)
 *   - log.*      (@afps/log)
 *   - provider.* (@afps/provider-*, ProviderResolver implementations)
 *
 * Third-party tools SHOULD use their own namespace (e.g. "@my-org/audit.*").
 */
export interface RunEvent {
  /** "<domain>.<verb>" — discriminant chosen by the emitting tool. */
  type: string;
  /** Unix milliseconds at emission time. */
  timestamp: number;
  /** The run's stable identifier. */
  runId: string;
  /** LLM tool-call id, when the event originates from a tool call. */
  toolCallId?: string;
  /** Payload — tool-defined, open schema. */
  [key: string]: unknown;
}

// ─────────────────────────────────────────────
// Resolvers — four mirrored categories
// ─────────────────────────────────────────────

/**
 * Resolves `dependencies.tools[]` → Tool[] the runner registers with
 * the LLM. The default "bundled" implementation supplied by a runtime
 * loads tool code from `.agent-package/tools/{name}/` inside the bundle.
 */
export interface ToolResolver {
  resolve(refs: ToolRef[], bundle: Bundle): Promise<Tool[]>;
}

/**
 * Resolves `dependencies.providers[]` → Tool[]. Each produced Tool
 * encapsulates credential injection, authorizedUris enforcement, and
 * transport in its closure. Implementations are runner-specific
 * (SidecarProviderResolver, LocalProviderResolver, BitwardenProviderResolver, …).
 */
export interface ProviderResolver {
  resolve(refs: ProviderRef[], bundle: Bundle): Promise<Tool[]>;
}

/** Content of a resolved skill, ready to be concatenated into the prompt. */
export interface ResolvedSkill {
  name: string;
  version: string;
  content: string;
  frontmatter?: Record<string, unknown>;
}

/**
 * Resolves `dependencies.skills[]` → skill fragments for prompt composition.
 * Default bundled impl reads from `.agent-package/skills/{name}/`.
 */
export interface SkillResolver {
  resolve(refs: SkillRef[], bundle: Bundle): Promise<ResolvedSkill[]>;
}

/** Content of a resolved prelude, ready to be prepended to the prompt. */
export interface ResolvedPrelude {
  name: string;
  version: string;
  content: string;
}

/**
 * Resolves `systemPreludes[]` → prelude fragments. Missing non-optional
 * refs MUST fail the run fail-closed (`PreludeResolutionError`). Optional
 * refs (`optional: true`) MAY be silently skipped.
 */
export interface PreludeResolver {
  resolve(refs: PreludeRef[], bundle: Bundle): Promise<ResolvedPrelude[]>;
}

// ─────────────────────────────────────────────
// EventSink — business terminus
// ─────────────────────────────────────────────

/**
 * Accumulated end-of-run state a runner may assemble from the RunEvent
 * stream. Not imposed — runners are free to return their own shape from
 * `EventSink.finalize()` — but the listed fields carry conventional
 * semantics across AFPS-compliant runners.
 */
export interface RunResult {
  status: "success" | "failed" | "timeout" | "cancelled";
  /** Accumulated from `output.*` events. */
  output?: unknown;
  /** Accumulated from `report.*` events. */
  report?: string;
  /** Last `state.set` payload. */
  state?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * EventSink — environment-specific business terminus. The runtime never
 * supplies a default: every runner (Appstrate production, CLI, GitHub
 * Action, third-party) supplies its own.
 *
 * `handle` is called for every RunEvent. `finalize` is optional and, when
 * present, is invoked once at end-of-run to return an accumulated
 * {@link RunResult}.
 */
export interface EventSink {
  handle(event: RunEvent): Promise<void>;
  finalize?(): Promise<RunResult>;
}
