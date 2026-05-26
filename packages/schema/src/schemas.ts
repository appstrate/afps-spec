// SPDX-License-Identifier: CC-BY-4.0
// Copyright (c) 2026 Appstrate contributors

/**
 * AFPS 2.0 — Zod schemas for the four package types.
 *
 * AFPS 2.0 uses a snake_case field vocabulary and defines four package types:
 *   - agent       (§3.2)
 *   - skill        (§3.3)
 *   - mcp-server   (§3.4) — AFPS-native at root, adopts MCPB vocabulary for server/tools/user_config
 *   - integration  (§3.5 + §7)
 *
 * These schemas define ONLY the fields in the AFPS specification. Vendor
 * extension data lives under `_meta` (§10). All top-level objects are
 * permissive (looseObject) so unknown fields round-trip.
 *
 * Schemas are parameterized by major version: the `schema_version` field is
 * constrained to match (e.g., v2 schemas accept "2.0", "2.1", …).
 *
 * Source of truth: ../../spec.md (§2–§10, Appendix A/B/D)
 */

import { z } from "zod";
import semver from "semver";
import Ajv2020 from "ajv/dist/2020";

// ─────────────────────────────────────────────
// Shared patterns and primitives (§2.2, Appendix B)
// ─────────────────────────────────────────────

const SLUG_PATTERN = "[a-z0-9]([a-z0-9-]*[a-z0-9])?";
const SCOPED_NAME_REGEX = new RegExp(`^@${SLUG_PATTERN}\\/${SLUG_PATTERN}$`);

/** AUTH_KEY_REGEX — keys of the integration `auths` map (§7.2, Appendix B). */
const AUTH_KEY_REGEX = /^[a-z][a-z0-9_]*$/;

/** Octal file-mode string, e.g. "0400" (§7.6). */
const FILE_MODE_REGEX = /^0[0-7]{3}$/;

/** A scoped AFPS package identity `@scope/name` (§2.2). */
export const scopedName = z.string().regex(SCOPED_NAME_REGEX, {
  error: "Must follow @scope/name format",
});

/** The four AFPS 2.0 package types (§2.1). `tool` and `provider` are removed. */
export const packageTypeEnum = z.enum(["agent", "skill", "mcp-server", "integration"]);

const semverVersion = z.string().refine((v) => semver.valid(v) !== null, {
  error: "Must be a valid semver version (e.g. 1.0.0)",
});

const semverRange = z.string().refine((v) => semver.validRange(v) !== null, {
  error: "Must be a valid semver range (e.g. ^1.0.0, ~2.1, >=3.0.0)",
});

// ─────────────────────────────────────────────
// Schema system (§5) — JSON Schema 2020-12 validation via AJV
// ─────────────────────────────────────────────

const ajv = new Ajv2020({ strict: false });

/** Sentinel description used to identify schemaObject during JSON Schema generation. */
const AFPS_SCHEMA_SENTINEL = "__afps_jsonschema__";

/** The JSON Schema representation for AFPS schema fields (allOf: meta-schema + AFPS constraint). */
const AFPS_SCHEMA_OBJECT_JSON_SCHEMA = {
  allOf: [
    { $ref: "https://json-schema.org/draft/2020-12/schema" },
    {
      type: "object" as const,
      required: ["type", "properties"],
      properties: { type: { const: "object" } },
    },
  ],
};

/**
 * Validates that the value is a valid JSON Schema 2020-12 document,
 * constrained to `type: "object"` with `properties` as required by AFPS (§5.3).
 *
 * Tagged with a sentinel `.describe()` so `toJSONSchema()` override can emit
 * a proper `$ref` to the official meta-schema instead of an opaque `{}`.
 */
export const schemaObject = z
  .looseObject({})
  .describe(AFPS_SCHEMA_SENTINEL)
  .refine((val) => ajv.validateSchema(val) === true, {
    message: "Must be a valid JSON Schema 2020-12 document",
  })
  .refine((val) => val.type === "object" && val.properties !== undefined, {
    message: 'AFPS schemas must be type: "object" with properties',
  });

/**
 * Override callback for `z.toJSONSchema()` / `toJSONSchema()`.
 * Detects schemas tagged with the AFPS sentinel description and replaces
 * the generated output with a `$ref` to the JSON Schema 2020-12 meta-schema.
 *
 * Usage:
 *   toJSONSchema(mySchema, { override: afpsJsonSchemaOverride, ... })
 */
export function afpsJsonSchemaOverride(ctx: { jsonSchema: Record<string, unknown> }): void {
  if (ctx.jsonSchema.description === AFPS_SCHEMA_SENTINEL) {
    for (const key of Object.keys(ctx.jsonSchema)) delete ctx.jsonSchema[key];
    Object.assign(ctx.jsonSchema, AFPS_SCHEMA_OBJECT_JSON_SCHEMA);
  }
}

// ─────────────────────────────────────────────
// Extension mechanism (§10) — `_meta`
// ─────────────────────────────────────────────

/**
 * The `_meta` extension object (§10.1). A record of reverse-DNS-namespaced
 * keys whose values MUST be JSON objects. Validation is intentionally
 * permissive: consumers MUST NOT reject unknown `_meta` keys.
 */
export const metaSchema = z.record(z.string(), z.record(z.string(), z.unknown()));

// ─────────────────────────────────────────────
// Schema wrapper (§5.4) — input/output/config
// ─────────────────────────────────────────────

const fileConstraint = z.looseObject({
  accept: z.string().optional(),
  max_size: z.number().positive().optional(),
});

const uiHint = z.looseObject({
  placeholder: z.string().optional(),
});

export const schemaWrapper = z.object({
  schema: schemaObject,
  file_constraints: z.record(z.string(), fileConstraint).optional(),
  ui_hints: z.record(z.string(), uiHint).optional(),
  property_order: z.array(z.string()).optional(),
});

// ─────────────────────────────────────────────
// Dependencies (§4)
// ─────────────────────────────────────────────

/**
 * Generic dependency entry: a semver range string, or an object whose `version`
 * member is a semver range. Object form is the carrier for per-dependency-type
 * configuration (e.g. `scopes`/`auth_key` for integrations).
 */
const baseDependencyObject = z.looseObject({
  version: semverRange,
});

const dependencyValue = z.union([semverRange, baseDependencyObject]);

/** Dependency entry for `dependencies.integrations.<id>` (§4.1). */
const integrationDependencyObject = z.looseObject({
  version: semverRange,
  scopes: z.array(z.string()).optional(),
  auth_key: z
    .string()
    .regex(AUTH_KEY_REGEX, { error: "auth_key must match ^[a-z][a-z0-9_]*$" })
    .optional(),
});

const integrationDependencyValue = z.union([semverRange, integrationDependencyObject]);

const dependenciesSchema = z
  .looseObject({
    skills: z.record(scopedName, dependencyValue).optional(),
    mcp_servers: z.record(scopedName, dependencyValue).optional(),
    integrations: z.record(scopedName, integrationDependencyValue).optional(),
  })
  .optional();

// ─────────────────────────────────────────────
// Agent integrations_configuration (§4.4 — deprecated)
// ─────────────────────────────────────────────

/**
 * Deprecated in AFPS 2.0 (§4.4). Per-integration configuration now lives inline
 * inside `dependencies.integrations.<id>` (object form). Consumers MUST keep
 * accepting this field; values are merged into dependency entries with the
 * dependency entry winning on conflict.
 */
export const integrationConfiguration = z.looseObject({
  scopes: z.array(z.string()).optional(),
  auth_key: z.string().optional(),
});

// ─────────────────────────────────────────────
// MCP-server: MCPB-vocabulary shapes (§3.4)
// ─────────────────────────────────────────────

/** Server runtime type. `uv` requires manifest_version 0.4 (§3.4). */
export const mcpServerTypeEnum = z.enum(["node", "python", "binary", "uv"]);

/** `server.mcp_config` (MCPB vocabulary). */
const mcpConfig = z.looseObject({
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  platform_overrides: z.record(z.string(), z.unknown()).optional(),
});

const mcpServerRun = z.looseObject({
  type: mcpServerTypeEnum,
  entry_point: z.string().min(1),
  mcp_config: mcpConfig,
});

const mcpServerToolEntry = z.looseObject({
  name: z.string().min(1),
  description: z.string().optional(),
});

// ─────────────────────────────────────────────
// Integration: source (§7.1)
// ─────────────────────────────────────────────

/** MCP transport for a remote integration source (§7.1). */
export const transportEnum = z.enum(["streamable-http", "sse"]);

/**
 * Reserved resumable upload protocols an `api` source MAY declare (§7.1). AFPS
 * 2.0 reserves these values for interoperability; producers MAY emit other
 * (reverse-DNS-qualified) values and consumers MUST tolerate them.
 */
export const RESERVED_UPLOAD_PROTOCOLS = [
  "google-resumable",
  "s3-multipart",
  "tus",
  "ms-resumable",
] as const;

const localSource = z.looseObject({
  kind: z.literal("local"),
  server: z.looseObject({
    name: scopedName,
    version: semverRange,
    vendored: z.boolean().optional(),
  }),
});

const remoteSource = z.looseObject({
  kind: z.literal("remote"),
  remote: z.looseObject({
    url: z.string().min(1),
    transport: transportEnum,
  }),
});

const apiSource = z.looseObject({
  kind: z.literal("api"),
  api: z.looseObject({
    upload_protocols: z
      .array(z.string().min(1))
      .refine((arr) => new Set(arr).size === arr.length, {
        error: "upload_protocols must contain unique values",
      })
      .optional(),
  }),
});

export const integrationSource = z.discriminatedUnion("kind", [
  localSource,
  remoteSource,
  apiSource,
]);

// ─────────────────────────────────────────────
// Integration: auth methods (§7.2 – §7.10)
// ─────────────────────────────────────────────

/** Authentication model selector (§7.2). */
export const authTypeEnum = z.enum(["oauth2", "api_key", "basic", "mtls", "custom"]);

/**
 * OAuth2 token endpoint client-authentication method (§7.3). RFC 7591 / OIDC
 * Core vocabulary; `client_secret_basic` is the consumer default (RFC 8414 §2,
 * RFC 7591 §2, Appendix C).
 */
export const tokenEndpointAuthMethodEnum = z.enum([
  "client_secret_basic",
  "client_secret_post",
  "none",
]);

/** A single entry of an OAuth2 `scope_catalog` (§7.4). */
const scopeCatalogEntry = z.looseObject({
  value: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  implies: z.array(z.string()).optional(),
});

/** Credential schema container for api_key/basic/mtls/custom (§7.5). */
export const credentialsConfig = z.looseObject({
  schema: schemaObject,
});

// --- Credential delivery (§7.6) ---

/** Optional encoding applied to a rendered HTTP credential value (§7.6). */
export const deliveryEncodingEnum = z.enum(["base64"]);

const httpDelivery = z.looseObject({
  in: z.enum(["header", "query", "cookie"]),
  name: z.string().min(1),
  prefix: z.string().optional(),
  value: z.string().min(1),
  encoding: deliveryEncodingEnum.optional(),
  allow_server_override: z.boolean().optional(),
});

const envDeliveryEntry = z.looseObject({
  value: z.string().min(1),
  sensitive: z.boolean().optional(),
  // MCPB user_config key for local-source binding (§7.6). Defaults to the
  // env-variable name (the map key) when omitted.
  user_config_key: z.string().min(1).optional(),
});

const fileDeliveryEntry = z.looseObject({
  value: z.string().min(1),
  mode: z
    .string()
    .regex(FILE_MODE_REGEX, { error: 'mode must be an octal string, e.g. "0400"' })
    .optional(),
});

export const deliverySchema = z.looseObject({
  http: httpDelivery.optional(),
  env: z.record(z.string(), envDeliveryEntry).optional(),
  files: z.record(z.string(), fileDeliveryEntry).optional(),
});

// --- Declarative credential acquisition: connect (§7.7) ---

const connectRequest = z.looseObject({
  method: z.string().min(1),
  url: z.string().min(1),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  content_type: z.string().optional(),
});

const arazzoCriterion = z.looseObject({
  condition: z.string().min(1),
  context: z.string().optional(),
  type: z.enum(["simple", "regex", "jsonpath", "xpath"]).optional(),
});

/**
 * A connect.login output value (§7.7). Polymorphic across three shapes:
 *  - Arazzo runtime-expression string (`$response.body#/...`, `$statusCode`, …);
 *  - Arazzo 1.1 Selector Object `{ context, selector, type }`
 *    (type ∈ "jsonpath" | "xpath" | "jsonpointer");
 *  - AFPS extractor object `{ from: cookie|jwt|regex, ... }` for cases Arazzo
 *    cannot express.
 */
const arazzoSelector = z.looseObject({
  context: z.string().min(1),
  selector: z.string().min(1),
  type: z.enum(["jsonpath", "xpath", "jsonpointer"]),
});

const afpsExtractor = z.looseObject({ from: z.string().min(1) });

const connectOutput = z.union([z.string().min(1), arazzoSelector, afpsExtractor]);

const connectLogin = z.looseObject({
  request: connectRequest,
  success_criteria: z.array(arazzoCriterion).optional(),
  outputs: z.record(z.string(), connectOutput).optional(),
  expires_in_output: z.string().optional(),
  identity_outputs: z.array(z.string()).optional(),
});

const connectLimits = z.looseObject({
  request_timeout_ms: z.number().positive().optional(),
  max_response_bytes: z.number().positive().optional(),
});

export const connectSchema = z.looseObject({
  login: connectLogin.optional(),
  tool: z.looseObject({}).optional(),
  limits: connectLimits.optional(),
});

// --- URI restrictions (§7.9) ---
const uriRestrictionFields = {
  authorized_uris: z.array(z.string()).optional(),
  allow_all_uris: z.boolean().optional(),
};

/**
 * One auth method under an integration's `auths` map (§7.2 – §7.9). Structural
 * shape only; cross-field MUST rules are enforced by `integrationManifestSchema`
 * `.superRefine` (§7.3, §7.5, §7.6, §7.7).
 */
export const authMethod = z.looseObject({
  type: authTypeEnum,
  // oauth2 (§7.3)
  issuer: z.string().optional(),
  authorization_endpoint: z.string().optional(),
  token_endpoint: z.string().optional(),
  userinfo_endpoint: z.string().optional(),
  token_endpoint_auth_method: tokenEndpointAuthMethodEnum.optional(),
  code_challenge_methods_supported: z.array(z.string()).optional(),
  resource: z.string().optional(),
  authorization_params: z.record(z.string(), z.unknown()).optional(),
  // scopes (§7.4)
  default_scopes: z.array(z.string()).optional(),
  scope_catalog: z.array(scopeCatalogEntry).optional(),
  identity_claims: z.record(z.string(), z.string()).optional(),
  required_identity_claims: z.array(z.string()).optional(),
  // credential schema (§7.5)
  credentials: credentialsConfig.optional(),
  // connect (§7.7)
  connect: connectSchema.optional(),
  // delivery (§7.6)
  delivery: deliverySchema,
  // URI restrictions (§7.9)
  ...uriRestrictionFields,
  // OAuth-client registration hint (§7.10). Auth-method-scoped to replace the
  // deprecated `setup_guide.callback_url_hint`.
  callback_url_hint: z.string().optional(),
});

// --- Per-tool metadata (§7.8) ---
const toolUrlPattern = z.looseObject({
  pattern: z.string().min(1),
  methods: z.array(z.string()).optional(),
});

const integrationToolMeta = z.looseObject({
  required_scopes: z.array(z.string()).optional(),
  required_auth_key: z.string().optional(),
  url_patterns: z.array(toolUrlPattern).optional(),
});

// --- Setup guide (§7.10) ---
export const setupGuide = z.looseObject({
  callback_url_hint: z.string().optional(),
  steps: z
    .array(
      z.looseObject({
        label: z.string().min(1),
        url: z.string().optional(),
      }),
    )
    .optional(),
});

// ─────────────────────────────────────────────
// Integration auth cross-field validation (§7)
// ─────────────────────────────────────────────

function refineAuthMethod(
  key: string,
  method: Record<string, unknown>,
  ctx: z.RefinementCtx,
): void {
  const at = ["auths", key];
  const type = method.type;

  if (type === "oauth2") {
    // §7.3 — issuer enables discovery; otherwise endpoints are required.
    const hasIssuer = typeof method.issuer === "string" && method.issuer.length > 0;
    const hasEndpoints = method.authorization_endpoint != null && method.token_endpoint != null;
    if (!hasIssuer && !hasEndpoints) {
      ctx.addIssue({
        code: "custom",
        path: [...at],
        message:
          "oauth2 auth method requires `issuer` (for discovery) OR both `authorization_endpoint` and `token_endpoint`",
      });
    }
  } else if (type === "api_key" || type === "basic" || type === "mtls" || type === "custom") {
    // §7.5 — credentials.schema is REQUIRED.
    const creds = method.credentials as Record<string, unknown> | undefined;
    if (!creds || creds.schema === undefined) {
      ctx.addIssue({
        code: "custom",
        path: [...at, "credentials", "schema"],
        message: `credentials.schema is required for ${type} auth method`,
      });
    }
  }

  // §7.7 — connect only valid for custom; exactly one of login/tool.
  const connect = method.connect as Record<string, unknown> | undefined;
  if (connect) {
    if (type !== "custom") {
      ctx.addIssue({
        code: "custom",
        path: [...at, "connect"],
        message: "connect is only valid for auth methods of type custom",
      });
    }
    const hasLogin = connect.login !== undefined;
    const hasTool = connect.tool !== undefined;
    if (hasLogin === hasTool) {
      ctx.addIssue({
        code: "custom",
        path: [...at, "connect"],
        message: "connect MUST contain exactly one of `login` or `tool`",
      });
    }
  }

  // §7.6 — at least one delivery channel; http exclusive of env/files.
  const delivery = method.delivery as Record<string, unknown> | undefined;
  if (delivery) {
    const hasHttp = delivery.http !== undefined;
    const hasEnv = delivery.env !== undefined;
    const hasFiles = delivery.files !== undefined;
    if (!hasHttp && !hasEnv && !hasFiles) {
      ctx.addIssue({
        code: "custom",
        path: [...at, "delivery"],
        message: "delivery MUST declare at least one of `http`, `env`, or `files`",
      });
    }
    if (hasHttp && (hasEnv || hasFiles)) {
      ctx.addIssue({
        code: "custom",
        path: [...at, "delivery"],
        message:
          "delivery.http (proxy injection) is mutually exclusive with delivery.env/files (server holds the secret)",
      });
    }
  }
}

// ─────────────────────────────────────────────
// Schema factory — parameterized by major version
// ─────────────────────────────────────────────

export function createSchemas(majorVersion: number) {
  const schemaVersionField = z
    .string()
    .regex(new RegExp(`^${majorVersion}\\.(0|[1-9]\\d*)$`), {
      error: `Must follow MAJOR.MINOR format (e.g. "${majorVersion}.0")`,
    });

  // Author/Repository: string or structured object (§3.1).
  const authorObject = z.looseObject({
    name: z.string().min(1),
    email: z.string().optional(),
    url: z.string().optional(),
  });
  const authorField = z.union([z.string().min(1), authorObject]);

  const repositoryObject = z.looseObject({
    type: z.string().min(1),
    url: z.string().min(1),
    directory: z.string().optional(),
  });
  const repositoryField = z.union([z.string().min(1), repositoryObject]);

  // Icon variant (MCPB-aligned, §3.1).
  const iconObject = z.looseObject({
    src: z.string().min(1),
    size: z
      .string()
      .regex(/^\d+x\d+$/, { error: 'size must be "WIDTHxHEIGHT", e.g. "128x128"' })
      .optional(),
    theme: z.enum(["light", "dark", "high-contrast"]).optional(),
  });

  // Compatibility (MCPB-aligned, §3.1).
  const compatibilityObject = z.looseObject({
    platforms: z.array(z.enum(["darwin", "win32", "linux"])).optional(),
    runtimes: z.record(z.string(), z.string()).optional(),
    clients: z.record(z.string(), z.string()).optional(),
  });

  // Common fields shared by agent / skill / integration (§3.1).
  const commonFields = {
    name: scopedName,
    version: semverVersion,
    type: packageTypeEnum,
    display_name: z.string().optional(),
    description: z.string().optional(),
    long_description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    license: z.string().optional(),
    author: authorField.optional(),
    repository: repositoryField.optional(),
    homepage: z.string().optional(),
    documentation: z.string().optional(),
    support: z.string().optional(),
    icon: z.string().optional(),
    icons: z.array(iconObject).optional(),
    screenshots: z.array(z.string()).optional(),
    privacy_policies: z.array(z.string()).optional(),
    compatibility: compatibilityObject.optional(),
    schema_version: schemaVersionField.optional(),
    dependencies: dependenciesSchema,
    _meta: metaSchema.optional(),
  };

  // ── Agent (§3.2) ──
  const agentManifestSchema = z.looseObject({
    ...commonFields,
    type: z.literal("agent"),
    schema_version: schemaVersionField,
    display_name: z.string().min(1),
    author: authorField, // REQUIRED for agent
    // Deprecated in AFPS 2.0 (§4.4); kept for backward compatibility.
    integrations_configuration: z.record(scopedName, integrationConfiguration).optional(),
    input: schemaWrapper.optional(),
    output: schemaWrapper.optional(),
    config: schemaWrapper.optional(),
    timeout: z.number().positive().optional(),
  });

  // ── Skill (§3.3) ──
  const skillManifestSchema = z.looseObject({
    ...commonFields,
    type: z.literal("skill"),
  });

  // ── MCP-server (§3.4) — AFPS-native at root + embedded MCPB vocabulary. ──
  const mcpServerManifestSchema = z
    .looseObject({
      ...commonFields,
      type: z.literal("mcp-server"),
      manifest_version: z.string().min(1),
      server: mcpServerRun,
      tools: z.array(mcpServerToolEntry).optional(),
      user_config: z.record(z.string(), z.unknown()).optional(),
    })
    .superRefine((val, ctx) => {
      // uv server type requires manifest_version 0.4 (§3.4).
      if (val.server?.type === "uv" && val.manifest_version === "0.3") {
        ctx.addIssue({
          code: "custom",
          path: ["server", "type"],
          message: 'server.type "uv" requires manifest_version "0.4" or later',
        });
      }
    });

  // ── Integration (§3.5 + §7) ──
  const integrationManifestSchema = z
    .looseObject({
      ...commonFields,
      type: z.literal("integration"),
      source: integrationSource,
      auths: z.record(z.string().regex(AUTH_KEY_REGEX), authMethod),
      // `tools_policy` is a SPARSE POLICY TABLE keyed by tool name — it
      // carries `required_scopes` / `required_auth_key` / `url_patterns`
      // per tool that needs them. It is NOT the catalog of "tools this
      // integration exposes": the catalog comes from the referenced
      // mcp-server's `tools[]` (local source) or the integration's
      // declared tools (remote/api sources). The `_policy` suffix
      // disambiguates this field from `mcp-server.tools`. An author opts
      // a tool OUT of the agent-facing surface via `hidden_tools` below.
      tools_policy: z.record(z.string(), integrationToolMeta).optional(),
      // Explicit opt-out: tool names that exist in the resolved catalog
      // but should never reach the agent's picker / `tools/list`. Tools
      // referenced as a `connect.tool` (run-start primitives) are auto-
      // hidden, so `hidden_tools` only needs to enumerate the rest.
      hidden_tools: z.array(z.string()).optional(),
      setup_guide: setupGuide.optional(),
    })
    .superRefine((val, ctx) => {
      const auths = val.auths as Record<string, Record<string, unknown>> | undefined;
      if (!auths || Object.keys(auths).length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["auths"],
          message: "integration MUST declare at least one auth method",
        });
        return;
      }
      for (const [key, method] of Object.entries(auths)) {
        refineAuthMethod(key, method, ctx);
      }
    });

  return {
    agentManifestSchema,
    skillManifestSchema,
    mcpServerManifestSchema,
    integrationManifestSchema,
  };
}

// ─────────────────────────────────────────────
// Default exports — AFPS v2
// ─────────────────────────────────────────────

const v2 = createSchemas(2);

export const agentManifestSchema = v2.agentManifestSchema;
export const skillManifestSchema = v2.skillManifestSchema;
export const mcpServerManifestSchema = v2.mcpServerManifestSchema;
export const integrationManifestSchema = v2.integrationManifestSchema;

// ─────────────────────────────────────────────
// Inferred types
// ─────────────────────────────────────────────

export type AgentManifest = z.infer<typeof agentManifestSchema>;
export type SkillManifest = z.infer<typeof skillManifestSchema>;
export type McpServerManifest = z.infer<typeof mcpServerManifestSchema>;
export type IntegrationManifest = z.infer<typeof integrationManifestSchema>;

export type PackageType = z.infer<typeof packageTypeEnum>;
