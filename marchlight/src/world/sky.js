// Sky, sun, atmosphere, environment lighting and interior light zones.
import * as THREE from 'three';
import { Sky as SkyMesh } from 'three/addons/objects/Sky.js';
import { clamp, damp, lerp } from '../core/util.js';

export class Sky {
  constructor(game, { elevation = 14, azimuth = 112 } = {}) {
    this.game = game;
    const e = game.engine, scene = e.scene;
    this.sky = new SkyMesh(); this.sky.scale.setScalar(30000);
    this.sky.material.depthWrite = false;
    this.skyGain = { value: 0.5 };
    this.sky.material.uniforms.uSkyGain = this.skyGain;
    // with a reversed depth buffer the far plane is z = 0, not z = w
    if (e.reversedDepth) this.sky.material.vertexShader = this.sky.material.vertexShader.replace('gl_Position.z = gl_Position.w;', 'gl_Position.z = 0.0;');
    this.sky.material.fragmentShader = this.sky.material.fragmentShader.replace('uniform vec3 up;', 'uniform vec3 up;\nuniform float uSkyGain;').replace('gl_FragColor = vec4( retColor, 1.0 );', 'gl_FragColor = vec4( retColor * uSkyGain, 1.0 );');
    scene.add(this.sky);
    const u = this.sky.material.uniforms;
    u.turbidity.value = 6.5; u.rayleigh.value = 1.6; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.86;
    this.sunDir = new THREE.Vector3();
    this.sun = new THREE.DirectionalLight(0xffdcb0, 3.4);
    this.sun.castShadow = true;
    const q = e.quality.shadowSize || 2048;
    this.sun.shadow.mapSize.set(q, q);
    this.shadowR = 42;
    Object.assign(this.sun.shadow.camera, { left: -this.shadowR, right: this.shadowR, top: this.shadowR, bottom: -this.shadowR, near: 1, far: 400 });
    this.sun.shadow.bias = -0.00035; this.sun.shadow.normalBias = 0.035;
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbcd4ec, 0x7a6450, 0.85); scene.add(this.hemi);
    this.fogColor = new THREE.Color(0xb9c7d2);
    scene.fog = new THREE.FogExp2(this.fogColor.getHex(), 0.00018);
    this.interior = 0; this.interiorTarget = 0; this.zones = [];
    this.setSun(elevation, azimuth);
    this.buildEnv();
  }
  setSun(elev, azim) {
    this.elev = elev; this.azim = azim;
    const phi = THREE.MathUtils.degToRad(90 - elev), theta = THREE.MathUtils.degToRad(azim);
    this.sunDir.setFromSphericalCoords(1, phi, theta);
    this.sky.material.uniforms.sunPosition.value.copy(this.sunDir);
    // warm low sun
    const warm = clamp(1 - elev / 40, 0, 1);
    this.sun.color.setRGB(1, lerp(0.92, 0.78, warm), lerp(0.85, 0.6, warm));
    this.fogColor.setRGB(lerp(0.72, 0.8, warm), lerp(0.78, 0.76, warm), lerp(0.84, 0.74, warm));
    this.game.engine.scene.fog.color.copy(this.fogColor);
  }
  buildEnv() {
    const r = this.game.engine.renderer;
    const pm = new THREE.PMREMGenerator(r);
    const envScene = new THREE.Scene();
    const s2 = new SkyMesh(); s2.scale.setScalar(1000);
    for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) s2.material.uniforms[k].value = this.sky.material.uniforms[k].value;
    s2.material.uniforms.sunPosition.value.copy(this.sunDir);
    envScene.add(s2);
    // a dim ground hemisphere so reflections below the horizon aren't sky-bright
    const g = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16, 0, Math.PI * 2, Math.PI / 2 + 0.02, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3a3632, side: THREE.BackSide }));
    envScene.add(g);
    const rt = pm.fromScene(envScene, 0.02);
    this.game.engine.scene.environment = rt.texture;
    this.game.engine.scene.environmentIntensity = 0.55;
    pm.dispose();
  }
  // interior zones: [{ min: Vector3, max: Vector3, level: 0..1 }] — darken hemi/env indoors
  addZone(min, max, level = 1, name = '') { this.zones.push({ box: new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max)), level, name }); }
  zoneAt(p) { for (const z of this.zones) if (z.box.containsPoint(p)) return z; return null; }
  update(dt) {
    const g = this.game, p = g.player;
    // shadow camera follows the player (texel-snapped to avoid shimmer)
    const c = g.director.active ? g.engine.camera.position : p.pos;
    const focus = c.clone();
    const ts = (this.shadowR * 2) / this.sun.shadow.mapSize.x;
    const L = new THREE.Matrix4().lookAt(new THREE.Vector3(), this.sunDir.clone().negate(), new THREE.Vector3(0, 1, 0));
    const inv = L.clone().invert();
    const fl = focus.clone().applyMatrix4(inv); fl.x = Math.round(fl.x / ts) * ts; fl.y = Math.round(fl.y / ts) * ts; focus.copy(fl.applyMatrix4(L));
    this.sun.position.copy(focus).addScaledVector(this.sunDir, 200);
    this.sun.target.position.copy(focus); this.sun.target.updateMatrixWorld();
    // interior blending
    const camZone = this.zoneAt(g.engine.camera.position) || this.zoneAt(p.pos.clone().add(new THREE.Vector3(0, 1.5, 0)));
    this.interiorTarget = camZone ? camZone.level : 0;
    this.interior = damp(this.interior, this.interiorTarget, 2.5, dt);
    const k = this.interior;
    this.hemi.intensity = lerp(0.85, 0.4, k);
    g.engine.scene.environmentIntensity = lerp(0.55, 0.25, k);
    g.engine.renderer.toneMappingExposure = lerp(0.62, 1.0, k) * (this.exposureMul || 1);
  }
}
