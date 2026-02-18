/** Build Notion page URL for opening in browser. Notion expects page ID without dashes in URLs. */
export function getNotionPageUrl(pageId: string): string {
  const cleanId = String(pageId).trim().replace(/-/g, '');
  return `https://www.notion.so/${cleanId}?pvs=21`;
}
