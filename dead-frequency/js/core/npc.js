'use strict';
// Simple articulated humans built from primitives, with procedural animation.

const NPC_LOOKS = {
  marcy: { skin: '#e2b49a', hair: 0x3b2418, top: 0x6e2a32, pants: 0x34465e, shoes: 0x1a1a1a, hairStyle: 'ponytail', face: { makeup: true, lip: 'rgba(150,60,60,.9)' }, h: 1.66 },
  jo: { skin: '#e6c29e', hair: 0x0e0b0a, top: 0xb3221c, pants: 0x1b1b1e, shoes: 0x111111, hairStyle: 'bun', face: { eye: '#120c08' }, h: 1.6, nametag: true },
  dale: { skin: '#c99478', hair: 0x8a8580, top: 0x8a6d44, pants: 0x2f3a4c, shoes: 0x2a1d12, hairStyle: 'cap', cap: 0x2e3d2c, face: { mustache: 'rgba(120,115,108,.95)', stubble: true, brow: 'rgba(110,105,100,.8)' }, h: 1.82, bulky: true },
  mom: { skin: '#e8bfa5', hair: 0x7a5a3a, top: 0x4a5560, pants: 0x2a2a30, shoes: 0x20160f, hairStyle: 'short', face: { lip: 'rgba(160,80,80,.8)' }, h: 1.65, coat: true },
  deputy: { skin: '#d2a284', hair: 0x2a2018, top: 0x6b5a3a, pants: 0x4a3f2a, shoes: 0x111111, hairStyle: 'cropped', face: {}, h: 1.8 },
  walt: { skin: '#d9ad94', hair: 0xdddddd, top: 0x445566, pants: 0x3a3a3a, shoes: 0x222222, hairStyle: 'cropped', face: { glasses: true }, h: 1.72 },
};

function headTexture(look) {
  const c = TEX.canvas(256, 128), x = c.getContext('2d');
  x.fillStyle = look.skin; x.fillRect(0, 0, 256, 128);
  const f = TEX.gen.face.call(TEX, look.skin, look.face || {});
  x.drawImage(f.image, 64 - 42, 18, 84, 100);
  // blend edges
  const g = x.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, 'rgba(0,0,0,.12)'); g.addColorStop(0.25, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,.15)'); g.addColorStop(0.75, 'rgba(0,0,0,.2)'); g.addColorStop(1, 'rgba(0,0,0,.12)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 128);
  return TEX.make(c);
}

class Human {
  constructor(parent, who, o = {}) {
    const look = this.look = Object.assign({}, NPC_LOOKS[who] || NPC_LOOKS.walt, o.look || {});
    this.who = who;
    const s = look.h / 1.75;
    this.root = new THREE.Group(); parent.add(this.root);
    this.root.position.set(o.x || 0, o.y || 0, o.z || 0); this.root.rotation.y = o.ry || 0;
    const skin = B.col(new THREE.Color(look.skin)), top = B.col(look.top), pants = B.col(look.pants), shoes = B.col(look.shoes), hair = B.col(look.hair);
    const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 3, 8);
    const mk = (geo, mat, par, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; par.add(m); return m; };
    const bulk = look.bulky ? 1.15 : 1;
    // hierarchy
    this.hips = new THREE.Group(); this.hips.position.y = 0.95 * s; this.root.add(this.hips);
    mk(new THREE.BoxGeometry(0.34 * bulk, 0.2, 0.2), pants, this.hips, 0, 0, 0);
    this.spine = new THREE.Group(); this.spine.position.y = 0.08; this.hips.add(this.spine);
    const torso = mk(cap(0.17 * bulk, 0.32 * s), top, this.spine, 0, 0.27 * s, 0); torso.scale.set(1.05, 1, 0.68);
    if (look.coat) { const coat = mk(cap(0.19, 0.55 * s), top, this.spine, 0, 0.12 * s, 0); coat.scale.set(1.05, 1, 0.72); }
    if (look.nametag) { const nt = mk(new THREE.PlaneGeometry(0.07, 0.025), B.col(0xeeeeee), this.spine, 0.08, 0.38 * s, 0.125); void nt; }
    this.neck = new THREE.Group(); this.neck.position.y = 0.55 * s; this.spine.add(this.neck);
    mk(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), skin, this.neck, 0, 0.03, 0);
    this.head = new THREE.Group(); this.head.position.y = 0.1; this.neck.add(this.head);
    const headM = new THREE.MeshLambertMaterial({ map: headTexture(look) });
    const hd = mk(new THREE.SphereGeometry(0.105, 18, 14), headM, this.head, 0, 0.1, 0); hd.scale.set(0.92, 1.15, 1.0);
    // hair
    const hs = look.hairStyle;
    if (hs === 'cap') {
      const capM = B.col(look.cap);
      const crown = mk(new THREE.SphereGeometry(0.112, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), capM, this.head, 0, 0.15, -0.005); crown.scale.set(0.97, 0.9, 1.05);
      const brim = mk(new THREE.BoxGeometry(0.17, 0.012, 0.11), capM, this.head, 0, 0.16, 0.13); brim.rotation.x = 0.12;
      mk(new THREE.SphereGeometry(0.1, 10, 8), hair, this.head, 0, 0.09, -0.03).scale.set(0.98, 0.7, 0.95);
    } else {
      const top2 = mk(new THREE.SphereGeometry(0.113, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, this.head, 0, 0.11, -0.01); top2.scale.set(0.97, 1.12, 1.06);
      if (hs !== 'cropped') { const back = mk(new THREE.SphereGeometry(0.11, 12, 8), hair, this.head, 0, 0.06, -0.035); back.scale.set(0.98, 1.1, 0.9); }
      if (hs === 'ponytail') { const pt = mk(cap(0.035, 0.18), hair, this.head, 0, 0.0, -0.13); pt.rotation.x = 0.4; }
      if (hs === 'bun') mk(new THREE.SphereGeometry(0.05, 8, 6), hair, this.head, 0, 0.17, -0.1);
      if (hs === 'short') { for (const sx of [-1, 1]) { const side = mk(cap(0.04, 0.12), hair, this.head, sx * 0.09, 0.02, -0.02); void side; } }
    }
    // arms
    this.arms = [];
    for (const sx of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(sx * 0.21 * bulk, 0.48 * s, 0); this.spine.add(sh);
      mk(cap(0.05 * bulk, 0.24 * s), top, sh, 0, -0.15 * s, 0);
      const el = new THREE.Group(); el.position.y = -0.3 * s; sh.add(el);
      mk(cap(0.042 * bulk, 0.22 * s), look.coat ? top : (look.sleeves === false ? skin : top), el, 0, -0.13 * s, 0);
      mk(new THREE.SphereGeometry(0.045, 8, 6), skin, el, 0, -0.29 * s, 0.01);
      this.arms.push({ sh, el, side: sx });
    }
    // legs
    this.legs = [];
    for (const sx of [-1, 1]) {
      const hp = new THREE.Group(); hp.position.set(sx * 0.1, -0.05, 0); this.hips.add(hp);
      mk(cap(0.072 * bulk, 0.34 * s), pants, hp, 0, -0.22 * s, 0);
      const kn = new THREE.Group(); kn.position.y = -0.44 * s; hp.add(kn);
      mk(cap(0.058 * bulk, 0.34 * s), pants, kn, 0, -0.22 * s, 0);
      mk(new THREE.BoxGeometry(0.1, 0.07, 0.25), shoes, kn, 0, -0.45 * s, 0.05);
      this.legs.push({ hp, kn, side: sx });
    }
    this.s = s;
    this.pose = o.pose || 'stand';
    this.t = Math.random() * 10;
    this.speed = 0; this.path = null; this.talking = false; this.lookTarget = null;
    this.headYaw = 0; this.headPitch = 0;
    this.gesture = 0;
    this.visible = true;
  }
  get pos() { return this.root.position; }
  setVisible(v) { this.root.visible = v; this.visible = v; }
  remove() { this.root.parent && this.root.parent.remove(this.root); }
  lookAt(target) { this.lookTarget = target; } // Vector3 or null
  face(x, z) { this.root.rotation.y = Math.atan2(x - this.root.position.x, z - this.root.position.z); }
  walkTo(points, speed = 1.3) {
    if (!Array.isArray(points[0])) points = [points];
    this.path = points.map(p => new THREE.Vector3(p[0], 0, p[1]));
    this.speed = speed; this.pose = speed > 2.5 ? 'run' : 'walk';
    return new Promise(res => { this._onArrive = res; });
  }
  update(dt) {
    this.t += dt;
    const p = this.root.position;
    // path following
    if (this.path && this.path.length) {
      const tgt = this.path[0];
      const dx = tgt.x - p.x, dz = tgt.z - p.z, d = Math.hypot(dx, dz);
      if (d < 0.08) { this.path.shift(); if (!this.path.length) { this.path = null; this.pose = 'stand'; if (this._onArrive) { const f = this._onArrive; this._onArrive = null; f(); } } }
      else {
        const step = Math.min(d, this.speed * dt);
        p.x += dx / d * step; p.z += dz / d * step;
        const want = Math.atan2(dx, dz);
        this.root.rotation.y += U.angDiff(this.root.rotation.y, want) * Math.min(1, dt * 8);
        if (this.onStep) { this._stepAcc = (this._stepAcc || 0) + step; if (this._stepAcc > (this.pose === 'run' ? 1.1 : 0.7)) { this._stepAcc = 0; this.onStep(); } }
      }
    }
    if (G.level && G.level.groundFn) p.y = G.level.groundAt(p.x, p.z);
    this.animate(dt);
  }
  animate(dt) {
    const t = this.t, s = this.s;
    const A = this.arms, Lg = this.legs;
    let hipsY = 0.95 * s, spineX = 0, spineY = 0;
    const set = (o, x, y, z) => { o.rotation.set(x || 0, y || 0, z || 0); };
    if (this.pose === 'walk' || this.pose === 'run') {
      const run = this.pose === 'run'; const f = run ? 9 : 5.6 * (this.speed / 1.3); const amp = run ? 0.9 : 0.5;
      const ph = t * f;
      for (const l of Lg) { const a = Math.sin(ph + (l.side > 0 ? Math.PI : 0)); set(l.hp, a * amp); set(l.kn, Math.max(0, -Math.cos(ph + (l.side > 0 ? Math.PI : 0))) * amp * 1.2); }
      for (const a of A) { const v = Math.sin(ph + (a.side > 0 ? 0 : Math.PI)); set(a.sh, v * amp * 0.8, 0, a.side * 0.06); set(a.el, run ? -1.2 : -0.25); }
      hipsY += Math.abs(Math.sin(ph)) * 0.04 - 0.02; spineX = run ? 0.25 : 0.04;
    } else if (this.pose === 'sit') {
      hipsY = 0.5;
      for (const l of Lg) { set(l.hp, -1.5); set(l.kn, 1.5); }
      for (const a of A) { set(a.sh, -0.5, 0, a.side * 0.1); set(a.el, -0.9); }
      spineX = 0.05 + Math.sin(t * 0.8) * 0.01;
    } else if (this.pose === 'crouch') {
      hipsY = 0.55;
      for (const l of Lg) { set(l.hp, -1.3); set(l.kn, 2.1); }
      for (const a of A) { set(a.sh, -0.7, 0, a.side * 0.2); set(a.el, -0.8); }
      spineX = 0.5;
    } else if (this.pose === 'flashlight') { // standing, flashlight raised
      for (const l of Lg) { set(l.hp, 0); set(l.kn, 0); }
      set(A[1].sh, -1.35, 0, -0.1); set(A[1].el, -0.15);
      set(A[0].sh, Math.sin(t * 1.3) * 0.05, 0, -0.08); set(A[0].el, -0.2);
      spineX = Math.sin(t * 1.1) * 0.02;
    } else if (this.pose === 'tied') { // seated, arms behind
      hipsY = 0.5;
      for (const l of Lg) { set(l.hp, -1.5); set(l.kn, 1.5); }
      for (const a of A) { set(a.sh, 0.5, 0, a.side * 0.25); set(a.el, -0.6); }
      spineX = 0.25 + Math.sin(t * 2.3) * 0.03;
    } else if (this.pose === 'lean') {
      for (const l of Lg) { set(l.hp, 0.05 * l.side); set(l.kn, 0.1); }
      for (const a of A) { set(a.sh, -0.3, 0, a.side * 0.15); set(a.el, -1.3); }
      spineX = 0.08;
    } else { // stand / idle
      for (const l of Lg) { set(l.hp, 0); set(l.kn, 0); }
      const br = Math.sin(t * 1.6) * 0.015;
      for (const a of A) { set(a.sh, br + (this.talking ? Math.sin(t * 2.2 + a.side) * 0.15 * this.gesture : 0), 0, a.side * 0.08); set(a.el, -0.15 - (this.talking ? (0.4 + Math.sin(t * 3 + a.side) * 0.3) * this.gesture : 0)); }
      spineX = br;
    }
    if (this.pose === 'phone') { set(A[1].sh, -0.4, 0, -0.5); set(A[1].el, -2.3); }
    if (this.armPose) this.armPose(A, t);
    this.hips.position.y = hipsY;
    this.spine.rotation.set(spineX, spineY, 0);
    this.gesture = U.damp(this.gesture, this.talking ? 1 : 0, 3, dt);
    // head look
    let wantYaw = 0, wantPitch = 0;
    if (this.lookTarget) {
      const hp = this.head.getWorldPosition(this._hp || (this._hp = new THREE.Vector3()));
      const dx = this.lookTarget.x - hp.x, dz = this.lookTarget.z - hp.z, dy = this.lookTarget.y - hp.y;
      wantYaw = U.clamp(U.angDiff(this.root.rotation.y, Math.atan2(dx, dz)), -1.1, 1.1);
      wantPitch = U.clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.6, 0.6);
    }
    this.headYaw = U.damp(this.headYaw, wantYaw, 4, dt); this.headPitch = U.damp(this.headPitch, wantPitch, 4, dt);
    const nod = this.talking ? Math.sin(t * 7) * 0.03 + Math.sin(t * 3.1) * 0.04 : 0;
    this.neck.rotation.set(this.headPitch * 0.5 + nod, this.headYaw * 0.4, 0);
    this.head.rotation.set(this.headPitch * 0.5, this.headYaw * 0.6, Math.sin(t * 0.7) * 0.02);
  }
}

const NPCs = {
  list: [],
  spawn(who, o = {}) { const h = new Human(G.level.root, who, o); this.list.push(h); return h; },
  get(who) { return this.list.find(n => n.who === who); },
  update(dt) { for (const n of this.list) if (n.visible && !n.managed) n.update(dt); },
  clear() { for (const n of this.list) n.remove(); this.list = []; },
};
