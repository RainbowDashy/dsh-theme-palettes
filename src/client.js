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
// scheme (light/dark) to a palette id via a settings-scope mapping, then stacks
// that palette's tokens as a `theme.overrideTokens` layer.

import { PALETTES } from './palettes.js'
import { registerPaletteSettings } from './settings.js'

export const SERVICE_NAME = 'themePalettes'
export const SETTINGS_NAMESPACE = 'theme-palettes'
export const LAYER_SOURCE = 'theme-palettes'
export const DEFAULT_MAPPING = { dark: 'vscode-red', light: 'default' }

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

  // Provide the public service (disposer owned by the fiber).
  ctx.effect(() => ctx.provide(SERVICE_NAME, { registerPalette, list }))

  // ---- Durable scheme → palette mapping ------------------------------------
  const scope = ctx.get('settingsScope')?.bind({ namespace: SETTINGS_NAMESPACE })

  function getMapping() {
    const section = scope ? scope.getSnapshot().value : undefined
    return {
      dark: section?.dark ?? DEFAULT_MAPPING.dark,
      light: section?.light ?? DEFAULT_MAPPING.light,
    }
  }

  function setMapping(scheme, id) {
    if (scope) scope.set(scheme, id)
  }

  // ---- Resolution ----------------------------------------------------------
  let disposeLayer = null
  let lastApplied = null // { scheme, paletteId }

  function resolve() {
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
  // theme/change (preference or resolved scheme change) re-resolves.
  ctx.on('theme/change', resolve)

  // Mapping echo guard: only re-resolve when the mapping actually changed.
  let lastMappingKey = JSON.stringify(getMapping())
  if (scope) {
    ctx.effect(() => scope.subscribe(() => {
      const key = JSON.stringify(getMapping())
      if (key === lastMappingKey) return
      lastMappingKey = key
      resolve()
      notifySettings()
    }))
  }

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
      subscribe: subscribeSettings,
      getMapping,
      setMapping,
      getPalettes: () => list(),
      getActiveScheme: () => theme.getTheme().active.colorScheme,
    })
  }
}
