import { writeFileSync } from 'node:fs';
import { publicPlatforms } from '../data/public-platforms.ts';
import { sideHustles } from '../data/side-hustles.ts';
import removed from '../data/public-removals.json' with { type: 'json' };
import { buildPublicSnapshot } from '../lib/public-snapshot.ts';
const snapshot = buildPublicSnapshot({ platforms: publicPlatforms, articles: sideHustles, removed }, { generatedAt: new Date().toISOString(), releaseId: process.env.VERCEL_GIT_COMMIT_SHA || process.env.CF_PAGES_COMMIT_SHA });
const json = JSON.stringify(snapshot, null, 2) + '\n';
if (process.argv.includes('--write')) writeFileSync(new URL('../data/public-snapshot.json', import.meta.url), json);
else process.stdout.write(json);
