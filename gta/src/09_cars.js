// ============================================================================
// NEON BAY · 09_cars.js — drivable vehicles: car physics, damage model, AI traffic, boats, police cruisers
// Concatenated in order by build.mjs into one module (shared scope, no cross-imports).
// ============================================================================
class Car {
  constructor(game, x, z, dir, color, aiTraffic, kind) {
    this.game = game; this.pos = new THREE.Vector3(x, 0, z); this.speed = 0; this.driver = null; this.ai = true; this.aiTraffic = !!aiTraffic; this.turnCd = 1.5; this.kind = kind || null; this.color = color; this.hp = 120; this.maxHp = 120;
    this.taxi = aiTraffic && !kind && (Math.random() < 0.22 || game._forceTaxi); if (this.taxi) { color = 0xffd23a; this.color = color; }
    this.maxSpd = kind === 'sports' ? 50 : kind === 'bike' ? 46 : kind === 'monster' ? 30 : kind === 'bus' ? 21 : 36;
    this.accel = kind === 'sports' ? 36 : kind === 'bike' ? 32 : kind === 'monster' ? 20 : kind === 'bus' ? 11 : 24;
    this.dir = Math.abs(dir.x) > Math.abs(dir.z) ? { x: Math.sign(dir.x) || 1, z: 0 } : { x: 0, z: Math.sign(dir.z) || 1 };
    this.yaw = Math.atan2(this.dir.x, this.dir.z);
    this.root = kind ? buildSpecial(kind, color) : buildCar(color); if (this.taxi) this.root.add(taxiSign()); this.root.add(makeBlob(kind === 'monster' ? 2.2 : 1.7)); this.root.position.copy(this.pos); game.scene.add(this.root);
    this._carLights();
    const dv = this.root.userData.driver; if (dv) dv.visible = this.aiTraffic && !this.jacked;
  }
  // headlight spill + taillight glow pooled on the wet asphalt (moves + turns with the car)
  _carLights() {
    this._spill = lightPool(6.5, 0xfff2d0, 0.55); this._spill.position.set(0, 0.05, -5.4); this._spill.scale.set(0.72, 1, 1.25); this.root.add(this._spill);
    this._rear = lightPool(3.0, 0xff2a1e, 0.5); this._rear.position.set(0, 0.05, 3.4); this.root.add(this._rear);
    if (this.parked) { this._spill.visible = false; this._rear.visible = false; } // parked cars sit dark
  }
  // ---- progressive damage: crumple panels, smoke, flames, degraded handling, then a fireball + husk ----
  damageCar(amt, at) {
    if (this.boat || this._boom || amt <= 0) return;
    this.maxHp = this.maxHp || 120; const before = this.hp == null ? this.maxHp : this.hp; this.hp = before - amt;
    const heavy = amt > 12;
    if (amt > 4) { this._dent(heavy); this.game.glassBits(this.pos.clone().setY(1.05), Math.min(9, 2 + (amt | 0) / 3)); }
    if (heavy && Math.random() < 0.7) this._shedPart();                      // a panel or wheel flies off in a big hit
    // the whole shell visibly sags and lists as it takes damage
    const w = 1 - clamp(this.hp / this.maxHp, 0, 1); if (this._tilt == null) this._tilt = rnd(-1, 1);
    this._sagY = -w * 0.14; this._sagZ = this._tilt * w * 0.06;
    if (this.hp < this.maxHp * 0.42 && !this.smoking) this.smoking = true;
    if (this.hp < this.maxHp * 0.16 && !this.burning) this.burning = true;
    if (this.hp <= 0 && !this._boom) { this.hp = 0; this._boom = true; this.game.explode(this.pos.clone().setY(1.0), 1.2, this.color); this.game.leaveWreck(this); this.removeMe = true; if (this.driver === this.game.player) { this.game.player.inCar = null; this.game.player.root.visible = true; this.game.camShake = 1.6; } }
  }
  _bodyPanels() { return this.root.children.filter(c => c.isMesh && c.geometry && c.geometry.type === 'BoxGeometry' && c !== this._spill && c !== this._rear); }
  _dent(heavy) {
    const kids = this._bodyPanels(); if (!kids.length) return;
    const nd = heavy ? 2 : 1; for (let i = 0; i < nd; i++) { const m = kids[(Math.random() * kids.length) | 0]; m.scale.x *= 0.86 + Math.random() * 0.06; m.scale.y *= 0.82 + Math.random() * 0.08; m.position.x += rnd(-0.09, 0.09); m.position.y -= rnd(0, 0.08); m.position.z += rnd(-0.06, 0.06); m.rotation.z += rnd(-0.12, 0.12); m.rotation.x += rnd(-0.06, 0.06); }
  }
  _shedPart() {
    const wheels = this.root.userData.wheels || [], kids = this._bodyPanels();
    let m = null; if (wheels.length && Math.random() < 0.5) { m = wheels[(Math.random() * wheels.length) | 0]; this.root.userData.wheels = wheels.filter(w => w !== m); }
    else if (kids.length > 3) m = kids[(Math.random() * kids.length) | 0];
    if (!m || m === this._spill || m === this._rear) return;
    const wp = new THREE.Vector3(); m.getWorldPosition(wp); this.root.remove(m); m.position.copy(wp); m.rotation.set(rnd(TAU), rnd(TAU), rnd(TAU)); this.game.scene.add(m);
    this.game.fx.push({ m, debris: true, vx: rnd(-5, 5), vy: rnd(3, 8), vz: rnd(-5, 5), sx: rnd(-7, 7), sy: rnd(-7, 7), sz2: rnd(-7, 7), life: 5 });
  }
  updateDamage(dt) {
    if (this.boat || this._boom) return;
    if (this.burning) { this.hp -= dt * 6; this._smkT = (this._smkT || 0) - dt; if (this._smkT <= 0) { this._smkT = 0.11; this.game.carPuff(this.pos.clone().add(new THREE.Vector3(rnd(-0.6, 0.6), 1.0, rnd(-1.2, -0.2))), true); } if (this.hp <= 0) this.damageCar(1); }
    else if (this.smoking) { this._smkT = (this._smkT || 0) - dt; if (this._smkT <= 0) { this._smkT = 0.36; this.game.carPuff(this.pos.clone().add(new THREE.Vector3(rnd(-0.4, 0.4), 0.9, -1.4)), false); } }
  }
  effMax() { return this.maxSpd * (0.55 + 0.45 * clamp((this.hp == null ? this.maxHp : this.hp) / (this.maxHp || 120), 0, 1)); } // handling falls off as the car breaks
  repaint(color) {
    this.color = color; this.game.scene.remove(this.root);
    this.root = this.kind ? buildSpecial(this.kind, color) : buildCar(color); if (this.taxi) this.root.add(taxiSign()); this.root.add(makeBlob(this.kind === 'monster' ? 2.2 : 1.7));
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; this.game.scene.add(this.root); this._carLights();
    const dv = this.root.userData.driver; if (dv) dv.visible = this.aiTraffic && !this.jacked && !this.driver;
  }
  control(dt, inp) {
    this._ramCd = Math.max(0, (this._ramCd || 0) - dt);
    const acc = (inp.k('KeyW') ? 1 : 0) - (inp.k('KeyS') ? 1 : 0), steer = (inp.k('KeyA') ? 1 : 0) - (inp.k('KeyD') ? 1 : 0);
    const hb = inp.k('Space'); // handbrake = drift
    this.speed += acc * this.accel * dt; this.speed *= (hb ? 0.986 : 0.992); this.speed = clamp(this.speed, -14, this.effMax());
    if (Math.abs(this.speed) > 0.5) this.yaw += steer * (hb ? 2.9 : this.kind === 'sports' ? 2.0 : 1.7) * dt * (this.speed > 0 ? 1 : -1);
    // grip model: velocity chases the nose; with the handbrake down it lags behind = sideways
    this.vx = this.vx || 0; this.vz = this.vz || 0;
    const hx = Math.sin(this.yaw) * this.speed, hz = Math.cos(this.yaw) * this.speed, k = Math.min(1, (hb ? 1.8 : 8.5) * dt);
    this.vx += (hx - this.vx) * k; this.vz += (hz - this.vz) * k;
    const nx = this.pos.x + this.vx * dt, nz = this.pos.z + this.vz * dt;
    let [cx2, cz2] = this.game.city.collide(nx, nz, 1.4);
    if (cx2 !== nx || cz2 !== nz) { const impF = Math.hypot(this.vx, this.vz); this.speed *= -0.2; this.vx *= -0.2; this.vz *= -0.2; if (impF > 5 && (this._wallCd || 0) <= 0) { this._wallCd = 0.4; this.game.impactFx(new THREE.Vector3(this.pos.x, 0.8, this.pos.z), impF); this.damageCar(impF * 0.85); } }
    this._wallCd = Math.max(0, (this._wallCd || 0) - dt);
    // fender-benders are real: your car shoves other cars, other cars stop you
    for (const o of this.game.cars) {
      if (o === this || o.boat) continue; const dx2 = cx2 - o.pos.x, dz2 = cz2 - o.pos.z, dd = Math.hypot(dx2, dz2);
      if (dd < 3.6 && dd > 0.01) {
        const push = (3.6 - dd), ux = dx2 / dd, uz = dz2 / dd;
        cx2 += ux * push * 0.6; cz2 += uz * push * 0.6;
        if (o.ai || o.aiTraffic) { o.pos.x -= ux * push * 0.4; o.pos.z -= uz * push * 0.4; o.speed *= 0.3; o.root.position.copy(o.pos); }
        const hit = Math.hypot(this.vx, this.vz);
        if (hit > 6 && (this._ramCd || 0) <= 0) { this._ramCd = 0.4; const hp = o.pos.clone().lerp(this.pos, 0.5).setY(0.8); this.game.impactFx(hp, hit); this.damageCar(hit * 0.6); if (o.damageCar) o.damageCar(hit * 0.9); if (o.fleeing) { o._rams = (o._rams || 0) + 1; if (o._rams >= 2 && !o._boom) { o._boom = true; o.fleeing = false; o.ai = false; o.speed = 0; o.cruise = 0; this.game.explode(o.pos.clone().setY(1.0), 1.15, o.color); o.removeMe = true; } } }
        this.speed *= 0.55; this.vx *= 0.45; this.vz *= 0.45;
      }
    }
    this.pos.x = cx2; this.pos.z = cz2; this.pos.y = this.game.city.groundH(this.pos.x, this.pos.z);
    for (const w of (this.root.userData.wheels || [])) w.rotation.x += Math.hypot(this.vx, this.vz) * Math.sign(this.speed || 1) * dt / 0.45;
    this.root.position.copy(this.pos); this.root.position.y += (this._sagY || 0); this.root.rotation.y = this.yaw;
    this.root.rotation.z = (hb ? clamp((this.vx * Math.cos(this.yaw) - this.vz * Math.sin(this.yaw)) * 0.012, -0.09, 0.09) : 0) + (this._sagZ || 0); // body lean in the slide + damage list
    this.game.knockNearby(this, Math.hypot(this.vx, this.vz)); // scatter street props you plough through
    // brake + reverse lights: taillight pool flares red (white in reverse)
    const braking = hb || (acc < 0 && this.speed > 0.5), reversing = this.speed < -0.5;
    if (this._rear) { this._rear.material.color.setHex(reversing ? 0xffffff : 0xff2a1e); this._rear.material.opacity = (braking || reversing) ? 0.95 : 0.5; this._rear.scale.setScalar((braking || reversing) ? 1.3 : 1.0); }
    // tyre skid streaks + screech while drifting or braking hard at speed
    const slip = Math.hypot(this.vx, this.vz);
    if ((hb || (acc < 0 && this.speed > 10)) && slip > 6) {
      this.game.sfxSkid(); this._skidT = (this._skidT || 0) - dt;
      if (this._skidT <= 0) { this._skidT = 0.045; const bx = this.pos.x - Math.sin(this.yaw) * 1.5, bz = this.pos.z - Math.cos(this.yaw) * 1.5, rx = Math.cos(this.yaw) * 0.7, rz = -Math.sin(this.yaw) * 0.7; this.game.skidMark(bx + rx, bz + rz, this.yaw); this.game.skidMark(bx - rx, bz - rz, this.yaw); }
    }
    const vmag = Math.hypot(this.vx, this.vz), rr = this.kind === 'monster' ? 3.4 : this.kind === 'bus' ? 3.8 : this.kind === 'bike' ? 1.5 : 2.4;
    if (vmag > 7) for (const n of this.game.npcs) { if (!n.dead && n.pos.distanceTo(this.pos) < rr) { n.damage(40); if (n.launch) n.launch(this.vx * 0.5, this.vz * 0.5); if (this.driver === this.game.player) this.game.camShake = Math.max(this.game.camShake || 0, 0.35); if (!n.cop) this.game.reportCrime(this.pos, 2, { quiet: true }); } }
  }
  // anchor the car onto the lane graph: nearest node + the outgoing edge best aligned with our heading
  _anchor() {
    const c = this.game.city, net = c.net, at = c.nearestNode(this.pos.x, this.pos.z), atN = net.nodes[at];
    let best = null, bs = -1e18; const hx = this.dir ? this.dir.x : Math.sin(this.yaw), hz = this.dir ? this.dir.z : Math.cos(this.yaw);
    for (const eid of atN.edges) { const e = net.edges[eid], o = e.a === at ? e.b : e.a, d = net.nodes[o].position.clone().sub(atN.position), dl = d.length() || 1, s = (d.x / dl) * hx + (d.z / dl) * hz + Math.random() * 0.3; if (s > bs) { bs = s; best = o; } }
    if (best == null) best = at;
    this.fromN = at; this.toN = best; this.edgeId = c.edgeBetween(at, best); this.edgeClass = this.edgeId != null ? net.edges[this.edgeId].class : 'collector'; this.along = null;
  }
  update(dt) {
    this.updateDamage(dt);
    if (this.driver) { this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; return; }
    if (!this.ai) { if (this.pos.distanceTo(this.game.player.pos) > 260) this.removeMe = true; return; } // parked/stolen cars stay put
    const g = this.game, c = g.city, p = g.player, net = c.net;
    if (this.pos.distanceTo(p.pos) > 185) { g.scene.remove(this.root); g.cars = g.cars.filter(x => x !== this); g.spawnTraffic(); return; }
    if (this.toN == null || !net.nodes[this.toN] || !net.nodes[this.fromN]) this._anchor();
    let from = net.nodes[this.fromN], to = net.nodes[this.toN];
    if (!from || !to) { this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; return; }
    let seg = to.position.clone().sub(from.position), segLen = Math.max(0.001, seg.length()), fwd = seg.clone().multiplyScalar(1 / segLen);
    if (this.along == null) this.along = clamp(this.pos.clone().sub(from.position).dot(fwd), 0, segLen);
    this.dir = { x: fwd.x, z: fwd.z };
    const remain = segLen - this.along;
    // defensive driving: scan ahead (further at speed) and brake to a queue for cars, walkers, wrecks
    const scan = 8 + this.speed * 0.6; let blocked = false, nearGap = 99;
    for (const o of g.cars) { if (o === this || o.boat) continue; const ahead = (o.pos.x - this.pos.x) * this.dir.x + (o.pos.z - this.pos.z) * this.dir.z, lat = Math.abs((o.pos.x - this.pos.x) * this.dir.z - (o.pos.z - this.pos.z) * this.dir.x); if (ahead > 0 && lat < 2.6 && ahead < scan) { blocked = true; nearGap = Math.min(nearGap, ahead); } }
    let blockedByPlayer = false;
    { const ahead = (p.pos.x - this.pos.x) * this.dir.x + (p.pos.z - this.pos.z) * this.dir.z, lat = Math.abs((p.pos.x - this.pos.x) * this.dir.z - (p.pos.z - this.pos.z) * this.dir.x); if (ahead > 0 && lat < 2.4 && ahead < scan + (p.inCar ? 2 : 0)) { blocked = true; nearGap = Math.min(nearGap, ahead); blockedByPlayer = true; } }
    for (const n of g.npcs) { if (n.dead || n.knockT > 0) continue; const ahead = (n.pos.x - this.pos.x) * this.dir.x + (n.pos.z - this.pos.z) * this.dir.z, lat = Math.abs((n.pos.x - this.pos.x) * this.dir.z - (n.pos.z - this.pos.z) * this.dir.x); if (ahead > 0 && lat < 1.8 && ahead < scan) { blocked = true; nearGap = Math.min(nearGap, ahead); } }
    // stop for a red light at the intersection we're approaching
    if (!this.fleeing && to.signal && remain < 11) { const grp = to.sigGroup ? to.sigGroup.get(this.edgeId) : 0, red = grp === 0 ? g.trafficRedA : g.trafficRedB; if (red) { const stop = remain - 3.5; if (stop < 7) { blocked = true; nearGap = Math.min(nearGap, Math.max(0, stop)); } } }
    this.speed = lerp(this.speed, blocked ? 0 : (this.cruise || 13), dt * (blocked ? 9 : 2));
    if (blocked && nearGap < 6) this.speed = 0; // hard stop before the bumper ahead — never overlap
    this.root.rotation.x = clamp(((this._lastSpd || 0) - this.speed) * 0.05, -0.05, 0.09); // nose dips under braking
    if (this._rear) { const slowing = blocked || this.speed < (this._lastSpd || 0) - 0.04; this._rear.material.color.setHex(0xff2a1e); this._rear.material.opacity = slowing ? 0.9 : 0.5; this._rear.scale.setScalar(slowing ? 1.25 : 1.0); }
    this._lastSpd = this.speed;
    // impatient honking when the player is holding up traffic
    if (blockedByPlayer) { this._honkT = (this._honkT || 0) + dt; if (this._honkT > 1.4 && this.pos.distanceTo(p.pos) < 40) { this._honkT = -rnd(1.5, 3.5); this.game.sfxHorn(); } } else this._honkT = 0;
    for (const w of (this.root.userData.wheels || [])) w.rotation.x += this.speed * dt / 0.45;
    if (this.speed < 0.4 && blocked) { this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; return; } // sitting in the queue
    // advance authoritative progress along the edge, hopping nodes as we reach them
    this.along += this.speed * dt;
    let guard = 0;
    while (this.along >= segLen && guard++ < 4) {
      const carry = this.along - segLen, prev = this.fromN; this.fromN = this.toN;
      const scorer = this.fleeing ? (nd => nd.position.distanceTo(p.pos)) : null;    // flee = pick the exit that widens the gap
      this.toN = c.pickNext(prev, this.fromN, scorer); this.edgeId = c.edgeBetween(this.fromN, this.toN); this.edgeClass = this.edgeId != null ? net.edges[this.edgeId].class : 'collector';
      from = net.nodes[this.fromN]; to = net.nodes[this.toN]; if (!from || !to) { this._anchor(); return; }
      seg = to.position.clone().sub(from.position); segLen = Math.max(0.001, seg.length()); fwd = seg.clone().multiplyScalar(1 / segLen); this.along = carry; this.dir = { x: fwd.x, z: fwd.z };
    }
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x), lane = Math.max(1.6, ROAD_CLASS[this.edgeClass || 'collector'].width * 0.22);
    const center = from.position.clone().addScaledVector(fwd, clamp(this.along, 0, segLen)).addScaledVector(right, lane);
    this.pos.x = lerp(this.pos.x, center.x, Math.min(1, dt * 9)); this.pos.z = lerp(this.pos.z, center.z, Math.min(1, dt * 9)); this.pos.y = c.groundH(this.pos.x, this.pos.z);
    this.yaw = lerpAngle(this.yaw, Math.atan2(fwd.x, fwd.z), Math.min(1, dt * 6));
    this.root.position.copy(this.pos); this.root.position.y += (this._sagY || 0); this.root.rotation.y = this.yaw; this.root.rotation.z = (this._sagZ || 0);
  }
  _move(dt) { const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw); let nx = this.pos.x + fx * this.speed * dt, nz = this.pos.z + fz * this.speed * dt; const [cx, cz] = this.game.city.collide(nx, nz, 1.4); if (cx !== nx || cz !== nz) this.speed *= -0.2; this.pos.x = cx; this.pos.z = cz; this.pos.y = this.game.city.groundH(this.pos.x, this.pos.z); this.root.position.copy(this.pos); this.root.position.y += (this._sagY || 0); this.root.rotation.y = this.yaw; }
}

// ---------------------------------------------------------------------------
// Boat — drivable on the bay and the ocean (F to board, even mid-swim).
// ---------------------------------------------------------------------------
function buildBoat(color) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 6.2), mat(color)); hull.position.y = 0.45; hull.castShadow = true; g.add(hull);
  const bow = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1.35, 2.2, 4), mat(color)); bow.rotation.x = -Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.position.set(0, 0.45, -4.1); g.add(bow);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 3.4), mat(0xe8dcc0)); deck.position.set(0, 0.95, 0.6); g.add(deck);
  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 0.5), mat(0xffffff)); dash.position.set(0, 1.25, -1.2); g.add(dash);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.08), mat(0x0e1826)); glass.position.set(0, 1.7, -1.35); glass.rotation.x = -0.3; g.add(glass);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.9), mat(0xc0392b)); seat.position.set(0, 1.1, 0.6); g.add(seat);
  const motor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.6), mat(0x22262e)); motor.position.set(0, 0.9, 3.2); g.add(motor);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.16, 5.4), mat(0xffffff)); stripe.position.set(0, 0.72, 0.2); g.add(stripe);
  return g;
}
class Boat {
  constructor(game, x, z, color) {
    this.game = game; this.pos = new THREE.Vector3(x, 0, z); this.yaw = rnd(TAU); this.speed = 0; this.driver = null; this.ai = false; this.boat = true; this.aiTraffic = false;
    this.root = buildBoat(color || pick([0xf0f0f4, 0x2f6fd4, 0xd23b3b, 0x18b0b0])); this.root.position.copy(this.pos); game.scene.add(this.root);
  }
  control(dt, inp) {
    const acc = (inp.k('KeyW') ? 1 : 0) - (inp.k('KeyS') ? 1 : 0), steer = (inp.k('KeyA') ? 1 : 0) - (inp.k('KeyD') ? 1 : 0);
    this.speed += acc * 14 * dt; this.speed *= 0.99; this.speed = clamp(this.speed, -8, 26);
    if (Math.abs(this.speed) > 0.4) this.yaw += steer * 1.15 * dt * (this.speed > 0 ? 1 : -1);
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), nx = this.pos.x + fx * this.speed * dt, nz = this.pos.z + fz * this.speed * dt;
    const c = this.game.city, ok = c.inBay(nx, nz) || c.isWater(nx, nz); // bay, coasts and open ocean are all navigable
    if (ok) { this.pos.x = nx; this.pos.z = nz; } else this.speed *= -0.25;
    this._sync();
  }
  update(dt) { this._sync(); }
  _sync() { const t = this.game.time; this.root.position.set(this.pos.x, 0.06 + Math.sin(t * 1.7 + this.pos.x) * 0.05, this.pos.z); this.root.rotation.y = this.yaw; this.root.rotation.x = Math.sin(t * 1.4) * 0.02; }
}

// ---------------------------------------------------------------------------
// Police cruiser — dispatched at 3+ stars; sirens flashing, rams your bumper.
// ---------------------------------------------------------------------------
class PoliceCar extends Car {
  constructor(game, x, z) {
    super(game, x, z, new THREE.Vector3(0, 0, 1), 0xf0f0f4, false);
    this.police = true; this.copCd = 0; this.assessT = 1.6 + Math.random() * 1.4; this.assessing = true; this.repathT = 0; this.path = null;
    const dv = this.root.userData.driver; if (dv) { dv.visible = true; dv.children[0].material = mat(0x21407a); dv.children[2].material = mat(0x11203f); dv.children[3].material = mat(0x21407a); } // uniformed officer at the wheel
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.2, 1.6), mat(0x14161b)); hood.position.set(0, 0.87, -1.5); this.root.add(hood);
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 1.4), mat(0x14161b)); doorL.position.set(-1.02, 0.66, -0.1); this.root.add(doorL);
    const doorR = doorL.clone(); doorR.position.x = 1.02; this.root.add(doorR);
    this.lightR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.34), mat(0xff2a3a, { emissive: 0xff2030, emissiveIntensity: 2.5 })); this.lightR.position.set(-0.25, 1.62, -0.15); this.root.add(this.lightR);
    this.lightB = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.34), mat(0x2a6aff, { emissive: 0x2050ff, emissiveIntensity: 2.5 })); this.lightB.position.set(0.25, 1.62, -0.15); this.root.add(this.lightB);
  }
  update(dt) {
    if (this.driver) { this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; return; }
    const g = this.game, p = g.player, t = g.time;
    this.lightR.material.emissiveIntensity = Math.sin(t * 14) > 0 ? 3.2 : 0.2;
    this.lightB.material.emissiveIntensity = Math.sin(t * 14) > 0 ? 0.2 : 3.2;
    // despawn only when far AND out of view — ease out, never blink away in front of the player
    if (p.wanted <= 0 || (this.pos.distanceTo(p.pos) > 200 && !g._frustum.containsPoint(this.pos))) { this.removeMe = true; this.root.visible = false; return; }
    const c = g.city, net = c.net, dist = this.pos.distanceTo(p.pos);
    this.assessT = Math.max(0, (this.assessT || 0) - dt); this.assessing = this.assessT > 0; // a beat to size you up before the chase
    if (dist < 22 && !this.assessing) {
      // close quarters — steer onto the player at a measured pace (ramming is slower and rarer now)
      this.yaw = lerpAngle(this.yaw, Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z), Math.min(1, dt * 3.0));
      this.speed = lerp(this.speed, dist > 10 ? 11 : 4, dt * 2); this._move(dt); this.along = null; this.toN = null;
    } else {
      // A* pursuit along the lane graph toward the player's road node
      if (this.toN == null || !net.nodes[this.toN] || !net.nodes[this.fromN]) this._anchor();
      this.repathT = (this.repathT || 0) - dt;
      if (this.repathT <= 0) { this.repathT = 1.2; this.path = c.pathfind(this.fromN, c.nearestNode(p.pos.x, p.pos.z), 1500); }
      let from = net.nodes[this.fromN], to = net.nodes[this.toN];
      if (!from || !to) { this._anchor(); return; }
      let seg = to.position.clone().sub(from.position), segLen = Math.max(0.001, seg.length()), fwd = seg.clone().multiplyScalar(1 / segLen);
      if (this.along == null) this.along = clamp(this.pos.clone().sub(from.position).dot(fwd), 0, segLen);
      this.speed = lerp(this.speed, this.assessing ? 8 : 13, dt * 2); this.along += this.speed * dt;
      let guard = 0;
      while (this.along >= segLen && guard++ < 4) { const carry = this.along - segLen, prev = this.fromN; this.fromN = this.toN; this.toN = this._pathNext(prev, this.fromN); this.edgeId = c.edgeBetween(this.fromN, this.toN); from = net.nodes[this.fromN]; to = net.nodes[this.toN]; if (!from || !to) { this._anchor(); return; } seg = to.position.clone().sub(from.position); segLen = Math.max(0.001, seg.length()); fwd = seg.clone().multiplyScalar(1 / segLen); this.along = carry; }
      const right = new THREE.Vector3(fwd.z, 0, -fwd.x), center = from.position.clone().addScaledVector(fwd, clamp(this.along, 0, segLen)).addScaledVector(right, 2.2);
      this.pos.x = lerp(this.pos.x, center.x, Math.min(1, dt * 9)); this.pos.z = lerp(this.pos.z, center.z, Math.min(1, dt * 9)); this.pos.y = c.groundH(this.pos.x, this.pos.z);
      this.yaw = lerpAngle(this.yaw, Math.atan2(fwd.x, fwd.z), Math.min(1, dt * 5));
      this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
      for (const w of (this.root.userData.wheels || [])) w.rotation.x += this.speed * dt / 0.45;
    }
    this.copCd = Math.max(0, this.copCd - dt);
    // officers only pile out when the cruiser has basically stopped beside you — no ped teleporting
    if (dist < 10 && this.speed < 5 && this.copCd <= 0) { this.copCd = 14; let cops = 0; for (const n of g.npcs) if (n.cop && !n.dead) cops++; if (cops < 5) g.npcs.push(new Ped(g, this.pos.x + rnd(-2, 2), this.pos.z + rnd(-2, 2), true)); }
  }
  // next node toward the player: follow the A* path if it still holds our node, else greedily close the gap
  _pathNext(prev, atId) {
    const c = this.game.city;
    if (this.path && this.path.length) { const idx = this.path.indexOf(atId); if (idx >= 0 && idx + 1 < this.path.length) return this.path[idx + 1]; }
    const p = this.game.player; return c.pickNext(prev, atId, nd => -nd.position.distanceTo(p.pos));
  }
}

// ---------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------
