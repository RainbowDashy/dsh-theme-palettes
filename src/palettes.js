// dsh-theme-palettes — built-in palette catalog.
//
// Each entry carries the full flat token map (name → CSS value) that the
// runtime core stacks as an override layer when the palette is the active
// mapping target. `build.mjs` JSON-stringifies this array into the generated
// client bundle, so keep the shape stable: `{ id, label, tokens }`.

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
]
