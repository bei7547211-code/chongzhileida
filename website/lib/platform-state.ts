export function platformFreshness(checkedAt: string | null, now: number) {
  if (!checkedAt || !Number.isFinite(Date.parse(checkedAt))) return 'unknown';
  return now - Date.parse(checkedAt) > 16 * 3600000 ? 'stale' : 'fresh';
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
