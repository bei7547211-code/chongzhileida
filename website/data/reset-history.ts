export type ResetKind = 'full' | 'banked' | 'signal';

export type ResetEvent = {
  date: string;
  kind: ResetKind;
};

export type ResetAnnouncement = ResetEvent & {
  id: string;
  relative: string;
  time: string;
  emoji: string;
  title: string;
  original: string;
  summary: string;
  xUrl: string;
};

export const tibo = {
  name: 'Thibault “Tibo” Sottiaux',
  handle: '@thsottiaux',
  role: 'OpenAI Codex 负责人',
  profileUrl: 'https://x.com/thsottiaux',
  avatarUrl: 'https://codex-resets.com/thsottiaux-avatar.jpg',
};

export const resetStats = {
  total: 53,
  averageDays: 6.9,
  longestDays: 67.7,
  windowWeeks: 26,
  updatedAt: '2026-09-12T08:09:00.000Z',
};

export const resetEvents: ResetEvent[] = [
  { date: '2026-09-12', kind: 'full' },
  { date: '2026-09-08', kind: 'full' },
  { date: '2026-09-05', kind: 'banked' },
  { date: '2026-09-03', kind: 'banked' },
  { date: '2026-08-31', kind: 'full' },
  { date: '2026-08-29', kind: 'full' },
  { date: '2026-08-27', kind: 'full' },
  { date: '2026-08-25', kind: 'signal' },
  { date: '2026-08-24', kind: 'full' },
  { date: '2026-08-21', kind: 'banked' },
  { date: '2026-08-13', kind: 'full' },
  { date: '2026-08-11', kind: 'full' },
  { date: '2026-08-08', kind: 'full' },
  { date: '2026-08-01', kind: 'full' },
  { date: '2026-07-29', kind: 'full' },
  { date: '2026-07-28', kind: 'full' },
  { date: '2026-07-25', kind: 'full' },
  { date: '2026-07-21', kind: 'full' },
  { date: '2026-07-18', kind: 'full' },
  { date: '2026-07-16', kind: 'full' },
  { date: '2026-07-14', kind: 'full' },
  { date: '2026-07-13', kind: 'banked' },
  { date: '2026-07-12', kind: 'banked' },
  { date: '2026-07-11', kind: 'full' },
  { date: '2026-07-10', kind: 'full' },
  { date: '2026-07-09', kind: 'full' },
  { date: '2026-06-29', kind: 'full' },
  { date: '2026-06-28', kind: 'full' },
  { date: '2026-06-26', kind: 'full' },
  { date: '2026-06-18', kind: 'banked' },
  { date: '2026-06-04', kind: 'full' },
  { date: '2026-05-31', kind: 'full' },
  { date: '2026-05-23', kind: 'full' },
  { date: '2026-05-16', kind: 'full' },
  { date: '2026-04-28', kind: 'full' },
  { date: '2026-04-20', kind: 'signal' },
  { date: '2026-04-17', kind: 'full' },
  { date: '2026-04-09', kind: 'full' },
  { date: '2026-04-07', kind: 'full' },
  { date: '2026-04-01', kind: 'full' },
  { date: '2026-03-27', kind: 'full' },
];

export const announcements: ResetAnnouncement[] = [
  {
    id: '2098685367058612394',
    date: '2026-09-12',
    time: '16:09 GMT+8',
    relative: '3 天前',
    kind: 'full',
    emoji: '🌐',
    title: '全量重置已完成',
    original: 'Reset all propagated. Sweet dreams.',
    summary: '重置信号已经传播完成，所有用户可检查自己的额度状态。',
    xUrl: 'https://x.com/thsottiaux/status/2098685367058612394',
  },
  {
    id: '2097174560412246215',
    date: '2026-09-08',
    time: '09:56 GMT+8',
    relative: '7 天前',
    kind: 'full',
    emoji: '⚡️',
    title: '所有用户额度重置',
    original: 'All reset for everyone. Enjoy the week with Astra.',
    summary: 'Tibo 宣布所有用户完成重置，并邀请大家使用 Astra。',
    xUrl: 'https://x.com/thsottiaux/status/2097174560412246215',
  },
  {
    id: '2096035437299237298',
    date: '2026-09-05',
    time: '08:39 GMT+8',
    relative: '10 天前',
    kind: 'banked',
    emoji: '🎫',
    title: 'Plus / Pro / Business 获得重置卡',
    original:
      'We will do the full banked reset today too for all Plus, Pro and Business users. Lands end of day.',
    summary: 'Astra 提前上线，符合条件的付费用户可获得一张可自行使用的重置卡。',
    xUrl: 'https://x.com/thsottiaux/status/2096035437299237298',
  },
  {
    id: '2095651088502591861',
    date: '2026-09-03',
    time: '07:12 GMT+8',
    relative: '12 天前',
    kind: 'banked',
    emoji: '🎟️',
    title: 'Astra 等待用户每日补发一张卡',
    original:
      "We will give one banked reset for every day you don't have access to Astra on your paid ChatGPT plan, starting today.",
    summary: '付费用户在尚未获得 Astra 期间，每等待一天可得到一张重置卡。',
    xUrl: 'https://x.com/thsottiaux/status/2095651088502591861',
  },
  {
    id: '2094251180121854309',
    date: '2026-08-31',
    time: '10:29 GMT+8',
    relative: '15 天前',
    kind: 'full',
    emoji: '🎉',
    title: '庆祝 2500 万活跃用户',
    original:
      'We hit 25M active users and to celebrate we have now reset usage for all paid subscriptions for ChatGPT Work and Codex.',
    summary:
      'Codex 与 ChatGPT Work 达到 2500 万活跃用户，所有付费订阅获得额度重置。',
    xUrl: 'https://x.com/thsottiaux/status/2094251180121854309',
  },
];

export const kindMeta: Record<
  ResetKind,
  { label: string; shortLabel: string; emoji: string }
> = {
  full: { label: '额度重置', shortLabel: '重置', emoji: '🌐' },
  banked: { label: '重置卡', shortLabel: '卡', emoji: '🎫' },
  signal: { label: '重置信号', shortLabel: '信号', emoji: '📡' },
};
