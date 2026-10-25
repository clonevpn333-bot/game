// Weapons: procedural models, hitscan firing with spread/recoil, reloads,
// holstering, melee, impact handling.
import * as THREE from 'three';
import { G } from '../core/physics.js';
import { clamp, damp, lerp } from '../core/util.js';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();

export const WEAPONS = {
  pistol: { name: 'KESTREL M4', short: 'Kestrel', dmg: 28, rate: 0.16, auto: false, mag: 12, reserve: 72, spreadHip: 0.016, spreadAim: 0.003, kick: 0.028, kickYaw: 0.006, reload: 1.25, range: 120, sound: 'pistol' },
  carbine: { name: 'HALYARD CARBINE', short: 'Halyard', dmg: 19, rate: 0.095, auto: true, mag: 30, reserve: 150, spreadHip: 0.032, spreadAim: 0.006, kick: 0.016, kickYaw: 0.008, reload: 1.85, range: 160, sound: 'carbine' },
};

function pistolModel(M) {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.35, metalness: 0.85 });
  const slideM = new THREE.MeshStandardMaterial({ color: 0x3b3f46, roughness: 0.3, metalness: 0.9 });
  const poly = new THREE.MeshStandardMaterial({ color: 0x1d1e20, roughness: 0.75, metalness: 0.1 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xc8692b, roughness: 0.5, metalness: 0.3 });
  const box = (m, w, h, d, x, y, z, rx = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.x = rx; b.castShadow = true; g.add(b); return b; };
  // slide (moves on recoil)
  const slide = new THREE.Group(); g.add(slide);
  const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.032, 0.19), slideM); s1.position.set(0, 0.032, 0.035); slide.add(s1);
  for (let i = 0; i < 6; i++) { const sr = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.026, 0.003), steel); sr.position.set(0, 0.032, -0.045 + i * 0.007); slide.add(sr); }
  const rs = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.008, 0.008), steel); rs.position.set(0, 0.051, -0.05); slide.add(rs);
  const fs = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.008, 0.006), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.5, 0.15).multiplyScalar(3) })); fs.position.set(0, 0.051, 0.12); slide.add(fs);
  const port = new THREE.Mesh(new THREE.BoxGeometry(0.031, 0.012, 0.03), poly); port.position.set(0.002, 0.04, 0.02); slide.add(port);
  // barrel & frame
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 10), steel); bar.rotation.x = Math.PI / 2; bar.position.set(0, 0.032, 0.135); g.add(bar);
  box(poly, 0.028, 0.02, 0.15, 0, 0.008, 0.045);
  box(accent, 0.029, 0.004, 0.08, 0, 0.0, 0.07);
  const grip = box(poly, 0.03, 0.1, 0.045, 0, -0.04, -0.03, -0.22);
  for (let i = 0; i < 5; i++) box(steel, 0.031, 0.004, 0.04, 0, -0.01 - i * 0.017, -0.034 + i * 0.004, -0.22);
  const tg = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.003, 6, 12, Math.PI), poly); tg.rotation.set(0, Math.PI / 2, Math.PI); tg.position.set(0, -0.004, 0.022); g.add(tg);
  box(steel, 0.004, 0.016, 0.004, 0, -0.008, 0.016);
  const mag = new THREE.Group(); mag.position.set(0, -0.06, -0.034); mag.rotation.x = -0.22; g.add(mag);
  const mb = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.09, 0.034), steel); mag.add(mb);
  const mbp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.046), poly); mbp.position.y = -0.05; mag.add(mbp);
  g.userData = { slide, mag, muzzle: new THREE.Vector3(0, 0.032, 0.155), magRest: mag.position.clone() };
  return g;
}

function carbineModel() {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x26282c, roughness: 0.35, metalness: 0.85 });
  const recv = new THREE.MeshStandardMaterial({ color: 0x3e4249, roughness: 0.45, metalness: 0.7 });
  const poly = new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.8, metalness: 0.05 });
  const tan = new THREE.MeshStandardMaterial({ color: 0x8a7a5c, roughness: 0.7, metalness: 0.1 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xc8692b, roughness: 0.5, metalness: 0.3 });
  const box = (m, w, h, d, x, y, z, rx = 0, parent = g) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.x = rx; b.castShadow = true; parent.add(b); return b; };
  box(recv, 0.045, 0.06, 0.28, 0, 0.03, 0.05);                    // receiver
  box(recv, 0.046, 0.012, 0.25, 0, 0.066, 0.05);                  // top rail
  for (let i = 0; i < 12; i++) box(steel, 0.05, 0.006, 0.008, 0, 0.074, -0.06 + i * 0.02);
  box(tan, 0.05, 0.055, 0.24, 0, 0.032, 0.3);                     // handguard
  for (let i = 0; i < 6; i++) box(poly, 0.052, 0.012, 0.02, 0, 0.04, 0.21 + i * 0.035);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.16, 10), steel); bar.rotation.x = Math.PI / 2; bar.position.set(0, 0.035, 0.49); g.add(bar);
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 8), steel); brake.rotation.x = Math.PI / 2; brake.position.set(0, 0.035, 0.585); g.add(brake);
  box(poly, 0.04, 0.11, 0.05, 0, -0.045, -0.02, -0.3);            // grip
  const tg = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.003, 6, 12, Math.PI), poly); tg.rotation.set(0, Math.PI / 2, Math.PI); tg.position.set(0, -0.002, 0.03); g.add(tg);
  box(poly, 0.04, 0.07, 0.2, 0, 0.0, -0.22);                       // stock
  box(tan, 0.042, 0.1, 0.03, 0, -0.01, -0.33);                     // butt pad
  box(steel, 0.012, 0.012, 0.18, 0, 0.04, -0.12);
  box(accent, 0.047, 0.006, 0.1, 0, 0.0, 0.12);
  const mag = new THREE.Group(); mag.position.set(0, -0.04, 0.09); g.add(mag);
  for (let i = 0; i < 5; i++) { const seg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.06), steel); seg.position.set(0, -0.012 - i * 0.026, i * 0.01); seg.rotation.x = 0.2; mag.add(seg); }
  // holo optic
  box(steel, 0.036, 0.012, 0.07, 0, 0.088, 0.04);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.004, 6, 4), steel); frame.rotation.z = Math.PI / 4; frame.position.set(0, 0.11, 0.06); g.add(frame);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.019, 12), new THREE.MeshStandardMaterial({ color: 0x6fb8c8, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.3 })); glass.position.set(0, 0.11, 0.06); g.add(glass);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0025, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.3, 0.2).multiplyScalar(4) })); dot.position.set(0, 0.11, 0.059); dot.rotation.y = Math.PI; g.add(dot);
  const handle = box(steel, 0.016, 0.01, 0.02, 0.026, 0.05, -0.04);
  g.userData = { slide: handle, mag, muzzle: new THREE.Vector3(0, 0.035, 0.61), magRest: mag.position.clone() };
  return g;
}

export class Weapons {
  constructor(game) {
    this.game = game;
    this.owned = {}; this.ammo = {}; this.current = null; this.drawn = false; this.drawT = 0;
    this.aiming = false; this.cooldown = 0; this.reloading = 0; this.spreadBloom = 0; this.lastShot = -10;
    this.models = { pistol: pistolModel(), carbine: carbineModel() };
    for (const m of Object.values(this.models)) { m.visible = false; game.engine.cityRoot.add(m); }
    this.kickZ = 0; this.kickR = 0; this.meleeCd = 0; this.locked = false;
    this.firingRecently = false;
    this.droppedMags = [];
  }
  give(id, withAmmo = true) {
    this.owned[id] = true;
    if (withAmmo) this.ammo[id] = { mag: WEAPONS[id].mag, reserve: WEAPONS[id].reserve };
    if (!this.current) this.current = id;
    this.game.hud.weaponChanged?.();
  }
  attach(player) { this.player = player; }
  holster() { this.drawn = false; }
  draw() { if (this.current && !this.drawn) { this.drawn = true; this.drawT = 0.25; this.game.audio.reloadPart('rack'); } }
  select(id) { if (!this.owned[id] || this.current === id) return; this.current = id; this.reloading = 0; this.drawT = 0.3; this.drawn = true; this.game.audio.reloadPart('tap'); this.game.hud.weaponChanged?.(); }

  update(dt) {
    const g = this.game, inp = g.input, p = this.player;
    if (!p) return;
    this.cooldown -= dt; this.meleeCd -= dt;
    const free = !g.director.active && !p.dead && !this.locked && (p.state === 'ground' || p.state === 'air' || p.state === 'latch');
    const has = !!this.current;
    if (free && has) {
      if (inp.pressed('weapon1') && this.owned.pistol && !g.dialogue.choosing) this.select('pistol');
      if (inp.pressed('weapon2') && this.owned.carbine && !g.dialogue.choosing) this.select('carbine');
      if (inp.pressed('swap')) { const ids = Object.keys(this.owned); const i = ids.indexOf(this.current); this.select(ids[(i + 1) % ids.length]); }
      if (inp.wheel) { const ids = Object.keys(this.owned); if (ids.length > 1) { const i = ids.indexOf(this.current); this.select(ids[(i + (inp.wheel > 0 ? 1 : ids.length - 1)) % ids.length]); } }
      if (inp.pressed('holster')) { if (this.drawn) { this.holster(); this.aimToggle = false; } else this.draw(); }
    }
    // right click toggles aim (on until clicked again, holstered, or a traversal move takes over)
    if (free && has && inp.pressed('aim')) this.aimToggle = !this.aimToggle;
    if (!free || !has || inp.pressed('sprint') || ['latch', 'hang', 'climb', 'ladder', 'seated', 'scripted'].includes(p.state)) this.aimToggle = false;
    const wantAim = free && has && this.aimToggle && p.state !== 'latch';
    if (wantAim && !this.drawn) this.draw();
    this.aiming = wantAim && this.drawn;
    if (free && has && inp.down('fire') && !this.drawn && !g.interact.blockFire) this.draw();
    // auto-holster after calm in relaxed areas
    if (this.drawn && p.relaxed && !this.aiming && g.time - this.lastShot > 6) this.drawn = false;

    // reload
    const w = WEAPONS[this.current], ammo = this.ammo[this.current];
    if (this.reloading > 0) {
      const prev = this.reloading; this.reloading -= dt;
      const k = 1 - this.reloading / w.reload;
      if (prev > w.reload * 0.75 && this.reloading <= w.reload * 0.75) { g.audio.reloadPart('out'); this.dropMag(); }
      if (prev > w.reload * 0.35 && this.reloading <= w.reload * 0.35) g.audio.reloadPart('in');
      if (prev > w.reload * 0.12 && this.reloading <= w.reload * 0.12) g.audio.reloadPart('rack');
      p.anim.reload = k;
      if (this.reloading <= 0) { const need = w.mag - ammo.mag, take = Math.min(need, ammo.reserve); ammo.mag += take; ammo.reserve -= take; p.anim.reload = 0; g.hud.weaponChanged?.(); }
    }
    if (free && has && this.drawn && inp.pressed('reload') && this.reloading <= 0 && ammo.mag < w.mag && ammo.reserve > 0) this.startReload();

    // fire
    const trigger = w && (w.auto ? inp.down('fire') : inp.pressed('fire'));
    if (free && has && this.drawn && trigger && this.cooldown <= 0 && this.reloading <= 0 && this.drawT <= 0 && !g.interact.blockFire) {
      if (ammo.mag > 0) this.fire();
      else if (inp.pressed('fire')) { g.audio.dryFire(); if (ammo.reserve > 0) this.startReload(); }
    }
    // melee
    if (free && inp.pressed('melee') && this.meleeCd <= 0) this.melee();

    this.drawT = Math.max(0, this.drawT - dt);
    this.spreadBloom = damp(this.spreadBloom, 0, 6, dt);
    this.firingRecently = g.time - this.lastShot < 0.6;
    this.kickZ = damp(this.kickZ, 0, 18, dt); this.kickR = damp(this.kickR, 0, 14, dt);

    // anim
    const a = p.anim;
    a.weapon = this.drawn ? this.current : null;
    a.aim = damp(a.aim, this.drawn && (this.aiming || this.firingRecently || this.reloading > 0) ? 1 : (this.drawn ? 0.35 : 0), 14, dt);
    a.aimPitch = clamp(g.camera.pitch, -1.0, 1.0);
    this.updateModel(dt);
  }

  startReload() { const w = WEAPONS[this.current]; this.reloading = w.reload; this.game.audio.reloadPart('tap'); }

  aimRay() {
    const cam = this.game.engine.camera;
    const w = WEAPONS[this.current];
    const spread = (this.aiming ? w.spreadAim : w.spreadHip) * (1 + this.spreadBloom * 2.5) * (this.player.state === 'air' ? 2 : 1) * (Math.hypot(this.player.vel.x, this.player.vel.z) > 3 ? 1.5 : 1);
    const dir = cam.getWorldDirection(new THREE.Vector3());
    const r = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(spread * 2);
    dir.add(r).normalize();
    return { origin: cam.position.clone(), dir };
  }

  fire() {
    const g = this.game, w = WEAPONS[this.current], ammo = this.ammo[this.current];
    ammo.mag--; this.cooldown = w.rate; this.lastShot = g.time; this.spreadBloom = Math.min(1.5, this.spreadBloom + (w.auto ? 0.25 : 0.4));
    const { origin, dir } = this.aimRay();
    // start the ray just in front of the player so we don't hit things behind us
    const pc = this.player.center; const along = Math.max(0, pc.clone().sub(origin).dot(dir));
    origin.addScaledVector(dir, along);
    const hit = g.physics.raycastFilter(origin, dir, w.range, G.STATIC | G.PROP | G.ENEMY | G.PLATFORM | G.NPC, (c, m) => m?.kind !== 'player' && !m?.noBullet);
    const end = hit ? hit.point : origin.clone().addScaledVector(dir, w.range);
    const muzzle = this.muzzleWorld();
    const mdir = end.clone().sub(muzzle).normalize();
    g.fx.muzzle(muzzle, mdir, this.current === 'carbine');
    g.fx.tracer(muzzle.clone().addScaledVector(mdir, 0.3), end, this.current === 'carbine' ? 0xffc880 : 0xffd8a0);
    g.audio.gunshot(w.sound, muzzle, true);
    g.audio.shell(this.player.pos);
    g.noise?.(this.player.pos, 40);
    if (hit) this.onHit(hit, dir, w.dmg);
    // recoil
    g.camera.kick(w.kick * (this.aiming ? 0.6 : 1), (Math.random() - 0.4) * w.kickYaw);
    g.camera.shake(this.current === 'carbine' ? 0.05 : 0.08);
    this.player.anim.recoil = Math.min(1, this.player.anim.recoil + (this.current === 'carbine' ? 0.4 : 0.8));
    this.kickZ += this.current === 'carbine' ? 0.025 : 0.04; this.kickR += this.current === 'carbine' ? 0.05 : 0.12;
    g.hud.weaponChanged?.(); g.hud.fired?.();
    g.events.emit('shot', { weapon: this.current, hit });
  }

  onHit(hit, dir, dmg) {
    const g = this.game, m = hit.meta || {};
    if (m.kind === 'enemy' && m.enemy) {
      const dealt = m.enemy.damage(dmg * (m.weak ? 2 : 1), hit.point, dir, m.part);
      g.hud.hitmarker(m.enemy.dead, m.weak);
      g.fx.impact(hit.point, hit.normal, 'drone');
      g.audio.impact(hit.point, 'drone', 0.8);
      return;
    }
    if (m.kind === 'prop' && m.body) {
      m.body.applyImpulseAtPoint({ x: dir.x * dmg * 0.6, y: dir.y * dmg * 0.6, z: dir.z * dmg * 0.6 }, { x: hit.point.x, y: hit.point.y, z: hit.point.z }, true);
      m.onShot?.(hit, dmg);
    }
    if (m.onShot && m.kind !== 'prop') m.onShot(hit, dmg);
    if (m.kind === 'npc') { g.events.emit('shotNPC', m); }
    const surf = m.surface || 'metal';
    g.fx.impact(hit.point, hit.normal, surf);
    g.audio.impact(hit.point, surf, 0.6); g.audio.ricochet(hit.point);
  }

  melee() {
    const g = this.game, p = this.player;
    this.meleeCd = 0.6; p.anim.meleeT = 1;
    g.audio.whoosh(0.6);
    const f = p.forward(new THREE.Vector3());
    let best = null, bd = 2.6;
    for (const e of g.enemies.list) {
      if (e.dead) continue;
      const d = e.pos.distanceTo(p.pos.clone().add(new THREE.Vector3(0, 1, 0)));
      const to = e.pos.clone().sub(p.pos).setY(0).normalize();
      if (d < bd && to.dot(f) > 0.3) { bd = d; best = e; }
    }
    if (best) {
      setTimeout(() => {
        if (best.dead) return;
        best.damage(55, best.pos.clone(), f, 'melee', true);
        best.knock?.(f.clone().setY(0.4).multiplyScalar(9));
        g.audio.punch(best.pos); g.fx.sparks(best.pos, f.clone().negate(), 16, 6); g.camera.shake(0.25); g.hud.hitmarker(best.dead);
        g.timeScaleHit?.(0.06);
      }, 110);
    }
  }

  muzzleWorld() {
    const m = this.models[this.current]; m.updateMatrixWorld();
    return m.userData.muzzle.clone().applyMatrix4(m.matrixWorld);
  }

  dropMag() {
    const m = this.models[this.current], mag = m.userData.mag;
    const c = mag.clone(); mag.getWorldPosition(c.position); mag.getWorldQuaternion(c.quaternion);
    this.game.engine.cityRoot.add(c);
    const v = new THREE.Vector3((Math.random() - 0.5) * 0.5, -1, (Math.random() - 0.5) * 0.5);
    this.game.fx.meshes.push({ m: c, t: 0, life: 4, keep: true, update: (e, k, dt) => { v.y -= 12 * dt; if (e.m.position.y + v.y * dt < this.player.pos.y + 0.03) { v.set(v.x * 0.3, Math.abs(v.y) * 0.2, v.z * 0.3); } e.m.position.addScaledVector(v, dt); e.m.rotation.x += dt * 4; } });
    mag.visible = false; setTimeout(() => (mag.visible = true), WEAPONS[this.current].reload * 450);
  }

  updateModel(dt) {
    const p = this.player;
    for (const [id, m] of Object.entries(this.models)) m.visible = !!this.owned[id] && (id === this.current) && p.char.group.visible;
    if (!this.current) return;
    const m = this.models[this.current];
    const sock = this.drawn ? p.char.sockets.gripR : (this.current === 'carbine' ? p.char.sockets.back : p.char.sockets.hip);
    sock.updateMatrixWorld(true);
    const pos = _v.setFromMatrixPosition(sock.matrixWorld);
    if (this.drawn) {
      // orient toward the aim point so bullets visibly leave the barrel toward the crosshair
      const cam = this.game.engine.camera;
      const aimPt = cam.position.clone().addScaledVector(cam.getWorldDirection(_v2), 40);
      const blendAim = p.anim.aim;
      const handQ = new THREE.Quaternion().setFromRotationMatrix(sock.matrixWorld);
      // hand frame: fingers point -Y; barrel should be along the hand's forward
      const handFwd = new THREE.Quaternion().multiplyQuaternions(handQ, new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)));
      _m.lookAt(aimPt, pos, new THREE.Vector3(0, 1, 0));
      const aimQ = new THREE.Quaternion().setFromRotationMatrix(_m);
      m.quaternion.copy(handFwd).slerp(aimQ, clamp(blendAim * 1.4 - 0.2, 0, 1));
      m.position.copy(pos);
      // recoil
      m.translateZ(-this.kickZ); m.rotateX(-this.kickR);
      if (this.current === 'pistol') m.userData.slide.position.z = -Math.min(0.03, this.kickZ * 0.9);
      // reload: tilt the weapon
      if (this.reloading > 0) { const k = Math.sin((1 - this.reloading / WEAPONS[this.current].reload) * Math.PI); m.rotateZ(k * 0.6); m.rotateX(k * 0.3); }
      if (this.current === 'carbine') m.translateZ(-0.06);
    } else {
      m.position.copy(pos); m.quaternion.setFromRotationMatrix(sock.matrixWorld);
      if (this.current === 'carbine') { m.rotateY(Math.PI / 2); m.rotateZ(0.7); m.translateZ(-0.1); }
      else { m.rotateX(Math.PI / 2 + 0.2); m.rotateZ(Math.PI); }
    }
  }
}
