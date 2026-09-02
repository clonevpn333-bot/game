// ============================================================ TERRAIN MESH
// Flat-shaded facets, coloured per triangle.  Three draw groups so ice can
// catch a highlight and the summit vents can glow without a shader.
function s2l(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
var _lut = new Float32Array(256);
for (var _i = 0; _i < 256; _i++) _lut[_i] = s2l(_i / 255);
function hexLin(hex, out, o, mul) {
  var r = _lut[(hex >> 16) & 255] * mul, g = _lut[(hex >> 8) & 255] * mul, b = _lut[hex & 255] * mul;
  out[o] = r; out[o + 1] = g; out[o + 2] = b;
}

var PAL = {
  grassTop: 0x74ac3e, grassTop2: 0x8cbe4c, grassCliff: 0x7b5b39, dirt: 0x8a6640,
  rockTop: 0x8e8b93, rockCliff: 0x76737d, rust: 0xa2653a, loose: 0xb07a45, vine: 0x4f8f38,
  snowTop: 0xe9f1f8, snowCliff: 0xbcc9d6, ice: 0xa4dcef, alpRock: 0x7b8593,
  volTop: 0x413b48, volCliff: 0x322d38, ember: 0xff5a1e, emberHot: 0xffa23c,
};

function faceKind(h, ny, surf) {
  // 0 matte, 1 icy, 2 glowing
  if (surf === SF.EMBER) return 2;
  if (surf === SF.ICE) return 1;
  if (surf === SF.SNOW && ny > 0.72) return 1;
  return 0;
}

function faceColor(h, ny, surf, hash) {
  var top, cliff, c;
  if (h < K.BAND_ROCK) {
    top = (hash & 3) ? PAL.grassTop : PAL.grassTop2; cliff = PAL.grassCliff;
  } else if (h < K.BAND_ALP) {
    top = PAL.rockTop; cliff = (hash & 7) < 3 ? PAL.rust : PAL.rockCliff;
  } else if (h < K.BAND_TOP) {
    top = PAL.snowTop; cliff = (hash & 7) < 5 ? PAL.snowCliff : PAL.alpRock;
  } else {
    top = PAL.volTop; cliff = PAL.volCliff;
  }
  // band cross-fades so the biomes bleed into each other
  if (h > K.BAND_ROCK - 12 && h < K.BAND_ROCK + 12) {
    var t1 = step01(K.BAND_ROCK - 12, K.BAND_ROCK + 12, h);
    top = mixHex(PAL.grassTop, PAL.rockTop, t1);
    cliff = mixHex(PAL.grassCliff, PAL.rockCliff, t1);
  } else if (h > K.BAND_ALP - 16 && h < K.BAND_ALP + 16) {
    var t2 = step01(K.BAND_ALP - 16, K.BAND_ALP + 16, h);
    top = mixHex(PAL.rockTop, PAL.snowTop, t2);
    cliff = mixHex(PAL.rockCliff, PAL.snowCliff, t2);
  } else if (h > K.BAND_TOP - 14 && h < K.BAND_TOP + 14) {
    var t3 = step01(K.BAND_TOP - 14, K.BAND_TOP + 14, h);
    top = mixHex(PAL.snowTop, PAL.volTop, t3);
    cliff = mixHex(PAL.snowCliff, PAL.volCliff, t3);
  }
  c = mixHex(cliff, top, step01(0.44, 0.80, ny));

  switch (surf) {
    case SF.GRASS: c = mixHex(c, PAL.grassTop, 0.55); break;
    case SF.DIRT: c = mixHex(c, PAL.dirt, 0.5); break;
    case SF.VINE: c = mixHex(c, PAL.vine, 0.62); break;
    case SF.LOOSE: c = mixHex(c, PAL.loose, 0.6); break;
    case SF.ICE: c = mixHex(c, PAL.ice, 0.66); break;
    case SF.SNOW: c = mixHex(c, PAL.snowTop, 0.6); break;
    case SF.EMBER: c = mixHex(PAL.ember, PAL.emberHot, (hash & 15) / 15); break;
  }
  return c;
}

T.buildMesh = function () {
  var N = T.N, np = N + 1, H = T.H, CS = T.CS, S = T.SURF;
  var nf = N * N * 2;
  var kinds = new Uint8Array(nf), cnt = [0, 0, 0];
  var i, j, f = 0, tri, h, ny, surf;
  var ax, ay, az, bx, by, bz, cx, cy, cz, ux, uy, uz, vx, vy, vz, nx, nyy, nz, ln;

  var hgt = new Float32Array(nf), nyA = new Float32Array(nf), sfA = new Uint8Array(nf);

  for (j = 0; j < N; j++) {
    for (i = 0; i < N; i++) {
      var h00 = H[j * np + i], h10 = H[j * np + i + 1], h01 = H[(j + 1) * np + i], h11 = H[(j + 1) * np + i + 1];
      surf = S[j * N + i];
      // triangle A (00,10,01)  triangle B (10,11,01)
      for (tri = 0; tri < 2; tri++) {
        if (tri === 0) { h = (h00 + h10 + h01) / 3; ny = 1 / Math.sqrt(Math.pow((h10 - h00) / CS, 2) + Math.pow((h01 - h00) / CS, 2) + 1); }
        else { h = (h10 + h11 + h01) / 3; ny = 1 / Math.sqrt(Math.pow((h11 - h01) / CS, 2) + Math.pow((h11 - h10) / CS, 2) + 1); }
        hgt[f] = h; nyA[f] = ny; sfA[f] = surf;
        var kd = faceKind(h, ny, surf);
        kinds[f] = kd; cnt[kd]++; f++;
      }
    }
  }

  var off = [0, cnt[0] * 3, (cnt[0] + cnt[1]) * 3];
  var cur = [off[0], off[1], off[2]];
  var total = nf * 3;
  var pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);

  f = 0;
  for (j = 0; j < N; j++) {
    for (i = 0; i < N; i++) {
      var x0 = i * CS - T.half, z0 = j * CS - T.half, x1 = x0 + CS, z1 = z0 + CS;
      var y00 = H[j * np + i], y10 = H[j * np + i + 1], y01 = H[(j + 1) * np + i], y11 = H[(j + 1) * np + i + 1];
      for (tri = 0; tri < 2; tri++) {
        if (tri === 0) { ax = x0; ay = y00; az = z0; bx = x1; by = y10; bz = z0; cx = x0; cy = y01; cz = z1; }
        else { ax = x1; ay = y10; az = z0; bx = x1; by = y11; bz = z1; cx = x0; cy = y01; cz = z1; }
        ux = bx - ax; uy = by - ay; uz = bz - az;
        vx = cx - ax; vy = cy - ay; vz = cz - az;
        nx = uy * vz - uz * vy; nyy = uz * vx - ux * vz; nz = ux * vy - uy * vx;
        // This winding is the one the renderer treats as front facing here,
        // and its cross product comes out pointing into the ground, so the
        // stored normal is flipped to face the sky.  Without this the whole
        // mountain is lit from underneath.
        ln = -(Math.sqrt(nx * nx + nyy * nyy + nz * nz) || 1);
        nx /= ln; nyy /= ln; nz /= ln;

        // one hash per 2x2 block of cells so rust and grass read as patches
        // rather than one-triangle-wide stripes
        var hash = (((i >> 1) * 73856093) ^ ((j >> 1) * 19349663)) >>> 0;
        var jhash = ((i * 73856093) ^ (j * 19349663) ^ (tri * 83492791)) >>> 0;
        var c = faceColor(hgt[f], nyA[f], sfA[f], hash);
        // facet jitter plus a cheap concavity shade keeps big walls readable
        var jit = 0.955 + ((jhash >>> 5) & 63) / 63 * 0.09;
        var conc = clamp((hgt[f] - (T.hAt(ax + 3, az + 3) + T.hAt(ax - 3, az - 3)) * 0.5) / 7, -1, 1);
        var mul = jit * (1 + conc * 0.10);

        var o = cur[kinds[f]]; cur[kinds[f]] += 3;
        var p = o * 3;
        pos[p] = ax; pos[p + 1] = ay; pos[p + 2] = az;
        pos[p + 3] = bx; pos[p + 4] = by; pos[p + 5] = bz;
        pos[p + 6] = cx; pos[p + 7] = cy; pos[p + 8] = cz;
        for (var q = 0; q < 3; q++) {
          nor[p + q * 3] = nx; nor[p + q * 3 + 1] = nyy; nor[p + q * 3 + 2] = nz;
          hexLin(c, col, p + q * 3, mul);
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
    new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 12, specular: 0x442211, emissive: 0x5a1c00 }),
  ];
  var mesh = new THREE.Mesh(g, mats);
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  T.mesh = mesh;
  T.colAttr = g.attributes.color;
  // remember where each cell's two triangles ended up so crumbling can
  // repaint them later
  T.faceSlot = new Int32Array(nf);
  cur = [off[0], off[1], off[2]];
  for (f = 0; f < nf; f++) { T.faceSlot[f] = cur[kinds[f]]; cur[kinds[f]] += 3; }
  return mesh;
};

// scar the rock where a hold has just torn away
T.paintBroken = function (cell) {
  if (cell < 0 || !T.faceSlot) return;
  var arr = T.colAttr.array, f, o, q;
  for (var tri = 0; tri < 2; tri++) {
    f = cell * 2 + tri;
    o = T.faceSlot[f] * 3;
    for (q = 0; q < 3; q++) hexLin(0x50372a, arr, o + q * 3, 0.9);
  }
  T.colAttr.needsUpdate = true;
};
