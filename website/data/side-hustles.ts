import feedJson from './side-hustles.json';

export type SideHustle = {
  topic_id: string;
  slug: string;
  title: string;
  author: string;
  avatar: string;
  published_at: string;
  fetched_at: string;
  url: string;
  stats: {
    likes: number;
    favorites: number;
    comments: number;
    reads: number;
  };
  word_count: number;
  tags: string[];
  cover: string;
  hook_stats: Array<{ num: string; label: string }>;
  hook: string;
  problems: string[];
  quotes: string[];
};

const feed = feedJson as { updated_at: string; posts: SideHustle[] };

export const sideHustles = feed.posts;
export const sideHustlesUpdatedAt = feed.updated_at;

export function getSideHustle(slug: string) {
  return sideHustles.find((post) => post.slug === slug);
}
