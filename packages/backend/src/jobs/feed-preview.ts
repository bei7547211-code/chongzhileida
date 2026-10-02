// Free RSS-only collection. No editorial/model, notification or legacy reset jobs are registered.
import type {PgBoss} from 'pg-boss';
import {sql} from '../db.ts';
import {collectSource} from '../sources/collect.ts';
import {ensureQueue,recordRun} from './queue.ts';

export async function collectDueFeedPreviews() {
  if(process.env.COLLECT_ENABLED !== 'true') return {skipped:true,results:[]};
  // Session lock prevents overlapping workers; HTTP requests remain outside a DB transaction.
  const connection = await sql.reserve();
  let locked=false;
  try {
    const [lock]=await connection`SELECT pg_try_advisory_lock(hashtext('relay-feed-preview')) AS acquired`;
    locked=lock.acquired;
    if(!locked) return {skipped:true,results:[]};
    const sources=await connection`SELECT id FROM sources WHERE enabled AND kind='rss'
      AND config->>'publishFeedSummary'='true' AND participation_mode='editorial'
      AND (next_fetch_at IS NULL OR next_fetch_at<=now()) ORDER BY next_fetch_at NULLS FIRST,id LIMIT 5`;
    const results=[];
    for(const source of sources) results.push(await collectSource(source.id));
    return {skipped:false,results};
  } finally {
    if(locked) await connection`SELECT pg_advisory_unlock(hashtext('relay-feed-preview'))`;
    connection.release();
  }
}

export async function registerFeedPreviewJobs(boss:PgBoss) {
  const queue='relay.feed-preview';
  await ensureQueue(queue,{policy:'singleton',retryLimit:2,retryDelay:60,retryBackoff:true,expireInSeconds:600});
  await boss.work(queue,{pollingIntervalSeconds:2},async()=>recordRun(queue,()=>collectDueFeedPreviews()));
  await boss.schedule(queue,'* * * * *',{}, {tz:'Asia/Shanghai'});
  await boss.send(queue,{}, {singletonKey:'startup'});
}
