#!/usr/bin/env node
/**
 * Direct Notion API test (bypasses browser and proxy).
 * Usage: node scripts/test-notion.mjs <token> <database_id>
 * Example: node scripts/test-notion.mjs ntn_xxx 2b21d9e37d12805fa95fc219c632b294
 */
const [token, databaseId] = process.argv.slice(2);
if (!token || !databaseId) {
  console.error('Usage: node scripts/test-notion.mjs <token> <database_id>');
  process.exit(1);
}

const url = `https://api.notion.com/v1/databases/${databaseId}`;
console.log('Requesting:', url);

const res = await fetch(url, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  },
});

const body = await res.text();
console.log('Status:', res.status, res.statusText);
console.log('Response:', body.slice(0, 500) + (body.length > 500 ? '...' : ''));

if (res.ok) {
  console.log('\nOK: Connection works. If the app still fails, the issue is with the Vite proxy.');
} else {
  console.log('\nFAIL: Notion returned an error. Check token, database ID, and that the integration is added to the database Connections.');
}
