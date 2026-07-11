import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { getAdapter, loadConfig, mintCandidates, mintOne } from "@rivet/core/node"
import { flag, jiraClient } from "../utils.ts"

/** Local, manual mint: create issues for keyless Ready specs and stamp their H1s. */
export async function mint(root: string): Promise<void> {
  const config = await loadConfig(root)
  const adapter = getAdapter(config.adapter)
  const candidates = mintCandidates(adapter.parse(root, config.specs), config)

  if (candidates.length === 0) {
    console.log("Nothing to mint (no keyless Ready/approved specs).")
    return
  }

  console.log(`${candidates.length} spec(s) to mint:`)
  for (const c of candidates) console.log(`  ${c.node.repoRelPath} → ${c.type} in ${c.project}`)

  if (flag("--dry-run")) return

  const jira = jiraClient(config)
  for (const c of candidates) {
    const minted = await mintOne(jira, c.node, config)
    const abs = join(root, c.node.repoRelPath)
    const original = readFileSync(abs, "utf8")
    writeFileSync(abs, original.replace(c.node.h1Raw, minted.newH1))
    console.log(`minted ${minted.key} → ${c.node.repoRelPath} (${minted.url})`)
  }
}
