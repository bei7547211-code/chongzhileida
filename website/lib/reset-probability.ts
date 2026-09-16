import type { ResetEvent } from '@/data/reset-history';
import type { TiboPost } from '@/data/tibo-posts';

const DAY_MS = 86_400_000;

function parseDay(date: string) {
  return Date.parse(`${date}T00:00:00.000Z`);
}

function shanghaiDay(value: string) {
  const date = new Date(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateResetProbability(
  events: ResetEvent[],
  posts: TiboPost[],
  asOf: string,
) {
  const dates = [...new Set(events.map((event) => event.date))]
    .filter((date) => Number.isFinite(parseDay(date)))
    .sort();

  const latestResetDate = dates.at(-1) ?? shanghaiDay(asOf);
  const elapsedDays = Math.max(
    0,
    Math.floor(
      (parseDay(shanghaiDay(asOf)) - parseDay(latestResetDate)) / DAY_MS,
    ),
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
  const probability = hasNewConfirmedPost
    ? 100
    : comparableGaps.length
      ? Math.min(
          85,
          Math.round((nextDayGaps.length / comparableGaps.length) * 100),
        )
      : 0;

  return {
    probability,
    elapsedDays,
    sampleSize: comparableGaps.length,
    latestResetDate,
    hasNewConfirmedPost,
    recentSignal:
      posts.find((post) => post.resetSignal !== 'none')?.resetSignal ?? 'none',
  };
}
