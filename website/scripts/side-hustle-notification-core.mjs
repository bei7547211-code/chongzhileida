function required(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`飞书通知缺少字段：${field}`);
  }
  return value.trim();
}

export function buildSideHustleNotification(run) {
  if (run.status === 'published') {
    const title = required(run.title, 'title');
    const author = required(run.author, 'author');
    const result = required(run.result, 'result');
    const url = required(run.url, 'url');
    return {
      msg_type: 'text',
      content: {
        text: `【精选副业 · 今日收录】\n《${title}》\n作者：${author}\n成绩：${result}\n详情：${url}`,
      },
    };
  }

  const reason = required(run.reason, 'reason');
  const label = {
    skipped: '今日无合格案例',
    decision: '需要你判断',
    error: '运行失败',
  }[run.status];
  if (!label) throw new Error(`未知通知状态：${run.status}`);

  return {
    msg_type: 'text',
    content: { text: `【精选副业 · ${label}】\n${reason}` },
  };
}
