/* ============================================================
 * Character construction system.
 * Soldiers assembled from genuinely modeled parts: lathe torso,
 * shaped head with jaw/nose/brow/ears, plate carrier with pouches,
 * segmented limbs, hands with individual fingers, boots with
 * soles/toe caps/laces. Procedural bone hierarchy + pose engine.
 * ============================================================ */
RT.character = (() => {
  const C = {};
  const G = RT.G;

  /* per-face camo blotch painter */
  function camo(geo, cols) {
    const arr = geo.attributes.color.array;
    const c = new THREE.Color();
    const pos = geo.attributes.position.array;
    for (let f = 0; f < arr.length / 9; f++) {
      // blotches follow position so patches are contiguous-ish
      const px = pos[f * 9], py = pos[f * 9 + 1], pz = pos[f * 9 + 2];
      const n = RT.noise(px * 9 + py * 7, pz * 9 - py * 5) + RT.noise(px * 21, pz * 21) * 0.5;
      const idx = Math.abs(Math.floor(n * 6)) % cols.length;
      c.set(cols[idx]).convertSRGBToLinear();
      const vr = 0.94 + ((f * 137) % 13) / 100;
      for (let k = 0; k < 3; k++) {
        arr[f * 9 + k * 3] = c.r * vr; arr[f * 9 + k * 3 + 1] = c.g * vr; arr[f * 9 + k * 3 + 2] = c.b * vr;
      }
    }
    return geo;
  }
  C.camo = camo;

  const SKINS = [0xb98e6d, 0x9c6b45, 0x7d4f32, 0xd0a37f, 0x63402b];
  const UNIFORMS = {
    ally: [
      { jk: [0x585c3c, 0x4b4f34, 0x646845], pt: [0x4c4f36, 0x444730], gear: 0x413e2d, helmet: 0x4b4f34 },
      { jk: [0x8a7a52, 0x786a48, 0x93825c], pt: [0x786a48, 0x6b5e40], gear: 0x5d5239, helmet: 0x786a48 },
      { jk: [0x47522f, 0x5a5e40, 0x3c3a28, 0x66654a], pt: [0x41492c, 0x4c4f36], gear: 0x383623, helmet: 0x41492c },
    ],
    enemy: [
      { jk: [0x3e4139, 0x464a40, 0x373a34], pt: [0x383b33, 0x31342c], gear: 0x2a2c25, helmet: 0x33362f },
      { jk: [0x44463c, 0x4d4438, 0x3b3f36], pt: [0x3c3f35, 0x35342b], gear: 0x2d2f26, helmet: 0x393c32 },
    ],
  };

  /* ---------- hand with individual fingers ----------
   * grip: 0 = relaxed open-ish, 1 = curled grip
   * Returns geos in wrist space: palm extends -y, palm faces -z when rx=0 */
  function buildHand(skin, grip, side) {
    const s = side; // +1 right, -1 left
    const geos = [];
    geos.push(G.cbox(0.062, 0.075, 0.028, 0.008, skin, { y: -0.037 })); // palm
    const fLen = [0.062, 0.072, 0.068, 0.052];
    const fx = [-0.0225, -0.0075, 0.0075, 0.0225];
    for (let i = 0; i < 4; i++) {
      const nSeg = 3, segL = fLen[i] / nSeg;
      let baseY = -0.075, baseZ = 0;
      let ang = grip * (1.15 + i * 0.05);
      let dirY = -Math.cos(ang), dirZ = -Math.sin(ang) * 1; // curl toward palm (-z)
      let px = fx[i] * (s > 0 ? 1 : 1);
      for (let k = 0; k < nSeg; k++) {
        const cy = baseY + dirY * segL / 2, cz = baseZ + dirZ * segL / 2;
        geos.push(G.box(0.0135, segL * 1.05, 0.014, skin, { x: px, y: cy, z: cz, rx: -ang }));
        baseY += dirY * segL; baseZ += dirZ * segL;
        ang += grip * 0.55;
        dirY = -Math.cos(ang); dirZ = -Math.sin(ang);
      }
    }
    // opposed thumb: from palm side, angled across
    const tx = s * 0.036;
    const tAng = 0.5 + grip * 0.6;
    geos.push(G.box(0.016, 0.042, 0.017, skin, { x: tx, y: -0.028, z: -0.012, rz: s * 0.7, rx: -tAng }));
    geos.push(G.box(0.0145, 0.034, 0.015, skin, { x: tx + s * 0.012, y: -0.052, z: -0.033, rz: s * 0.35, rx: -tAng - grip * 0.7 }));
    return geos;
  }
  C.buildHand = buildHand;

  /* ---------- head ---------- */
  function buildHead(skin, opts) {
    const geos = [];
    // cranium: sphere with jaw taper — scale lower verts inward
    const cr = new THREE.SphereGeometry(0.093, 24, 18);
    { const p = cr.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i);
        if (y < -0.01) { // taper toward jaw
          const t = clamp(-y / 0.093, 0, 1);
          const sc = 1 - t * 0.34;
          p.setX(i, p.getX(i) * sc);
          const z = p.getZ(i);
          p.setZ(i, z * (1 - t * 0.18) + t * 0.014); // jaw pulled slightly forward
          p.setY(i, y * 1.12);
        } else p.setY(i, y * 1.02);
      } cr.computeVertexNormals(); }
    geos.push(xformLocal(paintGeo2(cr, skin), { y: 0.02 }));
    geos.push(G.box(0.02, 0.036, 0.024, skin, { y: -0.012, z: 0.085, rx: 0.22 }));           // nose
    geos.push(G.box(0.062, 0.013, 0.02, adj(skin, 0.82), { y: 0.028, z: 0.082 }));           // brow ridge
    geos.push(G.box(0.013, 0.03, 0.02, skin, { x: -0.088, y: -0.005, z: 0.008 }));           // ear L
    geos.push(G.box(0.013, 0.03, 0.02, skin, { x: 0.088, y: -0.005, z: 0.008 }));            // ear R
    geos.push(G.box(0.016, 0.008, 0.006, 0x1a1512, { x: -0.031, y: 0.013, z: 0.088 }));      // eye L
    geos.push(G.box(0.016, 0.008, 0.006, 0x1a1512, { x: 0.031, y: 0.013, z: 0.088 }));       // eye R
    geos.push(G.box(0.036, 0.006, 0.008, 0x7a4a3a, { y: -0.052, z: 0.082 }));                // mouth
    geos.push(G.cyl(0.035, 0.042, 0.07, 10, skin, { y: -0.105 }));                            // neck
    if (opts.beard) geos.push(G.box(0.072, 0.045, 0.03, 0x3a2e22, { y: -0.055, z: 0.062, vary: 0.2 }));
    return geos;
  }
  function paintGeo2(geo, hex) { // local re-use of util painter for raw geos
    const g = geo.index ? geo.toNonIndexed() : geo;
    const n = g.attributes.position.count;
    const cols = new Float32Array(n * 3);
    const c = new THREE.Color(hex).convertSRGBToLinear();
    for (let i = 0; i < n; i++) { cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return g;
  }
  const _lm = new THREE.Matrix4(), _le = new THREE.Euler(), _lq = new THREE.Quaternion(), _lv = new THREE.Vector3(), _ls = new THREE.Vector3(1, 1, 1);
  function xformLocal(geo, o) {
    _le.set(o.rx || 0, o.ry || 0, o.rz || 0); _lq.setFromEuler(_le);
    _lv.set(o.x || 0, o.y || 0, o.z || 0);
    _ls.set(o.sx || o.s || 1, o.sy || o.s || 1, o.sz || o.s || 1);
    _lm.compose(_lv, _lq, _ls); geo.applyMatrix4(_lm);
    return geo;
  }
  function adj(hex, mul) { const c = new THREE.Color(hex); c.multiplyScalar(mul); return c.getHex(); }

  /* ---------- headgear ---------- */
  function buildHeadgear(type, col, r) {
    const geos = [];
    if (type === 'helmet') {
      const prof = [];
      for (let i = 0; i <= 7; i++) {
        const a = (i / 7) * Math.PI * 0.55;
        prof.push([Math.sin(a) * 0.108, Math.cos(a) * 0.1]);
      }
      prof.reverse();
      geos.push(G.lathe(prof, 20, col, { y: 0.03, vary: 0.06 }));
      geos.push(G.torus(0.106, 0.008, 6, 16, adj(col, 0.85), { y: 0.026, rx: Math.PI / 2 }));  // rim
      geos.push(G.box(0.03, 0.015, 0.05, adj(col, 0.7), { y: 0.06, z: 0.1, rx: -0.4 }));       // NVG mount stub
      geos.push(G.box(0.008, 0.09, 0.012, 0x2e2a24, { x: -0.1, y: -0.03, rz: 0.14 }));         // chinstrap L
      geos.push(G.box(0.008, 0.09, 0.012, 0x2e2a24, { x: 0.1, y: -0.03, rz: -0.14 }));         // chinstrap R
      geos.push(G.box(0.05, 0.01, 0.014, 0x2e2a24, { y: -0.075, z: 0.03 }));                   // strap under jaw
      geos.push(G.box(0.09, 0.028, 0.012, adj(col, 0.9), { x: -0.1, y: 0.01, rz: 0.1, ry: 0.5, vary: 0.1 })); // side rail L
      geos.push(G.box(0.09, 0.028, 0.012, adj(col, 0.9), { x: 0.1, y: 0.01, rz: -0.1, ry: -0.5, vary: 0.1 }));
    } else if (type === 'boonie') {
      geos.push(G.lathe([[0.1, 0.0], [0.098, 0.045], [0.075, 0.075], [0.0, 0.085]], 14, col, { y: 0.025, vary: 0.1 }));
      geos.push(G.cyl(0.155, 0.165, 0.012, 16, adj(col, 0.92), { y: 0.028, vary: 0.1 }));      // wide brim
    } else if (type === 'beanie') {
      geos.push(G.lathe([[0.096, 0.0], [0.095, 0.05], [0.07, 0.085], [0.0, 0.098]], 14, col, { y: 0.02, vary: 0.15 }));
      geos.push(G.torus(0.094, 0.014, 6, 14, adj(col, 0.85), { y: 0.012, rx: Math.PI / 2 }));  // folded rim
    } else if (type === 'cap') {
      geos.push(G.lathe([[0.097, 0.0], [0.094, 0.04], [0.06, 0.075], [0.0, 0.082]], 12, col, { y: 0.025 }));
      geos.push(G.box(0.11, 0.012, 0.09, adj(col, 0.9), { y: 0.02, z: 0.12, rx: 0.12 }));      // bill
    }
    return geos;
  }

  /* ---------- boot ---------- */
  function buildBoot(col) {
    const geos = [];
    geos.push(G.cbox(0.085, 0.1, 0.1, 0.015, col, { y: -0.04, vary: 0.08 }));                  // ankle shaft
    geos.push(G.cbox(0.082, 0.055, 0.19, 0.012, col, { y: -0.085, z: 0.045, vary: 0.08 }));    // foot body
    geos.push(G.box(0.09, 0.028, 0.21, 0x232019, { y: -0.118, z: 0.048 }));                    // sole w/ visible edge
    geos.push(G.cbox(0.078, 0.045, 0.05, 0.014, adj(col, 0.8), { y: -0.082, z: 0.135 }));      // toe cap
    for (let i = 0; i < 3; i++)                                                                 // laces
      geos.push(G.box(0.055, 0.008, 0.01, 0x2c2620, { y: -0.045 + i * 0.022, z: 0.075 - i * 0.012, rx: 0.5 }));
    return geos;
  }

  /* ---------- NPC rifle (one merged mesh) ---------- */
  function buildNPCRifle() {
    const g = 0x3a3a3c, dark = 0x2b2b2d;
    const geos = [
      G.cbox(0.05, 0.07, 0.34, 0.008, g, {}),                                    // receiver
      G.cyl(0.013, 0.013, 0.3, 8, dark, { z: 0.32, rx: Math.PI / 2 }),           // barrel
      G.cbox(0.045, 0.055, 0.2, 0.008, adj(g, 1.15), { z: 0.25, y: -0.005 }),    // handguard
      G.box(0.012, 0.05, 0.02, dark, { z: 0.44, y: 0.045 }),                     // front sight
      G.box(0.03, 0.045, 0.03, dark, { y: 0.055, z: -0.05 }),                    // rear sight/optic
      G.cbox(0.032, 0.14, 0.05, 0.006, dark, { y: -0.1, z: 0.04, rx: 0.35 }),    // curved mag
      G.box(0.03, 0.09, 0.04, dark, { y: -0.075, z: -0.13, rx: -0.25 }),         // grip
      G.cbox(0.04, 0.06, 0.24, 0.008, g, { z: -0.28, y: 0.005 }),                // stock
      G.box(0.045, 0.09, 0.03, adj(g, 0.85), { z: -0.39, y: -0.005 }),           // buttpad
    ];
    return RT.meshOf(geos, RT.MAT.gun);
  }
  C.buildNPCRifle = buildNPCRifle;

  /* ============================================================
   * buildSoldier(opts)
   * opts: {seed, faction, paletteIdx, headgear, skin, rifle:true}
   * Returns rig {group, j:{joints}, anim, cfg, meshes}
   * Soldier faces +Z. Feet at y=0. Height ~1.78.
   * ============================================================ */
  C.build = function (opts) {
    opts = opts || {};
    const rnd = RNG(opts.seed != null ? opts.seed : (Math.random() * 1e9) | 0);
    const faction = opts.faction || 'ally';
    const pals = UNIFORMS[faction];
    const pal = pals[opts.paletteIdx != null ? opts.paletteIdx % pals.length : rnd.int(0, pals.length - 1)];
    const skin = opts.skin != null ? opts.skin : rnd.pick(SKINS);
    const headgear = opts.headgear || (faction === 'enemy' ? 'helmet' : rnd.pick(['helmet', 'helmet', 'helmet', 'boonie', 'beanie']));
    const gear = pal.gear;
    const MS = RT.MAT.std;

    const group = new THREE.Group();
    const j = {};
    const mk = (name, parent, x, y, z) => {
      const o = new THREE.Object3D();
      o.position.set(x, y, z); parent.add(o); j[name] = o; return o;
    };

    const HIP_Y = 0.94;
    const hips = mk('hips', group, 0, HIP_Y, 0);
    const spine = mk('spine', hips, 0, 0.1, 0);
    const chest = mk('chest', spine, 0, 0.16, 0);
    const neck = mk('neck', chest, 0, 0.245, 0.01);
    const head = mk('head', neck, 0, 0.1, 0);
    const shL = mk('shL', chest, -0.208, 0.19, 0);
    const shR = mk('shR', chest, 0.208, 0.19, 0);
    const elL = mk('elL', shL, 0, -0.285, 0);
    const elR = mk('elR', shR, 0, -0.285, 0);
    const wrL = mk('wrL', elL, 0, -0.26, 0);
    const wrR = mk('wrR', elR, 0, -0.26, 0);
    const hipL = mk('hipL', hips, -0.098, -0.02, 0);
    const hipR = mk('hipR', hips, 0.098, -0.02, 0);
    const kneeL = mk('kneeL', hipL, 0, -0.43, 0);
    const kneeR = mk('kneeR', hipR, 0, -0.43, 0);
    const ankL = mk('ankL', kneeL, 0, -0.4, 0);
    const ankR = mk('ankR', kneeR, 0, -0.4, 0);

    const meshes = [];
    const addM = (parent, geos, mat) => {
      const m = RT.meshOf(geos, mat || MS);
      parent.add(m); meshes.push(m); return m;
    };

    /* pelvis + belt + holster + rear pouch */
    {
      const geos = [];
      geos.push(camo(G.lathe([[0.128, -0.12], [0.15, -0.03], [0.152, 0.06], [0.148, 0.14], [0.06, 0.17]], 12, pal.pt[0], { sz: 0.8 }), pal.pt));
      geos.push(G.torus(0.143, 0.02, 6, 14, 0x3a3428, { y: 0.075, rx: Math.PI / 2, sz: 0.84 })); // belt
      geos.push(G.box(0.045, 0.032, 0.02, 0x8a8a80, { z: 0.124, y: 0.075 }));                  // buckle
      geos.push(G.cbox(0.05, 0.11, 0.045, 0.01, gear, { x: 0.155, y: -0.03, z: 0.03, rz: -0.08 })); // holster
      geos.push(G.cbox(0.09, 0.07, 0.05, 0.01, gear, { z: -0.135, y: 0.0, vary: 0.1 }));       // rear pouch
      addM(hips, geos);
    }
    /* torso: tapered lathe + plate carrier + pouches + radio */
    {
      const geos = [];
      const prof = [[0.14, -0.2], [0.148, -0.12], [0.152, -0.04], [0.16, 0.06], [0.168, 0.16], [0.155, 0.235], [0.1, 0.268], [0.05, 0.276]];
      geos.push(camo(G.lathe(prof, 18, pal.jk[0], { sy: 1, sx: 1.14, sz: 0.72 }), pal.jk));
      // shoulder caps
      geos.push(camo(G.sph(0.072, 10, 8, pal.jk[0], { x: -0.2, y: 0.195, sy: 0.85, sz: 0.85 }), pal.jk));
      geos.push(camo(G.sph(0.072, 10, 8, pal.jk[0], { x: 0.2, y: 0.195, sy: 0.85, sz: 0.85 }), pal.jk));
      // plate carrier front + back
      geos.push(G.cbox(0.27, 0.3, 0.05, 0.02, gear, { z: 0.115, y: 0.1, vary: 0.07 }));
      geos.push(G.cbox(0.27, 0.3, 0.045, 0.02, adj(gear, 0.94), { z: -0.11, y: 0.1, vary: 0.07 }));
      // cummerbund sides
      geos.push(G.box(0.05, 0.2, 0.2, adj(gear, 0.88), { x: -0.168, y: 0.06, vary: 0.08 }));
      geos.push(G.box(0.05, 0.2, 0.2, adj(gear, 0.88), { x: 0.168, y: 0.06, vary: 0.08 }));
      // shoulder straps
      geos.push(G.box(0.06, 0.03, 0.2, adj(gear, 0.8), { x: -0.1, y: 0.265, rx: 0.0, vary: 0.06 }));
      geos.push(G.box(0.06, 0.03, 0.2, adj(gear, 0.8), { x: 0.1, y: 0.265, vary: 0.06 }));
      // 3 mag pouches with flaps
      for (let i = -1; i <= 1; i++) {
        geos.push(G.cbox(0.062, 0.095, 0.04, 0.008, adj(gear, 1.12), { x: i * 0.075, y: -0.01, z: 0.155, vary: 0.09 }));
        geos.push(G.box(0.058, 0.02, 0.048, adj(gear, 0.75), { x: i * 0.075, y: 0.045, z: 0.155 }));
      }
      // admin pouch + radio on chest strap
      geos.push(G.cbox(0.09, 0.06, 0.035, 0.008, adj(gear, 0.9), { x: -0.02, y: 0.17, z: 0.15, vary: 0.06 }));
      geos.push(G.cbox(0.035, 0.085, 0.035, 0.006, 0x2c2e2a, { x: 0.115, y: 0.19, z: 0.135 }));
      geos.push(G.cyl(0.005, 0.005, 0.1, 5, 0x1e201c, { x: 0.13, y: 0.27, z: 0.13 }));         // antenna
      addM(chest, geos);
    }
    /* head + headgear */
    {
      const geos = buildHead(skin, { beard: faction === 'ally' && rnd.chance(0.25) });
      geos.push(...buildHeadgear(headgear, pal.helmet, rnd));
      addM(head, geos, RT.MAT.skin);
    }
    /* arms: upper (sleeve), forearm w/ rolled cuff + hand */
    for (const side of [-1, 1]) {
      const sh = side < 0 ? shL : shR, wp = side < 0 ? elL : elR;
      const upGeos = [camo(G.cyl(0.058, 0.05, 0.3, 12, pal.jk[0], { y: -0.145 }), pal.jk)];
      upGeos.push(G.box(0.075, 0.075, 0.02, adj(gear, 1.05), { x: side * 0.01, y: -0.1, z: side * 0.045, ry: side * 1.2, vary: 0.1 })); // patch/pouch
      addM(sh, upGeos);
      const foGeos = [];
      foGeos.push(camo(G.cyl(0.052, 0.055, 0.06, 10, pal.jk[0], { y: -0.03 }), pal.jk));       // rolled cuff
      foGeos.push(G.cyl(0.045, 0.035, 0.2, 12, skin, { y: -0.16 }));                            // bare forearm
      foGeos.push(G.box(0.055, 0.025, 0.06, 0x2a2c28, { y: -0.245, z: 0.01 }));                 // watch/wrist wrap
      const hand = buildHand(skin, opts.grip != null ? opts.grip : 0.55, side);
      for (const h of hand) xformLocal(h, { y: -0.27 });
      foGeos.push(...hand);
      addM(wp, foGeos, RT.MAT.skin);
    }
    /* legs: thigh, knee pad, calf, boot */
    for (const side of [-1, 1]) {
      const hp = side < 0 ? hipL : hipR, kp = side < 0 ? kneeL : kneeR;
      const thGeos = [camo(G.cyl(0.082, 0.068, 0.44, 12, pal.pt[0], { y: -0.215 }), pal.pt)];
      thGeos.push(camo(G.cbox(0.1, 0.14, 0.045, 0.012, pal.pt[0], { x: side * 0.045, y: -0.26, z: 0.055, vary: 0.12 }), pal.pt)); // cargo pocket
      addM(hp, thGeos);
      const caGeos = [];
      caGeos.push(G.cbox(0.075, 0.1, 0.05, 0.018, adj(gear, 0.8), { y: -0.045, z: 0.055, vary: 0.06 })); // knee pad
      caGeos.push(camo(G.cyl(0.062, 0.05, 0.34, 12, pal.pt[0], { y: -0.2 }), pal.pt));
      caGeos.push(...buildBoot(0x3a332a).map(g => xformLocal(g, { y: -0.31 })));
      addM(kp, caGeos);
    }

    let rifle = null;
    if (opts.rifle !== false) {
      rifle = buildNPCRifle();
      rifle.position.set(0.06, 0.02, 0.28);
      chest.add(rifle);
      meshes.push(rifle);
    }

    const rig = {
      group, j, meshes, rifle, faction,
      cfg: { pal, skin, headgear, seed: opts.seed },
      anim: { mode: 'idle', phase: rnd() * 10, speed: 0, aimPitch: 0, lean: 0,
              flinch: 0, deathT: -1, deathDir: 1, deathSpin: rnd.spread(0.5), crouch: 0, blend: 8 },
    };
    C.pose(rig, 0.016); // settle initial pose
    return rig;
  };

  /* ============================================================
   * Pose engine — writes joint rotations each frame from anim state.
   * ============================================================ */
  const dampR = (o, x, y, z, k, dt) => {
    o.rotation.x = damp(o.rotation.x, x, k, dt);
    o.rotation.y = damp(o.rotation.y, y, k, dt);
    o.rotation.z = damp(o.rotation.z, z, k, dt);
  };

  C.pose = function (rig, dt) {
    const a = rig.anim, j = rig.j;
    const k = a.blend;
    if (a.mode === 'dead' || a.deathT >= 0) return poseDeath(rig, dt);

    a.flinch = Math.max(0, a.flinch - dt * 4);
    const fl = a.flinch;
    const t = RT.engine.time + a.phase * 7;
    const crouch = a.crouch;
    const hipDrop = crouch * 0.34;

    if (a.mode === 'idle' || a.mode === 'guard') {
      const br = Math.sin(t * 1.4) * 0.02; // breathing
      j.hips.position.y = 0.94 - hipDrop;
      dampR(j.hips, 0, 0, 0, k, dt);
      dampR(j.spine, 0.02 + crouch * 0.3, 0, 0, k, dt);
      dampR(j.chest, br + fl * 0.5 + crouch * 0.25, a.lean * 0.3, 0, k, dt);
      dampR(j.neck, -br * 0.5 + a.aimPitch * 0.3, 0, 0, k, dt);
      dampR(j.head, a.aimPitch * 0.3, a.lookYaw || 0, 0, k, dt);
      // rifle held low-ready across chest
      dampR(j.shL, -0.85, 0.35, 0.42, k, dt);
      dampR(j.elL, -1.0, 0.5, 0, k, dt);
      dampR(j.shR, -0.68, -0.15, -0.22, k, dt);
      dampR(j.elR, -0.72, -0.35, 0, k, dt);
      dampR(j.hipL, -0.05 + crouch * -0.9, 0, 0.03, k, dt);
      dampR(j.kneeL, 0.08 + crouch * 1.5, 0, 0, k, dt);
      dampR(j.ankL, -0.03 - crouch * 0.55, 0, 0, k, dt);
      dampR(j.hipR, 0.02 - crouch * 1.15, 0, -0.03, k, dt);
      dampR(j.kneeR, 0.05 + crouch * 1.7, 0, 0, k, dt);
      dampR(j.ankR, -0.02 - crouch * 0.5, 0, 0, k, dt);
      if (rig.rifle) { rig.rifle.position.set(0.09, 0.02, 0.2); rig.rifle.rotation.set(0.7 + fl, -0.35, 0.1); }
    } else if (a.mode === 'brace') {
      /* standing in the aircraft, one hand up gripping the overhead static line, subtle sway */
      const sway = Math.sin(t * 0.8 + a.phase * 3) * 0.05;
      const br = Math.sin(t * 1.5 + a.phase) * 0.02;
      j.hips.position.y = 0.94;
      dampR(j.hips, 0.02, sway * 0.4, sway, k, dt);
      dampR(j.spine, 0.05, 0, -sway * 0.6, k, dt);
      dampR(j.chest, 0.05 + br, sway * 0.3, 0, k, dt);
      dampR(j.neck, 0.04, sway, 0, k, dt);
      dampR(j.head, 0.03 + a.aimPitch * 0.2, (a.lookYaw || 0) + sway * 1.4, 0, k, dt);
      dampR(j.shR, -2.75, -0.15, 0.15, k, dt);    // right arm reaches up to the line
      dampR(j.elR, -0.4, 0.1, 0, k, dt);
      dampR(j.shL, -0.55, 0.25, 0.32, k, dt);     // left hand on the rifle
      dampR(j.elL, -1.05, 0.45, 0, k, dt);
      dampR(j.hipL, -0.06, 0, 0.06, k, dt);
      dampR(j.kneeL, 0.12, 0, 0, k, dt);
      dampR(j.ankL, -0.05, 0, 0, k, dt);
      dampR(j.hipR, 0.05, 0, -0.06, k, dt);
      dampR(j.kneeR, 0.09, 0, 0, k, dt);
      dampR(j.ankR, -0.03, 0, 0, k, dt);
      if (rig.rifle) { rig.rifle.position.set(0.08, -0.05, 0.16); rig.rifle.rotation.set(0.9, -0.4, 0.15); }
    } else if (a.mode === 'skydive') {
      /* freefall arch — belly-down (group tilted by controller), limbs spread star */
      const fl2 = Math.sin(t * 7 + a.phase * 4) * 0.05;
      j.hips.position.y = 0.94;
      dampR(j.hips, 0, 0, 0, k, dt);
      dampR(j.spine, -0.28, 0, 0, k, dt);
      dampR(j.chest, -0.22, 0, 0, k, dt);
      dampR(j.neck, -0.42, 0, 0, k, dt);
      dampR(j.head, -0.32, 0, 0, k, dt);
      dampR(j.shL, -1.95, 1.2, 0.62 + fl2, k, dt);
      dampR(j.elL, -0.55, 0.35, 0, k, dt);
      dampR(j.shR, -1.95, -1.2, -0.62 - fl2, k, dt);
      dampR(j.elR, -0.55, -0.35, 0, k, dt);
      dampR(j.hipL, -0.5, 0.42, 0.22, k, dt);
      dampR(j.kneeL, 0.72 + fl2, 0, 0, k, dt);
      dampR(j.ankL, 0, 0, 0, k, dt);
      dampR(j.hipR, -0.5, -0.42, -0.22, k, dt);
      dampR(j.kneeR, 0.72 - fl2, 0, 0, k, dt);
      dampR(j.ankR, 0, 0, 0, k, dt);
    } else if (a.mode === 'chute') {
      /* hanging under canopy, both hands up on the risers, legs dangling */
      const sway = Math.sin(t * 0.9 + a.phase) * 0.06;
      j.hips.position.y = 0.94;
      dampR(j.hips, 0.05, sway * 0.5, sway, k, dt);
      dampR(j.spine, 0.02, 0, -sway * 0.5, k, dt);
      dampR(j.chest, 0.02, 0, 0, k, dt);
      dampR(j.neck, -0.08, 0, 0, k, dt);
      dampR(j.head, -0.04, sway, 0, k, dt);
      dampR(j.shL, -2.85, 0.35, 0.22, k, dt);
      dampR(j.elL, -0.6, 0.25, 0, k, dt);
      dampR(j.shR, -2.85, -0.35, -0.22, k, dt);
      dampR(j.elR, -0.6, -0.25, 0, k, dt);
      dampR(j.hipL, -0.12, 0.1, 0.05, k, dt);
      dampR(j.kneeL, 0.28 + sway, 0, 0, k, dt);
      dampR(j.hipR, -0.08, -0.1, -0.05, k, dt);
      dampR(j.kneeR, 0.22 - sway, 0, 0, k, dt);
    } else if (a.mode === 'reload') {
      /* shouldered, support hand cycles down to the mag well and back (reads in 3rd person) */
      a.phase += dt * 3.2;
      const rp = Math.sin(a.phase) * 0.5 + 0.5;
      j.hips.position.y = 0.94 - hipDrop;
      dampR(j.spine, 0.04 + crouch * 0.3, 0, 0, k, dt);
      dampR(j.chest, 0.06 + fl * 0.5 - 0.12, -0.3, 0, k, dt);
      dampR(j.neck, 0.14, 0.12, 0, k, dt);
      dampR(j.head, 0.26, 0.1, 0, k, dt);
      dampR(j.shR, -1.0, -0.25, -0.12, k, dt);
      dampR(j.elR, -0.82, -0.4, 0, k, dt);
      dampR(j.shL, -0.7 - rp * 0.55, 0.5, 0.3, k, dt);
      dampR(j.elL, -1.3 - rp * 0.6, 0.6, 0, k, dt);
      dampR(j.hipL, -0.05 - crouch * 0.9, 0, 0.03, k, dt);
      dampR(j.kneeL, 0.1 + crouch * 1.5, 0, 0, k, dt);
      dampR(j.ankL, -0.03, 0, 0, k, dt);
      dampR(j.hipR, 0.02 - crouch * 1.15, 0, -0.03, k, dt);
      dampR(j.kneeR, 0.08 + crouch * 1.7, 0, 0, k, dt);
      dampR(j.ankR, -0.02, 0, 0, k, dt);
      if (rig.rifle) { rig.rifle.position.set(0.1, 0.03, 0.2); rig.rifle.rotation.set(0.2, -0.2, 0.15); }
    } else if (a.mode === 'slide') {
      /* low crouched slide, lead leg forward, trailing leg tucked */
      j.hips.position.y = 0.55;
      dampR(j.hips, -0.5, 0, 0, k, dt);
      dampR(j.spine, 0.22, 0, 0, k, dt);
      dampR(j.chest, 0.16, -0.2, 0, k, dt);
      dampR(j.neck, 0.1, 0, 0, k, dt);
      dampR(j.head, 0.05, 0, 0, k, dt);
      dampR(j.shL, -0.9, 0.4, 0.42, k, dt);
      dampR(j.elL, -1.2, 0.5, 0, k, dt);
      dampR(j.shR, -0.7, -0.2, -0.22, k, dt);
      dampR(j.elR, -1.0, -0.3, 0, k, dt);
      dampR(j.hipL, -1.4, 0.1, 0.1, k, dt);
      dampR(j.kneeL, 0.32, 0, 0, k, dt);
      dampR(j.ankL, -0.1, 0, 0, k, dt);
      dampR(j.hipR, -0.3, -0.1, -0.1, k, dt);
      dampR(j.kneeR, 1.7, 0, 0, k, dt);
      dampR(j.ankR, -0.2, 0, 0, k, dt);
      if (rig.rifle) { rig.rifle.position.set(0.09, 0.02, 0.2); rig.rifle.rotation.set(0.6, -0.3, 0.1); }
    } else if (a.mode === 'walk' || a.mode === 'run') {
      const run = a.mode === 'run';
      const sp = run ? 1 : 0.62;
      a.phase += dt * (run ? 9.5 : 6.4);
      const p = a.phase;
      const swing = run ? 0.78 : 0.5;
      j.hips.position.y = 0.94 - hipDrop - Math.abs(Math.sin(p)) * (run ? 0.05 : 0.028);
      dampR(j.hips, run ? 0.12 : 0.04, 0, Math.sin(p) * 0.05, k, dt);
      dampR(j.spine, (run ? 0.22 : 0.06) + crouch * 0.3, 0, 0, k, dt);
      dampR(j.chest, fl * 0.5 + (run ? 0.1 : 0.02) + crouch * 0.2, Math.sin(p) * (run ? 0.1 : 0.07), 0, k, dt);
      dampR(j.neck, -(run ? 0.18 : 0.04), 0, 0, k, dt);
      dampR(j.head, a.aimPitch * 0.2, a.lookYaw || 0, 0, k, dt);
      const legL = -Math.sin(p) * swing - crouch * 0.5, legR = Math.sin(p) * swing - crouch * 0.5;
      dampR(j.hipL, legL, 0, 0.02, 14, dt);
      dampR(j.hipR, legR, 0, -0.02, 14, dt);
      const kneeLv = Math.max(0.08, Math.sin(p - 0.9) * (run ? 1.25 : 0.75)) + crouch * 0.9;
      const kneeRv = Math.max(0.08, Math.sin(p + Math.PI - 0.9) * (run ? 1.25 : 0.75)) + crouch * 0.9;
      dampR(j.kneeL, kneeLv, 0, 0, 14, dt);
      dampR(j.kneeR, kneeRv, 0, 0, 14, dt);
      dampR(j.ankL, -Math.sin(p) * 0.3 - 0.1, 0, 0, 14, dt);
      dampR(j.ankR, Math.sin(p) * 0.3 - 0.1, 0, 0, 14, dt);
      if (run) { // rifle in both hands pumping slightly
        dampR(j.shL, -0.85 + Math.sin(p) * 0.06, 0.3, 0.4, k, dt);
        dampR(j.elL, -1.2, 0.45, 0, k, dt);
        dampR(j.shR, -0.5 - Math.sin(p) * 0.06, -0.1, -0.25, k, dt);
        dampR(j.elR, -1.1, -0.3, 0, k, dt);
        if (rig.rifle) { rig.rifle.position.set(0.06, -0.02, 0.26); rig.rifle.rotation.set(0.35, -0.2, 0); }
      } else { // patrol carry, arms counter-swing a bit
        dampR(j.shL, -0.8 + Math.sin(p) * 0.12 * sp, 0.3, 0.4, k, dt);
        dampR(j.elL, -1.15, 0.45, 0, k, dt);
        dampR(j.shR, -0.5 - Math.sin(p) * 0.12 * sp, -0.1, -0.25, k, dt);
        dampR(j.elR, -1.0, -0.3, 0, k, dt);
        if (rig.rifle) { rig.rifle.position.set(0.06, 0.0, 0.24); rig.rifle.rotation.set(0.5, -0.25, 0); }
      }
    } else if (a.mode === 'aim') {
      // shouldered rifle pointed forward, pitch follows aimPitch
      const pitch = a.aimPitch;
      j.hips.position.y = 0.94 - hipDrop;
      dampR(j.hips, 0, 0, 0, k, dt);
      dampR(j.spine, 0.04 + crouch * 0.3, 0, 0, k, dt);
      dampR(j.chest, 0.06 + pitch * 0.55 + fl * 0.6, -0.32, 0, k, dt);
      dampR(j.neck, pitch * 0.25, 0.18, 0, k, dt);
      dampR(j.head, pitch * 0.2, 0.14, 0, k, dt);
      dampR(j.shL, -1.28 + pitch * 0.2, 0.55, 0.35, k, dt);
      dampR(j.elL, -0.85, 0.75, 0, k, dt);
      dampR(j.shR, -1.12 + pitch * 0.25, -0.28, -0.12, k, dt);
      dampR(j.elR, -0.7, -0.5, 0, k, dt);
      dampR(j.hipL, -0.12 - crouch * 0.9, 0.12, 0.03, k, dt);
      dampR(j.kneeL, 0.15 + crouch * 1.5, 0, 0, k, dt);
      dampR(j.ankL, -0.06 - crouch * 0.5, 0, 0, k, dt);
      dampR(j.hipR, 0.1 - crouch * 1.15, -0.1, -0.03, k, dt);
      dampR(j.kneeR, 0.1 + crouch * 1.7, 0, 0, k, dt);
      dampR(j.ankR, -0.04 - crouch * 0.5, 0, 0, k, dt);
      if (rig.rifle) {
        rig.rifle.position.set(0.115, 0.115, 0.2);
        rig.rifle.rotation.set(-pitch * 0.92, -0.06, 0);
      }
    }
  };

  /* multi-stage death: stagger → buckle → collapse → settle */
  function poseDeath(rig, dt) {
    const a = rig.anim, j = rig.j;
    if (a.deathT < 0) a.deathT = 0;
    a.deathT += dt;
    const T = a.deathT, dir = a.deathDir; // 1 = backward, -1 = forward
    const s1 = smoothstep(0, 0.22, T);          // stagger hit
    const s2 = smoothstep(0.18, 0.62, T);       // knees buckle
    const s3 = smoothstep(0.5, 1.15, T);        // collapse to ground
    const k = 16;
    j.hips.position.y = 0.94 - s2 * 0.42 - s3 * (dir > 0 ? 0.36 : 0.3);
    const bodyRx = dir > 0 ? -(s1 * 0.25 + s3 * 1.28) : (s1 * 0.2 + s3 * 1.42);
    dampR(j.hips, bodyRx, a.deathSpin * s3, a.deathSpin * 0.4 * s3, k, dt);
    dampR(j.spine, dir > 0 ? -0.15 * s1 : 0.3 * s2, 0, 0, k, dt);
    dampR(j.chest, (dir > 0 ? -0.2 : 0.45) * s2, a.deathSpin * 0.6 * s2, 0, k, dt);
    dampR(j.neck, (dir > 0 ? -0.4 : 0.5) * s3, 0, 0.2 * s3, k, dt);
    dampR(j.head, (dir > 0 ? -0.3 : 0.4) * s3, 0.2 * s3, 0.15 * s3, k, dt);
    dampR(j.shL, -0.9 * s1 - 0.4 * s3, 0.3, 0.5 + 0.8 * s3, k, dt);
    dampR(j.elL, -0.6 - 0.3 * s2 + 0.5 * s3, 0.3, 0, k, dt);
    dampR(j.shR, -1.1 * s1 + 0.2 * s3, -0.2, -0.4 - 0.9 * s3, k, dt);
    dampR(j.elR, -0.8 + 0.5 * s3, -0.3, 0, k, dt);
    dampR(j.hipL, (-0.3 - 0.5 * Math.abs(a.deathSpin)) * s2 + (dir > 0 ? 0.35 : -0.5) * s3, 0.1 * s3, 0.1, k, dt);
    dampR(j.kneeL, 1.3 * s2 - (dir > 0 ? 0.9 : 0.1) * s3, 0, 0, k, dt);
    dampR(j.hipR, (-0.2 - 0.3 * Math.abs(a.deathSpin)) * s2 + (dir > 0 ? 0.3 : -0.4) * s3, -0.12 * s3, -0.1, k, dt);
    dampR(j.kneeR, 1.5 * s2 - (dir > 0 ? 1.1 : 0.2) * s3, 0, 0, k, dt);
    if (rig.rifle && !rig.rifleDropped && T > 0.15) {
      // drop the rifle: detach into world with simple toss
      rig.rifleDropped = true;
      const wp = new THREE.Vector3(); rig.rifle.getWorldPosition(wp);
      const wq = new THREE.Quaternion(); rig.rifle.getWorldQuaternion(wq);
      rig.rifle.parent.remove(rig.rifle);
      rig.rifle.position.copy(wp); rig.rifle.quaternion.copy(wq);
      RT.engine.world.add(rig.rifle);
      const groundY = RT.map && RT.map.heightAt ? RT.map.heightAt(wp.x, wp.z) : 0;
      const drop = { t: 0, vy: 0.5, spin: (Math.random() - 0.5) * 6 };
      const fn = (dt2) => {
        drop.t += dt2; drop.vy -= 9.8 * dt2;
        rig.rifle.position.y += drop.vy * dt2;
        rig.rifle.rotation.z += drop.spin * dt2;
        if (rig.rifle.position.y <= groundY + 0.05) {
          rig.rifle.position.y = groundY + 0.05;
          rig.rifle.rotation.set(Math.PI / 2 * 0.94, rig.rifle.rotation.y, rig.rifle.rotation.z);
          const idx = RT.engine._upd ? 0 : 0; void idx;
          drop.done = true;
        }
        return !drop.done;
      };
      (RT.transients = RT.transients || []).push(fn);
    }
    if (T > 1.6) a.mode = 'dead';
  }

  return C;
})();
