import assert from 'node:assert/strict';
import test from 'node:test';
import feed from '../data/tibo-posts.json' with { type: 'json' };
import {
  ingestRecentTiboPost,
  validateTiboPostsFeed,
} from './tibo-posts-core.mjs';

test('最近帖子数据源结构合法', () => {
  assert.equal(validateTiboPostsFeed(feed), true);
});

test('普通帖子也会进入最近动态，但不会被标成重置', () => {
  const result = ingestRecentTiboPost(feed, {
    id: '2100000000000000000',
    authorHandle: '@thsottiaux',
    publishedAt: '2026-09-16T06:00:00.000Z',
    text: 'Shipping a new editor theme.',
    url: 'https://x.com/thsottiaux/status/2100000000000000000',
  });

  assert.equal(result.changed, true);
  assert.equal(result.feed.posts[0].resetSignal, 'none');
});

test('明确重置帖子会自动标记确认信号', () => {
  const result = ingestRecentTiboPost(feed, {
    id: '2100000000000000001',
    authorHandle: '@thsottiaux',
    publishedAt: '2026-09-16T07:00:00.000Z',
    text: 'Reset all propagated.',
    url: 'https://x.com/thsottiaux/status/2100000000000000001',
  });

  assert.equal(result.feed.posts[0].resetSignal, 'confirmed');
});
