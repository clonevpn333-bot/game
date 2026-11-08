// CHAPTER 2 — BELOW THE STORM. Naval action / vehicle survival.
import * as THREE from 'three';
import { makeOcean, makeRain, waterHeight, OCEAN, waterNormal } from './ocean.js';
import { Tracers, Patrol } from './combat.js';
import { buildInterceptor, buildResearchShip } from '../../vehicles/boats.js';
import { BoatBody } from '../../vehicles/boatPhysics.js';
import { buildCharacter, KAI, SERA } from '../../characters/cast.js';
import { Animator } from '../../characters/anim.js';
import { OnFoot } from '../../game/onfoot.js';
import { makeSky } from '../../engine/sky.js';
import { hdri, preloadSets, model, pbr } from '../../engine/assets.js';
import { Particles } from '../../engine/fx.js';
import { EngineSound, NoiseLoop } from '../../audio/audio.js';
import { facadeMaterial, CITY_TEXTURES, rng } from '../ch1/city.js';
import { wait, el } from '../../engine/ui.js';
import { state, setFlag } from '../../game/state.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const SHIP_START = V3(30, 0, 1180);
const CHECKPOINTS = {
  start: { pos: V3(0, 0, 0), yaw: 0 },
  hunters: { pos: V3(0, 0, 380), yaw: 0 },
  meridian: { pos: V3(-20, 0, 860), yaw: 0.1 },
  boarding: { pos: V3(0, 0, 0), yaw: 0 },
};

export default class Chapter2 {
  constructor(game) { this.game = game; this.usesPointerLock = true; }

  async load(cp) {
    const g = this.game, R = g.renderer;
    await preloadSets(['teak', 'ship_deck', ...CITY_TEXTURES]);
    const scene = this.scene = new THREE.Scene();
    const env = await hdri(R, 'storm');
    scene.environment = env.env; scene.environmentIntensity = 0.32;
    this.sunDir = V3(0.3, 0.35, -0.9).normalize();
    this.sky = makeSky({ sunDir: this.sunDir, top: 0x0a0f16, mid: 0x1c2630, horizon: 0x3a4650, sunColor: 0x6a7a8a, cloud: 0.95, cloudColor: 0x1a2027, storm: 1 });
    scene.add(this.sky);
    scene.fog = new THREE.FogExp2(0x1d262e, 0.0065);
    this.moon = new THREE.DirectionalLight(0x9fb4c8, 0.9); this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(R.quality.shadows, R.quality.shadows);
    const sc = this.moon.shadow.camera; sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.far = 300; this.moon.shadow.bias = -0.0005; this.moon.shadow.normalBias = 0.05;
    scene.add(this.moon, this.moon.target);
    this.hemi = new THREE.HemisphereLight(0x405060, 0x05080a, 0.5); scene.add(this.hemi);
    this.ocean = makeOcean(scene, { size: 1100, seg: R.quality.drawScale < 0.8 ? 160 : 240, color: 0x123a46, deep: 0x05161d });
    this.ocean.mesh.material.envMap = env.env; this.ocean.mesh.material.envMapIntensity = 0.22;
    this.rain = makeRain(scene, { count: R.quality.drawScale < 0.8 ? 4000 : 9000 });
    this.buildDrownedCity();

    // the interceptor
    this.boatMesh = buildInterceptor(); scene.add(this.boatMesh);
    this.boat = new BoatBody(this.boatMesh, { mass: 2600, thrust: 30000, boost: 18000 });
    const flood = new THREE.SpotLight(0xfff0d8, 80, 120, 0.35, 0.6, 1.5); flood.position.set(0, 3.0, 1.1); flood.target.position.set(0, 0, 30);
    this.boatMesh.add(flood, flood.target); this.floodLight = flood;
    this.muzzleLight = new THREE.PointLight(0xffc070, 0, 14, 2); this.boatMesh.userData.gun.pitch.add(this.muzzleLight); this.muzzleLight.position.set(0, 0, 1.6);

    // the cast
    this.kai = await buildCharacter(KAI); this.kaiAnim = new Animator(this.kai);
    this.sera = await buildCharacter(SERA); this.seraAnim = new Animator(this.sera);
    this.sera.visible = false;
    this.placeKaiAtHelm();

    // the Meridian
    this.ship = buildResearchShip(); scene.add(this.ship);
    this.ship.visible = false;
    this.buildLab();
    this.dressDeck();
    this.crowbar = await model('crowbar_01');
    this.crowbarObj = this.crowbar.clone(); this.crowbarObj.scale.setScalar(1.4); this.ship.add(this.crowbarObj);
    this.crowbarObj.position.set(8.2, 12.2, -38); this.crowbarObj.rotation.set(0, 0.4, Math.PI / 2);
    this.crowbarGlow = new THREE.PointLight(0xffc860, 3, 4, 2); this.crowbarGlow.position.copy(this.crowbarObj.position).add(V3(0, 0.5, 0)); this.ship.add(this.crowbarGlow);

    // combat
    this.tracers = new Tracers(scene);
    this.patrols = Array.from({ length: 5 }, () => new Patrol(scene, g.audio, this.fxApi()));
    this.smoke = new Particles(scene, { max: 700 });
    this.spray = new Particles(scene, { max: 900 });
    this.fire = new Particles(scene, { max: 300, additive: true, texture: 'dot' });
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 3000);
    R.set(scene, this.camera);
    R.setGrade({ exposure: 1.15, bloom: [0.55, 0.5, 0.8], saturation: 0.88, contrast: 1.12, vignette: 0.5, lift: [0.0, 0.02, 0.035], gain: [0.95, 1.0, 1.05] });
    this.buildHud();
    this.reset(cp);
  }

  // ------------------------------------------------------------------ world
  buildDrownedCity() {
    const scene = this.scene, R = rng(77);
    const mats = [facadeMaterial('brick_dark', { size: 2.5, lit: 0.04 }), facadeMaterial('concrete_facade', { size: 3, style: 1, winW: 0.84, winH: 0.46, lit: 0.05 }), facadeMaterial('concrete_wall', { size: 4, style: 2, lit: 0.03, glass: 0x18242c })];
    for (const m of mats) m.userData.facade.uNight.value = 1;
    this.towers = [];
    const box = (w, h, d, mat, fp) => {
      const g = new THREE.BoxGeometry(w, h, d);
      // metre UVs per face; facade params per vertex
      const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
      const fpA = new Float32Array(p.count * 4), ftA = new Float32Array(p.count * 3).fill(1);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i) + h / 2 - 40, z = p.getZ(i), nx = n.getX(i), nz = n.getZ(i);
        const u = Math.abs(nx) > 0.5 ? -z * Math.sign(nx) : Math.abs(nz) > 0.5 ? x * Math.sign(nz) : x;
        uv.setXY(i, u, y);
        fpA.set(fp, i * 4);
      }
      g.setAttribute('fparams', new THREE.BufferAttribute(fpA, 4)); g.setAttribute('ftint', new THREE.BufferAttribute(ftA, 3));
      return new THREE.Mesh(g, mat);
    };
    for (let i = 0; i < 44; i++) {
      const side = i % 2 ? 1 : -1;
      const z = -60 + Math.floor(i / 2) * 58 + R() * 30;
      const x = side * (70 + R() * 160);
      const w = 18 + R() * 16, d = 18 + R() * 16, h = 50 + R() * 110;
      const mi = Math.floor(R() * 3);
      const m = box(w, h, d, mats[mi], [mi === 2 ? 3 : 3.2, 3.5, 0, R() * 100]);
      const tilt = R() < 0.3 ? (R() - 0.5) * 0.2 : 0;
      m.position.set(x, h / 2 - 40, z); m.rotation.set(tilt, R() * 0.3, tilt * 0.6);
      m.castShadow = m.receiveShadow = true;
      scene.add(m);
      this.towers.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, mesh: m });
      // a broken crown on some towers
      if (R() < 0.4) { const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 4, d * 0.4), new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9 })); crown.position.set(x + (R() - 0.5) * 4, h - 40 + 1, z); crown.rotation.z = (R() - 0.5) * 0.6; scene.add(crown); }
    }
    // a few beacons on the towers (warning lights still blinking)
    this.beacons = [];
    for (const t of this.towers.filter((_, i) => i % 5 === 0)) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), new THREE.MeshStandardMaterial({ color: 0x300000, emissive: 0xff2020, emissiveIntensity: 4 })); b.position.set((t.minX + t.maxX) / 2, t.mesh.position.y + t.mesh.geometry.parameters.height / 2 + 1, (t.minZ + t.maxZ) / 2); this.scene.add(b); this.beacons.push(b); }
    // the collapsing tower (scripted event in the storm phase)
    const ct = box(26, 140, 26, mats[1], [3.4, 3.7, 0, 42]);
    ct.geometry.translate(0, 70, 0);
    ct.position.set(40, -40, 260); ct.castShadow = true; scene.add(ct);
    this.collapseTower = { mesh: ct, t: 0, falling: false, box: { minX: 27, maxX: 53, minZ: 247, maxZ: 273 } };
    this.towers.push({ ...this.collapseTower.box, mesh: ct });
  }

  /** Dress the aft working deck (ship space): containers, cargo, rope, bollards, floodlights, the lifeboat locker. */
  dressDeck() {
    const ship = this.ship, props = this.deckProps = [];
    const add = (geo, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; ship.add(m); return m; };
    const collide = (x, z, w, d) => props.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    const wood = pbr('teak', { size: 1, color: 0x9a7a58 }), corr = (c) => pbr('corrugated', { size: 1.4, color: c, metal: true, roughness: 0.6 });
    const yellow = new THREE.MeshStandardMaterial({ color: 0xe8b020, roughness: 0.55, metalness: 0.3 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x5a6266, metalness: 0.8, roughness: 0.4 });
    // re-skin the deck containers in corrugated steel with doors and lock bars
    const cols = [0x9a4a32, 0x3a6a8a, 0x7a8a42, 0xb8b8b4];
    ship.children.filter((o) => o.isMesh && o.geometry?.parameters?.depth === 6.1).forEach((c, i) => {
      c.material = corr(cols[i % 4]);
      for (const k of [-0.3, 0.3]) add(new THREE.BoxGeometry(0.05, 2.3, 0.05), steel, c.position.x + k, c.position.y, c.position.z - 3.08);
    });
    // cargo: crates, barrels, rope coils, bollards, a cable spool
    for (const [x, z, s] of [[-9, -45, 1.3], [-9.2, -43.4, 1.0], [-8.6, -44.2, 0.8]]) { add(new THREE.BoxGeometry(s, s, s), wood, x, 11.6 + s / 2, z, 0.3); collide(x, z, 1.5, 1.5); }
    add(new THREE.BoxGeometry(1.0, 1.0, 1.0), wood, -9, 11.6 + 1.3 + 0.5, -45, 0.8);
    for (const [x, z, col] of [[-7.2, -66, 0x9a2a1a], [-6.2, -67, 0x2a4a8a], [-7.6, -67.8, 0x9a2a1a], [-8.8, -64.8, 0x2a4a8a]]) { add(new THREE.CylinderGeometry(0.42, 0.42, 1.2, 14), new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, metalness: 0.4 }), x, 12.2, z); collide(x, z, 0.9, 0.9); }
    for (const [x, z] of [[8.4, -70], [-8, -30], [8.5, -8]]) { const r = add(new THREE.TorusGeometry(0.55, 0.16, 8, 20), new THREE.MeshStandardMaterial({ color: 0xb89a6a, roughness: 0.95 }), x, 11.75, z); r.rotation.x = Math.PI / 2; const r2 = add(new THREE.TorusGeometry(0.4, 0.15, 8, 18), r.material, x, 11.95, z); r2.rotation.x = Math.PI / 2; }
    for (const sx of [-1, 1]) for (const z of [-72, -30, 0]) { add(new THREE.CylinderGeometry(0.3, 0.36, 0.7, 12), steel, sx * 9.3, 11.95, z); collide(sx * 9.3, z, 0.7, 0.7); }
    { const sp = add(new THREE.CylinderGeometry(0.9, 0.9, 1.3, 16), wood, -8.4, 12.5, -12); sp.rotation.z = Math.PI / 2; collide(-8.4, -12, 1.4, 1.9); }
    // painted walkway lines and hazard stripes
    for (const x of [-2.6, 2.6]) { const l = add(new THREE.PlaneGeometry(0.14, 70), yellow, x, 11.63, -36); l.rotation.x = -Math.PI / 2; l.castShadow = false; }
    // floodlight masts: pools of light on the wet deck
    for (const [x, z, tx, tz] of [[9.4, -50, 2, -46], [-9.4, -26, -1, -32], [9.4, -12, 2, -6]]) {
      add(new THREE.CylinderGeometry(0.12, 0.14, 6, 8), steel, x, 14.6, z); add(new THREE.BoxGeometry(0.7, 0.4, 0.5), steel, x, 17.6, z);
      const spot = new THREE.SpotLight(0xfff0d0, 120, 26, 0.75, 0.5, 1.4); spot.position.set(x, 17.4, z); spot.target.position.set(tx, 11.6, tz); ship.add(spot, spot.target);
      collide(x, z, 0.5, 0.5);
    }
    // the lifeboat locker on the starboard rail, where the pry bar is: yellow, door open, lit inside
    { const L = new THREE.Group(); L.position.set(9.4, 11.6, -38); ship.add(L);
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.9, 1.8), yellow); body.position.set(0, 0.95, 0); body.castShadow = body.receiveShadow = true; L.add(body);
      const inner = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.6, 1.5), new THREE.MeshStandardMaterial({ color: 0x1a1a1a })); inner.position.set(-0.5, 0.95, 0); L.add(inner);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.7, 1.6), yellow); door.position.set(-0.75, 0.95, 0.75); door.rotation.y = -1.1; L.add(door);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x30ff90, emissiveIntensity: 0.6 })); sign.position.set(-0.51, 2.05, 0); sign.rotation.y = -Math.PI / 2; L.add(sign);
      const glow = new THREE.PointLight(0xffd890, 4, 4, 2); glow.position.set(-0.8, 1.2, 0); L.add(glow);
      collide(9.4, -38, 1.0, 1.8);
    }
    // the objective beacon: a soft pillar of light and a bobbing chevron over whatever you need next
    const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.75, 0.3).multiplyScalar(2), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.beacon = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 9, 16, 1, true), beamMat); beam.position.y = 4.5; this.beacon.add(beam);
    const chev = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.75, 0.3).multiplyScalar(3) })); chev.rotation.x = Math.PI; chev.position.y = 2.6; this.beacon.add(chev); this.beaconChev = chev;
    this.beacon.visible = false; ship.add(this.beacon);
  }

  /** Where Kai should go next on the ship (ship space), for the beacon and the HUD marker. */
  objectivePoint() {
    if (this.phase === 'escape') return V3(0, 11.6, -1.4);
    if (!this.hasCrowbar) return V3(8.4, 11.6, -38);
    return V3(2.6, 11.6, -55.9);
  }
  updateGuidance(t) {
    const show = !!this.onFoot && !this.rescueCine && !this.leaving;
    this.beacon.visible = show;
    const el2 = this.H.foot || (this.H.foot = el('div', 'foot-marker', this.game.ui.hudRoot, '<div class="d">◆</div><div class="m"></div>'));
    el2.style.display = show ? 'block' : 'none';
    if (!show) return;
    const p = this.objectivePoint();
    this.beacon.position.copy(p); this.beaconChev.position.y = 2.6 + Math.sin(t * 3) * 0.2; this.beaconChev.rotation.y = t * 2;
    const w = this.ship.localToWorld(p.clone().add(V3(0, 2.2, 0))), q = w.clone().project(this.camera);
    const dist = this.onFoot.pos.distanceTo(p);
    let x = (q.x * 0.5 + 0.5) * innerWidth, y = (-q.y * 0.5 + 0.5) * innerHeight;
    if (q.z > 1) { x = innerWidth - x; y = innerHeight - 40; }
    x = clamp(x, 40, innerWidth - 40); y = clamp(y, 60, innerHeight - 60);
    el2.style.transform = `translate(${x}px, ${y}px)`;
    el2.querySelector('.m').textContent = `${Math.round(dist)} m`;
  }

  buildLab() {
    // modular ATLAS lab on the aft deck where Sera is trapped
    const lab = new THREE.Group(); this.ship.add(lab);
    const labTex = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g2 = c.getContext('2d'); g2.fillStyle = '#d6dad6'; g2.fillRect(0, 0, 1024, 512);
      g2.strokeStyle = 'rgba(40,50,50,0.5)'; g2.lineWidth = 3; for (let x = 0; x < 1024; x += 128) { g2.beginPath(); g2.moveTo(x, 0); g2.lineTo(x, 512); g2.stroke(); } g2.beginPath(); g2.moveTo(0, 256); g2.lineTo(1024, 256); g2.stroke();
      for (let i = 0; i < 400; i++) { g2.fillStyle = `rgba(90,70,50,${Math.random() * 0.12})`; g2.fillRect(Math.random() * 1024, Math.random() * 512, 2, 8 + Math.random() * 40); }
      g2.fillStyle = '#1b2b3d'; g2.font = 'bold 72px Rajdhani, sans-serif'; g2.fillText('ATLAS · FIELD LAB 2', 40, 120); g2.fillStyle = '#c9a43a'; g2.fillRect(40, 140, 520, 10);
      g2.fillStyle = '#b02a1a'; g2.font = 'bold 34px Rajdhani, sans-serif'; g2.fillText('VERSION-SENSITIVE EQUIPMENT · AUTHORISED PERSONNEL', 40, 210);
      for (let x = 40; x < 1000; x += 200) { g2.fillStyle = '#0b1418'; g2.fillRect(x, 300, 140, 70); g2.strokeStyle = '#555'; g2.strokeRect(x, 300, 140, 70); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const white = new THREE.MeshStandardMaterial({ map: labTex, roughness: 0.55, metalness: 0.2 });
    // shell built from wall panels so the hatch is a real opening
    const shell = new THREE.Group(); lab.add(shell);
    const panel = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), white); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; shell.add(m); return m; };
    panel(10, 4, 0.15, -3, 13.6, -59); panel(10, 4, 0.15, -3, 13.6, -51);
    panel(0.15, 4, 8, -8, 13.6, -55);
    panel(0.15, 4, 2.55, 2, 13.6, -57.78); panel(0.15, 4, 4.3, 2, 13.6, -53.15); panel(0.15, 1.7, 1.2, 2, 14.75, -55.9);
    panel(10.2, 0.2, 8.2, -3, 15.7, -55);
    // interior room (visible when the hatch opens)
    const room = new THREE.Mesh(new THREE.BoxGeometry(9.4, 3.6, 7.4), new THREE.MeshStandardMaterial({ color: 0x8a9496, roughness: 0.8, side: THREE.BackSide })); room.position.set(-3, 13.6, -55); lab.add(room);
    // hatch on the starboard (+x) face
    const hatch = new THREE.Group(); hatch.position.set(2.02, 12.0, -55.9); lab.add(hatch);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.3, 1.2), new THREE.MeshStandardMaterial({ color: 0x5a6a6c, metalness: 0.7, roughness: 0.4 })); door.position.set(0, 1.15, 0.6); hatch.add(door);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 18), new THREE.MeshStandardMaterial({ color: 0xb84a2a, metalness: 0.5 })); wheel.rotation.y = Math.PI / 2; wheel.position.set(0.1, 1.2, 0.6); hatch.add(wheel);
    const warn = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.3), new THREE.MeshStandardMaterial({ color: 0xe8c63a, emissive: 0x403000 })); warn.position.set(0.07, 2.6, 0.6); warn.rotation.y = Math.PI / 2; hatch.add(warn);
    const emergency = new THREE.PointLight(0xff3020, 0, 12, 2); emergency.position.set(-3, 14.5, -55); lab.add(emergency);
    // lab benches + screen inside
    const bench = new THREE.Mesh(new THREE.BoxGeometry(5, 0.9, 1), white); bench.position.set(-3, 12.05, -57.6); lab.add(bench);
    const screenTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g2 = c.getContext('2d'); g2.fillStyle = '#041014'; g2.fillRect(0, 0, 512, 256); g2.fillStyle = '#4fe3ff'; g2.font = '22px monospace'; ['ATLAS // VERSION MONITOR', 'STABLE VERSIONS: 3,917 → 2,204', 'MERGE EVENTS (24H): 41', 'ANCHOR UNITS ONLINE: 2', 'DIRECTIVE V-9: SELECT ONE.'].forEach((l, i) => g2.fillText(l, 20, 40 + i * 42)); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshStandardMaterial({ map: screenTex, emissiveMap: screenTex, emissive: 0xffffff, emissiveIntensity: 1.2 })); screen.position.set(-3, 13.7, -58.9); lab.add(screen);
    // ---- the lab inside: racks, desks of ATLAS readouts, the Anchor cradle Sera was strapped to
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a3034, metalness: 0.6, roughness: 0.45 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x8a9296, metalness: 0.8, roughness: 0.3 });
    const add = (geo, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; lab.add(m); return m; };
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(9.4, 7.4), pbr('metal_plate', { size: 1.2, color: 0x6a7276, metal: true, roughness: 0.5 })); floor.rotation.x = -Math.PI / 2; floor.position.set(-3, 11.82, -55); floor.receiveShadow = true; lab.add(floor);
    const glowTex = (lines, col) => { const c = document.createElement('canvas'); c.width = 256; c.height = 160; const g2 = c.getContext('2d'); g2.fillStyle = '#031014'; g2.fillRect(0, 0, 256, 160); g2.fillStyle = col; g2.font = '15px monospace'; lines.forEach((l, i) => g2.fillText(l, 10, 24 + i * 22)); g2.strokeStyle = col; g2.globalAlpha = 0.5; g2.beginPath(); for (let x = 0; x < 256; x += 4) g2.lineTo(x, 140 - Math.abs(Math.sin(x * 0.07)) * 30 * Math.random()); g2.stroke(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
    const screens = [[['SUBJECT: S. LIND', 'ANCHOR SYNC 12%', 'MEMORY DRIFT: HIGH'], '#ffb347'], [['HALDEN: MERGING', 'LINDMERE: KEPT', 'ROOM REQUIRED'], '#4fe3ff'], [['VERSIONS 4,812', 'CAPACITY 100%', 'SELECT ONE'], '#ff6a5a']];
    screens.forEach(([lines, col], i) => {
      const x = -6.6 + i * 2.2;
      add(new THREE.BoxGeometry(1.9, 0.08, 0.9), steel, x, 12.75, -58.1); add(new THREE.BoxGeometry(0.08, 0.9, 0.8), dark, x - 0.9, 12.3, -58.1); add(new THREE.BoxGeometry(0.08, 0.9, 0.8), dark, x + 0.9, 12.3, -58.1);
      const tex = glowTex(lines, col); const sc = add(new THREE.PlaneGeometry(1.2, 0.75), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.6 }), x, 13.3, -58.4); sc.castShadow = false;
      add(new THREE.BoxGeometry(1.25, 0.8, 0.06), dark, x, 13.3, -58.47);
    });
    for (const z of [-52.2, -53.4]) { const rack = add(new THREE.BoxGeometry(0.9, 2.6, 1.0), dark, -7.3, 13.1, z); for (let k = 0; k < 8; k++) { const led = add(new THREE.BoxGeometry(0.02, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: k % 3 ? 0x30ff90 : 0xff5a3a }), -6.83, 12.3 + k * 0.22, z - 0.3 + (k % 2) * 0.2); led.castShadow = false; } }
    // the Anchor cradle: a ring over a reclined chair, still humming
    const ring = add(new THREE.TorusGeometry(1.0, 0.09, 8, 32), new THREE.MeshStandardMaterial({ color: 0x1a2a2e, emissive: 0x4fe3ff, emissiveIntensity: 1.4, metalness: 0.6 }), -3.6, 13.4, -54.6); ring.rotation.x = Math.PI / 2;
    add(new THREE.BoxGeometry(0.7, 0.35, 1.8), dark, -3.6, 12.2, -54.6); add(new THREE.BoxGeometry(0.7, 0.9, 0.25), dark, -3.6, 12.6, -55.45);
    for (let k = 0; k < 3; k++) { const cbl = add(new THREE.CylinderGeometry(0.04, 0.04, 3.2, 6), dark, -3.6 + (k - 1) * 0.4, 14.9, -54.6); cbl.rotation.z = Math.PI / 2 * 0.15 * (k - 1); }
    add(new THREE.BoxGeometry(9.2, 0.06, 0.25), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xd8f0ff, emissiveIntensity: 2 }), -3, 15.55, -55);
    const labLight = new THREE.PointLight(0xbfe6ff, 10, 10, 1.6); labLight.position.set(-3, 15.2, -55); lab.add(labLight);
    this.labRing = ring;
    this.lab = { hatch, door, emergency, shell };
  }

  fxApi() {
    return {
      spark: (p) => { for (let i = 0; i < 8; i++) this.fire.emit(p, V3((Math.random() - 0.5) * 8, Math.random() * 5, (Math.random() - 0.5) * 8), { life: 0.3, size: 0.12, grow: 0, color: [1, 0.75, 0.35], alpha: 1, gravity: 9 }); },
      smoke: (p, dark) => this.smoke.emit(p, V3((Math.random() - 0.5) * 2, 2 + Math.random() * 2, (Math.random() - 0.5) * 2), { life: 4, size: 2, grow: 4, color: dark ? [0.08, 0.08, 0.08] : [0.4, 0.42, 0.44], alpha: 0.6 }),
      explode: (p) => {
        for (let i = 0; i < 40; i++) this.fire.emit(p, V3((Math.random() - 0.5) * 14, Math.random() * 12, (Math.random() - 0.5) * 14), { life: 0.8 + Math.random() * 0.6, size: 1.2, grow: 1.5, color: [1, 0.55, 0.2], alpha: 1, gravity: 2, drag: 2 });
        for (let i = 0; i < 25; i++) this.smoke.emit(p, V3((Math.random() - 0.5) * 6, 3 + Math.random() * 5, (Math.random() - 0.5) * 6), { life: 5, size: 3, grow: 4, color: [0.07, 0.07, 0.07], alpha: 0.7 });
        for (let i = 0; i < 30; i++) this.spray.emit(p, V3((Math.random() - 0.5) * 10, 8 + Math.random() * 8, (Math.random() - 0.5) * 10), { life: 1.6, size: 0.6, grow: 2, color: [0.8, 0.85, 0.88], alpha: 0.6, gravity: 12 });
        this.flash(0.35);
      },
      muzzle: (p, dir) => { this.fire.emit(p, dir.clone().multiplyScalar(8), { life: 0.06, size: 0.9, grow: -0.5, color: [1, 0.6, 0.3], alpha: 1, drag: 0 }); },
    };
  }

  // ------------------------------------------------------------------ HUD
  buildHud() {
    this.hud = this.game.ui.hud(`
      <div class="compass"><div class="strip"></div><div class="mark"></div></div>
      <div class="crosshair"></div>
      <div class="hitdir"></div>
      <div class="health"><div class="label">HULL</div><div class="track"><i></i></div><div class="label" style="margin-top:10px">BOOST</div><div class="track"><i class="boost" style="background:var(--cyan)"></i></div></div>
      <div class="ammo"><div class="v">——</div><div class="u">BOW GUN · HEAT</div><div class="heatbar"><i></i></div></div>
      <div class="speedo" style="bottom:auto;top:4.5vh;right:3.5vw"><div class="v" style="font-size:40px">0</div><div class="u">KNOTS</div></div>
      <div class="targets"></div>
      <div class="waypoint"><div class="m"></div><div class="d"></div></div>
      <div class="pause-hint">ESC · PAUSE</div>`);
    const q = (s) => this.hud.querySelector(s);
    this.H = { strip: q('.compass .strip'), cross: q('.crosshair'), hull: q('.health .track i'), hullBox: q('.health'), boost: q('.boost'), heat: q('.heatbar i'), ammo: q('.ammo .v'), spd: q('.speedo .v'), targets: q('.targets'), wp: q('.waypoint'), wpd: q('.waypoint .d'), ammoBox: q('.ammo'), speedBox: q('.speedo'), hitdir: q('.hitdir') };
    const strip = []; for (let a = -360; a <= 720; a += 15) strip.push(`<span style="position:absolute;left:${(a + 360) * 4}px;transform:translateX(-50%)">${a % 90 === 0 ? ['N', 'E', 'S', 'W'][((a / 90) % 4 + 4) % 4] : a % 45 === 0 ? '·' : '|'}</span>`);
    this.H.strip.innerHTML = strip.join('');
    this.targetEls = this.patrols.map(() => { const d = el('div', 'target-box', this.H.targets, '<div class="hp"><i></i></div>'); d.style.display = 'none'; return d; });
  }

  // ------------------------------------------------------------------ flow
  placeKaiAtHelm() {
    this.boatMesh.add(this.kai);
    this.kai.position.copy(this.boatMesh.userData.helm); this.kai.rotation.set(0, 0, 0);
    this.kai.scale.setScalar(1);
    this.kaiAnim.mode = 'idle'; this.kaiAnim.speed = 0;
  }

  reset(cp) {
    this.cp = cp;
    const c = CHECKPOINTS[cp] || CHECKPOINTS.start;
    this.boat.place(c.pos.x, c.pos.z, c.yaw); this.ocean.clearWake(); this.boat.health = 1; this.boat.boostFuel = 1;
    this.camYaw = c.yaw; this.camPitch = 0.0; this.heat = 0; this.overheat = 0; this.fireCd = 0; this.hurtT = 9;
    for (const p of this.patrols) { p.alive = false; p.mesh.visible = false; p.engine?.stop(); p.engine = null; }
    this.tracers.clear();
    this.kills = 0; this.wave = 0;
    this.phase = { start: 'storm', hunters: 'hunters', meridian: 'meridian', boarding: 'boarding' }[cp] || 'storm';
    this.phaseT = 0; this.said = new Set();
    this.shipPos = SHIP_START.clone(); this.shipList = 0.12; this.ship.visible = cp !== 'start';
    this.collapseTower.t = 0; this.collapseTower.falling = false; this.collapseTower.mesh.rotation.set(0, 0, 0);
    for (const t of this.ship.userData.turrets) { t.alive = true; t.hp = 1; t.tank.visible = true; t.fireT = 2; }
    this.onFoot = null; this.sera.visible = false; if (this.beacon) this.beacon.visible = false; if (this.H?.foot) this.H.foot.style.display = 'none';
    if (this.boatMesh.parent !== this.scene) this.scene.add(this.boatMesh);
    this.rampCine = null; this.rampDone = false;
    if (this.kai.parent !== this.boatMesh) this.placeKaiAtHelm();
    this.boatMesh.visible = true;
    this.lab.hatch.rotation.y = 0; this.hasCrowbar = false; this.crowbarObj.visible = true;
    OCEAN.amp = 1.0;
    this.flashT = 4;
    this.camPos = null;
  }

  start(cp, opts = {}) {
    const g = this.game;
    this.startAudio();
    g.audio.setReverb(3.5, 2); g.audio.setReverbMix(0.3);
    g.audio.setMuffle(20000, 0.5);
    if (cp === 'start') this.intro(opts);
    else { g.ui.fadeColor('#000'); g.ui.fade(0, 1); this.beginPhase(this.phase); }
  }

  async restart(cp) { this.game.ui.subs.innerHTML = ''; this.reset(cp); this.beginPhase(this.phase); }

  startAudio() {
    const a = this.game.audio; if (!a.ctx || this.engine) return;
    this.engine = new EngineSound(a, { cylinders: 6, vol: 0.3, boat: true, base: 1.1 });
    this.rainSnd = new NoiseLoop(a, { type: 'highpass', freq: 3000, dest: a.amb, buf: a.white }); this.rainSnd.set(0.12, 3500);
    this.seaSnd = new NoiseLoop(a, { type: 'lowpass', freq: 400, dest: a.amb, buf: a.brown }); this.seaSnd.set(0.5, 500);
    this.windSnd = new NoiseLoop(a, { type: 'bandpass', freq: 700, q: 0.6, dest: a.amb }); this.windSnd.set(0.12, 600);
    this.hullSnd = new NoiseLoop(a, { type: 'lowpass', freq: 900, buf: a.pink });
  }

  line(id, lines) { if (this.said.has(id)) return; this.said.add(id); this.game.ui.conversation(lines, () => this.disposed); }

  async intro(opts) {
    const g = this.game, ui = g.ui;
    this.cinematic = { t: 0 };
    ui.letterbox(true);
    // under the flood: silence, then the car rewrites itself into a boat and surfaces
    ui.fadeColor('#05222c'); await ui.fade(1, 0.01);
    g.audio.setMuffle(300, 0.01);
    this.boat.place(0, 0, 0); this.ocean.clearWake();
    this.cinematic.under = true;
    ui.fade(0.55, 2.5);
    await wait(1600);
    if (this.disposed) return;
    g.audio.rewrite(2.2); g.renderer.grade.uniforms.uRewrite.value = 0.5;
    ui.say('ANCHOR', 'REWRITING VEHICLE TO MATCH LOCAL VERSION…', { duration: 2.4 });
    await wait(2200);
    g.renderer.grade.uniforms.uRewrite.value = 0; g.renderer.grade.uniforms.uFlash.value = 0.9; setTimeout(() => (g.renderer.grade.uniforms.uFlash.value = 0), 120);
    this.cinematic.under = false; this.cinematic.surface = 0;
    g.audio.setMuffle(20000, 0.3); g.audio.splash(null, 3);
    ui.fadeColor('#000'); await ui.fade(0, 0.3);
    g.audio.thunder(0.3); this.flash(1);
    ui.chapterCard(2, 'BELOW THE STORM', 'Naval action', 3.2);
    this.kaiAnim.expression = 'fear';
    await wait(2500);
    this.kaiAnim.expression = 'confused'; this.kaiAnim.talking = true;
    await ui.say('KAI', 'That was a street. That was a whole street.', { duration: 2.6 });
    this.kaiAnim.talking = false;
    await ui.say('ANCHOR', 'IDENTITY PRESERVED. LOCAL VERSION: FLOODED HALDEN. DRIFT 0%.', { duration: 3 });
    this.kaiAnim.talking = true;
    await ui.say('KAI', 'And my car is a boat.', { duration: 1.8 });
    this.kaiAnim.talking = false; this.kaiAnim.expression = 'focus';
    ui.letterbox(false);
    this.cinematic = null;
    g.music.play('naval', { intensity: 0.15 });
    this.beginPhase('storm');
  }

  beginPhase(name) {
    const g = this.game, ui = g.ui;
    this.phase = name; this.phaseT = 0;
    this.hud.style.opacity = name === 'boarding' || name === 'rescue' || name === 'escape' ? 0 : 1;
    if (name === 'storm') {
      ui.objective('Follow the signal', 'Steer between the drowned towers toward the distress beacon');
      ui.hint('<kbd>W</kbd><kbd>S</kbd> throttle · <kbd>A</kbd><kbd>D</kbd> rudder · mouse to look &amp; aim · <kbd>LMB</kbd> bow gun · <kbd>Shift</kbd> boost · <kbd>Space</kbd> trim / jump a swell · click to capture the mouse', 10000);
      g.music.play('naval', { intensity: 0.2 });
      this.line('s1', [3, ['RADIO', '…this is the research vessel Meridian… anyone with an Anchor… we\'re taking on water…'], ['KAI', 'Sera? It\'s you, right? From the radio. I came through. Where are you?'], ['SERA', 'You— you actually came through? Okay. Okay. Follow my beacon. Keep your bow into the waves or they\'ll roll you.']]);
    }
    if (name === 'hunters') {
      ui.objective('Survive the ATLAS patrol', 'Destroy the patrol boats — shoot engines to cripple, the bow to silence the gunner');
      g.music.play('naval', { intensity: 0.7 });
      this.wave = 1; this.spawnWave(2);
      this.line('h1', [1, ['SERA', 'Those are Venn\'s. They\'ll board me if they reach the ship first.'], ['VENN', 'Mr. Voss. You swim well for a man who doesn\'t exist here.'], ['KAI', 'Does she ever stop talking?'], ['SERA', 'Not since 2019. Both of them.']]);
    }
    if (name === 'meridian') {
      ui.objective('Reach the Meridian', 'Disable the deck turrets (shoot the glowing coolant tanks) and drive up the stern ramp');
      g.music.play('naval', { intensity: 1 });
      this.ship.visible = true;
      this.line('m1', [1, ['SERA', 'The ship\'s defence grid thinks you\'re hostile. Hit the coolant on the turrets — the blue tanks.'], ['KAI', 'And then?'], ['SERA', 'Stern ramp. It\'s down. Don\'t slow down or the swell will throw you back.']]);
    }
    if (name === 'boarding') this.startBoarding();
  }

  spawnWave(n) {
    const b = this.boat;
    let k = 0;
    for (const p of this.patrols) {
      if (p.alive || k >= n) continue;
      const a = b.yaw + (k - (n - 1) / 2) * 0.7;
      const pos = b.pos.clone().add(V3(Math.sin(a) * 180, 0, Math.cos(a) * 180));
      p.spawn(pos, a + Math.PI); p.counted = false; k++;
    }
  }

  flash(i = 1) { this.flashI = Math.max(this.flashI || 0, i); }

  // ------------------------------------------------------------------ update
  update(dt, t) {
    this.t = t;
    this.ocean.update(t, this.camera);
    this.rain.update(t, this.camera);
    this.sky.userData.u.uTime.value = t;
    this.weather(dt, t);
    this.waterFx(dt, t);
    this.updateShip(dt, t);
    if (this.cinematic) { this.updateIntroCam(dt, t); return; }
    if (this.rampCine) { this.updateRampJump(dt, t); return; }
    if (this.onFoot || this.rescueCine) { this.updateOnFoot(dt, t); return; }
    this.sail(dt, t);
  }

  weather(dt, t) {
    this.flashT -= dt;
    if (this.flashT < 0) { this.flashT = 5 + Math.random() * 9; this.flash(0.6 + Math.random() * 0.6); setTimeout(() => this.game.audio.thunder(0.3 + Math.random() * 1.5), 200 + Math.random() * 1500); }
    this.flashI = Math.max(0, (this.flashI || 0) - dt * 3.5);
    const f = this.flashI * (Math.random() < 0.7 ? 1 : 0.3);
    this.sky.userData.u.uFlash.value = f; this.ocean.U.uFlash.value = f;
    this.moon.intensity = 0.9 + f * 5;
    this.hemi.intensity = 0.5 + f * 1.5;
    for (const b of this.beacons) b.material.emissiveIntensity = Math.sin(t * 2.5 + b.position.x) > 0.7 ? 5 : 0.2;
  }

  /** Wake and hull foam on the sea, plus the underwater look when the camera is below the surface. */
  waterFx(dt, t) {
    const b = this.boat, list = [];
    const onWater = (body) => !body.airborne && body.pos.y > waterHeight(body.pos.x, body.pos.z, t) - 2;
    if (this.boatMesh.visible && !this.rampCine && !this.onFoot && onWater(b)) {
      list.push({ x: b.pos.x, z: b.pos.z, yaw: b.yaw, s: 0.25 + Math.min(1, b.speed / 16) * 0.75 });
      const st = b.pos.clone().addScaledVector(V3(Math.sin(b.yaw), 0, Math.cos(b.yaw)), -4.6);
      this.ocean.wake(dt, st.x, st.z, b.speed);
    } else this.ocean.wake(dt, b.pos.x, b.pos.z, 0);
    for (const p of this.patrols) if (p.alive && !p.sinking && onWater(p.body)) list.push({ x: p.body.pos.x, z: p.body.pos.z, yaw: p.body.yaw, s: 0.2 + Math.min(1, p.body.speed / 16) * 0.6 });
    this.ocean.hulls(list);
    const cam = this.camera.position, under = cam.y < waterHeight(cam.x, cam.z, t) - 0.05;
    if (under !== this.underwater) {
      this.underwater = under;
      const sc = this.scene;
      sc.fog.color.set(under ? 0x05242c : 0x1d262e); sc.fog.density = under ? 0.05 : 0.0065;
      sc.background = under ? sc.fog.color.clone() : null;
      this.sky.visible = !under; this.rain.lines.visible = !under;
    }
  }

  updateIntroCam(dt, t) {
    const c = this.cinematic; c.t += dt;
    const b = this.boat;
    if (c.under) {
      b.pos.y = waterHeight(b.pos.x, b.pos.z) - 6 + c.t * 1.2; b.sync();
      this.camera.position.copy(b.pos).add(V3(4, -1.5, 9)); this.camera.lookAt(b.pos.clone().add(V3(0, 3, 0)));
      this.spray.emit(b.pos.clone().add(V3((Math.random() - 0.5) * 4, Math.random() * 2, (Math.random() - 0.5) * 4)), V3(0, 2, 0), { life: 2, size: 0.15, grow: 0.5, color: [0.6, 0.8, 0.9], alpha: 0.5, drag: 0.5 });
    } else {
      b.input = { throttle: 0.2, brake: 0, rudder: 0, boost: 0, trim: 0 };
      b.update(dt, t);
      const p = this.boatMesh.localToWorld(V3(3.5, 2.6, 6.5));
      this.camera.position.lerp(p, 1 - Math.exp(-dt * 4)); this.camera.lookAt(this.boatMesh.localToWorld(V3(0, 1.8, 0)));
    }
    this.kaiAnim.lookTarget = this.camera.position;
    this.kaiAnim.update(dt);
    this.spray.update(dt); this.smoke.update(dt); this.fire.update(dt);
    this.updateAudio(dt);
    this.moon.position.copy(b.pos).addScaledVector(this.sunDir, 100); this.moon.target.position.copy(b.pos);
  }

  sail(dt, t) {
    const g = this.game, inp = g.input, b = this.boat;
    this.phaseT += dt;
    // controls
    b.input = { throttle: inp.throttle, brake: inp.brake, rudder: -inp.steer, boost: inp.any('ShiftLeft', 'ShiftRight') || inp.padBtn(1) > 0.5 ? 1 : 0, trim: inp.down('Space') ? 1 : 0 };
    const [lx, ly] = inp.lookDelta();
    this.camYaw -= lx; this.camPitch = clamp(this.camPitch - ly, -0.32, 0.5);
    const sub = 2;
    for (let i = 0; i < sub; i++) b.update(dt / sub, t);
    for (const tw of this.towers) { const hit = b.collideBox(tw); if (hit > 4) this.impact(hit); }
    if (this.ship.visible) { const sb = this.shipBox(); const hit = b.collideBox(sb); if (hit > 4) this.impact(hit); }
    for (const p of this.patrols) if (p.alive) { const d = p.body.pos.distanceTo(b.pos); if (d < 6) { const n = b.pos.clone().sub(p.body.pos).setY(0).normalize(); b.vel.addScaledVector(n, 4); p.body.vel.addScaledVector(n, -6); if (b.speed > 12) p.hitAt(p.body.pos.clone(), 0.25); this.impact(6); } }
    if (b.slam > 0) { this.game.audio.splash(b.pos, b.slam); this.shake = Math.max(this.shake || 0, b.slam * 0.6); for (let i = 0; i < 30; i++) this.spray.emit(b.pos.clone().add(V3((Math.random() - 0.5) * 3, 0.5, (Math.random() - 0.5) * 6)), V3((Math.random() - 0.5) * 8, 3 + Math.random() * 5, (Math.random() - 0.5) * 8), { life: 1.2, size: 0.8, grow: 2, color: [0.85, 0.9, 0.92], alpha: 0.6, gravity: 9 }); this.kaiAnim.hitReact(0, b.slam * 0.6); b.slam = 0; }
    this.aimAndFire(dt, t);
    // enemies & projectiles
    for (const p of this.patrols) p.update(dt, t, b, this.tracers, this.towers);
    const playerTargets = [{ pos: b.pos.clone().add(V3(0, 1, 0)), radius: 2.6, hit: (pt, dmg) => this.hurt(pt, dmg) }];
    const enemyTargets = [];
    for (const p of this.patrols) if (p.alive && !p.sinking) enemyTargets.push({ pos: p.body.pos.clone().add(V3(0, 1, 0)), radius: 2.4, hit: (pt, dmg) => { p.hitAt(pt, dmg); this.hitMarker(); if (p.sinking && !p.counted) { p.counted = true; this.kills++; } } });
    if (this.ship.visible) for (const tu of this.ship.userData.turrets) if (tu.alive) enemyTargets.push({ pos: tu.tank.getWorldPosition(V3()), radius: 1.3, hit: (pt) => this.hitTurret(tu, pt) });
    const splash = (p) => { if (Math.random() < 0.5) this.spray.emit(p, V3(0, 4, 0), { life: 0.6, size: 0.4, grow: 2, color: [0.85, 0.9, 0.92], alpha: 0.5, gravity: 8 }); if (p.distanceTo(b.pos) < 25 && Math.random() < 0.5) g.audio.burst({ pos: p, freq: 2200, freqEnd: 500, q: 0.5, type: 'lowpass', dur: 0.12, vol: 0.35, reverb: 0.1 }); };
    this.tracers.update(dt, playerTargets, enemyTargets, splash, { pos: b.pos.clone().add(V3(0, 1.6, 0)), cb: (p) => {
      // play the snap just beside the listener so it reads as "that one was close"
      const cp = this.camera.position, d = p.clone().sub(cp); g.audio.whizz(cp.clone().addScaledVector(d.normalize(), 2.5));
      this.shake = Math.max(this.shake || 0, 0.1);
    } });
    // health regen
    this.hurtT += dt;
    if (this.hurtT > 2.5) b.health = Math.min(1, b.health + dt * 0.09); // out of fire for a moment, the hull patches up fast
    if (b.health <= 0) { g.fail('SUNK'); b.health = 1; }
    this.phaseLogic(dt, t);
    this.updateFx(dt, t);
    this.updateBoatCamera(dt, t);
    this.updateKaiHelm(dt);
    this.updateAudio(dt);
    this.updateHud();
  }

  shipBox() { const p = this.shipPos; return { minX: p.x - 12, maxX: p.x + 12, minZ: p.z - 70, maxZ: p.z + 76 }; }

  impact(v) {
    const b = this.boat;
    this.game.audio.crash(b.pos, clamp(v / 18, 0.2, 1));
    b.health -= clamp(v / 300, 0, 0.08);
    this.shake = Math.max(this.shake || 0, v / 15);
    this.kaiAnim.hitReact(1, 0.8);
    this.hurtT = 0;
  }
  hurt(p, dmg) {
    const b = this.boat;
    b.health -= dmg; this.hurtT = 0;
    this.game.audio.hullHit(p);
    this.shake = Math.max(this.shake || 0, 0.25);
    this.hitDir(p);
    this.fxApi().spark(p);
    this.damageFlash = 0.4;
    if (Math.random() < 0.3) this.kaiAnim.hitReact(Math.random() < 0.5 ? -1 : 1, 0.4);
  }
  /** Red wedge around the crosshair pointing at where the fire came from. */
  hitDir(p) {
    const now = performance.now();
    if (now - (this.hitDirT || 0) < 120) return; this.hitDirT = now;
    const cam = this.camera, f = cam.getWorldDirection(V3()); f.y = 0; f.normalize();
    const to = p.clone().sub(cam.position); to.y = 0; to.normalize();
    // the shooter is beyond the impact point, along the incoming round; use the nearest live shooter if any
    let src = null, bd = 1e9;
    for (const pt of this.patrols) if (pt.alive && !pt.sinking) { const d = pt.body.pos.distanceTo(this.boat.pos); if (d < bd) { bd = d; src = pt.body.pos; } }
    if (this.ship.visible && this.shipPos.distanceTo(this.boat.pos) < bd) src = this.shipPos;
    if (src) { to.copy(src).sub(cam.position); to.y = 0; to.normalize(); }
    const ang = Math.atan2(f.x * to.z - f.z * to.x, f.dot(to)); // signed angle, + = to the right
    const w = el('i', '', this.H.hitdir); w.style.transform = `rotate(${(ang * 180) / Math.PI}deg)`;
    setTimeout(() => w.remove(), 900);
  }
  hitMarker() { this.H.cross.classList.add('hit'); clearTimeout(this.hmT); this.hmT = setTimeout(() => this.H.cross.classList.remove('hit'), 90); this.game.audio.tone({ type: 'square', freq: 1800, dur: 0.03, vol: 0.03, reverb: 0 }); }
  hitTurret(tu, p) {
    tu.hp -= 0.14; this.hitMarker(); this.fxApi().spark(p);
    if (tu.hp <= 0 && tu.alive) {
      tu.alive = false; tu.tank.visible = false;
      this.game.audio.explosion(p, 1); this.fxApi().explode(p);
      tu.pitch.rotation.x = 0.5;
      const left = this.ship.userData.turrets.filter((x) => x.alive).length;
      this.line('tur' + left, [['SERA', left ? 'One down! The other one\'s forward of the bridge.' : 'Both turrets are offline — go for the ramp, now!']]);
    }
  }

  /**
   * Bow gun, GETAWAY!-style: hitscan from the crosshair (the shot lands exactly where you aim,
   * instantly), light aim assist toward a boat just off the crosshair, and the tracer, muzzle
   * flash, kick, FOV punch, hit tick and impact effects as feedback.
   */
  aimAndFire(dt, t) {
    const g = this.game, gun = this.boatMesh.userData.gun, cam = this.camera;
    const origin = cam.position.clone(), look = cam.getWorldDirection(V3());
    // targets: patrol boats (generous hull spheres) and the ship's coolant tanks
    const targets = [];
    for (const p of this.patrols) if (p.alive && !p.sinking) targets.push({ c: p.body.pos.clone().add(V3(0, 1, 0)), r: 3.0, hit: (pt, d) => { p.hitAt(pt, d); if (p.sinking && !p.counted) { p.counted = true; this.kills++; this.killConfirm(pt); } }, boat: p });
    if (this.ship.visible) for (const tu of this.ship.userData.turrets) if (tu.alive) targets.push({ c: tu.tank.getWorldPosition(V3()), r: 1.6, hit: (pt) => this.hitTurret(tu, pt) });
    // aim assist: if a target sits within ~3 degrees of the crosshair, bend the aim onto it
    let dir = look.clone(), assisted = null, best = Math.cos(0.1);
    for (const tg of targets) { const to = tg.c.clone().sub(origin); const dist = to.length(); const c = to.normalize().dot(look); const cone = Math.cos(Math.min(0.1, Math.atan2(tg.r * 2.2, dist) + 0.03)); if (c > Math.min(best, cone)) { best = c; assisted = tg; } }
    if (assisted) dir.lerp(assisted.c.clone().sub(origin).normalize(), 0.85).normalize();
    // what the crosshair is on (for the turret to point at)
    const hitInfo = this.castShot(origin, dir, targets);
    const aimPoint = hitInfo.point;
    // the turret points straight at it (no lag: shots go where the crosshair is)
    const local = gun.group.worldToLocal(aimPoint.clone());
    gun.yaw.rotation.y = clamp(Math.atan2(local.x, local.z), -2.4, 2.4);
    const lp = gun.yaw.worldToLocal(aimPoint.clone());
    gun.pitch.rotation.x = clamp(-Math.atan2(lp.y - 0.25, Math.hypot(lp.x, lp.z)), -0.7, 0.45);
    this.H.cross.classList.toggle('lock', !!assisted);
    this.fireCd -= dt; this.overheat -= dt;
    this.heat = Math.max(0, this.heat - dt * (this.overheat > 0 ? 0.4 : 0.32));
    const firing = (g.input.mouse.down.has(0) || g.input.padBtn(7) > 0.5) && this.overheat <= 0;
    this.muzzleLight.intensity = Math.max(0, this.muzzleLight.intensity - dt * 120);
    if (firing && this.fireCd <= 0) {
      this.fireCd = 1 / 12;
      this.barrel = (this.barrel || 0) ^ 1;
      const mz = gun.muzzles[this.barrel].getWorldPosition(V3());
      // small spread around the (assisted) aim
      const sd = dir.clone().add(V3((Math.random() - 0.5) * 0.008, (Math.random() - 0.5) * 0.008, (Math.random() - 0.5) * 0.008)).normalize();
      const shot = this.castShot(origin, sd, targets);
      if (shot.target) { shot.target.hit(shot.point, 0.07); this.hitMarker(); this.fxApi().spark(shot.point); }
      else if (shot.water) { this.spray.emit(shot.point, V3(0, 5, 0), { life: 0.7, size: 0.5, grow: 2, color: [0.85, 0.9, 0.92], alpha: 0.6, gravity: 9 }); }
      else if (shot.wall) this.fxApi().spark(shot.point);
      this.tracers.streak(mz, shot.point);
      g.audio.gunshot(mz, true);
      this.fxApi().muzzle(mz, sd);
      this.muzzleLight.intensity = 18;
      this.shake = Math.max(this.shake || 0, 0.16);
      this.fovPunch = Math.min(5, (this.fovPunch || 0) + 1.2);
      this.camPitch += 0.0025; // a little climb per shot
      gun.pitch.position.z = -0.07;
      this.heat += 0.016;
      if (this.heat >= 1) { this.overheat = 2.0; this.heat = 1; g.audio.burst({ freq: 4000, type: 'highpass', dur: 1.2, vol: 0.2 }); }
      this.fire.emit(mz.clone().add(V3(0, -0.2, 0)), this.boat.right.multiplyScalar(3).add(V3(0, 2, 0)), { life: 0.5, size: 0.06, grow: 0, color: [0.9, 0.7, 0.3], alpha: 1, gravity: 12, drag: 0.2 });
    }
    gun.pitch.position.z += (0 - gun.pitch.position.z) * Math.min(1, dt * 20);
  }

  /** Hitscan: nearest of target spheres, towers, the ship, and the sea surface (ray-marched). */
  castShot(origin, dir, targets, range = 320) {
    let tBest = range, res = { point: origin.clone().addScaledVector(dir, range) };
    for (const tg of targets) {
      const oc = origin.clone().sub(tg.c), b = oc.dot(dir), c = oc.lengthSq() - tg.r * tg.r, h = b * b - c;
      if (h < 0) continue; const tt = -b - Math.sqrt(h);
      if (tt > 0 && tt < tBest) { tBest = tt; res = { point: origin.clone().addScaledVector(dir, tt), target: tg }; }
    }
    // the drowned towers stop shots; the ship's bounding box does NOT (its turrets sit inside it,
    // so letting the box block shots made them impossible to destroy)
    const boxes = this.towers;
    for (const bx of boxes) {
      let t0 = 0, t1 = tBest, ok = true;
      for (const [o, d, lo, hi] of [[origin.x, dir.x, bx.minX, bx.maxX], [origin.z, dir.z, bx.minZ, bx.maxZ], [origin.y, dir.y, -50, bx.maxY ?? 400]]) {
        if (Math.abs(d) < 1e-6) { if (o < lo || o > hi) { ok = false; break; } continue; }
        let ta = (lo - o) / d, tb = (hi - o) / d; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) { ok = false; break; }
      }
      if (ok && t0 > 0.5 && t0 < tBest) { tBest = t0; res = { point: origin.clone().addScaledVector(dir, t0), wall: true }; }
    }
    // sea surface: march then refine
    if (dir.y < 0) {
      let prev = 0;
      for (let tt = 2; tt < tBest; tt += 4) {
        const p = origin.clone().addScaledVector(dir, tt);
        if (p.y < waterHeight(p.x, p.z)) { let lo = prev, hi = tt; for (let k = 0; k < 6; k++) { const m = (lo + hi) / 2, q = origin.clone().addScaledVector(dir, m); if (q.y < waterHeight(q.x, q.z)) hi = m; else lo = m; } res = { point: origin.clone().addScaledVector(dir, hi), water: true }; break; }
        prev = tt;
      }
    }
    return res;
  }

  killConfirm(p) {
    this.game.ui.toast('PATROL BOAT DESTROYED', 1600);
    this.game.audio.tone({ type: 'triangle', freq: 880, freqEnd: 1320, dur: 0.18, vol: 0.06, reverb: 0.2 });
    this.shake = Math.max(this.shake || 0, 0.5);
  }

  phaseLogic(dt, t) {
    const b = this.boat, g = this.game;
    if (this.phase === 'storm') {
      this.waypoint = V3(0, 0, 380);
      OCEAN.amp = 0.8 + Math.min(0.4, this.phaseT / 60);
      const ct = this.collapseTower;
      if (!ct.falling && b.pos.z > 150) { ct.falling = true; g.audio.explosion(V3(40, 10, 260), 1); this.line('ct', [['SERA', 'Watch the tower — it\'s going!'], ['KAI', 'I see it, I see it—']]); }
      if (ct.falling && ct.t < 1) {
        ct.t = Math.min(1, ct.t + dt * 0.18);
        ct.mesh.rotation.z = ct.t * ct.t * 1.25;
        if (Math.random() < 0.5) this.fxApi().smoke(V3(40 - ct.t * 60, ct.t * 20 + Math.random() * 40, 260 + (Math.random() - 0.5) * 20), false);
        if (ct.t > 0.85 && !ct.splashed) { ct.splashed = true; g.audio.explosion(V3(-20, 0, 260), 1); for (let i = 0; i < 120; i++) this.spray.emit(V3(-30 + Math.random() * 80, 0, 250 + Math.random() * 20), V3((Math.random() - 0.5) * 10, 10 + Math.random() * 20, (Math.random() - 0.5) * 10), { life: 3, size: 3, grow: 3, color: [0.8, 0.85, 0.9], alpha: 0.5, gravity: 9 }); this.shake = 1.2; }
        // the fallen tower becomes an obstacle across the channel
        const span = ct.t > 0.85;
        if (span) { this.towers[this.towers.length - 1] = { minX: -100, maxX: -33, minZ: 248, maxZ: 272, maxY: 6, mesh: ct.mesh } /* only the part that sticks out of the water */; }
      }
      if (b.pos.z > 330) { g.checkpoint('hunters'); this.beginPhase('hunters'); }
    } else if (this.phase === 'hunters') {
      this.waypoint = V3(-20, 0, 860);
      const alive = this.patrols.filter((p) => p.alive && !p.sinking).length;
      for (const p of this.patrols) if (p.sinking && !p.counted) { p.counted = true; this.kills++; this.killConfirm?.(p.body.pos.clone()); }
      // a patrol that wandered off (stuck behind a tower, fled too far) never blocks the fight
      for (const p of this.patrols) if (p.alive && !p.sinking && p.body.pos.distanceTo(b.pos) > 420) { p.alive = false; p.mesh.visible = false; p.engine?.stop(); p.engine = null; }
      g.ui.objectiveDetail(`Patrol boats destroyed: ${this.kills} / 4`);
      if (alive === 0 && this.wave === 1) { this.wave = 2; this.spawnWave(2); this.line('h2', [['SERA', 'More coming in from the east!'], ['VENN', 'Sera. You always did pick the wrong side of a door.']]); }
      else if (this.wave === 2 && alive === 0) { g.checkpoint('meridian'); this.beginPhase('meridian'); }
      if (this.phaseT > 40 && this.kills < 2) this.line('hint', [['SERA', 'Aim for their engines — the stern! Crippled boats can\'t chase you.']]);
    } else if (this.phase === 'meridian') {
      this.waypoint = this.ship.localToWorld(V3(0, 4, -90));
      this.turretAI(dt, t);
      // reach the ramp: behind the stern, aligned, with speed
      const local = this.ship.worldToLocal(b.pos.clone());
      const turretsDown = this.ship.userData.turrets.every((x) => !x.alive);
      if (local.z < -70 && local.z > -115 && Math.abs(local.x) < 14) {
        if (!turretsDown) this.line('nope', [['SERA', 'The turrets will shred you on the ramp — take them out first!']]);
        else if (b.speed > 2.5) this.startRampJump();
        else this.line('faster', [['SERA', 'Faster! You need speed to make the ramp!']]);
      }
    }
  }

  turretAI(dt, t) {
    const b = this.boat;
    for (const tu of this.ship.userData.turrets) {
      if (!tu.alive) continue;
      const target = b.pos.clone().add(V3(0, 1, 0)).addScaledVector(b.vel, 0.4);
      const local = tu.group.worldToLocal(target.clone());
      tu.yaw.rotation.y += (Math.atan2(local.x, local.z) - tu.yaw.rotation.y) * Math.min(1, dt * 2.5);
      tu.pitch.rotation.x = -Math.atan2(local.y - 1, Math.hypot(local.x, local.z));
      tu.fireT = (tu.fireT ?? 2) - dt;
      const d = tu.group.getWorldPosition(V3()).distanceTo(b.pos);
      // telegraph: tank pulses faster before a burst
      tu.tank.material.emissiveIntensity = 2.5 + (tu.fireT < 1 ? Math.sin(t * 30) * 2 : 0);
      if (tu.fireT < 0 && d < 260) {
        tu.burst = (tu.burst ?? 0) + 1;
        const mz = tu.muzzles[tu.burst % 2].getWorldPosition(V3());
        this.tracers.fire(mz, target.clone().sub(mz).normalize(), { enemy: true, speed: 300, damage: 0.012, spread: 0.05 });
        this.game.audio.gunshotFar(mz); this.game.audio.tone({ pos: mz, ref: 30, type: 'triangle', freq: 90, freqEnd: 35, dur: 0.22, vol: 0.5 });
        this.fxApi().muzzle(mz, target.clone().sub(mz).normalize());
        if (tu.burst % 6 === 0) tu.fireT = 3.0; else tu.fireT = 0.1;
      }
    }
  }

  updateShip(dt, t) {
    if (!this.ship.visible) return;
    // the Meridian steams slowly, listing to port, heaving in the swell
    this.shipPos.z += dt * 3.2;
    const h = waterHeight(this.shipPos.x, this.shipPos.z, t) * 0.25;
    this.ship.position.set(this.shipPos.x, h - 7.2, this.shipPos.z);
    this.ship.rotation.set(Math.sin(t * 0.35) * 0.02, 0.0, this.shipList + Math.sin(t * 0.45) * 0.03);
    this.ship.userData.radar.rotation.y += dt * 1.5;
    for (const l of this.ship.userData.deckLights) l.intensity = Math.random() < 0.97 ? 25 : 0;
    this.ship.userData.rampLights.forEach((l, i) => (l.material.emissiveIntensity = Math.floor(t * 4 - i) % 5 === 0 ? 6 : 0.5));
  }

  updateFx(dt, t) {
    const b = this.boat;
    // bow spray and wake
    if (b.spray > 0.1 && b.submerged > 0.2) {
      for (const sx of [-1, 1]) if (Math.random() < b.spray) { const p = this.boatMesh.localToWorld(V3(sx * 1.2, 0.4, 2.2)); this.spray.emit(p, this.boat.right.multiplyScalar(sx * 4).add(V3(0, 3 + b.spray * 3, 0)).addScaledVector(b.vel, 0.4), { life: 0.8, size: 0.35, grow: 2, color: [0.85, 0.9, 0.92], alpha: 0.3, gravity: 9 }); }
      const st = this.boatMesh.localToWorld(V3(0, 0.2, -4.8));
      if (Math.random() < b.spray) this.spray.emit(st, V3((Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2), { life: 1.6, size: 0.6, grow: 2.5, color: [0.9, 0.93, 0.95], alpha: 0.14, gravity: 2 });
    }
    if (b.health < 0.35 && Math.random() < 0.4) this.fxApi().smoke(this.boatMesh.localToWorld(V3(0, 1.5, -4)), true);
    for (const e of this.boatMesh.userData.engines) e.userData.prop.rotation.z += dt * b.rpm * 0.05;
    this.spray.update(dt); this.smoke.update(dt); this.fire.update(dt);
  }

  updateBoatCamera(dt, t) {
    const cam = this.camera, b = this.boat;
    // Third-person shooter camera: camYaw/camPitch are the AIM (mouse up = aim up). The camera
    // orbits behind the boat and looks exactly along the aim, so the crosshair is where shots go.
    const yaw = this.camYaw, aim = this.camPitch;
    const dist = 11, orbit = 0.1 - aim * 0.55; // aiming up lowers the camera, aiming down lifts it
    const pivot = b.pos.clone().add(V3(0, 2.4, 0));
    const want = pivot.clone().add(V3(-Math.sin(yaw) * Math.cos(orbit) * dist, Math.sin(orbit) * dist + 0.7, -Math.cos(yaw) * Math.cos(orbit) * dist));
    // keep above the water
    want.y = Math.max(want.y, waterHeight(want.x, want.z, t) + 1.2);
    if (!this.camPos) this.camPos = want.clone();
    // follow the boat tightly (it moves fast) but smooth the heave
    this.camPos.x += (want.x - this.camPos.x) * (1 - Math.exp(-dt * 14));
    this.camPos.z += (want.z - this.camPos.z) * (1 - Math.exp(-dt * 14));
    this.camPos.y += (want.y - this.camPos.y) * (1 - Math.exp(-dt * 6));
    this.shake = Math.max(0, (this.shake || 0) - dt * 2);
    const s = this.shake * 0.35;
    cam.position.copy(this.camPos).add(V3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s));
    cam.lookAt(cam.position.clone().add(V3(Math.sin(yaw) * Math.cos(aim), Math.sin(aim), Math.cos(yaw) * Math.cos(aim))));
    this.fovPunch = Math.max(0, (this.fovPunch || 0) - dt * 30);
    cam.fov = 62 + clamp(b.speed / 30, 0, 1) * 10 + (b.input.boost && b.boostFuel > 0 ? 6 : 0) + this.fovPunch;
    cam.updateProjectionMatrix();
    this.game.renderer.grade.uniforms.uDamage.value = clamp(0.35 - b.health, 0, 0.35) * 2 + (this.damageFlash = Math.max(0, (this.damageFlash || 0) - dt * 2)) * 0.5;
    this.moon.position.copy(b.pos).addScaledVector(this.sunDir, 100); this.moon.target.position.copy(b.pos);
  }

  updateKaiHelm(dt) {
    const a = this.kaiAnim, b = this.boat;
    a.mode = 'idle'; a.speed = 0; a.mood = 'tense';
    // brace against the motion: lean into turns, crouch on landing
    a.lean = clamp(b.speed / 40, 0, 0.25);
    const wheel = this.boatMesh.localToWorld(V3(-0.15 - 0.17, 2.05, 0.38));
    const thr = this.boatMesh.localToWorld(V3(0.35, 2.15, 0.3));
    a.ik.handR = wheel; a.ik.handL = thr; a.grip.L = a.grip.R = 0.9;
    a.lookTarget = this.camera.position.clone().lerp(b.pos.clone().addScaledVector(b.forward, 40), 0.85);
    a.expression = b.health < 0.35 ? 'strain' : 'focus';
    a.update(dt);
  }

  updateAudio(dt) {
    const b = this.boat;
    if (!this.engine && this.game.audio.ctx) this.startAudio();
    if (this.engine) this.engine.update(b.rpm, b.input.throttle);
    this.hullSnd?.set(b.submerged > 0.2 ? clamp(b.speed / 25, 0, 1) * 0.35 : 0.05, 300 + b.speed * 30);
    this.windSnd?.set(0.12 + clamp(b.speed / 30, 0, 1) * 0.15, 500 + b.speed * 20);
  }

  updateHud() {
    const H = this.H, b = this.boat, cam = this.camera;
    H.hull.style.width = Math.max(0, b.health) * 100 + '%'; H.hullBox.classList.toggle('low', b.health < 0.3);
    H.boost.style.width = b.boostFuel * 100 + '%';
    H.heat.style.width = this.heat * 100 + '%'; H.heat.style.background = this.overheat > 0 ? 'var(--danger)' : 'var(--accent)';
    H.ammo.textContent = this.overheat > 0 ? 'OVERHEAT' : Math.round((1 - this.heat) * 100) + '%';
    H.spd.textContent = Math.round(b.speed * 1.944);
    const deg = ((-this.camYaw * 180 / Math.PI) % 360 + 360) % 360;
    H.strip.style.left = -(deg + 360) * 4 + 210 + 'px';
    // enemy target boxes
    this.patrols.forEach((p, i) => {
      const e = this.targetEls[i];
      if (!p.alive || p.sinking) { e.style.display = 'none'; return; }
      const v = p.body.pos.clone().add(V3(0, 1.5, 0)).project(cam);
      if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) { e.style.display = 'none'; return; }
      const d = p.body.pos.distanceTo(b.pos), s = clamp(1400 / d, 26, 120);
      e.style.display = 'block'; e.style.left = (v.x * 0.5 + 0.5) * innerWidth + 'px'; e.style.top = (-v.y * 0.5 + 0.5) * innerHeight + 'px';
      e.style.width = s + 'px'; e.style.height = s * 0.6 + 'px';
      e.querySelector('i').style.width = p.parts.hull * 100 + '%';
    });
    if (this.waypoint) {
      const v = this.waypoint.clone().project(cam);
      let x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
      if (v.z > 1) { x = innerWidth - x; y = innerHeight - 60; }
      H.wp.style.left = clamp(x, 40, innerWidth - 40) + 'px'; H.wp.style.top = clamp(y, 60, innerHeight - 60) + 'px'; H.wp.style.display = 'block';
      H.wpd.textContent = Math.round(this.waypoint.distanceTo(b.pos)) + ' m';
    }
  }

  // ------------------------------------------------------------------ on foot aboard the Meridian
  // ------------------------------------------------------------------ the stern-ramp jump
  // Ship-local key poses: up the ramp, launch, land on the stern deck, skid to a stop beside the lab.
  static RAMP = { top: [0, 7.6, -75], land: [0, 12.05, -67], park: [6.6, 12.05, -52], parkYaw: 0.5 };

  startRampJump() {
    const b = this.boat, g = this.game;
    const L = this.ship.worldToLocal(b.pos.clone());
    this.rampCine = { t: 0, from: L, yaw0: b.yaw - this.ship.rotation.y, sparkT: 0, landed: false };
    this.hud.style.opacity = 0; g.ui.letterbox(true); g.ui.prompt(null);
    this.tracers.clear();
    for (const p of this.patrols) { p.alive = false; p.mesh.visible = false; p.engine?.stop(); p.engine = null; }
    g.audio.burst({ pos: b.pos, freq: 600, freqEnd: 2400, q: 0.6, type: 'lowpass', dur: 0.8, vol: 0.6, reverb: 0.3 }); // engine scream up the ramp
    g.music.play('naval', { intensity: 1 });
  }

  /** Boat pose on the ship for cine time u (seconds); returns {p (local), yaw, pitch, roll, phase}. */
  rampPose(u) {
    const R = Chapter2.RAMP, c = this.rampCine, V = (a) => V3(a[0], a[1], a[2]);
    const ease = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
    if (u < 0.5) { // drive up the ramp
      const k = u / 0.5;
      return { p: c.from.clone().lerp(V(R.top), k), yaw: c.yaw0 * (1 - k), pitch: 0.3 * k, roll: 0, phase: 0 };
    }
    if (u < 1.3) { // airborne: an arc from the ramp lip onto the deck, nose dropping
      const k = (u - 0.5) / 0.8;
      const p = V(R.top).lerp(V(R.land), k); p.y += Math.sin(k * Math.PI) * 2.6;
      return { p, yaw: 0, pitch: 0.3 - 0.4 * k, roll: Math.sin(k * Math.PI) * 0.06, phase: 1 };
    }
    // skid: slews sideways across the deck and grinds to a stop
    const k = ease((u - 1.3) / 1.5);
    const p = V(R.land).lerp(V(R.park), k);
    return { p, yaw: R.parkYaw * Math.pow(k, 0.7), pitch: -0.1 * (1 - k), roll: -0.05 * Math.sin(k * Math.PI), phase: 2, k };
  }

  updateRampJump(dt, t) {
    const c = this.rampCine, g = this.game, b = this.boat;
    // slow motion while airborne
    const pose0 = this.rampPose(c.t);
    c.t += dt * (pose0.phase === 1 ? 0.4 : 1);
    const pose = this.rampPose(c.t);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-pose.pitch, pose.yaw, pose.roll, 'YXZ'));
    this.ship.updateMatrixWorld();
    b.pos.copy(this.ship.localToWorld(pose.p.clone()));
    this.boatMesh.position.copy(b.pos); this.boatMesh.quaternion.copy(this.ship.quaternion).multiply(q);
    if (pose.phase === 2 && !c.landed) {
      c.landed = true; this.shake = 1.4; this.flash(0.3);
      g.audio.crash(b.pos, 1); g.audio.metal({ pos: b.pos, base: 140, vol: 0.7, dur: 1.6 });
      this.kaiAnim.hitReact(1, 1);
    }
    if (pose.phase === 2 && pose.k < 0.95) {
      // sparks off the keel and a grinding scrape
      c.sparkT -= dt;
      for (let i = 0; i < 4; i++) {
        const sp = this.boatMesh.localToWorld(V3((Math.random() - 0.5) * 2.2, 0.1, -4 + Math.random() * 8));
        this.fire.emit(sp, V3((Math.random() - 0.5) * 6, 2 + Math.random() * 4, -6 - Math.random() * 6).applyQuaternion(this.ship.quaternion), { life: 0.5, size: 0.08, grow: 0, color: [1, 0.7, 0.3], alpha: 1, gravity: 12 });
      }
      if (c.sparkT <= 0) { c.sparkT = 0.07; g.audio.burst({ pos: b.pos, freq: 3000 + Math.random() * 2000, q: 2, dur: 0.12, vol: 0.35 * (1 - pose.k), reverb: 0.1 }); }
    }
    if (pose.phase === 0 && Math.random() < 0.8) this.spray.emit(this.boatMesh.localToWorld(V3(0, 0.2, -4.5)), V3((Math.random() - 0.5) * 4, 5, -6), { life: 1, size: 0.8, grow: 2, color: [0.9, 0.93, 0.95], alpha: 0.4, gravity: 8 });
    // camera: low behind the stern for the launch, then up on the deck rail for the skid
    const cam = this.camera;
    const camL = pose.phase < 2 ? V3(-7, 13.5, -101) : V3(9.5, 15.2, -69);
    const want = this.ship.localToWorld(camL);
    want.y = Math.max(want.y, waterHeight(want.x, want.z, t) + 1.5);
    if (!c.cam) c.cam = want.clone();
    c.cam.lerp(want, 1 - Math.exp(-dt * (pose.phase < 2 ? 6 : 2.5)));
    this.shake = Math.max(0, (this.shake || 0) - dt * 2);
    const s = this.shake * 0.3;
    cam.position.copy(c.cam).add(V3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s));
    cam.lookAt(b.pos.clone().add(V3(0, 1.5, 0)));
    cam.fov = pose.phase === 1 ? 56 : 62; cam.updateProjectionMatrix();
    this.kaiAnim.update(dt);
    this.spray.update(dt); this.smoke.update(dt); this.fire.update(dt);
    this.updateAudio(dt);
    this.moon.position.copy(b.pos).addScaledVector(this.sunDir, 100); this.moon.target.position.copy(b.pos);
    if (c.t > 3.0 && !c.done) {
      c.done = true;
      this.line('rampend', [['KAI', 'Parked.'], ['SERA', 'You— on the DECK? Okay. Okay! Aft lab, the white module!']]);
      this.rampDone = true; this.rampCine = null;
      g.ui.letterbox(false);
      g.checkpoint('boarding'); this.beginPhase('boarding');
    }
  }

  parkBoatOnDeck() {
    const R = Chapter2.RAMP, m = this.boatMesh;
    this.ship.add(m);
    m.position.set(R.park[0], R.park[1], R.park[2]);
    m.quaternion.setFromEuler(new THREE.Euler(0, R.parkYaw, 0, 'YXZ'));
    m.visible = true;
  }

  startBoarding() {
    const g = this.game, ui = g.ui;
    ui.objective('Find Sera', 'She\'s locked in the aft lab module');
    this.hud.style.opacity = 0;
    g.music.play('onfoot', { intensity: 0.4 });
    for (const p of this.patrols) { p.alive = false; p.mesh.visible = false; p.engine?.stop(); p.engine = null; }
    this.tracers.clear();
    // the boat ends up skidded across the stern deck; Kai walks the (listing) deck in ship space
    this.ship.visible = true;
    if (!this.rampDone) this.shipPos.set(this.boat.pos.x, 0, this.boat.pos.z + 85);
    this.parkBoatOnDeck();
    this.ship.add(this.kai);
    this.kai.scale.setScalar(1);
    this.onFoot = new OnFoot(this.kai, this.kaiAnim, this.ship);
    this.onFoot.pos.set(3.4, 11.6, -64); this.onFoot.yaw = 0; this.onFoot.camYaw = 0;
    const hullW = (z) => this.ship.userData.hull.width(z) - 0.8;
    this.onFoot.floors = [{ minX: -12, maxX: 12, minZ: -75, maxZ: 76, y: 11.6 }];
    const boxes = this.onFoot.boxes;
    // deck edges (railings), containers, superstructure, lab, A-frame legs, lifeboat davits
    for (let z = -74; z < 74; z += 4) { const w = hullW(z + 2); boxes.push({ minX: w, maxX: w + 2, minZ: z, maxZ: z + 4 }, { minX: -w - 2, maxX: -w, minZ: z, maxZ: z + 4 }); }
    boxes.push({ minX: -12, maxX: 12, minZ: -78, maxZ: -74.5 });
    for (let i = 0; i < 8; i++) { const x = (i % 2 ? -1 : 1) * 4, z = -20 - Math.floor(i / 2) * 7; boxes.push({ minX: x - 1.3, maxX: x + 1.3, minZ: z - 3.1, maxZ: z + 3.1 }); }
    boxes.push({ minX: -9, maxX: 9, minZ: -1, maxZ: 21 });
    boxes.push({ minX: -8.1, maxX: 2.05, minZ: -59.1, maxZ: -50.9 });
    this.hatchBox = { minX: 2.0, maxX: 2.3, minZ: -56.5, maxZ: -55.3 };
    boxes.push({ minX: 4.9, maxX: 8.6, minZ: -57.5, maxZ: -46.5 }); // the interceptor, skidded to a stop
    for (const b of this.deckProps) boxes.push(b);
    this.line('b1', [['KAI', 'I\'m on board. Sera?'], ['SERA', 'Aft lab — the white module. The hatch jammed when we started listing. There\'s a pry bar in the lifeboat locker, starboard side.']]);
    this.waveT = 6;
    this.deckWater = new Particles(this.scene, { max: 400 });
  }

  updateOnFoot(dt, t) {
    const g = this.game, ui = g.ui, f = this.onFoot;
    if (this.rescueCine) { this.updateRescue(dt, t); return; }
    // the list pushes you toward port; waves sweep the deck periodically
    this.shipList = Math.min(0.2, this.shipList + dt * 0.0015);
    // the list leans you gently to port; working the hatch you brace and hold your ground
    const bracing = this.game.input.down('KeyE');
    f.list.set(bracing ? 0 : -Math.sin(this.shipList) * 9.81 * 0.1, 0);
    this.waveT -= dt;
    if (this.waveT < 0) {
      this.waveT = 9 + Math.random() * 5; this.sweep = 1.4;
      g.audio.splash(this.kai.getWorldPosition(V3()), 2.5);
      this.line('wave' + Math.floor(t / 30), [['SERA', 'Hold on to something!', { duration: 1.4 }]]);
    }
    if (this.sweep > 0) {
      this.sweep -= dt;
      // being near cover (container/superstructure) protects you
      const covered = f.boxes.some((b) => f.pos.x > b.minX - 1.6 && f.pos.x < b.maxX + 1.6 && f.pos.z > b.minZ - 1.6 && f.pos.z < b.maxZ + 1.6 && (b.maxZ - b.minZ) < 30 && (b.maxX - b.minX) > 1);
      if (!covered && !bracing) { f.list.x -= 6; f.vel.z -= dt * 2; this.kaiAnim.expression = 'strain'; }
      for (let i = 0; i < 6; i++) { const p = this.ship.localToWorld(V3(10 - Math.random() * 3, 12 + Math.random(), f.pos.z + (Math.random() - 0.5) * 20)); this.spray.emit(p, this.ship.localToWorld(V3(-12, 13, f.pos.z)).sub(p).multiplyScalar(0.8), { life: 1.2, size: 1.4, grow: 2, color: [0.85, 0.9, 0.92], alpha: 0.4, gravity: 6 }); }
      // washed overboard?
      if (Math.abs(f.pos.x) > this.ship.userData.hull.width(f.pos.z) - 1.0) { g.fail('OVERBOARD'); return; }
    }
    if (this.game.input.mouse.down.has(0) && false) {}
    f.update(dt, g.input, this.camera, { onStep: () => g.audio.footstep('metal', this.kai.getWorldPosition(V3()), 0.25) });
    this.kaiAnim.mood = 'tense';
    this.kaiAnim.lookTarget = null;
    this.kaiAnim.update(dt);
    // interactions
    const near = (x, z, r) => Math.hypot(f.pos.x - x, f.pos.z - z) < r;
    let prompt = null;
    if (!this.hasCrowbar && near(8.2, -38, 2.2)) { prompt = '<kbd>E</kbd> Take the pry bar'; if (g.input.hit('KeyE')) { this.hasCrowbar = true; this.crowbarObj.visible = false; this.crowbarGlow.intensity = 0; g.audio.metal({ base: 500, vol: 0.2, dur: 0.4 }); ui.objective('Open the lab hatch', 'Use the pry bar on the jammed hatch'); this.line('cb', [['KAI', 'Got it. Hang on.']]); } }
    if (near(2.6, -55.9, 2.0)) {
      if (!this.hasCrowbar) prompt = 'The hatch is jammed';
      else { prompt = '<b>Hold</b> <kbd>E</kbd> Pry the hatch open'; if (g.input.down('KeyE')) { this.pry = (this.pry || 0) + dt; this.kaiAnim.expression = 'strain'; this.lab.hatch.rotation.y = -Math.min(0.15, this.pry * 0.05) + Math.sin(t * 40) * 0.01; if (Math.random() < dt * 6) g.audio.metal({ base: 220 + Math.random() * 80, vol: 0.12, dur: 0.5 }); if (this.pry > 2.4) this.openHatch(); } else this.pry = Math.max(0, (this.pry || 0) - dt); }
    }
    ui.prompt(prompt);
    this.lab.emergency.intensity = Math.sin(t * 6) > 0 ? 6 : 0;
    if (this.labRing) this.labRing.material.emissiveIntensity = 1.2 + Math.sin(t * 4) * 0.5;
    this.updateGuidance(t);
    this.spray.update(dt); this.smoke.update(dt); this.fire.update(dt);
    this.moon.position.copy(this.kai.getWorldPosition(V3())).addScaledVector(this.sunDir, 100); this.moon.target.position.copy(this.kai.getWorldPosition(V3()));
  }

  async openHatch() {
    const g = this.game, ui = g.ui;
    if (this.rescueCine) return;
    this.rescueCine = { t: 0 };
    ui.prompt(null); ui.objective(null);
    g.audio.metal({ base: 160, vol: 0.5, dur: 1.4 }); g.audio.crash(this.kai.getWorldPosition(V3()), 0.5);
    this.lab.hatch.rotation.y = -2.95; // folded back against the inner wall
    const inside = new THREE.PointLight(0xffe0c0, 6, 9, 2); inside.position.set(-1.5, 14.6, -55.5); this.ship.add(inside);
    g.music.play('onfoot', { intensity: 0.7 });
    // Sera inside the lab
    this.ship.add(this.sera); this.sera.visible = true;
    this.sera.position.set(0.9, 11.6, -55.9); this.sera.rotation.y = Math.PI / 2;
    this.onFoot.pos.set(3.0, 11.6, -55.9); this.onFoot.yaw = -Math.PI / 2; this.kai.position.copy(this.onFoot.pos); this.kai.rotation.y = this.onFoot.yaw;
    this.kaiAnim.mode = 'idle'; this.kaiAnim.speed = 0;
    this.seraAnim.mode = 'idle'; this.seraAnim.mood = 'tense';
    ui.letterbox(true);
    this.rescueCine.shot = 0;
    const sayK = async (txt, expr = 'neutral', d) => { this.kaiAnim.expression = expr; this.kaiAnim.talking = true; this.rescueCine.speaker = 'kai'; await ui.say('KAI', txt, d ? { duration: d } : {}); this.kaiAnim.talking = false; };
    const sayS = async (txt, expr = 'neutral', d) => { this.seraAnim.expression = expr; this.seraAnim.talking = true; this.rescueCine.speaker = 'sera'; await ui.say('SERA', txt, d ? { duration: d } : {}); this.seraAnim.talking = false; };
    this.seraAnim.expression = 'fear';
    await wait(900);
    await sayS('You\'re real. You\'re actually— you\'re wearing it. The Anchor.', 'surprise');
    await sayK('Kai. Courier. I think I got the wrong package.', 'amused');
    await sayS('Sera Lind. Field tech. I think I got the wrong boss.', 'amused');
    this.rescueCine.shot = 1;
    const c = await ui.choice('', ['Are you hurt?', 'You told me to go through. What did that DO to my city?', 'Venn. Is this her ship?'], { timeout: 14 });
    this.game.input.lock();
    if (c === 0 || c === -1) { state.sera += 1; setFlag('ch2_care'); await sayK('Are you hurt?', 'focus'); await sayS('Bruised. Mostly my pride. Nobody\'s asked me that in… a long time. Thank you.', 'sad'); }
    else if (c === 1) { setFlag('ch2_confront'); await sayK('You told me to go through. What did that do to my city? To Mara?', 'angry'); await sayS('It was already going. Halden was a version that stopped being kept. I\'m sorry. I am. I\'ll explain, I swear — just not on a sinking ship.', 'sad'); }
    else { setFlag('ch2_venn'); state.sera -= 0; await sayK('Venn. This is her ship?', 'focus'); await sayS('Her lab. Her machine. Her rules. I used to think she was saving everyone.', 'sad'); await sayK('And now?', 'focus'); await sayS('Now I think she\'s choosing who.', 'angry'); }
    this.rescueCine.shot = 2;
    g.audio.explosion(this.ship.localToWorld(V3(0, 5, -20)), 0.8); this.shipList += 0.05; this.flash(0.8);
    await sayS('That\'s the bulkhead. We have to go. Now!', 'fear', 1.8);
    ui.letterbox(false);
    this.rescueCine = null;
    this.startEscape();
  }

  startEscape() {
    const g = this.game, ui = g.ui;
    this.phase = 'escape';
    ui.objective('Get off the ship', 'Follow Sera through the bridge deck door');
    g.music.play('onfoot', { intensity: 0.85 });
    this.sera.visible = true;
    this.escapeT = 0;
    this.exitDoor = V3(0, 11.6, -1.4);
  }

  updateRescue(dt, t) {
    const r = this.rescueCine; r.t += dt;
    this.beacon.visible = false; if (this.H.foot) this.H.foot.style.display = 'none';
    this.rain.lines.visible = false; // indoors
    clearTimeout(this.rainBack); this.rainBack = setTimeout(() => { if (!this.underwater) this.rain.lines.visible = true; }, 400);
    if (this.labRing) this.labRing.material.emissiveIntensity = 1.2 + Math.sin(t * 4) * 0.5;
    const head = (ch) => ch.bones.head.getWorldPosition(V3());
    const kh = head(this.kai), sh = head(this.sera);
    this.kaiAnim.lookTarget = sh; this.seraAnim.lookTarget = kh;
    this.kaiAnim.update(dt); this.seraAnim.update(dt);
    const cam = this.camera;
    const mid = kh.clone().lerp(sh, 0.5);
    if (r.shot === 0) { cam.position.copy(this.ship.localToWorld(V3(4.9, 13.45, -54.9))); cam.lookAt(sh); cam.fov = 38; }
    else if (r.shot === 1) { cam.position.copy(this.ship.localToWorld(r.speaker === 'kai' ? V3(0.2, 13.25, -56.5) : V3(3.9, 13.3, -55.2))); cam.lookAt(r.speaker === 'kai' ? kh : sh); cam.fov = 32; }
    else { cam.position.copy(this.ship.localToWorld(V3(-6.2, 14.1, -52.3))); cam.lookAt(mid); cam.fov = 52; } // inside the lab: screens, racks and the cradle in frame
    cam.updateProjectionMatrix();
    this.lab.emergency.intensity = Math.sin(t * 6) > 0 ? 6 : 0;
    this.spray.update(dt);
  }

  // Sera follows during the escape; reaching the door transitions to the hotel
  updateEscapeFollower(dt) {
    const f = this.onFoot, s = this.sera;
    const goal = f.pos.clone().add(V3(Math.sin(f.yaw + Math.PI) * 1.6, 0, Math.cos(f.yaw + Math.PI) * 1.6));
    const to = goal.sub(s.position); to.y = 0;
    const d = to.length(), sp = d > 0.4 ? Math.min(5, d * 2.2) : 0;
    if (d > 0.01) { s.position.addScaledVector(to.normalize(), sp * dt); s.rotation.y = Math.atan2(to.x, to.z); }
    s.position.y = 11.6;
    this.seraAnim.mode = sp > 0.3 ? (sp > 3 ? 'run' : 'walk') : 'idle'; this.seraAnim.speed = sp;
    this.seraAnim.expression = 'fear';
    this.seraAnim.update(dt);
  }

  // (escape handled inside updateOnFoot via phase check)
  dispose() {
    this.disposed = true;
    for (const s of [this.engine, this.rainSnd, this.seaSnd, this.windSnd, this.hullSnd]) s?.stop();
    for (const p of this.patrols) p.dispose();
    this.game.renderer.grade.uniforms.uDamage.value = 0;
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.hud?.remove();
  }
}

// patch: escape phase logic piggybacks on the on-foot update
const _upd = Chapter2.prototype.updateOnFoot;
Chapter2.prototype.updateOnFoot = function (dt, t) {
  _upd.call(this, dt, t);
  if (this.phase !== 'escape' || this.rescueCine || this.leaving) return;
  this.escapeT += dt;
  this.updateEscapeFollower(dt);
  this.shipList = Math.min(0.26, this.shipList + dt * 0.006);
  const d = Math.hypot(this.onFoot.pos.x - this.exitDoor.x, this.onFoot.pos.z - this.exitDoor.z);
  this.game.ui.prompt(d < 3 ? '<kbd>E</kbd> Through the door' : null);
  if (this.escapeT > 4) this.line('esc1', [['SERA', 'Bridge deck door — forward! The lifeboats launch from inside!']]);
  if (d < 3 && (this.game.input.hit('KeyE') || d < 1.2)) this.leaveShip();
};
Chapter2.prototype.leaveShip = async function () {
  if (this.leaving) return;
  this.leaving = true;
  const g = this.game, ui = g.ui;
  ui.prompt(null); ui.objective(null);
  // the door slams; the storm cuts out mid-roar. Quiet.
  g.audio.metal({ base: 120, vol: 0.6, dur: 1.2 });
  ui.fadeColor('#000'); await ui.fade(1, 0.15);
  for (const s of [this.engine, this.rainSnd, this.seaSnd, this.windSnd, this.hullSnd]) s?.set?.(0, null, 0.05);
  g.music.stop(0.1);
  await wait(1800);
  g.nextChapter({ fromShip: true });
};
