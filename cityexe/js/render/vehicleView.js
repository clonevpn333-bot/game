// Vehicle rendering: one instanced mesh per vehicle model, re-filled each frame
// from the simulation. Models are built from tagged parts so paint, glass,
// headlights, brake lights and emergency light bars are driven per instance.
import * as THREE from 'three';
import { makeInstMaterial, InstPool } from './materials.js';
import { buildVehicleModels, buildLowModels } from './vehicleModels.js';

const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpP = new THREE.Vector3(), tmpS = new THREE.Vector3(1, 1, 1);
const col = new THREE.Color(), col2 = new THREE.Color(1, 1, 1);
const sphere = new THREE.Sphere();

export class VehicleView {
  constructor(renderer, world) {
    this.R = renderer;
    this.world = world;
    const models = buildVehicleModels();
    const mat = makeInstMaterial(renderer.U, { key: 'veh2', roughness: 0.55, metalness: 0.2, snow: true, clearcoat: true });
    this.mat = mat;
    this.pools = {};
    const counts = {};
    for (const v of world.traffic.vehicles) counts[v.type] = (counts[v.type] || 0) + 1;
    // close-up models within LOD_D metres, simplified silhouettes beyond
    const low = buildLowModels();
    this.lowPools = {};
    for (const t in models) {
      const n = Math.max(16, (counts[t] || 0) * 2 + 40);
      const p = new InstPool(models[t], mat, n, { shadow: true, receive: true });
      renderer.scene.add(p.mesh);
      this.pools[t] = p;
      if (low[t]) { const lp = new InstPool(low[t], mat, n, { shadow: true, receive: true }); renderer.scene.add(lp.mesh); this.lowPools[t] = lp; }
    }
    // headlight beams on the ground (additive)
    const beamTex = new THREE.CanvasTexture((() => {
      const c = document.createElement('canvas'); c.width = 64; c.height = 128;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 120, 4, 32, 70, 70);
      gr.addColorStop(0, 'rgba(255,240,210,0.9)'); gr.addColorStop(0.6, 'rgba(255,230,190,0.25)'); gr.addColorStop(1, 'rgba(255,230,190,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(26, 128); g.lineTo(38, 128); g.lineTo(64, 0); g.lineTo(0, 0); g.closePath(); g.fill();
      return c;
    })());
    const bg = new THREE.PlaneGeometry(5, 11).rotateX(-Math.PI / 2).translate(0, 0, 5.5);
    this.beamMat = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5, color: '#ffe8c0' });
    this.beams = new THREE.InstancedMesh(bg, this.beamMat, 400);
    this.beams.frustumCulled = false;
    this.beams.renderOrder = 3;
    renderer.scene.add(this.beams);
    // emergency glow sprites (bloom catches them)
    this.glowGeo = new THREE.PlaneGeometry(1, 1);
    this.glowMat = new THREE.MeshBasicMaterial({ map: makeGlowTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, vertexColors: false });
    this.glows = new THREE.InstancedMesh(this.glowGeo, this.glowMat, 300);
    this.glows.frustumCulled = false;
    this.glows.renderOrder = 4;
    this.glows.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(300 * 3), 3);
    renderer.scene.add(this.glows);
    this.frustum = new THREE.Frustum();
    this.projM = new THREE.Matrix4();
    this.visible = [];
  }

  // real headlights for the vehicle the player is driving (via the shared light pool)
  updatePlayerLights(lights) {
    const P = this.world.possessed;
    const v = P && P.veh;
    if (!lights || !v || !(v.lightsOn || this.R.U.uNight.value > 0.35)) return;
    const sh = Math.sin(v.h), ch = Math.cos(v.h);
    lights.spotlight(v.x + sh * v.len * 0.5, v.y + 0.8, v.z + ch * v.len * 0.5, v.x + sh * 30, v.y - 1, v.z + ch * 30, '#fff2dc', 1400, 0.6, 80, 5);
  }

  update(dt) {
    const W = this.world;
    const cam = this.R.camera;
    this.projM.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projM);
    for (const t in this.pools) this.pools[t].begin();
    for (const t in this.lowPools) this.lowPools[t].begin();
    const night = this.R.U.uNight.value;
    let nb = 0, ng = 0;
    const camPos = cam.position;
    const time = this.R.U.uTime.value;
    this.visible.length = 0;
    const beamOn = night > 0.25;
    for (const v of W.traffic.vehicles) {
      if (v.hidden || v.state === 'garage' || v.state === 'repair' || v.state === 'gone') continue;
      let x = v.x, y = v.y, z = v.z, h = v.h;
      if (v.state === 'abstract') {
        continue;
      }
      if (v.state === 'towed') {
        const tv = W.traffic.byId.get(v.towedBy);
        if (tv) { x = tv.x - Math.sin(tv.h) * (tv.len / 2 + v.len / 2 - 0.6); z = tv.z - Math.cos(tv.h) * (tv.len / 2 + v.len / 2 - 0.6); y = tv.y + 0.6; h = tv.h; v.x = x; v.z = z; v.h = h; v.y = y; }
      }
      sphere.center.set(x, y + 1, z); sphere.radius = v.len * 0.6 + 1;
      if (!this.frustum.intersectsSphere(sphere)) continue;
      const far = (x - camPos.x) ** 2 + (z - camPos.z) ** 2 + (y - camPos.y) ** 2 > 110 * 110 && !v.player;
      const pool = (far && this.lowPools[v.type]) || this.pools[v.type];
      if (!pool) continue;
      // body pitch under accel/brake, roll from steering
      const pitch = v.state === 'towed' ? -0.08 : (v.a ? -v.a * 0.006 : 0);
      const roll = v.state === 'free' ? (v.av || 0) * v.speed * -0.004 : 0;
      tmpE.set(pitch, h, roll, 'YXZ');
      tmpQ.setFromEuler(tmpE);
      tmpP.set(x, y, z);
      tmpM.compose(tmpP, tmpQ, tmpS);
      col.set(v.color);
      const lights = v.lightsOn || night > 0.35 || W.weather.precip > 0.5 || W.weather.fog > 0.4 ? 1 : 0;
      const occupied = v.driver != null || v.player || v.state === 'lane';
      const sirenOn = v.siren || v.sceneLights && v.isStaticObstacle ? 1 : (v.type === 'tow' || v.type === 'utility' || v.type === 'construction') && v.isStaticObstacle ? 1 : 0;
      pool.add(tmpM, col, col2, occupied ? lights : 0, v.brake || (v.state === 'lane' && v.v < 0.3 && occupied) ? 1 : 0, sirenOn, v.damage);
      this.visible.push(v);
      const d2 = (x - camPos.x) ** 2 + (z - camPos.z) ** 2;
      if (beamOn && lights && occupied && nb < 400 && d2 < 420 * 420 && v.state !== 'parked') {
        tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), h);
        tmpP.set(x + Math.sin(h) * v.len * 0.45, y + 0.06, z + Math.cos(h) * v.len * 0.45);
        tmpS.set(1, 1, 1);
        tmpM.compose(tmpP, tmpQ, tmpS);
        this.beams.setMatrixAt(nb++, tmpM);
      }
      if (sirenOn && ng < 296 && d2 < 600 * 600) {
        const ph = Math.floor(time * 4.6 + v.id) % 2;
        const top = v.T.hgt + 0.2;
        for (const side of [-1, 1]) {
          const on = (side < 0) === (ph === 0);
          const c = v.type === 'tow' || v.type === 'utility' || v.type === 'construction' ? [2.5, 1.2, 0.1] : side < 0 ? [3, 0.2, 0.15] : [0.25, 0.45, 3.5];
          const s = on ? 2.4 : 0.0001;
          tmpP.set(x + Math.cos(h) * side * 0.45, y + top, z - Math.sin(h) * side * 0.45);
          tmpM.makeScale(s, s, s);
          tmpM.lookAt(new THREE.Vector3(), new THREE.Vector3().subVectors(camPos, tmpP), new THREE.Vector3(0, 1, 0));
          tmpM.scale(new THREE.Vector3(s, s, s));
          tmpM.setPosition(tmpP);
          this.glows.setMatrixAt(ng, tmpM);
          this.glows.instanceColor.setXYZ(ng, c[0], c[1], c[2]);
          ng++;
        }
      }
    }
    tmpS.set(1, 1, 1);
    for (const t in this.pools) this.pools[t].end();
    for (const t in this.lowPools) this.lowPools[t].end();
    this.updatePlayerLights(this.lightPool);
    this.beams.count = nb;
    this.beams.instanceMatrix.needsUpdate = true;
    this.beamMat.opacity = Math.min(1, night * 1.3) * 0.45;
    this.glows.count = ng;
    this.glows.instanceMatrix.needsUpdate = true;
    this.glows.instanceColor.needsUpdate = true;
  }
}

export function makeGlowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}
