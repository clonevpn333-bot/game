// FLOOR 1 — WELCOME TO THE SHOW
// Holding cell → drop into the Grand Studio → robots → sponsor drops (shotgun, double-jump)
// → SkyCams → THE VOTE (hydraulics / rotating stage) → Bruiser → finale → the studio is
// demolished by giant presses → gauntlet (slam press, slide press, pit) → elevator.
import * as THREE from 'three';
import { Mat, moltenMaterial } from '../engine/materials.js';
import { logoTexture, textTexture } from '../engine/textures.js';
import { Box } from '../engine/physics.js';
import { FXColors } from '../engine/fx.js';
import { setStyle } from '../engine/stylize.js';
import { solid, wall, Press, Hatch, dropDrone, Mover, screen, sign, Spotlight, Crowd, confetti, pyro, marquee, Elevator, stageLights, LedRing, ledBlock } from './kit.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const R = 34; // arena radius

function build(g, { checkpoint }) {
  const F = {
    spawn: { pos: [0, 12.2, -31], yaw: 0 },
    checkpoints: { 1: { pos: [0, 1.2, 0], yaw: Math.PI }, 2: { pos: [0, 1.2, 0], yaw: Math.PI }, 3: { pos: [0, 0.2, 18], yaw: Math.PI }, 4: { pos: [0, 0.2, 26], yaw: 0 } },
    bounds: { minX: -R, maxX: R, minZ: -R, maxZ: R },
    waterBounds: { minX: -R - 1, maxX: R + 1, minZ: -R - 1, maxZ: R + 1 },
    floodDepth: 1.25,
    center: [0, 0, 0],
    groundY: 0, ceilingY: 26, killY: -8,
    nav: { minX: -R, maxX: R, minZ: -R, maxZ: R, cell: 1.5, minY: -0.5, maxY: 1.6, topY: 8 },
    spawnPoints: [[-20, 0, -12], [20, 0, -12], [-20, 0, 12], [20, 0, 12], [0, 0, -22], [0, 0, 22]],
    beastSpawn: [0, 0, -24],
    spouts: [[-R + 1, 7, 0], [R - 1, 7, 0], [0, 7, -R + 1], [-20, 7, -26], [20, 7, -26]],
    votePool: ['barrels', 'lowgrav', 'lightsout', 'doublebots', 'meteors', 'freeze', 'lasers', 'flood', 'gravflip', 'beast', 'hydraulics', 'rotate', 'firestorm'],
    fogDensity: 0.009,
    events: {},
  };
  setStyle({ rim: '#9fd8ff', rimStrength: 0.75, sky: '#6a7cff', ground: '#8a5a70' });
  g.scene.background = new THREE.Color('#07040f');
  g.scene.fog = new THREE.FogExp2('#0b0716', F.fogDensity);
  const host = g.host;
  stageLights(g, { sky: '#7a80c0', ground: '#1a1420', hemi: 0.42, key: '#fff4e6', keyI: 2.2, dir: [0.3, 1, 0.45] });

  // ------------------------------------------------------------ ARENA FLOOR (rows that can collapse)
  const stageMat = Mat.stage(6);
  F.rows = [];
  const rowD = 10;
  for (let i = 0; i < 8; i++) {
    const z = -40 + rowD * (i + 0.5);
    const { mesh, collider } = solid(g, { pos: [0, -0.5, z], size: [2 * R + 6, 1, rowD], mat: stageMat, cast: false });
    // edge highlight between rows
    const seam = new THREE.Mesh(new THREE.BoxGeometry(2 * R + 6, 0.04, 0.12), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff2d6f', emissiveIntensity: 2 }));
    seam.position.set(0, 0.01, -rowD / 2); mesh.add(seam);
    F.rows.push({ mesh, collider, z, alive: true });
  }
  // shredder pit below (seen when the floor collapses)
  const pit = new THREE.Mesh(new THREE.PlaneGeometry(2 * R + 30, 100), moltenMaterial({ hot: '#ffe08a', mid: '#ff3a10', crust: '#200400', scale: 0.25 }));
  pit.rotation.x = -Math.PI / 2; pit.position.set(0, -14, 0); g.scene.add(pit);
  for (let i = 0; i < 9; i++) {
    const gr = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 70, 10), Mat.metal('#3a3a40', 0.5, 0.9));
    gr.rotation.z = Math.PI / 2; gr.position.set(0, -11, -40 + i * 10);
    for (let k = 0; k < 10; k++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.6, 0.4), Mat.metal('#777', 0.4, 1)); t.position.y = -30 + k * 6.5; t.rotation.y = k; gr.add(t); }
    g.scene.add(gr);
    g.addHazard({ update(dt) { gr.rotation.x += dt * (i % 2 ? 2 : -2); } });
  }
  const pitLight = new THREE.PointLight('#ff5020', 0, 60, 1.2); pitLight.position.set(0, -6, 0); g.scene.add(pitLight);
  F.pitLight = pitLight;

  // ------------------------------------------------------------ OUTER WALL + STANDS
  const wallMat = Mat.panel('#232733', 1);
  const N = 28;
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2;
    const x = Math.sin(a) * (R + 0.5), z = Math.cos(a) * (R + 0.5);
    if (Math.abs(a - 0) < 0.13) continue; // south gate gap handled separately
    const w = 2 * Math.PI * (R + 0.5) / N + 0.4;
    solid(g, { pos: [x, 3.5, z], size: [w, 7, 1], rot: [0, a, 0], mat: wallMat, uv: 3 });
    const led = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, 0.1), new THREE.MeshStandardMaterial({ color: '#000', emissive: i % 2 ? '#ff2d6f' : '#25f4ff', emissiveIntensity: 2.5 }));
    led.position.set(x - Math.sin(a) * 0.52, 6.7, z - Math.cos(a) * 0.52); led.rotation.y = a; g.scene.add(led);
    // stands behind
    for (let t = 0; t < 4; t++) {
      const rr = R + 3 + t * 2.4;
      const sx = Math.sin(a) * rr, sz = Math.cos(a) * rr;
      const st = new THREE.Mesh(new THREE.BoxGeometry(2 * Math.PI * rr / N + 0.3, 1, 2.4), Mat.panel('#151820'));
      st.position.set(sx, 7 + t * 1.6, sz); st.rotation.y = a; st.receiveShadow = true; g.scene.add(st);
    }
  }
  // invisible boundary above walls so nobody leaves the arena
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; if (Math.abs(a) < 0.13) continue; wall(g, [Math.sin(a) * (R + 1.2), 16, Math.cos(a) * (R + 1.2)], [2 * Math.PI * R / N + 1, 20, 1], { rot: [0, a, 0], wallrun: false, blocksCamera: false }); }
  // ceiling
  wall(g, [0, 27.5, 0], [120, 1, 140], { ceiling: true });
  new LedRing(g, { r: R + 16, h: 13, y: 21, repeat: 4 });
  // dark dome + rig above
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R + 18, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2.6), new THREE.MeshStandardMaterial({ color: '#120a1c', side: THREE.BackSide, roughness: 0.9, metalness: 0.2 }));
  dome.position.y = 18; g.scene.add(dome);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, R + 12), Mat.metal('#2a2430', 0.5, 0.8)); b.position.set(Math.sin(a) * (R + 12) / 2, 27.5, Math.cos(a) * (R + 12) / 2); b.rotation.y = a; g.scene.add(b); }
  F.crowd = new Crowd(g, { count: 700, cx: 0, cz: 0, r0: R + 3, a0: 0, a1: Math.PI * 2, y0: 7.5, tiers: 4, tierDepth: 2.4, tierHeight: 1.6, color: '#3ae8ff' });
  new Crowd(g, { count: 250, cx: 0, cz: 0, r0: R + 3.6, a0: 0, a1: Math.PI * 2, y0: 7.5, tiers: 4, tierDepth: 2.4, tierHeight: 1.6, color: '#ff4fa0' });

  // ------------------------------------------------------------ SOUTH GATE (opens at the finale)
  F.gate = [];
  for (const s of [-1, 1]) {
    const { mesh, collider } = solid(g, { pos: [s * 3.25, 4, R + 0.6], size: [6.5, 8, 1.2], mat: Mat.hazard(2), dynamic: true });
    F.gate.push({ mesh, collider, s });
  }
  sign(g, 'EXIT', [0, 8.8, R + 0.2], 6, 1.4, Math.PI, { glow: '#3dff9a', color: '#e0ffe8' });

  // ------------------------------------------------------------ CENTER TURNTABLE STAGE
  const tt = F.turntable = new THREE.Group();
  g.scene.add(tt);
  const ttBase = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.8, 1, 48), Mat.metal('#1a1c24', 0.3, 0.9));
  ttBase.position.y = 0.5; ttBase.receiveShadow = true; ttBase.castShadow = true; tt.add(ttBase);
  const logo = new THREE.Mesh(new THREE.CircleGeometry(7.2, 64), new THREE.MeshStandardMaterial({ map: logoTexture(), transparent: true, emissive: '#ffffff', emissiveMap: logoTexture(), emissiveIntensity: 0.35, roughness: 0.3 }));
  logo.rotation.x = -Math.PI / 2; logo.position.y = 1.01; tt.add(logo);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(7.6, 0.08, 6, 64), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffd400', emissiveIntensity: 3 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 1.0; tt.add(ring);
  // octagon collider approximated by rotated boxes
  for (let i = 0; i < 4; i++) {
    const c = new Box({ size: [15, 1, 6.2], tag: 'solid' });
    const holder = new THREE.Object3D(); holder.rotation.y = i * Math.PI / 4; holder.position.y = 0.5; tt.add(holder);
    c.attach(holder, new THREE.Vector3());
    c.wallrun = false;
    g.physics.add(c);
  }
  // ramps on the turntable (4)
  for (let i = 0; i < 4; i++) {
    const holder = new THREE.Object3D(); holder.rotation.y = i * Math.PI / 2 + Math.PI / 4; tt.add(holder);
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 3.4), Mat.grate(1));
    ramp.position.set(0, 0.45, 8.8); ramp.rotation.x = 0.29; holder.add(ramp);
    const c = new Box({ size: [3, 0.3, 3.4] }); c.attach(ramp, new THREE.Vector3()); c.wallrun = false; g.physics.add(c);
  }
  // cover walls on the stage
  for (let i = 0; i < 2; i++) {
    const holder = new THREE.Object3D(); holder.rotation.y = i * Math.PI / 2; tt.add(holder);
    const cov = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 0.6), ledBlock(g, {}));
    cov.position.set(0, 1.7, 3.6); cov.castShadow = true; holder.add(cov);
    const c = new Box({ size: [4, 1.4, 0.6] }); c.attach(cov, new THREE.Vector3()); g.physics.add(c);
    const cov2 = cov.clone(); cov2.position.z = -3.6; holder.add(cov2);
    const c2 = new Box({ size: [4, 1.4, 0.6] }); c2.attach(cov2, new THREE.Vector3()); g.physics.add(c2);
  }
  F.ttSpeed = 0; F.ttTarget = 0.08;
  g.addHazard({ update(dt) { F.ttSpeed += (F.ttTarget - F.ttSpeed) * Math.min(1, dt * 0.8); tt.rotation.y += F.ttSpeed * dt; } });

  // ------------------------------------------------------------ CONTESTANT PODIUMS (cover)
  const podMat = Mat.paint('#bebcc8', 0.4, 0.2);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + Math.PI / 6;
    const x = Math.sin(a) * 17, z = Math.cos(a) * 17;
    const { mesh } = solid(g, { pos: [x, 0.8, z], size: [2.6, 1.6, 1.4], rot: [0, a, 0], mat: podMat, round: 0.2 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.15, 1.6), Mat.paint('#ffd400', 0.3, 0.5)); top.position.y = 0.85; mesh.add(top);
    const buzz = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.2, 16), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff2020', emissiveIntensity: 3 })); buzz.position.set(0, 1.0, 0); mesh.add(buzz);
    const num = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: textTexture(String(93 + i), { w: 256, h: 256, color: '#ff2d6f', size: 160 }), transparent: true }));
    num.position.set(0, 0.05, 0.71); mesh.add(num);
    const num2 = num.clone(); num2.rotation.y = Math.PI; num2.position.z = -0.71; mesh.add(num2);
  }
  // ------------------------------------------------------------ WALL-RUN PANELS
  const wrTex = textTexture(['» WALL RUN »'], { w: 1024, h: 256, color: '#000', bg: '#ffd400', size: 120 });
  wrTex.wrapS = THREE.RepeatWrapping;
  const wrMat = new THREE.MeshStandardMaterial({ map: wrTex, roughness: 0.5, metalness: 0.2 });
  const wrSide = Mat.panel('#2a2e38');
  for (const [x, z, ry] of [[-24, 0, 0], [24, 0, 0], [14, -21, Math.PI / 2 + 0.5], [-12, 22, Math.PI / 2]]) {
    const { mesh } = solid(g, { pos: [x, 2.6, z], size: [0.8, 5.2, 9], rot: [0, ry, 0], mat: [wrMat, wrMat, wrSide, wrSide, wrSide, wrSide] });
    mesh.material = [wrSide, wrSide, wrSide, wrSide, wrSide, wrSide];
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), wrMat);
      p.position.set(s * 0.41, 0.6, 0); p.rotation.y = s * Math.PI / 2; mesh.add(p);
    }
  }
  // ------------------------------------------------------------ CAMERA TOWERS (raised platforms + grapple rings)
  F.towers = [];
  for (const [x, z] of [[-22, -20], [22, -20], [-22, 20], [22, 20]]) {
    solid(g, { pos: [x, 2.5, z], size: [1.2, 5, 1.2], mat: Mat.metal('#3a3f4a', 0.4, 0.9) });
    const { mesh } = solid(g, { pos: [x, 5.25, z], size: [6, 0.5, 6], mat: Mat.grate(2) });
    const rail = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.05, 4, 4), Mat.metal('#ffd400', 0.4, 0.6)); rail.rotation.x = Math.PI / 2; rail.rotation.z = Math.PI / 4; rail.position.y = 1.0; mesh.add(rail);
    const cam = new THREE.Group();
    const cb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 1.4), Mat.paint('#222', 0.5, 0.5)); cam.add(cb);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.5, 12), Mat.metal('#111', 0.2, 1)); lens.rotation.x = Math.PI / 2; lens.position.z = 0.9; cam.add(lens);
    const tally = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.05), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff0000', emissiveIntensity: 4 })); tally.position.set(0, 0.42, 0.5); cam.add(tally);
    cam.position.set(x * 0.92, 6.4, z * 0.92); cam.lookAt(0, 1, 0); g.scene.add(cam);
    g.addGrapplePoint(V(x, 10, z));
    F.towers.push([x, 5.5, z]);
    g.addProp('barrel', [x + 1.8, 6.2, z + 1.8]);
  }
  // ramps to two of the towers
  solid(g, { pos: [-22, 2.6, -13.5], size: [3, 0.4, 8.2], rot: [-0.62, 0, 0], mat: Mat.grate(1) });
  solid(g, { pos: [22, 2.6, 13.5], size: [3, 0.4, 8.2], rot: [0.62, 0, 0], mat: Mat.grate(1) });

  // ------------------------------------------------------------ HOLDING CELL (high above the north side)
  const cellZ = -31, cellY = 12;
  const cellMat = Mat.panel('#2b2f3a', 1);
  solid(g, { pos: [0, cellY + 4.25, cellZ], size: [7, 0.5, 7], mat: cellMat }); // roof
  solid(g, { pos: [-3.25, cellY + 2, cellZ], size: [0.5, 4, 7], mat: cellMat });
  solid(g, { pos: [3.25, cellY + 2, cellZ], size: [0.5, 4, 7], mat: cellMat });
  solid(g, { pos: [0, cellY + 2, cellZ - 3.25], size: [7, 4, 0.5], mat: cellMat });
  const glass = solid(g, { pos: [0, cellY + 2, cellZ + 3.25], size: [6.5, 4, 0.2], mat: Mat.glass('#aee8ff', 0.16), surface: 'glass', cast: false });
  F.cellGlass = glass;
  // trapdoor floor
  F.trap = [];
  for (const s of [-1, 1]) {
    const { mesh, collider } = solid(g, { pos: [s * 1.75, cellY - 0.25, cellZ], size: [3.5, 0.5, 7], mat: Mat.hazard(2), dynamic: true });
    F.trap.push({ mesh, collider, s, x0: s * 1.75 });
  }
  // cell underside + pod shape
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 2.5, 3, 8, 1, true), Mat.panel('#1b1e26'));
  pod.position.set(0, cellY - 1.9, cellZ); g.scene.add(pod);
  const podRing = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.12, 6, 8), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff2d6f', emissiveIntensity: 3 }));
  podRing.rotation.x = Math.PI / 2; podRing.position.set(0, cellY - 0.4, cellZ); g.scene.add(podRing);
  F.cellLight = new THREE.PointLight('#ff4060', 4, 9); F.cellLight.position.set(0, cellY + 3.4, cellZ); g.scene.add(F.cellLight);
  screen(g, host, [0, cellY + 2.2, cellZ - 2.95], 2.4, 0);
  sign(g, ['CONTESTANT', '№ 99'], [-2.95, cellY + 2.2, cellZ], 3, 1.5, Math.PI / 2, { color: '#ffd400', glow: '#ff2d6f' });
  // supports from the wall to the pod
  solid(g, { pos: [0, cellY + 1, cellZ - 4.5], size: [2, 1, 3], mat: Mat.metal('#333844', 0.4, 0.9) });

  // ------------------------------------------------------------ JUMBOTRON + RIG
  const jumbo = new THREE.Group(); jumbo.position.set(0, 19, 0); g.scene.add(jumbo);
  const jbox = new THREE.Mesh(new THREE.BoxGeometry(8.4, 6, 8.4), Mat.panel('#14161c')); jumbo.add(jbox);
  for (let i = 0; i < 4; i++) screen(g, host, [Math.sin(i * Math.PI / 2) * 4.25, 0, Math.cos(i * Math.PI / 2) * 4.25], 6, i * Math.PI / 2, { parent: jumbo, color: i % 2 ? '#25f4ff' : '#ff2d6f' });
  const jring = new THREE.Mesh(new THREE.TorusGeometry(6.5, 0.25, 8, 48), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffd400', emissiveIntensity: 3.5 }));
  jring.rotation.x = Math.PI / 2; jring.position.y = 4; jumbo.add(jring);
  g.addHazard({ update(dt) { jumbo.rotation.y += dt * 0.15; jring.position.y = 4 + Math.sin(g.time * 1.5) * 0.3; } });
  F.jumbo = jumbo;
  for (let i = 0; i < 2; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(14 + i * 12, 0.3, 6, 64), Mat.metal('#2a2e36', 0.5, 0.9)); t.rotation.x = Math.PI / 2; t.position.y = 24; g.scene.add(t); }
  // big wall screens
  screen(g, host, [-16, 14, -R + 2.5], 7, 0.45);
  screen(g, host, [16, 14, -R + 2.5], 7, -0.45);
  marquee(g, [0, 7.4, -R + 0.1], 30, 0, 30);
  sign(g, ['FLOOR 99'], [0, 10.4, -R - 0.4], 16, 4, 0, { glow: '#ff2d6f', size: 200 });
  // spotlights
  F.spots = [
    new Spotlight(g, [-18, 24, -18], '#ff4fa0', { center: [0, 0, 0], radius: 14, speed: 0.35, phase: 0 }),
    new Spotlight(g, [18, 24, -18], '#4fe8ff', { center: [0, 0, 0], radius: 14, speed: 0.3, phase: 2 }),
    new Spotlight(g, [18, 24, 18], '#ffd84f', { center: [0, 0, 0], radius: 16, speed: 0.4, phase: 4 }),
    new Spotlight(g, [-18, 24, 18], '#ffffff', { center: [0, 0, 0], radius: 10, speed: 0.25, phase: 1, intensity: 700, cone: 0.035 }),
  ];

  // ------------------------------------------------------------ HATCHES
  F.hatches = [[-12, 0, -10], [12, 0, -10], [-12, 0, 10], [12, 0, 10], [0, 0, -18], [-18, 0, 0], [18, 0, 0], [0, 0, 16]].map((p) => new Hatch(g, p));
  F.bigHatch = new Hatch(g, [0, 0, -24], { size: 4, color: '#ffd400' });
  // props
  for (const [x, z] of [[-8, -14], [9, -16], [-15, 7], [14, 9], [-4, 20], [6, 22], [-26, -6], [27, 6]]) g.addProp(Math.random() < 0.6 ? 'barrel' : 'crate', [x, 0.6, z]);
  for (const [x, z] of [[-10, 14], [10, -4], [-27, 8], [25, -10]]) g.addProp('crateBig', [x, 0.9, z]);

  // ------------------------------------------------------------ HYDRAULIC PISTONS (event)
  F.pistons = [];
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2;
    const r = i % 2 ? 12.5 : 22;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    const grp = new THREE.Group(); grp.position.set(x, -3.2, z); g.scene.add(grp);
    const col = new THREE.Mesh(new THREE.BoxGeometry(2.6, 6, 2.6), Mat.panel('#3a3f4a'));
    col.castShadow = true; grp.add(col);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.3, 2.7), Mat.hazard(1)); cap.position.y = 3.0; grp.add(cap);
    const c = new Box({ size: [2.6, 6, 2.6] }); c.attach(grp, new THREE.Vector3()); g.physics.add(c);
    c.wallrun = false;
    F.pistons.push({ grp, c, x, z, h: -3.2, target: -3.2, ph: i * 0.6, prevH: -3.2 });
  }
  F.pistonsOn = false;
  g.addHazard({ update(dt) {
    for (const p of F.pistons) {
      if (F.pistonsOn) { p.ph += dt; const s = Math.sin(p.ph * 1.6); p.target = s > 0.2 ? 0.0 : s < -0.6 ? -2.0 : -3.2; } else p.target = -3.2;
      p.prevH = p.h;
      p.h += Math.sign(p.target - p.h) * Math.min(Math.abs(p.target - p.h), dt * 9);
      p.grp.position.y = p.h;
      // launch anything standing on top when it shoots up
      if (p.h > p.prevH + 0.05 && p.h > -0.5) {
        const top = p.h + 3;
        const pl = g.player;
        if (Math.abs(pl.pos.x - p.x) < 1.6 && Math.abs(pl.pos.z - p.z) < 1.6 && Math.abs(pl.pos.y - top) < 0.6 && p.h > -0.1) { pl.vel.y = 15; pl.grounded = false; g.audio.play('doubleJump'); }
        for (const e of g.enemies) if (e.alive && !e.flying && Math.abs(e.pos.x - p.x) < 1.6 && Math.abs(e.pos.z - p.z) < 1.6 && Math.abs(e.pos.y - top) < 0.8) { e.vel.y = 14; e.grounded = false; e.thrown = 1.5; }
      }
    }
  } });
  F.events.hydraulics = {
    label: 'ACTIVATE THE HYDRAULICS', kind: 'disaster', dur: 26, banner: 'HYDRAULICS ACTIVE', icon: '⚙️',
    start(g) { F.pistonsOn = true; g.audio.play('hydraulic', { pos: g.player.pos }); },
    update(g, dt, s) { s.t = (s.t || 0) - dt; if (s.t <= 0) { s.t = 2.2; F.slamRandom(); } },
    end() { F.pistonsOn = false; },
  };
  // random slam presses during hydraulics event (above the ring)
  F.slammers = [];
  for (let i = 0; i < 4; i++) {
    const pr = new Press(g, { pos: [0, 0, 400], size: [5, 2.2, 5], lowY: 0, highY: 22, manual: true, cycle: { warn: 1.1, down: 0.25, hold: 0.5, rise: 1.4 }, rods: [[0, 0]] });
    g.addHazard(pr);
    F.slammers.push(pr);
  }
  F.slamRandom = () => {
    const pr = F.slammers.find((p) => p.state === 'up');
    if (!pr) return;
    // target near the player, but never on the turntable
    let x, z, tries = 0;
    do { x = g.player.pos.x + rand(-7, 7); z = g.player.pos.z + rand(-7, 7); tries++; } while (Math.hypot(x, z) < 9.5 && tries < 10);
    if (Math.hypot(x, z) > R - 4) { const k = (R - 4) / Math.hypot(x, z); x *= k; z *= k; }
    pr.group.position.x = x; pr.group.position.z = z;
    pr.trigger();
    g.audio.play('alert', { pos: pr.group.position });
  };
  // ROTATE THE ARENA event: fast spin + sweeper arms
  F.sweepers = new THREE.Group(); g.scene.add(F.sweepers); F.sweepers.visible = false;
  for (let i = 0; i < 2; i++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, R - 8.5), Mat.hazard(4));
    arm.position.set(0, 0.45, (R - 8.5) / 2 + 8); const h = new THREE.Object3D(); h.rotation.y = i * Math.PI; h.add(arm); F.sweepers.add(h);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, R - 8.5), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff2020', emissiveIntensity: 3 }));
    glow.position.copy(arm.position).setY(0.8); h.add(glow);
  }
  F.events.rotate = {
    label: 'ROTATE THE ARENA', kind: 'disaster', dur: 24, banner: 'ARENA ROTATING — JUMP THE ARMS', icon: '🔄',
    start(g) { F.ttTarget = 1.1; F.sweepers.visible = true; F.sweepAng = 0; g.audio.play('hydraulic', { pos: g.player.pos }); },
    update(g, dt) {
      F.sweepAng += dt * 0.9;
      F.sweepers.rotation.y = F.sweepAng;
      const check = (pos, h, fn) => {
        const r = Math.hypot(pos.x, pos.z);
        if (r < 8 || r > R - 0.5) return;
        const ang = Math.atan2(pos.x, pos.z);
        for (let i = 0; i < 2; i++) {
          let d = ang - (F.sweepAng + i * Math.PI);
          d = Math.atan2(Math.sin(d), Math.cos(d));
          if (Math.abs(d * r) < 0.7 && pos.y < 0.95 && pos.y + h > 0.2) fn(new THREE.Vector3(Math.cos(F.sweepAng + i * Math.PI), 0, -Math.sin(F.sweepAng + i * Math.PI)));
        }
      };
      const pl = g.player;
      check(pl.pos, 1.8, (dir) => { if (pl.iframes <= 0 && !F._swHit) { F._swHit = 0.6; pl.damage(18, { type: 'sweeper', knock: dir.multiplyScalar(-10).setY(7) }); } });
      if (F._swHit > 0) F._swHit -= dt; else F._swHit = 0;
      for (const e of g.enemies) if (e.alive && !e.flying) check(e.pos, e.height, (dir) => { e.takeDamage(40, { type: 'sweeper', env: true, dir: dir.clone().negate(), knock: 14 }); e.thrown = 1; });
      for (const p of g.props) if (p.alive) check(p.body.pos, 0.5, (dir) => { p.body.vel.addScaledVector(dir, -14).y += 6; p.body.sleep = 0; });
    },
    end(g) { F.ttTarget = 0.08; F.sweepers.visible = false; },
  };

  // ------------------------------------------------------------ DEMOLITION PRESSES (8 rows)
  F.demo = F.rows.slice(0, 7).map((row, i) => {
    const pr = new Press(g, { pos: [0, 0, row.z], size: [2 * R + 4, 3, rowD - 0.3], lowY: 0, highY: 40, manual: true, fallThrough: true, cycle: { warn: 1.6, down: 0.5, hold: 0.35 }, rods: [[-20, 0], [0, 0], [20, 0]], rodR: 1.2 });
    pr.rowIdx = i;
    pr.onSlam = () => F.collapseRow(i);
    g.addHazard(pr);
    // slam halfway: when passing floor level the row breaks
    return pr;
  });
  F.collapseRow = (i) => {
    const row = F.rows[i];
    if (!row.alive) return;
    row.alive = false;
    row.collider.enabled = false;
    row.mesh.visible = false;
    for (let k = 0; k < 16; k++) g.fx.spawnDebris(V(rand(-R, R), 0, row.z + rand(-4, 4)), 2, 6, 4);
    g.fx.dust(V(0, 0.2, row.z), 20, 3);
    g.player.shake(0.6);
    g.renderer.kick(0.8);
    g.audio.play('explosion', { pos: V(g.player.pos.x, 0, row.z), big: 1.5 });
    g.audio.play('ooh');
    if (i === 3 || i === 4) { // turntable falls with the center rows
      F.turntable.userData.falling = true;
    }
  };
  g.addHazard({ update(dt) {
    if (F.turntable.userData.falling) { F.turntable.position.y -= dt * 9; F.turntable.rotation.z += dt * 0.3; if (F.turntable.position.y < -30) F.turntable.userData.falling = false; }
    // the demolition presses fall *through* the floor once it is gone
  } });

  // ------------------------------------------------------------ GAUNTLET (south, z 35..82)
  const gz0 = R + 1;
  solid(g, { pos: [0, -0.5, gz0 + 11], size: [13, 1, 22], mat: Mat.grate(4) }); // z 35..57
  solid(g, { pos: [0, -0.5, 77], size: [13, 1, 14], mat: Mat.grate(4) }); // z 70..84
  for (const s of [-1, 1]) {
    solid(g, { pos: [s * 6.9, 5, 58.5], size: [0.8, 10, 51], mat: Mat.panel('#262a34', 1), uv: 4 });
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 51), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff2d6f', emissiveIntensity: 3 }));
    strip.position.set(s * 6.45, 9.6, 58.5); g.scene.add(strip);
  }
  solid(g, { pos: [0, 10.5, 62.5], size: [14.6, 1, 43], mat: Mat.panel('#1a1d24', 1), ceiling: true }); // gauntlet ceiling
  const gl = new THREE.PointLight('#ffb070', 30, 30, 1.2); gl.position.set(0, 9, 46); g.scene.add(gl); g.dim(gl);
  const gl2 = new THREE.PointLight('#70d0ff', 30, 30, 1.2); gl2.position.set(0, 9, 70); g.scene.add(gl2); g.dim(gl2);
  F.pressA = new Press(g, { pos: [0, 0, 44], size: [13, 3, 4], lowY: 0, highY: 6.5, cycle: { up: 1.3, warn: 0.5, down: 0.18, hold: 0.5, rise: 0.8 }, sign: 'TIME IT!', active: false });
  F.pressB = new Press(g, { pos: [0, 0, 52], size: [13, 3, 4], lowY: 1.12, highY: 4.2, cycle: { up: 0.6, warn: 0.4, down: 0.2, hold: 2.2, rise: 0.6 }, sign: 'SLIDE ▼', active: false });
  g.addHazard(F.pressA); g.addHazard(F.pressB);
  sign(g, ['C = SLIDE'], [0, 6.2, 49.8], 5, 1.2, Math.PI, { glow: '#ffd400', color: '#fff' });
  // the pit (57..70) — moving platform + grapple ring
  F.platform = new Mover(g, { points: [[0, -0.25, 58.8], [0, -0.25, 68.2]], size: [4, 0.5, 3], speed: 4, wait: 0.5 });
  g.addGrapplePoint(V(0, 7.8, 70.5));
  const pitGlow = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), moltenMaterial({ scale: 0.4 })); pitGlow.rotation.x = -Math.PI / 2; pitGlow.position.set(0, -9, 63.5); g.scene.add(pitGlow);
  F.elevator = new Elevator(g, { pos: [0, 0, 79], onEnter: () => F.onElevator() });
  solid(g, { pos: [0, 7.6, 84.6], size: [14.6, 6, 1], mat: Mat.panel('#1a1d24', 1) }); // gauntlet end wall above the elevator
  wall(g, [0, 5, 85.2], [14.6, 12, 1]);
  sign(g, ['▲ ELEVATOR ▲'], [0, 7.4, 77.5], 7, 1.6, Math.PI, { glow: '#3dff9a', color: '#e8fff0' });

  // ------------------------------------------------------------ helpers for the script
  F.openGate = () => {
    if (F.gateOpen) return; F.gateOpen = true;
    g.audio.play('hydraulic', { pos: V(0, 4, R) });
    g.audio.play('doors', { pos: V(0, 4, R), slam: false });
    let t = 0;
    g.addHazard({ update(dt) { t += dt; const k = Math.min(1, t / 2.5); for (const gt of F.gate) gt.mesh.position.x = gt.s * (3.25 + k * 6.5); if (k >= 1) this.dead = true; } });
  };
  F.wave = (list) => {
    const es = [];
    list.forEach(([type, where, delay, opts], i) => {
      g.later(delay ?? i * 0.5, () => {
        let e;
        if (type === 'drone') e = dropDrone(g, typeof where === 'number' ? [F.hatches[where].pos.x, 25, F.hatches[where].pos.z] : where);
        else if (typeof where === 'number') e = (where === -1 ? F.bigHatch : F.hatches[where]).spawn(type, opts);
        else e = g.spawnEnemy(type, V(...where), opts);
        es.push(e);
      });
    });
    return es;
  };
  F.update = (dt) => {
    // trapdoors
    if (F.trapOpen) for (const t of F.trap) { t.mesh.position.x += (t.s * 5.3 - t.mesh.position.x) * Math.min(1, dt * 5); }
    // spot follow during big moments
    if (F.spotFollow) for (const s of F.spots) s.follow = g.player.pos;
    else for (const s of F.spots) s.follow = null;
    F.pitLight.intensity += ((F.rows.some((r) => !r.alive) ? 40 : 0) - F.pitLight.intensity) * Math.min(1, dt);
  };
  F.safeOverride = null;
  return F;
}

// ============================================================ SCRIPT
function* script(g, cp) {
  const F = g.floor;
  const say = (who, t, o) => g.say(who, t, o);
  const hint = (h, id, d = 5) => g.hud.hint(h, d, id);
  const K = (k) => `<span class="key">${k}</span>`;
  const allDead = () => g.aliveEnemies() === 0;
  const unlock = (kind, id, label) => {
    const fresh = kind === 'weapon' ? g.save.unlockWeapon(id) : g.save.unlockAbility(id);
    g.hud.toast('UNLOCKED: ' + label, 'unlock');
    g.music.sting('unlock');
    return fresh;
  };

  if (cp === 0) {
    // --------------------------------------------------------- HOLDING CELL
    g.cinematic = true;
    g.renderer.fx.uLetterbox.value = 1;
    F.cellLight.intensity = 0.4;
    g.setCam([2.2, 14.2, -29.2], [0, 13.3, -31], 55, 2);
    g.music.setState('calm');
    yield 1.2;
    g.audio.play('pressSlam', { pos: V(0, 12, -31) });
    F.cellLight.intensity = 30; F.cellLight.color.set('#ffffff');
    g.renderer.flash(0.7, 0xffffff, 3);
    say('halo', 'GOOD EVENING, TOWER! Wakey wakey, Contestant Ninety-Nine!', { mood: 'gleeful' });
    g.audio.play('cheer', { big: 1 });
    yield 2.2;
    g.releaseCam(); g.cinematic = false;
    g.renderer.fx.uLetterbox.value = 0;
    g.setObjective('GET READY', 'The audience is waiting below');
    hint(`${K('W')}${K('A')}${K('S')}${K('D')} MOVE · ${K('MOUSE')} LOOK`, 'move', 6);
    say('halo', 'I am MISTER HALO, and you are LIVE! The rules: reach Floor Ninety-Nine. Stay alive. Look fabulous.');
    yield 4.2;
    say('halo', 'Billions of viewers! One contestant! Three... two...', { mood: 'gleeful' });
    g.audio.play('drumroll', { dur: 2.2 });
    yield 2.6;
    // --------------------------------------------------------- THE DROP
    F.trapOpen = true;
    g.audio.play('hydraulic', { pos: V(0, 12, -31) });
    g.audio.play('doors', { pos: V(0, 12, -31) });
    for (const t of F.trap) t.collider.enabled = false;
    g.setObjective('', '');
    yield () => g.player.grounded && g.player.pos.y < 2;
    g.audio.play('cheer', { big: 2 });
    g.audio.play('airhorn');
    for (const p of [[-R + 3, 7.5, -10], [R - 3, 7.5, -10], [-R + 3, 7.5, 10], [R - 3, 7.5, 10]]) { confetti(g, p, 140, 15); pyro(g, p, 10); }
    g.renderer.flash(0.4, 0xffd0f0, 2);
    g.music.setState('combat');
    g.musicState = 'combat';
    say('halo', 'THE CONTESTANT HAS LANDED! Let us meet your first opponents!', { mood: 'gleeful' });
    F.spotFollow = true;
    yield 1.6;
    // --------------------------------------------------------- WAVE 1
    F.spotFollow = false;
    g.setObjective('SURVIVE THE OPENING ACT', 'Destroy the Clankers');
    F.wave([['clanker', 0], ['clanker', 1], ['clanker', 4]]);
    hint(`${K('LMB')} FIRE · ${K('2-FINGER CLICK')} TOGGLE AIM · ${K('R')} RELOAD`, 'fire', 6);
    yield 5;
    hint(`${K('F')} MELEE — robots drop repair cells when sliced`, 'melee', 5);
    yield () => g.aliveEnemies() <= 1;
    hint(`${K('SHIFT')} SPRINT · then ${K('C')} to SLIDE`, 'slide', 5);
    yield allDead;
    say('halo', 'Not bad! Not bad at all! Our sponsors are impressed! And when sponsors are impressed... they DROP things!');
    // --------------------------------------------------------- SPONSOR DROP: SHOTGUN
    g.setObjective('SPONSOR DROP', 'Grab the gift on the center stage');
    yield 1;
    g.addPickup('gift', V(0, 22, 0), { onPick: () => {
      g.player.arsenal.addWeapon('shotgun');
      unlock('weapon', 'shotgun', "SPONSOR'S CHOICE SHOTGUN");
      say('halo', "The SPONSOR'S CHOICE shotgun! Point the loud end at robots!", { priority: 1 });
      hint(`${K('1')} ${K('2')} ${K('3')} or ${K('WHEEL')} — SWITCH WEAPONS`, 'switch', 5);
    } });
    yield () => g.player.arsenal.slots.some((s) => s.id === 'shotgun');
    yield 1;
    g.setObjective('WAVE TWO', 'Use the barrels. Use everything.');
    F.wave([['clanker', 2], ['clanker', 3], ['clanker', 5, 0.8], ['clanker', 6, 1.6], ['clanker', 7, 2.4]]);
    hint('Shoot the RED BARRELS near robots', 'barrels', 4);
    yield allDead;
    g.checkpoint(1);
  }
  if (cp <= 1) {
    if (cp === 1) { g.music.setState('combat'); g.musicState = 'combat'; }
    // --------------------------------------------------------- DOUBLE JUMP + GRAPPLE
    say('halo', 'A word from our sponsor, HopCorp! Why jump once when you could jump TWICE? Their new boots are waiting on Camera Tower Two!');
    g.setObjective('GRAB THE HOPCORP BOOTS', 'Grapple (E) to the blue ring above the tower');
    const tw = F.towers[1];
    if (!g.player.abilities.doubleJump) {
      g.addPickup('gift', V(tw[0], 20, tw[2]), { onPick: () => {
        g.player.abilities.doubleJump = true;
        unlock('ability', 'doubleJump', 'HOPCORP DOUBLE JUMP');
        hint(`${K('SPACE')} in mid-air — DOUBLE JUMP`, 'dj', 5);
        say('halo', 'Double jump acquired! Gravity is now more of a suggestion!', { priority: 1 });
      } });
      hint(`Aim at the blue ring · ${K('E')} GRAPPLE`, 'grapple', 7);
      yield () => g.player.abilities.doubleJump;
    }
    yield 1.5;
    // --------------------------------------------------------- SKYCAMS
    say('halo', 'Our SkyCams want a closer look! Smile for the cameras! They are armed, by the way.');
    g.setObjective('SHOOT DOWN THE SKYCAMS', 'Drones telegraph before firing — dodge with Q');
    F.wave([['drone', [-12, 25, -6]], ['drone', [12, 25, -6]], ['drone', [0, 25, 12], 1.2]]);
    yield 3;
    hint(`${K('Q')} DODGE — invulnerable while dodging, works in mid-air`, 'dodge', 6);
    yield () => g.aliveEnemies() <= 1;
    F.wave([['clanker', 0], ['clanker', 1], ['drone', [0, 25, -10], 1.5]]);
    hint(`Jump at a ${K('WALL RUN')} panel and hold ${K('W')} to wall-run`, 'wallrun', 6);
    yield allDead;
    g.checkpoint(2);
  }
  if (cp <= 2) {
    if (cp === 2) { g.music.setState('combat'); g.musicState = 'combat'; }
    // --------------------------------------------------------- THE VOTE
    say('halo', 'Ladies and gentlemen... it is time for the moment you have all been waiting for!', { mood: 'gleeful' });
    yield 2.5;
    g.audience.startVote({ title: 'CHOOSE THE NEXT DISASTER!', options: ['hydraulics', 'rotate'] });
    yield () => !g.audience.voting;
    yield 2;
    // --------------------------------------------------------- BRUISER
    g.setObjective('TAKE DOWN THE BRUISER', 'Its armor is up front');
    say('halo', 'And now... the heavyweight! Please welcome... THE BRUISER!', { mood: 'gleeful' });
    g.audio.play('sting', {});
    const br = F.wave([['bruiser', -1, 0.6]]);
    yield 2;
    F.wave([['clanker', 2], ['clanker', 3, 1]]);
    yield 4;
    // first Iris contact — a glitch in the broadcast
    g.renderer.fx.uGlitch.value = 0.6;
    g.host.glitch = 2;
    g.audio.play('static', { dur: 0.6, vol: 0.5 });
    say('iris', '...can you hear me? Don\'t answer. Its armour is all in front. Get behind it — the core on its back.', { priority: 3 });
    yield 4.5;
    g.renderer.fx.uGlitch.value = 0;
    say('halo', 'Did somebody say something? No? Probably the wind. We do not have wind. Moving on!', { mood: 'nervous', priority: 2 });
    g.host.tipsGiven.add('bruiser');
    yield () => !g.enemies.some((e) => e.type === 'bruiser' && e.alive);
    yield allDead;
    g.audience.setAuto(true, 6);
    g.checkpoint(3);
  }
  if (cp <= 3) {
    if (cp === 3) { g.music.setState('combat'); g.musicState = 'combat'; g.audience.setAuto(true, 10); }
    // --------------------------------------------------------- THE FINALE
    say('halo', 'The audience is LOVING this! Let us give them a finale!', { mood: 'gleeful' });
    g.setObjective('THE GRAND FINALE', 'Survive everything');
    g.musicState = 'disaster';
    g.music.setState('disaster');
    F.wave([['clanker', 0], ['clanker', 1], ['shield', 4, 1], ['drone', [0, 25, 0], 1.5], ['clanker', 6, 3], ['clanker', 5, 4], ['drone', [-10, 25, 10], 5]]);
    yield 6;
    g.host.tip('shield');
    const t0 = g.time;
    yield () => allDead() || g.time - t0 > 70;
    g.audience.setAuto(false);
    g.audience.cancel();
    g.checkpoint(4);
  }
  // ----------------------------------------------------------- DEMOLITION / ESCAPE
  g.music.play('boss', 'boss');
  g.musicState = 'boss';
  g.audio.loop('alarm', 0.25);
  F.safeOverride = V(0, 0.5, 40);
  say('halo', 'You have been SO good... that the producers want to RENOVATE! Please exit through the gift shop. Quickly.', { mood: 'gleeful', priority: 3 });
  g.hud.banner('THE STUDIO IS BEING DEMOLISHED', 'disaster', 30);
  g.setObjective('ESCAPE TO THE ELEVATOR', 'Run SOUTH — through the gate');
  F.openGate();
  F.pressA.active = true; F.pressB.active = true;
  F.spotFollow = true;
  // drones chase
  F.wave([['drone', [-8, 25, 10]], ['drone', [8, 25, 14], 2]]);
  const start = cp >= 4 ? 2 : 0;
  for (let i = 0; i < start; i++) F.collapseRow(i);
  // the demolition runs on its own clock — fast contestants don't wait for it
  g.runScript((function* demolition() {
    for (let i = start; i < 7; i++) {
      F.demo[i].trigger();
      g.audio.play('warning');
      yield 4.2;
    }
  })());
  // landing zone near the elevator
  yield () => g.player.pos.z > 66;
  g.audio.loop('alarm', 0);
  F.safeOverride = V(0, 0.5, 72);
  g.setObjective('INTO THE ELEVATOR!', '');
  F.elevator.setOpen(true);
  say('halo', 'There it is! The elevator! Go on, go on — the audience wants to see what is upstairs!', { priority: 2 });
  yield () => F.elevator.entered;
}

export default {
  name: 'WELCOME TO THE SHOW',
  build(g, o) {
    const F = build(g, o);
    F.onElevator = () => {
      const pl = g.player;
      g.cinematic = true;
      pl.vel.set(0, 0, 0);
      g.music.setState('calm', 0.5);
      F.elevator.setOpen(false);
      g.setCam([0, 2.2, 83.2], [0, 1.4, 76], 60, 3);
      g.say('halo', 'FLOOR ONE... COMPLETE! What a debut! Somebody get this contestant an agent!', { mood: 'gleeful', priority: 3 });
      g.later(3.2, () => {
        g.renderer.fx.uGlitch.value = 0.5;
        g.audio.play('static', { dur: 0.6, vol: 0.5 });
        g.say('iris', 'Don\'t react. They\'re watching the feed. My name is Iris. I built half of this tower — and I\'m the reason that elevator still works. Keep climbing.', { priority: 3 });
        g.later(1.2, () => { g.renderer.fx.uGlitch.value = 0; });
      });
      g.later(10.5, () => g.completeFloor());
    };
    return F;
  },
  script,
  scoreTarget: 9000,
  rewards: [{ type: 'weapon', id: 'rifle', label: 'RATINGS RIFLE' }, { type: 'track', id: 'f1' }],
  completeLine: 'The Ratings Rifle is yours! Floor Two awaits — the cleanup crew is expecting you!',
};
