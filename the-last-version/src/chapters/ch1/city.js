// Halden: a procedurally laid out (but seeded, so always identical) city grid
// with architectural buildings, storefronts, rooftops, wet streets and props.
import * as THREE from 'three';
import { pbr, preloadSets, model, flattenModel, makeInstanced } from '../../engine/assets.js';
import { warpMaterial, WARP_GLSL, warpVertex } from './warp.js';

export const CITY = { P: 130, S: 26, N: 10 }; // block pitch, street width, blocks per side
CITY.B = CITY.P - CITY.S;                     // block size
CITY.HALF = CITY.S / 2;
export const CITY_TEXTURES = ['asphalt', 'sidewalk', 'brick_red', 'brick_dark', 'concrete_wall', 'plaster', 'facade_tiles', 'concrete_facade', 'metal_plate', 'corrugated', 'shutter'];

// deterministic RNG
export function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

// ---------------------------------------------------------------------------
// Facade material: punched / ribbon / curtain-wall windows with recessed
// frames, sills and interior-mapped rooms (lit or dark), over a PBR wall.
// ---------------------------------------------------------------------------
const FACADE_GLSL = /* glsl */`
varying vec2 vFUv; varying vec4 vFP; varying vec3 vFTint; varying vec3 vWPos; varying vec3 vWN;
uniform float uWinW, uWinH, uStyle, uLit, uNight, uTime; uniform vec3 uFrame, uGlass; uniform vec4 uVersion;
float h21(vec2 p){ p = mod(p, 289.0); vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 roomColor(vec2 cell, float seed, vec3 hit, vec3 dims, float lit){
  float h = h21(cell + seed * 7.13);
  vec3 warm = vec3(1.0, 0.72, 0.42), cool = vec3(0.75, 0.88, 1.0), tv = vec3(0.35, 0.5, 1.0);
  vec3 lc = h < 0.55 ? warm : (h < 0.85 ? cool : tv);
  vec3 wall = mix(vec3(0.55, 0.5, 0.45), vec3(0.4, 0.45, 0.5), h21(cell * 3.1 + seed));
  vec3 c;
  // hit.x across, hit.y up, hit.z depth
  if (hit.z > dims.z - 0.01) {           // back wall with a piece of furniture / picture
    c = wall;
    vec2 f = vec2(hit.x / dims.x, hit.y / dims.y);
    if (abs(f.x - 0.3 - h * 0.4) < 0.18 && f.y < 0.35) c *= 0.35;
    if (abs(f.x - 0.65) < 0.08 && abs(f.y - 0.6) < 0.08) c = mix(c, vec3(0.6, 0.3, 0.2), 0.7);
  } else if (hit.y < 0.01) c = wall * 0.45;               // floor
  else if (hit.y > dims.y - 0.01) c = wall * 1.25;        // ceiling
  else c = wall * 0.85;                                    // side walls
  float fall = 1.0 - hit.z / dims.z * 0.45;
  return c * lc * fall * (0.06 + lit * 1.5);
}
`;

export function facadeMaterial(textureKey, o = {}) {
  const m = pbr(textureKey, { size: o.size ?? 3, color: o.color ?? 0xffffff, normal: o.normal ?? 1 });
  m.vertexColors = false;
  const U = {
    uWinW: { value: o.winW ?? 0.42 }, uWinH: { value: o.winH ?? 0.55 }, uStyle: { value: o.style ?? 0 },
    uLit: { value: o.lit ?? 0.35 }, uNight: { value: 1 }, uTime: { value: 0 },
    uFrame: { value: new THREE.Color(o.frame ?? 0x2a2a2a) }, uGlass: { value: new THREE.Color(o.glass ?? 0x111a22) },
  };
  m.userData.facade = U;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 fparams; attribute vec3 ftint;\nvarying vec2 vFUv; varying vec4 vFP; varying vec3 vFTint; varying vec3 vWPos; varying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFUv = uv; vFP = fparams; vFTint = ftint; vWPos = (modelMatrix * vec4(position,1.0)).xyz; vWN = normalize(mat3(modelMatrix) * normal);');
    warpVertex(sh, { fold: true });
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FACADE_GLSL)
      .replace('#include <map_fragment>', `#include <map_fragment>
        diffuseColor.rgb *= vFTint;
        float tlvWin = 0.0; vec3 tlvEmit = vec3(0.0); float tlvFrame = 0.0; float tlvSill = 0.0;
        if (abs(vWN.y) < 0.5 && vFP.x > 0.0) {
          vec2 fu = vec2(vFUv.x, vFUv.y - vFP.z);
          if (fu.y > 0.0) {
            float sp = vFP.x, fh = vFP.y;
            vec2 cell = floor(vec2(fu.x / sp, fu.y / fh));
            vec2 lc = vec2(fract(fu.x / sp), fract(fu.y / fh));
            vec2 hw = vec2(uWinW, uWinH) * 0.5;
            if (uStyle > 1.5) hw = vec2(0.47, 0.44);
            vec2 d = abs(lc - vec2(0.5, 0.54));
            float fw = 0.07 / sp, fhh = 0.07 / fh;
            tlvWin = step(d.x, hw.x) * step(d.y, hw.y);
            float outer = step(d.x, hw.x + fw) * step(d.y, hw.y + fhh);
            tlvFrame = outer * (1.0 - tlvWin);
            // mullion: vertical split for punched windows, grid for curtain walls
            if (uStyle < 0.5) { tlvFrame = max(tlvFrame, tlvWin * step(abs(lc.x - 0.5), 0.025 / sp * 1.2) ); tlvFrame = max(tlvFrame, tlvWin * step(abs(lc.y - 0.66), 0.02 / fh * 1.5)); }
            if (uStyle > 1.5) tlvFrame = max(tlvFrame, tlvWin * step(abs(fract(lc.x * 2.0) - 0.5), 0.03));
            tlvWin *= 1.0 - tlvFrame;
            tlvSill = step(abs(lc.y - (0.54 - hw.y - fhh - 0.035)), 0.035) * step(d.x, hw.x + fw * 2.0) * (uStyle < 0.5 ? 1.0 : 0.0);
            // version overlay hides windows in the "other" reality
            float vmask = 0.0;
            if (uVersion.x > 0.0) { float dd = length(vWPos.xz - uVersion.yz); vmask = uVersion.x * smoothstep(uVersion.w, uVersion.w * 0.6, dd + sin(vWPos.y * 0.3 + uTime * 3.0) * 12.0 * h21(floor(vWPos.xz / 8.0))); }
            tlvWin *= 1.0 - vmask; tlvFrame *= 1.0 - vmask; tlvSill *= 1.0 - vmask;
            if (vmask > 0.01) {
              vec2 st = vec2(fu.x / 1.1 + floor(fu.y / 0.55) * 0.5, fu.y / 0.55);
              vec2 sf = fract(st);
              float mortar = step(0.94, max(sf.x, sf.y * 1.0));
              vec3 stone = mix(vec3(0.42, 0.4, 0.36), vec3(0.55, 0.52, 0.47), h21(floor(st))) * (1.0 - mortar * 0.6);
              diffuseColor.rgb = mix(diffuseColor.rgb, stone, vmask);
            }
            if (tlvWin > 0.5) {
              // interior mapping: march the view ray into a box room behind the glass
              vec3 N = normalize(vWN), T = normalize(cross(vec3(0.0, 1.0, 0.0), N));
              vec3 V = normalize(vWPos - cameraPosition);
              vec3 v = vec3(dot(V, T), V.y, dot(V, -N));
              vec3 dims = vec3(sp, fh, 4.5);
              vec3 p0 = vec3(lc.x * sp, lc.y * fh, 0.0);
              float tx = v.x > 0.0 ? (sp - p0.x) / v.x : -p0.x / v.x;
              float ty = v.y > 0.0 ? (fh - p0.y) / v.y : -p0.y / v.y;
              float tz = dims.z / max(v.z, 1e-3);
              float t = min(tx, min(ty, tz));
              vec3 hit = p0 + v * t;
              float sd = floor(vFP.w + 0.5);
              float lit = step(h21(cell + sd * 3.0), uLit) * uNight;
              float flick = (h21(cell + floor(uTime * 0.2)) > 0.995) ? 0.0 : 1.0;
              vec3 room = roomColor(cell, sd, hit, dims, lit * flick);
              // blinds
              float blind = h21(cell * 1.7 + sd);
              if (lc.y > 0.54 + hw.y - blind * hw.y * 1.4) room = mix(room, vec3(0.8, 0.75, 0.6) * (0.08 + lit * 0.9), 0.85);
              // recess shadow along the top and left edges
              float sh = smoothstep(0.0, 0.12, (0.54 + hw.y) - lc.y) * smoothstep(0.0, 0.06, lc.x - (0.5 - hw.x));
              tlvEmit = room * (0.35 + 0.65 * sh);
              diffuseColor.rgb = uGlass;
            }
            if (tlvFrame > 0.5) diffuseColor.rgb = uFrame;
            if (tlvSill > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.6, 0.56), 0.8);
          }
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        if (tlvWin > 0.5) roughnessFactor = 0.06; else if (tlvFrame > 0.5) roughnessFactor = 0.45;`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        if (tlvFrame > 0.5) metalnessFactor = 0.6; if (tlvWin > 0.5) metalnessFactor = 0.0;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (tlvWin > 0.5 || tlvFrame > 0.5) normal = nonPerturbedNormal;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += tlvEmit;`);
  };
  m.customProgramCacheKey = () => 'facade';
  return m;
}

// ---------------------------------------------------------------------------
// Ground: asphalt / sidewalk / markings / wetness in one shader over a plane
// ---------------------------------------------------------------------------
function groundMaterial() {
  const m = pbr('asphalt', { size: 6, color: 0x9a9a9a, normal: 1.2 });
  const side = pbr('sidewalk', { size: 3 });
  const U = { tSideMap: { value: side.map }, tSideNor: { value: side.normalMap }, uP: { value: CITY.P }, uHalf: { value: CITY.HALF }, uN: { value: CITY.N }, uWet: { value: 0.75 }, uTime: { value: 0 } };
  m.userData.ground = U;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvGW = (modelMatrix * vec4(position, 1.0)).xyz;');
    warpVertex(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vGW; uniform sampler2D tSideMap, tSideNor; uniform float uP, uHalf, uN, uWet, uTime; uniform mat3 normalMatrix;
      float gh(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.7); }
      float gnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(gh(i), gh(i+vec2(1,0)), f.x), mix(gh(i+vec2(0,1)), gh(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * gnoise(p); p *= 2.03; a *= 0.5; } return s; }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec2 gp = vGW.xz;
        vec2 cl = mod(gp + uP * 0.5, uP) - uP * 0.5;      // offset from nearest street centreline
        vec2 a = abs(cl);
        bool roadX = a.x < uHalf, roadZ = a.y < uHalf;     // inside a N-S street / E-W street
        bool road = roadX || roadZ;
        bool inter = roadX && roadZ;
        float onSide = 0.0, mark = 0.0; vec3 markCol = vec3(0.92);
        float sideW = 5.5;
        if (!road) {
          float edge = min(a.x, a.y) - uHalf;
          if (edge < sideW) { onSide = 1.0; }
        }
        if (onSide > 0.5) {
          vec4 sc = texture2D(tSideMap, gp / 3.0);
          diffuseColor.rgb = sc.rgb * 0.95;
          float curb = min(a.x, a.y) - uHalf;
          if (curb < 0.35) diffuseColor.rgb = vec3(0.55, 0.54, 0.5) * (0.8 + 0.2 * gnoise(gp * 4.0));
        } else if (road) {
          // lane markings (centre double yellow, dashed lane lines, stop lines, crosswalks)
          float along = roadX && !roadZ ? gp.y : gp.x;
          float across = roadX && !roadZ ? cl.x : cl.y;
          if (!inter) {
            if (abs(abs(across) - 0.18) < 0.07) { mark = 1.0; markCol = vec3(0.95, 0.72, 0.18); }
            if (abs(abs(across) - uHalf * 0.5) < 0.07 && fract(along / 9.0) < 0.45) mark = 1.0;
            float toInter = (roadX && !roadZ) ? a.y - uHalf : a.x - uHalf;
            if (toInter > 0.0 && toInter < 4.5 && abs(across) < uHalf - 0.6 && fract(along / 1.4) < 0.55) mark = 1.0;  // zebra crossing
            if (abs(toInter - 5.2) < 0.25 && abs(across) < uHalf - 0.5) mark = 1.0;                                    // stop line
          }
          // tyre tracks: darker, smoother bands in each lane
          float lane = abs(abs(across) - uHalf * 0.5 + (abs(across) > uHalf * 0.5 ? -1.0 : 1.0) * uHalf * 0.25);
          float track = smoothstep(1.6, 0.4, abs(lane - 0.9)) * 0.12 * (inter ? 0.0 : 1.0);
          diffuseColor.rgb *= 1.0 - track;
          // worn markings
          mark *= smoothstep(0.25, 0.6, fbm(gp * 0.9));
          diffuseColor.rgb = mix(diffuseColor.rgb, markCol * 0.85, mark);
          // patches and cracks
          float patchN = fbm(gp * 0.05);
          if (patchN > 0.62) diffuseColor.rgb *= 0.82;
        } else {
          diffuseColor.rgb = vec3(0.16, 0.16, 0.15); // inside blocks (hidden by buildings)
        }
        // wet puddles
        float wetN = fbm(gp * 0.07 + 3.0);
        float puddle = smoothstep(0.52, 0.6, wetN) * uWet * (road ? 1.0 : 0.6);
        diffuseColor.rgb *= 1.0 - puddle * 0.45 - uWet * 0.12;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor * (1.0 - uWet * 0.35), 0.03, puddle);
        if (mark > 0.5) roughnessFactor = max(roughnessFactor, 0.35);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (onSide > 0.5) { vec3 sn = texture2D(tSideNor, gp / 3.0).xyz * 2.0 - 1.0; normal = normalize(normal + (normalMatrix * vec3(sn.x, 0.0, -sn.y)) * 0.6); }
        normal = normalize(mix(normal, nonPerturbedNormal, puddle * 0.97));
        // raindrop ripples in puddles
        if (puddle > 0.3) { vec2 rc = floor(gp * 2.0); float ph = fract(uTime * 0.7 + gh(rc)); float rr = length(fract(gp * 2.0) - 0.5) - ph * 0.5; normal = normalize(normal + (normalMatrix * vec3(0.0, 0.0, 1.0)) * 0.0 + vec3(sin(rr * 60.0) * 0.06 * (1.0 - ph) * smoothstep(0.1, 0.0, abs(rr)))); }`);
  };
  m.customProgramCacheKey = () => 'ground';
  return m;
}

// ---------------------------------------------------------------------------
// Geometry accumulator (per material) with facade attributes
// ---------------------------------------------------------------------------
class Acc {
  constructor() { this.p = []; this.n = []; this.uv = []; this.fp = []; this.ft = []; this.i = []; }
  quad(a, b, c, d, n, uvs, fp, ft) {
    const base = this.p.length / 3;
    for (const v of [a, b, c, d]) this.p.push(v[0], v[1], v[2]);
    for (let k = 0; k < 4; k++) { this.n.push(n[0], n[1], n[2]); this.fp.push(...fp); this.ft.push(...ft); }
    for (const u of uvs) this.uv.push(u[0], u[1]);
    this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  /** Axis-aligned box. Side UVs: u along face tangent (cross(up, n)), v = world y. */
  box(x0, x1, y0, y1, z0, z1, fp = [0, 0, 0, 0], ft = [1, 1, 1], { top = true, bottom = false, sides = true } = {}) {
    if (sides) {
      // +Z face: tangent +X
      this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], fp, ft);
      // -Z face: tangent -X
      this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [[-x1, y0], [-x0, y0], [-x0, y1], [-x1, y1]], fp, ft);
      // +X face: tangent -Z
      this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [[-z1, y0], [-z0, y0], [-z0, y1], [-z1, y1]], fp, ft);
      // -X face: tangent +Z
      this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [[z0, y0], [z1, y0], [z1, y1], [z0, y1]], fp, ft);
    }
    if (top) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], [[x0, z1], [x1, z1], [x1, z0], [x0, z0]], [0, 0, 0, 0], ft);
    if (bottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], [0, 0, 0, 0], ft);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('fparams', new THREE.Float32BufferAttribute(this.fp, 4));
    g.setAttribute('ftint', new THREE.Float32BufferAttribute(this.ft, 3));
    g.setIndex(this.i);
    g.computeBoundingSphere();
    return g;
  }
}

// Storefront glazing: lit shop interiors with shelves, mullions and a door
function shopTexture() {
  if (shopTexture.t) return shopTexture.t;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#f6d7a6'); gr.addColorStop(1, '#6a4a2a');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(${40 + i * 20},${30 + i * 12},20,0.7)`; g.fillRect(20 + i * 80, 120 + (i % 2) * 20, 60, 136); }
  g.fillStyle = 'rgba(30,20,10,0.8)'; for (let y = 60; y < 256; y += 46) g.fillRect(0, y, 512, 4);
  g.fillStyle = '#222'; g.fillRect(0, 0, 512, 10); g.fillRect(0, 246, 512, 10); g.fillRect(250, 0, 12, 256); g.fillRect(0, 0, 10, 256); g.fillRect(502, 0, 10, 256);
  g.fillStyle = 'rgba(10,10,10,0.85)'; g.fillRect(380, 30, 100, 226);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 7, 1 / 3);
  return (shopTexture.t = t);
}

// ---------------------------------------------------------------------------
// Signs atlas (shop names, ATLAS billboards)
// ---------------------------------------------------------------------------
const SIGNS = ['NOODLE BAR 24H', 'PHARMACY', 'HALDEN TAILORS', 'ELECTRO REPAIR', 'MOTEL VACANCY', 'COFFEE', 'PAWN & GOLD', 'LAUNDROMAT', 'BOOKS', 'DINER', 'TICKETS', 'KARAOKE', 'BAKERY', 'GYM', 'LIQUOR', 'CINEMA'];
function signAtlas() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 1024);
  const cols = ['#ff3d6e', '#3dd9ff', '#ffd23d', '#7dff6a', '#ff8a3d', '#c97dff', '#ffffff', '#ff5050'];
  SIGNS.forEach((t, i) => {
    const x = (i % 2) * 512, y = Math.floor(i / 2) * 128;
    g.fillStyle = '#060606'; g.fillRect(x + 6, y + 6, 500, 116);
    g.font = 'bold 54px "Rajdhani", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const col = cols[i % cols.length];
    g.shadowColor = col; g.shadowBlur = 18; g.fillStyle = col; g.fillText(t, x + 256, y + 66);
    g.shadowBlur = 0; g.fillStyle = '#fff'; g.globalAlpha = 0.5; g.fillText(t, x + 256, y + 66); g.globalAlpha = 1;
    g.strokeStyle = col; g.lineWidth = 3; g.strokeRect(x + 14, y + 14, 484, 100);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function billboardTexture(lines) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 1024, 512); gr.addColorStop(0, '#0d2a33'); gr.addColorStop(1, '#091218');
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = '#4fe3ff'; g.lineWidth = 6; g.beginPath(); g.arc(190, 256, 120, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(190, 256, 70, Math.PI * 0.2, Math.PI * 1.6); g.stroke();
  g.fillStyle = '#e8f6fa'; g.font = 'bold 120px "Rajdhani", sans-serif'; g.fillText('ATLAS', 350, 250);
  g.font = '42px "Rajdhani", sans-serif'; g.fillStyle = '#9fd3e0'; g.fillText(lines[0], 352, 320); g.fillText(lines[1] || '', 352, 370);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// ---------------------------------------------------------------------------
// City builder
// ---------------------------------------------------------------------------
export async function buildCity(scene, { skipBlocks = [] } = {}) {
  await preloadSets(CITY_TEXTURES);
  const { P, S, N, B, HALF } = CITY;
  const R = rng(1337);
  const root = new THREE.Group(); root.name = 'city'; scene.add(root);
  const colliders = []; // {minX,maxX,minZ,maxZ,h}
  const styles = {
    brick: facadeMaterial('brick_red', { size: 2.5, winW: 0.4, winH: 0.56, style: 0, frame: 0xd8d2c4, lit: 0.28 }),
    brickDark: facadeMaterial('brick_dark', { size: 2.5, winW: 0.44, winH: 0.56, style: 0, frame: 0x1e1e1e, lit: 0.25 }),
    plaster: facadeMaterial('plaster', { size: 3, winW: 0.46, winH: 0.52, style: 0, frame: 0x3a3632, lit: 0.28 }),
    office: facadeMaterial('concrete_facade', { size: 3, winW: 0.84, winH: 0.46, style: 1, frame: 0x2b2f33, lit: 0.3, glass: 0x18242c }),
    tiles: facadeMaterial('facade_tiles', { size: 3, winW: 0.7, winH: 0.5, style: 1, frame: 0x1b1d20, lit: 0.3 }),
    glass: facadeMaterial('concrete_wall', { size: 4, winW: 0.94, winH: 0.88, style: 2, frame: 0x7c8790, lit: 0.25, glass: 0x1c2f3d }),
  };
  const trim = pbr('concrete_wall', { size: 3, color: 0xb9b3a8 }); warpMaterial(trim, { fold: true });
  const roofMat = pbr('concrete_wall', { size: 4, color: 0x6c6a66 }); warpMaterial(roofMat, { fold: true });
  const metalMat = pbr('metal_plate', { size: 2, color: 0x8a8e92, metal: true, roughness: 0.8 }); warpMaterial(metalMat, { fold: true });
  const shutterMat = pbr('shutter', { size: 2.5, color: 0xaaaaaa, side: THREE.DoubleSide }); warpMaterial(shutterMat, { fold: true });
  const signTex = signAtlas();
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: 0xffffff, emissiveIntensity: 2.2, roughness: 0.4, side: THREE.DoubleSide }); warpMaterial(signMat, { fold: true });
  const shopMat = new THREE.MeshStandardMaterial({ map: shopTexture(), emissiveMap: shopTexture(), emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.08, side: THREE.DoubleSide }); warpMaterial(shopMat, { fold: true });
  const awningMats = [0x7a1f1f, 0x1f4a3a, 0x2a3550, 0x6b5a1e].map((c) => warpMaterial(new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, side: THREE.DoubleSide }), { fold: true }));

  const chunks = new Map();
  const chunkOf = (bx, bz) => { const k = (bx >> 1) + ',' + (bz >> 1); if (!chunks.has(k)) chunks.set(k, {}); return chunks.get(k); };
  const acc = (ch, key) => (ch[key] ||= new Acc());

  const tank = [], ac = [], antenna = [], bulkhead = [], signQuads = [], awnings = [], billboards = [];
  const centre = new THREE.Vector2(N * P / 2, N * P / 2);

  for (let bx = 0; bx < N; bx++) for (let bz = 0; bz < N; bz++) {
    if (skipBlocks.some(([x, z]) => x === bx && z === bz)) continue;
    const ch = chunkOf(bx, bz);
    const x0 = bx * P + HALF + 5.5, z0 = bz * P + HALF + 5.5, size = B - 11;
    const dist = new THREE.Vector2(x0 + size / 2, z0 + size / 2).distanceTo(centre) / (N * P * 0.5);
    // subdivide into lots
    const nx = 2 + (R() < 0.5 ? 1 : 0), nz = 2 + (R() < 0.4 ? 1 : 0);
    const cutsX = [0], cutsZ = [0];
    for (let i = 1; i < nx; i++) cutsX.push(size * (i / nx) + (R() - 0.5) * size * 0.12);
    for (let i = 1; i < nz; i++) cutsZ.push(size * (i / nz) + (R() - 0.5) * size * 0.12);
    cutsX.push(size); cutsZ.push(size);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const lx0 = x0 + cutsX[i] + (i > 0 ? 1.5 : 0), lx1 = x0 + cutsX[i + 1] - (i < nx - 1 ? 1.5 : 0);
      const lz0 = z0 + cutsZ[j] + (j > 0 ? 1.5 : 0), lz1 = z0 + cutsZ[j + 1] - (j < nz - 1 ? 1.5 : 0);
      const tall = Math.max(0, 1 - dist);
      let floors;
      const r = R();
      let style;
      if (tall > 0.55 && r < 0.6) { style = r < 0.35 ? 'glass' : 'office'; floors = 14 + Math.floor(R() * 26 * tall); }
      else if (tall > 0.3 && r < 0.5) { style = R() < 0.5 ? 'office' : 'tiles'; floors = 8 + Math.floor(R() * 10); }
      else { style = ['brick', 'brickDark', 'plaster', 'brick'][Math.floor(R() * 4)]; floors = 4 + Math.floor(R() * 5); }
      const fh = style === 'glass' ? 3.6 : style === 'office' || style === 'tiles' ? 3.7 : 3.3;
      const groundH = 4.6;
      const spacing = style === 'glass' ? 3.0 : style === 'office' || style === 'tiles' ? 3.4 : 2.8 + R() * 0.4;
      const height = groundH + floors * fh;
      const seed = R() * 100;
      const tint = style === 'glass' ? [1, 1, 1] : [0.85 + R() * 0.25, 0.85 + R() * 0.2, 0.85 + R() * 0.2];
      const fp = [spacing, fh, groundH, seed];
      const A = acc(ch, style);
      // setbacks for towers
      const tiers = floors > 22 ? 3 : floors > 12 ? 2 : 1;
      let tx0 = lx0, tx1 = lx1, tz0 = lz0, tz1 = lz1, y = 0;
      for (let t = 0; t < tiers; t++) {
        const tf = t === tiers - 1 ? floors - Math.floor(floors * (tiers - 1) / tiers) : Math.floor(floors / tiers);
        const yTop = (t === 0 ? groundH : y) + tf * fh;
        A.box(tx0, tx1, t === 0 ? groundH : y, yTop, tz0, tz1, fp, tint);
        // cornice / ledge at each tier top
        acc(ch, 'trim').box(tx0 - 0.35, tx1 + 0.35, yTop - 0.15, yTop + 0.55, tz0 - 0.35, tz1 + 0.35, [0, 0, 0, 0], [1, 1, 1]);
        // floor ledges every few floors on masonry
        if (style !== 'glass') for (let f = 3; f < tf; f += 3) { const ly = (t === 0 ? groundH : y) + f * fh; acc(ch, 'trim').box(tx0 - 0.12, tx1 + 0.12, ly - 0.12, ly + 0.1, tz0 - 0.12, tz1 + 0.12, [0, 0, 0, 0], [1, 1, 1], { top: true }); }
        // corner pilasters
        if (style === 'brick' || style === 'plaster' || style === 'brickDark') for (const [cx, cz] of [[tx0, tz0], [tx1, tz0], [tx0, tz1], [tx1, tz1]]) acc(ch, 'trim').box(cx - 0.35, cx + 0.35, t === 0 ? groundH : y, yTop, cz - 0.35, cz + 0.35, [0, 0, 0, 0], [0.95, 0.95, 0.95], { top: false });
        y = yTop + 0.55;
        // parapet + roof
        acc(ch, 'roof').box(tx0 + 0.3, tx1 - 0.3, yTop, yTop + 0.56, tz0 + 0.3, tz1 - 0.3, [0, 0, 0, 0], [1, 1, 1], { sides: false });
        const inset = Math.min(tx1 - tx0, tz1 - tz0) * 0.15;
        // rooftop furniture on this tier
        const rw = tx1 - tx0, rd = tz1 - tz0;
        if (t === tiers - 1 || R() < 0.5) {
          if ((style === 'brick' || style === 'brickDark') && R() < 0.7) tank.push([tx0 + rw * (0.25 + R() * 0.5), yTop + 0.55, tz0 + rd * (0.25 + R() * 0.5), 1.6 + R() * 0.8]);
          const nac = 1 + Math.floor(R() * 3);
          for (let k = 0; k < nac; k++) ac.push([tx0 + 2 + R() * (rw - 4), yTop + 0.55, tz0 + 2 + R() * (rd - 4), R() * Math.PI]);
          if (R() < 0.5) bulkhead.push([tx0 + 2.5 + R() * (rw - 5), yTop + 0.55, tz0 + 2.5 + R() * (rd - 5), 2.2 + R() * 1.5]);
          if (style === 'glass' && t === tiers - 1) antenna.push([(tx0 + tx1) / 2, yTop + 0.55, (tz0 + tz1) / 2, 6 + R() * 14]);
        }
        tx0 += inset; tx1 -= inset; tz0 += inset; tz1 -= inset;
      }
      // ground floor: storefront band on street-facing sides
      const sf = acc(ch, 'shop');
      const facesStreet = [lx0 <= x0 + 0.1, lx1 >= x0 + size - 0.1, lz0 <= z0 + 0.1, lz1 >= z0 + size - 0.1];
      acc(ch, 'trim').box(lx0, lx1, 0, groundH, lz0, lz1, [0, 0, 0, 0], [0.75, 0.73, 0.7], { top: false });
      const segs = (len) => Math.max(1, Math.floor(len / 7));
      const addFront = (ax, az, bx2, bz2, nx2, nz2) => {
        const len = Math.hypot(bx2 - ax, bz2 - az), n = segs(len);
        const dx = (bx2 - ax) / len, dz = (bz2 - az) / len;
        for (let k = 0; k < n; k++) {
          const s0 = (k / n) * len + 0.6, s1 = ((k + 1) / n) * len - 0.6;
          const p0 = [ax + dx * s0 + nx2 * 0.05, 0.4, az + dz * s0 + nz2 * 0.05], p1 = [ax + dx * s1 + nx2 * 0.05, 0.4, az + dz * s1 + nz2 * 0.05];
          const closed = R() < 0.25;
          const target = closed ? acc(ch, 'shutter') : sf;
          target.quad(p0, p1, [p1[0], 3.4, p1[2]], [p0[0], 3.4, p0[2]], [nx2, 0, nz2], [[0, 0.4], [s1 - s0, 0.4], [s1 - s0, 3.4], [0, 3.4]], [0, 0, 0, 0], [1, 1, 1]);
          if (!closed && R() < 0.6) signQuads.push({ p0: [p0[0] + nx2 * 0.25, 3.6, p0[2] + nz2 * 0.25], p1: [p1[0] + nx2 * 0.25, 3.6, p1[2] + nz2 * 0.25], n: [nx2, nz2], idx: Math.floor(R() * SIGNS.length) });
          if (!closed && R() < 0.45) awnings.push({ p0, p1, n: [nx2, nz2], c: Math.floor(R() * 4) });
        }
      };
      if (facesStreet[0]) addFront(lx0, lz1, lx0, lz0, -1, 0);
      if (facesStreet[1]) addFront(lx1, lz0, lx1, lz1, 1, 0);
      if (facesStreet[2]) addFront(lx0, lz0, lx1, lz0, 0, -1);
      if (facesStreet[3]) addFront(lx1, lz1, lx0, lz1, 0, 1);
      colliders.push({ minX: lx0, maxX: lx1, minZ: lz0, maxZ: lz1, h: height });
      // rooftop billboard on a few mid-rises facing the avenue
      if (floors < 9 && R() < 0.06) billboards.push([(lx0 + lx1) / 2, height + 0.6, (lz0 + lz1) / 2, R() < 0.5 ? 0 : Math.PI / 2]);
    }
  }

  // ---- meshes per chunk/material
  const matFor = { trim, roof: roofMat, shop: shopMat, shutter: shutterMat, ...styles };
  for (const ch of chunks.values()) for (const [k, a] of Object.entries(ch)) {
    const mesh = new THREE.Mesh(a.geometry(), matFor[k]);
    mesh.castShadow = k !== 'shop'; mesh.receiveShadow = true;
    root.add(mesh);
  }
  // signs
  {
    const a = new Acc();
    for (const s of signQuads) {
      const u0 = (s.idx % 2) * 0.5, v0 = 1 - (Math.floor(s.idx / 2) + 1) * 0.125;
      const len = Math.hypot(s.p1[0] - s.p0[0], s.p1[2] - s.p0[2]);
      const shrink = Math.max(0, (len - 4.2) / 2) / len;
      const q0 = [s.p0[0] + (s.p1[0] - s.p0[0]) * shrink, 3.55, s.p0[2] + (s.p1[2] - s.p0[2]) * shrink];
      const q1 = [s.p1[0] - (s.p1[0] - s.p0[0]) * shrink, 3.55, s.p1[2] - (s.p1[2] - s.p0[2]) * shrink];
      // text must run along cross(up, n) to read correctly from the street
      const rx = s.n[1], rz = -s.n[0];
      const flip = (q1[0] - q0[0]) * rx + (q1[2] - q0[2]) * rz < 0;
      const ua = flip ? u0 + 0.5 : u0, ub = flip ? u0 : u0 + 0.5;
      a.quad(q0, q1, [q1[0], 4.4, q1[2]], [q0[0], 4.4, q0[2]], [s.n[0], 0, s.n[1]], [[ua, v0], [ub, v0], [ub, v0 + 0.125], [ua, v0 + 0.125]], [0, 0, 0, 0], [1, 1, 1]);
    }
    root.add(new THREE.Mesh(a.geometry(), signMat));
  }
  // awnings (sloped fabric planes with valance)
  {
    const accs = [new Acc(), new Acc(), new Acc(), new Acc()];
    for (const w of awnings) {
      const a = accs[w.c], d = 1.6;
      const o0 = [w.p0[0] + w.n[0] * d, 2.7, w.p0[2] + w.n[1] * d], o1 = [w.p1[0] + w.n[0] * d, 2.7, w.p1[2] + w.n[1] * d];
      a.quad([w.p0[0], 3.35, w.p0[2]], [w.p1[0], 3.35, w.p1[2]], o1, o0, [w.n[0] * 0.5, 0.86, w.n[1] * 0.5], [[0, 0], [1, 0], [1, 1], [0, 1]], [0, 0, 0, 0], [1, 1, 1]);
      a.quad(o0, o1, [o1[0], 2.4, o1[2]], [o0[0], 2.4, o0[2]], [w.n[0], 0, w.n[1]], [[0, 0], [1, 0], [1, 1], [0, 1]], [0, 0, 0, 0], [1, 1, 1]);
    }
    accs.forEach((a, i) => { const m = new THREE.Mesh(a.geometry(), awningMats[i]); m.castShadow = true; root.add(m); });
  }

  // ---- rooftop instanced props
  const inst = (geo, mat, list, fn) => {
    const m = new THREE.InstancedMesh(geo, warpMaterial(mat, { fold: true }), Math.max(1, list.length));
    const M = new THREE.Matrix4();
    list.forEach((v, i) => { fn(M, v); m.setMatrixAt(i, M); });
    m.count = list.length; m.castShadow = true; m.receiveShadow = true; m.computeBoundingSphere(); root.add(m);
    return m;
  };
  const woodTank = new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.9 });
  const tankGeo = new THREE.CylinderGeometry(1, 1, 2.4, 16); tankGeo.translate(0, 2.7, 0);
  const tankRoof = new THREE.ConeGeometry(1.05, 0.9, 16); tankRoof.translate(0, 4.35, 0);
  const tankLegs = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 6); tankLegs.translate(0, 0.75, 0);
  const tm = (M, v) => M.compose(new THREE.Vector3(v[0], v[1], v[2]), new THREE.Quaternion(), new THREE.Vector3(v[3], v[3] * 0.9, v[3]));
  inst(tankGeo, woodTank.clone(), tank, tm);
  inst(tankRoof, new THREE.MeshStandardMaterial({ color: 0x3a3634, roughness: 0.7, metalness: 0.4 }), tank, tm);
  for (const [lx, lz] of [[0.6, 0.6], [-0.6, 0.6], [0.6, -0.6], [-0.6, -0.6]]) inst(tankLegs, metalMat.clone(), tank, (M, v) => M.compose(new THREE.Vector3(v[0] + lx * v[3], v[1], v[2] + lz * v[3]), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)));
  const acBox = new THREE.BoxGeometry(1.4, 1.0, 1.0); acBox.translate(0, 0.5, 0);
  inst(acBox, new THREE.MeshStandardMaterial({ color: 0xb0b2ae, roughness: 0.6, metalness: 0.4 }), ac, (M, v) => M.compose(new THREE.Vector3(v[0], v[1], v[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, v[3], 0)), new THREE.Vector3(1, 1, 1)));
  const fanG = new THREE.CylinderGeometry(0.36, 0.36, 0.04, 16); fanG.translate(0, 1.02, 0);
  inst(fanG, new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 }), ac, (M, v) => M.compose(new THREE.Vector3(v[0], v[1], v[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, v[3], 0)), new THREE.Vector3(1, 1, 1)));
  const bh = new THREE.BoxGeometry(3, 1, 3); bh.translate(0, 0.5, 0);
  inst(bh, roofMat.clone(), bulkhead, (M, v) => M.compose(new THREE.Vector3(v[0], v[1], v[2]), new THREE.Quaternion(), new THREE.Vector3(1, v[3], 1)));
  const ant = new THREE.CylinderGeometry(0.06, 0.12, 1, 6); ant.translate(0, 0.5, 0);
  inst(ant, metalMat.clone(), antenna, (M, v) => M.compose(new THREE.Vector3(v[0], v[1], v[2]), new THREE.Quaternion(), new THREE.Vector3(1, v[3], 1)));
  const beacon = new THREE.SphereGeometry(0.25, 8, 6);
  inst(beacon, new THREE.MeshStandardMaterial({ color: 0x300000, emissive: 0xff2020, emissiveIntensity: 4 }), antenna, (M, v) => M.compose(new THREE.Vector3(v[0], v[1] + v[3], v[2]), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)));
  // ATLAS billboards
  const bbTex = billboardTexture(['A BETTER VERSION OF TOMORROW', 'MERIDIAN INSTITUTE · HALDEN']);
  for (const b of billboards) {
    const g = new THREE.Group();
    const board = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), warpMaterial(new THREE.MeshStandardMaterial({ map: bbTex, emissiveMap: bbTex, emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.5 }), { fold: true }));
    board.position.y = 6; g.add(board);
    const back = new THREE.Mesh(new THREE.BoxGeometry(12.4, 6.4, 0.3), metalMat); back.position.set(0, 6, -0.2); g.add(back);
    for (const x of [-4, 4]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.3), metalMat); leg.position.set(x, 1.5, -0.3); g.add(leg); }
    g.position.set(b[0], b[1], b[2]); g.rotation.y = b[3];
    root.add(g);
  }

  // ---- ground plane (streets + sidewalks), curbs
  const groundMat = groundMaterial();
  const gx0 = -200, gx1 = N * P + 200, gz0 = -200, gz1 = N * P + 45;
  const groundGeo = new THREE.PlaneGeometry(gx1 - gx0, gz1 - gz0, 170, 150); groundGeo.rotateX(-Math.PI / 2);
  groundGeo.translate((gx0 + gx1) / 2, 0, (gz0 + gz1) / 2);
  const gp = groundGeo.attributes.position, guv = groundGeo.attributes.uv;
  for (let i = 0; i < gp.count; i++) guv.setXY(i, gp.getX(i), gp.getZ(i));
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true; root.add(ground);
  {
    const curbs = new Acc();
    for (let bx = 0; bx < N; bx++) for (let bz = 0; bz < N; bz++) {
      const x0 = bx * P + HALF, z0 = bz * P + HALF, x1 = x0 + B, z1 = z0 + B;
      curbs.box(x0, x1, 0, 0.14, z0, z0 + 0.3); curbs.box(x0, x1, 0, 0.14, z1 - 0.3, z1);
      curbs.box(x0, x0 + 0.3, 0, 0.14, z0, z1); curbs.box(x1 - 0.3, x1, 0, 0.14, z0, z1);
    }
    const cm = new THREE.Mesh(curbs.geometry(), trim); cm.receiveShadow = true; root.add(cm);
  }

  // ---- street lights, traffic lights, light pools
  const lights = [];
  for (let i = 0; i <= N; i++) for (let j = 0; j < N; j++) {
    for (let k = 1; k < 4; k++) {
      const z = j * P + HALF + (B / 4) * k;
      lights.push([i * P - HALF - 1.2, z, 0], [i * P + HALF + 1.2, z, Math.PI]);
      const x = j * P + HALF + (B / 4) * k;
      lights.push([x, i * P - HALF - 1.2, Math.PI / 2], [x, i * P + HALF + 1.2, -Math.PI / 2]);
    }
  }
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.14, 8, 8); poleGeo.translate(0, 4, 0);
  const armGeo = new THREE.BoxGeometry(2.2, 0.12, 0.12); armGeo.translate(1.1, 7.9, 0);
  const headGeo = new THREE.BoxGeometry(0.8, 0.18, 0.36); headGeo.translate(2.05, 7.8, 0);
  const lampGeo = new THREE.PlaneGeometry(0.66, 0.26); lampGeo.rotateX(Math.PI / 2); lampGeo.translate(2.05, 7.7, 0);
  const lightM = (M, v) => M.compose(new THREE.Vector3(v[0], 0, v[1]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, v[2], 0)), new THREE.Vector3(1, 1, 1));
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x2a2d30, roughness: 0.5, metalness: 0.7 });
  inst(poleGeo, darkMetal, lights, lightM); inst(armGeo, darkMetal.clone(), lights, lightM); inst(headGeo, darkMetal.clone(), lights, lightM);
  inst(lampGeo, new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffc98a, emissiveIntensity: 6, side: THREE.DoubleSide }), lights, lightM);
  // fake light pools on the wet ground (additive)
  const poolTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,200,140,0.55)'); gr.addColorStop(0.5, 'rgba(255,170,100,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const poolGeo = new THREE.PlaneGeometry(14, 14); poolGeo.rotateX(-Math.PI / 2); poolGeo.translate(2.05, 0.03, 0);
  const pools = inst(poolGeo, new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), lights, lightM);
  pools.castShadow = false; pools.receiveShadow = false;
  // traffic lights at intersections
  const tl = [];
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) for (const [dx, dz, r] of [[1, 1, 0], [-1, -1, Math.PI]]) tl.push([i * P + dx * (HALF + 1), j * P + dz * (HALF + 1), r]);
  const tlPole = new THREE.CylinderGeometry(0.1, 0.12, 6, 8); tlPole.translate(0, 3, 0);
  const tlArm = new THREE.BoxGeometry(0.12, 0.12, 6); tlArm.translate(0, 5.8, -3);
  const tlBox = new THREE.BoxGeometry(0.4, 1.1, 0.35); tlBox.translate(0, 5.3, -5);
  inst(tlPole, darkMetal.clone(), tl, lightM); inst(tlArm, darkMetal.clone(), tl, lightM); inst(tlBox, new THREE.MeshStandardMaterial({ color: 0x1a1a10, roughness: 0.6 }), tl, lightM);
  const tlLamp = new THREE.CircleGeometry(0.12, 12); tlLamp.translate(0, 5.0, -4.82);
  inst(tlLamp, new THREE.MeshStandardMaterial({ color: 0x002200, emissive: 0x30ff70, emissiveIntensity: 5 }), tl, lightM);

  // ---- Poly Haven street props (CC0): trash bags, utility boxes, trash cans, fire escapes
  const props = { trashbag: [], utility_box_01: [], metal_trash_can: [] };
  const PR = rng(99);
  for (let bx = 0; bx < N; bx++) for (let bz = 0; bz < N; bz++) {
    const x0 = bx * P + HALF, z0 = bz * P + HALF;
    for (let k = 0; k < 3; k++) {
      const side = Math.floor(PR() * 4), t = 6 + PR() * (B - 12);
      const pos = side === 0 ? [x0 + 1.2, z0 + t] : side === 1 ? [x0 + B - 1.2, z0 + t] : side === 2 ? [x0 + t, z0 + 1.2] : [x0 + t, z0 + B - 1.2];
      const kind = ['trashbag', 'trashbag', 'utility_box_01', 'metal_trash_can'][Math.floor(PR() * 4)];
      props[kind].push([pos[0], pos[1], PR() * Math.PI * 2]);
      if (kind === 'trashbag') props.trashbag.push([pos[0] + 0.5, pos[1] + 0.3, PR() * 6]);
    }
  }
  for (const [id, list] of Object.entries(props)) {
    const tpl = await model(id);
    const parts = flattenModel(tpl);
    const g = makeInstanced(parts.map((p) => ({ geometry: p.geometry, material: warpMaterial(p.material.clone(), { fold: true }) })), list.length);
    list.forEach((v, i) => g.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(v[0], 0, v[1]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, v[2], 0)), new THREE.Vector3(1, 1, 1))));
    g.finish(list.length);
    root.add(g);
  }
  // fire escapes on a selection of brick walk-ups (street-facing sides)
  {
    const tpl = await model('modular_fire_escape');
    const parts = flattenModel(tpl);
    const list = [];
    const FR = rng(7);
    for (const c of colliders) if (c.h < 34 && c.h > 14 && FR() < 0.3) {
      const side = FR() < 0.5;
      list.push(side ? [c.minX + (c.maxX - c.minX) * 0.5, c.maxZ + 0.7, 0] : [c.maxX + 0.7, c.minZ + (c.maxZ - c.minZ) * 0.5, Math.PI / 2]);
    }
    const g = makeInstanced(parts.map((p) => ({ geometry: p.geometry, material: warpMaterial(p.material.clone(), { fold: true }) })), list.length);
    list.forEach((v, i) => g.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(v[0], 4.8, v[1]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, v[2], 0)), new THREE.Vector3(1, 1, 1))));
    g.finish(list.length);
    root.add(g);
  }

  const allMats = [];
  root.traverse((o) => { if (o.material) allMats.push(o.material); });
  return {
    root, colliders,
    ground: () => 0,
    styles, groundMat,
    update(dt, t, night = 1) {
      for (const s of Object.values(styles)) { s.userData.facade.uTime.value = t; s.userData.facade.uNight.value = night; }
      groundMat.userData.ground.uTime.value = t;
    },
    /** Static colliders near a point (cheap grid lookup). */
    near(x, z, r = 40) { return colliders.filter((c) => x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r); },
  };
}
