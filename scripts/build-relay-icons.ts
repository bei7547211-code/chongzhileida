// Render our own SVG mark into standard browser icon formats.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const dir = new URL('../industry/brand/', import.meta.url);
const svg = await readFile(new URL('relay-mark.svg', dir));
for (const [name, size] of [['icon.png', 512], ['icon-192.png', 192], ['apple-icon.png', 180]] as const) {
  await sharp(svg).resize(size, size).png().toFile(fileURLToPath(new URL(name, dir)));
}
const png = await sharp(svg).resize(32, 32).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
header[6] = 32; header[7] = 32;
header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18);
await writeFile(new URL('favicon.ico', dir), Buffer.concat([header, png]));
