// dsh-theme-palettes — Host namespace contract (pure, dependency-free).
//
// rc7: the harness settings WIRE serves every namespace a Host plugin
// registers (the old hardcoded allowlist and the `settings-not-exposed` error
// are gone), so the Host half only has to register the namespace on the Host
// settings seam. The wire then exposes it to the browser through the standard
// settings scope, which the browser half reads and writes — and the Plugin
// configuration tab dispatches a card for it because the card is keyed by
// this same namespace.
//
// This module carries the contract pieces the zero-dependency test suite
// exercises; `src/host.js` wires them to the real schemastery import.

/** Settings namespace owned by this package (lowercase kebab-case). */
export const SETTINGS_NAMESPACE = 'theme-palettes'

/** Fallback mapping used until a user override exists. */
export const HOST_DEFAULT_MAPPING = { dark: 'default', light: 'default' }

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
