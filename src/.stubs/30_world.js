/* 30_world.js — procedural city. OWNER: world agent. STUB. */
VH.World = (function () {
  let world = null;
  function build(seed, district) {
    const group = new THREE.Group();
    const g = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), VH.Mat.get('asphalt'));
    g.rotation.x = -Math.PI / 2; group.add(g);
    world = {
      group, colliders: [], lights: [], district: district || 'undertide',
      navSample: () => ({ y: 0, walkable: true }),
      spawns: { player: new THREE.Vector3(0, 0, 0), enemy: [], cover: [] },
      bounds: new THREE.Box3(new THREE.Vector3(-200, 0, -200), new THREE.Vector3(200, 80, 200)),
    };
    return world;
  }
  function update() {}
  function raycastGround() { return 0; }
  function segments() { return ['undertide']; }
  return { build, update, raycastGround, segments };
})();
