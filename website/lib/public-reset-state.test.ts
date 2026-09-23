import assert from 'node:assert/strict';
import test from 'node:test';
import { getPublicResetState } from './public-reset-state.ts';

void test('24 小时内的明确公告显示已确认状态', () => {
  assert.deepEqual(
    getPublicResetState({
      latestAnnouncementAt: '2026-09-22T18:23:37.000Z',
      verifiedAt: '2026-09-23T03:00:11.209Z',
    }),
    { kind: 'confirmed', hoursSinceConfirmation: 8 },
  );
});

void test('未兑现的官方日期会从预告切换为已逾期', () => {
  const signal = {
    publishedAt: '2026-09-22T04:31:32.000Z',
    preview: { dateLabel: '9月22日' },
  };

  assert.equal(
    getPublicResetState({
      latestAnnouncementAt: '2026-09-12T08:09:00.000Z',
      latestRelatedSignal: signal,
      verifiedAt: '2026-09-22T12:00:00.000Z',
    }).kind,
    'scheduled',
  );
  assert.equal(
    getPublicResetState({
      latestAnnouncementAt: '2026-09-12T08:09:00.000Z',
      latestRelatedSignal: signal,
      verifiedAt: '2026-09-23T03:00:00.000Z',
    }).kind,
    'overdue',
  );
});

void test('旧公告回到持续观察状态', () => {
  assert.equal(
    getPublicResetState({
      latestAnnouncementAt: '2026-09-12T08:09:00.000Z',
      verifiedAt: '2026-09-23T03:00:00.000Z',
    }).kind,
    'watching',
  );
});
