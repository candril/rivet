# Mint

**Status**: Draft

## Description

Mint is the spec → Jira direction: a new requirement lands in a repo with no key, and rivet creates a Jira issue for it and stamps the key into the H1. It is **human-gated**: nothing is created automatically. A bot previews what it *would* create, and a maintainer opts in by adding a label to the PR. The gate is also what keeps abandoned PRs from leaving orphan tickets — no approval, no issue.

Flow:

1. On PR events, rivet parses the changed specs and finds those with `key: null` whose `**Status**` passes the gate.
2. It posts (or updates) a **preview comment** listing what it would create — one row per keyless spec, with proposed type and project.
3. A maintainer adds the **`create-jira`** label to approve.
4. The label event triggers minting: for each keyless spec, `createIssue`, then rewrite the H1 to `# <KEY> <title>`, commit to the PR branch, and remove the label.

## Capabilities

### P1 — Must Have

- Detect keyless specs in a PR and post a preview comment (type + project per spec).
- On the `create-jira` label, create one issue per keyless spec (`story → Story`, `task → Task`) and **stamp the returned key into the H1**. The issue **summary** is the spec's normalized `title` (H1 with humanId/key stripped), not the raw H1 line — so a `dg` humanId prefix never leaks into the Jira summary.
- Commit the stamped H1(s) back to the PR branch as a bot, then remove the label so it doesn't re-fire.
- Idempotency: only specs with `key: null` are ever minted — a re-run or a spec already carrying a key is skipped.
- Respect the gate: only `Ready`/`approved` specs are offered; `Draft` is skipped.

### P2 — Should Have

- Apply the `rivet:<repo>/<id>` label to each created issue.
- Handle a `descoped` spec by flagging it in the comment (do not mint), never by closing anything.

### P3 — Nice to have

- Group the preview by kind and show the target epic if the repo encodes one (informational only; epics are otherwise out of scope).

## Out of Scope

- Auto-minting without the label gate.
- Fork-PR minting where the bot can't push to the head branch — require in-repo branches for the stamp commit (surface a clear message otherwise).
- Setting any issue field beyond summary + label.

## Technical Notes

- The stamp commit will retrigger CI — usually desired, so the reviewed state is the stamped state; skip only if it causes loops.
- Uses `GITHUB_TOKEN` for same-repo branch pushes; fork PRs lack write access to the head branch.
- Core logic (detect → create → stamp) lives in `@rivet/core` so the Action is a thin wrapper.

## File Structure

| File | Change |
| --- | --- |
| `packages/core/src/mint.ts` | Detect keyless → create → stamp H1 |
| `apps/actions/mint/action.yml` | Label-gated mint Action (bundled) |
| `apps/cli/src/commands/mint.ts` | Local `rivet mint` for manual runs |
