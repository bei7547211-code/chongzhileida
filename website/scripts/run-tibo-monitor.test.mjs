import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const monitorSource = await readFile(
  new URL('./run-tibo-monitor.mjs', import.meta.url),
  'utf8',
);

test('自动发布会提交并在失败时恢复公开快照', () => {
  assert.match(
    monitorSource,
    /'website\/data\/public-snapshot\.json'/,
    '公开快照必须进入自动发布的提交清单',
  );
  assert.match(
    monitorSource,
    /writeFile\(publicSnapshotPath, originalPublicSnapshot, 'utf8'\)/,
    '发布失败时必须恢复构建前的公开快照',
  );
});
