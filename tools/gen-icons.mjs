#!/usr/bin/env node
/**
 * Icon generator — draws the portal mark procedurally and writes PNGs with a
 * hand-rolled encoder, so the repo carries no binary blobs it cannot rebuild
 * and no image-processing dependency.
 *
 *   node tools/gen-icons.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'portal', 'icons');
mkdirSync(OUT, { recursive: true });

const BG = [255, 176, 32];
const FG = [26, 18, 6];

// --- tiny PNG encoder (RGBA8, no interlace) ------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;                       // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- signed distance fields ----------------------------------------------
const roundRect = (px, py, cx, cy, hw, hh, r) => {
  const dx = Math.max(Math.abs(px - cx) - (hw - r), 0);
  const dy = Math.max(Math.abs(py - cy) - (hh - r), 0);
  return Math.hypot(dx, dy) - r + Math.min(Math.max(Math.abs(px - cx) - (hw - r), Math.abs(py - cy) - (hh - r)), 0);
};
const circle = (px, py, cx, cy, r) => Math.hypot(px - cx, py - cy) - r;
const box = (px, py, cx, cy, hw, hh) => Math.max(Math.abs(px - cx) - hw, Math.abs(py - cy) - hh);

/**
 * The bolt, as the exact polygon from the shell's logo, on a 32-unit grid.
 * A point-in-polygon test beats an SDF approximation here: the mark has sharp
 * corners and a notch, and an approximated bolt reads as two loose slabs.
 */
const BOLT = [
  [17.6, 4], [8, 17.4], [13.4, 17.4], [11.8, 28], [22, 14.2], [16.4, 14.2],
];

function inPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Coverage at a pixel, supersampled 3x3 so the diagonals stay clean. */
function coverage(x, y, size) {
  const u = 32 / size;
  let hits = 0;
  for (let sy = 0; sy < 3; sy++) {
    for (let sx = 0; sx < 3; sx++) {
      if (inPolygon((x + (sx + 0.5) / 3) * u, (y + (sy + 0.5) / 3) * u, BOLT)) hits++;
    }
  }
  return hits / 9;
}

function render(size) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cov = coverage(x, y, size);
      const i = (y * size + x) * 4;
      rgba[i]     = Math.round(BG[0] + (FG[0] - BG[0]) * cov);
      rgba[i + 1] = Math.round(BG[1] + (FG[1] - BG[1]) * cov);
      rgba[i + 2] = Math.round(BG[2] + (FG[2] - BG[2]) * cov);
      rgba[i + 3] = 255;
    }
  }
  return encodePng(size, size, rgba);
}

for (const size of [192, 512]) {
  writeFileSync(join(OUT, `icon-${size}.png`), render(size));
  console.log(`portal/icons/icon-${size}.png`);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <rect width="24" height="24" rx="5" fill="#0d1117"/>
  <rect x="1.5" y="5.5" width="21" height="13" rx="4" fill="none" stroke="#58d0a0" stroke-width="1.7"/>
  <path d="M6 12h4M8 10v4" stroke="#58d0a0" stroke-width="1.7" stroke-linecap="round"/>
  <circle cx="15.6" cy="10.6" r="1.35" fill="#58d0a0"/>
  <circle cx="18.1" cy="13.1" r="1.35" fill="#58d0a0"/>
</svg>
`;
writeFileSync(join(OUT, 'icon.svg'), svg);
console.log('portal/icons/icon.svg');
