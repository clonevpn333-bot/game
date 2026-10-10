'use strict';
// Spline roads for driving: Route 9 (flat valley) and the mountain road up to Kessler Ridge.

const ROADS = {
  route9: { pts: [[0, 0, 0], [4, 160, 0], [30, 360, 1.5], [22, 560, 2.5], [-6, 760, 2], [0, 960, 1.5]], mountain: 0, fog: 0.022, seed: 3 },
  mountain: { pts: [[0, 0, 0], [0, 250, 5], [60, 450, 20], [200, 560, 45], [330, 700, 70], [350, 900, 95], [250, 1080, 120], [120, 1200, 140], [100, 1400, 165], [220, 1580, 190], [380, 1640, 210], [520, 1760, 235], [540, 1960, 255], [450, 2140, 275], [460, 2340, 290], [560, 2480, 300], [600, 2560, 302]], mountain: 1, fog: 0.03, seed: 7, hill: 1 },
  descent: { pts: [[600, 2560, 302], [560, 2480, 300], [460, 2340, 290], [450, 2140, 275], [540, 1960, 255], [520, 1760, 235], [380, 1640, 210], [300, 1600, 195]], mountain: 1, fog: 0.032, seed: 11, hill: -1 },
};

Levels.road = function (o = {}) {
  const def = ROADS[o.road || 'route9'];
  const L = new Level('road');
  G.buildLevel = L;
  const R = L.root;
  L.defaultSurface = 'asphalt';
  L.reverb = [1.6, 2.5, 0.08];
  L.fog = new THREE.FogExp2(0x04060a, o.fog || def.fog);
  L.background = new THREE.Color(0x020308);

  // ---- spline sampling (1m steps) ----
  const curve = new THREE.CatmullRomCurve3(def.pts.map(p => new THREE.Vector3(p[0], p[2] || 0, p[1])), false, 'centripetal');
  const len = curve.getLength();
  const N = Math.floor(len);
  const pts = curve.getSpacedPoints(N);
  const T = [], Rt = [], K = [], Y = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= N; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
    const t = b.clone().sub(a).normalize(); T.push(t);
    const h = new THREE.Vector3(t.x, 0, t.z).normalize();
    Rt.push(new THREE.Vector3().crossVectors(h, up).normalize());
    Y.push(Math.atan2(t.x, t.z));
  }
  for (let i = 0; i <= N; i++) { const a = Y[Math.max(0, i - 2)], b = Y[Math.min(N, i + 2)]; K.push(U.angDiff(a, b) / (Math.min(N, i + 2) - Math.max(0, i - 2))); }
  const W = 3.5;
  const road = {
    length: N, pts, T, Rt, K,
    sample(s) {
      s = U.clamp(s, 0, N - 0.001); const i = Math.floor(s), f = s - i, j = Math.min(N, i + 1);
      return { p: pts[i].clone().lerp(pts[j], f), t: T[i].clone().lerp(T[j], f).normalize(), r: Rt[i].clone().lerp(Rt[j], f).normalize(), k: K[i] + (K[j] - K[i]) * f, w: W };
    },
    world(s, d, y = 0) { const m = this.sample(s); return m.p.addScaledVector(m.r, d).add(new THREE.Vector3(0, y, 0)); },
  };
  L.road = road;
  const M = def.mountain, hill = def.hill || 1;
  // terrain height relative to road at lateral offset d (positive = right)
  const terr = (i, d) => {
    const ad = Math.abs(d); if (ad <= 5) return 0;
    const side = Math.sign(d) === hill ? 1 : -1;
    const nz = U.fbm(i * 0.02, ad * 0.05, def.seed, 3);
    if (!M) return (ad - 5) * 0.04 + (nz - 0.5) * 2 * Math.min(1, (ad - 5) / 20);
    return side > 0 ? (ad - 5) * (0.45 + nz * 0.5) : -(ad - 5) * (0.3 + nz * 0.35);
  };
  road.terr = terr;

  // ---- ribbons ----
  const ribbon = (offs, mat, uFn, vScale, yFn) => {
    const cols = offs.length;
    const pos = new Float32Array((N + 1) * cols * 3), uv = new Float32Array((N + 1) * cols * 2), idx = [];
    for (let i = 0; i <= N; i++) for (let c = 0; c < cols; c++) {
      const p = pts[i].clone().addScaledVector(Rt[i], offs[c]); p.y += yFn ? yFn(i, offs[c]) : 0;
      const k = i * cols + c; pos.set([p.x, p.y, p.z], k * 3); uv.set([uFn(c, offs[c]), i / vScale], k * 2);
    }
    for (let i = 0; i < N; i++) for (let c = 0; c < cols - 1; c++) { const a = i * cols + c, b = a + 1, d = a + cols, e = d + 1; idx.push(a, d, b, b, d, e); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; R.add(m); return m;
  };
  const roadMat = new THREE.MeshStandardMaterial({ map: TEX.get('road'), side: THREE.DoubleSide });
  ribbon([-W, W], roadMat, c => c, 8, null);
  const grav = B.mat('gravel', { side: THREE.DoubleSide });
  ribbon([-6, -W], grav, (c, d) => d / 2, 2, (i, d) => d < -5 ? terr(i, d) : 0);
  ribbon([W, 6], grav, (c, d) => d / 2, 2, (i, d) => d > 5 ? terr(i, d) : 0);
  const ground = B.mat(M ? 'forestFloor' : 'grass', { side: THREE.DoubleSide });
  const offs = [6, 9, 14, 22, 34, 50, 75, 110];
  ribbon(offs.map(x => -x).reverse(), ground, (c, d) => d / 6, 6, terr);
  ribbon(offs, ground, (c, d) => d / 6, 6, terr);

  // ---- trees ----
  const r = U.seeded(def.seed + 100);
  const tp = [];
  for (let i = 4; i < N - 4; i += 2.2) {
    for (const side of [-1, 1]) {
      if (r() < (M ? 0.85 : 0.45)) {
        const d = side * (8 + Math.pow(r(), 1.5) * 90);
        const si = Math.floor(i);
        const p = pts[si].clone().addScaledVector(Rt[si], d);
        // don't place trees on top of a different stretch of road
        let ok = true; for (let j = 0; j <= N; j += 6) { if (Math.abs(j - si) < 30) continue; if (U.dist2(p.x, p.z, pts[j].x, pts[j].z) < 9) { ok = false; break; } }
        if (ok) tp.push([p.x, p.z, 10 + r() * 12, pts[si].y + terr(si, d), Math.abs(d) < 15]);
      }
    }
  }
  const nearSet = new Set(tp.filter(t => t[4]).map(t => t[0] + ',' + t[1]));
  P.forest(L, tp, { seed: def.seed, collide: false, near: (x, z) => nearSet.has(x + ',' + z) });
  // ---- guardrails (downhill side on mountain) ----
  if (M) {
    const posts = [], rails = [];
    for (let i = 10; i < N - 10; i += 3) {
      if (Math.abs(K[i]) < 0.004 && (i % 90) > 40) continue;
      const side = -hill;
      posts.push([pts[i].clone().addScaledVector(Rt[i], side * 5.0), Y[i]]);
    }
    const pg = new THREE.BoxGeometry(0.12, 0.8, 0.12); pg.translate(0, 0.4, 0);
    const pm = new THREE.InstancedMesh(pg, B.col(0x7a6a5a), posts.length);
    const rg = new THREE.BoxGeometry(0.06, 0.3, 3.05); rg.translate(0, 0.6, 0);
    const rm = new THREE.InstancedMesh(rg, B.mat('metal', { color: 0xb0b4b8 }), posts.length);
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
    posts.forEach(([p, y], k) => { q.setFromAxisAngle(up, y); mm.compose(p, q, sc); pm.setMatrixAt(k, mm); mm.compose(p.clone().add(new THREE.Vector3(Math.sin(y) * 1.5, 0, Math.cos(y) * 1.5)), q, sc); rm.setMatrixAt(k, mm); });
    R.add(pm, rm);
  }
  // ---- signs ----
  const signAt = (s, text, side = 1, o2 = {}) => {
    const smp = road.sample(s); const p = smp.p.addScaledVector(smp.r, side * (o2.off || 5.6));
    const g = B.group(R, p.x, p.y, p.z, Math.atan2(smp.t.x, smp.t.z) + Math.PI);
    B.box(g, 0, 0, 0, 0.08, o2.h || 2.2, 0.08, B.col(0x777777));
    B.signMesh(g, text, 0, (o2.h || 2.2) + (o2.ph || 0.5) / 2 - 0.1, 0.05, o2.pw || 1.2, o2.ph || 0.6, { tex: Object.assign({ bg: '#2a6a3a', fg: '#fff', border: '#fff', bw: 10 }, o2.tex || {}), emissive: 0x111111 });
    return g;
  };
  L.signAt = signAt;
  // mile markers
  for (let s = 150; s < N - 50; s += 400) { const smp = road.sample(s); const p = smp.p.addScaledVector(smp.r, 5.3); const g = B.group(R, p.x, p.y, p.z, Math.atan2(smp.t.x, smp.t.z) + Math.PI); B.box(g, 0, 0, 0, 0.12, 1.2, 0.03, B.col(0x2a6a3a)); B.signMesh(g, String(Math.floor(s / 400) + (o.road === 'mountain' ? 3 : 11)), 0, 1.0, 0.02, 0.12, 0.2, { tex: { bg: '#2a6a3a', fg: '#fff', w: 64, h: 96 } }); }

  // ---- landmarks per road ----
  if (o.road === 'route9' || !o.road) {
    signAt(30, 'GAS-N-GO\n1 MI →', 1, { tex: { bg: '#b8242a' } });
    signAt(300, 'SPEED\nLIMIT\n45', 1, { pw: 0.6, ph: 0.8, tex: { bg: '#f2f2f2', fg: '#111', border: '#111' } });
    // Pine Hollow Diner (closed)
    const smp = road.sample(420), dp = smp.p.addScaledVector(smp.r, 22);
    const dn = B.group(R, dp.x, dp.y, dp.z, Math.atan2(smp.t.x, smp.t.z) - Math.PI / 2);
    B.box(dn, 0, 0, 0, 14, 3.4, 8, B.mat('siding', { texArgs: ['#c8c0a8'] }));
    B.box(dn, 0, 3.4, 0, 14.5, 0.4, 8.5, B.col(0x5a2a2a));
    for (let k = -2; k <= 2; k++) B.box(dn, k * 2.6, 1.0, 4.01, 1.8, 1.4, 0.02, B.col(0x05070a));
    B.signMesh(dn, 'PINE HOLLOW DINER', 0, 4.3, 4.3, 5, 0.8, { tex: { bg: '#e8e0c0', fg: '#5a2a2a' } });
    B.signMesh(dn, 'CLOSED', 2.6, 1.6, 4.03, 0.8, 0.3, { glow: true, glowColor: 0xff4433, tex: { bg: '#200', fg: '#f53', grime: false } });
    const ps = smp.p.addScaledVector(smp.r, 9);
    B.bulb(L, ps.x, 5, ps.z, { color: 0xffb060, intensity: 25, dist: 18, spot: true, angle: 1.1 });
    B.box(R, ps.x, ps.y, ps.z, 0.15, 5, 0.15, B.col(0x555555));
    // farmhouse with one lit window
    const s2 = road.sample(640), fp = s2.p.addScaledVector(s2.r, -45);
    const fh = B.group(R, fp.x, fp.y + 0.9, fp.z, Math.atan2(s2.t.x, s2.t.z) + Math.PI / 2);
    B.box(fh, 0, 0, 0, 9, 5, 7, B.mat('siding', { texArgs: ['#d8d0b8'] }));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(6.5, 3, 4), B.col(0x2a2a2a)); roof.position.y = 6.5; roof.rotation.y = Math.PI / 4; roof.scale.z = 0.8; fh.add(roof);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.2), new THREE.MeshBasicMaterial({ color: 0xffc070 })); win.position.set(-2, 2.8, 3.51); fh.add(win);
    // mailboxes
    for (const s3 of [600, 700, 820]) { const m = road.sample(s3), mp = m.p.addScaledVector(m.r, s3 === 700 ? 5 : -5); const g = B.group(R, mp.x, mp.y, mp.z, Math.atan2(m.t.x, m.t.z)); B.box(g, 0, 0, 0, 0.08, 1.1, 0.08, B.col(0x5a4a3a)); B.box(g, 0, 1.1, 0, 0.22, 0.24, 0.45, B.col(0x333333)); }
  }
  if (o.road === 'mountain') {
    signAt(60, 'KESSLER RIDGE\nCOMM. SITE  6', 1, { pw: 1.8, ph: 0.8 });
    signAt(500, '⤴  STEEP GRADE\nNEXT 4 MILES', 1, { pw: 1.6, ph: 0.8, tex: { bg: '#e8c020', fg: '#111', border: '#111' } });
    signAt(1150, 'SCENIC\nTURNOUT', -1, { pw: 1.2, ph: 0.7, tex: { bg: '#5a3a1a' } });
    signAt(1600, 'NO WINTER\nMAINTENANCE', 1, { pw: 1.4, ph: 0.7, tex: { bg: '#f2f2f2', fg: '#111', border: '#111' } });
    signAt(2380, 'PRIVATE ROAD\nKTLR / HOLLIS CO.\nAUTHORIZED ONLY', 1, { pw: 1.6, ph: 0.9, tex: { bg: '#f2f2f2', fg: '#a11', border: '#a11' } });
    // the scenic turnout: a gravel pad on the downhill side
    const ts = road.sample(1180), tpp = ts.p.addScaledVector(ts.r, -9);
    B.floor(R, tpp.x - 6, tpp.z - 6, tpp.x + 6, tpp.z + 6, tpp.y + 0.03, B.mat('gravel'), 2);
  }
  // ---- sky, moon ----
  L.skyRig = P.sky(L, { moon: 0.12, hemi: 0.18 });
  P.clouds(L, { seed: def.seed, opacity: 0.2 });
  P.mist(L, { size: 150, opacity: M ? 0.14 : 0.1, heights: [0.4, 1.3, 2.6], follow: true });
  // grass along the shoulders
  const gr = [], rg = U.seeded(def.seed + 5);
  for (let i = 3; i < N - 3; i += 1.3) for (const sd of [-1, 1]) { if (rg() < 0.55) { const d = sd * (5.6 + rg() * 5); const si = Math.floor(i); const pp = pts[si].clone().addScaledVector(Rt[si], d); gr.push([pp.x, pp.z, pts[si].y + terr(si, d)]); } }
  P.grass(L, gr, { seed: def.seed, color: M ? 0x8a8a70 : 0x9a9a7a });
  L.loop('wind', { vol: 0.25 });
  L.spawns.start = [0, 0, 0];

  // ---- traffic helper: a car that drives along the road (headlights) ----
  L.traffic = [];
  L.spawnTraffic = (o2) => {
    const g = P.car(R, 0, 0, 0, { color: o2.color || 0x2a2a30, collide: false, len: o2.len || 4.6 });
    g.userData.setLights(true, o2.beams !== false);
    const t = Object.assign({ g, s: o2.s, d: o2.d == null ? -1.8 : o2.d, v: o2.v || 18, dir: o2.dir || -1, alive: true }, o2);
    L.traffic.push(t);
    return t;
  };
  L.onUpdate(dt => {
    for (const t of L.traffic) {
      if (!t.alive) continue;
      if (t.follow) { // keep a set distance behind the player's car
        const want = Car.s - t.gap; t.s = U.damp(t.s, want, 0.8, dt); t.v = Car.v;
      } else t.s += t.dir * t.v * dt;
      if (t.s < 1 || t.s > N - 1) { t.alive = false; t.g.visible = false; continue; }
      const m = road.sample(t.s); const p = m.p.addScaledVector(m.r, t.d);
      t.g.position.copy(p); t.g.rotation.set(0, Math.atan2(m.t.x, m.t.z) + (t.dir < 0 ? Math.PI : 0), 0);
      if (t.update) t.update(t, dt);
    }
  });
  G.buildLevel = null;
  return L;
};

// a deer made of boxes
function makeDeer(parent) {
  const g = new THREE.Group(); const fur = B.col(0x6a4a30), dark = B.col(0x2a1a10);
  B.box(g, 0, 0.75, 0, 0.35, 0.45, 1.1, fur);
  const neck = B.box(g, 0, 1.05, 0.5, 0.16, 0.5, 0.18, fur); neck.rotation.x = -0.5;
  B.box(g, 0, 1.4, 0.68, 0.16, 0.18, 0.32, fur);
  for (const [x, z] of [[-0.12, 0.42], [0.12, 0.42], [-0.12, -0.42], [0.12, -0.42]]) B.box(g, x, 0, z, 0.06, 0.78, 0.06, dark);
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.02), new THREE.MeshBasicMaterial({ color: 0xccffcc })); eyes.position.set(0, 1.47, 0.82); g.add(eyes);
  parent.add(g);
  return g;
}
