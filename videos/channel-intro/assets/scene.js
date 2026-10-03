// Channel trailer — kinetic 3D type, the episode objects, and Pip. Seeked from HyperFrames time.
import {
  THREE, RoundedBoxGeometry, W, H, clamp, lerp, seg, eio, eo, eo5, ei, back, bounce, jiggle, rng, V3, vlerp, keys,
  makeRenderer, INK, INK_CSS, withInk, canvasTex, makeStage, makeCamera, aim, anchorTo, worldOf,
  glowTex, makeSmoke, makeStars, makeBlob, BLOB_BASE, runShots,
} from "./lib.js";
import { Font } from "./vendor/FontLoader.js";
import { TextGeometry } from "./vendor/TextGeometry.js";
import FONT_JSON from "./vendor/helvetiker_bold.js";

const TOTAL = window.TIMING.total;
const canvas = document.getElementById("gl");
const { renderer, env: ENV } = makeRenderer(canvas, { exposure: 1.05, shadows: false });
renderer.autoClear = false;
const FONT = new Font(FONT_JSON);

// ================================================================== post FX (the JJK layer, dialled to "tasteful")
const fbTex = new THREE.FramebufferTexture(W, H);
const quadCam = new THREE.Camera();
const postMat = new THREE.ShaderMaterial({
  uniforms: {
    uTex: { value: fbTex },
    uC: { value: new THREE.Vector2(0.5, 0.5) },
    uAspect: { value: W / H },
    uE: { value: 0 },
    uSwirl: { value: 0 },
    uCA: { value: 0 },
    uBlur: { value: 0 },
    uTaps: { value: 1 },
    uInv: { value: 0 },
    uDuo: { value: 0 },
    uDuoCol: { value: new THREE.Color(1, 1, 1) },
    uShake: { value: new THREE.Vector2() },
    uTime: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTex; uniform vec2 uC; uniform float uAspect; uniform float uE; uniform float uSwirl;
    uniform float uCA; uniform float uBlur; uniform int uTaps; uniform float uInv; uniform float uDuo; uniform vec3 uDuoCol;
    uniform vec2 uShake; uniform float uTime;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    vec2 warp(vec2 uv){
      vec2 d = uv - uC; d.x *= uAspect;
      float r = length(d) + 1e-4;
      float k = max(1.0 - (uE*uE)/(r*r + 0.0003), -2.0);
      vec2 s = d * k;
      float ang = uSwirl / (r*7.0 + 0.12);
      float c = cos(ang), sn = sin(ang);
      s = vec2(c*s.x - sn*s.y, sn*s.x + c*s.y);
      s.x /= uAspect;
      return uC + s;
    }
    vec3 samp(vec2 uv){ vec2 m = 1.0 - abs(fract(uv*0.5)*2.0 - 1.0); return texture2D(uTex, m).rgb; } // mirror-wrap past the edges
    void main(){
      vec2 w = warp(vUv + uShake);
      vec3 col = vec3(0.0); float n = 0.0;
      for (int i = 0; i < 12; i++){
        if (i >= uTaps) break;
        float f = uTaps > 1 ? float(i)/float(uTaps-1) : 0.0;
        vec2 base = mix(w, uC, uBlur * f * f);
        vec2 dir = base - uC;
        col.r += samp(uC + dir*(1.0 + uCA)).r;
        col.g += samp(base).g;
        col.b += samp(uC + dir*(1.0 - uCA)).b;
        n += 1.0;
      }
      col /= n;
      float l = dot(col, vec3(0.299,0.587,0.114));
      col = mix(col, 1.0 - col, uInv);
      float th = smoothstep(0.30, 0.42, mix(l, 1.0 - l, uInv));
      col = mix(col, mix(vec3(0.02,0.0,0.035), uDuoCol, th), uDuo);
      vec2 q = vUv - 0.5;
      col *= 1.0 - 0.5 * dot(q, q) * 2.4;
      col += (hash(floor(vUv*vec2(540.0,960.0)) + fract(uTime*7.31)) - 0.5) * 0.045;
      gl_FragColor = vec4(col, 1.0);
    }`,
  depthTest: false,
  depthWrite: false,
  toneMapped: false,
});
const postScene = new THREE.Scene();
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));
const IMPACTS = [
  [0.0, 0.07, "inv"],
  [1.38, 0.06, "duo"],
  [4.39, 0.07, "red"],
  [5.89, 0.06, "inv"],
  [7.06, 0.06, "duo"],
  [9.27, 0.07, "red"],
  [10.56, 0.08, "inv"], [10.64, 0.06, "duo"],
  [14.22, 0.08, "inv"], [14.3, 0.05, "red"],
  [15.25, 0.05, "duo"], [15.54, 0.05, "inv"], [15.84, 0.05, "red"], [16.56, 0.05, "duo"],
  [17.8, 0.07, "inv"],
];
const CUTS = [3.2, 4.85, 6.95, 8.18, 9.9, 11.2, 13.5, 15.1, 17.6];
function postFX(r, cam, t, center3, swirlBoost = 0, lens = 0) {
  const U = postMat.uniforms;
  let bl = 0.015;
  let ca = 0.004;
  let sw = swirlBoost;
  CUTS.forEach((c) => {
    const g = Math.exp(-Math.pow((t - c) / 0.1, 2));
    bl += 0.32 * g;
    ca += 0.025 * g;
    sw += 0.5 * g;
  });
  let inv = 0;
  let duo = 0;
  let col = [1, 1, 1];
  for (const [a, d, kind] of IMPACTS) {
    if (t >= a && t < a + d) {
      if (kind === "inv") [inv, duo, col] = [1, 0.85, [1, 1, 1]];
      else if (kind === "duo") [duo, col] = [1, [0.78, 0.4, 1.0]];
      else [duo, col] = [1, [1.0, 0.18, 0.25]];
      bl += 0.1;
      ca += 0.025;
    }
  }
  const sh = 0.003 * Math.exp(-Math.min(...IMPACTS.map(([a]) => (t >= a ? (t - a) * 8 : 99))));
  if (center3) {
    const v = center3.clone().project(cam);
    U.uC.value.set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5);
  } else U.uC.value.set(0.5, 0.52);
  U.uE.value = lens;
  U.uSwirl.value = sw;
  U.uCA.value = ca;
  U.uBlur.value = bl;
  U.uTaps.value = bl > 0.03 || ca > 0.008 ? 10 : 1;
  U.uInv.value = inv;
  U.uDuo.value = duo;
  U.uDuoCol.value.setRGB(...col);
  U.uShake.value.set(Math.sin(t * 91.7) * sh, Math.cos(t * 73.3) * sh);
  U.uTime.value = t;
  r.copyFramebufferToTexture(fbTex);
  r.render(postScene, quadCam);
}

// ================================================================== 3D type
const chrome = (c) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.85, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.6 });
function text3D(str, { size = 1, depth = 0.35, mat, letters = false, bevel = 0.04 } = {}) {
  const g = new THREE.Group();
  const mk = (s) => {
    const geo = new TextGeometry(s, { font: FONT, size, depth, curveSegments: 6, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3 });
    geo.computeBoundingBox();
    return geo;
  };
  if (!letters) {
    const geo = mk(str);
    const bb = geo.boundingBox;
    geo.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, -depth / 2);
    g.add(new THREE.Mesh(geo, mat));
    g.userData.letters = g.children;
    return g;
  }
  // per-letter meshes laid out with real advances
  let x = 0;
  const list = [];
  for (const ch of str) {
    if (ch === " ") {
      x += size * 0.35;
      continue;
    }
    const geo = mk(ch);
    const bb = geo.boundingBox;
    const w = bb.max.x - bb.min.x;
    geo.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, -depth / 2);
    const m = new THREE.Mesh(geo, mat);
    m.userData.home = V3(x + w / 2, 0, 0);
    x += w + size * 0.08;
    list.push(m);
    g.add(m);
  }
  list.forEach((m) => {
    m.userData.home.x -= x / 2;
    m.position.copy(m.userData.home);
  });
  g.userData.letters = list;
  return g;
}
// split a mesh's triangles into flying chunks (for the "blow it wide open" shatter)
function shatter(geo, mat, chunk = 18, seed = 3) {
  const ng = geo.index ? geo.toNonIndexed() : geo;
  const pos = ng.attributes.position.array;
  const nrm = ng.attributes.normal.array;
  const tris = pos.length / 9;
  const r = rng(seed);
  const pieces = [];
  for (let s = 0; s < tris; s += chunk) {
    const e = Math.min(tris, s + chunk);
    const p = pos.slice(s * 9, e * 9);
    const n = nrm.slice(s * 9, e * 9);
    const c = V3();
    for (let i = 0; i < p.length; i += 3) c.add(V3(p[i], p[i + 1], p[i + 2]));
    c.multiplyScalar(3 / p.length);
    for (let i = 0; i < p.length; i += 3) {
      p[i] -= c.x;
      p[i + 1] -= c.y;
      p[i + 2] -= c.z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(n, 3));
    const m = new THREE.Mesh(g, mat);
    m.position.copy(c);
    m.userData = { home: c.clone(), v: c.clone().normalize().multiplyScalar(4 + r() * 6).add(V3((r() - 0.5) * 3, (r() - 0.3) * 4, 2 + r() * 5)), spin: V3(r() * 10 - 5, r() * 10 - 5, r() * 10 - 5) };
    pieces.push(m);
  }
  return pieces;
}

// ================================================================== props (compact versions of the episode objects)
const onionSkin = canvasTex(512, 512, (c, w, h) => {
  const g = c.createLinearGradient(0, h, 0, 0);
  g.addColorStop(0, "#e2c09a");
  g.addColorStop(0.08, "#b04c7f");
  g.addColorStop(0.4, "#7c1d59");
  g.addColorStop(0.85, "#b8668c");
  g.addColorStop(1, "#b38a5c");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  const r = rng(5);
  for (let i = 0; i < 50; i++) {
    c.strokeStyle = r() > 0.5 ? "rgba(255,190,225,0.25)" : "rgba(60,0,35,0.2)";
    c.lineWidth = 1 + r() * 3;
    const x = (i / 50) * w;
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x + 4, h);
    c.stroke();
  }
});
const ONION = (() => {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const s = i / 40;
    const q = Math.min(s / 0.9, 1);
    let r = Math.pow(Math.sin(Math.PI * Math.pow(q, 0.82)), 0.68);
    if (s > 0.86) r = Math.max(r, 0.07 * (1 - (s - 0.86) / 0.14) + 0.012);
    pts.push(new THREE.Vector2(i === 40 ? 0 : Math.max(r, 0.001), -0.95 + s * 2.3));
  }
  return pts;
})();
const ringsTex = canvasTex(512, 512, (c, w, h) => {
  const toPx = (x, y) => [((x + 1.15) / 2.3) * w, (1 - (y + 1.0) / 2.4) * h];
  c.fillStyle = "#7d1f5b";
  c.fillRect(0, 0, w, h);
  for (let k = 0; k < 11; k++) {
    const f = 0.985 - k * 0.085;
    c.beginPath();
    ONION.forEach((p, i) => {
      const [x, y] = toPx(p.x * f, -0.15 + (p.y + 0.15) * f);
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    });
    for (let i = ONION.length - 1; i >= 0; i--) {
      const [x, y] = toPx(-ONION[i].x * f, -0.15 + (ONION[i].y + 0.15) * f);
      c.lineTo(x, y);
    }
    c.closePath();
    c.fillStyle = k === 0 ? "#c45a96" : k % 2 ? "#fbeef6" : "#f1d6e8";
    c.fill();
    c.strokeStyle = "rgba(176,70,140,0.55)";
    c.lineWidth = 3;
    c.stroke();
  }
});
function makeOnion() {
  const skin = new THREE.MeshPhysicalMaterial({ map: onionSkin, roughness: 0.35, clearcoat: 0.8 });
  const capMat = new THREE.MeshPhysicalMaterial({ map: ringsTex, roughness: 0.2, clearcoat: 1, side: THREE.DoubleSide });
  const cap = () => {
    const s = new THREE.Shape();
    s.moveTo(ONION[0].x, ONION[0].y);
    ONION.forEach((p) => s.lineTo(p.x, p.y));
    for (let i = ONION.length - 1; i >= 0; i--) s.lineTo(-ONION[i].x, ONION[i].y);
    const g = new THREE.ShapeGeometry(s, 4);
    const p = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + 1.15) / 2.3, (p.getY(i) + 1.0) / 2.4);
    return g;
  };
  const root = new THREE.Group();
  const halves = [Math.PI / 2, -Math.PI / 2].map((phi, i) => {
    const h = new THREE.Group();
    const m = new THREE.Mesh(new THREE.LatheGeometry(ONION, 40, phi, Math.PI), skin);
    withInk(m, 0.025);
    const c = new THREE.Mesh(cap(), capMat);
    if (i) c.rotation.y = Math.PI;
    h.add(m, c);
    root.add(h);
    return h;
  });
  root.halves = halves;
  return root;
}
function makeMiniHole() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  const ringTex = canvasTex(512, 512, (c, w) => {
    const m = w / 2;
    const gr = c.createRadialGradient(m, m, m * 0.42, m, m, m);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.12, "rgba(140,210,255,1)");
    gr.addColorStop(0.35, "rgba(185,110,255,0.95)");
    gr.addColorStop(0.7, "rgba(255,40,90,0.6)");
    gr.addColorStop(1, "rgba(255,40,90,0)");
    c.fillStyle = gr;
    c.fillRect(0, 0, w, w);
    c.globalCompositeOperation = "destination-out";
    c.beginPath();
    c.arc(m, m, m * 0.42, 0, Math.PI * 2);
    c.fill();
  });
  const disk = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 5.4), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  disk.rotation.x = -Math.PI / 2 + 0.35;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xb98bff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(5.5, 5.5, 1);
  g.add(halo, disk, core);
  g.disk = disk;
  return g;
}
function makeClock() {
  const g = new THREE.Group();
  const dial = canvasTex(512, 512, (c) => {
    c.fillStyle = "#fbf3df";
    c.beginPath();
    c.arc(256, 256, 250, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = INK_CSS;
    c.font = "bold 64px serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    ["XII", "III", "VI", "IX"].forEach((s, i) => {
      const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
      c.fillText(s, 256 + Math.cos(a) * 190, 256 + Math.sin(a) * 190);
    });
    c.strokeStyle = "rgba(255,255,255,0.95)";
    c.lineWidth = 6;
    const r = rng(4);
    for (let k = 0; k < 12; k++) {
      let x = 300;
      let y = 200;
      c.beginPath();
      c.moveTo(x, y);
      for (let s = 0; s < 5; s++) {
        const a = (k / 12) * 6.28 + (r() - 0.5) * 0.6;
        x += Math.cos(a) * 45;
        y += Math.sin(a) * 45;
        c.lineTo(x, y);
      }
      c.stroke();
    }
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.24, 64), new THREE.MeshPhysicalMaterial({ color: 0x8a5a2b, roughness: 0.35, clearcoat: 0.8 }));
  body.rotation.x = Math.PI / 2;
  withInk(body, 0.04);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.08, 16, 64), new THREE.MeshPhysicalMaterial({ color: 0xd9b44a, metalness: 1, roughness: 0.25 }));
  rim.position.z = 0.12;
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.9, 64), new THREE.MeshStandardMaterial({ map: dial }));
  face.position.z = 0.125;
  g.add(body, rim, face);
  const handMat = new THREE.MeshStandardMaterial({ color: INK });
  const hands = [0.5, 0.74].map((len, i) => {
    const piv = new THREE.Group();
    const m = new THREE.Mesh(new RoundedBoxGeometry(i ? 0.07 : 0.11, len, 0.04, 2, 0.02), handMat);
    m.position.y = len / 2 - 0.08;
    piv.add(m);
    piv.position.z = 0.16;
    g.add(piv);
    return piv;
  });
  g.hands = hands;
  return g;
}
function makeMagnifier() {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.11, 16, 48), new THREE.MeshPhysicalMaterial({ color: 0xd9b44a, metalness: 1, roughness: 0.25 }));
  withInk(rim, 0.02);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.78, 40), new THREE.MeshPhysicalMaterial({ color: 0xcfefff, transparent: true, opacity: 0.3, roughness: 0.02, clearcoat: 1, side: THREE.DoubleSide }));
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.3, 16), new THREE.MeshPhysicalMaterial({ color: 0x5a3220, roughness: 0.4 }));
  handle.position.y = -1.5;
  withInk(handle, 0.02);
  g.add(rim, lens, handle);
  return g;
}
function makeTruss() {
  const g = new THREE.Group();
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xd9502b, roughness: 0.35, clearcoat: 0.6, metalness: 0.3 });
  const members = [];
  const member = (a, b, r = 0.08) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 12), steel);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize());
    withInk(m, 0.02);
    m.userData = { mid: m.position.clone(), q: m.quaternion.clone() };
    g.add(m);
    members.push(m);
  };
  const n = 4;
  for (let i = 0; i < n; i++) {
    const x0 = -3 + i * 1.5;
    member(V3(x0, 0, 0), V3(x0 + 1.5, 0, 0), 0.1);
    member(V3(x0, 0, 0), V3(x0 + 0.75, 1.3, 0));
    member(V3(x0 + 0.75, 1.3, 0), V3(x0 + 1.5, 0, 0));
    if (i < n - 1) member(V3(x0 + 0.75, 1.3, 0), V3(x0 + 2.25, 1.3, 0), 0.1);
  }
  const bolts = [];
  for (let k = 0; k < 6; k++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 6), new THREE.MeshPhysicalMaterial({ color: 0x9aa0a8, metalness: 1, roughness: 0.3 }));
    b.rotation.x = Math.PI / 2;
    b.userData.home = V3(-0.2 + (k % 3) * 0.2, k < 3 ? 0.12 : -0.12, 0.12);
    b.position.copy(b.userData.home);
    g.add(b);
    bolts.push(b);
  }
  const plate = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.6, 0.08, 2, 0.03), steel);
  withInk(plate, 0.015);
  g.add(plate);
  g.members = members;
  g.bolts = bolts;
  return g;
}
function makeHardHat() {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffd23f, roughness: 0.25, clearcoat: 1 });
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.8, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), m);
  dome.scale.set(1, 0.8, 1);
  withInk(dome, 0.025);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.07, 40), m);
  withInk(brim, 0.02);
  g.add(dome, brim);
  return g;
}

// ================================================================== the one stage everything happens on
const STAGE = (() => {
  const st = makeStage(ENV, { key: 2.4, keyPos: [3, 6, 7], rim: 2.6, rimColor: 0xb98bff, hemi: 0.6, hemiSky: 0xdfe4ff, hemiGround: 0x2a1840, envI: 0.9, shadow: false });
  const { scene } = st;
  const cam = makeCamera(38);
  // painted backgrounds per section (the post pass needs an opaque frame)
  const bgTex = (c0, c1, c2) =>
    canvasTex(540, 960, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h * 0.42, 20, w / 2, h * 0.45, h * 0.75);
      g.addColorStop(0, c0);
      g.addColorStop(0.55, c1);
      g.addColorStop(1, c2);
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
      c.fillStyle = "rgba(255,255,255,0.05)";
      for (let y = 0; y < h; y += 18) for (let x = (y / 18) % 2 ? 9 : 0; x < w; x += 18) c.fillRect(x, y, 3, 3);
    });
  const BG = {
    why: bgTex("#3b1f6e", "#170c33", "#07040f"),
    onion: bgTex("#7a2a5e", "#2a0d2e", "#0b0410"),
    hole: bgTex("#1a0f33", "#06030d", "#000000"),
    mystery: bgTex("#1d4f4b", "#0c1f2a", "#04080c"),
    bridge: bgTex("#a8492a", "#3a1410", "#0d0405"),
    pip: bgTex("#4b2a8f", "#1d1040", "#08051a"),
  };
  scene.background = BG.why;
  const purple = chrome(0xb89cff);
  const gold = chrome(0xffd23f);
  const white = chrome(0xf2f0ff);
  // S1 — WHY?
  const why = text3D("WHY?", { size: 1.25, depth: 0.5, mat: purple, letters: true, bevel: 0.06 });
  scene.add(why);
  // S2 — onion
  const onion = makeOnion();
  scene.add(onion);
  const tears = makeSmoke(14, 0x7fd6ff, 9, 1, true, glowTex);
  tears.forEach((s) => scene.add(s));
  // S3 — black hole + text that gets swallowed by the swirl
  const hole = makeMiniHole();
  scene.add(hole);
  const bhText = text3D("BLACK HOLE", { size: 0.5, depth: 0.22, mat: white, letters: true });
  scene.add(bhText);
  // S4 — mystery
  const clock = makeClock();
  const mag = makeMagnifier();
  scene.add(clock, mag);
  // S5 — bridge
  const truss = makeTruss();
  scene.add(truss);
  // S6+ — Pip
  const pip = makeBlob({ sprout: true });
  pip.base = { blush: 0.9 };
  scene.add(pip.root);
  const pipText = text3D("PIP", { size: 1.5, depth: 0.6, mat: gold, letters: true, bevel: 0.07 });
  scene.add(pipText);
  // S7/S8 — the question mark that explodes
  const qGeo = new TextGeometry("?", { font: FONT, size: 2.6, depth: 0.7, curveSegments: 8, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 3 });
  qGeo.computeBoundingBox();
  qGeo.translate(-(qGeo.boundingBox.max.x + qGeo.boundingBox.min.x) / 2, -(qGeo.boundingBox.max.y + qGeo.boundingBox.min.y) / 2, -0.35);
  qGeo.computeVertexNormals();
  const qMat = chrome(0xff5aa0);
  const qPieces = shatter(qGeo, qMat, 14, 5);
  const qGroup = new THREE.Group();
  qPieces.forEach((p) => qGroup.add(p));
  scene.add(qGroup);
  // S9 — orbiting topic icons
  const icons = [makeOnion(), makeMiniHole(), makeMagnifier(), makeHardHat()];
  icons[0].scale.setScalar(0.45);
  icons[1].scale.setScalar(0.32);
  icons[2].scale.setScalar(0.42);
  icons[3].scale.setScalar(0.55);
  icons.forEach((i) => scene.add(i));
  // S10 — subscribe button
  const btnTex = canvasTex(1024, 256, (c) => {
    c.fillStyle = "#ff2d55";
    c.fillRect(0, 0, 1024, 256);
    c.fillStyle = "#ffffff";
    c.font = "bold 150px Fredoka, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("SUBSCRIBE", 512, 140);
  });
  const btn = new THREE.Group();
  const btnBody = new THREE.Mesh(new RoundedBoxGeometry(4.2, 1.05, 0.6, 4, 0.25), new THREE.MeshPhysicalMaterial({ color: 0xff2d55, roughness: 0.3, clearcoat: 1 }));
  withInk(btnBody, 0.04);
  const btnFace = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 0.975), new THREE.MeshStandardMaterial({ map: btnTex, roughness: 0.35, emissive: 0xffffff, emissiveMap: btnTex, emissiveIntensity: 0.25 }));
  btnFace.position.z = 0.305;
  btn.add(btnBody, btnFace);
  scene.add(btn);
  const stars = makeStars(22, 6);
  stars.forEach((s) => scene.add(s));
  const bits = makeSmoke(40, 0xffffff, 12, 0.8, true, glowTex);
  bits.forEach((b) => scene.add(b));

  const ALL = [why, onion, hole, bhText, clock, mag, truss, pip.root, pipText, qGroup, btn, ...icons];
  function update(t) {
    ALL.forEach((o) => (o.visible = false));
    tears.forEach((s) => (s.visible = false));
    stars.forEach((s) => (s.visible = false));
    let camP = V3(0, 0, 9);
    let look = V3(0, 0, 0);
    let fov = 38;
    let roll = 0;
    let swirl = 0;
    let lens = 0;
    let center = null;
    // ambient floating particles everywhere
    bits.forEach((b) => {
      const u = b.userData;
      b.position.set((u.r1 - 0.5) * 14, ((u.r2 * 12 + t * (0.3 + u.r3)) % 12) - 6, -3 - u.r4 * 8);
      const s = 0.04 + u.r3 * 0.08;
      b.scale.set(s, s, 1);
    });
    scene.background = t < 3.2 ? BG.why : t < 4.85 ? BG.onion : t < 6.95 ? BG.hole : t < 8.18 ? BG.mystery : t < 9.9 ? BG.bridge : BG.pip;
    if (t < 3.2) {
      // ---------------- WHY? letters crash in out of the dark
      why.visible = true;
      why.userData.letters.forEach((m, i) => {
        const t0 = 0.12 + i * 0.13;
        const k = eo5(seg(t, t0, t0 + 0.4));
        m.position.copy(m.userData.home).add(V3(0, 0, lerp(-30, 0, k)));
        m.rotation.set(lerp(-2.5, 0, k) + Math.sin(t * 2 + i) * 0.06, lerp(i % 2 ? 2 : -2, 0, k) + Math.sin(t * 1.4 + i) * 0.1, 0);
        m.scale.setScalar(1 + jiggle(t, t0 + 0.4, 0.25, 22, 7));
      });
      why.rotation.y = Math.sin(t * 0.8) * 0.25;
      why.position.y = 0.6;
      // "things work the way they do": letters scatter apart
      const out = ei(seg(t, 2.75, 3.2));
      why.userData.letters.forEach((m, i) => m.position.add(V3((i - 1.5) * out * 6, (i % 2 ? 1 : -1) * out * 3, out * 6)));
      const k = eio(seg(t, 0, 3.2));
      camP = vlerp(V3(0, 0.4, 13.5), V3(0.8, 0.9, 11.8), k);
      look = V3(0, 0.5, 0);
      roll = lerp(0.12, -0.05, k);
    } else if (t < 4.85) {
      // ---------------- onions
      onion.visible = true;
      const k = eo5(seg(t, 3.2, 3.6));
      onion.position.set(0, lerp(6, 0.4, k), 0);
      onion.rotation.set(0.2, t * 3, lerp(1, 0, k));
      const split = eo(seg(t, 4.39, 4.7));
      onion.halves[0].position.z = -split * 0.9;
      onion.halves[1].position.z = split * 0.9;
      onion.halves[0].rotation.x = -split * 0.5;
      onion.halves[1].rotation.x = split * 0.5;
      tears.forEach((s) => {
        const u = s.userData;
        const a = t - 4.4 - u.r1 * 0.2;
        s.visible = a > 0;
        s.position.set((u.r2 - 0.5) * 2 + (u.r2 - 0.5) * a * 6, 0.6 + a * 4 - a * a * 9, (u.r3 - 0.5) * 2 + a * 3);
        const sc = 0.25 + u.r4 * 0.2;
        s.scale.set(sc, sc * 1.3, 1);
      });
      camP = vlerp(V3(-1.4, 1.0, 6.0), V3(-0.6, 0.6, 5.0), eio(seg(t, 3.2, 4.85)));
      look = V3(0, 0.4, 0);
      roll = 0.08;
    } else if (t < 6.95) {
      // ---------------- black hole: the text gets swallowed by the swirl
      hole.visible = true;
      bhText.visible = true;
      hole.position.set(0, 0.3, 0);
      hole.disk.rotation.z = -t * 2.5;
      hole.scale.setScalar(back(seg(t, 4.85, 5.2)) * 0.9);
      bhText.position.set(0, -1.75, 0.6);
      bhText.userData.letters.forEach((m, i) => {
        const pull = ei(seg(t, 5.9 + i * 0.04, 6.85));
        const a = Math.atan2(m.userData.home.y + 2.5, m.userData.home.x);
        m.position.copy(m.userData.home).lerp(V3(0, 2.5, -0.5), pull);
        m.rotation.set(0, 0, pull * 6 + a);
        m.scale.setScalar(Math.max(0.001, 1 - pull));
      });
      center = hole.position;
      swirl = 0.4 + 2.2 * ei(seg(t, 5.8, 6.9));
      lens = 0.05 + 0.05 * seg(t, 5.8, 6.9);
      const k = eio(seg(t, 4.85, 6.95));
      camP = vlerp(V3(0.5, 1.8, 8.5), V3(0, 1.0, 6.8), k);
      look = V3(0, -0.2, 0);
      roll = -0.06 + k * 0.12;
    } else if (t < 8.18) {
      // ---------------- whodunit
      clock.visible = true;
      mag.visible = true;
      clock.position.set(0, 0.4, 0);
      clock.rotation.set(0.15, Math.sin(t * 2) * 0.2, 0);
      clock.scale.setScalar(1.3 * back(seg(t, 6.95, 7.25)));
      clock.hands[0].rotation.z = -t * 0.5;
      clock.hands[1].rotation.z = -t * 6;
      const sweep = eio(seg(t, 7.0, 8.0));
      mag.position.set(lerp(-2.6, 1.6, sweep), lerp(-1.4, 0.9, sweep) + Math.sin(sweep * Math.PI) * 0.6, 1.3);
      mag.rotation.set(0, 0, lerp(0.6, -0.4, sweep));
      camP = V3(0.4, 0.5, 6.4);
      look = V3(0, 0.3, 0);
      roll = Math.sin(t * 3) * 0.04;
    } else if (t < 9.9) {
      // ---------------- bridges fall
      truss.visible = true;
      truss.position.set(0, -0.3, 0);
      truss.rotation.set(0.15, -0.35 + Math.sin(t) * 0.05, 0);
      const brk = seg(t, 9.25, 9.9);
      truss.members.forEach((m, i) => {
        const u = m.userData;
        const a = Math.max(0, t - 9.25 - (i % 5) * 0.03);
        m.position.copy(u.mid).add(V3((i % 3 - 1) * a * 1.5, -4 * a * a + a * (i % 2), a * (i % 4) * 0.4));
        m.quaternion.copy(u.q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(a * (i % 3), a * 2, a * (i % 5))));
      });
      truss.bolts.forEach((b, k) => {
        const a = Math.max(0, t - 8.9 - k * 0.06);
        b.position.copy(b.userData.home).add(V3((k - 2.5) * a * 2, a * 3 - a * a * 6, a * 4));
        b.rotation.set(Math.PI / 2 + a * 9, a * 7, 0);
      });
      camP = vlerp(V3(1.5, 1.4, 6.0), V3(0.6, 0.8, 4.8), eio(seg(t, 8.18, 9.9)));
      look = V3(0, 0.2, 0);
      roll = -0.07 + jiggle(t, 9.25, 0.12, 20, 6);
    } else {
      // ---------------- Pip's world (9.9 → end)
      pip.root.visible = true;
      const land = seg(t, 10.35, 10.56);
      pip.root.position.set(0, lerp(9, 0, ei(land)), 0);
      pip.root.rotation.set(0, Math.sin(t * 0.9) * 0.2, 0);
      const sq = jiggle(t, 10.56, 0.32, 18, 6);
      let armL = 0.4;
      let armR = 0.4;
      let face = { time: t, mouth: "grin", eyes: "open", blush: 1 };
      if (t < 10.56) face = { time: t, mouth: "o", wide: 1 };
      // PIP letters burst up behind
      pipText.visible = t > 10.5 && t < 11.3;
      pipText.position.set(0, 3.2, -3.2);
      pipText.userData.letters.forEach((m, i) => {
        const k = eo5(seg(t, 10.56 + i * 0.06, 10.9 + i * 0.06));
        m.position.copy(m.userData.home).add(V3(0, lerp(-4, 0, k), 0));
        m.rotation.set(lerp(1.5, 0, k), Math.sin(t * 2 + i) * 0.15, 0);
      });
      // the question mark
      qGroup.visible = t > 11.2 && t < 15.3;
      const qin = eo5(seg(t, 11.3, 11.7));
      qGroup.position.set(0, lerp(7, 2.9, qin), -1.2);
      qGroup.rotation.set(0, (t - 11.3) * 1.8, Math.sin(t * 2) * 0.1);
      const boom = seg(t, 14.22, 15.3);
      qPieces.forEach((p) => {
        const u = p.userData;
        p.position.copy(u.home).addScaledVector(u.v, eo(boom) * 1.4);
        p.rotation.set(u.spin.x * boom, u.spin.y * boom, u.spin.z * boom);
      });
      if (t > 11.2 && t < 14.3) {
        armR = 2.4 + Math.sin(t * 4) * 0.15;
        face = { time: t, mouth: "o", lookY: -0.8, lookX: 0.2, wide: 0.4 };
      }
      if (t >= 14.2 && t < 15.1) face = { time: t, mouth: "grin", eyes: "happy", blush: 1 };
      // orbiting topic icons
      const orb = t > 15.1 && t < 17.7;
      const words = [15.25, 15.54, 15.84, 16.56];
      icons.forEach((ic, i) => {
        ic.visible = orb;
        if (!orb) return;
        const a = (i / 4) * Math.PI * 2 + (t - 15.1) * 1.6;
        const hit = jiggle(t, words[i], 0.6, 16, 5);
        const s0 = [0.45, 0.32, 0.42, 0.55][i];
        ic.position.set(Math.cos(a) * 3.0, 1.0 + Math.sin(a * 2) * 0.4 + (i % 2) * 0.7, Math.sin(a) * 0.9 - 0.4);
        ic.scale.setScalar(s0 * back(seg(t, 15.1 + i * 0.06, 15.4 + i * 0.06)) * (1 + Math.max(0, hit)));
        ic.rotation.set(0.3, t * 2 + i, 0);
        if (ic.disk) ic.disk.rotation.z = -t * 3;
      });
      // subscribe
      btn.visible = t > 17.55;
      const bin = eo5(seg(t, 17.55, 17.85));
      const press = Math.sin(Math.PI * seg(t, 17.8, 18.05));
      btn.position.set(0, lerp(-6, -0.75, bin), 1.5);
      btn.scale.set(0.78, 0.78 * (1 - press * 0.25), 0.78 * (1 - press * 0.4));
      btn.rotation.set(-0.15, Math.sin(t * 1.2) * 0.12, 0);
      if (t > 17.6) {
        armR = lerp(0.4, 1.0, seg(t, 17.6, 17.8)) + press * 0.3;
        armL = 0.4 + Math.sin(t * 6) * 0.2 * seg(t, 18.5, 19);
        face = { time: t, mouth: "grin", eyes: t > 18.3 && t < 18.6 ? "happy" : "open", wink: t > 19.5, blush: 1 };
      }
      pip.pose({ t, sq: sq + (t > 17.75 && t < 18.1 ? press * 0.12 : 0), armL, armR, hop: t > 18.6 ? Math.abs(Math.sin(t * 5)) * 0.15 : 0 });
      pip.setFace(face);
      stars.forEach((s) => {
        const u = s.userData;
        const per = 1.2;
        const k = ((t - 10.5 + u.r1 * per) % per) / per;
        s.visible = t > 10.56;
        const a = u.r2 * Math.PI * 2;
        s.position.set(Math.cos(a) * (1.6 + u.r3 * 1.5), 1 + Math.sin(a) * 1.6, 0.6 + u.r3);
        const sc = 0.22 * Math.sin(Math.PI * k);
        s.scale.set(sc, sc, 1);
        s.material.rotation = k * 3;
      });
      // camera
      if (t < 11.2) {
        camP = vlerp(V3(0, 1.4, 6.0), V3(0, 1.9, 7.4), eo(seg(t, 10.56, 11.2)));
        look = V3(0, 1.3, 0);
        roll = jiggle(t, 10.56, 0.2, 18, 6);
      } else if (t < 15.1) {
        const k = eio(seg(t, 11.2, 15.1));
        camP = vlerp(V3(1.8, 1.0, 7.0), V3(-1.2, 1.4, 7.8), k);
        look = V3(0, 1.6, 0);
        roll = 0.06 * Math.sin(t * 1.3);
        if (t > 14.2) camP.add(V3(0, 0, eo(seg(t, 14.22, 14.8)) * 1.6));
        center = qGroup.position;
        swirl = 0.9 * Math.exp(-Math.pow((t - 14.25) / 0.25, 2));
      } else if (t < 17.6) {
        const a = (t - 15.1) * 0.5;
        camP = V3(Math.sin(a) * 7.2, 1.6, Math.cos(a) * 7.2);
        look = V3(0, 1.0, 0);
        roll = 0.08 * Math.sin(t * 2);
      } else {
        camP = vlerp(V3(0, 1.0, 10.2), V3(0, 0.9, 9.2), eio(seg(t, 17.6, TOTAL)));
        look = V3(0, 0.45, 0);
        roll = jiggle(t, 17.8, 0.12, 18, 6);
      }
    }
    [3.2, 4.85, 6.95, 8.18, 9.9, 11.2, 15.1, 17.6].forEach((c) => (roll += jiggle(t, c, 0.18, 16, 7)));
    aim(cam, camP, look, fov, roll);
    scene.userData.fx = { center, swirl, lens };
    scene.updateMatrixWorld();
    anchorTo("pip-anchor", pip.headWorld(1.3), cam);
  }
  function render(r, t) {
    r.clear();
    r.render(scene, cam);
    const fx = scene.userData.fx;
    postFX(r, cam, t, fx.center, fx.swirl, fx.lens);
  }
  return { scene, cam, update, render };
})();

runShots(renderer, [[0, 1e9, STAGE]], TOTAL);
