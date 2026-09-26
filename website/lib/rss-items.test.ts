import test from 'node:test';
import assert from 'node:assert/strict';
import { rssItems } from './rss-items.ts';
test('更正使用独立稳定 GUID 和更正时间，不冒充已完成，不按每次采集重复发送', () => {
  const a = {
    id: '123',
    url: 'https://x.com/test/status/123',
    title: '等待完成确认',
    text: 'We will reset.',
    scope: '付费用户',
    publishedAt: '2026-01-01T00:00:00Z',
    kind: 'signal',
    revision: 1,
    revisedAt: '2026-01-01T02:00:00Z',
  };
  const items = rssItems([{ name: 'Codex', announcements: [a] }]);
  assert.equal(items.length, 2);
  assert.equal(items[0].guid, a.url + '#correction-1');
  assert.equal(items[0].date, a.revisedAt);
  assert.match(items[0].title, /更正/);
  assert.match(items[0].description, /不代表重置完成/);
  assert.deepEqual(rssItems([{ name: 'Codex', announcements: [a] }]), items);
});
