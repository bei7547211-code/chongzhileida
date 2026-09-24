// Public announcements only. Product-specific scopes must survive every stage.
export const sources = {
  claude: { handles: ['claudeai', 'ClaudeDevs'], seeds: [] },
  grok: {
    handles: ['grok', 'bot'],
    seeds: [{ handle: 'bot', id: '2096303514230423629' }],
  },
};

export function classifyProviderPost(provider, post) {
  const allowed = sources[provider]?.handles.map((x) => x.toLowerCase()) ?? [];
  if (!allowed.includes(post.authorHandle.replace(/^@/, '').toLowerCase()))
    return null;
  const text = post.text.replace(/\s+/g, ' ').trim();
  if (!/reset/i.test(text)) return null;
  // Replies/quotes, negatives, questions, future promises and hypothetical statements require review.
  if (
    post.postType !== 'original' ||
    /\?|\b(not|never|haven't|hasn't|will|would|might|could|if|tomorrow|plan to)\b/i.test(
      text,
    )
  ) {
    return { status: 'review', kind: 'signal', scope: '范围待核验' };
  }
  if (
    provider === 'claude' &&
    /\bwe(?:'re|’re| are)? (?:also )?(?:providing|provided|give|gave|giving).{0,100}(?:limit )?reset/i.test(
      text,
    ) &&
    /save|anytime|whenever|choose/i.test(text)
  ) {
    return {
      status: 'confirmed',
      kind: 'banked',
      scope: /Pro.*Max.*Team/i.test(text)
        ? 'Pro、Max、Team 用户（以原帖及账户为准）'
        : '订阅用户（具体资格以原帖为准）',
    };
  }
  if (
    /^we(?:'ve|’ve| have) (?:just )?reset (?:the |all |both )?(?:usage |5.hour and weekly |rate )?limits\b/i.test(
      text,
    ) &&
    /all.*users/i.test(text)
  ) {
    return {
      status: 'confirmed',
      kind: 'full',
      scope:
        provider === 'grok'
          ? /Grok Bot/i.test(text)
            ? 'Grok Bot 用户，不代表 Grok Chat 或 Build'
            : '范围待核验'
          : '原帖所述 Claude 用户',
    };
  }
  return { status: 'review', kind: 'signal', scope: '范围待核验' };
}

export function mergeProviderPosts(provider, previous, incoming, checkedAt) {
  const announcements = new Map(previous.announcements.map((x) => [x.id, x]));
  const pending = new Map((previous.pending ?? []).map((x) => [x.id, x]));
  const newIds = [];
  for (const post of incoming) {
    const existing = announcements.get(post.id);
    if (existing) {
      if (existing.contentHash !== post.contentHash) {
        announcements.delete(post.id);
        pending.set(post.id, {
          ...post,
          reason: '已发布原帖内容发生变化，需要重新核验',
        });
      }
      continue;
    }
    const classification = classifyProviderPost(provider, post);
    if (!classification) continue;
    if (pending.has(post.id)) {
      if (pending.get(post.id).contentHash !== post.contentHash)
        pending.set(post.id, {
          ...post,
          reason: '待审原帖已编辑，需要重新核验',
        });
      continue;
    }
    if (
      classification.status === 'review' ||
      classification.scope === '范围待核验'
    ) {
      pending.set(post.id, { ...post, reason: '未满足明确重置及范围规则' });
      continue;
    }
    announcements.set(post.id, {
      ...post,
      kind: classification.kind,
      scope: classification.scope,
      verifiedAt: checkedAt,
      title: `${provider === 'claude' ? 'Claude' : 'Grok'} ${classification.kind === 'banked' ? '可自行使用的重置已公布' : '额度重置公告'}`,
    });
    newIds.push(post.id);
  }
  return {
    ...previous,
    checkedAt,
    lastAttemptAt: checkedAt,
    error: null,
    announcements: [...announcements.values()].sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt),
    ),
    posts: incoming.slice(0, 30),
    pending: [...pending.values()],
    newIds,
  };
}
