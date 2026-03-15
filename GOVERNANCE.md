# AFPS Governance

## Current Stewardship Model

AFPS currently operates under a BDFL model.
The Appstrate maintainer acts as the editor and final decision-maker for the v1.x line while the specification is still stabilizing.

## Change Process

All normative changes SHOULD follow this sequence:

1. Open an issue describing the proposed change, rationale, and compatibility impact.
2. Leave the issue open for at least 7 days for public discussion unless the change is editorial only.
3. Submit a pull request linked to the issue.
4. Request review from the editor and any active contributors with relevant context.
5. Merge only after the compatibility impact and versioning consequences are explicit in the PR description.

Editorial clarifications that do not change interoperability MAY use a shorter path, but they SHOULD still be reviewed in public.

## Breaking Changes

Any incompatible change to manifest meaning, validation rules, archive layout, or field semantics MUST increment the major `schemaVersion`.
Non-breaking clarifications, additive fields, and interoperability notes SHOULD use a minor specification revision.

## Contributions

Contributors SHOULD:

- keep examples aligned with the normative text;
- cite the source implementation behavior when changing constraints;
- avoid adding fields that are not implementable in at least one open implementation;
- document migration guidance for any change that affects producers or consumers.

## Versioning Policy

- `spec.md` documents the normative AFPS behavior for the current draft.
- `CHANGELOG.md` records published revisions.
- Examples and schemas MUST track the same major specification version as the draft they accompany.

## Future Governance

If AFPS gains sustained adoption across multiple independent implementations, governance SHOULD evolve toward an open working group with shared maintainership and published decision rules.

