# Agent Format Packaging Standard (AFPS)

![AFPS v2.0](https://img.shields.io/badge/AFPS-v2.0-blue)

AFPS is an open specification for declaring portable AI workflow packages.
It standardizes how agents, skills, MCP servers, and integrations are described, versioned, and distributed.
It focuses on package definition and composition, not on tool calling or agent-to-agent transport.

## Ecosystem Positioning

Existing AI standards each package a single artifact type (MCPB → one MCP server; Agent Skills → one skill; A2A AgentCard → one runtime agent endpoint). AFPS is a **packaging-and-composition format**: one archive declares an agent's goal **and** every skill, MCP server, and integration it needs, with versioned dependencies between them.

```text
  ─────────────────────────────────────────────────────────────────────
  Distribution    │ AFPS Registry · npm · OCI · any HTTP store        │  not in spec —
                  │ (hosts versioned .afps archives)                  │  transport-agnostic
  ─────────────────────────────────────────────────────────────────────
                                    ▲ publish / fetch
                                    │
  ─────────────────────────────────────────────────────────────────────
  Packaging       │ ┌───────────────────────────────────────────────┐ │
  (this spec)     │ │  AFPS  .afps  (ZIP)                           │ │
                  │ │  manifest.json + companions                   │ │
                  │ │  ┌─────────┬───────┬───────────────────────┐  │ │
                  │ │  │ agent   │ skill │ mcp-server            │  │ │
                  │ │  │ (NEW)   │       │ (MCPB vocab)          │  │ │
                  │ │  ├─────────┴───────┴───────────────────────┤  │ │
                  │ │  │ integration: source + auths + delivery │  │ │
                  │ │  └────────────────────────────────────────┘  │ │
                  │ └───────────────────────────────────────────────┘ │
  ─────────────────────────────────────────────────────────────────────
                                    ▲ consumed by
                                    │
  ─────────────────────────────────────────────────────────────────────
  Runtime         │ Agent runtime executes prompt.md, resolves        │  not in spec
                  │ dependencies, applies integration auth            │
  ─────────────────────────────────────────────────────────────────────
                                    ▲ talks to services via
                                    │
  ─────────────────────────────────────────────────────────────────────
  Wire protocols  │ MCP (tool calls) · HTTP/REST · A2A (agent-to-     │  not in spec
                  │ agent)                                            │
  ─────────────────────────────────────────────────────────────────────
```

Peer packaging formats and AFPS's relation to each:

```text
  Format         │ What it packages                  │ AFPS relation
  ───────────────┼───────────────────────────────────┼────────────────────────────────
  MCPB           │ a single local MCP server         │ field vocab adopted by mcp-server
  Agent Skills   │ a single capability (SKILL.md)    │ superset adopted by skill
  A2A AgentCard  │ runtime discovery of one agent    │ optional, attached via _meta
  npm package    │ generic JS/TS code distribution   │ metadata fields aligned
  ───────────────┼───────────────────────────────────┼────────────────────────────────
  AFPS           │ goal + skills + servers +         │ this spec — one archive,
                 │ integrations + dependencies +     │ four artifact types,
                 │ schemas — in one ZIP              │ versioned + composable
```

- **MCP** defines runtime tool invocation. AFPS does not define tool-calling transport; a runtime MAY choose to expose AFPS capabilities via MCP.
- **MCPB** defines how a local MCP server is packaged. An AFPS `mcp-server` manifest adopts the MCPB field vocabulary (`server`, `tools`, `user_config`, `manifest_version`) at the root alongside AFPS-native fields. Strict-MCPB host interoperability is not promised in 2.0; a publish-time projection is reserved for a future minor.
- **Agent Skills** defines reusable capabilities (`SKILL.md`). AFPS skill packages are a strict superset: a valid Agent Skill directory becomes an AFPS skill when a `manifest.json` is added. The `SKILL.md` format, frontmatter fields, and optional directories (`scripts/`, `references/`, `assets/`) are preserved unchanged. AFPS adds identity, versioning, and dependency resolution.
- **A2A** defines inter-agent communication. AFPS does not compete — A2A metadata can be added via the `_meta` extension mechanism.

No existing standard covers the *composition* layer: structured workflow packages with dependency resolution, semantic versioning, integration auth metadata, and a single distribution archive. AFPS fills that gap.

## Quick Start

Create a minimal agent package with two files:

**`manifest.json`**
```json
{
  "name": "@my-org/hello-world",
  "version": "1.0.0",
  "type": "agent",
  "schema_version": "2.0",
  "display_name": "Hello World",
  "author": "My Org",
  "dependencies": {}
}
```

**`prompt.md`**
```markdown
Summarize the latest unread emails and list any action items.
```

ZIP both files together (using the `.afps` extension by convention) — that's a valid AFPS agent package. See [examples/](./examples/) for more, or read the [primer](./primer.md) for a guided introduction.

### How an agent composes its dependencies

A real agent declares its dependencies in three named maps (`skills`, `mcp_servers`, `integrations`) with semver ranges, and may add per-dependency configuration on the integration entries (`scopes`, `auth_key`). A credentialed MCP server is normally wrapped by an integration whose `source.kind: "local"` points at it; a freestanding `mcp_servers` dependency is appropriate only for utility servers that need no credentials.

```text
  ┌──────────────────────────────────────────────────────────────────────┐
  │  @acme/customer-intake  (type: agent · v1.0.0 · .afps ZIP)           │
  │                                                                      │
  │  "dependencies": {                                                   │
  │    "skills":       { "@acme/rewrite-tone": "^1.0.0" },               │
  │    "mcp_servers":  { "@acme/fetch-json":   "^1.0.0" },               │
  │    "integrations": { "@acme/gmail": { "version":  "^1.0.0",          │
  │                                       "scopes":   ["gmail.read"],    │
  │                                       "auth_key": "oauth" } }        │
  │  }                                                                   │
  └────────┬──────────────────────┬───────────────────────┬──────────────┘
           │ resolves against     │                       │
           │ a package catalog    │                       │
           │ (semver range →      │                       │
           │  concrete version)   │                       │
           ▼                      ▼                       ▼
  ┌──────────────────┐  ┌────────────────────┐  ┌──────────────────────────┐
  │ @acme/           │  │ @acme/fetch-json   │  │ @acme/gmail              │
  │ rewrite-tone     │  │ (mcp-server,       │  │ (integration)            │
  │ (skill)          │  │  utility — no auth)│  │ auths: { oauth, apikey } │
  │ SKILL.md +       │  │ MCPB-vocab payload │  │ source.kind: "local"     │
  │ scripts/ ...     │  │ at root            │  │ delivery.http: Bearer …  │
  └──────────────────┘  └────────────────────┘  └────────────┬─────────────┘
                                                             │ source.server →
                                                             ▼
                                                ┌──────────────────────────┐
                                                │ @acme/gmail-server       │
                                                │ (mcp-server, MCPB        │
                                                │  payload; runtime injects│
                                                │  the OAuth token at run) │
                                                └──────────────────────────┘
```

Each box is one published `.afps` archive. See the [primer](./primer.md) for a worked example with the full manifest contents.

## Repository Contents

- [spec.md](./spec.md) — the AFPS v2.0 draft specification
- [primer.md](./primer.md) — non-normative introduction for newcomers
- [examples/](./examples/) — minimal and full package examples (agent, skill, mcp-server, integration)
- [packages/](./packages/) — reference TS artefacts published to npm under `@afps-spec/*`
  - [packages/schema/](./packages/schema/) — JSON Schema + Zod (see [README](./packages/schema/README.md))
  - [packages/types/](./packages/types/) — TS bindings for AFPS 2.0 contracts
- [GOVERNANCE.md](./GOVERNANCE.md) — change process and stewardship
- [CONTRIBUTING.md](./CONTRIBUTING.md) — how to contribute
- [CHANGELOG.md](./CHANGELOG.md) — specification history

## Scope

AFPS defines:

- Package identity with scoped names and semantic versions
- Manifest fields for `agent`, `skill`, `mcp-server`, and `integration`
- A dependency model with semver ranges and per-dependency configuration (e.g. requested OAuth scopes)
- A JSON Schema 2020-12 based schema system for input, output, and config
- ZIP package structure for distribution
- Integration authentication metadata: OAuth 2.0 / OIDC discovery, credential schema, credential delivery (`http` / `env` / `files`), declarative credential acquisition (`connect`), per-tool policy, URI restrictions, and setup-guide hints

AFPS does not define:

- Agent runtime APIs
- Prompt execution semantics
- Tool invocation transport
- Agent-to-agent messaging

## Origin

AFPS was created by Appstrate and published as an independent open specification.

## Implementations

See [IMPLEMENTATIONS.md](./IMPLEMENTATIONS.md) for known implementations.

## Contributing

See [GOVERNANCE.md](./GOVERNANCE.md) for the change process.
To propose a normative or editorial change, open an issue using the [spec change template](./.github/ISSUE_TEMPLATE/spec-change.yml).

## License

All content in this repository is licensed under [CC-BY-4.0](./LICENSE).

