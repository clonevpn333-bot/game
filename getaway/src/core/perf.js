// GETAWAY! — keeps the game from choking the GPU: per-frame view culling helper, automatic resolution scaling
// driven by real frame times, and recovery when the graphics driver resets (WebGL context loss).
import * as THREE from 'three';
import { G } from './context.js';

const _f = new THREE.Frustum(), _pm = new THREE.Matrix4(), _s = new THREE.Sphere();
// call once per frame after the camera moved
export function updateView() { const c = G.camera; c.updateMatrixWorld(); _pm.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse); _f.setFromProjectionMatrix(_pm); }
// near things always draw (they can still cast shadows into view); far or off-screen things don't
export function inView(p, r = 1.5, maxD = 120) {
  const c = G.camera.position; const dx = p.x - c.x, dy = p.y - c.y, dz = p.z - c.z; const d2 = dx * dx + dy * dy + dz * dz;
  if (d2 < 18 * 18) return true; if (d2 > maxD * maxD) return false; _s.center.copy(p); _s.radius = r + 4; return _f.intersectsSphere(_s);
}

// ---------------- adaptive resolution ----------------
export class PerfGovernor {
  constructor(renderer, composer, settings) {
    this.R = renderer; this.C = composer; this.max = this.cap(settings); this.min = settings.quality === 'low' || settings.quality === 'minimum' ? 0.45 : 0.5; this.pr = Math.min(this.max, 1); this.avg = 16; this.t = 0; this.cool = 0; this.stalls = 0; this.lost = false; this.grace = 4;
    this.apply(this.pr);
    if (G.Q && G.Q.shadowEvery > 1) { renderer.shadowMap.autoUpdate = false; this.shadowEvery = G.Q.shadowEvery; } // cheaper shadows: refresh every Nth frame
    const cv = renderer.domElement;
    cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; this.banner('Graphics driver reset — recovering…'); console.warn('WebGL context lost'); });
    cv.addEventListener('webglcontextrestored', () => { this.lost = false; this.max = Math.max(this.min, this.max * 0.75); this.apply(Math.min(this.pr, this.max) * 0.8); this.banner('Recovered — running at lower detail', 3000); if (G.sky && G.sky.sun) G.sky.sun.shadow.map = null; });
  }
  cap(s) { const dpr = devicePixelRatio || 1; return s.quality === 'ultra' ? Math.min(2, dpr) : s.quality === 'high' ? Math.min(1.25, dpr) : s.quality === 'medium' ? Math.min(0.9, dpr) : s.quality === 'minimum' ? 0.62 : 0.72; }
  setQuality(s) { this.max = this.cap(s); this.apply(Math.min(this.pr, this.max)); }
  apply(pr) { pr = Math.round(Math.max(this.min, Math.min(this.max, pr)) * 20) / 20; if (Math.abs(pr - this.R.getPixelRatio()) < 0.01) { this.pr = pr; return; } this.pr = pr; this.R.setPixelRatio(pr); if (this.C.setPixelRatio) this.C.setPixelRatio(pr); this.R.setSize(innerWidth, innerHeight); this.C.setSize(innerWidth, innerHeight); }
  // rawMs = real time since the previous frame (includes GPU back-pressure)
  frame(rawMs) {
    if (this.lost || document.hidden || rawMs > 5000) return; // tab switch / sleep: not a stall
    if (this.grace > 0) { this.grace -= Math.min(rawMs, 100) / 1000; return; } // loading / first frames after a mission starts
    if (rawMs > 600) { // a stall: drop hard right away so it can't keep happening
      this.stalls++; this.apply(this.pr * 0.7); this.cool = 3; if (this.stalls === 2) this.banner('Lowered detail to keep the game smooth', 2500); return;
    }
    this.avg += (Math.min(rawMs, 200) - this.avg) * 0.08; this.t += rawMs / 1000; this.cool -= rawMs / 1000;
    if (this.t < 1 || this.cool > 0) return; this.t = 0;
    if (this.avg > 28 && this.pr <= this.min + 0.01) { this.degrade(); this.cool = 2; return; }
    if (this.avg > 28) { this.apply(this.pr * 0.85); this.cool = 1.5; } else if (this.avg < 15 && this.pr < this.max) { this.apply(this.pr * 1.08); this.cool = 4; }
  }
  // already at the lowest resolution and still slow: shed effects that don't need a shader rebuild
  degrade() {
    this.level = (this.level || 0) + 1;
    if (this.level === 1 && this.C.bloom) { this.C.bloom.enabled = false; this.banner('Low-spec mode: bloom off', 2500); }
    else if (this.level === 2) { this.R.shadowMap.autoUpdate = false; this.shadowEvery = Math.max(3, this.shadowEvery || 0); this.banner('Low-spec mode: lighter shadows', 2500); }
    else if (this.level === 3) { this.viewScale(0.75); if (G.peds) G.peds.setDensity((G.settings.pedDensity || 1) * G.Q.peds * 0.6); this.banner('Low-spec mode: shorter view distance', 2500); }
    else if (this.level === 4) { this.viewScale(0.6); if (G.Q) { G.Q.humanLodD *= 0.6; G.Q.carDetailD *= 0.6; } if (G.peds) G.peds.setDensity((G.settings.pedDensity || 1) * G.Q.peds * 0.4); if (G.traffic) G.traffic.density = G.Q.traffic * 0.7; this.banner('Low-spec mode: fewer people and cars', 2500); }
  }
  // shrink how far the world is drawn (camera range, fog, batched props) — no shader rebuild
  viewScale(k) { if (!G.Q || !G.camera) return; G.camera.far = Math.max(320, G.Q.viewFar * k); G.camera.updateProjectionMatrix(); if (G.instCull) { G.instCull.scale = k; G.instCull.dirty = true; } }
  tick(frame) { if (this.shadowEvery && frame % this.shadowEvery === 0) this.R.shadowMap.needsUpdate = true; }
  banner(text, ms = 0) {
    let b = document.getElementById('perf-banner'); if (!b) { b = document.createElement('div'); b.id = 'perf-banner'; b.style.cssText = 'position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:99999;background:rgba(10,12,16,.85);color:#ffd36b;font:600 14px Rajdhani,system-ui,sans-serif;letter-spacing:.06em;padding:8px 16px;border-radius:6px;pointer-events:none;text-transform:uppercase'; document.body.appendChild(b); }
    b.textContent = text; b.style.display = 'block'; clearTimeout(this._bt); if (ms) this._bt = setTimeout(() => { b.style.display = 'none'; }, ms);
  }
}
