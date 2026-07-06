// ============================================================================
// NEON BAY · 07_game.js — game orchestrator: loop, audio, wanted, fx, radio, birds, elevator rides, save/load
// Concatenated in order by build.mjs into one module (shared scope, no cross-imports).
// ============================================================================
class Game {
  constructor() {
    const canvas = document.getElementById('gl');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false; this._shadowT = 0; // shadows refreshed ~8x/s, not every frame
    this.scene = new THREE.Scene();
    // exponential haze so distant towers dissolve into the storm (colour matches the night sky)
    this.scene.fog = new THREE.FogExp2(0x0a0e16, 0.009);
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.3, 900);
    this.camera.position.set(0, 6, 18);
    this.renderDist = 185; this._frustum = new THREE.Frustum(); this._m = new THREE.Matrix4(); this._sph = new THREE.Sphere();

    this.sky = makeSky(); this.scene.add(this.sky);
    // PERMANENT STORM NIGHT rig: very low global fill; only local lights (streetlamps, neon, headlights) pick out the world
    this.hemi = new THREE.HemisphereLight(0x2a3550, 0x0c1018, 0.55); this.scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0x141824, 0.34); this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0x9fb2dc, 0.5); this.sun.position.set(-48, 90, -95); this.sun.castShadow = true; // cool moonlight, not a key light
    this.sun.shadow.mapSize.set(1024, 1024); const sc = this.sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 380; this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.fill = new THREE.DirectionalLight(0x6a80c0, 0.12); this.fill.position.set(70, 45, 55); this.scene.add(this.fill);
    // rain field (recycled around the camera) + a dim glow light that sits under the player at night
    this.rain = makeRain(4200); this.scene.add(this.rain.pts); this.rain.pts.visible = false; this.rainAmt = 0; this.camShake = 0; this.timeScale = 1; this._slow = null;
    // puddle-ripple pool: faint ground-aligned rings that spawn on the wet road, expand and fade (rain hitting puddles)
    this.ripples = [];
    for (let i = 0; i < 44; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 18), new THREE.MeshBasicMaterial({ color: 0x9fc0e0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 2; this.scene.add(m); this.ripples.push({ m, life: 0, dur: 1 }); }
    this.nightLamp = new THREE.PointLight(0xffca88, 0, 34, 2); this.scene.add(this.nightLamp);

    this.clock = new THREE.Clock(); this.time = 0; this.playing = false; this.paused = false; this.menuMode = true; this.cine = null;
    this.input = new Input(canvas);
    const unlock = () => this._actx(); addEventListener('pointerdown', unlock); addEventListener('keydown', unlock); // resume the audio context inside a user gesture
    // inject the floating-cash + lens-droplet styling, and build a rain-droplet overlay for the "windshield"
    try { const st = document.createElement('style'); st.textContent = '.moneypop{position:fixed;transform:translate(-50%,0);color:#7fe08a;font:700 22px/1 system-ui,sans-serif;text-shadow:0 2px 8px #000,0 0 14px #2fe07a;pointer-events:none;z-index:60;transition:transform .95s cubic-bezier(.2,.7,.3,1),opacity .95s ease}#lens{position:fixed;inset:0;pointer-events:none;z-index:5;opacity:0;background-size:cover;mix-blend-mode:screen;transition:opacity .8s ease}'; document.head.appendChild(st);
      const lc = document.createElement('canvas'); lc.width = lc.height = 512; const lx = lc.getContext('2d');
      for (let i = 0; i < 90; i++) { const x = Math.random() * 512, y = Math.random() * 512, r = 1 + Math.random() * 4, gr = lx.createRadialGradient(x, y, 0, x, y, r * 2.4); gr.addColorStop(0, 'rgba(178,205,232,' + (0.05 + Math.random() * 0.12) + ')'); gr.addColorStop(1, 'rgba(178,205,232,0)'); lx.fillStyle = gr; lx.beginPath(); lx.arc(x, y, r * 2.4, 0, 7); lx.fill(); }
      this._lens = document.createElement('div'); this._lens.id = 'lens'; this._lens.style.backgroundImage = 'url(' + lc.toDataURL() + ')'; document.body.appendChild(this._lens);
    } catch (e) {}
    this.city = new City(this.scene);
    this.post = new Post(this.renderer, this.scene, this.camera);
    this.post.outline = false; // drop the comic ink edge — going for gritty PBR, not cel outlines
    try { this.reflGround = new ReflectiveGround(this.renderer, this.scene, this.camera, 320); } catch (e) { this.reflGround = null; } // wet-road planar reflection
    this.social = new Social(this); // the living city: names, families, street-level drama
    this.renderer.toneMapping = this.post.enabled ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping; if (!this.post.enabled) this.renderer.toneMappingExposure = 1.1;
    // image-based lighting: a moody env gives PBR reflections on wet asphalt, glass and chrome
    try { const pmrem = new THREE.PMREMGenerator(this.renderer); const envSrc = makeEnvTexture(); const envRT = pmrem.fromEquirectangular(envSrc); this.scene.environment = envRT.texture; envSrc.dispose(); pmrem.dispose(); } catch (e) { console.warn('[env] disabled:', e && e.message); }
    this.ui = new UI(this);

    this.npcs = []; this.cars = []; this.fx = []; this.tracers = []; this.introMode = false;
    try { this.saveData = JSON.parse(localStorage.getItem('nb_save') || 'null'); } catch (e) { this.saveData = null; }
    this.player = new Player(this);
    this.story = new Story(this);
    for (let i = 0; i < 8; i++) this.spawnPed(); for (let i = 0; i < 5; i++) this.spawnTraffic(); // ambient life for the menu / intro
    for (const sp of (this.city.mallParking || [])) { const pc = new Car(this, sp.x, sp.z, new THREE.Vector3(0, 0, 1), pick(CAR_COLORS), false); pc.ai = false; pc.parked = true; pc.yaw = sp.yaw; pc.root.rotation.y = sp.yaw; if (pc._spill) pc._spill.visible = false; if (pc._rear) pc._rear.visible = false; const dv = pc.root.userData.driver; if (dv) dv.visible = false; this.cars.push(pc); } // shoppers' cars in the Galleria lot

    addEventListener('resize', () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); this.post.setSize(); });
    canvas.addEventListener('mousedown', () => { if (this.playing && !this.paused && !this.ui.modal && !this.input.locked) this.input.lock(); });
    this.input.onLock = (l) => { if (!l && this.playing && !this.paused && !this.ui.modal) this.pause(); };

    window.GAME = this;
    this.ui.title(); this.loop();
  }
  start() {
    this.playing = true; this.paused = false; this.menuMode = false; this.ui.modal = null; this.ui.hideTitle();
    this.player.root.visible = true; this.player.spawn();
    for (let i = 0; i < 22; i++) this.spawnPed(true);
    for (let i = 0; i < 16; i++) this.spawnTraffic();
    let dancers = 0; for (const club of this.city.clubs) for (const d of club.dance) { if (dancers++ >= 6) break; const ped = new Ped(this, d.x, d.z, false, { dance: true }); ped.story = true; this.npcs.push(ped); }
    for (const v of this.city.vendors) { const ped = new Ped(this, v.x, v.z - 1.4, false, { vendor: true, yaw: 0 }); ped.story = true; this.npcs.push(ped); }   // shopkeepers behind the carts
    for (let i = 0; i < 8; i++) { const [lx, lz] = this.city.snapSidewalk(rnd(-this.city.size / 2 + 20, this.city.size / 2 - 20), rnd(-this.city.size / 2 + 20, this.city.size / 2 - 20)); const ped = new Ped(this, lx, lz, false, { loiter: true, yaw: rnd(TAU) }); ped.story = true; this.npcs.push(ped); }   // loiterers sitting around
    for (const camp of (this.city.camps || [])) for (let i = 0; i < 4; i++) { const ped = new Ped(this, camp.x + rnd(-camp.r, camp.r), camp.z + rnd(-camp.r, camp.r), false, { homeless: true, yaw: rnd(TAU) }); ped.story = true; this.npcs.push(ped); }   // camp residents
    for (let i = 0; i < 5; i++) { const [hx, hz] = this.city.snapSidewalk(rnd(-this.city.size / 2 + 16, this.city.size / 2 - 16), rnd(-this.city.size / 2 + 16, this.city.size / 2 - 16)); const ped = new Ped(this, hx, hz, false, { homeless: true, yaw: rnd(TAU) }); ped.story = true; this.npcs.push(ped); }   // scattered homeless on sidewalks
    for (const b of (this.city.beachSpots || []).slice(0, 5)) { const ped = new Ped(this, b.x, b.z, false, { loiter: true, ambient: 'sit', yaw: rnd(TAU) }); ped.story = true; this.npcs.push(ped); }   // sunbathers on the towels
    // boats in the bay + off the beach (mid-block, clear of the causeways)
    const bx = (this.city.bayX0 + this.city.bayX1) / 2;
    for (let i = 0; i < 4; i++) this.cars.push(new Boat(this, bx + rnd(-5, 5), -this.city.size / 2 + 33 + i * 132));
    for (let i = 0; i < 2; i++) this.cars.push(new Boat(this, this.city.size / 2 + 115, -70 + i * 150));
    if (this.city.marina) this.cars.push(new Boat(this, this.city.marina.x + 4, this.city.marina.z)); // slip rental at Bayside
    this.story.begin(); this.input.lock();
    if (this.saveData) {
      this.player.money = this.saveData.money != null ? this.saveData.money : this.player.money; this.player.hasGun = !!this.saveData.gun; if (this.player.hasGun) this.player.weapon = 'pistol';
      if (this.saveData.fatigue != null) this.player.fatigue = this.saveData.fatigue; if (this.saveData.t != null) this.time = this.saveData.t;
      for (const i of (this.saveData.own || [])) { const rec = this.city.shops[i]; if (rec && PROP[rec.type]) { rec.owned = true; if (rec.strip) { rec.strip.material.color.set(0x2fe07a); rec.strip.material.emissive.set(0x2fe07a); } } }
    }
  }
  spawnPed(cluster) {
    const c = this.city; let x, z, tr = 0;
    do { const a = rnd(TAU), r = rnd(22, 110); x = this.player.pos.x + Math.cos(a) * r; z = this.player.pos.z + Math.sin(a) * r; [x, z] = c.snapSidewalk(x, z); tr++; } while ((c.inBay(x, z) || x > c.size / 2 + 4) && tr < 12);
    const lim = c.size / 2 + 20; x = clamp(x, -lim, lim); z = clamp(z, -lim, lim);
    const n = new Ped(this, x, z); this.npcs.push(n);
    if (cluster && Math.random() < 0.5) { const k = 1 + (Math.random() * 2 | 0); for (let i = 0; i < k; i++) { const c2 = new Ped(this, x + rnd(-2.4, 2.4), z + rnd(-2.4, 2.4)); c2.pdir = n.pdir; this.npcs.push(c2); } }   // walk in little crowds
    return n;
  }
  spawnTraffic() {
    const c = this.city, net = c.net, p = this.player;
    // spawn on the lane graph: a node in a ring around the player, heading out along one of its edges
    let node = null;
    for (let t = 0; t < 12; t++) { const n = net.nodes[(Math.random() * net.nodes.length) | 0]; const d = Math.hypot(n.position.x - p.pos.x, n.position.z - p.pos.z); if (d > 55 && d < 150 && n.edges.length) { node = n; break; } }
    if (!node) { const nn = net.nodes[c.nearestNode(p.pos.x, p.pos.z)]; node = nn && nn.edges.length ? nn : null; }
    if (!node) return null;
    const eid = node.edges[(Math.random() * node.edges.length) | 0], e = net.edges[eid], other = e.a === node.id ? e.b : e.a, op = net.nodes[other].position;
    const fwd = op.clone().sub(node.position).normalize(), right = new THREE.Vector3(fwd.z, 0, -fwd.x), lane = Math.max(1.6, ROAD_CLASS[e.class].width * 0.22);
    const sp = node.position.clone().addScaledVector(fwd, 4).addScaledVector(right, lane);
    // traffic mix: mostly sedans, a slice of motorcycles, the odd city bus on the bigger roads
    const kr = Math.random(), bigRoad = e.class !== 'alley' && e.class !== 'residential';
    const kind = (kr < 0.12 && bigRoad) ? 'bus' : kr < 0.26 ? 'bike' : null;
    const car = new Car(this, sp.x, sp.z, new THREE.Vector3(fwd.x, 0, fwd.z), kind === 'bus' ? pick([0x2a5a8a, 0x3a6a4a, 0x7a3a3a]) : pick(CAR_COLORS), true, kind);
    car.fromN = node.id; car.toN = other; car.edgeId = eid; car.edgeClass = e.class; car.along = 4; car.cruise = Math.min(ROAD_CLASS[e.class].speed, 20);
    this.cars.push(car); return car;
  }
  addTracer(a, b, color) { const geo = new THREE.BufferGeometry().setFromPoints([a, b]); const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true })); this.scene.add(line); this.tracers.push({ line, life: 0.06 }); }
  hitFx(pos, color, n = 12) {
    const g = new THREE.BufferGeometry(), ps = new Float32Array(n * 3), vs = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { ps[i * 3] = pos.x; ps[i * 3 + 1] = pos.y; ps[i * 3 + 2] = pos.z; vs[i * 3] = rnd(-4, 4); vs[i * 3 + 1] = rnd(1, 6); vs[i * 3 + 2] = rnd(-4, 4); }
    g.setAttribute('position', new THREE.BufferAttribute(ps, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.2, transparent: true })); this.scene.add(m); this.fx.push({ m, g, ps, vs, n, life: 0.6 });
  }
  nearestCar(pos, r) { let best = null, bd = r; for (const c of this.cars) { if (c.driver) continue; const d = c.pos.distanceTo(pos); if (d < bd) { bd = d; best = c; } } return best; }
  // cars are solid: walkers get pushed out of every hull (oriented box in the car's frame)
  pushOutOfCars(px, pz, radius) {
    for (const c of this.cars) {
      if (c.boat) continue; const dx = px - c.pos.x, dz = pz - c.pos.z;
      if (dx * dx + dz * dz > (c.kind === 'bus' ? 60 : 36)) continue;
      const cos = Math.cos(c.yaw), sin = Math.sin(c.yaw);
      const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
      const hw = (c.kind === 'monster' ? 1.55 : c.kind === 'bus' ? 1.5 : c.kind === 'bike' ? 0.5 : 1.25) + radius, hd = (c.kind === 'monster' ? 2.5 : c.kind === 'bus' ? 4.9 : c.kind === 'bike' ? 1.2 : 2.55) + radius;
      if (Math.abs(lx) < hw && Math.abs(lz) < hd) {
        const ox = hw - Math.abs(lx), oz = hd - Math.abs(lz);
        let nlx = lx, nlz = lz;
        if (ox < oz) nlx = Math.sign(lx || 1) * hw; else nlz = Math.sign(lz || 1) * hd;
        px = c.pos.x + nlx * cos + nlz * sin; pz = c.pos.z - nlx * sin + nlz * cos;
      }
    }
    return [px, pz];
  }
  addWanted(n) { const p = this.player; const was = p.wanted; p.wanted = Math.min(5, p.wanted + n); p.heat = Math.max(p.heat, 12 + p.wanted * 6); if (was === 0 && p.wanted > 0) this.responseT = rnd(7, 12); } // dispatch takes time to arrive
  _nearestTalkable() { const p = this.player; let best = null, bd = 2.6; for (const n of this.npcs) { if (n.dead || n.cop || n.enemy || n.socialRole || !n.person) continue; const d = n.pos.distanceTo(p.pos); if (d < bd) { bd = d; best = n; } } return best; }
  // ride a tower elevator to the lobby, any storey (furnished on demand), or the roof
  rideElevator(el, f) {
    const p = this.player, c = this.city; this.sfxChime();
    if (f === 0) { p.floorBase = null; p.pos.set(el.cx, 0, el.cz - el.d / 2 + 1.8); p.vy = 0; this.ui.toast('🛗 Ground floor'); }
    else if (f === 'roof') { p.floorBase = { x: el.cx, z: el.cz, hw: el.w / 2 - 0.4, hd: el.d / 2 - 0.4, y: el.hTop + 0.25 }; p.pos.set(el.cx, el.hTop + 0.25, el.cz); p.vy = 0; this.ui.toast('🛗 Roof — watch the wind (and the edge)'); }
    else { const room = c.floorRoom(el, f); p.floorBase = { x: el.cx, z: el.cz, hw: el.w / 2 - 0.7, hd: el.d / 2 - 0.7, y: room.y }; p.pos.set(el.cx, room.y, el.cz - el.d / 2 + 2.2); p.vy = 0; this.ui.toast('🛗 Floor ' + f); }
    p.root.position.copy(p.pos);
  }
  // ---- witness system: crimes only count if someone actually SAW (or heard) them ----
  reportCrime(pos, sev, opts) {
    opts = opts || {};
    let seen = false;
    for (const n of this.npcs) { if (n.dead) continue; const d = n.pos.distanceTo(pos); if (n.cop && d < 45) { seen = true; break; } if (!n.cop && d < (opts.loud ? 55 : 22)) { seen = true; break; } }
    if (!seen) { if (opts.quiet !== true) this.ui.toast('Nobody saw that...'); return false; }
    this.addWanted(sev); return true;
  }
  sfxGun() { const ac = this._actx(); if (!ac) return; try { const t = ac.currentTime; const n = (ac.sampleRate * 0.12) | 0, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); const s = ac.createBufferSource(); s.buffer = buf; const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500; const g = ac.createGain(); g.gain.value = 0.32; s.connect(hp); hp.connect(g); g.connect(ac.destination); s.start(t); const o = ac.createOscillator(); o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.1); const og = ac.createGain(); og.gain.setValueAtTime(0.3, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.12); o.connect(og); og.connect(ac.destination); o.start(t); o.stop(t + 0.12); } catch (e) {} }
  muzzleFlash(origin, dir) {
    const pos = origin.clone().addScaledVector(dir, 0.9);
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xfff2c0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })); m.position.copy(pos); m.scale.setScalar(1.4); this.scene.add(m); this.fx.push({ m, life: 0.07, muzzle: true });
    const l = new THREE.PointLight(0xffe6a0, 6, 14, 2); l.position.copy(pos); this.scene.add(l); this.fx.push({ flash: l, life: 0.07 });
    this.camShake = Math.max(this.camShake || 0, 0.28); this.sfxGun(); this.scareBirds();
  }
  shootRay(origin, dir, dmg, range) {
    this.muzzleFlash(origin, dir);
    let bestT = range, victim = null, hitCar = null;
    for (const n of this.npcs) { if (n.dead) continue; const t = raySphere(origin, dir, n.pos.clone().setY(n.pos.y + 1.0), 0.7); if (t != null && t < bestT) { bestT = t; victim = n; hitCar = null; } }
    for (const c of this.cars) { if (c.boat || c === this.player.inCar) continue; const t = raySphere(origin, dir, c.pos.clone().setY(1.0), 1.6); if (t != null && t < bestT) { bestT = t; hitCar = c; victim = null; } }
    const end = origin.clone().addScaledVector(dir, Math.min(bestT, range));
    if (victim) { victim.damage(dmg, dir); this.hitFx(end, 0xff5050, 10); if (!victim.cop) this.reportCrime(origin, 2, { loud: true, quiet: true }); } // gunshots echo — anyone in a block hears
    else if (hitCar) { hitCar.hp = (hitCar.hp == null ? 120 : hitCar.hp) - dmg * 1.4; this.hitFx(end, 0xffd27a, 8); if (hitCar.hp <= 0 && !hitCar._boom) { hitCar._boom = true; this.explode(hitCar.pos.clone().setY(1.0), 1.15, hitCar.color); hitCar.removeMe = true; if (hitCar.driver === this.player) { this.player.inCar = null; this.player.root.visible = true; } } }
    this.player.gunOutT = 4;
    for (const n of this.npcs) if (!n.dead && n.scare && n.pos.distanceTo(origin) < 22) n.scare(5); // bystanders duck for cover
    this.addTracer(origin.clone().addScaledVector(dir, 1.2), end, 0xffe98a); return victim;
  }
  startCutscene(other) {
    if (!other) return; const p = this.player, d = new THREE.Vector3().subVectors(other.pos, p.pos); d.y = 0;
    if (d.length() > 0.1) { d.normalize(); p.pos.copy(other.pos).addScaledVector(d, -2.7); p.pos.y = 0; p.root.position.copy(p.pos); p.yaw = Math.atan2(d.x, d.z); other.yaw = Math.atan2(-d.x, -d.z); }
    this.cine = { other, t: 0, side: Math.random() < 0.5 ? 1 : -1 }; this.ui.letterbox(true);
  }
  endCutscene() { this.cine = null; this.ui.letterbox(false); }
  updateCutscene(dt) {
    const c = this.cine; if (!c) return; c.t += dt; const p = this.player, o = c.other;
    const idx = this.ui._dlg ? this.ui._dlg.i : 0;
    const speaker = (this.ui._dlg && this.ui._dlg.lines[idx]) ? this.ui._dlg.lines[idx][0] : null, pTalk = speaker === 'you';
    if (idx !== c._idx) { c._idx = idx; c._t0 = c.t; } // fresh cut on each new line
    p.fig.update(dt, { state: pTalk ? 'talk' : 'idle' }); p.root.rotation.y = p.yaw; p.root.position.copy(p.pos);
    o.fig.update(dt, { state: pTalk ? 'idle' : 'talk' }); o.root.rotation.y = o.yaw; o.root.position.copy(o.pos);
    // shot / reverse-shot: over the listener's shoulder, framing the speaker's face
    const spk = pTalk ? p : o, lis = pTalk ? o : p;
    const dir = new THREE.Vector3().subVectors(spk.pos, lis.pos); dir.y = 0; if (dir.lengthSq() < 0.01) dir.set(0, 0, 1); dir.normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(pTalk ? 1.05 : -1.05);
    const slow = Math.sin((c.t - (c._t0 || 0)) * 0.5) * 0.25;
    const camPos = lis.pos.clone().addScaledVector(dir, -1.5).add(side).add(new THREE.Vector3(0, 1.62 + slow * 0.1, 0)).addScaledVector(dir, slow);
    const look = new THREE.Vector3(spk.pos.x, 1.55, spk.pos.z);
    this.camera.position.lerp(camPos, Math.min(1, dt * 5) || 1); this.camera.lookAt(look);
    for (const n of this.npcs) if (!n.dead && n !== o && n.pos.distanceTo(p.pos) < 55) n.animateIdle(dt);
  }
  pause() { if (!this.playing || this.paused) return; this.paused = true; this.input.unlock(); this.ui.pauseMenu(true); }
  resume() { this.paused = false; this.ui.pauseMenu(false); this.input.lock(); }
  menuCam() { const t = this.time * 0.14, r = 118 + Math.sin(t * 0.5) * 48; this.camera.position.set(Math.cos(t) * r, 34 + Math.sin(t * 0.37) * 24, Math.sin(t) * r); this.camera.lookAt(Math.sin(t * 0.3) * 24, 16, Math.cos(t * 0.3) * 24); }
  // ---- day / night cycle (blends day -> dusk -> night palettes) ----
  updateDayNight() {
    // PERMANENT STORM NIGHT — the sky never brightens. The clock still advances (phone time + work shifts),
    // but the lighting, sky and grade are locked to a rain-soaked, neon-lit night.
    const phase = (this.time / 300) % 1;
    this.hour = (phase * 24 + 12) % 24; this.dayAmt = 0;
    const u = this.sky.children[0].material.uniforms;
    u.top.value.set(0x05060a); u.mid.value.set(0x080a12); u.hor.value.set(0x0d1018); u.bot.value.set(0x07090f);
    this.sun.intensity = 0.5; this.sun.color.set(0x9fb2dc);             // cool moonlight — enough shape to read the world
    this.hemi.intensity = 0.55; this.hemi.color.set(0x2a3550); this.hemi.groundColor.set(0x0c1018);
    if (this.ambient) this.ambient.intensity = 0.34;
    this.scene.fog.color.set(0x0a0e16); this.scene.fog.density = 0.009; // exponential haze — distant towers fade but the skyline still reads
    // crank the neon bloom, wet-shine the asphalt, keep exposure filmic but not pitch-black
    if (this.post && this.post.enabled) { this.post.compMat.uniforms.strength.value = 1.25; this.post.brightMat.uniforms.threshold.value = 0.7; this.post.compMat.uniforms.exposure.value = 1.08; }
    if (this.city.roadMat) this.city.roadMat.emissiveIntensity = 3.2;    // rain-slicked reflectivity
    // PERSISTENT DOWNPOUR
    this.rainAmt = 1; if (this.rain) { this.rain.pts.visible = this.playing; this.rain.mat.opacity = 0.6; }
    if (this.nightLamp && this.player && this.player.pos) { this.nightLamp.position.set(this.player.pos.x, 3.2, this.player.pos.z); this.nightLamp.intensity = 2.6; }
  }
  // ---- property / economy layer: buy venues (B), they pay out every minute ----
  buyProperty() {
    const p = this.player;
    // dealership display cars first
    for (const d of (this.city.displays || [])) {
      if (Math.hypot(p.pos.x - d.x, p.pos.z - d.z) > 7) continue;
      if (p.money < d.price) { this.ui.toast(d.label + ' costs $' + d.price); return; }
      p.money -= d.price; const car = new Car(this, d.x + 10, d.z + 10, new THREE.Vector3(0, 0, 1), d.color, false, d.kind); car.ai = false; this.cars.push(car);
      this.ui.toast('★ Bought the ' + d.label + ' (-$' + d.price + ') — it\'s parked beside the pad'); return;
    }
    for (const rec of this.city.shops) {
      if (Math.abs(p.pos.x - rec.x) > (rec.w || 20) / 2 + 4 || Math.abs(p.pos.z - rec.z) > (rec.d || 20) / 2 + 4) continue;
      const deal = PROP[rec.type]; if (!deal) { this.ui.toast('Not for sale'); return; }
      if (rec.owned) { this.ui.toast(rec.name + ' is yours — pays $' + deal.rate + '/min'); return; }
      if (p.money < deal.cost) { this.ui.toast(rec.name + ' costs $' + deal.cost); return; }
      p.money -= deal.cost; rec.owned = true;
      if (rec.strip) { rec.strip.material.color.set(0x2fe07a); rec.strip.material.emissive.set(0x2fe07a); }
      this.ui.toast('★ Bought ' + rec.name + ' (-$' + deal.cost + ') — earns $' + deal.rate + '/min');
      this.saveGame(); return;
    }
    this.ui.toast('Stand inside a venue to buy it');
  }
  updateIncome(dt) {
    this.incomeT = (this.incomeT || 0) + dt; if (this.incomeT < 60) return;
    this.incomeT -= 60; let sum = 0; for (const rec of this.city.shops) if (rec.owned && PROP[rec.type]) sum += PROP[rec.type].rate;
    if (sum > 0) { this.player.money += sum; this.ui.toast('Properties paid out +$' + sum); }
    const stip = this.social ? this.social.spouseStipend() : 0; if (stip > 0) this.ui.toast('❤️ Household income +$' + stip);
  }
  // ---- day shifts: clerks clock in behind their counters in the morning and walk off at night ----
  updateWorkers(dt) {
    this._wkT = (this._wkT || 0) - dt; if (this._wkT > 0) return; this._wkT = 0.8;
    const onShift = this.hour >= 8 && this.hour < 21, p = this.player;
    let active = 0; for (const w of this.city.workposts) if (w.ped && !w.ped.dead) active++;
    for (const w of this.city.workposts) {
      const d = Math.hypot(w.x - p.pos.x, w.z - p.pos.z);
      if (!w.ped) {
        if (onShift && d < 100 && d > 14 && active < 12) { const ped = new Ped(this, w.x, w.z, false, { worker: true, yaw: w.yaw || 0 }); ped.story = true; w.ped = ped; this.npcs.push(ped); active++; }
      } else if (w.ped.dead || w.ped.removeMe) w.ped = null;
      else if (!onShift) { w.ped.story = false; w.ped.worker = false; w.ped.loiter = false; w.ped = null; } // clock out — they wander home like anyone else
      else if (d > 150) { w.ped.removeMe = true; w.ped = null; }
    }
  }
  // ---- traffic-signal cycle: phase-group A green ↔ group B green, with a yellow grace window ----
  // each network intersection splits its incident roads into groups 0/1 (by angle); cars whose
  // approach edge is in the red group hold at the stop line.
  updateTraffic(dt) {
    const HALF = 12, YELLOW = 2.6, CYCLE = HALF * 2;
    const c = this.city; if (!c.sigMatA) return;
    const t = (this.time % CYCLE), phase = t < HALF ? 0 : 1, slotLeft = (phase === 0 ? HALF : CYCLE) - t;
    const greenA = phase === 0, greenB = phase === 1;
    this.trafficRedA = !greenA || slotLeft < YELLOW;
    this.trafficRedB = !greenB || slotLeft < YELLOW;
    if (phase !== this._trafPhase) {
      this._trafPhase = phase;
      c.sigMatA.emissive.set(greenA ? 0x2fe06a : 0xff3a2a); c.sigMatA.color.set(greenA ? 0x114018 : 0x401111);
      c.sigMatB.emissive.set(greenB ? 0x2fe06a : 0xff3a2a); c.sigMatB.color.set(greenB ? 0x114018 : 0x401111);
    }
    if (slotLeft < YELLOW) { const amber = 0xffb020, on = Math.sin(this.time * 8) > 0; (greenA ? c.sigMatA : c.sigMatB).emissive.set(on ? amber : 0x201200); }
  }
  // ---- phone GPS: a cyan beam you can drop on any pin from the phone ----
  setGps(name, pt) {
    this.gps = { name, x: pt.x, z: pt.z };
    if (!this.gpsMarker) { this.gpsMarker = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 95, 12), new THREE.MeshBasicMaterial({ color: 0x2fe6ff, transparent: true, opacity: 0.25, depthWrite: false })); this.scene.add(this.gpsMarker); }
    this.gpsMarker.position.set(pt.x, 48, pt.z); this.gpsMarker.visible = true;
  }
  clearGps() { this.gps = null; if (this.gpsMarker) this.gpsMarker.visible = false; }
  updateGps() { if (!this.gps) return; const p = this.player; if (Math.hypot(p.pos.x - this.gps.x, p.pos.z - this.gps.z) < 10) { this.ui.toast('GPS — you have arrived: ' + this.gps.name); this.clearGps(); } }
  // ---- floating waypoint chevron: 3D target projected to 2D, edge-clamped when off-screen, live metres ----
  updateWaypoint(dt) {
    const el = this.ui.el.chevron; if (!el) return;
    let tx, tz, name = '';
    if (this.gps) { tx = this.gps.x; tz = this.gps.z; name = this.gps.name; }
    else if (this.story && this.story.marker && this.story.marker.visible) { tx = this.story.marker.position.x; tz = this.story.marker.position.z; }
    else { el.style.display = 'none'; return; }
    el.style.display = 'block';
    const target = new THREE.Vector3(tx, 1.4, tz), cam = this.camera;
    const dist = Math.round(this.player.pos.distanceTo(target));
    const camDir = new THREE.Vector3(); cam.getWorldDirection(camDir);
    const behind = camDir.dot(target.clone().sub(cam.position)) < 0;
    const v = target.clone().project(cam), w = innerWidth, h = innerHeight;
    const arrow = el.querySelector('.chv-arrow');
    let sx, sy, onScreen = !behind && v.z < 1 && Math.abs(v.x) < 0.96 && Math.abs(v.y) < 0.96;
    if (onScreen) {
      sx = (v.x * 0.5 + 0.5) * w; sy = (-v.y * 0.5 + 0.5) * h + Math.sin(this.time * 3) * 7;
      arrow.style.transform = 'rotate(90deg)'; // point straight down at the spot
    } else {
      let ndx = v.x, ndy = v.y; if (behind) { ndx = -ndx; ndy = -ndy; }
      const dirx = ndx, diry = -ndy, cx = w / 2, cy = h / 2, insX = w / 2 * 0.86, insY = h / 2 * 0.86;
      const s = Math.min(insX / Math.max(Math.abs(dirx), 1e-3), insY / Math.max(Math.abs(diry), 1e-3));
      sx = cx + dirx * s; sy = cy + diry * s;
      arrow.style.transform = 'rotate(' + Math.atan2(diry, dirx) + 'rad)'; // point toward the off-screen target
    }
    el.style.left = clamp(sx, 26, w - 26) + 'px'; el.style.top = clamp(sy, 54, h - 70) + 'px';
    el.querySelector('.chv-dist').textContent = dist + 'm';
  }
  // ---- free roam: no script, spawn at your place with wheels in the driveway ----
  startFreeRoam() {
    this.story.freeRoam = true;
    const H = this.city.places.home; this.player.spawnPos = { x: H.x, z: H.z + 8.5 };
    if (!this.saveData) this.player.money = 600;
    this.start();
    const car = new Car(this, H.x + 7, H.z + 12, new THREE.Vector3(0, 0, 1), 0x9b5cff, false); car.ai = false; this.cars.push(car);
    this.ui.bigCard('FREE ROAM', 'No missions, no script — the whole island, your rules.');
  }
  // ---- E interactions: rob registers, eat at diners, taxi fast-travel ----
  interact() {
    const p = this.player;
    // sleep at home takes priority over any overlapping venue you might be standing in
    if (!p.inCar) { const H = this.city.places.home; if (H && Math.hypot(p.pos.x - H.x, p.pos.z - H.z) < 6.5) {
      if (p.wanted > 0) { this.ui.toast("Can't sleep with the law outside — lose the heat first"); return; }
      p.health = p.maxHealth; p.fatigue = 0; const ph = (this.time / 300) % 1; this.time += ((20 / 24 - ph + 1) % 1) * 300;
      this.saveGame(); this.ui.bigCard('HOME SWEET HOME', 'Slept it off — health full, well-rested, game saved'); return; } }
    if (!p.inCar) { const elv = this.city.nearElevator(p.pos); if (elv) { this.ui.elevatorMenu(elv); return; } } // ride the tower elevator
    if (!p.inCar && p.weapon !== 'pistol') { const t = this._nearestTalkable(); if (t) { this.ui.socialMenu(t); return; } } // talk to whoever you're facing
    if (p.inCar) { // spray shop: repaint your ride
      const sp = this.city.sprayPad;
      if (sp && Math.hypot(p.pos.x - sp.x, p.pos.z - sp.z) < 7 && !p.inCar.boat) {
        if (p.money >= 200) { p.money -= 200; p.inCar.repaint(pick(CAR_COLORS)); this.ui.toast('Fresh coat of paint (-$200)'); }
        else this.ui.toast('Respray costs $200');
      }
      return;
    }
    for (const rec of this.city.shops) {
      if (Math.abs(p.pos.x - rec.x) > (rec.w || 20) / 2 || Math.abs(p.pos.z - rec.z) > (rec.d || 20) / 2) continue;
      if (rec.type === 'gunshop') { // legal-carry island: the counter sells to anyone with the cash
        if (!p.hasGun) { if (p.money >= 250) { p.money -= 250; p.hasGun = true; p.weapon = 'pistol'; this.saveGame(); this.ui.toast('★ Pistol bought (-$250) — press 2 to draw, 1 to holster'); } else this.ui.toast('AMMU-BAY: the pistol runs $250'); }
        else this.ui.toast('AMMU-BAY: rounds are on the house — come again');
        return;
      }
      if (rec.type === 'bank') {
        if (!p.hasGun) { this.ui.toast('Bay Mutual: tellers only argue with a drawn pistol'); return; }
        const st = this.story, cur = st.state === 'steps' && MISSIONS[st.mi] && MISSIONS[st.mi].steps[st.si];
        if (rec.robT && this.time < rec.robT && !(cur && cur.type === 'rob')) { this.ui.toast('The vault is sealed tight — give it time'); return; }
        rec.robT = this.time + 600; this.lastBankRobT = this.time; const take = 600 + (Math.random() * 500 | 0); p.money += take; p.gunOutT = 6; this.addWanted(4);
        for (const n of this.npcs) if (!n.dead && n.scare && n.pos.distanceTo(p.pos) < 30) n.scare(8);
        this.ui.news('BAY MUTUAL HIT — masked robber empties the counter drawers in broad daylight');
        this.ui.toast('VAULT CASH +$' + take + ' — RUN'); return;
      }
      if (rec.type === 'home') {
        if (p.wanted > 0) { this.ui.toast("Can't sleep with the law outside — lose the heat first"); return; }
        p.health = p.maxHealth; p.fatigue = 0; const ph = (this.time / 300) % 1; this.time += ((20 / 24 - ph + 1) % 1) * 300; // fast-forward to 8 AM
        this.saveGame(); this.ui.bigCard('HOME SWEET HOME', 'Slept it off — health full, well-rested, game saved'); return;
      }
      if (rec.type === 'diner' && p.money >= 10) { p.money -= 10; p.health = p.maxHealth; this.ui.toast('Hot meal — HP restored (-$10)'); return; }
      if (rec.type !== 'tower' && (!rec.robT || this.time > rec.robT)) {
        rec.robT = this.time + 200; const take = 40 + (Math.random() * 90 | 0); p.money += take; this.addWanted(2);
        for (const n of this.npcs) if (!n.dead && n.scare && n.pos.distanceTo(p.pos) < 24) n.scare(6);
        this.ui.toast('Register robbed +$' + take); return;
      }
      if (rec.type === 'tower') { this.ui.toast('Lobby — nothing to take here'); return; }
      this.ui.toast('Register already emptied'); return;
    }
    // taxi fast-travel to the current objective
    for (const c of this.cars) { if (!c.taxi || c.driver) continue; if (c.pos.distanceTo(p.pos) > 5) continue;
      if (!this.story.marker || !this.story.marker.visible) { this.ui.toast('Taxi: no destination right now'); return; }
      if (p.money < 50) { this.ui.toast('Taxi: need $50'); return; }
      p.money -= 50; const m = this.story.marker.position; p.pos.set(m.x + 4, 0, m.z + 4); p.root.position.copy(p.pos); this.ui.toast('Taxi ride -$50'); return; }
  }
  updatePickups(dt) {
    for (const pk of this.city.packages) { if (pk.got) continue; pk.m.rotation.y += dt * 2.2; pk.m.position.y = 0.5 + Math.sin(this.time * 2.4 + pk.x) * 0.12;
      if (Math.hypot(this.player.pos.x - pk.x, this.player.pos.z - pk.z) < 1.4) { pk.got = true; pk.m.visible = false; this.player.money += 150; const got = this.city.packages.filter(q => q.got).length; this.hitFx(pk.m.position, 0x4dff9e, 10); this.moneyPop(150, pk.m.position); this.ui.toast('Hidden package ' + got + '/12'); } }
    const bc = this.city.briefcase;
    if (bc && !bc.got) { bc.m.rotation.y += dt * 1.6; if (Math.hypot(this.player.pos.x - bc.x, this.player.pos.z - bc.z) < 2.2) { bc.got = true; bc.m.visible = false; this.player.money += 1000; this.hitFx(bc.m.position, 0xffd23a, 16); this.ui.toast('Isla Privada stash +$1000'); } }
  }
  copBark(cop, dist) {
    this._barkT = this._barkT || 0; if (this.time < this._barkT || dist > 26) return; this._barkT = this.time + 4.5;
    const p = this.player;
    const line = p.inCar ? pick(['"PULL OVER — engine off, keys out!"', '"Step OUT of the vehicle!"']) :
      (p.gunOutT > 0 ? '"Drop the weapon — NOW!"' : p.wanted >= 3 ? pick(['"On the ground! It\'s over!"', '"Stop running!"']) : pick(['"Break it up! Break it up!"', '"Hands where I can see them."', '"Any weapons on you? Keep \'em down."', '"That\'s far enough, pal."']));
    this.ui.toast(line);
  }
  carShield(dmg) { // you can't be shot through the body panels — only unlucky window hits land
    if (!this.player.inCar) return dmg;
    if (Math.random() < 0.68) { this.hitFx(this.player.inCar.pos.clone().setY(1.0), 0xffe27a, 5); return 0; } // spark off the panel
    return dmg * 0.5; // through the glass
  }
  updateArrest(dt) {
    const p = this.player; if (p.dead || this.jailed || p.cuffT > 0) { this._bustT = 0; return; }
    // TAZED: drawing/firing your gun while a cop is on you (below 5 stars) = instant ride downtown
    if (p.wanted > 0 && p.wanted < 5 && p.gunOutT > 0 && !p.inCar && p.tazedT <= 0) {
      for (const n of this.npcs) if (n.cop && !n.dead && n.pos.distanceTo(p.pos) < 12) {
        p.tazedT = 1.8; this.addTracer(n.pos.clone().setY(1.4), p.eye(), 0xfff23a); this.ui.toast('"TASER! TASER!"'); break;
      }
    }
    // RESTRAINED: two officers on top of you (on foot) and it's cuffs
    if (p.wanted > 0 && !p.inCar && p.tazedT <= 0) {
      let near = 0; for (const n of this.npcs) if (n.cop && !n.dead && n.pos.distanceTo(p.pos) < 2.3) near++;
      this._bustT = near >= 2 ? (this._bustT || 0) + dt : 0;
      if (this._bustT > 1.0 && p.cuffT <= 0) { p.cuffT = 1.7; this._arrestWhy = 'Restrained and cuffed'; this.ui.toast('"Hands behind your back!"'); this._bustT = 0; }
    } else this._bustT = 0;
  }
  goToJail(why) {
    const p = this.player; if (this.jailed) return;
    this.jailed = true; p.tazedT = 0; p.cuffT = 0; p.wanted = 0; p.heat = 0; p.health = p.maxHealth;
    for (const n of this.npcs) if (n.cop) n.removeMe = true;
    for (const c of this.cars) if (c.police) c.removeMe = true;
    if (p.inCar) { p.inCar.driver = null; p.inCar = null; p.root.visible = true; }
    const J = this.city.jail; p.pos.set(J.cell.x, 0, J.cell.z); p.root.position.copy(p.pos);
    this.city.jailDoorClose();
    this.ui.bigCard('BUSTED', why || ''); this.ui.news('Arrest on the mainland — suspect in custody at Bay County lockup');
    this.setJailObjective();
    this.saveGame();
  }
  setJailObjective() { this.ui.el.obj.textContent = 'JAIL — hold E at the cell door to work the lock (' + (3 - (this._picks || 0)) + ' picks left)'; }
  updateJail(dt) {
    if (!this.jailed) return;
    const p = this.player, J = this.city.jail;
    if (Math.hypot(p.pos.x - J.cell.x, p.pos.z - J.cell.z) > 40) { this.jailed = false; this._picks = 0; this.ui.toast('You slipped away. Lay low for a while.'); this.ui.el.obj.textContent = ''; this.story.setChapter(this.story.freeRoam ? null : MISSIONS[this.story.mi]); if (this.story.state === 'goMeet') this.story._setupMeet(MISSIONS[this.story.mi]); return; }
    if (this.input.p('KeyE') && !this.city.jailOpen && Math.hypot(p.pos.x - J.door.x, p.pos.z - J.door.z) < 3.4) {
      this._picks = (this._picks || 0) + 1; this.setJailObjective();
      if (this._picks >= 3) { this.city.jailDoorOpen(); this._picks = 0; this.ui.toast('The lock pops. GO.'); this.ui.el.obj.textContent = 'Get clear of the jail'; }
      else this.ui.toast('Working the lock... (' + (3 - this._picks) + ' to go)');
    }
  }
  saveGame() { try { const ch = this.story.freeRoam ? ((this.saveData && this.saveData.ch) || 0) : Math.max(0, this.story.mi); localStorage.setItem('nb_save', JSON.stringify({ ch, money: this.player.money | 0, gun: !!this.player.hasGun, own: this.city.shops.map((s, i) => s.owned ? i : -1).filter(i => i >= 0), fatigue: +(this.player.fatigue || 0).toFixed(3), t: this.time | 0 })); } catch (e) {} }
  _ambient(dt) { for (const c of this.cars) c.update(dt); for (const n of this.npcs) if (!n.story) n.update(dt); this.updateCulling(); }
  intro() {
    this.ui.hideTitle(); this.ui.modal = null; this.menuMode = false; this.introMode = true; this.ui.letterbox(true);
    const az = this.city.airport.z;
    this.plane = buildPlane(); this.scene.add(this.plane);
    this.player.spawnPos = this.city.airport.exit;
    this._intro = { t: 0, dur: 19, bi: -1, az,
      // plane keyframes: [u, x, y, z] — descends from the south and rolls in toward the city
      path: [[0, 6, 150, az - 320], [0.4, 0, 30, az - 150], [0.55, 0, 2.6, az - 110], [1, 0, 2.6, az + 40]],
      beats: [
        { u: 0.3, lines: ['Neon Bay International. Wheels down in five.', 'Population: two million liars — and me.'] },
        { u: 0.56, lines: ['They call me a lot of things back home.', "‘Broke’ is the one that stuck."] },
        { u: 0.82, lines: ["One bus ticket's savings, a cousin with a plan,", 'and a one-way flight into the sun.'] },
        { u: 2, lines: ['I came here to disappear.', "Instead — I'm gonna own it."] },
      ] };
    this.ui.introSkip(true);
  }
  updateIntro(dt) {
    const I = this._intro; if (!I) { this.endIntro(); return; }
    I.t += dt; const u = clamp(I.t / I.dur, 0, 1);
    const p = I.path; let k = 0; while (k < p.length - 2 && u > p[k + 1][0]) k++;
    const a = p[k], b = p[k + 1], s = clamp((u - a[0]) / ((b[0] - a[0]) || 1), 0, 1), e = s * s * (3 - 2 * s);
    const px = lerp(a[1], b[1], e), py = lerp(a[2], b[2], e), pz = lerp(a[3], b[3], e);
    this.plane.position.set(px, py, pz); this.plane.rotation.x = py > 4 ? -0.1 : 0;
    this.camera.position.set(px + 20, py + 13, pz - 44); this.camera.lookAt(px, py + 2, pz + 10);
    let bi = 0; while (bi < I.beats.length - 1 && u >= I.beats[bi].u) bi++;
    if (bi !== I.bi) { I.bi = bi; this.ui.introText(I.beats[bi].lines); }
    if (this.input.p('Escape')) { this.endIntro(); return; }
    if (this.input.p('Space') || this.input.p('Enter')) I.t += I.dur * 0.16;
    if (u >= 1) this.endIntro();
  }
  endIntro() { if (!this.introMode) return; this.introMode = false; if (this.plane) { this.scene.remove(this.plane); this.plane = null; } this._intro = null; this.ui.introHide(); this.ui.introSkip(false); this.ui.letterbox(false); this.start(); }
  updateCulling() {
    this.camera.updateMatrixWorld(); this._m.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse); this._frustum.setFromProjectionMatrix(this._m);
    const cp = this.camera.position, near2 = 135 * 135;
    // Distant-Horizons style: full detail near, cheap LOD shells at any distance (in frustum)
    for (const c of this.city.cullables) {
      const dx = c.p.x - cp.x, dz = c.p.z - cp.z, near = (dx * dx + dz * dz) < near2;
      const vis = this._frustum.intersectsSphere(this._sph.set(c.p, c.r));
      c.o.visible = near && vis; if (c.lod) c.lod.visible = !near && vis;
    }
    for (const n of this.npcs) { if (n.dead) { continue; } const dx = n.pos.x - cp.x, dz = n.pos.z - cp.z; n.root.visible = (dx * dx + dz * dz) < 145 * 145 && this._frustum.intersectsSphere(this._sph.set(n.root.position, 2.2)); }
    for (const car of this.cars) { const dx = car.pos.x - cp.x, dz = car.pos.z - cp.z; car.root.visible = (dx * dx + dz * dz) < 170 * 170 && this._frustum.intersectsSphere(this._sph.set(car.root.position, 3.4)); }
  }
  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.05); this.time += dt;
    if (this.menuMode) { this.menuCam(); this._ambient(dt); }
    else if (this.introMode) { this.updateIntro(dt); this._ambient(dt); }
    else if (this.playing) {
      if (this.input.p('Escape')) { if (this.ui.modal) this.ui.closeModal(); else if (this.paused) this.resume(); else this.pause(); }
      if (this.input.p('KeyP') && !this.cine && !this.paused && (!this.ui.modal || this.ui.modal === 'phone')) this.ui.phone(this.ui.modal !== 'phone');
      if (this.input.p('KeyV') && !this.cine) { this.player.cycleCam(); }
      if (this.input.p('KeyR') && this.player.inCar && !this.player.inCar.boat) this.radioNext();
      if (this.input.p('KeyL') && !this.cine && (!this.ui.modal || this.ui.modal === 'life')) { if (this.ui.modal === 'life') this.ui.socialClose(); else this.ui.lifePanel(); }
      if (this.input.p('KeyE') && (this.ui.modal === 'social' || this.ui.modal === 'life')) this.ui.socialClose();
      const frozen = this.paused || this.ui.modal;
      // slow-mo: the world advances on the dilated step (sdt); the camera, HUD and ramp stay on real dt
      this.updateTimeScale(dt); const sdt = dt * this.timeScale;
      if (this.cine) { this.updateCutscene(dt); }
      else if (!frozen) { this.player.update(sdt); for (const n of this.npcs) n.update(sdt); for (const c of this.cars) c.update(sdt); this.story.update(sdt); this.updateWanted(sdt); this.updatePickups(sdt); this.updateArrest(sdt); this.updateJail(sdt); this.updateIncome(sdt); this.updateWorkers(sdt); this.updateGps(); this.cull(); this.player.updateCamera(dt, false); }
      else { this.player.updateCamera(dt, true); }
      this.updateFx(sdt); this.camShake = Math.max(0, (this.camShake || 0) - dt * 2.4); this.updateRain(dt); this.updateRipples(dt); if (!frozen) { this.maintainParked(dt); this.updateFatigue(dt); } this.updateWaypoint(dt); this.ui.update(); this.updateCulling();
    }
    if (this.player.pos) { this.sun.position.set(this.player.pos.x - 48, 95, this.player.pos.z - 95); this.sun.target.position.copy(this.player.pos); this.sun.target.updateMatrixWorld(); }
    this.sky.position.copy(this.camera.position);
    this.updateDayNight();
    if (this.playing) { this.updateTraffic(dt); this.updateStorm(dt); this.updateEngine(dt); this.updateAmbientAudio(dt); this.updateNeon(dt); this.updateRadio(dt); this.updateBirds(dt); if (!this.paused && !this.ui.modal && !this.cine) this.social.update(dt); }
    if (this._lens) this._lens.style.opacity = (this.playing && !this.paused && this.player.camMode !== 'fps') ? '0.5' : '0';
    if (this.city.displays) for (const d2 of this.city.displays) d2.root.rotation.y += dt * 0.5;
    const jd = this.city.jailDoor; if (jd) { const tx = this.city.jail.door.x + (this.city.jailOpen ? 2.7 : 0); jd.position.x += (tx - jd.position.x) * Math.min(1, dt * 3.5); } // cell door rolls on its track
    if (this.city.lighthouseBeam) this.city.lighthouseBeam.rotation.y += dt * 0.9; // sweeping beacon
    // the metro loop runs all night
    if (this.city.trainCars) { const T = this.city.trainTrack; this.city.trainT += dt * (13 / T.r); for (let i = 0; i < this.city.trainCars.length; i++) { const ang = this.city.trainT - i * (9.2 / T.r), c = this.city.trainCars[i]; c.position.set(T.cx + Math.cos(ang) * T.r, T.y, T.cz + Math.sin(ang) * T.r); c.rotation.y = -ang; } }
    if (this.sky.userData.clouds) for (const c of this.sky.userData.clouds.children) { c.position.x += dt * 2.4; if (c.position.x > 720) c.position.x -= 1440; }
    // refresh the shadow map only a few times per second (buildings are static)
    this._shadowT -= dt; if (this._shadowT <= 0) { this.renderer.shadowMap.needsUpdate = true; this._shadowT = 0.11; }
    if (this.reflGround && (this.playing || this.menuMode)) this.reflGround.update();
    this.post.render(); this.input.end();
  }
  // do any active cops currently hold a clear line of sight on the player?
  _copsSeePlayer() {
    const p = this.player;
    for (const c of this.cars) { if (c.police && !c.removeMe && !c.assessing && c.pos.distanceTo(p.pos) < 74 && this._hasLOS(c.pos, p.pos)) return true; }
    for (const n of this.npcs) { if (n.cop && !n.dead && n.pos.distanceTo(p.pos) < 52 && this._hasLOS(n.pos, p.pos)) return true; }
    return false;
  }
  _hasLOS(a, b) { // cheap occlusion: fail if the sightline crosses a tall building box
    const steps = 7; for (let i = 1; i < steps; i++) { const t = i / steps, x = lerp(a.x, b.x, t), z = lerp(a.z, b.z, t); for (const box of this.city.boxes) { if ((box.h === undefined ? 7 : box.h) > 1.6 && Math.abs(x - box.x) < box.hw && Math.abs(z - box.z) < box.hd) return false; } } return true;
  }
  // a road node minR..maxR away that is NOT in the current camera frustum, so units arrive from off-screen
  _offscreenNode(minR, maxR) {
    const p = this.player, net = this.city.net; let fb = null;
    for (let t = 0; t < 26; t++) { const n = net.nodes[(Math.random() * net.nodes.length) | 0]; if (!n.edges.length) continue; const d = Math.hypot(n.position.x - p.pos.x, n.position.z - p.pos.z); if (d < minR || d > maxR) continue; fb = n; if (!this._frustum.containsPoint(n.position)) return n; }
    return fb;
  }
  updateWanted(dt) {
    const p = this.player;
    if (p.wanted > 0) {
      // stars only cool once the player breaks the cops' line of sight (a "searching" grace, then they clear)
      this._losT = (this._losT || 0) - dt; if (this._losT <= 0) { this._losT = 0.2; this._copSeen = this._copsSeePlayer(); }
      if (this._copSeen) { p.seenT = 0; p.searching = false; p.heat = Math.max(p.heat, 6 + p.wanted * 4); }
      else { p.seenT = (p.seenT || 0) + dt; if (p.seenT > 5) p.searching = true; }
      if (p.searching) { p.heat -= dt; if (p.heat <= 0) { p.wanted = Math.max(0, p.wanted - 1); p.heat = p.wanted > 0 ? (7 + p.wanted * 3) : 0; p.seenT = 0; if (p.wanted === 0) { p.searching = false; this.ui.toast('You lost the cops.'); } } }
    } else { p.searching = false; }
    if (this.responseT > 0) { this.responseT -= dt; return; } // dispatch takes time to arrive
    // gradual escalation — a couple of foot units per star, cruisers from 3 stars, all arriving from off-screen and driving/walking in
    this.copT = (this.copT || 0) - dt;
    if (p.wanted > 0 && !p.searching && this.copT <= 0) {
      this.copT = 3.0;
      const wantFoot = Math.min(6, p.wanted + 1), haveFoot = this.npcs.filter(n => n.cop && !n.dead).length;
      if (haveFoot < wantFoot) { const nd = this._offscreenNode(45, 120); if (nd) this.npcs.push(new Ped(this, nd.position.x, nd.position.z, true)); }
      if (p.wanted >= 3) { const wantCar = Math.min(3, p.wanted - 2), haveCar = this.cars.filter(c => c.police && !c.removeMe).length; if (haveCar < wantCar) { const nd = this._offscreenNode(60, 150); if (nd) { const pc = new PoliceCar(this, nd.position.x, nd.position.z); pc.fromN = nd.id; this.cars.push(pc); } if (p.wanted === 5 && !this._n5) { this._n5 = true; this.ui.news('FIVE-STAR MANHUNT — NBPD floods the causeways as chaos grips the Bay'); } } }
    }
    if (p.wanted === 0) for (const n of this.npcs) if (n.cop) n.removeMe = true;
  }
  // fatigue rises the longer you stay awake; sleeping at home clears it (soft pressure, never a hard fail)
  updateFatigue(dt) {
    const p = this.player; if (p.dead) return;
    p.fatigue = Math.min(1, (p.fatigue || 0) + dt / 900); // ~15 minutes awake → fully exhausted
    this._fatT = (this._fatT || 0) - dt;
    if (p.fatigue > 0.82 && this._fatT <= 0) { this._fatT = 55; this.ui.toast('😴 You\'re exhausted — get home and sleep'); }
  }
  updateFx(dt) {
    for (const t of this.tracers) { t.life -= dt; t.line.material.opacity = Math.max(0, t.life / 0.06); }
    this.tracers = this.tracers.filter(t => { if (t.life <= 0) { this.scene.remove(t.line); t.line.geometry.dispose(); t.line.material.dispose(); return false; } return true; });
    for (const f of this.fx) {
      f.life -= dt; f.age = (f.age || 0) + dt;
      if (f.flash) { f.flash.intensity = Math.max(0, f.flash.intensity - dt * 20); continue; } // blast light decay
      if (f.flashBall) { const t = clamp(f.age / f.dur, 0, 1); f.m.scale.setScalar(1 + t * 3.2); f.m.material.opacity = Math.max(0, 1 - t); continue; } // white-hot flash
      if (f.explode) { // fireball: expands + color-lerps white-hot → yellow → orange → ash, then fades
        const t = clamp(f.age / f.dur, 0, 1), col = f.m.material.color;
        if (t < 0.12) col.setHex(0xfffbe6); else if (t < 0.32) col.setHex(0xffd23f); else if (t < 0.6) col.setHex(0xff5a1f); else if (t < 0.8) col.setHex(0x7a2a10); else col.setHex(0x2b2b2b);
        for (let i = 0; i < f.n; i++) { f.vs[i * 3 + 1] -= 15 * dt; f.ps[i * 3] += f.vs[i * 3] * dt; f.ps[i * 3 + 1] += f.vs[i * 3 + 1] * dt; f.ps[i * 3 + 2] += f.vs[i * 3 + 2] * dt; }
        f.g.attributes.position.needsUpdate = true; f.m.material.opacity = Math.max(0, 1 - t); f.m.material.size = f.baseSize * (1 + t * 1.8); continue;
      }
      if (f.debris) { // ballistic wreckage with gravity, spin, and a ground bounce
        f.vy -= 22 * dt; f.m.position.x += f.vx * dt; f.m.position.y += f.vy * dt; f.m.position.z += f.vz * dt;
        f.m.rotation.x += f.sx * dt; f.m.rotation.y += f.sy * dt; f.m.rotation.z += f.sz2 * dt;
        const gy = this.city.groundH(f.m.position.x, f.m.position.z) + 0.12;
        if (f.m.position.y < gy) { f.m.position.y = gy; f.vy *= -0.32; f.vx *= 0.62; f.vz *= 0.62; f.sx *= 0.6; f.sy *= 0.6; f.sz2 *= 0.6; }
        continue;
      }
      if (f.smoke) { const t = clamp(f.age / f.dur, 0, 1); for (let i = 0; i < f.n; i++) { f.ps[i * 3] += f.vs[i * 3] * dt; f.ps[i * 3 + 1] += f.vs[i * 3 + 1] * dt; f.ps[i * 3 + 2] += f.vs[i * 3 + 2] * dt; } f.g.attributes.position.needsUpdate = true; f.m.material.opacity = 0.62 * (1 - t); f.m.material.size = f.baseSize * (1 + t * 1.7); continue; }
      if (f.scorch) { const t = clamp(f.age / f.dur, 0, 1); f.m.material.opacity = 0.78 * (1 - Math.max(0, (t - 0.7) / 0.3)); continue; }
      if (f.puff) { f.m.position.y += f.vy * dt; f.m.position.x += f.dx * dt; const t = clamp(f.age / f.dur, 0, 1); f.m.material.opacity = (f.hot ? 0.6 : 0.4) * (1 - t); f.m.scale.setScalar(1.5 + t * (f.hot ? 1.6 : 3.4)); if (f.hot && t > 0.4) f.m.material.color.setHex(0x2a2c30); f.m.quaternion.copy(this.camera.quaternion); continue; }
      if (f.muzzle) { const t = clamp(f.age / 0.07, 0, 1); f.m.material.opacity = 0.95 * (1 - t); f.m.scale.setScalar(1.4 + t * 1.6); continue; }
      for (let i = 0; i < f.n; i++) { f.vs[i * 3 + 1] -= 12 * dt; f.ps[i * 3] += f.vs[i * 3] * dt; f.ps[i * 3 + 1] += f.vs[i * 3 + 1] * dt; f.ps[i * 3 + 2] += f.vs[i * 3 + 2] * dt; } f.g.attributes.position.needsUpdate = true; f.m.material.opacity = Math.max(0, f.life / 0.6);
    }
    this.fx = this.fx.filter(f => { if (f.life <= 0) { if (f.flash) { this.scene.remove(f.flash); } else { this.scene.remove(f.m); if (f.g) f.g.dispose(); else if (f.m.geometry) f.m.geometry.dispose(); if (f.m.material) f.m.material.dispose(); } return false; } return true; });
  }
  // ---- slow-mo time dilation: an unscaled accumulator ramps timeScale down, holds, then recovers ----
  triggerSlowMo(target, ramp, hold, recover) {
    this._slow = { target: target != null ? target : 0.15, ramp: ramp || 0.5, hold: hold != null ? hold : 0.7, recover: recover || 0.8, t: 0, from: this.timeScale, phase: 'in' };
  }
  updateTimeScale(dt) {
    const s = this._slow; if (!s) { this.timeScale = this.timeScale + (1 - this.timeScale) * Math.min(1, dt * 6); if (Math.abs(this.timeScale - 1) < 0.002) this.timeScale = 1; return; }
    s.t += dt; const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
    if (s.phase === 'in') { const k = ease(s.t / s.ramp); this.timeScale = lerp(s.from, s.target, k); if (s.t >= s.ramp) { s.phase = 'hold'; s.t = 0; this.timeScale = s.target; } }
    else if (s.phase === 'hold') { if (s.t >= s.hold) { s.phase = 'out'; s.t = 0; s.from = this.timeScale; } }
    else { const k = ease(s.t / s.recover); this.timeScale = lerp(s.from, 1, k); if (s.t >= s.recover) { this.timeScale = 1; this._slow = null; } }
  }
  // ---- rain: recycle the streak field around the camera; density scales with the weather ----
  updateRain(dt) {
    const rn = this.rain; if (!rn || !rn.pts.visible) return;
    const cam = this.camera.position, drift = -7 * dt, active = Math.floor(rn.N * clamp(this.rainAmt, 0, 1));
    for (let i = 0; i < rn.N; i++) {
      const o = i * 6;
      if (i >= active) { if (rn.pos[o + 1] > -900) { rn.pos[o + 1] = -999; rn.pos[o + 4] = -999; } continue; } // parked off-screen when weather is light
      const fall = rn.vel[i] * dt;
      rn.pos[o + 1] -= fall; rn.pos[o + 4] -= fall; rn.pos[o] += drift; rn.pos[o + 3] += drift;
      if (rn.pos[o + 1] < cam.y - 10 || Math.abs(rn.pos[o] - cam.x) > rn.R + 12 || Math.abs(rn.pos[o + 2] - cam.z) > rn.R + 12) {
        const x = cam.x + rnd(-rn.R, rn.R), z = cam.z + rnd(-rn.R, rn.R), y = cam.y + rnd(14, rn.TOP);
        rn.pos[o] = x; rn.pos[o + 1] = y; rn.pos[o + 2] = z; rn.pos[o + 3] = x + rnd(-0.06, 0.06); rn.pos[o + 4] = y - rn.LEN; rn.pos[o + 5] = z;
      }
    }
    rn.geo.attributes.position.needsUpdate = true;
  }
  // faint expanding puddle rings on the wet road near the camera (raindrops hitting standing water)
  updateRipples(dt) {
    const cam = this.camera.position, city = this.city;
    this._ripT = (this._ripT || 0) - dt;
    if (this._ripT <= 0) {
      this._ripT = 0.06;
      for (let k = 0; k < 2; k++) { const r = this.ripples.find(x => x.life <= 0); if (!r) break; const a = rnd(TAU), rad = rnd(4, 42), x = cam.x + Math.cos(a) * rad, z = cam.z + Math.sin(a) * rad; if (city.isWater(x, z)) continue; r.dur = r.life = rnd(0.7, 1.2); r.m.position.set(x, city.groundH(x, z) + 0.05, z); r.m.scale.setScalar(0.3); r.m.visible = true; }
    }
    for (const r of this.ripples) { if (r.life <= 0) continue; r.life -= dt; const t = 1 - r.life / r.dur; r.m.scale.setScalar(0.3 + t * 2.6); r.m.material.opacity = 0.42 * (1 - t) * (1 - t); if (r.life <= 0) r.m.visible = false; }
  }
  // static, enterable parked cars lining the curbs so the streets aren't dead (recycled around the player)
  spawnParked() {
    const c = this.city, net = c.net, p = this.player; let node = null;
    for (let t = 0; t < 14; t++) { const n = net.nodes[(Math.random() * net.nodes.length) | 0]; const d = Math.hypot(n.position.x - p.pos.x, n.position.z - p.pos.z); if (d > 36 && d < 150 && n.edges.length) { node = n; break; } }
    if (!node) return null;
    const eid = node.edges[(Math.random() * node.edges.length) | 0], e = net.edges[eid]; if (e.isBridge) return null;
    const other = net.nodes[e.a === node.id ? e.b : e.a].position, fwd = other.clone().sub(node.position).normalize(), right = new THREE.Vector3(fwd.z, 0, -fwd.x), off = ROAD_CLASS[e.class].width / 2 + 1.5;
    const base = node.position.clone().addScaledVector(fwd, rnd(0.15, 0.85) * node.position.distanceTo(other)), side = Math.random() < 0.5 ? 1 : -1, x = base.x + right.x * off * side, z = base.z + right.z * off * side;
    if (!net.isLand(x, z)) return null;
    const car = new Car(this, x, z, new THREE.Vector3(fwd.x, 0, fwd.z), pick(CAR_COLORS), false); car.ai = false; car.parked = true; car.speed = 0;
    if (car._spill) car._spill.visible = false; if (car._rear) car._rear.visible = false;
    car.yaw = Math.atan2(fwd.x, fwd.z) + (side > 0 ? 0 : Math.PI); car.root.rotation.y = car.yaw;
    const dv = car.root.userData.driver; if (dv) dv.visible = false;
    this.cars.push(car); return car;
  }
  maintainParked(dt) {
    this._parkT = (this._parkT || 0) - dt; if (this._parkT > 0) return; this._parkT = 0.5;
    let n = 0; for (const c of this.cars) if (c.parked && !c.driver) n++;
    for (let k = 0; k < 3 && n < 15; k++) if (this.spawnParked()) n++;   // fill the curbs quickly, then top up
  }
  // ---- storm: periodic lightning flash (light spike + white overlay) with delayed, distance-scaled thunder ----
  updateStorm(dt) {
    if (this._flash > 0) { this._flash -= dt * 3.4; if (this.ui.el.flash) this.ui.el.flash.style.opacity = Math.max(0, this._flash * 0.42); }
    this._lightBoost = Math.max(0, (this._lightBoost || 0) - dt * 7);
    if (this._lightBoost > 0) { this.hemi.intensity += this._lightBoost * 0.8; this.sun.intensity += this._lightBoost * 1.3; }
    this._boltT = (this._boltT == null) ? rnd(4, 9) : this._boltT - dt;
    if (this._boltT <= 0) {
      this._boltT = rnd(6, 14); this._flash = 1.0; this._lightBoost = 2.4;
      if (this.ui.el.flash) this.ui.el.flash.style.opacity = 0.42;
      setTimeout(() => this.thunder(rnd(0.5, 2.2)), rnd(500, 2600)); // sound arrives after the flash
    }
  }
  thunder(vol) {
    try {
      const ac = this._ac || (this._ac = new (window.AudioContext || window.webkitAudioContext)()); const t = ac.currentTime, dur = 1.5;
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.2);
      const src = ac.createBufferSource(); src.buffer = buf; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 340; const gn = ac.createGain(); gn.gain.value = 0.22 * vol;
      src.connect(lp); lp.connect(gn); gn.connect(ac.destination); src.start(t);
      const osc = ac.createOscillator(); osc.frequency.value = 46; const og = ac.createGain(); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.2 * vol, t + 0.12); og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(og); og.connect(ac.destination); osc.start(t); osc.stop(t + dur);
    } catch (e) {}
  }
  // ---- shared audio context (resumed on first user gesture); every SFX is guarded so headless never throws ----
  _actx() { try { const ac = this._ac || (this._ac = new (window.AudioContext || window.webkitAudioContext)()); if (ac.state === 'suspended') ac.resume(); return ac; } catch (e) { return null; } }
  _noiseBurst(dur, filterType, freq, q, gain, curve) {
    const ac = this._actx(); if (!ac) return; try { const t = ac.currentTime, n = Math.max(1, (ac.sampleRate * dur) | 0), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, curve || 1.6);
      const s = ac.createBufferSource(); s.buffer = buf; const f = ac.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; if (q) f.Q.value = q; const g = ac.createGain(); g.gain.value = gain;
      s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t); } catch (e) {}
  }
  sfxCrunch(vol) {
    vol = clamp(vol, 0.2, 1.5); this._noiseBurst(0.16 + vol * 0.1, 'bandpass', 900 + Math.random() * 900, 0.8, Math.min(0.5, 0.16 * vol), 1.5);
    const ac = this._actx(); if (!ac) return; try { const t = ac.currentTime, o = ac.createOscillator(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.2); const g = ac.createGain(); g.gain.setValueAtTime(0.28 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.22); } catch (e) {}
  }
  sfxHorn() { const ac = this._actx(); if (!ac) return; try { const t = ac.currentTime; for (const [f, d] of [[380, 0], [300, 0.16]]) { const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = f; const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t + d); g.gain.linearRampToValueAtTime(0.1, t + d + 0.02); g.gain.setValueAtTime(0.1, t + d + 0.13); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.16); o.connect(g); g.connect(ac.destination); o.start(t + d); o.stop(t + d + 0.18); } } catch (e) {}
  }
  sfxSkid() { this._skidSfxT = (this._skidSfxT || 0); const now = this.time; if (now - this._skidSfxT < 0.28) return; this._skidSfxT = now; this._noiseBurst(0.3, 'bandpass', 2600, 3, 0.06, 0.7); }
  sfxChime() { const ac = this._actx(); if (!ac) return; try { const t = ac.currentTime; for (const [f, d] of [[880, 0], [1320, 0.08]]) { const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.12, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.25); o.connect(g); g.connect(ac.destination); o.start(t + d); o.stop(t + d + 0.26); } } catch (e) {}
  }
  sfxSplash() { this._noiseBurst(0.22, 'bandpass', 1600, 1.2, 0.05, 2.2); }
  // ---- procedural engine loop: pitch + brightness track the driven car's speed ----
  _engineNode() {
    if (this._eng) return this._eng;
    try { const ac = this._actx(); if (!ac) return null;
      const osc = ac.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 48;
      const sub = ac.createOscillator(); sub.type = 'square'; sub.frequency.value = 24;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; const g = ac.createGain(); g.gain.value = 0;
      osc.connect(lp); sub.connect(lp); lp.connect(g); g.connect(ac.destination); osc.start(); sub.start();
      this._eng = { osc, sub, lp, g }; return this._eng; } catch (e) { return null; }
  }
  updateEngine(dt) {
    const e = this._engineNode(); if (!e) return; const p = this.player;
    const driving = p.inCar && !p.inCar.boat, spd = driving ? Math.abs(p.inCar.speed) : 0;
    const target = driving ? 0.05 + Math.min(0.08, spd * 0.0028) : 0;
    try { e.g.gain.value += (target - e.g.gain.value) * Math.min(1, dt * 6);
      const f = 44 + spd * 4.4; e.osc.frequency.value += (f - e.osc.frequency.value) * Math.min(1, dt * 8); e.sub.frequency.value = e.osc.frequency.value * 0.5; e.lp.frequency.value = 360 + spd * 42; } catch (er) {}
  }
  // ---- ambient audio bed: a soft rain hiss (muffled inside a car) + occasional distant sirens when wanted ----
  updateAmbientAudio(dt) {
    if (!this._amb) { try { const ac = this._actx(); if (!ac) return; const dur = 2.2, n = (ac.sampleRate * dur) | 0, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.5; const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 820; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6200; const g = ac.createGain(); g.gain.value = 0;
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(ac.destination); src.start(); this._amb = { g, lp }; } catch (e) { this._amb = { g: null }; } }
    if (this._amb && this._amb.g) { try { const inside = this.player.inCar && !this.player.inCar.boat; this._amb.g.gain.value += ((inside ? 0.012 : 0.032) - this._amb.g.gain.value) * Math.min(1, dt * 2); this._amb.lp.frequency.value = inside ? 2200 : 6200; } catch (e) {} }
    this._sirenT = (this._sirenT || 0) - dt;
    if (this.player.wanted > 0 && this._sirenT <= 0) { this._sirenT = rnd(4, 8); this._distantSiren(); }
  }
  _distantSiren() { const ac = this._actx(); if (!ac) return; try { const t = ac.currentTime, o = ac.createOscillator(); o.type = 'sine'; const g = ac.createGain(); const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    for (let i = 0; i < 4; i++) { o.frequency.setValueAtTime(660, t + i * 0.5); o.frequency.linearRampToValueAtTime(880, t + i * 0.5 + 0.25); o.frequency.linearRampToValueAtTime(660, t + i * 0.5 + 0.5); }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03, t + 0.25); g.gain.setValueAtTime(0.03, t + 1.7); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);
    o.connect(lp); lp.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 2.1); } catch (e) {} }
  // faulty-tube neon flicker: a fifth of signs randomly stutter dark for a beat
  updateNeon(dt) {
    const ns = this.city.neons; if (!ns) return;
    for (const s of ns) {
      if (s.userData.flick > 0) { s.userData.flick -= dt; s.material.emissiveIntensity = (Math.random() < 0.5 ? 0.12 : s.userData.base); if (s.userData.flick <= 0) s.material.emissiveIntensity = s.userData.base; }
      else if (Math.random() < dt * 0.09) s.userData.flick = rnd(0.18, 0.7);
    }
  }
  // ---- pigeon/gull flock: circles overhead, follows the player loosely, scatters on gunfire/blasts ----
  _makeBird() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.42), mat(0x2a2c32)); g.add(body);
    const wl = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.03, 0.22), mat(0x23252b)); wl.position.set(-0.32, 0.02, 0); g.add(wl);
    const wr = wl.clone(); wr.position.x = 0.32; g.add(wr); g.userData.wings = [wl, wr]; return g;
  }
  spawnBirds() { this.birds = []; for (let i = 0; i < 12; i++) { const m = this._makeBird(); this.scene.add(m); this.birds.push({ m, ang: rnd(TAU), rad: rnd(10, 26), spd: rnd(0.4, 0.9), y: rnd(22, 34), flap: rnd(TAU), scatter: 0, cx: this.player.pos.x, cz: this.player.pos.z, tr: rnd(10, 26), ty: rnd(22, 34) }); } }
  updateBirds(dt) {
    if (!this.birds) this.spawnBirds(); const p = this.player.pos;
    for (const b of this.birds) {
      b.scatter = Math.max(0, b.scatter - dt);
      b.cx += (p.x - b.cx) * Math.min(1, dt * 0.3); b.cz += (p.z - b.cz) * Math.min(1, dt * 0.3);
      b.ang += b.spd * dt * (b.scatter > 0 ? 2.6 : 1);
      if (b.scatter > 0) { b.rad += dt * 7; b.y += dt * 5; } else { b.rad += (b.tr - b.rad) * Math.min(1, dt * 0.5); b.y += (b.ty - b.y) * Math.min(1, dt * 0.4); }
      if (b.rad > 62) { b.rad = rnd(10, 26); b.tr = rnd(10, 26); b.ty = rnd(22, 34); }
      b.m.position.set(b.cx + Math.cos(b.ang) * b.rad, b.y, b.cz + Math.sin(b.ang) * b.rad); b.m.rotation.y = -b.ang + Math.PI / 2;
      b.flap += dt * (b.scatter > 0 ? 28 : 13); const fl = Math.sin(b.flap) * 0.75; b.m.userData.wings[0].rotation.z = fl; b.m.userData.wings[1].rotation.z = -fl;
    }
  }
  scareBirds() { if (!this.birds) return; for (const b of this.birds) b.scatter = rnd(2.5, 4.5); }
  // ---- car radio: procedural stations that fade in when you're driving, muffle when you step out ----
  _radioStations() { return this._stations || (this._stations = [
    { name: 'NEON 101.5', wave: 'triangle', tempo: 0.17, scale: [0, 3, 5, 7, 10, 12], base: 220, chord: true },
    { name: 'BASSDRIVE FM', wave: 'sawtooth', tempo: 0.13, scale: [0, 2, 3, 7, 8, 10], base: 110 },
    { name: 'BAY TALK AM', talk: true, tempo: 0.42 },
  ]); }
  updateRadio(dt) {
    const p = this.player, inCar = !!(p.inCar && !p.inCar.boat); if (!this.radio) this.radio = { station: 0, t: 0, step: 0 };
    const ac = inCar ? this._actx() : (this._radioGain ? this._ac : null);
    if (ac && !this._radioGain) { try { this._radioGain = ac.createGain(); this._radioGain.gain.value = 0; this._radioLP = ac.createBiquadFilter(); this._radioLP.type = 'lowpass'; this._radioLP.frequency.value = 3200; this._radioGain.connect(this._radioLP); this._radioLP.connect(ac.destination); } catch (e) {} }
    if (this._radioGain) { try { this._radioGain.gain.value += ((inCar ? 0.14 : 0) - this._radioGain.gain.value) * Math.min(1, dt * 3); } catch (e) {} }
    if (!inCar || !ac) return;
    this.radio.t -= dt; if (this.radio.t <= 0) { const st = this._radioStations()[this.radio.station]; this.radio.t = st.tempo; this._radioBeat(ac, st, this.radio.step++); }
  }
  _radioBeat(ac, st, step) {
    try { const t = ac.currentTime, out = this._radioGain;
      if (st.talk) { if (step % 7 < 5) { const dur = 0.18 + Math.random() * 0.12, n = (ac.sampleRate * dur) | 0, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.5); const s = ac.createBufferSource(); s.buffer = buf; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650 + Math.random() * 900; bp.Q.value = 5; const g = ac.createGain(); g.gain.value = 0.5; s.connect(bp); bp.connect(g); g.connect(out); s.start(t); } return; }
      const notes = st.chord && step % 4 === 0 ? [0, 2, 4] : [(step * 3) % st.scale.length];
      for (const ni of notes) { const semi = st.scale[ni % st.scale.length], freq = st.base * Math.pow(2, semi / 12), o = ac.createOscillator(); o.type = st.wave; o.frequency.value = freq; const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + st.tempo * 1.7); o.connect(g); g.connect(out); o.start(t); o.stop(t + st.tempo * 1.8); }
      if (step % 4 === 0) { const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = st.base / 2; const g = ac.createGain(); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.0001, t + st.tempo * 2); o.connect(g); g.connect(out); o.start(t); o.stop(t + st.tempo * 2); }
    } catch (e) {}
  }
  radioNext() { if (!this.radio) this.radio = { station: 0, t: 0, step: 0 }; this.radio.station = (this.radio.station + 1) % this._radioStations().length; this.ui.toast('📻 ' + this._radioStations()[this.radio.station].name); }
  // a floating +$ pop with a chime whenever cash comes in
  moneyPop(amount, worldPos) {
    this.sfxChime();
    try { const el = document.createElement('div'); el.className = 'moneypop'; el.textContent = (amount >= 0 ? '+$' : '-$') + Math.abs(amount | 0);
      let sx = innerWidth / 2, sy = innerHeight * 0.42;
      if (worldPos) { const v = worldPos.clone().project(this.camera); if (v.z < 1) { sx = (v.x * 0.5 + 0.5) * innerWidth; sy = (-v.y * 0.5 + 0.5) * innerHeight; } }
      el.style.left = sx + 'px'; el.style.top = sy + 'px'; document.body.appendChild(el);
      requestAnimationFrame(() => { el.style.transform = 'translate(-50%,-64px)'; el.style.opacity = '0'; });
      setTimeout(() => el.remove(), 1000); } catch (e) {}
  }
  // ---- impact feedback: speed-scaled camera punch + crunch + spark shower, hit-stop on heavy crashes ----
  impactFx(pos, force) {
    const f = clamp(force, 0, 34); this.camShake = Math.max(this.camShake || 0, Math.min(1.7, f * 0.06));
    this.sfxCrunch(clamp(f * 0.085, 0.2, 1.4)); this.sparks(pos, 4 + (f | 0), f);
    if (f > 16 && (this.time - (this._hitStopT || -9)) > 0.6) { this._hitStopT = this.time; this.triggerSlowMo(0.08, 0.03, 0.05, 0.32); } // brief freeze on big ones
  }
  sparks(pos, n, force) {
    n = Math.min(30, Math.max(3, n | 0)); const g = new THREE.BufferGeometry(), ps = new Float32Array(n * 3), vs = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { ps[i * 3] = pos.x; ps[i * 3 + 1] = pos.y; ps[i * 3 + 2] = pos.z; vs[i * 3] = rnd(-7, 7); vs[i * 3 + 1] = rnd(2, 10); vs[i * 3 + 2] = rnd(-7, 7); }
    g.setAttribute('position', new THREE.BufferAttribute(ps, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffd680, size: 0.24, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.scene.add(m); this.fx.push({ m, g, ps, vs, n, life: 0.5 });
  }
  glassBits(pos, n) {
    n = Math.min(14, Math.max(2, n | 0)); const g = new THREE.BufferGeometry(), ps = new Float32Array(n * 3), vs = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { ps[i * 3] = pos.x; ps[i * 3 + 1] = pos.y; ps[i * 3 + 2] = pos.z; vs[i * 3] = rnd(-4, 4); vs[i * 3 + 1] = rnd(1, 6); vs[i * 3 + 2] = rnd(-4, 4); }
    g.setAttribute('position', new THREE.BufferAttribute(ps, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xbfe4ff, size: 0.14, transparent: true, opacity: 0.9, depthWrite: false }));
    this.scene.add(m); this.fx.push({ m, g, ps, vs, n, life: 0.55 });
  }
  // plough through a curbside cone / trash can and send it flying
  knockNearby(car, speed) {
    if (speed < 4 || !this.city.knockables) return;
    for (const k of this.city.knockables) { if (k.knocked) continue; const dx = car.pos.x - k.x, dz = car.pos.z - k.z; if (dx * dx + dz * dz < 6.5) this.knockProp(k, car.vx != null ? car.vx : Math.sin(car.yaw) * speed, car.vz != null ? car.vz : Math.cos(car.yaw) * speed); }
  }
  knockProp(k, vx, vz) {
    k.knocked = true; const m = k.m, wp = new THREE.Vector3(); m.getWorldPosition(wp); if (m.parent) m.parent.remove(m); m.position.copy(wp); this.scene.add(m);
    this.fx.push({ m, debris: true, vx: (vx || 0) * 0.45 + rnd(-2, 2), vy: rnd(3, 7), vz: (vz || 0) * 0.45 + rnd(-2, 2), sx: rnd(-9, 9), sy: rnd(-9, 9), sz2: rnd(-9, 9), life: 6 });
    this.sfxCrunch(0.35); this.camShake = Math.max(this.camShake || 0, 0.12);
  }
  // billboarded smoke / flame puff for damaged + burning cars
  carPuff(pos, hot) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: glowTexture(), color: hot ? 0xff7a2a : 0x24262b, transparent: true, opacity: hot ? 0.6 : 0.4, depthWrite: false, blending: hot ? THREE.AdditiveBlending : THREE.NormalBlending }));
    m.position.copy(pos); this.scene.add(m); this.fx.push({ m, puff: true, hot, life: hot ? 0.5 : 1.6, dur: hot ? 0.5 : 1.6, vy: hot ? 2.4 : 1.3, dx: rnd(-0.5, 0.5), age: 0 });
  }
  // dark tyre skid streak dropped on the road (pooled)
  skidMark(x, z, yaw) {
    if (!this.skids) this.skids = [];
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.7), new THREE.MeshBasicMaterial({ color: 0x080809, transparent: true, opacity: 0.5, depthWrite: false })); m.rotation.set(-Math.PI / 2, 0, -yaw); m.position.set(x, 0.075, z); m.renderOrder = 1;
    this.scene.add(m); this.skids.push(m); if (this.skids.length > 170) { const o = this.skids.shift(); this.scene.remove(o); o.geometry.dispose(); o.material.dispose(); }
  }
  // a scorched husk left behind when a car is destroyed (persists, capped)
  leaveWreck(car) {
    try { const husk = buildCar(0x14140f); husk.position.copy(car.pos); husk.position.y = 0.1; husk.rotation.y = car.yaw + rnd(-0.3, 0.3); husk.rotation.z = rnd(-0.09, 0.09);
      husk.traverse(o => { if (o.isMesh && o.material) { o.material = o.material.clone(); if (o.material.color) o.material.color.multiplyScalar(0.22); if (o.material.emissive) o.material.emissive.setHex(0x140a05); } });
      this.scene.add(husk); if (!this.wrecks) this.wrecks = []; this.wrecks.push(husk); if (this.wrecks.length > 8) { const old = this.wrecks.shift(); this.scene.remove(old); }
      for (let i = 0; i < 3; i++) this.carPuff(husk.position.clone().setY(1.1 + i * 0.3), false); } catch (e) {}
  }
  // ---- staged detonation: flash → radial fireball → debris → smoke column → scorch → chain reaction → shake + slow-mo ----
  explode(pos, scale, color) {
    scale = scale || 1; const dcol = color != null ? color : 0x2a2c30;
    // radial fireball particles
    const n = 90, g = new THREE.BufferGeometry(), ps = new Float32Array(n * 3), vs = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { ps[i * 3] = pos.x; ps[i * 3 + 1] = pos.y; ps[i * 3 + 2] = pos.z; const a = Math.random() * TAU, e = Math.acos(rnd(-1, 1)), sp = rnd(7, 24) * scale; vs[i * 3] = Math.sin(e) * Math.cos(a) * sp; vs[i * 3 + 1] = Math.abs(Math.cos(e)) * sp * 0.7 + 5; vs[i * 3 + 2] = Math.sin(e) * Math.sin(a) * sp; }
    g.setAttribute('position', new THREE.BufferAttribute(ps, 3));
    const baseSize = 1.9 * scale, m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: baseSize, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(m); this.fx.push({ m, g, ps, vs, n, life: 1.2, dur: 1.1, explode: true, baseSize, age: 0 });
    // primary white-hot flash sprite + blast light
    const flash = new THREE.Mesh(new THREE.SphereGeometry(1.6 * scale, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending })); flash.position.copy(pos); this.scene.add(flash); this.fx.push({ m: flash, flashBall: true, life: 0.16, dur: 0.14, age: 0 });
    const fl = new THREE.PointLight(0xffb060, 11 * scale, 52 * scale, 2); fl.position.set(pos.x, pos.y + 1, pos.z); this.scene.add(fl); this.fx.push({ flash: fl, life: 0.44, age: 0 });
    // debris chunks — ballistic boxes with spin that bounce and settle as wreckage
    for (let i = 0; i < 12; i++) { const sz = rnd(0.22, 0.5); const chunk = new THREE.Mesh(new THREE.BoxGeometry(sz, sz * rnd(0.4, 0.9), sz * rnd(0.6, 1.3)), mat(dcol, { roughness: 0.7, metalness: 0.4 })); chunk.position.set(pos.x, pos.y, pos.z); chunk.castShadow = true; this.scene.add(chunk); const a = Math.random() * TAU; this.fx.push({ debris: true, m: chunk, vx: Math.cos(a) * rnd(3, 10) * scale, vy: rnd(6, 14) * scale, vz: Math.sin(a) * rnd(3, 10) * scale, sx: rnd(-9, 9), sy: rnd(-9, 9), sz2: rnd(-9, 9), life: 7, age: 0 }); }
    // rising smoke column
    const sn = 26, sg = new THREE.BufferGeometry(), sp2 = new Float32Array(sn * 3), sv = new Float32Array(sn * 3);
    for (let i = 0; i < sn; i++) { sp2[i * 3] = pos.x + rnd(-1, 1); sp2[i * 3 + 1] = pos.y + rnd(0, 1.6); sp2[i * 3 + 2] = pos.z + rnd(-1, 1); sv[i * 3] = rnd(-0.6, 0.6); sv[i * 3 + 1] = rnd(1.6, 3.6); sv[i * 3 + 2] = rnd(-0.6, 0.6); }
    sg.setAttribute('position', new THREE.BufferAttribute(sp2, 3));
    const sm = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x17181c, size: 2.6 * scale, transparent: true, opacity: 0.62, depthWrite: false })); this.scene.add(sm); this.fx.push({ smoke: true, m: sm, g: sg, ps: sp2, vs: sv, n: sn, life: 3.4, dur: 3.4, baseSize: 2.6 * scale, age: 0 });
    // persistent scorch decal on the ground
    const scdec = new THREE.Mesh(new THREE.CircleGeometry(2.7 * scale, 22), new THREE.MeshBasicMaterial({ color: 0x080809, transparent: true, opacity: 0.78, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); scdec.rotation.x = -Math.PI / 2; scdec.position.set(pos.x, this.city.groundH(pos.x, pos.z) + 0.06, pos.z); this.scene.add(scdec); this.fx.push({ scorch: true, m: scdec, life: 22, dur: 22, age: 0 });
    const d = this.player.pos.distanceTo(pos); this.camShake = Math.max(this.camShake || 0, clamp(1 - d / 48, 0, 1) * 1.5 * scale);
    if (d < 55) this.triggerSlowMo(0.16, 0.3, 0.4, 0.75); // cinematic hit-stop when the blast is near
    this.hitFx(pos, 0xff8a2a, 20); this.scareBirds();
    // catch anyone in the blast; everyone within earshot flinches and rubbernecks toward it
    for (const nn of this.npcs) { if (nn.dead) continue; const dd = nn.pos.distanceTo(pos); if (dd < 6 * scale) { nn.damage(80); if (nn.scare) nn.scare(8); } else if (dd < 60) { if (nn.scare) nn.scare(3); if (!nn.cop && !nn.enemy) { nn.flee = Math.max(nn.flee || 0, 2.5); nn.yaw = Math.atan2(pos.x - nn.pos.x, pos.z - nn.pos.z); } } }
    if (this.player.pos.distanceTo(pos) < 5 * scale && !this.player.inCar) this.player.hurt(45 * scale);
    // chain reaction: nearby cars take heavy damage and cook off after a short random delay
    for (const oc of this.cars) { if (oc.boat || oc._boom) continue; if (oc.pos.distanceTo(pos) < 7.5 * scale) { oc.hp = (oc.hp == null ? 120 : oc.hp) - 95; if (oc.hp <= 0) { oc._boom = true; const dp = oc.pos.clone().setY(1.0), dc = oc.color; setTimeout(() => { if (!oc.removeMe) { this.explode(dp, 1.05, dc); oc.removeMe = true; } }, rnd(220, 750)); } } }
  }
  cull() { this.npcs = this.npcs.filter(n => { if (n.removeMe) { this.scene.remove(n.root); return false; } return true; }); this.cars = this.cars.filter(c => { if (c.removeMe) { this.scene.remove(c.root); return false; } return true; }); const civ = this.npcs.filter(n => !n.cop && !n.story).length; if (civ < 34) { this.spawnPed(); if (civ < 26) this.spawnPed(); } if (this.cars.filter(c => c.aiTraffic && !c.police).length < 15) this.spawnTraffic(); }
}
function raySphere(o, d, c, r) { const oc = o.clone().sub(c), b = oc.dot(d), cc = oc.dot(oc) - r * r, h = b * b - cc; if (h < 0) return null; const t = -b - Math.sqrt(h); return t >= 0 ? t : null; }

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------
