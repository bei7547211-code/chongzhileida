export const PROVIDERS = ['codex', 'claude', 'grok'] as const;
export type Provider = typeof PROVIDERS[number];
export type ResetKind = 'signal' | 'banked' | 'full';
export interface ResetEvent {
  id: string; provider: Provider; title: string; summary: string; text: string;
  scope: string; kind: ResetKind; publishedAt: string; verifiedAt: string; sourceUrl: string;
}
export interface RelayArticle {
  id: string; slug: string; title: string; summary: string; category: string;
  author: string; publishedAt: string; sourceUrl: string; questions: string[]; sourceNote: string;
}
export interface ResetRelaySnapshot {
  mode: 'snapshot'; generatedAt: string; events: ResetEvent[]; articles: RelayArticle[];
}
export function eventStatus(kind: ResetKind): string {
  return { signal: '等待完成确认', banked: '曾发放重置卡', full: '曾确认额度重置' }[kind];
}
