/* ============================================================
 * Tier 5 — Firing Range: a safe practice map with pop-up steel
 * targets, every weapon, and a live hit counter.
 * ============================================================ */
RT.range = (() => {
  const R = {};
  let score = 0, best = 0, hudEl = null, targets = [];

  function buildRange() {
    RT.engine.clearWorld();
    RT.ai.reset();
    const def = {
      atmosphere: RT.missions[0].atmosphere,
      terrain: {
        size: 300, segs: 96, seed: 7, amp: 2.2, rim: 8,
        palette: { lush: 0x5d6b38, lush2: 0x71793f, dirt: 0x77664a, rock: 0x74705f, road: 0x6d6354 },
        flats: [{ x: 0, z: -55, r: 150 }], roads: [], craters: [],
      },
    };
    RT.engine.setAtmosphere(def.atmosphere);
    const terrain = new RT.Terrain(def.terrain);
    const B = new RT.MapBuilder(terrain, 7);
    RT.map = B; RT.map.def = def;
    const P = RT.props;
    /* firing line */
    P.sandbags(B, -5, 6, 0, 6, {});
    P.sandbags(B, 6, 6, 0, 5, {});
    P.crate(B, -10, 7.5, { stack: true });
    P.crate(B, 11, 7.5, {});
    P.explosiveBarrel(B, 16, 8, {});
    P.window(B, -16, B.h(-16, 7) + 1.4, 7, 0, 1.6, 1.3, {});   // a pane to plink
    /* target rows downrange (negative z), bigger the farther out */
    targets = [];
    const rows = [[-12, 3, 1.0], [-28, 4, 1.05], [-55, 4, 1.25], [-100, 3, 1.7]];
    for (const [dz, n, s] of rows) {
      for (let i = 0; i < n; i++) targets.push(P.steelTarget(B, (i - (n - 1) / 2) * 6, dz, { s }));
      P.sign(B, (n / 2) * 6 + 6, dz, 0.2);
    }
    /* backstop berm */
    for (let x = -60; x <= 60; x += 12) P.sandbags(B, x, -120, 0, 13, {});
    P.scatterGrass(B, 2600, 150, 0x5f6c39);
    P.scatterRocks(B, 40, 150);
    RT.engine.world.add(B.finalize());
    RT.engine.setWeather(null);
  }

  function buildHud() {
    if (!hudEl) {
      hudEl = RT.el('div', '', RT.$('hud'));
      hudEl.style.cssText = 'position:absolute;top:78px;left:50%;transform:translateX(-50%);text-align:center;color:#fff;text-shadow:0 1px 5px #000';
    }
    hudEl.style.display = 'block';
    updateHud();
  }
  function updateHud() {
    if (hudEl) hudEl.innerHTML = '<div style="font-size:13px;letter-spacing:.34em;color:var(--amber)">FIRING RANGE</div>' +
      '<div style="font-size:26px;font-weight:800;letter-spacing:.05em">HITS ' + score + (best ? ' <span style="font-size:13px;color:var(--ink-dim)">BEST ' + best + '</span>' : '') + '</div>' +
      '<div style="font-size:11px;color:var(--ink-dim);letter-spacing:.1em">[T] reset · [1–4] weapons · [B] smoke · ESC pause</div>';
  }
  R.onHit = function () { score++; if (score > best) best = score; updateHud(); };
  R.update = function () {
    if (RT.input.pressed('KeyT')) {
      score = 0; updateHud();
      for (const t of targets) { t.hits = 0; if (t.pivot) t.pivot.rotation.x = 0; }
      if (RT.audio) RT.audio.objectiveStinger && RT.audio.objectiveStinger();
    }
  };
  R.exit = function () { if (hudEl) { hudEl.style.display = 'none'; hudEl.innerHTML = ''; } score = 0; };

  R.startRange = function () {
    RT.audio.ensure();
    RT.audio.menuMusic(false);
    RT.ui.hideScreens();
    RT.ui.fade(true);
    RT.ui.showLoading('Firing range — sight in your weapons and warm up.');
    setTimeout(() => {
      buildRange();
      RT.player.init({ x: 0, z: 9, ry: 0 });          // face downrange (−z)
      RT.weapons.setLoadout(['m4', 'dmr', 'shotgun', 'pistol'], true);
      for (const id of ['m4', 'dmr', 'shotgun', 'pistol']) RT.weapons.giveAmmoFor(id, 9999);
      RT.player.grenades = 4;
      RT.game.state = 'play';
      RT.game.missionIdx = -1;
      RT.game._range = true;
      score = 0;
      buildHud();
      RT.ui.showHUD(true);
      RT.ui.hideLoading();
      RT.ui.fade(false, true);
      RT.ui.toast('FIRING RANGE', 'Ring the steel · [T] to reset');
      RT.audio.setAmbient('birds');
      RT.weapons.setVisible(true);
    }, 700);
  };
  return R;
})();
