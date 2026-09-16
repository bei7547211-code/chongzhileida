import { announcements, tibo } from '@/data/reset-history';

export const dynamic = 'force-static';

const siteUrl = 'https://www.resetrelay.com';

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function GET() {
  const items = announcements
    .map(
      (announcement) => `
    <item>
      <title>${escapeXml(announcement.title)}</title>
      <link>${escapeXml(announcement.xUrl)}</link>
      <guid isPermaLink="true">${escapeXml(announcement.xUrl)}</guid>
      <pubDate>${new Date(announcement.publishedAt).toUTCString()}</pubDate>
      <description>${escapeXml(`${announcement.summary} 原文：${announcement.original}`)}</description>
    </item>`,
    )
    .join('');

  const latestPublishedAt =
    announcements[0]?.publishedAt ?? new Date(0).toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Codex 重置雷达</title>
    <link>${siteUrl}</link>
    <description>追踪 ${escapeXml(tibo.handle)} 发布的已核验 Codex 重置公告。</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date(latestPublishedAt).toUTCString()}</lastBuildDate>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
