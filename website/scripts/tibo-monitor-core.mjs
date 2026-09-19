import { classifyResetPost, ingestTiboPost } from './reset-feed-core.mjs';
import {
  ingestRecentTiboPost,
  validateTiboPostsFeed,
} from './tibo-posts-core.mjs';

export const MONITOR_STATE_SCHEMA = 1;
const overlapWindowMs = 12 * 60 * 60 * 1000;
const maxRememberedPosts = 500;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function summarize(text, limit) {
  const normalized = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return '这条动态主要包含图片或视频，请查看原帖。';
  return normalized.length <= limit
    ? normalized
    : `${normalized.slice(0, limit - 1).trim()}…`;
}

export function createEmptyMonitorState() {
  return {
    schemaVersion: MONITOR_STATE_SCHEMA,
    handle: '@thsottiaux',
    updatedAt: null,
    lastSuccessAt: null,
    source: null,
    seen: {},
    pending: {},
    decisions: {},
  };
}

export function validateMonitorState(state) {
  invariant(state && typeof state === 'object', '巡检状态必须是对象');
  invariant(
    state.schemaVersion === MONITOR_STATE_SCHEMA,
    '不支持的巡检状态版本',
  );
  invariant(state.handle === '@thsottiaux', '巡检状态账号必须是 @thsottiaux');
  invariant(state.seen && typeof state.seen === 'object', 'seen 状态无效');
  invariant(
    state.pending && typeof state.pending === 'object',
    'pending 状态无效',
  );
  invariant(
    state.decisions && typeof state.decisions === 'object',
    'decisions 状态无效',
  );
  return true;
}

function decoratePost(post, classification, resetSignalOverride) {
  const displayText = post.text || '这条动态主要包含图片或视频，请查看原帖。';
  const resetSignal =
    resetSignalOverride ??
    (classification
      ? classification.requiresJudgment
        ? 'related'
        : 'confirmed'
      : 'none');
  const isReply = post.postType === 'reply';
  return {
    id: post.id,
    authorHandle: post.authorHandle,
    publishedAt: post.publishedAt,
    text: displayText,
    url: post.url,
    postType: post.postType,
    title:
      classification?.title ??
      (isReply
        ? `Tibo 回复：${summarize(displayText, 38)}`
        : summarize(displayText, 46)),
    summary: classification?.summary ?? summarize(displayText, 160),
    category:
      resetSignal === 'confirmed'
        ? '重置'
        : resetSignal === 'related'
          ? '相关'
          : isReply
            ? '回复'
            : '动态',
    resetSignalOverride,
  };
}

function makePendingItem(post, classification, now, reason) {
  return {
    id: post.id,
    contentHash: post.contentHash,
    authorHandle: post.authorHandle,
    publishedAt: post.publishedAt,
    text: post.text,
    url: post.url,
    postType: post.postType,
    reason:
      reason ??
      classification?.summary ??
      '这条动态可能与额度有关，但没有明确宣布已经完成重置。',
    firstSeenAt: now.toISOString(),
  };
}

function trimRecord(record, limit, getTime) {
  return Object.fromEntries(
    Object.entries(record)
      .sort(([, left], [, right]) =>
        getTime(right).localeCompare(getTime(left)),
      )
      .slice(0, limit),
  );
}

export function planTiboMonitorRun({
  sourceReport,
  resetFeed,
  postsFeed,
  state = createEmptyMonitorState(),
  now = new Date(),
}) {
  validateMonitorState(state);
  validateTiboPostsFeed(postsFeed);
  invariant(Array.isArray(sourceReport?.posts), '采集结果缺少 posts');

  const nextState = structuredClone(state);
  const publicPostIds = new Set([
    ...postsFeed.posts.map((post) => String(post.id)),
    ...resetFeed.announcements.map((post) => String(post.id)),
  ]);
  const latestPublishedAt = postsFeed.posts.reduce(
    (latest, post) => (post.publishedAt > latest ? post.publishedAt : latest),
    '',
  );
  const cutoffTime = latestPublishedAt
    ? Date.parse(latestPublishedAt) - overlapWindowMs
    : Number.NEGATIVE_INFINITY;
  const publicActions = [];
  let ignoredBaselinePosts = 0;
  let unchangedPosts = 0;
  let editedPosts = 0;

  const chronologicalPosts = [...sourceReport.posts].sort((a, b) =>
    a.publishedAt.localeCompare(b.publishedAt),
  );

  for (const post of chronologicalPosts) {
    const previous = nextState.seen[post.id];
    const previousDecision = nextState.decisions[post.id];
    const alreadyPublic = publicPostIds.has(post.id);

    if (
      previousDecision?.contentHash === post.contentHash ||
      previous?.contentHash === post.contentHash ||
      (alreadyPublic && !previous)
    ) {
      unchangedPosts += 1;
    } else if (previous && previous.contentHash !== post.contentHash) {
      editedPosts += 1;
      nextState.pending[post.id] = makePendingItem(
        post,
        classifyResetPost(post.text),
        now,
        '这条已经处理过的帖子内容发生了变化，更新公开数据前需要重新确认。',
      );
    } else if (!alreadyPublic && Date.parse(post.publishedAt) < cutoffTime) {
      ignoredBaselinePosts += 1;
    } else if (!alreadyPublic) {
      const classification = classifyResetPost(post.text);
      if (classification?.requiresJudgment) {
        nextState.pending[post.id] = makePendingItem(post, classification, now);
      } else {
        publicActions.push({
          type: classification ? 'confirmed-reset' : 'general',
          post,
          classification,
          payload: decoratePost(post, classification),
        });
        publicPostIds.add(post.id);
      }
    }

    nextState.seen[post.id] = {
      contentHash: post.contentHash,
      publishedAt: post.publishedAt,
      lastSeenAt: now.toISOString(),
    };
  }

  nextState.seen = trimRecord(
    nextState.seen,
    maxRememberedPosts,
    (entry) => entry.publishedAt,
  );
  nextState.pending = trimRecord(
    nextState.pending,
    100,
    (entry) => entry.firstSeenAt,
  );
  nextState.updatedAt = now.toISOString();
  nextState.lastSuccessAt = now.toISOString();
  nextState.source = {
    provider: sourceReport.provider,
    coverageStatus: sourceReport.coverageStatus,
    pagesFetched: sourceReport.pagesFetched,
    parseFailures: sourceReport.parseFailures,
  };

  return {
    checkedPosts: sourceReport.posts.length,
    newPosts:
      publicActions.length +
      Object.keys(nextState.pending).filter((id) => !state.pending[id]).length,
    publicActions,
    pendingItems: Object.values(nextState.pending).sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt),
    ),
    ignoredBaselinePosts,
    unchangedPosts,
    editedPosts,
    nextState,
  };
}

export function applyTiboMonitorPlan(
  resetFeed,
  postsFeed,
  plan,
  now = new Date(),
) {
  let nextResetFeed = structuredClone(resetFeed);
  let nextPostsFeed = structuredClone(postsFeed);
  const ingestedPostIds = [];
  const resetPostIds = [];

  for (const action of plan.publicActions) {
    const recentResult = ingestRecentTiboPost(
      nextPostsFeed,
      action.payload,
      now,
    );
    if (recentResult.changed) {
      nextPostsFeed = recentResult.feed;
      ingestedPostIds.push(action.post.id);
    }

    if (action.type === 'confirmed-reset') {
      const resetResult = ingestTiboPost(nextResetFeed, action.payload, now);
      invariant(
        resetResult.changed,
        `明确重置帖子 ${action.post.id} 未能写入公告`,
      );
      nextResetFeed = resetResult.feed;
      resetPostIds.push(action.post.id);
    }
  }

  nextPostsFeed.verifiedAt = now.toISOString();
  validateTiboPostsFeed(nextPostsFeed);

  return {
    resetFeed: nextResetFeed,
    postsFeed: nextPostsFeed,
    ingestedPostIds,
    resetPostIds,
    contentChanged: ingestedPostIds.length > 0 || resetPostIds.length > 0,
    changed:
      ingestedPostIds.length > 0 ||
      resetPostIds.length > 0 ||
      nextPostsFeed.verifiedAt !== postsFeed.verifiedAt,
  };
}

function decisionCard(item) {
  return {
    question: '这条 Tibo 动态是否应该作为重置公告发布？',
    reason: `${item.reason} 原文：${summarize(item.text, 180)}`,
    options: [
      { id: 'A', label: '作为重置公告发布' },
      { id: 'B', label: '只作为普通动态发布' },
      { id: 'C', label: '暂不发布' },
    ],
    recommendation: 'C',
    recommendationReason: '没有完成式的明确公告时，误报会损害网站可信度。',
    safeDefault: '保持现状，不公开这条内容。',
    url: item.url,
  };
}

export function buildMonitorAudit({
  sourceReport,
  plan,
  applied,
  startedAt,
  finishedAt = new Date().toISOString(),
  error,
}) {
  if (error) {
    return {
      startedAt,
      finishedAt,
      status: 'error',
      checkedPosts: sourceReport?.posts?.length ?? 0,
      newPosts: 0,
      ingestedPostIds: [],
      summary: '本次巡检未更新网站，已保留上一版有效数据。',
      judgmentNeeded: [],
      error: {
        stage: error.stage ?? '巡检',
        message: error.message ?? String(error),
      },
    };
  }

  const judgmentNeeded = plan.pendingItems.slice(0, 10).map(decisionCard);
  const resetCount = applied.resetPostIds.length;
  const generalCount = applied.ingestedPostIds.length - resetCount;
  const status = judgmentNeeded.length
    ? 'attention'
    : applied.contentChanged
      ? 'updated'
      : 'ok';
  const summary = judgmentNeeded.length
    ? `发现 ${judgmentNeeded.length} 条待确认内容，未自动公开；本次已安全更新 ${applied.ingestedPostIds.length} 条动态。`
    : applied.contentChanged
      ? `已更新 ${generalCount} 条普通动态和 ${resetCount} 条明确重置公告。`
      : '没有发现需要更新的公开内容。';

  return {
    startedAt,
    finishedAt,
    status,
    checkedPosts: plan.checkedPosts,
    newPosts: plan.newPosts,
    ingestedPostIds: applied.ingestedPostIds,
    summary,
    judgmentNeeded,
  };
}
