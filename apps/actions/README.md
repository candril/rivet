# @rivet/actions

Two GitHub Actions, each a **self-contained `action.yml`** — the TypeScript in
`_src/` is bundled (imports from `@rivet/core` inlined) into an inline
`actions/github-script` block by [`build.ts`](build.ts), so consumers need no
install or build step.

| Action | What it does |
|---|---|
| [`verify`](verify/action.yml) | Gate PRs on key format, uniqueness, and immutability. Reads base-branch H1s via the API, so it works on shallow clones. No secrets. |
| [`mint`](mint/action.yml) | On a PR, post a preview of keyless `Ready` specs; on the **`create-jira`** label, create Jira issues, stamp the keys back into the PR branch, and remove the label. |

## Usage

### verify

```yaml
permissions:
  contents: read
  pull-requests: read
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: candril/rivet/apps/actions/verify@main
```

### mint

```yaml
permissions:
  contents: write        # push the stamp commit
  pull-requests: write   # preview comment + label removal
jobs:
  mint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: candril/rivet/apps/actions/mint@main
        with:
          jira-email: ${{ secrets.JIRA_EMAIL }}
          jira-api-token: ${{ secrets.JIRA_API_TOKEN }}
```

Trigger `mint` on `pull_request` (types include `labeled`) so adding
`create-jira` fires the mint path. Fork PRs can't be stamped (no write access to
the head branch); the action fails with a clear message.

## Editing

`_src/*.ts` are the sources — the `action.yml`s are **generated**. After changing
a source (or anything in `@rivet/core` they import):

```bash
bun run --filter '@rivet/actions' build   # regenerate the YAMLs
```

`bun run --filter '@rivet/actions' check` rebuilds and `git diff --exit-code`s the
YAMLs — wire it into CI so a stale bundle fails the build.
