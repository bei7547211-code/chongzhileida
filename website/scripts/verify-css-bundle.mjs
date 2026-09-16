import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const candidateBuildDirectories = [
  path.resolve('.next'),
  path.resolve('.vercel/output'),
];
const requiredSelectors = [
  '.hero-probability',
  '.tibo-post-card',
  '.hustle-feed-card',
];

async function collectCssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectCssFiles(entryPath);
      return entry.isFile() && entry.name.endsWith('.css') ? [entryPath] : [];
    }),
  );
  return files.flat();
}

const availableBuildDirectories = [];

for (const directory of candidateBuildDirectories) {
  try {
    await access(directory);
    availableBuildDirectories.push(directory);
  } catch {
    // The local Next.js build does not create Vercel's output directory.
  }
}

const cssFiles = [
  ...new Set(
    (
      await Promise.all(
        availableBuildDirectories.map((directory) =>
          collectCssFiles(directory),
        ),
      )
    ).flat(),
  ),
];

if (cssFiles.length === 0) {
  throw new Error('CSS_BUNDLE_MISSING: .next 中没有找到 CSS 产物');
}

const cssBundle = (
  await Promise.all(cssFiles.map((file) => readFile(file, 'utf8')))
).join('\n');

const missingSelectors = requiredSelectors.filter(
  (selector) => !cssBundle.includes(selector),
);

if (missingSelectors.length > 0) {
  throw new Error(
    `CSS_BUNDLE_INCOMPLETE: 生产包缺少 ${missingSelectors.join(', ')}`,
  );
}

console.log(
  `CSS_BUNDLE_VALID ${cssFiles.length} files / ${requiredSelectors.length} critical selectors / ${availableBuildDirectories.length} build roots`,
);
