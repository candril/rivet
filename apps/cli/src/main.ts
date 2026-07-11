#!/usr/bin/env bun
import { verify } from "./commands/verify.ts"
import { mint } from "./commands/mint.ts"
import { shell } from "./commands/shell.ts"
import { positional } from "./utils.ts"

const [, , cmd, ...rest] = process.argv

if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
  printUsage()
  process.exit(cmd ? 0 : 1)
}

switch (cmd) {
  case "verify":
    await verify(positional(rest))
    break
  case "mint":
    await mint(positional(rest))
    break
  case "shell":
    await shell(".", rest.find((a) => !a.startsWith("-")))
    break
  default:
    console.error(`unknown command: ${cmd}`)
    printUsage()
    process.exit(1)
}

function printUsage(): void {
  console.error(`rivet — keep specs and Jira issues in lockstep via the key in each spec's H1

Usage:
  rivet verify [DIR]         Check key format, uniqueness, immutability (CI gate)
  rivet mint [DIR]           Create Jira issues for keyless Ready specs, stamp keys
  rivet shell <KEY>          Scaffold a stub spec from a Jira issue
  rivet shell --jql "<q>"    Scaffold specs for every matching issue
  rivet help                 Show this help

Flags:
  --dry-run                  Preview writes/creates without performing them
  --allow-key-change         Downgrade an immutability failure to a warning (verify)

Environment:
  JIRA_EMAIL JIRA_API_TOKEN JIRA_BASE_URL   Jira Cloud Basic-auth credentials`)
}
