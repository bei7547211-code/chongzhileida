import { sql } from '../db.ts';
import { sha256 } from '../lib/ids.ts';
import { collapseWhitespace, stripTags, truncate } from '../lib/text.ts';
import { load } from 'cheerio';
import type { Candidate } from '../sources/types.ts';
import type { NewsItem, NewsResponse } from '@aihot/contracts/ai-news';
import { upsertMaterial } from '../content/materials.ts';
import { publishArticleTx } from './publish.ts';

export function newsItems(candidates: Candidate[], source: { name: string; category: string }, now = Date.now(), limit = 8): NewsItem[] {
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
  return [...items.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, limit);
}

export async function saveNews(id: string, items: NewsItem[] | null) {
  await sql.begin(async tx => {
    const [source] = await tx`SELECT id FROM sources WHERE id=${id} AND kind='rss' AND config->>'publishFeedSummary'='true' FOR UPDATE`;
    if (!source) throw new Error('Feed source is not configured for original summaries');
    if (!items?.length) {
      await tx`UPDATE sources SET last_fetch_at=now(), fail_count=fail_count+1, health='degraded', last_error='Feed unavailable; previous publication retained' WHERE id=${id}`;
      return;
    }
    const safe = newsItems(items.map(i => ({title:i.title, excerpt:i.summary, url:i.url, publishedAt:new Date(i.publishedAt)})), {name:items[0]!.source, category:items[0]!.category});
    if (!safe.length) throw new Error('No valid feed entries');
    for (const item of safe) {
      const result = await upsertMaterial({sourceId:id, title:item.title, excerpt:item.summary, url:item.url,
        publishedAt:new Date(item.publishedAt), bodyStatus:'none', via:'import'}, tx);
      await tx`UPDATE articles SET processing_state='skipped', processing_queued_at=NULL WHERE id=${result.articleId}`;
      await publishArticleTx(tx, result.articleId);
    }
    await tx`UPDATE sources SET last_fetch_at=now(), last_ok_at=now(), fail_count=0, health='ok', last_error=NULL WHERE id=${id}`;
  });
}

export async function readNews(): Promise<NewsResponse> {
  const rows = await sql<{id:string; last_ok_at:Date|null; last_fetch_at:Date; fail_count:number}[]>`
    SELECT id,last_ok_at,last_fetch_at,fail_count FROM sources WHERE config->>'publishFeedSummary'='true' AND last_fetch_at IS NOT NULL ORDER BY id`;
  const items = await sql<{id:string;title:string;summary:string;url:string;published_at:Date;source:string;first_party:boolean}[]>`
    SELECT p.article_id AS id,p.title,p.summary,p.url,p.published_at,s.name AS source,s.first_party
    FROM publications p JOIN sources s ON s.id=p.source_id
    WHERE s.config->>'publishFeedSummary'='true' AND s.participation_mode='editorial'
      AND p.visibility='public' AND p.eligible AND p.published_at IS NOT NULL
      AND (NOT p.selected OR p.visible_after<=now())
    ORDER BY p.published_at DESC,p.article_id DESC LIMIT 30`;
  return {items:items.map(i => ({id:i.id,title:i.title,summary:i.summary,url:i.url,publishedAt:i.published_at.toISOString(),source:i.source,category:i.first_party?'官方 / 产品更新':'技术媒体'})),
    sources:rows.map(r => ({id:r.id,checkedAt:r.last_ok_at?.toISOString()??null,attemptedAt:r.last_fetch_at.toISOString(),failed:r.fail_count>0}))};
}
