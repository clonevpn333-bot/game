import * as THREE from 'three';
import { LAYER_COUNT, LAYER_TILE_M, makeLeafTexture, makeGrassTexture } from './textures.js';

// ---------------------------------------------------------------------------
// Shared uniforms. Objects are shared by reference across every material so a
// single assignment updates the whole world.
// ---------------------------------------------------------------------------
export const GU = {
  uTime: { value: 0 },
  uNight: { value: 0 },
  uDaylight: { value: 1 },
  uWet: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0.4, 0.6, 0.3).normalize() },
  uSunColor: { value: new THREE.Color(1, 0.9, 0.8) },
  uFogSun: { value: new THREE.Color(1, 0.8, 0.6) },
  uFogFalloff: { value: 0.012 },
  uFogBase: { value: 0 },
  uWind: { value: new THREE.Vector3(0.3, 0.0, 0.2) },
  uAlb: { value: null },
  uNrm: { value: null },
  uLayerTile: { value: LAYER_TILE_M.slice() },
  uNearMask: { value: null },
  uChunkGrid: { value: new THREE.Vector4(-1344, -1344, 96, 28) },
  uSkyTop: { value: new THREE.Color(0.3, 0.5, 0.9) },
  uSkyHorizon: { value: new THREE.Color(0.8, 0.85, 0.9) },
  uPlayerPos: { value: new THREE.Vector3() },
};

// Per-era uniforms (shift wavefront + era look)
function makeEraUniforms(era) {
  return {
    uShiftMode: { value: 0 },
    uShiftRadius: { value: 0 },
    uShiftCenter: { value: new THREE.Vector3() },
    uShiftEdge: { value: new THREE.Color(0.4, 0.9, 1.0) },
    uShiftEdgeW: { value: 1.6 },
    uShiftRise: { value: 1 },
    uLitA: { value: new THREE.Color(1.0, 0.72, 0.42) },
    uLitB: { value: new THREE.Color(1.0, 0.9, 0.7) },
    uLitFrac: { value: 0.5 },
    uOver: { value: 0 },
    uGrime: { value: 0.3 },
    uBroken: { value: 0 },
    uGlass: { value: new THREE.Color(0.12, 0.16, 0.2) },
    uEraId: { value: era },
  };
}
export const EU = [makeEraUniforms(0), makeEraUniforms(1), makeEraUniforms(2)];

// --------------------------------------------------------------- GLSL ------
const NOISE = /* glsl */`
float wsHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float wsNoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(wsHash(i), wsHash(i + vec3(1,0,0)), f.x), mix(wsHash(i + vec3(0,1,0)), wsHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(wsHash(i + vec3(0,0,1)), wsHash(i + vec3(1,0,1)), f.x), mix(wsHash(i + vec3(0,1,1)), wsHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float wsHash2(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
float wsNoise2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wsHash2(i), wsHash2(i + vec2(1,0)), f.x), mix(wsHash2(i + vec2(0,1)), wsHash2(i + vec2(1,1)), f.x), f.y); }
float wsFbm2(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * wsNoise2(p); p = p * 2.03 + 17.1; a *= 0.5; } return s / 0.9375; }
`;

const SHIFT_PARS = /* glsl */`
uniform float uTime, uNight, uDaylight, uWet;
uniform float uShiftMode, uShiftRadius, uShiftEdgeW, uShiftRise;
uniform vec3 uShiftCenter, uShiftEdge;
varying vec3 vWsPos;
varying vec3 vWsNrm;
`;

const VERT_PARS = /* glsl */`
${SHIFT_PARS}
uniform vec3 uWind;
attribute vec4 aMat;
varying vec4 vMat;
varying vec2 vUvM;
#ifdef WS_FARLOD
attribute vec2 aChunk;
uniform sampler2D uNearMask;
#endif
`;

const VERT_PROJECT = /* glsl */`
vec4 wsWorld = vec4(transformed, 1.0);
vec4 wsN4 = vec4(normal, 0.0);
#ifdef USE_INSTANCING
  wsWorld = instanceMatrix * wsWorld;
  wsN4 = instanceMatrix * wsN4;
#endif
wsWorld = modelMatrix * wsWorld;
vWsNrm = normalize((modelMatrix * wsN4).xyz);
vMat = aMat;
#ifdef WS_UVM
  vUvM = uv;
#else
  vUvM = vec2(0.0);
#endif
#ifdef WS_WIND
  {
    float sway = aMat.w;
    float ph = dot(wsWorld.xz, vec2(0.11, 0.07)) + uTime * 1.6;
    float g = sin(ph) * 0.6 + sin(ph * 2.7 + 1.3) * 0.25 + sin(uTime * 0.35 + wsWorld.x * 0.01) * 0.4;
    wsWorld.xz += uWind.xz * sway * (g + uWind.y);
    wsWorld.y += sin(ph * 3.1) * 0.03 * sway;
  }
#endif
if (uShiftRise > 0.5) {
  float wsBase = min(uShiftCenter.y - 1.6, 0.0);
  float wsD = distance(wsWorld.xz, uShiftCenter.xz);
  if (uShiftMode < -0.5) {
    float k = clamp((uShiftRadius - wsD) / 22.0, 0.0, 1.0);
    k = k * k * (3.0 - 2.0 * k);
    wsWorld.y = wsBase + (wsWorld.y - wsBase) * k;
  } else if (uShiftMode > 0.5) {
    float k = clamp((wsD - uShiftRadius) / 16.0, 0.0, 1.0);
    float sag = (1.0 - k);
    wsWorld.y = wsBase + (wsWorld.y - wsBase) * (1.0 - 0.45 * sag * sag);
    wsWorld.xz += (vec2(sin(wsWorld.y * 3.1 + wsWorld.x), cos(wsWorld.y * 2.7 + wsWorld.z)) * 0.6) * sag * sag;
  }
}
vWsPos = wsWorld.xyz;
#ifdef WS_FARLOD
  if (texelFetch(uNearMask, ivec2(aChunk), 0).r > 0.5) wsWorld.xyz = vec3(0.0, -50000.0, 0.0);
#endif
vec4 mvPosition = viewMatrix * wsWorld;
gl_Position = projectionMatrix * mvPosition;
`;

const FRAG_PARS = /* glsl */`
${SHIFT_PARS}
${NOISE}
varying vec4 vMat;
varying vec2 vUvM;
float wsEdge = 0.0;
`;

const FRAG_SHIFT = /* glsl */`
if (abs(uShiftMode) > 0.5) {
  float wsD = distance(vWsPos, uShiftCenter);
  float wsF = wsD + (wsNoise(vWsPos * 0.35) - 0.5) * 3.0 - uShiftRadius;
  if (uShiftMode > 0.5 && wsF < 0.0) discard;
  if (uShiftMode < -0.5 && wsF > 0.0) discard;
  wsEdge = 1.0 - smoothstep(0.0, uShiftEdgeW, abs(wsF));
  float grid = step(0.82, fract(vWsPos.y * 1.5)) + step(0.9, fract((vWsPos.x + vWsPos.z) * 0.7));
  wsEdge *= 0.7 + 0.6 * min(grid, 1.0);
}
`;

// Uber surface shading: texture-array PBR + facades + overgrowth + wetness
const UBER_PARS = /* glsl */`
uniform sampler2DArray uAlb;
uniform sampler2DArray uNrm;
uniform float uLayerTile[${LAYER_COUNT}];
uniform vec3 uLitA, uLitB, uGlass, uSunColor;
uniform float uLitFrac, uOver, uGrime, uBroken;
vec3 wsAlbedo = vec3(0.5);
float wsRough = 0.8;
float wsMetal = 0.0;
vec3 wsTN = vec3(0.0, 0.0, 1.0);
vec3 wsEmis = vec3(0.0);
float wsAO = 1.0;
vec2 wsUV = vec2(0.0);
bool wsIsGlass = false;

vec4 wsTexA(float layer, vec2 uvm) { return texture(uAlb, vec3(uvm / uLayerTile[int(layer + 0.5)], layer)); }
vec4 wsTexN(float layer, vec2 uvm) { return texture(uNrm, vec3(uvm / uLayerTile[int(layer + 0.5)], layer)); }

vec3 wsInterior(vec2 wuv, float h, vec3 n, vec3 t, float aspect) {
  vec3 V = normalize(vWsPos - cameraPosition);
  vec3 rd = vec3(dot(V, t), V.y * aspect, max(-dot(V, n), 0.04));
  vec3 ro = vec3(wuv * 2.0 - 1.0, 0.0);
  float depth = 1.4 + h * 1.2;
  float tx = (sign(rd.x) - ro.x) / (abs(rd.x) < 1e-4 ? 1e-4 : rd.x);
  float ty = (sign(rd.y) - ro.y) / (abs(rd.y) < 1e-4 ? 1e-4 : rd.y);
  float tz = depth / rd.z;
  float tm = min(min(tx, ty), tz);
  vec3 hit = ro + rd * tm;
  float wh = fract(h * 13.17);
  vec3 wallCol = mix(vec3(0.78, 0.72, 0.62), vec3(0.6, 0.66, 0.74), wh);
  wallCol = mix(wallCol, vec3(0.75, 0.55, 0.45), step(0.8, fract(h * 7.7)));
  vec3 c;
  if (tm == tz) {
    c = wallCol * (0.85 + 0.15 * hit.y);
    // furniture / shelving silhouettes against the back wall
    float fx = hit.x - (fract(h * 3.3) - 0.5) * 1.2;
    if (hit.y < -0.25 && abs(fx) < 0.45) c *= 0.35;
    if (hit.y > 0.05 && hit.y < 0.55 && abs(hit.x + 0.5 - wh) < 0.28) c = mix(c, vec3(0.3, 0.4, 0.5), 0.6);
  } else if (tm == tx) {
    c = wallCol * 0.72;
  } else if (rd.y < 0.0) {
    c = mix(vec3(0.36, 0.27, 0.2), vec3(0.3, 0.3, 0.33), step(0.5, wh)) * (0.7 + 0.3 * hit.z / depth);
  } else {
    c = vec3(0.86, 0.85, 0.82);
  }
  c *= 1.0 - 0.45 * (hit.z / depth);
  return c;
}

void wsFacade(float style, float seed, float floorH) {
  bool aband = style > 19.5;
  if (aband) style -= 20.0;
  bool store = style > 9.5;
  if (store) style -= 10.0;
  vec3 n = normalize(vWsNrm);
  if (abs(n.y) > 0.5) return;
  vec3 t = normalize(cross(vec3(0.0, 1.0, 0.0), n));
  vec2 uv = vUvM;
  float fy = uv.y / floorH;
  float fl = floor(fy);
  float fv = fract(fy);
  float bay = style < 0.5 ? 2.7 : style < 1.5 ? 3.3 : style < 2.5 ? 1.7 : style < 3.5 ? 2.3 : style < 4.5 ? 3.6 : style < 5.5 ? 4.2 : 2.5;
  bay *= 0.9 + 0.25 * fract(seed * 7.31);
  float fx = uv.x / bay;
  float bi = floor(fx);
  float fu = fract(fx);
  vec4 r = vec4(2.0);
  if (style < 0.5) r = vec4(0.24, 0.76, 0.26, 0.8);
  else if (style < 1.5) r = vec4(0.0, 1.0, 0.32, 0.8);
  else if (style < 2.5) r = vec4(0.03, 0.97, 0.1, 0.94);
  else if (style < 3.5) r = vec4(0.3, 0.7, 0.16, 0.86);
  else if (style < 4.5) r = vec4(0.32, 0.68, 0.3, 0.76);
  else if (style < 5.5) r = vec4(0.08, 0.92, 0.62, 0.86);
  else if (style < 6.5) r = vec4(0.12, 0.88, 0.22, 0.72);
  float wh = wsHash2(vec2(bi + 0.5, fl + 0.5) + seed * 31.7);
  if (style > 3.5 && style < 4.5 && wh > 0.6) r = vec4(2.0);
  if (style > 4.5 && style < 5.5 && fl > 0.5 && fv < 0.5) r = vec4(2.0);
  bool ground = fl < 0.5;
  if (ground && store) r = vec4(0.05, 0.95, 0.04, 0.8);
  if (uv.y < 0.0) r = vec4(2.0);
  float inW = step(r.x, fu) * step(fu, r.y) * step(r.z, fv) * step(fv, r.w);
  // stains under windows / grime near base
  float under = (1.0 - inW) * step(r.x, fu) * step(fu, r.y) * smoothstep(r.z, r.z - 0.5, fv) * step(fv, r.z);
  float grime = uGrime * (under * 0.35 * wsFbm2(vec2(uv.x * 3.0, uv.y * 0.6)) + (1.0 - smoothstep(0.0, 2.5, uv.y)) * 0.25);
  wsAlbedo *= 1.0 - grime;
  // sills / lintels for punched windows
  if (style < 0.5 || (style > 2.5 && style < 4.5)) {
    float sill = step(r.x - 0.03, fu) * step(fu, r.y + 0.03) * step(r.z - 0.05, fv) * step(fv, r.z);
    float lintel = step(r.x - 0.02, fu) * step(fu, r.y + 0.02) * step(r.w, fv) * step(fv, r.w + 0.06);
    float s = max(sill, lintel) * (1.0 - inW);
    wsAlbedo = mix(wsAlbedo, vec3(0.72, 0.7, 0.66), s * 0.85);
    wsTN = mix(wsTN, vec3(0.0, 0.6, 0.8), sill * 0.6);
  }
  if (style > 5.5 && style < 6.5) {
    // 2047 LED seams between floors
    float band = 1.0 - smoothstep(0.0, 0.012, abs(fv - 0.97));
    wsEmis += mix(vec3(0.2, 0.9, 1.4), vec3(1.4, 0.3, 1.0), step(0.5, fract(seed * 5.1))) * band * (0.4 + 1.6 * uNight);
  }
  if (inW < 0.5) return;

  vec2 wuv = vec2((fu - r.x) / (r.y - r.x), (fv - r.z) / (r.w - r.z));
  float aspect = ((r.w - r.z) * floorH) / ((r.y - r.x) * bay);
  float wseed = wsHash2(vec2(bi * 1.37 + seed * 91.0, fl * 2.11 + 3.0));
  if (style > 0.5 && style < 2.5) wseed = wsHash2(vec2(floor(bi / 3.0) + seed * 91.0, fl * 2.11));
  float mull = 0.0;
  if (style < 0.5 || (style > 2.5 && style < 4.5)) {
    mull = max(1.0 - smoothstep(0.015, 0.035, abs(wuv.x - 0.5)), 1.0 - smoothstep(0.015, 0.03, abs(wuv.y - 0.58)));
  } else if (style < 2.5) {
    float mx = abs(fract(fx * (style < 1.5 ? 1.0 : 1.0)) - 0.5);
    mull = 1.0 - smoothstep(0.46, 0.48, mx);
    mull = max(mull, 1.0 - smoothstep(0.0, 0.03, min(wuv.y, 1.0 - wuv.y)));
  } else {
    mull = max(1.0 - smoothstep(0.0, 0.02, min(wuv.x, 1.0 - wuv.x)), 1.0 - smoothstep(0.0, 0.04, min(wuv.y, 1.0 - wuv.y)));
  }
  // frame
  float frame = 1.0 - smoothstep(0.0, 0.035, min(min(wuv.x, 1.0 - wuv.x), min(wuv.y, 1.0 - wuv.y)) * (r.y - r.x) * bay);
  mull = max(mull, frame);

  float broken = step(wseed, max(uBroken, aband ? 0.6 : 0.0));
  if (aband && broken > 0.5 && fract(wseed * 3.3) > 0.45) {
    // boarded-up window
    vec4 wa = wsTexA(15.0, vec2(wuv.x * 1.3, wuv.y * 2.0 + wseed * 5.0));
    wsAlbedo = wa.rgb * vec3(0.9, 0.85, 0.8);
    wsRough = 0.9;
    wsTN = vec3(0.0, 0.0, 1.0);
    return;
  }
  float occ = 0.35 + 0.65 * fract(seed * 17.3);
  float lit = step(fract(wseed * 7.77), uLitFrac * occ);
  if (ground && store) lit = step(0.25, uLitFrac) ;
  vec3 room = wsInterior(wuv, wseed, n, t, aspect);
  vec3 litCol = mix(uLitA, uLitB, fract(wseed * 3.71)) * (0.65 + 0.7 * fract(wseed * 5.3));
  float tv = step(0.92, fract(wseed * 11.1)) * lit;
  litCol = mix(litCol, vec3(0.4, 0.6, 1.2) * (0.7 + 0.3 * sin(uTime * 9.0 + wseed * 40.0)), tv);
  // blinds
  float blindAmt = step(0.6, fract(wseed * 9.1)) * fract(wseed * 4.3);
  float blind = step(1.0 - blindAmt, wuv.y);
  vec3 blindCol = mix(vec3(0.85, 0.82, 0.74), vec3(0.6, 0.65, 0.7), fract(wseed * 2.1));
  blindCol *= 0.85 + 0.15 * step(0.5, fract(wuv.y * 18.0));
  vec3 interior = mix(room, blindCol, blind * 0.92);
  float dayInt = 0.06 + 0.12 * uDaylight;
  if (broken > 0.5) {
    wsAlbedo = vec3(0.015);
    wsRough = 0.95;
    wsEmis += interior * 0.03 * uDaylight;
    wsTN = vec3(0.0, 0.0, 1.0);
    return;
  }
  wsIsGlass = true;
  wsAlbedo = vec3(0.012);
  wsRough = 0.06;
  wsMetal = style > 1.5 && style < 2.5 ? 0.35 : 0.0;
  wsTN = vec3(0.0, 0.0, 1.0);
  wsEmis += interior * (lit > 0.5 ? litCol * (0.35 + 1.25 * uNight) : vec3(dayInt));
  wsEmis *= 1.0 - mull;
  if (style > 1.5 && style < 2.5) wsAlbedo = uGlass * 0.4;
  if (mull > 0.01) {
    vec3 mc = style < 0.5 ? vec3(0.85, 0.83, 0.78) : style > 1.5 && style < 2.5 ? vec3(0.25, 0.27, 0.3) : vec3(0.32, 0.32, 0.34);
    wsAlbedo = mix(wsAlbedo, mc, mull);
    wsRough = mix(wsRough, 0.5, mull);
    wsMetal = mix(wsMetal, 0.3, mull);
  }
}

void wsTerrain() {
  vec3 n = normalize(vWsNrm);
  float slope = 1.0 - n.y;
  vec2 p = vWsPos.xz;
  float nz = wsFbm2(p * 0.04);
  vec4 g = wsTexA(10.0, p);
  vec4 d = wsTexA(11.0, p);
  vec4 s = wsTexA(6.0, vec2(p.x + vWsPos.y, p.y + vWsPos.y) * 0.7);
  vec4 gn = wsTexN(10.0, p);
  vec4 dn = wsTexN(11.0, p);
  float dirt = smoothstep(0.55, 0.7, nz + slope * 0.6);
  float rock = smoothstep(0.32, 0.5, slope);
  vec4 a = mix(g, d, dirt);
  vec4 nn = mix(gn, dn, dirt);
  a = mix(a, vec4(s.rgb * vec3(0.8, 0.78, 0.74), 0.9), rock);
  wsAlbedo = a.rgb * vColor.rgb;
  wsRough = a.a;
  wsTN = nn.xyz * 2.0 - 1.0;
  wsAO = nn.a;
}

vec3 wsPerturb(vec3 N, vec3 p, vec2 uv, vec3 tn) {
  vec3 dp1 = dFdx(p), dp2 = dFdy(p);
  vec2 duv1 = dFdx(uv), duv2 = dFdy(uv);
  vec3 dp2perp = cross(dp2, N), dp1perp = cross(N, dp1);
  vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
  vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;
  float det = max(dot(T, T), dot(B, B));
  if (det < 1e-12) return N;
  float invmax = inversesqrt(det);
  return normalize(mat3(T * invmax, B * invmax, N) * tn);
}
`;

const UBER_SURFACE = /* glsl */`
{
  float wsLayer = vMat.x;
  float wsStyle = vMat.y;
  if (wsStyle < -1.5) {
    wsTerrain();
    wsUV = vWsPos.xz / 4.0;
  } else {
    vec4 ta = wsTexA(wsLayer, vUvM);
    vec4 tn = wsTexN(wsLayer, vUvM);
    wsUV = vUvM / uLayerTile[int(wsLayer + 0.5)];
    wsAlbedo = ta.rgb * vColor.rgb;
    wsRough = ta.a;
    wsTN = tn.xyz * 2.0 - 1.0;
    wsAO = tn.a;
    // metallic layers
    if (wsLayer > 17.5 && wsLayer < 18.5) wsMetal = 0.85;
    if (wsLayer > 4.5 && wsLayer < 5.5) wsMetal = 0.6;
    if (wsLayer > 6.5 && wsLayer < 7.5) wsMetal = 0.25;
    if (wsLayer > 20.5 && wsLayer < 21.5) { wsRough *= 0.6; }
    if (wsStyle > -0.5) wsFacade(wsStyle, vMat.z, vMat.w);
  }
  // Overgrowth (2189): moss, vines, weathering
  if (uOver > 0.0) {
    vec3 n = normalize(vWsNrm);
    float up = smoothstep(0.35, 0.9, n.y);
    float nn = wsFbm2(vWsPos.xz * 0.11 + vWsPos.y * 0.05);
    float low = 1.0 - smoothstep(0.0, 8.0, vWsPos.y);
    float vine = smoothstep(0.5, 0.72, wsFbm2(vec2((vWsPos.x + vWsPos.z) * 0.45, vWsPos.y * 0.06 + vMat.z * 10.0)));
    float moss = clamp(up * (0.25 + nn * 1.1) + low * 0.8 * nn + vine * (1.0 - up) * 0.95, 0.0, 1.0) * uOver;
    if (wsStyle < -1.5) moss *= 0.3;
    vec4 ma = wsTexA(12.0, vWsPos.xz * 0.7 + vWsPos.y * 0.3);
    vec4 mn = wsTexN(12.0, vWsPos.xz * 0.7 + vWsPos.y * 0.3);
    vec3 mcol = ma.rgb * mix(vec3(1.0), vec3(1.25, 1.15, 0.7), nn);
    wsAlbedo *= mix(1.0, 0.72, uOver);
    wsAlbedo = mix(wsAlbedo, mcol, moss);
    wsRough = mix(wsRough, 0.92, moss);
    wsTN = normalize(mix(wsTN, mn.xyz * 2.0 - 1.0, moss));
    wsEmis *= 1.0 - moss;
    if (moss > 0.5) wsIsGlass = false;
    // faint bioluminescence in mossy crevices at night
    float bio = smoothstep(0.82, 0.95, wsNoise(vWsPos * 1.7)) * moss * uNight;
    wsEmis += vec3(0.1, 0.9, 0.7) * bio * 0.9;
  }
  // Rain wetness + puddles
  if (uWet > 0.0) {
    vec3 n = normalize(vWsNrm);
    float up = smoothstep(0.6, 0.95, n.y);
    float puddle = smoothstep(0.52, 0.66, wsFbm2(vWsPos.xz * 0.22)) * up;
    float wet = uWet * (0.45 + 0.55 * up);
    if (!wsIsGlass) {
      wsAlbedo *= mix(1.0, 0.5, wet * (1.0 - wsMetal));
      wsRough = mix(wsRough, 0.1, wet * (0.45 + 0.55 * puddle));
      wsTN = normalize(mix(wsTN, vec3(0.0, 0.0, 1.0), puddle * uWet));
      // ripples
      vec2 rp = vWsPos.xz * 3.0;
      float rip = sin(length(fract(rp) - 0.5) * 40.0 - uTime * 12.0 + wsHash2(floor(rp)) * 30.0);
      wsTN.xy += vec2(rip) * 0.04 * puddle * uWet;
    }
  }
  diffuseColor.rgb = wsAlbedo;
}
`;

// ------------------------------------------------------------------------
const allMaterials = [];

function patchCommon(shader, era, opts) {
  Object.assign(shader.uniforms, GU, EU[era]);
  let vs = shader.vertexShader;
  let fs = shader.fragmentShader;
  vs = vs.replace('#include <common>', '#include <common>\n' + VERT_PARS);
  vs = vs.replace('#include <project_vertex>', VERT_PROJECT);
  fs = fs.replace('#include <common>', '#include <common>\n' + FRAG_PARS);
  if (opts.uber) fs = fs.replace('void main() {', UBER_PARS + '\nvoid main() {');
  fs = fs.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + FRAG_SHIFT);
  return { vs, fs };
}

export function makeWorldMaterial(era, kind, extra = {}) {
  let mat;
  const defines = { WS_UVM: '' };
  if (extra.farLod) defines.WS_FARLOD = '';
  if (kind === 'uber') {
    mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  } else if (kind === 'foliage') {
    mat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.85, metalness: 0, map: extra.map, alphaTest: 0.45, side: THREE.DoubleSide,
    });
    defines.WS_WIND = '';
  } else if (kind === 'emissive') {
    mat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  } else if (kind === 'glass') {
    mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.45, depthWrite: false });
  } else if (kind === 'holo') {
    mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  } else if (kind === 'sign') {
    mat = new THREE.MeshBasicMaterial({ vertexColors: true, map: extra.map, transparent: true, alphaTest: 0.05, toneMapped: false, side: THREE.DoubleSide });
  } else {
    throw new Error('unknown material kind ' + kind);
  }
  mat.defines = defines;
  const uber = kind === 'uber';
  mat.onBeforeCompile = (shader) => {
    const { vs, fs: fs0 } = patchCommon(shader, era, { uber });
    let fs = fs0;
    if (extra.noRise) shader.uniforms.uShiftRise = { value: 0 };
    if (uber) {
      fs = fs.replace('#include <color_fragment>', '#include <color_fragment>\n' + UBER_SURFACE);
      fs = fs.replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nroughnessFactor = clamp(wsRough, 0.03, 1.0);\nmetalnessFactor = wsMetal;');
      fs = fs.replace('#include <normal_fragment_maps>', 'normal = wsPerturb(normal, -vViewPosition, wsUV, wsTN);');
      fs = fs.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += wsEmis;');
      fs = fs.replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= wsAO;\nreflectedLight.directDiffuse *= mix(1.0, wsAO, 0.5);');
    }
    if (kind === 'foliage') {
      fs = fs.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec3 V = normalize(vWsPos - cameraPosition);
          float back = pow(max(dot(V, normalize(uSunDirF)), 0.0), 3.0);
          totalEmissiveRadiance += diffuseColor.rgb * uSunColorF * back * 0.55 * uDaylight;
        }`);
      fs = fs.replace('#include <common>', '#include <common>\nuniform vec3 uSunDirF;\nuniform vec3 uSunColorF;');
      shader.uniforms.uSunDirF = GU.uSunDir;
      shader.uniforms.uSunColorF = GU.uSunColor;
    }
    if (kind === 'emissive' || kind === 'holo' || kind === 'sign') {
      // aMat.y: animation pattern, aMat.z: random seed, aMat.w: night-only flag
      fs = fs.replace('#include <opaque_fragment>', `
        {
          float pat = vMat.y; float sd = vMat.z;
          float k = 1.0;
          if (pat > 0.5 && pat < 1.5) { float f = step(0.06, fract(sin(floor(uTime * 12.0 + sd * 50.0) * 12.9898) * 43758.5)); k = mix(0.25, 1.0, f); }
          else if (pat > 1.5 && pat < 2.5) { k = 0.6 + 0.4 * sin(uTime * 2.0 + sd * 20.0); }
          else if (pat > 2.5 && pat < 3.5) { k = 0.65 + 0.35 * step(0.5, fract(vUvM.y * 0.5 - uTime * 0.6 + sd)); k *= 0.85 + 0.15 * sin(vWsPos.y * 40.0 + uTime * 8.0); }
          else if (pat > 3.5 && pat < 4.5) { k = step(0.5, fract(uTime * 1.2 + sd)); }
          else if (pat > 4.5 && pat < 5.5) {
            float li = mod(sd + 0.01, 3.0);
            float ax = floor((sd + 0.01) / 3.0);
            float cyc = mod(uTime, 30.0);
            float st = ax < 0.5 ? (cyc < 12.0 ? 2.0 : cyc < 15.0 ? 1.0 : 0.0) : (cyc < 15.0 ? 0.0 : cyc < 27.0 ? 2.0 : 1.0);
            k = abs(floor(li) - st) < 0.5 ? 1.0 : 0.05;
          }
          if (vMat.w > 0.5 && vMat.w < 1.5) k *= mix(0.06, 1.0, smoothstep(0.15, 0.6, uNight));
          if (vMat.w > 1.5) k *= mix(0.8, 2.2, smoothstep(0.1, 0.6, uNight));
          outgoingLight *= k;
        }
        #include <opaque_fragment>`);
    }
    fs = fs.replace('#include <opaque_fragment>', 'outgoingLight += uShiftEdge * wsEdge * 2.5;\n#include <opaque_fragment>');
    shader.vertexShader = vs;
    shader.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => `ws-${kind}-${extra.farLod ? 1 : 0}`;
  mat.userData.era = era;
  mat.userData.kind = kind;
  allMaterials.push(mat);
  return mat;
}

// Patch a regular material (characters, vehicles, props loaded from GLB) so it
// participates in the shift wavefront for a given era, or is era-neutral.
export function patchActorMaterial(mat, era) {
  if (mat.userData.wsPatched) return mat;
  mat.userData.wsPatched = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, r) => {
    if (prev) prev(shader, r);
    addFogUniforms(shader);
    if (era < 0) return;
    Object.assign(shader.uniforms, {
      uTime: GU.uTime, uNight: GU.uNight, uDaylight: GU.uDaylight, uWet: GU.uWet,
      uShiftMode: EU[era].uShiftMode, uShiftRadius: EU[era].uShiftRadius, uShiftEdgeW: EU[era].uShiftEdgeW,
      uShiftRise: { value: 0 }, uShiftCenter: EU[era].uShiftCenter, uShiftEdge: EU[era].uShiftEdge,
    });
    let vs = shader.vertexShader, fs = shader.fragmentShader;
    vs = vs.replace('#include <common>', '#include <common>\n' + SHIFT_PARS);
    vs = vs.replace('#include <project_vertex>', `#include <project_vertex>
      {
        vec4 wsW = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wsW = instanceMatrix * wsW;
        #endif
        vWsPos = (modelMatrix * wsW).xyz;
        vWsNrm = vec3(0.0, 1.0, 0.0);
      }`);
    fs = fs.replace('#include <common>', '#include <common>\n' + SHIFT_PARS + NOISE + '\nfloat wsEdge = 0.0;');
    fs = fs.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + FRAG_SHIFT);
    fs = fs.replace('#include <opaque_fragment>', 'outgoingLight += uShiftEdge * wsEdge * 2.5;\n#include <opaque_fragment>');
    shader.vertexShader = vs;
    shader.fragmentShader = fs;
  };
  const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : null;
  mat.customProgramCacheKey = () => (prevKey ? prevKey() : '') + `-wsactor${era < 0 ? 'n' : 'e'}`;
  mat.needsUpdate = true;
  return mat;
}

// ---------------------------------------------------------------------------
// Material sets per era
// ---------------------------------------------------------------------------
export class MaterialLibrary {
  constructor(textures) {
    GU.uAlb.value = textures.albedo;
    GU.uNrm.value = textures.normal;
    this.leafTex = makeLeafTexture();
    this.grassTex = makeGrassTexture();
    this.signTex = null;
    this.sets = [0, 1, 2].map((era) => ({
      uber: makeWorldMaterial(era, 'uber'),
      foliage: makeWorldMaterial(era, 'foliage', { map: this.leafTex }),
      grass: makeWorldMaterial(era, 'foliage', { map: this.grassTex }),
      emissive: makeWorldMaterial(era, 'emissive'),
      glass: makeWorldMaterial(era, 'glass'),
      holo: makeWorldMaterial(era, 'holo'),
      far: makeWorldMaterial(era, 'uber', { farLod: true }),
      farEmissive: makeWorldMaterial(era, 'emissive', { farLod: true }),
      terrain: makeWorldMaterial(era, 'uber', { farLod: true, noRise: true }),
      ground: makeWorldMaterial(era, 'uber', { noRise: true }),
      sign: null,
    }));
  }
  setSignTexture(tex) {
    this.signTex = tex;
    this.sets.forEach((s, era) => { s.sign = makeWorldMaterial(era, 'sign', { map: tex }); });
  }
  get(era, kind) {
    return this.sets[era][kind];
  }
}

export function allWorldMaterials() {
  return allMaterials;
}

// ---------------------------------------------------------------------------
// Height fog with sun in-scattering, replacing three's stock fog chunks.
// Uniforms come from GU for patched materials; unpatched ones degrade to plain
// exponential fog.
// ---------------------------------------------------------------------------
THREE.ShaderChunk.fog_pars_vertex = /* glsl */`
#ifdef USE_FOG
  varying vec3 vFogWorld;
#endif
`;
THREE.ShaderChunk.fog_vertex = /* glsl */`
#ifdef USE_FOG
  vFogWorld = cameraPosition + transpose(mat3(viewMatrix)) * mvPosition.xyz;
#endif
`;
THREE.ShaderChunk.fog_pars_fragment = /* glsl */`
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying vec3 vFogWorld;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
  uniform vec3 uFogSun;
  uniform vec3 uSunDir;
  uniform float uFogFalloff;
  uniform float uFogBase;
#endif
`;
THREE.ShaderChunk.fog_fragment = /* glsl */`
#ifdef USE_FOG
  {
    vec3 fr = vFogWorld - cameraPosition;
    float fdist = length(fr);
    vec3 fdir = fr / max(fdist, 1e-4);
    #ifdef FOG_EXP2
      float ff = max(uFogFalloff, 1e-5);
      float h0 = max(cameraPosition.y - uFogBase, -30.0);
      float dy = fdir.y * fdist * ff;
      float lineInt = abs(dy) > 1e-4 ? (1.0 - exp(-dy)) / dy : 1.0;
      float fogAmt = fogDensity * fdist * exp(-h0 * ff) * lineInt;
      float fogFactor = 1.0 - exp(-fogAmt);
    #else
      float fogFactor = smoothstep(fogNear, fogFar, fdist);
    #endif
    float sunAmt = pow(max(dot(fdir, uSunDir), 0.0), 6.0);
    vec3 fcol = mix(fogColor, uFogSun, sunAmt * 0.8 * step(0.001, length(uSunDir)));
    gl_FragColor.rgb = mix(gl_FragColor.rgb, fcol, clamp(fogFactor, 0.0, 1.0));
  }
#endif
`;

export function addFogUniforms(shader) {
  shader.uniforms.uFogSun = GU.uFogSun;
  shader.uniforms.uSunDir = GU.uSunDir;
  shader.uniforms.uFogFalloff = GU.uFogFalloff;
  shader.uniforms.uFogBase = GU.uFogBase;
}
