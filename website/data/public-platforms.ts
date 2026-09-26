import extra from './provider-feeds.json';
import evidenceJson from './provider-evidence.json';
import { matchedEvidence } from '../lib/evidence';
import { announcements } from './reset-history';
import { tiboPostsVerifiedAt, tiboPosts } from './tibo-posts';

export type PlatformId = 'codex' | 'claude' | 'grok';
export type PublicAnnouncement = {
  id: string;
  title: string;
  text: string;
  publishedAt: string;
  verifiedAt: string;
  kind: 'full' | 'banked' | 'signal';
  url: string;
  scope: string;
  screenshot?: string;
  screenshotNote?: string;
};
export type PublicPlatform = {
  id: PlatformId;
  name: string;
  person: string;
  portrait: string;
  officialUrl: string;
  checkedAt: string | null;
  error: string | null;
  coverage: string;
  announcements: PublicAnnouncement[];
  posts: { id: string; text: string; publishedAt: string; url: string }[];
};
export const publicPlatforms: PublicPlatform[] = [
  {
    id: 'codex',
    name: 'Codex',
    person: 'Tibo',
    portrait: '/images/platform-cards/codex-engraving-v2.jpg',
    officialUrl: 'https://x.com/thsottiaux',
    checkedAt: tiboPostsVerifiedAt,
    error: null,
    coverage: '已核验公告与近期公开动态；不代表个人账户余额',
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      text: a.original,
      publishedAt: a.publishedAt,
      verifiedAt: tiboPostsVerifiedAt,
      kind: a.kind,
      url: a.xUrl,
      scope: a.scope || '适用范围以原帖和个人账户为准',
      screenshot: a.screenshotUrl,
    })),
    posts: tiboPosts.map((p) => ({
      id: p.id,
      text: p.summary,
      publishedAt: p.publishedAt,
      url: p.url,
    })),
  },
  ...(['claude', 'grok'] as const).map((id) => ({
    id,
    name: id === 'claude' ? 'Claude' : 'Grok',
    person: id === 'claude' ? 'Dario Amodei' : 'Elon Musk',
    portrait: `/images/platform-cards/${id}-engraving-v2.jpg`,
    officialUrl:
      id === 'claude' ? 'https://x.com/claudeai' : 'https://x.com/grok',
    ...extra[id],
    coverage: '近期官方时间线＋核验原帖；不代表全部历史',
    announcements: extra[id].announcements.map((a) => {
      return { ...a, ...matchedEvidence(a, evidenceJson) };
    }) as PublicAnnouncement[],
  })),
];
