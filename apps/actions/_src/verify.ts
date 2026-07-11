// Action source — bundled into verify/action.yml by `bun run build.ts`.
// Runs inside actions/github-script, so `core`, `github`, and `context` are
// injected globals and top-level await is allowed. The repo is already checked
// out at the workspace root by the caller's workflow.
import { firstKey } from "@rivet/core"
import { getAdapter, loadConfig, verifySpecs, type BaseKeys } from "@rivet/core/node"

declare const core: typeof import("@actions/core")
declare const github: ReturnType<typeof import("@actions/github").getOctokit>
declare const context: typeof import("@actions/github").context

const root = process.env.RIVET_ROOT || "."
const config = loadConfig(root)
const adapter = getAdapter(config.adapter)
const nodes = adapter.parse(root, config.specs)

// Immutability needs the keys as they were on the PR base. Read them straight
// from the API at the base SHA (robust to shallow clones), only for the specs
// this PR actually changed — unchanged specs keep their key trivially.
const pr = context.payload.pull_request
const labels: string[] = (pr?.labels ?? []).map((l: { name: string }) => l.name)
const allowKeyChange = labels.includes("allow-key-change")

const base: BaseKeys = new Map()
if (pr) {
  const { owner, repo } = context.repo
  const specPaths = new Set(nodes.map((n) => n.repoRelPath))
  const files = await github.paginate(github.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: pr.number,
    per_page: 100,
  })
  for (const f of files) {
    if (!specPaths.has(f.filename)) continue
    if (f.status === "added") {
      base.set(f.filename, null)
      continue
    }
    try {
      const res = await github.rest.repos.getContent({
        owner,
        repo,
        path: f.filename,
        ref: pr.base.sha,
        mediaType: { format: "raw" },
      })
      const text = res.data as unknown as string
      const h1 = text.split("\n").find((l) => /^#\s+/.test(l))
      base.set(f.filename, h1 ? firstKey(h1.replace(/^#+\s*/, "")) : null)
    } catch (e) {
      core.warning(`could not read base ${f.filename}: ${(e as Error).message}`)
    }
  }
}

const violations = verifySpecs(nodes, base, { allowKeyChange })
for (const v of violations) {
  const msg = `${v.file}: ${v.message}`
  if (v.level === "error") core.error(msg)
  else core.warning(msg)
}

const errors = violations.filter((v) => v.level === "error")
const tracked = nodes.filter((n) => n.key).length
if (errors.length > 0) {
  core.setFailed(`${errors.length} verify violation(s) across ${nodes.length} specs`)
} else {
  core.info(`OK: ${nodes.length} specs (${tracked} tracked), no violations`)
}
