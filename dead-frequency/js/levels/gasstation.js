'use strict';
// Gas-N-Go, Route 9. Store front faces +z; pumps under a canopy; road at z=30.

Levels.gas = function (o = {}) {
  const L = new Level('gas');
  G.buildLevel = L;
  const R = L.root;
  L.defaultSurface = 'asphalt';
  L.reverb = [0.5, 3, 0.12];
  L.fog = new THREE.FogExp2(0x05070b, 0.02);
  L.background = new THREE.Color(0x03040a);
  const H = 3.0;
  const dry = B.mat('drywall', { texArgs: ['#e2e0d6'] }), vct = B.mat('vct', { texArgs: ['#d8d6cc', '#c8c6bc'] }), brick = B.mat('cinder', { texArgs: ['#9a7a6a'] });
  const wX = (minus, plus) => [dry, dry, dry, dry, plus, minus], wZ = (minus, plus) => [plus, minus, dry, dry, dry, dry];

  // ground
  B.floor(R, -150, -150, 150, 150, -0.02, B.mat('grass'), 4);
  B.floor(R, -22, -10, 22, 27, -0.005, B.mat('asphalt'), 5);
  B.floor(R, -7, -5, 7, 5, 0.0, vct, 0.6);
  L.surface(-150, -150, 150, 150, 'grass'); L.surface(-22, -10, 22, 27, 'asphalt'); L.surface(-7, -5, 7, 5, 'tile');
  const road = B.plane(R, 0, 0.0, 30.5, 300, 7, new THREE.MeshLambertMaterial({ map: (() => { const t = TEX.get('road').clone(); t.needsUpdate = true; t.rotation = Math.PI / 2; t.center.set(0.5, 0.5); t.repeat.set(37.5, 1); return t; })() }), { rx: -Math.PI / 2, uv: 0 });
  void road;
  B.ceiling(R, -7, -5, 7, 5, H, B.mat('ceiling'), 0.6);
  B.box(R, 0, H, 0, 14.4, 0.6, 10.4, B.mat('siding', { texArgs: ['#b8242a'] }), { uv: 1 }); // fascia
  // walls: front is mostly glass
  B.wallX(R, -7, 7, 5, H, 0.2, wX(dry, brick), [{ at: -1.2, w: 1.2, h: 2.2 }, { at: -4.5, w: 4.2, h: 2.4, sill: 0.6 }, { at: 3.4, w: 6.0, h: 2.4, sill: 0.6 }]);
  B.glass(R, -4.5, 0.6, 5, 4.2, 1.8, 'x'); B.glass(R, 3.4, 0.6, 5, 6.0, 1.8, 'x');
  B.wallX(R, -7, 7, -5, H, 0.2, wX(brick, dry), [{ at: -5.3, w: 0.9 }, { at: 5.3, w: 0.9 }]);
  B.wallZ(R, -5, 5, -7, H, 0.2, wZ(brick, dry));
  B.wallZ(R, -5, 5, 7, H, 0.2, wZ(dry, brick));
  // back rooms
  B.box(R, 0, 0, -7.5, 14.4, H, 5, brick, { collide: true });
  // doors
  const D = L.named.doors = {};
  D.front = new Door(L, { name: 'front', x: -1.2, z: 5, w: 1.2, axis: 'x', hinge: -1, swing: 1, mat: B.mat('metal', { color: 0x777a7c }), window: true, creak: false });
  D.restroom = new Door(L, { name: 'restroom', x: -5.3, z: -5, w: 0.9, axis: 'x', hinge: -1, swing: -1, mat: B.mat('paintedDoor', { texArgs: ['#5a6a7a'] }), locked: true, lockedPrompt: 'Locked — "KEY AT COUNTER"' });
  D.back = new Door(L, { name: 'back', x: 5.3, z: -5, w: 0.9, axis: 'x', hinge: 1, swing: -1, mat: B.mat('paintedDoor', { texArgs: ['#7a7a6a'] }), locked: !o.backOpen, lockedPrompt: 'EMPLOYEES ONLY' });
  if (o.backOpen) D.back.set(0.6);
  B.signMesh(R, 'RESTROOM', -5.3, 2.35, -4.88, 0.6, 0.15, { tex: { bg: '#fff', fg: '#224' } });
  B.signMesh(R, 'EMPLOYEES ONLY', 5.3, 2.35, -4.88, 0.7, 0.15, { tex: { bg: '#fff', fg: '#a00' } });
  // front door bell
  Bus.on && L.onUpdate(() => { const d = D.front; if (d.isOpen !== L._fdOpen) { L._fdOpen = d.isOpen; if (d.isOpen) SND.sfx('bell', { pos: d.pos }); } });

  // lights (bright store)
  const LT = L.named.lights = {};
  LT.a = B.fluoro(L, -3.5, H - 0.04, 1.5, { w: 0.4, d: 2.4, intensity: 8, dist: 11, color: 0xf4f8ff, flicker: o.flicker ? 0.25 : 0 });
  LT.b = B.fluoro(L, 3.5, H - 0.04, 1.5, { w: 0.4, d: 2.4, intensity: 8, dist: 11, color: 0xf4f8ff });
  LT.c = B.fluoro(L, 0, H - 0.04, -2.8, { w: 2.4, d: 0.4, intensity: 7, dist: 10, color: 0xf4f8ff });
  // canopy
  const can = B.group(R, 0, 0, 14);
  B.box(can, 0, 4.2, 0, 18, 0.7, 9, B.mat('siding', { texArgs: ['#d8d4cc'] }), { uv: 2 });
  B.box(can, 0, 4.2, 4.52, 18, 0.7, 0.04, B.mat('plain', { texArgs: ['#b8242a'] }));
  B.box(can, 0, 4.2, -4.52, 18, 0.7, 0.04, B.mat('plain', { texArgs: ['#b8242a'] }));
  for (const sx of [-6, 6]) B.box(can, sx, 0, 0, 0.4, 4.2, 0.4, B.col(0xd8d4cc), { collide: true });
  B.signMesh(can, 'GAS-N-GO', 0, 4.25, 4.56, 3, 0.55, { tex: { bg: '#b8242a', fg: '#fff', w: 512, h: 96 }, emissive: 0x552222 });
  LT.can1 = B.bulb(L, -4, 3.84, 14, { color: 0xf0f6ff, intensity: 30, dist: 14, spot: true, angle: 1.2 });
  LT.can2 = B.bulb(L, 4, 3.84, 14, { color: 0xf0f6ff, intensity: 30, dist: 14, spot: true, angle: 1.2, flicker: o.flicker ? 0.12 : 0 });
  // pump islands
  L.named.pumps = [];
  for (const px of [-3, 3]) {
    B.box(R, px, 0, 14, 1.2, 0.18, 3.6, B.col(0xb8b4a8), { collide: true, sight: false });
    const p = B.group(R, px, 0.18, 14);
    B.box(p, 0, 0, 0, 0.7, 1.7, 0.45, B.col(0xe4e0d8));
    B.box(p, 0, 1.0, 0.23, 0.5, 0.35, 0.02, B.col(0x1a1a1a));
    B.box(p, 0, 1.7, 0, 0.75, 0.25, 0.5, B.col(0xb8242a));
    const disp = TEX.dynamic(128, 64, (c, w, h, gal = 0, cost = 0) => { c.fillStyle = '#081008'; c.fillRect(0, 0, w, h); c.fillStyle = '#7ef08a'; c.font = 'bold 20px "Courier New"'; c.fillText('$' + cost.toFixed(2), 8, 26); c.font = '14px "Courier New"'; c.fillText(gal.toFixed(3) + ' GAL', 8, 52); });
    const dm = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.3), new THREE.MeshBasicMaterial({ map: disp.tex })); dm.position.set(0, 1.17, 0.241); p.add(dm);
    const dm2 = dm.clone(); dm2.position.z = -0.241; dm2.rotation.y = Math.PI; p.add(dm2);
    L.named.pumps.push({ group: p, disp, x: px });
  }
  // ice chest & propane cage out front
  B.box(R, 5.5, 0, 5.8, 1.6, 1.1, 0.8, B.col(0xe8eef4), { collide: true });
  B.signMesh(R, 'ICE', 5.5, 0.7, 6.21, 0.8, 0.35, { tex: { bg: '#2a6ad8', fg: '#fff' } });
  B.box(R, -6, 0, 6, 1.2, 1.4, 0.9, B.mat('chainlink'), { collide: true });
  // payphone
  const pp = B.group(R, 9.5, 0, 5.8, Math.PI);
  B.box(pp, 0, 0, 0, 0.1, 1.2, 0.1, B.col(0x888888)); B.box(pp, 0, 1.0, 0.05, 0.42, 0.75, 0.2, B.mat('metal', { color: 0x9aa0a8 }));
  B.box(pp, -0.1, 1.35, 0.17, 0.06, 0.22, 0.06, B.col(0x111111));
  B.signMesh(pp, 'PHONE', 0, 1.9, 0.06, 0.4, 0.12, { tex: { bg: '#2a4ad8', fg: '#fff' } });
  L.named.payphone = pp;
  // sign pole with prices
  const sp = B.group(R, -16, 0, 26);
  B.box(sp, 0, 0, 0, 0.3, 7, 0.3, B.col(0x666666));
  B.signMesh(sp, 'GAS-N-GO', 0, 7.3, 0.2, 3.2, 1.2, { tex: { bg: '#b8242a', fg: '#fff' }, emissive: 0x662222 });
  B.signMesh(sp, 'REG   1.89⁹\nPLUS  1.99⁹\nDSL   2.13⁹', 0, 5.5, 0.2, 2.6, 1.6, { tex: { bg: '#111', fg: '#ff8a2a', font: '"Courier New", monospace' }, emissive: 0x442200 });
  // dumpster + back
  B.box(R, 9, 0, -7, 2.0, 1.3, 1.2, B.mat('metal', { color: 0x2f4f3a }), { collide: true });

  // interior: counter, register, shelves, coolers, coffee
  B.box(R, 4.6, 0, 1.6, 0.7, 1.0, 3.2, B.col(0x6a5a4a), { collide: true });
  B.box(R, 4.6, 1.0, 1.6, 0.8, 0.04, 3.3, B.col(0xd8d0b8));
  B.box(R, 3.4, 0, 3.0, 2.0, 1.0, 0.7, B.col(0x6a5a4a), { collide: true });
  B.box(R, 3.4, 1.0, 3.0, 2.1, 0.04, 0.8, B.col(0xd8d0b8));
  const reg = B.group(R, 4.5, 1.04, 1.0, -Math.PI / 2);
  B.box(reg, 0, 0, 0, 0.4, 0.15, 0.4, B.col(0x2a2a2a)); B.box(reg, 0, 0.15, -0.1, 0.35, 0.2, 0.06, B.col(0x333333));
  const regScr = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.06), new THREE.MeshBasicMaterial({ color: 0x55ff88 })); regScr.position.set(0, 0.3, -0.07); reg.add(regScr);
  L.named.register = reg;
  // cigarette rack behind counter
  B.box(R, 6.75, 1.2, 1.6, 0.4, 1.4, 3.0, B.col(0x3a3a3a));
  B.texPlane(R, TEX.get('shelfGoods', 77), 6.54, 1.9, 1.6, 2.9, 1.3, { ry: -Math.PI / 2 });
  // radio on counter (plays KTLR)
  const rad = B.group(R, 4.5, 1.04, 2.4, -Math.PI / 2);
  B.box(rad, 0, 0, 0, 0.32, 0.18, 0.12, B.col(0x2a2622)); const rg = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), B.col(0x111111)); rg.position.set(-0.07, 0.09, 0.061); rad.add(rg);
  L.radio = L.speaker({ kind: 'radio', pos: new THREE.Vector3(4.5, 1.15, 2.4), vol: 0.32, small: true, ref: 1.2 });
  // CCTV monitor behind counter
  const cctvCam = new THREE.PerspectiveCamera(70, 4 / 3, 0.2, 60); cctvCam.position.set(6.6, 2.8, -4.6); cctvCam.lookAt(-1, 0.5, 5);
  cctvCam.layers.enable(1);
  const cctvCam2 = new THREE.PerspectiveCamera(70, 4 / 3, 0.3, 60); cctvCam2.position.set(-6.5, 3.9, 9.2); cctvCam2.lookAt(4, 0, 16); cctvCam2.layers.enable(1);
  const mon = B.group(R, 6.3, 2.2, 0.2, -Math.PI / 2 - 0.3);
  const v1 = Engine.addView({ w: 192, h: 144, fps: 6, camera: cctvCam, enabled: () => U.dist2(Player.pos.x, Player.pos.z, 5.6, 1.6) < 3.5 || L.cctvForce, hide: [mon] });
  const v2 = Engine.addView({ w: 192, h: 144, fps: 6, camera: cctvCam2, enabled: () => U.dist2(Player.pos.x, Player.pos.z, 5.6, 1.6) < 3.5 || L.cctvForce, hide: [mon] });
  B.box(mon, 0, 0, -0.15, 0.42, 0.34, 0.3, B.col(0x1a1a1a));
  const m1 = Engine.cctvMaterial(v1), m2 = Engine.cctvMaterial(v2);
  const s1 = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.25), m1); s1.position.set(-0.09, 0.17, 0.006); mon.add(s1);
  const s2 = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.25), m2); s2.position.set(0.09, 0.17, 0.006); mon.add(s2);
  L.onUpdate(() => { m1.uniforms.time.value = G.time; m2.uniforms.time.value = G.time; });
  L.named.cctv = { group: mon, cam: cctvCam };
  // shelves (aisles)
  for (const [x, z] of [[-1.5, 1.2], [-1.5, -1.6], [1.3, -1.6]]) {
    const g = B.group(R, x, 0, z);
    B.box(g, 0, 0, 0, 2.4, 1.5, 0.7, B.col(0xd8d8d8), {});
    B.texPlane(g, TEX.get('shelfGoods', Math.floor(x * 10 + z * 7 + 50)), 0, 0.85, 0.36, 2.3, 1.2, {});
    B.texPlane(g, TEX.get('shelfGoods', Math.floor(x * 13 + z * 3 + 90)), 0, 0.85, -0.36, 2.3, 1.2, { ry: Math.PI });
    Phys.addC(x, z, 2.4, 0.7, 0, 1.5);
  }
  L.named.chips = new THREE.Vector3(-1.5, 0.9, 1.6);
  // coolers along back wall
  for (let i = 0; i < 5; i++) {
    const cx = -2.8 + i * 1.3;
    const cg = B.group(R, cx, 0, -4.55);
    B.box(cg, 0, 0, 0, 1.25, 2.2, 0.7, B.col(0x2a2a2a));
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.9), new THREE.MeshLambertMaterial({ map: TEX.get('cooler', 60 + i), emissive: 0x666666, emissiveMap: TEX.get('cooler', 60 + i) }));
    inner.position.set(0, 1.1, 0.36); cg.add(inner);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 2.0), new THREE.MeshStandardMaterial({ color: 0xaabbcc, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.8 })); gl.position.set(0, 1.1, 0.37); cg.add(gl);
    if (i === 0) L.named.dairy = cg;
    if (i === 3) L.named.sodaCooler = cg;
  }
  Phys.add(-3.5, -4.9, 3.6, -4.2, 0, 2.2);
  L.loop('fridge', { pos: new THREE.Vector3(0, 1, -4.5), vol: 1.0 });
  // coffee station on west wall
  B.box(R, -6.5, 0, 0.5, 0.7, 0.95, 3.0, B.col(0x5a4a3a), { collide: true });
  B.box(R, -6.5, 0.95, 0.5, 0.75, 0.04, 3.1, B.col(0x2a2a2a));
  for (let i = 0; i < 3; i++) { const cm = B.group(R, -6.6, 0.99, -0.4 + i * 0.6, Math.PI / 2); B.box(cm, 0, 0, -0.1, 0.3, 0.45, 0.1, B.col(0x111111)); B.cyl(cm, 0, 0.02, 0.04, 0.07, 0.085, 0.17, B.col(0x2a160a)); }
  B.signMesh(R, 'FRESH COFFEE 79¢', -6.85, 2.0, 0.5, 1.2, 0.3, { ry: Math.PI / 2, tex: { bg: '#3a1a0a', fg: '#ffd27a' } });
  L.named.coffee = new THREE.Vector3(-6.4, 1.1, 0.5);
  // posters
  B.texPlane(R, TEX.get('poster', 'LOTTO', 'Mega Jackpot $41M', 50), 6.88, 2.2, -2.5, 0.5, 0.65, { ry: -Math.PI / 2 });
  B.texPlane(R, TEX.get('paper', [], { title: 'MISSING', tcol: '#a00', photo: true, w: 128, h: 170 }), 0.4, 1.6, 4.88, 0.24, 0.32, { ry: Math.PI });
  Interact.volume(R, 0.4, 1.6, 4.85, 0.3, 0.36, 0.1, { prompt: 'Read flyer', use: () => UI.doc(STATION_DOCS.carrie, 'flyer') });

  // ambience
  L.loop('fluoro', { pos: new THREE.Vector3(0, 2.9, 0), vol: 0.8 });
  L.loop('roomTone', { vol: 0.3 });
  L.windLoop = L.loop('wind', { vol: 0.0 });
  L.onUpdate(() => { const inside = Math.abs(Player.pos.x) < 7 && Math.abs(Player.pos.z) < 5; const t = inside ? 0.05 : 0.4; if (L._w !== t) { L._w = t; L.windLoop.volume(t, 1); } });
  // surroundings
  const excl = (x, z) => (x > -26 && x < 26 && z > -14 && z < 36);
  P.forest(L, P.scatter(-110, -110, 110, 110, 650, 17, excl, 3.2), { collide: true, collideIf: (x, z) => Math.abs(x) < 40 && Math.abs(z) < 50 });
  L.skyRig = P.sky(L);
  for (let i = -4; i <= 4; i++) B.cyl(R, i * 35, 0, 35.5, 0.14, 0.18, 10, B.mat('bark', { color: 0x9a8a7a }), { seg: 8 });

  // evan's car at pump 2
  L.named.evanCar = P.car(R, 5.3, 14, Math.PI, { color: 0x4d5b4a });
  if (o.joCar !== false) L.named.joCar = P.car(R, -10, 3, Math.PI / 2, { color: 0x6a6a8a, len: 4.2 });
  if (o.dale) L.named.buick = P.car(R, -10, 12, Math.PI / 2 + 0.1, { color: 0x3a1418, len: 5.0, wid: 1.85 });

  L.spawns.car = [7.2, 14, Math.PI / 2];
  L.zone('store', -7, -5, 7, 5);
  G.buildLevel = null;
  return L;
};
