# rivet — specs ⇄ Jira via the key in each spec's H1 (Bun/TypeScript monorepo)
# Run `just` to see all available commands.

# Load a local .env (gitignored) so recipes pick up JIRA_* directly.
set dotenv-load := true

cli := "bun run apps/cli/src/main.ts"

# ── Spec Workflow ────────────────────────────────────────────────

# Check key format, uniqueness, immutability (CI gate — exits non-zero on error)
verify DIR=".":
    {{cli}} verify {{DIR}}

# Create Jira issues for keyless Ready specs and stamp their H1s
mint DIR="." *FLAGS="":
    {{cli}} mint {{DIR}} {{FLAGS}}

# Scaffold a stub spec from a Jira issue: just shell OSA-30303
shell KEY:
    {{cli}} shell {{KEY}}

# ── Build & Check ────────────────────────────────────────────────

# Install all workspace dependencies
install:
    bun install

# Typecheck every package + verify specs
check:
    bun run --filter '*' typecheck
    {{cli}} verify .
    @echo "All checks passed"

# Build the CLI binary to ./bin/rivet
build:
    bun run --filter '@rivet/cli' build
    @echo "Built: bin/rivet"

# Bundle the GitHub Actions (placeholder — composite YAML today)
build-actions:
    bun run --filter '@rivet/actions' build
