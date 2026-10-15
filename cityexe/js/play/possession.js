// Possession: dive into any citizen in the live simulation and play as them.
// No separate mission instance: you take over whatever they are doing right now,
// and when you leave, their AI picks up from wherever you left them.
import * as THREE from 'three';
import { clamp, dist, wrapAngle, damp } from '../core/math.js';
import { rand } from '../core/rng.js';
import { BTYPES } from '../sim/economy.js';
import { EMERGENCY } from '../sim/traffic.js';

const tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3();

export class Possession {
  constructor(game) {
    this.game = game;
    this.c = null;
    this.mode = null; // 'foot' | 'drive' | 'ride' | 'inside'
    this.autopilot = false;
    this.pending = null;
    this.prompts = [];
    this.msg = null;
    this.hoseT = 0;
    this.actionT = 0;
    this.taxiFare = null;
    this.camMode = 0;
  }

  get active() { return !!this.c || !!this.pending; }
  get W() { return this.game.world; }

  // ------------------------------------------------------------------ entering
  possess(sel) {
    const W = this.W;
    let c = null;
    if (sel.kind === 'citizen') c = W.citizens[sel.id];
    else if (sel.kind === 'vehicle') {
      const v = W.traffic.byId.get(sel.id);
      if (v && v.driver != null) c = W.citizens[v.driver];
      else if (v && v.unit != null) { const u = W.services.unit(v.unit); if (u.crew.length) c = W.citizens[u.crew[0]]; }
      else if (v && v.owner != null) { this.game.toast(`Nobody is in this ${v.T.label}. It belongs to ${W.citizens[v.owner].name}.`); return; }
    } else if (sel.kind === 'building') { this.game.toast('Pick a person inside from the building card.'); return; }
    if (!c) return;
    if (c.status === 'dead' || c.status === 'left') { this.game.toast(`${c.name} is no longer in the city.`); return; }
    if (c.status === 'jail') { this.game.toast(`${c.name} is in jail until ${W.history.timeStr(c.releaseAt)}.`); return; }
    if (c.status === 'hospital') { this.game.toast(`${c.name} is recovering in the hospital.`); return; }
    if (c.state === 'abstract' || c.inTransit) {
      this.game.toast(`${c.name} is underway (off-screen). Slow down time and try again.`);
      if (this.game.speedIdx >= 5) this.game.setSpeed(2);
      return;
    }
    if (this.c) this.release({ instant: true });
    // camera swoop to them; control is taken when the swoop lands
    this.pending = c;
    this.game.mode = 'transition';
    this.game.rig.follow = null;
    if (this.game.speedIdx > 3) this.game.setSpeed(2);
    const T = this.game.rig.third;
    const p0 = W.citizenPos(c);
    const veh = c.veh != null ? W.traffic.byId.get(c.veh) : null;
    T.yaw = veh ? veh.h : c.ped ? c.ped.h : Math.atan2((p0?.x || 0) - this.game.renderer.camera.position.x, (p0?.z || 0) - this.game.renderer.camera.position.z);
    T.pitch = veh ? 0.22 : 0.18;
    T.dist = veh ? veh.len * 1.3 + 4.5 : 4.2;
    T.height = veh ? veh.T.hgt * 0.7 : 1.2;
    T.lookY = veh ? 1.2 : 1.35;
    this.game.emit('possessStart', c);
    this.game.rig.startTransition(() => {
      const ent = this.entityPos(c);
      if (!ent) return null;
      this.game.rig.thirdPose(ent, tmpPos, tmpLook);
      return { pos: tmpPos, look: tmpLook, fov: 60 };
    }, 1.9, () => this.take(c));
    this.game.audio && this.game.audio.whoosh(true);
  }

  entityPos(c) {
    const W = this.W;
    if (c.dutyHeli && (c.possessed || this.heli === c.dutyHeli || c.dutyHeli.state !== 'pad' || this.pending === c)) return c.dutyHeli;
    if (c.ped) return c.ped;
    if (c.veh != null) { const v = W.traffic.byId.get(c.veh); if (v && v.state !== 'garage') return v; }
    if (c.at != null) { const b = W.city.buildings[c.at]; const [x, z] = W.citizenAI.doorOut(b); return { x, z, y: 0, h: 0 }; }
    return null;
  }

  take(c) {
    const W = this.W;
    this.pending = null;
    if (c.status !== 'ok') { this.game.mode = 'observe'; return; }
    this.c = c;
    c.possessed = true;
    this.goalAtStart = c.goal ? { ...c.goal } : null;
    this.game.mode = 'possess';
    this.autopilot = false;
    // inside a building: step out of the door
    if (c.state === 'inside' && c.at != null && !c.dutyHeli) {
      const b = W.city.buildings[c.at];
      if (this.game.interiors && this.game.interiors.canEnter(b)) { this.game.interiors.enter(b, c, true); this.mode = 'inside'; this.afterTake(); return; }
      W.citizenAI.leaveBuilding(c);
      c.state = 'walking';
    }
    if (c.busLeg || c.taxiReq) { this.cancelTransitWait(c); }
    c.trip = null;
    if (c.dutyHeli) {
      if (c.at != null) { W.city.buildings[c.at].occupants.delete(c.id); c.at = null; }
      this.mode = 'fly'; this.heli = c.dutyHeli; this.heli.player = true; this.heli.input = {};
      const T = this.game.rig.third; T.dist = 16; T.height = 3; T.pitch = 0.25; T.yaw = this.heli.h;
      this.afterTake();
      return;
    }
    const v = c.veh != null ? W.traffic.byId.get(c.veh) : null;
    if (v && v.driver === c.id) this.enterDrive(v, true);
    else if (v) { this.mode = 'ride'; this.rideVeh = v; }
    else if (c.ped) this.enterFoot();
    else { this.release({ instant: true }); return; }
    this.afterTake();
  }

  afterTake() {
    const W = this.W;
    W.possessed = { c: this.c, veh: this.veh || null };
    this.game.input.lock();
    this.game.emit('possess', this.c);
    if (W.anomalies) W.anomalies.onPossess(this.c);
  }

  cancelTransitWait(c) {
    const W = this.W;
    if (c.busLeg) { for (const s of W.transit.stops) { const i = s.waiting.indexOf(c.id); if (i >= 0) s.waiting.splice(i, 1); } c.busLeg = null; }
    if (c.taxiReq) c.taxiReq = null;
  }

  enterFoot() {
    const c = this.c;
    this.mode = 'foot';
    this.veh = null;
    const p = c.ped;
    p.player = true;
    p.path = null; p.onArrive = null; p.state = 'idle'; p.action = ''; p.run = false;
    p.vx = 0; p.vz = 0; p.vy = 0; p.y = p.y || 0;
    this.W.possessed = { c, veh: null };
    const T = this.game.rig.third;
    T.dist = 4.2; T.height = 1.2; T.lookY = 1.35; T.pitch = 0.18;
  }

  enterDrive(v, keepSpeed = false) {
    const W = this.W;
    this.mode = 'drive';
    this.veh = v;
    W.traffic.toFree(v);
    v.player = true;
    v.isStaticObstacle = false;
    v.lightsOn = W.env.night > 0.3;
    v.input = { throttle: 0, brake: 0, steer: 0, handbrake: 0, reverse: 0 };
    v.route = null;
    v.onArrive = null; v.lastDest = null;
    v.fleeing = false;
    W.possessed = { c: this.c, veh: v };
    const T = this.game.rig.third;
    T.dist = v.len * 1.25 + 4.5; T.height = v.T.hgt * 0.75; T.lookY = 1.3; T.pitch = 0.2;
    T.yaw = v.h;
    this.game.audio && this.game.audio.engineStart(v);
  }

  // ------------------------------------------------------------------ leaving
  release(opts = {}) {
    const W = this.W;
    const c = this.c;
    if (!c) { this.pending = null; this.game.mode = 'observe'; return; }
    if (this.game.interiors && this.game.interiors.active) this.game.interiors.exit(true);
    const v = this.veh;
    c.possessed = false;
    W.possessed = null;
    if (this.heli) { this.heli.player = false; this.heli.input = null; this.heli = null; }
    this.autopilot = false;
    if (c.ped) { c.ped.player = false; c.ped.action = c.ped.action === 'hose' ? '' : c.ped.action; c.ped.run = false; }
    if (v) {
      v.player = false;
      v.input = null;
      if (v.siren && !(v.unit != null && W.services.unit(v.unit).state === 'respond')) v.siren = !!(v.unit != null && ['respond', 'pursuit'].includes(W.services.unit(v.unit).state));
      this.game.audio && this.game.audio.engineStop();
    }
    // hand control back to the AI
    if (c.duty != null && typeof c.duty === 'number') {
      const u = W.services.unit(c.duty);
      if (u) {
        if (c.ped && u.state !== 'scene') {
          // walk back to the unit vehicle and continue
          W.services.crewIn(u, () => W.services.recover(u));
        } else if (!c.ped) W.services.recover(u);
      }
    } else if (c.dutyBus) {
      const bus = c.dutyBus;
      if (c.veh != null) { bus.state = 'run'; W.transit.toNextStop(bus); }
    } else if (c.flags.suspectOf && W.incidents.get(c.flags.suspectOf)?.data.pursuitBy != null) {
      const inc = W.incidents.get(c.flags.suspectOf);
      W.incidents.suspectFleeAI(c, W.services.unit(inc.data.pursuitBy));
    } else if (c.state === 'inside') {
      c.nextThink = W.time;
    } else if (!c.flags.cuffed && c.status === 'ok' && !(c.injured > 0.35)) {
      if (c.goal && c.goal.type === 'crime') c.goal = null;
      W.citizenAI.resume(c);
    }
    this.c = null; this.veh = null; this.mode = null; this.rideVeh = null;
    this.game.input.unlock();
    this.game.mode = 'observe';
    // swoop back out to the city view, keep following them
    const rig = this.game.rig;
    const pos = W.citizenPos(c) || { x: rig.cam.position.x, z: rig.cam.position.z };
    rig.target.set(pos.x, 0, pos.z);
    rig.goal.target.set(pos.x, 0, pos.z);
    rig.goal.dist = opts.far ? 260 : 85; rig.dist = rig.goal.dist;
    rig.goal.yaw = rig.third.yaw + Math.PI; rig.yaw = rig.goal.yaw;
    rig.goal.yaw = rig.yaw = Math.atan2(rig.cam.position.x - pos.x, rig.cam.position.z - pos.z);
    rig.userPitch = false;
    rig.goal.pitch = rig.pitch = rig.autoPitch(rig.goal.dist);
    if (!opts.instant) {
      rig.startTransition(() => {
        const p = W.citizenPos(c) || pos;
        const t = new THREE.Vector3(p.x, 0, p.z);
        return { pos: rig.observePose(t, rig.goal.dist, rig.yaw, rig.pitch, new THREE.Vector3()), look: t, fov: 55 };
      }, 1.6);
      this.game.audio && this.game.audio.whoosh(false);
    }
    this.game.select({ kind: 'citizen', id: c.id });
    rig.setFollow(() => this.game.selectionPos({ kind: 'citizen', id: c.id }));
    rig.goal.dist = opts.far ? 260 : 85;
    this.game.emit('release', c);
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const g = this.game;
    const rig = g.rig;
    const I = g.input;
    rig.mode = 'third';
    if (this.pending) { if (rig.trans) rig.updateTransition(dt); else this.take(this.pending); return; }
    const c = this.c;
    if (!c) return;
    if (c.status !== 'ok') { this.end(c.status === 'jail' ? `${c.first} was taken to jail.` : `${c.first} was taken to the hospital.`); return; }
    if (I.mouse.clicked && !I.locked) I.lock();
    if (I.hit('KeyQ') || I.hit('Tab')) { this.release(); return; }
    if (I.hit('KeyR')) this.toggleAutopilot();
    if (I.hit('KeyC') && this.mode !== 'fly') this.camMode = (this.camMode + 1) % 2;
    this.prompts = [];
    this.dutyArrival();
    if (this.game.interiors && this.game.interiors.active && !this.autopilot) { this.mode = 'inside'; this.game.interiors.updatePlayer(dt, this); }
    else if (this.mode === 'inside') { if (this.c.ped) this.enterFoot(); else this.updateAutopilot(dt); }
    else if (this.autopilot) this.updateAutopilot(dt);
    else if (this.mode === 'foot') this.updateFoot(dt);
    else if (this.mode === 'drive') this.updateDrive(dt);
    else if (this.mode === 'ride') this.updateRide(dt);
    else if (this.mode === 'fly') this.updateFly(dt);
    if (rig.trans) rig.updateTransition(dt);
    if (this.msgT > 0) this.msgT -= dt;
  }

  // a possessed responder reaching their call puts the unit "on scene"
  dutyArrival() {
    const W = this.W, c = this.c;
    if (!c || this.autopilot || typeof c.duty !== 'number') return;
    const u = W.services.unit(c.duty);
    if (!u || u.state !== 'respond' || u.incident == null) return;
    const inc = W.incidents.get(u.incident);
    if (!inc || inc.closed) return;
    const pos = W.citizenPos(c);
    if (!pos || pos.inside) return;
    const v = this.veh;
    if (dist(pos.x, pos.z, inc.x, inc.z) < 32 && (!v || v.speed < 2.5)) {
      W.services.arriveScene(u);
      const s = inc.suspects.length ? W.citizens[inc.suspects[0]] : null;
      if (u.state === 'pursuit' && s) this.game.toast(`The suspect, ${s.name}, is nearby. Stop them!`);
      else if (u.kind === 'police') this.game.toast('On scene. Talk to witnesses, or go after the suspect if they\'re still around.');
      else if (u.kind === 'fire') this.game.toast('On scene. Hold the mouse button near the fire to spray.');
      else if (u.kind === 'ems') this.game.toast('On scene. Hold E next to the injured to treat them.');
    }
  }

  end(text) {
    this.game.toast(text);
    this.release({ far: false });
  }

  toggleAutopilot() {
    const W = this.W;
    const c = this.c;
    if (!c) return;
    if (!this.autopilot) {
      // hand the body back to the AI but keep the camera on them
      this.autopilot = true;
      c.possessed = false;
      W.possessed = null;
      if (c.ped) c.ped.player = false;
      if (this.veh) { this.veh.player = false; this.veh.input = null; }
      if (this.heli) { this.heli.player = false; this.heli.input = null; }
      if (c.duty != null && typeof c.duty === 'number') W.services.recover(W.services.unit(c.duty));
      else if (!c.dutyHeli) W.citizenAI.resume(c);
      this.game.toast(`Autopilot: ${c.first} carries on with their day. Press R to take back control.`);
    } else {
      this.autopilot = false;
      c.possessed = true;
      c.trip = null;
      this.cancelTransitWait(c);
      const v = c.veh != null ? W.traffic.byId.get(c.veh) : null;
      if (c.dutyHeli) { this.mode = 'fly'; this.heli = c.dutyHeli; this.heli.player = true; this.heli.input = {}; }
      else if (v && v.driver === c.id) this.enterDrive(v);
      else if (v) { this.mode = 'ride'; this.rideVeh = v; }
      else if (c.ped) this.enterFoot();
      else if (c.at != null) { W.citizenAI.leaveBuilding(c); if (c.ped) this.enterFoot(); }
      W.possessed = { c, veh: this.veh };
    }
  }

  updateAutopilot(dt) {
    const W = this.W, c = this.c;
    const ent = this.entityPos(c);
    if (!ent) return;
    if (c.state === 'inside' && c.at != null && this.game.interiors && this.game.interiors.canEnter(W.city.buildings[c.at]) && !this.game.interiors.active) {
      this.game.interiors.enter(W.city.buildings[c.at], c, false);
    }
    if (this.heli && c.dutyHeli !== this.heli) this.heli = null; // shift ended and they landed
    const v = c.veh != null ? W.traffic.byId.get(c.veh) : null;
    const T = this.game.rig.third;
    if (c.dutyHeli && ent === c.dutyHeli) { this.game.rig.updateThird(dt, ent, { autoYaw: Math.hypot(ent.vx, ent.vz) > 3 ? ent.h : null, autoK: 1.6, minDist: 8, maxDist: 60, fov: 62 }); return; }
    if (v) { T.dist = damp(T.dist, v.len * 1.25 + 4.5, 2, dt); T.height = v.T.hgt * 0.75; }
    else { T.dist = damp(T.dist, 4.8, 2, dt); T.height = 1.2; }
    this.game.rig.updateThird(dt, ent, { autoYaw: v ? v.h : c.ped && c.ped.v > 0.3 ? c.ped.h : null, autoK: v ? 2.5 : 1.2 });
  }

  // ------------------------------------------------------------------ on foot
  updateFoot(dt) {
    const g = this.game, W = this.W, I = g.input, c = this.c;
    const p = c.ped;
    if (!p) {
      if (c.veh != null) { const v = W.traffic.byId.get(c.veh); if (v && v.driver === c.id && !c.flags.cuffed) this.enterDrive(v); else { this.mode = 'ride'; this.rideVeh = v; } }
      return;
    }
    if (p.action === 'cuffed') { this.prompts.push({ key: '', text: 'You are under arrest' }); g.rig.updateThird(dt, p); return; }
    if (p.fallen > 0) { p.fallen -= dt; g.rig.updateThird(dt, p); return; }
    const T = g.rig.third;
    const run = I.down('ShiftLeft') || I.down('ShiftRight');
    const mx = I.axis('KeyA', 'KeyD'), mz = I.axis('KeyS', 'KeyW');
    const yaw = T.yaw;
    // camera-relative movement: forward = (sin yaw, cos yaw); right = (-cos yaw, sin yaw)
    let dx = Math.sin(yaw) * mz - Math.cos(yaw) * mx;
    let dz = Math.cos(yaw) * mz + Math.sin(yaw) * mx;
    const len = Math.hypot(dx, dz);
    const speedT = len > 0.01 ? (run ? 6.2 : 2.3) * (c.injured > 0.2 ? 0.6 : 1) * (W.weather.snowCover > 0.5 ? 0.85 : 1) : 0;
    if (len > 0.01) { dx /= len; dz /= len; }
    const accel = speedT > p.v ? 9 : 14;
    p.v = p.v + clamp(speedT - p.v, -accel * dt, accel * dt);
    if (len > 0.01) p.h = p.h + wrapAngle(Math.atan2(dx, dz) - p.h) * Math.min(1, dt * 12);
    const mvx = Math.sin(p.h) * p.v, mvz = Math.cos(p.h) * p.v;
    let nx = p.x + mvx * dt, nz = p.z + mvz * dt;
    // jump & gravity
    if (I.hit('Space') && (p.y || 0) <= this.groundY(p.x, p.z) + 0.01) p.vy = 4.6;
    p.vy = (p.vy || 0) - 13 * dt;
    p.y = (p.y || 0) + p.vy * dt;
    const gy = this.groundY(nx, nz);
    if (p.y <= gy) { p.y = gy; p.vy = 0; }
    // collisions: buildings, water, vehicles
    const hit = W.collideBox(nx, nz, 0.38, p.y);
    if (hit) { nx += hit.nx * hit.pen; nz += hit.nz * hit.pen; }
    if (W.inWater(nx, nz) && !W.inWater(p.x, p.z)) { nx = p.x; nz = p.z; }
    for (const v of this.nearVehicles(nx, nz, 5)) {
      const lx = (nx - v.x) * Math.cos(v.h) - (nz - v.z) * Math.sin(v.h);
      const lz = (nx - v.x) * Math.sin(v.h) + (nz - v.z) * Math.cos(v.h);
      const hw = v.wid / 2 + 0.35, hl = v.len / 2 + 0.35;
      if (Math.abs(lx) < hw && Math.abs(lz) < hl && Math.abs((v.y || 0) - p.y) < 2) {
        const px = hw - Math.abs(lx), pz = hl - Math.abs(lz);
        let ox = 0, oz = 0;
        if (px < pz) ox = Math.sign(lx) * px; else oz = Math.sign(lz) * pz;
        nx += ox * Math.cos(v.h) + oz * Math.sin(v.h);
        nz += -ox * Math.sin(v.h) + oz * Math.cos(v.h);
        // getting hit by a moving car
        const sp = v.state === 'lane' ? v.v : v.speed;
        if (sp > 4 && !v.player) { W.incidents.pedHit(p, v, sp); g.rig.shake = 1; g.audio && g.audio.impact(sp); }
      }
    }
    p.x = nx; p.z = nz;
    p.state = p.v > 0.1 ? 'walk' : 'idle';
    p.run = run && p.v > 3;
    p.anim += dt * p.v * 2.4;
    p.path = [{ x: p.x + mvx, z: p.z + mvz }]; p.wi = 0; // keeps animation code happy
    if (p.v < 0.1) p.path = null;
    W.playerObstacles = [{ x: p.x, z: p.z, radius: 0.5, player: true, y: p.y }];
    // footsteps
    if (p.v > 0.5) { this.stepAcc = (this.stepAcc || 0) + dt * p.v * 0.75; if (this.stepAcc > 1) { this.stepAcc = 0; g.audio && g.audio.footstep(run, W.weather.wet, W.weather.snowCover); } }
    // interactions
    this.footInteractions(dt);
    g.rig.updateThird(dt, p, { minDist: 2, maxDist: 14 });
  }

  groundY(x, z) {
    const W = this.W;
    const gh = W.groundHeight(x, z, (this.c?.ped?.y || 0) + 0.5);
    if (gh > 0.5 || gh < 0) return gh;
    // sidewalks/lots are raised
    const blk = W.blockOf(x, z);
    if (blk && !blk.water && x > blk.X0 + 6 && x < blk.X1 - 6 && z > blk.Z0 + 6 && z < blk.Z1 - 6) return 0.16;
    return 0;
  }

  nearVehicles(x, z, r) {
    const out = [];
    for (const v of this.W.traffic.vehicles) {
      if (v.state === 'garage' || v.state === 'abstract' || v.state === 'repair' || v.state === 'gone' || v.hidden) continue;
      if (Math.abs(v.x - x) < r + v.len && Math.abs(v.z - z) < r + v.len) out.push(v);
    }
    return out;
  }

  nearestPed(r, filter) {
    const p = this.c.ped;
    let best = null, bd = r;
    for (const o of this.W.peds.list) {
      if (o === p) continue;
      const d = dist(o.x, o.z, p.x, p.z);
      if (d < bd && (!filter || filter(o))) { bd = d; best = o; }
    }
    return best;
  }

  footInteractions(dt) {
    const g = this.game, W = this.W, I = g.input, c = this.c, p = c.ped;
    const role = c.job && (c.duty != null || c.working) ? c.job.role : null;
    // vehicles
    let nearV = null, nd = 4.2;
    for (const v of this.nearVehicles(p.x, p.z, 5)) {
      if (v.state === 'towed') continue;
      const d = dist(v.x, v.z, p.x, p.z) - v.len * 0.3;
      if (d < nd) { nd = d; nearV = v; }
    }
    if (nearV) {
      const mine = nearV.owner === c.id || (c.duty != null && typeof c.duty === 'number' && W.services.unit(c.duty)?.v === nearV.id) || (c.dutyBus && c.dutyBus.v === nearV.id);
      const occupied = nearV.driver != null && nearV.driver !== c.id;
      const label = mine ? `Get in your ${nearV.T.label}` : occupied ? `Carjack the ${nearV.T.label}` : nearV.wreck ? null : `Steal the ${nearV.T.label}`;
      if (label) {
        this.prompts.push({ key: 'F', text: label, danger: !mine });
        if (I.hit('KeyF')) { this.getInto(nearV, mine, occupied); return; }
      }
    }
    // doors
    const b = this.nearDoor(p.x, p.z);
    if (b) {
      const name = W.citizenAI.buildingName(b.id);
      const open = b.bizId == null || W.economy.isOpen(W.economy.biz[b.bizId], W.minuteOfDay) || b.residents.includes(c.id) || (c.job && W.economy.biz[c.job.biz]?.b === b.id);
      const home = b.residents.includes(c.id);
      if (home && b.bizId != null && b.state === 'ok') {
        this.prompts.push({ key: 'H', text: 'Go up to your apartment' });
        if (I.hit('KeyH')) { this.enterBuilding(b, { home: true }); return; }
      }
      if (b.state === 'ok' && (open || b.civic)) {
        this.prompts.push({ key: 'E', text: home && b.bizId == null ? 'Go home' : `Enter ${name}` });
        if (I.hit('KeyE')) { this.enterBuilding(b, { home: home && b.bizId == null, fromStreet: true }); return; }
      } else if (b.state === 'ok') this.prompts.push({ key: '', text: `${name} is closed` });
      const biz = b.bizId != null ? W.economy.biz[b.bizId] : null;
      if (biz && BTYPES[biz.type].robbable && W.economy.isOpen(biz, W.minuteOfDay) && !c.duty) {
        this.prompts.push({ key: 'G', text: `Hold up ${biz.name}`, danger: true });
        if (I.hit('KeyG')) { this.robStore(biz); return; }
      }
    }
    // people
    const other = this.nearestPed(2.6);
    if (other) {
      const o = W.citizens[other.cid];
      const inc = o.flags.suspectOf ? W.incidents.get(o.flags.suspectOf) : null;
      if (role === 'officer' && (inc && !inc.closed || o.record.wanted > 0) && !o.flags.cuffed) {
        this.prompts.push({ key: 'E', text: `Arrest ${o.name}` });
        if (I.hit('KeyE')) { this.arrest(o, inc); return; }
      } else if (role === 'paramedic' && o.injured > 0 && o.status === 'ok') {
        this.prompts.push({ key: 'E', text: `Treat ${o.name} (${Math.round(o.injured * 100)}% injured)` });
        if (I.down('KeyE')) { this.treat(o, dt); return; }
      } else {
        this.prompts.push({ key: 'E', text: `Talk to ${o.first}` });
        if (I.hit('KeyE')) { this.talk(o); return; }
      }
    }
    const ch = this.carHint();
    if (ch && ch.d > 6 && !this.prompts.length) this.prompts.push({ key: '', text: ch.label });
    // firefighter hose
    if (role === 'firefighter') {
      const fireB = this.fireAhead(p, 34);
      if (fireB || I.mouse.down[0]) this.prompts.push({ key: 'LMB', text: fireB ? `Spray water on ${W.citizenAI.buildingName(fireB.id)}` : 'Spray water' });
      if (I.mouse.down[0]) {
        p.action = 'hose';
        const T = g.rig.third;
        const aim = fireB ? { x: fireB.x, z: fireB.z, y: Math.min(fireB.h * 0.5, 9) } : { x: p.x + Math.sin(T.yaw) * 14, z: p.z + Math.cos(T.yaw) * 14, y: 3 };
        p.hoseTarget = aim;
        p.h = p.h + wrapAngle(Math.atan2(aim.x - p.x, aim.z - p.z) - p.h) * Math.min(1, dt * 8);
        if (fireB) { fireB.suppress = (fireB.suppress || 0) + 0.06; this.hoseScore = (this.hoseScore || 0) + dt; }
      } else if (p.action === 'hose') p.action = '';
    }
    // utility repair
    if (role === 'lineworker') {
      const inc = W.incidents.active().find((i) => (i.type === 'power' || i.type === 'signal') && dist(i.x, i.z, p.x, p.z) < 14);
      if (inc) {
        this.prompts.push({ key: 'E', text: inc.type === 'power' ? 'Hold E to repair the substation' : 'Hold E to fix the traffic light' });
        if (I.down('KeyE')) {
          p.action = 'repair';
          if (inc.type === 'power') W.power.work(inc.zone, dt * 20 / 60 * 6);
          else { inc.data.fix = (inc.data.fix || 0) + dt; if (inc.data.fix > 6) { W.city.net.nodes[inc.node].failed = false; W.incidents.close(inc, 'repaired'); this.game.toast('Signal fixed. Traffic flows again.'); } }
        } else if (p.action === 'repair') p.action = '';
      }
    }
  }

  fireAhead(p, r) {
    const W = this.W;
    let best = null, bd = r;
    for (const b of W.city.buildings) {
      if (b.fire <= 0) continue;
      const cx = clamp(p.x, b.x0, b.x1), cz = clamp(p.z, b.z0, b.z1);
      const d = dist(cx, cz, p.x, p.z);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  nearDoor(x, z) {
    const W = this.W;
    const blk = W.blockOf(x, z);
    let best = null, bd = 2.6;
    const scan = (bl) => { if (!bl) return; for (const bid of bl.buildings) { const b = W.city.buildings[bid]; if (b.kind === 'substation') continue; const d = dist(b.door[0], b.door[1], x, z); if (d < bd) { bd = d; best = b; } } };
    scan(blk);
    if (!best) { for (const [ox, oz] of [[6, 0], [-6, 0], [0, 6], [0, -6]]) scan(W.blockOf(x + ox, z + oz)); }
    return best;
  }

  getInto(v, mine, occupied) {
    const W = this.W, c = this.c;
    if (occupied) {
      const d = W.citizens[v.driver];
      // the driver is pulled out and calls the police
      W.traffic.toFree(v);
      v.driver = null; d.veh = null;
      const dp = W.peds.spawn(d, v.x - Math.cos(v.h) * 1.8, v.z + Math.sin(v.h) * 1.8, v.h);
      d.state = 'walking'; d.trip = null;
      W.history.citizenLog(d, `Was carjacked by ${c.name}`, true);
      W.history.citizenLog(c, `Carjacked ${d.name}`, true);
      dp.action = 'phone';
      const inc = W.incidents.create('theft', { x: v.x, z: v.z, suspects: [c.id], victims: [d.id], priority: 1, needs: { police: 2 }, title: 'Carjacking', reported: false, reportAt: W.time + 0.5, data: { v: v.id } });
      c.flags.suspectOf = inc.id;
      c.record.crimes++;
      v.stolen = { by: c.id, t: W.time };
      setTimeout(() => { if (d.ped) { d.ped.action = ''; W.citizenAI.resume(d); } }, 6000);
    } else if (!mine) {
      v.stolen = { by: c.id, t: W.time };
      c.record.crimes++;
      const witnesses = W.peds.near(v.x, v.z, 30).length;
      if (witnesses > 1 || v.unit != null) {
        const inc = W.incidents.create('theft', { x: v.x, z: v.z, suspects: [c.id], priority: v.unit != null ? 1 : 0, needs: { police: 1 }, reported: false, reportAt: W.time + 2, data: { v: v.id }, title: v.unit != null ? 'Stolen emergency vehicle' : 'Stolen vehicle' });
        c.flags.suspectOf = inc.id;
      }
      W.history.citizenLog(c, `Stole a ${v.T.label}`, true);
    }
    if (c.ped) W.peds.despawn(c.ped);
    c.veh = v.id;
    v.driver = c.id;
    c.state = 'driving';
    if (v.unit != null && !mine) v.siren = false;
    if (c.dutyBus && c.dutyBus.v === v.id) c.dutyBus.state = 'player';
    this.enterDrive(v);
    this.game.audio && this.game.audio.door();
  }

  enterBuilding(b, opt = {}) {
    const W = this.W, c = this.c;
    if (this.game.interiors && this.game.interiors.canEnter(b)) {
      W.peds.despawn(c.ped);
      W.citizenAI.placeInside(c, b.id);
      this.game.interiors.enter(b, c, true, opt);
      this.mode = 'inside';
      this.game.audio && this.game.audio.door();
      return;
    }
    this.game.toast(`${W.citizenAI.buildingName(b.id)} has no interior yet.`);
  }

  robStore(biz) {
    const W = this.W, c = this.c;
    const b = W.city.buildings[biz.b];
    c.flags.crime = { type: 'robbery', biz: biz.id };
    // brief hold-up at the door
    W.peds.despawn(c.ped);
    W.citizenAI.placeInside(c, b.id);
    W.incidents.executeCrime(c);
    // executeCrime makes the suspect flee via AI; keep the player in control instead
    c.trip = null;
    if (!c.ped) { const [x, z] = W.citizenAI.doorOut(b); W.peds.spawn(c, x, z); c.state = 'walking'; }
    if (c.ped) { c.ped.path = null; c.ped.onArrive = null; }
    this.enterFoot();
    this.game.toast(`You robbed ${biz.name}. Police are on the way — get out of here.`);
    this.game.audio && this.game.audio.alarm();
  }

  arrest(o, inc) {
    const W = this.W, c = this.c;
    const u = W.services.unit(c.duty);
    if (!u) return;
    if (!inc) inc = W.incidents.create('fight', { x: o.ped.x, z: o.ped.z, suspects: [o.id], priority: 0, needs: { police: 0 }, title: 'Arrest' });
    if (!inc.units.includes(u.id)) inc.units.push(u.id);
    u.incident = inc.id;
    u.state = 'pursuit';
    W.incidents.beginArrest(u, inc, o);
    this.game.toast(`${o.name} is under arrest. They'll be taken to the station.`);
    W.history.citizenLog(c, `Personally arrested ${o.name}`, true);
  }

  treat(o, dt) {
    const W = this.W, c = this.c;
    this.actionT += dt;
    c.ped.action = 'kneel';
    this.prompts[this.prompts.length - 1].progress = this.actionT / 3;
    if (this.actionT < 3) return;
    this.actionT = 0;
    c.ped.action = '';
    o.injured = Math.max(0, o.injured - 0.5);
    const u = W.services.unit(c.duty);
    const inc = W.incidents.list.find((i) => !i.closed && i.injured.includes(o.id));
    if (u && inc) {
      if (!inc.units.includes(u.id)) inc.units.push(u.id);
      u.incident = inc.id;
      W.services.loadCargo(u, o.id);
      inc.injured = inc.injured.filter((id) => id !== o.id);
      inc.needs.ems = inc.injured.length;
      this.game.toast(`${o.first} is stabilized and loaded into the ambulance. Drive to the hospital.`);
      W.history.citizenLog(c, `Saved ${o.name} at the scene`, true);
      W.history.citizenLog(o, `Treated on scene by ${c.name}`, true);
    }
  }

  talk(o) {
    const W = this.W, c = this.c;
    const r = W.citizenAI.addAff(c, o, 0.06 + c.traits.social * 0.05);
    const lines = this.lineFor(o, r);
    this.game.toast(`${o.first}: “${lines}”`, 5);
    if (o.ped && !o.possessed) { const op = o.ped; op.h = Math.atan2(c.ped.x - op.x, c.ped.z - op.z); }
  }

  lineFor(o, r) {
    const W = this.W;
    if (o.flags.aware && W.anomalies) return W.anomalies.awareLine(o);
    if (o.rel[this.c.id] && o.rel[this.c.id].t === 'partner') return rand.pick(['Hey you. Dinner later?', 'There you are.', 'Missed you today.']);
    if (o.rel[this.c.id] && o.rel[this.c.id].t === 'enemy') return rand.pick(['Keep walking.', 'Not you again.', 'We have nothing to talk about.']);
    if (o.injured > 0.3) return 'Please… call someone…';
    if (o.duty != null) return rand.pick(['Can\'t talk, I\'m on duty.', 'Stay back from the scene, please.', 'Move along.']);
    const mood = o.happiness;
    if (o.lastThought && rand.chance(0.5)) return o.lastThought + '.';
    if (W.power.anyBlackout && !W.power.isPoweredAt(o.ped?.x || 0, o.ped?.z || 0)) return rand.pick(['Power\'s been out for ages.', 'Nothing works without the lights.', 'My fridge is going to be a crime scene.']);
    if (W.weather.precip > 0.5) return rand.pick(['Some weather, huh?', 'Forgot my umbrella again.', 'This rain won\'t quit.']);
    if (!o.job && o.age < 66) return rand.pick(['Know anyone hiring?', 'Still looking for work.', 'Money\'s tight lately.']);
    if (mood > 0.65) return rand.pick(['Beautiful day.', `Heading to ${o.goal ? o.goal.label.toLowerCase() : 'nowhere special'}.`, 'Hey there!']);
    return rand.pick(['Hm?', 'Do I know you?', 'Long day.', `Can't stop, I'm ${o.goal ? o.goal.label.toLowerCase() : 'busy'}.`]);
  }

  // ------------------------------------------------------------------ helicopter
  updateFly(dt) {
    const g = this.game, I = g.input, h = this.heli;
    h.input = { f: I.axis('KeyS', 'KeyW'), turn: I.axis('KeyA', 'KeyD'), up: (I.down('Space') ? 1 : 0) - (I.down('KeyC') || I.down('ControlLeft') ? 1 : 0), boost: I.down('ShiftLeft') };
    if (I.hit('KeyL') && h.kind === 'police') { h.spot = !h.spot; }
    if (h.spot) {
      // searchlight follows the camera's aim point on the ground
      const T = g.rig.third;
      h.look = { x: h.x + Math.sin(T.yaw) * 40, z: h.z + Math.cos(T.yaw) * 40 };
    }
    const pad = h.pad;
    if (dist(h.x, h.z, pad.x, pad.z) < 8 && h.y - pad.y < 3) this.prompts.push({ key: '', text: `Over the ${h.kind === 'news' ? 'Channel 6' : 'police'} helipad — descend with C to land` });
    if (h.kind === 'police') this.prompts.push({ key: 'L', text: 'Searchlight' });
    g.rig.updateThird(dt, h, { autoYaw: Math.hypot(h.vx, h.vz) > 3 ? h.h : null, autoK: 1.6, minDist: 8, maxDist: 60, fov: 62 });
    if (g.audio && g.audio.ctx && Math.random() < dt * 14) g.audio.burst(g.audio.brown, 'lowpass', 160, 1, 0.12, 0.005, 0.07);
  }

  // ------------------------------------------------------------------ driving
  updateDrive(dt) {
    const g = this.game, W = this.W, I = g.input, c = this.c;
    const v = this.veh;
    if (!v || v.state === 'gone' || c.veh !== v.id) { if (c.ped) this.enterFoot(); return; }
    if (v.state !== 'free') W.traffic.toFree(v);
    const fwd = v.vx * Math.sin(v.h) + v.vz * Math.cos(v.h);
    const up = I.down('KeyW') || I.down('ArrowUp'), dn = I.down('KeyS') || I.down('ArrowDown');
    const steer = (I.down('KeyA') || I.down('ArrowLeft') ? 1 : 0) - (I.down('KeyD') || I.down('ArrowRight') ? 1 : 0);
    v.input.throttle = up ? 1 : 0;
    v.input.brake = dn && fwd > 0.6 ? 1 : 0;
    v.input.reverse = dn && fwd <= 0.6 ? 1 : 0;
    v.input.steer = steer;
    v.input.handbrake = I.down('Space') ? 1 : 0;
    if (I.hit('KeyH')) { v.horn = 0.5; g.audio && g.audio.horn(v); this.scareNearby(v); }
    if (I.hit('KeyL') && EMERGENCY.has(v.type)) { v.siren = !v.siren; g.toast(v.siren ? 'Lights & siren on — traffic will yield' : 'Siren off'); }
    if (I.hit('KeyN')) v.lightsOn = !v.lightsOn;
    v.lightsOn = v.lightsOn || W.env.night > 0.5;
    // pedestrians hit
    for (const p of W.peds.near(v.x, v.z, v.len)) {
      if (p.player) continue;
      const lx = (p.x - v.x) * Math.cos(v.h) - (p.z - v.z) * Math.sin(v.h);
      const lz = (p.x - v.x) * Math.sin(v.h) + (p.z - v.z) * Math.cos(v.h);
      if (Math.abs(lx) < v.wid / 2 + 0.3 && Math.abs(lz) < v.len / 2 + 0.3) {
        if (v.speed > 2.5) { W.incidents.pedHit(p, v, v.speed); g.rig.shake = 0.8; g.audio && g.audio.impact(v.speed * 0.6); }
        else { p.x += Math.sign(lx || 1) * 0.3 * Math.cos(v.h); p.z += -Math.sign(lx || 1) * 0.3 * Math.sin(v.h); }
      }
    }
    // exit
    if (v.speed < 3) {
      this.prompts.push({ key: 'F', text: `Get out` });
      if (I.hit('KeyF')) { this.exitVehicle(); return; }
    }
    this.vehicleRoleActions(dt, v);
    W.playerObstacles = [];
    const T = g.rig.third;
    const aheadYaw = v.h + (fwd < -1 ? Math.PI : 0);
    T.dist = damp(T.dist, v.len * 1.25 + 4.5 + v.speed * 0.08, 2, dt);
    if (this.camMode === 1) { T.dist = v.len * 0.5; }
    g.rig.updateThird(dt, v, { autoYaw: Math.abs(fwd) > 1.5 ? aheadYaw : null, autoK: 2.6, fov: 60 + clamp(v.speed - 12, 0, 30) * 0.45, minDist: 3, maxDist: 40 });
    g.audio && g.audio.engine(v, fwd, v.input.throttle);
  }

  scareNearby(v) {
    // honking hurries pedestrians along / annoys people
    for (const p of this.W.peds.near(v.x, v.z, 14)) { if (!p.player && p.state === 'walk') p.speed = Math.min(2.4, p.speed * 1.25); }
  }

  exitVehicle() {
    const W = this.W, c = this.c, v = this.veh;
    v.player = false;
    v.input = { throttle: 0, brake: 1, steer: 0, handbrake: 1, reverse: 0 };
    v.driver = null;
    c.veh = null;
    if (v.owner !== c.id && v.unit == null) v.abandoned = W.time;
    // a unit vehicle left by its crew is parked on scene
    if (v.unit != null) v.isStaticObstacle = true;
    const x = v.x - Math.cos(v.h) * (v.wid / 2 + 0.7), z = v.z + Math.sin(v.h) * (v.wid / 2 + 0.7);
    const p = W.peds.spawn(c, x, z, v.h);
    p.y = v.y;
    c.state = 'walking';
    this.veh = null;
    this.enterFoot();
    this.game.audio && (this.game.audio.engineStop(), this.game.audio.door());
  }

  vehicleRoleActions(dt, v) {
    const W = this.W, c = this.c, I = this.game.input;
    // bus: service stops
    if (c.dutyBus && c.dutyBus.v === v.id) {
      const bus = c.dutyBus;
      const line = W.transit.lines[bus.line];
      const stop = W.transit.stops[line.stops[bus.next % line.stops.length]];
      if (dist(stop.x, stop.z, v.x, v.z) < 10 && v.speed < 1.2) {
        this.prompts.push({ key: 'E', text: `Open doors at ${stop.name} (${stop.waiting.length} waiting)` });
        if (I.hit('KeyE')) { W.transit.atStop(bus, stop, true); this.game.toast(`Stop served. Next: ${W.transit.stops[line.stops[(bus.next) % line.stops.length]].name}`); }
      }
    }
    // taxi: pick up hailing citizens and drop them off
    if (v.type === 'taxi') {
      if (!this.taxiFare) {
        let best = null, bd = 12;
        for (const id of W.transit.taxiQueue) { const o = W.citizens[id]; if (o.ped && o.taxiReq) { const d = dist(o.ped.x, o.ped.z, v.x, v.z); if (d < bd) { bd = d; best = o; } } }
        if (best && v.speed < 1.5) {
          this.prompts.push({ key: 'E', text: `Pick up ${best.first}` });
          if (I.hit('KeyE')) {
            W.transit.taxiQueue.splice(W.transit.taxiQueue.indexOf(best.id), 1);
            W.peds.despawn(best.ped);
            best.state = 'passenger'; best.veh = v.id; v.passengers.push(best.id);
            this.taxiFare = { cid: best.id, sx: v.x, sz: v.z, done: best.taxiReq.done };
            best.taxiReq = null;
            const dest = best.trip ? best.trip.point : [v.x, v.z];
            this.taxiFare.dest = dest;
            this.game.toast(`${best.first}: “${best.trip && best.trip.dest != null ? W.citizenAI.buildingName(best.trip.dest) : 'Just drive'}, please.”`);
          }
        }
      } else {
        const f = this.taxiFare;
        const o = W.citizens[f.cid];
        if (dist(f.dest[0], f.dest[1], v.x, v.z) < 22 && v.speed < 1.5) {
          this.prompts.push({ key: 'E', text: `Drop off ${o.first}` });
          if (I.hit('KeyE')) {
            const fare = Math.round(6 + dist(f.sx, f.sz, v.x, v.z) * 0.025 + (rand.chance(0.5) ? 4 : 0));
            o.money -= fare; c.money += fare;
            v.passengers = v.passengers.filter((x) => x !== o.id);
            o.veh = null;
            W.peds.spawn(o, v.x - Math.cos(v.h) * 1.7, v.z + Math.sin(v.h) * 1.7, v.h);
            o.state = 'walking';
            this.taxiFare = null;
            this.game.toast(`Fare complete: +$${fare}`);
            W.history.citizenLog(c, `Drove ${o.name} across town`, false);
            f.done && f.done();
          }
        }
      }
    }
    // ambulance with a patient: deliver at the hospital
    if (v.cargo != null && v.unit != null) {
      const u = W.services.unit(v.unit);
      const base = W.city.buildings[u.base];
      if (dist(base.door[0], base.door[1], v.x, v.z) < 26 && v.speed < 2) {
        this.prompts.push({ key: 'E', text: u.kind === 'ems' ? 'Hand the patient over to the hospital' : 'Book the suspect' });
        if (I.hit('KeyE')) { W.services.unloadCargo(u); this.game.toast(u.kind === 'ems' ? 'Patient admitted. Good work.' : 'Suspect booked into a cell.'); }
      }
    }
    // tow truck: hook nearby wrecks / drop at the yard
    if (v.type === 'tow') {
      const towed = W.traffic.vehicles.find((o) => o.towedBy === v.id && o.state === 'towed');
      if (!towed) {
        const wreck = W.traffic.vehicles.find((o) => (o.wreck || o.abandoned) && o.state !== 'towed' && o.state !== 'repair' && dist(o.x, o.z, v.x, v.z) < 10 && o !== v);
        if (wreck && v.speed < 1.5) { this.prompts.push({ key: 'E', text: `Hook up the ${wreck.T.label}` }); if (I.hit('KeyE')) { W.traffic.detach(wreck); wreck.state = 'towed'; wreck.towedBy = v.id; wreck.isStaticObstacle = false; this.game.toast('Hooked. Take it to Ironside Towing.'); } }
      } else {
        const yard = W.city.buildings[(W.city.special.towyard || [])[0]];
        if (yard && dist(yard.door[0], yard.door[1], v.x, v.z) < 26 && v.speed < 2) {
          this.prompts.push({ key: 'E', text: 'Drop the vehicle at the yard' });
          if (I.hit('KeyE')) {
            W.traffic.parkInGarage(towed, yard.id); towed.towedBy = null; towed.state = 'repair'; towed.repairUntil = W.time + (1 + towed.damage * 2) * 1440;
            for (const inc of W.incidents.active()) { const i = inc.vehicles.indexOf(towed.id); if (i >= 0) { inc.vehicles.splice(i, 1); inc.needs.tow = Math.max(0, inc.needs.tow - 1); } }
            c.money += 120; this.game.toast('Delivered. +$120');
          }
        }
      }
    }
  }

  updateRide(dt) {
    // passenger: just enjoy the ride (bus, taxi, ambulance, police car)
    const v = this.rideVeh;
    const c = this.c;
    if (!v || c.veh !== v.id) { if (c.ped) this.enterFoot(); else if (c.state === 'inside') this.release(); return; }
    this.prompts.push({ key: '', text: `Riding in the ${v.T.label}` });
    if (v.speed < 1) { this.prompts.push({ key: 'F', text: 'Get out' }); if (this.game.input.hit('KeyF')) {
      const W = this.W;
      v.passengers = v.passengers.filter((x) => x !== c.id);
      if (v.bus) v.bus.riders = v.bus.riders.filter((x) => x !== c.id);
      c.veh = null; c.busLeg = null;
      W.peds.spawn(c, v.x - Math.cos(v.h) * 1.8, v.z + Math.sin(v.h) * 1.8, v.h);
      c.state = 'walking';
      this.rideVeh = null;
      this.enterFoot();
      return;
    } }
    this.game.rig.updateThird(dt, v, { autoYaw: v.h, autoK: 2 });
  }

  // where is this person's own car?
  carHint() {
    const W = this.W, c = this.c;
    if (!c || this.mode !== 'foot' || c.vehicle == null) return null;
    const v = W.traffic.byId.get(c.vehicle);
    if (!v || v.state === 'garage' || v.state === 'repair' || v.state === 'abstract' || v.stolen) return null;
    const p = c.ped;
    const d = dist(v.x, v.z, p.x, p.z);
    if (d > 500) return null;
    return { x: v.x, z: v.z, d, label: `Your ${v.T.label} is ${d < 15 ? 'right here' : Math.round(d) + ' m away'}` };
  }

  // ------------------------------------------------------------------ objective for HUD + beacon
  objective() {
    const W = this.W, c = this.c;
    if (!c || this.autopilot && !c) return null;
    if (!c) return null;
    const pos = W.citizenPos(c);
    // responders: their incident
    if (c.duty != null && typeof c.duty === 'number') {
      const u = W.services.unit(c.duty);
      if (u) {
        const v = W.services.veh(u);
        if (v && v.cargo != null) { const b = W.city.buildings[u.base]; return { x: b.door[0], z: b.door[1], label: u.kind === 'ems' ? `Drive the patient to ${W.citizenAI.buildingName(u.base)}` : `Take ${W.citizens[v.cargo].first} to ${W.citizenAI.buildingName(u.base)}`, color: [0.4, 1.6, 2.4] }; }
        if (u.pursuit) {
          const s = W.citizens[u.pursuit.cid];
          const sp = W.citizenPos(s);
          if (sp && !sp.inside) return { x: sp.x, z: sp.z, label: `Stop ${s.name}${s.veh != null ? ' (in a ' + W.traffic.byId.get(s.veh).T.label + ')' : ' (on foot)'}`, color: [2.4, 0.3, 0.3] };
        }
        const inc = u.incident != null ? W.incidents.get(u.incident) : null;
        if (inc && !inc.closed) return { x: inc.x, z: inc.z, label: `${inc.title}${inc.b != null ? ' — ' + W.citizenAI.buildingName(inc.b) : ''}`, color: [2.4, 0.5, 0.3] };
        // nearest open incident of their kind as a suggestion
        const kindFor = { police: ['robbery', 'theft', 'fight', 'accident', 'riot', 'animal'], fire: ['fire'], ems: ['medical', 'accident', 'fire'], utility: ['power', 'signal'], tow: ['accident'] }[u.kind] || [];
        let best = null, bd = Infinity;
        for (const i of W.incidents.active()) if (kindFor.includes(i.type) && i.reported && pos) { const d = dist(i.x, i.z, pos.x, pos.z); if (d < bd) { bd = d; best = i; } }
        if (best) return { x: best.x, z: best.z, label: `Nearest call: ${best.title}`, color: [2.4, 1.2, 0.3] };
        return { label: u.kind === 'police' ? 'Patrol the streets. Wanted suspects show up in red.' : u.kind === 'taxi' ? 'Cruise for fares — people waving at the curb want a ride' : 'Standing by for calls' };
      }
    }
    if (c.dutyBus) {
      const bus = c.dutyBus;
      const line = W.transit.lines[bus.line];
      const stop = W.transit.stops[line.stops[bus.next % line.stops.length]];
      return { x: stop.x, z: stop.z, label: `Line ${line.name}: next stop ${stop.name} (${stop.waiting.length} waiting)`, color: [0.4, 1.2, 2.6] };
    }
    if (this.taxiFare) { const f = this.taxiFare; return { x: f.dest[0], z: f.dest[1], label: `Drop off ${W.citizens[f.cid].first}`, color: [2.4, 2.0, 0.3] }; }
    if (c.flags.suspectOf) {
      const inc = W.incidents.get(c.flags.suspectOf);
      if (inc && !inc.closed && inc.data.pursuitBy != null) return { label: 'Lose the police!', color: [2.4, 0.3, 0.3], heat: true };
      if (inc && !inc.closed) return { label: 'Lay low — police are looking for you', heat: true };
    }
    const goal = c.goal || this.goalAtStart;
    if (goal && goal.b != null) {
      const b = W.city.buildings[goal.b];
      return { x: b.door[0], z: b.door[1], label: goal.label, color: [2.2, 1.6, 0.4] };
    }
    if (goal && goal.point) return { x: goal.point[0], z: goal.point[1], label: goal.label, color: [2.2, 1.6, 0.4] };
    return { label: 'Free roam. Live their life — or don\'t.' };
  }
}
