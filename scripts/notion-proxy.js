/**
 * Lightweight Notion API reverse-proxy for production.
 *
 * Listens on PORT (default 3002) and forwards every request to
 * https://api.notion.com/v1/…, preserving Authorization and
 * Notion-Version headers while stripping browser-specific ones.
 *
 * Uses fetch() — same approach as the Vite dev proxy plugin — to
 * ensure identical behaviour between dev and production.
 *
 * Requires Node 18+ (built-in fetch).
 *
 * Usage:
 *   node notion-proxy.js            # listens on 3002
 *   PORT=4000 node notion-proxy.js  # listens on 4000
 */

const http = require('http');

const PORT = parseInt(process.env.PORT || '3002', 10);
const NOTION_HOST = 'api.notion.com';

// Only forward headers that Notion API actually needs.
// Whitelist approach prevents Apache-added headers (X-Forwarded-*, Via, etc.)
// from reaching Notion and causing "invalid_request_url" errors.
const ALLOW_HEADERS = new Set([
    'authorization',
    'notion-version',
    'content-type',
    'accept',
    'user-agent',
]);

const server = http.createServer(async (req, res) => {
    const subPath = req.url || '/';
    const targetPath = `/v1${subPath.startsWith('/') ? '' : '/'}${subPath}`;
    const targetUrl = `https://${NOTION_HOST}${targetPath}`;

    // Forward only whitelisted headers (prevents Apache proxy headers from leaking)
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
        if (v && ALLOW_HEADERS.has(k.toLowerCase())) {
            headers[k] = Array.isArray(v) ? v[0] : String(v);
        }
    }
    headers['host'] = NOTION_HOST;

    console.log(`[notion-proxy] ${req.method} ${req.url} → ${targetUrl}`);

    try {
        // Read request body for POST/PATCH/PUT (same as Vite plugin)
        let body;
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            body = await new Promise((resolve, reject) => {
                const chunks = [];
                req.on('data', (c) => chunks.push(c));
                req.on('end', () => resolve(Buffer.concat(chunks)));
                req.on('error', reject);
            });
        }

        const notionRes = await fetch(targetUrl, {
            method: req.method || 'GET',
            headers,
            body,
        });

        // Strip encoding/length headers to avoid double-compression
        // (fetch auto-decompresses — same as Vite plugin)
        const skipResHeaders = new Set([
            'transfer-encoding', 'content-encoding', 'content-length',
        ]);
        res.statusCode = notionRes.status;
        notionRes.headers.forEach((v, k) => {
            if (!skipResHeaders.has(k.toLowerCase())) {
                res.setHeader(k, v);
            }
        });

        const responseBuffer = Buffer.from(await notionRes.arrayBuffer());
        res.setHeader('content-length', String(responseBuffer.length));

        if (notionRes.status >= 400) {
            console.log(`[notion-proxy] Error ${notionRes.status}:`, responseBuffer.toString().slice(0, 500));
        }

        res.end(responseBuffer);
    } catch (err) {
        console.error('[notion-proxy] error:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`[notion-proxy] Listening on http://127.0.0.1:${PORT}`);
});
