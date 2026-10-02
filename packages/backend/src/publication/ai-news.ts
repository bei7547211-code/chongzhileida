import { sql } from '../db.ts';
import { sha256 } from '../lib/ids.ts';
import { collapseWhitespace, stripTags, truncate } from '../lib/text.ts';
import { load } from 'cheerio';
import type { Candidate } from '../sources/types.ts';
import type { NewsItem, NewsResponse } from '@aihot/contracts/ai-news';

export function newsItems(candidates: Candidate[], source: { name: string; category: string }, now = Date.now()): NewsItem[] {
  const items = new Map<string, NewsItem>();
  for (const c of candidates) {
    const time = c.publishedAt?.getTime();
    if (!time || !Number.isFinite(time) || time > now + 3600000) continue;
    let url: URL; try { url = new URL(c.url); } catch { continue; }
    if (url.protocol !== 'https:' || url.username || url.password) continue;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (key.startsWith('utm_')) url.searchParams.delete(key);
    const plain = (value: string) => collapseWhitespace(load(stripTags(value), null, false).text());
    const title = truncate(plain(c.title ?? ''), 300);
    if (!title) continue;
    const item = { id: sha256(url.href), title, summary: truncate(plain(c.excerpt ?? ''), 160),
      url: url.href, publishedAt: new Date(time).toISOString(), source: source.name, category: source.category };
    items.set(item.id, item);
  }
  return [...items.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 8);
}

export async function saveNews(id: string, items: NewsItem[] | null) {
  if (!items?.length) {
    await sql`INSERT INTO relay_news_sources (id, payload, failed) VALUES (${id}, '[]', true)
      ON CONFLICT (id) DO UPDATE SET attempted_at = now(), failed = true`;
    return;
  }
  await sql`INSERT INTO relay_news_sources (id, payload, checked_at) VALUES (${id}, ${sql.json(items.map(x => ({ ...x })))}, now())
    ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, checked_at = now(), attempted_at = now(), failed = false`;
}

export async function readNews(): Promise<NewsResponse> {
  const rows = await sql<{ id: string; payload: NewsItem[]; checked_at: Date | null; attempted_at: Date; failed: boolean }[]>
    `SELECT id, payload, checked_at, attempted_at, failed FROM relay_news_sources ORDER BY id`;
  const unique = new Map(rows.flatMap(r => r.payload).map(item => [item.id, item]));
  return { items: [...unique.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 30),
    sources: rows.map(r => ({ id: r.id, checkedAt: r.checked_at?.toISOString() ?? null, attemptedAt: r.attempted_at.toISOString(), failed: r.failed })) };
}
