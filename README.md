# dsh-theme-palettes

A **palette infrastructure** for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH). It ships three built-in palettes — **VSCode Red**, **Solarized Dark**, and **Solarized Light** — and exposes a client-side registration API (`themePalettes`) so third-party plugins can contribute their own palettes without touching the harness theme registry.

## Install

```sh
dsh plugin --profile web add "github:RainbowDashy/dsh-theme-palettes"
```

Then restart the web server so the new composition row enters the boot graph:

```sh
dsh web
```

The plugin does **not** register into the harness theme registry and never calls `setTheme` — the harness Appearance picker (light/dark/system) is not extensible by third parties. Palettes are applied through a single `theme.overrideTokens` layer instead (see [Usage](#usage)).

- Pin a branch or tag: `"github:RainbowDashy/dsh-theme-palettes#main"`.
- Install from a local checkout: `dsh plugin --profile web add "link:/path/to/checkout"` (`link:` keeps your edits live; `file:` snapshots the directory).

## Usage

This package never touches the Appearance picker and never registers a theme id there. Instead it maps the **resolved** color scheme onto a palette via one `theme.overrideTokens` layer.

To pick palettes, open **Settings → Plugins → Configurable**, expand the **Theme palettes** card, and set the **Light appearance uses** and **Dark appearance uses** dropdowns. Changes apply live and persist across restarts (see [Settings](#settings)).

- Both **dark** and **light** appearances stay on the stock (`default`) palette by default.
- **System** resolves to light or dark via the OS and re-fires when the OS scheme flips.
- Changing the Appearance preference (light/dark/system) re-maps the palette immediately.
- A mapping that references an unregistered id is fail-soft: it behaves as `default`.
- Removing the plugin restores the stock palette.

Because the palette is layered over the active theme via `overrideTokens`, it wins per-token for as long as the plugin is loaded.

## Palettes

Each built-in palette is a faithful port of a VSCode color theme's `colors` block onto the DSH `--dsw-*` design tokens.

### VSCode Red (`vscode-red`)

A faithful port of the VSCode Red color theme's `colors` block. Deep maroon replaces black, and every neutral "blackish" surface, border, button, scrollbar, and code block is remapped onto a dark-red scale with a `#cc3333` accent.

| Role | Value |
| --- | --- |
| Editor / app base | `#390000` |
| Sidebar | `#330000` |
| Widgets / code blocks | `#300000` |
| Inputs / dropdowns / menus | `#580000` |
| Brand accent | `#cc3333` |
| Primary text | `#f8f8f8` |
| Secondary text | `#ffbbbb` |
| Error / success / warn | `#f14c4c` / `#89d185` / `#cca700` |

### Solarized Dark (`solarized-dark`)

A faithful port of the built-in VSCode "Solarized (dark)" theme's `colors` block: the canonical base03 teal-black ladder with the reference's cyan accent (`#2aa198`, the theme's focus/selection/button color).

| Role | Value |
| --- | --- |
| Editor / app base | `#002b36` |
| Sidebar | `#00212b` |
| Widgets / code blocks | `#004052` / `#00212b` |
| Inputs / dropdowns / menus | `#003847` |
| Brand accent | `#2aa198` |
| Primary text | `#839496` |
| Secondary text | `#93a1a1` |
| Error / success / warn | `#dc322f` / `#859900` / `#b58900` |

Adaptations from the reference: the translucent accents (`#2AA19899` borders, `#004454AA` hovers) become opaque or blended colors so they stay stable across DSH surfaces; the primary button pairs the cyan fill with base03 text; info buttons keep the reference's badge blue `#047aa6` with the DSH's hardcoded white button text; toast and tooltip surfaces sit on the input teal `#004052`.

### Solarized Light (`solarized-light`)

A faithful port of the built-in VSCode "Solarized (light)" theme's `colors` block: the base3 cream ladder with the reference's yellow accent (`#b58900`, the theme's badge/progress/prominent-button color).

| Role | Value |
| --- | --- |
| Editor / app base | `#fdf6e3` |
| Sidebar | `#eee8d5` |
| Widgets / code blocks | `#eee8d5` / `#f7f0e0` |
| Inputs / dropdowns / menus | `#ddd6c1` |
| Brand accent | `#b58900` |
| Primary text | `#657b83` |
| Secondary text | `#586e75` |
| Error / success / warn | `#dc322f` / `#859900` / `#b58900` |

Adaptations from the reference: the translucent golds (`#DFCA8844`, `#B58900AA`) become opaque or blended colors so they stay stable across DSH surfaces; the primary button pairs the yellow fill with base03 text; toasts and tooltips stay on the dark base02/base03 pair like the stock light theme; the selection gold `#dfca88` carries the active list/nav states.

The full token maps (89 tokens per Solarized palette; 87 for VSCode Red, which leaves the success/warn tertiary states on the stock values) are authored in [`src/palettes.js`](./src/palettes.js); the generated bundle is [`client.js`](./client.js). The reference themes' `tokenColors` (syntax highlighting) are intentionally left out: the DSH theme layer exposes only surface/chrome tokens, so those code-color rules have no token to map onto.

## Settings

The mapping UI lives on the Settings → **Plugins** → **Configurable** page as a **"Theme palettes"** card. Like the section's other plugin cards it starts collapsed — expand it with the header button. It contains:

- **Light appearance uses** — a dropdown offering `Default` plus every registered palette.
- **Dark appearance uses** — a dropdown offering `Default` plus every registered palette.
- A **catalog** list showing each palette's two-tone preview (base + accent), label, id, and a built-in/third-party marker.
- A "not persisted" hint while the host-side persistence surface is unavailable.

Changes apply live and persist as a flat section of the user's settings document (`$DSH_HOME/settings.yaml`):

```jsonc
{
  "theme-palettes": {
    "dark": "solarized-dark", // example: Solarized Dark for the dark appearance
    "light": "solarized-light" // example: Solarized Light for the light appearance
  }
}
```

Defaults are `dark: default`, `light: default` — the same as an absent section. A value referencing an unregistered id behaves as `default` and is shown as "(unavailable)" in the dropdown.

### Why a private route instead of the settings wire?

The harness's browser settings **wire** (`settings.describe` / `settings.mutate`) serves only a hardcoded namespace allowlist (`WEB_SETTINGS_NAMESPACES` in `dsh-host-apiproxy`) and refuses third-party namespaces with `settings-not-exposed` — exposing a registered namespace is deferred harness work. This package therefore persists through its own HTTP surface instead:

- The **host half** registers the `theme-palettes` namespace on the host settings seam (so writes land in the same user settings document as first-party namespaces) and serves a private route, `GET/POST /api/theme-palettes`, backed by that seam.
- The **browser half** reads and writes that route and refreshes through the forwarded `settings/document-updated` event, so changes from another browser or from the host stay live.
- The route runs on the same webserver and origin as the harness UI (loopback-only deployment is unchanged: settings are host-local in that shape, exactly like the standard settings RPC).

## Third-party authors

A palette is pure data. Register it through the `themePalettes` service:

```js
{
  inject: ['themePalettes'],
  apply(ctx) {
    ctx.themePalettes.registerPalette({
      id: 'my-package/ocean',      // namespace with the authoring package name
      label: 'Ocean',
      tokens: {
        '--dsw-alias-bg-base': '#0b1e2d',
        '--dsw-specific-sidebar-fill': '#081825',
        // ...
      },
    })
  },
}
```

- `registerPalette({ id, label, tokens })` returns a disposer; `list()` returns `[{ id, label, builtIn, swatch, accent }]` (`swatch` is the palette's `--dsw-alias-bg-base` value and `accent` its `--dsw-alias-brand-primary`, falling back to the base — together they feed the settings catalog's two-tone preview tile).
- Duplicate ids **throw** — pick a unique id.
- Namespace ids with your package name (e.g. `my-package/ocean`) to avoid collisions.
- Dynamic session-scoped plugins can also register palettes.
- Tokens are flat CSS-variable values for the `--dsw-*` design tokens; the override layer pairs them for light and dark automatically.

## Development

Hand-edited sources live in `src/`:

- [`src/palettes.js`](./src/palettes.js) — the palette catalog (the built-in palettes and helpers).
- [`src/client.js`](./src/client.js) — the runtime: the `themePalettes` service, the mapping store, and the override layer.
- [`src/settings.js`](./src/settings.js) — the "Theme palettes" plugin-configuration card UI.
- [`src/host.js`](./src/host.js) — the host half: settings-namespace registration plus the `/api/theme-palettes` route.
- [`src/host-schema.js`](./src/host-schema.js) — the dependency-free namespace contract (schema, route, op validation).

Regenerate the artifacts with:

```sh
node build.mjs   # or: npm run build
```

This rewrites three generated files:

- `client.js` — the `./client` export: the factory bundle (`window.__ModuleLoader__.load`) the shell loads as a classic script; raw ESM would be a SyntaxError there.
- `index.js` — the host half, inlined from `src/host.js` + `src/host-schema.js` with its schemastery import preserved.
- `cordis.patch.yml` — the `dsh.bundle` patch layer that inserts the row.

Run the stub-based contract tests with:

```sh
node test.mjs    # or: npm test
```

Commit the generated files: installs consume the committed artifacts, so there is deliberately **no `prepare` hook** (pnpm 10+ blocks git-hosted lifecycle scripts unless allowlisted). `prepublishOnly` rebuilds the artifacts right before a publish.

## Troubleshooting

pnpm 10+ refuses to run lifecycle scripts of git dependencies unless they are allowlisted. This package deliberately ships no install-time scripts (its artifacts are committed), so the install above works out of the box. If pnpm reports `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED` for *another* plugin that genuinely needs build scripts, add the exact key pnpm printed to the profile's `pnpm-workspace.yaml` — `onlyBuiltDependencies` on pnpm 10, `allowBuilds` on pnpm 11 — and re-run.

## License

MIT.
