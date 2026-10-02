import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectSnapshot, eventStatus } from '../packages/backend/src/publication/reset-relay-model.ts';

const event = { id: 'codex-123', provider: 'codex', title: '将重置', summary: '等待确认', text: 'Will reset', scope: '付费用户', kind: 'signal', publishedAt: '2026-09-26T00:00:00Z', verifiedAt: '2026-09-28T00:00:00Z', sourceUrl: 'https://x.com/thsottiaux/status/123' };
const snapshot = { schemaVersion: 1, complete: true, generatedAt: '2026-09-28T13:00:00Z', platforms: [], events: [event], articles: [] };
test('migration projects public fields and marks data as a snapshot', () => {
  const result = projectSnapshot({ ...snapshot, apiKey: 'secret', events: [{ ...event, credential: 'secret' }] });
  assert.equal(result.mode, 'snapshot');
  assert.equal(result.events.length, 1);
  assert.equal(JSON.stringify(result).includes('secret'), false);
});
test('an old announcement never becomes a confirmed reset just because time passed', () => {
  assert.equal(eventStatus('signal'), '等待完成确认');
  assert.equal(eventStatus('banked'), '曾发放重置卡');
  assert.equal(eventStatus('full'), '曾确认额度重置');
});
test('reject unsafe sources, duplicates and unknown event kinds', () => {
  for (const invalid of [{ sourceUrl: 'javascript:alert(1)' }, { sourceUrl: 'https://evil.example/post' }, { kind: 'maybe' }, { publishedAt: 'not a date' }]) {
    assert.throws(() => projectSnapshot({ ...snapshot, events: [{ ...event, ...invalid }] }));
  }
  assert.throws(() => projectSnapshot({ ...snapshot, events: [event, event] }));
});
test('incomplete exports are not published and unsupported providers fail closed', () => {
  assert.throws(() => projectSnapshot({ ...snapshot, complete: false }));
  assert.throws(() => projectSnapshot({ ...snapshot, events: [{ ...event, provider: 'unknown' }] }));
});
