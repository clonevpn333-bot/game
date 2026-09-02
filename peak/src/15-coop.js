// ============================================================ CO-OP
var Coop = {
  pitons: [], anchors: [], pings: [], group: null,
  ropeLines: [], pitonGeo: null, chevGeo: null, dangerGeo: null,
  pingHold: 0,
};

Coop.init = function () {
  Coop.group = new THREE.Group();
  Coop.pitonGeo = mergeParts([
    { g: new THREE.CylinderGeometry(0.055, 0.03, 0.6, 5), c: 0xc9d2da, p: [0, 0, 0.18], r: [Math.PI / 2, 0, 0] },
    { g: new THREE.TorusGeometry(0.14, 0.04, 4, 8), c: 0xffd646, p: [0, 0, 0.44] },
  ]);
  Coop.chevGeo = mergeParts([
    { g: new THREE.ConeGeometry(0.42, 0.7, 4), c: 0xffffff, p: [0, 0.5, 0], r: [Math.PI, 0, 0] },
    { g: new THREE.TorusGeometry(0.5, 0.06, 4, 12), c: 0xffffff, p: [0, 0.06, 0], r: [Math.PI / 2, 0, 0] },
  ]);
  Coop.dangerGeo = mergeParts([
    { g: new THREE.BoxGeometry(0.9, 0.14, 0.14), c: 0xffffff, p: [0, 0.6, 0], r: [0, 0, 0.78] },
    { g: new THREE.BoxGeometry(0.9, 0.14, 0.14), c: 0xffffff, p: [0, 0.6, 0], r: [0, 0, -0.78] },
    { g: new THREE.TorusGeometry(0.5, 0.06, 4, 12), c: 0xffffff, p: [0, 0.06, 0], r: [Math.PI / 2, 0, 0] },
  ]);
  Coop.anchorGeo = mergeParts([
    { g: new THREE.CylinderGeometry(0.09, 0.13, 0.7, 6), c: 0xb9c0c8, p: [0, 0.35, 0] },
    { g: new THREE.TorusGeometry(0.19, 0.05, 5, 10), c: 0xd9b06a, p: [0, 0.72, 0], r: [Math.PI / 2, 0, 0] },
  ]);
  return Coop.group;
};

// ---- pitons: a hammered-in place to breathe ---------------------------
Coop.placePiton = function (x, y, z, nx, nz, quiet) {
  var m = new THREE.Mesh(Coop.pitonGeo, MAT.solid);
  m.position.set(x, y, z);
  m.rotation.y = Math.atan2(nx, nz);
  Coop.group.add(m);
  Coop.pitons.push({ x: x, y: y, z: z, mesh: m });
  if (!quiet) Net.send({ t: 'pit', x: x, y: y, z: z, nx: nx, nz: nz });
};

// ---- rope -------------------------------------------------------------
Coop.plantAnchor = function () {
  if (P.state === ST.AIR) { HUD.toast('you need a foot on something', '#a8a39a'); return; }
  var slot = Survive.findSlot('rope');
  if (slot < 0) {
    // picking your own anchor back up
    var a = Coop.anchorNear(P.pos.x, P.pos.y, P.pos.z, 2.6);
    if (a && a.owner === P.id) {
      Coop.removeAnchor(a.id);
      Net.send({ t: 'unrope', id: a.id });
      Survive.add('rope');
      HUD.toast('rope coiled back up', '#8fe04a');
    } else HUD.toast('no rope in your pack', '#a8a39a');
    return;
  }
  Survive.remove(slot);
  var id = P.id + ':' + ((Math.random() * 1e6) | 0);
  Coop.addAnchor({ id: id, owner: P.id, x: P.pos.x, y: P.pos.y, z: P.pos.z, slot: P.slot });
  Net.send({ t: 'rope', id: id, x: P.pos.x, y: P.pos.y, z: P.pos.z, slot: P.slot, owner: P.id });
  HUD.toast('rope anchored — it catches anyone within ' + Math.round(K.ROPE_LEN) + ' m', '#8fe04a');
};

Coop.addAnchor = function (a) {
  var m = new THREE.Mesh(Coop.anchorGeo, MAT.solid);
  m.position.set(a.x, a.y, a.z);
  Coop.group.add(m);
  a.mesh = m;
  a.line = Coop.makeLine(SLOT_COL[a.slot % 4]);
  Coop.group.add(a.line);
  Coop.anchors.push(a);
};
Coop.removeAnchor = function (id) {
  for (var i = 0; i < Coop.anchors.length; i++) {
    if (Coop.anchors[i].id === id) {
      if (P.tether === Coop.anchors[i]) P.tether = null;
      Coop.group.remove(Coop.anchors[i].mesh);
      Coop.group.remove(Coop.anchors[i].line);
      Coop.anchors.splice(i, 1);
      return;
    }
  }
};
Coop.anchorNear = function (x, y, z, r) {
  for (var i = 0; i < Coop.anchors.length; i++) {
    var a = Coop.anchors[i], dx = a.x - x, dy = a.y - y, dz = a.z - z;
    if (dx * dx + dy * dy + dz * dz < r * r) return a;
  }
  return null;
};

Coop.makeLine = function (col) {
  var g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 13), 3));
  return new THREE.Line(g, new THREE.LineBasicMaterial({ color: col }));
};

// find the anchor this player is roped to: nearest one within reach
Coop.tetherFor = function (x, y, z) {
  var best = null, bd = K.ROPE_LEN * K.ROPE_LEN;
  for (var i = 0; i < Coop.anchors.length; i++) {
    var a = Coop.anchors[i], dx = a.x - x, dy = a.y - y, dz = a.z - z;
    var d = dx * dx + dy * dy + dz * dz;
    if (d < bd) { bd = d; best = a; }
  }
  return best;
};

Coop.ropeTick = function (dt) {
  var a = P.tether;
  // Let go of an anchor that is no longer plausibly on the same rope - after
  // a respawn or a long fall past the end of it - or the line will haul the
  // climber back across the mountain.
  if (a) {
    var ax = P.pos.x - a.x, ay = P.pos.y - a.y, az = P.pos.z - a.z;
    if (ax * ax + ay * ay + az * az > K.ROPE_LEN * K.ROPE_LEN * 2.2) a = P.tether = null;
  }
  // stay roped once caught, otherwise re-evaluate while on the wall/ground
  if (!a || P.state !== ST.AIR) P.tether = Coop.tetherFor(P.pos.x, P.pos.y, P.pos.z);
  a = P.tether;
  if (a && P.state === ST.AIR) {
    var dx = P.pos.x - a.x, dy = P.pos.y - a.y, dz = P.pos.z - a.z;
    var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > K.ROPE_LEN) {
      var k = K.ROPE_LEN / d;
      P.pos.x = a.x + dx * k; P.pos.y = a.y + dy * k; P.pos.z = a.z + dz * k;
      // kill the outward component, keep some swing
      var nx = dx / d, ny = dy / d, nz = dz / d;
      var vn = P.vel.x * nx + P.vel.y * ny + P.vel.z * nz;
      if (vn > 0) {
        P.vel.x -= nx * vn; P.vel.y -= ny * vn; P.vel.z -= nz * vn;
        P.vel.multiplyScalar(0.55);
        if (!P.ropeCaught) {
          P.ropeCaught = true;
          HUD.toast('the rope catches you', '#31c6c0');
          CAM.kick(0.4);
          P.fallFrom = P.pos.y + 2.4;   // the rope ate the rest of the drop
          Survive.hurt(6, 'the rope');
        }
      }
    }
  } else P.ropeCaught = false;

  // draw every rope with a bit of sag
  for (var i = 0; i < Coop.anchors.length; i++) {
    var an = Coop.anchors[i];
    var tgt = null;
    if (an.owner === P.id && P.tether === an) tgt = P.pos;
    else {
      for (var j = 0; j < Remote.list.length; j++) {
        var rp = Remote.list[j];
        if (rp.id === an.owner) {
          var ddx = rp.pos.x - an.x, ddy = rp.pos.y - an.y, ddz = rp.pos.z - an.z;
          if (ddx * ddx + ddy * ddy + ddz * ddz < K.ROPE_LEN * K.ROPE_LEN * 1.1) tgt = rp.pos;
          break;
        }
      }
      if (!tgt && an.owner === P.id) tgt = P.pos;
    }
    an.line.visible = !!tgt;
    if (!tgt) continue;
    var arr = an.line.geometry.attributes.position.array;
    var len = Math.sqrt(Math.pow(tgt.x - an.x, 2) + Math.pow(tgt.y - an.y, 2) + Math.pow(tgt.z - an.z, 2));
    var sag = clamp((K.ROPE_LEN - len) * 0.18, 0, 1.6);
    for (var s = 0; s <= 12; s++) {
      var u = s / 12;
      arr[s * 3] = lerp(an.x, tgt.x, u);
      arr[s * 3 + 1] = lerp(an.y + 0.7, tgt.y + 1.0, u) - Math.sin(u * Math.PI) * sag;
      arr[s * 3 + 2] = lerp(an.z, tgt.z, u);
    }
    an.line.geometry.attributes.position.needsUpdate = true;
    an.line.geometry.computeBoundingSphere();
  }
};

// ---- carrying and reviving -------------------------------------------
Coop.nearestDown = function (r) {
  var best = null, bd = r * r;
  for (var i = 0; i < Remote.list.length; i++) {
    var a = Remote.list[i];
    if (a.state !== ST.DOWN || a.carriedBy) continue;
    var dx = a.pos.x - P.pos.x, dy = a.pos.y - P.pos.y, dz = a.pos.z - P.pos.z;
    var d = dx * dx + dy * dy + dz * dz;
    if (d < bd) { bd = d; best = a; }
  }
  return best;
};

Coop.pickUp = function (mate) {
  P.carrying = mate.id;
  mate.carriedBy = P.id;
  Net.send({ t: 'carry', id: mate.id });
  HUD.toast('you shoulder ' + mate.name + ' — heavy going now', '#ffd646');
};
Coop.dropCarried = function () {
  if (!P.carrying) return;
  var a = Remote.byId(P.carrying);
  if (a) a.carriedBy = null;
  Net.send({ t: 'carry', id: null });
  P.carrying = null;
};
Coop.revive = function (mate) {
  Net.send({ t: 'rev', id: mate.id });
  P.stats.revives++;
  HUD.toast('you get ' + mate.name + ' back on their feet', '#8fe04a');
  if (mate.carriedBy === P.id) { P.carrying = null; mate.carriedBy = null; }
};

// ---- passing gear -----------------------------------------------------
Coop.passItem = function () {
  var s = P.inv[P.sel];
  if (!s) { HUD.toast('nothing selected', '#a8a39a'); return; }
  var best = null, bd = 100;
  for (var i = 0; i < Remote.list.length; i++) {
    var a = Remote.list[i];
    var dx = a.pos.x - P.pos.x, dy = a.pos.y - P.pos.y, dz = a.pos.z - P.pos.z;
    var d = dx * dx + dy * dy + dz * dz;
    if (d < bd) { bd = d; best = a; }
  }
  if (!best) { HUD.toast('nobody close enough', '#a8a39a'); return; }
  var kind = Survive.remove(P.sel);
  var from = new THREE.Vector3(P.pos.x, P.pos.y + 1.2, P.pos.z);
  var to = new THREE.Vector3(best.pos.x, best.pos.y + 1.2, best.pos.z);
  WI.toss(kind, from, to, null);
  Net.send({ t: 'give', k: kind, to: best.id, fx: from.x, fy: from.y, fz: from.z });
  HUD.toast('tossed ' + ITEM[kind].nm + ' to ' + best.name, '#8fe04a');
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
  var m = new THREE.Mesh(danger ? Coop.dangerGeo : Coop.chevGeo,
    new THREE.MeshBasicMaterial({ color: danger ? 0xff4f43 : SLOT_COL[slot % 4], transparent: true, depthTest: false }));
  m.position.set(x, y + 0.4, z);
  m.renderOrder = 5;
  Coop.group.add(m);
  Coop.pings.push({ mesh: m, t: 0, life: 15, x: x, y: y, z: z, danger: danger, who: who, slot: slot });
};

Coop.tick = function (dt, t) {
  Coop.ropeTick(dt);
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
  if (!HUD.blocked) {
    if (IN.pingHeld()) Coop.pingHold += dt;
    else if (Coop.pingHold > 0) { Coop.ping(Coop.pingHold > 0.42); Coop.pingHold = 0; }
  } else Coop.pingHold = 0;
  if (IN.rope() && !HUD.blocked) Coop.plantAnchor();
  if (IN.brace() && !HUD.blocked && P.state === ST.GROUND) {
    P.brace = !P.brace;
    if (P.brace) HUD.toast('braced — a mate can climb your shoulders', '#31c6c0');
  }
  if (P.brace && P.state !== ST.GROUND) P.brace = false;
};
