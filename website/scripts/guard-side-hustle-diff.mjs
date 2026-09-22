import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const topicId = process.argv[2];
if (!/^\d{10,25}$/.test(String(topicId ?? ''))) {
  throw new Error('用法: npm run guard:side-hustles -- <topic_id>');
}

const repositoryRoot = resolve(
  fileURLToPath(new URL('../..', import.meta.url)),
);
const staged = execFileSync('git', ['diff', '--cached', '--name-only'], {
  cwd: repositoryRoot,
  encoding: 'utf8',
});
const changedPaths = staged
  .split('\n')
  .filter(Boolean)
  .map((line) => line.trim());
const allowed = new Set([
  'website/data/side-hustles.json',
  'website/data/side-hustle-skip.json',
  `website/public/side-hustles/${topicId}_avatar.jpg`,
  `website/public/side-hustles/${topicId}_cover.webp`,
]);
const unexpected = changedPaths.filter((path) => !allowed.has(path));
if (unexpected.length) {
  throw new Error(
    `精选副业自动发布不允许在暂存区夹带这些文件：${unexpected.join(', ')}`,
  );
}
if (!changedPaths.includes('website/data/side-hustles.json')) {
  throw new Error('暂存区缺少 side-hustles.json 数据变更');
}

console.log(`SAFE_SIDE_HUSTLE_RELEASE ${topicId}`);
