const RESET_KINDS = new Set(['full', 'banked', 'signal']);
const KIND_PRIORITY = { signal: 1, banked: 2, full: 3 };

export function toShanghaiDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  invariant(Number.isFinite(date.getTime()), '日期无效');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  invariant(year && month && day, '无法生成北京时间日期');
  return `${year}-${month}-${day}`;
}

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
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('推文 URL 无效');
  }

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

export function classifyResetPost(text) {
  const normalized = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return null;

  if (/\b(banked reset|reset cards?)\b/i.test(normalized)) {
    return {
      kind: 'banked',
      requiresJudgment: false,
      title: 'Tibo 发布重置卡公告',
      summary: '检测到 Tibo 发布与 banked reset 或重置卡相关的公开信号。',
    };
  }

  if (
    /\b(reset all|all reset|full reset|reset (?:has )?propagated|reset usage|usage (?:has been )?reset|reset for everyone|reset (?:usage )?for all|reset completed|completed the reset)\b/i.test(
      normalized,
    )
  ) {
    return {
      kind: 'full',
      requiresJudgment: false,
      title: 'Tibo 发布额度重置公告',
      summary: '检测到 Tibo 发布面向用户的 Codex 额度重置公告。',
    };
  }

  if (
    /\b(reset|usage|quota|rate limits?|message limits?)\b/i.test(normalized)
  ) {
    return {
      kind: 'signal',
      requiresJudgment: true,
      title: 'Tibo 发布重置相关信号',
      summary: '这条帖子提及重置、额度或用量，已收录为待观察信号。',
    };
  }

  return null;
}

export function validateResetFeed(feed) {
  invariant(feed && typeof feed === 'object', '数据源必须是 JSON 对象');
  invariant(feed.schemaVersion === 1, '不支持的数据版本');
  invariant(
    normalizeHandle(feed.source?.handle) === 'thsottiaux',
    '数据源必须是 @thsottiaux',
  );
  invariant(
    feed.monitor?.provider === 'mac-fxtwitter',
    '当前巡检来源必须是 mac-fxtwitter',
  );
  invariant(feed.monitor.enabled === true, '每日巡检必须处于启用状态');
  invariant(
    feed.monitor.scheduleLabel === '每天 11:00、15:00、21:00',
    '巡检时间必须标记为每天 11:00、15:00、21:00',
  );
  invariant(feed.monitor.reviewRequired === true, '含糊信息必须经过审查后发布');
  invariant(Array.isArray(feed.events), 'events 必须是数组');
  invariant(Array.isArray(feed.announcements), 'announcements 必须是数组');

  const eventKeys = new Set();
  for (const event of feed.events) {
    invariant(
      /^\d{4}-\d{2}-\d{2}$/.test(event.date),
      `无效日期: ${event.date}`,
    );
    invariant(RESET_KINDS.has(event.kind), `无效类型: ${event.kind}`);
    const eventKey = `${event.date}:${event.kind}`;
    invariant(!eventKeys.has(eventKey), `重复历史记录: ${eventKey}`);
    eventKeys.add(eventKey);
  }

  const postIds = new Set();
  for (const post of feed.announcements) {
    invariant(/^\d{10,25}$/.test(post.id), `无效推文 ID: ${post.id}`);
    invariant(!postIds.has(post.id), `重复推文 ID: ${post.id}`);
    postIds.add(post.id);
    invariant(
      Number.isFinite(Date.parse(post.publishedAt)),
      `无效发布时间: ${post.id}`,
    );
    invariant(RESET_KINDS.has(post.kind), `无效公告类型: ${post.id}`);
    invariant(
      typeof post.text === 'string' && post.text.trim(),
      `推文原文为空: ${post.id}`,
    );
    invariant(
      typeof post.title === 'string' && post.title.trim(),
      `公告标题为空: ${post.id}`,
    );
    invariant(
      typeof post.summary === 'string' && post.summary.trim(),
      `公告摘要为空: ${post.id}`,
    );
    if (post.screenshot !== undefined) {
      invariant(
        /^\/share\/[a-zA-Z0-9._-]+\.(?:png|jpe?g|webp)$/.test(post.screenshot),
        `原帖截图路径无效: ${post.id}`,
      );
    }
    validatePostUrl(post.url, post.id);
  }

  return true;
}

export function ingestTiboPost(feed, payload, now = new Date()) {
  validateResetFeed(feed);
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

  if (feed.announcements.some((post) => post.id === payload.id)) {
    return { changed: false, reason: 'duplicate', feed };
  }

  const classification = classifyResetPost(payload.text);
  if (!classification) return { changed: false, reason: 'irrelevant', feed };
  if (classification.requiresJudgment) {
    return {
      changed: false,
      reason: 'needs-judgment',
      classification,
      feed,
    };
  }

  const nextFeed = structuredClone(feed);
  const date = toShanghaiDateKey(payload.publishedAt);
  const existingEvent = nextFeed.events.find((event) => event.date === date);

  if (!existingEvent) {
    nextFeed.events.push({ date, kind: classification.kind });
  } else if (
    KIND_PRIORITY[classification.kind] > KIND_PRIORITY[existingEvent.kind]
  ) {
    existingEvent.kind = classification.kind;
  }

  nextFeed.announcements.push({
    id: String(payload.id),
    publishedAt: new Date(payload.publishedAt).toISOString(),
    kind: classification.kind,
    title: classification.title,
    text: payload.text.replace(/\s+/g, ' ').trim(),
    summary: classification.summary,
    url: payload.url,
  });
  nextFeed.events.sort((a, b) => b.date.localeCompare(a.date));
  nextFeed.announcements.sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
  nextFeed.updatedAt = now.toISOString();
  nextFeed.monitor = {
    ...nextFeed.monitor,
    enabled: true,
    lastIngestedPostId: String(payload.id),
  };

  validateResetFeed(nextFeed);
  return { changed: true, reason: classification.kind, feed: nextFeed };
}
