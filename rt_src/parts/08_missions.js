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
        { type: 'patrol', x: -30, z: 66, count: 2, radius: 12, group: 'farmA' },
        { type: 'guard', x: -28, z: 51, count: 1, dir: [0, 1], group: 'farmA' },
        { type: 'guard', x: 30, z: -8, count: 2, dir: [0, 1], group: 'houseB' },
        { type: 'guard', x: 36, z: 8, count: 1, dir: [0, 1], upstairs: true, group: 'houseB' },
        { type: 'patrol', x: 0, z: -60, count: 3, radius: 18, group: 'village' },
        { type: 'guard', x: -6, z: -57, count: 2, dir: [0.3, 1], group: 'village' },
        { type: 'guard', x: 4, z: -73, count: 1, dir: [0, 1], group: 'village' },
        { type: 'guard', x: -14, z: -82, count: 2, dir: [0, -1], group: 'village' },
      ],
    };
  },
});

/* ============================================================
 * Mission runtime: sequential objectives with waypoints,
 * checkpoints, timed scripts, wave spawns.
 * ============================================================ */
RT.missionRuntime = (() => {
  const M = {};
  let objectives = [], objIdx = -1, def = null, timers = [];
  M.checkpoint = null;

  M.start = function (missionDef, info) {
    def = missionDef;
    objectives = missionDef.objectives ? missionDef.objectives(M, info) : [];
    objIdx = -1; timers = [];
    RT.ui.setObjectives(objectives);
    M.advance();
  };
  M.after = function (t, fn) { timers.push({ t, fn }); };
  M.say = (who, text, dur) => RT.ui.say(who, text, dur);
  M.obj = () => objectives[objIdx];

  M.advance = function () {
    objIdx++;
    const o = objectives[objIdx];
    RT.ui.waypointTargets.length = 0;
    if (!o) { RT.game.missionComplete(); return; }
    o.hidden = false;
    RT.ui.refreshObjectives();
    if (o.text) RT.ui.toast(o.text.toUpperCase(), 'NEW OBJECTIVE');
    if (o.waypoint) {
      const wy = o.waypoint.y != null ? o.waypoint.y : RT.map.groundAt(o.waypoint.x, o.waypoint.z, 999) + 1.6;
      RT.ui.waypointTargets[0] = { x: o.waypoint.x, y: wy, z: o.waypoint.z };
    }
    if (o.onStart) o.onStart(M);
    /* checkpoint at each objective */
    RT.game.saveCheckpoint();
  };

  M.update = function (dt) {
    for (let i = timers.length - 1; i >= 0; i--) {
      timers[i].t -= dt;
      if (timers[i].t <= 0) { const fn = timers[i].fn; timers.splice(i, 1); fn(); }
    }
    const o = objectives[objIdx];
    if (!o) return;
    if (o.update) o.update(dt, M);
    if (o.check && o.check(M)) {
      o.done = true;
      RT.ui.refreshObjectives();
      if (o.onDone) o.onDone(M);
      if (RT.audio) RT.audio.objectiveStinger();
      M.advance();
    }
  };

  /* helpers for mission scripts */
  M.reached = (x, z, r) => Math.hypot(RT.player.pos.x - x, RT.player.pos.z - z) < r;
  M.groupDead = g => RT.ai.aliveInGroup(g) === 0;
  M.spawnWave = function (points, group) {
    for (const [x, z] of points) {
      const e = RT.ai.spawnEnemy(x, z, { group });
      e.state = 'alert';
      e.lastKnown = { x: RT.player.pos.x, z: RT.player.pos.z };
    }
  };
  return M;
})();

/* ---------- Mission 1 story script ---------- */
RT.missions[0].intro = {
  path: [[44, 32, 198], [20, 14, 180], [13, 5.5, 174], [10.5, 3.4, 168]],
  look: [[0, 4, 120], [0, 3, 130], [0, 2, 140], [2, 1.6, 150]],
  dur: 14,
  lines: [
    { t: 0.5, who: 'LT. MARSH', text: 'Ridge, look alive. Halvory farm, first light — just like the brief.' },
    { t: 4.2, who: 'LT. MARSH', text: 'Coalition patrol dug in on the homestead. We take it back before the fog burns off.' },
    { t: 8.6, who: 'DOC OKAFOR', text: 'Nice and quiet. It never stays nice and quiet.' },
    { t: 11.4, who: 'CPL. VANE', text: 'First one in the field buys the coffee, Sergeant.' },
  ],
};
RT.missions[0].objectives = function (M, info) {
  return [
    {
      text: 'Advance on the farmhouse', waypoint: { x: -30, z: 62 },
      onStart() {
        M.after(1.5, () => M.say('LT. MARSH', 'Move up the road. Farmhouse first — watch the fence line.'));
      },
      check: () => M.reached(-30, 62, 22) || RT.ai.enemies.some(e => !e.dead && e.group === 'farmA' && e.state === 'combat'),
    },
    {
      text: 'Clear the farmhouse', waypoint: { x: -34, z: 68 },
      onStart() { M.say('LT. MARSH', 'Contact front! Clear that farmhouse!'); },
      check: () => M.groupDead('farmA'),
      onDone() { M.say('DOC OKAFOR', 'Farm’s clear. Told you it wouldn’t stay quiet.'); },
    },
    {
      text: 'Push to the crossroads', waypoint: { x: 26, z: 0 },
      onStart() {
        M.after(2, () => M.say('LT. MARSH', 'Crossroads next. There’s a two-story overlooking the bend — check your corners.'));
      },
      check: () => M.reached(26, 0, 20) || RT.ai.enemies.some(e => !e.dead && e.group === 'houseB' && e.state === 'combat'),
    },
    {
      text: 'Clear the crossroads house', waypoint: { x: 36, z: 8 },
      check: () => M.groupDead('houseB'),
      onDone() { M.say('CPL. VANE', 'Upstairs clear! ...Okay, NOW it’s clear.'); },
    },
    {
      text: 'Sweep the village', waypoint: { x: -4, z: -66 },
      onStart() {
        M.after(2.5, () => M.say('LT. MARSH', 'Village edge ahead. They’ll be waiting. Doc, stay on my six.'));
      },
      check: () => M.reached(-4, -66, 26) && M.groupDead('village'),
    },
    {
      text: 'Regroup at the barn', waypoint: { x: -52, z: -108 },
      onStart() {
        M.say('LT. MARSH', 'Good work. Rally on the red barn, west side.');
        M.after(6, () => M.say('DOC OKAFOR', 'Something’s off. Birds went quiet.'));
      },
      check: () => M.reached(-54, -110, 12),
    },
    {
      text: 'Defend the barn', waypoint: { x: -62, z: -116 },
      onStart() {
        M.say('LT. MARSH', 'Radio intercept — counterattack inbound from the east road! Set up on the sandbags!');
        this.wave = 0; this.waveT = 4;
        if (RT.audio) RT.audio.combatStinger();
      },
      update(dt) {
        this.waveT -= dt;
        if (this.waveT <= 0 && this.wave < 3) {
          this.wave++;
          this.waveT = this.wave === 3 ? 999 : 22;
          const spawns = [
            [[-18, -100], [-24, -92], [-10, -112]],
            [[-16, -104], [-28, -88], [-6, -118], [-20, -128]],
            [[-14, -98], [-26, -94], [-12, -120], [-30, -134], [-2, -108]],
          ][this.wave - 1];
          M.spawnWave(spawns, 'assault');
          M.say('CPL. VANE', ['Here they come!', 'More of them — east road!', 'Last push — give ’em everything!'][this.wave - 1]);
          if (RT.weapons) RT.weapons.giveAmmo(0.4);
          RT.ui.refreshAmmo();
        }
      },
      check() { return this.wave >= 3 && M.groupDead('assault'); },
      onDone() {
        M.say('LT. MARSH', 'That’s the last of them. Halvory farm is ours again.');
        M.after(2.4, () => M.say('DOC OKAFOR', 'Coffee’s on Vane. Field rules.'));
      },
    },
    { text: '', hidden: true, check: () => false, onStart: () => { M.after(4.5, () => RT.game.missionComplete()); } },
  ];
};

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
