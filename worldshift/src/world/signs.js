import * as THREE from 'three';
import { RNG } from '../core/mathx.js';

// Runtime-generated sign atlas: shop names, neon, holo ads and survivor paint.
const COLS = 4, ROWS = 40, CW = 256, CH = 64;

export const SIGN_SETS = {
  neon96: ['PIZZA', 'VIDEO', 'LIQUOR', '24 HR', 'PAWN', 'DINER', 'LAUNDRY', 'HOTEL', 'BAR', 'DELI', 'CHECKS CASHED',
    'PHARMACY', 'MOTEL', 'AUTO PARTS', 'RECORDS', 'BOWLING', 'DONUTS', 'TATTOO', 'OPEN', 'GROCERY', 'HARDWARE',
    'BOOKS', 'GOLDEN WOK', 'SHOES', 'PAGERS', 'COMPUTERS', 'CAFE', 'BEAUTY', 'CINEMA', 'GYM'],
  holo47: ['SYNTH NOODLE', 'MEMCLINIC', 'AUGMENT+', 'NEXUS', 'DREAMCORE', 'VR LOUNGE', 'KAIJU RAMEN', 'CLONE CAFE',
    'DATA DEN', 'ORBIT', 'SOMA', 'BIOLAB', 'TOKYO-9', 'NEURO SPA', 'LUMEN', 'GHOSTNET', 'SKYLINE', 'PULSE', 'VOLT',
    'ECHO', 'HELIX', 'ZEN 47', 'MOTO-X', 'CHROME'],
  paint89: ['WATER', 'TRADE', 'SAFE', 'KEEP OUT', 'SCRAP', 'NO MACHINES', 'SEEDS', 'MEDIC', 'FOOD', 'REST',
    'TURN BACK', 'BRIDGE TOLL'],
  special: ['CALLOWAY APTS', 'NEON GALAXY', 'LUCKY MART', 'HALVORSEN', 'CITY HALL', "OLD TOM'S", 'QUINN CLINIC',
    'AEGIS', 'HAVEN', 'GALLERIA', 'KXRS', 'SITE K', 'PIER 9', 'CALLOWAY', 'METRO', 'RED SEVENS', 'KESSLER TRUST',
    'TOM.EXE', 'POLICE', 'HOTEL ARGENT'],
};

const NEON_COLORS = ['#ff3b6b', '#3bd7ff', '#ffe03b', '#ff7a2e', '#7aff5a', '#ff4af0', '#ffffff'];
const HOLO_COLORS = ['#3cf2ff', '#ff4ad8', '#9a7dff', '#4affb0', '#ffd23c'];

export class SignAtlas {
  constructor() {
    this.map = new Map();
    const c = document.createElement('canvas');
    c.width = COLS * CW;
    c.height = ROWS * CH;
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    let slot = 0;
    const rng = new RNG(4242);
    const add = (key, text, style, color) => {
      if (slot >= COLS * ROWS) return;
      const col = slot % COLS, row = Math.floor(slot / COLS);
      const x = col * CW, y = row * CH;
      g.save();
      g.beginPath();
      g.rect(x, y, CW, CH);
      g.clip();
      this._draw(g, x, y, text, style, color, rng);
      g.restore();
      // UV (canvas y is flipped by CanvasTexture flipY=true → v = 1 - y)
      const u0 = (x + 2) / c.width, u1 = (x + CW - 2) / c.width;
      const v1 = 1 - (y + 2) / c.height, v0 = 1 - (y + CH - 2) / c.height;
      this.map.set(key, { u0, v0, u1, v1, style, text });
      slot++;
    };
    SIGN_SETS.neon96.forEach((t, i) => add('n:' + t, t, i % 3 === 0 ? 'box' : 'neon', NEON_COLORS[i % NEON_COLORS.length]));
    SIGN_SETS.holo47.forEach((t, i) => add('h:' + t, t, 'holo', HOLO_COLORS[i % HOLO_COLORS.length]));
    SIGN_SETS.paint89.forEach((t, i) => add('p:' + t, t, 'paint', ['#e8e0d0', '#d84a3a', '#e8c040'][i % 3]));
    SIGN_SETS.special.forEach((t, i) => add('s:' + t, t, i % 2 ? 'box' : 'neon', NEON_COLORS[(i * 3) % NEON_COLORS.length]));
    // Faded 2047 signage seen in the ruins
    SIGN_SETS.holo47.slice(0, 10).forEach((t) => add('f:' + t, t, 'faded', '#8a9a9a'));
    this.canvas = c;
    this.texture = new THREE.CanvasTexture(c);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
  }

  _fit(g, text, maxW, size, font) {
    let s = size;
    g.font = `${font.replace('$', s)}`;
    while (g.measureText(text).width > maxW && s > 10) {
      s -= 2;
      g.font = `${font.replace('$', s)}`;
    }
    return s;
  }

  _draw(g, x, y, text, style, color, rng) {
    const cx = x + CW / 2, cy = y + CH / 2 + 2;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if (style === 'box') {
      const grd = g.createLinearGradient(0, y, 0, y + CH);
      grd.addColorStop(0, '#1d1a24');
      grd.addColorStop(1, '#0b0a10');
      g.fillStyle = grd;
      g.fillRect(x + 2, y + 2, CW - 4, CH - 4);
      g.strokeStyle = color;
      g.lineWidth = 3;
      g.strokeRect(x + 5, y + 5, CW - 10, CH - 10);
      this._fit(g, text, CW - 30, 40, '900 $px Impact, "Arial Black", sans-serif');
      g.fillStyle = '#fff6e8';
      g.shadowColor = color;
      g.shadowBlur = 10;
      g.fillText(text, cx, cy);
    } else if (style === 'neon') {
      this._fit(g, text, CW - 24, 42, 'italic 700 $px "Brush Script MT", "Trebuchet MS", cursive');
      g.shadowColor = color;
      g.shadowBlur = 16;
      g.lineWidth = 3;
      g.strokeStyle = color;
      g.strokeText(text, cx, cy);
      g.shadowBlur = 6;
      g.fillStyle = '#ffffff';
      g.fillText(text, cx, cy);
      g.strokeText(text, cx, cy);
    } else if (style === 'holo') {
      this._fit(g, text, CW - 20, 40, '700 $px "Courier New", monospace');
      g.shadowColor = color;
      g.shadowBlur = 18;
      g.fillStyle = color;
      g.fillText(text, cx, cy);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.shadowBlur = 4;
      g.fillText(text, cx, cy);
      g.fillStyle = color;
      for (let i = 0; i < CH; i += 4) {
        g.globalAlpha = 0.18;
        g.fillRect(x, y + i, CW, 1);
      }
      g.globalAlpha = 1;
      g.fillRect(x + 8, y + CH - 8, CW - 16, 2);
    } else if (style === 'paint') {
      g.fillStyle = '#3a3226';
      g.fillRect(x + 4, y + 6, CW - 8, CH - 12);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(0,0,0,${rng.range(0.05, 0.25)})`;
        g.fillRect(x + rng.range(0, CW), y + rng.range(0, CH), rng.range(4, 30), rng.range(2, 6));
      }
      this._fit(g, text, CW - 30, 38, '700 $px "Arial Black", sans-serif');
      g.fillStyle = color;
      g.fillText(text, cx + rng.range(-3, 3), cy);
      // drips
      for (let i = 0; i < 6; i++) g.fillRect(x + rng.range(30, CW - 30), cy + 10, 2, rng.range(4, 14));
    } else if (style === 'faded') {
      g.fillStyle = 'rgba(30,34,36,0.9)';
      g.fillRect(x + 2, y + 2, CW - 4, CH - 4);
      this._fit(g, text, CW - 20, 40, '700 $px "Courier New", monospace');
      g.fillStyle = 'rgba(150,170,170,0.55)';
      g.fillText(text, cx, cy);
      for (let i = 0; i < 25; i++) {
        g.fillStyle = `rgba(20,30,20,${rng.range(0.2, 0.6)})`;
        g.beginPath();
        g.arc(x + rng.range(0, CW), y + rng.range(0, CH), rng.range(2, 12), 0, Math.PI * 2);
        g.fill();
      }
    }
    g.shadowBlur = 0;
  }

  get(key) {
    return this.map.get(key) || this.map.get('n:OPEN');
  }
  random(set, rng) {
    const list = SIGN_SETS[set];
    const prefix = set === 'neon96' ? 'n:' : set === 'holo47' ? 'h:' : set === 'paint89' ? 'p:' : 's:';
    return this.get(prefix + rng.pick(list));
  }
}

// Emit a sign quad into a GeoBuffer facing direction (nx, nz)
export function signQuad(gb, s, cx, cy, cz, nx, nz, w, h, col, mode = 2, seed = 0) {
  const tx = nz, tz = -nx; // right-hand direction when facing the sign
  const hw = w / 2, hh = h / 2;
  const o = 0.02;
  const p0 = [cx - tx * hw + nx * o, cy - hh, cz - tz * hw + nz * o];
  const p1 = [cx + tx * hw + nx * o, cy - hh, cz + tz * hw + nz * o];
  const p2 = [cx + tx * hw + nx * o, cy + hh, cz + tz * hw + nz * o];
  const p3 = [cx - tx * hw + nx * o, cy + hh, cz - tz * hw + nz * o];
  // Note: tangent direction chosen so text reads left-to-right from the front
  gb.quad(p0, p1, p2, p3, [nx, 0, nz], [s.u0, s.v0], [s.u1, s.v0], [s.u1, s.v1], [s.u0, s.v1], col, [0, 0, seed, mode]);
}
