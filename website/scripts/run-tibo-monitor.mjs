import { execFileSync } from 'node:child_process';
import {
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deliverMonitorAudit } from './monitor-delivery.mjs';
import {
  applyTiboMonitorPlan,
  buildMonitorAudit,
  createEmptyMonitorState,
  planTiboMonitorRun,
  validateMonitorState,
} from './tibo-monitor-core.mjs';
import { fetchTiboTimeline } from './tibo-source-core.mjs';

const argumentsList = process.argv.slice(2);
const mode = argumentsList.includes('--publish')
  ? 'publish'
  : argumentsList.includes('--write')
    ? 'write'
    : 'dry-run';
const allowDirtyData =
  mode === 'write' && argumentsList.includes('--allow-dirty-data');
const pagesArgument = argumentsList.find((argument) =>
  argument.startsWith('--pages='),
);
const maxPages = pagesArgument ? Number(pagesArgument.split('=')[1]) : 3;
const websiteRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const repositoryRoot = resolve(websiteRoot, '..');
const resetFeedPath = resolve(websiteRoot, 'data/reset-feed.json');
const postsFeedPath = resolve(websiteRoot, 'data/tibo-posts.json');
const stateDirectory = process.env.RESET_RADAR_STATE_DIR
  ? resolve(process.env.RESET_RADAR_STATE_DIR)
  : resolve(homedir(), '.reset-radar');
const statePath = resolve(stateDirectory, 'tibo-monitor-state.json');
const lockPath = resolve(stateDirectory, 'tibo-monitor.lock');
const trackedDataPaths = [
  'website/data/reset-feed.json',
  'website/data/tibo-posts.json',
];

function run(command, args, cwd = repositoryRoot, options = {}) {
  const { capture = false, ...execOptions } = options;
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    ...execOptions,
  });
}

function runCaptured(command, args, cwd = repositoryRoot) {
  return run(command, args, cwd, { capture: true }).trim();
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readState() {
  try {
    const state = await readJson(statePath);
    validateMonitorState(state);
    return state;
  } catch (error) {
    if (error.code === 'ENOENT') return createEmptyMonitorState();
    throw error;
  }
}

async function atomicWriteJson(path, value, modeBits = 0o600) {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: 'utf8',
      mode: modeBits,
    });
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

async function acquireLock() {
  await mkdir(stateDirectory, { recursive: true, mode: 0o700 });
  try {
    const handle = await open(lockPath, 'wx', 0o600);
    await handle.writeFile(
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
      'utf8',
    );
    return handle;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const details = await stat(lockPath);
    if (Date.now() - details.mtimeMs <= 2 * 60 * 60 * 1000) {
      throw new Error('已有一次巡检正在运行，本次安全退出');
    }
    await rm(lockPath, { force: true });
    return acquireLock();
  }
}

function ensureDataFilesAreClean() {
  const status = runCaptured('git', [
    'status',
    '--porcelain',
    '--',
    ...trackedDataPaths,
  ]);
  if (status) {
    throw new Error('公告数据存在尚未处理的本地修改，已停止自动覆盖');
  }
}

function ensurePublishReady() {
  const trackedChanges = runCaptured('git', [
    'status',
    '--porcelain',
    '--untracked-files=no',
  ]);
  const untrackedWebsiteFiles = runCaptured('git', [
    'ls-files',
    '--others',
    '--exclude-standard',
    'website',
  ]);
  if (trackedChanges || untrackedWebsiteFiles) {
    throw new Error('网站代码存在尚未提交的修改，已停止自动发布');
  }
  const branch = runCaptured('git', ['branch', '--show-current']);
  if (branch !== 'main') throw new Error('自动发布只允许在 main 分支运行');
  run('git', ['fetch', '--quiet', 'origin', 'main']);
  const localHead = runCaptured('git', ['rev-parse', 'HEAD']);
  const remoteHead = runCaptured('git', ['rev-parse', 'origin/main']);
  if (localHead !== remoteHead) {
    throw new Error('本地 main 与 GitHub 不一致，请先人工同步后再运行');
  }
}

function verifyWebsite() {
  run('npm', ['run', 'validate:data'], websiteRoot);
  run('npm', ['test'], websiteRoot);
  run('npm', ['run', 'build'], websiteRoot);
}

function commitData() {
  run('git', ['diff', '--check', '--', ...trackedDataPaths]);
  run('git', ['add', '--', ...trackedDataPaths]);
  const stagedPaths = runCaptured('git', [
    'diff',
    '--cached',
    '--name-only',
    '--',
    ...trackedDataPaths,
  ]);
  if (!stagedPaths) return false;

  const dateLabel = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
  }).format(new Date());
  run('git', ['commit', '-m', `data: sync Tibo posts ${dateLabel}`]);
  return true;
}

function pushCommittedData() {
  run('git', ['push', 'origin', 'main']);
}

async function restoreData(originalResetFeed, originalPostsFeed) {
  await writeFile(resetFeedPath, originalResetFeed, 'utf8');
  await writeFile(postsFeedPath, originalPostsFeed, 'utf8');
}

async function main() {
  const startedAt = new Date().toISOString();
  let stage = '初始化';
  let sourceReport;
  let plan;
  let applied;
  let lockHandle;
  let originalResetFeed;
  let originalPostsFeed;
  let dataWritten = false;
  let committed = false;

  try {
    if (mode !== 'dry-run') lockHandle = await acquireLock();
    stage = '读取现有数据';
    originalResetFeed = await readFile(resetFeedPath, 'utf8');
    originalPostsFeed = await readFile(postsFeedPath, 'utf8');
    const resetFeed = JSON.parse(originalResetFeed);
    const postsFeed = JSON.parse(originalPostsFeed);
    const state = await readState();

    if (mode !== 'dry-run') {
      if (!allowDirtyData) ensureDataFilesAreClean();
      if (mode === 'publish') {
        stage = '发布前同步检查';
        ensurePublishReady();
      }
    }

    stage = '读取 Tibo 公开动态';
    sourceReport = await fetchTiboTimeline({ maxPages });
    const now = new Date();
    stage = '判断新内容';
    plan = planTiboMonitorRun({
      sourceReport,
      resetFeed,
      postsFeed,
      state,
      now,
    });
    applied = applyTiboMonitorPlan(resetFeed, postsFeed, plan, now);

    if (mode === 'dry-run') {
      const audit = buildMonitorAudit({
        sourceReport,
        plan,
        applied,
        startedAt,
      });
      const delivery = await deliverMonitorAudit(audit, { dryRun: true });
      console.log(delivery.text);
      console.log(
        `DRY_RUN_OK pages=${sourceReport.pagesFetched} self_posts=${sourceReport.posts.length} actions=${plan.publicActions.length} pending=${plan.pendingItems.length}`,
      );
      return;
    }

    stage = '写入候选数据';
    await atomicWriteJson(resetFeedPath, applied.resetFeed, 0o644);
    await atomicWriteJson(postsFeedPath, applied.postsFeed, 0o644);
    dataWritten = true;

    stage = '网站质量检查';
    verifyWebsite();

    stage = '保存巡检状态';
    await atomicWriteJson(statePath, plan.nextState);

    if (mode === 'publish') {
      stage = '创建数据提交';
      committed = commitData();
      if (committed) {
        stage = '推送 GitHub';
        pushCommittedData();
      }
    }

    stage = '发送飞书审查结果';
    const audit = buildMonitorAudit({
      sourceReport,
      plan,
      applied,
      startedAt,
    });
    const delivery = await deliverMonitorAudit(audit, { stateDirectory });
    console.log(delivery.text);
    console.log(
      delivery.sent
        ? 'MONITOR_OK FEISHU_SENT'
        : `MONITOR_OK FEISHU_NOT_CONFIGURED audit=${delivery.auditLogPath}`,
    );
  } catch (error) {
    if (dataWritten && !committed && originalResetFeed && originalPostsFeed) {
      await restoreData(originalResetFeed, originalPostsFeed).catch(() => {});
      if (mode === 'publish') {
        try {
          run('git', ['add', '--', ...trackedDataPaths]);
        } catch {
          // The error audit below remains the source of truth.
        }
      }
    }
    const wrappedError = {
      stage,
      message: error instanceof Error ? error.message : String(error),
    };
    const audit = buildMonitorAudit({
      sourceReport,
      plan,
      applied,
      startedAt,
      error: wrappedError,
    });
    try {
      const delivery = await deliverMonitorAudit(audit, {
        dryRun: mode === 'dry-run',
        stateDirectory,
      });
      console.error(delivery.text);
    } catch (deliveryError) {
      console.error(
        `审查通知也失败：${deliveryError instanceof Error ? deliveryError.message : String(deliveryError)}`,
      );
    }
    process.exitCode = 1;
  } finally {
    await lockHandle?.close().catch(() => {});
    if (lockHandle) await rm(lockPath, { force: true }).catch(() => {});
  }
}

await main();
