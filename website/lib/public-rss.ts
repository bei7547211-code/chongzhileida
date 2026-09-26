import { publicPlatforms } from '@/data/public-platforms';
export function publicRss(provider?: string) {
  const platforms = publicPlatforms.filter(
    (p) => !provider || p.id === provider,
  );
  const items = platforms
    .flatMap((p) => p.announcements.map((a) => ({ ...a, platform: p.name })))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const escape = (v: string) =>
    v
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  const root = 'https://www.resetrelay.com';
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${platforms.length === 1 ? platforms[0].name : 'AI'} 重置雷达</title><link>${root}/${provider || ''}</link><description>已核验公开公告；不代表个人余额。仅含明确适用范围的重置。</description><language>zh-CN</language><lastBuildDate>${new Date(items[0]?.publishedAt || 0).toUTCString()}</lastBuildDate><atom:link href="${root}/${provider ? provider + '/' : ''}feed.xml" rel="self" type="application/rss+xml"/>${items.map((a) => `<item><title>${escape(a.platform + ' · ' + a.title)}</title><link>${escape(a.url)}</link><guid isPermaLink="true">${escape(a.url)}</guid><pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate><description>${escape('适用范围：' + a.scope + '。原文：' + a.text)}</description></item>`).join('')}</channel></rss>`;
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
