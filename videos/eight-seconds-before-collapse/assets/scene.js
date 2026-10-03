// "The 8 seconds before everything collapsed" — disaster reconstruction #1. 3D layer, seeked from time.
import {
  THREE, RoundedBoxGeometry, W, H, clamp, lerp, seg, eio, eo, eo5, ei, back, bounce, jiggle, rng, V3, vlerp,
  makeRenderer, INK, INK_CSS, withInk, inkMat, canvasTex, makeStage, makeCamera, aim, anchorTo, worldOf,
  glowTex, smokeTex, makeSmoke, makeBlob, BLOB_BASE, runShots,
} from "./lib.js";

const TOTAL = window.TIMING.total;
const canvas = document.getElementById("gl");
const { renderer, env: ENV } = makeRenderer(canvas, { exposure: 1.0 });

const FOCAL = V3(-1.5, 0, 1.0); // the joint where it all starts (front truss, bottom chord)
const COLLAPSE = 34.15;

// ================================================================== textures
const rockTex = canvasTex(512, 512, (c, w, h) => {
  const r = rng(6);
  const bands = ["#c9773e", "#b4602f", "#d98b4c", "#a8552a", "#cf8045", "#9b4b25"];
  let y = 0;
  let i = 0;
  while (y < h) {
    const bh = 20 + r() * 50;
    c.fillStyle = bands[i++ % bands.length];
    c.beginPath();
    c.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) c.lineTo(x, y + Math.sin(x * 0.02 + i) * 6);
    c.lineTo(w, y + bh);
    c.lineTo(0, y + bh);
    c.fill();
    y += bh;
  }
  c.fillStyle = "rgba(60,25,10,0.18)";
  for (let k = 0; k < 120; k++) c.fillRect(r() * w, r() * h, 3 + r() * 14, 2 + r() * 4);
}, { repeat: true });
const waterTex = canvasTex(512, 512, (c, w, h) => {
  c.fillStyle = "#2c8fb8";
  c.fillRect(0, 0, w, h);
  const r = rng(8);
  c.strokeStyle = "rgba(220,250,255,0.55)";
  c.lineCap = "round";
  for (let k = 0; k < 60; k++) {
    const x = r() * w;
    const y = r() * h;
    const l = 20 + r() * 50;
    c.lineWidth = 3 + r() * 4;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + l / 2, y - 6, x + l, y);
    c.stroke();
  }
}, { repeat: true });
waterTex.repeat.set(6, 6);
const grassTex = canvasTex(256, 256, (c, w) => {
  c.fillStyle = "#6cbf4a";
  c.fillRect(0, 0, w, w);
  const r = rng(3);
  for (let k = 0; k < 300; k++) {
    c.fillStyle = r() > 0.5 ? "#5aa83c" : "#82d15e";
    c.fillRect(r() * w, r() * w, 3, 6);
  }
}, { repeat: true });

// gusset plate with a crack that grows (redrawn per frame in the crack shot)
const plateCanvas = document.createElement("canvas");
plateCanvas.width = plateCanvas.height = 512;
const plateCtx = plateCanvas.getContext("2d");
const plateTex = new THREE.CanvasTexture(plateCanvas);
plateTex.colorSpace = THREE.SRGBColorSpace;
const CRACK = (() => {
  const r = rng(12);
  const pts = [[250, 250]];
  let x = 250;
  let y = 250;
  let a = -0.6;
  for (let i = 0; i < 26; i++) {
    a += (r() - 0.5) * 0.9;
    x += Math.cos(a) * 16;
    y += Math.sin(a) * 16 - 4;
    pts.push([x, y]);
  }
  const br = [];
  for (let i = 0; i < 5; i++) {
    const s = 4 + Math.floor(r() * 18);
    const b = [pts[s]];
    let bx = pts[s][0];
    let by = pts[s][1];
    let ba = (r() - 0.5) * 3;
    for (let k = 0; k < 6; k++) {
      ba += (r() - 0.5) * 0.8;
      bx += Math.cos(ba) * 12;
      by += Math.sin(ba) * 12;
      b.push([bx, by]);
    }
    br.push({ s, b });
  }
  return { pts, br };
})();
function drawPlate(crack, rust = 0) {
  const c = plateCtx;
  const g = c.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, "#d65a32");
  g.addColorStop(1, "#b9462a");
  c.fillStyle = g;
  c.fillRect(0, 0, 512, 512);
  if (rust > 0) {
    const r = rng(77);
    for (let k = 0; k < 90; k++) {
      c.fillStyle = `rgba(${110 + r() * 40},${50 + r() * 20},20,${0.35 * rust})`;
      c.beginPath();
      c.arc(r() * 512, r() * 512, 4 + r() * 22, 0, Math.PI * 2);
      c.fill();
    }
  }
  if (crack > 0) {
    const n = Math.floor(crack * (CRACK.pts.length - 1));
    const glow = (w, col) => {
      c.strokeStyle = col;
      c.lineWidth = w;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.beginPath();
      CRACK.pts.slice(0, n + 1).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.stroke();
      CRACK.br.forEach(({ s, b }) => {
        if (s > n) return;
        const m = Math.min(b.length, Math.floor((n - s) / 2) + 1);
        c.beginPath();
        b.slice(0, m).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.stroke();
      });
    };
    glow(22, "rgba(255,90,40,0.45)");
    glow(9, INK_CSS);
    glow(3, "#ffd8a0");
  }
  plateTex.needsUpdate = true;
}
drawPlate(0);

// ================================================================== the engineer
function makeEngineer() {
  const e = makeBlob({ color: 0xff9a2e, sheen: 0xffe2b8 });
  e.base = { blush: 0.8 };
  const hatMat = new THREE.MeshPhysicalMaterial({ color: 0xffd23f, roughness: 0.25, clearcoat: 1 });
  const hat = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.78, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), hatMat);
  dome.scale.set(1, 0.75, 1);
  withInk(dome, 0.025);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.06, 48), hatMat);
  brim.scale.set(1, 1, 1.12);
  brim.position.set(0, 0.02, 0.06);
  withInk(brim, 0.02);
  const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 10, 32, Math.PI), hatMat);
  ridge.rotation.y = Math.PI / 2;
  ridge.scale.set(1, 1.1, 1);
  hat.add(dome, brim, ridge);
  hat.position.y = BLOB_BASE + 0.74;
  hat.rotation.x = -0.12;
  e.squash.add(hat);
  // hi-vis vest stripes
  const stripeMat = new THREE.MeshPhysicalMaterial({ color: 0xe8eef2, metalness: 0.6, roughness: 0.25, emissive: 0x9aa4ad, emissiveIntensity: 0.3 });
  for (const y of [-0.42, -0.62]) {
    const s = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.045, 10, 64), stripeMat);
    s.rotation.x = Math.PI / 2;
    s.position.y = BLOB_BASE + y;
    s.scale.set(1.04 + (y < -0.5 ? 0.05 : 0), 1.0, 1.0);
    e.squash.add(s);
  }
  // clipboard
  const board = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.56, 0.04, 2, 0.03), new THREE.MeshPhysicalMaterial({ color: 0x8a5a2b }));
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.42), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  paper.position.z = 0.025;
  board.add(paper);
  withInk(board, 0.01);
  board.position.set(0, -0.72, 0.18);
  board.rotation.x = -0.3;
  e.arms[-1].add(board);
  e.hat = hat;
  return e;
}

// ================================================================== the world + bridge
const WORLD = (() => {
  const st = makeStage(ENV, { key: 2.6, keyColor: 0xfff2dc, keyPos: [6, 12, 9], rim: 1.4, hemi: 0.75, hemiSky: 0xcfe8ff, hemiGround: 0x6a4a2a, envI: 0.6, shadowSize: 12 });
  const { scene } = st;
  const cam = makeCamera(40);
  // cliffs
  const rockMat = new THREE.MeshPhysicalMaterial({ map: rockTex, roughness: 0.85 });
  rockTex.repeat.set(2, 3);
  const cliffs = [];
  for (const sx of [-1, 1]) {
    const c = new THREE.Mesh(new RoundedBoxGeometry(10, 14, 16, 4, 0.6), rockMat);
    c.position.set(sx * (6 + 5), -7.2, 0);
    c.receiveShadow = true;
    c.castShadow = true;
    withInk(c, 0.05);
    scene.add(c);
    const top = new THREE.Mesh(new RoundedBoxGeometry(10.2, 0.4, 16.2, 3, 0.15), new THREE.MeshPhysicalMaterial({ map: grassTex, roughness: 0.9 }));
    top.position.set(sx * 11, -0.05, 0);
    top.receiveShadow = true;
    scene.add(top);
    cliffs.push(c);
    // trees
    const r = rng(sx > 0 ? 3 : 9);
    for (let k = 0; k < 6; k++) {
      const x = sx * (7.5 + r() * 7);
      const z = -6 + r() * 4 - (k % 2) * 3;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.0, 10), new THREE.MeshStandardMaterial({ color: 0x7a4a2a }));
      trunk.position.set(x, 0.5, z);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + r() * 0.5, 2), new THREE.MeshPhysicalMaterial({ color: r() > 0.5 ? 0x3f9f4a : 0x58b84e, roughness: 0.7, flatShading: true }));
      crown.position.set(x, 1.6 + r() * 0.4, z);
      crown.castShadow = true;
      withInk(crown, 0.03);
      scene.add(trunk, crown);
    }
  }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(14, 60), new THREE.MeshPhysicalMaterial({ map: waterTex, roughness: 0.1, clearcoat: 1, color: 0xbfefff }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = -9;
  scene.add(water);

  // ---- the truss bridge
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xd9502b, roughness: 0.35, clearcoat: 0.6, metalness: 0.3 });
  const xrayBase = new THREE.MeshBasicMaterial({ color: 0x5fe0ff, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false });
  const members = [];
  const N = 8;
  const L = 12;
  const dx = L / N;
  const topY = 1.7;
  const nodeB = (i, z) => V3(-L / 2 + i * dx, 0, z);
  const nodeT = (i, z) => V3(-L / 2 + (i + 0.5) * dx, topY, z);
  function member(a, b, r = 0.07, kind = "truss") {
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), steel);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize());
    m.castShadow = true;
    withInk(m, 0.02);
    const xm = xrayBase.clone();
    m.userData = { a: a.clone(), b: b.clone(), mid: m.position.clone(), q: m.quaternion.clone(), kind, xm, steel, d: m.position.distanceTo(FOCAL) };
    scene.add(m);
    members.push(m);
    return m;
  }
  for (const z of [-1, 1]) {
    for (let i = 0; i < N; i++) {
      member(nodeB(i, z), nodeB(i + 1, z), 0.09, "chord");
      member(nodeB(i, z), nodeT(i, z));
      member(nodeT(i, z), nodeB(i + 1, z));
      if (i < N - 1) member(nodeT(i, z), nodeT(i + 1, z), 0.09, "chord");
    }
  }
  for (let i = 0; i < N; i++) member(nodeT(i, -1), nodeT(i, 1), 0.05, "brace");
  for (let i = 0; i <= N; i++) member(nodeB(i, -1), nodeB(i, 1), 0.06, "floor");
  // deck panels (one per bay)
  const deckMat = new THREE.MeshPhysicalMaterial({ color: 0x8b6a4a, roughness: 0.6 });
  const decks = [];
  for (let i = 0; i < N; i++) {
    const d = new THREE.Mesh(new RoundedBoxGeometry(dx - 0.04, 0.14, 1.9, 2, 0.03), deckMat);
    d.position.set(-L / 2 + (i + 0.5) * dx, 0.08, 0);
    d.castShadow = true;
    d.receiveShadow = true;
    withInk(d, 0.015);
    d.userData = { home: d.position.clone(), d: d.position.distanceTo(FOCAL), i };
    scene.add(d);
    decks.push(d);
  }
  // gusset plates with bolts at the front bottom nodes
  const boltMat = new THREE.MeshPhysicalMaterial({ color: 0x8a8f99, metalness: 1, roughness: 0.3 });
  const boltGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.07, 6);
  const plates = [];
  let focalPlate = null;
  const focalBolts = [];
  for (let i = 0; i <= N; i++) {
    const p = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.48, 0.04, 2, 0.02), i === 3 ? new THREE.MeshPhysicalMaterial({ map: plateTex, roughness: 0.4, clearcoat: 0.5 }) : steel);
    const at = nodeB(i, 1.0);
    p.position.set(at.x, at.y + 0.12, at.z + 0.1);
    withInk(p, 0.012);
    scene.add(p);
    plates.push(p);
    for (let k = 0; k < 6; k++) {
      const b = new THREE.Mesh(boltGeo, boltMat);
      b.rotation.x = Math.PI / 2;
      b.position.set(-0.2 + (k % 3) * 0.2, k < 3 ? 0.11 : -0.07, 0.04);
      p.add(b);
      if (i === 3) focalBolts.push(b);
    }
    if (i === 3) focalPlate = p;
  }
  // engineer
  const eng = makeEngineer();
  eng.root.scale.setScalar(0.42);
  scene.add(eng.root);
  // birds (2D-ish gliding V shapes)
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x2a2440, side: THREE.DoubleSide });
  const birds = Array.from({ length: 5 }, (_, i) => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.06), birdMat);
      w.position.x = s * 0.16;
      w.userData.s = s;
      g.add(w);
    }
    scene.add(g);
    return g;
  });
  // load pulses + dust + splashes
  const pulses = Array.from({ length: 40 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb02e, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(s);
    return s;
  });
  const dust = makeSmoke(36, 0xd9b38a, 31, 0.85);
  dust.forEach((d) => scene.add(d));
  const splash = makeSmoke(16, 0xffffff, 41, 0.9);
  splash.forEach((d) => scene.add(d));
  const sparks = makeSmoke(24, 0xffc060, 51, 1, true, glowTex);
  sparks.forEach((d) => scene.add(d));
  const pr = rng(5);
  const pulseInfo = pulses.map(() => ({ m: Math.floor(pr() * members.length), o: pr(), sp: 0.6 + pr() }));
  const fallInfo = new Map();
  const fr = rng(17);
  [...members, ...decks].forEach((o) => fallInfo.set(o, { v: V3((fr() - 0.5) * 1.5, fr() * 1.5, (fr() - 0.5) * 1.5), spin: V3((fr() - 0.5) * 4, (fr() - 0.5) * 4, (fr() - 0.5) * 4), delay: fr() * 0.25 }));
  // the one beam that survives (left end), the engineer will dangle from it
  const SURVIVOR = members.find((m) => m.userData.kind === "chord" && Math.abs(m.userData.a.x + 6) < 0.01 && m.userData.a.y === 0 && m.userData.a.z === 1);

  const xrayCol = new THREE.Color();
  function setXray(on, t, heat) {
    members.forEach((m) => {
      const u = m.userData;
      if (on) {
        m.material = u.xm;
        const h = clamp(heat(u.d, t));
        xrayCol.setRGB(lerp(0.37, 1.0, h), lerp(0.88, 0.25 + 0.3 * (1 - h), h), lerp(1.0, 0.1, h));
        u.xm.color.copy(xrayCol);
        m.children[0].visible = false;
      } else {
        m.material = u.steel;
        m.children[0].visible = true;
      }
    });
    decks.forEach((d) => {
      d.material = on ? xrayDeck : deckMat;
      d.children[0].visible = !on;
    });
    cliffs.forEach((c) => (c.material = on ? xrayRock : rockMat));
    water.visible = !on;
  }
  const xrayDeck = new THREE.MeshBasicMaterial({ color: 0x1d4f8a, transparent: true, opacity: 0.35, depthWrite: false });
  const xrayRock = new THREE.MeshBasicMaterial({ color: 0x0f2a52, transparent: true, opacity: 0.5 });

  function resetBridge() {
    members.forEach((m) => {
      m.position.copy(m.userData.mid);
      m.quaternion.copy(m.userData.q);
      m.visible = true;
    });
    decks.forEach((d) => {
      d.position.copy(d.userData.home);
      d.rotation.set(0, 0, 0);
      d.visible = true;
    });
    plates.forEach((p) => (p.visible = true));
  }
  function collapse(t) {
    // progressive failure: pieces near the focal joint go first, then the wave runs outward
    const g = 9.8 * 0.55;
    const fall = (o, d) => {
      const fi = fallInfo.get(o);
      const tb = COLLAPSE + d * 0.16 + fi.delay;
      if (t < tb) return false;
      const a = t - tb;
      return { a, fi };
    };
    let lowest = 0;
    members.forEach((m) => {
      if (m === SURVIVOR) return;
      const u = m.userData;
      if (u.a.x < -5.9 && u.b.x < -4.4 && u.kind !== "floor") return; // the left-most bay hangs on (except survivor logic)
      const f = fall(m, u.d);
      if (!f) return;
      m.position.copy(u.mid).addScaledVector(f.fi.v, f.a).add(V3(0, -0.5 * g * f.a * f.a, 0));
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(f.fi.spin.x * f.a, f.fi.spin.y * f.a, f.fi.spin.z * f.a));
      m.quaternion.copy(u.q).premultiply(q);
      m.visible = m.position.y > -9.5;
      lowest = Math.min(lowest, m.position.y);
    });
    decks.forEach((d) => {
      const f = fall(d, d.userData.d);
      if (!f) return;
      d.position.copy(d.userData.home).addScaledVector(f.fi.v, f.a * 0.6).add(V3(0, -0.5 * g * f.a * f.a, 0));
      d.rotation.set(f.fi.spin.x * f.a * 0.5, 0, f.fi.spin.z * f.a * 0.6);
      d.visible = d.position.y > -9.5;
    });
    plates.forEach((p, i) => {
      if (i === 0) return;
      const d = p.position.distanceTo(FOCAL);
      p.visible = t < COLLAPSE + d * 0.16;
    });
    // the survivor swings down and hangs from the cliff
    if (SURVIVOR) {
      const u = SURVIVOR.userData;
      const k = clamp((t - (COLLAPSE + 0.9)) / 0.9);
      const ang = -(Math.PI / 2 - 0.25) * bounce(k);
      const piv = u.a;
      const dir = V3(1, 0, 0).applyAxisAngle(V3(0, 0, 1), ang);
      const len = u.a.distanceTo(u.b);
      SURVIVOR.position.copy(piv).addScaledVector(dir, len / 2);
      SURVIVOR.quaternion.setFromUnitVectors(V3(0, 1, 0), dir);
    }
  }
  function survivorTip() {
    const u = SURVIVOR.userData;
    const dir = V3(0, 1, 0).applyQuaternion(SURVIVOR.quaternion);
    return SURVIVOR.position.clone().addScaledVector(dir, u.a.distanceTo(u.b) / 2);
  }

  function update(t) {
    resetBridge();
    water.material.map.offset.set(0, -t * 0.05);
    // ---- x-ray windows + heat (stress spreading from the focal joint)
    const xray = (t >= 9.3 && t < 16.9) || (t >= 20.1 && t < 33.4);
    const heat = (d, tt) => {
      if (tt < 13.1) return d < 0.9 ? seg(tt, 9.8, 12.6) : 0;
      if (tt < 24.2) return clamp(seg(tt, 13.3, 16.6) * 1.6 - d * 0.35) + (d < 0.9 ? 1 : 0);
      return clamp(seg(tt, 24.3, 32.0) * 2.2 - d * 0.18 + 0.4 - d * 0.05);
    };
    setXray(xray, t, heat);
    // ---- bolt slips 2 mm (exaggerated) + the crack
    focalBolts.forEach((b, k) => {
      b.position.z = 0.04;
      b.rotation.z = 0;
    });
    const slip = eo(seg(t, 6.6, 7.4));
    focalBolts[2].position.z = 0.04 + slip * 0.06 + jiggle(t, 5.6, 0.01, 60, 3);
    focalBolts[2].rotation.y = slip * 0.6;
    const crack = seg(t, 21.0, 23.8);
    if (t > 20 && t < 34.2) drawPlate(crack, 0.6);
    else if (t >= 42.4 && t < 47) drawPlate(0.3, 1);
    else drawPlate(0, 0.25);
    // ---- vibration
    const buzz = t > 4.8 && t < COLLAPSE ? Math.sin(t * 61) * 0.008 * (1 + seg(t, 24, 34) * 4) : 0;
    // sag before the collapse
    const sag = eio(seg(t, 28.5, COLLAPSE)) * 0.25;
    members.forEach((m) => {
      const x = m.userData.mid.x;
      m.position.y += buzz - sag * Math.cos((x / 6) * Math.PI * 0.5);
    });
    decks.forEach((d) => (d.position.y += buzz - sag * Math.cos((d.position.x / 6) * Math.PI * 0.5)));
    if (t >= COLLAPSE) collapse(t);
    // ---- load pulses (x-ray only)
    pulses.forEach((s, i) => {
      const pi = pulseInfo[i];
      const m = members[pi.m];
      const on = xray && t > 13.4 && heat(m.userData.d, t) > 0.15;
      s.visible = on;
      if (!on) return;
      const k = (t * pi.sp + pi.o) % 1;
      const from = m.userData.d < 0.9 ? m.userData.a : m.userData.a.distanceTo(FOCAL) < m.userData.b.distanceTo(FOCAL) ? m.userData.a : m.userData.b;
      const to = from === m.userData.a ? m.userData.b : m.userData.a;
      s.position.copy(from).lerp(to, k);
      s.scale.setScalar(0.35);
    });
    // ---- engineer
    eng.root.visible = true;
    let face = { time: t };
    if (t < COLLAPSE + 0.3) {
      eng.root.position.set(-0.6, 0.15 + buzz, 0.35);
      eng.root.rotation.set(0, lerp(0.3, -0.8, seg(t, 5.2, 5.8)) * (t < 16.9 || t > 20.1 ? 1 : 0) + (t >= 16.9 && t < 20.1 ? 0.25 : 0), 0);
      const wave = t < 3.0 ? Math.sin(t * 9) * 0.4 : 0;
      eng.pose({ t, armR: t < 3.0 ? 2.4 + wave : 0.5, armL: 0.6, sq: jiggle(t, 6.6, 0.12, 20, 6) });
      if (t < 5.3) face = { time: t, mouth: "grin", eyes: t < 3 ? "happy" : "open", lookX: 0.2 };
      else if (t < 16.9) face = { time: t, mouth: "o", wide: 0.8, lookX: -0.8, lookY: 0.6 };
      else if (t < 20.1) face = { time: t, mouth: "smile", lookX: 0.4, lookY: -0.3 };
      else face = { time: t, mouth: t > 28.4 ? "scream" : "wobble", mouthOpen: 0.6, wide: 1, sad: 0.7, browUp: 0.8, sweat: seg(t, 24, 25), lookX: -0.6, lookY: 0.5 };
      if (t > 28.4) eng.pose({ t, armR: 2.6 + Math.sin(t * 13) * 0.2, armL: 2.6 + Math.cos(t * 12) * 0.2, sq: Math.abs(Math.sin(t * 14)) * 0.05 });
    } else {
      // dangling from the surviving beam
      const tip = survivorTip();
      const sw = Math.sin((t - COLLAPSE) * 2.2) * 0.12 * Math.exp(-(t - COLLAPSE - 1) * 0.15);
      eng.root.position.copy(tip).add(V3(0.08 + sw, -1.12, 0.0));
      eng.root.rotation.set(0, -0.15, sw * 0.5);
      eng.pose({ t, armR: Math.PI - 0.15, armL: 0.5 + Math.sin(t * 1.3) * 0.1, stretchR: 1.6, sq: 0 });
      const blink = (t > 39.2 && t < 39.35) || (t > 44.1 && t < 44.25) || (t > 49.4 && t < 49.55) || (t > 49.75 && t < 49.9);
      face = { time: t, eyes: "open", blink: blink ? 1 : 0, mouth: t > 47.2 ? "smile" : "flat", lookX: 0, lookY: -0.1, sweat: t < 40 ? 1 : 0, wide: t < 37.5 ? 1 : 0 };
      if (t > 47.6) eng.pose({ t, armR: Math.PI - 0.15, armL: 2.2, stretchR: 1.6 });
    }
    eng.setFace(face);
    // ---- birds glide (outside shots)
    birds.forEach((b, i) => {
      b.visible = !xray && t < COLLAPSE + 1;
      const k = (t * 0.12 + i * 0.17) % 1;
      b.position.set(lerp(-14, 14, k), 5 + i * 0.6 + Math.sin(t + i) * 0.3, -6 - i * 1.5);
      b.children.forEach((w) => (w.rotation.z = w.userData.s * Math.sin(t * 8 + i) * 0.5));
    });
    // ---- dust / splash / sparks
    dust.forEach((d) => {
      const u = d.userData;
      const t0 = COLLAPSE + 0.2 + u.r1 * 1.4;
      const a = t - t0;
      d.visible = a > 0 && a < 4.5;
      if (!d.visible) return;
      const k = a / 4.5;
      d.position.set((u.r2 - 0.5) * 10, -2 + u.r3 * 3 + k * 2.5, (u.r4 - 0.5) * 3 + k * 9);
      const s = 1.5 + k * 6;
      d.scale.set(s, s, 1);
      d.material.opacity = 0.8 * Math.sin(Math.PI * Math.min(1, k * 1.4));
      d.material.rotation = u.r1 * 6 + a * 0.3;
    });
    splash.forEach((d) => {
      const u = d.userData;
      const t0 = COLLAPSE + 1.3 + u.r1 * 1.5;
      const a = t - t0;
      d.visible = a > 0 && a < 1.6;
      if (!d.visible) return;
      d.position.set((u.r2 - 0.5) * 8, -8.6 + a * 2.5 - a * a * 1.2, (u.r3 - 0.5) * 3);
      const s = 1 + a * 2.5;
      d.scale.set(s, s, 1);
      d.material.opacity = 0.9 * (1 - a / 1.6);
    });
    sparks.forEach((d) => {
      const u = d.userData;
      const tb = [33.6, 30.6, 31.4, 32.2][Math.floor(u.r1 * 4)];
      const a = t - tb;
      d.visible = a > 0 && a < 0.7 && t < COLLAPSE + 0.6;
      if (!d.visible) return;
      d.position.copy(FOCAL).add(V3((u.r2 - 0.5) * a * 4 + (u.r1 - 0.5) * 6, a * 2 - a * a * 4, (u.r3 - 0.5) * a * 3 + 0.3));
      d.scale.setScalar(0.25 * (1 - a / 0.7));
    });
    // ---- camera
    let p;
    let look;
    let fov = 40;
    const shake = t > 4.8 && t < COLLAPSE + 3 ? V3(Math.sin(t * 53), Math.sin(t * 47), 0).multiplyScalar(0.01 + 0.06 * seg(t, 30, 34.5) * (1 - seg(t, 36, 37.5))) : V3();
    if (t < 4.6) {
      const k = eio(seg(t, 0, 4.6));
      p = vlerp(V3(9, 3.2, 14), V3(6.0, 2.2, 10.5), k);
      look = vlerp(V3(-1, 0.4, 0), V3(-0.8, 0.6, 0), k);
    } else if (t < 9.3) {
      const k = eio(seg(t, 4.6, 6.2));
      p = vlerp(V3(6.0, 2.2, 10.5), V3(-1.05, 0.45, 2.5), k);
      look = vlerp(V3(-0.8, 0.6, 0), V3(-1.45, 0.12, 1.05), k);
      const zoom = eio(seg(t, 6.3, 7.4));
      p = vlerp(p, V3(-1.15, 0.28, 1.75), zoom);
      fov = lerp(40, 36, zoom);
    } else if (t < 16.9) {
      const k = eio(seg(t, 9.3, 16.9));
      p = vlerp(V3(0.8, 1.6, 6.2), V3(2.0, 2.4, 7.6), k);
      look = V3(-1.4, 0.5, 0.6);
    } else if (t < 20.1) {
      const k = eio(seg(t, 16.9, 20.1));
      p = vlerp(V3(-9, 2.8, 12), V3(-7, 2.2, 10), k);
      look = V3(0, 0.6, 0);
    } else if (t < 24.2) {
      const k = eio(seg(t, 20.1, 24.2));
      p = vlerp(V3(-1.2, 0.35, 2.1), V3(-1.35, 0.25, 1.75), k);
      look = V3(-1.5, 0.12, 1.1);
    } else if (t < 28.4) {
      const k = eio(seg(t, 24.2, 28.4));
      p = vlerp(V3(2, -2.5, 12), V3(0, -1.8, 13), k);
      look = V3(0, 0.6, 0);
      fov = 44;
    } else if (t < COLLAPSE) {
      const k = eio(seg(t, 28.4, COLLAPSE));
      p = vlerp(V3(1.2, 1.4, 4.6), V3(0.2, 1.0, 3.4), k);
      look = V3(-0.6, 0.6, 0.35);
    } else if (t < 38.0) {
      const k = eio(seg(t, COLLAPSE, 38.0));
      p = vlerp(V3(4, 2.5, 14), V3(3, 0.5, 15), k);
      look = vlerp(V3(-0.5, 0, 0), V3(-1.5, -2.5, 0), k);
      fov = 46;
    } else {
      const tip = survivorTip();
      const k = eio(seg(t, 38.0, TOTAL));
      p = vlerp(tip.clone().add(V3(2.6, 0.2, 5.4)), tip.clone().add(V3(1.6, -0.4, 3.6)), k);
      look = tip.clone().add(V3(0.1, -1.0, 0));
    }
    aim(cam, p.add(shake), look, fov);
    scene.updateMatrixWorld();
    anchorTo("bolt-anchor", worldOf(focalBolts[2]), cam);
    anchorTo("focal-anchor", worldOf(focalPlate), cam);
    anchorTo("eng-anchor", worldOf(eng.body, V3(0, 1.7, 0)), cam);
  }
  function render(r, t) {
    const xray = (t >= 9.3 && t < 16.9) || (t >= 20.1 && t < 33.4);
    if (xray) {
      r.setClearColor(0x0a1f3f, 1);
      r.clear();
      r.setClearColor(0x000000, 0);
    } else r.clear();
    r.render(scene, cam);
  }
  return { scene, cam, update, render };
})();

runShots(renderer, [[0, 1e9, WORLD]], TOTAL);
