#!/usr/bin/env node
/**
 * Extracts node positions from a draw.io XML file and writes them
 * to a Notion database's "EditorPosition" column.
 *
 * Usage:
 *   node scripts/drawio-positions-to-notion.mjs <drawio-file> [options]
 *
 * Options:
 *   --api-key <key>       Notion Integration Token (or set NOTION_API_KEY env var)
 *   --db-id <id>          Notion Database ID (or set NOTION_DB_ID env var)
 *   --column <name>       Notion column name for positions (default: "EditorPosition")
 *   --dry-run             Parse and print, but don't write to Notion
 *   --help                Show this help
 *
 * The script matches draw.io nodes to Notion pages via:
 *   1. notionPageId attribute → Notion page ID (primary, most reliable)
 *   2. ItemNotionID attribute → TechCraftID property (fallback)
 *
 * Position format stored in Notion: JSON {"x": 1234, "y": 5678}
 */

import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// 1. Parse CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

function getArg(name) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}
const hasFlag = (name) => args.includes(name);

if (hasFlag('--help') || args.length === 0) {
  console.log(`
Usage: node scripts/drawio-positions-to-notion.mjs <drawio-file> [options]

Options:
  --api-key <key>       Notion Integration Token (or NOTION_API_KEY env)
  --db-id <id>          Notion Database ID (or NOTION_DB_ID env)
  --column <name>       Notion column for positions (default: "EditorPosition")
  --dry-run             Parse & print only, no Notion writes
  --help                Show this help
`);
  process.exit(0);
}

const drawioFile = args.find(a => !a.startsWith('--'));
if (!drawioFile) {
  console.error('Error: no draw.io file specified');
  process.exit(1);
}

/**
 * Read credentials from .notion-credentials file (one value per line):
 *   Line 1: API key
 *   Line 2: Database ID
 * Falls back to CLI args / env vars.
 */
function loadCredentialsFile() {
  const credPaths = [
    path.join(path.dirname(drawioFile || '.'), '.notion-credentials'),
    path.join(process.cwd(), '.notion-credentials'),
    path.join(process.cwd(), 'scripts', '.notion-credentials'),
  ];
  for (const p of credPaths) {
    try {
      const lines = fs.readFileSync(p, 'utf-8').split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length >= 1) {
        console.log(`Loaded credentials from: ${p}`);
        return { apiKey: lines[0], dbId: lines[1] || '' };
      }
    } catch { /* file not found — try next */ }
  }
  return null;
}

const creds = loadCredentialsFile();
const rawApiKey = getArg('--api-key') || process.env.NOTION_API_KEY || creds?.apiKey || '';
const rawDbId = getArg('--db-id') || process.env.NOTION_DB_ID || creds?.dbId || '';

// Strip any non-ASCII chars that may sneak in from terminal encoding
const API_KEY = rawApiKey.trim().replace(/[^\x20-\x7E]/g, '');
const DB_ID = rawDbId.trim().replace(/[^\x20-\x7E]/g, '');
const COLUMN = getArg('--column') || 'EditorPosition';
const DRY_RUN = hasFlag('--dry-run');

if (API_KEY) {
  console.log(`API key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)} (${API_KEY.length} chars)`);
  if (!API_KEY.startsWith('ntn_') && !API_KEY.startsWith('secret_')) {
    console.warn(`⚠ Warning: key doesn't start with "ntn_" or "secret_". Sanitization may have removed valid chars.`);
    console.warn(`  Raw input was ${rawApiKey.length} chars, after cleanup ${API_KEY.length} chars.`);
    if (rawApiKey.length !== API_KEY.length) {
      console.warn(`  ${rawApiKey.length - API_KEY.length} non-ASCII chars were removed!`);
      console.warn(`  Tip: save the key in a file called .notion-credentials (line 1 = key, line 2 = db id)`);
    }
  }
}

if (!DRY_RUN && (!API_KEY || !DB_ID)) {
  console.error(`
Error: API key and Database ID are required.

Three ways to provide them:

1. File (recommended — avoids encoding issues):
   Create a file called .notion-credentials in the project root:
     ntn_YOUR_API_KEY_HERE
     YOUR_DATABASE_ID_HERE

2. CLI args:
   node scripts/drawio-positions-to-notion.mjs file.xml --api-key ntn_xxx --db-id xxx

3. Env vars:
   set NOTION_API_KEY=ntn_xxx
   set NOTION_DB_ID=xxx

Use --dry-run to test parsing without Notion.
`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Parse draw.io XML
// ---------------------------------------------------------------------------
console.log(`\nReading: ${drawioFile}`);
const xml = fs.readFileSync(drawioFile, 'utf-8');

/**
 * @typedef {{ notionPageId: string, techCraftId: string, name: string, x: number, y: number, width: number, height: number }} DrawioNode
 */

/** @type {DrawioNode[]} */
const nodes = [];

// Parse UserObject blocks (each is a tech node)
const blockRegex = /<UserObject[\s\S]*?<\/UserObject>/g;
let match;
while ((match = blockRegex.exec(xml)) !== null) {
  const block = match[0];

  // Extract attributes from UserObject tag
  const getAttr = (name) => {
    const r = block.match(new RegExp(`${name}="([^"]*?)"`));
    return r ? r[1] : '';
  };

  const notionPageId = getAttr('notionPageId');
  const techCraftId = getAttr('ItemNotionID');
  const name = getAttr('RuName') || getAttr('label')?.substring(0, 40) || '?';

  // Extract geometry: <mxGeometry x="..." y="..." width="..." height="..." .../>
  const geoMatch = block.match(
    /<mxGeometry\s[^>]*?x="([^"]+)"[^>]*?y="([^"]+)"[^>]*?(?:width="([^"]+)")?[^>]*?(?:height="([^"]+)")?/
  );
  // Also try reversed order (height before width, y before x, etc.)
  const geoMatch2 = block.match(
    /<mxGeometry\s[^>]*?height="([^"]+)"[^>]*?width="([^"]+)"[^>]*?x="([^"]+)"[^>]*?y="([^"]+)"/
  );

  let x, y, width, height;
  if (geoMatch) {
    x = parseFloat(geoMatch[1]);
    y = parseFloat(geoMatch[2]);
    width = parseFloat(geoMatch[3] || '240');
    height = parseFloat(geoMatch[4] || '115');
  } else if (geoMatch2) {
    height = parseFloat(geoMatch2[1]);
    width = parseFloat(geoMatch2[2]);
    x = parseFloat(geoMatch2[3]);
    y = parseFloat(geoMatch2[4]);
  }

  if (x == null || isNaN(x)) continue; // skip nodes without geometry

  if (!notionPageId && !techCraftId) continue; // can't match to Notion

  nodes.push({ notionPageId, techCraftId, name, x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });
}

console.log(`Parsed ${nodes.length} nodes with positions from draw.io\n`);

if (nodes.length === 0) {
  console.log('No nodes found. Check that the XML contains <UserObject> elements with notionPageId or ItemNotionID attributes.');
  process.exit(0);
}

// Print table
console.log('TechCraftID          | notionPageId                         | Name                          | Position');
console.log('---------------------|--------------------------------------|-------------------------------|----------');
for (const n of nodes.slice(0, 20)) {
  const id = (n.techCraftId || '').padEnd(20);
  const pid = (n.notionPageId || '').padEnd(36);
  const nm = (n.name || '').substring(0, 30).padEnd(30);
  console.log(`${id} | ${pid} | ${nm} | ${n.x},${n.y}`);
}
if (nodes.length > 20) console.log(`... and ${nodes.length - 20} more\n`);

if (DRY_RUN) {
  console.log('\n--dry-run: skipping Notion writes.');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 3. Query Notion DB to build pageId → page map
// ---------------------------------------------------------------------------
const NOTION_VERSION = '2022-06-28';

async function notionFetch(path, init = {}) {
  const url = `https://api.notion.com/v1${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Notion ${res.status}: ${body}`);
  }
  return JSON.parse(body);
}

async function queryAllPages() {
  const pages = [];
  let cursor = undefined;
  let hasMore = true;
  while (hasMore) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await notionFetch(`/databases/${DB_ID}/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    pages.push(...res.results);
    hasMore = res.has_more;
    cursor = res.next_cursor;
  }
  return pages;
}

console.log('\nQuerying Notion database...');
const pages = await queryAllPages();
console.log(`Found ${pages.length} pages in Notion\n`);

// Build lookup: techCraftId → pageId
const techCraftIdToPageId = new Map();
for (const page of pages) {
  // Try to find TechCraftID in properties
  for (const [, prop] of Object.entries(page.properties)) {
    if (prop.type === 'formula' && prop.formula?.string?.startsWith('TECHCRAFT-')) {
      techCraftIdToPageId.set(prop.formula.string, page.id);
    }
    if (prop.type === 'rich_text' && prop.rich_text?.[0]?.plain_text?.startsWith('TECHCRAFT-')) {
      techCraftIdToPageId.set(prop.rich_text[0].plain_text, page.id);
    }
    if (prop.type === 'title' && prop.title?.[0]?.plain_text?.startsWith('TECHCRAFT-')) {
      techCraftIdToPageId.set(prop.title[0].plain_text, page.id);
    }
    if (prop.type === 'unique_id' && prop.unique_id) {
      const uid = `${prop.unique_id.prefix || ''}${prop.unique_id.prefix ? '-' : ''}${prop.unique_id.number}`;
      techCraftIdToPageId.set(uid, page.id);
    }
  }
}
console.log(`Built TechCraftID lookup: ${techCraftIdToPageId.size} entries\n`);

// ---------------------------------------------------------------------------
// 4. Match draw.io nodes → Notion pages, then update EditorPosition
// ---------------------------------------------------------------------------
/** Normalize Notion page ID: remove dashes for comparison */
function normalizeId(id) {
  return id.replace(/-/g, '').toLowerCase();
}

// Build set of all page IDs (normalized) for fast lookup
const pageIdSet = new Map();
for (const page of pages) {
  pageIdSet.set(normalizeId(page.id), page.id);
}

let matched = 0;
let skipped = 0;
let updated = 0;
let errors = 0;

for (const node of nodes) {
  // Try to find the Notion page ID
  let targetPageId = null;

  // 1. Direct notionPageId match
  if (node.notionPageId) {
    const normalized = normalizeId(node.notionPageId);
    targetPageId = pageIdSet.get(normalized);
  }

  // 2. Fallback: TechCraftID match
  if (!targetPageId && node.techCraftId) {
    targetPageId = techCraftIdToPageId.get(node.techCraftId);
  }

  if (!targetPageId) {
    skipped++;
    if (skipped <= 5) {
      console.log(`  SKIP: ${node.name} (no match in Notion)`);
    }
    continue;
  }

  matched++;

  const posJson = JSON.stringify({ x: node.x, y: node.y });

  try {
    await notionFetch(`/pages/${targetPageId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        properties: {
          [COLUMN]: {
            rich_text: [{ text: { content: posJson } }],
          },
        },
      }),
    });
    updated++;
    if (updated <= 10 || updated % 20 === 0) {
      console.log(`  ✓ ${node.techCraftId || '?'} "${node.name}" → ${posJson}`);
    }
  } catch (err) {
    errors++;
    console.error(`  ✗ ${node.techCraftId || '?'} "${node.name}": ${err.message}`);
  }

  // Rate limit: Notion allows ~3 req/s
  if (matched % 3 === 0) {
    await new Promise(r => setTimeout(r, 350));
  }
}

console.log(`
Done!
  Matched: ${matched}
  Updated: ${updated}
  Skipped: ${skipped}
  Errors:  ${errors}
`);
