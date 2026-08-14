// dsh-theme-palettes — scheme-mapped theme palette infrastructure for
// DeepSeek Harness.
//
// Authoring source for the Client-side Cordis plugin. `build.mjs` wraps this
// module (plus src/palettes.js and src/settings.js) into the `./client` bundle
// format the shell's module system expects (a classic script registering
// `window.__ModuleLoader__.load`), so keep the exports and the package name in
// sync with build.mjs.
//
// The plugin provides a `themePalettes` service (a palette registry with a
// built-in VSCode Red palette) and a runtime core that maps the resolved color
// scheme (light/dark) to a palette id via a persisted mapping (host-backed
// through this package's own HTTP route — the settings wire refuses
// third-party namespaces), then stacks that palette's tokens as a
// `theme.overrideTokens` layer.

import { PALETTES } from './palettes.js'
import { registerPaletteSettings } from './settings.js'

export const SERVICE_NAME = 'themePalettes'
export const SETTINGS_NAMESPACE = 'theme-palettes'
export const LAYER_SOURCE = 'theme-palettes'
export const DEFAULT_MAPPING = { dark: 'vscode-red', light: 'default' }
// Mirrors the Host-side HTTP_ROUTE in src/host-schema.js (the client bundle
// cannot import the host module).
export const HTTP_ROUTE = '/api/theme-palettes'

export const inject = ['theme']

export function apply(ctx) {
  // `theme` is guaranteed by the exported `inject`.
  const theme = ctx.theme

  // ---- Palette registry ----------------------------------------------------
  // id → { id, label, tokens, builtIn }. Built-ins are inserted first so the
  // insertion order already puts them ahead of third-party registrations;
  // list() still separates the two groups defensively.
  const registry = new Map()
  const registryListeners = new Set()

  function registryNotify() {
    for (const fn of [...registryListeners]) fn()
  }

  function onRegistryChange(fn) {
    registryListeners.add(fn)
    return () => registryListeners.delete(fn)
  }

  function list() {
    const builtIn = []
    const thirdParty = []
    for (const entry of registry.values()) {
      const item = {
        id: entry.id,
        label: entry.label,
        builtIn: entry.builtIn,
        // One representative color for catalog chips; 'transparent' when the
        // palette does not set the base-background token.
        swatch: entry.tokens['--dsw-alias-bg-base'] ?? 'transparent',
      }
      if (entry.builtIn) builtIn.push(item)
      else thirdParty.push(item)
    }
    return builtIn.concat(thirdParty)
  }

  function registerPalette({ id, label, tokens }) {
    if (registry.has(id)) throw new Error(`palette "${id}" is already registered`)
    registry.set(id, { id, label, tokens, builtIn: false })
    registryNotify()
    return () => {
      if (!registry.has(id)) return
      registry.delete(id)
      registryNotify()
    }
  }

  // Built-in palettes first, marked built-in.
  for (const palette of PALETTES) {
    registry.set(palette.id, { id: palette.id, label: palette.label, tokens: palette.tokens, builtIn: true })
  }

  // ---- Durable scheme → palette mapping ------------------------------------
  // The harness's settings WIRE serves only a hardcoded namespace allowlist
  // (`settings-not-exposed` for third-party namespaces), so the mapping cannot
  // go through the standard settings scope. Persistence runs through this
  // package's own HTTP route, which reads and writes the same user settings
  // document on the Host through the Host settings seam.
  const store = {
    status: 'loading', // 'loading' | 'ready' | 'unavailable'
    value: { ...DEFAULT_MAPPING },
    revision: undefined,
    writable: false,
  }
  const storeListeners = new Set()
  function subscribeStore(fn) {
    storeListeners.add(fn)
    return () => storeListeners.delete(fn)
  }
  function notifyStore() {
    for (const fn of [...storeListeners]) fn()
  }

  function getMapping() {
    return { ...store.value }
  }

  function applyServerView(data) {
    store.status = 'ready'
    store.value = {
      dark: data && typeof data.value?.dark === 'string' ? data.value.dark : DEFAULT_MAPPING.dark,
      light: data && typeof data.value?.light === 'string' ? data.value.light : DEFAULT_MAPPING.light,
    }
    store.revision = data && typeof data.revision === 'number' ? data.revision : undefined
    store.writable = data?.writable === true
    notifyStore()
  }

  async function loadMapping() {
    try {
      const response = await fetch(HTTP_ROUTE, { cache: 'no-store' })
      if (!response.ok) {
        if (store.status !== 'unavailable') {
          store.status = 'unavailable'
          notifyStore()
        }
        return
      }
      applyServerView(await response.json())
    } catch {
      if (store.status !== 'unavailable') {
        store.status = 'unavailable'
        notifyStore()
      }
    }
  }

  function setMapping(scheme, id) {
    if (getMapping()[scheme] === id) return
    // Optimistic: reflect the choice immediately; the write round-trip (or a
    // conflict recovery read) reconciles the authoritative value.
    store.value = { ...store.value, [scheme]: id }
    notifyStore()
    fetch(HTTP_ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ops: [{ op: 'set', path: [scheme], value: id }],
        ...(store.revision === undefined ? {} : { expectedRevision: store.revision }),
      }),
    }).then(async (response) => {
      if (!response.ok) {
        await loadMapping()
        return
      }
      applyServerView(await response.json())
    }).catch(() => {
      loadMapping().catch(() => {})
    })
  }

  // Provide the public service (disposer owned by the fiber). The mapping
  // accessors are the programmatic counterpart of the settings card.
  ctx.effect(() => ctx.provide(SERVICE_NAME, {
    registerPalette,
    list,
    getMapping,
    setMapping,
  }))

  // ---- Resolution ----------------------------------------------------------
  let disposeLayer = null
  let lastApplied = null // { scheme, paletteId }
  // Re-entrancy guard: overrideTokens and layer disposal publish a new
  // snapshot and emit theme/change SYNCHRONOUSLY, so a resolve that mutates
  // the theme re-enters this function through its own listener before
  // `lastApplied` is updated. Without the guard every non-noop resolve
  // re-applies itself until the stack overflows (observed live: the palette
  // survived a scheme switch and the next switch threw "Maximum call stack
  // size exceeded").
  let resolving = false

  function resolve() {
    if (resolving) return
    resolving = true
    try {
      const scheme = theme.getTheme().active.colorScheme
      const mapping = getMapping()
      const target = mapping[scheme] ?? DEFAULT_MAPPING[scheme]
      // Fail-soft: an unknown palette id behaves exactly like 'default'.
      const paletteId = target === 'default' || !registry.has(target) ? 'default' : target

      // Echo guard: skip no-op re-applies.
      if (lastApplied && lastApplied.scheme === scheme && lastApplied.paletteId === paletteId) {
        return
      }

      if (paletteId === 'default') {
        if (disposeLayer) {
          disposeLayer()
          disposeLayer = null
        }
      } else {
        const palette = registry.get(paletteId)
        const pairs = {}
        for (const [name, value] of Object.entries(palette.tokens)) {
          pairs[name] = { light: value, dark: value }
        }
        // overrideTokens REPLACES the previous layer with the same source, so a
        // palette switch needs no explicit dispose first.
        disposeLayer = theme.overrideTokens(LAYER_SOURCE, pairs)
      }

      lastApplied = { scheme, paletteId }
    } finally {
      resolving = false
    }
  }

  // ---- Settings-UI change notifications ------------------------------------
  const settingsListeners = new Set()
  function subscribeSettings(fn) {
    settingsListeners.add(fn)
    return () => settingsListeners.delete(fn)
  }
  function notifySettings() {
    for (const fn of [...settingsListeners]) fn()
  }

  // ---- Triggers ------------------------------------------------------------
  // theme/change (preference or resolved scheme change) re-resolves. The
  // resolution mutates the theme, which synchronously emits another
  // theme/change; running it on a microtask lets the CURRENT emit's listener
  // pass finish first, so listeners registered after this plugin (the layout
  // theme presenter) paint the post-resolution snapshot instead of the stale
  // pre-resolution one.
  ctx.on('theme/change', () => {
    Promise.resolve().then(resolve)
  })

  // Mapping echo guard: only re-resolve when the mapping actually changed.
  let lastMappingKey = JSON.stringify(getMapping())
  ctx.effect(() => subscribeStore(() => {
    const key = JSON.stringify(getMapping())
    if (key === lastMappingKey) return
    lastMappingKey = key
    resolve()
    notifySettings()
  }))

  // Server-side changes (this package's route or another browser) invalidate
  // the local copy through the forwarded settings-document event.
  const remote = ctx.get('remote')
  if (remote) {
    ctx.effect(() => remote.$on('settings/document-updated', (ns) => {
      if (ns !== SETTINGS_NAMESPACE) return
      loadMapping()
    }))
  }
  ctx.on('connection/reset', () => {
    loadMapping()
  })
  // Initial read; the store starts from the defaults while it is in flight.
  loadMapping()

  // Registry changes (register/dispose) re-resolve and refresh the settings UI.
  ctx.effect(() => onRegistryChange(() => {
    resolve()
    notifySettings()
  }))

  // Initial resolution.
  resolve()

  // ---- Settings UI ---------------------------------------------------------
  // `slots` is optional and read through ctx.get: the harness guard throws on
  // undeclared ctx.<service> property access, so the section receives it as a
  // dependency instead of reaching through the context.
  const slots = ctx.get('slots')
  if (slots) {
    registerPaletteSettings(slots, {
      subscribe: subscribeStore,
      getMapping,
      setMapping,
      getPalettes: () => list(),
      getStatus: () => store.status,
      getActiveScheme: () => theme.getTheme().active.colorScheme,
    })
  }
}
