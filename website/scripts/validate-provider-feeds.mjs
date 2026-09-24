import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { sources } from './provider-monitor-core.mjs';
const feed = JSON.parse(
  await readFile(
    new URL('../data/provider-feeds.json', import.meta.url),
    'utf8',
  ),
);
assert.equal(feed.schemaVersion, 1);
for (const [id, config] of Object.entries(sources)) {
  const p = feed[id];
  assert(p);
  assert(!('pending' in p));
  for (const key of ['checkedAt', 'lastAttemptAt'])
    assert(
      p[key] === null || Number.isFinite(Date.parse(p[key])),
      `${id} invalid ${key}`,
    );
  for (const collection of ['posts', 'announcements']) {
    assert(Array.isArray(p[collection]));
    const ids = new Set();
    for (const item of p[collection]) {
      assert(/^\d{10,25}$/.test(item.id));
      assert(!ids.has(item.id));
      ids.add(item.id);
      const author = item.authorHandle.replace(/^@/, '').toLowerCase();
      assert(config.handles.map((x) => x.toLowerCase()).includes(author));
      assert.equal(item.url, `https://x.com/${author}/status/${item.id}`);
      assert(Number.isFinite(Date.parse(item.publishedAt)));
      assert(item.text.trim());
      assert(!('reason' in item));
      assert(!('reviewReason' in item));
      assert(!('decision' in item));
      if (collection === 'announcements') {
        assert(['full', 'banked'].includes(item.kind));
        assert(item.scope.trim() && item.scope !== '范围待核验');
        assert(item.title.trim());
        assert(Number.isFinite(Date.parse(item.verifiedAt)));
        if (id === 'grok' && /Grok Bot/i.test(item.text))
          assert(item.scope.includes('Grok Bot'));
      }
    }
  }
}
console.log(
  'PROVIDER_FEEDS_VALID claude/grok sources, scopes, dates, ids, privacy',
);
