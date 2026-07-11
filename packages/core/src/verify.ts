/**
 * The gate that makes the key-in-H1 hinge trustworthy. All three core checks
 * are structural and local — no Jira access — so they can gate every PR
 * cheaply. Immutability needs the keys as they were on the base branch; the
 * caller supplies them (a pure `git diff`), keeping this module IO-free.
 */
import type { SpecNode } from "./types.ts"
import { isKey } from "./keys.ts"

export interface Violation {
  file: string
  message: string
  level: "error" | "warning"
}

export interface VerifyOptions {
  /** Downgrade an immutability failure to a warning (the `allow-key-change` escape hatch). */
  allowKeyChange?: boolean
}

/** Keys as they stood on the base branch, per repo-relative path. */
export type BaseKeys = Map<string, string | null>

/** A key-shaped H1 token that fails validation is a typo, not "untracked". */
export function checkFormat(nodes: SpecNode[]): Violation[] {
  const out: Violation[] = []
  for (const n of nodes) {
    if (n.keyCandidate && !isKey(n.keyCandidate)) {
      out.push({
        file: n.repoRelPath,
        level: "error",
        message: `malformed key "${n.keyCandidate}" — must match PREFIX-NNN (e.g. OSA-30303)`,
      })
    }
  }
  return out
}

export function checkUniqueness(nodes: SpecNode[]): Violation[] {
  const out: Violation[] = []
  const seen = new Map<string, string>()
  for (const n of nodes) {
    if (!n.key) continue
    const prev = seen.get(n.key)
    if (prev) {
      out.push({ file: n.repoRelPath, level: "error", message: `duplicate key ${n.key} — also in ${prev}` })
    } else {
      seen.set(n.key, n.repoRelPath)
    }
  }
  return out
}

export function checkImmutability(nodes: SpecNode[], base: BaseKeys, allowKeyChange: boolean): Violation[] {
  const out: Violation[] = []
  for (const n of nodes) {
    if (!base.has(n.repoRelPath)) continue // new file — nothing to protect
    const was = base.get(n.repoRelPath) ?? null
    if (was && n.key !== was) {
      out.push({
        file: n.repoRelPath,
        level: allowKeyChange ? "warning" : "error",
        message: `key changed ${was} → ${n.key ?? "(none)"}${allowKeyChange ? " (allowed by label)" : ""}`,
      })
    }
  }
  return out
}

export function verifySpecs(nodes: SpecNode[], base: BaseKeys, opts: VerifyOptions = {}): Violation[] {
  return [
    ...checkFormat(nodes),
    ...checkUniqueness(nodes),
    ...checkImmutability(nodes, base, opts.allowKeyChange ?? false),
  ]
}
