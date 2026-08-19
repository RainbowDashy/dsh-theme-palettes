// dsh-theme-palettes — plugin configuration card UI.
//
// Authored as ESM but never executed directly in the browser: `build.mjs`
// inlines the `registerPaletteSettings` function source into the generated
// client bundle. `React` is therefore a FREE identifier here — the factory
// declares `const React = require("react")` before this source, so do NOT
// import it. Everything else the card needs comes from `deps`.
//
// The card lives in the Plugin configuration section (the harness's home for
// plugin-owned settings). It closes over `deps` directly: the section's
// registrant inject face is not needed.
//
// The card follows the section's house style (the PluginCard/fields recipes
// the shipped bash / agent-loop / web-search cards use): a bordered card with
// a collapsible header button (name + description + status pill + rotating
// chevron, collapsed by default), 34px control fields separated by hairlines,
// pill badges, and 12px hints — all colored through the `--dsw-*` theme
// tokens so the palette override layer restyles it like the rest of the UI.
// The palette catalog previews each palette with a two-tone (base + accent)
// tile rather than a single-color square, so the rows read as color previews
// instead of a checkbox list.
//
// Because plugin bundles have no CSS-module pass, the stylesheet is injected
// once as a <style> tag — the client-modules runtime documents bundle CSS
// injection as a factory-closure side effect. The data-plugin attributes let
// the runtime's style bookkeeping claim it, and the querySelector guard makes
// the injection idempotent across re-mounts.

export function registerPaletteSettings(slots, deps) {
  // ---- Scoped stylesheet (injected once per page) ---------------------------
  if (typeof document !== 'undefined'
    && !document.querySelector('style[data-plugin-css="theme-palettes-settings"]')) {
    const style = document.createElement('style')
    style.setAttribute('data-plugin', 'dsh-theme-palettes')
    style.setAttribute('data-plugin-css', 'theme-palettes-settings')
    style.textContent = `
      .dsh-tp-card {
        border: 1px solid var(--dsw-alias-border-l2);
        background: var(--dsw-alias-bg-layer-3);
        border-radius: 12px;
        list-style: none;
        transition: border-color 0.16s;
      }
      .dsh-tp-card:hover { border-color: var(--dsw-alias-label-dimmed); }
      .dsh-tp-header {
        appearance: none;
        width: 100%;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        background: transparent;
        border: 0;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
      }
      .dsh-tp-header:focus-visible {
        outline: 2px solid var(--dsw-alias-brand-primary);
        outline-offset: -2px;
      }
      .dsh-tp-headText {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
        min-width: 0;
      }
      .dsh-tp-name {
        color: var(--dsw-alias-label-primary);
        font-size: 15px;
        font-weight: 600;
        line-height: 1.4;
      }
      .dsh-tp-description {
        color: var(--dsw-alias-label-tertiary);
        font-size: 13px;
        line-height: 1.5;
      }
      .dsh-tp-badge {
        flex: none;
        white-space: nowrap;
        background: var(--dsw-alias-bg-module-platform);
        color: var(--dsw-alias-label-secondary);
        border-radius: 999px;
        padding: 1px 8px;
        font-size: 11px;
        font-weight: 500;
        line-height: 17px;
      }
      .dsh-tp-badgeMuted {
        flex: none;
        white-space: nowrap;
        color: var(--dsw-alias-label-tertiary);
        border-radius: 999px;
        padding: 1px 8px;
        font-size: 11px;
        font-weight: 500;
        line-height: 17px;
      }
      .dsh-tp-chevron {
        flex: none;
        width: 7px;
        height: 7px;
        margin: 0 2px;
        border-right: 1.5px solid var(--dsw-alias-label-tertiary);
        border-bottom: 1.5px solid var(--dsw-alias-label-tertiary);
        transform: rotate(45deg);
        transition: transform 0.16s;
      }
      .dsh-tp-chevronOpen { transform: rotate(225deg); }
      .dsh-tp-body {
        border-top: 1px solid var(--dsw-alias-border-l2);
        margin: 0 16px;
        padding-bottom: 16px;
      }
      .dsh-tp-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 12px 0;
      }
      .dsh-tp-field + .dsh-tp-field { border-top: 1px solid var(--dsw-alias-border-l2); }
      .dsh-tp-label {
        color: var(--dsw-alias-label-primary);
        font-size: 13px;
        font-weight: 500;
        line-height: 1.5;
      }
      .dsh-tp-selectWrap { position: relative; }
      .dsh-tp-select {
        appearance: none;
        -webkit-appearance: none;
        width: 100%;
        height: 34px;
        font: inherit;
        font-size: 13px;
        line-height: 1.5;
        color: var(--dsw-alias-label-primary);
        background: var(--dsw-alias-bg-layer-3);
        border: 1px solid var(--dsw-alias-border-l2);
        border-radius: 8px;
        padding: 0 30px 0 12px;
        cursor: pointer;
      }
      .dsh-tp-select:hover { border-color: var(--dsw-alias-label-dimmed); }
      .dsh-tp-select:focus-visible {
        border-color: var(--dsw-alias-brand-primary);
        outline: none;
      }
      .dsh-tp-selectWrap::after {
        content: "";
        position: absolute;
        top: 50%;
        right: 13px;
        width: 7px;
        height: 7px;
        border-right: 1.5px solid var(--dsw-alias-label-tertiary);
        border-bottom: 1.5px solid var(--dsw-alias-label-tertiary);
        transform: translateY(-60%) rotate(45deg);
        pointer-events: none;
      }
      .dsh-tp-hint {
        color: var(--dsw-alias-label-tertiary);
        margin: 0;
        font-size: 12px;
        line-height: 1.5;
      }
      .dsh-tp-catalog {
        border-top: 1px solid var(--dsw-alias-border-l2);
        padding: 12px 0 0;
      }
      .dsh-tp-catalogTitle {
        color: var(--dsw-alias-label-tertiary);
        margin: 0 0 2px;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.5;
      }
      .dsh-tp-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 0;
        font-size: 13px;
        line-height: 1.5;
      }
      .dsh-tp-chip {
        flex: none;
        width: 16px;
        height: 16px;
        border-radius: 4px;
        border: 1px solid var(--dsw-alias-border-l2);
        background: transparent;
      }
      .dsh-tp-rowLabel {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--dsw-alias-label-primary);
      }
      .dsh-tp-id {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
        font-size: 12px;
        color: var(--dsw-alias-label-secondary);
        background: var(--dsw-alias-bg-layer-2);
        border: 1px solid var(--dsw-alias-border-l2);
        border-radius: 4px;
        padding: 1px 6px;
        white-space: nowrap;
      }
    `
    document.head.append(style)
  }

  function Card() {
    const [mapping, setMapping] = React.useState(() => deps.getMapping())
    const [palettes, setPalettes] = React.useState(() => deps.getPalettes())
    const [status, setStatus] = React.useState(() => deps.getStatus())
    // Collapsed by default, like the section's other plugin cards.
    const [open, setOpen] = React.useState(false)

    React.useEffect(() => deps.subscribe(() => {
      setMapping(deps.getMapping())
      setPalettes(deps.getPalettes())
      setStatus(deps.getStatus())
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
      // the authoritative mapping once the write round-trips.
      setMapping((prev) => ({ ...prev, [scheme]: value }))
    }

    const renderField = (scheme) => {
      const id = `theme-palettes-${scheme}`
      const title = scheme === 'dark' ? 'Dark appearance uses' : 'Light appearance uses'
      const hint = scheme === 'dark'
        ? 'Applied when the resolved color scheme is dark.'
        : 'Applied when the resolved color scheme is light.'
      return React.createElement('div', { className: 'dsh-tp-field' },
        React.createElement('label', { className: 'dsh-tp-label', htmlFor: id }, title),
        React.createElement('div', { className: 'dsh-tp-selectWrap' },
          React.createElement('select', {
            className: 'dsh-tp-select',
            id,
            value: mapping[scheme],
            onChange: (event) => change(scheme, event.target.value),
          },
            buildOptions(scheme).map((option) =>
              React.createElement('option', { key: option.id, value: option.id }, option.label)
            )
          )
        ),
        React.createElement('p', { className: 'dsh-tp-hint' }, hint)
      )
    }

    const renderCatalogRow = (palette) => {
      // Two-tone preview (base + accent): a split tile reads as a palette
      // preview, where a single flat square next to the label read like a
      // checkbox. The accent falls back to the base color for palettes that
      // only set one of the tokens.
      const preview = 'linear-gradient(135deg, '
        + (palette.swatch ?? 'transparent') + ' 0 50%, '
        + (palette.accent ?? palette.swatch ?? 'transparent') + ' 50% 100%)'
      return React.createElement('div', { key: palette.id, className: 'dsh-tp-row' },
        React.createElement('span', {
          className: 'dsh-tp-chip',
          style: { background: preview },
        }),
        React.createElement('span', { className: 'dsh-tp-rowLabel' }, palette.label),
        React.createElement('code', { className: 'dsh-tp-id' }, palette.id),
        React.createElement('span',
          { className: palette.builtIn ? 'dsh-tp-badge' : 'dsh-tp-badgeMuted' },
          palette.builtIn ? 'built-in' : 'third-party'
        )
      )
    }

    return React.createElement('li', { className: 'dsh-tp-card' },
      React.createElement('button', {
        className: 'dsh-tp-header',
        type: 'button',
        'aria-expanded': open,
        'aria-label': open ? 'Hide settings: Theme palettes' : 'Show settings: Theme palettes',
        onClick: () => setOpen((value) => !value),
      },
        React.createElement('div', { className: 'dsh-tp-headText' },
          React.createElement('div', { className: 'dsh-tp-name' }, 'Theme palettes'),
          React.createElement('div', { className: 'dsh-tp-description' },
            'Maps the resolved appearance to a palette; changes apply live.')
        ),
        status !== 'ready'
          ? React.createElement('span', {
            className: 'dsh-tp-badge',
            title: 'The settings store is not ready yet; changes may not persist.',
          }, 'not persisted')
          : null,
        React.createElement('span', { className: 'dsh-tp-chevron' + (open ? ' dsh-tp-chevronOpen' : '') })
      ),
      open ? React.createElement('div', { className: 'dsh-tp-body' },
        renderField('light'),
        renderField('dark'),
        React.createElement('div', { className: 'dsh-tp-catalog' },
          React.createElement('p', { className: 'dsh-tp-catalogTitle' }, 'Available palettes'),
          palettes.length > 0
            ? palettes.map(renderCatalogRow)
            : React.createElement('p', { className: 'dsh-tp-hint' }, 'No palettes registered.')
        )
      ) : null
    )
  }

  // rc7 contract: `settings.plugin.item` is a KEYED slot whose key is the
  // settings namespace the card edits. The Plugin configuration tab dispatches
  // one entry per namespace the Host serves, so a card registered without the
  // namespace key is never rendered (this was the rc6 `list`-slot contract,
  // where `id`/`order` placed the card).
  slots.inject('settings.plugin.item', () => slots.register({
    name: 'settings.plugin.item',
    key: deps.namespace,
  }, Card))
}
