import test from 'node:test';
import assert from 'node:assert/strict';
import { platformFreshness, platformHeadline } from './platform-state.ts';
void test('Successful collection freshness is separate from announcement age', () => {
  const now = Date.parse('2026-09-24T12:00:00Z');
  assert.equal(platformFreshness('2026-09-24T10:00:00Z', now), 'fresh');
  assert.equal(platformFreshness('2026-09-23T10:00:00Z', now), 'stale');
  assert.equal(platformFreshness(null, now), 'unknown');
  assert.equal(platformFreshness('invalid', now), 'unknown');
});
void test('Banked reset does not claim account balance restored', () => {
  assert.equal(platformHeadline('banked'), '重置次数已公布');
});
void test('A signal never claims reset completion', () => {
  assert.equal(platformHeadline('signal'), '等待重置完成确认');
});
