/**
 * `dg` adapter: template-governed `ABO-FR-NNN_slug.md` (functional → story) and
 * `ABO-NFR-NNN_slug.md` (non-functional → task) files. The `ABO-FR-NNN` token
 * is a repo-local humanId, preserved in the H1 alongside the Jira key.
 *
 * NOTE: the skeleton's mandatory H4 set below is a placeholder and must be
 * reconciled with the real Dg.GalaxusAbos structure linter before use (see
 * specs/001-spec-adapters.md — Open item on the dg template).
 */
import type { ScaffoldContext, ScaffoldInput, SpecAdapter, SpecKind, SpecNode } from "../types.ts"
import { parseH1 } from "../keys.ts"
import { firstH1, readSpecFiles, slugify, statusField } from "./shared.ts"

const DG_NAME = /^ABO-(FR|NFR)-(\d{3,})_/

function dgKind(tag: string): SpecKind {
  return tag === "FR" ? "story" : "task"
}

export const dgAdapter: SpecAdapter = {
  name: "dg",

  parse(root, specDirs) {
    const nodes: SpecNode[] = []
    for (const f of readSpecFiles(root, specDirs)) {
      const m = f.name.match(DG_NAME)
      if (!m) continue
      const humanId = `ABO-${m[1]}-${m[2]}`
      const h1 = firstH1(f.content) ?? ""
      const { key, candidate, title } = parseH1(h1, humanId)
      nodes.push({
        repoRelPath: f.relPath,
        humanId,
        key,
        keyCandidate: candidate,
        title,
        kind: dgKind(m[1]!),
        status: statusField(f.content),
        h1Raw: h1,
      })
    }
    return nodes
  },

  scaffold(input, ctx) {
    const tag = input.kind === "story" ? "FR" : "NFR"
    const dir = ctx.specDirs[0]!
    const humanId = `ABO-${tag}-${nextNumber(ctx, tag)}`
    return {
      path: `${dir}/${humanId}_${slugify(input.summary)}.md`,
      contents: skeleton(humanId, input),
    }
  },
}

function nextNumber(ctx: ScaffoldContext, tag: string): string {
  let max = 0
  for (const n of ctx.existing) {
    if (!n.humanId?.startsWith(`ABO-${tag}-`)) continue
    const num = Number(n.humanId.slice(`ABO-${tag}-`.length))
    if (Number.isFinite(num)) max = Math.max(max, num)
  }
  return String(max + 1).padStart(3, "0")
}

function skeleton(humanId: string, input: ScaffoldInput): string {
  return `# ${humanId} · ${input.key} ${input.summary}

**Status**: Draft

#### Context

TODO

#### Requirement

TODO

#### Acceptance Criteria

TODO

#### Out of Scope

TODO
`
}
