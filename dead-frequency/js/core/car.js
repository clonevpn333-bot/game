'use strict';
// Driving along a road spline. Interior view with working gauges, radio and rear-view mirror.

const Car = {
  active: false,
  road: null,
  s: 0, d: 1.8, th: 0, v: 0,
  rpm: 800,
  steer: 0,
  yaw: 0, pitch: -0.08,
  high: false,
  tune: 94.1,
  stations: [88.3, 90.7, 94.1, 98.9, 101.5, 104.3],
  events: [],
  canControl: true,
  canExit: false,
  maxSpeed: 24,
  speedLimit: 1,
  gravel: false,
  auto: null,

  build(color = 0x4d5b4a) {
    const g = new THREE.Group();
    this.group = g;
    // exterior (seen in mirrors / when others look) — body sides around the driver
    const dash = B.col(0x1c1b1a), plastic = B.col(0x2a2826), cloth = B.mat('carpet', { texArgs: ['#3b3a3c'] });
    const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.45 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x223040, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.9, depthWrite: false });
    // dashboard: curved vinyl profile extruded across the cabin
    const vinyl = B.mat('plain', { texArgs: ['#1e1c1a', 0.08, 41], roughness: 0.78 });
    const ds = new THREE.Shape();
    ds.moveTo(0.5, 0.42); ds.lineTo(0.56, 0.78); ds.quadraticCurveTo(0.6, 0.93, 0.74, 0.97); ds.lineTo(1.02, 1.0); ds.lineTo(1.12, 0.96); ds.lineTo(1.12, 0.42); ds.lineTo(0.5, 0.42);
    const dg = new THREE.ExtrudeGeometry(ds, { depth: 1.56, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 8 });
    dg.translate(0, 0, -0.78); dg.rotateY(-Math.PI / 2);
    const dm = new THREE.Mesh(dg, vinyl); g.add(dm);
    // defroster vent slots + dust on the dash top
    for (let k = 0; k < 6; k++) B.box(g, -0.5 + k * 0.2, 0.995, 0.98, 0.12, 0.004, 0.02, B.col(0x0a0a0a), { uv: 0, cast: false });
    // gauge hood
    const ghs = new THREE.Shape(); ghs.absarc(0, 0, 0.3, 0, Math.PI, false);
    const gh = new THREE.Mesh(new THREE.ExtrudeGeometry(ghs, { depth: 0.16, bevelEnabled: false, curveSegments: 12 }), vinyl);
    gh.scale.set(0.85, 0.26, 1); gh.position.set(0.37, 0.96, 0.6); g.add(gh);
    // windshield smudges (catch the light)
    const smC = TEX.canvas(256, 128), smx = smC.getContext('2d'); const sr = U.seeded(77);
    for (let k = 0; k < 40; k++) { smx.strokeStyle = `rgba(255,255,255,${0.05 + sr() * 0.12})`; smx.lineWidth = 1 + sr() * 3; smx.beginPath(); const cx2 = sr() * 256, cy2 = 60 + sr() * 70; smx.arc(cx2, cy2 + 60, 80 + sr() * 40, Math.PI * 1.15, Math.PI * 1.85); smx.stroke(); }
    for (let k = 0; k < 300; k++) { smx.fillStyle = `rgba(255,255,255,${sr() * 0.25})`; smx.fillRect(sr() * 256, sr() * 128, 1 + sr() * 2, 1 + sr() * 2); }
    const smudge = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.66), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(smC), transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x8899aa }));
    smudge.position.set(0, 1.26, 0.8); smudge.rotation.set(-0.55, 0, 0); smudge.rotation.order = 'YXZ'; smudge.rotation.y = Math.PI; g.add(smudge);
    // headliner, visors, dome light
    const liner = B.mat('carpet', { texArgs: ['#4a4640'], roughness: 0.98, env: 0.2 });
    B.box(g, 0, 1.58, -0.4, 1.5, 0.04, 1.7, liner, { cast: false });
    for (const sx of [-1, 1]) { const v = B.box(g, sx * 0.36, 1.545, 0.4, 0.46, 0.025, 0.18, liner, { cast: false }); v.rotation.x = 0.05; }
    B.box(g, 0, 1.56, -0.3, 0.18, 0.02, 0.1, B.col(0x9a948a), { cast: false });
    // door panels + side window frames
    const doorM = B.mat('plain', { texArgs: ['#2c2a28', 0.06, 43], roughness: 0.75 });
    for (const sx of [-1, 1]) {
      B.box(g, sx * 0.8, 0.3, -0.1, 0.05, 0.68, 1.4, doorM, { cast: false });
      B.box(g, sx * 0.76, 0.72, -0.05, 0.06, 0.05, 0.7, B.mat('carpet', { texArgs: ['#4a4642'] }), { cast: false }); // armrest
      B.box(g, sx * 0.77, 0.86, 0.35, 0.02, 0.03, 0.1, B.col(0x8a8a8a), { cast: false }); // handle
      B.box(g, sx * 0.8, 0.97, -0.1, 0.04, 0.05, 1.4, doorM, { cast: false }); // sill under window
    }
    // gauge cluster (dynamic)
    this.gaugeTex = TEX.dynamic(512, 160, (c, w, h, mph = 0, rpm = 0, fuel = 0.5, lights = false) => {
      c.drawImage(TEX.get('gauge').image, 0, 0);
      const needle = (cx, f) => { const a = Math.PI * 0.8 + f * Math.PI * 1.4; c.strokeStyle = '#ff6a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(cx, 90); c.lineTo(cx + Math.cos(a) * 55, 90 + Math.sin(a) * 55); c.stroke(); c.fillStyle = '#222'; c.beginPath(); c.arc(cx, 90, 6, 0, 7); c.fill(); };
      needle(130, mph / 100); needle(382, rpm / 6000);
      c.fillStyle = '#ff6a3a'; c.fillRect(226 + fuel * 50, 112, 3, 12);
      if (lights) { c.fillStyle = '#4af'; c.font = 'bold 14px Arial'; c.fillText('≡D', 245, 40); }
    });
    const gm = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.16), new THREE.MeshBasicMaterial({ map: this.gaugeTex.tex, color: 0x9aa89a }));
    gm.position.set(0.37, 0.885, 0.575); g.add(gm); gm.lookAt(0.37, 1.28, -0.12);
        // steering wheel
    this.wheel = new THREE.Group(); this.wheel.position.set(0.37, 0.92, 0.42); this.wheel.rotation.x = -0.5; g.add(this.wheel);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.019, 10, 32), new THREE.MeshStandardMaterial({ color: 0x141312, roughness: 0.55 })); this.wheel.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.05, 10), B.col(0x181818)); hub.rotation.x = Math.PI / 2; this.wheel.add(hub);
    for (const a of [0, 2.1, -2.1]) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.025, 0.015), B.col(0x181818)); sp.position.set(Math.cos(a - Math.PI / 2) * 0.09, Math.sin(a - Math.PI / 2) * 0.09, 0); sp.rotation.z = a - Math.PI / 2; this.wheel.add(sp); }
    const col = B.cyl(g, 0.37, 0.72, 0.52, 0.035, 0.045, 0.3, plastic, { rx: -1.05 }); void col;
    // radio (dynamic display)
    this.radioTex = TEX.dynamic(256, 64, (c, w, h, f = 94.1, lit = true) => {
      c.fillStyle = '#0a0705'; c.fillRect(0, 0, 256, 64);
      c.fillStyle = lit ? '#ffae3a' : '#3a2410'; c.font = 'bold 40px "Courier New", monospace'; c.fillText((f).toFixed(1), 70, 46);
      c.font = '14px Arial'; c.fillText('FM', 30, 44); c.fillText('ST', 200, 22);
    });
    B.box(g, 0.0, 0.56, 0.5, 0.36, 0.22, 0.08, plastic);
    const rd = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05), new THREE.MeshBasicMaterial({ map: this.radioTex.tex })); rd.position.set(0.05, 0.92, 0.778); rd.rotation.y = Math.PI; rd.rotation.x = 0.0; g.add(rd);
    rd.rotation.set(0, 0, 0); rd.position.set(0.0, 0.7, 0.458); rd.lookAt(0.0, 0.75, -0.5);
    for (const sx of [-0.13, 0.13]) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 8), B.col(0x777777)); k.rotation.x = Math.PI / 2; k.position.set(sx, 0.66, 0.455); g.add(k); }
    // seats + floor + doors
    B.box(g, -0.37, 0.25, -0.05, 0.55, 0.25, 0.55, cloth); B.box(g, -0.37, 0.5, -0.38, 0.55, 0.7, 0.14, cloth);
    B.box(g, 0.37, 0.25, -0.05, 0.55, 0.25, 0.55, cloth); B.box(g, 0.37, 0.5, -0.38, 0.55, 0.7, 0.14, cloth);
    B.box(g, 0, 0.1, 0.1, 1.6, 0.12, 2.6, B.col(0x1a1a1a));
    B.box(g, 0, 0.35, 0.2, 0.22, 0.3, 0.8, plastic); // console
    // roof + pillars
    for (const sx of [-1, 1]) { const ap = B.box(g, sx * 0.74, 0.97, 0.8, 0.06, 0.66, 0.06, plastic); ap.rotation.x = 0.6; ap.rotation.z = -sx * 0.06; const bp = B.box(g, sx * 0.79, 0.95, -0.58, 0.07, 0.6, 0.12, plastic); void bp; }
    // hood
    const hd = B.box(g, 0, 0.74, 1.95, 1.62, 0.08, 1.75, paint, { uv: 0 }); hd.rotation.x = 0.07; hd.material = paint.clone(); hd.material.envMapIntensity = 0.25;
    B.box(g, 0, 0.2, 2.0, 1.7, 0.6, 1.7, paint);
    B.box(g, 0, 0.3, -1.6, 1.7, 0.7, 1.4, paint);
    // windshield + side glass
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.7), glassMat); ws.position.set(0, 1.25, 0.82); ws.rotation.x = 0.55; ws.rotation.y = Math.PI; g.add(ws);
    // rear-view mirror
    this.mirrorView = Engine.addView({ w: 192, h: 64, fps: 15, camera: new THREE.PerspectiveCamera(45, 3, 0.5, 300), enabled: () => this.active, hide: [], before: (v) => {
      const cam = v.camera; this.group.updateMatrixWorld();
      cam.position.copy(this.group.localToWorld(new THREE.Vector3(0, 1.45, -1.2)));
      cam.lookAt(this.group.localToWorld(new THREE.Vector3(0, 1.3, -10)));
    } });
    this.mirrorView.hide = [];
    const mm = new THREE.ShaderMaterial({ uniforms: { map: { value: this.mirrorView.rt.texture } }, vertexShader: `varying vec2 vUv; void main(){ vUv = vec2(1.-uv.x, uv.y); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`, fragmentShader: `uniform sampler2D map; varying vec2 vUv; void main(){ vec3 c = texture2D(map, vUv).rgb; gl_FragColor = vec4(c*0.85, 1.); }` });
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.085), mm); mirror.position.set(0, 1.42, 0.62); mirror.rotation.y = Math.PI; mirror.lookAt(0.37, 1.2, -0.2); g.add(mirror);
    B.box(g, 0, 1.38, 0.63, 0.28, 0.1, 0.03, plastic);
    // headlights
    this.lights = [];
    for (const sx of [-0.6, 0.6]) { const s = new THREE.SpotLight(0xfff2d0, 80, 55, 0.42, 0.55, 1.15); s.position.set(sx, 0.75, 2.8); s.target.position.set(sx * 0.5, 0, 18); g.add(s); g.add(s.target); this.lights.push(s); }
    this.lights[0].castShadow = true; this.lights[0].shadow.mapSize.set(512, 512); this.lights[0].shadow.camera.far = 60;
    this.dashLight = new THREE.PointLight(0x6ad0a0, 0.4, 1.4, 2); this.dashLight.position.set(0.37, 1.05, 0.6); g.add(this.dashLight);
    // taillight glow (seen in mirror)
    const tl = new THREE.PointLight(0xff2010, 2, 6, 2); tl.position.set(0, 0.8, -2.4); g.add(tl);
    g.traverse(o => { if (o.isMesh) { o.castShadow = false; } });
    this.mirrorView.hide = [g];
    return g;
  },

  // road: { length, sample(s) -> {p:Vector3, t:Vector3(tangent), r:Vector3(right), k:curvature, w:halfWidth} }
  start(road, o = {}) {
    this.road = road;
    if (!this.group || this.groupLevel !== G.level) { this.build(o.color); G.level.add(this.group); this.groupLevel = G.level; }
    this.s = o.s || 0; this.d = o.d == null ? 1.8 : o.d; this.th = 0; this.v = o.v || 0; this.steer = 0;
    this.endS = o.endS || road.length - 5; this.onEnd = o.onEnd || null; this.ended = false;
    this.events = (o.events || []).map(e => Object.assign({ done: false }, e));
    this.canControl = o.control !== false; this.auto = null;
    this.maxSpeed = o.maxSpeed || 24;
    this.active = true; G.mode = 'car';
    this.yaw = 0; this.pitch = -0.06;
    this.engine = SND.loop('engine', { bus: 'sfx', vol: 0.55, persist: false }); G.level.loops.push(this.engine);
    this.radio = G.level.speaker({ kind: 'radio', tune: this.tune, vol: o.radioVol == null ? 0.55 : o.radioVol, bus: 'radio' });
    this.radioOn = o.radioOn !== false; if (!this.radioOn) this.radio.volume(0, 0.05);
    SND.muffle(1600, 0.7, 0.4);
    this.setHeadlights(o.headlights !== false);
    UI.crosshair(false);
    this.place();
  },
  // sit in a parked car prop (no driving): interior view, radio, look around
  park(prop, o = {}) {
    this.build(o.color || 0x4d5b4a); G.level.add(this.group); this.groupLevel = G.level;
    this.group.position.copy(prop.position); this.group.rotation.set(0, prop.rotation.y, 0);
    prop.visible = false; this.parkProp = prop;
    this.parked = true; this.active = true; this.road = null; this.v = 0; G.mode = 'car';
    this.yaw = o.yaw || 0; this.pitch = -0.05;
    this.setHeadlights(!!o.headlights);
    this.radio = o.radio ? G.level.speaker({ kind: 'radio', tune: 94.1, vol: o.radioVol || 0.5, bus: 'radio' }) : null;
    this.engine = o.engine ? SND.loop('engine', { bus: 'sfx', vol: 0.4 }) : null; if (this.engine) { this.engine.set('rpm', 800); G.level.loops.push(this.engine); }
    if (this.radioTex) this.radioTex.redraw(94.1, !!o.radio);
    SND.muffle(1800, 0.75, 0.3);
    UI.crosshair(false);
    this.placeParked();
  },
  unpark(sideOffset = 1.4) {
    if (!this.parked) return;
    const prop = this.parkProp;
    this.parked = false; this.active = false;
    if (this.radio) { this.radio.stop(); this.radio = null; }
    if (this.engine) { this.engine.stop(0.4); this.engine = null; }
    if (this.group && this.group.parent) this.group.parent.remove(this.group);
    this.groupLevel = null;
    prop.visible = true;
    SND.muffle(20000, 1, 0.3);
    UI.crosshair(true);
    G.mode = 'walk';
    // stand up on the driver's side (car local -x is the driver's left)
    const yaw = prop.rotation.y;
    const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)); // local +x in world
    const p = prop.position.clone().addScaledVector(side, sideOffset);
    Player.place(p.x, p.z, yaw + Math.PI);
  },
  placeParked() {
    const cam = G.camera; this.group.updateMatrixWorld();
    cam.position.copy(this.group.localToWorld(new THREE.Vector3(0.37, 1.28, -0.12)));
    cam.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.group.rotation.y + Math.PI + this.yaw, 0, 'YXZ'));
  },
  stop() {
    this.active = false;
    if (this.engine) { this.engine.stop(0.6); this.engine = null; }
    if (this.radio) { this.radio.stop(); this.radio = null; }
    SND.muffle(20000, 1, 0.3);
    UI.crosshair(true);
    G.mode = 'walk';
  },
  setHeadlights(on) { this.headOn = on; this.lights.forEach(l => { l.visible = on; }); this.applyBeams(); },
  applyBeams() { for (const l of this.lights) { l.intensity = this.high ? 140 : 80; l.distance = this.high ? 95 : 55; l.angle = this.high ? 0.5 : 0.42; l.target.position.y = this.high ? 1.2 : 0; } },
  setTune(f) { this.tune = f; if (this.radio) this.radio.set('tune', f); this.radioTex.redraw(f, true); },
  setReception(r) { if (this.radio) this.radio.set('reception', r); },

  place() {
    const smp = this.road.sample(this.s);
    const p = smp.p.clone().addScaledVector(smp.r, this.d);
    const roadYaw = Math.atan2(smp.t.x, smp.t.z);
    const yaw = roadYaw + this.th;
    this.group.position.set(p.x, p.y, p.z);
    this.group.rotation.set(-Math.asin(U.clamp(smp.t.y, -1, 1)) * 0.9, yaw, 0, 'YXZ');
    this.worldYaw = yaw;
    // camera in driver's seat
    const cam = G.camera;
    const seat = this.group.localToWorld(new THREE.Vector3(0.37, 1.28 + Math.sin(G.time * 13) * 0.002 * Math.min(1, this.v / 10), -0.12));
    cam.position.copy(seat);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, yaw + Math.PI + this.yaw, 0, 'YXZ'));
    // camera looks along -z; car forward is +z → add PI
    cam.quaternion.copy(q);
    cam.rotateX(this.group.rotation.x * -1);
  },

  update(dt) {
    if (!this.active) return;
    // look around
    if (Input.locked && !Phone.open && !this.lookLocked) {
      const sens = 0.0022 * G.settings.sens;
      this.yaw = U.clamp(this.yaw - Input.mdx * sens, -1.9, 1.9);
      this.pitch = U.clamp(this.pitch - Input.mdy * sens * (G.settings.invertY ? -1 : 1), -0.6, 0.45);
    }
    if (this.parked) { this.placeParked(); return; }
    let thr = 0, brk = 0, st = 0;
    if (this.auto) { thr = this.auto.thr; brk = this.auto.brk; st = this.auto.steer || 0; }
    else if (this.canControl && !Phone.open) {
      thr = Input.held('KeyW') ? 1 : 0; brk = Input.held('KeyS') ? 1 : 0; st = Input.axis('KeyD', 'KeyA');
      if (Input.held('Space')) brk = 1;
      if (Input.pressed('KeyH')) { this.high = !this.high; this.applyBeams(); SND.sfx('click', { f: 2000 }); }
      if (Input.pressed('KeyR')) { const i = this.stations.indexOf(this.tune); this.setTune(this.stations[(i + 1) % this.stations.length]); SND.sfx('click', { f: 3200, v: 0.6 }); Bus.emit('tune', this.tune); }
    }
    const smp = this.road.sample(this.s);
    // longitudinal
    const max = this.maxSpeed * this.speedLimit;
    if (thr) this.v += (this.v < max ? 4.2 * (1 - this.v / (max + 4)) : -2) * dt;
    if (brk) { if (this.v > 0.3) this.v -= 9 * dt; else this.v = Math.max(-3, this.v - 2 * dt); }
    if (!thr && !brk) this.v -= Math.sign(this.v) * Math.min(Math.abs(this.v), (0.6 + Math.abs(this.v) * 0.02) * dt);
    if (this.gravel) this.v = Math.min(this.v, 12);
    // steering: heading relative to road
    this.steer = U.damp(this.steer, st, 6, dt);
    const sv = Math.max(-5, Math.min(this.v, 25));
    this.th += (this.steer * 0.55 / (1 + Math.abs(sv) * 0.04)) * sv * dt * 0.09 * 2.2;
    this.th -= smp.k * sv * dt;          // road bends under you
    if (Math.abs(st) < 0.1 && Math.abs(this.v) > 1) this.th = U.damp(this.th, this.th * 0.6 + (this.d - (this.lane == null ? 1.8 : this.lane)) * 0.03, 0.9, dt); // gentle lane assist
    this.th = U.clamp(this.th, -0.9, 0.9);
    this.d -= Math.sin(this.th) * sv * dt;
    this.s += Math.cos(this.th) * sv * dt;
    // edges
    const lim = (smp.w || 3.6) + 0.9;
    if (Math.abs(this.d) > lim) {
      this.d = Math.sign(this.d) * lim; this.th *= 0.3;
      if (Math.abs(this.v) > 4) { SND.sfx('thud', { v: Math.min(1, this.v / 15) }); Engine.shake(0.05, 0.3); }
      this.v *= 0.92;
    }
    if (Math.abs(this.d) > (smp.w || 3.6) - 0.3 && Math.abs(this.v) > 3 && Math.random() < dt * 8) SND.sfx('step', { surface: 'gravel', v: 0.6 });
    this.s = Math.max(0.5, this.s);
    // rpm & audio
    const gearSpeeds = [0, 7, 13, 19, 26, 40];
    let gear = 1; while (gear < 4 && this.v > gearSpeeds[gear]) gear++;
    const lo = gearSpeeds[gear - 1], hi = gearSpeeds[gear];
    const targ = Math.abs(this.v) < 0.5 ? 780 : 1200 + ((Math.abs(this.v) - lo) / (hi - lo)) * 3000 + thr * 300;
    this.rpm = U.damp(this.rpm, targ, 5, dt);
    if (this.engine) { this.engine.set('rpm', this.rpm); this.engine.set('load', thr); this.engine.set('speed', Math.abs(this.v)); }
    this.wheel.rotation.z = -this.steer * 1.4;
    this._gT = (this._gT || 0) - dt;
    if (this._gT <= 0) { this._gT = 0.1; this.gaugeTex.redraw(Math.abs(this.v) * 2.237, this.rpm, this.fuel == null ? 0.55 : this.fuel, this.high); }
    // events
    for (const e of this.events) if (!e.done && this.s >= e.s) { e.done = true; try { e.fn(); } catch (err) { console.error(err); } }
    if (!this.ended && this.s >= this.endS) { this.ended = true; if (this.onEnd) { try { this.onEnd(); } catch (e) { if (!(e && e.cancelled)) throw e; } } }
    this.place();
  },
  // helpers for scripts
  brakeTo(v, dur = 1.5) { this.auto = { thr: 0, brk: 1 }; return Story.until(() => this.v <= v, dur + 3).then(() => { this.auto = null; }); },
};
