import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildSideHustleNotification } from './side-hustle-notification-core.mjs';

const argumentsList = process.argv.slice(2);
const dryRun = argumentsList.includes('--dry-run');
const payloadPath = argumentsList.find((argument) => argument !== '--dry-run');
if (!payloadPath) {
  throw new Error(
    '用法: npm run notify:side-hustles -- /tmp/result.json [--dry-run]',
  );
}

const run = JSON.parse(await readFile(resolve(payloadPath), 'utf8'));
const message = buildSideHustleNotification(run);

if (dryRun) {
  console.log(JSON.stringify(message, null, 2));
  process.exit(0);
}

const webhook = process.env.FEISHU_WEBHOOK_URL;
if (!webhook) throw new Error('未配置 FEISHU_WEBHOOK_URL');

const response = await fetch(webhook, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(message),
});
if (!response.ok) {
  throw new Error(`飞书通知失败（HTTP ${response.status}）`);
}
console.log('FEISHU_SIDE_HUSTLE_NOTIFIED');
