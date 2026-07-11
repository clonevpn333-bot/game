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
    RT.ui.showLoading();
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
      RT.ui.hideLoading();
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

  GA.doEngage = function () {
    if (GA.state !== 'engage') return;
    engageEl.classList.add('hidden');
    RT.input.lock();
    RT.weapons.setVisible(true);
    GA.state = 'play';
  };
  function showEngage(text) {
    GA.state = 'engage';
    if (!engageEl) {
      engageEl = RT.el('div', '', document.body);
      engageEl.style.cssText = 'position:fixed;inset:0;z-index:35;display:flex;flex-direction:column;gap:26px;align-items:center;justify-content:center;' +
        'background:rgba(0,0,0,.25);cursor:pointer;color:#fff;text-shadow:0 2px 8px #000;text-align:center';
      engageEl.onclick = GA.doEngage;
    }
    const kb = RT.input.keyboardMode();
    engageEl.innerHTML =
      `<div style="font-size:17px;letter-spacing:.4em;text-transform:uppercase">${kb ? 'CLICK OR PRESS ENTER' : text}</div>` +
      `<div class="paused-note" style="margin-top:0">${RT.ui.controlsCard()}</div>`;
    engageEl.classList.remove('hidden');
  }

  GA.pause = function () {
    if (GA.state !== 'play') return;
    GA.state = 'pause';
    RT.input.unlock();
    if (RT.$('pause-controls')) RT.$('pause-controls').innerHTML = RT.ui.controlsCard();
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
  /* ---------- photo mode: detached free-fly camera ---------- */
  GA.enterPhoto = function () {
    if (GA.state !== 'pause') return;
    const cam = RT.engine.camera;
    GA._photo = { x: cam.position.x, y: cam.position.y, z: cam.position.z, yaw: RT.player.yaw, pitch: RT.player.pitch };
    GA.state = 'photo';
    RT.ui.hideScreens();
    RT.ui.showHUD(false);
    RT.weapons.setVisible(false);
    RT.ui.showPhotoHint(true);
    RT.input.lock();
  };
  GA.exitPhoto = function () {
    if (GA.state !== 'photo') return;
    RT.ui.showPhotoHint(false);
    GA.state = 'pause';
    RT.input.unlock();
    if (RT.$('pause-controls')) RT.$('pause-controls').innerHTML = RT.ui.controlsCard();
    RT.ui.showScreen('pause-screen');
  };
  function updatePhoto(dt) {
    const I = RT.input, cam = RT.engine.camera, ph = GA._photo;
    let [mdx, mdy] = I.consumeMouse();
    if (I.keyboardMode() || I.fallback) {
      const ls = 1.5 * dt;
      if (I.keys.ArrowLeft) ph.yaw += ls; if (I.keys.ArrowRight) ph.yaw -= ls;
      if (I.keys.ArrowUp) ph.pitch += ls; if (I.keys.ArrowDown) ph.pitch -= ls;
    }
    ph.yaw -= mdx * 0.002; ph.pitch = clamp(ph.pitch - mdy * 0.002, -1.45, 1.45);
    const sp = (I.keys.ShiftLeft ? 30 : 12) * dt;
    const cy = Math.cos(ph.pitch);
    const fx = -Math.sin(ph.yaw) * cy, fy = Math.sin(ph.pitch), fz = -Math.cos(ph.yaw) * cy;
    const rx = Math.cos(ph.yaw), rz = -Math.sin(ph.yaw);
    const mf = (I.keys.KeyW ? 1 : 0) - (I.keys.KeyS ? 1 : 0);
    const msd = (I.keys.KeyD ? 1 : 0) - (I.keys.KeyA ? 1 : 0);
    const mu = (I.keys.KeyE ? 1 : 0) - (I.keys.KeyQ ? 1 : 0);
    ph.x += (fx * mf + rx * msd) * sp; ph.y += (fy * mf + mu) * sp; ph.z += (fz * mf + rz * msd) * sp;
    cam.position.set(ph.x, ph.y, ph.z);
    cam.rotation.set(ph.pitch, ph.yaw, 0);
    RT.engine.updateSun(cam.position);
    if (I.pressed('KeyP') || I.pressed('Escape')) GA.exitPhoto();
  }
  GA.quitToMenu = function () {
    RT.input.unlock();
    RT.ui.hideScreens();
    RT.ui.showHUD(false);
    RT.ui.fade(true);
    RT.ui.letterbox(false);
    RT.weapons.setVisible(false);
    GA.cutscene = null; GA._killcam = null; GA._range = false;
    if (RT.range) RT.range.exit();
    if (RT.audio) RT.audio.combatMusic(false);
    if (RT.br) RT.br.reset();
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
    if (GA._range) { RT.range.startRange(); return; }
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
    if (RT.br && RT.br.active) { RT.br.onPlayerDeath(); return; }
    if (GA.state !== 'play') return;
    GA.state = 'dead';
    RT.input.unlock();
    RT.weapons.setVisible(false);
    RT.ui.pulseVignette(0.5);   // cinematic darkening, not a blackout — the killcam needs to be visible
    /* killcam: orbit the death spot, framed on whoever's still shooting at you */
    let killer = null, kd = 1e9;
    for (const e of RT.ai.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - RT.player.pos.x, e.z - RT.player.pos.z); if (d < kd) { kd = d; killer = e; } }
    GA._killcam = { killer, t: 0, cx: RT.player.pos.x, cy: RT.player.pos.y, cz: RT.player.pos.z, dir: Math.random() < 0.5 ? 1 : -1 };
    RT.ui.toast('KILLED IN ACTION', killer ? 'Last seen: hostile ' + (killer.kind || 'infantry') : 'Regrouping from checkpoint');
    RT.ui.say('DOC OKAFOR', 'Ridge is down! Medic—', 2);
    setTimeout(() => { GA._killcam = null; GA.restartCheckpoint(); }, 3200);
  };
  function updateKillcam(dt) {
    const kc = GA._killcam, cam = RT.engine.camera;
    kc.t += dt;
    const orbit = kc.t * 0.55 * kc.dir;
    cam.position.set(kc.cx + Math.cos(orbit) * 4.2, kc.cy + 1.7 + Math.sin(kc.t * 0.5) * 0.25, kc.cz + Math.sin(orbit) * 4.2);
    const k = kc.killer;
    if (k && !k.dead) cam.lookAt(k.x, k.y + 1.25, k.z);
    else cam.lookAt(kc.cx, kc.cy + 0.5, kc.cz);
    RT.engine.updateSun(cam.position);
  }

  /* ---------- combat hooks ---------- */
  GA.onEnemyKilled = function (e, headshot) {
    GA.stats.kills++;
    if (headshot) GA.stats.heads++;
    GA.killFx(headshot);
    if (RT.progress) RT.progress.onKill(headshot, false);
  };
  /* victory flair: a burst of colourful confetti + a warm flash */
  GA.victoryFlair = function () {
    const p = RT.player.pos;
    const cols = [0xffd24a, 0xe8a33d, 0x7fe08a, 0x6aa0ff, 0xff6a6a, 0xffffff, 0xc9a028];
    for (let i = 0; i < 64; i++) {
      const a = Math.random() * TAU, sp = 3 + Math.random() * 9;
      RT.engine.particle(p.x + (Math.random() - .5) * 4, p.y + 2 + Math.random() * 2.4, p.z + (Math.random() - .5) * 4,
        Math.cos(a) * sp, 6 + Math.random() * 8, Math.sin(a) * sp,
        { color: cols[i % cols.length], size: 0.11 + Math.random() * 0.13, life: 2.4 + Math.random() * 1.6, grav: -6, drag: 0.55, grow: -0.15 });
    }
    RT.engine.flash(new THREE.Vector3(p.x, p.y + 3, p.z), 0xffe0a0, 3, 32, 0.5);
  };
  /* brief kill-confirmation hitstop; stronger on headshots, rate-limited, test-safe */
  GA.killFx = function (big) {
    const ts = RT.engine.timeScale;
    if (ts > 1.05 || ts < 0.95) return;                 // don't fight test speed-ups or existing slow-mo
    const now = performance.now();
    if (now - (GA._lastKillFx || 0) < (big ? 900 : 1500)) return;
    GA._lastKillFx = now;
    const v = big ? 0.32 : 0.55;
    RT.engine.timeScale = v;
    clearTimeout(GA._killFxT);
    GA._killFxT = setTimeout(() => { if (Math.abs(RT.engine.timeScale - v) < 0.02) RT.engine.timeScale = 1; }, big ? 240 : 110);
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
    if (RT.progress) RT.progress.onMissionComplete(id, time, acc);
    RT.$('st-l-time').textContent = 'TIME';
    RT.$('st-l-kills').textContent = 'ENEMIES ELIMINATED';
    RT.$('st-l-acc').textContent = 'ACCURACY';
    RT.$('st-l-heads').textContent = 'HEADSHOTS';
    RT.$('st-time').textContent = RT.fmtTime(time);
    RT.$('st-kills').textContent = GA.stats.kills;
    RT.$('st-acc').textContent = acc + '%';
    RT.$('st-heads').textContent = GA.stats.heads;
    RT.$('end-title').textContent = 'MISSION COMPLETE';
    RT.$('end-title').classList.remove('fail');
    GA.victoryFlair();
    RT.$('btn-retry').textContent = 'Replay Mission';
    RT.$('btn-retry').onclick = () => RT.game.startMission(RT.game.missionIdx);
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
    /* dynamic combat music (campaign): on during firefights + a short tail after */
    const inCombat = GA.state === 'play' && !(RT.br && RT.br.active) && RT.ai.inCombat && RT.ai.inCombat();
    if (inCombat) GA._combatHold = 5; else if (GA._combatHold > 0) GA._combatHold -= raw;
    if (RT.audio) RT.audio.combatMusic(inCombat || GA._combatHold > 0);
    if (RT.br && (RT.br.active || GA.state === 'br')) RT.br.update(dt, raw);
    if (GA.state === 'br') return;
    if (GA.state === 'menu') { updateMenu(dt); return; }
    if (GA.state === 'cutscene') { updateCutscene(raw); RT.ai.update(dt * 0.25); return; }
    if (GA.state === 'engage') {
      if (RT.input.pressed('Enter') || RT.input.pressed('NumpadEnter')) GA.doEngage();
      return;
    }
    if (GA.state === 'photo') { updatePhoto(dt); return; }
    if (GA.state === 'pause') return;
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
    if (GA.state === 'dead' && GA._killcam) {
      updateKillcam(dt);
      if (!(RT.br && RT.br.active)) RT.ai.update(dt);
      RT.weapons.updateShells(dt);
      return;
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
      if (GA._range) {
        if (RT.range) RT.range.update(dt);
      } else if (!(RT.br && RT.br.active)) {
        RT.ai.update(dt);
        RT.missionRuntime.update(dt);
      }
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
  if (RT.progress) RT.progress.init();

  RT.engine.onUpdate((dt, raw) => {
    if (RT.transients) {
      for (let i = RT.transients.length - 1; i >= 0; i--) if (!RT.transients[i](dt)) RT.transients.splice(i, 1);
    }
  });

  if (location.hash) RT.ui.fade(false);
  if (location.hash === '#soldier') { soldierViewer(); return finishBoot(); }
  if (location.hash === '#weapon') { weaponViewer(); return finishBoot(); }
  if (location.hash === '#map') { mapViewer(); return finishBoot(); }
  if (location.hash === '#plane') { planeViewer(); return finishBoot(); }

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

/* ---------- Gate 1 viewer: the drop aircraft ---------- */
function planeViewer() {
  RT.engine.setAtmosphere({
    top: 0x3a5f8e, horizon: 0xe7b878, ground: 0x6a7358,
    sunDir: new THREE.Vector3(-0.5, 0.5, 0.3), sunColor: 0xffe0b0, sunIntensity: 2.0,
    hemiSky: 0xbcd0e6, hemiGround: 0x5a5a4a, hemiIntensity: 0.5,
    fogColor: 0xd8be94, fogDensity: 0.0009, exposure: 1.0, fillIntensity: 0.16,
  });
  const plane = RT.aircraft.build();
  RT.engine.world.add(plane);
  RT.aircraft.buildJumpers(plane, 40);
  const cam = RT.engine.camera;
  const params = new URLSearchParams(location.search);
  const dist = parseFloat(params.get('dist') || '34');
  const ang = parseFloat(params.get('ang') || '0.9');
  const hy = parseFloat(params.get('hy') || '6');
  const lx = parseFloat(params.get('lx') || '0'), ly = parseFloat(params.get('ly') || '1.5'), lz = parseFloat(params.get('lz') || '-1');
  if (params.get('inside')) {
    cam.position.set(parseFloat(params.get('cx') || '0'), parseFloat(params.get('cy') || '0'), parseFloat(params.get('cz') || '6'));
    cam.lookAt(0, -1, -13);
  } else {
    cam.position.set(Math.sin(ang) * dist, hy, Math.cos(ang) * dist);
    cam.lookAt(lx, ly, lz);
  }
  RT.engine.onUpdate((dt) => { RT.aircraft.update(plane, dt, 1, false); RT.aircraft.poseJumpers(plane, dt); RT.engine.updateSun(cam.position); });
  window.RT_VIEWER = { plane };
}
