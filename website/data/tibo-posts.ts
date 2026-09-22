import postsJson from './tibo-posts.json';

export type TiboResetSignal = 'confirmed' | 'related' | 'none';

export type TiboPost = {
  id: string;
  publishedAt: string;
  title: string;
  summary: string;
  category: string;
  resetSignal: TiboResetSignal;
  url: string;
  preview?: {
    headline: string;
    dateLabel: string;
    dayLabel: string;
    timingLabel: string;
    translation: string;
    originalExcerpt: string;
  };
};

type TiboPostsFeed = {
  schemaVersion: number;
  updatedAt: string;
  verifiedAt: string;
  sourceUrl: string;
  posts: TiboPost[];
};

const feed = postsJson as TiboPostsFeed;

export const tiboPostsUpdatedAt = feed.updatedAt;
export const tiboPostsVerifiedAt = feed.verifiedAt;
export const tiboPostsSourceUrl = feed.sourceUrl;
export const tiboPosts = [...feed.posts].sort((a, b) =>
  b.publishedAt.localeCompare(a.publishedAt),
);
