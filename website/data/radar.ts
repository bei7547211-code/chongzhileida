import type { RadarInput } from '@/lib/radar';

// 最小版本的唯一数据源。现在是演示数据，后续再替换为自动采集结果。
export const radarInput: RadarInput = {
  status: 'watching',
  score: 75,
  updatedAt: '2026-09-15T05:20:00.000Z',
  summary: '还没重置，但信号正在升温。',
  reasons: [
    {
      label: '团队成员出现明确信号',
      detail: 'STAFF SIGNAL · SOURCE VERIFIED',
      explanation: '人员信号是最强的人工因素；正式版只有在原始来源可核验时才会加分。',
      impact: 40,
    },
    {
      label: '接近近期重置周期',
      detail: 'CADENCE · 约 20–28 天',
      explanation: '历史节奏只表示进入值得观察的时间窗口，不代表今天一定发生 Reset。',
      impact: 20,
    },
    {
      label: '模型发布活动增加',
      detail: 'LAUNCH NOISE · 弱相关',
      explanation: '发布活动可能伴随额度策略变化，但相关性较弱，因此只提供有限加分。',
      impact: 15,
    },
  ],
};
