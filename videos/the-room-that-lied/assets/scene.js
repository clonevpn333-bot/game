// "The Room That Lied" — murder mystery #1. 3D layer, seeked from HyperFrames time.
import {
  THREE, RoundedBoxGeometry, W, H, clamp, lerp, seg, eio, eo, eo5, ei, back, bounce, jiggle, rng, V3, vlerp,
  makeRenderer, INK, INK_CSS, withInk, inkMat, canvasTex, makeStage, makeCamera, aim, anchorTo, worldOf,
  glowTex, smokeTex, makeSmoke, makeStars, makeBlob, BLOB_BASE, runShots,
} from "./lib.js";

const TOTAL = window.TIMING.total;
const canvas = document.getElementById("gl");
const { renderer, env: ENV } = makeRenderer(canvas, { exposure: 1.0 });

// ================================================================== textures
const wallTex = canvasTex(512, 512, (c, w, h) => {
  c.fillStyle = "#1f4f4b";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(255,214,140,0.16)";
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const cx = x * 64 + (y % 2 ? 32 : 0);
      const cy = y * 64;
      c.beginPath();
      c.moveTo(cx, cy - 22);
      c.quadraticCurveTo(cx + 18, cy, cx, cy + 22);
      c.quadraticCurveTo(cx - 18, cy, cx, cy - 22);
      c.fill();
    }
  c.strokeStyle = "rgba(255,214,140,0.12)";
  c.lineWidth = 3;
  for (let x = 0; x < w; x += 32) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, h);
    c.stroke();
  }
}, { repeat: true });
wallTex.repeat.set(3, 2);
const floorTex = canvasTex(1024, 1024, (c, w) => {
  const r = rng(3);
  const pw = 128;
  const ph = 32;
  for (let y = 0; y < w / ph; y++)
    for (let x = -1; x < w / pw + 1; x++) {
      const off = (y % 2) * (pw / 2);
      const l = 34 + r() * 12;
      c.fillStyle = `hsl(${24 + r() * 8},${48 + r() * 10}%,${l}%)`;
      c.fillRect(x * pw + off, y * ph, pw - 3, ph - 3);
      c.fillStyle = "rgba(255,230,190,0.06)";
      c.fillRect(x * pw + off, y * ph, pw - 3, 6);
    }
}, { repeat: true });
floorTex.repeat.set(2, 2);
const rugTex = canvasTex(512, 512, (c, w) => {
  const m = w / 2;
  c.fillStyle = "#7d1e2c";
  c.beginPath();
  c.arc(m, m, m - 4, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = "#e0b45e";
  c.lineWidth = 14;
  c.beginPath();
  c.arc(m, m, m - 30, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = 5;
  c.beginPath();
  c.arc(m, m, m - 60, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = "rgba(224,180,94,0.5)";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    c.beginPath();
    c.arc(m + Math.cos(a) * 140, m + Math.sin(a) * 140, 16, 0, Math.PI * 2);
    c.fill();
  }
});
const chalkTex = canvasTex(512, 512, (c) => {
  c.strokeStyle = "rgba(255,255,255,0.92)";
  c.lineWidth = 12;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.setLineDash([26, 10]);
  c.beginPath();
  c.ellipse(256, 270, 150, 170, 0, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.moveTo(110, 220);
  c.lineTo(40, 140);
  c.moveTo(402, 220);
  c.lineTo(472, 150);
  c.moveTo(190, 430);
  c.lineTo(170, 500);
  c.moveTo(322, 430);
  c.lineTo(342, 500);
  c.stroke();
});
const heelTex = canvasTex(256, 512, (c) => {
  // a wet high-heel sole: pointed toe pad, thin arch, small square heel tip
  c.fillStyle = "rgba(30,22,52,0.92)";
  c.beginPath();
  c.moveTo(128, 18);
  c.bezierCurveTo(200, 40, 205, 190, 168, 250);
  c.bezierCurveTo(150, 280, 140, 300, 138, 330);
  c.lineTo(118, 330);
  c.bezierCurveTo(116, 300, 106, 280, 88, 250);
  c.bezierCurveTo(52, 190, 56, 40, 128, 18);
  c.fill();
  c.beginPath();
  c.roundRect(106, 400, 44, 70, 10);
  c.fill();
  c.strokeStyle = "rgba(120,170,255,0.45)";
  c.lineWidth = 6;
  for (let y = 70; y < 230; y += 34) {
    c.beginPath();
    c.moveTo(90, y);
    c.lineTo(166, y + 6);
    c.stroke();
  }
  c.fillStyle = "rgba(170,215,255,0.75)";
  c.beginPath();
  c.ellipse(108, 90, 14, 40, -0.25, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(170, 300, 9, 0, Math.PI * 2);
  c.arc(90, 360, 7, 0, Math.PI * 2);
  c.fill();
});

// ================================================================== characters
function makeDetective() {
  const d = makeBlob({ color: 0x5b6ee1, sheen: 0xd6dcff });
  d.base = { blush: 0.6, lidColor: "#5b6ee1" };
  const tweed = canvasTex(256, 256, (c, w) => {
    c.fillStyle = "#b9895a";
    c.fillRect(0, 0, w, w);
    c.strokeStyle = "rgba(90,50,25,0.55)";
    c.lineWidth = 6;
    for (let i = 0; i < w; i += 32) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i, w);
      c.moveTo(0, i);
      c.lineTo(w, i);
      c.stroke();
    }
    c.strokeStyle = "rgba(255,230,190,0.35)";
    c.lineWidth = 2;
    for (let i = 16; i < w; i += 32) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i, w);
      c.moveTo(0, i);
      c.lineTo(w, i);
      c.stroke();
    }
  }, { repeat: true });
  tweed.repeat.set(3, 2);
  const hatMat = new THREE.MeshPhysicalMaterial({ map: tweed, roughness: 0.8, sheen: 0.4 });
  const hat = new THREE.Group();
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.82, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), hatMat);
  crown.scale.set(1, 0.72, 1.05);
  withInk(crown, 0.025);
  hat.add(crown);
  for (const sz of [-1, 1]) {
    const brim = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 12, 0, Math.PI * 2, 0, 0.5), hatMat);
    brim.scale.set(1.25, 0.35, 1.0);
    brim.rotation.x = sz * 1.4;
    brim.position.set(0, 0.02, sz * 0.62);
    withInk(brim, 0.02);
    hat.add(brim);
  }
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 8, 20), new THREE.MeshPhysicalMaterial({ color: 0x6b3d1f }));
  bow.position.set(0, 0.6, 0);
  bow.rotation.x = Math.PI / 2;
  hat.add(bow);
  hat.position.y = BLOB_BASE + 0.82;
  hat.rotation.z = -0.08;
  d.squash.add(hat);
  // magnifying glass in the right hand
  const mg = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 16, 48), new THREE.MeshPhysicalMaterial({ color: 0xd9b44a, metalness: 1, roughness: 0.25 }));
  withInk(rim, 0.015);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.31, 40), new THREE.MeshPhysicalMaterial({ color: 0xcfefff, transparent: true, opacity: 0.35, roughness: 0.02, clearcoat: 1, side: THREE.DoubleSide }));
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.5, 12), new THREE.MeshPhysicalMaterial({ color: 0x5a3220, roughness: 0.4 }));
  handle.position.y = -0.56;
  withInk(handle, 0.015);
  mg.add(rim, lens, handle);
  d.arms[1].add(mg);
  mg.position.set(0, -0.95, 0.15);
  d.mag = mg;
  d.hat = hat;
  return d;
}
function makeAshford() {
  const a = makeBlob({ color: 0x9aa7bd, sheen: 0xe8eeff });
  a.base = { mustache: true, blush: 0.4 };
  const black = new THREE.MeshPhysicalMaterial({ color: 0x1c1726, roughness: 0.35, clearcoat: 0.7 });
  const hat = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.75, 32), black);
  top.position.y = 0.38;
  withInk(top, 0.02);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.06, 40), black);
  withInk(brim, 0.02);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.455, 0.455, 0.14, 32), new THREE.MeshPhysicalMaterial({ color: 0x8a1f2d }));
  band.position.y = 0.1;
  hat.add(top, brim, band);
  hat.position.y = BLOB_BASE + 0.88;
  hat.rotation.z = 0.1;
  a.squash.add(hat);
  a.hat = hat;
  return a;
}
function makeClara() {
  const c = makeBlob({ color: 0xff93bd, footColor: 0xd81f45, sheen: 0xffe0ee });
  c.base = { lashes: true, lip: "#d81f45", blush: 1 };
  const hair = new THREE.Mesh(new THREE.SphereGeometry(1.06, 48, 24, 0, Math.PI * 2, 0, 1.25), new THREE.MeshPhysicalMaterial({ color: 0x3a1d2a, roughness: 0.35, clearcoat: 0.8 }));
  hair.position.y = BLOB_BASE + 0.08;
  hair.scale.set(1.02, 1.0, 1.0);
  hair.rotation.x = -0.35;
  withInk(hair, 0.02);
  c.squash.add(hair);
  const pearlMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, clearcoat: 1, sheen: 1, sheenColor: new THREE.Color(0xffd8ee) });
  for (let i = 0; i < 15; i++) {
    const a = Math.PI / 2 - 1.1 + (i / 14) * 2.2;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), pearlMat);
    p.position.set(Math.cos(a) * 0.98, BLOB_BASE - 0.38 - Math.sin(a) * 0.12, Math.sin(a) * 0.93);
    c.squash.add(p);
  }
  // heels
  c.feet.forEach((f) => {
    const heel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.08, 1.6, 10), new THREE.MeshPhysicalMaterial({ color: 0xd81f45, clearcoat: 1 }));
    heel.position.set(0, -0.2, -0.75);
    f.add(heel);
  });
  return c;
}
function makeMilo() {
  const m = makeBlob({ color: 0xe8564c, sheen: 0xffd0c8 });
  m.base = { blush: 0.7 };
  const capMat = new THREE.MeshPhysicalMaterial({ color: 0xb3202e, roughness: 0.4, clearcoat: 0.5 });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.36, 32), capMat);
  withInk(cap, 0.02);
  const gold = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.08, 32), new THREE.MeshPhysicalMaterial({ color: 0xf2c14e, metalness: 1, roughness: 0.3 }));
  gold.position.y = -0.1;
  cap.add(gold);
  cap.position.set(0.25, BLOB_BASE + 0.98, 0);
  cap.rotation.z = -0.25;
  m.squash.add(cap);
  const btnMat = new THREE.MeshPhysicalMaterial({ color: 0xf2c14e, metalness: 1, roughness: 0.3 });
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), btnMat);
    b.position.set(0, BLOB_BASE - 0.35 - i * 0.18, 0.93 - i * 0.02);
    m.squash.add(b);
  }
  return m;
}

// ================================================================== props
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
    c.strokeStyle = INK_CSS;
    for (let i = 0; i < 12; i++) {
      if (i % 3 === 0) continue;
      const a = (i / 12) * Math.PI * 2;
      c.lineWidth = 10;
      c.beginPath();
      c.moveTo(256 + Math.cos(a) * 180, 256 + Math.sin(a) * 180);
      c.lineTo(256 + Math.cos(a) * 215, 256 + Math.sin(a) * 215);
      c.stroke();
    }
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.22, 64), new THREE.MeshPhysicalMaterial({ color: 0x8a5a2b, roughness: 0.35, clearcoat: 0.8 }));
  body.rotation.x = Math.PI / 2;
  withInk(body, 0.04);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 16, 64), new THREE.MeshPhysicalMaterial({ color: 0xd9b44a, metalness: 1, roughness: 0.25 }));
  rim.position.z = 0.12;
  g.add(body, rim);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.9, 64), new THREE.MeshStandardMaterial({ map: dial, roughness: 0.5 }));
  face.position.z = 0.115;
  g.add(face);
  const handMat = new THREE.MeshStandardMaterial({ color: INK });
  const mk = (len, w) => {
    const piv = new THREE.Group();
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, len, 0.04, 2, w / 2.2), handMat);
    m.position.y = len / 2 - 0.08;
    piv.add(m);
    piv.position.z = 0.15;
    g.add(piv);
    return piv;
  };
  const hour = mk(0.48, 0.11);
  const minute = mk(0.72, 0.07);
  // cracked glass overlay
  const crack = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 48),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      map: canvasTex(512, 512, (c) => {
        c.strokeStyle = "rgba(255,255,255,0.95)";
        c.lineWidth = 5;
        const r = rng(4);
        for (let k = 0; k < 14; k++) {
          let x = 300;
          let y = 200;
          const a0 = (k / 14) * Math.PI * 2;
          c.beginPath();
          c.moveTo(x, y);
          for (let s = 0; s < 6; s++) {
            const a = a0 + (r() - 0.5) * 0.6;
            x += Math.cos(a) * 45;
            y += Math.sin(a) * 45;
            c.lineTo(x, y);
          }
          c.stroke();
        }
        for (let k = 1; k < 4; k++) {
          c.beginPath();
          c.arc(300, 200, k * 55, 0, Math.PI * 2);
          c.stroke();
        }
      }),
    }),
  );
  crack.position.z = 0.2;
  g.add(crack);
  g.crack = crack;
  // minutes past midnight-noon
  g.setTime = (h, m) => {
    minute.rotation.z = -(m / 60) * Math.PI * 2;
    hour.rotation.z = -(((h % 12) + m / 60) / 12) * Math.PI * 2;
  };
  return g;
}
function makeGlass() {
  const g = new THREE.Group();
  const pts = [V3(0, 0), V3(0.28, 0), V3(0.3, 0.02), V3(0.34, 0.75), V3(0.33, 0.76), V3(0.3, 0.06), V3(0, 0.06)].map((p) => new THREE.Vector2(p.x, p.y));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.3, roughness: 0.02, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }));
  glass.renderOrder = 3;
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.28, 0.32, 32), new THREE.MeshPhysicalMaterial({ color: 0xd98a2b, transparent: true, opacity: 0.75, roughness: 0.05, clearcoat: 1, emissive: 0x5a2a00, emissiveIntensity: 0.3 }));
  liquid.position.y = 0.22;
  g.add(liquid, glass);
  const ice = [];
  const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, roughness: 0.05, clearcoat: 1, emissive: 0xbfe8ff, emissiveIntensity: 0.4 });
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.2, 0.2, 3, 0.05), iceMat);
    c.position.set(Math.cos(i * 2.1) * 0.1, 0.36 + i * 0.05, Math.sin(i * 2.1) * 0.1);
    c.rotation.set(i, i * 0.7, 0.3);
    g.add(c);
    ice.push(c);
  }
  g.liquid = liquid;
  g.ice = ice;
  g.glass = glass;
  return g;
}
function shardsOfGlass(n, seed) {
  const r = rng(seed);
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.45, roughness: 0.02, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const out = [];
  for (let i = 0; i < n; i++) {
    const geo = new THREE.BufferGeometry();
    const s = 0.08 + r() * 0.12;
    geo.setAttribute("position", new THREE.Float32BufferAttribute([0, s, 0, -s * 0.7, -s * 0.6, 0.01, s * 0.8, -s * 0.4, -0.01], 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.userData = { a: r(), b: r(), c: r(), d: r() };
    out.push(m);
  }
  return out;
}

// ================================================================== the room
const ROOM = (() => {
  const st = makeStage(ENV, { key: 1.1, keyColor: 0x9fbaff, keyPos: [4, 7, -6], rim: 0.8, rimColor: 0x7fa4ff, hemi: 0.45, hemiSky: 0x7c8fd6, hemiGround: 0x2a1a20, envI: 0.35, shadowSize: 6 });
  const { scene } = st;
  const cam = makeCamera(38);
  const lamp = new THREE.PointLight(0xffc27a, 26, 14, 1.6);
  lamp.position.set(-2.1, 2.05, -2.0);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.bias = -0.002;
  scene.add(lamp);
  const fill = new THREE.DirectionalLight(0xffe0c0, 0.7);
  fill.position.set(5, 6, 8);
  scene.add(fill);
  const pieces = []; // everything that flies apart in FREEZE THE ROOM
  const add = (m, spin = 1) => {
    scene.add(m);
    m.userData.base = { p: m.position.clone(), r: m.rotation.clone(), s: m.scale.clone() };
    m.userData.spin = spin;
    pieces.push(m);
    return m;
  };
  const wallMat = new THREE.MeshPhysicalMaterial({ map: wallTex, roughness: 0.75 });
  const woodMat = new THREE.MeshPhysicalMaterial({ color: 0x5b3420, roughness: 0.45, clearcoat: 0.5 });
  const floor = new THREE.Mesh(new RoundedBoxGeometry(6.4, 0.25, 6.4, 3, 0.06), new THREE.MeshPhysicalMaterial({ map: floorTex, roughness: 0.4, clearcoat: 0.6 }));
  floor.position.y = -0.125;
  floor.receiveShadow = true;
  withInk(floor, 0.03);
  add(floor, 0.2);
  const backWall = new THREE.Mesh(new RoundedBoxGeometry(6.4, 4.2, 0.25, 3, 0.06), wallMat);
  backWall.position.set(0, 2.1, -3.2);
  backWall.receiveShadow = true;
  withInk(backWall, 0.03);
  add(backWall, 0.3);
  const left = new THREE.Mesh(new RoundedBoxGeometry(0.25, 4.2, 6.4, 3, 0.06), wallMat);
  left.position.set(-3.2, 2.1, 0);
  left.receiveShadow = true;
  withInk(left, 0.03);
  add(left, 0.3);
  // wainscot
  for (const [px, pz, sx, sz] of [
    [0, -3.05, 6.3, 0.08],
    [-3.05, 0, 0.08, 6.3],
  ]) {
    const wain = new THREE.Mesh(new RoundedBoxGeometry(sx, 1.2, sz, 2, 0.03), woodMat);
    wain.position.set(px, 0.6, pz);
    wain.receiveShadow = true;
    add(wain, 0.4);
  }
  // door with chain + 404 plate
  const door = new THREE.Group();
  const dpanel = new THREE.Mesh(new RoundedBoxGeometry(0.12, 2.8, 1.4, 3, 0.05), new THREE.MeshPhysicalMaterial({ color: 0x7a4426, roughness: 0.4, clearcoat: 0.6 }));
  dpanel.position.y = 1.4;
  withInk(dpanel, 0.02);
  door.add(dpanel);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xd9b44a, metalness: 1, roughness: 0.25 }));
  knob.position.set(0.1, 1.3, 0.5);
  door.add(knob);
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.26),
    new THREE.MeshStandardMaterial({
      map: canvasTex(256, 128, (c) => {
        c.fillStyle = "#d9b44a";
        c.fillRect(0, 0, 256, 128);
        c.fillStyle = INK_CSS;
        c.font = "bold 84px serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("404", 128, 68);
      }),
      metalness: 0.5,
      roughness: 0.3,
    }),
  );
  plate.rotation.y = Math.PI / 2;
  plate.position.set(0.07, 2.2, 0);
  door.add(plate);
  door.position.set(-3.08, 0, 1.3);
  const doorHinge = new THREE.Group();
  doorHinge.position.set(-3.08, 0, 2.0);
  door.position.set(0, 0, -0.7);
  doorHinge.add(door);
  add(doorHinge, 0.3);
  // balcony window on the back wall (night + rain behind)
  const win = new THREE.Group();
  const night = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 2.4),
    new THREE.MeshBasicMaterial({
      map: canvasTex(256, 384, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, "#0c1640");
        g.addColorStop(1, "#24356e");
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        const r = rng(2);
        c.fillStyle = "rgba(255,230,150,0.9)";
        for (let i = 0; i < 40; i++) c.fillRect(r() * w, h * 0.55 + r() * h * 0.45, 6, 8);
        c.fillStyle = "#f4f1d0";
        c.beginPath();
        c.arc(190, 70, 26, 0, Math.PI * 2);
        c.fill();
      }),
    }),
  );
  win.add(night);
  const frameMat = new THREE.MeshPhysicalMaterial({ color: 0xf0e6d2, roughness: 0.4 });
  for (const [x, y, w2, h2] of [
    [0, 1.25, 1.8, 0.12],
    [0, -1.25, 1.8, 0.12],
    [-0.86, 0, 0.12, 2.6],
    [0.86, 0, 0.12, 2.6],
    [0, 0, 0.08, 2.5],
    [0, 0.3, 1.7, 0.06],
  ]) {
    const f = new THREE.Mesh(new RoundedBoxGeometry(w2, h2, 0.1, 2, 0.02), frameMat);
    f.position.set(x, y, 0.05);
    withInk(f, 0.012);
    win.add(f);
  }
  win.position.set(1.2, 1.55, -3.05);
  add(win, 0.4);
  const rainGeo = new THREE.BoxGeometry(0.012, 0.22, 0.01);
  const rain = new THREE.InstancedMesh(rainGeo, new THREE.MeshBasicMaterial({ color: 0xb8d4ff, transparent: true, opacity: 0.7 }), 70);
  rain.position.copy(win.position).add(V3(0, 0, 0.02));
  scene.add(rain);
  const rainInfo = Array.from({ length: 70 }, (_, i) => ({ x: (rng(i + 9)() - 0.5) * 1.5, o: rng(i + 3)() }));
  // curtains
  const curtMat = new THREE.MeshPhysicalMaterial({ color: 0x8a1f2d, roughness: 0.7, sheen: 0.8, sheenColor: new THREE.Color(0xff8aa0) });
  for (const sx of [-1, 1]) {
    const cg = new THREE.CylinderGeometry(0.22, 0.32, 3.0, 16, 1);
    const cu = new THREE.Mesh(cg, curtMat);
    cu.position.set(1.2 + sx * 1.05, 1.6, -2.95);
    cu.castShadow = true;
    withInk(cu, 0.02);
    add(cu, 0.6);
  }
  // wall clock
  const clock = makeClock();
  clock.scale.setScalar(0.48);
  clock.position.set(-1.35, 2.9, -3.0);
  add(clock, 0.8);
  // lamp table + lamp
  const tbl = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.9, 0.7, 3, 0.08), woodMat);
  tbl.position.set(-2.1, 0.45, -2.2);
  tbl.castShadow = true;
  withInk(tbl, 0.02);
  add(tbl, 0.7);
  const lampG = new THREE.Group();
  const lbase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 0.6, 20), new THREE.MeshPhysicalMaterial({ color: 0xd9b44a, metalness: 1, roughness: 0.3 }));
  lbase.position.y = 0.3;
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.4, 0.42, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xffe0a8, emissive: 0xffb05a, emissiveIntensity: 1.2, side: THREE.DoubleSide }));
  shade.position.y = 0.75;
  withInk(shade, 0.015);
  lampG.add(lbase, shade);
  lampG.position.set(-2.1, 0.9, -2.2);
  add(lampG, 0.9);
  // armchair
  const chair = new THREE.Group();
  const cmat = new THREE.MeshPhysicalMaterial({ color: 0x3f6d3a, roughness: 0.65, sheen: 0.7, sheenColor: new THREE.Color(0xbfeeb0) });
  for (const [x, y, z, sx, sy, sz] of [
    [0, 0.35, 0, 1.3, 0.5, 1.1],
    [0, 0.95, -0.45, 1.3, 1.2, 0.3],
    [-0.62, 0.65, 0, 0.26, 0.7, 1.1],
    [0.62, 0.65, 0, 0.26, 0.7, 1.1],
  ]) {
    const p = new THREE.Mesh(new RoundedBoxGeometry(sx, sy, sz, 3, 0.12), cmat);
    p.position.set(x, y, z);
    p.castShadow = true;
    withInk(p, 0.02);
    chair.add(p);
  }
  chair.position.set(1.9, 0, -1.6);
  chair.rotation.y = -0.5;
  add(chair, 0.5);
  // rug, side table, glass
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.7, 64), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.9 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.3, 0.012, 0.4);
  rug.receiveShadow = true;
  add(rug, 0.3);
  const side = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 32), woodMat);
  side.position.set(1.55, 0.75, 0.6);
  withInk(side, 0.015);
  add(side, 0.8);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.75, 12), woodMat);
  leg.position.set(1.55, 0.37, 0.6);
  add(leg, 0.8);
  // chalk outline + the victim + the heel print + the broken glass
  const chalk = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: chalkTex, transparent: true, depthWrite: false }));
  chalk.rotation.x = -Math.PI / 2;
  chalk.position.set(0.15, 0.03, 0.55);
  scene.add(chalk);
  const ash = makeAshford();
  ash.root.scale.setScalar(0.55);
  scene.add(ash.root);
  const heel = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.56), new THREE.MeshPhysicalMaterial({ map: heelTex, transparent: true, depthWrite: false, roughness: 0.05, clearcoat: 1 }));
  heel.rotation.set(-Math.PI / 2, 0, 0.5);
  heel.position.set(1.9, 0.025, 2.3);
  add(heel, 1.6);
  const heelGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x7fd3ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(heelGlow);
  const glass = makeGlass();
  glass.scale.setScalar(0.55);
  glass.position.set(1.55, 0.78, 0.6);
  scene.add(glass);
  const shards = shardsOfGlass(14, 7);
  shards.forEach((s) => scene.add(s));
  const spill = new THREE.Mesh(new THREE.CircleGeometry(0.35, 32), new THREE.MeshPhysicalMaterial({ color: 0xc27a2a, transparent: true, opacity: 0.7, roughness: 0.03, clearcoat: 1 }));
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(1.15, 0.02, 1.05);
  spill.scale.set(1.3, 1, 1);
  scene.add(spill);
  // the cast
  const det = makeDetective();
  det.root.scale.setScalar(0.62);
  scene.add(det.root);
  const clara = makeClara();
  clara.root.scale.setScalar(0.55);
  scene.add(clara.root);
  const milo = makeMilo();
  milo.root.scale.setScalar(0.5);
  scene.add(milo.root);
  const puff = makeSmoke(10, 0xffffff, 3, 0.7);
  puff.forEach((p) => scene.add(p));
  const glints = makeStars(12, 4);
  glints.forEach((g) => scene.add(g));

  function explode(t) {
    // FREEZE THE ROOM: everything lifts and drifts apart around the detective
    const e = eo(seg(t, 26.95, 28.6));
    const drift = Math.max(0, t - 26.95);
    pieces.forEach((m, i) => {
      const b = m.userData.base;
      const dir = b.p.clone().setY(0);
      if (dir.lengthSq() < 0.01) dir.set(0.3, 0, 0.3);
      dir.normalize();
      const lift = 0.6 + ((i * 37) % 10) / 10;
      m.position.copy(b.p).addScaledVector(dir, e * (1.4 + lift)).add(V3(0, e * lift * 0.9 + Math.sin(drift * 0.8 + i) * 0.08 * e, 0));
      m.rotation.set(b.r.x + e * 0.25 * m.userData.spin * Math.sin(i), b.r.y + e * 0.4 * m.userData.spin * Math.cos(i * 1.7), b.r.z + e * 0.2 * m.userData.spin);
    });
    return e;
  }
  function resetPieces() {
    pieces.forEach((m) => {
      const b = m.userData.base;
      m.position.copy(b.p);
      m.rotation.copy(b.r);
      m.scale.copy(b.s);
    });
  }
  function walker(b, t, from, to, t0, t1, hop = 0.08) {
    const k = seg(t, t0, t1);
    b.root.position.copy(vlerp(from, to, eio(k)));
    const walking = k > 0 && k < 1;
    b.root.position.y = walking ? Math.abs(Math.sin(t * 9)) * hop : 0;
    const d = to.clone().sub(from);
    b.root.rotation.y = walking ? Math.atan2(d.x, d.z) : b.root.rotation.y;
    return walking;
  }

  function update(t) {
    resetPieces();
    const freeze = t >= 26.95 && t < 34.0;
    const e = freeze ? explode(t) : 0;
    // night lighting goes icy in the freeze
    st.hemi.color.set(freeze ? 0x9fd8ff : 0x7c8fd6);
    st.hemi.intensity = freeze ? 0.9 : 0.45;
    lamp.intensity = freeze ? 10 : 26;
    // rain: falls until "nine forty" (scene-time flashback rules apply below)
    const raining = t < 26.95 || (t > 52 && t < 55.5);
    rain.visible = raining;
    if (raining) {
      const m4 = new THREE.Matrix4();
      rainInfo.forEach((r, i) => {
        const y = 1.1 - (((t * 3.2 + r.o * 2.4) % 2.4) + 0.0);
        m4.makeTranslation(r.x, y, 0);
        rain.setMatrixAt(i, m4);
      });
      rain.instanceMatrix.needsUpdate = true;
    }
    // characters
    [det, clara, milo, ash].forEach((b) => (b.root.visible = false));
    chalk.visible = t >= 16.1 && t < 59.5;
    glass.visible = false;
    shards.forEach((s) => (s.visible = false));
    spill.visible = t >= 16.1 && t < 59.5;
    heel.visible = t >= 16.1;
    heelGlow.material.opacity = 0;
    puff.forEach((p) => (p.visible = false));
    glints.forEach((g) => (g.visible = false));
    clock.crack.material.opacity = t >= 16.1 && t < 61.0 ? 1 : 0;
    clock.setTime(10, 47);
    doorHinge.rotation.y = 0;
    let camP;
    let look;
    let fov = 38;
    // ---------------- the dead body (present day)
    const bodyPose = () => {
      ash.root.visible = true;
      ash.root.position.set(0.15, 0.32, 0.55);
      ash.root.rotation.set(-Math.PI / 2 + 0.15, 0, 0.3);
      ash.pose({ t, armL: 1.6, armR: 1.4 });
      ash.setFace({ eyes: "x", mouth: "o", blush: 0 });
      ash.hat.position.set(1.2, BLOB_BASE - 0.5, -0.5);
      ash.hat.rotation.set(1.2, 0, 0.5);
    };
    if (t < 5.5) {
      bodyPose();
      chalk.visible = true;
      spill.visible = true;
      // frozen-in-time push in
      const k = eio(seg(t, 0, 5.5));
      camP = vlerp(V3(5.2, 4.8, 8.2), V3(4.0, 3.6, 6.4), k);
      look = V3(-0.3, 0.9, -0.5);
    } else if (t < 11.6) {
      // nine p.m.: the three walk in
      ash.hat.position.set(0, BLOB_BASE + 0.88, 0);
      ash.hat.rotation.set(0, 0, 0.1);
      chalk.visible = false;
      spill.visible = false;
      heel.visible = false;
      clock.crack.material.opacity = 0;
      clock.setTime(9, ((t - 5.5) / 6.1) * 4);
      glass.visible = true;
      doorHinge.rotation.y = -1.3 * eio(seg(t, 5.6, 6.2)) * (1 - eio(seg(t, 10.6, 11.2)));
      const doorIn = V3(-2.6, 0, 1.3);
      ash.root.visible = true;
      ash.root.rotation.set(0, 0, 0);
      walker(ash, t, doorIn, V3(0.2, 0, -0.3), 6.2, 7.7);
      if (t > 7.7) ash.root.rotation.y = 0.2;
      ash.pose({ t, armL: 0.5, armR: 0.5 + Math.sin(t * 3) * 0.2 });
      ash.setFace({ mouth: "smile", lookX: 0.3, time: t });
      clara.root.visible = t > 7.4;
      walker(clara, t, doorIn, V3(-1.0, 0, 0.6), 7.6, 9.1);
      if (t > 9.1) clara.root.rotation.y = 0.5;
      clara.pose({ t, armL: 0.5, armR: lerp(0.4, 2.2, seg(t, 9.1, 9.4)) });
      clara.setFace({ mouth: "smile", lookX: 0.5, eyes: t > 9.2 && t < 9.5 ? "happy" : "open", time: t });
      milo.root.visible = t > 9.3;
      walker(milo, t, doorIn, V3(-1.6, 0, 2.0), 9.5, 10.6);
      if (t > 10.6) milo.root.rotation.y = 0.9;
      milo.pose({ t, armL: 0.4, armR: lerp(0.4, 2.6, seg(t, 10.6, 10.9)) });
      milo.setFace({ mouth: "grin", lookX: 0.6, time: t });
      const k = eio(seg(t, 5.5, 11.6));
      camP = vlerp(V3(4.6, 3.6, 7.6), V3(3.4, 3.0, 7.0), k);
      look = vlerp(V3(-1.2, 0.9, 0.5), V3(-0.4, 0.8, 0.4), k);
    } else if (t < 16.1) {
      // ten p.m.: security camera in the hallway (the hallway is the room's door side)
      ash.root.visible = false;
      chalk.visible = false;
      spill.visible = false;
      heel.visible = false;
      clock.crack.material.opacity = 0;
      clock.setTime(10, 0);
      doorHinge.rotation.y = -0.7 * eio(seg(t, 11.7, 12.1)) * (1 - eio(seg(t, 14.4, 14.8)));
      walker(clara, t, V3(-1.0, 0, 0.6), V3(-3.9, 0, 1.25), 12.0, 13.9);
      clara.root.visible = clara.root.position.x > -2.95;
      walker(milo, t, V3(-1.2, 0, 1.4), V3(-3.9, 0, 1.4), 12.5, 14.3);
      milo.root.visible = milo.root.position.x > -2.95;
      clara.pose({ t });
      milo.pose({ t, armR: 0.8 });
      clara.setFace({ mouth: "smile", lookX: 0.6, time: t });
      milo.setFace({ mouth: "smile", time: t });
      camP = V3(1.6, 4.8, 7.4);
      look = V3(-1.9, 0.6, 1.2);
      fov = 44;
    } else if (t < 26.95) {
      // eleven p.m.: found. The smashed clock reads 10:47
      bodyPose();
      doorHinge.rotation.y = -1.3 * eio(seg(t, 16.3, 16.8));
      const toClock = eio(seg(t, 19.2, 20.4));
      const k = eio(seg(t, 16.1, 19.2));
      camP = vlerp(V3(3.0, 3.2, 6.0), V3(2.2, 2.4, 4.6), k);
      look = V3(0.1, 0.4, 0.4);
      camP = vlerp(camP, V3(-1.25, 2.85, -1.2), toClock);
      look = vlerp(look, clock.position, toClock);
      fov = lerp(38, 34, toClock);
      // "nobody was inside": pull back to the empty, sealed room
      const pull = eio(seg(t, 22.3, 23.6));
      camP = vlerp(camP, V3(4.6, 4.4, 7.8), pull);
      look = vlerp(look, V3(-0.3, 0.9, -0.5), pull);
      fov = lerp(fov, 38, pull);
      if (t > 25.4) {
        // the detective arrives with a puff
        det.root.visible = true;
        det.root.position.set(0.9, 0, 1.6);
        det.root.rotation.y = -0.4;
        det.pose({ t, armR: 1.2, sq: jiggle(t, 25.45, 0.2, 18, 6) });
        det.setFace({ eyes: "narrow", mouth: "flat", lookX: -0.6, angry: 0.4, time: t });
        det.root.scale.setScalar(0.62 * back_(seg(t, 25.4, 25.8)));
        puff.forEach((p, i) => {
          const u = p.userData;
          const k2 = seg(t, 25.4, 26.3);
          p.visible = k2 > 0 && k2 < 1;
          p.position.set(0.9 + (u.r1 - 0.5) * 1.2 * (0.3 + k2), 0.4 + u.r2 * 0.9 * k2, 1.6 + (u.r3 - 0.5) * 1.0);
          const s = 0.6 + k2 * 0.9;
          p.scale.set(s, s, 1);
          p.material.opacity = 0.7 * (1 - k2);
        });
      }
    } else if (t < 34.0) {
      // FREEZE THE ROOM + the three clues
      bodyPose();
      ash.root.position.y += e * 0.6;
      ash.root.rotation.z += e * 0.4;
      det.root.visible = true;
      det.root.position.set(0.4, 0.4 * e, 1.4);
      det.root.rotation.y = lerp(-0.4, 0.3, e);
      det.pose({ t, armR: lerp(1.2, 2.0, e), hop: Math.sin(t * 1.5) * 0.04 });
      det.setFace({ eyes: "narrow", mouth: "smirk", lookX: 0.4, time: t });
      // broken glass frozen mid-air
      glass.visible = true;
      glass.position.set(1.4, 1.6 + Math.sin(t * 1.2) * 0.05, 1.3);
      glass.rotation.set(0.6, t * 0.2, 0.4);
      glass.ice.forEach((c) => (c.visible = false));
      glass.liquid.scale.set(1, 0.4, 1);
      shards.forEach((s, i) => {
        const u = s.userData;
        s.visible = true;
        s.position.set(1.4 + (u.a - 0.5) * 1.3, 1.5 + (u.b - 0.5) * 1.1 + Math.sin(t + i) * 0.04, 1.3 + (u.c - 0.5) * 1.0);
        s.rotation.set(u.a * 6 + t * 0.2, u.b * 6, u.c * 6 + t * 0.15);
      });
      // the heel print turns in 3D
      heel.position.set(-0.7, 2.5, 1.7);
      heel.rotation.set(-0.15, Math.sin((t - 29.9) * 2.2) * 0.7, 0.25);
      heel.scale.setScalar(1.4 * back(seg(t, 29.9, 30.4)));
      heelGlow.position.copy(heel.position);
      heelGlow.scale.setScalar(1.6);
      heelGlow.material.opacity = 0.6 * seg(t, 30.0, 30.4);
      // the clock flies at the camera
      const fly = eio(seg(t, 28.9, 29.6));
      const cp = clock.position.clone();
      // camera rig
      const k = eio(seg(t, 26.95, 28.6));
      camP = vlerp(V3(4.6, 4.4, 7.8), V3(3.4, 3.6, 8.4), k);
      look = vlerp(V3(-0.3, 0.9, -0.5), V3(0.2, 1.4, 0.4), k);
      if (t > 28.8) {
        const target = camP.clone().add(look.clone().sub(camP).normalize().multiplyScalar(2.4));
        clock.position.lerp(target, fly * (1 - eio(seg(t, 29.7, 30.1))));
        clock.rotation.set(0, 0, Math.sin(t * 3) * 0.1);
        clock.lookAt(camP);
        clock.scale.setScalar(0.48 + 0.3 * fly);
      }
      // swing to the print, then the glass
      const toPrint = eio(seg(t, 29.8, 30.4)) * (1 - eio(seg(t, 30.8, 31.3)));
      camP = vlerp(camP, heel.position.clone().add(V3(0.3, 0.15, 2.3)), toPrint);
      look = vlerp(look, heel.position, toPrint);
      const toGlass = eio(seg(t, 30.9, 31.4));
      camP = vlerp(camP, glass.position.clone().add(V3(0.5, 0.25, 2.1)), toGlass);
      look = vlerp(look, glass.position, toGlass);
      glints.forEach((g) => {
        const u = g.userData;
        const k3 = seg(t, 31.2 + u.r1 * 0.8, 31.9 + u.r1 * 0.8);
        g.visible = k3 > 0 && k3 < 1;
        g.position.set(1.4 + (u.r2 - 0.5) * 1.4, 1.5 + (u.r3 - 0.5) * 1.2, 1.6);
        const s = 0.18 * Math.sin(Math.PI * k3);
        g.scale.set(s, s, 1);
      });
    } else if (t < 59.0) {
      // the reveal shots (52 – 59): balcony, rain, Clara
      bodyPose();
      ash.root.visible = t < 52;
      clara.root.visible = t >= 55.9;
      if (clara.root.visible) {
        clara.root.position.set(0.55, 0, -2.4);
        clara.root.rotation.y = Math.PI + 0.4 * Math.sin(t);
        if (t > 57.4) clara.root.rotation.y = lerp(Math.PI, 0.2, eio(seg(t, 57.4, 57.9)));
        clara.pose({ t, armL: 0.6, armR: 0.6 });
        clara.setFace({ mouth: "smile", eyes: "narrow", lidColor: "#ff93bd", time: t, lookX: 0.4 });
      }
      win.position.y = 1.55;
      camP = V3(0.6, 1.7, 1.5);
      look = V3(0.8, 1.2, -2.8);
      fov = 40;
      if (t < 55.4) {
        heel.visible = true;
        heel.position.set(1.9, 0.025, 2.3);
        heel.rotation.set(-Math.PI / 2, 0, 0.5);
        const k = eio(seg(t, 52.0, 53.2));
        camP = vlerp(V3(2.5, 1.5, 3.4), V3(2.2, 1.1, 3.0), k);
        look = V3(1.9, 0.0, 2.3);
        heelGlow.position.set(1.9, 0.05, 2.3);
        heelGlow.scale.setScalar(0.9);
        heelGlow.material.opacity = 0.6 * (0.6 + 0.4 * Math.sin(t * 6));
        const toWin = eio(seg(t, 54.2, 55.0));
        camP = vlerp(camP, V3(0.6, 1.7, 1.5), toWin);
        look = vlerp(look, V3(0.8, 1.2, -2.8), toWin);
      }
    } else if (t < 63.6) {
      // Clara's innocent smile — gone. Then through the fake clock into the true timeline.
      clara.root.visible = true;
      const flash = t >= 61.3;
      if (!flash) {
        clara.root.position.set(-1.35, 0, -1.6);
        clara.root.rotation.y = 0.15;
        clara.pose({ t, armL: 0.5, armR: 0.5, sq: jiggle(t, 60.3, 0.1, 20, 6) });
        const busted = t > 60.3;
        clara.setFace({ mouth: busted ? "o" : "smile", eyes: "open", wide: busted ? 1 : 0, blink: t > 59.6 && t < 59.75 ? 1 : 0, sweat: busted ? seg(t, 60.4, 60.8) : 0, sad: busted ? 0.6 : 0, time: t });
        const k = eio(seg(t, 59.0, 60.3));
        camP = vlerp(V3(-0.7, 1.4, 1.9), V3(-1.0, 1.25, 1.2), k);
        look = V3(-1.35, 0.85, -1.6);
        const dive = ei(seg(t, 60.6, 61.3));
        camP = vlerp(camP, clock.position.clone().add(V3(0, 0, 0.12)), dive);
        look = vlerp(look, clock.position.clone().add(V3(0, 0, -1)), dive);
        fov = lerp(38, 24, dive);
      } else {
        // 9:35 p.m. — Clara turning the clock hands forward
        bodyPose();
        ash.hat.position.set(1.2, BLOB_BASE - 0.5, -0.5);
        chalk.visible = false;
        clock.crack.material.opacity = 0;
        const turned = eio(seg(t, 61.6, 63.0));
        const mins = lerp(9 * 60 + 35, 10 * 60 + 47, turned);
        clock.setTime(Math.floor(mins / 60), mins % 60);
        clara.root.position.set(-1.35, 0.9, -2.3);
        clara.root.rotation.y = 0;
        clara.root.scale.setScalar(0.55);
        clara.pose({ t, armR: 2.7, armL: 0.5 });
        clara.reach(1, clock.position.clone().add(V3(0.1, 0, 0.1)));
        clara.setFace({ mouth: "smirk", eyes: "narrow", lidColor: "#ff93bd", lookY: -0.8, lookX: 0.4, time: t });
        const k = eio(seg(t, 61.3, 63.6));
        camP = vlerp(V3(0.6, 2.6, 2.2), V3(0.3, 2.3, 1.4), k);
        look = V3(-1.3, 2.0, -2.6);
      }
    } else {
      // case closed
      bodyPose();
      det.root.visible = true;
      det.root.position.set(0.9, 0, 1.7);
      det.root.rotation.y = -0.25;
      const tip = Math.sin(Math.PI * seg(t, 65.2, 65.9));
      det.pose({ t, armR: 1.0, armL: lerp(0.4, 2.6, tip) });
      det.hat.rotation.z = -0.08 + tip * 0.35;
      det.hat.position.y = BLOB_BASE + 0.82 + tip * 0.25;
      det.setFace({ eyes: t > 65.4 && t < 66.2 ? "happy" : "narrow", wink: t > 66.6, mouth: "smirk", lookX: 0.2, time: t });
      clock.crack.material.opacity = 1;
      const shatter = seg(t, 64.7, 65.4);
      clock.scale.setScalar(0.48 * (1 + 0.15 * Math.sin(shatter * Math.PI)));
      const k = eio(seg(t, 63.6, TOTAL));
      camP = vlerp(V3(3.6, 2.6, 6.4), V3(2.6, 2.0, 5.0), k);
      look = V3(0.2, 1.0, 0.4);
    }
    aim(cam, camP, look, fov);
    scene.updateMatrixWorld();
    anchorTo("clock-anchor", clock.position, cam);
    anchorTo("det-anchor", worldOf(det.body, V3(0, 1.6, 0)), cam);
    anchorTo("clara-anchor", worldOf(clara.body, V3(0, 1.4, 0)), cam);
    anchorTo("milo-anchor", worldOf(milo.body, V3(0, 1.4, 0)), cam);
    anchorTo("ash-anchor", worldOf(ash.body, V3(0, 1.8, 0)), cam);
    anchorTo("heel-anchor", heel.position, cam);
    anchorTo("glass-anchor", glass.position, cam);
  }
  function back_(k) {
    return Math.max(0.001, back(k));
  }
  return { scene, cam, update };
})();

// ================================================================== three timelines (live mini-dioramas in shattering glass)
function makeMini(kind) {
  const scene = new THREE.Scene();
  scene.environment = ENV;
  scene.environmentIntensity = 0.5;
  scene.add(new THREE.HemisphereLight(0xfff0e0, 0x2a2040, 1.0));
  const kl = new THREE.DirectionalLight(0xfff0dc, 2.0);
  kl.position.set(2, 5, 6);
  scene.add(kl);
  const cam = new THREE.PerspectiveCamera(32, 2 / 3, 0.1, 50);
  cam.position.set(0, 1.4, 6.2);
  cam.lookAt(0, 1.0, 0);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8 }));
  wall.position.z = -1.2;
  scene.add(wall);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5 }));
  fl.rotation.x = -Math.PI / 2;
  scene.add(fl);
  let actor;
  let prop;
  if (kind === "A") {
    actor = makeClara();
    const d = new THREE.Mesh(new RoundedBoxGeometry(1.4, 2.6, 0.14, 3, 0.05), new THREE.MeshPhysicalMaterial({ color: 0x7a4426, roughness: 0.4 }));
    d.position.set(0.9, 1.3, -1.05);
    withInk(d, 0.02);
    scene.add(d);
    prop = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.75),
      new THREE.MeshBasicMaterial({
        map: canvasTex(400, 200, (c) => {
          c.fillStyle = "#0d1b14";
          c.fillRect(0, 0, 400, 200);
          c.fillStyle = "#5dff9a";
          c.font = "bold 34px monospace";
          c.fillText("DOOR LOG 404", 20, 50);
          c.fillText("10:00  CLOSE", 20, 105);
          c.fillStyle = "#ff5a6a";
          c.fillText("10:47  ------", 20, 160);
        }),
      }),
    );
    prop.position.set(-0.6, 2.25, -1.1);
  } else if (kind === "B") {
    actor = makeMilo();
    prop = new THREE.Group();
    const reader = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.8, 0.12, 3, 0.05), new THREE.MeshPhysicalMaterial({ color: 0x2b2b3a }));
    const light = new THREE.Mesh(new THREE.CircleGeometry(0.08, 20), new THREE.MeshBasicMaterial({ color: 0xff3a4a }));
    light.position.set(0, 0.25, 0.07);
    reader.add(light);
    withInk(reader, 0.015);
    prop.add(reader);
    prop.position.set(0.95, 1.4, -1.05);
    const card = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.32, 0.03, 2, 0.04), new THREE.MeshPhysicalMaterial({ color: 0xf2c14e, metalness: 0.6, roughness: 0.3 }));
    withInk(card, 0.01);
    actor.arms[1].add(card);
    card.position.set(0, -0.7, 0.1);
  } else {
    actor = makeAshford();
    const ch = new THREE.Mesh(new RoundedBoxGeometry(1.8, 1.1, 1.0, 3, 0.15), new THREE.MeshPhysicalMaterial({ color: 0x3f6d3a, roughness: 0.65 }));
    ch.position.set(0, 0.55, -0.6);
    withInk(ch, 0.02);
    scene.add(ch);
    prop = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.8), new THREE.MeshBasicMaterial({ map: heelTex, transparent: true }));
    prop.rotation.x = -Math.PI / 2;
    prop.position.set(1.1, 0.02, 0.9);
  }
  actor.root.position.set(kind === "C" ? 0 : -0.25, kind === "C" ? 0.45 : 0, kind === "C" ? 0.1 : 0);
  scene.add(actor.root, prop);
  const rt = new THREE.WebGLRenderTarget(512, 768, { type: THREE.HalfFloatType });
  function render(r, t) {
    const s = Math.sin(t * 2.4);
    if (kind === "A") {
      actor.root.position.x = -0.3 + s * 0.15;
      actor.root.rotation.y = 0.5;
      actor.pose({ t, armR: 1.4 + s * 0.4 });
      actor.setFace({ mouth: "smile", eyes: "narrow", lidColor: "#ff93bd", lookX: 0.7, time: t });
    } else if (kind === "B") {
      actor.root.rotation.y = 0.6;
      actor.pose({ t, armR: 1.6 + s * 0.5 });
      actor.setFace({ mouth: "wobble", lookX: 0.7, sweat: 1, time: t });
    } else {
      actor.pose({ t, armL: 0.9, armR: 0.9 });
      actor.setFace({ mouth: "o", lookX: 0.8, lookY: 0.6, wide: 0.8, time: t });
    }
    r.setRenderTarget(rt);
    r.setClearColor(0x1a1030, 1);
    r.clear();
    r.render(scene, cam);
    r.setRenderTarget(null);
    r.setClearColor(0x000000, 0);
  }
  return { rt, render };
}

function makePanelShards(rt, seed) {
  // a 2 x 3 glass panel split into jittered triangles that each carry their part of the image
  const r = rng(seed);
  const cols = 4;
  const rows = 6;
  const Wp = 2.0;
  const Hp = 3.0;
  const P = [];
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= cols; i++) {
      const edge = i === 0 || j === 0 || i === cols || j === rows;
      P.push([(i / cols + (edge ? 0 : (r() - 0.5) * 0.12)) * Wp - Wp / 2, (j / rows + (edge ? 0 : (r() - 0.5) * 0.08)) * Hp - Hp / 2]);
    }
  const mat = new THREE.MeshBasicMaterial({ map: rt.texture, side: THREE.DoubleSide });
  const group = new THREE.Group();
  const shards = [];
  const mkTri = (a, b, c) => {
    const ctr = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([a[0] - ctr[0], a[1] - ctr[1], 0, b[0] - ctr[0], b[1] - ctr[1], 0, c[0] - ctr[0], c[1] - ctr[1], 0], 3));
    const uv = (p) => [(p[0] + Wp / 2) / Wp, (p[1] + Hp / 2) / Hp];
    geo.setAttribute("uv", new THREE.Float32BufferAttribute([...uv(a), ...uv(b), ...uv(c)], 2));
    const m = new THREE.Mesh(geo, mat);
    m.position.set(ctr[0], ctr[1], 0);
    m.userData = { home: V3(ctr[0], ctr[1], 0), v: V3(ctr[0] * (1.5 + r() * 2), ctr[1] * (1 + r()) + 1 + r(), 1 + r() * 3), spin: V3(r() * 8 - 4, r() * 8 - 4, r() * 8 - 4) };
    group.add(m);
    shards.push(m);
  };
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const a = P[j * (cols + 1) + i];
      const b = P[j * (cols + 1) + i + 1];
      const c = P[(j + 1) * (cols + 1) + i];
      const d = P[(j + 1) * (cols + 1) + i + 1];
      mkTri(a, b, d);
      mkTri(a, d, c);
    }
  // frame
  const frame = new THREE.Mesh(new RoundedBoxGeometry(Wp + 0.16, Hp + 0.16, 0.08, 3, 0.05), new THREE.MeshPhysicalMaterial({ color: 0xd9b44a, metalness: 1, roughness: 0.3 }));
  frame.position.z = -0.06;
  withInk(frame, 0.02);
  group.add(frame);
  group.shatter = (k) => {
    shards.forEach((s) => {
      const u = s.userData;
      s.position.copy(u.home).addScaledVector(u.v, k).add(V3(0, -3 * k * k, 0));
      s.rotation.set(u.spin.x * k, u.spin.y * k, u.spin.z * k);
    });
    frame.visible = k < 0.02;
    frame.scale.setScalar(1);
  };
  return group;
}

const TIMELINES = (() => {
  const scene = new THREE.Scene();
  scene.environment = ENV;
  scene.environmentIntensity = 0.5;
  scene.fog = new THREE.Fog(0x120a24, 12, 32);
  scene.add(new THREE.HemisphereLight(0xbfc8ff, 0x1a1030, 0.9));
  const kl = new THREE.DirectionalLight(0xfff0dc, 2.2);
  kl.position.set(3, 8, 6);
  kl.castShadow = true;
  kl.shadow.mapSize.set(2048, 2048);
  Object.assign(kl.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
  scene.add(kl);
  const cam = makeCamera(40);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshPhysicalMaterial({ color: 0x1d1238, roughness: 0.15, clearcoat: 1, metalness: 0.2 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  // glowing path
  const path = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 26), new THREE.MeshBasicMaterial({ color: 0x5b6ee1, transparent: true, opacity: 0.35 }));
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.01, -8);
  scene.add(path);
  const minis = ["A", "B", "C"].map((k) => makeMini(k));
  const panels = minis.map((m, i) => {
    const p = makePanelShards(m.rt, 10 + i);
    p.position.set(i % 2 ? 1.9 : -1.9, 1.9, -2 - i * 5.5);
    p.rotation.y = i % 2 ? -0.25 : 0.25;
    scene.add(p);
    return p;
  });
  const det = makeDetective();
  det.root.scale.setScalar(0.5);
  scene.add(det.root);
  const KILL = [37.95, 41.45, 44.95];
  function update(t, r) {
    minis.forEach((m) => m.render(r, t));
    // the detective walks between them
    const z = lerp(2.5, -14.5, seg(t, 34.0, 45.4));
    det.root.position.set(Math.sin(t * 1.3) * 0.15, Math.abs(Math.sin(t * 7)) * 0.06, z);
    det.root.rotation.y = Math.PI + Math.sin(t * 7) * 0.08;
    const look = Math.floor(clamp((t - 34.8) / 3.6, 0, 2.99));
    det.pose({ t, armR: 1.6 + Math.sin(t * 7) * 0.2, armL: 0.4 + Math.sin(t * 7 + 3) * 0.2 });
    det.setFace({ eyes: "narrow", mouth: "flat", time: t });
    panels.forEach((p, i) => {
      const k = seg(t, KILL[i], KILL[i] + 1.4);
      p.shatter(eo(k) * 1.6);
      p.visible = k < 1;
      const appear = back(seg(t, 34.2 + i * 0.25, 34.8 + i * 0.25));
      p.scale.setScalar(Math.max(0.001, appear));
      p.position.y = 1.9 + Math.sin(t * 1.1 + i) * 0.08;
    });
    // camera: behind and above the detective, sliding past each panel
    const camZ = z + 6.2;
    const sway = Math.sin(seg(t, 34, 45.4) * Math.PI * 3) * 1.2;
    aim(cam, V3(sway, 3.6, z + 8.8), V3(sway * 0.3, 1.7, z - 5), 40);
    scene.updateMatrixWorld();
    panels.forEach((p, i) => anchorTo("tl-anchor-" + i, p.position.clone().add(V3(0, 1.85, 0)), cam));
  }
  function render(r, t) {
    r.setClearColor(0x120a24, 1);
    r.clear();
    r.render(scene, cam);
    r.setClearColor(0x000000, 0);
  }
  return { scene, cam, update, render };
})();

// ================================================================== the melting ice (45.4 – 52.0)
const ICE = (() => {
  const st = makeStage(ENV, { key: 2.2, keyPos: [3, 6, 5], rim: 2.2, hemi: 0.6, envI: 0.8, shadow: false });
  const { scene } = st;
  const cam = makeCamera(34);
  const glass = makeGlass();
  glass.scale.setScalar(2.4);
  scene.add(glass);
  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.2, 64), new THREE.MeshPhysicalMaterial({ color: 0x5b3420, roughness: 0.3, clearcoat: 1 }));
  tableTop.position.y = -0.1;
  scene.add(tableTop);
  const clock = makeClock();
  clock.scale.setScalar(0.9);
  scene.add(clock);
  const drops = makeSmoke(12, 0xbfe8ff, 5, 0.5, true, glowTex);
  drops.forEach((d) => scene.add(d));
  function update(t) {
    const melt = eio(seg(t, 46.8, 49.4));
    glass.ice.forEach((c, i) => {
      const s = Math.max(0.001, 1 - melt * (1 + i * 0.15));
      c.scale.setScalar(s);
      c.position.y = 0.36 + i * 0.05 - melt * 0.12;
      c.rotation.y = i + t * 0.2;
    });
    glass.liquid.scale.set(1, 1 + melt * 0.25, 1);
    glass.liquid.position.y = 0.22 + melt * 0.04;
    glass.rotation.y = t * 0.15;
    // "he died before ten": the clock rewinds
    clock.visible = t > 50.0;
    clock.position.set(1.2, 2.8, 0.4);
    clock.rotation.set(0, -0.3, 0);
    clock.scale.setScalar(0.9 * Math.max(0.001, back(seg(t, 50.0, 50.4))));
    const rw = eio(seg(t, 50.4, 51.6));
    const mins = lerp(11 * 60, 9 * 60 + 40, rw);
    clock.setTime(Math.floor(mins / 60), mins % 60);
    drops.forEach((d) => {
      const u = d.userData;
      d.visible = t > 46.8 && t < 49.6;
      d.position.set((u.r1 - 0.5) * 0.9, 0.5 + u.r2 * 1.2 + ((t * 0.5 + u.r3) % 1) * 0.3, 0.8);
      const s = 0.08 + u.r4 * 0.1;
      d.scale.set(s, s, 1);
    });
    const k = eio(seg(t, 45.4, 52.0));
    aim(cam, vlerp(V3(0.8, 2.6, 7.6), V3(1.1, 2.8, 8.4), k), V3(0.5, 1.5, 0), 34);
    scene.updateMatrixWorld();
    anchorTo("melt-anchor", V3(0, 2.4, 0), cam);
    anchorTo("rewind-anchor", clock.position.clone().add(V3(0, 1.1, 0)), cam);
  }
  return { scene, cam, update };
})();

runShots(
  renderer,
  [
    [0, 34.0, ROOM],
    [34.0, 45.4, TIMELINES],
    [45.4, 52.0, ICE],
    [52.0, 1e9, ROOM],
  ],
  TOTAL,
);
