# Changelog

## v2.0.2 — 2026-05-26

**Breaking refactor of the `mcp-server` package type + rename of integration
per-tool policy field.** AFPS 2.0 is still flagged Draft in `spec.md`; this
revision lands while the draft window is open. Producers that emitted
`mcp-server` or integration manifests under v2.0.0/v2.0.1 must migrate.

### Specification

- **§2.2 / §3.1 / §3.4**: an `mcp-server` manifest is now AFPS-native at the
  root. Top-level fields are the same as for `agent`/`skill`/`integration`:
  scoped `name`, `type: "mcp-server"`, `schema_version`, common metadata,
  optional `dependencies`. The `manifest_version`, `server`, `tools`, and
  `user_config` fields continue to adopt the MCPB vocabulary verbatim.
- **§3.4**: dropped the “rename `.afps` → `.mcpb` runs in any MCPB host”
  invariant. AFPS no longer claims strict-MCPB interoperability; a
  publish-time projection to a strict MCPB bundle is reserved for a future
  minor (§10.2).
- **§4.1**: `dependencies` is a top-level field for all four package types
  (the previous `_meta["dev.afps/mcp-server"].dependencies` placement is
  removed).
- **§2.4**: `schema_version` applies to `mcp-server` (was previously declared
  not applicable).
- **Appendix A**: cleaned of all `mcp-server` special-case annotations on
  `name`, `type`, `author`, `repository`, `compatibility`, `dependencies`,
  `schema_version`.
- **§7.8 / Appendix A**: `integration.tools` renamed to
  `integration.tools_policy` to disambiguate from `mcp-server.tools`
  (the two had the same field name but distinct shapes — a sparse policy
  table vs an advisory catalog). All sub-fields (`required_scopes`,
  `required_auth_key`, `url_patterns`) and semantics are unchanged.

### Schema (`@afps-spec/schema@2.0.2`)

- `mcpServerManifestSchema` rewritten on top of the shared `commonFields`
  shape; no longer enforces `_meta["dev.afps/mcp-server"]`.
- `mcpServerAfpsMeta` export removed (no replacement; AFPS identity is now the
  top-level `name`).
- Conformance tests updated for the new shape; legacy MCPB-style fixtures
  removed.

### Migration

A v2.0.0 / v2.0.1 `mcp-server` manifest of the form

```json
{
  "manifest_version": "0.3",
  "name": "fetch-json",
  "version": "1.0.0",
  "server": { ... },
  "_meta": { "dev.afps/mcp-server": { "name": "@example/fetch-json", "type": "mcp-server" } }
}
```

migrates to

```json
{
  "name": "@example/fetch-json",
  "version": "1.0.0",
  "type": "mcp-server",
  "schema_version": "2.0",
  "manifest_version": "0.3",
  "server": { ... }
}
```

(scoped `name` lifted from `_meta` to the root; `type` and `schema_version`
added; the `_meta` AFPS-identity block deleted).

---

## v2.0.1 — 2026-05-26

Post-release clarifications and corrections from the SOTA alignment audit
(`claudedocs/spec-audit-2026-05-26.md`). No breaking-by-design changes; one
default value corrected to match the upstream RFC, one additive auth type.

### Specification

- **§4.1 / §3.4 / Appendix A** — clarified that on `mcp-server` packages,
  `dependencies` MUST live under `_meta["dev.afps/mcp-server"].dependencies`
  (the MCPB schema forbids unknown top-level fields). Producers MUST NOT emit a
  top-level `dependencies` field on an `mcp-server` manifest.
- **Appendix A (`author`, `repository`)** — annotated the rows to note that the
  object form is the only valid shape on `mcp-server` (MCPB schema rejects the
  string shorthand).
- **Appendix A (`compatibility`)** — annotated the row to note that on
  `mcp-server` the field follows the MCPB strict shape
  (`{ claude_desktop?, platforms?, runtimes? }` with `python`/`node` runtimes
  only); the AFPS-extended `clients?` map applies to `agent`/`skill`/`integration`
  only.
- **§7.3 / Appendix A / Appendix C** — `token_endpoint_auth_method` default
  realigned to `client_secret_basic` per [RFC 8414] §2 and [RFC 7591] §2.
  Previously listed `client_secret_post`, which contradicted the RFC default.
- **§7.2 / §7.5 / §7.11 / Appendix A** — new auth-method `type: "mtls"` for
  mutual TLS client authentication. `credentials.schema` is REQUIRED and
  SHOULD describe the client certificate, private key, and optional chain.
  Maps to OpenAPI `mutualTLS` (3.1+).

### Schema (`@afps-spec/schema@2.0.1`)

- `authTypeEnum` adds `"mtls"`.
- `tokenEndpointAuthMethodEnum` order changed to list `"client_secret_basic"`
  first (cosmetic; the enum members are unchanged).
- `refineAuthMethod` now requires `credentials.schema` for `mtls`.
- Conformance test renamed and extended to cover `mtls`.

[RFC 7591]: https://datatracker.ietf.org/doc/html/rfc7591
[RFC 8414]: https://datatracker.ietf.org/doc/html/rfc8414

---

## v2.0.0 — 2026-05-24

Major, breaking revision. AFPS 2.0 adopts a `snake_case` field vocabulary across all package types, replaces the `tool` and `provider` package types with `mcp-server` and `integration`, and adopts the Model Context Protocol `_meta` mechanism as the single extension point.

### Specification

- **Package types** — the four types are now `agent`, `skill`, `mcp-server`, `integration`. `tool` and `provider` are removed; 2.0 producers MUST NOT emit them. See Appendix D for the 1.x→2.0 migration mapping.
- **`mcp-server` (§3.4)** — an entirely new model: an `mcp-server` manifest **is** a verbatim MCP Bundle (MCPB) manifest. A built `mcp-server` validates against the MCPB manifest schema and runs unmodified in any MCPB host (rename `.afps` → `.mcpb`). Supersedes the 1.x `tool` type.
- **`integration` (§3.5, §7)** — supersedes the 1.x `provider` type. Adds an explicit capability `source` (`local` / `remote` / `api`), a multi-method `auths` map, discovery-first OAuth2 using [RFC 8414] / OpenID Connect Discovery vocabulary ([RFC 8707] resource indicators, [RFC 7636] PKCE), a `scope_catalog`, declarative `connect.login` acquisition aligned with OpenAPI Arazzo, and explicit credential `delivery` (`http` / `env` / `files`).
- **Casing** — all AFPS-defined fields are `snake_case` (e.g. `display_name`, `schema_version`, `integrations_configuration`). Embedded JSON Schema keywords (e.g. `contentMediaType`) retain their standard spelling.
- **Extensibility (§10)** — the `x-` extension convention is removed in favor of a top-level `_meta` object with reverse-DNS namespaced keys (`dev.afps/…`). `_meta` is the only schema-blessed extension point for `mcp-server` packages, whose MCPB manifest schema forbids unknown top-level fields.
- **Dependencies (§4)** — `dependencies.providers` → `dependencies.integrations`; `dependencies.tools` → `dependencies.mcp_servers`. Agent `providersConfiguration` → `integrations_configuration`.
- **Conformance keywords (§1.4)** — full BCP 14 ([RFC 2119] / [RFC 8174]) keyword set.
- **Schema system (§5)** — clarified that the full JSON Schema 2020-12 vocabulary is supported within `schema` members; the only AFPS constraint is the container shape (`type: "object"` + `properties`).
- **Migration (Appendix D)** — new appendix mapping 1.x types and camelCase fields to 2.0.

### Schema (`@afps-spec/schema@2.0.0`)

- New `v2/` schemas: `agent`, `skill`, `mcp-server`, `integration`. `mcp-server.schema.json` validates the embedded MCPB manifest.
- Hosted `$id` pattern: `https://afps.appstrate.dev/packages/schema/v2/<type>.schema.json`.
- Major version bump (breaking: removed types, renamed fields, removed `x-` convention).

[RFC 2119]: https://datatracker.ietf.org/doc/html/rfc2119
[RFC 8174]: https://datatracker.ietf.org/doc/html/rfc8174
[RFC 7636]: https://datatracker.ietf.org/doc/html/rfc7636
[RFC 8414]: https://datatracker.ietf.org/doc/html/rfc8414
[RFC 8707]: https://datatracker.ietf.org/doc/html/rfc8707

---

## v1.2.0 — 2026-05-09

### Specification

- **§7.7 Upload Protocols (new section)** — formalizes `definition.uploadProtocols`, an OPTIONAL array declaring the resumable upload protocols a provider's API supports. Closed enum: `google-resumable`, `s3-multipart`, `tus`, `ms-resumable`. Consumers MUST reject manifests declaring values outside the enum. New protocols require a minor version bump.
- **Appendix A (conformance checklist)** — added `definition.uploadProtocols` row.
- Backwards compatible: existing manifests without `uploadProtocols` remain valid; the field's absence MUST be treated as "no resumable upload capabilities declared".

### Schema (`@afps-spec/schema@1.5.0`)

- `providerDefinition` gains `uploadProtocols` optional field (`UploadProtocol[]` with closed 4-value enum and `uniqueItems`).
- New export: `uploadProtocolEnum`.
- Regenerated `v1/provider.schema.json`.
- Minor version bump (purely additive — all new fields are optional and defaults preserve prior behavior).

---

## Schema (`@afps-spec/schema@1.4.0`) — 2026-04-25

- **Canonical schema URL moved.** The schema directory was relocated from the repo root to `packages/schema/`. The hosted `$id` follows: `https://afps.appstrate.dev/schema/v1/<type>.schema.json` → `https://afps.appstrate.dev/packages/schema/v1/<type>.schema.json`.
- Regenerated `v1/{agent,skill,tool,provider}.schema.json` with the new `$id`.
- Updated all `examples/*/manifest.json` `$schema` references.
- Spec text unchanged. Consumers that load schemas by `$id` over the network MUST update; consumers that bundle `@afps-spec/schema` will pick this up via the npm version bump.
- Minor version bump: changing the canonical `$id` is observable to strict validators even though the schema content is unchanged.

---

## v1.1.1 — 2026-04-11

### Specification

- **§7.4 Credential Schema** — removed `definition.credentialEncoding` and its associated enum entirely. The field had been introduced as an experimental closed enum in v1.0.2 and deprecated in v1.1.0 in favor of the generic `credentialTransform`. It is removed now because it had zero production adoption and keeping a deprecated parallel pathway in the spec added no value.
- **Appendix A (conformance checklist)** — removed the `credentialEncoding` row.
- Consumers that previously honored `credentialEncoding` MUST migrate to `credentialTransform`. The two standard patterns translate as:
  - `basic_api_key_x` → `credentialTransform: { template: "{{api_key}}:X", encoding: "base64" }`
  - `basic_email_token` → `credentialTransform: { template: "{{email}}/token:{{api_key}}", encoding: "base64" }`

### Schema (`@afps-spec/schema@1.3.1`)

- `providerDefinition` no longer accepts `credentialEncoding`.
- `credentialEncodingEnum` export removed from `@afps-spec/schema`.
- Regenerated `schema/v1/provider.schema.json`.
- Patch version: pre-GA correction of a never-adopted experimental field; see note above.

---

## v1.1.0 — 2026-04-11

### Specification

- **§7.4 Credential Schema** — introduced the generic, template-based `definition.credentialTransform` (`{ template, encoding }`) as the successor to the fixed `credentialEncoding` enum. Manifests now express provider-specific Basic-auth conventions directly (e.g. Freshdesk/Teamwork `{ template: "{{api_key}}:X", encoding: "base64" }`, Zendesk `{ template: "{{email}}/token:{{api_key}}", encoding: "base64" }`) instead of relying on hard-coded runtime enum values. Adding a new vendor convention no longer requires bumping the spec — only a new `encoding` does.
- **`credentialEncoding` is deprecated** but retained in the schema for backward compatibility. Consumers MAY continue to honor it; new manifests SHOULD use `credentialTransform`. When both are present, `credentialTransform` takes precedence.
- **Appendix A (conformance checklist)** — added rows for `credentialTransform`, `credentialTransform.template`, `credentialTransform.encoding`; marked `credentialEncoding` deprecated.
- Backwards compatible: existing manifests using `credentialEncoding` still validate and still work on every conforming consumer.

### Schema (`@afps-spec/schema@1.3.0`)

- `providerDefinition` gains `credentialTransform` optional field (`{ template: string, encoding: "base64" }`).
- Two new exports: `credentialTransform` Zod schema and `credentialTransformEncodingEnum`.
- Regenerated `schema/v1/provider.schema.json`.
- Minor version bump (purely additive — all new fields are optional).

---

## v1.0.2 — 2026-04-10

### Specification

- **§7.2 OAuth2 Configuration** — documented two optional fields inside `definition.oauth2`:
  - `tokenAuthMethod` (`client_secret_post` | `client_secret_basic`) — selects how OAuth2 client credentials are sent on the token endpoint per RFC 6749 §2.3.1.
  - `tokenContentType` (`application/x-www-form-urlencoded` | `application/json`) — selects the body encoding of token endpoint requests. `application/json` enables interoperability with providers like Atlassian whose token endpoints do not accept form-urlencoded bodies.
- **§7.4 Credential Schema** — documented the optional top-level `definition.credentialEncoding` field for `api_key` providers, with two standard values (`basic_api_key_x`, `basic_email_token`) covering the Freshdesk/Teamwork and Zendesk Basic-auth patterns.
- **Appendix A (conformance checklist)** — added rows for the three new fields.
- Backwards compatible: all three fields are optional and absent from earlier manifests continue to validate.

### Schema (`@afps-spec/schema@1.2.2`)

- `oauth2Config` gains `tokenAuthMethod` and `tokenContentType` optional fields.
- `providerDefinition` gains `credentialEncoding` optional field.
- Three new exported enums: `oauthTokenAuthMethodEnum`, `oauthTokenContentTypeEnum`, `credentialEncodingEnum`.
- Regenerated `schema/v1/provider.schema.json`.

---

## v1.0.1 — 2026-04-01

### Renamed

- **Package type `flow` renamed to `agent`** — the `"type": "flow"` value in manifests is now `"type": "agent"`. This better reflects the package's role as an autonomous agent definition. All schema files, examples, and spec text updated accordingly.
- **"Agent Flow Packaging Standard" renamed to "Agent Format Packaging Standard"** — the AFPS acronym is unchanged.

### Schema

- `schema/v1/flow.schema.json` replaced by `schema/v1/agent.schema.json`
- `flowManifestSchema` renamed to `agentManifestSchema` in Zod source

### Examples

- `examples/flow-full/` renamed to `examples/agent-full/`
- `examples/flow-minimal/` renamed to `examples/agent-minimal/`

---

## v1.0 — 2026-03-15

Initial release of the Agent Format Packaging Standard (AFPS) v1.0.

### Specification

- Normative specification (`spec.md`) — 11 sections, 4 appendices
- RFC 2119 conformance language with three targets: AFPS Producer, AFPS Consumer, AFPS Registry
- Security considerations (§8), privacy considerations (§9), extensibility (§10)
- Non-normative primer (`primer.md`) for newcomers

### Package Types

- `agent` — complete workflow with `prompt.md`, dependencies, input/output/config schemas, timeout
- `skill` — reusable instructions (`SKILL.md`), superset of Agent Skills format
- `tool` — single callable capability with `entrypoint` and `tool` interface declaration
- `provider` — service connector with auth mode, OAuth endpoints, credential schema

### Schemas

- 4 JSON Schema files (Draft 2020-12) in `schema/v1/`
- Generated from Zod definitions (`@afps-spec/schema` npm package)
- Versioned URLs: `https://afps.appstrate.dev/schema/v1/<type>.schema.json`
- `schemaVersion` field enforces major version compatibility

### Dependencies

- Single `dependencies` field with `skills`, `tools`, and `providers` maps (semver ranges)
- Available on all package types
- Circular dependency detection

### Distribution

- `.afps` file extension convention for package archives (standard ZIP)
- UTF-8 encoding required for all text files

### Repository

- Governance, contributing guide, security policy, code of conduct
- Licensed under CC-BY-4.0
- CI workflow: schema validation, example validation, markdown lint
- GitHub Pages at `afps.appstrate.dev`
