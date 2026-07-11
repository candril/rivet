/** Adapter registry — selected per repo by `rivet.toml`'s `adapter` field. */
import type { SpecAdapter } from "../types.ts"
import { laneAdapter } from "./lane.ts"
import { dgAdapter } from "./dg.ts"

const REGISTRY: Record<string, SpecAdapter> = {
  [laneAdapter.name]: laneAdapter,
  [dgAdapter.name]: dgAdapter,
}

export function getAdapter(name: string): SpecAdapter {
  const adapter = REGISTRY[name]
  if (!adapter) {
    throw new Error(`unknown adapter "${name}" — known: ${Object.keys(REGISTRY).join(", ")}`)
  }
  return adapter
}

export { laneAdapter, dgAdapter }
