import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import {
  buildFeishuPayload,
  validateMonitorAudit,
} from './monitor-audit-core.mjs';

export function validateFeishuWebhookUrl(value) {
  const parsed = new URL(value);
  if (
    parsed.protocol !== 'https:' ||
    !['open.feishu.cn', 'open.larksuite.com'].includes(parsed.hostname) ||
    !parsed.pathname.startsWith('/open-apis/bot/v2/hook/')
  ) {
    throw new Error('飞书 Webhook 地址无效');
  }
  return parsed.toString();
}

async function readWebhookUrl(stateDirectory) {
  const environmentValue = process.env.FEISHU_WEBHOOK_URL?.trim();
  if (environmentValue) return validateFeishuWebhookUrl(environmentValue);
  try {
    const fileValue = (
      await readFile(resolve(stateDirectory, 'feishu-webhook-url'), 'utf8')
    ).trim();
    return fileValue ? validateFeishuWebhookUrl(fileValue) : null;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function deliverMonitorAudit(
  audit,
  {
    dryRun = false,
    fetchImpl = globalThis.fetch,
    stateDirectory = resolve(homedir(), '.reset-radar'),
  } = {},
) {
  validateMonitorAudit(audit);
  const message = buildFeishuPayload(audit);
  if (dryRun) {
    return {
      saved: false,
      sent: false,
      configured: false,
      text: message.content.text,
    };
  }

  await mkdir(stateDirectory, { recursive: true, mode: 0o700 });
  const auditLogPath = resolve(stateDirectory, 'tibo-monitor-audit.jsonl');
  await appendFile(auditLogPath, `${JSON.stringify(audit)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });

  const webhookUrl = await readWebhookUrl(stateDirectory);
  if (!webhookUrl) {
    return {
      saved: true,
      sent: false,
      configured: false,
      auditLogPath,
      text: message.content.text,
    };
  }

  const response = await fetchImpl(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(10_000),
  });
  const responseBody = await response.json().catch(() => ({}));
  const responseCode = responseBody.code ?? responseBody.StatusCode;
  if (!response.ok || responseCode !== 0) {
    throw new Error(`飞书审查通知发送失败（HTTP ${response.status}）`);
  }

  return {
    saved: true,
    sent: true,
    configured: true,
    auditLogPath,
    text: message.content.text,
  };
}
