import './setup.ts';
import assert from 'node:assert/strict';
import http from 'node:http';
import {test,after} from 'node:test';
import {sql,closeDb} from '@aihot/backend/db';
import {config} from '@aihot/backend/config';
import {collectSource} from '@aihot/backend/sources/collect';
import {loadPool} from '@aihot/backend/publication/pool';
import {v1Items} from '@aihot/backend/publication/v1';
import {itemFeed} from '@aihot/backend/publication/feeds';
import {publishArticle} from '@aihot/backend/publication/publish';
import {loadItemDetail} from '@aihot/backend/publication/detail';
import {readNews} from '@aihot/backend/publication/ai-news';
import {collectDueFeedPreviews} from '@aihot/backend/jobs/feed-preview';

let broken=false, version=1;
const server=http.createServer((req,res)=>{
  if(broken){res.writeHead(503);res.end('unavailable');return;}
  if(req.headers['if-none-match']===`"${version}"`){res.writeHead(304);res.end();return;}
  res.writeHead(200,{'content-type':'application/rss+xml',etag:`"${version}"`});
  res.end(`<rss version="2.0"><channel><title>Test feed</title><item><title>Feed proof ${version}</title><link>https://example.org/feed-library-proof</link><description>Public product summary</description><pubDate>${new Date(Date.now()-60000).toUTCString()}</pubDate></item></channel></rss>`);
});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
config.allowPrivateNetworkFetch=true;
after(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await closeDb();});

test('feed → library → website/API/RSS, failure backoff, 304, correction and withdrawal',async()=>{
  const feedUrl=`http://127.0.0.1:${(server.address() as {port:number}).port}/feed`;
  await sql`INSERT INTO sources(id,name,kind,config,site_fulltext) VALUES('feed-library-proof','Proof','rss',${sql.json({feedUrl,publishFeedSummary:true})},false)`;
  assert.equal((await collectSource('feed-library-proof')).created,1);
  const [article]=await sql`SELECT id,processing_state FROM articles WHERE source_id='feed-library-proof'`;
  assert.equal(article.processing_state,'skipped','free feed summaries must not enter paid jobs');
  const query={mode:'all' as const,window:'7d' as const,by:'published' as const,category:null,q:null,limit:50,cursor:null};
  assert.ok((await loadPool({channel:'all',category:null,tag:null})).items.some(i=>i.id===article.id));
  assert.ok((await v1Items(query)).items.some(i=>i.id===article.id));
  assert.ok((await itemFeed('all',null)).includes('Feed proof 1'));
  assert.ok(!(await v1Items({...query,mode:'selected'})).items.some(i=>i.id===article.id));
  const detail=await loadItemDetail(article.id);
  assert.equal(detail.kind,'found');
  await collectSource('feed-library-proof');
  assert.equal((await collectSource('feed-library-proof')).found,0);
  const [before]=await sql`SELECT cursor,last_ok_at FROM sources WHERE id='feed-library-proof'`;
  broken=true;
  assert.equal((await collectSource('feed-library-proof')).status,'failed');
  const [failed]=await sql`SELECT cursor,last_ok_at,fail_count,next_fetch_at FROM sources WHERE id='feed-library-proof'`;
  assert.equal(failed.fail_count,1);
  assert.ok(failed.next_fetch_at>new Date());
  assert.deepEqual(failed.cursor,before.cursor);
  assert.deepEqual(failed.last_ok_at,before.last_ok_at);
  assert.ok((await readNews()).items.some(i=>i.id===article.id));
  broken=false;version=2;
  assert.equal((await collectSource('feed-library-proof')).revised,1);
  assert.equal((await sql`SELECT fail_count FROM sources WHERE id='feed-library-proof'`)[0].fail_count,0);
  assert.ok((await itemFeed('all',null)).includes('Feed proof 2'));
  await sql`INSERT INTO editorial_overrides(article_id,visibility) VALUES(${article.id},'withdrawn')`;
  await publishArticle(article.id);
  assert.ok(!(await readNews()).items.some(i=>i.id===article.id));
  assert.ok(!(await v1Items(query)).items.some(i=>i.id===article.id));
  assert.ok(!(await itemFeed('all',null)).includes('Feed proof 2'));
  assert.ok(!(await loadPool({channel:'all',category:null,tag:null,now:new Date()})).items.some(i=>i.id===article.id));
  assert.equal((await loadItemDetail(article.id)).kind,'not_found');
  process.env.COLLECT_ENABLED='false';
  assert.equal((await collectDueFeedPreviews()).skipped,true);
  process.env.COLLECT_ENABLED='true';
  await sql`UPDATE sources SET next_fetch_at=now()-interval '1 minute',enabled=false WHERE id='feed-library-proof'`;
  assert.ok(!(await collectDueFeedPreviews()).results.some(r=>r.sourceId==='feed-library-proof'));
  process.env.COLLECT_ENABLED='false';
});
