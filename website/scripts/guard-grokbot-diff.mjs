import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(
  fileURLToPath(new URL('../..', import.meta.url)),
);
const status = execFileSync('git', ['status', '--porcelain'], {
  cwd: repositoryRoot,
  encoding: 'utf8',
});
const changedPaths = status
  .split('\n')
  .filter(Boolean)
  .map((line) => line.slice(3).trim());
const allowed = new Set([
  'website/data/reset-feed.json',
  'website/data/tibo-posts.json',
  'data/reset-feed.json',
  'data/tibo-posts.json',
]);
const unexpected = changedPaths.filter((path) => !allowed.has(path));

if (unexpected.length) {
  throw new Error(`GrokBot 不允许修改这些文件: ${unexpected.join(', ')}`);
}

console.log(
  `SAFE ${changedPaths.length ? changedPaths.join(', ') : 'NO_CHANGES'}`,
);
