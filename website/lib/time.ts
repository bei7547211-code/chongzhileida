const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';

export function toShanghaiDateKey(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SHANGHAI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return year && month && day ? `${year}-${month}-${day}` : '';
}

export function shanghaiCalendarDayDistance(later: string, earlier: string) {
  const laterKey = toShanghaiDateKey(later);
  const earlierKey = toShanghaiDateKey(earlier);
  if (!laterKey || !earlierKey) return 0;

  return Math.max(
    0,
    Math.floor(
      (Date.parse(`${laterKey}T00:00:00.000Z`) -
        Date.parse(`${earlierKey}T00:00:00.000Z`)) /
        86_400_000,
    ),
  );
}
