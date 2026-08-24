/* =========================================================================
 * BLOCK MODELS — every block resolves to a list of boxes in 0..16 units,
 * exactly like the real game's model JSON.  One mesher then handles slabs,
 * stairs, fences, lanterns, anvils and brewing stands with no special cases.
 * ========================================================================= */

/* face order: 0:+X 1:-X 2:+Y 3:-Y 4:+Z 5:-Z */
var FACE_DIR = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
var FACE_OPP = [1, 0, 3, 2, 5, 4];
/* directional shading, matching the game's flat lighting bias */
var FACE_SHADE = [0.72, 0.72, 1.0, 0.55, 0.86, 0.86];
/* facing state (0=N 1=E 2=S 3=W) -> face index */
var FACING_FACE = [5, 0, 4, 1];
var FACING_VEC = [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0]];

function mkBox(x0, y0, z0, x1, y1, z1, tex, opts) {
  var b = { x0: x0, y0: y0, z0: z0, x1: x1, y1: y1, z1: z1, tex: tex || null };
  if (opts) for (var k in opts) b[k] = opts[k];
  return b;
}
/* tex is either a single layer index (all faces) or an array of 6 */
function faceLayer(b, blockDef, f) {
  if (b.tex === null || b.tex === undefined) {
    return blockDef.layers ? blockDef.layers[f] : 0;
  }
  if (typeof b.tex === 'number') return b.tex;
  return b.tex[f];
}

var _modelCache = {};
function cubeLayers(def, state) {
  var L = def.layers;
  if (!L) return [0, 0, 0, 0, 0, 0];
  var out = [L[0], L[1], L[2], L[3], L[4], L[5]];
  if (def.place === 'axis') {
    var ax = state & 3;
    if (ax === 1) { /* X axis: caps on +-X */
      out[0] = out[1] = L[2]; out[2] = out[3] = L[0]; out[4] = out[5] = L[0];
    } else if (ax === 2) { /* Z axis */
      out[4] = out[5] = L[2]; out[2] = out[3] = L[0]; out[0] = out[1] = L[0];
    }
  } else if (def.place === 'facing' && def.frontLayer !== undefined) {
    out[FACING_FACE[state & 3]] = def.frontLayer;
    if (def.backLayer !== undefined) out[FACING_FACE[(state + 2) & 3]] = def.backLayer;
  } else if (def.place === 'facing6' && def.frontLayer !== undefined) {
    var f6 = state & 7;
    out[f6 < 6 ? f6 : 5] = def.frontLayer;
    if (def.backLayer !== undefined) out[FACE_OPP[f6 < 6 ? f6 : 5]] = def.backLayer;
  }
  return out;
}

/* Static (neighbour-independent) model for a block state, or null when the
   block needs the neighbour-aware path in the mesher. */
function modelFor(id, state) {
  var key = (id << 4) | state;
  var m = _modelCache[key];
  if (m !== undefined) return m;
  m = buildModel(id, state);
  _modelCache[key] = m;
  return m;
}

function buildModel(id, state) {
  var def = BLOCKS[id];
  var L = cubeLayers(def, state);
  var r = def.render;
  switch (r) {
    case 'none': return [];
    case 'cube': return [mkBox(0, 0, 0, 16, 16, 16, L, { cull: true })];
    case 'box': return [mkBox(0, 0, 0, 16, def.boxes ? def.boxes[0].t[1] : 16, 16, L, { cull: true })];
    case 'skull': return [mkBox(4, 0, 4, 12, 8, 12, L, {})];
    case 'slab': {
      var half = state & 3;
      if (half === 2) return [mkBox(0, 0, 0, 16, 16, 16, L, { cull: true })];
      return half === 1 ? [mkBox(0, 8, 0, 16, 16, 16, L, { cullTop: true })]
        : [mkBox(0, 0, 0, 16, 8, 16, L, { cullBottom: true })];
    }
    case 'carpet': return [mkBox(0, 0, 0, 16, 1, 16, L)];
    case 'layer': {
      var lv = (state & 7) + 1;
      if (lv >= 8) return [mkBox(0, 0, 0, 16, 16, 16, L, { cull: true })];
      return [mkBox(0, 0, 0, 16, lv * 2, 16, L)];
    }
    case 'plate': return [mkBox(1, 0, 1, 15, 1, 15, L)];
    case 'button': {
      var bf = state & 7;
      var t = 2;
      if (bf === 2) return [mkBox(5, 0, 6, 11, t, 10, L)];
      if (bf === 3) return [mkBox(5, 16 - t, 6, 11, 16, 10, L)];
      if (bf === 0) return [mkBox(0, 6, 5, t, 10, 11, L)];
      if (bf === 1) return [mkBox(16 - t, 6, 5, 16, 10, 11, L)];
      if (bf === 4) return [mkBox(5, 6, 0, 11, 10, t, L)];
      return [mkBox(5, 6, 16 - t, 11, 10, 16, L)];
    }
    case 'trapdoor': {
      var open = (state & 4) !== 0, top = (state & 8) !== 0, fc = state & 3;
      if (!open) return [top ? mkBox(0, 13, 0, 16, 16, 16, L) : mkBox(0, 0, 0, 16, 3, 16, L)];
      var v = FACING_VEC[fc];
      if (v[0] === 1) return [mkBox(0, 0, 0, 3, 16, 16, L)];
      if (v[0] === -1) return [mkBox(13, 0, 0, 16, 16, 16, L)];
      if (v[2] === 1) return [mkBox(0, 0, 0, 16, 16, 3, L)];
      return [mkBox(0, 0, 13, 16, 16, 16, L)];
    }
    case 'door': {
      var dfc = state & 3, dopen = (state & 4) !== 0, dtop = (state & 8) !== 0;
      var eff = dopen ? ((dfc + 1) & 3) : dfc;
      var dv = FACING_VEC[eff];
      var box;
      if (dv[2] === -1) box = mkBox(0, 0, 0, 16, 16, 3, L);
      else if (dv[2] === 1) box = mkBox(0, 0, 13, 16, 16, 16, L);
      else if (dv[0] === 1) box = mkBox(13, 0, 0, 16, 16, 16, L);
      else box = mkBox(0, 0, 0, 3, 16, 16, L);
      box.doorHalf = dtop ? 1 : 0;
      return [box];
    }
    case 'torch': {
      var tf = state & 7;
      if (tf === 2 || tf > 5) return [mkBox(7, 0, 7, 9, 10, 9, L, { noCull: true, torch: 1 })];
      var tv = FACE_DIR[tf];
      return [mkBox(7 - tv[0] * 4, 3, 7 - tv[2] * 4, 9 - tv[0] * 4, 13, 9 - tv[2] * 4, L, { noCull: true, torch: 1 })];
    }
    case 'lantern': {
      var hang = (state & 8) !== 0;
      return hang
        ? [mkBox(5, 1, 5, 11, 9, 11, L), mkBox(6, 9, 6, 10, 16, 10, L)]
        : [mkBox(5, 0, 5, 11, 7, 11, L), mkBox(6, 7, 6, 10, 9, 10, L)];
    }
    case 'endrod': {
      var ef = state & 7;
      if (ef === 2 || ef === 3) return [mkBox(6, 0, 6, 10, 16, 10, L), mkBox(5, ef === 2 ? 0 : 15, 5, 11, ef === 2 ? 1 : 16, 11, L)];
      var ev = FACE_DIR[ef < 6 ? ef : 2];
      if (ev[0]) return [mkBox(0, 6, 6, 16, 10, 10, L)];
      return [mkBox(6, 6, 0, 10, 10, 16, L)];
    }
    case 'chain': {
      var ca = state & 3;
      if (ca === 1) return [mkBox(0, 6.5, 6.5, 16, 9.5, 9.5, L)];
      if (ca === 2) return [mkBox(6.5, 6.5, 0, 9.5, 9.5, 16, L)];
      return [mkBox(6.5, 0, 6.5, 9.5, 16, 9.5, L)];
    }
    case 'rod': {
      var rf = state & 7;
      if (rf === 2 || rf === 3) return [mkBox(6, 0, 6, 10, 16, 10, L)];
      var rv = FACE_DIR[rf < 6 ? rf : 2];
      if (rv[0]) return [mkBox(rv[0] > 0 ? 8 : 0, 6, 6, rv[0] > 0 ? 16 : 8, 10, 10, L)];
      return [mkBox(6, 6, rv[2] > 0 ? 8 : 0, 10, 10, rv[2] > 0 ? 16 : 8, L)];
    }
    case 'cactus': return [mkBox(1, 0, 1, 15, 16, 15, L, { cullTop: true, cullBottom: true, cactus: 1 })];
    case 'chest': return [mkBox(1, 0, 1, 15, 14, 15, L)];
    case 'enchanting': return [mkBox(0, 0, 0, 16, 12, 16, L)];
    case 'anvil': {
      var av = FACING_VEC[state & 3];
      var wide = av[0] !== 0;
      return [
        mkBox(wide ? 3 : 2, 0, wide ? 2 : 3, wide ? 13 : 14, 4, wide ? 14 : 13, L),
        mkBox(4, 4, 4, 12, 5, 12, L),
        mkBox(6, 5, 5, 10, 10, 11, L),
        mkBox(wide ? 2 : 0, 10, wide ? 0 : 2, wide ? 14 : 16, 16, wide ? 16 : 14, L)
      ];
    }
    case 'brewing': return [mkBox(7, 0, 7, 9, 14, 9, L), mkBox(2, 0, 2, 14, 2, 14, L)];
    case 'cauldron': return [
      mkBox(0, 0, 0, 16, 3, 16, L), mkBox(0, 3, 0, 2, 16, 16, L), mkBox(14, 3, 0, 16, 16, 16, L),
      mkBox(2, 3, 0, 14, 16, 2, L), mkBox(2, 3, 14, 14, 16, 16, L)
    ];
    case 'composter': return [
      mkBox(0, 0, 0, 16, 2, 16, L), mkBox(0, 2, 0, 2, 16, 16, L), mkBox(14, 2, 0, 16, 16, 16, L),
      mkBox(2, 2, 0, 14, 16, 2, L), mkBox(2, 2, 14, 14, 16, 16, L)
    ];
    case 'hopper': return [
      mkBox(0, 10, 0, 16, 16, 16, L), mkBox(4, 4, 4, 12, 10, 12, L), mkBox(6, 0, 6, 10, 4, 10, L)
    ];
    case 'grindstone': return [mkBox(2, 4, 4, 14, 16, 12, L), mkBox(0, 0, 4, 4, 6, 12, L), mkBox(12, 0, 4, 16, 6, 12, L)];
    case 'stonecutter': return [mkBox(0, 0, 0, 16, 9, 16, L), mkBox(7, 9, 1, 9, 16, 15, L)];
    case 'lectern': return [mkBox(0, 0, 0, 16, 2, 16, L), mkBox(4, 2, 4, 12, 10, 12, L), mkBox(1, 10, 1, 15, 14, 15, L)];
    case 'bell': return [mkBox(5, 3, 5, 11, 13, 11, L), mkBox(4, 13, 4, 12, 16, 12, L)];
    case 'beacon': return [mkBox(0, 0, 0, 16, 16, 16, L, { cull: true })];
    case 'conduit': return [mkBox(5, 5, 5, 11, 11, 11, L)];
    case 'campfire': return [
      mkBox(0, 0, 0, 16, 4, 16, L), mkBox(1, 4, 6, 15, 8, 10, L)
    ];
    case 'pot': return [mkBox(5, 0, 5, 11, 6, 11, L)];
    case 'flat': return [mkBox(0, 0.4, 0, 16, 0.6, 16, L, { flat: 1 })];
    case 'sign': return [mkBox(0, 0, 7, 16, 12, 9, L)];
    case 'bed': {
      var bv = FACING_VEC[state & 3];
      return [mkBox(0, 3, 0, 16, 9, 16, L)];
    }
    case 'candle': return [mkBox(7, 0, 7, 9, 6, 9, L, { noCull: true })];
    case 'shrieker': return [mkBox(0, 0, 0, 16, 8, 16, L)];
    case 'sensor': return [mkBox(0, 0, 0, 16, 8, 16, L)];
    case 'repeater': return [mkBox(0, 0, 0, 16, 2, 16, L)];
    case 'lever': return [mkBox(5, 0, 4, 11, 3, 12, L), mkBox(7, 3, 7, 9, 11, 9, L)];
    case 'hook': return [mkBox(6, 5, 12, 10, 11, 16, L)];
    case 'piston': return [mkBox(0, 0, 0, 16, 16, 16, L, { cull: true })];
    case 'frame': return [mkBox(0, 0, 0, 16, 13, 16, L), mkBox(4, 13, 4, 12, 16, 12, L)];
    case 'dragonegg': return [mkBox(1, 0, 1, 15, 16, 15, L)];
    case 'scaffold': return [mkBox(0, 14, 0, 16, 16, 16, L), mkBox(0, 0, 0, 2, 14, 2, L),
      mkBox(14, 0, 0, 16, 14, 2, L), mkBox(0, 0, 14, 2, 14, 16, L), mkBox(14, 0, 14, 16, 14, 16, L)];
    case 'ladder': {
      var lf = FACING_FACE[state & 3];
      var lv = FACE_DIR[lf];
      if (lv[2] === -1) return [mkBox(0, 0, 0, 16, 16, 1, L, { flatFace: 5 })];
      if (lv[2] === 1) return [mkBox(0, 0, 15, 16, 16, 16, L, { flatFace: 4 })];
      if (lv[0] === 1) return [mkBox(15, 0, 0, 16, 16, 16, L, { flatFace: 0 })];
      return [mkBox(0, 0, 0, 1, 16, 16, L, { flatFace: 1 })];
    }
    case 'rail': return [mkBox(0, 0, 0, 16, 0.6, 16, L, { flat: 1 })];
    case 'dripstone': {
      var down = (state & 1) === 1;
      return down ? [mkBox(5, 0, 5, 11, 16, 11, L)] : [mkBox(5, 0, 5, 11, 16, 11, L)];
    }
    case 'liquid': return null;      // handled by the fluid mesher
    case 'cross': case 'tall': case 'crop': case 'bamboo': case 'chorus':
    case 'vine': case 'wire': case 'fire': case 'portal': case 'endportal':
    case 'fence': case 'gate': case 'wall': case 'pane': case 'stairs': case 'cocoa':
      return null;                   // neighbour-aware or sprite geometry
    default:
      return [mkBox(0, 0, 0, 16, 16, 16, L, { cull: true })];
  }
}

/* ---- neighbour-aware shapes -------------------------------------------- */
function fenceModel(def, state, nb) {
  var L = def.layers, out = [];
  out.push(mkBox(6, 0, 6, 10, 16, 10, L));
  var dirs = [[0, 1, 0, 0], [1, -1, 0, 0], [4, 0, 0, 1], [5, 0, 0, -1]];
  for (var i = 0; i < 4; i++) {
    var f = dirs[i][0];
    if (!nb(f)) continue;
    var dx = dirs[i][2], dz = dirs[i][3];
    if (dx > 0) { out.push(mkBox(10, 12, 7, 16, 15, 9, L)); out.push(mkBox(10, 6, 7, 16, 9, 9, L)); }
    else if (dx < 0) { out.push(mkBox(0, 12, 7, 6, 15, 9, L)); out.push(mkBox(0, 6, 7, 6, 9, 9, L)); }
    else if (dz > 0) { out.push(mkBox(7, 12, 10, 9, 15, 16, L)); out.push(mkBox(7, 6, 10, 9, 9, 16, L)); }
    else { out.push(mkBox(7, 12, 0, 9, 15, 6, L)); out.push(mkBox(7, 6, 0, 9, 9, 6, L)); }
  }
  return out;
}
function wallModel(def, state, nb) {
  var L = def.layers, out = [];
  var n = nb(5), s = nb(4), e = nb(0), w = nb(1);
  var straightNS = n && s && !e && !w, straightEW = e && w && !n && !s;
  if (!(straightNS || straightEW)) out.push(mkBox(4, 0, 4, 12, 16, 12, L));
  if (n) out.push(mkBox(5, 0, 0, 11, 14, 5, L));
  if (s) out.push(mkBox(5, 0, 11, 11, 14, 16, L));
  if (e) out.push(mkBox(11, 0, 5, 16, 14, 11, L));
  if (w) out.push(mkBox(0, 0, 5, 5, 14, 11, L));
  return out;
}
function paneModel(def, state, nb) {
  var L = def.layers, out = [];
  var n = nb(5), s = nb(4), e = nb(0), w = nb(1);
  if (!n && !s && !e && !w) { n = s = e = w = true; }
  out.push(mkBox(7, 0, 7, 9, 16, 9, L, { paneCore: 1 }));
  if (n) out.push(mkBox(7, 0, 0, 9, 16, 7, L));
  if (s) out.push(mkBox(7, 0, 9, 9, 16, 16, L));
  if (e) out.push(mkBox(9, 0, 7, 16, 16, 9, L));
  if (w) out.push(mkBox(0, 0, 7, 7, 16, 9, L));
  return out;
}
function gateModel(def, state) {
  var L = def.layers, fc = state & 3, open = (state & 4) !== 0;
  var out = [];
  var v = FACING_VEC[fc];
  var alongX = v[0] !== 0;
  if (open) {
    if (alongX) { out.push(mkBox(6, 0, 0, 10, 16, 2, L)); out.push(mkBox(6, 0, 14, 10, 16, 16, L)); }
    else { out.push(mkBox(0, 0, 6, 2, 16, 10, L)); out.push(mkBox(14, 0, 6, 16, 16, 10, L)); }
  } else if (alongX) {
    out.push(mkBox(6, 0, 0, 10, 16, 2, L)); out.push(mkBox(6, 0, 14, 10, 16, 16, L));
    out.push(mkBox(7, 6, 2, 9, 9, 14, L)); out.push(mkBox(7, 12, 2, 9, 15, 14, L));
  } else {
    out.push(mkBox(0, 0, 6, 2, 16, 10, L)); out.push(mkBox(14, 0, 6, 16, 16, 10, L));
    out.push(mkBox(2, 6, 7, 14, 9, 9, L)); out.push(mkBox(2, 12, 7, 14, 15, 9, L));
  }
  return out;
}
/* stairs: base slab + upper step, with inner/outer corner shapes derived
   from what the neighbouring stairs are doing */
function stairsModel(def, state, nbStair) {
  var L = def.layers, fc = state & 3, top = (state & 4) !== 0;
  var out = [];
  out.push(top ? mkBox(0, 8, 0, 16, 16, 16, L, { cullTop: true }) : mkBox(0, 0, 0, 16, 8, 16, L, { cullBottom: true }));
  var y0 = top ? 0 : 8, y1 = top ? 8 : 16;
  var shape = nbStair ? nbStair(fc, top) : 0;
  var v = FACING_VEC[fc];
  function stepBox(x0, z0, x1, z1) { out.push(mkBox(x0, y0, z0, x1, y1, z1, L)); }
  var half = { x0: 0, z0: 0, x1: 16, z1: 16 };
  if (v[2] === -1) { half.z1 = 8; } else if (v[2] === 1) { half.z0 = 8; }
  else if (v[0] === 1) { half.x0 = 8; } else { half.x1 = 8; }
  if (shape === 0) {
    stepBox(half.x0, half.z0, half.x1, half.z1);
  } else if (shape === 1 || shape === 2) {           /* outer corner */
    var q = quadrantFor(fc, shape === 1);
    stepBox(q[0], q[1], q[2], q[3]);
  } else {                                            /* inner corner */
    stepBox(half.x0, half.z0, half.x1, half.z1);
    var q2 = quadrantFor((fc + (shape === 3 ? 3 : 1)) & 3, shape === 3);
    stepBox(q2[0], q2[1], q2[2], q2[3]);
  }
  return out;
}
function quadrantFor(fc, left) {
  var v = FACING_VEC[fc];
  var x0 = 0, z0 = 0, x1 = 16, z1 = 16;
  if (v[2] === -1) { z1 = 8; if (left) x1 = 8; else x0 = 8; }
  else if (v[2] === 1) { z0 = 8; if (left) x0 = 8; else x1 = 8; }
  else if (v[0] === 1) { x0 = 8; if (left) z1 = 8; else z0 = 8; }
  else { x1 = 8; if (left) z0 = 8; else z1 = 8; }
  return [x0, z0, x1, z1];
}
