import { createHash } from 'node:crypto';

export const TIBO_HANDLE = 'thsottiaux';
export const FX_TIMELINE_ENDPOINT =
  'https://api.fxtwitter.com/2/profile/thsottiaux/statuses';

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeHandle(value) {
  return String(value ?? '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase();
}

function parsePublishedAt(item) {
  const timestamp = Number(item.created_timestamp);
  if (Number.isFinite(timestamp) && timestamp > 0) {
    const milliseconds =
      timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000;
    const date = new Date(milliseconds);
    if (Number.isFinite(date.getTime())) return date.toISOString();
  }

  const parsed = Date.parse(item.created_at);
  invariant(Number.isFinite(parsed), `帖子 ${item.id} 的发布时间无法解析`);
  return new Date(parsed).toISOString();
}

function normalizeText(item) {
  const candidate =
    typeof item.text === 'string'
      ? item.text
      : typeof item.raw_text?.text === 'string'
        ? item.raw_text.text
        : '';
  return candidate.replace(/\s+/g, ' ').trim();
}

function extractMediaUrls(item) {
  const media = item.media;
  if (!media || typeof media !== 'object') return [];
  const entries = Array.isArray(media.all)
    ? media.all
    : Array.isArray(media.photos)
      ? media.photos
      : Array.isArray(media.videos)
        ? media.videos
        : [];
  return entries
    .map((entry) => (typeof entry?.url === 'string' ? entry.url.trim() : ''))
    .filter((url) => url.startsWith('https://'))
    .sort();
}

export function createPostContentHash(post) {
  return createHash('sha256')
    .update(
      [
        post.id,
        post.authorHandle,
        post.publishedAt,
        post.postType,
        post.text,
        ...(post.mediaUrls ?? []),
      ].join('\u0000'),
    )
    .digest('hex');
}

export function normalizeFxTimelineItem(item, handle = TIBO_HANDLE) {
  invariant(item && typeof item === 'object', '时间线条目不是对象');
  const id = String(item.id ?? '').trim();
  invariant(/^\d{10,25}$/.test(id), '帖子 ID 无效');

  const authorHandle = normalizeHandle(item.author?.screen_name);
  invariant(authorHandle, `帖子 ${id} 缺少作者`);
  if (authorHandle !== normalizeHandle(handle)) return null;

  const text = normalizeText(item);
  const mediaUrls = extractMediaUrls(item);
  invariant(text || mediaUrls.length, `帖子 ${id} 没有可用正文或媒体`);

  const postType =
    item.replying_to && typeof item.replying_to === 'object'
      ? 'reply'
      : item.quote && typeof item.quote === 'object'
        ? 'quote'
        : 'original';
  const post = {
    id,
    authorHandle: `@${authorHandle}`,
    publishedAt: parsePublishedAt(item),
    text,
    postType,
    mediaUrls,
    url: `https://x.com/${authorHandle}/status/${id}`,
  };
  return { ...post, contentHash: createPostContentHash(post) };
}

export function parseFxTimelinePage(payload, handle = TIBO_HANDLE) {
  invariant(payload && typeof payload === 'object', '数据源响应不是 JSON 对象');
  invariant(
    payload.code === 200,
    `数据源业务状态异常：${payload.code ?? '未知'}`,
  );
  invariant(Array.isArray(payload.results), '数据源响应缺少 results 数组');

  const posts = [];
  const seenIds = new Set();
  let contextEntries = 0;
  let parseFailures = 0;
  const warnings = [];

  for (const item of payload.results) {
    try {
      const post = normalizeFxTimelineItem(item, handle);
      if (!post) {
        contextEntries += 1;
        continue;
      }
      if (seenIds.has(post.id)) continue;
      seenIds.add(post.id);
      posts.push(post);
    } catch (error) {
      parseFailures += 1;
      warnings.push(error instanceof Error ? error.message : String(error));
    }
  }

  const nextCursor =
    typeof payload.cursor?.bottom === 'string' && payload.cursor.bottom.trim()
      ? payload.cursor.bottom.trim()
      : null;

  return {
    posts,
    nextCursor,
    returnedCount: payload.results.length,
    contextEntries,
    parseFailures,
    warnings,
  };
}

async function fetchPage(url, fetchImpl) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: {
          accept: 'application/json',
          'user-agent': 'ResetRadar/1.0 (+https://www.resetrelay.com)',
        },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        const error = new Error(`数据源请求失败（HTTP ${response.status}）`);
        if (response.status >= 500 && attempt === 0) {
          lastError = error;
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }
        throw error;
      }

      const contentType = response.headers.get('content-type') ?? '';
      invariant(
        !contentType || contentType.toLowerCase().includes('application/json'),
        `数据源返回了非 JSON 内容：${contentType || '未知类型'}`,
      );
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        continue;
      }
    }
  }
  throw lastError;
}

export async function fetchTiboTimeline({
  fetchImpl = globalThis.fetch,
  maxPages = 3,
} = {}) {
  invariant(typeof fetchImpl === 'function', '当前环境不支持网络请求');
  invariant(
    Number.isInteger(maxPages) && maxPages >= 1 && maxPages <= 5,
    'maxPages 必须在 1 到 5 之间',
  );

  const startedAt = new Date().toISOString();
  const postMap = new Map();
  const cursorHistory = new Set();
  const warnings = [];
  let cursor = null;
  let pagesFetched = 0;
  let returnedCount = 0;
  let contextEntries = 0;
  let parseFailures = 0;
  let hasMore = false;

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const url = new URL(FX_TIMELINE_ENDPOINT);
    url.searchParams.set('count', '100');
    url.searchParams.set('with_replies', '1');
    if (cursor) url.searchParams.set('cursor', cursor);

    const payload = await fetchPage(url, fetchImpl);
    const page = parseFxTimelinePage(payload);
    pagesFetched += 1;
    returnedCount += page.returnedCount;
    contextEntries += page.contextEntries;
    parseFailures += page.parseFailures;
    warnings.push(...page.warnings);
    for (const post of page.posts) postMap.set(post.id, post);

    hasMore = Boolean(page.nextCursor);
    if (!page.nextCursor || cursorHistory.has(page.nextCursor)) break;
    cursorHistory.add(page.nextCursor);
    cursor = page.nextCursor;
  }

  const posts = [...postMap.values()].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
  return {
    provider: 'fxtwitter-json',
    handle: `@${TIBO_HANDLE}`,
    startedAt,
    finishedAt: new Date().toISOString(),
    pagesFetched,
    returnedCount,
    contextEntries,
    parseFailures,
    warnings: warnings.slice(0, 20),
    coverageStatus:
      parseFailures > 0 || (pagesFetched === maxPages && hasMore)
        ? 'limited'
        : 'overlap_observed',
    posts,
  };
}
