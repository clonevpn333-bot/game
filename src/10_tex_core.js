/* =========================================================================
 * TEXTURE BAKER — every block tile is painted at runtime into a 16x16 RGBA
 * buffer, so the game ships with no image assets at all.  Tiles are uploaded
 * as a GL_TEXTURE_2D_ARRAY (one layer per tile) which gives clean mipmaps
 * with zero atlas bleeding.
 *
 * A small pixel-art DSL (the P object) keeps each painter to a few lines.
 * ========================================================================= */

var TS = 16;                    // tile edge in texels
var TEX_LAYERS = [];            // layer index -> Uint8Array(TS*TS*4)
var TEX_INDEX = {};             // descriptor key -> layer index
var TEX_META = [];              // layer index -> {avg:[r,g,b], hasAlpha:bool}

/* ------------------------------------------------------------ paint DSL -- */
function Pain() { this.d = new Uint8Array(TS * TS * 4); this.rng = makeRNG(1); }
Pain.prototype.seed = function (s) { this.rng = makeRNG(s >>> 0); return this; };
Pain.prototype.set = function (x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= TS || y >= TS) return;
  var i = (y * TS + x) * 4;
  this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = a === undefined ? 255 : a;
};
Pain.prototype.get = function (x, y) {
  x = ((x % TS) + TS) % TS; y = ((y % TS) + TS) % TS;
  var i = (y * TS + x) * 4;
  return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]];
};
Pain.prototype.px = function (x, y, c, a) { var v = col(c); this.set(x, y, v[0], v[1], v[2], a); return this; };
Pain.prototype.blend = function (x, y, c, t) {
  if (x < 0 || y < 0 || x >= TS || y >= TS) return this;
  var v = col(c), i = (y * TS + x) * 4;
  this.d[i] = this.d[i] + (v[0] - this.d[i]) * t;
  this.d[i + 1] = this.d[i + 1] + (v[1] - this.d[i + 1]) * t;
  this.d[i + 2] = this.d[i + 2] + (v[2] - this.d[i + 2]) * t;
  if (this.d[i + 3] < 255) this.d[i + 3] = Math.max(this.d[i + 3], 255 * t);
  return this;
};
Pain.prototype.fill = function (c, a) {
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) this.px(x, y, c, a);
  return this;
};
Pain.prototype.clear = function () { this.d.fill(0); return this; };
Pain.prototype.rect = function (x, y, w, h, c, a) {
  for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) this.px(i, j, c, a);
  return this;
};
Pain.prototype.frame = function (x, y, w, h, c) {
  this.rect(x, y, w, 1, c); this.rect(x, y + h - 1, w, 1, c);
  this.rect(x, y, 1, h, c); this.rect(x + w - 1, y, 1, h, c);
  return this;
};
Pain.prototype.hline = function (y, c, x0, x1) { this.rect(x0 || 0, y, (x1 === undefined ? TS : x1) - (x0 || 0), 1, c); return this; };
Pain.prototype.vline = function (x, c, y0, y1) { this.rect(x, y0 || 0, 1, (y1 === undefined ? TS : y1) - (y0 || 0), c); return this; };
/* per-pixel brightness jitter — the backbone of every "stone-ish" tile */
Pain.prototype.noise = function (amt, scale) {
  scale = scale || 1;
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
    var i = (y * TS + x) * 4;
    if (this.d[i + 3] === 0) continue;
    var n = (this.rng() - 0.5) * 2 * amt * 255;
    this.d[i] = clamp(this.d[i] + n, 0, 255);
    this.d[i + 1] = clamp(this.d[i + 1] + n, 0, 255);
    this.d[i + 2] = clamp(this.d[i + 2] + n, 0, 255);
  }
  return this;
};
/* correlated blotches — reads much more like real rock than white noise */
Pain.prototype.blotch = function (amt, n, rad) {
  n = n || 8; rad = rad || 3.2;
  var pts = [];
  for (var k = 0; k < n; k++) pts.push([this.rng() * TS, this.rng() * TS, (this.rng() - 0.5) * 2 * amt]);
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
    var i = (y * TS + x) * 4;
    if (this.d[i + 3] === 0) continue;
    var s = 0;
    for (var p = 0; p < pts.length; p++) {
      var dx = x - pts[p][0], dy = y - pts[p][1];
      if (dx > TS / 2) dx -= TS; if (dx < -TS / 2) dx += TS;
      if (dy > TS / 2) dy -= TS; if (dy < -TS / 2) dy += TS;
      var d2v = dx * dx + dy * dy;
      s += pts[p][2] * Math.exp(-d2v / (rad * rad));
    }
    var v = s * 255;
    this.d[i] = clamp(this.d[i] + v, 0, 255);
    this.d[i + 1] = clamp(this.d[i + 1] + v, 0, 255);
    this.d[i + 2] = clamp(this.d[i + 2] + v, 0, 255);
  }
  return this;
};
Pain.prototype.speckle = function (c, count, size, alpha) {
  for (var k = 0; k < count; k++) {
    var x = (this.rng() * TS) | 0, y = (this.rng() * TS) | 0;
    var s = size || 1;
    for (var j = 0; j < s; j++) for (var i = 0; i < s; i++) {
      if (alpha !== undefined) this.blend(x + i, y + j, c, alpha);
      else this.px(x + i, y + j, c);
    }
  }
  return this;
};
Pain.prototype.shadeEdges = function (light, dark) {
  light = light === undefined ? 0.10 : light; dark = dark === undefined ? 0.14 : dark;
  for (var x = 0; x < TS; x++) { this.mul(x, 0, 1 + light); this.mul(x, TS - 1, 1 - dark); }
  for (var y = 1; y < TS - 1; y++) { this.mul(0, y, 1 + light * 0.6); this.mul(TS - 1, y, 1 - dark * 0.6); }
  return this;
};
Pain.prototype.mul = function (x, y, f) {
  if (x < 0 || y < 0 || x >= TS || y >= TS) return this;
  var i = (y * TS + x) * 4;
  this.d[i] = clamp(this.d[i] * f, 0, 255);
  this.d[i + 1] = clamp(this.d[i + 1] * f, 0, 255);
  this.d[i + 2] = clamp(this.d[i + 2] * f, 0, 255);
  return this;
};
Pain.prototype.mulRect = function (x, y, w, h, f) {
  for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) this.mul(i, j, f);
  return this;
};
Pain.prototype.disc = function (cx, cy, r, c, a) {
  for (var y = Math.floor(cy - r); y <= cy + r; y++) for (var x = Math.floor(cx - r); x <= cx + r; x++) {
    var dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy <= r * r) this.px(x, y, c, a);
  }
  return this;
};
Pain.prototype.ring = function (cx, cy, r, c, w) {
  w = w || 1;
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
    var dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.sqrt(dx * dx + dy * dy);
    if (Math.abs(d - r) < w * 0.5) this.px(x, y, c);
  }
  return this;
};
/* random walk used for cracks, veins, roots and vines */
Pain.prototype.walk = function (x, y, len, c, dirBias, wrap) {
  var a = this.rng() * Math.PI * 2;
  for (var i = 0; i < len; i++) {
    a += (this.rng() - 0.5) * 1.4 + (dirBias || 0);
    x += Math.cos(a); y += Math.sin(a);
    var ix = Math.round(x), iy = Math.round(y);
    if (wrap) { ix = mod(ix, TS); iy = mod(iy, TS); }
    this.px(ix, iy, c);
  }
  return this;
};
Pain.prototype.copy = function (o) { this.d.set(o.d); return this; };
Pain.prototype.overlay = function (o) {
  for (var i = 0; i < this.d.length; i += 4) {
    var a = o.d[i + 3] / 255;
    if (a <= 0) continue;
    this.d[i] = this.d[i] * (1 - a) + o.d[i] * a;
    this.d[i + 1] = this.d[i + 1] * (1 - a) + o.d[i + 1] * a;
    this.d[i + 2] = this.d[i + 2] * (1 - a) + o.d[i + 2] * a;
    this.d[i + 3] = Math.max(this.d[i + 3], o.d[i + 3]);
  }
  return this;
};
/* mirror left half onto right half — most MC tiles are not symmetric, but
   fixtures like doors, anvils and torches read better when they are. */
Pain.prototype.mirrorX = function () {
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS / 2; x++) {
    var s = (y * TS + x) * 4, t = (y * TS + (TS - 1 - x)) * 4;
    this.d[t] = this.d[s]; this.d[t + 1] = this.d[s + 1]; this.d[t + 2] = this.d[s + 2]; this.d[t + 3] = this.d[s + 3];
  }
  return this;
};

/* ------------------------------------------------------------- colours -- */
var _colCache = {};
function col(c) {
  if (typeof c !== 'string') return c;
  var v = _colCache[c];
  if (v) return v;
  v = [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)];
  _colCache[c] = v;
  return v;
}
function shade(c, f) {
  var v = col(c);
  return '#' + [0, 1, 2].map(function (i) {
    var n = clamp(Math.round(v[i] * f), 0, 255).toString(16);
    return n.length < 2 ? '0' + n : n;
  }).join('');
}
function mix(a, b, t) {
  var x = col(a), y = col(b);
  return '#' + [0, 1, 2].map(function (i) {
    var n = clamp(Math.round(x[i] + (y[i] - x[i]) * t), 0, 255).toString(16);
    return n.length < 2 ? '0' + n : n;
  }).join('');
}
function hsvShift(c, dh, ds, dv) {
  var v = col(c), r = v[0] / 255, g = v[1] / 255, b = v[2] / 255;
  var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  var h = 0, s = mx === 0 ? 0 : d / mx, val = mx;
  if (d !== 0) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6; if (h < 0) h += 1;
  }
  h = fract(h + dh); s = clamp(s * (1 + ds), 0, 1); val = clamp(val * (1 + dv), 0, 1);
  var i = Math.floor(h * 6), f = h * 6 - i, p = val * (1 - s), q = val * (1 - f * s), t2 = val * (1 - (1 - f) * s);
  var rr, gg, bb;
  switch (i % 6) {
    case 0: rr = val; gg = t2; bb = p; break;
    case 1: rr = q; gg = val; bb = p; break;
    case 2: rr = p; gg = val; bb = t2; break;
    case 3: rr = p; gg = q; bb = val; break;
    case 4: rr = t2; gg = p; bb = val; break;
    default: rr = val; gg = p; bb = q;
  }
  return '#' + [rr, gg, bb].map(function (x) {
    var n = clamp(Math.round(x * 255), 0, 255).toString(16); return n.length < 2 ? '0' + n : n;
  }).join('');
}

/* =========================== GENERIC PAINTERS =========================== */
var PAINT = {};

PAINT.solid = function (p, o) {
  p.fill(o.c).noise(o.v).blotch(o.v * 0.5, 5, 4);
  return p;
};
PAINT.grain = function (p, o) {
  p.fill(o.c);
  for (var x = 0; x < TS; x++) {
    var f = 1 + (p.rng() - 0.5) * o.v * 2.4;
    for (var y = 0; y < TS; y++) p.mul(o.d === 'h' ? y : x, o.d === 'h' ? x : y, f);
  }
  p.noise(o.v * 0.5);
  return p;
};
PAINT.speck = function (p, o) {
  p.fill(o.c).noise(0.035).blotch(0.05, 6, 3.6);
  for (var k = 0; k < o.n; k++) {
    var x = (p.rng() * TS) | 0, y = (p.rng() * TS) | 0;
    var s = o.sz + (p.rng() < 0.25 ? 1 : 0);
    var c = p.rng() < 0.5 ? o.c2 : mix(o.c, o.c2, 0.5);
    for (var j = 0; j < s; j++) for (var i = 0; i < s; i++) p.blend(x + i, y + j, c, 0.7 + p.rng() * 0.3);
  }
  return p;
};
PAINT.planks = function (p, o) {
  var rows = [0, 4, 9, 13, 16];
  p.fill(o.c);
  for (var r = 0; r < rows.length - 1; r++) {
    var y0 = rows[r], y1 = rows[r + 1];
    var tone = 1 + (r % 2 ? -0.055 : 0.045) + (p.rng() - 0.5) * 0.05;
    for (var y = y0; y < y1; y++) for (var x = 0; x < TS; x++) p.mul(x, y, tone);
    /* wood grain streaks */
    for (var g = 0; g < 5; g++) {
      var gy = y0 + 1 + ((p.rng() * (y1 - y0 - 1)) | 0);
      var x0 = (p.rng() * TS) | 0, len = 3 + ((p.rng() * 8) | 0);
      for (var i = 0; i < len; i++) p.blend((x0 + i) % TS, gy, o.d, 0.35 + p.rng() * 0.25);
    }
    /* seam */
    if (r > 0) for (var x2 = 0; x2 < TS; x2++) p.px(x2, y0, shade(o.d, 0.8));
    /* plank butt joint */
    var jx = 2 + ((p.rng() * 12) | 0);
    for (var y3 = y0; y3 < y1; y3++) p.blend(jx, y3, shade(o.d, 0.85), 0.8);
  }
  p.noise(0.022);
  return p;
};
PAINT.logside = function (p, o) {
  p.fill(o.c);
  for (var x = 0; x < TS; x++) {
    var f = 1 + (p.rng() - 0.5) * 0.24;
    for (var y = 0; y < TS; y++) p.mul(x, y, f);
  }
  for (var k = 0; k < 7; k++) {
    var x2 = (p.rng() * TS) | 0, y0 = (p.rng() * TS) | 0, len = 4 + ((p.rng() * 10) | 0);
    for (var i = 0; i < len; i++) p.blend(x2, (y0 + i) % TS, o.d, 0.45);
  }
  p.noise(0.035);
  return p;
};
PAINT.logtop = function (p, o) {
  p.fill(o.c).noise(0.03);
  var cx = 8, cy = 8;
  for (var r = 1.5; r < 8; r += 1.7) p.ring(cx, cy, r + (p.rng() - 0.5) * 0.4, mix(o.c, o.d, 0.55), 1);
  p.disc(cx, cy, 1.2, mix(o.c, o.d, 0.8));
  p.frame(0, 0, 16, 16, o.d);
  p.noise(0.03);
  return p;
};
PAINT.ore = function (p, o) {
  bakeInto(p, o.b);
  var n = o.n;
  for (var k = 0; k < n; k++) {
    var cx = 1 + p.rng() * 14, cy = 1 + p.rng() * 14, r = 1.1 + p.rng() * 1.3;
    p.disc(cx, cy, r, o.g);
    p.disc(cx - 0.4, cy - 0.4, r * 0.55, shade(o.g, 1.35));
    /* dark contact shadow keeps ore blobs from floating */
    p.blend(Math.round(cx + r * 0.6), Math.round(cy + r * 0.6), '#000000', 0.35);
  }
  return p;
};
PAINT.brick = function (p, o) {
  p.fill(o.m);
  var rows = 4, h = 4;
  for (var r = 0; r < rows; r++) {
    var off = (r % 2) * 8;
    for (var b = 0; b < 2; b++) {
      var x0 = mod(off + b * 8, 16), y0 = r * h;
      for (var y = y0; y < y0 + h - 1; y++) for (var i = 0; i < 7; i++) {
        p.px(mod(x0 + i, 16), y, o.c);
      }
      var t = 1 + (p.rng() - 0.5) * o.sh * 2;
      for (var y2 = y0; y2 < y0 + h - 1; y2++) for (var i2 = 0; i2 < 7; i2++) p.mul(mod(x0 + i2, 16), y2, t);
      for (var i3 = 0; i3 < 7; i3++) p.mul(mod(x0 + i3, 16), y0, 1.08);
      for (var y3 = y0; y3 < y0 + h - 1; y3++) p.mul(mod(x0, 16), y3, 1.06);
    }
  }
  p.noise(0.03);
  return p;
};
PAINT.tiles = function (p, o) {
  p.fill(o.m);
  var s = TS / o.n;
  for (var ty = 0; ty < o.n; ty++) for (var tx = 0; tx < o.n; tx++) {
    var t = 1 + (p.rng() - 0.5) * 0.16;
    for (var y = 0; y < s - 1; y++) for (var x = 0; x < s - 1; x++) {
      p.px(tx * s + x, ty * s + y, o.c); p.mul(tx * s + x, ty * s + y, t);
    }
    for (var x2 = 0; x2 < s - 1; x2++) p.mul(tx * s + x2, ty * s, 1.09);
  }
  p.noise(0.03);
  return p;
};
PAINT.cobble = function (p, o) {
  p.fill(o.d);
  var cells = [];
  for (var k = 0; k < 11; k++) cells.push([p.rng() * TS, p.rng() * TS, 0.82 + p.rng() * 0.42]);
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
    var best = 1e9, second = 1e9, bi = 0;
    for (var i = 0; i < cells.length; i++) {
      var dx = x + 0.5 - cells[i][0], dy = y + 0.5 - cells[i][1];
      if (dx > TS / 2) dx -= TS; if (dx < -TS / 2) dx += TS;
      if (dy > TS / 2) dy -= TS; if (dy < -TS / 2) dy += TS;
      var dd = dx * dx + dy * dy;
      if (dd < best) { second = best; best = dd; bi = i; } else if (dd < second) second = dd;
    }
    var edge = Math.sqrt(second) - Math.sqrt(best);
    if (edge > 0.85) p.px(x, y, shade(o.c, cells[bi][2]));
    else if (edge > 0.45) p.px(x, y, shade(o.c, cells[bi][2] * 0.78));
  }
  p.noise(0.05);
  return p;
};
PAINT.cracked = function (p, o) {
  bakeInto(p, o.b);
  for (var k = 0; k < 4; k++) p.walk(p.rng() * TS, p.rng() * TS, 9 + p.rng() * 8, o.c, 0, true);
  return p;
};
PAINT.mossy = function (p, o) {
  bakeInto(p, o.b);
  var moss = ['#5d7b34', '#4b6a2a', '#6a8a3d'];
  for (var k = 0; k < 26; k++) {
    var x = (p.rng() * TS) | 0, y = (p.rng() * TS) | 0, r = 1 + p.rng() * 2;
    p.disc(x, y, r, moss[(p.rng() * 3) | 0], 255);
  }
  p.noise(0.04);
  return p;
};
PAINT.wool = function (p, o) {
  p.fill(o.c).noise(0.05);
  for (var k = 0; k < 30; k++) {
    var x = (p.rng() * TS) | 0, y = (p.rng() * TS) | 0;
    p.blend(x, y, shade(o.c, 1.13), 0.7);
    p.blend((x + 1) % TS, y, shade(o.c, 0.88), 0.5);
  }
  p.blotch(0.03, 6, 3);
  return p;
};
PAINT.terra = function (p, o) {
  p.fill(o.c).noise(0.04);
  for (var y = 0; y < TS; y++) {
    var f = 1 + (p.rng() - 0.5) * 0.1;
    for (var x = 0; x < TS; x++) p.mul(x, y, f);
  }
  p.speckle(shade(o.c, 0.8), 22, 1, 0.5);
  p.speckle(shade(o.c, 1.15), 16, 1, 0.4);
  return p;
};
PAINT.glazed = function (p, o) {
  var base = mix(o.c, '#ffffff', 0.25);
  p.fill(base).noise(0.02);
  var s = o.n % 8;
  /* eight simple deterministic motifs, rotated per colour */
  if (s === 0) { p.rect(2, 2, 12, 12, o.c); p.rect(5, 5, 6, 6, base); }
  else if (s === 1) { for (var i = 0; i < 16; i += 4) p.rect(i, 0, 2, 16, o.c); }
  else if (s === 2) { p.disc(8, 8, 6, o.c); p.disc(8, 8, 3, base); }
  else if (s === 3) { for (var y = 0; y < 16; y++) p.rect(mod(y * 2, 16), y, 4, 1, o.c); }
  else if (s === 4) { p.frame(1, 1, 14, 14, o.c); p.frame(4, 4, 8, 8, o.c); p.disc(8, 8, 2, o.c); }
  else if (s === 5) { p.rect(0, 0, 8, 8, o.c); p.rect(8, 8, 8, 8, o.c); }
  else if (s === 6) { for (var k = 0; k < 16; k++) { p.px(k, k, o.c); p.px(15 - k, k, o.c); p.px(k, 8, o.c); } }
  else { p.disc(4, 4, 3, o.c); p.disc(12, 12, 3, o.c); p.disc(12, 4, 2, o.c); p.disc(4, 12, 2, o.c); }
  p.noise(0.02);
  return p;
};
PAINT.glass = function (p, o) {
  p.clear();
  var tintA = o.a ? 0.42 : 0.0;
  if (o.a) p.fill(o.c, Math.round(255 * 0.42));
  p.frame(0, 0, 16, 16, o.a ? shade(o.c, 0.85) : '#c9d6e0');
  for (var x = 0; x < TS; x++) { p.px(x, 0, o.a ? shade(o.c, 1.1) : '#dfeaf2', 210); }
  /* highlight streak */
  for (var i = 0; i < 6; i++) p.px(3 + i, 3 + i, '#ffffff', o.a ? 150 : 110);
  for (var i2 = 0; i2 < 3; i2++) p.px(10 + i2, 3 + i2, '#ffffff', o.a ? 110 : 80);
  return p;
};
PAINT.pane = function (p, o) {
  PAINT.glass(p, o);
  return p;
};
PAINT.leaves = function (p, o) {
  p.clear();
  var pal = [o.c, o.d, mix(o.c, '#ffffff', 0.16), shade(o.d, 0.82)];
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
    var n = rand2(x * 7 + 3, y * 13 + 5, 991);
    if (n < 0.10) continue;                       // gaps so leaves read as foliage
    p.px(x, y, pal[(rand2(x, y, 55) * 4) | 0]);
  }
  /* leaf clumps: brighter cores, darker rims */
  for (var k = 0; k < 8; k++) {
    var cx = p.rng() * TS, cy = p.rng() * TS;
    p.disc(cx, cy, 1.5, mix(o.c, '#ffffff', 0.2));
    p.blend(Math.round(cx + 1), Math.round(cy + 1), '#000000', 0.28);
  }
  p.noise(0.05);
  return p;
};
PAINT.crop = function (p, o) {
  p.clear();
  var stems = [2, 6, 10, 14];
  for (var s = 0; s < stems.length; s++) {
    var x = stems[s];
    var top = 15 - Math.round(3 + o.g * 1.4 + (p.rng() * 2));
    for (var y = 15; y >= top; y--) {
      p.px(x, y, o.c);
      if (y < top + 4 && o.g > 3) { p.px(x - 1, y, shade(o.c, 0.85)); p.px(x + 1, y, shade(o.c, 0.9)); }
    }
    p.px(x, top - 1, shade(o.c, 1.2));
  }
  return p;
};
PAINT.liquid = function (p, o) {
  p.fill(o.c);
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
    var n = Math.sin(x * 0.9 + y * 0.35) * 0.5 + Math.sin(y * 1.3 - x * 0.2) * 0.5;
    p.blend(x, y, o.c2, 0.16 + n * 0.16);
  }
  p.noise(0.02);
  return p;
};
PAINT.metal = function (p, o) {
  p.fill(o.c);
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
    var v = Math.sin((x + y) * 0.8) * 0.03 + (rand2(x, y, 71) - 0.5) * 0.05;
    p.mul(x, y, 1 + v);
  }
  p.frame(0, 0, 16, 16, shade(o.c, 0.86));
  p.rect(1, 1, 14, 1, shade(o.c, 1.12));
  p.rect(1, 1, 1, 14, shade(o.c, 1.08));
  p.rect(1, 14, 14, 1, o.d);
  p.rect(14, 1, 1, 14, o.d);
  p.speckle(shade(o.c, 1.2), 8, 1, 0.5);
  return p;
};
PAINT.raw = function (p, o) {
  p.fill(o.c).noise(0.05).blotch(0.07, 7, 3.4);
  for (var k = 0; k < 10; k++) {
    var x = p.rng() * TS, y = p.rng() * TS;
    p.disc(x, y, 1.2 + p.rng(), o.d);
    p.blend(Math.round(x + 1), Math.round(y + 1), '#000000', 0.3);
  }
  return p;
};
PAINT.scuff = function (p, o) {
  p.fill(o.c).noise(0.04);
  for (var k = 0; k < o.n; k++) p.walk(p.rng() * TS, p.rng() * TS, 5, o.d, 0, true);
  return p;
};
PAINT.rings = function (p, o) {
  p.fill(o.c).noise(0.03);
  for (var r = 2; r < 9; r += 2) p.ring(8, 8, r, o.d, 1);
  return p;
};
PAINT.vein = function (p, o) {
  p.clear();
  for (var k = 0; k < 5; k++) p.walk(p.rng() * TS, p.rng() * TS, 16, k % 2 ? o.c2 : o.c, 0, true);
  return p;
};
PAINT.sculk = function (p) {
  p.fill('#0d1417').noise(0.06);
  for (var k = 0; k < 16; k++) {
    var x = p.rng() * TS, y = p.rng() * TS;
    p.disc(x, y, 1 + p.rng() * 1.4, '#123' + '338');
  }
  for (var k2 = 0; k2 < 22; k2++) {
    var x2 = (p.rng() * TS) | 0, y2 = (p.rng() * TS) | 0;
    p.px(x2, y2, '#1e6f79'); p.blend(x2 + 1, y2, '#2ba6b0', 0.5);
  }
  for (var k3 = 0; k3 < 6; k3++) p.walk(p.rng() * TS, p.rng() * TS, 7, '#0a5f68', 0, true);
  return p;
};
PAINT.frame = function (p, o) {
  p.fill(o.c).noise(0.03);
  p.frame(0, 0, 16, 16, o.e);
  p.rect(3, 3, 10, 10, o.i);
  return p;
};

/* cross-shaped plants: one sprite drawn twice as an X in world space */
PAINT.cross = function (p, o) {
  p.clear();
  var f = PLANT_SHAPES[o.t] || PLANT_SHAPES.grass;
  f(p, o.c, o.c2);
  return p;
};
PAINT.flower = function (p, o) {
  p.clear();
  var f = FLOWER_SHAPES[o.t] || FLOWER_SHAPES.simple;
  f(p, o.s, o.p, o.c);
  return p;
};
PAINT.x = function (p, o) {
  var f = CUSTOM_TEX[o.n];
  if (f) return f(p, o);
  /* deterministic stand-in so a missing painter is visible but harmless */
  p.fill('#b040b0').rect(0, 0, 8, 8, '#202020').rect(8, 8, 8, 8, '#202020');
  return p;
};

/* --------------------------------------------------------- bake driver -- */
function bakeInto(p, desc) {
  var f = PAINT[desc.k];
  p.seed(hashDesc(desc));
  if (f) f(p, desc); else p.fill('#ff00ff');
  return p;
}
var _hashCache = {};
function descKey(d) {
  var s = d.k;
  for (var k in d) { if (k === 'k') continue; var v = d[k]; s += '|' + k + ':' + (typeof v === 'object' && v ? descKey(v) : v); }
  return s;
}
function hashDesc(d) {
  var s = descKey(d), h = 2166136261;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* Final unifying pass: a slight desaturation and S-curve applied to every
   tile so the palette reads as one cohesive, slightly muted set instead of
   a pile of independently-chosen colours. */
function unifyTile(d) {
  for (var i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    var r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    var l = r * 0.299 + g * 0.587 + b * 0.114;
    var sat = 0.90;
    r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat;
    r = r * (1.06 - 0.06 * r) + 0.012; g = g * (1.06 - 0.06 * g) + 0.012; b = b * (1.06 - 0.06 * b) + 0.012;
    d[i] = clamp(r * 255, 0, 255); d[i + 1] = clamp(g * 255, 0, 255); d[i + 2] = clamp(b * 255, 0, 255);
  }
}

function tileLayer(desc) {
  if (!desc) return 0;
  var key = descKey(desc);
  var idx = TEX_INDEX[key];
  if (idx !== undefined) return idx;
  var p = new Pain();
  bakeInto(p, desc);
  unifyTile(p.d);
  idx = TEX_LAYERS.length;
  TEX_LAYERS.push(p.d);
  TEX_INDEX[key] = idx;
  var r = 0, g = 0, b = 0, n = 0, hasA = false;
  for (var i = 0; i < p.d.length; i += 4) {
    if (p.d[i + 3] < 250) hasA = true;
    if (p.d[i + 3] > 0) { r += p.d[i]; g += p.d[i + 1]; b += p.d[i + 2]; n++; }
  }
  n = n || 1;
  TEX_META.push({ avg: [r / n / 255, g / n / 255, b / n / 255], hasAlpha: hasA });
  return idx;
}

/* Register a hand-painted buffer (item icons, mob faces) as a texture layer. */
function rawLayer(key, d) {
  var idx = TEX_INDEX[key];
  if (idx !== undefined) return idx;
  idx = TEX_LAYERS.length;
  TEX_LAYERS.push(d);
  TEX_INDEX[key] = idx;
  var r = 0, g = 0, b = 0, n = 0, hasA = false;
  for (var i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 250) hasA = true;
    if (d[i + 3] > 0) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
  }
  n = n || 1;
  TEX_META.push({ avg: [r / n / 255, g / n / 255, b / n / 255], hasAlpha: hasA });
  return idx;
}

/* Resolve each block's per-face tile layers.  Face order matches the mesher:
   0:+X 1:-X 2:+Y 3:-Y 4:+Z 5:-Z */
function bakeAllBlockTextures() {
  /* layer 0 is a reserved solid-white tile (used for untextured debug quads) */
  var w = new Pain(); w.fill('#ffffff');
  TEX_LAYERS.push(w.d); TEX_INDEX['__white'] = 0; TEX_META.push({ avg: [1, 1, 1], hasAlpha: false });

  for (var i = 0; i < BLOCKS.length; i++) {
    var b = BLOCKS[i];
    if (!b.tex) { b.layers = [0, 0, 0, 0, 0, 0]; b.avgColor = [0.5, 0.5, 0.5]; continue; }
    var t = b.tex, all, top, bot, side, front, back;
    if (t.k) { all = t; }
    else {
      all = t.all || t.side || t.top;
      side = t.side || t.all;
      top = t.top || side || all;
      bot = t.bottom || t.top || side || all;
      front = t.front || side || all;
      back = t.back || side || all;
    }
    if (t.k) { side = top = bot = front = back = all; }
    var lSide = tileLayer(side), lTop = tileLayer(top), lBot = tileLayer(bot),
      lFront = tileLayer(front), lBack = tileLayer(back);
    /* +X -X +Y -Y +Z -Z ; "front" occupies -Z for facing blocks (north) */
    b.layers = [lSide, lSide, lTop, lBot, lSide, lSide];
    b.frontLayer = lFront;
    b.backLayer = lBack;
    b.avgColor = TEX_META[lTop].avg;
  }
}
