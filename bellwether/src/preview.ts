// Cast lineup for look-dev screenshots: /preview.html?set=humans|robots&anim=walk
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Blocky, Gen1Bot, type Look } from './actors/Blocky';
import { CAST } from './actors/Cast';

const q = new URLSearchParams(location.search);
const canvas = document.getElementById('c') as HTMLCanvasElement;
const r = new THREE.WebGLRenderer({ canvas, antialias: true });
r.setPixelRatio(1);
r.setSize(innerWidth, innerHeight, false);
r.toneMapping = THREE.ACESFilmicToneMapping;
r.shadowMap.enabled = true;
r.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1a1e26');
scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.5;
const cam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 100);
const key = new THREE.DirectionalLight('#fff1e0', 2.4);
key.position.set(3, 6, 5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -8; key.shadow.camera.right = 8; key.shadow.camera.top = 4; key.shadow.camera.bottom = -2;
scene.add(key);
const rim = new THREE.DirectionalLight('#7fb4ff', 1.6);
rim.position.set(-4, 3, -5);
scene.add(rim);
scene.add(new THREE.HemisphereLight('#9bb4d8', '#2a2420', 0.6));
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.9 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const set = q.get('set') ?? 'humans';
const looks: Look[] = (CAST as Record<string, Look[]>)[set] ?? CAST.humans;
const chars: (Blocky | Gen1Bot)[] = [];
const spacing = 0.95;
looks.forEach((l, i) => {
  const c = l.gen === ('gen1' as never) ? new Gen1Bot(l) : new Blocky(l);
  c.root.position.x = (i - (looks.length - 1) / 2) * spacing * (l.gen === ('gen1' as never) ? 1.4 : 1);
  scene.add(c.root);
  chars.push(c);
});
const anim = q.get('anim') ?? 'idle';
const zoom = q.get('zoom');
const n = looks.length;
if (zoom === 'face') {
  const fx = Number(q.get('fx') ?? 0); const fy = Number(q.get('fy') ?? 1.62);
  cam.position.set(fx, fy, 1.5); cam.lookAt(fx, fy, 0); cam.fov = 26;
} else {
  const w = n * spacing;
  cam.position.set(0, 1.2, w * 0.95 + 1.0);
  cam.lookAt(0, 0.95, 0);
}
cam.updateProjectionMatrix();
if (q.get('angle')) { cam.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), Number(q.get('angle'))); cam.lookAt(0, zoom === 'face' ? 1.62 : 0.95, 0); }
chars.forEach((c, i) => {
  if (c instanceof Blocky) {
    if (anim === 'walk') c.speed = 1.4;
    if (anim === 'run') c.speed = 4.5;
    if (anim === 'talk') { c.talking = 1; c.gesture('talkhands', 99, true); }
    if (anim === 'gestures') c.gesture((['wave', 'point', 'shrug', 'phone', 'clutch', 'hands_hips', 'lookWatch', 'armsUp', 'reach', 'hug'] as const)[i % 10], 99, true);
    if (anim === 'glitch') c.glow = 1;
    if (anim === 'sit') c.mode = 'sit';
    if (anim === 'reveal') { c.openArm(); c.gesture('clutch', 99, true); }
  }
});
let t = Number(q.get('t') ?? 0);
const clock = new THREE.Clock();
(window as unknown as { __step: (s: number) => void }).__step = (s: number) => { for (let i = 0; i < s * 60; i++) chars.forEach((c) => c.update(1 / 60)); };
function frame(): void {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  t += dt;
  chars.forEach((c) => c.update(dt));
  r.render(scene, cam);
  (window as unknown as { __frames: number }).__frames = ((window as unknown as { __frames: number }).__frames ?? 0) + 1;
}
frame();
