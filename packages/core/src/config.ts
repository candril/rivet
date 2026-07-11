/** Load and validate a repo's `rivet.toml`. */
import { resolve } from "node:path"
import type { RivetConfig } from "./types.ts"

/**
 * Read `<root>/rivet.toml`. Bun parses `.toml` on import, so no dependency is
 * needed. The base URL falls back to the `JIRA_BASE_URL` env var when the file
 * omits it, so CI can point at a different instance without editing the repo.
 */
export async function loadConfig(root = "."): Promise<RivetConfig> {
  const path = resolve(root, "rivet.toml")
  // Variable specifier → Bun resolves the .toml at runtime; typed as any here.
  const mod: { default?: unknown } = await import(path, { with: { type: "toml" } })
  return validateConfig((mod.default ?? mod) as Record<string, unknown>, path)
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
