// CHAPTER 3 — FOLD THE WORLD. True 2.5D papercraft: Rin walks a 2D plane
// through a real 3D diorama. The mechanic is DEPTH: fold towers into bridges,
// rotate turntables to bring the background into the play plane, slide pop-up
// platforms between layers, unfold an accordion bridge, and finally cross a
// theater that rearranges itself.
import * as THREE from 'three';
import { paper, box, disc, pin, string, cutout, block, foldLine, arrowSign, buildRin, poseRin, buildVell, brass, wood } from './paper.js';
import { SONG_CH3, STING3 } from '../audio/songs/ch3.js';
import { clamp, lerp, damp, approach, ease, rng, makeCanvas } from '../core/util.js';

const RUN = 5.4, JUMP = 10.2, GRAV = 26, Y2 = 11.6;
const el = (cls, html = '') => { const e = document.createElement('div'); e.className = cls; e.innerHTML = html; return e; };

export function getRenderer(game) {
  if (!game.r3) { const r = new THREE.WebGLRenderer({ canvas: game.gl, antialias: true, powerPreference: 'high-performance' }); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace; game.r3 = r; }
  const r = game.r3; r.setPixelRatio(1); r.setSize(game.W, game.H, false); return r;
}

export default class Chapter3 {
  constructor(game) { this.game = game; this.id = 3; this.compositesOutgoing = true; }
  async load() {}
  controlsHelp() { return '<b>A/D</b> move · <b>SPACE</b> jump · <b>E</b> use a tab, crank or hinge<br>Everything here has a back. Bring the back to the front.'; }

  start({ checkpoint, handoff }) {
    const g = this.game; this.r = getRenderer(g); this.r.toneMappingExposure = 1.05; this.r.shadowMap.enabled = g.settings.shadows > 0;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#f2c9a0'); this.scene.fog = new THREE.Fog('#f2c9a0', 30, 70);
    this.cam = new THREE.PerspectiveCamera(32, 16 / 9, 0.5, 200); this.camT = new THREE.Vector3(); this.t = 0; this.said = {};
    this.solids = []; this.mechs = []; this.uses = []; this.sway = []; this.fin = null; this.ended = false; this.noPause = false;
    this.buildLights(); this.buildBackdrop(); this.buildWorld();
    this.rin = buildRin(); this.scene.add(this.rin); this.vell = buildVell(); this.scene.add(this.vell);
    this.cps = { start: [2, 0], disc: [18, 0], tabs: [33, 5], bridge: [50, Y2], theater: [63, Y2] };
    this.cp = checkpoint && this.cps[checkpoint] ? checkpoint : 'start';
    const [sx, sy] = this.cps[this.cp];
    this.p = { x: sx, y: sy, z: 0, vx: 0, vy: 0, w: 0.6, h: 1.55, ground: null, face: 1, walk: 0, coyote: 0, buf: 0, rider: null, pull: 0 };
    this.vp = new THREE.Vector3(sx - 2, sy + 2.5, 0.4);
    if (this.cp !== 'start') this.presolve(this.cp);
    this.ui = el('hud3'); this.prompt = el('prompt paper'); this.dlg = el('dlg paper', '<div class="who"></div><div class="txt"></div>'); this.titleEl = el('', ''); this.titleEl.style.cssText = 'position:absolute;left:0;right:0;top:16%;text-align:center;font:900 calc(var(--u)*46) Georgia,serif;letter-spacing:.14em;color:#3b2c22;text-shadow:0 2px 0 #fff3d6;transition:opacity 1s;opacity:0;pointer-events:none';
    this.titleEl.innerHTML = '<div style="font:700 calc(var(--u)*15) Trebuchet MS,sans-serif;letter-spacing:.5em;color:#e2603a">CHAPTER 3</div>FOLD THE WORLD';
    this.ui.append(this.prompt, this.dlg, this.titleEl); g.ui.appendChild(this.ui); this.prompt.style.display = this.dlg.style.display = 'none';
    g.show3d(true);
    if (handoff) { this.intro = { t: 0 }; this.noPause = true; g.c2d.style.transition = 'opacity 1.1s'; g.c2d.style.opacity = '0'; setTimeout(() => { g.clear2d(); g.c2d.style.transition = ''; g.c2d.style.opacity = '1'; g.director.releaseOutgoing(); }, 1200); this.buildWaves(); g.sfx.play('pp.fold'); g.sfx.play('fx.shimmer'); }
    else { g.clear2d(); this.intro = null; }
    g.audio.muffle(0); g.music.play(SONG_CH3, { section: 'A', intensity: 1, fade: 1.5 });
    setTimeout(() => { this.titleEl.style.opacity = '1'; setTimeout(() => { this.titleEl.style.opacity = '0'; }, 3200); }, handoff ? 3600 : 400);
    if (!handoff) this.say('hello', [{ who: 'vell', text: 'Papercraft! Mind the edges. Everything here has a back.' }]);
    this.snapCam();
  }
  stop() { this.ui?.remove(); this.game.show3d(false); this.scene?.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); this.scene = null; }
  say(key, lines) { if (this.said[key]) return; this.said[key] = true; this.game.dialogue.say(lines); }
  respawn() { const [x, y] = this.cps[this.cp]; Object.assign(this.p, { x, y, z: 0, vx: 0, vy: 0, rider: null }); this.game.sfx.play('pp.hurt'); }
  presolve(cp) { const order = ['start', 'disc', 'tabs', 'bridge', 'theater'], i = order.indexOf(cp); if (i >= 1) this.tower.fall(true); if (i >= 2) this.tt1.snap(-90); if (i >= 3) this.sliders.forEach((s) => s.set(true, true)); if (i >= 4) this.acc.u = this.acc.target = 1; }

  // ---- construction ----------------------------------------------------------------
  solid(x0, x1, y0, y1, on = true) { const s = { x0, x1, y0, y1, on, dx: 0, dy: 0 }; this.solids.push(s); return s; }
  ground(x0, x1, y1, col) { this.scene.add(block(x0, x1, y1 - 14, y1, col)); return this.solid(x0, x1, y1 - 14, y1); }
  buildLights() {
    const s = this.scene, q = this.game.settings.shadows;
    s.add(new THREE.HemisphereLight('#fff1d8', '#b98d7a', 0.95));
    const d = (this.sun = new THREE.DirectionalLight('#fff0d0', 2.3)); d.castShadow = q > 0; d.shadow.mapSize.set(q > 1 ? 2048 : 1024, q > 1 ? 2048 : 1024);
    const c = d.shadow.camera; c.left = -22; c.right = 22; c.top = 20; c.bottom = -16; c.near = 1; c.far = 80; d.shadow.bias = -0.0006; d.shadow.normalBias = 0.03; d.shadow.radius = 4;
    s.add(d); s.add(d.target);
    const rim = new THREE.DirectionalLight('#9fd8ff', 0.5); rim.position.set(10, 6, -10); s.add(rim);
  }
  buildBackdrop() {
    const s = this.scene, r = rng(31);
    const c = makeCanvas(16, 256), x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#9ed2d6'); gr.addColorStop(0.55, '#f6d9a8'); gr.addColorStop(1, '#f2a98a'); x.fillStyle = gr; x.fillRect(0, 0, 16, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const bd = new THREE.Mesh(new THREE.PlaneGeometry(260, 90), new THREE.MeshBasicMaterial({ map: t, fog: false })); bd.position.set(45, 14, -16); s.add(bd);
    s.add(disc(7, 0.1, paper('#fff3d6'), 20, 13, -15, 40));
    const cols = ['#eab08c', '#d98f76', '#9a6a7e'];
    for (let L = 0; L < 3; L++) { let px = -30; const z = -12.5 + L * 2.6; while (px < 120) { const w = r.range(2.5, 6), h = r.range(4, 13) + (px > 55 ? 11 : px > 28 ? 5 : 0) - L * 1.5; const b = box(w, h + 20, 0.12, paper(cols[L]), px + w / 2, h / 2 - 10 - L * 1.2, z); s.add(b);
      if (r.chance(0.5)) s.add(cutout([[0, 0], [w, 0], [w / 2, r.range(1, 2.4)]], 0.12, paper(cols[L]), px, h - L * 1.2, z));
      if (L > 0) for (let k = 0; k < 3; k++) if (r.chance(0.6)) { const win = box(0.5, 0.7, 0.03, paper('#fff3c4'), px + w * r.range(0.25, 0.75), h - 1.6 - k * 1.7 - L * 1.2, z + 0.08); win.castShadow = false; s.add(win); }
      px += w + r.range(0.2, 1.6); } }
    // clouds hung on strings
    for (let i = 0; i < 16; i++) { const cx = -10 + i * 7.5 + r.range(-2, 2), cy = r.range(9, 26), z = r.range(-6, -3.5), g = new THREE.Group(); const m = paper('#fffaf0'); g.add(disc(1.1, 0.06, m, 0, 0, 0)); g.add(disc(0.8, 0.06, m, 1.1, -0.15, 0.02)); g.add(disc(0.7, 0.06, m, -1.0, -0.2, 0.02)); g.add(box(2.6, 0.5, 0.06, m, 0.05, -0.55, 0.01)); g.add(string(0, 0.9, 30, 0)); g.position.set(cx, cy, z); s.add(g); this.sway.push({ g, a: r.range(0, 6), y: cy }); }
    // foreground cut-outs (near the lens) — turning gears and grass
    const dark = paper('#4a3140');
    for (let i = 0; i < 12; i++) { const gx = -6 + i * 9 + r.range(-2, 2), gy = i > 6 ? 7.6 : i > 3 ? 1.2 : -3.4, R = r.range(0.9, 1.5), pts = []; for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2, rr = k % 2 ? R : R * 0.82; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); } const gear = cutout(pts, 0.1, dark, gx, gy, 3.2); gear.add(pin(0, 0, 0.1, 0.14)); s.add(gear); this.sway.push({ gear, sp: (i % 2 ? 1 : -1) * 0.4 }); }
  }
  buildWorld() {
    const s = this.scene, add = (o) => { s.add(o); return o; };
    // --- room 1: the fold-down tower
    this.ground(-12, 10, 0, '#a9c79a'); this.ground(16, 31, 0, '#a9c79a');
    add(arrowSign(4, 2.2, -0.9)); add(box(0.08, 2.2, 0.08, wood, 4.1, 1.1, -0.95));
    this.tower = this.mkTower(10, 0, 1.2, 6.6);
    // --- room 2: turntable. The stairs start round the back.
    this.tt1 = this.mkTurntable(25.6, 0, 4.2, [
      { ang: 90, boxes: [{ r0: 1.4, r1: 2.4, y1: 1.6 }, { r0: 2.4, r1: 3.4, y1: 3.2 }, { r0: 3.4, r1: 4.4, y1: 4.7 }], col: '#e2a25a' },
      { ang: 270, boxes: [{ r0: 2.0, r1: 3.6, y1: 1.2 }], col: '#7fb7b0', tree: true },
    ]);
    this.use(21.2, 0, 'E — TURN  ⟲', () => this.tt1.rotate(1)); this.use(30.2, 0, 'E — TURN  ⟳', () => this.tt1.rotate(-1));
    add(this.crank(21.2, 0)); add(this.crank(30.2, 0));
    // --- room 3: pop-up tabs
    this.ground(31, 38, 5, '#e6c27a');
    const P = [[38.9, 41.1, 6.6], [42.1, 44.3, 8.3], [45.3, 47.5, 10]];
    this.sliders = P.map(([x0, x1, y], i) => this.mkSlider(x0, x1, y, i === 1));
    [[33, [0]], [34.6, [0, 1]], [36.2, [1, 2]]].forEach(([x, ids], i) => { add(this.tab(x, 5, i)); this.use(x, 5, 'E — PULL TAB ' + 'ABC'[i], () => { ids.forEach((k) => this.sliders[k].set(!this.sliders[k].inn)); this.game.sfx.play('pp.slide'); if (this.sliders.every((q) => q.inn)) { this.game.music.stinger(STING3.solve); this.game.sfx.play('pp.chime'); } }); });
    // --- room 4: accordion bridge
    this.ground(48.5, 53, Y2, '#a9c79a'); this.ground(61, 93, Y2, '#c98a6a');
    this.acc = this.mkAccordion(53, Y2, 8);
    add(this.crank(52, Y2)); this.use(52, Y2, 'E — CRANK', () => { this.acc.target = 1; this.game.sfx.play('pp.crank'); });
    this.buildTheater();
  }
  use(x, y, label, fn) { this.uses.push({ x, y, label, fn }); }
  crank(x, y) { const g = new THREE.Group(); g.add(box(0.5, 0.9, 0.5, paper('#8d6a44', 'card'), 0, 0.45, 0.9)); const w = disc(0.45, 0.08, wood, 0, 0.95, 1.2); g.add(w); g.add(box(0.1, 0.5, 0.1, brass, 0.25, 1.1, 1.3)); g.position.set(x, y, 0); g.userData.wheel = w; this.sway.push({ wheel: w, key: x }); return g; }
  tab(x, y, i) { const g = new THREE.Group(); g.add(box(0.7, 1.1, 0.05, paper(['#e2603a', '#2fa39a', '#c06fc0'][i]), 0, 0.55, 0.9)); g.add(arrowSign(-0.3, 0.6, 0.94)); g.add(box(0.9, 0.12, 0.3, paper('#8d6a44', 'card'), 0, 0.06, 0.9)); g.position.set(x, y, 0); return g; }

  mkTower(px, py, w, h) { // hinged at its base: topples sideways to span the gap
    const piv = new THREE.Group(); piv.position.set(px, py, 0); this.scene.add(piv);
    const body = new THREE.Group(); body.position.set(-w / 2, h / 2, 0); piv.add(body);
    body.add(box(w, h, 2.2, paper('#d98f76', 'card'))); body.add(box(w + 0.1, h - 0.2, 0.05, paper('#f1c9a0'), 0, 0, 1.12));
    for (let i = 0; i < 5; i++) body.add(box(0.5, 0.7, 0.03, paper('#fff3c4'), 0, -h / 2 + 1 + i * 1.2, 1.16));
    body.add(cutout([[-w / 2 - 0.2, 0], [w / 2 + 0.2, 0], [0, 1.1]], 2.3, paper('#b5574a'), 0, h / 2, 0));
    piv.add(pin(0, 0.05, 1.2, 0.14)); this.scene.add(foldLine(1.4, false, px - 1.3, py + 0.02, 1.25));
    const st = this.solid(px - w, px, py, py + h), ly = this.solid(px, px + h, py, py + w, false);
    const T = { piv, a: 0, falling: false, done: false, fall: (instant) => { if (T.done) return; T.falling = true; st.on = false; if (instant) { T.a = 1; T.finish(); } else this.game.sfx.play('pp.fold'); }, finish: () => { T.done = true; T.falling = false; ly.on = true; piv.rotation.z = -Math.PI / 2; },
      update: (dt) => { if (!T.falling) return; T.a = Math.min(1, T.a + dt * (0.5 + T.a * 2.2)); piv.rotation.z = -Math.PI / 2 * ease.outBounce(T.a); if (T.a >= 1) { T.finish(); this.game.sfx.play('pp.thunk'); this.shake = 0.5; this.game.music.stinger(STING3.solve); } } };
    this.mechs.push(T); this.use(px - w - 0.9, py, 'E — FOLD', () => T.fall()); return T;
  }
  mkTurntable(cx, cy, R, pieces, auto = 0) {
    const g = new THREE.Group(); g.position.set(cx, cy, 0); this.scene.add(g);
    g.add((() => { const d = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.3, R + 0.3, 0.3, 48), wood); d.position.y = 0.16; d.castShadow = d.receiveShadow = true; return d; })());
    g.add((() => { const d = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.1, R + 0.1, 0.05, 48), paper('#f1e2c0')); d.position.y = 0.34; d.receiveShadow = true; return d; })());
    const T = { g, th: 0, from: 0, to: 0, k: 1, pieces, auto, timer: auto, moving: false };
    for (const p of pieces) {
      const pg = new THREE.Group(); pg.rotation.y = (p.ang * Math.PI) / 180; g.add(pg); p.solids = [];
      for (const b of p.boxes) { const y0 = b.y0 ?? 0.3, w = b.r1 - b.r0; pg.add(box(w, b.y1 - y0, 2, paper(p.col, 'card'), (b.r0 + b.r1) / 2, (y0 + b.y1) / 2, 0)); pg.add(box(w + 0.08, 0.06, 2.1, paper('#fff3d6'), (b.r0 + b.r1) / 2, b.y1 + 0.03, 0)); p.solids.push(this.solid(0, 0, cy + y0, cy + b.y1, false)); }
      if (p.tree) { pg.add(box(0.2, 1.6, 0.2, wood, 2.8, 2.0, 0)); pg.add(disc(0.9, 0.08, paper('#6fae7a'), 2.8, 3.2, 0)); pg.add(disc(0.7, 0.08, paper('#8fc98a'), 2.5, 2.9, 0.1)); }
    }
    T.refresh = () => { for (const p of pieces) { const ph = ((((T.th + p.ang) % 360) + 360) % 360); p.solids.forEach((s, i) => { const b = p.boxes[i]; if (ph < 1 || ph > 359) { s.x0 = cx + b.r0; s.x1 = cx + b.r1; s.on = true; } else if (Math.abs(ph - 180) < 1) { s.x0 = cx - b.r1; s.x1 = cx - b.r0; s.on = true; } else s.on = false; }); } };
    T.snap = (deg) => { T.th = T.from = T.to = deg; g.rotation.y = (deg * Math.PI) / 180; T.refresh(); };
    T.rotate = (dir) => { if (T.moving) return; const pl = this.p; if (!pl.rider && pl.ground && pieces.some((p) => p.solids.includes(pl.ground))) pl.rider = { T, lr: pl.x - cx, y: pl.y, base: T.th }; T.moving = true; T.from = T.th; T.to = T.th + dir * 90; T.k = 0; for (const p of pieces) p.solids.forEach((s) => (s.on = false)); this.game.sfx.play('pp.crank'); this.game.sfx.play('pp.slide'); };
    T.update = (dt) => {
      if (auto && !T.moving) { T.timer -= dt; if (T.timer <= 0) { T.timer = auto; T.rotate(1); } }
      if (T.moving) { T.k = Math.min(1, T.k + dt / 0.9); T.th = lerp(T.from, T.to, ease.inOutCubic(T.k)); g.rotation.y = (T.th * Math.PI) / 180; if (T.k >= 1) { T.moving = false; T.th = T.to; T.refresh(); this.game.sfx.play('pp.thunk', { vol: 0.6 }); } }
      const pl = this.p; if (pl.rider && pl.rider.T === T) { const d = ((T.th - pl.rider.base) * Math.PI) / 180; pl.x = cx + pl.rider.lr * Math.cos(d); pl.z = -pl.rider.lr * Math.sin(d); pl.y = pl.rider.y; pl.vx = pl.vy = 0; if (!T.moving && Math.abs(pl.z) < 0.2) { pl.z = 0; pl.rider = null; } }
    };
    T.snap(0); this.mechs.push(T); return T;
  }
  mkSlider(x0, x1, y, inn) { // a pop-up platform on a rail that runs into the backdrop
    const g = new THREE.Group(), w = x1 - x0; g.add(box(w, 0.35, 2, paper('#e2a25a', 'card'), 0, -0.175, 0)); g.add(box(w + 0.1, 0.06, 2.1, paper('#fff3d6'), 0, 0.03, 0)); g.add(box(0.5, 0.12, 5.4, paper('#cbb994'), 0, -0.3, -2.6));
    g.position.set((x0 + x1) / 2, y, inn ? 0 : -3.4); this.scene.add(g); this.scene.add(box(0.3, 0.2, 4, wood, (x0 + x1) / 2, y - 0.5, -3.6));
    const s = this.solid(x0, x1, y - 0.35, y, inn), S = { g, s, inn, set: (v, instant) => { S.inn = v; if (instant) { g.position.z = v ? 0 : -3.4; s.on = v; } }, update: (dt) => { g.position.z = approach(g.position.z, S.inn ? 0 : -3.4, dt * 8); s.on = g.position.z > -0.35; } };
    this.mechs.push(S); return S;
  }
  mkAccordion(x, y, n) { // concertina bridge: zig-zag panels that pull flat
    const root = new THREE.Group(); root.position.set(x, y - 0.06, 0); this.scene.add(root); const panels = []; let parent = root;
    for (let i = 0; i < n; i++) { const piv = new THREE.Group(); piv.position.x = i ? 1 : 0; parent.add(piv); piv.add(box(1, 0.1, 2, paper(i % 2 ? '#e6c27a' : '#f1e2c0'), 0.5, 0, 0)); piv.add(pin(0, 0, 1.02, 0.06)); panels.push(piv); parent = piv; }
    const s = this.solid(x, x + n, y - 0.25, y, false), A = { u: 0, target: 0, update: (dt) => { const was = A.u; A.u = approach(A.u, A.target, dt * 0.55); const a = (1 - ease.inOutCubic(A.u)) * 1.48; panels.forEach((p, i) => { p.rotation.z = i === 0 ? a : (i % 2 ? -2 * a : 2 * a); }); s.on = A.u > 0.985; if (was < 0.985 && A.u >= 0.985) { this.game.sfx.play('pp.thunk'); this.game.music.stinger(STING3.solve); } if (A.u > was && Math.floor(A.u * 14) !== Math.floor(was * 14)) this.game.sfx.play('pp.crank'); } };
    this.mechs.push(A); return A;
  }
  buildTheater() {
    const s = this.scene, add = (o) => { s.add(o); return o; }, red = paper('#b5574a'), gold = paper('#e9c46a');
    // proscenium
    for (const x of [64, 92]) { add(box(1.2, 14, 1.2, red, x, Y2 + 7, 1.6)); add(box(1.5, 0.5, 1.5, gold, x, Y2 + 0.25, 1.6)); add(box(1.5, 0.5, 1.5, gold, x, Y2 + 13.8, 1.6)); }
    add(box(29.6, 1.4, 1.2, red, 78, Y2 + 14.7, 1.6)); add(cutout([[-3, 0], [3, 0], [2.2, 1.4], [0, 2], [-2.2, 1.4]], 0.1, gold, 78, Y2 + 15.4, 2.3));
    for (const [x, f] of [[65.4, 1], [90.6, -1]]) { const pts = []; for (let i = 0; i <= 12; i++) pts.push([f * (Math.sin(i * 1.3) * 0.35 + 1.1), 13 - i * 1.08]); pts.push([0, 0], [0, 13]); add(cutout(pts, 0.08, paper('#8f3d3a'), x - f * 0.6, Y2, 1.2)); }
    for (let x = 65.5; x < 91; x += 1.6) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd98a', emissiveIntensity: 1.4 })); b.position.set(x, Y2 + 0.16, 1.9); add(b); }
    // hinged scenery walls that fold away at the very end
    this.walls = []; const mkWall = (w, h, col, x, z, axis) => { const piv = new THREE.Group(); piv.position.set(x, Y2, z); const m = box(w, h, 0.1, paper(col), 0, h / 2, 0); piv.add(m); for (let i = 0; i < 9; i++) { const st = box(0.3, 0.3, 0.02, paper('#fff3c4'), (Math.sin(i * 7.1) * w) / 2.3, h * 0.35 + ((i * 1.7) % (h * 0.6)), 0.07); st.castShadow = false; piv.add(st); } add(piv); this.walls.push({ piv, axis }); };
    mkWall(27, 13.5, '#35406b', 78, -3.6, 'back'); mkWall(27, 6, '#52609a', 78, -3.2, 'back2');
    // 1) fly platform on strings
    const fg = new THREE.Group(); fg.add(box(2.2, 0.3, 1.8, paper('#e2a25a', 'card'), 0, -0.15, 0)); fg.add(box(2.3, 0.06, 1.9, paper('#fff3d6'), 0, 0.03, 0)); fg.add(string(-0.9, 0, 16, 0)); fg.add(string(0.9, 0, 16, 0)); add(fg);
    const fs = this.solid(66.4, 68.6, 0, 0); this.mechs.push({ update: (dt) => { const y = Y2 + 1.3 + 3.6 * (0.5 - 0.5 * Math.cos(this.t * 1.25)), prev = fs.y1; fg.position.set(67.5, y, 0); fs.y0 = y - 0.3; fs.y1 = y; fs.dy = prev ? y - prev : 0; } });
    // 2) the revolve: turns by itself, carries whoever stands on it through the depth of the stage
    this.tt2 = this.mkTurntable(74, Y2, 4, [{ ang: 180, boxes: [{ r0: 2, r1: 4, y1: 6.4, y0: 5.9 }, { r0: 2.8, r1: 3.2, y1: 5.9 }], col: '#7fb7b0' }, { ang: 0, boxes: [{ r0: 2, r1: 4, y1: 3.2, y0: 2.7 }, { r0: 2.8, r1: 3.2, y1: 2.7 }], col: '#e2a25a' }], 3.4);
    // 3) wing flats that slide in and out of the play plane
    this.wings = [[79.4, 81.6, Y2 + 7.5, 0], [82.6, 84.8, Y2 + 8.8, 1.7]].map(([x0, x1, y, ph]) => { const g = new THREE.Group(); g.add(box(x1 - x0, 0.3, 1.8, paper('#c06fc0', 'card'), 0, -0.15, 0)); g.add(box(x1 - x0 + 0.1, 0.06, 1.9, paper('#fff3d6'), 0, 0.03, 0)); g.add(box(0.3, 0.14, 6, wood, 0, -0.4, -2.6)); g.position.set((x0 + x1) / 2, y, -3.2); add(g); const sd = this.solid(x0, x1, y - 0.3, y, false); const W = { update: () => { const c = (this.t + ph) % 3.4, inn = c < 2.1, warn = c > 1.7 && c < 2.1; g.position.z = approach(g.position.z, inn ? 0 : -3.2, 0.14); g.position.x = (x0 + x1) / 2 + (warn ? Math.sin(this.t * 50) * 0.04 : 0); sd.on = g.position.z > -0.3; } }; this.mechs.push(W); return W; });
    // catwalk + the master ribbon
    add(box(7, 0.3, 1.8, paper('#8d6a44', 'card'), 89, Y2 + 9.95, 0)); add(box(7.1, 0.06, 1.9, paper('#fff3d6'), 89, Y2 + 10.13, 0)); for (const x of [86, 92]) add(string(x, Y2 + 10, Y2 + 16, 0.6)); this.solid(85.5, 92.5, Y2 + 9.8, Y2 + 10.1);
    this.ribbon = add(box(0.25, 3.4, 0.04, paper('#e2603a'), 90, Y2 + 12.2, 0.3)); add(disc(0.3, 0.06, gold, 90, Y2 + 10.6, 0.3));
    this.use(90, Y2 + 10.1, 'E — PULL THE RIBBON', () => this.startFinale());
    this.spot = new THREE.SpotLight('#ffffff', 0, 60, 0.25, 0.5, 1); this.spot.position.set(78, Y2 + 20, 10); this.spot.target.position.set(78, Y2 + 3, 0); add(this.spot); add(this.spot.target);
  }
  buildWaves() { // the ink sheets from Chapter 2, now real paper layers that sink away
    this.waves = []; const cols = ['#17131f', '#2b3350', '#3f5196', '#6b86c9'];
    for (let L = 0; L < 4; L++) { const pts = [[-40, -30]]; for (let x = -40; x <= 40; x += 1) pts.push([x, Math.sin(x * 0.55 + L * 2) * 0.5 + Math.sin(x * 1.3 + L) * 0.2 + L * 1.3]); pts.push([40, -30]); const m = cutout(pts, 0.06, paper(cols[L]), 2, 3, 4 - L * 1.2); this.scene.add(m); this.waves.push(m); }
  }

  // ---- finale: unfold the stage (PAPER → ISOMETRIC) ---------------------------------
  startFinale() {
    if (this.fin) return; const g = this.game; this.fin = { t: 0 }; this.noPause = true; g.sfx.play('pp.string'); g.sfx.play('pp.rumble'); g.music.setIntensity(2); g.dialogue.clear();
    g.dialogue.say([{ who: 'vell', text: 'The whole stage is one sheet. Of course it is.' }, { who: 'curator', text: 'Unfold it, then. Look at your world from above, Keeper. See how small the mess is.' }]);
    g.director.preload(4);
  }
  updateFinale(dt) {
    const f = this.fin, g = this.game; f.t += dt; const k = ease.inOutCubic(clamp((f.t - 0.6) / 3.2, 0, 1));
    this.ribbon.position.y = Y2 + 12.2 - Math.min(1.5, f.t * 3);
    for (const w of this.walls) w.piv.rotation.x = -k * Math.PI / 2 * (w.axis === 'back' ? 1 : 0.98);
    this.spot.intensity = 900 * clamp(f.t - 1, 0, 1); f.k = ease.inOutCubic(clamp((f.t - 1.5) / 4.5, 0, 1));
    if (Math.floor(f.t * 3) !== Math.floor((f.t - dt) * 3) && f.t < 4) g.sfx.play('pp.fold');
    if (f.t > 7.5 && !f.done) { f.done = true; const ok = g.director.handoff(4, { from3: true }); if (!ok) { this.ended = true; g.save.complete(3); g.director.end({ chapter: 3 }); } }
  }

  // ---- update --------------------------------------------------------------------
  update(dt, outgoing) {
    if (outgoing || !this.scene) return;
    const g = this.game, inp = g.input, p = this.p; this.t += dt;
    for (const s of this.solids) s.dy = 0;
    for (const m of this.mechs) m.update(dt);
    if (this.intro) { this.intro.t += dt; if (this.intro.t > 3.8) { this.intro = null; this.noPause = false; this.waves.forEach((w) => this.scene.remove(w)); this.say('hello', [{ who: 'rin', text: "I'm a puppet. With pins." }, { who: 'vell', text: "And I'm origami. Don't unfold me, it's rude." }, { who: 'vell', text: 'Mind the edges. Everything here has a back.' }]); } }
    if (this.fin) this.updateFinale(dt);
    const ctl = !this.intro && !this.fin && !p.rider, ax = ctl ? inp.axisX : 0;
    p.pull = Math.max(0, p.pull - dt);
    if (!p.rider) {
      p.vx = approach(p.vx, ax * RUN, (p.ground ? 46 : 26) * dt); if (Math.abs(ax) > 0.3) p.face = Math.sign(ax);
      if (ctl && inp.pressed.jump) p.buf = 0.12; else p.buf -= dt; if (p.ground) p.coyote = 0.1; else p.coyote -= dt;
      if (p.buf > 0 && p.coyote > 0) { p.vy = JUMP; p.buf = 0; p.coyote = 0; g.sfx.play('pp.jump'); }
      if (ctl && inp.released.jump && p.vy > 4) p.vy *= 0.5;
      p.vy = Math.max(p.vy - GRAV * dt, -22);
      if (p.ground && p.ground.dy) p.y += p.ground.dy;
      this.move(p, dt);
      if (p.ground) { p.walk += Math.abs(p.vx) * dt * 2.3; if (Math.abs(p.vx) > 1 && Math.floor(p.walk / Math.PI) !== Math.floor((p.walk - Math.abs(p.vx) * dt * 2.3) / Math.PI)) g.sfx.play('pp.step'); }
    }
    // interaction
    let near = null; if (ctl) for (const u of this.uses) if (Math.abs(u.x - p.x) < 1.3 && Math.abs(u.y - p.y) < 1.2) near = u;
    this.near = near; if (near && inp.pressed.interact) { near.fn(); p.pull = 0.4; g.sfx.play('pp.pin'); }
    // checkpoints / falls / story beats
    for (const k in this.cps) { const [cx, cy] = this.cps[k]; if (p.x > cx && Math.abs(p.y - cy) < 1 && cx > this.cps[this.cp][0]) { this.cp = k; g.save.setCheckpoint(3, k); } }
    if (p.y < (p.x > 45 ? Y2 - 9 : -9)) this.respawn();
    if (p.x > 5) this.say('fold', [{ who: 'vell', text: "See the dashed line under that tower? That's a hinge. Press E beside it." }]);
    if (p.x > 19) this.say('disc', [{ who: 'vell', text: 'The good stairs are round the back. Bring the back to the front.' }]);
    if (p.x > 32 && p.y > 4) this.say('tabs', [{ who: 'vell', text: 'Pop-up tabs. Each one moves a different set of platforms. Think like a book.' }]);
    if (p.x > 50 && p.y > 11) this.say('acc', [{ who: 'rin', text: 'Somebody built all this by hand.' }, { who: 'vell', text: 'Somebody LIVES in all this. Wave at the windows.' }]);
    if (p.x > 62.5 && p.y > 11) { if (!this.said.cur) { g.music.setIntensity(2); g.music.stinger(STING3.curator); } this.say('cur', [{ who: 'curator', text: 'Keeper. You are tracking ink across my stage.' }, { who: 'curator', text: 'One medium. One truth. I am only tidying.' }, { who: 'vell', text: "That's him. Climb. Don't let him flatten the conversation." }]); }
    // companion
    this.vp.x = damp(this.vp.x, p.x - p.face * 1.6, 2.5, dt); this.vp.y = damp(this.vp.y, p.y + 2.3 + Math.sin(this.t * 2) * 0.2, 2.5, dt);
    this.shake = Math.max(0, (this.shake || 0) - dt);
  }
  move(p, dt) {
    const hw = p.w / 2; p.x += p.vx * dt;
    for (const s of this.solids) if (s.on && p.x + hw > s.x0 && p.x - hw < s.x1 && p.y + p.h > s.y0 + 0.02 && p.y < s.y1 - 0.25) { if (p.vx > 0) p.x = s.x0 - hw; else if (p.vx < 0) p.x = s.x1 + hw; p.vx = 0; }
    const py = p.y; p.y += p.vy * dt; const was = p.ground; p.ground = null;
    for (const s of this.solids) if (s.on && p.x + hw > s.x0 + 0.02 && p.x - hw < s.x1 - 0.02 && p.y + p.h > s.y0 && p.y < s.y1) {
      if (p.vy <= 0 && py >= s.y1 - 0.3 - Math.abs(s.dy)) { p.y = s.y1; p.ground = s; if (p.vy < -9 && !was) { this.game.sfx.play('pp.land'); } p.vy = 0; }
      else if (p.vy > 0 && py + p.h <= s.y0 + 0.2) { p.y = s.y0 - p.h; p.vy = 0; }
    }
  }
  snapCam() { const p = this.p; this.camT.set(p.x + 1, p.y + 1.5, 0); this.cam.position.set(p.x + 2, p.y + 4, 17); this.cam.lookAt(this.camT); }

  // ---- render --------------------------------------------------------------------
  render(dt) {
    if (!this.scene) return; const g = this.game, p = this.p, r = this.r, t = this.t;
    if (r.domElement.width !== g.W || r.domElement.height !== g.H) r.setSize(g.W, g.H, false);
    this.rin.position.set(p.x, p.y, p.z + 0.05); this.rin.scale.x = p.face; this.rin.rotation.y = -p.face * 0.12 + (p.rider ? 0.3 : 0);
    poseRin(this.rin, { walk: p.walk, speed: p.vx, air: !p.ground && !p.rider, vy: p.vy, t, pull: p.pull > 0 });
    this.vell.position.copy(this.vp); this.vell.rotation.y = Math.sin(t * 1.4) * 0.5; this.vell.rotation.z = Math.sin(t * 2) * 0.1; this.vell.scale.x = p.x < this.vp.x ? -1 : 1;
    for (const s of this.sway) { if (s.g) { s.g.position.y = s.y + Math.sin(t * 0.8 + s.a) * 0.25; s.g.rotation.z = Math.sin(t * 0.6 + s.a) * 0.05; } if (s.gear) s.gear.rotation.z = t * s.sp; if (s.wheel) s.wheel.rotation.z = (this.tt1?.th || 0) * 0.05 + (this.acc?.u || 0) * 9; }
    // camera: gentle perspective so the layers part as you move
    const lookX = p.x + p.face * 1.2 + (p.x > 63 ? 2 : 0), tgt = new THREE.Vector3(lookX, p.y + 1.7 + (p.x > 63 ? 1.2 : 0), 0); this.camT.lerp(tgt, 1 - Math.exp(-4 * dt));
    let dist = p.x > 63 ? 22 : 17, fov = 32, off = new THREE.Vector3(1.4, 2.6, dist);
    if (this.intro) { const k = ease.inOutCubic(clamp(this.intro.t / 3.2, 0, 1)); this.scene.fog.near = 30 + (1 - k) * 300; this.scene.fog.far = 70 + (1 - k) * 300; fov = lerp(7, 32, k); off.set(lerp(0, 1.4, k), lerp(0.6, 2.6, k), lerp(110, dist, k)); this.waves.forEach((w, i) => { w.position.y = 3 - k * (9 + i * 2.5); w.position.z = 4 - i * 1.2 - 0.03 - k * i * 2; }); this.rin.scale.y = ease.outBack(clamp((this.intro.t - 1.6) / 0.9, 0.02, 1)); this.rin.rotation.x = -1.5 * (1 - clamp((this.intro.t - 1.6) / 0.9, 0, 1)); } else { this.rin.scale.y = 1; this.rin.rotation.x = 0; }
    if (this.fin) { const k = this.fin.k || 0; off.lerp(new THREE.Vector3(27, 30, 27), k); fov = lerp(32, 26, k); this.camT.lerpVectors(tgt, new THREE.Vector3(78, Y2 + 3, -1), k); }
    this.cam.fov = fov; this.cam.aspect = g.W / g.H; this.cam.updateProjectionMatrix();
    const want = this.camT.clone().add(off); this.cam.position.lerp(want, this.intro ? 1 : 1 - Math.exp(-5 * dt)); if (this.shake > 0) this.cam.position.y += Math.sin(t * 80) * this.shake * 0.15;
    this.cam.lookAt(this.camT);
    this.sun.position.set(this.camT.x - 9, this.camT.y + 16, 13); this.sun.target.position.set(this.camT.x, this.camT.y, 0);
    r.render(this.scene, this.cam);
    // DOM: prompt + dialogue
    const u = this.near; if (u) { const v = new THREE.Vector3(u.x, u.y + 2.6, 0.9).project(this.cam); this.prompt.style.display = 'block'; this.prompt.style.left = ((v.x + 1) / 2) * 100 + '%'; this.prompt.style.top = ((1 - v.y) / 2) * 100 + '%'; const [k, ...rest] = u.label.split(' — '); this.prompt.innerHTML = `<kbd>${k}</kbd>${rest.join(' — ')}`; } else this.prompt.style.display = 'none';
    const d = g.dialogue.current; if (d) { this.dlg.style.display = 'block'; this.dlg.firstChild.textContent = d.speaker.name; this.dlg.firstChild.style.color = d.speaker.color === '#f4f6ff' ? '#3b2c22' : d.speaker.color; this.dlg.lastChild.textContent = g.dialogue.visibleText; } else this.dlg.style.display = 'none';
  }
  perfInfo() { const i = this.r.info.render; return `calls ${i.calls} · tris ${i.triangles}`; }
}
