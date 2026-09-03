// ============================================================ TERRAIN MESH
// Flat-shaded facets, coloured per triangle, in three draw groups so ice can
// catch a highlight and lava can glow without a custom shader.
function s2l(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
var _lut = new Float32Array(256);
for (var _i = 0; _i < 256; _i++) _lut[_i] = s2l(_i / 255);
function hexLin(hex, out, o, mul) {
  out[o] = _lut[(hex >> 16) & 255] * mul;
  out[o + 1] = _lut[(hex >> 8) & 255] * mul;
  out[o + 2] = _lut[hex & 255] * mul;
}

var PAL = [
  { top: 0xe8d49a, top2: 0x8cc456, cliff: 0xb2a081, alt: 0xd6c08c },   // shore
  { top: 0x3b8a38, top2: 0x27612e, cliff: 0x4a3826, alt: 0x54a03e },   // jungle
  { top: 0xeef4fa, top2: 0xdbe6f2, cliff: 0x79828f, alt: 0xa8dcef },   // snow
  { top: 0x4a3f48, top2: 0x3a3038, cliff: 0x2f2830, alt: 0x5c4a44 },   // volcanic
  { top: 0x2c2430, top2: 0x241d26, cliff: 0x1d1721, alt: 0x3a2c2e },   // caldera
  { top: 0xf2f7fc, top2: 0xe2ecf6, cliff: 0x8b93a0, alt: 0xb9c6d4 },   // peak
];
var SURF_TINT = {};
SURF_TINT[SF.SAND] = 0xe8d49a; SURF_TINT[SF.GRASS] = 0x6fae42;
SURF_TINT[SF.LEAF] = 0x2a6e30; SURF_TINT[SF.MUD] = 0x4a3622;
SURF_TINT[SF.SNOW] = 0xf0f6fb; SURF_TINT[SF.ICE] = 0xa8dcef;
SURF_TINT[SF.BASALT] = 0x2f2830; SURF_TINT[SF.EMBER] = 0xff5a1e;
SURF_TINT[SF.THORN] = 0x6f4a86;

function faceKind(surf) {
  if (surf === SF.EMBER) return 2;
  if (surf === SF.ICE || surf === SF.SNOW) return 1;
  return 0;
}

function faceColor(h, ny, surf, hash) {
  var zn = zoneAt(h), p = PAL[zn], c;
  var top = (hash & 3) ? p.top : p.top2;
  var cliff = (hash & 7) < 3 ? p.alt : p.cliff;
  // bleed each band into the next so the zones are not hard rings
  var below = zn > 0 ? ZONES[zn - 1].top : -1;
  if (below > 0 && h < below + 13) {
    var q = PAL[zn - 1], u = step01(below - 3, below + 13, h);
    top = mixHex((hash & 3) ? q.top : q.top2, top, u);
    cliff = mixHex((hash & 7) < 3 ? q.alt : q.cliff, cliff, u);
  }
  c = mixHex(cliff, top, step01(0.42, 0.78, ny));
  var tint = SURF_TINT[surf];
  if (tint !== undefined) c = mixHex(c, tint, surf === SF.EMBER ? 0.55 : 0.5);
  return c;
}

T.buildMesh = function () {
  var N = T.N, np = N + 1, H = T.H, CS = T.CS, S = T.SURF;
  var nf = N * N * 2;
  var kinds = new Uint8Array(nf), cnt = [0, 0, 0];
  var i, j, f = 0, tri;
  var hgt = new Float32Array(nf), nyA = new Float32Array(nf), sfA = new Uint8Array(nf);

  for (j = 0; j < N; j++) {
    for (i = 0; i < N; i++) {
      var h00 = H[j * np + i], h10 = H[j * np + i + 1], h01 = H[(j + 1) * np + i], h11 = H[(j + 1) * np + i + 1];
      var surf = S[j * N + i];
      for (tri = 0; tri < 2; tri++) {
        var h, ny;
        if (tri === 0) { h = (h00 + h10 + h01) / 3; ny = 1 / Math.sqrt(Math.pow((h10 - h00) / CS, 2) + Math.pow((h01 - h00) / CS, 2) + 1); }
        else { h = (h10 + h11 + h01) / 3; ny = 1 / Math.sqrt(Math.pow((h11 - h01) / CS, 2) + Math.pow((h11 - h10) / CS, 2) + 1); }
        hgt[f] = h; nyA[f] = ny; sfA[f] = surf;
        var kd = faceKind(surf);
        kinds[f] = kd; cnt[kd]++; f++;
      }
    }
  }

  var off = [0, cnt[0] * 3, (cnt[0] + cnt[1]) * 3];
  var cur = [off[0], off[1], off[2]];
  var total = nf * 3;
  var pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
  var ax, ay, az, bx, by, bz, cx, cy, cz, ux, uy, uz, vx, vy, vz, nx, nyy, nz, ln;

  f = 0;
  for (j = 0; j < N; j++) {
    for (i = 0; i < N; i++) {
      var x0 = i * CS - T.half, z0 = j * CS - T.half, x1 = x0 + CS, z1 = z0 + CS;
      var y00 = H[j * np + i], y10 = H[j * np + i + 1], y01 = H[(j + 1) * np + i], y11 = H[(j + 1) * np + i + 1];
      for (tri = 0; tri < 2; tri++) {
        // Counter-clockwise seen from above.  Get this backwards and the
        // renderer culls the ground out from under the player.
        if (tri === 0) { ax = x0; ay = y00; az = z0; bx = x0; by = y01; bz = z1; cx = x1; cy = y10; cz = z0; }
        else { ax = x1; ay = y10; az = z0; bx = x0; by = y01; bz = z1; cx = x1; cy = y11; cz = z1; }
        ux = bx - ax; uy = by - ay; uz = bz - az;
        vx = cx - ax; vy = cy - ay; vz = cz - az;
        nx = uy * vz - uz * vy; nyy = uz * vx - ux * vz; nz = ux * vy - uy * vx;
        ln = Math.sqrt(nx * nx + nyy * nyy + nz * nz) || 1;
        nx /= ln; nyy /= ln; nz /= ln;

        var hash = (((i >> 1) * 73856093) ^ ((j >> 1) * 19349663)) >>> 0;
        var jhash = ((i * 73856093) ^ (j * 19349663) ^ (tri * 83492791)) >>> 0;
        var c = faceColor(hgt[f], nyA[f], sfA[f], hash);
        var jit = 0.955 + ((jhash >>> 5) & 63) / 63 * 0.09;
        var conc = clamp((hgt[f] - (T.hAt(ax + 3, az + 3) + T.hAt(ax - 3, az - 3)) * 0.5) / 7, -1, 1);
        var mul = jit * (1 + conc * 0.10);

        var o = cur[kinds[f]]; cur[kinds[f]] += 3;
        var pp = o * 3;
        pos[pp] = ax; pos[pp + 1] = ay; pos[pp + 2] = az;
        pos[pp + 3] = bx; pos[pp + 4] = by; pos[pp + 5] = bz;
        pos[pp + 6] = cx; pos[pp + 7] = cy; pos[pp + 8] = cz;
        for (var q = 0; q < 3; q++) {
          nor[pp + q * 3] = nx; nor[pp + q * 3 + 1] = nyy; nor[pp + q * 3 + 2] = nz;
          hexLin(c, col, pp + q * 3, mul);
        }
        f++;
      }
    }
  }

  var g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.addGroup(0, cnt[0] * 3, 0);
  g.addGroup(cnt[0] * 3, cnt[1] * 3, 1);
  g.addGroup((cnt[0] + cnt[1]) * 3, cnt[2] * 3, 2);
  g.computeBoundingSphere();

  var mats = [
    new THREE.MeshLambertMaterial({ vertexColors: true }),
    new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 42, specular: 0x6f8898 }),
    new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 12, specular: 0x442211, emissive: 0x3a0d00 }),
  ];
  var mesh = new THREE.Mesh(g, mats);
  mesh.receiveShadow = true;
  T.mesh = mesh;
  return mesh;
};
