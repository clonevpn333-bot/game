/* 20_materials.js — procedural textures & materials. OWNER: materials agent. STUB. */
VH.Mat = (function () {
  const cache = {};
  const palette = { cyan: 0x00e5ff, magenta: 0xff2d6f, amber: 0xffb340, green: 0x7cff5a, base: 0x2a3238 };
  function init() {}
  function get(n) {
    if (cache[n]) return cache[n];
    const m = new THREE.MeshStandardMaterial({ color: 0x3a4248, roughness: 0.85, metalness: 0.1 });
    cache[n] = m; return m;
  }
  function tex() { return null; }
  function makeSign() { return null; }
  return { init, get, tex, makeSign, palette, noise2D: VH.util.noise2D, fbm: VH.util.fbm };
})();
