import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ingestTiboPost } from './reset-feed-core.mjs';
import { ingestRecentTiboPost } from './tibo-posts-core.mjs';

const argumentsList = process.argv.slice(2);
const dryRun = argumentsList.includes('--dry-run');
const payloadPath = argumentsList.find((argument) => argument !== '--dry-run');
if (!payloadPath) {
  throw new Error('用法: npm run ingest:tibo -- /tmp/tibo-post.json');
}

const websiteRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const feedPath = resolve(websiteRoot, 'data/reset-feed.json');
const postsPath = resolve(websiteRoot, 'data/tibo-posts.json');
const payload = JSON.parse(await readFile(resolve(payloadPath), 'utf8'));
const feed = JSON.parse(await readFile(feedPath, 'utf8'));
const postsFeed = JSON.parse(await readFile(postsPath, 'utf8'));
const recentResult = ingestRecentTiboPost(postsFeed, payload);
const result = ingestTiboPost(feed, payload);

if (!result.changed) {
  const resetOutput = {
    duplicate: 'DUPLICATE',
    irrelevant: 'GENERAL',
    'needs-judgment': `NEEDS_JUDGMENT ${payload.id}`,
  }[result.reason];
  if (!dryRun && recentResult.changed) {
    await writeFile(
      postsPath,
      `${JSON.stringify(recentResult.feed, null, 2)}\n`,
      'utf8',
    );
  }
  console.log(
    recentResult.changed
      ? `${dryRun ? 'DRY_RUN ' : ''}TRACKED ${payload.id} AS ${resetOutput}`
      : resetOutput,
  );
  process.exit(0);
}

if (dryRun) {
  console.log(`DRY_RUN TRACKED ${payload.id} AND INGESTED AS ${result.reason}`);
  process.exit(0);
}

if (recentResult.changed) {
  await writeFile(
    postsPath,
    `${JSON.stringify(recentResult.feed, null, 2)}\n`,
    'utf8',
  );
}
await writeFile(feedPath, `${JSON.stringify(result.feed, null, 2)}\n`, 'utf8');
console.log(`TRACKED ${payload.id} AND INGESTED AS ${result.reason}`);
