/* ============================================================
 * ROLLING THUNDER — core utilities
 * RNG, noise, geometry factory (vertex-colored, transformed,
 * mergeable), canvas textures, math helpers.
 * ============================================================ */
const RT = {};
window.RT = RT;

/* ---------- math ---------- */
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const smoothstep = (a, b, t) => { t = clamp((t - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
function angleLerp(a, b, t) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
  return a + d * t;
}
RT.math = { clamp, lerp, damp, smoothstep, angleLerp };

/* ---------- seeded RNG ---------- */
function RNG(seed) {
  let s = seed >>> 0;
  const f = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (a, b) => a + f() * (b - a);
  f.int = (a, b) => Math.floor(f.range(a, b + 1));
  f.pick = arr => arr[Math.floor(f() * arr.length) % arr.length];
  f.chance = p => f() < p;
  f.spread = m => (f() - 0.5) * 2 * m;
  return f;
}
RT.RNG = RNG;

/* ---------- value noise + fbm (terrain) ---------- */
const _nz = (() => {
  const P = new Uint8Array(512);
  const r = RNG(1337);
  for (let i = 0; i < 256; i++) P[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = P[i]; P[i] = P[j]; P[j] = t; }
  for (let i = 0; i < 256; i++) P[256 + i] = P[i];
  const g = (h, x, y) => ((h & 1) ? x : -x) + ((h & 2) ? y : -y);
  return (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = x * x * (3 - 2 * x), v = y * y * (3 - 2 * y);
    const a = g(P[P[X] + Y], x, y), b = g(P[P[X + 1] + Y], x - 1, y);
    const c = g(P[P[X] + Y + 1], x, y - 1), d = g(P[P[X + 1] + Y + 1], x - 1, y - 1);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  };
})();
function fbm(x, y, oct, lac, gain) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += _nz(x * freq, y * freq) * amp;
    norm += amp; amp *= gain; freq *= lac;
  }
  return sum / norm;
}
RT.noise = _nz; RT.fbm = fbm;

/* ============================================================
 * Geometry factory — every helper returns a non-indexed
 * BufferGeometry with position/normal/color, pre-transformed,
 * ready for mergeGeos(). One merged geometry = one draw call.
 * ============================================================ */
const _color = new THREE.Color();
function paintGeo(geo, hex, variation) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const n = g.attributes.position.count;
  const cols = new Float32Array(n * 3);
  _color.set(hex);
  const r0 = _color.r, g0 = _color.g, b0 = _color.b;
  for (let f = 0; f < n; f += 3) {
    let vr = 1;
    if (variation) vr = 1 + (Math.sin(f * 12.9898) * 43758.5453 % 1) * variation;
    for (let k = 0; k < 3; k++) {
      cols[(f + k) * 3] = clamp(r0 * vr, 0, 1);
      cols[(f + k) * 3 + 1] = clamp(g0 * vr, 0, 1);
      cols[(f + k) * 3 + 2] = clamp(b0 * vr, 0, 1);
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return g;
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v3 = new THREE.Vector3(), _sc = new THREE.Vector3();
function xform(geo, o) {
  if (!o) return geo;
  _e.set(o.rx || 0, o.ry || 0, o.rz || 0, o.ord || 'XYZ');
  _q.setFromEuler(_e);
  _v3.set(o.x || 0, o.y || 0, o.z || 0);
  _sc.set(o.sx != null ? o.sx : (o.s != null ? o.s : 1), o.sy != null ? o.sy : (o.s != null ? o.s : 1), o.sz != null ? o.sz : (o.s != null ? o.s : 1));
  _m4.compose(_v3, _q, _sc);
  geo.applyMatrix4(_m4);
  return geo;
}
/* merge list of non-indexed BufferGeometries (position/normal/color) */
function mergeGeos(list) {
  let total = 0;
  for (const g of list) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
  let off = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, off * 3);
    nor.set(g.attributes.normal.array, off * 3);
    col.set(g.attributes.color.array, off * 3);
    off += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}
RT.mergeGeos = mergeGeos;

const G = {
  box(w, h, d, c, o) { return xform(paintGeo(new THREE.BoxGeometry(w, h, d), c, o && o.vary), o); },
  /* chamfered box: silhouette bevels for weapons/props. ch = chamfer size */
  cbox(w, h, d, ch, c, o) {
    ch = Math.min(ch, w * 0.49, h * 0.49, d * 0.49);
    const sh = new THREE.Shape();
    const hw = w / 2 - ch, hh = h / 2 - ch;
    sh.moveTo(-hw, -hh - ch); sh.lineTo(hw, -hh - ch);
    sh.absarc(hw, -hh, ch, -Math.PI / 2, 0, false);
    sh.lineTo(hw + ch, hh);
    sh.absarc(hw, hh, ch, 0, Math.PI / 2, false);
    sh.lineTo(-hw, hh + ch);
    sh.absarc(-hw, hh, ch, Math.PI / 2, Math.PI, false);
    sh.lineTo(-hw - ch, -hh);
    sh.absarc(-hw, -hh, ch, Math.PI, Math.PI * 1.5, false);
    const g = new THREE.ExtrudeGeometry(sh, { depth: d - 2 * ch, bevelEnabled: true, bevelThickness: ch, bevelSize: ch, bevelSegments: 1, curveSegments: 2 });
    g.translate(0, 0, -(d - 2 * ch) / 2);
    return xform(paintGeo(g, c, o && o.vary), o);
  },
  cyl(rt, rb, h, seg, c, o) { return xform(paintGeo(new THREE.CylinderGeometry(rt, rb, h, seg), c, o && o.vary), o); },
  tube(r, h, seg, c, o) { return G.cyl(r, r, h, seg, c, o); },
  cone(r, h, seg, c, o) { return xform(paintGeo(new THREE.ConeGeometry(r, h, seg), c, o && o.vary), o); },
  sph(r, ws, hs, c, o) { return xform(paintGeo(new THREE.SphereGeometry(r, ws, hs), c, o && o.vary), o); },
  sphPart(r, ws, hs, phiLen, c, o) { return xform(paintGeo(new THREE.SphereGeometry(r, ws, hs, 0, TAU, 0, phiLen), c, o && o.vary), o); },
  lathe(pts, seg, c, o) {
    const v = pts.map(p => new THREE.Vector2(p[0], p[1]));
    return xform(paintGeo(new THREE.LatheGeometry(v, seg), c, o && o.vary), o);
  },
  torus(r, t, rs, ts, c, o) { return xform(paintGeo(new THREE.TorusGeometry(r, t, rs, ts), c, o && o.vary), o); },
  plane(w, h, c, o) { return xform(paintGeo(new THREE.PlaneGeometry(w, h), c, o && o.vary), o); },
  /* wedge (triangular prism), apex along +y, length d along z */
  wedge(w, h, d, c, o) {
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, h); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    return xform(paintGeo(g, c, o && o.vary), o);
  },
  extrude(shape, depth, c, o, bevel) {
    const g = new THREE.ExtrudeGeometry(shape, bevel ? { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 3 } : { depth, bevelEnabled: false, curveSegments: 4 });
    g.translate(0, 0, -depth / 2);
    return xform(paintGeo(g, c, o && o.vary), o);
  },
};
RT.G = G;

/* recolor an already-painted geometry region (all of it) */
RT.tintGeo = function (geo, hex, mul) {
  _color.set(hex);
  const arr = geo.attributes.color.array;
  for (let i = 0; i < arr.length; i += 3) {
    arr[i] = _color.r * (mul || 1); arr[i + 1] = _color.g * (mul || 1); arr[i + 2] = _color.b * (mul || 1);
  }
  geo.attributes.color.needsUpdate = true;
};

/* ---------- shared materials (few = fast) ---------- */
RT.MAT = {};
RT.initMaterials = function () {
  RT.MAT.std = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.04 });
  RT.MAT.metal = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.55 });
  RT.MAT.gun = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.35 });
  RT.MAT.emissive = new THREE.MeshBasicMaterial({ vertexColors: true });
  RT.MAT.cloth = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1.0, metalness: 0.0 });
  RT.MAT.skin = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.0 });
  RT.MAT.glass = new THREE.MeshStandardMaterial({ color: 0x8ec4d8, transparent: true, opacity: 0.28, roughness: 0.1, metalness: 0.4, side: THREE.DoubleSide });
};
function meshOf(geos, mat, shadow) {
  const m = new THREE.Mesh(Array.isArray(geos) ? mergeGeos(geos) : geos, mat || RT.MAT.std);
  if (shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
  return m;
}
RT.meshOf = meshOf;

/* ---------- canvas texture helper ---------- */
RT.canvasTex = function (size, draw) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  draw(cv.getContext('2d'), size);
  const tx = new THREE.CanvasTexture(cv);
  tx.encoding = THREE.sRGBEncoding;
  return tx;
};

/* ---------- DOM shorthand ---------- */
const $ = id => document.getElementById(id);
function el(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
RT.$ = $; RT.el = el;

const fmtTime = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
RT.fmtTime = fmtTime;
