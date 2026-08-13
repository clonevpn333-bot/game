/* 05_util.js — shared primitives. Owner: core/integration. Other modules: read-only.
 * Event bus, input, deterministic RNG, noise, easing, geometry helpers, object pools.
 */
window.VH = window.VH || {};

/* ---------------------------------------------------------------- event bus */
(function () {
  const map = new Map();
  VH.on = function (n, fn) { if (!map.has(n)) map.set(n, []); map.get(n).push(fn); return fn; };
  VH.off = function (n, fn) { const a = map.get(n); if (!a) return; const i = a.indexOf(fn); if (i > -1) a.splice(i, 1); };
  VH.emit = function (n, p) {
    const a = map.get(n); if (!a) return;
    for (let i = 0; i < a.length; i++) { try { a[i](p); } catch (e) { console.error('handler ' + n, e); } }
  };
  VH.clearEvents = function () { map.clear(); };
})();

/* ---------------------------------------------------------------- query args */
VH.q = (function () {
  const o = {};
  const s = (typeof location !== 'undefined' ? location.search : '').replace(/^\?/, '');
  s.split('&').filter(Boolean).forEach(kv => { const p = kv.split('='); o[decodeURIComponent(p[0])] = p.length > 1 ? decodeURIComponent(p[1]) : '1'; });
  return o;
})();

/* ---------------------------------------------------------------- util math */
VH.util = (function () {
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
  const angLerp = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; };
  const angDiff = (a, b) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return d; };

  /* deterministic RNG (mulberry32) */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    const f = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.range = (lo, hi) => lo + f() * (hi - lo);
    f.int = (lo, hi) => Math.floor(lo + f() * (hi - lo + 1));
    f.pick = arr => arr[Math.floor(f() * arr.length) % arr.length];
    f.chance = p => f() < p;
    f.sign = () => (f() < 0.5 ? -1 : 1);
    f.shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };
    return f;
  }

  /* value noise + fbm, deterministic, shared by World/Mat/Chars */
  const P = new Uint8Array(512);
  (function () { const r = rng(1337); const p = []; for (let i = 0; i < 256; i++) p[i] = i; r.shuffle(p); for (let i = 0; i < 512; i++) P[i] = p[i & 255]; })();
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const grad2 = (h, x, y) => { switch (h & 3) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; default: return -x - y; } };
  function noise2D(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const A = P[X] + Y, B = P[X + 1] + Y;
    return lerp(lerp(grad2(P[A], x, y), grad2(P[B], x - 1, y), u),
      lerp(grad2(P[A + 1], x, y - 1), grad2(P[B + 1], x - 1, y - 1), u), v);
  }
  function fbm(x, y, oct, gain, lac) {
    oct = oct || 4; gain = gain === undefined ? 0.5 : gain; lac = lac || 2.0;
    let s = 0, a = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { s += noise2D(x * f, y * f) * a; n += a; a *= gain; f *= lac; }
    return s / n;
  }
  function ridged(x, y, oct) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < (oct || 4); i++) { s += (1 - Math.abs(noise2D(x * f, y * f))) * a; n += a; a *= 0.5; f *= 2; } return s / n; }

  /* geometry merge — BufferGeometryUtils is not available in the core build */
  function mergeGeometries(geos, useGroups) {
    if (!geos.length) return null;
    const attrNames = [];
    for (const k in geos[0].attributes) attrNames.push(k);
    let idxCount = 0, vtxCount = 0;
    for (const g of geos) { vtxCount += g.attributes.position.count; idxCount += g.index ? g.index.count : g.attributes.position.count; }
    const out = new THREE.BufferGeometry();
    const arrays = {};
    for (const name of attrNames) {
      const proto = geos[0].attributes[name];
      arrays[name] = { arr: new Float32Array(vtxCount * proto.itemSize), size: proto.itemSize, off: 0 };
    }
    const idx = vtxCount > 65535 ? new Uint32Array(idxCount) : new Uint16Array(idxCount);
    let vo = 0, io = 0;
    for (let gi = 0; gi < geos.length; gi++) {
      const g = geos[gi];
      const n = g.attributes.position.count;
      for (const name of attrNames) {
        const a = g.attributes[name]; const t = arrays[name];
        if (!a) { t.off += n * t.size; continue; }
        t.arr.set(a.array.subarray(0, n * a.itemSize), t.off); t.off += n * t.size;
      }
      if (g.index) { const gi2 = g.index.array; for (let i = 0; i < gi2.length; i++) idx[io + i] = gi2[i] + vo; if (useGroups) out.addGroup(io, gi2.length, gi); io += gi2.length; }
      else { for (let i = 0; i < n; i++) idx[io + i] = vo + i; if (useGroups) out.addGroup(io, n, gi); io += n; }
      vo += n;
    }
    for (const name of attrNames) out.setAttribute(name, new THREE.BufferAttribute(arrays[name].arr, arrays[name].size));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere();
    return out;
  }

  /* apply a matrix to a geometry clone (helper for kit-bashing) */
  function xform(geo, pos, rot, scale) {
    const g = geo.clone();
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    if (rot) q.setFromEuler(rot instanceof THREE.Euler ? rot : new THREE.Euler(rot[0] || 0, rot[1] || 0, rot[2] || 0));
    m.compose(
      pos ? (pos.isVector3 ? pos : new THREE.Vector3(pos[0] || 0, pos[1] || 0, pos[2] || 0)) : new THREE.Vector3(),
      q,
      scale ? (scale.isVector3 ? scale : (typeof scale === 'number' ? new THREE.Vector3(scale, scale, scale) : new THREE.Vector3(scale[0], scale[1], scale[2]))) : new THREE.Vector3(1, 1, 1)
    );
    g.applyMatrix4(m);
    return g;
  }

  /* simple object pool */
  function pool(factory, reset, n) {
    const free = [], used = [];
    for (let i = 0; i < (n || 0); i++) free.push(factory());
    return {
      get() { const o = free.pop() || factory(); used.push(o); return o; },
      put(o) { const i = used.indexOf(o); if (i > -1) used.splice(i, 1); if (reset) reset(o); free.push(o); },
      each(fn) { for (let i = used.length - 1; i >= 0; i--) fn(used[i], i); },
      get active() { return used.length; },
      all: used,
    };
  }

  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeOutQuint = t => 1 - Math.pow(1 - t, 5);
  const easeInCubic = t => t * t * t;
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const easeOutElastic = t => { const c4 = (2 * Math.PI) / 3; return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1; };
  const easeOutExpo = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

  return {
    clamp, lerp, smoothstep, damp, angLerp, angDiff, rng, noise2D, fbm, ridged,
    mergeGeometries, xform, pool,
    easeOutCubic, easeOutQuint, easeInCubic, easeInOut, easeOutBack, easeOutElastic, easeOutExpo,
    TAU: Math.PI * 2, DEG: Math.PI / 180,
  };
})();

/* ---------------------------------------------------------------- input */
VH.Input = (function () {
  const keys = {};
  const pressedSet = {}, releasedSet = {};
  const mouse = { x: 0, y: 0, nx: 0, ny: 0, mx: 0, my: 0 };
  let down = false, rightDown = false, wheel = 0, clicked = false, rClicked = false;
  let el = null;
  let havePointer = false;

  function bind(target) {
    el = target || window;
    window.addEventListener('keydown', e => {
      if (keys[e.code]) { e.preventDefault(); return; }
      keys[e.code] = true; pressedSet[e.code] = true;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Slash', 'Quote'].indexOf(e.code) > -1) e.preventDefault();
    }, { passive: false });
    window.addEventListener('keyup', e => { keys[e.code] = false; releasedSet[e.code] = true; });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; down = false; rightDown = false; });
    window.addEventListener('mousemove', e => {
      havePointer = true;
      mouse.mx = e.movementX || 0; mouse.my = e.movementY || 0;
      mouse.x = e.clientX; mouse.y = e.clientY;
      mouse.nx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ny = -((e.clientY / window.innerHeight) * 2 - 1);
    });
    window.addEventListener('mousedown', e => {
      if (e.button === 0) { down = true; clicked = true; }
      if (e.button === 2) { rightDown = true; rClicked = true; }
    });
    window.addEventListener('mouseup', e => { if (e.button === 0) down = false; if (e.button === 2) rightDown = false; });
    window.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('wheel', e => { wheel += e.deltaY; if (e.cancelable) e.preventDefault(); }, { passive: false });
    /* touch: coarse support so it is at least not broken on a tablet */
    window.addEventListener('touchstart', e => {
      const t = e.touches[0]; if (!t) return;
      havePointer = true; down = true; clicked = true;
      mouse.x = t.clientX; mouse.y = t.clientY;
      mouse.nx = (t.clientX / window.innerWidth) * 2 - 1;
      mouse.ny = -((t.clientY / window.innerHeight) * 2 - 1);
    }, { passive: true });
    window.addEventListener('touchmove', e => {
      const t = e.touches[0]; if (!t) return;
      mouse.x = t.clientX; mouse.y = t.clientY;
      mouse.nx = (t.clientX / window.innerWidth) * 2 - 1;
      mouse.ny = -((t.clientY / window.innerHeight) * 2 - 1);
    }, { passive: true });
    window.addEventListener('touchend', () => { down = false; });
    /* start the cursor at screen centre so the camera does not spin on load */
    mouse.x = window.innerWidth / 2; mouse.y = window.innerHeight / 2;
  }

  function endFrame() {
    for (const k in pressedSet) delete pressedSet[k];
    for (const k in releasedSet) delete releasedSet[k];
    wheel = 0; clicked = false; rClicked = false;
    mouse.mx = 0; mouse.my = 0;
  }

  return {
    bind, endFrame, keys, mouse,
    get down() { return down; },
    get rightDown() { return rightDown; },
    get wheel() { return wheel; },
    get clickedThisFrame() { return clicked; },
    get rightClickedThisFrame() { return rClicked; },
    get hasPointer() { return havePointer; },
    pressed(c) { return !!pressedSet[c]; },
    released(c) { return !!releasedSet[c]; },
    anyPressed() { for (const k in pressedSet) return true; return false; },
    axis() {
      let x = 0, z = 0;
      if (keys.KeyW || keys.ArrowUp) z -= 1;
      if (keys.KeyS || keys.ArrowDown) z += 1;
      if (keys.KeyA || keys.ArrowLeft) x -= 1;
      if (keys.KeyD || keys.ArrowRight) x += 1;
      const l = Math.hypot(x, z);
      return l > 1 ? { x: x / l, z: z / l, len: 1 } : { x, z, len: l };
    },
  };
})();

/* ---------------------------------------------------------------- perf meter */
VH.Perf = (function () {
  let last = performance.now(), acc = 0, frames = 0, fps = 60, worst = 999;
  function tick() {
    const now = performance.now(); const d = now - last; last = now;
    acc += d; frames++;
    if (acc > 500) { fps = 1000 / (acc / frames); worst = Math.min(worst, fps); acc = 0; frames = 0; }
    return d / 1000;
  }
  return { tick, get fps() { return fps; }, get worst() { return worst; }, reset() { worst = 999; } };
})();
