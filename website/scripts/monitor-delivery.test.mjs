import assert from 'node:assert/strict';
import test from 'node:test';
import { validateFeishuWebhookUrl } from './monitor-delivery.mjs';

test('只接受飞书官方机器人 Webhook', () => {
  assert.equal(
    validateFeishuWebhookUrl(
      'https://open.feishu.cn/open-apis/bot/v2/hook/example-token',
    ),
    'https://open.feishu.cn/open-apis/bot/v2/hook/example-token',
  );
  assert.throws(
    () => validateFeishuWebhookUrl('https://example.com/webhook'),
    /Webhook 地址无效/,
  );
});
