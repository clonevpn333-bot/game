// GETAWAY! — lighting dressing: soft contact shadows under every car & person, night headlight beams + road
// pools for all traffic, real spotlights for the player's car, street-lamp light pools, sun lens flare.
// Everything here is created at boot so the light count never changes (no shader recompiles mid-game).
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, lerp } from '../core/utils.js';

function radialTex(inner = 'rgba(0,0,0,0.85)', outer = 'rgba(0,0,0,0)', stretch = 1) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128 * stretch; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64 * stretch, 0, 64, 64 * stretch, 64); gr.addColorStop(0, inner); gr.addColorStop(0.55, inner.replace(/[\d.]+\)$/, (m) => (parseFloat(m) * 0.55) + ')')); gr.addColorStop(1, outer);
  g.setTransform(1, 0, 0, stretch, 0, 0); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();

export class Lighting {
  constructor(scene) {
    const flat = new THREE.PlaneGeometry(1, 1); flat.rotateX(-Math.PI / 2);
    // contact shadows
    this.shadowV = new THREE.InstancedMesh(flat, new THREE.MeshBasicMaterial({ map: radialTex('rgba(0,0,0,0.78)'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, color: 0x000000 }), 160);
    this.shadowH = new THREE.InstancedMesh(flat, this.shadowV.material, 420);
    // headlight road pools + volumetric cones
    const pool = flat.clone(); pool.translate(0, 0, 0.5);
    this.pools = new THREE.InstancedMesh(pool, new THREE.MeshBasicMaterial({ map: radialTex('rgba(255,244,214,0.9)', 'rgba(255,240,200,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -5, toneMapped: false }), 160);
    const cone = new THREE.ConeGeometry(1, 1, 18, 1, true); cone.translate(0, -0.5, 0); cone.rotateX(-Math.PI / 2);
    this.cones = new THREE.InstancedMesh(cone, new THREE.MeshBasicMaterial({ color: 0xfff1d2, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), 320);
    for (const m of [this.shadowV, this.shadowH, this.pools, this.cones]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0; m.renderOrder = 2; scene.add(m); }
    this.pools.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(160 * 3), 3);
    // the player's real headlights (constant light count)
    this.spots = [0, 1].map(() => { const s = new THREE.SpotLight(0xfff2dc, 0, 70, 0.42, 0.55, 1.4); s.castShadow = false; scene.add(s); scene.add(s.target); return s; });
    // street lamp pools
    this.lampPools = null; this.flare = null; this.flareT = 0; this.sunVis = 0;
  }
  buildLampPools(props) {
    const lamps = props.list.filter((p) => p.type === 'lamp' || p.type === 'hwylamp');
    const flat = new THREE.PlaneGeometry(1, 1); flat.rotateX(-Math.PI / 2);
    const m = new THREE.InstancedMesh(flat, new THREE.MeshBasicMaterial({ map: radialTex('rgba(255,214,150,0.7)', 'rgba(255,200,140,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, toneMapped: false, color: 0x000000 }), lamps.length * 2);
    let i = 0; for (const p of lamps) {
      const offs = p.type === 'hwylamp' ? [[0, 2.8], [0, -2.8]] : [[0, -2.4]];
      for (const [ox, oz] of offs) { const c = Math.cos(p.yaw), s = Math.sin(p.yaw); const x = p.x + c * ox + s * oz, z = p.z - s * ox + c * oz; _m.compose(_p.set(x, p.y + 0.06, z), _q.identity(), _s.set(15, 1, 15)); m.setMatrixAt(i++, _m); }
    }
    m.count = i; m.frustumCulled = false; m.renderOrder = 2; G.scene.add(m); this.lampPools = m; this.lampList = lamps;
  }
  buildFlare(root) {
    const el = document.createElement('div'); el.className = 'flare'; root.appendChild(el); const bits = [];
    for (const [k, size, col] of [[0, 180, 'rgba(255,240,210,0.35)'], [0.35, 50, 'rgba(120,200,255,0.18)'], [0.6, 90, 'rgba(255,170,90,0.12)'], [0.85, 30, 'rgba(160,255,190,0.15)'], [1.2, 140, 'rgba(255,120,80,0.08)']]) { const b = document.createElement('i'); b.style.width = b.style.height = size + 'px'; b.style.background = `radial-gradient(circle, ${col}, transparent 70%)`; b.dataset.k = k; el.appendChild(b); bits.push(b); }
    this.flare = { el, bits };
  }
  update(dt) {
    const night = G.sky ? G.sky.night : 0; const cam = G.camera.position; const S = G.world.static;
    // --- vehicle shadows, pools, cones
    let nv = 0, np = 0, nc = 0;
    for (const v of G.vehicles.list) {
      const d2 = (v.pos.x - cam.x) ** 2 + (v.pos.z - cam.z) ** 2; if (d2 > 160 * 160) continue;
      const gy = v.groundY ?? v.pos.y; const hgt = Math.max(0, v.pos.y - gy); const k = clamp(1 - hgt / 6, 0, 1);
      if (k > 0.02 && nv < 160) { const yaw = v.mode === 'rigid' && v.rigid ? Math.atan2(new THREE.Vector3(0, 0, 1).applyQuaternion(v.rigid.quat).x, new THREE.Vector3(0, 0, 1).applyQuaternion(v.rigid.quat).z) : v.yaw; _m.compose(_p.set(v.pos.x, gy + 0.04, v.pos.z), _q.setFromAxisAngle(_s.set(0, 1, 0), yaw), _s.set(v.spec.W * 1.35 * (0.6 + 0.4 * k), 1, v.spec.L * 1.18 * (0.6 + 0.4 * k))); this.shadowV.setMatrixAt(nv++, _m); }
      const lit = night > 0.35 && v.engineOn && !v.dead && v.mode === 'drive' && !v.flipped;
      if (lit && d2 < 130 * 130 && np < 160) {
        const s = Math.sin(v.yaw), c = Math.cos(v.yaw); const fz = v.spec.L / 2;
        _m.compose(_p.set(v.pos.x + s * (fz + 1), gy + 0.05, v.pos.z + c * (fz + 1)), _q.setFromAxisAngle(_s.set(0, 1, 0), v.yaw), _s.set(v.spec.W * 2.2, 1, 13)); this.pools.setMatrixAt(np, _m); _c.setScalar(0.55 * night); this.pools.setColorAt(np, _c); np++;
        if (nc < 318) for (const sx of [-1, 1]) { const lx = sx * v.spec.W * 0.34; const hy = v.pos.y + (v.spec.body ? v.spec.body[v.spec.body.length - 1][1] + 0.25 : 0.8); _e.set(-v.pitch - 0.07, v.yaw, 0, 'YXZ'); _q.setFromEuler(_e); _m.compose(_p.set(v.pos.x + c * lx + s * fz, hy, v.pos.z - s * lx + c * fz), _q, _s.set(1.6, 1.6, 15)); this.cones.setMatrixAt(nc++, _m); }
      }
    }
    // --- people
    let nh = 0; const addH = (h) => { if (!h || !h.visible || nh >= 420) return; const d2 = (h.pos.x - cam.x) ** 2 + (h.pos.z - cam.z) ** 2; if (d2 > 70 * 70) return; const px = h.mode === 'ragdoll' ? h.joints[0] : h.pos.x, pz = h.mode === 'ragdoll' ? h.joints[2] : h.pos.z; const gy = S.groundAt(px, pz, h.pos.y + 1, 0.4).h; const k = clamp(1 - (h.pos.y - gy) / 4, 0.2, 1); _m.compose(_p.set(px, gy + 0.035, pz), _q.identity(), _s.set(1.0 * k, 1, 1.0 * k)); this.shadowH.setMatrixAt(nh++, _m); };
    for (const p of G.peds.list) addH(p.human); if (G.npcs) for (const n of G.npcs.list) addH(n.human); if (!G.player.vehicle) addH(G.player.human);
    this.shadowV.count = nv; this.shadowH.count = nh; this.pools.count = np; this.cones.count = nc;
    for (const m of [this.shadowV, this.shadowH, this.pools, this.cones]) m.instanceMatrix.needsUpdate = true; if (np) this.pools.instanceColor.needsUpdate = true;
    this.cones.material.opacity = 0.03 + 0.04 * night + (G.sky ? G.sky.w.fog * 0.04 + G.sky.w.rain * 0.03 : 0);
    // --- player headlights
    const pv = G.player.vehicle; const on = pv && night > 0.3 && pv.engineOn && pv.mode === 'drive' && !pv.dead;
    this.spots.forEach((sp, i) => { if (!on) { sp.intensity = 0; return; } const sx = i ? -1 : 1; const s = Math.sin(pv.yaw), c = Math.cos(pv.yaw); const lx = sx * pv.spec.W * 0.34, fz = pv.spec.L / 2; sp.position.set(pv.pos.x + c * lx + s * fz, pv.pos.y + 0.75, pv.pos.z - s * lx + c * fz); sp.target.position.set(sp.position.x + s * 30, pv.pos.y - 1.5, sp.position.z + c * 30); sp.target.updateMatrixWorld(); sp.intensity = 260 * night; });
    // --- lamp pools brighten at night
    if (this.lampPools) this.lampPools.material.color.setScalar(night * 0.9);
    // --- lens flare
    if (this.flare) this.updateFlare(dt);
  }
  updateFlare(dt) {
    const sky = G.sky; const el = this.flare.el; if (!sky || G.mode !== 'play') { el.style.opacity = 0; return; }
    const sd = sky.uniforms.sunDir.value; const cam = G.camera; const sp = _p.copy(cam.position).addScaledVector(sd, 1000); const v = sp.clone().project(cam);
    this.flareT -= dt; if (this.flareT <= 0) { this.flareT = 0.15; const hit = G.world.static.raycast(cam.position.x, cam.position.y, cam.position.z, sd.x, sd.y, sd.z, 400, { noGround: true }); this.sunOcc = !!hit || sd.y < 0.02; }
    const inView = v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2; const target = inView && !this.sunOcc ? (1 - sky.w.overcast) * sky.day * clamp(1 - Math.hypot(v.x, v.y) * 0.5, 0, 1) : 0;
    this.sunVis = lerp(this.sunVis, target, 1 - Math.exp(-dt * 8)); el.style.opacity = this.sunVis;
    if (this.sunVis > 0.01) { const sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight; const cx = innerWidth / 2, cy = innerHeight / 2; for (const b of this.flare.bits) { const k = +b.dataset.k; const x = sx + (cx - sx) * k * 2, y = sy + (cy - sy) * k * 2; b.style.transform = `translate(${x - b.offsetWidth / 2}px, ${y - b.offsetHeight / 2}px)`; } }
  }
}
