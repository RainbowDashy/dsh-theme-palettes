// dsh-theme-palettes — Host half.
//
// Two jobs, both behind optional-service injections so the row still mounts
// on compositions that lack them:
//
//   1. Register the durable `theme-palettes` settings namespace on the Host
//      settings seam. Without this, writes fail even when the wire would
//      serve the namespace.
//   2. Serve the private HTTP route the browser half uses. The standard
//      settings wire refuses third-party namespaces (`settings-not-exposed`,
//      a hardcoded allowlist in the harness api-proxy), so the browser half
//      talks to this route instead; persistence still lands in the same user
//      settings document (settings.yaml) via the mounted settings provider.
//
// `build.mjs` inlines this module into the generated `index.js`; the
// contract pieces live in `src/host-schema.js` so the zero-dependency test
// suite can exercise them.

import z from '@deepseek-ai/schemastery'
import {
  SETTINGS_NAMESPACE,
  HTTP_ROUTE,
  registerNamespace,
  normalizeOps,
} from './host-schema.js'

const MAX_BODY_BYTES = 64 * 1024

function jsonResponse(res, status, body) {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(text)
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > MAX_BODY_BYTES) {
        reject(new Error('request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(data.length === 0 ? {} : JSON.parse(data))
      } catch (error) {
        reject(new Error('request body is not valid JSON'))
      }
    })
    req.on('error', reject)
  })
}

/**
 * Project the registered namespace onto the wire shape the browser half
 * consumes: resolved value, revision, and writability.
 */
function describeNamespace(settings) {
  const descriptor = settings.describe().find((candidate) => String(candidate.ns) === SETTINGS_NAMESPACE)
  if (descriptor === undefined) return undefined
  return {
    value: descriptor.value,
    revision: descriptor.revision,
    writable: settings.writable,
  }
}

export function apply(ctx) {
  // Registration rides the settings seam's own lifecycle: if the provider
  // unmounts or this row is disposed, the namespace goes with it.
  ctx.inject(['settings'], (settingsCtx) => {
    registerNamespace(settingsCtx.settings, z)
  })

  ctx.inject(['webServer'], (httpCtx) => {
    const settings = () => httpCtx.get('settings')
    httpCtx.effect(() => httpCtx.webServer.register({
      kind: 'exact',
      path: HTTP_ROUTE,
      async handler(req, res) {
        const seam = settings()
        if (seam === undefined) {
          jsonResponse(res, 503, { ok: false, error: 'settings provider not mounted' })
          return
        }
        try {
          if (req.method === 'GET') {
            const view = describeNamespace(seam)
            if (view === undefined) {
              jsonResponse(res, 404, { ok: false, error: `settings namespace "${SETTINGS_NAMESPACE}" is not registered` })
              return
            }
            jsonResponse(res, 200, { ok: true, ...view })
            return
          }
          if (req.method === 'POST') {
            const body = await readJsonBody(req)
            const ops = normalizeOps(body.ops)
            const expectedRevision = typeof body.expectedRevision === 'number' ? body.expectedRevision : undefined
            await seam.mutate(SETTINGS_NAMESPACE, ops, expectedRevision)
            const view = describeNamespace(seam)
            jsonResponse(res, 200, { ok: true, ...view })
            return
          }
          jsonResponse(res, 405, { ok: false, error: `method ${req.method ?? 'unknown'} not allowed (GET, POST)` })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          const code = error && error.code === 'SETTINGS_CONFLICT' ? 'settings-conflict' : 'settings-rejected'
          jsonResponse(res, 400, { ok: false, error: message, code })
        }
      },
    }), `theme-palettes: ${HTTP_ROUTE}`)
  })
}
