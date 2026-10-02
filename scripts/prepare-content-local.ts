// Additive migration of the preview RSS island to the shared content/publication tables.
// Does not collect, schedule, call models or overwrite administrator source settings.
import { readFileSync } from 'node:fs';
const {password} = JSON.parse(readFileSync(new URL('../.data/local-preview/credentials.json', import.meta.url),'utf8'));
process.env.DATABASE_URL = 'postgres://postgres:'+password+'@127.0.0.1:55439/resetrelay';
const {sql,closeDb} = await import('../packages/backend/src/db.ts');
const {saveNews} = await import('../packages/backend/src/publication/ai-news.ts');
const {seedTopics} = await import('../packages/backend/src/publication/topics.ts');
const chosen = ['rss-openai-news','rss-google-deepmind','rss-hugging-face','rss-techcrunch-ai','rss-the-verge-ai'];
const {sources} = JSON.parse(readFileSync(new URL('../industry/sources.json',import.meta.url),'utf8'));
try {
  for (const s of sources.filter((s:{id:string})=>chosen.includes(s.id))) {
    await sql`INSERT INTO sources(id,name,kind,config,tier,first_party,site_fulltext,syndicate_fulltext,enabled,interval_minutes)
      VALUES(${s.id},${s.name},'rss',${sql.json({...s.config,publishFeedSummary:true})},${s.tier},${s.first_party??false},false,false,false,60)
      ON CONFLICT(id) DO NOTHING`;
  }
  const legacy = await sql`SELECT id,payload,checked_at,attempted_at,failed FROM relay_news_sources ORDER BY id`;
  for (const row of legacy) {
    if (!chosen.includes(row.id)) continue;
    const [current]=await sql`SELECT imported_from,last_fetch_at FROM sources WHERE id=${row.id}`;
    if(current?.imported_from==='relay_news_sources:v1') continue;
    if(current?.last_fetch_at && current.last_fetch_at>row.attempted_at){
      await sql`UPDATE sources SET imported_from='relay_news_sources:v1' WHERE id=${row.id}`;
      continue;
    }
    if (row.payload.length) await saveNews(row.id,row.payload);
    // Preserve the real collection timestamp. Migration is not a successful refresh.
    await sql`UPDATE sources SET last_ok_at=${row.checked_at},last_fetch_at=${row.attempted_at},
      fail_count=${row.failed?1:0},health=${row.failed?'degraded':'ok'},imported_from='relay_news_sources:v1' WHERE id=${row.id}`;
  }
  console.log(JSON.stringify({legacySourcesInspected:legacy.length,topics:await seedTopics(),collectionSettingsChanged:false}));
} finally {await closeDb();}
