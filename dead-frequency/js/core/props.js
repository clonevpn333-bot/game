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
      const fm = new THREE.MeshStandardMaterial({ map: o.fill(i) });
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
    if (G.buildLevel) B.blob(G.buildLevel.root, p.x, p.z, s ? d : w, s ? w : d, p.y, 0.55);
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
  keyboard(parent, x, y, z, ry = 0) { const g = B.group(parent, x, y, z, ry); const m = new THREE.MeshStandardMaterial({ map: TEX.get('keyboard') }); const k = new THREE.Mesh(B.boxGeo(0.44, 0.025, 0.16, 0), [B.col(0xc9c4b5), B.col(0xc9c4b5), m, B.col(0xc9c4b5), B.col(0xc9c4b5), B.col(0xc9c4b5)]); k.position.y = 0.012; k.rotation.x = 0.05; g.add(k); return g; },
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
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), new THREE.MeshStandardMaterial({ map: dyn.tex }));
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
  // o: { color, len, wid, wagon, lights, beams, kind:'sedan'|'compact'|'buick'|'wagon'|'cruiser', collide }
  car(parent, x, z, ry, o = {}) {
    const g = B.group(parent, x, 0, z, ry);
    const color = o.color || 0x5a6a7a;
    const L = o.len || 4.5, W = o.wid || 1.75, wagon = !!o.wagon, kind = o.kind || (wagon ? 'wagon' : 'sedan');
    const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.45, envMapIntensity: 1 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xd0d4d8, roughness: 0.15, metalness: 1 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x0b1016, roughness: 0.05, metalness: 0.85, envMapIntensity: 1.5 });
    // side profile of the lower body (z along length, y up), extruded across the width
    const hz = L / 2, beltY = 0.86, sill = 0.28;
    const sh = new THREE.Shape();
    sh.moveTo(-hz, sill + 0.08); sh.lineTo(-hz + 0.02, beltY - 0.1); sh.quadraticCurveTo(-hz + 0.05, beltY, -hz + 0.35, beltY + 0.02);
    sh.lineTo(hz - 0.75, beltY + 0.01); sh.quadraticCurveTo(hz - 0.15, beltY - 0.02, hz - 0.02, beltY - 0.14); sh.lineTo(hz, sill + 0.1);
    sh.quadraticCurveTo(hz, sill, hz - 0.15, sill); sh.lineTo(-hz + 0.15, sill); sh.quadraticCurveTo(-hz, sill, -hz, sill + 0.08);
    const bodyGeo = new THREE.ExtrudeGeometry(sh, { depth: W - 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 6 });
    bodyGeo.translate(0, 0, -(W - 0.12) / 2); bodyGeo.rotateY(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, paint); body.castShadow = true; body.receiveShadow = true; g.add(body);
    // greenhouse (cabin)
    const cabL = wagon ? L * 0.6 : (kind === 'compact' ? L * 0.48 : L * 0.44), cabR = wagon ? -hz + 0.25 : -hz + (kind === 'buick' ? 1.15 : 0.95);
    const roofY = beltY + (kind === 'compact' ? 0.5 : 0.47);
    const cs = new THREE.Shape();
    const ws = cabR + cabL + 0.45, rs = cabR - (wagon ? 0.0 : 0.38);
    cs.moveTo(rs, beltY + 0.01); cs.lineTo(ws, beltY + 0.01); cs.lineTo(cabR + cabL - 0.05, roofY - 0.03); cs.quadraticCurveTo(cabR + cabL - 0.1, roofY, cabR + cabL - 0.25, roofY);
    cs.lineTo(cabR + 0.15, roofY); cs.quadraticCurveTo(cabR + 0.02, roofY, cabR - (wagon ? -0.02 : 0.05), roofY - 0.05); cs.lineTo(rs, beltY + 0.01);
    const cabGeo = new THREE.ExtrudeGeometry(cs, { depth: W - 0.3, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 2, curveSegments: 4 });
    cabGeo.translate(0, 0, -(W - 0.3) / 2); cabGeo.rotateY(Math.PI / 2);
    const cab = new THREE.Mesh(cabGeo, glass); cab.castShadow = true; g.add(cab);
    // roof panel + pillars in body colour
    B.box(g, 0, roofY - 0.035, (cabR + cabR + cabL) / 2, W - 0.26, 0.06, cabL - 0.25, paint, { uv: 0 });
    for (const sx of [-1, 1]) {
      const pz = [cabR + cabL - 0.02, cabR + cabL * 0.48, cabR + 0.05];
      pz.forEach((zz, k) => { const pl = B.box(g, sx * (W / 2 - 0.13), beltY, zz, 0.05, roofY - beltY, k === 1 ? 0.09 : 0.12, k === 1 ? trim : paint, { uv: 0 }); if (k === 0) pl.rotation.x = 0.5; if (k === 2 && !wagon) pl.rotation.x = -0.45; });
      B.box(g, sx * (W / 2 + 0.03), 0.5, 0.2, 0.02, 0.03, L * 0.7, trim, { uv: 0, cast: false }); // side trim strip
      B.box(g, sx * (W / 2 - 0.02), beltY + 0.05, cabR + cabL + 0.25, 0.14, 0.08, 0.1, trim); // mirror
      for (const dz of [cabR + cabL * 0.48 + 0.02, cabR + cabL - 0.15]) B.box(g, sx * (W / 2 + 0.035), 0.62, dz, 0.01, 0.025, 0.12, chrome, { uv: 0, cast: false }); // handles
      B.box(g, sx * (W / 2 + 0.032), sill + 0.06, cabR + cabL * 0.48 - 0.02, 0.005, beltY - sill - 0.08, 0.008, trim, { uv: 0, cast: false }); // door seam
    }
    // bumpers, grille, plate
    B.box(g, 0, 0.3, hz + 0.04, W - 0.06, 0.16, 0.12, kind === 'buick' ? chrome : trim);
    B.box(g, 0, 0.3, -hz - 0.04, W - 0.06, 0.16, 0.12, kind === 'buick' ? chrome : trim);
    const grille = B.box(g, 0, 0.5, hz + 0.035, W * 0.45, 0.16, 0.03, trim); void grille;
    for (let k = 0; k < 4; k++) B.box(g, 0, 0.52 + k * 0.035, hz + 0.052, W * 0.43, 0.008, 0.01, chrome, { uv: 0, cast: false });
    if (!P._plateTex) P._plateTex = TEX.get('sign', 'OREGON\n4 8 1 K L T', { w: 256, h: 128, bg: '#e8eef2', fg: '#1a3a6a', size: 40 });
    B.texPlane(g, P._plateTex, 0, 0.42, -hz - 0.101, 0.3, 0.15, { ry: Math.PI });
    // wheels: tire + rim + dark wheel well
    const tireG = new THREE.CylinderGeometry(0.33, 0.33, 0.21, 20), rimG = new THREE.CylinderGeometry(0.2, 0.2, 0.215, 12);
    const tireM = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }), rimM = kind === 'cruiser' ? trim : chrome;
    g.userData.wheels = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const wz = sz * (hz - (kind === 'buick' ? 0.95 : 0.85));
      const well = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.2, 16, 1, false, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x050505 }));
      well.rotation.set(0, 0, Math.PI / 2); well.rotation.order = 'ZXY'; well.position.set(sx * (W / 2 - 0.08), 0.33, wz); g.add(well);
      const wg = new THREE.Group(); wg.position.set(sx * (W / 2 - 0.12), 0.33, wz); g.add(wg);
      const t = new THREE.Mesh(tireG, tireM); t.rotation.z = Math.PI / 2; t.castShadow = true; wg.add(t);
      const rim = new THREE.Mesh(rimG, rimM); rim.rotation.z = Math.PI / 2; wg.add(rim);
      g.userData.wheels.push(wg);
    }
    // lights
    const hlMat = new THREE.MeshBasicMaterial({ color: 0x555544 }), tlMat = new THREE.MeshBasicMaterial({ color: 0x330505 });
    for (const sx of [-1, 1]) {
      const hl = new THREE.Mesh(new THREE.PlaneGeometry(kind === 'buick' ? 0.42 : 0.34, 0.13), hlMat); hl.position.set(sx * (W / 2 - 0.3), 0.6, hz + 0.075); g.add(hl);
      const tl = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.12), tlMat); tl.position.set(sx * (W / 2 - 0.28), 0.68, -hz - 0.07); tl.rotation.y = Math.PI; g.add(tl);
    }
    g.userData.hlMat = hlMat; g.userData.tlMat = tlMat;
    g.userData.setLights = (on, beams) => {
      hlMat.color.set(on ? 0xfffbe8 : 0x555544); tlMat.color.set(on ? 0xff2010 : 0x330505);
      if (beams && !g.userData.beams) {
        g.userData.beams = [];
        for (const sx of [-1, 1]) { const sp = new THREE.SpotLight(0xfff4d8, 60, 45, 0.45, 0.5, 1.2); sp.position.set(sx * 0.55, 0.62, hz + 0.1); sp.target.position.set(sx * 0.5, 0, hz + 12); g.add(sp); g.add(sp.target); g.userData.beams.push(sp); }
        g.userData.halos = [-1, 1].map(sx => P.halo(g, sx * (W / 2 - 0.3), 0.6, hz + 0.12, 0xfff4d8, 1.1, 0.5));
      }
      if (g.userData.beams) g.userData.beams.forEach(bm => { bm.visible = on && !!beams; });
      if (g.userData.halos) g.userData.halos.forEach(h => { h.visible = on; });
    };
    B.blob(g, 0, 0, W * 1.05, L * 0.95, 0, 0.75);
    if (o.collide !== false) {
      const s2 = Math.abs(Math.sin(ry)) > 0.7;
      g.userData.col = Phys.addC(x, z, s2 ? L : W, s2 ? W : L, 0, 1.4, { sight: false });
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

// ---------------------------------------------------------------------------
// Conifers: tapered trunk + whorls of crossed needle-spray cards + a dark core so the silhouette stays dense.
P.branchTex = function () {
  if (P._branchTex) return P._branchTex;
  const c = TEX.canvas(256, 128), x = c.getContext('2d'); const r = U.seeded(4242);
  x.clearRect(0, 0, 256, 128);
  // main twig from left (trunk side) to right (tip)
  const spray = (y0, len, spread, n, base) => {
    for (let i = 0; i < n; i++) {
      const t = r(); const px = 6 + t * len, py = y0 + (r() - 0.5) * 4;
      const w = spread * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (0.6 + r() * 0.5);
      const a = (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.9);
      const g = 40 + r() * 50;
      x.strokeStyle = `rgba(${18 + r() * 20},${g},${22 + r() * 18},${0.75 + r() * 0.25})`;
      x.lineWidth = 1 + r() * 1.3;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * w * 0.5 + 6, py + Math.sin(a) * w); x.stroke();
    }
    x.strokeStyle = 'rgba(60,42,28,.9)'; x.lineWidth = base; x.beginPath(); x.moveTo(0, y0); x.quadraticCurveTo(len * 0.5, y0 + 3, len, y0 + 1); x.stroke();
  };
  spray(64, 240, 52, 2600, 3);
  for (let k = 0; k < 6; k++) { const sx = 40 + k * 32; x.save(); x.translate(sx, 64); x.rotate((k % 2 ? 1 : -1) * 0.7); x.translate(-sx, -64); spray(64, 70, 20, 260, 1.4); x.restore(); }
  const t = TEX.make(c, { clamp: true });
  P._branchTex = t; return t;
};
P.treeGeometries = function () {
  if (P._treeGeos) return P._treeGeos;
  const out = [];
  for (let v = 0; v < 4; v++) {
    const low = v === 3;
    const r = U.seeded(900 + (low ? 0 : v) * 77);
    const pos = [], uv = [], nrm = [], idx = [];
    const card = (ox, oy, oz, dir, len, wid, droop, roll) => {
      // branch along dir (unit, horizontal), drooping; cross-cards rotated about branch axis
      const up = new THREE.Vector3(0, 1, 0);
      const d = new THREE.Vector3(dir.x, -droop, dir.z).normalize();
      const side = new THREE.Vector3().crossVectors(d, up).normalize();
      for (const k of (low ? [0] : [0, 1])) {
        const ang = roll + k * Math.PI / 2;
        const w = side.clone().multiplyScalar(Math.cos(ang)).add(up.clone().cross(side).multiplyScalar(0).add(new THREE.Vector3().crossVectors(side, d).multiplyScalar(Math.sin(ang)))).normalize();
        const b = pos.length / 3;
        const p0 = new THREE.Vector3(ox, oy, oz), p1 = p0.clone().addScaledVector(d, len);
        const tipSag = new THREE.Vector3(0, -len * 0.12, 0);
        const verts = [p0.clone().addScaledVector(w, -wid / 2), p0.clone().addScaledVector(w, wid / 2), p1.clone().add(tipSag).addScaledVector(w, wid / 2), p1.clone().add(tipSag).addScaledVector(w, -wid / 2)];
        const nn = new THREE.Vector3(dir.x, 0.6, dir.z).normalize();
        verts.forEach(q => { pos.push(q.x, q.y, q.z); nrm.push(nn.x, nn.y, nn.z); });
        uv.push(0, 0, 0, 1, 1, 1, 1, 0);
        idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
      }
    };
    const H = 1; // unit height; scaled per instance
    const whorls = low ? 7 : 14 + v * 2;
    for (let i = 0; i < whorls; i++) {
      const t = i / (whorls - 1);
      const y = H * (0.18 + t * 0.8);
      const L = (Math.pow(1 - t, 0.85) * 0.3 + 0.03) * (0.9 + r() * 0.2);
      const n = low ? 4 : 5 + Math.floor(r() * 3);
      const off = r() * 6.28;
      for (let k = 0; k < n; k++) {
        const a = off + k / n * Math.PI * 2 + (r() - 0.5) * 0.4;
        card(0, y + (r() - 0.5) * 0.02, 0, new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), L * (low ? 1.1 : 1), (L * 0.55 + 0.02) * (low ? 1.6 : 1), 0.25 + r() * 0.25 + t * 0.1, low ? 0.4 : r() * 0.6);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    out.push(g);
  }
  const core = new THREE.ConeGeometry(0.16, 0.82, 8, 1, true); core.translate(0, 0.18 + 0.41, 0);
  const trunk = new THREE.CylinderGeometry(0.008, 0.022, 1, 7); trunk.translate(0, 0.5, 0);
  P._treeGeos = { foliage: out, core, trunk };
  return P._treeGeos;
};
// Instanced forest: positions [[x,z,h?,y?],...]
P.forest = function (L, pts, o = {}) {
  const n = pts.length; if (!n) return;
  const geos = P.treeGeometries();
  const r = U.seeded(o.seed || 77);
  const bark = B.mat('bark');
  const fol = new THREE.MeshStandardMaterial({ map: P.branchTex(), alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.92, color: o.tint || 0xc8d6c0 });
  const coreM = new THREE.MeshStandardMaterial({ color: 0x0c140d, roughness: 1, side: THREE.DoubleSide });
  const groups = [[], [], [], []];
  const near = o.near || ((x, z) => Math.hypot(x - (o.cx || 0), z - (o.cz || 0)) < (o.nearR || 60));
  pts.forEach(pt => { const gi = Math.floor(r() * 3); groups[near(pt[0], pt[1]) ? gi : 3].push(pt); });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const trunks = new THREE.InstancedMesh(geos.trunk, bark, n), cores = new THREE.InstancedMesh(geos.core, coreM, n);
  let ti = 0;
  groups.forEach((list, gi) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(geos.foliage[gi], fol, list.length);
    list.forEach((pt, i) => {
      const h = pt[2] || (9 + r() * 10), y = pt[3] || 0, wsc = h * (0.85 + r() * 0.3);
      q.setFromAxisAngle(Y, r() * 6.28);
      m.compose(p.set(pt[0], y - 0.2, pt[1]), q, sc.set(wsc, h, wsc)); im.setMatrixAt(i, m);
      cores.setMatrixAt(ti, m);
      m.compose(p.set(pt[0], y - 0.3, pt[1]), q, sc.set(h, h, h)); trunks.setMatrixAt(ti, m); ti++;
      if (o.collide && (!o.collideIf || o.collideIf(pt[0], pt[1]))) Phys.addC(pt[0], pt[1], 0.45, 0.45, y, y + h, { tag: 'tree' });
    });
    im.castShadow = !!o.shadows; im.receiveShadow = true; L.add(im);
  });
  trunks.castShadow = true; trunks.receiveShadow = true; L.add(trunks); L.add(cores);
  return { trunks, cores };
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
  const r = U.seeded(o.seed || 5), n = 700, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = r() * Math.PI * 2, v = Math.acos(1 - r() * 0.95);
    pos[i * 3] = Math.sin(v) * Math.cos(u) * 420; pos[i * 3 + 1] = Math.cos(v) * 420 + 10; pos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * 420;
    const b = 0.12 + Math.pow(r(), 4) * 0.75; col[i * 3] = b; col[i * 3 + 1] = b; col[i * 3 + 2] = b * (0.9 + r() * 0.2);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.2, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false }));
  stars.renderOrder = -3; sky.renderOrder = -4; L.add(stars);
  const moon = new THREE.DirectionalLight(o.moonColor || 0x6a7a9a, o.moon == null ? 0.22 : o.moon); moon.position.set(-60, 100, 40); L.add(moon);
  const hemi = new THREE.HemisphereLight(0x1a2030, 0x080806, o.hemi == null ? 0.35 : o.hemi); L.add(hemi);
  return { sky, stars, moon, hemi };
};

// soft additive glow around a light source (fog-aware sprite)
P.halo = function (parent, x, y, z, color = 0xffd8a0, size = 1, opacity = 0.6) {
  if (!P._haloTex) { const c = TEX.canvas(64, 64), g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.15, 'rgba(255,255,255,.55)'); gr.addColorStop(0.45, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); P._haloTex = new THREE.CanvasTexture(c); }
  const m = new THREE.SpriteMaterial({ map: P._haloTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  const sp = new THREE.Sprite(m); sp.position.set(x, y, z); sp.scale.set(size, size, 1); parent.add(sp);
  return sp;
};
// drifting ground mist: lit by nearby lights (flashlight, headlights, lamps)
P.mistTex = function () {
  if (P._mistTex) return P._mistTex;
  const c = TEX.canvas(256, 256), x = c.getContext('2d'); const img = x.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let xx = 0; xx < 256; xx++) { const n = U.fbm(xx / 40, y / 40, 71, 4); const v = Math.max(0, Math.min(1, (n - 0.35) * 2.2)); const i = (y * 256 + xx) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v * 255; img.data[i + 3] = 255; }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; P._mistTex = t; return t;
};
P.mist = function (L, o = {}) {
  const layers = [];
  const heights = o.heights || [0.35, 1.2, 2.6];
  heights.forEach((hgt, k) => {
    const tex = P.mistTex().clone(); tex.needsUpdate = true; tex.repeat.set((o.size || 220) / 60, (o.size || 220) / 60);
    const m = new THREE.MeshStandardMaterial({ color: o.color || 0x9aa6b4, transparent: true, opacity: (o.opacity || 0.16) * (1 - k * 0.22), alphaMap: tex, depthWrite: false, roughness: 1, side: THREE.DoubleSide, envMapIntensity: 0 });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(o.size || 220, o.size || 220), m);
    pl.rotation.x = -Math.PI / 2; pl.position.set(o.x || 0, (o.y || 0) + hgt, o.z || 0); pl.renderOrder = 2; L.add(pl);
    layers.push({ pl, tex, sp: 0.004 + k * 0.003, hgt });
  });
  L.onUpdate(dt => { for (const l of layers) { l.tex.offset.x += l.sp * dt; l.tex.offset.y += l.sp * 0.6 * dt; } if (o.follow) { const c = G.camera.position; for (const l of layers) { l.pl.position.x = c.x; l.pl.position.z = c.z; l.pl.position.y = (o.followY ? o.followY() : c.y - 1.4) + l.hgt; } } });
  return layers;
};
// cloud layer + moon
P.clouds = function (L, o = {}) {
  if (!window.ASSET_CLOUD) return;
  if (!P._cloudTex) { P._cloudTex = new THREE.TextureLoader().load(window.ASSET_CLOUD); P._cloudTex.colorSpace = THREE.SRGBColorSpace; }
  const r = U.seeded(o.seed || 3);
  const m = new THREE.MeshBasicMaterial({ map: P._cloudTex, transparent: true, opacity: o.opacity || 0.35, color: o.color || 0x3c4456, depthWrite: false, fog: false });
  for (let k = 0; k < (o.n || 26); k++) {
    const a = r() * Math.PI * 2, d = 160 + r() * 220, h = 70 + r() * 90, s = 90 + r() * 140;
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.55), m);
    pl.position.set(Math.cos(a) * d, h, Math.sin(a) * d); pl.lookAt(0, h * 0.4, 0); pl.renderOrder = -1; L.add(pl);
  }
  const moon = P.halo(L.root || L, -150, 230, -260, 0xc8d4ff, 34, 0.55); moon.material.fog = false;
  const core = P.halo(L.root || L, -150, 230, -260, 0xffffff, 9, 0.9); core.material.fog = false;
};
// grass tufts (instanced crossed cards)
P.grass = function (L, pts, o = {}) {
  if (!pts.length) return;
  if (!P._grassTex) { const c = TEX.canvas(128, 128), x = c.getContext('2d'); const r = U.seeded(55); for (let k = 0; k < 140; k++) { const bx = 10 + r() * 108, h = 50 + r() * 75; x.strokeStyle = `rgba(${60 + r() * 50},${70 + r() * 50},${35 + r() * 20},1)`; x.lineWidth = 1.5 + r() * 1.5; x.beginPath(); x.moveTo(bx, 128); x.quadraticCurveTo(bx + (r() - 0.5) * 20, 128 - h * 0.6, bx + (r() - 0.5) * 34, 128 - h); x.stroke(); } P._grassTex = TEX.make(c, { clamp: true }); }
  const geo = new THREE.BufferGeometry();
  const pos = [], uv = [], idx = [];
  for (let k = 0; k < 2; k++) { const a = k * Math.PI / 2, cx = Math.cos(a) * 0.35, cz = Math.sin(a) * 0.35, b = pos.length / 3; pos.push(-cx, 0, -cz, cx, 0, cz, cx, 0.5, cz, -cx, 0.5, -cz); uv.push(0, 0, 1, 0, 1, 1, 0, 1); idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map: P._grassTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1, color: o.color || 0x9a9a80 });
  const im = new THREE.InstancedMesh(geo, mat, pts.length); const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(); const r = U.seeded(o.seed || 9);
  pts.forEach((pt, i) => { const s2 = 0.6 + r() * 0.9; q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28); m.compose(p.set(pt[0], pt[2] || 0, pt[1]), q, sc.set(s2, s2 * (0.7 + r() * 0.6), s2)); im.setMatrixAt(i, m); });
  im.receiveShadow = true; L.add(im); return im;
};

// ---------------------------------------------------------------------------
// Retail products: instanced packages with printed-label texture and per-instance colour.
P.labelTex = function () {
  if (P._labelTex) return P._labelTex;
  const c = TEX.canvas(64, 128), x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 128);
  x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(6, 20, 52, 26);
  x.fillStyle = 'rgba(0,0,0,.55)'; x.font = 'bold 15px Arial'; x.fillText('▬▬', 14, 38);
  x.fillStyle = 'rgba(255,240,120,.9)'; x.beginPath(); x.arc(32, 78, 16, 0, 7); x.fill();
  x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, 108, 64, 20);
  x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(8, 112, 30, 4);
  return (P._labelTex = TEX.make(c, { clamp: true }));
};
// items: [{x,y,z,w,h,d,ry,color}] in parent space
P.products = function (parent, items, o = {}) {
  if (!items.length) return null;
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ map: P.labelTex(), roughness: o.roughness || 0.45, metalness: 0 });
  const im = new THREE.InstancedMesh(geo, mat, items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
  items.forEach((it, i) => { q.setFromAxisAngle(Y, it.ry || 0); m.compose(p.set(it.x, it.y, it.z), q, s.set(it.w, it.h, it.d)); im.setMatrixAt(i, m); im.setColorAt(i, c.set(it.color)); });
  im.castShadow = false; im.receiveShadow = true; parent.add(im);
  return im;
};
const PRODUCT_COLORS = [0xd8262a, 0x2a5ad8, 0xf0c020, 0x2a9a3a, 0xe86a1a, 0x7a2ab0, 0x1a1a1a, 0xe8e0d0, 0x1aa0c8, 0xb01a5a, 0x8a5a2a, 0xc8c8c8];
// fill a shelf run (local x from -w/2..w/2) with packages facing +z at height y
P.shelfRow = function (items, r, x0, w, y, z, maxH, kind) {
  let x = x0 - w / 2 + 0.02;
  while (x < x0 + w / 2 - 0.05) {
    const col = PRODUCT_COLORS[Math.floor(r() * PRODUCT_COLORS.length)];
    const pw = kind === 'cans' ? 0.07 : kind === 'packs' ? 0.055 : 0.1 + r() * 0.14, ph = kind === 'cans' ? 0.12 : kind === 'packs' ? 0.09 : Math.min(maxH, 0.12 + r() * 0.22), pd = kind === 'packs' ? 0.025 : 0.06 + r() * 0.08;
    const n = kind === 'chips' ? 1 : (1 + Math.floor(r() * 3));
    for (let k = 0; k < n; k++) items.push({ x: x + pw / 2, y, z: z - k * (pd + 0.01), w: pw * 0.96, h: ph, d: pd, ry: (r() - 0.5) * 0.08, color: col });
    x += pw + (r() < 0.08 ? 0.08 : 0.004);
  }
};

// ---------------------------------------------------------------------------
// Clutter helpers
P.papers = function (parent, x, y, z, n = 4, seed = 1, spread = 0.25) {
  const r = U.seeded(seed);
  for (let i = 0; i < n; i++) {
    const lines = []; for (let k = 0; k < 9; k++) lines.push('—'.repeat(3 + Math.floor(r() * 8)));
    const t = TEX.get('paper', lines, { fs: 9, w: 96, h: 128, bg: r() < 0.2 ? '#f6f0a8' : '#efeae0' });
    B.texPlane(parent, t, x + (r() - 0.5) * spread, y + 0.002 + i * 0.002, z + (r() - 0.5) * spread, 0.21, 0.28, { rx: -Math.PI / 2, rz: (r() - 0.5) * 0.8 });
  }
};
P.binders = function (parent, x, y, z, n, ry = 0, seed = 2) {
  const g = B.group(parent, x, y, z, ry); const r = U.seeded(seed);
  let px = 0; for (let i = 0; i < n; i++) { const w = 0.05 + r() * 0.03, h = 0.28 + r() * 0.04; const c = [0x1a3a6a, 0x6a1a1a, 0x1a4a2a, 0x2a2a2a, 0xd8d0b8][Math.floor(r() * 5)]; const b = B.box(g, px + w / 2, 0, 0, w - 0.004, h, 0.22, B.col(c, { roughness: 0.5 }), { cast: false }); b.rotation.z = r() < 0.15 ? 0.2 : 0; px += w; }
  return g;
};
P.deskLamp = function (parent, x, y, z, ry = 0) {
  const g = B.group(parent, x, y, z, ry); const m = B.col(0x2a2a2a, { roughness: 0.4, metalness: 0.5 });
  B.cyl(g, 0, 0, 0, 0.07, 0.08, 0.02, m); const a1 = B.cyl(g, 0, 0.02, 0, 0.008, 0.008, 0.32, m); a1.rotation.z = 0.3; a1.position.set(-0.05, 0.17, 0);
  const sh = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0x1f3a2a, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.3 })); sh.position.set(0.06, 0.32, 0); sh.rotation.z = 0.9; g.add(sh);
  return g;
};
P.cdStack = function (parent, x, y, z, n = 6, seed = 3, ry = 0) {
  const g = B.group(parent, x, y, z, ry); const r = U.seeded(seed);
  for (let i = 0; i < n; i++) { const c = B.box(g, (r() - 0.5) * 0.02, i * 0.011, (r() - 0.5) * 0.02, 0.142, 0.01, 0.125, B.col([0x88aacc, 0x2a2a2a, 0xc84a2a, 0xe8d8a0, 0x3a6a3a][Math.floor(r() * 5)], { roughness: 0.2 }), { cast: false }); c.rotation.y = (r() - 0.5) * 0.3; }
  return g;
};
P.cable = function (parent, pts, color = 0x111111, r = 0.006) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, r, 5, false), B.col(color, { roughness: 0.6 })); parent.add(m); return m;
};
P.frame = function (parent, tex, x, y, z, w, h, ry = 0) {
  const g = B.group(parent, x, y, z, ry);
  B.box(g, 0, -h / 2 - 0.03, 0, w + 0.06, h + 0.06, 0.025, B.col(0x2a2018, { roughness: 0.5 }));
  B.texPlane(g, tex, 0, 0, 0.014, w, h, {});
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, roughness: 0.05, metalness: 0.9 })); gl.position.z = 0.016; g.add(gl);
  return g;
};
P.cup = function (parent, x, y, z, color = 0xf0eee6) { return B.cyl(parent, x, y, z, 0.04, 0.032, 0.11, B.col(color, { roughness: 0.5 }), { cast: false }); };
