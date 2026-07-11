/* ============================================================
 * Tier 2 — progression: XP, ranks, unlockable weapon camos,
 * challenges. Persists inside RT.ui.progress (localStorage).
 * ============================================================ */
RT.progress = (() => {
  const P = {};
  const U = RT.ui;

  /* weapon camos — tint multiplies the gun-body vertex colours */
  const CAMOS = [
    { id: 'default', name: 'Standard', tint: 0xffffff, unlock: { level: 1 } },
    { id: 'woodland', name: 'Woodland', tint: 0x6f7548, unlock: { level: 2 } },
    { id: 'urban', name: 'Urban Fleck', tint: 0x9298a0, unlock: { chal: 'marksman' } },
    { id: 'desert', name: 'Desert', tint: 0xbda06f, unlock: { level: 5 } },
    { id: 'crimson', name: 'Crimson', tint: 0xa23b34, unlock: { chal: 'pyro' } },
    { id: 'midnight', name: 'Midnight', tint: 0x455170, unlock: { level: 9 } },
    { id: 'ember', name: 'Ember', tint: 0xd06a2a, unlock: { level: 13 } },
    { id: 'gold', name: 'Gold Tiger', tint: 0xcaa028, unlock: { chal: 'champion' } },
  ];
  const CAMO_BY = {}; for (const c of CAMOS) CAMO_BY[c.id] = c;

  /* challenges — checked against the running tally */
  const CHALLENGES = [
    { id: 'marksman', name: 'Marksman', desc: 'Land 25 headshots', stat: 'heads', goal: 25, reward: 'Urban Fleck camo', xp: 400 },
    { id: 'pyro', name: 'Pyrotechnic', desc: 'Destroy 15 explosive barrels', stat: 'barrels', goal: 15, reward: 'Crimson camo', xp: 400 },
    { id: 'glazier', name: 'Glazier', desc: 'Shatter 40 windows', stat: 'windows', goal: 40, reward: '600 XP', xp: 600 },
    { id: 'champion', name: 'Thunder Champion', desc: 'Win a THUNDERDROP match', stat: 'brWins', goal: 1, reward: 'Gold Tiger camo', xp: 1500 },
    { id: 'operator', name: 'Seasoned Operator', desc: 'Reach Rank 8', stat: 'level', goal: 8, reward: '800 XP', xp: 800 },
  ];

  const RANKS = ['Recruit', 'Private', 'Corporal', 'Sergeant', 'Staff Sgt.', 'Gunnery Sgt.', 'Lieutenant', 'Captain', 'Major', 'Colonel', 'Commander', 'Vanguard'];
  const xpForRank = lvl => Math.round(600 * lvl * Math.pow(1.18, lvl - 1));   // XP to go from lvl→lvl+1
  function levelFromXP(xp) {
    let lvl = 1, acc = 0;
    while (lvl < 60) { const need = xpForRank(lvl); if (xp < acc + need) break; acc += need; lvl++; }
    return { level: lvl, into: xp - acc, need: xpForRank(lvl) };
  }
  P.rankName = lvl => RANKS[Math.min(lvl, RANKS.length) - 1] + (lvl > RANKS.length ? ' ' + (lvl - RANKS.length + 1) : '');
  P.levelFor = xp => levelFromXP(xp || 0).level;

  function data() {
    const pr = U.progress;
    if (!pr.xp) pr.xp = 0;
    if (!pr.camo) pr.camo = 'default';
    if (!pr.camos) pr.camos = ['default'];
    if (!pr.tally) pr.tally = { heads: 0, barrels: 0, windows: 0, brWins: 0 };
    if (!pr.chalDone) pr.chalDone = {};
    return pr;
  }
  P.currentCamo = () => CAMO_BY[data().camo] || CAMO_BY.default;

  /* ---------- weapon camo painting ---------- */
  const gunCache = {};
  function tintedGun(camo) {
    if (camo.id === 'default') return RT.MAT.gun;
    if (!gunCache[camo.id]) {
      const m = RT.MAT.gun.clone();
      const col = RT.lin ? RT.lin(camo.tint) : new THREE.Color(camo.tint);
      m.color = col.clone().multiplyScalar(1.5);              // lift the multiply off the dark gunmetal base
      m.emissive = col.clone();
      m.emissiveIntensity = 0.16;                             // faint anodized sheen so the finish reads
      m.userData = { isCamo: true };
      gunCache[camo.id] = m;
    }
    return gunCache[camo.id];
  }
  P.paintWeapon = function (root) {
    if (!root) return;
    const gm = tintedGun(P.currentCamo());
    root.traverse(o => {
      if (o.isMesh && (o.material === RT.MAT.gun || (o.material && o.material.userData && o.material.userData.isCamo))) o.material = gm;
    });
  };

  /* ---------- XP + unlock engine ---------- */
  function unlockCamosForLevel(lvl, out) {
    const pr = data();
    for (const c of CAMOS) if (c.unlock.level && c.unlock.level <= lvl && !pr.camos.includes(c.id)) { pr.camos.push(c.id); out.push(c.name + ' camo'); }
  }
  P.addXP = function (amount, label) {
    const pr = data();
    const before = levelFromXP(pr.xp).level;
    pr.xp += amount;
    const after = levelFromXP(pr.xp).level;
    const unlocked = [];
    if (after > before) {
      unlockCamosForLevel(after, unlocked);
      checkChallenges(unlocked);   // level-based challenges
      if (RT.audio && RT.audio.objectiveStinger) RT.audio.objectiveStinger();
      RT.ui.toast('RANK UP', 'Rank ' + after + ' · ' + P.rankName(after));
    }
    for (const u of unlocked) RT.ui.toastMsg && RT.ui.toastMsg('UNLOCKED: ' + u);
    U.saveProgress();
    refreshArmory();
    return { xp: amount, label };
  };
  function checkChallenges(out) {
    const pr = data();
    const lvl = levelFromXP(pr.xp).level;
    for (const ch of CHALLENGES) {
      if (pr.chalDone[ch.id]) continue;
      const val = ch.stat === 'level' ? lvl : (pr.tally[ch.stat] || 0);
      if (val >= ch.goal) {
        pr.chalDone[ch.id] = true;
        if (ch.reward.indexOf('camo') >= 0) {
          const camo = CAMOS.find(c => c.unlock.chal === ch.id);
          if (camo && !pr.camos.includes(camo.id)) { pr.camos.push(camo.id); out.push(camo.name + ' camo'); }
        }
        RT.ui.toast('CHALLENGE COMPLETE', ch.name + ' · +' + ch.xp + ' XP');
        pr.xp += ch.xp;              // direct (avoid re-entrant addXP)
        const nl = levelFromXP(pr.xp).level;
        unlockCamosForLevel(nl, out);
      }
    }
  }
  P.tally = function (stat, n) {
    const pr = data();
    pr.tally[stat] = (pr.tally[stat] || 0) + (n || 1);
    const out = [];
    checkChallenges(out);
    for (const u of out) RT.ui.toastMsg && RT.ui.toastMsg('UNLOCKED: ' + u);
    U.saveProgress(); refreshArmory();
  };

  /* ---------- event hooks ---------- */
  P.onKill = function (headshot, isBR) {
    if (headshot) P.tally('heads', 1);
    P.addXP((isBR ? 40 : 25) + (headshot ? 15 : 0), 'Kill');
  };
  P.onMissionComplete = function (id, time, acc) {
    P.addXP(500 + Math.round(acc * 3), 'Mission ' + id);
  };
  P.onBRResult = function (placement, kills, win) {
    if (win) P.tally('brWins', 1);
    const place = Math.max(1, placement);
    P.addXP((win ? 1000 : Math.round((50 - place) * 12)) + kills * 40, 'THUNDERDROP #' + place);
  };

  /* ---------- armory UI ---------- */
  let built = false;
  function buildArmory() {
    if (built) return; built = true;
    const s = RT.el('div', 'screen fading', document.body);
    s.id = 'armory-screen'; s.classList.add('hidden');
    s.innerHTML = '<div class="scrim"></div><div class="inner">' +
      '<div class="panel-title"><small>Career</small>Armory</div>' +
      '<div class="panel" style="max-width:660px">' +
      '<div id="ar-rank" style="display:flex;align-items:center;gap:16px;margin-bottom:6px"></div>' +
      '<div style="height:10px;background:rgba(255,255,255,.1);border-radius:5px;overflow:hidden;margin:4px 0 4px">' +
      '<div id="ar-xpbar" style="height:100%;width:0;background:linear-gradient(90deg,#e8a33d,#ffd27a);transition:width .5s"></div></div>' +
      '<div id="ar-xptext" style="font-size:11px;letter-spacing:.14em;color:var(--ink-dim);text-align:right;margin-bottom:16px"></div>' +
      '<div class="menu-foot">Weapon Camo</div>' +
      '<div id="ar-camos" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:10px 0 18px"></div>' +
      '<div class="menu-foot">Challenges</div>' +
      '<div id="ar-chal" style="margin:10px 0 6px"></div>' +
      '<div class="back-row"><button class="menu-btn" id="btn-ar-back">Back</button></div></div></div>';
    RT.$('btn-ar-back').onclick = () => U.showMenu();
  }
  function refreshArmory() {
    if (!built || !RT.$('ar-rank')) return;
    const pr = data();
    const li = levelFromXP(pr.xp);
    RT.$('ar-rank').innerHTML =
      '<div style="width:52px;height:52px;border:2px solid var(--amber);border-radius:50%;display:flex;align-items:center;justify-content:center;' +
      'font-size:22px;font-weight:800;color:var(--amber)">' + li.level + '</div>' +
      '<div><div style="font-size:19px;font-weight:700;letter-spacing:.06em">' + P.rankName(li.level) + '</div>' +
      '<div style="font-size:11px;letter-spacing:.2em;color:var(--ink-dim)">RANK ' + li.level + ' · ' + pr.xp + ' XP TOTAL</div></div>';
    RT.$('ar-xpbar').style.width = Math.round(100 * li.into / li.need) + '%';
    RT.$('ar-xptext').textContent = li.into + ' / ' + li.need + ' XP TO RANK ' + (li.level + 1);
    /* camos */
    const cg = RT.$('ar-camos'); cg.innerHTML = '';
    for (const c of CAMOS) {
      const owned = pr.camos.includes(c.id), sel = pr.camo === c.id;
      const cell = RT.el('div', '', cg);
      const hex = '#' + c.tint.toString(16).padStart(6, '0');
      cell.style.cssText = 'cursor:' + (owned ? 'pointer' : 'default') + ';border:2px solid ' + (sel ? 'var(--amber)' : 'rgba(255,255,255,.14)') +
        ';border-radius:6px;padding:7px;text-align:center;opacity:' + (owned ? '1' : '0.45') + ';transition:border-color .15s';
      cell.innerHTML = '<div style="height:34px;border-radius:4px;background:' + hex + ';box-shadow:inset 0 0 12px rgba(0,0,0,.5)"></div>' +
        '<div style="font-size:10px;letter-spacing:.08em;margin-top:6px;color:' + (owned ? '#fff' : 'var(--ink-dim)') + '">' + (owned ? c.name : '🔒 ' + unlockHint(c)) + '</div>';
      if (owned) cell.onclick = () => { pr.camo = c.id; U.saveProgress(); refreshArmory(); if (RT.audio) RT.audio.uiTick && RT.audio.uiTick(); };
    }
    /* challenges */
    const chEl = RT.$('ar-chal'); chEl.innerHTML = '';
    for (const ch of CHALLENGES) {
      const val = ch.stat === 'level' ? li.level : (pr.tally[ch.stat] || 0);
      const done = pr.chalDone[ch.id], pct = Math.min(100, Math.round(100 * val / ch.goal));
      const row = RT.el('div', '', chEl);
      row.style.cssText = 'margin-bottom:11px';
      row.innerHTML = '<div style="display:flex;justify-content:space-between;font-size:12px;letter-spacing:.06em">' +
        '<span style="color:' + (done ? 'var(--amber)' : '#fff') + '">' + (done ? '✓ ' : '') + ch.name + ' — <span style="color:var(--ink-dim)">' + ch.desc + '</span></span>' +
        '<span style="color:var(--ink-dim)">' + Math.min(val, ch.goal) + '/' + ch.goal + '</span></div>' +
        '<div style="height:5px;background:rgba(255,255,255,.1);border-radius:3px;margin-top:4px;overflow:hidden">' +
        '<div style="height:100%;width:' + pct + '%;background:' + (done ? 'var(--amber)' : '#7f9fd8') + '"></div></div>';
    }
  }
  function unlockHint(c) {
    if (c.unlock.level) return 'Rank ' + c.unlock.level;
    const ch = CHALLENGES.find(x => x.id === c.unlock.chal);
    return ch ? ch.name : 'Locked';
  }
  P.refreshArmory = refreshArmory;
  P.openArmory = function () { buildArmory(); refreshArmory(); U.showScreen('armory-screen'); };

  /* easter egg: the Konami code unlocks every weapon camo */
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
  let kseq = [];
  function konamiWatch() {
    document.addEventListener('keydown', (e) => {
      kseq.push(e.code); if (kseq.length > KONAMI.length) kseq.shift();
      if (kseq.join() === KONAMI.join()) {
        kseq = [];
        const pr = data();
        let n = 0;
        for (const c of CAMOS) if (!pr.camos.includes(c.id)) { pr.camos.push(c.id); n++; }
        U.saveProgress(); refreshArmory();
        RT.ui.toast('⚡ OVERDRIVE ⚡', n ? 'All weapon camos unlocked' : 'You already have everything, Sergeant');
        if (RT.audio && RT.audio.missionCompleteStinger) RT.audio.missionCompleteStinger();
        if (RT.game && RT.game.victoryFlair && RT.game.state === 'play') RT.game.victoryFlair();
      }
    });
  }

  P.init = function () {
    data();
    buildArmory();
    if (RT.$('btn-armory')) RT.$('btn-armory').onclick = () => P.openArmory();
    refreshArmory();
    konamiWatch();
  };
  return P;
})();
