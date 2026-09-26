import assert from 'node:assert/strict';
import test from 'node:test';
import resetFeedFixture from '../data/reset-feed.json' with { type: 'json' };
import postsFeedFixture from '../data/tibo-posts.json' with { type: 'json' };
import {
  applyTiboMonitorPlan,
  buildMonitorAudit,
  createEmptyMonitorState,
  planTiboMonitorRun,
} from './tibo-monitor-core.mjs';

function post(id, publishedAt, text, contentHash = `hash-${id}`) {
  return {
    id,
    authorHandle: '@thsottiaux',
    publishedAt,
    text,
    postType: 'original',
    mediaUrls: [],
    url: `https://x.com/thsottiaux/status/${id}`,
    contentHash,
  };
}

function report(posts) {
  return {
    provider: 'fxtwitter-json',
    coverageStatus: 'overlap_observed',
    pagesFetched: 2,
    parseFailures: 0,
    posts,
  };
}

function hoursAfterLatestFeedPost(hours) {
  const latestTime = Math.max(
    ...postsFeedFixture.posts.map((item) => Date.parse(item.publishedAt)),
  );
  return new Date(latestTime + hours * 3_600_000).toISOString();
}

test('原帖更正暂停旧结论，连续三次巡检仍待审，且不重复产生更正', () => {
  const id = '2101000000000000099';
  let feed = structuredClone(resetFeedFixture);
  feed.events = [{ date: '2026-01-01', kind: 'full' }];
  feed.announcements = [
    {
      id,
      publishedAt: '2026-01-01T01:00:00Z',
      kind: 'full',
      title: '已完成',
      text: 'Reset all propagated.',
      summary: '已完成',
      url: `https://x.com/thsottiaux/status/${id}`,
      screenshot: '/share/test.png',
    },
  ];
  let posts = structuredClone(postsFeedFixture);
  let state = createEmptyMonitorState();
  state.seen[id] = {
    contentHash: 'old',
    publishedAt: '2026-01-01T01:00:00Z',
    lastSeenAt: '2026-01-01T01:00:00Z',
  };
  const sourceReport = report([
    post(id, '2026-01-01T01:00:00Z', 'Correction: no reset happened.', 'new'),
  ]);
  for (let i = 0; i < 3; i++) {
    const plan = planTiboMonitorRun({
      sourceReport,
      resetFeed: feed,
      postsFeed: posts,
      state,
    });
    assert.equal(plan.pendingItems.length, 1);
    const applied = applyTiboMonitorPlan(feed, posts, plan);
    feed = applied.resetFeed;
    posts = applied.postsFeed;
    state = plan.nextState;
    assert.equal(feed.announcements[0].kind, 'signal');
    assert.equal(feed.announcements[0].reviewPending, true);
    assert.equal(feed.announcements[0].screenshot, undefined);
    assert.equal(feed.announcements[0].revision, 1);
    assert.equal(feed.events.length, 0);
  }
});

test('普通动态、明确重置和含糊信号走三条不同路径', () => {
  const sourceReport = report([
    post(
      '2101000000000000001',
      hoursAfterLatestFeedPost(1),
      'Shipping a faster editor today.',
    ),
    post(
      '2101000000000000002',
      hoursAfterLatestFeedPost(2),
      'Reset all propagated.',
    ),
    post(
      '2101000000000000003',
      hoursAfterLatestFeedPost(3),
      'We are discussing weekly quota changes.',
    ),
  ]);
  const now = new Date(hoursAfterLatestFeedPost(4));
  const plan = planTiboMonitorRun({
    sourceReport,
    resetFeed: structuredClone(resetFeedFixture),
    postsFeed: structuredClone(postsFeedFixture),
    state: createEmptyMonitorState(),
    now,
  });

  assert.deepEqual(
    plan.publicActions.map((action) => action.type),
    ['general', 'confirmed-reset'],
  );
  assert.equal(plan.pendingItems.length, 1);

  const applied = applyTiboMonitorPlan(
    structuredClone(resetFeedFixture),
    structuredClone(postsFeedFixture),
    plan,
    now,
  );
  assert.deepEqual(applied.ingestedPostIds, [
    '2101000000000000001',
    '2101000000000000002',
  ]);
  assert.deepEqual(applied.resetPostIds, ['2101000000000000002']);
  assert.ok(
    !applied.postsFeed.posts.some((item) => item.id === '2101000000000000003'),
  );
  assert.equal(applied.postsFeed.verifiedAt, now.toISOString());

  const audit = buildMonitorAudit({
    sourceReport,
    plan,
    applied,
    startedAt: new Date(now.getTime() - 60_000).toISOString(),
    finishedAt: now.toISOString(),
  });
  assert.equal(audit.status, 'attention');
  assert.equal(audit.judgmentNeeded.length, 1);
  assert.equal(audit.judgmentNeeded[0].recommendation, 'C');
});

test('已公开帖子不会重复处理', () => {
  const existing = postsFeedFixture.posts[0];
  const plan = planTiboMonitorRun({
    sourceReport: report([
      post(existing.id, existing.publishedAt, existing.summary),
    ]),
    resetFeed: structuredClone(resetFeedFixture),
    postsFeed: structuredClone(postsFeedFixture),
    state: createEmptyMonitorState(),
    now: new Date('2026-09-19T03:00:00.000Z'),
  });
  assert.equal(plan.publicActions.length, 0);
  assert.equal(plan.unchangedPosts, 1);

  const applied = applyTiboMonitorPlan(
    structuredClone(resetFeedFixture),
    structuredClone(postsFeedFixture),
    plan,
    new Date('2026-09-21T03:00:00.000Z'),
  );
  const audit = buildMonitorAudit({
    sourceReport: report([]),
    plan,
    applied,
    startedAt: '2026-09-21T02:59:00.000Z',
    finishedAt: '2026-09-21T03:00:00.000Z',
  });
  assert.equal(applied.contentChanged, false);
  assert.equal(audit.status, 'ok');
  assert.match(audit.summary, /没有发现/);
});

test('首次运行不会倒灌超过重叠窗口的旧帖子', () => {
  const plan = planTiboMonitorRun({
    sourceReport: report([
      post('2080000000000000000', '2026-08-01T00:00:00.000Z', 'An old post.'),
    ]),
    resetFeed: structuredClone(resetFeedFixture),
    postsFeed: structuredClone(postsFeedFixture),
    state: createEmptyMonitorState(),
    now: new Date('2026-09-19T03:00:00.000Z'),
  });
  assert.equal(plan.publicActions.length, 0);
  assert.equal(plan.ignoredBaselinePosts, 1);
});

test('已见帖发生变化时暂停并交给人工确认', () => {
  const watched = post(
    '2101000000000000004',
    '2026-09-18T11:00:00.000Z',
    'Edited quota note.',
    'new-hash',
  );
  const state = createEmptyMonitorState();
  state.seen[watched.id] = {
    contentHash: 'old-hash',
    publishedAt: watched.publishedAt,
    lastSeenAt: '2026-09-18T11:01:00.000Z',
  };
  const plan = planTiboMonitorRun({
    sourceReport: report([watched]),
    resetFeed: structuredClone(resetFeedFixture),
    postsFeed: structuredClone(postsFeedFixture),
    state,
    now: new Date('2026-09-19T03:00:00.000Z'),
  });
  assert.equal(plan.publicActions.length, 0);
  assert.equal(plan.editedPosts, 1);
  assert.match(plan.pendingItems[0].reason, /内容发生了变化/);
});
