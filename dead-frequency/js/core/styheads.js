'use strict';
// Stylized character heads built from three.js geometry (spheres, capsules, cylinders, tori).
// Deliberately simple and soft — rounded head, big glossy eyes, chunky brows and hair clumps — so the
// characters read clearly through the VHS look without drifting into the uncanny valley.
// Local space: origin on the eye line at the middle of the face, meters, +z forward. The returned group is
// attached to the rig's head bone; moving parts sit in pivot groups (eyes, lids, mouth).

const StyHead = (() => {
  const col = (c, k = 1) => new THREE.Color(`rgb(${c.map(v => Math.round(Math.min(255, v * k))).join(',')})`);
  const hash = (i, j) => { let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const noise2 = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const gauss = (d, s) => Math.exp(-(d * d) / (2 * s * s));
  const mats = {};
  const mat = (key, make) => mats[key] || (mats[key] = make());
  const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.68, metalness: 0, envMapIntensity: 0.15 }, o));

  // ---------------------------------------------------------------------------------------------
  function headMesh(L) {
    const fem = !!L.female, sh = (L.face && L.face.shape) || {};
    const jaw = (fem ? 0.33 : 0.24) * (sh.jaw || 1), cheek = sh.cheek || 1;
    const g = new THREE.SphereGeometry(1, 56, 40);
    const p = g.attributes.position, n = p.count, colors = new Float32Array(n * 3);
    const skin = col(L.skin, 1.0), blush = col([L.skin[0] * 1.02, L.skin[1] * 0.78, L.skin[2] * 0.74]);
    const stub = !fem && L.face && L.face.stubble ? L.face.stubble : 0;
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
      let x = vx * (fem ? 0.073 : 0.077), y = vy * 0.112, z = vz * 0.092;
      const t = Math.max(0, -vy);
      x *= 1 - jaw * Math.pow(t, 1.35);                                   // jaw tapers to the chin
      if (vz > 0) z *= 1 - 0.07 * vz * vz * Math.max(0, 1 - Math.abs(vy) * 1.2);   // calmer, flatter face
      z += Math.max(0, vz) * 0.011 * t * t;                              // chin forward
      if (vz < 0 && vy > -0.35) z *= 1.05;                               // fuller back of the skull
      x *= 1 + 0.05 * cheek * gauss(vy + 0.3, 0.18) * Math.max(0, vz);   // soft cheeks
      // shallow eye sockets
      for (const sx of [-1, 1]) { const d = Math.hypot(vx - sx * 0.42, vy - 0.02); z -= 0.0045 * gauss(d, 0.13) * Math.max(0, vz); }
      p.setXYZ(i, x, y + 0.006, z - 0.004);
      // colour: warm cheeks, slightly darker sockets and jaw underside, stubble shadow
      c.copy(skin);
      const ch = Math.max(gauss(Math.hypot(vx - 0.5, vy + 0.25), 0.16), gauss(Math.hypot(vx + 0.5, vy + 0.25), 0.16)) * Math.max(0, vz);
      c.lerp(blush, ch * (fem ? 0.55 : 0.35));
      c.lerp(blush, gauss(Math.hypot(vx, vy + 0.3), 0.08) * Math.max(0, vz) * 0.35);     // nose / middle of the face
      let dark = 0;
      for (const sx of [-1, 1]) dark = Math.max(dark, gauss(Math.hypot(vx - sx * 0.42, vy - 0.02), 0.12) * Math.max(0, vz) * 0.16);
      dark = Math.max(dark, Math.max(0, -vy - 0.75) * 0.6);
      c.multiplyScalar(1 - dark);
      if (stub) { const m = Math.max(0, Math.min(1, (-vy - 0.32) / 0.2)) * (vz > -0.25 ? 1 : 0); c.lerp(new THREE.Color(0x6e6a6c), m * (0.18 + stub * 0.32)); }
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, std(0xffffff, { vertexColors: true, roughness: 0.62 }));
    m.name = 'head';
    return m;
  }

  // hair cap: part of a sphere around the skull, tilted back to show the forehead, with chunky clumps
  function hairCap(L, o = {}) {
    const tilt = o.tilt == null ? 0.66 : o.tilt, thetaMax = o.theta || 1.6, out = o.out || 0.009;
    const g = new THREE.SphereGeometry(1, 48, 22, 0, Math.PI * 2, 0, thetaMax);
    const p = g.attributes.position, n = p.count, colors = new Float32Array(n * 3), base = col(L.hair), c = new THREE.Color();
    const fem = !!L.female;
    const ct = Math.cos(-tilt), stt = Math.sin(-tilt);
    for (let i = 0; i < n; i++) {
      const ux = p.getX(i), uy = p.getY(i), uz = p.getZ(i);
      const ang = Math.atan2(ux, uz), lat = Math.acos(Math.max(-1, Math.min(1, uy)));
      // tilt the cap direction back, then wrap it onto the head's own ellipsoid (so it hugs the skull everywhere)
      const vx = ux, vy = uy * ct - uz * stt, vz = uy * stt + uz * ct;
      const clump = noise2(ang * 4.5, lat * 2.2) - 0.5, groove = Math.sin(ang * 26 + noise2(ang * 3, lat) * 3);
      const edge = Math.max(0, (lat - (thetaMax - 0.45)) / 0.45);            // near the hairline: chunky locks
      const r = 1 + (clump + 0.5) * 0.06 + groove * 0.006 + (o.volume || 0) * (1 - edge);
      let x = vx * r * ((fem ? 0.073 : 0.077) + out), y = vy * r * (0.112 + out), z = vz * r * (0.092 + out);
      if (edge > 0) y -= edge * (0.004 + Math.max(0, Math.sin(ang * 9 + 1.3)) * 0.007);   // scalloped hairline
      p.setXYZ(i, x, y, z);
      c.copy(base).multiplyScalar(0.82 + clump * 0.5 + groove * 0.05);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, std(0xffffff, { vertexColors: true, roughness: 0.78, side: THREE.DoubleSide }));
    m.position.set(0, 0.006, -0.004);
    m.name = 'hairCap';
    return m;
  }
  const blob = (parent, color, x, y, z, sx, sy, sz, name, o = {}) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, o.seg || 20, o.seg2 || 14), o.mat || std(color, { roughness: o.rough || 0.78 }));
    m.scale.set(sx, sy, sz); m.position.set(x, y, z); if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]); m.name = name; parent.add(m); return m;
  };

  function hair(group, L) {
    const st = L.hairStyle, hc = col(L.hair), hm = std(hc, { roughness: 0.8 });
    if (st === 'ponytail') {
      group.add(hairCap(L, { tilt: 0.7, theta: 1.62 }));
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0045, 8, 18), std(0x151517)); tie.position.set(0, 0.024, -0.104); tie.name = 'hairTie'; group.add(tie);
      const pts = [[0, 0.02, -0.112, 0.019], [0, -0.012, -0.124, 0.024], [0, -0.05, -0.126, 0.023], [0, -0.088, -0.118, 0.018], [0, -0.12, -0.108, 0.01]];
      pts.forEach((q, k) => blob(group, 0, q[0], q[1], q[2], q[3] * 0.9, q[3] * 1.5, q[3] * 0.85, 'ponytail' + k, { mat: hm }));
    } else if (st === 'bun') {
      group.add(hairCap(L, { tilt: 0.7, theta: 1.62 }));
      blob(group, 0, 0, 0.055, -0.108, 0.03, 0.028, 0.026, 'bun', { mat: hm });
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 8, 18), std(0x6a1a1a)); tie.position.set(0, 0.052, -0.088); tie.rotation.x = 0.3; group.add(tie);
    } else if (st === 'bob') {
      group.add(hairCap(L, { tilt: 0.62, theta: 1.58, volume: 0.05 }));
      // a skirt of hair from the temples down to the jaw, open at the face
      const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.096, 0.1, 30, 3, true, Math.PI * 0.32, Math.PI * 1.36), new THREE.MeshStandardMaterial({ color: hc, roughness: 0.8, side: THREE.DoubleSide, envMapIntensity: 0.15 }));
      sk.position.set(0, -0.022, -0.012); sk.name = 'bob'; group.add(sk);
      blob(group, 0, 0.02, 0.064, 0.072, 0.046, 0.014, 0.024, 'sweep', { mat: hm, rot: [0.75, 0, -0.32] });   // side-parted sweep
    } else if (st === 'short') {
      group.add(hairCap(L, { tilt: 0.62, theta: 1.57, out: 0.008 }));
      for (const sx of [-1, 1]) blob(group, 0, sx * 0.073, -0.006, 0.026, 0.004, 0.016, 0.008, 'sideburn', { mat: hm });
    } else if (st === 'cap') {
      const fr = new THREE.Mesh(new THREE.TorusGeometry(0.074, 0.011, 8, 26, Math.PI * 1.25), hm); fr.rotation.set(Math.PI / 2, 0, Math.PI * 0.375 + Math.PI); fr.position.set(0, 0.004, -0.008); fr.scale.set(1, 1.15, 1); fr.name = 'fringe'; group.add(fr);
      const cc = col(L.cap || [52, 66, 48]), cm = std(cc, { roughness: 0.9 });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, 1.45), cm); dome.scale.set(0.084, 0.088, 0.098); dome.position.set(0, 0.03, -0.006); dome.rotation.x = -0.12; dome.name = 'capDome'; group.add(dome);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.005, 26, 1, false, -Math.PI / 2, Math.PI), cm); brim.scale.set(1, 1, 1.1); brim.position.set(0, 0.04, 0.07); brim.rotation.x = 0.16; brim.name = 'capBrim'; group.add(brim);
      const btn = blob(group, 0, 0, 0.12, -0.012, 0.007, 0.004, 0.007, 'capButton', { mat: cm });
      void btn;
    } else if (st === 'balding') {
      const fr = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 8, 26, Math.PI * 1.3), hm); fr.rotation.set(Math.PI / 2, 0, Math.PI * 0.35 + Math.PI); fr.position.set(0, 0.012, -0.01); fr.scale.set(1, 1.18, 1); fr.name = 'fringe'; group.add(fr);
    } else group.add(hairCap(L, {}));
  }

  // ---------------------------------------------------------------------------------------------
  function build(L) {
    const root = new THREE.Group(); root.name = 'styHead';
    const fem = !!L.female, F = L.face || {};
    root.add(headMesh(L));
    const skinM = std(col(L.skin), { roughness: 0.62 });
    // nose, ears
    blob(root, 0, 0, -0.026, 0.082, 0.0095, 0.018, 0.011, 'nose', { mat: skinM, rot: [-0.42, 0, 0] });
    for (const sx of [-1, 1]) blob(root, 0, sx * 0.073, -0.012, -0.006, 0.0075, 0.023, 0.015, 'ear', { mat: skinM, rot: [0, sx * 0.35, 0] });
    // eyes: big glossy balls with iris, pupil and a highlight; skin lids in pivots for blinking
    const eyeW = mat('eyeWhite', () => std(0xf3efe6, { roughness: 0.22, envMapIntensity: 0.5 }));
    const irisM = std(col(L.eye || [70, 60, 50]), { roughness: 0.3 }), pupilM = mat('pupil', () => std(0x0b0808, { roughness: 0.2 }));
    const hiM = mat('hi', () => new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const lidM = std(col(L.skin, 0.96), { roughness: 0.62, side: THREE.DoubleSide });
    const lashM = mat('lash', () => std(0x1a1210, { roughness: 0.8 }));
    const eyes = [], lids = [];
    const ER = 0.0128;
    for (const sx of [-1, 1]) {
      const pv = new THREE.Group(); pv.position.set(sx * 0.031, 0.0, 0.066); pv.name = 'eyePivot'; root.add(pv);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(ER, 20, 14), eyeW); ball.name = 'eyeball'; pv.add(ball);
      const iris = new THREE.Mesh(new THREE.CircleGeometry(ER * 0.56, 20), irisM); iris.position.z = ER * 0.985; pv.add(iris);
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(ER * 0.25, 16), pupilM); pupil.position.z = ER * 0.99; pv.add(pupil);
      const hi = new THREE.Mesh(new THREE.CircleGeometry(ER * 0.09, 8), hiM); hi.position.set(ER * 0.18, ER * 0.2, ER * 0.995); pv.add(hi);
      eyes.push(pv);
      const lp = new THREE.Group(); lp.position.copy(pv.position); lp.name = 'lidPivot'; root.add(lp);
      const lid = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.08, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), lidM); lp.add(lid);
      const lash = new THREE.Mesh(new THREE.TorusGeometry(ER * 1.08, fem ? 0.0011 : 0.0007, 5, 18, Math.PI), lashM); lash.rotation.x = Math.PI / 2; lp.add(lash);
      lp.rotation.x = -0.62; lids.push(lp);
      // brow
      const bw = fem ? 0.0028 : 0.0038 * ((F.shape && F.shape.brow) || 1);
      const brow = new THREE.Mesh(new THREE.CapsuleGeometry(bw, 0.021, 4, 8), std(col(F.brows || L.hair, 0.85), { roughness: 0.9 }));
      brow.rotation.z = Math.PI / 2 + sx * (fem ? -0.16 : -0.08); brow.position.set(sx * 0.031, 0.02, 0.08); brow.name = 'brow'; root.add(brow);
    }
    // mouth: a soft dark slot that opens when talking, lips around it
    const mouth = new THREE.Group(); mouth.position.set(0, -0.06, 0.081); mouth.name = 'mouth'; root.add(mouth);
    const slot = new THREE.Mesh(new THREE.CapsuleGeometry(0.0014, 0.02, 4, 10), mat('mouthIn', () => std(0x3a1618, { roughness: 0.9 }))); slot.rotation.z = Math.PI / 2; slot.scale.z = 0.5; mouth.add(slot);
    if (fem) {
      const lc = F.lips || [176, 108, 106];
      const lip = new THREE.Mesh(new THREE.CapsuleGeometry(0.0026, 0.017, 4, 10), std(col(lc), { roughness: 0.5 })); lip.rotation.z = Math.PI / 2; lip.position.set(0, -0.003, -0.002); lip.scale.z = 0.45; lip.name = 'lip'; mouth.add(lip);
    }
    if (F.mustache) {
      const mu = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.0048, 6, 14, Math.PI * 0.85), std(col(F.mustache), { roughness: 0.9 }));
      mu.position.set(0, -0.052, 0.084); mu.rotation.z = Math.PI * 0.075; mu.scale.set(1.2, 0.75, 0.6); mu.name = 'mustache'; root.add(mu);
    }
    hair(root, L);
    if (L.glasses) {
      const gm = mat('glassesFrame', () => std(0x2a2724, { roughness: 0.35, metalness: 0.6 }));
      const lm = mat('glassesLens', () => new THREE.MeshStandardMaterial({ color: 0x9fb0bb, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.3, depthWrite: false }));
      for (const sx of [-1, 1]) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.0175, 0.0013, 6, 22), gm); rim.scale.y = 0.8; rim.position.set(sx * 0.032, -0.001, 0.088); root.add(rim);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.0175, 18), lm); lens.scale.y = 0.8; lens.position.copy(rim.position); root.add(lens);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.0016, 0.0016, 0.09), gm); arm.position.set(sx * 0.07, 0.004, 0.044); root.add(arm);
      }
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.0018, 0.0018), gm); br.position.set(0, 0.002, 0.09); root.add(br);
    }
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    if (fem) root.scale.setScalar(0.97);
    return { root, eyes, lids, mouth };
  }
  return { build };
})();
