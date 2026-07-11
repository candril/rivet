# rivet

Keep requirement specs in a repo and Jira issues in correspondence — cheaply and
in both directions. The **only** connective tissue is the Jira key stamped into a
spec's H1:

```markdown
# OSA-30303 Sub-Tasks
```

Key present → tracked. Key absent → untracked. There is no lockfile, no database,
and no resolver service: the repo describes itself, and Jira is queried directly.

This is a **Bun + TypeScript monorepo**, mirroring [`idx`](../idx).

## Packages

| Package | Path | What it is |
|---|---|---|
| `@rivet/core` | `packages/core` | Types, key helpers, the Jira client, spec adapters, and the verify/mint/shell logic. Browser-safe barrel at `.`; filesystem pieces at `./node`. |
| `@rivet/cli` | `apps/cli` | Developer CLI: `rivet verify \| mint \| shell`. Compiles to `bin/rivet`. |
| `@rivet/actions` | `apps/actions` | GitHub Actions: the `verify` PR gate and the label-gated `mint`. |

## The two directions, one invariant

- **Mint** (spec → Jira): a keyless spec lands → create an issue → stamp its key into the H1.
- **Shell** (Jira → spec): a story exists in Jira → scaffold a stubbed spec already stamped with the key.

Both converge on the same rule — *every tracked spec carries a unique, immutable
Jira key in its H1* — and **verify** enforces it so the two directions never fight.
rivet never syncs content: it sets an issue's summary once at creation and touches
nothing after.

## Quick start

```bash
bun install
bun run --filter '*' typecheck

# Verify this repo's own specs (rivet dogfoods itself)
bun run apps/cli/src/main.ts verify .

# Scaffold a spec from a Jira issue (needs JIRA_* env — see .env.example)
bun run apps/cli/src/main.ts shell OSA-30303
```

Common tasks are wrapped in the [`justfile`](justfile) (`just check`, `just verify`,
`just build`). Per-repo configuration lives in [`rivet.toml`](rivet.toml); secrets
come from the environment only (`.env` locally, Actions secrets in CI).

## Design

The requirements live in [`specs/`](specs/) and are managed through rivet itself.
Start with [`specs/000-vision.md`](specs/000-vision.md).
