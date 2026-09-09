/* ============================================================
   AMONG US 3D — LAYOUT & NAVIGATION
   Turns map data into rectangles + a collision grid, and builds
   a small waypoint graph the bots path over with A*.
   ============================================================ */
(function (AU) {
'use strict';

var CELL = 0.5;

function rectOf(room) {
  return { id: room.id, kind: 'room', x0: room.x - room.w / 2, x1: room.x + room.w / 2,
           z0: room.z - room.d / 2, z1: room.z + room.d / 2, room: room };
}
function hallRect(x0, z0, x1, z1, a, b) {
  return { id: 'hall_' + a + '_' + b, kind: 'hall',
           x0: Math.min(x0, x1), x1: Math.max(x0, x1),
           z0: Math.min(z0, z1), z1: Math.max(z0, z1), a: a, b: b };
}
function overlap(a0, a1, b0, b1) {
  var lo = Math.max(a0, b0), hi = Math.min(a1, b1);
  return hi > lo ? [lo, hi] : null;
}

/* ---- build corridors from the link list ---- */
function buildHalls(map) {
  var halls = [], segsByLink = {};
  var W = map.hallWidth || 4.5;
  for (var i = 0; i < map.links.length; i++) {
    var a = AU.roomOf(map, map.links[i][0]), b = AU.roomOf(map, map.links[i][1]);
    if (!a || !b) continue;
    var ra = rectOf(a), rb = rectOf(b), segs = [];
    var ox = overlap(ra.x0 + 1, ra.x1 - 1, rb.x0 + 1, rb.x1 - 1);
    var oz = overlap(ra.z0 + 1, ra.z1 - 1, rb.z0 + 1, rb.z1 - 1);
    if (ox && (ox[1] - ox[0]) >= W * 0.8) {
      var cx = (ox[0] + ox[1]) / 2;
      var z0 = Math.min(ra.z1, rb.z1), z1 = Math.max(ra.z0, rb.z0);
      segs.push(hallRect(cx - W / 2, Math.min(z0, z1), cx + W / 2, Math.max(z0, z1), a.id, b.id));
    } else if (oz && (oz[1] - oz[0]) >= W * 0.8) {
      var cz = (oz[0] + oz[1]) / 2;
      var x0 = Math.min(ra.x1, rb.x1), x1 = Math.max(ra.x0, rb.x0);
      segs.push(hallRect(Math.min(x0, x1), cz - W / 2, Math.max(x0, x1), cz + W / 2, a.id, b.id));
    } else {
      /* L-shaped: horizontal from A to B's x, then vertical to B */
      var ex = b.x, ez = a.z;
      var hx0 = a.x < ex ? ra.x1 - 1 : ra.x0 + 1;
      segs.push(hallRect(Math.min(hx0, ex + W / 2 * (a.x < ex ? 1 : -1)), ez - W / 2,
                         Math.max(hx0, ex + W / 2 * (a.x < ex ? 1 : -1)), ez + W / 2, a.id, 'elbow'));
      var vz0 = b.z < ez ? rb.z1 - 1 : rb.z0 + 1;
      segs.push(hallRect(ex - W / 2, Math.min(vz0, ez + W / 2 * (b.z < ez ? -1 : 1)),
                         ex + W / 2, Math.max(vz0, ez + W / 2 * (b.z < ez ? -1 : 1)), 'elbow', b.id));
    }
    for (var s = 0; s < segs.length; s++) {
      segs[s].link = i;
      halls.push(segs[s]);
    }
    segsByLink[i] = segs;
  }
  return { halls: halls, segsByLink: segsByLink };
}

/* ---- occupancy grid ---- */
function buildGrid(rects) {
  var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (var i = 0; i < rects.length; i++) {
    minX = Math.min(minX, rects[i].x0); maxX = Math.max(maxX, rects[i].x1);
    minZ = Math.min(minZ, rects[i].z0); maxZ = Math.max(maxZ, rects[i].z1);
  }
  minX -= 3; maxX += 3; minZ -= 3; maxZ += 3;
  var w = Math.ceil((maxX - minX) / CELL), h = Math.ceil((maxZ - minZ) / CELL);
  var cells = new Uint8Array(w * h);
  for (var k = 0; k < rects.length; k++) {
    var R = rects[k];
    var i0 = Math.floor((R.x0 - minX) / CELL), i1 = Math.ceil((R.x1 - minX) / CELL);
    var j0 = Math.floor((R.z0 - minZ) / CELL), j1 = Math.ceil((R.z1 - minZ) / CELL);
    for (var j = j0; j < j1; j++) {
      if (j < 0 || j >= h) continue;
      for (var ii = i0; ii < i1; ii++) {
        if (ii < 0 || ii >= w) continue;
        cells[j * w + ii] = 1;
      }
    }
  }
  return { minX: minX, minZ: minZ, w: w, h: h, cells: cells, cell: CELL,
           maxX: minX + w * CELL, maxZ: minZ + h * CELL };
}

/* ---- waypoint graph ---- */
function buildGraph(map, halls, segsByLink) {
  var nodes = [], index = {};
  function add(id, x, z, room) {
    if (index[id] != null) return index[id];
    index[id] = nodes.length;
    nodes.push({ id: id, x: x, z: z, room: room || null, edges: [] });
    return index[id];
  }
  for (var i = 0; i < map.rooms.length; i++) {
    var R = map.rooms[i];
    add('room:' + R.id, R.x, R.z, R.id);
  }
  function connect(a, b) {
    if (a === b) return;
    var d = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z);
    nodes[a].edges.push({ n: b, d: d });
    nodes[b].edges.push({ n: a, d: d });
  }
  for (var L in segsByLink) {
    var segs = segsByLink[L];
    var prev = null;
    for (var s = 0; s < segs.length; s++) {
      var S = segs[s];
      var nid = add('hall:' + L + ':' + s, (S.x0 + S.x1) / 2, (S.z0 + S.z1) / 2, null);
      if (s === 0) connect(index['room:' + map.links[L][0]], nid);
      if (prev != null) connect(prev, nid);
      prev = nid;
    }
    if (prev != null) connect(index['room:' + map.links[L][1]], prev);
  }
  return { nodes: nodes, index: index };
}

/* ============================================================ */
function Layout(map) {
  this.map = map;
  var rects = [];
  for (var i = 0; i < map.rooms.length; i++) rects.push(rectOf(map.rooms[i]));
  var hb = buildHalls(map);
  this.halls = hb.halls;
  for (var j = 0; j < hb.halls.length; j++) rects.push(hb.halls[j]);
  this.rects = rects;
  this.grid = buildGrid(rects);
  this.graph = buildGraph(map, hb.halls, hb.segsByLink);
  this.roomRects = rects.filter(function (r) { return r.kind === 'room'; });
}

Layout.prototype.walkable = function (x, z) {
  var g = this.grid;
  var i = Math.floor((x - g.minX) / g.cell), j = Math.floor((z - g.minZ) / g.cell);
  if (i < 0 || j < 0 || i >= g.w || j >= g.h) return false;
  return g.cells[j * g.w + i] === 1;
};

/* Circle-vs-grid test used by the player & bot movement. */
Layout.prototype.free = function (x, z, radius) {
  radius = radius || AU.PLAYER_RADIUS;
  if (!this.walkable(x, z)) return false;
  var k = 0.7071 * radius;
  return this.walkable(x + radius, z) && this.walkable(x - radius, z) &&
         this.walkable(x, z + radius) && this.walkable(x, z - radius) &&
         this.walkable(x + k, z + k) && this.walkable(x - k, z + k) &&
         this.walkable(x + k, z - k) && this.walkable(x - k, z - k);
};

Layout.prototype.roomAt = function (x, z) {
  for (var i = 0; i < this.roomRects.length; i++) {
    var R = this.roomRects[i];
    if (x >= R.x0 && x <= R.x1 && z >= R.z0 && z <= R.z1) return R.room;
  }
  return null;
};
Layout.prototype.roomNameAt = function (x, z) {
  var r = this.roomAt(x, z);
  return r ? r.name : 'Hallway';
};

Layout.prototype.randomPointIn = function (roomId, margin) {
  var R = AU.roomOf(this.map, roomId);
  if (!R) return { x: 0, z: 0 };
  margin = margin || 1.6;
  for (var t = 0; t < 30; t++) {
    var x = R.x + (Math.random() - 0.5) * Math.max(1, R.w - margin * 2);
    var z = R.z + (Math.random() - 0.5) * Math.max(1, R.d - margin * 2);
    if (this.free(x, z)) return { x: x, z: z };
  }
  return { x: R.x, z: R.z };
};

/* Straight-line visibility over the walkable grid (walls block sight). */
Layout.prototype.lineClear = function (x0, z0, x1, z1) {
  var dx = x1 - x0, dz = z1 - z0;
  var dist = Math.hypot(dx, dz);
  var steps = Math.ceil(dist / (CELL * 0.9));
  if (steps <= 0) return true;
  for (var i = 1; i < steps; i++) {
    var t = i / steps;
    if (!this.walkable(x0 + dx * t, z0 + dz * t)) return false;
  }
  return true;
};

/* ---- A* over the waypoint graph ---- */
Layout.prototype.nearestNode = function (x, z, roomId) {
  var nodes = this.graph.nodes, best = -1, bd = Infinity;
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    if (roomId && n.room && n.room !== roomId) { /* still allowed, just deprioritised */ }
    var d = (n.x - x) * (n.x - x) + (n.z - z) * (n.z - z);
    if (roomId && n.room === roomId) d *= 0.25;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
};

Layout.prototype.path = function (fromX, fromZ, toX, toZ, fromRoom, toRoom) {
  var nodes = this.graph.nodes;
  var start = this.nearestNode(fromX, fromZ, fromRoom);
  var goal  = this.nearestNode(toX, toZ, toRoom);
  if (start < 0 || goal < 0) return null;
  if (start === goal) return [{ x: toX, z: toZ }];

  var n = nodes.length;
  var g = new Float64Array(n), f = new Float64Array(n);
  var came = new Int32Array(n), closed = new Uint8Array(n), open = [];
  for (var i = 0; i < n; i++) { g[i] = Infinity; f[i] = Infinity; came[i] = -1; }
  function hEst(a) { return Math.hypot(nodes[a].x - toX, nodes[a].z - toZ); }
  g[start] = 0; f[start] = hEst(start); open.push(start);

  while (open.length) {
    var bi = 0;
    for (var q = 1; q < open.length; q++) if (f[open[q]] < f[open[bi]]) bi = q;
    var cur = open.splice(bi, 1)[0];
    if (cur === goal) break;
    closed[cur] = 1;
    var e = nodes[cur].edges;
    for (var k = 0; k < e.length; k++) {
      var nb = e[k].n;
      if (closed[nb]) continue;
      var tg = g[cur] + e[k].d;
      if (tg < g[nb]) {
        came[nb] = cur; g[nb] = tg; f[nb] = tg + hEst(nb);
        if (open.indexOf(nb) < 0) open.push(nb);
      }
    }
  }
  if (came[goal] < 0 && goal !== start) return null;
  var out = [], c = goal, guard = 0;
  while (c >= 0 && guard++ < 500) { out.push({ x: nodes[c].x, z: nodes[c].z }); c = came[c]; }
  out.reverse();
  out.push({ x: toX, z: toZ });
  return out;
};

AU.Nav = {
  Layout: Layout,
  CELL: CELL,
  build: function (map) { return new Layout(map); }
};

})(window.AU);
