// The Market–Engineering tramline: an elevated track that dives through the deck
// into the Lower Decks, and the tram itself — a moving room you ride in.
import * as THREE from 'three';
import { Builder } from './builder.js';
import { clamp, damp, smoothstep } from '../core/util.js';
import { sign } from './props.js';

export const TRAM_PATH = [
  [158, 5.55, -127.2], [140, 5.55, -127.2], [118, 5.6, -127.4], [96, 5.8, -128.5], [76, 5.6, -136], [62, 4.6, -150], [55, 1.5, -166],
  [52, -6, -184], [52, -16, -200], [56, -26, -214], [66, -33.6, -224], [86, -36.9, -229], [106, -37.0, -229.2], [128, -37.0, -229.2],
].map(p => new THREE.Vector3(...p));

export class Tram {
  constructor(game, lights) {
    this.game = game;
    this.curve = new THREE.CatmullRomCurve3(TRAM_PATH, false, 'catmullrom', 0.3);
    this.len = this.curve.getLength();
    this.buildTrack();
    this.buildCar();
    this.s = 0;            // distance along the track (0 = Market, len = Engineering)
    this.dir = 1; this.v = 0; this.state = 'docked'; this.dwell = 0;
    this.stops = [{ s: 0, name: 'Market Station' }, { s: this.len - 0.01, name: 'Engineering Stop' }];
    this.doorOpen = 1; this.riding = false;
    this.place();
  }
  buildTrack() {
    const g = this.game, root = new THREE.Group(); g.engine.cityRoot.add(root);
    const b = new Builder(g, root, { cell: 60 });
    const N = Math.ceil(this.len / 1.5);
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i <= N; i++) {
      const t = i / N, p = this.curve.getPointAt(t), tan = this.curve.getTangentAt(t);
      const side = new THREE.Vector3().crossVectors(tan, up).normalize();
      const ry = Math.atan2(tan.x, tan.z);
      b.box('wood', [p.x, p.y - 0.12, p.z], [2.4, 0.14, 0.3], { ry: ry + Math.PI / 2 - Math.PI / 2, color: 0x5a4a3a, collide: false, ao: false, tex: 1 });
      if (i % 8 === 0) {
        // supports: pylons down to the deck where above it, girders hang from the ceiling below it
        if (p.y > 1) { b.box('darkSteel', [p.x, p.y / 2 - 0.3, p.z], [0.7, Math.max(0.5, p.y - 0.4), 0.7], { color: 0x4a4a48, collide: false }); }
        else if (p.y < -9) { b.box('darkSteel', [p.x, (p.y - 8) / 2 - 0.4, p.z], [0.6, Math.max(0.5, -8 - p.y - 0.6), 0.6], { color: 0x4a4a48, collide: false }); }
        b.box('darkSteel', [p.x, p.y - 0.35, p.z], [3.4, 0.4, 0.5], { ry: ry + Math.PI / 2 - Math.PI / 2, color: 0x4a4a48, collide: false });
      }
    }
    // rails
    for (const off of [-0.72, 0.72]) {
      const pts = [];
      for (let i = 0; i <= 200; i++) { const t = i / 200, p = this.curve.getPointAt(t), tan = this.curve.getTangentAt(t); const side = new THREE.Vector3().crossVectors(tan, up).normalize(); pts.push(p.clone().addScaledVector(side, off)); }
      b.path('steel', pts, 0.06, { segs: 400, radial: 5, color: 0xb0b0b0 });
    }
    // portal where the line dives through the deck (around z -150..-175)
    b.box('concrete', [58, 2.5, -166], [9, 7, 2], { color: 0x6a665e, collide: false });
    b.box('hazard', [58, 5.7, -165.2], [7, 0.6, 0.3], { collide: false, tex: 1 });
    sign(g, root, 'DECK PORTAL 7 · LOWER DECKS', [58, 4.4, -164.9], { w: 5, h: 0.5, neon: false, color: '#e8e0d0', bg: '#3a3a3a', font: '700 34px "Barlow Condensed", sans-serif' });
    // the deck around the portal so the player can't see into the void while riding
    b.box('concrete', [70, -0.2, -150], [50, 0.4, 40], { color: 0x8a847a, collide: false });
    b.finalize();
  }
  buildCar() {
    const g = this.game, M = g.materials;
    const car = this.car = new THREE.Group(); car.name = 'tram';
    g.engine.cityRoot.add(car);
    const b = new Builder(g, car, { cell: 1000 });
    const L = 11, W = 2.8, H = 3.0;
    // floor, roof, ends, window posts
    b.box('wood', [0, 0.1, 0], [W, 0.2, L], { color: 0x7a5a3a, collide: false, tex: 1.5 });
    b.box('paint', [0, -0.3, 0], [W + 0.1, 0.6, L + 0.1], { color: 0x2f5a6a, collide: false, ao: false });
    b.box('paint', [0, H + 0.1, 0], [W + 0.2, 0.25, L + 0.2], { color: 0xd8d0c0, collide: false, ao: false });
    b.box('paint', [0, H + 0.3, 0], [W - 0.4, 0.3, L - 2], { color: 0x5a5a5a, collide: false, ao: false });
    for (const sz of [-1, 1]) { b.box('paint', [0, H / 2, sz * L / 2], [W + 0.1, H, 0.12], { color: 0x2f5a6a, collide: false, ao: false }); b.box('glass', [0, H * 0.62, sz * (L / 2 + 0.07)], [W - 0.6, 1.1, 0.04], { collide: false }); b.box('lampWarm', [sz * 0 + 0.9, 0.55, sz * (L / 2 + 0.08)], [0.3, 0.2, 0.04], { collide: false, ao: false }); b.box('lampWarm', [-0.9, 0.55, sz * (L / 2 + 0.08)], [0.3, 0.2, 0.04], { collide: false, ao: false }); }
    for (const sx of [-1, 1]) {
      b.box('paint', [sx * W / 2, 0.55, 0], [0.1, 0.9, L], { color: 0x2f5a6a, collide: false, ao: false });
      b.box('paint', [sx * W / 2, 0.98, 0], [0.12, 0.06, L], { color: 0xd8a040, collide: false, ao: false });
      for (let z = -L / 2 + 0.3; z <= L / 2 - 0.3; z += 1.7) b.box('paint', [sx * W / 2, H * 0.62, z], [0.1, H * 0.76, 0.12], { color: 0xd8d0c0, collide: false, ao: false });
      b.box('glass', [sx * W / 2, 2.0, 0], [0.04, 1.6, L - 0.4], { collide: false });
    }
    // bench seats along both sides
    for (const sx of [-1, 1]) {
      b.box('wood', [sx * 1.05, 0.48, 0], [0.55, 0.08, L - 3.2], { color: 0x8a5a3a, collide: false, tex: 1 });
      b.box('wood', [sx * 1.3, 0.85, 0], [0.06, 0.65, L - 3.2], { color: 0x8a5a3a, collide: false, tex: 1 });
    }
    b.tube('steel', [0, 2.6, -L / 2 + 0.4], [0, 2.6, L / 2 - 0.4], 0.025);
    for (let z = -L / 2 + 1; z < L / 2; z += 1.5) b.tube('steel', [0, 2.6, z], [0, 2.3, z], 0.01);
    b.box('lampWarm', [0, H - 0.05, 0], [0.15, 0.04, L - 1], { collide: false, ao: false });
    // bogies
    for (const sz of [-1, 1]) { b.box('darkSteel', [0, -0.75, sz * 3.6], [2.2, 0.5, 2.4], { color: 0x2a2a2a, collide: false, ao: false }); for (const sx of [-0.75, 0.75]) b.cyl('darkSteel', [sx, -0.85, sz * 3.6], 0.4, 0.15, { rz: Math.PI / 2, color: 0x3a3a3a, seg: 12 }); }
    b.finalize();
    // destination sign
    sign(g, car, 'ENGINEERING', [0, H - 0.2, L / 2 + 0.09], { w: 1.8, h: 0.3, color: '#ffb35c', intensity: 2, tw: 256, th: 48, font: '700 36px "Barlow Condensed", sans-serif' });
    // doors (sliding panels) on the +x side (platform side)
    this.doors = [];
    for (const z of [-2.2, 2.2]) {
      const d = new THREE.Group(); d.position.set(W / 2 + 0.06, 0, z); car.add(d);
      const db = new Builder(g, d, { cell: 1000 });
      db.box('paint', [0, 1.2, -0.45], [0.06, 2.3, 0.9], { color: 0x2f5a6a, collide: false, ao: false });
      db.box('paint', [0, 1.2, 0.45], [0.06, 2.3, 0.9], { color: 0x2f5a6a, collide: false, ao: false });
      db.finalize();
      this.doors.push(d);
    }
    // seats (sockets for the player and passengers)
    this.seats = [];
    for (const [x, z] of [[1.0, -3.2], [-1.0, -3.2], [-1.0, -1.0], [-1.0, 1.4], [1.0, 3.4], [-1.0, 3.6], [1.0, -0.6]]) {
      const s = new THREE.Object3D(); s.position.set(x, 0.48 - 0.0, z); s.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2; car.add(s); this.seats.push(s);
    }
    this.light = new THREE.PointLight(0xffd8a8, 6, 9, 2); this.light.position.set(0, 2.6, 0); car.add(this.light);
    // kinematic collider for the car body (floor + walls) so the player can walk inside when docked
    this.kin = g.physics.addKinematic(car, [
      { type: 'box', hx: W / 2, hy: 0.1, hz: L / 2, pos: { x: 0, y: 0.1, z: 0 } },
      { type: 'box', hx: 0.06, hy: H / 2, hz: L / 2, pos: { x: -W / 2, y: H / 2, z: 0 } },
      { type: 'box', hx: W / 2, hy: H / 2, hz: 0.06, pos: { x: 0, y: H / 2, z: -L / 2 } },
      { type: 'box', hx: W / 2, hy: H / 2, hz: 0.06, pos: { x: 0, y: H / 2, z: L / 2 } },
    ]);
  }
  place() {
    const u = clamp(this.s / this.len, 0, 1);
    const p = this.curve.getPointAt(u), tan = this.curve.getTangentAt(u);
    this.car.position.copy(p);
    this.car.rotation.set(0, 0, 0);
    this.car.lookAt(p.clone().add(tan));
    // lookAt points +z at the target; car's nose is +z
    this.doors.forEach((d, i) => { d.children[0].children.forEach(m => {}); });
    const o = this.doorOpen;
    this.doors.forEach(d => { const [a, b2] = d.children; if (a) a.position.z = -0.0 - o * 0.85; if (b2) b2.position.z = o * 0.85; });
  }
  // Ride to the other end. Returns a promise resolved on arrival.
  depart() {
    if (this.state !== 'docked') return Promise.resolve();
    this.state = 'closing'; this.closeT = 0;
    this.dir = this.s < this.len / 2 ? 1 : -1;
    this.game.audio.chime(this.car.position.clone());
    return new Promise(res => { this.onArrive = res; });
  }
  update(dt) {
    const g = this.game;
    if (this.state === 'closing') {
      this.closeT += dt; this.doorOpen = Math.max(0, 1 - this.closeT / 1.2);
      if (this.closeT === dt) g.audio.doorSlide(this.car.position.clone());
      if (this.closeT > 1.6) this.state = 'moving';
    } else if (this.state === 'moving') {
      const target = this.dir > 0 ? this.len : 0;
      const remain = Math.abs(target - this.s);
      const vmax = 8.5;
      const want = Math.min(vmax, Math.sqrt(2 * 1.2 * remain) + 0.3);
      this.v = damp(this.v, want, 1.2, dt);
      this.s += this.v * this.dir * dt;
      if ((this.dir > 0 && this.s >= target) || (this.dir < 0 && this.s <= target)) {
        this.s = target; this.v = 0; this.state = 'opening'; this.openT = 0; g.audio.chime(this.car.position.clone()); g.audio.doorSlide(this.car.position.clone());
      }
      // rumble
      this.rumbleT = (this.rumbleT || 0) - dt;
      if (this.rumbleT < 0 && this.v > 2) { this.rumbleT = 0.6 + Math.random() * 0.4; g.audio.clank(this.car.position.clone(), 0.12 * this.v / 8, 0.6); }
      g.audio.setBed('tram', 'machinery', this.riding ? 0.25 * this.v / 8 : 0, 0.5);
    } else if (this.state === 'opening') {
      this.openT += dt; this.doorOpen = Math.min(1, this.openT / 1.2);
      if (this.openT > 1.3) { this.state = 'docked'; g.audio.setBed('tram', 'machinery', 0, 0.5); const r = this.onArrive; this.onArrive = null; r?.(); }
    }
    this.place();
  }
  get atMarket() { return this.s < 1; }
  get atEngineering() { return this.s > this.len - 1; }
}
