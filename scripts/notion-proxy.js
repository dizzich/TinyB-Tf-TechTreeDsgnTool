/**
 * Lightweight Notion API reverse-proxy for production.
 *
 * Listens on PORT (default 3002) and forwards every request to
 * https://api.notion.com/v1/…, preserving Authorization and
 * Notion-Version headers while stripping browser-specific ones.
 *
 * Forces IPv4 to avoid IPv6 connectivity issues on some servers.
 *
 * Usage:
 *   node notion-proxy.js            # listens on 3002
 *   PORT=4000 node notion-proxy.js  # listens on 4000
 */

const http = require('http');
const https = require('https');

const PORT = parseInt(process.env.PORT || '3002', 10);
const NOTION_HOST = 'api.notion.com';

// Browser-specific headers that must NOT be forwarded to Notion API
// (same set that the Vite dev proxy strips)
const SKIP_HEADERS = new Set([
    'host',
    'origin',
    'referer',
    'accept-encoding',
    'connection',
    'cookie',
    'sec-fetch-mode',
    'sec-fetch-site',
    'sec-fetch-dest',
    'sec-ch-ua',
    'sec-ch-ua-mobile',
    'sec-ch-ua-platform',
]);

const server = http.createServer((req, res) => {
    // Build target path:  /databases/xxx  →  /v1/databases/xxx
    const targetPath = '/v1' + (req.url.startsWith('/') ? req.url : '/' + req.url);

    // Forward only safe headers
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
        if (v && !SKIP_HEADERS.has(k.toLowerCase())) {
            headers[k] = Array.isArray(v) ? v[0] : v;
        }
    }
    headers['host'] = NOTION_HOST;

    console.log(`[notion-proxy] ${req.method} ${req.url} → https://${NOTION_HOST}${targetPath}`);

    const proxyReq = https.request({
        hostname: NOTION_HOST,
        port: 443,
        path: targetPath,
        method: req.method,
        headers,
        family: 4, // Force IPv4
    }, (proxyRes) => {
        // Strip transfer/connection headers to avoid double-encoding
        const skipRes = new Set(['transfer-encoding', 'connection', 'content-encoding']);
        const resHeaders = {};
        for (const [k, v] of Object.entries(proxyRes.headers)) {
            if (!skipRes.has(k)) resHeaders[k] = v;
        }
        res.writeHead(proxyRes.statusCode, resHeaders);
        proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
        console.error('[notion-proxy] error:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
    });

    req.pipe(proxyReq, { end: true });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`[notion-proxy] Listening on http://127.0.0.1:${PORT}`);
});
