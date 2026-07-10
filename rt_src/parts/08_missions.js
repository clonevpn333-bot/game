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
    size: 380, segs: 164, seed: 11, amp: 5, rim: 14,
    palette: { lush: 0x5d6b38, lush2: 0x71793f, dirt: 0x77664a, rock: 0x74705f, road: 0x6d6354 },
    flats: [{ x: -32, z: 66, r: 26 }, { x: 34, z: 6, r: 24 }, { x: -4, z: -66, r: 42 },
            { x: -60, z: -114, r: 30 }, { x: 4, z: 156, r: 24 }, { x: -20, z: 105, r: 30 }],
    roads: [[[6, 185], [-8, 120], [6, 55], [0, 0], [-10, -60], [-4, -120], [0, -175]],
            [[-4, -95], [-60, -108], [-110, -112]]],
    craters: [{ x: 2, z: 122, r: 5, d: 1.5 }, { x: 20, z: 84, r: 5, d: 1.6 }, { x: 18, z: 40, r: 6, d: 1.8 },
              { x: -8, z: 30, r: 5, d: 1.6 }, { x: 8, z: -38, r: 5.5, d: 1.8 }, { x: -28, z: -20, r: 6.5, d: 2.2 },
              { x: 8, z: -84, r: 5.5, d: 1.8 }],
  },
  /* Layout framework: every zone offers road (main) + west flank + east
   * flank, cover every ≤12m, long→mid→CQB bands, 2+ height points,
   * anchored properties, landmarks (water tower, smoke columns). */
  buildMap(B) {
    const P = RT.props;

    /* ================= ZONE 1 — HALVORY FARM (long-range opening) ===== */
    /* the farm reads as one property: house + yard + well + fences */
    P.house(B, { x: -34, z: 68, ry: 0.35, w: 8.5, d: 7, floors: 1, seed: 21, front: 'S', damage: 0, ajar: true });
    P.well(B, -26, 61);
    P.fence(B, -44, 78, -20, 80, { broken: true, gapAt: 0.6 });
    P.fence(B, -44, 78, -46, 58, {});
    P.fence(B, -46, 58, -30, 54, { broken: true });
    P.hayBale(B, { x: -20, z: 58 });
    P.hayBale(B, { x: -18.4, z: 56.2, ry: 1.2 });
    P.drum(B, -39, 60, {});
    P.sandbags(B, -28, 52, 0.2, 4.5, {});          // enemy line facing the approach
    P.sandbags(B, -38, 54, -0.3, 4, {});
    /* main lane (road): crater → wreck → sandbags → crates → farm gate */
    P.husk(B, 8, 106, 0.5);
    P.sandbags(B, -2, 90, 0.15, 5, {});
    P.crate(B, -10, 76, { stack: true });
    P.drum(B, -12, 74.4, {});
    /* west flank: field rows of bales → fence gap → well */
    for (let i = 0; i < 6; i++) P.hayBale(B, { x: -58 + i * 9 + (i % 2) * 3, z: 100 + (i % 3) * 8, ry: i });
    P.hayBale(B, { x: -16, z: 122 });
    P.hayBale(B, { x: -30, z: 112, ry: 0.8 });
    P.fence(B, -62, 92, 8, 96, { broken: true, gapAt: 0.5 });
    P.copse(B, -58, 120, 3, 7);
    /* east flank: gully with copse → rocks/crater → ruined shed → fence gap */
    P.copse(B, 28, 104, 4, 8);
    P.house(B, { x: 16, z: 70, ry: 0.3, w: 5, d: 4.2, floors: 1, seed: 27, front: 'S', damage: 2, porch: false, interior: false });
    P.fence(B, 24, 62, 8, 57, { broken: true, gapAt: 0.4 });
    P.tree(B, -70, 85, {}); P.tree(B, -12, 132, { s: 1.5 });

    /* ================= ZONE 2 — CROSSROADS (mid-range push) ============ */
    P.house(B, { x: 36, z: 8, ry: -0.25, w: 9.5, d: 8, floors: 2, seed: 33, front: 'S', damage: 1, stairs: true }); // height point
    P.waterTower(B, 52, 18);                        // landmark visible across the map
    P.fence(B, 26, 20, 48, 16, { broken: true });
    P.husk(B, 22, -2, 0.8);
    P.smokeColumn(B, 22, -2, null);                 // burning wreck = objective beacon
    P.crate(B, 42, -2, { stack: true });
    P.tires(B, 30, 16);
    P.sandbags(B, 30, -8, -0.4, 5, {});             // defenders face the road bend
    P.sandbags(B, 2, 22, 0.1, 5, {});               // player-side cover
    P.crate(B, 12, 36, { stack: true });
    /* west ditch flank: crater → rubble → bushes reconverging at the bend */
    P.rubble(B, { x: -12, z: 8, r: 2.2, seed: 31 });
    P.bush(B, -16, 22, {}); P.bush(B, -14, -4, {});
    P.fence(B, -20, 28, -18, 2, { broken: true, gapAt: 0.5 });

    /* --- power line along the road (navigation rail) --- */
    let prevTop = null;
    for (const [px, pz] of [[10, 150], [8, 110], [4, 70], [10, 30], [6, -10], [10, -50], [6, -90]]) {
      prevTop = P.powerPole(B, px, pz, prevTop);
    }

    /* ================= ZONE 3 — THE VILLAGE (CQB) ====================== */
    /* houses FACE the road; well is the focal point; fenced yards form alleys */
    P.house(B, { x: -22, z: -52, ry: 1.62, w: 7.5, d: 6.5, floors: 1, seed: 44, front: 'S', damage: 2 });
    P.house(B, { x: 16, z: -66, ry: -1.5, w: 8, d: 7, floors: 1, seed: 55, front: 'S', damage: 1, ajar: true });
    P.house(B, { x: -14, z: -86, ry: 0.15, w: 9, d: 7.5, floors: 2, seed: 66, front: 'N', damage: 0 }); // height point
    P.house(B, { x: 18, z: -94, ry: -1.35, w: 7.5, d: 6.5, floors: 1, seed: 77, front: 'S', damage: 1 });
    P.well(B, 0, -70);                              // village focal
    P.sign(B, -2, -44, 0.2);
    P.lamp(B, 6, -52, {});
    P.waterPump(B, -20, -78);
    /* road cover chain into the village */
    P.sandbags(B, 0, -46, 0.2, 5, {});
    P.sandbags(B, -6, -58, 1.35, 5.5, {});          // defenders face north up the road
    P.sandbags(B, 4, -74, -0.5, 4.5, {});
    P.drum(B, -16, -62, { tipped: true });
    P.drum(B, -15, -60.4, {});
    P.crate(B, 8, -60, {});
    P.crate(B, 9.3, -60.6, { s: 0.75 });
    /* west alley flank: rubble → yard fences with gaps → rear doors */
    P.rubble(B, { x: -26, z: -48, r: 2, seed: 8 });
    P.fence(B, -30, -70, -28, -94, { broken: true, gapAt: 0.5 });
    P.fence(B, -30, -46, -30, -68, { broken: true });
    P.tree(B, -34, -60, {}); P.bush(B, -32, -74, {});
    /* east orchard flank */
    P.copse(B, 32, -72, 4, 9);
    P.fence(B, 26, -58, 30, -84, { broken: true, gapAt: 0.5 });

    /* ================= ZONE 4 — THE BARN (defend) ====================== */
    P.barn(B, { x: -62, z: -116, ry: 0.5 });        // hay loft = height point
    P.sandbags(B, -52, -106, 2.1, 6, {});
    P.sandbags(B, -70, -104, 0.9, 5, {});
    P.crate(B, -52, -122, { stack: true });
    P.drum(B, -73, -120, {});
    P.husk(B, -44, -112, -0.7);
    P.smokeColumn(B, -44, -112, null);
    P.tree(B, -84, -100, { s: 1.3 }); P.tree(B, -40, -132, {});
    P.deadTree(B, -30, -100);
    P.copse(B, -20, -120, 3, 8);

    /* boundary treeline + fields */
    P.edgeForest(B, 52, 138, 172, { skip: (x, z) => Math.abs(x) < 26 && z > 120 });
    P.scatterGrass(B, 10000, 165, 0x5d6b38);
    P.scatterRocks(B, 170, 180);

    return {
      playerSpawn: { x: 4, z: 158, ry: Math.PI },   // facing -z (north)
      squad: [{ x: 1, z: 162 }, { x: 8, z: 163 }, { x: -3, z: 160 }],
      enemies: [
        /* farm: line faces the southern approach, patrol walks the road */
        { type: 'patrol', x: -4, z: 84, count: 2, radius: 14, group: 'farmA' },
        { type: 'guard', x: -28, z: 51, count: 1, dir: [0.3, 1], group: 'farmA' },
        { type: 'guard', x: -38, z: 53, count: 1, dir: [0.4, 1], group: 'farmA' },
        { type: 'guard', x: -32, z: 64, count: 1, dir: [0.5, 1], group: 'farmA' },
        /* crossroads: anchor upstairs covers the road, line behind bags */
        { type: 'guard', x: 30, z: -8, count: 2, dir: [-0.3, 1], group: 'houseB' },
        { type: 'guard', x: 36, z: 8, count: 1, dir: [-0.2, 1], upstairs: true, group: 'houseB' },
        { type: 'guard', x: 44, z: 0, count: 1, dir: [-0.5, 1], group: 'houseB' },
        /* village: defenders behind cover facing the approach, patrol on road */
        { type: 'patrol', x: -6, z: -64, count: 3, radius: 16, group: 'village' },
        { type: 'guard', x: -6, z: -57, count: 2, dir: [0.3, 1], group: 'village' },
        { type: 'guard', x: 4, z: -73, count: 1, dir: [0, 1], group: 'village' },
        { type: 'guard', x: -14, z: -82, count: 2, dir: [0, 1], upstairs: true, group: 'village' },
        { type: 'guard', x: 18, z: -92, count: 1, dir: [-0.4, 1], group: 'village' },
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
  let countdownFail = null;
  M.startTimer = function (sec, onExpire) { RT.ui.setTimer(sec); countdownFail = onExpire; };
  M.stopTimer = function () { RT.ui.clearTimer(); countdownFail = null; };

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
    if (countdownFail) {
      const left = RT.ui.tickTimer(dt);
      if (left <= 0 && left > -1e8) { const fn = countdownFail; countdownFail = null; RT.ui.clearTimer(); fn(); }
    }
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

/* ============ MISSION 2 — DEAD WIRE ============ */
RT.missions.push({
  id: 2, title: 'DEAD WIRE', sub: 'Kestrel Town — 0230 Hours',
  desc: 'Night infiltration of a ruined town in the rain. Cut their comms, survive the answer.',
  loadout: ['m4', 'pistol'],
  stealth: true, weather: 'rain', ambient: 'rain',
  atmosphere: {
    top: 0x060b14, horizon: 0x14202e, ground: 0x0a0d12,
    sunDir: new THREE.Vector3(0.35, 0.6, 0.3), sunColor: 0x8fa9c9, sunIntensity: 0.55,
    sunDiscColor: 0xd9e4f0, sunGlow: 0.1, sunVisible: true,
    hemiSky: 0x3d5069, hemiGround: 0x14181f, hemiIntensity: 0.52,
    fogColor: 0x0d141d, fogDensity: 0.0095, exposure: 0.92, fillIntensity: 0.08,
  },
  terrain: {
    size: 360, segs: 160, seed: 23, amp: 3.2, rim: 12,
    palette: { lush: 0x2c3626, lush2: 0x35402c, dirt: 0x3c3830, rock: 0x3a3a36, road: 0x30302e },
    flats: [{ x: 0, z: 0, r: 70 }, { x: 0, z: 90, r: 26 }, { x: -10, z: -80, r: 30 }],
    roads: [[[4, 150], [0, 60], [0, -20], [-6, -80], [0, -150]], [[-70, 4], [0, 0], [70, -8]]],
    craters: [{ x: -12, z: 34, r: 6, d: 2 }, { x: 14, z: -8, r: 7, d: 2.4 }, { x: -20, z: -40, r: 5.5, d: 2 }, { x: 30, z: 20, r: 5, d: 1.6 }],
  },
  buildMap(B) {
    const P = RT.props;
    /* ruined main street */
    P.house(B, { x: -16, z: 52, ry: 1.57, w: 8, d: 7, seed: 61, damage: 1, front: 'S', ajar: true });
    P.house(B, { x: 18, z: 38, ry: -1.57, w: 9, d: 7.5, seed: 62, damage: 2, front: 'S' });
    P.ruinBlock(B, { x: -22, z: 16, ry: 0.1, w: 12, d: 9, h: 6, seed: 63, damage: 1 });
    P.house(B, { x: 20, z: 4, ry: -1.4, w: 8.5, d: 7, seed: 64, damage: 1, floors: 2 });
    P.ruinBlock(B, { x: 22, z: -34, ry: -0.2, w: 11, d: 9, h: 6, seed: 65, damage: 1 });
    P.house(B, { x: -20, z: -26, ry: 1.7, w: 8, d: 6.5, seed: 66, damage: 2 });
    P.house(B, { x: -26, z: -58, ry: 0.4, w: 9, d: 7, seed: 67, damage: 1, floors: 2, ajar: true });
    P.house(B, { x: 16, z: -66, ry: -0.3, w: 8, d: 7, seed: 68, damage: 0 });
    P.house(B, { x: -2, z: -100, ry: 0.05, w: 9, d: 8, seed: 69, damage: 1 });
    /* radio truck (objective) at the plaza */
    P.husk(B, 6, -14, 0.4);
    B.buckets.std.push(
      RT.G.cyl(0.03, 0.05, 5, 6, 0x3a3d40, { x: 5.2, y: B.h(6, -14) + 3.4, z: -15 }),
      RT.G.box(0.7, 0.05, 0.05, 0x3a3d40, { x: 5.2, y: B.h(6, -14) + 5.6, z: -15 }));
    /* street clutter */
    P.husk(B, -8, 30, -1.2);
    P.husk(B, 4, -44, 2.6);
    P.rubble(B, { x: 10, z: 24, r: 3, seed: 12 });
    P.rubble(B, { x: -14, z: -8, r: 2.6, seed: 13 });
    P.rubble(B, { x: 2, z: -70, r: 2.4, seed: 14 });
    for (const [lx, lz] of [[-6, 44], [8, 12], [-8, -32], [6, -58], [-4, -88]]) P.lamp(B, lx, lz, { lit: Math.random() > 0.4 });
    P.sandbags(B, 0, -6, 1.6, 5, {});
    P.sandbags(B, -10, -50, 0.2, 4.5, {});
    P.crate(B, 12, -18, { stack: true });
    P.drum(B, -12, 20, { tipped: true });
    P.drum(B, -11, 21.5, {});
    P.tires(B, 14, 46);
    P.sign(B, -4, 60, 0.1);
    P.fence(B, -30, 40, -30, 8, { broken: true });
    P.fence(B, 28, 26, 30, -12, { broken: true });
    for (const [tx, tz] of [[-40, 60], [38, 48], [-44, -20], [42, -52], [-36, -90]]) P.deadTree(B, tx, tz);
    let prevTop = null;
    for (const [px, pz] of [[8, 120], [6, 80], [8, 40], [6, 0], [8, -40], [6, -80], [8, -120]]) prevTop = P.powerPole(B, px, pz, prevTop);
    /* window glow on a few intact windows */
    P.windowGlow(B, 16.9, B.h(16, -66) + 1.55, -63.4, -0.3 + Math.PI / 2, 1.1, 1.1);
    P.windowGlow(B, -24.5, B.h(-26, -58) + 4.3, -55.1, 0.4 + Math.PI / 2, 1.0, 1.0);
    P.scatterGrass(B, 8000, 150, 0x2c3626);
    P.edgeForest(B, 40, 130, 165, { species: undefined });
    P.scatterRocks(B, 120, 160);
    return {
      playerSpawn: { x: 4, z: 138, ry: Math.PI },
      squad: [{ x: 0, z: 142 }, { x: 8, z: 143 }],
      enemies: [
        { type: 'patrol', x: -12, z: 48, count: 2, radius: 14, group: 'street' },
        { type: 'guard', x: 4, z: 34, count: 1, dir: [0, 1], group: 'street' },
        { type: 'patrol', x: 2, z: -2, count: 2, radius: 16, group: 'plaza' },
        { type: 'guard', x: 0, z: -8, count: 1, dir: [0, 1], group: 'plaza' },
        { type: 'guard', x: 10, z: -20, count: 2, dir: [-0.5, 1], group: 'plaza' },
        { type: 'patrol', x: -18, z: -46, count: 2, radius: 12, group: 'south' },
      ],
    };
  },
});
RT.missions[1].intro = {
  path: [[-30, 26, 120], [-12, 10, 96], [0, 4.2, 74], [4, 2.8, 62]],
  look: [[0, 2, 20], [0, 2, 10], [2, 2, 0], [4, 1.6, -6]],
  dur: 13,
  lines: [
    { t: 0.6, who: 'LT. MARSH', text: 'Kestrel Town. Their long-range radio truck is parked in the plaza.' },
    { t: 4.6, who: 'LT. MARSH', text: 'Rain keeps their heads down. Move quiet, drop the charge, and we ghost out.' },
    { t: 8.6, who: 'DOC OKAFOR', text: 'And if it goes loud, it goes very loud. Mortars registered on that square.' },
  ],
};
RT.missions[1].objectives = function (M) {
  return [
    {
      text: 'Infiltrate the town (stay low, avoid the cones)', waypoint: { x: 0, z: 26 },
      onStart() { M.after(2, () => M.say('LT. MARSH', 'Vision’s short in this rain. Crouch, keep to the ruins, pick your moment.')); },
      check: () => M.reached(0, 26, 14),
    },
    {
      text: 'Set the charge on the radio truck', waypoint: { x: 6, z: -14 },
      onStart() {
        RT.map.interact.push({
          x: 6, y: RT.map.groundAt(6, -14, 99) + 1.2, z: -14, r: 2.6, label: 'SET CHARGE', once: true,
          fn: () => {
            M.say('RIDGE', 'Charge set. Thirty seconds on the clock.');
            RT.audio.chargeBeep(4);
            M.obj()._planted = true;
            M.after(3.2, () => {
              RT.player.explode(new THREE.Vector3(6, RT.map.groundAt(6, -14, 99) + 1, -14), 8, 40);
              RT.ai.alertAll();
              M.say('LT. MARSH', 'Truck’s burning! Every gun in town knows we’re here — fall back south!');
            });
          },
        });
      },
      check() { return !!this._planted && RT.engine.time > 0; },
    },
    {
      text: 'Fall back through the square — mortar fire!', waypoint: { x: -10, z: -78 },
      onStart() {
        this.mortarT = 3.5;
        M.after(2, () => M.say('DOC OKAFOR', 'MORTARS! Displace! Move move move!'));
      },
      update(dt) {
        this.mortarT -= dt;
        if (this.mortarT <= 0) {
          this.mortarT = 1.5 + Math.random() * 1.1;
          const p = RT.player.pos;
          const a = Math.random() * TAU, r = 4.5 + Math.random() * 8;
          const tx = p.x + Math.cos(a) * r, tz = p.z + Math.sin(a) * r;
          RT.audio.mortarWhistle(1.0);
          M.after(1.05, () => {
            const ty = RT.map.groundAt(tx, tz, 999);
            RT.player.explode(new THREE.Vector3(tx, ty + 0.3, tz), 5.5, 70);
          });
        }
      },
      check: () => M.reached(-10, -78, 12),
      onDone() { M.say('LT. MARSH', 'Out of the mortar box. Now they’re coming to finish it.'); },
    },
    {
      text: 'Break the counterattack', waypoint: { x: -2, z: -100 },
      onStart() {
        M.spawnWave([[-2, -118], [8, -110], [-14, -112], [4, -126], [-10, -124]], 'counter');
        RT.weapons.giveAmmo(0.5);
        RT.ui.refreshAmmo();
        if (RT.audio) RT.audio.combatStinger();
      },
      check: () => M.groupDead('counter'),
      onDone() { M.say('CPL. VANE', 'Street’s clear... I count zero movers.'); },
    },
    {
      text: 'Reach the extraction road', waypoint: { x: 0, z: -140 },
      onStart() { M.say('LT. MARSH', 'Wire’s dead, town’s blind. Extraction is south — good work tonight.'); },
      check: () => M.reached(0, -140, 10),
    },
  ];
};

/* ============ MISSION 3 — THE CROSSING ============ */
RT.missions.push({
  id: 3, title: 'THE CROSSING', sub: 'Sarn Gorge — 1700 Hours',
  desc: 'Fight through the cliffside village and drop the last bridge over the gorge.',
  loadout: ['dmr', 'm4'],
  weather: null, ambient: 'birds',
  atmosphere: {
    top: 0x35537a, horizon: 0xd9b083, ground: 0x584c3c,
    sunDir: new THREE.Vector3(0.7, 0.32, 0.5), sunColor: 0xffcf8e, sunIntensity: 2.1,
    sunDiscColor: 0xffe4b8, sunGlow: 0.3,
    hemiSky: 0xb9a98c, hemiGround: 0x4a4238, hemiIntensity: 0.5,
    fogColor: 0xcaa87b, fogDensity: 0.0032, exposure: 1.0, fillIntensity: 0.14,
  },
  terrain: {
    size: 400, segs: 164, seed: 37, amp: 5.5, rim: 16, tiltZ: 0.038,
    palette: { lush: 0x66703c, lush2: 0x7a7f44, dirt: 0x827052, rock: 0x7d7666, road: 0x746a58 },
    riverPath: [[-200, -30], [-60, -24], [40, -30], [200, -22]], riverWidth: 30, riverDepth: 12,
    flats: [{ x: 0, z: 16, r: 20, h: 7.5 }, { x: 0, z: -70, r: 24, h: 7.5 }, { x: -8, z: 78, r: 34 }, { x: 26, z: 120, r: 26 }, { x: 0, z: -96, r: 22, h: 7.8 }],
    roads: [[[10, 170], [22, 120], [-2, 80], [-2, 24], [0, 12]], [[0, -74], [0, -120], [-8, -170]]],
    craters: [{ x: -16, z: 60, r: 6, d: 2 }, { x: 18, z: 90, r: 5.5, d: 1.8 }],
  },
  buildMap(B) {
    const P = RT.props;
    /* terraced cliffside village on the south approach */
    P.house(B, { x: 30, z: 126, ry: -0.4, w: 8.5, d: 7, seed: 81, damage: 0, floors: 1 });
    P.house(B, { x: 16, z: 108, ry: 0.3, w: 8, d: 7, seed: 82, damage: 1, ajar: true });
    P.house(B, { x: -18, z: 92, ry: 1.5, w: 9, d: 7.5, seed: 83, damage: 0, floors: 2 });
    P.house(B, { x: -4, z: 66, ry: 0.1, w: 8, d: 6.5, seed: 84, damage: 1 });
    P.house(B, { x: -24, z: 58, ry: 1.2, w: 7.5, d: 6.5, seed: 85, damage: 2 });
    P.well(B, 8, 86);
    P.sandbags(B, 2, 96, 0.3, 5, {});
    P.sandbags(B, -12, 74, 1.8, 4.5, {});
    P.crate(B, 14, 74, { stack: true });
    P.drum(B, -8, 100, {});
    P.husk(B, 8, 56, 1.9);
    P.hayBale(B, { x: 24, z: 96 });
    P.fence(B, 36, 112, 30, 88, { broken: true });
    P.sign(B, 6, 44, -0.1);
    for (const [tx, tz] of [[46, 130], [-38, 100], [-40, 70], [50, 80], [-30, 130]]) P.tree(B, tx, tz, {});
    /* the bridge */
    const br = P.bridge(B, { x: 0, z0: -66, z1: 12, y: 7.7, w: 7, centerSpan: true });
    RT.map._bridgeCenter = br.centerMesh;
    /* deck cover */
    P.crate(B, -1.8, -8, { s: 1.0 });
    P.crate(B, 2, -22, { s: 0.9, stack: true });
    P.drum(B, -2, -36, {});
    P.crate(B, 1.5, -50, { s: 1.05 });
    /* MG nest + north fort */
    P.mgNest(B, 0, -76, Math.PI); // faces south down the bridge
    P.sandbags(B, -8, -80, 1.5, 5, {});
    P.sandbags(B, 8, -80, 1.7, 5, {});
    P.house(B, { x: -14, z: -94, ry: 0.2, w: 8, d: 7, seed: 86, damage: 1 });
    P.house(B, { x: 12, z: -98, ry: -0.25, w: 8.5, d: 7, seed: 87, damage: 0, ajar: true });
    P.crate(B, 2, -88, { stack: true });
    P.scatterGrass(B, 9000, 170, 0x66703c);
    P.edgeForest(B, 44, 150, 185, {});
    P.scatterRocks(B, 220, 190);
    return {
      playerSpawn: { x: 12, z: 156, ry: Math.PI },
      squad: [{ x: 8, z: 160 }, { x: 16, z: 161 }, { x: 4, z: 158 }],
      enemies: [
        { type: 'guard', x: 14, z: 106, count: 2, dir: [0, 1], group: 'village' },
        { type: 'patrol', x: -14, z: 88, count: 2, radius: 12, group: 'village' },
        { type: 'guard', x: -2, z: 94, count: 1, dir: [0.2, 1], group: 'village' },
        { type: 'guard', x: -10, z: 72, count: 2, dir: [0, 1], group: 'village2' },
        { type: 'guard', x: -22, z: 56, count: 1, dir: [0.5, 1], group: 'village2' },
        { type: 'guard', x: 4, z: 60, count: 1, dir: [0, 1], group: 'village2' },
        { type: 'guard', x: 0, z: -75, count: 2, dir: [0, 1], group: 'mg' },
        { type: 'guard', x: -8, z: -82, count: 1, dir: [0.3, 1], group: 'north' },
        { type: 'guard', x: 10, z: -86, count: 2, dir: [-0.3, 1], group: 'north' },
      ],
    };
  },
});
RT.missions[2].intro = {
  path: [[60, 30, -60], [30, 22, 30], [26, 16, 90], [18, 6, 140]],
  look: [[0, 8, -30], [0, 8, -10], [0, 8, 40], [8, 5, 110]],
  dur: 14,
  lines: [
    { t: 0.6, who: 'LT. MARSH', text: 'Sarn Gorge. One bridge left standing, and their armor rolls across it tonight.' },
    { t: 5.2, who: 'LT. MARSH', text: 'We push through the village, take the deck, and drop the whole span into the river.' },
    { t: 9.6, who: 'CPL. VANE', text: 'That MG on the far side is going to have opinions, LT.' },
    { t: 12, who: 'LT. MARSH', text: 'Then we change its mind. Go.' },
  ],
};
RT.missions[2].objectives = function (M) {
  return [
    {
      text: 'Fight down through the village', waypoint: { x: -4, z: 66 },
      onStart() { M.after(2, () => M.say('LT. MARSH', 'Take the terraces one at a time. The marksman rifle will reach across the gorge.')); },
      check: () => M.reached(-4, 66, 16) && M.groupDead('village'),
    },
    {
      text: 'Clear the lower terrace', waypoint: { x: -10, z: 58 },
      check: () => M.groupDead('village2'),
      onDone() { M.say('DOC OKAFOR', 'Terrace clear. That bridge looks a lot longer from here.'); },
    },
    {
      text: 'Silence the MG across the bridge', waypoint: { x: 0, z: -76 },
      onStart() {
        M.say('LT. MARSH', 'MG on the far bank! Crouch low, move cover to cover between bursts!');
        this.mgT = 2;
      },
      update(dt) {
        /* scripted suppression while the MG crew lives */
        if (M.groupDead('mg')) return;
        this.mgT -= dt;
        if (this.mgT <= 0) {
          this.mgT = 2.2 + Math.random() * 1.4;
          const p = RT.player.pos;
          if (p.z < 20 && p.z > -70) {
            const from = new THREE.Vector3(0, 9.4, -76);
            const burst = 6;
            for (let i = 0; i < burst; i++) {
              setTimeout(() => {
                const overhead = RT.player.crouched ? 1.15 : 0.45;
                const to = new THREE.Vector3(p.x + (Math.random() - 0.5) * 2.2, RT.player.eyeY() + overhead + Math.random() * 0.5, p.z + (Math.random() - 0.5) * 2);
                const dir = to.clone().sub(from).normalize();
                RT.engine.tracer(from, dir, 90, 320);
                if (RT.audio) { RT.audio.enemyShot(Math.hypot(p.x, p.z + 76)); if (Math.random() < 0.5) RT.audio.crack(); }
                if (!RT.player.crouched && Math.random() < 0.16) RT.player.damage(6 + Math.random() * 5, from);
              }, i * 90);
            }
          }
        }
      },
      check: () => M.groupDead('mg'),
      onDone() { M.say('CPL. VANE', 'MG down! Deck’s yours, Sergeant!'); },
    },
    {
      text: 'Plant charges on both piers', waypoint: { x: 0, z: -18 },
      onStart() {
        M.say('LT. MARSH', 'Two charges — mid-span piers. Vane, watch the north bank.');
        this.planted = 0;
        const mkCharge = (cx, cz) => {
          RT.map.interact.push({
            x: cx, y: 8.2, z: cz, r: 2.2, label: 'PLANT CHARGE', once: true,
            fn: () => {
              this.planted++;
              RT.audio.chargeBeep(3);
              M.say('RIDGE', this.planted === 2 ? 'Both charges set!' : 'First charge set.');
              if (this.planted === 1) RT.ui.waypointTargets[0] = { x: 0, y: 9, z: -38 };
            },
          });
        };
        mkCharge(0, -18); mkCharge(0, -38);
      },
      check() { return this.planted >= 2; },
    },
    {
      text: 'Get clear of the bridge', waypoint: { x: 4, z: 34 },
      onStart() {
        M.say('LT. MARSH', 'Charges are hot! Get off the deck — south side, NOW!');
        M.startTimer(25, () => {
          M.say('DOC OKAFOR', 'Too close! You’re inside the blast—');
          RT.player.damage(999, new THREE.Vector3(0, 8, -28));
        });
      },
      check: () => M.reached(4, 34, 14),
      onDone() { M.stopTimer(); },
    },
    {
      text: '', hidden: true,
      onStart() {
        /* bridge drop cutscene */
        RT.game.playCutscene({
          path: [[34, 16, 30], [40, 14, -8], [36, 12, -40]],
          look: [[0, 9, -10], [0, 8, -25], [0, 6, -40]],
          dur: 8.5,
          lines: [{ t: 5.6, who: 'LT. MARSH', text: 'Span’s in the river. Nothing heavier than a rumor crosses that gorge now.' }],
          onUpdate: (t) => {
            const c = RT.map._bridgeCenter;
            if (!c) return;
            if (t > 1.4 && !c._blown) {
              c._blown = true;
              RT.fxExplosion(new THREE.Vector3(0, 8.4, -18), 7);
              RT.fxExplosion(new THREE.Vector3(0, 8.4, -38), 7);
              RT.engine.shake(1);
            }
            if (t > 1.7) {
              const k = (t - 1.7);
              c.position.y -= (2 + 5 * k) * 0.016 * 4;
              c.rotation.x += 0.012 + k * 0.004;
              if (!c._splash && c.position.y < -12) {
                c._splash = true;
                for (let i = 0; i < 20; i++)
                  RT.engine.particle((Math.random() - .5) * 8, -6, -28 + (Math.random() - .5) * 20, (Math.random() - .5) * 4, 5 + Math.random() * 5, (Math.random() - .5) * 4,
                    { color: 0x9fb4c8, size: 0.5, life: 1.2, grav: -9, drag: 1 });
              }
            }
          },
        }, () => RT.game.missionComplete());
      },
      check: () => false,
    },
  ];
};

/* ============ MISSION 4 — HOLLOW POINT ============ */
RT.missions.push({
  id: 4, title: 'HOLLOW POINT', sub: 'Bren District — 0900 Hours',
  desc: 'Overcast urban clear. Room by room, breach by breach.',
  loadout: ['shotgun', 'm4'],
  weather: null, ambient: 'none',
  atmosphere: {
    top: 0x5d666e, horizon: 0x9aa0a2, ground: 0x4c4a45,
    sunDir: new THREE.Vector3(-0.3, 0.75, -0.2), sunColor: 0xcdd2d4, sunIntensity: 0.85,
    sunVisible: false,
    hemiSky: 0x9ba4ab, hemiGround: 0x494740, hemiIntensity: 0.62,
    fogColor: 0x8f9598, fogDensity: 0.006, exposure: 0.94, fillIntensity: 0.2,
  },
  terrain: {
    size: 340, segs: 160, seed: 51, amp: 2.4, rim: 10,
    palette: { lush: 0x4d5537, lush2: 0x5a6040, dirt: 0x5b5546, rock: 0x5f5b50, road: 0x53514c },
    flats: [{ x: 0, z: 0, r: 90 }],
    roads: [[[0, 140], [0, 40], [0, -40], [0, -130]], [[-60, 42], [0, 40], [60, 38]], [[-60, -42], [0, -40], [60, -44]]],
    craters: [{ x: -18, z: 12, r: 5.5, d: 1.8 }, { x: 22, z: -60, r: 6, d: 2 }],
  },
  buildMap(B) {
    const P = RT.props;
    /* block A: breach house */
    P.house(B, { x: -18, z: 66, ry: 1.57, w: 9, d: 7.5, seed: 91, damage: 0, front: 'S', breach: true, ajar: false, porch: false });
    P.house(B, { x: 20, z: 70, ry: -1.57, w: 8, d: 7, seed: 92, damage: 1 });
    P.ruinBlock(B, { x: -26, z: 30, ry: 0, w: 13, d: 10, h: 6, seed: 93, damage: 1 });
    P.ruinBlock(B, { x: 26, z: 26, ry: 0.1, w: 11, d: 9, h: 9, seed: 94 });
    /* block B */
    P.house(B, { x: -20, z: -8, ry: 1.6, w: 8.5, d: 7, seed: 95, damage: 0, breach: true, porch: false });
    P.house(B, { x: 22, z: -16, ry: -1.5, w: 9, d: 7.5, seed: 96, damage: 1, floors: 2, ajar: true });
    P.ruinBlock(B, { x: -28, z: -52, ry: -0.1, w: 12, d: 9, h: 6, seed: 97, damage: 1 });
    P.house(B, { x: 18, z: -62, ry: -1.65, w: 8, d: 7, seed: 98, damage: 0, breach: true, porch: false });
    P.house(B, { x: -12, z: -92, ry: 0.15, w: 9.5, d: 8, seed: 99, damage: 1, floors: 2 });
    /* street furniture */
    for (const [lx, lz] of [[-6, 52], [6, 14], [-6, -28], [6, -72]]) P.lamp(B, lx, lz, {});
    P.husk(B, 6, 44, 1.6);
    P.husk(B, -4, -34, -1.4);
    P.sandbags(B, 0, 24, 1.6, 6, {});
    P.sandbags(B, -8, -60, 0.1, 5, {});
    P.crate(B, 10, 4, { stack: true });
    P.crate(B, -12, 40, {});
    P.drum(B, 12, -44, {});
    P.drum(B, 13.5, -44.5, { tipped: true });
    P.tires(B, -10, 70);
    P.rubble(B, { x: 8, z: -20, r: 2.5, seed: 21 });
    P.rubble(B, { x: -16, z: 52, r: 2.2, seed: 22 });
    P.sign(B, 4, 90, 0);
    P.sign(B, -4, -14, 0.2);
    P.fence(B, 32, 60, 34, 34, { broken: true });
    P.fence(B, -34, 16, -36, -12, { broken: true });
    for (const [tx, tz] of [[-44, 80], [44, 56], [-46, -36], [40, -80]]) P.deadTree(B, tx, tz);
    let prevTop = null;
    for (const [px, pz] of [[10, 110], [8, 70], [10, 30], [8, -10], [10, -50], [8, -90]]) prevTop = P.powerPole(B, px, pz, prevTop);
    P.scatterGrass(B, 8000, 140, 0x4d5537);
    P.edgeForest(B, 36, 120, 155, {});
    P.scatterRocks(B, 90, 150);
    return {
      playerSpawn: { x: 2, z: 120, ry: Math.PI },
      squad: [{ x: -2, z: 124 }, { x: 6, z: 125 }, { x: -6, z: 122 }],
      enemies: [
        { type: 'guard', x: -18, z: 64, count: 2, dir: [0, 1], group: 'houseA', upstairs: true },
        { type: 'guard', x: 22, z: 68, count: 1, dir: [0, 1], group: 'blockA' },
        { type: 'patrol', x: 0, z: 34, count: 2, radius: 14, group: 'blockA' },
        { type: 'guard', x: 26, z: 26, count: 2, dir: [-0.4, 1], group: 'blockA' },
        { type: 'guard', x: -20, z: -10, count: 2, dir: [1, 0.2], group: 'houseB', upstairs: true },
        { type: 'guard', x: 22, z: -18, count: 2, dir: [-1, 0.3], group: 'blockB' },
        { type: 'patrol', x: -6, z: -48, count: 3, radius: 15, group: 'blockB' },
        { type: 'guard', x: 18, z: -64, count: 2, dir: [-1, 0], group: 'houseC', upstairs: true },
        { type: 'guard', x: -12, z: -90, count: 2, dir: [0, 1], group: 'final' },
      ],
    };
  },
});
RT.missions[3].intro = {
  path: [[-40, 24, 150], [-16, 10, 132], [-2, 4, 126], [2, 2.6, 122]],
  look: [[0, 3, 60], [0, 3, 60], [0, 2, 70], [0, 1.8, 80]],
  dur: 12,
  lines: [
    { t: 0.6, who: 'LT. MARSH', text: 'Bren District. Every doorway is a decision. Shotgun up front — that’s you, Ridge.' },
    { t: 5.4, who: 'CPL. VANE', text: 'Room clearing. Great. My favorite kind of birthday.' },
    { t: 8.8, who: 'DOC OKAFOR', text: 'Kid, stay behind the Sergeant’s muzzle and you’ll get more birthdays.' },
  ],
};
RT.missions[3].objectives = function (M) {
  return [
    {
      text: 'Breach the corner house (F to kick the door)', waypoint: { x: -18, z: 61 },
      onStart() { M.after(2, () => M.say('LT. MARSH', 'First stack. Kick it, ride the slow-second, drop everything standing.')); },
      check: () => M.groupDead('houseA'),
      onDone() { M.say('CPL. VANE', 'Clear! ...That slow-motion thing ever stop feeling weird?'); },
    },
    {
      text: 'Clear Block A', waypoint: { x: 8, z: 30 },
      check: () => M.groupDead('blockA'),
    },
    {
      text: 'Breach the second house', waypoint: { x: -20, z: -12 },
      check: () => M.groupDead('houseB'),
      onDone() {
        /* Vane's arc payoff */
        RT.game.playCutscene({
          path: [[-16, 2.2, -4], [-17.5, 1.9, -7.5]],
          look: [[-20, 1.5, -9], [-20, 1.4, -9.5]],
          dur: 9,
          lines: [
            { t: 0.6, who: 'CPL. VANE', text: '...He was aiming at you, Sergeant. I didn’t freeze. Not this time.' },
            { t: 4.4, who: 'DOC OKAFOR', text: 'No, you didn’t. Welcome to the squad, kid. For real, this time.' },
            { t: 7.2, who: 'LT. MARSH', text: 'Save it for the ride home. Two blocks left.' },
          ],
        }, () => RT.game.resumeFromCutscene());
      },
    },
    {
      text: 'Clear Block B', waypoint: { x: -6, z: -48 },
      check: () => M.groupDead('blockB'),
    },
    {
      text: 'Breach the last strongpoint', waypoint: { x: 18, z: -58 },
      onStart() { M.say('LT. MARSH', 'Last strongpoint. Same play — breach and clear.'); },
      check: () => M.groupDead('houseC'),
    },
    {
      text: 'Secure the district — final holdout', waypoint: { x: -12, z: -92 },
      check: () => M.groupDead('final'),
      onDone() {
        M.say('LT. MARSH', 'District secure. That’s how you hollow a town out, people.');
        M.after(2.2, () => M.say('DOC OKAFOR', 'And nobody needed me today. Best kind of day.'));
      },
    },
    { text: '', hidden: true, check: () => false, onStart: () => { M.after(4, () => RT.game.missionComplete()); } },
  ];
};

/* ============ MISSION 5 — ROLLING THUNDER ============ */
RT.missions.push({
  id: 5, title: 'ROLLING THUNDER', sub: 'Volan Hill — The Storm',
  desc: 'The hilltop fortress. Break the wall, take the courtyard, burn the command bunker. End it.',
  loadout: ['m4', 'shotgun'],
  weather: 'storm', ambient: 'storm',
  atmosphere: {
    top: 0x141a24, horizon: 0x3a4148, ground: 0x14161a,
    sunDir: new THREE.Vector3(0.3, 0.5, 0.45), sunColor: 0x8895aa, sunIntensity: 0.5,
    sunVisible: false,
    hemiSky: 0x4a5666, hemiGround: 0x1a1c20, hemiIntensity: 0.42,
    fogColor: 0x272d35, fogDensity: 0.0075, exposure: 0.9, fillIntensity: 0.08,
  },
  terrain: {
    size: 400, segs: 164, seed: 73, amp: 9, rim: 20,
    palette: { lush: 0x3b452c, lush2: 0x46503a, dirt: 0x4a4438, rock: 0x53514c, road: 0x45423c },
    flats: [{ x: 0, z: -80, r: 52, h: 15 }, { x: 6, z: 40, r: 20, h: 6 }, { x: 2, z: 120, r: 24 }],
    roads: [[[6, 160], [6, 100], [2, 40], [0, -10], [0, -50]]],
    craters: [{ x: -14, z: 20, r: 6, d: 2 }, { x: 16, z: -10, r: 6.5, d: 2.2 }],
  },
  buildMap(B) {
    const P = RT.props;
    /* fortress perimeter on the plateau */
    const H = 4.2;
    P.stoneWall(B, -34, -46, -8, -46, H);   // south wall west of gate
    P.stoneWall(B, 8, -46, 34, -46, H);     // south wall east of gate
    P.stoneWall(B, -34, -46, -34, -114, H);
    P.stoneWall(B, 34, -46, 34, -114, H);
    P.stoneWall(B, -34, -114, 34, -114, H);
    /* gate barricade (destructible) */
    const gy = B.h(0, -46);
    const barrGeos = [
      RT.G.box(7.6, 2.4, 0.9, 0x5e4a34, { x: 0, y: gy + 1.2, z: -46, vary: 0.15 }),
      RT.G.box(8, 0.5, 1.2, 0x4a3c2c, { x: 0, y: gy + 2.6, z: -46 }),
      RT.G.cyl(0.09, 0.09, 3.4, 6, 0x3a3026, { x: -2.4, y: gy + 1.4, z: -45.6, rz: 0.6 }),
      RT.G.cyl(0.09, 0.09, 3.4, 6, 0x3a3026, { x: 2.2, y: gy + 1.5, z: -46.3, rz: -0.7 }),
    ];
    const barricade = RT.meshOf(barrGeos, RT.MAT.std);
    B.group.add(barricade);
    const barrCol = B.collide(0, gy + 1.5, -46, 8, 3.2, 1.4);
    RT.map._gate = { mesh: barricade, col: barrCol };
    P.mgNest(B, -6, -50, 0.1);
    /* courtyard */
    P.ruinBlock(B, { x: -20, z: -70, ry: 0.05, w: 12, d: 9, h: 6, seed: 111 });
    P.ruinBlock(B, { x: 20, z: -78, ry: -0.1, w: 11, d: 9, h: 6, seed: 112, damage: 1 });
    P.bunker(B, { x: 0, z: -102, ry: 0 });
    P.sandbags(B, 0, -62, 1.6, 6, {});
    P.sandbags(B, -14, -88, 0.2, 5, {});
    P.sandbags(B, 14, -92, 3, 5, {});
    P.crate(B, 6, -70, { stack: true });
    P.crate(B, -8, -80, {});
    P.drum(B, 10, -60, {});
    P.drum(B, -24, -92, { tipped: true });
    P.husk(B, 12, -52, 0.8);
    /* approach road: checkpoints and cover */
    P.sandbags(B, 4, 36, 1.5, 5, {});
    P.house(B, { x: 14, z: 44, ry: -0.4, w: 8, d: 7, seed: 113, damage: 2 });
    P.husk(B, -4, 24, -0.9);
    P.crate(B, -8, 8, { stack: true });
    P.sandbags(B, -2, -8, 0.2, 5, {});
    P.rubble(B, { x: 8, z: -24, r: 2.6, seed: 23 });
    P.sandbags(B, 2, -34, 1.4, 5, {});
    for (const [tx, tz] of [[-30, 60], [34, 30], [-36, 0], [40, -20], [-28, 96], [30, 90]]) P.deadTree(B, tx, tz);
    P.scatterGrass(B, 8500, 170, 0x3b452c);
    P.edgeForest(B, 42, 150, 185, {});
    P.scatterRocks(B, 240, 180);
    return {
      playerSpawn: { x: 2, z: 140, ry: Math.PI },
      squad: [{ x: -2, z: 144 }, { x: 6, z: 145 }, { x: -6, z: 142 }],
      enemies: [
        { type: 'guard', x: 6, z: 38, count: 2, dir: [0, 1], group: 'road' },
        { type: 'patrol', x: -2, z: 10, count: 2, radius: 14, group: 'road' },
        { type: 'guard', x: 0, z: -34, count: 2, dir: [0, 1], group: 'road2' },
        { type: 'guard', x: -6, z: -50, count: 2, dir: [0, 1], group: 'gate' },
        { type: 'guard', x: 6, z: -52, count: 1, dir: [0, 1], group: 'gate' },
        { type: 'guard', x: -18, z: -68, count: 2, dir: [0.4, 1], group: 'court' },
        { type: 'guard', x: 18, z: -76, count: 2, dir: [-0.4, 1], group: 'court' },
        { type: 'patrol', x: 0, z: -84, count: 2, radius: 12, group: 'court' },
        { type: 'guard', x: -3, z: -100, count: 1, dir: [0, 1], group: 'bunker' },
        { type: 'guard', x: 3, z: -104, count: 2, dir: [0, 1], group: 'bunker' },
      ],
    };
  },
});
RT.missions[4].intro = {
  path: [[-60, 40, -140], [-30, 30, -40], [-6, 16, 60], [2, 4, 120]],
  look: [[0, 18, -80], [0, 16, -80], [0, 10, -60], [0, 4, 60]],
  dur: 15,
  lines: [
    { t: 0.8, who: 'LT. MARSH', text: 'Volan Hill. Their last command bunker sits inside that fortress wall.' },
    { t: 5.4, who: 'LT. MARSH', text: 'Storm’s rolling in with us. We breach the gate, clear the courtyard, and burn their war from the inside.' },
    { t: 10.6, who: 'DOC OKAFOR', text: 'Whole sky’s about to come down on this hill.' },
    { t: 13, who: 'CPL. VANE', text: 'Good. Let it. Rolling thunder, right, Sergeant?' },
  ],
};
RT.missions[4].objectives = function (M) {
  return [
    {
      text: 'Fight up the hill road', waypoint: { x: 0, z: -34 },
      onStart() { M.after(2, () => M.say('LT. MARSH', 'Checkpoints up the whole climb. Use the wrecks, watch the lightning — it’ll light them up for you.')); },
      check: () => M.reached(0, -34, 16) && M.groupDead('road') && M.groupDead('road2'),
    },
    {
      text: 'Blast the gate barricade', waypoint: { x: 0, z: -45 },
      onStart() {
        M.say('LT. MARSH', 'Gate’s blocked solid. Charge on the barricade!');
        RT.map.interact.push({
          x: 0, y: RT.map.groundAt(0, -44, 99) + 1.2, z: -44.6, r: 2.4, label: 'SET CHARGE', once: true,
          fn: () => {
            RT.audio.chargeBeep(3);
            M.say('RIDGE', 'Charge set — backblast clear!');
            M.after(2.6, () => {
              const g = RT.map._gate;
              RT.fxExplosion(new THREE.Vector3(0, RT.map.groundAt(0, -46, 99) + 1.4, -46), 7);
              g.mesh.visible = false;
              g.col.disabled = true;
              RT.ai.alertAll();
              this._blown = true;
              M.say('LT. MARSH', 'Gate’s open! Into the courtyard — go loud, go fast!');
            });
          },
        });
      },
      check() { return !!this._blown; },
    },
    {
      text: 'Take the courtyard', waypoint: { x: 0, z: -80 },
      onStart() {
        M.after(3, () => { M.spawnWave([[-24, -100], [24, -96]], 'court'); });
        if (RT.audio) RT.audio.combatStinger();
      },
      check: () => M.groupDead('gate') && M.groupDead('court'),
      onDone() { M.say('DOC OKAFOR', 'Courtyard’s ours. Bunker door is on the south face.'); },
    },
    {
      text: 'Clear the command bunker', waypoint: { x: 0, z: -98 },
      check: () => M.groupDead('bunker'),
      onDone() { M.say('CPL. VANE', 'Bunker clear! That’s their whole command net on that table.'); },
    },
    {
      text: 'Rig the bunker — end this war', waypoint: { x: 0, z: -102 },
      onStart() {
        RT.map.interact.push({
          x: -1.5, y: RT.map.groundAt(0, -102, 99) + 1.2, z: -103, r: 2.6, label: 'SET CHARGES', once: true,
          fn: () => {
            RT.audio.chargeBeep(5);
            this._rigged = true;
            M.say('LT. MARSH', 'Charges hot! Sixty seconds — everyone OUT! Down the hill, extraction south!');
          },
        });
      },
      check() { return !!this._rigged; },
    },
    {
      text: 'ESCAPE — get off the hill!', waypoint: { x: 2, z: 60 },
      onStart() {
        M.startTimer(60, () => {
          M.say('DOC OKAFOR', 'The bunker— RIDGE, NO—');
          RT.player.damage(999, new THREE.Vector3(0, 16, -102));
        });
        this.rumbleT = 1.2;
        M.spawnWave([[-16, -60], [18, -66]], 'lastgasp');
      },
      update(dt) {
        this.rumbleT -= dt;
        if (this.rumbleT <= 0) {
          this.rumbleT = 1.1 + Math.random() * 0.9;
          const p = RT.player.pos;
          const behind = p.z - 14 - Math.random() * 18;
          const bx = p.x + (Math.random() - 0.5) * 22;
          RT.fxExplosion(new THREE.Vector3(bx, RT.map.groundAt(bx, behind, 999) + 0.4, behind), 5);
        }
      },
      check: () => M.reached(2, 60, 16),
      onDone() {
        M.stopTimer();
        RT.fxExplosion(new THREE.Vector3(0, 18, -102), 20);
        RT.engine.shake(1.2);
      },
    },
    {
      text: '', hidden: true,
      onStart() {
        RT.game.playCutscene({
          path: [[10, 4, 80], [24, 10, 110], [40, 22, 150]],
          look: [[0, 16, -80], [0, 14, -80], [0, 12, -80]],
          dur: 12,
          lines: [
            { t: 1.2, who: 'DOC OKAFOR', text: 'There it goes. The whole net — command, comms, all of it.' },
            { t: 5.2, who: 'LT. MARSH', text: 'Velkan Ridge is quiet. First time in three years.' },
            { t: 8.8, who: 'CPL. VANE', text: 'Rolling thunder, Sergeant. Let’s go home.' },
          ],
          onUpdate: (t) => {
            if (t > 0.5 && !this._boom) {
              this._boom = true;
              RT.fxExplosion(new THREE.Vector3(0, 16, -102), 16);
              RT.fxExplosion(new THREE.Vector3(-8, 15, -95), 10);
              RT.fxExplosion(new THREE.Vector3(8, 15, -108), 10);
              if (RT.audio) RT.audio.explosion(60);
            }
          },
        }, () => RT.game.missionComplete());
      },
      check: () => false,
    },
  ];
};

/* map viewer support (Gate C) */
RT.buildMissionWorld = function (idx) {
  const def = RT.missions[idx];
  RT.engine.setAtmosphere(def.atmosphere);
  const terrain = new RT.Terrain(def.terrain);
  const B = new RT.MapBuilder(terrain, def.terrain.seed);
  RT.map = B;
  RT.map.def = def;
  const info = def.buildMap(B);
  const group = B.finalize();
  RT.engine.world.add(group);
  RT.map.info = info;
  return { B, info, def };
};
