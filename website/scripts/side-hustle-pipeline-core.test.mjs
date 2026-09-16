import assert from 'node:assert/strict';
import test from 'node:test';
import { rankUnseenCandidates } from './side-hustle-pipeline-core.mjs';

function item(id, likes, favorites, publishedAt = 1) {
  return {
    topicDTO: {
      entityId: id,
      entityType: 'xq_topic',
      showTitle: `案例 ${id}`,
      likeCount: likes,
      favoriteCount: favorites,
      gmtCreate: publishedAt,
      isDigested: 1,
    },
    topicUserDTO: { name: '作者' },
    detailUrl: `https://scys.com/articleDetail/xq_topic/${id}`,
  };
}

test('按点赞加收藏总分排序，并稳定处理同分项', () => {
  const ranked = rankUnseenCandidates([
    item('10000000001', 30, 20, 3),
    item('10000000002', 40, 20, 1),
    item('10000000003', 35, 25, 2),
  ]);

  assert.deepEqual(
    ranked.map((candidate) => candidate.topicId),
    ['10000000002', '10000000003', '10000000001'],
  );
});

test('去掉已经收录和已经跳过的帖子', () => {
  const ranked = rankUnseenCandidates(
    [item('10000000001', 30, 20), item('10000000002', 40, 20)],
    ['10000000002'],
    ['10000000001'],
  );

  assert.equal(ranked.length, 0);
});
