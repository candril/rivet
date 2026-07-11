import { spawnSync } from "node:child_process"
import { firstKey } from "@rivet/core"
import { getAdapter, loadConfig, verifySpecs, type BaseKeys } from "@rivet/core/node"
import type { SpecNode } from "@rivet/core"
import { flag } from "../utils.ts"

/** CI gate: key format, uniqueness, and immutability against the base branch. */
export async function verify(root: string): Promise<void> {
  const config = await loadConfig(root)
  const adapter = getAdapter(config.adapter)
  const nodes = adapter.parse(root, config.specs)

  const allowKeyChange = flag("--allow-key-change") || hasLabel("allow-key-change")
  const violations = verifySpecs(nodes, baseKeyMap(root, nodes), { allowKeyChange })

  for (const v of violations) console.error(`${v.level.toUpperCase()}: ${v.file}: ${v.message}`)

  if (violations.some((v) => v.level === "error")) process.exit(1)
  const tracked = nodes.filter((n) => n.key).length
  console.log(`OK: ${nodes.length} specs (${tracked} tracked), no violations`)
}

/** PR labels the mint/verify Actions surface via env, comma-separated. */
function hasLabel(label: string): boolean {
  return (process.env.RIVET_PR_LABELS ?? "")
    .split(",")
    .map((s) => s.trim())
    .includes(label)
}

function git(args: string[]): string | null {
  const r = spawnSync("git", args, { encoding: "utf8" })
  return r.status === 0 ? r.stdout : null
}

/** The base ref for the immutability diff: PR base in CI, else merge-base. */
function baseRef(): string | null {
  const prBase = process.env.GITHUB_BASE_REF
  if (prBase) return `origin/${prBase}`
  const mb = git(["merge-base", "HEAD", "origin/main"]) ?? git(["merge-base", "HEAD", "main"])
  return mb?.trim() || null
}

function baseKeyMap(_root: string, nodes: SpecNode[]): BaseKeys {
  const map: BaseKeys = new Map()
  const ref = baseRef()
  if (!ref) return map // no git / no base — immutability simply not enforced
  for (const n of nodes) {
    const content = git(["show", `${ref}:${n.repoRelPath}`])
    if (content == null) continue // absent on base — a new file
    const h1 = content.split("\n").find((l) => /^#\s+/.test(l))
    map.set(n.repoRelPath, h1 ? firstKey(h1.replace(/^#+\s*/, "")) : null)
  }
  return map
}
