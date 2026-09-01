#!/usr/bin/env node
/**
 * Key art generator.
 *
 * Every imported game carries an `art` record from the hub — motif, hue, seed.
 * This turns that into a distinct 16:9 SVG poster per title: same seed, same
 * art, every build. SVG because these are geometric compositions, so each one
 * lands in 2-4 KB instead of the 30-60 KB a screenshot costs, and stays sharp
 * on a hi-dpi panel without a second asset.
 *
 *   node tools/gen-art.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const OUT = 'portal/thumbs';
mkdirSync(OUT, { recursive: true });
const W = 640, H = 360;

/** Seeded PRNG so a given game's art never shifts between builds. */
function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const hsl = (h, s, l, a = 1) => `hsl(${((h % 360) + 360) % 360} ${s}% ${l}%${a < 1 ? ` / ${a}` : ''})`;

function frame(art, body, defs = '') {
  const { hue, sat, dark, deep } = art;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${hsl(hue, sat + 8, dark + 30)}"/>
<stop offset="0.58" stop-color="${hsl(hue - 12, sat, deep + 16)}"/>
<stop offset="1" stop-color="${hsl(hue - 18, sat - 8, deep + 6)}"/>
</linearGradient>
${defs}
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
${body}
<rect width="${W}" height="${H}" fill="none"/>
</svg>
`;
}

/** Ridged mountain silhouettes receding into haze. */
function summit(art, r) {
  const { hue, sat, dark, deep } = art;
  let out = `<circle cx="${(140 + r() * 360).toFixed(0)}" cy="86" r="46" fill="${hsl(hue + 34, 78, 82, .3)}"/>`;
  for (let layer = 0; layer < 4; layer++) {
    const base = H - 26 - layer * 6;
    const amp = 96 - layer * 16;
    const light = deep + 10 + layer * 9;
    let d = `M0 ${H} L0 ${base - amp * 0.4}`;
    let x = 0;
    while (x < W) {
      const step = 60 + r() * 90;
      const peak = base - amp * (0.45 + r() * 0.55);
      d += ` L${(x + step / 2).toFixed(0)} ${peak.toFixed(0)} L${(x + step).toFixed(0)} ${(base - amp * 0.3).toFixed(0)}`;
      x += step;
    }
    out += `<path d="${d} L${W} ${H} Z" fill="${hsl(hue - layer * 4, sat - layer * 6, light)}"/>`;
  }
  return out;
}

/** Stacked voxel blocks in isometric projection. */
function prism(art, r) {
  const { hue, sat, dark } = art;
  const cx = W / 2, cy = H / 2 + 46, u = 34;
  const cells = [];
  for (let x = -3; x <= 3; x++) {
    for (let z = -3; z <= 3; z++) {
      const h = Math.max(1, Math.round(1 + r() * 3 - Math.hypot(x, z) * 0.4));
      cells.push([x, z, h]);
    }
  }
  cells.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
  let out = '';
  for (const [gx, gz, h] of cells) {
    for (let y = 0; y < h; y++) {
      const px = cx + (gx - gz) * u;
      const py = cy + (gx + gz) * u * 0.5 - y * u * 0.62;
      const l = dark + 26 + y * 7 + (gx + gz) * 1.6;
      out += `<g>
<path d="M${px} ${py - u * 0.62} l${u} ${u * 0.5} l${-u} ${u * 0.5} l${-u} ${-u * 0.5} Z" fill="${hsl(hue, sat, l + 12)}"/>
<path d="M${px - u} ${py - u * 0.12} l${u} ${u * 0.5} v${u * 0.62} l${-u} ${-u * 0.5} Z" fill="${hsl(hue, sat, l - 4)}"/>
<path d="M${px + u} ${py - u * 0.12} l${-u} ${u * 0.5} v${u * 0.62} l${u} ${-u * 0.5} Z" fill="${hsl(hue + 8, sat - 6, l + 3)}"/>
</g>`;
    }
  }
  return out;
}

/** Wireframe shards radiating from a bright core. */
function vector(art, r) {
  const { hue, sat } = art;
  const cx = W * 0.52, cy = H * 0.52;
  let out = `<circle cx="${cx}" cy="${cy}" r="130" fill="${hsl(hue, 70, 60, .1)}"/>`;
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const len = 60 + r() * 190;
    const spread = 0.06 + r() * 0.16;
    const p = (ang, d) => `${(cx + Math.cos(ang) * d).toFixed(0)} ${(cy + Math.sin(ang) * d * 0.72).toFixed(0)}`;
    out += `<path d="M${p(a, 18)} L${p(a - spread, len)} L${p(a + spread, len * 0.88)} Z"
      fill="${hsl(hue + r() * 40 - 20, sat + 14, 30 + r() * 28, .5)}"
      stroke="${hsl(hue + 20, 80, 68, .55)}" stroke-width="1"/>`;
  }
  out += `<circle cx="${cx}" cy="${cy}" r="15" fill="${hsl(hue + 30, 90, 76)}"/>`;
  return out;
}

/** A skyline with lit windows and a wet-street reflection. */
function metro(art, r) {
  const { hue, sat, dark, deep } = art;
  let out = `<circle cx="${W - 130}" cy="74" r="34" fill="${hsl(hue + 40, 70, 72, .22)}"/>`;
  const horizon = H * 0.74;
  for (let layer = 0; layer < 3; layer++) {
    let x = -20;
    while (x < W + 20) {
      const w = 26 + r() * 54;
      const h = (60 + r() * 150) * (1 - layer * 0.22);
      const top = horizon - h;
      const l = deep + 7 + layer * 9;
      out += `<rect x="${x.toFixed(0)}" y="${top.toFixed(0)}" width="${w.toFixed(0)}" height="${(h + 4).toFixed(0)}" fill="${hsl(hue - layer * 6, sat - layer * 10, l)}"/>`;
      if (layer === 2) {
        for (let wy = top + 10; wy < horizon - 8; wy += 13) {
          for (let wx = x + 5; wx < x + w - 6; wx += 10) {
            if (r() > 0.62) out += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="4" height="6" fill="${hsl(hue + 46, 92, 72, .85)}"/>`;
          }
        }
      }
      x += w + 3 + r() * 8;
    }
  }
  out += `<rect x="0" y="${horizon}" width="${W}" height="${H - horizon}" fill="${hsl(hue - 20, sat, deep - 1)}"/>`;
  for (let i = 0; i < 46; i++) {
    const rx = r() * W, ry = horizon + r() * (H - horizon);
    out += `<rect x="${rx.toFixed(0)}" y="${ry.toFixed(0)}" width="${(2 + r() * 16).toFixed(0)}" height="2" fill="${hsl(hue + 46, 90, 68, .18)}"/>`;
  }
  return out;
}

/** Perspective road under horizon glow. */
function neon(art, r) {
  const { hue, sat, dark, deep } = art;
  const horizon = H * 0.46;
  let out = `<rect x="0" y="${horizon}" width="${W}" height="${H - horizon}" fill="${hsl(hue - 30, sat, deep)}"/>
<circle cx="${W / 2}" cy="${horizon}" r="120" fill="${hsl(hue + 30, 90, 62, .28)}"/>`;
  for (let i = -10; i <= 10; i++) {
    const x = W / 2 + i * 30;
    out += `<path d="M${W / 2} ${horizon} L${(W / 2 + i * 150).toFixed(0)} ${H} " stroke="${hsl(hue + 20, 80, 60, .22)}" stroke-width="1.5" fill="none"/>`;
  }
  for (let i = 1; i < 9; i++) {
    const y = horizon + Math.pow(i / 9, 2.2) * (H - horizon);
    out += `<line x1="0" y1="${y.toFixed(0)}" x2="${W}" y2="${y.toFixed(0)}" stroke="${hsl(hue + 30, 85, 64, .2)}" stroke-width="${(i * 0.35).toFixed(1)}"/>`;
  }
  // A pair of tail lights receding up the road.
  out += `<rect x="${W / 2 - 34}" y="${horizon + 92}" width="26" height="9" rx="4" fill="${hsl(hue + 50, 95, 64)}"/>
<rect x="${W / 2 + 10}" y="${horizon + 92}" width="26" height="9" rx="4" fill="${hsl(hue + 50, 95, 64)}"/>`;
  for (let i = 0; i < 60; i++) {
    out += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * horizon).toFixed(0)}" r="${(r() * 1.3).toFixed(1)}" fill="${hsl(hue + 40, 60, 86, .5)}"/>`;
  }
  return out;
}

const MOTIFS = { summit, prism, vector, metro, neon };

const manifest = JSON.parse(readFileSync('games.json', 'utf8'));
let made = 0;
for (const g of manifest.games) {
  if (!g.art || !MOTIFS[g.art.motif]) continue;
  const r = rng(g.art.seed || 1);
  const svg = frame(g.art, MOTIFS[g.art.motif](g.art, r));
  writeFileSync(`${OUT}/${g.id}.svg`, svg);
  console.log(`${g.id.padEnd(16)} ${g.art.motif.padEnd(7)} hue ${String(g.art.hue).padStart(3)}  ${(svg.length / 1024).toFixed(1)} KB`);
  made++;
}
console.log(`\n${made} poster(s) written to ${OUT}/`);
