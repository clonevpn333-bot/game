// Particles (fire, smoke, water spray, sparks, dust), weather precipitation,
// dynamic lights near the camera, selection/objective markers.
import * as THREE from 'three';
import { clamp, lerp } from '../core/math.js';

const PART_VS = `
attribute vec3 iPos; attribute vec4 iCol; attribute float iSize; attribute float iRot;
varying vec4 vCol; varying vec2 vUv;
void main(){
  vCol = iCol; vUv = uv;
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
  float c = cos(iRot), s = sin(iRot);
  vec2 p = vec2(position.x * c - position.y * s, position.x * s + position.y * c);
  mv.xy += p * iSize;
  gl_Position = projectionMatrix * mv;
}`;
const PART_FS = `
uniform sampler2D map; varying vec4 vCol; varying vec2 vUv;
void main(){ vec4 t = texture2D(map, vUv); gl_FragColor = vec4(vCol.rgb, vCol.a * t.a); if (gl_FragColor.a < 0.003) discard; }`;

class Particles {
  constructor(scene, max, blending, tex) {
    this.max = max;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.size = new Float32Array(max); this.rot = new Float32Array(max);
    this.aPos = new THREE.InstancedBufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.InstancedBufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.InstancedBufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    this.aRot = new THREE.InstancedBufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.aPos); g.setAttribute('iCol', this.aCol); g.setAttribute('iSize', this.aSize); g.setAttribute('iRot', this.aRot);
    g.instanceCount = 0;
    this.mat = new THREE.ShaderMaterial({ vertexShader: PART_VS, fragmentShader: PART_FS, uniforms: { map: { value: tex } }, transparent: true, depthWrite: false, blending });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    scene.add(this.mesh);
    this.g = g;
    this.p = []; // {x,y,z,vx,vy,vz,life,max,s0,s1,c0:[r,g,b,a],c1,rot,vr,drag,grav}
  }
  emit(o) { if (this.p.length < this.max) this.p.push(o); }
  update(dt, camPos) {
    const P = this.p;
    let n = 0;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.life += dt;
      if (p.life >= p.max) { P[i] = P[P.length - 1]; P.pop(); continue; }
      p.vy += (p.grav || 0) * dt;
      const dr = Math.exp(-(p.drag || 0) * dt);
      p.vx *= dr; p.vy *= dr; p.vz *= dr;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.floor != null && p.y < p.floor) { p.y = p.floor; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
      p.rot += (p.vr || 0) * dt;
    }
    // sort-free: draw in order
    for (let i = 0; i < P.length && n < this.max; i++) {
      const p = P[i];
      const t = p.life / p.max;
      this.pos[n * 3] = p.x; this.pos[n * 3 + 1] = p.y; this.pos[n * 3 + 2] = p.z;
      const c0 = p.c0, c1 = p.c1 || p.c0;
      this.col[n * 4] = lerp(c0[0], c1[0], t); this.col[n * 4 + 1] = lerp(c0[1], c1[1], t); this.col[n * 4 + 2] = lerp(c0[2], c1[2], t);
      const fadeIn = clamp(t * 6, 0, 1);
      this.col[n * 4 + 3] = lerp(c0[3], c1[3], t) * fadeIn;
      this.size[n] = lerp(p.s0, p.s1, t);
      this.rot[n] = p.rot;
      n++;
    }
    this.g.instanceCount = n;
    this.aPos.needsUpdate = true; this.aCol.needsUpdate = true; this.aSize.needsUpdate = true; this.aRot.needsUpdate = true;
  }
}

function softTex(hard = 0.0) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(hard || 0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
function smokeTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  for (let i = 0; i < 9; i++) {
    const x = 20 + Math.random() * 24, y = 20 + Math.random() * 24, r = 10 + Math.random() * 14;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(c);
}

const PRECIP_VS = `
uniform float uTime; uniform vec3 uCam; uniform float uSpeed; uniform float uSnow; uniform float uWind;
attribute vec3 seed;
varying float vA;
void main(){
  vec3 p = seed * vec3(60.0, 40.0, 60.0);
  float fall = uTime * uSpeed * (0.8 + fract(seed.x * 13.7) * 0.4);
  p.y = mod(p.y - fall, 40.0) - 12.0;
  p.x += sin(uTime * 1.3 + seed.z * 40.0) * uSnow * 0.8 + uWind * (p.y);
  p.x = mod(p.x - uCam.x + 30.0, 60.0) - 30.0 + uCam.x;
  p.z = mod(p.z - uCam.z + 30.0, 60.0) - 30.0 + uCam.z;
  p.y += uCam.y;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float stretch = mix(0.55, 0.07, uSnow);
  mv.xy += position.xy * vec2(mix(0.01, 0.06, uSnow), stretch);
  vA = mix(0.16, 0.85, uSnow) * clamp(1.0 - (-mv.z - 10.0) / 40.0, 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
}`;
const PRECIP_FS = `varying float vA; uniform float uAmount; uniform float uNight;
void main(){ gl_FragColor = vec4(vec3(0.8, 0.85, 0.9) * mix(1.0, 0.35, uNight), vA * uAmount); }`;

// A tiny pool of real lights shared by everything that wants one (fires, sirens,
// meteors, the player's headlights, the police helicopter searchlight). The light
// count stays constant so shaders never recompile.
export class LightPool {
  constructor(scene) {
    this.points = [new THREE.PointLight('#ffffff', 0, 40, 1.6), new THREE.PointLight('#ffffff', 0, 40, 1.6)];
    this.spot = new THREE.SpotLight('#ffffff', 0, 120, 0.5, 0.45, 1.3);
    for (const l of this.points) scene.add(l);
    scene.add(this.spot, this.spot.target);
    this.reqP = []; this.reqS = [];
  }
  point(x, y, z, color, intensity, range, priority) { this.reqP.push({ x, y, z, color, intensity, range, priority }); }
  spotlight(x, y, z, tx, ty, tz, color, intensity, angle, range, priority) { this.reqS.push({ x, y, z, tx, ty, tz, color, intensity, angle, range, priority }); }
  flush() {
    this.reqP.sort((a, b) => b.priority - a.priority);
    this.points.forEach((l, i) => {
      const r = this.reqP[i];
      if (!r) { l.intensity = 0; return; }
      l.position.set(r.x, r.y, r.z); l.color.set(r.color); l.intensity = r.intensity; l.distance = r.range;
    });
    this.reqS.sort((a, b) => b.priority - a.priority);
    const s = this.reqS[0];
    if (s) { this.spot.position.set(s.x, s.y, s.z); this.spot.target.position.set(s.tx, s.ty, s.tz); this.spot.color.set(s.color); this.spot.intensity = s.intensity; this.spot.angle = s.angle; this.spot.distance = s.range; }
    else this.spot.intensity = 0;
    this.reqP.length = 0; this.reqS.length = 0;
  }
}

export class FX {
  constructor(renderer, world) {
    this.R = renderer;
    this.world = world;
    const scene = renderer.scene;
    this.glow = new Particles(scene, 2500, THREE.AdditiveBlending, softTex(0.2));
    this.smoke = new Particles(scene, 2500, THREE.NormalBlending, smokeTex());
    this.water = new Particles(scene, 1500, THREE.NormalBlending, softTex(0.5));
    // precipitation
    const N = 6000;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const seeds = new Float32Array(N * 3);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    g.setAttribute('seed', new THREE.InstancedBufferAttribute(seeds, 3));
    g.instanceCount = N;
    this.precipU = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uSpeed: { value: 18 }, uSnow: { value: 0 }, uAmount: { value: 0 }, uWind: { value: 0 }, uNight: { value: 0 } };
    this.precip = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: PRECIP_VS, fragmentShader: PRECIP_FS, uniforms: this.precipU, transparent: true, depthWrite: false }));
    this.precip.frustumCulled = false;
    this.precip.renderOrder = 6;
    scene.add(this.precip);
    // selection ring + objective beacon
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.2, 2.6), transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
    this.ring.visible = false;
    this.ring.renderOrder = 7;
    scene.add(this.ring);
    this.hoverRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.05, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false }));
    this.hoverRing.visible = false;
    scene.add(this.hoverRing);
    this.beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.4, 60, 16, 1, true).translate(0, 30, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.0, 0.2), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    this.beacon.visible = false;
    scene.add(this.beacon);
    this.incidentMarkers = [];
    // dynamic lights (shared pool)
    this.lights = new LightPool(scene);
    this.t = 0;
    this.emitAcc = 0;
    world.on('impact', (e) => this.sparks(e.x, (e.v?.y || 0) + 0.7, e.z, e.power));
    world.on('splash', (e) => { for (let i = 0; i < 40; i++) this.water.emit({ x: e.x, y: -2.2, z: e.z, vx: (Math.random() - 0.5) * 6, vy: 4 + Math.random() * 6, vz: (Math.random() - 0.5) * 6, life: 0, max: 1.2, s0: 0.5, s1: 1.2, c0: [0.85, 0.92, 1, 0.7], c1: [0.85, 0.92, 1, 0], grav: -14, rot: 0 }); });
  }

  sparks(x, y, z, power = 6) {
    const n = Math.min(60, 8 + power * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * power * 0.8;
      this.glow.emit({ x, y, z, vx: Math.cos(a) * sp, vy: 1 + Math.random() * 5, vz: Math.sin(a) * sp, life: 0, max: 0.4 + Math.random() * 0.5, s0: 0.25, s1: 0.05, c0: [3, 2, 0.8, 1], c1: [2, 0.6, 0.1, 0], grav: -14, floor: 0.05, rot: 0 });
    }
    for (let i = 0; i < n / 3; i++) this.smoke.emit({ x, y, z, vx: (Math.random() - 0.5) * 3, vy: 0.5 + Math.random(), vz: (Math.random() - 0.5) * 3, life: 0, max: 1.5, s0: 1, s1: 3, c0: [0.5, 0.48, 0.45, 0.5], c1: [0.6, 0.6, 0.6, 0], rot: Math.random() * 6, vr: 0.5 });
  }

  update(dt, sel, hover, objective) {
    const W = this.world;
    const cam = this.R.camera;
    this.t += dt;
    const sdt = Math.min(dt, 0.05);
    const simRunning = W._speed > 0;
    // emitters
    this.emitAcc += sdt;
    const emitNow = this.emitAcc > 1 / 30;
    if (emitNow && simRunning) {
      const k = this.emitAcc; this.emitAcc = 0;
      const wind = W.weather.wind;
      const fires = [];
      for (const b of W.city.buildings) {
        if (b.fire <= 0.01) continue;
        const d = Math.hypot(b.x - cam.position.x, b.z - cam.position.z);
        fires.push({ b, d });
        if (d > 900) continue;
        const rate = b.fire * 26 * k * (d < 250 ? 1 : 0.35);
        const top = Math.min(b.h * W.buildingVisual(b).scaleY, b.h) + 0.5;
        for (let i = 0; i < rate; i++) {
          const fx = b.x0 + Math.random() * (b.x1 - b.x0), fz = b.z0 + Math.random() * (b.z1 - b.z0);
          const fy = Math.random() < 0.5 ? top : Math.random() * top;
          this.glow.emit({ x: fx, y: fy, z: fz, vx: wind * 2 + (Math.random() - 0.5), vy: 2.5 + Math.random() * 3, vz: (Math.random() - 0.5), life: 0, max: 0.8 + Math.random() * 0.6, s0: 2 + b.fire * 3, s1: 0.6, c0: [3.2, 1.3, 0.25, 0.9], c1: [1.6, 0.2, 0.02, 0], rot: Math.random() * 6, vr: 1 });
          if (Math.random() < 0.6) this.smoke.emit({ x: fx, y: top + 1, z: fz, vx: wind * 6 + (Math.random() - 0.5) * 2, vy: 3 + Math.random() * 3, vz: wind * 2 + (Math.random() - 0.5) * 2, life: 0, max: 6 + Math.random() * 4, s0: 3, s1: 14 + b.fire * 10, c0: [0.12, 0.1, 0.09, 0.75], c1: [0.35, 0.34, 0.33, 0], rot: Math.random() * 6, vr: 0.2, drag: 0.15 });
        }
      }
      fires.sort((a, b) => a.d - b.d);
      this.fireReq = fires.slice(0, 2).filter((f) => f.d < 500);
      // wreck smoke, stacks, hoses
      for (const v of W.traffic.vehicles) {
        if ((v.state === 'wreck' || v.damage > 0.6) && v.state !== 'repair' && v.state !== 'garage' && Math.random() < 0.5) {
          this.smoke.emit({ x: v.x, y: v.y + 1, z: v.z + Math.cos(v.h) * v.len * 0.35, vx: wind * 3, vy: 1.5, vz: 0, life: 0, max: 3, s0: 0.8, s1: 4, c0: [0.25, 0.25, 0.25, 0.5], c1: [0.5, 0.5, 0.5, 0], rot: Math.random() * 6, vr: 0.4 });
        }
      }
      for (const b of W.city.buildings) for (const p of b.parts) if (p.stack && Math.random() < 0.4 && b.state === 'ok' && W.power.zones.I.on) {
        this.smoke.emit({ x: p.x, y: p.y + p.h / 2 + 1, z: p.z, vx: wind * 5 + 0.5, vy: 2.2, vz: 0.3, life: 0, max: 9, s0: 2, s1: 12, c0: [0.8, 0.8, 0.8, 0.35], c1: [0.85, 0.85, 0.88, 0], rot: Math.random() * 6, vr: 0.1, drag: 0.05 });
      }
      for (const ped of W.peds.list) {
        if (ped.action !== 'hose' || !ped.hoseTarget) continue;
        const t = ped.hoseTarget;
        const dx = t.x - ped.x, dz = t.z - ped.z, L = Math.hypot(dx, dz) || 1;
        for (let i = 0; i < 4; i++) {
          const sp = 14 + Math.random() * 3;
          this.water.emit({ x: ped.x + dx / L * 0.8, y: 1.3, z: ped.z + dz / L * 0.8, vx: dx / L * sp + (Math.random() - 0.5), vy: 6 + Math.random() * 2 + t.y * 0.3, vz: dz / L * sp + (Math.random() - 0.5), life: 0, max: 1.4, s0: 0.25, s1: 1.4, c0: [0.8, 0.9, 1.0, 0.6], c1: [0.9, 0.95, 1.0, 0], grav: -9.8, rot: 0 });
        }
      }
    }
    this.glow.update(sdt);
    this.smoke.update(sdt);
    this.water.update(sdt);
    // precipitation
    const w = W.weather;
    const P = this.precipU;
    P.uTime.value = this.t;
    P.uCam.value.copy(cam.position);
    P.uAmount.value = clamp(w.precip * 1.2, 0, 1);
    P.uSnow.value = w.snowing ? 1 : 0;
    P.uSpeed.value = w.snowing ? 2.2 : 22;
    P.uWind.value = w.wind * (w.snowing ? 0.5 : 0.25);
    P.uNight.value = W.env.night;
    this.precip.visible = P.uAmount.value > 0.02 && cam.position.y < 160;
    this.precip.geometry.instanceCount = Math.floor(6000 * clamp(w.precip, 0.2, 1));
    // selection rings
    if (sel) {
      this.ring.visible = true;
      this.ring.position.set(sel.x, (sel.y || 0) + 0.12, sel.z);
      const s = (sel.r || 1) * (1 + Math.sin(this.t * 4) * 0.06);
      this.ring.scale.set(s, 1, s);
    } else this.ring.visible = false;
    if (hover) { this.hoverRing.visible = true; this.hoverRing.position.set(hover.x, (hover.y || 0) + 0.1, hover.z); const s = hover.r || 1; this.hoverRing.scale.set(s, 1, s); }
    else this.hoverRing.visible = false;
    if (objective) {
      this.beacon.visible = true;
      this.beacon.position.set(objective.x, objective.y || 0, objective.z);
      this.beacon.material.color.setRGB(...(objective.color || [1.5, 1.0, 0.2]));
      this.beacon.material.opacity = 0.18 + Math.sin(this.t * 3) * 0.06;
    } else this.beacon.visible = false;
    // request pooled lights: fires, nearest siren at night
    for (const f of this.fireReq || []) this.lights.point(f.b.x, Math.min(8, f.b.h * 0.4), f.b.z, '#ff7a30', (60 + Math.random() * 40) * f.b.fire * (0.4 + W.env.night), 40 + f.b.fire * 30, 2 + f.b.fire - f.d / 500);
    let best = null, bd = 120 * 120;
    for (const v of W.sirens || []) { const d = (v.x - cam.position.x) ** 2 + (v.z - cam.position.z) ** 2; if (d < bd) { bd = d; best = v; } }
    if (best && W.env.night > 0.3) {
      const red = Math.floor(this.t * 4.6) % 2 === 0;
      this.lights.point(best.x, best.y + 2.5, best.z, red ? '#ff2a20' : '#2a50ff', 40 * W.env.night, 30, 1.5);
    }
  }
}
