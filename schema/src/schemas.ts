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

// ─────────────────────────────────────────────
// Shared patterns and primitives
// ─────────────────────────────────────────────

const SLUG_PATTERN = "[a-z0-9]([a-z0-9-]*[a-z0-9])?";
const SCOPED_NAME_REGEX = new RegExp(`^@${SLUG_PATTERN}\\/${SLUG_PATTERN}$`);

const scopedName = z.string().regex(SCOPED_NAME_REGEX);
const semverRange = z.string().min(1);

// ─────────────────────────────────────────────
// Schema system (§5)
// ─────────────────────────────────────────────

const fieldTypeEnum = z.enum(["string", "number", "boolean", "array", "object", "file"]);

const schemaProperty = z.looseObject({
  type: fieldTypeEnum,
  description: z.string().optional(),
  default: z.unknown().optional(),
  enum: z.array(z.unknown()).optional(),
  format: z.string().optional(),
  placeholder: z.string().optional(),
  accept: z.string().optional(),
  maxSize: z.number().positive().optional(),
  multiple: z.boolean().optional(),
  maxFiles: z.number().positive().optional(),
});

const schemaObject = z.looseObject({
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

const providerConfiguration = z.looseObject({
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

const authModeEnum = z.enum(["oauth2", "oauth1", "api_key", "basic", "custom"]);

const providerDefinition = z.looseObject({
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

const setupGuide = z
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
    .regex(new RegExp(`^${majorVersion}\\.(0|[1-9]\\d*)$`));

  const commonFields = {
    name: scopedName,
    version: z.string().min(1),
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
    author: z.string(),
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

  const providerManifestSchema = z.looseObject({
    ...commonFields,
    type: z.literal("provider"),
    iconUrl: z.string().optional(),
    categories: z.array(z.string()).optional(),
    docsUrl: z.string().optional(),
    definition: providerDefinition,
    setupGuide: setupGuide,
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
