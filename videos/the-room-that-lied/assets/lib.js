// Shared toolkit for the Pip-style shorts: seekable math, renderer, toon ink, canvas textures,
// DOM anchoring, sprites, and the blob-character rig with a 2D face painted on a 3D body.
import * as THREE from "three";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";

export { THREE, RoundedBoxGeometry };
export const W = 1080;
export const H = 1920;

// ------------------------------------------------------------------ math
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const eio = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const eo = (k) => 1 - Math.pow(1 - k, 3);
export const eo5 = (k) => 1 - Math.pow(1 - k, 5);
export const ei = (k) => k * k * k;
export const ei5 = (k) => k * k * k * k * k;
export const back = (k) => {
  const c1 = 2.0;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};
export const bounce = (k) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (k < 1 / d1) return n1 * k * k;
  if (k < 2 / d1) return n1 * (k -= 1.5 / d1) * k + 0.75;
  if (k < 2.5 / d1) return n1 * (k -= 2.25 / d1) * k + 0.9375;
  return n1 * (k -= 2.625 / d1) * k + 0.984375;
};
export const jiggle = (t, a, amp = 1, freq = 18, decay = 6) =>
  t < a ? 0 : amp * Math.sin((t - a) * freq) * Math.exp(-(t - a) * decay);
export function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const vlerp = (a, b, k) => V3(lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(a.z, b.z, k));
// piecewise keyframes: keys = [[t, value], ...] (numbers or Vector3), eased per segment
export function keys(t, ks, ease = eio) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 0; i < ks.length - 1; i++) {
    const [t0, a] = ks[i];
    const [t1, b] = ks[i + 1];
    if (t <= t1) {
      const k = ease(seg(t, t0, t1));
      return typeof a === "number" ? lerp(a, b, k) : vlerp(a, b, k);
    }
  }
  return ks[ks.length - 1][1];
}

// ------------------------------------------------------------------ renderer
export function makeRenderer(canvas, { exposure = 1.0, shadows = true } = {}) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(W, H, false);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = exposure;
  r.shadowMap.enabled = shadows;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.setClearColor(0x000000, 0);
  const pmrem = new THREE.PMREMGenerator(r);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  return { renderer: r, env };
}

export const INK = 0x1b1033;
export const INK_CSS = "#1b1033";
const inkCache = {};
export function inkMat(th = 0.03, color = INK) {
  const key = th + ":" + color;
  if (inkCache[key]) return inkCache[key];
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace("#include <begin_vertex>", `vec3 transformed = position + normal * ${th.toFixed(4)};`);
  };
  m.customProgramCacheKey = () => "ink" + th;
  inkCache[key] = m;
  return m;
}
export function withInk(mesh, th = 0.03) {
  mesh.add(new THREE.Mesh(mesh.geometry, inkMat(th)));
  return mesh;
}

export function canvasTex(w, h, draw, { repeat = false, srgb = true } = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.userData = { canvas: c, ctx };
  return tex;
}

export function makeStage(env, { key = 2.4, keyColor = 0xfff0dc, keyPos = [3, 7, 5], rim = 1.6, rimColor = 0xbfe4ff, hemi = 0.7, hemiSky = 0xfff3e0, hemiGround = 0x3a2a4a, envI = 0.55, shadow = true, shadowSize = 6 } = {}) {
  const scene = new THREE.Scene();
  scene.environment = env;
  scene.environmentIntensity = envI;
  const h = new THREE.HemisphereLight(hemiSky, hemiGround, hemi);
  scene.add(h);
  const k = new THREE.DirectionalLight(keyColor, key);
  k.position.set(...keyPos);
  if (shadow) {
    k.castShadow = true;
    k.shadow.mapSize.set(2048, 2048);
    const s = k.shadow.camera;
    s.left = -shadowSize;
    s.right = shadowSize;
    s.top = shadowSize;
    s.bottom = -shadowSize;
    s.near = 0.5;
    s.far = 40;
    k.shadow.bias = -0.0004;
    k.shadow.normalBias = 0.02;
    k.shadow.radius = 5;
  }
  scene.add(k, k.target);
  const r = new THREE.DirectionalLight(rimColor, rim);
  r.position.set(-5, 4, -5);
  scene.add(r);
  return { scene, key: k, rim: r, hemi: h };
}
export function makeCamera(fov = 34) {
  return new THREE.PerspectiveCamera(fov, W / H, 0.05, 400);
}
export function aim(cam, pos, look, fov, roll = 0) {
  cam.position.copy(pos);
  cam.up.set(Math.sin(roll), Math.cos(roll), 0);
  cam.lookAt(look);
  if (fov && cam.fov !== fov) {
    cam.fov = fov;
    cam.updateProjectionMatrix();
  }
  cam.updateMatrixWorld();
}

// ------------------------------------------------------------------ DOM anchors
const _pv = new THREE.Vector3();
export function anchorTo(id, world, cam, dx = 0, dy = 0) {
  const el = document.getElementById(id);
  if (!el) return;
  _pv.copy(world).project(cam);
  el.style.left = ((_pv.x * 0.5 + 0.5) * W + dx).toFixed(1) + "px";
  el.style.top = ((-_pv.y * 0.5 + 0.5) * H + dy).toFixed(1) + "px";
}
export function worldOf(obj, local = V3()) {
  obj.updateWorldMatrix(true, false);
  return obj.localToWorld(local.clone());
}

// ------------------------------------------------------------------ sprites
export const smokeTex = canvasTex(256, 256, (c, w) => {
  const r = rng(21);
  for (let i = 0; i < 26; i++) {
    const x = w / 2 + (r() - 0.5) * w * 0.36;
    const y = w / 2 + (r() - 0.5) * w * 0.36;
    const rad = w * (0.14 + r() * 0.2);
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, "rgba(255,255,255,0.22)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, w);
  }
});
export const glowTex = canvasTex(128, 128, (c, w) => {
  const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, w, w);
});
export const starTex = canvasTex(256, 256, (c, w) => {
  const m = w / 2;
  c.translate(m, m);
  c.fillStyle = "#ffffff";
  c.strokeStyle = INK_CSS;
  c.lineWidth = 10;
  c.lineJoin = "round";
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 ? 26 : 110;
    c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  c.closePath();
  c.stroke();
  c.fill();
});
export function makeSmoke(n, color, seed, opacity = 0.4, additive = false, map = smokeTex) {
  const r = rng(seed);
  const list = [];
  for (let i = 0; i < n; i++) {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({ map, color, transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }),
    );
    sp.userData = { r1: r(), r2: r(), r3: r(), r4: r(), base: opacity };
    sp.material.rotation = r() * 6.28;
    list.push(sp);
  }
  return list;
}
export function makeStars(n, seed) {
  const r = rng(seed);
  const list = [];
  for (let i = 0; i < n; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false }));
    sp.userData = { r1: r(), r2: r(), r3: r() };
    sp.renderOrder = 6;
    list.push(sp);
  }
  return list;
}

// ------------------------------------------------------------------ the blob character
function deformBlob(x, y, z) {
  const sxz = 1 + 0.12 * Math.max(0, -y) - 0.07 * Math.max(0, y);
  x *= sxz;
  z *= sxz * 0.94;
  if (y < -0.72) y = -0.72 + (y + 0.72) * 0.3;
  return [x, y * 1.05, z];
}
export function deformGeo(geo) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = deformBlob(p.getX(i), p.getY(i), p.getZ(i));
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}
export const BLOB_BASE = 0.844;

export const FACE_DEFAULT = {
  eyes: "open", // open | happy | closed | squeeze | x | narrow
  wink: false,
  blink: 0,
  wide: 0,
  lookX: 0,
  lookY: 0,
  well: 0,
  tears: 0,
  brows: true,
  browUp: 0,
  sad: 0,
  angry: 0,
  mouth: "smile", // smile | grin | open | wobble | o | flat | smirk | scream | frown
  mouthOpen: 0.5,
  blush: 0.8,
  sweat: 0,
  mustache: false,
  lashes: false,
  lip: null,
  time: 0,
};

export function drawBlobFace(c, f) {
  c.clearRect(0, 0, 1024, 1024);
  c.lineCap = "round";
  c.lineJoin = "round";
  for (const sx of [-1, 1]) {
    const x = 512 + sx * 250;
    const y = 590;
    const g = c.createRadialGradient(x, y, 0, x, y, 85);
    g.addColorStop(0, `rgba(255,105,140,${0.6 * f.blush})`);
    g.addColorStop(1, "rgba(255,105,140,0)");
    c.fillStyle = g;
    c.fillRect(x - 90, y - 90, 180, 180);
  }
  for (const sx of [-1, 1]) {
    const ex = 512 + sx * 172;
    const ey = 440;
    let mode = f.eyes;
    if (f.wink && sx > 0) mode = "happy";
    c.strokeStyle = INK_CSS;
    if (mode === "happy" || mode === "closed") {
      c.lineWidth = 20;
      c.beginPath();
      if (mode === "happy") c.arc(ex, ey + 30, 60, Math.PI * 1.15, Math.PI * 1.85);
      else c.arc(ex, ey - 40, 62, Math.PI * 0.18, Math.PI * 0.82);
      c.stroke();
      continue;
    }
    if (mode === "squeeze") {
      c.lineWidth = 20;
      c.beginPath();
      c.moveTo(ex - sx * 52, ey - 44);
      c.lineTo(ex + sx * 42, ey);
      c.lineTo(ex - sx * 52, ey + 44);
      c.stroke();
      continue;
    }
    if (mode === "x") {
      c.lineWidth = 22;
      c.beginPath();
      c.moveTo(ex - 50, ey - 50);
      c.lineTo(ex + 50, ey + 50);
      c.moveTo(ex + 50, ey - 50);
      c.lineTo(ex - 50, ey + 50);
      c.stroke();
      continue;
    }
    const rx = 80 * (1 + f.wide * 0.12);
    const ry = 102 * (1 + f.wide * 0.12) * (1 - f.blink * 0.93);
    c.save();
    c.beginPath();
    c.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = "#ffffff";
    c.fill();
    c.clip();
    const px = ex + f.lookX * 26;
    const py = ey + f.lookY * 30 + 8;
    const pr = 1 - f.wide * 0.35;
    c.fillStyle = INK_CSS;
    c.beginPath();
    c.ellipse(px, py, 52 * pr, 64 * pr, 0, 0, Math.PI * 2);
    c.fill();
    if (f.well > 0) {
      const top = ey + ry - ry * 2 * 0.55 * f.well;
      c.fillStyle = `rgba(110,205,255,${0.78 * Math.min(1, f.well * 1.4)})`;
      c.beginPath();
      c.moveTo(ex - rx, top);
      for (let x = -rx; x <= rx; x += 8) c.lineTo(ex + x, top + Math.sin(x * 0.07 + f.time * 9) * 6);
      c.lineTo(ex + rx, ey + ry + 10);
      c.lineTo(ex - rx, ey + ry + 10);
      c.closePath();
      c.fill();
    }
    const hl = 1 + f.well * 0.6;
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.ellipse(px - 17 * pr, py - 25 * pr, 17 * hl * pr, 21 * hl * pr, -0.3, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(px + 20 * pr, py + 22 * pr, 8 * hl * pr, 0, Math.PI * 2);
    c.fill();
    if (mode === "narrow") {
      // heavy upper lid: suspicious / determined
      c.fillStyle = f.lidColor || "#2a2350";
      c.fillRect(ex - rx - 5, ey - ry - 5, rx * 2 + 10, ry * 0.95);
    }
    c.restore();
    c.strokeStyle = INK_CSS;
    c.lineWidth = 15;
    c.beginPath();
    c.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
    c.stroke();
    if (mode === "narrow") {
      c.lineWidth = 16;
      c.beginPath();
      c.moveTo(ex - rx, ey - ry * 0.05);
      c.lineTo(ex + rx, ey - ry * 0.05);
      c.stroke();
    }
    if (f.lashes) {
      c.lineWidth = 12;
      for (let k = -1; k <= 1; k++) {
        const a = -Math.PI / 2 + sx * 0.5 + k * 0.3;
        c.beginPath();
        c.moveTo(ex + Math.cos(a) * rx, ey + Math.sin(a) * ry);
        c.lineTo(ex + Math.cos(a) * (rx + 34), ey + Math.sin(a) * (ry + 30));
        c.stroke();
      }
    }
  }
  if (f.brows) {
    c.strokeStyle = INK_CSS;
    c.lineWidth = 17;
    for (const sx of [-1, 1]) {
      const bx = 512 + sx * 172;
      const by = 300 - f.browUp * 26;
      c.beginPath();
      c.moveTo(bx - sx * 52, by - f.sad * 26 + f.angry * 26);
      c.lineTo(bx + sx * 50, by + f.sad * 12 - f.angry * 10);
      c.stroke();
    }
  }
  const mx = 512;
  const my = 655;
  c.strokeStyle = INK_CSS;
  c.fillStyle = INK_CSS;
  c.lineWidth = 16;
  const tongue = (cx, cy, rx, ry) => {
    c.save();
    c.clip();
    c.fillStyle = "#ff6f8f";
    c.beginPath();
    c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  };
  if (f.mustache) {
    c.fillStyle = INK_CSS;
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.moveTo(mx, my - 40);
      c.quadraticCurveTo(mx + sx * 70, my - 85, mx + sx * 150, my - 30);
      c.quadraticCurveTo(mx + sx * 90, my - 30, mx, my - 10);
      c.fill();
    }
  }
  if (f.mouth === "smile") {
    c.strokeStyle = f.lip || INK_CSS;
    c.beginPath();
    c.arc(mx, my - 55, 85, Math.PI * 0.2, Math.PI * 0.8);
    c.stroke();
  } else if (f.mouth === "smirk") {
    c.beginPath();
    c.moveTo(mx - 70, my + 10);
    c.quadraticCurveTo(mx + 10, my + 40, mx + 80, my - 15);
    c.stroke();
  } else if (f.mouth === "flat") {
    c.beginPath();
    c.moveTo(mx - 55, my + 15);
    c.lineTo(mx + 55, my + 15);
    c.stroke();
  } else if (f.mouth === "frown") {
    c.beginPath();
    c.arc(mx, my + 85, 70, Math.PI * 1.22, Math.PI * 1.78);
    c.stroke();
  } else if (f.mouth === "grin") {
    c.beginPath();
    c.moveTo(mx - 100, my - 25);
    c.quadraticCurveTo(mx, my + 125, mx + 100, my - 25);
    c.closePath();
    c.fill();
    tongue(mx, my + 62, 46, 30);
    c.beginPath();
    c.moveTo(mx - 100, my - 25);
    c.quadraticCurveTo(mx, my + 125, mx + 100, my - 25);
    c.closePath();
    c.stroke();
  } else if (f.mouth === "open" || f.mouth === "scream") {
    const o = f.mouthOpen;
    const rx = f.mouth === "scream" ? 44 + 22 * o : 48 + 30 * o;
    const ry = f.mouth === "scream" ? 50 + 110 * o : 30 + 58 * o;
    const cy = my + 10 + (f.mouth === "scream" ? 40 * o : 0);
    c.beginPath();
    c.ellipse(mx, cy, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
    tongue(mx, cy + ry * 0.7, rx * 0.75, 24);
    c.beginPath();
    c.ellipse(mx, cy, rx, ry, 0, 0, Math.PI * 2);
    c.stroke();
  } else if (f.mouth === "wobble") {
    c.lineWidth = 15;
    c.beginPath();
    for (let x = -80; x <= 80; x += 6) {
      const y = my + 18 + Math.sin(x * 0.11 + f.time * 22) * 6 + Math.pow(x / 80, 2) * 26;
      x === -80 ? c.moveTo(mx + x, y) : c.lineTo(mx + x, y);
    }
    c.stroke();
  } else if (f.mouth === "o") {
    c.beginPath();
    c.ellipse(mx, my + 8, 30, 36, 0, 0, Math.PI * 2);
    c.fill();
  }
  if (f.sweat > 0) {
    const x = 800;
    const y = 300 + f.sweat * 40;
    c.fillStyle = "#7fd3ff";
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(x, y - 60);
    c.quadraticCurveTo(x + 36, y, x, y + 20);
    c.quadraticCurveTo(x - 36, y, x, y - 60);
    c.fill();
    c.stroke();
  }
  if (f.tears > 0) {
    for (const sx of [-1, 1]) {
      const x0 = 512 + sx * 205;
      const y0 = 500;
      const len = 520 * f.tears;
      const wv = (y) => Math.sin(y * 0.035 - f.time * 14) * 7;
      c.beginPath();
      c.moveTo(x0 - 18 + wv(y0), y0);
      for (let y = y0; y <= y0 + len; y += 10) c.lineTo(x0 - 18 - (y - y0) * 0.02 + wv(y), y);
      for (let y = y0 + len; y >= y0; y -= 10) c.lineTo(x0 + 18 + (y - y0) * 0.02 + wv(y), y);
      c.closePath();
      c.fillStyle = "rgba(125,214,255,0.95)";
      c.fill();
      c.strokeStyle = INK_CSS;
      c.lineWidth = 7;
      c.stroke();
    }
  }
}

// opts: color, footColor, sprout (bool), arms (bool)
export function makeBlob({ color = 0x34cfa9, footColor = null, sprout = false, sheen = 0xd0fff2, rough = 0.42, faceRes = 1024 } = {}) {
  const root = new THREE.Group();
  const squash = new THREE.Group();
  root.add(squash);
  const bodyGeo = deformGeo(new THREE.SphereGeometry(1, 80, 60));
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: rough,
    clearcoat: 0.55,
    clearcoatRoughness: 0.3,
    sheen: 0.7,
    sheenColor: new THREE.Color(sheen),
    sheenRoughness: 0.45,
  });
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = BLOB_BASE;
  body.castShadow = true;
  squash.add(body);
  withInk(body, 0.032);
  const fgeo = deformGeo(new THREE.SphereGeometry(1, 64, 48, Math.PI / 2 - 1.15, 2.3, 0.4, 1.85));
  const uv = fgeo.attributes.uv;
  const fp = fgeo.attributes.position;
  for (let i = 0; i < fp.count; i++) uv.setXY(i, 0.5 + fp.getX(i) / 1.7, 0.5 + (fp.getY(i) - 0.12) / 1.7);
  const fc = document.createElement("canvas");
  fc.width = fc.height = 1024;
  const fctx = fc.getContext("2d");
  const ftex = new THREE.CanvasTexture(fc);
  ftex.colorSpace = THREE.SRGBColorSpace;
  ftex.anisotropy = 8;
  const face = new THREE.Mesh(
    fgeo,
    new THREE.MeshStandardMaterial({
      map: ftex,
      transparent: true,
      roughness: 0.3,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      depthWrite: false,
      emissive: 0xffffff,
      emissiveMap: ftex,
      emissiveIntensity: 0.22,
    }),
  );
  face.scale.setScalar(1.003);
  face.renderOrder = 2;
  body.add(face);
  const arms = {};
  for (const side of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(side * 0.86, 0.98, 0.05);
    const cap = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.36, 8, 18), mat);
    cap.position.y = -0.3;
    cap.castShadow = true;
    withInk(cap, 0.028);
    piv.add(cap);
    squash.add(piv);
    arms[side] = piv;
  }
  const fmat = new THREE.MeshPhysicalMaterial({ color: footColor ?? new THREE.Color(color).multiplyScalar(0.72), roughness: 0.5, clearcoat: 0.4 });
  const feet = [];
  for (const side of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), fmat);
    f.scale.set(0.3, 0.15, 0.38);
    f.position.set(side * 0.38, 0.1, 0.22);
    f.castShadow = true;
    withInk(f, 0.06);
    root.add(f);
    feet.push(f);
  }
  let sproutG = null;
  if (sprout) {
    sproutG = new THREE.Group();
    sproutG.position.y = BLOB_BASE + 1.0;
    const leafMat = new THREE.MeshPhysicalMaterial({ color: 0x79db4a, roughness: 0.45, side: THREE.DoubleSide });
    const stem = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0.02, 0.18, 0), V3(0.09, 0.36, 0)]), 16, 0.035, 10), leafMat);
    withInk(stem, 0.02);
    sproutG.add(stem);
    squash.add(sproutG);
  }
  const b = { root, squash, body, face, fctx, ftex, arms, feet, mat, sprout: sproutG, base: {} };
  b.eyeWorld = (side) => worldOf(body, V3(side * 0.31, 0.32, 0.86));
  b.handWorld = (side) => worldOf(arms[side], V3(0, -0.56, 0));
  b.headWorld = (y = 1.25) => worldOf(body, V3(0, y, 0));
  b.setFace = (over) => {
    drawBlobFace(fctx, { ...FACE_DEFAULT, ...b.base, ...over });
    ftex.needsUpdate = true;
  };
  b.pose = ({ sq = 0, lean = 0, armL = 0.35, armR = 0.35, armLx = 0, armRx = 0, hop = 0, stretchL = 1, stretchR = 1, t = 0, stretch = 1, turn = 0 }) => {
    squash.scale.set((1 - sq * 0.5) / Math.sqrt(stretch), (1 + sq) * stretch, (1 - sq * 0.5) / Math.sqrt(stretch));
    squash.position.y = hop;
    squash.rotation.z = lean;
    squash.rotation.y = turn;
    arms[-1].rotation.set(armLx, 0, -armL);
    arms[1].rotation.set(armRx, 0, armR);
    arms[-1].scale.set(1, stretchL, 1);
    arms[1].scale.set(1, stretchR, 1);
    if (sproutG) sproutG.rotation.z = Math.sin(t * 3.1) * 0.06;
  };
  b.reach = (side, target) => {
    const piv = arms[side];
    squash.updateWorldMatrix(true, false);
    const local = squash.worldToLocal(target.clone());
    const d = local.sub(piv.position);
    piv.rotation.set(0, 0, Math.atan2(d.x, -d.y));
    piv.scale.set(1, clamp(d.length() / 0.56, 0.7, 2.8), 1);
  };
  return b;
}

// small mini 2D face sprites
export function miniFaceTex(kind) {
  return canvasTex(256, 256, (c) => {
    c.lineCap = "round";
    c.lineJoin = "round";
    c.strokeStyle = INK_CSS;
    const eye = (x, y, look = [0, 0], angry = 0, open = true) => {
      if (!open) {
        c.lineWidth = 9;
        c.beginPath();
        c.arc(x, y - 6, 16, Math.PI * 0.15, Math.PI * 0.85);
        c.stroke();
        return;
      }
      c.fillStyle = "#fff";
      c.beginPath();
      c.ellipse(x, y, 22, 27, 0, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 7;
      c.stroke();
      c.fillStyle = INK_CSS;
      c.beginPath();
      c.ellipse(x + look[0] * 8, y + look[1] * 8 + 3, 12, 15, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#fff";
      c.beginPath();
      c.arc(x + look[0] * 8 - 4, y + look[1] * 8 - 3, 4.5, 0, Math.PI * 2);
      c.fill();
      if (angry) {
        c.lineWidth = 9;
        c.beginPath();
        const s = x < 128 ? 1 : -1;
        c.moveTo(x - s * 24, y - 40);
        c.lineTo(x + s * 18, y - 26);
        c.stroke();
      }
    };
    if (kind === "worried") {
      eye(96, 112, [0, -0.3]);
      eye(160, 112, [0, -0.3]);
      c.lineWidth = 9;
      c.beginPath();
      c.arc(128, 175, 22, Math.PI * 1.2, Math.PI * 1.8);
      c.stroke();
    } else if (kind === "happy") {
      eye(96, 112);
      eye(160, 112);
      c.lineWidth = 9;
      c.beginPath();
      c.arc(128, 145, 28, Math.PI * 0.12, Math.PI * 0.88);
      c.stroke();
    } else if (kind === "panic") {
      eye(92, 104, [0, -0.2]);
      eye(164, 104, [0, -0.2]);
      c.fillStyle = INK_CSS;
      c.beginPath();
      c.ellipse(128, 168, 26, 30, 0, 0, Math.PI * 2);
      c.fill();
    }
  });
}
export function faceSprite(tex, size = 0.5) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(size, size, 1);
  s.renderOrder = 5;
  return s;
}
const _fd = new THREE.Vector3();
export function faceToward(sprite, center, cam, offset) {
  _fd.copy(cam.position).sub(center).normalize();
  sprite.position.copy(center).addScaledVector(_fd, offset);
}

// ------------------------------------------------------------------ seek driver
// shots: [[start, end, {scene, cam, update, pre?}], ...]; `pre(renderer)` may render offscreen passes
export function runShots(renderer, shots, total) {
  let lastT = -1;
  function renderAt(t) {
    t = Math.max(0, Math.min(total, Number(t) || 0));
    if (t === lastT) return;
    lastT = t;
    const shot = shots.find(([a, b]) => t >= a && t < b) || shots[shots.length - 1];
    const s = shot[2];
    s.update(t, renderer);
    s.scene.updateMatrixWorld();
    if (s.render) s.render(renderer, t);
    else renderer.render(s.scene, s.cam);
  }
  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  for (const [a, , s] of shots) {
    s.update(a + 0.01, renderer);
    renderer.compile(s.scene, s.cam);
  }
  renderAt(window.__hfThreeTime || 0);
  window.__renderAt = renderAt;
}
