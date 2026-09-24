import { readFile, writeFile, rename, mkdir, open, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fetchTiboTimeline,
  normalizeFxTimelineItem,
} from './tibo-source-core.mjs';
import { sources, mergeProviderPosts } from './provider-monitor-core.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const dataPath = resolve(root, 'data/provider-feeds.json');
const stateDir = resolve(
  process.env.RESET_RADAR_STATE_DIR || resolve(homedir(), '.reset-radar'),
);
const write = process.argv.includes('--write');
const startedAt = new Date().toISOString();
const report = {
  checkedPosts: 0,
  newIds: [],
  pending: [],
  summaries: [],
  errors: [],
};
const lockPath = resolve(stateDir, 'provider-monitor.lock');
await mkdir(stateDir, { recursive: true, mode: 0o700 });
const lock = await open(lockPath, 'wx', 0o600).catch(() => {
  throw new Error('三平台采集正在运行；请检查 provider-monitor.lock');
});
try {
  const feed = JSON.parse(await readFile(dataPath, 'utf8'));
  let state = {};
  try {
    state = JSON.parse(
      await readFile(resolve(stateDir, 'provider-review.json'), 'utf8'),
    );
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  for (const [provider, config] of Object.entries(sources)) {
    const now = new Date().toISOString();
    try {
      const timelines = await Promise.all(
        config.handles.map((handle) =>
          fetchTiboTimeline({ handle, maxPages: 2 }),
        ),
      );
      if (timelines.some((t) => t.parseFailures > 0 || !t.posts.length))
        throw new Error('来源为空或解析不完整，保留上次成功数据');
      const posts = timelines.flatMap((t) => t.posts);
      // Explicit source-linked backfill, not a made-up historical timeline.
      for (const seed of config.seeds) {
        const response = await fetch(
          `https://api.fxtwitter.com/${seed.handle}/status/${seed.id}`,
          { signal: AbortSignal.timeout(15000) },
        );
        if (!response.ok) throw new Error(`历史原帖 HTTP ${response.status}`);
        const payload = await response.json();
        if (payload.code !== 200) throw new Error('历史原帖核验失败');
        const post = normalizeFxTimelineItem(payload.tweet, seed.handle);
        if (!post) throw new Error('原帖作者不匹配');
        posts.push(post);
      }
      const unique = [...new Map(posts.map((p) => [p.id, p])).values()].sort(
        (a, b) => b.publishedAt.localeCompare(a.publishedAt),
      );
      const result = mergeProviderPosts(
        provider,
        { ...feed[provider], pending: state[provider] ?? [] },
        unique,
        now,
      );
      const { pending, newIds, ...safeFeed } = result;
      state[provider] = pending;
      feed[provider] = {
        ...safeFeed,
        coverage: '近期官方时间线＋已核验历史原帖；不代表全部历史',
      };
      const awaiting = pending.filter((p) => !p.decision);
      report.checkedPosts += unique.length;
      report.newIds.push(...newIds);
      report.pending.push(...awaiting.map((p) => ({ ...p, provider })));
      report.summaries.push(
        `${provider}: ${unique.length} 条公开动态，${newIds.length} 条新确认，${awaiting.length} 条待审`,
      );
      console.log(report.summaries.at(-1));
    } catch (e) {
      feed[provider] = {
        ...feed[provider],
        lastAttemptAt: now,
        error: '本次公开数据采集失败，保留上次核验记录',
      };
      console.error(`${provider}: ${e.message}`);
      report.errors.push(provider);
    }
  }
  if (write) {
    const tmp = `${dataPath}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(feed, null, 2) + '\n');
    await rename(tmp, dataPath);
    const reviewPath = resolve(stateDir, 'provider-review.json');
    const tempReview = `${reviewPath}.${process.pid}.tmp`;
    await writeFile(tempReview, JSON.stringify(state, null, 2) + '\n', {
      mode: 0o600,
    });
    await rename(tempReview, reviewPath);
    await writeFile(
      resolve(stateDir, 'provider-last-run.json'),
      JSON.stringify(
        { ...report, startedAt, finishedAt: new Date().toISOString() },
        null,
        2,
      ) + '\n',
      { mode: 0o600 },
    );
  }
  if (report.errors.length && !process.argv.includes('--allow-partial'))
    process.exitCode = 1;
} finally {
  await lock.close();
  await rm(lockPath, { force: true });
}
