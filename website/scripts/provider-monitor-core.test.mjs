import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyProviderPost,
  mergeProviderPosts,
} from './provider-monitor-core.mjs';
const post = {
  id: '2096303514230423629',
  authorHandle: '@bot',
  postType: 'original',
  text: "We've reset usage limits for all Grok Bot users. Enjoy!",
  publishedAt: '2026-09-05T18:24:39.000Z',
  url: 'https://x.com/bot/status/2096303514230423629',
  contentHash: 'a',
};
const empty = { announcements: [], pending: [], posts: [] };
const now = '2026-09-24T00:00:00.000Z';
test('Grok Bot is not presented as all Grok products', () => {
  assert.match(classifyProviderPost('grok', post).scope, /不代表 Grok Chat/);
});
test('Spoofed source never passes', () => {
  assert.equal(
    classifyProviderPost('grok', { ...post, authorHandle: '@fake' }),
    null,
  );
});
test('Promises, negatives, questions and quotes require review', () => {
  for (const text of [
    'We will reset usage limits for all Grok Bot users.',
    'We have not reset usage limits for all Grok Bot users.',
    'Have we reset usage limits for all users?',
  ])
    assert.equal(
      classifyProviderPost('grok', { ...post, text }).status,
      'review',
    );
  assert.equal(
    classifyProviderPost('grok', { ...post, postType: 'quote' }).status,
    'review',
  );
});
test('Claude banked reset remains distinct from immediate reset', () => {
  const c = classifyProviderPost('claude', {
    ...post,
    authorHandle: '@claudeai',
    text: 'We are providing Pro, Max and Team users a rate limit reset, which you can save and use whenever you choose.',
  });
  assert.equal(c.kind, 'banked');
  assert.equal(c.status, 'confirmed');
});
test('Claude self-reply stays pending until explicit review', () => {
  assert.equal(
    classifyProviderPost('claude', {
      ...post,
      authorHandle: '@claudeai',
      postType: 'reply',
      text: 'We are providing a reset to save for whenever you choose.',
    }).status,
    'review',
  );
});
test('Unspecified Grok scope is never auto published', () => {
  assert.equal(
    mergeProviderPosts(
      'grok',
      empty,
      [{ ...post, text: "We've reset usage limits for all users." }],
      now,
    ).announcements.length,
    0,
  );
});
test('Idempotent import', () => {
  const first = mergeProviderPosts('grok', empty, [post], now);
  const second = mergeProviderPosts('grok', first, [post], now);
  assert.equal(second.announcements.length, 1);
  assert.deepEqual(second.newIds, []);
});
test('Edited confirmed post retracts even when reset word removed', () => {
  const first = mergeProviderPosts('grok', empty, [post], now);
  const next = mergeProviderPosts(
    'grok',
    first,
    [{ ...post, text: 'Correction: nothing has changed.', contentHash: 'b' }],
    now,
  );
  assert.equal(next.announcements.length, 0);
  assert.equal(next.pending.length, 1);
});
test('Pending edit invalidates previous rejection decision', () => {
  const pending = { ...post, decision: 'reject' };
  const next = mergeProviderPosts(
    'grok',
    { ...empty, pending: [pending] },
    [{ ...post, contentHash: 'b' }],
    now,
  );
  assert.equal(next.pending[0].decision, undefined);
  assert.equal(next.announcements.length, 0);
});
