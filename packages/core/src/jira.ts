/**
 * Thin, typed Jira Cloud REST client — fetch-only so it stays runtime-agnostic
 * (Bun, Node, GitHub Actions). The surface is deliberately narrow: it can
 * create an issue, read one, add a label, and search. It has NO method to set
 * status, assignee, sprint, or description-after-create, so "no content sync"
 * is enforced by the surface area rather than by discipline.
 */
import type { CreatedIssue, JiraIssue, StatusCategory } from "./types.ts"

export class JiraError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "JiraError"
  }
}

export interface JiraClientOptions {
  email: string
  token: string
  baseUrl: string
  /** Custom fetch (tests / non-global environments). */
  fetch?: typeof fetch
  /** Retries on 429/5xx before giving up. */
  maxRetries?: number
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export class JiraClient {
  private readonly baseUrl: string
  private readonly auth: string
  private readonly fetch: typeof fetch
  private readonly maxRetries: number

  constructor(opts: JiraClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "")
    this.auth = `Basic ${btoa(`${opts.email}:${opts.token}`)}`
    this.fetch = opts.fetch ?? globalThis.fetch.bind(globalThis)
    this.maxRetries = opts.maxRetries ?? 3
  }

  /** The only write on the mint path: sets summary once and nothing else. */
  async createIssue(input: {
    projectKey: string
    type: string
    summary: string
  }): Promise<CreatedIssue> {
    const res = await this.request("/rest/api/3/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          project: { key: input.projectKey },
          issuetype: { name: input.type },
          summary: input.summary,
        },
      }),
    })
    const body = await this.json<{ key: string }>(res)
    return { key: body.key, url: `${this.baseUrl}/browse/${body.key}` }
  }

  async getIssue(key: string): Promise<JiraIssue | null> {
    const res = await this.request(
      `/rest/api/3/issue/${encodeURIComponent(key)}?fields=summary,issuetype,status`,
      { method: "GET" },
    )
    if (res.status === 404) return null
    const body = await this.json<JiraIssueWire>(res)
    return toIssue(body)
  }

  /** Additive: attaches one label without clearing existing ones. */
  async addLabel(key: string, label: string): Promise<void> {
    const res = await this.request(`/rest/api/3/issue/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ update: { labels: [{ add: label }] } }),
    })
    if (!res.ok) await this.json(res)
  }

  async search(jql: string, maxResults = 100): Promise<JiraIssue[]> {
    const res = await this.request("/rest/api/3/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jql, maxResults, fields: ["summary", "issuetype", "status"] }),
    })
    const body = await this.json<{ issues?: JiraIssueWire[] }>(res)
    return (body.issues ?? []).map(toIssue)
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      const res = await this.fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { Authorization: this.auth, Accept: "application/json", ...(init.headers ?? {}) },
      })
      if ((res.status === 429 || res.status >= 500) && attempt < this.maxRetries) {
        const retryAfter = Number(res.headers.get("retry-after"))
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 500
        await sleep(delay)
        continue
      }
      return res
    }
  }

  private async json<T = unknown>(res: Response): Promise<T> {
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as JiraErrorWire | null
      const msg =
        body?.errorMessages?.join("; ") ||
        (body?.errors && Object.values(body.errors).join("; ")) ||
        res.statusText
      throw new JiraError(res.status, msg)
    }
    return res.json() as Promise<T>
  }
}

interface JiraIssueWire {
  key: string
  fields: {
    summary: string
    issuetype: { name: string }
    status?: { statusCategory?: { key?: string } }
  }
}

interface JiraErrorWire {
  errorMessages?: string[]
  errors?: Record<string, string>
}

function toIssue(w: JiraIssueWire): JiraIssue {
  return {
    key: w.key,
    type: w.fields.issuetype.name,
    summary: w.fields.summary,
    statusCategory: (w.fields.status?.statusCategory?.key ?? "unknown") as StatusCategory,
  }
}
