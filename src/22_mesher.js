/* =========================================================================
 * CHUNK MESHER
 *
 * Meshes one 16^3 section into three vertex streams (opaque / cutout /
 * translucent).  Vertices are 16 bytes:
 *   u16 x,y,z   position * 16, relative to the section
 *   u16 u,v     texel coords * 16 (so box models land on exact texels)
 *   u16 layer   texture-array layer
 *   u8  light   sky<<4 | block
 *   u8  ao      baked ambient occlusion, 0..255
 *   u8  extra   per-face directional shade
 *   u8  flags   normal(3) | tint(2) | wave(2)
 * ========================================================================= */

var PASS_OPAQUE = 0, PASS_CUTOUT = 1, PASS_TRANS = 2;
var TRANSLUCENT_NAMES = ['ice', 'slime_block', 'honey_block', 'nether_portal', 'tinted_glass'];

function classifyPasses() {
  for (var i = 0; i < BLOCKS.length; i++) {
    var b = BLOCKS[i];
    if (b.liquid) { b.pass = PASS_TRANS; }
    else if (b.name.indexOf('stained_glass') >= 0 || TRANSLUCENT_NAMES.indexOf(b.name) >= 0) b.pass = PASS_TRANS;
    else if (b.render === 'none') b.pass = -1;
    else if (!b.opaque) b.pass = PASS_CUTOUT;
    else b.pass = PASS_OPAQUE;
    b.tintIdx = b.tint === 'grass' || b.tint === 'grasstop' ? 1 : (b.tint === 'foliage' ? 2 : (b.tint === 'water' ? 3 : 0));
    b.sprite = (b.render === 'cross' || b.render === 'tall' || b.render === 'crop');
  }
}

/* corner selector per face: [xSel, ySel, zSel] (0 = min, 1 = max) */
var FACE_V = [
  [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]],   /* +X */
  [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],   /* -X */
  [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]],   /* +Y */
  [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],   /* -Y */
  [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],   /* +Z */
  [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]]    /* -Z */
];
/* which axes are tangent to each face: [axis1, axis2] with 0=x 1=y 2=z */
var FACE_TAN = [[2, 1], [2, 1], [0, 2], [0, 2], [0, 1], [0, 1]];
var AO_LUT = [0.44, 0.66, 0.83, 1.0];

/* ------------------------------------------------------- growable mesh -- */
function MeshBuf() {
  this.v = new Uint16Array(8 * 4096);
  this.n = 0;                    // uint16 slots used
  this.idx = new Uint16Array(6 * 1024);
  this.ni = 0;
  this.nv = 0;                   // vertex count
}
MeshBuf.prototype.reset = function () { this.n = 0; this.ni = 0; this.nv = 0; };
MeshBuf.prototype.grow = function () {
  if (this.n + 32 > this.v.length) {
    var nv = new Uint16Array(this.v.length * 2); nv.set(this.v); this.v = nv;
  }
  if (this.ni + 6 > this.idx.length) {
    var ni = new Uint16Array(this.idx.length * 2); ni.set(this.idx); this.idx = ni;
  }
};
MeshBuf.prototype.quad = function (p, uv, layer, light, ao, shade, flags, flip) {
  this.grow();
  var v = this.v, n = this.n, base = this.nv;
  for (var i = 0; i < 4; i++) {
    v[n] = p[i * 3] * 16; v[n + 1] = p[i * 3 + 1] * 16; v[n + 2] = p[i * 3 + 2] * 16;
    v[n + 3] = uv[i * 2] * 16; v[n + 4] = uv[i * 2 + 1] * 16;
    v[n + 5] = layer;
    v[n + 6] = (ao[i] << 8) | light[i];
    v[n + 7] = (flags << 8) | shade;
    n += 8;
  }
  this.n = n; this.nv += 4;
  var q = this.idx, m = this.ni;
  if (flip) {
    q[m] = base + 1; q[m + 1] = base + 2; q[m + 2] = base + 3;
    q[m + 3] = base + 1; q[m + 4] = base + 3; q[m + 5] = base;
  } else {
    q[m] = base; q[m + 1] = base + 1; q[m + 2] = base + 2;
    q[m + 3] = base; q[m + 4] = base + 2; q[m + 5] = base + 3;
  }
  this.ni = m + 6;
};

/* ------------------------------------------------- neighbourhood cache -- */
var NB = 18;
var _nbB = new Uint16Array(NB * NB * NB);
var _nbL = new Uint8Array(NB * NB * NB);
function NIDX(x, y, z) { return (((y + 1) * NB) + (z + 1)) * NB + (x + 1); }

var _mbuf = [new MeshBuf(), new MeshBuf(), new MeshBuf()];
var _p = new Float32Array(12), _uv = new Float32Array(8);
var _lt = new Uint8Array(4), _ao = new Uint8Array(4);

function isOpaqueId(id) { return IS_OPAQUE[id] === 1; }

function meshSection(world, chunk, sy) {
  var b0 = sy * 16;
  /* pull the padded neighbourhood into flat arrays: everything after this
     is pure array work, which is what keeps meshing off the frame budget */
  var dim = chunk.dim;
  var wx0 = chunk.cx * 16, wz0 = chunk.cz * 16;
  for (var y = -1; y <= 16; y++) {
    var wy = b0 + y;
    for (var z = -1; z <= 16; z++) {
      for (var x = -1; x <= 16; x++) {
        var i = NIDX(x, y, z);
        if (wy < 0 || wy >= CH_H) { _nbB[i] = 0; _nbL[i] = wy >= CH_H ? 0xF0 : 0; continue; }
        _nbB[i] = world.getRaw(dim, wx0 + x, wy, wz0 + z);
        _nbL[i] = world.getLight(dim, wx0 + x, wy, wz0 + z);
      }
    }
  }
  _mbuf[0].reset(); _mbuf[1].reset(); _mbuf[2].reset();

  for (var ly = 0; ly < 16; ly++) {
    for (var lz = 0; lz < 16; lz++) {
      for (var lx = 0; lx < 16; lx++) {
        var raw = _nbB[NIDX(lx, ly, lz)];
        var id = raw & ID_MASK;
        if (id === 0) continue;
        var def = BLOCKS[id];
        if (def.pass < 0) continue;
        var st = (raw >>> ST_SHIFT) & 15;
        if (def.liquid) { emitFluid(def, st, lx, ly, lz); continue; }
        if (def.sprite) { emitSprite(def, st, lx, ly, lz); continue; }
        if (def.render === 'vine' || def.render === 'wire' || def.render === 'fire' ||
          def.render === 'portal' || def.render === 'endportal') { emitFlatDeco(def, st, lx, ly, lz); continue; }
        var boxes = modelFor(id, st);
        if (boxes === null) boxes = dynamicModel(def, st, lx, ly, lz);
        if (!boxes || !boxes.length) continue;
        emitBoxes(def, st, boxes, lx, ly, lz);
      }
    }
  }
  return _mbuf;
}

/* -------------------------------------------------- neighbour-aware ---- */
function nbConnects(def, lx, ly, lz, f) {
  var d = FACE_DIR[f];
  var raw = _nbB[NIDX(lx + d[0], ly + d[1], lz + d[2])];
  var id = raw & ID_MASK;
  if (id === 0) return false;
  var o = BLOCKS[id];
  if (o.render === def.render) return true;
  if (def.render === 'fence' && (o.render === 'gate')) return true;
  if (def.render === 'wall' && (o.render === 'gate')) return true;
  if (def.render === 'pane' && o.render === 'pane') return true;
  return o.opaque && o.solid;
}
function dynamicModel(def, st, lx, ly, lz) {
  var r = def.render;
  if (r === 'fence') return fenceModel(def, st, function (f) { return nbConnects(def, lx, ly, lz, f); });
  if (r === 'wall') return wallModel(def, st, function (f) { return nbConnects(def, lx, ly, lz, f); });
  if (r === 'pane') return paneModel(def, st, function (f) { return nbConnects(def, lx, ly, lz, f); });
  if (r === 'gate') return gateModel(def, st);
  if (r === 'stairs') return stairsModel(def, st, function (fc, top) { return stairShape(lx, ly, lz, fc, top); });
  if (r === 'bamboo') return [mkBox(6.5, 0, 6.5, 9.5, 16, 9.5, def.layers)];
  if (r === 'chorus') return [mkBox(2, 0, 2, 14, 16, 14, def.layers)];
  if (r === 'cocoa') return [mkBox(5, 7, 11, 11, 15, 16, def.layers)];
  return [mkBox(0, 0, 0, 16, 16, 16, def.layers, { cull: true })];
}
function stairAt(lx, ly, lz) {
  var raw = _nbB[NIDX(lx, ly, lz)];
  var id = raw & ID_MASK;
  if (id === 0 || BLOCKS[id].render !== 'stairs') return -1;
  return (raw >>> ST_SHIFT) & 15;
}
function stairShape(lx, ly, lz, fc, top) {
  var v = FACING_VEC[fc];
  var back = stairAt(lx - v[0], ly, lz - v[2]);
  if (back >= 0 && ((back & 4) !== 0) === top) {
    var bf = back & 3;
    if (FACING_VEC[bf][0] !== v[0] || FACING_VEC[bf][2] !== v[2]) {
      if (FACING_VEC[bf][0] !== -v[0] || FACING_VEC[bf][2] !== -v[2]) {
        return isLeftOf(fc, bf) ? 1 : 2;   /* outer corner */
      }
    }
  }
  var fwd = stairAt(lx + v[0], ly, lz + v[2]);
  if (fwd >= 0 && ((fwd & 4) !== 0) === top) {
    var ff = fwd & 3;
    if (FACING_VEC[ff][0] !== v[0] || FACING_VEC[ff][2] !== v[2]) {
      if (FACING_VEC[ff][0] !== -v[0] || FACING_VEC[ff][2] !== -v[2]) {
        return isLeftOf(fc, ff) ? 3 : 4;   /* inner corner */
      }
    }
  }
  return 0;
}
function isLeftOf(a, b) { return ((a + 3) & 3) === b; }

/* --------------------------------------------------------- box emitter -- */
function emitBoxes(def, st, boxes, lx, ly, lz) {
  var buf = _mbuf[def.pass];
  var flags = (def.tintIdx << 3) | (def.waving << 5);
  for (var bi = 0; bi < boxes.length; bi++) {
    var box = boxes[bi];
    var full = (box.x0 === 0 && box.y0 === 0 && box.z0 === 0 && box.x1 === 16 && box.y1 === 16 && box.z1 === 16);
    for (var f = 0; f < 6; f++) {
      if (box.flatFace !== undefined && box.flatFace !== f && FACE_OPP[box.flatFace] !== f) continue;
      var d = FACE_DIR[f];
      /* is this face on the block boundary?  only then can it be culled */
      var onEdge =
        (f === 0 && box.x1 === 16) || (f === 1 && box.x0 === 0) ||
        (f === 2 && box.y1 === 16) || (f === 3 && box.y0 === 0) ||
        (f === 4 && box.z1 === 16) || (f === 5 && box.z0 === 0);
      if (onEdge && !box.noCull) {
        var nraw = _nbB[NIDX(lx + d[0], ly + d[1], lz + d[2])];
        var nid = nraw & ID_MASK;
        if (nid !== 0) {
          var no = BLOCKS[nid];
          if (no.opaque && no.solid) continue;
          /* hide the seam between two of the same transparent block */
          if (nid === (def.id) && def.pass !== PASS_OPAQUE && !def.sprite) continue;
          if (def.pass === PASS_TRANS && no.pass === PASS_TRANS && no.liquid) continue;
          if (full && no.solid && no.opaque) continue;
        }
      }
      emitFace(buf, def, box, f, lx, ly, lz, onEdge, flags);
    }
  }
}

function emitFace(buf, def, box, f, lx, ly, lz, onEdge, flags) {
  var vsel = FACE_V[f], d = FACE_DIR[f];
  var layer = faceLayer(box, def, f);
  var tan = FACE_TAN[f];
  var shade = Math.round(FACE_SHADE[f] * 255);
  var xs = [box.x0, box.x1], ys = [box.y0, box.y1], zs = [box.z0, box.z1];
  var lightBase = _nbL[NIDX(lx + d[0], ly + d[1], lz + d[2])];
  for (var i = 0; i < 4; i++) {
    var s = vsel[i];
    var px = xs[s[0]] / 16, py = ys[s[1]] / 16, pz = zs[s[2]] / 16;
    _p[i * 3] = lx + px; _p[i * 3 + 1] = ly + py; _p[i * 3 + 2] = lz + pz;
    /* uv follows the box extents, so a half-slab samples half the tile */
    var u, v;
    switch (f) {
      case 0: u = 16 - zs[s[2]]; v = 16 - ys[s[1]]; break;
      case 1: u = zs[s[2]]; v = 16 - ys[s[1]]; break;
      case 2: u = xs[s[0]]; v = zs[s[2]]; break;
      case 3: u = xs[s[0]]; v = 16 - zs[s[2]]; break;
      case 4: u = xs[s[0]]; v = 16 - ys[s[1]]; break;
      default: u = 16 - xs[s[0]]; v = 16 - ys[s[1]];
    }
    _uv[i * 2] = u; _uv[i * 2 + 1] = v;

    if (onEdge) {
      /* ambient occlusion + smooth light from the three blocks touching
         this corner on the outside of the face */
      var s1 = s[tan[0]] ? 1 : -1, s2 = s[tan[1]] ? 1 : -1;
      var o1 = [0, 0, 0], o2 = [0, 0, 0];
      o1[tan[0]] = s1; o2[tan[1]] = s2;
      var bx = lx + d[0], by = ly + d[1], bz = lz + d[2];
      var a1 = _nbB[NIDX(bx + o1[0], by + o1[1], bz + o1[2])] & ID_MASK;
      var a2 = _nbB[NIDX(bx + o2[0], by + o2[1], bz + o2[2])] & ID_MASK;
      var ac = _nbB[NIDX(bx + o1[0] + o2[0], by + o1[1] + o2[1], bz + o1[2] + o2[2])] & ID_MASK;
      var q1 = isOpaqueId(a1) ? 1 : 0, q2 = isOpaqueId(a2) ? 1 : 0, qc = isOpaqueId(ac) ? 1 : 0;
      var aoLvl = (q1 && q2) ? 0 : (3 - (q1 + q2 + qc));
      _ao[i] = Math.round(AO_LUT[aoLvl] * 255);
      /* smooth light: mean of the non-opaque contributors */
      var sky = (lightBase >> 4) & 15, blk = lightBase & 15, cnt = 1;
      var l1 = _nbL[NIDX(bx + o1[0], by + o1[1], bz + o1[2])];
      var l2 = _nbL[NIDX(bx + o2[0], by + o2[1], bz + o2[2])];
      var lc = _nbL[NIDX(bx + o1[0] + o2[0], by + o1[1] + o2[1], bz + o1[2] + o2[2])];
      if (!q1) { sky += (l1 >> 4) & 15; blk += l1 & 15; cnt++; }
      if (!q2) { sky += (l2 >> 4) & 15; blk += l2 & 15; cnt++; }
      if (!qc && !(q1 && q2)) { sky += (lc >> 4) & 15; blk += lc & 15; cnt++; }
      _lt[i] = ((Math.round(sky / cnt) & 15) << 4) | (Math.round(blk / cnt) & 15);
    } else {
      _ao[i] = 255;
      _lt[i] = lightBase;
    }
  }
  /* the low three flag bits carry the face index, which the shader turns
     back into the surface normal */
  buf.quad(_p, _uv, layer, _lt, _ao, shade, flags | f,
    _ao[0] + _ao[2] > _ao[1] + _ao[3] ? 0 : 1);
}

/* ---------------------------------------------------------- sprites ----- */
function emitSprite(def, st, lx, ly, lz) {
  var buf = _mbuf[def.pass];
  var layer = def.layers[2];
  var flags = (def.tintIdx << 3) | ((def.waving || 1) << 5);
  var light = _nbL[NIDX(lx, ly, lz)];
  var l4 = [light, light, light, light], a4 = [255, 255, 255, 255];
  var shade = 255;
  var h = 1;
  if (def.render === 'crop') {
    var stage = st & 7;
    for (var q = 0; q < 4; q++) {
      var o = q < 2 ? 0.25 : 0.75;
      var alongX = q % 2 === 0;
      spriteQuad(buf, lx, ly, lz, alongX, o, layer, l4, a4, shade, flags);
    }
    return;
  }
  /* two diagonal planes, both sides */
  var inset = 0.05;
  var A = [[inset, 0, inset], [1 - inset, 0, 1 - inset]];
  var B = [[1 - inset, 0, inset], [inset, 0, 1 - inset]];
  diagQuad(buf, lx, ly, lz, A, layer, l4, a4, shade, flags);
  diagQuad(buf, lx, ly, lz, B, layer, l4, a4, shade, flags);
}
function diagQuad(buf, lx, ly, lz, seg, layer, l4, a4, shade, flags) {
  var a = seg[0], b = seg[1];
  _p[0] = lx + a[0]; _p[1] = ly; _p[2] = lz + a[2];
  _p[3] = lx + b[0]; _p[4] = ly; _p[5] = lz + b[2];
  _p[6] = lx + b[0]; _p[7] = ly + 1; _p[8] = lz + b[2];
  _p[9] = lx + a[0]; _p[10] = ly + 1; _p[11] = lz + a[2];
  _uv[0] = 0; _uv[1] = 16; _uv[2] = 16; _uv[3] = 16; _uv[4] = 16; _uv[5] = 0; _uv[6] = 0; _uv[7] = 0;
  buf.quad(_p, _uv, layer, l4, a4, shade, flags | 2, 0);
  buf.quad(_p, _uv, layer, l4, a4, shade, flags | 2, 1);
}
function spriteQuad(buf, lx, ly, lz, alongX, off, layer, l4, a4, shade, flags) {
  if (alongX) {
    _p[0] = lx; _p[1] = ly; _p[2] = lz + off;
    _p[3] = lx + 1; _p[4] = ly; _p[5] = lz + off;
    _p[6] = lx + 1; _p[7] = ly + 1; _p[8] = lz + off;
    _p[9] = lx; _p[10] = ly + 1; _p[11] = lz + off;
  } else {
    _p[0] = lx + off; _p[1] = ly; _p[2] = lz;
    _p[3] = lx + off; _p[4] = ly; _p[5] = lz + 1;
    _p[6] = lx + off; _p[7] = ly + 1; _p[8] = lz + 1;
    _p[9] = lx + off; _p[10] = ly + 1; _p[11] = lz;
  }
  _uv[0] = 0; _uv[1] = 16; _uv[2] = 16; _uv[3] = 16; _uv[4] = 16; _uv[5] = 0; _uv[6] = 0; _uv[7] = 0;
  buf.quad(_p, _uv, layer, l4, a4, shade, flags | 2, 0);
  buf.quad(_p, _uv, layer, l4, a4, shade, flags | 2, 1);
}

/* vines, redstone dust, fire, portals: thin quads hugging a face */
function emitFlatDeco(def, st, lx, ly, lz) {
  var buf = _mbuf[def.pass];
  var layer = def.layers[2];
  var flags = (def.tintIdx << 3) | (def.waving << 5);
  var light = _nbL[NIDX(lx, ly, lz)];
  var l4 = [light, light, light, light], a4 = [255, 255, 255, 255];
  var r = def.render;
  var eps = 0.02;
  if (r === 'wire' || (r === 'vine' && attachedDown(lx, ly, lz))) {
    _p[0] = lx; _p[1] = ly + eps; _p[2] = lz; _p[3] = lx + 1; _p[4] = ly + eps; _p[5] = lz;
    _p[6] = lx + 1; _p[7] = ly + eps; _p[8] = lz + 1; _p[9] = lx; _p[10] = ly + eps; _p[11] = lz + 1;
    _uv[0] = 0; _uv[1] = 0; _uv[2] = 16; _uv[3] = 0; _uv[4] = 16; _uv[5] = 16; _uv[6] = 0; _uv[7] = 16;
    buf.quad(_p, _uv, layer, l4, a4, 255, flags, 0);
    if (r === 'wire') return;
  }
  if (r === 'portal' || r === 'endportal') {
    var boxes = r === 'endportal' ? [mkBox(0, 0, 0, 16, 12.5, 16, def.layers)] :
      [mkBox(0, 0, 6, 16, 16, 10, def.layers)];
    emitBoxes(def, st, boxes, lx, ly, lz);
    return;
  }
  if (r === 'fire') {
    for (var q = 0; q < 4; q++) {
      var f = [4, 5, 0, 1][q];
      var d = FACE_DIR[f];
      var nid = _nbB[NIDX(lx + d[0], ly + d[1], lz + d[2])] & ID_MASK;
      var below = _nbB[NIDX(lx, ly - 1, lz)] & ID_MASK;
      if (!IS_OPAQUE[nid] && !IS_OPAQUE[below]) continue;
      wallQuad(buf, lx, ly, lz, f, 0.1, layer, l4, a4, flags | 2);
    }
    return;
  }
  /* vines cling to any solid face they touch */
  for (var f2 = 0; f2 < 6; f2++) {
    if (f2 === 2) continue;
    var dd = FACE_DIR[f2];
    var nb = _nbB[NIDX(lx + dd[0], ly + dd[1], lz + dd[2])] & ID_MASK;
    if (!IS_OPAQUE[nb]) continue;
    if (f2 === 3) {
      _p[0] = lx; _p[1] = ly + 1 - eps; _p[2] = lz; _p[3] = lx + 1; _p[4] = ly + 1 - eps; _p[5] = lz;
      _p[6] = lx + 1; _p[7] = ly + 1 - eps; _p[8] = lz + 1; _p[9] = lx; _p[10] = ly + 1 - eps; _p[11] = lz + 1;
      _uv[0] = 0; _uv[1] = 0; _uv[2] = 16; _uv[3] = 0; _uv[4] = 16; _uv[5] = 16; _uv[6] = 0; _uv[7] = 16;
      buf.quad(_p, _uv, layer, l4, a4, 255, flags | 2, 1);
      continue;
    }
    wallQuad(buf, lx, ly, lz, f2, eps, layer, l4, a4, flags | 2);
  }
}
function attachedDown(lx, ly, lz) {
  return IS_OPAQUE[_nbB[NIDX(lx, ly + 1, lz)] & ID_MASK] === 1;
}
function wallQuad(buf, lx, ly, lz, f, eps, layer, l4, a4, flags) {
  var d = FACE_DIR[f];
  var ox = d[0] * (0.5 - eps), oz = d[2] * (0.5 - eps);
  var ax = d[2] !== 0 ? 1 : 0, az = d[0] !== 0 ? 1 : 0;
  var cx = lx + 0.5 + ox, cz = lz + 0.5 + oz;
  _p[0] = cx - ax * 0.5; _p[1] = ly; _p[2] = cz - az * 0.5;
  _p[3] = cx + ax * 0.5; _p[4] = ly; _p[5] = cz + az * 0.5;
  _p[6] = cx + ax * 0.5; _p[7] = ly + 1; _p[8] = cz + az * 0.5;
  _p[9] = cx - ax * 0.5; _p[10] = ly + 1; _p[11] = cz - az * 0.5;
  _uv[0] = 0; _uv[1] = 16; _uv[2] = 16; _uv[3] = 16; _uv[4] = 16; _uv[5] = 0; _uv[6] = 0; _uv[7] = 0;
  buf.quad(_p, _uv, layer, l4, a4, 255, flags, 0);
  buf.quad(_p, _uv, layer, l4, a4, 255, flags, 1);
}

/* ----------------------------------------------------------- fluids ----- */
function fluidHeight(raw, id) {
  var lv = (raw >>> ST_SHIFT) & 15;
  if (lv >= 8) return 1.0;                 /* falling column fills the block */
  return 1.0 - (lv + 1) / 9.0;
}
function fluidAt(lx, ly, lz, id) {
  var raw = _nbB[NIDX(lx, ly, lz)];
  var nid = raw & ID_MASK;
  if (nid === id || (BLOCKS[nid] && BLOCKS[nid].liquid === BLOCKS[id].liquid)) return raw;
  return -1;
}
function cornerHeight(lx, ly, lz, id, dx, dz) {
  var sum = 0, cnt = 0;
  for (var iz = 0; iz <= 1; iz++) for (var ix = 0; ix <= 1; ix++) {
    var sx = lx + dx * ix, sz = lz + dz * iz;
    if (fluidAt(sx, ly + 1, sz, id) >= 0) return 1.0;
    var r = fluidAt(sx, ly, sz, id);
    if (r >= 0) { sum += fluidHeight(r, id); cnt++; }
    else if ((_nbB[NIDX(sx, ly, sz)] & ID_MASK) === 0) { cnt++; }
  }
  if (cnt === 0) return fluidHeight(_nbB[NIDX(lx, ly, lz)], id);
  return sum / cnt;
}
function emitFluid(def, st, lx, ly, lz) {
  var buf = _mbuf[PASS_TRANS];
  var id = def.id;
  var layer = def.layers[2];
  /* bit 7 marks lava, so the translucent shader can tell the two fluids
     apart inside a single draw call */
  var flags = (def.tintIdx << 3) | (3 << 5) | (def.liquid === 'lava' ? 128 : 0);
  var light = _nbL[NIDX(lx, ly, lz)];
  var upRaw = fluidAt(lx, ly + 1, lz, id);
  var topFull = upRaw >= 0;
  var h00 = topFull ? 1 : cornerHeight(lx, ly, lz, id, -1, -1);
  var h10 = topFull ? 1 : cornerHeight(lx, ly, lz, id, 1, -1);
  var h11 = topFull ? 1 : cornerHeight(lx, ly, lz, id, 1, 1);
  var h01 = topFull ? 1 : cornerHeight(lx, ly, lz, id, -1, 1);
  var l4 = [light, light, light, light], a4 = [255, 255, 255, 255];

  /* top */
  var above = _nbB[NIDX(lx, ly + 1, lz)] & ID_MASK;
  if (!topFull && !(BLOCKS[above] && BLOCKS[above].opaque)) {
    _p[0] = lx; _p[1] = ly + h00; _p[2] = lz;
    _p[3] = lx; _p[4] = ly + h01; _p[5] = lz + 1;
    _p[6] = lx + 1; _p[7] = ly + h11; _p[8] = lz + 1;
    _p[9] = lx + 1; _p[10] = ly + h10; _p[11] = lz;
    _uv[0] = 0; _uv[1] = 0; _uv[2] = 0; _uv[3] = 16; _uv[4] = 16; _uv[5] = 16; _uv[6] = 16; _uv[7] = 0;
    var lu = _nbL[NIDX(lx, ly + 1, lz)];
    var lu4 = [lu, lu, lu, lu];
    buf.quad(_p, _uv, layer, lu4, a4, 255, flags | 2, 0);
    buf.quad(_p, _uv, layer, lu4, a4, 255, flags | 2, 1);
  }
  /* sides */
  var sides = [[0, 1, 0, h10, h11], [1, -1, 0, h00, h01], [4, 0, 1, h11, h01], [5, 0, -1, h00, h10]];
  for (var s = 0; s < 4; s++) {
    var f = sides[s][0], d = FACE_DIR[f];
    var nraw = _nbB[NIDX(lx + d[0], ly + d[1], lz + d[2])];
    var nid = nraw & ID_MASK;
    if (nid !== 0) {
      var no = BLOCKS[nid];
      if (no.opaque && no.solid) continue;
      if (no.liquid === def.liquid) continue;
    }
    var ha, hb;
    var x0, z0, x1, z1;
    if (f === 0) { x0 = x1 = lx + 1; z0 = lz + 1; z1 = lz; ha = h11; hb = h10; }
    else if (f === 1) { x0 = x1 = lx; z0 = lz; z1 = lz + 1; ha = h00; hb = h01; }
    else if (f === 4) { z0 = z1 = lz + 1; x0 = lx; x1 = lx + 1; ha = h01; hb = h11; }
    else { z0 = z1 = lz; x0 = lx + 1; x1 = lx; ha = h10; hb = h00; }
    _p[0] = x0; _p[1] = ly; _p[2] = z0;
    _p[3] = x1; _p[4] = ly; _p[5] = z1;
    _p[6] = x1; _p[7] = ly + hb; _p[8] = z1;
    _p[9] = x0; _p[10] = ly + ha; _p[11] = z0;
    _uv[0] = 0; _uv[1] = 16; _uv[2] = 16; _uv[3] = 16;
    _uv[4] = 16; _uv[5] = 16 - hb * 16; _uv[6] = 0; _uv[7] = 16 - ha * 16;
    var ls = _nbL[NIDX(lx + d[0], ly + d[1], lz + d[2])];
    var ls4 = [ls, ls, ls, ls];
    buf.quad(_p, _uv, layer, ls4, a4, Math.round(FACE_SHADE[f] * 255), flags | f, 0);
    buf.quad(_p, _uv, layer, ls4, a4, Math.round(FACE_SHADE[f] * 255), flags | f, 1);
  }
  /* bottom */
  var below = _nbB[NIDX(lx, ly - 1, lz)] & ID_MASK;
  if (below !== 0 && !BLOCKS[below].opaque && BLOCKS[below].liquid !== def.liquid) {
    _p[0] = lx; _p[1] = ly; _p[2] = lz; _p[3] = lx + 1; _p[4] = ly; _p[5] = lz;
    _p[6] = lx + 1; _p[7] = ly; _p[8] = lz + 1; _p[9] = lx; _p[10] = ly; _p[11] = lz + 1;
    _uv[0] = 0; _uv[1] = 0; _uv[2] = 16; _uv[3] = 0; _uv[4] = 16; _uv[5] = 16; _uv[6] = 0; _uv[7] = 16;
    buf.quad(_p, _uv, layer, l4, a4, Math.round(FACE_SHADE[3] * 255), flags | 3, 0);
  }
}
