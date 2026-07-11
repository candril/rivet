/**
 * `lane` adapter: flat `NNN-slug.md` files with a bold `**Status**` field.
 * Non-functional specs live in an `nfr/` subdir and map to tasks; everything
 * else is a story.
 */
import type { ScaffoldContext, ScaffoldInput, SpecAdapter, SpecKind, SpecNode } from "../types.ts"
import { parseH1 } from "../keys.ts"
import { firstH1, readSpecFiles, slugify, statusField } from "./shared.ts"

const NUM_PREFIX = /^(\d{3,})[-_]/

function laneKind(relPath: string): SpecKind {
  return /(^|\/)nfr\//.test(relPath) ? "task" : "story"
}

export const laneAdapter: SpecAdapter = {
  name: "lane",

  parse(root, specDirs) {
    const nodes: SpecNode[] = []
    for (const f of readSpecFiles(root, specDirs)) {
      const h1 = firstH1(f.content) ?? ""
      const humanId = f.name.match(NUM_PREFIX)?.[1] ?? null
      const { key, candidate, title } = parseH1(h1, humanId)
      nodes.push({
        repoRelPath: f.relPath,
        humanId,
        key,
        keyCandidate: candidate,
        title,
        kind: laneKind(f.relPath),
        status: statusField(f.content),
        h1Raw: h1,
      })
    }
    return nodes
  },

  scaffold(input, ctx) {
    const dir =
      input.kind === "task"
        ? ctx.specDirs.find((d) => /(^|\/)nfr$/.test(d)) ?? ctx.specDirs[0]!
        : ctx.specDirs.find((d) => !/(^|\/)nfr$/.test(d)) ?? ctx.specDirs[0]!
    const next = nextNumber(ctx, dir)
    return {
      path: `${dir}/${next}-${slugify(input.summary)}.md`,
      contents: skeleton(input),
    }
  },
}

function nextNumber(ctx: ScaffoldContext, dir: string): string {
  let max = 0
  for (const n of ctx.existing) {
    if (!n.repoRelPath.startsWith(`${dir}/`)) continue
    const m = n.repoRelPath.slice(dir.length + 1).match(/^(\d{3,})/)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return String(max + 1).padStart(3, "0")
}

function skeleton(input: ScaffoldInput): string {
  return `# ${input.key} ${input.summary}

**Status**: Draft

## Description

TODO

## Capabilities

### P1 — Must Have

- TODO

## Out of Scope

- TODO
`
}
