// Explicit opt-in local RSS worker; no launch agent, deployment, model or notification activation.
import {readFileSync} from 'node:fs';
if(!process.argv.includes('--enable-rss')) throw new Error('Use --enable-rss to enable the five configured free RSS sources');
const {password}=JSON.parse(readFileSync(new URL('../.data/local-preview/credentials.json',import.meta.url),'utf8'));
process.env.DATABASE_URL='postgres://postgres:'+password+'@127.0.0.1:55439/resetrelay';
process.env.COLLECT_ENABLED='true';
process.env.MODEL_CALLS_ENABLED='false';
process.env.FEISHU_CONTENT_PUSH_ENABLED='false';
process.env.FEISHU_INTERNAL_ENABLED='false';
process.env.INDEXNOW_SUBMIT_ENABLED='false';
const {sql,closeDb}=await import('../packages/backend/src/db.ts');
const {getBoss,stopBoss}=await import('../packages/backend/src/jobs/queue.ts');
const {registerFeedPreviewJobs}=await import('../packages/backend/src/jobs/feed-preview.ts');
const chosen=['rss-openai-news','rss-google-deepmind','rss-hugging-face','rss-techcrunch-ai','rss-the-verge-ai'];
await sql`UPDATE sources SET enabled=true WHERE id IN ${sql(chosen)} AND config->>'publishFeedSummary'='true'`;
await registerFeedPreviewJobs(await getBoss());
console.log('Free RSS worker running: per-source interval, bounded failure backoff; no model calls or notifications.');
let stopping=false;
async function stop(){if(stopping)return;stopping=true;await stopBoss();await closeDb();process.exit(0);}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
