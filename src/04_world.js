/* =============================================================
 * BREACHPOINT — collision world, tracing, penetration, navigation
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});
  var M = CS.M, C = CS.C;

  var CELL = 4.0;          // spatial-hash cell size, metres

  function World(map) {
    this.map = map;
    this.boxes = map.boxes;
    this.bounds = map.bounds;
    this.grid = null;
    this.gw = 0; this.gh = 0; this.gx0 = 0; this.gz0 = 0;
    this._buildGrid();
    this._buildNav();
    this.smokes = [];      // live smoke volumes (set by the grenade system)
  }

  /* ---------------------------------------------------------------
   * Broadphase: uniform grid over XZ
   * ------------------------------------------------------------- */
  World.prototype._buildGrid = function () {
    var b = this.bounds;
    this.gx0 = b.x0 - CELL; this.gz0 = b.z0 - CELL;
    this.gw = Math.ceil((b.x1 - b.x0 + CELL * 2) / CELL);
    this.gh = Math.ceil((b.z1 - b.z0 + CELL * 2) / CELL);
    var n = this.gw * this.gh;
    var grid = new Array(n);
    for (var i = 0; i < n; i++) grid[i] = null;

    for (var bi = 0; bi < this.boxes.length; bi++) {
      var box = this.boxes[bi];
      var cx0 = Math.max(0, Math.floor((box.min.x - this.gx0) / CELL));
      var cx1 = Math.min(this.gw - 1, Math.floor((box.max.x - this.gx0) / CELL));
      var cz0 = Math.max(0, Math.floor((box.min.z - this.gz0) / CELL));
      var cz1 = Math.min(this.gh - 1, Math.floor((box.max.z - this.gz0) / CELL));
      for (var cz = cz0; cz <= cz1; cz++) {
        for (var cx = cx0; cx <= cx1; cx++) {
          var k = cz * this.gw + cx;
          if (!grid[k]) grid[k] = [];
          grid[k].push(box);
        }
      }
    }
    this.grid = grid;
  };

  World.prototype.cellAt = function (x, z) {
    var cx = Math.floor((x - this.gx0) / CELL);
    var cz = Math.floor((z - this.gz0) / CELL);
    if (cx < 0 || cz < 0 || cx >= this.gw || cz >= this.gh) return null;
    return this.grid[cz * this.gw + cx];
  };

  /* Gather unique boxes overlapping an AABB. */
  var _qmark = 0;
  World.prototype.queryAABB = function (min, max, out) {
    out.length = 0;
    _qmark++;
    var cx0 = Math.max(0, Math.floor((min.x - this.gx0) / CELL));
    var cx1 = Math.min(this.gw - 1, Math.floor((max.x - this.gx0) / CELL));
    var cz0 = Math.max(0, Math.floor((min.z - this.gz0) / CELL));
    var cz1 = Math.min(this.gh - 1, Math.floor((max.z - this.gz0) / CELL));
    for (var cz = cz0; cz <= cz1; cz++) {
      for (var cx = cx0; cx <= cx1; cx++) {
        var cell = this.grid[cz * this.gw + cx];
        if (!cell) continue;
        for (var i = 0; i < cell.length; i++) {
          var b = cell[i];
          if (b._qm === _qmark) continue;
          b._qm = _qmark;
          if (b.max.x <= min.x || b.min.x >= max.x) continue;
          if (b.max.y <= min.y || b.min.y >= max.y) continue;
          if (b.max.z <= min.z || b.min.z >= max.z) continue;
          out.push(b);
        }
      }
    }
    return out;
  };

  /* ---------------------------------------------------------------
   * Ray tracing against world geometry (grid DDA over XZ)
   * ------------------------------------------------------------- */
  var _hit = { t: 0, nx: 0, ny: 0, nz: 0, box: null, x: 0, y: 0, z: 0 };

  World.prototype.rayWorld = function (ox, oy, oz, dx, dy, dz, maxT, ignoreFn) {
    var best = maxT, bestBox = null, bnx = 0, bny = 0, bnz = 0;
    _qmark++;

    var cx = Math.floor((ox - this.gx0) / CELL);
    var cz = Math.floor((oz - this.gz0) / CELL);
    var stepX = dx > 0 ? 1 : (dx < 0 ? -1 : 0);
    var stepZ = dz > 0 ? 1 : (dz < 0 ? -1 : 0);
    var tDeltaX = stepX !== 0 ? Math.abs(CELL / dx) : Infinity;
    var tDeltaZ = stepZ !== 0 ? Math.abs(CELL / dz) : Infinity;
    var nextBX = this.gx0 + (cx + (stepX > 0 ? 1 : 0)) * CELL;
    var nextBZ = this.gz0 + (cz + (stepZ > 0 ? 1 : 0)) * CELL;
    var tMaxX = stepX !== 0 ? (nextBX - ox) / dx : Infinity;
    var tMaxZ = stepZ !== 0 ? (nextBZ - oz) / dz : Infinity;

    var guard = 0, maxGuard = (this.gw + this.gh) * 2 + 8;
    while (guard++ < maxGuard) {
      if (cx >= 0 && cz >= 0 && cx < this.gw && cz < this.gh) {
        var cell = this.grid[cz * this.gw + cx];
        if (cell) {
          for (var i = 0; i < cell.length; i++) {
            var box = cell[i];
            if (box._qm === _qmark) continue;
            box._qm = _qmark;
            if (ignoreFn && ignoreFn(box)) continue;
            var h = M.rayAABB(ox, oy, oz, dx, dy, dz, box, best);
            if (h && h.t >= 0 && h.t < best) {
              best = h.t; bestBox = box; bnx = h.nx; bny = h.ny; bnz = h.nz;
            }
          }
        }
      }
      // stop once the closest possible hit is behind us
      var tCell = Math.min(tMaxX, tMaxZ);
      if (bestBox && best <= tCell) break;
      if (tCell > maxT) break;
      if (tMaxX < tMaxZ) { cx += stepX; tMaxX += tDeltaX; }
      else { cz += stepZ; tMaxZ += tDeltaZ; }
      if (stepX === 0 && stepZ === 0) break;
    }

    if (!bestBox) return null;
    _hit.t = best; _hit.box = bestBox;
    _hit.nx = bnx; _hit.ny = bny; _hit.nz = bnz;
    _hit.x = ox + dx * best; _hit.y = oy + dy * best; _hit.z = oz + dz * best;
    return _hit;
  };

  /* Exit distance of a ray already inside/entering `box`. */
  function rayExit(ox, oy, oz, dx, dy, dz, box) {
    var tmax = Infinity, t1, t2, inv;
    if (Math.abs(dx) > 1e-9) { inv = 1 / dx; t1 = (box.min.x - ox) * inv; t2 = (box.max.x - ox) * inv; tmax = Math.min(tmax, Math.max(t1, t2)); }
    if (Math.abs(dy) > 1e-9) { inv = 1 / dy; t1 = (box.min.y - oy) * inv; t2 = (box.max.y - oy) * inv; tmax = Math.min(tmax, Math.max(t1, t2)); }
    if (Math.abs(dz) > 1e-9) { inv = 1 / dz; t1 = (box.min.z - oz) * inv; t2 = (box.max.z - oz) * inv; tmax = Math.min(tmax, Math.max(t1, t2)); }
    return tmax === Infinity ? 0 : tmax;
  }
  World.prototype.rayExit = rayExit;

  /* Simple line-of-sight through world geometry (ignores players). */
  World.prototype.losWorld = function (ax, ay, az, bx, by, bz) {
    var dx = bx - ax, dy = by - ay, dz = bz - az;
    var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-6) return true;
    dx /= len; dy /= len; dz /= len;
    var h = this.rayWorld(ax, ay, az, dx, dy, dz, len - 0.01);
    return !h;
  };

  /* LOS including smoke occlusion. `smokes` = [{pos, radius, opacity}] */
  World.prototype.canSee = function (ax, ay, az, bx, by, bz, smokes) {
    if (!this.losWorld(ax, ay, az, bx, by, bz)) return false;
    smokes = smokes || this.smokes;
    if (smokes && smokes.length) {
      var depth = 0;
      for (var i = 0; i < smokes.length; i++) {
        var s = smokes[i];
        if (s.opacity < 0.15) continue;
        depth += M.segmentSphereDepth(ax, ay, az, bx, by, bz, s.pos, s.radius) * s.opacity;
        if (depth > 1.2) return false;     // ~1.2 m of dense smoke fully blocks
      }
    }
    return true;
  };

  /* ---------------------------------------------------------------
   * Player hitboxes
   * ------------------------------------------------------------- */
  var HG = C.HITGROUP;
  /* Returns array of {box, group} for a player at (x,y,z) with height h. */
  World.prototype.hitboxes = function (out, x, y, z, h) {
    out.length = 0;
    var tw = 0.29, hw = 0.155, aw = 0.44;
    // legs
    out.push({ min: { x: x - tw * 0.8, y: y, z: z - tw * 0.8 }, max: { x: x + tw * 0.8, y: y + h * 0.44, z: z + tw * 0.8 }, group: HG.LEG });
    // stomach
    out.push({ min: { x: x - tw, y: y + h * 0.44, z: z - tw * 0.75 }, max: { x: x + tw, y: y + h * 0.62, z: z + tw * 0.75 }, group: HG.STOMACH });
    // chest
    out.push({ min: { x: x - tw, y: y + h * 0.62, z: z - tw * 0.75 }, max: { x: x + tw, y: y + h * 0.885, z: z + tw * 0.75 }, group: HG.CHEST });
    // arms (wider, lower multiplier)
    out.push({ min: { x: x - aw, y: y + h * 0.60, z: z - tw * 0.75 }, max: { x: x + aw, y: y + h * 0.86, z: z + tw * 0.75 }, group: HG.ARM });
    // head
    out.push({ min: { x: x - hw, y: y + h * 0.885, z: z - hw }, max: { x: x + hw, y: y + h * 1.0, z: z + hw }, group: HG.HEAD });
    return out;
  };

  var _hbTmp = [];
  /* Trace against one player. Returns {t, group} or null. */
  World.prototype.rayPlayer = function (ox, oy, oz, dx, dy, dz, maxT, px, py, pz, ph) {
    // cheap reject: bounding sphere
    var cx = px - ox, cy = py + ph * 0.5 - oy, cz = pz - oz;
    var along = cx * dx + cy * dy + cz * dz;
    if (along < -1.2 || along > maxT + 1.2) return null;
    var perp2 = (cx * cx + cy * cy + cz * cz) - along * along;
    if (perp2 > 1.3 * 1.3) return null;

    this.hitboxes(_hbTmp, px, py, pz, ph);
    var best = maxT, group = -1;
    for (var i = 0; i < _hbTmp.length; i++) {
      var h = M.rayAABB(ox, oy, oz, dx, dy, dz, _hbTmp[i], best);
      if (h && h.t >= 0 && h.t < best) { best = h.t; group = _hbTmp[i].group; }
    }
    if (group < 0) return null;
    return { t: best, group: group };
  };

  /* ---------------------------------------------------------------
   * Bullet trace with wall penetration.
   * players: array of {id, team, alive, pos, height, ...}
   * Returns { impacts:[{x,y,z,nx,ny,nz,mat,box}], hits:[{player,group,dist,power}], end:{x,y,z} }
   * ------------------------------------------------------------- */
  var MAX_PEN = 3;
  World.prototype.traceBullet = function (ox, oy, oz, dx, dy, dz, maxDist, weapon, players, shooterId, allowTeam) {
    var res = { impacts: [], hits: [], end: { x: 0, y: 0, z: 0 }, traced: 0 };
    var power = 1.0;
    var pens = 0;
    var travelled = 0;
    var cx = ox, cy = oy, cz = oz;
    var remaining = maxDist;
    var hitIds = {};

    while (remaining > 0.01) {
      var wh = this.rayWorld(cx, cy, cz, dx, dy, dz, remaining);
      var wallT = wh ? wh.t : remaining;

      // players in front of the wall
      var nearest = null;
      if (players) {
        for (var i = 0; i < players.length; i++) {
          var p = players[i];
          if (!p || !p.alive || p.id === shooterId) continue;
          if (hitIds[p.id]) continue;
          if (!allowTeam && p.team === allowTeam) continue;
          var ph = this.rayPlayer(cx, cy, cz, dx, dy, dz, wallT, p.pos.x, p.pos.y, p.pos.z, p.height);
          if (ph && (!nearest || ph.t < nearest.t)) nearest = { t: ph.t, group: ph.group, player: p };
        }
      }

      if (nearest) {
        hitIds[nearest.player.id] = 1;
        res.hits.push({
          player: nearest.player, group: nearest.group,
          dist: travelled + nearest.t, power: power,
          x: cx + dx * nearest.t, y: cy + dy * nearest.t, z: cz + dz * nearest.t
        });
        // bullets keep going through bodies at reduced power
        power *= 0.55;
        var adv = nearest.t + 0.35;
        cx += dx * adv; cy += dy * adv; cz += dz * adv;
        travelled += adv; remaining -= adv;
        if (power < 0.12) break;
        continue;
      }

      if (!wh) {
        res.end.x = cx + dx * remaining; res.end.y = cy + dy * remaining; res.end.z = cz + dz * remaining;
        break;
      }

      // world impact
      var surfName = wh.box.pen || wh.box.mat || 'concrete';
      var surf = C.SURF[surfName] || C.SURF.concrete;
      res.impacts.push({
        x: wh.x, y: wh.y, z: wh.z, nx: wh.nx, ny: wh.ny, nz: wh.nz,
        mat: wh.box.mat, box: wh.box, dist: travelled + wh.t, power: power
      });

      if (pens >= MAX_PEN || !weapon || !weapon.pen) {
        res.end.x = wh.x; res.end.y = wh.y; res.end.z = wh.z;
        break;
      }
      var thickness = rayExit(wh.x - dx * 0.001, wh.y - dy * 0.001, wh.z - dz * 0.001, dx, dy, dz, wh.box);
      var maxThick = weapon.pen * surf.pen * 0.62;   // metres of material this round defeats
      if (thickness > maxThick || thickness <= 0) {
        res.end.x = wh.x; res.end.y = wh.y; res.end.z = wh.z;
        break;
      }
      // passes through: lose damage proportional to how much of the budget was used
      power *= (0.42 + 0.38 * (1 - thickness / maxThick)) * (0.75 + 0.25 * weapon.pen);
      pens++;
      var step = wh.t + thickness + 0.02;
      cx += dx * step; cy += dy * step; cz += dz * step;
      travelled += step; remaining -= step;
      res.impacts.push({
        x: cx, y: cy, z: cz, nx: -dx, ny: -dy, nz: -dz,
        mat: wh.box.mat, box: wh.box, dist: travelled, power: power, exit: true
      });
      if (power < 0.1) { res.end.x = cx; res.end.y = cy; res.end.z = cz; break; }
    }
    if (res.end.x === 0 && res.end.y === 0 && res.end.z === 0) {
      res.end.x = cx + dx * Math.max(0, remaining);
      res.end.y = cy + dy * Math.max(0, remaining);
      res.end.z = cz + dz * Math.max(0, remaining);
    }
    return res;
  };

  /* ---------------------------------------------------------------
   * Entity movement: AABB vs world with sliding and step-up
   * ------------------------------------------------------------- */
  var _qbuf = [];
  var _mn = { x: 0, y: 0, z: 0 }, _mx = { x: 0, y: 0, z: 0 };

  World.prototype.overlaps = function (x, y, z, r, h) {
    _mn.x = x - r; _mn.y = y + 0.001; _mn.z = z - r;
    _mx.x = x + r; _mx.y = y + h - 0.001; _mx.z = z + r;
    this.queryAABB(_mn, _mx, _qbuf);
    return _qbuf.length > 0;
  };

  /* Standing clearance for navigation: obstacles low enough to step onto do
   * not block, otherwise every stair tread would read as a wall. */
  World.prototype.standClear = function (x, y, z, r, h) {
    _mn.x = x - r; _mn.y = y + 0.02; _mn.z = z - r;
    _mx.x = x + r; _mx.y = y + h; _mx.z = z + r;
    this.queryAABB(_mn, _mx, _qbuf);
    var lift = y + C.STEP_HEIGHT + 0.03;
    for (var i = 0; i < _qbuf.length; i++) {
      if (_qbuf[i].max.y <= lift) continue;
      return false;
    }
    return true;
  };

  /* Resolve a single axis of motion. Returns the corrected coordinate. */
  World.prototype._resolveAxis = function (ent, axis, delta, r, h) {
    var x = ent.pos.x, y = ent.pos.y, z = ent.pos.z;
    if (axis === 0) x += delta; else if (axis === 1) y += delta; else z += delta;

    _mn.x = x - r; _mn.y = y; _mn.z = z - r;
    _mx.x = x + r; _mx.y = y + h; _mx.z = z + r;
    this.queryAABB(_mn, _mx, _qbuf);
    if (!_qbuf.length) {
      if (axis === 0) ent.pos.x = x; else if (axis === 1) ent.pos.y = y; else ent.pos.z = z;
      return false;
    }

    var blocked = false;
    for (var i = 0; i < _qbuf.length; i++) {
      var b = _qbuf[i];
      if (axis === 0) {
        if (delta > 0) x = Math.min(x, b.min.x - r - 1e-4);
        else if (delta < 0) x = Math.max(x, b.max.x + r + 1e-4);
      } else if (axis === 1) {
        if (delta > 0) y = Math.min(y, b.min.y - h - 1e-4);
        else if (delta < 0) y = Math.max(y, b.max.y + 1e-4);
      } else {
        if (delta > 0) z = Math.min(z, b.min.z - r - 1e-4);
        else if (delta < 0) z = Math.max(z, b.max.z + r + 1e-4);
      }
      blocked = true;
    }
    if (axis === 0) ent.pos.x = x; else if (axis === 1) { ent.pos.y = y; } else ent.pos.z = z;
    return blocked;
  };

  /* Move an entity (player) by vel*dt with collision, sliding and stairs.
   * ent: { pos:{x,y,z}, vel:{x,y,z}, onGround:bool }  */
  World.prototype.moveEntity = function (ent, dt, radius, height, stepHeight) {
    radius = radius || C.PLAYER_RADIUS;
    height = height || C.STAND_HEIGHT;
    stepHeight = stepHeight === undefined ? C.STEP_HEIGHT : stepHeight;

    var startX = ent.pos.x, startY = ent.pos.y, startZ = ent.pos.z;
    var dx = ent.vel.x * dt, dy = ent.vel.y * dt, dz = ent.vel.z * dt;

    // ---- vertical first when falling, so ground is found before lateral slide
    var wasOnGround = ent.onGround;
    ent.onGround = false;

    // ---- horizontal with step-up support
    var bx = this._resolveAxis(ent, 0, dx, radius, height);
    var bz = this._resolveAxis(ent, 2, dz, radius, height);

    if ((bx || bz) && (wasOnGround || ent.vel.y <= 0.01) && stepHeight > 0) {
      // try again lifted by stepHeight
      var sx = ent.pos.x, sz = ent.pos.z, sy = ent.pos.y;
      ent.pos.x = startX; ent.pos.z = startZ;
      ent.pos.y = startY + stepHeight;
      if (!this.overlaps(ent.pos.x, ent.pos.y, ent.pos.z, radius, height)) {
        this._resolveAxis(ent, 0, dx, radius, height);
        this._resolveAxis(ent, 2, dz, radius, height);
        // drop back down onto the step
        var drop = stepHeight + 0.02;
        this._resolveAxis(ent, 1, -drop, radius, height);
        var gainedX = Math.abs(ent.pos.x - startX), gainedZ = Math.abs(ent.pos.z - startZ);
        if (gainedX + gainedZ <= Math.abs(sx - startX) + Math.abs(sz - startZ) + 1e-4) {
          // step didn't help — revert
          ent.pos.x = sx; ent.pos.z = sz; ent.pos.y = sy;
        } else {
          if (ent.pos.y < startY) ent.pos.y = startY;
          ent.onGround = true;
        }
      } else {
        ent.pos.x = sx; ent.pos.z = sz; ent.pos.y = sy;
      }
    }
    if (bx) ent.vel.x = 0;
    if (bz) ent.vel.z = 0;

    // ---- vertical
    var by = this._resolveAxis(ent, 1, dy, radius, height);
    if (by) {
      if (dy < 0) { ent.onGround = true; }
      ent.vel.y = 0;
    }

    // ---- ground probe (keeps you glued to stairs going down)
    if (!ent.onGround && ent.vel.y <= 0.01) {
      var py = ent.pos.y;
      var probe = wasOnGround ? stepHeight : 0.06;
      this._resolveAxis(ent, 1, -probe, radius, height);
      if (ent.pos.y > py - probe + 1e-4) { ent.onGround = true; ent.vel.y = 0; }
      else ent.pos.y = py;
    }
    return ent;
  };

  /* Can the entity stand up here? */
  World.prototype.canUncrouch = function (x, y, z) {
    return !this.overlaps(x, y, z, C.PLAYER_RADIUS - 0.01, C.STAND_HEIGHT);
  };

  /* Drop a point to the floor (used for grenade landing / spawn fixup). */
  World.prototype.dropToFloor = function (x, y, z, maxDrop) {
    var h = this.rayWorld(x, y, z, 0, -1, 0, maxDrop || 20);
    return h ? h.y : y;
  };

  /* ---------------------------------------------------------------
   * Zones
   * ------------------------------------------------------------- */
  World.prototype.inBox = function (zone, x, y, z) {
    return x >= zone.min.x && x <= zone.max.x && y >= zone.min.y && y <= zone.max.y && z >= zone.min.z && z <= zone.max.z;
  };
  World.prototype.siteAt = function (x, y, z) {
    var s = this.map.sites;
    for (var i = 0; i < s.length; i++) if (this.inBox(s[i], x, y, z)) return s[i];
    return null;
  };
  World.prototype.inBuyZone = function (team, x, y, z) {
    var bz = this.map.buyZones;
    for (var i = 0; i < bz.length; i++) {
      if (bz[i].team === team && this.inBox(bz[i], x, y, z)) return true;
    }
    return false;
  };
  World.prototype.calloutAt = function (x, z) {
    var co = this.map.callouts, best = null, bd = 1e9;
    for (var i = 0; i < co.length; i++) {
      var d = (co[i].x - x) * (co[i].x - x) + (co[i].z - z) * (co[i].z - z);
      if (d < bd) { bd = d; best = co[i]; }
    }
    return best ? best.name : '';
  };

  /* ---------------------------------------------------------------
   * Navigation
   *
   * The graph is generated from the collision geometry rather than
   * hand-authored, so bots can path anywhere a player can walk —
   * including stairs, platforms and catwalks. Cells are sampled on a
   * grid; each cell may hold several nodes at different floor heights.
   * ------------------------------------------------------------- */
  var NAV_STEP = 0.8;          // horizontal sample spacing (m)
  var NAV_MAX_LINK_DY = C.STEP_HEIGHT;
  var NAV_STRIDE = 8;

  World.prototype._buildNav = function () {
    var b = this.bounds;
    var x0 = b.x0 + 1.2, x1 = b.x1 - 1.2, z0 = b.z0 + 1.2, z1 = b.z1 - 1.2;
    var gw = Math.max(1, Math.floor((x1 - x0) / NAV_STEP) + 1);
    var gh = Math.max(1, Math.floor((z1 - z0) / NAV_STEP) + 1);

    var xs = [], ys = [], zs = [];
    var cellNodes = new Array(gw * gh);
    var top = 40, r = C.PLAYER_RADIUS * 0.92, sh = C.STAND_HEIGHT;

    for (var gz = 0; gz < gh; gz++) {
      for (var gx = 0; gx < gw; gx++) {
        var px = x0 + gx * NAV_STEP, pz = z0 + gz * NAV_STEP;
        var list = null;
        var y = top, guard = 0;
        while (guard++ < 6) {
          var h = this.rayWorld(px, y, pz, 0, -1, 0, y + 2);
          if (!h) break;
          var fy = h.y;
          if (fy < -1.5) break;
          var lastY = list ? ys[list[list.length - 1]] : Infinity;
          if (fy < lastY - 0.9 && this.standClear(px, fy, pz, r, sh)) {
            if (!list) list = [];
            list.push(xs.length);
            xs.push(px); ys.push(fy); zs.push(pz);
          }
          y = fy - 0.25;                       // keep looking for floors below
          if (y < -1.0) break;
        }
        cellNodes[gz * gw + gx] = list;
      }
    }

    var n = xs.length;
    var links = new Int32Array(n * NAV_STRIDE).fill(-1);
    var costs = new Float32Array(n * NAV_STRIDE);
    var self = this;

    function tryLink(a, bIdx, cost) {
      for (var s = 0; s < NAV_STRIDE; s++) {
        if (links[a * NAV_STRIDE + s] === -1) {
          links[a * NAV_STRIDE + s] = bIdx; costs[a * NAV_STRIDE + s] = cost; return true;
        }
      }
      return false;
    }
    /* A move is valid if the midpoint has standing clearance at the higher
     * of the two floor heights — that rejects doorways too narrow to fit. */
    function passable(ai, bi) {
      var dy = Math.abs(ys[bi] - ys[ai]);
      if (dy > NAV_MAX_LINK_DY) return false;
      var hy = Math.max(ys[ai], ys[bi]);
      var mx = (xs[ai] + xs[bi]) * 0.5, mz = (zs[ai] + zs[bi]) * 0.5;
      if (!self.standClear(mx, hy, mz, r, sh)) return false;
      return true;
    }

    var NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (var cz2 = 0; cz2 < gh; cz2++) {
      for (var cx2 = 0; cx2 < gw; cx2++) {
        var here = cellNodes[cz2 * gw + cx2];
        if (!here) continue;
        for (var hi = 0; hi < here.length; hi++) {
          var a = here[hi];
          for (var k = 0; k < NB.length; k++) {
            var nx2 = cx2 + NB[k][0], nz2 = cz2 + NB[k][1];
            if (nx2 < 0 || nz2 < 0 || nx2 >= gw || nz2 >= gh) continue;
            var diag = NB[k][0] !== 0 && NB[k][1] !== 0;
            if (diag) {
              // both orthogonal cells must exist, else we would cut a corner
              if (!cellNodes[cz2 * gw + nx2] || !cellNodes[nz2 * gw + cx2]) continue;
            }
            var there = cellNodes[nz2 * gw + nx2];
            if (!there) continue;
            var bestB = -1, bestDy = 1e9;
            for (var ti = 0; ti < there.length; ti++) {
              var dy2 = Math.abs(ys[there[ti]] - ys[a]);
              if (dy2 < bestDy) { bestDy = dy2; bestB = there[ti]; }
            }
            if (bestB < 0 || bestDy > NAV_MAX_LINK_DY) continue;
            if (!passable(a, bestB)) continue;
            var dxl = xs[bestB] - xs[a], dzl = zs[bestB] - zs[a], dyl = ys[bestB] - ys[a];
            tryLink(a, bestB, Math.sqrt(dxl * dxl + dzl * dzl + dyl * dyl * 4));
          }
        }
      }
    }

    /* One-way drop links: a player can jump down a ledge they cannot climb. */
    var DROP_MAX = 3.2;
    for (var dz3 = 0; dz3 < gh; dz3++) {
      for (var dx3 = 0; dx3 < gw; dx3++) {
        var hl = cellNodes[dz3 * gw + dx3];
        if (!hl) continue;
        for (var hj = 0; hj < hl.length; hj++) {
          var a2 = hl[hj];
          for (var k2 = 0; k2 < 4; k2++) {
            var nx3 = dx3 + NB[k2][0], nz3 = dz3 + NB[k2][1];
            if (nx3 < 0 || nz3 < 0 || nx3 >= gw || nz3 >= gh) continue;
            var tl = cellNodes[nz3 * gw + nx3];
            if (!tl) continue;
            for (var tj = 0; tj < tl.length; tj++) {
              var b3 = tl[tj];
              var fall = ys[a2] - ys[b3];
              if (fall <= NAV_MAX_LINK_DY || fall > DROP_MAX) continue;
              if (!self.standClear(xs[b3], ys[b3], zs[b3], r, sh)) continue;
              if (!self.standClear(xs[b3], ys[a2] - 0.1, zs[b3], r, 0.9)) continue;
              tryLink(a2, b3, fall * 2.2 + 1.6);   // costed so bots prefer stairs
            }
          }
        }
      }
    }

    function nearestIn(x, y, z) {
      var cx = Math.round((x - x0) / NAV_STEP), cz = Math.round((z - z0) / NAV_STEP);
      var best = -1, bd = 1e9;
      for (var rr = 0; rr <= 8; rr++) {
        for (var dz = -rr; dz <= rr; dz++) {
          for (var dx = -rr; dx <= rr; dx++) {
            if (rr > 0 && Math.abs(dx) !== rr && Math.abs(dz) !== rr) continue;
            var gx = cx + dx, gz = cz + dz;
            if (gx < 0 || gz < 0 || gx >= gw || gz >= gh) continue;
            var list = cellNodes[gz * gw + gx];
            if (!list) continue;
            for (var i = 0; i < list.length; i++) {
              var id = list[i];
              var ddx = xs[id] - x, ddy = (ys[id] - y) * 2.5, ddz = zs[id] - z;
              var d = ddx * ddx + ddy * ddy + ddz * ddz;
              if (d < bd) { bd = d; best = id; }
            }
          }
        }
        if (best >= 0 && rr >= 1) break;
      }
      return best;
    }

    /* Prune to what a player can actually reach on foot from the spawns.
     * Isolated islands (crate tops, ledges reachable only by jumping) would
     * otherwise swallow bot hint spots and make them un-pathable. */
    (function prune() {
      var reach = new Uint8Array(n);
      var queue = [];
      var sp = self.map.spawns || {};
      var seeds = [];
      for (var tk in sp) for (var si = 0; si < sp[tk].length; si++) seeds.push(sp[tk][si]);
      if (self.map.dmSpawns) seeds = seeds.concat(self.map.dmSpawns);
      for (var s2 = 0; s2 < seeds.length; s2++) {
        var id = nearestIn(seeds[s2].x, seeds[s2].y, seeds[s2].z);
        if (id >= 0 && !reach[id]) { reach[id] = 1; queue.push(id); }
      }
      while (queue.length) {
        var c = queue.pop(), base = c * NAV_STRIDE;
        for (var s3 = 0; s3 < NAV_STRIDE; s3++) {
          var nb = links[base + s3];
          if (nb === -1) break;
          if (!reach[nb]) { reach[nb] = 1; queue.push(nb); }
        }
      }
      var remap = new Int32Array(n).fill(-1), m = 0;
      for (var i2 = 0; i2 < n; i2++) if (reach[i2]) remap[i2] = m++;
      if (m === n || m === 0) return;
      var nxs = new Array(m), nys = new Array(m), nzs = new Array(m);
      var nl = new Int32Array(m * NAV_STRIDE).fill(-1), nc = new Float32Array(m * NAV_STRIDE);
      for (var i3 = 0; i3 < n; i3++) {
        if (!reach[i3]) continue;
        var t2 = remap[i3];
        nxs[t2] = xs[i3]; nys[t2] = ys[i3]; nzs[t2] = zs[i3];
        var w2 = 0;
        for (var s4 = 0; s4 < NAV_STRIDE; s4++) {
          var nb2 = links[i3 * NAV_STRIDE + s4];
          if (nb2 === -1) break;
          if (!reach[nb2]) continue;
          nl[t2 * NAV_STRIDE + w2] = remap[nb2];
          nc[t2 * NAV_STRIDE + w2] = costs[i3 * NAV_STRIDE + s4];
          w2++;
        }
      }
      for (var ci = 0; ci < cellNodes.length; ci++) {
        var cl = cellNodes[ci];
        if (!cl) continue;
        var keep = [];
        for (var k3 = 0; k3 < cl.length; k3++) if (reach[cl[k3]]) keep.push(remap[cl[k3]]);
        cellNodes[ci] = keep.length ? keep : null;
      }
      xs = nxs; ys = nys; zs = nzs; links = nl; costs = nc; n = m;

      function nothing() {}
      nothing();
    })();

    this.nav = {
      n: n, x: xs, y: ys, z: zs, links: links, costs: costs, stride: NAV_STRIDE,
      gw: gw, gh: gh, x0: x0, z0: z0, step: NAV_STEP, cells: cellNodes
    };

    /* Snap the map's tagged hint spots onto real nav nodes. */
    this.navByTag = {};
    this.hintSpots = [];
    var wps = this.map.waypoints || [];
    for (var w = 0; w < wps.length; w++) {
      var id = this.nearestNode(wps[w].x, wps[w].y + 0.2, wps[w].z);
      if (id < 0) continue;
      var spot = { node: id, x: xs[id], y: ys[id], z: zs[id], tags: wps[w].tags };
      this.hintSpots.push(spot);
      for (var t = 0; t < wps[w].tags.length; t++) {
        (this.navByTag[wps[w].tags[t]] = this.navByTag[wps[w].tags[t]] || []).push(spot);
      }
    }

    /* Scratch buffers for A* (reused, no per-call allocation). */
    this._g = new Float32Array(n);
    this._f = new Float32Array(n);
    this._came = new Int32Array(n);
    this._state = new Uint8Array(n);   // 0 none, 1 open, 2 closed
    this._stamp = new Int32Array(n);
    this._epoch = 0;
    this._heap = new Int32Array(Math.max(64, n));
    this._heapPos = new Int32Array(Math.max(64, n));
  };

  World.prototype.navNodePos = function (id, out) {
    out = out || { x: 0, y: 0, z: 0 };
    out.x = this.nav.x[id]; out.y = this.nav.y[id]; out.z = this.nav.z[id];
    return out;
  };

  /* Nearest walkable node index to a world position, or -1. */
  World.prototype.nearestNode = function (x, y, z) {
    var nv = this.nav;
    var cx = Math.round((x - nv.x0) / nv.step);
    var cz = Math.round((z - nv.z0) / nv.step);
    var best = -1, bd = 1e9;
    for (var rr = 0; rr <= 6; rr++) {
      for (var dz = -rr; dz <= rr; dz++) {
        for (var dx = -rr; dx <= rr; dx++) {
          if (rr > 0 && Math.abs(dx) !== rr && Math.abs(dz) !== rr) continue;
          var gx = cx + dx, gz = cz + dz;
          if (gx < 0 || gz < 0 || gx >= nv.gw || gz >= nv.gh) continue;
          var list = nv.cells[gz * nv.gw + gx];
          if (!list) continue;
          for (var i = 0; i < list.length; i++) {
            var id = list[i];
            var ddx = nv.x[id] - x, ddy = (nv.y[id] - y) * 2.5, ddz = nv.z[id] - z;
            var d = ddx * ddx + ddy * ddy + ddz * ddz;
            if (d < bd) { bd = d; best = id; }
          }
        }
      }
      if (best >= 0 && rr >= 1) break;
    }
    return best;
  };

  /* Binary-heap A*. Returns an array of {x,y,z} waypoints, or null. */
  World.prototype.findPath = function (sx, sy, sz, gx, gy, gz, outPath) {
    var start = this.nearestNode(sx, sy, sz);
    var goal = this.nearestNode(gx, gy, gz);
    if (start < 0 || goal < 0) return null;
    var path = outPath || [];
    path.length = 0;
    if (start === goal) { path.push({ x: this.nav.x[goal], y: this.nav.y[goal], z: this.nav.z[goal] }); return path; }

    var nv = this.nav, X = nv.x, Y = nv.y, Z = nv.z, L = nv.links, CO = nv.costs, ST = nv.stride;
    var g = this._g, f = this._f, came = this._came, state = this._state, stamp = this._stamp;
    var ep = ++this._epoch;
    var heap = this._heap, hpos = this._heapPos, hn = 0;

    function hcost(i) {
      var dx = X[i] - X[goal], dy = (Y[i] - Y[goal]) * 1.4, dz = Z[i] - Z[goal];
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    function siftUp(c) {
      var v = heap[c];
      while (c > 0) {
        var p = (c - 1) >> 1;
        if (f[heap[p]] <= f[v]) break;
        heap[c] = heap[p]; hpos[heap[c]] = c; c = p;
      }
      heap[c] = v; hpos[v] = c;
    }
    function siftDown(c) {
      var v = heap[c];
      for (;;) {
        var l = c * 2 + 1, r2 = l + 1, m = c;
        var bestF = f[v];
        if (l < hn && f[heap[l]] < bestF) { m = l; bestF = f[heap[l]]; }
        if (r2 < hn && f[heap[r2]] < bestF) { m = r2; }
        if (m === c) break;
        heap[c] = heap[m]; hpos[heap[c]] = c; c = m;
      }
      heap[c] = v; hpos[v] = c;
    }
    function push(i) { heap[hn] = i; hpos[i] = hn; hn++; siftUp(hn - 1); }
    function pop() {
      var top = heap[0];
      hn--;
      if (hn > 0) { heap[0] = heap[hn]; hpos[heap[0]] = 0; siftDown(0); }
      hpos[top] = -1;
      return top;
    }

    stamp[start] = ep; g[start] = 0; f[start] = hcost(start); state[start] = 1; came[start] = -1;
    push(start);

    var guard = 0, limit = Math.min(60000, nv.n * 4);
    while (hn > 0 && guard++ < limit) {
      var cur = pop();
      if (stamp[cur] === ep && state[cur] === 2) continue;
      state[cur] = 2;
      if (cur === goal) {
        var c2 = cur;
        while (c2 !== -1) { path.push({ x: X[c2], y: Y[c2], z: Z[c2] }); c2 = came[c2]; }
        path.reverse();
        return this.smoothPath(path);
      }
      var base = cur * ST;
      for (var s = 0; s < ST; s++) {
        var nb = L[base + s];
        if (nb === -1) break;
        if (stamp[nb] === ep && state[nb] === 2) continue;
        var tg = g[cur] + CO[base + s];
        var fresh = stamp[nb] !== ep;
        if (fresh || tg < g[nb]) {
          if (fresh) { stamp[nb] = ep; state[nb] = 0; }
          g[nb] = tg; came[nb] = cur; f[nb] = tg + hcost(nb);
          if (state[nb] === 1) siftUp(hpos[nb]);
          else { state[nb] = 1; push(nb); }
        }
      }
    }
    return null;
  };

  /* String-pull: drop intermediate points that are directly reachable,
   * so bots run smooth diagonals instead of grid staircases. */
  World.prototype.smoothPath = function (path) {
    if (path.length < 3) return path;
    var out = [path[0]];
    var i = 0;
    while (i < path.length - 1) {
      var j = path.length - 1;
      for (; j > i + 1; j--) {
        if (this.walkClear(path[i], path[j])) break;
      }
      out.push(path[j]);
      i = j;
    }
    return out;
  };

  /* Can a player-sized body walk the straight line a->b? */
  World.prototype.walkClear = function (a, b) {
    var dx = b.x - a.x, dz = b.z - a.z, dy = b.y - a.y;
    var len = Math.sqrt(dx * dx + dz * dz);
    if (len < 1e-4) return true;
    var steps = Math.ceil(len / 0.4);
    var r = C.PLAYER_RADIUS * 0.95;
    for (var i = 1; i <= steps; i++) {
      var t = i / steps;
      var y = a.y + dy * t;
      if (!this.standClear(a.x + dx * t, y, a.z + dz * t, r, C.STAND_HEIGHT)) return false;
    }
    return true;
  };

  World.prototype.nodesWithTag = function (tag) { return this.navByTag[tag] || []; };
  World.prototype.randomNodeWithTag = function (tag, rng) {
    var list = this.navByTag[tag];
    if (!list || !list.length) return null;
    return list[Math.floor((rng ? rng() : Math.random()) * list.length) % list.length];
  };

  /* A random walkable position — used by deathmatch spawns and bot roaming. */
  World.prototype.randomWalkable = function (rng) {
    var nv = this.nav;
    for (var t = 0; t < 40; t++) {
      var i = Math.floor((rng ? rng() : Math.random()) * nv.n);
      if (i >= 0 && i < nv.n) return { x: nv.x[i], y: nv.y[i], z: nv.z[i] };
    }
    return { x: 0, y: 1, z: 0 };
  };

  CS.World = World;
})(typeof window !== 'undefined' ? window : globalThis);
