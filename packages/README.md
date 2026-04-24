# afps-spec packages

Reference TypeScript artefacts of the AFPS specification, published to
npm under the `@afps-spec` scope. This scope is reserved for physical
packages maintained by the spec repo — distinct from the `@afps/*`
scope used *inside bundle manifests* as spec-defined tool identities
(`@afps/log@1.0.0`, `@afps/memory@1.0.0`, …). The separation is
intentional: bundle authors reference `@afps/*` identities; runtime
implementors install `@afps-spec/*` packages.

| Package                                  | Scope                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------- |
| [`schema`](./schema)                     | Zod + JSON Schema definitions for AFPS manifests                      |
| [`types`](./types)                       | TS bindings for the AFPS 1.3+ protocol (Tool, RunEvent, refs)         |
| [`platform-tools`](./platform-tools)     | The 5 reserved platform tools (log / memory / output / report / state) |

All three publish to npm as `@afps-spec/<package>@<version>`. Release
is tag-driven: `afps-<package>@<version>` (e.g. `afps-types@1.0.0`,
`afps-platform-tools@1.0.0`, `afps-schema@1.3.2`) triggers the shared
[publish workflow](../.github/workflows/publish-package.yml).

## Installing for local development

afps-spec is a [bun workspace](https://bun.sh/docs/install/workspaces) —
one `bun install` at the repo root wires the three packages together.
Cross-package deps use the `workspace:*` protocol, which bun substitutes
with the concrete published version at `bun publish` time, so consumers
resolve a real semver range from npm.

```sh
bun install                                                 # from repo root
(cd packages/schema         && bun run typecheck && bun test)
(cd packages/types          && bun run typecheck && bun test)
(cd packages/platform-tools && bun run typecheck && bun test)
```

Or, across the whole workspace:

```sh
bun run typecheck   # bun --filter='*' run typecheck
bun run test:all    # bun --filter='*' run test
```

`test:all` is named to avoid colliding with bun's built-in `bun test`
subcommand, which only scans the current directory.
