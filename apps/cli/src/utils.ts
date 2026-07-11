import { JiraClient } from "@rivet/core"
import type { RivetConfig } from "@rivet/core"

export function fatal(msg: string): never {
  console.error(msg)
  process.exit(1)
}

/** Jira client from env credentials + the repo's base URL. */
export function jiraClient(config: RivetConfig): JiraClient {
  const email = process.env.JIRA_EMAIL
  const token = process.env.JIRA_API_TOKEN
  if (!email || !token) {
    fatal("JIRA_EMAIL and JIRA_API_TOKEN must be set (see .env.example).")
  }
  return new JiraClient({ email, token, baseUrl: config.baseUrl })
}

/** Is any of `flags` present on argv? */
export function flag(...flags: string[]): boolean {
  return process.argv.slice(2).some((a) => flags.includes(a))
}

/** Value after `--flag <value>`. */
export function flagValue(...flags: string[]): string | undefined {
  const args = process.argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    if (flags.includes(args[i]!) && i + 1 < args.length) return args[i + 1]
  }
  return undefined
}

/** First non-flag positional after the subcommand, defaulting to ".". */
export function positional(rest: string[], fallback = "."): string {
  return rest.find((a) => !a.startsWith("-")) ?? fallback
}
