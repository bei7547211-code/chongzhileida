const AUDIT_STATUSES = new Set(['ok', 'updated', 'attention', 'error']);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

export function validateMonitorAudit(audit) {
  invariant(audit && typeof audit === 'object', '审计报告必须是 JSON 对象');
  invariant(AUDIT_STATUSES.has(audit.status), '审计状态无效');
  invariant(Number.isFinite(Date.parse(audit.startedAt)), '开始时间无效');
  invariant(Number.isFinite(Date.parse(audit.finishedAt)), '结束时间无效');
  invariant(
    Date.parse(audit.finishedAt) >= Date.parse(audit.startedAt),
    '结束时间不能早于开始时间',
  );
  invariant(isNonNegativeInteger(audit.checkedPosts), '检查帖子数无效');
  invariant(isNonNegativeInteger(audit.newPosts), '新帖子数无效');
  invariant(
    Array.isArray(audit.ingestedPostIds) &&
      audit.ingestedPostIds.every((id) => /^\d{10,25}$/.test(String(id))),
    '入库帖子 ID 无效',
  );
  invariant(
    typeof audit.summary === 'string' && audit.summary.trim(),
    '审计摘要不能为空',
  );
  invariant(Array.isArray(audit.judgmentNeeded), 'judgmentNeeded 必须是数组');

  for (const item of audit.judgmentNeeded) {
    invariant(
      item && typeof item.question === 'string' && item.question.trim(),
      '待判断问题不能为空',
    );
    invariant(
      typeof item.reason === 'string' && item.reason.trim(),
      '待判断原因不能为空',
    );
    if (item.url !== undefined) {
      invariant(
        /^https:\/\/(x\.com|twitter\.com)\//.test(item.url),
        '判断链接无效',
      );
    }
  }

  if (audit.status === 'attention') {
    invariant(
      audit.judgmentNeeded.length > 0,
      'attention 状态必须说明需要判断什么',
    );
  }

  if (audit.status === 'error') {
    invariant(
      audit.error &&
        typeof audit.error.stage === 'string' &&
        audit.error.stage.trim() &&
        typeof audit.error.message === 'string' &&
        audit.error.message.trim(),
      'error 状态必须包含失败阶段和错误信息',
    );
  }

  return true;
}

function formatBeijingTime(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function renderMonitorAudit(audit) {
  validateMonitorAudit(audit);
  const statusMeta = {
    ok: ['✅', '巡检正常'],
    updated: ['🟢', '公告已更新'],
    attention: ['🟠', '需要你判断'],
    error: ['🔴', '运行失败'],
  }[audit.status];
  const lines = [
    `【重置雷达 · 每日审查】${statusMeta[0]} ${statusMeta[1]}`,
    `执行完成：${formatBeijingTime(audit.finishedAt)}（北京时间）`,
    `检查帖子：${audit.checkedPosts} 条；发现新帖：${audit.newPosts} 条；成功入库：${audit.ingestedPostIds.length} 条`,
    `结果：${audit.summary.trim()}`,
  ];

  if (audit.ingestedPostIds.length) {
    lines.push(`入库 ID：${audit.ingestedPostIds.join('、')}`);
  }

  if (audit.error) {
    lines.push(
      `异常：${audit.error.stage.trim()} — ${audit.error.message.trim()}`,
    );
  }

  if (audit.judgmentNeeded.length) {
    lines.push('需要你判断：');
    audit.judgmentNeeded.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.question.trim()}`);
      lines.push(
        `   原因：${item.reason.trim()}${item.url ? `\n   原帖：${item.url}` : ''}`,
      );
    });
  } else {
    lines.push('需要你判断：无');
  }

  return lines.join('\n');
}

export function buildFeishuPayload(audit) {
  return {
    msg_type: 'text',
    content: { text: renderMonitorAudit(audit) },
  };
}
