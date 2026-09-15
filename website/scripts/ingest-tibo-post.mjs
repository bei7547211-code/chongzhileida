import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ingestTiboPost } from './reset-feed-core.mjs';

const argumentsList = process.argv.slice(2);
const dryRun = argumentsList.includes('--dry-run');
const payloadPath = argumentsList.find((argument) => argument !== '--dry-run');
if (!payloadPath) {
  throw new Error('用法: npm run ingest:tibo -- /tmp/tibo-post.json');
}

const websiteRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const feedPath = resolve(websiteRoot, 'data/reset-feed.json');
const payload = JSON.parse(await readFile(resolve(payloadPath), 'utf8'));
const feed = JSON.parse(await readFile(feedPath, 'utf8'));
const result = ingestTiboPost(feed, payload);

if (!result.changed) {
  const output = {
    duplicate: 'DUPLICATE',
    irrelevant: 'IRRELEVANT',
    'needs-judgment': `NEEDS_JUDGMENT ${payload.id}`,
  }[result.reason];
  console.log(output);
  process.exit(0);
}

if (dryRun) {
  console.log(`DRY_RUN INGESTED ${payload.id} AS ${result.reason}`);
  process.exit(0);
}

await writeFile(feedPath, `${JSON.stringify(result.feed, null, 2)}\n`, 'utf8');
console.log(`INGESTED ${payload.id} AS ${result.reason}`);
