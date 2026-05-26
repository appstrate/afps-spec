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

const MAJOR = 2;
const VERSION_TAG = `v${MAJOR}`;
const BASE_URL = "https://afps.appstrate.dev/packages/schema";
const OUTPUT_DIR = resolve(dirname(import.meta.filename!), "..", VERSION_TAG);

const isCheck = process.argv.includes("--check");

/**
 * Cross-field MUST rules that the Zod `.superRefine` enforces but
 * `toJSONSchema` cannot express. We inject the JSON Schema 2020-12
 * equivalents (`if`/`then`/`anyOf`/`oneOf`/`minProperties`) so that
 * JSON-only validators reject the same shapes the Zod runtime rejects.
 *
 * Keep these in lockstep with the `.superRefine` logic in `schemas.ts`
 * (§7.3, §7.5, §7.6, §7.7, §3.4).
 */
function applyCrossFieldRules(filename: string, schema: Record<string, any>): void {
  if (filename === "integration.schema.json") {
    // §3.5 — at least one auth method.
    schema.properties.auths.minProperties = 1;

    const method = schema.properties.auths.additionalProperties as Record<string, any>;
    method.allOf = [
      // §7.3 — oauth2 requires issuer (discovery) OR both endpoints.
      {
        if: { properties: { type: { const: "oauth2" } }, required: ["type"] },
        then: {
          anyOf: [
            { required: ["issuer"] },
            { required: ["authorization_endpoint", "token_endpoint"] },
          ],
        },
      },
      // §7.5 — credentials.schema required for api_key/basic/mtls/custom.
      {
        if: { properties: { type: { enum: ["api_key", "basic", "mtls", "custom"] } }, required: ["type"] },
        then: { required: ["credentials"], properties: { credentials: { required: ["schema"] } } },
      },
      // §7.7 — connect only valid for custom; exactly one of login/tool.
      {
        if: { required: ["connect"] },
        then: {
          properties: {
            type: { const: "custom" },
            connect: {
              oneOf: [
                { required: ["login"], not: { required: ["tool"] } },
                { required: ["tool"], not: { required: ["login"] } },
              ],
            },
          },
          required: ["type"],
        },
      },
    ];

    // §7.6 — ≥1 delivery channel; http exclusive of env/files.
    const delivery = method.properties.delivery as Record<string, any>;
    delivery.allOf = [
      { anyOf: [{ required: ["http"] }, { required: ["env"] }, { required: ["files"] }] },
      {
        if: { required: ["http"] },
        then: { not: { anyOf: [{ required: ["env"] }, { required: ["files"] }] } },
      },
    ];
  }

  if (filename === "mcp-server.schema.json") {
    // §3.4 — server.type "uv" requires manifest_version "0.4".
    schema.allOf = [
      {
        if: {
          properties: { server: { properties: { type: { const: "uv" } }, required: ["type"] } },
          required: ["server"],
        },
        then: { properties: { manifest_version: { const: "0.4" } } },
      },
    ];
  }
}

const {
  agentManifestSchema,
  skillManifestSchema,
  mcpServerManifestSchema,
  integrationManifestSchema,
} = createSchemas(MAJOR);

const entries = [
  {
    filename: "agent.schema.json",
    title: "AFPS Agent Manifest",
    description:
      "Manifest schema for AFPS 2.0 agent packages. " +
      "An agent declares dependencies, input/output/config schemas, a timeout hint, and per-integration configuration.",
    schema: agentManifestSchema,
  },
  {
    filename: "skill.schema.json",
    title: "AFPS Skill Manifest",
    description:
      "Manifest schema for AFPS 2.0 skill packages. " +
      "A skill is a superset of the Agent Skills format with package identity and versioning.",
    schema: skillManifestSchema,
  },
  {
    filename: "mcp-server.schema.json",
    title: "AFPS MCP-Server Manifest",
    description:
      "Manifest schema for AFPS 2.0 mcp-server packages. " +
      "The manifest is AFPS-native at the root (type, schema_version, scoped name, dependencies) and adopts " +
      "the MCPB field vocabulary (manifest_version, server, tools, user_config) verbatim; it is not a strict MCPB manifest.",
    schema: mcpServerManifestSchema,
  },
  {
    filename: "integration.schema.json",
    title: "AFPS Integration Manifest",
    description:
      "Manifest schema for AFPS 2.0 integration packages. " +
      "An integration declares a capability source, one or more authentication methods, and credential delivery.",
    schema: integrationManifestSchema,
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

  applyCrossFieldRules(entry.filename, jsonSchema);

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
