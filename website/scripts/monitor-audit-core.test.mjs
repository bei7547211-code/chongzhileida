import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFeishuPayload,
  renderMonitorAudit,
  validateMonitorAudit,
} from './monitor-audit-core.mjs';

const baseAudit = {
  startedAt: '2026-09-16T02:59:00.000Z',
  finishedAt: '2026-09-16T03:01:00.000Z',
  status: 'ok',
  checkedPosts: 8,
  newPosts: 0,
  ingestedPostIds: [],
  summary: '未发现新的重置相关帖子。',
  judgmentNeeded: [],
};

test('正常巡检报告可以生成飞书文本', () => {
  assert.equal(validateMonitorAudit(baseAudit), true);
  const payload = buildFeishuPayload(baseAudit);
  assert.equal(payload.msg_type, 'text');
  assert.match(payload.content.text, /需要你判断：无/);
});

test('attention 必须给出明确判断题', () => {
  assert.throws(() =>
    validateMonitorAudit({ ...baseAudit, status: 'attention' }),
  );

  const report = renderMonitorAudit({
    ...baseAudit,
    status: 'attention',
    judgmentNeeded: [
      {
        question: '这条推文是否应视为重置公告？',
        reason: '提到了 quota，但没有明确说明已经重置。',
        options: [
          { id: 'A', label: '作为重置公告发布' },
          { id: 'B', label: '作为普通信号发布' },
          { id: 'C', label: '暂不发布' },
        ],
        recommendation: 'C',
        recommendationReason: '没有确认性动词，误报的影响大于漏报。',
        safeDefault: '保持现状，不发布。',
        url: 'https://x.com/thsottiaux/status/2100000000000000000',
      },
    ],
  });
  assert.match(report, /需要你判断/);
  assert.match(report, /是否应视为重置公告/);
  assert.match(report, /建议：C/);
  assert.match(report, /未回复：保持现状，不发布/);
});

test('判断题必须提供选项、建议和安全默认动作', () => {
  assert.throws(() =>
    validateMonitorAudit({
      ...baseAudit,
      status: 'attention',
      judgmentNeeded: [
        {
          question: '是否发布？',
          reason: '语义含糊。',
          options: [{ id: 'A', label: '发布' }],
          recommendation: 'A',
          recommendationReason: '测试。',
          safeDefault: '不发布。',
        },
      ],
    }),
  );
});

test('错误报告必须包含失败阶段和错误信息', () => {
  assert.throws(() => validateMonitorAudit({ ...baseAudit, status: 'error' }));
  assert.equal(
    validateMonitorAudit({
      ...baseAudit,
      status: 'error',
      summary: '本次巡检未完成。',
      error: { stage: 'X 登录', message: '会话已经过期。' },
    }),
    true,
  );
});
