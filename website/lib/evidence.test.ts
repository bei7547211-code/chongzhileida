import test from 'node:test';
import assert from 'node:assert/strict';
import { matchedEvidence } from './evidence.ts';
const post = {
  id: '1',
  contentHash: 'same',
  url: 'https://x.com/bot/status/1',
};
const registry = {
  '1': { ...post, screenshot: '/share/exact.png', screenshotNote: '真实截图' },
};
void test('Only exact source and content match can attach an evidence screenshot', () => {
  assert.equal(matchedEvidence(post, registry).screenshot, '/share/exact.png');
});
void test('An edited announcement cannot reuse its old screenshot', () => {
  assert.deepEqual(
    matchedEvidence({ ...post, contentHash: 'changed' }, registry),
    {},
  );
});
void test('A different announcement cannot reuse a previous screenshot', () => {
  assert.deepEqual(matchedEvidence({ ...post, id: '2' }, registry), {});
  assert.deepEqual(
    matchedEvidence({ ...post, url: 'https://x.com/other/status/1' }, registry),
    {},
  );
});
