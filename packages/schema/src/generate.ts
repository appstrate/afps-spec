// SPDX-License-Identifier: CC-BY-4.0
// Copyright (c) 2026 Appstrate contributors

/**
 * Generate AFPS JSON Schema files from the Zod definitions.
 *
 * Change MAJOR to generate schemas for a different spec version.
 *
 * Usage:
 *   bun src/generate.ts          Generate/update JSON schemas
 *   bun src/generate.ts --check  Verify committed schemas match Zod source (CI)
 */

import { toJSONSchema } from "zod/v4/core";
import { resolve, dirname } from "node:path";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { createSchemas, afpsJsonSchemaOverride } from "./schemas.ts";

const MAJOR = 1;
const VERSION_TAG = `v${MAJOR}`;
const BASE_URL = "https://afps.appstrate.dev/packages/schema";
const OUTPUT_DIR = resolve(dirname(import.meta.filename!), "..", VERSION_TAG);

const isCheck = process.argv.includes("--check");

const { agentManifestSchema, skillManifestSchema, toolManifestSchema, providerManifestSchema } =
  createSchemas(MAJOR);

const entries = [
  {
    filename: "agent.schema.json",
    title: "AFPS Agent Manifest",
    description:
      "Manifest schema for AFPS agent packages. " +
      "An agent declares dependencies, input/output/config schemas, a timeout hint, and provider configuration.",
    schema: agentManifestSchema,
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

if (!isCheck) {
  await mkdir(OUTPUT_DIR, { recursive: true });
}

let mismatch = false;

for (const entry of entries) {
  const jsonSchema = toJSONSchema(entry.schema, {
    unrepresentable: "any",
    target: "draft-2020-12",
    override: afpsJsonSchemaOverride,
  }) as Record<string, unknown>;

  delete jsonSchema.$schema;

  const final = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `${BASE_URL}/${VERSION_TAG}/${entry.filename}`,
    $comment: "SPDX-License-Identifier: CC-BY-4.0 — Copyright (c) 2026 Appstrate contributors",
    title: entry.title,
    description: entry.description,
    ...jsonSchema,
  };

  const generated = JSON.stringify(final, null, 2) + "\n";
  const filePath = resolve(OUTPUT_DIR, entry.filename);

  if (isCheck) {
    let committed: string;
    try {
      committed = await readFile(filePath, "utf-8");
    } catch {
      console.error(`  ✗ ${VERSION_TAG}/${entry.filename} — file missing`);
      mismatch = true;
      continue;
    }
    if (committed !== generated) {
      console.error(`  ✗ ${VERSION_TAG}/${entry.filename} — out of date`);
      mismatch = true;
    } else {
      console.log(`  ✓ ${VERSION_TAG}/${entry.filename}`);
    }
  } else {
    await writeFile(filePath, generated);
    console.log(`  ✓ ${VERSION_TAG}/${entry.filename}`);
  }
}

if (isCheck) {
  if (mismatch) {
    console.error("\nJSON schemas are out of date. Run `bun run generate` to update.");
    process.exit(1);
  }
  console.log("\nAll JSON schemas are up to date.");
} else {
  console.log(`\nGenerated ${entries.length} schemas in ${OUTPUT_DIR}`);
}
