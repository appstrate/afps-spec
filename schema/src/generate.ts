/**
 * Generate AFPS JSON Schema files from the Zod definitions.
 *
 * Change MAJOR to generate schemas for a different spec version.
 *
 * Usage: bun src/generate.ts  (from schema/)
 */

import { toJSONSchema } from "zod/v4/core";
import { resolve, dirname } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { createSchemas } from "./schemas.ts";

const MAJOR = 1;
const VERSION_TAG = `v${MAJOR}`;
const BASE_URL = "https://afps.appstrate.dev/schema";
const OUTPUT_DIR = resolve(dirname(import.meta.filename!), "..", VERSION_TAG);

const { flowManifestSchema, skillManifestSchema, toolManifestSchema, providerManifestSchema } =
  createSchemas(MAJOR);

const entries = [
  {
    filename: "flow.schema.json",
    title: "AFPS Flow Manifest",
    description:
      "Manifest schema for AFPS flow packages. " +
      "A flow declares dependencies, input/output/config schemas, a timeout hint, and provider configuration.",
    schema: flowManifestSchema,
  },
  {
    filename: "skill.schema.json",
    title: "AFPS Skill Manifest",
    description:
      "Manifest schema for AFPS skill packages. " +
      "A skill is a reusable prompt with optional frontmatter metadata.",
    schema: skillManifestSchema,
  },
  {
    filename: "tool.schema.json",
    title: "AFPS Tool Manifest",
    description:
      "Manifest schema for AFPS tool packages. " +
      "A tool declares a single callable capability with its interface and implementation source.",
    schema: toolManifestSchema,
  },
  {
    filename: "provider.schema.json",
    title: "AFPS Provider Manifest",
    description:
      "Manifest schema for AFPS provider packages. " +
      "A provider declares auth mode, OAuth endpoints, credential schema, and setup guide.",
    schema: providerManifestSchema,
  },
];

await mkdir(OUTPUT_DIR, { recursive: true });

for (const entry of entries) {
  const jsonSchema = toJSONSchema(entry.schema, {
    unrepresentable: "any",
    target: "draft-2020-12",
  }) as Record<string, unknown>;

  delete jsonSchema.$schema;

  const final = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `${BASE_URL}/${VERSION_TAG}/${entry.filename}`,
    title: entry.title,
    description: entry.description,
    ...jsonSchema,
  };

  const filePath = resolve(OUTPUT_DIR, entry.filename);
  await writeFile(filePath, JSON.stringify(final, null, 2) + "\n");
  console.log(`  ✓ ${VERSION_TAG}/${entry.filename}`);
}

console.log(`\nGenerated ${entries.length} schemas in ${OUTPUT_DIR}`);
