import { createHash } from 'node:crypto';
import { projectSnapshot } from './reset-relay-model.ts';
import { sql } from '../db.ts';

const fail = (): never => { throw new Error('Invalid complete public snapshot'); };
const object = (x: unknown): Record<string, unknown> => x && typeof x === 'object' && !Array.isArray(x) ? x as Record<string, unknown> : fail();
const text = (x: unknown): string => typeof x === 'string' && x.length < 20000 ? x : fail();
const identifier = (x: unknown): string => {
  const s = text(x);
  return s.length > 0 && s.length < 2048 && !['__proto__', 'constructor', 'prototype'].includes(s) ? s : fail();
};
const timestamp = (x: unknown): string | null => x === null ? null : typeof x === 'string' && /^\d{4}-\d\d-\d\dT/.test(x) && Number.isFinite(Date.parse(x)) ? new Date(x).toISOString() : fail();
const list = (x: unknown): unknown[] => Array.isArray(x) ? x : fail();

/** Only explicitly public fields survive; source check times are never replaced by import time. */
export function publicSnapshot(input: unknown) {
  if (Buffer.byteLength(JSON.stringify(input) ?? '') > 1000000) fail();
  const raw = object(input);
  const site = projectSnapshot(raw);
  const counts = object(raw.counts);
  for (const key of ['platforms', 'events', 'articles']) if (counts[key] !== list(raw[key]).length) fail();
  const events = site.events.map(e => {
    identifier(e.id);
    const original = list(raw.events).map(object).find(x => x.id === e.id)!;
    const revision = original.revision;
    if (!(typeof revision === 'number' && Number.isSafeInteger(revision) && revision >= 0)) identifier(revision);
    return { ...e, revision: revision as string | number, revisedAt: timestamp(original.revisedAt) };
  });
  const articles = site.articles.map(a => {
    identifier(a.id);
    // Public summaries only. Do not republish membership text or imported quote bodies.
    return { ...a, quotes: [] as string[] };
  });
  const platforms = list(raw.platforms).map(value => {
    const p = object(value), id = identifier(p.id);
    if (!['codex', 'claude', 'grok'].includes(id)) fail();
    const own = events.filter(e => e.provider === id);
    if (p.eventCount !== own.length || (p.latestEventId !== null && !own.some(e => e.id === p.latestEventId))) fail();
    if (!['ok', 'stale', 'error'].includes(String(p.sourceStatus))) fail();
    return { id, name: text(p.name), company: text(p.company), checkedAt: timestamp(p.checkedAt),
      lastAttemptAt: timestamp(p.lastAttemptAt), sourceStatus: p.sourceStatus as string,
      error: p.error === null ? null : '来源核验暂时失败，显示上次公开记录',
      latestEventId: p.latestEventId as string | null, eventCount: own.length };
  });
  if (platforms.length !== 3 || new Set(platforms.map(p => p.id)).size !== 3) fail();
  const removed = list(raw.removed).map(value => {
    const r = object(value), id = identifier(r.id);
    if (!['event', 'article'].includes(String(r.type))) fail();
    if ((r.type === 'event' ? events : articles).some(x => x.id === id)) fail();
    const withdrawnAt = timestamp(r.withdrawnAt);
    if (!withdrawnAt) fail();
    return { type: r.type as string, id, reason: text(r.reason), withdrawnAt };
  });
  if (new Set(removed.map(r => r.type + ':' + r.id)).size !== removed.length) fail();
  const idAliases = Object.fromEntries(Object.entries(object(raw.idAliases)).map(([key, value]) => {
    identifier(key); const id = identifier(value);
    if (![...events, ...articles, ...removed].some(x => x.id === id)) fail();
    return [key, id];
  }));
  const body = { schemaVersion: 1, complete: true, generatedAt: site.generatedAt,
    counts: { platforms: platforms.length, events: events.length, articles: articles.length },
    platforms, events, articles, removed, idAliases };
  const revision = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  return { ...body, revision, releaseId: revision };
}
export async function publishPublicSnapshot(input: unknown) {
  const payload = publicSnapshot(input);
  const site = projectSnapshot(payload);
  await sql`INSERT INTO reset_relay_snapshot (id, payload, public_payload)
    VALUES (1, ${JSON.stringify(site)}::jsonb, ${sql.json(payload)})
    ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload,
      public_payload = EXCLUDED.public_payload, imported_at = now()`;
  return payload;
}
export async function readPublicSnapshot() {
  const rows = await sql<{ public_payload: ReturnType<typeof publicSnapshot> | null }[]>`SELECT public_payload FROM reset_relay_snapshot WHERE id = 1`;
  return rows[0]?.public_payload ?? null;
}
