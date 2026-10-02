import './setup.ts';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { newsItems, saveNews, readNews } from '../packages/backend/src/publication/ai-news.ts';
import { sql, closeDb } from '@aihot/backend/db';
const now = Date.parse('2026-09-29T03:00:00Z');
const source = { name: 'Test official', category: '官方 / 产品更新' };
const candidate = { title: '<b>Product launch</b>', excerpt: '<p>Public summary</p>', url: 'https://example.com/post?utm_source=test', publishedAt: new Date(now - 1000) };
after(async () => { await sql`DELETE FROM relay_news_sources WHERE id IN ('test-good', 'test-failed')`; await closeDb(); });
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
