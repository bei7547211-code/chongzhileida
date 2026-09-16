import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSideHustleNotification } from './side-hustle-notification-core.mjs';

test('已发布通知只包含最终收录结果', () => {
  const payload = buildSideHustleNotification({
    status: 'published',
    title: '普通人的副业复盘',
    author: '作者甲',
    result: '三个月收入一万元',
    url: 'https://www.resetrelay.com/side-hustles/example',
  });

  assert.match(payload.content.text, /今日收录/);
  assert.match(payload.content.text, /普通人的副业复盘/);
  assert.doesNotMatch(payload.content.text, /步骤|运行日志|提示词/);
});

test('失败通知必须提供原因', () => {
  assert.throws(
    () => buildSideHustleNotification({ status: 'error' }),
    /缺少字段/,
  );
});
