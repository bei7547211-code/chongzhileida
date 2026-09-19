import feedJson from './reset-feed.json';

export type ResetKind = 'full' | 'banked' | 'signal';

export type ResetEvent = {
  date: string;
  kind: ResetKind;
};

export type ResetAnnouncement = ResetEvent & {
  id: string;
  publishedAt: string;
  emoji: string;
  title: string;
  original: string;
  summary: string;
  xUrl: string;
};

type ResetFeed = {
  schemaVersion: number;
  updatedAt: string;
  source: {
    name: string;
    handle: string;
    role: string;
    profileUrl: string;
    avatarUrl: string;
  };
  monitor: {
    provider: 'mac-fxtwitter';
    enabled: boolean;
    scheduleLabel: string;
    reviewRequired: boolean;
    lastIngestedPostId: string | null;
  };
  events: ResetEvent[];
  announcements: Array<{
    id: string;
    publishedAt: string;
    kind: ResetKind;
    title: string;
    text: string;
    summary: string;
    url: string;
  }>;
};

const feed = feedJson as ResetFeed;

export const kindMeta: Record<
  ResetKind,
  { label: string; shortLabel: string; emoji: string }
> = {
  full: { label: '额度重置', shortLabel: '重置', emoji: '🌐' },
  banked: { label: '重置卡', shortLabel: '卡', emoji: '🎫' },
  signal: { label: '重置信号', shortLabel: '信号', emoji: '📡' },
};

export const tibo = feed.source;
export const monitor = feed.monitor;

export const resetEvents = [...feed.events].sort((a, b) =>
  b.date.localeCompare(a.date),
);

function calculateIntervals(events: ResetEvent[]) {
  const dates = [...new Set(events.map((event) => event.date))]
    .map((date) => Date.parse(`${date}T00:00:00.000Z`))
    .filter(Number.isFinite)
    .sort((a, b) => b - a);

  return dates
    .slice(1)
    .map(
      (date, index) =>
        Math.round(((dates[index] - date) / 86_400_000) * 10) / 10,
    );
}

const intervals = calculateIntervals(resetEvents);

export const resetStats = {
  total: resetEvents.length,
  averageDays: intervals.length
    ? Math.round(
        (intervals.reduce((sum, interval) => sum + interval, 0) /
          intervals.length) *
          10,
      ) / 10
    : 0,
  longestDays: intervals.length ? Math.max(...intervals) : 0,
  windowWeeks: 26,
  updatedAt: feed.updatedAt,
};

export const announcements: ResetAnnouncement[] = feed.announcements
  .map((announcement) => ({
    id: announcement.id,
    publishedAt: announcement.publishedAt,
    date: announcement.publishedAt.slice(0, 10),
    kind: announcement.kind,
    emoji: kindMeta[announcement.kind].emoji,
    title: announcement.title,
    original: announcement.text,
    summary: announcement.summary,
    xUrl: announcement.url,
  }))
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
