import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampScore,
  getSignalBand,
  normalizeRadar,
  normalizeStatus,
} from './radar.ts';

test('分数被限制在 0 到 100 之间', () => {
  assert.equal(clampScore(-8), 0);
  assert.equal(clampScore(108), 100);
  assert.equal(clampScore(74.6), 75);
});

test('信号分段使用统一边界', () => {
  assert.equal(getSignalBand(29), 'low');
  assert.equal(getSignalBand(30), 'rising');
  assert.equal(getSignalBand(69), 'rising');
  assert.equal(getSignalBand(70), 'high');
});

test('未知状态安全回退到观察中', () => {
  assert.equal(normalizeStatus('unexpected'), 'watching');
});

test('页面模型只保留前三条原因并处理无效时间', () => {
  const radar = normalizeRadar({
    status: 'unexpected',
    score: 140,
    updatedAt: 'not-a-date',
    summary: '测试',
    reasons: [
      { label: '一', detail: 'A', explanation: 'AA', impact: 10 },
      { label: '二', detail: 'B', explanation: 'BB', impact: 10 },
      { label: '三', detail: 'C', explanation: 'CC', impact: 10 },
      { label: '四', detail: 'D', explanation: 'DD', impact: 10 },
    ],
  });

  assert.equal(radar.status, 'watching');
  assert.equal(radar.score, 100);
  assert.equal(radar.updatedAtLabel, '更新时间未知');
  assert.equal(radar.reasons.length, 3);
});
