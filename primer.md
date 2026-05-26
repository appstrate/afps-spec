# AFPS Primer

This document is non-normative. It provides an accessible overview of AFPS concepts.
The normative specification is [spec.md](./spec.md).

## What is AFPS?

Agent Format Packaging Standard (AFPS) is an open specification for declaring portable AI workflow packages. Think of it as a packaging standard: it defines how to describe, version, and distribute the building blocks of AI workflows.

AFPS answers a specific question: **what is this AI workflow package, and what does it need?** It does not define how agents call tools, how agents talk to each other, or how a runtime executes prompts. Those concerns belong to other specifications.

### Where AFPS fits in the ecosystem

The key distinction is between **goals** and **capabilities**:

- A **skill** tells the agent *how to do something* — it is a reusable capability ("rewrite text in a professional tone").
- An **agent** tells the agent *what to accomplish* — it is the user's intent, packaged ("process my inbox and create a summary of support requests").

Agent Skills (Anthropic / AAIF) and MCP servers define capabilities. AFPS defines the goal layer that composes those capabilities into a complete, portable workflow:

```text
                ┌───────────────────────────────┐
  Goal          │  AFPS Agent                   │  The user's intent, packaged.
                │  prompt.md + manifest.json    │  "What should the agent accomplish?"
                ├───────────────────────────────┤
  Capability    │  AFPS Skills / MCP Servers    │  Reusable abilities the agent
                │  (SKILL.md / MCPB)            │  can draw on to reach the goal.
                ├───────────────────────────────┤
  Connection    │  AFPS Integrations            │  Authenticated access to
                │  (OAuth2, API key, ...)       │  external services.
                ├───────────────────────────────┤
  Transport     │  MCP (tool invocation)        │  Runtime protocols — out of
                │  A2A (agent-to-agent)         │  AFPS's scope.
                └───────────────────────────────┘
```

An agent's `prompt.md` replaces what a human would type to give an agent its objective. The agent manifest declares which skills, MCP servers, and integrations the agent needs to fulfill that objective. AFPS packages everything together into a versioned, distributable `.afps` artifact (a standard ZIP file).

MCP standardizes how an agent invokes tools at runtime. A2A standardizes how agents discover and communicate with each other. Agent Skills standardize reusable capability descriptions. MCPB standardizes how a local MCP server is packaged — and an AFPS `mcp-server` manifest adopts the MCPB field vocabulary (`server`, `tools`, `user_config`, `manifest_version`) at the root alongside AFPS-native fields. The full AFPS manifest is *not* a strict MCPB manifest and is not promised to install in an MCPB host as-is in 2.0; a publish-time projection to a strict MCPB bundle is reserved for a future minor. AFPS standardizes the goal and its dependencies — the package that gets published, installed, and composed before any of that happens. They are complementary.

AFPS is transport-agnostic: it does not prescribe how packages are fetched, transferred, or cached.

## The four package types

AFPS defines exactly four package types. Each one serves a distinct role.

### Agent

An agent is a complete AI workflow — the primary unit of execution. It represents the user's intent: a manifest describing what the workflow needs, paired with a `prompt.md` file containing the objective sent to a language model.

An agent execution is **non-interactive and run-to-completion**: the agent receives the objective, processes the task autonomously, and returns a structured result. There is no conversational back-and-forth — the agent runs from start to finish without user interaction.

Think of it like a `docker-compose.yml` for AI agents — it declares the goal, the dependencies, the inputs, the outputs, the configuration, and execution hints, all in one portable artifact. Where a skill says "I know how to rewrite text professionally", an agent says "process these emails and create a summary" — and lists the skills, MCP servers, and integrations needed to do it.

**Minimal example** (`manifest.json`):

```json
{
  "name": "@acme/customer-intake",
  "version": "1.0.0",
  "type": "agent",
  "schema_version": "2.0",
  "display_name": "Customer Intake",
  "author": "Acme Corp",
  "dependencies": {
    "integrations": { "@acme/gmail": "^1.0.0" }
  }
}
```

The companion `prompt.md` contains the actual instructions:

```markdown
# Customer Intake

Read the latest unread emails from the connected Gmail account and produce a structured summary of support requests, grouped by priority.
```

See [spec.md, Section 3.2](./spec.md#32-agent-manifest) for the full field reference.

### Skill

A skill is a declarative capability — a reusable instruction set that an agent can reference. AFPS skill packages are a **superset of the [Agent Skills](https://agentskills.io/) format**: a valid Agent Skill directory becomes a valid AFPS skill package when you add a `manifest.json`. The `SKILL.md` format, all frontmatter fields, and optional directories (`scripts/`, `references/`, `assets/`) are preserved unchanged. AFPS adds identity, versioning, and dependency resolution on top.

```text
rewrite-tone/
├── manifest.json       # AFPS addition: identity + versioning
├── SKILL.md            # Agent Skills format (unchanged)
├── scripts/            # Optional: executable code
├── references/         # Optional: additional documentation
└── assets/             # Optional: templates, resources
```

**`manifest.json`** — AFPS identity layer:

```json
{
  "name": "@acme/rewrite-tone",
  "version": "1.0.0",
  "type": "skill"
}
```

**`SKILL.md`** — Agent Skills format, unchanged:

```markdown
---
name: rewrite-tone
description: Rewrite a draft into a concise and professional tone.
---

# Rewrite Tone

## When to Use

- Improve the tone of a customer-facing draft
- Shorten verbose text without changing meaning
```

The SKILL.md frontmatter supports the fields defined by Agent Skills: `name`, `description`, `license`, `compatibility`, `metadata`, and `allowed-tools`. AFPS does not modify or extend this vocabulary.

See [spec.md, Section 3.3](./spec.md#33-skill-package) for details.

### MCP Server

An MCP server is a runnable tool server — executable code that an agent can invoke during agent execution, exposed over the Model Context Protocol. Where a skill provides instructions (declarative), an MCP server provides tools (executable).

An AFPS `mcp-server` manifest is AFPS-native at the root (scoped `name`, `type`, `schema_version`, `dependencies`) and adopts the **MCP Bundle (MCPB) vocabulary** for the server run declaration, the advisory tool list, and the user-configuration mechanism (`server`, `tools`, `user_config`, plus `manifest_version` to tag which MCPB-vocab version is used). This lets producers reuse MCPB tooling and conventions when authoring the server payload. The manifest as published is **not** a strict MCPB bundle and SHOULD NOT be expected to install into Claude Desktop or other MCPB hosts without a publish-time projection (reserved for a future minor).

```text
@acme/fetch-json.afps
├── manifest.json       # AFPS manifest + embedded MCPB-vocab fields
└── server/             # Bundled server payload (entry_point)
```

**`manifest.json`**:

```json
{
  "name": "@acme/fetch-json",
  "version": "1.0.0",
  "type": "mcp-server",
  "schema_version": "2.0",
  "manifest_version": "0.3",
  "display_name": "Fetch JSON",
  "description": "Fetch JSON from a URL and return the parsed response.",
  "server": {
    "type": "node",
    "entry_point": "server/index.js",
    "mcp_config": {
      "command": "node",
      "args": ["server/index.js"]
    }
  },
  "tools": [
    { "name": "fetch_json", "description": "Fetch JSON from a URL." }
  ]
}
```

`server` declares how the server is launched (MCPB vocabulary); the `tools` array advertises the tools it exposes. The scoped `name` is the AFPS package identity that `dependencies.mcp_servers` and an integration's `source.server` reference resolve against.

Because MCP servers contain executable code, they are the highest-risk package type.
See [spec.md, Section 3.4](./spec.md#34-mcp-server-package) and
[Section 8.2](./spec.md#82-mcp-server-code-execution) for security considerations.

### Integration

An integration is a credentialed binding to an external service — it describes how to reach a service and how to authenticate with it. An integration declares a **capability source** (`local` MCP server, `remote` MCP endpoint, or `api` HTTP surface), one or more **auth methods** (`oauth2`, `api_key`, `basic`, `mtls`, or `custom`), and how an acquired credential is **delivered** at runtime. Integrations MAY include an `INTEGRATION.md` companion file at the archive root with concise API documentation optimized for agent consumption.

**Example** — an API-key integration over an HTTP API (`manifest.json`):

```json
{
  "name": "@acme/openai",
  "version": "1.0.0",
  "type": "integration",
  "schema_version": "2.0",
  "display_name": "OpenAI",
  "source": { "kind": "api", "api": {} },
  "auths": {
    "api_key": {
      "type": "api_key",
      "credentials": {
        "schema": {
          "type": "object",
          "properties": {
            "api_key": { "type": "string", "description": "API key" }
          },
          "required": ["api_key"]
        }
      },
      "delivery": {
        "http": {
          "in": "header",
          "name": "Authorization",
          "prefix": "Bearer ",
          "value": "{$credential.api_key}"
        }
      },
      "authorized_uris": ["https://api.openai.com/**"]
    }
  }
}
```

See [spec.md, Section 3.5](./spec.md#35-integration-package) and
[Section 7](./spec.md#7-integration-authentication) for all auth methods.

## Key concepts

### Scoped names

Every AFPS package has a stable AFPS identity of the form `@scope/name`. Both segments are lowercase, alphanumeric, and may contain hyphens — but must start and end with a letter or digit. No underscores, no uppercase.

```text
@acme/customer-intake    valid
@my-org/gmail            valid
@Acme/Agent              invalid (uppercase)
@acme/my_agent           invalid (underscore)
acme/agent               invalid (missing @)
```

This is the top-level `name` field for all four package types. Scopes let registries enforce ownership: only authorized publishers can release packages within a scope.
See [spec.md, Section 2.2](./spec.md#22-package-identity).

### Semantic versioning

AFPS uses semantic versioning for package identity. Every package declares an exact version (e.g. `1.2.0`), and dependencies can use semver ranges (e.g. `^1.0.0`, `~2.1`).

The AFPS *manifest model* version is tracked separately by `schema_version` (a `MAJOR.MINOR` string such as `2.0`) on `agent`, `skill`, and `integration` manifests. An `mcp-server` has no `schema_version`; its versioning is governed by the MCPB `manifest_version` field.

See [spec.md, Section 2.3](./spec.md#23-versioning).

### ZIP archive format

AFPS packages are distributed as ZIP files. Every archive must contain `manifest.json` at the root. Depending on the package type, additional files are required:

| Type         | Required companion files                       |
|--------------|------------------------------------------------|
| agent        | `prompt.md` (non-empty)                        |
| skill        | `SKILL.md`                                     |
| mcp-server   | Server payload referenced by `server.entry_point` |
| integration  | Optional `INTEGRATION.md`                      |

Package archives should use the `.afps` file extension (e.g., `customer-intake-1.0.0.afps`). The file is a standard ZIP — any ZIP tool can open it — but the `.afps` extension makes packages immediately recognizable and enables OS-level file association with AFPS-aware tooling. An `mcp-server` archive is *not* a strict `.mcpb` bundle: while the embedded `server` / `tools` / `user_config` payload adopts the MCPB field vocabulary verbatim, the full AFPS manifest includes AFPS-native top-level fields outside the MCPB schema. A publish-time projection that emits a strict-MCPB bundle alongside the AFPS archive is reserved for a future minor (see `spec.md` §3.4).

Consumers must sanitize ZIP entries to prevent path traversal attacks.
See [spec.md, Section 2.5](./spec.md#25-package-archive-format).

### Dependencies

An agent composes skills, MCP servers, and integrations as dependencies. The diagram below separates *declaration* (what the manifest says) from *runtime* (what the resolved package set looks like), so the credentialed-server nesting is visible:

```text
  ╔═════════════════════ DECLARATION (manifest.json) ═══════════════════════╗
  ║  @acme/customer-intake (agent)                                          ║
  ║    dependencies.skills["@acme/rewrite-tone"]      = "^1.0.0"            ║
  ║    dependencies.mcp_servers["@acme/fetch-json"]   = "^1.0.0"            ║
  ║    dependencies.integrations["@acme/gmail"]       = { version: "^1.0.0",║
  ║                                                       scopes:  […],      ║
  ║                                                       auth_key:"oauth" } ║
  ╠═════════════════════════════════════════════════════════════════════════╣
  ║                  ↓ catalog resolution (semver range → concrete version) ║
  ╠═════════════════════ RUNTIME (resolved package set) ════════════════════╣
  ║  rewrite-tone@1.2.3 (skill) ─────────────────────► loaded as SKILL.md   ║
  ║  fetch-json@1.0.5   (mcp-server) ────────────────► spawned (no auth)    ║
  ║  gmail@1.4.0        (integration)                                        ║
  ║      └─ source.kind:"local" → gmail-server@2.1.0 (mcp-server)           ║
  ║                          ▲                                               ║
  ║                          │ OAuth2 token injected via delivery.http      ║
  ║                          │ (scopes from the agent dependency entry)      ║
  ╚═════════════════════════════════════════════════════════════════════════╝
```

The agent says *what to accomplish*. The dependencies provide *how* — reusable capabilities and service connections the agent draws on at runtime. A *credentialed* MCP server (Gmail) is wrapped by an integration whose `source.kind: "local"` points at it; the runtime applies the auth layer on top. A *utility* MCP server (fetch-json) needs no credentials and is a freestanding dependency.

All package types use a single `dependencies` field, grouped into three maps (`skills`, `mcp_servers`, `integrations`). Each entry is either a semver-range string or, for integrations, an object carrying the range plus per-dependency configuration (`scopes`, `auth_key`). A registry resolves and installs these packages when the parent package is published or imported; a runtime loads them when the agent executes.

```json
{
  "dependencies": {
    "skills": { "@acme/rewrite-tone": "^1.0.0" },
    "mcp_servers": { "@acme/fetch-json": "^1.0.0" },
    "integrations": {
      "@acme/gmail": {
        "version": "^1.0.0",
        "scopes": ["gmail.readonly"],
        "auth_key": "oauth"
      }
    }
  }
}
```

The `dependencies` object is grouped by package type (`skills`, `mcp_servers`, `integrations`). Each entry maps a scoped package name to either a semver range (compact form) or an object with a `version` range plus optional configuration (object form).

See [spec.md, Section 4.1](./spec.md#41-dependency-declaration).

### Schema system

AFPS describes three distinct sections in an agent manifest with JSON Schema. Although they share the same wrapper format, they serve different purposes:

- **`input`** — per-run data, supplied each time the agent runs (e.g., a search query, a file to process). Consumers should prompt for these values at each run.
- **`output`** — per-run result, produced at the end of each run (e.g., a summary, a report). Consumers may use this to validate the language model's response.
- **`config`** — per-deployment settings, configured once and reused across runs (e.g., preferred language, notification threshold). Consumers should persist these values.

Each section is a wrapper with a required `schema` member (a full JSON Schema 2020-12 object whose container is `type: "object"` with a `properties` map) plus optional AFPS metadata (`ui_hints`, `property_order`, `file_constraints`):

```json
{
  "input": {
    "schema": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "Search query"
        },
        "max_results": {
          "type": "number",
          "default": 20
        }
      },
      "required": ["query"]
    },
    "ui_hints": {
      "query": { "placeholder": "label:inbox newer_than:7d" }
    }
  },
  "config": {
    "schema": {
      "type": "object",
      "properties": {
        "language": {
          "type": "string",
          "description": "Output language",
          "default": "fr",
          "enum": ["fr", "en", "es"]
        }
      }
    }
  }
}
```

Inside the `schema` member, the full JSON Schema 2020-12 vocabulary is available — composition (`allOf`/`anyOf`/`oneOf`), conditionals (`if`/`then`/`else`), and references (`$ref`, `$defs`). The only AFPS constraint is the container shape: `type: "object"` with a `properties` map. File-upload fields are expressed with standard JSON Schema (`format: "uri"` plus `contentMediaType`); upload constraints such as `accept` and `max_size` live in the `file_constraints` wrapper field.

See [spec.md, Section 5](./spec.md#5-schema-system).

### Integration authentication

Integrations declare one or more auth methods under `auths`, keyed by a short identifier. Each method picks an authentication model:

| Type     | Use case                                | Key fields                                                          |
|----------|-----------------------------------------|---------------------------------------------------------------------|
| `oauth2` | OAuth 2.0 / OpenID Connect services     | `issuer` (discovery) or `authorization_endpoint` + `token_endpoint` |
| `api_key` | API key-based services                 | `credentials.schema` + `delivery`                                   |
| `basic`  | HTTP Basic authentication              | `credentials.schema` + `delivery` (`encoding: "base64"`)            |
| `custom` | Non-standard schemes / declarative login | `credentials.schema` and/or `connect` flow                          |

OAuth2 is **discovery-first**: given an `issuer`, a consumer fetches the authorization-server metadata document ([RFC 8414] / OpenID Connect Discovery) and uses its `authorization_endpoint`, `token_endpoint`, PKCE methods, and so on. Discovery is best-effort — every endpoint can be supplied manually for providers that publish no discovery document. Scopes are selected from an AFPS `scope_catalog` (with human labels and `implies` relationships), and every method declares a `delivery` (where the credential is injected: HTTP request, environment variable, or file).

Non-OAuth credential acquisition can be described declaratively with a `connect.login` flow, which aligns with the OpenAPI Arazzo request → assert → extract model.

See [spec.md, Section 7](./spec.md#7-integration-authentication).

### Extension conventions

AFPS manifests are extensible. Unknown fields are preserved by consumers rather than rejected. When adding custom fields, producers place them inside a top-level `_meta` object, keyed by a reverse-DNS namespace:

```json
{
  "name": "@acme/my-agent",
  "type": "agent",
  "schema_version": "2.0",
  "_meta": {
    "dev.afps/policy": { "tier": "high" },
    "dev.acme/cost-center": { "code": "eng-42" }
  }
}
```

This adopts the Model Context Protocol `_meta` convention. AFPS-defined fields live at the manifest root for all four package types; `_meta` is reserved for vendor extension data. (The `mcp`/`modelcontextprotocol` prefixes are reserved by MCP and must not be used.)

See [spec.md, Section 10](./spec.md#10-extensibility).

## What AFPS is NOT

To set clear expectations, here is what AFPS intentionally does not cover:

- **Not a tool-calling protocol.** AFPS does not define how an agent invokes tools at runtime. That is the domain of protocols like MCP.

- **Not an agent-to-agent transport.** AFPS does not define how agents discover or communicate with each other. That is the domain of protocols like A2A.

- **Not a prompt language.** AFPS requires a `prompt.md` file in agent packages, but it does not define prompt templating, variable interpolation, or execution semantics.

- **Not a runtime API.** AFPS does not specify how an agent runner loads packages, manages state, or handles scheduling. Those are implementation concerns.

- **Not a registry protocol.** AFPS defines what packages look like and how dependencies are declared, but it does not define the HTTP API for publishing, searching, or downloading packages.

- **Not a new server-packaging format.** For MCP servers, AFPS adopts MCPB verbatim rather than inventing its own format.

AFPS is a packaging standard. It defines the artifact — the ZIP file, the manifest, the companion files, the dependency declarations — and leaves execution, transport, and discovery to other layers.

## Further reading

- [Full specification](./spec.md) — the normative AFPS v2.0 draft
- [Governance](./GOVERNANCE.md) — how the specification evolves
- [Changelog](./CHANGELOG.md) — specification history

[RFC 8414]: https://datatracker.ietf.org/doc/html/rfc8414
