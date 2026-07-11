# Spec Adapters

**Status**: Draft

## Description

Different repos write specs differently — `lane` uses flat `NNN-slug.md` files with a bold `**Status**` field, while `Dg.GalaxusAbos` uses template-governed `ABO-FR-NNN_slug.md` files with a strict heading hierarchy. rivet absorbs that variation behind a small **adapter** interface so all downstream logic (verify, mint, shell) operates on one normalized shape.

An adapter does two things, mirror images of each other:

- **`parse()`** — walk the repo's spec files and emit `SpecNode`s (find keys, titles, kind, status).
- **`scaffold(issue)`** — given a Jira issue, produce a new template-valid spec file for this repo's format, pre-stamped with the key.

The normalized node is the contract every other spec depends on:

```ts
interface SpecNode {
  repoRelPath: string;          // "specs/008-sub-tasks.md"
  humanId: string | null;       // "008" | "ABO-FR-008" | null
  key: string | null;           // "OSA-30303" if a *valid* key is stamped in the H1, else null
  keyCandidate: string | null;  // first key-shaped H1 token even if invalid — lets verify flag a typo
  title: string;                // H1 with key + humanId stripped
  kind: "story" | "task";       // functional → story, non-functional → task
  status: string;               // the "**Status**" gate value, normalized
  h1Raw: string;                // raw H1 line, for the immutability diff
}
```

## Capabilities

### P1 — Must Have

- Define the `SpecAdapter` interface: `parse(root): SpecNode[]` and `scaffold(issue, ctx): { path, contents }`.
- Extract the Jira key from the **H1 only**, as the first key-shaped token matched with `-`-aware word boundaries — `(?<![A-Za-z0-9-])([A-Z][A-Z0-9]+-\d+)(?![A-Za-z0-9-])` — *not* anchored to the `# `. Anchoring breaks the humanId-preserving `dg` form (`# ABO-FR-008 · OSA-30303 …`, P2 below), where the key does not follow `# ` directly; the boundaries also stop the trailing `FR-008` of a compound humanId from being mis-read as a key. A spec with no valid key token parses to `key: null`.
- Separately record `keyCandidate`: the first key-*shaped* token in the H1 (after an optional humanId) even when it fails validation, so [verify](./003-verify.md) can report a typo (`OSA-3O303`) instead of silently treating the spec as untracked.
- Classify each spec as `story` (functional) or `task` (non-functional) using a per-adapter rule (filename prefix and/or subfolder).
- Ship two built-in adapters: **`lane`** (`specs/*.md`, `specs/nfr/*.md`) and **`dg`** (`ABO-FR-*` / `ABO-NFR-*`).
- `scaffold()` computes the next filename in the repo's numbering convention and emits a skeleton with `# <KEY> <title>` and `**Status**: Draft`.

### P2 — Should Have

- `dg` scaffold output must satisfy the repo's structure linter (all mandatory H4 sections present as `TODO`).
- Preserve an existing `humanId` in the H1 when stamping a key (e.g. `# ABO-FR-008 · OSA-30303: …`), so cross-references that use the semantic ID keep resolving.

### P3 — Nice to have

- A generic "single H1 + `**Status**`" fallback adapter for repos that match neither built-in format.

## Out of Scope

- Parsing sub-requirement structure into separate nodes (v1 is one spec file = one node; `1 FR = 1 Story`, `1 NFR = 1 Task`).
- Reading or emitting spec body content beyond the H1 and `**Status**` line.

## Technical Notes

- Adapters live behind config (see [006](./006-cli-and-config.md)); `rivet.toml` selects which adapter a repo uses and where its specs live.
- Keep `parse()` filesystem-only and `scaffold()` pure (return contents, let the caller write) so both are trivially testable.
- `scaffold()` needs to place and number the new file; pass it the already-parsed `SpecNode[]` (via `ScaffoldContext`) rather than letting it re-read the disk, so numbering stays a pure function of the parsed nodes.

## Open Questions

- The `dg` skeleton's mandatory H4 set is currently a **placeholder** (`Context` / `Requirement` / `Acceptance Criteria` / `Out of Scope`). It must be reconciled against the real `Dg.GalaxusAbos` structure linter before `dg` scaffold output is trusted — an early spike against that repo is the natural first validation.

## File Structure

| File | Change |
| --- | --- |
| `packages/core/src/types.ts` | `SpecNode`, `SpecAdapter` interfaces |
| `packages/core/src/adapters/index.ts` | Adapter registry + selection by config |
| `packages/core/src/adapters/lane.ts` | `lane` format adapter |
| `packages/core/src/adapters/dg.ts` | `Dg.GalaxusAbos` template adapter |
| `packages/core/src/keys.ts` | Key regex + extract/strip helpers |
