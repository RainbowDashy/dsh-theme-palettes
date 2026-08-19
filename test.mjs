// Zero-dependency Node ESM test for dsh-theme-palettes.
//
// Run with `node test.mjs` after `node build.mjs`. It loads the GENERATED
// client bundle, stubs `window.__ModuleLoader__.load`, calls the factory with
// a fake `require` (returning `{}` for "react" — the UI functions are never
// invoked), and exercises `apply` against a fake ctx.
//
// rc7 persistence model under test: the Host registers the `theme-palettes`
// settings namespace on the settings seam; the browser half reads and writes
// it through a `settingsScope` binder (`settingsScope.bind({ namespace })`),
// which mirrors the real binder's wiring: an initial async read, a reload on
// the forwarded `settings/document-updated` event and on `connection/reset`,
// and a `set()` that writes through and publishes the accepted snapshot.

let loaded = null
globalThis.window = {
  __ModuleLoader__: {
    load(def) {
      loaded = def
    },
  },
}

await import('./client.js')

// ---- tiny assertion helpers ------------------------------------------------
let failures = 0

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

function assertEq(actual, expected, msg) {
  const a = JSON.stringify(actual)
  const b = JSON.stringify(expected)
  if (a !== b) throw new Error(`${msg}\n    expected: ${b}\n    actual:   ${a}`)
}

async function run(name, fn) {
  try {
    await fn()
    console.log(`ok: ${name}`)
  } catch (error) {
    failures += 1
    console.error(`FAIL: ${name}`)
    console.error(`    ${error && error.message ? error.message : error}`)
  }
}

/** Let deferred microtasks (the runtime's re-resolve scheduling) settle. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

// ---- fakes -----------------------------------------------------------------

function makeTheme(initialScheme = 'dark', options = {}) {
  const state = { scheme: initialScheme }
  const calls = []
  const layers = []
  const theme = {
    getTheme() {
      return { active: { colorScheme: state.scheme } }
    },
    setScheme(scheme) {
      state.scheme = scheme
    },
    overrideTokens(source, tokens) {
      calls.push({ source, tokens })
      const layer = { source, tokens, disposed: false }
      layers.push(layer)
      // Faithful to the real ThemeRuntime: applying an override publishes and
      // emits theme/change SYNCHRONOUSLY, before the call returns.
      if (options.emit) options.emit()
      return () => {
        // Faithful to the real ThemeRuntime: the disposer is a no-op once the
        // layer was already removed or replaced (it emits only on the FIRST
        // dispose).
        if (layer.disposed) return
        layer.disposed = true
        if (options.emit) options.emit()
      }
    },
    _calls: calls,
    _disposedCount: () => layers.filter((layer) => layer.disposed).length,
  }
  return theme
}

function makeRemote() {
  const listeners = new Map()
  const remote = {
    $on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, [])
      listeners.get(event).push(fn)
      return () => {
        const arr = listeners.get(event)
        if (!arr) return
        const index = arr.indexOf(fn)
        if (index >= 0) arr.splice(index, 1)
      }
    },
    _emit(event, payload) {
      for (const fn of [...(listeners.get(event) ?? [])]) fn(payload)
    },
  }
  return remote
}

// ---- fake settings seam + settingsScope binder ------------------------------
// `host` is the Host-side settings document (the namespace's resolved value
// and revision). `makeScopeController` is a faithful-enough `SettingsScope`:
// a snapshot store whose initial snapshot is `loading`, whose load is
// deferred (like the real controller's enqueued read), and whose `set`
// writes through to the host and publishes the accepted snapshot.
function makeHost(seed = {}) {
  return {
    value: { ...seed },
    revision: 1,
    writable: true,
  }
}

function makeScopeController(host) {
  const listeners = new Set()
  const state = {
    status: 'loading',
    value: undefined,
    revision: undefined,
    writable: host.writable,
    mode: 'host',
  }
  const scope = {
    getSnapshot() {
      return { ...state, value: state.value ? { ...state.value } : undefined }
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    async load() {
      // Deferred like the real controller's enqueued read, so the plugin's
      // synchronous initial `getSnapshot()` sees the `loading` snapshot.
      await Promise.resolve()
      state.value = { ...host.value }
      state.revision = host.revision
      state.status = 'ready'
      for (const fn of [...listeners]) fn()
    },
    async set(field, value) {
      host.value = { ...host.value, [field]: value }
      host.revision += 1
      await scope.load()
    },
    _emit() {
      for (const fn of [...listeners]) fn()
    },
  }
  return scope
}

// Mirrors the real binder's wiring: one bound scope per namespace, reloading
// on the forwarded settings-document event (only for that namespace) and on
// connection resets, with the initial read started at bind time.
function makeBinder(remote, ctx, host) {
  const binder = {
    _bound: [],
    bind(spec) {
      binder._bound.push(spec)
      const scope = makeScopeController(host)
      const refresh = () => scope.load().catch(() => {})
      remote.$on('settings/document-updated', (ns) => {
        if (ns !== spec.namespace) return
        refresh()
      })
      ctx.on('connection/reset', () => refresh())
      refresh()
      return scope
    },
  }
  return binder
}

const host = makeHost()

function makeSlots() {
  const registrations = []
  const slots = {
    inject(name, factory) {
      registrations.push({ name, factory })
    },
    register(options, component) {
      return { ...options, component }
    },
    _registrations: registrations,
  }
  return slots
}

function makeCtx({ theme, getBinder, slots, remote }) {
  const events = new Map()
  const provided = {}
  const ctx = {
    theme,
    get(name) {
      // Absent services read as `undefined` on the real context, never null.
      if (name === 'settingsScope') return getBinder() ?? undefined
      if (name === 'slots') return slots ?? undefined
      return undefined
    },
    provide(name, value) {
      provided[name] = value
      return () => {
        delete provided[name]
      }
    },
    on(event, fn) {
      if (!events.has(event)) events.set(event, [])
      events.get(event).push(fn)
      return () => {
        const arr = events.get(event)
        const index = arr.indexOf(fn)
        if (index >= 0) arr.splice(index, 1)
      }
    },
    emit(event, payload) {
      for (const fn of [...(events.get(event) ?? [])]) fn(payload)
    },
    effect(fn) {
      // Real ctx.effect runs the callback immediately (capturing its side
      // effects, e.g. ctx.provide or scope.subscribe) and defers the returned
      // disposer until fiber dispose. Run it, but do NOT dispose here.
      fn()
    },
    // Faithful to the harness loader guard: accessing an undeclared
    // ctx.<service> property throws, so tests go red if the bundle ever
    // reaches through the context instead of using ctx.get / inject.
    get slots() {
      throw new Error('cannot get property "slots" without inject')
    },
    get settingsScope() {
      throw new Error('cannot get property "settingsScope" without inject')
    },
    _provided: provided,
  }
  return ctx
}

function setup(options = {}) {
  const { scheme = 'dark', withSlots = true, withScope = true, emitting = false, hostSeed = {} } = options
  host.value = { ...hostSeed }
  host.revision = 1
  const slots = withSlots ? makeSlots() : undefined
  const remote = makeRemote()
  let binder = null
  const ctx = makeCtx({
    theme: null,
    getBinder: () => binder,
    slots,
    remote,
  })
  if (withScope) binder = makeBinder(remote, ctx, host)
  const theme = makeTheme(scheme, { emit: emitting ? () => ctx.emit('theme/change', theme.getTheme()) : undefined })
  ctx.theme = theme
  mod.apply(ctx)
  const service = ctx._provided.themePalettes
  return { theme, binder, slots, remote, ctx, service }
}

// ---- load the module and grab exports --------------------------------------

assert(loaded, 'window.__ModuleLoader__.load was called')
assertEq(loaded.id, 'dsh-theme-palettes', 'bundle registers under the package name')

const fakeRequire = (specifier) => (specifier === 'react' ? {} : undefined)
const mod = loaded.factory(fakeRequire)
assertEq(Array.from(mod.inject), ['theme'], 'module exports inject = [theme]')
assert(typeof mod.apply === 'function', 'module exports apply')

// ---- scenario: initial resolve + built-in registration + slot --------------

await run('built-in palette registered, listed, and applied', () => {
  const { theme, binder, slots, service } = setup()

  assert(service, 'themePalettes service provided')
  assertEq(service.list(), [
    { id: 'vscode-red', label: 'VSCode Red', builtIn: true, swatch: '#390000', accent: '#cc3333' },
    { id: 'solarized-dark', label: 'Solarized Dark', builtIn: true, swatch: '#002b36', accent: '#2aa198' },
    { id: 'solarized-light', label: 'Solarized Light', builtIn: true, swatch: '#fdf6e3', accent: '#b58900' },
  ], 'built-ins listed with builtIn: true, swatch, and accent')

  assertEq(theme._calls.length, 0, 'no override layer on init: both schemes default to the stock palette')
  service.setMapping('dark', 'vscode-red')
  assertEq(theme._calls.length, 1, 'mapping dark to a palette applies the override layer')
  assertEq(theme._calls[0].source, 'theme-palettes', 'override layer source')
  assertEq(theme._calls[0].tokens['--dsw-alias-bg-base'], { light: '#390000', dark: '#390000' }, 'pairs map token → { light, dark }')

  const reg = slots._registrations.find((r) => r.name === 'settings.plugin.item')
  assert(reg, 'settings.plugin.item slot injected')
  const registered = reg.factory()
  assertEq(registered.key, 'theme-palettes', 'settings.plugin.item key is the settings namespace (rc7 keyed contract)')
  assert(registered.id === undefined, 'keyed registration carries no list-slot id')
  assert(registered.order === undefined, 'keyed registration carries no list-slot order')

  assert(binder._bound.length === 1, 'one settings scope bound')
  assertEq(binder._bound[0].namespace, 'theme-palettes', 'scope binds the settings namespace the card is keyed by')
})

// ---- scenario: solarized built-ins ------------------------------------------

await run('solarized palettes carry complete, flat, valid token maps', async () => {
  const { PALETTES } = await import('./src/palettes.js')
  const catalog = Object.fromEntries(PALETTES.map((palette) => [palette.id, palette]))
  const CORE_TOKENS = ['--dsw-alias-bg-base', '--dsw-alias-brand-primary', '--dsw-alias-label-primary', '--dsw-specific-sidebar-fill']

  for (const id of ['solarized-dark', 'solarized-light']) {
    const palette = catalog[id]
    assert(palette, `${id} is in the built-in catalog`)
    const names = Object.keys(palette.tokens)
    assertEq(names.length, 89, `${id} covers every non-static design token`)
    for (const name of names) {
      assert(typeof palette.tokens[name] === 'string', `${id}: ${name} is a flat CSS value string`)
    }
    for (const name of CORE_TOKENS) {
      assert(palette.tokens[name], `${id} sets ${name}`)
    }
  }

  assert(catalog['solarized-dark'].tokens['--dsw-alias-bg-base'] !== catalog['solarized-light'].tokens['--dsw-alias-bg-base'], 'dark and light solarized bases differ')
  assertEq(catalog['solarized-dark'].tokens['--dsw-alias-label-primary'], '#839496', 'dark body text is canonical base0')
  assertEq(catalog['solarized-light'].tokens['--dsw-alias-label-primary'], '#657b83', 'light body text is canonical base00')
  assertEq(catalog['solarized-dark'].tokens['--dsw-alias-state-error-primary'], '#dc322f', 'dark error is canonical red')
  assertEq(catalog['solarized-light'].tokens['--dsw-alias-state-warn-primary'], '#b58900', 'light warning is canonical yellow')
})

await run('mapping a scheme to a solarized palette applies its layer', async () => {
  const { theme, service } = setup({ scheme: 'dark' })
  service.setMapping('dark', 'solarized-dark')
  assertEq(theme._calls.length, 1, 'mapping dark to solarized-dark applies the override layer')
  assertEq(theme._calls[0].tokens['--dsw-alias-bg-base'], { light: '#002b36', dark: '#002b36' }, 'solarized-dark base pairs for both schemes')
  service.setMapping('dark', 'solarized-light')
  assertEq(theme._calls.length, 2, 'switching palettes re-applies the layer')
  assertEq(theme._calls[1].tokens['--dsw-alias-bg-base'], { light: '#fdf6e3', dark: '#fdf6e3' }, 'solarized-light base pairs for both schemes')
})

// ---- scenario: duplicate registration throws --------------------------------

await run('duplicate registration throws', () => {
  const { service } = setup()
  let threw = false
  try {
    service.registerPalette({ id: 'vscode-red', label: 'X', tokens: {} })
  } catch (error) {
    threw = true
    assert(/already registered/.test(error.message), 'duplicate error message mentions "already registered"')
  }
  assert(threw, 'registerPalette with a duplicate id throws')
})

// ---- scenario: scheme change to light disposes the layer --------------------

await run('scheme change to light (default) disposes the layer', async () => {
  const { theme, ctx } = setup({ scheme: 'dark', hostSeed: { dark: 'vscode-red' } })
  await tick() // let the initial scope read land the seeded mapping
  assertEq(theme._calls.length, 1, 'seeded dark mapping applied a layer')
  assertEq(theme._disposedCount(), 0, 'no disposal before scheme change')
  theme.setScheme('light')
  ctx.emit('theme/change', theme.getTheme())
  await tick()
  assertEq(theme._disposedCount(), 1, 'layer disposed when light maps to default')
})

// ---- scenario: mapping change to default disposes ---------------------------

await run('mapping change to default disposes the layer', async () => {
  const { theme, service } = setup({ scheme: 'dark', hostSeed: { dark: 'vscode-red' } })
  await tick()
  assertEq(theme._calls.length, 1, 'seeded dark mapping applied a layer')
  service.setMapping('dark', 'default')
  assertEq(theme._disposedCount(), 1, 'layer disposed when dark mapping set to default')
})

// ---- scenario: unknown palette id falls back to default (no throw) ----------

await run('unknown palette id falls back to default without throwing', async () => {
  const { theme, ctx } = setup({ scheme: 'dark', hostSeed: { dark: 'no-such-palette' } })
  assertEq(theme._calls.length, 0, 'no layer before the server read lands')
  await tick()
  assertEq(theme._calls.length, 0, 'unknown palette id never applies a layer')
  assertEq(theme._disposedCount(), 0, 'nothing to dispose under an unknown palette')
  theme.setScheme('light')
  ctx.emit('theme/change', theme.getTheme())
  await tick()
  assertEq(theme._calls.length, 0, 'still no layer after a scheme change under unknown palette')
})

// ---- scenario: echo guard (no duplicate overrideTokens for no-op) -----------

await run('echo guard skips no-op re-resolves', async () => {
  const { theme, ctx, remote } = setup({ scheme: 'dark', hostSeed: { dark: 'vscode-red' } })
  await tick()
  assertEq(theme._calls.length, 1, 'seeded mapping applied the initial layer')
  ctx.emit('theme/change', theme.getTheme())
  await tick()
  assertEq(theme._calls.length, 1, 'no duplicate overrideTokens on same-scheme theme/change')
  remote._emit('settings/document-updated', 'theme-palettes')
  await tick()
  assertEq(theme._calls.length, 1, 'no duplicate overrideTokens on unchanged mapping')
  remote._emit('settings/document-updated', 'ui-theme')
  await tick()
  assertEq(theme._calls.length, 1, 'other namespaces do not trigger a re-resolve')
})

// ---- scenario: emitting theme (real ThemeRuntime semantics) ----------------
// The real ThemeRuntime publishes a snapshot and emits theme/change
// SYNCHRONOUSLY from overrideTokens and from the layer disposer. These tests
// reproduce the live bug: without a re-entrancy guard the initial apply
// re-applies itself until the stack overflows, and a scheme round-trip
// desynchronizes the echo guard from the actual layer (the palette survived
// switching to light, and the next switch to dark threw "Maximum call stack
// size exceeded").

await run('emitting theme: seeded mapping applies exactly one layer (no synchronous re-entry)', async () => {
  const { theme } = setup({ scheme: 'dark', hostSeed: { dark: 'vscode-red' }, emitting: true })
  await tick()
  assertEq(theme._calls.length, 1, 'exactly one overrideTokens despite synchronous theme/change re-emission')
})

await run('emitting theme: dark → light → dark round-trip stays consistent', async () => {
  const { theme, ctx } = setup({ scheme: 'dark', hostSeed: { dark: 'vscode-red' }, emitting: true })
  await tick()
  assertEq(theme._calls.length, 1, 'seeded dark mapping applied a layer')
  theme.setScheme('light')
  ctx.emit('theme/change', theme.getTheme())
  await tick()
  assertEq(theme._disposedCount(), 1, 'layer disposed when light maps to default')
  assertEq(theme._calls.length, 1, 'no re-applied layer in light (default)')
  theme.setScheme('dark')
  ctx.emit('theme/change', theme.getTheme())
  await tick()
  assertEq(theme._calls.length, 2, 'dark mapping re-applies the layer after returning to dark')
  assertEq(theme._disposedCount(), 1, 'exactly the original layer was disposed')
})

await run('emitting theme: repeated scheme flips stay bounded and consistent', async () => {
  const { theme, ctx } = setup({ scheme: 'dark', hostSeed: { dark: 'vscode-red' }, emitting: true })
  await tick()
  for (let i = 0; i < 3; i++) {
    theme.setScheme('light')
    ctx.emit('theme/change', theme.getTheme())
    await tick()
    theme.setScheme('dark')
    ctx.emit('theme/change', theme.getTheme())
    await tick()
  }
  assertEq(theme._calls.length, 4, 'one apply per dark entry after three light/dark cycles')
  assertEq(theme._disposedCount(), 3, 'one dispose per light entry')
})

// ---- scenario: host namespace contract -------------------------------------

await run('host schema resolves defaults and preserves user fields', async () => {
  const { SETTINGS_NAMESPACE, HOST_DEFAULT_MAPPING, buildSchema, registerNamespace } = await import('./src/host-schema.js')
  assertEq(SETTINGS_NAMESPACE, 'theme-palettes', 'namespace is lowercase kebab-case')
  assertEq(HOST_DEFAULT_MAPPING, { dark: 'default', light: 'default' }, 'host defaults match the client defaults')

  // Minimal schemastery-shaped fake: string().default(v) resolves v when the
  // field is absent; object() validates the two declared fields.
  const fakeZ = {
    string: () => ({
      default: (value) => (input) => (input === undefined ? value : input),
    }),
    object: (fields) => (input) => {
      const out = {}
      for (const [name, resolve] of Object.entries(fields)) out[name] = resolve(input ? input[name] : undefined)
      return out
    },
  }
  const schema = buildSchema(fakeZ)
  assertEq(schema({}), { dark: 'default', light: 'default' }, 'schema resolves defaults for an empty section')
  assertEq(schema({ dark: 'vscode-red' }), { dark: 'vscode-red', light: 'default' }, 'schema keeps user overrides')

  let registered = null
  const settings = { register: (ns, received) => { registered = { ns, schema: received } } }
  registerNamespace(settings, fakeZ)
  assert(registered, 'registerNamespace calls settings.register')
  assertEq(registered.ns, 'theme-palettes', 'registerNamespace registers under the namespace')
  assertEq(registered.schema({}), { dark: 'default', light: 'default' }, 'registered schema resolves defaults')
})

// ---- scenario: persistence through the settings scope -----------------------

await run('mapping writes persist through the settings scope', async () => {
  const { service } = setup({ scheme: 'dark' })
  await tick() // let the initial scope read land the host revision
  service.setMapping('light', 'vscode-red')
  await tick()
  assertEq(host.value.light, 'vscode-red', 'scope.set landed the light mapping on the host document')
  assertEq(service.getMapping(), { dark: 'default', light: 'vscode-red' }, 'local mapping reflects the write, dark stays on the stock default')
})

await run('server-side mapping changes re-resolve the layer', async () => {
  const { theme, remote } = setup({ scheme: 'dark', hostSeed: { dark: 'vscode-red' } })
  await tick()
  assertEq(theme._calls.length, 1, 'seeded mapping applied the initial layer')
  host.value.dark = 'default'
  host.revision += 1
  remote._emit('settings/document-updated', 'theme-palettes')
  await tick()
  assertEq(theme._disposedCount(), 1, 'server-side dark → default disposes the layer')
})

await run('connection reset reloads the mapping from the host', async () => {
  const { theme, ctx } = setup({ scheme: 'dark', hostSeed: { dark: 'vscode-red' } })
  await tick()
  assertEq(theme._calls.length, 1, 'seeded mapping applied the initial layer')
  host.value.dark = 'default'
  host.revision += 1
  ctx.emit('connection/reset')
  await tick()
  assertEq(theme._disposedCount(), 1, 'reconnect reload disposed the layer for dark → default')
})

// ---- scenario: composition without the settings surface ---------------------

await run('without the settings surface the store is unavailable but the plugin still works', () => {
  const { service, theme } = setup({ scheme: 'dark', withScope: false })
  assertEq(service.getMapping(), { dark: 'default', light: 'default' }, 'mapping stays on the defaults')
  service.setMapping('dark', 'vscode-red')
  assertEq(theme._calls.length, 1, 'the override layer still applies without persistence')
  assertEq(theme._calls[0].source, 'theme-palettes', 'override layer source')
})

// ---- scenario: third-party registration ------------------------------------

await run('third-party registerPalette works and list reflects it', () => {
  const { service } = setup({ scheme: 'dark' })
  const dispose = service.registerPalette({ id: 'blue', label: 'Blue', tokens: { '--dsw-alias-bg-base': '#0000ff' } })
  assertEq(service.list(), [
    { id: 'vscode-red', label: 'VSCode Red', builtIn: true, swatch: '#390000', accent: '#cc3333' },
    { id: 'solarized-dark', label: 'Solarized Dark', builtIn: true, swatch: '#002b36', accent: '#2aa198' },
    { id: 'solarized-light', label: 'Solarized Light', builtIn: true, swatch: '#fdf6e3', accent: '#b58900' },
    { id: 'blue', label: 'Blue', builtIn: false, swatch: '#0000ff', accent: '#0000ff' },
  ], 'third-party palette listed after built-ins with builtIn: false, swatch, and accent (falls back to base)')
  dispose()
  assertEq(service.list(), [
    { id: 'vscode-red', label: 'VSCode Red', builtIn: true, swatch: '#390000', accent: '#cc3333' },
    { id: 'solarized-dark', label: 'Solarized Dark', builtIn: true, swatch: '#002b36', accent: '#2aa198' },
    { id: 'solarized-light', label: 'Solarized Light', builtIn: true, swatch: '#fdf6e3', accent: '#b58900' },
  ], 'disposing removes the palette')
})

// ---- result -----------------------------------------------------------------

if (failures > 0) {
  console.error(`${failures} test(s) failed`)
  process.exit(1)
}
console.log('all tests passed')
