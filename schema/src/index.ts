/**
 * @afps/schema — AFPS Zod schemas for manifest validation.
 *
 * Default exports are AFPS v1 schemas. Use createSchemas(majorVersion)
 * to generate schemas for a specific version.
 */

export {
  createSchemas,
  flowManifestSchema,
  skillManifestSchema,
  toolManifestSchema,
  providerManifestSchema,
} from "./schemas.ts";
