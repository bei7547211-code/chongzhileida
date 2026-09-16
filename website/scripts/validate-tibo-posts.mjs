import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const websiteRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const feed = JSON.parse(
  await readFile(resolve(websiteRoot, 'data/tibo-posts.json'), 'utf8'),
);

assert.equal(feed.schemaVersion, 1, 'Tibo 帖子版本必须为 1');
assert.ok(Date.parse(feed.updatedAt), 'Tibo 帖子更新时间无效');
assert.ok(
  Array.isArray(feed.posts) && feed.posts.length >= 6,
  '至少保留 6 条帖子',
);

const ids = new Set();
for (const post of feed.posts) {
  assert.match(post.id, /^\d+$/, '帖子 ID 必须为数字');
  assert.ok(!ids.has(post.id), `帖子 ID 重复: ${post.id}`);
  ids.add(post.id);
  assert.ok(Date.parse(post.publishedAt), `帖子时间无效: ${post.id}`);
  assert.match(
    post.url,
    new RegExp(`^https://x\\.com/thsottiaux/status/${post.id}$`),
    `帖子链接无效: ${post.id}`,
  );
  assert.ok(['confirmed', 'related', 'none'].includes(post.resetSignal));
  assert.ok(post.title.trim() && post.summary.trim() && post.category.trim());
}

console.log(`TIBO_POSTS_VALID ${feed.posts.length}`);
