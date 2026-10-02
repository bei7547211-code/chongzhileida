// Explicit local-only RSS import. No full articles, models, notifications or scheduler.
import { readFileSync } from 'node:fs';
const { password } = JSON.parse(readFileSync(new URL('../.data/local-preview/credentials.json', import.meta.url), 'utf8'));
process.env.DATABASE_URL = 'postgres://postgres:' + password + '@127.0.0.1:55439/resetrelay';
const { collectSource } = await import('../packages/backend/src/sources/collect.ts');
const { closeDb } = await import('../packages/backend/src/db.ts');
const chosen = ['rss-openai-news', 'rss-google-deepmind', 'rss-hugging-face', 'rss-techcrunch-ai', 'rss-the-verge-ai'];
const config = JSON.parse(readFileSync(new URL('../industry/sources.json', import.meta.url), 'utf8'));
let success = 0;
try {
  await Promise.all(config.sources.filter((s: { id: string }) => chosen.includes(s.id)).map(async (s: any) => {
    try {
      const result = await collectSource(s.id,{force:true});
      if(result.status==='ok') success++;
      console.log(JSON.stringify({ source: s.name, status:result.status,created:result.created,revised:result.revised }));
    } catch {
      console.log(JSON.stringify({ source: s.name, status: 'unavailable; previous data retained' }));
    }
  }));
  if (!success) process.exitCode = 1;
} finally { await closeDb(); }
