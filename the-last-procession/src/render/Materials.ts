import * as THREE from 'three';

/**
 * Shared material roles. Characters use toon shading (stepped gradient) for the
 * animated-film look; the colossal machines use PBR metal + panel-line textures so
 * they read as massive, ancient engineered objects.
 */

let toonRamp: THREE.DataTexture | null = null;
export function getToonRamp(): THREE.DataTexture {
  if (toonRamp) return toonRamp;
  const data = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 215, 215, 215, 255, 255, 255, 255, 255]);
  toonRamp = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  toonRamp.minFilter = THREE.NearestFilter;
  toonRamp.magFilter = THREE.NearestFilter;
  toonRamp.needsUpdate = true;
  return toonRamp;
}

const toonCache = new Map<string, THREE.MeshToonMaterial>();
export function toon(color: THREE.ColorRepresentation, emissive?: THREE.ColorRepresentation, emissiveIntensity = 1): THREE.MeshToonMaterial {
  const key = `${new THREE.Color(color).getHexString()}|${emissive ? new THREE.Color(emissive).getHexString() : ''}|${emissiveIntensity}`;
  let m = toonCache.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: getToonRamp() });
    if (emissive !== undefined) {
      m.emissive = new THREE.Color(emissive);
      m.emissiveIntensity = emissiveIntensity;
    }
    toonCache.set(key, m);
  }
  return m;
}

export const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x120c14, side: THREE.BackSide });

function canvasTex(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, repeat = 1): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Riveted panel plating with wear, used for all Processional hulls. */
export function panelTexture(base: string, line: string, seed: number): THREE.CanvasTexture {
  return canvasTex(512, (g, s) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    // tonal variation blotches (patina)
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(${r() > 0.5 ? '255,240,210' : '20,30,30'},${0.03 + r() * 0.05})`;
      g.beginPath();
      g.arc(r() * s, r() * s, 10 + r() * 60, 0, Math.PI * 2);
      g.fill();
    }
    // panel grid with offset rows
    g.strokeStyle = line;
    g.lineWidth = 3;
    const rows = 6;
    for (let y = 0; y < rows; y++) {
      const yy = (y * s) / rows;
      g.beginPath();
      g.moveTo(0, yy);
      g.lineTo(s, yy);
      g.stroke();
      const cols = 2 + Math.floor(r() * 3);
      for (let x = 0; x < cols; x++) {
        const xx = ((x + (y % 2) * 0.5) * s) / cols;
        g.beginPath();
        g.moveTo(xx, yy);
        g.lineTo(xx, yy + s / rows);
        g.stroke();
        // rivets
        g.fillStyle = line;
        for (let k = 0; k < 4; k++) {
          g.beginPath();
          g.arc(xx + 7, yy + 8 + (k * s) / rows / 4, 2.2, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    // glyph engravings
    g.strokeStyle = 'rgba(255,230,170,0.16)';
    g.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const cx = r() * s;
      const cy = r() * s;
      g.beginPath();
      g.arc(cx, cy, 8 + r() * 14, 0, Math.PI * (1 + r()));
      g.moveTo(cx, cy - 20);
      g.lineTo(cx, cy + 20);
      g.stroke();
    }
    // drip streaks
    for (let i = 0; i < 40; i++) {
      const x = r() * s;
      const y = r() * s;
      const grd = g.createLinearGradient(x, y, x, y + 80);
      grd.addColorStop(0, 'rgba(30,60,50,0.18)');
      grd.addColorStop(1, 'rgba(30,60,50,0)');
      g.fillStyle = grd;
      g.fillRect(x, y, 3 + r() * 4, 80);
    }
  });
}

export function stoneTexture(base: string, seed: number, courses = 8): THREE.CanvasTexture {
  return canvasTex(256, (g, s) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    const h = s / courses;
    for (let y = 0; y < courses; y++) {
      let x = (y % 2) * -h;
      while (x < s) {
        const w = h * (1.4 + r() * 1.2);
        const v = 0.85 + r() * 0.25;
        g.fillStyle = `rgba(${Math.floor(255 * v)},${Math.floor(245 * v)},${Math.floor(225 * v)},0.18)`;
        g.fillRect(x + 1, y * h + 1, w - 2, h - 2);
        g.strokeStyle = 'rgba(60,40,40,0.35)';
        g.lineWidth = 1.5;
        g.strokeRect(x, y * h, w, h);
        x += w;
      }
    }
  });
}

/** Window grid for city facades: lit and unlit windows. */
export function facadeTexture(wall: string, seed: number): THREE.CanvasTexture {
  return canvasTex(256, (g, s) => {
    const r = rng(seed);
    g.fillStyle = wall;
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(0,0,0,${r() * 0.05})`;
      g.fillRect(r() * s, r() * s, 6, 6);
    }
    const cols = 4;
    const rows = 4;
    for (let y = 0; y < rows; y++) {
      g.fillStyle = 'rgba(80,50,40,0.25)';
      g.fillRect(0, (y * s) / rows + s / rows - 6, s, 4);
      for (let x = 0; x < cols; x++) {
        const cx = (x + 0.5) * (s / cols);
        const cy = (y + 0.45) * (s / rows);
        const lit = r() > 0.55;
        g.fillStyle = lit ? '#ffcc7a' : '#2b2a3a';
        g.beginPath();
        g.moveTo(cx - 9, cy + 16);
        g.lineTo(cx - 9, cy - 8);
        g.arc(cx, cy - 8, 9, Math.PI, 0);
        g.lineTo(cx + 9, cy + 16);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(60,35,30,0.6)';
        g.lineWidth = 2;
        g.stroke();
      }
    }
  });
}

export function roofTexture(color: string, seed: number): THREE.CanvasTexture {
  return canvasTex(128, (g, s) => {
    const r = rng(seed);
    g.fillStyle = color;
    g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 8) {
      for (let x = (y / 8) % 2 ? -6 : 0; x < s; x += 12) {
        g.fillStyle = `rgba(${r() > 0.5 ? '255,220,180' : '60,20,10'},${0.08 + r() * 0.12})`;
        g.fillRect(x, y, 11, 7);
      }
    }
  });
}

export function groundTexture(a: string, b: string, seed: number, repeat: number): THREE.CanvasTexture {
  return canvasTex(256, (g, s) => {
    const r = rng(seed);
    g.fillStyle = a;
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = r() > 0.5 ? b : 'rgba(255,255,255,0.05)';
      g.globalAlpha = 0.15 + r() * 0.25;
      const w = 2 + r() * 5;
      g.fillRect(r() * s, r() * s, w, w * (0.3 + r()));
    }
    g.globalAlpha = 1;
  }, repeat);
}

export function cobbleTexture(seed: number, repeat: number): THREE.CanvasTexture {
  return canvasTex(256, (g, s) => {
    const r = rng(seed);
    g.fillStyle = '#7b6a5d';
    g.fillRect(0, 0, s, s);
    const n = 10;
    const cs = s / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = 0.75 + r() * 0.35;
        g.fillStyle = `rgb(${Math.floor(176 * v)},${Math.floor(158 * v)},${Math.floor(138 * v)})`;
        const ox = (y % 2) * cs * 0.5;
        g.beginPath();
        g.roundRect?.(x * cs + ox + 1.5, y * cs + 1.5, cs - 3, cs - 3, 5);
        if (!g.roundRect) g.rect(x * cs + ox + 1.5, y * cs + 1.5, cs - 3, cs - 3);
        g.fill();
      }
    }
  }, repeat);
}

/** Soft radial sprite used by particles, glows and blob shadows. */
let radial: THREE.CanvasTexture | null = null;
export function radialTexture(): THREE.CanvasTexture {
  if (radial) return radial;
  radial = canvasTex(64, (g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
  });
  radial.colorSpace = THREE.NoColorSpace;
  return radial;
}

export function blobShadow(radius: number, opacity = 0.45): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: radialTexture(), color: 0x000000, transparent: true, opacity, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  return m;
}

export interface MetalSet {
  hull: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  glow: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
}

const metalCache = new Map<string, MetalSet>();
export function metalSet(kind: 'bronze' | 'verdigris' | 'ivory' | 'iron'): MetalSet {
  const hit = metalCache.get(kind);
  if (hit) return hit;
  const palette = {
    bronze: { base: '#8a6a45', line: 'rgba(40,25,10,0.55)', trim: '#d6a85c', glow: '#ffd27a', stone: '#9c8f7c' },
    verdigris: { base: '#5d8277', line: 'rgba(15,35,30,0.6)', trim: '#c79a52', glow: '#7ff3ff', stone: '#8a8d82' },
    ivory: { base: '#cfc4ad', line: 'rgba(70,55,40,0.5)', trim: '#c9a050', glow: '#ffe7a6', stone: '#b9ad98' },
    iron: { base: '#4a4a52', line: 'rgba(10,10,15,0.6)', trim: '#a07a46', glow: '#ff7a4a', stone: '#6a6460' },
  }[kind];
  const seed = kind.length * 97;
  const hullTex = panelTexture(palette.base, palette.line, seed);
  hullTex.repeat.set(2, 2);
  const set: MetalSet = {
    hull: new THREE.MeshStandardMaterial({ map: hullTex, metalness: 0.55, roughness: 0.55, envMapIntensity: 0.9 }),
    dark: new THREE.MeshStandardMaterial({ color: '#2a2622', metalness: 0.7, roughness: 0.5 }),
    trim: new THREE.MeshStandardMaterial({ color: palette.trim, metalness: 0.9, roughness: 0.32 }),
    stone: new THREE.MeshStandardMaterial({ map: stoneTexture(palette.stone, seed + 3, 6), roughness: 0.9, metalness: 0 }),
    glow: new THREE.MeshStandardMaterial({ color: '#111', emissive: palette.glow, emissiveIntensity: 2.4, roughness: 0.5 }),
    glass: new THREE.MeshStandardMaterial({ color: '#203040', emissive: palette.glow, emissiveIntensity: 0.6, metalness: 0.2, roughness: 0.15 }),
  };
  metalCache.set(kind, set);
  return set;
}
