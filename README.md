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

The full mapping (≈86 tokens) lives in [`client.js`](./client.js).

## Install / mount

This is a **client-side Cordis plugin**. Add one row to the web composition
(`cordis.patch.yml`) **after** the built-in `ui-theme` row, then rebuild the
web artifacts:

```yaml
- id: ui-theme-vscode-red
  name: 'dsh-theme-vscode-red'
```

The plugin depends on the `theme` service being provided by
`@deepseek-ai/dsh-client-ui-theme`, so `ui-theme` must precede it (it already
does in the stock composition).

## Usage

On activation the plugin registers a theme with id `vscode-red` and applies it
immediately. It then appears in the **Appearance** picker alongside `light`,
`dark`, and `system`. Stopping the plugin reverts the preference.

## Why tokenColors aren't included

The reference theme's `tokenColors` (syntax highlighting: keywords `#f12727`,
comments `#e7c0c0`, strings `#cd8d8d`, …) have no corresponding token in the
DSH theme layer, which exposes only surface/chrome tokens. Those code-color
rules would need CSS targeting the code block's token classes and are
intentionally left out here.

## License

MIT.
