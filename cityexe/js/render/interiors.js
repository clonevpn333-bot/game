// Interiors. Every building has an authored, fully furnished inside (see
// layouts.js): apartments with kitchens, bedrooms and bathrooms, suburban houses,
// lobbies, stores, restaurants, bars, nightclubs, lounges, a casino, banks with
// vaults, offices, schools, the police station's cells, hospital wards...
// The room is populated with the citizens who are actually inside the building
// right now, placed by their role: clerks behind counters, dealers at tables,
// DJs at the decks, bouncers at the door, students at desks, residents on the sofa.
import * as THREE from 'three';
import { makeInstMaterial } from './materials.js';
import { piece } from './furniture.js';
import { WEAPONS } from '../sim/combat.js';
import { Layout, LAYOUTS, SIZES } from './layouts.js';
import { PeopleView } from './peopleView.js';
import { BTYPES } from '../sim/economy.js';
import { clamp, dist, wrapAngle, damp } from '../core/math.js';
import { hash01, rand } from '../core/rng.js';

const STORE = new Set(['grocery', 'convenience', 'pharmacy', 'gas']);
const OFFICE = new Set(['office', 'news', 'cityhall', 'taxi', 'utility', 'busdepot', 'towyard', 'construction', 'powerplant']);

// which floorplan a building uses (for this visitor)
export function layoutFor(b, W, c, opt = {}) {
  const biz = b.bizId != null ? W.economy.biz[b.bizId] : null;
  const t = biz ? biz.type : null;
  const ctx = { type: t, color: biz ? BTYPES[t].color : null, biz };
  if (opt.key) return { key: opt.key, ctx };
  if (b.anomaly && b.anomaly.kind === 'building') return { key: 'anomaly', ctx };
  if (b.metro) return { key: 'metro', ctx };
  if (b.garage) return { key: 'garage', ctx };
  if (b.kind === 'house') return { key: 'house', ctx };
  if (b.civic === 'county') return { key: c && c.home === b.id && opt.home ? 'homestead' : 'farm', ctx };
  const resident = c && c.home === b.id;
  if (t) {
    if (resident && opt.home) return { key: 'apartment', ctx };
    if (STORE.has(t)) return { key: 'store', ctx };
    if (t === 'clothing' || t === 'electronics') return { key: 'boutique', ctx };
    if (t === 'mall') return { key: 'mall', ctx };
    if (t === 'restaurant') return { key: 'restaurant', ctx };
    if (t === 'cafe') return { key: 'cafe', ctx };
    if (t === 'bar') return { key: 'bar', ctx };
    if (t === 'nightclub') return { key: 'club', ctx };
    if (t === 'lounge') return { key: 'lounge', ctx };
    if (t === 'casino') return { key: 'casino', ctx };
    if (t === 'bank') return { key: 'bank', ctx };
    if (t === 'gunstore') return { key: 'gunstore', ctx };
    if (t === 'gym') return { key: 'gym', ctx };
    if (t === 'hotel') return { key: 'hotel', ctx };
    if (t === 'school' || t === 'college') return { key: 'school', ctx };
    if (t === 'police') return { key: 'police', ctx };
    if (t === 'fire') return { key: 'fire', ctx };
    if (t === 'hospital') return { key: 'hospital', ctx };
    if (t === 'factory' || t === 'warehouse') return { key: 'warehouse', ctx };
    if (t === 'autoshop') return { key: 'autoshop', ctx };
    if (t === 'metro') return { key: 'metro', ctx };
    if (OFFICE.has(t)) return { key: 'office', ctx };
  }
  if (b.resUnits > 0) return { key: resident ? 'apartment' : 'lobby', ctx };
  return { key: 'office', ctx };
}

// role -> spot type preference
const ROLE_SPOT = {
  dealer: 'dealer', 'pit boss': 'guard', dj: 'dj', performer: 'perform', bouncer: 'guard', 'security guard': 'guard', teacher: 'teach', professor: 'teach',
  bartender: 'bar_staff', cook: 'cook', server: 'staff', doctor: 'staff2', nurse: 'staff2', officer: 'desk', analyst: 'desk', clerk: 'staff', manager: 'desk',
  teller: 'staff', 'bank manager': 'desk', farmhand: 'staff', 'ranch hand': 'staff', 'farm manager': 'desk', receptionist: 'staff', janitor: 'stand', worker: 'stand', mechanic: 'stand', trainer: 'staff', firefighter: 'wait',
};
const SIT = new Set(['seat', 'sofa', 'desk', 'student', 'gamble', 'watch']);

export class Interiors {
  constructor(game) {
    this.game = game;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b0d10');
    this.U = game.renderer.U;
    // cutaway: everything above waist height between the camera and you is cut away, and the ceiling is hidden
    this.cut = { uCutC: { value: new THREE.Vector3() }, uCutD: { value: new THREE.Vector2(0, 1) }, uCutOn: { value: 1 }, uCeilY: { value: 3 } };
    this.mat = makeInstMaterial(this.U, { key: 'room', roughness: 0.7, snow: false, wet: false, cutaway: true, uniforms: this.cut });
    this.people = new PeopleView({ scene: this.scene, U: this.U, camera: game.renderer.camera }, game.world, { onlyExtra: true, cap: 90 });
    // a simple "room" environment so metal and chrome pick up reflections indoors
    {
      const env = new THREE.Scene();
      const shell = new THREE.Mesh(new THREE.BoxGeometry(20, 8, 20), new THREE.MeshBasicMaterial({ color: '#8a8278', side: THREE.BackSide }));
      env.add(shell);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({ color: '#3a342e' }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -3.9; env.add(floor);
      for (const [x, z, w, d] of [[-5, -4, 4, 1.2], [5, 3, 4, 1.2], [0, 0, 1.5, 6]]) {
        const lamp = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: '#fff4e0' }));
        lamp.material.color.multiplyScalar(4); lamp.rotation.x = Math.PI / 2; lamp.position.set(x, 3.9, z); env.add(lamp);
      }
      const win = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), new THREE.MeshBasicMaterial({ color: '#b8d0f0' }));
      win.material.color.multiplyScalar(2); win.position.set(0, 0.5, -9.9); env.add(win);
      this.scene.environment = game.renderer.pmrem.fromScene(env, 0.02).texture;
      this.scene.environmentIntensity = 0.55;
    }
    this.amb = new THREE.HemisphereLight('#fff8f0', '#504840', 0.55);
    this.scene.add(this.amb);
    this.room = null;
    this.b = null;
    this.figs = new Map();
    this.player = null;
    this.t = 0;
  }
  get W() { return this.game.world; }
  get active() { return !!this.room; }

  canEnter(b) { return b && b.kind !== 'substation' && b.state !== 'ruin' && b.state !== 'construction'; }

  enter(b, c, playerControlled, opt = {}) {
    if (this.room) this.clearRoom();
    this.b = b;
    this.c = c;
    const { key, ctx } = layoutFor(b, this.W, c, { home: opt.home ?? (c && c.home === b.id && !(b.bizId != null && opt.fromStreet)), key: opt.key });
    this.key = key; this.ctx = ctx; this.unitOf = opt.unitOf ?? (key === 'apartment' || key === 'homestead' ? c?.id : null);
    this.room = this.buildRoom(b, key, ctx);
    this.scene.add(this.room.group);
    const R = this.room;
    this.player = { id: -1, cid: c.id, x: R.door.x, z: R.door.z - 1.0, y: 0, h: Math.PI, v: 0, anim: 0, action: '', state: 'idle', player: true, vy: 0 };
    this.game.renderer.setScene(this.scene);
    const T = this.game.rig.third;
    T.dist = 7.5; T.height = 0.4; T.pitch = 0.82; T.lookY = 0.9; T.yaw = Math.PI;
    this.cut.uCeilY.value = R.outdoor ? 80 : R.H - 0.06;
    this.game.emit('interior', { b, kind: key });
    this.lastOcc = '';
    this.syncFigures(true);
  }

  exit(silent = false) {
    if (!this.room) return;
    const W = this.W, b = this.b, c = this.c;
    this.clearRoom();
    this.game.renderer.setScene(null);
    if (!silent && c && c.possessed) {
      if (b.civic === 'county') { W.time += 25; this.game.toast('Twenty-five minutes of two-lane road, and the skyline rises ahead.', 4); }
      W.citizenAI.leaveBuilding(c);
      if (c.ped) { this.game.possession.enterFoot(); this.game.rig.third.yaw = c.ped.h; }
      this.game.audio && this.game.audio.door();
    }
    this.game.emit('interiorExit', { b });
  }

  clearRoom() {
    if (!this.room) return;
    this.scene.remove(this.room.group);
    this.room.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material !== this.mat) o.material.dispose?.(); });
    this.room = null; this.b = null; this.player = null;
    this.figs.clear();
    this.people.extra.length = 0;
  }

  // ------------------------------------------------------------------ room building
  buildRoom(b, key, ctx) {
    const [w, d, h] = SIZES[key] || [14, 12, 3.2];
    const seed = b.id * 7919 + (this.unitOf != null ? this.unitOf * 31 : 0) + 17;
    const L = new Layout(w, d, h, seed);
    LAYOUTS[key](L, ctx, this.W, b);
    const group = new THREE.Group();
    // all static geometry in one draw (instanced mesh of one, so the shared surface shader applies)
    const geo = L.k.build();
    const im = new THREE.InstancedMesh(geo, this.mat, 1);
    im.setMatrixAt(0, new THREE.Matrix4());
    geo.setAttribute('iCol1', new THREE.InstancedBufferAttribute(new Float32Array([1, 1, 1]), 3));
    geo.setAttribute('iCol2', new THREE.InstancedBufferAttribute(new Float32Array([1, 1, 1]), 3));
    geo.setAttribute('iState', new THREE.InstancedBufferAttribute(new Float32Array([0.4, 0, 0, 0]), 4));
    im.frustumCulled = false;
    group.add(im);
    // windows: panes that follow the light outside
    const winMat = new THREE.MeshBasicMaterial({ color: '#9ec8ee', toneMapped: false });
    for (const wv of L.wins) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(wv.w, wv.h), winMat);
      m.position.set(wv.x, wv.y, wv.z); m.rotation.y = wv.ry; group.add(m);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(wv.w + 0.16, wv.h + 0.16), new THREE.MeshStandardMaterial({ color: '#e8e4dc', roughness: 0.8 }));
      f.position.set(wv.x - Math.sin(wv.ry) * 0.005, wv.y, wv.z - Math.cos(wv.ry) * 0.005); f.rotation.y = wv.ry; group.add(f);
    }
    // lights: the brightest few become real point lights
    const lights = [];
    const ranked = L.lights.slice().sort((a, b2) => b2.i - a.i).slice(0, 7);
    for (const l of ranked) {
      const pl = new THREE.PointLight(l.color, l.i * 1.6 * Math.min(1.6, (h / 3.6) ** 2), l.dist || Math.max(w, d) * 0.75, 1.3);
      pl.position.set(l.x, l.y, l.z);
      pl.userData = { base: pl.intensity, club: !!l.club, phase: hash01(l.x * 7, l.z * 3) * 6.28, color: new THREE.Color(l.color) };
      group.add(pl); lights.push(pl);
    }
    // animated pieces
    const anim = {};
    for (const a of L.anim) {
      if (a.type === 'dancefloor') {
        const tw = (a.x1 - a.x0) / a.n, td = (a.z1 - a.z0) / a.m;
        const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(tw * 0.94, 0.04, td * 0.94), new THREE.MeshBasicMaterial({ toneMapped: false }), a.n * a.m);
        let i = 0;
        const m4 = new THREE.Matrix4();
        for (let x = 0; x < a.n; x++) for (let z = 0; z < a.m; z++) { m4.makeTranslation(a.x0 + (x + 0.5) * tw, 0.02, a.z0 + (z + 0.5) * td); tiles.setMatrixAt(i, m4); tiles.setColorAt(i, new THREE.Color('#200020')); i++; }
        tiles.userData = a; group.add(tiles); anim.floor = tiles;
      }
      if (a.type === 'train') {
        const tm = new THREE.InstancedMesh(trainGeo(), this.mat, 1);
        tm.setMatrixAt(0, new THREE.Matrix4().makeTranslation(-200, -1.2, a.z));
        tm.frustumCulled = false; group.add(tm); anim.train = { mesh: tm, z: a.z };
      }
      if (a.type === 'vault') {
        const open = !!(this.W.heists && this.W.heists.vaultOpen(b.id));
        const vg = buildGeo(piece('vaultDoor', { open }));
        const vm = new THREE.InstancedMesh(vg, this.mat, 1);
        vm.setMatrixAt(0, new THREE.Matrix4().makeRotationY(-Math.PI / 2).setPosition(a.x, 0, a.z));
        vm.frustumCulled = false; group.add(vm); anim.vault = { mesh: vm, open, a };
        if (open) L.col = L.col.filter((cb) => cb.id !== 'vault');
      }
      if (a.type === 'clublights') anim.club = true;
    }
    // open-air plots (the outskirts): a sun / moon and the sky instead of a ceiling
    let sun = null;
    if (L.outdoor) {
      sun = new THREE.DirectionalLight('#fff2dc', 2);
      sun.position.set(18, 30, 12); sun.target.position.set(0, 0, 0);
      group.add(sun, sun.target);
    }
    return { group, W: w, D: d, H: h, door: L.door, spots: L.spots, col: L.col, acts: L.acts, winMat, lights, anim, key, outdoor: !!L.outdoor, sun };
  }

  // reopen the vault door (heist progress), rebuilding just that mesh
  setVaultOpen(open) {
    const R = this.room;
    if (!R || !R.anim.vault || R.anim.vault.open === open) return;
    const V = R.anim.vault;
    R.group.remove(V.mesh); V.mesh.geometry.dispose();
    const vm = new THREE.InstancedMesh(buildGeo(piece('vaultDoor', { open })), this.mat, 1);
    vm.setMatrixAt(0, new THREE.Matrix4().makeRotationY(-Math.PI / 2).setPosition(V.a.x, 0, V.a.z));
    vm.frustumCulled = false; R.group.add(vm); V.mesh = vm; V.open = open;
    if (open) R.col = R.col.filter((cb) => cb.id !== 'vault');
  }

  // ------------------------------------------------------------------ figures
  roleSpot(c, b) {
    const W = this.W;
    if (c.status === 'hospital') return 'bed';
    if (c.status === 'jail') return 'cell';
    if (c.job && W.economy.biz[c.job.biz]?.b === b.id && c.working) return ROLE_SPOT[c.job.role] || (this.key === 'office' ? 'desk' : 'staff');
    if (c.duty != null) return 'wait';
    if (c.activity === 'sleep' || W.citizenAI && c.activity === 'home' && (W.minuteOfDay / 60 > c.sleepH || W.minuteOfDay / 60 < c.wakeH)) return 'bed';
    if (this.key === 'apartment' || this.key === 'house' || this.key === 'homestead') return rand.pick(['sofa', 'seat', 'stand', 'sofa']);
    if (this.key === 'club') return rand.chance(0.7) ? 'dance' : 'bar';
    if (this.key === 'lounge') return 'watch';
    if (this.key === 'casino') return 'gamble';
    if (this.key === 'school') return 'student';
    if (this.key === 'bar') return rand.chance(0.6) ? 'bar' : 'seat';
    if (['restaurant', 'cafe'].includes(this.key)) return 'seat';
    if (['store', 'boutique', 'mall', 'gunstore'].includes(this.key)) return 'browse';
    if (this.key === 'gym') return 'stand';
    return 'wait';
  }

  syncFigures(force) {
    const W = this.W, b = this.b;
    if (!b) return;
    let occ = Array.from(b.occupants).filter((id) => id !== this.c?.id || !this.c.possessed);
    // a private apartment only shows the people who live in that unit (or are visiting it)
    if (this.key === 'apartment' || this.key === 'homestead') { const host = W.citizens[this.unitOf ?? this.c?.id]; occ = occ.filter((id) => { const o = W.citizens[id]; return host && (o.unit === host.unit && o.home === host.home || o.goal?.with === host.id); }); }
    if (this.key === 'lobby') occ = occ.slice(0, 3);
    const key = occ.join(',');
    if (!force && key === this.lastOcc) return;
    this.lastOcc = key;
    const used = new Set();
    for (const cid of this.figs.keys()) if (!b.occupants.has(cid) || !occ.includes(cid)) this.figs.delete(cid);
    for (const f of this.figs.values()) used.add(f.spot);
    for (const cid of occ.slice(0, 70)) {
      if (this.figs.has(cid)) continue;
      const c = W.citizens[cid];
      const want = this.roleSpot(c, b);
      const fallbacks = [want, want === 'staff' ? 'staff2' : null, want === 'bar_staff' ? 'staff' : null, want === 'guard' ? 'wait' : null, 'wait', 'browse', 'stand', 'seat'];
      let si = -1;
      for (const t of fallbacks) { if (!t) continue; si = this.room.spots.findIndex((s, i) => !used.has(i) && s.type === t); if (si >= 0) break; }
      if (si < 0) si = this.room.spots.findIndex((s, i) => !used.has(i) && s.type !== 'bed' && s.type !== 'cell' && s.type !== 'perform' && s.type !== 'dj' && s.type !== 'dealer');
      if (si < 0) continue;
      used.add(si);
      const s = this.room.spots[si];
      const f = { id: 10000 + cid, cid, x: s.x, z: s.z, y: s.y || 0, h: s.h, v: 0, anim: hash01(cid, 3) * 10, action: '', state: 'idle', spot: si, tx: s.x, tz: s.z, wander: 4 + hash01(cid) * 10 };
      this.applySpotPose(f, s, c);
      this.figs.set(cid, f);
    }
  }

  applySpotPose(f, s, c) {
    f.action = '';
    f.y = s.y || 0;
    if (SIT.has(s.type) || s.stool) f.action = 'sit';
    if (s.stool) f.y += 0.3;
    if (s.type === 'bed') { f.action = c.status === 'hospital' ? 'down' : 'sleep'; f.y = (s.y || 0) + (s.patient ? 0.58 : 0.45); }
    if (s.type === 'cell') f.action = c.flags.cuffed ? 'cuffed' : '';
    if (s.type === 'dance' || s.type === 'perform') f.action = 'dance';
    if (s.type === 'dj') f.action = 'type';
    if (s.type === 'dealer') f.action = 'cards';
    if (s.type === 'teach') f.action = 'talk';
    if (s.type === 'guard') f.action = 'watch';
    if (s.type === 'cook') f.action = 'carry';
    if (s.type === 'gamble' && !s.slot) f.action = 'cards';
    if (s.type === 'bar' && c.traits && hash01(c.id, 9) < 0.5) f.action = f.action === 'sit' ? 'sit' : 'drink';
    if (s.type === 'student') f.action = 'sit';
  }

  update(dt) {
    if (!this.room) return;
    const W = this.W, R = this.room;
    this.t += dt;
    const c = this.c;
    if (c && !c.possessed && !this.game.possession.autopilot) { this.exit(true); return; }
    if (c && this.game.possession.autopilot && c.at !== this.b.id) { this.exit(true); this.game.possession.mode = c.ped ? 'foot' : 'drive'; return; }
    if (this.frameT === undefined || (this.frameT += dt) > 0.5) { this.frameT = 0; this.syncFigures(false); }
    const night = W.env.night;
    R.winMat.color.setRGB(0.18 + (1 - night) * 0.95, 0.22 + (1 - night) * 0.98, 0.35 + (1 - night) * 0.92);
    const powered = this.b.powered;
    this.amb.intensity = powered ? (['club', 'lounge', 'casino', 'bar'].includes(this.key) ? 0.5 : 0.7) : 0.18 + (1 - night) * 0.35;
    if (R.outdoor) {
      const day = 1 - night;
      this.scene.background.setRGB(0.01 + day * 0.2, 0.015 + day * 0.4, 0.04 + day * 0.78);
      R.sun.intensity = 0.12 + day * 2.4;
      R.sun.color.setRGB(0.55 + day * 0.45, 0.62 + day * 0.33, 0.95);
      this.amb.intensity = 0.15 + day * 0.75;
      this.scene.environmentIntensity = 0.06 + day * 0.45;
    } else { this.scene.background.set('#0b0d10'); this.scene.environmentIntensity = 0.55; }
    for (const l of R.lights) {
      if (!powered) { l.intensity = 0; continue; }
      if (l.userData.club) {
        const ph = this.t * 2.2 + l.userData.phase;
        l.intensity = l.userData.base * (0.5 + 0.5 * Math.max(0, Math.sin(ph * 2.0)));
        l.color.setHSL((this.t * 0.08 + l.userData.phase / 6.28) % 1, 0.9, 0.55);
      } else l.intensity = l.userData.base;
    }
    if (R.anim.floor && powered) {
      const F = R.anim.floor, a = F.userData;
      const col = new THREE.Color();
      let i = 0;
      const beat = Math.floor(this.t * 2.2);
      for (let x = 0; x < a.n; x++) for (let z = 0; z < a.m; z++) {
        const v = hash01(x * 13 + beat, z * 7 + beat);
        col.setHSL((v + this.t * 0.05) % 1, 0.9, v > 0.55 ? 0.5 : 0.08);
        F.setColorAt(i++, col);
      }
      F.instanceColor.needsUpdate = true;
    }
    if (R.anim.train) {
      const cyc = this.t % 40;
      const x = cyc < 8 ? -120 + (cyc / 8) * 120 : cyc < 20 ? 0 : cyc < 28 ? ((cyc - 20) / 8) ** 2 * 140 : -200;
      R.anim.train.mesh.setMatrixAt(0, new THREE.Matrix4().makeTranslation(x, -1.2, R.anim.train.z));
      R.anim.train.mesh.instanceMatrix.needsUpdate = true;
      this.trainIn = cyc >= 8 && cyc < 20;
    }
    // customers wander between browse spots
    for (const f of this.figs.values()) {
      const s = R.spots[f.spot];
      if (s.type === 'browse' || s.type === 'wait') {
        f.wander -= dt;
        if (f.wander <= 0) { f.wander = 5 + rand.float() * 10; const alt = R.spots.filter((x) => x.type === s.type); const t = alt[rand.int(0, alt.length - 1)]; f.tx = t.x + (rand.float() - 0.5) * 0.6; f.tz = t.z + (rand.float() - 0.5) * 0.6; f.th = t.h; }
        const dx = f.tx - f.x, dz = f.tz - f.z, d = Math.hypot(dx, dz);
        if (d > 0.1) { f.v = 1.1; f.state = 'walk'; f.x += dx / d * Math.min(d, 1.1 * dt); f.z += dz / d * Math.min(d, 1.1 * dt); f.h += wrapAngle(Math.atan2(dx, dz) - f.h) * Math.min(1, dt * 6); f.anim += dt * 2.6; }
        else { f.v = 0; f.state = 'idle'; if (f.th != null) f.h += wrapAngle(f.th - f.h) * Math.min(1, dt * 3); }
      } else f.anim += dt * (f.action === 'dance' ? 2.2 : 0.5);
    }
    if (this.player) {
      const cam = this.game.renderer.camera.position;
      this.cut.uCutC.value.set(this.player.x, 0, this.player.z);
      const cdx = cam.x - this.player.x, cdz = cam.z - this.player.z, cl = Math.hypot(cdx, cdz) || 1;
      this.cut.uCutD.value.set(cdx / cl, cdz / cl);
    }
    const ex = this.people.extra;
    ex.length = 0;
    for (const f of this.figs.values()) { const fc = W.citizens[f.cid]; f.look = this.people.lookFor(fc); ex.push(f); }
    if (this.player && c) { this.player.look = this.people.lookFor(c); ex.push(this.player); }
    this.people.update(dt);
  }

  // ------------------------------------------------------------------ player inside
  updatePlayer(dt, P) {
    const g = this.game, I = g.input, W = this.W, R = this.room, p = this.player, c = this.c;
    if (!p) return;
    const T = g.rig.third;
    P.prompts = [];
    if (this.busy) { // a modal activity is open (game, menu): stand still
      p.v = 0; p.state = 'idle';
    } else {
      const run = I.down('ShiftLeft');
      const mx = I.axis('KeyA', 'KeyD'), mz = I.axis('KeyS', 'KeyW');
      let dx = Math.sin(T.yaw) * mz - Math.cos(T.yaw) * mx, dz = Math.cos(T.yaw) * mz + Math.sin(T.yaw) * mx;
      const len = Math.hypot(dx, dz);
      const sp = len > 0.01 ? (run ? 4.2 : 1.8) : 0;
      if (len > 0.01) { dx /= len; dz /= len; p.h += wrapAngle(Math.atan2(dx, dz) - p.h) * Math.min(1, dt * 12); if (p.action === 'sit' || p.action === 'sleep' || p.action === 'dance') p.action = ''; }
      p.v = damp(p.v, sp, 10, dt);
      let nx = p.x + Math.sin(p.h) * p.v * dt, nz = p.z + Math.cos(p.h) * p.v * dt;
      for (const b of R.col) {
        const cx = clamp(nx, b.x0, b.x1), cz = clamp(nz, b.z0, b.z1);
        const ddx = nx - cx, ddz = nz - cz, d = Math.hypot(ddx, ddz);
        if (d < 0.3) { if (d > 1e-4) { nx = cx + ddx / d * 0.3; nz = cz + ddz / d * 0.3; } else { nx = p.x; nz = p.z; } }
      }
      p.x = clamp(nx, -R.W / 2 + 0.3, R.W / 2 - 0.3); p.z = clamp(nz, -R.D / 2 + 0.3, R.D / 2 - 0.3);
      p.state = p.v > 0.1 ? 'walk' : 'idle';
      p.anim += dt * (p.action === 'dance' ? 2.2 : p.v * 2.4);
      p.run = run && p.v > 3;
      if (p.v > 0.5) { this.stepAcc = (this.stepAcc || 0) + dt * p.v * 0.8; if (this.stepAcc > 1) { this.stepAcc = 0; g.audio && g.audio.footstep(run, 0, 0, true); } }
    }
    const b = this.b;
    // weapons indoors: X to draw, right mouse to aim, left click to fire
    const Wp = g.weapons;
    if (Wp && !this.busy) {
      if (I.hit('KeyX')) { const list = Wp.owned(c); const i = Wp.cur == null ? 0 : list.indexOf(Wp.cur) + 1; Wp.cur = i >= list.length ? null : list[i]; g.toast(Wp.cur ? Wp.cur : 'Weapon holstered', 1.4); }
      p.weapon = Wp.cur && Wp.cur !== 'fists' ? Wp.cur : null;
      const wpn = Wp.cur ? WEAPONS[Wp.cur] : null;
      const aiming = p.weapon && !(wpn && wpn.melee) && I.mouse.down[2];
      if (aiming) { p.action = 'aim'; p.h = T.yaw; }
      else if (p.action === 'aim') p.action = '';
      Wp.fireT -= dt;
      const down = I.mouse.down[0] && I.locked; const edge = down && !Wp.prevDown; Wp.prevDown = down;
      // fists, knives and bats: swing at whoever is in front of you
      let front = null;
      { let fd = 2.3; for (const f of this.figs.values()) { if (f.action === 'down') continue; const d = dist(f.x, f.z, p.x, p.z), ang = Math.atan2(f.x - p.x, f.z - p.z); if (d < fd && Math.abs(((ang - p.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 1.1) { fd = d; front = f; } } }
      if (front && !aiming) P.prompts.push({ key: 'V', text: `Attack ${W.citizens[front.cid]?.first || 'them'}`, danger: true });
      const swingNow = Wp.fireT <= 0 && (I.hit('KeyV') || (edge && (!wpn || wpn.melee)));
      if (swingNow) {
        const mwid = wpn && wpn.melee ? Wp.cur : 'fists';
        const mw = WEAPONS[mwid];
        Wp.fireT = mw.rate;
        g.hitfx && g.hitfx.swing(p, mwid);
        let hit = null, hd = mw.range + 0.5;
        for (const f of this.figs.values()) {
          if (f.action === 'down') continue;
          const d = dist(f.x, f.z, p.x, p.z), ang = Math.atan2(f.x - p.x, f.z - p.z);
          if (d < hd && Math.abs(((ang - p.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 1.0) { hd = d; hit = f; }
        }
        if (hit) {
          const o = W.citizens[hit.cid];
          W.combat.melee(c, mwid, o);
          g.audio && g.audio.impact(4);
          hit.h = Math.atan2(p.x - hit.x, p.z - hit.z);
          if (o.status !== 'ok' || o.injured > 0 || (o.health ?? 1) < 0.35) hit.action = 'down';
          for (const f of this.figs.values()) if (f !== hit && f.action !== 'down' && f.action !== 'aim') f.action = 'hail';
          if (W.heists) { const V = W.heists.vaults[b.id] || (W.heists.vaults[b.id] = {}); V.hostile = W.time; }
        }
      }
      if (aiming && Wp.fireT <= 0 && (edge || (down && W.combat && Wp.cur && ['smg', 'rifle'].includes(Wp.cur)))) {
        const am = Wp.ammo(c, Wp.cur);
        if (am > 0) { if (am !== Infinity) c.life.ammo[Wp.cur] = am - 1; Wp.fireT = 0.3; W.heists.indoorShot(g, Wp.cur); g.rig.shake = 0.4; }
        else if (edge) g.toast('Out of ammo.');
      }
    }
    // nearest interaction point
    let best = null, bd = 1e9;
    for (const a of R.acts) { const d = dist(p.x, p.z, a.x, a.z); if (d < (a.r || 1.3) && d < bd) { bd = d; best = a; } }
    const A = g.activities;
    if (best && !this.busy) {
      const label = A ? A.label(best, this) : best.label;
      if (label) {
        P.prompts.push({ key: 'E', text: label, danger: !!best.danger });
        if (I.hit('KeyE')) { if (best.kind === 'exit') { this.exit(false); return; } if (A) A.use(best, this); }
      }
      if (A) for (const extra of A.extraPrompts(best, this)) { P.prompts.push(extra); if (I.hit(extra.code)) extra.fn(); }
    }
    // work shift: clock in anywhere inside your workplace
    if (c.job && W.economy.biz[c.job.biz]?.b === b.id && W.citizenAI.inShift(c, W.minuteOfDay, 30)) {
      if (!c.working) { P.prompts.push({ key: 'C', text: 'Clock in' }); if (I.hit('KeyC')) { W.citizenAI.startWork(c); g.toast(`Clocked in at ${W.economy.biz[c.job.biz].name}. You're earning $${Math.round(c.job.wage)}/h.`); } }
      else P.prompts.push({ key: '', text: `On shift — earning $${Math.round(c.job.wage)}/h` });
    }
    // talk to people
    let near = null, nd = 1.8;
    for (const f of this.figs.values()) { const d = dist(f.x, f.z, p.x, p.z); if (d < nd) { nd = d; near = f; } }
    if (near && !this.busy) {
      const o = W.citizens[near.cid];
      P.prompts.push({ key: 'T', text: `Talk to ${o.first}` });
      if (I.hit('KeyT')) { near.h = Math.atan2(p.x - near.x, p.z - near.z); if (g.lifeUI) g.lifeUI.openTalk(o, near); else { const r = W.citizenAI.addAff(c, o, 0.06); g.toast(`${o.first}: “${g.possession.lineFor(o, r)}”`, 5); } }
      if (c.job && c.job.role === 'officer' && c.duty != null && (o.record.wanted || o.flags.suspectOf)) {
        P.prompts.push({ key: 'F', text: `Arrest ${o.name}` });
        if (I.hit('KeyF')) { this.exit(false); W.citizenAI.leaveBuilding(o); g.possession.arrest(o, o.flags.suspectOf ? W.incidents.get(o.flags.suspectOf) : null); return; }
      }
    }
    // cutaway camera: elevated, orbit with the mouse, walls between you and the camera are cut away
    const pos = { x: p.x, y: p.y || 0, z: p.z };
    T.pitch = Math.max(T.pitch, 0.38);
    g.rig.updateThird(dt, pos, { minDist: 3, maxDist: 14 });
    const cam = g.renderer.camera.position;
    this.cut.uCutC.value.set(p.x, 0, p.z);
    const cdx = cam.x - p.x, cdz = cam.z - p.z, cl = Math.hypot(cdx, cdz) || 1;
    this.cut.uCutD.value.set(cdx / cl, cdz / cl);
  }
}

function buildGeo(kit) {
  const g = kit.build();
  g.setAttribute('iCol1', new THREE.InstancedBufferAttribute(new Float32Array([1, 1, 1]), 3));
  g.setAttribute('iCol2', new THREE.InstancedBufferAttribute(new Float32Array([1, 1, 1]), 3));
  g.setAttribute('iState', new THREE.InstancedBufferAttribute(new Float32Array([0.4, 0, 0, 0]), 4));
  return g;
}
function trainGeo() { return buildGeo(piece('train')); }
