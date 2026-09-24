// Explicit review step for ambiguous statements; never approves in a scheduled run.
import { readFile, writeFile, rename, open, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { normalizeFxTimelineItem } from './tibo-source-core.mjs';
import { sources } from './provider-monitor-core.mjs';
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const i = a.indexOf('=');
      return [a.slice(2, i), a.slice(i + 1)];
    }),
);
const dir = resolve(
  process.env.RESET_RADAR_STATE_DIR || resolve(homedir(), '.reset-radar'),
);
await mkdir(dir, { recursive: true, mode: 0o700 });
const lockPath = resolve(dir, 'provider-monitor.lock');
const lock = await open(lockPath, 'wx', 0o600);
try {
  const statePath = resolve(dir, 'provider-review.json');
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  if (!args.provider) {
    console.log(JSON.stringify(state, null, 2));
  } else {
    if (!sources[args.provider] || !['approve', 'reject'].includes(args.action))
      throw new Error(
        '需要 --provider=claude|grok --id=... --action=approve|reject',
      );
    const item = state[args.provider]?.find((p) => p.id === args.id);
    if (!item) throw new Error('待审队列没有此原帖');
    if (!args.reason?.trim()) throw new Error('必须提供核验原因 --reason');
    const path = fileURLToPath(
      new URL('../data/provider-feeds.json', import.meta.url),
    );
    const feed = JSON.parse(await readFile(path, 'utf8'));
    if (args.action === 'approve') {
      if (!['full', 'banked'].includes(args.kind) || !args.scope?.trim())
        throw new Error('确认需明确 --kind=full|banked 及 --scope');
      const handle = item.authorHandle.replace('@', '');
      const response = await fetch(
        `https://api.fxtwitter.com/${handle}/status/${item.id}`,
        { signal: AbortSignal.timeout(15000) },
      );
      if (!response.ok) throw new Error('无法重新核验原帖');
      const payload = await response.json();
      if (payload.code !== 200) throw new Error('原帖不可用');
      const current = normalizeFxTimelineItem(payload.tweet, handle);
      // Single-post responses sometimes omit reply/quote metadata. Compare the actual
      // author, date, text and media; retain the stricter timeline post type and hash.
      if (
        !current ||
        ['id', 'authorHandle', 'publishedAt', 'text'].some(
          (k) => current[k] !== item[k],
        ) ||
        JSON.stringify(current.mediaUrls) !== JSON.stringify(item.mediaUrls)
      )
        throw new Error('原帖已变化，请重新采集后审核');
      const p = feed[args.provider];
      p.announcements = p.announcements.filter((a) => a.id !== item.id);
      const {
        reason: _reason,
        decision: _decision,
        reviewReason: _reviewReason,
        reviewedAt: _reviewedAt,
        ...publicPost
      } = item;
      p.announcements.push({
        ...publicPost,
        kind: args.kind,
        scope: args.scope,
        verifiedAt: new Date().toISOString(),
        title: `${args.provider === 'claude' ? 'Claude' : 'Grok'} ${args.kind === 'banked' ? '可自行使用的重置已公布' : '额度重置公告'}`,
      });
      p.announcements.sort((a, b) =>
        b.publishedAt.localeCompare(a.publishedAt),
      );
      await writeFile(
        path + '.review.tmp',
        JSON.stringify(feed, null, 2) + '\n',
      );
      await rename(path + '.review.tmp', path);
    }
    // Keep reviewed rejection in private queue to prevent reappearance on every run.
    state[args.provider] = state[args.provider].map((p) =>
      p.id === item.id
        ? {
            ...p,
            decision: args.action,
            reviewedAt: new Date().toISOString(),
            reviewReason: args.reason,
          }
        : p,
    );
    await writeFile(statePath + '.tmp', JSON.stringify(state, null, 2) + '\n', {
      mode: 0o600,
    });
    await rename(statePath + '.tmp', statePath);
    console.log(
      `${args.provider} ${item.id}: ${args.action}，已记录人工核验依据；尚未发布。`,
    );
  }
} finally {
  await lock.close();
  await rm(lockPath, { force: true });
}
