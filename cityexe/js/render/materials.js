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
      if (inWin > 0.5) {
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
        emis += wc * lit * blind * (0.1 + uNight * 1.25);
        if (boarded > 0.5) { base = vec3(0.4, 0.3, 0.19) * (0.85 + 0.15 * step(0.5, fract(f.y * 6.0))); rough = 0.9; metal = 0.0; }
      }
      // ledges between floors
      if (style > 0.5 && style < 7.0) base *= 1.0 - 0.12 * step(0.94, f.y) * (1.0 - inWin);
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
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += emis;');
  };
  m.customProgramCacheKey = () => 'building-v1';
  return m;
}

// Generic instanced material: vertex colors (aCol) * optional per-instance paint for parts flagged aPaint,
// per-instance second color (iCol2) for parts flagged aPaint==2, emissive channels driven by iState.
// aGlow channels: 1 headlight, 2 taillight/brake, 3 siren red, 4 siren blue, 5 constant glow (sign), 6 amber flasher
export function makeInstMaterial(U, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: opts.roughness ?? 0.6, metalness: opts.metalness ?? 0.1, vertexColors: false, transparent: !!opts.transparent, depthWrite: opts.depthWrite ?? true });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = `
attribute vec3 aCol; attribute float aPaint; attribute float aGlow;
attribute vec3 iCol1; attribute vec3 iCol2; attribute vec4 iState;
varying vec3 vCol; varying float vGlow; varying vec4 vState; varying float vPaint; varying vec3 vObj; varying vec3 vWorldN;
` + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  vec3 pc = aPaint > 1.5 ? iCol2 : (aPaint > 0.5 ? iCol1 : vec3(1.0));
  vCol = aCol * pc; vGlow = aGlow; vState = iState; vPaint = aPaint; vObj = position;
  vWorldN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
`);
    sh.fragmentShader = `
uniform float uNight; uniform float uTime; uniform float uSnow; uniform float uWet;
varying vec3 vCol; varying float vGlow; varying vec4 vState; varying float vPaint; varying vec3 vObj; varying vec3 vWorldN;
` + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
  diffuseColor.rgb *= vCol;
  float _rough = ${(opts.roughness ?? 0.6).toFixed(3)};
  float _metal = ${(opts.metalness ?? 0.1).toFixed(3)};
  if (vPaint > 0.5 && vPaint < 1.5) { _rough = 0.32; _metal = 0.35; }
  if (vGlow > 6.5 && vGlow < 7.5) { _rough = 0.05; _metal = 0.9; }
  float _dmg = vState.w;
  if (_dmg > 0.01 && vPaint > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.08,0.07,0.06), _dmg * 0.8 * (0.6 + 0.4*sin(vObj.x*9.0+vObj.z*7.0)));
  ${opts.snow ? 'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92,0.94,0.97), uSnow * smoothstep(0.4, 0.9, normalize(vWorldN).y) * 0.85);' : ''}
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
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += _emis;');
  };
  m.customProgramCacheKey = () => 'inst-v1-' + (opts.key || '') + (opts.snow ? 's' : '');
  return m;
}

// Geometry builder that tags vertices with color/paint/glow attributes and merges.
export class ModelKit {
  constructor() { this.pos = []; this.nrm = []; this.col = []; this.paint = []; this.glow = []; }
  _push(geo, color, paint, glow, mat) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    if (mat) geo.applyMatrix4(mat);
    const p = geo.attributes.position.array, n = geo.attributes.normal.array;
    const c = new THREE.Color(color);
    for (let i = 0; i < p.length; i += 3) {
      this.pos.push(p[i], p[i + 1], p[i + 2]);
      this.nrm.push(n[i], n[i + 1], n[i + 2]);
      this.col.push(c.r, c.g, c.b);
      this.paint.push(paint);
      this.glow.push(glow);
    }
    return this;
  }
  box(x, y, z, w, h, d, color, paint = 0, glow = 0, rot = null) {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Matrix4();
    if (rot) m.makeRotationFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
    m.setPosition(x, y, z);
    return this._push(g, color, paint, glow, m);
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
    const g = new THREE.CylinderGeometry(r2 ?? r, r, h, segs);
    const m = new THREE.Matrix4();
    if (rot) m.makeRotationFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
    m.setPosition(x, y, z);
    return this._push(g, color, paint, glow, m);
  }
  sphere(x, y, z, r, color, paint = 0, glow = 0, sx = 1, sy = 1, sz = 1, detail = 1) {
    const g = new THREE.IcosahedronGeometry(r, detail);
    const m = new THREE.Matrix4().makeScale(sx, sy, sz);
    m.setPosition(x, y, z);
    return this._push(g, color, paint, glow, m);
  }
  geo(g, color, paint = 0, glow = 0, mat = null) { return this._push(g, color, paint, glow, mat); }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('aCol', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aPaint', new THREE.Float32BufferAttribute(this.paint, 1));
    g.setAttribute('aGlow', new THREE.Float32BufferAttribute(this.glow, 1));
    g.computeBoundingSphere();
    return g;
  }
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
