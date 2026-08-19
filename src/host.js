// dsh-theme-palettes — Host half.
//
// One job, behind an optional-service injection so the row still mounts on
// compositions that lack the settings seam:
//
//   Register the durable `theme-palettes` settings namespace on the Host
//   settings seam. rc7 serves every registered namespace on the settings
//   WIRE (the old hardcoded allowlist is gone), so this single registration
//   is what makes the mapping reach the browser through the standard
//   settings scope — and what makes the Plugin configuration tab dispatch
//   the "Theme palettes" card, which is keyed by this same namespace.
//
// `build.mjs` inlines this module into the generated `index.js`; the
// contract pieces live in `src/host-schema.js` so the zero-dependency test
// suite can exercise them.

import z from '@deepseek-ai/schemastery'
import {
  registerNamespace,
} from './host-schema.js'

export function apply(ctx) {
  // Registration rides the settings seam's own lifecycle: if the provider
  // unmounts or this row is disposed, the namespace goes with it.
  ctx.inject(['settings'], (settingsCtx) => {
    registerNamespace(settingsCtx.settings, z)
  })
}
