# AFPS JSON Schemas

Machine-readable representation of the AFPS specification. The specification text ([spec.md](../../spec.md)) is the normative source.

## npm package

This directory is published as `@afps-spec/schema` on npm. Implementations can import the Zod schemas and extend them:

```typescript
import { agentManifestSchema } from "@afps-spec/schema";

const myAgentSchema = agentManifestSchema.extend({
  // Extensions go under `_meta`, keyed by a reverse-DNS namespace (spec §10).
  _meta: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
});
```

### JSON Schema generation

When generating JSON Schema files from AFPS Zod schemas, use the exported `afpsJsonSchemaOverride` to ensure `input.schema`, `output.schema`, and `config.schema` fields reference the official JSON Schema 2020-12 meta-schema:

```typescript
import { toJSONSchema } from "zod/v4/core";
import { agentManifestSchema, afpsJsonSchemaOverride } from "@afps-spec/schema";

const jsonSchema = toJSONSchema(agentManifestSchema, {
  target: "draft-2020-12",
  override: afpsJsonSchemaOverride,
});
```

Without the override, these fields serialize as opaque `{}` objects because the AJV meta-schema validation cannot be represented by Zod's `toJSONSchema()` alone.

## Versioned schemas

Schemas are organized by major version:

```
schema/
├── v2/                   ← AFPS v2.x schemas
│   ├── agent.schema.json
│   ├── skill.schema.json
│   ├── mcp-server.schema.json
│   └── integration.schema.json
├── src/
│   ├── schemas.ts        ← Zod source (generates v2/)
│   ├── generate.ts       ← Generation script
│   └── index.ts          ← npm entry point
└── package.json          ← @afps-spec/schema
```

URLs follow the pattern `https://afps.appstrate.dev/packages/schema/v2/<type>.schema.json`.

The `mcp-server.schema.json` validates the MCP Bundle (MCPB) manifest a built `mcp-server` package embeds; AFPS-specific data is carried under the MCPB `_meta` object.

## Schema validation

AFPS schema fields (`input.schema`, `output.schema`, `config.schema`) accept any valid JSON Schema 2020-12 document, with two AFPS-specific constraints:

- The root `type` MUST be `"object"`
- The root MUST have a `properties` key

Runtime validation is performed by AJV against the official JSON Schema 2020-12 meta-schema. The generated `.schema.json` files express this via `allOf` combining a `$ref` to the meta-schema with the AFPS constraints.

## Regenerating

After modifying the Zod source in `src/schemas.ts`:

```sh
cd schema && bun install && bun run generate
```

## Usage in manifests

Reference a schema using `$schema` for editor validation:

```json
{
  "$schema": "https://afps.appstrate.dev/packages/schema/v2/agent.schema.json",
  "schema_version": "2.0",
  "name": "@scope/my-agent",
  "version": "1.0.0",
  "type": "agent"
}
```

Implementations may extend these schemas with additional fields under the `_meta` reverse-DNS namespace convention (see spec §10).
