// "Why do onions make you cry?" — all 3D for the short, rendered from HyperFrames time.
// Every shot is a pure function of the global time `t`, so any frame can be seeked directly.
import * as THREE from "three";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";

const W = 1080;
const H = 1920;
const TOTAL = window.TIMING.total;

// ------------------------------------------------------------------ math helpers
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eio = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const eo = (k) => 1 - Math.pow(1 - k, 3);
const eo5 = (k) => 1 - Math.pow(1 - k, 5);
const ei = (k) => k * k * k;
const back = (k) => {
  const c1 = 2.0;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};
const elastic = (k) =>
  k <= 0 ? 0 : k >= 1 ? 1 : Math.pow(2, -9 * k) * Math.sin(((k * 10 - 0.75) * 2 * Math.PI) / 3) + 1;
const bounce = (k) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (k < 1 / d1) return n1 * k * k;
  if (k < 2 / d1) return n1 * (k -= 1.5 / d1) * k + 0.75;
  if (k < 2.5 / d1) return n1 * (k -= 2.25 / d1) * k + 0.9375;
  return n1 * (k -= 2.625 / d1) * k + 0.984375;
};
// damped wobble that starts at `a`
const jiggle = (t, a, amp = 1, freq = 18, decay = 6) =>
  t < a ? 0 : amp * Math.sin((t - a) * freq) * Math.exp(-(t - a) * decay);
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------ renderer
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);
const pmrem = new THREE.PMREMGenerator(renderer);
const ENV = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const INK = 0x1b1033;
const INK_CSS = "#1b1033";

function inkMat(th = 0.03) {
  const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace(
      "#include <begin_vertex>",
      `vec3 transformed = position + normal * ${th.toFixed(4)};`,
    );
  };
  m.customProgramCacheKey = () => "ink" + th;
  return m;
}
function withInk(mesh, th = 0.03) {
  const o = new THREE.Mesh(mesh.geometry, inkMat(th));
  mesh.add(o);
  return mesh;
}

function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (opts.repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  }
  tex.userData = { canvas: c, ctx };
  return tex;
}

function makeStage({ key = 2.4, keyPos = [3, 7, 5], rim = 1.6, hemi = 0.7, env = 0.55, shadow = true, shadowSize = 6 } = {}) {
  const scene = new THREE.Scene();
  scene.environment = ENV;
  scene.environmentIntensity = env;
  const h = new THREE.HemisphereLight(0xfff3e0, 0x3a2a4a, hemi);
  scene.add(h);
  const k = new THREE.DirectionalLight(0xfff0dc, key);
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
    s.far = 30;
    k.shadow.bias = -0.0004;
    k.shadow.normalBias = 0.02;
    k.shadow.radius = 5;
  }
  scene.add(k, k.target);
  const r = new THREE.DirectionalLight(0xbfe4ff, rim);
  r.position.set(-5, 4, -5);
  scene.add(r);
  return { scene, key: k, rim: r, hemi: h };
}

function makeCamera(fov = 34) {
  return new THREE.PerspectiveCamera(fov, W / H, 0.05, 200);
}
function aim(cam, pos, look, fov) {
  cam.position.copy(pos);
  cam.lookAt(look);
  if (fov && cam.fov !== fov) {
    cam.fov = fov;
    cam.updateProjectionMatrix();
  }
  cam.updateMatrixWorld();
}
const vlerp = (a, b, k) => V3(lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(a.z, b.z, k));

// ------------------------------------------------------------------ DOM anchors (3D → 2D overlay)
const _pv = new THREE.Vector3();
function anchorTo(id, world, cam, dx = 0, dy = 0) {
  const el = document.getElementById(id);
  if (!el) return;
  _pv.copy(world).project(cam);
  el.style.left = ((_pv.x * 0.5 + 0.5) * W + dx).toFixed(1) + "px";
  el.style.top = ((-_pv.y * 0.5 + 0.5) * H + dy).toFixed(1) + "px";
}
function worldOf(obj, local = V3()) {
  obj.updateWorldMatrix(true, false);
  return obj.localToWorld(local.clone());
}

// ------------------------------------------------------------------ shared textures
const woodTex = canvasTex(1024, 1024, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#e7b273");
  g.addColorStop(1, "#cf9050");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  const r = rng(11);
  for (let i = 0; i < 90; i++) {
    const y0 = r() * h;
    c.strokeStyle = `rgba(${110 + r() * 30},${55 + r() * 20},20,${0.07 + r() * 0.14})`;
    c.lineWidth = 1 + r() * 4;
    c.beginPath();
    for (let x = 0; x <= w; x += 12) {
      const y = y0 + Math.sin(x * 0.005 + i) * 10 + Math.sin(x * 0.021 + i * 3) * 2.5;
      x ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
  }
  for (let i = 0; i < 3; i++) {
    const x = r() * w;
    const y = r() * h;
    c.strokeStyle = "rgba(110,55,20,0.25)";
    for (let k = 1; k < 6; k++) {
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(x, y, k * 9, k * 4, 0, 0, Math.PI * 2);
      c.stroke();
    }
  }
});

const onionSkinTex = canvasTex(1024, 1024, (c, w, h) => {
  const g = c.createLinearGradient(0, h, 0, 0);
  g.addColorStop(0.0, "#e2c09a");
  g.addColorStop(0.06, "#b04c7f");
  g.addColorStop(0.3, "#7c1d59");
  g.addColorStop(0.62, "#8d2866");
  g.addColorStop(0.86, "#b8668c");
  g.addColorStop(0.95, "#d2ab82");
  g.addColorStop(1.0, "#b38a5c");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  const r = rng(5);
  for (let i = 0; i < 70; i++) {
    const x0 = (i / 70) * w + r() * 8;
    const light = r() > 0.45;
    c.strokeStyle = light ? `rgba(255,190,225,${0.12 + r() * 0.2})` : `rgba(60,0,35,${0.1 + r() * 0.15})`;
    c.lineWidth = 1 + r() * 4;
    c.beginPath();
    for (let y = 0; y <= h; y += 16) {
      const x = x0 + Math.sin(y * 0.01 + i) * 4;
      y ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
  }
});

// soft round sprite (smoke / glow)
const smokeTex = canvasTex(256, 256, (c, w) => {
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
const glowTex = canvasTex(128, 128, (c, w) => {
  const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, w, w);
});
// 4-point cartoon sparkle star (2D sprite inside 3D)
const starTex = canvasTex(256, 256, (c, w) => {
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

// mini 2D faces for molecules / enzymes / brain
function faceTex(kind) {
  return canvasTex(256, 256, (c) => {
    c.lineCap = "round";
    c.lineJoin = "round";
    c.strokeStyle = INK_CSS;
    c.fillStyle = INK_CSS;
    const eye = (x, y, open = true, look = [0, 0], angry = 0) => {
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
    if (kind === "grin") {
      eye(96, 110, true, [0.3, 0.2], 1);
      eye(160, 110, true, [0.3, 0.2], 1);
      c.lineWidth = 9;
      c.fillStyle = INK_CSS;
      c.beginPath();
      c.moveTo(88, 152);
      c.quadraticCurveTo(128, 205, 170, 148);
      c.closePath();
      c.fill();
      c.stroke();
    } else if (kind === "eager") {
      eye(96, 112, true, [-0.8, 0]);
      eye(160, 112, true, [-0.8, 0]);
      c.lineWidth = 9;
      c.beginPath();
      c.arc(128, 150, 26, Math.PI * 0.15, Math.PI * 0.85);
      c.stroke();
    } else if (kind === "sleepy") {
      eye(96, 116, false);
      eye(160, 116, false);
      c.lineWidth = 8;
      c.beginPath();
      c.ellipse(128, 160, 10, 13, 0, 0, Math.PI * 2);
      c.stroke();
    } else if (kind === "panic") {
      eye(92, 104, true, [0, -0.2]);
      eye(164, 104, true, [0, -0.2]);
      c.lineWidth = 9;
      c.fillStyle = INK_CSS;
      c.beginPath();
      c.ellipse(128, 168, 26, 30, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#7fd3ff";
      c.strokeStyle = INK_CSS;
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(206, 70);
      c.quadraticCurveTo(224, 100, 206, 110);
      c.quadraticCurveTo(188, 100, 206, 70);
      c.fill();
      c.stroke();
    } else if (kind === "happy") {
      eye(96, 112, true, [0, 0]);
      eye(160, 112, true, [0, 0]);
      c.lineWidth = 9;
      c.beginPath();
      c.arc(128, 145, 28, Math.PI * 0.12, Math.PI * 0.88);
      c.stroke();
    }
  });
}
const FACES = {
  grin: faceTex("grin"),
  eager: faceTex("eager"),
  sleepy: faceTex("sleepy"),
  panic: faceTex("panic"),
  happy: faceTex("happy"),
};
function faceSprite(kind, size = 0.5) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: FACES[kind], transparent: true, depthWrite: false }));
  s.scale.set(size, size, 1);
  s.renderOrder = 5;
  return s;
}
// put a face sprite on the camera-facing side of a blob
const _fd = new THREE.Vector3();
function faceToward(sprite, center, cam, offset) {
  _fd.copy(cam.position).sub(center).normalize();
  sprite.position.copy(center).addScaledVector(_fd, offset);
}

// ------------------------------------------------------------------ Pip (mascot)
function deformPip(x, y, z) {
  const sxz = 1 + 0.12 * Math.max(0, -y) - 0.07 * Math.max(0, y);
  x *= sxz;
  z *= sxz * 0.94;
  if (y < -0.72) y = -0.72 + (y + 0.72) * 0.3;
  return [x, y * 1.05, z];
}
function deformGeo(geo) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = deformPip(p.getX(i), p.getY(i), p.getZ(i));
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}
const PIP_BASE = 0.844;

function drawPipFace(c, f) {
  c.clearRect(0, 0, 1024, 1024);
  c.lineCap = "round";
  c.lineJoin = "round";
  // blush
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
    const pr = 1 - f.wide * 0.25;
    c.fillStyle = INK_CSS;
    c.beginPath();
    c.ellipse(px, py, 52 * pr, 64 * pr, 0, 0, Math.PI * 2);
    c.fill();
    if (f.well > 0) {
      // welling tears fill the bottom of the eye
      const top = ey + ry - ry * 2 * 0.55 * f.well;
      c.fillStyle = `rgba(110,205,255,${0.78 * Math.min(1, f.well * 1.4)})`;
      c.beginPath();
      c.moveTo(ex - rx, top);
      for (let x = -rx; x <= rx; x += 8) c.lineTo(ex + x, top + Math.sin(x * 0.07 + f.time * 9) * 6);
      c.lineTo(ex + rx, ey + ry + 10);
      c.lineTo(ex - rx, ey + ry + 10);
      c.closePath();
      c.fill();
      c.strokeStyle = "rgba(255,255,255,0.85)";
      c.lineWidth = 6;
      c.beginPath();
      for (let x = -rx * 0.7; x <= rx * 0.7; x += 8) c.lineTo(ex + x, top + 10 + Math.sin(x * 0.07 + f.time * 9) * 6);
      c.stroke();
    }
    const hl = 1 + f.well * 0.6;
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.ellipse(px - 17, py - 25, 17 * hl, 21 * hl, -0.3, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(px + 20, py + 22, 8 * hl, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.strokeStyle = INK_CSS;
    c.lineWidth = 15;
    c.beginPath();
    c.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
    c.stroke();
  }
  // brows
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
  // mouth
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
  if (f.mouth === "smile") {
    c.beginPath();
    c.arc(mx, my - 55, 85, Math.PI * 0.2, Math.PI * 0.8);
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
  } else if (f.mouth === "open") {
    const o = f.mouthOpen;
    c.beginPath();
    c.ellipse(mx, my + 10, 48 + 30 * o, 30 + 58 * o, 0, 0, Math.PI * 2);
    c.fill();
    tongue(mx, my + 10 + 40 * o, 36 + 18 * o, 24);
    c.beginPath();
    c.ellipse(mx, my + 10, 48 + 30 * o, 30 + 58 * o, 0, 0, Math.PI * 2);
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
  // tear streams (2D, painted on the 3D body)
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
      c.strokeStyle = "rgba(255,255,255,0.9)";
      c.lineWidth = 6;
      c.beginPath();
      for (let y = y0 + 20; y <= y0 + len - 20; y += 10) c.lineTo(x0 - 5 + wv(y), y);
      c.stroke();
    }
  }
}
const FACE_DEFAULT = {
  eyes: "open",
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
  mouth: "smile",
  mouthOpen: 0.5,
  blush: 0.8,
  time: 0,
};

function makePip() {
  const root = new THREE.Group();
  const squash = new THREE.Group();
  root.add(squash);
  const bodyGeo = deformGeo(new THREE.SphereGeometry(1, 80, 60));
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x34cfa9,
    roughness: 0.42,
    clearcoat: 0.55,
    clearcoatRoughness: 0.3,
    sheen: 0.7,
    sheenColor: new THREE.Color(0xd0fff2),
    sheenRoughness: 0.45,
  });
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = PIP_BASE;
  body.castShadow = true;
  squash.add(body);
  withInk(body, 0.032);
  // face decal shell: front patch of the same shape, planar-projected UVs
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
  // arms (rubber-hose capsules)
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
  // feet
  const footMat = new THREE.MeshPhysicalMaterial({ color: 0x23a98a, roughness: 0.5, clearcoat: 0.4 });
  for (const side of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), footMat);
    f.scale.set(0.3, 0.15, 0.38);
    f.position.set(side * 0.38, 0.1, 0.22);
    f.castShadow = true;
    withInk(f, 0.06);
    root.add(f);
  }
  // sprout on top
  const sprout = new THREE.Group();
  sprout.position.y = PIP_BASE + 1.0;
  const stemCurve = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0.02, 0.18, 0), V3(0.09, 0.36, 0)]);
  const leafMat = new THREE.MeshPhysicalMaterial({ color: 0x79db4a, roughness: 0.45, side: THREE.DoubleSide, clearcoat: 0.3 });
  const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 16, 0.035, 10), leafMat);
  withInk(stem, 0.02);
  sprout.add(stem);
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.quadraticCurveTo(0.2, 0.14, 0.42, 0);
  leafShape.quadraticCurveTo(0.2, -0.14, 0, 0);
  const leafGeo = new THREE.ExtrudeGeometry(leafShape, { depth: 0.02, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.01, bevelSegments: 2 });
  for (const side of [-1, 1]) {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(0.09, 0.36, 0);
    leaf.rotation.set(0, side > 0 ? 0 : Math.PI, side > 0 ? 0.5 : 0.35);
    withInk(leaf, 0.012);
    sprout.add(leaf);
  }
  squash.add(sprout);

  const pip = { root, squash, body, face, fctx, ftex, arms, sprout, mat };
  pip.eyeWorld = (side) => worldOf(body, V3(side * 0.31, 0.32, 0.86));
  pip.handWorld = (side) => worldOf(arms[side], V3(0, -0.56, 0));
  pip.setFace = (over) => {
    drawPipFace(fctx, { ...FACE_DEFAULT, ...over });
    ftex.needsUpdate = true;
  };
  // pose: squash (+ stretch, - squash), lean, arm angles, hop
  pip.pose = ({ sq = 0, lean = 0, armL = 0.35, armR = 0.35, armLx = 0, armRx = 0, hop = 0, sway = 0, stretchL = 1, stretchR = 1, t = 0 }) => {
    squash.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);
    squash.position.y = hop;
    squash.rotation.z = lean;
    arms[-1].rotation.set(armLx, 0, -armL);
    arms[1].rotation.set(armRx, 0, armR);
    arms[-1].scale.set(1, stretchL, 1);
    arms[1].scale.set(1, stretchR, 1);
    sprout.rotation.z = sway + Math.sin(t * 3.1) * 0.06;
  };
  // point an arm at a world target (stretching like a rubber hose)
  pip.reach = (side, target) => {
    const piv = arms[side];
    squash.updateWorldMatrix(true, false);
    const local = squash.worldToLocal(target.clone());
    const d = local.sub(piv.position);
    const len = d.length();
    piv.rotation.set(0, 0, Math.atan2(d.x, -d.y));
    piv.scale.set(1, clamp(len / 0.56, 0.7, 2.8), 1);
  };
  return pip;
}

// ------------------------------------------------------------------ props
function makeKnife({ len = 2.4, handle = 0.95, shiny = true } = {}) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(len * 0.8, 0);
  s.quadraticCurveTo(len * 0.97, 0.02, len, 0.14);
  s.quadraticCurveTo(len * 0.9, 0.44, len * 0.7, 0.48);
  s.lineTo(0, 0.48);
  s.closePath();
  const bladeGeo = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 24 });
  bladeGeo.translate(0, 0, -0.015);
  const blade = new THREE.Mesh(
    bladeGeo,
    new THREE.MeshPhysicalMaterial({ color: shiny ? 0xf2f6fb : 0x9aa0a8, metalness: shiny ? 0.8 : 0.4, roughness: shiny ? 0.22 : 0.6, clearcoat: shiny ? 0.6 : 0, envMapIntensity: 1.6 }),
  );
  blade.castShadow = true;
  g.add(blade);
  const hGeo = new RoundedBoxGeometry(handle, 0.26, 0.15, 3, 0.07);
  const hMat = new THREE.MeshPhysicalMaterial({ color: 0x3a2350, roughness: 0.4, clearcoat: 0.6 });
  const h = new THREE.Mesh(hGeo, hMat);
  h.position.set(-handle / 2 - 0.02, 0.26, 0);
  h.castShadow = true;
  withInk(h, 0.02);
  for (const x of [-0.25, 0.1]) {
    const rv = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.17, 16), new THREE.MeshStandardMaterial({ color: 0xd8c27a, metalness: 1, roughness: 0.25 }));
    rv.rotation.x = Math.PI / 2;
    rv.position.set(x * handle, 0, 0);
    h.add(rv);
  }
  g.add(h);
  g.userData = { len };
  return g;
}

// onion profile (r, y) from root to tip
function onionProfile() {
  const pts = [];
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const y = -0.95 + s * 2.3;
    const q = Math.min(s / 0.9, 1);
    let r = 1.0 * Math.pow(Math.sin(Math.PI * Math.pow(q, 0.82)), 0.68);
    if (s > 0.86) r = Math.max(r, 0.07 * (1 - (s - 0.86) / 0.14) + 0.012);
    if (s < 0.02) r = Math.max(r * 0.6, 0.0);
    pts.push(new THREE.Vector2(Math.max(r, i === 0 ? 0 : 0.001), y));
  }
  pts[N].x = 0;
  return pts;
}
const ONION_PTS = onionProfile();
const ringsTex = canvasTex(1024, 1024, (c, w, h) => {
  const toPx = (x, y) => [((x + 1.15) / 2.3) * w, (1 - (y + 1.0) / 2.4) * h];
  const cy = -0.15;
  const path = (f) => {
    c.beginPath();
    const P = ONION_PTS;
    for (let i = 0; i < P.length; i++) {
      const [px, py] = toPx(P[i].x * f, cy + (P[i].y - cy) * f);
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    for (let i = P.length - 1; i >= 0; i--) {
      const [px, py] = toPx(-P[i].x * f, cy + (P[i].y - cy) * f);
      c.lineTo(px, py);
    }
    c.closePath();
  };
  c.fillStyle = "#7d1f5b";
  c.fillRect(0, 0, w, h);
  const N = 12;
  for (let k = 0; k < N; k++) {
    const f = 0.985 - k * (0.92 / N);
    path(f);
    c.fillStyle = k === 0 ? "#c45a96" : k % 2 ? "#fbeef6" : "#f1d6e8";
    c.fill();
    c.strokeStyle = k === 0 ? "#6a174d" : "rgba(176,70,140,0.55)";
    c.lineWidth = k === 0 ? 6 : 4;
    c.stroke();
  }
  // wet sheen
  const g = c.createRadialGradient(w * 0.42, h * 0.45, 10, w * 0.42, h * 0.45, w * 0.35);
  g.addColorStop(0, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
});
function capGeometry() {
  const s = new THREE.Shape();
  const P = ONION_PTS;
  s.moveTo(P[0].x, P[0].y);
  for (let i = 1; i < P.length; i++) s.lineTo(P[i].x, P[i].y);
  for (let i = P.length - 1; i >= 0; i--) s.lineTo(-P[i].x, P[i].y);
  const g = new THREE.ShapeGeometry(s, 4);
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + 1.15) / 2.3, (p.getY(i) + 1.0) / 2.4);
  return g;
}
function makeOnion() {
  const skinMat = new THREE.MeshPhysicalMaterial({
    map: onionSkinTex,
    roughness: 0.36,
    clearcoat: 0.8,
    clearcoatRoughness: 0.25,
    sheen: 0.5,
    sheenColor: new THREE.Color(0xffc8e8),
  });
  const capMat = new THREE.MeshPhysicalMaterial({ map: ringsTex, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide });
  const root = new THREE.Group();
  const halfGeo = (phi0) => new THREE.LatheGeometry(ONION_PTS, 48, phi0, Math.PI);
  // back half (z <= 0), cap faces +z
  const back = new THREE.Group();
  const bm = new THREE.Mesh(halfGeo(Math.PI / 2), skinMat);
  bm.castShadow = true;
  withInk(bm, 0.025);
  const bc = new THREE.Mesh(capGeometry(), capMat);
  bc.position.z = 0.002;
  back.add(bm, bc);
  // front half (z >= 0), cap faces -z, on a pivot at its bottom-front edge
  const frontPivot = new THREE.Group();
  frontPivot.position.set(0, -0.9, 0.55);
  const front = new THREE.Group();
  front.position.set(0, 0.9, -0.55);
  const fm = new THREE.Mesh(halfGeo(-Math.PI / 2), skinMat);
  fm.castShadow = true;
  withInk(fm, 0.025);
  const fcap = new THREE.Mesh(capGeometry(), capMat);
  fcap.rotation.y = Math.PI;
  fcap.position.z = -0.002;
  front.add(fm, fcap);
  frontPivot.add(front);
  // dry tip + root hairs
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.35, 12), new THREE.MeshStandardMaterial({ color: 0xc2955f, roughness: 0.8 }));
  tip.position.y = 1.47;
  back.add(tip);
  const hairMat = new THREE.MeshStandardMaterial({ color: 0xd8bc90, roughness: 0.9 });
  const r = rng(9);
  for (let i = 0; i < 14; i++) {
    const hgeo = new THREE.CylinderGeometry(0.008, 0.012, 0.16 + r() * 0.12, 5);
    const hm = new THREE.Mesh(hgeo, hairMat);
    const a = r() * Math.PI - (r() > 0.5 ? 0 : Math.PI);
    hm.position.set(Math.cos(a) * 0.08, -0.98, Math.sin(a) * 0.06 - 0.02);
    hm.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    back.add(hm);
  }
  root.add(back, frontPivot);
  return { root, back, frontPivot, front, skinMat, capMat };
}

function makeMolecule(seed = 0) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 28, 20),
    new THREE.MeshPhysicalMaterial({ color: 0x9cf25a, emissive: 0x47b81e, emissiveIntensity: 0.55, roughness: 0.25, clearcoat: 1 }),
  );
  withInk(core, 0.014);
  g.add(core);
  const r = rng(seed + 3);
  const atoms = [
    [0xfff07a, 0.1],
    [0xff7a7a, 0.1],
    [0xffffff, 0.07],
  ];
  atoms.forEach(([col, rad], i) => {
    const a = new THREE.Mesh(new THREE.SphereGeometry(rad, 20, 14), new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.3, clearcoat: 1, emissive: col, emissiveIntensity: 0.12 }));
    const th = (i / 3) * Math.PI * 2 + r();
    a.position.set(Math.cos(th) * 0.2, Math.sin(th) * 0.2, (r() - 0.5) * 0.1);
    withInk(a, 0.012);
    g.add(a);
  });
  return g;
}

function makeSmoke(n, color, seed, opacity = 0.4, additive = false) {
  const r = rng(seed);
  const list = [];
  for (let i = 0; i < n; i++) {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: smokeTex,
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      }),
    );
    sp.userData = { r1: r(), r2: r(), r3: r(), r4: r(), base: opacity };
    sp.material.rotation = r() * 6.28;
    list.push(sp);
  }
  return list;
}
function makeStars(n, seed) {
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

// cells (instanced rounded boxes with nuclei + ink outlines)
const CELL_GEO = new RoundedBoxGeometry(1.5, 0.42, 0.56, 3, 0.13);
const NUC_GEO = new THREE.SphereGeometry(0.11, 20, 14);
function makeCells(list, seed = 1, opts = {}) {
  const n = list.length;
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: opts.opacity ?? 0.78,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    sheen: 0.6,
    sheenColor: new THREE.Color(0xffffff),
    emissive: 0x4a0d3c,
    emissiveIntensity: 0.2,
  });
  const cells = new THREE.InstancedMesh(CELL_GEO, mat, n);
  const ink = new THREE.InstancedMesh(CELL_GEO, inkMat(0.022), n);
  const nuc = new THREE.InstancedMesh(NUC_GEO, new THREE.MeshPhysicalMaterial({ color: 0x9b2d7f, roughness: 0.3, clearcoat: 1, emissive: 0x5c0f48, emissiveIntensity: 0.4 }), n);
  const r = rng(seed);
  const col = new THREE.Color();
  const info = list.map((p) => {
    col.setHSL(0.9 + (r() - 0.5) * 0.05, 0.78, 0.6 + r() * 0.08);
    return { ...p, color: col.clone(), nx: (r() - 0.5) * 0.7, nz: (r() - 0.5) * 0.15, ph: r() * 6.28 };
  });
  info.forEach((c, i) => cells.setColorAt(i, c.color));
  cells.instanceColor.needsUpdate = true;
  const g = new THREE.Group();
  g.add(nuc, cells, ink);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const sv = new THREE.Vector3();
  const pv = new THREE.Vector3();
  // set(i, x,y,z, scale, rotX, tintColor?)
  const api = {
    group: g,
    info,
    cells,
    set(i, x, y, z, s = 1, sy = s, rx = 0) {
      e.set(rx, 0, 0);
      q.setFromEuler(e);
      sv.set(s, sy, s);
      pv.set(x, y, z);
      m4.compose(pv, q, sv);
      cells.setMatrixAt(i, m4);
      ink.setMatrixAt(i, m4);
      const c = info[i];
      const ns = s > 0.01 ? 1 : 0;
      pv.set(x + c.nx * s, y + (rx ? -c.nz : 0), z + (rx ? 0 : c.nz));
      sv.setScalar(s * ns);
      m4.compose(pv, q, sv);
      nuc.setMatrixAt(i, m4);
    },
    tint(i, color) {
      cells.setColorAt(i, color);
    },
    commit() {
      cells.instanceMatrix.needsUpdate = true;
      ink.instanceMatrix.needsUpdate = true;
      nuc.instanceMatrix.needsUpdate = true;
      if (cells.instanceColor) cells.instanceColor.needsUpdate = true;
    },
  };
  return api;
}
function brickGrid(rows, cols, sx = 1.58, sz = 0.62) {
  const out = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = cols[0]; c <= cols[1]; c++) {
      out.push({ row, col: c, x: c * sx + (row % 2 ? sx / 2 : 0), z: row * sz });
    }
  }
  return out;
}
function range(a, b) {
  const o = [];
  for (let i = a; i <= b; i++) o.push(i);
  return o;
}

// ================================================================== SHOT: kitchen (SH1, SH2, SH9, SH10, SH12)
const K = (() => {
  const st = makeStage({ key: 2.6, keyPos: [3.5, 8, 6], shadowSize: 5 });
  const { scene } = st;
  const cam = makeCamera(34);
  // counter + board
  const counter = new THREE.Mesh(new RoundedBoxGeometry(16, 0.6, 7, 3, 0.2), new THREE.MeshPhysicalMaterial({ color: 0xc8684a, roughness: 0.35, clearcoat: 0.6 }));
  counter.position.set(0, -0.58, -0.6);
  counter.receiveShadow = true;
  scene.add(counter);
  const board = new THREE.Mesh(new RoundedBoxGeometry(6.4, 0.28, 3.6, 4, 0.12), new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: 0.55, clearcoat: 0.25 }));
  board.position.set(0.1, -0.14, 0.25);
  board.receiveShadow = true;
  board.castShadow = true;
  withInk(board, 0.02);
  scene.add(board);

  const pip = makePip();
  scene.add(pip.root);
  const onion = makeOnion();
  scene.add(onion.root);
  const fresh = makeOnion(); // the whole onion used for the tips + outro
  scene.add(fresh.root);
  const knife = makeKnife();
  scene.add(knife);

  const wisps = makeSmoke(14, 0x9cf25a, 33, 0.32);
  wisps.forEach((w) => scene.add(w));
  // tear drops
  const dropN = 160;
  const drops = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 16, 12),
    new THREE.MeshPhysicalMaterial({ color: 0x7fd6ff, roughness: 0.05, clearcoat: 1, transmission: 0, transparent: true, opacity: 0.92, emissive: 0x2a8fd0, emissiveIntensity: 0.3 }),
    dropN,
  );
  scene.add(drops);
  const dropR = rng(77);
  const dropInfo = Array.from({ length: dropN }, (_, i) => ({ side: i % 2 ? 1 : -1, a: dropR(), b: dropR(), c: dropR() }));
  const puddle = new THREE.Mesh(
    new THREE.CircleGeometry(1, 64),
    new THREE.MeshPhysicalMaterial({ color: 0x6fcaff, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.85, emissive: 0x1f6fb0, emissiveIntensity: 0.25 }),
  );
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.set(-0.2, 0.012, 1.1);
  scene.add(puddle);
  // ice cubes
  const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xe6fbff, roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.8, emissive: 0x9fe3ff, emissiveIntensity: 0.75 });
  const ice = Array.from({ length: 7 }, (_, i) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.42, 0.42, 3, 0.07), iceMat);
    m.castShadow = true;
    scene.add(m);
    return m;
  });
  const icePos = [
    [0.05, 0.75],
    [1.5, 0.5],
    [0.45, 1.2],
    [1.25, 1.1],
    [1.7, -0.25],
    [-0.05, -0.35],
    [0.85, 1.45],
  ];
  const stars = makeStars(18, 5);
  stars.forEach((s) => scene.add(s));

  function placePip(x, z, ry, s = 0.82) {
    pip.root.position.set(x, 0, z);
    pip.root.rotation.y = ry;
    pip.root.scale.setScalar(s);
  }
  function hideAll() {
    knife.visible = false;
    onion.root.visible = false;
    fresh.root.visible = false;
    drops.visible = false;
    puddle.visible = false;
    ice.forEach((m) => (m.visible = false));
    stars.forEach((s) => (s.visible = false));
    wisps.forEach((w) => (w.visible = false));
  }
  function wispsFrom(t, t0, origin, drift, opacity = 0.32, spread = 0.6) {
    wisps.forEach((w, i) => {
      const u = w.userData;
      const life = 2.2;
      const age = (t - t0 - u.r1 * 1.8 + life * 4) % life;
      const alive = t > t0 + u.r1 * 0.6;
      w.visible = alive;
      if (!alive) return;
      const k = age / life;
      w.position.set(
        origin.x + (u.r2 - 0.5) * spread + drift.x * k + Math.sin(t * 1.3 + u.r3 * 6) * 0.15,
        origin.y + k * drift.y,
        origin.z + (u.r4 - 0.5) * spread * 0.6 + drift.z * k,
      );
      const sc = 0.5 + k * 1.3;
      w.scale.set(sc, sc, 1);
      w.material.opacity = opacity * Math.sin(Math.PI * k) * seg(t, t0, t0 + 0.6);
      w.material.rotation = u.r1 * 6 + t * 0.3 * (u.r2 > 0.5 ? 1 : -1);
    });
  }
  function onionAt(o, x, z, s = 0.86) {
    o.root.visible = true;
    o.root.position.set(x, 0.92 * s, z);
    o.root.scale.setScalar(s);
    o.root.rotation.set(0, 0, 0);
    o.frontPivot.rotation.set(0, 0, 0);
    o.frontPivot.position.set(0, -0.9, 0.55);
  }
  // knife held in Pip's right hand; junction (heel of blade) at world position
  function knifeAt(x, y, z, rz = 0, ry = 0, rx = 0) {
    knife.visible = true;
    knife.position.set(x, y, z);
    knife.rotation.set(rx, ry, rz);
  }
  function grip() {
    knife.updateWorldMatrix(true, false);
    return knife.localToWorld(V3(-0.5, 0.26, 0));
  }

  function update(t) {
    hideAll();
    let face = { time: t };
    let pose = { t };
    const camShake = V3();
    if (t < 6.2) {
      // ---------------- SH1 + SH2: the chop and the tears
      placePip(-1.05, 0.55, 0.35, 0.72);
      onionAt(onion, 0.72, -0.15, 0.75);
      knife.scale.setScalar(0.8);
      // chop timeline
      const raise = eio(seg(t, 0.62, 1.1));
      const down = ei(seg(t, 1.12, 1.27));
      const lift = eio(seg(t, 1.75, 2.4));
      let ky = lerp(1.7, 2.75, raise);
      ky = lerp(ky, 0.02, down);
      ky = lerp(ky, 1.25, lift);
      const kx = lerp(-0.3, -0.55, lift);
      const krz = lerp(0, 0.32, raise) * (1 - down) + lerp(0, 0.18, lift);
      knifeAt(kx, ky + jiggle(t, 1.27, 0.05, 40, 10), 0.02, krz);
      // onion reaction + halves
      const imp = jiggle(t, 1.27, 1, 22, 7);
      onion.root.scale.set(0.75 * (1 + imp * 0.06), 0.75 * (1 - imp * 0.08), 0.75 * (1 + imp * 0.06));
      const fall = seg(t, 1.36, 1.95);
      const fallE = fall < 1 ? bounce(fall) : 1;
      onion.frontPivot.rotation.x = (Math.PI / 2) * fallE;
      onion.frontPivot.position.set(0.55 * eo(fall), lerp(-0.9, -0.47, eo(fall)), 0.55 + 0.4 * eo(fall));
      onion.back.rotation.x = -jiggle(t, 1.5, 0.08, 14, 5);
      // gas wisps rising off the cut toward Pip
      wispsFrom(t, 1.6, V3(0.7, 0.8, 0.0), V3(-1.4, 1.5, 0.6), 0.34, 0.5);
      // Pip
      const hop = 0.28 * Math.sin(Math.PI * seg(t, 0.3, 0.62));
      const land = jiggle(t, 0.62, 0.12, 20, 8) + jiggle(t, 1.27, 0.1, 24, 8);
      pose = { t, hop, sq: -land, lean: -0.05 + Math.sin(t * 2) * 0.02, armL: 0.45 + Math.sin(t * 3) * 0.08 };
      pip.pose(pose);
      pip.reach(1, grip());
      const hold = clamp(1 - seg(t, 1.6, 2.0));
      face = {
        time: t,
        lookX: lerp(0.7, 0.2, seg(t, 1.9, 2.3)),
        lookY: lerp(-0.1, 0.25, seg(t, 1.0, 1.25)) * hold,
        wide: seg(t, 1.26, 1.32) * (1 - seg(t, 2.0, 2.4)),
        mouth: t < 1.25 ? "smile" : t < 2.0 ? "o" : t < 3.55 ? "wobble" : "open",
        mouthOpen: 0.45 + 0.35 * Math.abs(Math.sin(t * 7)),
        well: seg(t, 2.0, 3.0),
        sad: seg(t, 1.9, 2.5),
        browUp: seg(t, 1.25, 1.35) * (1 - seg(t, 1.8, 2.2)) * 0.8,
        tears: eo(seg(t, 3.0, 4.3)),
        eyes: t > 4.55 ? "closed" : "open",
        blink: t > 0.2 && t < 0.32 ? Math.sin(seg(t, 0.2, 0.32) * Math.PI) : 0,
        blush: 0.8,
      };
      if (t > 3.55) {
        const sob = Math.abs(Math.sin(t * 9));
        pose.sq = -0.04 * sob;
        pose.lean = Math.sin(t * 9) * 0.03;
        pip.pose(pose);
        pip.reach(1, grip());
      }
      // camera
      if (t < 3.6) {
        const k = eio(seg(t, 0, 3.6));
        const p = vlerp(V3(0.1, 2.5, 9.2), V3(-0.15, 1.95, 7.4), k);
        camShake.set(jiggle(t, 1.27, 0.06, 40, 9), jiggle(t, 1.27, 0.08, 46, 9), 0);
        aim(cam, p.add(camShake), V3(-0.15, 0.95, 0), 40);
      } else {
        const k = eio(seg(t, 3.6, 5.5));
        const dive = ei(seg(t, 5.5, 6.2));
        let p = vlerp(V3(-0.5, 1.4, 4.7), V3(-0.7, 1.3, 4.0), k);
        let look = V3(-1.05, 0.82, 0.55);
        p = vlerp(p, V3(0.7, 0.98, 0.42), dive);
        look = vlerp(look, V3(0.72, 0.76, -0.15), eo(seg(t, 5.45, 6.0)));
        aim(cam, p, look, lerp(36, 22, dive));
      }
    } else if (t < 28.95) {
      // ---------------- SH9: crying fountain
      placePip(-0.35, 0.65, 0.12, 0.86);
      onionAt(onion, 1.6, -0.6, 0.75);
      onion.frontPivot.rotation.x = Math.PI / 2;
      onion.frontPivot.position.set(0.55, -0.47, 0.95);
      const sob = Math.abs(Math.sin(t * 8.5));
      pose = { t, sq: -0.05 * sob + jiggle(t, 25.9, 0.15, 18, 6), lean: Math.sin(t * 8.5) * 0.035, armL: 0.9 + sob * 0.25, armR: 0.9 + sob * 0.25 };
      pip.pose(pose);
      face = { time: t, eyes: "closed", mouth: "open", mouthOpen: 0.55 + 0.45 * sob, tears: 1, sad: 1, blush: 1 };
      // fountains
      drops.visible = true;
      const m4 = new THREE.Matrix4();
      const eyes = { "-1": pip.eyeWorld(-1), 1: pip.eyeWorld(1) };
      for (let i = 0; i < dropN; i++) {
        const d = dropInfo[i];
        const te = 25.95 + (i / dropN) * 2.75;
        const age = t - te;
        let s = 0;
        const pos = V3();
        if (age > 0 && age < 1.3) {
          const e = eyes[d.side];
          const v = V3(d.side * (1.1 + 1.0 * d.a), 2.1 + 1.1 * d.b, 0.5 + 0.9 * d.c);
          pos.set(e.x + v.x * age, e.y + v.y * age - 4.9 * age * age, e.z + v.z * age);
          s = 0.06 * (1 - age / 1.6);
          if (pos.y < 0.03) {
            pos.y = 0.03;
            s *= 0.6;
          }
        }
        m4.compose(pos, new THREE.Quaternion(), V3(s, s * 1.25, s));
        drops.setMatrixAt(i, m4);
      }
      drops.instanceMatrix.needsUpdate = true;
      puddle.visible = true;
      const pr = 0.05 + 1.5 * eo(seg(t, 26.3, 28.8));
      puddle.scale.set(pr * 1.4, pr, 1);
      // green gas swept away by the wave
      const sweep = ei(seg(t, 27.55, 28.3));
      wispsFrom(t, 25.4, V3(-0.6 + sweep * 6, 1.4, 0.8), V3(0.6 + sweep * 3, 1.2, 0.2), 0.3 * (1 - sweep), 2.2);
      const k = eio(seg(t, 25.85, 28.95));
      camShake.set(Math.sin(t * 31) * 0.02, Math.sin(t * 27) * 0.02, 0);
      aim(cam, vlerp(V3(0.0, 2.0, 7.4), V3(-0.15, 1.8, 6.5), k).add(camShake), V3(-0.3, 1.15, 0.5), 40);
    } else if (t < 32.75) {
      // ---------------- SH10: how to stop it
      placePip(-1.05, 0.55, 0.35, 0.72);
      onionAt(fresh, 0.75, 0.0, 0.75);
      const dry = 1 - seg(t, 28.95, 29.45);
      const idea = back(seg(t, 29.5, 29.85));
      pose = {
        t,
        hop: 0.2 * Math.sin(Math.PI * seg(t, 29.52, 29.85)),
        sq: jiggle(t, 29.85, 0.12, 20, 8),
        armL: 0.4,
        armR: lerp(0.4, 2.75, idea),
        lean: -0.04,
      };
      pip.pose(pose);
      face = {
        time: t,
        tears: dry,
        well: dry * 0.8,
        sad: dry,
        mouth: t < 29.5 ? "o" : "grin",
        lookX: t < 30.0 ? 0 : 0.8,
        lookY: t < 30.0 ? -0.5 * idea : 0,
        wide: idea * 0.5 * (1 - seg(t, 30.0, 30.4)),
        blush: 1,
      };
      // chill: frost the onion, rain ice cubes
      const frost = eo(seg(t, 30.1, 30.9));
      const c = new THREE.Color(0xffffff).lerp(new THREE.Color(0xa9dcff), frost);
      fresh.skinMat.color.copy(c);
      fresh.skinMat.emissive = new THREE.Color(0x2a6aa0);
      fresh.skinMat.emissiveIntensity = frost * 0.35;
      ice.forEach((m, i) => {
        const t0 = 30.12 + i * 0.12;
        if (t < t0) return;
        m.visible = true;
        const k2 = seg(t, t0, t0 + 0.55);
        const [x, z] = icePos[i];
        m.scale.setScalar(0.8);
        m.position.set(x, 0.21 + (1 - bounce(k2)) * 4, z);
        m.rotation.set(i + k2 * 2.2, i * 1.3 + k2, i * 0.7);
      });
      stars.forEach((s, i) => {
        const u = s.userData;
        const t0 = 30.3 + u.r1 * 1.0;
        const k3 = seg(t, t0, t0 + 0.7);
        s.visible = k3 > 0 && k3 < 1 && t < 31.45;
        const sc = 0.32 * Math.sin(Math.PI * k3) * (0.6 + u.r3 * 0.6);
        s.scale.set(sc, sc, 1);
        s.position.set(0.75 + (u.r2 - 0.5) * 1.8, 0.3 + u.r3 * 1.4, 0.6 + u.r1 * 0.6);
        s.material.rotation = k3 * 1.5;
      });
      // the sharp knife flies in
      if (t > 31.35) {
        const k4 = eo5(seg(t, 31.35, 31.85));
        knifeAt(lerp(3.0, -0.12, k4), lerp(2.0, 1.12, k4) + Math.sin(t * 2.4) * 0.03, 1.3, lerp(-1.2, 0.2, k4), lerp(0.6, -0.12, k4));
        knife.scale.setScalar(0.55);
      }
      const a = eio(seg(t, 29.9, 30.5));
      const b = eio(seg(t, 31.3, 31.8));
      let p = vlerp(V3(-0.15, 2.2, 8.0), V3(0.75, 1.65, 5.3), a);
      let look = vlerp(V3(-0.15, 0.95, 0), V3(0.75, 0.72, 0), a);
      p = vlerp(p, V3(0.5, 1.4, 4.6), b);
      look = vlerp(look, V3(0.5, 1.05, 0.6), b);
      aim(cam, p, look, 40);
      // glint along the edge (DOM star rides the blade)
      if (t > 31.35) {
        const gk = seg(t, 31.95, 32.35);
        knife.updateWorldMatrix(true, false);
        anchorTo("glint-anchor", knife.localToWorld(V3(lerp(0.15, 2.3, gk), 0.05, 0.05)), cam);
      }
    } else {
      // ---------------- SH12: no more tears
      placePip(-1.05, 0.55, 0.35, 0.72);
      onionAt(onion, 0.72, -0.15, 0.75);
      onion.frontPivot.rotation.x = Math.PI / 2;
      onion.frontPivot.position.set(0.55, -0.47, 0.95);
      const chops = [37.45, 37.85, 38.25];
      let ky = 1.45;
      for (const c of chops) {
        const k = seg(t, c - 0.17, c);
        const up = seg(t, c, c + 0.2);
        if (t > c - 0.17 && t < c + 0.2) ky = lerp(lerp(1.45, 0.9, ei(k)), 1.45, eo(up));
      }
      knifeAt(-0.1, ky, 1.2, 0.1);
      knife.scale.setScalar(0.8);
      const bob = Math.sin(t * 7.4) * 0.5 + 0.5;
      pose = { t, hop: 0.06 * bob, sq: -0.04 * bob + jiggle(t, 36.9, 0.15, 16, 6), lean: Math.sin(t * 3.7) * 0.05, armL: 0.6 + bob * 0.3 };
      pip.pose(pose);
      pip.reach(1, grip());
      face = { time: t, eyes: t < 38.55 ? "happy" : "open", wink: t >= 38.55, mouth: "grin", blush: 1, lookX: 0.1 };
      stars.forEach((s, i) => {
        const u = s.userData;
        const per = 1.1;
        const k3 = ((t - 36.95 + u.r1 * per) % per) / per;
        s.visible = t > 36.95;
        const sc = 0.26 * Math.sin(Math.PI * k3) * (0.6 + u.r3 * 0.7);
        s.scale.set(sc, sc, 1);
        const a = u.r2 * Math.PI * 2;
        s.position.set(-1.0 + Math.cos(a) * (0.85 + u.r3 * 0.4), 0.75 + Math.sin(a) * 0.8, 0.9);
        s.material.rotation = k3 * 2;
      });
      const k = eio(seg(t, 36.85, TOTAL));
      aim(cam, vlerp(V3(-0.1, 2.15, 8.0), V3(-0.25, 1.9, 6.9), k), V3(-0.2, 0.95, 0.3), 40);
    }
    pip.setFace(face);
    scene.updateMatrixWorld();
    cam.updateMatrixWorld();
    anchorTo("pip-anchor-1", worldOf(pip.body, V3(0, 1.25, 0)), cam);
    anchorTo("pip-anchor-2", worldOf(pip.body, V3(0, 1.25, 0)), cam);
    anchorTo("pip-anchor-3", worldOf(pip.body, V3(0, 1.25, 0)), cam);
    anchorTo("onion-anchor", worldOf(fresh.root, V3(0, 0.3, 0)), cam);
  }
  return { scene, cam, update };
})();

// ================================================================== SHOT: cells field (SH3)
const CELLS = (() => {
  const { scene } = makeStage({ key: 2.0, keyPos: [2, 8, 4], rim: 2.2, env: 0.7, shadow: false });
  const cam = makeCamera(36);
  const list = brickGrid(range(-16, 8), [-5, 5]);
  const cells = makeCells(list, 3);
  scene.add(cells.group);
  const motes = makeSmoke(40, 0xffc6f0, 41, 0.25, true);
  motes.forEach((m) => {
    m.material.map = glowTex;
    scene.add(m);
  });
  // label target cell
  let hero = 0;
  let best = 1e9;
  list.forEach((c, i) => {
    const d = Math.hypot(c.x - 0.8, c.z - -0.62);
    if (d < best) {
      best = d;
      hero = i;
    }
  });
  function update(t) {
    const lt = t - 6.2;
    cells.info.forEach((c, i) => {
      const br = 1 + Math.sin(t * 2.2 + c.ph) * 0.025;
      const rise = eo5(seg(lt, (c.row + 16) * 0.012, (c.row + 16) * 0.012 + 0.5));
      cells.set(i, c.x, -0.4 + rise * 0.4, c.z, br * (0.6 + 0.4 * rise));
    });
    const hs = 1 + back(seg(t, 8.25, 8.6)) * 0.15;
    const hc = cells.info[hero];
    cells.set(hero, hc.x, 0.05 * seg(t, 8.25, 8.5), hc.z, hs);
    cells.tint(hero, new THREE.Color().lerpColors(hc.color, new THREE.Color(0xffe27a), seg(t, 8.25, 8.5)));
    cells.commit();
    motes.forEach((m) => {
      const u = m.userData;
      m.position.set((u.r1 - 0.5) * 9, 0.4 + u.r2 * 2.5 + Math.sin(t * 0.8 + u.r3 * 6) * 0.2, -9 + u.r4 * 12);
      const s = 0.08 + u.r3 * 0.12;
      m.scale.set(s, s, 1);
    });
    const dive = eo5(seg(t, 6.2, 7.3));
    const drift = eio(seg(t, 7.3, 9.25));
    let p = vlerp(V3(0.2, 11, 12), V3(0.1, 3.4, 3.6), dive);
    p = vlerp(p, V3(0.75, 2.6, 2.3), drift);
    aim(cam, p, V3(0.5, 0, -0.8), 36);
    scene.updateMatrixWorld();
    anchorTo("cell-anchor", V3(hc.x, 0.25, hc.z), cam);
  }
  return { scene, cam, update };
})();

// ================================================================== SHOT: one cell, two chemicals (SH4)
const CELL = (() => {
  const { scene } = makeStage({ key: 2.2, keyPos: [3, 6, 6], rim: 2.4, env: 0.8, shadow: false });
  const cam = makeCamera(34);
  const wallMat = new THREE.MeshPhysicalMaterial({ color: 0xf6b8e2, transparent: true, opacity: 0.32, roughness: 0.1, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide, emissive: 0x6a1550, emissiveIntensity: 0.25 });
  const shell = new THREE.Mesh(new RoundedBoxGeometry(3.6, 2.3, 1.7, 6, 0.5), wallMat);
  shell.renderOrder = 3;
  scene.add(shell);
  const div = new THREE.Mesh(new RoundedBoxGeometry(0.14, 2.0, 1.45, 3, 0.06), new THREE.MeshPhysicalMaterial({ color: 0xfff1fb, roughness: 0.3, clearcoat: 1, emissive: 0xffffff, emissiveIntensity: 0.0 }));
  withInk(div, 0.02);
  scene.add(div);
  const r = rng(12);
  const sulfur = Array.from({ length: 7 }, (_, i) => {
    const g = new THREE.Group();
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 18), new THREE.MeshPhysicalMaterial({ color: 0xffd23f, roughness: 0.25, clearcoat: 1, emissive: 0xb07a00, emissiveIntensity: 0.25 }));
    withInk(c, 0.014);
    g.add(c);
    for (let k = 0; k < 2; k++) {
      const a = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshPhysicalMaterial({ color: k ? 0xffffff : 0xff9f43, roughness: 0.3, clearcoat: 1 }));
      a.position.set(Math.cos(k * 2.4) * 0.2, Math.sin(k * 2.4) * 0.2, 0.05);
      withInk(a, 0.012);
      g.add(a);
    }
    g.userData = { bx: -0.4 - r() * 1.15, by: (r() - 0.5) * 1.4, bz: (r() - 0.5) * 0.9, ph: r() * 6.28, f: 0.8 + r() * 0.8 };
    scene.add(g);
    return g;
  });
  const blobGeo = new THREE.IcosahedronGeometry(0.3, 5);
  {
    const p = blobGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = V3(p.getX(i), p.getY(i), p.getZ(i));
      const n = 1 + 0.12 * Math.sin(v.x * 9 + v.y * 4) * Math.sin(v.z * 8 - v.y * 5);
      // a little "mouth" notch (enzyme active site)
      const notch = Math.max(0, v.normalize().x * -1 - 0.75) * 1.4;
      v.multiplyScalar(0.3 * n * (1 - notch));
      p.setXYZ(i, v.x, v.y, v.z);
    }
    blobGeo.computeVertexNormals();
  }
  const enzymes = Array.from({ length: 4 }, (_, i) => {
    const m = new THREE.Mesh(blobGeo, new THREE.MeshPhysicalMaterial({ color: 0x8a6bff, roughness: 0.3, clearcoat: 1, sheen: 0.6, sheenColor: new THREE.Color(0xd8ccff), emissive: 0x2c1680, emissiveIntensity: 0.3 }));
    withInk(m, 0.016);
    const f = faceSprite("eager", 0.42);
    scene.add(m, f);
    m.userData = { bx: 0.55 + (i % 2) * 0.6, by: i < 2 ? 0.45 : -0.45, bz: (r() - 0.5) * 0.5, ph: r() * 6.28, face: f };
    return m;
  });
  function update(t) {
    const lt = t - 9.25;
    const push = seg(t, 11.8, 12.1) * (1 - seg(t, 12.5, 13.0));
    sulfur.forEach((g, i) => {
      const u = g.userData;
      g.position.set(u.bx + Math.sin(t * u.f + u.ph) * 0.12, u.by + Math.sin(t * u.f * 1.3 + u.ph * 2) * 0.1, u.bz + Math.cos(t * u.f + u.ph) * 0.1);
      g.rotation.set(t * 0.6 + u.ph, t * 0.4, 0);
      const s = back(seg(lt, 0.15 + i * 0.05, 0.6 + i * 0.05));
      g.scale.setScalar(Math.max(0.001, s));
    });
    enzymes.forEach((m, i) => {
      const u = m.userData;
      const lunge = push * (0.35 - (u.bx - 0.55) * 0.3);
      m.position.set(u.bx - lunge + Math.sin(t * 1.4 + u.ph) * 0.08, u.by + Math.sin(t * 1.9 + u.ph) * 0.08, u.bz);
      m.rotation.set(Math.sin(t + u.ph) * 0.2, Math.sin(t * 0.7 + u.ph) * 0.3, 0);
      const s = back(seg(lt, 1.6 + i * 0.07, 2.05 + i * 0.07));
      m.scale.setScalar(Math.max(0.001, s));
      u.face.material.opacity = clamp(s);
      u.face.scale.setScalar(0.42 * Math.max(0.001, s));
    });
    div.scale.set(1 + jiggle(t, 12.09, 0.5, 30, 8), 1, 1);
    div.material.emissiveIntensity = 0.6 * jiggle(t, 12.09, 1, 0.001, 4);
    const k = eio(seg(t, 9.25, 13.25));
    const ang = lerp(0.42, -0.22, k);
    const dist = lerp(11.0, 9.8, k);
    cam.position.set(Math.sin(ang) * dist, lerp(1.3, 0.8, k), Math.cos(ang) * dist);
    cam.lookAt(0, 0.05, 0);
    cam.updateMatrixWorld();
    enzymes.forEach((m) => faceToward(m.userData.face, m.position, cam, 0.31 * m.scale.x));
    scene.updateMatrixWorld();
    anchorTo("sulfur-anchor", V3(-0.9, 0.85, 0.2), cam);
    anchorTo("enzyme-anchor", V3(0.85, 0.85, 0.2), cam);
    anchorTo("lock-anchor", V3(0, 1.15, 0.5), cam);
  }
  return { scene, cam, update };
})();

// ================================================================== SHOT: slice + collide (SH5)
const SLICE = (() => {
  const st = makeStage({ key: 2.4, keyPos: [4, 9, 5], rim: 2.2, env: 0.75, shadowSize: 7 });
  const { scene } = st;
  const cam = makeCamera(34);
  const list = brickGrid(range(-9, 5), [-3, 3]);
  const cells = makeCells(list, 8);
  cells.cells.receiveShadow = true;
  scene.add(cells.group);
  const knife = makeKnife({ len: 2.6 });
  knife.scale.setScalar(2.3);
  scene.add(knife);
  const cut = [];
  list.forEach((c, i) => {
    if (Math.abs(c.x) < 0.85) cut.push(i);
  });
  // particles: 4 yellow + 4 purple per cut cell
  const pr = rng(51);
  const parts = [];
  cut.forEach((ci) => {
    const c = list[ci];
    for (let k = 0; k < 8; k++) {
      const yellow = k < 4;
      parts.push({
        ci,
        yellow,
        o: V3(c.x, 0, c.z),
        v: V3((yellow ? -1 : 1) * (0.6 + pr() * 1.4), 1.6 + pr() * 2.2, (pr() - 0.5) * 1.6),
        dest: Math.floor(pr() * 5),
        ph: pr(),
      });
    }
  });
  const partMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 14, 10), new THREE.MeshPhysicalMaterial({ roughness: 0.25, clearcoat: 1, emissive: 0x222222, emissiveIntensity: 0.4 }), parts.length);
  const Y = new THREE.Color(0xffd23f);
  const P = new THREE.Color(0x8a6bff);
  parts.forEach((p, i) => partMesh.setColorAt(i, p.yellow ? Y : P));
  scene.add(partMesh);
  const dests = Array.from({ length: 5 }, (_, i) => V3(0, 1.3 + (i % 2) * 0.35, 1.2 - i * 1.1));
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xd9ff9a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(flash);
  const gas = Array.from({ length: 10 }, (_, i) => {
    const m = makeMolecule(i);
    scene.add(m);
    return m;
  });
  const gr = rng(61);
  const gasInfo = gas.map(() => ({ d: Math.floor(gr() * 5), v: V3((gr() - 0.5) * 2, 0.8 + gr() * 1.4, (gr() - 0.5) * 1.5), ph: gr() * 6 }));
  const burstT = (ci) => 15.3 + clamp((list[ci].z + 5.6) / 9.0) * 0.45;
  function update(t) {
    const enter = eo(seg(t, 14.0, 14.3));
    const slice = eio(seg(t, 14.15, 14.85));
    const out = eio(seg(t, 15.9, 16.4));
    knife.position.set(0, lerp(lerp(5.5, 2.2, enter), -0.35, slice) + out * 5.5, lerp(2.4, 0.6, slice) - out * 1);
    knife.rotation.set(0, Math.PI / 2, lerp(0.18, -0.06, slice) + jiggle(t, 14.85, 0.03, 30, 8));
    knife.visible = t > 13.95 && t < 16.5;
    const part = eo(seg(t, 14.4, 15.0));
    list.forEach((c, i) => {
      const br = 1 + Math.sin(t * 2.4 + cells.info[i].ph) * 0.02;
      const isCut = Math.abs(c.x) < 0.85;
      let x = c.x;
      let s = br;
      let sy = br;
      if (!isCut) x += Math.sign(c.x) * 0.22 * part;
      else {
        const tb = burstT(i);
        const a = seg(t, tb - 0.09, tb);
        const b = seg(t, tb, tb + 0.14);
        s = br * (1 + 0.35 * a) * (1 - b);
        sy = s * (1 - 0.3 * a);
        if (a > 0) cells.tint(i, new THREE.Color().lerpColors(cells.info[i].color, new THREE.Color(0xffffff), a));
      }
      cells.set(i, x, 0, c.z, s, sy);
    });
    cells.commit();
    // particles
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const tc = 16.95;
    parts.forEach((p, i) => {
      const tb = burstT(p.ci);
      let s = 0;
      const pos = V3();
      if (t > tb && t < tc + 0.05) {
        const a = Math.min(t, 16.25) - tb;
        const drag = (1 - Math.exp(-3.2 * a)) / 3.2;
        pos.copy(p.o).addScaledVector(p.v, drag);
        pos.y += Math.sin(t * 5 + p.ph * 6) * 0.05;
        if (t > 16.25) {
          const k = ei(seg(t, 16.25 + p.ph * 0.1, tc));
          const d = dests[p.dest].clone();
          d.x += (p.yellow ? -1 : 1) * 0.12 * (1 - k);
          pos.lerp(d, k);
        }
        s = 1 * eo(seg(t, tb, tb + 0.12)) * (1 - seg(t, tc - 0.04, tc + 0.04));
      }
      m4.compose(pos, q, V3(s, s, s));
      partMesh.setMatrixAt(i, m4);
    });
    partMesh.instanceMatrix.needsUpdate = true;
    if (partMesh.instanceColor) partMesh.instanceColor.needsUpdate = true;
    // flash + gas born
    const fk = seg(t, tc - 0.02, tc + 0.5);
    flash.visible = fk > 0 && fk < 1;
    flash.position.set(0, 1.45, -0.6);
    const fs = 7 * eo(fk);
    flash.scale.set(fs, fs, 1);
    flash.material.opacity = 1 - fk;
    gas.forEach((m, i) => {
      const g = gasInfo[i];
      const a = t - tc;
      m.visible = a > 0;
      if (!m.visible) return;
      m.position.copy(dests[g.d]).addScaledVector(g.v, a * 0.9);
      m.rotation.set(t * 1.3 + g.ph, t * 0.9, 0);
      m.scale.setScalar(back(seg(a, 0, 0.35)) * 1.2);
    });
    const k = eio(seg(t, 13.25, 17.65));
    const shake = V3(jiggle(t, 14.85, 0.05, 40, 9) + jiggle(t, tc, 0.12, 38, 6), jiggle(t, tc, 0.12, 44, 6), 0);
    aim(cam, vlerp(V3(5.6, 5.4, 7.6), V3(4.4, 4.0, 6.0), k).add(shake), V3(0, lerp(0.2, 1.0, seg(t, 15.8, 17.0)), -0.6), 34);
  }
  return { scene, cam, update };
})();

// ================================================================== SHOT: gas rises (SH6)
const GAS = (() => {
  const { scene } = makeStage({ key: 1.8, keyPos: [2, 6, 6], rim: 2.6, env: 0.6, shadow: false });
  const cam = makeCamera(36);
  const r = rng(71);
  const mols = Array.from({ length: 34 }, (_, i) => {
    const m = makeMolecule(i + 20);
    const face = i % 4 === 0 ? faceSprite("grin", 0.34) : null;
    if (face) scene.add(face);
    scene.add(m);
    m.userData = { R: 0.6 + r() * 2.6, w: 0.4 + r() * 0.5, ph: r() * 6.28, y0: -4 + r() * 5.5, v: 0.7 + r() * 0.6, s: 0.8 + r() * 0.6, face };
    return m;
  });
  const hero = makeMolecule(99);
  hero.scale.setScalar(1.9);
  const heroFace = faceSprite("grin", 0.6);
  scene.add(hero, heroFace);
  const smoke = makeSmoke(26, 0x8cff4a, 81, 0.22, true);
  smoke.forEach((s) => scene.add(s));
  function update(t) {
    const lt = t - 17.65;
    mols.forEach((m) => {
      const u = m.userData;
      const a = u.w * t + u.ph;
      m.position.set(Math.cos(a) * u.R, u.y0 + u.v * lt, Math.sin(a) * u.R * 0.7 - 0.5);
      m.rotation.set(t * 1.1 + u.ph, t * 0.7, 0);
      m.scale.setScalar(u.s * back(seg(lt, u.ph * 0.05, u.ph * 0.05 + 0.4)));
    });
    hero.position.set(0.25 + Math.sin(t * 1.2) * 0.15, lerp(-0.6, 1.4, seg(t, 17.65, 20.75)), 1.2);
    hero.rotation.set(t * 0.9, t * 0.6, 0.3);
    smoke.forEach((s) => {
      const u = s.userData;
      const life = 3;
      const k = ((lt + u.r1 * life) % life) / life;
      s.position.set((u.r2 - 0.5) * 6, -3.5 + k * 7 + u.r3, -1.5 + (u.r4 - 0.5) * 2);
      const sc = 1.5 + k * 3;
      s.scale.set(sc, sc, 1);
      s.material.opacity = 0.22 * Math.sin(Math.PI * k);
      s.material.rotation = u.r1 * 6 + lt * 0.2;
    });
    const k = eio(seg(t, 17.65, 20.75));
    aim(cam, vlerp(V3(0, -0.8, 7.2), V3(0.3, 1.0, 6.4), k), V3(0.1, lerp(0.0, 1.5, k), 0), 36);
    mols.forEach((m) => {
      const f = m.userData.face;
      if (f) faceToward(f, m.position, cam, 0.2 * m.scale.x);
    });
    faceToward(heroFace, hero.position, cam, 0.36);
    scene.updateMatrixWorld();
    anchorTo("gas-anchor", hero.position.clone().add(V3(0.25, 0.3, 0)), cam);
  }
  return { scene, cam, update };
})();

// ================================================================== SHOT: the eye (SH7)
const EYE = (() => {
  const { scene } = makeStage({ key: 2.4, keyPos: [3, 5, 7], rim: 2.4, env: 0.8, shadow: false });
  const cam = makeCamera(34);
  const eyeTex = canvasTex(2048, 1024, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, "#f3d6d3");
    g.addColorStop(0.25, "#fffaf5");
    g.addColorStop(0.5, "#f3d6d3");
    g.addColorStop(1, "#f3d6d3");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const cx = w * 0.25;
    const cy = h * 0.5;
    const ir = 165;
    const ig = c.createRadialGradient(cx, cy, 40, cx, cy, ir);
    ig.addColorStop(0, "#8fe3c0");
    ig.addColorStop(0.55, "#2fa38a");
    ig.addColorStop(1, "#14524f");
    c.fillStyle = ig;
    c.beginPath();
    c.arc(cx, cy, ir, 0, Math.PI * 2);
    c.fill();
    const r = rng(4);
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2;
      c.strokeStyle = `rgba(${r() > 0.5 ? "220,255,235" : "10,60,55"},${0.2 + r() * 0.3})`;
      c.lineWidth = 2 + r() * 3;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * 70, cy + Math.sin(a) * 70);
      c.lineTo(cx + Math.cos(a + 0.05) * (ir - 8), cy + Math.sin(a + 0.05) * (ir - 8));
      c.stroke();
    }
    c.strokeStyle = INK_CSS;
    c.lineWidth = 14;
    c.beginPath();
    c.arc(cx, cy, ir, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = "#120a1e";
    c.beginPath();
    c.arc(cx, cy, 70, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.ellipse(cx - 38, cy - 42, 30, 22, -0.5, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(cx + 34, cy + 30, 12, 0, Math.PI * 2);
    c.fill();
  });
  const veinTex = canvasTex(2048, 1024, (c, w, h) => {
    const r = rng(17);
    c.strokeStyle = "rgba(214,40,60,0.85)";
    c.lineCap = "round";
    const branch = (x, y, a, len, wdt, depth) => {
      if (depth > 4 || wdt < 0.8) return;
      let px = x;
      let py = y;
      c.lineWidth = wdt;
      c.beginPath();
      c.moveTo(px, py);
      for (let i = 0; i < len; i++) {
        a += (r() - 0.5) * 0.5;
        px += Math.cos(a) * 10;
        py += Math.sin(a) * 10;
        c.lineTo(px, py);
        if (r() < 0.12) {
          c.stroke();
          branch(px, py, a + (r() - 0.5) * 1.6, len * 0.6, wdt * 0.65, depth + 1);
          c.lineWidth = wdt;
          c.beginPath();
          c.moveTo(px, py);
        }
      }
      c.stroke();
    };
    const cx = w * 0.25;
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const sx = cx + Math.cos(a) * 520;
      const sy = h / 2 + Math.sin(a) * 420;
      branch(sx, sy, a + Math.PI, 26, 6, 0);
    }
  });
  const eye = new THREE.Group();
  eye.position.set(0, 0.55, 0);
  scene.add(eye);
  const ball = new THREE.Group();
  eye.add(ball);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1.4, 96, 64), new THREE.MeshPhysicalMaterial({ map: eyeTex, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03 }));
  withInk(globe, 0.03);
  const veins = new THREE.Mesh(new THREE.SphereGeometry(1.403, 96, 64), new THREE.MeshStandardMaterial({ map: veinTex, transparent: true, opacity: 0, depthWrite: false, roughness: 0.2 }));
  ball.add(globe, veins);
  const skin = new THREE.MeshPhysicalMaterial({ color: 0xe58f74, roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color(0xffe0d0), side: THREE.DoubleSide });
  const lidU = new THREE.Group();
  const lidUm = new THREE.Mesh(new THREE.SphereGeometry(1.5, 72, 24, 0, Math.PI * 2, 0, 1.25), skin);
  withInk(lidUm, 0.025);
  lidU.add(lidUm);
  const lashMat = new THREE.MeshBasicMaterial({ color: INK });
  for (let i = 0; i < 9; i++) {
    const ph = Math.PI / 2 - 0.85 + (i / 8) * 1.7;
    const th = 1.22;
    const p = V3(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th)).multiplyScalar(1.52);
    const lash = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.32, 8), lashMat);
    const dir = p.clone().normalize().add(V3(0, 0.9, 0)).normalize();
    lash.quaternion.setFromUnitVectors(V3(0, 1, 0), dir);
    lash.position.copy(p).addScaledVector(dir, 0.12);
    lidU.add(lash);
  }
  const lidL = new THREE.Group();
  const lidLm = new THREE.Mesh(new THREE.SphereGeometry(1.48, 72, 24, 0, Math.PI * 2, Math.PI - 0.95, 0.95), skin);
  withInk(lidLm, 0.025);
  lidL.add(lidLm);
  eye.add(lidU, lidL);
  const tear = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshPhysicalMaterial({ color: 0x8fdcff, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.8, emissive: 0x2f8fd0, emissiveIntensity: 0.3 }));
  withInk(tear, 0.02);
  eye.add(tear);
  const r = rng(91);
  const gas = Array.from({ length: 9 }, (_, i) => {
    const m = makeMolecule(i + 40);
    const f = faceSprite("grin", 0.36);
    scene.add(m, f);
    const th = (r() - 0.5) * 1.3;
    const ph = Math.PI / 2 + (r() - 0.5) * 1.2;
    m.userData = {
      start: V3(-3 + r() * 1.5, -4.5 - r() * 1.5, 2.5 + r()),
      hit: V3(-Math.cos(ph) * Math.cos(th), Math.sin(th) * 0.8, Math.sin(ph) * Math.cos(th)).multiplyScalar(1.52).add(eye.position),
      t0: 20.85 + i * 0.12,
      f,
      ph: r() * 6,
    };
    return m;
  });
  function update(t) {
    const hitT = 22.0;
    const flinch = jiggle(t, hitT, 1, 26, 5);
    const squint = seg(t, hitT, hitT + 0.15) * (1 - 0.35 * seg(t, 22.6, 23.9));
    const blink = Math.sin(Math.PI * seg(t, 21.15, 21.35));
    lidU.rotation.x = -0.25 + squint * 0.62 + blink * 1.2 + flinch * 0.05;
    lidL.rotation.x = 0.1 - squint * 0.42 - blink * 0.3;
    ball.rotation.set(lerp(0, 0.25, seg(t, 20.9, 21.6)) * (1 - squint * 0.6), lerp(0, -0.3, seg(t, 20.9, 21.6)) + Math.sin(t * 23) * 0.02 * squint, 0);
    veins.material.opacity = 0.95 * eo(seg(t, hitT, 23.3));
    eye.position.x = flinch * 0.06;
    eye.scale.setScalar(1 + 0.03 * flinch);
    const tk = eo(seg(t, 22.4, 23.9));
    tear.visible = tk > 0;
    tear.position.set(-0.2, -1.12 - tk * 0.12, 1.02);
    tear.scale.set(0.12 + 0.28 * tk, 0.1 + 0.2 * tk, 0.12 + 0.18 * tk);
    const k = eio(seg(t, 20.75, 23.95));
    const shake = V3(jiggle(t, hitT, 0.08, 40, 8), jiggle(t, hitT, 0.06, 36, 8), 0);
    aim(cam, vlerp(V3(1.0, 0.0, 8.2), V3(0.35, 0.2, 6.6), k).add(shake), V3(0, 0.3, 0), 34);
    gas.forEach((m, i) => {
      const u = m.userData;
      const fly = seg(t, u.t0, hitT - 0.05 + i * 0.02);
      const pos = u.start.clone().lerp(u.hit, eio(fly));
      pos.x += Math.sin(fly * Math.PI) * 0.6;
      if (fly >= 1) {
        pos.copy(u.hit);
        pos.addScaledVector(u.hit.clone().sub(eye.position).normalize(), 0.12 + Math.sin(t * 30 + u.ph) * 0.03);
      }
      m.position.copy(pos);
      m.rotation.set(t * 2 + u.ph, t * 1.4, 0);
      m.visible = t > u.t0;
      m.scale.setScalar(0.85);
      u.f.visible = m.visible;
      faceToward(u.f, m.position, cam, 0.18);
    });
    scene.updateMatrixWorld();
    anchorTo("eye-anchor", eye.position, cam);
  }
  return { scene, cam, update };
})();

// ================================================================== SHOT: the brain (SH8)
const BRAIN = (() => {
  const { scene } = makeStage({ key: 2.0, keyPos: [3, 5, 6], rim: 2.6, env: 0.6, shadow: false });
  const cam = makeCamera(34);
  const geo = new THREE.SphereGeometry(1, 160, 120);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = V3(p.getX(i), p.getY(i), p.getZ(i));
    const n = v.clone().normalize();
    const folds =
      0.06 * Math.sin(7 * n.x + 3 * Math.sin(5 * n.y + 2 * n.z)) * Math.cos(6.5 * n.y + 2.5 * Math.sin(5 * n.z)) +
      0.03 * Math.sin(10 * n.z + 3 * n.x) * Math.sin(9 * n.y - 2 * n.x);
    const fissure = -0.16 * Math.exp(-Math.pow(n.x / 0.07, 2)) * clamp(n.y + 0.4, 0, 1);
    const flat = n.y < -0.35 ? (n.y + 0.35) * 0.4 : 0;
    v.multiplyScalar(1 - Math.pow(Math.abs(folds) / 0.09, 0.6) * 0.07 + 0.03 + fissure);
    v.y += flat;
    p.setXYZ(i, v.x * 1.05, v.y * 0.86, v.z * 1.32);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xf59ab3, roughness: 0.42, sheen: 0.8, sheenColor: new THREE.Color(0xffd6e2), clearcoat: 0.4, emissive: 0xff1a3a, emissiveIntensity: 0 });
  const brain = new THREE.Mesh(geo, mat);
  withInk(brain, 0.025);
  const g = new THREE.Group();
  g.add(brain);
  scene.add(g);
  const face = faceSprite("panic", 1.1);
  scene.add(face);
  const alarm = new THREE.PointLight(0xff2a3a, 0, 12, 1.2);
  scene.add(alarm);
  const signal = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff27a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(signal);
  const sigCurve = new THREE.CatmullRomCurve3([V3(-0.6, -4.5, 1.5), V3(-0.4, -2.4, 1.2), V3(0.1, -1.1, 0.9), V3(0, 0, 0.4)]);
  const trail = new THREE.Mesh(new THREE.TubeGeometry(sigCurve, 64, 0.04, 8), new THREE.MeshBasicMaterial({ color: 0xfff27a, transparent: true, opacity: 0.0 }));
  scene.add(trail);
  function update(t) {
    const hit = 24.42;
    const sk = seg(t, 24.0, hit);
    signal.visible = sk > 0 && sk < 1;
    signal.position.copy(sigCurve.getPoint(eio(sk)));
    signal.scale.setScalar(0.9);
    trail.material.opacity = 0.7 * sk * (1 - seg(t, hit, hit + 0.4));
    const pulse = t > hit ? 0.5 + 0.5 * Math.sin((t - hit) * 16) : 0;
    mat.emissiveIntensity = pulse * 0.5 * seg(t, hit, hit + 0.2);
    alarm.intensity = 30 * pulse * seg(t, hit, hit + 0.2);
    alarm.position.set(Math.cos(t * 9) * 3, 1.5, Math.sin(t * 9) * 3 + 1);
    const shake = t > hit ? Math.sin(t * 47) * 0.04 : 0;
    const sc = 1 + 0.05 * pulse * seg(t, hit, hit + 0.2) + jiggle(t, hit, 0.1, 22, 6);
    g.scale.setScalar(sc);
    g.rotation.set(0.15, lerp(-0.6, -0.25, eio(seg(t, 23.95, 25.85))) + shake, shake);
    g.position.x = shake;
    const k = eio(seg(t, 23.95, 25.85));
    aim(cam, vlerp(V3(1.5, 1.0, 8.0), V3(0.9, 0.7, 7.0), k), V3(0, 0.05, 0), 34);
    face.position.set(0.5 + shake, 0.05, 1.45);
    faceToward(face, V3(shake, 0.05, 0), cam, 1.45);
    face.scale.setScalar(1.1 * (1 + jiggle(t, hit, 0.15, 20, 6)));
  }
  return { scene, cam, update };
})();

// ================================================================== SHOT: cold slows it (SH11a)
const COLD = (() => {
  const { scene } = makeStage({ key: 2.0, keyPos: [2, 6, 6], rim: 2.4, env: 0.9, shadow: false });
  const cam = makeCamera(34);
  const enzMat = new THREE.MeshPhysicalMaterial({ color: 0x8a6bff, roughness: 0.3, clearcoat: 1, emissive: 0x2c1680, emissiveIntensity: 0.3 });
  const blob = new THREE.IcosahedronGeometry(0.32, 4);
  const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xe6fbff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.45, depthWrite: false, emissive: 0xaee8ff, emissiveIntensity: 0.6 });
  const r = rng(101);
  const items = Array.from({ length: 5 }, (_, i) => {
    const m = new THREE.Mesh(blob, enzMat);
    withInk(m, 0.016);
    const ice = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.95, 0.95, 3, 0.12), iceMat);
    ice.renderOrder = 4;
    const f = faceSprite("eager", 0.42);
    scene.add(m, ice, f);
    return { m, ice, f, bx: (i - 2) * 0.95 + (r() - 0.5) * 0.2, by: (i % 2 ? 0.75 : -0.55) + (r() - 0.5) * 0.4, ph: r() * 6, rot: r() * 6 };
  });
  const sleepy = FACES.sleepy;
  const flakes = makeStars(16, 7);
  flakes.forEach((s) => scene.add(s));
  function update(t) {
    const slowAt = 33.1;
    // time-warp: full speed, then 15%
    const m = t < slowAt ? (t - 32.75) * 2.2 : 0.77 + (t - slowAt) * 0.15;
    const freeze = eo(seg(t, 33.0, 33.5));
    items.forEach((it, i) => {
      const x = it.bx + Math.sin(m * 3 + it.ph) * 0.3;
      const y = it.by + Math.cos(m * 2.6 + it.ph * 2) * 0.25;
      it.m.position.set(x, y, 0);
      it.m.rotation.set(m * 2 + it.rot, m * 1.5, 0);
      it.ice.position.set(x, y, 0);
      it.ice.rotation.set(0.3 + it.rot * 0.1, 0.5 + it.rot * 0.1, 0.1);
      it.ice.scale.setScalar(Math.max(0.001, back(seg(t, 33.0 + i * 0.06, 33.4 + i * 0.06))));
      it.f.material.map = t > 33.25 ? sleepy : FACES.eager;
    });
    flakes.forEach((s) => {
      const u = s.userData;
      const k = seg(t, 33.0 + u.r1 * 1.0, 33.7 + u.r1 * 1.0);
      s.visible = k > 0 && k < 1;
      const sc = 0.28 * Math.sin(Math.PI * k);
      s.scale.set(sc, sc, 1);
      s.position.set((u.r2 - 0.5) * 3.4, (u.r3 - 0.5) * 3.6, 0.8);
      s.material.rotation = k * 2;
    });
    const k = eio(seg(t, 32.75, 34.4));
    aim(cam, vlerp(V3(0.3, 0.2, 6.4), V3(0, 0.1, 5.7), k), V3(0, 0.1, 0), 34);
    items.forEach((it) => faceToward(it.f, it.m.position, cam, 0.36));
    scene.updateMatrixWorld();
  }
  return { scene, cam, update };
})();

// ================================================================== SHOT: dull vs sharp (SH11b)
const COMPARE = (() => {
  const { scene } = makeStage({ key: 2.2, keyPos: [2, 6, 9], rim: 2.0, env: 0.8, shadow: false });
  const cam = makeCamera(34);
  const mk = (cy) => {
    const out = [];
    for (let row = 0; row < 5; row++) for (let c = -3; c <= 3; c++) out.push({ x: c * 1.58 + (row % 2 ? 0.79 : 0), y: cy + (row - 2) * 0.62, z: 0, row });
    return out;
  };
  const top = mk(2.25);
  const bot = mk(-2.25);
  const list = top.concat(bot);
  const cells = makeCells(list, 13);
  scene.add(cells.group);
  const slab = new THREE.Mesh(new RoundedBoxGeometry(0.62, 3.2, 1.2, 3, 0.18), new THREE.MeshPhysicalMaterial({ color: 0x8c919c, roughness: 0.75, metalness: 0.3 }));
  withInk(slab, 0.025);
  scene.add(slab);
  const knife = makeKnife({ len: 2.6 });
  knife.scale.setScalar(1.7);
  scene.add(knife);
  const puffs = makeSmoke(22, 0x8cff4a, 111, 0.5);
  puffs.forEach((s) => scene.add(s));
  const RED = new THREE.Color(0xff5a6a);
  function update(t) {
    const dullT = 34.92;
    const sharpT = 35.62;
    const sd = ei(seg(t, 34.55, dullT));
    slab.position.set(0, lerp(5.6, 1.85, sd) + jiggle(t, dullT, 0.08, 30, 7), 0.2);
    slab.scale.set(1, 1, 1);
    const ks = eio(seg(t, 35.3, sharpT));
    knife.position.set(0, lerp(1.2, -3.85, ks), 0.15);
    knife.rotation.set(0, Math.PI / 2 - 0.35, 0);
    knife.visible = t > 35.25;
    list.forEach((c, i) => {
      const br = 1 + Math.sin(t * 2.4 + cells.info[i].ph) * 0.02;
      let s = br;
      let x = c.x;
      const isTop = i < top.length;
      if (isTop) {
        const hitW = Math.abs(c.x) < 1.35;
        if (hitW) {
          const tb = dullT - 0.12 + (2.25 + 1.0 - c.y) * 0.03;
          const a = seg(t, tb - 0.05, tb + 0.05);
          const b = seg(t, tb + 0.05, tb + 0.22);
          s = br * (1 + 0.25 * a) * (1 - b);
          cells.tint(i, new THREE.Color().lerpColors(cells.info[i].color, RED, a));
        } else x += Math.sign(c.x) * 0.25 * eo(seg(t, dullT - 0.1, dullT + 0.2));
      } else {
        const hit = Math.abs(c.x) < 0.5;
        if (hit) {
          const tb = 35.45 + (-2.25 + 1.0 - c.y) * -0.06;
          const a = seg(t, tb - 0.04, tb + 0.03);
          const b = seg(t, tb + 0.03, tb + 0.15);
          s = br * (1 + 0.2 * a) * (1 - b);
          cells.tint(i, new THREE.Color().lerpColors(cells.info[i].color, RED, a));
        } else x += Math.sign(c.x) * 0.06 * eo(seg(t, 35.4, 35.8));
      }
      cells.set(i, x, c.y, c.z, s, s, Math.PI / 2);
    });
    cells.commit();
    puffs.forEach((p, i) => {
      const u = p.userData;
      const isTop = i < 18;
      const t0 = isTop ? dullT - 0.05 + u.r1 * 0.3 : sharpT - 0.1 + u.r1 * 0.2;
      const k = seg(t, t0, t0 + 1.4);
      p.visible = k > 0 && k < 1;
      const baseY = isTop ? 2.25 : -2.25;
      p.position.set((u.r2 - 0.5) * (isTop ? 2.6 : 0.8), baseY + k * 1.4 + (u.r3 - 0.5) * 0.8, 0.9);
      const sc = (isTop ? 0.9 : 0.6) + k * 1.2;
      p.scale.set(sc, sc, 1);
      p.material.opacity = 0.5 * Math.sin(Math.PI * k);
    });
    aim(cam, V3(0, 0, 13.2 - 0.6 * eio(seg(t, 34.4, 36.85))), V3(0, 0, 0), 34);
  }
  return { scene, cam, update };
})();

// ================================================================== shot table
const SHOTS = [
  [0, 6.2, K],
  [6.2, 9.25, CELLS],
  [9.25, 13.25, CELL],
  [13.25, 17.65, SLICE],
  [17.65, 20.75, GAS],
  [20.75, 23.95, EYE],
  [23.95, 25.85, BRAIN],
  [25.85, 32.75, K],
  [32.75, 34.4, COLD],
  [34.4, 36.85, COMPARE],
  [36.85, 1e9, K],
];

let lastT = -1;
function renderAt(t) {
  t = Math.max(0, Math.min(TOTAL, Number(t) || 0));
  if (t === lastT) return;
  lastT = t;
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  const s = shot[2];
  s.update(t);
  s.scene.updateMatrixWorld();
  renderer.render(s.scene, s.cam);
}
window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
// warm every scene once so shader compiles don't land on a render frame
for (const [a, , s] of SHOTS) {
  s.update(a + 0.01);
  renderer.compile(s.scene, s.cam);
}
renderAt(window.__hfThreeTime || 0);
window.__onionRenderAt = renderAt;
