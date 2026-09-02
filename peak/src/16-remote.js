// ============================================================ REMOTE PLAYERS
// One entry per other climber in the room.  Positions arrive at 15 Hz and
// are replayed ~120 ms in the past so movement stays smooth.
var Remote = { list: [], map: {}, group: null, DELAY: 0.13 };

Remote.init = function () { Remote.group = new THREE.Group(); return Remote.group; };

Remote.add = function (id, name, slot) {
  if (Remote.map[id]) return Remote.map[id];
  var fig = new Figure(slot % SLOT_COL.length);
  var a = {
    id: id, name: name || 'climber', slot: slot, fig: fig,
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0,
    state: ST.GROUND, hp: K.HP_MAX, st: K.ST_MAX, hunger: 100, temp: 100,
    brace: false, climbing: false, carrying: null, carriedBy: null,
    held: null, parka: false, buf: [], last: now(), speed: 0, boosted: 0,
    summited: false, online: true,
  };
  Remote.group.add(fig.root);
  Remote.list.push(a);
  Remote.map[id] = a;
  return a;
};

Remote.remove = function (id) {
  var a = Remote.map[id];
  if (!a) return;
  Remote.group.remove(a.fig.root);
  Remote.list.splice(Remote.list.indexOf(a), 1);
  delete Remote.map[id];
  if (P.carrying === id) P.carrying = null;
};

Remote.clear = function () {
  while (Remote.list.length) Remote.remove(Remote.list[0].id);
};

Remote.byId = function (id) { return Remote.map[id] || null; };

// a state packet from the wire
Remote.feed = function (id, s) {
  var a = Remote.map[id];
  if (!a) return;
  a.buf.push({ t: now(), x: s.x, y: s.y, z: s.z, yaw: s.yaw });
  if (a.buf.length > 22) a.buf.shift();
  a.state = s.st;
  a.hp = s.hp; a.st = s.sm; a.hunger = s.hu; a.temp = s.tp;
  a.brace = !!s.br; a.climbing = !!s.cl;
  a.carrying = s.ca || null;
  a.held = s.hd || null;
  a.parka = !!s.pk;
  a.last = now();
  a.online = true;
};

Remote.update = function (dt, t) {
  var tt = now() - Remote.DELAY;
  for (var i = 0; i < Remote.list.length; i++) {
    var a = Remote.list[i];
    var b = a.buf, n = b.length;
    if (n >= 2) {
      var lo = 0;
      for (var k = 0; k < n - 1; k++) if (b[k + 1].t <= tt) lo = k + 1;
      var A = b[lo], B = b[Math.min(lo + 1, n - 1)];
      var span = B.t - A.t;
      var u = span > 1e-4 ? clamp((tt - A.t) / span, 0, 1.6) : 1;
      var nx = lerp(A.x, B.x, u), ny = lerp(A.y, B.y, u), nz = lerp(A.z, B.z, u);
      a.speed = Math.hypot(nx - a.pos.x, nz - a.pos.z) / Math.max(dt, 1e-3);
      a.pos.set(nx, ny, nz);
      a.yaw = angLerp(A.yaw, B.yaw, u);
      while (b.length > 2 && b[1].t < tt - 1.2) b.shift();
    } else if (n === 1) {
      a.pos.set(b[0].x, b[0].y, b[0].z);
      a.yaw = b[0].yaw;
    }

    // a climber being hauled rides on the carrier's shoulders
    if (a.carriedBy === P.id) {
      a.pos.set(P.pos.x - Math.sin(P.yaw) * 0.16, P.pos.y + 1.25, P.pos.z - Math.cos(P.yaw) * 0.16);
      a.yaw = P.yaw + Math.PI * 0.5;
    }

    a.fig.root.position.copy(a.pos);
    a.fig.root.rotation.y = a.yaw;
    a.fig.setHeld(a.held);
    a.fig.setParka(a.parka);
    a.fig.pose(dt, {
      t: t, speed: a.carriedBy ? 0 : a.speed, state: a.state,
      climbing: a.climbing, brace: a.brace, carrying: !!a.carrying,
      cold: a.temp < 45, tired: a.st < 22, vy: 0,
    });
    if (a.boosted > 0) a.boosted -= dt;
    if (now() - a.last > 6) a.online = false;
  }
};
