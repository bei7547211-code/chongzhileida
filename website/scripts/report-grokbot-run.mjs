import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import {
  buildFeishuPayload,
  validateMonitorAudit,
} from './monitor-audit-core.mjs';

const argumentsList = process.argv.slice(2);
const dryRun = argumentsList.includes('--dry-run');
const payloadPath = argumentsList.find((argument) => argument !== '--dry-run');

if (!payloadPath) {
  throw new Error(
    '用法: npm run audit:grokbot -- /tmp/grokbot-audit.json [--dry-run]',
  );
}

const audit = JSON.parse(await readFile(resolve(payloadPath), 'utf8'));
validateMonitorAudit(audit);
const message = buildFeishuPayload(audit);

if (dryRun) {
  console.log(message.content.text);
  console.log('DRY_RUN AUDIT_VALID');
  process.exit(0);
}

const auditDirectory = resolve(homedir(), '.reset-radar');
const auditLogPath = resolve(auditDirectory, 'grokbot-audit.jsonl');
await mkdir(dirname(auditLogPath), { recursive: true });
await appendFile(auditLogPath, `${JSON.stringify(audit)}\n`, 'utf8');

let webhookUrl = process.env.FEISHU_WEBHOOK_URL?.trim();
if (!webhookUrl) {
  try {
    webhookUrl = (
      await readFile(resolve(auditDirectory, 'feishu-webhook-url'), 'utf8')
    ).trim();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

if (!webhookUrl) {
  console.log(`AUDIT_SAVED ${auditLogPath} FEISHU_NOT_CONFIGURED`);
  process.exit(0);
}

const parsedWebhook = new URL(webhookUrl);
if (
  parsedWebhook.protocol !== 'https:' ||
  !['open.feishu.cn', 'open.larksuite.com'].includes(parsedWebhook.hostname) ||
  !parsedWebhook.pathname.startsWith('/open-apis/bot/v2/hook/')
) {
  throw new Error('飞书 Webhook 地址无效');
}

const response = await fetch(webhookUrl, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(message),
  signal: AbortSignal.timeout(10_000),
});
const responseBody = await response.json().catch(() => ({}));
const responseCode = responseBody.code ?? responseBody.StatusCode;

if (!response.ok || responseCode !== 0) {
  throw new Error(`飞书审计发送失败（HTTP ${response.status}）`);
}

console.log(`AUDIT_SAVED ${auditLogPath} FEISHU_SENT`);
