# Verify

**Status**: Draft

## Description

`verify` is the gate that makes the key-in-H1 hinge trustworthy. Because the key is the *only* source of truth, a bad hand-edit (a typo, a duplicate from a copy-pasted spec, or a silently changed key) would quietly break the link. `verify` catches all three, runs in seconds, and needs **no Jira access** for its core checks — so it can gate every PR cheaply.

The core checks are structural and local. An optional, slower tier confirms keys resolve against Jira.

## Capabilities

### P1 — Must Have

- **Format** — every stamped key matches `^[A-Z][A-Z0-9]+-\d+$`. Because a strict extractor would read a typo'd key as *untracked* (`key: null`) and never flag it, the check runs against the node's `keyCandidate` (the key-shaped H1 token, see [001](./001-spec-adapters.md)): a candidate that fails the pattern is a **malformed key**, not an untracked spec. Catches `OSA-3O303`-style typos (letter `O` for zero).
- **Uniqueness** — no two specs carry the same key (the copy-pasted-spec failure). This is the primary gate, mirroring `idx`'s duplicate-key check.
- **Immutability** — diff the changed specs against the base branch; if a spec that already had a key now shows a different key or none, **fail** with a message naming the file and both keys. This is a pure `git diff`, no Jira needed.
- Exit non-zero on any failure so it blocks the PR; print a human-readable report of each violation.

### P2 — Should Have

- **Escape hatch** — a PR label `allow-key-change` downgrades the immutability failure to a warning, so intentional re-pointing is possible but never silent.
- **Resolvability (opt-in)** — with Jira creds present, confirm each key is a live issue of the expected type; off by default (slower, needs secrets).

### P3 — Nice to have

- **Orphan notice (non-blocking)** — when a spec that had a key is *deleted*, emit a warning that its issue is now unlinked (never auto-close it).
- Filename-number collision warning (two specs claiming the same `NNN`).

## Out of Scope

- Fixing violations automatically (verify reports; humans or `mint`/`shell` fix).
- Anything requiring Jira for the core format/uniqueness/immutability checks.

## Technical Notes

- Immutability needs the base ref; in CI use the PR base SHA (`GITHUB_BASE_REF`), locally default to the merge-base with the default branch. The base-key lookup is a plain `git show <ref>:<path>` per changed spec — so it runs against **git**. In a `jj` repo this requires the colocated git backend (`jj git`); rivet does not shell out to `jj`. When no base ref is resolvable (no git, shallow clone without the base fetched), immutability is **skipped**, not failed — CI must fetch the base branch first (the `verify` Action does).
- Uniqueness and format are pure functions of the parsed nodes and need no git at all — only immutability touches the base ref.
- Runs as both a CLI command (`rivet verify`) and a GitHub Action (see [004](./004-mint.md) and [006](./006-cli-and-config.md)).

## File Structure

| File | Change |
| --- | --- |
| `packages/core/src/verify.ts` | Format + uniqueness + immutability checks |
| `apps/cli/src/commands/verify.ts` | CLI wiring + report formatting |
| `apps/actions/verify/action.yml` | PR gate Action (bundled) |
