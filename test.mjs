// Zero-dependency Node ESM test for dsh-theme-palettes.
//
// Run with `node test.mjs` after `node build.mjs`. It loads the GENERATED
// client bundle, stubs `window.__ModuleLoader__.load`, calls the factory with
// a fake `require` (returning `{}` for "react" — the UI functions are never
// invoked), and exercises `apply` against a fake ctx.

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

function makeScope(initial = {}) {
  const data = { ...initial }
  const listeners = new Set()
  const scope = {
    getSnapshot() {
      return { value: { ...data } }
    },
    set(field, value) {
      if (data[field] === value) return
      data[field] = value
      for (const fn of [...listeners]) fn()
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    _emit() {
      for (const fn of [...listeners]) fn()
    },
  }
  return scope
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

// ---- fake host route (the /api/theme-palettes surface) ----------------------
// Installed as globalThis.fetch for the whole run; the client bundle persists
// through it. Returns a `server` mirror the tests can seed and assert against.
function installFakeHost(mappingSeed = {}) {
  const server = {
    value: { ...mappingSeed },
    revision: 1,
    writable: true,
    posted: [],
  }
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url)
    if (!target.includes('theme-palettes')) {
      return { ok: false, status: 404, json: async () => ({}) }
    }
    if (options.method === 'POST') {
      const body = JSON.parse(options.body)
      server.posted.push(body)
      for (const op of body.ops) {
        if (op.op === 'set') server.value[op.path[0]] = op.value
        else delete server.value[op.path[0]]
      }
      server.revision += 1
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        value: { ...server.value },
        revision: server.revision,
        writable: server.writable,
      }),
    }
  }
  return server
}

const fakeHost = installFakeHost()

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

function makeCtx({ theme, scope, slots, remote }) {
  const events = new Map()
  const provided = {}
  const ctx = {
    theme,
    get(name) {
      if (name === 'settingsScope') return scope ? { bind: () => scope } : undefined
      if (name === 'slots') return slots
      if (name === 'remote') return remote
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
  const { scheme = 'dark', scopeData = {}, withSlots = true, emitting = false, hostSeed = {} } = options
  fakeHost.value = { ...hostSeed }
  fakeHost.posted.length = 0
  const scope = makeScope(scopeData)
  const slots = withSlots ? makeSlots() : undefined
  const remote = makeRemote()
  const ctx = makeCtx({ theme: null, scope, slots, remote })
  const theme = makeTheme(scheme, { emit: emitting ? () => ctx.emit('theme/change', theme.getTheme()) : undefined })
  ctx.theme = theme
  mod.apply(ctx)
  const service = ctx._provided.themePalettes
  return { theme, scope, slots, remote, ctx, service }
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
  const { theme, slots, service } = setup()

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
  assertEq(registered.id, 'theme-palettes', 'settings.plugin.item id')
  assertEq(registered.order, 30, 'settings.plugin.item order')
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
  await tick() // let the initial GET land the seeded mapping
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

await run('host op validation accepts only dark/light edits', async () => {
  const { normalizeOps } = await import('./src/host-schema.js')
  assertEq(normalizeOps([{ op: 'set', path: ['dark'], value: 'default' }]), [{ op: 'set', path: ['dark'], value: 'default' }], 'valid set op passes through')
  assertEq(normalizeOps([{ op: 'unset', path: ['light'] }]), [{ op: 'unset', path: ['light'] }], 'valid unset op passes through')
  for (const bad of [
    [],
    [{ op: 'set', path: [] }],
    [{ op: 'set', path: ['unknown'], value: 'x' }],
    [{ op: 'set', path: ['dark'], value: 42 }],
    [{ op: 'merge', path: ['dark'], value: 'x' }],
    'not-an-array',
  ]) {
    let threw = false
    try {
      normalizeOps(bad)
    } catch {
      threw = true
    }
    assert(threw, `normalizeOps rejects ${JSON.stringify(bad)}`)
  }
})

// ---- scenario: persistence through the private host route ------------------

await run('mapping writes persist through the host route', async () => {
  const { service } = setup({ scheme: 'dark' })
  await tick() // let the initial GET land the server revision
  service.setMapping('light', 'vscode-red')
  await tick()
  assertEq(fakeHost.value.light, 'vscode-red', 'POST landed the light mapping on the host')
  const posted = fakeHost.posted[fakeHost.posted.length - 1]
  assert(posted, 'a POST was sent')
  assertEq(posted.ops, [{ op: 'set', path: ['light'], value: 'vscode-red' }], 'POST carried the set op')
  assert(typeof posted.expectedRevision === 'number', 'POST carried the expected revision')
  assertEq(service.getMapping(), { dark: 'default', light: 'vscode-red' }, 'local mapping reflects the write, dark stays on the stock default')
})

await run('server-side mapping changes re-resolve the layer', async () => {
  const { theme, remote } = setup({ scheme: 'dark', hostSeed: { dark: 'vscode-red' } })
  await tick()
  assertEq(theme._calls.length, 1, 'seeded mapping applied the initial layer')
  fakeHost.value.dark = 'default'
  fakeHost.revision += 1
  remote._emit('settings/document-updated', 'theme-palettes')
  await tick()
  assertEq(theme._disposedCount(), 1, 'server-side dark → default disposes the layer')
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
