function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

export function normalizeCandidate(item) {
  const topic = item?.topicDTO ?? {};
  return {
    topicId: String(topic.entityId ?? topic.topicId ?? ''),
    entityType: String(topic.entityType ?? ''),
    title: String(topic.showTitle ?? '').trim(),
    likes: numberOrZero(topic.likeCount),
    favorites: numberOrZero(topic.favoriteCount),
    publishedAt: numberOrZero(topic.gmtCreate),
    isDigested: Number(topic.isDigested) === 1,
    detailUrl: String(item?.detailUrl ?? ''),
    author: String(item?.topicUserDTO?.name ?? '').trim(),
    engagementScore:
      numberOrZero(topic.likeCount) + numberOrZero(topic.favoriteCount),
  };
}

export function rankUnseenCandidates(
  items,
  collectedIds = [],
  skippedIds = [],
) {
  const excluded = new Set(
    [...collectedIds, ...skippedIds].map((value) => String(value)),
  );

  return items
    .map(normalizeCandidate)
    .filter(
      (candidate) =>
        candidate.topicId &&
        candidate.entityType === 'xq_topic' &&
        candidate.isDigested &&
        !excluded.has(candidate.topicId),
    )
    .sort(
      (a, b) =>
        b.engagementScore - a.engagementScore ||
        b.likes - a.likes ||
        b.favorites - a.favorites ||
        b.publishedAt - a.publishedAt ||
        b.topicId.localeCompare(a.topicId),
    );
}
