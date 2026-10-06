import * as THREE from 'three';
import { tfbm } from './Textures';
import { createSeededRandom } from '../utils/random';

/**
 * Painted 512px ground textures (albedo; luminance doubles as the bump height) and a triplanar
 * terrain material: rock on slopes, grass/moss on flats, dirt patches and a soft road shoulder,
 * with per-pixel relief from screen-space derivatives. No UV stretching on cliffs.
 */

function canvasTex(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function fill(ctx: CanvasRenderingContext2D, s: number, fn: (x: number, y: number) => [number, number, number]): void {
  const img = ctx.createImageData(s, s);
  for (let y = 0; y < s; y += 1) {
    for (let x = 0; x < s; x += 1) {
      const [r, g, b] = fn(x, y);
      const o = (y * s + x) * 4;
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export type GroundPalette = 'mountain' | 'witchwood' | 'marsh' | 'snow' | 'hollow';

type PalDef = {
  rock: [number, number, number];
  lichen: [number, number, number];
  grass: [number, number, number];
  /** Blade strokes: base r,g,b and lit range r,g,b. */
  blade: [number, number, number, number, number, number, number];
  dirt: [number, number, number];
  flower: string;
  snowLine: number;
  bright: number;
};
const PALS: Record<GroundPalette, PalDef> = {
  mountain: { rock: [0.86, 0.9, 0.98], lichen: [25, 28, 5], grass: [52, 70, 40], blade: [70, 90, 50, 70, 80, 30, 0.5], dirt: [1.0, 0.88, 0.72], flower: 'warm', snowLine: 200, bright: 1.9 },
  witchwood: { rock: [0.78, 0.86, 0.78], lichen: [10, 30, 0], grass: [24, 54, 30], blade: [40, 80, 40, 60, 90, 40, 0.55], dirt: [0.9, 0.78, 0.6], flower: 'teal', snowLine: 9999, bright: 1.35 },
  marsh: { rock: [0.62, 0.68, 0.62], lichen: [8, 22, 6], grass: [44, 50, 28], blade: [56, 62, 30, 50, 60, 26, 0.55], dirt: [0.66, 0.58, 0.44], flower: 'pale', snowLine: 9999, bright: 1.55 },
  snow: { rock: [0.8, 0.85, 0.96], lichen: [6, 8, 14], grass: [196, 204, 218], blade: [210, 216, 230, 30, 30, 25, 0.08], dirt: [0.86, 0.84, 0.86], flower: 'none', snowLine: 9999, bright: 1.18 },
  hollow: { rock: [1.08, 0.98, 0.84], lichen: [70, -14, -18], grass: [72, 62, 58], blade: [80, 70, 62, 40, 30, 28, 0.4], dirt: [0.72, 0.62, 0.6], flower: 'ember', snowLine: 9999, bright: 1.5 },
};

export function groundTextures(p: GroundPalette) {
  const wood = p === 'witchwood';
  const P = PALS[p];
  void wood;
  const rock = canvasTex(512, (ctx, s) => {
    fill(ctx, s, (x, y) => {
      const n = tfbm(x / 40, y / 40, 13, 5, 6);
      const strata = Math.sin((y / s) * Math.PI * 18 + tfbm(x / 60, y / 60, 9, 2, 3) * 8) * 0.5 + 0.5;
      const crack = Math.abs(tfbm(x / 22, y / 70, 23, 9, 3) - 0.5) < 0.025 ? 0.45 : 1;
      const v = (60 + n * 95 + strata * 28) * crack;
      const lichen = tfbm(x / 18, y / 18, 28, 33, 3) > 0.62 ? 1 : 0;
      return [v * P.rock[0] + lichen * P.lichen[0], v * P.rock[1] + lichen * P.lichen[1], v * P.rock[2] + lichen * P.lichen[2]];
    });
  });
  const grass = canvasTex(512, (ctx, s) => {
    const rng = createSeededRandom(wood ? 71 : 70);
    fill(ctx, s, (x, y) => {
      const n = tfbm(x / 30, y / 30, 17, 41, 5);
      const fine = tfbm(x / 3, y / 3, 170, 44, 2);
      const v = 0.55 + n * 0.55 + fine * 0.25;
      return [P.grass[0] * v, P.grass[1] * v, P.grass[2] * v];
    });
    // Blade strokes: thousands of short lit/shaded strokes.
    for (let i = 0; i < 9000; i += 1) {
      const x = rng() * s;
      const y = rng() * s;
      const l = 2 + rng() * 5;
      const lit = rng();
      const b = P.blade;
      ctx.strokeStyle = `rgba(${b[0] + lit * b[3]},${b[1] + lit * b[4]},${b[2] + lit * b[5]},${b[6]})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 2, y - l);
      ctx.stroke();
    }
    // Small flowers / dry tufts.
    for (let i = 0; i < (P.flower === 'none' ? 0 : 120); i += 1) {
      ctx.fillStyle = P.flower === 'teal' ? `rgba(120,200,170,${0.3 + rng() * 0.4})` : P.flower === 'ember' ? `rgba(255,${80 + rng() * 60},30,0.5)` : P.flower === 'pale' ? `rgba(190,190,150,0.45)` : `rgba(${180 + rng() * 60},${160 + rng() * 60},${90},0.5)`;
      ctx.fillRect(rng() * s, rng() * s, 2, 2);
    }
  });
  const dirt = canvasTex(512, (ctx, s) => {
    const rng = createSeededRandom(72);
    fill(ctx, s, (x, y) => {
      const n = tfbm(x / 26, y / 26, 20, 61, 5);
      const v = 48 + n * 60;
      return [v * P.dirt[0], v * P.dirt[1], v * P.dirt[2]];
    });
    for (let i = 0; i < 900; i += 1) {
      const r = 1 + rng() * 4;
      const x = rng() * s;
      const y = rng() * s;
      const t = 80 + rng() * 70;
      ctx.fillStyle = `rgb(${t},${t * 0.95},${t * 0.88})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.6 + rng() * 0.4), rng() * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(x + r * 0.4, y + r * 0.5, r, r * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  const macro = canvasTex(256, (_ctx, s) => {
    fill(_ctx, s, (x, y) => {
      const a = tfbm(x / 32, y / 32, 8, 91, 5);
      const b = tfbm(x / 12, y / 12, 21, 92, 4);
      return [a * 255, b * 255, (a * 0.5 + b * 0.5) * 255];
    });
  });
  macro.colorSpace = THREE.NoColorSpace;
  return { rock, grass, dirt, macro };
}

/** Road mask over the terrain bounds: soft shoulders where the ground turns to dirt/gravel. */
export function roadMask(points: Array<{ x: number; z: number; w: number }>, x0: number, z0: number, x1: number, z1: number): THREE.CanvasTexture {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  const sx = size / (x1 - x0);
  const sz = size / (z1 - z0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [extra, alpha] of [[10, 0.35], [5, 0.6], [2, 1]] as const) {
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1];
      const b = points[i];
      ctx.lineWidth = (b.w + extra * 2) * sx;
      ctx.beginPath();
      ctx.moveTo((a.x - x0) * sx, (a.z - z0) * sz);
      ctx.lineTo((b.x - x0) * sx, (b.z - z0) * sz);
      ctx.stroke();
    }
  }
  ctx.filter = 'blur(4px)';
  ctx.drawImage(c, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.flipY = false;
  return t;
}

const PERTURB = `
vec3 tsPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir) {
  vec3 vSigmaX = dFdx(surf_pos.xyz);
  vec3 vSigmaY = dFdy(surf_pos.xyz);
  vec3 R1 = cross(vSigmaY, surf_norm);
  vec3 R2 = cross(surf_norm, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDir;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}`;

export function terrainMaterial(p: GroundPalette, mask: THREE.Texture, bounds: [number, number, number, number]): THREE.MeshStandardMaterial {
  const tex = groundTextures(p);
  const m = new THREE.MeshStandardMaterial({ roughness: 0.94, metalness: 0, vertexColors: true });
  const u = {
    tRock: { value: tex.rock },
    tGrass: { value: tex.grass },
    tDirt: { value: tex.dirt },
    tMacro: { value: tex.macro },
    tMask: { value: mask },
    uBounds: { value: new THREE.Vector4(...bounds) },
    uSnowLine: { value: PALS[p].snowLine },
    uBright: { value: PALS[p].bright },
    uBump: { value: 2.2 },
  };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTWP;\nvarying vec3 vTWN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvTWP = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvTWN = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vTWP; varying vec3 vTWN;
         uniform sampler2D tRock, tGrass, tDirt, tMacro, tMask; uniform vec4 uBounds; uniform float uSnowLine, uBump, uBright;
         ${PERTURB}
         vec3 triplanar(sampler2D t, vec3 p, vec3 w, float s) {
           return texture2D(t, p.zy * s).rgb * w.x + texture2D(t, p.xz * s).rgb * w.y + texture2D(t, p.xy * s).rgb * w.z;
         }`,
      )
      .replace(
        '#include <map_fragment>',
        `vec3 tn = normalize(vTWN);
         vec3 tw = pow(abs(tn), vec3(5.0)); tw /= (tw.x + tw.y + tw.z);
         vec4 mac = texture2D(tMacro, vTWP.xz * 0.0045);
         vec3 rockC = triplanar(tRock, vTWP, tw, 0.055) * 0.55 + triplanar(tRock, vTWP, tw, 0.21) * 0.45;
         vec3 grassC = texture2D(tGrass, vTWP.xz * 0.14).rgb * 0.6 + texture2D(tGrass, vTWP.xz * 0.037).rgb * 0.4;
         vec3 dirtC = texture2D(tDirt, vTWP.xz * 0.16).rgb;
         grassC *= mix(vec3(0.82, 0.9, 0.75), vec3(1.15, 1.08, 0.92), mac.r);
         float flatK = smoothstep(0.62 + mac.g * 0.12, 0.86, tn.y);
         vec2 muv = (vTWP.xz - uBounds.xy) / (uBounds.zw - uBounds.xy);
         float road = texture2D(tMask, muv).r;
         float dirtAmt = clamp(smoothstep(0.55, 0.75, mac.b) * 0.7 + road * (0.75 + mac.g * 0.4), 0.0, 1.0);
         vec3 ground = mix(grassC, dirtC, dirtAmt);
         vec3 col = mix(rockC, ground, flatK);
         float snow = smoothstep(uSnowLine, uSnowLine + 50.0, vTWP.y + mac.r * 30.0) * smoothstep(0.5, 0.8, tn.y);
         col = mix(col, vec3(0.78, 0.82, 0.9), snow);
         float tHgt = dot(col, vec3(0.33));
         diffuseColor.rgb *= col * uBright;`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
         normal = tsPerturb(-vViewPosition, normal, vec2(dFdx(tHgt), dFdy(tHgt)) * uBump, faceDirection);`,
      );
  };
  m.customProgramCacheKey = () => `terrain-${p}`;
  return m;
}

/** Ragged, blended road edges: discard noisy fragments toward the ribbon's sides. */
export function roadEdges(m: THREE.MeshStandardMaterial, key: string): THREE.MeshStandardMaterial {
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aEdge;\nvarying float vEdge;\nvarying vec3 vRWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvEdge = aEdge;\nvRWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying float vEdge;\nvarying vec3 vRWP;\nfloat rhash(vec2 p){ return fract(sin(dot(p, vec2(41.7, 289.3))) * 43758.5); }\nfloat rnoise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(rhash(i),rhash(i+vec2(1,0)),f.x),mix(rhash(i+vec2(0,1)),rhash(i+vec2(1,1)),f.x),f.y); }`)
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
         float e = abs(vEdge);
         float rn = rnoise(vRWP.xz * 0.9) * 0.6 + rnoise(vRWP.xz * 3.1) * 0.4;
         if (e > 0.8 + rn * 0.2) discard;
         diffuseColor.rgb *= mix(1.0, 0.72, smoothstep(0.55, 0.95, e));`,
      );
  };
  m.customProgramCacheKey = () => `road-${key}`;
  return m;
}
