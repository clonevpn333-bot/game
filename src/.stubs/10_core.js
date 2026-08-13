/* 10_core.js — renderer, post-processing stack, camera rig. OWNER: core-render agent.
 * STUB: minimal working implementation so the build boots. Replace with the real thing. */
VH.Core = (function () {
  let renderer, scene, camera, ready = false;
  const camTarget = { pos: new THREE.Vector3(0, 3, 8), look: new THREE.Vector3(0, 1.5, 0), fov: 55, shakeMul: 1 };
  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!VH.q.cap });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070a);
    scene.fog = new THREE.FogExp2(0x0a1218, 0.018);
    camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 900);
    scene.add(new THREE.HemisphereLight(0x2a3d4a, 0x05070a, 0.6));
    const d = new THREE.DirectionalLight(0x9fd4e8, 0.5); d.position.set(-30, 60, 20); scene.add(d);
    API.scene = scene; API.camera = camera; API.renderer = renderer; API.env = null;
    addEventListener('resize', resize);
    ready = true;
  }
  function resize() { if (!ready) return; renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  function render() {
    if (!ready) return;
    camera.position.copy(camTarget.pos); camera.lookAt(camTarget.look);
    if (camera.fov !== camTarget.fov) { camera.fov = camTarget.fov; camera.updateProjectionMatrix(); }
    renderer.render(scene, camera);
  }
  const API = {
    init, render, resize, camTarget,
    scene: null, camera: null, renderer: null, env: null,
    setQuality() {}, shake() {}, hitstop() {}, registerLight() { return null; },
  };
  return API;
})();
