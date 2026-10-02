import { PROVIDERS, type Provider, type ResetKind, type ResetRelaySnapshot } from '@aihot/contracts/reset-relay';
export { eventStatus } from '@aihot/contracts/reset-relay';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected object');
  return value as Record<string, unknown>;
}
function str(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 20000) throw new Error('Invalid text');
  return value.trim();
}
function date(value: unknown): string {
  const s = str(value);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(s) || !Number.isFinite(Date.parse(s))) throw new Error('Invalid timestamp');
  return new Date(s).toISOString();
}
function source(value: unknown, hosts: string[]): string {
  const url = new URL(str(value));
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !hosts.includes(url.hostname)) throw new Error('Invalid source URL');
  return url.href;
}
function list(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length > 10000) throw new Error('Invalid list');
  return value;
}
/** Allowlist projection only: an old-site export may contain fields that must never be public here. */
export function projectSnapshot(input: unknown): ResetRelaySnapshot {
  const s = record(input);
  if (s.schemaVersion !== 1 || s.complete !== true) throw new Error('Require complete schema v1 public export');
  const ids = new Set<string>();
  const events = list(s.events).map(value => {
    const e = record(value);
    const id = str(e.id);
    if (ids.has(id)) throw new Error('Duplicate event');
    ids.add(id);
    if (!PROVIDERS.includes(e.provider as Provider)) throw new Error('Unknown provider');
    if (!['signal', 'banked', 'full'].includes(String(e.kind))) throw new Error('Unknown event kind');
    return { id, provider: e.provider as Provider, kind: e.kind as ResetKind, title: str(e.title), summary: str(e.summary), text: str(e.text), scope: str(e.scope), publishedAt: date(e.publishedAt), verifiedAt: date(e.verifiedAt), sourceUrl: source(e.sourceUrl, ['x.com', 'twitter.com']) };
  }).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const articleIds = new Set<string>();
  const articles = list(s.articles).map(value => {
    const a = record(value);
    const id = str(a.id);
    if (articleIds.has(id)) throw new Error('Duplicate article');
    articleIds.add(id);
    return { id, slug: str(a.slug), title: str(a.title), summary: str(a.summary), author: str(a.author), category: str(a.category), publishedAt: date(a.publishedAt), sourceUrl: source(a.sourceUrl, ['scys.com', 'www.scys.com']), questions: list(a.questions).map(str), sourceNote: str(a.sourceNote) };
  });
  return { mode: 'snapshot', generatedAt: date(s.generatedAt), events, articles };
}
