import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const websiteRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const repositoryRoot = resolve(websiteRoot, '..');
const promptRoot = resolve(repositoryRoot, 'ops/prompts');
const privateMarkers = [
  'PRIVATE_AUTOMATION_PROMPT',
  '精选副业内容运营执行器',
  '精选副业独立内容审查员',
  'side-hustle-curator.md',
  'side-hustle-reviewer.md',
];
const publicRoots = ['app', 'components', 'data', 'public'].map((directory) =>
  resolve(websiteRoot, directory),
);
if (process.argv.includes('--build')) {
  publicRoots.push(resolve(websiteRoot, '.next/static'));
  publicRoots.push(resolve(websiteRoot, '.next/server/app'));
}
const textExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.svg',
  '.ts',
  '.tsx',
  '.txt',
]);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const promptFiles = walk(promptRoot).filter((path) => path.endsWith('.md'));
if (promptFiles.length < 2) {
  throw new Error('私有自动化提示词不完整。');
}

const leaked = [];
for (const root of publicRoots) {
  for (const path of walk(root)) {
    if (!textExtensions.has(extname(path))) continue;
    const content = readFileSync(path, 'utf8');
    if (privateMarkers.some((marker) => content.includes(marker))) {
      leaked.push(path.slice(websiteRoot.length + 1));
    }
  }
}

if (leaked.length) {
  throw new Error(`内部提示词泄漏到前端: ${leaked.join(', ')}`);
}

console.log(`PRIVATE_PROMPTS_SAFE ${promptFiles.length}`);
