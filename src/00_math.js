/* =============================================================
 * BREACHPOINT — core math
 * Pure logic. No THREE, no DOM. Testable in node.
 * Units: meters, seconds, radians (unless noted "deg").
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});

  var M = {};

  M.EPS = 1e-6;
  M.DEG = Math.PI / 180;
  M.RAD = 180 / Math.PI;

  M.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  M.lerp = function (a, b, t) { return a + (b - a) * t; };
  M.sign = function (v) { return v < 0 ? -1 : (v > 0 ? 1 : 0); };
  M.smoothstep = function (t) { t = M.clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  /* Frame-rate independent exponential approach. `rate` = fraction remaining after 1s. */
  M.damp = function (a, b, rate, dt) { return b + (a - b) * Math.pow(rate, dt); };

  /* Wrap radians to (-PI, PI] */
  M.wrapPI = function (a) {
    a = a % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a <= -Math.PI) a += Math.PI * 2;
    return a;
  };
  M.angleDelta = function (from, to) { return M.wrapPI(to - from); };
  M.lerpAngle = function (a, b, t) { return a + M.angleDelta(a, b) * t; };

  /* ---------------- Vec3 (plain objects {x,y,z}) ---------------- */
  function V(x, y, z) { return { x: x || 0, y: y || 0, z: z || 0 }; }
  M.v = V;
  M.vset = function (o, x, y, z) { o.x = x; o.y = y; o.z = z; return o; };
  M.vcopy = function (o, a) { o.x = a.x; o.y = a.y; o.z = a.z; return o; };
  M.vclone = function (a) { return V(a.x, a.y, a.z); };
  M.vadd = function (o, a, b) { o.x = a.x + b.x; o.y = a.y + b.y; o.z = a.z + b.z; return o; };
  M.vsub = function (o, a, b) { o.x = a.x - b.x; o.y = a.y - b.y; o.z = a.z - b.z; return o; };
  M.vscale = function (o, a, s) { o.x = a.x * s; o.y = a.y * s; o.z = a.z * s; return o; };
  M.vmad = function (o, a, b, s) { o.x = a.x + b.x * s; o.y = a.y + b.y * s; o.z = a.z + b.z * s; return o; };
  M.vdot = function (a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; };
  M.vcross = function (o, a, b) {
    var x = a.y * b.z - a.z * b.y, y = a.z * b.x - a.x * b.z, z = a.x * b.y - a.y * b.x;
    o.x = x; o.y = y; o.z = z; return o;
  };
  M.vlen = function (a) { return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z); };
  M.vlen2 = function (a) { return a.x * a.x + a.y * a.y + a.z * a.z; };
  M.vdist = function (a, b) { var dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z; return Math.sqrt(dx * dx + dy * dy + dz * dz); };
  M.vdist2 = function (a, b) { var dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z; return dx * dx + dy * dy + dz * dz; };
  M.vdistXZ = function (a, b) { var dx = a.x - b.x, dz = a.z - b.z; return Math.sqrt(dx * dx + dz * dz); };
  M.vnorm = function (o, a) {
    var l = M.vlen(a);
    if (l < M.EPS) { o.x = 0; o.y = 0; o.z = 0; return o; }
    o.x = a.x / l; o.y = a.y / l; o.z = a.z / l; return o;
  };
  M.vlerp = function (o, a, b, t) {
    o.x = a.x + (b.x - a.x) * t; o.y = a.y + (b.y - a.y) * t; o.z = a.z + (b.z - a.z) * t; return o;
  };

  /* yaw/pitch (radians) -> unit forward vector.
   * yaw 0 looks down +X, increasing yaw turns toward -Z (right-handed, Y up). */
  M.angleVectors = function (yaw, pitch, out) {
    out = out || V();
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    out.x = cp * cy;
    out.y = sp;
    out.z = -cp * sy;
    return out;
  };
  M.vectorAngles = function (v) {
    var len = Math.sqrt(v.x * v.x + v.z * v.z);
    return { yaw: Math.atan2(-v.z, v.x), pitch: Math.atan2(v.y, len) };
  };

  /* Build an orthonormal basis around forward (for spread cones). */
  M.basisFromForward = function (f, right, up) {
    // world up
    var ux = 0, uy = 1, uz = 0;
    if (Math.abs(f.y) > 0.999) { ux = 1; uy = 0; uz = 0; }
    // right = normalize(cross(f, worldUp))
    var rx = f.y * uz - f.z * uy, ry = f.z * ux - f.x * uz, rz = f.x * uy - f.y * ux;
    var rl = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
    right.x = rx / rl; right.y = ry / rl; right.z = rz / rl;
    // up = cross(right, f)
    up.x = right.y * f.z - right.z * f.y;
    up.y = right.z * f.x - right.x * f.z;
    up.z = right.x * f.y - right.y * f.x;
    return right;
  };

  /* ---------------- RNG ---------------- */
  M.mulberry32 = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  /* Deterministic per-(seed,index) value in [0,1) — used for shot spread so that
   * host and client agree without sharing RNG state. */
  M.hash01 = function (a, b) {
    var h = Math.imul(a ^ 0x9E3779B9, 0x85EBCA6B);
    h ^= Math.imul(b + 0x165667B1, 0xC2B2AE35);
    h ^= h >>> 13; h = Math.imul(h, 0x27D4EB2F); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  /* ---------------- AABB ---------------- */
  /* Box shape: {min:{x,y,z}, max:{x,y,z}} */
  M.aabb = function (cx, cy, cz, hx, hy, hz) {
    return { min: V(cx - hx, cy - hy, cz - hz), max: V(cx + hx, cy + hy, cz + hz) };
  };
  M.aabbOverlap = function (a, b) {
    return a.min.x < b.max.x && a.max.x > b.min.x &&
           a.min.y < b.max.y && a.max.y > b.min.y &&
           a.min.z < b.max.z && a.max.z > b.min.z;
  };
  M.aabbContainsPoint = function (a, p) {
    return p.x >= a.min.x && p.x <= a.max.x &&
           p.y >= a.min.y && p.y <= a.max.y &&
           p.z >= a.min.z && p.z <= a.max.z;
  };
  M.aabbClosestPoint = function (out, a, p) {
    out.x = M.clamp(p.x, a.min.x, a.max.x);
    out.y = M.clamp(p.y, a.min.y, a.max.y);
    out.z = M.clamp(p.z, a.min.z, a.max.z);
    return out;
  };

  /* Ray vs AABB slab test.
   * Returns null or {t, nx, ny, nz} where t is distance along `dir` (dir must be unit). */
  var _rayHit = { t: 0, nx: 0, ny: 0, nz: 0 };
  M.rayAABB = function (ox, oy, oz, dx, dy, dz, box, maxT) {
    var tmin = 0, tmax = maxT;
    var axisMin = 0, signMin = 0;
    var inv, t1, t2, tmp;

    // X
    if (Math.abs(dx) < 1e-9) {
      if (ox < box.min.x || ox > box.max.x) return null;
    } else {
      inv = 1 / dx;
      t1 = (box.min.x - ox) * inv; t2 = (box.max.x - ox) * inv;
      var sx = -1;
      if (t1 > t2) { tmp = t1; t1 = t2; t2 = tmp; sx = 1; }
      if (t1 > tmin) { tmin = t1; axisMin = 0; signMin = sx; }
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
    // Y
    if (Math.abs(dy) < 1e-9) {
      if (oy < box.min.y || oy > box.max.y) return null;
    } else {
      inv = 1 / dy;
      t1 = (box.min.y - oy) * inv; t2 = (box.max.y - oy) * inv;
      var sy = -1;
      if (t1 > t2) { tmp = t1; t1 = t2; t2 = tmp; sy = 1; }
      if (t1 > tmin) { tmin = t1; axisMin = 1; signMin = sy; }
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
    // Z
    if (Math.abs(dz) < 1e-9) {
      if (oz < box.min.z || oz > box.max.z) return null;
    } else {
      inv = 1 / dz;
      t1 = (box.min.z - oz) * inv; t2 = (box.max.z - oz) * inv;
      var sz = -1;
      if (t1 > t2) { tmp = t1; t1 = t2; t2 = tmp; sz = 1; }
      if (t1 > tmin) { tmin = t1; axisMin = 2; signMin = sz; }
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
    if (tmax < 0) return null;
    _rayHit.t = tmin;
    _rayHit.nx = axisMin === 0 ? signMin : 0;
    _rayHit.ny = axisMin === 1 ? signMin : 0;
    _rayHit.nz = axisMin === 2 ? signMin : 0;
    return _rayHit;
  };

  /* Segment vs sphere — used for smoke occlusion. Returns true if the segment
   * passes within `r` of `c`. */
  M.segmentSphere = function (ax, ay, az, bx, by, bz, c, r) {
    var dx = bx - ax, dy = by - ay, dz = bz - az;
    var fx = ax - c.x, fy = ay - c.y, fz = az - c.z;
    var A = dx * dx + dy * dy + dz * dz;
    if (A < M.EPS) return (fx * fx + fy * fy + fz * fz) <= r * r;
    var t = -(fx * dx + fy * dy + fz * dz) / A;
    t = M.clamp(t, 0, 1);
    var px = fx + dx * t, py = fy + dy * t, pz = fz + dz * t;
    return (px * px + py * py + pz * pz) <= r * r;
  };

  /* Length of the portion of segment AB that lies inside sphere(c,r). */
  M.segmentSphereDepth = function (ax, ay, az, bx, by, bz, c, r) {
    var dx = bx - ax, dy = by - ay, dz = bz - az;
    var A = dx * dx + dy * dy + dz * dz;
    if (A < M.EPS) return 0;
    var fx = ax - c.x, fy = ay - c.y, fz = az - c.z;
    var B = 2 * (fx * dx + fy * dy + fz * dz);
    var C = fx * fx + fy * fy + fz * fz - r * r;
    var disc = B * B - 4 * A * C;
    if (disc <= 0) return 0;
    var sq = Math.sqrt(disc);
    var t1 = (-B - sq) / (2 * A), t2 = (-B + sq) / (2 * A);
    t1 = M.clamp(t1, 0, 1); t2 = M.clamp(t2, 0, 1);
    if (t2 <= t1) return 0;
    return (t2 - t1) * Math.sqrt(A);
  };

  M.formatTime = function (sec) {
    if (sec < 0) sec = 0;
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  };

  CS.M = M;
})(typeof window !== 'undefined' ? window : globalThis);
