/* 30_world.js — procedural city. Every mesh generated in code.
 * OWNER: main. Serves two masters: combat space and photograph. See CONTRACT §5.
 */
VH.World = (function () {
  const U = VH.util;
  let world = null;
  let rain = null, steamPuffs = [], flickers = [], water = null, T = 0;

  /* ------------------------------------------------------------ district specs
   * Each district is the same generator driven by a different parameter set, plus
   * a few bespoke touches. Identity comes from palette, height profile, and props. */
  const DISTRICTS = {
    undertide: {
      label: 'Undertide',
      streetW: 24, blockLen: 30, blocks: 5,
      hMin: 9, hMax: 26, setback: 0.18,
      wall: 'metalRust', plinth: 'concreteStain', ground: 'asphaltWet',
      accents: [0xff2d6f, 0x00e5ff, 0xffb340, 0x7cff5a, 0xc98bff, 0xff3320],
      accentBias: 0, flooded: 0.42, shanty: 0.85, awnings: 0.5,
      fogColor: [0.050, 0.075, 0.098], fogDensity: 0.013,
      signs: ['DRY DOCK 9', 'NINEFOLD', 'SALTLIGHT', 'GLASSJAW', 'TIDEWATER', 'FIRSTLIGHT LOANS'],
      towers: 16,
    },
    market: {
      label: 'Kettle Market',
      streetW: 15, blockLen: 22, blocks: 6,
      hMin: 7, hMax: 16, setback: 0.1,
      wall: 'concrete', plinth: 'metalPanel', ground: 'asphaltWet',
      accents: [0xffb340, 0xff2d6f, 0x7cff5a, 0x00e5ff, 0xffd9a8],
      accentBias: 0, flooded: 0.0, shanty: 0.6, awnings: 1.0,
      fogColor: [0.075, 0.062, 0.045], fogDensity: 0.012,
      signs: ['HALCYON NOODLE', 'KETTLE', 'PACHINKO OSAKI', 'MERIDIAN CLINIC', 'VOLT-EX'],
      towers: 12,
    },
    spine: {
      label: 'The Spine',
      streetW: 34, blockLen: 44, blocks: 4,
      hMin: 16, hMax: 48, setback: 0.26,
      wall: 'concrete', plinth: 'concreteStain', ground: 'asphaltWet',
      accents: [0xffb340, 0x00e5ff, 0xff2d6f, 0xc98bff],
      accentBias: 0, flooded: 0.0, shanty: 0.15, awnings: 0.1,
      fogColor: [0.055, 0.070, 0.092], fogDensity: 0.010,
      signs: ['VOLT-EX', 'SABLE', 'CHOIR PUBLIC UTILITY', 'TIDEWATER'],
      towers: 22, elevated: true,
    },
    sablecore: {
      label: 'Sable Core',
      streetW: 30, blockLen: 36, blocks: 4,
      hMin: 24, hMax: 60, setback: 0.3,
      wall: 'glassDark', plinth: 'concrete', ground: 'asphaltWet',
      accents: [0x00e5ff, 0xbfe4ff, 0x7cff5a],
      accentBias: 0, flooded: 0.0, shanty: 0.0, awnings: 0.0,
      fogColor: [0.042, 0.062, 0.088], fogDensity: 0.009,
      signs: ['SABLE', 'ANDRADE-SABLE CONTINUITY', 'CONTINUITY'],
      towers: 20, clean: true,
    },
    transit: {
      label: 'Transit',
      streetW: 20, blockLen: 26, blocks: 5,
      hMin: 8, hMax: 14, setback: 0.05,
      wall: 'metalPanel', plinth: 'concrete', ground: 'concrete',
      accents: [0x00e5ff, 0xffb340, 0xbfe4ff, 0xff2d6f],
      accentBias: 0, flooded: 0.0, shanty: 0.1, awnings: 0.2,
      fogColor: [0.048, 0.066, 0.086], fogDensity: 0.012,
      signs: ['TRANSIT', 'MAG-LINE 4', 'SABLE', 'KETTLE'],
      towers: 10, interior: true,
    },
    rooftops: {
      label: 'Rooftops',
      streetW: 26, blockLen: 30, blocks: 4,
      hMin: 2, hMax: 6, setback: 0.0,
      wall: 'metalRust', plinth: 'concreteStain', ground: 'concrete',
      accents: [0xff2d6f, 0x00e5ff, 0xffb340, 0x7cff5a, 0xc98bff, 0xff3320],
      accentBias: 0, flooded: 0.0, shanty: 0.4, awnings: 0.0,
      fogColor: [0.058, 0.078, 0.105], fogDensity: 0.008,
      signs: ['SALTLIGHT', 'NINEFOLD'], towers: 26, high: true,
    },
    spire: {
      label: 'The Spire',
      streetW: 40, blockLen: 40, blocks: 3,
      hMin: 30, hMax: 70, setback: 0.34,
      wall: 'concrete', plinth: 'metalPanel', ground: 'concrete',
      accents: [0x00e5ff, 0xbfe4ff, 0x7cff5a],
      accentBias: 0, flooded: 0.0, shanty: 0.0, awnings: 0.0,
      fogColor: [0.038, 0.058, 0.082], fogDensity: 0.011,
      signs: ['CHOIR', 'CONTINUITY'], towers: 8, interior: true, choir: true,
    },
  };

  /* ------------------------------------------------------------------ helpers */
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const M = n => VH.Mat.get(n);

  function addCollider(list, x, y, z, hw, hh, hd) {
    list.push({ type: 'box', x: x, y: y, z: z, hw: hw, hh: hh, hd: hd });
  }

  /* Collect geometry per material, merge once at the end. This is what keeps the
   * draw call count in the low hundreds instead of the low thousands. */
  function Batch() {
    const buckets = new Map();
    return {
      add(matName, geo, pos, rot, scale) {
        if (!buckets.has(matName)) buckets.set(matName, []);
        buckets.get(matName).push(U.xform(geo, pos, rot, scale));
      },
      flush(parent) {
        let calls = 0;
        buckets.forEach((geos, matName) => {
          const merged = U.mergeGeometries(geos);
          if (!merged) return;
          geos.forEach(g => g.dispose());
          const mesh = new THREE.Mesh(merged, M(matName));
          mesh.matrixAutoUpdate = false;
          parent.add(mesh);
          calls++;
        });
        buckets.clear();
        return calls;
      },
    };
  }

  /* ------------------------------------------------------------------ signage */
  function makeSignMesh(text, o) {
    o = o || {};
    const t = VH.Mat.makeSign(text, o);
    const img = t.image || t._canvas;
    const ar = img ? img.width / img.height : 1;
    const h = o.size || 3.2;
    const w = h * ar;
    const mat = new THREE.MeshBasicMaterial({
      map: t, transparent: true, toneMapped: true,
      blending: o.style === 'painted' ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.userData.signMat = mat;
    return mesh;
  }

  /* A blade sign: the vertical projecting sign that defines a cyberpunk street.
   * Includes the mounting arm, because signs that float unsupported read as fake. */
  function bladeSign(parent, batch, text, x, y, z, facing, color, seed) {
    const g = new THREE.Group();
    const sign = makeSignMesh(text, { vertical: true, color: color, size: 5.2, seed: seed, decay: 0.3 });
    sign.position.set(0, 0, 0);
    g.add(sign);
    /* backing panel so the sign has a body from behind */
    const bb = sign.geometry.parameters;
    const back = new THREE.Mesh(box(bb.width * 1.12, bb.height * 1.06, 0.22), M('metalRust'));
    back.position.z = -0.16;
    g.add(back);
    /* mounting arm back to the wall */
    const arm = new THREE.Mesh(box(0.14, 0.14, 1.5), M('metalPanel'));
    arm.position.set(0, bb.height * 0.42, -0.9);
    g.add(arm);
    const arm2 = arm.clone(); arm2.position.y = -bb.height * 0.42;
    g.add(arm2);
    g.position.set(x, y, z);
    g.rotation.y = facing;
    parent.add(g);
    /* A sign that does not light the wall behind it and the water below it reads as a
     * sticker. This registration is what puts colour into the street. */
    if (VH.Core.registerLight) {
      VH.Core.registerLight(null, {
        pos: new THREE.Vector3(x - Math.sin(facing) * 1.2, y, z + Math.cos(facing) * 1.2),
        color: color, intensity: 11.0, distance: 24, importance: 2.2, fog: true, fogGain: 1.0,
      });
    }
    flickers.push({ mat: sign.userData.signMat, base: 1, seed: Math.random() * 100, rate: 0.2 + Math.random() * 0.8, dead: Math.random() < 0.12 });
    return g;
  }

  /* ------------------------------------------------------------- building kit */
  const WALLS = ['concrete', 'concreteStain', 'metalPanel', 'metalRust'];
  function buildFacade(batch, parent, spec, rnd, ox, oz, w, d, h, faceDir) {
    /* A block where every building shares one material reads as a backlot. */
    const wallMat = spec.clean ? spec.wall : WALLS[Math.floor(rnd() * WALLS.length)];
    /* main mass */
    batch.add(wallMat, box(w, h, d), [ox, h / 2, oz]);

    /* plinth / ground floor — a different material and slightly proud of the wall */
    const plinthH = 4.2;
    batch.add(spec.plinth, box(w + 0.35, plinthH, d + 0.35), [ox, plinthH / 2, oz]);
    /* a painted band of shopfront colour above the plinth */
    if (rnd() < 0.7) {
      const bandCol = spec.accents[Math.floor(rnd() * spec.accents.length)];
      const bandMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(bandCol).multiplyScalar(0.30), roughness: 0.7, metalness: 0.1,
        emissive: new THREE.Color(bandCol), emissiveIntensity: 0.30,
      });
      const band = new THREE.Mesh(box(w + 0.5, 0.9, d + 0.5), bandMat);
      band.position.set(ox, plinthH + 0.45, oz);
      band.matrixAutoUpdate = false; band.updateMatrix();
      parent.add(band);
    }

    /* window bands: an emissive plane per floor, inset into the wall.
     * Rendered as one plane per face with a tiling window texture — cheap and reads well. */
    const floors = Math.max(1, Math.floor((h - plinthH) / 3.4));
    if (floors > 0 && !spec.interior) {
      const bandH = floors * 3.4;
      const winTex = VH.Mat.tex('windows', {
        cols: Math.max(3, Math.round(w / 2.6)), rows: floors,
        seed: (ox * 7 + oz * 13 + h) | 0, darkChance: spec.clean ? 0.34 : 0.58,
      });
      const wm = new THREE.MeshBasicMaterial({ map: winTex, toneMapped: true });
      /* four faces */
      const faces = [
        { pw: w, px: ox, pz: oz + d / 2 + 0.02, ry: 0 },
        { pw: w, px: ox, pz: oz - d / 2 - 0.02, ry: Math.PI },
        { pw: d, px: ox + w / 2 + 0.02, pz: oz, ry: Math.PI / 2 },
        { pw: d, px: ox - w / 2 - 0.02, pz: oz, ry: -Math.PI / 2 },
      ];
      for (const f of faces) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(f.pw * 0.92, bandH), wm);
        m.position.set(f.px, plinthH + bandH / 2, f.pz);
        m.rotation.y = f.ry;
        m.matrixAutoUpdate = false; m.updateMatrix();
        parent.add(m);
      }
    }

    /* roof crown: mechanical housing, water tanks, antenna */
    const crownW = w * (0.3 + rnd() * 0.35), crownD = d * (0.3 + rnd() * 0.35);
    const crownH = 1.6 + rnd() * 3.2;
    batch.add('metalPanel', box(crownW, crownH, crownD), [ox + (rnd() - 0.5) * w * 0.3, h + crownH / 2, oz + (rnd() - 0.5) * d * 0.3]);
    if (rnd() < 0.6) {
      const tankR = 0.9 + rnd() * 0.7, tankH = 2.0 + rnd() * 1.8;
      batch.add('metalRust', new THREE.CylinderGeometry(tankR, tankR, tankH, 10),
        [ox + (rnd() - 0.5) * w * 0.5, h + tankH / 2, oz + (rnd() - 0.5) * d * 0.5]);
    }
    if (rnd() < 0.7) {
      const mh = 3 + rnd() * 7;
      batch.add('metalPanel', box(0.14, mh, 0.14), [ox + (rnd() - 0.5) * w * 0.6, h + mh / 2, oz + (rnd() - 0.5) * d * 0.6]);
    }

    /* shanty additions: bolted-on volumes that break the box silhouette.
     * This single feature is most of what stops the skyline reading as extruded cubes. */
    const nAdd = spec.shanty > 0 ? Math.floor(rnd() * 4 * spec.shanty) : 0;
    for (let i = 0; i < nAdd; i++) {
      const aw = 1.6 + rnd() * 3.2, ah = 1.8 + rnd() * 2.6, ad = 1.4 + rnd() * 2.2;
      const side = Math.floor(rnd() * 4);
      const ay = plinthH + rnd() * Math.max(1, h - plinthH - ah);
      let ax = ox, az = oz;
      if (side === 0) az = oz + d / 2 + ad / 2 - 0.2;
      else if (side === 1) az = oz - d / 2 - ad / 2 + 0.2;
      else if (side === 2) ax = ox + w / 2 + aw / 2 - 0.2;
      else ax = ox - w / 2 - aw / 2 + 0.2;
      batch.add('metalRust', box(aw, ah, ad), [ax, ay + ah / 2, az]);
      /* support struts underneath so it looks bolted on, not floating */
      batch.add('metalPanel', box(0.1, ay - plinthH + 0.4, 0.1), [ax, plinthH + (ay - plinthH) / 2, az]);
    }

    /* fire escape on the street-facing side */
    if (rnd() < 0.55 && !spec.clean) {
      const fz = oz + faceDir * (d / 2 + 0.55);
      for (let f = 1; f * 3.4 < h - 2; f++) {
        const fy = plinthH + f * 3.4;
        batch.add('metalPanel', box(w * 0.5, 0.1, 1.1), [ox, fy, fz]);
        batch.add('metalPanel', box(w * 0.5, 0.9, 0.06), [ox, fy + 0.5, fz + 0.5 * faceDir]);
        /* diagonal stair */
        batch.add('metalPanel', box(0.7, 0.08, 3.3), [ox + w * 0.2, fy + 1.7, fz], [-0.85, 0, 0]);
      }
    }

    /* AC units and vents clinging to the wall */
    const nAC = 2 + Math.floor(rnd() * 5);
    for (let i = 0; i < nAC; i++) {
      const ay = plinthH + rnd() * (h - plinthH - 1);
      const side = rnd() < 0.5 ? 1 : -1;
      batch.add('metalPanel', box(0.85, 0.7, 0.6), [ox + (rnd() - 0.5) * w * 0.8, ay, oz + side * (d / 2 + 0.3)]);
    }
  }

  /* --------------------------------------------------------------- street kit */
  function streetProps(batch, parent, spec, rnd, x, z, side, cover) {
    const facing = side > 0 ? Math.PI : 0;

    /* kerb */
    batch.add(spec.plinth, box(3.0, 0.34, spec.blockLen), [x + side * 1.5, 0.17, z]);

    /* Continuous neon strip above the shopfronts. Reads at any distance, colours the
     * wet ground, and costs one emissive quad per block side. */
    const stripCol = spec.accents[Math.floor(rnd() * spec.accents.length)];
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(spec.blockLen, 0.16),
      VH.Mat.neon(stripCol, 5.0));
    strip.position.set(x + side * 4.0, 4.35, z);
    strip.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    strip.matrixAutoUpdate = false; strip.updateMatrix();
    parent.add(strip);
    if (VH.Core.registerLight) {
      for (let k = 0; k < 2; k++) {
        VH.Core.registerLight(null, {
          pos: new THREE.Vector3(x + side * 3.4, 4.0, z - spec.blockLen * (0.25 + k * 0.5)),
          color: stripCol, intensity: 7.0, distance: 16, importance: 1.1, fog: true,
        });
      }
    }

    /* bollards */
    for (let i = 0; i < 4; i++) {
      const bz = z - spec.blockLen / 2 + (i + 0.5) * spec.blockLen / 4;
      batch.add('metalPanel', new THREE.CylinderGeometry(0.12, 0.14, 0.9, 8), [x + side * 0.4, 0.45, bz]);
    }

    /* dumpsters / crates / jersey barriers — these are also the cover system */
    const nProps = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < nProps; i++) {
      const pz = z - spec.blockLen / 2 + rnd() * spec.blockLen;
      const px = x + side * (2.2 + rnd() * 1.6);
      const kind = rnd();
      if (kind < 0.4) {
        batch.add('metalRust', box(2.0, 1.25, 1.1), [px, 0.62, pz], [0, (rnd() - 0.5) * 0.4, 0]);
        addCollider(world.colliders, px, 0.62, pz, 1.0, 0.63, 0.55);
        cover.push({ pos: new THREE.Vector3(px, 0, pz), normal: new THREE.Vector3(-side, 0, 0), h: 1.25 });
      } else if (kind < 0.75) {
        const n = 1 + Math.floor(rnd() * 3);
        for (let k = 0; k < n; k++) {
          const s = 0.7 + rnd() * 0.35;
          batch.add('metalPanel', box(s, s, s), [px + (rnd() - 0.5), s / 2 + k * s, pz + (rnd() - 0.5)], [0, rnd() * 1.5, 0]);
        }
        addCollider(world.colliders, px, 0.5, pz, 0.8, 0.6, 0.8);
        cover.push({ pos: new THREE.Vector3(px, 0, pz), normal: new THREE.Vector3(-side, 0, 0), h: 1.0 });
      } else {
        batch.add('concreteStain', box(1.9, 1.0, 0.7), [px, 0.5, pz], [0, (rnd() - 0.5) * 0.3, 0]);
        addCollider(world.colliders, px, 0.5, pz, 0.95, 0.5, 0.35);
        cover.push({ pos: new THREE.Vector3(px, 0, pz), normal: new THREE.Vector3(-side, 0, 0), h: 1.0 });
      }
    }

    /* awnings over the shopfronts */
    if (rnd() < spec.awnings) {
      const az = z + (rnd() - 0.5) * spec.blockLen * 0.5;
      batch.add('fabricDark', box(3.4, 0.1, 1.9), [x + side * 3.0, 3.1, az], [side * 0.22, 0, 0]);
      batch.add('metalPanel', box(0.07, 0.9, 0.07), [x + side * 4.4, 2.6, az - 0.8]);
      batch.add('metalPanel', box(0.07, 0.9, 0.07), [x + side * 4.4, 2.6, az + 0.8]);
    }

    /* pipes running along the facade */
    const py = 1.2 + rnd() * 6;
    batch.add('metalRust', new THREE.CylinderGeometry(0.11, 0.11, spec.blockLen, 7),
      [x + side * 0.7, py, z], [Math.PI / 2, 0, 0]);
  }

  /* Cables strung across the street. Catenary curves — straight lines look wrong. */
  function cables(parent, spec, rnd, zc) {
    const half = spec.streetW / 2 + 3;
    const n = 2 + Math.floor(rnd() * 3);
    const geos = [];
    for (let i = 0; i < n; i++) {
      const y0 = 7 + rnd() * 9;
      const sag = 1.2 + rnd() * 2.4;
      const z = zc + (rnd() - 0.5) * spec.blockLen * 0.8;
      const pts = [];
      for (let k = 0; k <= 12; k++) {
        const t = k / 12;
        const x = U.lerp(-half, half, t);
        const y = y0 - Math.sin(t * Math.PI) * sag;
        pts.push(new THREE.Vector3(x, y, z + Math.sin(t * 3.1) * 0.3));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      geos.push(new THREE.TubeGeometry(curve, 14, 0.035, 4, false));
      /* a few hanging lamps on the wire */
      if (rnd() < 0.6) {
        const t = 0.3 + rnd() * 0.4;
        const p = curve.getPoint(t);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6),
          VH.Mat.neon(rnd() < 0.5 ? 0xffb340 : 0xffd9a8, 4.0));
        lamp.position.copy(p); lamp.position.y -= 0.25;
        lamp.matrixAutoUpdate = false; lamp.updateMatrix();
        parent.add(lamp);
        if (VH.Core.registerLight) VH.Core.registerLight(lamp, { color: 0xffb340, intensity: 7.0, distance: 15, fog: true });
      }
    }
    const merged = U.mergeGeometries(geos);
    geos.forEach(g => g.dispose());
    if (merged) {
      const m = new THREE.Mesh(merged, M('plasticBlack'));
      m.matrixAutoUpdate = false;
      parent.add(m);
    }
  }

  /* ------------------------------------------------------- distant silhouettes */
  function skyline(parent, spec, rnd) {
    const batch = Batch();
    const n = spec.towers;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.3;
      const dist = 150 + rnd() * 260;
      const x = Math.cos(a) * dist, z = Math.sin(a) * dist - 40;
      const w = 16 + rnd() * 34, d = 16 + rnd() * 34;
      const h = 50 + rnd() * 150;
      batch.add('concrete', box(w, h, d), [x, h / 2, z]);
      /* window grid — at this distance it is the only thing you see of them */
      const winTex = VH.Mat.tex('windows', { cols: 10, rows: 22, seed: (i * 31) | 0, darkChance: 0.62 });
      const wm = new THREE.MeshBasicMaterial({ map: winTex, toneMapped: true });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.86), wm);
      face.position.set(x, h * 0.48, z + d / 2 + 0.5);
      face.lookAt(0, h * 0.48, 0);
      face.position.set(x, h * 0.48, z);
      const dir = new THREE.Vector3(-x, 0, -z).normalize();
      face.position.addScaledVector(dir, -Math.max(w, d) / 2 - 0.5);
      face.matrixAutoUpdate = false; face.updateMatrix();
      parent.add(face);
      /* aircraft warning light */
      if (rnd() < 0.5) {
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.9, 6, 5), VH.Mat.neon(0xff3320, 5));
        l.position.set(x, h + 1.5, z);
        l.matrixAutoUpdate = false; l.updateMatrix();
        parent.add(l);
      }
    }
    batch.flush(parent);
  }

  /* ------------------------------------------------------------------- rain */
  function makeRain(parent, spec) {
    const N = 2600;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const len = new Float32Array(N);
    const r = U.rng(9);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (r() - 0.5) * 90;
      pos[i * 3 + 1] = r() * 40;
      pos[i * 3 + 2] = (r() - 0.5) * 130;
      len[i] = 0.5 + r() * 1.4;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('alen', new THREE.BufferAttribute(len, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: [
        'attribute float alen; uniform float uTime; uniform vec3 uCam; varying float vA;',
        'void main(){',
        '  vec3 p = position;',
        '  p.y = mod(p.y - uTime*22.0, 40.0);',
        '  p.x += sin(uTime*0.3)*1.5;',
        /* keep the rain volume centred on the camera */
        '  p.x += floor(uCam.x/90.0+0.5)*90.0;',
        '  p.z += floor(uCam.z/130.0+0.5)*130.0;',
        '  vec4 mv = modelViewMatrix * vec4(p,1.0);',
        '  vA = alen;',
        '  gl_Position = projectionMatrix * mv;',
        '  gl_PointSize = max(1.0, 2.2 * (30.0/max(1.0,-mv.z)));',
        '}',
      ].join('\n'),
      fragmentShader: [
        'varying float vA;',
        'void main(){',
        '  vec2 c = gl_PointCoord - 0.5;',
        '  float a = smoothstep(0.5, 0.0, length(c)) * 0.30;',
        '  gl_FragColor = vec4(vec3(0.55,0.68,0.80)*a, a);',
        '}',
      ].join('\n'),
    });
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false;
    parent.add(pts);
    return { pts: pts, mat: mat };
  }

  /* --------------------------------------------------------------- generator */
  function build(seed, districtId) {
    const id = DISTRICTS[districtId] ? districtId : 'undertide';
    const spec = DISTRICTS[id];
    const rnd = U.rng((seed || 20770) + id.length * 7919);

    const group = new THREE.Group();
    const colliders = [];
    const cover = [];
    const enemySpawns = [];
    flickers = []; steamPuffs = [];

    world = {
      group: group, colliders: colliders, lights: [], district: id, spec: spec,
      navSample: navSample, spawns: { player: new THREE.Vector3(), enemy: enemySpawns, cover: cover },
      bounds: new THREE.Box3(),
    };

    const batch = Batch();
    const totalLen = spec.blockLen * spec.blocks;
    const halfW = spec.streetW / 2;

    /* ---- ground ------------------------------------------------------- */
    const groundGeo = new THREE.PlaneGeometry(320, 420, 1, 1);
    const ground = new THREE.Mesh(groundGeo, M(spec.ground));
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -totalLen / 2 + spec.blockLen;
    ground.matrixAutoUpdate = false; ground.updateMatrix();
    group.add(ground);

    /* sidewalks, raised */
    for (const side of [-1, 1]) {
      batch.add(spec.plinth, box(6, 0.34, totalLen + 60), [side * (halfW + 3), 0.17, -totalLen / 2 + spec.blockLen]);
    }

    /* ---- flooding (Undertide) ------------------------------------------ */
    if (spec.flooded > 0) {
      const wGeo = new THREE.PlaneGeometry(spec.streetW + 2, totalLen + 40, 24, 60);
      water = new THREE.Mesh(wGeo, M('water'));
      water.rotation.x = -Math.PI / 2;
      water.position.set(0, 0.06, -totalLen / 2 + spec.blockLen);
      group.add(water);
      water.userData.base = wGeo.attributes.position.array.slice();
    } else water = null;

    /* ---- buildings both sides ------------------------------------------ */
    for (let b = 0; b < spec.blocks; b++) {
      const zc = -b * spec.blockLen;
      for (const side of [-1, 1]) {
        /* two buildings per block per side, varied width */
        let used = 0;
        while (used < spec.blockLen - 4) {
          const w = 8 + rnd() * 12;
          const d = 10 + rnd() * 10;
          const h = spec.hMin + rnd() * (spec.hMax - spec.hMin);
          const z = zc - spec.blockLen / 2 + used + w / 2;
          const x = side * (halfW + 6 + d / 2);
          buildFacade(batch, group, spec, rnd, x, z, d, w, h, -side);
          addCollider(colliders, x, h / 2, z, d / 2, h / 2, w / 2);
          used += w + 1.5 + rnd() * 2.5;

          /* signage on the street-facing edge */
          if (rnd() < 0.92) {
            const text = spec.signs[Math.floor(rnd() * spec.signs.length)];
            const col = spec.accents[Math.floor(rnd() * spec.accents.length)];
            const sx = side * (halfW + 4.4);
            bladeSign(group, batch, text, sx, 7 + rnd() * 7, z, side > 0 ? -Math.PI / 2 : Math.PI / 2, col, (rnd() * 1000) | 0);
          }
          /* small horizontal shop sign at street level */
          if (rnd() < 1.0) {
            const text = spec.signs[Math.floor(rnd() * spec.signs.length)];
            const col = spec.accents[Math.floor(rnd() * spec.accents.length)];
            const s = makeSignMesh(text, { color: col, size: 0.95, seed: (rnd() * 1000) | 0, style: rnd() < 0.3 ? 'matrix' : 'tube' });
            s.position.set(side * (halfW + 5.6), 3.9, z);
            s.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
            group.add(s);
            if (VH.Core.registerLight) {
              VH.Core.registerLight(null, {
                pos: new THREE.Vector3(side * (halfW + 4.2), 3.6, z),
                color: col, intensity: 9.0, distance: 18, importance: 1.4, fog: true,
              });
            }
          }
        }
        streetProps(batch, group, spec, rnd, side * halfW, zc, side, cover);

        /* Sodium street lamp. The road is the second-brightest surface in a wet
         * night street — without a ground-level source the asphalt has nothing to
         * mirror and the whole frame dies from the bottom up. */
        for (const lfrac of [0.15, 0.62]) {
        const lz = zc - spec.blockLen * lfrac;
        const lx = side * (halfW + 1.2);
        batch.add('metalPanel', new THREE.CylinderGeometry(0.09, 0.13, 7.2, 8), [lx, 3.6, lz]);
        batch.add('metalPanel', box(2.2, 0.12, 0.14), [lx - side * 1.1, 7.15, lz]);
        const LAMPCOLS = [0xffb340, 0xffb340, 0xbfe4ff, 0x00e5ff, 0xff2d6f];
        const lampCol = LAMPCOLS[Math.floor(rnd() * LAMPCOLS.length)];
        const head = new THREE.Mesh(box(0.75, 0.22, 0.42), VH.Mat.neon(lampCol, 5.5));
        head.position.set(lx - side * 2.0, 7.0, lz);
        head.matrixAutoUpdate = false; head.updateMatrix();
        group.add(head);
        if (VH.Core.registerLight) {
          VH.Core.registerLight(null, {
            pos: new THREE.Vector3(lx - side * 2.0, 6.6, lz),
            color: lampCol, intensity: 22.0, distance: 26, importance: 3.0, fog: true, fogGain: 1.0,
          });
        }
        }
      }
      cables(group, spec, rnd, zc);

      /* enemy spawn points down the street */
      enemySpawns.push(new THREE.Vector3((rnd() - 0.5) * spec.streetW * 0.7, 0, zc - spec.blockLen * 0.3));
      enemySpawns.push(new THREE.Vector3((rnd() - 0.5) * spec.streetW * 0.7, 0, zc - spec.blockLen * 0.7));
    }

    /* ---- foreground occluder: a pipe / sign arm cutting the frame ------- */
    batch.add('metalRust', new THREE.CylinderGeometry(0.22, 0.22, spec.streetW + 14, 8),
      [0, 9.4, 4], [0, 0, Math.PI / 2]);

    /* ---- steam from grates --------------------------------------------- */
    for (let i = 0; i < 7; i++) {
      const sx = (rnd() - 0.5) * spec.streetW * 0.8;
      const sz = -rnd() * totalLen;
      batch.add('metalPanel', box(1.4, 0.06, 1.4), [sx, 0.04, sz]);
      const puff = makeSteam(sx, sz);
      group.add(puff.mesh);
      steamPuffs.push(puff);
    }

    batch.flush(group);
    skyline(group, spec, rnd);
    rain = makeRain(group, spec);

    /* ---- spawns + bounds ------------------------------------------------ */
    /* inside the first lit block, facing down the canyon — not behind it */
    world.spawns.player.set(0, 0, -spec.blockLen * 0.45);
    world.bounds.set(
      new THREE.Vector3(-halfW - 30, 0, -totalLen - 20),
      new THREE.Vector3(halfW + 30, 80, spec.blockLen + 20)
    );
    /* street walls so the player cannot walk into the buildings sideways */
    addCollider(colliders, -halfW - 20, 20, -totalLen / 2, 14, 20, totalLen);
    addCollider(colliders, halfW + 20, 20, -totalLen / 2, 14, 20, totalLen);

    /* hand the grade over to Core so fog matches the district */
    if (VH.Core.grade && spec.fogColor) {
      VH.Core.grade.fogColor = spec.fogColor.slice();
      VH.Core.grade.fogDensity = spec.fogDensity;
    }

    T = 0;
    return world;
  }

  /* ------------------------------------------------------------------ steam */
  function makeSteam(x, z) {
    const N = 26;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), ph = new Float32Array(N), sc = new Float32Array(N);
    const r = U.rng((x * 31 + z * 17) | 0 || 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (r() - 0.5) * 1.2; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = (r() - 0.5) * 1.2;
      ph[i] = r(); sc[i] = 1.4 + r() * 2.6;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aph', new THREE.BufferAttribute(ph, 1));
    g.setAttribute('asc', new THREE.BufferAttribute(sc, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
      vertexShader: [
        'attribute float aph; attribute float asc; uniform float uTime; varying float vF;',
        'void main(){',
        '  float t = fract(aph + uTime*0.13);',
        '  vec3 p = position;',
        '  p.y += t*5.0;',
        '  p.x += sin(t*3.0 + aph*6.28)*0.9*t;',
        '  p.z += cos(t*2.4 + aph*6.28)*0.7*t;',
        '  vF = (1.0-t)*smoothstep(0.0,0.15,t);',
        '  vec4 mv = modelViewMatrix * vec4(p,1.0);',
        '  gl_Position = projectionMatrix * mv;',
        '  gl_PointSize = asc * (1.0+t*3.0) * (260.0/max(1.0,-mv.z));',
        '}',
      ].join('\n'),
      fragmentShader: [
        'varying float vF;',
        'void main(){',
        '  vec2 c = gl_PointCoord-0.5;',
        '  float a = smoothstep(0.5,0.05,length(c)) * vF * 0.13;',
        '  gl_FragColor = vec4(vec3(0.62,0.70,0.76), a);',
        '}',
      ].join('\n'),
    });
    const mesh = new THREE.Points(g, mat);
    mesh.position.set(x, 0.1, z);
    mesh.frustumCulled = false;
    return { mesh: mesh, mat: mat };
  }

  /* ------------------------------------------------------------------ queries */
  function navSample(x, z) {
    if (!world) return { y: 0, walkable: true };
    const halfW = world.spec.streetW / 2;
    /* raised sidewalks either side of the roadway */
    if (Math.abs(x) > halfW && Math.abs(x) < halfW + 6) return { y: 0.34, walkable: true };
    if (Math.abs(x) >= halfW + 6) return { y: 0.34, walkable: false };
    return { y: 0, walkable: true };
  }
  function raycastGround(x, z) { return navSample(x, z).y; }
  function segments() { return Object.keys(DISTRICTS); }

  /* ------------------------------------------------------------------ update */
  function update(dt) {
    if (!world) return;
    T += dt;
    if (rain) {
      rain.mat.uniforms.uTime.value = T;
      if (VH.Core.camera) rain.mat.uniforms.uCam.value.copy(VH.Core.camera.position);
    }
    for (const s of steamPuffs) s.mat.uniforms.uTime.value = T;

    /* sign flicker — a dead tube and a failing ballast are free storytelling */
    for (const f of flickers) {
      if (!f.mat) continue;
      if (f.dead) { f.mat.opacity = 0.06 + Math.max(0, Math.sin(T * 9 + f.seed)) * 0.1; continue; }
      const n = U.noise2D(T * f.rate + f.seed, f.seed * 0.3);
      f.mat.opacity = n > -0.72 ? 1 : 0.25 + Math.random() * 0.4;
    }

    /* water ripples */
    if (water) {
      const pos = water.geometry.attributes.position;
      const base = water.userData.base;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1];
        pos.array[i * 3 + 2] = Math.sin(x * 0.7 + T * 1.3) * 0.035 + Math.sin(y * 0.9 - T * 0.9) * 0.03;
      }
      pos.needsUpdate = true;
    }
  }

  /* ------------------------------------------------------------- world test */
  const CAMS = {
    street: { pos: [0.5, 1.7, 9], look: [-0.5, 3.0, -34] },
    low: { pos: [3.2, 0.5, 4], look: [-1.5, 6.0, -34] },
    wide: { pos: [14, 8, 30], look: [0, 8, -46] },
    up: { pos: [0, 1.3, 8], look: [2, 22, -18] },
  };
  function testUpdate() {
    const c = CAMS[VH.q.cam || 'street'] || CAMS.street;
    const t = VH.Core.camTarget;
    t.pos.set(c.pos[0], c.pos[1], c.pos[2]);
    t.look.set(c.look[0], c.look[1], c.look[2]);
    t.fov = +(VH.q.fov || 52);
  }
  if (VH.q.worldtest) {
    VH.on('worldtest', testUpdate);
  }

  return {
    build: build, update: function (dt) { update(dt); if (VH.q.worldtest) testUpdate(); },
    raycastGround: raycastGround, navSample: navSample, segments: segments,
    districts: DISTRICTS,
    get current() { return world; },
  };
})();
