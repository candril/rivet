// Action source — bundled into mint/action.yml by `bun run build.ts`.
// Two modes on a pull_request:
//   • no `create-jira` label → post/update a preview comment of what would mint
//   • `create-jira` label    → create issues, stamp H1s, commit to the PR
//     branch, and remove the label so it does not re-fire.
import { readFileSync, writeFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { join } from "node:path"
import { JiraClient } from "@rivet/core"
import { getAdapter, loadConfig, mintCandidates, mintOne, type MintPreview } from "@rivet/core/node"

declare const core: typeof import("@actions/core")
declare const github: ReturnType<typeof import("@actions/github").getOctokit>
declare const context: typeof import("@actions/github").context

const MINT_LABEL = "create-jira"
const COMMENT_MARKER = "<!-- rivet-mint -->"

const root = process.env.RIVET_ROOT || "."
const config = loadConfig(root)
const adapter = getAdapter(config.adapter)

const pr = context.payload.pull_request
if (!pr) {
  core.info("not a pull_request event — nothing to do")
} else {
  const { owner, repo } = context.repo
  const labels: string[] = (pr.labels ?? []).map((l: { name: string }) => l.name)
  const candidates = mintCandidates(adapter.parse(root, config.specs), config)

  if (!labels.includes(MINT_LABEL)) {
    await upsertComment(owner, repo, pr.number, previewBody(candidates))
  } else if (candidates.length === 0) {
    await upsertComment(owner, repo, pr.number, `${COMMENT_MARKER}\nNothing to mint — no keyless Ready/approved specs.`)
    await removeLabel(owner, repo, pr.number)
  } else if (pr.head.repo.full_name !== `${owner}/${repo}`) {
    core.setFailed("fork PR: rivet cannot push stamped H1s to the head branch — use an in-repo branch.")
  } else {
    await mint(candidates, owner, repo, pr as unknown as PullRequest)
    await removeLabel(owner, repo, pr.number)
  }
}

async function mint(candidates: MintPreview[], owner: string, repo: string, pr: PullRequest): Promise<void> {
  const jira = new JiraClient({
    email: reqEnv("JIRA_EMAIL"),
    token: reqEnv("JIRA_API_TOKEN"),
    baseUrl: config.baseUrl,
  })
  const labelIssues = (process.env.RIVET_LABEL ?? "").toLowerCase() === "true"
  const minted: string[] = []

  for (const c of candidates) {
    const result = await mintOne(jira, c.node, config)
    const abs = join(root, c.node.repoRelPath)
    writeFileSync(abs, readFileSync(abs, "utf8").replace(c.node.h1Raw, result.newH1))
    if (labelIssues) {
      const ref = c.node.humanId ?? c.node.repoRelPath
      await jira.addLabel(result.key, `rivet:${owner}/${repo}/${ref}`)
    }
    minted.push(`${result.key} → ${c.node.repoRelPath}`)
    core.info(`minted ${result.key} → ${c.node.repoRelPath} (${result.url})`)
  }

  git(["config", "user.name", "rivet-bot"])
  git(["config", "user.email", "rivet-bot@users.noreply.github.com"])
  git(["commit", "-am", "rivet: stamp Jira keys"])
  git(["push", "origin", `HEAD:${pr.head.ref}`])
  await upsertComment(owner, repo, pr.number, `${COMMENT_MARKER}\nMinted and stamped:\n\n${minted.map((m) => `- ${m}`).join("\n")}`)
}

function previewBody(candidates: MintPreview[]): string {
  if (candidates.length === 0) {
    return `${COMMENT_MARKER}\nNo keyless Ready/approved specs to mint.`
  }
  const rows = candidates
    .map((c) => `| \`${c.node.repoRelPath}\` | ${c.type} | ${c.project} |`)
    .join("\n")
  return `${COMMENT_MARKER}
### rivet — specs ready to mint

Add the **\`${MINT_LABEL}\`** label to create these Jira issues and stamp their keys back into this PR.

| Spec | Type | Project |
| --- | --- | --- |
${rows}`
}

async function upsertComment(owner: string, repo: string, issue: number, body: string): Promise<void> {
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issue,
    per_page: 100,
  })
  const existing = comments.find((c) => c.body?.includes(COMMENT_MARKER))
  if (existing) {
    await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body })
  } else {
    await github.rest.issues.createComment({ owner, repo, issue_number: issue, body })
  }
}

async function removeLabel(owner: string, repo: string, issue: number): Promise<void> {
  try {
    await github.rest.issues.removeLabel({ owner, repo, issue_number: issue, name: MINT_LABEL })
  } catch (e) {
    core.warning(`could not remove ${MINT_LABEL} label: ${(e as Error).message}`)
  }
}

function git(args: string[]): void {
  execFileSync("git", args, { cwd: root, stdio: "inherit" })
}

function reqEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} is required for minting (set it as an Action input/secret)`)
  return v
}

interface PullRequest {
  number: number
  head: { ref: string; repo: { full_name: string } }
  base: { sha: string }
  labels?: { name: string }[]
}
