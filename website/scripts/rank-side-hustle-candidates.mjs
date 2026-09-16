import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rankUnseenCandidates } from './side-hustle-pipeline-core.mjs';

const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error('用法: npm run rank:side-hustles -- /tmp/scys-digest.json');
}

const websiteRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const [input, feed, skipped] = await Promise.all([
  readFile(resolve(inputPath), 'utf8').then(JSON.parse),
  readFile(resolve(websiteRoot, 'data/side-hustles.json'), 'utf8').then(
    JSON.parse,
  ),
  readFile(resolve(websiteRoot, 'data/side-hustle-skip.json'), 'utf8').then(
    JSON.parse,
  ),
]);

const skippedIds = (skipped.items ?? skipped.posts ?? skipped).map((item) =>
  String(item.topic_id ?? item.topicId ?? item),
);
const ranked = rankUnseenCandidates(
  input.items ?? input,
  feed.posts.map((post) => post.topic_id),
  skippedIds,
);

console.log(
  JSON.stringify({ count: ranked.length, candidates: ranked }, null, 2),
);
