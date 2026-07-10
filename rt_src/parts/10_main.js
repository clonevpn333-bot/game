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

  /* temporary boot scene */
  const ground = RT.meshOf([RT.G.box(200, 0.5, 200, 0x6a7a4a, { y: -0.25, vary: 0.15 })]);
  RT.engine.world.add(ground);
  for (let i = 0; i < 10; i++) {
    RT.engine.world.add(RT.meshOf([RT.G.cbox(2, 2 + i * 0.3, 2, 0.1, 0x8a7a5a, { x: -20 + i * 4.5, y: 1 + i * 0.15, z: -14 })]));
  }
  RT.engine.camera.position.set(0, 3, 12);
  RT.engine.onUpdate((dt) => {
    RT.engine.camera.rotation.y += dt * 0.05;
    RT.engine.updateSun(RT.engine.camera.position);
  });
  RT.engine.start();
  RT.$('boot-msg').classList.add('hidden');
  window.RT_BOOT = 'ok';
  console.log('RT boot ok');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
