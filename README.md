# Agent Format Packaging Standard (AFPS)

![AFPS v1.0](https://img.shields.io/badge/AFPS-v1.0-blue)

AFPS is an open specification for declaring portable AI workflow packages.
It standardizes how agents, skills, tools, and providers are described, versioned, and distributed.
It focuses on package definition and composition, not on tool calling or agent-to-agent transport.

## Ecosystem Positioning

Existing AI agent standards define **capabilities** — what an agent can do and how it communicates. AFPS defines **goals** — what the agent should accomplish, packaged with everything it needs.

```text
                ┌───────────────────────────────┐
  Goal          │  AFPS Agent                   │  "Process my inbox and
                │  prompt.md + manifest.json    │  summarize support requests"
                ├───────────────────────────────┤
  Capability    │  Skills (SKILL.md)            │  "Rewrite in a professional tone"
                │  Tools (source + manifest)    │  "Fetch JSON from a URL"
                │  MCP Tools                    │  "Read a file, query a database"
                ├───────────────────────────────┤
  Connection    │  Providers (OAuth2, API key)  │  "Gmail, OpenAI, Slack"
                ├───────────────────────────────┤
  Transport     │  MCP / A2A                    │  Runtime protocols
                └───────────────────────────────┘
```

An agent's `prompt.md` is the equivalent of what a user would type to give an agent its objective. Skills and tools are the capabilities the agent draws on to reach that objective. Providers are the authenticated service connections. AFPS packages all of this into a portable, versioned `.afps` artifact (a standard ZIP file).

- **MCP** defines runtime tool invocation. AFPS does not define tool-calling transport; a runtime may choose to expose AFPS tools via MCP.
- **Agent Skills** defines reusable capabilities (`SKILL.md`). AFPS skill packages are a strict superset: a valid Agent Skill directory becomes an AFPS skill when a `manifest.json` is added. The `SKILL.md` format, frontmatter fields, and optional directories (`scripts/`, `references/`, `assets/`) are preserved unchanged. AFPS adds identity, versioning, and dependency resolution.
- **A2A** defines inter-agent communication. AFPS does not compete — A2A metadata can be added via `x-` extension fields.

No existing standard covers the goal layer: structured workflow packages with dependency resolution, semantic versioning, provider auth metadata, and a distribution format. AFPS fills that gap.

## Quick Start

Create a minimal agent package with two files:

**`manifest.json`**
```json
{
  "name": "@my-org/hello-world",
  "version": "1.0.0",
  "type": "agent",
  "schemaVersion": "1.0",
  "displayName": "Hello World",
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

A real agent declares the skills, tools, and providers it needs:

```text
                  ┌──────────────────────────────┐
                  │  @acme/customer-intake       │
                  │  type: agent                 │
                  │  prompt.md = the objective   │
                  └──────┬───────────────────────┘
                         │ dependencies
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
  ┌──────────────┐ ┌────────────┐ ┌────────────┐
  │ @acme/gmail  │ │ @acme/     │ │ @acme/     │
  │ provider     │ │ rewrite-   │ │ fetch-json │
  │ (OAuth2)     │ │ tone       │ │ tool       │
  │              │ │ skill      │ │            │
  └──────────────┘ └────────────┘ └────────────┘
```

The agent's manifest lists these in a single `dependencies` field with semver ranges. See the [full example](./examples/agent-full/manifest.json).

## Repository Contents

- [spec.md](./spec.md) — the AFPS v1.0 draft specification
- [primer.md](./primer.md) — non-normative introduction for newcomers
- [examples/](./examples/) — minimal and full package examples (agent, skill, tool, provider)
- [packages/](./packages/) — reference TS artefacts published to npm under `@afps-spec/*`
  - [packages/schema/](./packages/schema/) — JSON Schema + Zod (see [README](./packages/schema/README.md))
  - [packages/types/](./packages/types/) — TS bindings for the protocol
  - [packages/platform-tools/](./packages/platform-tools/) — reference impl of the 5 reserved tools
- [GOVERNANCE.md](./GOVERNANCE.md) — change process and stewardship
- [CONTRIBUTING.md](./CONTRIBUTING.md) — how to contribute
- [CHANGELOG.md](./CHANGELOG.md) — specification history

## Scope

AFPS defines:

- Package identity with scoped names and semantic versions
- Manifest fields for `agent`, `skill`, `tool`, and `provider`
- Dependencies and provider configuration
- A constrained schema system for input, output, and config
- ZIP package structure for distribution

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

