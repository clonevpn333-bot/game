// Character rendering. Every person is assembled from jointed, instanced parts
// (torso, head, hair, upper/lower arms with hands, thighs, shins with shoes) so
// walk cycles bend at the knees and elbows, people sit, kneel, lie down, hold
// phones, hoses and tools, all in a few draw calls. Bodies come in two forms,
// several outfits (tee, suit, hoodie, polo, dress) and seven hairstyles, with
// faces (eyes, brows, nose, ears, mouth), beards, hats and umbrellas.
import * as THREE from 'three';
import { ModelKit, makeInstMaterial, InstPool } from './materials.js';
import { UNIFORMS } from '../sim/citizens.js';
import { hash01 } from '../core/rng.js';
import { formOfName } from '../core/names.js';

const tmpM = new THREE.Matrix4(), base = new THREE.Matrix4(), part = new THREE.Matrix4(), rot = new THREE.Matrix4(), joint = new THREE.Matrix4();
const q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
const C1 = new THREE.Color(), C2 = new THREE.Color(), C3 = new THREE.Color();
const sphere = new THREE.Sphere();
const WHITE = '#ffffff';

function kit(fn) { const k = new ModelKit(); fn(k); return k.build(); }

// ---------------------------------------------------------------- part geometry
// torso: origin at the hips, extends up to the neck. c1 = clothing, c2 = skin
function torsoGeo(form, outfit) {
  return kit((k) => {
    const f = form === 1;
    const hipW = f ? 0.38 : 0.35, waistW = f ? 0.28 : 0.32, chestW = f ? 0.37 : 0.41, shW = f ? 0.4 : 0.47;
    const bulk = outfit === 'suit' || outfit === 'hoodie' ? 0.025 : 0;
    k.surf(outfit === 'hoodie' ? 'knit' : 'fabric');
    // loft runs along Z; rotate so it stands up along Y (-Z depth becomes the y of the cross-section)
    const secs = [
      { z: 0.0, w: hipW + bulk, yb: -0.11, yt: 0.11, r: 0.85 },
      { z: 0.12, w: hipW - 0.01 + bulk, yb: -0.105, yt: 0.105, r: 0.85 },
      { z: 0.24, w: waistW + bulk, yb: -0.1, yt: 0.1, r: 0.85 },
      { z: 0.38, w: chestW + bulk, yb: -0.12 - (f ? 0.02 : 0), yt: 0.11, r: 0.8 },
      { z: 0.5, w: shW + bulk, yb: -0.115, yt: 0.105, r: 0.75 },
      { z: 0.58, w: shW - 0.04 + bulk, yb: -0.1, yt: 0.09, r: 0.9 },
      { z: 0.64, w: 0.2, yb: -0.07, yt: 0.07, r: 0.9 },
    ];
    k.loft(secs, WHITE, 1, 0, 14, [-Math.PI / 2, 0, 0]);
    if (f && outfit !== 'hoodie') {
      k.ball(0, 0.4, 0.07, 0.17, 0.07, 0.06, WHITE, 1, 0, 12, 8);
    }
    // belt + buckle
    k.surf('leather');
    if (outfit !== 'dress' && outfit !== 'hoodie') {
      k.rbox(0, 0.03, 0, hipW + 0.02, 0.05, 0.235, 0.02, '#2a201a');
      k.surf('chrome'); k.box(0, 0.03, 0.12, 0.05, 0.035, 0.012, '#c8b070');
    }
    // neck (skin)
    k.surf('skin');
    k.cyl(0, 0.66, 0.0, 0.056, 0.08, WHITE, 10, 2, 0, null, 0.052);
    k.surf('fabric');
    if (outfit === 'tee') {
      k.lathe(0, 0.6, 0, [[0.09, 0], [0.105, 0.025], [0.085, 0.04]], WHITE, 12, 1);
    }
    if (outfit === 'polo') {
      k.box(0, 0.6, 0.06, 0.14, 0.05, 0.1, WHITE, 1, 0, [0.5, 0, 0]);
      for (let i = 0; i < 2; i++) { k.surf('plastic'); k.ball(0, 0.53 - i * 0.05, 0.115, 0.01, 0.01, 0.006, '#e8e4dc', 0, 0, 6, 4); }
      k.surf('fabric');
    }
    if (outfit === 'suit') {
      // white shirt V, tie, lapels and buttons
      k.box(0, 0.5, 0.108, 0.1, 0.18, 0.02, '#f2f2f0', 0, 0, [0.12, 0, 0]);
      k.surf('fabric'); k.box(0, 0.47, 0.122, 0.035, 0.2, 0.012, '#7a1e2a', 0, 0, [0.1, 0, 0]);
      for (const sx of [-1, 1]) k.box(sx * 0.07, 0.48, 0.118, 0.05, 0.2, 0.015, WHITE, 1, 0, [0.1, 0, sx * 0.35]);
      k.surf('plastic');
      for (let i = 0; i < 2; i++) k.ball(0, 0.22 + i * 0.08, 0.117, 0.012, 0.012, 0.006, '#1a1a1a', 0, 0, 6, 4);
      // pocket square
      k.surf('fabric'); k.box(-0.12, 0.45, 0.118, 0.05, 0.015, 0.01, '#e8e8f0');
    }
    if (outfit === 'hoodie') {
      k.surf('knit');
      k.ball(0, 0.6, -0.12, 0.17, 0.11, 0.08, WHITE, 1, 0, 10, 8);
      k.rbox(0, 0.2, 0.105, 0.24, 0.1, 0.03, 0.015, WHITE, 1);
      k.surf('fabric'); for (const sx of [-1, 1]) k.cyl(sx * 0.04, 0.52, 0.115, 0.006, 0.14, '#e8e8e8', 4);
    }
    if (outfit === 'dress') {
      // flared skirt to the knee
      k.surf('fabric');
      k.lathe(0, -0.48, 0, [[0.27, 0], [0.25, 0.12], [0.215, 0.32], [0.19, 0.48], [0.17, 0.52]], WHITE, 16, 1);
    }
  });
}

// head: origin at the base of the skull (top of the neck). c1 = skin, c2 = hair colour (brows)
function headGeo(form) {
  return kit((k) => {
    const f = form === 1;
    k.surf('skin');
    k.ball(0, 0.13, 0, 0.105, 0.125, 0.115, WHITE, 1, 0, 18, 14);
    // jaw & chin
    k.ball(0, 0.065, 0.025, f ? 0.08 : 0.088, 0.06, 0.09, WHITE, 1, 0, 14, 10);
    // ears
    for (const sx of [-1, 1]) k.ball(sx * 0.105, 0.12, -0.005, 0.018, 0.034, 0.024, WHITE, 1, 0, 8, 6);
    // nose
    k.ball(0, 0.105, 0.112, 0.019, 0.03, 0.025, WHITE, 1, 0, 8, 6, [-0.25, 0, 0]);
    // eyes: sclera, iris, pupil
    k.surf('glass');
    for (const sx of [-1, 1]) {
      k.ball(sx * 0.04, 0.138, 0.094, 0.021, 0.015, 0.012, '#f4f2ec', 0, 0, 10, 6);
      k.ball(sx * 0.04, 0.138, 0.104, 0.0105, 0.0105, 0.005, '#3a2a1a', 0, 0, 8, 6);
      k.ball(sx * 0.04, 0.138, 0.108, 0.005, 0.005, 0.003, '#050505', 0, 0, 6, 4);
    }
    // brows (hair colour)
    k.surf('hair');
    for (const sx of [-1, 1]) k.rbox(sx * 0.042, 0.163, 0.106, 0.042, 0.008, 0.012, 0.004, WHITE, 2, 0, [0, 0, sx * 0.07]);
    // mouth & lips
    k.surf('skin');
    k.rbox(0, 0.068, 0.108, 0.042, 0.011, 0.012, 0.005, f ? '#b85a5a' : '#9a5a50');
  });
}

function hairGeo(style) {
  return kit((k) => {
    k.surf('hair');
    if (style === 0) { // short crop with fringe
      k.ball(0, 0.165, -0.01, 0.112, 0.105, 0.122, WHITE, 1, 0, 16, 10);
      k.ball(0, 0.215, 0.07, 0.085, 0.035, 0.05, WHITE, 1, 0, 10, 6, [0.4, 0, 0]);
    } else if (style === 1) { // long, past the shoulders
      k.ball(0, 0.17, -0.012, 0.116, 0.112, 0.126, WHITE, 1, 0, 16, 10);
      k.loft([{ z: -0.13, w: 0.24, yb: -0.27, yt: 0.12, r: 0.9 }, { z: -0.02, w: 0.25, yb: -0.22, yt: 0.14, r: 0.9 }], WHITE, 1, 0, 12, null, true);
      for (const sx of [-1, 1]) k.rbox(sx * 0.1, 0.02, 0.02, 0.04, 0.24, 0.08, 0.02, WHITE, 1);
    } else if (style === 2) { // bun
      k.ball(0, 0.168, -0.012, 0.113, 0.108, 0.123, WHITE, 1, 0, 16, 10);
      k.ball(0, 0.24, -0.1, 0.055, 0.05, 0.05, WHITE, 1, 0, 10, 8);
    } else if (style === 3) { // curls / afro
      k.ball(0, 0.19, -0.02, 0.15, 0.135, 0.15, WHITE, 1, 0, 14, 10);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        k.ball(Math.cos(a) * 0.12, 0.2 + Math.sin(i * 1.7) * 0.04, Math.sin(a) * 0.12 - 0.02, 0.05, 0.05, 0.05, WHITE, 1, 0, 8, 6);
      }
    } else if (style === 5) { // buzz
      k.ball(0, 0.16, -0.008, 0.108, 0.104, 0.118, WHITE, 1, 0, 14, 10);
    } else if (style === 6) { // ponytail
      k.ball(0, 0.17, -0.012, 0.114, 0.11, 0.124, WHITE, 1, 0, 16, 10);
      k.tube([[0, 0.18, -0.12], [0, 0.1, -0.16], [0, -0.02, -0.15]], 0.032, WHITE, 8, 1);
    }
  });
}

function beardGeo() {
  return kit((k) => {
    k.surf('hair');
    k.ball(0, 0.06, 0.045, 0.092, 0.065, 0.085, WHITE, 1, 0, 12, 8);
    k.rbox(0, 0.085, 0.112, 0.06, 0.014, 0.012, 0.006, WHITE, 1);
  });
}

// upper arm from the shoulder joint downward (c1 sleeve)
const upperArmGeo = () => kit((k) => {
  k.surf('fabric');
  k.ball(0, -0.035, 0, 0.056, 0.06, 0.058, WHITE, 1, 0, 10, 8);
  k.lathe(0, -0.3, 0, [[0.05, 0], [0.058, 0.1], [0.064, 0.22], [0.066, 0.3]], WHITE, 10, 1);
});
// forearm from the elbow, ending in a hand (c1 sleeve or skin, c2 skin)
const forearmGeo = () => kit((k) => {
  k.surf('fabric');
  k.lathe(0, -0.25, 0, [[0.04, 0], [0.047, 0.12], [0.054, 0.25], [0.05, 0.27]], WHITE, 10, 1);
  k.surf('skin');
  k.cyl(0, -0.265, 0, 0.034, 0.03, WHITE, 8, 2);
  k.rbox(0, -0.33, 0.0, 0.07, 0.1, 0.03, 0.014, WHITE, 2);
  k.rbox(0, -0.395, 0.0, 0.064, 0.05, 0.026, 0.012, WHITE, 2, 0, [0.25, 0, 0]);
  k.rbox(0.036, -0.32, 0.018, 0.022, 0.06, 0.022, 0.01, WHITE, 2, 0, [0.3, 0, 0.5]);
});
// thigh from the hip joint (c1 trousers)
const thighGeo = () => kit((k) => {
  k.surf('denim');
  k.lathe(0, -0.44, 0, [[0.062, 0], [0.072, 0.15], [0.085, 0.34], [0.09, 0.44]], WHITE, 12, 1);
  k.ball(0, -0.44, 0, 0.066, 0.06, 0.07, WHITE, 1, 0, 10, 8);
});
// shin from the knee, ending in a shoe (c1 trousers, c2 shoes)
const shinGeo = () => kit((k) => {
  k.surf('denim');
  k.lathe(0, -0.4, 0, [[0.058, 0], [0.06, 0.1], [0.07, 0.3], [0.066, 0.42]], WHITE, 12, 1);
  k.surf('leather');
  k.rbox(0, -0.425, 0.045, 0.1, 0.075, 0.25, 0.035, WHITE, 2);
  k.surf('rubber');
  k.rbox(0, -0.458, 0.045, 0.104, 0.022, 0.256, 0.01, '#1a1816');
});

const hatGeo = () => kit((k) => {
  k.surf('fabric');
  k.lathe(0, 0.19, -0.005, [[0.118, 0], [0.12, 0.05], [0.1, 0.1], [0, 0.115]], WHITE, 14, 1);
  k.rbox(0, 0.2, 0.1, 0.2, 0.014, 0.12, 0.006, WHITE, 1, 0, [-0.1, 0, 0]);
  k.surf('chrome'); k.box(0, 0.25, 0.115, 0.04, 0.04, 0.01, '#d8c070');
});
const umbrellaGeo = () => kit((k) => {
  k.surf('metal'); k.cyl(0, 0.45, 0, 0.01, 0.9, '#222222', 5);
  k.surf('fabric');
  k.lathe(0, 0.82, 0, [[0.6, 0], [0.5, 0.12], [0.3, 0.2], [0, 0.24]], WHITE, 10, 1);
  k.surf('plastic'); k.tube([[0, 0.02, 0], [0, -0.06, 0], [0.04, -0.09, 0]], 0.012, '#2a2018', 4);
});
const toolGeo = () => kit((k) => { k.surf('metal'); k.rbox(0, -0.05, 0.25, 0.05, 0.05, 0.55, 0.015, '#3a3a3a'); });
const phoneGeo = () => kit((k) => { k.surf('glass'); k.rbox(0, 0, 0, 0.075, 0.15, 0.012, 0.008, '#101418'); });
const bagGeo = () => kit((k) => {
  k.surf('leather'); k.rbox(0, 0, 0, 0.26, 0.32, 0.12, 0.04, WHITE, 1);
  k.surf('fabric'); k.tube([[-0.08, 0.15, 0.05], [-0.1, 0.4, 0.0], [0.1, 0.42, 0.0], [0.08, 0.15, 0.05]], 0.012, '#2a2420', 4);
});

// ---------------------------------------------------------------- styles
const OUTFITS = ['tee', 'polo', 'suit', 'hoodie', 'dress'];
const SHOES = ['#2a2420', '#1a1a1c', '#f0f0ec', '#6a4a30', '#3a3a48', '#8a2a2a'];
const SUITED = new Set(['manager', 'bank manager', 'analyst', 'mayor', 'reporter', 'pit boss', 'dealer', 'receptionist', 'professor', 'teller']);

export class PeopleView {
  constructor(renderer, world, opts = {}) {
    this.R = renderer;
    this.world = world;
    this.onlyExtra = !!opts.onlyExtra;
    const U = renderer.U;
    const mat = makeInstMaterial(U, { key: 'ppl2', roughness: 0.75, metalness: 0.0, snow: false });
    const cap = opts.cap || 900;
    const scene = renderer.scene;
    const pool = (geo, n, shadow = true) => { const pl = new InstPool(geo, mat, n, { shadow, receive: true }); scene.add(pl.mesh); return pl; };
    this.torso = {};
    for (const form of [0, 1]) for (const o of OUTFITS) {
      if (o === 'dress' && form === 0) continue;
      this.torso[form + o] = pool(torsoGeo(form, o), Math.ceil(cap / (o === 'tee' ? 2 : 4)));
    }
    this.head = [pool(headGeo(0), cap), pool(headGeo(1), cap)];
    this.hair = {};
    for (const st of [0, 1, 2, 3, 5, 6]) this.hair[st] = pool(hairGeo(st), Math.ceil(cap / 2));
    this.beard = pool(beardGeo(), Math.ceil(cap / 3), false);
    this.upperArm = pool(upperArmGeo(), cap * 2);
    this.forearm = pool(forearmGeo(), cap * 2);
    this.thigh = pool(thighGeo(), cap * 2);
    this.shin = pool(shinGeo(), cap * 2);
    this.hat = pool(hatGeo(), Math.ceil(cap / 3), false);
    this.umbrella = pool(umbrellaGeo(), Math.ceil(cap / 2), false);
    this.tool = pool(toolGeo(), 60, false);
    this.phone = pool(phoneGeo(), 120, false);
    this.bag = pool(bagGeo(), Math.ceil(cap / 4), false);
    this.all = [...Object.values(this.torso), ...this.head, ...Object.values(this.hair), this.beard, this.upperArm, this.forearm, this.thigh, this.shin, this.hat, this.umbrella, this.tool, this.phone, this.bag];
    this.frustum = new THREE.Frustum();
    this.pm = new THREE.Matrix4();
    this.visible = [];
    this.umbrellaCols = ['#2a2a30', '#c03030', '#2a5aa0', '#e0b020', '#3a7a4a', '#7a3a8a'].map((c) => new THREE.Color(c));
    this.extra = []; // non-citizen figures (e.g. interior NPCs) supplied by other views
    this.season = 0;
  }

  // appearance for a citizen, including derived fields older saves don't have
  lookFor(c) {
    const role = c.job && (c.duty != null || c.working) ? c.job.role : null;
    const uni = role && UNIFORMS[role];
    const L = c.look;
    const id = c.id;
    const form = L.form ?? formOfName(c.first);
    let outfit = L.outfit ?? OUTFITS[Math.floor(hash01(id, 12) * (form ? 5 : 4))];
    if (role && SUITED.has(role)) outfit = 'suit';
    else if (uni) outfit = 'polo';
    let style = L.hairStyle;
    if (style === 4 && form === 1) style = 1;
    if (L.style6 ?? hash01(id, 13) < 0.12) style = form ? 6 : 5;
    const beard = form === 0 && (L.beard ?? hash01(id, 14) < 0.3) && c.age > 19;
    const grey = c.age > 58 ? Math.min(1, (c.age - 58) / 18) : 0;
    let hairCol = L.hair;
    if (grey > 0) { C3.set(hairCol).lerp(C2.set('#c8c8c4'), grey); hairCol = '#' + C3.getHexString(); }
    const shortSleeve = outfit === 'tee' || outfit === 'polo' || outfit === 'dress' ? (this.season === 1 || hash01(id, 15) < 0.35) : false;
    return {
      shirt: uni ? uni.shirt : L.shirt,
      pants: outfit === 'dress' ? L.skin : (uni ? uni.pants : L.pants),
      hat: uni && uni.hat ? uni.hat : L.hat ? L.shirt : null,
      skin: L.skin, hair: hairCol, h: c.age < 18 ? L.height * Math.min(1, 0.42 + c.age * 0.034) : L.height, b: c.age < 14 ? L.build * 0.92 : L.build, style, form, outfit: c.age < 12 && outfit === 'suit' ? 'tee' : outfit, beard: beard && c.age >= 18, shortSleeve,
      shoes: L.shoes || SHOES[Math.floor(hash01(id, 16) * SHOES.length)],
      bag: L.bag ?? (hash01(id, 17) < 0.18),
    };
  }

  update(dt) {
    const W = this.world;
    const cam = this.R.camera;
    this.season = W.season ?? 0;
    this.pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.pm);
    for (const pl of this.all) pl.begin();
    this.visible.length = 0;
    const cx = cam.position.x, cz = cam.position.z, cy = cam.position.y;
    const maxD = Math.max(240, cy * 2.2);
    for (const ped of this.onlyExtra ? [] : W.peds.list) {
      if (ped.hidden) continue;
      const d2 = (ped.x - cx) ** 2 + (ped.z - cz) ** 2;
      if (d2 > maxD * maxD) continue;
      sphere.center.set(ped.x, (ped.y || 0) + 1, ped.z); sphere.radius = 1.2;
      if (!this.frustum.intersectsSphere(sphere)) continue;
      const c = W.citizens[ped.cid];
      this.drawPerson(ped, this.lookFor(c), d2 < 70 * 70);
      this.visible.push(ped);
    }
    for (const f of this.extra) this.drawPerson(f, f.look, true);
    for (const pl of this.all) pl.end();
  }

  drawPerson(ped, L, detail) {
    const scale = L.h || 1;
    const act = ped.action || '';
    const moving = ped.v > 0.1 && ped.state === 'walk';
    const run = ped.run && moving;
    const ph = ped.anim || 0;
    const freq = run ? 1.6 : 1.25;
    const cyc = ph * freq;
    let swing = moving ? Math.sin(cyc) * (run ? 0.8 : 0.45) : 0;
    let bob = moving ? Math.abs(Math.cos(cyc)) * (run ? 0.07 : 0.03) : Math.sin(ph * 2) * 0.004;
    let lie = 0, sit = 0, kneel = 0, lean = run ? 0.16 : moving ? 0.04 : 0;
    if (act === 'down' || act === 'sleep' || ped.fallen > 0) lie = 1;
    if (act === 'sit') sit = 1;
    if (act === 'dance') { bob = Math.abs(Math.sin(ph * 3)) * 0.08; swing = Math.sin(ph * 3) * 0.3; }
    if (act === 'kneel' || act === 'repair' && (ped.id % 2 === 0)) kneel = 1;
    const form = L.form || 0;
    const B = L.b || 1;
    let y = (ped.y || 0) + bob;
    e.set(lie ? -Math.PI / 2 : lean, ped.h + (act === 'dance' ? Math.sin(ph * 1.5) * 0.4 : 0), 0, 'YXZ');
    if (lie) y += 0.16;
    q.setFromEuler(e);
    p.set(ped.x, y, ped.z);
    s.set(scale * B, scale, scale * (0.9 + B * 0.1));
    base.compose(p, q, s);
    if (lie) base.multiply(tmpM.makeTranslation(0, 0, -0.1));
    const hipY = sit ? 0.47 : kneel ? 0.52 : 0.9;
    // torso (slight counter-rotation while walking)
    part.makeTranslation(0, hipY, 0);
    if (moving) part.multiply(rot.makeRotationY(swing * 0.15));
    tmpM.multiplyMatrices(base, part);
    const shirt = C1.set(L.shirt), skin = C2.set(L.skin);
    const tp = this.torso[form + L.outfit] || this.torso[form + 'tee'];
    tp.add(tmpM, shirt, skin);
    const torsoM = tmpM.clone();
    if (L.bag && detail && !lie) {
      part.makeTranslation(0, 0.35, -0.17);
      tmpM.multiplyMatrices(torsoM, part);
      this.bag.add(tmpM, C3.set(L.pants).multiplyScalar(0.7), C3);
    }
    // head
    part.makeTranslation(0, 0.685, 0);
    if (act === 'phone') part.multiply(rot.makeRotationZ(0.15));
    if (act === 'talk') part.multiply(rot.makeRotationX(Math.sin(ph * 4) * 0.06));
    tmpM.multiplyMatrices(torsoM, part);
    const hairC = C3.set(L.hair);
    this.head[form].add(tmpM, skin, hairC);
    if (L.hat) { const hc = new THREE.Color(L.hat); this.hat.add(tmpM, hc, hc); }
    else if (L.style !== 4 && this.hair[L.style]) this.hair[L.style].add(tmpM, hairC, hairC);
    if (L.beard && detail) this.beard.add(tmpM, hairC, hairC);
    // legs: thigh at the hip, shin at the knee
    const pants = new THREE.Color(L.pants), shoes = new THREE.Color(L.shoes || '#2a2420');
    for (const side of [-1, 1]) {
      let a = swing * side, knee = 0;
      if (moving) knee = Math.max(0, Math.sin(cyc + (side > 0 ? 0 : Math.PI) + 1.2)) * (run ? 1.3 : 0.7);
      if (sit) { a = -Math.PI / 2; knee = Math.PI / 2; }
      if (kneel) { a = side > 0 ? -Math.PI / 2 : 0.1; knee = side > 0 ? Math.PI / 2 : Math.PI / 2 + 0.2; }
      part.makeTranslation(side * 0.1, hipY, 0);
      part.multiply(rot.makeRotationX(a));
      tmpM.multiplyMatrices(base, part);
      this.thigh.add(tmpM, pants, pants);
      joint.makeTranslation(0, -0.44, 0).multiply(rot.makeRotationX(knee));
      tmpM.multiply(joint);
      this.shin.add(tmpM, pants, shoes);
    }
    // arms: upper arm at the shoulder, forearm at the elbow
    const sleeve = L.shortSleeve ? skin : shirt;
    for (const side of [-1, 1]) {
      let ax = -swing * side * 0.9, az = side * 0.08, elbow = moving ? -0.25 - Math.max(0, -swing * side) * 0.6 : -0.12;
      if (act === 'hose' || act === 'repair' || act === 'build' || act === 'kneel' || act === 'carry') { ax = -1.1 + (act === 'build' || act === 'repair' ? Math.sin(ph * 6 + side) * 0.3 : 0); elbow = -0.4; }
      if (act === 'cuffed') { ax = 0.45; az = -side * 0.2; elbow = -0.6; }
      if (act === 'phone' && side > 0) { ax = -0.5; az = 0.25; elbow = -2.2; }
      if (act === 'hail' && side > 0) { ax = -2.8; az = 0.3; elbow = -0.1; }
      if (act === 'direct' && side > 0) { ax = -1.5; az = 1.2 + Math.sin(ph * 3) * 0.4; elbow = -0.2; }
      if (act === 'notes') { ax = -0.6; az = -side * 0.2; elbow = -1.1; }
      if (act === 'arrest' || act === 'aim') { ax = -1.45; az = -side * 0.12; elbow = -0.05; }
      if (act === 'wait' || act === 'watch') { ax = 0.05; elbow = -0.15; }
      if (act === 'sit') { ax = -0.35; elbow = -0.9; }
      if (act === 'dance') { ax = -1.6 + Math.sin(ph * 3 + side) * 0.9; az = side * (0.4 + Math.sin(ph * 2) * 0.3); elbow = -0.8; }
      if (act === 'talk' && side > 0) { ax = -0.4 + Math.sin(ph * 3) * 0.15; elbow = -1.2; }
      if (act === 'type' || act === 'cards') { ax = -0.55; az = -side * 0.12; elbow = -1.05; }
      if (act === 'drink' && side > 0) { ax = -0.3 + Math.sin(ph * 0.7) * 0.2; elbow = -2.0; }
      if (ped.umbrella && side > 0 && !act) { ax = -0.9; az = 0.25; elbow = -1.0; }
      if (run && !act) { ax *= 1.3; elbow = -1.4; }
      part.makeTranslation(side * (form ? 0.195 : 0.22), hipY + 0.53, 0);
      e.set(ax, 0, az, 'XYZ');
      part.multiply(rot.makeRotationFromEuler(e));
      tmpM.multiplyMatrices(base, part);
      this.upperArm.add(tmpM, shirt, skin);
      joint.makeTranslation(0, -0.3, 0).multiply(rot.makeRotationX(elbow));
      tmpM.multiply(joint);
      this.forearm.add(tmpM, sleeve, skin);
      if (side > 0 && detail) {
        if (act === 'hose' || act === 'build' || act === 'repair') { tmpM.multiply(joint.makeTranslation(0, -0.33, 0)); this.tool.add(tmpM, C3.set('#3a3a3a'), C3); }
        else if (act === 'phone' || act === 'text') { tmpM.multiply(joint.makeTranslation(0, -0.36, 0.04)); this.phone.add(tmpM, C3.set('#101418'), C3); }
      }
    }
    if (ped.umbrella && detail && !lie && !act) {
      part.makeTranslation(0.16, hipY + 0.5, 0.18);
      tmpM.multiplyMatrices(base, part);
      const uc = this.umbrellaCols[ped.id % this.umbrellaCols.length];
      this.umbrella.add(tmpM, uc, uc);
    }
  }
}
