import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateResetProbability } from './reset-probability.ts';

const events = [
  { date: '2026-09-01', kind: 'full' as const },
  { date: '2026-09-05', kind: 'full' as const },
  { date: '2026-09-10', kind: 'full' as const },
];

void test('用已走过当前天数的历史间隔估计未来 24 小时概率', () => {
  const result = calculateResetProbability(
    events,
    [],
    '2026-09-14T05:00:00.000Z',
  );

  assert.equal(result.elapsedDays, 4);
  assert.equal(result.sampleSize, 2);
  assert.equal(result.probability, 85);
});

void test('最新确认重置帖子优先于历史预测', () => {
  const result = calculateResetProbability(
    events,
    [
      {
        id: '1',
        publishedAt: '2026-09-12T08:00:00.000Z',
        title: '已重置',
        summary: '已重置',
        category: '重置',
        resetSignal: 'confirmed',
        url: 'https://x.com/thsottiaux/status/1',
      },
    ],
    '2026-09-14T05:00:00.000Z',
  );

  assert.equal(result.hasNewConfirmedPost, true);
  assert.equal(result.probability, 100);
});
