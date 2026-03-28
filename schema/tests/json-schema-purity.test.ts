/**
 * Validates that AFPS schemas produce 100% standard JSON Schema 2020-12.
 *
 * These tests ensure no non-standard keywords leak into the `schema` object
 * of input/output/config sections. Non-schema metadata (fileConstraints,
 * uiHints, propertyOrder) must live at the wrapper level only.
 */

import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { flowManifestSchema } from "../src/index.ts";

// --- Standard JSON Schema 2020-12 keywords (property-level) ---

const STANDARD_PROPERTY_KEYWORDS = new Set([
  // Core
  "type",
  "enum",
  "const",
  "default",
  // String
  "minLength",
  "maxLength",
  "pattern",
  "format",
  "contentMediaType",
  "contentEncoding",
  // Numeric
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  // Array
  "items",
  "maxItems",
  "minItems",
  "uniqueItems",
  "prefixItems",
  "contains",
  // Object
  "properties",
  "required",
  "additionalProperties",
  "patternProperties",
  "propertyNames",
  "minProperties",
  "maxProperties",
  // Composition
  "allOf",
  "anyOf",
  "oneOf",
  "not",
  "if",
  "then",
  "else",
  // Meta
  "$id",
  "$ref",
  "$schema",
  "$defs",
  "$anchor",
  "$comment",
  "title",
  "description",
  "examples",
  "deprecated",
  "readOnly",
  "writeOnly",
]);

const BANNED_KEYWORDS_IN_SCHEMA = [
  "placeholder",
  "accept",
  "maxSize",
  "multiple",
  "maxFiles",
  "propertyOrder",
];

// --- Helpers ---

function collectPropertyKeywords(obj: Record<string, unknown>, path = ""): string[] {
  const violations: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (!STANDARD_PROPERTY_KEYWORDS.has(key)) {
      violations.push(`${path}.${key}`);
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      // Recurse into items (but not into the full tree — only schema-level)
      if (key === "items") {
        violations.push(...collectPropertyKeywords(value as Record<string, unknown>, `${path}.items`));
      }
    }
  }
  return violations;
}

function assertNoKeywordInObject(obj: unknown, keyword: string, path: string): string[] {
  const violations: string[] = [];
  if (obj && typeof obj === "object") {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (key === keyword) violations.push(`${path}.${key}`);
      if (value && typeof value === "object") {
        violations.push(...assertNoKeywordInObject(value, keyword, `${path}.${key}`));
      }
    }
  }
  return violations;
}

// --- Tests ---

describe("JSON Schema purity — generated schemas", () => {
  const flowSchemaPath = join(import.meta.dir, "../v1/flow.schema.json");
  const flowSchema = JSON.parse(readFileSync(flowSchemaPath, "utf-8"));

  test("flow.schema.json uses JSON Schema 2020-12 dialect", () => {
    expect(flowSchema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
  });

  test("schema property definitions contain only standard JSON Schema keywords", () => {
    // Navigate to the property schema within the input wrapper
    const propDef =
      flowSchema.properties?.input?.properties?.schema?.properties?.properties
        ?.additionalProperties?.properties;
    expect(propDef).toBeDefined();

    // Each key in the property definition should be a standard JSON Schema keyword
    const keys = Object.keys(propDef);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(STANDARD_PROPERTY_KEYWORDS.has(key)).toBe(true);
    }
  });

  test("type enum does not include 'file'", () => {
    const typeEnum =
      flowSchema.properties?.input?.properties?.schema?.properties?.properties
        ?.additionalProperties?.properties?.type?.enum;
    expect(typeEnum).toBeDefined();
    expect(typeEnum).not.toContain("file");
    expect(typeEnum).toContain("string");
    expect(typeEnum).toContain("array");
  });

  test("wrapper-level keys include fileConstraints, uiHints, propertyOrder", () => {
    const wrapperKeys = Object.keys(flowSchema.properties?.input?.properties ?? {});
    expect(wrapperKeys).toContain("schema");
    expect(wrapperKeys).toContain("fileConstraints");
    expect(wrapperKeys).toContain("uiHints");
    expect(wrapperKeys).toContain("propertyOrder");
  });

  for (const keyword of BANNED_KEYWORDS_IN_SCHEMA) {
    test(`schema object does not contain '${keyword}'`, () => {
      // Check the schema sub-object only (not the wrapper)
      const schemaObj = flowSchema.properties?.input?.properties?.schema;
      const violations = assertNoKeywordInObject(schemaObj, keyword, "schema");
      expect(violations).toEqual([]);
    });
  }
});

describe("JSON Schema purity — manifest validation", () => {
  test("manifest with file field using standard JSON Schema is accepted", () => {
    const manifest = {
      name: "@test/flow",
      version: "1.0.0",
      type: "flow",
      schemaVersion: "1.0",
      displayName: "Test",
      author: "test",
      input: {
        schema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search" },
            doc: {
              type: "string",
              format: "uri",
              contentMediaType: "application/octet-stream",
              description: "Single file",
            },
            docs: {
              type: "array",
              items: {
                type: "string",
                format: "uri",
                contentMediaType: "application/pdf",
              },
              maxItems: 3,
              description: "Multiple PDFs",
            },
          },
          required: ["query"],
        },
        fileConstraints: {
          doc: { accept: ".pdf", maxSize: 5242880 },
          docs: { accept: ".pdf", maxSize: 10485760 },
        },
        uiHints: { query: { placeholder: "Enter search..." } },
        propertyOrder: ["query", "doc", "docs"],
      },
    };
    const result = flowManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  test("manifest with old type:'file' is rejected", () => {
    const manifest = {
      name: "@test/flow",
      version: "1.0.0",
      type: "flow",
      schemaVersion: "1.0",
      displayName: "Test",
      author: "test",
      input: {
        schema: {
          type: "object",
          properties: {
            doc: { type: "file", description: "Upload" },
          },
        },
      },
    };
    const result = flowManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  test("schema properties in parsed manifest contain no non-standard keywords", () => {
    const manifest = {
      name: "@test/flow",
      version: "1.0.0",
      type: "flow",
      schemaVersion: "1.0",
      displayName: "Test",
      author: "test",
      input: {
        schema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name" },
            file: {
              type: "array",
              items: { type: "string", format: "uri", contentMediaType: "application/octet-stream" },
              maxItems: 5,
            },
          },
        },
        fileConstraints: { file: { accept: ".csv", maxSize: 1048576 } },
        uiHints: { name: { placeholder: "John" } },
        propertyOrder: ["name", "file"],
      },
    };
    const result = flowManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const parsed = result.data as Record<string, unknown>;
    const input = parsed.input as Record<string, unknown>;
    const schema = input.schema as Record<string, unknown>;
    const properties = schema.properties as Record<string, Record<string, unknown>>;

    for (const [key, prop] of Object.entries(properties)) {
      const violations = collectPropertyKeywords(prop, key);
      expect(violations).toEqual([]);
    }
  });
});
