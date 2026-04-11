# Changelog

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
