// Isolated, loopback-only preview. No worker, external calls or global services.
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const dir = resolve(root, '.data/local-preview');
mkdirSync(dir, { recursive: true, mode: 0o700 });
const secretFile = resolve(dir, 'credentials.json');
if (!existsSync(secretFile)) writeFileSync(secretFile, JSON.stringify({ password: randomBytes(24).toString('hex'), session: randomBytes(32).toString('hex'), admin: randomBytes(24).toString('hex') }), { mode: 0o600, flag: 'wx' });
const secret = JSON.parse(readFileSync(secretFile, 'utf8'));
const db = new EmbeddedPostgres({ databaseDir: resolve(dir, 'postgres'), port: 55439, user: 'postgres', password: secret.password, persistent: true, createPostgresUser: false, authMethod: 'scram-sha-256', postgresFlags: ['-h', '127.0.0.1'], onLog: () => {}, onError: () => {} });
const children: ChildProcess[] = [];
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  await Promise.all(children.map(c => c.exitCode !== null ? Promise.resolve() : new Promise(resolve => c.once('exit', resolve))));
  await db.stop();
  process.exit(code);
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
const env = { ...process.env, DATABASE_URL: 'postgres://postgres:' + secret.password + '@127.0.0.1:55439/resetrelay',
  API_PORT: '3211', API_HOST: '127.0.0.1', API_BASE_URL: 'http://127.0.0.1:3211', WEB_PORT: '3210', WEB_HOST: '127.0.0.1', SITE_URL: 'http://localhost:3210',
  COLLECT_ENABLED: 'false', MODEL_CALLS_ENABLED: 'false', FEISHU_CONTENT_PUSH_ENABLED: 'false', FEISHU_INTERNAL_ENABLED: 'false', INDEXNOW_SUBMIT_ENABLED: 'false',
  SESSION_SECRET: secret.session, IMG_PROXY_SIGN_SECRET: secret.session, ADMIN_PASSWORD: secret.admin };
function run(args: string[], extra: Record<string, string> = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, env: { ...env, ...extra }, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error('Command failed: ' + args[0])));
  });
}
try {
  if (!existsSync(resolve(dir, 'postgres/PG_VERSION'))) await db.initialise();
  await db.start();
  const client = db.getPgClient('postgres', '127.0.0.1');
  await client.connect();
  for (const name of ['resetrelay', 'resetrelay_test']) {
    const result = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [name]);
    if (!result.rowCount) await client.query('CREATE DATABASE ' + name);
  }
  await client.end();
  await run(['scripts/migrate.ts']);
  if (process.argv[2]) await run(['scripts/import-reset-relay.ts', resolve(process.argv[2])]);
  for (const script of ['apps/api/src/main.ts', 'apps/web/server.ts']) {
    const child = spawn(process.execPath, [script], { cwd: root, env, stdio: 'inherit' });
    children.push(child);
    child.once('error', e => { console.error(e.message); void stop(1); });
    child.once('exit', code => { if (!stopping) { console.error(script + ' stopped'); void stop(code || 1); } });
  }
  console.log('Local preview: http://localhost:3210 — external collection, model calls and notifications disabled.');
} catch (error) { console.error(error instanceof Error ? error.message : error); await stop(1); }
