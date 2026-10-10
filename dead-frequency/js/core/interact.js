'use strict';
// Look-at interaction: raycast from screen center to registered meshes.

const Interact = {
  items: [],
  ray: new THREE.Raycaster(),
  current: null,
  holdT: 0,
  range: 2.3,
  enabled: true,

  // obj: Object3D (mesh or group). def: { prompt: str|fn, use: fn, enabled: fn, hold: secs, range }
  add(obj, def) {
    const it = Object.assign({ obj, enabled: () => true }, def);
    obj.traverse(o => { if (o.isMesh) o.userData.it = it; });
    this.items.push(it);
    const L = G.buildLevel || G.level;
    if (L && !L.rayTargets.includes(obj)) L.rayTargets.push(obj);
    return it;
  },
  remove(it) {
    if (!it) return;
    it.removed = true;
    const i = this.items.indexOf(it); if (i >= 0) this.items.splice(i, 1);
    it.obj.traverse(o => { if (o.userData.it === it) delete o.userData.it; });
    if (G.level) { const j = G.level.rayTargets.indexOf(it.obj); if (j >= 0) G.level.rayTargets.splice(j, 1); }
  },
  // invisible interaction volume
  volume(parent, x, y, z, w, h, d, def) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), B.invisible);
    m.position.set(x, y, z); parent.add(m);
    return this.add(m, def);
  },
  clear() { this.items = []; this.current = null; UI.prompt(null); for (const p of this.presses || []) p.obj.position.copy(p.base); this.presses = []; },
  // use an item: the hand gesture starts at the same moment (no input delay); a newly picked-up item
  // only shows in the hand once the fingers reach it
  run(it, pr, noGesture) {
    const kind = noGesture ? null : Hands.forPrompt(/pour a cup/i.test(pr || '') ? 'take' : pr);
    const prev = Player.held;
    let g = null;
    if (kind) g = Hands.gesture(kind, this.hitPoint, { hand: kind === 'grab' && !Player.held ? Hands.L : undefined });
    it.use(it);
    if (Player.held && Player.held !== prev && g && g.hand === Hands.L) {
      const obj = Player.held; obj.visible = false; g.onContact = () => { obj.visible = true; SND.sfx('pickup', { bus: 'ui', v: 0.35 }); };
    }
    // a small nudge of the view toward what was touched, and the touched part gives a little under the hand
    if (kind && kind !== 'pour') Player.nudge = 0.012;
    if (kind && this.hitObj && !(this.hitObj.userData && this.hitObj.userData.noPress)) this.press(this.hitObj, kind === 'press' ? 0.006 : 0.003, kind === 'grab' ? 0.18 : 0.14);
  },
  presses: [],
  press(obj, depth, delay) {
    if (this.presses.some(p => p.obj === obj)) return;
    const dir = G.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(depth);
    const base = obj.position.clone();
    const local = obj.parent ? obj.parent.worldToLocal(obj.getWorldPosition(new THREE.Vector3()).add(dir)).sub(base) : dir;
    this.presses.push({ obj, base, local, t: -delay });
  },
  updatePresses(dt) {
    for (const p of this.presses.slice()) {
      p.t += dt; if (p.t < 0) continue;
      const k = p.t / 0.22, f = k < 0.35 ? k / 0.35 : Math.max(0, 1 - (k - 0.35) / 0.65);
      p.obj.position.copy(p.base).addScaledVector(p.local, f);
      if (k >= 1) { p.obj.position.copy(p.base); this.presses.splice(this.presses.indexOf(p), 1); }
    }
  },

  update(dt) {
    this.updatePresses(dt);
    let found = null;
    const canAct = this.enabled && (G.mode === 'walk' || G.mode === 'locked' || G.mode === 'hide') && !UI.blocking();
    if (canAct && G.level) {
      const cam = G.camera;
      this.ray.setFromCamera({ x: 0, y: 0 }, cam);
      this.ray.far = 4;
      const hits = this.ray.intersectObjects(G.level.rayTargets, true);
      for (const h of hits) {
        const it = h.object.userData.it;
        if (it && !it.removed) {
          if (h.distance <= (it.range || this.range) && it.enabled()) { found = it; this.hitPoint = h.point.clone(); this.hitObj = h.object; }
          break;
        }
        if (h.object.visible !== false && !(h.object.material && h.object.material.visible === false) && !h.object.userData.noBlock) break;
      }
    }
    if (found !== this.current) { this.current = found; this.holdT = 0; UI.holdRing(0); }
    if (found) {
      const pr = typeof found.prompt === 'function' ? found.prompt() : found.prompt;
      UI.prompt(pr, found.hold);
      if (found.hold) {
        if (Input.held('KeyE')) {
          if (this.holdT === 0) this.holdG = Hands.gesture(Hands.forPrompt(pr) === 'pull' ? 'pull' : 'grab', this.hitPoint, { hold: true });
          this.holdT += dt; UI.holdRing(this.holdT / found.hold);
          if (this.holdT >= found.hold) { this.holdT = 0; UI.holdRing(0); Hands.release(); this.run(found, pr, true); }
        }
        else if (this.holdT > 0) { this.holdT = 0; UI.holdRing(0); Hands.release(); }
      } else if (Input.pressed('KeyE')) { Input.consume('KeyE'); this.run(found, pr); }
    } else UI.prompt(null);
  },
};
