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

Agent Skills (Anthropic / AAIF) and MCP Tools define capabilities. AFPS defines the goal layer that composes those capabilities into a complete, portable workflow:

```text
                ┌───────────────────────────────┐
  Goal          │  AFPS Agent                   │  The user's intent, packaged.
                │  prompt.md + manifest.json    │  "What should the agent accomplish?"
                ├───────────────────────────────┤
  Capability    │  AFPS Skills / Tools          │  Reusable abilities the agent
                │  MCP Tools                    │  can draw on to reach the goal.
                ├───────────────────────────────┤
  Connection    │  AFPS Providers               │  Authenticated access to
                │  (OAuth2, API key, ...)       │  external services.
                ├───────────────────────────────┤
  Transport     │  MCP (tool invocation)        │  Runtime protocols — out of
                │  A2A (agent-to-agent)         │  AFPS's scope.
                └───────────────────────────────┘
```

An agent's `prompt.md` replaces what a human would type to give an agent its objective. The agent manifest declares which skills, tools, and providers the agent needs to fulfill that objective. AFPS packages everything together into a versioned, distributable `.afps` artifact (a standard ZIP file).

MCP standardizes how an agent invokes tools at runtime. A2A standardizes how agents discover and communicate with each other. Agent Skills standardize reusable capability descriptions. AFPS standardizes the goal and its dependencies — the package that gets published, installed, and composed before any of that happens. The four are complementary.

AFPS is transport-agnostic: it does not prescribe how packages are fetched, transferred, or cached.

## The four package types

AFPS defines exactly four package types. Each one serves a distinct role.

### Agent

An agent is a complete AI workflow — the primary unit of execution. It represents the user's intent: a manifest describing what the workflow needs, paired with a `prompt.md` file containing the objective sent to a language model.

An agent execution is **non-interactive and run-to-completion**: the agent receives the objective, processes the task autonomously, and returns a structured result. There is no conversational back-and-forth — the agent runs from start to finish without user interaction.

Think of it like a `docker-compose.yml` for AI agents — it declares the goal, the dependencies, the inputs, the outputs, the configuration, and execution hints, all in one portable artifact. Where a skill says "I know how to rewrite text professionally", an agent says "process these emails and create a summary" — and lists the skills, tools, and providers needed to do it.

**Minimal example** (`manifest.json`):

```json
{
  "name": "@acme/customer-intake",
  "version": "1.0.0",
  "type": "agent",
  "schemaVersion": "1.0",
  "displayName": "Customer Intake",
  "author": "Acme Corp",
  "dependencies": {
    "providers": { "@acme/gmail": "^1.0.0" }
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

### Tool

A tool is a callable capability — executable code that an agent can invoke during agent execution. It consists of a manifest declaring the tool interface and an implementation source file. Where a skill provides instructions (declarative), a tool provides code (executable).

```text
@acme/fetch-json.afps
├── manifest.json     # Tool interface + metadata
└── tool.ts           # Implementation source file
```

**`manifest.json`**:

```json
{
  "name": "@acme/fetch-json",
  "version": "1.0.0",
  "type": "tool",
  "displayName": "Fetch JSON",
  "entrypoint": "tool.ts",
  "tool": {
    "name": "fetch_json",
    "description": "Fetch JSON from a URL and return the parsed response.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "url": { "type": "string", "description": "HTTP or HTTPS URL" }
      },
      "required": ["url"]
    }
  }
}
```

The `tool` object describes the interface — what the tool is called, what it does, and what parameters it accepts. This metadata is available to consumers without executing the source code.

The `entrypoint` field points to the implementation source file. AFPS does not prescribe the programming language, module format, or execution strategy — those are implementation concerns.

Because tools contain executable code, they are the highest-risk package type.
See [spec.md, Section 3.4](./spec.md#34-tool-package) and
[Section 8.2](./spec.md#82-tool-code-execution) for security considerations.

### Provider

A provider is a service connector — it describes how to authenticate with an external service. Providers declare an authentication mode (`oauth2`, `oauth1`, `api_key`, `basic`, or `custom`) and the metadata needed to establish a connection. Providers MAY include a `PROVIDER.md` companion file at the archive root containing concise API documentation optimized for agent consumption (key endpoints, request/response examples, common patterns).

**Example** — an API key provider (`manifest.json`):

```json
{
  "name": "@acme/openai",
  "version": "1.0.0",
  "type": "provider",
  "displayName": "OpenAI",
  "definition": {
    "authMode": "api_key",
    "credentials": {
      "schema": {
        "type": "object",
        "properties": {
          "apiKey": { "type": "string", "description": "API key" }
        },
        "required": ["apiKey"]
      }
    },
    "credentialHeaderName": "Authorization",
    "credentialHeaderPrefix": "Bearer",
    "authorizedUris": ["https://api.openai.com/*"]
  }
}
```

See [spec.md, Section 3.5](./spec.md#35-provider-package) and
[Section 7](./spec.md#7-provider-authentication) for all auth modes.

## Key concepts

### Scoped names

Every AFPS package has a scoped name of the form `@scope/name`. Both segments are lowercase, alphanumeric, and may contain hyphens — but must start and end with a letter or digit. No underscores, no uppercase.

```text
@acme/customer-intake    valid
@my-org/gmail            valid
@Acme/Agent              invalid (uppercase)
@acme/my_agent           invalid (underscore)
acme/agent               invalid (missing @)
```

Scopes let registries enforce ownership: only authorized publishers can release packages within a scope.
See [spec.md, Section 2.2](./spec.md#22-package-identity).

### Semantic versioning

AFPS uses semantic versioning for package identity. Every package declares an exact version (e.g. `1.2.0`), and dependencies can use semver ranges (e.g. `^1.0.0`, `~2.1`).

See [spec.md, Section 2.3](./spec.md#23-versioning).

### ZIP archive format

AFPS packages are distributed as ZIP files. Every archive must contain `manifest.json` at the root. Depending on the package type, additional files are required:

| Type      | Required companion files            |
|-----------|-------------------------------------|
| agent     | `prompt.md` (non-empty)             |
| skill     | `SKILL.md`                          |
| tool      | Source file referenced by `entrypoint` |
| provider  | Optional `PROVIDER.md`              |

Package archives should use the `.afps` file extension (e.g., `customer-intake-1.0.0.afps`). The file is a standard ZIP — any ZIP tool can open it — but the `.afps` extension makes packages immediately recognizable and enables OS-level file association with AFPS-aware tooling.

Consumers must sanitize ZIP entries to prevent path traversal attacks.
See [spec.md, Section 2.5](./spec.md#25-package-archive-format).

### Dependencies

An agent composes skills, tools, and providers as dependencies. The following diagram shows a typical agent and the packages it depends on:

```text
                  ┌──────────────────────────────────┐
                  │  @acme/customer-intake           │
                  │  type: agent                     │
                  │                                  │
                  │  prompt.md    = the objective    │
                  │  input/output = structured data  │
                  │  config       = user settings    │
                  └──────┬───────────────────────────┘
                         │ dependencies
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
  ┌──────────────┐ ┌────────────┐ ┌────────────┐
  │ @acme/gmail  │ │ @acme/     │ │ @acme/     │
  │ provider     │ │ rewrite-   │ │ fetch-json │
  │              │ │ tone       │ │            │
  │ OAuth2 creds │ │ skill      │ │ tool       │
  │ scopes       │ │ SKILL.md   │ │ source     │
  └──────────────┘ └────────────┘ └────────────┘
   connection       capability      capability
   "access Gmail"   "rewrite text   "fetch JSON
                     professionally"  from a URL"
```

The agent says *what to accomplish*. The dependencies provide *how* — reusable capabilities and service connections the agent draws on at runtime.

All package types use a single `dependencies` field to declare the packages they depend on. Values are semver ranges. A registry resolves and installs these packages when the parent package is published or imported; a runtime loads them when the agent executes.

```json
{
  "dependencies": {
    "providers": { "@acme/gmail": "^1.0.0" },
    "skills": { "@acme/rewrite-tone": "^1.0.0" },
    "tools": { "@acme/fetch-json": "^1.0.0" }
  }
}
```

The `dependencies` object is grouped by package type (`providers`, `skills`, `tools`). Each entry maps a scoped package name to a semver range.

See [spec.md, Section 4.1](./spec.md#41-dependency-declaration).

### Constrained schema system

AFPS defines a simplified schema system for three distinct sections in an agent manifest. Although they share the same format, they serve different purposes:

- **`input`** — per-execution data, supplied each time the agent runs (e.g., a search query, a file to process). Consumers should prompt for these values at each execution.
- **`output`** — per-execution result, produced at the end of each run (e.g., a summary, a report). Consumers may use this to validate the language model's response.
- **`config`** — per-deployment settings, configured once and reused across executions (e.g., preferred language, notification threshold). Consumers should persist these values.

The schema format is intentionally smaller than JSON Schema. Every schema must be an object with `type: "object"` and a `properties` map:

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
    "uiHints": {
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

Supported property types are `string`, `number`, `boolean`, `array`, `object`, and `file`. The `file` type supports additional hints like `accept`, `maxSize`, `multiple`, and `maxFiles`.

There is no nesting, no `$ref`, no `oneOf`/`anyOf` — the schema is flat by design, optimized for form generation and validation rather than complex data modeling.

See [spec.md, Section 5](./spec.md#5-schema-system).

### Provider authentication modes

Provider packages declare one of five authentication modes:

| Mode     | Use case                                | Requires                        |
|----------|-----------------------------------------|---------------------------------|
| `oauth2` | Standard OAuth 2.0 services            | `oauth2` sub-object with `authorizationUrl`, `tokenUrl`  |
| `oauth1` | Legacy OAuth 1.0a services             | `oauth1` sub-object with `requestTokenUrl`, `accessTokenUrl` |
| `api_key` | API key-based services                 | `credentials` sub-object with `schema`              |
| `basic`  | HTTP Basic authentication              | `credentials` sub-object with `schema`              |
| `custom` | Non-standard authentication schemes    | `credentials` sub-object with `schema`              |

Each auth-mode sub-object is extensible — implementations MAY add fields for PKCE support, custom scopes, token endpoint configuration, and other implementation-specific settings. Transversal fields like `authorizedUris` and `allowAllUris` remain at the `definition` level.

See [spec.md, Section 7](./spec.md#7-provider-authentication).

### Extension conventions

AFPS manifests are extensible. Unknown fields are preserved by consumers rather than rejected. When adding custom fields to a manifest or nested object, producers should use the `x-` prefix to avoid collisions with future specification fields:

```json
{
  "name": "@acme/my-agent",
  "type": "agent",
  "x-internal-team": "platform",
  "x-cost-center": "eng-42"
}
```

This follows the same convention used by OpenAPI and other extensible specifications.

## What AFPS is NOT

To set clear expectations, here is what AFPS intentionally does not cover:

- **Not a tool-calling protocol.** AFPS does not define how an agent invokes tools at runtime. That is the domain of protocols like MCP.

- **Not an agent-to-agent transport.** AFPS does not define how agents discover or communicate with each other. That is the domain of protocols like A2A.

- **Not a prompt language.** AFPS requires a `prompt.md` file in agent packages, but it does not define prompt templating, variable interpolation, or execution semantics.

- **Not a runtime API.** AFPS does not specify how an agent runner loads packages, manages state, or handles scheduling. Those are implementation concerns.

- **Not a registry protocol.** AFPS defines what packages look like and how dependencies are declared, but it does not define the HTTP API for publishing, searching, or downloading packages.

- **Not a full schema language.** The AFPS schema system is deliberately constrained. It is not JSON Schema. There is no nesting, no composition keywords, and no `$ref` support.

AFPS is a packaging standard. It defines the artifact — the ZIP file, the manifest, the companion files, the dependency declarations — and leaves execution, transport, and discovery to other layers.

## Further reading

- [Full specification](./spec.md) — the normative AFPS v1.0 draft
- [Examples](./examples/) — minimal and full examples for each package type
- [JSON Schema files](./schema/) — machine-readable schema definitions
- [Governance](./GOVERNANCE.md) — how the specification evolves
- [Changelog](./CHANGELOG.md) — specification history
