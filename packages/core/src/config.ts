/** Load and validate a repo's `rivet.toml`. */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { RivetConfig } from "./types.ts"

/**
 * Read `<root>/rivet.toml`. Parsed with a small built-in reader (below) rather
 * than a runtime's native TOML import, so `@rivet/core` stays runtime-agnostic:
 * the same code runs under Bun (CLI) and Node (the bundled GitHub Actions). The
 * base URL falls back to `JIRA_BASE_URL` so CI can retarget without editing the
 * repo.
 */
export function loadConfig(root = "."): RivetConfig {
  const path = resolve(root, "rivet.toml")
  return validateConfig(parseToml(readFileSync(path, "utf8")), path)
}

export function validateConfig(raw: Record<string, unknown>, source = "rivet.toml"): RivetConfig {
  const fail = (m: string): never => {
    throw new Error(`${source}: ${m}`)
  }

  if (typeof raw.adapter !== "string") fail("`adapter` must be a string")
  if (!Array.isArray(raw.specs) || raw.specs.some((s) => typeof s !== "string")) {
    fail("`specs` must be an array of strings")
  }
  if (typeof raw.project !== "string") fail("`project` must be a string")

  const baseUrl = process.env.JIRA_BASE_URL ?? raw.base_url
  if (typeof baseUrl !== "string" || !baseUrl) {
    fail("`base_url` must be set in rivet.toml (or JIRA_BASE_URL in the env)")
  }

  const types = (raw.types ?? {}) as Record<string, unknown>
  return {
    adapter: raw.adapter as string,
    specs: raw.specs as string[],
    project: raw.project as string,
    baseUrl: baseUrl as string,
    types: {
      story: typeof types.story === "string" ? types.story : "Story",
      task: typeof types.task === "string" ? types.task : "Task",
    },
  }
}

/**
 * Minimal TOML reader covering exactly what `rivet.toml` uses: comments,
 * single-level `[table]` headers, string/number/bool scalars, and single-line
 * string arrays. Not a general TOML parser — inline tables and multi-line
 * arrays are intentionally out of scope.
 */
export function parseToml(text: string): Record<string, unknown> {
  const root: Record<string, unknown> = {}
  let table = root

  for (const rawLine of text.split("\n")) {
    const line = stripComment(rawLine).trim()
    if (!line) continue

    const header = line.match(/^\[([^\]]+)\]$/)
    if (header) {
      const obj: Record<string, unknown> = {}
      root[header[1]!.trim()] = obj
      table = obj
      continue
    }

    const eq = line.indexOf("=")
    if (eq === -1) continue
    table[line.slice(0, eq).trim()] = parseValue(line.slice(eq + 1).trim())
  }

  return root
}

/** Drop a trailing `# comment`, but not a `#` inside a quoted string. */
function stripComment(line: string): string {
  let inString = false
  let quote = ""
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!
    if (inString) {
      if (c === quote) inString = false
    } else if (c === '"' || c === "'") {
      inString = true
      quote = c
    } else if (c === "#") {
      return line.slice(0, i)
    }
  }
  return line
}

function parseValue(v: string): unknown {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1)
  }
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim()
    return inner ? splitTopLevel(inner).map((item) => parseValue(item.trim())) : []
  }
  if (v === "true") return true
  if (v === "false") return false
  const n = Number(v)
  return v !== "" && !Number.isNaN(n) ? n : v
}

/** Split on top-level commas, ignoring commas inside strings or nested brackets. */
function splitTopLevel(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let inString = false
  let quote = ""
  let cur = ""
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!
    if (inString) {
      cur += c
      if (c === quote) inString = false
      continue
    }
    if (c === '"' || c === "'") {
      inString = true
      quote = c
    } else if (c === "[") {
      depth++
    } else if (c === "]") {
      depth--
    } else if (c === "," && depth === 0) {
      out.push(cur)
      cur = ""
      continue
    }
    cur += c
  }
  if (cur.trim()) out.push(cur)
  return out
}
