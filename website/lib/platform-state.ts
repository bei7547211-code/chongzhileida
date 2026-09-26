export function nextScheduledCheck(checkedAt: string | null) {
  if (!checkedAt || !Number.isFinite(Date.parse(checkedAt))) return null;
  const checked = Date.parse(checkedAt);
  const local = new Date(checked + 8 * 3600000);
  const day =
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
    8 * 3600000;
  return (
    [11, 15, 21, 35]
      .map((hour) => day + hour * 3600000)
      .find((t) => t > checked) ?? null
  );
}
export function platformFreshness(checkedAt: string | null, now: number) {
  if (!checkedAt || !Number.isFinite(Date.parse(checkedAt))) return 'unknown';
  const next = nextScheduledCheck(checkedAt);
  return next !== null && now > next + 45 * 60000 ? 'stale' : 'fresh';
}
export function platformHeadline(kind: string | undefined) {
  return kind === 'banked'
    ? '重置次数已公布'
    : kind === 'full'
      ? '公开重置已确认'
      : kind === 'signal'
        ? '等待重置完成确认'
        : '尚无已核验重置';
}
