# Changelog

## v1.0 — 2026-03-15

Initial release of the Agent Flow Packaging Standard (AFPS) v1.0.

### Specification

- Normative specification (`spec.md`) — 11 sections, 4 appendices
- RFC 2119 conformance language with three targets: AFPS Producer, AFPS Consumer, AFPS Registry
- Security considerations (§8), privacy considerations (§9), extensibility (§10)
- Non-normative primer (`primer.md`) for newcomers

### Package Types

- `flow` — complete workflow with `prompt.md`, dependencies, input/output/config schemas, timeout
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
