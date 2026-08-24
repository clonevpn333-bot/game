/* =========================================================================
 * Small column-major 4x4 / vec3 math library.  Everything writes into a
 * destination array so the hot paths allocate nothing.
 * ========================================================================= */
var M4 = {};
M4.create = function () { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); };
M4.identity = function (o) {
  o[0] = 1; o[1] = 0; o[2] = 0; o[3] = 0; o[4] = 0; o[5] = 1; o[6] = 0; o[7] = 0;
  o[8] = 0; o[9] = 0; o[10] = 1; o[11] = 0; o[12] = 0; o[13] = 0; o[14] = 0; o[15] = 1; return o;
};
M4.copy = function (o, a) { o.set(a); return o; };
M4.mul = function (o, a, b) {
  var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
    a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  for (var i = 0; i < 4; i++) {
    var b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
    o[i * 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    o[i * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    o[i * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    o[i * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  }
  return o;
};
M4.perspective = function (o, fovy, aspect, near, far) {
  var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  o[0] = f / aspect; o[1] = 0; o[2] = 0; o[3] = 0;
  o[4] = 0; o[5] = f; o[6] = 0; o[7] = 0;
  o[8] = 0; o[9] = 0; o[10] = (far + near) * nf; o[11] = -1;
  o[12] = 0; o[13] = 0; o[14] = 2 * far * near * nf; o[15] = 0;
  return o;
};
M4.ortho = function (o, l, r, b, t, n, f) {
  var lr = 1 / (l - r), bt = 1 / (b - t), nf = 1 / (n - f);
  o[0] = -2 * lr; o[1] = 0; o[2] = 0; o[3] = 0;
  o[4] = 0; o[5] = -2 * bt; o[6] = 0; o[7] = 0;
  o[8] = 0; o[9] = 0; o[10] = 2 * nf; o[11] = 0;
  o[12] = (l + r) * lr; o[13] = (t + b) * bt; o[14] = (f + n) * nf; o[15] = 1;
  return o;
};
M4.lookAt = function (o, eye, center, up) {
  var z0 = eye[0] - center[0], z1 = eye[1] - center[1], z2 = eye[2] - center[2];
  var len = 1 / Math.hypot(z0, z1, z2); z0 *= len; z1 *= len; z2 *= len;
  var x0 = up[1] * z2 - up[2] * z1, x1 = up[2] * z0 - up[0] * z2, x2 = up[0] * z1 - up[1] * z0;
  len = Math.hypot(x0, x1, x2);
  if (!len) { x0 = 0; x1 = 0; x2 = 0; } else { len = 1 / len; x0 *= len; x1 *= len; x2 *= len; }
  var y0 = z1 * x2 - z2 * x1, y1 = z2 * x0 - z0 * x2, y2 = z0 * x1 - z1 * x0;
  o[0] = x0; o[1] = y0; o[2] = z0; o[3] = 0;
  o[4] = x1; o[5] = y1; o[6] = z1; o[7] = 0;
  o[8] = x2; o[9] = y2; o[10] = z2; o[11] = 0;
  o[12] = -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]);
  o[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]);
  o[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]);
  o[15] = 1;
  return o;
};
M4.translate = function (o, a, x, y, z) {
  if (o !== a) M4.copy(o, a);
  o[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
  o[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
  o[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
  o[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  return o;
};
M4.scale = function (o, a, x, y, z) {
  o[0] = a[0] * x; o[1] = a[1] * x; o[2] = a[2] * x; o[3] = a[3] * x;
  o[4] = a[4] * y; o[5] = a[5] * y; o[6] = a[6] * y; o[7] = a[7] * y;
  o[8] = a[8] * z; o[9] = a[9] * z; o[10] = a[10] * z; o[11] = a[11] * z;
  o[12] = a[12]; o[13] = a[13]; o[14] = a[14]; o[15] = a[15];
  return o;
};
M4.rotX = function (o, a, r) {
  var s = Math.sin(r), c = Math.cos(r);
  var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  if (o !== a) { o[0] = a[0]; o[1] = a[1]; o[2] = a[2]; o[3] = a[3]; o[12] = a[12]; o[13] = a[13]; o[14] = a[14]; o[15] = a[15]; }
  o[4] = a10 * c + a20 * s; o[5] = a11 * c + a21 * s; o[6] = a12 * c + a22 * s; o[7] = a13 * c + a23 * s;
  o[8] = a20 * c - a10 * s; o[9] = a21 * c - a11 * s; o[10] = a22 * c - a12 * s; o[11] = a23 * c - a13 * s;
  return o;
};
M4.rotY = function (o, a, r) {
  var s = Math.sin(r), c = Math.cos(r);
  var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  if (o !== a) { o[4] = a[4]; o[5] = a[5]; o[6] = a[6]; o[7] = a[7]; o[12] = a[12]; o[13] = a[13]; o[14] = a[14]; o[15] = a[15]; }
  o[0] = a00 * c - a20 * s; o[1] = a01 * c - a21 * s; o[2] = a02 * c - a22 * s; o[3] = a03 * c - a23 * s;
  o[8] = a00 * s + a20 * c; o[9] = a01 * s + a21 * c; o[10] = a02 * s + a22 * c; o[11] = a03 * s + a23 * c;
  return o;
};
M4.rotZ = function (o, a, r) {
  var s = Math.sin(r), c = Math.cos(r);
  var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  if (o !== a) { o[8] = a[8]; o[9] = a[9]; o[10] = a[10]; o[11] = a[11]; o[12] = a[12]; o[13] = a[13]; o[14] = a[14]; o[15] = a[15]; }
  o[0] = a00 * c + a10 * s; o[1] = a01 * c + a11 * s; o[2] = a02 * c + a12 * s; o[3] = a03 * c + a13 * s;
  o[4] = a10 * c - a00 * s; o[5] = a11 * c - a01 * s; o[6] = a12 * c - a02 * s; o[7] = a13 * c - a03 * s;
  return o;
};
M4.invert = function (o, a) {
  var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
    a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  var b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10,
    b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12,
    b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30,
    b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return null;
  det = 1.0 / det;
  o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return o;
};
M4.transformPoint = function (out, m, x, y, z) {
  var w = m[3] * x + m[7] * y + m[11] * z + m[15];
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return out;
};

/* Frustum extraction from a view-projection matrix, for chunk culling. */
function Frustum() { this.p = new Float32Array(24); }
Frustum.prototype.set = function (m) {
  var p = this.p;
  for (var i = 0; i < 3; i++) {
    p[i * 8 + 0] = m[3] + m[i]; p[i * 8 + 1] = m[7] + m[4 + i];
    p[i * 8 + 2] = m[11] + m[8 + i]; p[i * 8 + 3] = m[15] + m[12 + i];
    p[i * 8 + 4] = m[3] - m[i]; p[i * 8 + 5] = m[7] - m[4 + i];
    p[i * 8 + 6] = m[11] - m[8 + i]; p[i * 8 + 7] = m[15] - m[12 + i];
  }
  for (var k = 0; k < 6; k++) {
    var o = k * 4;
    var len = Math.hypot(p[o], p[o + 1], p[o + 2]) || 1;
    p[o] /= len; p[o + 1] /= len; p[o + 2] /= len; p[o + 3] /= len;
  }
  return this;
};
Frustum.prototype.boxIn = function (x0, y0, z0, x1, y1, z1) {
  var p = this.p;
  for (var k = 0; k < 6; k++) {
    var o = k * 4, a = p[o], b = p[o + 1], c = p[o + 2], d = p[o + 3];
    var px = a > 0 ? x1 : x0, py = b > 0 ? y1 : y0, pz = c > 0 ? z1 : z0;
    if (a * px + b * py + c * pz + d < 0) return false;
  }
  return true;
};
