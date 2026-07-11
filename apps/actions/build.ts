/**
 * Bundles each _src/*.ts entrypoint (imports inlined via Bun.build) and injects
 * the result into the matching action YAML under `script: |`. The generated
 * YAMLs are committed so consumers use them with no install/build step:
 *
 *   - uses: candril/rivet/apps/actions/verify@main
 *
 * Run with: bun run build.ts  (or `bun run build` in this package)
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { basename, dirname, join } from "node:path"

const HERE = new URL(".", import.meta.url).pathname

const ACTIONS = [
  { name: "verify", header: verifyHeader() },
  { name: "mint", header: mintHeader() },
]

for (const action of ACTIONS) {
  const src = join(HERE, "_src", `${action.name}.ts`)
  const yamlPath = join(HERE, action.name, "action.yml")
  console.log(`Building ${basename(src)} …`)

  const build = await Bun.build({ entrypoints: [src], target: "node", minify: false })
  if (!build.success) {
    for (const log of build.logs) console.error(log)
    process.exit(1)
  }

  // github-script runs the script as the body of an async function: top-level
  // `import`/`export` are SyntaxErrors but `require` is in scope and top-level
  // `await` is allowed. Bun can't emit CJS with top-level await, so we emit ESM
  // and rewrite the (node-builtin) imports to require() ourselves.
  const bundled = esmToScript((await build.outputs[0]!.text()).trimEnd()).trimEnd()
  const indented = bundled
    .split("\n")
    .map((l) => "          " + l)
    .join("\n")

  const yaml =
    action.header +
    `          // !! GENERATED — edit apps/actions/_src/${action.name}.ts instead !!\n` +
    indented +
    "\n"

  mkdirSync(dirname(yamlPath), { recursive: true })
  writeFileSync(yamlPath, yaml, "utf8")
  console.log(`  → wrote ${yamlPath.replace(HERE, "")}`)
}

console.log("\nDone. Commit the updated action YAMLs.")

/**
 * Rewrite an ESM bundle into statements valid inside github-script's async
 * function body: `import` -> `require`, and strip `export`. Only node builtins
 * remain as imports after bundling, so this is a small, well-bounded transform.
 */
function esmToScript(code: string): string {
  return code
    .replace(
      /^import\s+\{([^}]*)\}\s+from\s*["']([^"']+)["'];?$/gm,
      (_m, names: string, mod: string) =>
        `const {${names.replace(/\s+as\s+/g, ": ")}} = require("${mod}");`,
    )
    .replace(
      /^import\s+\*\s+as\s+(\w+)\s+from\s*["']([^"']+)["'];?$/gm,
      (_m, ns: string, mod: string) => `const ${ns} = require("${mod}");`,
    )
    .replace(
      /^import\s+(\w+)\s+from\s*["']([^"']+)["'];?$/gm,
      (_m, def: string, mod: string) => `const ${def} = require("${mod}");`,
    )
    .replace(/^import\s*["']([^"']+)["'];?$/gm, (_m, mod: string) => `require("${mod}");`)
    .replace(/^export\s*\{[^}]*\};?$/gm, "")
    .replace(/^export\s+default\s+/gm, "")
}

// ── YAML templates ──────────────────────────────────────────────────────────

function verifyHeader(): string {
  return `name: 'rivet verify'
description: 'Gate PRs on Jira-key format, uniqueness, and immutability (the key in each spec H1).'
author: 'candril'

inputs:
  path:
    description: 'Repo-relative root containing rivet.toml'
    required: false
    default: '.'

runs:
  using: 'composite'
  steps:
    - name: Verify specs
      uses: actions/github-script@v7
      env:
        RIVET_ROOT: \${{ inputs.path }}
      with:
        script: |
`
}

function mintHeader(): string {
  return `name: 'rivet mint'
description: 'Preview keyless specs; on the create-jira label, create Jira issues and stamp their keys back to the PR branch.'
author: 'candril'

inputs:
  path:
    description: 'Repo-relative root containing rivet.toml'
    required: false
    default: '.'
  jira-email:
    description: 'Jira account email (Basic auth)'
    required: true
  jira-api-token:
    description: 'Jira API token (Basic auth) — use a service-account secret'
    required: true
  jira-base-url:
    description: 'Jira base URL; overrides rivet.toml base_url when set'
    required: false
    default: ''
  label-issues:
    description: 'Also add a rivet:<repo>/<id> label to each created issue'
    required: false
    default: 'false'
  github-token:
    description: 'Token for PR comments, label removal, and pushing the stamp commit'
    required: false
    default: \${{ github.token }}

runs:
  using: 'composite'
  steps:
    - name: Mint specs
      uses: actions/github-script@v7
      env:
        RIVET_ROOT: \${{ inputs.path }}
        JIRA_EMAIL: \${{ inputs.jira-email }}
        JIRA_API_TOKEN: \${{ inputs.jira-api-token }}
        JIRA_BASE_URL: \${{ inputs.jira-base-url }}
        RIVET_LABEL: \${{ inputs.label-issues }}
      with:
        github-token: \${{ inputs.github-token }}
        script: |
`
}
