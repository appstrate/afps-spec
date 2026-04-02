# AFPS JSON Schemas

Machine-readable representation of the AFPS specification. The specification text ([spec.md](../spec.md)) is the normative source.

## npm package

This directory is published as `@afps/schema` on npm. Implementations can import the Zod schemas and extend them:

```typescript
import { agentManifestSchema } from "@afps/schema";

const myAgentSchema = agentManifestSchema.extend({
  "x-custom-field": z.string().optional(),
});
```

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
└── package.json          ← @afps/schema
```

URLs follow the pattern `https://afps.appstrate.dev/schema/v1/<type>.schema.json`.

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
