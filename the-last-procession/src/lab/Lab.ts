import * as THREE from 'three';
import { Pilgrim, Antlered, Carillon, Seraph, Leviathan, Behemoth } from '../world/Colossus';
import { WORLD_TIME } from '../gfx/Materials';
import { Sky, PALETTES } from '../world/Sky';
import { Terrain, Grass, Trees, rocks, mountains, setPushers } from '../world/Nature';
import { fbm } from '../util/math';
import { toonMaterial, TOON } from '../gfx/Toon';
import { Renderer } from '../engine/Renderer';
import { Actor } from '../actors/Actor';
import { citizen } from '../actors/Cast';

/** Dev viewer (?lab=cast): renders the cast in motion for visual review. */
export async function runLab(canvas: HTMLCanvasElement, mode: string): Promise<void> {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#9fb4c8');
  scene.fog = new THREE.Fog('#9fb4c8', 20, 60);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
  const r = new Renderer(canvas, scene, camera);
  scene.add(new THREE.HemisphereLight('#93a2d8', '#8a7a68', 2.0));
  const sun = new THREE.DirectionalLight('#fff0d8', 2.1);
  sun.position.set(-4, 8, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 48), toonMaterial({ color: '#8fa060' }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  if (mode === 'giants') return runGiants(r, scene, camera, ground);
  if (mode === 'meadow') return runMeadow(r, scene, camera, ground);
  if (mode === 'sky') return runSkyGiants(r, scene, camera);
  const actors: Actor[] = [];
  const t0 = performance.now();
  const ids = mode === 'faces' ? ['kael', 'lyra', 'maren', 'vesk'] : ['kael', 'lyra', 'maren', 'vesk', 'warden', 'guard'];
  ids.forEach((id, i) => {
    const a = new Actor(id);
    a.place(new THREE.Vector3((i - (ids.length - 1) / 2) * 1.0, 0, 0), 0);
    scene.add(a.root);
    actors.push(a);
  });
  if (mode !== 'faces') {
    (['man', 'woman', 'elder', 'soldierBlue', 'soldierRed'] as const).forEach((k, i) => {
      const a = new Actor(citizen(k));
      a.place(new THREE.Vector3((i - 2) * 1.0, 0, -2.2), 0);
      a.material.vertexColors = true;
      scene.add(a.root);
      actors.push(a);
    });
  }
  const buildMs = performance.now() - t0;
  // poses for review
  const clips = mode === 'walk' ? ['move', 'move', 'move', 'move', 'move', 'move'] : ['idle', 'idle', 'idle', 'idle', 'guard', 'idle'];
  actors.forEach((a, i) => {
    a.play(clips[i] ?? 'idle', 0);
    if (mode === 'walk') a.anim.params.speed = i % 2 ? 6.5 : 1.4;
  });
  if (mode === 'faces') {
    actors[0].express('determined');
    actors[1].express('smile');
    actors[2].express('worried');
    actors[3].express('angry');
    camera.position.set(0, 1.62, 3.2);
    camera.lookAt(0, 1.55, 0);
  } else {
    camera.position.set(0, 1.5, 9.5);
    camera.lookAt(0, 0.95, -0.5);
  }
  let t = Number(new URLSearchParams(location.search).get('t') ?? '0');
  const step = (dt: number) => {
    t += dt;
    for (const a of actors) {
      a.update(dt);
    }
  };
  // pre-roll so springs/blends settle
  for (let i = 0; i < 60; i++) step(1 / 60);
  const w = window as unknown as Record<string, unknown>;
  w.__LAB__ = { buildMs, tris: 0, step, actors, renderer: r, TOON, scene };
  let last = performance.now();
  let frames = 0;
  const loop = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    r.resize(camera);
    step(dt);
    if (frames < 2) console.log('giants: render', frames);
    r.render(t);
    if (frames++ < 2) console.log('giants: rendered', performance.now() - now);
    (w.__LAB__ as Record<string, unknown>).tris = r.renderer.info.render.triangles;
    requestAnimationFrame(loop);
  };
  loop();
}

function runGiants(r: Renderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, ground: THREE.Mesh): void {
  ground.scale.setScalar(200);
  scene.fog = new THREE.Fog('#b9c8da', 600, 3500);
  scene.background = new THREE.Color('#b9c8da');
  camera.far = 6000;
  console.log('giants: build start');
  const P = new Pilgrim();
  const A = new Antlered();
  const C = new Carillon();
  console.log('giants: built');
  P.root.position.set(-260, 0, 0);
  A.root.position.set(20, 0, 40);
  C.root.position.set(260, 0, 0);
  for (const g of [P, A, C]) {
    g.settle();
    g.walk = g.walkTarget = 1;
    g.holdPosition = true;
    scene.add(g.root);
  }
  const q = new URLSearchParams(location.search);
  const view = q.get('view') ?? 'wide';
  if (view === 'wide') {
    camera.position.set(0, 60, 620);
    camera.lookAt(0, 90, 0);
  } else if (view === 'pilgrim') {
    camera.position.set(-180, 40, 200);
    camera.lookAt(-260, 110, 0);
  } else if (view === 'antlered') {
    camera.position.set(140, 50, 190);
    camera.lookAt(20, 70, 40);
  } else {
    camera.position.set(330, 30, 160);
    camera.lookAt(260, 70, 0);
  }
  camera.fov = 40;
  let t = Number(q.get('t') ?? '3');
  const step = (dt: number) => {
    t += dt;
    WORLD_TIME.value = t;
    P.update(dt, t);
    A.update(dt, t);
    C.update(dt, t);
  };
  const pre = Math.round(t * 30);
  t = 0;
  for (let i = 0; i < pre; i++) step(1 / 30);
  const w = window as unknown as Record<string, unknown>;
  w.__LAB__ = { buildMs: 0, tris: 0, step, giants: [P, A, C] };
  let last = performance.now();
  let frames = 0;
  const loop = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    r.resize(camera);
    step(dt);
    if (frames < 2) console.log('giants: render', frames);
    r.render(t);
    if (frames++ < 2) console.log('giants: rendered', performance.now() - now);
    (w.__LAB__ as Record<string, unknown>).tris = r.renderer.info.render.triangles;
    requestAnimationFrame(loop);
  };
  loop();
}

function runMeadow(r: Renderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, ground: THREE.Mesh): void {
  scene.clear();
  void ground;
  const q = new URLSearchParams(location.search);
  const sky = new Sky(scene);
  sky.setPalette(PALETTES[q.get('sky') ?? 'goldenPlains']);
  camera.far = 8000;
  const H = (x: number, z: number) => fbm(x * 0.006, z * 0.006, 4) * 26 + fbm(x * 0.03, z * 0.03, 2) * 2.5;
  const terrain = new Terrain({
    size: 1600,
    seg: 220,
    height: H,
    color: (_x, _z, _h, sl) => new THREE.Color('#9a8a5a').lerp(new THREE.Color('#7a6a58'), Math.min(1, sl * 2)),
    grass: (x, z, _h, sl) => (Math.abs(x + Math.sin(z * 0.05) * 4) < 1.6 ? 0 : Math.min(1, Math.max(0, 1.2 - sl * 0.8) * (0.85 + fbm(x * 0.02, z * 0.02, 2) * 0.5))),
    grassColor: '#2f4a1c',
  });
  scene.add(terrain.mesh);
  const grass = new Grass(terrain, { root: '#2c4a1e', tip: '#9cc25a', patch: '#c8c46a', height: 0.7 });
  scene.add(grass.group);
  const pts: { x: number; y: number; z: number; s: number }[] = [];
  for (let i = 0; i < 70; i++) {
    const x = (Math.sin(i * 12.9) * 0.5 + 0.5) * 300 - 150;
    const z = -((i * 0.618) % 1) * 300 - 10;
    if (Math.abs(x) < 8) continue;
    pts.push({ x, y: H(x, z), z, s: 1 + (i % 3) * 0.25 });
  }
  scene.add(new Trees(pts.slice(0, 40), { leaf: '#6f9a3a', leafDark: '#2f4a2a', trunk: '#5a4030', shape: 'round' }, 1).group);
  scene.add(new Trees(pts.slice(40), { leaf: '#4f7a3a', leafDark: '#1f3a2a', trunk: '#4a3020', shape: 'pine' }, 2).group);
  scene.add(rocks([[6, -14, 1.4], [-9, -22, 2.2], [14, -40, 3], [-5, -6, 0.7]].map(([x, z, s]) => ({ x, y: H(x, z), z, s })), '#8a8478'));
  scene.add(mountains({ radius: 2600, height: 520, colors: ['#5a7a8a', '#7a96b4', '#9ab2cc'], snow: 0.85 }));
  const kael = new Actor('kael');
  const lyra = new Actor('lyra');
  kael.place(new THREE.Vector3(0.6, H(0.6, -4), -4), Math.PI);
  lyra.place(new THREE.Vector3(-0.8, H(-0.8, -5), -5), Math.PI);
  kael.ground = lyra.ground = H;
  scene.add(kael.root, lyra.root);
  kael.play('move', 0);
  lyra.play('move', 0);
  kael.anim.params.speed = 1.4;
  lyra.anim.params.speed = 1.4;
  const P = new Pilgrim();
  P.root.position.set(-400, 0, -900);
  P.heading = 0.8;
  P.settle();
  P.walk = P.walkTarget = 1;
  scene.add(P.root);
  const view = q.get('view') ?? 'low';
  let t = 0;
  const step = (dt: number) => {
    t += dt;
    WORLD_TIME.value = t;
    for (const a of [kael, lyra]) {
      a.root.position.z -= 1.4 * dt;
      a.root.position.y = H(a.root.position.x, a.root.position.z);
      a.update(dt);
    }
    P.update(dt, t);
    const f = kael.root.position;
    setPushers([{ x: f.x, z: f.z, r: 0.6 }, { x: lyra.root.position.x, z: lyra.root.position.z, r: 0.5 }]);
    if (view === 'low') {
      camera.position.set(f.x + 2.4, f.y + 1.0, f.z - 4.2);
      camera.lookAt(f.x, f.y + 1.3, f.z + 2);
    } else {
      camera.position.set(f.x + 6, f.y + 7, f.z + 9);
      camera.lookAt(f.x, f.y + 2, f.z - 14);
    }
    grass.update(f, 999);
    sky.update(dt, t, camera, f);
  };
  camera.fov = 45;
  for (let i = 0; i < 60; i++) step(1 / 30);
  const w = window as unknown as Record<string, unknown>;
  w.__LAB__ = { buildMs: 0, tris: 0, step };
  let last = performance.now();
  const loop = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    r.resize(camera);
    step(dt);
    r.render(t);
    (w.__LAB__ as Record<string, unknown>).tris = r.renderer.info.render.triangles;
    requestAnimationFrame(loop);
  };
  loop();
}

function runSkyGiants(r: Renderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
  scene.clear();
  const sky = new Sky(scene);
  sky.setPalette(PALETTES.goldenPlains);
  camera.far = 14000;
  camera.fov = 50;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), toonMaterial({ color: '#8a9a58' }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  scene.add(mountains({ radius: 2600, height: 420, colors: ['#5a7a8a', '#7a96b4'] }));
  const S = new Seraph();
  S.root.position.set(-120, 0, -500);
  S.heading = 1.2;
  S.walk = S.walkTarget = 1;
  S.holdPosition = true;
  const S2 = new Seraph(true);
  S2.root.position.set(500, 0, -1300);
  S2.altitude = 420;
  S2.heading = -1;
  S2.walk = 1;
  S2.holdPosition = true;
  const L = new Leviathan();
  L.orbit.center.set(0, 0, -1600);
  L.orbit.radius = 900;
  const B = new Behemoth(2600);
  B.root.position.set(1800, 2600, -8200);
  B.root.rotation.y = -0.3;
  B.setHaze(sky.palette.horizon, 0.45);
  for (const g of [S, S2, L, B]) scene.add(g.root);
  let t = 20;
  const step = (dt: number) => {
    t += dt;
    WORLD_TIME.value = t;
    for (const g of [S, S2, L, B]) g.update(dt, t);
    camera.position.set(0, 4, 60);
    camera.lookAt(150, 340, -900);
    sky.update(dt, t, camera, new THREE.Vector3());
  };
  for (let i = 0; i < 10; i++) step(1 / 30);
  const w = window as unknown as Record<string, unknown>;
  w.__LAB__ = { buildMs: 0, tris: 0, step };
  const loop = () => {
    r.resize(camera);
    step(1 / 60);
    r.render(t);
    requestAnimationFrame(loop);
  };
  loop();
}
