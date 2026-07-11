/**
 * Jira-key format, extraction, and H1 stamping helpers.
 *
 * A key is `PREFIX-NNN` where the prefix starts with a letter (`OSA`, `PPM`).
 * The hinge of the whole tool is the key in a spec's H1, so extraction is
 * deliberately word-boundary aware: a repo-local humanId prefix like
 * `ABO-FR-008` must NOT shadow the real Jira key that follows it.
 */

export const KEY_SOURCE = "[A-Z][A-Z0-9]+-\\d+"

/** Anchored, whole-string key validation. */
export const KEY_REGEX = new RegExp(`^${KEY_SOURCE}$`)

/**
 * A key as a standalone token inside free text. The `-`-aware boundaries stop
 * the trailing `FR-008` of a compound humanId from matching as its own key.
 */
export const KEY_IN_TEXT = new RegExp(`(?<![A-Za-z0-9-])(${KEY_SOURCE})(?![A-Za-z0-9-])`)

export function isKey(s: string): boolean {
  return KEY_REGEX.test(s)
}

/** First valid Jira key appearing as a token in `text`, else null. */
export function firstKey(text: string): string | null {
  const m = text.match(KEY_IN_TEXT)
  return m ? m[1]! : null
}

export interface ParsedH1 {
  /** The valid Jira key found in the heading, or null. */
  key: string | null
  /**
   * First key-shaped token after an optional humanId — even if it fails
   * validation — so verify can report a typo rather than treat it as untracked.
   */
  candidate: string | null
  /** Heading text with the humanId and key stripped. */
  title: string
}

const SEP = "[\\s.:·\\-–—]+"
const KEYISH = /^[A-Za-z][A-Za-z0-9]*-[A-Za-z0-9.]*\d/

/** Parse an H1 line into its key, typo-candidate, and clean title. */
export function parseH1(h1Raw: string, humanId: string | null): ParsedH1 {
  const heading = h1Raw.replace(/^#+\s*/, "").trim()
  const key = firstKey(heading)

  let afterId = heading
  if (humanId && afterId.startsWith(humanId)) {
    afterId = afterId.slice(humanId.length).replace(new RegExp(`^\\s*${SEP}`), "")
  }
  const firstTok = afterId.match(/^(\S+)/)?.[1]
  let candidate: string | null = null
  if (firstTok) {
    const clean = firstTok.replace(/[^A-Za-z0-9.]+$/, "")
    if (KEYISH.test(clean)) candidate = clean
  }

  let title = heading
  if (humanId && title.startsWith(humanId)) {
    title = title.slice(humanId.length).replace(new RegExp(`^\\s*${SEP}`), "")
  }
  if (key && title.startsWith(key)) {
    title = title.slice(key.length).replace(new RegExp(`^\\s*${SEP}`), "")
  }
  title = title.trim() || heading

  return { key, candidate, title }
}

/**
 * Rewrite an H1 to carry `key`, preserving a repo-local humanId prefix so
 * cross-references that use the semantic id keep resolving:
 *   lane → `# OSA-30303 Sub-Tasks`
 *   dg   → `# ABO-FR-008 · OSA-30303 Sub-Tasks`
 */
export function stampKey(h1Raw: string, key: string, humanId: string | null): string {
  const { title } = parseH1(h1Raw, humanId)
  const head = humanId ? `${humanId} · ${key}` : key
  return `# ${head}${title ? ` ${title}` : ""}`
}
