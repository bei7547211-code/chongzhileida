import assert from 'node:assert/strict';
import test from 'node:test';
import { shanghaiCalendarDayDistance, toShanghaiDateKey } from './time.ts';

void test('北京时间跨过午夜后写入新的一天', () => {
  assert.equal(toShanghaiDateKey('2026-09-22T18:23:37.000Z'), '2026-09-23');
});

void test('按北京时间计算自然日间隔', () => {
  assert.equal(
    shanghaiCalendarDayDistance(
      '2026-09-23T03:00:00.000Z',
      '2026-09-22T18:23:37.000Z',
    ),
    0,
  );
});
