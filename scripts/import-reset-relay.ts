import { readFileSync } from 'node:fs';
import { publishPublicSnapshot } from '@aihot/backend/publication/reset-public';
import { closeDb } from '@aihot/backend/db';

const file = process.argv[2];
if (!file) throw new Error('Usage: node scripts/import-reset-relay.ts /absolute/path/public-snapshot.json');
try {
  const snapshot = await publishPublicSnapshot(JSON.parse(readFileSync(file, 'utf8')));
  console.log(`Imported public snapshot: ${snapshot.events.length} events, ${snapshot.articles.length} articles; coverage ${snapshot.generatedAt}`);
} finally { await closeDb(); }
