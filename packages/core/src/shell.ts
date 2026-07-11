/**
 * Shell (Jira → spec): the mirror of mint. Given a fetched issue, delegate to
 * the repo's adapter to render a template-valid, already-key-stamped skeleton.
 * Pure: the Jira fetch and the file write live in the caller.
 */
import type { JiraIssue, RivetConfig, ScaffoldInput, SpecAdapter, SpecKind, SpecNode } from "./types.ts"

/** Map a Jira issue-type name back to a spec kind (Task → task, else story). */
export function issueKind(issue: JiraIssue, config: RivetConfig): SpecKind {
  return issue.type === config.types.task ? "task" : "story"
}

export type ShellResult =
  | { created: { path: string; contents: string } }
  | { skipped: { key: string; existingPath: string } }

export function shellFromIssue(
  issue: JiraIssue,
  adapter: SpecAdapter,
  existing: SpecNode[],
  config: RivetConfig,
  specDirs: string[],
): ShellResult {
  const dup = existing.find((n) => n.key === issue.key)
  if (dup) return { skipped: { key: issue.key, existingPath: dup.repoRelPath } }

  const input: ScaffoldInput = { key: issue.key, summary: issue.summary, kind: issueKind(issue, config) }
  return { created: adapter.scaffold(input, { specDirs, existing }) }
}
