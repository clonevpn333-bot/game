// GETAWAY! — weapons, hitscan + projectiles, damage routing, explosions.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, rand, lerp } from '../core/utils.js';
import { mergeParts } from '../world/props.js';
import { J } from '../characters/humanoid.js';

export const WEAPONS = {
  fists: { id: 'fists', name: 'Fists', kind: 'fists', melee: true, dmg: 34, rpm: 120 },
  pistol: { id: 'pistol', name: 'Kestrel P9', kind: 'pistol', dmg: 26, rpm: 330, auto: false, mag: 15, reload: 1.25, spread: 0.02, aimSpread: 0.004, range: 140, pellets: 1, recoil: 0.5, kick: 0.012, shake: 0.06, tracer: 0.35 },
  smg: { id: 'smg', name: 'Vandal SMG', kind: 'smg', dmg: 16, rpm: 820, auto: true, mag: 32, reload: 1.6, spread: 0.04, aimSpread: 0.014, range: 110, pellets: 1, recoil: 0.3, kick: 0.006, shake: 0.04, tracer: 0.5 },
  shotgun: { id: 'shotgun', name: 'Mauler 12', kind: 'shotgun', dmg: 14, rpm: 72, auto: false, mag: 6, reload: 2.3, spread: 0.075, aimSpread: 0.055, range: 55, pellets: 9, recoil: 1.2, kick: 0.05, shake: 0.2, tracer: 0.6 },
  rifle: { id: 'rifle', name: 'Halberd AR', kind: 'rifle', dmg: 31, rpm: 630, auto: true, mag: 30, reload: 1.9, spread: 0.03, aimSpread: 0.005, range: 220, pellets: 1, recoil: 0.35, kick: 0.009, shake: 0.06, tracer: 0.6 },
  heavy: { id: 'heavy', name: 'Thumper GL', kind: 'heavy', dmg: 0, rpm: 70, auto: false, mag: 4, reload: 2.6, spread: 0.01, aimSpread: 0.005, range: 200, pellets: 1, recoil: 1.4, kick: 0.04, shake: 0.18, projectile: true },
};
export const WEAPON_ORDER = ['fists', 'pistol', 'smg', 'shotgun', 'rifle', 'heavy'];

const BX = (w, h, d, x, y, z, c) => ({ geo: new THREE.BoxGeometry(w, h, d).translate(x, y, z), c });
const CY = (r, l, x, y, z, c, seg = 10) => ({ geo: new THREE.CylinderGeometry(r, r, l, seg).rotateX(Math.PI / 2).translate(x, y, z), c });
const GEO = {};
export function weaponGeo(kind) {
  if (GEO[kind]) return GEO[kind];
  const metal = 0x2a2d31, dark = 0x15171a, wood = 0x6b4a2b, accent = 0xb08a5a;
  let parts;
  if (kind === 'pistol') parts = [BX(0.035, 0.035, 0.2, 0, 0.03, 0.06, metal), BX(0.032, 0.11, 0.045, 0, -0.04, -0.01, dark), BX(0.03, 0.02, 0.06, 0, -0.005, 0.03, dark), CY(0.008, 0.02, 0, 0.035, 0.165, 0x080808)];
  else if (kind === 'smg') parts = [BX(0.05, 0.07, 0.3, 0, 0.02, 0.08, metal), BX(0.035, 0.18, 0.04, 0, -0.08, 0.1, dark), BX(0.03, 0.1, 0.04, 0, -0.06, -0.02, dark), CY(0.015, 0.12, 0, 0.03, 0.28, 0x111111), BX(0.02, 0.04, 0.22, 0, 0.0, -0.15, dark), BX(0.02, 0.03, 0.08, 0, 0.07, 0.05, 0x333333)];
  else if (kind === 'shotgun') parts = [CY(0.02, 0.62, 0, 0.04, 0.3, metal), CY(0.017, 0.5, 0, 0.0, 0.26, dark), BX(0.05, 0.06, 0.2, 0, 0.0, 0.33, wood), BX(0.04, 0.08, 0.16, 0, 0.0, 0.0, metal), BX(0.04, 0.1, 0.3, 0, -0.04, -0.2, wood)];
  else if (kind === 'rifle') parts = [BX(0.05, 0.08, 0.42, 0, 0.02, 0.1, metal), CY(0.014, 0.3, 0, 0.03, 0.45, 0x111111), BX(0.035, 0.2, 0.06, 0, -0.09, 0.13, dark), BX(0.03, 0.12, 0.05, 0, -0.07, -0.02, dark), BX(0.045, 0.09, 0.26, 0, 0.0, -0.22, dark), BX(0.03, 0.05, 0.12, 0, 0.09, 0.08, 0x222222), BX(0.052, 0.06, 0.2, 0, 0.03, 0.3, 0x3a3f45)];
  else if (kind === 'heavy') parts = [CY(0.06, 0.5, 0, 0.04, 0.15, 0x3e4a2f), CY(0.07, 0.18, 0, 0.04, 0.0, metal), BX(0.04, 0.12, 0.05, 0, -0.06, 0.02, dark), BX(0.045, 0.08, 0.28, 0, -0.01, -0.22, 0x3e4a2f), CY(0.065, 0.03, 0, 0.04, 0.4, accent)];
  else parts = [BX(0.01, 0.01, 0.01, 0, 0, 0, dark)];
  GEO[kind] = mergeParts(parts); return GEO[kind];
}
const WMAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.7 });
export function makeWeaponMesh(kind) { const m = new THREE.Mesh(weaponGeo(kind), WMAT); m.castShadow = true; return m; }
// position weapon mesh in the right hand, pointing along forearm (or along aim dir)
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _m = new THREE.Matrix4(), _up = new THREE.Vector3(0, 1, 0);
export function poseWeapon(mesh, human, aimDir = null) {
  human.joint(J.rHa, _a); human.joint(J.rEl, _b);
  const fwd = aimDir ? _c.copy(aimDir) : _c.subVectors(_a, _b).normalize();
  _m.lookAt(_b.set(0, 0, 0), fwd.clone().negate(), _up); mesh.quaternion.setFromRotationMatrix(_m);
  mesh.position.copy(_a); mesh.visible = human.visible && human.mode !== 'ragdoll';
}
export function muzzlePoint(mesh, kind, out = new THREE.Vector3()) { const z = { pistol: 0.18, smg: 0.34, shotgun: 0.62, rifle: 0.6, heavy: 0.42 }[kind] || 0.2; return out.set(0, 0.035, z).applyMatrix4(mesh.matrixWorld); }

// ---------------- combat system ----------------
export class Combat {
  constructor(S) {
    this.S = S; this.targets = new Set(); this.projectiles = []; this.grenadeGeo = new THREE.SphereGeometry(0.06, 8, 6); this.grenadeMat = new THREE.MeshStandardMaterial({ color: 0x3e4a2f, metalness: 0.5 });
    G.on('explosion', (p, size, cause, src) => this.explode(p, size, cause, src));
  }
  addTarget(t) { this.targets.add(t); return t; } // { human, team, alive(), hit(dmg, dir, point, head, source, kind) }
  removeTarget(t) { this.targets.delete(t); }
  // ray vs humans: returns {t, target, head, point}
  rayHumans(o, d, maxT, ignore) {
    let best = null;
    for (const tg of this.targets) {
      if (tg === ignore || !tg.alive() || !tg.human.visible) continue; const h = tg.human;
      const px = h.pos.x, pz = h.pos.z; const ox = o.x - px, oz = o.z - pz; // quick reject
      const tc = -(ox * d.x + oz * d.z) / (d.x * d.x + d.z * d.z || 1e-6); if (tc < 0 || tc > maxT + 1) continue;
      // head sphere
      const head = h.joint(J.head, _a); let th = raySphere(o, d, head, 0.15 * h.scale);
      // body capsule: feet->chest approximated by 3 spheres + legs
      let tb = Infinity; const ch = h.joint(J.chest, _b); const pel = h.joint(J.pelvis, _c);
      for (const k of [0, 0.5, 1]) { const sp = new THREE.Vector3().lerpVectors(pel, ch, k); const tt = raySphere(o, d, sp, 0.25 * (h.look.build || 1)); if (tt < tb) tb = tt; }
      for (const [a, b] of [[J.lHip, J.lFt], [J.rHip, J.rFt], [J.lSh, J.lHa], [J.rSh, J.rHa]]) { const A = h.joint(a), Bp = h.joint(b); for (const k of [0.2, 0.6, 0.95]) { const tt = raySphere(o, d, A.clone().lerp(Bp, k), 0.12); if (tt < tb) tb = tt; } }
      const t = Math.min(th, tb); if (t < maxT && (!best || t < best.t)) best = { t, target: tg, head: th <= tb, point: new THREE.Vector3().copy(o).addScaledVector(d, t) };
    }
    return best;
  }
  rayVehicles(o, d, maxT, ignoreV) {
    let best = null; const near = G.vehicles.list;
    for (const v of near) {
      if (v === ignoreV) continue; const dx = v.pos.x - o.x, dz = v.pos.z - o.z; if (dx * dx + dz * dz > (maxT + 8) ** 2) continue;
      const s = Math.sin(v.yaw), c = Math.cos(v.yaw);
      const lo = { x: c * (o.x - v.pos.x) - s * (o.z - v.pos.z), y: o.y - v.pos.y, z: s * (o.x - v.pos.x) + c * (o.z - v.pos.z) };
      const ld = { x: c * d.x - s * d.z, y: d.y, z: s * d.x + c * d.z };
      const hw = v.spec.W / 2, hl = v.spec.L / 2; let t0 = 0, t1 = maxT;
      for (const [oo, dd, mn, mx] of [[lo.x, ld.x, -hw, hw], [lo.y, ld.y, 0.25, v.spec.H], [lo.z, ld.z, -hl, hl]]) {
        if (Math.abs(dd) < 1e-8) { if (oo < mn || oo > mx) { t0 = 1e9; break; } continue; }
        let a = (mn - oo) / dd, b = (mx - oo) / dd; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) { t0 = 1e9; break; }
      }
      if (t0 < maxT && (!best || t0 < best.t)) best = { t: t0, v, point: new THREE.Vector3().copy(o).addScaledVector(d, t0), localY: lo.y + ld.y * t0 };
    }
    return best;
  }
  // fire a weapon. shooter: {human, team, vehicle?, isPlayer}
  fire(shooter, W, origin, dir, muzzle) {
    const A = G.audio, fx = G.fx; const isP = !!shooter.isPlayer;
    if (A) A.gunshot(muzzle || origin, W.kind === 'heavy' ? 'heavy' : W.kind, isP);
    if (fx && muzzle) { fx.muzzle(muzzle, dir, W.kind === 'shotgun' ? 1.6 : W.kind === 'rifle' ? 1.2 : 0.9); if (W.kind !== 'heavy') fx.shell(muzzle, new THREE.Vector3(-dir.z, 0, dir.x)); if (A && Math.random() < 0.5) A.shell(muzzle); }
    if (isP && G.cam) G.cam.shake(W.shake);
    G.emit('gunshot', origin.clone(), shooter);
    if (W.projectile) { this.launchGrenade(shooter, muzzle || origin, dir); return; }
    const spread = shooter.aiming ? W.aimSpread : W.spread * (shooter.moving ? 1.5 : 1) * (shooter.inaccuracy || 1);
    let anyHit = false;
    for (let p = 0; p < W.pellets; p++) {
      const d = dir.clone(); d.x += rand(-1, 1) * spread; d.y += rand(-1, 1) * spread; d.z += rand(-1, 1) * spread; d.normalize();
      const maxT = W.range; const sh = this.S.raycast(origin.x, origin.y, origin.z, d.x, d.y, d.z, maxT);
      let tMax = sh ? sh.t : maxT;
      const hh = this.rayHumans(origin, d, tMax, shooter.target); const hv = this.rayVehicles(origin, d, hh ? hh.t : tMax, shooter.vehicle);
      // explosive barrels
      let hb = null; if (G.props) { const near = G.props.near(origin.x + d.x * 20, origin.z + d.z * 20, 40, this._pn || (this._pn = [])); for (const pr of near) if (pr.def.shootable) { const t = raySphere(origin, d, new THREE.Vector3(pr.x, pr.y + 0.45, pr.z), 0.42); if (t < (hv ? hv.t : hh ? hh.t : tMax) && (!hb || t < hb.t)) hb = { t, pr }; } }
      let end;
      if (hb) { end = origin.clone().addScaledVector(d, hb.t); G.props.hit(hb.pr, d.clone().multiplyScalar(4), end, 0.3); fx && fx.spark(end, d.clone().negate(), 8, 4); anyHit = true; }
      else if (hv && (!hh || hv.t < hh.t)) {
        end = hv.point; const v = hv.v; v.damage(W.dmg * 0.22, null, null, shooter.human); anyHit = true;
        const glass = hv.localY > v.spec.cabin?.belt; if (glass && Math.random() < 0.5) v.crackGlass(v.glassLevel + 1); if (glass) fx && fx.glass(end, 4, d.clone().negate(), 2);
        fx && fx.impact(end, d.clone().negate(), 'metal'); A && A.bulletImpact(end, glass ? 'glass' : 'metal');
        G.emit('vehicleShot', v, shooter, end);
        // occupants can be hit through glass
        if (glass && v.driver && v.driver.target && Math.random() < 0.35) v.driver.target.hit(W.dmg * 0.7, d, end, false, shooter, W.kind);
      } else if (hh) {
        end = hh.point; const dmg = W.dmg * (hh.head ? 2.6 : 1) * (W.pellets > 1 ? clamp(1.3 - hh.t / W.range, 0.3, 1.2) : 1);
        hh.target.hit(dmg, d, end, hh.head, shooter, W.kind); anyHit = true;
        fx && fx.impact(end, d.clone().negate(), 'flesh'); A && A.thud(end, 0.25);
        if (isP && A) A.ui('hit'); if (isP) G.emit('playerHitTarget', hh.target, hh.head);
      } else if (sh) {
        end = new THREE.Vector3(sh.x, sh.y, sh.z); const n = new THREE.Vector3(sh.nx, sh.ny, sh.nz);
        if (sh.box && sh.box.glass && sh.box.onBreak) sh.box.onBreak(sh.box, d.clone().multiplyScalar(6));
        else { fx && fx.impact(end, n, sh.mat === 'metal' ? 'metal' : sh.mat === 'glass' ? 'glass' : sh.mat === 'ground' && end.y < -0.5 ? 'water' : sh.mat); A && Math.random() < 0.5 && A.bulletImpact(end, sh.mat); if (G.decals && !(sh.mat === 'ground' && end.y < -0.5)) G.decals.bullet(end, n, sh.mat); }
      } else end = origin.clone().addScaledVector(d, maxT);
      // near-miss whiz for player
      if (!isP && G.player && G.audio) { const pp = G.player.pos; const tt = clamp((pp.x - origin.x) * d.x + (pp.y + 1.2 - origin.y) * d.y + (pp.z - origin.z) * d.z, 0, 200); const cx = origin.x + d.x * tt - pp.x, cy = origin.y + d.y * tt - pp.y - 1.2, cz = origin.z + d.z * tt - pp.z; if (cx * cx + cy * cy + cz * cz < 4 && Math.random() < 0.5) G.audio.whoosh(new THREE.Vector3(pp.x + cx, pp.y + 1.2 + cy, pp.z + cz), 0.25, 0.15); }
      if (fx && (Math.random() < (W.tracer || 0.4) || isP)) fx.tracer(muzzle || origin, end, isP ? [1, 0.85, 0.55] : [1, 0.6, 0.4]);
    }
    return anyHit;
  }
  melee(attacker, range = 1.4, dmg = 34) {
    const h = attacker.human; const f = new THREE.Vector3(Math.sin(h.yaw), 0, Math.cos(h.yaw)); let hit = null;
    for (const tg of this.targets) { if (tg === attacker.target || !tg.alive()) continue; const d = tg.human.pos.clone().sub(h.pos); d.y = 0; const dist = d.length(); if (dist < range && d.normalize().dot(f) > 0.4) { tg.hit(dmg, f, tg.human.joint(J.chest), false, attacker, 'melee'); hit = tg; if (G.audio) G.audio.punch(tg.human.pos); break; } }
    if (!hit && G.audio) G.audio.whoosh(h.pos, 0.2, 0.25);
    // punching cars / props
    return hit;
  }
  launchGrenade(shooter, p, dir) {
    const m = new THREE.Mesh(this.grenadeGeo, this.grenadeMat); m.position.copy(p); G.scene.add(m);
    this.projectiles.push({ m, p: p.clone(), v: dir.clone().multiplyScalar(34).add(new THREE.Vector3(0, 3, 0)), life: 4, shooter, bounces: 0 });
  }
  update(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const g = this.projectiles[i]; g.life -= dt; g.v.y -= 15 * dt; const step = g.v.clone().multiplyScalar(dt); const L = step.length();
      const hit = this.S.raycast(g.p.x, g.p.y, g.p.z, step.x, step.y, step.z, L);
      const hv = this.rayVehicles(g.p, step.clone().normalize(), L, g.shooter.vehicle); const hh = this.rayHumans(g.p, step.clone().normalize(), L, g.shooter.target);
      if (hit || hv || hh || g.life <= 0) { const at = hv ? hv.point : hh ? hh.point : hit ? new THREE.Vector3(hit.x, hit.y, hit.z) : g.p; G.scene.remove(g.m); this.projectiles.splice(i, 1); G.emit('explosion', at.clone(), 1.1, 'grenade', g.shooter); continue; }
      g.p.add(step); g.m.position.copy(g.p); if (G.fx && Math.random() < 0.6) G.fx.smokePuff(g.p, { size: 0.3, life: 0.8, alpha: 0.3, rise: 0.2 });
    }
  }
  explode(p, size = 1, cause, src) {
    const fx = G.fx; if (fx) fx.explosion(p, size); if (G.audio) G.audio.explosion(p, size); if (G.decals) G.decals.explosion(p, size);
    if (G.cam && G.camera) { const d = G.camera.position.distanceTo(p); G.cam.shake(clamp(1.1 - d / 90, 0, 1) * size); if (d < 40 && G.input) G.input.rumble(1, 1, 400); }
    if (G.music && G.camera.position.distanceTo(p) < 120) G.music.stinger('boom');
    const R = 9 * size;
    if (G.rigid) G.rigid.blast(p, R * 1.4, 6 * size);
    for (const v of [...G.vehicles.list]) {
      const d = v.pos.distanceTo(p); if (d > R * 1.3 || v === src) continue; const k = 1 - d / (R * 1.3);
      v.damage(140 * k * size, p.clone(), v.pos.clone().sub(p).normalize(), src && src.human);
      if (k > 0.45 && !v.isPlayer && v.mode === 'drive' && v.spec.mass < 7000) { const dir = v.pos.clone().sub(p).normalize(); v.vel.addScaledVector(dir, 10 * k); v.vel.y = 8 * k; v.toRigid(new THREE.Vector3(rand(-3, 3), rand(-2, 2), rand(-3, 3)).multiplyScalar(k)); v.rigid.vel.y += 7 * k * size; }
      else if (k > 0.3) { v.vel.addScaledVector(v.pos.clone().sub(p).setY(0).normalize(), 6 * k); }
    }
    for (const tg of this.targets) { if (!tg.alive()) continue; const d = tg.human.pos.distanceTo(p); if (d > R) continue; const k = 1 - d / R; const dir = tg.human.pos.clone().sub(p).setY(0).normalize(); tg.hit(160 * k * size, dir, tg.human.joint(J.chest), false, src || { explosion: true }, 'explosion', dir.clone().multiplyScalar(14 * k).setY(9 * k)); }
    if (G.props) for (const pr of G.props.near(p.x, p.z, R)) { const d = Math.hypot(pr.x - p.x, pr.z - p.z); const dir = new THREE.Vector3(pr.x - p.x, 0, pr.z - p.z).normalize().multiplyScalar(18 * (1 - d / R)); dir.y = 6; G.props.hit(pr, dir, null, 1); }
    if (G.props && G.props.glassList) for (const g of G.props.glassList) { if (!g.alive) continue; const d = Math.hypot(g.cx - p.x, g.cy - p.y, g.cz - p.z); if (d < R * 2.2) G.props.breakGlass(g, new THREE.Vector3(g.cx - p.x, 0, g.cz - p.z).normalize().multiplyScalar(5)); }
    G.emit('explosionDone', p, size, cause, src);
  }
}
export function raySphere(o, d, c, r) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z; const b = ox * d.x + oy * d.y + oz * d.z; const cc = ox * ox + oy * oy + oz * oz - r * r; const h = b * b - cc; if (h < 0) return Infinity; const t = -b - Math.sqrt(h); return t >= 0 ? t : Infinity;
}
