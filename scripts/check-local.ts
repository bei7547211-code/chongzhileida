import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import postgres from 'postgres';
const { password } = JSON.parse(readFileSync(new URL('../.data/local-preview/credentials.json', import.meta.url), 'utf8'));
const name = 'resetrelay_' + Date.now() + '_test';
const admin = postgres('postgres://postgres:' + password + '@127.0.0.1:55439/postgres');
await admin.unsafe('CREATE DATABASE ' + name);
// Provider tests use tests/setup.ts and local HTTP stubs with test-only credentials.
// Do not inherit any real provider credentials from the parent terminal.
const env = { PATH: process.env.PATH, HOME: process.env.HOME, DATABASE_URL: 'postgres://postgres:' + password + '@127.0.0.1:55439/' + name, COLLECT_ENABLED: 'false', MODEL_CALLS_ENABLED: 'true', FEISHU_CONTENT_PUSH_ENABLED: 'false', FEISHU_INTERNAL_ENABLED: 'false', INDEXNOW_SUBMIT_ENABLED: 'false' };
let failed = false;
try {
for (const args of [['scripts/migrate.ts'], ['--test', '--test-concurrency=1', '--test-timeout=120000', 'tests/*.test.ts'], ['--test', 'apps/web/tests/*.test.ts']]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.status !== 0) failed = true;
}
} finally {
  // Only the unique throwaway database created above, never the preview or old site.
  await admin.unsafe('DROP DATABASE ' + name + ' WITH (FORCE)');
  await admin.end();
}
process.exitCode = failed ? 1 : 0;
