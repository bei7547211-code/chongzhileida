import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchTiboTimeline,
  normalizeFxTimelineItem,
  parseFxTimelinePage,
} from './tibo-source-core.mjs';

function item({
  id,
  author = 'thsottiaux',
  text = 'A public update',
  createdAt = 'Fri Sep 18 08:00:00 +0000 2026',
  reply = false,
}) {
  return {
    id,
    text,
    created_at: createdAt,
    author: { screen_name: author },
    replying_to: reply ? { status: '2000000000000000000' } : null,
    media: {},
  };
}

test('只把 Tibo 本人内容标准化，过滤对话上下文', () => {
  const payload = {
    code: 200,
    results: [
      item({ id: '2100000000000000000', author: 'someoneelse' }),
      item({ id: '2100000000000000001', reply: true }),
    ],
    cursor: { bottom: 'next-page' },
  };
  const page = parseFxTimelinePage(payload);
  assert.equal(page.posts.length, 1);
  assert.equal(page.contextEntries, 1);
  assert.equal(page.posts[0].postType, 'reply');
  assert.equal(
    page.posts[0].url,
    'https://x.com/thsottiaux/status/2100000000000000001',
  );
  assert.match(page.posts[0].contentHash, /^[a-f0-9]{64}$/);
  assert.equal(page.nextCursor, 'next-page');
});

test('缺少正文但包含媒体的帖子仍可保留', () => {
  const post = normalizeFxTimelineItem({
    ...item({ id: '2100000000000000002', text: '' }),
    media: { all: [{ url: 'https://pbs.twimg.com/media/example.jpg' }] },
  });
  assert.equal(post.text, '');
  assert.deepEqual(post.mediaUrls, ['https://pbs.twimg.com/media/example.jpg']);
});

test('分页采集会去重并按时间倒序输出', async () => {
  const pages = [
    {
      code: 200,
      results: [
        item({
          id: '2100000000000000003',
          createdAt: 'Fri Sep 18 08:00:00 +0000 2026',
        }),
      ],
      cursor: { bottom: 'page-2' },
    },
    {
      code: 200,
      results: [
        item({
          id: '2100000000000000003',
          createdAt: 'Fri Sep 18 08:00:00 +0000 2026',
        }),
        item({
          id: '2100000000000000004',
          createdAt: 'Fri Sep 18 09:00:00 +0000 2026',
        }),
      ],
      cursor: { bottom: null },
    },
  ];
  let callCount = 0;
  const fetchImpl = async () => {
    const payload = pages[callCount];
    callCount += 1;
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json; charset=utf-8' },
      json: async () => payload,
    };
  };

  const report = await fetchTiboTimeline({ fetchImpl, maxPages: 3 });
  assert.equal(callCount, 2);
  assert.deepEqual(
    report.posts.map((post) => post.id),
    ['2100000000000000004', '2100000000000000003'],
  );
  assert.equal(report.coverageStatus, 'overlap_observed');
});

test('业务状态异常不会伪装成空结果', () => {
  assert.throws(
    () => parseFxTimelinePage({ code: 404, results: [] }),
    /数据源业务状态异常/,
  );
});
