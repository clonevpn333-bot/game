/* ============================================================
 * THUNDERDROP — battle royale mode.
 * 1.6km map with named POIs, 50 combatants (player + 49 bots in
 * three LOD tiers), aircraft drop, loot rarities, shrinking storm,
 * drivable cars, golden-hour → dusk lighting, kill feed, placement.
 * ============================================================ */
RT.br = (() => {
  const BR = {};
  BR.active = false;
  let phase = 'idle';   // fly | drop | chute | play | drive | spectate | end
  let bots = [], lootItems = [], vehicles = [], curVehicle = null;
  let matchT = 0, alive = 50, planeT = 0, atmoT = 0, encounterT = 6, uiT = 0;
  let stats = { kills: 0, dmg: 0 };
  let killer = null, specT = 0;
  let storm, nextRing, minimap, feedEl, leftEl, stormTimerEl;
  let deployed = false, fallV = 0;
  const rigPool = [];
  let inv = { medkits: 0, armor: 0 };
  let medCast = -1;

  const POIS = [
    { name: 'THUNDER CITY', x: 0, z: -140, r: 130 },
    { name: 'RIDGEWOOD', x: -430, z: 290, r: 150 },
    { name: 'MILLTOWN', x: 420, z: 330, r: 110 },
    { name: 'GRAINFIELD', x: 450, z: -380, r: 130 },
    { name: 'THE DAM', x: -480, z: -330, r: 120 },
    { name: 'FORT VELKAN', x: -80, z: 560, r: 110 },
  ];
  const BOT_NAMES = ['Vex', 'Karg', 'Onyx', 'Piper', 'Slate', 'Moss', 'Drift', 'Havoc', 'Juno', 'Kilo',
    'Lark', 'Mako', 'Nix', 'Oxide', 'Pike', 'Quill', 'Rook', 'Saber', 'Tarn', 'Umber',
    'Viper', 'Wren', 'Xeno', 'Yara', 'Zephyr', 'Ash', 'Bolt', 'Cinder', 'Dune', 'Ember',
    'Flint', 'Gale', 'Hollow', 'Iris', 'Jet', 'Krait', 'Lynx', 'Mirage', 'Noir', 'Orca',
    'Pyre', 'Quarry', 'Ridge2', 'Storm', 'Talon', 'Ursa', 'Volt', 'Wisp', 'Zinc'];

  /* ---------------- map ---------------- */
  function buildBRMap() {
    const def = {
      id: 99, title: 'THUNDERDROP', stealth: false,
      atmosphere: goldenAtmo(0),
      ambient: 'birds', weather: null,
      terrain: {
        size: 1600, segs: 256, seed: 404, amp: 15, rim: 26,
        palette: { lush: 0x5f6c39, lush2: 0x73793f, dirt: 0x7a684b, rock: 0x767261, road: 0x6b6152 },
        flats: POIS.map(p => ({ x: p.x, z: p.z, r: p.r * 0.85 })),
        roads: [
          [[0, -140], [200, -260], [450, -380]], [[0, -140], [-240, -240], [-480, -330]],
          [[0, -140], [0, 100], [-200, 220], [-430, 290]], [[0, 100], [200, 220], [420, 330]],
          [[0, 100], [-40, 340], [-80, 560]], [[450, -380], [520, -40], [420, 330]],
        ],
        riverPath: [[-800, 120], [-430, 200], [-160, 420], [200, 560], [800, 620]], riverWidth: 22, riverDepth: 6,
        craters: [],
      },
      buildMap(B) {
        const P = RT.props;
        /* --- THUNDER CITY: dense downtown block --- */
        const C = POIS[0];
        const blocks = [
          [-45, -70, 12, 10, 12], [10, -80, 14, 11, 15], [55, -60, 11, 9, 9], [-70, -130, 13, 10, 18],
          [-15, -150, 12, 9, 12], [40, -140, 14, 10, 15], [-45, -200, 11, 9, 9], [15, -210, 13, 10, 12],
          [70, -190, 12, 9, 15], [-90, -170, 10, 8, 9],
        ];
        blocks.forEach(([bx, bz, w, d, h], i) =>
          P.ruinBlock(B, { x: C.x + bx, z: C.z + bz + 140, ry: (i % 4) * 0.02, w, d, h, seed: 900 + i, damage: i % 3 === 0 ? 1 : 0, noRoof: false }));
        P.house(B, { x: C.x - 20, z: C.z + 40, ry: 0.02, w: 9, d: 8, floors: 2, seed: 950, front: 'S', porch: false });
        P.house(B, { x: C.x + 30, z: C.z + 30, ry: -1.55, w: 9, d: 7.5, floors: 2, seed: 951, front: 'S', porch: false });
        for (const [lx, lz] of [[-30, -20], [20, -35], [-5, 20], [45, -5], [-55, -45]]) P.lamp(B, C.x + lx, C.z + lz, {});
        P.husk(B, C.x + 5, C.z - 10, 0.6);
        P.rubble(B, { x: C.x - 35, z: C.z + 5, r: 2.5, seed: 61 });
        P.crate(B, C.x + 18, C.z + 8, { stack: true });
        /* --- RIDGEWOOD: forest + ranger tower + cabins + creek --- */
        const F = POIS[1];
        for (let i = 0; i < 60; i++) {
          const a = (i / 60) * TAU, r = 20 + (i * 37 % 110);
          P.tree(B, F.x + Math.cos(a * 3.7) * r, F.z + Math.sin(a * 2.3) * r, { s: 1 + (i % 5) * 0.16 });
        }
        watchtower(B, F.x, F.z - 30);
        P.house(B, { x: F.x - 60, z: F.z + 40, ry: 0.4, w: 7, d: 6, seed: 960, wallC: 0x6b4d33, porch: true });
        P.house(B, { x: F.x + 70, z: F.z + 60, ry: -0.8, w: 7.5, d: 6, seed: 961, wallC: 0x5e4630 });
        /* --- MILLTOWN: village + church focal --- */
        const M = POIS[2];
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * TAU;
          P.house(B, { x: M.x + Math.cos(a) * 52, z: M.z + Math.sin(a) * 48, ry: -a + Math.PI / 2, w: 8, d: 7, seed: 970 + i, floors: i % 3 === 0 ? 2 : 1, damage: i % 4 === 0 ? 1 : 0 });
        }
        church(B, M.x, M.z);
        P.well(B, M.x + 18, M.z + 8);
        /* --- GRAINFIELD: barns + silo + bales --- */
        const G2 = POIS[3];
        P.barn(B, { x: G2.x - 30, z: G2.z, ry: 0.2 });
        P.barn(B, { x: G2.x + 55, z: G2.z + 45, ry: 1.8 });
        silo(B, G2.x + 15, G2.z - 35);
        P.house(B, { x: G2.x - 60, z: G2.z + 60, ry: 0.5, w: 9, d: 7.5, floors: 2, seed: 980 });
        for (let i = 0; i < 14; i++) P.hayBale(B, { x: G2.x - 90 + (i % 5) * 38, z: G2.z - 80 + ((i / 5) | 0) * 44, ry: i });
        P.fence(B, G2.x - 100, G2.z - 60, G2.x + 40, G2.z - 66, { broken: true, gapAt: 0.5 });
        /* --- THE DAM --- */
        const D = POIS[4];
        P.stoneWall(B, D.x - 70, D.z, D.x + 70, D.z, 10, {});
        B.platform(D.x - 70, D.z - 2.4, D.x + 70, D.z + 2.4, B.h(D.x, D.z) + 10.6);
        P.house(B, { x: D.x + 40, z: D.z + 30, ry: 0, w: 8, d: 7, seed: 990, wallC: 0x8d8578, roof: 'flat', porch: false });
        waterPlane(B, D.x, D.z - 90, 260, 150);
        /* --- FORT VELKAN --- */
        const V = POIS[5];
        const H = 4.2;
        P.stoneWall(B, V.x - 40, V.z - 40, V.x + 12, V.z - 40, H);
        P.stoneWall(B, V.x + 24, V.z - 40, V.x + 40, V.z - 40, H);
        P.stoneWall(B, V.x - 40, V.z - 40, V.x - 40, V.z + 40, H);
        P.stoneWall(B, V.x + 40, V.z - 40, V.x + 40, V.z + 40, H);
        P.stoneWall(B, V.x - 40, V.z + 40, V.x + 40, V.z + 40, H);
        P.bunker(B, { x: V.x, z: V.z + 20, ry: 0 });
        P.ruinBlock(B, { x: V.x - 22, z: V.z - 12, ry: 0, w: 11, d: 8, h: 6, seed: 995 });
        watchtower(B, V.x + 28, V.z - 20);
        P.mgNest(B, V.x + 16, V.z - 36, Math.PI);
        /* --- connective tissue --- */
        gasStation(B, 210, -20);
        /* explosive barrels + breakable windows around the POIs (loot-and-destroy flavour) */
        for (const [bx, bz] of [[C.x - 8, C.z + 148], [C.x + 22, C.z + 138], [210, -14], [G2.x - 26, G2.z + 4], [M.x + 6, M.z + 12], [V.x + 6, V.z + 16]])
          P.explosiveBarrel(B, bx, bz, {});
        for (const [wx, wz, wry] of [[C.x - 18, C.z + 132, 0], [C.x + 34, C.z + 132, 0], [208, -12, Math.PI / 2], [M.x - 4, M.z + 20, 0]])
          P.window(B, wx, B.h(wx, wz) + 1.5, wz, wry, 1.7, 1.4, {});
        P.house(B, { x: -180, z: 40, ry: 0.3, w: 8, d: 7, seed: 800 });   // lone houses
        P.house(B, { x: 230, z: 180, ry: -0.5, w: 8, d: 7, seed: 801 });
        P.house(B, { x: -260, z: -120, ry: 1.2, w: 7.5, d: 6.5, seed: 802, damage: 1 });
        radioMast(B, 140, 420);
        for (const p of POIS) P.sign(B, p.x + p.r * 0.7, p.z + p.r * 0.7, 0.4);
        for (const [hx, hz] of [[100, -300], [-150, -250], [300, 100], [-320, 80], [150, 300]]) {
          P.husk(B, hx, hz, hx * 0.01);
          P.crate(B, hx + 6, hz + 4, {});
        }
        P.edgeForest(B, 110, 690, 780, {});
        for (const [cx, cz] of [[-200, 150], [250, -180], [120, 200], [-350, -100], [340, -150], [-100, 350]]) P.copse(B, cx, cz, 5, 14);
        P.scatterGrass(B, 9000, 760, 0x5f6c39);
        P.scatterRocks(B, 260, 770);
        return { playerSpawn: { x: 0, z: 0, ry: 0 }, squad: [], enemies: [] };
      },
    };
    RT.engine.clearWorld();
    RT.ai.reset();
    RT.missions._brDef = def;
    RT.engine.setAtmosphere(def.atmosphere);
    const terrain = new RT.Terrain(def.terrain);
    const B = new RT.MapBuilder(terrain, 404);
    RT.map = B; RT.map.def = def;
    const info = def.buildMap(B);
    RT.engine.world.add(B.finalize());
    RT.map.info = info;
    RT.engine.setWeather(null);
  }

  /* --- BR-only props --- */
  function watchtower(B, x, z) {
    const G = RT.G, gy = B.h(x, z);
    const g = [];
    for (const [sx, sz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]])
      g.push(G.box(0.18, 7, 0.18, 0x5a4a38, { x: x + sx, y: gy + 3.5, z: z + sz, vary: 0.12 }));
    g.push(G.box(3.6, 0.22, 3.6, 0x6b5a42, { x, y: gy + 7, z, vary: 0.1 }));
    for (const s of [-1, 1]) {
      g.push(G.box(3.6, 0.8, 0.12, 0x5e4c38, { x, y: gy + 7.6, z: z + s * 1.74 }));
      g.push(G.box(0.12, 0.8, 3.6, 0x5e4c38, { x: x + s * 1.74, y: gy + 7.6, z }));
    }
    g.push(G.wedge(4.4, 1.4, 4.4, 0x53422f, { x, y: gy + 8.6, z }));
    for (let i = 0; i < 8; i++) g.push(G.box(0.5, 0.06, 0.06, 0x4a3c2c, { x: x + 1.35, y: gy + 0.6 + i * 0.85, z: z + 0.4 }));
    B.buckets.std.push(...g);
    B.collide(x, gy + 3.5, z, 2.6, 7, 2.6);
    B.platform(x - 1.7, z - 1.7, x + 1.7, z + 1.7, gy + 7.12);
    B.addCover(x, z, 0, 1, false);
  }
  function silo(B, x, z) {
    const G = RT.G, gy = B.h(x, z);
    B.buckets.std.push(
      G.cyl(3.2, 3.2, 12, 16, 0x8d8578, { x, y: gy + 6, z, vary: 0.1 }),
      G.cone(3.5, 2.6, 16, 0x6e6152, { x, y: gy + 13.2, z }),
      G.cyl(0.2, 0.2, 12, 6, 0x4a4238, { x: x + 3.35, y: gy + 6, z }));
    for (let i = 0; i < 11; i++) B.buckets.std.push(G.box(0.5, 0.06, 0.06, 0x4a3c2c, { x: x + 3.35, y: gy + 0.8 + i * 1.0, z: z + 0.3 }));
    B.collide(x, gy + 6, z, 6.6, 12, 6.6);
    B.platform(x - 1.4, z - 1.4, x + 1.4, z + 1.4, gy + 12.1);
  }
  function church(B, x, z) {
    const P = RT.props;
    P.house(B, { x, z, ry: 0, w: 10, d: 14, floors: 1, seed: 999, wallC: 0xb8ab98, roofC: 0x4a4540, porch: false });
    const G = RT.G, gy = B.h(x, z);
    B.buckets.std.push(
      G.box(2.6, 9, 2.6, 0xb0a390, { x, y: gy + 4.5, z: z - 8.6, vary: 0.08 }),
      G.cone(2.2, 3.2, 8, 0x4a4540, { x, y: gy + 10.6, z: z - 8.6 }),
      G.box(0.24, 1.6, 0.24, 0x8a8072, { x, y: gy + 12.6, z: z - 8.6 }),
      G.box(1.0, 0.24, 0.24, 0x8a8072, { x, y: gy + 12.9, z: z - 8.6 }));
    B.collide(x, gy + 4.5, z - 8.6, 2.8, 9, 2.8);
  }
  function gasStation(B, x, z) {
    const P = RT.props, G = RT.G, gy = B.h(x, z);
    P.house(B, { x, z, ry: 0, w: 8, d: 6, floors: 1, seed: 810, roof: 'flat', porch: false });
    B.buckets.std.push(G.box(9, 0.3, 6, 0x8d8578, { x: x, y: gy + 4, z: z + 9 }));
    for (const px of [-3, 3]) B.buckets.std.push(G.box(0.3, 4, 0.3, 0x6e6152, { x: x + px, y: gy + 2, z: z + 9 }));
    for (const px of [-1.5, 1.5]) {
      B.buckets.std.push(G.cbox(0.7, 1.2, 0.5, 0.06, 0x8a4a38, { x: x + px, y: gy + 0.6, z: z + 9, vary: 0.1 }));
      B.collide(x + px, gy + 0.6, z + 9, 0.8, 1.2, 0.6);
    }
  }
  function radioMast(B, x, z) {
    const G = RT.G, gy = B.h(x, z);
    for (let i = 0; i < 6; i++) {
      const w = 2.2 - i * 0.3;
      B.buckets.std.push(G.box(w, 5, w, 0x3a3d40, { x, y: gy + 2.5 + i * 5, z, vary: 0.1 }));
    }
    B.buckets.std.push(G.box(0.15, 3, 0.15, 0x8a2a20, { x, y: gy + 31, z }));
    B.collide(x, gy + 15, z, 2.4, 30, 2.4);
  }
  function waterPlane(B, x, z, w, d) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ color: 0x2a4a5a, transparent: true, opacity: 0.82, roughness: 0.15, metalness: 0.4 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, B.h(x, z) - 1.2, z);
    B.group.add(m);
  }

  /* ---------------- golden hour → dusk atmosphere ---------------- */
  function goldenAtmo(t) { // t: 0 golden → 1 dusk
    const mix = (a, b) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
    return {
      top: mix(0x3d5a82, 0x151a2e), horizon: mix(0xe8a860, 0x54365a), ground: mix(0x54483a, 0x1a1820),
      sunDir: new THREE.Vector3(-0.72, lerp(0.24, 0.05, t), -0.42),
      sunColor: mix(0xffc070, 0xd06a4a), sunIntensity: lerp(1.9, 0.85, t),
      sunDiscColor: mix(0xffe0b0, 0xff9a70), sunGlow: lerp(0.4, 0.55, t),
      hemiSky: mix(0xc7a578, 0x3d4468), hemiGround: mix(0x4a4238, 0x1c1a22), hemiIntensity: lerp(0.52, 0.4, t),
      fogColor: mix(0xdba86e, 0x2c2438), fogDensity: lerp(0.0022, 0.0034, t),
      exposure: lerp(1.02, 0.94, t), fillIntensity: 0.12,
    };
  }

  /* ---------------- storm wall ---------------- */
  function buildStorm() {
    const tex = RT.canvasTex(256, (ctx, s) => {
      ctx.fillStyle = 'rgba(80,60,160,0.5)'; ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 60; i++) {
        ctx.strokeStyle = `rgba(${150 + Math.random() * 105 | 0},${120 + Math.random() * 80 | 0},255,${0.2 + Math.random() * 0.5})`;
        ctx.lineWidth = 1 + Math.random() * 2.5;
        const x = Math.random() * s;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (Math.random() - 0.5) * 40, s); ctx.stroke();
      }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(30, 1.2);
    const geo = new THREE.CylinderGeometry(1, 1, 260, 64, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false, color: 0x7a5aff,
    });
    storm = new THREE.Mesh(geo, mat);
    storm.position.y = 100;
    storm.renderOrder = 8;
    RT.engine.scene.add(storm);
    /* next-circle ring: thin white torus laid flat */
    nextRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.002, 6, 96),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, fog: false, depthWrite: false }));
    nextRing.rotation.x = Math.PI / 2;
    nextRing.renderOrder = 7;
    RT.engine.scene.add(nextRing);
  }

  /* ---------------- circle phases ---------------- */
  const PHASES = [
    { wait: 42, shrink: 40, to: 480, dmg: 1 },
    { wait: 30, shrink: 34, to: 300, dmg: 2 },
    { wait: 26, shrink: 28, to: 180, dmg: 4 },
    { wait: 22, shrink: 24, to: 100, dmg: 7 },
    { wait: 18, shrink: 20, to: 45, dmg: 10 },
    { wait: 15, shrink: 24, to: 8, dmg: 14 },
  ];
  const circle = { cx: 0, cz: 0, r: 780, idx: 0, t: 0, shrinking: false, from: 780, tcx: 0, tcz: 0, tr: 480, fcx: 0, fcz: 0 };
  function rollNextCircle() {
    const ph = PHASES[circle.idx];
    circle.tr = ph.to;
    const maxOff = circle.r - ph.to;
    const a = Math.random() * TAU, rr = Math.random() * maxOff * 0.72;
    circle.tcx = clamp(circle.cx + Math.cos(a) * rr, -700 + ph.to, 700 - ph.to);
    circle.tcz = clamp(circle.cz + Math.sin(a) * rr, -700 + ph.to, 700 - ph.to);
  }
  function circleUpdate(dt) {
    circle.t -= dt;
    const ph = PHASES[circle.idx];
    if (!ph) return;
    if (!circle.shrinking && circle.t <= 0) {
      circle.shrinking = true;
      circle.t = ph.shrink;
      circle.from = circle.r; circle.fcx = circle.cx; circle.fcz = circle.cz;
      RT.ui.toast('STORM INCOMING', 'PHASE ' + (circle.idx + 1));
      if (RT.audio) RT.audio.thunder(0.2);
    } else if (circle.shrinking) {
      const k = 1 - clamp(circle.t / ph.shrink, 0, 1);
      circle.r = lerp(circle.from, circle.tr, k);
      circle.cx = lerp(circle.fcx, circle.tcx, k);
      circle.cz = lerp(circle.fcz, circle.tcz, k);
      if (circle.t <= 0) {
        circle.shrinking = false;
        circle.idx++;
        if (PHASES[circle.idx]) { circle.t = PHASES[circle.idx].wait; rollNextCircle(); RT.ui.toast('CIRCLE CLOSED', 'NEXT MARKED'); }
      }
    }
    /* visuals */
    storm.scale.set(circle.r, 1, circle.r);
    storm.position.x = circle.cx; storm.position.z = circle.cz;
    storm.material.map.offset.y -= dt * 0.25;
    storm.material.opacity = 0.42 + Math.sin(matchT * 2.2) * 0.08;
    nextRing.scale.set(circle.tr, circle.tr, 1);
    nextRing.position.set(circle.tcx, RT.map.terrain.heightAt(circle.tcx, circle.tcz) + 1.2, circle.tcz);
    /* player storm damage + fx */
    const p = RT.player.pos;
    const dToC = Math.hypot(p.x - circle.cx, p.z - circle.cz);
    const outside = dToC > circle.r;
    BR._stormT = (BR._stormT || 0) - dt;
    if (outside && phase !== 'fly' && phase !== 'drop' && phase !== 'chute' && !RT.player.dead) {
      if (BR._stormT <= 0) {
        BR._stormT = 1;
        RT.player.damage(ph.dmg, null);
        if (RT.audio) RT.audio.stormRumble(0.8);
      }
      RT.ui.pulseVignette(0.85);
    } else if (Math.abs(dToC - circle.r) < 22 && BR._stormT <= 0) {
      BR._stormT = 2.4;
      if (RT.audio) RT.audio.stormRumble(0.4);
    }
  }

  /* ---------------- loot ---------------- */
  const RARITY = [
    { name: 'Common', c: 0x9aa0a2, m: 0 }, { name: 'Uncommon', c: 0x5fbf5f, m: 1 },
    { name: 'Rare', c: 0x4a90e2, m: 2 }, { name: 'Epic', c: 0xa05ae8, m: 3 }, { name: 'Legendary', c: 0xe8a33d, m: 4 },
  ];
  function lootBeamMat(color) {
    return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  }
  function spawnLoot(x, z, forceKind) {
    const rnd = Math.random();
    const y = RT.map.groundAt(x, z, 999);
    const kind = forceKind || (rnd < 0.42 ? 'weapon' : rnd < 0.58 ? 'ammo' : rnd < 0.72 ? 'armor' : rnd < 0.88 ? 'medkit' : 'grenade');
    const rarity = Math.random() < 0.06 ? 4 : Math.random() < 0.16 ? 3 : Math.random() < 0.36 ? 2 : Math.random() < 0.64 ? 1 : 0;
    const grp = new THREE.Group();
    let label = '';
    const weaponId = ['m4', 'dmr', 'shotgun', 'pistol'][(Math.random() * 4) | 0];
    if (kind === 'weapon') {
      const m = RT.character.buildNPCRifle();
      m.scale.setScalar(0.85);
      m.rotation.z = Math.PI / 2 * 0.9;
      grp.add(m);
      label = RARITY[rarity].name + ' ' + RT.weapons.CFG[weaponId].name;
    } else {
      const col = kind === 'ammo' ? 0x8a7a52 : kind === 'armor' ? 0x4a90e2 : kind === 'medkit' ? 0xc94b3f : 0x3a4433;
      const box = RT.meshOf([RT.G.cbox(0.34, 0.24, 0.24, 0.03, col, { vary: 0.1 })], RT.MAT.std);
      grp.add(box);
      label = kind === 'ammo' ? 'Ammo Box' : kind === 'armor' ? 'Armor Plate' : kind === 'medkit' ? 'Medkit' : 'Frag Grenade';
    }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 3.2, 6, 1, true), lootBeamMat(RARITY[kind === 'weapon' ? rarity : 1].c));
    beam.position.y = 1.7;
    grp.add(beam);
    grp.position.set(x, y + 0.25, z);
    RT.engine.world.add(grp);
    const item = { kind, weaponId, rarity, grp, x, z, y, taken: false };
    lootItems.push(item);
    RT.map.interact.push({
      x, y: y + 1, z, r: 2.3, label: 'TAKE ' + label.toUpperCase(),
      fn: (it) => { pickupLoot(item); it.used = true; },
    });
    return item;
  }
  function pickupLoot(item) {
    if (item.taken) return;
    item.taken = true;
    RT.engine.world.remove(item.grp);
    if (item.kind === 'weapon') {
      const m = RARITY[item.rarity].m;
      RT.weapons.addWeapon(item.weaponId, { dmg: 1 + 0.08 * m, kick: 1 - 0.06 * m, mag: 1 + 0.12 * m });
      RT.ui.toastMsg(RARITY[item.rarity].name.toUpperCase() + ' ' + RT.weapons.CFG[item.weaponId].name);
    } else if (item.kind === 'ammo') { RT.weapons.giveAmmo(0.45); RT.ui.toastMsg('AMMO'); }
    else if (item.kind === 'armor') { inv.armor = Math.min(100, inv.armor + 50); RT.ui.toastMsg('ARMOR PLATE EQUIPPED'); refreshArmorBar(); }
    else if (item.kind === 'medkit') { inv.medkits++; RT.ui.toastMsg('MEDKIT (H TO USE) × ' + inv.medkits); }
    else { RT.player.grenades = Math.min(6, RT.player.grenades + 2); RT.ui.toastMsg('GRENADES +2'); }
    if (RT.hud) RT.hud.refreshAmmo();
    if (RT.audio) RT.audio.magIn();
  }
  function scatterLoot() {
    for (const p of POIS) {
      const n = 10 + ((p.r / 20) | 0);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, r = Math.random() * p.r * 0.8;
        spawnLoot(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r);
      }
    }
    for (let i = 0; i < 26; i++) spawnLoot((Math.random() - 0.5) * 1200, (Math.random() - 0.5) * 1200);
  }
  function refreshArmorBar() {
    const el2 = RT.$('hp-armor');
    if (!el2) return;
    el2.style.display = inv.armor > 0 ? 'flex' : 'none';
    el2.innerHTML = `<div style="width:${inv.armor * 2.2}px;height:5px;background:#4a90e2;box-shadow:0 0 5px rgba(74,144,226,.7)"></div>`;
  }

  /* ---------------- bots (3 LOD tiers) ---------------- */
  function makeImposter() {
    const g = RT.mergeGeos([
      RT.G.box(0.42, 0.62, 0.24, 0x3e4139, { y: 1.15 }),
      RT.G.box(0.3, 0.72, 0.26, 0x383b33, { y: 0.42 }),
      RT.G.sph(0.11, 6, 5, 0x8a6a4e, { y: 1.62 }),
    ]);
    return new THREE.Mesh(g, RT.MAT.std);
  }
  function spawnBots() {
    bots = [];
    for (let i = 0; i < 49; i++) {
      const pers = ['rusher', 'looter', 'camper'][i % 3];
      const poi = POIS[(Math.random() * POIS.length) | 0];
      const a = Math.random() * TAU, r = Math.random() * poi.r * 0.7;
      const bot = {
        id: i, name: BOT_NAMES[i], dead: false, hp: 100,
        x: poi.x + Math.cos(a) * r, z: poi.z + Math.sin(a) * r, y: 0,
        skill: 0.35 + Math.random() * 0.6,        // aim quality
        pers, state: 'loot', lootT: 4 + Math.random() * 14, fireT: Math.random(),
        target: null, tier: 2, rig: null, imposter: null,
        moveA: Math.random() * TAU, aiT: Math.random() * 0.2, weapon: 'rifle',
      };
      bot.y = RT.map.groundAt(bot.x, bot.z, 999);
      bot.imposter = makeImposter();
      bot.imposter.position.set(bot.x, bot.y, bot.z);
      RT.engine.world.add(bot.imposter);
      bots.push(bot);
    }
    alive = 50;
  }
  function botRigAcquire(bot) {
    if (bot.rig) return;
    let slot = rigPool.find(s => !s.user);
    if (!slot && rigPool.length < 14) {
      slot = { rig: RT.character.build({ faction: 'enemy', seed: 7000 + rigPool.length, rifle: true }), user: null };
      slot.rig.group.visible = false;
      RT.engine.world.add(slot.rig.group);
      rigPool.push(slot);
    }
    if (!slot) return;
    slot.user = bot;
    bot.rig = slot;
    slot.rig.group.visible = true;
  }
  function botRigRelease(bot) {
    if (!bot.rig) return;
    bot.rig.user = null;
    bot.rig.rig.group.visible = false;
    bot.rig = null;
  }
  BR.hittables = () => {
    const list = [];
    for (const b of bots) if (!b.dead && b.tier < 2) list.push(b);
    return list;
  };
  BR.damageBot = function (b, dmg, head, from) {
    if (b.dead) return false;
    b.hp -= dmg;
    stats.dmg += Math.min(dmg, b.hp + dmg);
    if (b.rig) { b.rig.rig.anim.flinch = 1; b.rig.rig.j.chest.rotation.x -= 0.12; }
    b.target = 'player';
    if (b.hp <= 0) {
      killBot(b, from === 'player' ? 'RIDGE (you)' : from);
      if (from === 'player') { stats.kills++; if (RT.game) { RT.game.stats.kills++; RT.game.killFx(head); } if (RT.progress) RT.progress.onKill(head, true); }
      return true;
    }
    return false;
  };
  /* splash damage to bots from grenades / explosive barrels */
  BR.blastBots = function (p, r, dmg) {
    for (const b of bots) {
      if (b.dead) continue;
      const dd = Math.hypot(b.x - p.x, (b.y + 1) - p.y, b.z - p.z);
      if (dd < r) BR.damageBot(b, dmg * (1 - dd / r), false, 'the storm');
    }
  };
  function killBot(b, byName) {
    if (b.dead) return;
    b.dead = true;
    alive--;
    if (b.rig) {
      b.rig.rig.anim.deathT = 0;
      b.rig.rig.anim.deathDir = Math.random() > 0.4 ? 1 : -1;
      const slot = b.rig;
      setTimeout(() => { if (slot.user === b) { slot.user = null; slot.rig.group.visible = false; } }, 4500);
      b.rig = null;
    }
    if (b.imposter) { RT.engine.world.remove(b.imposter); b.imposter = null; }
    feed(byName + ' ⟶ ' + b.name);
    /* drop a loot box where they fell */
    if (Math.random() < 0.7) spawnLoot(b.x, b.z, Math.random() < 0.5 ? 'weapon' : 'ammo');
  }
  function feed(text) {
    if (!feedEl) return;
    const row = RT.el('div', '', feedEl, text);
    row.style.cssText = 'font-size:11.5px;letter-spacing:.08em;color:#e8e4da;text-shadow:0 1px 3px #000;margin-bottom:3px;opacity:1;transition:opacity .6s';
    setTimeout(() => { row.style.opacity = 0; }, 4200);
    setTimeout(() => row.remove(), 5000);
    while (feedEl.children.length > 6) feedEl.firstChild.remove();
  }

  let fullAiCursor = 0;
  function botsUpdate(dt) {
    const p = RT.player.pos;
    /* tier assignment + far encounters */
    let fullBudget = 10;
    for (const b of bots) {
      if (b.dead) continue;
      const d = Math.hypot(b.x - p.x, b.z - p.z);
      b.tier = d < 80 ? 0 : d < 200 ? 1 : 2;
      if (b.tier === 0 && !b.rig) botRigAcquire(b);
      if (b.tier > 0 && b.rig && d > 100) botRigRelease(b);
      /* mesh LOD */
      if (b.imposter) {
        b.imposter.visible = b.tier > 0 && d < 340 && !b.rig;
        if (b.imposter.visible) { b.imposter.position.set(b.x, b.y, b.z); b.imposter.rotation.y = b.moveA; }
      }
      if (b.rig) {
        const r = b.rig.rig;
        r.group.position.set(b.x, b.y, b.z);
        r.group.rotation.y = b.faceA != null ? b.faceA : b.moveA;
        RT.character.pose(r, dt);
      }
    }
    /* staggered AI */
    const n = bots.length;
    for (let i = 0; i < n; i++) {
      const b = bots[(fullAiCursor + i) % n];
      if (b.dead) continue;
      if (b.tier === 0) {
        if (fullBudget-- <= 0) continue;
        botThink(b, dt, true);
      } else if (b.tier === 1) {
        b.aiT -= dt;
        if (b.aiT <= 0) { botThink(b, 0.2, false); b.aiT = 0.2; }
      } else {
        b.aiT -= dt;
        if (b.aiT <= 0) { botFar(b, 0.6); b.aiT = 0.6; }
      }
    }
    fullAiCursor = (fullAiCursor + 1) % n;
    /* abstract far-vs-far encounters keep the count shrinking */
    encounterT -= dt;
    if (encounterT <= 0) {
      encounterT = 5 + Math.random() * 4;
      const far = bots.filter(b => !b.dead && b.tier === 2);
      for (let i = 0; i + 1 < far.length; i += 2) {
        const a = far[i], c = far[i + 1];
        if (Math.hypot(a.x - c.x, a.z - c.z) < 70 && Math.random() < 0.5) {
          const winner = a.skill > c.skill === (Math.random() < 0.75) ? a : c;
          const loser = winner === a ? c : a;
          killBot(loser, winner.name);
          if (RT.audio && Math.random() < 0.6) RT.audio.enemyShot(Math.hypot(a.x - p.x, a.z - p.z));
          break;
        }
      }
    }
  }
  function botMove(b, tx, tz, speed, dt) {
    const dx = tx - b.x, dz = tz - b.z;
    const d = Math.hypot(dx, dz);
    if (d < 1.5) return true;
    let mx = dx / d, mz = dz / d;
    const probe = RT.map.raycast(b.x, b.y + 1, b.z, mx, 0, mz, 1.6);
    if (probe) { const nn = probe.normal; const side = ((mx * -nn.z) + (mz * nn.x)) >= 0 ? 1 : -1; mx = -nn.z * side; mz = nn.x * side; }
    b.x += mx * speed * dt; b.z += mz * speed * dt;
    b.y = damp(b.y, RT.map.groundAt(b.x, b.z, b.y + 0.6), 14, dt);
    b.moveA = Math.atan2(mx, mz);
    if (b.rig) b.rig.rig.anim.mode = speed > 3.6 ? 'run' : 'walk';
    return false;
  }
  function botThink(b, dt, full) {
    if (BR._testFreeze) return;
    const p = RT.player.pos;
    const distP = Math.hypot(b.x - p.x, b.z - p.z);
    /* out of circle? rotate in */
    const dC = Math.hypot(b.x - circle.cx, b.z - circle.cz);
    if (dC > circle.r * 0.92) {
      b.state = 'rotate';
    }
    /* target: player if close + LOS occasionally checked; other bots nearby */
    const engageR = b.pers === 'rusher' ? 66 : b.pers === 'camper' ? 44 : 55;
    if (!RT.player.dead && distP < engageR && phase !== 'fly' && phase !== 'drop' && phase !== 'chute') {
      b.losT = (b.losT || 0) - dt;
      if (b.losT <= 0) {
        b.losT = 0.4;
        const dy = RT.player.eyeY() - (b.y + 1.5);
        const d3 = Math.hypot(distP, dy);
        b.canSeeP = !RT.map.raycast(b.x, b.y + 1.5, b.z, (p.x - b.x) / d3, dy / d3, (p.z - b.z) / d3, d3 - 0.6);
      }
      if (b.canSeeP) b.state = 'fight';
      else if (b.state === 'fight') b.state = 'rotate';
    } else if (b.state === 'fight') b.state = 'rotate';

    if (b.state === 'fight') {
      b.faceA = Math.atan2(p.x - b.x, p.z - b.z);
      if (b.rig) { b.rig.rig.anim.mode = 'aim'; b.rig.rig.anim.aimPitch = clamp(Math.atan2(RT.player.eyeY() - (b.y + 1.5), distP), -0.5, 0.5); }
      /* strafe by personality */
      if (b.pers !== 'camper') {
        const strafe = Math.sin(matchT * 1.7 + b.id) * (b.pers === 'rusher' ? 1 : 0.5);
        botMove(b, b.x + Math.cos(b.faceA) * strafe * 2, b.z - Math.sin(b.faceA) * strafe * 2, 2.4, dt);
        if (b.pers === 'rusher' && distP > 18) botMove(b, p.x, p.z, 3.4, dt);
      }
      b.fireT -= dt;
      if (b.fireT <= 0) {
        b.fireT = 0.42 + Math.random() * 0.5 * (1 - b.skill * 0.4);
        botShoot(b, distP);
      }
    } else if (b.state === 'rotate') {
      const arrived = botMove(b, circle.tcx + Math.cos(b.id) * circle.tr * 0.5, circle.tcz + Math.sin(b.id * 2.3) * circle.tr * 0.5, 4.6, dt);
      if (arrived) b.state = 'loot';
    } else { /* loot: wander current POI, sometimes pause */
      b.lootT -= dt;
      if (b.lootT <= 0) {
        b.lootT = 5 + Math.random() * 12;
        b.moveTx = b.x + (Math.random() - 0.5) * 60;
        b.moveTz = b.z + (Math.random() - 0.5) * 60;
      }
      if (b.moveTx != null) {
        if (botMove(b, b.moveTx, b.moveTz, 2.6, dt)) { b.moveTx = null; if (b.rig) b.rig.rig.anim.mode = 'idle'; }
      } else if (b.rig) b.rig.rig.anim.mode = 'idle';
    }
  }
  function botFar(b, dt) {
    if (BR._testFreeze) return;
    /* abstract: drift toward the circle */
    const dC = Math.hypot(b.x - circle.cx, b.z - circle.cz);
    if (dC > circle.r * 0.8) {
      const sp = 5 * dt;
      b.x += (circle.cx - b.x) / dC * sp * 8;
      b.z += (circle.cz - b.z) / dC * sp * 8;
      b.y = RT.map.terrain.heightAt(b.x, b.z);
    }
  }
  function botShoot(b, distP) {
    /* muzzle + tracer + hit roll against the player */
    const from = new THREE.Vector3(b.x, b.y + 1.5, b.z);
    if (RT.audio) RT.audio.enemyShot(distP);
    let err = (1 - b.skill) * 0.09 + distP * 0.0011;
    if (PHASES.length - circle.idx <= 2) err *= 0.62;              // final-circle bots are sharp
    err *= 1 + RT.player.speedF * 1.1;
    const py = RT.player.eyeY() - 0.25;
    const dir = new THREE.Vector3(RT.player.pos.x - b.x, py - from.y, RT.player.pos.z - b.z).normalize();
    dir.x += (Math.random() - 0.5) * 2 * err;
    dir.y += (Math.random() - 0.5) * 2 * err * 0.8;
    dir.z += (Math.random() - 0.5) * 2 * err;
    dir.normalize();
    const wall = RT.map.raycast(from.x, from.y, from.z, dir.x, dir.y, dir.z, distP + 10);
    const rel = new THREE.Vector3(RT.player.pos.x - from.x, py + 0.1 - from.y, RT.player.pos.z - from.z);
    const tA = rel.dot(dir);
    RT.engine.tracer(from, dir, Math.min(wall ? wall.dist : 200, 200), 300);
    if (tA > 0 && (!wall || wall.dist > tA)) {
      const cx = from.x + dir.x * tA - RT.player.pos.x;
      const cy = from.y + dir.y * tA - (RT.player.pos.y + 0.9);
      const cz = from.z + dir.z * tA - RT.player.pos.z;
      const miss = Math.hypot(cx, cy * 0.55, cz);
      if (miss < 0.42) {
        let dmg = 8 + Math.random() * 7;
        if (inv.armor > 0) { const absorbed = Math.min(inv.armor, dmg * 0.65); inv.armor -= absorbed; dmg -= absorbed; refreshArmorBar(); }
        RT.player.damage(dmg, from);
        if (!RT.player.dead) BR.lastHitBy = b;
        else killer = b;
      } else if (miss < 1.6 && RT.audio) RT.audio.crack();
    }
  }

  /* ---------------- vehicles ---------------- */
  function buildCar(x, z, col) {
    const gy = RT.map.groundAt(x, z, 999);
    const g = [
      RT.G.cbox(1.75, 0.5, 4.0, 0.08, col, { y: 0.65, vary: 0.06 }),
      RT.G.cbox(1.6, 0.5, 2.0, 0.1, adjc2(col, 0.8), { y: 1.15, z: -0.2 }),
      RT.G.box(1.5, 0.06, 0.7, 0x222831, { y: 1.2, z: 0.9, rx: 0.5 }),
    ];
    for (const [sx, sz] of [[-0.8, 1.35], [0.8, 1.35], [-0.8, -1.4], [0.8, -1.4]])
      g.push(RT.G.torus(0.3, 0.12, 6, 12, 0x1d1c1a, { x: sx, y: 0.32, z: sz, ry: Math.PI / 2 }));
    const mesh = RT.meshOf(g, RT.MAT.std);
    mesh.position.set(x, gy, z);
    RT.engine.world.add(mesh);
    const head = new THREE.PointLight(0xffd9a0, 0, 18, 2);
    head.position.set(0, 1, 2.4);
    mesh.add(head);
    const car = { mesh, x, z, y: gy, yaw: 0, speed: 0, hp: 100, burning: 0, dead: false, head };
    vehicles.push(car);
    RT.map.interact.push({
      getPos: () => ({ x: car.x, y: car.y + 1, z: car.z }), r: 2.8, label: 'DRIVE',
      fn: () => { if (!car.dead && phase === 'play') enterCar(car); },
    });
    return car;
  }
  function adjc2(hex, m) { const c = new THREE.Color(hex); c.multiplyScalar(m); return c.getHex(); }
  function enterCar(car) {
    curVehicle = car;
    phase = 'drive';
    RT.game.state = 'br';
    RT.weapons.setVisible(false);
    if (RT.audio) RT.audio.engineStart();
    RT.ui.toastMsg('E TO EXIT · ' + (RT.input.keyboardMode() ? 'ARROWS' : 'WASD') + ' TO DRIVE');
  }
  function exitCar() {
    if (RT.audio) RT.audio.engineStop();
    RT.player.pos.set(curVehicle.x + Math.cos(curVehicle.yaw) * 2.2, curVehicle.y + 0.1, curVehicle.z - Math.sin(curVehicle.yaw) * 2.2);
    curVehicle = null;
    phase = 'play';
    RT.game.state = 'play';
    RT.weapons.setVisible(true);
  }
  function vehicleUpdate(dt) {
    for (const car of vehicles) {
      if (car.burning > 0 && !car.dead) {
        car.burning -= dt;
        RT.engine.particle(car.x, car.y + 1.4, car.z, (Math.random() - .5), 2.5, (Math.random() - .5),
          { color: 0x2b2926, size: 0.7, life: 1.6, grav: 0.6, drag: 1, grow: -0.3, alpha: 0.6 });
        if (car.burning <= 0) {
          car.dead = true;
          RT.fxExplosion(new THREE.Vector3(car.x, car.y + 1, car.z), 7);
          if (curVehicle === car) { RT.player.damage(70, null); exitCar(); }
          RT.tintGeo(car.mesh.geometry, 0x2e2a26);
        }
      }
      car.head.intensity = BR.duskK > 0.5 && !car.dead ? 1.4 : 0;
    }
    if (!curVehicle) return;
    const car = curVehicle;
    const I = RT.input;
    const kb = I.keyboardMode();
    const fwd = (kb ? I.keys.ArrowUp : I.keys.KeyW) ? 1 : (kb ? I.keys.ArrowDown : I.keys.KeyS) ? -0.5 : 0;
    const steer = ((kb ? I.keys.ArrowLeft : I.keys.KeyA) ? 1 : 0) - ((kb ? I.keys.ArrowRight : I.keys.KeyD) ? 1 : 0);
    car.speed = clamp(car.speed + fwd * 13 * dt - Math.sign(car.speed) * 4.5 * dt, -8, 23);
    car.yaw += steer * clamp(Math.abs(car.speed) / 12, 0, 1.4) * 1.5 * dt * Math.sign(car.speed || 1);
    const nx = car.x + Math.sin(car.yaw) * car.speed * dt;
    const nz = car.z + Math.cos(car.yaw) * car.speed * dt;
    const hit = RT.map.raycast(car.x, car.y + 0.8, car.z, Math.sin(car.yaw) * Math.sign(car.speed || 1), 0, Math.cos(car.yaw) * Math.sign(car.speed || 1), 2.4);
    if (hit && Math.abs(car.speed) > 3) {
      car.hp -= Math.abs(car.speed) * 2.2;
      RT.engine.shake(0.3);
      car.speed = -car.speed * 0.25;
      if (car.hp <= 0 && car.burning <= 0) car.burning = 3;
    } else if (!hit || Math.abs(car.speed) <= 3) {
      car.x = nx; car.z = nz;
    }
    car.y = damp(car.y, RT.map.terrain.heightAt(car.x, car.z), 12, dt);
    car.mesh.position.set(car.x, car.y, car.z);
    car.mesh.rotation.y = car.yaw;
    if (RT.audio) RT.audio.engineRPM(clamp(Math.abs(car.speed) / 23, 0, 1));
    /* camera chase */
    const cam = RT.engine.camera;
    const cx = car.x - Math.sin(car.yaw) * 7.5, cz = car.z - Math.cos(car.yaw) * 7.5;
    cam.position.set(damp(cam.position.x, cx, 6, dt), car.y + 3.4, damp(cam.position.z, cz, 6, dt));
    cam.lookAt(car.x + Math.sin(car.yaw) * 6, car.y + 1.2, car.z + Math.cos(car.yaw) * 6);
    RT.engine.updateSun(cam.position);
    RT.player.pos.set(car.x, car.y, car.z);   // player rides along (storm damage etc.)
    if (I.pressed('KeyE')) exitCar();
  }

  /* ---------------- match flow ---------------- */
  BR.startMatch = function () {
    RT.audio.ensure();
    RT.audio.menuMusic(false);
    RT.ui.hideScreens();
    RT.ui.fade(true);
    setTimeout(() => {
      buildBRMap();
      buildStorm();
      scatterLoot();
      spawnBots();
      /* cars */
      buildCar(30, -120, 0x6b3a2e); buildCar(-40, -160, 0x37474f); buildCar(6, 60, 0x4e5a3a);
      buildCar(430, 320, 0x5a4a68); buildCar(440, -360, 0x6b5a2e); buildCar(-460, -300, 0x3a5a5e);
      circle.cx = 0; circle.cz = 0; circle.r = 780; circle.idx = 0; circle.t = PHASES[0].wait; circle.shrinking = false;
      rollNextCircle();
      matchT = 0; atmoT = 0; stats = { kills: 0, dmg: 0 }; killer = null;
      inv = { medkits: 0, armor: 0 };
      refreshArmorBar();
      RT.weapons.setLoadout(['pistol'], true);
      RT.player.init({ x: 0, z: 0, ry: 0 });
      RT.player.grenades = 0;
      BR.active = true;
      phase = 'fly';
      planeT = 0;
      deployed = false;
      RT.game.state = 'br';
      RT.game.missionIdx = -1;
      buildBrHud();
      RT.ui.showHUD(true);
      RT.ui.setObjectives([]);
      RT.ui.fade(false, true);
      RT.ui.toast('THUNDERDROP', 'SPACE / CLICK TO JUMP');
      RT.audio.setAmbient('birds');
      RT.weapons.setVisible(false);
    }, 700);
  };
  function buildBrHud() {
    if (!feedEl) {
      feedEl = RT.el('div', '', RT.$('hud'));
      feedEl.style.cssText = 'position:absolute;top:64px;right:34px;text-align:right;min-width:200px';
      leftEl = RT.el('div', '', RT.$('hud'));
      leftEl.style.cssText = 'position:absolute;top:18px;right:34px;font-size:15px;letter-spacing:.2em;color:#fff;text-shadow:0 1px 4px #000;font-weight:700';
      minimap = RT.el('canvas', '', RT.$('hud'));
      minimap.width = 200; minimap.height = 200;
      minimap.style.cssText = 'position:absolute;right:24px;bottom:24px;width:200px;height:200px;opacity:0.92;border:1px solid rgba(232,163,61,.35);background:rgba(8,10,8,.55)';
    }
    feedEl.innerHTML = '';
    minimap.style.display = 'block';
    leftEl.textContent = '50 ALIVE';
  }
  function drawMinimap() {
    if (!minimap || minimap.style.display === 'none') return;
    const c = minimap.getContext('2d');
    c.clearRect(0, 0, 200, 200);
    const W2P = v => (v / 1600 + 0.5) * 200;
    c.fillStyle = 'rgba(60,70,45,.5)'; c.fillRect(0, 0, 200, 200);
    c.font = '7px Segoe UI'; c.fillStyle = '#d8d4c8'; c.textAlign = 'center';
    for (const p of POIS) {
      c.fillStyle = 'rgba(232,163,61,.25)';
      c.beginPath(); c.arc(W2P(p.x), W2P(p.z), p.r / 8, 0, TAU); c.fill();
      c.fillStyle = '#e8e4da';
      c.fillText(p.name, W2P(p.x), W2P(p.z) - p.r / 8 - 2);
    }
    /* circles */
    c.strokeStyle = 'rgba(150,110,255,.9)'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(W2P(circle.cx), W2P(circle.cz), circle.r / 8, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1;
    c.beginPath(); c.arc(W2P(circle.tcx), W2P(circle.tcz), circle.tr / 8, 0, TAU); c.stroke();
    /* plane or player */
    if (phase === 'fly') {
      const pp = planePos(planeT);
      c.fillStyle = '#fff';
      c.save(); c.translate(W2P(pp.x), W2P(pp.z)); c.rotate(Math.atan2(planeDir.x, -planeDir.z));
      c.beginPath(); c.moveTo(0, -5); c.lineTo(3.5, 4); c.lineTo(-3.5, 4); c.fill(); c.restore();
    } else {
      c.fillStyle = '#7fe08a';
      c.beginPath(); c.arc(W2P(RT.player.pos.x), W2P(RT.player.pos.z), 2.6, 0, TAU); c.fill();
    }
  }
  const planeDir = new THREE.Vector3(0.82, 0, 0.57).normalize();
  const planeStart = new THREE.Vector3(-780 * 0.82, 250, -780 * 0.57);
  function planePos(t) { return planeStart.clone().addScaledVector(planeDir, t * 62); }

  BR.onPlayerDeath = function () {
    if (phase === 'end') return;
    phase = 'spectate';
    specT = 4;
    RT.game.state = 'br';
    RT.input.unlock();
    RT.weapons.setVisible(false);
    RT.ui.say('THUNDERDROP', 'Eliminated by ' + (killer ? killer.name : 'the storm'), 3);
  };

  function endMatch(win) {
    phase = 'end';
    BR.active = false;
    RT.input.unlock();
    RT.ui.clearTimer();
    if (minimap) minimap.style.display = 'none';
    const placement = win ? 1 : alive;
    RT.$('end-title').textContent = win ? 'THUNDER CHAMPION' : '#' + placement + ' — ELIMINATED';
    RT.$('end-title').classList.toggle('fail', !win);
    RT.$('st-l-time').textContent = 'TIME SURVIVED';
    RT.$('st-l-kills').textContent = 'ELIMINATIONS';
    RT.$('st-l-acc').textContent = 'DAMAGE DEALT';
    RT.$('st-l-heads').textContent = 'PLACEMENT';
    RT.$('st-time').textContent = RT.fmtTime(matchT);
    RT.$('st-kills').textContent = stats.kills;
    RT.$('st-acc').textContent = Math.round(stats.dmg);
    RT.$('st-heads').textContent = win ? 'CHAMPION' : '#' + placement + ' / 50';
    if (RT.progress) RT.progress.onBRResult(placement, stats.kills, win);
    RT.$('btn-next').disabled = true;
    RT.$('btn-retry').textContent = 'Drop Again';
    RT.$('btn-retry').onclick = () => RT.br.startMatch();
    RT.ui.showHUD(false);
    if (win) {
      RT.engine.timeScale = 0.35;
      setTimeout(() => { RT.engine.timeScale = 1; }, 900);
      RT.fxExplosion(new THREE.Vector3(RT.player.pos.x, RT.player.pos.y + 8, RT.player.pos.z), 4);
      RT.audio.missionCompleteStinger();
    }
    setTimeout(() => RT.ui.showScreen('end-screen'), win ? 1600 : 700);
  }

  BR.update = function (dt, raw) {
    if (!BR.active && phase !== 'end') return;
    matchT += dt;
    /* time-of-day progression: golden hour → dusk over ~9 minutes */
    BR.duskK = clamp(matchT / 540, 0, 1);
    atmoT -= raw;
    if (atmoT <= 0) {
      atmoT = 3;
      RT.engine.setAtmosphere(goldenAtmo(BR.duskK));
      if (RT.map._bulbOn === undefined && BR.duskK > 0.55) RT.map._bulbOn = true;
    }
    circleUpdate(dt);
    if (phase !== 'fly' && phase !== 'spectate') botsUpdate(dt);
    vehicleUpdate(dt);
    uiT -= raw;
    if (uiT <= 0) {
      uiT = 0.25;
      const total = alive;
      if (leftEl) leftEl.textContent = total + ' ALIVE' + (stats.kills ? ' · ' + stats.kills + ' KILLS' : '');
      drawMinimap();
    }
    /* loot beam shimmer */
    for (const it of lootItems) if (!it.taken) it.grp.rotation.y += dt * 0.8;

    if (phase === 'fly') {
      planeT += dt;
      const pp = planePos(planeT);
      const cam = RT.engine.camera;
      cam.position.copy(pp);
      cam.rotation.set(-0.5, Math.atan2(-planeDir.x, -planeDir.z), 0);
      RT.engine.updateSun(cam.position);
      RT.player.pos.set(pp.x, pp.y, pp.z);
      if (planeT > 2 && (RT.input.pressed('Space') || RT.input.pressed('Mouse0'))) { phase = 'drop'; fallV = 4; deployed = false; RT.weapons.setVisible(false); }
      if (planeT * 62 > 1560) { phase = 'drop'; fallV = 4; deployed = false; }
      /* bots drop along the path */
      for (const b of bots) {
        if (!b.dropped && Math.random() < dt * 0.7 && planeT > 1.5) {
          b.dropped = true;
        }
      }
      return;
    }
    if (phase === 'drop' || phase === 'chute') {
      const p = RT.player.pos;
      fallV = Math.min(fallV + (phase === 'drop' ? 34 : 6) * dt, phase === 'drop' ? 52 : 8.5);
      p.y -= fallV * dt;
      /* steering */
      const I = RT.input;
      const sp = phase === 'drop' ? 13 : 10;
      const yawC = RT.player.yaw;
      const mx = ((I.keys.KeyD ? 1 : 0) - (I.keys.KeyA ? 1 : 0));
      const mz = ((I.keys.KeyS ? 1 : 0) - (I.keys.KeyW ? 1 : 0));
      p.x += (Math.cos(yawC) * mx - Math.sin(yawC) * mz) * sp * dt;
      p.z += (-Math.sin(yawC) * mx - Math.cos(yawC) * mz) * sp * dt;
      /* look control (reuse player look via update? keep simple: arrows/mouse via player.update disabled — manual) */
      let [mdx, mdy] = I.consumeMouse();
      if (I.keyboardMode() || I.fallback) {
        const ls = 1.9 * dt;
        if (I.keys.ArrowLeft) RT.player.yaw += ls; if (I.keys.ArrowRight) RT.player.yaw -= ls;
        if (I.keys.ArrowUp) RT.player.pitch += ls * 0.7; if (I.keys.ArrowDown) RT.player.pitch -= ls * 0.7;
      }
      RT.player.yaw -= mdx * 0.002; RT.player.pitch = clamp(RT.player.pitch - mdy * 0.002, -1.4, 0.5);
      const cam = RT.engine.camera;
      cam.position.set(p.x, p.y, p.z);
      cam.rotation.set(RT.player.pitch - 0.35, RT.player.yaw, 0);
      RT.engine.updateSun(cam.position);
      const ground = RT.map.groundAt(p.x, p.z, p.y);
      if (phase === 'drop' && (p.y - ground < 80 || (I.pressed('Space') && p.y - ground < 200))) {
        phase = 'chute';
        RT.ui.toastMsg('CHUTE DEPLOYED');
        fallV = Math.min(fallV, 14);
      }
      if (p.y - ground <= 1) {
        p.y = ground;
        phase = 'play';
        RT.game.state = 'play';
        RT.weapons.setVisible(true);
        RT.player.pitch = 0;
        RT.ui.toast('FIND WEAPONS', 'LOOT THE BUILDINGS');
        /* bots land */
        for (const b of bots) { b.y = RT.map.groundAt(b.x, b.z, 999); }
      }
      return;
    }
    if (phase === 'spectate') {
      specT -= raw;
      const cam = RT.engine.camera;
      if (killer && !killer.dead) {
        const a = matchT * 0.5;
        cam.position.set(killer.x + Math.cos(a) * 7, killer.y + 3.4, killer.z + Math.sin(a) * 7);
        cam.lookAt(killer.x, killer.y + 1.4, killer.z);
      }
      if (specT <= 0 || RT.input.pressed('Space') || RT.input.pressed('Enter') || RT.input.pressed('Mouse0')) endMatch(false);
      return;
    }
    if (phase === 'play') {
      /* medkit use */
      if (RT.input.pressed('KeyH') && inv.medkits > 0 && medCast < 0 && RT.player.health < 99) {
        medCast = 2.2;
        RT.ui.toastMsg('USING MEDKIT…');
      }
      if (medCast >= 0) {
        medCast -= dt;
        if (medCast < 0) {
          inv.medkits--;
          RT.player.heal ? RT.player.heal(60) : null;
          RT.ui.toastMsg('MEDKIT USED (+60)');
          if (RT.audio) RT.audio.magIn();
        }
      }
      /* victory check */
      if (alive <= 1 && !RT.player.dead) endMatch(true);
    }
  };

  BR.reset = function () {
    /* cleanup on quit to menu */
    BR.active = false;
    phase = 'idle';
    if (storm) { RT.engine.scene.remove(storm); storm = null; }
    if (nextRing) { RT.engine.scene.remove(nextRing); nextRing = null; }
    if (minimap) minimap.style.display = 'none';
    if (RT.audio) RT.audio.engineStop();
    bots = []; lootItems = []; vehicles = []; curVehicle = null;
    rigPool.length = 0;
  };
  Object.defineProperty(BR, 'phase', { get: () => phase, set: v => { phase = v; } });
  BR.debug = { get bots() { return bots; }, get circle() { return circle; }, spawnLoot, get alive() { return alive; }, set alive(v) { alive = v; }, killBot, endMatch };
  return BR;
})();
