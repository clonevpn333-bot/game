// ============================================================ CO-OP
var Coop = {
  pitons: [], ropes: [], pings: [], group: null,
  pitonGeo: null, chevGeo: null, ropeGeo: null, pingHold: 0, handT: 0,
};

Coop.init = function () {
  Coop.group = new THREE.Group();
  Coop.pitons = []; Coop.ropes = []; Coop.pings = [];
  Coop.pitonGeo = mergeParts([
    { g: new THREE.CylinderGeometry(0.055, 0.03, 0.6, 5), c: 0xc9d2da, p: [0, 0, 0.18], r: [Math.PI / 2, 0, 0] },
    { g: new THREE.TorusGeometry(0.14, 0.04, 4, 8), c: 0xffd646, p: [0, 0, 0.44] },
  ]);
  Coop.chevGeo = mergeParts([
    { g: new THREE.ConeGeometry(0.42, 0.7, 4), c: 0xffffff, p: [0, 0.5, 0], r: [Math.PI, 0, 0] },
    { g: new THREE.TorusGeometry(0.5, 0.06, 4, 12), c: 0xffffff, p: [0, 0.06, 0], r: [Math.PI / 2, 0, 0] },
  ]);
  Coop.ropeGeo = new THREE.CylinderGeometry(0.055, 0.055, 1, 6, 1, true);
  return Coop.group;
};

// ---- pitons: the only rest you get off the ground ---------------------
Coop.placePiton = function (x, y, z, nx, nz, quiet) {
  var m = new THREE.Mesh(Coop.pitonGeo, MAT.solid);
  m.position.set(x + nx * 0.12, y, z + nz * 0.12);
  m.rotation.y = Math.atan2(nx, nz);
  Coop.group.add(m);
  Coop.pitons.push({ x: m.position.x, y: y, z: m.position.z, mesh: m });
  if (!quiet) {
    Net.send({ t: 'pit', x: x, y: y, z: z, nx: nx, nz: nz });
    HUD.toast('piton set — hold on here to breathe', '#8fe04a');
  }
};
Coop.pitonNear = function (x, y, z) {
  for (var i = 0; i < Coop.pitons.length; i++) {
    var p = Coop.pitons[i], dx = p.x - x, dy = p.y - y, dz = p.z - z;
    if (dx * dx + dy * dy + dz * dz < 2.4) return p;
  }
  return null;
};

// ---- ropes ------------------------------------------------------------
Coop.addRope = function (x, yTop, z, len) {
  var m = new THREE.Mesh(Coop.ropeGeo, MAT.solid);
  m.scale.y = len;
  m.position.set(x, yTop - len / 2, z);
  var col = new Float32Array(m.geometry.attributes.position.count * 3);
  for (var i = 0; i < col.length; i += 3) hexLin(0xd9b06a, col, i, 1);
  if (!m.geometry.attributes.color) m.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  Coop.group.add(m);
  var r = { x: x, z: z, top: yTop, bot: yTop - len, mesh: m };
  Coop.ropes.push(r);
  return r;
};
Coop.ropeNear = function (x, y, z) {
  for (var i = 0; i < Coop.ropes.length; i++) {
    var r = Coop.ropes[i];
    if (y > r.top + 0.6 || y < r.bot - 0.6) continue;
    var dx = r.x - x, dz = r.z - z;
    if (dx * dx + dz * dz < 1.3) return r;
  }
  return null;
};
Coop.dropSpool = function () {
  if (P.state !== ST.GROUND) { HUD.toast('deploy a spool from solid ground', '#a8a39a'); return false; }
  var f = CAM.flatForward(new THREE.Vector3());
  var x = P.pos.x + f.x * 1.2, z = P.pos.z + f.z * 1.2;
  var top = P.pos.y + 0.2;
  var drop = 0;
  while (drop < K.ROPE_LEN && groundH(x, z) < top - drop - 1.0) drop += 0.5;
  if (drop < 3) { HUD.toast('nothing to drop a rope down', '#a8a39a'); return false; }
  Coop.addRope(x, top, z, drop);
  Net.send({ t: 'rope', x: x, y: top, z: z, l: drop });
  HUD.toast('rope down — ' + Math.round(drop) + ' m', '#8fe04a');
  return true;
};
Coop.fireCannon = function () {
  var d = CAM.forward(new THREE.Vector3());
  var o = CAM.first ? CAM.pos : new THREE.Vector3(P.pos.x, P.pos.y + K.EYE, P.pos.z);
  var hit = { x: 0, y: 0, z: 0, d: 0, hit: false };
  T.ray(o.x, o.y, o.z, d.x, d.y, d.z, 45, 0.5, hit);
  if (!hit.hit) { HUD.toast('nothing in range to anchor to', '#a8a39a'); return false; }
  var len = Math.min(K.ROPE_LEN, Math.max(4, hit.y - Math.max(0, groundH(hit.x, hit.z) - 1)));
  var drop = 0;
  while (drop < K.ROPE_LEN && groundH(hit.x, hit.z) < hit.y - drop - 1.0) drop += 0.5;
  if (drop < 3) drop = Math.min(K.ROPE_LEN, 8);
  Coop.addRope(hit.x, hit.y, hit.z, drop);
  Net.send({ t: 'rope', x: hit.x, y: hit.y, z: hit.z, l: drop });
  HUD.toast('anchored — rope hanging ' + Math.round(drop) + ' m', '#8fe04a');
  FX.puff(o.x, o.y, o.z, 6, 0xdddddd);
  return true;
};

// ---- the helping hand: the main thing you do for each other -----------
Coop.handTarget = function () {
  var f = CAM.flatForward(_tmpA);
  var best = null, bd = K.HAND_REACH * K.HAND_REACH;
  for (var i = 0; i < Remote.list.length; i++) {
    var a = Remote.list[i];
    var dx = a.pos.x - P.pos.x, dy = a.pos.y - P.pos.y, dz = a.pos.z - P.pos.z;
    var d2 = dx * dx + dy * dy + dz * dz;
    if (d2 > bd) continue;
    var l = Math.sqrt(dx * dx + dz * dz) || 1;
    if ((dx / l) * f.x + (dz / l) * f.z < 0.25) continue;   // must be roughly in front
    bd = d2; best = a;
  }
  return best;
};

Coop.handTick = function (dt) {
  var empty = !P.inv[P.sel];
  var want = IN.hand() && empty && !HUD.blocked && P.state !== ST.OUT;
  P.handOutT = want ? Math.min(1, P.handOutT + dt * 6) : Math.max(0, P.handOutT - dt * 6);
  if (!want) { Coop.handHeld = null; return; }
  var tgt = Coop.handTarget();
  if (!tgt) return;
  // pull them in
  var dx = P.pos.x - tgt.pos.x, dy = P.pos.y + 0.4 - tgt.pos.y, dz = P.pos.z - tgt.pos.z;
  var d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  if (d < 1.4) return;
  Net.send({ t: 'pull', id: tgt.id, x: P.pos.x, y: P.pos.y + 0.5, z: P.pos.z });
  if (!Coop.handHeld) {
    Coop.handHeld = tgt.id;
    P.stats.saves++;
    HUD.toast('you grab ' + tgt.name, '#8fe04a');
  }
};

// ---- carrying and reviving -------------------------------------------
Coop.nearestDown = function (r) {
  var best = null, bd = r * r;
  for (var i = 0; i < Remote.list.length; i++) {
    var a = Remote.list[i];
    if (a.state !== ST.OUT || a.carriedBy) continue;
    var dx = a.pos.x - P.pos.x, dy = a.pos.y - P.pos.y, dz = a.pos.z - P.pos.z;
    var d = dx * dx + dy * dy + dz * dz;
    if (d < bd) { bd = d; best = a; }
  }
  return best;
};
Coop.pickUp = function (mate) {
  P.carrying = mate.id;
  mate.carriedBy = P.id;
  Survive.recalcMax();
  Net.send({ t: 'carry', id: mate.id });
  HUD.toast('you shoulder ' + mate.name, '#ffd646');
};
Coop.dropCarried = function () {
  if (!P.carrying) return;
  var a = Remote.byId(P.carrying);
  if (a) a.carriedBy = null;
  Net.send({ t: 'carry', id: null });
  P.carrying = null;
  Survive.recalcMax();
};
Coop.revive = function (mate) {
  if (P.fig && P.state !== ST.OUT) P.fig.standUp();
  Net.send({ t: 'rev', id: mate.id });
  P.stats.saves++;
  HUD.toast(mate.name + ' is back up', '#8fe04a');
  if (mate.carriedBy === P.id) { P.carrying = null; mate.carriedBy = null; Survive.recalcMax(); }
};

// ---- pings ------------------------------------------------------------
Coop.ping = function (danger) {
  var d = CAM.forward(new THREE.Vector3());
  var o = CAM.first ? CAM.pos : new THREE.Vector3(P.pos.x, P.pos.y + K.EYE, P.pos.z);
  var hit = { x: 0, y: 0, z: 0, d: 0, hit: false };
  T.ray(o.x, o.y, o.z, d.x, d.y, d.z, 240, 1.1, hit);
  Coop.addPing(hit.x, hit.y, hit.z, P.slot, danger, P.name);
  Net.send({ t: 'ping', x: hit.x, y: hit.y, z: hit.z, s: P.slot, d: danger ? 1 : 0, n: P.name });
};
Coop.addPing = function (x, y, z, slot, danger, who) {
  var m = new THREE.Mesh(Coop.chevGeo, new THREE.MeshBasicMaterial({
    color: danger ? 0xff4f43 : SLOT_COL[slot % 4], transparent: true, depthTest: false,
  }));
  m.position.set(x, y + 0.4, z);
  m.renderOrder = 5;
  Coop.group.add(m);
  Coop.pings.push({ mesh: m, t: 0, life: 14, x: x, y: y, z: z, danger: danger, who: who, slot: slot });
};

Coop.tick = function (dt, t) {
  Coop.handTick(dt);
  P.onPiton = (P.state === ST.CLIMB) ? Coop.pitonNear(P.pos.x, P.pos.y, P.pos.z) : null;

  for (var i = Coop.pings.length - 1; i >= 0; i--) {
    var p = Coop.pings[i];
    p.t += dt;
    p.mesh.position.y = p.y + 0.55 + Math.sin(t * 3.4) * 0.16;
    p.mesh.rotation.y += dt * 1.3;
    p.mesh.material.opacity = clamp((p.life - p.t) / 2.4, 0, 1) * 0.92;
    if (p.t > p.life) {
      Coop.group.remove(p.mesh);
      p.mesh.material.dispose();
      Coop.pings.splice(i, 1);
    }
  }
  if (!HUD.blocked && P.state !== ST.OUT) {
    if (IN.pingHeld()) Coop.pingHold += dt;
    else if (Coop.pingHold > 0) { Coop.ping(Coop.pingHold > 0.42); Coop.pingHold = 0; }
  } else Coop.pingHold = 0;
};
