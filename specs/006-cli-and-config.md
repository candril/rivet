# CLI & Config

**Status**: Draft

## Description

The command surface and per-repo configuration that ties the pieces together. rivet runs as a compiled CLI (local dev + the reverse `shell` path) and as GitHub Actions (the `verify` gate and label-gated `mint`). A single `rivet.toml` per target repo declares its format and Jira coordinates; secrets come from the environment only.

## Capabilities

### P1 — Must Have

- **Verbs**: `verify` ([003](./003-verify.md)), `mint` ([004](./004-mint.md)), `shell` ([005](./005-shell.md)), plus `help`.
- **`rivet.toml`** in the target repo, e.g.:

  ```toml
  adapter    = "lane"                      # or "dg"
  specs      = ["specs", "specs/nfr"]
  project    = "OSA"
  base_url    = "https://jiradg.atlassian.net"

  [types]
  story = "Story"
  task  = "Technical task"
  ```

- **Secrets via env**: `JIRA_EMAIL` + `JIRA_API_TOKEN` + `JIRA_BASE_URL` (Basic auth to Jira Cloud REST); never read from or written to disk. Same three vars in both environments — only their source differs (`.env` locally, Actions secrets in CI; see [002](./002-jira-integration.md)).
- Config loading resolves the adapter, spec dirs, project key, and type mapping consumed by every verb.

### P2 — Should Have

- Global flags: `--dry-run` (preview writes/creates), `--config <path>`, `--json` (machine-readable output).
- Compile the CLI to a standalone binary (`bin/rivet`), mirroring `idx`.

### P3 — Nice to have

- `rivet status <KEY|specPath>` — resolve a spec ↔ issue either way from the repo alone.
- A `rivet coverage` report (specs without issues / issues without specs).

## Out of Scope

- A hosted service or persistent store (rivet is stateless; the repo + Jira are the state).
- Interactive prompts in CI paths (Actions are non-interactive).

## Technical Notes

- Stack mirrors `idx`: Bun + TypeScript workspace, `just` task runner, `tsc --noEmit` as the quality gate, GitHub Actions bundled via `Bun.build` into self-contained `action.yml`s.
- No secrets in `rivet.toml`; it is safe to commit. Actions receive `JIRA_EMAIL` / `JIRA_API_TOKEN` / `JIRA_BASE_URL` via repo secrets (a dedicated Jira **service account** token), plus the built-in `GITHUB_TOKEN` for branch pushes.
- Locally, the same three vars can be reused from an existing `jira-cli` setup via a gitignored `.env` — rivet still talks REST, not the binary.
- Provide a `.env.example` documenting the three `JIRA_*` vars, mirroring `idx`.

## File Structure

| File | Change |
| --- | --- |
| `packages/core/src/config.ts` | Load + validate `rivet.toml` |
| `apps/cli/src/main.ts` | Verb dispatch (`verify` / `mint` / `shell` / `help`) |
| `apps/cli/src/commands/*.ts` | One module per verb |
| `justfile` | `check`, `build`, `build-actions` |
| `rivet.toml` | Example config (this repo, dogfooded) |
| `.env.example` | Documents `JIRA_EMAIL` / `JIRA_API_TOKEN` / `JIRA_BASE_URL` |
