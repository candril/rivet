# rivet — Specs

`rivet` keeps requirement specs in a repo and Jira issues in lockstep using **one hinge: the Jira key stamped into each spec's H1**. No content sync, no central service — the key in the file *is* the link.

## Format

Each spec is Markdown with a bold `**Status**` field and prioritized capabilities:

- `**Status**: Draft | Ready | In Progress | Done`
- `## Description`
- `## Capabilities` → `### P1 — Must Have`, `### P2 — Should Have`, `### P3 — Nice to have`
- `## Out of Scope`
- `## Technical Notes`
- `## File Structure` — `| File | Change |`
- Optional `## Open Questions`

## Lifecycle

`Draft → Ready → In Progress → Done`. Specs are numbered sequentially; highest number = newest.

## Index

| #   | Name                                          | Status | Description                                                        |
| --- | --------------------------------------------- | ------ | ------------------------------------------------------------------ |
| 000 | [Vision](./000-vision.md)                     | Draft  | What rivet is, the key-in-H1 hinge, and what it deliberately isn't |
| 001 | [Spec Adapters](./001-spec-adapters.md)       | Draft  | Per-repo `parse()` + `scaffold()` adapters and the normalized node |
| 002 | [Jira Integration](./002-jira-integration.md) | Draft  | Jira client: create, fetch, label; type mapping; no workflow writes |
| 003 | [Verify](./003-verify.md)                     | Draft  | CI gate — key format, uniqueness, and immutability                  |
| 004 | [Mint](./004-mint.md)                         | Draft  | spec → Jira: label-triggered ticket creation + H1 stamp             |
| 005 | [Shell](./005-shell.md)                       | Draft  | Jira → spec: scaffold a stubbed spec from a story                   |
| 006 | [CLI & Config](./006-cli-and-config.md)       | Draft  | Command surface, `rivet.toml`, and secrets                          |

## Status Summary

- **Draft**: 7
- **Ready**: 0
- **In Progress**: 0
- **Done**: 0
