# Jira Integration

**Status**: Draft

## Description

A thin, typed client over the Jira REST API covering only what rivet needs: create an issue, fetch an issue, add a label, and (optionally) search. It deliberately exposes **no** mutation of workflow fields — the client has no method to set status, assignee, sprint, or description-after-create, so "no content sync" is enforced by the surface area, not by discipline.

**One transport, everywhere.** rivet talks to Jira via the **REST API over `fetch`** in both the dev box and GitHub Actions — never by shelling out to `jira-cli` (that would split auth and output-parsing into two code paths). The only thing that differs between environments is where the token comes from; the client code is identical.

## Capabilities

### P1 — Must Have

- `createIssue({ projectKey, type, summary }) → { key, url }` — the only write on the mint path; sets **summary once** and nothing else.
- `getIssue(key) → { key, type, summary, statusCategory } | null` — used by shell (read a story) and by verify's optional resolvability check.
- `addLabel(key, label)` — attach `rivet:<repo>/<id>` for reverse discovery; additive, never clears existing labels.
- Type mapping resolved from config: `story → <Story issue type>`, `task → <Task issue type>` (issue-type names differ per Jira project, e.g. `Technical task`).
- **Auth**: Jira Cloud API token via HTTP Basic — `Authorization: Basic base64(JIRA_EMAIL:JIRA_API_TOKEN)`. Credentials come from env only (`JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_BASE_URL`); the client never reads or writes them to disk.

### P2 — Should Have

- `search(jql) → issue[]` — backs `shell --jql` and coverage reports.
- Retry with backoff on 429/5xx; surface 4xx as typed errors (esp. 401/403 auth, 400 bad issue type).

### P3 — Nice to have

- A `--dry-run` transport that logs intended calls without hitting Jira, for previewing mint/shell locally.

## Out of Scope

- Any endpoint that mutates status, assignee, sprint, comments, resolution, or description.
- Deleting or transitioning issues.
- Remote/web links (deferred with the rest of the linking work).
- Shelling out to `jira-cli` or any external binary; OAuth 2.0 (3LO), which needs interactive consent and so can't run in CI.

## Technical Notes

- Fetch-only, no SDK, so `@rivet/core` stays runtime-agnostic (Bun, Node, Actions), mirroring `idx`'s `IdxClient`.
- Base URL and project key come from `rivet.toml`; token from env (see [006](./006-cli-and-config.md)).
- Reference instances: `https://jiradg.atlassian.net` (project keys like `OSA`, `PPM`).
- **Token source per environment** (client code unchanged):
  - **Dev box** — reuse the same `JIRA_API_TOKEN` that `jira-cli` already reads, plus `JIRA_EMAIL` / `JIRA_BASE_URL`, from a gitignored `.env` (Bun auto-loads it). No second credential, no dependency on the binary. Minted issues are authored as the developer.
  - **GitHub Actions** — same env vars from repo/org **secrets**, using a dedicated **Jira service account** token so created issues are attributed to the bot and its project permissions can be scoped tightly.
- Marketplace Actions (`atlassian/gajira-*`) wrap the same REST/token but would move mint logic into YAML; instead the Action calls `@rivet/core` so dev and CI share one path.

## File Structure

| File | Change |
| --- | --- |
| `packages/core/src/jira.ts` | `JiraClient` (create/get/addLabel/search) |
| `packages/core/src/types.ts` | Jira wire + mapping types |
