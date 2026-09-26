import assert from 'node:assert/strict';
import test from 'node:test';
import feed from '../data/reset-feed.json' with { type: 'json' };
import {
  classifyResetPost,
  ingestTiboPost,
  toShanghaiDateKey,
  validateResetFeed,
} from './reset-feed-core.mjs';

test('数据源结构合法', () => {
  assert.equal(validateResetFeed(feed), true);
});

test('未来式、否定和疑问不能自动宣布完成，包括弯引号', () => {
  for (const text of [
    'we’ll reset usage limits for all paid users across codex and ChatGPT work',
    "We'll reset usage limits tomorrow.",
    'We will provide a banked reset.',
    'We have not reset usage limits.',
    'Should we reset usage limits?',
  ]) {
    assert.equal(classifyResetPost(text)?.requiresJudgment, true, text);
    const result = ingestTiboPost(feed, {
      id: '2100000000000000088',
      authorHandle: '@thsottiaux',
      publishedAt: '2026-09-26T00:07:13.000Z',
      text,
      url: 'https://x.com/thsottiaux/status/2100000000000000088',
    });
    assert.equal(result.reason, 'needs-judgment');
    assert.deepEqual(result.feed.events, feed.events);
  }
});

test('同一天可以先预告、后完成，不用实时日期限制发布', () => {
  const fixture = structuredClone(feed);
  fixture.events = [];
  fixture.announcements = [];
  const payload = {
    id: '2100000000000000081',
    authorHandle: '@thsottiaux',
    publishedAt: '2026-01-01T01:00:00Z',
    url: 'https://x.com/thsottiaux/status/2100000000000000081',
    text: "We'll reset usage limits.",
  };
  const preview = ingestTiboPost(fixture, payload);
  assert.equal(preview.reason, 'needs-judgment');
  assert.equal(preview.feed.events.length, 0);
  const completed = ingestTiboPost(preview.feed, {
    ...payload,
    text: 'Reset all propagated.',
  });
  assert.equal(completed.changed, true);
  assert.deepEqual(completed.feed.events, [
    { date: '2026-01-01', kind: 'full' },
  ]);
});

test('请求、愿望、他方转述不自动发布，非重置句中的 Not only 不误拦', () => {
  for (const text of [
    'I wish we could reset usage limits for everyone.',
    'Users are asking us to reset usage limits.',
    'Yesterday another service announced a full reset.',
    'Someone said "We reset usage for all paid subscriptions."',
  ]) {
    assert.equal(classifyResetPost(text)?.requiresJudgment, true, text);
  }
  assert.equal(
    classifyResetPost(
      'Not only are models better, they are cheaper. We are loading a banked reset into all accounts of our Plus, Pro and Business users.',
    )?.kind,
    'banked',
  );
});

test('巡检状态与人工审查边界会被校验', () => {
  const invalidFeed = structuredClone(feed);
  invalidFeed.monitor.reviewRequired = false;
  assert.throws(
    () => validateResetFeed(invalidFeed),
    /含糊信息必须经过审查后发布/,
  );
});

test('全量重置与重置卡可被确定性分类', () => {
  assert.equal(classifyResetPost('Reset all propagated.')?.kind, 'full');
  assert.equal(
    classifyResetPost('We reset usage for all paid subscriptions.')?.kind,
    'full',
  );
  assert.equal(classifyResetPost('A banked reset is ready.')?.kind, 'banked');
  assert.equal(classifyResetPost('Shipping a new editor theme.'), null);
});

test('含糊的额度讨论交给用户判断而不自动入库', () => {
  const result = ingestTiboPost(feed, {
    id: '2100000000000000000',
    authorHandle: '@thsottiaux',
    publishedAt: '2026-09-15T12:00:00.000Z',
    text: 'We are discussing the weekly quota.',
    url: 'https://x.com/thsottiaux/status/2100000000000000000',
  });
  assert.equal(result.changed, false);
  assert.equal(result.reason, 'needs-judgment');
});

test('只允许 Tibo 本人帖子', () => {
  assert.throws(() =>
    ingestTiboPost(feed, {
      id: '2100000000000000000',
      authorHandle: '@someoneelse',
      publishedAt: '2026-09-15T12:00:00.000Z',
      text: 'Reset all propagated.',
      url: 'https://x.com/thsottiaux/status/2100000000000000000',
    }),
  );
});

test('相同推文 ID 不会重复入库', () => {
  const first = feed.announcements[0];
  const result = ingestTiboPost(feed, {
    id: first.id,
    authorHandle: '@thsottiaux',
    publishedAt: first.publishedAt,
    text: first.text,
    url: first.url,
  });
  assert.equal(result.changed, false);
  assert.equal(result.reason, 'duplicate');
});

test('自动入库按北京时间落到正确自然日', () => {
  assert.equal(toShanghaiDateKey('2026-10-01T18:30:00.000Z'), '2026-10-02');

  const result = ingestTiboPost(feed, {
    id: '2100000000000000099',
    authorHandle: '@thsottiaux',
    publishedAt: '2026-10-01T18:30:00.000Z',
    text: 'Reset all propagated.',
    url: 'https://x.com/thsottiaux/status/2100000000000000099',
  });

  assert.equal(result.changed, true);
  assert.equal(result.feed.events[0].date, '2026-10-02');
});
