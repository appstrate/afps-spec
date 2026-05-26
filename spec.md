# Agent Format Packaging Standard (AFPS) Specification

**Copyright** &copy; 2026 Appstrate contributors. Licensed under [CC-BY-4.0](./LICENSE).

## Version 2.0 -- Draft

### Abstract

Agent Format Packaging Standard (AFPS) is an open specification for declaring portable AI workflow packages. It defines a JSON-based manifest format for four package types — agents, skills, MCP servers, and integrations — along with their dependency model, schema system, archive layout, and integration authentication metadata. AFPS standardizes package definition and composition; it does not define tool-calling protocols, agent-to-agent transport, or runtime execution APIs.

AFPS 2.0 adopts a `snake_case` field vocabulary across all package types, defines an `mcp-server` package type that is AFPS-native at the root and adopts the MCP Bundle ([MCPB]) field vocabulary for its server, tools, and user-configuration block, and replaces the legacy `tool` and `provider` types with `mcp-server` and `integration`. See [Appendix D](#appendix-d-migration-from-afps-1x) for migration from AFPS 1.x.

### Status of this Document

This document is a **draft** of the AFPS v2.0 specification. It is published for community review and early implementation feedback.

- **Status**: Draft
- **Version**: 2.0
- **Date**: 2026-05-24
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
  - [3.4 MCP-Server Package](#34-mcp-server-package)
  - [3.5 Integration Package](#35-integration-package)
- [4. Dependency Model](#4-dependency-model)
  - [4.1 Dependency Declaration](#41-dependency-declaration)
  - [4.2 Version Range Resolution](#42-version-range-resolution)
  - [4.3 Circular Dependencies](#43-circular-dependencies)
  - [4.4 Integration Configuration (Deprecated)](#44-integration-configuration-deprecated)
- [5. Schema System](#5-schema-system)
  - [5.1 JSON Schema Properties](#51-json-schema-properties)
  - [5.2 File Field Convention](#52-file-field-convention)
  - [5.3 Schema Object Structure](#53-schema-object-structure)
  - [5.4 Input, Output, and Config Schemas](#54-input-output-and-config-schemas)
- [6. Execution Model](#6-execution-model)
  - [6.1 Execution Context](#61-execution-context)
  - [6.2 Timeout](#62-timeout)
- [7. Integration Authentication](#7-integration-authentication)
  - [7.1 Capability Source](#71-capability-source)
  - [7.2 Auth Methods](#72-auth-methods)
  - [7.3 OAuth2 Configuration and Discovery](#73-oauth2-configuration-and-discovery)
  - [7.4 Scopes](#74-scopes)
  - [7.5 Credential Schema](#75-credential-schema)
  - [7.6 Credential Delivery](#76-credential-delivery)
  - [7.7 Declarative Credential Acquisition (connect)](#77-declarative-credential-acquisition-connect)
  - [7.8 Per-Tool Policy](#78-per-tool-policy)
  - [7.9 URI Restrictions](#79-uri-restrictions)
  - [7.10 Setup Guide](#710-setup-guide)
- [8. Security Considerations](#8-security-considerations)
  - [8.1 Archive Processing](#81-archive-processing)
  - [8.2 MCP-Server Code Execution](#82-mcp-server-code-execution)
  - [8.3 Credential Handling](#83-credential-handling)
  - [8.4 Prompt Injection](#84-prompt-injection)
  - [8.5 Supply Chain](#85-supply-chain)
  - [8.6 URI Restrictions](#86-uri-restrictions)
  - [8.7 Credential Discovery (SSRF)](#87-credential-discovery-ssrf)
- [9. Privacy Considerations](#9-privacy-considerations)
- [10. Extensibility](#10-extensibility)
  - [10.1 The `_meta` Extension Mechanism](#101-the-_meta-extension-mechanism)
  - [10.2 Future Standard Fields](#102-future-standard-fields)
- [11. References](#11-references)
- [Appendices](#appendices)
  - [Appendix A. Field Reference Table](#appendix-a-field-reference-table)
  - [Appendix B. Regex Patterns](#appendix-b-regex-patterns)
  - [Appendix C. Default Values](#appendix-c-default-values)
  - [Appendix D. Migration from AFPS 1.x](#appendix-d-migration-from-afps-1x)
  - [Appendix E. Origins](#appendix-e-origins)

---

## 1. Introduction

### 1.1 Purpose

Agent Format Packaging Standard (AFPS) defines a declarative package format for AI workflows and closely related package types.

The central artifact in AFPS is the **agent** — a package that captures the user's intent (via a `prompt.md` companion file) together with everything the agent needs to fulfill it: skills, MCP servers, integration connections, input and output schemas, and execution settings. An agent execution is **non-interactive and run-to-completion**: the agent receives the objective, the input data, and the available resources, processes the task autonomously, and returns a structured result. There is no conversational back-and-forth — the agent runs from start to finish without user interaction. Where other standards define agent capabilities (what an agent *can do*), an AFPS agent defines an objective (what the agent *should accomplish*).

AFPS also defines three supporting package types — **skills** (reusable instructions), **MCP servers** (runnable tool servers, packaged as MCP Bundles), and **integrations** (credentialed bindings to external services) — that agents compose as dependencies.

The goal of AFPS is to let producers publish portable artifacts that describe:

- what a package is;
- which other packages it depends on;
- which integration connections it expects;
- which input, output, and configuration shapes it exposes; and
- which companion files are required for distribution.

AFPS is intentionally centered on package definition. It standardizes package metadata and package layout, not runtime execution APIs.

### 1.2 Scope

This specification defines:

- package types: `agent`, `skill`, `mcp-server`, `integration`;
- package identity and versioning;
- manifest fields and companion file requirements;
- ZIP archive structure;
- dependency declaration and dependency cycle semantics;
- a constrained schema system used by `input`, `output`, `config`, and selected credential definitions;
- the packaging of MCP servers as MCP Bundles (MCPB); and
- integration authentication, credential acquisition, and credential delivery metadata.

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
│  Capability layer    AFPS Skills / MCP Servers          │
│                      "Rewrite text in a professional    │
│                       tone" / "List Gmail messages"     │
│                      = reusable abilities the agent     │
│                        can draw on to reach the goal    │
├─────────────────────────────────────────────────────────┤
│  Connection layer    AFPS Integrations                  │
│                      "Gmail via OAuth2"                 │
│                      = authenticated access to          │
│                        external services                │
└─────────────────────────────────────────────────────────┘
```

An agent's `prompt.md` replaces what a human would type to give an agent its objective. Skills, MCP servers, and integrations are the resources the agent uses to fulfill that objective. AFPS packages all of these together into a portable, versioned artifact.

Existing standards address different concerns, and AFPS adopts several of them verbatim rather than reinventing them:

- **MCP** [Model Context Protocol]: defines how agents invoke tools at runtime (JSON-RPC transport). AFPS does not define tool-calling transport. A runtime MAY expose AFPS capabilities via MCP, but this is an implementation concern, not an AFPS requirement.
- **MCPB** [MCP Bundle]: defines the manifest and archive format for packaging a **local** MCP server (command, runtime, configuration). An AFPS `mcp-server` manifest adopts the MCPB field vocabulary (`manifest_version`, `server`, `tools`, `user_config`) at the root alongside AFPS-native fields (`type`, `schema_version`, scoped `name`, `dependencies`). AFPS does not claim strict-MCPB schema compatibility; producers needing to install into an MCPB host (Claude Desktop, mcpb CLI) MUST emit a strict-MCPB projection separately (a future minor of this spec MAY define such a projection mechanically).
- **Agent Skills** [Anthropic / AAIF]: defines the `SKILL.md` format for declaring reusable agent capabilities. AFPS skill packages (§3.3) are a strict superset of Agent Skills: a valid Agent Skill directory (`SKILL.md` plus optional `scripts/`, `references/`, `assets/`) becomes a valid AFPS skill package when a `manifest.json` is added. The `SKILL.md` format, including all frontmatter fields defined by Agent Skills, is preserved unchanged. AFPS adds package identity, versioning, dependency declarations, and a distribution format — it does not alter the skill content model. Skills define **capabilities**, not **goals** — the goal comes from the AFPS agent that composes them.
- **OAuth 2.0 / OpenID Connect**: AFPS integration authentication (§7) declares OAuth 2.0 [RFC 6749] authorization servers using the metadata vocabulary of [RFC 8414] (OAuth Authorization Server Metadata) and [OpenID Connect Discovery], requests resources per [RFC 8707], and uses PKCE per [RFC 7636]. This aligns AFPS with the same standards the MCP Authorization specification builds on.
- **OpenAPI Arazzo** [Arazzo]: the OpenAPI workflows specification. AFPS `connect.login` (§7.7) aligns with the Arazzo request → assert → extract → reuse model (`success_criteria`, `outputs`, runtime expressions), with documented AFPS extensions for credential extraction.
- **A2A** [Agent-to-Agent Protocol]: defines inter-agent discovery and communication. AFPS does not compete with A2A; a future extension could declare A2A Agent Card metadata within an AFPS manifest using the `_meta` mechanism (§10).

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
- **Companion file**: a required non-manifest file such as `prompt.md`, `SKILL.md`, or an MCP server entry point.
- **Dependency**: an entry under `dependencies`, declaring a package that this package depends on, with a semver version range.
- **MCP server**: a package whose manifest is an MCP Bundle (MCPB) manifest describing how to run a local MCP tool server (§3.4).
- **Integration**: a package describing a credentialed binding to an external service — its capability source, authentication method(s), and credential delivery (§3.5, §7).
- **Capability source**: the surface an integration binds to — a local MCP server, a remote MCP endpoint, or an HTTP API (§7.1).
- **Auth method**: a named authentication configuration under an integration's `auths` map (§7.2).
- **Delivery**: the declaration of where an acquired credential is injected at runtime — HTTP request, environment variable, or file (§7.6).

### 1.4 Conformance

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC 2119] [RFC 8174] when, and only when, they appear in all capitals, as shown here.

Conforming producers MUST emit manifests and package archives that satisfy the requirements in this document. Conforming consumers MUST reject malformed packages and SHOULD preserve unknown fields when round-tripping manifests. AFPS allows extensibility: manifests and several nested objects accept additional fields unless this specification explicitly forbids them. Extension fields SHOULD follow the `_meta` mechanism defined in §10.

## 2. Package Model

### 2.1 Package Types

AFPS defines four package types:

- `agent`: a complete workflow package consisting of manifest metadata and a `prompt.md` companion file;
- `skill`: a declarative capability package consisting of a minimal manifest and `SKILL.md`;
- `mcp-server`: a runnable MCP tool server, whose manifest adopts the MCP Bundle (MCPB) vocabulary at the root for the server, tools, and user-configuration fields, alongside the standard AFPS common fields (§3.4);
- `integration`: a credentialed binding to an external service, described entirely by `manifest.json` (§3.5).

A package's `type` field is the dispatch key used by validators and archive parsers. Producers MUST set it to exactly one of the values above.

> **Note (migration from AFPS 1.x).** AFPS 1.x defined `tool` and `provider` package types. AFPS 2.0 removes them: `tool` is superseded by `mcp-server` and `provider` by `integration`. AFPS 2.0 producers MUST NOT emit `tool` or `provider` manifests. Consumers that interoperate with 1.x archives SHOULD read them using the mapping in [Appendix D](#appendix-d-migration-from-afps-1x).

### 2.2 Package Identity

Every AFPS package MUST have a stable AFPS package identity of the form `@scope/name`. The `scope` and `name` segments MUST each match `SLUG_PATTERN`:

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

The AFPS package identity is the top-level `name` field for all four package types. Dependency references (§4) always use this identity.

### 2.3 Versioning

The top-level `version` field MUST be a valid semantic version per [SemVer]. Dependency values MUST be valid semantic version ranges.

AFPS itself does not define its own range syntax. It delegates version parsing and range parsing to widely used semantic-version semantics. In practice:

- package versions are exact semantic versions such as `1.0.0`;
- dependency declarations use ranges such as `^1.0.0`, `~2.1`, `>=3.0.0`, or `*`;
- prerelease handling follows the semver implementation used by the consumer; and
- when resolving ranges against a catalog, consumers SHOULD pick the highest satisfying version.

How consumers resolve version ranges against a package catalog is an implementation concern.

### 2.4 Schema Version Compatibility

AFPS package model evolution is tracked by the `schema_version` field, a `MAJOR.MINOR` string. A change in `MAJOR` indicates a breaking manifest model change; a change in `MINOR` indicates an additive, backwards-compatible revision. Packages targeting this specification emit `schema_version: "2.0"`.

`schema_version` applies to all four package types. An `mcp-server` manifest additionally carries `manifest_version`, which tags the MCPB-vocabulary version of its embedded server/tools/user_config block (§3.4); the two version fields are independent.

When a consumer encounters a manifest whose `schema_version` has a higher MAJOR number than the highest version it supports, it MUST reject the manifest and SHOULD report an error identifying the unsupported schema version. Processing a manifest with an unknown major version could lead to silent data loss or incorrect behavior.

When a consumer encounters a manifest whose `schema_version` has the same MAJOR number but a higher MINOR number than the highest version it supports, it SHOULD process the manifest on a best-effort basis. Unknown fields SHOULD be preserved. Consumers MAY emit a warning indicating that some fields may not be fully understood.

When `schema_version` is absent from a `skill`, `mcp-server`, or `integration` manifest (where the field is optional), consumers SHOULD treat the package as targeting schema version `2.0`. A `skill` or `integration` manifest declaring `schema_version: "1.0"` is a legacy package and SHOULD be read using the mapping in [Appendix D](#appendix-d-migration-from-afps-1x).

### 2.5 Package Archive Format

AFPS packages are distributed as ZIP archives.

Every package archive MUST contain `manifest.json` at the archive root. Additional required files depend on `manifest.type`:

| Type | Required companion content |
| --- | --- |
| `agent` | `prompt.md` at archive root, non-empty |
| `skill` | `SKILL.md` at archive root; optional `scripts/`, `references/`, `assets/` directories (see §3.3) |
| `mcp-server` | the server payload referenced by `server.entry_point`; optional `icon` (see §3.4) |
| `integration` | optional `INTEGRATION.md` at archive root |

Producers SHOULD use the `.afps` file extension for package archives (e.g., `customer-intake-1.0.0.afps`). Consumers MUST accept archives regardless of file extension. The `.afps` extension is a convention for human recognition and tool association; it does not alter the archive format, which remains standard ZIP.

An `mcp-server` archive is not, by itself, a strict MCPB bundle: the manifest carries AFPS-native top-level fields (`type`, `schema_version`, `dependencies`, scoped `name`) alongside the MCPB-vocabulary fields (`server`, `tools`, `user_config`, `manifest_version`). A producer that wishes to additionally distribute the package to MCPB hosts (such as Claude Desktop) MAY emit a strict-MCPB projection at publish time; the projection rules are out of scope for this revision and reserved for a future minor (§10.2).

All text files in the archive MUST be encoded in UTF-8.

Consumers SHOULD sanitize ZIP entries before processing them. At minimum, entries with path traversal segments (`..`), absolute paths, null bytes, backslashes, `__MACOSX/` prefixes, or directory-only entries SHOULD be ignored.

## 3. Manifest Specification

All manifests are JSON objects. Unknown top-level fields and unknown nested fields in extensible objects are allowed by the validation model and SHOULD be preserved by tooling unless a tool intentionally normalizes the manifest. Producers SHOULD prefer the `_meta` extension mechanism (§10) over ad-hoc top-level fields.

### 3.1 Common Fields

#### `name`
- **Type**: string
- **Required**: MUST for all package types
- **Format**: a scoped name matching `^@${SLUG_PATTERN}\/${SLUG_PATTERN}$` (§2.2)
- **Description**: Package identifier.
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
- **Format**: one of `agent`, `skill`, `mcp-server`, `integration`
- **Description**: Determines package validation and required companion files.
- **Example**: `agent`
- **Default**: none

#### `display_name`
- **Type**: string
- **Required**: MUST for `agent`; SHOULD for `skill`, `mcp-server`, and `integration`
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

#### `long_description`
- **Type**: string
- **Required**: MAY
- **Format**: Markdown
- **Description**: Detailed long-form description of the package, intended for catalog listings.
- **Example**: `Collects inbound support requests, normalizes them, and produces a structured triage summary.`
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
- **Format**: SPDX identifier RECOMMENDED ([SPDX]); free text accepted
- **Description**: Declares package licensing metadata.
- **Example**: `MIT`
- **Default**: none

#### `author`
- **Type**: `Author` — either a string (compact form) or an object
- **Required**: MUST for `agent`; MAY for `skill`, `mcp-server`, `integration`
- **Format**: `string` (free text), or `object` with `name` (REQUIRED), `email` (OPTIONAL), `url` (OPTIONAL). The object form is aligned with the npm `author` field.
- **Description**: Human author or publishing identity.
- **Example (string)**: `"AFPS Examples"`
- **Example (object)**: `{ "name": "AFPS Examples", "email": "team@example.com", "url": "https://example.com" }`
- **Default**: none
- **Note**: When a producer emits the string form, consumers SHOULD treat it as equivalent to `{ "name": "<string>" }`.

#### `repository`
- **Type**: `Repository` — either a string (compact form) or an object
- **Required**: MAY
- **Format**: `string` URI (when the repository can be unambiguously identified by a URL), or `object` with `type` (REQUIRED, e.g. `"git"`), `url` (REQUIRED, URI), and `directory` (OPTIONAL, path within the repository). The object form is aligned with the npm `repository` field.
- **Description**: Source repository or project home.
- **Example (string)**: `"https://example.com/afps/customer-intake"`
- **Example (object)**: `{ "type": "git", "url": "https://github.com/example/intake.git", "directory": "packages/intake" }`
- **Default**: none

#### `homepage`
- **Type**: string (URI)
- **Required**: MAY
- **Description**: Package homepage. Aligned with the npm `homepage` field.
- **Example**: `https://example.com/products/customer-intake`
- **Default**: none

#### `documentation`
- **Type**: string (URI)
- **Required**: MAY
- **Description**: Documentation URL for the package.
- **Example**: `https://docs.example.com/customer-intake`
- **Default**: none

#### `support`
- **Type**: string (URI)
- **Required**: MAY
- **Description**: Support or issue-tracker URL (analogous to npm `bugs.url`).
- **Example**: `https://github.com/example/intake/issues`
- **Default**: none

#### `icon`
- **Type**: string
- **Required**: MAY
- **Format**: relative archive path to a PNG image, or an absolute URI
- **Description**: Single-icon presentation hint.
- **Example**: `assets/icon.png`
- **Default**: none

#### `icons`
- **Type**: array of `Icon` objects
- **Required**: MAY
- **Format**: each entry is an object `{ src, size?, theme? }`. `src` is REQUIRED (archive path or URI). `size` is OPTIONAL, of the form `"WIDTHxHEIGHT"`. `theme` is OPTIONAL, one of `light`, `dark`, `high-contrast`. When both `icon` and `icons` are present, `icons` is authoritative.
- **Example**: `[{ "src": "assets/icon-128.png", "size": "128x128" }, { "src": "assets/icon-dark.png", "theme": "dark" }]`
- **Default**: none

#### `screenshots`
- **Type**: array of strings
- **Required**: MAY
- **Format**: each entry is a relative archive path to an image or an absolute URI.
- **Description**: Screenshot images for catalog listings.
- **Example**: `["assets/screenshot-1.png"]`
- **Default**: none

#### `privacy_policies`
- **Type**: array of strings (URIs)
- **Required**: MAY
- **Description**: Privacy-policy URLs for external services the package interacts with.
- **Example**: `["https://example.com/privacy"]`
- **Default**: none

#### `compatibility`
- **Type**: object
- **Required**: MAY
- **Format**: object with OPTIONAL `platforms` (array of `darwin`/`win32`/`linux`), OPTIONAL `runtimes` (map of runtime name → semver range, e.g. `{ "node": ">=18.0.0", "python": ">=3.10" }`), and OPTIONAL `clients` (map of client identifier → semver range, e.g. `{ "claude_desktop": ">=1.0.0" }`).
- **Description**: Declares environment requirements for the package.
- **Example**: `{ "platforms": ["darwin", "linux"], "runtimes": { "node": ">=18.0.0" } }`
- **Default**: none
- **Note (skill)**: an Agent Skills `SKILL.md` frontmatter `compatibility` (a free-text string, see §3.3) is preserved for upstream compatibility but is non-authoritative when the manifest declares the structured `compatibility` object.

#### `schema_version`
- **Type**: string
- **Required**: MUST for `agent`; MAY for `skill`, `mcp-server`, and `integration`
- **Format**: `MAJOR.MINOR` where both segments are non-negative integers (e.g., `2.0`). The format follows a subset of semantic versioning without the patch component. A change in `MAJOR` indicates a breaking manifest model change; a change in `MINOR` indicates an additive, backwards-compatible revision.
- **Description**: Declares which version of the AFPS manifest model the package targets. This field allows consumers to select the appropriate validation rules when the specification evolves. Producers MUST emit at least `2.0` for packages targeting this specification; producers using fields introduced in a later minor revision MUST emit at least the minor that introduced them.
- **Example**: `2.0`
- **Default**: none

#### `dependencies`
- **Type**: object
- **Required**: MAY
- **Format**: object containing optional `skills`, `mcp_servers`, and `integrations` maps. Values MUST be valid semver ranges.
- **Description**: Declares packages that this package depends on. Consumers use this field for dependency resolution, installation, and composition.
- **Example**: `{ "integrations": { "@example/gmail": "^1.0.0" }, "skills": { "@example/rewrite-tone": "^1.0.0" } }`
- **Default**: none

### 3.2 Agent Manifest

Agent manifests extend the common fields above. A conforming agent manifest MUST include `schema_version`, `display_name`, and `author` (§3.1). Per-integration runtime configuration (such as requested OAuth scopes) is declared inside the dependency entry under `dependencies.integrations` (§4.1) using the object form.

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

### 3.4 MCP-Server Package

An `mcp-server` package declares a runnable, local MCP tool server. Its manifest is an AFPS-native manifest at the root (common fields per §3.1, `type: "mcp-server"`, `schema_version`, `name` scoped per §2.2, optional `dependencies` per §4.1) and additionally carries the **MCPB (MCP Bundle) field vocabulary** for the server run declaration, advisory tool list, and user-configuration mechanism.

AFPS does not redefine these MCPB-vocabulary fields; it adopts them verbatim so that an existing MCPB server payload (the contents of an `mcpb init` scaffold) can be packaged as an `mcp-server` without modification. Strict-MCPB host interoperability (validating against the MCPB schema, installing into Claude Desktop or another MCPB host without conversion) is **not** a goal of AFPS 2.0: a publish-time projection to a strict MCPB bundle MAY be added in a future minor (§10.2). Producers that need strict-MCPB compatibility today MUST emit the strict form separately.

#### `manifest_version`
- **Type**: string
- **Required**: MUST for `mcp-server`
- **Format**: tags the MCPB-vocabulary version of the embedded `server` / `tools` / `user_config` fields. Producers SHOULD emit `"0.3"` (the baseline of `mcpb init`). Producers MUST emit `"0.4"` only when the `uv` server type is required.
- **Description**: Independent of the AFPS `schema_version`. A higher `manifest_version` indicates that the MCPB-vocabulary block uses MCPB additions; `schema_version` continues to track AFPS-model evolution.
- **Default**: none

#### `server`
- **Type**: object
- **Required**: MUST for `mcp-server`
- **Format**: object with REQUIRED `type` (`node` | `python` | `binary` for `manifest_version: "0.3"`; additionally `uv` for `"0.4"`), REQUIRED `entry_point` (relative path within the archive), and REQUIRED `mcp_config` `{ command, args?, env?, platform_overrides? }`. The field shapes follow MCPB; AFPS introduces no new `server.type` values. Remote MCP endpoints, container surfaces, and other non-local capability surfaces are modeled as an `integration` `source` (§7.1), not as an `mcp-server`.
- **Description**: Declares how the server is launched.
- **Default**: none

#### `tools`
- **Type**: array of objects
- **Required**: MAY
- **Format**: each entry is `{ name, description }`. Advisory metadata; the authoritative tool list is obtained from the running MCP server.
- **Default**: none

#### `user_config`
- **Type**: object
- **Required**: MAY
- **Format**: a map of user-supplied configuration entries following the MCPB `user_config` vocabulary (`type`, `title`, `description`, `required?`, `default?`, `multiple?`, `sensitive?`, `min?`, `max?`). An entry with `sensitive: true`, substituted as `${user_config.KEY}` into `server.mcp_config.env`, is the credential mechanism a `local` integration binds to (§7.6).
- **Description**: User-configurable options the server requires at run time.
- **Default**: none

#### Required files and packaging

An `mcp-server` archive MUST contain `manifest.json` at the archive root and the server payload referenced by `server.entry_point`. A published archive MUST be self-contained: every runtime dependency of the entry point MUST be bundled into the archive. An `icon`, if present, MUST be a relative path to a real PNG within the archive. The `.afps` extension is the canonical archive extension (§2.5).

#### Relationship to MCPB

The `server` / `tools` / `user_config` fields adopt the MCPB vocabulary verbatim so that producers can reuse MCPB tooling and conventions when authoring the server payload. The full AFPS manifest as published is **not** a strict MCPB manifest (it includes AFPS-native top-level fields outside the MCPB schema) and SHOULD NOT be expected to validate against the MCPB schema or install into an MCPB host as-is. A future minor of AFPS MAY define an interoperability projection that emits a strict-MCPB bundle alongside the AFPS archive.

### 3.5 Integration Package

An `integration` package is manifest-only (plus an optional `INTEGRATION.md` companion). It describes a **credentialed binding to an external service**: which capability surface the service is reached through (`source`), how the caller authenticates (`auths`), how an acquired credential is injected at runtime (`delivery`), and optional per-tool metadata. The full authentication model is specified in §7.

An integration is service-centric: the service (for example Gmail, Stripe) is the identity, and the capability source is one way to reach it. Authentication is bound to the integration, not to the source. An integration is an AFPS-native manifest; it is never an MCPB manifest and is not installed directly into an MCPB host. When an integration's `source.kind` is `local`, it references an `mcp-server` package (§7.1); the integration's authentication layer is applied by the AFPS runtime on top of that server.

#### Common fields

An integration manifest uses the common fields (§3.1): `name` (scoped), `version`, `type: "integration"`, `schema_version`, `display_name`, and optional `description`, `keywords`, `icon`, `license`, `repository`.

#### `source`
- **Type**: object
- **Required**: MUST for `integration`
- **Format**: object with a `kind` discriminant and exactly one matching sub-object (§7.1)
- **Description**: The capability surface the integration binds to: `local` (an `mcp-server`), `remote` (a hosted MCP endpoint), or `api` (an HTTP API).
- **Example**: `{ "kind": "local", "server": { "name": "@example/gmail-server", "version": "^1.2.0" } }`
- **Default**: none

#### `auths`
- **Type**: object
- **Required**: MUST for `integration`
- **Format**: map keyed by an auth-method key matching `^[a-z][a-z0-9_]*$`; each value is an auth-method object (§7.2). At least one entry is REQUIRED.
- **Description**: One or more authentication methods the integration supports. See §7 for the full vocabulary.
- **Example**: `{ "oauth": { "type": "oauth2", "issuer": "https://accounts.google.com", "delivery": { "http": { "in": "header", "name": "Authorization", "prefix": "Bearer ", "value": "{$credential.access_token}" } } } }`
- **Default**: none

> The integration manifest uses the common-fields `icon` / `icons` (§3.1) for presentation; the legacy integration-scoped `icon` field is folded into the common fields and is no longer documented separately here.

#### `INTEGRATION.md`
- **Required**: MAY
- **Format**: Markdown file at archive root
- **Description**: Optional companion file providing API documentation for agent consumption. When present, consumers SHOULD make this file available to the agent at run time. The file SHOULD contain concise API documentation optimized for language model consumption: key endpoints, request/response examples, common patterns, and important constraints. Producers SHOULD keep `INTEGRATION.md` under 500 lines to support progressive disclosure — detailed reference material belongs in external documentation.

## 4. Dependency Model

### 4.1 Dependency Declaration

A package declares its dependencies using the `dependencies` field. The field contains optional maps keyed by dependency type:

```json
{
  "dependencies": {
    "integrations": {
      "@acme/gmail": {
        "version": "^1.0.0",
        "scopes": ["https://www.googleapis.com/auth/gmail.readonly"]
      }
    },
    "skills": { "@acme/rewrite-tone": "^1.0.0" },
    "mcp_servers": { "@acme/fetch-json": "^1.0.0" }
  }
}
```

Each map entry is an AFPS package identity (§2.2) paired with a **dependency value**. Dependency keys MUST be valid scoped names matching the pattern defined in §2.2. All package types MAY declare a top-level `dependencies` field.

A dependency value takes one of two shapes:

- **string form**: a valid semver range (e.g. `"^1.0.0"`). Equivalent to the object form `{ "version": "<string>" }`.
- **object form**: an object whose `version` member MUST be a valid semver range, plus any number of dependency-type-specific OPTIONAL fields documented below.

Consumers MUST accept both forms and normalize the string form to `{ "version": "<string>" }` before processing.

#### Per-dependency-type fields

For `dependencies.integrations.<id>` (object form), AFPS v2.0 defines the following OPTIONAL fields:

- `scopes` (array of strings) — the OAuth scopes the depending package requests from this integration. Consumers compute the effective requested scope set as the union of `scopes` across the package's configured integrations (§7.4).
- `auth_key` (string) — selects an `auths.<key>` entry when the referenced integration declares more than one auth method. When omitted, consumers select the integration's sole auth method, or apply consumer-defined policy when multiple exist.

For `dependencies.skills.<id>` and `dependencies.mcp_servers.<id>`, AFPS v2.0 defines no extra fields beyond `version`. Producers MAY add fields under `_meta` within the object form (§10).

> **Migration note.** AFPS earlier drafts declared per-integration configuration under a sibling agent-level field `integrations_configuration` (`{ scopes }`). That field is **deprecated** in AFPS 2.0 in favor of the object dependency form above. Consumers MUST keep accepting an agent-level `integrations_configuration` map for backward compatibility and MUST merge it into the dependency entries (a sibling `scopes` always wins over the deprecated map).

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
  │ integration  │ │ rewrite-   │ │ fetch-json │
  │ (OAuth2)     │ │ tone       │ │ mcp-server │
  │              │ │ skill      │ │            │
  └──────────────┘ └────────────┘ └────────────┘
```

### 4.2 Version Range Resolution

A dependency entry's `version` (in the object form, or the entry value itself in the string form) MUST be a valid semver range (e.g., `^1.0.0`, `~2.1`, `>=3.0.0`, `*`). Consumers MUST reject invalid semver range syntax. How consumers resolve ranges against a package catalog is an implementation concern.

### 4.3 Circular Dependencies

A package MUST NOT declare a dependency on itself. Consumers SHOULD detect circular dependencies in the transitive dependency graph and report them with a concrete cycle path.

### 4.4 Integration Configuration (Deprecated)

The sibling `integrations_configuration` map keyed by integration package id is **deprecated** in AFPS 2.0. Per-integration configuration (such as requested OAuth scopes or auth-method selection) is now declared inline inside `dependencies.integrations.<id>` using the object dependency form (§4.1).

Consumers MUST keep accepting the deprecated `integrations_configuration` map for backward compatibility. When both forms are present for the same integration, the dependency-entry object form takes precedence and the deprecated map MUST be ignored for that integration.

## 5. Schema System

AFPS uses standard JSON Schema 2020-12 for property definitions within agent `input`, `output`, and `config` sections, and within an integration auth method's `credentials.schema` (§7.5). The container schema MUST be an object with `type: "object"` and a `properties` record. Any valid JSON Schema 2020-12 keyword may be used within property definitions.

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

> JSON Schema keywords such as `contentMediaType` and `maxItems` are part of the JSON Schema 2020-12 vocabulary and retain their standard (camelCase) spelling. The AFPS `snake_case` convention applies to AFPS-defined manifest fields, not to embedded JSON Schema documents.

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

The URI scheme is consumer-defined. A consumer MAY use `http(s)://` for direct references, `data:` for inline content, or a private scheme (for example `upload://upl_xxx`) to denote a pre-uploaded blob managed by the consumer. Consumers MUST resolve the URI to the actual file bytes before passing the value to an agent at run time.

Upload constraints such as accepted file extensions and maximum file size are not JSON Schema concerns. They are declared in the `file_constraints` section of the schema wrapper (see §5.4).

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
  "file_constraints": {},
  "ui_hints": {},
  "property_order": []
}
```

The `schema` member MUST be a valid JSON Schema 2020-12 object. The remaining fields are AFPS-specific metadata that lives outside the schema to preserve JSON Schema purity.

The wrapper object is required when any of these sections are present. A bare schema object is not valid in those locations.

#### `file_constraints`
- **Type**: object (keyed by property name)
- **Required**: MAY
- **Description**: Upload constraints for file fields. Each entry MAY contain:
  - `accept` (string): comma-separated file extensions or MIME-type selectors (e.g., `.pdf,.docx`).
  - `max_size` (number): maximum accepted file size in bytes for a single file.
- **Example**: `{ "attachments": { "accept": ".pdf,.docx", "max_size": 10485760 } }`

#### `ui_hints`
- **Type**: object (keyed by property name)
- **Required**: MAY
- **Description**: UI rendering hints for schema fields. Each entry MAY contain:
  - `placeholder` (string): hint text shown before the user provides a value.
- **Example**: `{ "query": { "placeholder": "label:inbox newer_than:7d" } }`

#### `property_order`
- **Type**: array of strings
- **Required**: MAY
- **Description**: Presentation hint for property ordering. Listed properties SHOULD be rendered first, in the given order. Properties present in `properties` but absent from `property_order` SHOULD be appended after the listed ones, in their natural object-key order.
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
- resolved skills, MCP servers, and integrations; and
- integration configuration under `integrations_configuration`.

AFPS does not define prompt templating, state persistence, scheduling, or transport semantics. Those concerns are out of scope.

### 6.2 Timeout

`timeout` is a numeric hint expressed in seconds. It communicates the producer's expectation of how long the agent needs to complete.

AFPS v2.0 does not impose a manifest-level default for this field. If a consumer chooses a local default, it SHOULD document it separately from the manifest itself.

## 7. Integration Authentication

This section specifies the `integration` manifest model: its capability source, authentication methods, credential delivery, and declarative credential acquisition.

An integration authenticates the **upstream-credential hop** — the credential the integration's source needs to reach the external service. This is distinct from, and complementary to, the client-to-server authorization an MCP host performs (which the MCP Authorization specification covers): AFPS describes the upstream hop that MCP declares out of scope.

### 7.1 Capability Source

`source` declares the surface the integration binds to. It is an object with a `kind` discriminant and exactly one matching sub-object.

```jsonc
"source": {
  "kind": "local" | "remote" | "api",

  // kind = local: reference an mcp-server by AFPS identity + semver range (§2.2, §4).
  "server": { "name": "@example/gmail-server", "version": "^1.2.0", "vendored": true },

  // kind = remote: a hosted MCP endpoint.
  "remote": { "url": "https://example.com/mcp", "transport": "streamable-http" | "sse" },

  // kind = api: a credential-injecting HTTP API surface (no MCP server).
  "api": { "upload_protocols": ["google-resumable", "s3-multipart", "tus", "ms-resumable"] }
}
```

- **`local`** — `source.server` references an `mcp-server` package by its AFPS package identity (`name`, a scoped name per §2.2) and a semver `version` range. This is the only source whose referenced server is itself a standalone MCPB-runnable artifact; the integration's authentication layer is applied by the AFPS runtime on top. The optional `vendored` boolean records that the referenced MCP server was vendored into the publishing pipeline at build time (MCPB bundles dependencies into the archive rather than resolving registry references at install time). Build-provenance for a vendored foreign package (for example a [Package URL]) MAY be recorded under `_meta`; it is never the reference mechanism.
- **`remote`** — `source.remote` declares a hosted MCP endpoint with a `url` and a `transport` (`streamable-http` or `sse`). A remote source has no `mcp-server` package and no `.mcpb` form.
- **`api`** — `source.api` declares a direct HTTP API surface reached through credential injection (no MCP server). `upload_protocols` MAY declare resumable upload protocols the API supports as an **open** array of strings. AFPS v2.0 reserves and recommends the following values for interoperability: `google-resumable`, `s3-multipart`, `tus`, `ms-resumable`. Producers MAY emit other protocol identifiers (preferring a reverse-DNS qualified string such as `com.example/proprietary-resumable` for non-standard protocols) and consumers MUST preserve unknown values without rejecting them. Adding a recommended value does not require a specification revision.

A source whose surface is not a local MCP server (`remote`, or any non-local API) cannot be expressed as an `mcp-server` package and has no `.mcpb` form. This is a property of the source kind, not a runnability gradient.

### 7.2 Auth Methods

`auths` is a map of one or more named authentication methods. The key matches `^[a-z][a-z0-9_]*$` and disambiguates methods when a manifest declares more than one. Each value is an object whose `type` selects the authentication model:

- `oauth2` — OAuth 2.0 / OpenID Connect (§7.3);
- `api_key` — a user-supplied API key or token, described by `credentials.schema` (§7.5);
- `basic` — HTTP Basic credentials, described by `credentials.schema` (§7.5);
- `mtls` — mutual TLS client authentication. The user-supplied client certificate and private key (and optional intermediate chain) are described by `credentials.schema` (§7.5); they are injected via `delivery.files` (§7.6) at well-known paths the underlying HTTP client loads. Maps to OpenAPI `mutualTLS` (§7.11);
- `custom` — credentials acquired by a declarative `connect` flow (§7.7) or supplied directly, described by `credentials.schema` (§7.5).

Every auth method MUST declare `delivery` (§7.6) — where its credential is injected at runtime. An auth method MAY declare `authorized_uris` / `allow_all_uris` (§7.9).

### 7.3 OAuth2 Configuration and Discovery

For an auth method of `type: "oauth2"`, the endpoint set is resolved **discovery-first**: a consumer SHOULD fetch the authorization server's metadata document and MAY accept manual overrides. Discovery is best-effort enrichment, never a precondition — many providers publish no discovery document, so every discovered field MUST be overridable and a fully-manual configuration MUST be supported.

#### `issuer`
- **Type**: string (URI)
- **Required**: SHOULD (REQUIRED to enable discovery)
- **Description**: The OAuth 2.0 / OIDC issuer identifier. Consumers use it to locate the authorization server metadata document. When `issuer` is absent, the manual endpoint fields below are REQUIRED.

#### Endpoint fields (RFC 8414 / OIDC Discovery vocabulary, verbatim)

These fields use the snake_case field names defined by [RFC 8414] and [OpenID Connect Discovery] so that a value may be copied directly from a discovery document. Any field a consumer obtains from discovery MUST be overridable by an explicit manifest value.

- `authorization_endpoint` (string, URI) — REQUIRED when discovery is unavailable. [RFC 8414]
- `token_endpoint` (string, URI) — REQUIRED when discovery is unavailable. [RFC 8414]
- `userinfo_endpoint` (string, URI) — OPTIONAL. [OpenID Connect Discovery]
- `token_endpoint_auth_method` (string) — OPTIONAL. One of the values defined by [RFC 7591] / [OpenID Connect Core], e.g. `client_secret_basic` (default per [RFC 8414] §2 / [RFC 7591] §2), `client_secret_post`, `none`.
- `code_challenge_methods_supported` (array of strings) — OPTIONAL; PKCE methods, e.g. `["S256"]`. [RFC 8414] / [RFC 7636]. A consumer SHOULD use `S256` when supported. When a provider supports PKCE but does not advertise it, a manifest MAY supply `["S256"]` as a manual override.
- `resource` (string, URI) — OPTIONAL; the protected-resource indicator sent on authorization and token requests per [RFC 8707]. This field is named `resource`, not `audience`. A consumer SHOULD send it for forward compatibility even when the authorization server is known to ignore it; the resource server MUST independently validate the token audience.
- `authorization_params` (object) — OPTIONAL; additional query parameters appended to the authorization request (an AFPS field), e.g. `{ "access_type": "offline" }`.

#### Discovery procedure

When `issuer` is present and a consumer performs discovery, it MUST probe the three well-known locations, in order, until one returns a valid document whose `issuer` member equals the requested issuer (after stripping any trailing `/`):

1. RFC 8414 path-insertion: `https://{host}/.well-known/oauth-authorization-server{/path}`;
2. OIDC path-insertion: `https://{host}/.well-known/openid-configuration{/path}`;
3. OIDC path-append: `https://{host}{/path}/.well-known/openid-configuration`.

A consumer MUST validate that the returned `issuer` equals the configured issuer before using any discovered endpoint. Discovery failure MUST fall back to the manual endpoint fields; it MUST NOT block configuration when those fields are present. See §8.7 for the SSRF considerations of fetching discovery documents.

### 7.4 Scopes

OAuth scopes are declared in two AFPS fields, distinct from the non-authoritative `scopes_supported` of [RFC 8414]:

#### `default_scopes`
- **Type**: array of strings
- **Required**: MAY
- **Description**: The baseline scope set requested when an agent does not request a narrower or wider set. The effective requested scopes for an agent are computed from `integrations_configuration.<id>.scopes` (§4.4), defaulting to `default_scopes` when unspecified.

#### `scope_catalog`
- **Type**: array of objects
- **Required**: MAY
- **Description**: The AFPS catalog of scopes this integration recognizes, used for selection UX and policy. Each entry is `{ value, label, description?, implies? }`:
  - `value` (string) — the OAuth scope string;
  - `label` (string) — a short human-facing label;
  - `description` (string) — OPTIONAL longer explanation;
  - `implies` (array of strings) — OPTIONAL scopes implied by granting this one.
- **Note**: `scope_catalog` is the AFPS source of truth for scope selection. [RFC 8414] `scopes_supported` is RECOMMENDED-only and frequently incomplete; a consumer MAY seed catalog values from discovery but MUST treat the manifest `scope_catalog` as authoritative. The `label`/`description`/`implies` data is not provided by any OAuth metadata standard.

#### Identity claims

- `identity_claims` (object) — OPTIONAL; maps AFPS identity keys to OIDC claim names, e.g. `{ "account_id": "sub", "email": "email" }`.
- `required_identity_claims` (array of strings) — OPTIONAL; the OIDC claims that MUST be present on a resolved identity, e.g. `["sub"]`.

### 7.5 Credential Schema

For auth methods of `type` `api_key`, `basic`, `mtls`, or `custom`, `credentials.schema` is REQUIRED. It declares the shape of the user-supplied credential bag. For `mtls`, the schema SHOULD describe the client certificate (PEM), the private key (PEM), and an optional intermediate chain.

- `credentials.schema` MUST be a self-contained JSON Schema 2020-12 document (the dialect adopted by §5). Each property defines a credential field the user must supply.
- Any `$ref` inside `credentials.schema` MUST be a local fragment-only pointer (`#/...`). External or remote `$ref` MUST NOT be used. This keeps credential schemas offline-validatable and prevents schema-fetch SSRF (§8.7).

### 7.6 Credential Delivery

`delivery` declares where an acquired credential is injected at runtime. At least one of `{http, env, files}` MUST be declared per auth method.

```jsonc
"delivery": {
  // HTTP injection. `in` + `name` adopt the OpenAPI Security Scheme location vocabulary;
  // `prefix`, `value`, and `encoding` are AFPS additions.
  "http": {
    "in": "header" | "query" | "cookie",
    "name": "Authorization",
    "prefix": "Bearer ",                       // OAuth/bearer: no encoding
    "value": "{$credential.access_token}",
    "allow_server_override": false
  },
  // HTTP Basic vendor pattern (RFC 7617): base64 over the rendered `value` only;
  // the `Basic ` prefix is concatenated AFTER encoding (the scheme prefix is not base64'd).
  // "http": { "in": "header", "name": "Authorization", "prefix": "Basic ",
  //           "value": "{$credential.email}/token:{$credential.api_key}",
  //           "encoding": "base64" },
  // Environment-variable injection (Kubernetes-style vocabulary).
  "env": {
    "GMAIL_TOKEN": {
      "value": "{$credential.access_token}",
      "sensitive": true,
      "user_config_key": "GMAIL_TOKEN"
    }
  },
  // File injection (Kubernetes-style vocabulary). `mode` is an octal string; default "0400".
  "files": {
    "/run/creds/token": { "value": "{$credential.token}", "mode": "0400" }
  }
}
```

- **`http`** — credential injection into an HTTP request. `in` (`header`, `query`, `cookie`) and `name` adopt the OpenAPI Security Scheme location vocabulary; `prefix` and `value` are AFPS additions (OpenAPI has no value template). The combination `http` + `Authorization` + `"Bearer "` maps to the `Authorization: Bearer` convention. `encoding` is OPTIONAL and, when present, MUST be `base64` ([RFC 4648] §4), applied to the rendered `value` string (NOT to `prefix`), with the encoded result then concatenated after `prefix` — expressing HTTP Basic vendor patterns per [RFC 7617] (for example `value: "{$credential.email}/token:{$credential.api_key}"`, `prefix: "Basic "`, `encoding: "base64"` produces `Authorization: Basic <base64(email/token:api_key)>`, leaving the `Basic ` scheme prefix unencoded). Consumers MUST reject an unknown `encoding`. `allow_server_override` (boolean, default `false`) governs whether the source server may override the injected value. HTTP delivery is a man-in-the-middle/proxy injection in which the source server never sees the secret.
- **`env`** — injection as one or more environment variables. Each entry has a `value` template, an OPTIONAL `sensitive` boolean, and an OPTIONAL `user_config_key` string. `env` delivery maps onto MCPB `user_config` → `${user_config.KEY}` (§3.4): the source server holds the secret. `user_config_key` names the MCPB `user_config` key that an AFPS build step MUST inject into the referenced `mcp-server` so the rendered `value` reaches the server through `${user_config.<user_config_key>}` in `mcp_config.env`. When `user_config_key` is omitted, consumers SHOULD default to the env-variable name itself (the map key). This is the delivery mode that lets a `local`-source integration's referenced `mcp-server` also run standalone in an MCPB host.
- **`files`** — injection as one or more files. Each entry has a `value` template and an OPTIONAL `mode` (an octal string such as `"0400"`; default `"0400"`).

`http` (proxy injection, server never holds the secret) and `env`/`files` (server holds the secret) are mutually exclusive per auth method: an auth method MUST NOT mix `http` with `env`/`files`.

No specification standardizes runtime secret injection into environment variables and files; the `env`/`files` vocabulary borrows Kubernetes naming (`mode`, mount-style paths) and is an AFPS contribution.

Value templates use the runtime-expression grammar of §7.7 (`{$credential.<field>}`, `{$outputs.<name>}`).

### 7.7 Declarative Credential Acquisition (connect)

`connect` declares how a `custom` auth method acquires its credential without OAuth. It is valid only for `type: "custom"`. A `connect` object MUST contain exactly one of:

- `login` — a declarative HTTP login flow (specified below); or
- `tool` — an orchestrated acquisition driven by a tool. This mode is OPTIONAL and experimental: its field shapes are specified, but its security properties are left to the implementation.

```jsonc
"connect": {
  "login": {
    // Inline HTTP request. (AFPS divergence from Arazzo, which references an OpenAPI
    // operation; an integration has no OpenAPI document to point at, so the request is inline.)
    "request": {
      "method": "POST",
      "url": "https://api.example.com/login",
      "headers": {},
      "body": "…",
      "content_type": "application/json"
    },
    // Arazzo Criterion vocabulary (condition + optional context + type). When omitted,
    // success defaults to HTTP 2xx (AFPS-defined; Arazzo leaves HTTP success undefined).
    "success_criteria": [ { "condition": "$statusCode == 200" } ],
    // Outputs: each value is an Arazzo runtime-expression string, an Arazzo
    // Selector Object, OR an AFPS extractor object for cases Arazzo cannot
    // express (cookie, jwt).
    "outputs": {
      "token": "$response.body#/access_token",
      "exp":   "$response.header.X-Expires-After",
      "user":  { "context": "$response.body", "selector": "$.profile.id", "type": "jsonpath" },
      "csrf":  { "from": "cookie", "name": "XSRF-TOKEN" },
      "sub":   { "from": "jwt", "token": "{$outputs.token}", "path": "/sub" }
    },
    "expires_in_output": "exp",
    "identity_outputs": ["sub"]
  },
  "limits": { "request_timeout_ms": 30000, "max_response_bytes": 5000000 }
}
```

- **`request`** — the inline HTTP request issued to obtain the credential. `content_type` selects the body encoding.
- **`success_criteria`** — an array of Arazzo Criterion objects (`condition`, optional `context`, optional `type` of `simple`/`regex`/`jsonpath`/`xpath`). When omitted, success is HTTP 2xx.
- **`outputs`** — a map of named outputs. Each value is one of:
  - an **Arazzo runtime-expression string** (Arazzo §5.9): `$statusCode`, `$response.body#/{json-pointer}` ([RFC 6901]), `$response.header.{name}`, `$outputs.{name}`;
  - an **Arazzo Selector Object** (Arazzo 1.1 §5.8.13) with `{ context (runtime expression), selector (string), type ("jsonpath" | "xpath" | "jsonpointer") }`. Consumers MUST resolve `jsonpath` per [RFC 9535], `jsonpointer` per [RFC 6901], and `xpath` per [XML Path Language 3.1];
  - an **AFPS extractor object** that extends Arazzo for cases the Selector Object cannot express:
    - `{ "from": "cookie", "name": "<cookie-name>" }`;
    - `{ "from": "jwt", "token": "{$outputs.<name>}", "path": "/<json-pointer>" }`;
    - `{ "from": "regex", "source": "{$response.body}", "pattern": "<regex>", "group": <n> }` — note: the equivalent Arazzo Selector Object form (when only a single capture is needed) is `{ "context": "...", "selector": "<regex>", "type": "regex" }` carried inside a Criterion; AFPS keeps `from: regex` as the output-side spelling for symmetry with `cookie`/`jwt`. Producers MAY emit either; consumers MUST accept both.
- **`expires_in_output`** — the name of the output that carries credential expiry.
- **`identity_outputs`** — the names of outputs that establish the connection identity.
- **`limits`** — OPTIONAL request guardrails: `request_timeout_ms`, `max_response_bytes`.

**Gating rule.** A `delivery.*` value template MAY only reference declared `connect` outputs (or, for the orchestrated `tool` mode, its declared `produces`). A delivery referencing a non-output — for example a bootstrap login secret — is a manifest error.

Runtime expressions are embedded into templates with `{$expr}` (for example `{$outputs.token}`). The grammar is adopted from [Arazzo]; the extractor objects (`from: jwt|regex|cookie`) are AFPS extensions.

### 7.8 Per-Tool Policy

`integration.tools_policy` is an OPTIONAL **sparse policy table** keyed by tool name. It carries per-tool authorization metadata for `local` and `remote` sources. It is NOT the catalog of "tools this integration exposes" — that catalog is canonical to the referenced surface (the disambiguating reason for the `_policy` suffix, distinct from `mcp-server.tools` which IS such a catalog):

- for `source.kind = local`, the canonical catalog is the `tools[]` array of the referenced `mcp-server` package (§3.4);
- for `source.kind = remote`, the canonical catalog is obtained by introspecting the remote MCP endpoint at runtime;
- for `source.kind = api`, there is no MCP-tool catalog and `integration.tools_policy` is generally not used.

When `integration.tools_policy.<name>` is declared, it **augments** the canonical entry for `<name>`. Consumers SHOULD validate at install (or at publish, for a registry) that each key in `integration.tools_policy` corresponds to a tool present in the resolved canonical catalog.

```jsonc
"tools_policy": {
  "list_issues": {
    "required_scopes": ["repo"],
    "required_auth_key": "oauth",
    "url_patterns": [ { "pattern": "https://api.github.com/**", "methods": ["GET"] } ]
  }
}
```

- `required_scopes` (array of strings) — scopes a tool requires; contributes to the agent-install scope union (§7.4).
- `required_auth_key` (string) — selects which `auths` entry a tool uses when the integration declares more than one.
- `url_patterns` (array) — defence-in-depth allowlist of `{ pattern, methods? }`, where `pattern` is a glob (`*` single segment, `**` multi-segment) and `methods` is an OPTIONAL list of HTTP methods.

#### `hidden_tools`

`integration.hidden_tools` is an OPTIONAL array of tool names. Tools listed here exist in the resolved canonical catalog but MUST NOT be exposed to the agent's tool picker / `tools/list` surface. Tools referenced by a `connect.tool` (run-start primitives) are auto-hidden, so `hidden_tools` only needs to enumerate the remaining tool names to suppress.

> **Note (placement).** Per-tool policy lives on the integration because the policy itself (required scopes, allowed URL patterns, auth-key selection) is a property of how the credentialed binding is used, not of the server's tool list.

### 7.9 URI Restrictions

An auth method MAY restrict which upstream URIs the integration may send credentials to:

- `authorized_uris` (array of strings) — allowed upstream URI patterns (glob `*`/`**`).
- `allow_all_uris` (boolean) — explicit override permitting any upstream URI. When omitted, consumers resolve `allow_all_uris` as `false`.

Consumers MUST NOT send credentials to URIs outside the authorized set unless `allow_all_uris` is explicitly `true`, and SHOULD treat `allow_all_uris: true` as security-sensitive (§8.6).

### 7.10 Setup Guide

An integration MAY declare a `setup_guide` with human-facing instructions for configuring credentials (for example, registering an OAuth client):

- `setup_guide.steps` (array) — an ordered list of steps; each step MUST have a `label` and MAY have a `url`.

`callback_url_hint` is a property of an OAuth2 auth method (not of the integration as a whole), and is therefore declared under `auths.<key>.callback_url_hint` (string; often containing a placeholder such as `{{callback_url}}`). The top-level `setup_guide.callback_url_hint` from earlier drafts is **deprecated**; consumers MUST keep accepting it for backward compatibility and SHOULD treat it as a fallback when the auth method does not declare one.

### 7.11 OpenAPI Security Scheme Mapping (Informative)

An AFPS auth method maps onto an [OpenAPI] Security Scheme (also used by [A2A] `securitySchemes` and the [OpenAI Apps SDK]). Consumers MAY use this mapping to expose AFPS integrations to A2A clients, Apps SDK hosts, or other OpenAPI-aware tooling. Conversely, an integration manifest MAY be derived (in part) from a published OpenAPI Security Scheme.

| AFPS `auths.<key>.type` | OpenAPI Security Scheme |
| --- | --- |
| `oauth2` | `{ "type": "oauth2", "flows": { ... } }` — flows derived from `authorization_endpoint`/`token_endpoint`/`default_scopes`/`scope_catalog` |
| `api_key` | `{ "type": "apiKey", "in": "<delivery.http.in>", "name": "<delivery.http.name>" }` — when `delivery.http` is declared |
| `basic` | `{ "type": "http", "scheme": "basic" }` |
| `mtls` | `{ "type": "mutualTLS" }` (OpenAPI 3.1+) |
| `custom` | not standardly representable; SHOULD be omitted from a derived OpenAPI document or recorded under `_meta` (§10) |

This mapping is informative and does not impose normative requirements on AFPS consumers.

## 8. Security Considerations

AFPS packages describe AI workflows that may access external services, process user data, and execute code. Implementers MUST consider the following threats.

### 8.1 Archive Processing

ZIP archives are a well-known vector for path traversal and denial-of-service attacks. Consumers MUST:

- reject entries containing `..` path segments, absolute paths, null bytes, or backslash separators (see §2.5);
- enforce a maximum uncompressed archive size to prevent zip bombs;
- limit the total number of entries extracted from a single archive.

Consumers SHOULD ignore `__MACOSX/` directories and other platform-specific metadata entries.

### 8.2 MCP-Server Code Execution

MCP-server packages (§3.4) bundle a runnable server payload that consumers and MCPB hosts load and execute. This is the highest-risk surface in the AFPS model:

- consumers that execute server code SHOULD do so in a sandboxed environment with the minimum necessary permissions;
- consumers SHOULD prevent server code from accessing the host filesystem, network, or environment variables beyond the scope the server requires;
- consumers SHOULD apply a timeout to server execution to prevent resource exhaustion;
- registries SHOULD perform static analysis or review of the bundled server payload before making a package publicly available; registries that build the payload at publish time SHOULD additionally verify that the emitted artifact was produced from the declared source tree;
- consumers SHOULD verify any MCPB `sign` signature (§3.4) before executing a signed bundle.

AFPS does not define how server code is loaded or executed beyond delegating to MCPB. Consumers are responsible for implementing appropriate security measures for their execution environment.

### 8.3 Credential Handling

Integration packages (§3.5, §7) describe authentication configurations that involve OAuth tokens, API keys, and other secrets:

- consumers MUST store credentials encrypted at rest;
- consumers MUST NOT include credentials in manifest files, log entries, or error messages;
- consumers SHOULD transmit credentials only over TLS-secured connections;
- `delivery.env` and `delivery.files` entries marked `sensitive` (or carrying secrets) MUST be handled inside the trusted boundary that performs credential decryption;
- when `delivery.http` is used (proxy injection), the source server MUST NOT receive the secret unless `allow_server_override` permits it;
- the `authorized_uris` field (§7.9) SHOULD be enforced at runtime to prevent credential leakage to unintended endpoints;
- consumers SHOULD treat `allow_all_uris: true` as a security-sensitive configuration and warn users accordingly.

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
- consumers SHOULD pin dependency versions or use lock files for production deployments;
- because an `mcp-server` bundles its dependencies into the archive (§3.4), consumers SHOULD verify the provenance of vendored dependencies recorded under `_meta` where available.

### 8.6 URI Restrictions

Integration auth methods include `authorized_uris` to restrict which upstream endpoints a credential can be sent to:

- consumers MUST NOT send credentials to URIs outside the authorized set unless `allow_all_uris` is explicitly `true`;
- URI patterns using wildcards (e.g., `https://api.example.com/**`) SHOULD be matched strictly — consumers MUST NOT allow pattern bypass via URL encoding, fragment injection, or open redirects.

### 8.7 Credential Discovery (SSRF)

OAuth discovery (§7.3) and credential schemas (§7.5) involve fetching or resolving URIs that may be influenced by package content:

- consumers performing OAuth discovery MUST validate that a fetched metadata document's `issuer` equals the configured issuer before using any endpoint from it (§7.3);
- consumers SHOULD restrict discovery fetches to the issuer host and SHOULD apply timeouts and response-size limits;
- `credentials.schema` `$ref` MUST be local fragment-only (§7.5); consumers MUST NOT dereference external or remote `$ref`, which would otherwise enable server-side request forgery;
- `connect.login` requests (§7.7) SHOULD be subject to the declared `limits` and to the same egress controls as `authorized_uris`.

## 9. Privacy Considerations

AFPS packages may process personally identifiable information (PII) through agent inputs, integration connections, and execution outputs:

- consumers SHOULD document which data is transmitted to external services during agent execution;
- consumers SHOULD provide users with visibility into what data an agent accesses via its `dependencies` and `integrations_configuration` declarations;
- consumers SHOULD ensure that execution state, credentials, and intermediate data are appropriately managed according to data protection requirements;
- registries SHOULD NOT require or store PII in package manifests beyond the `author` field.

Implementers operating in jurisdictions with data protection regulations (e.g., GDPR, CCPA) SHOULD consult their compliance requirements for the handling of user data within AI workflows.

## 10. Extensibility

AFPS manifests and several nested objects accept additional fields beyond those defined in this specification. This design allows producers and consumers to experiment with new metadata without requiring a specification revision.

### 10.1 The `_meta` Extension Mechanism

AFPS adopts the Model Context Protocol `_meta` key convention as its single extension mechanism, across all package types. Extension data MUST be placed inside a top-level `_meta` object (and SHOULD NOT appear as ad-hoc top-level fields):

```json
{
  "name": "@example/my-agent",
  "version": "1.0.0",
  "type": "agent",
  "schema_version": "2.0",
  "_meta": {
    "dev.afps/policy": { "tier": "high" },
    "dev.appstrate/cost-center": "engineering"
  }
}
```

The `_meta` object is a record of namespaced keys. Each key is an OPTIONAL reverse-DNS prefix (a dotted label sequence followed by `/`) plus a name; for example `dev.afps/policy` or `dev.appstrate/cost-center`. The value at a namespaced key MUST be a JSON object.

- The `dev.afps/` prefix (reverse-DNS of the AFPS project domain `afps.dev`) is the vendor-neutral, spec-aligned namespace any AFPS runtime reads. This namespace is reserved for use by this specification and its successors.
- Vendors use their own reverse-DNS prefix for implementation-specific data (for example `dev.appstrate/`). A vendor MUST use a reverse-DNS prefix derived from a domain it controls.
- Producers MUST NOT use an `mcp` or `modelcontextprotocol` prefix; those are reserved by MCP.

> **Editorial note (namespace control).** The `afps.dev` domain corresponding to the `dev.afps/` prefix is under active registration by the AFPS maintainers. Implementations published before the domain is operationally controlled SHOULD additionally accept the transitional prefix `dev.appstrate.afps/` (which is unambiguously vendor-controlled) and treat it as an alias of `dev.afps/`. Once the domain is controlled, this alias will be deprecated.

This convention:

- prevents collisions with future AFPS fields and across vendors;
- allows tooling to distinguish standard fields from extensions; and
- carries vendor extension data (e.g. bundler provenance, runtime-specific hints) across all four package types without polluting the AFPS-defined root vocabulary.

Consumers MUST NOT reject manifests that contain unknown `_meta` keys, and MUST NOT fail on `_meta` values they do not understand. Consumers MAY ignore extension data they do not understand and SHOULD preserve it when round-tripping manifests.

### 10.2 Future Standard Fields

When an extension carried under `_meta` gains broad adoption across multiple implementations, it MAY be promoted to a standard field in a future specification revision. Upon promotion, the standard field name becomes normative and the `_meta` entry becomes deprecated.

## 11. References

### Normative References

- **[RFC 2119]** Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, March 1997. https://datatracker.ietf.org/doc/html/rfc2119
- **[RFC 8174]** Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, May 2017. https://datatracker.ietf.org/doc/html/rfc8174
- **[RFC 6749]** Hardt, D., "The OAuth 2.0 Authorization Framework", RFC 6749, October 2012. https://datatracker.ietf.org/doc/html/rfc6749
- **[RFC 6901]** Bryan, P., Zyp, K., Nottingham, M., "JavaScript Object Notation (JSON) Pointer", RFC 6901, April 2013. https://datatracker.ietf.org/doc/html/rfc6901
- **[RFC 7591]** Richer, J., Ed., et al., "OAuth 2.0 Dynamic Client Registration Protocol", RFC 7591, July 2015. https://datatracker.ietf.org/doc/html/rfc7591
- **[RFC 7636]** Sakimura, N., Ed., Bradley, J., Agarwal, N., "Proof Key for Code Exchange by OAuth Public Clients", RFC 7636, September 2015. https://datatracker.ietf.org/doc/html/rfc7636
- **[RFC 8414]** Jones, M., Sakimura, N., Bradley, J., "OAuth 2.0 Authorization Server Metadata", RFC 8414, June 2018. https://datatracker.ietf.org/doc/html/rfc8414
- **[RFC 8707]** Campbell, B., Bradley, J., Jay, H., "Resource Indicators for OAuth 2.0", RFC 8707, February 2020. https://datatracker.ietf.org/doc/html/rfc8707
- **[RFC 4648]** Josefsson, S., "The Base16, Base32, and Base64 Data Encodings", RFC 4648, October 2006. https://datatracker.ietf.org/doc/html/rfc4648
- **[RFC 9535]** Bormann, C., Bray, T., Gössner, S., "JSONPath: Query Expressions for JSON", RFC 9535, February 2024. https://datatracker.ietf.org/doc/html/rfc9535
- **[XML Path Language 3.1]** W3C Recommendation, "XML Path Language (XPath) 3.1", March 2017. https://www.w3.org/TR/xpath-31/
- **[SPDX]** "SPDX License List". https://spdx.org/licenses/
- **[OpenID Connect Discovery]** Sakimura, N., et al., "OpenID Connect Discovery 1.0". https://openid.net/specs/openid-connect-discovery-1_0.html
- **[OpenID Connect Core]** Sakimura, N., et al., "OpenID Connect Core 1.0". https://openid.net/specs/openid-connect-core-1_0.html
- **[MCPB]** MCP Bundle (MCPB) manifest and bundle format. https://github.com/anthropics/mcpb
- **[SemVer]** Preston-Werner, T., "Semantic Versioning 2.0.0". https://semver.org/spec/v2.0.0.html
- **[JSON]** ECMA-404, "The JSON Data Interchange Syntax", 2nd edition, December 2017. https://www.ecma-international.org/publications-and-standards/standards/ecma-404/
- **[JSON Schema]** JSON Schema: A Media Type for Describing JSON Documents, Draft 2020-12. https://json-schema.org/draft/2020-12/json-schema-core
- **[ZIP]** PKWARE, "APPNOTE.TXT - .ZIP File Format Specification". https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT

### Informative References

- **[MCP]** Model Context Protocol Specification. https://modelcontextprotocol.io/specification
- **[Arazzo]** OpenAPI Arazzo Specification (Workflows). https://spec.openapis.org/arazzo/latest.html
- **[A2A]** Agent-to-Agent Protocol. https://a2a-protocol.org/latest/specification/
- **[Agent Skills]** Anthropic Agent Skills Specification. https://agentskills.io/home
- **[OpenAPI]** OpenAPI Specification. https://spec.openapis.org/oas/latest.html
- **[OpenAI Apps SDK]** OpenAI Apps SDK Reference. https://developers.openai.com/apps-sdk/reference
- **[Package URL]** Package URL (purl) Specification, ECMA-427. https://github.com/package-url/purl-spec
- **[Kubernetes]** Kubernetes documentation, "Distribute Credentials Securely Using Secrets". https://kubernetes.io/docs/concepts/configuration/secret/

---

## Appendices

### Appendix A. Field Reference Table

| Field | Context | Type | Requirement | Constraints / Notes | Default |
| --- | --- | --- | --- | --- | --- |
| `name` | all manifests | string | MUST | scoped name `@scope/name` (§2.2) | none |
| `version` | all manifests | string | MUST | valid semver version | none |
| `type` | all manifests | string | MUST | `agent\|skill\|mcp-server\|integration` | none |
| `display_name` | all manifests | string | MUST for agent; SHOULD for skill, mcp-server, integration | agent value min length 1 | none |
| `description` | all manifests | string | MAY | free text | none |
| `long_description` | all manifests | string | MAY | Markdown long-form description | none |
| `keywords` | all manifests | string[] | MAY | arbitrary strings | none |
| `license` | all manifests | string | MAY | SPDX identifier RECOMMENDED | none |
| `author` | all manifests | string \| object | MUST for agent; MAY for others | string form, or `{ name (REQUIRED), email?, url? }` (npm-aligned) | none |
| `repository` | all manifests | string \| object | MAY | URI string, or `{ type, url, directory? }` (npm-aligned) | none |
| `homepage` | all manifests | string | MAY | URI; package homepage | none |
| `documentation` | all manifests | string | MAY | URI; documentation page | none |
| `support` | all manifests | string | MAY | URI; support/issues | none |
| `icon` | all manifests | string | MAY | relative archive path to a PNG, or a URI | none |
| `icons` | all manifests | object[] | MAY | `[{ src, size?, theme? }]` | none |
| `screenshots` | all manifests | string[] | MAY | image paths/URIs | none |
| `privacy_policies` | all manifests | string[] | MAY | privacy-policy URIs | none |
| `compatibility` | all manifests | object | MAY | `{ platforms?, runtimes?, clients? }` | none |
| `schema_version` | all manifests | string | MUST for agent; MAY for skill, mcp-server, integration | `MAJOR.MINOR`; producers MUST emit `2.0` | none |
| `dependencies` | all manifests | object | MAY | optional dependency maps (§4.1) | none |
| `dependencies.skills` | all manifests | map | MAY | keys scoped names; values semver range string or `{ version, ... }` (§4.1) | none |
| `dependencies.mcp_servers` | all manifests | map | MAY | keys scoped names; values semver range string or `{ version, ... }` (§4.1) | none |
| `dependencies.integrations` | all manifests | map | MAY | keys scoped names; values semver range string or `{ version, scopes?, auth_key? }` (§4.1) | none |
| `dependencies.integrations.<id>.scopes` | all manifests | string[] | MAY | requested OAuth scopes for the integration (§7.4) | none |
| `dependencies.integrations.<id>.auth_key` | all manifests | string | MAY | selects an `auths.<key>` entry on the integration | none |
| `integrations_configuration` | agent | map | MAY (deprecated) | superseded by `dependencies.integrations.<id>` object form (§4.4); kept for backward compatibility | none |
| `input` | agent | object | MAY | per-run data; requires `schema` child | none |
| `input.schema` | agent | object | MUST if `input` present | AFPS schema object | none |
| `output` | agent | object | MAY | per-run result; requires `schema` child | none |
| `output.schema` | agent | object | MUST if `output` present | AFPS schema object | none |
| `config` | agent | object | MAY | per-deployment settings; requires `schema` child | none |
| `config.schema` | agent | object | MUST if `config` present | AFPS schema object | none |
| `file_constraints` | agent schema wrapper | object | MAY | keyed by property name; `accept`, `max_size` | none |
| `ui_hints` | agent schema wrapper | object | MAY | keyed by property name; `placeholder` | none |
| `property_order` | agent schema wrapper | string[] | MAY | presentation order hint | none |
| `timeout` | agent | number | MAY | timeout hint in seconds | none |
| `manifest_version` | mcp-server | string | MUST | tags the MCPB-vocabulary version of `server`/`tools`/`user_config`; `0.3` baseline, `0.4` for `uv` | none |
| `server` | mcp-server | object | MUST | run declaration (`type`, `entry_point`, `mcp_config`); MCPB vocabulary | none |
| `server.type` | mcp-server | string | MUST | `node\|python\|binary` (`manifest_version=0.3`); `uv` (`0.4`) | none |
| `tools` | mcp-server | array | MAY | advisory tool list (`{ name, description }`); MCPB vocabulary | none |
| `user_config` | mcp-server | object | MAY | user configuration; `sensitive: true` for secrets; MCPB vocabulary | none |
| `source` | integration | object | MUST | `kind` ∈ `local\|remote\|api` plus matching sub-object | none |
| `source.server` | integration | object | MUST for `kind=local` | `{ name (scoped), version (range), vendored? }` | none |
| `source.remote` | integration | object | MUST for `kind=remote` | `{ url, transport: streamable-http\|sse }` | none |
| `source.api` | integration | object | MUST for `kind=api` | `{ upload_protocols?: open string array }` | none |
| `source.api.upload_protocols` | integration | string[] | MAY | open array; reserved values: `google-resumable`, `s3-multipart`, `tus`, `ms-resumable`. Custom protocols SHOULD use a reverse-DNS prefix | none |
| `auths` | integration | object | MUST | map keyed by `^[a-z][a-z0-9_]*$`; ≥1 entry | none |
| `auths.<key>.type` | integration | string | MUST | `oauth2\|api_key\|basic\|mtls\|custom` | none |
| `auths.<key>.issuer` | integration | string | SHOULD for oauth2 | OAuth/OIDC issuer; enables discovery | none |
| `auths.<key>.authorization_endpoint` | integration | string | MUST for oauth2 w/o discovery | RFC 8414 | none |
| `auths.<key>.token_endpoint` | integration | string | MUST for oauth2 w/o discovery | RFC 8414 | none |
| `auths.<key>.userinfo_endpoint` | integration | string | MAY | OIDC Discovery | none |
| `auths.<key>.token_endpoint_auth_method` | integration | string | MAY | RFC 7591 / OIDC Core values; `client_secret_basic` default (RFC 8414 §2, RFC 7591 §2) | none |
| `auths.<key>.code_challenge_methods_supported` | integration | string[] | MAY | PKCE methods, e.g. `["S256"]` (RFC 8414 / RFC 7636) | none |
| `auths.<key>.resource` | integration | string | MAY | RFC 8707 resource indicator (not `audience`) | none |
| `auths.<key>.authorization_params` | integration | object | MAY | extra authorize query params (AFPS) | none |
| `auths.<key>.default_scopes` | integration | string[] | MAY | baseline requested scopes | none |
| `auths.<key>.scope_catalog` | integration | object[] | MAY | `{ value, label, description?, implies? }` (AFPS authoritative) | none |
| `auths.<key>.identity_claims` | integration | object | MAY | AFPS key → OIDC claim name | none |
| `auths.<key>.required_identity_claims` | integration | string[] | MAY | required OIDC claims | none |
| `auths.<key>.credentials.schema` | integration | object | MUST for api_key/basic/mtls/custom | self-contained JSON Schema 2020-12; local `$ref` only | none |
| `auths.<key>.delivery` | integration | object | MUST | ≥1 of `http`, `env`, `files`; `http` exclusive of `env`/`files` | none |
| `auths.<key>.delivery.http` | integration | object | MAY | `{ in, name, prefix?, value, encoding?, allow_server_override? }` | none |
| `auths.<key>.delivery.http.in` | integration | string | MUST if `http` present | `header\|query\|cookie` (OpenAPI) | none |
| `auths.<key>.delivery.http.encoding` | integration | string | MAY | `base64` (RFC 4648 §4) | none |
| `auths.<key>.delivery.env` | integration | object | MAY | map of `VAR` → `{ value, sensitive?, user_config_key? }`; maps to MCPB `user_config` | none |
| `auths.<key>.delivery.env.<var>.user_config_key` | integration | string | MAY | MCPB `user_config` key for `local`-source binding; defaults to the env-variable name | none |
| `auths.<key>.callback_url_hint` | integration | string | MAY | OAuth-client registration callback hint (often containing `{{callback_url}}`) | none |
| `auths.<key>.delivery.files` | integration | object | MAY | map of path → `{ value, mode? }`; `mode` octal string | `mode` `"0400"` |
| `auths.<key>.connect` | integration | object | MAY (custom only) | exactly one of `login` / `tool`; optional `limits` | none |
| `auths.<key>.connect.login.request` | integration | object | MUST if `login` present | inline HTTP request | none |
| `auths.<key>.connect.login.success_criteria` | integration | object[] | MAY | Arazzo Criterion; default HTTP 2xx | HTTP 2xx |
| `auths.<key>.connect.login.outputs` | integration | object | MAY | Arazzo runtime-expression string, Arazzo Selector Object `{context,selector,type}`, or AFPS extractor (`cookie`/`jwt`/`regex`) | none |
| `auths.<key>.authorized_uris` | integration | string[] | MAY | allowed upstream URI patterns (glob) | none |
| `auths.<key>.allow_all_uris` | integration | boolean | MAY | unrestricted upstream access | `false` |
| `tools_policy` | integration | object | MAY | sparse per-tool policy table (augments canonical tool catalog of the referenced source); keys MUST resolve in the canonical catalog | none |
| `tools_policy.<name>.required_scopes` | integration | string[] | MAY | scopes a tool requires | none |
| `tools_policy.<name>.required_auth_key` | integration | string | MAY | selects an `auths` entry | none |
| `tools_policy.<name>.url_patterns` | integration | object[] | MAY | `{ pattern (glob), methods? }` | none |
| `hidden_tools` | integration | string[] | MAY | tool names suppressed from the agent's surface; tools used as `connect.tool` are auto-hidden | none |
| `setup_guide` | integration | object | MAY | setup metadata | none |
| `setup_guide.callback_url_hint` | integration | string | MAY (deprecated) | superseded by `auths.<key>.callback_url_hint`; kept for backward compatibility | none |
| `setup_guide.steps` | integration | object[] | MAY | ordered setup steps | none |
| `setup_guide.steps[].label` | integration | string | MUST if step present | non-empty recommended | none |
| `setup_guide.steps[].url` | integration | string | MAY | URI recommended | none |
| `INTEGRATION.md` | integration archive | file | MAY | optional API documentation for agent consumption | none |
| `SKILL.md` frontmatter `name` | skill content | string | SHOULD | max 64 chars, lowercase alphanumeric and hyphens | none |
| `SKILL.md` frontmatter `description` | skill content | string | SHOULD | max 1024 chars; missing value warns | none |
| `SKILL.md` frontmatter `license` | skill content | string | MAY | license name or file reference | none |
| `SKILL.md` frontmatter `compatibility` | skill content | string | MAY | max 500 chars; environment requirements | none |
| `SKILL.md` frontmatter `metadata` | skill content | map | MAY | arbitrary string key-value pairs | none |
| `SKILL.md` frontmatter `allowed-tools` | skill content | string | MAY | space-delimited tool list; experimental | none |
| `scripts/` | skill archive | directory | MAY | executable code for agents | none |
| `references/` | skill archive | directory | MAY | additional documentation | none |
| `assets/` | skill archive | directory | MAY | static resources, templates | none |
| `_meta` | any manifest | object | MAY | reverse-DNS namespaced extension data (§10) | none |

### Appendix B. Regex Patterns

```text
SLUG_PATTERN         = [a-z0-9]([a-z0-9-]*[a-z0-9])?
SLUG_REGEX           = ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$
SCOPED_NAME_REGEX    = ^@[a-z0-9]([a-z0-9-]*[a-z0-9])?\/[a-z0-9]([a-z0-9-]*[a-z0-9])?$
SCHEMA_VERSION_REGEX = ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$
AUTH_KEY_REGEX       = ^[a-z][a-z0-9_]*$
META_NAMESPACE_KEY   = ^([a-z0-9-]+(\.[a-z0-9-]+)+\/)?[A-Za-z0-9._-]+$
```

Semantic-version and range validation are delegated to semver parsing functions rather than regexes.

### Appendix C. Default Values

AFPS v2.0 validation does not inject manifest defaults. Omitted optional fields remain omitted.

Common consumer-side defaults observed in interoperable implementations include:

| Field | Resolved default | Notes |
| --- | --- | --- |
| `auths.<key>.token_endpoint_auth_method` | `client_secret_basic` | OAuth2 token request authentication; matches RFC 8414 §2 / RFC 7591 §2 default |
| `auths.<key>.allow_all_uris` | `false` | resolved integration auth method |
| `auths.<key>.delivery.files.<path>.mode` | `0400` | octal string |
| `auths.<key>.connect.login.success_criteria` | HTTP 2xx | when omitted |
| `manifest_version` | `0.3` | mcp-server MCPB baseline |
| `schema_version` | `2.0` | common consumer default for new agents/integrations |
| `timeout` | `300` | common consumer default for new agents |

These defaults are non-normative unless a producer explicitly writes them into the manifest.

### Appendix D. Migration from AFPS 1.x

AFPS 1.x defined two package types — `tool` and `provider` — and a camelCase field vocabulary. AFPS 2.0 removes both types and adopts `snake_case`. AFPS 2.0 producers MUST NOT emit `tool` or `provider` manifests, and MUST emit `snake_case` field names. Consumers that interoperate with 1.x archives SHOULD read them using the mappings below.

#### Type mapping

| AFPS 1.x type | AFPS 2.0 type | Notes |
| --- | --- | --- |
| `tool` | `mcp-server` | A 1.x `tool` (single `entrypoint` + `tool` interface object) is reframed as a runnable MCP server. The `tool.name`/`tool.description` become an entry in the MCPB `tools` array; the `entrypoint` and runtime become the MCPB `server` declaration. |
| `provider` | `integration` | A 1.x `provider` (`definition.authMode` + auth sub-object) becomes an `integration` with a `source` and an `auths` map. |

#### Field mapping (camelCase → snake_case)

| AFPS 1.x field | AFPS 2.0 field |
| --- | --- |
| `displayName` | `display_name` |
| `schemaVersion` | `schema_version` |
| `providersConfiguration` | `dependencies.integrations.<id>` object form (§4.1); `integrations_configuration` accepted for backward compatibility |
| `dependencies.providers` | `dependencies.integrations` |
| `dependencies.tools` | `dependencies.mcp_servers` |
| `tool.inputSchema` | (server tools advertise no input schema in MCPB; obtained from the running server) |
| `fileConstraints` / `maxSize` | `file_constraints` / `max_size` |
| `uiHints` | `ui_hints` |
| `propertyOrder` | `property_order` |
| `iconUrl` | `icon` |
| `definition.authMode` | `auths.<key>.type` |
| `definition.oauth2.authorizationUrl` | `auths.<key>.authorization_endpoint` (RFC 8414) |
| `definition.oauth2.tokenUrl` | `auths.<key>.token_endpoint` (RFC 8414) |
| `definition.oauth2.tokenAuthMethod` | `auths.<key>.token_endpoint_auth_method` |
| `definition.credentials.schema` | `auths.<key>.credentials.schema` |
| `definition.credentialTransform` | `auths.<key>.delivery.http` with `value` template + `encoding: "base64"` |
| `definition.authorizedUris` | `auths.<key>.authorized_uris` |
| `definition.allowAllUris` | `auths.<key>.allow_all_uris` |
| `definition.availableScopes` | `auths.<key>.scope_catalog` |
| `definition.uploadProtocols` | `source.api.upload_protocols` |
| `setupGuide.callbackUrlHint` | `auths.<key>.callback_url_hint` (preferred); `setup_guide.callback_url_hint` accepted as a deprecated fallback |
| extension fields (`x-*`) | `_meta` reverse-DNS keys (§10) |

The 1.x OAuth1 auth mode (`definition.oauth1`) has no AFPS 2.0 equivalent in the core vocabulary; an integration requiring OAuth1 SHOULD model it as a `custom` auth method with a `connect` flow (§7.7) or carry it under `_meta`.

#### New common fields (AFPS 1.x → 2.0)

The following common fields were added in AFPS 2.0 and are aligned with MCPB. They have no AFPS 1.x equivalent; producers MAY emit them when migrating, consumers MUST tolerate their absence in legacy manifests:

`long_description`, `homepage`, `documentation`, `support`, `icons` (array form), `screenshots`, `privacy_policies`, `compatibility` (structured form).

`author` and `repository` now accept either a string (1.x-compatible) or a structured object (MCPB/npm-aligned). The legacy integration-level `icon` field is folded into the common-fields `icon` and `icons` (§3.1).

### Appendix E. Origins

This specification was initially drafted by Appstrate and published as an independent open standard. The normative content of this specification (§1–§10) defines the standard independently of any specific implementation. Conforming implementations MAY use different internal structures, validation strategies, or execution models while maintaining specification compliance.

See [IMPLEMENTATIONS.md](./IMPLEMENTATIONS.md) for known implementations.
