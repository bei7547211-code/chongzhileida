import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const websiteRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const [feed, skipped] = await Promise.all([
  readFile(resolve(websiteRoot, 'data/side-hustles.json'), 'utf8').then(
    JSON.parse,
  ),
  readFile(resolve(websiteRoot, 'data/side-hustle-skip.json'), 'utf8').then(
    JSON.parse,
  ),
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function requiredText(value, field, topicId) {
  invariant(
    typeof value === 'string' && value.trim(),
    `缺少字段 ${field}：${topicId}`,
  );
}

const forbiddenHalfWidthPunctuation = /[,;:!?]|--/;

invariant(/^\d{4}-\d{2}-\d{2}$/.test(feed.updated_at), 'updated_at 无效');
invariant(Array.isArray(feed.posts), 'posts 必须是数组');

const ids = new Set();
for (const post of feed.posts) {
  requiredText(post.topic_id, 'topic_id', 'unknown');
  invariant(!ids.has(post.topic_id), `重复 topic_id：${post.topic_id}`);
  ids.add(post.topic_id);
  invariant(
    /^\d{10,25}$/.test(post.topic_id),
    `topic_id 无效：${post.topic_id}`,
  );
  invariant(
    post.url === `https://scys.com/articleDetail/xq_topic/${post.topic_id}`,
    `原帖链接无效：${post.topic_id}`,
  );
  for (const field of [
    'slug',
    'title',
    'author',
    'avatar',
    'published_at',
    'fetched_at',
    'cover',
    'hook',
  ]) {
    requiredText(post[field], field, post.topic_id);
  }
  invariant(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug),
    `slug 无效：${post.topic_id}`,
  );
  invariant(
    /^\d{4}-\d{2}-\d{2}$/.test(post.published_at) &&
      /^\d{4}-\d{2}-\d{2}$/.test(post.fetched_at),
    `发布日期或抓取日期无效：${post.topic_id}`,
  );
  invariant(
    post.avatar === `/side-hustles/${post.topic_id}_avatar.jpg`,
    `头像路径无效：${post.topic_id}`,
  );
  invariant(
    post.cover === `/side-hustles/${post.topic_id}_cover.webp`,
    `封面路径无效：${post.topic_id}`,
  );
  await access(resolve(websiteRoot, 'public', post.avatar.slice(1)));
  await access(resolve(websiteRoot, 'public', post.cover.slice(1)));
  invariant(
    post.stats &&
      ['likes', 'favorites', 'comments', 'reads'].every(
        (field) =>
          Number.isInteger(post.stats[field]) && post.stats[field] >= 0,
      ),
    `互动字段缺失或无效：${post.topic_id}`,
  );
  invariant(
    Number.isInteger(post.word_count) && post.word_count > 0,
    `word_count 无效：${post.topic_id}`,
  );
  invariant(
    Array.isArray(post.tags) && post.tags.length >= 1,
    `tags 缺失：${post.topic_id}`,
  );
  invariant(
    post.hook.length >= 80 && post.hook.length <= 140,
    `hook 字数不合格：${post.topic_id}`,
  );
  invariant(
    !forbiddenHalfWidthPunctuation.test(post.hook),
    `hook 含半角或禁用标点：${post.topic_id}`,
  );
  invariant(
    post.problems.length >= 4 && post.problems.length <= 6,
    `problems 数量不合格：${post.topic_id}`,
  );
  for (const problem of post.problems) {
    invariant(
      problem.length >= 15 && problem.length <= 40,
      `问题字数不合格：${problem}`,
    );
    invariant(problem.endsWith('？'), `问题未以全角问号结尾：${problem}`);
    invariant(
      !forbiddenHalfWidthPunctuation.test(problem),
      `问题含半角或禁用标点：${problem}`,
    );
  }
  invariant(
    post.quotes.length >= 2 && post.quotes.length <= 3,
    `quotes 数量不合格：${post.topic_id}`,
  );
  for (const quote of post.quotes)
    invariant(
      quote.length >= 15 && quote.length <= 80,
      `原话字数不合格：${quote}`,
    );
  invariant(
    post.hook_stats.length >= 1 && post.hook_stats.length <= 3,
    `成绩板数量不合格：${post.topic_id}`,
  );
  for (const stat of post.hook_stats) {
    invariant(
      stat.num.length >= 2 && stat.num.length <= 6,
      `成绩数字长度不合格：${stat.num}`,
    );
    invariant(
      stat.label.length >= 5 && stat.label.length <= 12,
      `成绩标签长度不合格：${stat.label}`,
    );
  }
}

const skippedIds = new Set();
for (const item of skipped) {
  requiredText(item.topic_id, 'skip.topic_id', 'unknown');
  requiredText(item.reason, 'skip.reason', item.topic_id);
  invariant(!skippedIds.has(item.topic_id), `跳过名单重复：${item.topic_id}`);
  invariant(
    !ids.has(item.topic_id),
    `已收录项目仍在跳过名单：${item.topic_id}`,
  );
  skippedIds.add(item.topic_id);
}

console.log(`VALID ${feed.posts.length} curated side hustle posts`);
