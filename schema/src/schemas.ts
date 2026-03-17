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
// Schema system (§5)
// ─────────────────────────────────────────────

const fieldTypeEnum = z.enum(["string", "number", "boolean", "array", "object", "file"]);

export const schemaProperty = z.looseObject({
  type: fieldTypeEnum,
  description: z.string().optional(),
  default: z.unknown().optional(),
  enum: z.array(z.unknown()).optional(),
  format: z.string().optional(),
  placeholder: z.string().optional(),
  accept: z.string().optional(),
  maxSize: z.number().positive().optional(),
  multiple: z.boolean().optional(),
  maxFiles: z.number().int().positive().optional(),
});

export const schemaObject = z.looseObject({
  type: z.literal("object"),
  properties: z.record(z.string(), schemaProperty),
  required: z.array(z.string()).optional(),
  propertyOrder: z.array(z.string()).optional(),
});

const schemaWrapper = z.object({
  schema: schemaObject,
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
  connectionMode: z.enum(["user", "admin"]).optional(),
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

export const providerDefinition = z.looseObject({
  authMode: authModeEnum,
  authorizationUrl: z.string().optional(),
  tokenUrl: z.string().optional(),
  refreshUrl: z.string().optional(),
  defaultScopes: z.array(z.string()).optional(),
  scopeSeparator: z.string().optional(),
  pkceEnabled: z.boolean().optional(),
  tokenAuthMethod: z.string().optional(),
  authorizationParams: z.record(z.string(), z.unknown()).optional(),
  tokenParams: z.record(z.string(), z.unknown()).optional(),
  requestTokenUrl: z.string().optional(),
  accessTokenUrl: z.string().optional(),
  credentialSchema: z.record(z.string(), z.unknown()).optional(),
  credentialFieldName: z.string().optional(),
  credentialHeaderName: z.string().optional(),
  credentialHeaderPrefix: z.string().optional(),
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
    type: z.enum(["flow", "skill", "tool", "provider"]),
    displayName: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    license: z.string().optional(),
    repository: z.string().optional(),
    schemaVersion: schemaVersionField.optional(),
    dependencies: dependenciesSchema,
  };

  const flowManifestSchema = z.looseObject({
    ...commonFields,
    type: z.literal("flow"),
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
        if (!val.definition.authorizationUrl) {
          ctx.addIssue({
            code: "custom",
            path: ["definition", "authorizationUrl"],
            message: "Required for oauth2 authMode",
          });
        }
        if (!val.definition.tokenUrl) {
          ctx.addIssue({
            code: "custom",
            path: ["definition", "tokenUrl"],
            message: "Required for oauth2 authMode",
          });
        }
      } else if (mode === "oauth1") {
        if (!val.definition.requestTokenUrl) {
          ctx.addIssue({
            code: "custom",
            path: ["definition", "requestTokenUrl"],
            message: "Required for oauth1 authMode",
          });
        }
        if (!val.definition.accessTokenUrl) {
          ctx.addIssue({
            code: "custom",
            path: ["definition", "accessTokenUrl"],
            message: "Required for oauth1 authMode",
          });
        }
      } else if (mode === "api_key" || mode === "basic" || mode === "custom") {
        if (!val.definition.credentialSchema) {
          ctx.addIssue({
            code: "custom",
            path: ["definition", "credentialSchema"],
            message: `Required for ${mode} authMode`,
          });
        }
      }
    });

  return { flowManifestSchema, skillManifestSchema, toolManifestSchema, providerManifestSchema };
}

// ─────────────────────────────────────────────
// Default exports — AFPS v1
// ─────────────────────────────────────────────

const v1 = createSchemas(1);

export const flowManifestSchema = v1.flowManifestSchema;
export const skillManifestSchema = v1.skillManifestSchema;
export const toolManifestSchema = v1.toolManifestSchema;
export const providerManifestSchema = v1.providerManifestSchema;
