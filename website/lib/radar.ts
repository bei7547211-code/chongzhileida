export const radarStatuses = ['watching', 'confirmed', 'cooldown'] as const;

export type RadarStatus = (typeof radarStatuses)[number];

export type RadarReason = {
  label: string;
  detail: string;
  explanation: string;
  impact: number;
};

export type RadarInput = {
  status: string;
  score: number;
  updatedAt: string;
  summary: string;
  reasons: RadarReason[];
};

const statusCopy: Record<
  RadarStatus,
  { label: string; eyebrow: string; description: string }
> = {
  watching: {
    label: '观察中',
    eyebrow: 'WATCHING',
    description: '目前没有可信证据表明公共 Reset 已经发生。',
  },
  confirmed: {
    label: '已确认',
    eyebrow: 'CONFIRMED',
    description: '已经发现可信的公共 Reset 证据。',
  },
  cooldown: {
    label: '冷却期',
    eyebrow: 'COOLDOWN',
    description: '公共 Reset 刚刚发生，雷达进入冷却观察。',
  },
};

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function normalizeStatus(status: string): RadarStatus {
  return radarStatuses.includes(status as RadarStatus)
    ? (status as RadarStatus)
    : 'watching';
}

export function getSignalBand(score: number): 'low' | 'rising' | 'high' {
  const safeScore = clampScore(score);
  if (safeScore < 30) return 'low';
  if (safeScore < 70) return 'rising';
  return 'high';
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '更新时间未知';

  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function normalizeRadar(input: RadarInput) {
  const status = normalizeStatus(input.status);
  const score = clampScore(input.score);

  return {
    ...input,
    status,
    score,
    band: getSignalBand(score),
    statusCopy: statusCopy[status],
    updatedAtLabel: formatUpdatedAt(input.updatedAt),
    reasons: input.reasons.slice(0, 3),
  };
}
