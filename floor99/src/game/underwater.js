// Underwater atmosphere: drifting motes, breath bubbles, surface wake rings, fog tint and a
// water-on-lens overlay when surfacing. Created lazily, only on floors with water.
import * as THREE from 'three';
import { BUILD } from '../build.js';

export class UnderwaterAtmosphere {
  constructor(game) {
    this.game = game; this.time = 0; this.breath = 0; this.wake = 0; this.lastUnder = false; this.lens = 0;
    this.count = BUILD.fast ? 28 : 60;
    this.positions = new Float32Array(this.count * 3);
    for (let i = 0; i < this.positions.length; i++) this.positions[i] = (Math.random() - 0.5) * 12;
    this.geometry = new THREE.BufferGeometry();
    this.position = new THREE.Float32BufferAttribute(this.positions, 3);
    this.position.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.position);
    this.material = new THREE.ShaderMaterial({
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: {},
      vertexShader: 'varying float fade;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);fade=smoothstep(.7,2.0,-mv.z);gl_PointSize=clamp(18.0/max(1.0,-mv.z),1.0,4.0);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'varying float fade;void main(){float d=length(gl_PointCoord-.5);float a=(1.0-smoothstep(.12,.5,d))*.18*fade;gl_FragColor=vec4(.3,.7,.8,a);}',
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.visible = false; this.points.frustumCulled = false;
    game.scene.add(this.points);
    this.fogColor = game.scene.fog?.color.clone();
    this.waterColor = new THREE.Color('#0b4558');
    this.overlay = document.getElementById('waterLens');
    if (!this.overlay) { this.overlay = document.createElement('div'); this.overlay.id = 'waterLens'; document.getElementById('app').appendChild(this.overlay); }
  }
  update(dt) {
    const game = this.game, p = game.player, under = p.underwater;
    this.time += dt; this.points.visible = under;
    if (game.scene.fog && this.fogColor) {
      game.scene.fog.color.lerp(under ? this.waterColor : this.fogColor, 1 - Math.exp(-dt * 4));
      game.scene.fog.density = under ? 0.038 : (game.floor.fogDensity ?? 0.012);
    }
    if (under) {
      const cam = game.camera.position, centers = [cam.x, cam.y, cam.z];
      for (let i = 0; i < this.count; i++) {
        const n = i * 3; this.positions[n + 1] += dt * 0.035;
        for (let axis = 0; axis < 3; axis++) { const c = centers[axis], d = this.positions[n + axis] - c; this.positions[n + axis] = c + ((d + 6) % 12 + 12) % 12 - 6; }
      }
      this.position.needsUpdate = true;
      this.breath -= dt;
      if (this.breath <= 0) { this.breath = 1.9 + Math.random() * 0.5; game.fx.bubbles(p.pos.clone().setY(p.pos.y + 1.6), BUILD.fast ? 2 : 4); }
    }
    const speed = Math.hypot(p.vel.x, p.vel.z), level = game.waterLevelAt(p.pos.x, p.pos.z);
    this.wake -= dt;
    if (p.mode === 'swim' && speed > 1.2 && this.wake <= 0 && Math.abs(p.pos.y + 1.4 - level) < 0.65) {
      this.wake = BUILD.fast ? 0.3 : 0.18;
      game.fx.ring(p.pos.clone().setY(level + 0.025), 0.12, 0.65, 0.55, 0xabe3f6);
    }
    if (this.lastUnder && !under) this.lens = 1;
    this.lastUnder = under;
    this.lens = Math.max(0, this.lens - dt * 0.65);
    this.overlay.style.opacity = this.lens * 0.35;
  }
  dispose() { this.geometry.dispose(); this.material.dispose(); this.points.removeFromParent(); this.overlay.style.opacity = 0; }
}
