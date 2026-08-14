# dsh-theme-palettes

A **palette infrastructure** for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH). It ships a built-in **VSCode Red** dark palette and exposes a client-side registration API (`themePalettes`) so third-party plugins can contribute their own palettes without touching the harness theme registry.

## Palette

The built-in palette is `vscode-red` ("VSCode Red"), a faithful port of the VSCode Red color theme's `colors` block onto the DSH `--dsw-*` design tokens. Deep maroon replaces black, and every neutral "blackish" surface, border, button, scrollbar, and code block is remapped onto a dark-red scale with a `#cc3333` accent.

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

The full token map (87 tokens) is authored in [`src/palettes.js`](./src/palettes.js); the generated bundle is [`client.js`](./client.js). The reference theme's `tokenColors` (syntax highlighting) are intentionally left out: the DSH theme layer exposes only surface/chrome tokens, so those code-color rules have no token to map onto.

## Install

```sh
dsh plugin --profile web add "github:RainbowDashy/dsh-theme-palettes"
```

Then restart the web server so the new composition row enters the boot graph:

```sh
dsh web
```

That is the whole install. What happens under the hood:

1. `dsh plugin add` forwards to `pnpm add` inside the profile directory (`$DSH_HOME/profiles/web`), so the package lands in the profile's `node_modules`. The generated artifacts are committed, so nothing builds at install time — pnpm's build-script gate never triggers.
2. Because `package.json` declares a `dsh.bundle` patch, `dsh plugin` reconciles the package into the profile's `dsh.profile.bundles` layer stack — no manual `cordis.patch.yml` editing.
3. On the next start, that patch layer inserts the plugin's own row, the host-side `client-modules` scan picks up the `dsh.client` declaration, and the browser mounts the bundle from `/plugins/dsh-theme-palettes/client.js`.

The plugin does **not** register into the harness theme registry and never calls `setTheme` — the harness Appearance picker (light/dark/system) is not extensible by third parties. Palettes are applied through a single `theme.overrideTokens` layer instead (see [Usage](#usage)).

- Pin a branch or tag: `"github:RainbowDashy/dsh-theme-palettes#main"`.
- Install from a local checkout: `dsh plugin --profile web add "link:/path/to/checkout"` (`link:` keeps your edits live; `file:` snapshots the directory).

### Migration from `dsh-theme-vscode-red`

This package supersedes the old `dsh-theme-vscode-red` single-theme package. The GitHub repo was renamed, so the old URLs redirect. To migrate:

```sh
dsh plugin --profile web remove dsh-theme-vscode-red
dsh plugin --profile web add "github:RainbowDashy/dsh-theme-palettes"
```

Then restart `dsh web`. No settings migration is needed — the old package persisted nothing.

### Manual mount (without the bundle patch)

On a profile where the composition is managed by hand, install the package however you like and add one row to the profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: theme-palettes
      name: dsh-theme-palettes
```

Restart the server — row-set changes only take effect on restart.

## Usage

This package never touches the Appearance picker and never registers a theme id there. Instead it maps the **resolved** color scheme onto a palette via one `theme.overrideTokens` layer:

- **Dark appearance** uses `vscode-red` by default; **light appearance** stays on the stock (`default`) palette.
- **System** resolves to light or dark via the OS and re-fires when the OS scheme flips.
- Changing the Appearance preference (light/dark/system) re-maps the palette immediately.
- A mapping that references an unregistered id is fail-soft: it behaves as `default`.
- Removing the plugin restores the stock palette.

Because the palette is layered over the active theme via `overrideTokens`, it wins per-token for as long as the plugin is loaded.

## Settings

A new **"Theme palettes"** section appears in Settings, containing:

- **Dark appearance uses** — a dropdown offering `Default` plus every registered palette.
- **Light appearance uses** — a dropdown offering `Default` plus every registered palette.
- A **catalog** list showing each palette's color chip, label, id, and a built-in/third-party marker.

The mapping persists as a flat section of the user's settings document:

```jsonc
{
  "theme-palettes": {
    "dark": "vscode-red",
    "light": "default"
  }
}
```

Defaults are `dark: vscode-red`, `light: default`. A value referencing an unregistered id behaves as `default` and is shown as "(unavailable)" in the dropdown.

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

- `registerPalette({ id, label, tokens })` returns a disposer; `list()` returns `[{ id, label, builtIn, swatch }]` (`swatch` is the palette's `--dsw-alias-bg-base` value, for catalog chips).
- Duplicate ids **throw** — pick a unique id.
- Namespace ids with your package name (e.g. `my-package/ocean`) to avoid collisions.
- Dynamic session-scoped plugins can also register palettes.
- Tokens are flat CSS-variable values for the `--dsw-*` design tokens; the override layer pairs them for light and dark automatically.

## Development

Hand-edited sources live in `src/`:

- [`src/palettes.js`](./src/palettes.js) — the palette catalog (built-in `vscode-red` and helpers).
- [`src/client.js`](./src/client.js) — the runtime: the `themePalettes` service and the override layer.
- [`src/settings.js`](./src/settings.js) — the "Theme palettes" settings-section UI.

Regenerate the artifacts with:

```sh
node build.mjs   # or: npm run build
```

This rewrites three generated files:

- `client.js` — the `./client` export: the factory bundle (`window.__ModuleLoader__.load`) the shell loads as a classic script; raw ESM would be a SyntaxError there.
- `index.js` — the no-op host half; keeps the composition row's host fiber active so the `client-modules` scan qualifies the package.
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
