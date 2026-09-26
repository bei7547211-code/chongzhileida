import { publicPlatforms } from '@/data/public-platforms';
import { rssItems } from './rss-items';
export function publicRss(provider?: string) {
  const platforms = publicPlatforms.filter(
    (p) => !provider || p.id === provider,
  );
  const items = rssItems(platforms);
  const escape = (v: string) =>
    v
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  const root = 'https://www.resetrelay.com';
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${platforms.length === 1 ? platforms[0].name : 'AI'} 重置雷达</title><link>${root}/${provider || ''}</link><description>包含官方预告、已确认重置和更正；请留意消息状态，不代表个人余额。</description><language>zh-CN</language><lastBuildDate>${new Date(items[0]?.date || 0).toUTCString()}</lastBuildDate><atom:link href="${root}/${provider ? provider + '/' : ''}feed.xml" rel="self" type="application/rss+xml"/>${items.map((a) => `<item><title>${escape(a.title)}</title><link>${escape(a.url)}</link><guid isPermaLink="false">${escape(a.guid)}</guid><pubDate>${new Date(a.date).toUTCString()}</pubDate><description>${escape(a.description)}</description></item>`).join('')}</channel></rss>`;
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
