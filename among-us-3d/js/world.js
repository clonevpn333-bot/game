/* ============================================================
   AMONG US 3D — WORLD BUILDER
   Turns a Layout into merged wall geometry, floors, ceilings,
   doors, vents, task consoles, room signs and set dressing.
   ============================================================ */
(function (AU) {
'use strict';

var T = window.THREE;
var WALL_H = 3.3, WALL_T = 0.34;

/* ---------------- geometry merging ---------------- */
function mergeGeometries(list) {
  var posCount = 0, hasUV = true;
  for (var i = 0; i < list.length; i++) {
    posCount += list[i].attributes.position.count;
    if (!list[i].attributes.uv) hasUV = false;
  }
  var pos = new Float32Array(posCount * 3);
  var nor = new Float32Array(posCount * 3);
  var uv  = hasUV ? new Float32Array(posCount * 2) : null;
  var idx = [], off = 0, io = 0;
  for (var g = 0; g < list.length; g++) {
    var G = list[g];
    var p = G.attributes.position.array, nn = G.attributes.normal.array;
    pos.set(p, off * 3); nor.set(nn, off * 3);
    if (uv && G.attributes.uv) uv.set(G.attributes.uv.array, off * 2);
    if (G.index) {
      var ia = G.index.array;
      for (var k = 0; k < ia.length; k++) idx.push(ia[k] + off);
    } else {
      for (var v = 0; v < G.attributes.position.count; v++) idx.push(v + off);
    }
    off += G.attributes.position.count;
    io = idx.length;
  }
  var out = new T.BufferGeometry();
  out.setAttribute('position', new T.BufferAttribute(pos, 3));
  out.setAttribute('normal', new T.BufferAttribute(nor, 3));
  if (uv) out.setAttribute('uv', new T.BufferAttribute(uv, 2));
  out.setIndex(idx);
  return out;
}
function boxAt(w, h, d, x, y, z) {
  var g = new T.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

/* ---------------- wall extraction from the grid ---------------- */
function extractWalls(grid) {
  var segs = [], w = grid.w, h = grid.h, C = grid.cell;
  function walk(i, j) {
    if (i < 0 || j < 0 || i >= w || j >= h) return 0;
    return grid.cells[j * w + i];
  }
  /* walls running along Z (a boundary at constant x) */
  for (var i = 0; i <= w; i++) {
    var run = -1, runDir = 0;
    for (var j = 0; j <= h; j++) {
      var a = walk(i - 1, j), b = walk(i, j);
      var edge = (j < h) && (a !== b);
      var dir = edge ? (b ? 1 : -1) : 0;
      if (edge && run < 0) { run = j; runDir = dir; }
      else if (run >= 0 && (!edge || dir !== runDir)) {
        segs.push({ axis: 'z', x: grid.minX + i * C, dir: runDir,
                    z0: grid.minZ + run * C, z1: grid.minZ + j * C });
        run = edge ? j : -1;
        runDir = dir;
      }
    }
  }
  /* walls running along X (a boundary at constant z) */
  for (var jj = 0; jj <= h; jj++) {
    var run2 = -1, runDir2 = 0;
    for (var ii = 0; ii <= w; ii++) {
      var a2 = walk(ii, jj - 1), b2 = walk(ii, jj);
      var edge2 = (ii < w) && (a2 !== b2);
      var dir2 = edge2 ? (b2 ? 1 : -1) : 0;
      if (edge2 && run2 < 0) { run2 = ii; runDir2 = dir2; }
      else if (run2 >= 0 && (!edge2 || dir2 !== runDir2)) {
        segs.push({ axis: 'x', z: grid.minZ + jj * C, dir: runDir2,
                    x0: grid.minX + run2 * C, x1: grid.minX + ii * C });
        run2 = edge2 ? ii : -1;
        runDir2 = dir2;
      }
    }
  }
  return segs;
}

/* ---------------- themes ---------------- */
var THEMES = {
  ship:   { floor:0x4a5666, floor2:0x3e4857, wall:0x5d6a7d, trim:0x8fa2ba, ceil:0x2c333f,
            amb:0x8fa8c8, sky:0x06070f, accent:0x38FEDC, window:0x1b2f5e },
  hq:     { floor:0x57575f, floor2:0x494951, wall:0x6f6f7d, trim:0xb0b0c0, ceil:0x33333c,
            amb:0xd8c9a8, sky:0x1a1410, accent:0xF5C842, window:0x3a2f22 },
  ice:    { floor:0x5f6d7d, floor2:0x515d6b, wall:0x66748a, trim:0x9fb6cf, ceil:0x333b47,
            amb:0x9fc4ff, sky:0x0a1020, accent:0x7FE8FF, window:0x9fc4e8 },
  sky:    { floor:0x7d6547, floor2:0x6b573d, wall:0x7a6a55, trim:0xc0a878, ceil:0x372e21,
            amb:0xffd9a8, sky:0x1b2b4a, accent:0xE2B10C, window:0x8fc4e8 },
  jungle: { floor:0x57683f, floor2:0x4a5936, wall:0x63705a, trim:0x9fc47a, ceil:0x2f3828,
            amb:0xc8ffb0, sky:0x123020, accent:0x50EF39, window:0x8fd88f }
};

/* ---------------- text sprite ---------------- */
function textSprite(text, color, size) {
  var c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  var g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, 512, 128);
  g.font = 'bold 62px Arial Black, Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 12; g.strokeStyle = '#0a0d16';
  g.strokeText(text, 256, 66);
  g.fillStyle = color || '#dbe6ff';
  g.fillText(text, 256, 66);
  var tex = new T.CanvasTexture(c);
  tex.minFilter = T.LinearFilter;
  var m = new T.SpriteMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false });
  var sp = new T.Sprite(m);
  sp.scale.set(size || 6, (size || 6) / 4, 1);
  return sp;
}
AU.textSprite = textSprite;

/* ============================================================
   WORLD
   ============================================================ */
function World(scene, layout, quality) {
  this.scene = scene;
  this.layout = layout;
  this.map = layout.map;
  this.theme = THEMES[this.map.theme] || THEMES.ship;
  this.quality = quality || 'medium';
  this.doors = [];
  this.vents = [];
  this.consoles = {};
  this.roomLights = [];
  this.group = new T.Group();
  scene.add(this.group);
  this.build();
}

World.prototype.build = function () {
  this.buildFloors();
  this.buildWalls();
  this.buildCeilings();
  this.buildDoors();
  this.buildDoorFrames();
  this.buildFittings();
  this.buildVents();
  this.buildSigns();
  this.buildProps();
  this.buildLights();
};

/* ---- floors ---- */
World.prototype.buildFloors = function () {
  var th = this.theme, geos = [], geos2 = [];
  var rects = this.layout.rects;
  for (var i = 0; i < rects.length; i++) {
    var R = rects[i];
    var w = R.x1 - R.x0, d = R.z1 - R.z0;
    var g = new T.PlaneGeometry(w, d, 1, 1);
    g.rotateX(-Math.PI / 2);
    g.translate((R.x0 + R.x1) / 2, 0, (R.z0 + R.z1) / 2);
    (R.kind === 'hall' ? geos2 : geos).push(g);
  }
  if (geos.length) {
    var m = new T.Mesh(mergeGeometries(geos), AU.toonMat(th.floor));
    m.receiveShadow = true; this.group.add(m);
  }
  if (geos2.length) {
    var m2 = new T.Mesh(mergeGeometries(geos2), AU.toonMat(th.floor2));
    m2.receiveShadow = true; this.group.add(m2);
  }
  /* floor stripe down the middle of each corridor (reads like the sprite maps) */
  var strips = [];
  for (var h = 0; h < this.layout.halls.length; h++) {
    var H = this.layout.halls[h];
    var hw = H.x1 - H.x0, hd = H.z1 - H.z0;
    var sg;
    if (hw < hd) sg = new T.PlaneGeometry(0.5, hd);
    else sg = new T.PlaneGeometry(hw, 0.5);
    sg.rotateX(-Math.PI / 2);
    sg.translate((H.x0 + H.x1) / 2, 0.012, (H.z0 + H.z1) / 2);
    strips.push(sg);
  }
  if (strips.length) {
    this.group.add(new T.Mesh(mergeGeometries(strips),
      AU.toonMat(this.theme.accent, { transparent: true, opacity: 0.28 })));
  }
};

/* ---- walls, with panelling, ribs, conduit and fittings ---- */
World.prototype.buildWalls = function () {
  var segs = extractWalls(this.layout.grid);
  var th = this.theme;
  var hull = [], trims = [], panels = [], ribs = [], conduit = [], glass = [], fittings = [];
  var self = this;
  var rnd = mulberry(0xA17C0F);

  /* Is the far side of this wall open space? Those get windows. */
  function exterior(cx, cz, nx, nz) {
    for (var d = 1.2; d < 7; d += 1.2) {
      if (self.layout.walkable(cx - nx * d, cz - nz * d)) return false;
    }
    return true;
  }

  for (var i = 0; i < segs.length; i++) {
    var S = segs[i];
    var horiz = S.axis === 'x';
    var len = horiz ? (S.x1 - S.x0) : (S.z1 - S.z0);
    if (len < 0.4) continue;
    var cx = horiz ? (S.x0 + S.x1) / 2 : S.x;
    var cz = horiz ? S.z : (S.z0 + S.z1) / 2;
    /* unit normal pointing into the room */
    var nx = horiz ? 0 : S.dir, nz = horiz ? S.dir : 0;
    var face = WALL_T / 2 + 0.02;

    if (horiz) {
      hull.push(boxAt(len, WALL_H, WALL_T, cx, WALL_H / 2, cz));
      trims.push(boxAt(len, 0.24, WALL_T * 1.3, cx, WALL_H - 0.16, cz));
      trims.push(boxAt(len, 0.20, WALL_T * 1.3, cx, 0.11, cz));
    } else {
      hull.push(boxAt(WALL_T, WALL_H, len, cx, WALL_H / 2, cz));
      trims.push(boxAt(WALL_T * 1.3, 0.24, len, cx, WALL_H - 0.16, cz));
      trims.push(boxAt(WALL_T * 1.3, 0.20, len, cx, 0.11, cz));
    }
    if (!S.dir) continue;

    /* a continuous conduit run at shoulder height */
    var cy = 2.18;
    if (horiz) conduit.push(boxAt(len - 0.1, 0.14, 0.16, cx, cy, cz + nz * face));
    else       conduit.push(boxAt(0.16, 0.14, len - 0.1, cx + nx * face, cy, cz));

    /* recessed panels with a rib between each */
    var step = 2.7;
    var count = Math.max(1, Math.round(len / step));
    var pw = len / count;
    for (var k = 0; k < count; k++) {
      var t = -len / 2 + pw * (k + 0.5);
      var px = horiz ? cx + t : cx + nx * (face + 0.015);
      var pz = horiz ? cz + nz * (face + 0.015) : cz + t;
      var panelW = Math.max(0.4, pw - 0.42);
      if (horiz) panels.push(boxAt(panelW, 1.45, 0.06, px, 1.22, pz));
      else       panels.push(boxAt(0.06, 1.45, panelW, px, 1.22, pz));
      if (k > 0) {
        var rt = -len / 2 + pw * k;
        if (horiz) ribs.push(boxAt(0.14, WALL_H - 0.5, 0.11, cx + rt, (WALL_H - 0.5) / 2 + 0.2, cz + nz * face));
        else       ribs.push(boxAt(0.11, WALL_H - 0.5, 0.14, cx + nx * face, (WALL_H - 0.5) / 2 + 0.2, cz + rt));
      }

      /* the odd fitting: a screen, a wall vent or a hazard plate */
      var roll = rnd();
      if (roll > 0.90 && panelW > 1.1) {
        var sw = Math.min(1.0, panelW - 0.3);
        if (horiz) fittings.push(boxAt(sw, 0.6, 0.05, px, 1.85, pz + nz * 0.03));
        else       fittings.push(boxAt(0.05, 0.6, sw, px + nx * 0.03, 1.85, pz));
      } else if (roll > 0.82 && panelW > 0.9) {
        for (var g2 = 0; g2 < 3; g2++) {
          if (horiz) fittings.push(boxAt(0.7, 0.06, 0.05, px, 0.62 + g2 * 0.13, pz + nz * 0.03));
          else       fittings.push(boxAt(0.05, 0.06, 0.7, px + nx * 0.03, 0.62 + g2 * 0.13, pz));
        }
      }

      /* windows where there is nothing but sky behind the wall */
      if (panelW > 1.4 && exterior(px, pz, nx, nz) && rnd() > 0.34) {
        var gw = Math.min(1.7, panelW - 0.2);
        if (horiz) glass.push(boxAt(gw, 1.1, 0.05, px, 2.0, pz + nz * 0.02));
        else       glass.push(boxAt(0.05, 1.1, gw, px + nx * 0.02, 2.0, pz));
      }
    }
  }

  if (hull.length) {
    var wm = new T.Mesh(mergeGeometries(hull), AU.toonMat(th.wall));
    wm.receiveShadow = true;
    this.group.add(wm);
    this.wallMesh = wm;
  }
  if (trims.length)   this.group.add(new T.Mesh(mergeGeometries(trims), AU.toonMat(th.trim)));
  if (panels.length)  this.group.add(new T.Mesh(mergeGeometries(panels), AU.toonMat(AU.shadeHex(th.wall, -0.07))));
  if (ribs.length)    this.group.add(new T.Mesh(mergeGeometries(ribs), AU.toonMat(AU.shadeHex(th.wall, 0.08))));
  if (conduit.length) this.group.add(new T.Mesh(mergeGeometries(conduit), AU.toonMat(AU.shadeHex(th.trim, -0.12))));
  if (fittings.length)this.group.add(new T.Mesh(mergeGeometries(fittings), AU.toonMat(0x2b3140)));
  if (glass.length) {
    this.windowMat = new T.MeshBasicMaterial({ color: th.window || 0x6ea8d8 });
    this.group.add(new T.Mesh(mergeGeometries(glass), this.windowMat));
  }
};

/* ---- corridor fittings: ceiling pipes, light strips, floor hazard bands ---- */
World.prototype.buildFittings = function () {
  var th = this.theme;
  var pipes = [], strips = [], hazard = [], posts = [];
  for (var h = 0; h < this.layout.halls.length; h++) {
    var H = this.layout.halls[h];
    var w = H.x1 - H.x0, d = H.z1 - H.z0;
    var cx = (H.x0 + H.x1) / 2, cz = (H.z0 + H.z1) / 2;
    var vertical = w < d;
    var len = vertical ? d : w;
    if (len < 2) continue;

    /* two pipes hugging the ceiling */
    for (var s = -1; s <= 1; s += 2) {
      var off = (vertical ? w : d) * 0.30 * s;
      var g = new T.CylinderGeometry(0.13, 0.13, len, 8);
      if (vertical) { g.rotateX(Math.PI / 2); g.translate(cx + off, WALL_H - 0.45, cz); }
      else          { g.rotateZ(Math.PI / 2); g.translate(cx, WALL_H - 0.45, cz + off); }
      pipes.push(g);
    }
    /* a light strip down the middle of the ceiling */
    var lg = vertical ? new T.BoxGeometry(0.36, 0.05, len - 0.4)
                      : new T.BoxGeometry(len - 0.4, 0.05, 0.36);
    lg.translate(cx, WALL_H - 0.09, cz);
    strips.push(lg);

    /* hazard bands where the corridor meets a room */
    var ends = vertical ? [[cx, H.z0 + 0.5], [cx, H.z1 - 0.5]] : [[H.x0 + 0.5, cz], [H.x1 - 0.5, cz]];
    ends.forEach(function (e) {
      var hg = vertical ? new T.BoxGeometry(w - 0.3, 0.03, 0.5) : new T.BoxGeometry(0.5, 0.03, d - 0.3);
      hg.translate(e[0], 0.02, e[1]);
      hazard.push(hg);
    });
  }
  /* corner posts on every room, so rooms read as built rather than carved */
  for (var r = 0; r < this.map.rooms.length; r++) {
    var R = this.map.rooms[r];
    if (R.open) continue;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
      posts.push(boxAt(0.42, WALL_H, 0.42,
        R.x + c[0] * (R.w / 2 - 0.2), WALL_H / 2, R.z + c[1] * (R.d / 2 - 0.2)));
    });
  }
  if (pipes.length)  this.group.add(new T.Mesh(mergeGeometries(pipes), AU.toonMat(AU.shadeHex(th.trim, -0.18))));
  if (posts.length)  this.group.add(new T.Mesh(mergeGeometries(posts), AU.toonMat(AU.shadeHex(th.wall, 0.06))));
  if (hazard.length) this.group.add(new T.Mesh(mergeGeometries(hazard),
    new T.MeshBasicMaterial({ color: 0xC9A227, transparent: true, opacity: 0.5 })));
  if (strips.length) {
    this.stripMat = new T.MeshBasicMaterial({ color: 0xd8e4f2 });
    this.group.add(new T.Mesh(mergeGeometries(strips), this.stripMat));
  }
};

/* ---- a frame around every doorway ---- */
World.prototype.buildDoorFrames = function () {
  var frames = [], lamps = [];
  for (var i = 0; i < this.doors.length; i++) {
    var D = this.doors[i];
    var span = D.span;
    if (D.vertical) {
      frames.push(boxAt(0.3, WALL_H, 0.5, D.x - span / 2 - 0.1, WALL_H / 2, D.z));
      frames.push(boxAt(0.3, WALL_H, 0.5, D.x + span / 2 + 0.1, WALL_H / 2, D.z));
      frames.push(boxAt(span + 0.6, 0.34, 0.5, D.x, WALL_H - 0.2, D.z));
      lamps.push(boxAt(span * 0.6, 0.08, 0.12, D.x, WALL_H - 0.42, D.z));
    } else {
      frames.push(boxAt(0.5, WALL_H, 0.3, D.x, WALL_H / 2, D.z - span / 2 - 0.1));
      frames.push(boxAt(0.5, WALL_H, 0.3, D.x, WALL_H / 2, D.z + span / 2 + 0.1));
      frames.push(boxAt(0.5, 0.34, span + 0.6, D.x, WALL_H - 0.2, D.z));
      lamps.push(boxAt(0.12, 0.08, span * 0.6, D.x, WALL_H - 0.42, D.z));
    }
  }
  if (frames.length) this.group.add(new T.Mesh(mergeGeometries(frames), AU.toonMat(this.theme.trim)));
  if (lamps.length) {
    this.doorLampMat = new T.MeshBasicMaterial({ color: 0x7fd8a0 });
    this.group.add(new T.Mesh(mergeGeometries(lamps), this.doorLampMat));
  }
};

/* ---- ceilings ---- */
World.prototype.buildCeilings = function () {
  var geos = [], panels = [], frames = [];
  var rects = this.layout.rects;
  for (var i = 0; i < rects.length; i++) {
    var R = rects[i];
    if (R.kind === 'room' && R.room.open) continue;
    var g = new T.PlaneGeometry(R.x1 - R.x0, R.z1 - R.z0);
    g.rotateX(Math.PI / 2);
    g.translate((R.x0 + R.x1) / 2, WALL_H, (R.z0 + R.z1) / 2);
    geos.push(g);
    if (R.kind === 'room') {
      var cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2;
      var nx = Math.max(1, Math.floor((R.x1 - R.x0) / 7));
      var nz = Math.max(1, Math.floor((R.z1 - R.z0) / 7));
      for (var a = 0; a < nx; a++) for (var b = 0; b < nz; b++) {
        var px = R.x0 + (R.x1 - R.x0) * (a + 0.5) / nx;
        var pz = R.z0 + (R.z1 - R.z0) * (b + 0.5) / nz;
        var fr = new T.PlaneGeometry(2.25, 1.2);
        fr.rotateX(Math.PI / 2);
        fr.translate(px, WALL_H - 0.02, pz);
        frames.push(fr);
        var pg = new T.PlaneGeometry(1.9, 0.85);
        pg.rotateX(Math.PI / 2);
        pg.translate(px, WALL_H - 0.06, pz);
        panels.push(pg);
      }
    }
  }
  if (geos.length) this.group.add(new T.Mesh(mergeGeometries(geos), AU.toonMat(this.theme.ceil)));
  if (frames.length) this.group.add(new T.Mesh(mergeGeometries(frames), AU.toonMat(0x232a36)));
  if (panels.length) {
    this.lightPanelMat = new T.MeshBasicMaterial({ color: 0xb4c0d0 });
    this.group.add(new T.Mesh(mergeGeometries(panels), this.lightPanelMat));
  }
};

/* ---- doors ---- */
World.prototype.buildDoors = function () {
  var map = this.map, self = this;
  var doorRooms = map.doorRooms || [];
  var seen = {};
  for (var i = 0; i < this.layout.halls.length; i++) {
    var H = this.layout.halls[i];
    ['a', 'b'].forEach(function (end) {
      var rid = H[end];
      if (!rid || rid === 'elbow' || doorRooms.indexOf(rid) < 0) return;
      var R = AU.roomOf(map, rid);
      if (!R) return;
      var vertical = (H.x1 - H.x0) < (H.z1 - H.z0);
      var dx, dz, w, d;
      if (vertical) {
        dx = (H.x0 + H.x1) / 2; w = (H.x1 - H.x0); d = WALL_T * 1.6;
        dz = (Math.abs(H.z0 - (R.z + R.d / 2)) < Math.abs(H.z1 - (R.z - R.d / 2)))
             ? R.z + R.d / 2 : R.z - R.d / 2;
      } else {
        dz = (H.z0 + H.z1) / 2; d = (H.z1 - H.z0); w = WALL_T * 1.6;
        dx = (Math.abs(H.x0 - (R.x + R.w / 2)) < Math.abs(H.x1 - (R.x - R.w / 2)))
             ? R.x + R.w / 2 : R.x - R.w / 2;
      }
      var key = rid + '|' + Math.round(dx) + '|' + Math.round(dz);
      if (seen[key]) return;
      seen[key] = 1;
      self.addDoor(rid, dx, dz, w, d, vertical);
    });
  }
};
World.prototype.addDoor = function (roomId, x, z, w, d, vertical) {
  var grp = new T.Group();
  var span = vertical ? w : d;
  var mat = AU.toonMat(0x3d4c66);
  var edge = AU.toonMat(0xF5C842);
  var panels = [];
  for (var s = -1; s <= 1; s += 2) {
    var p = new T.Group();
    var body = new T.Mesh(new T.BoxGeometry(vertical ? span / 2 : d * 1.1, WALL_H - 0.25, vertical ? d * 1.1 : span / 2), mat);
    p.add(body);
    var strip = new T.Mesh(new T.BoxGeometry(vertical ? span / 2 : d * 1.2, 0.12, vertical ? d * 1.2 : span / 2), edge);
    strip.position.y = WALL_H / 2 - 0.4;
    p.add(strip);
    p.position.set(vertical ? s * span / 4 : 0, (WALL_H - 0.25) / 2, vertical ? 0 : s * span / 4);
    p.userData.dir = s;
    p.userData.open = vertical ? s * span / 2 : s * span / 2;
    grp.add(p);
    panels.push(p);
  }
  grp.position.set(x, 0, z);
  grp.visible = false;
  this.group.add(grp);
  this.doors.push({ room: roomId, x: x, z: z, w: w, d: d, vertical: vertical,
                    group: grp, panels: panels, closed: false, t: 0, span: span });
};
World.prototype.setDoorClosed = function (door, closed) {
  door.closed = closed;
  if (closed) door.group.visible = true;
};
World.prototype.updateDoors = function (dt) {
  for (var i = 0; i < this.doors.length; i++) {
    var D = this.doors[i];
    var target = D.closed ? 1 : 0;
    if (D.t !== target) {
      D.t += (target - D.t) * Math.min(1, dt * 7);
      if (Math.abs(D.t - target) < 0.02) D.t = target;
      for (var p = 0; p < D.panels.length; p++) {
        var P = D.panels[p];
        var off = P.userData.dir * D.span / 4 * (1 - D.t) + P.userData.dir * D.span / 4 * D.t * 0.0;
        var closedOff = P.userData.dir * D.span * 0.0;
        var v = P.userData.dir * (D.span / 4) * (1 - D.t) + closedOff;
        if (D.vertical) P.position.x = v; else P.position.z = v;
      }
      if (D.t === 0) D.group.visible = false;
    }
  }
};
World.prototype.doorBlocks = function (x, z, radius) {
  for (var i = 0; i < this.doors.length; i++) {
    var D = this.doors[i];
    if (!D.closed || D.t < 0.6) continue;
    var hw = (D.vertical ? D.w : D.d * 1.2) / 2 + radius;
    var hd = (D.vertical ? D.d * 1.2 : D.d) / 2 + radius;
    if (D.vertical) { if (Math.abs(x - D.x) < D.w / 2 + radius && Math.abs(z - D.z) < 0.6 + radius) return true; }
    else { if (Math.abs(z - D.z) < D.d / 2 + radius && Math.abs(x - D.x) < 0.6 + radius) return true; }
  }
  return false;
};

/* ---- vents ---- */
World.prototype.buildVents = function () {
  var map = this.map;
  for (var i = 0; i < (map.vents || []).length; i++) {
    var V = map.vents[i];
    var R = AU.roomOf(map, V.room);
    if (!R) continue;
    var ang = (i * 2.399) % (Math.PI * 2);
    var px = R.x + Math.cos(ang) * (R.w / 2 - 2.2);
    var pz = R.z + Math.sin(ang) * (R.d / 2 - 2.2);
    if (!this.layout.free(px, pz, 0.8)) { px = R.x; pz = R.z; }
    var grp = new T.Group();
    var base = new T.Mesh(new T.CylinderGeometry(0.78, 0.85, 0.16, 12), AU.toonMat(0x39404E));
    base.position.y = 0.08; grp.add(base);
    var lid = new T.Group();
    var lidMesh = new T.Mesh(AU.roundedBoxGeo(1.4, 0.1, 1.4, 0.12), AU.toonMat(0x5b6879));
    lid.add(lidMesh);
    for (var b = -2; b <= 2; b++) {
      var bar = new T.Mesh(new T.BoxGeometry(1.2, 0.06, 0.11), AU.toonMat(0x2b3140));
      bar.position.set(0, 0.06, b * 0.24);
      lid.add(bar);
    }
    lid.position.set(0, 0.18, 0.0);
    grp.add(lid);
    grp.position.set(px, 0.01, pz);
    this.group.add(grp);
    this.vents.push({ id: V.id, room: V.room, x: px, z: pz, links: V.links,
                      group: grp, lid: lid, open: 0 });
  }
};
World.prototype.ventById = function (id) {
  for (var i = 0; i < this.vents.length; i++) if (this.vents[i].id === id) return this.vents[i];
  return null;
};
World.prototype.updateVents = function (dt, openIds) {
  for (var i = 0; i < this.vents.length; i++) {
    var V = this.vents[i];
    var want = openIds && openIds[V.id] ? 1 : 0;
    V.open += (want - V.open) * Math.min(1, dt * 9);
    V.lid.rotation.x = -V.open * 1.5;
    V.lid.position.z = V.open * 0.6;
    V.lid.position.y = 0.18 + V.open * 0.25;
  }
};

/* ---- room signs ---- */
World.prototype.buildSigns = function () {
  for (var i = 0; i < this.map.rooms.length; i++) {
    var R = this.map.rooms[i];
    var s = textSprite(R.name.toUpperCase(), '#cfe0ff', Math.min(2.9, R.w * 0.2));
    s.material.opacity = 0.8;
    s.position.set(R.x, WALL_H - 0.45, R.z);
    s.userData.roomSign = true;
    this.group.add(s);
  }
};

/* ---- task consoles ---- */
World.prototype.consoleKey = function (taskId, roomId, step) {
  return taskId + '@' + roomId + '#' + step;
};
World.prototype.addConsole = function (key, roomId, taskName, slot) {
  if (this.consoles[key]) return this.consoles[key];
  var R = AU.roomOf(this.map, roomId);
  if (!R) return null;
  /* deterministic slot around the room perimeter */
  var perim = [];
  var inset = 1.35;
  var nx = Math.max(1, Math.floor(R.w / 4)), nz = Math.max(1, Math.floor(R.d / 4));
  for (var a = 0; a < nx; a++) {
    perim.push({ x: R.x - R.w / 2 + R.w * (a + 0.5) / nx, z: R.z - R.d / 2 + inset, rot: 0 });
    perim.push({ x: R.x - R.w / 2 + R.w * (a + 0.5) / nx, z: R.z + R.d / 2 - inset, rot: Math.PI });
  }
  for (var b = 0; b < nz; b++) {
    perim.push({ x: R.x - R.w / 2 + inset, z: R.z - R.d / 2 + R.d * (b + 0.5) / nz, rot: Math.PI / 2 });
    perim.push({ x: R.x + R.w / 2 - inset, z: R.z - R.d / 2 + R.d * (b + 0.5) / nz, rot: -Math.PI / 2 });
  }
  var p = perim[slot % perim.length];
  var grp = new T.Group();
  var panel = new T.Mesh(AU.roundedBoxGeo(1.5, 1.15, 0.35, 0.12), AU.toonMat(0x39404E));
  panel.position.y = 1.15; grp.add(panel);
  var screen = new T.Mesh(new T.PlaneGeometry(1.16, 0.8), new T.MeshBasicMaterial({ color: 0x1a5fb4 }));
  screen.position.set(0, 1.2, 0.19); grp.add(screen);
  var stand = new T.Mesh(new T.BoxGeometry(0.5, 0.62, 0.4), AU.toonMat(0x2b3140));
  stand.position.y = 0.3; grp.add(stand);
  var glow = new T.Mesh(new T.PlaneGeometry(1.3, 0.95), new T.MeshBasicMaterial({
    color: 0xF5C842, transparent: true, opacity: 0.0, side: T.DoubleSide }));
  glow.position.set(0, 1.2, 0.21); grp.add(glow);
  grp.position.set(p.x, 0, p.z);
  grp.rotation.y = p.rot;
  grp.visible = true;
  this.group.add(grp);
  var c = { key: key, room: roomId, x: p.x, z: p.z, group: grp, screen: screen, glow: glow,
            name: taskName, active: false };
  this.consoles[key] = c;
  return c;
};
World.prototype.setConsoleActive = function (key, on, done) {
  var c = this.consoles[key];
  if (!c) return;
  c.active = on;
  c.screen.material.color.setHex(done ? 0x1FA84A : (on ? 0xF5C842 : 0x1a5fb4));
  c.glow.material.opacity = on ? 0.25 : 0;
};

/* ---- special stations (admin table, cams, vitals, doorlog, emergency button) ---- */
World.prototype.buildProps = function () {
  var map = this.map, th = this.theme;
  var self = this;
  this.stations = {};

  function station(kind, roomId, dx, dz, colorHex, label) {
    var R = AU.roomOf(map, roomId);
    if (!R) return;
    var grp = new T.Group();
    var table = new T.Mesh(AU.roundedBoxGeo(2.2, 0.24, 1.4, 0.1), AU.toonMat(0x39404E));
    table.position.y = 1.0; grp.add(table);
    var leg = new T.Mesh(new T.CylinderGeometry(0.16, 0.22, 1.0, 10), AU.toonMat(0x2b3140));
    leg.position.y = 0.5; grp.add(leg);
    var scr = new T.Mesh(new T.PlaneGeometry(1.9, 1.1), new T.MeshBasicMaterial({ color: colorHex }));
    scr.position.set(0, 1.13, 0); scr.rotation.x = -Math.PI / 2; grp.add(scr);
    var sign = textSprite(label, '#ffffff', 3.2);
    sign.position.set(0, 2.1, 0); grp.add(sign);
    grp.position.set(R.x + dx, 0, R.z + dz);
    self.group.add(grp);
    self.stations[kind] = { kind: kind, room: roomId, x: R.x + dx, z: R.z + dz, group: grp };
  }

  var f = map.features || {};
  if (f.admin)    station('admin', f.admin, 0, 2.2, 0x1a5fb4, 'ADMIN');
  if (f.security) station('cams', f.security, 0, -2.2, 0x123a2a, 'CAMS');
  if (f.vitals)   station('vitals', f.vitals, 2.6, 0, 0x3a1a4a, 'VITALS');
  if (f.doorlog)  station('doorlog', f.doorlog, -2.4, 0, 0x4a3a1a, 'DOOR LOG');

  /* emergency button */
  var em = null;
  for (var i = 0; i < map.rooms.length; i++) if (map.rooms[i].emergency) em = map.rooms[i];
  if (em) {
    var g = new T.Group();
    var base = new T.Mesh(new T.CylinderGeometry(1.5, 1.7, 0.9, 18), AU.toonMat(0x4a5566));
    base.position.y = 0.45; g.add(base);
    var top = new T.Mesh(new T.CylinderGeometry(1.55, 1.5, 0.18, 18), AU.toonMat(0x39404E));
    top.position.y = 0.95; g.add(top);
    var btn = new T.Mesh(new T.CylinderGeometry(0.65, 0.7, 0.34, 16), AU.toonMat(0xC51111));
    btn.position.y = 1.15; g.add(btn);
    var glass = new T.Mesh(new T.SphereGeometry(0.95, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new T.MeshPhysicalMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.2, roughness: 0.05 }));
    glass.position.y = 1.05; g.add(glass);
    g.position.set(em.x, 0, em.z);
    this.group.add(g);
    this.stations.emergency = { kind: 'emergency', room: em.id, x: em.x, z: em.z, group: g };
    this.emergencyBtn = btn;
  }

  /* set dressing per room */
  for (var rIdx = 0; rIdx < map.rooms.length; rIdx++) this.dressRoom(map.rooms[rIdx]);
};

World.prototype.dressRoom = function (R) {
  var n = R.name.toLowerCase(), th = this.theme, g = new T.Group(), self = this;
  function put(mesh, x, y, z, ry) {
    mesh.position.set(R.x + x, y, R.z + z);
    if (ry) mesh.rotation.y = ry;
    g.add(mesh);
  }
  function crate(s, hex) {
    return new T.Mesh(AU.roundedBoxGeo(s, s, s, s * 0.08), AU.toonMat(hex || 0x8a6b3f));
  }
  function pipe(len, rad, hex) {
    var m = new T.Mesh(new T.CylinderGeometry(rad, rad, len, 10), AU.toonMat(hex || 0x8397A7));
    m.rotation.z = Math.PI / 2;
    return m;
  }
  var rnd = mulberry(hashStr(R.id));

  if (/reactor|engine/.test(n)) {
    var core = new T.Mesh(new T.CylinderGeometry(1.1, 1.3, 2.4, 14), AU.toonMat(0x4a5566));
    put(core, 0, 1.2, 0);
    var glow = new T.Mesh(new T.CylinderGeometry(0.75, 0.75, 2.0, 14),
      new T.MeshBasicMaterial({ color: 0x38FEDC, transparent: true, opacity: 0.55 }));
    put(glow, 0, 1.2, 0);
    put(pipe(R.w * 0.7, 0.16), 0, 2.6, -R.d / 2 + 0.8);
  }
  if (/electrical/.test(n)) {
    for (var e = 0; e < 4; e++) {
      var box = new T.Mesh(AU.roundedBoxGeo(0.9, 1.5, 0.4, 0.06), AU.toonMat(0x39404E));
      put(box, -R.w / 2 + 1.2 + e * 1.2, 1.4, -R.d / 2 + 0.8);
      var lamp = new T.Mesh(new T.SphereGeometry(0.09, 8, 6),
        new T.MeshBasicMaterial({ color: e % 2 ? 0x50EF39 : 0xF5C842 }));
      put(lamp, -R.w / 2 + 1.2 + e * 1.2, 2.0, -R.d / 2 + 0.6);
    }
  }
  if (/cargo|storage/.test(n)) {
    for (var c = 0; c < 8; c++) {
      var s = 1.0 + rnd() * 0.6;
      var cr = crate(s, [0x8a6b3f, 0x6b7280, 0x5f7a4a][Math.floor(rnd() * 3)]);
      var side = c % 4;
      var along = (rnd() - 0.5) * ((side < 2 ? R.w : R.d) - 4);
      var cx = side === 0 ? along : side === 1 ? along : (side === 2 ? -R.w / 2 + 1.3 : R.w / 2 - 1.3);
      var cz = side === 0 ? -R.d / 2 + 1.3 : side === 1 ? R.d / 2 - 1.3 : along;
      put(cr, cx, s / 2, cz, rnd() * 3);
      if (rnd() > 0.55) put(crate(s * 0.8, 0x8a6b3f), cx, s + s * 0.4, cz, rnd() * 3);
    }
  }
  if (/medbay|medical/.test(n)) {
    for (var b = 0; b < 2; b++) {
      var bed = new T.Mesh(AU.roundedBoxGeo(1.1, 0.5, 2.3, 0.12), AU.toonMat(0xD6E0F0));
      put(bed, -R.w / 2 + 1.8 + b * 2.2, 0.7, 1.2);
      var pil = new T.Mesh(AU.roundedBoxGeo(0.9, 0.22, 0.6, 0.1), AU.toonMat(0x9fb4d8));
      put(pil, -R.w / 2 + 1.8 + b * 2.2, 1.03, 0.3);
    }
  }
  if (/kitchen/.test(n)) {
    var counter = new T.Mesh(AU.roundedBoxGeo(R.w - 3, 1.0, 1.1, 0.08), AU.toonMat(0x9AA5B4));
    put(counter, 0, 0.5, -R.d / 2 + 1.2);
    for (var p = 0; p < 3; p++) {
      var pot = new T.Mesh(new T.CylinderGeometry(0.28, 0.24, 0.35, 12), AU.toonMat(0x54627f));
      put(pot, -2 + p * 2, 1.18, -R.d / 2 + 1.2);
    }
  }
  if (/cafeteria|lounge|meeting/.test(n)) {
    for (var t = 0; t < 3; t++) {
      var a = t / 3 * Math.PI * 2;
      var tb = new T.Mesh(new T.CylinderGeometry(1.15, 1.05, 0.16, 14), AU.toonMat(0xB6C2D1));
      put(tb, Math.cos(a) * (R.w / 4), 1.0, Math.sin(a) * (R.d / 4));
      var lg = new T.Mesh(new T.CylinderGeometry(0.16, 0.3, 1.0, 10), AU.toonMat(0x54627f));
      put(lg, Math.cos(a) * (R.w / 4), 0.5, Math.sin(a) * (R.d / 4));
    }
  }
  if (/vault/.test(n)) {
    var door = new T.Mesh(new T.CylinderGeometry(1.5, 1.5, 0.4, 20), AU.toonMat(0xF5C842));
    door.rotation.x = Math.PI / 2;
    put(door, 0, 1.7, -R.d / 2 + 0.5);
    var wheel = new T.Mesh(new T.TorusGeometry(0.55, 0.1, 8, 18), AU.toonMat(0x9AA5B4));
    put(wheel, 0, 1.7, -R.d / 2 + 0.75);
  }
  if (/greenhouse|jungle|beach|garden/.test(n)) {
    for (var pl = 0; pl < 8; pl++) {
      var trunk = new T.Mesh(new T.CylinderGeometry(0.12, 0.16, 1.0, 8), AU.toonMat(0x71491E));
      var x = (rnd() - 0.5) * (R.w - 3), z = (rnd() - 0.5) * (R.d - 3);
      put(trunk, x, 0.5, z);
      var leaf = new T.Mesh(new T.SphereGeometry(0.75, 10, 8), AU.toonMat(0x2E9F3D));
      leaf.scale.set(1, 0.7, 1);
      put(leaf, x, 1.35, z);
    }
  }
  if (/shower/.test(n)) {
    for (var sh = 0; sh < 3; sh++) {
      var st = new T.Mesh(AU.roundedBoxGeo(1.5, 2.4, 1.5, 0.1),
        AU.toonMat(0x8fb8d0, { transparent: true, opacity: 0.35 }));
      put(st, -R.w / 2 + 2 + sh * 2.2, 1.2, -R.d / 2 + 1.4);
    }
  }
  if (/security|lookout/.test(n)) {
    for (var m = 0; m < 4; m++) {
      var mon = new T.Mesh(AU.roundedBoxGeo(1.0, 0.75, 0.14, 0.05), AU.toonMat(0x2b3140));
      put(mon, -1.6 + (m % 2) * 1.6, 1.9 - Math.floor(m / 2) * 0.85, -R.d / 2 + 0.55);
      var scr = new T.Mesh(new T.PlaneGeometry(0.86, 0.6), new T.MeshBasicMaterial({ color: 0x123a2a }));
      put(scr, -1.6 + (m % 2) * 1.6, 1.9 - Math.floor(m / 2) * 0.85, -R.d / 2 + 0.63);
    }
  }
  if (/cockpit|navigation|dropship/.test(n)) {
    var dash = new T.Mesh(AU.roundedBoxGeo(R.w - 4, 1.0, 1.2, 0.12), AU.toonMat(0x39404E));
    put(dash, 0, 1.1, -R.d / 2 + 1.3);
    var win = new T.Mesh(new T.PlaneGeometry(R.w - 4, 1.6),
      new T.MeshBasicMaterial({ color: 0x0a1730 }));
    put(win, 0, 2.2, -R.d / 2 + 0.4);
  }
  if (/armory|brig/.test(n)) {
    for (var r2 = 0; r2 < 4; r2++) {
      var rack = new T.Mesh(AU.roundedBoxGeo(0.5, 1.9, 1.6, 0.06), AU.toonMat(0x4a5566));
      put(rack, -R.w / 2 + 1.4 + r2 * 1.4, 0.95, R.d / 2 - 1.6);
    }
  }
  if (/campfire/.test(n)) {
    var fire = new T.Mesh(new T.ConeGeometry(0.7, 1.1, 10),
      new T.MeshBasicMaterial({ color: 0xEF7D0D, transparent: true, opacity: 0.85 }));
    put(fire, 0, 0.6, 0);
    for (var lg2 = 0; lg2 < 5; lg2++) {
      var log = new T.Mesh(new T.CylinderGeometry(0.13, 0.13, 1.3, 8), AU.toonMat(0x71491E));
      log.rotation.z = Math.PI / 2;
      log.rotation.y = lg2 / 5 * Math.PI * 2;
      put(log, 0, 0.14, 0);
    }
    this.campfire = fire;
  }
  this.group.add(g);
};

function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0;
  var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---- lighting ---- */
World.prototype.buildLights = function () {
  var th = this.theme;
  this.hemi = new T.HemisphereLight(th.amb, 0x2a3242, 1.0);
  this.scene.add(this.hemi);
  this.dir = new T.DirectionalLight(0xffffff, 0.55);
  this.dir.position.set(30, 60, 20);
  this.scene.add(this.dir);
  this.ambient = new T.AmbientLight(0xffffff, 0.34);
  this.scene.add(this.ambient);
};

World.prototype.setLightsSabotaged = function (on) {
  this.hemi.intensity = on ? 0.12 : 1.0;
  this.dir.intensity  = on ? 0.05 : 0.55;
  this.ambient.intensity = on ? 0.05 : 0.34;
  if (this.lightPanelMat) this.lightPanelMat.color.setHex(on ? 0x3a2626 : 0xb4c0d0);
  if (this.stripMat) this.stripMat.color.setHex(on ? 0x3d2a2a : 0xd8e4f2);
  if (this.doorLampMat) this.doorLampMat.color.setHex(on ? 0x6b2020 : 0x7fd8a0);
};

/* A beam + expanding rings, visible to everyone in the room. Used for the
   visual tasks (Submit Scan, Clear Asteroids, Prime Shields, Empty Garbage). */
World.prototype.visualEffect = function (x, z, colorHex, seconds) {
  var grp = new T.Group();
  var col = colorHex || 0x38FEDC;
  var beam = new T.Mesh(new T.CylinderGeometry(0.55, 0.9, 2.6, 16, 1, true),
    new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, side: T.DoubleSide }));
  beam.position.y = 1.3;
  grp.add(beam);
  var rings = [];
  for (var i = 0; i < 3; i++) {
    var r = new T.Mesh(new T.TorusGeometry(0.7, 0.05, 8, 24),
      new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8 }));
    r.rotation.x = Math.PI / 2;
    r.position.y = 0.2 + i * 0.8;
    grp.add(r); rings.push(r);
  }
  grp.position.set(x, 0, z);
  this.group.add(grp);
  this.effects = this.effects || [];
  this.effects.push({ grp: grp, beam: beam, rings: rings, t: 0, life: seconds || 4 });
};
World.prototype.updateEffects = function (dt) {
  if (!this.effects) return;
  for (var i = this.effects.length - 1; i >= 0; i--) {
    var e = this.effects[i];
    e.t += dt;
    var k = e.t / e.life;
    e.beam.rotation.y += dt * 2;
    e.beam.material.opacity = 0.35 * (1 - k);
    for (var r = 0; r < e.rings.length; r++) {
      var ring = e.rings[r];
      ring.position.y = ((e.t * 0.9 + r * 0.8) % 2.6) + 0.15;
      ring.scale.setScalar(1 + Math.sin(e.t * 3 + r) * 0.15);
      ring.material.opacity = 0.8 * (1 - k);
    }
    if (e.t >= e.life) { this.group.remove(e.grp); this.effects.splice(i, 1); }
  }
};

World.prototype.dispose = function () {
  this.scene.remove(this.group);
  this.scene.remove(this.hemi); this.scene.remove(this.dir); this.scene.remove(this.ambient);
  this.group.traverse(function (o) {
    if (o.isMesh) { if (o.geometry) o.geometry.dispose(); }
  });
};

AU.World = World;
AU.WALL_H = WALL_H;

})(window.AU);
