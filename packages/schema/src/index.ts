// SPDX-License-Identifier: CC-BY-4.0
// Copyright (c) 2026 Appstrate contributors

/**
 * @afps-spec/schema — AFPS 2.0 Zod schemas for manifest validation.
 *
 * Default exports are AFPS v2 schemas. Use createSchemas(majorVersion)
 * to generate schemas for a specific version.
 */

export {
  // Factory
  createSchemas,
  // Top-level manifest schemas
  agentManifestSchema,
  skillManifestSchema,
  mcpServerManifestSchema,
  integrationManifestSchema,
  // Shared primitives / sub-schemas — reusable by consumers
  scopedName,
  packageTypeEnum,
  metaSchema,
  schemaObject,
  schemaWrapper,
  integrationConfiguration,
  // mcp-server (§3.4)
  mcpServerTypeEnum,
  mcpServerAfpsMeta,
  // integration source (§7.1)
  integrationSource,
  transportEnum,
  uploadProtocolEnum,
  // integration auth (§7.2 – §7.10)
  authTypeEnum,
  authMethod,
  tokenEndpointAuthMethodEnum,
  credentialsConfig,
  deliverySchema,
  deliveryEncodingEnum,
  connectSchema,
  setupGuide,
  // JSON Schema generation helper
  afpsJsonSchemaOverride,
} from "./schemas.ts";

export type {
  AgentManifest,
  SkillManifest,
  McpServerManifest,
  IntegrationManifest,
  PackageType,
} from "./schemas.ts";
