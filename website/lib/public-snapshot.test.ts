import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPublicSnapshot, snapshotResponse } from './public-snapshot.ts';
import { publicPlatforms } from '../data/public-platforms.ts';
import { sideHustles } from '../data/side-hustles.ts';
const metadata = { generatedAt: '2026-09-28T00:00:00Z' };
const build = () => buildPublicSnapshot({ platforms: publicPlatforms, articles: sideHustles }, metadata);

test('public snapshot uses same public source, all AI tags and stable RSS aliases', () => {
  const s = build();
  assert.equal(s.events.length, publicPlatforms.flatMap(p => p.announcements.filter(a => !a.reviewPending)).length);
  assert.equal(s.articles.length, sideHustles.filter(p => p.tags.includes('AI')).length);
  assert.ok(s.articles.some(a => a.category === '视频制作'));
  for (const e of s.events) assert.equal(s.idAliases[e.provider + '-rss-' + encodeURIComponent(e.url)], e.id);
  for (const p of s.platforms) assert.equal(p.latestEventId, s.events.find(e => e.provider === p.id)?.id || null);
  assert.ok(s.platforms.find(p => p.id === 'claude')?.lastAttemptAt);
  const latestCodex = s.events.find(e => e.id === 'codex-2106131810921136451');
  assert.equal(latestCodex?.followUps.length, 2);
  assert.equal(latestCodex?.followUps[1]?.id, '2106239435461579088');
});
test('revision is stable across source order and build metadata, changes with content or checks', () => {
  const original = build();
  const platforms = structuredClone(publicPlatforms).reverse();
  platforms.forEach(p => p.announcements.reverse());
  assert.equal(buildPublicSnapshot({platforms, articles: [...sideHustles].reverse()}, {...metadata, generatedAt: '2026-10-01', releaseId: 'other'}).revision, original.revision);
  platforms[0].announcements[0].text += ' updated';
  assert.notEqual(buildPublicSnapshot({platforms, articles: sideHustles}, metadata).revision, original.revision);
});
test('private pending records, internal source errors and extra fields never escape public projection', () => {
  const platforms = structuredClone(publicPlatforms);
  platforms[0].announcements[0].reviewPending = true;
  platforms[0].error = 'SECRET_INTERNAL_ERROR';
  const articles = structuredClone(sideHustles);
  Object.assign(articles.find(p => p.tags.includes('AI'))!, {reviewPending: true, privatePrompt: 'SECRET_PRIVATE_PROMPT'});
  const s = buildPublicSnapshot({platforms, articles}, metadata);
  assert.ok(!s.events.find(e => e.id === platforms[0].id + '-' + platforms[0].announcements[0].id));
  assert.equal(s.articles.length, sideHustles.filter(p => p.tags.includes('AI')).length - 1);
  assert.ok(!JSON.stringify(s).includes('SECRET_'));
  assert.equal(s.platforms.find(p=>p.id===platforms[0].id)?.sourceStatus, 'error');
});
test('withdrawal hides body and affects revision; unknown kind and duplicate IDs block publication', () => {
  const event = build().events[0];
  const s = buildPublicSnapshot({platforms: publicPlatforms, articles: sideHustles, removed: [{type:'event',id:event.id,reason:'已撤回',withdrawnAt:metadata.generatedAt}]}, metadata);
  assert.ok(!s.events.find(e=>e.id===event.id));
  assert.ok(!JSON.stringify(s).includes(event.text));
  assert.notEqual(s.revision, build().revision);
  const platforms = structuredClone(publicPlatforms);
  platforms[0].announcements.push(platforms[0].announcements[0]);
  assert.throws(()=>buildPublicSnapshot({platforms,articles:sideHustles}, metadata), /Duplicate/);
  Object.assign(platforms[0].announcements[0], {kind:'unknown'});
  assert.throws(()=>buildPublicSnapshot({platforms,articles:sideHustles}, metadata), /Unknown/);
});
test('signal remains unconfirmed and editing the same source changes content revision', () => {
  const platforms = structuredClone(publicPlatforms);
  platforms[0].announcements[0].kind='signal';
  const s=buildPublicSnapshot({platforms,articles:sideHustles},metadata);
  assert.equal(s.events.find(e=>e.id===platforms[0].id+'-'+platforms[0].announcements[0].id)?.kindLabel,'待确认');
});
test('HTTP 200/304/HEAD use current revision and disable shared caching', async () => {
  const s=build();
  const response=snapshotResponse(new Request('https://test/api'),s);
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),s);
  assert.equal(response.headers.get('cache-control'),'no-cache, max-age=0, must-revalidate');
  assert.equal(response.headers.get('cdn-cache-control'),'no-store');
  for (const etag of ['"'+s.revision+'"','W/"'+s.revision+'"','"old", "'+s.revision+'"']) {
    const r=snapshotResponse(new Request('https://test/api',{headers:{'if-none-match':etag}}),s);
    assert.equal(r.status,304);assert.equal(await r.text(),'');
  }
  assert.equal(snapshotResponse(new Request('https://test/api',{headers:{'if-none-match':'"old"'}}),s).status,200);
  assert.equal(await snapshotResponse(new Request('https://test/api',{method:'HEAD'}),s).text(),'');
});
test('oversize content and insecure source links block publication instead of truncating', () => {
  const articles=structuredClone(sideHustles);
  articles.find(p=>p.tags.includes('AI'))!.url='http://test/';
  assert.throws(()=>buildPublicSnapshot({platforms:publicPlatforms,articles},metadata),/HTTPS/);
  articles.find(p=>p.tags.includes('AI'))!.url='https://test/';
  articles.find(p=>p.tags.includes('AI'))!.hook='x'.repeat(1024*1024);
  assert.throws(()=>buildPublicSnapshot({platforms:publicPlatforms,articles},metadata),/1 MB/);
});
