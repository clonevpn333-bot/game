// @ts-nocheck
// HAUNTED SHIFT · clay kit: stop-motion clay materials (thumbprint normal map, soft sheen), and a posable stylized
// character (big head, 3D eyes with lids, brows, nose, mouth that opens, hair styles, outfits, zombie variant,
// "zombie makeup" that can wash off). Everything is a pure function of the pose you pass each frame.
import { THREE, RoundedBoxGeometry, canvasTex, rng, clamp, lerp } from "./base.js";

// ------------------------------------------------------------------ clay surface
// a tileable height field of thumb-presses + tool drags, converted to a normal map once
function clayNormalTex(seed = 7, size = 512) {
  const r = rng(seed);
  const hc = document.createElement("canvas");
  hc.width = hc.height = size;
  const h = hc.getContext("2d");
  h.fillStyle = "#808080";
  h.fillRect(0, 0, size, size);
  for (let i = 0; i < 520; i++) {
    const x = r() * size, y = r() * size, rad = 6 + r() * 26, a = r() * 6.28, dark = r() < 0.5;
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      const g = h.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      const v = dark ? "0,0,0" : "255,255,255";
      g.addColorStop(0, `rgba(${v},${0.06 + r() * 0.07})`);
      g.addColorStop(1, `rgba(${v},0)`);
      h.fillStyle = g;
      h.beginPath();
      h.ellipse(x + ox, y + oy, rad, rad * (0.5 + r() * 0.5), a, 0, 6.283);
      h.fill();
    }
  }
  const src = h.getImageData(0, 0, size, size).data;
  const out = h.createImageData(size, size);
  const at = (x, y) => src[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * 3.2, dy = (at(x, y + 1) - at(x, y - 1)) * 3.2;
    const nz = 1 / Math.sqrt(dx * dx + dy * dy + 1), i = (y * size + x) * 4;
    out.data[i] = (-dx * nz * 0.5 + 0.5) * 255;
    out.data[i + 1] = (dy * nz * 0.5 + 0.5) * 255;
    out.data[i + 2] = nz * 255;
    out.data[i + 3] = 255;
  }
  h.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(hc);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}
let CLAYN = null;
const matCache = new Map();
/** clay(color, {rough, sheen, emissive, rep}) — cached per settings */
export function clay(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (matCache.has(key) && !o.unique) return matCache.get(key);
  if (!CLAYN) CLAYN = clayNormalTex();
  const c = new THREE.Color(color);
  const m = new THREE.MeshStandardMaterial({
    color: c, roughness: Math.max(0.12, (o.rough ?? 0.58) - (o.coat ?? 0.12) * 0.25), metalness: 0, normalMap: o.flat ? null : CLAYN,
    normalScale: new THREE.Vector2(o.ns ?? 0.55, o.ns ?? 0.55),
    emissive: new THREE.Color(o.emissive ?? 0x000000), emissiveIntensity: o.ei ?? 1,
    transparent: !!o.transparent, opacity: o.opacity ?? 1,
  });
  if (o.map) m.map = o.map;
  if (o.emap) m.emissiveMap = o.emap;
  if (!o.unique) matCache.set(key, m);
  return m;
}
export const glossy = (color, o = {}) => clay(color, { rough: 0.18, coat: 0.9, sheen: 0, ns: 0.05, ...o });
export const glow = (color, ei = 2.2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(ei), toneMapped: true });

// ------------------------------------------------------------------ geometry helpers
const GEO = new Map();
const geo = (k, f) => (GEO.has(k) ? GEO.get(k) : (GEO.set(k, f()), GEO.get(k)));
export const sphG = (seg = 40) => geo("s" + seg, () => new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)));
export const capG = (r, len) => geo(`c${r}:${len}`, () => new THREE.CapsuleGeometry(r, len, 10, 24));
export const boxG = (w, h, d, r = 0.05) => geo(`b${w}:${h}:${d}:${r}`, () => new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2.01, h / 2.01, d / 2.01)));
export const cylG = (rt, rb, h, s = 24) => geo(`y${rt}:${rb}:${h}:${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
export function mesh(g, m, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.scale.set(sx, sy, sz);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}
export const ball = (m, x, y, z, rx, ry = rx, rz = rx, seg = 40) => mesh(sphG(seg), m, x, y, z, rx, ry, rz);
/** a capsule between two local points (for static limbs/props) */
export function limb(m, a, b, r) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
  const o = mesh(capG(r, Math.max(0.001, len)), m);
  o.position.copy(A).add(B).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return o;
}
/** pear/torso lathe: profile [[r, y], ...] */
export function lathe(m, prof, seg = 36) {
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  g.computeVertexNormals();
  return mesh(g, m);
}
export function textTex(lines, o = {}) {
  const w = o.w || 512, h = o.h || 256;
  return canvasTex(w, h, (c) => {
    c.fillStyle = o.bg || "rgba(0,0,0,0)";
    c.fillRect(0, 0, w, h);
    c.textAlign = "center";
    c.textBaseline = "middle";
    lines.forEach((L, i) => {
      c.font = `${L.weight || 900} ${L.size || 80}px ${L.font || "Luckiest Guy, Arial Black, sans-serif"}`;
      if (L.stroke) { c.lineWidth = L.stroke; c.strokeStyle = L.sc || "#1a0d10"; c.lineJoin = "round"; c.strokeText(L.t, w / 2, L.y ?? h / 2); }
      c.fillStyle = L.c || "#fff";
      c.fillText(L.t, w / 2, L.y ?? h / 2);
    });
  });
}

// ------------------------------------------------------------------ CHARACTER
const SKIN = { pink: 0xf2b49a, tan: 0xd99a72, brown: 0x9a6244, pale: 0xf6cdb6, zombie: 0x93ad7c, zombie2: 0xa3a98a, makeup: 0x8fbf72 };
export { SKIN };

/**
 * makeChar(o): o = { skin, shirt, pants, shoes, hair, hairColor, h (height scale), girth, zombie, makeup, outfit, seed }
 *  outfit: 'tee' | 'hoodie' | 'jacket' | 'staff' | 'cardigan' | 'pumpkin' | 'soldier' | 'suit' | 'dress'
 *  hair: 'short' | 'spiky' | 'bun' | 'pony' | 'cap' | 'bald' | 'messy' | 'long' | 'helmet' | 'stem'
 */
export function makeChar(o = {}) {
  const r = rng(o.seed || 1);
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  const zombie = !!o.zombie;
  const skinC = o.skin ?? (zombie ? SKIN.zombie : SKIN.pink);
  const skin = clay(skinC);
  const faceM = clay(o.makeup ? SKIN.makeup : skinC, { unique: true });
  const shirt = clay(o.shirt ?? 0x3b5bd6), pants = clay(o.pants ?? 0x2a2f45), shoe = clay(o.shoes ?? 0x241c1c, { rough: 0.4 });
  const hairM = clay(o.hairColor ?? 0x3a2418, { rough: 0.7 });
  const g = o.girth ?? 1;
  // ---- legs
  const leg = (s) => {
    const hip = new THREE.Group(); hip.position.set(s * 0.11 * g, 0.78, 0);
    hip.add(mesh(capG(0.085 * g, 0.24), pants, 0, -0.19, 0));
    const knee = new THREE.Group(); knee.position.y = -0.38; hip.add(knee);
    knee.add(mesh(capG(0.072 * g, 0.24), pants, 0, -0.18, 0));
    const ankle = new THREE.Group(); ankle.position.y = -0.37; knee.add(ankle);
    ankle.add(ball(shoe, 0, -0.005, 0.055, 0.08, 0.06, 0.135));
    body.add(hip);
    return { hip, knee, ankle };
  };
  const LL = leg(1), LR = leg(-1);
  const pelvis = ball(pants, 0, 0.82, 0, 0.2 * g, 0.12, 0.15 * g);
  body.add(pelvis);
  // ---- torso
  const spine = new THREE.Group(); spine.position.y = 0.82; body.add(spine);
  const tor = o.outfit === "pumpkin"
    ? (() => { const p = makePumpkinBody(); p.position.y = 0.2; return p; })()
    : lathe(shirt, [[0.001, 0.0], [0.2 * g, 0.02], [0.215 * g, 0.12], [0.2 * g, 0.28], [0.23 * g, 0.42], [0.17 * g, 0.5], [0.06, 0.53], [0.001, 0.535]]);
  tor.scale.z = 0.72;
  spine.add(tor);
  if (o.outfit === "dress") { const sk = lathe(shirt, [[0.001, -0.02], [0.34, -0.42], [0.36, -0.46], [0.2, -0.45], [0.21 * g, 0.05], [0.001, 0.06]]); sk.scale.z = 0.8; spine.add(sk); }
  if (o.outfit === "hoodie") { const hood = ball(shirt, 0, 0.5, -0.1, 0.2, 0.1, 0.13); spine.add(hood); spine.add(limb(clay(0xeeeeee), [0.05, 0.42, 0.15], [0.06, 0.25, 0.16], 0.008)); spine.add(limb(clay(0xeeeeee), [-0.05, 0.42, 0.15], [-0.06, 0.25, 0.16], 0.008)); }
  if (o.outfit === "jacket" || o.outfit === "cardigan" || o.outfit === "suit") {
    const lap = clay(o.trim ?? 0xf2ead8);
    spine.add(limb(lap, [0.0, 0.03, 0.16], [0.0, 0.47, 0.135], 0.022));
    if (o.outfit === "jacket") { spine.add(ball(clay(o.trim ?? 0xf2ead8), 0, 0.03, 0, 0.215 * g, 0.035, 0.16 * g)); }
    if (o.outfit === "suit") { spine.add(limb(clay(0xb01818), [0, 0.42, 0.155], [0, 0.22, 0.165], 0.02)); }
  }
  if (o.outfit === "staff" || o.outfit === "tee") {
    const txt = o.outfit === "staff" ? "STAFF" : o.print;
    if (txt) {
      const tm = new THREE.MeshBasicMaterial({ map: textTex([{ t: txt, size: 120, c: o.printC || "#f2c230" }], { w: 512, h: 160 }), transparent: true, toneMapped: false });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.094), tm);
      pl.position.set(0, 0.3, 0.158); pl.rotation.x = -0.12; spine.add(pl);
    }
  }
  if (o.outfit === "soldier") { spine.add(mesh(boxG(0.4 * g, 0.26, 0.3, 0.06), clay(0x4c5a34), 0, 0.3, 0)); spine.add(limb(clay(0x2c2a24), [-0.2, 0.46, 0.12], [0.2, 0.08, 0.13], 0.02)); }
  if (zombie) { // torn hem + stains
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28 + r(); spine.add(ball(clay(o.shirt ?? 0x3b5bd6), Math.sin(a) * 0.19 * g, 0.0, Math.cos(a) * 0.14, 0.05, 0.07 + r() * 0.05, 0.03)); }
    for (let i = 0; i < 3; i++) spine.add(ball(clay(0x6a1f1f, { rough: 0.3, coat: 0.6 }), (r() - 0.5) * 0.25, 0.1 + r() * 0.3, 0.155, 0.04 + r() * 0.03, 0.03 + r() * 0.03, 0.01));
  }
  // ---- arms
  const arm = (s) => {
    const sh = new THREE.Group(); sh.position.set(s * 0.25 * g, 0.44, 0); spine.add(sh);
    sh.add(ball(shirt, 0, 0, 0, 0.085 * g));
    const sleeve = o.outfit === "tee" || o.outfit === "staff" || o.outfit === "dress" ? 0.13 : 0.3;
    sh.add(mesh(capG(0.066 * g, 0.22), sleeve > 0.2 ? shirt : skin, 0, -0.15, 0));
    if (sleeve < 0.2) sh.add(mesh(capG(0.072 * g, 0.06), shirt, 0, -0.05, 0));
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
    el.add(mesh(capG(0.058 * g, 0.2), sleeve > 0.2 ? shirt : skin, 0, -0.13, 0));
    if (sleeve > 0.2 && o.outfit !== "pumpkin") el.add(ball(clay(o.trim ?? (o.outfit === "jacket" ? 0xf2ead8 : o.shirt ?? 0x3b5bd6)), 0, -0.25, 0, 0.062 * g, 0.03, 0.062 * g));
    const wr = new THREE.Group(); wr.position.y = -0.27; el.add(wr);
    const hand = new THREE.Group(); wr.add(hand);
    hand.add(ball(skin, 0, -0.045, 0.0, 0.058, 0.07, 0.04));
    hand.add(ball(skin, s * -0.045, -0.02, 0.02, 0.022, 0.035, 0.022)); // thumb
    if (zombie) for (let k = 0; k < 3; k++) hand.add(limb(skin, [(k - 1) * 0.022, -0.09, 0], [(k - 1) * 0.026, -0.15, 0.02], 0.014));
    return { sh, el, wr, hand };
  };
  const AL = arm(1), AR = arm(-1);
  // ---- head
  const neck = new THREE.Group(); neck.position.y = 0.52; spine.add(neck);
  neck.add(mesh(capG(0.06, 0.08), o.outfit === "pumpkin" ? clay(0x4f8a3a) : skin, 0, 0.04, 0));
  const head = new THREE.Group(); head.position.y = 0.1; neck.add(head);
  const R = 0.23, HZ = 0.95;
  const skull = ball(faceM, 0, 0.2, 0, R, R * 1.02, R * HZ, 48);
  head.add(skull);
  head.add(ball(faceM, 0, 0.11, 0.02, R * 0.8, R * 0.52, R * 0.74, 40)); // jaw/cheeks mass
  if (!zombie) for (const s of [-1, 1]) head.add(ball(clay(o.blush ?? 0xf08a80, { unique: true, transparent: true, opacity: 0.55 }), s * 0.13, 0.14, 0.175, 0.04, 0.025, 0.02));
  for (const s of [-1, 1]) head.add(ball(faceM, s * R * 0.98, 0.18, 0.0, 0.045, 0.06, 0.035));   // ears
  const nose = ball(faceM, 0, 0.17, R * HZ * 0.98, o.noseW ?? 0.038, o.noseH ?? 0.042, 0.045);
  head.add(nose);
  // eyes
  const eyeW = clay(zombie ? 0xe8e0a8 : 0xfbfbf6, { rough: 0.2, coat: 0.8, sheen: 0, ns: 0.02 });
  const pupM = clay(zombie ? 0x6e1a10 : o.eyeC ?? 0x1a1210, { rough: 0.15, coat: 1, sheen: 0, ns: 0 });
  const eyes = [-1, 1].map((s) => {
    const er = o.eyeR ?? 0.058;
    const g = new THREE.Group(); g.position.set(s * 0.088, 0.235, R * HZ * 0.74); head.add(g);
    const look = new THREE.Group(); g.add(look);
    look.add(ball(eyeW, 0, 0, 0, er, er * 1.08, er));
    const pr = zombie ? er * 0.3 : er * 0.52;
    look.add(ball(pupM, 0, 0, er * 0.78, pr, pr, pr * 0.5));
    look.add(ball(glow(0xffffff, 1.4), er * 0.22, er * 0.25, er * 0.98, pr * 0.22, pr * 0.22, pr * 0.1, 12));
    const lidG = geo("lid", () => new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2));
    const lid = mesh(lidG, faceM, 0, 0, 0, er * 1.13, er * 1.2, er * 1.13); g.add(lid);
    const low = mesh(lidG, faceM, 0, 0, 0, er * 1.1, er * 1.15, er * 1.1); low.rotation.x = Math.PI; g.add(low);
    if (zombie || o.makeup) { const ring = mesh(geo("ring", () => new THREE.TorusGeometry(1, 0.28, 10, 28)), clay(zombie ? 0x4a3a5a : 0x3a2a4a, { unique: !!o.makeup, transparent: !!o.makeup }), 0, -0.005, 0.0, er * 1.18, er * 1.25, er * 0.9); g.add(ring); g.userData.ring = ring; }
    return { g, look, lid, low };
  });
  const brows = [-1, 1].map((s) => {
    const b = new THREE.Group(); b.position.set(s * 0.09, 0.32, R * HZ * 0.9); head.add(b);
    { const bm = mesh(capG(o.browT ?? 0.019, 0.075), hairM, 0, 0, 0); bm.rotation.z = Math.PI / 2; b.add(bm); }
    b.userData.s = s;
    return b;
  });
  // mouth: a dark cavity that opens, teeth, tongue; plus a closed "line" arc for smiles/frowns
  const mouth = new THREE.Group(); mouth.position.set(0, 0.09, 0.2); head.add(mouth);
  const cav = ball(clay(0x3a0c14, { rough: 0.4, ns: 0.1 }), 0, 0, 0, 0.07, 0.04, 0.03); mouth.add(cav);
  const teeth = mesh(boxG(0.09, 0.022, 0.02, 0.008), clay(zombie ? 0xd8cc8c : 0xfffcf2, { rough: 0.3, ns: 0.05 }), 0, 0.02, 0.012); mouth.add(teeth);
  const lowT = mesh(boxG(0.08, 0.016, 0.02, 0.007), clay(zombie ? 0xd8cc8c : 0xfffcf2, { rough: 0.3, ns: 0.05 }), 0, -0.02, 0.01); mouth.add(lowT);
  const tongue = ball(clay(0xd0505a, { rough: 0.35 }), 0, -0.02, 0.0, 0.045, 0.018, 0.025); mouth.add(tongue);
  const arcG = geo("arc", () => new THREE.TorusGeometry(0.065, 0.011, 8, 24, Math.PI * 0.7));
  const line = mesh(arcG, clay(0x5a1a20, { rough: 0.4 }), 0, 0, 0.01); mouth.add(line);
  // hair
  const hair = new THREE.Group(); head.add(hair);
  buildHair(hair, o.hair || "short", hairM, R, HZ, r, o);
  if (o.glasses) { const gm = clay(0x2a2a30, { rough: 0.3 }); for (const s of [-1, 1]) { const t = mesh(geo("gl", () => new THREE.TorusGeometry(0.055, 0.008, 8, 24)), gm, s * 0.09, 0.235, R * HZ * 0.98); head.add(t); } head.add(limb(gm, [-0.035, 0.24, R * HZ], [0.035, 0.24, R * HZ], 0.007)); }
  // props held in the right hand (phone, flashlight, candy bucket)
  const held = new THREE.Group(); AR.hand.add(held); held.position.set(0, -0.09, 0.03);
  const heldL = new THREE.Group(); AL.hand.add(heldL); heldL.position.set(0, -0.09, 0.03);
  // makeup drips (shown while it washes off)
  const drips = [];
  if (o.makeup) for (let i = 0; i < 6; i++) { const d = ball(clay(SKIN.makeup, { coat: 0.8, rough: 0.2 }), (r() - 0.5) * 0.26, 0.12 + r() * 0.14, R * HZ * 0.8, 0.018, 0.03, 0.015); d.visible = false; head.add(d); drips.push({ d, x: d.position.x, y: d.position.y, sp: 0.6 + r() }); }
  root.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  if (o.h) root.scale.setScalar(o.h);
  const C = { root, body, spine, neck, head, LL, LR, AL, AR, eyes, brows, mouth, cav, teeth, lowT, tongue, line, nose, faceM, held, heldL, drips, zombie, o, skinC };
  C.pose = (p) => poseChar(C, p);
  return C;
}

function buildHair(hair, style, m, R, HZ, r, o) {
  const cap = (sx = 1.06, sy = 1.08, th = 0.5, tilt = -0.25) => { const c = mesh(geo("cap" + th, () => new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI * th)), m, 0, 0.2, 0, R * sx, R * sy, R * HZ * sx); c.rotation.x = tilt; hair.add(c); return c; };
  if (style === "bald") return;
  if (style === "short" || style === "messy" || style === "spiky") {
    cap();
    const n = style === "spiky" ? 9 : 7;
    for (let i = 0; i < n; i++) {
      const a = -1.1 + (i / (n - 1)) * 2.2;
      if (style === "spiky") { const sp = mesh(geo("cone", () => new THREE.ConeGeometry(0.05, 0.14, 12)), m, Math.sin(a) * 0.13, 0.43 + Math.cos(a) * 0.02, -0.02 + Math.cos(a) * 0.05); sp.rotation.set(-0.5 + r() * 0.3, 0, -a * 0.6); hair.add(sp); }
      else hair.add(ball(m, Math.sin(a) * 0.15, 0.39 + r() * 0.03, 0.12 + Math.cos(a) * 0.02, 0.07, 0.05 + (style === "messy" ? r() * 0.04 : 0), 0.06));
    }
  }
  if (style === "bun" || style === "pony" || style === "long") {
    cap(1.07, 1.1, 0.55, -0.15);
    hair.add(ball(m, 0.07, 0.4, 0.15, 0.13, 0.05, 0.08)); // swept fringe
    if (style === "bun") hair.add(ball(m, 0, 0.47, -0.12, 0.1));
    if (style === "pony") { hair.add(ball(m, 0, 0.32, -0.24, 0.06)); const p = limb(m, [0, 0.3, -0.27], [0, 0.04, -0.33], 0.065); hair.add(p); }
    if (style === "long") { const b = mesh(boxG(0.44, 0.42, 0.14, 0.07), m, 0, 0.08, -0.13); hair.add(b); }
  }
  if (style === "cap") { // backwards baseball cap
    const cm = clay(o.capC ?? 0xd23a2a);
    const c = mesh(geo("bcap", () => new THREE.SphereGeometry(1, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.5)), cm, 0, 0.22, 0, R * 1.08, R * 1.1, R * HZ * 1.08); c.rotation.x = -0.12; hair.add(c);
    const brim = mesh(boxG(0.22, 0.02, 0.16, 0.01), cm, 0, 0.27, -0.27); brim.rotation.x = -0.2; hair.add(brim);
    hair.add(ball(cm, 0, 0.47, 0.0, 0.02));
  }
  if (style === "helmet") { const c = mesh(geo("helm", () => new THREE.SphereGeometry(1, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.55)), clay(0x4c5a34), 0, 0.24, 0, R * 1.18, R * 1.12, R * 1.15); hair.add(c); }
  if (style === "stem") { hair.add(mesh(cylG(0.03, 0.04, 0.1), clay(0x4f7a2a), 0, 0.46, 0)); const lf = ball(clay(0x5aa03a), 0.07, 0.47, 0, 0.06, 0.015, 0.035); lf.rotation.z = -0.4; hair.add(lf); cap(1.04, 1.06, 0.45, -0.2).material = clay(0xe57a1e); }
}

export function makePumpkinBody() {
  const g = new THREE.Group(), m = clay(0xe8761c);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.add(ball(m, Math.sin(a) * 0.1, 0.12, Math.cos(a) * 0.1, 0.17, 0.24, 0.17)); }
  return g;
}

// ------------------------------------------------------------------ POSE
const D = { walk: null, run: 0, amp: 1, lean: 0, twist: 0, bob: 0, armL: null, armR: null, elL: 0.15, elR: 0.15, legL: 0, legR: 0, kneeL: 0, kneeR: 0,
  headYaw: 0, headPitch: 0, headTilt: 0, lookX: 0, lookY: 0, blink: 0, lids: 0, brow: 0, browL: null, browR: null, browAng: 0, open: 0, smile: 0.4, wide: 0, zarms: 0, sq: 0, yaw: 0, crouch: 0, makeup: 1, wash: 0, T: 0 };
/**
 * poseChar(C, p): p.walk = phase (rad) or null; p.zarms 0..1 zombie arms; p.armL/armR = [fwd, out, twist]; p.open 0..1 mouth;
 * p.smile -1..1; p.brow -1 (angry) .. +1 (raised/worried); p.blink 0..1; p.lids -1 (wide) .. 1 (droopy); look/head angles.
 */
function poseChar(C, P) {
  const p = { ...D, ...P };
  const zb = C.zombie;
  // ---- walk cycle
  let legL = p.legL, legR = p.legR, kneeL = p.kneeL, kneeR = p.kneeR, bob = p.bob, swing = 0, roll = 0;
  if (p.walk != null) {
    const w = p.walk, a = p.amp * (p.run ? 0.85 : 0.5), lim = zb ? 0.55 : 1;
    legL += Math.sin(w) * a; legR += -Math.sin(w) * a * lim;
    kneeL += Math.max(0, -Math.cos(w)) * (p.run ? 1.4 : 0.8) * p.amp; kneeR += Math.max(0, Math.cos(w)) * (p.run ? 1.4 : 0.8) * p.amp * lim;
    bob += Math.abs(Math.cos(w)) * (p.run ? 0.07 : 0.035) * p.amp - 0.02;
    swing = Math.sin(w) * (p.run ? 0.9 : 0.45) * p.amp;
    roll = Math.sin(w) * (zb ? 0.09 : 0.035);
  }
  C.LL.hip.rotation.set(-legL, 0, 0); C.LR.hip.rotation.set(-legR, 0, 0);
  C.LL.knee.rotation.x = kneeL + p.crouch * 1.2; C.LR.knee.rotation.x = kneeR + p.crouch * 1.2;
  C.LL.hip.rotation.x -= p.crouch * 0.7; C.LR.hip.rotation.x -= p.crouch * 0.7;
  C.LL.ankle.rotation.x = -(kneeL - legL) * 0.4; C.LR.ankle.rotation.x = -(kneeR - legR) * 0.4;
  C.body.position.y = bob - p.crouch * 0.16;
  C.body.rotation.y = p.yaw;
  C.spine.rotation.set(p.lean + (p.run ? 0.2 : 0) + p.crouch * 0.3, p.twist + swing * 0.15, roll);
  C.spine.scale.set(1 + p.sq * 0.08, 1 - p.sq * 0.1, 1 + p.sq * 0.08);
  // ---- arms
  const zf = p.zarms;
  const armSet = (A, s, v, el, sw) => {
    const [f, out, tw] = v || [0, 0.12, 0];
    const F = lerp(f + sw, 1.45 + 0.08 * Math.sin(p.T * 3 + s), zf), O = lerp(out, 0.1, zf);
    A.sh.rotation.set(-F, tw, s * O);
    A.el.rotation.x = -lerp(el + (p.run ? 0.9 : 0), 0.15, zf);
    A.wr.rotation.x = zf * 0.4;
  };
  armSet(C.AL, 1, p.armL, p.elL, -swing);
  armSet(C.AR, -1, p.armR, p.elR, swing);
  // ---- head
  C.neck.rotation.set(p.headPitch * 0.4, p.headYaw * 0.4, p.headTilt * 0.4);
  C.head.rotation.set(p.headPitch * 0.6, p.headYaw * 0.6, p.headTilt * 0.6 + (zb ? 0.18 * Math.sin(p.T * 1.3) : 0));
  // eyes
  for (const E of C.eyes) {
    E.look.rotation.set(-p.lookY * 0.5, p.lookX * 0.6, 0);
    const base = lerp(-1.05, 0.3, (p.lids + 1) / 2) - p.wide * 0.3 + (zb ? 0.4 : 0);
    E.lid.rotation.x = lerp(base, Math.PI / 2 + 0.05, clamp(p.blink));
    E.low.rotation.x = Math.PI + 0.55 - clamp(p.smile) * 0.35 * (1 - p.wide);
    const sc = 1 + p.wide * 0.18; E.g.scale.setScalar(sc);
    if (E.g.userData.ring) { E.g.userData.ring.material.opacity = zb ? 1 : clamp(p.makeup); E.g.userData.ring.visible = zb || p.makeup > 0.02; }
  }
  // brows: brow +1 raised & tilted worried, -1 angry
  for (const B of C.brows) {
    const s = B.userData.s, v = s > 0 ? (p.browL ?? p.brow) : (p.browR ?? p.brow);
    B.position.y = 0.32 + v * 0.03 + p.wide * 0.02;
    B.rotation.z = s * (v * 0.32 + p.browAng);
  }
  // mouth
  const op = clamp(p.open);
  C.cav.visible = op > 0.06; C.teeth.visible = op > 0.06; C.lowT.visible = op > 0.25; C.tongue.visible = op > 0.2;
  C.cav.scale.set(0.07 * (1 - op * 0.15 + Math.max(0, p.smile) * 0.25), 0.012 + op * 0.06, 0.03);
  C.teeth.position.y = 0.012 + op * 0.03; C.lowT.position.y = -0.012 - op * 0.04; C.tongue.position.y = -0.015 - op * 0.035;
  C.line.visible = op <= 0.06;
  const sm = p.smile;
  C.line.rotation.set(0, 0, sm >= 0 ? Math.PI + Math.PI * 0.15 : Math.PI * 0.15);
  C.line.position.y = sm >= 0 ? 0.045 : -0.035;
  C.line.scale.set(1, Math.max(0.15, Math.abs(sm)) * 0.9, 1);
  // makeup wash-off: face colour lerps green → skin, drips slide
  if (C.o.makeup) {
    C.faceM.color.set(SKIN.makeup).lerp(new THREE.Color(SKIN.pink), clamp(1 - p.makeup));
    for (const d of C.drips) { const k = p.wash; d.d.visible = k > 0.02 && k < 1; d.d.position.y = d.y - k * d.sp * 0.1; }
  }
}

// ------------------------------------------------------------------ preset helpers
export const walkPhase = (t, speed = 7, off = 0) => t * speed + off;
