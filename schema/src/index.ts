// SPDX-License-Identifier: CC-BY-4.0
// Copyright (c) 2026 Appstrate contributors

/**
 * @afps/schema — AFPS Zod schemas for manifest validation.
 *
 * Default exports are AFPS v1 schemas. Use createSchemas(majorVersion)
 * to generate schemas for a specific version.
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
  credentialEncodingEnum,
  providerConfiguration,
  setupGuide,
  schemaObject,
  // JSON Schema generation helper
  afpsJsonSchemaOverride,
} from "./schemas.ts";
