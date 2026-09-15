import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateResetFeed } from './reset-feed-core.mjs';

const websiteRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const feed = JSON.parse(
  await readFile(resolve(websiteRoot, 'data/reset-feed.json'), 'utf8'),
);

validateResetFeed(feed);
console.log(
  `VALID ${feed.announcements.length} announcements / ${feed.events.length} events`,
);
