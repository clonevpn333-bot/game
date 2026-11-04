// 3D backdrops for non-gameplay screens: the Tower at night (main menu), the Contestant
// Lounge (customization pedestal), and the Elevator (between-floor transitions).
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../vendor/three/addons/geometries/RoundedBoxGeometry.js';
import { lightConeMaterial, shaderClock, Mat } from '../engine/materials.js';
import { textTexture, logoTexture, velvetTextures } from '../engine/textures.js';
import { PlayerModel } from '../game/playerModel.js';

const rand = (a, b) => a + Math.random() * (b - a);

function windowsTexture(seed = 1, color = '#ffd27a') {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#05060a'; x.fillRect(0, 0, 128, 256);
  for (let r = 0; r < 32; r++) for (let k = 0; k < 8; k++) {
    if (Math.random() < 0.45) continue;
    const b = 0.3 + Math.random() * 0.7;
    x.fillStyle = Math.random() < 0.15 ? '#7df9ff' : color;
    x.globalAlpha = b;
    x.fillRect(k * 16 + 3, r * 8 + 2, 10, 4);
  }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class MenuScene {
  constructor(host) {
    const s = this.scene = new THREE.Scene();
    s.background = new THREE.Color('#05030c');
    s.fog = new THREE.FogExp2('#0a0618', 0.0045);
    this.camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.5, 2000);
    this.t = 0;
    s.add(new THREE.HemisphereLight('#4a2a8a', '#05030c', 0.6));
    const moon = new THREE.DirectionalLight('#8aa0ff', 0.8); moon.position.set(-100, 200, -60); s.add(moon);
    // city
    const winT = windowsTexture();
    winT.repeat.set(2, 3);
    const cityMat = new THREE.MeshStandardMaterial({ color: '#0b0d14', emissive: '#ffffff', emissiveMap: winT, emissiveIntensity: 0.9, roughness: 0.8, metalness: 0.2 });
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const N = 420;
    const city = new THREE.InstancedMesh(geo, cityMat, N);
    const m = new THREE.Matrix4();
    let i = 0;
    while (i < N) {
      const a = Math.random() * Math.PI * 2, r = rand(200, 700);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = rand(12, 80) * (1 - r / 1100) * (Math.random() < 0.1 ? 2 : 1);
      const w = rand(10, 26);
      m.compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, w * rand(0.7, 1.3)));
      city.setMatrixAt(i++, m);
    }
    s.add(city);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: '#06050a', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; s.add(ground);
    // THE TOWER
    const tower = this.tower = new THREE.Group();
    s.add(tower);
    const towerMat = new THREE.MeshStandardMaterial({ color: '#141824', metalness: 0.85, roughness: 0.35, emissive: '#ffffff', emissiveMap: windowsTexture(2, '#ff9ad0'), emissiveIntensity: 0.55 });
    towerMat.emissiveMap.repeat.set(2, 6);
    let y = 0;
    const floors = 11;
    for (let k = 0; k < floors; k++) {
      const w = 34 - k * 1.6, h = 22;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), towerMat);
      seg.position.y = y + h / 2;
      tower.add(seg);
      // glowing band between segments
      const band = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, 0.8, w + 1.2), new THREE.MeshStandardMaterial({ color: '#000', emissive: k % 3 === 0 ? '#ff2d6f' : k % 3 === 1 ? '#ffd400' : '#25f4ff', emissiveIntensity: 3 }));
      band.position.y = y + h; tower.add(band);
      y += h;
    }
    this.towerH = y;
    // giant screen with Halo
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ map: host.texture }));
    scr.position.set(0, 120, 31 - 6 * 1.6 / 2 + 0.6);
    scr.position.z = (34 - 5 * 1.6) / 2 + 0.2;
    scr.position.y = 5 * 22 + 11;
    tower.add(scr);
    // vertical FLOOR 99 sign
    const signTex = textTexture(['F', 'L', 'O', 'O', 'R', ' ', '9', '9'], { w: 128, h: 1024, color: '#ffffff', glow: '#ff2d6f', size: 112 });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 48), new THREE.MeshBasicMaterial({ map: signTex, transparent: true, color: '#ffccdd' }));
    sign.position.set(17.4, 70, 6); sign.rotation.y = Math.PI / 2;
    tower.add(sign);
    // crown + halo
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(6, 14, 18, 8), new THREE.MeshStandardMaterial({ color: '#1c1f2a', metalness: 0.9, roughness: 0.3 }));
    crown.position.y = y + 9; tower.add(crown);
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.2, 40, 6), new THREE.MeshStandardMaterial({ color: '#888', metalness: 1, roughness: 0.3 }));
    spire.position.y = y + 38; tower.add(spire);
    this.halo = new THREE.Mesh(new THREE.TorusGeometry(16, 1.1, 12, 64), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffd400', emissiveIntensity: 4 }));
    this.halo.position.y = y + 34; this.halo.rotation.x = Math.PI / 2; tower.add(this.halo);
    // logo disk on top face
    const logo = new THREE.Mesh(new THREE.CircleGeometry(12, 48), new THREE.MeshBasicMaterial({ map: logoTexture(), transparent: true }));
    logo.position.set(0, 60, 17.01); tower.add(logo);
    // searchlights
    this.beams = [];
    for (let k = 0; k < 6; k++) {
      const len = 260;
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(9, 0.6, len, 24, 1, true), lightConeMaterial(k % 2 ? '#ffd9f0' : '#bfefff', 0.22));
      cone.geometry.translate(0, len / 2, 0);
      const piv = new THREE.Group();
      piv.position.set(Math.cos(k / 6 * Math.PI * 2) * 60, 4, Math.sin(k / 6 * Math.PI * 2) * 60);
      piv.add(cone);
      s.add(piv);
      this.beams.push({ piv, ph: k * 1.3 });
    }
    // blimp
    const blimp = this.blimp = new THREE.Group();
    const bb = new THREE.Mesh(new THREE.SphereGeometry(8, 24, 16), new THREE.MeshStandardMaterial({ color: '#2a2a35', metalness: 0.5, roughness: 0.5 }));
    bb.scale.set(2.4, 1, 1); blimp.add(bb);
    const bs = new THREE.Mesh(new THREE.PlaneGeometry(22, 6), new THREE.MeshBasicMaterial({ map: textTexture('VOTE NOW!', { w: 512, h: 128, color: '#ffd400', bg: '#120018', glow: '#ff2d6f' }), side: THREE.DoubleSide }));
    bs.position.z = 8.05; blimp.add(bs);
    s.add(blimp);
    this.stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 1500 }, () => [rand(-1000, 1000), rand(200, 900), rand(-1000, 1000)]).flat(), 3)), new THREE.PointsMaterial({ color: '#ffffff', size: 1.4, sizeAttenuation: false }));
    s.add(this.stars);
  }
  update(dt) {
    this.t += dt;
    const t = this.t;
    const r = 175;
    const a = t * 0.04 + 0.6;
    this.camera.position.set(Math.cos(a) * r, 30 + Math.sin(t * 0.07) * 14, Math.sin(a) * r);
    // frame the tower on the right third, looking up at the crown
    const right = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const look = new THREE.Vector3(0, 120 + Math.sin(t * 0.05) * 25, 0).addScaledVector(right, 34);
    this.camera.lookAt(look);
    this.halo.rotation.z += dt * 0.4;
    this.halo.position.y = this.towerH + 34 + Math.sin(t) * 1.5;
    for (const b of this.beams) { b.piv.rotation.z = Math.sin(t * 0.3 + b.ph) * 0.35; b.piv.rotation.x = Math.cos(t * 0.23 + b.ph) * 0.3; }
    this.blimp.position.set(Math.cos(t * 0.04) * 110, 170, Math.sin(t * 0.04) * 110);
    this.blimp.rotation.y = -t * 0.04;
    shaderClock.value += dt;
  }
}

export class LoungeScene {
  constructor(host, look) {
    const s = this.scene = new THREE.Scene();
    s.background = new THREE.Color('#12040e');
    s.fog = new THREE.Fog('#12040e', 18, 40);
    this.camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
    this.t = 0;
    s.add(new THREE.HemisphereLight('#ffb0d8', '#200818', 0.7));
    const vel = velvetTextures('#4a0c24');
    const wallMat = new THREE.MeshStandardMaterial({ map: vel.map, roughness: 0.9 });
    vel.map.repeat.set(6, 2);
    const floorMat = new THREE.MeshStandardMaterial({ color: '#1a0a12', metalness: 0.6, roughness: 0.15 });
    const gold = new THREE.MeshStandardMaterial({ color: '#d4a640', metalness: 1, roughness: 0.25 });
    const room = new THREE.Mesh(new THREE.BoxGeometry(24, 9, 18), [wallMat, wallMat, wallMat, floorMat, wallMat, wallMat]);
    room.material = [wallMat, wallMat, new THREE.MeshStandardMaterial({ color: '#0d0308' }), floorMat, wallMat, wallMat];
    room.geometry.scale(-1, 1, 1);
    room.position.y = 4.5;
    s.add(room);
    // floor checker inlay
    const inlay = new THREE.Mesh(new THREE.CircleGeometry(4, 48), new THREE.MeshStandardMaterial({ color: '#ffd400', metalness: 1, roughness: 0.2, emissive: '#5a3a00', emissiveIntensity: 0.3 }));
    inlay.rotation.x = -Math.PI / 2; inlay.position.set(2, 0.01, 0); s.add(inlay);
    // pedestal
    this.ped = new THREE.Group();
    this.ped.position.set(2.5, 0, 0);
    s.add(this.ped);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.5, 40), new THREE.MeshStandardMaterial({ color: '#16161c', metalness: 0.8, roughness: 0.3 }));
    ped.position.y = 0.25; this.ped.add(ped);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.04, 8, 64), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff2d6f', emissiveIntensity: 3 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.5; this.ped.add(ring);
    this.model = new PlayerModel(look);
    this.model.root.position.y = 0.5;
    this.ped.add(this.model.root);
    // neon sign
    const neon = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), new THREE.MeshBasicMaterial({ map: textTexture(['CONTESTANT LOUNGE'], { w: 1024, h: 256, color: '#ffe6f2', glow: '#ff2d6f', size: 120 }), transparent: true }));
    neon.position.set(-4, 5.4, -8.9); neon.scale.setScalar(0.7); s.add(neon);
    // halo screen
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ map: host.texture }));
    scr.position.set(9, 4, -8.9); s.add(scr);
    const frame = new THREE.Mesh(new RoundedBoxGeometry(5.6, 5.6, 0.3, 3, 0.1), gold); frame.position.set(9, 4, -9.1); s.add(frame);
    // couch
    const couchMat = new THREE.MeshStandardMaterial({ color: '#c41e5a', roughness: 0.7 });
    const couch = new THREE.Group();
    const base = new THREE.Mesh(new RoundedBoxGeometry(5, 0.8, 1.6, 3, 0.25), couchMat); base.position.y = 0.6; couch.add(base);
    const back = new THREE.Mesh(new RoundedBoxGeometry(5, 1.4, 0.5, 3, 0.25), couchMat); back.position.set(0, 1.3, -0.6); couch.add(back);
    for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new RoundedBoxGeometry(0.5, 1.1, 1.6, 3, 0.2), couchMat); arm.position.set(sx * 2.5, 0.9, 0); couch.add(arm); }
    couch.position.set(-6, 0, -6.5); s.add(couch);
    // elevator doors (right wall)
    const doors = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, 4), new THREE.MeshStandardMaterial({ color: '#c9a03a', metalness: 1, roughness: 0.25 }));
    doors.position.set(11.9, 2.5, 3); s.add(doors);
    const arrow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({ map: textTexture('▲ 99', { w: 256, h: 128, color: '#ff2d6f', bg: '#000' }) }));
    arrow.position.set(11.75, 5.6, 3); arrow.rotation.y = -Math.PI / 2; s.add(arrow);
    // disco ball
    this.disco = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 2), new THREE.MeshStandardMaterial({ color: '#ddd', metalness: 1, roughness: 0.05, flatShading: true }));
    this.disco.position.set(-2, 7.5, 0); s.add(this.disco);
    // lights
    const key = new THREE.SpotLight('#ffffff', 70, 30, 0.5, 0.5, 1.5); key.position.set(-2, 9, 6); key.target = this.ped; s.add(key);
    const rim = new THREE.SpotLight('#ff2d6f', 50, 30, 0.6, 0.5, 1.5); rim.position.set(7, 7, -6); rim.target = this.ped; s.add(rim);
    const fill = new THREE.PointLight('#25f4ff', 30, 20); fill.position.set(-6, 3, 4); s.add(fill);
    this.lamp = new THREE.PointLight('#ffd400', 20, 14); this.lamp.position.set(-6, 3, -5); s.add(this.lamp);
    // plants
    for (const [x, z] of [[-10, -7], [10.5, -7]]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.4, 0.9, 16), gold); pot.position.set(x, 0.45, z); s.add(pot);
      for (let i = 0; i < 7; i++) { const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.8, 4), new THREE.MeshStandardMaterial({ color: '#1f8a4a', roughness: 0.6 })); leaf.position.set(x + rand(-0.3, 0.3), 1.6, z + rand(-0.3, 0.3)); leaf.rotation.set(rand(-0.6, 0.6), 0, rand(-0.6, 0.6)); s.add(leaf); }
    }
    this.spin = 0;
  }
  setLook(look) { this.model.applyLook(look); }
  update(dt) {
    this.t += dt;
    this.camera.position.set(-1.8, 2.3, 7.2);
    this.camera.lookAt(0.6, 1.4, 0);
    this.ped.rotation.y += dt * 0.5 + this.spin;
    this.spin *= 0.9;
    this.disco.rotation.y += dt;
    this.model.animate(dt, { speed: 0, grounded: true, vy: 0, mode: 'normal', aiming: false, weaponHand: false });
    this.lamp.intensity = 18 + Math.sin(this.t * 2) * 4;
  }
}

export class ElevatorScene {
  constructor(host) {
    const s = this.scene = new THREE.Scene();
    s.background = new THREE.Color('#000');
    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 50);
    this.t = 0;
    s.add(new THREE.HemisphereLight('#ffe0c0', '#201010', 0.5));
    const wall = Mat.panel('#3a3530', 1);
    const box = new THREE.Mesh(new THREE.BoxGeometry(4, 3.2, 4), wall);
    box.geometry.scale(-1, 1, 1);
    box.position.y = 1.6; s.add(box);
    const gold = new THREE.MeshStandardMaterial({ color: '#c9a03a', metalness: 1, roughness: 0.3 });
    this.doorL = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.6, 0.1), gold); this.doorR = this.doorL.clone();
    this.doorL.position.set(-0.5, 1.3, -1.95); this.doorR.position.set(0.5, 1.3, -1.95);
    s.add(this.doorL, this.doorR);
    // behind doors: light burst
    this.outside = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.8), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    this.outside.position.set(0, 1.3, -2.05); s.add(this.outside);
    // floor indicator
    this.indC = document.createElement('canvas'); this.indC.width = 256; this.indC.height = 96;
    this.indT = new THREE.CanvasTexture(this.indC); this.indT.colorSpace = THREE.SRGBColorSpace;
    const ind = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.45), new THREE.MeshBasicMaterial({ map: this.indT }));
    ind.position.set(0, 2.85, -1.94); s.add(ind);
    // halo ad screen
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: host.texture }));
    scr.position.set(1.98, 1.7, 0); scr.rotation.y = -Math.PI / 2; s.add(scr);
    const ad = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshBasicMaterial({ map: textTexture(['HALO BRAND', 'DUSTPANS'], { w: 512, h: 320, color: '#ffd400', bg: '#2a0018', glow: '#ff2d6f' }) }));
    ad.position.set(-1.98, 1.7, 0); ad.rotation.y = Math.PI / 2; s.add(ad);
    this.light = new THREE.PointLight('#ffe0c0', 26, 12, 1.2); this.light.position.set(0, 2.9, 0.4); s.add(this.light);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 2.6), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#fff0d8', emissiveIntensity: 1.6 }));
    strip.position.set(0, 3.17, 0); s.add(strip);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 3.4), new THREE.MeshStandardMaterial({ color: '#c9a03a', metalness: 1, roughness: 0.25 }));
    for (const x of [-1.9, 1.9]) { const r = rail.clone(); r.position.set(x, 1.0, 0); s.add(r); }
    this.floorFrom = 0; this.floorTo = 1; this.progress = 0; this.open = 0;
  }
  setRide(from, to) { this.floorFrom = from; this.floorTo = to; this.progress = 0; this.open = 0; this.t = 0; }
  update(dt) {
    this.t += dt;
    const shake = this.progress < 1 ? 0.012 : 0;
    this.camera.position.set(0.9 + Math.sin(this.t * 31) * shake, 1.65 + Math.sin(this.t * 23) * shake, 1.4);
    this.camera.lookAt(-0.2, 1.5, -2);
    this.light.intensity = 26 + (Math.random() < 0.03 ? -18 : 0);
    const f = Math.round(this.floorFrom + (this.floorTo - this.floorFrom) * Math.min(1, this.progress));
    const c = this.indC.getContext('2d');
    c.fillStyle = '#100'; c.fillRect(0, 0, 256, 96);
    c.font = '72px Anton, Impact, sans-serif'; c.fillStyle = '#ff3a3a'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = '#ff0000'; c.shadowBlur = 16;
    c.fillText('▲ ' + String(f).padStart(2, '0'), 128, 52);
    this.indT.needsUpdate = true;
    this.doorL.position.x = -0.5 - this.open * 0.95;
    this.doorR.position.x = 0.5 + this.open * 0.95;
  }
}
