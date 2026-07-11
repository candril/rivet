# Shell

**Status**: Draft

## Description

Shell is the Jira → spec direction: a story is drafted in Jira first, and a developer wants a stubbed spec in the repo for it — fast. `rivet shell OSA-30303` fetches the issue, picks the next filename in the repo's convention, and writes a template-valid skeleton already stamped with the key. The developer then fills in the body and commits.

It's the mirror of [mint](./004-mint.md) and reuses the same adapter (`scaffold()`), so a shelled spec is born already satisfying the key invariant — which means mint will see it and skip, and verify will pass. The two directions never produce a double issue.

## Capabilities

### P1 — Must Have

- `rivet shell <KEY>` — fetch the issue, and via the repo's adapter emit a new spec file: next filename, `# <KEY> <summary>`, `**Status**: Draft`, skeleton sections.
- Map issue type back to spec kind (`Story → functional`, `Task → non-functional`) so the file lands in the right place/prefix. The mapping is exact-match against `rivet.toml`'s `[types]` names; an issue type matching **neither** (e.g. `Bug`, `Epic`) falls back to `story` (functional) so shell never hard-fails on an unmapped type — override with `--kind` (P3).
- Skip (with a clear message pointing at the existing file) if any spec already carries that key.
- Print the created path.

### P2 — Should Have

- `rivet shell --jql "<query>"` — batch: scaffold one file per matching issue, skipping keys that already exist.
- Optionally apply the `rivet:<repo>/<id>` label to the source issue so the reverse direction leaves the same breadcrumb as mint.

### P3 — Nice to have

- `--dir` / `--kind` overrides for repos where type→location can't be inferred.

## Out of Scope

- Populating the spec body from Jira content (skeleton only — no content sync).
- A fully automated Jira-side trigger that opens the PR (deferred; the CLI is the "easy" path).

## Technical Notes

- `scaffold()` is pure (returns `{ path, contents }`); the command writes and, for `--jql`, iterates.
- Next-number selection reads the repo's spec dir; concurrent scaffolds may pick the same number — resolved as an ordinary merge conflict / caught by verify's collision warning.
- `dg` skeletons must satisfy the structure linter (mandatory H4s present as `TODO`).

## File Structure

| File | Change |
| --- | --- |
| `packages/core/src/shell.ts` | Fetch issue → `scaffold()` → write |
| `apps/cli/src/commands/shell.ts` | `rivet shell <key> \| --jql` |
