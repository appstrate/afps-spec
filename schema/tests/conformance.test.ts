/**
 * AFPS Conformance Test Suite
 *
 * Validates that:
 * 1. All spec examples pass schema validation
 * 2. Invalid manifests are correctly rejected
 * 3. Spec constraints (§2–§7) are enforced
 * 4. Extension fields (x-*) are preserved
 */

import { describe, test, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import {
  agentManifestSchema,
  skillManifestSchema,
  toolManifestSchema,
  providerManifestSchema,
} from "../src/schemas.ts";

const ROOT = resolve(dirname(import.meta.filename!), "../..");

async function loadExample(path: string): Promise<unknown> {
  const content = await readFile(resolve(ROOT, path), "utf-8");
  return JSON.parse(content);
}

function expectValid(schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) {
  const result = schema.safeParse(value);
  expect(result.success).toBe(true);
}

function expectInvalid(schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) {
  const result = schema.safeParse(value);
  expect(result.success).toBe(false);
}

// ─────────────────────────────────────────────
// §1 — Valid examples (all spec examples MUST pass)
// ─────────────────────────────────────────────

describe("valid examples", () => {
  test("agent-minimal", async () => {
    expectValid(agentManifestSchema, await loadExample("examples/agent-minimal/manifest.json"));
  });

  test("agent-full", async () => {
    expectValid(agentManifestSchema, await loadExample("examples/agent-full/manifest.json"));
  });

  test("skill-minimal", async () => {
    expectValid(skillManifestSchema, await loadExample("examples/skill-minimal/manifest.json"));
  });

  test("tool-minimal", async () => {
    expectValid(toolManifestSchema, await loadExample("examples/tool-minimal/manifest.json"));
  });

  test("provider-oauth2", async () => {
    expectValid(providerManifestSchema, await loadExample("examples/provider-oauth2/manifest.json"));
  });

  test("provider-apikey", async () => {
    expectValid(providerManifestSchema, await loadExample("examples/provider-apikey/manifest.json"));
  });

  test("provider-basic", async () => {
    expectValid(providerManifestSchema, await loadExample("examples/provider-basic/manifest.json"));
  });
});

// ─────────────────────────────────────────────
// §2.2 — Package identity (scoped names)
// ─────────────────────────────────────────────

describe("scoped name validation (§2.2)", () => {
  const base = { version: "1.0.0", type: "skill" };

  test("valid scoped names", () => {
    expectValid(skillManifestSchema, { ...base, name: "@scope/name" });
    expectValid(skillManifestSchema, { ...base, name: "@my-org/my-skill" });
    expectValid(skillManifestSchema, { ...base, name: "@a/b" });
    expectValid(skillManifestSchema, { ...base, name: "@abc123/def456" });
  });

  test("rejects unscoped names", () => {
    expectInvalid(skillManifestSchema, { ...base, name: "my-skill" });
    expectInvalid(skillManifestSchema, { ...base, name: "name" });
  });

  test("rejects uppercase", () => {
    expectInvalid(skillManifestSchema, { ...base, name: "@Scope/name" });
    expectInvalid(skillManifestSchema, { ...base, name: "@scope/Name" });
  });

  test("rejects underscores", () => {
    expectInvalid(skillManifestSchema, { ...base, name: "@scope/my_skill" });
  });

  test("rejects leading/trailing hyphens", () => {
    expectInvalid(skillManifestSchema, { ...base, name: "@-scope/name" });
    expectInvalid(skillManifestSchema, { ...base, name: "@scope/-name" });
    expectInvalid(skillManifestSchema, { ...base, name: "@scope/name-" });
  });

  test("rejects empty scope or name", () => {
    expectInvalid(skillManifestSchema, { ...base, name: "@/name" });
    expectInvalid(skillManifestSchema, { ...base, name: "@scope/" });
  });
});

// ─────────────────────────────────────────────
// §2.3 — Versioning (semver)
// ─────────────────────────────────────────────

describe("versioning (§2.3)", () => {
  const base = { name: "@test/pkg", type: "skill" };

  test("valid semver versions", () => {
    expectValid(skillManifestSchema, { ...base, version: "1.0.0" });
    expectValid(skillManifestSchema, { ...base, version: "0.1.0" });
    expectValid(skillManifestSchema, { ...base, version: "10.20.30" });
  });

  test("rejects invalid semver versions", () => {
    expectInvalid(skillManifestSchema, { ...base, version: "not-a-version" });
    expectInvalid(skillManifestSchema, { ...base, version: "1.0" });
    expectInvalid(skillManifestSchema, { ...base, version: "1" });
  });

  test("rejects empty version", () => {
    expectInvalid(skillManifestSchema, { ...base, version: "" });
  });

  test("rejects missing version", () => {
    expectInvalid(skillManifestSchema, { ...base });
  });
});

// ─────────────────────────────────────────────
// §2.1 — Package types
// ─────────────────────────────────────────────

describe("package types (§2.1)", () => {
  test("agent type requires agent-specific fields", () => {
    // Minimal agent — needs schemaVersion, displayName, author
    expectValid(agentManifestSchema, {
      name: "@test/agent",
      version: "1.0.0",
      type: "agent",
      schemaVersion: "1.0",
      displayName: "Test Agent",
      author: "test",
    });

    // Missing author
    expectInvalid(agentManifestSchema, {
      name: "@test/agent",
      version: "1.0.0",
      type: "agent",
      schemaVersion: "1.0",
      displayName: "Test Agent",
    });

    // Missing displayName
    expectInvalid(agentManifestSchema, {
      name: "@test/agent",
      version: "1.0.0",
      type: "agent",
      schemaVersion: "1.0",
      author: "test",
    });
  });

  test("agent author must be non-empty", () => {
    expectInvalid(agentManifestSchema, {
      name: "@test/agent",
      version: "1.0.0",
      type: "agent",
      schemaVersion: "1.0",
      displayName: "Test",
      author: "",
    });
  });

  test("agent displayName must be non-empty", () => {
    expectInvalid(agentManifestSchema, {
      name: "@test/agent",
      version: "1.0.0",
      type: "agent",
      schemaVersion: "1.0",
      displayName: "",
      author: "test",
    });
  });

  test("tool type requires entrypoint and tool interface", () => {
    expectValid(toolManifestSchema, {
      name: "@test/tool",
      version: "1.0.0",
      type: "tool",
      entrypoint: "tool.ts",
      tool: { name: "my_tool", description: "Does stuff", inputSchema: {} },
    });

    // Missing entrypoint
    expectInvalid(toolManifestSchema, {
      name: "@test/tool",
      version: "1.0.0",
      type: "tool",
      tool: { name: "my_tool", description: "Does stuff", inputSchema: {} },
    });

    // Missing tool interface
    expectInvalid(toolManifestSchema, {
      name: "@test/tool",
      version: "1.0.0",
      type: "tool",
      entrypoint: "tool.ts",
    });
  });

  test("provider type requires definition with authMode", () => {
    expectValid(providerManifestSchema, {
      name: "@test/provider",
      version: "1.0.0",
      type: "provider",
      definition: { authMode: "api_key", credentials: { schema: {} } },
    });

    // Missing definition
    expectInvalid(providerManifestSchema, {
      name: "@test/provider",
      version: "1.0.0",
      type: "provider",
    });
  });

  test("skill type — minimal manifest is valid", () => {
    expectValid(skillManifestSchema, {
      name: "@test/skill",
      version: "1.0.0",
      type: "skill",
    });
  });
});

// ─────────────────────────────────────────────
// §3.1 — Common manifest fields
// ─────────────────────────────────────────────

describe("common manifest fields (§3.1)", () => {
  test("missing name is rejected", () => {
    expectInvalid(skillManifestSchema, { version: "1.0.0", type: "skill" });
  });

  test("missing version is rejected", () => {
    expectInvalid(skillManifestSchema, { name: "@test/pkg", type: "skill" });
  });

  test("missing type is rejected", () => {
    expectInvalid(skillManifestSchema, { name: "@test/pkg", version: "1.0.0" });
  });

  test("optional metadata fields accepted", () => {
    expectValid(skillManifestSchema, {
      name: "@test/pkg",
      version: "1.0.0",
      type: "skill",
      displayName: "My Skill",
      description: "A useful skill",
      keywords: ["ai", "tool"],
      license: "MIT",
      repository: "https://github.com/test/repo",
    });
  });
});

// ─────────────────────────────────────────────
// §4 — Dependencies
// ─────────────────────────────────────────────

describe("dependencies (§4)", () => {
  const base = {
    name: "@test/agent",
    version: "1.0.0",
    type: "agent",
    schemaVersion: "1.0",
    displayName: "Test",
    author: "test",
  };

  test("valid dependency declarations", () => {
    expectValid(agentManifestSchema, {
      ...base,
      dependencies: {
        skills: { "@acme/rewrite": "^1.0.0" },
        tools: { "@acme/fetch": "~2.1.0" },
        providers: { "@acme/gmail": ">=1.0.0" },
      },
    });
  });

  test("empty dependencies is valid", () => {
    expectValid(agentManifestSchema, { ...base, dependencies: {} });
  });

  test("partial dependency sections", () => {
    expectValid(agentManifestSchema, {
      ...base,
      dependencies: { providers: { "@acme/gmail": "^1.0.0" } },
    });
  });

  test("wildcard version range", () => {
    expectValid(agentManifestSchema, {
      ...base,
      dependencies: { skills: { "@acme/skill": "*" } },
    });
  });

  test("dependency keys must be scoped names", () => {
    expectInvalid(agentManifestSchema, {
      ...base,
      dependencies: { skills: { "bad-name": "^1.0.0" } },
    });
  });

  test("dependency version must be a valid semver range", () => {
    expectInvalid(agentManifestSchema, {
      ...base,
      dependencies: { skills: { "@acme/skill": "not-a-range!!!" } },
    });
  });
});

// ─────────────────────────────────────────────
// §5 — Schema system (input/output/config)
// ─────────────────────────────────────────────

describe("schema system (§5)", () => {
  const base = {
    name: "@test/agent",
    version: "1.0.0",
    type: "agent",
    schemaVersion: "1.0",
    displayName: "Test",
    author: "test",
  };

  test("valid input schema with all field types", () => {
    expectValid(agentManifestSchema, {
      ...base,
      input: {
        schema: {
          type: "object",
          properties: {
            text: { type: "string", description: "A text field" },
            count: { type: "number", description: "A number", default: 10 },
            enabled: { type: "boolean", description: "Toggle" },
            tags: { type: "array", description: "Tags list" },
            meta: { type: "object", description: "Metadata" },
            doc: {
              type: "array",
              description: "Upload",
              items: { type: "string", format: "uri", contentMediaType: "application/octet-stream" },
              maxItems: 5,
            },
          },
          required: ["text"],
        },
        fileConstraints: {
          doc: { accept: ".pdf,.docx", maxSize: 10485760 },
        },
        uiHints: {
          text: { placeholder: "Enter..." },
        },
        propertyOrder: ["text", "count", "enabled", "tags", "meta", "doc"],
      },
    });
  });

  test("schema container MUST be type: object", () => {
    expectInvalid(agentManifestSchema, {
      ...base,
      input: {
        schema: {
          type: "array",
          properties: {},
        },
      },
    });
  });

  test("schema properties without type are valid JSON Schema (inferred)", () => {
    expectValid(agentManifestSchema, {
      ...base,
      input: {
        schema: {
          type: "object",
          properties: {
            field: { description: "no explicit type — valid per JSON Schema 2020-12" },
          },
        },
      },
    });
  });

  test("integer type is valid JSON Schema", () => {
    expectValid(agentManifestSchema, {
      ...base,
      input: {
        schema: {
          type: "object",
          properties: {
            field: { type: "integer" },
          },
        },
      },
    });
  });

  test("advanced JSON Schema features are accepted", () => {
    expectValid(agentManifestSchema, {
      ...base,
      input: {
        schema: {
          type: "object",
          properties: {
            value: {
              oneOf: [
                { type: "string" },
                { type: "number" },
              ],
            },
            nested: {
              type: "object",
              properties: {
                deep: { type: "string", minLength: 1 },
              },
              required: ["deep"],
            },
          },
        },
      },
    });
  });

  test("output and config schemas work identically", () => {
    const schemaBlock = {
      schema: {
        type: "object",
        properties: { result: { type: "string" } },
      },
    };
    expectValid(agentManifestSchema, { ...base, output: schemaBlock });
    expectValid(agentManifestSchema, { ...base, config: schemaBlock });
  });

  test("input without schema child is rejected", () => {
    expectInvalid(agentManifestSchema, { ...base, input: {} });
  });

  test("output without schema child is rejected", () => {
    expectInvalid(agentManifestSchema, { ...base, output: {} });
  });

  test("config without schema child is rejected", () => {
    expectInvalid(agentManifestSchema, { ...base, config: {} });
  });

  test("format field is preserved on schema properties", () => {
    const manifest = {
      ...base,
      input: {
        schema: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
          },
        },
      },
    };
    const result = agentManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
    if (result.success) {
      const input = (result.data as Record<string, unknown>).input as Record<string, unknown>;
      const schema = input.schema as Record<string, unknown>;
      const props = schema.properties as Record<string, Record<string, unknown>>;
      expect(props.email.format).toBe("email");
    }
  });

  test("uiHints placeholder is preserved on wrapper", () => {
    const manifest = {
      ...base,
      input: {
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
        },
        uiHints: {
          name: { placeholder: "Enter your name..." },
        },
      },
    };
    const result = agentManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
    if (result.success) {
      const input = (result.data as Record<string, unknown>).input as Record<string, unknown>;
      const hints = input.uiHints as Record<string, Record<string, unknown>>;
      expect(hints.name.placeholder).toBe("Enter your name...");
    }
  });

  test("propertyOrder is preserved on wrapper", () => {
    const manifest = {
      ...base,
      input: {
        schema: {
          type: "object",
          properties: {
            b: { type: "string" },
            a: { type: "number" },
          },
        },
        propertyOrder: ["a", "b"],
      },
    };
    const result = agentManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
    if (result.success) {
      const input = (result.data as Record<string, unknown>).input as Record<string, unknown>;
      expect(input.propertyOrder).toEqual(["a", "b"]);
    }
  });

  test("enum field support", () => {
    expectValid(agentManifestSchema, {
      ...base,
      input: {
        schema: {
          type: "object",
          properties: {
            priority: { type: "string", enum: ["low", "normal", "high"], default: "normal" },
          },
        },
      },
    });
  });
});

// ─────────────────────────────────────────────
// §6 — Execution model
// ─────────────────────────────────────────────

describe("execution model (§6)", () => {
  const base = {
    name: "@test/agent",
    version: "1.0.0",
    type: "agent",
    schemaVersion: "1.0",
    displayName: "Test",
    author: "test",
  };

  test("timeout is optional", () => {
    expectValid(agentManifestSchema, { ...base });
    expectValid(agentManifestSchema, { ...base, timeout: 300 });
  });

  test("timeout must be positive", () => {
    expectInvalid(agentManifestSchema, { ...base, timeout: 0 });
    expectInvalid(agentManifestSchema, { ...base, timeout: -1 });
  });
});

// ─────────────────────────────────────────────
// §7 — Provider authentication
// ─────────────────────────────────────────────

describe("provider authentication (§7)", () => {
  const base = { name: "@test/provider", version: "1.0.0", type: "provider" };

  test("all five auth modes accepted", () => {
    expectValid(providerManifestSchema, {
      ...base,
      definition: {
        authMode: "oauth2",
        oauth2: {
          authorizationUrl: "https://example.com/auth",
          tokenUrl: "https://example.com/token",
        },
      },
    });
    expectValid(providerManifestSchema, {
      ...base,
      definition: {
        authMode: "oauth1",
        oauth1: {
          requestTokenUrl: "https://example.com/request",
          accessTokenUrl: "https://example.com/access",
        },
      },
    });
    expectValid(providerManifestSchema, {
      ...base,
      definition: { authMode: "api_key", credentials: { schema: {} } },
    });
    expectValid(providerManifestSchema, {
      ...base,
      definition: { authMode: "basic", credentials: { schema: {} } },
    });
    expectValid(providerManifestSchema, {
      ...base,
      definition: { authMode: "custom", credentials: { schema: {} } },
    });
  });

  test("invalid auth mode rejected", () => {
    expectInvalid(providerManifestSchema, {
      ...base,
      definition: { authMode: "invalid" },
    });
  });

  // §7 — Conditional MUST rules per authMode
  test("oauth2 — missing authorizationUrl rejected", () => {
    expectInvalid(providerManifestSchema, {
      ...base,
      definition: { authMode: "oauth2", oauth2: { tokenUrl: "https://example.com/token" } },
    });
    expectInvalid(providerManifestSchema, {
      ...base,
      definition: { authMode: "oauth2" },
    });
  });

  test("oauth2 — missing tokenUrl rejected", () => {
    expectInvalid(providerManifestSchema, {
      ...base,
      definition: { authMode: "oauth2", oauth2: { authorizationUrl: "https://example.com/auth" } },
    });
  });

  test("oauth1 — missing requestTokenUrl rejected", () => {
    expectInvalid(providerManifestSchema, {
      ...base,
      definition: { authMode: "oauth1", oauth1: { accessTokenUrl: "https://example.com/access" } },
    });
    expectInvalid(providerManifestSchema, {
      ...base,
      definition: { authMode: "oauth1" },
    });
  });

  test("oauth1 — missing accessTokenUrl rejected", () => {
    expectInvalid(providerManifestSchema, {
      ...base,
      definition: { authMode: "oauth1", oauth1: { requestTokenUrl: "https://example.com/request" } },
    });
  });

  test("api_key — missing credentials rejected", () => {
    expectInvalid(providerManifestSchema, {
      ...base,
      definition: { authMode: "api_key" },
    });
  });

  test("basic — missing credentials rejected", () => {
    expectInvalid(providerManifestSchema, {
      ...base,
      definition: { authMode: "basic" },
    });
  });

  test("custom — missing credentials rejected", () => {
    expectInvalid(providerManifestSchema, {
      ...base,
      definition: { authMode: "custom" },
    });
  });

  // §7 — Optional provider definition fields

  test("oauth2 optional fields accepted", () => {
    expectValid(providerManifestSchema, {
      ...base,
      definition: {
        authMode: "oauth2",
        oauth2: {
          authorizationUrl: "https://example.com/auth",
          tokenUrl: "https://example.com/token",
          refreshUrl: "https://example.com/refresh",
          defaultScopes: ["read", "write"],
          scopeSeparator: " ",
          pkceEnabled: true,
          tokenAuthMethod: "client_secret_post",
          authorizationParams: { prompt: "consent" },
          tokenParams: { grant_type: "authorization_code" },
        },
        credentialHeaderName: "Authorization",
        credentialHeaderPrefix: "Bearer ",
        authorizedUris: ["https://api.example.com/*"],
        allowAllUris: false,
        availableScopes: [{ value: "read", label: "Read access" }],
      },
    });
  });

  // §7.2 — tokenAuthMethod and tokenContentType
  test("oauth2 tokenAuthMethod accepts both standard values", () => {
    for (const method of ["client_secret_post", "client_secret_basic"] as const) {
      expectValid(providerManifestSchema, {
        ...base,
        definition: {
          authMode: "oauth2",
          oauth2: {
            authorizationUrl: "https://example.com/auth",
            tokenUrl: "https://example.com/token",
            tokenAuthMethod: method,
          },
        },
      });
    }
  });

  test("oauth2 tokenAuthMethod rejects unknown values", () => {
    expectInvalid(providerManifestSchema, {
      ...base,
      definition: {
        authMode: "oauth2",
        oauth2: {
          authorizationUrl: "https://example.com/auth",
          tokenUrl: "https://example.com/token",
          tokenAuthMethod: "client_secret_jwt",
        },
      },
    });
  });

  test("oauth2 tokenContentType accepts both standard values", () => {
    for (const ct of ["application/x-www-form-urlencoded", "application/json"] as const) {
      expectValid(providerManifestSchema, {
        ...base,
        definition: {
          authMode: "oauth2",
          oauth2: {
            authorizationUrl: "https://example.com/auth",
            tokenUrl: "https://example.com/token",
            tokenContentType: ct,
          },
        },
      });
    }
  });

  test("oauth2 tokenContentType rejects unknown values", () => {
    expectInvalid(providerManifestSchema, {
      ...base,
      definition: {
        authMode: "oauth2",
        oauth2: {
          authorizationUrl: "https://example.com/auth",
          tokenUrl: "https://example.com/token",
          tokenContentType: "text/plain",
        },
      },
    });
  });

  // §7.4 — credentialEncoding
  test("api_key credentialEncoding accepts both standard values", () => {
    for (const enc of ["basic_api_key_x", "basic_email_token"] as const) {
      expectValid(providerManifestSchema, {
        ...base,
        definition: {
          authMode: "api_key",
          credentials: { schema: {} },
          credentialEncoding: enc,
        },
      });
    }
  });

  test("api_key credentialEncoding rejects unknown values", () => {
    expectInvalid(providerManifestSchema, {
      ...base,
      definition: {
        authMode: "api_key",
        credentials: { schema: {} },
        credentialEncoding: "bearer_token",
      },
    });
  });

  // §7.4 — credentialTransform (generic replacement for credentialEncoding)
  test("api_key credentialTransform accepts base64 with multi-field template", () => {
    expectValid(providerManifestSchema, {
      ...base,
      definition: {
        authMode: "api_key",
        credentials: { schema: {} },
        credentialTransform: {
          template: "{{email}}/token:{{api_key}}",
          encoding: "base64",
        },
      },
    });
  });

  test("api_key credentialTransform accepts base64 with literal suffix", () => {
    expectValid(providerManifestSchema, {
      ...base,
      definition: {
        authMode: "api_key",
        credentials: { schema: {} },
        credentialTransform: {
          template: "{{api_key}}:X",
          encoding: "base64",
        },
      },
    });
  });

  test("api_key credentialTransform rejects unknown encoding", () => {
    expectInvalid(providerManifestSchema, {
      ...base,
      definition: {
        authMode: "api_key",
        credentials: { schema: {} },
        credentialTransform: {
          template: "{{api_key}}",
          encoding: "rot13",
        },
      },
    });
  });

  test("api_key credentialTransform rejects empty template", () => {
    expectInvalid(providerManifestSchema, {
      ...base,
      definition: {
        authMode: "api_key",
        credentials: { schema: {} },
        credentialTransform: {
          template: "",
          encoding: "base64",
        },
      },
    });
  });

  test("api_key credentialTransform rejects missing encoding", () => {
    expectInvalid(providerManifestSchema, {
      ...base,
      definition: {
        authMode: "api_key",
        credentials: { schema: {} },
        credentialTransform: {
          template: "{{api_key}}",
        },
      },
    });
  });

  test("oauth1 optional fields accepted", () => {
    expectValid(providerManifestSchema, {
      ...base,
      definition: {
        authMode: "oauth1",
        oauth1: {
          requestTokenUrl: "https://example.com/request",
          accessTokenUrl: "https://example.com/access",
          authorizationUrl: "https://example.com/authorize",
          defaultScopes: [],
        },
        credentialHeaderName: "Authorization",
      },
    });
  });

  test("api_key with full credential config accepted", () => {
    expectValid(providerManifestSchema, {
      ...base,
      definition: {
        authMode: "api_key",
        credentials: {
          schema: {
            type: "object",
            properties: { apiKey: { type: "string" } },
          },
          fieldName: "api_key",
        },
        credentialHeaderName: "X-API-Key",
        credentialHeaderPrefix: "",
        authorizedUris: ["https://api.example.com/v1/*"],
        allowAllUris: false,
      },
    });
  });

  test("allowAllUris: true accepted", () => {
    expectValid(providerManifestSchema, {
      ...base,
      definition: {
        authMode: "api_key",
        credentials: { schema: {} },
        allowAllUris: true,
      },
    });
  });

  test("provider presentation fields", () => {
    expectValid(providerManifestSchema, {
      ...base,
      displayName: "My Provider",
      description: "A provider",
      iconUrl: "https://example.com/icon.svg",
      categories: ["email", "productivity"],
      docsUrl: "https://example.com/docs",
      definition: { authMode: "api_key", credentials: { schema: {} } },
    });
  });

  test("setupGuide with steps", () => {
    expectValid(providerManifestSchema, {
      ...base,
      definition: { authMode: "api_key", credentials: { schema: {} } },
      setupGuide: {
        callbackUrlHint: "Set redirect URI to: {{callbackUrl}}",
        steps: [
          { label: "Create app", url: "https://example.com/apps" },
          { label: "Copy credentials" },
        ],
      },
    });
  });
});

// ─────────────────────────────────────────────
// §4.4 — Provider configuration in agents
// ─────────────────────────────────────────────

describe("providersConfiguration (§4.4)", () => {
  const base = {
    name: "@test/agent",
    version: "1.0.0",
    type: "agent",
    schemaVersion: "1.0",
    displayName: "Test",
    author: "test",
  };

  test("valid provider configuration", () => {
    expectValid(agentManifestSchema, {
      ...base,
      dependencies: { providers: { "@acme/gmail": "^1.0.0" } },
      providersConfiguration: {
        "@acme/gmail": {
          scopes: ["gmail.readonly", "gmail.send"],
        },
      },
    });
  });

});

// ─────────────────────────────────────────────
// §10 — Extensibility (x- prefix preservation)
// ─────────────────────────────────────────────

describe("extensibility (§10)", () => {
  test("unknown top-level fields are preserved (looseObject)", () => {
    const manifest = {
      name: "@test/skill",
      version: "1.0.0",
      type: "skill",
      "x-custom": "preserved",
      "x-vendor-field": { nested: true },
    };
    const result = skillManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>)["x-custom"]).toBe("preserved");
      expect((result.data as Record<string, unknown>)["x-vendor-field"]).toEqual({ nested: true });
    }
  });

  test("unknown fields in dependencies are preserved", () => {
    const manifest = {
      name: "@test/agent",
      version: "1.0.0",
      type: "agent",
      schemaVersion: "1.0",
      displayName: "Test",
      author: "test",
      dependencies: {
        providers: { "@acme/gmail": "^1.0.0" },
        "x-custom-deps": "preserved",
      },
    };
    const result = agentManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
    if (result.success) {
      const deps = (result.data as Record<string, unknown>).dependencies as Record<string, unknown>;
      expect(deps["x-custom-deps"]).toBe("preserved");
    }
  });
});

// ─────────────────────────────────────────────
// §3.2 — Agent schemaVersion format
// ─────────────────────────────────────────────

describe("schemaVersion (§3.2)", () => {
  const base = {
    name: "@test/agent",
    version: "1.0.0",
    type: "agent",
    displayName: "Test",
    author: "test",
  };

  test("valid schemaVersion formats", () => {
    expectValid(agentManifestSchema, { ...base, schemaVersion: "1.0" });
    expectValid(agentManifestSchema, { ...base, schemaVersion: "1.1" });
    expectValid(agentManifestSchema, { ...base, schemaVersion: "1.99" });
  });

  test("schemaVersion is required for agents", () => {
    expectInvalid(agentManifestSchema, { ...base });
  });

  test("schemaVersion is optional for skills", () => {
    expectValid(skillManifestSchema, { name: "@test/skill", version: "1.0.0", type: "skill" });
    expectValid(skillManifestSchema, {
      name: "@test/skill",
      version: "1.0.0",
      type: "skill",
      schemaVersion: "1.0",
    });
  });

  test("schemaVersion is optional for tools", () => {
    const toolBase = {
      name: "@test/tool",
      version: "1.0.0",
      type: "tool",
      entrypoint: "tool.ts",
      tool: { name: "t", description: "D", inputSchema: {} },
    };
    expectValid(toolManifestSchema, toolBase);
    expectValid(toolManifestSchema, { ...toolBase, schemaVersion: "1.0" });
  });

  test("schemaVersion is optional for providers", () => {
    const provBase = {
      name: "@test/prov",
      version: "1.0.0",
      type: "provider",
      definition: { authMode: "api_key", credentials: { schema: {} } },
    };
    expectValid(providerManifestSchema, provBase);
    expectValid(providerManifestSchema, { ...provBase, schemaVersion: "1.0" });
  });

  test("schemaVersion format enforced on non-agent types", () => {
    expectInvalid(skillManifestSchema, {
      name: "@test/skill",
      version: "1.0.0",
      type: "skill",
      schemaVersion: "1.0.0",
    });
    expectInvalid(skillManifestSchema, {
      name: "@test/skill",
      version: "1.0.0",
      type: "skill",
      schemaVersion: "2.0",
    });
  });

  test("invalid schemaVersion formats rejected", () => {
    expectInvalid(agentManifestSchema, { ...base, schemaVersion: "2.0" }); // wrong major
    expectInvalid(agentManifestSchema, { ...base, schemaVersion: "1.0.0" }); // has patch
    expectInvalid(agentManifestSchema, { ...base, schemaVersion: "v1.0" }); // has prefix
  });
});

// ─────────────────────────────────────────────
// §3.4 — Tool interface
// ─────────────────────────────────────────────

describe("tool interface (§3.4)", () => {
  const base = { name: "@test/tool", version: "1.0.0", type: "tool", entrypoint: "tool.ts" };

  test("tool name must be non-empty", () => {
    expectInvalid(toolManifestSchema, {
      ...base,
      tool: { name: "", description: "Desc", inputSchema: {} },
    });
  });

  test("tool description must be non-empty", () => {
    expectInvalid(toolManifestSchema, {
      ...base,
      tool: { name: "my_tool", description: "", inputSchema: {} },
    });
  });

  test("tool entrypoint must be non-empty", () => {
    expectInvalid(toolManifestSchema, {
      ...base,
      entrypoint: "",
      tool: { name: "my_tool", description: "Desc", inputSchema: {} },
    });
  });
});
