# Contributing to AFPS

Thank you for your interest in contributing to the Agent Format Packaging Standard specification. This document explains how to participate effectively.

## Reporting Issues

If you find an error, ambiguity, or gap in the specification, open an issue using the [spec change template](./.github/ISSUE_TEMPLATE/spec-change.yml). Please include:

- The section of the spec affected
- A clear description of the problem
- A suggested fix or improvement, if you have one

## Proposing Changes

All changes to the specification follow the process described in [GOVERNANCE.md](./GOVERNANCE.md):

1. Open an issue describing the proposed change, rationale, and compatibility impact.
2. Allow at least 7 days for public discussion (editorial-only changes may use a shorter path).
3. Submit a pull request linked to the issue.
4. Request review from the editor and any active contributors with relevant context.
5. Merge only after compatibility impact and versioning consequences are explicit in the PR description.

## Types of Contributions

### Editorial Fixes

Typos, grammar corrections, clarifications that do not change interoperability behavior. These may follow a shorter review path but SHOULD still be reviewed publicly.

### Additive Changes

New optional fields, additional examples, extended guidance. These SHOULD use a minor specification revision.

### Breaking Changes

Any change to manifest meaning, validation rules, archive layout, or field semantics MUST increment the major `schemaVersion`. Breaking changes require the full review period and explicit migration guidance.

## Development Setup

This is a specification repository. There is no build step or runtime to configure.

- **Specification text**: Edit `spec.md` directly.
- **Examples**: Edit or add files under `examples/`.
- **JSON Schemas**: The schema files in `schema/` are JSON Schema representations of the AFPS specification. The specification text (`spec.md`) is the normative source. Schema changes should be proposed alongside corresponding spec text changes.

## Conventions

- Write in English.
- Use [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119) keywords (MUST, SHOULD, MAY, etc.) consistently and only in their normative sense.
- Keep examples aligned with the normative spec text. If you change a constraint in `spec.md`, update all affected examples.
- Cite the source implementation behavior when changing constraints.
- Avoid adding fields that are not implementable in at least one open implementation.

## Developer Certificate of Origin

This project uses the [Developer Certificate of Origin (DCO)](https://developercertificate.org/). By submitting a contribution, you certify that you have the right to do so under the project's licenses.

All commits MUST include a `Signed-off-by` line matching your commit author:

```
Signed-off-by: Your Name <your.email@example.com>
```

You can add this automatically with `git commit -s`.

## Code of Conduct

All participants are expected to follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

All contributions fall under [CC-BY-4.0](./LICENSE).
