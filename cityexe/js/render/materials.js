// Shader-patched materials. Buildings draw procedural facades (windows, storefronts,
// lighting, damage, fire, boarded-up states) from per-instance attributes, so the
// whole skyline is a handful of draw calls but every building still reflects its
// simulated state.
import * as THREE from 'three';

const BUILDING_VERT_HEAD = `
attribute vec3 iCol; attribute vec3 iCol2; attribute vec4 iFx; attribute vec4 iFx2;
varying vec3 vWP; varying vec3 vWN; varying vec3 vLoc; varying vec3 vScl;
varying vec3 vCol; varying vec3 vCol2; varying vec4 vFx; varying vec4 vFx2;
`;
const BUILDING_VERT_BODY = `
  vec4 _wp = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
  vWP = _wp.xyz;
  vWN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
  vLoc = position;
  vScl = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vCol = iCol; vCol2 = iCol2; vFx = iFx; vFx2 = iFx2;
`;
const BUILDING_FRAG_HEAD = `
uniform float uNight; uniform float uTime; uniform float uWet; uniform float uSnow; uniform float uExe; uniform float uDay;
varying vec3 vWP; varying vec3 vWN; varying vec3 vLoc; varying vec3 vScl;
varying vec3 vCol; varying vec3 vCol2; varying vec4 vFx; varying vec4 vFx2;
float h21(vec2 p){ p = mod(floor(p + 0.5), 289.0); return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float n21(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
`;
const BUILDING_FRAG_COLOR = `
  vec3 N = normalize(vWN);
  float style = floor(vFx.x + 0.5);
  vec3 base = vCol;
  float rough = 0.86; float metal = 0.0;
  vec3 emis = vec3(0.0);
  float dmg = vFx.w;
  float fire = vFx2.y;
  float boarded = vFx2.z;
  float constr = vFx2.w;
  float lightF = vFx.z;
  float inWin = 0.0;
  float bH = 0.0; float bS = 0.0;
  float grime = n21(vWP.xz * 0.35 + vWP.y * 0.2) * 0.12;
  if (N.y > 0.3) {
    // roofs
    base *= 0.66 + grime;
    if (style > 11.5 && style < 12.5) {
      base = vCol * (0.78 + 0.22 * step(0.45, fract(vWP.y * 2.6 + vWP.x * 0.01)));
    }
    if (style > 10.5 && style < 11.5 && N.y > 0.9) {
      vec2 lp = vLoc.xz * vScl.xz;
      float r = length(lp);
      float ring = smoothstep(0.25, 0.0, abs(r - 5.2));
      float hx = step(abs(lp.x), 2.2) * step(abs(lp.y), 0.4) + (step(abs(abs(lp.x) - 1.8), 0.4) * step(abs(lp.y), 2.6));
      base = mix(vec3(0.16,0.17,0.19), vec3(0.95,0.85,0.2), clamp(ring + hx, 0.0, 1.0));
      emis += vec3(1.0,0.3,0.2) * ring * uNight * 0.6 * step(0.5, fract(uTime*0.5));
    }
    base = mix(base, vec3(0.92,0.94,0.97), uSnow * smoothstep(0.3, 0.8, N.y));
    rough = mix(rough, 0.3, uWet * 0.6);
  } else if (N.y > -0.3) {
    // facades
    bool xFace = abs(N.x) > 0.5;
    float locU = xFace ? vLoc.z * vScl.z : vLoc.x * vScl.x;
    float halfW = xFace ? vScl.z * 0.5 : vScl.x * 0.5;
    float edgeDist = halfW - abs(locU);
    float topDist = (0.5 - vLoc.y) * vScl.y;
    float baseY = vWP.y - (vLoc.y + 0.5) * vScl.y;
    float v = vWP.y;
    float fh = 3.4, cw = 2.6, mx = 0.18, my0 = 0.28, my1 = 0.85;
    vec3 glass = vec3(0.07, 0.09, 0.12);
    bool windows = true;
    if (style < 0.5) { cw = 1.7; mx = 0.04; my0 = 0.06; my1 = 0.96; glass = vCol * 0.45; }
    else if (style < 1.5) { cw = 2.6; mx = 0.16; my0 = 0.26; my1 = 0.86; }
    else if (style < 2.5) { cw = 2.6; mx = 0.27; my0 = 0.24; my1 = 0.80; base *= 0.85 + 0.15 * step(0.5, fract(vWP.y * 5.0 + step(0.5, fract(vWP.y*2.5)) * 0.5 + (xFace? vWP.z: vWP.x) * 2.2)); }
    else if (style < 3.5) { fh = 3.2; cw = 3.0; mx = 0.24; my0 = 0.3; my1 = 0.8; }
    else if (style < 4.5) { fh = 3.0; cw = 3.4; mx = 0.3; my0 = 0.32; my1 = 0.78; base *= 0.9 + 0.1 * step(0.5, fract(vWP.y * 4.0)); }
    else if (style < 5.5) { fh = 6.0; cw = 5.0; mx = 0.25; my0 = 0.62; my1 = 0.84; base *= 0.86 + 0.14 * step(0.5, fract((xFace? vWP.z: vWP.x) * 1.4)); }
    else if (style < 6.5) { fh = 3.8; cw = 3.0; mx = 0.22; my0 = 0.18; my1 = 0.86; }
    else if (style < 7.5) { windows = false; }
    else if (style < 8.5) { fh = 4.4; cw = 3.4; mx = 0.05; my0 = 0.12; my1 = 0.9; }
    else if (style < 9.5) { fh = 3.0; cw = 7.0; mx = 0.06; my0 = 0.32; my1 = 0.82; glass = vec3(0.05); }
    else if (style < 10.5) { windows = false; base *= 0.85 + 0.15 * step(0.5, fract(vWP.y * 0.5)); }
    else if (style > 12.5 && style < 13.5) { windows = false; base *= 0.8 + 0.2 * n21(vec2((xFace? vWP.z: vWP.x) * 2.0, vWP.y * 0.2)); }
    else if (style > 13.5 && style < 14.5) {
      vec2 g = vec2((xFace ? vWP.z : vWP.x) + vWP.y, (xFace ? vWP.z : vWP.x) - vWP.y) * 4.0;
      vec2 fg = abs(fract(g) - 0.5);
      if (min(fg.x, fg.y) > 0.08 && topDist > 0.08) discard;
      windows = false; base = vec3(0.6); metal = 0.6; rough = 0.4;
    } else if (style > 14.5) {
      windows = false;
      base = vec3(0.06, 0.07, 0.08); rough = 0.2; metal = 0.5;
      float frame = step(edgeDist, 0.12) + step(topDist, 0.12);
      base = mix(base, vec3(0.35), clamp(frame, 0.0, 1.0));
      emis += vec3(1.0, 0.85, 0.6) * 0.5 * uNight * lightF * (1.0 - frame);
    }
    float ncol = max(1.0, floor(halfW * 2.0 / cw));
    float cwa = halfW * 2.0 / ncol;
    float u = (locU + halfW) / cwa;
    float vv = (v - baseY) / fh;
    vec2 cell = vec2(floor(u), floor(vv));
    vec2 f = vec2(fract(u), fract(vv));
    float faceId = floor(N.x + 0.5) * 17.0 + floor(N.z + 0.5) * 31.0;
    float shop = vFx2.x;
    bool shopFloor = shop > 0.1 && (v - baseY) < 4.4 && (style > 0.5 && style < 4.5);
    if (shopFloor) {
      float sv = v - baseY;
      float scw = 4.2;
      float su = fract((locU + halfW) / scw);
      float pane = step(0.04, su) * step(su, 0.96) * step(0.45, sv) * step(sv, 3.25) * step(0.5, edgeDist);
      float sign = step(3.45, sv) * step(sv, 4.25) * step(0.3, edgeDist);
      if (shop < 0.3) {
        // vacant storefront: whitewashed windows, dark sign
        base = mix(base, vec3(0.72, 0.7, 0.66), pane);
        base = mix(base, vec3(0.2), sign);
      } else {
        bool open = shop > 0.75;
        float lit = open ? lightF : 0.0;
        base = mix(base, vec3(0.05, 0.06, 0.07), pane);
        rough = mix(rough, 0.08, pane); metal = mix(metal, 0.7, pane);
        base = mix(base, vCol2, sign);
        emis += (vec3(1.0, 0.9, 0.72) * 1.4 * pane * (open ? 1.0 : 0.08) + vCol2 * 1.6 * sign) * (0.25 + uNight * 0.9) * step(0.01, lit + (open ? 0.0 : 0.0)) * (1.0 - boarded);
        if (boarded > 0.5) base = mix(base, vec3(0.42, 0.32, 0.2) * (0.8 + 0.2 * step(0.5, fract(sv * 3.0))), pane);
      }
    } else if (windows) {
      inWin = step(mx, f.x) * step(f.x, 1.0 - mx) * step(my0, f.y) * step(f.y, my1);
      inWin *= step(0.7, edgeDist) * step(0.6, topDist);
      if (style > 8.5 && style < 9.5) inWin = step(my0, f.y) * step(f.y, my1) * step(0.6, edgeDist) * (1.0 - step(0.94, f.x));
      if (constr > 0.01) inWin = 0.0;
      // frame + sill around each window (relief via bump)
      float fx0 = mx - 0.04, fx1 = 1.0 - mx + 0.04, fy0 = my0 - 0.05, fy1 = my1 + 0.035;
      float inFrame = step(fx0, f.x) * step(f.x, fx1) * step(fy0, f.y) * step(f.y, fy1) * step(0.7, edgeDist) * step(0.6, topDist) * (1.0 - inWin);
      float inSill = step(fx0 - 0.03, f.x) * step(f.x, fx1 + 0.03) * step(fy0 - 0.035, f.y) * step(f.y, fy0 + 0.01) * step(0.7, edgeDist) * step(0.6, topDist);
      if (style < 0.5 || (style > 8.5 && style < 9.5) || constr > 0.01) { inFrame = 0.0; inSill = 0.0; }
      if (inFrame > 0.5) { base = mix(base * 1.22, vec3(0.86, 0.85, 0.82), 0.35); bH = 0.35; }
      if (inSill > 0.5) { base = mix(base * 1.3, vec3(0.8), 0.4); bH = 0.7; }
      if (inWin > 0.5) {
        bH = -1.0;
        float r = h21(cell + vec2(faceId, vFx.y));
        float r2 = h21(cell * 1.7 + vec2(vFx.y, faceId));
        vec3 wc = mix(vec3(1.0, 0.72, 0.42), vec3(0.78, 0.86, 1.0), step(0.72, r2));
        if (r2 > 0.95) wc = vec3(0.5, 0.65, 1.0) * (0.75 + 0.25 * sin(uTime * 7.0 + r * 40.0));
        float lit = step(r, lightF) * (1.0 - step(0.6, dmg)) * (1.0 - boarded);
        float blind = 0.55 + 0.45 * step(0.35, r2);
        vec3 g = glass;
        if (dmg > 0.35 && h21(cell + 3.1) < dmg) g = vec3(0.02);
        base = g;
        rough = 0.07; metal = 0.85;
        // interior mapping: trace the view ray into a fake room behind the glass
        vec3 Vw = normalize(vWP - cameraPosition);
        vec3 axU = xFace ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
        float vin = max(0.05, dot(Vw, -N));
        float vu = dot(Vw, axU), vy2 = Vw.y;
        float rw = cwa * (1.0 - 2.0 * mx), rh = fh * (my1 - my0), rd = 3.6 + r * 2.0;
        float px = (f.x - mx) / (1.0 - 2.0 * mx) * rw, py = (f.y - my0) / (my1 - my0) * rh;
        float sb = rd / vin;
        float sx2 = vu > 0.0 ? (rw - px) / max(vu, 1e-3) : px / max(-vu, 1e-3);
        float sy2 = vy2 > 0.0 ? (rh + 0.5 - py) / max(vy2, 1e-3) : (py + 0.35) / max(-vy2, 1e-3);
        float sh = min(sb, min(sx2, sy2));
        vec3 wallC = mix(vec3(0.82, 0.78, 0.7), vec3(0.62, 0.7, 0.74), step(0.5, r2)) * (0.8 + 0.2 * h21(cell + 9.0));
        vec3 room;
        float dep = sh * vin / rd;
        if (sh == sb) {
          vec2 bw = vec2(px + vu * sh, py + vy2 * sh);
          room = wallC;
          // shelf / picture / tv on the back wall
          float pic = step(0.25 * rw, bw.x) * step(bw.x, 0.6 * rw) * step(0.45 * rh, bw.y) * step(bw.y, 0.75 * rh);
          room = mix(room, mix(vec3(0.2, 0.25, 0.3), vec3(0.6, 0.3, 0.2), h21(cell + 4.0)), pic * 0.8);
          float sofa = step(bw.y, 0.28 * rh) * step(0.1 * rw, bw.x) * step(bw.x, 0.9 * rw);
          room = mix(room, vec3(0.25, 0.22, 0.24) * (0.6 + h21(cell + 5.0)), sofa * step(0.4, r));
        } else if (sh == sy2) {
          room = vy2 > 0.0 ? vec3(0.9, 0.9, 0.88) : mix(vec3(0.42, 0.3, 0.2), vec3(0.5, 0.48, 0.46), step(0.6, r2));
        } else {
          room = wallC * 0.82;
        }
        room *= 1.0 - dep * 0.45;
        vec3 roomLight = lit > 0.5 ? mix(vec3(0.95, 0.97, 1.0), wc, uNight) * (0.55 + 0.45 * (1.0 - dep)) : vec3(0.05 + uDay * 0.1);
        vec3 inside = room * roomLight * blind;
        // by day the glass mostly mirrors the sky; rooms read faintly behind it. At night they glow.
        float see = mix(0.18, 0.75, uNight);
        base = mix(base, inside * 0.5, see * 0.6);
        emis += inside * see * (lit > 0.5 ? (0.25 + uNight * 1.1) : 0.12 * uDay) + wc * lit * blind * uNight * 0.12;
        if (boarded > 0.5) { base = vec3(0.4, 0.3, 0.19) * (0.85 + 0.15 * step(0.5, fract(f.y * 6.0))); rough = 0.9; metal = 0.0; }
      }
      // ledges between floors
      if (style > 0.5 && style < 7.0) { float ld = step(0.94, f.y) * (1.0 - inWin); base *= 1.0 - 0.12 * ld; bH += ld * 0.5; }
      // wall material relief: brick courses (styles 2-3), panel joints (4, 6), fading out with distance
      float near = 1.0 - smoothstep(0.015, 0.05, fwidth(v));
      if (inWin < 0.5 && inFrame < 0.5 && near > 0.0) {
        if (style > 1.5 && style < 3.5) {
          float by = v / 0.075, bx = locU / 0.22 + 0.5 * step(0.5, fract(by * 0.5));
          float mortar = max(step(0.86, fract(by)), step(0.93, fract(bx)));
          base *= 1.0 - mortar * 0.22 * near;
          base *= 0.92 + 0.16 * h21(vec2(floor(bx), floor(by)) + faceId) * near;
          bH += (1.0 - mortar) * 0.4 * near;
        } else if (style > 3.5 && style < 6.5) {
          float jy = step(0.97, fract((v - baseY) / (fh * 0.5))), jx = step(0.985, fract(locU / 1.6));
          base *= 1.0 - max(jx, jy) * 0.15 * near;
          bH -= max(jx, jy) * 0.6 * near;
        }
      }
      bS = 1.0;
    }
    // ground floor door accent darker band near street level
    base *= 1.0 - 0.15 * smoothstep(0.8, 0.0, v - baseY) * step(0.5, edgeDist);
    // construction scaffold
    if (constr > 0.01) {
      vec2 sg = vec2((locU + halfW) / 2.0, (v - baseY) / 2.0);
      vec2 sf = abs(fract(sg) - 0.5);
      float lat = step(0.42, max(sf.x, sf.y));
      base = mix(base * 0.7, vec3(0.82, 0.62, 0.18), lat * 0.9);
      emis = vec3(0.0);
    }
    base *= 1.0 - grime * 0.6;
  } else {
    base *= 0.3;
  }
  if (dmg > 0.01) {
    float soot = smoothstep(0.3, 0.9, n21(vWP.xz * 0.25 + vWP.y * 0.3) + dmg * 0.6 - 0.3);
    base = mix(base, vec3(0.05, 0.045, 0.04), soot * dmg);
  }
  if (fire > 0.01) {
    float fl = 0.6 + 0.4 * sin(uTime * 13.0 + vWP.y * 1.3) * sin(uTime * 7.3 + vWP.x);
    float low = smoothstep(fire * 30.0 + 4.0, 0.0, vWP.y);
    emis += vec3(1.0, 0.38, 0.08) * fire * fl * (inWin * 4.0 + 0.25) * low;
  }
  diffuseColor.rgb = base;
`;

export function makeBuildingMaterial(U) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = BUILDING_VERT_HEAD + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + BUILDING_VERT_BODY);
    sh.fragmentShader = BUILDING_FRAG_HEAD + sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + BUILDING_FRAG_COLOR)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = rough;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor = metal;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  if (bS > 0.0) {
    vec3 _vp = -vViewPosition;
    vec3 _dpx = dFdx(_vp), _dpy = dFdy(_vp);
    float _dhx = dFdx(bH), _dhy = dFdy(bH);
    vec3 _r1 = cross(_dpy, normal), _r2 = cross(normal, _dpx);
    float _det = dot(_dpx, _r1);
    vec3 _grad = sign(_det) * (_dhx * _r1 + _dhy * _r2);
    vec3 _nn = abs(_det) * normal - _grad * 0.05;
    if (dot(_nn, _nn) > 1e-12 && abs(_det) > 1e-12) normal = normalize(_nn);
  }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += emis;');
  };
  m.customProgramCacheKey = () => 'building-v3';
  return m;
}

// Surface types (per vertex, aMat): procedural micro-texture + bump relief so plain
// geometry reads as cloth, wood, metal, bark, foliage, hair, skin, rubber, glass...
export const SURF = { none: 0, fabric: 1, skin: 2, hair: 3, wood: 4, metal: 5, rubber: 6, glass: 7, leaf: 8, bark: 9, leather: 10, chrome: 11, concrete: 12, plastic: 13, denim: 14, knit: 15 };

const SURF_GLSL = `
float sh21(vec2 p){ p = mod(floor(p + 0.5), 289.0); return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float sn21(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(sh21(i),sh21(i+vec2(1,0)),f.x), mix(sh21(i+vec2(0,1)),sh21(i+vec2(1,1)),f.x), f.y); }
float sfbm(vec2 p){ return sn21(p) * 0.55 + sn21(p * 2.07 + 3.1) * 0.3 + sn21(p * 4.3 + 7.7) * 0.15; }
vec2 stp(vec3 p, vec3 n){ vec3 a = abs(n); return a.x > a.y && a.x > a.z ? p.zy : (a.y > a.z ? p.xz : p.xy); }
`;

// Generic instanced material: vertex colors (aCol) * optional per-instance paint for parts flagged aPaint,
// per-instance second color (iCol2) for parts flagged aPaint==2, emissive channels driven by iState.
// aGlow channels: 1 headlight, 2 taillight/brake, 3 siren red, 4 siren blue, 5 constant glow (sign), 6 amber flasher
export function makeInstMaterial(U, opts = {}) {
  const physical = !!opts.clearcoat;
  const Mat = physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  const m = new Mat({ color: 0xffffff, roughness: opts.roughness ?? 0.6, metalness: opts.metalness ?? 0.1, vertexColors: false, transparent: !!opts.transparent, depthWrite: opts.depthWrite ?? true, ...(physical ? { clearcoat: 1, clearcoatRoughness: 0.12 } : {}) });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = `
attribute vec3 aCol; attribute float aPaint; attribute float aGlow; attribute float aMat;
attribute vec3 iCol1; attribute vec3 iCol2; attribute vec4 iState;
varying vec3 vCol; varying float vGlow; varying vec4 vState; varying float vPaint; varying vec3 vObj; varying vec3 vObjN; varying vec3 vWorldN; varying float vMat; varying vec3 vWPos;
` + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  vec3 pc = aPaint > 1.5 ? iCol2 : (aPaint > 0.5 ? iCol1 : vec3(1.0));
  vCol = aCol * pc; vGlow = aGlow; vState = iState; vPaint = aPaint; vObj = position; vObjN = objectNormal; vMat = aMat;
  vWorldN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
  vWPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
`);
    sh.fragmentShader = `
uniform float uNight; uniform float uTime; uniform float uSnow; uniform float uWet;
varying vec3 vCol; varying float vGlow; varying vec4 vState; varying float vPaint; varying vec3 vObj; varying vec3 vObjN; varying vec3 vWorldN; varying float vMat; varying vec3 vWPos;
` + SURF_GLSL + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
  diffuseColor.rgb *= vCol;
  float _rough = ${(opts.roughness ?? 0.6).toFixed(3)};
  float _metal = ${(opts.metalness ?? 0.1).toFixed(3)};
  float _bh = 0.0; float _bs = 0.0; float _cc = 0.0;
  if (vPaint > 0.5 && vPaint < 1.5) { _rough = 0.32; _metal = 0.35; _cc = 1.0; }
  if (vGlow > 6.5 && vGlow < 7.5) { _rough = 0.05; _metal = 0.9; }
  int sm = int(vMat + 0.5);
  vec2 suv = stp(vObj, vObjN);
  if (sm == 1 || sm == 14 || sm == 15) {
    float fq = sm == 14 ? 260.0 : sm == 15 ? 60.0 : 420.0;
    float fine = 1.0 - smoothstep(0.004, 0.012, fwidth(suv.x));
    float weave = mix(0.5, (sin(suv.x * fq) * sin(suv.y * fq)) * 0.5 + 0.5, fine);
    float twill = sm == 14 ? mix(0.5, fract((suv.x + suv.y) * 120.0), fine) : weave;
    float fold = sfbm(vObj.xy * 7.0 + vObj.z * 3.0);
    diffuseColor.rgb *= 0.9 + (sm == 15 ? 0.1 : 0.05) * twill + 0.16 * (fold - 0.5);
    if (sm == 14) diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.15, 1.18, 1.25), sn21(suv * 160.0) * 0.25);
    _rough = 0.92; _metal = 0.0; _bh = twill * 0.15 + fold * 0.9; _bs = 0.6;
  } else if (sm == 2) {
    float sv = sn21(vObj.xy * 40.0 + vObj.z * 13.0);
    diffuseColor.rgb *= 0.95 + 0.07 * sv;
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.08, 0.94, 0.92), sn21(vObj.xz * 9.0) * 0.35);
    _rough = 0.52; _metal = 0.0; _bh = sv * 0.2; _bs = 0.2;
  } else if (sm == 3) {
    float ang = atan(vObj.x, vObj.z);
    float strand = sn21(vec2(ang * 34.0, vObj.y * 3.0)) * 0.6 + sn21(vec2(ang * 90.0, vObj.y * 9.0)) * 0.4;
    diffuseColor.rgb *= 0.62 + 0.62 * strand;
    _rough = 0.42; _metal = 0.12; _bh = strand; _bs = 1.1;
  } else if (sm == 4) {
    float wn = sfbm(suv * vec2(1.2, 9.0));
    float ring = fract((suv.x * 3.0 + wn * 2.4) * 2.6);
    diffuseColor.rgb *= 0.74 + 0.3 * smoothstep(0.0, 0.7, ring) + 0.1 * wn;
    _rough = 0.58; _metal = 0.0; _bh = ring * 0.6 + wn; _bs = 0.5;
  } else if (sm == 5 || sm == 11) {
    float br = sn21(vec2(suv.x * 2.0, suv.y * 260.0));
    diffuseColor.rgb *= 0.9 + 0.12 * br;
    _rough = sm == 11 ? 0.08 : 0.34 + br * 0.1; _metal = sm == 11 ? 1.0 : 0.88;
  } else if (sm == 6) {
    float tr = sn21(suv * 50.0);
    diffuseColor.rgb *= 0.85 + 0.15 * tr;
    _rough = 0.95; _metal = 0.0; _bh = tr; _bs = 0.5;
  } else if (sm == 7) {
    _rough = 0.04; _metal = 0.92;
  } else if (sm == 8) {
    float cl = sfbm(vWPos.xz * 0.9 + vWPos.y * 0.7);
    float lf = sn21(vObj.xy * 7.5 + vObj.z * 5.0);
    float hi = sn21(vObj.xz * 14.0 + vObj.y * 9.0);
    diffuseColor.rgb *= 0.62 + 0.5 * cl + 0.25 * lf;
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.25, 1.2, 0.75), smoothstep(0.65, 0.95, hi) * 0.5);
    diffuseColor.rgb *= mix(0.55, 1.0, smoothstep(-0.6, 0.6, normalize(vObjN).y));
    _rough = 0.82; _metal = 0.0; _bh = lf * 0.7 + hi * 0.5; _bs = 1.6;
  } else if (sm == 9) {
    float ang = atan(vObj.x, vObj.z);
    float bk = sfbm(vec2(ang * 3.0, vObj.y * 2.5)) ;
    float cr = smoothstep(0.35, 0.55, sn21(vec2(ang * 7.0, vObj.y * 0.9)));
    diffuseColor.rgb *= 0.6 + 0.45 * bk - 0.18 * cr;
    _rough = 0.96; _metal = 0.0; _bh = bk - cr * 0.8; _bs = 1.4;
  } else if (sm == 10) {
    float gr = sn21(suv * 120.0);
    diffuseColor.rgb *= 0.92 + 0.1 * gr;
    _rough = 0.48; _metal = 0.0; _bh = gr; _bs = 0.25;
  } else if (sm == 12) {
    float sp = sn21(suv * 30.0) * 0.6 + sh21(suv * 200.0) * 0.4;
    diffuseColor.rgb *= 0.86 + 0.2 * sp;
    _rough = 0.94; _metal = 0.0; _bh = sp; _bs = 0.5;
  } else if (sm == 13) {
    _rough = 0.38; _metal = 0.02;
  }
  float _dmg = vState.w;
  if (_dmg > 0.01 && vPaint > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.08,0.07,0.06), _dmg * 0.8 * (0.6 + 0.4*sin(vObj.x*9.0+vObj.z*7.0)));
  ${opts.snow ? 'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92,0.94,0.97), uSnow * smoothstep(0.4, 0.9, normalize(vWorldN).y) * 0.85);' : ''}
  ${opts.wet !== false ? 'if (uWet > 0.01 && sm != 7) { float wv = uWet * smoothstep(0.2, 0.9, normalize(vWorldN).y + 0.4); diffuseColor.rgb *= 1.0 - wv * 0.25; _rough = mix(_rough, 0.15, wv * 0.7); }' : ''}
  vec3 _emis = vec3(0.0);
  if (vGlow > 0.5) {
    if (vGlow < 1.5) _emis = vec3(1.0, 0.95, 0.85) * (0.2 + vState.x * 3.0);
    else if (vGlow < 2.5) _emis = vec3(1.0, 0.08, 0.05) * (0.3 + vState.x * 0.9 + vState.y * 2.5);
    else if (vGlow < 3.5) _emis = vec3(1.0, 0.05, 0.05) * vState.z * step(0.5, fract(uTime * 2.3)) * 5.0;
    else if (vGlow < 4.5) _emis = vec3(0.1, 0.25, 1.0) * vState.z * step(0.5, fract(uTime * 2.3 + 0.5)) * 6.0;
    else if (vGlow < 5.5) _emis = vCol * (0.6 + uNight * 1.6);
    else if (vGlow < 6.5) _emis = vec3(1.0, 0.55, 0.05) * vState.z * step(0.5, fract(uTime * 1.6)) * 4.0;
    else if (vGlow < 7.5) _emis = vec3(0.0);
    else if (vGlow < 8.5) _emis = vCol * vState.x * 4.0;
    else _emis = vCol * uNight * 2.5;
  }
`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = _rough;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor = _metal;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  if (_bs > 0.0) {
    vec3 _vp = -vViewPosition;
    vec3 _dpx = dFdx(_vp), _dpy = dFdy(_vp);
    float _dhx = dFdx(_bh), _dhy = dFdy(_bh);
    vec3 _r1 = cross(_dpy, normal), _r2 = cross(normal, _dpx);
    float _det = dot(_dpx, _r1);
    vec3 _grad = sign(_det) * (_dhx * _r1 + _dhy * _r2);
    vec3 _nn = abs(_det) * normal - _grad * _bs * 0.02;
    if (dot(_nn, _nn) > 1e-12 && abs(_det) > 1e-12) normal = normalize(_nn);
  }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += _emis;');
    if (physical) sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n material.clearcoat = _cc;');
  };
  m.customProgramCacheKey = () => 'inst-v2-' + (opts.key || '') + (opts.snow ? 's' : '') + (physical ? 'p' : '');
  return m;
}

// Geometry builder that tags vertices with color/paint/glow/surface attributes and merges.
// k.surf('fabric') sets the surface type for the parts added after it.
export class ModelKit {
  constructor() { this.pos = []; this.nrm = []; this.col = []; this.paint = []; this.glow = []; this.mat = []; this.cur = 0; }
  surf(name) { this.cur = typeof name === 'number' ? name : (SURF[name] ?? 0); return this; }
  _push(geo, color, paint, glow, mat) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    if (mat) geo.applyMatrix4(mat);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const p = geo.attributes.position.array, n = geo.attributes.normal.array;
    const c = new THREE.Color(color);
    const sm = glow === 7 && this.cur === 0 ? SURF.glass : this.cur;
    for (let i = 0; i < p.length; i += 3) {
      this.pos.push(p[i], p[i + 1], p[i + 2]);
      this.nrm.push(n[i], n[i + 1], n[i + 2]);
      this.col.push(c.r, c.g, c.b);
      this.paint.push(paint);
      this.glow.push(glow);
      this.mat.push(sm);
    }
    return this;
  }
  _xf(x, y, z, rot, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Matrix4();
    if (rot) m.makeRotationFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], rot[3] || 'XYZ'));
    if (sx !== 1 || sy !== 1 || sz !== 1) m.multiply(new THREE.Matrix4().makeScale(sx, sy, sz));
    m.setPosition(x, y, z);
    return m;
  }
  box(x, y, z, w, h, d, color, paint = 0, glow = 0, rot = null) {
    return this._push(new THREE.BoxGeometry(w, h, d), color, paint, glow, this._xf(x, y, z, rot));
  }
  // rounded box: radius r on every edge (smooth shading), centered at x,y,z
  rbox(x, y, z, w, h, d, r, color, paint = 0, glow = 0, rot = null, seg = 1) {
    r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
    const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2);
    const p = g.attributes.position, n = g.attributes.normal;
    const ix = w / 2 - r, iy = h / 2 - r, iz = d / 2 - r;
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
      const cx = Math.max(-ix, Math.min(ix, vx)), cy = Math.max(-iy, Math.min(iy, vy)), cz = Math.max(-iz, Math.min(iz, vz));
      let dx = vx - cx, dy = vy - cy, dz = vz - cz;
      const L = Math.hypot(dx, dy, dz) || 1;
      dx /= L; dy /= L; dz /= L;
      p.setXYZ(i, cx + dx * r, cy + dy * r, cz + dz * r);
      n.setXYZ(i, dx, dy, dz);
    }
    return this._push(g, color, paint, glow, this._xf(x, y, z, rot));
  }
  // tapered box: bottom w*d, top tw*td (centered), y from y0 to y1, top shifted by dz
  taper(x, y0, z, w, d, tw, td, h, color, paint = 0, glow = 0, topShiftZ = 0) {
    const g = new THREE.BoxGeometry(1, 1, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const top = p.getY(i) > 0;
      const sx = top ? tw : w, sz = top ? td : d;
      p.setXYZ(i, x + p.getX(i) * sx, y0 + (top ? h : 0), z + p.getZ(i) * sz + (top ? topShiftZ : 0));
    }
    g.computeVertexNormals();
    return this._push(g, color, paint, glow, null);
  }
  cyl(x, y, z, r, h, color, segs = 10, paint = 0, glow = 0, rot = null, r2 = null) {
    return this._push(new THREE.CylinderGeometry(r2 ?? r, r, h, segs), color, paint, glow, this._xf(x, y, z, rot));
  }
  sphere(x, y, z, r, color, paint = 0, glow = 0, sx = 1, sy = 1, sz = 1, detail = 1) {
    const g = new THREE.IcosahedronGeometry(r, detail);
    const m = new THREE.Matrix4().makeScale(sx, sy, sz);
    m.setPosition(x, y, z);
    return this._push(g, color, paint, glow, m);
  }
  // smooth UV-sphere ellipsoid (better shading than icosa for heads/bodies)
  ball(x, y, z, rx, ry, rz, color, paint = 0, glow = 0, ws = 14, hs = 10, rot = null) {
    return this._push(new THREE.SphereGeometry(1, ws, hs), color, paint, glow, this._xf(x, y, z, rot, rx, ry, rz));
  }
  // organic lump (foliage, rocks): icosphere with value-noise displaced radius
  blob(x, y, z, rx, ry, rz, color, paint = 0, glow = 0, seed = 1, amp = 0.22, detail = 2) {
    const g = new THREE.IcosahedronGeometry(1, detail);
    const pa = g.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const vx = pa.getX(i), vy = pa.getY(i), vz = pa.getZ(i);
      const n = Math.sin(vx * 3.1 + seed) * Math.sin(vy * 2.7 + seed * 1.7) * Math.sin(vz * 3.4 + seed * 0.6) + Math.sin(vx * 7.3 - seed) * Math.sin(vz * 6.1 + vy * 5.2) * 0.5;
      const f = 1 + n * amp;
      pa.setXYZ(i, vx * f, vy * f, vz * f);
    }
    g.computeVertexNormals();
    // flat-ish facets share vertices via toNonIndexed in _push; recompute smooth normals there
    return this._push(mergeVerticesSmooth(g.index ? g.toNonIndexed() : g), color, paint, glow, this._xf(x, y, z, null, rx, ry, rz));
  }
  // lathe around Y from [[r, y], ...]
  lathe(x, y, z, pts, color, segs = 14, paint = 0, glow = 0, rot = null, sx = 1, sz = 1) {
    const g = new THREE.LatheGeometry(pts.map(([r, yy]) => new THREE.Vector2(Math.max(0, r), yy)), segs);
    return this._push(g, color, paint, glow, this._xf(x, y, z, rot, sx, 1, sz));
  }
  // tube along a polyline of [x,y,z] with radius r (or per-point radii)
  tube(pts, r, color, segs = 6, paint = 0, glow = 0) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    const g = new THREE.TubeGeometry(curve, Math.max(2, pts.length * 3), r, segs, false);
    return this._push(g, color, paint, glow, null);
  }
  // loft through cross sections {z, w, yb, yt, r (corner roundness 0..1), xo}: rounded-rect rings
  // connected along Z (sections sorted by increasing z), with end caps. Good for car bodies, furniture, torsos.
  loft(sections, color, paint = 0, glow = 0, ring = 16, rot = null, cap = true) {
    const pos = [];
    const ringPts = (s) => {
      const out = [];
      const hw = s.w / 2, hh = (s.yt - s.yb) / 2, cy = (s.yt + s.yb) / 2;
      const rr = Math.min(hw, hh) * (s.r ?? 0.5);
      // superellipse-ish rounded rectangle, counter-clockwise looking down +Z
      for (let i = 0; i < ring; i++) {
        const a = (i / ring) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const ex = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / (2 + 6 * (1 - (s.r ?? 0.5))));
        const ey = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / (2 + 6 * (1 - (s.r ?? 0.5))));
        out.push([(s.xo || 0) + ex * hw, cy + ey * hh]);
        void rr;
      }
      return out;
    };
    const rings = sections.map((s) => ({ z: s.z, p: ringPts(s) }));
    for (let k = 0; k < rings.length - 1; k++) {
      const A = rings[k], B = rings[k + 1];
      for (let i = 0; i < ring; i++) {
        const i2 = (i + 1) % ring;
        const a0 = [A.p[i][0], A.p[i][1], A.z], a1 = [A.p[i2][0], A.p[i2][1], A.z];
        const b0 = [B.p[i][0], B.p[i][1], B.z], b1 = [B.p[i2][0], B.p[i2][1], B.z];
        pos.push(...a0, ...a1, ...b0, ...a1, ...b1, ...b0);
      }
    }
    if (cap) for (const [R, flip] of [[rings[0], true], [rings[rings.length - 1], false]]) {
      let cx = 0, cy = 0;
      for (const q of R.p) { cx += q[0]; cy += q[1]; }
      cx /= ring; cy /= ring;
      for (let i = 0; i < ring; i++) {
        const i2 = (i + 1) % ring;
        const a = [R.p[i][0], R.p[i][1], R.z], b = [R.p[i2][0], R.p[i2][1], R.z], c = [cx, cy, R.z];
        if (flip) pos.push(...a, ...c, ...b); else pos.push(...a, ...b, ...c);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    // smooth normals across rings (caps keep flat normals)
    const merged = mergeVerticesSmooth(g);
    return this._push(merged, color, paint, glow, rot ? this._xf(0, 0, 0, rot) : null);
  }
  geo(g, color, paint = 0, glow = 0, mat = null) { return this._push(g, color, paint, glow, mat); }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('aCol', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aPaint', new THREE.Float32BufferAttribute(this.paint, 1));
    g.setAttribute('aGlow', new THREE.Float32BufferAttribute(this.glow, 1));
    g.setAttribute('aMat', new THREE.Float32BufferAttribute(this.mat, 1));
    g.computeBoundingSphere();
    return g;
  }
}

// smooth vertex normals for a non-indexed triangle soup, keeping hard edges sharper than ~50 degrees
function mergeVerticesSmooth(g) {
  const p = g.attributes.position.array;
  const faceN = [];
  for (let i = 0; i < p.length; i += 9) {
    const ax = p[i + 3] - p[i], ay = p[i + 4] - p[i + 1], az = p[i + 5] - p[i + 2];
    const bx = p[i + 6] - p[i], by = p[i + 7] - p[i + 1], bz = p[i + 8] - p[i + 2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const L = Math.hypot(nx, ny, nz) || 1;
    faceN.push(nx / L, ny / L, nz / L);
  }
  const key = (i) => `${Math.round(p[i] * 1000)},${Math.round(p[i + 1] * 1000)},${Math.round(p[i + 2] * 1000)}`;
  const groups = new Map();
  for (let v = 0; v < p.length / 3; v++) {
    const k = key(v * 3);
    let arr = groups.get(k); if (!arr) groups.set(k, arr = []);
    arr.push(v);
  }
  const n = new Float32Array(p.length);
  for (let v = 0; v < p.length / 3; v++) {
    const f = Math.floor(v / 3);
    const fx = faceN[f * 3], fy = faceN[f * 3 + 1], fz = faceN[f * 3 + 2];
    let sx = 0, sy = 0, sz = 0;
    for (const o of groups.get(key(v * 3))) {
      const of = Math.floor(o / 3);
      const ox = faceN[of * 3], oy = faceN[of * 3 + 1], oz = faceN[of * 3 + 2];
      if (ox * fx + oy * fy + oz * fz > 0.64) { sx += ox; sy += oy; sz += oz; }
    }
    const L = Math.hypot(sx, sy, sz) || 1;
    n[v * 3] = sx / L; n[v * 3 + 1] = sy / L; n[v * 3 + 2] = sz / L;
  }
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  return g;
}

// An InstancedMesh that is re-filled every frame from a list of visible entities.
export class InstPool {
  constructor(geo, mat, cap, opts = {}) {
    this.cap = cap;
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = !!opts.shadow;
    this.mesh.receiveShadow = !!opts.receive;
    this.mesh.count = 0;
    this.c1 = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3); this.c1.setUsage(THREE.DynamicDrawUsage);
    this.c2 = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3); this.c2.setUsage(THREE.DynamicDrawUsage);
    this.st = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4); this.st.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iCol1', this.c1);
    geo.setAttribute('iCol2', this.c2);
    geo.setAttribute('iState', this.st);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.n = 0;
  }
  begin() { this.n = 0; }
  add(matrix, c1, c2, s0 = 0, s1 = 0, s2 = 0, s3 = 0) {
    if (this.n >= this.cap) return -1;
    const i = this.n++;
    this.mesh.setMatrixAt(i, matrix);
    if (c1) { this.c1.array[i * 3] = c1.r; this.c1.array[i * 3 + 1] = c1.g; this.c1.array[i * 3 + 2] = c1.b; }
    if (c2) { this.c2.array[i * 3] = c2.r; this.c2.array[i * 3 + 1] = c2.g; this.c2.array[i * 3 + 2] = c2.b; }
    const s = this.st.array;
    s[i * 4] = s0; s[i * 4 + 1] = s1; s[i * 4 + 2] = s2; s[i * 4 + 3] = s3;
    return i;
  }
  end() {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.c1.needsUpdate = true; this.c2.needsUpdate = true; this.st.needsUpdate = true;
  }
}

export function canvasTexture(w, h, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 4;
  return t;
}
