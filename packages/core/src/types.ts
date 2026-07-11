/** Normalized shapes shared across adapters, verify, mint, and shell. */

/** A functional requirement maps to a Story; a non-functional one to a Task. */
export type SpecKind = "story" | "task"

/**
 * The single normalized node every downstream verb operates on. Adapters
 * produce these from a repo's own spec format so verify/mint/shell never see
 * `lane` vs `dg` differences.
 */
export interface SpecNode {
  /** Repo-relative path, e.g. "specs/008-sub-tasks.md". */
  repoRelPath: string
  /** Repo-local human id from the filename, e.g. "008" | "ABO-FR-008" | null. */
  humanId: string | null
  /** The Jira key stamped in the H1, or null when untracked. */
  key: string | null
  /**
   * First key-shaped token in the H1 even when it fails validation, so verify
   * can flag a typo'd key (e.g. "OSA-3O303") instead of silently reading it as
   * untracked. Equals `key` when the H1 carries a valid key.
   */
  keyCandidate: string | null
  /** H1 text with the key and humanId stripped. */
  title: string
  kind: SpecKind
  /** The normalized (lowercased) `**Status**` gate value. */
  status: string
  /** Raw H1 line, for the immutability diff and in-place stamping. */
  h1Raw: string
}

/** What `shell` feeds an adapter to render a new, key-stamped spec file. */
export interface ScaffoldInput {
  key: string
  summary: string
  kind: SpecKind
}

/** Context an adapter needs to place and number a scaffolded file. */
export interface ScaffoldContext {
  /** Configured spec directories (repo-relative). */
  specDirs: string[]
  /** Already-parsed nodes, for next-number selection and collision detection. */
  existing: SpecNode[]
}

export interface SpecAdapter {
  readonly name: string
  /** Filesystem-only: walk the spec dirs and emit normalized nodes. */
  parse(root: string, specDirs: string[]): SpecNode[]
  /** Pure: given an issue, return a template-valid spec file (no writes). */
  scaffold(input: ScaffoldInput, ctx: ScaffoldContext): { path: string; contents: string }
}

/** Per-project mapping from spec kind to the Jira issue-type name. */
export interface TypeMapping {
  story: string
  task: string
}

export interface RivetConfig {
  adapter: string
  specs: string[]
  project: string
  baseUrl: string
  types: TypeMapping
}

/** Jira's status-category keys (the coarse workflow bucket). */
export type StatusCategory = "new" | "indeterminate" | "done" | "unknown"

export interface JiraIssue {
  key: string
  type: string
  summary: string
  statusCategory: StatusCategory
}

export interface CreatedIssue {
  key: string
  url: string
}
