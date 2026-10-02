import './setup.ts';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { sql, closeDb } from '@aihot/backend/db';
import { buildApp } from '../apps/api/src/app.ts';
const app = await buildApp();
after(async () => { await app.close(); await closeDb(); });
test('the reset read endpoint fails visibly before import, then serves the stored public projection', async () => {
  const before = await app.inject('/api/site/reset-relay');
  assert.equal(before.statusCode, 503);
  assert.equal(before.headers['cache-control'], 'no-store');
  const payload = { mode: 'snapshot', generatedAt: '2026-09-28T13:00:00.000Z', events: [], articles: [] };
  await sql`INSERT INTO reset_relay_snapshot (id, payload) VALUES (1, ${sql.json(payload)})`;
  const afterImport = await app.inject('/api/site/reset-relay');
  assert.equal(afterImport.statusCode, 200);
  assert.deepEqual(afterImport.json(), payload);
  assert.equal(afterImport.headers['cache-control'], 'no-store');
  assert.equal((await app.inject({ method: 'POST', url: '/api/site/reset-relay', payload: { events: [] } })).statusCode, 404);
});
