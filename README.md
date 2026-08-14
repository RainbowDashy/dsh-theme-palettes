# dsh-theme-vscode-red

A **VSCode "Red"** dark theme for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

Faithful port of the VSCode Red color theme's `colors` block onto the DSH
`--dsw-*` design tokens. Deep maroon replaces black, and every neutral
"blackish" surface, border, button, scrollbar, and code block is remapped onto
a dark-red scale with a `#cc3333` accent.

## Palette

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

The full mapping (≈86 tokens) is authored in [`src/client.js`](./src/client.js);
the generated bundle is [`client.js`](./client.js).

## Install

```sh
dsh plugin --profile web add "github:RainbowDashy/dsh-theme-vscode-red"
```

Then restart the web server so the new composition row enters the boot graph:

```sh
dsh web
```

That is the whole install. What happens under the hood:

1. `dsh plugin add` forwards to `pnpm add` inside the profile directory
   (`$DSH_HOME/profiles/web`), so the package lands in the profile's
   `node_modules`. The generated artifacts are committed, so nothing builds
   at install time — pnpm's build-script gate never triggers.
2. Because `package.json` declares `dsh.bundle.patch`, `dsh plugin`
   reconciles the package into the profile's `dsh.profile.bundles` layer
   stack.
3. On the next start, that patch layer inserts the theme's own row, the
   host-side `client-modules` scan picks up the `dsh.client` declaration, and
   the browser mounts the bundle from `/plugins/dsh-theme-vscode-red/client.js`.

The plugin registers theme id `vscode-red` and activates it immediately, so
the page comes up red. It also appears in **Settings → Appearance** alongside
`light`, `dark`, and `system`.

- Pin a branch or tag: `"github:RainbowDashy/dsh-theme-vscode-red#main"`.
- Install from a local checkout: `dsh plugin --profile web add "link:/path/to/checkout"`
  (`link:` keeps your edits live; `file:` snapshots the directory).

### Manual mount (without the bundle patch)

On a profile where the composition is managed by hand, install the package
however you like and add one row to the profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: theme-vscode-red
      name: dsh-theme-vscode-red
```

Restart the server — row-set changes only take effect on restart.

### Troubleshooting: pnpm blocks a git-hosted package's build scripts

pnpm 10+ refuses to run lifecycle scripts of git dependencies unless they are
allowlisted. This theme deliberately ships no install-time scripts (its
artifacts are committed), so the install above works out of the box. If pnpm
reports `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED` for *another* plugin, add the
exact key pnpm printed to the profile's `pnpm-workspace.yaml` —
`onlyBuiltDependencies` on pnpm 10, `allowBuilds` on pnpm 11 — and re-run.

## Usage

On activation the plugin registers a theme with id `vscode-red` and applies it
immediately. It then appears in the **Appearance** picker. Stopping the plugin
reverts the preference.

Because `apply` layers the palette over the active theme via `overrideTokens`,
the red palette wins per-token for as long as the plugin is loaded — the
durable `light`/`dark` preference cannot take it back (the harness never
persists custom theme ids, so a boot-time `setTheme()` call alone would be
overwritten when the settings scope syncs). To make it opt-in instead, drop
the `overrideTokens` call (and optionally the `setTheme` call) and pick
`vscode-red` from the Appearance picker.

## Development

[`src/client.js`](./src/client.js) is the only hand-edited source. Regenerate
the artifacts with:

```sh
node build.mjs   # or: npm run build
```

This rewrites three generated files:

- `client.js` — the `./client` export: the factory bundle
  (`window.__ModuleLoader__.load`) the shell's module system loads as a
  classic script; raw ESM would be a SyntaxError there.
- `index.js` — the no-op host half; keeps the composition row's host fiber
  active so the `client-modules` scan qualifies the package.
- `cordis.patch.yml` — the `dsh.bundle` patch layer that inserts the row.

Commit the regenerated files: installs consume the committed artifacts (no
build runs at install time). `prepublishOnly` also rebuilds them right before
an npm/pnpm publish.

## Why tokenColors aren't included

The reference theme's `tokenColors` (syntax highlighting: keywords `#f12727`,
comments `#e7c0c0`, strings `#cd8d8d`, …) have no corresponding token in the
DSH theme layer, which exposes only surface/chrome tokens. Those code-color
rules would need CSS targeting the code block's token classes and are
intentionally left out here.

## License

MIT.
