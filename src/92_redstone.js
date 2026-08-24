/* =========================================================================
 * REDSTONE
 *
 * Wire power is recomputed by flooding outward from every source that can
 * reach the changed area, which is simple to reason about and fast enough
 * for the size of circuit a player actually builds.  Repeaters and doors are
 * driven off the same pass; pistons and dispensers fire on the edge.
 * ========================================================================= */

var RS = { dirty: {}, queue: [], tick: 0, accum: 0, repeaters: {}, components: 0 };

/* setBlock runs for every fluid step and every worldgen edit, so the redstone
   hook has to cost nothing at all in a world with no circuits in it. */
function rsMaybeNotify(dim, x, y, z, oldId, newId) {
  if (!Game) return;
  var ob = BLOCKS[oldId], nb = BLOCKS[newId];
  var oRs = ob && ob.group === 'redstone', nRs = nb && nb.group === 'redstone';
  if (nRs) RS.components++;
  if (oRs) RS.components = Math.max(0, RS.components - 1);
  if (oRs || nRs) {
    if (nb && nb.render === 'plate') rsRegisterPlate(Game, dim, x, y, z);
    rsBlockChanged(Game, dim, x, y, z);
    return;
  }
  if (RS.components <= 0) return;
  /* a solid/air change can make or break a conduction path next door */
  rsNotify(Game, dim, x, y, z);
  for (var f = 0; f < 6; f++) {
    var d = FACE_DIR[f];
    rsNotify(Game, dim, x + d[0], y + d[1], z + d[2]);
  }
}

function rsKey(dim, x, y, z) { return dim + ':' + x + ',' + y + ',' + z; }

function rsNotify(game, dim, x, y, z) {
  var k = rsKey(dim, x, y, z);
  if (RS.dirty[k]) return;
  RS.dirty[k] = 1;
  RS.queue.push({ dim: dim, x: x, y: y, z: z });
}
/* every block edit pokes its neighbourhood, which is what the world calls */
function rsBlockChanged(game, dim, x, y, z) {
  rsNotify(game, dim, x, y, z);
  for (var f = 0; f < 6; f++) {
    var d = FACE_DIR[f];
    rsNotify(game, dim, x + d[0], y + d[1], z + d[2]);
    for (var g = 0; g < 6; g++) {
      var e = FACE_DIR[g];
      rsNotify(game, dim, x + d[0] + e[0], y + d[1] + e[1], z + d[2] + e[2]);
    }
  }
}

function isWire(id) { return id === BID.redstone_wire; }
function isConductor(id) {
  if (id === 0) return false;
  var b = BLOCKS[id];
  return b.solid && b.opaque && !b.liquid;
}

/* ---------------------------------------------- what a block puts out --- */
/* strong: powers the block it is attached to as well as adjacent wire      */
function rsSourceStrength(game, dim, x, y, z, toX, toY, toZ) {
  var world = game.world;
  var raw = world.getRaw(dim, x, y, z);
  var id = raw & ID_MASK, st = (raw >>> ST_SHIFT) & 15;
  if (id === 0) return 0;
  if (id === BID.redstone_block) return 15;
  if (id === BID.lever) return (st & 8) ? 15 : 0;
  if (BLOCKS[id].render === 'button') return (st & 8) ? 15 : 0;
  if (BLOCKS[id].render === 'plate') return (st & 8) ? 15 : 0;
  if (id === BID.redstone_torch) {
    /* a torch powers everything except the block it is mounted on */
    if ((st & 8) !== 0) return 0;                       /* bit 3 = burnt out */
    return 15;
  }
  if (id === BID.repeater) {
    if ((st & 8) === 0) return 0;
    var facing = st & 3;
    var d = FACING_VEC[facing];
    /* only the output side is powered */
    if (toX === x + d[0] && toY === y && toZ === z + d[2]) return 15;
    return 0;
  }
  if (id === BID.observer) return (st & 8) ? 15 : 0;
  if (id === BID.daylight_detector) return game.isDay ? 15 : 0;
  if (id === BID.detector_rail) return (st & 8) ? 15 : 0;
  if (id === BID.tripwire_hook) return (st & 8) ? 15 : 0;
  if (id === BID.target) return (st & 8) ? 15 : 0;
  if (id === BID.sculk_sensor || id === BID.calibrated_sculk_sensor) return (st & 8) ? 15 : 0;
  return 0;
}

/* the total power arriving at a position from any direction */
function rsPowerInto(game, dim, x, y, z) {
  var world = game.world;
  var best = 0;
  for (var f = 0; f < 6; f++) {
    var d = FACE_DIR[f];
    var nx = x + d[0], ny = y + d[1], nz = z + d[2];
    var s = rsSourceStrength(game, dim, nx, ny, nz, x, y, z);
    if (s > best) best = s;
    var nid = world.getId(dim, nx, ny, nz);
    if (isWire(nid)) {
      var w = world.getState(dim, nx, ny, nz);
      /* wire only feeds the block it points into if that block is not above */
      if (d[1] === 0 && w > best) best = w;
      if (f === 3 && w > best) best = w;   /* wire on top of this block */
    }
    /* a conductor carrying strong power passes it on */
    if (isConductor(nid)) {
      for (var g = 0; g < 6; g++) {
        var e = FACE_DIR[g];
        var s2 = rsSourceStrength(game, dim, nx + e[0], ny + e[1], nz + e[2], nx, ny, nz);
        if (s2 === 15 && 15 > best) best = 15;
      }
    }
  }
  return best;
}

/* --------------------------------------------------------- wire solve --- */
function rsWireCanConnect(world, dim, x, y, z, dx, dz) {
  var nx = x + dx, nz = z + dz;
  var nid = world.getId(dim, nx, y, nz);
  if (isWire(nid)) return { x: nx, y: y, z: nz };
  /* step up over a non-conducting block, or down a step */
  if (!isConductor(nid)) {
    if (isWire(world.getId(dim, nx, y - 1, nz))) return { x: nx, y: y - 1, z: nz };
  }
  if (!isConductor(world.getId(dim, x, y + 1, z))) {
    if (isWire(world.getId(dim, nx, y + 1, nz))) return { x: nx, y: y + 1, z: nz };
  }
  return null;
}

var _rsSeen = {}, _rsList = [];
function solveWireNetwork(game, dim, sx, sy, sz) {
  var world = game.world;
  _rsSeen = {}; _rsList.length = 0;
  var stack = [[sx, sy, sz]];
  _rsSeen[sx + ',' + sy + ',' + sz] = 1;
  while (stack.length && _rsList.length < 2200) {
    var c = stack.pop();
    _rsList.push(c);
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var i = 0; i < 4; i++) {
      var n = rsWireCanConnect(world, dim, c[0], c[1], c[2], dirs[i][0], dirs[i][1]);
      if (!n) continue;
      var k = n.x + ',' + n.y + ',' + n.z;
      if (_rsSeen[k]) continue;
      _rsSeen[k] = 1;
      stack.push([n.x, n.y, n.z]);
    }
  }
  /* seed from every source touching the network */
  var power = {};
  var frontier = [];
  for (var w = 0; w < _rsList.length; w++) {
    var p = _rsList[w];
    var best = 0;
    for (var f = 0; f < 6; f++) {
      var d = FACE_DIR[f];
      var s = rsSourceStrength(game, dim, p[0] + d[0], p[1] + d[1], p[2] + d[2], p[0], p[1], p[2]);
      if (s > best) best = s;
      /* strongly powered conductors feed wire sitting on them */
      var nid = world.getId(dim, p[0] + d[0], p[1] + d[1], p[2] + d[2]);
      if (isConductor(nid)) {
        for (var g = 0; g < 6; g++) {
          var e = FACE_DIR[g];
          var s2 = rsSourceStrength(game, dim, p[0] + d[0] + e[0], p[1] + d[1] + e[1], p[2] + d[2] + e[2],
            p[0] + d[0], p[1] + d[1], p[2] + d[2]);
          if (s2 === 15) best = 15;
        }
      }
    }
    var key = p[0] + ',' + p[1] + ',' + p[2];
    power[key] = best;
    if (best > 0) frontier.push(p);
  }
  /* spread, losing one level per step */
  var guard = 0;
  while (frontier.length && guard++ < 6000) {
    var next = [];
    for (var q = 0; q < frontier.length; q++) {
      var c2 = frontier[q];
      var pv = power[c2[0] + ',' + c2[1] + ',' + c2[2]];
      if (pv <= 1) continue;
      var dirs2 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var j = 0; j < 4; j++) {
        var n2 = rsWireCanConnect(world, dim, c2[0], c2[1], c2[2], dirs2[j][0], dirs2[j][1]);
        if (!n2) continue;
        var k2 = n2.x + ',' + n2.y + ',' + n2.z;
        if (power[k2] === undefined) continue;
        if (power[k2] < pv - 1) { power[k2] = pv - 1; next.push([n2.x, n2.y, n2.z]); }
      }
    }
    frontier = next;
  }
  /* write the levels back */
  var changed = [];
  for (var r = 0; r < _rsList.length; r++) {
    var pp = _rsList[r];
    var nv = power[pp[0] + ',' + pp[1] + ',' + pp[2]] || 0;
    var cur = world.getState(dim, pp[0], pp[1], pp[2]);
    if (cur !== nv) {
      world.setBlock(dim, pp[0], pp[1], pp[2], bpack(BID.redstone_wire, nv), true);
      world.markDirtyAt(dim, pp[0], pp[1], pp[2]);
      changed.push(pp);
    }
  }
  return changed;
}

/* --------------------------------------------------------- components --- */
function rsUpdateBlock(game, dim, x, y, z) {
  var world = game.world;
  var raw = world.getRaw(dim, x, y, z);
  var id = raw & ID_MASK, st = (raw >>> ST_SHIFT) & 15;
  if (id === 0) return;

  if (isWire(id)) { solveWireNetwork(game, dim, x, y, z); return; }

  var powered = rsPowerInto(game, dim, x, y, z) > 0;

  if (id === BID.redstone_torch) {
    /* a torch is on unless the block it sits on is powered */
    var below = world.getId(dim, x, y - 1, z);
    var mountPowered = false;
    if (isConductor(below)) mountPowered = rsPowerInto(game, dim, x, y - 1, z) > 0;
    var burnt = (st & 8) !== 0;
    if (mountPowered !== burnt) {
      world.setBlock(dim, x, y, z, bpack(id, mountPowered ? 8 : 0));
      rsBlockChanged(game, dim, x, y, z);
    }
    return;
  }
  if (id === BID.redstone_lamp || id === BID.redstone_lamp_lit) {
    var want = powered ? BID.redstone_lamp_lit : BID.redstone_lamp;
    if (want !== id) world.setBlock(dim, x, y, z, want);
    return;
  }
  if (id === BID.repeater) {
    var key = rsKey(dim, x, y, z);
    var facing = st & 3, delay = (st >> 2) & 3;
    var back = FACING_VEC[(facing + 2) & 3];
    var inPower = rsSourceStrength(game, dim, x + back[0], y, z + back[2], x, y, z) > 0;
    if (!inPower) {
      var bid = world.getId(dim, x + back[0], y, z + back[2]);
      if (isWire(bid) && world.getState(dim, x + back[0], y, z + back[2]) > 0) inPower = true;
      else if (isConductor(bid) && rsPowerInto(game, dim, x + back[0], y, z + back[2]) > 0) inPower = true;
    }
    var pend = RS.repeaters[key];
    if (inPower !== ((st & 8) !== 0)) {
      if (!pend) RS.repeaters[key] = { t: (delay + 1) * 0.1, want: inPower, dim: dim, x: x, y: y, z: z };
    } else if (pend && pend.want !== inPower) delete RS.repeaters[key];
    return;
  }
  if (id === BID.piston || id === BID.sticky_piston) {
    var ext = (st & 8) !== 0;
    if (powered !== ext) {
      world.setBlock(dim, x, y, z, bpack(id, (st & 7) | (powered ? 8 : 0)));
      var fv = FACING_VEC[st & 3];
      var hx = x + fv[0], hy = y, hz = z + fv[2];
      if (powered) {
        /* shove the block in front along one cell if there is room */
        var fid = world.getId(dim, hx, hy, hz);
        if (fid !== 0 && BLOCKS[fid].hard >= 0 && !BLOCKS[fid].liquid) {
          var tx = hx + fv[0], tz = hz + fv[2];
          if (world.getId(dim, tx, hy, tz) === 0) {
            world.setBlock(dim, tx, hy, tz, world.getRaw(dim, hx, hy, hz));
            world.setBlock(dim, hx, hy, hz, 0);
          }
        }
      }
      playSound(game, 'click', x, y, z, 0.7);
    }
    return;
  }
  if (id === BID.dispenser || id === BID.dropper) {
    var was = (st & 8) !== 0;
    if (powered && !was) {
      world.setBlock(dim, x, y, z, bpack(id, (st & 7) | 8));
      dispenseFrom(game, dim, x, y, z, st & 7);
    } else if (!powered && was) world.setBlock(dim, x, y, z, bpack(id, st & 7));
    return;
  }
  if (id === BID.note_block) {
    var was2 = (st & 8) !== 0;
    if (powered && !was2) {
      world.setBlock(dim, x, y, z, bpack(id, (st & 7) | 8));
      playSound(game, 'pop', x, y, z, 0.6 + (st & 7) * 0.15, 0.9);
    } else if (!powered && was2) world.setBlock(dim, x, y, z, bpack(id, st & 7));
    return;
  }
  if (id === BID.tnt) {
    if (powered) {
      world.setBlock(dim, x, y, z, 0);
      game.entities.push(makeEntity('tnt', dim, x + 0.5, y, z + 0.5, { fuseTime: 0, persist: true }));
      playSound(game, 'shoot', x, y, z, 0.7);
    }
    return;
  }
  var b = BLOCKS[id];
  if (b.render === 'door') {
    var base = (st & 8) ? y - 1 : y;
    var lo = world.getRaw(dim, x, base, z), hi = world.getRaw(dim, x, base + 1, z);
    var open = ((lo >>> ST_SHIFT) & 4) !== 0;
    var pw = rsPowerInto(game, dim, x, base, z) > 0 || rsPowerInto(game, dim, x, base + 1, z) > 0;
    if (pw !== open) {
      world.setBlock(dim, x, base, z, bpack(lo & ID_MASK, ((lo >>> ST_SHIFT) & 15) ^ 4));
      world.setBlock(dim, x, base + 1, z, bpack(hi & ID_MASK, ((hi >>> ST_SHIFT) & 15) ^ 4));
      playSound(game, 'door', x, y, z);
    }
    return;
  }
  if (b.render === 'trapdoor' || b.render === 'gate') {
    var open2 = (st & 4) !== 0;
    if (powered !== open2) {
      world.setBlock(dim, x, y, z, bpack(id, st ^ 4));
      playSound(game, 'door', x, y, z);
    }
    return;
  }
}

function dispenseFrom(game, dim, x, y, z, facing) {
  var be = getBlockEntity(game, dim, x, y, z, 'dispenser', true);
  if (!be) return;
  for (var i = 0; i < be.items.length; i++) {
    var s = be.items[i];
    if (!s) continue;
    var fv = FACING_VEC[facing & 3];
    var it = ITEMS[s.item];
    s.count--;
    if (s.count <= 0) be.items[i] = null;
    if (it && it.name === 'arrow') {
      var e = makeEntity('arrow', dim, x + 0.5 + fv[0] * 0.7, y + 0.5, z + 0.5 + fv[2] * 0.7,
        { vx: fv[0] * 30, vy: 0, vz: fv[2] * 30, kind: 'arrow', life: 0 });
      game.entities.push(e);
    } else {
      dropItem(game, dim, x + 0.5 + fv[0] * 0.8, y + 0.5, z + 0.5 + fv[2] * 0.8, s.item, 1, true);
    }
    playSound(game, 'shoot', x, y, z, 1.2);
    return;
  }
}

/* --------------------------------------------------------- the driver --- */
function tickRedstone(game, dt) {
  RS.accum += dt;
  /* redstone runs on its own 10 Hz clock, like the real game's tick */
  if (RS.accum < 0.1) return;
  RS.accum = 0;
  RS.tick++;

  /* pending repeater flips */
  for (var k in RS.repeaters) {
    var r = RS.repeaters[k];
    r.t -= 0.1;
    if (r.t > 0) continue;
    delete RS.repeaters[k];
    var raw = game.world.getRaw(r.dim, r.x, r.y, r.z);
    if ((raw & ID_MASK) !== BID.repeater) continue;
    var st = (raw >>> ST_SHIFT) & 15;
    game.world.setBlock(r.dim, r.x, r.y, r.z, bpack(BID.repeater, (st & 7) | (r.want ? 8 : 0)));
    rsBlockChanged(game, r.dim, r.x, r.y, r.z);
  }

  /* buttons pop back out */
  if (RS.buttons) {
    for (var bk in RS.buttons) {
      var bb = RS.buttons[bk];
      bb.t -= 0.1;
      if (bb.t > 0) continue;
      delete RS.buttons[bk];
      var braw = game.world.getRaw(bb.dim, bb.x, bb.y, bb.z);
      var bid = braw & ID_MASK;
      if (!BLOCKS[bid] || BLOCKS[bid].render !== 'button') continue;
      game.world.setBlock(bb.dim, bb.x, bb.y, bb.z, bpack(bid, ((braw >>> ST_SHIFT) & 7)));
      rsBlockChanged(game, bb.dim, bb.x, bb.y, bb.z);
      playSound(game, 'click', bb.x, bb.y, bb.z, 0.8);
    }
  }

  /* pressure plates follow whatever is standing on them */
  updatePressurePlates(game);

  var q = RS.queue;
  if (!q.length) return;
  RS.queue = [];
  RS.dirty = {};
  var budget = 900;
  for (var i = 0; i < q.length && i < budget; i++) {
    rsUpdateBlock(game, q[i].dim, q[i].x, q[i].y, q[i].z);
  }
  for (var j = budget; j < q.length; j++) rsNotify(game, q[j].dim, q[j].x, q[j].y, q[j].z);
}

function updatePressurePlates(game) {
  var list = RS.plates;
  if (!list || !list.length) return;
  var world = game.world;
  for (var i = list.length - 1; i >= 0; i--) {
    var pl = list[i];
    var raw = world.getRaw(pl.dim, pl.x, pl.y, pl.z);
    var id = raw & ID_MASK;
    if (!BLOCKS[id] || BLOCKS[id].render !== 'plate') { list.splice(i, 1); continue; }
    var on = false;
    var p = game.player;
    if (p.dim === pl.dim && Math.abs(p.x - (pl.x + 0.5)) < 0.75 && Math.abs(p.z - (pl.z + 0.5)) < 0.75 &&
      p.y >= pl.y - 0.2 && p.y < pl.y + 1.2) on = true;
    if (!on) {
      for (var e = 0; e < game.entities.length; e++) {
        var en = game.entities[e];
        if (en.dim !== pl.dim || en.dead) continue;
        if (Math.abs(en.x - (pl.x + 0.5)) < 0.75 && Math.abs(en.z - (pl.z + 0.5)) < 0.75 &&
          en.y >= pl.y - 0.2 && en.y < pl.y + 1.2) { on = true; break; }
      }
    }
    var st = (raw >>> ST_SHIFT) & 15;
    var was = (st & 8) !== 0;
    if (on !== was) {
      world.setBlock(pl.dim, pl.x, pl.y, pl.z, bpack(id, (st & 7) | (on ? 8 : 0)));
      rsBlockChanged(game, pl.dim, pl.x, pl.y, pl.z);
      playSound(game, 'click', pl.x, pl.y, pl.z, on ? 1.1 : 0.85, 0.5);
    }
  }
}
function rsRegisterPlate(game, dim, x, y, z) {
  RS.plates = RS.plates || [];
  for (var i = 0; i < RS.plates.length; i++) {
    var p = RS.plates[i];
    if (p.dim === dim && p.x === x && p.y === y && p.z === z) return;
  }
  RS.plates.push({ dim: dim, x: x, y: y, z: z });
}
function rsPressButton(game, dim, x, y, z) {
  RS.buttons = RS.buttons || {};
  RS.buttons[rsKey(dim, x, y, z)] = { t: 1.0, dim: dim, x: x, y: y, z: z };
}
