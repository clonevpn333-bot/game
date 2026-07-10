/* ============================================================
 * Mission definitions: atmosphere, terrain, map build, story,
 * objectives, scripted set-pieces.
 * ============================================================ */
RT.missions = [];

/* ============ MISSION 1 — FIRST LIGHT ============ */
RT.missions.push({
  id: 1, title: 'FIRST LIGHT', sub: 'Velkan Ridge — Dawn',
  desc: 'Dawn assault on occupied farmland. Clear the farmhouses, hold the barn.',
  loadout: ['m4', 'pistol'],
  atmosphere: {
    top: 0x2e4a6e, horizon: 0xe89a55, ground: 0x54483a,
    sunDir: new THREE.Vector3(-0.75, 0.22, -0.35), sunColor: 0xffb866, sunIntensity: 2.0,
    sunDiscColor: 0xffd9a0, sunGlow: 0.42,
    hemiSky: 0xc9a075, hemiGround: 0x4a4238, hemiIntensity: 0.5,
    fogColor: 0xdba86e, fogDensity: 0.0036, exposure: 1.0, fillIntensity: 0.12,
  },
  ambient: 'birds',
  terrain: {
    size: 380, segs: 150, seed: 11, amp: 5, rim: 14,
    palette: { lush: 0x5d6b38, lush2: 0x71793f, dirt: 0x77664a, rock: 0x74705f, road: 0x6d6354 },
    flats: [{ x: -32, z: 66, r: 26 }, { x: 34, z: 6, r: 24 }, { x: -4, z: -66, r: 42 },
            { x: -60, z: -114, r: 30 }, { x: 4, z: 156, r: 24 }, { x: -20, z: 105, r: 30 }],
    roads: [[[6, 185], [-8, 120], [6, 55], [0, 0], [-10, -60], [-4, -120], [0, -175]],
            [[-4, -95], [-60, -108], [-110, -112]]],
    craters: [{ x: 18, z: 40, r: 6, d: 1.8 }, { x: -28, z: -20, r: 6.5, d: 2.2 }, { x: 8, z: -84, r: 5.5, d: 1.8 }, { x: 44, z: -55, r: 5, d: 1.5 }],
  },
  buildMap(B) {
    const P = RT.props;
    /* --- farm cluster A (south, tutorial contact) --- */
    P.house(B, { x: -34, z: 68, ry: 0.35, w: 8.5, d: 7, floors: 1, seed: 21, front: 'S', damage: 0, ajar: true });
    P.well(B, -26, 61);
    P.fence(B, -44, 78, -20, 80, { broken: true });
    P.fence(B, -44, 78, -46, 58, {});
    P.hayBale(B, { x: -20, z: 58 });
    P.hayBale(B, { x: -18.4, z: 56.2, ry: 1.2 });
    P.drum(B, -39, 60, {});
    P.sandbags(B, -28, 52, 0.2, 4.5, {});

    /* --- field rows with bales + scarecrow-ish posts --- */
    for (let i = 0; i < 6; i++) P.hayBale(B, { x: -58 + i * 9 + (i % 2) * 3, z: 100 + (i % 3) * 8, ry: i });
    P.fence(B, -62, 92, 8, 96, { broken: true, gapAt: 0.5 });
    P.tree(B, -70, 85, {}); P.tree(B, 16, 100, {}); P.tree(B, -12, 132, { s: 1.5 });

    /* --- mid farmhouse B (two floors, damaged; sniper window) --- */
    P.house(B, { x: 36, z: 8, ry: -0.25, w: 9.5, d: 8, floors: 2, seed: 33, front: 'S', damage: 1, stairs: true });
    P.fence(B, 26, 20, 48, 16, { broken: true });
    P.husk(B, 22, -2, 0.8);
    P.crate(B, 42, -2, { stack: true });
    P.tires(B, 30, 16);
    P.sandbags(B, 30, -8, -0.4, 5, {});

    /* --- power line along the road --- */
    let prevTop = null;
    for (const [px, pz] of [[10, 150], [8, 110], [4, 70], [10, 30], [6, -10], [10, -50], [6, -90]]) {
      prevTop = P.powerPole(B, px, pz, prevTop);
    }

    /* --- village edge cluster (3 houses around road bend) --- */
    P.house(B, { x: -22, z: -52, ry: 1.62, w: 7.5, d: 6.5, floors: 1, seed: 44, front: 'S', damage: 2 });
    P.house(B, { x: 16, z: -66, ry: -1.5, w: 8, d: 7, floors: 1, seed: 55, front: 'S', damage: 1, ajar: true });
    P.house(B, { x: -14, z: -86, ry: 0.15, w: 9, d: 7.5, floors: 2, seed: 66, front: 'N', damage: 0 });
    P.sandbags(B, -6, -58, 1.35, 5.5, {});
    P.sandbags(B, 4, -74, -0.5, 4.5, {});
    P.drum(B, -16, -62, { tipped: true });
    P.drum(B, -15, -60.4, {});
    P.crate(B, 8, -60, {});
    P.crate(B, 9.3, -60.6, { s: 0.75 });
    P.sign(B, -2, -44, 0.2);
    P.lamp(B, 6, -52, {});
    P.well(B, 22, -80);
    P.waterPump(B, -20, -78);
    P.rubble(B, { x: -26, z: -48, r: 2, seed: 8 });
    P.fence(B, -30, -70, -28, -94, { broken: true });
    P.fence(B, 26, -58, 30, -84, {});

    /* --- the barn (final defend) --- */
    P.barn(B, { x: -62, z: -116, ry: 0.5 });
    P.sandbags(B, -52, -106, 2.1, 6, {});
    P.sandbags(B, -70, -104, 0.9, 5, {});
    P.crate(B, -52, -122, { stack: true });
    P.drum(B, -73, -120, {});
    P.husk(B, -44, -112, -0.7);
    P.tree(B, -84, -100, { s: 1.3 }); P.tree(B, -40, -132, {});
    P.deadTree(B, -30, -100);

    /* --- perimeter trees --- */
    const rnd = RNG(200);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU;
      const r = rnd.range(130, 170);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) < 30 && z > 100) continue; // keep spawn road clear
      P.tree(B, x, z, { s: rnd.range(0.9, 1.6) });
    }
    P.scatterGrass(B, 4200, 165, 0x5d6b38);
    P.scatterRocks(B, 160, 180);

    return {
      playerSpawn: { x: 4, z: 158, ry: Math.PI },   // facing -z (north)
      squad: [{ x: 1, z: 162 }, { x: 8, z: 163 }, { x: -3, z: 160 }],
      enemies: [
        { type: 'patrol', x: -30, z: 66, count: 2, radius: 12 },
        { type: 'guard', x: -28, z: 51, count: 1, dir: [0, 1] },
        { type: 'guard', x: 30, z: -8, count: 2, dir: [0, 1] },
        { type: 'guard', x: 36, z: 8, count: 1, dir: [0, 1], upstairs: true },
        { type: 'patrol', x: 0, z: -60, count: 3, radius: 18 },
        { type: 'guard', x: -6, z: -57, count: 2, dir: [0.3, 1] },
        { type: 'guard', x: 4, z: -73, count: 1, dir: [0, 1] },
        { type: 'guard', x: -14, z: -82, count: 2, dir: [0, -1] },
      ],
    };
  },
});

/* map viewer support (Gate C) */
RT.buildMissionWorld = function (idx) {
  const def = RT.missions[idx];
  RT.engine.setAtmosphere(def.atmosphere);
  const terrain = new RT.Terrain(def.terrain);
  const B = new RT.MapBuilder(terrain, def.terrain.seed);
  const info = def.buildMap(B);
  const group = B.finalize();
  RT.engine.world.add(group);
  RT.map = B;
  RT.map.info = info;
  RT.map.def = def;
  return { B, info, def };
};
