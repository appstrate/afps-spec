# AFPS JSON Schemas

Machine-readable representation of the AFPS specification. The specification text ([spec.md](../spec.md)) is the normative source.

## npm package

This directory is published as `@afps-spec/schema` on npm. Implementations can import the Zod schemas and extend them:

```typescript
import { agentManifestSchema } from "@afps-spec/schema";

const myAgentSchema = agentManifestSchema.extend({
  "x-custom-field": z.string().optional(),
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
├── v1/                   ← AFPS v1.x schemas
│   ├── agent.schema.json
│   ├── skill.schema.json
│   ├── tool.schema.json
│   └── provider.schema.json
├── src/
│   ├── schemas.ts        ← Zod source (generates v1/)
│   ├── generate.ts       ← Generation script
│   └── index.ts          ← npm entry point
└── package.json          ← @afps-spec/schema
```

URLs follow the pattern `https://afps.appstrate.dev/schema/v1/<type>.schema.json`.

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
  "$schema": "https://afps.appstrate.dev/schema/v1/agent.schema.json",
  "schemaVersion": "1.0",
  "name": "@scope/my-agent",
  "version": "1.0.0",
  "type": "agent"
}
```

Implementations may extend these schemas with additional fields using the `x-` prefix convention (see spec §10).
