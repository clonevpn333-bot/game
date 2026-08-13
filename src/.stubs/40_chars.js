/* 40_chars.js — procedural characters + animation. OWNER: character agent. STUB. */
VH.Chars = (function () {
  let nid = 0;
  function init() {}
  function create(archetype, opts) {
    opts = opts || {};
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.34, 1.05, 10), VH.Mat.get('fabricDark'));
    body.position.y = 1.0; group.add(body);
    const a = {
      id: (archetype === 'kas' ? 'p' : 'e') + (nid++), group, kind: opts.kind || (archetype === 'kas' ? 'player' : 'enemy'),
      archetype, team: opts.team === undefined ? (archetype === 'kas' ? 0 : 1) : opts.team,
      hp: opts.hp || 100, maxHp: opts.hp || 100, armor: 0, alive: true,
      radius: 0.42, height: 1.78, vel: new THREE.Vector3(), yaw: 0, state: 'idle',
      stagger: 0, iframes: 0, aim: new THREE.Vector3(), weapon: null, anim: {}, ai: {},
      headPos() { return group.position.clone().add(new THREE.Vector3(0, 1.62, 0)); },
      chestPos() { return group.position.clone().add(new THREE.Vector3(0, 1.25, 0)); },
    };
    return a;
  }
  function update() {}
  function play() {}
  function lookAt() {}
  function portrait() { return null; }
  return { init, create, update, play, lookAt, portrait };
})();
