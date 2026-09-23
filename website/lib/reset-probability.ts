import type { ResetEvent } from '@/data/reset-history';
import type { TiboPost } from '@/data/tibo-posts';
import { toShanghaiDateKey } from './time.ts';

const DAY_MS = 86_400_000;

function parseDay(date: string) {
  return Date.parse(`${date}T00:00:00.000Z`);
}

export function calculateResetProbability(
  events: ResetEvent[],
  posts: TiboPost[],
  asOf: string,
) {
  const dates = [...new Set(events.map((event) => event.date))]
    .filter((date) => Number.isFinite(parseDay(date)))
    .sort();

  const asOfDate = toShanghaiDateKey(asOf);
  const latestResetDate = dates.at(-1) ?? asOfDate;
  const elapsedDays = Math.max(
    0,
    Math.floor((parseDay(asOfDate) - parseDay(latestResetDate)) / DAY_MS),
  );
  const gaps = dates
    .slice(1)
    .map((date, index) =>
      Math.round((parseDay(date) - parseDay(dates[index])) / DAY_MS),
    )
    .filter((gap) => gap > 0);
  const comparableGaps = gaps.filter((gap) => gap >= elapsedDays);
  const nextDayGaps = comparableGaps.filter((gap) => gap <= elapsedDays + 1);
  const latestResetAt = parseDay(latestResetDate);
  const hasNewConfirmedPost = posts.some(
    (post) =>
      post.resetSignal === 'confirmed' &&
      Date.parse(post.publishedAt) > latestResetAt + DAY_MS,
  );
  const isCooldown = elapsedDays === 0;
  const probability = isCooldown
    ? 0
    : hasNewConfirmedPost
      ? 100
      : comparableGaps.length
        ? Math.min(
            85,
            Math.round((nextDayGaps.length / comparableGaps.length) * 100),
          )
        : 0;

  return {
    probability,
    isCooldown,
    elapsedDays,
    sampleSize: comparableGaps.length,
    latestResetDate,
    hasNewConfirmedPost,
    recentSignal:
      posts.find((post) => post.resetSignal !== 'none')?.resetSignal ?? 'none',
  };
}
