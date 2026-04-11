# Agent Format Packaging Standard (AFPS) Specification

**Copyright** &copy; 2026 Appstrate contributors. Licensed under [CC-BY-4.0](./LICENSE).

## Version 1.0 -- Draft

### Abstract

Agent Format Packaging Standard (AFPS) is an open specification for declaring portable AI workflow packages. It defines a JSON-based manifest format for four package types — agents, skills, tools, and providers — along with their dependency model, schema system, archive layout, and provider authentication metadata. AFPS standardizes package definition and composition; it does not define tool-calling protocols, agent-to-agent transport, or runtime execution APIs.

### Status of this Document

This document is a **draft** of the AFPS v1.0 specification. It is published for community review and early implementation feedback.

- **Status**: Draft
- **Version**: 1.0
- **Date**: 2026-03-14
- **Editor**: Appstrate contributors
- **Feedback**: [GitHub Issues](https://github.com/appstrate/afps-spec/issues) using the [spec change template](https://github.com/appstrate/afps-spec/issues/new?template=spec-change.yml)
- **License**: [CC-BY-4.0](./LICENSE)

This draft is published for community review and early implementation feedback. It is expected to evolve based on implementation experience and community input before reaching a stable release.

### Table of Contents

- [1. Introduction](#1-introduction)
  - [1.1 Purpose](#11-purpose)
  - [1.2 Scope](#12-scope)
    - [1.2.1 Relationship to Other Standards](#121-relationship-to-other-standards)
  - [1.3 Terminology](#13-terminology)
  - [1.4 Conformance](#14-conformance)
- [2. Package Model](#2-package-model)
  - [2.1 Package Types](#21-package-types)
  - [2.2 Package Identity](#22-package-identity)
  - [2.3 Versioning](#23-versioning)
  - [2.4 Schema Version Compatibility](#24-schema-version-compatibility)
  - [2.5 Package Archive Format](#25-package-archive-format)
- [3. Manifest Specification](#3-manifest-specification)
  - [3.1 Common Fields](#31-common-fields)
  - [3.2 Agent Manifest](#32-agent-manifest)
  - [3.3 Skill Package](#33-skill-package)
  - [3.4 Tool Package](#34-tool-package)
  - [3.5 Provider Package](#35-provider-package)
- [4. Dependency Model](#4-dependency-model)
  - [4.1 Dependency Declaration](#41-dependency-declaration)
  - [4.2 Version Range Resolution](#42-version-range-resolution)
  - [4.3 Circular Dependencies](#43-circular-dependencies)
  - [4.4 Provider Configuration](#44-provider-configuration)
- [5. Schema System](#5-schema-system)
  - [5.1 JSON Schema Properties](#51-json-schema-properties)
  - [5.2 File Field Convention](#52-file-field-convention)
  - [5.3 Schema Object Structure](#53-schema-object-structure)
  - [5.4 Input, Output, and Config Schemas](#54-input-output-and-config-schemas)
- [6. Execution Model](#6-execution-model)
  - [6.1 Execution Context](#61-execution-context)
  - [6.2 Timeout](#62-timeout)
- [7. Provider Authentication](#7-provider-authentication)
  - [7.1 Auth Modes](#71-auth-modes)
  - [7.2 OAuth2 Configuration](#72-oauth2-configuration)
  - [7.3 OAuth1 Configuration](#73-oauth1-configuration)
  - [7.4 Credential Schema](#74-credential-schema)
  - [7.5 URI Restrictions](#75-uri-restrictions)
  - [7.6 Setup Guide](#76-setup-guide)
- [8. Security Considerations](#8-security-considerations)
  - [8.1 Archive Processing](#81-archive-processing)
  - [8.2 Tool Code Execution](#82-tool-code-execution)
  - [8.3 Credential Handling](#83-credential-handling)
  - [8.4 Prompt Injection](#84-prompt-injection)
  - [8.5 Supply Chain](#85-supply-chain)
  - [8.6 URI Restrictions](#86-uri-restrictions)
- [9. Privacy Considerations](#9-privacy-considerations)
- [10. Extensibility](#10-extensibility)
  - [10.1 Extension Field Convention](#101-extension-field-convention)
  - [10.2 Future Standard Fields](#102-future-standard-fields)
- [11. References](#11-references)
- [Appendices](#appendices)
  - [Appendix A. Field Reference Table](#appendix-a-field-reference-table)
  - [Appendix B. Regex Patterns](#appendix-b-regex-patterns)
  - [Appendix C. Default Values](#appendix-c-default-values)
  - [Appendix D. Origins](#appendix-d-origins)

---

## 1. Introduction

### 1.1 Purpose

Agent Format Packaging Standard (AFPS) defines a declarative package format for AI workflows and closely related package types.

The central artifact in AFPS is the **agent** — a package that captures the user's intent (via a `prompt.md` companion file) together with everything the agent needs to fulfill it: skills, tools, provider connections, input and output schemas, and execution settings. An agent execution is **non-interactive and run-to-completion**: the agent receives the objective, the input data, and the available resources, processes the task autonomously, and returns a structured result. There is no conversational back-and-forth — the agent runs from start to finish without user interaction. Where other standards define agent capabilities (what an agent *can do*), an AFPS agent defines an objective (what the agent *should accomplish*).

AFPS also defines three supporting package types — **skills** (reusable instructions), **tools** (callable capabilities), and **providers** (service connectors) — that agents compose as dependencies.

The goal of AFPS is to let producers publish portable artifacts that describe:

- what a package is;
- which other packages it depends on;
- which provider connections it expects;
- which input, output, and configuration shapes it exposes; and
- which companion files are required for distribution.

AFPS is intentionally centered on package definition. It standardizes package metadata and package layout, not runtime execution APIs.

### 1.2 Scope

This specification defines:

- package types: `agent`, `skill`, `tool`, `provider`;
- package identity and versioning;
- manifest fields and companion file requirements;
- ZIP archive structure;
- dependency declaration and dependency cycle semantics;
- a constrained schema system used by `input`, `output`, `config`, and selected credential definitions; and
- provider authentication metadata.

This specification does not define:

- tool-calling protocols;
- agent-to-agent transport;
- prompt semantics beyond package structure;
- user interface behavior; or
- registry APIs.

AFPS is transport-agnostic: it does not prescribe how packages are fetched, transferred, or cached.

### 1.2.1 Relationship to Other Standards

AFPS operates at a different abstraction level than existing AI agent standards. The key distinction is between **goal** (what should be accomplished) and **capability** (how to accomplish a specific task):

```text
┌─────────────────────────────────────────────────────────┐
│  Goal layer          AFPS Agent                         │
│                      "Process my inbox and create       │
│                       a summary of support requests"    │
│                      = the user's intent, packaged      │
├─────────────────────────────────────────────────────────┤
│  Capability layer    AFPS Skills / Tools                │
│                      "Rewrite text in a professional    │
│                       tone" / "Fetch JSON from a URL"   │
│                      = reusable abilities the agent     │
│                        can draw on to reach the goal    │
├─────────────────────────────────────────────────────────┤
│  Connection layer    AFPS Providers                     │
│                      "Gmail via OAuth2"                 │
│                      = authenticated access to          │
│                        external services                │
└─────────────────────────────────────────────────────────┘
```

An agent's `prompt.md` replaces what a human would type to give an agent its objective. Skills, tools, and providers are the resources the agent uses to fulfill that objective. AFPS packages all of these together into a portable, versioned artifact.

Existing standards address different concerns:

- **MCP** [Model Context Protocol]: defines how agents invoke tools at runtime (JSON-RPC transport). AFPS does not define tool-calling transport. A runtime MAY choose to expose AFPS tools via MCP, but this is an implementation concern, not an AFPS requirement.
- **Agent Skills** [Anthropic / AAIF]: defines the `SKILL.md` format for declaring reusable agent capabilities. AFPS skill packages (§3.3) are a strict superset of Agent Skills: a valid Agent Skill directory (`SKILL.md` plus optional `scripts/`, `references/`, `assets/`) becomes a valid AFPS skill package when a `manifest.json` is added. The `SKILL.md` format, including all frontmatter fields defined by Agent Skills, is preserved unchanged. AFPS adds package identity, versioning, dependency declarations, and a distribution format — it does not alter the skill content model. Skills define **capabilities**, not **goals** — the goal comes from the AFPS agent that composes them.
- **A2A** [Agent-to-Agent Protocol]: defines inter-agent discovery and communication. AFPS does not compete with A2A; a future extension could declare A2A Agent Card metadata within an AFPS manifest using the `x-` convention (§10).

These standards are complementary and operate at different layers:

```text
Discovery    MCP Registry / A2A Agent Cards     "where to find agents and tools"
Transport    MCP JSON-RPC / A2A Tasks            "how agents communicate at runtime"
Capability   Agent Skills / MCP Tools            "what an agent knows how to do"
Goal         AFPS Agent                           "what the agent should accomplish"
Packaging    AFPS                                 "how it is all declared and distributed"
```

### 1.3 Terminology

- **Producer**: software or a human author that emits AFPS packages.
- **Consumer**: software that reads, validates, installs, or executes AFPS packages. Three conformance targets are recognized:
  - **AFPS Producer**: emits manifests and package archives conforming to this specification.
  - **AFPS Consumer**: reads, validates, and processes AFPS packages.
  - **AFPS Registry**: stores versioned AFPS packages, resolves dependencies, and enforces publish-time constraints.
- **Manifest**: the root `manifest.json` file contained in every AFPS package archive.
- **Companion file**: a required non-manifest file such as `prompt.md`, `SKILL.md`, or a tool source file.
- **Dependency**: an entry under `dependencies`, declaring a package that this package depends on, with a semver version range.

### 1.4 Conformance

The key words "MUST", "MUST NOT", "REQUIRED", "SHOULD", "SHOULD NOT", and "MAY" in this document are to be interpreted as described in BCP 14 [RFC 2119] [RFC 8174] when, and only when, they appear in all capitals, as shown here.

Conforming producers MUST emit manifests and package archives that satisfy the requirements in this document. Conforming consumers MUST reject malformed packages and SHOULD preserve unknown fields when round-tripping manifests. AFPS v1.0 intentionally allows extensibility: manifests and several nested objects accept additional fields unless this specification explicitly forbids them. Extension fields MUST follow the naming convention defined in §10.

## 2. Package Model

### 2.1 Package Types

AFPS defines four package types:

- `agent`: a complete workflow package consisting of manifest metadata and a `prompt.md` companion file;
- `skill`: a declarative capability package consisting of a minimal manifest and `SKILL.md`;
- `tool`: a runtime capability package consisting of a manifest declaring a single tool interface plus an implementation source file referenced by `entrypoint`;
- `provider`: a service connector package described entirely by `manifest.json`.

A package's `type` field is the dispatch key used by validators and archive parsers. Producers MUST set it to exactly one of the values above.

### 2.2 Package Identity

Every AFPS package MUST have a scoped name of the form `@scope/name`. The `scope` and `name` segments MUST each match `SLUG_PATTERN`:

```text
[a-z0-9]([a-z0-9-]*[a-z0-9])?
```

As a consequence:

- uppercase letters are not allowed;
- underscores are not allowed;
- a slug MUST start and end with an alphanumeric character; and
- hyphens MAY appear only in the middle.

The full scoped-name pattern is:

```text
^@[a-z0-9]([a-z0-9-]*[a-z0-9])?\/[a-z0-9]([a-z0-9-]*[a-z0-9])?$
```

### 2.3 Versioning

The top-level `version` field MUST be a valid semantic version per [SemVer]. Dependency values MUST be valid semantic version ranges.

AFPS itself does not define its own range syntax. It delegates version parsing and range parsing to widely used semantic-version semantics. In practice:

- package versions are exact semantic versions such as `1.0.0`;
- dependency declarations use ranges such as `^1.0.0`, `~2.1`, `>=3.0.0`, or `*`;
- prerelease handling follows the semver implementation used by the consumer; and
- when resolving ranges against a catalog, consumers SHOULD pick the highest satisfying version.

How consumers resolve version ranges against a package catalog is an implementation concern.

### 2.4 Schema Version Compatibility

When a consumer encounters a manifest whose `schemaVersion` has a higher MAJOR number than the highest version it supports, it MUST reject the manifest and SHOULD report an error identifying the unsupported schema version. Processing a manifest with an unknown major version could lead to silent data loss or incorrect behavior.

When a consumer encounters a manifest whose `schemaVersion` has the same MAJOR number but a higher MINOR number than the highest version it supports, it SHOULD process the manifest on a best-effort basis. Unknown fields SHOULD be preserved. Consumers MAY emit a warning indicating that some fields may not be fully understood.

When `schemaVersion` is absent from a skill, tool, or provider manifest (where the field is optional), consumers SHOULD treat the package as targeting schema version `1.0`.

### 2.5 Package Archive Format

AFPS packages are distributed as ZIP archives.

Every package archive MUST contain `manifest.json` at the archive root. Additional required files depend on `manifest.type`:

| Type | Required companion content |
| --- | --- |
| `agent` | `prompt.md` at archive root, non-empty |
| `skill` | `SKILL.md` at archive root; optional `scripts/`, `references/`, `assets/` directories (see §3.3) |
| `tool` | source file referenced by manifest `entrypoint`; optional `TOOL.md` |
| `provider` | optional `PROVIDER.md` at archive root |

Producers SHOULD use the `.afps` file extension for package archives (e.g., `customer-intake-1.0.0.afps`). Consumers MUST accept archives regardless of file extension. The `.afps` extension is a convention for human recognition and tool association; it does not alter the archive format, which remains standard ZIP.

All text files in the archive MUST be encoded in UTF-8.

Consumers SHOULD sanitize ZIP entries before processing them. At minimum, entries with path traversal segments (`..`), absolute paths, null bytes, backslashes, `__MACOSX/` prefixes, or directory-only entries SHOULD be ignored.

## 3. Manifest Specification

All manifests are JSON objects. Unknown top-level fields and unknown nested fields in extensible objects are allowed by the validation model and SHOULD be preserved by tooling unless a tool intentionally normalizes the manifest.

### 3.1 Common Fields

#### `name`
- **Type**: string
- **Required**: MUST for all package types
- **Format**: scoped name matching `^@${SLUG_PATTERN}\/${SLUG_PATTERN}$`
- **Description**: Globally unique package identifier.
- **Example**: `@example/customer-intake`
- **Default**: none

#### `version`
- **Type**: string
- **Required**: MUST for all package types
- **Format**: valid semantic version
- **Description**: Version of the package being published.
- **Example**: `1.2.0`
- **Default**: none

#### `type`
- **Type**: string
- **Required**: MUST for all package types
- **Format**: one of `agent`, `skill`, `tool`, `provider`
- **Description**: Determines package validation and required companion files.
- **Example**: `agent`
- **Default**: none

#### `displayName`
- **Type**: string
- **Required**: MUST for `agent`; SHOULD for `skill`, `tool`, and `provider`
- **Format**: for agents, minimum length 1
- **Description**: Human-facing label for the package.
- **Example**: `Customer Intake Assistant`
- **Default**: none

#### `description`
- **Type**: string
- **Required**: MAY
- **Format**: free text
- **Description**: Short summary of package purpose.
- **Example**: `Collects inbound requests and produces a structured summary.`
- **Default**: none

#### `keywords`
- **Type**: array of strings
- **Required**: MAY
- **Format**: JSON string array
- **Description**: Search and classification keywords.
- **Example**: `["workflow", "email", "support"]`
- **Default**: none

#### `license`
- **Type**: string
- **Required**: MAY
- **Format**: free text or SPDX-like identifier
- **Description**: Declares package licensing metadata.
- **Example**: `MIT`
- **Default**: none

#### `repository`
- **Type**: string
- **Required**: MAY
- **Format**: free text; URI recommended
- **Description**: Source repository or project home.
- **Example**: `https://example.com/afps/customer-intake`
- **Default**: none

#### `schemaVersion`
- **Type**: string
- **Required**: MUST for `agent`; MAY for other package types
- **Format**: `MAJOR.MINOR` where both segments are non-negative integers (e.g., `1.0`, `2.1`). The format follows a subset of semantic versioning without the patch component. A change in `MAJOR` indicates a breaking manifest model change; a change in `MINOR` indicates an additive, backwards-compatible revision.
- **Description**: Declares which version of the AFPS manifest model the package targets. This field allows consumers to select the appropriate validation rules when the specification evolves. Producers MUST emit `1.0` for packages targeting this draft.
- **Example**: `1.0`
- **Default**: none

#### `dependencies`
- **Type**: object
- **Required**: MAY
- **Format**: object containing optional `skills`, `tools`, and `providers` maps. Values MUST be valid semver ranges.
- **Description**: Declares packages that this package depends on. Consumers use this field for dependency resolution, installation, and composition.
- **Example**: `{ "providers": { "@example/gmail": "^1.0.0" }, "skills": { "@example/rewrite-tone": "^1.0.0" } }`
- **Default**: none

### 3.2 Agent Manifest

Agent manifests extend the common fields above. A conforming agent manifest MUST include `schemaVersion`, `displayName`, and `author`. Providers listed in `providersConfiguration` SHOULD also be declared in `dependencies.providers`.

#### `author`
- **Type**: string
- **Required**: MUST for `agent`
- **Format**: free text
- **Description**: Human author or publishing identity for the agent.
- **Example**: `AFPS Examples`
- **Default**: none

#### `providersConfiguration`
- **Type**: object
- **Required**: MAY
- **Format**: map keyed by provider package id
- **Description**: Per-provider runtime configuration such as scopes.
- **Example**: `{ "@example/gmail": { "scopes": ["gmail.readonly"] } }`
- **Default**: none

#### `input`
- **Type**: object
- **Required**: MAY
- **Format**: wrapper object containing a required `schema` member
- **Description**: Describes per-run input — data that a user or caller supplies each time the agent runs. A consumer SHOULD prompt for input values at run time. Typical examples include a search query, a file to process, or a message to analyze.
- **Example**: `{ "schema": { "type": "object", "properties": { "query": { "type": "string" } } } }`
- **Default**: none

#### `output`
- **Type**: object
- **Required**: MAY
- **Format**: wrapper object containing a required `schema` member
- **Description**: Describes the structured result that the agent produces at the end of each run. A consumer MAY use this schema to validate or parse the language model's response.
- **Example**: `{ "schema": { "type": "object", "properties": { "summary": { "type": "string" } } } }`
- **Default**: none

#### `config`
- **Type**: object
- **Required**: MAY
- **Format**: wrapper object containing a required `schema` member
- **Description**: Describes agent configuration — settings that are defined once during setup and remain constant across runs. A consumer SHOULD persist config values and reuse them without prompting on each run. Typical examples include a preferred language, a target folder, or a notification threshold. Config values MAY have `default` values in the schema.
- **Example**: `{ "schema": { "type": "object", "properties": { "language": { "type": "string", "default": "fr" } } } }`
- **Default**: none

#### `timeout`
- **Type**: number
- **Required**: MAY
- **Format**: positive number, in seconds
- **Description**: Timeout hint communicating how long the agent needs to complete. Consumers MAY use this to limit execution duration.
- **Example**: `300`
- **Default**: none

### 3.3 Skill Package

AFPS skill packages are a superset of the [Agent Skills] format. A valid Agent Skill directory becomes a valid AFPS skill package when a `manifest.json` is added alongside the existing `SKILL.md`. The `SKILL.md` format and all companion directories defined by Agent Skills are preserved unchanged.

#### Required files

A skill package MUST contain `manifest.json` and `SKILL.md` at the archive root. The manifest MUST validate as a common manifest with `type: "skill"`.

#### `SKILL.md` format

`SKILL.md` SHOULD begin with a YAML frontmatter block followed by a Markdown body containing the skill instructions. For interoperable skill packages:

- frontmatter `name` SHOULD be present;
- frontmatter `description` SHOULD be present; and
- the body SHOULD describe intended usage.

Consumers SHOULD reject skill packages with a missing frontmatter `name`. A missing frontmatter `description` is tolerated but SHOULD be avoided.

The following frontmatter fields are recognized from the Agent Skills specification and SHOULD be preserved by AFPS consumers:

| Field | Required | Description |
| --- | --- | --- |
| `name` | SHOULD | Skill identifier. Max 64 characters, lowercase alphanumeric and hyphens. |
| `description` | SHOULD | What the skill does and when to use it. Max 1024 characters. |
| `license` | MAY | License name or reference to a bundled license file. |
| `compatibility` | MAY | Environment requirements (intended product, system packages, network access). Max 500 characters. |
| `metadata` | MAY | Arbitrary key-value mapping for additional metadata. |
| `allowed-tools` | MAY | Space-delimited list of pre-approved tools. Experimental in Agent Skills. |

AFPS does not extend or modify the frontmatter vocabulary. Additional frontmatter fields defined by future Agent Skills revisions SHOULD be preserved by AFPS consumers.

#### Optional companion directories

Skill packages MAY include the following directories, as defined by Agent Skills:

- `scripts/` — executable code that agents can run (e.g., Python, Bash, JavaScript);
- `references/` — additional documentation loaded on demand (e.g., `REFERENCE.md`, domain-specific files);
- `assets/` — static resources such as templates, images, or data files.

Additional files and directories beyond those listed above MAY be included in the archive. Consumers SHOULD preserve them when round-tripping packages.

#### Progressive disclosure

Skill content is designed for efficient context usage across three levels:

1. **Metadata** (~100 tokens): the `name` and `description` frontmatter fields, loaded at startup for skill discovery;
2. **Instructions** (< 5000 tokens recommended): the full `SKILL.md` body, loaded when the skill is activated;
3. **Resources** (as needed): files in `scripts/`, `references/`, `assets/`, loaded only when required.

Producers SHOULD keep `SKILL.md` under 500 lines and move detailed reference material to separate files.

### 3.4 Tool Package

A tool package declares a single callable capability and bundles its implementation source code. The manifest describes the tool interface; the source file provides the implementation.

#### Required files

A tool package MUST contain `manifest.json` at the archive root and an implementation source file at the path declared by the `entrypoint` field.

#### `entrypoint`
- **Type**: string
- **Required**: MUST for `tool`
- **Format**: relative path from archive root to a source file
- **Description**: Path to the implementation source file. The file MUST exist in the archive. AFPS does not prescribe the programming language or module format of the source file; these are implementation concerns.
- **Example**: `tool.ts`
- **Default**: none

#### `tool`
- **Type**: object
- **Required**: MUST for `tool`
- **Format**: object containing `name`, `description`, and `inputSchema`
- **Description**: Declares the tool interface. This information is available to consumers without executing the source code.

#### `tool.name`
- **Type**: string
- **Required**: MUST
- **Format**: non-empty string
- **Description**: Identifier used by the agent to invoke the tool.
- **Example**: `fetch_json`

#### `tool.description`
- **Type**: string
- **Required**: MUST
- **Format**: free text
- **Description**: Human- and agent-facing explanation of what the tool does and when to use it.
- **Example**: `Fetch JSON from a URL and return the parsed response.`

#### `tool.inputSchema`
- **Type**: object
- **Required**: MUST
- **Format**: JSON Schema object describing the tool's input parameters
- **Description**: Schema for the parameters the tool accepts. Consumers MAY use this for validation and for generating tool-use prompts.
- **Example**: `{ "type": "object", "properties": { "url": { "type": "string" } }, "required": ["url"] }`

`tool.inputSchema` follows standard JSON Schema vocabulary for describing input parameters. It is not constrained to the AFPS schema subset defined in §5, which applies only to agent `input`, `output`, and `config` sections.

`entrypoint` MUST NOT contain path traversal segments (`..`). Producers SHOULD reference a file at the archive root.

AFPS does not define how consumers load or execute the source file. A consumer MAY import it as a module, spawn it as a subprocess, compile it, or use any other strategy. The `tool` object in the manifest provides sufficient metadata for tool discovery and invocation without executing the source code.

#### `TOOL.md`
- **Required**: MAY
- **Format**: Markdown file at archive root
- **Description**: Optional companion file providing usage documentation for agent consumption. When present, consumers SHOULD make this file available to the agent at run time (e.g., injected into the system prompt or accessible via the workspace filesystem). The file SHOULD contain concise instructions optimized for language model consumption: when and how to use the tool, expected behavior, important constraints, and examples. Producers SHOULD keep `TOOL.md` under 200 lines. The manifest `tool.description` field provides a short summary for tool discovery; `TOOL.md` provides extended guidance for tool usage.

### 3.5 Provider Package

A provider package is manifest-only. It MUST contain a `definition` object describing authentication mode and related metadata. It MAY additionally contain presentation fields such as `displayName`, `description`, `iconUrl`, `categories`, and `docsUrl`, plus an optional `setupGuide`.

#### `definition`
- **Type**: object
- **Required**: MUST for `provider`
- **Format**: extensible object containing at least `authMode` and an auth-mode-specific sub-object
- **Description**: Authentication and transport metadata for the provider. The `authMode` field acts as a discriminant; depending on its value, one of the sub-objects `oauth2`, `oauth1`, or `credentials` MUST be present. Each sub-object is extensible (additional properties are allowed) so that implementations can carry mode-specific settings beyond those defined by AFPS. Transversal fields (`authorizedUris`, `allowAllUris`, `availableScopes`) remain at the `definition` level.
- **Example**: `{ "authMode": "oauth2", "oauth2": { "authorizationUrl": "https://example.com/oauth/authorize", "tokenUrl": "https://example.com/oauth/token" } }`
- **Default**: none

#### `setupGuide`
- **Type**: object
- **Required**: MAY
- **Format**: object with optional `callbackUrlHint` and optional `steps`
- **Description**: Human-facing setup instructions for configuring provider credentials.
- **Example**: `{ "callbackUrlHint": "Set the redirect URI to {{callbackUrl}}", "steps": [{ "label": "Create an OAuth app" }] }`
- **Default**: none

#### `PROVIDER.md`
- **Required**: MAY
- **Format**: Markdown file at archive root
- **Description**: Optional companion file providing API documentation for agent consumption. When present, consumers SHOULD make this file available to the agent at run time. The file SHOULD contain concise API documentation optimized for language model consumption: key endpoints, request/response examples, common patterns, and important constraints. Producers SHOULD keep `PROVIDER.md` under 500 lines to support progressive disclosure — detailed reference material belongs in external documentation referenced by `docsUrl`.

## 4. Dependency Model

### 4.1 Dependency Declaration

A package declares its dependencies using the `dependencies` field. The field contains optional maps keyed by dependency type:

```json
{
  "dependencies": {
    "providers": { "@acme/gmail": "^1.0.0" },
    "skills": { "@acme/rewrite-tone": "^1.0.0" },
    "tools": { "@acme/fetch-json": "^1.0.0" }
  }
}
```

Each map entry is a scoped package name paired with a semver version range. Dependency keys MUST be valid scoped names matching the pattern defined in §2.2. All package types MAY declare dependencies.

The following diagram illustrates how an agent composes its dependencies:

```text
                  ┌────────────────────────────────┐
                  │  @acme/customer-intake         │
                  │  type: agent                   │
                  │  prompt.md (objective)         │
                  └──────┬─────────────────────────┘
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

### 4.2 Version Range Resolution

Dependency values MUST be valid semver ranges (e.g., `^1.0.0`, `~2.1`, `>=3.0.0`, `*`). Consumers MUST reject invalid semver range syntax. How consumers resolve ranges against a package catalog is an implementation concern.

### 4.3 Circular Dependencies

A package MUST NOT declare a dependency on itself. Consumers SHOULD detect circular dependencies in the transitive dependency graph and report them with a concrete cycle path.

### 4.4 Provider Configuration

`providersConfiguration` is keyed by provider package id. The interoperable keys defined in AFPS v1.0 are:

- `scopes`: array of strings.

## 5. Schema System

AFPS uses standard JSON Schema 2020-12 for property definitions within agent `input`, `output`, and `config` sections. The container schema MUST be an object with `type: "object"` and a `properties` record. Any valid JSON Schema 2020-12 keyword may be used within property definitions.

### 5.1 JSON Schema Properties

All property definitions within an AFPS schema MUST be valid JSON Schema 2020-12. The full JSON Schema vocabulary is supported, including composition keywords (`allOf`, `anyOf`, `oneOf`, `not`), conditional keywords (`if`/`then`/`else`), references (`$ref`, `$defs`), and all type-specific keywords.

The following keywords are commonly used in AFPS schemas:

| Keyword | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | string | MAY | Declares the field kind (`string`, `number`, `integer`, `boolean`, `array`, `object`). |
| `description` | string | MAY | Human-facing explanation of the field. |
| `default` | any | MAY | Suggested default value. |
| `enum` | array | MAY | Enumerated allowed values. |
| `format` | string | MAY | Formatting hint (`date-time`, `email`, `uri`, etc.). |
| `contentMediaType` | string | MAY | IANA media type (RFC 2046). Used with `format: "uri"` to indicate file fields (see §5.2). |
| `items` | object | MAY | Describes array items (when `type` is `array`). |
| `maxItems` | integer | MAY | Maximum number of array items. |

This is not an exhaustive list. Any keyword defined by JSON Schema 2020-12 is valid within property definitions.

### 5.2 File Field Convention

AFPS represents file upload fields using standard JSON Schema types rather than a custom `file` type. A consumer detects a file field by the combination of `format: "uri"` and the presence of `contentMediaType`.

**Single file:**

```json
{
  "type": "string",
  "format": "uri",
  "contentMediaType": "application/octet-stream",
  "description": "Upload a document"
}
```

**Multiple files:**

```json
{
  "type": "array",
  "items": {
    "type": "string",
    "format": "uri",
    "contentMediaType": "application/octet-stream"
  },
  "maxItems": 5,
  "description": "Upload supporting documents"
}
```

At runtime, the field value is a URI reference to the uploaded file. The `contentMediaType` value MAY be `application/octet-stream` (any file type) or a more specific media type such as `application/pdf`.

Upload constraints such as accepted file extensions and maximum file size are not JSON Schema concerns. They are declared in the `fileConstraints` section of the schema wrapper (see §5.4).

### 5.3 Schema Object Structure

An AFPS schema container MUST have:

- `type: "object"`;
- a `properties` object whose values are AFPS property definitions.

It MAY also contain:

- `required`: an array of property names.

Property definitions support the full JSON Schema 2020-12 vocabulary, including composition (`allOf`, `anyOf`, `oneOf`), conditionals (`if`/`then`/`else`), and references (`$ref`, `$defs`). The schema validator validates property definitions against the official JSON Schema 2020-12 meta-schema.

### 5.4 Input, Output, and Config Schemas

`input`, `output`, and `config` all use a wrapper shape containing a required `schema` member and optional AFPS metadata:

```json
{
  "schema": {
    "type": "object",
    "properties": {}
  },
  "fileConstraints": {},
  "uiHints": {},
  "propertyOrder": []
}
```

The `schema` member MUST be a valid JSON Schema 2020-12 object. The remaining fields are AFPS-specific metadata that lives outside the schema to preserve JSON Schema purity.

The wrapper object is required when any of these sections are present. A bare schema object is not valid in those locations.

#### `fileConstraints`
- **Type**: object (keyed by property name)
- **Required**: MAY
- **Description**: Upload constraints for file fields. Each entry MAY contain:
  - `accept` (string): comma-separated file extensions or MIME-type selectors (e.g., `.pdf,.docx`).
  - `maxSize` (number): maximum accepted file size in bytes for a single file.
- **Example**: `{ "attachments": { "accept": ".pdf,.docx", "maxSize": 10485760 } }`

#### `uiHints`
- **Type**: object (keyed by property name)
- **Required**: MAY
- **Description**: UI rendering hints for schema fields. Each entry MAY contain:
  - `placeholder` (string): hint text shown before the user provides a value.
- **Example**: `{ "query": { "placeholder": "label:inbox newer_than:7d" } }`

#### `propertyOrder`
- **Type**: array of strings
- **Required**: MAY
- **Description**: Presentation hint for property ordering. Listed properties SHOULD be rendered first, in the given order. Properties present in `properties` but absent from `propertyOrder` SHOULD be appended after the listed ones, in their natural object-key order.
- **Example**: `["query", "attachments", "priority"]`

Although the three sections share the same structural format, they have distinct semantics and lifecycles:

| Section | Lifecycle | Timing | Description |
| --- | --- | --- | --- |
| `input` | Per-run | Supplied each time the agent runs | Data the user provides for a specific run (e.g., a search query, a file to process). |
| `output` | Per-run | Produced at the end of each run | Structured result the agent returns (e.g., a summary, a report). |
| `config` | Per-deployment | Set once during setup, reused across runs | Settings that remain constant across runs (e.g., preferred language, notification threshold). |

A consumer SHOULD prompt for `input` values at each run and SHOULD persist `config` values so they do not need to be re-entered.

## 6. Execution Model

### 6.1 Execution Context

An `agent` package MUST include a non-empty `prompt.md` companion file. That file contains the primary instructions for the agent.

An agent execution is **non-interactive and run-to-completion**: the agent receives the full execution context, processes the task autonomously, and returns a structured result. There is no conversational back-and-forth — the agent runs from start to finish without user interaction.

A consumer MAY construct an execution context from:

- the validated agent manifest;
- `prompt.md`;
- validated `input` and `config` data;
- resolved providers, skills, and tools; and
- provider configuration under `providersConfiguration`.

AFPS does not define prompt templating, state persistence, scheduling, or transport semantics. Those concerns are out of scope.

### 6.2 Timeout

`timeout` is a numeric hint expressed in seconds. It communicates the producer's expectation of how long the agent needs to complete.

AFPS v1.0 does not impose a manifest-level default for this field. If a consumer chooses a local default, it SHOULD document it separately from the manifest itself.

## 7. Provider Authentication

### 7.1 Auth Modes

`definition.authMode` MUST be one of:

- `oauth2`
- `oauth1`
- `api_key`
- `basic`
- `custom`

### 7.2 OAuth2 Configuration

For `oauth2` providers, `definition.oauth2` MUST be present. The `oauth2` sub-object is extensible: implementations MAY add additional properties for implementation-specific OAuth2 settings.

Required fields within `definition.oauth2`:

- `definition.oauth2.authorizationUrl` MUST be present;
- `definition.oauth2.tokenUrl` MUST be present.

Optional fields within `definition.oauth2`:

- `definition.oauth2.tokenAuthMethod` MAY be present. When present, it MUST be one of:
  - `client_secret_post` (default) — client credentials are sent in the token request body, per RFC 6749 §2.3.1;
  - `client_secret_basic` — client credentials are sent in an HTTP `Authorization: Basic` header, per RFC 6749 §2.3.1. Consumers that support this value MUST URL-encode the client id and secret before base64 encoding, as required by RFC 6749 §2.3.1.
- `definition.oauth2.tokenContentType` MAY be present. When present, it MUST be one of:
  - `application/x-www-form-urlencoded` (default) — token endpoint request body is URL-encoded, per RFC 6749 §4.1.3;
  - `application/json` — token endpoint request body is a JSON object. This is required by some providers (e.g. Atlassian) whose token endpoints do not accept form-urlencoded bodies. Consumers MUST send a matching `Content-Type` header.

Consumers MUST treat unknown values of `tokenAuthMethod` or `tokenContentType` as if the field were absent (i.e. fall back to the default).

### 7.3 OAuth1 Configuration

For `oauth1` providers, `definition.oauth1` MUST be present. The `oauth1` sub-object is extensible: implementations MAY add additional properties for implementation-specific OAuth1 settings.

Required fields within `definition.oauth1`:

- `definition.oauth1.requestTokenUrl` MUST be present;
- `definition.oauth1.accessTokenUrl` MUST be present.

### 7.4 Credential Schema

For `api_key`, `basic`, and `custom` providers, `definition.credentials` MUST be present. The `credentials` sub-object is extensible: implementations MAY add additional properties for implementation-specific credential transmission settings.

Required fields within `definition.credentials`:

- `definition.credentials.schema` MUST be present.

The `schema` object SHOULD follow the AFPS schema format defined in §5 (Schema System) — that is, `type: "object"` with a `properties` record — but the manifest validator accepts any JSON object. Each property defines a credential field the user must supply.

Optional top-level fields for `api_key` providers:

- `definition.credentialTransform` MAY be present for `api_key` authMode. When present, it instructs consumers to replace the injected credential value with a templated, transformed string. It is an object with two required fields:
  - `template` MUST be a non-empty string. It is rendered by substituting `{{field}}` placeholders with the values stored under the corresponding keys in the user-provided credentials. The same substitution engine used for `authorizedUris`, `credentialHeaderPrefix` and proxied URLs is reused.
  - `encoding` MUST be a known post-substitution transform applied to the rendered template. AFPS v1 defines a single value: `base64` (RFC 4648 §4). New encodings require a minor version bump of this spec. Consumers MUST reject manifests using an unknown encoding.

  The resulting string replaces the value stored under `credentials.fieldName` (default `api_key`) at injection time; other credential fields are preserved so they remain available for URL and header substitution (e.g. `{{subdomain}}`, `{{email}}`). The transform MUST be evaluated inside the trusted boundary that handles credential decryption.

  Two common Basic-auth patterns are expressible directly in the manifest:
  - Freshdesk / Teamwork (`api_key` username, literal `X` password):
    `{ template: "{{api_key}}:X", encoding: "base64" }`
  - Zendesk (`<email>/token` username, API token password):
    `{ template: "{{email}}/token:{{api_key}}", encoding: "base64" }`

### 7.5 URI Restrictions

`authorizedUris` MAY restrict which upstream URIs a provider is intended to access. `allowAllUris` MAY be used as an explicit override. If omitted, common consumers resolve `allowAllUris` as `false`.

### 7.6 Setup Guide

`setupGuide.callbackUrlHint` MAY provide a human-facing callback hint, often including a placeholder such as `{{callbackUrl}}`.

`setupGuide.steps` MAY contain an ordered list of setup steps. Each step MUST have a `label` and MAY have a `url`.

For interoperability, `availableScopes` SHOULD be an array of objects with `value` and `label` keys.

## 8. Security Considerations

AFPS packages describe AI workflows that may access external services, process user data, and execute code. Implementers MUST consider the following threats.

### 8.1 Archive Processing

ZIP archives are a well-known vector for path traversal and denial-of-service attacks. Consumers MUST:

- reject entries containing `..` path segments, absolute paths, null bytes, or backslash separators (see §2.4);
- enforce a maximum uncompressed archive size to prevent zip bombs;
- limit the total number of entries extracted from a single archive.

Consumers SHOULD ignore `__MACOSX/` directories and other platform-specific metadata entries.

### 8.2 Tool Code Execution

Tool packages (§3.4) contain source code that consumers may load and execute. This is the highest-risk surface in the AFPS model:

- consumers that execute tool code SHOULD do so in a sandboxed environment with the minimum necessary permissions;
- consumers SHOULD prevent tool code from accessing the host filesystem, network, or environment variables beyond the scope required by the tool;
- consumers SHOULD apply a timeout to tool execution to prevent resource exhaustion;
- registries SHOULD perform static analysis or review of tool source code before making a package publicly available.

AFPS does not define how tool code is loaded or executed. Consumers are responsible for implementing appropriate security measures for their execution environment.

### 8.3 Credential Handling

Provider packages (§3.5, §7) describe authentication configurations that involve OAuth tokens, API keys, and other secrets:

- consumers MUST store credentials encrypted at rest;
- consumers MUST NOT include credentials in manifest files, log entries, or error messages;
- consumers SHOULD transmit credentials only over TLS-secured connections;
- the `authorizedUris` field (§7.5) SHOULD be enforced at runtime to prevent credential leakage to unintended endpoints;
- consumers SHOULD treat `allowAllUris: true` as a security-sensitive configuration and warn users accordingly.

### 8.4 Prompt Injection

Agent packages include a `prompt.md` companion file whose content is typically sent to a language model. Malicious or compromised packages can embed prompt injection attacks:

- consumers SHOULD clearly delimit system instructions from package-provided prompts;
- consumers SHOULD sanitize or validate `input` data before interpolating it into prompts;
- consumers SHOULD NOT grant agent prompts the ability to modify system-level configurations or access credentials beyond those declared in `dependencies`.

### 8.5 Supply Chain

Packages distributed through registries are subject to supply chain attacks including typosquatting, dependency confusion, and malicious updates:

- registries SHOULD enforce scope ownership so that only authorized publishers can modify packages within a scope;
- registries SHOULD support package integrity verification using content-addressable hashes (e.g., SHA-256 SRI);
- registries SHOULD provide a mechanism to yank or retract compromised versions;
- consumers SHOULD verify package integrity after download;
- consumers SHOULD pin dependency versions or use lock files for production deployments.

### 8.6 URI Restrictions

Provider definitions include `authorizedUris` to restrict which upstream endpoints a provider can access:

- consumers MUST NOT send credentials to URIs outside the authorized set unless `allowAllUris` is explicitly `true`;
- URI patterns using wildcards (e.g., `https://api.example.com/*`) SHOULD be matched strictly — consumers MUST NOT allow pattern bypass via URL encoding, fragment injection, or open redirects.

## 9. Privacy Considerations

AFPS packages may process personally identifiable information (PII) through agent inputs, provider connections, and execution outputs:

- consumers SHOULD document which data is transmitted to external services during agent execution;
- consumers SHOULD provide users with visibility into what data an agent accesses via its `dependencies` and `providersConfiguration` declarations;
- consumers SHOULD ensure that execution state, credentials, and intermediate data are appropriately managed according to data protection requirements;
- registries SHOULD NOT require or store PII in package manifests beyond the `author` field.

Implementers operating in jurisdictions with data protection regulations (e.g., GDPR, CCPA) SHOULD consult their compliance requirements for the handling of user data within AI workflows.

## 10. Extensibility

AFPS manifests and several nested objects (such as `dependencies` and `definition`) accept additional fields beyond those defined in this specification. This design allows producers and consumers to experiment with new metadata without requiring a specification revision.

### 10.1 Extension Field Convention

Fields that are not defined by this specification MUST use a name prefixed with `x-` followed by a vendor or project identifier, for example:

```json
{
  "name": "@example/my-agent",
  "version": "1.0.0",
  "type": "agent",
  "x-acme-priority": "high",
  "x-acme-cost-center": "engineering"
}
```

The `x-` prefix signals that the field is an extension and is not part of the normative AFPS vocabulary. This convention:

- prevents collisions with future AFPS fields;
- allows tooling to distinguish standard fields from extensions; and
- enables consumers to preserve or strip extension fields during processing.

Producers MUST NOT use the `x-` prefix for fields that are defined by this specification. Consumers MUST NOT reject manifests that contain `x-`-prefixed fields. Consumers MAY ignore extension fields they do not understand.

### 10.2 Future Standard Fields

When an extension field gains broad adoption across multiple implementations, it MAY be promoted to a standard field in a future specification revision. Upon promotion, the unprefixed field name becomes normative and the `x-`-prefixed version becomes deprecated.

## 11. References

### Normative References

- **[RFC 2119]** Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, March 1997. https://datatracker.ietf.org/doc/html/rfc2119
- **[RFC 8174]** Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, May 2017. https://datatracker.ietf.org/doc/html/rfc8174
- **[SemVer]** Preston-Werner, T., "Semantic Versioning 2.0.0". https://semver.org/spec/v2.0.0.html
- **[JSON]** ECMA-404, "The JSON Data Interchange Syntax", 2nd edition, December 2017. https://www.ecma-international.org/publications-and-standards/standards/ecma-404/
- **[JSON Schema]** JSON Schema: A Media Type for Describing JSON Documents, Draft 2020-12. https://json-schema.org/draft/2020-12/json-schema-core
- **[ZIP]** PKWARE, "APPNOTE.TXT - .ZIP File Format Specification". https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT

### Informative References

- **[MCP]** Model Context Protocol Specification. https://modelcontextprotocol.io/specification
- **[A2A]** Agent-to-Agent Protocol. https://a2a-protocol.org/latest/specification/
- **[Agent Skills]** Anthropic Agent Skills Specification. https://agentskills.io/home
- **[Docker Compose]** The Compose Specification. https://github.com/compose-spec/compose-spec
- **[npm package.json]** npm documentation, package.json. https://docs.npmjs.com/cli/configuring-npm/package-json
- **[OpenAPI]** OpenAPI Specification. https://spec.openapis.org/oas/latest.html

---

## Appendices

### Appendix A. Field Reference Table

| Field | Context | Type | Requirement | Constraints / Notes | Default |
| --- | --- | --- | --- | --- | --- |
| `name` | all manifests | string | MUST | scoped name | none |
| `version` | all manifests | string | MUST | valid semver version | none |
| `type` | all manifests | string | MUST | `agent\|skill\|tool\|provider` | none |
| `displayName` | all manifests | string | MUST for agent; SHOULD for skill, tool, and provider | agent value min length 1 | none |
| `description` | all manifests | string | MAY | free text | none |
| `keywords` | all manifests | string[] | MAY | arbitrary strings | none |
| `license` | all manifests | string | MAY | free text | none |
| `repository` | all manifests | string | MAY | URI recommended | none |
| `dependencies` | all manifests | object | MAY | optional dependency maps | none |
| `dependencies.skills` | all manifests | map | MAY | keys scoped names, values valid semver ranges | none |
| `dependencies.tools` | all manifests | map | MAY | keys scoped names, values valid semver ranges | none |
| `dependencies.providers` | all manifests | map | MAY | keys scoped names, values valid semver ranges | none |
| `author` | agent | string | MUST | free text | none |
| `providersConfiguration` | agent | map | MAY | keyed by provider id | none |
| `providersConfiguration.<id>.scopes` | agent | string[] | MAY | requested scopes | none |
| `input` | agent | object | MAY | per-run data; requires `schema` child | none |
| `input.schema` | agent | object | MUST if `input` present | AFPS schema object | none |
| `output` | agent | object | MAY | per-run result; requires `schema` child | none |
| `output.schema` | agent | object | MUST if `output` present | AFPS schema object | none |
| `config` | agent | object | MAY | per-deployment settings; requires `schema` child | none |
| `config.schema` | agent | object | MUST if `config` present | AFPS schema object | none |
| `entrypoint` | tool | string | MUST | relative path to source file | none |
| `tool` | tool | object | MUST | tool interface declaration | none |
| `tool.name` | tool | string | MUST | non-empty tool identifier | none |
| `tool.description` | tool | string | MUST | tool description for agents | none |
| `tool.inputSchema` | tool | object | MUST | JSON Schema for tool parameters | none |
| `timeout` | agent | number | MAY | timeout hint in seconds | none |
| `schemaVersion` | all manifests | string | MUST for agent; MAY for all others | `MAJOR.MINOR` format; producers MUST emit `1.0` for this draft | none |
| `definition` | provider | object | MUST | extensible; contains auth metadata and auth-mode-specific sub-object | none |
| `definition.authMode` | provider | string | MUST | `oauth2\|oauth1\|api_key\|basic\|custom` | none |
| `definition.oauth2` | provider | object | MUST for oauth2 | extensible sub-object for OAuth2 configuration | none |
| `definition.oauth2.authorizationUrl` | provider | string | MUST for oauth2 | URI recommended | none |
| `definition.oauth2.tokenUrl` | provider | string | MUST for oauth2 | URI recommended | none |
| `definition.oauth2.tokenAuthMethod` | provider | string | MAY | `client_secret_post` (default) or `client_secret_basic` (RFC 6749 §2.3.1) | none |
| `definition.oauth2.tokenContentType` | provider | string | MAY | `application/x-www-form-urlencoded` (default, RFC 6749 §4.1.3) or `application/json` | none |
| `definition.oauth1` | provider | object | MUST for oauth1 | extensible sub-object for OAuth1 configuration | none |
| `definition.oauth1.requestTokenUrl` | provider | string | MUST for oauth1 | URI recommended | none |
| `definition.oauth1.accessTokenUrl` | provider | string | MUST for oauth1 | URI recommended | none |
| `definition.credentials` | provider | object | MUST for `api_key`, `basic`, `custom` | extensible sub-object for credential configuration | none |
| `definition.credentials.schema` | provider | object | MUST for `api_key`, `basic`, `custom` | SHOULD follow AFPS schema format; validator accepts any object | none |
| `definition.credentialTransform` | provider | object | MAY for `api_key` | `{ template, encoding }` — generic pre-encoding for Basic-auth vendor patterns (§7.4) | none |
| `definition.credentialTransform.template` | provider | string | MUST if transform present | non-empty, `{{var}}` substitution over credential fields | none |
| `definition.credentialTransform.encoding` | provider | string | MUST if transform present | `base64` (AFPS v1) | none |
| `definition.authorizedUris` | provider | string[] | MAY | allowed upstream URI patterns | none |
| `definition.allowAllUris` | provider | boolean | MAY | unrestricted upstream access | consumer-defined |
| `definition.availableScopes` | provider | array | MAY | interoperable form is `{ value, label }[]` | none |
| `iconUrl` | provider | string | MAY | URI recommended | none |
| `categories` | provider | string[] | MAY | arbitrary strings | consumer-defined |
| `docsUrl` | provider | string | MAY | URI recommended | none |
| `setupGuide` | provider | object | MAY | setup metadata | none |
| `setupGuide.callbackUrlHint` | provider | string | MAY | callback placeholder text | none |
| `setupGuide.steps` | provider | object[] | MAY | ordered setup steps | none |
| `setupGuide.steps[].label` | provider | string | MUST if step present | non-empty recommended | none |
| `setupGuide.steps[].url` | provider | string | MAY | URI recommended | none |
| `TOOL.md` | tool archive | file | MAY | optional usage documentation for agent consumption | none |
| `PROVIDER.md` | provider archive | file | MAY | optional API documentation for agent consumption | none |
| `SKILL.md` frontmatter `name` | skill content | string | SHOULD | max 64 chars, lowercase alphanumeric and hyphens | none |
| `SKILL.md` frontmatter `description` | skill content | string | SHOULD | max 1024 chars; missing value warns | none |
| `SKILL.md` frontmatter `license` | skill content | string | MAY | license name or file reference | none |
| `SKILL.md` frontmatter `compatibility` | skill content | string | MAY | max 500 chars; environment requirements | none |
| `SKILL.md` frontmatter `metadata` | skill content | map | MAY | arbitrary string key-value pairs | none |
| `SKILL.md` frontmatter `allowed-tools` | skill content | string | MAY | space-delimited tool list; experimental | none |
| `scripts/` | skill archive | directory | MAY | executable code for agents | none |
| `references/` | skill archive | directory | MAY | additional documentation | none |
| `assets/` | skill archive | directory | MAY | static resources, templates | none |
| `x-*` | any extensible object | any | MAY | extension fields MUST use `x-` prefix (§10) | none |

### Appendix B. Regex Patterns

```text
SLUG_PATTERN         = [a-z0-9]([a-z0-9-]*[a-z0-9])?
SLUG_REGEX           = ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$
SCOPED_NAME_REGEX    = ^@[a-z0-9]([a-z0-9-]*[a-z0-9])?\/[a-z0-9]([a-z0-9-]*[a-z0-9])?$
SCHEMA_VERSION_REGEX = ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$
EXTENSION_FIELD      = ^x-.+$
```

Semantic-version and range validation are delegated to semver parsing functions rather than regexes.

### Appendix C. Default Values

AFPS v1.0 validation does not inject manifest defaults. Omitted optional fields remain omitted.

Common consumer-side defaults observed in interoperable implementations include:

| Field | Resolved default | Notes |
| --- | --- | --- |
| `definition.authMode` | `oauth2` | provider resolution default when absent in raw extraction |
| `definition.allowAllUris` | `false` | resolved provider definition |
| `categories` | `[]` | resolved provider definition |
| `schemaVersion` | `1.0` | common consumer default for new agents |
| `timeout` | `300` | common consumer default for new agents |

These defaults are non-normative unless a producer explicitly writes them into the manifest.

### Appendix D. Origins

This specification was initially drafted by Appstrate and published as an independent open standard. The normative content of this specification (§1–§10) defines the standard independently of any specific implementation. Conforming implementations MAY use different internal structures, validation strategies, or execution models while maintaining specification compliance.

See [IMPLEMENTATIONS.md](./IMPLEMENTATIONS.md) for known implementations.
