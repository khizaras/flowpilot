import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));
const outDir = join(rootDir, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

function crc32(buffer) {
  if (!crc32.table) {
    crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crc32.table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) crc = (crc >>> 8) ^ crc32.table[(crc ^ buffer[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function encodeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // color type: RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0; // filter type: none
    offset += 1;
    pixels.copy(raw, offset, y * size * 4, (y + 1) * size * 4);
    offset += size * 4;
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    encodeChunk('IHDR', ihdr),
    encodeChunk('IDAT', deflateSync(raw)),
    encodeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function isInsideRoundedRect(x, y, w, h, r) {
  const cx = Math.min(Math.max(x, r), w - r);
  const cy = Math.min(Math.max(y, r), h - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function isInsideTriangle(x, y, triangle) {
  const [a, b, c] = triangle;
  const sign1 = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
  const sign2 = (c[0] - b[0]) * (y - b[1]) - (c[1] - b[1]) * (x - b[0]);
  const sign3 = (a[0] - c[0]) * (y - c[1]) - (a[1] - c[1]) * (x - c[0]);
  const hasNegative = sign1 < 0 || sign2 < 0 || sign3 < 0;
  const hasPositive = sign1 > 0 || sign2 > 0 || sign3 > 0;
  return !(hasNegative && hasPositive);
}

function createIcon(size) {
  const backgroundColor = [59, 130, 246, 255];
  const foregroundColor = [255, 255, 255, 255];
  const radius = Math.round(size * 0.16);
  const triangle = [
    [0.36 * size, 0.26 * size],
    [0.74 * size, 0.5 * size],
    [0.36 * size, 0.74 * size],
  ];
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const insideRounded = isInsideRoundedRect(x + 0.5, y + 0.5, size, size, radius);
      const insideTriangle = isInsideTriangle(x + 0.5, y + 0.5, triangle);
      const color = insideRounded && !insideTriangle ? backgroundColor : foregroundColor;
      pixels.set(color, offset);
    }
  }

  return encodePng(size, pixels);
}

for (const size of [16, 48, 128]) {
  writeFileSync(join(outDir, `icon${size}.png`), createIcon(size));
  console.log(`Generated public/icons/icon${size}.png`);
}
