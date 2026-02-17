import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Notion API proxy plugin for Vite dev server.
 *
 * Proxies /api/notion/* → https://api.notion.com/v1/*
 * This avoids CORS issues when calling Notion API from the browser.
 *
 * We use Connect's route-based middleware (server.middlewares.use('/api/notion', handler))
 * so it has priority over Vite's SPA fallback (which returns index.html for unmatched paths).
 */
function notionProxyPlugin() {
  return {
    name: 'notion-proxy',
    configureServer(server: any) {
      server.middlewares.use('/api/notion', async (req: any, res: any) => {
        const subPath = req.url || '/'
        const notionPath = `/v1${subPath.startsWith('/') ? '' : '/'}${subPath}`
        const targetUrl = `https://api.notion.com${notionPath}`

        console.log('[Notion proxy]', req.method, req.originalUrl, '→', targetUrl)

        // Forward request headers, replacing host/origin
        // Forward request headers; strip browser-specific ones that confuse the proxy
        const skipReqHeaders = new Set([
          'host', 'origin', 'referer', 'accept-encoding',
        ])
        const headers: Record<string, string> = {}
        for (const [k, v] of Object.entries(req.headers)) {
          if (v && !skipReqHeaders.has(k.toLowerCase())) {
            headers[k] = Array.isArray(v) ? v[0] : String(v)
          }
        }
        headers['host'] = 'api.notion.com'

        try {
          // Read request body for POST/PATCH/PUT
          let body: Buffer | undefined
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            body = await new Promise<Buffer>((resolve, reject) => {
              const chunks: Buffer[] = []
              req.on('data', (c: Buffer) => chunks.push(c))
              req.on('end', () => resolve(Buffer.concat(chunks)))
              req.on('error', reject)
            })
          }

          const notionRes = await fetch(targetUrl, {
            method: req.method || 'GET',
            headers,
            body,
          })

          // Forward response status and headers.
          // Node fetch auto-decompresses gzip/br, so we must strip encoding
          // headers — otherwise the browser tries to decompress already-decoded data.
          const skipHeaders = new Set([
            'transfer-encoding', 'content-encoding', 'content-length',
          ])
          res.statusCode = notionRes.status
          notionRes.headers.forEach((v: string, k: string) => {
            if (!skipHeaders.has(k.toLowerCase())) {
              res.setHeader(k, v)
            }
          })

          const responseBuffer = Buffer.from(await notionRes.arrayBuffer())
          res.setHeader('content-length', String(responseBuffer.length))
          res.end(responseBuffer)
        } catch (err: any) {
          console.error('[Notion proxy error]', err.message || err)
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Proxy error', message: err.message }))
        }
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [notionProxyPlugin(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}))
