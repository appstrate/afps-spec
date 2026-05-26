# AFPS Integrations & MCP-Servers — Implementation-Ready Design

**Status**: design baseline, ready to implement. Supersedes the earlier
`INTEGRATION_FIELD_MAPPING.md`, `MCPB_COMPAT_REFACTOR_PLAN.md`, and
`integration-mapping-plan.html` (deleted).

**Scope**: introduces two AFPS package types — **`mcp-server`** and
**`integration`** — replacing the deprecated `tool` and `provider` types. Defines
their manifest schemas at field level, the standards each adopts, and the
implementation/migration plan.

**Audience**: AFPS spec editors + `@appstrate/core` implementers.

---

## 1. Conformance

> The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
> "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this
> document are to be interpreted as described in BCP 14 [RFC2119] [RFC8174] when,
> and only when, they appear in all capitals, as shown here.

---

## 2. Core design decisions (with rationale + source)

| # | Decision | Rationale / source |
|---|----------|--------------------|
| D1 | **`mcp-server` is a new package type whose manifest is AFPS-native at the root and adopts the MCPB field vocabulary for the server / tools / user_config block.** | MCPB describes how to run a local MCP server; AFPS reuses that vocabulary verbatim so producers can author the server payload with MCPB tooling. AFPS does NOT promise strict-MCPB compatibility (no `rename .afps→.mcpb` invariant); a publish-time projection to a strict MCPB bundle is reserved for a future minor. [MCPB MANIFEST.md / mcpb repo] |
| D2 | **`integration` is the credentialed binding to a service** (service-centric), referencing a capability *source*. | A service (Gmail, Stripe) is the identity; the MCP server is one way to reach it. Auth is bound to the service. |
| D3 | **All four package types share the same AFPS-native envelope** (top-level `name` scoped, `type`, `schema_version`, common metadata, optional `dependencies`). | Symmetric mental model across types; eliminates the special-case asymmetry where `mcp-server` had to host AFPS-native data under `_meta` to remain strict-MCPB-valid. The MCPB compatibility goal is dropped in favor of vocabulary alignment. |
| D4 | **The `_meta` mechanism remains the canonical extension point for all types (vendor namespaces, future standard fields).** AFPS-defined fields live at the manifest root for every type, including `mcp-server`. | `_meta` keeps its role for non-AFPS vendor data; AFPS itself no longer needs to confine its fields there because no upstream schema constrains the root any more. |
| D5 | **OAuth declaration adopts RFC 8414 / OIDC Discovery vocabulary, discovery-first.** | Exactly the standards the MCP authorization spec committed to (MCP 2025-11-25: AS MUST provide RFC 8414 or OIDC Discovery; `resource` per RFC 8707; PKCE via `code_challenge_methods_supported`). Aligns AFPS with the ecosystem it sits on. |
| D6 | **`connect.login` (non-OAuth acquisition) aligns with OpenAPI Arazzo** (`success_criteria`, `outputs`, runtime expressions); jwt/regex-capture/cookie extractors + credential materialization are AFPS extensions. | Arazzo is the OAI workflows spec; it models request→assert→extract→reuse. [Arazzo 1.0.1 §4.6–4.7] |
| D7 | **`delivery` adopts OpenAPI `in`+`name` (header location) + Kubernetes secret-injection vocabulary (env/files).** | OpenAPI Security Scheme `in`/`name` is the recognized credential-location vocab; K8s `secretKeyRef`/`mountPath`/`mode` is the recognized injection vocab. Both fall short of full delivery, so the value-template + env/file unification are AFPS's irreducible contribution. |
| D8 | **AFPS house casing is `snake_case`.** Where AFPS aligns with a camelCase source (Arazzo `successCriteria`, K8s `mountPath`), the AFPS field is the snake_case rendering, with a mapping note. | Consistency with the MCPB envelope (snake_case) and verbatim alignment with RFC 8414/OIDC/9728 fields (which are snake_case and the "copy from the discovery doc" property must be preserved). |
| D9 | **An `integration` references its `mcp-server` by native AFPS `{name, version-range}`** (same convention as skills/tools/providers). purl is **not** the reference mechanism — it is demoted to optional build-provenance under `_meta` (recording a foreign npm/oci package vendored into an `mcp-server` at publish time). | MCPB bundles its dependencies into the `.mcpb` ZIP (no registry refs), so a foreign MCP server is *vendored* into an AFPS `mcp-server` at build time and then referenced natively. Native `@scope/name`+range is consistent with AFPS's existing dependency model; purl (ECMA-427) only records provenance where useful. |
| D10 | **`tool` and `provider` package types are DEPRECATED, superseded by `mcp-server` and `integration`.** | Producers SHOULD NOT emit them; consumers MUST keep accepting them through AFPS 1.x; MAY remove in 2.0. |
| D11 | **AFPS common fields adopt the MCPB / npm vocabulary** (`author`/`repository` objects, `homepage`, `documentation`, `support`, `icon`/`icons`, `screenshots`, `privacy_policies`, `long_description`, `compatibility`). String forms of `author`/`repository` are accepted everywhere. | A single editor publishes one identity block across the four types instead of four divergent ones. No strict-MCPB constraints apply now that the envelope is AFPS-native. |
| D12 | **`upload_protocols` is an open string array, not a closed enum.** Reserved values for interop are listed in §7.1; custom protocols SHOULD use a reverse-DNS qualifier. | Closed enums in a normative spec block community-driven protocol additions and force minor bumps for adoption. |
| D13 | **`connect.login.outputs` accepts Arazzo 1.1 Selector Objects** in addition to runtime-expression strings and AFPS extractors (`cookie`/`jwt`/`regex`). | Arazzo 1.1 published a uniform Selector Object (`{context, selector, type}`) that subsumes the AFPS regex/jsonpath/jsonpointer cases. Keep AFPS extractors only for cases Arazzo cannot express. |
| D14 | **Per-integration configuration (scopes / auth selection) moves inline into `dependencies.integrations.<id>` object form.** The sibling `integrations_configuration` map is deprecated and kept only for backward compatibility. | One concept, one place. Aligns AFPS with `prefers-generic-over-special-casing`: dependency values become polymorphic `string | { version, ... }` rather than two sibling maps that must agree. |
| D15 | **`callback_url_hint` is auth-method-scoped.** Declared at `auths.<key>.callback_url_hint`. The top-level `setup_guide.callback_url_hint` is deprecated. | OAuth-only concept; an integration with no OAuth auth method has no callback to hint at. |
| D16 | **`integration.tools_policy.<name>` is a sparse policy table augmenting the canonical tool catalog of the referenced source** (`mcp-server.tools[]` for local, MCP introspection for remote). `integration.hidden_tools` opts tools OUT of the agent surface. The `_policy` suffix disambiguates from `mcp-server.tools` (canonical catalog). | Removes the ambiguity of whether `integration.tools` is a catalog or a policy table. Consumers can validate at publish that policy keys resolve in the canonical catalog. |
| D17 | **`delivery.env.<var>` carries an explicit `user_config_key`** binding to the referenced mcp-server's MCPB `user_config`. Defaults to the env-variable name when omitted. | The mapping `delivery.env` → `user_config` was implicit; making it explicit lets build steps emit the correct MCPB user_config entries deterministically. |

---

## 3. Package taxonomy

`agent`, `skill`, **`mcp-server`** (new, ≡ MCPB), **`integration`** (new).
Deprecated: `tool` → `mcp-server`; `provider` → `integration`.

| Deprecated | Superseded by | Producer | Consumer | Removal |
|---|---|---|---|---|
| `tool` | `mcp-server` | SHOULD NOT emit | MUST accept | MAY remove in next MAJOR |
| `provider` | `integration` | SHOULD NOT emit | MUST accept | MAY remove in next MAJOR |

An **`integration`** references a capability **source** that is exactly one of:

```
source = local   → an mcp-server (native @scope/name + range, optionally vendored)  ← MCPB
       | remote  → a hosted MCP endpoint (url + transport)                          ← MCP remotes
       | api     → a serverless credential-injecting HTTP proxy                     ← AFPS-specific
```

---

## 4. Cross-cutting conventions

### 4.1 Casing
AFPS field names are `snake_case` (D8). Alignment mapping notes accompany fields
borrowed from camelCase specs.

### 4.2 Versioning
- **AFPS envelope**: required root field `schema_version`, string `"MAJOR.MINOR"`.
  MAJOR = breaking; MINOR = additive. Consumers select rules by MAJOR; MUST accept
  equal-or-lower MINOR; SHOULD accept higher MINOR by ignoring unknown fields; MUST
  reject unsupported MAJOR. (Precedent: OpenAPI `openapi`, MCPB `manifest_version`.)
- **Starting value**: AFPS is already at model `1.0`; adding `mcp-server` +
  `integration` and deprecating `tool`/`provider` is **additive** (old types stay
  accepted) → MINOR bump. The new types ship as **AFPS `1.1`**; an integration /
  mcp-server package emits `schema_version: "1.1"`. (SOTA: `0.x` signals "unstable,
  may break" — MCPB's posture; `1.x` signals a stability commitment — OpenAPI's. We
  freeze for implementation → commit at `1.x`.)
- **Embedded MCPB version**: an `mcp-server` carries MCPB's own `manifest_version`
  (`"0.3"` baseline; `"0.4"` only to unlock `server.type: uv`). AFPS does **not**
  reinterpret the MCPB block — it delegates validation to the declared MCPB version,
  exactly as OpenAPI delegates Schema Objects to their JSON Schema dialect
  (OpenAPI 3.1 §4.4 `jsonSchemaDialect`). MCPB being pre-1.0 is quarantined: its
  instability lives only in the embedded block, versioned independently.
- **AFPS↔MCPB compatibility matrix** (first row):

  | AFPS `schema_version` | Embedded MCPB `manifest_version` |
  |---|---|
  | `1.1` | `0.3` (baseline) · `0.4` (only for `server.type: uv`) |

### 4.3 Extensibility — `_meta` (reverse-DNS)
Adopt the MCP `_meta` key grammar verbatim: key = optional prefix (`labels.dotted/`)
+ name. Two AFPS-relevant prefixes:
- **`dev.afps/`** (reverse-DNS of the AFPS-owned domain `afps.dev`) — the
  **vendor-neutral, spec-normative** namespace any AFPS runtime reads. Used for the
  portable contract attached to an `mcp-server` MCPB manifest.
- **`dev.appstrate/`** — **implementation-only** hints (sidecar, bundler
  provenance) that no other runtime needs.

MUST NOT use an `mcp`/`modelcontextprotocol` prefix (MCP-reserved). The value at a
namespace key MUST be a JSON object. Consumers MUST NOT fail on unknown `_meta` keys.

### 4.4 Embedded JSON Schema (`credentials.schema`)
JSON Schema **Draft 2020-12** (dialect `https://json-schema.org/draft/2020-12/schema`;
the dialect OpenAPI 3.1 adopted). `$ref` inside `credentials.schema` MUST be a
local fragment-only pointer (`#/...`); external/remote `$ref` MUST NOT be used
(offline-validatable, anti-SSRF).

### 4.5 Deprecation
Boolean-style marker + normative prose + a superseded-by table (§3) + a removal
policy. (Precedent: OpenAPI/JSON Schema `deprecated`; IETF "Obsoleted by".)

---

## 5. The `mcp-server` package (≡ MCPB)

The manifest **IS** an MCPB manifest. Implementers MUST emit a manifest that
validates against the MCPB JSON schema for the declared `manifest_version`.

### 5.1 Baseline & runtime
- `manifest_version`: `"0.3"` (what `mcpb init` emits and the published examples
  use). Use `"0.4"` only when `server.type: "uv"` is needed.
- `server.type` ∈ **`node | python | binary`** (0.3) / **`+ uv`** (0.4). There is
  **no** `http`/`remote`/`docker`/`bun` — those are not MCPB and are handled by the
  `integration` `source` instead (§6.2).
- `server` = `{ type, entry_point, mcp_config: { command, args?, env?, platform_overrides? } }`.
- **Credential delivery in a stock MCPB host** is via `user_config` (string,
  `sensitive: true`) substituted as `${user_config.KEY}` into `mcp_config.env`. This
  is the only credential mechanism Claude Desktop understands.

### 5.2 AFPS enrichment
AFPS-native fields (scoped `name`, `type`, `schema_version`, `dependencies`,
common identity/metadata fields) live at the **root** of the `mcp-server`
manifest alongside the MCPB-vocabulary fields. `_meta` keeps its standard role
for vendor extensions (e.g. `_meta["dev.appstrate/…"]` for bundler provenance);
AFPS-defined data no longer needs to be confined under `_meta` because the
manifest is no longer constrained by the MCPB strict schema.

### 5.3 Packaging
An `.afps` archive is a ZIP with `manifest.json` at the archive root + the
server payload referenced by `server.entry_point`. `icon`, if present, MUST be
a relative path to a real PNG.

### 5.4 Relationship to strict MCPB
A built `mcp-server` is **not** a strict MCPB bundle by construction: the
manifest carries AFPS-native top-level fields outside the MCPB schema. The MCPB
vocabulary alignment lets producers reuse MCPB tooling and conventions when
authoring the server payload, but installation into a stock MCPB host (Claude
Desktop, mcpb CLI) is not promised. A publish-time projection to a strict MCPB
bundle MAY be added in a future minor of the AFPS spec; producers needing
strict-MCPB interop today MUST emit it separately. Capability surfaces other
than a local `node`/`python`/`binary`/`uv` server (remote, docker, hosted MCP
endpoints, …) are modeled as an `integration` `source` (§6.2), not as an
`mcp-server`.

> **Where OAuth/MITM live (and the zero-knowledge note):** OAuth, `connect.*`
> acquisition, and `delivery.http`/MITM are properties of the **`integration`**, not
> the `mcp-server`. The integration is AFPS-native (not an MCPB manifest), so it is
> never installed in Claude Desktop directly. A genuine tension remains *within an
> integration's delivery choice*: `delivery.env` (server holds the secret, maps to
> MCPB `user_config`) vs `delivery.http`/MITM (server never sees the secret,
> Appstrate-only). The two are mutually exclusive per integration (§6.4).

---

## 6. The `integration` package (AFPS-native)

### 6.1 Identity (common fields)
`schema_version` (required), `name` (`@scope/name`), `version`, `display_name`,
`description?`, `keywords?`, `icon?`, `license?`, `repository?`, `privacy_policy?`.

### 6.2 `source` — the capability surface (exactly one)
```jsonc
"source": {
  "kind": "local" | "remote" | "api",

  // kind=local: reference an mcp-server by native AFPS name+range (D9).
  "server": { "name": "@appstrate/gmail-server", "version": "^1.2.0", "vendored": true },

  // kind=remote: hosted MCP endpoint (MCP remotes style)
  "remote": { "url": "https://…/mcp", "transport": "streamable-http" | "sse" },

  // kind=api: serverless credential-injecting HTTP proxy (no MCP server)
  "api": { "upload_protocols": ["google-resumable", "s3-multipart", "tus", "ms-resumable"] }
}
```
`kind=local` is the only source whose referenced `mcp-server` is itself a
standalone MCPB-runnable artifact (the integration's auth layer is applied by the
AFPS runtime on top).

### 6.3 `auths.<key>` — authentication (the core contribution)

`<key>` matches `^[a-z][a-z0-9_]*$`. A manifest MAY declare multiple auth methods.

```jsonc
"auths": {
  "oauth": {
    "type": "oauth2",                          // oauth2 | api_key | basic | mtls | custom

    // ── Discovery-first OAuth (D5) ──────────────────────────────
    "issuer": "https://accounts.google.com",   // AFPS fetches its .well-known
    // Manual overrides (RFC 8414 / OIDC field names, verbatim snake_case).
    // REQUIRED when the provider publishes no discovery document.
    "authorization_endpoint": "…",             // RFC 8414
    "token_endpoint": "…",                     // RFC 8414
    "userinfo_endpoint": "…",                  // OIDC Discovery (not 8414)
    "token_endpoint_auth_method": "client_secret_basic", // RFC 7591 + OIDC Core; default per RFC 8414 §2 / RFC 7591 §2
    "code_challenge_methods_supported": ["S256"],        // RFC 8414 (PKCE as array)
    "resource": "https://www.googleapis.com",  // RFC 8707 (NOT "audience")
    "authorization_params": { "access_type": "offline" }, // extra authorize params (AFPS)

    // ── Scopes ───────────────────────────────────────────────────
    "default_scopes": ["openid", "email"],     // requested floor (AFPS selection layer)
    "scope_catalog": [                          // AFPS UX/policy catalog (NOT scopes_supported)
      { "value": "https://www.googleapis.com/auth/gmail.readonly",
        "label": "Read Gmail", "description": "…", "implies": [] }
    ],

    // ── Identity ─────────────────────────────────────────────────
    "identity_claims": { "account_id": "sub", "email": "email" },  // OIDC claim names
    "required_identity_claims": ["sub"],

    // ── Delivery (§6.4) ──────────────────────────────────────────
    "delivery": { "http": { "in": "header", "name": "Authorization", "prefix": "Bearer ", "value": "{$credential.access_token}" } },

    // ── Egress allowlist (AFPS-specific security control) ────────
    "authorized_uris": ["https://*.googleapis.com/**"],
    "allow_all_uris": false
  }
}
```

Notes:
- **Discovery is best-effort enrichment, never a precondition.** Many providers
  (GitHub, Slack, Notion, ClickUp) publish no discovery doc → every discovered
  field MUST be overridable, and a fully-manual mode MUST be supported.
- **`scopes_supported` is not authoritative** (RECOMMENDED-only in 8414, often
  incomplete) → AFPS keeps its own `scope_catalog` (with `label`/`description`/
  `implies` — none of which any standard provides). Discovery MAY seed values; the
  catalog is the AFPS source of truth.
- A consumer MUST probe the three discovery endpoints in order: 8414-insertion
  (`/.well-known/oauth-authorization-server/{path}`), OIDC-insertion
  (`/.well-known/openid-configuration/{path}`), OIDC-append
  (`{path}/.well-known/openid-configuration`); strip trailing `/`; validate returned
  `issuer` equals the requested issuer.
- `credentials.schema` (JSON Schema 2020-12, §4.4) is REQUIRED for
  `api_key`/`basic`/`mtls`/`custom`; it declares the user-supplied credential bag shape.
  For `mtls`, the schema describes the client certificate (PEM), private key (PEM),
  and optional intermediate chain.

### 6.4 `delivery` — where the acquired credential goes (D7)

At least one of `{http, env, files}` MUST be declared.

```jsonc
"delivery": {
  // OpenAPI Security-Scheme vocabulary (in/name) + AFPS value template & prefix.
  "http": { "in": "header" | "query" | "cookie", "name": "Authorization",
            "prefix": "Bearer ", "value": "{$credential.token}",
            "allow_server_override": false },
  // Kubernetes vocabulary (env injection).
  "env": { "GMAIL_TOKEN": { "value": "{$credential.access_token}", "sensitive": true } },
  // Kubernetes vocabulary (file injection). mode is an OCTAL STRING; default "0400".
  "files": { "/run/creds/token": { "value": "{$credential.token}", "mode": "0400" } }
}
```
- `in`+`name` are adopted from OpenAPI; **`prefix` and `value` templates are AFPS
  additions** (OpenAPI has no value template). `http`+bearer maps to the
  `Authorization: Bearer` convention.
- `env`/`files` mirror K8s `secretKeyRef`/`mountPath`/`mode` naming; no spec
  standardizes runtime secret injection — this is AFPS's irreducible contribution.
- **`delivery.http`** = MITM/proxy injection (server never sees the secret) —
  Appstrate-only. **`delivery.env`** maps to MCPB `user_config`→`${user_config.KEY}`
  (server holds the secret) — the mode that lets the referenced `mcp-server` also run
  standalone in Claude Desktop. Mutually exclusive per integration (§5.4).

### 6.5 `connect` — declarative credential acquisition (D6)

`custom`-only. Exactly one of `login` (declarative) or `tool` (orchestrated;
OPTIONAL/experimental — field shapes specified, security properties left to the
implementation).

```jsonc
"connect": {
  "login": {
    // Inline HTTP request (AFPS divergence: Arazzo references an OpenAPI operation;
    // an integration has no OpenAPI doc to point at, so the request is inline).
    "request": { "method": "POST", "url": "https://api.x.com/login",
                 "headers": {}, "body": "…", "content_type": "application/json" },
    // Arazzo Criterion vocabulary (condition + optional context + type).
    // Default success = HTTP 2xx when omitted (AFPS-defined; Arazzo leaves HTTP success undefined).
    "success_criteria": [ { "condition": "$statusCode == 200" } ],   // type:simple default
    // Outputs: value is an Arazzo runtime expression (json-pointer / header / status)
    // OR an AFPS extractor object (jwt/regex/cookie — beyond Arazzo).
    "outputs": {
      "token": "$response.body#/access_token",                       // Arazzo (RFC 6901 pointer)
      "exp":   "$response.header.X-Expires-After",                   // Arazzo
      "csrf":  { "from": "cookie", "name": "XSRF-TOKEN" },           // AFPS extension
      "sub":   { "from": "jwt", "token": "{$outputs.token}", "path": "/sub" }  // AFPS extension
    },
    "expires_in_output": "exp",
    "identity_outputs": ["sub"]
  },
  "limits": { "request_timeout_ms": 30000, "max_response_bytes": 5000000 }
}
```
**§4.6 gating rule (preserved):** `delivery.*` MAY only reference declared `outputs`
(or `produces` for the orchestrated `tool`). A delivery referencing a non-output
(i.e. a bootstrap login secret) is a manifest error.

Runtime-expression grammar adopted from Arazzo: `$statusCode`, `$response.body[#/ptr]`
(RFC 6901), `$response.header.<name>`, `$outputs.<name>`; embedding via `{$expr}`.
AFPS extractor objects (`from: jwt|regex|cookie`) extend `outputs` for cases Arazzo
cannot express.

### 6.6 `tools_policy.<name>` — per-tool policy (local/remote sources)
```jsonc
"tools_policy": {
  "list_issues": {
    "required_scopes": ["repo"],
    "required_auth_key": "oauth",                 // disambiguates multi-auth
    "url_patterns": [ { "pattern": "https://api.github.com/**", "methods": ["GET"] } ]
  }
}
```
`required_scopes` drives the agent-install scope union; `url_patterns` is
defence-in-depth (glob `*`/`**`, optional methods). The `_policy` suffix
distinguishes this field from `mcp-server.tools` (which is a canonical
catalog, not a policy table).

---

## 7. Validation & conformance

1. **`mcp-server`**: MUST validate against the MCPB JSON schema for its
   `manifest_version`; AFPS extras MUST be confined to `_meta`. A conformance test
   MUST assert that a built bundle validates with a stock MCPB validator and
   installs+runs in a real MCPB host.
2. **`integration`**: MUST validate against the AFPS integration JSON schema.
   `auths.<key>` of `type: oauth2` MUST resolve to a usable endpoint set (via
   discovery and/or manual override). `delivery.*` MUST only reference declared
   `connect` outputs (§6.5). `credentials.schema` MUST be a self-contained 2020-12
   schema (§4.4).
3. **Two sources of truth in `@appstrate/core`** (Zod `integration.ts` + the JSON
   Schema mirror `packages/core/schema/integration.schema.json`) MUST stay in
   lockstep; every field change touches both.

---

## 8. Feasibility notes (gotchas to design around)

- **MCPB `additionalProperties:false`** — extras outside `_meta` are fatal. (D4)
- **Discovery best-effort** — never block on `.well-known`; full manual mode
  required; `scope_catalog` is authoritative, not `scopes_supported`.
- **`code_challenge_methods_supported` absence** — MCP says refuse; allow a manual
  `["S256"]` override for providers that support PKCE but don't advertise it.
- **`resource` may be ignored by the AS** — send it anyway (forward-compat); the
  resource server must independently validate `aud`.
- **Remote/docker/bun sources** — cannot be expressed as an `mcp-server` (no local
  MCPB `server`); they are AFPS-only integration sources with no `.mcpb` form.
- **`connect.login` request is inline**, not an Arazzo operation reference — an
  intentional, documented divergence.

---

## 9. Implementation plan (Appstrate side)

**Phase 0 — Conformance harness first.** Add Zod-driven tests covering the four
package types (agent / skill / mcp-server / integration). Wire into
`@appstrate/afps-runtime` conformance. Exit: harness exists and validates the
example manifests in `examples/`.

**Phase 1 — Schema design freeze.** Lock the field-level schemas in §5–§6 as Zod +
JSON-Schema-mirror drafts; finalize `_meta` namespace strings; write example
manifests (local/remote/api + oauth/connect/api_key). Exit: examples validate.

**Phase 2 — `@appstrate/core` refactor.** Split `integration.ts` into
`integration-manifest.ts` (schema) + `integration-connection.ts` (runtime resolver
types — these are NOT manifest fields and never were). Implement the two package
types + a bidirectional codec `decodeLegacy()` (old monolithic integration → new
`mcp-server` + `integration`) so consumers migrate without a flag-day. Exit:
`bun run check` green; Phase 0 schema tests pass.

**Phase 3 — Migrate fixtures + stored manifests.** Rewrite the ~62 system-package
manifests under `scripts/system-packages/` via the codec; data-migrate stored agent
integration manifests (or `decodeLegacy` at read + lazy re-save). Exit: every system
package validates; no legacy-only hot-path reads.

**Phase 4 — Update readers.** Spawn resolver, connection resolver, sidecar
`integrations-boot`, MITM listener, scope resolvers, credential resolver, web editor,
OpenAPI — read via the codec's normalized shape. Exit: `bun test` + `bun run check`
green; e2e run of a local + a remote integration.

**Phase 5 — Release.** Major `@appstrate/core` bump; update registry/cloud/portal in
lockstep; keep `decodeLegacy` one deprecation window.

**Phase 6 — Amend the AFPS spec.** Add `mcp-server` (delegating to MCPB 0.3) +
`integration` (§6); rewrite extensibility around `_meta`; deprecate `tool`/`provider`
(§3 table); add the conformance keywords block (§1); publish `@afps-spec/schema`
matching core.

---

## 10. Resolved decisions (all confirmed — ready for Phase 1)

1. **`_meta` namespaces** — ✅ vendor-neutral **`dev.afps/`** for the spec-normative
   contract (domain `afps.dev` being acquired), **`dev.appstrate/`** for
   implementation-only hints. (§4.3)
2. **Sources that can't be MCPB** — ✅ remote/docker/bun are honestly AFPS-only
   integration sources; no thin local proxy to fake MCPB validity. An `mcp-server`
   is always runnable; there is no `mcpb_runnable: false` mcp-server. (§5.4)
3. **`source.server` reference** — ✅ native AFPS `{name, version}` (like skills);
   purl demoted to optional build-provenance in `_meta`. (D9, §6.2)
4. **Versioning** — ✅ AFPS `schema_version: "1.1"` (additive over the existing 1.0
   model); embedded MCPB `manifest_version` `0.3`/`0.4`. (§4.2)

Next: **Phase 0 — conformance harness** (§9).
