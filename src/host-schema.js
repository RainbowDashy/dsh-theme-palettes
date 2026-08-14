// dsh-theme-palettes — Host namespace contract (pure, dependency-free).
//
// The harness's settings WIRE serves only a hardcoded namespace allowlist, so
// a third-party web package cannot read or write its own settings namespace
// through the standard settings RPC. The Host half therefore owns the
// namespace on the Host settings seam directly (`settings.register`), which
// persists it into the same user settings document as first-party namespaces
// (settings.yaml), and exposes a small private HTTP surface the browser half
// uses instead of the gated wire.
//
// This module carries the contract pieces the zero-dependency test suite
// exercises; `src/host.js` wires them to the real schemastery import.

/** Settings namespace owned by this package (lowercase kebab-case). */
export const SETTINGS_NAMESPACE = 'theme-palettes'

/** Fallback mapping used until a user override exists. */
export const HOST_DEFAULT_MAPPING = { dark: 'vscode-red', light: 'default' }

/** Private HTTP route the browser half reads and writes through. */
export const HTTP_ROUTE = '/api/theme-palettes'

/**
 * Build the namespace schema. Receives a schemastery-shaped `z` so the
 * contract test can pass a minimal fake and stay dependency-free.
 */
export function buildSchema(z) {
  return z.object({
    dark: z.string().default(HOST_DEFAULT_MAPPING.dark),
    light: z.string().default(HOST_DEFAULT_MAPPING.light),
  })
}

/** The exact registration call the Host half makes on the settings seam. */
export function registerNamespace(settings, z) {
  settings.register(SETTINGS_NAMESPACE, buildSchema(z))
}

/** One mutate op the browser half may send (subset of the settings seam). */
export function normalizeOps(input) {
  if (!Array.isArray(input) || input.length === 0) {
    throw new TypeError('ops must be a non-empty array of { op: "set" | "unset", path: string[] }')
  }
  for (const op of input) {
    if (typeof op !== 'object' || op === null) throw new TypeError('each op must be an object')
    if (op.op !== 'set' && op.op !== 'unset') throw new TypeError('op must be "set" or "unset"')
    if (!Array.isArray(op.path) || op.path.length === 0 || op.path.some((part) => typeof part !== 'string')) {
      throw new TypeError('op.path must be a non-empty array of strings')
    }
    if (op.op === 'set' && !['dark', 'light'].includes(op.path[0])) {
      throw new TypeError(`unknown field ${JSON.stringify(op.path[0])} (expected "dark" or "light")`)
    }
    if (op.op === 'set' && typeof op.value !== 'string') {
      throw new TypeError('op.value must be a string palette id')
    }
    if (op.op === 'unset' && !['dark', 'light'].includes(op.path[0])) {
      throw new TypeError(`unknown field ${JSON.stringify(op.path[0])} (expected "dark" or "light")`)
    }
  }
  return input.map((op) => ({ op: op.op, path: [...op.path], ...(op.op === 'set' ? { value: op.value } : {}) }))
}
