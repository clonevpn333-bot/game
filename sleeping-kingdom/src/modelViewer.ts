// Dev tool: inspect hero/enemy models and poses in isolation (model.html?char=knight&pose=guard&yaw=0.6).
import * as THREE from 'three';
import { createPipeline } from './core/Renderer';
import { Animator, locomotion, track, type Pose } from './entities/Rig';
import { buildKnight } from './entities/Knight';
import { ATTACKS, HEAVY, ROLL_POSE, HIT_POSE, FLASK_POSE, RIDE_POSE, DEATH_KEYS, guardPose } from './entities/Player';
import { Cloth } from './entities/Cloth';
import { Knellwarden, Marrowmite, Penitent } from './entities/Enemies';
import { AshDrake, Thornwife, dressAsThrall } from './entities/Enemies2';
import { Folk } from './entities/Npc';
import { Mats } from './world/Materials';

const q = new URLSearchParams(location.search);
const canvas = document.querySelector<HTMLCanvasElement>('#c')!;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#141a2c');
scene.fog = new THREE.FogExp2('#141a2c', 0.03);
const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 200);
const pipe = createPipeline(canvas, scene, camera);
const pmrem = new THREE.PMREMGenerator(pipe.renderer);
const envScene = new THREE.Scene();
const sky = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), new THREE.MeshBasicMaterial({ color: '#4a5a90', side: THREE.BackSide }));
envScene.add(sky);
const warm = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffb070' }));
warm.position.set(6, 1, 4);
envScene.add(warm);
scene.environment = pmrem.fromScene(envScene, 0.02).texture;
scene.environmentIntensity = 0.6;
const moon = new THREE.DirectionalLight('#b4c4ff', 3.4);
moon.position.set(-3, 6, -4);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
scene.add(moon, new THREE.HemisphereLight('#5868a8', '#2a1c12', 1.5));
const fillL = new THREE.DirectionalLight('#c8b0a0', 0.9);
scene.add(fillL);
const torch = new THREE.PointLight('#ff9a48', 18, 10, 1.6);
torch.position.set(2.5, 2.2, 2);
scene.add(torch);
const ground = new THREE.Mesh(new THREE.CircleGeometry(8, 48).rotateX(-Math.PI / 2), Mats().cobble);
ground.receiveShadow = true;
scene.add(ground);

const char = q.get('char') ?? 'knight';
const poseName = q.get('pose') ?? 'guard';
const kParam = q.get('k');
const yaw = Number(q.get('yaw') ?? 0.5);
const dist = Number(q.get('dist') ?? (char === 'boss' ? 11 : char === 'dragon' ? 22 : 4.2));
const height = Number(q.get('h') ?? (char === 'boss' ? 3 : char === 'dragon' ? 4 : 1.15));
const animate = q.has('anim');

let update: (dt: number, t: number) => void = () => undefined;
const label = document.getElementById('label')!;
label.textContent = `${char} · ${poseName}${kParam ? ` · k=${kParam}` : ''}`;

if (char === 'knight') {
  const k = buildKnight();
  scene.add(k.root);
  const anim = new Animator(k);
  const cloak = new Cloth(7, 11, 0.62, 1.42, k.mats.cloak, k.cloakAnchorL, k.cloakAnchorR, 1.55);
  cloak.colliders.push(
    { obj: k.j.chest, offset: new THREE.Vector3(0, 0.16, -0.02), r: 0.27 },
    { obj: k.j.chest, offset: new THREE.Vector3(0, -0.05, -0.02), r: 0.26 },
    { obj: k.j.hips, offset: new THREE.Vector3(0, -0.12, -0.02), r: 0.29 },
    { obj: k.j.hipL, offset: new THREE.Vector3(0, -0.3, 0), r: 0.14 },
    { obj: k.j.hipR, offset: new THREE.Vector3(0, -0.3, 0), r: 0.14 },
  );
  scene.add(cloak.mesh);
  let phase = 0;
  const poseAt = (t: number): { pose: Pose; ik: number; speed: number } => {
    const kk = kParam !== null ? Number(kParam) : (t * 0.8) % 1;
    const atk = poseName.match(/^attack(\d)$/);
    if (atk) return { pose: track(ATTACKS[Number(atk[1])].keys, kk), ik: 1, speed: 0 };
    switch (poseName) {
      case 'heavy': return { pose: track(HEAVY.keys, kk), ik: 1, speed: 0 };
      case 'roll': return { pose: ROLL_POSE, ik: 0, speed: 0 };
      case 'hit': return { pose: HIT_POSE, ik: 0, speed: 0 };
      case 'flask': return { pose: FLASK_POSE, ik: 0, speed: 0 };
      case 'ride': return { pose: RIDE_POSE, ik: 0, speed: 0 };
      case 'death': return { pose: track(DEATH_KEYS, kk), ik: 0, speed: 0 };
      case 'walk':
      case 'run': {
        const sp = poseName === 'run' ? 4.8 : 2.6;
        phase = t * sp * 2.3;
        const g = guardPose(t);
        const l = locomotion(phase, sp / 5, { armSwing: 0.2 });
        return { pose: { ...l, shoulderR: g.shoulderR, elbowR: g.elbowR, handR: g.handR, shoulderL: g.shoulderL, elbowL: g.elbowL }, ik: 1, speed: sp };
      }
      default: return { pose: guardPose(t), ik: 1, speed: 0 };
    }
  };
  const first = poseAt(0);
  anim.snap(first.pose);
  update = (dt, t) => {
    const p = poseAt(t);
    if (animate || kParam === null) anim.apply(p.pose, dt, 20);
    else anim.snap(p.pose);
    k.root.updateMatrixWorld(true);
    k.secondary(dt, p.speed, p.ik);
    scene.updateMatrixWorld();
    cloak.update(dt, t);
  };
} else if (char === 'folk') {
  const m = Mats();
  const styles = [
    { robe: m.robeBrown, skin: '#c99878', mood: 'calm' as const, hair: true },
    { robe: m.robeGreen, skin: '#a87458', mood: 'calm' as const, hood: true },
    { robe: m.robeRed, skin: '#e0b090', mood: 'grim' as const, hair: true, lantern: true },
    { robe: m.robeGrey, skin: '#d0a888', mood: 'old' as const, hair: true },
  ];
  const folks = styles.map((st, i) => {
    const f = new Folk(st, 'idle', 'f', i);
    f.place(new THREE.Vector3((i - 1.5) * 0.9, 0, 0), 0);
    scene.add(f.group);
    return f;
  });
  update = (dt, t) => folks.forEach((f) => f.update(dt, t, { resolve: () => 0 } as never, 0));
} else {
  const e = char === 'boss' ? new Knellwarden() : char === 'penitent' ? new Penitent() : char === 'thrall' ? (() => { const p = new Penitent(); dressAsThrall(p.rig); return p; })() : char === 'witch' ? new Thornwife(scene) : char === 'dragon' ? new AshDrake() : new Marrowmite();
  scene.add(e.group);
  if (e instanceof Knellwarden) {
    e.wake();
    e.stateT = 99;
    scene.add(e.cape.mesh);
  }
  const noop = new THREE.Vector3(0, 0, 50);
  const fakeCtx = {
    player: { pos: noop, state: 'free', takeHit: () => false },
    nav: { resolve: () => 0 },
    bus: { emit: () => undefined },
    vfx: { ring: () => undefined, dust: () => undefined, sparks: () => undefined, impact: () => undefined, ichor: () => undefined },
    shake: () => undefined,
    hitstop: () => undefined,
    rng: () => 0.5,
    spawnMite: () => undefined,
  } as never;
  e.state = e instanceof AshDrake ? 'chase' : 'idle';
  if (e instanceof AshDrake) (fakeCtx as { player: { pos: THREE.Vector3 } }).player.pos.set(0, 0, 8);
  update = (dt, t) => {
    e.update(dt, t, fakeCtx);
    if (e instanceof Knellwarden) {
      scene.updateMatrixWorld();
      e.cape.update(dt, t);
    }
  };
}

let t = 0;
let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  t += dt;
  pipe.resize(camera, 2);
  const a = yaw + (q.has('spin') ? t * 0.4 : 0);
  camera.position.set(Math.sin(a) * dist, height + dist * 0.12, Math.cos(a) * dist);
  camera.lookAt(0, height, 0);
  fillL.position.copy(camera.position).add(new THREE.Vector3(0, 3, 0));
  update(dt, t);
  pipe.render();
  (window as unknown as { __VIEW_FRAMES__: number }).__VIEW_FRAMES__ = ((window as unknown as { __VIEW_FRAMES__: number }).__VIEW_FRAMES__ ?? 0) + 1;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
