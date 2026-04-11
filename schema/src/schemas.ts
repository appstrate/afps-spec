// SPDX-License-Identifier: CC-BY-4.0
// Copyright (c) 2026 Appstrate contributors

/**
 * AFPS — Zod schemas for the four package types.
 *
 * These schemas define ONLY the fields in the AFPS specification.
 * No implementation-specific fields (x-* or otherwise) belong here.
 *
 * Schemas are parameterized by major version: the schemaVersion field
 * is constrained to match (e.g., v1 schemas accept "1.0", "1.1", etc.)
 *
 * Source of truth: ../spec.md (§2–§7)
 */

import { z } from "zod";
import semver from "semver";
import Ajv2020 from "ajv/dist/2020";

// ─────────────────────────────────────────────
// Shared patterns and primitives
// ─────────────────────────────────────────────

const SLUG_PATTERN = "[a-z0-9]([a-z0-9-]*[a-z0-9])?";
const SCOPED_NAME_REGEX = new RegExp(`^@${SLUG_PATTERN}\\/${SLUG_PATTERN}$`);

const scopedName = z.string().regex(SCOPED_NAME_REGEX, {
  error: "Must follow @scope/name format",
});

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
 * constrained to `type: "object"` with `properties` as required by AFPS.
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
  .refine(
    (val) => val.type === "object" && val.properties !== undefined,
    { message: 'AFPS schemas must be type: "object" with properties' },
  );

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

const fileConstraint = z.looseObject({
  accept: z.string().optional(),
  maxSize: z.number().positive().optional(),
});

const uiHint = z.looseObject({
  placeholder: z.string().optional(),
});

const schemaWrapper = z.object({
  schema: schemaObject,
  fileConstraints: z.record(z.string(), fileConstraint).optional(),
  uiHints: z.record(z.string(), uiHint).optional(),
  propertyOrder: z.array(z.string()).optional(),
});

// ─────────────────────────────────────────────
// Dependencies (§4)
// ─────────────────────────────────────────────

const dependenciesSchema = z
  .looseObject({
    skills: z.record(scopedName, semverRange).optional(),
    tools: z.record(scopedName, semverRange).optional(),
    providers: z.record(scopedName, semverRange).optional(),
  })
  .optional();

// ─────────────────────────────────────────────
// Provider configuration (§4.4)
// ─────────────────────────────────────────────

export const providerConfiguration = z.looseObject({
  scopes: z.array(z.string()).optional(),
});

// ─────────────────────────────────────────────
// Tool interface (§3.4)
// ─────────────────────────────────────────────

const toolInterface = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  inputSchema: z.looseObject({}),
});

// ─────────────────────────────────────────────
// Auth and provider internals (§3.5 + §7)
// ─────────────────────────────────────────────

export const authModeEnum = z.enum(["oauth2", "oauth1", "api_key", "basic", "custom"]);

/**
 * How OAuth2 client credentials are sent on token endpoint requests.
 * - `client_secret_post` (default): credentials in the request body per RFC 6749 §2.3.1.
 * - `client_secret_basic`: credentials in an HTTP Basic `Authorization` header per RFC 6749 §2.3.1.
 */
export const oauthTokenAuthMethodEnum = z.enum(["client_secret_post", "client_secret_basic"]);

/**
 * Content-Type sent on OAuth2 token endpoint request bodies.
 * - `application/x-www-form-urlencoded` (default, per RFC 6749 §4.1.3).
 * - `application/json`: some providers (e.g. Atlassian) require a JSON body.
 */
export const oauthTokenContentTypeEnum = z.enum([
  "application/x-www-form-urlencoded",
  "application/json",
]);

/**
 * @deprecated since 1.3.0 — use {@link credentialTransform} instead.
 *
 * Fixed, runtime-specific enum of pre-encodings. Superseded by the generic
 * `credentialTransform` (template + encoding), which lets manifests express
 * any provider-specific Basic-auth convention without adding new enum values.
 *
 * Kept in the schema for backward compatibility; implementations MAY continue
 * to honor it but SHOULD prefer `credentialTransform` for new providers.
 */
export const credentialEncodingEnum = z.enum(["basic_api_key_x", "basic_email_token"]);

/**
 * Whitelisted post-substitution transforms applied to the rendered
 * `credentialTransform.template` before the result is injected as the
 * provider credential. Pure, deterministic, pre-image-free functions only.
 *
 * - `base64`: standard RFC 4648 §4 encoding.
 *
 * New encodings require a minor version bump of this spec. Implementations
 * MUST reject manifests using an unknown encoding.
 */
export const credentialTransformEncodingEnum = z.enum(["base64"]);

/**
 * Generic, template-based replacement for {@link credentialEncodingEnum}.
 *
 * `template` is rendered by substituting `{{field}}` placeholders with values
 * from the user-provided credentials (the same substitution engine used for
 * URLs and headers). The rendered string is then passed through `encoding`.
 *
 * Examples:
 * - Zendesk API token pattern:
 *   `{ template: "{{email}}/token:{{api_key}}", encoding: "base64" }`
 * - Freshdesk / Teamwork "password placeholder" pattern:
 *   `{ template: "{{api_key}}:X", encoding: "base64" }`
 *
 * The transformed value replaces `credentials.fieldName` at injection time;
 * other credential fields are preserved for URL/header substitution
 * (`{{subdomain}}`, `{{email}}`, …).
 */
export const credentialTransform = z.looseObject({
  template: z.string().min(1),
  encoding: credentialTransformEncodingEnum,
});

/** OAuth2 configuration sub-object. Required fields per §7.2; extensible for implementation-specific fields. */
export const oauth2Config = z.looseObject({
  authorizationUrl: z.string(),
  tokenUrl: z.string(),
  tokenAuthMethod: oauthTokenAuthMethodEnum.optional(),
  tokenContentType: oauthTokenContentTypeEnum.optional(),
});

/** OAuth1 configuration sub-object. Required fields per §7.3; extensible for implementation-specific fields. */
export const oauth1Config = z.looseObject({
  requestTokenUrl: z.string(),
  accessTokenUrl: z.string(),
});

/** Credential configuration sub-object. Required fields per §7.4; extensible for implementation-specific fields. */
export const credentialsConfig = z.looseObject({
  schema: z.record(z.string(), z.unknown()),
});

export const providerDefinition = z.looseObject({
  authMode: authModeEnum,
  oauth2: oauth2Config.optional(),
  oauth1: oauth1Config.optional(),
  credentials: credentialsConfig.optional(),
  credentialEncoding: credentialEncodingEnum.optional(),
  credentialTransform: credentialTransform.optional(),
  authorizedUris: z.array(z.string()).optional(),
  allowAllUris: z.boolean().optional(),
  availableScopes: z.array(z.unknown()).optional(),
});

export const setupGuide = z
  .object({
    callbackUrlHint: z.string().optional(),
    steps: z
      .array(
        z.looseObject({
          label: z.string(),
          url: z.string().optional(),
        }),
      )
      .optional(),
  })
  .optional();

// ─────────────────────────────────────────────
// Schema factory — parameterized by major version
// ─────────────────────────────────────────────

export function createSchemas(majorVersion: number) {
  const schemaVersionField = z
    .string()
    .regex(new RegExp(`^${majorVersion}\\.(0|[1-9]\\d*)$`), {
      error: `Must follow MAJOR.MINOR format (e.g. "${majorVersion}.0")`,
    });

  const commonFields = {
    name: scopedName,
    version: semverVersion,
    type: z.enum(["agent", "skill", "tool", "provider"]),
    displayName: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    license: z.string().optional(),
    repository: z.string().optional(),
    schemaVersion: schemaVersionField.optional(),
    dependencies: dependenciesSchema,
  };

  const agentManifestSchema = z.looseObject({
    ...commonFields,
    type: z.literal("agent"),
    schemaVersion: schemaVersionField,
    displayName: z.string().min(1),
    author: z.string().min(1),
    providersConfiguration: z.record(scopedName, providerConfiguration).optional(),
    input: schemaWrapper.optional(),
    output: schemaWrapper.optional(),
    config: schemaWrapper.optional(),
    timeout: z.number().positive().optional(),
  });

  const skillManifestSchema = z.looseObject({
    ...commonFields,
    type: z.literal("skill"),
  });

  const toolManifestSchema = z.looseObject({
    ...commonFields,
    type: z.literal("tool"),
    entrypoint: z.string().min(1),
    tool: toolInterface,
  });

  const providerManifestSchema = z
    .looseObject({
      ...commonFields,
      type: z.literal("provider"),
      iconUrl: z.string().optional(),
      categories: z.array(z.string()).optional(),
      docsUrl: z.string().optional(),
      definition: providerDefinition,
      setupGuide: setupGuide,
    })
    .superRefine((val, ctx) => {
      const mode = val.definition?.authMode;
      if (mode === "oauth2") {
        if (!val.definition.oauth2) {
          ctx.addIssue({
            code: "custom",
            path: ["definition", "oauth2"],
            message: "oauth2 configuration object is required for oauth2 authMode",
          });
        } else {
          if (!val.definition.oauth2.authorizationUrl) {
            ctx.addIssue({
              code: "custom",
              path: ["definition", "oauth2", "authorizationUrl"],
              message: "Required for oauth2 authMode",
            });
          }
          if (!val.definition.oauth2.tokenUrl) {
            ctx.addIssue({
              code: "custom",
              path: ["definition", "oauth2", "tokenUrl"],
              message: "Required for oauth2 authMode",
            });
          }
        }
      } else if (mode === "oauth1") {
        if (!val.definition.oauth1) {
          ctx.addIssue({
            code: "custom",
            path: ["definition", "oauth1"],
            message: "oauth1 configuration object is required for oauth1 authMode",
          });
        } else {
          if (!val.definition.oauth1.requestTokenUrl) {
            ctx.addIssue({
              code: "custom",
              path: ["definition", "oauth1", "requestTokenUrl"],
              message: "Required for oauth1 authMode",
            });
          }
          if (!val.definition.oauth1.accessTokenUrl) {
            ctx.addIssue({
              code: "custom",
              path: ["definition", "oauth1", "accessTokenUrl"],
              message: "Required for oauth1 authMode",
            });
          }
        }
      } else if (mode === "api_key" || mode === "basic" || mode === "custom") {
        if (!val.definition.credentials) {
          ctx.addIssue({
            code: "custom",
            path: ["definition", "credentials"],
            message: `credentials configuration object is required for ${mode} authMode`,
          });
        } else if (!val.definition.credentials.schema) {
          ctx.addIssue({
            code: "custom",
            path: ["definition", "credentials", "schema"],
            message: `credentials.schema is required for ${mode} authMode`,
          });
        }
      }
    });

  return { agentManifestSchema, skillManifestSchema, toolManifestSchema, providerManifestSchema };
}

// ─────────────────────────────────────────────
// Default exports — AFPS v1
// ─────────────────────────────────────────────

const v1 = createSchemas(1);

export const agentManifestSchema = v1.agentManifestSchema;
export const skillManifestSchema = v1.skillManifestSchema;
export const toolManifestSchema = v1.toolManifestSchema;
export const providerManifestSchema = v1.providerManifestSchema;
