// Vehicle rendering: one instanced mesh per vehicle model, re-filled each frame
// from the simulation. Models are built from tagged parts so paint, glass,
// headlights, brake lights and emergency light bars are driven per instance.
import * as THREE from 'three';
import { ModelKit, makeInstMaterial, InstPool } from './materials.js';
import { VTYPES } from '../sim/traffic.js';

const DARK = '#1c1d20', TIRE = '#141414', TRIM = '#3a3c40', CHROME = '#b8bcc0', GLASS = '#1a2430';

function wheels(k, len, wid, r = 0.34, front = 0.33, back = 0.32) {
  const zf = len * front, zb = -len * back;
  for (const z of [zf, zb]) for (const sx of [-1, 1]) {
    k.cyl(sx * (wid / 2 - 0.12), r, z, r, 0.26, TIRE, 12, 0, 0, [0, 0, Math.PI / 2]);
    k.cyl(sx * (wid / 2 - 0.02), r, z, r * 0.55, 0.06, '#8a8c90', 8, 0, 0, [0, 0, Math.PI / 2]);
  }
}
function lights(k, len, wid, y, opts = {}) {
  const hl = opts.hw ?? 0.32;
  for (const sx of [-1, 1]) {
    k.box(sx * (wid / 2 - 0.28), y, len / 2 + 0.01, hl, 0.14, 0.06, '#fff8e8', 0, 1);
    k.box(sx * (wid / 2 - 0.22), y + (opts.tailUp || 0), -len / 2 - 0.01, opts.tw ?? 0.34, opts.th ?? 0.14, 0.06, '#ff2a1a', 0, 2);
  }
}

function car(len, wid, opts = {}) {
  const k = new ModelKit();
  const base = 0.32, belt = opts.belt ?? 0.92, roof = opts.roof ?? 1.42;
  // lower body (painted), slightly tapered
  k.taper(0, base, 0, wid, len, wid * 0.97, len * 0.96, belt - base, '#ffffff', 1);
  // hood/trunk slope pieces
  const cabLen = len * (opts.cab ?? 0.48), cabOff = opts.cabOff ?? -0.06 * len;
  // greenhouse: glass band + painted roof
  k.taper(0, belt, cabOff, wid * 0.9, cabLen, wid * 0.78, cabLen * 0.72, roof - belt - 0.06, GLASS, 0, 7, -0.02);
  k.box(0, roof - 0.03, cabOff - 0.02, wid * 0.78, 0.07, cabLen * 0.72, '#ffffff', 1);
  // bumpers & trim
  k.box(0, base + 0.08, len / 2, wid * 0.98, 0.2, 0.12, TRIM);
  k.box(0, base + 0.08, -len / 2, wid * 0.98, 0.2, 0.12, TRIM);
  k.box(0, 0.42, 0, wid * 1.0, 0.1, len * 0.9, DARK);
  // grille
  k.box(0, base + 0.32, len / 2 + 0.005, wid * 0.42, 0.16, 0.04, '#202226');
  // mirrors
  for (const sx of [-1, 1]) k.box(sx * (wid / 2 + 0.06), belt + 0.06, cabOff + cabLen * 0.36, 0.12, 0.1, 0.16, '#ffffff', 1);
  lights(k, len, wid, base + 0.38);
  wheels(k, len, wid, opts.wheel ?? 0.33);
  return k;
}

function boxTruck(len, wid, hgt, cabLen, opts = {}) {
  const k = new ModelKit();
  const base = 0.45;
  // cab
  k.taper(0, base, len / 2 - cabLen / 2, wid, cabLen, wid * 0.96, cabLen * 0.86, 1.0, opts.cabColor || '#ffffff', opts.cabPaint ?? 1);
  k.taper(0, base + 1.0, len / 2 - cabLen / 2 - 0.08, wid * 0.96, cabLen * 0.86, wid * 0.9, cabLen * 0.6, 0.85, GLASS, 0, 7, -0.12);
  k.box(0, base + 1.9, len / 2 - cabLen / 2 - 0.2, wid * 0.9, 0.12, cabLen * 0.62, opts.cabColor || '#ffffff', opts.cabPaint ?? 1);
  // body box
  const bodyLen = len - cabLen - 0.15;
  if (opts.body !== false) k.box(0, base + (hgt - base) / 2 + 0.05, -len / 2 + bodyLen / 2, wid * 1.0, hgt - base, bodyLen, opts.bodyColor || '#ffffff', opts.bodyPaint ?? 1);
  k.box(0, base - 0.05, 0, wid * 0.96, 0.2, len * 0.96, DARK);
  k.box(0, base + 0.1, len / 2, wid, 0.25, 0.12, TRIM);
  lights(k, len, wid, base + 0.4, { tailUp: 0.2 });
  wheels(k, len, wid, 0.42, 0.34, 0.3);
  return k;
}

function lightbar(k, y, z, w = 1.2) {
  k.box(0, y, z, w, 0.12, 0.3, '#202020');
  k.box(-w / 4, y + 0.08, z, w / 2 - 0.04, 0.1, 0.26, '#ff2020', 0, 3);
  k.box(w / 4, y + 0.08, z, w / 2 - 0.04, 0.1, 0.26, '#2040ff', 0, 4);
}

export function buildVehicleModels() {
  const M = {};
  for (const t of ['hatch', 'sedan', 'oldsedan', 'suv', 'sports', 'taxi', 'police']) {
    const T = VTYPES[t];
    const o = { hatch: { cab: 0.55, cabOff: -0.25 }, sedan: {}, oldsedan: { roof: 1.48, cab: 0.44 }, suv: { belt: 1.1, roof: 1.72, cab: 0.6, cabOff: -0.4, wheel: 0.38 }, sports: { belt: 0.78, roof: 1.18, cab: 0.4, cabOff: -0.2 }, taxi: {}, police: {} }[t];
    const k = car(T.len, T.wid, o);
    if (t === 'taxi') { k.box(0, 1.52, -0.3, 0.7, 0.2, 0.3, '#f8e070', 0, 5); }
    if (t === 'police') {
      lightbar(k, 1.47, -0.25);
      // dark lower doors (black & white scheme)
      k.box(0, 0.62, 0.0, T.wid + 0.01, 0.42, T.len * 0.42, '#16181c');
      k.box(0, 0.62, T.len * 0.42, T.wid + 0.005, 0.1, 0.4, '#16181c');
    }
    if (t === 'sports') k.box(0, 1.0, -T.len / 2 + 0.25, T.wid * 0.9, 0.06, 0.3, '#ffffff', 1);
    M[t] = k.build();
  }
  // pickups
  for (const t of ['pickup', 'oldpickup']) {
    const T = VTYPES[t];
    const k = new ModelKit();
    const base = 0.42, belt = 1.05;
    k.taper(0, base, 0, T.wid, T.len, T.wid * 0.97, T.len * 0.97, belt - base, '#ffffff', 1);
    k.taper(0, belt, T.len * 0.08, T.wid * 0.9, T.len * 0.34, T.wid * 0.82, T.len * 0.26, 0.7, GLASS, 0, 7, -0.05);
    k.box(0, belt + 0.7, T.len * 0.06, T.wid * 0.82, 0.08, T.len * 0.26, '#ffffff', 1);
    // bed walls
    k.box(0, belt - 0.02, -T.len * 0.3, T.wid * 0.86, 0.06, T.len * 0.36, '#2a2a2a');
    k.box(T.wid / 2 - 0.05, belt + 0.18, -T.len * 0.28, 0.08, 0.4, T.len * 0.42, '#ffffff', 1);
    k.box(-T.wid / 2 + 0.05, belt + 0.18, -T.len * 0.28, 0.08, 0.4, T.len * 0.42, '#ffffff', 1);
    k.box(0, belt + 0.18, -T.len / 2 + 0.06, T.wid, 0.4, 0.08, '#ffffff', 1);
    k.box(0, base + 0.1, T.len / 2, T.wid, 0.24, 0.14, t === 'oldpickup' ? CHROME : TRIM);
    k.box(0, base + 0.1, -T.len / 2, T.wid, 0.24, 0.14, t === 'oldpickup' ? CHROME : TRIM);
    lights(k, T.len, T.wid, base + 0.42);
    wheels(k, T.len, T.wid, 0.4);
    M[t] = k.build();
  }
  // vans & trucks
  {
    const T = VTYPES.van;
    const k = new ModelKit();
    const base = 0.42;
    k.taper(0, base, 0, T.wid, T.len, T.wid * 0.96, T.len * 0.94, 1.0, '#ffffff', 1);
    k.taper(0, base + 1.0, -0.2, T.wid * 0.96, T.len * 0.9, T.wid * 0.9, T.len * 0.8, 0.85, '#ffffff', 1, 0, -0.15);
    k.taper(0, base + 1.0, T.len * 0.34, T.wid * 0.94, 0.9, T.wid * 0.9, 0.5, 0.8, GLASS, 0, 7, -0.2);
    for (const sx of [-1, 1]) k.box(sx * (T.wid / 2 - 0.0), base + 1.35, 0.2, 0.04, 0.45, 1.2, GLASS, 0, 7);
    lights(k, T.len, T.wid, base + 0.4);
    wheels(k, T.len, T.wid, 0.38);
    M.van = k.build();
  }
  {
    const T = VTYPES.delivery;
    const k = boxTruck(T.len, T.wid, T.hgt, 1.9, { bodyColor: '#f0eee8', bodyPaint: 0 });
    k.box(T.wid / 2 + 0.01, 1.6, -0.9, 0.02, 0.8, 2.6, '#c84a2a');
    k.box(-T.wid / 2 - 0.01, 1.6, -0.9, 0.02, 0.8, 2.6, '#c84a2a');
    M.delivery = k.build();
  }
  {
    const T = VTYPES.ambulance;
    const k = boxTruck(T.len, T.wid, T.hgt, 2.0, { bodyColor: '#f4f4f4', bodyPaint: 0, cabColor: '#f4f4f4', cabPaint: 0 });
    for (const sx of [-1, 1]) {
      k.box(sx * (T.wid / 2 + 0.01), 1.25, -0.6, 0.02, 0.3, T.len - 2.4, '#d02020');
      k.box(sx * (T.wid / 2 + 0.015), 1.95, -1.0, 0.02, 0.7, 0.24, '#d02020');
      k.box(sx * (T.wid / 2 + 0.015), 1.95, -1.0, 0.02, 0.24, 0.7, '#d02020');
    }
    lightbar(k, 2.35, 1.9, 1.3);
    k.box(-0.8, T.hgt + 0.12, -T.len / 2 + 0.2, 0.3, 0.2, 0.2, '#ff2020', 0, 3);
    k.box(0.8, T.hgt + 0.12, -T.len / 2 + 0.2, 0.3, 0.2, 0.2, '#2040ff', 0, 4);
    M.ambulance = k.build();
  }
  {
    const T = VTYPES.firetruck;
    const k = boxTruck(T.len, T.wid, 2.6, 2.4, { bodyColor: '#c8221a', bodyPaint: 0, cabColor: '#c8221a', cabPaint: 0 });
    // compartments, ladder, light bar
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) k.box(sx * (T.wid / 2 + 0.01), 1.45, -3.2 + i * 1.7, 0.02, 1.4, 1.4, '#b8bcc0');
    k.box(0, 2.95, -0.8, 0.9, 0.18, 7.2, CHROME);
    for (let i = 0; i < 12; i++) k.box(0, 3.07, -4.2 + i * 0.6, 0.85, 0.06, 0.06, '#8a8c90');
    lightbar(k, 2.5, 3.2, 1.6);
    k.box(0, 1.0, T.len / 2 + 0.05, T.wid * 0.9, 0.12, 0.08, '#f0f0f0');
    M.firetruck = k.build();
  }
  {
    const T = VTYPES.bus;
    const k = new ModelKit();
    const base = 0.45;
    k.box(0, base + 0.55, 0, T.wid, 1.1, T.len, '#ffffff', 1);
    k.box(0, base + 1.65, 0, T.wid + 0.02, 1.1, T.len - 0.2, GLASS, 0, 7);
    k.box(0, base + 2.45, 0, T.wid, 0.5, T.len, '#f0f0f0');
    k.box(0, base + 2.75, -1.0, 1.6, 0.25, 3.0, '#d0d0d0');
    // destination sign
    k.box(0, base + 2.45, T.len / 2 + 0.02, 1.6, 0.28, 0.04, '#ffb020', 0, 5);
    for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) k.box(sx * (T.wid / 2 + 0.015), base + 1.65, -T.len / 2 + 1.4 + i * 2.1, 0.02, 1.0, 0.12, '#f0f0f0');
    k.box(0, base, 0, T.wid * 0.96, 0.25, T.len * 0.97, DARK);
    lights(k, T.len, T.wid, base + 0.5, { tailUp: 0.5 });
    wheels(k, T.len, T.wid, 0.48, 0.36, 0.28);
    M.bus = k.build();
  }
  {
    const T = VTYPES.tow;
    const k = boxTruck(T.len, T.wid, 1.1, 2.2, { body: false, cabColor: '#ffffff', cabPaint: 1 });
    k.box(0, 1.0, -1.4, T.wid, 0.3, 3.6, '#2a2a2e');
    k.box(0, 1.9, -2.6, 0.3, 1.6, 0.3, '#e8a020', 0, 0, [0.5, 0, 0]);
    k.box(0, 2.4, -1.8, 0.24, 0.24, 2.0, '#e8a020', 0, 0, [-0.35, 0, 0]);
    k.box(-0.5, 2.4, 0.4, 0.3, 0.14, 0.2, '#ffa020', 0, 6);
    k.box(0.5, 2.4, 0.4, 0.3, 0.14, 0.2, '#ffa020', 0, 6);
    M.tow = k.build();
  }
  {
    const T = VTYPES.utility;
    const k = boxTruck(T.len, T.wid, 1.6, 2.1, { bodyColor: '#f0f0ec', bodyPaint: 0 });
    k.box(0, 2.05, -1.5, 0.3, 0.3, 2.6, '#f0c020');
    k.box(0, 2.4, -2.9, 0.9, 0.7, 0.9, '#f0c020');
    k.box(-0.5, 2.45, 0.4, 0.3, 0.14, 0.2, '#ffa020', 0, 6);
    k.box(0.5, 2.45, 0.4, 0.3, 0.14, 0.2, '#ffa020', 0, 6);
    M.utility = k.build();
  }
  {
    const T = VTYPES.construction;
    const k = boxTruck(T.len, T.wid, 1.0, 2.2, { body: false });
    k.taper(0, 1.0, -1.2, T.wid, 3.4, T.wid * 1.05, 3.6, 1.1, '#c0a060', 0);
    k.box(-0.5, 2.45, 0.6, 0.3, 0.14, 0.2, '#ffa020', 0, 6);
    k.box(0.5, 2.45, 0.6, 0.3, 0.14, 0.2, '#ffa020', 0, 6);
    M.construction = k.build();
  }
  return M;
}

const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpP = new THREE.Vector3(), tmpS = new THREE.Vector3(1, 1, 1);
const col = new THREE.Color(), col2 = new THREE.Color(1, 1, 1);
const sphere = new THREE.Sphere();

export class VehicleView {
  constructor(renderer, world) {
    this.R = renderer;
    this.world = world;
    const models = buildVehicleModels();
    const mat = makeInstMaterial(renderer.U, { key: 'veh', roughness: 0.55, metalness: 0.2, snow: true });
    this.mat = mat;
    this.pools = {};
    const counts = {};
    for (const v of world.traffic.vehicles) counts[v.type] = (counts[v.type] || 0) + 1;
    for (const t in models) {
      const p = new InstPool(models[t], mat, Math.max(16, (counts[t] || 0) * 2 + 40), { shadow: true, receive: true });
      renderer.scene.add(p.mesh);
      this.pools[t] = p;
    }
    // headlight beams on the ground (additive)
    const beamTex = new THREE.CanvasTexture((() => {
      const c = document.createElement('canvas'); c.width = 64; c.height = 128;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 120, 4, 32, 70, 70);
      gr.addColorStop(0, 'rgba(255,240,210,0.9)'); gr.addColorStop(0.6, 'rgba(255,230,190,0.25)'); gr.addColorStop(1, 'rgba(255,230,190,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(26, 128); g.lineTo(38, 128); g.lineTo(64, 0); g.lineTo(0, 0); g.closePath(); g.fill();
      return c;
    })());
    const bg = new THREE.PlaneGeometry(5, 11).rotateX(-Math.PI / 2).translate(0, 0, 5.5);
    this.beamMat = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5, color: '#ffe8c0' });
    this.beams = new THREE.InstancedMesh(bg, this.beamMat, 400);
    this.beams.frustumCulled = false;
    this.beams.renderOrder = 3;
    renderer.scene.add(this.beams);
    // emergency glow sprites (bloom catches them)
    const gl = new THREE.SpriteMaterial({ color: new THREE.Color(3, 3, 3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, map: makeGlowTex() });
    this.glowGeo = new THREE.PlaneGeometry(1, 1);
    this.glowMat = new THREE.MeshBasicMaterial({ map: makeGlowTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, vertexColors: false });
    this.glows = new THREE.InstancedMesh(this.glowGeo, this.glowMat, 300);
    this.glows.frustumCulled = false;
    this.glows.renderOrder = 4;
    this.glows.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(300 * 3), 3);
    renderer.scene.add(this.glows);
    this.frustum = new THREE.Frustum();
    this.projM = new THREE.Matrix4();
    this.visible = [];
  }

  update(dt) {
    const W = this.world;
    const cam = this.R.camera;
    this.projM.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projM);
    for (const t in this.pools) this.pools[t].begin();
    const night = this.R.U.uNight.value;
    let nb = 0, ng = 0;
    const camPos = cam.position;
    const time = this.R.U.uTime.value;
    this.visible.length = 0;
    const beamOn = night > 0.25;
    for (const v of W.traffic.vehicles) {
      if (v.hidden || v.state === 'garage' || v.state === 'repair' || v.state === 'gone') continue;
      let x = v.x, y = v.y, z = v.z, h = v.h;
      if (v.state === 'abstract') {
        if (!v.abs) continue;
        const t = Math.min(1, Math.max(0, (W.time - v.abs.t0) / (v.abs.t1 - v.abs.t0 || 1)));
        continue;
      }
      if (v.state === 'towed') {
        const tv = W.traffic.byId.get(v.towedBy);
        if (tv) { x = tv.x - Math.sin(tv.h) * (tv.len / 2 + v.len / 2 - 0.6); z = tv.z - Math.cos(tv.h) * (tv.len / 2 + v.len / 2 - 0.6); y = tv.y + 0.6; h = tv.h; v.x = x; v.z = z; v.h = h; v.y = y; }
      }
      sphere.center.set(x, y + 1, z); sphere.radius = v.len * 0.6 + 1;
      if (!this.frustum.intersectsSphere(sphere)) continue;
      const pool = this.pools[v.type];
      if (!pool) continue;
      // body pitch under accel/brake, roll from steering
      const pitch = v.state === 'towed' ? -0.08 : (v.a ? -v.a * 0.006 : 0);
      const roll = v.state === 'free' ? (v.av || 0) * v.speed * -0.004 : 0;
      tmpE.set(pitch, h, roll, 'YXZ');
      tmpQ.setFromEuler(tmpE);
      tmpP.set(x, y, z);
      tmpM.compose(tmpP, tmpQ, tmpS);
      col.set(v.color);
      const lights = v.lightsOn || night > 0.35 || W.weather.precip > 0.5 || W.weather.fog > 0.4 ? 1 : 0;
      const occupied = v.driver != null || v.player || v.state === 'lane';
      const sirenOn = v.siren || v.sceneLights && v.isStaticObstacle ? 1 : (v.type === 'tow' || v.type === 'utility' || v.type === 'construction') && v.isStaticObstacle ? 1 : 0;
      pool.add(tmpM, col, col2, occupied ? lights : 0, v.brake || (v.state === 'lane' && v.v < 0.3 && occupied) ? 1 : 0, sirenOn, v.damage);
      this.visible.push(v);
      const d2 = (x - camPos.x) ** 2 + (z - camPos.z) ** 2;
      if (beamOn && lights && occupied && nb < 400 && d2 < 420 * 420 && v.state !== 'parked') {
        tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), h);
        tmpP.set(x + Math.sin(h) * v.len * 0.45, y + 0.06, z + Math.cos(h) * v.len * 0.45);
        tmpS.set(1, 1, 1);
        tmpM.compose(tmpP, tmpQ, tmpS);
        this.beams.setMatrixAt(nb++, tmpM);
      }
      if (sirenOn && ng < 296 && d2 < 600 * 600) {
        const ph = Math.floor(time * 4.6 + v.id) % 2;
        const top = v.T.hgt + 0.2;
        for (const side of [-1, 1]) {
          const on = (side < 0) === (ph === 0);
          const c = v.type === 'tow' || v.type === 'utility' || v.type === 'construction' ? [2.5, 1.2, 0.1] : side < 0 ? [3, 0.2, 0.15] : [0.25, 0.45, 3.5];
          const s = on ? 2.4 : 0.0001;
          tmpP.set(x + Math.cos(h) * side * 0.45, y + top, z - Math.sin(h) * side * 0.45);
          tmpM.makeScale(s, s, s);
          tmpM.lookAt(new THREE.Vector3(), new THREE.Vector3().subVectors(camPos, tmpP), new THREE.Vector3(0, 1, 0));
          tmpM.scale(new THREE.Vector3(s, s, s));
          tmpM.setPosition(tmpP);
          this.glows.setMatrixAt(ng, tmpM);
          this.glows.instanceColor.setXYZ(ng, c[0], c[1], c[2]);
          ng++;
        }
      }
    }
    tmpS.set(1, 1, 1);
    for (const t in this.pools) this.pools[t].end();
    this.beams.count = nb;
    this.beams.instanceMatrix.needsUpdate = true;
    this.beamMat.opacity = Math.min(1, night * 1.3) * 0.45;
    this.glows.count = ng;
    this.glows.instanceMatrix.needsUpdate = true;
    this.glows.instanceColor.needsUpdate = true;
  }
}

export function makeGlowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}
