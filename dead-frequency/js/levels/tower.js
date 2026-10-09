'use strict';
// Kessler Ridge transmitter site: guyed tower, new transmitter building, 1962 building, generator, forest + creek loop.
//
//  New building  x 0..10,  z -6..0   (front door south at x=3, back door north at x=8)
//  Old building  x -25..-19, z 15.5..20.5 (door east at z=18)
//  Generator pen around (15,-3). Power pole / disconnect at (13,4). Tower base (-8,-16).
//  Buick hidden at (5,-11.5). Evan's car (13,11). Gate on access road (36,50).

const TOWER = {
  newB: { x0: 0, x1: 10, z0: -6, z1: 0 },
  oldB: { x0: -25, x1: -19, z0: 15.5, z1: 20.5 },
  trail: [[-1, -9], [-6, -26], [-18, -40], [-34, -50], [-52, -48], [-62, -34], [-66, -16], [-64, 2], [-58, 16], [-46, 24], [-34, 22], [-26, 19]],
};

Levels.tower = function (o = {}) {
  const L = new Level('tower');
  G.buildLevel = L;
  const R = L.root;
  L.defaultSurface = 'leaves';
  L.reverb = [1.4, 2.2, 0.12];
  L.fog = new THREE.FogExp2(0x060810, 0.034);
  L.background = new THREE.Color(0x020308);
  const nb = TOWER.newB, ob = TOWER.oldB;

  // ---------- terrain ----------
  const rectDist = (x, z, r) => { const dx = Math.max(r.x0 - x, 0, x - r.x1), dz = Math.max(r.z0 - z, 0, z - r.z1); return Math.hypot(dx, dz); };
  const core = { x0: -12, x1: 20, z0: -14, z1: 14 };
  const raw = (x, z) => 0.07 * x - 0.03 * z - 4.5 * Math.exp(-((x + 62) * (x + 62)) / 160) + (U.fbm(x * 0.04, z * 0.04, 31, 3) - 0.5) * 3.2;
  const oldY = raw(-22, 18);
  const h = (x, z) => {
    if (x >= ob.x0 - 0.5 && x <= ob.x1 + 0.5 && z >= ob.z0 - 0.5 && z <= ob.z1 + 0.5) return oldY;
    const dc = rectDist(x, z, core);
    const k = U.smooth(U.clamp(dc / 14, 0, 1));
    let y = U.lerp(0, raw(x, z), k);
    const dOld = rectDist(x, z, { x0: ob.x0 - 2, x1: ob.x1 + 2, z0: ob.z0 - 2, z1: ob.z1 + 2 });
    if (dOld < 6) y = U.lerp(oldY, y, U.smooth(dOld / 6));
    return y;
  };
  L.groundFn = h;
  const tg = new THREE.PlaneGeometry(300, 300, 150, 150); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position, tuv = tg.attributes.uv;
  for (let i = 0; i < tp.count; i++) { const x = tp.getX(i), z = tp.getZ(i); tp.setY(i, h(x, z) - 0.02); tuv.setXY(i, x / 5, z / 5); }
  tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, B.mat('forestFloor')); terrain.receiveShadow = true; R.add(terrain);
  // gravel pad conforming to terrain
  const pad = new THREE.PlaneGeometry(40, 32, 40, 32); pad.rotateX(-Math.PI / 2);
  const pp = pad.attributes.position, puv = pad.attributes.uv;
  for (let i = 0; i < pp.count; i++) { const x = pp.getX(i) + 6, z = pp.getZ(i) + 1; pp.setX(i, x); pp.setZ(i, z); pp.setY(i, h(x, z) + 0.01); puv.setXY(i, x / 3, z / 3); }
  pad.computeVertexNormals();
  R.add(new THREE.Mesh(pad, B.mat('gravel')));
  L.surface(-14, -15, 26, 17, 'gravel');
  // access road (gravel) from the gate to the pad
  const roadPts = [[36, 50], [30, 36], [22, 24], [16, 14]];
  const trailRibbon = (ptsIn, w, mat, surf, step = 1) => {
    const c = new THREE.CatmullRomCurve3(ptsIn.map(p => new THREE.Vector3(p[0], 0, p[1])));
    const n = Math.floor(c.getLength() / step); const sp = c.getSpacedPoints(n);
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const a = sp[Math.max(0, i - 1)], b = sp[Math.min(n, i + 1)]; const t = b.clone().sub(a).normalize(); const rr = new THREE.Vector3(-t.z, 0, t.x);
      for (const sd of [-1, 1]) { const p = sp[i].clone().addScaledVector(rr, sd * w / 2); pos.push(p.x, h(p.x, p.z) + 0.03, p.z); uv.push(sd > 0 ? 1 : 0, i * step / 3); }
      if (surf) L.surface(sp[i].x - w / 2, sp[i].z - w / 2, sp[i].x + w / 2, sp[i].z + w / 2, surf);
    }
    for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; R.add(m); return sp;
  };
  trailRibbon(roadPts, 4.5, B.mat('gravel', { side: THREE.DoubleSide }), 'gravel');
  const trailPts = trailRibbon(TOWER.trail, 1.4, B.mat('dirt', { side: THREE.DoubleSide }), 'mud');
  L.trailPts = trailPts;
  trailRibbon([[-26, 18], [-20, 12], [-12, 6], [-6, 4]], 1.2, B.mat('dirt', { side: THREE.DoubleSide }), 'mud');

  // ---------- new transmitter building ----------
  const cb = B.mat('cinder'), dry = B.mat('cinder', { texArgs: ['#bdb8ac'] }), conc = B.mat('concrete', { texArgs: [110] });
  const HB = 3.0;
  B.box(R, 5, -0.25, -3, 10.6, 0.3, 6.6, conc, { uv: 2 });
  B.floor(R, nb.x0, nb.z0, nb.x1, nb.z1, 0.06, B.mat('vct', { texArgs: ['#9aa0a0', '#8e9494'] }), 0.6);
  L.surface(nb.x0, nb.z0, nb.x1, nb.z1, 'tile');
  B.ceiling(R, nb.x0, nb.z0, nb.x1, nb.z1, HB, B.mat('concrete', { texArgs: [150] }), 2);
  B.box(R, 5, HB, -3, 10.4, 0.25, 6.4, B.col(0x3a3a3a), { uv: 0 });
  const wX = (minus, plus) => [dry, dry, dry, dry, plus, minus], wZ = (minus, plus) => [plus, minus, dry, dry, dry, dry];
  B.wallX(R, nb.x0 - 0.1, nb.x1 + 0.1, nb.z1, HB, 0.2, wX(dry, cb), [{ at: 3, w: 1.0, h: 2.1 }]);
  B.wallX(R, nb.x0 - 0.1, nb.x1 + 0.1, nb.z0, HB, 0.2, wX(cb, dry), [{ at: 8, w: 0.95, h: 2.1 }]);
  B.wallZ(R, nb.z0, nb.z1, nb.x0, HB, 0.2, wZ(cb, dry));
  B.wallZ(R, nb.z0, nb.z1, nb.x1, HB, 0.2, wZ(dry, cb), [{ at: -3, w: 0.8, h: 1.9, sill: 1.3 }]);
  B.windowFrame(R, nb.x1, 1.3, -3, 0.8, 0.6, 'z');
  for (let i = 0; i < 4; i++) B.box(R, nb.x1 + 0.12, 1.3, -3.3 + i * 0.2, 0.03, 0.6, 0.03, B.col(0x333333)); // bars
  // closet in NE corner (hiding)
  B.wallX(R, 8.6, 10, -4.4, HB, 0.1, dry, [{ at: 9.3, w: 0.8 }]);
  B.wallZ(R, -6, -4.4, 8.6, HB, 0.1, dry);
  const D = L.named.doors = {};
  const steel = B.mat('metal', { color: 0x8a8e88 });
  D.front = new Door(L, { name: 'front', x: 3, z: 0, w: 1.0, axis: 'x', hinge: -1, swing: 1, mat: steel, locked: o.frontLocked !== false, lockedPrompt: 'Locked — lockbox by the door', creakAmt: 1.6 });
  D.back = new Door(L, { name: 'back', x: 8, z: -6, w: 0.95, axis: 'x', hinge: 1, swing: -1, mat: steel, locked: true, lockedPrompt: 'Locked (deadbolt)' });
  D.closet = new Door(L, { name: 'closet', x: 9.3, z: -4.4, w: 0.8, axis: 'x', hinge: 1, swing: 1, mat: B.mat('paintedDoor', { texArgs: ['#6a6e70'] }) });
  // interior: transmitter cabinets (west wall)
  const txFront = TEX.dynamic(256, 512, (c, w, hh, st = {}) => {
    c.fillStyle = '#5c6660'; c.fillRect(0, 0, w, hh);
    c.fillStyle = '#ddd'; c.font = 'bold 18px Arial'; c.fillText('HARRIS  FM-5K', 14, 30);
    const meter = (x, y, label, f) => { c.fillStyle = '#efe9d6'; c.fillRect(x, y, 100, 70); c.strokeStyle = '#222'; c.strokeRect(x, y, 100, 70); c.beginPath(); c.arc(x + 50, y + 66, 46, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); const a = Math.PI * 1.15 + f * Math.PI * 0.7; c.strokeStyle = '#a00'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 50, y + 66); c.lineTo(x + 50 + Math.cos(a) * 44, y + 66 + Math.sin(a) * 44); c.stroke(); c.lineWidth = 1; c.fillStyle = '#111'; c.font = '10px Arial'; c.fillText(label, x + 24, y + 64); };
    meter(18, 50, 'PLATE V', st.pv || 0); meter(138, 50, 'PLATE I', st.pi || 0); meter(18, 140, 'FWD PWR', st.fwd || 0); meter(138, 140, 'REFL', st.ref || 0);
    const lamp = (x, y, label, on, col) => { c.fillStyle = on ? col : '#222'; c.beginPath(); c.arc(x, y, 11, 0, 7); c.fill(); c.strokeStyle = '#111'; c.stroke(); c.fillStyle = '#eee'; c.font = 'bold 11px Arial'; c.fillText(label, x - 30, y + 28); };
    lamp(60, 260, 'FILAMENT', st.fil, '#f8c030'); lamp(140, 260, 'PLATE', st.plate, '#ff3020'); lamp(210, 260, 'READY', st.ready, '#40ff60');
    c.fillStyle = '#ddd'; c.font = 'bold 13px Arial'; c.fillText(st.local ? 'CONTROL: LOCAL' : 'CONTROL: REMOTE', 30, 330);
    c.fillText('LOCAL AUDIO: ' + (st.localAudio ? 'ON' : 'OFF'), 30, 352);
    if (st.countdown != null) { c.fillStyle = '#f8c030'; c.font = 'bold 26px "Courier New"'; c.fillText('WARMUP ' + String(st.countdown).padStart(2, '0'), 40, 400); }
    c.fillStyle = '#333'; c.fillRect(20, 430, 216, 60);
    for (let i = 0; i < 6; i++) { c.fillStyle = '#111'; c.fillRect(30 + i * 34, 440, 26, 40); }
  });
  L.txTex = txFront;
  const txg = B.group(R, 0.75, 0, -3, Math.PI / 2);
  const txm = new THREE.MeshLambertMaterial({ map: txFront.tex, emissive: 0x444444, emissiveMap: txFront.tex });
  const txBox = new THREE.Mesh(B.boxGeo(3.6, 2.1, 1.0, 0), [B.col(0x4a524c), B.col(0x4a524c), B.col(0x4a524c), B.col(0x4a524c), B.col(0x4a524c), B.col(0x4a524c)]);
  txBox.position.y = 1.05; txBox.castShadow = true; txg.add(txBox);
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.0), i === 1 ? txm : new THREE.MeshLambertMaterial({ map: TEX.get('rack', 600 + i), emissive: 0x333333, emissiveMap: TEX.get('rack', 600 + i) })); f.position.set(-1.2 + i * 1.2, 1.05, 0.505); txg.add(f); }
  Phys.addC(0.75, -3, 1.0, 3.6, 0, 2.1);
  L.named.tx = txg;
  L.loop('transmitterHum', { pos: new THREE.Vector3(1, 1.2, -3), vol: 0 }); L.txHum = L.loops[L.loops.length - 1];
  // racks on north wall
  for (let i = 0; i < 3; i++) { const rg = B.group(R, 3.2 + i * 0.65, 0, -5.55, 0); const fm = new THREE.MeshLambertMaterial({ map: TEX.get('rack', 620 + i, ['STL RX', 'PROC', 'REMOTE'][i]), emissive: 0x555555, emissiveMap: TEX.get('rack', 620 + i, ['STL RX', 'PROC', 'REMOTE'][i]) }); const bx = new THREE.Mesh(B.boxGeo(0.6, 2.0, 0.6, 0), [B.col(0x1d1d20), B.col(0x1d1d20), B.col(0x1d1d20), B.col(0x1d1d20), fm, B.col(0x1d1d20)]); bx.position.y = 1; rg.add(bx); }
  Phys.add(2.85, -5.9, 5.2, -5.2, 0, 2);
  L.rackLoop = L.loop('rackFans', { pos: new THREE.Vector3(4, 1, -5.5), vol: 0.8 });
  // workbench + desk with EAS mic (east side)
  B.box(R, 8.9, 0, -1.6, 1.6, 0.85, 0.8, B.col(0x5a5040), { collide: true });
  B.box(R, 8.9, 0.85, -1.6, 1.7, 0.04, 0.85, B.col(0x7a6a50));
  const micG = B.group(R, 8.6, 0.89, -1.7, 0);
  B.box(micG, 0, 0, 0, 0.16, 0.03, 0.12, B.col(0x222222)); B.cyl(micG, 0, 0.03, 0, 0.01, 0.01, 0.25, B.col(0x333333));
  B.cyl(micG, 0, 0.27, 0.03, 0.03, 0.03, 0.12, B.col(0x2c2c30), { rx: 1.3 });
  const micBtn = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.04), new THREE.MeshBasicMaterial({ color: 0x661111 })); micBtn.position.set(0.05, 0.035, 0.03); micG.add(micBtn);
  L.named.mic = { group: micG, btn: micBtn };
  B.box(R, 9.45, 0, -3.4, 1.0, 0.9, 1.4, B.col(0x5a5040), { collide: true }); // bench under window
  B.box(R, 9.45, 0.9, -3.4, 1.05, 0.04, 1.45, B.col(0x7a6a50));
  const cutters = B.group(R, 9.4, 0.95, -3.0, 0.4);
  B.box(cutters, 0, 0, 0, 0.6, 0.04, 0.05, B.col(0xb02020)); B.box(cutters, 0.32, 0, 0, 0.12, 0.05, 0.08, B.col(0x777777));
  L.named.cutters = cutters; cutters.visible = o.cutters !== false;
  P.officeChair(R, 8.6, -0.9, Math.PI);
  // wall phone by the front door
  const wp = B.group(R, 1.6, 1.3, -0.12, Math.PI);
  B.box(wp, 0, 0, 0, 0.18, 0.24, 0.07, B.col(0xd8d0c0)); B.box(wp, 0, 0.02, 0.05, 0.05, 0.2, 0.04, B.col(0xd8d0c0));
  L.named.wallPhone = wp;
  // breaker panel by the door
  const bp = B.group(R, 4.4, 1.0, -0.12, Math.PI);
  B.box(bp, 0, 0, 0, 0.5, 0.75, 0.1, B.col(0x8a8a86));
  const bh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.03), B.col(0x111111)); bh.position.set(0, 0.55, 0.06); bp.add(bh);
  L.named.breaker = { group: bp, handle: bh };
  // logbook, coffee can, calendar
  B.texPlane(R, TEX.get('paper', ['RIDGE SITE', 'LOG', '', '10/13 DP', '10/14 DP', '10/15 DP'], { fs: 11 }), 9.0, 0.895, -1.4, 0.2, 0.26, { rx: -Math.PI / 2 });
  L.named.siteLog = new THREE.Vector3(9.0, 0.9, -1.4);
  // lights
  const LT = L.named.lights = {};
  LT.main = B.fluoro(L, 3, HB - 0.04, -3, { w: 0.3, d: 1.2, intensity: 6, dist: 10, color: 0xeef4ff, circuit: 'site' });
  LT.main2 = B.fluoro(L, 7.5, HB - 0.04, -2, { w: 0.3, d: 1.2, intensity: 5, dist: 9, color: 0xeef4ff, circuit: 'site' });
  LT.door = B.bulb(L, 3, 2.5, 0.35, { color: 0xffe0a0, intensity: 6, dist: 12, circuit: 'site', spot: true, angle: 1.1, tz: 3 });
  LT.closet = B.bulb(L, 9.3, 2.6, -5.2, { color: 0xffe0b0, intensity: 1, dist: 3, circuit: 'site', on: false });
  // lockbox
  const lb = B.group(R, 4.0, 1.4, 0.13, 0);
  B.box(lb, 0, 0, 0, 0.12, 0.16, 0.08, B.col(0x222222)); L.named.lockbox = lb;
  B.signMesh(R, 'KTLR 94.1\nKESSLER RIDGE TX\nNO TRESPASSING', 6.5, 1.8, 0.12, 1.4, 0.6, { tex: { bg: '#f2f2f2', fg: '#a11' } });
  B.signMesh(R, '⚡ DANGER\nHIGH VOLTAGE\nRF RADIATION', 3, 2.45, 0.13, 0.8, 0.45, { tex: { bg: '#e8c020', fg: '#111', border: '#111' } });

  // ---------- generator pen ----------
  const genX = 15, genZ = -3;
  const fenceMat = new THREE.MeshLambertMaterial({ map: TEX.get('chainlink'), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
  fenceMat.map.repeat.set(1, 1);
  const fence = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0); const g = new THREE.PlaneGeometry(len, 2.1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 0.6, uv.getY(i) * 2.1 / 0.6); const m = new THREE.Mesh(g, fenceMat); m.position.set((x0 + x1) / 2, h((x0 + x1) / 2, (z0 + z1) / 2) + 1.05, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); R.add(m); Phys.add(Math.min(x0, x1) - 0.05, Math.min(z0, z1) - 0.05, Math.max(x0, x1) + 0.05, Math.max(z0, z1) + 0.05, 0, 2.1, { sight: false }); for (const [px, pz] of [[x0, z0], [x1, z1]]) B.cyl(R, px, h(px, pz), pz, 0.04, 0.04, 2.2, B.col(0x888888)); };
  fence(genX - 2.2, genZ - 2, genX + 2.2, genZ - 2); fence(genX + 2.2, genZ - 2, genX + 2.2, genZ + 2); fence(genX - 2.2, genZ - 2, genX - 2.2, genZ + 2);
  fence(genX - 2.2, genZ + 2, genX - 0.6, genZ + 2); fence(genX + 0.6, genZ + 2, genX + 2.2, genZ + 2);
  D.genGate = new Door(L, { name: 'gengate', x: genX, z: genZ + 2, w: 1.2, axis: 'x', hinge: -1, swing: 1, mat: fenceMat, thick: 0.03, locked: o.genGateLocked !== false, lockedPrompt: 'Padlocked gate', creakAmt: 2.5 });
  const gu = P.generatorUnit(R, genX, genZ - 0.3, 0); L.named.generator = gu;
  B.cyl(R, genX + 1.4, 0, genZ - 1.2, 0.4, 0.4, 1.3, B.col(0xe8e6e0));
  // power pole + disconnect
  B.cyl(R, 13, 0, 4.5, 0.14, 0.18, 9, B.mat('bark', { color: 0x9a8a7a }), { collide: true });
  const disc = B.group(R, 13, 1.2, 4.3, Math.PI);
  B.box(disc, 0, 0, 0, 0.45, 0.6, 0.2, B.col(0x7a7e7a)); const dh = B.box(disc, 0.26, 0.2, 0, 0.06, 0.25, 0.06, B.col(0xaa2222)); L.named.disconnect = { group: disc, handle: dh };
  for (let k = 0; k < 5; k++) { const ln = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(13, 8.8, 4.5), new THREE.Vector3(13 + 10 + k * 25, 8.4 - k * 0.6, 4.5 + 20 + k * 22)]); R.add(new THREE.Line(ln, new THREE.LineBasicMaterial({ color: 0x0a0a0a }))); }
  const svc = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(13, 8.5, 4.5), new THREE.Vector3(10, 2.8, 0)]); R.add(new THREE.Line(svc, new THREE.LineBasicMaterial({ color: 0x0a0a0a })));

  // ---------- tower ----------
  const tx = -8, tz = -16, TH = 72, tw = 1.6;
  const legs = [0, 1, 2].map(i => { const a = i / 3 * Math.PI * 2; return new THREE.Vector3(tx + Math.cos(a) * tw * 0.58, 0, tz + Math.sin(a) * tw * 0.58); });
  const steelM = B.col(0x9a2a1a);
  legs.forEach(p => B.cyl(R, p.x, h(tx, tz), p.z, 0.05, 0.05, TH, steelM, { seg: 5 }));
  const braceG = new THREE.CylinderGeometry(0.025, 0.025, 1, 4); braceG.translate(0, 0.5, 0);
  const nBr = Math.floor(TH / 2.5) * 6;
  const braces = new THREE.InstancedMesh(braceG, B.col(0xc8c4b8), nBr);
  let bi = 0; const mm = new THREE.Matrix4(), qq = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (let y = 0; y < TH - 2.5 && bi < nBr - 6; y += 2.5) for (let i = 0; i < 3; i++) {
    const a = legs[i].clone(), b = legs[(i + 1) % 3].clone(); const y0 = y + h(tx, tz);
    for (const [p0, p1] of [[a.clone().setY(y0), b.clone().setY(y0 + 2.5)], [b.clone().setY(y0), a.clone().setY(y0 + 2.5)]]) {
      const d = p1.clone().sub(p0); qq.setFromUnitVectors(up, d.clone().normalize()); mm.compose(p0, qq, new THREE.Vector3(1, d.length(), 1)); braces.setMatrixAt(bi++, mm);
    }
  }
  braces.count = bi; R.add(braces);
  Phys.addC(tx, tz, 1.4, 1.4, -5, TH);
  // beacons
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff2010 });
  const beacons = [24, 48, TH].map(y => { const s = new THREE.Mesh(new THREE.SphereGeometry(y === TH ? 0.35 : 0.22, 8, 6), beaconMat); s.position.set(tx, y + h(tx, tz), tz); R.add(s); return s; });
  const beaconLight = new THREE.PointLight(0xff2010, 0, 60, 1.2); beaconLight.position.set(tx, 26, tz); R.add(beaconLight);
  L.beaconsOn = o.beacons !== false;
  L.onUpdate(() => { const on = L.beaconsOn && (G.time % 3) < 1.4; beaconMat.color.set(on ? 0xff3020 : 0x1a0302); beaconLight.intensity = on ? 30 : 0; void beacons; });
  // guy wires
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2 + 0.5, ax = tx + Math.cos(a) * 46, az = tz + Math.sin(a) * 46;
    for (const y of [24, 48, TH]) { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(tx, y + h(tx, tz), tz), new THREE.Vector3(ax, h(ax, az) + 0.4, az)]); R.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x55575a }))); }
    B.box(R, ax, h(ax, az) - 0.2, az, 1.2, 0.6, 1.2, conc, { collide: true });
  }
  // fence around tower base
  const tb = 3.2; fence(tx - tb, tz - tb, tx + tb, tz - tb); fence(tx + tb, tz - tb, tx + tb, tz + tb); fence(tx - tb, tz + tb, tx + tb, tz + tb); fence(tx - tb, tz - tb, tx - tb, tz + tb);

  // ---------- old 1962 building ----------
  const oY = oldY;
  const oc = B.mat('concrete', { texArgs: [96] });
  const og = B.group(R, 0, oY, 0);
  B.box(og, -22, -0.3, 18, 6.6, 0.32, 5.6, oc);
  B.floor(og, ob.x0, ob.z0, ob.x1, ob.z1, 0.04, B.mat('concrete', { texArgs: [80] }), 2);
  B.ceiling(og, ob.x0, ob.z0, ob.x1, ob.z1, 2.6, oc, 2);
  B.box(og, -22, 2.6, 18, 6.4, 0.2, 5.4, B.col(0x2a2a2a));
  // walls (group local y=0 at oY; Phys boxes need world y so build manually)
  const ow = (x, z, w, d) => { B.box(og, x, 0, z, w, 2.6, d, oc); Phys.addC(x, z, w, d, oY, oY + 2.6); };
  ow(-22, 15.5, 6.2, 0.2); ow(-22, 20.5, 6.2, 0.2); ow(-25, 18, 0.2, 5.2);
  ow(-19, 16.3, 0.2, 1.6); ow(-19, 19.7, 0.2, 1.6); B.box(og, -19, 2.1, 18, 0.2, 0.5, 1.0, oc);
  // boarded window on south wall
  for (let i = 0; i < 3; i++) B.box(og, -22.5, 1.1 + i * 0.22, 15.38, 1.0, 0.18, 0.04, B.mat('woodDoor', { texArgs: ['#6a5a4a'] }));
  B.signMesh(og, 'KTLR AM 1340 — 1962\nTRANSMITTER', -22, 2.2, 15.38, 1.4, 0.4, { ry: Math.PI, tex: { bg: '#8a8a7a', fg: '#2a2a2a' } });
  D.old = new Door(L, { name: 'old', x: -19, z: 18, w: 0.95, axis: 'z', hinge: -1, swing: 1, y: oY, mat: B.mat('metal', { color: 0x6a5a4a }), locked: true, lockedPrompt: 'Padlocked', creakAmt: 3 });
  L.surface(ob.x0, ob.z0, ob.x1, ob.z1, 'concrete');
  // inside old building
  for (let i = 0; i < 2; i++) { const cab = B.group(og, -24.4, 0, 16.6 + i * 1.3, Math.PI / 2); const cm = new THREE.MeshLambertMaterial({ map: TEX.get('meterPanel', 'GATES BC-1T'), color: 0x9a9a8a }); const bx = new THREE.Mesh(B.boxGeo(1.2, 2.0, 0.8, 0), [B.col(0x5a5a50), B.col(0x5a5a50), B.col(0x5a5a50), B.col(0x5a5a50), cm, B.col(0x5a5a50)]); bx.position.y = 1; cab.add(bx); }
  Phys.add(-25, 15.9, -23.9, 19.4, oY, oY + 2);
  const odesk = B.group(og, -21, 0, 20.0, Math.PI);
  B.box(odesk, 0, 0, 0, 1.6, 0.8, 0.6, B.col(0x4a4038)); B.box(odesk, 0, 0.8, 0, 1.7, 0.04, 0.7, B.col(0x5a5048));
  Phys.addC(-21, 20.0, 1.6, 0.6, oY, oY + 0.85);
  const omic = B.group(og, -21.3, 0.84, 19.9, 0);
  B.box(omic, 0, 0, 0, 0.3, 0.06, 0.2, B.col(0x2a2a2a)); B.cyl(omic, 0, 0.06, 0, 0.012, 0.012, 0.2, B.col(0x777777)); B.cyl(omic, 0, 0.26, 0.02, 0.035, 0.04, 0.1, B.col(0x777777), { rx: 1.2 });
  const tbBtn = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.05), new THREE.MeshBasicMaterial({ color: 0x441111 })); tbBtn.position.set(0.1, 0.07, 0.05); omic.add(tbBtn);
  L.named.oldMic = { group: omic, btn: tbBtn };
  B.texPlane(og, TEX.get('paper', ['TALKBACK', '→ RIDGE TX', 'AUX IN', '- D.P.'], { fs: 12 }), -21.6, 1.3, 20.38, 0.18, 0.2, { ry: Math.PI });
  const ochair = P.chair(og, -21.5, 18.3, 0, { color: 0x3a3a3a }); L.named.oldChair = ochair;
  L.named.oldBulb = B.bulb(L, -22, oY + 2.45, 18, { color: 0xffc080, intensity: 1.6, dist: 6, circuit: 'site', on: o.oldBulb !== false });
  // scraps: rope, tape, water bottle
  B.box(og, -20.0, 0.04, 16.2, 0.4, 0.06, 0.3, B.col(0x7a6a40));
  B.cyl(og, -20.4, 0.04, 16.6, 0.04, 0.04, 0.2, B.col(0xaaccdd));

  // ---------- vehicles ----------
  L.named.buick = P.car(R, 5, -11.5, Math.PI + 0.15, { color: 0x3a1418, len: 5.0, wid: 1.85 });
  L.named.buick.position.y = h(5, -11.5);
  if (o.tarp !== false) {
    const tarpM = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.6, 6, 6), new THREE.MeshLambertMaterial({ map: TEX.get('tarp'), side: THREE.DoubleSide }));
    const tpos = tarpM.geometry.attributes.position; for (let i = 0; i < tpos.count; i++) tpos.setZ(i, Math.sin(tpos.getX(i) * 1.2) * 0.25 - Math.abs(tpos.getY(i)) * 0.15);
    tarpM.rotation.set(-Math.PI / 2 + 0.25, 0, 0.15); tarpM.position.set(5.1, h(5, -11.5) + 1.25, -12.6); R.add(tarpM); L.named.tarp = tarpM;
  }
  L.named.evanCar = o.evanCar !== false ? P.car(R, 13, 11, -2.6, { color: 0x4d5b4a, lights: !!o.evanCarLights, beams: !!o.evanCarLights }) : null;
  if (L.named.evanCar) L.named.evanCar.position.y = h(13, 11);
  // the gate on the access road
  B.box(R, 33.5, h(33.5, 48), 48, 0.2, 1.2, 0.2, B.col(0x777777), { collide: true });
  const gate = B.box(R, 36, h(36, 48) + 0.9, 49, 5, 0.1, 0.1, B.col(0xd8c020)); gate.rotation.y = -1.2;

  // ---------- forest ----------
  const exclF = (x, z) => {
    if (rectDist(x, z, { x0: -14, x1: 24, z0: -15, z1: 16 }) < 2) return true;
    if (rectDist(x, z, { x0: ob.x0 - 3, x1: ob.x1 + 3, z0: ob.z0 - 3, z1: ob.z1 + 3 }) < 1) return true;
    for (const p of trailPts) if (Math.abs(p.x - x) < 2.4 && Math.abs(p.z - z) < 2.4) return true;
    for (const p of roadPts) if (Math.abs(p[0] - x) < 6 && Math.abs(p[1] - z) < 6) return true;
    if (Math.abs(x - tx) < 5 && Math.abs(z - tz) < 5) return true;
    return false;
  };
  const trees = P.scatter(-140, -140, 140, 140, 1400, 41, exclF, 2.6).map(p => [p[0], p[1], 10 + U.noise2(p[0], p[1], 3) * 14, h(p[0], p[1])]);
  P.forest(L, trees, { collide: true, collideIf: (x, z) => Math.abs(x + 25) < 70 && Math.abs(z + 10) < 70, seed: 41 });
  L.trees = trees;
  // boulders & logs (cover + hides)
  const rockM = B.mat('concrete', { texArgs: [88] });
  const rock = (x, z, s) => { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM); m.position.set(x, h(x, z) + s * 0.4, z); m.rotation.set(x, z, x * z); m.scale.y = 0.7; m.castShadow = true; R.add(m); Phys.addC(x, z, s * 1.5, s * 1.5, h(x, z) - 1, h(x, z) + s * 1.1); return m; };
  [[-55, -2, 1.6], [-57, 1, 1.1], [-40, -46, 1.3], [-20, -30, 1.0], [-68, -24, 1.4], [-30, 30, 1.2], [20, -22, 1.3], [-12, 26, 0.9]].forEach(r => rock(...r));
  const log = (x, z, ry, len = 6) => { const m = B.cyl(R, x, h(x, z) + 0.35, z, 0.38, 0.42, len, B.mat('bark'), { rz: Math.PI / 2, seg: 8 }); m.rotation.set(0, ry, Math.PI / 2); m.position.y = h(x, z) + 0.38; const s = Math.abs(Math.cos(ry)) > 0.7; Phys.addC(x, z, s ? len : 0.8, s ? 0.8 : len, h(x, z) - 0.5, h(x, z) + 0.8, { sight: false }); return m; };
  log(-45, -30, 0.3); log(-62, 10, 1.2, 7); log(-28, -42, 2.0, 5); log(-60, 22, 0.1, 8);
  // creek
  const creek = trailRibbon([[-70, -60], [-64, -40], [-63, -20], [-61, 0], [-62, 20], [-66, 40]], 2.2, new THREE.MeshLambertMaterial({ color: 0x0a1418, emissive: 0x020406 }), 'mud');
  void creek;
  L.loop('creek', { pos: new THREE.Vector3(-62, h(-62, -10), -10), vol: 0.9, ref: 6, occlude: false });

  // ---------- hiding spots ----------
  L.hides = [
    { name: 'closet', pos: new THREE.Vector3(9.4, 0, -5.3), look: new THREE.Vector3(9.3, 1.3, -3.0), prompt: 'Hide in the closet' },
    { name: 'bench', pos: new THREE.Vector3(8.9, 0, -1.75), look: new THREE.Vector3(6, 0.4, -1.5), prompt: 'Hide under the workbench', low: true },
    { name: 'log', pos: new THREE.Vector3(-45, h(-45, -29.2), -29.2), look: new THREE.Vector3(-40, h(-40, -25) + 0.5, -25), prompt: 'Hide behind the log', low: true },
    { name: 'rocks', pos: new THREE.Vector3(-56.3, h(-56.3, -0.5), -0.5), look: new THREE.Vector3(-48, h(-48, 0) + 1, 4), prompt: 'Hide between the rocks', low: true },
    { name: 'oldcab', pos: new THREE.Vector3(-23.6, oY, 19.9), look: new THREE.Vector3(-20, oY + 1.2, 17.5), prompt: 'Hide behind the cabinet', low: true },
  ];

  // ---------- ambience ----------
  L.loop('wind', { vol: 0.42 });
  L.windHi = L.loop('wind', { pos: new THREE.Vector3(tx, 30, tz), vol: 0.35, ref: 20, occlude: false });
  L.skyRig = P.sky(L, { moon: 0.1, hemi: 0.16 });
  L.zone('outside', -300, -300, 300, 300);
  L.zone('newb', nb.x0, nb.z0, nb.x1, nb.z1);
  L.zone('closet', 8.6, -6, 10, -4.4);
  L.zone('oldb', ob.x0, ob.z0, ob.x1, ob.z1);
  L.zone('genpen', genX - 2.2, genZ - 2, genX + 2.2, genZ + 2);
  L.zone('forest', -140, -140, -14, 140);
  // nav nodes for the hunter
  L.nav = [[3, 2], [8, 2], [13, 2], [17, 2], [17, -8], [10, -9], [3, -9], [-3, -6], [-3, 3], [-6, 8], [-12, 10], [-17, 18], [-22, 18], [-22, 17.5], [5, -3], [8, -4.8], [2, -1.2], [8, -7.2], [20, 8], [14, 12], [6, 10], [-1, -9], ...TOWER.trail.map(p => [p[0], p[1]]), [-50, -30], [-58, -10], [-50, 8], [-40, 14], [-36, -20], [-26, -14], [-14, -22], [24, -14], [26, 2]];
  L.spawns.car = [12.2, 9.4, -2.6 + Math.PI];
  G.buildLevel = null;
  return L;
};
