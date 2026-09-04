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

function hexLinB(hex, out, o, mul) {
  out[o] = clamp(_lut[(hex >> 16) & 255] * mul, 0, 1) * 255;
  out[o + 1] = clamp(_lut[(hex >> 8) & 255] * mul, 0, 1) * 255;
  out[o + 2] = clamp(_lut[hex & 255] * mul, 0, 1) * 255;
}

// ---- procedural rock grain ------------------------------------------------
// A tiling detail map, drawn once and shared.  Without it every facet is one
// flat colour and the island reads as paper; with it the rock has a surface.
// The noise wraps by construction (the lattice hash is taken modulo the
// period) so there is no seam where the tile repeats.
var _rockTex = null;
function rockTexture() {
  if (_rockTex) return _rockTex;
  var S = 256, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  var ctx = cv.getContext('2d'), img = ctx.createImageData(S, S), d = img.data;
  function h2(ix, iy, per) {
    ix = ((ix % per) + per) % per; iy = ((iy % per) + per) % per;
    var v = (ix * 374761393 + iy * 668265263) >>> 0;
    v = (v ^ (v >>> 13)) * 1274126177 >>> 0;
    return ((v ^ (v >>> 16)) >>> 0) / 4294967295;
  }
  function val(x, y, per) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    var ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(h2(ix, iy, per), h2(ix + 1, iy, per), ux),
                lerp(h2(ix, iy + 1, per), h2(ix + 1, iy + 1, per), ux), uy);
  }
  for (var y = 0; y < S; y++) {
    for (var x = 0; x < S; x++) {
      var u = x / S, v = y / S, g = 0, amp = 0.5, per = 4;
      for (var o = 0; o < 5; o++) { g += val(u * per, v * per, per) * amp; amp *= 0.52; per *= 2; }
      // a faint bedding direction, so the grain has a lie to it
      var band = val(u * 3 + v * 11, v * 3, 8);
      g = g * 0.80 + band * 0.20;
      var c = clamp(0.5 + (g - 0.5) * 1.75, 0.02, 1) * 255;
      var i4 = (y * S + x) * 4;
      d[i4] = d[i4 + 1] = d[i4 + 2] = c; d[i4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  var t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.encoding = THREE.LinearEncoding;      // a multiplier, not a colour
  t.anisotropy = 4;
  _rockTex = t;
  return t;
}

// Project the grain down all three axes and blend by the face normal, so a
// vertical cliff gets the same grain density as the shelf above it instead
// of a smeared streak.  Two scales: coarse for the shape, fine for the bite.
function triplanar(mat) {
  mat.onBeforeCompile = function (sh) {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vTriW;')
      .replace('#include <begin_vertex>',
        '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvTriW = abs(normal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vTriW;')
      .replace('#include <map_fragment>', [
        '#ifdef USE_MAP',
        '  vec3 bw = vTriW * vTriW; bw *= bw;',
        '  bw /= max(bw.x + bw.y + bw.z, 1e-4);',
        '  vec3 gp = vWPos * 0.085;',
        '  float g = texture2D(map, gp.zy).r * bw.x',
        '          + texture2D(map, gp.xz).r * bw.y',
        '          + texture2D(map, gp.xy).r * bw.z;',
        '  vec3 fp = vWPos * 0.44;',
        '  float g2 = texture2D(map, fp.zy).r * bw.x',
        '           + texture2D(map, fp.xz).r * bw.y',
        '           + texture2D(map, fp.xy).r * bw.z;',
        '  float grain = mix(g, g2, 0.38);',
        '  diffuseColor.rgb *= 0.64 + grain * 0.62;',
        '#endif',
      ].join('\n'));
  };
  // a distinct key or three.js shares one program across the three materials
  mat.customProgramCacheKey = function () { return 'crux-tri'; };
}

var SURF_TINT = {};
SURF_TINT[SF.SAND] = 0xe8d49a; SURF_TINT[SF.GRASS] = 0x6fae42;
SURF_TINT[SF.LEAF] = 0x2a6e30; SURF_TINT[SF.MUD] = 0x4a3622;
SURF_TINT[SF.SNOW] = 0xf0f6fb; SURF_TINT[SF.ICE] = 0xa8dcef;
SURF_TINT[SF.BASALT] = 0x2f2830; SURF_TINT[SF.EMBER] = 0xff5a1e;
SURF_TINT[SF.THORN] = 0x6f4a86; SURF_TINT[SF.SPORE] = 0xb06ad8;
SURF_TINT[SF.CLAY] = 0xd8834a; SURF_TINT[SF.MURK] = 0x2a2440;
SURF_TINT[SF.BRICK] = 0xa89c88; SURF_TINT[SF.SHADE] = 0x8a6242;

function faceKind(surf) {
  if (surf === SF.EMBER) return 2;
  if (surf === SF.ICE || surf === SF.SNOW) return 1;
  return 0;
}

function faceColor(h, ny, surf, hash, mot) {
  var zn = zoneAt(h), p = Run.at(zn).pal, c;
  // Patches, not static.  Choosing the second tone off a smooth field instead
  // of a per-face hash gives the ground drifts and beds you can read at a
  // distance, where white noise just averages back to one flat colour.
  var top = mot > 0.34 ? p.top : p.top2;
  var cliff = mot > 0.56 ? p.alt : p.cliff;
  // bleed each band into the one below so the biomes are not hard rings
  var below = zn > 0 ? ZONES[zn - 1].top : -1;
  if (below > 0 && h < below + 34) {
    var q = Run.at(zn - 1).pal, u = step01(below - 8, below + 34, h);
    top = mixHex(mot > 0.34 ? q.top : q.top2, top, u);
    cliff = mixHex(mot > 0.56 ? q.alt : q.cliff, cliff, u);
  }
  c = mixHex(cliff, top, step01(0.42, 0.78, ny));
  var tint = SURF_TINT[surf];
  if (tint !== undefined) c = mixHex(c, tint, surf === SF.EMBER ? 0.55 : 0.5);
  return c;
}

// Ambient occlusion, sampled off the height field.  For each mesh vertex we
// ask how much of the sky a point just above the ground can actually see:
// rings of samples at growing radius, each one asking whether the terrain
// out there rises above the horizon.  Creases go dark, ridges stay bright.
// This is what stops a field of flat facets reading as flat.
var AO_DIR = 8, AO_STEP = [1.6, 3.4, 6.5, 11.5, 19, 30];
var _aoC = new Float32Array(AO_DIR), _aoS = new Float32Array(AO_DIR);
for (var _d = 0; _d < AO_DIR; _d++) {
  var _a = _d / AO_DIR * Math.PI * 2 + 0.31;
  _aoC[_d] = Math.cos(_a); _aoS[_d] = Math.sin(_a);
}
function aoAt(x, z, y) {
  var occ = 0, w = 0;
  for (var d = 0; d < AO_DIR; d++) {
    var cx = _aoC[d], cz = _aoS[d], best = 0;
    for (var r = 0; r < AO_STEP.length; r++) {
      var rr = AO_STEP[r];
      var t = (T.hAt(x + cx * rr, z + cz * rr) - y) / rr;   // tangent of rise
      if (t > best) best = t;
    }
    // a 45-degree wall alongside you blocks about half your sky
    occ += best > 0 ? best / (best + 1) : 0;
    w++;
  }
  return 1 - occ / w;
}

// A high-frequency wobble the collision field never sees.  Gameplay reads
// T.H, so this can add all the surface detail it likes without narrowing a
// single shelf: it is scenery on top of the truth, never the truth.
function micro(x, z, n) {
  return n.n2(x * 0.21, z * 0.21) * 0.42
       + n.n2(x * 0.63, z * 0.63) * 0.16
       + n.n2(x * 1.55, z * 1.55) * 0.055;
}

T.buildMesh = function (detail) {
  var N = T.N, np = N + 1, H = T.H, CS = T.CS, S = T.SURF, n = T.noise;
  var SUB = detail ? 2 : 1;                 // render-only subdivision
  var sc = CS / SUB;                        // sub-cell size
  var M = N * SUB, mp = M + 1;              // sub-grid
  var nf = M * M * 2;

  // ---- sub-grid heights: bilinear from the real field, plus micro relief
  var SH = new Float32Array(mp * mp), AO = new Float32Array(mp * mp);
  var i, j, f = 0, tri;
  for (j = 0; j < mp; j++) {
    for (i = 0; i < mp; i++) {
      var gi = i / SUB, gj = j / SUB;
      var i0 = Math.min(N, gi | 0), j0 = Math.min(N, gj | 0);
      var fx = gi - i0, fz = gj - j0;
      var i1 = Math.min(N, i0 + 1), j1 = Math.min(N, j0 + 1);
      var a = H[j0 * np + i0], b = H[j0 * np + i1], c2 = H[j1 * np + i0], d2 = H[j1 * np + i1];
      var h = lerp(lerp(a, b, fx), lerp(c2, d2, fx), fz);
      var wx = i * sc - T.half, wz = j * sc - T.half;
      if (SUB > 1 && h > K.SEA - 1) {
        // fade the wobble out on near-flat ground so shelves stay flat, and
        // out at the shoreline so the waterline does not get the shakes
        var slope = Math.abs(b - a) + Math.abs(c2 - a);
        h += micro(wx, wz, n) * clamp(0.62 - slope * 0.08, 0.3, 0.62) * clamp((h - K.SEA) * 0.5, 0, 1);
      }
      SH[j * mp + i] = h;
    }
  }
  for (j = 0; j < mp; j++)
    for (i = 0; i < mp; i++)
      AO[j * mp + i] = aoAt(i * sc - T.half, j * sc - T.half, SH[j * mp + i] + 0.35);

  var kinds = new Uint8Array(nf), cnt = [0, 0, 0];
  var hgt = new Float32Array(nf), nyA = new Float32Array(nf), sfA = new Uint8Array(nf);
  for (j = 0; j < M; j++) {
    for (i = 0; i < M; i++) {
      var h00 = SH[j * mp + i], h10 = SH[j * mp + i + 1];
      var h01 = SH[(j + 1) * mp + i], h11 = SH[(j + 1) * mp + i + 1];
      var surf = S[Math.min(N - 1, (j / SUB) | 0) * N + Math.min(N - 1, (i / SUB) | 0)];
      for (tri = 0; tri < 2; tri++) {
        var hh, ny;
        if (tri === 0) { hh = (h00 + h10 + h01) / 3; ny = 1 / Math.sqrt(Math.pow((h10 - h00) / sc, 2) + Math.pow((h01 - h00) / sc, 2) + 1); }
        else { hh = (h10 + h11 + h01) / 3; ny = 1 / Math.sqrt(Math.pow((h11 - h01) / sc, 2) + Math.pow((h11 - h10) / sc, 2) + 1); }
        hgt[f] = hh; nyA[f] = ny; sfA[f] = surf;
        var kd = faceKind(surf);
        kinds[f] = kd; cnt[kd]++; f++;
      }
    }
  }

  var off = [0, cnt[0] * 3, (cnt[0] + cnt[1]) * 3];
  var cur = [off[0], off[1], off[2]];
  var total = nf * 3;
  var pos = new Float32Array(total * 3), nor = new Int16Array(total * 3);
  var col = new Uint8Array(total * 3);
  var ax, ay, az, bx, by, bz, cx, cy, cz, ux, uy, uz, vx, vy, vz, nx, nyy, nz, ln;
  var aa, ab, ac;

  f = 0;
  for (j = 0; j < M; j++) {
    for (i = 0; i < M; i++) {
      var x0 = i * sc - T.half, z0 = j * sc - T.half, x1 = x0 + sc, z1 = z0 + sc;
      var y00 = SH[j * mp + i], y10 = SH[j * mp + i + 1];
      var y01 = SH[(j + 1) * mp + i], y11 = SH[(j + 1) * mp + i + 1];
      var a00 = AO[j * mp + i], a10 = AO[j * mp + i + 1];
      var a01 = AO[(j + 1) * mp + i], a11 = AO[(j + 1) * mp + i + 1];
      for (tri = 0; tri < 2; tri++) {
        // Counter-clockwise seen from above.  Get this backwards and the
        // renderer culls the ground out from under the player.
        if (tri === 0) {
          ax = x0; ay = y00; az = z0; bx = x0; by = y01; bz = z1; cx = x1; cy = y10; cz = z0;
          aa = a00; ab = a01; ac = a10;
        } else {
          ax = x1; ay = y10; az = z0; bx = x0; by = y01; bz = z1; cx = x1; cy = y11; cz = z1;
          aa = a10; ab = a01; ac = a11;
        }
        ux = bx - ax; uy = by - ay; uz = bz - az;
        vx = cx - ax; vy = cy - ay; vz = cz - az;
        nx = uy * vz - uz * vy; nyy = uz * vx - ux * vz; nz = ux * vy - uy * vx;
        ln = Math.sqrt(nx * nx + nyy * nyy + nz * nz) || 1;
        nx /= ln; nyy /= ln; nz /= ln;

        var ci = (i / SUB) | 0, cj = (j / SUB) | 0;
        var hash = (((ci >> 1) * 73856093) ^ ((cj >> 1) * 19349663)) >>> 0;
        var jhash = ((i * 73856093) ^ (j * 19349663) ^ (tri * 83492791)) >>> 0;
        var mot = n.n2(ax * 0.026, az * 0.026) * 0.34 + n.n2(ax * 0.075, az * 0.075) * 0.15 + 0.5;
        var c = faceColor(hgt[f], nyA[f], sfA[f], hash, mot);
        var jit = 0.918 + ((jhash >>> 5) & 63) / 63 * 0.165;
        var warp = n.n2(ax * 0.011, az * 0.011) * 4.2 + n.n2(ax * 0.045, az * 0.045) * 1.1;
        var bh = hgt[f] + warp, steep = 1 - nyA[f];
        jit *= 1 + (Math.sin(bh * 0.58) * 0.085 + Math.sin(bh * 1.93 + 1.3) * 0.042
                    + Math.sin(bh * 5.1) * 0.02) * steep;
        // and a broad drift of light and shade that works on flat ground too,
        // where the bedding planes are edge-on and show nothing
        jit *= 1 + (mot - 0.5) * 0.30 + n.n2(ax * 0.19, az * 0.19) * 0.05;

        var o = cur[kinds[f]]; cur[kinds[f]] += 3;
        var pp = o * 3;
        pos[pp] = ax; pos[pp + 1] = ay; pos[pp + 2] = az;
        pos[pp + 3] = bx; pos[pp + 4] = by; pos[pp + 5] = bz;
        pos[pp + 6] = cx; pos[pp + 7] = cy; pos[pp + 8] = cz;
        var aoV = [aa, ab, ac];
        for (var q = 0; q < 3; q++) {
          nor[pp + q * 3] = nx * 32767; nor[pp + q * 3 + 1] = nyy * 32767; nor[pp + q * 3 + 2] = nz * 32767;
          // AO is squeezed into a range that darkens without going muddy
          var mul = jit * (0.34 + 0.66 * Math.pow(clamp(aoV[q], 0, 1), 1.35));
          hexLinB(c, col, pp + q * 3, mul);
        }
        f++;
      }
    }
  }

  var g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3, true));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
  g.addGroup(0, cnt[0] * 3, 0);
  g.addGroup(cnt[0] * 3, cnt[1] * 3, 1);
  g.addGroup((cnt[0] + cnt[1]) * 3, cnt[2] * 3, 2);
  g.computeBoundingSphere();

  var tex = rockTexture();
  var mats = [
    new THREE.MeshLambertMaterial({ vertexColors: true, map: tex }),
    new THREE.MeshPhongMaterial({ vertexColors: true, map: tex, shininess: 42, specular: 0x6f8898 }),
    new THREE.MeshPhongMaterial({ vertexColors: true, map: tex, shininess: 12, specular: 0x442211, emissive: 0x3a0d00 }),
  ];
  for (var m = 0; m < mats.length; m++) triplanar(mats[m]);
  var mesh = new THREE.Mesh(g, mats);
  mesh.receiveShadow = true;
  T.mesh = mesh;
  return mesh;
};
