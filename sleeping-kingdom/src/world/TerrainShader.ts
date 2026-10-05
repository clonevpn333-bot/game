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

export type GroundPalette = 'mountain' | 'witchwood';

export function groundTextures(p: GroundPalette) {
  const wood = p === 'witchwood';
  const rock = canvasTex(512, (ctx, s) => {
    fill(ctx, s, (x, y) => {
      const n = tfbm(x / 40, y / 40, 13, 5, 6);
      const strata = Math.sin((y / s) * Math.PI * 18 + tfbm(x / 60, y / 60, 9, 2, 3) * 8) * 0.5 + 0.5;
      const crack = Math.abs(tfbm(x / 22, y / 70, 23, 9, 3) - 0.5) < 0.025 ? 0.45 : 1;
      const v = (60 + n * 95 + strata * 28) * crack;
      const lichen = tfbm(x / 18, y / 18, 28, 33, 3) > 0.62 ? 1 : 0;
      return wood
        ? [v * 0.78 + lichen * 10, v * 0.86 + lichen * 30, v * 0.78]
        : [v * 0.86 + lichen * 25, v * 0.9 + lichen * 28, v * 0.98 + lichen * 5];
    });
  });
  const grass = canvasTex(512, (ctx, s) => {
    const rng = createSeededRandom(wood ? 71 : 70);
    fill(ctx, s, (x, y) => {
      const n = tfbm(x / 30, y / 30, 17, 41, 5);
      const fine = tfbm(x / 3, y / 3, 170, 44, 2);
      const v = 0.55 + n * 0.55 + fine * 0.25;
      return wood ? [24 * v, 54 * v, 30 * v] : [52 * v, 70 * v, 40 * v];
    });
    // Blade strokes: thousands of short lit/shaded strokes.
    for (let i = 0; i < 9000; i += 1) {
      const x = rng() * s;
      const y = rng() * s;
      const l = 2 + rng() * 5;
      const lit = rng();
      ctx.strokeStyle = wood
        ? `rgba(${40 + lit * 60},${80 + lit * 90},${40 + lit * 40},0.55)`
        : `rgba(${70 + lit * 70},${90 + lit * 80},${50 + lit * 30},0.5)`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 2, y - l);
      ctx.stroke();
    }
    // Small flowers / dry tufts.
    for (let i = 0; i < 120; i += 1) {
      ctx.fillStyle = wood ? `rgba(120,200,170,${0.3 + rng() * 0.4})` : `rgba(${180 + rng() * 60},${160 + rng() * 60},${90},0.5)`;
      ctx.fillRect(rng() * s, rng() * s, 2, 2);
    }
  });
  const dirt = canvasTex(512, (ctx, s) => {
    const rng = createSeededRandom(72);
    fill(ctx, s, (x, y) => {
      const n = tfbm(x / 26, y / 26, 20, 61, 5);
      const v = 48 + n * 60;
      return wood ? [v * 0.9, v * 0.78, v * 0.6] : [v * 1.0, v * 0.88, v * 0.72];
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
    uSnowLine: { value: p === 'witchwood' ? 9999 : 200 },
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
         uniform sampler2D tRock, tGrass, tDirt, tMacro, tMask; uniform vec4 uBounds; uniform float uSnowLine, uBump;
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
         diffuseColor.rgb *= col * (uSnowLine > 9000.0 ? 1.35 : 1.9);`,
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
