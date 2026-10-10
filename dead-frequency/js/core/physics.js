'use strict';
// Rigid-body physics for loose props (cannon-es). Chairs, boxes, trash cans, mugs, plants... fall, tip,
// slide and bounce; Evan shoves them by walking into them, can pick light things up, carry, drop and throw
// them, and Dale knocks them over when he comes through. Impacts make noise the stalker can hear.
// Walls / furniture come from the existing 2.5D collision boxes near the props.

const Physics = {
  world: null, props: [], statics: [], held: null, acc: 0,

  // called by prop builders while a level is being built
  mark(group, o = {}) { const L = G.buildLevel; if (!L || !window.CANNON) return; (L._phys || (L._phys = [])).push({ g: group, o }); },

  setup(L) {
    this.clear();
    if (!window.CANNON || !L._phys || !L._phys.length) return;
    const C = CANNON;
    const w = this.world = new C.World({ gravity: new C.Vec3(0, -9.82, 0), allowSleep: true });
    w.broadphase = new C.SAPBroadphase(w); w.solver.iterations = 8;
    w.defaultContactMaterial.friction = 0.42; w.defaultContactMaterial.restitution = 0.12;
    // props the story needs in place (named), or that something else interacts with, stay static
    const named = new Set(); const scan = (v, d) => { if (!v || d > 2) return; if (v.isObject3D) { named.add(v); return; } if (typeof v === 'object') for (const k in v) scan(v[k], d + 1); };
    scan(L.named, 0);
    L.root.updateMatrixWorld(true);
    const v3 = new THREE.Vector3(), q3 = new THREE.Quaternion();
    for (const { g, o } of L._phys) {
      if (named.has(g)) continue;
      let interactive = false; g.traverse(c => { if (c.userData && c.userData.it) interactive = true; }); if (interactive) continue;
      // local bounding box (group rotation removed), then a box body with the group's world transform
      const rot = g.rotation.clone(); g.rotation.set(0, 0, 0); g.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(g); const gp = g.getWorldPosition(new THREE.Vector3());
      g.rotation.copy(rot); g.updateMatrixWorld(true);
      if (bb.isEmpty()) continue;
      const size = bb.getSize(new THREE.Vector3()), off = bb.getCenter(new THREE.Vector3()).sub(gp);
      L.root.attach(g);
      const body = new C.Body({ mass: o.mass || 2, shape: new C.Box(new C.Vec3(Math.max(0.02, size.x / 2), Math.max(0.02, size.y / 2), Math.max(0.02, size.z / 2))), linearDamping: 0.08, angularDamping: 0.18 });
      g.getWorldQuaternion(q3); body.quaternion.set(q3.x, q3.y, q3.z, q3.w);
      v3.copy(off).applyQuaternion(q3).add(g.getWorldPosition(new THREE.Vector3()));
      body.position.set(v3.x, v3.y + 0.002, v3.z);
      body.sleepSpeedLimit = 0.12; body.sleepTimeLimit = 0.6; body.allowSleep = true;
      w.addBody(body); body.sleep();
      const p = { g, body, off, mat: o.mat || 'wood', mass: o.mass || 2, carry: o.carry !== false && (o.mass || 2) <= 9, size, lastHit: 0 };
      body.addEventListener('collide', e => this.onHit(p, e));
      this.props.push(p);
      (L.dynamic || (L.dynamic = [])).push(g);
      // remove the static 2.5D box that stood in for this prop (it moves now)
      const fx = v3.x, fz = v3.z, hw = Math.max(size.x, size.z) / 2 + 0.2;
      Phys.boxes = Phys.boxes.filter(b => !(b.minX >= fx - hw && b.maxX <= fx + hw && b.minZ >= fz - hw && b.maxZ <= fz + hw && b.maxY < v3.y + size.y));
      if (p.carry) Interact.add(g, { prompt: () => this.held ? '' : (p.mass > 4 ? 'Pick up (heavy)' : 'Pick up'), enabled: () => !this.held && G.mode === 'walk', use: () => this.grab(p), range: 2.1 });
    }
    if (!this.props.length) return;
    // ground: flat floor, or a patch of terrain under each prop
    if (!L.groundFn) { const gb = new C.Body({ mass: 0, shape: new C.Plane() }); gb.quaternion.setFromEuler(-Math.PI / 2, 0, 0); w.addBody(gb); }
    for (const p of this.props) {
      const gy = L.groundFn ? L.groundAt(p.body.position.x, p.body.position.z) : null;
      if (gy != null) { const gb = new C.Body({ mass: 0, shape: new C.Box(new C.Vec3(2.5, 0.5, 2.5)) }); gb.position.set(p.body.position.x, gy - 0.5, p.body.position.z); w.addBody(gb); }
    }
    // walls, counters, furniture near the props
    for (const b of Phys.boxes) {
      const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
      if (!this.props.some(p => Math.abs(p.body.position.x - cx) < 9 + (b.maxX - b.minX) / 2 && Math.abs(p.body.position.z - cz) < 9 + (b.maxZ - b.minZ) / 2)) continue;
      const hy = Math.min(b.maxY, 4) - b.minY; if (hy <= 0.01) continue;
      const hx = Math.max(0.01, (b.maxX - b.minX) / 2), hz = Math.max(0.01, (b.maxZ - b.minZ) / 2);
      const sb = new C.Body({ mass: 0 });
      if (b.maxY - b.minY < 1.15 && hx > 0.25 && hz > 0.2) {
        // tables / desks / counters: a top slab, with the base set back so chairs can tuck under
        sb.addShape(new C.Box(new C.Vec3(hx, 0.03, hz)), new C.Vec3(0, hy / 2 - 0.03, 0));
        sb.addShape(new C.Box(new C.Vec3(Math.max(0.02, hx - 0.2), Math.max(0.02, hy / 2 - 0.06), Math.max(0.02, hz - 0.2))), new C.Vec3(0, -0.03, 0));
      } else sb.addShape(new C.Box(new C.Vec3(hx, hy / 2, hz)));
      sb.position.set(cx, b.minY + hy / 2, cz); w.addBody(sb); this.statics.push({ b, body: sb, on: true });
    }
    // kinematic movers: the player and the stalker push props around
    this.player = new C.Body({ mass: 0, type: C.Body.KINEMATIC, shape: new C.Cylinder(0.3, 0.3, 1.5, 10) }); this.player.allowSleep = false; w.addBody(this.player);
    this.npc = new C.Body({ mass: 0, type: C.Body.KINEMATIC, shape: new C.Cylinder(0.32, 0.32, 1.6, 10) }); this.npc.position.set(0, -50, 0); this.npc.allowSleep = false; w.addBody(this.npc);
    for (const b of w.bodies) { b.aabbNeedsUpdate = true; b.updateAABB(); }
    this._pp = null; this._np = null;
  },
  clear() { this.world = null; this.props = []; this.statics = []; this.held = null; },

  onHit(p, e) {
    const iv = Math.abs(e.contact.getImpactVelocityAlongNormal());
    if (iv < 0.9 || G.time - p.lastHit < 0.12) return;
    p.lastHit = G.time;
    const pos = new THREE.Vector3(p.body.position.x, p.body.position.y, p.body.position.z), v = Math.min(1.4, iv / 4);
    if (p.mat === 'ceramic') SND.sfx(iv > 4 ? 'glassPot' : 'mugClink', { pos, v });
    else if (p.mat === 'metal') { SND.sfx('hit', { pos, v: v * 0.7 }); SND.sfx('thud', { pos, v: v * 0.5 }); }
    else SND.sfx('thud', { pos, v: v * (0.5 + Math.min(1, p.mass / 8)) });
    if (iv > 2.2 && p !== this.held) Bus.emit('noise', pos.x, pos.z, Math.min(16, 4 + iv * 2.2 * Math.sqrt(p.mass)), 'crash');
    if (iv > 4 && p.mass > 3 && Player.pos.distanceTo(pos) < 4) Engine.shake(0.004 * Math.min(3, iv / 4), 0.15);
  },

  grab(p) {
    if (this.held) return;
    this.held = p; p.body.wakeUp(); p.body.angularDamping = 0.9;
    this.holdDist = 0.75 + Math.max(p.size.x, p.size.z) * 0.6;
    SND.sfx('pickup', { pos: new THREE.Vector3(p.body.position.x, p.body.position.y, p.body.position.z), v: 0.6 });
    Hands.gesture('grab', new THREE.Vector3(p.body.position.x, p.body.position.y, p.body.position.z), { hand: Player.held ? Hands.R : Hands.L, hold: true });
  },
  drop(throwIt) {
    const p = this.held; if (!p) return;
    this.held = null; p.body.angularDamping = 0.18; Hands.release();
    if (throwIt) {
      const f = Player.forward(), sp = 9 / Math.pow(Math.max(0.3, p.mass), 0.35);
      p.body.velocity.set(f.x * sp, f.y * sp + 1.2, f.z * sp);
      p.body.angularVelocity.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
      Hands.gesture('push', G.camera.localToWorld(new THREE.Vector3(0.1, -0.05, -0.7)), { hand: Hands.L, dur: 0.35 });
      SND.sfx('rustle', { v: 0.5 }); Bus.emit('noise', Player.pos.x, Player.pos.z, 3, 'throw');
    }
  },

  update(dt) {
    if (!this.world || !G.level) return;
    const C = CANNON;
    // movers
    const pp = Player.pos;
    if (this._pp) this.player.velocity.set((pp.x - this._pp.x) / Math.max(dt, 1e-3), 0, (pp.z - this._pp.z) / Math.max(dt, 1e-3));
    this.player.position.set(pp.x, pp.y + 0.8, pp.z); this._pp = { x: pp.x, z: pp.z };
    if (G.mode === 'car' || Player.hidden) this.player.position.y = -50;
    const sn = window.Stalker && Stalker.npc && Stalker.active !== false ? Stalker.npc : null;
    if (sn && sn.root.visible) {
      const np = sn.pos;
      if (this._np) this.npc.velocity.set((np.x - this._np.x) / Math.max(dt, 1e-3), 0, (np.z - this._np.z) / Math.max(dt, 1e-3));
      this.npc.position.set(np.x, np.y + 0.85, np.z); this._np = { x: np.x, z: np.z };
    } else this.npc.position.set(0, -50, 0);
    // statics follow their 2.5D boxes (doors opening etc.)
    for (const s of this.statics) if (s.on !== s.b.on) { s.on = s.b.on; s.body.collisionResponse = s.on; }
    // carrying: drive the body toward a point in front of the camera (it still collides with the world)
    if (this.held) {
      const p = this.held, b = p.body;
      if (Input.pressed('KeyE')) { Input.consume('KeyE'); this.drop(false); }
      else if (Input.mousePressed && Input.locked) { this.drop(true); }
      else {
        const cam = G.camera, f = new THREE.Vector3(); cam.getWorldDirection(f);
        const t = cam.position.clone().addScaledVector(f, this.holdDist); t.y -= 0.12;
        const dx = t.x - b.position.x, dy = t.y - b.position.y, dz = t.z - b.position.z;
        const k = 14 / Math.max(1, Math.sqrt(p.mass) * 0.6);
        b.velocity.set(dx * k, dy * k + 0.16, dz * k); b.wakeUp();
        b.angularVelocity.scale(0.85, b.angularVelocity);
        if (Math.hypot(dx, dy, dz) > 1.4) this.drop(false);   // snagged on something
        else Hands.L.tPos.lerp(Hands.reachTarget(new THREE.Vector3(b.position.x, b.position.y, b.position.z), -1), 0.85);
      }
    }
    this.acc = Math.min(this.acc + dt, 0.1);
    while (this.acc >= 1 / 60) { this.world.step(1 / 60); this.acc -= 1 / 60; }
    // sync meshes
    const q = new THREE.Quaternion(), o = new THREE.Vector3();
    for (const p of this.props) {
      const b = p.body; if (b.sleepState === C.Body.SLEEPING && !p._dirty) continue;
      p._dirty = b.sleepState !== C.Body.SLEEPING;
      q.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
      o.copy(p.off).applyQuaternion(q);
      p.g.position.set(b.position.x - o.x, b.position.y - o.y, b.position.z - o.z); p.g.quaternion.copy(q);
      if (b.position.y < -20) { b.position.set(b.position.x, 1, b.position.z); b.velocity.set(0, 0, 0); }
    }
  },
};
