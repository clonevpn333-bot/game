/* =============================================================
 * BREACHPOINT — sprite batching, particles, decals, tracers
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});
  var M = CS.M, GL = CS.GL;

  var FX = {};

  /* Atlas tile indices */
  var T = {
    PUFF: 0, HOLE: 1, BLOOD: 2, FLASH: 3, SPARK: 4, SHADOW: 5,
    FIRE: 6, DUST: 7, SCORCH: 8, GLOW: 9, RING: 10, SHELL: 11,
    SMOKE2: 12, CRACK: 13, SPLAT: 14, SOFT: 15
  };
  FX.T = T;
  var ATLAS_DIM = 4;

  /* ---------------------------------------------------------------
   * Procedural sprite atlas (4x4 tiles, 128px each)
   * ------------------------------------------------------------- */
  FX.makeAtlas = function () {
    var TS = 128, size = TS * ATLAS_DIM;
    var cv = GL.makeCanvas(size);
    var g = cv.getContext('2d');
    g.clearRect(0, 0, size, size);

    function tile(idx) {
      var tx = (idx % ATLAS_DIM) * TS, ty = ((idx / ATLAS_DIM) | 0) * TS;
      g.save(); g.translate(tx, ty); g.beginPath(); g.rect(0, 0, TS, TS); g.clip();
      return { x: tx, y: ty, c: TS / 2 };
    }
    function radial(cx, cy, r, stops) {
      var grd = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      for (var i = 0; i < stops.length; i++) grd.addColorStop(stops[i][0], stops[i][1]);
      return grd;
    }

    // 0 PUFF — soft smoke ball with internal variation
    tile(T.PUFF);
    g.fillStyle = radial(64, 64, 62, [[0, 'rgba(255,255,255,0.96)'], [0.45, 'rgba(255,255,255,0.72)'], [0.8, 'rgba(255,255,255,0.22)'], [1, 'rgba(255,255,255,0)']]);
    g.fillRect(0, 0, TS, TS);
    for (var i = 0; i < 16; i++) {
      var a = Math.random() * 6.28, rr = Math.random() * 34;
      g.fillStyle = radial(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr, 22 + Math.random() * 14,
        [[0, 'rgba(255,255,255,0.16)'], [1, 'rgba(255,255,255,0)']]);
      g.fillRect(0, 0, TS, TS);
    }
    g.restore();

    // 1 HOLE — bullet hole with a bright rim and cracks
    tile(T.HOLE);
    g.fillStyle = radial(64, 64, 30, [[0, 'rgba(8,8,10,0.98)'], [0.55, 'rgba(14,14,16,0.9)'], [1, 'rgba(30,30,32,0)']]);
    g.fillRect(0, 0, TS, TS);
    g.strokeStyle = 'rgba(210,210,205,0.55)'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(64, 64, 17, 0, 6.283); g.stroke();
    g.strokeStyle = 'rgba(180,180,178,0.35)'; g.lineWidth = 1.6;
    for (var c = 0; c < 7; c++) {
      var ca = (c / 7) * 6.283 + Math.random();
      g.beginPath(); g.moveTo(64 + Math.cos(ca) * 15, 64 + Math.sin(ca) * 15);
      g.lineTo(64 + Math.cos(ca) * (26 + Math.random() * 18), 64 + Math.sin(ca) * (26 + Math.random() * 18));
      g.stroke();
    }
    g.restore();

    // 2 BLOOD — dark red splatter
    tile(T.BLOOD);
    g.fillStyle = radial(64, 64, 46, [[0, 'rgba(150,10,14,0.92)'], [0.6, 'rgba(96,6,10,0.55)'], [1, 'rgba(70,4,6,0)']]);
    g.fillRect(0, 0, TS, TS);
    for (var b = 0; b < 14; b++) {
      var ba = Math.random() * 6.283, bd = 18 + Math.random() * 40;
      g.fillStyle = 'rgba(128,8,12,' + (0.3 + Math.random() * 0.5) + ')';
      g.beginPath(); g.arc(64 + Math.cos(ba) * bd, 64 + Math.sin(ba) * bd, 3 + Math.random() * 8, 0, 6.283); g.fill();
    }
    g.restore();

    // 3 FLASH — muzzle flash star
    tile(T.FLASH);
    g.fillStyle = radial(64, 64, 40, [[0, 'rgba(255,250,220,1)'], [0.3, 'rgba(255,205,110,0.85)'], [0.7, 'rgba(255,140,40,0.30)'], [1, 'rgba(255,110,20,0)']]);
    g.fillRect(0, 0, TS, TS);
    g.strokeStyle = 'rgba(255,236,180,0.85)';
    for (var s = 0; s < 6; s++) {
      var sa = (s / 6) * 6.283;
      g.lineWidth = 6 - s % 3 * 2;
      g.beginPath(); g.moveTo(64, 64);
      g.lineTo(64 + Math.cos(sa) * 60, 64 + Math.sin(sa) * 60); g.stroke();
    }
    g.restore();

    // 4 SPARK — bright streak
    tile(T.SPARK);
    var sg = g.createLinearGradient(8, 64, 120, 64);
    sg.addColorStop(0, 'rgba(255,240,190,0)');
    sg.addColorStop(0.45, 'rgba(255,236,170,0.95)');
    sg.addColorStop(0.6, 'rgba(255,190,90,0.85)');
    sg.addColorStop(1, 'rgba(255,150,40,0)');
    g.fillStyle = sg; g.fillRect(0, 56, TS, 16);
    g.restore();

    // 5 SHADOW — soft blob
    tile(T.SHADOW);
    g.fillStyle = radial(64, 64, 60, [[0, 'rgba(0,0,0,0.55)'], [0.55, 'rgba(0,0,0,0.32)'], [1, 'rgba(0,0,0,0)']]);
    g.fillRect(0, 0, TS, TS);
    g.restore();

    // 6 FIRE — flame blob
    tile(T.FIRE);
    g.fillStyle = radial(64, 78, 56, [[0, 'rgba(255,240,190,0.95)'], [0.25, 'rgba(255,180,60,0.9)'], [0.6, 'rgba(230,90,20,0.55)'], [1, 'rgba(140,30,10,0)']]);
    g.fillRect(0, 0, TS, TS);
    g.restore();

    // 7 DUST — pale debris cloud
    tile(T.DUST);
    g.fillStyle = radial(64, 64, 58, [[0, 'rgba(255,255,255,0.6)'], [0.5, 'rgba(240,236,226,0.30)'], [1, 'rgba(230,226,215,0)']]);
    g.fillRect(0, 0, TS, TS);
    g.restore();

    // 8 SCORCH — explosion mark
    tile(T.SCORCH);
    g.fillStyle = radial(64, 64, 60, [[0, 'rgba(10,9,8,0.82)'], [0.5, 'rgba(24,20,16,0.5)'], [1, 'rgba(30,26,20,0)']]);
    g.fillRect(0, 0, TS, TS);
    g.restore();

    // 9 GLOW — clean dot
    tile(T.GLOW);
    g.fillStyle = radial(64, 64, 60, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]);
    g.fillRect(0, 0, TS, TS);
    g.restore();

    // 10 RING — impact shockwave
    tile(T.RING);
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 8;
    g.beginPath(); g.arc(64, 64, 48, 0, 6.283); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 18;
    g.beginPath(); g.arc(64, 64, 48, 0, 6.283); g.stroke();
    g.restore();

    // 11 SHELL — brass casing
    tile(T.SHELL);
    var shg = g.createLinearGradient(48, 0, 80, 0);
    shg.addColorStop(0, 'rgba(120,88,26,1)');
    shg.addColorStop(0.4, 'rgba(232,196,96,1)');
    shg.addColorStop(1, 'rgba(140,102,32,1)');
    g.fillStyle = shg; g.fillRect(48, 34, 32, 60);
    g.fillStyle = 'rgba(190,160,80,1)'; g.fillRect(46, 88, 36, 10);
    g.restore();

    // 12 SMOKE2 — denser core for smoke grenades
    tile(T.SMOKE2);
    g.fillStyle = radial(64, 64, 63, [[0, 'rgba(255,255,255,1)'], [0.62, 'rgba(255,255,255,0.95)'], [0.88, 'rgba(255,255,255,0.42)'], [1, 'rgba(255,255,255,0)']]);
    g.fillRect(0, 0, TS, TS);
    g.restore();

    // 13 CRACK — glass / concrete fracture
    tile(T.CRACK);
    g.strokeStyle = 'rgba(240,244,248,0.7)';
    for (var k = 0; k < 10; k++) {
      var ka = (k / 10) * 6.283 + Math.random() * 0.4;
      g.lineWidth = 1 + Math.random() * 2;
      g.beginPath(); g.moveTo(64, 64);
      var px = 64, py = 64;
      for (var seg = 0; seg < 3; seg++) {
        px += Math.cos(ka + (Math.random() - 0.5) * 0.7) * 18;
        py += Math.sin(ka + (Math.random() - 0.5) * 0.7) * 18;
        g.lineTo(px, py);
      }
      g.stroke();
    }
    g.restore();

    // 14 SPLAT — wet blood pool for decals
    tile(T.SPLAT);
    g.fillStyle = 'rgba(112,8,10,0.78)';
    for (var sp = 0; sp < 10; sp++) {
      var spa = Math.random() * 6.283, spd = Math.random() * 34;
      g.beginPath(); g.ellipse(64 + Math.cos(spa) * spd, 64 + Math.sin(spa) * spd,
        10 + Math.random() * 20, 8 + Math.random() * 16, Math.random() * 3, 0, 6.283); g.fill();
    }
    g.restore();

    // 15 SOFT — plain soft circle
    tile(T.SOFT);
    g.fillStyle = radial(64, 64, 62, [[0, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']]);
    g.fillRect(0, 0, TS, TS);
    g.restore();

    return cv;
  };

  FX.tileUV = function (idx) {
    var s = 1 / ATLAS_DIM;
    var tx = (idx % ATLAS_DIM) * s, ty = ((idx / ATLAS_DIM) | 0) * s;
    return [tx, ty, s];
  };

  /* ---------------------------------------------------------------
   * Sprite batcher — camera-facing quads, one draw call per flush
   * ------------------------------------------------------------- */
  function SpriteBatch(gl, max) {
    this.gl = gl;
    this.max = max || 3000;
    this.stride = 9;  // pos3, uv2, rgba4
    this.data = new Float32Array(this.max * 6 * this.stride);
    this.n = 0;
    this.mesh = new GL.Mesh(gl, [
      { name: 'aPos', size: 3 }, { name: 'aUV', size: 2 }, { name: 'aColor', size: 4 }
    ]);
  }
  SpriteBatch.prototype.begin = function () { this.n = 0; };

  /* rx/ry/rz = camera right, ux/uy/uz = camera up */
  SpriteBatch.prototype.add = function (x, y, z, size, tile, r, g, b, a, rot, rx, ry, rz, ux, uy, uz, aspect) {
    if (this.n >= this.max || a <= 0.002) return;
    var uv = FX.tileUV(tile);
    var hw = size * 0.5, hh = size * 0.5 * (aspect === undefined ? 1 : aspect);
    var c = 1, s = 0;
    if (rot) { c = Math.cos(rot); s = Math.sin(rot); }
    // rotated basis in the camera plane
    var axx = (rx * c + ux * s) * hw, axy = (ry * c + uy * s) * hw, axz = (rz * c + uz * s) * hw;
    var ayx = (ux * c - rx * s) * hh, ayy = (uy * c - ry * s) * hh, ayz = (uz * c - rz * s) * hh;

    var d = this.data, o = this.n * 6 * this.stride;
    var u0 = uv[0], v0 = uv[1], us = uv[2];
    function put(px, py, pz, u, v) {
      d[o] = px; d[o + 1] = py; d[o + 2] = pz;
      d[o + 3] = u; d[o + 4] = v;
      d[o + 5] = r; d[o + 6] = g; d[o + 7] = b; d[o + 8] = a;
      o += 9;
    }
    var x0 = x - axx - ayx, y0 = y - axy - ayy, z0 = z - axz - ayz;
    var x1 = x + axx - ayx, y1 = y + axy - ayy, z1 = z + axz - ayz;
    var x2 = x + axx + ayx, y2 = y + axy + ayy, z2 = z + axz + ayz;
    var x3 = x - axx + ayx, y3 = y - axy + ayy, z3 = z - axz + ayz;
    put(x0, y0, z0, u0, v0 + us);
    put(x1, y1, z1, u0 + us, v0 + us);
    put(x2, y2, z2, u0 + us, v0);
    put(x0, y0, z0, u0, v0 + us);
    put(x2, y2, z2, u0 + us, v0);
    put(x3, y3, z3, u0, v0);
    this.n++;
  };

  /* Axis-aligned quad in world space (decals, ground markers). */
  SpriteBatch.prototype.addOriented = function (x, y, z, size, tile, r, g, b, a, ax, ay, az, bx, by, bz) {
    if (this.n >= this.max || a <= 0.002) return;
    var uv = FX.tileUV(tile);
    var h = size * 0.5;
    var axx = ax * h, axy = ay * h, axz = az * h;
    var ayx = bx * h, ayy = by * h, ayz = bz * h;
    var d = this.data, o = this.n * 6 * this.stride;
    var u0 = uv[0], v0 = uv[1], us = uv[2];
    function put(px, py, pz, u, v) {
      d[o] = px; d[o + 1] = py; d[o + 2] = pz;
      d[o + 3] = u; d[o + 4] = v;
      d[o + 5] = r; d[o + 6] = g; d[o + 7] = b; d[o + 8] = a;
      o += 9;
    }
    put(x - axx - ayx, y - axy - ayy, z - axz - ayz, u0, v0 + us);
    put(x + axx - ayx, y + axy - ayy, z + axz - ayz, u0 + us, v0 + us);
    put(x + axx + ayx, y + axy + ayy, z + axz + ayz, u0 + us, v0);
    put(x - axx - ayx, y - axy - ayy, z - axz - ayz, u0, v0 + us);
    put(x + axx + ayx, y + axy + ayy, z + axz + ayz, u0 + us, v0);
    put(x - axx + ayx, y - axy + ayy, z - axz + ayz, u0, v0);
    this.n++;
  };

  SpriteBatch.prototype.flush = function (prog) {
    if (!this.n) return;
    this.mesh.updateSub(this.data, this.n * 6);
    this.mesh.draw(prog);
  };
  FX.SpriteBatch = SpriteBatch;

  /* ---------------------------------------------------------------
   * Particles
   * ------------------------------------------------------------- */
  function Particles(max) {
    this.max = max || 900;
    this.list = [];
    this.free = [];
  }
  Particles.prototype.spawn = function (o) {
    if (this.list.length >= this.max) this.list.shift();
    this.list.push({
      x: o.x, y: o.y, z: o.z,
      vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0,
      size: o.size || 0.1, size2: o.size2 === undefined ? o.size : o.size2,
      life: 0, max: o.life || 0.6,
      tile: o.tile === undefined ? T.DUST : o.tile,
      r: o.r === undefined ? 1 : o.r, g: o.g === undefined ? 1 : o.g, b: o.b === undefined ? 1 : o.b,
      a: o.a === undefined ? 1 : o.a, a2: o.a2 === undefined ? 0 : o.a2,
      grav: o.grav === undefined ? 0 : o.grav,
      drag: o.drag === undefined ? 1.6 : o.drag,
      rot: o.rot || 0, spin: o.spin || 0,
      aspect: o.aspect, bounce: o.bounce || 0, glow: !!o.glow
    });
  };
  Particles.prototype.update = function (dt, world) {
    for (var i = this.list.length - 1; i >= 0; i--) {
      var p = this.list[i];
      p.life += dt;
      if (p.life >= p.max) { this.list.splice(i, 1); continue; }
      p.vy -= p.grav * dt;
      var k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vz *= k;
      if (p.grav === 0) p.vy *= k;
      var nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
      if (p.bounce && world) {
        var dx = nx - p.x, dy = ny - p.y, dz = nz - p.z;
        var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len > 1e-5) {
          var h = world.rayWorld(p.x, p.y, p.z, dx / len, dy / len, dz / len, len + 0.03);
          if (h) {
            nx = p.x + dx / len * Math.max(0, h.t - 0.02);
            ny = p.y + dy / len * Math.max(0, h.t - 0.02);
            nz = p.z + dz / len * Math.max(0, h.t - 0.02);
            var dot = p.vx * h.nx + p.vy * h.ny + p.vz * h.nz;
            p.vx -= (1 + p.bounce) * dot * h.nx;
            p.vy -= (1 + p.bounce) * dot * h.ny;
            p.vz -= (1 + p.bounce) * dot * h.nz;
            p.vx *= 0.6; p.vy *= 0.6; p.vz *= 0.6;
          }
        }
      }
      p.x = nx; p.y = ny; p.z = nz;
      p.rot += p.spin * dt;
    }
  };
  Particles.prototype.draw = function (batch, rx, ry, rz, ux, uy, uz) {
    for (var i = 0; i < this.list.length; i++) {
      var p = this.list[i];
      var t = p.life / p.max;
      var size = p.size + (p.size2 - p.size) * t;
      var alpha = p.a + (p.a2 - p.a) * t;
      batch.add(p.x, p.y, p.z, size, p.tile, p.r, p.g, p.b, alpha, p.rot, rx, ry, rz, ux, uy, uz, p.aspect);
    }
  };
  Particles.prototype.clear = function () { this.list.length = 0; };
  FX.Particles = Particles;

  /* ---------------------------------------------------------------
   * Decals — persistent, oriented to the surface they hit
   * ------------------------------------------------------------- */
  function Decals(max) {
    this.max = max || 160;
    this.list = [];
  }
  Decals.prototype.add = function (x, y, z, nx, ny, nz, size, tile, r, g, b, a, life) {
    // build a tangent basis on the surface
    var ux = 0, uy = 1, uz = 0;
    if (Math.abs(ny) > 0.9) { ux = 1; uy = 0; uz = 0; }
    var tx = uy * nz - uz * ny, ty = uz * nx - ux * nz, tz = ux * ny - uy * nx;
    var tl = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
    tx /= tl; ty /= tl; tz /= tl;
    var bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx;
    var rot = Math.random() * Math.PI * 2, c = Math.cos(rot), s = Math.sin(rot);
    var ax = tx * c + bx * s, ay = ty * c + by * s, az = tz * c + bz * s;
    var cx = bx * c - tx * s, cy = by * c - ty * s, cz = bz * c - tz * s;

    if (this.list.length >= this.max) this.list.shift();
    this.list.push({
      x: x + nx * 0.012, y: y + ny * 0.012, z: z + nz * 0.012,
      ax: ax, ay: ay, az: az, bx: cx, by: cy, bz: cz,
      size: size, tile: tile, r: r, g: g, b: b, a: a,
      born: 0, life: life || 0
    });
  };
  Decals.prototype.update = function (dt) {
    for (var i = this.list.length - 1; i >= 0; i--) {
      var d = this.list[i];
      if (!d.life) continue;
      d.born += dt;
      if (d.born > d.life) this.list.splice(i, 1);
    }
  };
  Decals.prototype.draw = function (batch) {
    for (var i = 0; i < this.list.length; i++) {
      var d = this.list[i];
      var a = d.a;
      if (d.life) a *= M.clamp(1 - (d.born / d.life), 0, 1);
      batch.addOriented(d.x, d.y, d.z, d.size, d.tile, d.r, d.g, d.b, a,
                        d.ax, d.ay, d.az, d.bx, d.by, d.bz);
    }
  };
  Decals.prototype.clear = function () { this.list.length = 0; };
  FX.Decals = Decals;

  /* ---------------------------------------------------------------
   * Tracers — short-lived bullet streaks drawn as stretched sprites
   * ------------------------------------------------------------- */
  function Tracers(max) { this.max = max || 120; this.list = []; }
  Tracers.prototype.add = function (x0, y0, z0, x1, y1, z1, speed, width, r, g, b) {
    if (this.list.length >= this.max) this.list.shift();
    var dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    var len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    this.list.push({
      x: x0, y: y0, z: z0, dx: dx / len, dy: dy / len, dz: dz / len,
      len: len, t: 0, speed: speed || 260, width: width || 0.045,
      r: r === undefined ? 1 : r, g: g === undefined ? 0.92 : g, b: b === undefined ? 0.62 : b,
      trail: 2.2
    });
  };
  Tracers.prototype.update = function (dt) {
    for (var i = this.list.length - 1; i >= 0; i--) {
      var t = this.list[i];
      t.t += dt * t.speed;
      if (t.t - t.trail > t.len) this.list.splice(i, 1);
    }
  };
  /* Draws as a quad aligned to the bullet path and facing the camera. */
  Tracers.prototype.draw = function (batch, camX, camY, camZ) {
    for (var i = 0; i < this.list.length; i++) {
      var t = this.list[i];
      var head = Math.min(t.t, t.len);
      var tail = Math.max(0, t.t - t.trail);
      if (head <= tail) continue;
      var mid = (head + tail) * 0.5;
      var mx = t.x + t.dx * mid, my = t.y + t.dy * mid, mz = t.z + t.dz * mid;
      // view direction to the segment midpoint
      var vx = mx - camX, vy = my - camY, vz = mz - camZ;
      var vl = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
      vx /= vl; vy /= vl; vz /= vl;
      // side = normalize(cross(dir, view))
      var sx = t.dy * vz - t.dz * vy, sy = t.dz * vx - t.dx * vz, sz = t.dx * vy - t.dy * vx;
      var sl = Math.sqrt(sx * sx + sy * sy + sz * sz);
      if (sl < 1e-4) continue;
      sx /= sl; sy /= sl; sz /= sl;
      var halfLen = (head - tail) * 0.5;
      var fade = M.clamp(1 - t.t / (t.len + 1), 0.25, 1);
      batch.addOriented(mx, my, mz, 1, T.SPARK, t.r, t.g, t.b, 0.85 * fade,
        t.dx * halfLen * 2, t.dy * halfLen * 2, t.dz * halfLen * 2,
        sx * t.width * 2, sy * t.width * 2, sz * t.width * 2);
    }
  };
  Tracers.prototype.clear = function () { this.list.length = 0; };
  FX.Tracers = Tracers;

  CS.FX = FX;
})(typeof window !== 'undefined' ? window : globalThis);
