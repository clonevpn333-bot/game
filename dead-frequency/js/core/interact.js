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
  clear() { this.items = []; this.current = null; UI.prompt(null); },

  update(dt) {
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
          if (h.distance <= (it.range || this.range) && it.enabled()) found = it;
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
        if (Input.held('KeyE')) { this.holdT += dt; UI.holdRing(this.holdT / found.hold); if (this.holdT >= found.hold) { this.holdT = 0; UI.holdRing(0); found.use(found); } }
        else if (this.holdT > 0) { this.holdT = 0; UI.holdRing(0); }
      } else if (Input.pressed('KeyE')) { Input.consume('KeyE'); found.use(found); }
    } else UI.prompt(null);
  },
};
