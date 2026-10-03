import { createHash } from 'node:crypto';
import type { PublicPlatform } from '../data/public-platforms.ts';
import type { SideHustle } from '../data/side-hustles.ts';

export type Removal = { type: 'event' | 'article'; id: string; reason: string; withdrawnAt: string };
const labels: Record<string, string> = { full: '额度重置', banked: '重置卡', signal: '待确认', announcement: '公开公告', correction: '更正' };
const companies: Record<string, string> = { codex: 'OpenAI', claude: 'Anthropic', grok: 'xAI' };
const iso = (value: string) => {
  if (!value || !Number.isFinite(Date.parse(value))) throw new Error('Invalid public date');
  return new Date(value).toISOString();
};
const https = (value: string) => {
  if (new URL(value).protocol !== 'https:') throw new Error('Public source must use HTTPS');
  return value;
};
const byDate = (a: { publishedAt: string; id: string }, b: { publishedAt: string; id: string }) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id);
const dateLabel = (value: string) => new Date(Date.parse(value) + 8 * 3600000).toISOString().slice(0, 16).replace('T', ' ');

export function publicAiCategory(tags: string[]) {
  if (tags.some(t => ['视频带货', 'YouTube', '虚拟IP', 'AI视频'].includes(t))) return '视频制作';
  if (tags.some(t => ['Google SEO', '编程', '编程开发'].includes(t))) return '编程开发';
  if (tags.some(t => ['电商', '跨境电商'].includes(t))) return '电商运营';
  if (tags.some(t => ['图文', '写作'].includes(t))) return '图文创作';
  if (tags.includes('工作提效')) return '工作提效';
  return '其他';
}
export function buildPublicSnapshot(input: { platforms: PublicPlatform[]; articles: SideHustle[]; removed?: Removal[] }, metadata: { generatedAt: string; releaseId?: string }) {
  const removed = (input.removed || []).map(r => ({ type: r.type, id: r.id, reason: r.reason, withdrawnAt: iso(r.withdrawnAt) })).sort((a,b) => a.type.localeCompare(b.type) || a.id.localeCompare(b.id));
  if (removed.some(r => !['event','article'].includes(r.type) || !r.id || !r.reason)) throw new Error('Invalid removal');
  const gone = (type: string, id: string) => removed.some(r => r.type === type && r.id === id);
  const idAliases: Record<string, string> = {};
  const events = input.platforms.flatMap(p => p.announcements.filter(a => !a.reviewPending && !gone('event', p.id + '-' + a.id)).map(a => {
    if (!labels[a.kind]) throw new Error('Unknown announcement kind');
    const id = p.id + '-' + a.id;
    const url = https(a.url);
    idAliases[p.id + '-rss-' + encodeURIComponent(url)] = id;
    idAliases[url] = id;
    if (a.revision) idAliases[p.id + '-rss-' + encodeURIComponent(url + '#correction-' + a.revision)] = id;
    const followUps = (a.followUps || []).map(followUp => ({ id: followUp.id, title: followUp.title, summary: followUp.summary, text: followUp.text, publishedAt: iso(followUp.publishedAt), sourceUrl: https(followUp.url), url: https(followUp.url), dateLabel: dateLabel(followUp.publishedAt) }));
    return { id, provider: p.id, providerName: p.name, title: a.title, summary: a.summary || a.scope, text: a.text, scope: a.scope, kind: a.kind, kindLabel: labels[a.kind], publishedAt: iso(a.publishedAt), verifiedAt: a.verifiedAt ? iso(a.verifiedAt) : null, sourceUrl: url, url, revision: a.revision || 0, revisedAt: a.revisedAt ? iso(a.revisedAt) : null, followUps, dateLabel: dateLabel(a.publishedAt) };
  })).sort(byDate);
  const platforms = input.platforms.map(p => {
    const own = events.filter(e => e.provider === p.id);
    return { id: p.id, name: p.name, company: companies[p.id], checkedAt: p.checkedAt ? iso(p.checkedAt) : null, lastAttemptAt: (p.attemptedAt || p.lastAttemptAt) ? iso((p.attemptedAt || p.lastAttemptAt)!) : null, sourceStatus: p.error ? 'error' : p.checkedAt ? 'ok' : 'stale', error: p.error ? '来源核验暂时失败，显示上次公开记录' : null, latestEventId: own[0]?.id || null, latest: own[0] || null, eventCount: own.length };
  }).sort((a,b) => ['codex', 'claude', 'grok'].indexOf(a.id) - ['codex', 'claude', 'grok'].indexOf(b.id));
  const articles = input.articles.filter(p => p.tags.includes('AI') && !(p as SideHustle & { reviewPending?: boolean }).reviewPending && !gone('article', p.topic_id)).map(p => ({ id: p.topic_id, slug: p.slug, title: p.title, category: publicAiCategory(p.tags), summary: '作者自述：' + p.hook, author: p.author, publishedAt: iso(p.published_at), date: p.published_at.slice(0,10), sourceUrl: https(p.url), url: p.url, questions: [...p.problems], quotes: p.quotes.slice(0,1), sourceNote: '来源：生财有术公开案例摘要。成绩为作者自述，不代表普遍结果；原文可能需要登录或会员。' })).sort(byDate);
  for (const list of [platforms, events, articles, removed.map(r => ({id: r.type + ':' + r.id}))]) {
    if (new Set(list.map(p => p.id)).size !== list.length || list.some(p => !p.id)) throw new Error('Duplicate or missing public ID');
  }
  const payload = { schemaVersion: 1, complete: true, counts: { platforms: platforms.length, events: events.length, articles: articles.length }, platforms, events, articles, removed, idAliases: Object.fromEntries(Object.entries(idAliases).sort(([a],[b]) => a.localeCompare(b))) };
  const revision = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const result = { ...payload, revision, generatedAt: iso(metadata.generatedAt), releaseId: metadata.releaseId || revision };
  if (Buffer.byteLength(JSON.stringify(result)) > 1000000) throw new Error('Public snapshot exceeds 1 MB; refusing truncation');
  return result;
}

export function snapshotResponse(request: Request, snapshot: { revision: string }) {
  const etag = '"' + snapshot.revision + '"';
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache, max-age=0, must-revalidate', 'CDN-Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store', ETag: etag };
  const matches = request.headers.get('if-none-match')?.split(',').some(v => v.trim() === '*' || v.trim().replace(/^W\//, '') === etag);
  return new Response(matches || request.method === 'HEAD' ? null : JSON.stringify(snapshot), { status: matches ? 304 : 200, headers });
}
