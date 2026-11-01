// @ts-nocheck
// Shared toolkit for the Pip-style shorts: seekable math, renderer, toon ink, canvas textures,
// DOM anchoring, sprites, and the blob-character rig with a 2D face painted on a 3D body.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

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

