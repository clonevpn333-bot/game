#!/usr/bin/env node
/**
 * Key art. One hand-drawn illustration per game — no shared motif function,
 * no seeded noise. Each piece is composed for its own title: Bonecrown gets a
 * crowned skull, Neon Bay gets a wet city at night, Lumen gets a prism.
 *
 * SVG so they stay a few kilobytes and hold up on a hi-dpi panel.
 *
 *   node tools/gen-art.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = 'portal/thumbs';
mkdirSync(OUT, { recursive: true });
const W = 640, H = 360;

const svg = (defs, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
<defs>${defs}</defs>
${body}
</svg>
`;

/** Deterministic jitter, so a piece composes the same way every build. */
function prng(seed) {
  let s = (seed * 1103515245 + 12345) >>> 0;
  return () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
}

const art = {};

// ---------------------------------------------------------------- Bonecrown
// A skull under a jagged crown, lit from behind in a bone hall.
art['bonecrown'] = () => {
  const r = prng(7);
  let bones = '';
  for (let i = 0; i < 14; i++) {
    const x = 30 + r() * 580, y = 250 + r() * 90, w = 26 + r() * 40, a = -30 + r() * 60;
    bones += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${a.toFixed(0)})" opacity="${(0.16 + r() * 0.2).toFixed(2)}">
<rect x="0" y="0" width="${w.toFixed(0)}" height="5" rx="2.5" fill="#E8DCC8"/>
<circle cx="0" cy="2.5" r="4.4" fill="#E8DCC8"/><circle cx="${w.toFixed(0)}" cy="2.5" r="4.4" fill="#E8DCC8"/></g>`;
  }
  let arches = '';
  for (let i = 0; i < 5; i++) {
    const s = 1 - i * 0.13, cx = 320, w = 250 * s, h = 250 * s;
    arches += `<path d="M${cx - w / 2} ${300} L${cx - w / 2} ${300 - h * 0.45}
      Q${cx} ${300 - h * 1.05} ${cx + w / 2} ${300 - h * 0.45} L${cx + w / 2} 300"
      fill="none" stroke="#2A1220" stroke-width="${(9 * s).toFixed(1)}" opacity="${(0.9 - i * 0.14).toFixed(2)}"/>`;
  }
  return svg(
    `<radialGradient id="bcGlow" cx="50%" cy="62%" r="62%">
      <stop offset="0" stop-color="#FF2D6F" stop-opacity=".85"/>
      <stop offset="0.45" stop-color="#8A1039" stop-opacity=".45"/>
      <stop offset="1" stop-color="#12060C" stop-opacity="0"/></radialGradient>
     <linearGradient id="bcSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#150710"/><stop offset="1" stop-color="#2A0C1B"/></linearGradient>
     <linearGradient id="bcBone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FBF3E2"/><stop offset="0.62" stop-color="#DCCDB2"/>
      <stop offset="1" stop-color="#A48F73"/></linearGradient>
     <linearGradient id="bcGold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFD873"/><stop offset="0.55" stop-color="#E0A32B"/>
      <stop offset="1" stop-color="#8A5A0E"/></linearGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#bcSky)"/>
<rect width="${W}" height="${H}" fill="url(#bcGlow)"/>
${arches}
${bones}
<g transform="translate(320 196)">
  <ellipse cx="0" cy="86" rx="104" ry="16" fill="#0C0409" opacity=".65"/>
  <!-- cranium -->
  <path d="M-72 6 C-72 -62 -40 -96 0 -96 C40 -96 72 -62 72 6 C72 36 60 52 42 60
           L38 86 C38 94 30 98 20 98 L-20 98 C-30 98 -38 94 -38 86 L-42 60
           C-60 52 -72 36 -72 6 Z" fill="url(#bcBone)"/>
  <!-- eye sockets -->
  <path d="M-52 -6 C-52 -30 -34 -40 -22 -34 C-12 -29 -12 -6 -22 2 C-34 11 -52 8 -52 -6 Z" fill="#160810"/>
  <path d="M52 -6 C52 -30 34 -40 22 -34 C12 -29 12 -6 22 2 C34 11 52 8 52 -6 Z" fill="#160810"/>
  <circle cx="-32" cy="-12" r="7" fill="#FF3D77"/><circle cx="32" cy="-12" r="7" fill="#FF3D77"/>
  <circle cx="-32" cy="-12" r="14" fill="#FF3D77" opacity=".28"/><circle cx="32" cy="-12" r="14" fill="#FF3D77" opacity=".28"/>
  <!-- nose + teeth -->
  <path d="M0 6 L-11 30 L0 34 L11 30 Z" fill="#160810"/>
  <g fill="#160810">
    <rect x="-30" y="58" width="9" height="17" rx="2"/><rect x="-16" y="58" width="9" height="20" rx="2"/>
    <rect x="-2" y="58" width="9" height="21" rx="2"/><rect x="12" y="58" width="9" height="20" rx="2"/>
    <rect x="24" y="58" width="9" height="16" rx="2"/>
  </g>
  <!-- crown -->
  <path d="M-84 -84 L-84 -120 L-58 -96 L-30 -140 L0 -104 L30 -140 L58 -96 L84 -120 L84 -84
           C50 -98 -50 -98 -84 -84 Z" fill="url(#bcGold)"/>
  <circle cx="-30" cy="-132" r="6" fill="#FF4D7D"/><circle cx="30" cy="-132" r="6" fill="#FF4D7D"/>
  <circle cx="0" cy="-98" r="7" fill="#FF4D7D"/>
  <rect x="-84" y="-90" width="168" height="11" rx="5" fill="#B8801A"/>
</g>`);
};

// ------------------------------------------------------------------ Neon Bay
// Wet street, tail lights, skyline, palms — a city you drive around at night.
art['night-city'] = () => {
  const r = prng(31);
  let towers = '';
  for (let layer = 0; layer < 3; layer++) {
    let x = -20;
    while (x < W + 20) {
      const w = 30 + r() * 58, h = (70 + r() * 150) * (1 - layer * 0.2), top = 236 - h;
      const shade = ['#150E28', '#1D1338', '#271A४8'.replace('४', '4')][layer];
      towers += `<rect x="${x.toFixed(0)}" y="${top.toFixed(0)}" width="${w.toFixed(0)}" height="${(h + 6).toFixed(0)}" fill="${shade}"/>`;
      if (layer === 2) {
        for (let wy = top + 12; wy < 228; wy += 15) {
          for (let wx = x + 6; wx < x + w - 7; wx += 11) {
            if (r() > 0.58) {
              const c = r() > 0.75 ? '#FF7BD5' : r() > 0.45 ? '#67E8FF' : '#FFC86B';
              towers += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="4.5" height="7" fill="${c}" opacity="${(0.55 + r() * 0.45).toFixed(2)}"/>`;
            }
          }
        }
      }
      x += w + 4;
    }
  }
  const palm = (x, y, s, flip) => `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">
<path d="M0 0 C-3 -30 -5 -58 -2 -86" stroke="#0B0714" stroke-width="7" fill="none" stroke-linecap="round"/>
${[0, 1, 2, 3, 4].map((i) => {
    const a = -150 + i * 30;
    return `<path d="M-2 -86 Q${(Math.cos(a * Math.PI / 180) * 40).toFixed(0)} ${(-86 + Math.sin(a * Math.PI / 180) * 26).toFixed(0)} ${(Math.cos(a * Math.PI / 180) * 70).toFixed(0)} ${(-74 + Math.sin(a * Math.PI / 180) * 34).toFixed(0)}" stroke="#0B0714" stroke-width="9" fill="none" stroke-linecap="round"/>`;
  }).join('')}</g>`;
  return svg(
    `<linearGradient id="nbSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2B1247"/><stop offset="0.42" stop-color="#5B2160"/>
      <stop offset="0.72" stop-color="#B8436B"/><stop offset="1" stop-color="#F2825C"/></linearGradient>
     <linearGradient id="nbRoad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#180F26"/><stop offset="1" stop-color="#0A0713"/></linearGradient>
     <linearGradient id="nbRefl" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FF5C7A" stop-opacity=".5"/><stop offset="1" stop-color="#FF5C7A" stop-opacity="0"/></linearGradient>`,
    `<rect width="${W}" height="242" fill="url(#nbSky)"/>
<circle cx="470" cy="150" r="52" fill="#FFD9A0" opacity=".9"/>
<circle cx="470" cy="150" r="82" fill="#FFB27A" opacity=".18"/>
${towers}
<rect x="0" y="236" width="${W}" height="${H - 236}" fill="url(#nbRoad)"/>
<rect x="0" y="236" width="${W}" height="60" fill="url(#nbRefl)"/>
${[70, 150, 240, 330, 430, 520].map((x, i) => `<rect x="${x}" y="${248 + i * 6}" width="${28 + i * 8}" height="3" rx="1.5" fill="#FF9AB4" opacity="${(0.5 - i * 0.05).toFixed(2)}"/>`).join('')}
<path d="M300 360 L316 250 L332 250 L348 360 Z" fill="#FFE9B0" opacity=".16"/>
${palm(78, 300, 1.05, false)}${palm(576, 312, 1.2, true)}
<!-- car, seen from behind -->
<g transform="translate(320 300)">
  <ellipse cx="0" cy="34" rx="72" ry="10" fill="#000" opacity=".5"/>
  <path d="M-58 24 L-52 -6 Q-48 -24 -28 -26 L28 -26 Q48 -24 52 -6 L58 24 Z" fill="#2A1B3D"/>
  <path d="M-40 -8 L-36 -20 Q-34 -22 -22 -22 L22 -22 Q34 -22 36 -20 L40 -8 Z" fill="#120C1E"/>
  <rect x="-58" y="10" width="24" height="9" rx="4" fill="#FF3B5C"/>
  <rect x="34" y="10" width="24" height="9" rx="4" fill="#FF3B5C"/>
  <rect x="-64" y="12" width="36" height="5" rx="2.5" fill="#FF7A93" opacity=".55"/>
  <rect x="28" y="12" width="36" height="5" rx="2.5" fill="#FF7A93" opacity=".55"/>
  <rect x="-14" y="20" width="28" height="6" rx="3" fill="#0E0916"/>
</g>`);
};

// --------------------------------------------------------- Minecraft Clone
// An isometric slice of terrain: grass, dirt, stone, a tree, a mined-out face.
art['minecraft'] = () => {
  const U = 34, cx = 320, cy = 232;
  const iso = (gx, gy, gz) => [cx + (gx - gz) * U, cy + (gx + gz) * U * 0.5 - gy * U * 0.62];
  const TOP = { grass: '#7BC24B', dirt: '#A97B4F', stone: '#9AA0A8', wood: '#8A6231', leaf: '#4FA83C' };
  const L = { grass: '#5E9C36', dirt: '#8A6440', stone: '#7C828A', wood: '#6E4E27', leaf: '#3D8A2F' };
  const R = { grass: '#6BAF41', dirt: '#9A7047', stone: '#8A9098', wood: '#7C5A2C', leaf: '#469635' };
  const cube = (gx, gy, gz, k) => {
    const [x, y] = iso(gx, gy, gz);
    return `<g><path d="M${x} ${y - U * 0.62} l${U} ${U * 0.5} l${-U} ${U * 0.5} l${-U} ${-U * 0.5} Z" fill="${TOP[k]}"/>
<path d="M${x - U} ${y - U * 0.12} l${U} ${U * 0.5} v${U * 0.62} l${-U} ${-U * 0.5} Z" fill="${L[k]}"/>
<path d="M${x + U} ${y - U * 0.12} l${-U} ${U * 0.5} v${U * 0.62} l${U} ${-U * 0.5} Z" fill="${R[k]}"/></g>`;
  };
  const cells = [];
  for (let gx = -3; gx <= 3; gx++) {
    for (let gz = -3; gz <= 3; gz++) {
      // A bite taken out of one corner exposes the strata underneath.
      const mined = gx >= 1 && gz >= 1;
      const top = mined ? -1 : 0;
      for (let gy = -2; gy <= top; gy++) {
        const kind = gy === top && !mined ? 'grass' : gy >= top - 1 ? 'dirt' : 'stone';
        cells.push({ gx, gy, gz, kind, order: gx + gz + gy * 0.01 });
      }
    }
  }
  cells.sort((a, b) => a.order - b.order);
  let body = cells.map((c) => cube(c.gx, c.gy, c.gz, c.kind)).join('');
  // tree
  for (let gy = 1; gy <= 3; gy++) body += cube(-2, gy, -2, 'wood');
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) body += cube(-2 + dx, 4, -2 + dz, 'leaf');
  body += cube(-2, 5, -2, 'leaf');
  return svg(
    `<linearGradient id="mcSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6FC3F5"/><stop offset="0.6" stop-color="#A8DDF7"/>
      <stop offset="1" stop-color="#D6EFFA"/></linearGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#mcSky)"/>
<rect x="486" y="34" width="46" height="46" fill="#FFF3C4"/><rect x="492" y="40" width="34" height="34" fill="#FFE27A"/>
<g fill="#FFFFFF" opacity=".92">
  <rect x="70" y="52" width="96" height="18"/><rect x="88" y="34" width="60" height="18"/>
  <rect x="238" y="86" width="76" height="16"/><rect x="256" y="70" width="44" height="16"/></g>
${body}`);
};

// ---------------------------------------------------------------- Neon Drift
art['neon-drift'] = () => {
  let grid = '';
  for (let i = -9; i <= 9; i++) {
    grid += `<path d="M320 196 L${320 + i * 150} 360" stroke="#FF3DCE" stroke-width="1.6" opacity=".55"/>`;
  }
  for (let i = 1; i <= 10; i++) {
    const y = 196 + Math.pow(i / 10, 2.3) * 164;
    grid += `<line x1="0" y1="${y.toFixed(1)}" x2="${W}" y2="${y.toFixed(1)}" stroke="#00E7FF" stroke-width="${(0.6 + i * 0.28).toFixed(1)}" opacity="${(0.28 + i * 0.055).toFixed(2)}"/>`;
  }
  return svg(
    `<linearGradient id="ndSun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFE86B"/><stop offset="0.5" stop-color="#FF6E3D"/>
      <stop offset="1" stop-color="#FF2D8E"/></linearGradient>
     <linearGradient id="ndSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#150A2E"/><stop offset="0.68" stop-color="#3A1152"/>
      <stop offset="1" stop-color="#6B1552"/></linearGradient>
     <clipPath id="ndClip"><circle cx="320" cy="196" r="104"/></clipPath>`,
    `<rect width="${W}" height="196" fill="url(#ndSky)"/>
<rect x="0" y="196" width="${W}" height="164" fill="#0A0620"/>
<g clip-path="url(#ndClip)">
  <circle cx="320" cy="196" r="104" fill="url(#ndSun)"/>
  ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="216" y="${150 + i * 15}" width="208" height="${(3 + i * 1.5).toFixed(0)}" fill="#0A0620" opacity=".85"/>`).join('')}
</g>
${[60, 140, 500, 580].map((x, i) => `<circle cx="${x}" cy="${40 + i * 22}" r="1.8" fill="#FFF" opacity=".7"/>`).join('')}
${grid}
<g transform="translate(320 300)">
  <ellipse cx="0" cy="30" rx="86" ry="12" fill="#FF2D8E" opacity=".28"/>
  <path d="M-70 22 L-62 -12 Q-56 -32 -30 -34 L30 -34 Q56 -32 62 -12 L70 22 Z" fill="#1B1036"/>
  <path d="M-46 -14 L-42 -26 Q-40 -29 -24 -29 L24 -29 Q40 -29 42 -26 L46 -14 Z" fill="#00E7FF" opacity=".55"/>
  <rect x="-70" y="6" width="30" height="10" rx="5" fill="#FF2D6F"/>
  <rect x="40" y="6" width="30" height="10" rx="5" fill="#FF2D6F"/>
  <rect x="-96" y="9" width="44" height="4" rx="2" fill="#FF6FA0" opacity=".6"/>
  <rect x="52" y="9" width="44" height="4" rx="2" fill="#FF6FA0" opacity=".6"/>
</g>`);
};

// ----------------------------------------------------------- Rolling Thunder
// First-person: the rifle you are holding, a dusk skyline, a marked target.
art['rolling-thunder'] = () => {
  const r = prng(13);
  let debris = '';
  for (let i = 0; i < 40; i++) {
    debris += `<circle cx="${(r() * W).toFixed(0)}" cy="${(60 + r() * 200).toFixed(0)}" r="${(0.6 + r() * 1.6).toFixed(1)}" fill="#FFD9A0" opacity="${(0.1 + r() * 0.3).toFixed(2)}"/>`;
  }
  let ruins = '';
  for (let i = 0; i < 11; i++) {
    const x = -20 + i * 62 + r() * 14, w = 40 + r() * 40, h = 60 + r() * 130;
    ruins += `<rect x="${x.toFixed(0)}" y="${(252 - h).toFixed(0)}" width="${w.toFixed(0)}" height="${(h + 8).toFixed(0)}" fill="${['#2E2B3F', '#3A3550', '#252235'][i % 3]}"/>`;
    if (r() > 0.5) ruins += `<rect x="${(x + w * 0.3).toFixed(0)}" y="${(252 - h - 18).toFixed(0)}" width="${(w * 0.25).toFixed(0)}" height="20" fill="#1B1A25"/>`;
  }
  return svg(
    `<linearGradient id="rtSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2E2350"/><stop offset="0.42" stop-color="#6E3457"/>
      <stop offset="0.74" stop-color="#D96A42"/><stop offset="1" stop-color="#FFB165"/></linearGradient>
     <linearGradient id="rtGun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6A6F7E"/><stop offset="0.45" stop-color="#3C4049"/>
      <stop offset="1" stop-color="#1E2026"/></linearGradient>
     <linearGradient id="rtHaze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0B0A12" stop-opacity="0"/><stop offset="1" stop-color="#0B0A12" stop-opacity=".55"/></linearGradient>`,
    `<rect width="${W}" height="260" fill="url(#rtSky)"/>
<circle cx="452" cy="212" r="44" fill="#FFC98A" opacity=".55"/>
${ruins}
${debris}
<rect x="0" y="252" width="${W}" height="108" fill="#191728"/>
<rect x="0" y="200" width="${W}" height="160" fill="url(#rtHaze)"/>
<!-- target marker -->
<g transform="translate(206 196)" opacity=".95">
  <rect x="-22" y="-22" width="10" height="3" fill="#FF5A3C"/><rect x="-22" y="-22" width="3" height="10" fill="#FF5A3C"/>
  <rect x="12" y="-22" width="10" height="3" fill="#FF5A3C"/><rect x="19" y="-22" width="3" height="10" fill="#FF5A3C"/>
  <rect x="-22" y="19" width="10" height="3" fill="#FF5A3C"/><rect x="-22" y="12" width="3" height="10" fill="#FF5A3C"/>
  <rect x="12" y="19" width="10" height="3" fill="#FF5A3C"/><rect x="19" y="12" width="3" height="10" fill="#FF5A3C"/>
  <text x="0" y="40" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="10" fill="#FF8A6C">142 m</text>
</g>
<!-- crosshair -->
<g stroke="#EDF2FF" stroke-width="2" opacity=".9">
  <line x1="320" y1="158" x2="320" y2="174"/><line x1="320" y1="206" x2="320" y2="222"/>
  <line x1="284" y1="190" x2="300" y2="190"/><line x1="340" y1="190" x2="356" y2="190"/>
</g>
<circle cx="320" cy="190" r="2.4" fill="#EDF2FF"/>
<!-- the rifle you are carrying, lower right -->
<g transform="translate(392 244) rotate(-9)">
  <rect x="0" y="10" width="250" height="22" rx="5" fill="url(#rtGun)"/>
  <rect x="-92" y="14" width="110" height="15" rx="6" fill="#2B2E36"/>
  <rect x="196" y="-2" width="16" height="14" rx="3" fill="#2B2E36"/>
  <rect x="72" y="30" width="40" height="52" rx="7" fill="#22252C"/>
  <path d="M40 32 L74 32 L60 84 L26 84 Z" fill="#2B2E36"/>
  <rect x="120" y="0" width="66" height="12" rx="4" fill="#31353E"/>
  <circle cx="153" cy="6" r="9" fill="#0F1116"/><circle cx="153" cy="6" r="5" fill="#6EC8FF" opacity=".65"/>
  <rect x="236" y="16" width="34" height="10" rx="4" fill="#181A20"/>
  <rect x="0" y="10" width="250" height="3" rx="1.5" fill="#A8AEBC" opacity=".7"/>
</g>
<g transform="translate(96 316)" font-family="ui-monospace,Menlo,monospace" fill="#EDF2FF">
  <text x="0" y="0" font-size="26" font-weight="700">24</text>
  <text x="38" y="0" font-size="14" opacity=".55">/ 120</text>
</g>`);
};

// --------------------------------------------------------------- Fall Guys
art['fall-guys'] = () => {
  const bean = (x, y, c, rot, eyeX) => `<g transform="translate(${x} ${y}) rotate(${rot})">
<ellipse cx="0" cy="52" rx="34" ry="10" fill="#000" opacity=".28"/>
<rect x="-30" y="-46" width="60" height="94" rx="30" fill="${c}"/>
<rect x="-19" y="-30" width="38" height="58" rx="19" fill="#FFFFFF" opacity=".22"/>
<circle cx="${-11 + eyeX}" cy="-22" r="5.4" fill="#181428"/><circle cx="${11 + eyeX}" cy="-22" r="5.4" fill="#181428"/>
<circle cx="${-9 + eyeX}" cy="-24" r="1.9" fill="#FFF"/><circle cx="${13 + eyeX}" cy="-24" r="1.9" fill="#FFF"/>
<rect x="-32" y="12" width="12" height="26" rx="6" fill="${c}"/><rect x="20" y="12" width="12" height="26" rx="6" fill="${c}"/></g>`;
  return svg(
    `<linearGradient id="fgSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5AC8FF"/><stop offset="1" stop-color="#B4E4FF"/></linearGradient>
     <linearGradient id="fgFloor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FF9BD2"/><stop offset="1" stop-color="#FF6FB8"/></linearGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#fgSky)"/>
<g fill="#FFFFFF" opacity=".8">
  <ellipse cx="96" cy="60" rx="48" ry="24"/><ellipse cx="138" cy="52" rx="34" ry="20"/>
  <ellipse cx="520" cy="86" rx="54" ry="26"/><ellipse cx="474" cy="80" rx="34" ry="18"/></g>
<path d="M0 214 L640 194 L640 360 L0 360 Z" fill="url(#fgFloor)"/>
${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M${i * 90} 360 L${i * 90 + 42} 200 L${i * 90 + 66} 199 L${i * 90 + 30} 360 Z" fill="#FFFFFF" opacity=".1"/>`).join('')}
<rect x="0" y="196" width="${W}" height="12" fill="#7B4BD8"/>
<!-- spinning beam -->
<g transform="translate(420 250)">
  <rect x="-160" y="-9" width="320" height="18" rx="9" fill="#7B4BD8" transform="rotate(-16)"/>
  <rect x="-160" y="-14" width="320" height="8" rx="4" fill="#9C74EE" transform="rotate(-16)"/>
  <circle cx="0" cy="0" r="20" fill="#5B31B0"/><circle cx="0" cy="0" r="9" fill="#B79BF5"/>
</g>
<!-- wrecking ball -->
<line x1="120" y1="0" x2="150" y2="128" stroke="#5B31B0" stroke-width="6"/>
<circle cx="150" cy="146" r="30" fill="#FFC64D"/><circle cx="141" cy="136" r="10" fill="#FFE09A"/>
${bean(232, 262, '#FF6FA8', -8, 2)}
${bean(330, 244, '#5BE0C6', 12, -2)}
${bean(150, 236, '#FFD166', -26, 3)}
${bean(508, 268, '#8FA8FF', 6, -3)}`);
};

// ------------------------------------------------------------- Vector Siege
art['vector-siege'] = () => {
  const r = prng(97);
  let stars = '';
  for (let i = 0; i < 60; i++) stars += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * H).toFixed(0)}" r="${(0.6 + r() * 1.5).toFixed(1)}" fill="#9FE8FF" opacity="${(0.2 + r() * 0.6).toFixed(2)}"/>`;
  const ship = (x, y, s, a) => `<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})">
<path d="M0 -18 L15 16 L0 8 L-15 16 Z" fill="none" stroke="#FF4D6D" stroke-width="2.6"/>
<path d="M0 -18 L15 16 L0 8 L-15 16 Z" fill="#FF4D6D" opacity=".16"/></g>`;
  return svg(
    `<radialGradient id="vsCore" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#7CFFF0"/><stop offset="1" stop-color="#0BB39E" stop-opacity="0"/></radialGradient>
     <linearGradient id="vsBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#03131C"/><stop offset="1" stop-color="#062431"/></linearGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#vsBg)"/>
${stars}
<circle cx="320" cy="190" r="140" fill="url(#vsCore)" opacity=".35"/>
${[0, 1, 2].map((ring) => {
      const rad = 62 + ring * 34;
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + ring * 0.26;
        pts.push(`${(320 + Math.cos(a) * rad).toFixed(1)},${(190 + Math.sin(a) * rad * 0.82).toFixed(1)}`);
      }
      return `<polygon points="${pts.join(' ')}" fill="none" stroke="#2FE0C4" stroke-width="${(3 - ring * 0.7).toFixed(1)}" opacity="${(0.95 - ring * 0.24).toFixed(2)}"/>`;
    }).join('')}
<polygon points="320,150 356,190 320,230 284,190" fill="#7CFFF0"/>
<polygon points="320,162 344,190 320,218 296,190" fill="#03131C"/>
${ship(96, 74, 1.25, 148)}${ship(548, 96, 1.05, -152)}${ship(540, 292, 1.15, -34)}
${ship(120, 296, 0.95, 32)}${ship(320, 40, 0.9, 180)}
<g stroke="#7CFFF0" stroke-width="2" opacity=".8">
  <line x1="320" y1="190" x2="150" y2="106"/><line x1="320" y1="190" x2="498" y2="122"/>
</g>
<circle cx="150" cy="106" r="7" fill="#FFF6A6"/><circle cx="498" cy="122" r="5" fill="#FFF6A6"/>`);
};

// -------------------------------------------------------------------- Lumen
art['lumen'] = () => {
  const bands = ['#FF4D5E', '#FF9A3D', '#FFE martial'.replace(' martial', 'D24D'), '#5BE07A', '#4DA6FF', '#9B6BFF'];
  let fan = '';
  bands.forEach((c, i) => {
    const a = 8 + i * 5.4;
    const rad = a * Math.PI / 180;
    fan += `<path d="M330 180 L640 ${(180 + Math.tan(rad) * 310).toFixed(1)} L640 ${(180 + Math.tan((a + 5.4) * Math.PI / 180) * 310).toFixed(1)} Z" fill="${c}" opacity=".72"/>`;
  });
  return svg(
    `<linearGradient id="lmBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#08060F"/><stop offset="1" stop-color="#140C24"/></linearGradient>
     <linearGradient id="lmBeam" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#FFFFFF" stop-opacity=".95"/></linearGradient>
     <linearGradient id="lmGlass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#CFE6FF" stop-opacity=".55"/><stop offset="0.5" stop-color="#8FB6E8" stop-opacity=".3"/>
      <stop offset="1" stop-color="#E8F3FF" stop-opacity=".6"/></linearGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#lmBg)"/>
<circle cx="330" cy="180" r="150" fill="#6B4BFF" opacity=".12"/>
<rect x="0" y="172" width="300" height="16" fill="url(#lmBeam)"/>
${fan}
<g>
  <polygon points="330,84 414,244 246,244" fill="url(#lmGlass)" stroke="#DCEBFF" stroke-width="2.4"/>
  <polygon points="330,84 414,244 330,244" fill="#FFFFFF" opacity=".08"/>
</g>
<circle cx="330" cy="180" r="6" fill="#FFFFFF"/>
<circle cx="330" cy="180" r="18" fill="#FFFFFF" opacity=".22"/>
${[[92, 74], [560, 60], [128, 306], [590, 300], [420, 44]].map(([x, y], i) =>
      `<circle cx="${x}" cy="${y}" r="${2 + (i % 3)}" fill="#CFE6FF" opacity="${(0.3 + (i % 4) * 0.15).toFixed(2)}"/>`).join('')}`);
};

// ---------------------------------------------------------------- Continuum
// A hero mid-dash, with the rewind arc trailing the seconds they undid.
art['continuum'] = () => svg(
  `<linearGradient id="cnBg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#04121A"/><stop offset="1" stop-color="#0B2A33"/></linearGradient>
   <linearGradient id="cnTrail" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#00E5B0" stop-opacity="0"/><stop offset="1" stop-color="#00E5B0" stop-opacity=".85"/></linearGradient>
   <radialGradient id="cnGlow" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#00E5B0" stop-opacity=".45"/><stop offset="1" stop-color="#00E5B0" stop-opacity="0"/></radialGradient>`,
  `<rect width="${W}" height="${H}" fill="url(#cnBg)"/>
<circle cx="392" cy="182" r="150" fill="url(#cnGlow)"/>
${[0, 1, 2, 3].map((i) => {
    const rad = 96 + i * 30;
    return `<circle cx="392" cy="182" r="${rad}" fill="none" stroke="#0FBF9B" stroke-width="${(2.4 - i * 0.45).toFixed(1)}" opacity="${(0.7 - i * 0.15).toFixed(2)}" stroke-dasharray="${18 + i * 9} ${10 + i * 6}"/>`;
  }).join('')}
<path d="M96 250 Q220 236 300 208" stroke="url(#cnTrail)" stroke-width="26" fill="none" stroke-linecap="round" opacity=".55"/>
<path d="M126 268 Q240 254 312 226" stroke="url(#cnTrail)" stroke-width="12" fill="none" stroke-linecap="round" opacity=".4"/>
${[0, 1, 2].map((i) => `<g opacity="${(0.16 + i * 0.12).toFixed(2)}" transform="translate(${210 + i * 44} ${230 - i * 8})">
  <rect x="-13" y="-40" width="26" height="46" rx="12" fill="#00E5B0"/><circle cx="0" cy="-52" r="13" fill="#00E5B0"/></g>`).join('')}
<g transform="translate(392 182)">
  <ellipse cx="0" cy="82" rx="46" ry="11" fill="#021015" opacity=".7"/>
  <path d="M-26 -6 L-42 40 L-24 44 L-8 8 Z" fill="#123846"/>
  <path d="M26 -6 L44 38 L26 44 L10 8 Z" fill="#123846"/>
  <rect x="-25" y="-42" width="50" height="60" rx="18" fill="#1B4F60"/>
  <rect x="-25" y="-42" width="50" height="26" rx="13" fill="#25697F"/>
  <circle cx="0" cy="-58" r="20" fill="#E9F6F4"/>
  <path d="M-20 -62 A20 20 0 0 1 20 -62 L20 -56 L-20 -56 Z" fill="#0FBF9B"/>
  <rect x="-7" y="-62" width="14" height="7" rx="3" fill="#04121A"/>
  <rect x="18" y="-30" width="60" height="13" rx="6" fill="#0B2530"/>
  <rect x="60" y="-33" width="26" height="19" rx="5" fill="#0FBF9B"/>
  <circle cx="0" cy="-6" r="9" fill="#7CFFE8"/>
</g>`);

// ---------------------------------------------------------------- Ghostline
// A rain-lit alley, a runner silhouette, implant glow, holographic signage.
art['cyberpunk'] = () => {
  const r = prng(19);
  let rain = '';
  for (let i = 0; i < 90; i++) {
    const x = r() * W, y = r() * H;
    rain += `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x - 4).toFixed(0)}" y2="${(y + 15).toFixed(0)}" stroke="#8FD9FF" stroke-width="1" opacity="${(0.1 + r() * 0.3).toFixed(2)}"/>`;
  }
  let windows = '';
  for (let i = 0; i < 120; i++) {
    const side = r() > 0.5;
    const x = side ? 12 + r() * 130 : 500 + r() * 130;
    const y = 20 + r() * 250;
    const c = r() > 0.6 ? '#FF3D8B' : r() > 0.3 ? '#33E1FF' : '#FFC24D';
    windows += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${(3 + r() * 5).toFixed(0)}" height="${(4 + r() * 7).toFixed(0)}" fill="${c}" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`;
  }
  return svg(
    `<linearGradient id="gsBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1A0733"/><stop offset="0.5" stop-color="#2B0B44"/>
      <stop offset="1" stop-color="#08040F"/></linearGradient>
     <linearGradient id="gsFloor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2A0E3F"/><stop offset="1" stop-color="#070310"/></linearGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#gsBg)"/>
<rect x="0" y="0" width="160" height="${H}" fill="#0D0520"/>
<rect x="480" y="0" width="160" height="${H}" fill="#0D0520"/>
${windows}
<rect x="160" y="286" width="320" height="74" fill="url(#gsFloor)"/>
<g opacity=".85">
  <rect x="176" y="58" width="26" height="150" rx="4" fill="#FF2D7A" opacity=".9"/>
  <rect x="182" y="66" width="14" height="134" rx="3" fill="#FF8FBC" opacity=".7"/>
  <rect x="440" y="96" width="22" height="112" rx="4" fill="#22D3FF" opacity=".9"/>
  <rect x="445" y="104" width="12" height="96" rx="3" fill="#A6EEFF" opacity=".7"/>
</g>
<ellipse cx="320" cy="330" rx="170" ry="30" fill="#FF2D7A" opacity=".14"/>
<ellipse cx="320" cy="318" rx="120" ry="18" fill="#22D3FF" opacity=".1"/>
<g transform="translate(320 300)">
  <ellipse cx="0" cy="8" rx="40" ry="9" fill="#000" opacity=".55"/>
  <path d="M-14 0 L-22 -58 L-4 -58 L-2 0 Z" fill="#0B0616"/>
  <path d="M14 0 L26 -58 L8 -58 L4 0 Z" fill="#0B0616"/>
  <path d="M-26 -58 L-30 -122 Q-30 -136 -16 -138 L16 -138 Q30 -136 30 -122 L26 -58 Z" fill="#120A22"/>
  <path d="M-30 -122 L-52 -96 L-46 -86 L-26 -104 Z" fill="#120A22"/>
  <path d="M30 -122 L54 -100 L48 -88 L26 -104 Z" fill="#120A22"/>
  <circle cx="0" cy="-158" r="22" fill="#150C28"/>
  <path d="M-22 -160 A22 22 0 0 1 22 -160 L22 -152 L-22 -152 Z" fill="#0B0616"/>
  <rect x="-16" y="-166" width="32" height="7" rx="3.5" fill="#FF2D7A"/>
  <circle cx="17" cy="-150" r="4" fill="#22D3FF"/>
  <rect x="-30" y="-112" width="60" height="4" fill="#FF2D7A" opacity=".8"/>
  <rect x="-30" y="-100" width="34" height="3" fill="#22D3FF" opacity=".7"/>
</g>
${rain}`);
};

// -------------------------------------------------------------- Hollow Tide
// A very small figure, a very large room, water coming up.
art['hollow-tide'] = () => svg(
  `<linearGradient id="htBg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#14100C"/><stop offset="0.6" stop-color="#20180F"/>
    <stop offset="1" stop-color="#0A0806"/></linearGradient>
   <linearGradient id="htWater" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2E5B63" stop-opacity=".92"/><stop offset="1" stop-color="#0E2126"/></linearGradient>
   <radialGradient id="htLamp" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#FFCE73" stop-opacity=".85"/><stop offset="1" stop-color="#FFCE73" stop-opacity="0"/></radialGradient>`,
  `<rect width="${W}" height="${H}" fill="url(#htBg)"/>
<g fill="#0D0A07">
  <rect x="40" y="0" width="26" height="270"/><rect x="574" y="0" width="26" height="270"/>
  <rect x="0" y="0" width="${W}" height="26"/></g>
<path d="M180 270 L180 96 Q180 58 230 58 L410 58 Q460 58 460 96 L460 270 Z" fill="#100C08"/>
<path d="M196 270 L196 100 Q196 74 232 74 L408 74 Q444 74 444 100 L444 270 Z" fill="#2A2114"/>
<circle cx="320" cy="120" r="86" fill="url(#htLamp)"/>
<circle cx="320" cy="86" r="11" fill="#FFD98A"/>
<line x1="320" y1="26" x2="320" y2="76" stroke="#3A2E1C" stroke-width="3"/>
${[110, 230, 400, 520].map((x, i) => `<rect x="${x}" y="${180 + (i % 2) * 26}" width="${46 + i * 10}" height="${58 + i * 8}" rx="4" fill="#0F0B07"/>`).join('')}
<g transform="translate(300 250)">
  <ellipse cx="0" cy="22" rx="17" ry="4" fill="#000" opacity=".6"/>
  <path d="M-9 20 L-9 -6 Q-9 -20 0 -20 Q9 -20 9 -6 L9 20 Z" fill="#0A0705"/>
  <path d="M-9 -4 L-18 12 L-13 15 L-6 4 Z" fill="#0A0705"/>
  <circle cx="0" cy="-26" r="9" fill="#0A0705"/>
  <path d="M-10 -30 Q0 -40 10 -30 L10 -24 L-10 -24 Z" fill="#F2E3B8"/>
</g>
<rect x="0" y="272" width="${W}" height="88" fill="url(#htWater)"/>
${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${i * 96}" y="${278 + (i % 3) * 5}" width="${52 + i * 6}" height="2.5" rx="1" fill="#8FCBD1" opacity="${(0.16 + (i % 3) * 0.1).toFixed(2)}"/>`).join('')}
<path d="M0 272 Q80 266 160 272 T320 272 T480 272 T640 272 L640 280 L0 280 Z" fill="#4E848C" opacity=".55"/>`);


// -------------------------------------------------------------------- Snake
// The board seen in isometric, with the snake extruded off it.
art['snake'] = () => {
  const U = 30, cx = 320, cy = 150;
  const iso = (gx, gz, h) => [cx + (gx - gz) * U, cy + (gx + gz) * U * 0.5 - h * U * 0.55];
  const slab = (gx, gz, h, top, left, right) => {
    const [x, y] = iso(gx, gz, h);
    return `<path d="M${x} ${y - U * 0.55} l${U} ${U * 0.5} l${-U} ${U * 0.5} l${-U} ${-U * 0.5} Z" fill="${top}"/>
<path d="M${x - U} ${y - U * 0.05} l${U} ${U * 0.5} v${U * 0.55} l${-U} ${-U * 0.5} Z" fill="${left}"/>
<path d="M${x + U} ${y - U * 0.05} l${-U} ${U * 0.5} v${U * 0.55} l${U} ${-U * 0.5} Z" fill="${right}"/>`;
  };
  let floor = '';
  for (let gx = -3; gx <= 3; gx++) {
    for (let gz = -3; gz <= 3; gz++) {
      const alt = (gx + gz) % 2 === 0;
      floor += slab(gx, gz, 0, alt ? '#211D2E' : '#1A1725', '#141220', '#181524');
    }
  }
  const path = [[-2, 2], [-1, 2], [0, 2], [1, 2], [1, 1], [1, 0], [0, 0], [-1, 0], [-1, -1]];
  let body = '';
  path.forEach(([gx, gz], i) => {
    const k = i / (path.length - 1);
    body += slab(gx, gz, 1,
      i === path.length - 1 ? '#FFD37A' : `hsl(40 100% ${52 + k * 12}%)`,
      `hsl(40 90% ${28 + k * 8}%)`, `hsl(40 95% ${38 + k * 8}%)`);
  });
  const [fx, fy] = iso(2, -2, 1.15);
  return svg(
    `<linearGradient id="snBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#12101A"/><stop offset="1" stop-color="#08070C"/></linearGradient>
     <radialGradient id="snGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#FF4D3D" stop-opacity=".55"/><stop offset="1" stop-color="#FF4D3D" stop-opacity="0"/></radialGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#snBg)"/>
${floor}
${body}
<circle cx="${fx}" cy="${fy}" r="34" fill="url(#snGlow)"/>
<circle cx="${fx}" cy="${fy}" r="11" fill="#FF4D3D"/>
<circle cx="${(fx - 3).toFixed(0)}" cy="${(fy - 4).toFixed(0)}" r="3.4" fill="#FFB0A6"/>`);
};

// --------------------------------------------------------------------- 2048
// Tiles stacked with real thickness, the 2048 tile lit on top.
art['twenty48'] = () => {
  const U = 46, cx = 322, cy = 132;
  const iso = (gx, gz, h) => [cx + (gx - gz) * U, cy + (gx + gz) * U * 0.5 - h * U * 0.5];
  const tile = (gx, gz, h, label, top, left, right, ink) => {
    const [x, y] = iso(gx, gz, h);
    return `<g><path d="M${x} ${y - U * 0.5} l${U} ${U * 0.5} l${-U} ${U * 0.5} l${-U} ${-U * 0.5} Z" fill="${top}"/>
<path d="M${x - U} ${y} l${U} ${U * 0.5} v${U * 0.42} l${-U} ${-U * 0.5} Z" fill="${left}"/>
<path d="M${x + U} ${y} l${-U} ${U * 0.5} v${U * 0.42} l${U} ${-U * 0.5} Z" fill="${right}"/>
<text x="${x}" y="${(y + 6).toFixed(0)}" text-anchor="middle" font-family="Archivo,system-ui,sans-serif"
  font-size="${label.length > 3 ? 15 : 19}" font-weight="700" fill="${ink}">${label}</text></g>`;
  };
  const P = {
    2:   ['#3A3450', '#241F36', '#2E2842', '#C6C0D2'],
    4:   ['#4A4166', '#2C2547', '#3A3155', '#E4DFF0'],
    8:   ['#B06A18', '#7A4610', '#94590F', '#FFE9C7'],
    64:  ['#D6621E', '#8E3C10', '#B04D16', '#FFF1E6'],
    512: ['#E0B412', '#96770A', '#BE960E', '#FFFBEA'],
    2048:['#FFB020', '#B4780D', '#DC9614', '#1A1206'],
  };
  const layout = [
    [-1, -1, 0, '2'], [0, -1, 0, '8'], [1, -1, 0, '2'],
    [-1, 0, 0, '4'], [0, 0, 0, '64'], [1, 0, 0, '4'],
    [-1, 1, 0, '512'], [0, 1, 0, '8'], [1, 1, 0, '2'],
  ];
  let body = '';
  for (const [gx, gz, h, v] of layout.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]))) {
    const c = P[v] || P[2];
    body += tile(gx, gz, h, v, c[0], c[1], c[2], c[3]);
  }
  const c = P[2048];
  body += tile(0, 0, 1.05, '2048', c[0], c[1], c[2], c[3]);
  return svg(
    `<linearGradient id="tfBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#191426"/><stop offset="1" stop-color="#0A0810"/></linearGradient>
     <radialGradient id="tfGlow" cx="50%" cy="42%" r="46%">
      <stop offset="0" stop-color="#FFB020" stop-opacity=".28"/><stop offset="1" stop-color="#FFB020" stop-opacity="0"/></radialGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#tfBg)"/>
<rect width="${W}" height="${H}" fill="url(#tfGlow)"/>
${body}`);
};

// ---------------------------------------------------------------- Blockfall
// A well seen at an angle, with tetrominoes falling into it.
art['blockfall'] = () => {
  const cube = (x, y, s, top, left, right) =>
    `<g><path d="M${x} ${y} l${s} ${s * 0.5} l${-s} ${s * 0.5} l${-s} ${-s * 0.5} Z" fill="${top}"/>
<path d="M${x - s} ${y + s * 0.5} l${s} ${s * 0.5} v${s * 0.62} l${-s} ${-s * 0.5} Z" fill="${left}"/>
<path d="M${x + s} ${y + s * 0.5} l${-s} ${s * 0.5} v${s * 0.62} l${s} ${-s * 0.5} Z" fill="${right}"/></g>`;
  const S = 21;
  const iso = (gx, gy, gz) => [320 + (gx - gz) * S, 96 + (gx + gz) * S * 0.5 + gy * S * 0.9];
  let stack = '';
  // A settled floor of mixed pieces.
  const settled = [
    [0, 5, 0, '#6E8BFF'], [1, 5, 0, '#6E8BFF'], [2, 5, 0, '#6E8BFF'], [2, 4, 0, '#6E8BFF'],
    [0, 5, 1, '#5FD79B'], [1, 5, 1, '#5FD79B'], [1, 4, 1, '#5FD79B'], [2, 4, 1, '#5FD79B'],
    [0, 4, 2, '#FF6B6B'], [1, 4, 2, '#FF6B6B'], [0, 5, 2, '#FF6B6B'], [-1, 5, 2, '#FF6B6B'],
    [-1, 5, 0, '#FFD24D'], [-1, 5, 1, '#FFD24D'], [-1, 4, 0, '#FFD24D'], [-1, 4, 1, '#FFD24D'],
  ];
  for (const [gx, gy, gz, c] of settled.sort((a, b) => (a[0] + a[2] + a[1] * 0.01) - (b[0] + b[2] + b[1] * 0.01))) {
    const [x, y] = iso(gx, gy, gz);
    stack += cube(x, y, S, c, shade(c, -32), shade(c, -16));
  }
  // The active piece, still in the air.
  let falling = '';
  for (const [gx, gy, gz] of [[0, 1, 0], [0, 1, 1], [0, 1, 2], [1, 1, 2]]) {
    const [x, y] = iso(gx, gy, gz);
    falling += cube(x, y, S, '#5BE0E0', shade('#5BE0E0', -34), shade('#5BE0E0', -17));
  }
  return svg(
    `<linearGradient id="bfBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#141222"/><stop offset="1" stop-color="#08070E"/></linearGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#bfBg)"/>
<path d="M320 62 L${320 + 3 * S} ${62 + 1.5 * S} L${320 + 3 * S} ${62 + 1.5 * S + 150}
  L320 ${62 + 3 * S + 150} L${320 - 3 * S} ${62 + 1.5 * S + 150} L${320 - 3 * S} ${62 + 1.5 * S} Z"
  fill="#0E0C18" stroke="#2A2639" stroke-width="2"/>
${stack}
${falling}
<g opacity=".5">
  ${[0, 1, 2].map((i) => `<path d="M${320 - 3 * S} ${100 + i * 26} L320 ${113 + i * 26} L${320 + 3 * S} ${100 + i * 26}"
    fill="none" stroke="#FFB020" stroke-width="1" opacity="${(0.3 - i * 0.08).toFixed(2)}"/>`).join('')}
</g>`);
};

/** Shift an #rrggbb toward black by `amt` per channel — cheap face shading. */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => Math.max(0, Math.min(255, v + amt)));
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}

// ------------------------------------------------------------- diagnostics
art['leak-test'] = () => svg(
  `<linearGradient id="ltBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A0F14"/><stop offset="1" stop-color="#160809"/></linearGradient>`,
  `<rect width="${W}" height="${H}" fill="url(#ltBg)"/>
${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${40 + i * 84}" y="${300 - i * 34}" width="60" height="${20 + i * 34}" rx="4" fill="#FF6B6B" opacity="${(0.3 + i * 0.1).toFixed(2)}"/>`).join('')}
<text x="320" y="70" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="22" font-weight="700" fill="#FF9B9B" letter-spacing="6">LEAK TEST</text>`);

art['pointer-lock-probe'] = () => svg(
  `<radialGradient id="plG" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="#2FE0C4" stop-opacity=".4"/><stop offset="1" stop-color="#2FE0C4" stop-opacity="0"/></radialGradient>`,
  `<rect width="${W}" height="${H}" fill="#0B1418"/><rect width="${W}" height="${H}" fill="url(#plG)"/>
<circle cx="320" cy="180" r="54" fill="none" stroke="#2FE0C4" stroke-width="3"/>
<line x1="320" y1="104" x2="320" y2="152" stroke="#2FE0C4" stroke-width="3"/>
<line x1="320" y1="208" x2="320" y2="256" stroke="#2FE0C4" stroke-width="3"/>
<line x1="244" y1="180" x2="292" y2="180" stroke="#2FE0C4" stroke-width="3"/>
<line x1="348" y1="180" x2="396" y2="180" stroke="#2FE0C4" stroke-width="3"/>
<circle cx="320" cy="180" r="9" fill="#7CFFF0"/>`);

let n = 0;
for (const [id, draw] of Object.entries(art)) {
  const out = draw();
  writeFileSync(`${OUT}/${id}.svg`, out);
  console.log(`${id.padEnd(20)} ${(out.length / 1024).toFixed(1)} KB`);
  n++;
}
console.log(`\n${n} illustrations written to ${OUT}/`);
