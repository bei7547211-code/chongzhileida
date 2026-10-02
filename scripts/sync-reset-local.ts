// Explicit one-shot local MVP bridge, not a scheduler or production deployment.
import { readFileSync } from 'node:fs';
const { password } = JSON.parse(readFileSync(new URL('../.data/local-preview/credentials.json', import.meta.url), 'utf8'));
process.env.DATABASE_URL = 'postgres://postgres:' + password + '@127.0.0.1:55439/resetrelay';
const { publishPublicSnapshot } = await import('../packages/backend/src/publication/reset-public.ts');
const { closeDb } = await import('../packages/backend/src/db.ts');
try {
  const response = await fetch('https://www.resetrelay.com/api/public/v1/snapshot', {
    redirect: 'error', signal: AbortSignal.timeout(10000), headers: { 'Cache-Control': 'no-cache' },
  });
  if (!response.ok || !response.body) throw new Error('Public source unavailable; existing data unchanged');
  let size = 0; const chunks: Uint8Array[] = [];
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 1000000) throw new Error('Snapshot too large; existing data unchanged');
    chunks.push(chunk);
  }
  const snapshot = await publishPublicSnapshot(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  console.log(JSON.stringify({ ok: true, target: 'local preview only', revision: snapshot.revision,
    sourceGeneratedAt: snapshot.generatedAt, counts: snapshot.counts }));
} finally { await closeDb(); }
