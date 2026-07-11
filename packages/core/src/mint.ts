/**
 * Mint (spec → Jira): create an issue for a keyless spec and compute the stamped
 * H1. IO (the file write / PR commit) is the caller's job — this module only
 * decides what to mint and talks to Jira, so it stays testable.
 */
import type { JiraClient } from "./jira.ts"
import type { RivetConfig, SpecNode } from "./types.ts"
import { stampKey } from "./keys.ts"

/** Only specs whose `**Status**` has cleared review are offered for minting. */
const GATE = new Set(["ready", "approved"])

export function passesGate(status: string): boolean {
  return GATE.has(status.toLowerCase())
}

export function issueType(node: SpecNode, config: RivetConfig): string {
  return node.kind === "story" ? config.types.story : config.types.task
}

export interface MintPreview {
  node: SpecNode
  type: string
  project: string
}

/** Keyless specs past the gate — what a mint run would create. */
export function mintCandidates(nodes: SpecNode[], config: RivetConfig): MintPreview[] {
  return nodes
    .filter((n) => n.key === null && passesGate(n.status))
    .map((n) => ({ node: n, type: issueType(n, config), project: config.project }))
}

export interface Minted {
  node: SpecNode
  key: string
  url: string
  /** The rewritten H1 the caller should splice into the file. */
  newH1: string
}

export async function mintOne(jira: JiraClient, node: SpecNode, config: RivetConfig): Promise<Minted> {
  if (node.key) throw new Error(`${node.repoRelPath} already carries key ${node.key}`)
  const { key, url } = await jira.createIssue({
    projectKey: config.project,
    type: issueType(node, config),
    summary: node.title,
  })
  return { node, key, url, newH1: stampKey(node.h1Raw, key, node.humanId) }
}
