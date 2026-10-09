'use strict';
// Reusable props built from primitives. All return a THREE.Group (positioned) unless noted.

const P = {
  desk(parent, x, z, ry = 0, o = {}) {
    const g = B.group(parent, x, 0, z, ry);
    const w = o.w || 1.5, d = o.d || 0.75, h = o.h || 0.76;
    const top = B.mat('woodDoor', { color: o.color || 0xb08a62 });
    B.box(g, 0, h - 0.04, 0, w, 0.04, d, top);
    const side = B.col(o.side || 0x6b5a48);
    B.box(g, -w / 2 + 0.03, 0, 0, 0.04, h - 0.04, d - 0.04, side);
    B.box(g, w / 2 - 0.03, 0, 0, 0.04, h - 0.04, d - 0.04, side);
    B.box(g, 0, 0.3, -d / 2 + 0.03, w - 0.06, h - 0.38, 0.03, side);
    if (o.drawers !== false) { B.box(g, w / 2 - 0.25, 0.05, 0.02, 0.42, h - 0.12, d - 0.1, side); for (let i = 0; i < 3; i++) B.box(g, w / 2 - 0.25, 0.1 + i * 0.22, d / 2 - 0.07, 0.36, 0.18, 0.02, B.col(0x7d6a55)); }
    P.collideLocal(g, w, d, h);
    return g;
  },
  table(parent, x, z, ry = 0, o = {}) {
    const g = B.group(parent, x, 0, z, ry);
    const w = o.w || 1.2, d = o.d || 0.8, h = o.h || 0.74;
    B.box(g, 0, h - 0.03, 0, w, 0.03, d, B.col(o.color || 0xd6d0c0));
    const leg = B.col(0x777777);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(g, sx * (w / 2 - 0.05), 0, sz * (d / 2 - 0.05), 0.04, h - 0.03, 0.04, leg);
    P.collideLocal(g, w, d, h, false);
    return g;
  },
  chair(parent, x, z, ry = 0, o = {}) {
    const g = B.group(parent, x, 0, z, ry);
    const c = B.col(o.color || 0x3a3f4a), m = B.col(0x555555);
    B.box(g, 0, 0.44, 0, 0.44, 0.06, 0.44, c);
    B.box(g, 0, 0.5, -0.2, 0.44, 0.42, 0.05, c);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(g, sx * 0.19, 0, sz * 0.19, 0.03, 0.44, 0.03, m);
    return g;
  },
  officeChair(parent, x, z, ry = 0, o = {}) {
    const g = B.group(parent, x, 0, z, ry);
    const c = B.col(o.color || 0x272a30), m = B.col(0x333333);
    B.box(g, 0, 0.45, 0, 0.5, 0.08, 0.48, c);
    B.box(g, 0, 0.55, -0.24, 0.48, 0.55, 0.07, c);
    B.cyl(g, 0, 0.1, 0, 0.03, 0.03, 0.35, m);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; B.box(g, Math.cos(a) * 0.17, 0.05, Math.sin(a) * 0.17, 0.3, 0.04, 0.04, m, { rotY: -a }); }
    return g;
  },
  shelf(parent, x, z, ry = 0, o = {}) {
    const g = B.group(parent, x, 0, z, ry);
    const w = o.w || 1.0, d = o.d || 0.35, h = o.h || 2.0, n = o.n || 5;
    const m = B.col(o.color || 0x6f6a60);
    B.box(g, -w / 2, 0, 0, 0.03, h, d, m); B.box(g, w / 2, 0, 0, 0.03, h, d, m); B.box(g, 0, 0, -d / 2, w, h, 0.02, m);
    for (let i = 0; i < n; i++) B.box(g, 0, 0.05 + i * (h - 0.1) / (n - 1), 0, w, 0.025, d, m);
    if (o.fill) for (let i = 0; i < n - 1; i++) {
      const fm = new THREE.MeshLambertMaterial({ map: o.fill(i) });
      const y0 = 0.075 + i * (h - 0.1) / (n - 1), sh = (h - 0.1) / (n - 1) - 0.05;
      const fill = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, Math.min(sh, o.fillH || sh)), fm);
      fill.position.set(0, y0 + Math.min(sh, o.fillH || sh) / 2, d / 2 - 0.04); g.add(fill);
      const block = B.box(g, 0, y0, 0, w - 0.06, Math.min(sh, o.fillH || sh) - 0.01, d - 0.1, B.col(0x222222));
      void block;
    }
    P.collideLocal(g, w, d, h);
    return g;
  },
  cabinet(parent, x, z, ry = 0, o = {}) { // filing cabinet
    const g = B.group(parent, x, 0, z, ry);
    const w = o.w || 0.45, d = o.d || 0.6, h = o.h || 1.3, n = o.n || 4;
    const m = B.mat('metal', { color: o.color || 0xbab6a6 });
    B.box(g, 0, 0, 0, w, h, d, m);
    for (let i = 0; i < n; i++) { B.box(g, 0, 0.05 + i * h / n, d / 2, w - 0.04, h / n - 0.04, 0.01, B.col(0xaaa596)); B.box(g, 0, 0.05 + i * h / n + h / n * 0.6, d / 2 + 0.01, 0.12, 0.02, 0.02, B.col(0x777777)); }
    P.collideLocal(g, w, d, h);
    return g;
  },
  couch(parent, x, z, ry = 0, o = {}) {
    const g = B.group(parent, x, 0, z, ry);
    const c = B.mat('carpet', { color: o.color || 0x8a6a50, texArgs: ['#7a6450'] });
    const w = o.w || 2.0;
    B.box(g, 0, 0.1, 0, w, 0.32, 0.85, c); B.box(g, 0, 0.42, -0.33, w, 0.45, 0.2, c);
    B.box(g, -w / 2 + 0.1, 0.1, 0, 0.2, 0.55, 0.85, c); B.box(g, w / 2 - 0.1, 0.1, 0, 0.2, 0.55, 0.85, c);
    B.box(g, 0, 0, 0, w, 0.1, 0.8, B.col(0x2a2018));
    P.collideLocal(g, w, 0.85, 0.85);
    return g;
  },
  // generic collision box for group with local w/d (rotation-aware for 90 deg steps)
  collideLocal(g, w, d, h, sight = true) {
    const s = Math.abs(Math.sin(g.rotation.y)) > 0.7;
    const p = g.getWorldPosition(new THREE.Vector3());
    return Phys.addC(p.x, p.z, s ? d : w, s ? w : d, p.y, p.y + h, { sight });
  },
  mug(parent, x, y, z, o = {}) {
    const g = B.group(parent, x, y, z);
    const m = B.col(o.color || 0xe8e4da);
    B.cyl(g, 0, 0, 0, 0.042, 0.038, 0.1, m, { seg: 10 });
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 5, 8, Math.PI), m); handle.position.set(0.045, 0.05, 0); handle.rotation.z = -Math.PI / 2; g.add(handle);
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.037, 10), B.col(0x2a160a)); coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.085; coffee.visible = !!o.full; g.add(coffee);
    g.userData.coffee = coffee;
    return g;
  },
  crt(parent, x, y, z, ry = 0, o = {}) { // CRT monitor; returns {group, screen}
    const g = B.group(parent, x, y, z, ry);
    const beige = B.col(o.color || 0xd8d2bf);
    B.box(g, 0, 0, -0.08, 0.42, 0.36, 0.3, beige);
    B.box(g, 0, 0.04, -0.3, 0.3, 0.26, 0.2, beige);
    B.box(g, 0, -0.02, -0.05, 0.25, 0.02, 0.2, beige);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.26), o.screenMat || new THREE.MeshBasicMaterial({ color: 0x0a1a12 }));
    scr.position.set(0, 0.185, 0.071); g.add(scr);
    return { group: g, screen: scr };
  },
  pcTower(parent, x, z, ry = 0) { const g = B.group(parent, x, 0, z, ry); B.box(g, 0, 0, 0, 0.2, 0.45, 0.45, B.col(0xd8d2bf)); B.box(g, 0, 0.35, 0.226, 0.14, 0.04, 0.005, B.col(0x222222)); const led = B.box(g, 0.06, 0.1, 0.226, 0.01, 0.01, 0.005, B.glow(0x33ff55)); void led; return g; },
  keyboard(parent, x, y, z, ry = 0) { const g = B.group(parent, x, y, z, ry); const m = new THREE.MeshLambertMaterial({ map: TEX.get('keyboard') }); const k = new THREE.Mesh(B.boxGeo(0.44, 0.025, 0.16, 0), [B.col(0xc9c4b5), B.col(0xc9c4b5), m, B.col(0xc9c4b5), B.col(0xc9c4b5), B.col(0xc9c4b5)]); k.position.y = 0.012; k.rotation.x = 0.05; g.add(k); return g; },
  deskPhone(parent, x, y, z, ry = 0) { // multi-line desk phone; returns {group, lights:[]}
    const g = B.group(parent, x, y, z, ry);
    const dark = B.col(0x2b2b2e);
    B.box(g, 0, 0, 0, 0.22, 0.05, 0.22, dark);
    const wedge = B.box(g, 0, 0.04, 0.02, 0.2, 0.03, 0.16, B.col(0x3a3a3e)); wedge.rotation.x = 0.2;
    const hs = B.box(g, -0.06, 0.07, 0, 0.06, 0.05, 0.21, dark); g.userData.handset = hs;
    const lights = [];
    for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.01, 0.016), new THREE.MeshBasicMaterial({ color: 0x220000 })); l.position.set(0.07, 0.075, -0.05 + i * 0.035); g.add(l); lights.push(l); }
    return { group: g, lights, handset: hs };
  },
  clock(parent, x, y, z, ry = 0) { // analog wall clock; returns dynamic updater
    const g = B.group(parent, x, y, z, ry);
    const dyn = TEX.dynamic(128, 128, (c, w, h, min = 0) => {
      c.fillStyle = '#f1ede2'; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill(); c.strokeStyle = '#222'; c.lineWidth = 4; c.stroke();
      c.fillStyle = '#222'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.fillRect(64 + Math.sin(a) * 50 - 2, 64 - Math.cos(a) * 50 - 2, 4, 4); }
      const hr = (min / 60) % 12, mn = min % 60;
      const hand = (a, l, wd) => { c.lineWidth = wd; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.sin(a) * l, 64 - Math.cos(a) * l); c.stroke(); };
      c.strokeStyle = '#111'; hand(hr / 12 * Math.PI * 2, 30, 5); hand(mn / 60 * Math.PI * 2, 46, 3);
      c.fillStyle = '#a00'; c.font = '9px Arial'; c.textAlign = 'center'; c.fillText('KTLR', 64, 90);
    });
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), new THREE.MeshLambertMaterial({ map: dyn.tex }));
    face.position.z = 0.02; g.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.015, 6, 24), B.col(0x222222)); rim.position.z = 0.02; g.add(rim);
    let last = -1;
    return { group: g, update: (min) => { const m = Math.floor(min); if (m !== last) { last = m; dyn.redraw(m); } } };
  },
  trash(parent, x, z, o = {}) { const g = B.group(parent, x, 0, z); B.cyl(g, 0, 0, 0, o.r || 0.17, (o.r || 0.17) * 0.85, o.h || 0.4, B.col(o.color || 0x3b4a3b), { open: true }); return g; },
  plant(parent, x, z) {
    const g = B.group(parent, x, 0, z);
    B.cyl(g, 0, 0, 0, 0.18, 0.13, 0.32, B.col(0x7a4a30));
    const lm = B.col(0x2f4a2a);
    for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.6, 4), lm); const a = i / 9 * Math.PI * 2; l.position.set(Math.cos(a) * 0.08, 0.6, Math.sin(a) * 0.08); l.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); g.add(l); }
    return g;
  },
  speakerBox(parent, x, y, z, ry = 0, s = 1) { const g = B.group(parent, x, y, z, ry); B.box(g, 0, 0, 0, 0.22 * s, 0.32 * s, 0.2 * s, B.col(0x1d1d1f)); const c = new THREE.Mesh(new THREE.CircleGeometry(0.075 * s, 12), B.col(0x0d0d0d)); c.position.set(0, 0.12 * s, 0.101 * s); g.add(c); const t = new THREE.Mesh(new THREE.CircleGeometry(0.025 * s, 8), B.col(0x0d0d0d)); t.position.set(0, 0.25 * s, 0.101 * s); g.add(t); return g; },
  ceilingSpeaker(parent, x, y, z) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.13, 14), B.col(0xe0ddd2)); m.rotation.x = Math.PI / 2; m.position.set(x, y - 0.005, z); parent.add(m); const m2 = new THREE.Mesh(new THREE.CircleGeometry(0.1, 14), B.col(0x9a978d)); m2.rotation.x = Math.PI / 2; m2.position.set(x, y - 0.008, z); parent.add(m2); return m; },
  boxes(parent, x, z, n = 3, seed = 1) { // cardboard boxes stack
    const r = U.seeded(seed); const m = B.col(0xa07850); const g = B.group(parent, x, 0, z);
    let y = 0;
    for (let i = 0; i < n; i++) { const w = 0.4 + r() * 0.25, h = 0.28 + r() * 0.2, d = 0.35 + r() * 0.2; B.box(g, (r() - 0.5) * 0.1, y, (r() - 0.5) * 0.1, w, h, d, m, { rotY: (r() - 0.5) * 0.3 }); y += h; }
    Phys.addC(x, z, 0.6, 0.55, 0, y);
    return g;
  },
  bulletin(parent, x, y, z, ry, items = []) { // cork board with papers; items: [{tex, x, y, w, h}]
    const g = B.group(parent, x, y, z, ry);
    B.box(g, 0, 0, 0, 1.3, 0.9, 0.03, B.col(0x8a6a44));
    B.box(g, 0, 0.03, 0.005, 1.22, 0.84, 0.03, B.col(0xb88d5c));
    for (const it of items) { const p = B.texPlane(g, it.tex, it.x, it.y + 0.45, 0.037, it.w, it.h); p.rotation.z = it.rot || 0; it.mesh = p; }
    return g;
  },
  generatorUnit(parent, x, z, ry = 0) { // standby generator enclosure
    const g = B.group(parent, x, 0, z, ry);
    const m = B.mat('metal', { color: 0xb9b3a0 });
    B.box(g, 0, 0, 0, 1.6, 0.12, 0.9, B.col(0x777777));
    const body = B.box(g, 0, 0.12, 0, 1.5, 1.0, 0.8, m);
    B.box(g, 0, 1.12, 0, 1.55, 0.06, 0.85, B.col(0xa9a390));
    for (let i = 0; i < 8; i++) B.box(g, -0.5 + i * 0.12, 0.4, 0.405, 0.06, 0.4, 0.01, B.col(0x6d6a60));
    P.collideLocal(g, 1.6, 0.9, 1.2);
    return { group: g, body };
  },
  // ---- vehicles ----
  car(parent, x, z, ry, o = {}) {
    const g = B.group(parent, x, 0, z, ry);
    const color = o.color || 0x5a6a7a;
    const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.35 });
    const dark = B.col(0x111111), glass = new THREE.MeshStandardMaterial({ color: 0x0a0e14, roughness: 0.1, metalness: 0.7 });
    const L = o.len || 4.5, W = o.wid || 1.75, wagon = !!o.wagon;
    B.box(g, 0, 0.3, 0, W, 0.55, L, paint);                  // body
    B.box(g, 0, 0.3, L / 2 - 0.05, W - 0.1, 0.2, 0.1, B.col(0x999999)); // bumper
    B.box(g, 0, 0.3, -L / 2 + 0.05, W - 0.1, 0.2, 0.1, B.col(0x999999));
    const cabL = wagon ? L * 0.62 : L * 0.46, cabZ = wagon ? -L * 0.1 : -L * 0.04;
    B.box(g, 0, 0.85, cabZ, W - 0.12, 0.5, cabL, glass);         // cabin glass
    B.box(g, 0, 1.33, cabZ, W - 0.14, 0.06, cabL - 0.15, paint);  // roof
    for (const sx of [-1, 1]) { B.box(g, sx * (W / 2 - 0.07), 0.85, cabZ + cabL / 2 - 0.08, 0.06, 0.5, 0.08, paint); B.box(g, sx * (W / 2 - 0.07), 0.85, cabZ, 0.06, 0.5, 0.08, paint); B.box(g, sx * (W / 2 - 0.07), 0.85, cabZ - cabL / 2 + 0.08, 0.06, 0.5, 0.08, paint); }
    const wheelG = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 14);
    g.userData.wheels = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const wm = new THREE.Mesh(wheelG, dark); wm.rotation.z = Math.PI / 2; wm.position.set(sx * (W / 2 - 0.12), 0.32, sz * (L / 2 - 0.85)); wm.castShadow = true; g.add(wm); g.userData.wheels.push(wm); }
    // lights
    const hlMat = new THREE.MeshBasicMaterial({ color: 0x555544 });
    const tlMat = new THREE.MeshBasicMaterial({ color: 0x330505 });
    for (const sx of [-1, 1]) { const hl = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.14), hlMat); hl.position.set(sx * (W / 2 - 0.3), 0.68, L / 2 + 0.001); g.add(hl); const tl = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.14), tlMat); tl.position.set(sx * (W / 2 - 0.3), 0.68, -L / 2 - 0.001); tl.rotation.y = Math.PI; g.add(tl); }
    g.userData.hlMat = hlMat; g.userData.tlMat = tlMat;
    g.userData.setLights = (on, beams) => {
      hlMat.color.set(on ? 0xfffbe8 : 0x555544); tlMat.color.set(on ? 0xff2010 : 0x330505);
      if (beams && !g.userData.beams) {
        g.userData.beams = [];
        for (const sx of [-1, 1]) { const s = new THREE.SpotLight(0xfff4d8, 60, 45, 0.45, 0.5, 1.2); s.position.set(sx * 0.55, 0.7, L / 2); s.target.position.set(sx * 0.5, 0, L / 2 + 12); g.add(s); g.add(s.target); g.userData.beams.push(s); }
      }
      if (g.userData.beams) g.userData.beams.forEach(b => { b.visible = on && !!beams; });
    };
    if (o.collide !== false) {
      const s = Math.abs(Math.sin(ry)) > 0.7;
      g.userData.col = Phys.addC(x, z, s ? L : W, s ? W : L, 0, 1.4, { sight: false });
    }
    if (o.lights) g.userData.setLights(true, o.beams);
    return g;
  },
  // ---- nature ----
  pine(parent, x, z, h = 12, seed = 1, o = {}) {
    const r = U.seeded(seed);
    const g = B.group(parent, x, o.y || 0, z, r() * 6);
    const trunk = B.mat('bark'); const fol = B.mat('pine', { color: o.tint || 0xffffff });
    B.cyl(g, 0, 0, 0, 0.12 * h / 12, 0.25 * h / 12, h * 0.85, trunk, { seg: 7 });
    const tiers = 4 + Math.floor(r() * 2);
    for (let i = 0; i < tiers; i++) { const t = i / tiers; const rad = (1 - t) * 2.1 * h / 12 + 0.3; const ch = h * 0.32; const c = new THREE.Mesh(new THREE.ConeGeometry(rad, ch, 7), fol); c.position.y = h * 0.3 + t * h * 0.62; c.rotation.y = r() * 3; c.castShadow = true; g.add(c); }
    if (o.collide !== false) Phys.addC(x, z, 0.5 * h / 12, 0.5 * h / 12, 0, h, { tag: 'tree' });
    return g;
  },
};

// Instanced forest: positions [[x,z,h?,y?],...]
P.forest = function (L, pts, o = {}) {
  const n = pts.length; if (!n) return;
  const trunkG = new THREE.CylinderGeometry(0.12, 0.26, 1, 6); trunkG.translate(0, 0.5, 0);
  const trunk = new THREE.InstancedMesh(trunkG, B.mat('bark'), n);
  const tiers = [];
  const fol = B.mat('pine', { color: o.tint || 0xffffff });
  for (let t = 0; t < 4; t++) { const cg = new THREE.ConeGeometry(1, 1, 7); cg.translate(0, 0.5, 0); tiers.push(new THREE.InstancedMesh(cg, fol, n)); }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const r = U.seeded(o.seed || 77);
  pts.forEach((pt, i) => {
    const h = pt[2] || (9 + r() * 10), y = pt[3] || 0;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28);
    m.compose(p.set(pt[0], y - 0.3, pt[1]), q, s.set(h / 12, h * 0.8, h / 12)); trunk.setMatrixAt(i, m);
    const lean = (r() - 0.5) * 0.06;
    for (let t = 0; t < 4; t++) {
      const f = t / 4; const rad = (1 - f) * 2.0 * h / 12 + 0.35; const ch = h * 0.36;
      q.setFromEuler(new THREE.Euler(lean, r() * 6.28, lean));
      m.compose(p.set(pt[0], y + h * 0.22 + f * h * 0.58, pt[1]), q, s.set(rad, ch, rad)); tiers[t].setMatrixAt(i, m);
    }
    if (o.collide && (!o.collideIf || o.collideIf(pt[0], pt[1]))) Phys.addC(pt[0], pt[1], 0.45, 0.45, y, y + h, { tag: 'tree' });
  });
  trunk.castShadow = true; trunk.receiveShadow = true;
  L.add(trunk); tiers.forEach(t => { t.castShadow = !!o.shadows; t.receiveShadow = false; L.add(t); });
  return { trunk, tiers };
};

// scatter helper: returns points in [x0,x1]x[z0,z1] spaced, excluding rects/fn
P.scatter = function (x0, z0, x1, z1, count, seed, exclude, minGap = 2.2) {
  const r = U.seeded(seed); const out = [];
  let tries = 0;
  while (out.length < count && tries < count * 20) {
    tries++;
    const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0);
    if (exclude && exclude(x, z)) continue;
    let ok = true; for (const q of out) { if (Math.abs(q[0] - x) < minGap && Math.abs(q[1] - z) < minGap) { ok = false; break; } }
    if (ok) out.push([x, z]);
  }
  return out;
};

// Planar mirror (oblique-clipped reflection, rendered only when enabled())
P.mirror = function (L, x, y, z, w, h, ry, enabled) {
  const rt = new THREE.WebGLRenderTarget(256, 256, { type: THREE.UnsignedByteType });
  const vcam = new THREE.PerspectiveCamera();
  const textureMatrix = new THREE.Matrix4();
  const mat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, textureMatrix: { value: textureMatrix } },
    vertexShader: 'uniform mat4 textureMatrix; varying vec4 vUv; void main(){ vUv = textureMatrix * vec4(position,1.0); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec4 vUv; void main(){ vec3 c = texture2DProj(tDiffuse, vUv).rgb; gl_FragColor = vec4(c*vec3(0.82,0.86,0.88), 1.0); }',
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z); mesh.rotation.y = ry; L.add(mesh);
  const v = { normal: new THREE.Vector3(), mpos: new THREE.Vector3(), cpos: new THREE.Vector3(), rot: new THREE.Matrix4(), look: new THREE.Vector3(), target: new THREE.Vector3(), view: new THREE.Vector3(), plane: new THREE.Plane(), clip: new THREE.Vector4(), q: new THREE.Vector4() };
  Engine.addView({ rt, camera: vcam, fps: 20, enabled, hide: [mesh], before: () => {
    const cam = G.camera; mesh.updateMatrixWorld(); cam.updateMatrixWorld();
    v.mpos.setFromMatrixPosition(mesh.matrixWorld); v.cpos.setFromMatrixPosition(cam.matrixWorld);
    v.rot.extractRotation(mesh.matrixWorld); v.normal.set(0, 0, 1).applyMatrix4(v.rot);
    v.view.subVectors(v.mpos, v.cpos);
    v.view.reflect(v.normal).negate(); v.view.add(v.mpos);
    v.rot.extractRotation(cam.matrixWorld);
    v.look.set(0, 0, -1).applyMatrix4(v.rot).add(v.cpos);
    v.target.subVectors(v.mpos, v.look).reflect(v.normal).negate().add(v.mpos);
    vcam.position.copy(v.view); vcam.up.set(0, 1, 0).applyMatrix4(v.rot).reflect(v.normal); vcam.lookAt(v.target);
    vcam.far = cam.far; vcam.updateMatrixWorld(); vcam.projectionMatrix.copy(cam.projectionMatrix);
    textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    textureMatrix.multiply(vcam.projectionMatrix); textureMatrix.multiply(vcam.matrixWorldInverse); textureMatrix.multiply(mesh.matrixWorld);
    v.plane.setFromNormalAndCoplanarPoint(v.normal, v.mpos); v.plane.applyMatrix4(vcam.matrixWorldInverse);
    v.clip.set(v.plane.normal.x, v.plane.normal.y, v.plane.normal.z, v.plane.constant);
    const pm = vcam.projectionMatrix.elements;
    v.q.x = (Math.sign(v.clip.x) + pm[8]) / pm[0]; v.q.y = (Math.sign(v.clip.y) + pm[9]) / pm[5]; v.q.z = -1; v.q.w = (1 + pm[10]) / pm[14];
    v.clip.multiplyScalar(2 / v.clip.dot(v.q));
    pm[2] = v.clip.x; pm[6] = v.clip.y; pm[10] = v.clip.z + 1 - 0.003; pm[14] = v.clip.w;
    vcam.projectionMatrixInverse.copy(vcam.projectionMatrix).invert();
  } });
  return mesh;
};

// night sky dome + stars + moonlight
P.sky = function (L, o = {}) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 24, 12), new THREE.MeshBasicMaterial({ map: TEX.get('sky'), side: THREE.BackSide, fog: false }));
  L.add(sky);
  const r = U.seeded(o.seed || 5), n = 1400, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = r() * Math.PI * 2, v = Math.acos(1 - r() * 0.95);
    pos[i * 3] = Math.sin(v) * Math.cos(u) * 420; pos[i * 3 + 1] = Math.cos(v) * 420 + 10; pos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * 420;
    const b = 0.25 + Math.pow(r(), 3) * 0.9; col[i * 3] = b; col[i * 3 + 1] = b; col[i * 3 + 2] = b * (0.9 + r() * 0.2);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false }));
  L.add(stars);
  const moon = new THREE.DirectionalLight(o.moonColor || 0x6a7a9a, o.moon == null ? 0.22 : o.moon); moon.position.set(-60, 100, 40); L.add(moon);
  const hemi = new THREE.HemisphereLight(0x1a2030, 0x080806, o.hemi == null ? 0.35 : o.hemi); L.add(hemi);
  return { sky, stars, moon, hemi };
};
