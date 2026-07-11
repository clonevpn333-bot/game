/* ============================================================
 * Section 1 — Drop transport aircraft. Fully modeled: lofted
 * fuselage, high wings with 4 turboprops (spinning props +
 * blur discs), tail, open rear cargo ramp, ribbed interior with
 * jump seats + static line, retracted gear. Plane-local space:
 * +Z = nose forward, +Y = up, origin at the wing box.
 * ============================================================ */
RT.aircraft = (() => {
  const A = {};
  const G = RT.G;

  /* stitch elliptical rings along +Z. rings: [{z, ry, rx, cy}] nose→tail order-agnostic */
  function loftZ(rings, seg, c, o) {
    const pos = [], idx = [];
    for (const s of rings) for (let i = 0; i < seg; i++) {
      const a = (i / seg) * TAU;
      pos.push(Math.cos(a) * s.rx, (s.cy || 0) + Math.sin(a) * s.ry, s.z);
    }
    for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < seg; i++) {
      const a = r * seg + i, b = r * seg + (i + 1) % seg, c2 = (r + 1) * seg + i, d = (r + 1) * seg + (i + 1) % seg;
      idx.push(a, c2, b, b, c2, d);
    }
    const nose = pos.length / 3; pos.push(0, rings[0].cy || 0, rings[0].z);
    const tail = pos.length / 3; pos.push(0, rings[rings.length - 1].cy || 0, rings[rings.length - 1].z);
    for (let i = 0; i < seg; i++) {
      idx.push(nose, (i + 1) % seg, i);
      idx.push(tail, (rings.length - 1) * seg + i, (rings.length - 1) * seg + (i + 1) % seg);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    g.setIndex(idx); g.computeVertexNormals();
    return RT.paintGeo(g, c, o && o.vary);
  }

  /* NACA-ish airfoil shape in XY: chord along x (0..c), thickness in y */
  function airfoil(chord, thick, camber) {
    const sh = new THREE.Shape();
    const N = 12;
    const pts = [];
    for (let i = 0; i <= N; i++) {                    // upper surface
      const t = i / N, x = t * chord;
      const yt = thick * (1.4845 * Math.sqrt(t) - 0.63 * t - 1.758 * t * t + 1.42 * t * t * t - 0.5 * Math.pow(t, 4));
      pts.push([x, yt + camber * Math.sin(t * Math.PI) * chord]);
    }
    for (let i = N; i >= 0; i--) {                    // lower surface
      const t = i / N, x = t * chord;
      const yt = thick * (1.4845 * Math.sqrt(t) - 0.63 * t - 1.758 * t * t + 1.42 * t * t * t - 0.5 * Math.pow(t, 4));
      pts.push([x, -yt * 0.55 + camber * Math.sin(t * Math.PI) * chord]);
    }
    sh.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts) sh.lineTo(p[0], p[1]);
    sh.closePath();
    return sh;
  }

  /* rivet / panel-line skin texture */
  let skinTex = null;
  function makeSkin() {
    if (skinTex) return skinTex;
    skinTex = RT.canvasTex(256, (ctx, s) => {
      ctx.fillStyle = '#e9e7e1'; ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = 'rgba(120,120,120,0.5)'; ctx.lineWidth = 1;
      for (let y = 0; y < s; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke(); }  // panel lines
      for (let x = 0; x < s; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, s); ctx.stroke(); }
      ctx.fillStyle = 'rgba(90,90,90,0.55)';
      for (let y = 4; y < s; y += 32) for (let x = 6; x < s; x += 10) ctx.fillRect(x, y, 1.4, 1.4);            // rivets
      for (let i = 0; i < 30; i++) {                                                                           // grime streaks below seams
        const x = Math.random() * s, y = ((Math.random() * s / 32) | 0) * 32;
        const g = ctx.createLinearGradient(0, y, 0, y + 26);
        g.addColorStop(0, 'rgba(60,58,52,0.32)'); g.addColorStop(1, 'rgba(60,58,52,0)');
        ctx.fillStyle = g; ctx.fillRect(x, y, 2 + Math.random() * 3, 26);
      }
    });
    skinTex.wrapS = skinTex.wrapT = THREE.RepeatWrapping;
    skinTex.repeat.set(4, 4);
    return skinTex;
  }

  A.build = function () {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.18, map: makeSkin() });
    const detailMat = RT.MAT.metal;
    const body = 0x5f6a52, bodyDk = 0x474f3c, grey = 0x6b6f70, dark = 0x2a2d2a, glassC = 0x10202a;

    /* ---------- fuselage ---------- */
    const rings = [
      { z: 16.2, rx: 0.22, ry: 0.24, cy: 0.28 },      // nose tip
      { z: 15.3, rx: 0.9, ry: 0.95, cy: 0.22 },
      { z: 13.6, rx: 1.65, ry: 1.75, cy: 0.1 },
      { z: 11.0, rx: 2.1, ry: 2.2, cy: 0 },
      { z: 6.0, rx: 2.25, ry: 2.35, cy: 0 },
      { z: 0.0, rx: 2.25, ry: 2.35, cy: 0 },
      { z: -6.0, rx: 2.2, ry: 2.3, cy: 0.05 },
      { z: -10.5, rx: 1.9, ry: 2.05, cy: 0.5 },        // tail begins upsweep
      { z: -14.5, rx: 1.25, ry: 1.5, cy: 1.5 },
      { z: -17.5, rx: 0.7, ry: 0.95, cy: 2.5 },
      { z: -19.5, rx: 0.28, ry: 0.4, cy: 3.1 },        // tail cone
    ];
    const fuse = RT.meshOf(loftZ(rings, 28, body), skinMat);
    group.add(fuse);
    /* belly keel + chine strips (panel relief) */
    group.add(RT.meshOf([
      G.box(0.5, 0.18, 26, bodyDk, { y: -2.3, z: -1.5 }),
      G.box(4.2, 0.12, 0.5, bodyDk, { y: -2.15, z: 8.5 }),
      G.box(4.2, 0.12, 0.5, bodyDk, { y: -2.15, z: -3 }),
    ], skinMat));
    /* cockpit windows + nose */
    group.add(RT.meshOf([
      G.box(1.5, 0.62, 0.1, glassC, { x: 0.95, y: 1.05, z: 14.4, ry: -0.35, rx: -0.15 }),
      G.box(1.5, 0.62, 0.1, glassC, { x: -0.95, y: 1.05, z: 14.4, ry: 0.35, rx: -0.15 }),
      G.box(1.0, 0.6, 0.1, glassC, { x: 0, y: 1.15, z: 15.0, rx: -0.2 }),
    ], RT.MAT.gun2));

    /* ---------- wing (single continuous high wing, full span) ---------- */
    const wing = G.extrude(airfoil(5.4, 0.9, 0.04), 22, body, {});
    wing.rotateY(Math.PI / 2);                          // span → X (±11), chord → −Z
    wing.translate(0, 2.25, 3.4);                       // sits on top of the fuselage, LE forward
    group.add(RT.meshOf([wing], skinMat));
    /* wing-root fairing so it blends into the fuselage */
    group.add(RT.meshOf([G.box(3.4, 1.3, 6.0, body, { y: 1.9, z: 0.9, vary: 0.05 })], skinMat));
    /* flap/aileron seam + wingtip lights */
    for (const sgn of [1, -1]) group.add(RT.meshOf([G.box(9, 0.08, 0.3, bodyDk, { x: sgn * 6.3, y: 2.2, z: -1.5 })], skinMat));
    const wtR = light(0x30ff40, 0.16); wtR.position.set(11, 2.3, 1.0); group.add(wtR);
    const wtL = light(0xff3030, 0.16); wtL.position.set(-11, 2.3, 1.0); group.add(wtL);

    /* ---------- 4 turboprop engines + spinning props ---------- */
    const props = [];
    const engMat = detailMat;
    for (const [sgn, ex] of [[1, 4.2], [1, 9.4], [-1, 4.2], [-1, 9.4]]) {
      const x = sgn * ex;
      const nac = RT.meshOf([
        G.cyl(0.62, 0.72, 3.4, 16, grey, { x, y: 1.55, z: 2.2, rx: Math.PI / 2 }),
        G.torus(0.63, 0.09, 8, 16, dark, { x, y: 1.55, z: 3.9, rx: 0 }),           // intake lip
        G.cyl(0.4, 0.28, 0.7, 12, dark, { x, y: 1.55, z: 0.4, rx: Math.PI / 2 }),  // exhaust
        G.cyl(0.16, 0.16, 1.0, 10, 0x30332f, { x, y: 1.15, z: 3.0, rx: 0.5 }),     // pylon to wing
      ], engMat);
      group.add(nac);
      /* propeller hub + 4 twisted blades */
      const prop = new THREE.Group();
      prop.position.set(x, 1.55, 4.15);
      const hub = RT.meshOf([G.sph(0.28, 12, 10, 0x24261f, {}), G.cyl(0.16, 0.22, 0.5, 10, dark, { z: 0.1, rx: Math.PI / 2 })], engMat);
      prop.add(hub);
      for (let b = 0; b < 4; b++) {
        const blade = RT.meshOf([bladeGeo()], engMat);
        blade.rotation.z = b * Math.PI / 2;
        prop.add(blade);
      }
      /* motion-blur disc (fades in with RPM) */
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1.75, 24),
        new THREE.MeshBasicMaterial({ color: 0x20221c, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
      disc.rotation.y = 0; disc.position.z = 0.05;
      prop.add(disc);
      group.add(prop);
      props.push({ prop, disc });
    }

    /* ---------- tail surfaces ---------- */
    const finShape = new THREE.Shape();                 // trapezoid fin: x=fore-aft, y=height
    finShape.moveTo(0, 0); finShape.lineTo(4.6, 0); finShape.lineTo(3.7, 4.6); finShape.lineTo(2.0, 4.6); finShape.closePath();
    const vstab = G.extrude(finShape, 0.34, body, {});
    vstab.rotateY(-Math.PI / 2);                         // fore-aft → +Z, thickness → X
    vstab.translate(0, 2.5, -19.3);
    group.add(RT.meshOf([vstab], skinMat));
    /* rudder seam */
    group.add(RT.meshOf([G.box(0.4, 4.2, 0.12, bodyDk, { y: 4.6, z: -18.8 })], skinMat));
    /* horizontal stabilizer (T-tail, full span) */
    const hstab = G.extrude(airfoil(2.6, 0.42, 0), 8.6, body, {});
    hstab.rotateY(Math.PI / 2); hstab.translate(0, 6.9, -15.6);
    group.add(RT.meshOf([hstab], skinMat));
    /* nav lights */
    const navR = light(0x30ff40, 0.16); navR.position.set(6.7, 2.1, -0.9); group.add(navR);
    const navL = light(0xff3030, 0.16); navL.position.set(-6.7, 2.1, -0.9); group.add(navL);
    const navT = light(0xffffff, 0.14); navT.position.set(0, 5.4, -16.6); group.add(navT);

    /* ---------- rear cargo ramp (open) + interior ---------- */
    const interior = buildInterior(skinMat);
    group.add(interior.group);

    /* retracted gear doors (belly panels) */
    group.add(RT.meshOf([
      G.box(1.3, 0.08, 2.2, bodyDk, { x: 1.0, y: -2.16, z: 6.5 }),
      G.box(1.3, 0.08, 2.2, bodyDk, { x: -1.0, y: -2.16, z: 6.5 }),
      G.box(1.6, 0.08, 2.6, bodyDk, { y: -2.2, z: -1.5 }),
    ], skinMat));

    group.userData = {
      props, jumpLight: interior.jumpLight, ramp: interior.ramp,
      seatAnchors: interior.seatAnchors, rampLip: interior.rampLip,
    };
    return group;
  };

  function bladeGeo() {
    /* twisted blade: stack of chord sections from root→tip, each rotated (pitch) */
    const rings = [];
    const N = 6;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const r = 0.25 + t * 1.55;                       // radius out
      const chord = 0.42 * (1 - t * 0.55);
      const pitch = (1 - t) * 0.9;                      // twist: coarse at root
      rings.push({ r, chord, pitch, thick: 0.09 * (1 - t * 0.6) });
    }
    const pos = [], idx = [];
    const seg = 2; // leading/trailing edge -> use 4 pts per section (an airfoil-ish quad)
    function sectPts(ring) {
      const c = ring.chord, th = ring.thick, p = ring.pitch;
      const raw = [[-c * 0.35, th], [c * 0.65, 0.01], [c * 0.65, -0.01], [-c * 0.35, -th]];
      return raw.map(([x, y]) => {
        const cx = x * Math.cos(p) - y * Math.sin(p);
        const cy = x * Math.sin(p) + y * Math.cos(p);
        return [cx, ring.r, cy];   // y = radius (blade points +y)
      });
    }
    let prev = null;
    for (const ring of rings) {
      const s = sectPts(ring);
      const base = pos.length / 3;
      for (const p of s) pos.push(p[0], p[1], p[2]);
      if (prev !== null) for (let k = 0; k < 4; k++) {
        const a = prev + k, b = prev + (k + 1) % 4, c2 = base + k, d = base + (k + 1) % 4;
        idx.push(a, c2, b, b, c2, d);
      }
      prev = base;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    g.setIndex(idx); g.computeVertexNormals();
    return RT.paintGeo(g, 0x26281f);
  }

  function buildInterior(skinMat) {
    const grp = new THREE.Group();
    const ribC = 0x555c48, netC = 0x8a2f26, floorC = 0x3a3d36, seatC = 0x3f4a33;
    const geos = [];
    /* ribbed inner wall frames every ~2m along the body (arcs) */
    for (let z = -9; z <= 12; z += 2.2) {
      geos.push(G.torus(2.0, 0.08, 4, 18, ribC, { z, rx: 0, ry: 0 }));   // ring frame (inside)
    }
    /* floor with rollers */
    geos.push(G.box(3.0, 0.12, 24, floorC, { y: -1.5, z: 1 }));
    for (let z = -8; z <= 12; z += 1.4) geos.push(G.cyl(0.09, 0.09, 2.6, 8, 0x8a8f92, { y: -1.4, z, rz: Math.PI / 2 }));
    /* overhead static-line cable + dangling hooks */
    geos.push(G.cyl(0.04, 0.04, 22, 6, 0xaab0b4, { y: 1.7, z: 1, rz: Math.PI / 2 }));
    const seatAnchors = [];
    for (let z = -8; z <= 11; z += 1.5) {
      for (const sgn of [1, -1]) {
        geos.push(G.box(0.05, 0.14, 0.05, 0x2b2b2b, { x: sgn * 0.35, y: 1.5, z }));  // hook
        /* fold-down jump seat */
        geos.push(G.box(0.5, 0.06, 0.42, seatC, { x: sgn * 1.55, y: -0.55, z, ry: sgn > 0 ? -0.15 : 0.15 }));
        geos.push(G.box(0.5, 0.5, 0.05, seatC, { x: sgn * 1.78, y: -0.3, z }));
        seatAnchors.push({ x: sgn * 1.05, y: -1.5, z, side: sgn });
      }
    }
    /* red cargo netting panels on walls */
    for (const sgn of [1, -1]) for (let z = -7; z <= 10; z += 3.4) {
      geos.push(G.box(0.04, 1.2, 2.8, netC, { x: sgn * 1.95, y: 0.2, z }));
    }
    /* strapped crates near the front */
    geos.push(G.box(1.4, 1.0, 1.6, 0x6a5a3e, { x: 0.6, y: -0.95, z: 8.5 }));
    geos.push(G.box(1.2, 0.9, 1.3, 0x5e5236, { x: -0.8, y: -1.0, z: 9.8 }));
    grp.add(RT.meshOf(geos, RT.MAT.std, false));

    /* jump light (red→green) */
    const jl = new THREE.Group();
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
    bulb.position.set(1.4, 1.4, -6.5); jl.add(bulb);
    const glow = new THREE.PointLight(0xff2a1a, 0.7, 9, 2); glow.position.set(0, 0.5, -4); jl.add(glow);
    grp.add(jl);

    /* rear cargo ramp: pivots at the tail floor, drops open */
    const ramp = new THREE.Group();
    ramp.position.set(0, -1.5, -9.5);
    const rampMesh = RT.meshOf([
      G.box(3.2, 0.16, 4.5, 0x4a4e42, { z: -2.0 }),               // ramp deck
      G.box(0.2, 0.5, 4.5, 0x3a3e34, { x: 1.6, y: 0.25, z: -2 }), // side rails
      G.box(0.2, 0.5, 4.5, 0x3a3e34, { x: -1.6, y: 0.25, z: -2 }),
    ], skinMat, false);
    /* tread grating lines */
    ramp.add(rampMesh);
    ramp.rotation.x = -0.62;                                       // hanging open
    grp.add(ramp);
    /* hydraulic arms */
    grp.add(RT.meshOf([
      G.cyl(0.08, 0.08, 2.2, 8, 0x888c90, { x: 1.5, y: -0.8, z: -10.5, rx: 0.7 }),
      G.cyl(0.08, 0.08, 2.2, 8, 0x888c90, { x: -1.5, y: -0.8, z: -10.5, rx: 0.7 }),
    ], RT.MAT.metal, false));
    const rampLip = new THREE.Vector3(0, -1.55, -13.0);

    return { group: grp, jumpLight: bulb, jumpGlow: glow, ramp, seatAnchors, rampLip };
  }

  function dark(h) { return h; }
  function light(color, r) {
    return new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial({ color, fog: false }));
  }

  /* populate the hold with jumpers standing in two rows, gripping the line */
  A.buildJumpers = function (group, count) {
    const jumpers = [];
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const idx = Math.floor(i / 2);
      const z = 9.6 - idx * 1.05;
      if (z < -7.5) break;
      const rig = RT.character.build({ seed: 100 + i, faction: 'ally', paletteIdx: i % 3, headgear: i % 4 === 0 ? 'helmet' : 'helmet', mode: 'brace' });
      rig.group.position.set(side * 0.8, -1.44, z);
      rig.group.rotation.y = Math.PI;         // face the ramp (−z)
      rig.anim.mode = 'brace'; rig.anim.phase = Math.random() * 6; rig.anim.blend = 22;
      group.add(rig.group);
      jumpers.push({ rig, homeZ: z, side, jumped: false, order: i });
    }
    group.userData.jumpers = jumpers;
    return jumpers;
  };
  A.poseJumpers = function (group, dt) {
    const js = group.userData.jumpers; if (!js) return;
    for (const jm of js) if (!jm.jumped) RT.character.pose(jm.rig, dt);
  };

  /* animate props (rpm 0..1) and jump light */
  A.update = function (group, dt, rpm, jumpGreen) {
    const ud = group.userData;
    for (const p of ud.props) {
      p.prop.rotation.z += dt * (2 + rpm * 60);
      p.disc.material.opacity = Math.min(0.5, rpm * 0.5);
    }
    if (ud.jumpLight) ud.jumpLight.material.color.setHex(jumpGreen ? 0x22ff33 : 0xff2a1a);
  };

  return A;
})();
