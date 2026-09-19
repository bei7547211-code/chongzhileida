import { classifyResetPost } from './reset-feed-core.mjs';

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeHandle(handle) {
  return String(handle ?? '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase();
}

function validatePostUrl(url, id) {
  const parsed = new URL(url);
  invariant(
    ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(
      parsed.hostname.toLowerCase(),
    ),
    '推文必须来自 x.com 或 twitter.com',
  );
  invariant(
    parsed.pathname === `/thsottiaux/status/${id}`,
    '推文 URL 必须指向 Tibo 本人的对应帖子',
  );
}

function summarize(text, limit = 140) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length <= limit
    ? normalized
    : `${normalized.slice(0, limit - 1).trim()}…`;
}

export function validateTiboPostsFeed(feed) {
  invariant(feed?.schemaVersion === 1, '不支持的 Tibo 帖子数据版本');
  invariant(Number.isFinite(Date.parse(feed.updatedAt)), '帖子更新时间无效');
  invariant(Number.isFinite(Date.parse(feed.verifiedAt)), '帖子核验时间无效');
  invariant(Array.isArray(feed.posts), 'posts 必须是数组');
  const ids = new Set();
  for (const post of feed.posts) {
    invariant(/^\d{10,25}$/.test(post.id), `无效推文 ID: ${post.id}`);
    invariant(!ids.has(post.id), `重复推文 ID: ${post.id}`);
    ids.add(post.id);
    invariant(
      Number.isFinite(Date.parse(post.publishedAt)),
      `无效时间: ${post.id}`,
    );
    invariant(['confirmed', 'related', 'none'].includes(post.resetSignal));
    invariant(
      post.title?.trim() && post.summary?.trim(),
      `帖子文案为空: ${post.id}`,
    );
    validatePostUrl(post.url, post.id);
  }
  return true;
}

export function ingestRecentTiboPost(feed, payload, now = new Date()) {
  validateTiboPostsFeed(feed);
  invariant(
    normalizeHandle(payload.authorHandle) === 'thsottiaux',
    '只允许收录 @thsottiaux 的帖子',
  );
  invariant(/^\d{10,25}$/.test(String(payload.id ?? '')), '推文 ID 无效');
  invariant(
    Number.isFinite(Date.parse(payload.publishedAt)),
    '推文发布时间无效',
  );
  invariant(
    typeof payload.text === 'string' && payload.text.trim(),
    '推文原文不能为空',
  );
  validatePostUrl(payload.url, payload.id);

  if (feed.posts.some((post) => post.id === String(payload.id))) {
    return { changed: false, reason: 'duplicate', feed };
  }

  const classification = classifyResetPost(payload.text);
  const resetSignal = classification
    ? classification.requiresJudgment
      ? 'related'
      : 'confirmed'
    : 'none';
  const nextFeed = structuredClone(feed);
  nextFeed.posts.push({
    id: String(payload.id),
    publishedAt: new Date(payload.publishedAt).toISOString(),
    title:
      String(payload.title ?? '').trim() ||
      classification?.title ||
      'Tibo 最新动态',
    summary:
      String(payload.summary ?? '').trim() ||
      classification?.summary ||
      summarize(payload.text),
    category:
      String(payload.category ?? '').trim() ||
      (resetSignal === 'confirmed'
        ? '重置'
        : resetSignal === 'related'
          ? '相关'
          : '动态'),
    resetSignal,
    url: payload.url,
  });
  nextFeed.posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  nextFeed.posts = nextFeed.posts.slice(0, 30);
  nextFeed.updatedAt = now.toISOString();
  nextFeed.verifiedAt = now.toISOString();
  validateTiboPostsFeed(nextFeed);
  return { changed: true, reason: resetSignal, feed: nextFeed };
}
