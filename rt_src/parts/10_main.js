/* ============================================================
 * Boot / orchestration
 * ============================================================ */
function boot() {
  if (typeof THREE === 'undefined') {
    RT.$('boot-msg').textContent = 'FAILED TO LOAD RENDERER (check connection)';
    return;
  }
  RT.engine.init();
  RT.input.init(RT.engine.renderer.domElement);
  RT.engine.setAtmosphere({
    top: 0x3e5a80, horizon: 0xe8b07a, ground: 0x5a4a3a,
    sunDir: new THREE.Vector3(-0.5, 0.35, -0.6), sunColor: 0xffd9a8, sunIntensity: 2.4,
    hemiSky: 0xc7ad8a, hemiGround: 0x4a4238, hemiIntensity: 0.5,
    fogColor: 0xd9b48c, fogDensity: 0.004,
  });

  RT.engine.onUpdate((dt) => {
    if (RT.transients) {
      for (let i = RT.transients.length - 1; i >= 0; i--) if (!RT.transients[i](dt)) RT.transients.splice(i, 1);
    }
  });

  if (location.hash === '#soldier') { soldierViewer(); return finishBoot(); }

  /* temporary boot scene */
  const ground = RT.meshOf([RT.G.box(200, 0.5, 200, 0x6a7a4a, { y: -0.25, vary: 0.15 })]);
  RT.engine.world.add(ground);
  RT.engine.camera.position.set(0, 3, 12);
  RT.engine.onUpdate(() => RT.engine.updateSun(RT.engine.camera.position));
  finishBoot();
}

function finishBoot() {
  RT.engine.start();
  RT.$('boot-msg').classList.add('hidden');
  window.RT_BOOT = 'ok';
  console.log('RT boot ok');
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
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
