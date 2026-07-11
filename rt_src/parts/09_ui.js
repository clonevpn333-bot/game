/* ============================================================
 * UI: HUD (ammo/compass/objectives/waypoints/subtitles/hitmarker/
 * vignette/interact), menus (main/mission select/settings/pause/
 * mission end/credits), letterbox + fade, progress storage.
 * ============================================================ */
RT.ui = (() => {
  const U = {};
  let hud, subQueue = [], subCur = null, toastT = 0;
  const waypoints = [];

  /* ---------- progress (3 save slots) ---------- */
  U.slot = 0;
  try { U.slot = Math.min(2, Math.max(0, +(localStorage.getItem('rt_slot') || 0) || 0)); } catch (e) {}
  const progKey = () => 'rt_progress_' + U.slot;
  const loadSlot = () => {
    let p = null;
    try {
      let raw = localStorage.getItem(progKey());
      if (!raw && U.slot === 0) raw = localStorage.getItem('rt_progress');   // migrate legacy save
      p = JSON.parse(raw || 'null');
    } catch (e) {}
    U.progress = p || { unlocked: 1, best: {} };
  };
  loadSlot();
  U.saveProgress = () => { try { localStorage.setItem(progKey(), JSON.stringify(U.progress)); } catch (e) {} };
  U.slotSummary = (n) => {
    try {
      const p = JSON.parse(localStorage.getItem('rt_progress_' + n) || (n === 0 ? localStorage.getItem('rt_progress') : null) || 'null');
      if (!p) return 'Empty';
      const lvl = p.xp && RT.progress ? RT.progress.levelFor(p.xp) : 1;
      return 'Mission ' + Math.min(p.unlocked || 1, 5) + ' · Rank ' + lvl;
    } catch (e) { return 'Empty'; }
  };
  U.switchSlot = (n) => {
    if (n === U.slot) return;
    U.saveProgress();
    U.slot = n; try { localStorage.setItem('rt_slot', n); } catch (e) {}
    loadSlot();
    if (RT.progress && RT.progress.refreshArmory) RT.progress.refreshArmory();
    U.renderSlots && U.renderSlots();
    $('btn-continue').disabled = U.progress.unlocked <= 1 && !U.progress.best[1];
  };
  U.resetSlot = () => { U.progress = { unlocked: 1, best: {} }; U.saveProgress(); if (RT.progress && RT.progress.refreshArmory) RT.progress.refreshArmory(); U.renderSlots && U.renderSlots(); };

  /* ---------- build DOM ---------- */
  U.init = function () {
    const body = document.body;
    /* fade + letterbox */
    el('div', '', body).id = 'fade';
    const lb = el('div', '', body); lb.id = 'letterbox';
    el('div', 'bar', lb).id = 'lb-top';
    el('div', 'bar', lb).id = 'lb-bot';
    const skip = el('div', '', body); skip.id = 'skip-hint'; skip.textContent = 'HOLD SPACE TO SKIP';

    /* loading overlay */
    const load = el('div', '', body); load.id = 'loading';
    load.style.cssText = 'position:fixed;inset:0;z-index:60;background:#0b0c0a;display:none;flex-direction:column;align-items:center;justify-content:center;gap:22px;opacity:0;transition:opacity .3s';
    load.innerHTML = '<div style="font-size:13px;letter-spacing:.5em;color:var(--amber)">ROLLING THUNDER</div>' +
      '<div style="width:220px;height:3px;background:rgba(255,255,255,.12);overflow:hidden;border-radius:2px">' +
      '<div id="load-bar" style="height:100%;width:30%;background:linear-gradient(90deg,transparent,var(--amber),transparent);animation:loadslide 1.1s linear infinite"></div></div>' +
      '<div id="load-tip" style="max-width:520px;text-align:center;font-size:13px;color:var(--ink-dim);letter-spacing:.04em;line-height:1.5;padding:0 20px"></div>';
    const st = el('style', '', body); st.textContent = '@keyframes loadslide{0%{transform:translateX(-260px)}100%{transform:translateX(260px)}}';

    /* HUD */
    hud = el('div', '', body); hud.id = 'hud';
    hud.innerHTML =
      '<div id="vignette"></div><div id="health-low"></div>' +
      '<div id="compass-wrap"><canvas id="compass" width="420" height="34"></canvas></div>' +
      '<div id="obj-list"></div>' +
      '<div id="toast"><small id="toast-sub"></small><span id="toast-main"></span></div>' +
      '<div id="subtitles"></div>' +
      '<div id="crosshair"><div class="l h" style="left:-14px"></div><div class="l h" style="right:-14px"></div>' +
      '<div class="l v" style="top:-14px"></div><div class="l v" style="bottom:-14px"></div></div>' +
      '<div id="hitmarker">' +
      '<div class="m" style="transform:rotate(45deg) translate(7px,0)"></div>' +
      '<div class="m" style="transform:rotate(135deg) translate(7px,0)"></div>' +
      '<div class="m" style="transform:rotate(225deg) translate(7px,0)"></div>' +
      '<div class="m" style="transform:rotate(315deg) translate(7px,0)"></div></div>' +
      '<div id="dmgdir"></div>' +
      '<div id="interact"><b>F</b><span id="interact-label">OPEN</span></div>' +
      '<div id="ammo"><div class="wname" id="ammo-name">M4A3</div>' +
      '<div class="mag"><span id="ammo-mag">30</span> <span id="ammo-res">/ 120</span></div>' +
      '<div class="gren" id="ammo-gren">FRAG × 4</div></div>' +
      '<div id="hpwrap" style="position:absolute;left:34px;bottom:28px;text-shadow:0 1px 3px #000">' +
      '<div style="display:flex;align-items:baseline;gap:10px"><span id="hp-num" style="font-size:26px;font-weight:800;color:#fff">100</span>' +
      '<span style="font-size:10px;letter-spacing:.3em;color:var(--ink-dim)">HP</span></div>' +
      '<div id="hp-bar" style="display:flex;gap:3px;width:220px;margin-top:5px">' +
      [0, 1, 2, 3].map(i => `<div style="flex:1;height:7px;background:rgba(255,255,255,.13);position:relative;overflow:hidden">` +
        `<div class="hp-fill" id="hp-f${i}" style="position:absolute;inset:0;background:#fff;transform-origin:left;transition:transform .18s"></div></div>`).join('') +
      '</div>' +
      '<div id="hp-armor" style="display:none;gap:3px;width:220px;margin-top:3px"></div></div>' +
      '<div id="ff-warn" style="position:absolute;left:50%;top:44%;transform:translateX(-50%);font-size:15px;letter-spacing:.34em;' +
      'color:#7fe08a;text-shadow:0 1px 6px #000;opacity:0;transition:opacity .15s;font-weight:700">FRIENDLY</div>' +
      '<div id="timer" style="position:absolute;top:62px;left:50%;transform:translateX(-50%);font-size:30px;font-weight:800;' +
      'letter-spacing:.12em;color:#fff;text-shadow:0 2px 6px #000;display:none"></div>';
    for (let i = 0; i < 3; i++) {
      const w = el('div', 'waypoint hidden', hud);
      w.innerHTML = '<div class="diamond"></div><div class="dist">120m</div>';
      waypoints.push(w);
    }
    /* DMR scope overlay */
    const scope = el('div', '', body);
    scope.id = 'scope';
    scope.style.cssText = 'position:fixed;inset:0;z-index:22;pointer-events:none;opacity:0;transition:opacity .12s;' +
      'background:radial-gradient(circle at 50% 50%, transparent 26%, rgba(0,0,0,.97) 27.5%)';
    scope.innerHTML = '<div style="position:absolute;left:50%;top:0;width:1.5px;height:100%;background:rgba(0,0,0,.85)"></div>' +
      '<div style="position:absolute;top:50%;left:0;height:1.5px;width:100%;background:rgba(0,0,0,.85)"></div>' +
      '<div style="position:absolute;left:50%;top:50%;width:5px;height:5px;margin:-2.5px;border-radius:50%;background:rgba(200,30,20,.9)"></div>';

    buildScreens();
  };

  /* ---------- screens ---------- */
  function screenShell(id, body2) {
    const s = el('div', 'screen fading', document.body);
    s.id = id;
    s.classList.add('hidden');
    s.innerHTML = '<div class="scrim"></div><div class="inner">' + body2 + '</div>';
    return s;
  }
  function buildScreens() {
    /* main menu */
    const mm = screenShell('main-menu',
      '<div class="title-block"><div class="title-sup">A Velkan Ridge Campaign</div>' +
      '<div class="title-main">ROLLING<br>THUNDER</div>' +
      '<div class="title-rule"></div><div class="title-sub">Single Player · Five Missions</div></div>' +
      '<div class="menu-list">' +
      '<button class="menu-btn" id="btn-campaign">Campaign</button>' +
      '<button class="menu-btn" id="btn-br">Thunderdrop <small style="color:var(--amber);letter-spacing:.2em;font-size:10px">· 50-PLAYER BR</small></button>' +
      '<button class="menu-btn" id="btn-continue">Continue</button>' +
      '<button class="menu-btn" id="btn-armory">Armory</button>' +
      '<button class="menu-btn" id="btn-range">Firing Range</button>' +
      '<button class="menu-btn" id="btn-settings">Settings</button>' +
      '<button class="menu-btn" id="btn-credits">Credits</button></div>' +
      '<div class="menu-foot" style="margin-top:26px">Control scheme</div>' +
      '<div class="seg" id="ctrl-seg" style="margin-top:8px">' +
      '<button id="ctrl-mouse">Mouse</button><button id="ctrl-kb">Keyboard / Trackpad</button></div>' +
      '<div class="menu-foot" id="menu-scheme-hint" style="margin-top:14px"></div>');
    const syncCtrl = () => {
      $('ctrl-mouse').className = RT.settings.controls === 'mouse' ? 'on' : '';
      $('ctrl-kb').className = RT.settings.controls === 'keyboard' ? 'on' : '';
      $('menu-scheme-hint').textContent = RT.settings.controls === 'keyboard'
        ? 'WASD move · Arrows look · F fire · Q aim · E use'
        : 'Click to engage · WASD move · Mouse look';
      if (U._syncSettings) U._syncSettings();
    };
    U._syncCtrl = syncCtrl;
    $('ctrl-mouse').onclick = () => { RT.settings.controls = 'mouse'; RT.saveSettings(); syncCtrl(); };
    $('ctrl-kb').onclick = () => { RT.settings.controls = 'keyboard'; RT.saveSettings(); syncCtrl(); };
    syncCtrl();
    $('btn-campaign').onclick = () => U.showMissionSelect();
    $('btn-br').onclick = () => RT.br.startMatch();
    $('btn-range').onclick = () => RT.range.startRange();
    $('btn-continue').onclick = () => {
      const m = Math.min(U.progress.unlocked, RT.missions.length);
      RT.game.startMission(m - 1);
    };
    $('btn-settings').onclick = () => U.showSettings('main-menu');
    $('btn-credits').onclick = () => U.showCredits(false);

    /* mission select */
    screenShell('mission-select',
      '<div class="panel-title"><small>Campaign</small>Select Mission</div>' +
      '<div class="menu-foot" style="margin-bottom:8px">Save Slot</div>' +
      '<div id="slot-row" style="display:flex;gap:10px;margin-bottom:16px"></div>' +
      '<div class="panel"><div class="mission-grid" id="mission-grid"></div>' +
      '<div class="back-row"><button class="menu-btn" id="btn-ms-back">Back</button>' +
      '<button class="menu-btn" id="btn-slot-reset" style="opacity:.7">Reset This Slot</button></div></div>');
    $('btn-ms-back').onclick = () => U.showMenu();
    $('btn-slot-reset').onclick = () => { if (confirm('Reset save slot ' + (U.slot + 1) + '? This erases its campaign + rank progress.')) U.resetSlot(); };
    U.renderSlots = function () {
      const row = $('slot-row'); if (!row) return;
      row.innerHTML = '';
      for (let n = 0; n < 3; n++) {
        const b = el('button', 'menu-btn', row);
        b.style.cssText = 'flex:1;text-align:left;padding:10px 14px;' + (n === U.slot ? 'border-color:var(--amber)' : 'opacity:.65');
        b.innerHTML = '<div style="font-size:13px;letter-spacing:.1em">SLOT ' + (n + 1) + (n === U.slot ? ' ·' : '') + '</div>' +
          '<div style="font-size:10px;color:var(--ink-dim);letter-spacing:.06em;margin-top:3px">' + U.slotSummary(n) + '</div>';
        b.onclick = () => U.switchSlot(n);
      }
    };

    /* settings */
    screenShell('settings-screen',
      '<div class="panel-title"><small>Options</small>Settings</div>' +
      '<div class="panel">' +
      '<div class="set-row"><label>Mouse Sensitivity</label><input type="range" id="set-sens" min="0.2" max="3" step="0.1"><span class="set-val" id="set-sens-v"></span></div>' +
      '<div class="set-row"><label>Field of View</label><input type="range" id="set-fov" min="70" max="110" step="1"><span class="set-val" id="set-fov-v"></span></div>' +
      '<div class="set-row"><label>Volume</label><input type="range" id="set-vol" min="0" max="1" step="0.05"><span class="set-val" id="set-vol-v"></span></div>' +
      '<div class="set-row"><label>Quality</label><div class="seg"><button id="set-q0">Performance</button><button id="set-q1">Quality</button></div></div>' +
      '<div class="set-row"><label>Controls</label><div class="seg"><button id="set-c0">Mouse</button><button id="set-c1">Keyboard</button></div></div>' +
      '<div class="set-row"><label>Aim Assist (keyboard)</label><div class="seg"><button id="set-a0">Off</button><button id="set-a1">Low</button><button id="set-a2">High</button></div></div>' +
      '<div class="set-row"><label>Difficulty</label><div class="seg"><button id="set-d0">Recruit</button><button id="set-d1">Veteran</button><button id="set-d2">Hardened</button></div></div>' +
      '<div class="set-row"><label>Auto Quality</label><div class="seg"><button id="set-aq0">Off</button><button id="set-aq1">On</button></div></div>' +
      '<div class="paused-note" id="controls-card" style="margin-top:16px"></div>' +
      '<div class="back-row"><button class="menu-btn" id="btn-set-back">Back</button></div></div>');
    const syncSettings = () => {
      $('set-sens').value = RT.settings.sens; $('set-sens-v').textContent = RT.settings.sens.toFixed(1);
      $('set-fov').value = RT.settings.fov; $('set-fov-v').textContent = RT.settings.fov;
      $('set-vol').value = RT.settings.volume; $('set-vol-v').textContent = Math.round(RT.settings.volume * 100) + '%';
      $('set-q0').className = RT.settings.quality ? '' : 'on';
      $('set-q1').className = RT.settings.quality ? 'on' : '';
      $('set-c0').className = RT.settings.controls === 'mouse' ? 'on' : '';
      $('set-c1').className = RT.settings.controls === 'keyboard' ? 'on' : '';
      for (let i = 0; i < 3; i++) $('set-a' + i).className = RT.settings.aimAssist === i ? 'on' : '';
      for (let i = 0; i < 3; i++) $('set-d' + i).className = RT.settings.difficulty === i ? 'on' : '';
      for (let i = 0; i < 2; i++) $('set-aq' + i).className = (RT.settings.autoQuality ? 1 : 0) === i ? 'on' : '';
      $('controls-card').innerHTML = U.controlsCard();
    };
    $('set-c0').onclick = () => { RT.settings.controls = 'mouse'; RT.saveSettings(); syncSettings(); if (U._syncCtrl) U._syncCtrl(); };
    $('set-c1').onclick = () => { RT.settings.controls = 'keyboard'; RT.saveSettings(); syncSettings(); if (U._syncCtrl) U._syncCtrl(); };
    for (let i = 0; i < 3; i++) {
      $('set-a' + i).onclick = ((n) => () => { RT.settings.aimAssist = n; RT.saveSettings(); syncSettings(); })(i);
      $('set-d' + i).onclick = ((n) => () => { RT.settings.difficulty = n; RT.saveSettings(); syncSettings(); })(i);
    }
    for (let i = 0; i < 2; i++) {
      $('set-aq' + i).onclick = ((n) => () => { RT.settings.autoQuality = n; RT.saveSettings(); syncSettings(); })(i);
    }
    U._syncSettings = syncSettings;
    $('set-sens').oninput = e => { RT.settings.sens = +e.target.value; syncSettings(); RT.saveSettings(); };
    $('set-fov').oninput = e => { RT.settings.fov = +e.target.value; syncSettings(); RT.saveSettings(); };
    $('set-vol').oninput = e => { RT.settings.volume = +e.target.value; syncSettings(); RT.saveSettings(); if (RT.audio) RT.audio.setVolume(RT.settings.volume); };
    $('set-q0').onclick = () => { RT.settings.quality = 0; syncSettings(); RT.saveSettings(); RT.engine.applyQuality(); };
    $('set-q1').onclick = () => { RT.settings.quality = 1; syncSettings(); RT.saveSettings(); RT.engine.applyQuality(); };
    $('btn-set-back').onclick = () => { if (U._settingsFrom === 'pause-screen') U.showScreen('pause-screen'); else U.showMenu(); };

    /* pause */
    screenShell('pause-screen',
      '<div class="panel-title"><small>Stand By</small>Paused</div>' +
      '<div class="menu-list">' +
      '<button class="menu-btn" id="btn-resume">Resume</button>' +
      '<button class="menu-btn" id="btn-restart">Restart From Checkpoint</button>' +
      '<button class="menu-btn" id="btn-photo">Photo Mode</button>' +
      '<button class="menu-btn" id="btn-pause-settings">Settings</button>' +
      '<button class="menu-btn" id="btn-quit">Quit To Menu</button></div>' +
      '<div class="paused-note" id="pause-controls"></div>');
    $('btn-resume').onclick = () => RT.game.resume();
    $('btn-restart').onclick = () => RT.game.restartCheckpoint();
    $('btn-photo').onclick = () => RT.game.enterPhoto();
    $('btn-pause-settings').onclick = () => U.showSettings('pause-screen');
    $('btn-quit').onclick = () => RT.game.quitToMenu();

    /* photo-mode hint bar */
    const ph = el('div', '', document.body); ph.id = 'photo-hint';
    ph.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:40;display:none;' +
      'padding:9px 18px;background:rgba(10,11,10,.6);border:1px solid rgba(232,163,61,.35);border-radius:6px;' +
      'font-size:12px;letter-spacing:.12em;color:#e8e2d4;text-shadow:0 1px 3px #000';
    ph.innerHTML = '<b style="color:var(--amber)">PHOTO MODE</b>&nbsp;&nbsp;WASD fly · Arrows/Mouse look · Q/E up-down · Shift boost · <b>P</b> exit';
    U.showPhotoHint = (on) => { ph.style.display = on ? 'block' : 'none'; };

    /* mission end */
    screenShell('end-screen',
      '<div class="big-result" id="end-title">MISSION COMPLETE</div>' +
      '<div class="title-rule"></div>' +
      '<div class="panel" style="max-width:520px;margin-top:26px">' +
      '<table class="stats-table"><tr><td id="st-l-time">TIME</td><td id="st-time">–</td></tr>' +
      '<tr><td id="st-l-kills">ENEMIES ELIMINATED</td><td id="st-kills">–</td></tr>' +
      '<tr><td id="st-l-acc">ACCURACY</td><td id="st-acc">–</td></tr>' +
      '<tr><td id="st-l-heads">HEADSHOTS</td><td id="st-heads">–</td></tr></table>' +
      '<div class="menu-list">' +
      '<button class="menu-btn" id="btn-next">Next Mission</button>' +
      '<button class="menu-btn" id="btn-retry">Replay Mission</button>' +
      '<button class="menu-btn" id="btn-end-menu">Main Menu</button></div></div>');
    $('btn-next').onclick = () => RT.game.startMission(RT.game.missionIdx + 1);
    $('btn-retry').onclick = () => RT.game.startMission(RT.game.missionIdx);
    $('btn-end-menu').onclick = () => RT.game.quitToMenu();

    /* credits */
    screenShell('credits-screen',
      '<div class="panel-title"><small>Rolling Thunder</small>Credits</div>' +
      '<div id="credits-scroll"><div id="credits-inner">' +
      '<h3>A Velkan Ridge Story</h3><p>An original single-file FPS</p>' +
      '<h3>Sgt. Dana “Ridge” Calloway</h3><p>You</p>' +
      '<h3>The Squad</h3><p>Lt. E. Marsh</p><p>Doc A. Okafor</p><p>Cpl. J. Vane</p>' +
      '<h3>Engine</h3><p>Three.js r128 · WebAudio · One HTML file</p>' +
      '<h3>Everything Else</h3><p>Procedural geometry, audio and animation</p><p>No external assets</p>' +
      '<h3>Thank You For Playing</h3><p>Velkan Ridge is quiet again.</p>' +
      '</div></div>' +
      '<div class="back-row"><button class="menu-btn" id="btn-cred-back">Back</button></div>');
    $('btn-cred-back').onclick = () => { U._creditsFinale ? RT.game.quitToMenu() : U.showMenu(); };
  }

  /* ---------- screen switching ---------- */
  let activeScreen = null;
  U.showScreen = function (id) {
    for (const s of document.querySelectorAll('.screen')) {
      if (s.id === id) {
        s.classList.remove('hidden');
        requestAnimationFrame(() => s.classList.remove('fading'));
      } else {
        s.classList.add('fading');
        setTimeout(() => s.classList.add('hidden'), 460);
      }
    }
    activeScreen = id;
  };
  U.hideScreens = function () {
    for (const s of document.querySelectorAll('.screen')) {
      s.classList.add('fading');
      setTimeout(() => s.classList.add('hidden'), 460);
    }
    activeScreen = null;
  };
  U.showMenu = () => { U.showScreen('main-menu'); $('btn-continue').disabled = U.progress.unlocked <= 1 && !U.progress.best[1]; };
  U.showSettings = (from) => { U._settingsFrom = from; U._syncSettings(); U.showScreen('settings-screen'); };
  U.showCredits = (finale) => {
    U._creditsFinale = finale;
    U.showScreen('credits-screen');
    const inner = $('credits-inner');
    inner.style.transition = 'none'; inner.style.top = finale ? '60vh' : '0px';
    if (finale) {
      requestAnimationFrame(() => {
        inner.style.transition = 'top 36s linear';
        inner.style.top = (-inner.offsetHeight) + 'px';
      });
    }
  };
  U.showMissionSelect = function () {
    const grid = $('mission-grid');
    grid.innerHTML = '';
    RT.missions.forEach((m, i) => {
      const locked = i + 1 > U.progress.unlocked;
      const b = el('button', 'mission-card' + (locked ? ' locked' : ''), grid);
      const best = U.progress.best[m.id];
      b.innerHTML = `<div class="mission-num">${String(i + 1).padStart(2, '0')}</div>` +
        `<div class="mission-info"><div class="mission-name">${m.title}</div><div class="mission-desc">${locked ? 'Locked — complete previous mission' : m.desc}</div></div>` +
        `<div class="mission-stats">${best ? `BEST <b>${RT.fmtTime(best.time)}</b><br>ACC <b>${best.acc}%</b> · KILLS <b>${best.kills}</b>` : (locked ? '🔒' : 'NOT COMPLETED')}</div>`;
      if (!locked) b.onclick = () => RT.game.startMission(i);
    });
    if (U.renderSlots) U.renderSlots();
    U.showScreen('mission-select');
  };

  /* per-scheme key card */
  U.controlsCard = function () {
    return RT.settings.controls === 'keyboard'
      ? '<kbd>WASD</kbd> move · <kbd>ARROWS</kbd> look · <kbd>F</kbd> fire (hold) · <kbd>Q</kbd> aim<br>' +
        '<kbd>E</kbd> use · <kbd>R</kbd> reload · <kbd>1–4</kbd> weapons · <kbd>SHIFT</kbd> / <kbd>W·W</kbd> sprint<br>' +
        '<kbd>C</kbd> crouch/slide · <kbd>SPACE</kbd> jump/mantle · <kbd>Z</kbd>/<kbd>X</kbd> lean · <kbd>I</kbd> inspect<br>' +
        '<kbd>G</kbd> frag (hold) · <kbd>B</kbd> smoke · <kbd>H</kbd> medkit · <kbd>ESC</kbd> pause'
      : '<kbd>WASD</kbd> move · <kbd>MOUSE</kbd> look · <kbd>LMB</kbd> fire · <kbd>RMB</kbd> aim<br>' +
        '<kbd>E/F</kbd> use · <kbd>R</kbd> reload · <kbd>1–4</kbd> weapons · <kbd>SHIFT</kbd> / <kbd>W·W</kbd> sprint<br>' +
        '<kbd>C</kbd> crouch/slide · <kbd>SPACE</kbd> jump/mantle · <kbd>Z</kbd>/<kbd>X</kbd> lean · <kbd>I</kbd> inspect<br>' +
        '<kbd>G</kbd> frag (hold) · <kbd>B</kbd> smoke · <kbd>H</kbd> medkit · <kbd>ESC</kbd> pause';
  };

  /* ---------- fade / letterbox ---------- */
  U.fade = function (dark, slow) {
    const f = $('fade');
    f.classList.toggle('slow', !!slow);
    f.style.opacity = dark ? 1 : 0;
  };
  U.letterbox = function (on) {
    $('letterbox').classList.toggle('on', on);
    $('skip-hint').classList.toggle('on', on);
  };

  /* ---------- HUD ---------- */
  U.showHUD = on => hud.classList.toggle('on', on);
  U.setCrosshairSpread = function (px, adsK) {
    const ch = $('crosshair');
    if (!ch) return;
    const sp = clamp(10 + px, 8, 60);
    ch.style.opacity = adsK > 0.6 ? 0 : 1;
    const ls = ch.querySelectorAll('.l');
    ls[0].style.left = -sp - 9 + 'px'; ls[1].style.right = -sp - 9 + 'px';
    ls[2].style.top = -sp - 9 + 'px'; ls[3].style.bottom = -sp - 9 + 'px';
  };
  let hmT = 0;
  U.hitmarker = function (kill) {
    const h = $('hitmarker');
    h.style.opacity = 1;
    h.classList.toggle('kill', !!kill);
    hmT = 0.18;
  };
  U.pulseVignette = function (a) { $('vignette').style.opacity = clamp(a, 0, 1); };

  /* loading overlay with rotating field tips */
  const LOAD_TIPS = [
    'Double-tap W for a tactical sprint, then slide with Crouch.',
    'Slide into cover, then cancel with Jump to keep your momentum.',
    'Vault low walls by jumping into them — mantling clears the ledge.',
    'Lean around corners with Z and X to peek without exposing yourself.',
    'Shoot the red barrels near cover to flush entrenched enemies.',
    'Rounds punch through thin wood and drywall — deny the enemy cover.',
    'Throw smoke (B) to break line-of-sight and reposition under cover.',
    'Headshots pay double XP — steady your aim before the trigger.',
    'Earn XP to unlock weapon camos in the Armory.',
    'In THUNDERDROP, the storm wall closes in — keep inside the circle.',
    'Vehicles cross the map fast; arrow keys steer in keyboard mode.',
    'Hold I to inspect your weapon between firefights.',
  ];
  U.showLoading = function (label) {
    const l = $('loading');
    $('load-tip').innerHTML = '<b style="color:#cfc8ba">TIP</b>&nbsp;&nbsp;' + (label || LOAD_TIPS[(Math.random() * LOAD_TIPS.length) | 0]);
    l.style.display = 'flex';
    requestAnimationFrame(() => { l.style.opacity = '1'; });
  };
  U.hideLoading = function () {
    const l = $('loading');
    l.style.opacity = '0';
    setTimeout(() => { if (l.style.opacity === '0') l.style.display = 'none'; }, 320);
  };
  let lastHP = 100;
  U.setHealth = function (h, sinceHurt) {
    const low = $('health-low');
    low.style.opacity = h < 45 ? (1 - h / 45) * (0.72 + Math.sin(RT.engine.time * 6) * 0.15) : 0;
    if (sinceHurt > 1.2) $('vignette').style.opacity = clamp(1.15 - h / 100 - sinceHurt * 0.12, 0, 0.9);
    /* segmented HP bar: 4 × 25, white→red, damage flash, regen pulse */
    const regen = h > lastHP + 0.01;
    const hurt = h < lastHP - 0.1;
    for (let i = 0; i < 4; i++) {
      const segFill = clamp((h - i * 25) / 25, 0, 1);
      const f = $('hp-f' + i);
      if (!f) return;
      f.style.transform = `scaleX(${segFill})`;
      const t = h / 100;
      f.style.background = hurt ? '#fff' : `rgb(${255 - t * 30 | 0},${60 + t * 195 | 0},${55 + t * 185 | 0})`;
      f.style.boxShadow = regen ? '0 0 6px rgba(140,255,160,.8)' : 'none';
    }
    $('hp-num').textContent = Math.ceil(h);
    $('hp-num').style.color = h < 35 ? '#e04c3c' : '#fff';
    lastHP = h;
  };
  let ffT = 0;
  U.friendlyWarn = function () { $('ff-warn').style.opacity = 1; ffT = 0.7; };
  U.damageFrom = function (angle) {
    const d = el('div', 'dmg-arc', $('dmgdir'));
    d.style.transform = `rotate(${angle}rad)`;
    d.style.opacity = 0.9;
    setTimeout(() => { d.style.transition = 'opacity .7s'; d.style.opacity = 0; }, 240);
    setTimeout(() => d.remove(), 1100);
  };
  U.setInteract = function (label) {
    const it = $('interact');
    it.style.opacity = label ? 1 : 0;
    if (label) $('interact-label').textContent = label;
  };
  U.refreshAmmo = function () {
    if (!RT.weapons || !RT.weapons.state().curId) return;
    const st = RT.weapons.state();
    const cfg = RT.weapons.CFG[st.curId];
    $('ammo-name').textContent = cfg.name;
    $('ammo-mag').textContent = st.ammo.mag;
    $('ammo-res').textContent = '/ ' + st.ammo.res;
    $('ammo-mag').style.color = st.ammo.mag === 0 ? '#e04c3c' : (st.ammo.mag <= cfg.mag * 0.25 ? '#e8a33d' : '#fff');
    $('ammo-gren').textContent = 'FRAG × ' + RT.player.grenades + (RT.player.smokes ? '   SMOKE × ' + RT.player.smokes : '');
  };

  /* ---------- subtitles ---------- */
  U.say = function (who, text, dur, minor) {
    subQueue.push({ who, text, dur: dur || (1.2 + text.length * 0.045), minor });
    if (RT.audio && !minor) RT.audio.radioCrackle();
  };
  U.clearSubtitles = () => { subQueue = []; subCur = null; $('subtitles').innerHTML = ''; };

  /* ---------- toast + objectives ---------- */
  U.toast = function (main, sub) {
    $('toast-main').textContent = main;
    $('toast-sub').textContent = sub || 'OBJECTIVE';
    $('toast').style.opacity = 1;
    toastT = 3.2;
    if (RT.audio) RT.audio.objectiveStinger();
  };
  U.toastMsg = function (text) {
    $('toast-main').textContent = text;
    $('toast-sub').textContent = '';
    $('toast').style.opacity = 1;
    toastT = 2.2;
  };
  let objList = [];
  U.setObjectives = function (list) { objList = list; renderObjectives(); };
  function renderObjectives() {
    const wrap = $('obj-list');
    wrap.innerHTML = '';
    for (const o of objList) {
      if (o.hidden) continue;
      el('div', 'obj-item' + (o.done ? ' done' : ''), wrap, o.text);
    }
  }
  U.completeObjective = function (o) { o.done = true; renderObjectives(); };
  U.refreshObjectives = renderObjectives;

  /* ---------- waypoints ---------- */
  const _wv = new THREE.Vector3();
  U.waypointTargets = [];  // [{x,y,z,label}]
  function updateWaypoints() {
    const cam = RT.engine.camera;
    for (let i = 0; i < waypoints.length; i++) {
      const w = waypoints[i];
      const t = U.waypointTargets[i];
      if (!t) { w.classList.add('hidden'); continue; }
      w.classList.remove('hidden');
      _wv.set(t.x, t.y, t.z).project(cam);
      let x = (_wv.x * 0.5 + 0.5) * innerWidth;
      let y = (-_wv.y * 0.5 + 0.5) * innerHeight;
      const behind = _wv.z > 1;
      if (behind) { x = innerWidth - x; y = innerHeight * 0.86; }
      x = clamp(x, 40, innerWidth - 40);
      y = clamp(y, 60, innerHeight - 80);
      w.style.left = x + 'px'; w.style.top = y + 'px';
      const d = Math.hypot(t.x - RT.player.pos.x, t.z - RT.player.pos.z);
      w.querySelector('.dist').textContent = Math.round(d) + 'm';
      w.style.opacity = d < 4 ? 0.25 : 0.95;
    }
  }

  /* ---------- compass ---------- */
  function drawCompass() {
    const cv = $('compass');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, 420, 34);
    const yaw = RT.player ? RT.player.yaw : 0;
    const heading = ((-yaw) % TAU + TAU) % TAU;
    ctx.font = '600 13px Segoe UI, Arial';
    ctx.textAlign = 'center';
    const pxPerRad = 420 / (Math.PI * 0.9);
    const labels = [['N', 0], ['NE', Math.PI / 4], ['E', Math.PI / 2], ['SE', Math.PI * 0.75], ['S', Math.PI], ['SW', Math.PI * 1.25], ['W', Math.PI * 1.5], ['NW', Math.PI * 1.75]];
    for (const [lab, ang] of labels) {
      let d = ang - heading;
      while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
      const x = 210 + d * pxPerRad;
      if (x < -20 || x > 440) continue;
      ctx.fillStyle = lab.length === 1 ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.55)';
      ctx.fillText(lab, x, 14);
    }
    for (let deg = 0; deg < 360; deg += 15) {
      const ang = deg * DEG;
      let d = ang - heading;
      while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
      const x = 210 + d * pxPerRad;
      if (x < 0 || x > 420) continue;
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      ctx.fillRect(x, 20, 1, deg % 45 === 0 ? 7 : 4);
    }
    /* allies: green ticks */
    if (RT.ai) {
      for (const al of RT.ai.allies) {
        const ang = Math.atan2(al.x - RT.player.pos.x, -(al.z - RT.player.pos.z));
        let d = ang - heading;
        while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
        const x = 210 + d * pxPerRad;
        if (x < 4 || x > 416) continue;
        ctx.fillStyle = '#7fe08a';
        ctx.fillRect(x - 1.5, 22, 3, 8);
      }
    }
    /* objective bearing chevrons */
    for (const t of U.waypointTargets) {
      if (!t) continue;
      const ang = Math.atan2(t.x - RT.player.pos.x, -(t.z - RT.player.pos.z));
      let d = ang - heading;
      while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
      const x = clamp(210 + d * pxPerRad, 8, 412);
      ctx.fillStyle = '#e8a33d';
      ctx.beginPath();
      ctx.moveTo(x - 5, 32); ctx.lineTo(x + 5, 32); ctx.lineTo(x, 24);
      ctx.fill();
    }
    /* center tick */
    ctx.fillStyle = '#e8a33d';
    ctx.fillRect(209, 2, 2, 8);
  }

  /* ---------- countdown timer ---------- */
  let timerVal = -1;
  U.setTimer = function (sec) { timerVal = sec; $('timer').style.display = 'block'; };
  U.clearTimer = function () { timerVal = -1; if ($('timer')) $('timer').style.display = 'none'; };
  U.tickTimer = function (dt) {
    if (timerVal < 0) return -1;
    timerVal -= dt;
    const t = Math.max(0, timerVal);
    const e = $('timer');
    e.textContent = RT.fmtTime(t) + (t < 10 ? '.' + Math.floor((t % 1) * 10) : '');
    e.style.color = t < 12 ? (Math.sin(RT.engine.time * 9) > 0 ? '#e04c3c' : '#fff') : '#fff';
    return timerVal;
  };

  /* ---------- teammate indicators: chevron + name + micro HP bar ---------- */
  const allyTags = [];
  const _av = new THREE.Vector3();
  function updateAllyTags(dt) {
    if (!RT.ai) return;
    const allies = RT.ai.allies;
    while (allyTags.length < allies.length) {
      const tag = el('div', '', hud);
      tag.style.cssText = 'position:absolute;pointer-events:none;text-align:center;transform:translate(-50%,-100%);transition:opacity .2s';
      tag.innerHTML = '<div class="aname" style="font-size:10px;letter-spacing:.14em;color:#8fe096;text-shadow:0 1px 3px #000;font-weight:700"></div>' +
        '<div style="color:#8fe096;font-size:9px;line-height:5px">▼</div>' +
        '<div style="width:34px;height:3px;background:rgba(0,0,0,.5);margin:2px auto 0"><div class="ahp" style="height:100%;background:#7fe08a;width:100%"></div></div>';
      allyTags.push({ tag, occlT: 0, occluded: false });
    }
    const cam = RT.engine.camera;
    allies.forEach((al, i) => {
      const t = allyTags[i];
      if (!t) return;
      const d = Math.hypot(al.x - RT.player.pos.x, al.z - RT.player.pos.z);
      _av.set(al.x, al.y + 2.05, al.z).project(cam);
      const behind = _av.z > 1;
      if (behind || d > 70 || RT.game.state !== 'play') { t.tag.style.opacity = 0; return; }
      /* occlusion check at 3Hz — dim but never fully hide within 40m */
      t.occlT -= dt;
      if (t.occlT <= 0) {
        t.occlT = 0.33;
        const dy = (al.y + 1.5) - RT.player.eyeY();
        const d3 = Math.hypot(d, dy);
        t.occluded = !!RT.map.raycast(RT.player.pos.x, RT.player.eyeY(), RT.player.pos.z,
          (al.x - RT.player.pos.x) / d3, dy / d3, (al.z - RT.player.pos.z) / d3, d3 - 0.6);
      }
      t.tag.style.left = ((_av.x * 0.5 + 0.5) * innerWidth) + 'px';
      t.tag.style.top = ((-_av.y * 0.5 + 0.5) * innerHeight) + 'px';
      t.tag.style.opacity = t.occluded ? (d < 40 ? 0.35 : 0) : clamp(1.3 - d / 70, 0.35, 1);
      const sc = clamp(1.25 - d / 60, 0.7, 1.15);
      t.tag.style.transform = `translate(-50%,-100%) scale(${sc})`;
      const nameEl = t.tag.querySelector('.aname');
      if (nameEl.textContent !== al.name) nameEl.textContent = al.name;
      t.tag.querySelector('.ahp').style.width = clamp(al.hp != null ? al.hp : 100, 0, 100) + '%';
      if (al.down) { nameEl.textContent = al.name + ' — DOWN'; nameEl.style.color = '#e8a33d'; }
    });
  }

  /* ---------- per-frame ---------- */
  U.update = function (dt) {
    /* hitmarker fade */
    if (hmT > 0) { hmT -= dt; if (hmT <= 0) $('hitmarker').style.opacity = 0; }
    if (ffT > 0) { ffT -= dt; if (ffT <= 0) $('ff-warn').style.opacity = 0; }
    updateAllyTags(dt);
    /* toast */
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').style.opacity = 0; }
    /* subtitles */
    if (subCur) {
      subCur.dur -= dt;
      if (subCur.dur <= 0) { subCur = null; $('subtitles').innerHTML = ''; }
    }
    if (!subCur && subQueue.length) {
      subCur = subQueue.shift();
      $('subtitles').innerHTML = `<div class="line"><span class="who">${subCur.who}:</span> ${subCur.text}</div>`;
    }
    if (RT.game && RT.game.state === 'play') {
      drawCompass();
      updateWaypoints();
    }
  };

  return U;
})();
RT.hud = RT.ui; // player/weapons call RT.hud.*
