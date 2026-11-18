import test from 'node:test'; // 使用Node内置测试，测试资格只存在内存。
import assert from 'node:assert/strict'; // 断言公开投影与审核校验的结果。
import { projectResetNotification, type ResetNotification } from './reset-notification.ts'; // 直接检查真实四字段人工契约。
import { buildPublicSnapshot } from './public-snapshot.ts'; // 验证契约能经过网站公开快照投影。
import { publicPlatforms } from '../data/public-platforms.ts'; // 读取公开公告，仅克隆后构造隔离场景。
import resetFeed from '../data/reset-feed.json' with { type: 'json' }; // 读取真实源结构，不覆盖文件或给历史补资格。
import postsFeed from '../data/tibo-posts.json' with { type: 'json' }; // 原帖子结构用于既有内容变动隔离回归。
import { validateResetFeed } from '../scripts/reset-feed-core.mjs'; // 真实公告校验必须接受合法契约并拒绝错填。
import { applyTiboMonitorPlan } from '../scripts/tibo-monitor-core.mjs'; // 校验原帖变动后确实撤销通知资格。
const source = { provider: 'codex', id: 'codex-999000111222333444', sourceUrl: 'https://x.com/thsottiaux/status/999000111222333444', publishedAt: '2026-10-24T00:00:00.000Z' }; // 固定虚构来源，只用于本地内存校验。
const notification: ResetNotification = { stage: 'reset_confirmed', confirmedAt: '2026-10-24T00:01:00.000Z', reviewedAt: '2026-10-24T00:02:00.000Z', evidenceSourceUrls: [source.sourceUrl, 'https://x.com/thsottiaux/status/999000111222333445'] }; // 测试契约明确区分完成、审核和上下文证据。
const isolatedPost = { id: source.id.slice(6), publishedAt: source.publishedAt, kind: 'full' as const, title: '隔离测试：官方完成公告', text: 'Done and dusted', summary: '隔离测试确认', scope: '范围见详情', url: source.sourceUrl }; // 使用固定虚构公告，避免未来真实feed更新使测试时间失效。
function fixturePlatforms() { const platforms = structuredClone(publicPlatforms);platforms[0].announcements = [{ ...isolatedPost, verifiedAt: source.publishedAt }];return platforms; } // 只替换内存里的Codex公告，真实历史和其他工作区数据完全不变。
test('absent manual contract never acquires notification eligibility from a full classification', () => { // 页面已有full不能自动变成新的通知资格。
  assert.equal(projectResetNotification(undefined, source), undefined); // 未填写时保持缺失。
  const platforms = fixturePlatforms();for (const platform of platforms) for (const post of platform.announcements) delete post.notification;const snapshot = buildPublicSnapshot({ platforms, articles: [] }, { generatedAt: '2026-10-24T00:03:00.000Z' }); // 清除隔离输入资格，再验证full不会自动获得它。
  assert(snapshot.events.every(event => !Object.hasOwn(event, 'notification'))); // 无明确资格的输入不会被投影回填今天的确认时间。
}); // 完成默认历史兼容回归。
test('public projection preserves only explicit official evidence and stable real confirmation times', () => { // 人工四字段要完整通过真实公开投影。
  const platforms = fixturePlatforms(), post = platforms[0].announcements[0]; // 使用固定隔离公告，保证测试不修改真实源。
  post.notification = { ...notification, evidenceSourceUrls: [post.url] }; // 只给隔离副本添加明确人工资格。
  const snapshot = buildPublicSnapshot({ platforms, articles: [] }, { generatedAt: '2026-10-25T00:00:00.000Z' }), event = snapshot.events.find(item => item.id === 'codex-' + post.id)!; // 构建时间改变也不能改变事件完成时间。
  assert.deepEqual(event.notification, post.notification);assert.notEqual(event.notification, post.notification);assert.equal(event.notification?.confirmedAt, notification.confirmedAt); // 保留内容但复制对象，避免外部引用修改快照。
  const previous = snapshot.revision;post.notification.reviewedAt = '2026-10-24T00:03:00.000Z';assert.notEqual(buildPublicSnapshot({ platforms, articles: [] }, { generatedAt: snapshot.generatedAt }).revision, previous); // 审核或证据变化必须进入公开内容版本，供后台停旧队列。
}); // 完成端到端投影和内容版本回归。
test('malformed, nonofficial, cross-event and wrongly ordered contracts block projection', () => { // 人工错填必须在发布前暴露，不能默默回退成已确认。
  for (const value of [null, {}, { ...notification, stage: 'reset_announced' }, { ...notification, confirmedAt: '2026-10-24' }, { ...notification, confirmedAt: '2026-10-23T23:59:59Z' }, { ...notification, reviewedAt: '2026-10-24T00:00:00Z' }, { ...notification, evidenceSourceUrls: [] }, { ...notification, evidenceSourceUrls: ['https://x.com/other/status/1'] }, { ...notification, evidenceSourceUrls: [notification.evidenceSourceUrls[1]] }, { ...notification, privateReviewer: 'private' }]) assert.throws(() => projectResetNotification(value, source), /Invalid notification/); // 检查字段、阶段、明确UTC、时间顺序、来源绑定和隐私白名单。
  assert.throws(() => projectResetNotification(notification, { ...source, provider: 'claude' }), /Invalid notification/);assert.throws(() => projectResetNotification(notification, { ...source, id: 'codex-2' }), /Invalid notification/);assert.throws(() => projectResetNotification(notification, { ...source, revisedAt: '2026-10-24T00:03:00Z' }), /Invalid notification/); // 不能把资格移给其他平台、编号或审核之后发生的修订。
}); // 完成严格契约校验回归。
test('snapshot generation cannot predate the manual review it publishes', () => { // 构建元数据不得提前于正在公开的审核事实。
  const platforms = fixturePlatforms(), post = platforms[0].announcements[0];post.notification = { ...notification, evidenceSourceUrls: [post.url] };assert.throws(() => buildPublicSnapshot({ platforms, articles: [] }, { generatedAt: '2026-10-24T00:01:00.000Z' }), /review must precede/); // 明确阻挡不可能的审核与构建时间顺序。
}); // 完成审核与公开生成顺序回归。
test('pending and withdrawn events do not expose an otherwise valid manual contract', () => { // 原资格不能穿过网站既有待审和撤回闸门。
  const platforms = fixturePlatforms(), post = platforms[0].announcements[0];post.notification = { ...notification, evidenceSourceUrls: [post.url] };post.reviewPending = true; // 给隔离公告设置待审状态。
  assert.equal(buildPublicSnapshot({ platforms, articles: [] }, { generatedAt: notification.reviewedAt }).events.some(event => event.id === 'codex-' + post.id), false); // 待审公告连同通知契约一起隐藏。
  post.reviewPending = false;assert.equal(buildPublicSnapshot({ platforms, articles: [], removed: [{ type: 'event', id: 'codex-' + post.id, reason: '隔离测试撤回', withdrawnAt: notification.reviewedAt }] }, { generatedAt: notification.reviewedAt }).events.some(event => event.id === 'codex-' + post.id), false); // 正式撤回也不会留下可发送的资格孤儿。
}); // 完成公开过滤与通知资格一致性回归。
test('source validator accepts manual confirmation and content quarantine removes it', () => { // 真源校验和既有原帖修改处理必须形成闭环。
  const feed = { ...structuredClone(resetFeed), events: [{ date: '2026-10-24', kind: 'full' }], announcements: [{ ...isolatedPost } as typeof isolatedPost & { notification?: ResetNotification; reviewPending?: boolean }] }, post = feed.announcements[0]; // 用固定虚构公告构造完整内存真源，不依赖今日真实公告时间。
  post.notification = { ...notification, evidenceSourceUrls: [post.url] };assert.equal(validateResetFeed(feed), true); // 合法人工字段可以保留在原有公告真源。
  const result = applyTiboMonitorPlan(feed, structuredClone(postsFeed), { quarantines: [{ id: post.id, text: '隔离测试：原帖已经变化' }], publicActions: [] }, new Date('2026-10-24T00:03:00Z')); // 只调用纯内存隔离逻辑，不运行采集、发布或真实通知。
  assert.equal(result.resetFeed.announcements[0].notification, undefined);assert.equal(result.resetFeed.announcements[0].reviewPending, true);assert.equal(validateResetFeed(result.resetFeed), true); // 旧人工资格撤销后进入待审，不能沿用旧确认继续通知。
}); // 完成源记录与修订撤销资格回归。
test('invalid calendar dates never normalize into another confirmation or review day', () => { // 日期输入必须真存在，不能靠解析器滚动改变人工记录。
  const calendarSource = { ...source, publishedAt: '2026-02-28T00:00:00Z' }, base = { ...notification, confirmedAt: '2026-02-28T00:01:00Z', reviewedAt: '2026-03-02T00:02:00Z' };for (const invalid of ['2026-02-30T00:01:00Z', '2026-02-29T00:01:00Z', '2026-02-28T24:00:00Z']) { assert.throws(() => projectResetNotification({ ...base, confirmedAt: invalid }, calendarSource), /Invalid notification/);assert.throws(() => projectResetNotification({ ...base, reviewedAt: invalid }, calendarSource), /Invalid notification/); } // 完成和审核字段同时覆盖不存在日期与24点滚动。
}); // 完成日期归一化缺陷回归。
test('valid leap day supports absent and one to three millisecond digits', () => { // 最小修复不得破坏此前合法的时间精度。
  const leapSource = { ...source, publishedAt: '2024-02-28T00:00:00Z' };for (const fraction of ['', '.1', '.12', '.123']) { const n = { ...notification, confirmedAt: '2024-02-29T00:01:00' + fraction + 'Z', reviewedAt: '2024-02-29T00:02:00' + fraction + 'Z' }, projected = projectResetNotification(n, leapSource)!;assert.equal(Date.parse(projected.confirmedAt), Date.parse(n.confirmedAt));assert.equal(Date.parse(projected.reviewedAt), Date.parse(n.reviewedAt)); } // 合法闰日规范成ISO显示时只补齐毫秒位数，不改变真实时刻。
}); // 完成闰日和毫秒兼容回归。
