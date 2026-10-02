import './setup.ts';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { newsItems, saveNews, readNews } from '../packages/backend/src/publication/ai-news.ts';
import { sql, closeDb } from '@aihot/backend/db';
const now = Date.parse('2026-09-29T03:00:00Z');
const source = { name: 'Test official', category: '官方 / 产品更新' };
const candidate = { title: '<b>Product launch</b>', excerpt: '<p>Public summary</p>', url: 'https://example.com/post?utm_source=test', publishedAt: new Date(now - 1000) };
after(async () => {
  await sql`DELETE FROM articles WHERE source_id IN ('test-good', 'test-failed')`;
  await sql`DELETE FROM sources WHERE id IN ('test-good', 'test-failed')`;
  await sql`DELETE FROM relay_news_sources WHERE id IN ('test-good', 'test-failed')`;
  await closeDb();
});
test('news import strips markup, deduplicates URLs, rejects dangerous links and future/unknown dates', () => {
  const items = newsItems([candidate, { ...candidate, url: 'https://example.com/post' },
    { ...candidate, url: 'javascript:alert(1)' }, { ...candidate, publishedAt: null },
    { ...candidate, publishedAt: new Date(now + 86400000) }], source, now);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Product launch');
  assert.equal(items[0].summary, 'Public summary');
  assert.equal(items[0].url, 'https://example.com/post');
  assert.equal(newsItems([{ ...candidate, title: 'It wasn&#8217;t a demo' }], source, now)[0].title, 'It wasn’t a demo');
});
test('failed sources retain their last publication and never clear working sources', async () => {
  for (const id of ['test-good', 'test-failed']) await sql`INSERT INTO sources (id, name, kind, config, site_fulltext) VALUES (${id}, 'Test official', 'rss', '{"publishFeedSummary":true}', false) ON CONFLICT DO NOTHING`;
  const items = newsItems([candidate], source, now);
  await saveNews('test-good', items);
  const before = await readNews();
  await saveNews('test-good', null);
  await saveNews('test-failed', []);
  const after = await readNews();
  assert.deepEqual(after.items, before.items);
  assert.equal(after.sources.find(s => s.id === 'test-good')?.checkedAt, before.sources.find(s => s.id === 'test-good')?.checkedAt);
  assert.equal(after.sources.find(s => s.id === 'test-good')?.failed, true);
});

test('news uses the shared publication, keeps revisions and respects withdrawals', async () => {
  const items = newsItems([candidate], source, now);
  await saveNews('test-good', items);
  const [first] = await sql`SELECT a.id, a.revision, p.selected, p.eligible FROM articles a JOIN publications p ON p.article_id=a.id WHERE a.source_id='test-good'`;
  assert.ok(first, 'RSS must enter the unified library');
  assert.equal(first.selected, false);
  assert.equal(first.eligible, true);
  await saveNews('test-good', items);
  assert.equal((await sql`SELECT revision FROM articles WHERE id=${first.id}`)[0].revision, first.revision);
  await saveNews('test-good', [{ ...items[0], title: 'Corrected product launch' }]);
  assert.equal((await sql`SELECT revision FROM articles WHERE id=${first.id}`)[0].revision, first.revision + 1);
  assert.equal((await readNews()).items.find(i => i.id === first.id)?.title, 'Corrected product launch');
  await sql`INSERT INTO editorial_overrides(article_id, visibility) VALUES (${first.id}, 'withdrawn') ON CONFLICT(article_id) DO UPDATE SET visibility='withdrawn'`;
  await saveNews('test-good', items);
  assert.equal((await readNews()).items.some(i => i.id === first.id), false);
});
