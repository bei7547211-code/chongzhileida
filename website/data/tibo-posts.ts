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
};

type TiboPostsFeed = {
  schemaVersion: number;
  updatedAt: string;
  sourceUrl: string;
  posts: TiboPost[];
};

const feed = postsJson as TiboPostsFeed;

export const tiboPostsUpdatedAt = feed.updatedAt;
export const tiboPostsSourceUrl = feed.sourceUrl;
export const tiboPosts = [...feed.posts].sort((a, b) =>
  b.publishedAt.localeCompare(a.publishedAt),
);
