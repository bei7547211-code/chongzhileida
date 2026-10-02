// Explicit local-only RSS import. No full articles, models, notifications or scheduler.
import { readFileSync } from 'node:fs';
const { password } = JSON.parse(readFileSync(new URL('../.data/local-preview/credentials.json', import.meta.url), 'utf8'));
process.env.DATABASE_URL = 'postgres://postgres:' + password + '@127.0.0.1:55439/resetrelay';
const { fetchRss } = await import('../packages/backend/src/sources/rss.ts');
const { newsItems, saveNews } = await import('../packages/backend/src/publication/ai-news.ts');
const { closeDb } = await import('../packages/backend/src/db.ts');
const chosen = ['rss-openai-news', 'rss-google-deepmind', 'rss-hugging-face', 'rss-techcrunch-ai', 'rss-the-verge-ai'];
const config = JSON.parse(readFileSync(new URL('../industry/sources.json', import.meta.url), 'utf8'));
let success = 0;
try {
  await Promise.all(config.sources.filter((s: { id: string }) => chosen.includes(s.id)).map(async (s: any) => {
    try {
      const result = await fetchRss({ ...s, enabled: true, cursor: null, fail_count: 0 });
      const items = newsItems(result.candidates, { name: s.name, category: s.first_party ? '官方 / 产品更新' : '技术媒体' });
      if (!items.length) throw new Error('No valid dated entries');
      await saveNews(s.id, items); success++;
      console.log(JSON.stringify({ source: s.name, imported: items.length }));
    } catch {
      await saveNews(s.id, null);
      console.log(JSON.stringify({ source: s.name, status: 'unavailable; previous data retained' }));
    }
  }));
  if (!success) process.exitCode = 1;
} finally { await closeDb(); }
