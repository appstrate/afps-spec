# @afps-spec/platform-tools

Reference TypeScript implementations of the five reserved platform
tools defined by [AFPS 1.3](https://github.com/appstrate/afps-spec)
§8.1:

| Tool name (wire) | Export           | Emits event       |
| ---------------- | ---------------- | ----------------- |
| `log`            | `logTool`        | `log.written`     |
| `add_memory`     | `memoryTool`     | `memory.added`    |
| `output`         | `outputTool`     | `output.emitted`  |
| `report`         | `reportTool`     | `report.appended` |
| `set_state`      | `stateTool`      | `state.set`       |

Every tool is framework-agnostic: it depends only on the
`Tool`/`ToolContext`/`ToolResult` contract from
[`@afps-spec/types`](../types) and emits canonical AFPS 1.3 events via
`ctx.emit`. Persistence, transport, and observability live in the
runtime's `EventSink`, not here.

## Install

```sh
bun add @afps-spec/platform-tools
```

## Usage

### Individual tools

```ts
import { outputTool, reportTool } from "@afps-spec/platform-tools";

// …wire into your runner's tool registry
const tools = [outputTool, reportTool];
```

### Full platform set

```ts
import { PLATFORM_TOOLS } from "@afps-spec/platform-tools";

// Register every reserved platform tool at once — e.g. to support
// pre-1.3 agents that expect the runtime to inject them implicitly.
for (const [name, tool] of Object.entries(PLATFORM_TOOLS)) {
  registry.register(name, tool);
}
```

### Per-tool subpath imports

```ts
import outputTool from "@afps-spec/platform-tools/output";
import outputManifest from "@afps-spec/platform-tools/manifests/output.json";
```

## Manifests

The canonical AFPS manifest for each tool is shipped alongside the
source under `manifests/`. Bundle builders can embed them verbatim, or
runtimes can load them at resolution time via the
`@afps-spec/platform-tools/manifests/<tool>.json` subpath export.

## Versioning

`@afps-spec/platform-tools@1.x` implements the tools mandated by AFPS 1.3.
A MAJOR bump tracks a breaking change in the tool contract (parameters
or event envelope); MINOR adds a new reserved tool or a non-breaking
field.

## License

[Apache-2.0](../../LICENSE)
