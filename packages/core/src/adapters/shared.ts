/** Filesystem + parsing helpers shared by the built-in adapters. */
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"

export interface RawSpec {
  absPath: string
  relPath: string
  content: string
  /** Bare filename, e.g. "008-sub-tasks.md". */
  name: string
  /** The configured spec dir this file came from, e.g. "specs/nfr". */
  dir: string
}

/** Read every top-level `.md` file across the configured spec dirs. */
export function readSpecFiles(root: string, specDirs: string[]): RawSpec[] {
  const out: RawSpec[] = []
  for (const dir of specDirs) {
    const abs = join(root, dir)
    if (!existsSync(abs)) continue
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue
      const absPath = join(abs, entry.name)
      out.push({
        absPath,
        relPath: relative(root, absPath).replace(/\\/g, "/"),
        content: readFileSync(absPath, "utf8"),
        name: entry.name,
        dir,
      })
    }
  }
  return out
}

/** First real H1 heading (skips fenced code blocks), trailing space trimmed. */
export function firstH1(content: string): string | null {
  let inCode = false
  for (const line of content.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inCode = !inCode
      continue
    }
    if (inCode) continue
    if (/^#\s+/.test(line)) return line.replace(/\s+$/, "")
  }
  return null
}

/** The normalized (lowercased) value of the bold `**Status**` field. */
export function statusField(content: string): string {
  const m = content.match(/^\s*\*\*Status\*\*:\s*(.+?)\s*$/m)
  return m ? m[1]!.trim().toLowerCase() : ""
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60) || "spec"
  )
}
