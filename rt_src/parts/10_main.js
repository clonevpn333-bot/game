/* ============================================================
 * Game orchestrator: boot, menu backdrop, mission lifecycle,
 * cutscenes, checkpoints, pause, stats, main loop dispatch.
 * ============================================================ */
RT.game = (() => {
  const GA = {};
  GA.state = 'boot';           // boot|menu|cutscene|engage|play|pause|dead|end
  GA.missionIdx = 0;
  GA.stats = { shots: 0, hits: 0, kills: 0, heads: 0, start: 0 };
  GA.cutscene = null;
  let checkpoint = null;
  let combatStingerCd = 0;
  let menuDrift = 0;
  let engageEl = null;

  /* ---------- menu backdrop: dawn drift over Mission 1 map ---------- */
  GA.showMenuWorld = function () {
    RT.engine.clearWorld();
    RT.ai.reset();
    RT.buildMissionWorld(0);
    RT.engine.setWeather(null);
    menuDrift = 0;
    GA.state = 'menu';
    RT.ui.showHUD(false);
    RT.ui.showMenu();
    RT.ui.fade(false, true);
    RT.audio.menuMusic(true);
    RT.audio.setAmbient('birds');
    /* weapon propped in the foreground on sandbags */
    const rifle = RT.character.buildNPCRifle();
    rifle.position.set(-24.6, RT.map.groundAt(-25, 55, 999) + 0.9, 54.6);
    rifle.rotation.set(0.2, 0.7, 1.25);
    RT.engine.world.add(rifle);
    const rig = RT.character.build({ faction: 'ally', seed: 5, headgear: 'helmet' });
    rig.group.position.set(-27.5, RT.map.groundAt(-27.5, 53.4, 999), 53.4);
    rig.group.rotation.y = 2.2;
    rig.anim.mode = 'guard';
    RT.engine.world.add(rig.group);
    GA._menuRig = rig;
  };

  function updateMenu(dt) {
    menuDrift += dt;
    const cam = RT.engine.camera;
    const t = menuDrift * 0.021;
    const cx = -20 + Math.sin(t) * 16, cz = 66 + Math.cos(t * 0.8) * 18;
    const cy = RT.map.groundAt(cx, cz, 999) + 3.6 + Math.sin(t * 2.2) * 0.4;
    cam.position.set(cx, cy, cz);
    cam.lookAt(-34, RT.map.groundAt(-34, 68, 999) + 2.2, 68);
    cam.rotation.z = Math.sin(t * 0.7) * 0.012;
    if (GA._menuRig) RT.character.pose(GA._menuRig, dt);
    RT.engine.updateSun(cam.position);
  }

  /* ---------- mission lifecycle ---------- */
  GA.startMission = function (idx) {
    if (idx >= RT.missions.length) { GA.quitToMenu(); return; }
    RT.audio.ensure();
    RT.audio.menuMusic(false);
    GA.missionIdx = idx;
    RT.ui.hideScreens();
    RT.ui.fade(true);
    setTimeout(() => {
      RT.engine.clearWorld();
      RT.ai.reset();
      const { info, def } = RT.buildMissionWorld(idx);
      GA.info = info; GA.def = def;
      /* spawn actors */
      RT.player.init(info.playerSpawn);
      RT.ai.spawnAllies(info.squad || []);
      for (const g of info.enemies || []) {
        for (let i = 0; i < (g.count || 1); i++) {
          const ox = i === 0 ? 0 : (Math.random() - 0.5) * 6;
          const oz = i === 0 ? 0 : (Math.random() - 0.5) * 6;
          RT.ai.spawnEnemy(g.x + ox, g.z + oz, g);
        }
      }
      RT.weapons.setLoadout(def.loadout, true);
      RT.player.grenades = 4;
      GA.stats = { shots: 0, hits: 0, kills: 0, heads: 0, start: RT.engine.time };
      RT.audio.setAmbient(def.ambient);
      RT.engine.setWeather(def.weather || null);
      RT.ui.clearTimer();
      RT.ui.clearSubtitles();
      RT.ui.fade(false, true);
      if (def.intro) GA.playCutscene(def.intro, beginPlay);
      else beginPlay();
      if (def.onMissionStart) def.onMissionStart(GA);
    }, 750);
  };

  function beginPlay() {
    RT.missionRuntime.start(GA.def, GA.info);
    RT.ui.showHUD(true);
    RT.ui.refreshAmmo();
    showEngage('CLICK TO ENGAGE');
  }

  function showEngage(text) {
    GA.state = 'engage';
    if (!engageEl) {
      engageEl = RT.el('div', '', document.body);
      engageEl.style.cssText = 'position:fixed;inset:0;z-index:35;display:flex;align-items:center;justify-content:center;' +
        'background:rgba(0,0,0,.25);cursor:pointer;font-size:17px;letter-spacing:.4em;color:#fff;text-transform:uppercase;text-shadow:0 2px 8px #000';
      engageEl.onclick = () => {
        engageEl.classList.add('hidden');
        RT.input.lock();
        RT.weapons.setVisible(true);
        GA.state = 'play';
      };
    }
    engageEl.textContent = text;
    engageEl.classList.remove('hidden');
  }

  GA.pause = function () {
    if (GA.state !== 'play') return;
    GA.state = 'pause';
    RT.input.unlock();
    RT.ui.showScreen('pause-screen');
  };
  GA.resume = function () {
    RT.ui.hideScreens();
    RT.input.lock();
    GA.state = 'play';
  };
  GA.resumeFromCutscene = function () {
    RT.weapons.setVisible(true);
    RT.ui.showHUD(true);
    RT.input.lock();
    GA.state = 'play';
  };
  GA.quitToMenu = function () {
    RT.input.unlock();
    RT.ui.hideScreens();
    RT.ui.showHUD(false);
    RT.ui.fade(true);
    RT.ui.letterbox(false);
    RT.weapons.setVisible(false);
    GA.cutscene = null;
    setTimeout(() => { GA.showMenuWorld(); }, 780);
  };

  /* ---------- checkpoints & death ---------- */
  GA.saveCheckpoint = function () {
    checkpoint = {
      player: RT.player.state(),
      ammo: JSON.parse(JSON.stringify(RT.weapons.loadout().reduce((m, id) => { m[id] = { ...RT.weapons.ammoOf(id) }; return m; }, {}))),
    };
  };
  GA.restartCheckpoint = function () {
    RT.ui.hideScreens();
    RT.ui.fade(true);
    setTimeout(() => {
      if (checkpoint) {
        RT.player.restore(checkpoint.player);
        for (const id in checkpoint.ammo) Object.assign(RT.weapons.ammoOf(id), checkpoint.ammo[id]);
      } else RT.player.init(GA.info.playerSpawn);
      RT.ui.refreshAmmo();
      RT.ui.fade(false);
      RT.ui.pulseVignette(0);
      showEngage('CLICK TO CONTINUE');
    }, 800);
  };
  GA.onPlayerDeath = function () {
    if (GA.state !== 'play') return;
    GA.state = 'dead';
    RT.input.unlock();
    RT.ui.pulseVignette(1);
    RT.ui.say('DOC OKAFOR', 'Ridge is down! Medic—', 2);
    setTimeout(() => GA.restartCheckpoint(), 2100);
  };

  /* ---------- combat hooks ---------- */
  GA.onEnemyKilled = function (e, headshot) {
    GA.stats.kills++;
    if (headshot) GA.stats.heads++;
  };
  GA.onCombatStart = function () {
    if (combatStingerCd <= 0) {
      combatStingerCd = 30;
      RT.audio.combatStinger();
    }
  };
  GA.onBreach = function (door) {
    /* slow-mo breach moment */
    RT.engine.timeScale = 0.28;
    setTimeout(() => { RT.engine.timeScale = 1; }, 1500 * 0.28 * 3.5);
    RT.ai.alertAll();
  };

  /* ---------- mission complete ---------- */
  GA.missionComplete = function () {
    if (GA.state === 'end') return;
    GA.state = 'end';
    RT.input.unlock();
    RT.weapons.setVisible(false);
    RT.audio.missionCompleteStinger();
    const time = RT.engine.time - GA.stats.start;
    const acc = GA.stats.shots ? Math.round(100 * GA.stats.hits / GA.stats.shots) : 0;
    /* progress */
    const id = GA.def.id;
    const prev = RT.ui.progress.best[id];
    if (!prev || time < prev.time) RT.ui.progress.best[id] = { time: Math.round(time), acc, kills: GA.stats.kills };
    RT.ui.progress.unlocked = Math.max(RT.ui.progress.unlocked, Math.min(RT.missions.length, GA.missionIdx + 2));
    RT.ui.saveProgress();
    RT.$('st-time').textContent = RT.fmtTime(time);
    RT.$('st-kills').textContent = GA.stats.kills;
    RT.$('st-acc').textContent = acc + '%';
    RT.$('st-heads').textContent = GA.stats.heads;
    RT.$('end-title').textContent = 'MISSION COMPLETE';
    RT.$('end-title').classList.remove('fail');
    RT.$('btn-next').disabled = GA.missionIdx + 1 >= RT.missions.length;
    RT.ui.showHUD(false);
    if (GA.missionIdx === RT.missions.length - 1) {
      /* finale: credits roll first */
      RT.ui.showCredits(true);
      RT.audio.menuMusic(true);
    } else {
      RT.ui.showScreen('end-screen');
    }
  };

  /* ---------- cutscene system ---------- */
  GA.playCutscene = function (def, cb) {
    RT.weapons.setVisible(false);
    const pts = def.path.map(p => new THREE.Vector3(p[0], p[1], p[2]));
    const looks = (def.look || def.path).map(p => new THREE.Vector3(p[0], p[1], p[2]));
    const curve = new THREE.CatmullRomCurve3(pts);
    const lookCurve = new THREE.CatmullRomCurve3(looks);
    GA.cutscene = { curve, lookCurve, t: 0, dur: def.dur || 12, lines: (def.lines || []).slice(), cb, skipT: 0, onUpdate: def.onUpdate };
    GA.state = 'cutscene';
    RT.ui.letterbox(true);
    RT.ui.showHUD(false);
  };
  const _csPos = new THREE.Vector3(), _csLook = new THREE.Vector3();
  function updateCutscene(dt) {
    const cs = GA.cutscene;
    if (!cs) return;
    cs.t += dt;
    const k = smoothstep(0, 1, clamp(cs.t / cs.dur, 0, 1)) * 0.999;
    cs.curve.getPointAt(k, _csPos);
    cs.lookCurve.getPointAt(k, _csLook);
    const cam = RT.engine.camera;
    cam.position.copy(_csPos);
    cam.lookAt(_csLook);
    RT.engine.updateSun(_csPos);
    for (let i = cs.lines.length - 1; i >= 0; i--) {
      if (cs.t >= cs.lines[i].t) {
        RT.ui.say(cs.lines[i].who, cs.lines[i].text);
        cs.lines.splice(i, 1);
      }
    }
    if (cs.onUpdate) cs.onUpdate(cs.t, dt);
    /* skip: hold space */
    if (RT.input.keys.Space) cs.skipT += dt; else cs.skipT = 0;
    if (cs.t >= cs.dur || cs.skipT > 0.55) {
      GA.cutscene = null;
      RT.ui.letterbox(false);
      RT.ui.clearSubtitles();
      const cb = cs.cb;
      if (cb) cb();
    }
  }

  /* ---------- main update ---------- */
  GA.update = function (dt, raw) {
    combatStingerCd -= raw;
    RT.ui.update(raw);
    RT.audio.update(raw);
    if (GA.state === 'menu') { updateMenu(dt); return; }
    if (GA.state === 'cutscene') { updateCutscene(raw); RT.ai.update(dt * 0.25); return; }
    if (GA.state === 'engage' || GA.state === 'pause') return;
    /* smoke column beacons */
    if (RT.map && RT.map.smokeSources && (GA.state === 'play' || GA.state === 'cutscene' || GA.state === 'menu' || GA.state === 'engage')) {
      for (const s of RT.map.smokeSources) {
        s.t -= raw;
        if (s.t <= 0) {
          s.t = 0.09;
          RT.engine.particle(s.x + (Math.random() - .5) * 0.8, s.y, s.z + (Math.random() - .5) * 0.8,
            (Math.random() - .5) * 0.6, 2.2 + Math.random() * 1.6, (Math.random() - .5) * 0.6,
            { color: [0x2b2926, 0x3a3733, 0x4a4540][(Math.random() * 3) | 0], size: 0.9 + Math.random() * 0.9, life: 3.4 + Math.random() * 2, grav: 0.75, drag: 0.9, grow: -0.35, alpha: 0.6 });
        }
      }
    }
    if (GA.state === 'play' || GA.state === 'dead') {
      RT.player.update(dt);
      const [rp, ry] = RT.weapons.consumeRecoil();
      RT.player.addRecoil(rp, ry);
      RT.weapons.update(dt, {
        speedF: RT.player.speedF, sprinting: RT.player.sprinting,
        lookVelX: 0, lookVelY: 0, dead: RT.player.dead,
      });
      RT.weapons.updateShells(dt);
      RT.ai.update(dt);
      RT.missionRuntime.update(dt);
      RT.ui.refreshAmmo();
      if (RT.input.pressed('Escape')) GA.pause();
    }
  };

  return GA;
})();

/* ============================================================
 * Boot
 * ============================================================ */
function boot() {
  if (typeof THREE === 'undefined') {
    RT.$('boot-msg').textContent = 'FAILED TO LOAD RENDERER — CHECK CONNECTION';
    return;
  }
  RT.engine.init();
  RT.input.init(RT.engine.renderer.domElement);
  RT.ui.init();

  RT.engine.onUpdate((dt, raw) => {
    if (RT.transients) {
      for (let i = RT.transients.length - 1; i >= 0; i--) if (!RT.transients[i](dt)) RT.transients.splice(i, 1);
    }
  });

  if (location.hash) RT.ui.fade(false);
  if (location.hash === '#soldier') { soldierViewer(); return finishBoot(); }
  if (location.hash === '#weapon') { weaponViewer(); return finishBoot(); }
  if (location.hash === '#map') { mapViewer(); return finishBoot(); }

  RT.weapons.init();
  RT.engine.onUpdate((dt, raw) => RT.game.update(dt, raw));
  RT.game.showMenuWorld();
  /* first user gesture unlocks audio */
  document.addEventListener('pointerdown', () => RT.audio.ensure(), { once: true });

  /* test hooks */
  window.RT_DEBUG = {
    start: i => RT.game.startMission(i),
    state: () => RT.game.state,
    engage: () => { const e = document.querySelector('body > div[style*="cursor: pointer"]'); },
    play: () => { RT.game.state = 'play'; },
    warp: (x, z) => { RT.player.pos.x = x; RT.player.pos.z = z; RT.player.pos.y = RT.map.groundAt(x, z, 999); },
    killAll: g => { for (const e of RT.ai.enemies) if (!e.dead && (!g || e.group === g)) RT.ai.damageEnemy(e, 9999); },
    god: v => { RT.game.godmode = v; },
    skipCutscene: () => { if (RT.game.cutscene) RT.game.cutscene.t = 1e9; },
    look: (yaw, pitch) => { RT.game.testLockLook = true; RT.player.yaw = yaw; RT.player.pitch = pitch || 0; },
    useNearest: () => {
      let best = null, bd = 99;
      const p = RT.player.pos;
      for (const it of RT.map.interact) {
        if (it.used) continue;
        const q = it.getPos ? it.getPos() : it;
        const d = Math.hypot(q.x - p.x, q.z - p.z);
        if (d < bd) { bd = d; best = it; }
      }
      if (best && bd < 7) {
        if (best.door) { best.door.open = true; best.door.target = 1.1; best.door.speed = 12; }
        else if (best.fn) { best.fn(best); if (best.once) best.used = true; }
        return best.label || 'door';
      }
      return null;
    },
  };
  finishBoot();
}

function finishBoot() {
  RT.engine.start();
  RT.$('boot-msg').classList.add('hidden');
  window.RT_BOOT = 'ok';
  console.log('RT boot ok');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

/* ---------- Gate C viewer: mission map flyover ---------- */
function mapViewer() {
  const params = new URLSearchParams(location.search);
  const mi = parseInt(params.get('m') || '0', 10);
  RT.buildMissionWorld(mi);
  const cam = RT.engine.camera;
  const cx = parseFloat(params.get('x') || '0');
  const cy = parseFloat(params.get('y') || '90');
  const cz = parseFloat(params.get('z') || '120');
  const lx = parseFloat(params.get('lx') || '0');
  const ly = parseFloat(params.get('ly') || '0');
  const lz = parseFloat(params.get('lz') || '-40');
  cam.position.set(cx, cy, cz);
  cam.lookAt(lx, ly, lz);
  if (params.get('ortho')) {
    /* pseudo-orthographic top-down: narrow FOV from very high, fog off */
    cam.fov = 34; cam.far = 3000; cam.updateProjectionMatrix();
    cam.position.set(parseFloat(params.get('x') || '0'), 620, parseFloat(params.get('z') || '20') + 1);
    cam.lookAt(parseFloat(params.get('x') || '0'), 0, parseFloat(params.get('z') || '20'));
    RT.engine.scene.fog.density = 0.00004;
  }
  if (params.get('ground')) {
    const gx = parseFloat(params.get('x') || '0'), gz = parseFloat(params.get('z') || '120');
    cam.position.set(gx, RT.map.groundAt(gx, gz, 999) + 1.65, gz);
    cam.lookAt(lx, RT.map.groundAt(lx, lz, 999) + 1.4, lz);
  }
  RT.engine.onUpdate(() => RT.engine.updateSun(cam.position));
  window.RT_VIEWER = { map: RT.map };
}

/* ---------- Gate B viewer: first-person weapon rig ---------- */
function weaponViewer() {
  RT.engine.setAtmosphere({
    top: 0x4a5d7d, horizon: 0xb0a794, ground: 0x4c4a45,
    sunDir: new THREE.Vector3(-0.4, 0.55, -0.6), sunColor: 0xffedd0, sunIntensity: 1.8,
    hemiSky: 0xa8b2c4, hemiGround: 0x50493e, hemiIntensity: 0.45,
    fogColor: 0xb0a794, fogDensity: 0.002, exposure: 0.95,
  });
  const world = RT.engine.world;
  world.add(RT.meshOf([RT.G.box(120, 0.4, 120, 0x6f6a58, { y: -0.2, vary: 0.12 })]));
  world.add(RT.meshOf([RT.G.box(6, 3.4, 0.4, 0x7a7466, { y: 1.7, z: -20, vary: 0.1 }),
    RT.G.box(0.5, 0.5, 0.5, 0x9e2f24, { y: 1.62, z: -19.7 }),
    RT.G.cyl(0.08, 0.08, 3, 8, 0x5a5348, { x: -4, y: 1.5, z: -12 }),
    RT.G.cyl(0.08, 0.08, 3, 8, 0x5a5348, { x: 4, y: 1.5, z: -12 })]));
  RT.combat = {
    playerShot(org, dir, cfg, muzzle) {
      RT.engine.tracer(muzzle, dir, 60, 300);
      const t = (-20 - org.z) / dir.z;
      if (t > 0) {
        const hit = org.clone().addScaledVector(dir, Math.min(t, 60));
        RT.engine.decal(hit, new THREE.Vector3(0, 0, 1), 0.16, 0x26221c, 10);
        for (let i = 0; i < 5; i++)
          RT.engine.particle(hit.x, hit.y, hit.z, (Math.random() - .5) * 2, Math.random() * 2, Math.random() * 1.5,
            { color: 0x8a8072, size: 0.06, life: 0.5, grav: -6, drag: 2 });
      }
    },
  };
  const params = new URLSearchParams(location.search);
  RT.weapons.init();
  RT.weapons.setLoadout([params.get('w') || 'm4', 'pistol']);
  const cam = RT.engine.camera;
  cam.position.set(0, 1.62, 0);
  if (params.get('orbit')) {
    /* detach viewmodel into the world and orbit it for grip inspection */
    const vm = cam.children[cam.children.length - 1];
    cam.remove(vm);
    RT.engine.scene.add(vm);
    vm.position.set(0, 1.5, -0.9);
    const oa = parseFloat(params.get('oa') || '0.8');   // orbit angle
    const oh = parseFloat(params.get('oh') || '1.75');  // camera height
    const or2 = parseFloat(params.get('or') || '0.85'); // radius
    cam.position.set(Math.sin(oa) * or2, oh, -0.9 + Math.cos(oa) * or2 * 0.9);
    cam.lookAt(0, 1.42, -1.15);
  }
  if (params.get('ads')) RT.input.aim = true;
  if (params.get('fire')) {
    let ft = 0.8;
    RT.engine.onUpdate((dt) => { ft -= dt; RT.input.fire = ft < 0 && ft > -0.4; });
  }
  RT.engine.onUpdate((dt) => {
    RT.weapons.update(dt, { speedF: 0 });
    RT.weapons.updateShells(dt);
    RT.engine.updateSun(cam.position);
  });
  window.RT_VIEWER = { weapons: RT.weapons };
}

/* ---------- Gate A viewer: soldiers on a plain stage ---------- */
function soldierViewer() {
  RT.engine.setAtmosphere({
    top: 0x53627a, horizon: 0x9aa0a8, ground: 0x4c4a45,
    sunDir: new THREE.Vector3(-0.45, 0.6, 0.55), sunColor: 0xfff2dd, sunIntensity: 1.7,
    hemiSky: 0xaebacb, hemiGround: 0x555046, hemiIntensity: 0.42,
    fogColor: 0x9aa0a8, fogDensity: 0.0004, exposure: 0.92, fillIntensity: 0.15,
  });
  const world = RT.engine.world;
  world.add(RT.meshOf([RT.G.box(60, 0.4, 60, 0x6a675f, { y: -0.2, vary: 0.1 })]));
  const rigs = [];
  const setups = [
    { seed: 11, faction: 'ally', paletteIdx: 0, headgear: 'helmet', mode: 'idle' },
    { seed: 22, faction: 'ally', paletteIdx: 1, headgear: 'boonie', mode: 'aim' },
    { seed: 33, faction: 'ally', paletteIdx: 2, headgear: 'beanie', mode: 'walk' },
    { seed: 44, faction: 'enemy', paletteIdx: 0, headgear: 'helmet', mode: 'run' },
    { seed: 55, faction: 'enemy', paletteIdx: 1, headgear: 'helmet', mode: 'idle', crouch: 1 },
  ];
  setups.forEach((s, i) => {
    const rig = RT.character.build(s);
    rig.group.position.set((i - (setups.length - 1) / 2) * 1.35, 0, 0);
    rig.anim.mode = s.mode;
    if (s.crouch) rig.anim.crouch = 1;
    world.add(rig.group);
    rigs.push(rig);
  });
  const cam = RT.engine.camera;
  const params = new URLSearchParams(location.search);
  const cd = parseFloat(params.get('dist') || '3.2');
  const ch = parseFloat(params.get('h') || '1.35');
  const cx = parseFloat(params.get('x') || '0');
  cam.position.set(cx, ch, cd);
  cam.lookAt(cx, 1.05, 0);
  RT.engine.onUpdate((dt) => {
    for (const r of rigs) RT.character.pose(r, dt);
    RT.engine.updateSun(cam.position);
  });
  window.RT_VIEWER = { rigs };
}
