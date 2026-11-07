// Civic Security pursuit: interceptors with grid-aware pursuit, PIT attempts,
// stuck recovery and roadblocks; plus the Air-1 helicopter with a searchlight.
import * as THREE from 'three';
import { CITY } from './city.js';
import { buildCar, policeLivery } from '../../vehicles/carModel.js';
import { CarBody, HANDLING } from '../../vehicles/carPhysics.js';
import { placeWarped, warpPoint } from './warp.js';
import { Siren, RotorSound } from '../../audio/audio.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/** Segment vs AABB list (XZ). */
export function segmentClear(ax, az, bx, bz, colliders, pad = 1) {
  for (const c of colliders) {
    let t0 = 0, t1 = 1;
    const dx = bx - ax, dz = bz - az;
    for (const [p, d, lo, hi] of [[ax, dx, c.minX - pad, c.maxX + pad], [az, dz, c.minZ - pad, c.maxZ + pad]]) {
      if (Math.abs(d) < 1e-6) { if (p < lo || p > hi) { t0 = 2; break; } continue; }
      let ta = (lo - p) / d, tb = (hi - p) / d; if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
      if (t0 > t1) break;
    }
    if (t0 <= t1 && t0 <= 1) return false;
  }
  return true;
}

export class Police {
  constructor(scene, audio, { max = 6 } = {}) {
    this.scene = scene; this.audio = audio; this.units = []; this.max = max;
    this.template = buildCar('police', { color: 0xffffff, livery: policeLivery, lightbar: true, pushBar: true, metallic: 0.25, roughness: 0.35, wheelStyle: 'steel', darkRims: true, plate: 'CS 0' });
    for (let i = 0; i < max; i++) {
      const tpl = this.template;
      const mesh = tpl.clone(true);
      mesh.body = mesh.children[0]; mesh.def = tpl.def; mesh.halfExtents = tpl.halfExtents;
      mesh.wheels = tpl.wheels.map((w) => { const steer = mesh.children[tpl.children.indexOf(w.steer)]; return { ...w, steer, spin: steer.children[0] }; });
      // each unit flashes independently: give it its own lightbar materials
      const red = tpl.lightbar.red.clone(), blue = tpl.lightbar.blue.clone();
      mesh.traverse((o) => { if (o.material === tpl.lightbar.red) o.material = red; else if (o.material === tpl.lightbar.blue) o.material = blue; });
      mesh.lightbar = { red, blue };
      mesh.visible = false; scene.add(mesh);
      const body = new CarBody(mesh, { ...HANDLING.police });
      this.units.push({ mesh, body, active: false, stuck: 0, reverse: 0, siren: null, phase: Math.random() * 10, aggression: 0.6 + Math.random() * 0.4, roadblock: false, crashed: 0 });
    }
    // two real lights shared by the nearest units
    this.lights = [new THREE.PointLight(0xff2020, 0, 30, 2), new THREE.PointLight(0x2040ff, 0, 30, 2)];
    for (const l of this.lights) scene.add(l);
    this.wanted = 0;
  }

  spawn(at, yaw, { roadblock = false } = {}) {
    const u = this.units.find((x) => !x.active);
    if (!u) return null;
    u.active = true; u.roadblock = roadblock; u.scripted = null; u.stuck = 0; u.reverse = 0; u.crashed = 0;
    u.body.place(at.x, at.z, yaw); u.body.health = 1; u.body.enabled = true;
    u.mesh.visible = true;
    if (!u.siren && this.audio.ctx) u.siren = new Siren(this.audio);
    return u;
  }
  despawn(u) { u.active = false; u.mesh.visible = false; if (u.siren) { u.siren.stop(); u.siren = null; } }

  /** Spawn a unit behind the player at a street intersection out of sight. */
  spawnBehind(player, colliders) {
    const { P, N } = CITY;
    const back = player.forward.clone().multiplyScalar(-1);
    let best = null, bestScore = Infinity;
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
      const p = new THREE.Vector3(i * P, 0, j * P);
      const d = p.distanceTo(player.pos);
      if (d < 90 || d > 240) continue;
      const dir = p.clone().sub(player.pos).normalize();
      const score = -dir.dot(back) * 100 + Math.abs(d - 140) * 0.3 + (segmentClear(player.pos.x, player.pos.z, p.x, p.z, colliders) ? 60 : 0);
      if (score < bestScore) { bestScore = score; best = p; }
    }
    if (!best) return null;
    const yaw = Math.atan2(player.pos.x - best.x, player.pos.z - best.z);
    return this.spawn(best, yaw);
  }

  /** Two cruisers parked across a street ahead of the player. */
  roadblock(player) {
    const { P } = CITY;
    const f = player.forward;
    const ahead = player.pos.clone().addScaledVector(f, 160);
    const ix = Math.round(ahead.x / P) * P, iz = Math.round(ahead.z / P) * P;
    const along = Math.abs(f.x) > Math.abs(f.z);
    const units = [];
    for (const off of [-4.5, 4.5]) {
      const p = along ? new THREE.Vector3(ix - Math.sign(f.x) * 20, 0, iz + off) : new THREE.Vector3(ix + off, 0, iz - Math.sign(f.z) * 20);
      const u = this.spawn(p, along ? 0.2 * Math.sign(off) : Math.PI / 2 + 0.2 * Math.sign(off), { roadblock: true });
      if (u) units.push(u);
    }
    return units;
  }

  update(dt, t, player, colliders, ctx) {
    const pp = player.pos;
    let nearest = [];
    for (const u of this.units) {
      if (!u.active) continue;
      const b = u.body;
      const toP = new THREE.Vector3().subVectors(pp, b.pos);
      const dist = toP.length();
      if (dist > 420 && !u.roadblock) { this.despawn(u); continue; }
      if (u.scripted) {
        // cutscene arrival: roll up and stop at a mark (never into the player's car)
        const to = new THREE.Vector3().subVectors(u.scripted, b.pos); to.y = 0;
        const dd = to.length(), want = Math.atan2(to.x, to.z);
        let a = want - b.yaw; a = Math.atan2(Math.sin(a), Math.cos(a));
        const vWant = Math.min(11, Math.sqrt(Math.max(0, 2 * 3.5 * (dd - 1.5)))); // constant-deceleration stop on the mark
        const v = b.forwardSpeed;
        b.input = { throttle: v < vWant - 0.5 ? 0.6 : 0, brake: v > vWant + 0.5 || dd < 1.5 ? 1 : 0, steer: dd > 3 ? -Math.max(-1, Math.min(1, a * 1.5)) : 0, handbrake: dd < 1.5 ? 1 : 0, nitro: 0 };
      } else if (u.roadblock) {
        b.input = { throttle: 0, brake: 1, steer: 0, handbrake: 1, nitro: 0 };
        if (dist < 40 && b.lastImpact > 2) u.roadblock = false; // knocked loose, join the chase
      } else if (u.crashed > 0) {
        u.crashed -= dt; b.input = { throttle: 0, brake: 1, steer: 0, handbrake: 1, nitro: 0 };
      } else {
        // --- pursuit target selection
        const lead = clamp(dist / 40, 0, 1.2);
        const tgt = pp.clone().addScaledVector(player.vel, lead);
        let aim = tgt;
        if (!segmentClear(b.pos.x, b.pos.z, tgt.x, tgt.z, ctx.nearColliders(b.pos), 2)) {
          const { P } = CITY;
          const ci = Math.round(b.pos.x / P), cj = Math.round(b.pos.z / P);
          let best = null, bs = Infinity;
          for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
            const I = new THREE.Vector3((ci + di) * P, 0, (cj + dj) * P);
            if (I.distanceTo(b.pos) < 8) continue;
            if (!segmentClear(b.pos.x, b.pos.z, I.x, I.z, ctx.nearColliders(b.pos), 2)) continue;
            const s = I.distanceTo(b.pos) + I.distanceTo(tgt) * 1.2;
            if (s < bs) { bs = s; best = I; }
          }
          if (best) aim = best;
        }
        // PIT: aim at the player's rear quarter when close
        if (dist < 16) aim = pp.clone().addScaledVector(player.forward, -1.6).addScaledVector(player.right, Math.sin(t + u.phase) * 1.2);
        const want = Math.atan2(aim.x - b.pos.x, aim.z - b.pos.z);
        let d = want - b.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
        const spd = b.speed;
        let steer = clamp(d * 1.8, -1, 1);
        let throttle = 1, brake = 0;
        if (Math.abs(d) > 0.7 && spd > 18) { throttle = 0.2; brake = 0.6; }
        if (dist < 25) throttle = clamp(0.6 + (player.speed - spd) * 0.1 + u.aggression * 0.3, 0.3, 1);
        // stuck recovery
        if (spd < 1.2 && throttle > 0.5) u.stuck += dt; else u.stuck = Math.max(0, u.stuck - dt);
        if (u.stuck > 1.6) { u.reverse = 1.2; u.stuck = 0; }
        if (u.reverse > 0) { u.reverse -= dt; throttle = 0; brake = 1; steer = -steer; }
        b.input = { throttle, brake, steer: -steer, handbrake: Math.abs(d) > 1.2 && spd > 12 ? 1 : 0, nitro: 0 }; // physics uses +steer = right
        // catch-up assist when far behind (keeps the chase tense)
        if (dist > 120 && spd < player.speed + 8) b.vel.addScaledVector(b.forward, dt * 6);
      }
      const nsub = Math.max(1, Math.ceil(dt / (1 / 100)));
      const near = ctx.nearColliders(b.pos, 12);
      for (let k = 0; k < nsub; k++) { b.update(dt / nsub, null); for (const c of near) ctx.collideStatic(b, c); }
      placeWarped(u.mesh, b.pos, b.yaw, b.pitch, b.roll);
      // lightbar strobe
      const s = Math.sin((t + u.phase) * 18), s2 = Math.sin((t + u.phase) * 18 + Math.PI);
      const flashR = (s > 0.2 && Math.floor((t + u.phase) * 3) % 2 === 0) ? 6 : 0, flashB = (s2 > 0.2 && Math.floor((t + u.phase) * 3) % 2 === 1) ? 6 : 0;
      u.mesh.lightbar.red.emissiveIntensity = flashR; u.mesh.lightbar.blue.emissiveIntensity = flashB;
      u.flash = [flashR, flashB];
      // siren with doppler
      if (u.siren) {
        const rel = new THREE.Vector3().subVectors(b.vel, player.vel).dot(toP.clone().normalize());
        u.siren.update(dt, warpPoint(b.pos).p, clamp(1 + rel / 340, 0.85, 1.15), u.roadblock ? 0.05 : 0.12);
      }
      nearest.push([dist, u]);
    }
    nearest.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < this.lights.length; i++) {
      const L = this.lights[i], n = nearest[0];
      if (!n) { L.intensity = 0; continue; }
      const u = n[1];
      L.position.copy(u.mesh.position).add(new THREE.Vector3(0, 2, 0));
      L.intensity = u.flash[i] * 6;
    }
    this.nearest = nearest;
  }

  get activeUnits() { return this.units.filter((u) => u.active); }
  clear() { for (const u of this.units) if (u.active) this.despawn(u); }
}

// ---------------------------------------------------------------------------
// Air-1: helicopter model + behaviour
// ---------------------------------------------------------------------------
export function buildHelicopter() {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: 0x1b2a44, metalness: 0.5, roughness: 0.38, clearcoat: 0.8 });
  const white = new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.6, metalness: 0.5 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0a1218, roughness: 0.05, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.8 });
  // fuselage: lathe profile
  const prof = [[0, -2.6], [0.45, -2.4], [0.95, -1.6], [1.15, -0.4], [1.12, 0.8], [0.9, 1.6], [0.45, 2.1], [0, 2.25]].map(([r, z]) => new THREE.Vector2(r, z));
  const fus = new THREE.LatheGeometry(prof, 24); fus.rotateX(Math.PI / 2); fus.scale(1, 0.85, 1);
  const body = new THREE.Mesh(fus, paint); body.position.y = 1.1; g.add(body);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.0, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  canopy.scale.set(1.0, 0.85, 1.3); canopy.rotation.x = Math.PI / 2.4; canopy.position.set(0, 1.35, 1.35); g.add(canopy);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.14, 1.14, 0.25, 24, 1, true), white); stripe.rotation.x = Math.PI / 2; stripe.scale.y = 1; stripe.position.set(0, 1.1, -0.6); stripe.scale.set(1, 1, 0.85); g.add(stripe);
  // tail boom + fin + tail rotor
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 5.2, 12), paint); boom.rotation.x = Math.PI / 2; boom.position.set(0, 1.45, -4.6); g.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.9), paint); fin.position.set(0, 2.1, -7.0); fin.rotation.x = -0.25; g.add(fin);
  const stab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.5), paint); stab.position.set(0, 1.5, -6.3); g.add(stab);
  const tailRotor = new THREE.Group(); tailRotor.position.set(0.18, 2.2, -7.1);
  for (let i = 0; i < 2; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.3, 0.12), dark); b.rotation.x = i * Math.PI / 2; tailRotor.add(b); }
  g.add(tailRotor);
  // engine housing + mast + rotor
  const eng = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 2.2), paint); eng.position.set(0, 2.05, -0.5); g.add(eng);
  for (let i = 0; i < 2; i++) { const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.5, 10), dark); ex.rotation.x = Math.PI / 2; ex.position.set(i ? 0.3 : -0.3, 2.1, -1.75); g.add(ex); }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.6, 10), dark); mast.position.set(0, 2.55, -0.2); g.add(mast);
  const rotor = new THREE.Group(); rotor.position.set(0, 2.85, -0.2);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.18, 12), dark); rotor.add(hub);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.04, 0.32), dark); b.position.x = 2.75; const arm = new THREE.Group(); arm.add(b); arm.rotation.y = (i / 4) * Math.PI * 2; b.rotation.x = 0.06; rotor.add(arm); }
  // motion-blur disc for the spinning rotor
  const disc = new THREE.Mesh(new THREE.CircleGeometry(5.5, 40), new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; rotor.add(disc);
  g.add(rotor);
  // skids
  for (const sx of [-1, 1]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 8), dark); skid.rotation.x = Math.PI / 2; skid.position.set(sx * 0.95, 0.05, 0.2); g.add(skid);
    for (const z of [-0.6, 0.9]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 6), dark); st.position.set(sx * 0.8, 0.4, z); st.rotation.z = sx * 0.4; g.add(st); }
  }
  // searchlight turret + beam
  const turret = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), dark); turret.position.set(0, 0.35, 1.6); g.add(turret);
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uI: { value: 0.22 } },
    vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; varying float vZ; void main(){ vY = clamp(-position.y, 0.0, 1.0); vec4 mv = modelViewMatrix * vec4(position,1.0); vZ = -mv.z; vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uI; varying float vY; varying vec3 vN; varying vec3 vV; varying float vZ; void main(){ float rim = pow(abs(dot(vN, vV)), 1.5); float along = pow(1.0 - vY, 1.6) * 0.85 + 0.08; float nearFade = smoothstep(3.0, 18.0, vZ); gl_FragColor = vec4(vec3(1.0, 0.97, 0.9) * uI * rim * along * nearFade, 1.0); }',
  });
  const beamGeo = new THREE.CylinderGeometry(0.15, 7, 1, 24, 1, true); beamGeo.translate(0, -0.5, 0);
  const beam = new THREE.Mesh(beamGeo, beamMat); beam.frustumCulled = false;
  const spot = new THREE.SpotLight(0xfff4e0, 0, 220, 0.12, 0.5, 1.2); spot.castShadow = false;
  g.add(spot); g.add(spot.target);
  const nav = [[0xff2020, -1.1], [0x20ff40, 1.1]].map(([c, x]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, 1.2, -0.2); g.add(m); return m; });
  g.userData = { rotor, tailRotor, beam, spot, turret, nav };
  g.traverse((o) => { if (o.isMesh && o !== beam) o.castShadow = true; });
  return { group: g, beam };
}

export class Helicopter {
  constructor(scene, audio) {
    const { group, beam } = buildHelicopter();
    this.group = group; this.beam = beam; scene.add(group); scene.add(beam);
    this.pos = new THREE.Vector3(0, 80, 0); this.vel = new THREE.Vector3();
    this.active = false; group.visible = false; beam.visible = false;
    this.audio = audio; this.sound = null; this.spot = 0; this.lockT = 0;
    this.lightTarget = new THREE.Vector3();
  }
  activate(at) { this.active = true; this.group.visible = true; this.beam.visible = true; this.pos.copy(at); if (this.audio.ctx && !this.sound) this.sound = new RotorSound(this.audio); }
  deactivate() { this.active = false; this.group.visible = false; this.beam.visible = false; if (this.sound) { this.sound.stop(); this.sound = null; } }
  /** `hidden` = player is under cover. Returns true if the player is lit. */
  update(dt, t, player, hidden) {
    if (!this.active) return false;
    const pp = player.pos;
    const want = pp.clone().addScaledVector(player.vel, 1.2).add(new THREE.Vector3(-player.forward.x * 30, 55, -player.forward.z * 30));
    const acc = want.sub(this.pos).multiplyScalar(1.2).sub(this.vel.clone().multiplyScalar(1.6));
    this.vel.addScaledVector(acc, dt);
    if (this.vel.length() > 60) this.vel.setLength(60);
    this.pos.addScaledVector(this.vel, dt);
    const wp = warpPoint(this.pos).p;
    this.group.position.copy(wp);
    const yaw = Math.atan2(this.vel.x, this.vel.z);
    this.group.rotation.set(clamp(this.vel.length() * 0.006, 0, 0.3), yaw, clamp(-acc.x * 0.002, -0.3, 0.3), 'YXZ');
    const u = this.group.userData;
    u.rotor.rotation.y += dt * 28; u.tailRotor.rotation.x += dt * 50;
    u.nav.forEach((n, i) => (n.visible = Math.sin(t * 6 + i) > 0));
    // searchlight sweeps toward the player; loses lock under cover
    const tgt = hidden ? pp.clone().add(new THREE.Vector3(Math.sin(t * 0.7) * 25, 0, Math.cos(t * 0.5) * 25)) : pp;
    this.lightTarget.lerp(tgt, 1 - Math.exp(-dt * (hidden ? 0.8 : 3)));
    const lt = warpPoint(this.lightTarget).p;
    const src = this.group.localToWorld(new THREE.Vector3(0, 0.35, 1.6));
    const len = src.distanceTo(lt);
    this.beam.position.copy(src);
    this.beam.scale.set(1, len, 1);
    this.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), lt.clone().sub(src).normalize());
    u.spot.position.copy(this.group.worldToLocal(src.clone()));
    u.spot.target.position.copy(this.group.worldToLocal(lt.clone()));
    u.spot.intensity = 1600;
    if (this.sound) this.sound.update(wp, 0.7);
    const lit = !hidden && this.lightTarget.distanceTo(pp) < 9;
    return lit;
  }
}
