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

function run(name, fn) {
  try {
    fn()
    console.log(`ok: ${name}`)
  } catch (error) {
    failures += 1
    console.error(`FAIL: ${name}`)
    console.error(`    ${error && error.message ? error.message : error}`)
  }
}

// ---- fakes -----------------------------------------------------------------

function makeTheme(initialScheme = 'dark') {
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
      return () => {
        if (!layer.disposed) layer.disposed = true
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

function makeCtx({ theme, scope, slots }) {
  const events = new Map()
  const provided = {}
  const ctx = {
    theme,
    get(name) {
      if (name === 'settingsScope') return scope ? { bind: () => scope } : undefined
      if (name === 'slots') return slots
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
    slots,
    _provided: provided,
  }
  return ctx
}

function setup(options = {}) {
  const { scheme = 'dark', scopeData = {}, withSlots = true } = options
  const theme = makeTheme(scheme)
  const scope = makeScope(scopeData)
  const slots = withSlots ? makeSlots() : undefined
  const ctx = makeCtx({ theme, scope, slots })
  mod.apply(ctx)
  const service = ctx._provided.themePalettes
  return { theme, scope, slots, ctx, service }
}

// ---- load the module and grab exports --------------------------------------

assert(loaded, 'window.__ModuleLoader__.load was called')
assertEq(loaded.id, 'dsh-theme-palettes', 'bundle registers under the package name')

const fakeRequire = (specifier) => (specifier === 'react' ? {} : undefined)
const mod = loaded.factory(fakeRequire)
assertEq(Array.from(mod.inject), ['theme'], 'module exports inject = [theme]')
assert(typeof mod.apply === 'function', 'module exports apply')

// ---- scenario: initial resolve + built-in registration + slot --------------

run('built-in palette registered, listed, and applied', () => {
  const { theme, slots, service } = setup()

  assert(service, 'themePalettes service provided')
  assertEq(service.list(), [{ id: 'vscode-red', label: 'VSCode Red', builtIn: true, swatch: '#390000' }], 'built-in listed with builtIn: true and swatch')

  assertEq(theme._calls.length, 1, 'exactly one override layer applied on init')
  assertEq(theme._calls[0].source, 'theme-palettes', 'override layer source')
  assertEq(theme._calls[0].tokens['--dsw-alias-bg-base'], { light: '#390000', dark: '#390000' }, 'pairs map token → { light, dark }')

  const reg = slots._registrations.find((r) => r.name === 'settings.section')
  assert(reg, 'settings.section slot injected')
  const registered = reg.factory()
  assertEq(registered.id, 'palettes', 'settings.section id')
  assertEq(registered.order, 1, 'settings.section order')
  assertEq(registered.label(), 'Theme palettes', 'settings.section label')
})

// ---- scenario: duplicate registration throws --------------------------------

run('duplicate registration throws', () => {
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

run('scheme change to light (default) disposes the layer', () => {
  const { theme, ctx } = setup({ scheme: 'dark' })
  assertEq(theme._disposedCount(), 0, 'no disposal before scheme change')
  theme.setScheme('light')
  ctx.emit('theme/change', theme.getTheme())
  assertEq(theme._disposedCount(), 1, 'layer disposed when light maps to default')
})

// ---- scenario: mapping change to default disposes ---------------------------

run('mapping change to default disposes the layer', () => {
  const { theme, scope } = setup({ scheme: 'dark' })
  assertEq(theme._calls.length, 1, 'dark default mapping applied a layer')
  scope.set('dark', 'default')
  assertEq(theme._disposedCount(), 1, 'layer disposed when dark mapping set to default')
})

// ---- scenario: unknown palette id falls back to default (no throw) ----------

run('unknown palette id falls back to default without throwing', () => {
  const { theme, ctx } = setup({ scheme: 'dark', scopeData: { dark: 'no-such-palette' } })
  assertEq(theme._calls.length, 0, 'no layer applied for unknown palette id')
  theme.setScheme('light')
  ctx.emit('theme/change', theme.getTheme())
  assertEq(theme._calls.length, 0, 'still no layer after a scheme change under unknown palette')
})

// ---- scenario: echo guard (no duplicate overrideTokens for no-op) -----------

run('echo guard skips no-op re-resolves', () => {
  const { theme, ctx, scope } = setup({ scheme: 'dark' })
  assertEq(theme._calls.length, 1, 'initial layer applied')
  ctx.emit('theme/change', theme.getTheme())
  assertEq(theme._calls.length, 1, 'no duplicate overrideTokens on same-scheme theme/change')
  scope._emit()
  assertEq(theme._calls.length, 1, 'no duplicate overrideTokens on unchanged mapping')
})

// ---- scenario: third-party registration ------------------------------------

run('third-party registerPalette works and list reflects it', () => {
  const { service } = setup({ scheme: 'dark' })
  const dispose = service.registerPalette({ id: 'blue', label: 'Blue', tokens: { '--dsw-alias-bg-base': '#0000ff' } })
  assertEq(service.list(), [
    { id: 'vscode-red', label: 'VSCode Red', builtIn: true, swatch: '#390000' },
    { id: 'blue', label: 'Blue', builtIn: false, swatch: '#0000ff' },
  ], 'third-party palette listed after built-in with builtIn: false and swatch')
  dispose()
  assertEq(service.list(), [{ id: 'vscode-red', label: 'VSCode Red', builtIn: true, swatch: '#390000' }], 'disposing removes the palette')
})

// ---- result -----------------------------------------------------------------

if (failures > 0) {
  console.error(`${failures} test(s) failed`)
  process.exit(1)
}
console.log('all tests passed')
