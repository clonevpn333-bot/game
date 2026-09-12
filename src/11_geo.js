/* =============================================================
 * BREACHPOINT — geometry construction and baked lighting
 *
 * The world is static, so sun shadows and ambient occlusion are
 * baked into vertex colours at load time. That gives soft, stable
 * lighting at zero runtime cost, which matters far more on a
 * school laptop than a real-time shadow map would.
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});
  var M = CS.M, C = CS.C;

  var Geo = {};

  /* ---------------------------------------------------------------
   * Material palette
   * ------------------------------------------------------------- */
  Geo.MATERIALS = {
    concrete: { col: [0.62, 0.60, 0.57], rough: 1.0, uvScale: 0.55, edge: 0.10 },
    sand:     { col: [0.72, 0.63, 0.45], rough: 1.0, uvScale: 0.45, edge: 0.08 },
    metal:    { col: [0.50, 0.54, 0.58], rough: 0.6, uvScale: 0.75, edge: 0.16 },
    steel:    { col: [0.44, 0.47, 0.52], rough: 0.5, uvScale: 0.9,  edge: 0.18 },
    wood:     { col: [0.58, 0.40, 0.24], rough: 1.0, uvScale: 0.7,  edge: 0.12 },
    crate:    { col: [0.68, 0.48, 0.26], rough: 1.0, uvScale: 1.1,  edge: 0.20 },
    tile:     { col: [0.70, 0.68, 0.64], rough: 0.8, uvScale: 0.8,  edge: 0.14 },
    grass:    { col: [0.38, 0.50, 0.28], rough: 1.0, uvScale: 0.6,  edge: 0.06 },
    water:    { col: [0.30, 0.52, 0.62], rough: 0.3, uvScale: 0.5,  edge: 0.05 },
    glass:    { col: [0.70, 0.85, 0.92], rough: 0.2, uvScale: 0.5,  edge: 0.10 }
  };

  function matOf(name) { return Geo.MATERIALS[name] || Geo.MATERIALS.concrete; }

  /* ---------------------------------------------------------------
   * Mesh builder
   * ------------------------------------------------------------- */
  function Builder(format) {
    this.format = format || 'world';   // 'world' (11 floats) | 'skin' (10 floats)
    this.stride = this.format === 'skin' ? 10 : 11;
    this.v = [];
    this.i = [];
    this.nv = 0;
  }
  Geo.Builder = Builder;

  Builder.prototype.vert = function (x, y, z, nx, ny, nz, r, g, b, a1, a2) {
    var v = this.v;
    v.push(x, y, z, nx, ny, nz, r, g, b);
    if (this.format === 'skin') v.push(a1 || 0);
    else v.push(a1 || 0, a2 || 0);
    return this.nv++;
  };
  Builder.prototype.quad = function (a, b, c, d) {
    this.i.push(a, b, c, a, c, d);
  };
  Builder.prototype.result = function () {
    var arr = new Float32Array(this.v);
    var idx = this.nv > 65535 ? new Uint32Array(this.i) : new Uint16Array(this.i);
    return { verts: arr, indices: idx, count: this.i.length, vertexCount: this.nv, stride: this.stride };
  };

  /* Axis-aligned box. `faces` bitmask: +X 1, -X 2, +Y 4, -Y 8, +Z 16, -Z 32 */
  var FACE_DEF = [
    { bit: 1,  n: [1, 0, 0],  v: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], uAxis: 2, vAxis: 1 },
    { bit: 2,  n: [-1, 0, 0], v: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], uAxis: 2, vAxis: 1 },
    { bit: 4,  n: [0, 1, 0],  v: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], uAxis: 0, vAxis: 2 },
    { bit: 8,  n: [0, -1, 0], v: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]], uAxis: 0, vAxis: 2 },
    { bit: 16, n: [0, 0, 1],  v: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], uAxis: 0, vAxis: 1 },
    { bit: 32, n: [0, 0, -1], v: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], uAxis: 0, vAxis: 1 }
  ];
  Geo.FACE_DEF = FACE_DEF;

  /* Simple coloured box (used for players, weapons, props). */
  Builder.prototype.box = function (x0, x1, y0, y1, z0, z1, col, bone, shadeTop) {
    var dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    for (var f = 0; f < 6; f++) {
      var F = FACE_DEF[f];
      var shade = 1.0;
      // cheap directional shading so untextured boxes still read as 3D
      if (F.n[1] > 0) shade = 1.10;
      else if (F.n[1] < 0) shade = 0.58;
      else if (F.n[0] !== 0) shade = 0.80;    // muzzle / butt faces
      else shade = 0.94;                      // flanks — the faces you actually see
      if (shadeTop !== undefined && F.n[1] > 0) shade *= shadeTop;
      var r = col[0] * shade, g = col[1] * shade, b = col[2] * shade;
      var base = this.nv;
      for (var k = 0; k < 4; k++) {
        var p = F.v[k];
        this.vert(x0 + p[0] * dx, y0 + p[1] * dy, z0 + p[2] * dz,
                  F.n[0], F.n[1], F.n[2], r, g, b, bone, 0);
      }
      this.quad(base, base + 1, base + 2, base + 3);
    }
    return this;
  };

  /* Box with a Y rotation applied about (cx, cz) — for angled props. */
  Builder.prototype.boxRot = function (cx, cy, cz, hx, hy, hz, ry, col, bone) {
    var cr = Math.cos(ry), sr = Math.sin(ry);
    for (var f = 0; f < 6; f++) {
      var F = FACE_DEF[f];
      var shade = F.n[1] > 0 ? 1.08 : (F.n[1] < 0 ? 0.58 : (F.n[0] !== 0 ? 0.84 : 0.92));
      var r = col[0] * shade, g = col[1] * shade, b = col[2] * shade;
      var nx = F.n[0] * cr + F.n[2] * sr, nz = -F.n[0] * sr + F.n[2] * cr;
      var base = this.nv;
      for (var k = 0; k < 4; k++) {
        var p = F.v[k];
        var lx = (p[0] * 2 - 1) * hx, ly = (p[1] * 2 - 1) * hy, lz = (p[2] * 2 - 1) * hz;
        var wx = lx * cr + lz * sr, wz = -lx * sr + lz * cr;
        this.vert(cx + wx, cy + ly, cz + wz, nx, F.n[1], nz, r, g, b, bone, 0);
      }
      this.quad(base, base + 1, base + 2, base + 3);
    }
    return this;
  };

  /* Box rotated about the model's right axis (Z) — grips, magazines, stocks. */
  Builder.prototype.boxRotZ = function (cx, cy, cz, hx, hy, hz, rz, col, bone) {
    var cr = Math.cos(rz), sr = Math.sin(rz);
    for (var f = 0; f < 6; f++) {
      var F = FACE_DEF[f];
      var shade = F.n[1] > 0 ? 1.10 : (F.n[1] < 0 ? 0.56 : (F.n[0] !== 0 ? 0.82 : 0.94));
      var r = col[0] * shade, g = col[1] * shade, b = col[2] * shade;
      var nx = F.n[0] * cr - F.n[1] * sr, ny = F.n[0] * sr + F.n[1] * cr;
      var base = this.nv;
      for (var k = 0; k < 4; k++) {
        var p = F.v[k];
        var lx = (p[0] * 2 - 1) * hx, ly = (p[1] * 2 - 1) * hy, lz = (p[2] * 2 - 1) * hz;
        var wx = lx * cr - ly * sr, wy = lx * sr + ly * cr;
        this.vert(cx + wx, cy + wy, cz + lz, nx, ny, F.n[2], r, g, b, bone, 0);
      }
      this.quad(base, base + 1, base + 2, base + 3);
    }
    return this;
  };

  Builder.prototype.cylinder = function (cx, cy, cz, radius, height, segments, col, bone) {
    segments = segments || 8;
    var top = cy + height, i, a, a2;
    for (i = 0; i < segments; i++) {
      a = i / segments * Math.PI * 2; a2 = (i + 1) / segments * Math.PI * 2;
      var x1 = cx + Math.cos(a) * radius, z1 = cz + Math.sin(a) * radius;
      var x2 = cx + Math.cos(a2) * radius, z2 = cz + Math.sin(a2) * radius;
      var nx = Math.cos((a + a2) / 2), nz = Math.sin((a + a2) / 2);
      var sh = 0.7 + 0.3 * Math.max(0, nx * 0.4 + nz * 0.3 + 0.5);
      var base = this.nv;
      this.vert(x1, cy, z1, nx, 0, nz, col[0] * sh, col[1] * sh, col[2] * sh, bone, 0);
      this.vert(x1, top, z1, nx, 0, nz, col[0] * sh, col[1] * sh, col[2] * sh, bone, 0);
      this.vert(x2, top, z2, nx, 0, nz, col[0] * sh, col[1] * sh, col[2] * sh, bone, 0);
      this.vert(x2, cy, z2, nx, 0, nz, col[0] * sh, col[1] * sh, col[2] * sh, bone, 0);
      this.quad(base, base + 1, base + 2, base + 3);
    }
    // cap
    var capBase = this.nv;
    this.vert(cx, top, cz, 0, 1, 0, col[0] * 1.1, col[1] * 1.1, col[2] * 1.1, bone, 0);
    for (i = 0; i <= segments; i++) {
      a = i / segments * Math.PI * 2;
      this.vert(cx + Math.cos(a) * radius, top, cz + Math.sin(a) * radius, 0, 1, 0,
                col[0] * 1.1, col[1] * 1.1, col[2] * 1.1, bone, 0);
    }
    for (i = 0; i < segments; i++) this.i.push(capBase, capBase + 1 + i, capBase + 2 + i);
    return this;
  };

  /* ---------------------------------------------------------------
   * Map geometry + light baking
   * ------------------------------------------------------------- */

  /* Faces that sit flush against another solid are never visible. */
  function faceHidden(world, box, faceIdx) {
    var F = FACE_DEF[faceIdx];
    var eps = 0.02;
    var mn = { x: box.min.x + eps, y: box.min.y + eps, z: box.min.z + eps };
    var mx = { x: box.max.x - eps, y: box.max.y - eps, z: box.max.z - eps };
    if (F.n[0] > 0) { mn.x = box.max.x + eps; mx.x = box.max.x + 0.06; }
    else if (F.n[0] < 0) { mn.x = box.min.x - 0.06; mx.x = box.min.x - eps; }
    else if (F.n[1] > 0) { mn.y = box.max.y + eps; mx.y = box.max.y + 0.06; }
    else if (F.n[1] < 0) { mn.y = box.min.y - 0.06; mx.y = box.min.y - eps; }
    else if (F.n[2] > 0) { mn.z = box.max.z + eps; mx.z = box.max.z + 0.06; }
    else { mn.z = box.min.z - 0.06; mx.z = box.min.z - eps; }
    if (mx.x <= mn.x || mx.y <= mn.y || mx.z <= mn.z) return false;

    var hits = [];
    world.queryAABB(mn, mx, hits);
    for (var i = 0; i < hits.length; i++) {
      var o = hits[i];
      if (o === box) continue;
      // covered only if the neighbour spans the whole face
      if (o.min.x <= mn.x + eps && o.max.x >= mx.x - eps &&
          o.min.y <= mn.y + eps && o.max.y >= mx.y - eps &&
          o.min.z <= mn.z + eps && o.max.z >= mx.z - eps) return true;
    }
    return false;
  }

  var AO_DIRS = [];
  (function () {
    // fixed hemisphere sample set, rotated onto each vertex normal
    var n = 6;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      var e = 0.55 + (i % 2) * 0.28;
      AO_DIRS.push([Math.cos(a) * Math.sqrt(1 - e * e), e, Math.sin(a) * Math.sqrt(1 - e * e)]);
    }
  })();

  function bakeVertex(world, x, y, z, nx, ny, nz, sun, opts) {
    var ox = x + nx * 0.02, oy = y + ny * 0.02, oz = z + nz * 0.02;

    // --- sun visibility (2 rays: a hard one and a jittered one for soft edges)
    var ndl = nx * sun.x + ny * sun.y + nz * sun.z;
    var lit = 0;
    if (ndl > 0) {
      var blocked = world.rayWorld(ox, oy, oz, sun.x, sun.y, sun.z, 55) ? 1 : 0;
      var jx = sun.x + 0.055, jy = sun.y, jz = sun.z - 0.055;
      var jl = Math.sqrt(jx * jx + jy * jy + jz * jz);
      var blocked2 = world.rayWorld(ox, oy, oz, jx / jl, jy / jl, jz / jl, 55) ? 1 : 0;
      lit = (1 - (blocked + blocked2) * 0.5) * ndl;
    }

    // --- ambient occlusion
    var occ = 0, samples = opts.aoSamples;
    if (samples > 0) {
      // build a basis around the normal
      var ux = 0, uy = 1, uz = 0;
      if (Math.abs(ny) > 0.9) { ux = 1; uy = 0; uz = 0; }
      var tx = uy * nz - uz * ny, ty = uz * nx - ux * nz, tz = ux * ny - uy * nx;
      var tl = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
      tx /= tl; ty /= tl; tz /= tl;
      var bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx;
      for (var i = 0; i < samples; i++) {
        var d = AO_DIRS[i % AO_DIRS.length];
        var dx = tx * d[0] + nx * d[1] + bx * d[2];
        var dy = ty * d[0] + ny * d[1] + by * d[2];
        var dz = tz * d[0] + nz * d[1] + bz * d[2];
        var h = world.rayWorld(ox, oy, oz, dx, dy, dz, opts.aoRange);
        if (h) occ += 1 - Math.min(1, h.t / opts.aoRange);
      }
      occ /= samples;
    }
    return { lit: lit, ao: 1 - occ * 0.78 };
  }

  /* Build the renderable map mesh. Returns {verts, indices, stats}. */
  Geo.buildMap = function (world, map, quality) {
    var q = C.QUALITY_PRESETS[quality] || C.QUALITY_PRESETS.high;
    var env = map.env;
    var sun = { x: env.sun.x, y: env.sun.y, z: env.sun.z };
    var sl = Math.sqrt(sun.x * sun.x + sun.y * sun.y + sun.z * sun.z) || 1;
    sun.x /= sl; sun.y /= sl; sun.z /= sl;

    var sunCol = hexToRgb(env.sunColor || '#ffffff');
    var ambCol = hexToRgb(env.ambient || '#8090a0');
    var sunI = env.sunIntensity === undefined ? 1 : env.sunIntensity;
    var ambI = env.ambientIntensity === undefined ? 0.6 : env.ambientIntensity;
    var groundCol = hexToRgb(env.ground || '#8a7a60');
    var groundBounce = 0.34 * sunI;

    var opts = {
      grid: quality === 'low' ? 3.4 : (quality === 'medium' ? 2.6 : 2.0),
      aoSamples: quality === 'low' ? 0 : (quality === 'medium' ? 3 : 6),
      aoRange: 2.4
    };

    var groups = {};                 // material -> Builder
    function builderFor(name) {
      if (!groups[name]) groups[name] = new Builder('world');
      return groups[name];
    }
    var cache = {};   // shared-vertex light cache so corners are computed once
    var t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    var rays = 0;

    function light(x, y, z, nx, ny, nz) {
      var key = (Math.round(x * 8) + ',' + Math.round(y * 8) + ',' + Math.round(z * 8) + ',' +
                 (nx > 0 ? 1 : nx < 0 ? 2 : 0) + (ny > 0 ? 3 : ny < 0 ? 6 : 0) + (nz > 0 ? 9 : nz < 0 ? 18 : 0));
      var c = cache[key];
      if (c) return c;
      c = bakeVertex(world, x, y, z, nx, ny, nz, sun, opts);
      rays += 2 + opts.aoSamples;
      cache[key] = c;
      return c;
    }

    for (var bi = 0; bi < map.boxes.length; bi++) {
      var box = map.boxes[bi];
      if (box.noRender) continue;
      var matName = Geo.MATERIALS[box.mat] ? box.mat : 'concrete';
      var mat = matOf(box.mat);
      var B = builderFor(matName);
      var sx = box.max.x - box.min.x, sy = box.max.y - box.min.y, sz = box.max.z - box.min.z;
      if (sx < 1e-4 || sy < 1e-4 || sz < 1e-4) continue;

      for (var f = 0; f < 6; f++) {
        var F = FACE_DEF[f];
        // never draw downward faces resting on the ground, or hidden interior faces
        if (F.n[1] < 0 && box.min.y <= 0.05) continue;
        if (faceHidden(world, box, f)) continue;

        // face plane basis
        var uAxis = F.uAxis, vAxis = F.vAxis;
        var uLen = [sx, sy, sz][uAxis], vLen = [sx, sy, sz][vAxis];
        var nu = Math.max(1, Math.min(24, Math.ceil(uLen / opts.grid)));
        var nv = Math.max(1, Math.min(24, Math.ceil(vLen / opts.grid)));

        // corner of the face in world space
        var o = [box.min.x, box.min.y, box.min.z];
        if (F.n[0] > 0) o[0] = box.max.x;
        if (F.n[1] > 0) o[1] = box.max.y;
        if (F.n[2] > 0) o[2] = box.max.z;

        var uStep = [0, 0, 0], vStep = [0, 0, 0];
        uStep[uAxis] = uLen / nu; vStep[vAxis] = vLen / nv;
        // Winding for the subdivided grid: triangle (p0,p1,p2) has normal U x V,
        // which points the wrong way for +X, +Y and -Z faces.
        var flip = (F.n[0] > 0 || F.n[1] > 0 || F.n[2] < 0);

        var us = mat.uvScale;
        for (var iu = 0; iu < nu; iu++) {
          for (var iv = 0; iv < nv; iv++) {
            var base = B.nv;
            for (var cIdx = 0; cIdx < 4; cIdx++) {
              var cu = iu + (cIdx === 1 || cIdx === 2 ? 1 : 0);
              var cv = iv + (cIdx === 2 || cIdx === 3 ? 1 : 0);
              var px = o[0] + uStep[0] * cu + vStep[0] * cv;
              var py = o[1] + uStep[1] * cu + vStep[1] * cv;
              var pz = o[2] + uStep[2] * cu + vStep[2] * cv;
              var L = light(px, py, pz, F.n[0], F.n[1], F.n[2]);
              var shade = L.ao;
              // hemisphere ambient: sky from above, warm bounce from the ground
              var sky = 0.5 + 0.5 * F.n[1];
              var amb = ambI * (0.52 + 0.58 * sky);
              var bounce = groundBounce * (1 - sky) * 0.5;
              var rr = (ambCol[0] * amb + groundCol[0] * bounce + sunCol[0] * sunI * L.lit) * shade;
              var gg = (ambCol[1] * amb + groundCol[1] * bounce + sunCol[1] * sunI * L.lit) * shade;
              var bb = (ambCol[2] * amb + groundCol[2] * bounce + sunCol[2] * sunI * L.lit) * shade;
              // world-projected UV keeps texture scale consistent across the map
              var tu, tv;
              if (Math.abs(F.n[1]) > 0.5) { tu = px * us; tv = pz * us; }
              else if (Math.abs(F.n[0]) > 0.5) { tu = pz * us; tv = py * us; }
              else { tu = px * us; tv = py * us; }
              B.vert(px, py, pz, F.n[0], F.n[1], F.n[2], rr, gg, bb, tu, tv);
            }
            if (flip) B.quad(base, base + 3, base + 2, base + 1);
            else B.quad(base, base + 1, base + 2, base + 3);
          }
        }
      }
    }

    var out = [], verts = 0, tris = 0;
    for (var key in groups) {
      var r = groups[key].result();
      if (!r.count) continue;
      r.mat = key;
      verts += r.vertexCount; tris += r.count / 3;
      out.push(r);
    }
    return {
      groups: out,
      stats: {
        ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0),
        verts: verts, tris: tris, rays: rays, groups: out.length
      }
    };
  };

  function hexToRgb(hex) {
    hex = (hex || '#ffffff').replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  Geo.hexToRgb = hexToRgb;

  /* ---------------------------------------------------------------
   * Props — small decorative meshes, merged into the map draw
   * ------------------------------------------------------------- */
  Geo.buildProps = function (map) {
    var B = new Builder('world');
    var brown = [0.42, 0.30, 0.18], green = [0.30, 0.44, 0.22], stone = [0.62, 0.60, 0.56];
    var cloth = [0.66, 0.28, 0.24], metal = [0.44, 0.47, 0.50];

    function boxAt(x0, x1, y0, y1, z0, z1, col) {
      var base;
      for (var f = 0; f < 6; f++) {
        var F = FACE_DEF[f];
        var shade = F.n[1] > 0 ? 1.06 : (F.n[1] < 0 ? 0.5 : (F.n[0] !== 0 ? 0.84 : 0.7));
        base = B.nv;
        for (var k = 0; k < 4; k++) {
          var p = F.v[k];
          B.vert(x0 + p[0] * (x1 - x0), y0 + p[1] * (y1 - y0), z0 + p[2] * (z1 - z0),
                 F.n[0], F.n[1], F.n[2], col[0] * shade, col[1] * shade, col[2] * shade, 0, 0);
        }
        B.quad(base, base + 1, base + 2, base + 3);
      }
    }

    for (var i = 0; i < map.props.length; i++) {
      var pr = map.props[i];
      var x = pr.x, y = pr.y, z = pr.z, s = pr.s || 1;
      switch (pr.type) {
        case 'palm':
        case 'tree':
          boxAt(x - 0.14 * s, x + 0.14 * s, y, y + 3.4 * s, z - 0.14 * s, z + 0.14 * s, brown);
          for (var f2 = 0; f2 < 6; f2++) {
            var a = f2 / 6 * Math.PI * 2 + pr.ry;
            var lx = x + Math.cos(a) * 1.1 * s, lz = z + Math.sin(a) * 1.1 * s;
            boxAt(Math.min(x, lx), Math.max(x, lx), y + 3.2 * s, y + 3.42 * s,
                  Math.min(z, lz), Math.max(z, lz), green);
          }
          break;
        case 'barrel':
          B.cylinder(x, y, z, 0.32 * s, 0.9 * s, 10, metal, 0);
          break;
        case 'stall':
          boxAt(x - 1.2 * s, x + 1.2 * s, y + 0.8 * s, y + 0.95 * s, z - 0.8 * s, z + 0.8 * s, brown);
          boxAt(x - 1.3 * s, x + 1.3 * s, y + 2.0 * s, y + 2.15 * s, z - 0.9 * s, z + 0.9 * s, cloth);
          boxAt(x - 1.15 * s, x - 1.0 * s, y, y + 2.0 * s, z - 0.75 * s, z - 0.6 * s, brown);
          boxAt(x + 1.0 * s, x + 1.15 * s, y, y + 2.0 * s, z + 0.6 * s, z + 0.75 * s, brown);
          break;
        case 'awning':
          boxAt(x - 1.6 * s, x + 1.6 * s, y, y + 0.12 * s, z - 0.9 * s, z + 0.9 * s, cloth);
          break;
        case 'arch':
          boxAt(x - 1.4 * s, x - 1.1 * s, y, y + 2.6 * s, z - 0.2 * s, z + 0.2 * s, stone);
          boxAt(x + 1.1 * s, x + 1.4 * s, y, y + 2.6 * s, z - 0.2 * s, z + 0.2 * s, stone);
          boxAt(x - 1.5 * s, x + 1.5 * s, y + 2.6 * s, y + 3.0 * s, z - 0.25 * s, z + 0.25 * s, stone);
          break;
        case 'lamp':
          boxAt(x - 0.07, x + 0.07, y, y + 3.0 * s, z - 0.07, z + 0.07, metal);
          boxAt(x - 0.22, x + 0.22, y + 3.0 * s, y + 3.3 * s, z - 0.22, z + 0.22, [1.0, 0.92, 0.7]);
          break;
        case 'pipe':
          B.cylinder(x, y, z, 0.22 * s, 4.4 * s, 8, metal, 0);
          break;
        case 'crane':
          boxAt(x - 0.3, x + 0.3, y, y + 7.5, z - 0.3, z + 0.3, [0.72, 0.56, 0.14]);
          boxAt(x - 0.3, x + 6.5, y + 7.2, y + 7.6, z - 0.3, z + 0.3, [0.72, 0.56, 0.14]);
          break;
        case 'fountain':
          B.cylinder(x, y - 1.4, z, 0.35 * s, 1.4 * s, 10, stone, 0);
          break;
        case 'planter':
          boxAt(x - 0.8 * s, x + 0.8 * s, y, y + 0.55 * s, z - 0.8 * s, z + 0.8 * s, stone);
          boxAt(x - 0.6 * s, x + 0.6 * s, y + 0.55 * s, y + 1.0 * s, z - 0.6 * s, z + 0.6 * s, green);
          break;
      }
    }
    return B.result();
  };

  CS.Geo = Geo;
})(typeof window !== 'undefined' ? window : globalThis);
