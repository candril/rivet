import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { getAdapter, loadConfig, shellFromIssue } from "@rivet/core/node"
import { fatal, flag, flagValue, jiraClient } from "../utils.ts"

/** Scaffold a stub spec from a Jira issue (single key or a `--jql` batch). */
export async function shell(root: string, keyArg?: string): Promise<void> {
  const config = await loadConfig(root)
  const adapter = getAdapter(config.adapter)
  const jira = jiraClient(config)

  const jql = flagValue("--jql")
  const keys = jql ? (await jira.search(jql)).map((i) => i.key) : keyArg ? [keyArg] : []
  if (keys.length === 0) fatal('usage: rivet shell <KEY> | --jql "<query>"')

  const dry = flag("--dry-run")
  let nodes = adapter.parse(root, config.specs)

  for (const key of keys) {
    const issue = await jira.getIssue(key)
    if (!issue) {
      console.error(`skip ${key}: not found`)
      continue
    }

    const result = shellFromIssue(issue, adapter, nodes, config, config.specs)
    if ("skipped" in result) {
      console.error(`skip ${key}: already at ${result.skipped.existingPath}`)
      continue
    }

    const abs = join(root, result.created.path)
    if (existsSync(abs)) {
      console.error(`skip ${key}: ${result.created.path} already exists on disk`)
      continue
    }
    if (dry) {
      console.log(`would write ${result.created.path}`)
      continue
    }

    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, result.created.contents)
    console.log(`created ${result.created.path}`)
    // Re-parse so a batch run numbers the next file past the one just written.
    nodes = adapter.parse(root, config.specs)
  }
}
