/* ============================================================
 * First-person rig + weapons.
 * Every weapon is a multi-part assembly (static body, magazine,
 * moving action, muzzle flash) built at real scale, muzzle
 * toward -Z (camera forward). Arms with finger-wrapped hands.
 * Gunfeel: ADS lerp+FOV, per-weapon recoil, flash, shells,
 * procedural reloads, switching, pump/bolt/slide cycling.
 * ============================================================ */
RT.weapons = (() => {
  const W = {};
  const G = RT.G;
  const GM = 0x3b3b3f, GM2 = 0x2c2c30, GM3 = 0x4a4a50, TAN = 0x8a7a5c, WOOD = 0x4e3620;

  function adjc(hex, mul) { const c = new THREE.Color(hex); c.multiplyScalar(mul); return c.getHex(); }

  /* picatinny rail teeth strip along z */
  function rail(geos, x, y, z0, z1, w, col) {
    const n = Math.max(2, Math.floor((z1 - z0) / 0.011));
    for (let i = 0; i < n; i++)
      geos.push(G.box(w, 0.007, 0.006, col || GM2, { x, y, z: z0 + i * 0.011 }));
    geos.push(G.box(w, 0.006, z1 - z0 + 0.01, col || GM2, { x, y: y - 0.006, z: (z0 + z1) / 2 }));
  }

  /* ---------- M4-style carbine (~9k tris) ---------- */
  function buildM4() {
    const st = [];  // static body
    // — lower receiver + magwell + trigger group —
    st.push(G.cbox(0.036, 0.052, 0.19, 0.006, GM, { y: -0.02, z: 0.02 }));
    st.push(G.cbox(0.04, 0.07, 0.062, 0.006, adjc(GM, 0.92), { y: -0.055, z: -0.055, rx: 0.1 })); // magwell
    st.push(G.box(0.008, 0.026, 0.05, GM2, { y: -0.062, z: 0.015, rx: 0.2 }));      // trigger guard base
    st.push(G.box(0.008, 0.005, 0.055, GM2, { y: -0.075, z: 0.012 }));
    st.push(G.box(0.006, 0.02, 0.008, adjc(GM3, 1.2), { y: -0.058, z: 0.008, rx: 0.25 })); // trigger
    // pistol grip with finger grooves
    st.push(G.cbox(0.032, 0.095, 0.042, 0.008, GM2, { y: -0.095, z: 0.075, rx: -0.32 }));
    for (let i = 0; i < 3; i++)
      st.push(G.box(0.035, 0.008, 0.03, adjc(GM2, 0.75), { y: -0.075 - i * 0.024, z: 0.062 + i * 0.009, rx: -0.32 }));
    // — upper receiver —
    st.push(G.cbox(0.038, 0.048, 0.2, 0.007, adjc(GM, 1.08), { y: 0.028, z: 0.0 }));
    rail(st, 0, 0.058, -0.1, 0.09, 0.03);                                            // top rail
    st.push(G.box(0.012, 0.024, 0.05, GM2, { x: 0.02, y: 0.02, z: -0.02 }));         // ejection port frame
    st.push(G.box(0.002, 0.02, 0.044, adjc(GM3, 1.25), { x: 0.0265, y: 0.02, z: -0.02 })); // dust cover
    st.push(G.cyl(0.009, 0.009, 0.014, 8, GM3, { x: 0.024, y: 0.03, z: 0.035, rz: Math.PI / 2 })); // fwd assist
    st.push(G.box(0.014, 0.01, 0.03, GM2, { y: 0.012, z: -0.098 }));                 // brass deflector
    // — barrel & gas system —
    st.push(G.cyl(0.011, 0.012, 0.34, 12, GM2, { y: 0.02, z: -0.36, rx: Math.PI / 2 }));
    st.push(G.cyl(0.014, 0.014, 0.03, 8, GM2, { y: 0.02, z: -0.42, rx: Math.PI / 2 })); // gas block
    st.push(G.box(0.012, 0.05, 0.012, GM2, { y: 0.052, z: -0.42 }));                 // front sight post
    st.push(G.box(0.004, 0.02, 0.006, GM3, { y: 0.075, z: -0.42 }));
    // flash hider with slots
    st.push(G.cyl(0.0155, 0.014, 0.06, 8, GM2, { y: 0.02, z: -0.55, rx: Math.PI / 2 }));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      st.push(G.box(0.006, 0.004, 0.035, 0x151517, { x: Math.cos(a) * 0.015, y: 0.02 + Math.sin(a) * 0.015, z: -0.552, rz: a }));
    }
    // — handguard: octagonal with side/bottom rails —
    st.push(G.cyl(0.026, 0.026, 0.24, 8, adjc(GM, 1.15), { y: 0.022, z: -0.22, rx: Math.PI / 2, vary: 0.05 }));
    rail(st, 0, 0.058, -0.32, -0.13, 0.024);                                          // handguard top rail
    rail(st, 0, -0.008, -0.32, -0.15, 0.02);                                          // bottom rail (inverted look ok)
    st.push(G.box(0.006, 0.018, 0.16, GM3, { x: -0.028, y: 0.022, z: -0.22 }));       // side rail L
    st.push(G.box(0.006, 0.018, 0.16, GM3, { x: 0.028, y: 0.022, z: -0.22 }));        // side rail R
    // — stock: buffer tube + adjustable stock + buttpad —
    st.push(G.cyl(0.017, 0.017, 0.14, 10, GM2, { y: 0.012, z: 0.17, rx: Math.PI / 2 }));
    st.push(G.cbox(0.038, 0.072, 0.11, 0.01, GM, { y: -0.005, z: 0.24 }));
    st.push(G.cbox(0.042, 0.085, 0.018, 0.006, GM2, { y: -0.005, z: 0.3 }));          // buttpad
    st.push(G.box(0.03, 0.02, 0.05, GM2, { y: -0.042, z: 0.22 }));                    // adj lever
    st.push(G.wedge(0.036, 0.045, 0.1, GM, { y: 0.028, z: 0.24, rx: Math.PI, ry: 0 })); // stock top ridge
    // — rear backup iron sight (folded) —
    st.push(G.box(0.03, 0.008, 0.02, GM2, { y: 0.062, z: 0.07 }));
    // — red dot optic —
    st.push(G.box(0.032, 0.01, 0.06, GM2, { y: 0.066, z: -0.03 }));                   // mount base
    st.push(G.torus(0.021, 0.004, 6, 14, GM2, { y: 0.086, z: -0.058 }));              // front ring
    st.push(G.torus(0.02, 0.004, 6, 14, GM2, { y: 0.086, z: -0.002 }));               // rear ring
    st.push(G.box(0.014, 0.018, 0.03, GM2, { x: 0.0, y: 0.062, z: -0.03 }));          // battery housing under tube
    const staticMesh = RT.meshOf(st, RT.MAT.gun);
    // open see-through optic housing (double-sided so the inner wall shades)
    const housing = RT.meshOf(RT.mergeGeos([G.cylo(0.02, 0.023, 0.055, 14, GM, { y: 0.086, z: -0.03, rx: Math.PI / 2 })]), RT.MAT.gun2, false);

    // magazine: curved 3-segment + baseplate
    const mg = [];
    mg.push(G.cbox(0.03, 0.055, 0.058, 0.005, adjc(GM, 1.1), { y: -0.11, z: -0.052, rx: 0.12 }));
    mg.push(G.cbox(0.03, 0.055, 0.056, 0.005, adjc(GM, 1.05), { y: -0.157, z: -0.042, rx: 0.3 }));
    mg.push(G.cbox(0.03, 0.05, 0.054, 0.005, GM, { y: -0.2, z: -0.024, rx: 0.48 }));
    mg.push(G.cbox(0.034, 0.012, 0.06, 0.004, GM2, { y: -0.222, z: -0.012, rx: 0.48 })); // baseplate
    const mag = RT.meshOf(mg, RT.MAT.gun);

    // charging handle (action part — cycles on reload)
    const act = [];
    act.push(G.box(0.03, 0.012, 0.045, GM2, { y: 0.048, z: 0.098 }));
    act.push(G.box(0.052, 0.01, 0.018, GM2, { y: 0.046, z: 0.115 }));
    const action = RT.meshOf(act, RT.MAT.gun);

    // red dot (emissive) + lenses
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0028, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2a18, fog: false }));
    dot.position.set(0, 0.086, -0.028); // faces +z = toward the shooter's eye
    const lensF = new THREE.Mesh(new THREE.CircleGeometry(0.018, 14), RT.MAT.glass);
    lensF.position.set(0, 0.086, -0.054);
    const lensR = new THREE.Mesh(new THREE.CircleGeometry(0.017, 14), RT.MAT.glass);
    lensR.position.set(0, 0.086, -0.006);
    return { staticMesh, mag, action, extra: [housing, dot, lensF, lensR], magHome: mag.position.clone(),
      muzzleZ: -0.58, sight: new THREE.Vector3(0, 0.086, 0), ejectPos: new THREE.Vector3(0.03, 0.02, -0.02),
      gripR: { pos: [0.03, -0.104, 0.092], fdir: [-0.92, 0.2, -0.3], pdir: [-1, 0.15, 0.2], pose: 'trigger' },
      gripL: { pos: [-0.082, 0.0, -0.21], fdir: [0.72, 0.55, -0.15], pdir: [-0.42, 0.86, 0.1], pose: 'support' } };
  }

  /* ---------- DMR: marksman rifle with scope + cycling bolt ---------- */
  function buildDMR() {
    const st = [];
    // stock body (polymer w/ wood tint) — full rifle profile
    st.push(G.cbox(0.04, 0.075, 0.34, 0.01, WOOD, { y: -0.012, z: 0.19, vary: 0.08 }));
    st.push(G.wedge(0.04, 0.05, 0.16, adjc(WOOD, 0.9), { y: 0.024, z: 0.26, rx: Math.PI }));   // comb
    st.push(G.cbox(0.044, 0.09, 0.02, 0.006, 0x2a2622, { y: -0.01, z: 0.36 }));               // recoil pad
    st.push(G.cbox(0.036, 0.06, 0.085, 0.008, adjc(WOOD, 0.85), { y: -0.09, z: 0.11, rx: -0.35 })); // grip
    st.push(G.cbox(0.042, 0.065, 0.3, 0.008, adjc(WOOD, 1.05), { y: -0.018, z: -0.14, vary: 0.06 })); // forend
    // receiver + bolt raceway
    st.push(G.cbox(0.038, 0.055, 0.22, 0.006, GM, { y: 0.03, z: 0.04 }));
    rail(st, 0, 0.062, -0.05, 0.1, 0.026);
    st.push(G.box(0.01, 0.02, 0.05, GM2, { y: -0.06, z: 0.03 }));                              // trigger guard
    st.push(G.box(0.005, 0.02, 0.007, GM3, { y: -0.052, z: 0.025, rx: 0.2 }));                 // trigger
    // barrel: long, tapered + muzzle brake
    st.push(G.cyl(0.012, 0.015, 0.5, 12, GM2, { y: 0.03, z: -0.5, rx: Math.PI / 2 }));
    st.push(G.cyl(0.017, 0.017, 0.05, 10, GM2, { y: 0.03, z: -0.77, rx: Math.PI / 2 }));
    for (let i = 0; i < 3; i++) st.push(G.box(0.04, 0.006, 0.008, 0x151517, { y: 0.03, z: -0.755 - i * 0.014 }));
    // bipod folded under forend
    st.push(G.box(0.036, 0.012, 0.02, GM2, { y: -0.052, z: -0.26 }));
    st.push(G.cyl(0.005, 0.006, 0.16, 6, GM2, { x: -0.014, y: -0.055, z: -0.185, rx: Math.PI / 2 }));
    st.push(G.cyl(0.005, 0.006, 0.16, 6, GM2, { x: 0.014, y: -0.055, z: -0.185, rx: Math.PI / 2 }));
    // scope: rings, main tube, objective, ocular, turrets
    st.push(G.box(0.012, 0.03, 0.02, GM2, { y: 0.075, z: -0.015 }));
    st.push(G.box(0.012, 0.03, 0.02, GM2, { y: 0.075, z: 0.075 }));
    st.push(G.cyl(0.02, 0.02, 0.16, 14, GM, { y: 0.1, z: 0.03, rx: Math.PI / 2 }));            // main tube
    st.push(G.cyl(0.032, 0.024, 0.07, 14, GM, { y: 0.1, z: -0.075, rx: Math.PI / 2 }));        // objective bell
    st.push(G.cyl(0.026, 0.028, 0.05, 14, GM, { y: 0.1, z: 0.115, rx: Math.PI / 2 }));         // ocular
    st.push(G.cyl(0.011, 0.011, 0.018, 8, GM3, { y: 0.128, z: 0.03 }));                        // elevation turret
    st.push(G.cyl(0.011, 0.011, 0.018, 8, GM3, { x: 0.028, y: 0.1, z: 0.03, rz: Math.PI / 2 })); // windage
    const staticMesh = RT.meshOf(st, RT.MAT.gun);
    // box magazine
    const mg = [G.cbox(0.032, 0.09, 0.062, 0.006, GM, { y: -0.1, z: -0.02, rx: 0.08 }),
      G.cbox(0.036, 0.012, 0.066, 0.004, GM2, { y: -0.148, z: -0.014, rx: 0.08 })];
    const mag = RT.meshOf(mg, RT.MAT.gun);
    // bolt handle (cycles)
    const act = [G.cyl(0.008, 0.008, 0.05, 8, GM3, { x: 0.03, y: 0.035, z: 0.08, rz: 1.2 }),
      G.sph(0.011, 8, 8, GM3, { x: 0.052, y: 0.022, z: 0.08 }),
      G.cyl(0.012, 0.012, 0.1, 10, adjc(GM3, 1.15), { y: 0.035, z: 0.05, rx: Math.PI / 2 })];
    const action = RT.meshOf(act, RT.MAT.gun);
    const lensO = new THREE.Mesh(new THREE.CircleGeometry(0.026, 14), RT.MAT.glass);
    lensO.position.set(0, 0.1, -0.108);
    const lensE = new THREE.Mesh(new THREE.CircleGeometry(0.02, 14), RT.MAT.glass);
    lensE.position.set(0, 0.1, 0.142);
    return { staticMesh, mag, action, extra: [lensO, lensE], magHome: mag.position.clone(),
      muzzleZ: -0.8, sight: new THREE.Vector3(0, 0.1, 0), ejectPos: new THREE.Vector3(0.03, 0.04, 0.05),
      scoped: true,
      gripR: { pos: [0.027, -0.089, 0.125], fdir: [-0.92, 0.05, -0.32], pdir: [-1, 0, 0.22], pose: 'trigger' },
      gripL: { pos: [-0.073, -0.031, -0.19], fdir: [0.72, 0.55, -0.15], pdir: [-0.42, 0.86, 0.1], pose: 'support' } };
  }

  /* ---------- pump shotgun ---------- */
  function buildShotgun() {
    const st = [];
    st.push(G.cbox(0.042, 0.065, 0.2, 0.008, GM, { y: 0.005, z: 0.0 }));                       // receiver
    st.push(G.cbox(0.04, 0.07, 0.26, 0.012, WOOD, { y: -0.005, z: 0.24, vary: 0.08 }));        // stock
    st.push(G.wedge(0.04, 0.04, 0.14, adjc(WOOD, 0.92), { y: 0.028, z: 0.27, rx: Math.PI }));
    st.push(G.cbox(0.044, 0.08, 0.016, 0.006, 0x26221e, { y: -0.008, z: 0.372 }));             // buttpad
    st.push(G.box(0.01, 0.022, 0.05, GM2, { y: -0.045, z: 0.04 }));                            // trigger guard
    st.push(G.box(0.005, 0.018, 0.007, GM3, { y: -0.038, z: 0.035, rx: 0.2 }));
    st.push(G.cyl(0.011, 0.011, 0.44, 12, GM2, { y: 0.028, z: -0.32, rx: Math.PI / 2 }));      // barrel
    st.push(G.cyl(0.0125, 0.0125, 0.4, 10, GM2, { y: -0.008, z: -0.3, rx: Math.PI / 2 }));     // tube mag
    st.push(G.cyl(0.014, 0.014, 0.02, 8, GM3, { y: -0.008, z: -0.495, rx: Math.PI / 2 }));     // tube cap
    st.push(G.sph(0.005, 8, 6, 0xd8d0b8, { y: 0.042, z: -0.53 }));                             // bead sight
    st.push(G.box(0.014, 0.014, 0.05, GM2, { y: 0.02, z: -0.51, rx: 0 }));                     // front clamp
    // shell carrier on receiver side with 4 visible shells
    st.push(G.box(0.012, 0.05, 0.11, GM2, { x: -0.03, y: 0.012, z: 0.02 }));
    for (let i = 0; i < 4; i++) {
      st.push(G.cyl(0.0095, 0.0095, 0.042, 8, 0x9e2f24, { x: -0.04, y: 0.012, z: -0.025 + i * 0.03, vary: 0.1 }));
      st.push(G.cyl(0.0098, 0.0098, 0.012, 8, 0xb99b52, { x: -0.04, y: -0.006, z: -0.025 + i * 0.03 }));
    }
    const staticMesh = RT.meshOf(st, RT.MAT.gun);
    // pump (action part - slides)
    const act = [G.cyl(0.019, 0.019, 0.13, 10, WOOD, { y: -0.008, z: -0.26, rx: Math.PI / 2, vary: 0.06 })];
    for (let i = 0; i < 6; i++) act.push(G.torus(0.0195, 0.002, 5, 10, adjc(WOOD, 0.8), { y: -0.008, z: -0.315 + i * 0.022 }));
    const action = RT.meshOf(act, RT.MAT.gun);
    return { staticMesh, mag: null, action, magHome: null, pump: true,
      muzzleZ: -0.54, sight: new THREE.Vector3(0, 0.045, 0), ejectPos: new THREE.Vector3(0.03, 0.01, 0.0),
      gripR: { pos: [0.027, -0.076, 0.11], fdir: [-0.92, 0.05, -0.3], pdir: [-1, 0, 0.2], pose: 'trigger' },
      gripL: { pos: [-0.068, -0.052, -0.26], fdir: [0.75, 0.42, -0.12], pdir: [-0.42, 0.86, 0.1], pose: 'support' } };
  }

  /* ---------- sidearm pistol ---------- */
  function buildPistol() {
    const st = [];
    st.push(G.cbox(0.03, 0.045, 0.15, 0.006, GM, { y: -0.012, z: -0.01 }));                    // frame
    st.push(G.cbox(0.03, 0.085, 0.05, 0.007, GM2, { y: -0.068, z: 0.045, rx: -0.28, vary: 0.05 })); // grip
    st.push(G.box(0.033, 0.03, 0.02, adjc(GM2, 1.2), { y: -0.05, z: 0.048, rx: -0.28 }));      // grip panel band
    st.push(G.box(0.008, 0.02, 0.036, GM2, { y: -0.045, z: -0.006 }));                         // trigger guard bottom
    st.push(G.box(0.008, 0.022, 0.006, GM2, { y: -0.036, z: -0.028 }));                        // guard front
    st.push(G.box(0.005, 0.018, 0.007, GM3, { y: -0.032, z: 0.0, rx: 0.15 }));                 // trigger
    st.push(G.box(0.018, 0.012, 0.014, GM2, { y: 0.012, z: 0.075, rx: 0.5 }));                 // hammer
    st.push(G.cyl(0.007, 0.007, 0.02, 8, GM3, { y: -0.005, z: -0.09, rx: Math.PI / 2 }));      // guide rod
    const staticMesh = RT.meshOf(st, RT.MAT.gun);
    // slide (reciprocates)
    const sl = [];
    sl.push(G.cbox(0.032, 0.032, 0.17, 0.006, adjc(GM, 1.12), { y: 0.022, z: -0.015 }));
    for (let i = 0; i < 6; i++) sl.push(G.box(0.034, 0.02, 0.004, GM2, { y: 0.022, z: 0.05 + i * 0.008 })); // serrations
    sl.push(G.box(0.006, 0.012, 0.008, GM2, { y: 0.044, z: 0.068 }));                          // rear sight
    sl.push(G.box(0.004, 0.01, 0.006, GM2, { y: 0.043, z: -0.09 }));                           // front sight
    sl.push(G.cyl(0.009, 0.009, 0.03, 8, GM3, { y: 0.018, z: -0.095, rx: Math.PI / 2 }));      // muzzle/barrel tip
    const action = RT.meshOf(sl, RT.MAT.gun);
    const mg = [G.cbox(0.024, 0.02, 0.04, 0.004, GM2, { y: -0.115, z: 0.052, rx: -0.28 })];    // visible baseplate
    const mag = RT.meshOf(mg, RT.MAT.gun);
    return { staticMesh, mag, action, magHome: mag.position.clone(), slide: true,
      muzzleZ: -0.11, sight: new THREE.Vector3(0, 0.044, 0), ejectPos: new THREE.Vector3(0.02, 0.03, 0.02),
      gripR: { pos: [0.024, -0.075, 0.058], fdir: [-0.9, 0.05, -0.34], pdir: [-1, 0, 0.24], pose: 'trigger' },
      gripL: { pos: [-0.036, -0.088, 0.05], fdir: [0.86, 0.3, -0.2], pdir: [0.55, 0.75, 0.15], pose: 'cup' } };
  }

  /* ============================================================
   * Anatomical first-person arm: gloved hand with staggered
   * knuckles, splayed tapered fingers with rounded tips, opposed
   * thumb, tendon ridges, knuckle pad; lofted tapering forearm
   * with articulated wrist skin; rolled sleeve.
   * Hand local space: wrist at origin, palm faces -z, fingers -y,
   * thumb on side*+x. Curl = rotation about +x (toward palm).
   * ============================================================ */
  const GLOVE = 0x63594a, GLOVE_D = 0x3a352c, GLOVE_PAD = 0x2b2925;

  /* finger data (right hand; x mirrored by side). splay > 0 pushes +x */
  const FDATA = [
    { name: 'index',  p: [0.0295, -0.080, -0.0025], len: 0.074, r: 0.0086, splay: 0.10 },
    { name: 'middle', p: [0.0100, -0.088, -0.0035], len: 0.082, r: 0.0090, splay: 0.02 },
    { name: 'ring',   p: [-0.0095, -0.084, -0.0030], len: 0.076, r: 0.0084, splay: -0.06 },
    { name: 'pinky',  p: [-0.0280, -0.074, -0.0020], len: 0.058, r: 0.0070, splay: -0.15 },
  ];
  /* per-pose curl angles [proximal, middle, distal] per finger + thumb */
  const POSES = {
    trigger: { index: [0.5, 0.4, 0.25], middle: [1.2, 1.25, 0.95], ring: [1.28, 1.28, 0.95], pinky: [1.32, 1.25, 0.9], thumb: [0.55, 0.7], thumbMode: 'wrap' },
    grip:    { index: [1.15, 1.2, 0.9], middle: [1.22, 1.25, 0.95], ring: [1.28, 1.28, 0.95], pinky: [1.32, 1.25, 0.9], thumb: [0.6, 0.75], thumbMode: 'wrap' },
    support: { index: [1.08, 1.15, 0.85], middle: [1.15, 1.22, 0.9], ring: [1.2, 1.22, 0.9], pinky: [1.25, 1.18, 0.85], thumb: [0.1, 0.12], thumbMode: 'rail' },
    cup:     { index: [0.72, 0.85, 0.6], middle: [0.8, 0.9, 0.65], ring: [0.85, 0.9, 0.65], pinky: [0.9, 0.85, 0.6], thumb: [0.3, 0.4], thumbMode: 'rail' },
  };

  const _fq = new THREE.Quaternion(), _fm = new THREE.Matrix4(), _fv = new THREE.Vector3(), _fs = new THREE.Vector3(1, 1, 1);
  const _Y_NEG = new THREE.Vector3(0, -1, 0);
  /* place a -y-built geometry at `from` aiming along `dir` */
  function aimGeo(geo, from, dir) {
    _fq.setFromUnitVectors(_Y_NEG, _fv.copy(dir).normalize());
    _fm.compose(new THREE.Vector3(from.x, from.y, from.z), _fq, _fs);
    geo.applyMatrix4(_fm);
    return geo;
  }
  const rotX = (v, a) => { const y = v.y, z = v.z; v.y = y * Math.cos(a) - z * Math.sin(a); v.z = y * Math.sin(a) + z * Math.cos(a); return v; };
  const rotZ = (v, a) => { const x = v.x, y = v.y; v.x = x * Math.cos(a) - y * Math.sin(a); v.y = x * Math.sin(a) + y * Math.cos(a); return v; };

  function buildGloveHand(side, poseName) {
    const pose = POSES[poseName] || POSES.grip;
    const geos = [];
    const S = (x) => side * x;
    /* --- palm: lofted wedge, wider at knuckles, flattened --- */
    geos.push(G.loft([
      { y: 0.005, rx: 0.030, rz: 0.019 },                       // wrist
      { y: -0.022, rx: 0.0355, rz: 0.0205 },
      { y: -0.050, rx: 0.0425, rz: 0.0215, z: -0.0015 },
      { y: -0.072, rx: 0.0465, rz: 0.0205, z: -0.002 },
      { y: -0.086, rx: 0.0455, rz: 0.018, z: -0.002 },          // knuckle row
    ], 12, GLOVE, { vary: 0.05 }));
    /* thenar (thumb-side) + hypothenar (pinky-side) pads on the palm side */
    geos.push(G.sph(0.0175, 10, 8, adjc(GLOVE, 0.9), { x: S(0.026), y: -0.042, z: -0.0135, sy: 1.5, sz: 0.75 }));
    geos.push(G.sph(0.0145, 10, 8, adjc(GLOVE, 0.88), { x: S(-0.029), y: -0.055, z: -0.011, sy: 1.7, sz: 0.7 }));
    /* back-of-hand tendon ridges to each knuckle */
    for (const f of FDATA) {
      const kx = S(f.p[0]);
      const ang = Math.atan2(kx - S(0.004), 0.07);
      geos.push(G.box(0.0042, 0.062, 0.0035, adjc(GLOVE, 1.12), { x: (kx + S(0.004)) / 2, y: -0.048, z: 0.0175, rz: ang }));
    }
    /* knuckle bumps + knuckle pad plate */
    for (const f of FDATA) geos.push(G.sph(0.0068, 8, 6, GLOVE_PAD, { x: S(f.p[0]), y: f.p[1] + 0.006, z: 0.012, sz: 0.8 }));
    geos.push(G.cbox(0.058, 0.014, 0.012, 0.004, GLOVE_PAD, { x: S(0.002), y: -0.077, z: 0.017, rz: S(-0.12) }));
    /* wrist strap + buckle (no ball joint — strap hides the hand/forearm blend) */
    geos.push(G.torus(0.0315, 0.006, 6, 14, GLOVE_D, { y: 0.012, rx: Math.PI / 2, sz: 0.68 }));
    geos.push(G.box(0.012, 0.008, 0.005, 0x8a8578, { x: S(0.02), y: 0.012, z: -0.021 }));
    /* --- fingers: staggered bases, splay, per-pose curl, rounded tips --- */
    for (const f of FDATA) {
      const curls = pose[f.name];
      const splayEff = f.splay * (1 - curls[0] * 0.55);
      const base = { x: S(f.p[0]), y: f.p[1], z: f.p[2] };
      const segLens = [f.len * 0.42, f.len * 0.32, f.len * 0.26];
      let dir = new THREE.Vector3(0, -1, 0);
      rotZ(dir, S(splayEff));
      let angle = 0;
      let r = f.r;
      let cur = { ...base };
      for (let si = 0; si < 3; si++) {
        angle = curls[si];
        // recompute direction: base splay then accumulated curl about x
        dir.set(0, -1, 0); rotZ(dir, S(splayEff * (1 - si * 0.4)));
        const total = curls.slice(0, si + 1).reduce((a2, b) => a2 + b, 0) * 0.78;
        rotX(dir, -total);
        const L = segLens[si], rTip = r * 0.86;
        const segGeo = G.cyl(rTip, r, L, 8, si === 0 ? GLOVE : adjc(GLOVE, 1 - si * 0.05), { y: -L / 2 });
        geos.push(aimGeo(segGeo, cur, dir));
        // joint blend sphere
        geos.push(G.sph(r * 0.98, 8, 6, adjc(GLOVE, 0.96), { x: cur.x, y: cur.y, z: cur.z }));
        cur = { x: cur.x + dir.x * L, y: cur.y + dir.y * L, z: cur.z + dir.z * L };
        r = rTip;
      }
      geos.push(G.sph(r * 1.02, 8, 6, adjc(GLOVE, 0.92), { x: cur.x, y: cur.y, z: cur.z })); // rounded tip
    }
    /* --- thumb: low on the side, ~45° across, 2 segments --- */
    {
      const tb = { x: S(0.034), y: -0.026, z: -0.006 };
      const tc = pose.thumb;
      const lens = [0.040, 0.034];
      let r = 0.0105;
      let cur = { ...tb };
      for (let si = 0; si < 2; si++) {
        const dir = new THREE.Vector3(0, -1, 0);
        if (pose.thumbMode === 'rail') {
          // thumb lies along the weapon's long axis (local ≈ -x for this basis)
          dir.set(S(0.92), -0.3, -0.28).normalize();
          rotX(dir, -tc[si] * 0.5);
        } else {
          // wrap: across the palm toward -z, opposing the fingers
          rotZ(dir, S(0.95 - si * 0.25));
          rotX(dir, -(0.45 + tc.slice(0, si + 1).reduce((a2, b) => a2 + b, 0)));
        }
        const L = lens[si], rTip = r * 0.84;
        geos.push(aimGeo(G.cyl(rTip, r, L, 8, GLOVE, { y: -L / 2 }), cur, dir));
        geos.push(G.sph(r * 0.98, 8, 6, adjc(GLOVE, 0.95), { x: cur.x, y: cur.y, z: cur.z }));
        cur = { x: cur.x + dir.x * L, y: cur.y + dir.y * L, z: cur.z + dir.z * L };
        r = rTip;
      }
      geos.push(G.sph(r * 1.02, 8, 6, adjc(GLOVE, 0.9), { x: cur.x, y: cur.y, z: cur.z }));
    }
    return geos;
  }

  /* forearm: lofted taper (widest below elbow → flattened-oval wrist),
   * slight bow, skin → rolled cuff → looser sleeve with bunching */
  function buildForearm(side, skin, sleeve) {
    const geos = [];
    geos.push(G.loft([
      { y: 0.005, rx: 0.0305, rz: 0.0195 },                       // wrist (flows from hand)
      { y: 0.045, rx: 0.035, rz: 0.024, z: 0.0015 },
      { y: 0.095, rx: 0.0405, rz: 0.0295, z: 0.003 },
      { y: 0.145, rx: 0.0445, rz: 0.034, z: 0.0035 },
    ], 14, skin, {}));
    /* rolled cuff ring */
    geos.push(G.torus(0.0448, 0.009, 8, 16, adjc(sleeve, 0.92), { y: 0.158, rx: Math.PI / 2, sz: 0.85, vary: 0.08 }));
    /* sleeve: slightly looser than the arm, subtle bunching */
    geos.push(G.loft([
      { y: 0.158, rx: 0.0468, rz: 0.038 },
      { y: 0.215, rx: 0.0495, rz: 0.0415, z: 0.003 },
      { y: 0.275, rx: 0.052, rz: 0.0445, z: 0.005 },
      { y: 0.34, rx: 0.054, rz: 0.047, z: 0.006 },
    ], 14, sleeve, { vary: 0.06 }));
    geos.push(G.torus(0.0505, 0.0025, 5, 14, adjc(sleeve, 0.9), { y: 0.235, rx: Math.PI / 2, sz: 0.88 }));
    geos.push(G.torus(0.0525, 0.0025, 5, 14, adjc(sleeve, 0.87), { y: 0.3, rx: Math.PI / 2, sz: 0.88 }));
    return geos;
  }

  /* orient a hand by explicit basis: fingers point along fdir, palm faces pdir */
  const _bm = new THREE.Matrix4();
  function gripQuat(fdir, pdir) {
    const y = new THREE.Vector3().fromArray(fdir).normalize().negate(); // local -y = fingers
    const z = new THREE.Vector3().fromArray(pdir).normalize().negate(); // local -z = palm
    const x = new THREE.Vector3().crossVectors(y, z).normalize();
    z.crossVectors(x, y).normalize();
    _bm.makeBasis(x, y, z);
    return new THREE.Quaternion().setFromRotationMatrix(_bm);
  }

  function buildArm(side, skin, sleeve, grip, poseName) {
    const grp = new THREE.Group();
    const geos = buildGloveHand(side, poseName);
    geos.push(...buildForearm(side, skin, sleeve));
    const arm = RT.meshOf(geos, RT.MAT.skin, false);
    if (grip.fdir) arm.quaternion.copy(gripQuat(grip.fdir, grip.pdir));
    else arm.rotation.fromArray(grip.rot);
    grp.add(arm);
    return grp;
  }

  /* ---------- weapon configs ---------- */
  const CFG = {
    m4: {
      name: 'M4A3 CARBINE', build: buildM4, auto: true, rpm: 720, dmg: 30, headMul: 2.2,
      mag: 30, reserve: 150, reloadT: 2.3, adsFov: 58, adsZ: -0.23,
      spreadHip: 0.03, spreadAds: 0.004, kick: 0.014, kickYaw: 0.005, vmKick: 0.03,
      hip: [0.16, -0.15, -0.35], sound: 'rifle', tracer: 3,
    },
    dmr: {
      name: 'MK14 DMR', build: buildDMR, auto: false, rpm: 220, dmg: 82, headMul: 3,
      mag: 10, reserve: 50, reloadT: 2.7, adsFov: 26, adsZ: -0.16, scope: true, bolt: true, boltT: 0.75,
      spreadHip: 0.05, spreadAds: 0.0012, kick: 0.045, kickYaw: 0.012, vmKick: 0.07,
      hip: [0.17, -0.16, -0.4], sound: 'dmr', tracer: 1,
    },
    shotgun: {
      name: 'M590 SHOTGUN', build: buildShotgun, auto: false, rpm: 70, dmg: 14, pellets: 8, headMul: 1.5,
      mag: 6, reserve: 42, reloadShell: 0.62, adsFov: 62, adsZ: -0.24, pump: true, pumpT: 0.62,
      spreadHip: 0.055, spreadAds: 0.04, kick: 0.05, kickYaw: 0.012, vmKick: 0.09,
      hip: [0.16, -0.15, -0.36], sound: 'shotgun', tracer: 0, range: 30,
    },
    pistol: {
      name: 'P9 SIDEARM', build: buildPistol, auto: false, rpm: 420, dmg: 34, headMul: 2.4,
      mag: 15, reserve: 90, reloadT: 1.8, adsFov: 66, adsZ: -0.28, slide: true,
      spreadHip: 0.025, spreadAds: 0.006, kick: 0.02, kickYaw: 0.007, vmKick: 0.045,
      hip: [0.15, -0.14, -0.3], sound: 'pistol', tracer: 0,
    },
  };
  W.CFG = CFG;

  /* ---------- state ---------- */
  const built = {};      // id -> assembly
  let vmRoot = null, cur = null, curId = null;
  let loadout = [];      // array of ids
  const ammo = {};       // id -> {mag, res}
  let adsK = 0, raiseK = 0, switchTo = null;
  let reloadT = -1, reloadStage = 0, shellsToLoad = 0;
  let cooldown = 0, pumpT = -1, boltT = -1, flashT = 0, slideBack = 0;
  let recP = 0, recY = 0, vmZ = 0, bobT = 0;
  const SKIN_FP = 0xb98e6d, SLEEVE_FP = 0x585c3c;
  W.state = () => ({ curId, adsK, ammo: ammo[curId], reloading: reloadT >= 0, raiseK });

  function assemble(id) {
    if (built[id]) return built[id];
    const cfg = CFG[id];
    const parts = cfg.build();
    const root = new THREE.Group();
    root.add(parts.staticMesh);
    if (parts.mag) root.add(parts.mag);
    if (parts.action) root.add(parts.action);
    if (parts.extra) parts.extra.forEach(e => root.add(e));
    parts.staticMesh.castShadow = false; parts.staticMesh.receiveShadow = false;
    // muzzle flash: 3 crossed additive planes + glow
    const fg = new THREE.Group();
    const fmat = new THREE.MeshBasicMaterial({ color: 0xffca66, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(starPlane(), fmat);
      p.rotation.z = i * Math.PI / 3;
      fg.add(p);
    }
    const sideP = new THREE.Mesh(starPlane(), fmat);
    sideP.rotation.y = Math.PI / 2; sideP.scale.setScalar(0.6);
    fg.add(sideP);
    fg.position.set(0, cfg.sight ? parts.sight.y - 0.06 : 0.02, parts.muzzleZ - 0.03);
    fg.position.y = id === 'pistol' ? 0.02 : 0.02;
    fg.visible = false;
    root.add(fg);
    // arms
    const armR = buildArm(1, SKIN_FP, SLEEVE_FP, parts.gripR, parts.gripR.pose || 'trigger');
    armR.position.fromArray(parts.gripR.pos);
    const armL = buildArm(-1, SKIN_FP, SLEEVE_FP, parts.gripL, parts.gripL.pose || 'support');
    armL.position.fromArray(parts.gripL.pos);
    root.add(armR); root.add(armL);
    root.traverse(o => { o.castShadow = false; o.receiveShadow = false; if (o.frustumCulled !== undefined) o.frustumCulled = false; });
    const asm = { root, cfg, parts, armR, armL, flash: fg,
      armLHome: armL.position.clone(), armRHome: armR.position.clone() };
    built[id] = asm;
    return asm;
  }
  function starPlane() {
    // 4-point star silhouette plane
    const sh = new THREE.Shape();
    const R = 0.09, r = 0.02;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU, rad = i % 2 === 0 ? R : r;
      const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
      if (i === 0) sh.moveTo(x, y); else sh.lineTo(x, y);
    }
    sh.closePath();
    return new THREE.ShapeGeometry(sh);
  }

  W.init = function () {
    vmRoot = new THREE.Group();
    RT.engine.camera.add(vmRoot);
  };
  W.setVisible = function (v) { if (vmRoot) vmRoot.visible = v; };

  W.setLoadout = function (ids, ammoOverride) {
    loadout = ids.slice();
    for (const id of ids) {
      if (!ammo[id] || ammoOverride) ammo[id] = { mag: CFG[id].mag, res: CFG[id].reserve };
    }
    if (!loadout.includes(curId)) equip(loadout[0], true);
  };
  W.giveAmmo = function (mult) {
    for (const id of loadout) { ammo[id].res = Math.min(CFG[id].reserve, ammo[id].res + Math.ceil(CFG[id].reserve * (mult || 0.5))); }
  };
  W.ammoOf = id => ammo[id];
  W.loadout = () => loadout;

  function equip(id, instant) {
    if (!id || (id === curId && !instant)) return;
    if (instant) {
      if (cur) vmRoot.remove(cur.root);
      const asm = assemble(id);
      vmRoot.add(asm.root);
      cur = asm; curId = id; raiseK = 1; switchTo = null;
      reloadT = -1; pumpT = -1; boltT = -1; cooldown = 0.2;
    } else if (curId !== id) {
      switchTo = id; reloadT = -1;
    }
  }
  W.equip = equip;

  /* recoil accessors for player camera */
  W.consumeRecoil = function () { const r = [recP, recY]; recP = 0; recY = 0; return r; };

  let semiLatch = false;
  W.update = function (dt, opts) {
    if (!cur) return;
    opts = opts || {};
    const cfg = cur.cfg;
    const I = RT.input;
    const am = ammo[curId];

    /* switching */
    for (let i = 0; i < loadout.length && i < 4; i++)
      if (I.pressed('Digit' + (i + 1)) && loadout[i] !== curId) equip(loadout[i]);
    if (I.wheel !== 0 && loadout.length > 1) {
      const d = Math.sign(I.wheel); I.wheel = 0;
      const idx = (loadout.indexOf(switchTo || curId) + d + loadout.length) % loadout.length;
      equip(loadout[idx]);
    } else I.wheel = 0;
    if (switchTo) {
      raiseK -= dt * 5;
      if (raiseK <= 0) { const t = switchTo; switchTo = null; equip(t, true); raiseK = 0; }
    } else if (raiseK < 1) raiseK = Math.min(1, raiseK + dt * 4);

    /* ADS */
    const wantAds = I.aim && !opts.sprinting && reloadT < 0 && !switchTo && raiseK > 0.9;
    adsK = damp(adsK, wantAds ? 1 : 0, 12, dt);
    const baseFov = RT.settings.fov;
    RT.engine.camera.fov = lerp(baseFov, cfg.adsFov, adsK * adsK * (3 - 2 * adsK));
    RT.engine.camera.updateProjectionMatrix();
    if (cfg.scope && RT.$('scope')) RT.$('scope').style.opacity = adsK > 0.82 ? 1 : 0;
    else if (RT.$('scope')) RT.$('scope').style.opacity = 0;

    /* cooldowns */
    cooldown -= dt;
    if (pumpT >= 0) {
      pumpT += dt;
      const k = pumpT / cfg.pumpT;
      if (k >= 1) pumpT = -1;
      else {
        const s = k < 0.4 ? smoothstep(0, 0.4, k) : 1 - smoothstep(0.5, 1, k);
        cur.parts.action.position.z = s * 0.09;
        if (k > 0.38 && k < 0.44 && !cur._pumpEject) { cur._pumpEject = true; ejectShell(true); }
        if (k > 0.5) cur._pumpEject = false;
      }
    }
    if (boltT >= 0) {
      boltT += dt;
      const k = boltT / cfg.boltT;
      if (k >= 1) { boltT = -1; cur.parts.action.position.z = 0; cur.parts.action.rotation.z = 0; }
      else {
        // lift, pull, push, drop
        const lift = smoothstep(0, 0.2, k) - smoothstep(0.75, 0.95, k);
        const pull = smoothstep(0.2, 0.45, k) - smoothstep(0.5, 0.75, k);
        cur.parts.action.rotation.z = -lift * 0.9;
        cur.parts.action.position.z = pull * 0.07;
        if (k > 0.45 && k < 0.52 && !cur._boltEject) { cur._boltEject = true; ejectShell(false); }
        if (k > 0.6) cur._boltEject = false;
      }
    }
    /* pistol slide */
    if (cfg.slide) {
      const targetSlide = (am.mag === 0 && reloadT < 0) ? 0.028 : slideBack;
      cur.parts.action.position.z = damp(cur.parts.action.position.z, targetSlide, 40, dt);
      slideBack = Math.max(0, slideBack - dt * 0.45);
    }

    /* fire */
    const canFire = cooldown <= 0 && reloadT < 0 && !switchTo && raiseK > 0.85 && pumpT < 0 && boltT < 0 && !opts.sprinting && !opts.dead;
    let firing = false;
    if (cfg.auto) firing = I.fire;
    else { firing = I.fire && !semiLatch; }
    semiLatch = I.fire;
    if (firing && canFire) {
      if (am.mag > 0) fireOnce(opts);
      else if (!cfg.auto) { RT.audio && RT.audio.dryClick(); cooldown = 0.25; if (am.res > 0) startReload(); }
      else { RT.audio && RT.audio.dryClick(); cooldown = 0.3; if (am.res > 0) startReload(); }
    }
    if (I.pressed('KeyR') && reloadT < 0 && am.mag < cfg.mag && am.res > 0 && !switchTo) startReload();

    /* reload animation */
    if (reloadT >= 0) updateReload(dt);

    /* flash lifetime */
    if (flashT > 0) {
      flashT -= dt;
      if (flashT <= 0) cur.flash.visible = false;
      else { cur.flash.rotation.z += 2.4; cur.flash.scale.setScalar(0.8 + Math.random() * 0.5); }
    }

    /* viewmodel motion: breathe + sway + bob + recoil + ads blend */
    const t = RT.engine.time;
    const speedF = opts.speedF || 0;
    bobT += dt * (4 + speedF * 6) * Math.min(1, speedF * 2);
    const breathe = Math.sin(t * 1.7) * 0.0016 * (1 - adsK * 0.85);
    const [mdx, mdy] = [opts.lookVelX || 0, opts.lookVelY || 0];
    const swayX = clamp(-mdx * 0.012, -0.02, 0.02) * (1 - adsK * 0.9);
    const swayY = clamp(mdy * 0.01, -0.018, 0.018) * (1 - adsK * 0.9);
    const bobX = Math.sin(bobT) * 0.009 * speedF * (1 - adsK * 0.9);
    const bobY = -Math.abs(Math.cos(bobT)) * 0.011 * speedF * (1 - adsK * 0.85);
    vmZ = Math.min(0, vmZ + dt * 0.35);

    const hip = cfg.hip;
    const sight = cur.parts.sight;
    const adsPos = [-sight.x, -sight.y, cfg.adsZ];
    const k2 = adsK * adsK * (3 - 2 * adsK);
    const px = lerp(hip[0], adsPos[0], k2) + swayX + bobX + breathe * 0.4;
    const py = lerp(hip[1], adsPos[1], k2) + swayY + bobY + breathe;
    const pz = lerp(hip[2], adsPos[2], k2) + vmZ;
    /* sprint + raise/lower pose */
    const lowerK = 1 - raiseK;
    const sprintK = damp(cur._sprintK || 0, opts.sprinting ? 1 : 0, 8, dt);
    cur._sprintK = sprintK;
    const rl = cur._reloadPose || { rx: 0, rz: 0, y: 0 };
    cur.root.position.set(px + sprintK * -0.06, py - lowerK * 0.45 - sprintK * 0.07 + rl.y, pz + sprintK * 0.06);
    cur.root.rotation.set(
      -vmZ * 2.2 + lowerK * 0.9 + sprintK * 0.55 + swayY * 1.4 + rl.rx,
      swayX * 1.6 + sprintK * 0.4,
      sprintK * 0.25 + swayX * 0.8 + rl.rz);
    RT.hud && RT.hud.setCrosshairSpread(currentSpread(opts) * 900, adsK);
  };

  function currentSpread(opts) {
    const cfg = cur.cfg;
    let s = lerp(cfg.spreadHip, cfg.spreadAds, adsK);
    s *= 1 + (opts && opts.speedF || 0) * 1.6;
    return s;
  }
  W.currentSpread = currentSpread;

  const _dir = new THREE.Vector3(), _org = new THREE.Vector3(), _tmp = new THREE.Vector3();
  function fireOnce(opts) {
    const cfg = cur.cfg, am = ammo[curId];
    am.mag--;
    cooldown = 60 / cfg.rpm;
    /* recoil */
    recP += cfg.kick * (0.85 + Math.random() * 0.3);
    recY += cfg.kickYaw * (Math.random() - 0.42);
    vmZ -= cfg.vmKick;
    RT.engine.shake(cfg.pellets ? 0.16 : 0.07);
    /* flash + light */
    cur.flash.visible = true; flashT = 0.045;
    cur.flash.rotation.z = Math.random() * TAU;
    const mw = _tmp.set(0, 0.02, cur.parts.muzzleZ);
    cur.root.localToWorld(mw);
    RT.engine.flash(mw, 0xffb050, cfg.pellets ? 3.4 : 2.2, 13, 0.06);
    /* shots */
    const cam = RT.engine.camera;
    cam.getWorldDirection(_dir);
    _org.setFromMatrixPosition(cam.matrixWorld);
    const n = cfg.pellets || 1;
    const spread = currentSpread(opts);
    for (let i = 0; i < n; i++) {
      const d = _dir.clone();
      d.x += (Math.random() - 0.5) * 2 * spread;
      d.y += (Math.random() - 0.5) * 2 * spread;
      d.z += (Math.random() - 0.5) * 2 * spread * 0.4;
      d.normalize();
      if (RT.combat) RT.combat.playerShot(_org, d, cfg, mw);
    }
    if (RT.audio) RT.audio.gunshot(cfg.sound);
    /* action cycling */
    if (cfg.pump) { pumpT = 0.12; cur._pumpEject = false; }
    else if (cfg.bolt) { if (am.mag > 0) { boltT = 0.1; cur._boltEject = false; } else ejectShell(false); }
    else if (cfg.slide) { slideBack = 0.026; ejectShell(false); }
    else ejectShell(false);
    if (am.mag === 0 && am.res > 0 && cfg.auto) setTimeout(() => { if (reloadT < 0 && ammo[curId].mag === 0) startReload(); }, 350);
  }

  /* ---------- shell casings (pooled meshes with physics) ---------- */
  const shells = [];
  function getShellPool() {
    if (shells.length) return;
    const brassG = RT.mergeGeos([G.cyl(0.005, 0.0055, 0.028, 6, 0xc9a552, {})]);
    const redG = RT.mergeGeos([G.cyl(0.0095, 0.0095, 0.05, 6, 0x9e2f24, {}), G.cyl(0.0098, 0.0098, 0.014, 6, 0xb99b52, { y: -0.02 })]);
    for (let i = 0; i < 22; i++) {
      const m = new THREE.Mesh(i % 4 === 3 ? redG : brassG, RT.MAT.gun);
      m.visible = false;
      RT.engine.scene.add(m);
      shells.push({ m, red: i % 4 === 3, life: 0, v: new THREE.Vector3(), w: new THREE.Vector3() });
    }
  }
  function ejectShell(isShotgun) {
    getShellPool();
    let s = shells.find(x => !x.m.visible && (!!x.red === !!isShotgun));
    if (!s) s = shells.find(x => !x.m.visible);
    if (!s) return;
    const ep = _tmp.copy(cur.parts.ejectPos);
    cur.root.localToWorld(ep);
    s.m.visible = true; s.life = 3;
    s.m.position.copy(ep);
    const cam = RT.engine.camera;
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    const up = new THREE.Vector3(0, 1, 0);
    s.v.copy(right).multiplyScalar(1.2 + Math.random() * 0.8).addScaledVector(up, 1.6 + Math.random()).addScaledVector(new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 2), -0.3);
    s.w.set(Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10);
    s.m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
  }
  W.updateShells = function (dt) {
    for (const s of shells) {
      if (!s.m.visible) continue;
      s.life -= dt;
      if (s.life <= 0) { s.m.visible = false; continue; }
      s.v.y -= 9.8 * dt;
      s.m.position.addScaledVector(s.v, dt);
      s.m.rotation.x += s.w.x * dt; s.m.rotation.z += s.w.z * dt;
      const gy = (RT.map && RT.map.heightAt ? RT.map.heightAt(s.m.position.x, s.m.position.z) : 0) + 0.012;
      if (s.m.position.y < gy) {
        s.m.position.y = gy;
        if (Math.abs(s.v.y) > 0.4) { s.v.y = -s.v.y * 0.32; s.v.x *= 0.6; s.v.z *= 0.6; if (RT.audio) RT.audio.shellTink(); }
        else { s.v.set(0, 0, 0); s.w.set(0, 0, 0); s.m.rotation.x = Math.PI / 2; }
      }
    }
  };

  /* ---------- reload ---------- */
  function startReload() {
    const cfg = cur.cfg, am = ammo[curId];
    if (am.res <= 0 || am.mag >= cfg.mag) return;
    if (cfg.pump) {
      shellsToLoad = Math.min(cfg.mag - am.mag, am.res);
      reloadT = 0; reloadStage = 0;
    } else {
      reloadT = 0;
      cur._magDropped = false; cur._magBack = false;
    }
    if (RT.audio) RT.audio.reloadStart();
  }
  W.startReload = startReload;

  function updateReload(dt) {
    const cfg = cur.cfg, am = ammo[curId];
    if (cfg.pump) { // shell-by-shell
      reloadT += dt;
      const per = cfg.reloadShell;
      const k = (reloadT % per) / per;
      // weapon tilts, left hand pushes shells from below
      const tl = Math.sin(Math.min(1, reloadT * 3) * Math.PI / 2);
      cur._reloadPose = { rx: tl * 0.12, rz: tl * 0.4, y: -tl * 0.03 };
      cur.armL.position.y = cur.armLHome.y - 0.1 + 0.1 * Math.sin(k * Math.PI);
      cur.armL.position.z = cur.armLHome.z + 0.14 - 0.05 * Math.sin(k * Math.PI);
      if (k > 0.55 && !cur._shellFed) {
        cur._shellFed = true;
        am.mag++; am.res--; shellsToLoad--;
        if (RT.audio) RT.audio.shellLoad();
      }
      if (k < 0.5) cur._shellFed = false;
      if (shellsToLoad <= 0 || am.res <= 0 || am.mag >= cfg.mag) {
        reloadT = -1;
        cur._reloadPose = null;
        cur.armL.position.copy(cur.armLHome);
        if (pumpT < 0 && !cur._chambered) { pumpT = 0; }
      }
      return;
    }
    reloadT += dt;
    const T = cfg.reloadT, k = reloadT / T;
    const mag = cur.parts.mag;
    if (k >= 1) {
      reloadT = -1;
      const take = Math.min(cfg.mag - am.mag, am.res);
      am.mag += take; am.res -= take;
      if (mag) { mag.position.copy(cur.parts.magHome); mag.visible = true; }
      cur.armL.position.copy(cur.armLHome);
      cur._reloadPose = null;
      return;
    }
    // stage motions
    const tilt = Math.sin(Math.min(k / 0.15, 1) * Math.PI / 2) * (1 - smoothstep(0.85, 1, k));
    cur._reloadPose = { rx: tilt * 0.14, rz: tilt * 0.38, y: -tilt * 0.02 };
    if (mag) {
      if (k > 0.16 && k < 0.45) { // mag out & falls
        if (!cur._magDropped) {
          cur._magDropped = true;
          spawnFallingMag(mag);
          mag.visible = false;
          if (RT.audio) RT.audio.magOut();
        }
      } else if (k >= 0.55 && k < 0.92) { // new mag rides hand up
        mag.visible = true;
        const rise = smoothstep(0.55, 0.8, k);
        mag.position.copy(cur.parts.magHome);
        mag.position.y -= (1 - rise) * 0.22;
        mag.position.z += (1 - rise) * 0.05;
        if (!cur._magBack && rise >= 1) { cur._magBack = true; if (RT.audio) RT.audio.magIn(); }
      }
      // left hand follows mag
      if (k > 0.16 && k < 0.92) {
        const hk = k < 0.45 ? smoothstep(0.16, 0.3, k) : 1 - smoothstep(0.55, 0.85, k);
        cur.armL.position.y = cur.armLHome.y - hk * 0.24;
        cur.armL.position.z = cur.armLHome.z + hk * 0.22;
      } else cur.armL.position.copy(cur.armLHome);
    }
    // action gesture at the end (bolt release / slide rack)
    if (k > 0.9 && cur.parts.action && !cfg.bolt) {
      const ak = smoothstep(0.9, 0.94, k) - smoothstep(0.95, 1, k);
      cur.parts.action.position.z = ak * (cfg.slide ? 0.028 : 0.03);
      if (!cur._rack && k > 0.94) { cur._rack = true; if (RT.audio) RT.audio.boltRack(); }
    } else cur._rack = false;
  }

  function spawnFallingMag(mag) {
    const clone = new THREE.Mesh(mag.geometry, mag.material);
    const wp = new THREE.Vector3(); mag.getWorldPosition(wp);
    const wq = new THREE.Quaternion(); mag.getWorldQuaternion(wq);
    clone.position.copy(wp); clone.quaternion.copy(wq);
    RT.engine.scene.add(clone);
    const v = new THREE.Vector3((Math.random() - 0.5) * 0.4, -0.5, (Math.random() - 0.5) * 0.4);
    let life = 2.5;
    (RT.transients = RT.transients || []).push((dt2) => {
      life -= dt2;
      v.y -= 9.8 * dt2;
      clone.position.addScaledVector(v, dt2);
      clone.rotation.x += 3 * dt2;
      const gy = (RT.map && RT.map.heightAt ? RT.map.heightAt(clone.position.x, clone.position.z) : 0) + 0.03;
      if (clone.position.y < gy) { clone.position.y = gy; v.set(0, 0, 0); clone.rotation.x = Math.PI / 2; }
      if (life <= 0) { RT.engine.scene.remove(clone); return false; }
      return true;
    });
  }

  return W;
})();
