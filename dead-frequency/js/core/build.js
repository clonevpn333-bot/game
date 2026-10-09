'use strict';
// Geometry/level construction helpers.

class Level {
  constructor(name) {
    this.name = name;
    this.root = new THREE.Group();
    this.updaters = [];
    this.zones = [];
    this.doors = [];
    this.lights = [];       // { light, fixture, circuit, base, flicker }
    this.surfaces = [];     // { minX,minZ,maxX,maxZ, s }
    this.defaultSurface = 'tile';
    this.groundFn = null;
    this.spawns = {};
    this.loops = [];
    this.speakers = [];
    this.rayTargets = [];
    this.named = {};
    this.hides = [];
    this.power = true;
  }
  add(o) { this.root.add(o); return o; }
  onUpdate(fn) { this.updaters.push(fn); return fn; }
  update(dt) { for (const f of this.updaters) f(dt); for (const d of this.doors) d.update(dt); for (const L of this.lights) if (L.update) L.update(dt); }
  zone(name, minX, minZ, maxX, maxZ) { this.zones.push({ name, minX: Math.min(minX, maxX), maxX: Math.max(minX, maxX), minZ: Math.min(minZ, maxZ), maxZ: Math.max(minZ, maxZ) }); }
  zoneAt(x, z) { for (let i = this.zones.length - 1; i >= 0; i--) { const q = this.zones[i]; if (x >= q.minX && x <= q.maxX && z >= q.minZ && z <= q.maxZ) return q.name; } return null; }
  inZone(name, x, z) { for (const q of this.zones) if (q.name === name && x >= q.minX && x <= q.maxX && z >= q.minZ && z <= q.maxZ) return true; return false; }
  surface(minX, minZ, maxX, maxZ, s) { this.surfaces.push({ minX: Math.min(minX, maxX), maxX: Math.max(minX, maxX), minZ: Math.min(minZ, maxZ), maxZ: Math.max(minZ, maxZ), s }); }
  surfaceAt(x, z) { for (let i = this.surfaces.length - 1; i >= 0; i--) { const q = this.surfaces[i]; if (x >= q.minX && x <= q.maxX && z >= q.minZ && z <= q.maxZ) return q.s; } return this.defaultSurface; }
  groundAt(x, z) { return this.groundFn ? this.groundFn(x, z) : 0; }
  loop(name, o) { const h = SND.loop(name, o); this.loops.push(h); return h; }
  speaker(o) { const h = Radio.addSpeaker(o); this.speakers.push(h); return h; }
  // power: turn circuits on/off
  setPower(on, circuit = null) {
    for (const L of this.lights) { if (circuit && L.circuit !== circuit) continue; if (!circuit && L.circuit === 'emergency') continue; L.setPower(on); }
    if (!circuit) this.power = on;
    Bus.emit('power', on, circuit);
  }
}

const B = {
  matCache: {},
  invisible: new THREE.MeshBasicMaterial({ visible: false }),

  // Lambert material with optional texture (world-scale UVs handled by geometry)
  // surface response per texture: [roughness, metalness, normal strength]
  SURF: { vct: [0.42, 0, 0.6], carpet: [0.97, 0, 1.4], drywall: [0.86, 0, 0.5], paneling: [0.55, 0, 1.0], acoustic: [0.98, 0, 1.6], ceiling: [0.92, 0, 0.9],
    concrete: [0.88, 0, 1.3], cinder: [0.92, 0, 1.6], siding: [0.68, 0, 0.9], asphalt: [0.82, 0, 1.4], road: [0.78, 0, 1.0], gravel: [0.96, 0, 2.2], grass: [0.96, 0, 1.4],
    forestFloor: [0.97, 0, 2.0], dirt: [0.96, 0, 1.6], bark: [0.95, 0, 2.4], pine: [0.9, 0, 1.2], metal: [0.42, 0.55, 0.6], corrugated: [0.55, 0.4, 1.6], woodDoor: [0.58, 0, 0.8],
    paintedDoor: [0.5, 0, 0.6], plain: [0.75, 0, 0.6], tarp: [0.7, 0, 1.4], chainlink: [0.5, 0.6, 0.4], keyboard: [0.6, 0, 0.6], board: [0.55, 0.1, 0.8], rack: [0.5, 0.3, 0.6] },
  mat(texName, o = {}) {
    const key = texName + JSON.stringify(o);
    if (this.matCache[key] && !o.unique) return this.matCache[key];
    const p = { color: o.color != null ? o.color : 0xffffff };
    const sf = this.SURF[texName] || [0.72, 0, 0.8];
    if (texName) {
      const args = o.texArgs || []; p.map = TEX.get(texName, ...args);
      if (o.normal !== false && sf[2] > 0) { p.normalMap = TEX.normalFrom(p.map, texName + JSON.stringify(args), sf[2]); }
    }
    if (o.emissive != null) p.emissive = new THREE.Color(o.emissive);
    if (o.emissiveMap) p.emissiveMap = o.emissiveMap;
    if (o.transparent) { p.transparent = true; p.opacity = o.opacity == null ? 1 : o.opacity; p.depthWrite = o.depthWrite !== undefined ? o.depthWrite : true; }
    if (o.side) p.side = o.side;
    if (o.alphaTest) p.alphaTest = o.alphaTest;
    p.roughness = o.roughness != null ? o.roughness : sf[0];
    p.metalness = o.metalness != null ? o.metalness : sf[1];
    const m = new THREE.MeshStandardMaterial(p);
    m.envMapIntensity = o.env != null ? o.env : 1;
    if (!o.unique) this.matCache[key] = m;
    return m;
  },
  col(color, o = {}) { return this.mat(null, Object.assign({ color }, o)); },
  glow(color, intensity = 1) { return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) }); },
  texMat(tex, o = {}) { const p = { map: tex, color: o.color != null ? o.color : 0xffffff }; if (o.emissive) { p.emissive = new THREE.Color(o.emissive); p.emissiveMap = tex; } if (o.transparent) { p.transparent = true; p.alphaTest = 0.1; } if (o.side) p.side = o.side; return o.basic ? new THREE.MeshBasicMaterial(p) : new THREE.MeshStandardMaterial(Object.assign(p, { roughness: 0.7 })); },

  // box geometry with UVs in world units / uvScale meters per texture repeat
  boxGeo(w, h, d, uvs = 1) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (uvs) {
      const uv = g.attributes.uv;
      const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
      for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / uvs, uv.getY(k) * dims[f][1] / uvs); }
    }
    return g;
  },
  // add a box mesh to parent; returns mesh. o: { collide, sight, cast, receive, rot, uv }
  box(parent, x, y, z, w, h, d, material, o = {}) {
    const m = new THREE.Mesh(this.boxGeo(w, h, d, o.uv === undefined ? 1 : o.uv), material);
    m.position.set(x, y + h / 2, z);
    if (o.rotY) m.rotation.y = o.rotY;
    m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
    parent.add(m);
    if (o.collide) { const L = G.buildLevel; const b = Phys.addC(x, z, o.rotY && Math.abs(Math.sin(o.rotY)) > 0.7 ? d : w, o.rotY && Math.abs(Math.sin(o.rotY)) > 0.7 ? w : d, y, y + h, { sight: o.sight !== false, tag: o.tag }); m.userData.col = b; if (L && o.ray !== false) L.rayTargets.push(m); }
    else if (o.ray && G.buildLevel) G.buildLevel.rayTargets.push(m);
    return m;
  },
  plane(parent, x, y, z, w, h, material, o = {}) {
    const g = new THREE.PlaneGeometry(w, h);
    if (o.uv !== 0) { const s = o.uv || 1; const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / s, uv.getY(i) * h / s); }
    const m = new THREE.Mesh(g, material);
    m.position.set(x, y, z);
    if (o.rx != null) m.rotation.x = o.rx; if (o.ry != null) m.rotation.y = o.ry; if (o.rz != null) m.rotation.z = o.rz;
    m.receiveShadow = o.receive !== false; m.castShadow = !!o.cast;
    parent.add(m);
    return m;
  },
  floor(parent, x0, z0, x1, z1, y, material, uv = 1) { return this.plane(parent, (x0 + x1) / 2, y, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(z1 - z0), material, { rx: -Math.PI / 2, uv }); },
  ceiling(parent, x0, z0, x1, z1, y, material, uv = 1) { return this.plane(parent, (x0 + x1) / 2, y, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(z1 - z0), material, { rx: Math.PI / 2, uv, receive: true }); },

  // soft contact shadow strips where a wall meets the floor (fake ambient occlusion)
  aoMat(opacity = 0.5) {
    const k = 'ao' + opacity; if (this.matCache[k]) return this.matCache[k];
    if (!this._aoTex) { const c = TEX.canvas(4, 64), x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#777'); g.addColorStop(1, '#000'); x.fillStyle = g; x.fillRect(0, 0, 4, 64); this._aoTex = new THREE.CanvasTexture(c); }
    const m = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity, alphaMap: this._aoTex, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.matCache[k] = m; return m;
  },
  // axis 'x': wall along x at z; 'z': wall along z at x. t = wall thickness
  ao(parent, a0, a1, c, axis, t, y = 0, o = {}) {
    const len = a1 - a0; if (len < 0.2) return;
    const mid = (a0 + a1) / 2, d = o.depth || 0.42, hh = o.wallH || 0.35;
    const fm = this.aoMat(o.opacity || 0.42), wm = this.aoMat(o.wallOpacity || 0.3);
    for (const sd of o.sides || [-1, 1]) {
      // floor strip: opaque edge against the wall
      const f = new THREE.Mesh(new THREE.PlaneGeometry(len, d), fm);
      f.rotation.x = -Math.PI / 2;
      if (axis === 'x') { f.position.set(mid, y + 0.006, c + sd * (t / 2 + d / 2)); if (sd < 0) f.rotation.z = Math.PI; }
      else { f.rotation.z = sd > 0 ? Math.PI / 2 : -Math.PI / 2; f.position.set(c + sd * (t / 2 + d / 2), y + 0.006, mid); }
      f.renderOrder = 1; parent.add(f);
      // wall-base darkening
      const w = new THREE.Mesh(new THREE.PlaneGeometry(len, hh), wm);
      if (axis === 'x') { w.position.set(mid, y + hh / 2, c + sd * (t / 2 + 0.004)); w.rotation.set(0, sd > 0 ? 0 : Math.PI, Math.PI); }
      else { w.position.set(c + sd * (t / 2 + 0.004), y + hh / 2, mid); w.rotation.set(0, sd > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI); }
      w.renderOrder = 1; parent.add(w);
    }
  },
  // soft blob shadow under an object (footprint w x d at x,z)
  blob(parent, x, z, w, d, y = 0, opacity = 0.5) {
    if (!this._blobTex) { const c = TEX.canvas(64, 64), g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(0.55, '#999'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); this._blobTex = new THREE.CanvasTexture(c); }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.35, d * 1.35), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity, alphaMap: this._blobTex, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.008, z); m.renderOrder = 1; parent.add(m); return m;
  },

  // Wall along X (constant z) from x0..x1, with openings [{at, w, h, sill}] (at = center x)
  wallX(parent, x0, x1, z, h, t, mat, openings = [], o = {}) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    const ops = openings.map(op => ({ a: op.at - op.w / 2, b: op.at + op.w / 2, h: op.h || 2.1, sill: op.sill || 0 })).sort((p, q) => p.a - q.a);
    let cur = x0; const y = o.y || 0; const meshes = [];
    const aoSeg = (a, b) => { if (h <= 3.6 && o.ao !== false) this.ao(parent, a, b, z, 'x', t, y, o.aoOpts || {}); };
    for (const op of ops) {
      if (op.a > cur) { meshes.push(this.box(parent, (cur + op.a) / 2, y, z, op.a - cur, h, t, mat, { collide: true })); aoSeg(cur, op.a); }
      if (op.h < h) meshes.push(this.box(parent, (op.a + op.b) / 2, y + op.h, z, op.b - op.a, h - op.h, t, mat, { collide: false, ray: true }));
      if (op.sill > 0) meshes.push(this.box(parent, (op.a + op.b) / 2, y, z, op.b - op.a, op.sill, t, mat, { collide: true, sight: false }));
      cur = op.b;
    }
    if (x1 > cur) { meshes.push(this.box(parent, (cur + x1) / 2, y, z, x1 - cur, h, t, mat, { collide: true })); aoSeg(cur, x1); }
    return meshes;
  },
  wallZ(parent, z0, z1, x, h, t, mat, openings = [], o = {}) {
    if (z0 > z1) [z0, z1] = [z1, z0];
    const ops = openings.map(op => ({ a: op.at - op.w / 2, b: op.at + op.w / 2, h: op.h || 2.1, sill: op.sill || 0 })).sort((p, q) => p.a - q.a);
    let cur = z0; const y = o.y || 0; const meshes = [];
    const aoSeg = (a, b) => { if (h <= 3.6 && o.ao !== false) this.ao(parent, a, b, x, 'z', t, y, o.aoOpts || {}); };
    for (const op of ops) {
      if (op.a > cur) { meshes.push(this.box(parent, x, y, (cur + op.a) / 2, t, h, op.a - cur, mat, { collide: true })); aoSeg(cur, op.a); }
      if (op.h < h) meshes.push(this.box(parent, x, y + op.h, (op.a + op.b) / 2, t, h - op.h, op.b - op.a, mat, { collide: false, ray: true }));
      if (op.sill > 0) meshes.push(this.box(parent, x, y, (op.a + op.b) / 2, t, op.sill, op.b - op.a, mat, { collide: true, sight: false }));
      cur = op.b;
    }
    if (z1 > cur) { meshes.push(this.box(parent, x, y, (cur + z1) / 2, t, h, z1 - cur, mat, { collide: true })); aoSeg(cur, z1); }
    return meshes;
  },
  // glass pane (for windows) - blocks movement, not sight
  glass(parent, x, y, z, w, h, axis = 'x', o = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: o.tint || 0x8899aa, transparent: true, opacity: o.opacity || 0.18, roughness: 0.05, metalness: 0.6, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(x, y + h / 2, z);
    if (axis === 'z') m.rotation.y = Math.PI / 2;
    parent.add(m);
    if (o.collide !== false) { if (axis === 'x') Phys.addC(x, z, w, 0.08, y, y + h, { sight: false }); else Phys.addC(x, z, 0.08, w, y, y + h, { sight: false }); }
    return m;
  },
  // window frame + glass in an opening (axis 'x' = wall along x)
  windowFrame(parent, x, sill, z, w, h, axis = 'x', mat = null) {
    mat = mat || this.col(0xd8d4c8);
    const t = 0.06;
    if (axis === 'x') {
      this.box(parent, x, sill - 0.04, z, w + 0.1, 0.05, 0.24, mat); this.box(parent, x, sill + h, z, w + 0.1, 0.05, 0.2, mat);
      this.box(parent, x - w / 2, sill, z, t, h, 0.2, mat); this.box(parent, x + w / 2, sill, z, t, h, 0.2, mat);
      this.box(parent, x, sill, z, 0.04, h, 0.1, mat);
    } else {
      this.box(parent, x, sill - 0.04, z, 0.24, 0.05, w + 0.1, mat); this.box(parent, x, sill + h, z, 0.2, 0.05, w + 0.1, mat);
      this.box(parent, x, sill, z - w / 2, 0.2, h, t, mat); this.box(parent, x, sill, z + w / 2, 0.2, h, t, mat);
      this.box(parent, x, sill, z, 0.1, h, 0.04, mat);
    }
    return this.glass(parent, x, sill, z, w, h, axis);
  },

  // light fixtures ---------------------------------------------------------
  // fluorescent troffer with a point light. circuit for power control.
  fluoro(L, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const housing = new THREE.Mesh(this.boxGeo(o.w || 0.6, 0.06, o.d || 1.2, 0), this.col(0xcfcfc8));
    const lensMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lens = new THREE.Mesh(new THREE.PlaneGeometry((o.w || 0.6) - 0.06, (o.d || 1.2) - 0.06), lensMat);
    lens.rotation.x = Math.PI / 2; lens.position.y = -0.035;
    g.add(housing, lens); L.add(g);
    const light = new THREE.PointLight(o.color || 0xf3f0e2, o.intensity || 6, o.dist || 9, 1.6);
    light.position.set(x, y - 0.25, z);
    L.add(light);
    const color = new THREE.Color(o.color || 0xf3f0e2);
    const entry = this.lightEntry(L, light, lensMat, color, o);
    return entry;
  },
  bulb(L, x, y, z, o = {}) {
    const lensMat = new THREE.MeshBasicMaterial({ color: o.color || 0xffd9a0 });
    const s = new THREE.Mesh(new THREE.SphereGeometry(o.r || 0.07, 8, 6), lensMat); s.position.set(x, y, z); L.add(s);
    let light = null;
    if (o.light !== false) {
      if (o.spot) {
        light = new THREE.SpotLight(o.color || 0xffd9a0, o.intensity || 20, o.dist || 20, o.angle || 0.9, 0.6, 1.4);
        light.position.set(x, y - 0.05, z); light.target.position.set(x + (o.tx || 0), 0, z + (o.tz || 0)); L.add(light.target);
        if (o.shadow) { light.castShadow = true; light.shadow.mapSize.set(512, 512); light.shadow.bias = -0.002; }
      } else light = new THREE.PointLight(o.color || 0xffd9a0, o.intensity || 3, o.dist || 7, 1.6);
      if (!o.spot) light.position.set(x, y - 0.1, z);
      L.add(light);
    }
    return this.lightEntry(L, light, lensMat, new THREE.Color(o.color || 0xffd9a0), o);
  },
  lightEntry(L, light, lensMat, color, o) {
    const halo = o.halo !== false && light ? P.halo(L.root, light.position.x, light.position.y + (light.isSpotLight ? 0.05 : 0.08), light.position.z, color.getHex(), o.haloSize || (light.isSpotLight ? 1.6 : 0.8), o.haloOpacity || (light.isSpotLight ? 0.32 : 0.2)) : null;
    const e = {
      light, lensMat, color, circuit: o.circuit || 'main', halo, base: light ? light.intensity : 0, on: o.on !== false, powered: true, flicker: o.flicker || 0, ft: 0, extra: 1,
      setPower(p) { this.powered = p; this.apply(); },
      setOn(v) { this.on = v; this.apply(); },
      apply() { const lit = this.on && this.powered; const k = lit ? this.extra : 0; if (this.light) { this.light.intensity = this.base * k; this.light.visible = k > 0.001; } if (this.lensMat) this.lensMat.color.copy(this.color).multiplyScalar(lit ? 0.35 + 0.9 * this.extra : 0.03); if (this.halo) { this.halo.visible = k > 0.001; this.halo.material.opacity = (this.halo.userData.op || (this.halo.userData.op = this.halo.material.opacity)) * Math.min(1, k); } },
      update(dt) {
        if (!this.flicker || !this.on || !this.powered) return;
        this.ft -= dt;
        if (this.ft <= 0) { this.ft = 0.03 + Math.random() * 0.12; const off = Math.random() < this.flicker * 0.35; this.extra = off ? 0.08 : (0.8 + Math.random() * 0.25); this.apply(); }
      },
    };
    e.apply();
    L.lights.push(e);
    return e;
  },
  // pole light for parking lots
  poleLight(L, x, z, o = {}) {
    const h = o.h || 6;
    const pole = this.col(0x555a5e);
    this.box(L.root, x, 0, z, 0.16, h, 0.16, pole, { collide: true });
    const arm = this.box(L.root, x + 0.6 * (o.dir || 1), h - 0.1, z, 1.3, 0.1, 0.12, pole);
    void arm;
    const head = this.box(L.root, x + 1.2 * (o.dir || 1), h - 0.25, z, 0.5, 0.18, 0.3, pole);
    void head;
    const lensMat = new THREE.MeshBasicMaterial({ color: o.color || 0xffb060 });
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.22), lensMat); lens.rotation.x = Math.PI / 2; lens.position.set(x + 1.2 * (o.dir || 1), h - 0.26, z); L.add(lens);
    const light = new THREE.SpotLight(o.color || 0xffb060, o.intensity || 60, o.dist || 22, 1.05, 0.7, 1.3);
    light.position.set(x + 1.2 * (o.dir || 1), h - 0.3, z); light.target.position.set(x + 1.2 * (o.dir || 1), 0, z); L.add(light); L.add(light.target);
    if (o.shadow) { light.castShadow = true; light.shadow.mapSize.set(1024, 1024); light.shadow.bias = -0.001; light.shadow.camera.far = 30; }
    return this.lightEntry(L, light, lensMat, new THREE.Color(o.color || 0xffb060), o);
  },

  // simple text sign mesh
  signMesh(parent, text, x, y, z, w, h, o = {}) {
    const tex = TEX.get('sign', text, Object.assign({ w: o.pw || 512, h: o.ph || Math.round(512 * h / w) }, o.tex || {}));
    const lp = { map: tex }; if (o.emissive) { lp.emissive = new THREE.Color(o.emissive); lp.emissiveMap = tex; }
    lp.roughness = 0.6; const mat = o.glow ? new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(o.glowColor || 0xffffff) }) : new THREE.MeshStandardMaterial(lp);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z); m.rotation.y = o.ry || 0;
    parent.add(m);
    return m;
  },
  texPlane(parent, tex, x, y, z, w, h, o = {}) {
    const lp = { map: tex, transparent: !!o.transparent, alphaTest: o.transparent ? 0.1 : 0, side: o.side || THREE.FrontSide };
    if (o.emissive != null) { lp.emissive = new THREE.Color(o.emissive); lp.emissiveMap = tex; }
    lp.roughness = 0.75; const mat = o.basic ? new THREE.MeshBasicMaterial({ map: tex, transparent: !!o.transparent, side: o.side || THREE.FrontSide, color: o.color != null ? o.color : 0xffffff }) : new THREE.MeshStandardMaterial(lp);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z); m.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
    m.receiveShadow = true;
    parent.add(m);
    return m;
  },
  cyl(parent, x, y, z, rt, rb, h, mat, o = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg || 12, 1, !!o.open), mat);
    m.position.set(x, y + h / 2, z);
    if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; if (o.ry) m.rotation.y = o.ry;
    m.castShadow = o.cast !== false; m.receiveShadow = true;
    parent.add(m);
    if (o.collide) Phys.addC(x, z, rb * 2, rb * 2, y, y + h, { tag: o.tag });
    return m;
  },
  group(parent, x = 0, y = 0, z = 0, ry = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; },
};

// ---------------------------------------------------------------------------
// Doors: hinged panels with collision when closed.
class Door {
  // o: { x, z, w, h, axis:'x'|'z' (wall direction), hinge:-1|1, swing:-1|1, mat, locked, name, sticky, thick, kind }
  constructor(L, o) {
    this.L = L; this.o = o; this.name = o.name || 'door';
    const w = o.w || 0.9, h = o.h || 2.05, t = o.thick || 0.045;
    this.w = w;
    this.pivot = new THREE.Group();
    const hinge = o.hinge || -1;
    const hx = o.axis === 'z' ? o.x : o.x + hinge * w / 2;
    const hz = o.axis === 'z' ? o.z + hinge * w / 2 : o.z;
    this.pivot.position.set(hx, o.y || 0, hz);
    L.add(this.pivot);
    const panelMat = o.mat || B.mat('woodDoor', { color: 0xffffff });
    this.panel = new THREE.Mesh(B.boxGeo(o.axis === 'z' ? t : w, h, o.axis === 'z' ? w : t, 0), panelMat);
    if (o.axis === 'z') this.panel.position.set(0, h / 2, -hinge * w / 2);
    else this.panel.position.set(-hinge * w / 2, h / 2, 0);
    this.panel.castShadow = true; this.panel.receiveShadow = true;
    this.pivot.add(this.panel);
    // handle
    const hm = B.col(0xb8b2a0, { standard: true });
    const handle = new THREE.Mesh(new THREE.BoxGeometry(o.axis === 'z' ? 0.16 : 0.12, 0.04, o.axis === 'z' ? 0.12 : 0.16), hm);
    if (o.axis === 'z') handle.position.set(0, 1.0, -hinge * (w - 0.1)); else handle.position.set(-hinge * (w - 0.1), 1.0, 0);
    this.pivot.add(handle);
    if (o.window) { // small glass window in door
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.5), new THREE.MeshBasicMaterial({ color: 0x0a0d12 }));
      if (o.axis === 'z') { gl.rotation.y = Math.PI / 2; gl.position.set(t / 2 + 0.002, 1.5, -hinge * w / 2); } else gl.position.set(-hinge * w / 2, 1.5, t / 2 + 0.002);
      this.pivot.add(gl);
      const gl2 = gl.clone(); if (o.axis === 'z') gl2.position.x = -t / 2 - 0.002; else gl2.position.z = -t / 2 - 0.002; gl2.rotation.y += Math.PI; this.pivot.add(gl2);
    }
    this.angle = 0; this.target = 0; this.speed = 2.2;
    this.openAngle = (o.swing || 1) * (o.openAngle || 1.75) * hinge * (o.axis === 'z' ? -1 : 1);
    this.locked = !!o.locked; this.sticky = o.sticky || 0;
    const y0 = o.y || 0;
    this.col = o.axis === 'z' ? Phys.addC(o.x, o.z, 0.12, w, y0, y0 + h, { tag: 'door' }) : Phys.addC(o.x, o.z, w, 0.12, y0, y0 + h, { tag: 'door' });
    this.pos = new THREE.Vector3(o.x, y0 + 1.2, o.z);
    this.isOpen = false;
    L.doors.push(this);
    L.rayTargets.push(this.panel);
    if (o.interact !== false) {
      Interact.add(this.panel, {
        prompt: () => this.locked ? (o.lockedPrompt || 'Locked') : (this.isOpen ? 'Close' : 'Open') + (o.label ? ' ' + o.label : ''),
        use: () => this.use(),
        enabled: () => o.usable ? o.usable() : true,
      });
    }
  }
  use() {
    if (this.o.onUse && this.o.onUse(this) === false) return;
    if (this.locked) { SND.sfx('doorLocked', { pos: this.pos }); if (this.o.onLocked) this.o.onLocked(this); return; }
    if (!this.isOpen && this.sticky > 0) { this.sticky--; SND.sfx('doorStuck', { pos: this.pos }); Engine.shake(0.02, 0.2); if (this.o.onStuck) this.o.onStuck(this); return; }
    this.isOpen ? this.close() : this.open();
  }
  open(frac = 1, speed = 2.2, silent = false) {
    this.target = this.openAngle * frac; this.speed = speed; this.isOpen = frac > 0.05;
    if (!silent) SND.sfx('doorOpen', { pos: this.pos, creak: this.o.creak !== false, creakAmt: this.o.creakAmt || 1 });
    if (this.isOpen) this.col.on = false;
    Bus.emit('noise', this.pos.x, this.pos.z, 7, 'door');
  }
  close(silent = false, slam = false) {
    this.target = 0; this.speed = slam ? 8 : 2.6; this._closing = true; this._slam = slam; this.isOpen = false; this._silent = silent;
  }
  set(angleFrac) { this.angle = this.target = this.openAngle * angleFrac; this.pivot.rotation.y = this.angle; this.isOpen = angleFrac > 0.05; this.col.on = !this.isOpen; }
  update(dt) {
    if (Math.abs(this.angle - this.target) > 0.0005) {
      const s = Math.sign(this.target - this.angle) * this.speed * dt;
      if (Math.abs(s) >= Math.abs(this.target - this.angle)) this.angle = this.target; else this.angle += s;
      this.pivot.rotation.y = this.angle;
      if (this._closing && Math.abs(this.angle) < 0.001) {
        this._closing = false; this.col.on = true;
        if (!this._silent) SND.sfx(this._slam ? 'doorSlam' : 'doorClose', { pos: this.pos });
      }
    }
    // don't let a closing door trap the player inside it
    if (this.col.on && G.mode === 'walk' && Player.pos) {
      const c = this.col, p = Player.pos;
      if (p.x > c.minX - 0.25 && p.x < c.maxX + 0.25 && p.z > c.minZ - 0.25 && p.z < c.maxZ + 0.25 && !this.isOpen && this.angle === 0) { /* resolve pushes player out */ }
    }
  }
}
