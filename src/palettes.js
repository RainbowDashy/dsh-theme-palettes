// dsh-theme-palettes — built-in palette catalog.
//
// Each entry carries the full flat token map (name → CSS value) that the
// runtime core stacks as an override layer when the palette is the active
// mapping target. `build.mjs` JSON-stringifies this array into the generated
// client bundle, so keep the shape stable: `{ id, label, tokens }`.
//
// The catalog ships three faithful ports of VSCode color themes onto the DSH
// `--dsw-*` design tokens: VSCode Red, Solarized (dark), and Solarized
// (light). Each port covers every non-static design token (89), with the two
// exceptions the reference omits (VSCode Red leaves success/warn tertiary on
// the stock values, 87 tokens).
//
// Adaptations from the reference colors blocks (VSCode repo,
// extensions/theme-solarized-{dark,light}/themes/*-color-theme.json):
//   - VSCode's translucent accents (`#2AA19899`, `#DFCA8844`, `#B58900AA`)
//     become their opaque palette colors where DSH surfaces differ underneath,
//     so the accent stays stable across surfaces.
//   - Interactive fills pair with DSH's hardcoded white button text where
//     needed (info buttons), and the brand fill pairs with the palette's
//     darkest tone for the primary-button logo (label-primary-inverted).
//   - `tokenColors` (syntax highlighting) stay out, as with VSCode Red: the
//     DSH theme layer exposes only surface/chrome tokens.

export const PALETTES = [
  {
    id: 'vscode-red',
    label: 'VSCode Red',
    tokens: {
      // Backgrounds
      '--dsw-alias-bg-base': '#390000',
      '--dsw-alias-bg-layer-1': '#330000',
      '--dsw-alias-bg-layer-2': '#300000',
      '--dsw-alias-bg-layer-3': '#490000',
      '--dsw-alias-bg-mask-1': 'rgba(48, 0, 0, 0.55)',
      '--dsw-alias-bg-mask-2': 'rgba(48, 0, 0, 0.28)',
      '--dsw-alias-bg-mask-3': 'rgba(40, 0, 0, 0.55)',
      '--dsw-alias-bg-mask-photo': 'rgba(24, 0, 0, 0.9)',
      '--dsw-alias-bg-mask-drop': 'rgba(48, 0, 0, 0.72)',
      '--dsw-alias-bg-module-platform': '#580000',
      '--dsw-alias-bg-multi-select': '#490000',
      '--dsw-alias-bg-overlay': '#580000',
      '--dsw-alias-bg-skeleton': 'rgba(255, 120, 120, 0.10)',

      // Borders (red-tinted, matching #ff6666 in the reference)
      '--dsw-alias-border-inverted2': 'rgba(255, 102, 102, 0.16)',
      '--dsw-alias-border-inverted': 'rgba(255, 102, 102, 0.12)',
      '--dsw-alias-border-l1': 'rgba(255, 102, 102, 0.14)',
      '--dsw-alias-border-l2-darkmode-thin': 'rgba(255, 102, 102, 0.10)',
      '--dsw-alias-border-l2': 'rgba(255, 102, 102, 0.22)',
      '--dsw-alias-border-l3': 'rgba(255, 102, 102, 0.30)',
      '--dsw-alias-border-l4': 'rgba(255, 102, 102, 0.40)',

      // Brand
      '--dsw-alias-brand-primary-invert': '#f8f8f8',
      '--dsw-alias-brand-primary-new-colorprimary-new-color': '#cc3333',
      '--dsw-alias-brand-primary': '#cc3333',
      '--dsw-alias-brand-text': '#f8f8f8',

      // Buttons
      '--dsw-alias-button-contrast-fill': '#cc3333',
      '--dsw-alias-button-elevated-fill': '#700000',
      '--dsw-alias-button-floating-fill': '#490000',
      '--dsw-alias-button-floating-hover': '#580000',
      '--dsw-alias-button-ghost-active-border': '#ff6666',
      '--dsw-alias-button-ghost-active-fill': '#700000',
      '--dsw-alias-button-ghost-active-hover': '#800000',
      '--dsw-alias-button-info-fill': '#cc3333',
      '--dsw-alias-button-info-hover': '#dd4444',
      '--dsw-alias-button-primary-dimmed': '#700000',
      '--dsw-alias-button-primary-fill': '#cc3333',
      '--dsw-alias-button-primary-hover': '#dd4444',
      '--dsw-alias-button-tool-bar-fill-invisible': 'rgba(72, 0, 0, 0.36)',
      '--dsw-alias-button-tool-bar-fill': 'rgba(104, 0, 0, 0.55)',
      '--dsw-alias-button-tool-bar-hover': 'rgba(120, 0, 0, 0.6)',

      // Interactive states
      '--dsw-alias-interactive-bg-active': 'rgba(255, 102, 102, 0.16)',
      '--dsw-alias-interactive-bg-hover-accent': 'rgba(255, 102, 102, 0.26)',
      '--dsw-alias-interactive-bg-hover-danger': 'rgba(242, 90, 90, 0.18)',
      '--dsw-alias-interactive-bg-hover-solid': '#580000',
      '--dsw-alias-interactive-bg-hover': 'rgba(255, 102, 102, 0.10)',

      // Text labels (pink-tinted, from #ffbbbb / #cc9999 / #e7c0c0)
      '--dsw-alias-label-caption': '#e7c0c0',
      '--dsw-alias-label-dimmed': '#d4a0a0',
      '--dsw-alias-label-primary-bluish': '#f8f8f8',
      '--dsw-alias-label-primary-dimmed': '#f0c8c8',
      '--dsw-alias-label-primary-foreground': '#ffffff',
      '--dsw-alias-label-primary-inverted': '#330000',
      '--dsw-alias-label-primary': '#f8f8f8',
      '--dsw-alias-label-secondary': '#ffbbbb',
      '--dsw-alias-label-tertiary': '#cc9999',

      // Markdown / code (dark red code surfaces)
      '--dsw-alias-markdown-citation': '#580000',
      '--dsw-alias-markdown-code-block-banner': '#490000',
      '--dsw-alias-markdown-code-block': '#300000',
      '--dsw-alias-markdown-code-segment-selected': '#580000',
      '--dsw-alias-markdown-code-segment-unselected': '#300000',
      '--dsw-alias-markdown-inline-code': '#490000',
      '--dsw-alias-markdown-placeholder': '#490000',
      '--dsw-alias-markdown-tag': '#490000',

      // Scrollbars
      '--dsw-alias-scrollbar-bg-l1': '#700000',
      '--dsw-alias-scrollbar-bg-l2': '#880000',
      '--dsw-alias-scrollbar-hover-l1': '#880000',
      '--dsw-alias-scrollbar-hover-l2': '#990000',

      // Semantic states (red brand accent; green/yellow kept from the reference)
      '--dsw-alias-state-business-primary': '#cc3333',
      '--dsw-alias-state-business-tertiary': '#580000',
      '--dsw-alias-state-error-primary': '#f14c4c',
      '--dsw-alias-state-error-secondary': '#f48771',
      '--dsw-alias-state-success-primary': '#89d185',
      '--dsw-alias-state-success-secondary': '#89d185',
      '--dsw-alias-state-warn-label': '#cca700',
      '--dsw-alias-state-warn-primary': '#cca700',
      '--dsw-alias-state-warn-secondary': '#cca700',

      // Toast / tooltip
      '--dsw-alias-toast-bg': '#700000',
      '--dsw-alias-tooltip-bg': '#700000',

      // Specific surfaces
      '--dsw-specific-bubble-highlight': '#700000',
      '--dsw-specific-bubble': '#490000',
      '--dsw-specific-input-major': '#580000',
      '--dsw-specific-login-input': '#300000',
      '--dsw-specific-menu': '#580000',
      '--dsw-specific-selector': '#883333',
      '--dsw-specific-sidebar-fill': '#330000',
      '--dsw-specific-sidebar-nav-item-active-accent': '#580000',
      '--dsw-specific-sidebar-nav-item-active': '#700000',
      '--dsw-specific-sidebar-nav-item-hover': '#490000',
      '--dsw-specific-tip': '#580000',
    },
  },
  {
    id: 'solarized-dark',
    label: 'Solarized Dark',
    tokens: {
      // Backgrounds: base03 ladder through the reference's input (#003847),
      // tab (#004052), and selection (#005a6f) teals.
      '--dsw-alias-bg-base': '#002b36',
      '--dsw-alias-bg-layer-1': '#073642',
      '--dsw-alias-bg-layer-2': '#003847',
      '--dsw-alias-bg-layer-3': '#004052',
      '--dsw-alias-bg-mask-1': 'rgba(0, 43, 54, 0.55)',
      '--dsw-alias-bg-mask-2': 'rgba(0, 43, 54, 0.28)',
      '--dsw-alias-bg-mask-3': 'rgba(0, 43, 54, 0.5)',
      '--dsw-alias-bg-mask-photo': 'rgba(0, 43, 54, 0.9)',
      '--dsw-alias-bg-mask-drop': 'rgba(0, 43, 54, 0.72)',
      '--dsw-alias-bg-module-platform': '#003847',
      '--dsw-alias-bg-multi-select': '#004052',
      '--dsw-alias-bg-overlay': '#00212b',
      '--dsw-alias-bg-skeleton': 'rgba(147, 161, 161, 0.10)',

      // Borders (base1-tinted)
      '--dsw-alias-border-inverted2': 'rgba(147, 161, 161, 0.14)',
      '--dsw-alias-border-inverted': 'rgba(147, 161, 161, 0.10)',
      '--dsw-alias-border-l1': 'rgba(147, 161, 161, 0.08)',
      '--dsw-alias-border-l2-darkmode-thin': 'rgba(147, 161, 161, 0.06)',
      '--dsw-alias-border-l2': 'rgba(147, 161, 161, 0.16)',
      '--dsw-alias-border-l3': 'rgba(147, 161, 161, 0.22)',
      '--dsw-alias-border-l4': 'rgba(147, 161, 161, 0.30)',

      // Brand: the reference's cyan accent (focus, buttons, selection),
      // opaque here; primary-button logo pairs as base03 on cyan.
      '--dsw-alias-brand-primary-invert': '#2aa198',
      '--dsw-alias-brand-primary-new-colorprimary-new-color': '#2aa198',
      '--dsw-alias-brand-primary': '#2aa198',
      '--dsw-alias-brand-text': '#fdf6e3',

      // Buttons (info keeps the reference's badge/progress blue)
      '--dsw-alias-button-contrast-fill': '#fdf6e3',
      '--dsw-alias-button-elevated-fill': '#003847',
      '--dsw-alias-button-floating-fill': '#004052',
      '--dsw-alias-button-floating-hover': '#005a6f',
      '--dsw-alias-button-ghost-active-border': '#2aa198',
      '--dsw-alias-button-ghost-active-fill': '#004052',
      '--dsw-alias-button-ghost-active-hover': '#005a6f',
      '--dsw-alias-button-info-fill': '#047aa6',
      '--dsw-alias-button-info-hover': '#268bd2',
      '--dsw-alias-button-primary-dimmed': '#004052',
      '--dsw-alias-button-primary-fill': '#2aa198',
      '--dsw-alias-button-primary-hover': '#268bd2',
      '--dsw-alias-button-tool-bar-fill-invisible': 'rgba(0, 43, 54, 0.36)',
      '--dsw-alias-button-tool-bar-fill': 'rgba(0, 43, 54, 0.55)',
      '--dsw-alias-button-tool-bar-hover': 'rgba(0, 43, 54, 0.6)',

      // Interactive states (cyan-tinted)
      '--dsw-alias-interactive-bg-active': 'rgba(42, 161, 152, 0.18)',
      '--dsw-alias-interactive-bg-hover-accent': 'rgba(42, 161, 152, 0.24)',
      '--dsw-alias-interactive-bg-hover-danger': 'rgba(220, 50, 47, 0.16)',
      '--dsw-alias-interactive-bg-hover-solid': '#004052',
      '--dsw-alias-interactive-bg-hover': 'rgba(42, 161, 152, 0.10)',

      // Text labels (canonical roles: body base0, emphasis base1, comments base01)
      '--dsw-alias-label-caption': '#657b83',
      '--dsw-alias-label-dimmed': '#586e75',
      '--dsw-alias-label-primary-bluish': '#93a1a1',
      '--dsw-alias-label-primary-dimmed': '#93a1a1',
      '--dsw-alias-label-primary-foreground': '#002b36',
      '--dsw-alias-label-primary-inverted': '#002b36',
      '--dsw-alias-label-primary': '#839496',
      '--dsw-alias-label-secondary': '#93a1a1',
      '--dsw-alias-label-tertiary': '#586e75',

      // Markdown / code (code sits on the reference's darker #00212b)
      '--dsw-alias-markdown-citation': '#003847',
      '--dsw-alias-markdown-code-block-banner': '#073642',
      '--dsw-alias-markdown-code-block': '#00212b',
      '--dsw-alias-markdown-code-segment-selected': '#005a6f',
      '--dsw-alias-markdown-code-segment-unselected': '#00212b',
      '--dsw-alias-markdown-inline-code': '#073642',
      '--dsw-alias-markdown-placeholder': '#003847',
      '--dsw-alias-markdown-tag': '#003847',

      // Scrollbars
      '--dsw-alias-scrollbar-bg-l1': '#004052',
      '--dsw-alias-scrollbar-bg-l2': '#005a6f',
      '--dsw-alias-scrollbar-hover-l1': '#005a6f',
      '--dsw-alias-scrollbar-hover-l2': '#2aa198',

      // Semantic states (canonical accent pairings)
      '--dsw-alias-state-business-primary': '#268bd2',
      '--dsw-alias-state-business-tertiary': '#073642',
      '--dsw-alias-state-error-primary': '#dc322f',
      '--dsw-alias-state-error-secondary': '#d33682',
      '--dsw-alias-state-success-primary': '#859900',
      '--dsw-alias-state-success-secondary': '#2aa198',
      '--dsw-alias-state-success-tertiary': '#073642',
      '--dsw-alias-state-warn-label': '#b58900',
      '--dsw-alias-state-warn-primary': '#b58900',
      '--dsw-alias-state-warn-secondary': '#cb4b16',
      '--dsw-alias-state-warn-tertiary': '#073642',

      // Toast / tooltip
      '--dsw-alias-toast-bg': '#004052',
      '--dsw-alias-tooltip-bg': '#004052',

      // Specific surfaces
      '--dsw-specific-bubble-highlight': '#005a6f',
      '--dsw-specific-bubble': '#073642',
      '--dsw-specific-input-major': '#003847',
      '--dsw-specific-login-input': '#002b36',
      '--dsw-specific-menu': '#004052',
      '--dsw-specific-selector': '#005a6f',
      '--dsw-specific-sidebar-fill': '#00212b',
      '--dsw-specific-sidebar-nav-item-active-accent': '#2aa198',
      '--dsw-specific-sidebar-nav-item-active': '#005a6f',
      '--dsw-specific-sidebar-nav-item-hover': '#004052',
      '--dsw-specific-tip': '#003847',
    },
  },
  {
    id: 'solarized-light',
    label: 'Solarized Light',
    tokens: {
      // Backgrounds: base3 with base2 widgets and the reference's #f7f0e0
      // and #ddd6c1 intermediate creams.
      '--dsw-alias-bg-base': '#fdf6e3',
      '--dsw-alias-bg-layer-1': '#fdf6e3',
      '--dsw-alias-bg-layer-2': '#f7f0e0',
      '--dsw-alias-bg-layer-3': '#eee8d5',
      '--dsw-alias-bg-mask-1': 'rgba(0, 43, 54, 0.24)',
      '--dsw-alias-bg-mask-2': 'rgba(0, 43, 54, 0.12)',
      '--dsw-alias-bg-mask-3': 'rgba(0, 43, 54, 0.48)',
      '--dsw-alias-bg-mask-photo': 'rgba(0, 43, 54, 0.88)',
      '--dsw-alias-bg-mask-drop': 'rgba(253, 246, 227, 0.7)',
      '--dsw-alias-bg-module-platform': '#ddd6c1',
      '--dsw-alias-bg-multi-select': '#eee8d5',
      '--dsw-alias-bg-overlay': '#eee8d5',
      '--dsw-alias-bg-skeleton': 'rgba(101, 123, 131, 0.10)',

      // Borders (base01-tinted)
      '--dsw-alias-border-inverted2': 'rgba(88, 110, 117, 0.14)',
      '--dsw-alias-border-inverted': 'rgba(88, 110, 117, 0.10)',
      '--dsw-alias-border-l1': 'rgba(88, 110, 117, 0.08)',
      '--dsw-alias-border-l2-darkmode-thin': 'rgba(88, 110, 117, 0.10)',
      '--dsw-alias-border-l2': 'rgba(88, 110, 117, 0.16)',
      '--dsw-alias-border-l3': 'rgba(88, 110, 117, 0.22)',
      '--dsw-alias-border-l4': 'rgba(88, 110, 117, 0.30)',

      // Brand: the reference's yellow accent (badge, progress, prominent
      // button); the primary-button logo pairs as base03 on yellow.
      '--dsw-alias-brand-primary-invert': '#b58900',
      '--dsw-alias-brand-primary-new-colorprimary-new-color': '#b58900',
      '--dsw-alias-brand-primary': '#b58900',
      '--dsw-alias-brand-text': '#002b36',

      // Buttons (info keeps the canonical blue)
      '--dsw-alias-button-contrast-fill': '#073642',
      '--dsw-alias-button-elevated-fill': '#eee8d5',
      '--dsw-alias-button-floating-fill': '#fdf6e3',
      '--dsw-alias-button-floating-hover': '#eee8d5',
      '--dsw-alias-button-ghost-active-border': '#b58900',
      '--dsw-alias-button-ghost-active-fill': '#dfca88',
      '--dsw-alias-button-ghost-active-hover': '#eee8d5',
      '--dsw-alias-button-info-fill': '#268bd2',
      '--dsw-alias-button-info-hover': '#6c71c4',
      '--dsw-alias-button-primary-dimmed': '#eee8d5',
      '--dsw-alias-button-primary-fill': '#b58900',
      '--dsw-alias-button-primary-hover': '#ac9d57',
      '--dsw-alias-button-tool-bar-fill-invisible': 'rgba(0, 43, 54, 0.36)',
      '--dsw-alias-button-tool-bar-fill': 'rgba(0, 43, 54, 0.55)',
      '--dsw-alias-button-tool-bar-hover': 'rgba(0, 43, 54, 0.6)',

      // Interactive states (yellow-tinted, the reference's selection family)
      '--dsw-alias-interactive-bg-active': 'rgba(181, 137, 0, 0.16)',
      '--dsw-alias-interactive-bg-hover-accent': 'rgba(181, 137, 0, 0.20)',
      '--dsw-alias-interactive-bg-hover-danger': 'rgba(220, 50, 47, 0.08)',
      '--dsw-alias-interactive-bg-hover-solid': '#eee8d5',
      '--dsw-alias-interactive-bg-hover': 'rgba(181, 137, 0, 0.08)',

      // Text labels (canonical roles: body base00, secondary base01, comments base1)
      '--dsw-alias-label-caption': '#93a1a1',
      '--dsw-alias-label-dimmed': '#93a1a1',
      '--dsw-alias-label-primary-bluish': '#268bd2',
      '--dsw-alias-label-primary-dimmed': '#839496',
      '--dsw-alias-label-primary-foreground': '#fdf6e3',
      '--dsw-alias-label-primary-inverted': '#002b36',
      '--dsw-alias-label-primary': '#657b83',
      '--dsw-alias-label-secondary': '#586e75',
      '--dsw-alias-label-tertiary': '#93a1a1',

      // Markdown / code (base2 code surfaces on the base3 editor)
      '--dsw-alias-markdown-citation': '#eee8d5',
      '--dsw-alias-markdown-code-block-banner': '#ddd6c1',
      '--dsw-alias-markdown-code-block': '#eee8d5',
      '--dsw-alias-markdown-code-segment-selected': '#fdf6e3',
      '--dsw-alias-markdown-code-segment-unselected': '#eee8d5',
      '--dsw-alias-markdown-inline-code': '#eee8d5',
      '--dsw-alias-markdown-placeholder': '#ddd6c1',
      '--dsw-alias-markdown-tag': '#ddd6c1',

      // Scrollbars (warm-olive steps of the base2 family)
      '--dsw-alias-scrollbar-bg-l1': '#ddd6c1',
      '--dsw-alias-scrollbar-bg-l2': '#c9bfa4',
      '--dsw-alias-scrollbar-hover-l1': '#c9bfa4',
      '--dsw-alias-scrollbar-hover-l2': '#b8ad8d',

      // Semantic states (canonical accent pairings)
      '--dsw-alias-state-business-primary': '#268bd2',
      '--dsw-alias-state-business-tertiary': '#eee8d5',
      '--dsw-alias-state-error-primary': '#dc322f',
      '--dsw-alias-state-error-secondary': '#d33682',
      '--dsw-alias-state-success-primary': '#859900',
      '--dsw-alias-state-success-secondary': '#2aa198',
      '--dsw-alias-state-success-tertiary': '#eee8d5',
      '--dsw-alias-state-warn-label': '#b58900',
      '--dsw-alias-state-warn-primary': '#b58900',
      '--dsw-alias-state-warn-secondary': '#cb4b16',
      '--dsw-alias-state-warn-tertiary': '#eee8d5',

      // Toast / tooltip (dark toast surfaces, like the stock light theme)
      '--dsw-alias-toast-bg': '#073642',
      '--dsw-alias-tooltip-bg': '#002b36',

      // Specific surfaces
      '--dsw-specific-bubble-highlight': '#dfca88',
      '--dsw-specific-bubble': '#eee8d5',
      '--dsw-specific-input-major': '#fdf6e3',
      '--dsw-specific-login-input': '#f7f0e0',
      '--dsw-specific-menu': '#eee8d5',
      '--dsw-specific-selector': '#dfca88',
      '--dsw-specific-sidebar-fill': '#eee8d5',
      '--dsw-specific-sidebar-nav-item-active-accent': '#b58900',
      '--dsw-specific-sidebar-nav-item-active': '#dfca88',
      '--dsw-specific-sidebar-nav-item-hover': '#eae0c0',
      '--dsw-specific-tip': '#ddd6c1',
    },
  },
]
