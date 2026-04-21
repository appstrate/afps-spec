// SPDX-License-Identifier: CC-BY-4.0
// Copyright (c) 2026 Appstrate contributors

/**
 * @afps-spec/schema — AFPS Zod schemas for manifest validation.
 *
 * Default exports are AFPS v1 schemas. Use createSchemas(majorVersion)
 * to generate schemas for a specific version.
 *
 * TypeScript bindings for the runtime contracts defined in spec.md §8
 * (Tool protocol, RunEvent wire envelope, manifest refs) are published
 * separately as `@afps/types` — this package stays focused on the
 * manifest-format schemas.
 */

export {
  createSchemas,
  agentManifestSchema,
  skillManifestSchema,
  toolManifestSchema,
  providerManifestSchema,
  // Shared sub-schemas — reusable by consumers
  authModeEnum,
  providerDefinition,
  oauth2Config,
  oauth1Config,
  credentialsConfig,
  oauthTokenAuthMethodEnum,
  oauthTokenContentTypeEnum,
  credentialTransform,
  credentialTransformEncodingEnum,
  providerConfiguration,
  setupGuide,
  schemaObject,
  // JSON Schema generation helper
  afpsJsonSchemaOverride,
} from "./schemas.ts";
