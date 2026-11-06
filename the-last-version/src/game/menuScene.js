// Title-screen backdrop: shards of different realities (a slab of wet street,
// a wedge of ocean, hotel wallpaper, castle stone) drifting around a giant
// Anchor ring at dusk, slowly turning as if the world can't decide.
import * as THREE from 'three';
import { hdri, preloadSets, pbr } from '../engine/assets.js';
import { makeSky } from '../engine/sky.js';
import { Particles } from '../engine/fx.js';

export class MenuScene {
  constructor(game) { this.game = game; }

  async load() {
    const R = this.game.renderer;
    const scene = this.scene = new THREE.Scene();
    await preloadSets(['asphalt', 'brick_red', 'concrete_wall', 'metal_plate']);
    const env = await hdri(R, 'city_dusk');
    scene.environment = env.env; scene.environmentIntensity = 0.6;
    const sunDir = new THREE.Vector3(-0.5, 0.12, -0.85).normalize();
    this.sky = makeSky({ sunDir, top: 0x0c1428, mid: 0x7a3a3a, horizon: 0xe08a52, cloud: 0.5, cloudColor: 0x3a2638 });
    this.sky.userData.u.uRewrite.value = 0.35;
    scene.add(this.sky);
    scene.fog = new THREE.FogExp2(0x2a1e28, 0.006);
    const sun = new THREE.DirectionalLight(0xffb27a, 2.4); sun.position.copy(sunDir).multiplyScalar(100); scene.add(sun);
    scene.add(new THREE.HemisphereLight(0x6a7aa8, 0x201418, 0.5));

    this.shards = new THREE.Group(); scene.add(this.shards);
    const shard = (w, d, h, mat, topMat) => {
      // irregular slab: a box whose bottom is broken into a jagged wedge
      const g = new THREE.BoxGeometry(w, h, d, 6, 2, 6);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        if (p.getY(i) < 0) { const k = 1 - Math.hypot(p.getX(i) / w, p.getZ(i) / d) * 1.2; p.setY(i, p.getY(i) - Math.max(0, k) * h * (2 + Math.random() * 2)); p.setX(i, p.getX(i) * (0.8 + Math.random() * 0.25)); p.setZ(i, p.getZ(i) * (0.8 + Math.random() * 0.25)); }
      }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, [mat, mat, topMat, mat, mat, mat]);
      m.castShadow = m.receiveShadow = true;
      return m;
    };
    const rock = new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 0.95 });
    const wallpaper = this.wallpaperMat();
    const sea = new THREE.MeshPhysicalMaterial({ color: 0x0b2a36, roughness: 0.06, clearcoat: 1 });
    const defs = [
      [pbr('asphalt', { size: 6 }), 14, 9, [0, -2, 0]],
      [sea, 9, 7, [-16, 4, -8]],
      [wallpaper, 5, 5, [13, 6, -10]],
      [pbr('brick_red', { size: 2.5 }), 6, 4, [-10, 9, 10]],
      [pbr('concrete_wall', { size: 3 }), 4, 4, [9, -6, 12]],
      [pbr('metal_plate', { size: 2, metal: true }), 5, 3, [18, -1, 4]],
    ];
    this.items = defs.map(([top, w, d, pos], i) => {
      const s = shard(w, d, 1.2, rock, top);
      s.position.set(...pos); s.rotation.set((Math.random() - 0.5) * 0.3, Math.random() * 6, (Math.random() - 0.5) * 0.3);
      this.shards.add(s);
      return { s, base: s.position.clone(), ph: Math.random() * 6, spin: (Math.random() - 0.5) * 0.05 };
    });
    // a street lamp on the asphalt shard, still lit
    const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 6, 8), new THREE.MeshStandardMaterial({ color: 0x22262a, metalness: 0.7, roughness: 0.5 }));
    lampPole.position.set(3, 1, 1); this.items[0].s.add(lampPole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshStandardMaterial({ emissive: 0xffc98a, emissiveIntensity: 8, color: 0 }));
    bulb.position.set(3, 4, 1); this.items[0].s.add(bulb);
    const pl = new THREE.PointLight(0xffb070, 40, 18, 2); pl.position.set(3, 3.8, 1); this.items[0].s.add(pl);
    // the Anchor ring
    const ring = new THREE.Group();
    const glow = new THREE.MeshStandardMaterial({ color: 0x0a2a30, emissive: 0x4fe3ff, emissiveIntensity: 3 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x6d7378, metalness: 1, roughness: 0.35 });
    ring.add(new THREE.Mesh(new THREE.TorusGeometry(22, 0.25, 8, 160), glow));
    for (let i = 0; i < 24; i++) { const seg = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.5), steel); const a = (i / 24) * Math.PI * 2; seg.position.set(Math.cos(a) * 22, Math.sin(a) * 22, 0); seg.rotation.z = a; ring.add(seg); }
    ring.rotation.x = Math.PI / 2.3; ring.position.y = 2; scene.add(ring);
    this.ring = ring;
    this.dust = new Particles(scene, { max: 400, additive: true, texture: 'dot' });
    this.camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 4000);
    R.set(scene, this.camera);
    R.setGrade({ exposure: 1.05, bloom: [0.9, 0.6, 0.75], saturation: 1.05, contrast: 1.08, vignette: 0.55, lift: [0.02, 0.0, 0.04] });
    this.t = 0;
  }

  wallpaperMat() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#5a3a32'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(220,180,120,0.5)'; g.lineWidth = 3;
    for (let y = 0; y < 256; y += 64) for (let x = 0; x < 256; x += 64) { g.beginPath(); g.ellipse(x + 32, y + 32, 14, 24, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(x + 32, y + 4); g.lineTo(x + 32, y + 60); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 });
  }

  update(dt, t) {
    this.t += dt;
    const k = this.t;
    for (const it of this.items) {
      it.s.position.y = it.base.y + Math.sin(k * 0.4 + it.ph) * 0.6;
      it.s.rotation.y += it.spin * dt;
    }
    this.ring.rotation.z += dt * 0.03;
    const a = k * 0.035;
    this.camera.position.set(Math.sin(a) * 38, 8 + Math.sin(k * 0.1) * 2, Math.cos(a) * 38);
    this.camera.lookAt(0, 2, 0);
    if (Math.random() < 0.6) this.dust.emit(new THREE.Vector3((Math.random() - 0.5) * 60, -10, (Math.random() - 0.5) * 60), new THREE.Vector3(0, 1 + Math.random(), 0), { life: 12, size: 0.15, grow: 0, color: [0.5, 0.85, 1], alpha: 0.7, drag: 0 });
    this.dust.update(dt);
    this.sky.userData.u.uTime.value = t;
    // occasional reality flicker on the title
    const g = this.game.renderer.grade.uniforms;
    g.uRewrite.value = (Math.sin(k * 0.7) > 0.995) ? 0.25 : 0;
  }

  dispose() {
    this.dust.dispose();
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
}
