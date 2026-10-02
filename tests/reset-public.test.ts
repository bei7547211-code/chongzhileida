import './setup.ts';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { publicSnapshot, publishPublicSnapshot } from '../packages/backend/src/publication/reset-public.ts';
import { buildApp } from '../apps/api/src/app.ts';
import { closeDb, sql } from '@aihot/backend/db';
const event = { id: 'codex-mvp', provider: 'codex', title: 'Test signal', summary: 'Await confirmation', text: 'Public evidence', scope: 'Unknown', kind: 'signal',
  publishedAt: '2026-09-28T01:00:00Z', verifiedAt: '2026-09-28T02:00:00Z', sourceUrl: 'https://x.com/test/status/1', revision: 0, revisedAt: null };
const fixture = () => ({ schemaVersion: 1, complete: true, generatedAt: '2026-09-28T02:00:00Z',
  counts: { platforms: 3, events: 1, articles: 0 }, events: [event], articles: [], removed: [],
  idAliases: { old: event.id }, platforms: ['codex', 'claude', 'grok'].map(id => ({
    id, name: id, company: id, checkedAt: null, lastAttemptAt: null, sourceStatus: 'stale', error: null,
    latestEventId: id === 'codex' ? event.id : null, eventCount: id === 'codex' ? 1 : 0 })) });
test('public projection is deterministic, preserves evidence time, and excludes private fields', () => {
  const raw = fixture();
  const one = publicSnapshot({ ...raw, apiKey: 'PRIVATE', events: [{ ...event, token: 'PRIVATE' }] });
  assert.equal(one.revision, publicSnapshot(raw).revision);
  assert.equal(JSON.stringify(one).includes('PRIVATE'), false);
  assert.equal(one.events[0].kind, 'signal');
  assert.equal(one.platforms[0].checkedAt, null);
  assert.notEqual(one.revision, publicSnapshot({ ...raw, events: [{ ...event, title: 'Correction' }] }).revision);
});
test('reject incomplete, dangling, duplicate or contradictory publication before writing', () => {
  const raw = fixture();
  for (const change of [
    { complete: false }, { counts: { platforms: 3, events: 2, articles: 0 } },
    { platforms: [raw.platforms[0], raw.platforms[0], raw.platforms[2]] },
    { idAliases: { missing: 'absent' } }, { events: [{ ...event, revisedAt: 'bad' }] },
    { removed: [{ type: 'event', id: event.id, reason: 'withdrawn', withdrawnAt: event.publishedAt }] },
  ]) assert.throws(() => publicSnapshot({ ...raw, ...change }));
});
const app = await buildApp();
after(async () => { await app.close(); await sql`DELETE FROM reset_relay_snapshot WHERE id = 1`; await closeDb(); });
test('publish once: web and mini agree, conditional requests work, corrections and removals propagate', async () => {
  const raw = fixture();
  const published = await publishPublicSnapshot(raw);
  const mini = await app.inject('/api/public/v1/snapshot');
  assert.equal(mini.statusCode, 200);
  assert.equal(mini.json().revision, published.revision);
  const site = (await app.inject('/api/site/reset-relay')).json();
  assert.equal(site.events[0].id, mini.json().events[0].id);
  assert.equal(site.events[0].title, mini.json().events[0].title);
  const etag = mini.headers.etag!;
  assert.equal((await app.inject({ url: '/api/public/v1/snapshot', headers: { 'if-none-match': 'W/' + etag } })).statusCode, 304);
  await assert.rejects(() => publishPublicSnapshot({ ...raw, complete: false }));
  assert.equal((await app.inject('/api/public/v1/snapshot')).headers.etag, etag);
  await publishPublicSnapshot({ ...raw, events: [], counts: { ...raw.counts, events: 0 },
    platforms: raw.platforms.map(p => ({ ...p, eventCount: 0, latestEventId: null })),
    removed: [{ type: 'event', id: event.id, reason: 'withdrawn', withdrawnAt: event.publishedAt }] });
  const changed = await app.inject({ url: '/api/public/v1/snapshot', headers: { 'if-none-match': etag } });
  assert.equal(changed.statusCode, 200);
  assert.equal(changed.json().events.length, 0);
  assert.equal((await app.inject('/api/site/reset-relay')).json().events.length, 0);
  assert.equal((await app.inject({ method: 'POST', url: '/api/public/v1/snapshot', payload: raw })).statusCode, 405);
});
