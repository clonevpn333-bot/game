// Developer test arena: verifies traversal, tether, weapons and enemies in isolation.
import * as THREE from 'three';
import { Builder } from './builder.js';

export function buildArena(game) {
  const e = game.engine, M = game.materials;
  const root = new THREE.Group(); e.cityRoot.add(root);
  const b = new Builder(game, root);
  b.box('concrete', [0, -0.5, 0], [80, 1, 80], { tex: 4 });
  b.box('panel', [0, 1.6, -12], [12, 3.2, 1], { color: 0x8a9098, meta: { ledge: true } });
  b.box('hazard', [0, 3.25, -12], [12, 0.1, 1.05], { meta: { ledge: true } });
  b.box('panel', [10, 1.0, -4], [3, 2, 3], { color: 0x6a7078 });
  b.box('panel', [14, 0.5, -4], [3, 1, 3], { color: 0x6a7078 });
  b.box('grate', [-10, 3, 0], [6, 0.2, 10], { color: 0x9a9a9a });
  b.box('rust', [-10, 1.5, 5.1], [6, 3, 0.2], {});
  b.box('panel', [-18, 5, 0], [1, 10, 6], { color: 0x9a8a6a, meta: { climb: 'wall' } });
  b.box('panel', [-21, 9.9, 0], [6, 0.2, 6], { color: 0x8a9098 });
  b.ladder([5, 0, -11.45], 3.3, Math.PI);
  b.finalize();
  // lights
  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x6a5a48, 1.1); e.scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2c0, 3); sun.position.set(20, 30, 10); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 100 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  e.scene.add(sun);
  e.scene.background = new THREE.Color(0x8fa6bb);
  e.scene.fog = new THREE.Fog(0x8fa6bb, 40, 160);
  // dynamic crates
  for (let i = 0; i < 8; i++) {
    const s = 0.6 + Math.random() * 0.5;
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), M.wood); m.castShadow = m.receiveShadow = true;
    m.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(m.geometry.attributes.position.count * 3).fill(1), 3));
    m.position.set(-4 + i * 1.2, s / 2 + 0.01, 6); root.add(m);
    const body = game.physics.addDynamic(m, { type: 'box', hx: s / 2, hy: s / 2, hz: s / 2 }, { density: 200, surface: 'wood' });
    game.tether.registerBody(m, body, { label: 'Crate' });
  }
  // a moving piston anchor
  const piston = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), M.steel); piston.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(piston.geometry.attributes.position.count * 3).fill(0.8), 3));
  piston.position.set(20, 0.5, 8); root.add(piston);
  const k = game.physics.addKinematic(piston, [{ type: 'box', hx: 1, hy: 0.5, hz: 1 }]);
  let t = 0;
  game.add(dt => { t += dt; piston.position.y = 0.5 + (Math.sin(t * 0.8) * 0.5 + 0.5) * 8; });
  game.tether.registerAnchor({ getPoint: () => piston.position.clone().add(new THREE.Vector3(0, 0.6, 0)), getVelocity: () => new THREE.Vector3(0, Math.cos(t * 0.8) * 0.4 * 8, 0) });
  game.tether.register({ kind: 'machine', label: 'Piston', big: true, getPos: () => piston.position.clone(), getVel: () => new THREE.Vector3(0, 3, 0), capture: (dt) => 1200 * dt, push: () => {} });
  game.weapons.give('pistol'); game.weapons.give('carbine');
  game.player.relaxed = false;
  game.player.teleport(new THREE.Vector3(0, 0, 8), Math.PI);
  game.camera.snapBehind(Math.PI);
  game.enemies.spawn('gnat', new THREE.Vector3(0, 4, -25));
  game.enemies.spawn('gnat', new THREE.Vector3(8, 5, -25));
  game.enemies.spawn('leech', new THREE.Vector3(-6, 0, -22));
  game.enemies.spawn('shearer', new THREE.Vector3(20, 0, -26));
  game.killY = -50;
  return root;
}
