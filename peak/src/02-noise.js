// Seeded 2D gradient noise + fbm.  Deterministic across machines so every
// peer generates the exact same mountain from the room seed.
function Noise(seed) {
  var p = new Uint8Array(512), r = makeRng(seed), i, j, t;
  for (i = 0; i < 256; i++) p[i] = i;
  for (i = 255; i > 0; i--) { j = (r() * (i + 1)) | 0; t = p[i]; p[i] = p[j]; p[j] = t; }
  for (i = 0; i < 256; i++) p[i + 256] = p[i];
  this.p = p;
}
Noise.GX = [1, -1, 1, -1, 0.7071, -0.7071, 0.7071, -0.7071];
Noise.GY = [1, 1, -1, -1, 0.7071, 0.7071, -0.7071, -0.7071];

Noise.prototype.n2 = function (x, y) {
  var X = Math.floor(x), Y = Math.floor(y);
  var fx = x - X, fy = y - Y;
  X &= 255; Y &= 255;
  var u = smoother(fx), v = smoother(fy), p = this.p;
  var aa = p[p[X] + Y] & 7, ba = p[p[X + 1] + Y] & 7;
  var ab = p[p[X] + Y + 1] & 7, bb = p[p[X + 1] + Y + 1] & 7;
  var gx = Noise.GX, gy = Noise.GY;
  var n00 = gx[aa] * fx + gy[aa] * fy;
  var n10 = gx[ba] * (fx - 1) + gy[ba] * fy;
  var n01 = gx[ab] * fx + gy[ab] * (fy - 1);
  var n11 = gx[bb] * (fx - 1) + gy[bb] * (fy - 1);
  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
};

// Fractal sum.  Raw gradient noise only reaches about +/-0.35 in practice,
// so the sum is scaled to span roughly -1..1 - every threshold in the
// generator is written against that range.
Noise.prototype.fbm = function (x, y, oct, lac, gain) {
  oct = oct || 4; lac = lac || 2.03; gain = gain || 0.5;
  var a = 1, f = 1, sum = 0, norm = 0;
  for (var i = 0; i < oct; i++) {
    sum += a * this.n2(x * f, y * f);
    norm += a; a *= gain; f *= lac;
  }
  return clamp(sum / norm * 2.6, -1, 1);
};

// ridged: sharp crests, good for spurs and aretes
Noise.prototype.ridge = function (x, y, oct) {
  oct = oct || 4;
  var a = 1, f = 1, sum = 0, norm = 0, n;
  for (var i = 0; i < oct; i++) {
    n = 1 - Math.abs(this.n2(x * f, y * f));
    n *= n;
    sum += a * n; norm += a; a *= 0.52; f *= 2.11;
  }
  return sum / norm;
};

// 0..1 blue-ish scatter used to place props without clumping too hard
Noise.prototype.cell = function (x, y) {
  var X = Math.floor(x) & 255, Y = Math.floor(y) & 255, p = this.p;
  return (p[p[X] + Y] ^ (p[p[X + 1] + Y + 1] << 1)) / 511;
};
