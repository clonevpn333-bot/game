'use strict';
// The hunter: patrol / investigate / chase / search, with sight, hearing and a flashlight.

const Stalker = {
  active: false,
  npc: null,
  state: 'idle',
  nodes: [],
  adj: [],
  path: [],
  speed: 1.3,
  alert: 0,
  lastSeen: new THREE.Vector3(),
  lostT: 0,
  searchT: 0,
  patrol: [],
  patrolIdx: 0,
  waitT: 0,
  lineT: 8,
  lines: [],
  catchDist: 0.95,
  onCatch: null,
  heart: null,
  drone: null,
  seen: false,
  scripted: null,
  noiseOff: null,
  sightMul: 1,
  stuckT: 0,
  lastPos: new THREE.Vector3(),

  reset() {
    this.active = false; this.state = 'idle'; this.path = []; this.alert = 0; this.scripted = null;
    if (this.heart) { this.heart.stop(0.5); this.heart = null; }
    if (this.drone) { this.drone.stop(1); this.drone = null; }
    if (this.noiseOff) { this.noiseOff(); this.noiseOff = null; }
    this.npc = null; this.light = null; this.beam = null;
    if (Player.hidden !== undefined) SND.muffle(20000, 1, 0.3);
  },

  // o: { x, z, ry, nodes:[[x,z]...], patrol:[[x,z]...], lines:[], onCatch, flashlight:true }
  spawn(o) {
    this.reset();
    const npc = this.npc = NPCs.spawn('dale', { x: o.x, z: o.z, ry: o.ry || 0, pose: 'stand' });
    npc.managed = true; this.caught = false;
    npc.onStep = () => { const p = npc.pos; SND.sfx('step', { surface: G.level.surfaceAt(p.x, p.z), v: npc.pose === 'run' ? 1.3 : 0.9, pos: new THREE.Vector3(p.x, 0.1, p.z), ref: 2.5, rolloff: 1.0 }); };
    // flashlight
    if (o.flashlight !== false) {
      const l = this.light = new THREE.SpotLight(0xfff0d0, 45, 26, 0.38, 0.5, 1.2);
      l.position.set(0.25, 1.45 * npc.s, 0.35); npc.root.add(l);
      l.target.position.set(0.2, 0.6, 6); npc.root.add(l.target);
      const beamGeo = new THREE.ConeGeometry(1.6, 9, 20, 1, true); beamGeo.translate(0, -4.5, 0); beamGeo.rotateX(-Math.PI / 2);
      const beam = this.beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xfff2d8, transparent: true, opacity: 0.035, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.copy(l.position); npc.root.add(beam);
      npc.pose = 'flashlight';
      this.flashOn = true;
    }
    this.setNodes(o.nodes || []);
    this.patrol = (o.patrol || []).map(p => new THREE.Vector3(p[0], 0, p[1]));
    this.patrolIdx = 0;
    this.lines = o.lines || [];
    this.onCatch = o.onCatch || (() => Story.death());
    this.sightMul = o.sight || 1;
    this.active = true;
    this.state = o.state || (this.patrol.length ? 'patrol' : 'idle');
    this.lineT = 6 + Math.random() * 6;
    this.noiseOff = Bus.on('noise', (x, z, r, type) => this.hear(x, z, r, type));
    this.heart = SND.loop('heartbeat', { bus: 'ui', vol: 0, bpm: 70 });
    return npc;
  },
  setFlashlight(on) { this.flashOn = on; if (this.light) this.light.visible = on; if (this.beam) this.beam.visible = on; },

  setNodes(list) {
    this.nodes = list.map(p => new THREE.Vector3(p[0], 0, p[1]));
    const n = this.nodes.length; this.adj = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = this.nodes[i], b = this.nodes[j];
      if (a.distanceTo(b) < 16 && this.clear(a.x, a.z, b.x, b.z)) { this.adj[i].push(j); this.adj[j].push(i); }
    }
  },
  // walkable straight line (doors count as passable)
  clear(ax, az, bx, bz) {
    this._y = G.level ? (G.level.groundAt(ax, az) + G.level.groundAt(bx, bz)) / 2 : 0;
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz) || 1, nx = -dz / len * 0.25, nz = dx / len * 0.25;
    return this._seg(ax + nx, az + nz, bx + nx, bz + nz) && this._seg(ax - nx, az - nz, bx - nx, bz - nz);
  },
  _seg(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    for (const b of Phys.boxes) {
      if (!b.npc || b.tag === 'door' || b.maxY < this._y + 0.5 || b.minY > this._y + 1.5) continue;
      let t0 = 0, t1 = 1;
      if (Math.abs(dx) < 1e-9) { if (ax < b.minX || ax > b.maxX) continue; } else { let ta = (b.minX - ax) / dx, tb = (b.maxX - ax) / dx; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) continue; }
      if (Math.abs(dz) < 1e-9) { if (az < b.minZ || az > b.maxZ) continue; } else { let ta = (b.minZ - az) / dz, tb = (b.maxZ - az) / dz; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) continue; }
      if (t1 > 0 && t0 < 1) return false;
    }
    return true;
  },
  nearestNode(x, z, needClear = true) {
    let best = -1, bd = 1e9;
    for (let i = 0; i < this.nodes.length; i++) { const d = U.dist2(x, z, this.nodes[i].x, this.nodes[i].z); if (d < bd && (!needClear || this.clear(x, z, this.nodes[i].x, this.nodes[i].z))) { bd = d; best = i; } }
    if (best < 0 && needClear) return this.nearestNode(x, z, false);
    return best;
  },
  // A* over nodes; returns list of Vector3 ending at target
  route(tx, tz) {
    const p = this.npc.pos;
    if (this.clear(p.x, p.z, tx, tz)) return [new THREE.Vector3(tx, 0, tz)];
    const s = this.nearestNode(p.x, p.z), e = this.nearestNode(tx, tz);
    if (s < 0 || e < 0) return [new THREE.Vector3(tx, 0, tz)];
    const n = this.nodes.length, g = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), open = new Set([s]);
    g[s] = 0;
    const h = i => this.nodes[i].distanceTo(this.nodes[e]);
    while (open.size) {
      let cur = -1, bf = Infinity; for (const i of open) { const f = g[i] + h(i); if (f < bf) { bf = f; cur = i; } }
      if (cur === e) break;
      open.delete(cur);
      for (const nb of this.adj[cur]) { const ng = g[cur] + this.nodes[cur].distanceTo(this.nodes[nb]); if (ng < g[nb]) { g[nb] = ng; prev[nb] = cur; open.add(nb); } }
    }
    const out = [new THREE.Vector3(tx, 0, tz)];
    let c = e; while (c >= 0) { out.unshift(this.nodes[c].clone()); c = prev[c]; }
    // skip first node if we can go straight to the second
    while (out.length > 1 && this.clear(p.x, p.z, out[1].x, out[1].z)) out.shift();
    return out;
  },
  goTo(x, z, speed) { this.path = this.route(x, z); if (speed) this.speed = speed; },
  // scripted walk; resolves on arrival
  walk(points, speed = 1.3) {
    this.state = 'script'; this.speed = speed; this.path = points.map(p => new THREE.Vector3(p[0], 0, p[1]));
    return new Promise(res => { this._arrive = res; });
  },
  hunt(state = 'patrol') { this.state = state; this.path = []; this._arrive = null; },

  hear(x, z, r, type) {
    if (!this.active || this.state === 'script' || this.state === 'chase' || this.state === 'idle') return;
    const p = this.npc.pos; const d = U.dist2(p.x, p.z, x, z);
    const eff = this.clear(p.x, p.z, x, z) ? r : r * 0.6;
    if (d < eff) {
      this.state = 'investigate'; this.goTo(x + (Math.random() - 0.5), z + (Math.random() - 0.5), 1.9); this.waitT = 0;
      this.lastSeen.set(x, 0, z);
    }
  },
  canSee() {
    if (!this.flashOn && this.state !== 'chase') { /* still sees up close */ }
    const P = Player.pos, S = this.npc.pos;
    if (Player.hidden || G.mode === 'car') return false;
    const dx = P.x - S.x, dz = P.z - S.z, d = Math.hypot(dx, dz);
    const fx = Math.sin(this.npc.root.rotation.y), fz = Math.cos(this.npc.root.rotation.y);
    const cos = (dx * fx + dz * fz) / (d || 1);
    let range = (Player.crouching ? 7 : 12) * this.sightMul;
    if (Player.flashOn) range = 26;
    if (this.state === 'chase') range = 30;
    const inFov = cos > 0.42 || d < 2.0 || (Player.flashOn && d < 16);
    if (!inFov || d > range) return false;
    const base = (S.y + P.y) / 2;
    const eyeY = base + (Player.crouching ? 0.9 : 1.5);
    return Phys.lineOfSight(S.x, S.z, P.x, P.z, eyeY) && Phys.lineOfSight(S.x, S.z, P.x, P.z, base + 1.6);
  },

  update(dt) {
    if (!this.active || !this.npc) return;
    const npc = this.npc, p = npc.pos, P = Player.pos;
    const dist = U.dist2(p.x, p.z, P.x, P.z);
    const sees = this.state !== 'script' && this.state !== 'idle' && this.canSee();
    this.seen = sees;
    // suspicion
    if (sees) {
      const rate = dist < 4 ? 4 : dist < 8 ? 1.8 : 0.9;
      this.alert = Math.min(1, this.alert + dt * rate);
      this.lastSeen.copy(P); this.lostT = 0;
      if (this.alert >= 1 && this.state !== 'chase') this.startChase();
      else if (this.state !== 'chase') { this.turnToward(P.x, P.z, dt * 2); if (this.alert > 0.35 && this.state !== 'investigate') { this.state = 'investigate'; this.goTo(P.x, P.z, 1.6); } }
    } else this.alert = Math.max(0, this.alert - dt * 0.25);

    switch (this.state) {
      case 'patrol':
        this.speed = 1.25;
        if (!this.path.length) {
          if (this.waitT > 0) { this.waitT -= dt; this.lookAround(dt); break; }
          if (this.patrol.length) { const t = this.patrol[this.patrolIdx % this.patrol.length]; this.patrolIdx++; this.goTo(t.x, t.z); this.waitT = 1.5 + Math.random() * 2.5; }
        }
        break;
      case 'investigate':
        if (!this.path.length) { this.state = 'search'; this.searchT = 10; this.waitT = 1.5; }
        break;
      case 'chase':
        this.speed = 3.9;
        if (sees) { if (!this._repath || this._repath <= 0 || !this.path.length) { this.path = this.clear(p.x, p.z, P.x, P.z) ? [P.clone()] : this.route(P.x, P.z); this._repath = 0.4; } else this._repath -= dt; if (this.path.length === 1 && this.clear(p.x, p.z, P.x, P.z)) this.path[0].copy(P); }
        else {
          this.lostT += dt;
          if (!this.path.length || this._lastLost !== true) { this.path = this.route(this.lastSeen.x, this.lastSeen.z); this._lastLost = true; }
          if (this.lostT > 6 || (!this.path.length && this.lostT > 1)) { this.state = 'search'; this.searchT = 14; this.waitT = 0; if (this.drone) { this.drone.stop(3); this.drone = null; } }
        }
        if (sees) this._lastLost = false;
        break;
      case 'search':
        this.speed = 1.6;
        this.searchT -= dt;
        if (!this.path.length) {
          if (this.waitT > 0) { this.waitT -= dt; this.lookAround(dt); }
          else { const i = this.nearestNode(this.lastSeen.x + (Math.random() - 0.5) * 10, this.lastSeen.z + (Math.random() - 0.5) * 10); if (i >= 0) this.goTo(this.nodes[i].x, this.nodes[i].z); this.waitT = 1 + Math.random() * 2; }
        }
        if (this.searchT <= 0) { this.state = this.patrol.length ? 'patrol' : 'idle'; this.alert = 0; }
        break;
    }
    // movement along path
    if (this.path.length) {
      const t = this.path[0];
      const dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz);
      if (d < 0.25) { this.path.shift(); if (!this.path.length && this.state === 'script' && this._arrive) { const f = this._arrive; this._arrive = null; f(); } }
      else {
        const sp = this.speed;
        p.x += dx / d * Math.min(d, sp * dt); p.z += dz / d * Math.min(d, sp * dt);
        this.turnToward(t.x, t.z, dt * (sp > 2 ? 10 : 5));
        npc.pose = sp > 2.5 ? 'run' : (this.flashOn ? 'flashlight' : 'walk');
        if (npc.pose === 'flashlight') npc.pose = 'walk';
        npc.speed = sp;
        // open doors in the way
        for (const door of G.level.doors) {
          if (door.isOpen || door.barricaded) continue;
          if (U.dist2(p.x, p.z, door.pos.x, door.pos.z) < 1.1) { door.locked = false; door.open(1, sp > 2 ? 6 : 2.2); if (sp > 2) SND.sfx('doorSlam', { pos: door.pos }); }
        }
      }
      // stuck detection
      if (p.distanceTo(this.lastPos) < 0.01 * dt * 60) { this.stuckT += dt; if (this.stuckT > 1.5) { this.path.shift(); this.stuckT = 0; } } else this.stuckT = 0;
      this.lastPos.copy(p);
    } else { npc.pose = this.flashOn ? 'flashlight' : 'stand'; }
    if (this.state !== 'script') Phys.resolve(p, 0.3, p.y, p.y + 1.7, 'npc');
    npc.update(dt);
    // flashlight aim
    if (this.light) {
      const aimAtPlayer = this.state === 'chase' && sees;
      const sway = Math.sin(G.time * 0.9) * 1.6 + Math.sin(G.time * 2.3) * 0.5;
      if (aimAtPlayer) { const local = npc.root.worldToLocal(new THREE.Vector3(P.x, P.y + 1.2, P.z)); this.light.target.position.lerp(local, 0.2); }
      else this.light.target.position.lerp(new THREE.Vector3(sway, 0.4 + Math.sin(G.time * 0.6) * 0.3, 6), 0.05);
      if (this.beam) this.beam.lookAt(npc.root.localToWorld(this.light.target.position.clone()));
    }
    // catch
    if (this.state !== 'script' && this.state !== 'idle' && dist < this.catchDist && !Player.hidden && G.mode !== 'car' && !this.caught) {
      this.caught = true; this.onCatch();
    }
    // found while hiding: if he watched you hide nearby
    if (Player.hidden && this.state === 'chase' && dist < 1.6 && this.lostT < 2.5 && !this.caught) { this.caught = true; this.onCatch(); }
    // taunts
    if (this.lines.length && this.state !== 'script' && this.state !== 'idle') {
      this.lineT -= dt;
      if (this.lineT <= 0 && dist < 24) { this.lineT = 10 + Math.random() * 10; const l = this.lines[Math.floor(Math.random() * this.lines.length)]; Story.say('DALE', l, Story.dur(l)); }
    }
    // dread audio
    if (this.heart) {
      const k = U.clamp(1 - dist / 14, 0, 1);
      this.heart.volume(k * 0.9 * (Player.hidden ? 1.3 : 1), 0.3);
      this.heart.set('bpm', 65 + k * 70 + (this.state === 'chase' ? 30 : 0));
    }
  },
  startChase() {
    if (this.state === 'chase') return;
    this.state = 'chase'; this._repath = 0;
    SND.sfx('sting', { v: 0.6, bus: 'ui' }); Engine.glitch(0.4, 0.6);
    if (!this.drone) this.drone = SND.loop('drone', { bus: 'ui', vol: 0.35, cut: 400, fadeIn: 1 });
    if (Math.random() < 0.6) Story.say('DALE', U.pick(['There you are.', 'Evan.', 'Don\'t run. Please.', 'I see you.', 'Ah — there.']), 1.8);
  },
  turnToward(x, z, k) { const r = this.npc.root; const want = Math.atan2(x - r.position.x, z - r.position.z); r.rotation.y += U.angDiff(r.rotation.y, want) * Math.min(1, k); },
  lookAround(dt) { this.npc.root.rotation.y += Math.sin(G.time * 0.7) * dt * 0.8; },
};
