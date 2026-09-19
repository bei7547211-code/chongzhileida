import { execFileSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { validateFeishuWebhookUrl } from './monitor-delivery.mjs';

const stateDirectory = resolve(homedir(), '.reset-radar');
const webhookPath = resolve(stateDirectory, 'feishu-webhook-url');

if (process.argv.includes('--remove')) {
  await rm(webhookPath, { force: true });
  console.log('FEISHU_WEBHOOK_REMOVED');
  process.exit(0);
}

const clipboardValue = execFileSync('/usr/bin/pbpaste', [], {
  encoding: 'utf8',
}).trim();
if (!clipboardValue) {
  throw new Error('剪贴板为空，请先复制飞书机器人 Webhook 地址');
}
const webhookUrl = validateFeishuWebhookUrl(clipboardValue);
await mkdir(stateDirectory, { recursive: true, mode: 0o700 });
await writeFile(webhookPath, `${webhookUrl}\n`, {
  encoding: 'utf8',
  mode: 0o600,
});
console.log('FEISHU_WEBHOOK_CONFIGURED');
