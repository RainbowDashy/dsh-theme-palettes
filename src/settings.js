// dsh-theme-palettes — settings section UI.
//
// Authored as ESM but never executed directly in the browser: `build.mjs`
// inlines the `registerPaletteSettings` function source into the generated
// client bundle. `React` is therefore a FREE identifier here — the factory
// declares `const React = require("react")` before this source, so do NOT
// import it. Everything else the section needs comes from `deps`.

export function registerPaletteSettings(ctx, deps) {
  function Section() {
    const [mapping, setMapping] = React.useState(() => deps.getMapping())
    const [palettes, setPalettes] = React.useState(() => deps.getPalettes())

    React.useEffect(() => deps.subscribe(() => {
      setMapping(deps.getMapping())
      setPalettes(deps.getPalettes())
    }), [])

    // Build one dropdown's option set. A mapping id that no longer resolves to
    // a registered palette stays visible as an extra "(unavailable)" option so
    // the user can see (and replace) it.
    const buildOptions = (scheme) => {
      const current = mapping[scheme]
      const options = [{ id: 'default', label: 'Default' }]
      for (const palette of palettes) {
        options.push({ id: palette.id, label: palette.label })
      }
      if (current !== 'default' && !palettes.some((palette) => palette.id === current)) {
        options.push({ id: current, label: `${current} (unavailable)` })
      }
      return options
    }

    const change = (scheme, value) => {
      deps.setMapping(scheme, value)
      // Optimistically reflect the choice; the subscription reconciles with
      // the authoritative mapping once the settings write round-trips.
      setMapping((prev) => ({ ...prev, [scheme]: value }))
    }

    const renderSelect = (title, scheme) => {
      const options = buildOptions(scheme)
      return React.createElement('div', null,
        React.createElement('label', null, title),
        React.createElement('select', {
          value: mapping[scheme],
          onChange: (event) => change(scheme, event.target.value),
        },
          options.map((option) =>
            React.createElement('option', { key: option.id, value: option.id }, option.label)
          )
        )
      )
    }

    const renderCatalogRow = (palette) => {
      const chip = React.createElement('span', {
        style: {
          display: 'inline-block',
          width: '14px',
          height: '14px',
          borderRadius: '3px',
          backgroundColor: palette.swatch ?? 'transparent',
        },
      })
      return React.createElement('div', { key: palette.id, style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        chip,
        React.createElement('span', null, palette.label),
        React.createElement('code', null, palette.id),
        React.createElement('span', null, palette.builtIn ? 'built-in' : 'third-party')
      )
    }

    return React.createElement('div', null,
      React.createElement('h2', null, 'Theme palettes'),
      renderSelect('Dark appearance uses', 'dark'),
      renderSelect('Light appearance uses', 'light'),
      React.createElement('div', null, palettes.map(renderCatalogRow))
    )
  }

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'palettes',
    order: 1,
    label: () => 'Theme palettes',
  }, Section))
}
