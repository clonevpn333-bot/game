/* =============================================================
 * BREACHPOINT — procedural material textures
 *
 * One tiling 256px albedo per surface type, drawn with canvas 2D.
 * No image files, and every material reads as itself at a glance —
 * which is what makes a blocky world look built rather than untextured.
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});
  var Tex = {};
  var S = 256;

  function canvas() {
    var c = root.document.createElement('canvas');
    c.width = c.height = S;
    return c;
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* Value noise that wraps, so the tile has no visible seam. */
  function noiseField(cell, octaves) {
    var grid = [];
    for (var o = 0; o < octaves; o++) {
      var n = cell << o;
      var g = new Float32Array(n * n);
      for (var i = 0; i < n * n; i++) g[i] = Math.random();
      grid.push({ n: n, g: g });
    }
    return function (x, y) {
      var sum = 0, amp = 1, norm = 0;
      for (var o = 0; o < grid.length; o++) {
        var L = grid[o], n = L.n;
        var fx = x * n, fy = y * n;
        var x0 = Math.floor(fx) % n, y0 = Math.floor(fy) % n;
        var x1 = (x0 + 1) % n, y1 = (y0 + 1) % n;
        var tx = fx - Math.floor(fx), ty = fy - Math.floor(fy);
        tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        var a = L.g[y0 * n + x0], b = L.g[y0 * n + x1];
        var c = L.g[y1 * n + x0], d = L.g[y1 * n + x1];
        sum += (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty) * amp;
        norm += amp; amp *= 0.5;
      }
      return sum / norm;
    };
  }

  /* Fill the canvas from a per-pixel shading function. */
  function paint(ctx, fn) {
    var img = ctx.createImageData(S, S), d = img.data;
    for (var y = 0; y < S; y++) {
      for (var x = 0; x < S; x++) {
        var c = fn(x, y, x / S, y / S);
        var i = (y * S + x) * 4;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  function shade(base, k) {
    return [Math.max(0, Math.min(255, base[0] * k)),
            Math.max(0, Math.min(255, base[1] * k)),
            Math.max(0, Math.min(255, base[2] * k))];
  }
  /* Lines that wrap across the tile edge. */
  function wrapLine(ctx, x0, y0, x1, y1) {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    for (var dx = -S; dx <= S; dx += S) {
      for (var dy = -S; dy <= S; dy += S) {
        if (!dx && !dy) continue;
        ctx.beginPath(); ctx.moveTo(x0 + dx, y0 + dy); ctx.lineTo(x1 + dx, y1 + dy); ctx.stroke();
      }
    }
  }

  var BUILDERS = {};

  /* ---------------- concrete ---------------- */
  BUILDERS.concrete = function (ctx) {
    var base = [150, 146, 139];
    var fine = noiseField(32, 3), blot = noiseField(3, 2);
    paint(ctx, function (x, y, u, v) {
      var k = 0.86 + fine(u, v) * 0.20 + (blot(u, v) - 0.5) * 0.16;
      // horizontal form-board seams every 64 px
      var band = y % 64;
      if (band < 2) k *= 0.80;
      else if (band < 4) k *= 1.04;
      return shade(base, k);
    });
    ctx.strokeStyle = 'rgba(70,68,64,0.45)';
    for (var c = 0; c < 5; c++) {
      ctx.lineWidth = rnd(0.6, 1.6);
      var px = rnd(0, S), py = rnd(0, S);
      for (var seg = 0; seg < 5; seg++) {
        var nx = px + rnd(-40, 40), ny = py + rnd(-40, 40);
        wrapLine(ctx, px, py, nx, ny);
        px = nx; py = ny;
      }
    }
    // pitted spots
    for (var p = 0; p < 90; p++) {
      ctx.fillStyle = 'rgba(96,93,88,' + rnd(0.10, 0.30) + ')';
      ctx.beginPath(); ctx.arc(rnd(0, S), rnd(0, S), rnd(0.8, 3.2), 0, 6.283); ctx.fill();
    }
  };

  /* ---------------- sand ---------------- */
  BUILDERS.sand = function (ctx) {
    var base = [206, 182, 133];
    var grain = noiseField(64, 2), dune = noiseField(4, 3);
    paint(ctx, function (x, y, u, v) {
      var ripple = Math.sin((u * 9 + dune(u, v) * 2.2) * 6.283) * 0.045;
      var k = 0.90 + grain(u, v) * 0.14 + (dune(u, v) - 0.5) * 0.14 + ripple;
      return shade(base, k);
    });
    for (var p = 0; p < 150; p++) {
      var g = rnd(0.5, 1.0);
      ctx.fillStyle = 'rgba(' + (120 * g | 0) + ',' + (108 * g | 0) + ',' + (86 * g | 0) + ',' + rnd(0.12, 0.34) + ')';
      ctx.beginPath(); ctx.arc(rnd(0, S), rnd(0, S), rnd(0.7, 2.4), 0, 6.283); ctx.fill();
    }
  };

  /* ---------------- wood planks ---------------- */
  BUILDERS.wood = function (ctx) {
    var base = [143, 94, 52];
    var grain = noiseField(8, 3);
    var PLANK = 64;
    paint(ctx, function (x, y, u, v) {
      var plank = Math.floor(y / PLANK);
      var tone = 0.86 + ((plank * 37) % 7) / 7 * 0.26;
      // grain runs along the plank, warped so it is not stripy
      var warp = grain(u * 0.6, v * 3) * 22;
      var g = Math.sin((x + warp) * 0.42) * 0.5 + 0.5;
      var k = tone * (0.88 + g * 0.16 + grain(u * 3, v * 8) * 0.10);
      var edge = y % PLANK;
      if (edge < 2) k *= 0.62;
      else if (edge < 4) k *= 1.06;
      return shade(base, k);
    });
    // knots
    for (var n = 0; n < 5; n++) {
      var kx = rnd(0, S), ky = Math.floor(rnd(0, 4)) * 64 + rnd(16, 48);
      for (var r = 9; r > 0; r -= 1.4) {
        ctx.strokeStyle = 'rgba(78,46,22,' + (0.10 + r * 0.02) + ')';
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.ellipse(kx, ky, r * 1.5, r, 0, 0, 6.283); ctx.stroke();
      }
    }
  };

  /* ---------------- crate ---------------- */
  BUILDERS.crate = function (ctx) {
    var base = [176, 126, 68];
    var grain = noiseField(8, 3);
    var PLANK = 42;
    paint(ctx, function (x, y, u, v) {
      var plank = Math.floor(y / PLANK);
      var tone = 0.88 + ((plank * 53) % 5) / 5 * 0.22;
      var g = Math.sin((x + grain(u, v * 4) * 18) * 0.5) * 0.5 + 0.5;
      var k = tone * (0.90 + g * 0.14 + grain(u * 4, v * 6) * 0.08);
      var edge = y % PLANK;
      if (edge < 2) k *= 0.55;
      else if (edge < 4) k *= 1.10;
      return shade(base, k);
    });
    // corner banding and nails
    ctx.fillStyle = 'rgba(92,64,32,0.55)';
    ctx.fillRect(0, 0, 10, S); ctx.fillRect(S - 10, 0, 10, S);
    for (var r = 0; r < 6; r++) {
      for (var c = 0; c < 2; c++) {
        var nx = c ? S - 5 : 5, ny = r * 42 + 21;
        ctx.fillStyle = 'rgba(220,214,200,0.6)';
        ctx.beginPath(); ctx.arc(nx, ny, 1.8, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(40,30,18,0.5)';
        ctx.beginPath(); ctx.arc(nx + 0.7, ny + 0.7, 1.6, 0, 6.283); ctx.fill();
      }
    }
  };

  /* ---------------- painted metal panels ---------------- */
  BUILDERS.metal = function (ctx) {
    var base = [125, 134, 143];
    var grit = noiseField(48, 2), stain = noiseField(4, 2);
    paint(ctx, function (x, y, u, v) {
      var k = 0.90 + grit(u, v) * 0.10 + (stain(u, v) - 0.5) * 0.20;
      // panel seams
      if (x % 128 < 2 || y % 128 < 2) k *= 0.66;
      else if (x % 128 < 4 || y % 128 < 4) k *= 1.08;
      // brushed streaks
      k *= 0.97 + Math.sin(y * 1.7 + grit(u, v) * 6) * 0.03;
      return shade(base, k);
    });
    // rivets at the panel corners
    for (var gx = 0; gx < 2; gx++) {
      for (var gy = 0; gy < 2; gy++) {
        for (var i = 0; i < 5; i++) {
          var rx = gx * 128 + 12 + i * 26, ry = gy * 128 + 12;
          [[rx, ry], [rx, ry + 104]].forEach(function (pt) {
            ctx.fillStyle = 'rgba(180,190,200,0.75)';
            ctx.beginPath(); ctx.arc(pt[0], pt[1], 2.2, 0, 6.283); ctx.fill();
            ctx.fillStyle = 'rgba(60,66,74,0.55)';
            ctx.beginPath(); ctx.arc(pt[0] + 0.8, pt[1] + 0.9, 2.0, 0, 6.283); ctx.fill();
          });
        }
      }
    }
    // rust streaks
    for (var s = 0; s < 8; s++) {
      var sx = rnd(0, S), sy = rnd(0, S);
      var grd = ctx.createLinearGradient(sx, sy, sx, sy + rnd(20, 70));
      grd.addColorStop(0, 'rgba(126,74,38,0.30)');
      grd.addColorStop(1, 'rgba(126,74,38,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(sx - 2, sy, rnd(2, 6), 70);
    }
  };

  /* ---------------- steel / diamond plate ---------------- */
  BUILDERS.steel = function (ctx) {
    var base = [110, 117, 126];
    var grit = noiseField(48, 2);
    paint(ctx, function (x, y, u, v) {
      var k = 0.92 + grit(u, v) * 0.12;
      // diamond tread
      var cx = ((x + (Math.floor(y / 32) % 2) * 16) % 32) - 16;
      var cy = (y % 32) - 16;
      var d = Math.abs(cx) * 0.7 + Math.abs(cy);
      if (d < 11) k *= 1.0 + (11 - d) * 0.022;
      if (d > 11 && d < 13) k *= 0.82;
      return shade(base, k);
    });
  };

  /* ---------------- tile ---------------- */
  BUILDERS.tile = function (ctx) {
    var base = [186, 180, 168];
    var speck = noiseField(32, 2), blot = noiseField(4, 2);
    var T = 64;
    paint(ctx, function (x, y, u, v) {
      var tx = Math.floor(x / T), ty = Math.floor(y / T);
      var tone = 0.90 + ((tx * 7 + ty * 13) % 6) / 6 * 0.18;
      var k = tone * (0.94 + speck(u, v) * 0.08 + (blot(u, v) - 0.5) * 0.10);
      var ex = x % T, ey = y % T;
      if (ex < 3 || ey < 3) k *= 0.70;                       // grout
      else if (ex < 5 || ey < 5) k *= 1.05;                  // bevel highlight
      return shade(base, k);
    });
  };

  /* ---------------- grass ---------------- */
  BUILDERS.grass = function (ctx) {
    var base = [94, 118, 66];
    var patch = noiseField(6, 3), fine = noiseField(48, 2);
    paint(ctx, function (x, y, u, v) {
      var k = 0.80 + patch(u, v) * 0.36 + fine(u, v) * 0.14;
      return shade(base, k);
    });
    for (var b = 0; b < 400; b++) {
      var g = rnd(0.7, 1.3);
      ctx.strokeStyle = 'rgba(' + (86 * g | 0) + ',' + (116 * g | 0) + ',' + (58 * g | 0) + ',0.5)';
      ctx.lineWidth = 1;
      var bx = rnd(0, S), by = rnd(0, S);
      wrapLine(ctx, bx, by, bx + rnd(-2, 2), by - rnd(3, 7));
    }
  };

  /* ---------------- glass ---------------- */
  BUILDERS.glass = function (ctx) {
    var base = [178, 208, 222];
    var smear = noiseField(4, 2);
    paint(ctx, function (x, y, u, v) {
      var k = 0.95 + (smear(u, v) - 0.5) * 0.14 + Math.sin((u + v) * 12) * 0.02;
      return shade(base, k);
    });
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 2;
    for (var i = 0; i < 4; i++) wrapLine(ctx, rnd(0, S), 0, rnd(0, S), S);
  };

  /* ---------------- water ---------------- */
  BUILDERS.water = function (ctx) {
    var base = [76, 126, 150];
    var wave = noiseField(6, 3);
    paint(ctx, function (x, y, u, v) {
      var k = 0.88 + Math.sin((u * 7 + wave(u, v) * 3) * 6.283) * 0.07 +
              Math.sin((v * 9 + wave(v, u) * 3) * 6.283) * 0.05 + wave(u, v) * 0.10;
      return shade(base, k);
    });
  };

  /* Build every material once and hand back a map of canvases. */
  Tex.buildAll = function () {
    var out = {};
    for (var name in BUILDERS) {
      var c = canvas();
      var ctx = c.getContext('2d');
      BUILDERS[name](ctx);
      out[name] = c;
    }
    return out;
  };
  Tex.names = function () { return Object.keys(BUILDERS); };

  CS.Tex = Tex;
})(typeof window !== 'undefined' ? window : globalThis);
