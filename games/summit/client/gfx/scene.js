/* Renderer, camera, sky, clouds and the post chain, wired together. */
import * as THREE from '../../../../vendor/three/three.module.js';
import { Sky } from './sky.js';
import { Clouds } from './clouds.js';
import { Post } from './post.js';
import { updateAtmosphere, ATMO } from './materials.js';
import { BIOMES, biomeIndexAt } from '../../shared/constants.js';

export class Stage {
  constructor(canvas, quality = 'high') {
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: quality !== 'low', powerPreference: 'high-performance', stencil: false,
    });
    this.renderer.setClearColor(0x0a0d12, 1);
    this.renderer.toneMapping = THREE.NoToneMapping;   // the composite pass tone maps in HDR
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = quality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x9fb4cc, 0.00001); // presence enables our own fog code
    this.camera = new THREE.PerspectiveCamera(66, 1, 0.12, 12000);
    this.scene.add(this.camera);

    this.sky = new Sky(this.scene);
    this.clouds = new Clouds(this.scene, 7);
    this.post = new Post(this.renderer, 2, 2);
    this.setQuality(quality);

    this.time = 0;
    this.dayT = 0.30;
    this.cloudInside = 0;
    this._v = new THREE.Vector3();
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  setQuality(q) {
    this.quality = q;
    const dpr = Math.min(devicePixelRatio || 1, q === 'high' ? 2 : q === 'medium' ? 1.5 : 1);
    this.renderer.setPixelRatio(dpr);
    this.post.enabled = q !== 'low';
    this.post.quality = q === 'high' ? 1 : q === 'medium' ? 0.8 : 0.65;
    this.renderer.shadowMap.enabled = q !== 'low';
    this.sky.sun.shadow.mapSize.set(q === 'high' ? 2048 : 1024, q === 'high' ? 2048 : 1024);
    if (this.sky.sun.shadow.map) { this.sky.sun.shadow.map.dispose(); this.sky.sun.shadow.map = null; }
    this.resize();
  }

  resize() {
    const w = this.renderer.domElement.clientWidth || innerWidth;
    const h = this.renderer.domElement.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.post.setSize(w, h);
  }

  /** Sun position in normalised screen space, or null when it is behind us. */
  sunScreen() {
    const v = this._v.copy(this.sky.sunDir).multiplyScalar(4000).add(this.camera.position);
    v.project(this.camera);
    if (v.z > 1) return null;
    const forward = this.camera.getWorldDirection(new THREE.Vector3());
    if (forward.dot(this.sky.sunDir) < -0.1) return null;
    return { x: v.x * 0.5 + 0.5, y: v.y * 0.5 + 0.5 };
  }

  /** @param dayT 0..1 day cycle position; @param focus world position to light around */
  update(dt, focus, dayT) {
    this.time += dt;
    if (dayT !== undefined) this.dayT = dayT;
    this.sky.setTime(this.dayT);
    this.sky.follow(focus, this.camera.getWorldPosition(this._v));
    this.cloudInside = this.clouds.update(dt, focus.y, this.sky);

    const biome = BIOMES[biomeIndexAt(focus.y)];
    const inCloud = this.cloudInside;
    updateAtmosphere({
      fogColor: this.sky.fogColor,
      density: biome.fog * 0.55 * (1 + inCloud * 9) + inCloud * 0.0030,
      height: 60 + focus.y * 0.25,
      falloff: 0.0011,
      sunDir: this.sky.sunDir,
      sunColor: this.sky.sunColor,
      time: this.time,
    });
    this.post.mComposite.uniforms.uExposure.value = 1.0 - inCloud * 0.18;
  }

  render() {
    this.post.render(this.scene, this.camera, this.sunScreen(), this.time, this.sky.sunColor);
  }

  add(...o) { this.scene.add(...o); }
  remove(...o) { this.scene.remove(...o); }
}
