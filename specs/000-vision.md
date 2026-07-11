# Vision

**Status**: Draft

## Description

`rivet` keeps requirement specs in a repo and Jira issues in correspondence, cheaply and in both directions. The **only** connective tissue is the Jira key stamped into a spec's H1:

```markdown
# OSA-30303 Sub-Tasks
```

That key is the single source of truth for "this spec is tracked by that issue." There is no lockfile, no database, and no resolver service — the repo describes itself, and Jira is queried directly when needed. A rivet is a permanent joint between two pieces; the stamped key is exactly that between a spec and its issue.

Two directions, one shared invariant:

- **Mint** (spec → Jira): a new requirement lands in a repo → create a Jira issue → stamp its key into the H1.
- **Shell** (Jira → spec): a story is drafted in Jira first → scaffold a stubbed spec file already stamped with the key.

Both converge on the same rule — *every tracked spec carries a unique, immutable Jira key in its H1* — and a **verify** gate enforces it so the two directions never fight.

Crucially, rivet **never syncs content**. It sets an issue's summary once at creation and touches nothing after. Descriptions, acceptance criteria, workflow status, assignees, and comments are owned by whoever owns them (the spec for prose, Jira for workflow) and are never overwritten.

## Capabilities

### P1 — Must Have

- Treat the Jira key in a spec's H1 as the authoritative link: **present → tracked, absent → untracked**.
- Support both directions: **mint** (spec → Jira) and **shell** (Jira → spec).
- Enforce the key invariant with a **verify** gate: valid format, globally unique, immutable once set.
- Pluggable **per-repo adapters** so different spec formats (e.g. `lane`, `Dg.GalaxusAbos`) are supported without forking the tool.
- No content sync: summary is set at create time only; no field is overwritten afterwards.
- Map spec kind to issue type: functional requirement → **Story**, non-functional → **Task**.

### P2 — Should Have

- Batch shell from a JQL query (scaffold many stories at once).
- Optional `rivet:<repo>/<id>` label on minted/shelled issues for reverse discovery from Jira.
- Optional resolvability check in verify (the key points at a live issue of the expected type).

### P3 — Nice to have

- Coverage report: which `approved`/`Ready` specs have no issue, which issues have no spec.
- Fully automated reverse path: a Jira-side webhook/label that opens a PR with the shell.

## Out of Scope

- Syncing spec content (description, acceptance criteria) into or out of Jira.
- Maintained, always-resolvable clickable links between the two sides (that needs a resolver service — deferred; "click twice" is acceptable for v1).
- Managing epics or epic membership.
- Deleting or closing Jira issues (removals are surfaced, never destructive).

## Technical Notes

- Stack mirrors `idx`: Bun + TypeScript workspace monorepo, a shared `@rivet/core` package holding types + the Jira client + adapters + the verify/mint/shell logic, a compiled CLI, and GitHub Actions.
- Secrets (Jira token) via env vars; no credentials committed.
- The `idx` `scaffold`/`verify` verbs and its duplicate-key CI gate are the direct prior art.

## File Structure

| File | Change |
| --- | --- |
| `packages/core/src/types.ts` | Normalized `SpecNode`, config, and Jira wire types |
| `packages/core/src/index.ts` | Browser-safe barrel for `@rivet/core` |
| `apps/cli/src/main.ts` | CLI entry dispatching `verify` / `mint` / `shell` |
| `README.md` | Product overview |

## Open Questions

- ~~Should the repo folder be renamed from `spec-to-jira` to `rivet`?~~ **Resolved**: the repo is `rivet`, and the scaffolded workspace (`@rivet/core`, `@rivet/cli`, `@rivet/actions`, `rivet.toml`) commits to that name.
