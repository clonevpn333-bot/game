// ============================================================================
// NEON BAY · 08_player.js — the player: movement, combat, emotes, camera rig, fatigue
// Concatenated in order by build.mjs into one module (shared scope, no cross-imports).
// ============================================================================
class Player {
  constructor(game) {
    this.game = game; this.pos = new THREE.Vector3(0, 0, 0); this.yaw = 0; this.vy = 0; this.onGround = true;
    this.camYaw = 0; this.camPitch = 0.22; this.camDist = 6.5; this.camMode = 'tps'; // tps | shoulder | fps
    this.health = 100; this.maxHealth = 100; this.money = 200; this.wanted = 0; this.heat = 0; this.fatigue = 0;
    this.spouse = null; this.kids = []; this.dating = null; // your life
    this.inCar = null; this.regen = 0; this.dead = false; this.hasGun = false; this.weapon = 'fists'; this.gunCd = 0; this.punchT = 0; this.shootT = 0; this.jackT = 0; this.jackCar = null; this.tazedT = 0; this.gunOutT = 0; this.cuffT = 0;
    this.root = new THREE.Group(); this.root.add(makeBlob(0.55)); game.scene.add(this.root); this.root.visible = false; this._build();
  }
  _build() { const f = buildPerson({ shirt: PLAYER_PURPLE, skin: 0xecbd90, hair: 0x201810, pants: 0x1f2530, style: 'mop', noScale: true }); this.fig = f; this.root.add(f.group); this.gun = buildPistol(); this.gun.position.set(0.02, -0.3, 0.06); this.gun.visible = false; f.j.foreR.add(this.gun); }
  spawn() { const s = this.spawnPos || { x: 30, z: 30 }; this.pos.set(s.x, 0, s.z); this.camYaw = 0; this.root.position.copy(this.pos); }
  enterCar(car) { this.inCar = car; car.driver = this; car.ai = false; this.root.visible = false; const dv = car.root.userData && car.root.userData.driver; if (dv) dv.visible = false; }
  exitCar() { const car = this.inCar; if (!car) return; this.inCar = null; car.driver = null; car.ai = false; car.speed = 0; this.root.visible = true; this.pos.set(car.pos.x + 2.4, 0, car.pos.z); this.vy = 0; } // stolen cars STAY parked
  startJack(car) {
    // cinematic carjack: stop the car, yank the driver out cold, then take the wheel
    car.ai = false; car.speed = 0; this.jackT = 1.15; this.jackCar = car;
    const a = car.yaw + Math.PI / 2, dx = Math.sin(a) * 1.6, dz = Math.cos(a) * 1.6;
    this.pos.set(car.pos.x + dx, 0, car.pos.z + dz); this.root.position.copy(this.pos);
    this.yaw = Math.atan2(car.pos.x - this.pos.x, car.pos.z - this.pos.z);
    if (car.aiTraffic && !car.jacked) {
      car.jacked = true;
      const dvv = car.root.userData.driver; if (dvv) dvv.visible = false; // out of the seat...
      // ...and into your hands: the driver is hauled from behind the wheel to the asphalt
      const sy = car.yaw, seatX = car.pos.x + 0.45 * Math.cos(sy) - 0.5 * Math.sin(sy), seatZ = car.pos.z - 0.45 * Math.sin(sy) - 0.5 * Math.cos(sy);
      const owner = new Ped(this.game, seatX, seatZ); owner.story = true;
      owner.dragT = 0.62; owner.dragFrom = { x: seatX, z: seatZ }; owner.dragTo = { x: car.pos.x + dx * 2.0, z: car.pos.z + dz * 2.0 };
      owner.knockT = 3.2; owner.angryT = 4; owner.yaw = this.yaw + Math.PI; this.game.npcs.push(owner);
      setTimeout(() => { owner.story = false; }, 12000);
      this.game.ui.toast('"HEY! That\'s my car!"');
      this.game.reportCrime(car.pos, 1, { quiet: false }); // only matters if someone SAW you
    }
  }
  eye() { return new THREE.Vector3(this.pos.x, this.pos.y + 1.5, this.pos.z); }
  update(dt) {
    const inp = this.game.input;
    this.camYaw -= inp.mdx * 0.0024; this.camPitch = clamp(this.camPitch + inp.mdy * 0.0024, -0.2, 1.2); this.camDist = clamp(this.camDist + inp.wheel * 0.8, 4, 13);
    this.gunOutT = Math.max(0, (this.gunOutT || 0) - dt);
    // cuffed: kneel, hands behind your back, then the cell
    if (this.cuffT > 0) {
      this.cuffT -= dt; this.fig.update(dt, { state: 'cuffed' }); this.root.position.copy(this.pos);
      if (this.cuffT <= 0) this.game.goToJail(this.game._arrestWhy || 'Booked at Bay County');
      this._stats(dt); return;
    }
    // tazed: you drop twitching, then wake up in a cell
    if (this.tazedT > 0) {
      this.tazedT -= dt; this.fig.update(dt, { state: 'knockout' }); this.root.position.copy(this.pos);
      if (this.tazedT <= 0) this.game.goToJail('Tazed while reaching for a weapon');
      this._stats(dt); return;
    }
    // carjack animation in progress: locked in the yank until it lands
    if (this.jackT > 0) {
      this.jackT -= dt; this.fig.update(dt, { state: 'yank' }); this.root.rotation.y = this.yaw;
      if (this.jackT <= 0 && this.jackCar) { this.enterCar(this.jackCar); this.jackCar = null; }
      this._stats(dt); return;
    }
    if (inp.p('KeyF')) { if (this.inCar) this.exitCar(); else { const car = this.game.nearestCar(this.pos, 4.5); if (car) { if (car.aiTraffic && !car.jacked && !car.boat) this.startJack(car); else this.enterCar(car); } } }
    if (inp.p('Digit1')) { this.weapon = 'fists'; this.game.ui.toast('Fists'); }
    if (inp.p('Digit2') && this.hasGun) { this.weapon = 'pistol'; this.gunOutT = 4; this.game.ui.toast('Pistol'); }
    // emotes (on foot, 3-7): wave · dance · cheer · point · sit — any movement cancels
    if (!this.inCar) {
      if (inp.p('Digit3')) { this.emote = { s: 'wave', t: 2.6 }; this.game.ui.toast('👋 Wave'); }
      if (inp.p('Digit4')) { this.emote = { s: 'dance', t: 6 }; this.game.ui.toast('🕺 Dance'); }
      if (inp.p('Digit5')) { this.emote = { s: 'cheer', t: 2.6 }; this.game.ui.toast('🙌 Cheer'); }
      if (inp.p('Digit6')) { this.emote = { s: 'point', t: 2.2 }; this.game.ui.toast('👉 Point'); }
      if (inp.p('Digit7')) { this.emote = { s: 'sit', t: 12 }; this.game.ui.toast('🪑 Sit (move to stand)'); }
    }
    if (inp.p('KeyE')) this.game.interact();
    if (!this.inCar && inp.p('KeyB')) this.game.buyProperty();
    if (this.inCar) { const car = this.inCar; car.control(dt, inp); this.pos.copy(car.pos); this.yaw = car.yaw; this._stats(dt); return; }
    const fwd = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw)), right = new THREE.Vector3(-fwd.z, 0, fwd.x), wish = new THREE.Vector3();
    if (inp.k('KeyW')) wish.add(fwd); if (inp.k('KeyS')) wish.sub(fwd); if (inp.k('KeyD')) wish.add(right); if (inp.k('KeyA')) wish.sub(right);
    const moving = wish.lengthSq() > 0; if (moving) wish.normalize();
    const inWater = this.game.city.isWater(this.pos.x, this.pos.z);
    const sprint = inp.k('ShiftLeft') || inp.k('ShiftRight'), sp = inWater ? 2.6 : (sprint ? 9.5 : 5.0);
    this.pos.x += wish.x * sp * dt; this.pos.z += wish.z * sp * dt;
    [this.pos.x, this.pos.z] = this.game.city.collide(this.pos.x, this.pos.z, 0.5);
    [this.pos.x, this.pos.z] = this.game.pushOutOfCars(this.pos.x, this.pos.z, 0.42);
    this.pos.x = clamp(this.pos.x, -this.game.city.size / 2 - 260, this.game.city.size / 2 + 300); this.pos.z = clamp(this.pos.z, -this.game.city.size / 2 - 330, this.game.city.size / 2 + 260);
    if (inp.k('Space') && this.onGround && !inWater) { this.vy = 7; this.onGround = false; }
    let gH = this.game.city.groundH(this.pos.x, this.pos.z);
    // standing on an elevated tower floor: the slab is the ground while you stay on it; step off the edge and you fall
    const fb = this.floorBase;
    if (fb) { if (Math.abs(this.pos.x - fb.x) < fb.hw && Math.abs(this.pos.z - fb.z) < fb.hd) gH = fb.y; else if (this.pos.y < gH + 1.5) this.floorBase = null; }
    this.vy -= 22 * dt; this.pos.y += this.vy * dt; if (this.pos.y <= gH) { this.pos.y = gH; this.vy = 0; this.onGround = true; }
    if (moving) this.yaw = lerpAngle(this.yaw, Math.atan2(wish.x, wish.z), Math.min(1, dt * 12));
    this.gunCd = Math.max(0, this.gunCd - dt); this.punchT = Math.max(0, this.punchT - dt); this.shootT = Math.max(0, this.shootT - dt);
    const armed = this.weapon === 'pistol' && this.hasGun;
    if (this.gunCd <= 0) {
      if (armed && inp.mL) { this.gunCd = 0.16; this.shootT = 0.22; const d = new THREE.Vector3(); this.game.camera.getWorldDirection(d); this.yaw = Math.atan2(d.x, d.z); this.game.shootRay(this.eye(), d, 18, 120); }
      else if (!armed && inp.mLe) { this.gunCd = 0.42; this.punchT = 0.34; this.punchSide = -(this.punchSide || 1); this._punch(); }
    }
    // swimming in the bay/ocean: slow bobbing wade, no jumping
    const swim = inWater;
    if (swim) this.pos.y = -0.32 + Math.sin(this.game.time * 2.2) * 0.06; // bob at the ocean surface
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
    const lowHp = this.health < 28 && !swim;
    if (this.emote) { if (moving || this.punchT > 0 || this.shootT > 0) this.emote = null; else { this.emote.t -= dt; if (this.emote.t <= 0) this.emote = null; } }
    this.fig.update(dt, { state: this.emote ? this.emote.s : (moving ? (lowHp ? 'limp' : (sprint && !swim ? 'run' : 'walk')) : (lowHp ? 'limp' : 'idle')) });
    if (this.emote) { this.root.position.copy(this.pos); return; } // hold the emote pose cleanly (no arm overrides)
    // arm overrides for punch / gun (cosmetic — aim itself is camera-based)
    if (this.gun) this.gun.visible = armed;
    const j = this.fig.j;
    if (this.punchT > 0) {
      const T = 0.34, tt = 1 - this.punchT / T, wind = clamp(tt / 0.3, 0, 1), str = clamp((tt - 0.3) / 0.35, 0, 1), rec = clamp((tt - 0.65) / 0.35, 0, 1);
      const ext = str * (1 - rec), side = this.punchSide || 1, A = side > 0 ? j.armR : j.armL, Fo = side > 0 ? j.foreR : j.foreL, O = side > 0 ? j.armL : j.armR, OF = side > 0 ? j.foreL : j.foreR;
      A.rotation.x = -0.5 * wind - ext * 1.15; A.rotation.z = -side * 0.12; Fo.rotation.x = -1.5 * wind + ext * 1.42; // chambered, then rams straight out
      O.rotation.x = -0.85; OF.rotation.x = -1.6; // guard hand stays up
      j.chest.rotation.y = side * (0.4 * wind - ext * 0.75); j.chest.rotation.x = 0.08 + ext * 0.12; j.hips.rotation.y = side * (0.2 * wind - ext * 0.4);
      j.legL.rotation.x = side > 0 ? -0.3 * ext : 0.22 * ext; j.legR.rotation.x = side > 0 ? 0.22 * ext : -0.3 * ext; // steps into it
      j.head.rotation.y = -side * ext * 0.1;
    }
    else if (armed) { const aim = this.shootT > 0 ? 1 : 0.35; j.armR.rotation.x = -0.5 - aim * 1.0; j.armR.rotation.z = -0.12; j.foreR.rotation.x = -0.12; }
    this._stats(dt);
  }
  _punch() {
    const reach = 2.3; let best = null, bd = reach; const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    for (const n of this.game.npcs) { if (n.dead) continue; const dx = n.pos.x - this.pos.x, dz = n.pos.z - this.pos.z, d = Math.hypot(dx, dz); if (d > bd) continue; if ((dx * fx + dz * fz) / (d || 1) < 0.25) continue; bd = d; best = n; }
    if (best) { best.damage(22, { x: fx, z: fz }); best.pos.x += fx * 0.8; best.pos.z += fz * 0.8; this.game.hitFx(best.pos.clone().setY(1.2), 0xffd27a, 6); if (!best.cop) { this.game.reportCrime(best.pos, 1, { quiet: true }); if (!best.dead && best.hp > 0 && Math.random() < 0.4) { best.fightT = 6; best.flee = 0; } } }
  }
  _stats(dt) { this.regen += dt; if (this.health < this.maxHealth && this.wanted === 0 && this.regen > 2) this.health = Math.min(this.maxHealth, this.health + 6 * dt); if (this.health <= 0 && !this.dead) { this.dead = true; this.game.saveGame(); const g = this.game; g.ui.bigCard('WASTED', 'You wake up at your place, $100 lighter');
      setTimeout(() => { const H = g.city.places.home; this.money = Math.max(0, this.money - 100); this.health = this.maxHealth; this.wanted = 0; this.heat = 0; if (this.inCar) { this.inCar.driver = null; this.inCar = null; this.root.visible = true; }
        this.pos.set(H.x, 0, H.z + 8); this.root.position.copy(this.pos); this.dead = false; for (const n of g.npcs) if (n.cop) n.removeMe = true; for (const c of g.cars) if (c.police) c.removeMe = true; }, 2200); } }
  hurt(n) { if (this.dead) return; this.health -= n; this.regen = 0; this.game.ui.flash(); }
  cycleCam() {
    const order = ['tps', 'shoulder', 'fps']; this.camMode = order[(order.indexOf(this.camMode) + 1) % order.length];
    this.game.ui.toast(this.camMode === 'tps' ? 'Camera: Third-person' : this.camMode === 'shoulder' ? 'Camera: Over-the-shoulder' : 'Camera: First-person');
  }
  updateCamera(dt, frozen) {
    const g = this.game, mode = this.inCar ? 'tps' : this.camMode;
    // ---- true first-person: eye-line looking down camYaw/camPitch through the rain ----
    if (mode === 'fps') {
      this.fig.group.visible = false; // hide own body so it doesn't clip the lens
      const eye = new THREE.Vector3(this.pos.x, this.pos.y + 1.62, this.pos.z);
      const dir = new THREE.Vector3(Math.sin(this.camYaw) * Math.cos(this.camPitch), -Math.sin(this.camPitch), Math.cos(this.camYaw) * Math.cos(this.camPitch));
      const fwd = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw)); eye.addScaledVector(fwd, 0.12);
      const sh = (g.camShake || 0); if (sh > 0) { eye.x += rnd(-sh, sh) * 0.14; eye.y += rnd(-sh, sh) * 0.14; }
      g.camera.position.copy(eye); g.camera.lookAt(eye.x + dir.x, eye.y + dir.y, eye.z + dir.z); return;
    }
    if (this.fig) this.fig.group.visible = true;
    const target = this.inCar ? new THREE.Vector3(this.inCar.pos.x, 1.6, this.inCar.pos.z) : new THREE.Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z);
    if (this.inCar) { const k = 0.12; this.camYaw = lerpAngle(this.camYaw, Math.atan2(Math.sin(this.inCar.yaw), Math.cos(this.inCar.yaw)) + Math.PI, k); }
    // ---- low cinematic chase rig: close and near ground level, trailing behind, tilted down so the
    // ---- wet road + reflections fill the lower frame and the skyline rises above the player ----
    const shoulder = mode === 'shoulder';
    const dist = this.inCar ? 8.5 : (shoulder ? 2.6 : this.camDist), pitch = this.inCar ? 0.15 : (shoulder ? 0.14 : this.camPitch);
    const off = new THREE.Vector3(Math.sin(this.camYaw + Math.PI) * Math.cos(pitch), Math.sin(pitch), Math.cos(this.camYaw + Math.PI) * Math.cos(pitch)).multiplyScalar(dist);
    let cx = target.x + off.x, cy = target.y + off.y + (shoulder ? 0.35 : this.inCar ? 0.55 : 0.7), cz = target.z + off.z;
    if (shoulder) { const rx = Math.cos(this.camYaw), rz = -Math.sin(this.camYaw); cx += rx * 0.9; cz += rz * 0.9; target.x += rx * 0.6; target.z += rz * 0.6; }
    const gcam = g.city.groundH(cx, cz); if (cy < gcam + 0.7) cy = gcam + 0.7;   // never dip below the wet road
    // camera collision: march from the player toward the desired spot and stop at walls
    const boxes = g.city.boxes; let k = 1;
    for (let i = 1; i <= 12; i++) {
      const u = i / 12, px2 = lerp(target.x, cx, u), py2 = lerp(target.y, cy, u), pz2 = lerp(target.z, cz, u); let hit = false;
      for (const b of boxes) { if (py2 < (b.h === undefined ? 7 : b.h) && Math.abs(px2 - b.x) < b.hw + 0.35 && Math.abs(pz2 - b.z) < b.hd + 0.35) { hit = true; break; } }
      if (hit) { k = Math.max(0.12, (i - 1) / 12); break; } k = u;
    }
    cx = lerp(target.x, cx, k); cy = lerp(target.y, cy, k); cz = lerp(target.z, cz, k);
    // frame-rate independent damped follow (a heavier trail in a car for momentum)
    const alpha = 1 - Math.pow(this.inCar ? 0.0018 : 0.0009, dt);
    this.game.camera.position.lerp(new THREE.Vector3(cx, cy, cz), alpha || 1);
    // speed widens the FOV for a sense of rush; the look point sits a touch above the player so the skyline lifts
    const spd = this.inCar ? Math.abs(this.inCar.speed) : Math.hypot((this.pos.x - (this._lcx || this.pos.x)), (this.pos.z - (this._lcz || this.pos.z))) / Math.max(1e-3, dt);
    this._lcx = this.pos.x; this._lcz = this.pos.z;
    const wantFov = 62 + clamp(spd * 0.32, 0, 8); g.camera.fov += (wantFov - g.camera.fov) * Math.min(1, dt * 3); g.camera.updateProjectionMatrix();
    const sh = (g.camShake || 0), lookAt = new THREE.Vector3(target.x, target.y + (this.inCar ? 0.3 : 0.2), target.z);
    if (sh > 0) { this.game.camera.position.x += rnd(-sh, sh) * 0.4; this.game.camera.position.y += rnd(-sh, sh) * 0.4; lookAt.x += rnd(-sh, sh) * 0.5; lookAt.z += rnd(-sh, sh) * 0.5; }
    const fat = this.fatigue || 0; if (fat > 0.5) { const s = (fat - 0.5) * 2; lookAt.x += Math.sin(g.time * 1.25) * s * 0.28; lookAt.y += Math.sin(g.time * 0.85 + 1.1) * s * 0.16; } // heavy-eyed sway when exhausted
    this.game.camera.lookAt(lookAt);
  }
}
function lerpAngle(a, b, t) { let d = ((b - a + Math.PI) % TAU) - Math.PI; return a + d * t; }

// ---------------------------------------------------------------------------
// Ped / Cop / Dancer
// ---------------------------------------------------------------------------
class Ped {
  constructor(game, x, z, cop, opts) {
    opts = opts || {}; this.game = game; this.cop = !!cop; this.dance = !!opts.dance; this.loiter = !!opts.loiter; this.vendor = !!opts.vendor; this.homeless = !!opts.homeless; this.worker = !!opts.worker; this.pos = new THREE.Vector3(x, 0, z); this.yaw = opts.yaw != null ? opts.yaw : rnd(TAU);
    this.hp = cop ? 60 : 30; this.dead = false; this.removeMe = false; this.flee = 0; this.timer = rnd(3); this.wander = rnd(TAU); this.attackCd = 0; this.deadT = 0; this.cowerT = 0;
    this.errander = !cop && !this.dance && !this.loiter && !this.vendor && !this.homeless && !this.worker; // ordinary citizens live on a schedule
    this.person = cop ? { first: 'Officer', name: 'Officer ' + pick(LAST_NAMES), job: 'NBPD', age: 24 + (Math.random() * 30 | 0), mood: 'on duty', wealth: 0, affinity: 0, grudge: 0 } : makePerson(); // everyone is somebody
    if (this.errander) { // a daily life: home to sleep, a job by day, food/leisure at night, and a wallet
      const c = game.city, pk2 = (a) => a && a.length ? a[(Math.random() * a.length) | 0] : null;
      this.homeNode = pk2(c.homes); this.jobNode = pk2(c.jobs); this.funNode = pk2(c.leisureSpots);
      this.funds = 20 + (Math.random() * 230 | 0); this.schedState = null;
    }
    // district communities: suits downtown, bright beach fits, shabby camp clothes
    const cc = game.city, halfC = cc.size / 2, downtown = Math.hypot(x, z) < cc.cell * 1.6, beach = z > halfC - 50;
    if (this.homeless) this.persona = { shirt: pick([0x6a6053, 0x5a5148, 0x4a4a52, 0x6b5a3a]), skin: pick(SKIN), hair: pick([0x4a4a4a, 0x2b2b2b, 0x6b4a2a]), pants: pick([0x3a2e26, 0x4a4a52]), style: pick(['mop', 'bald', 'beanie', 'mop']) };
    else if (cop) this.persona = { shirt: 0x21407a, skin: pick(SKIN), hair: pick(HAIR), pants: 0x16213f, style: 'buzz', noScale: true };
    else if (this.worker) this.persona = { shirt: pick([0xe8e8e8, 0xc23232, 0x2f8f6a, 0x4a6c8a]), skin: pick(SKIN), hair: pick(HAIR), pants: pick([0x1f2530, 0x3a3f48]), style: pick(['cap', 'buzz', 'bowl', 'pony']) };
    else if (downtown && Math.random() < 0.5) this.persona = { shirt: pick([0x2a2f3a, 0x3a3f48, 0xe8e8e8, 0x1f2530]), skin: pick(SKIN), hair: pick(HAIR), pants: pick([0x1f2530, 0x2c3242]), style: pick(['buzz', 'bowl', 'bald', 'pony']) };
    else if (beach && Math.random() < 0.6) this.persona = { shirt: pick([0xff7a5a, 0x2fe6c0, 0xffe24a, 0xff5fb0, 0x4fd0ff]), skin: pick(SKIN), hair: pick(HAIR), pants: pick([0xe8e8e8, 0x4fd0ff, 0xff9a5a]), style: pick(['cap', 'spiky', 'afro', 'bald']) };
    else this.persona = { shirt: pick(SHIRTS), skin: pick(SKIN), hair: pick(HAIR), pants: pick(PANTS) };
    this.ambient = opts.ambient || (this.homeless ? pick(['panhandle', 'sit', 'sleep']) : this.worker ? pick(['idle', 'sweep', 'lean', 'wave']) : this.loiter ? pick(['sit', 'phone', 'smoke', 'lean']) : this.vendor ? pick(['idle', 'sweep', 'wave']) : null);
    // half the city is women — cops included; fem builds drop the masculine hairstyle picks
    this.persona.fem = this.cop ? Math.random() < 0.32 : !!this.person.fem;
    if (this.persona.fem && ['buzz', 'spiky', 'bowl', 'mop', 'bald'].indexOf(this.persona.style) >= 0) delete this.persona.style;
    const f = buildPerson(this.persona); this.fig = f; this.root = new THREE.Group(); this.root.add(makeBlob(0.55)); this.root.add(f.group); this.root.position.copy(this.pos); game.scene.add(this.root);
    // it's always raining — many citizens carry an umbrella
    if (!cop && !this.homeless && !this.worker && !opts.worker && Math.random() < 0.5) {
      const uCol = pick([0x1f2530, 0x2a2f3a, 0x3a2e26, 0x45454e, 0x552a2a, 0x24303a, 0x2a3a4a]), um = new THREE.Group();
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.92, 0.52, 8), mat(uCol)); canopy.position.y = 2.55; um.add(canopy);
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.02, 8), mat(new THREE.Color(uCol).multiplyScalar(0.7).getHex())); rib.position.y = 2.32; um.add(rib);
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 6), mat(0x1a1a1a)); stick.position.y = 1.95; um.add(stick);
      um.position.set(0.2, 0, 0.14); this.root.add(um); this.umbrella = um;
    }
    if (cop) { const capm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.4), mat(0x11203f)); capm.position.y = 1.95; this.root.add(capm); }
    const [ux, uz] = game.city.collide(x, z, 0.55); if (Math.hypot(ux - x, uz - z) > 0.05) { this.pos.set(ux, 0, uz); this.root.position.copy(this.pos); } // never spawn inside a wall
  }
  animateIdle(dt) { if (!this.dead) this.fig.update(dt, { state: this.dance ? 'dance' : 'idle' }); }
  damage(n) { if (this.dead) return; this.hp -= n; this.flee = 7; if (this.hp <= 0) this.die(); else this.stunT = 0.45; }
  die() { if (this.dead) return; this.dead = true; this.deadT = 0; this.socialRole = null; const cash = 10 + (Math.random() * 40 | 0); this.game.player.money += cash; this.game.moneyPop(cash, this.pos.clone().setY(1.4)); if (this.game.social) this.game.social.onDeath(this); }
  scare(t) { this.cowerT = Math.max(this.cowerT, t); }
  launch(vx, vz) { if (this.dead) return; this.lvx = clamp(vx, -14, 14); this.lvz = clamp(vz, -14, 14); this.knockT = Math.max(this.knockT || 0, 1.4); this.root.rotation.z = rnd(-1, 1); }
  update(dt) {
    this.pos.y = this.game.city.groundH(this.pos.x, this.pos.z); // feet on the terrain, wherever it rolls
    if (this.dead) { this.deadT += dt; this.root.rotation.z = Math.min(Math.PI / 2, this.deadT * 4); this.root.position.copy(this.pos); if (this.deadT > 6) this.removeMe = true; return; }
    if (this.dance) { this.root.rotation.y = this.yaw; this.fig.update(dt, { state: 'dance' }); return; }
    if (this.dragT > 0) { // being hauled out of the driver's seat
      this.dragT -= dt; const k = 1 - Math.max(0, this.dragT) / 0.62, e = k * k * (3 - 2 * k);
      this.pos.x = this.dragFrom.x + (this.dragTo.x - this.dragFrom.x) * e; this.pos.z = this.dragFrom.z + (this.dragTo.z - this.dragFrom.z) * e;
      this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; this.root.rotation.z = -e * 0.85;
      this.fig.update(dt, { state: 'hitstun' }); return;
    }
    if (this.knockT > 0) { this.knockT -= dt; if (this.lvx || this.lvz) { this.pos.x += this.lvx * dt; this.pos.z += this.lvz * dt; this.lvx *= Math.max(0, 1 - dt * 3.4); this.lvz *= Math.max(0, 1 - dt * 3.4); const gy = this.game.city.groundH(this.pos.x, this.pos.z); this.pos.y = gy; } this.root.rotation.z *= Math.max(0, 1 - dt * 4); this.root.position.copy(this.pos); this.fig.update(dt, { state: 'knockout' }); if (this.knockT <= 0 && !this.angryT) this.flee = 6; return; } // launched, out cold on the pavement
    if (this.angryT > 0 && this.flee <= 0) { this.angryT -= dt; const pp = this.game.player.pos; this.yaw = Math.atan2(pp.x - this.pos.x, pp.z - this.pos.z); this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; this.fig.update(dt, { state: 'argue' }); return; } // back on their feet, shaking a fist after you
    if (this.stunT > 0) { this.stunT -= dt; this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; this.fig.update(dt, { state: 'hitstun' }); return; }   // reeling from a hit
    // a citizen playing a part in a street event — the Social sim drives its pose, we just render it
    if (this.socialRole) { this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; this.fig.update(dt, { state: this.socialState || 'idle' }); return; }
    // your spouse / recruited crew follows you and fights the people attacking you
    if (this.followPlayer && !this.dead) {
      const g = this.game, pl = g.player; let foe = null, fd = 9; for (const n of g.npcs) { if (n === this || n.dead) continue; if ((n.enemy || (n.cop && pl.wanted > 0)) && n.pos.distanceTo(this.pos) < fd) { fd = n.pos.distanceTo(this.pos); foe = n; } }
      if (foe) { const dx = foe.pos.x - this.pos.x, dz = foe.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 1; this.yaw = Math.atan2(dx, dz); if (d > 1.6) { this.pos.x += dx / d * 4.5 * dt; this.pos.z += dz / d * 4.5 * dt; } else if ((this.attackCd = (this.attackCd || 0) - dt) <= 0) { this.attackCd = 0.8; foe.damage(8, { x: dx / d, z: dz / d }); g.hitFx(foe.pos.clone().setY(1.2), 0xffd27a, 4); } this.pos.y = g.city.groundH(this.pos.x, this.pos.z); this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; this.fig.update(dt, { state: d > 1.6 ? 'run' : 'punch' }); return; }
      const dxp = pl.pos.x - this.pos.x, dzp = pl.pos.z - this.pos.z, dp = Math.hypot(dxp, dzp) || 1;
      if (dp > 3.5) { const sp = dp > 12 ? 7 : 4.6; this.pos.x += dxp / dp * sp * dt; this.pos.z += dzp / dp * sp * dt; this.pos.y = g.city.groundH(this.pos.x, this.pos.z); this.yaw = Math.atan2(dxp, dzp); }
      if (dp > 60) { this.pos.set(pl.pos.x - Math.sin(pl.yaw) * 3, 0, pl.pos.z - Math.cos(pl.yaw) * 3); } // teleport back if left behind
      this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; this.fig.update(dt, { state: dp > 3.5 ? (dp > 12 ? 'run' : 'walk') : 'idle' }); return;
    }
    this.cowerT = Math.max(0, this.cowerT - dt);
    if ((this.loiter || this.vendor || this.homeless || this.worker) && this.flee <= 0) {
      this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
      this.fig.update(dt, { state: this.cowerT > 0 ? 'cower' : (this.ambient || 'idle') }); return;
    }
    const p = this.game.player, dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, dist = Math.hypot(dx, dz);
    this.attackCd = Math.max(0, this.attackCd - dt); if (this.flee > 0) this.flee -= dt; this.timer -= dt; if (this.fightT > 0) this.fightT -= dt;
    let wx = 0, wz = 0, sp = this.cop ? 6 : 3.0;
    if (this.cop && p.wanted > 0 && dist < 55) {
      // escalation ladder: close in to restrain; NEVER shoot unless 5 stars AND your gun is out
      const gunOut = p.hasGun && p.weapon === 'pistol' && (p.gunOutT || 0) > 0;
      if (dist > 1.6) { wx = dx / dist; wz = dz / dist; } this.yaw = Math.atan2(dx, dz);
      this.game.copBark(this, dist);
      if (p.wanted >= 5 && gunOut && dist < 30 && this.attackCd <= 0) { this.attackCd = 1.1; p.hurt(this.game.carShield(6 + Math.random() * 5)); this.game.addTracer(this.pos.clone().setY(1.4), p.eye(), 0x9fc2ff); }
      // otherwise they converge — restrain/taze handled in Game.updateArrest
    }
    else if (this.enemy && !this.dead) { // mission goons: close on you (or the ally they were sent after) and swing
      const tgt = (this.attackAlly && !this.attackAlly.dead) ? this.attackAlly : p;
      const tdx = tgt.pos.x - this.pos.x, tdz = tgt.pos.z - this.pos.z, td = Math.hypot(tdx, tdz) || 1;
      if (td > 1.6) { wx = tdx / td; wz = tdz / td; } this.yaw = Math.atan2(tdx, tdz); sp = 5.2;
      if (td < 2.0 && this.attackCd <= 0) { this.attackCd = 0.9; if (tgt === p) { p.hurt(6 + Math.random() * 5); this.game.hitFx(p.eye(), 0xff7a5a, 6); } else { tgt.damage(7); } }
    }
    else if (this.fightT > 0 && !this.cop) { // civilians can swing back
      if (dist > 1.5) { wx = dx / dist; wz = dz / dist; } this.yaw = Math.atan2(dx, dz); sp = 4.6;
      if (dist < 1.9 && this.attackCd <= 0) { this.attackCd = 1.0; p.hurt(4 + Math.random() * 4); this.game.hitFx(p.eye(), 0xffd27a, 5); }
    }
    else if (this.flee > 0) { wx = -dx / (dist || 1); wz = -dz / (dist || 1); this.yaw = Math.atan2(wx, wz); sp = this.cop ? 6 : 5.5; }
    else if (!this.story && this.homeNode) { // ---- utility-lite daily FSM: work by day, leisure at dusk, home at night ----
      this.pdir = null; const hr = this.game.hour != null ? this.game.hour : 12;
      const st = (hr >= 8 && hr < 18) ? 'work' : (hr >= 18 && hr < 23) ? 'fun' : 'home';
      if (st !== this.schedState) { this.schedState = st; this.schedTarget = st === 'work' ? this.jobNode : st === 'fun' ? this.funNode : this.homeNode; this._spent = false; this._settled = false; }
      const T = this.schedTarget || this.homeNode;
      if (T) {
        const ex = T.x - this.pos.x, ez = T.z - this.pos.z, ed = Math.hypot(ex, ez);
        if (ed < 3.0) { this._settled = true; if (st === 'fun' && !this._spent) { this._spent = true; this.funds = Math.max(0, (this.funds || 0) - (5 + (Math.random() * 20 | 0))); } this.yaw += Math.sin(this.game.time * 0.4 + this.pos.x) * dt; }
        else { this._settled = false; wx = ex / ed; wz = ez / ed; this.yaw = Math.atan2(wx, wz); sp = st === 'work' ? 3.4 : 3.0; }
      }
    }
    else if (!this.story && this.errandPt) { // somewhere to be: a food cart, a storefront, a towel on the sand
      this.pdir = null;
      const ex = this.errandPt.x - this.pos.x, ez = this.errandPt.z - this.pos.z, ed = Math.hypot(ex, ez);
      if (ed < 2.4) { this.errandWait = this.errandWait == null ? rnd(3.5, 7) : this.errandWait - dt; if (this.errandWait <= 0) { this.errandPt = null; this.errandWait = null; } }
      else { wx = ex / ed; wz = ez / ed; this.yaw = Math.atan2(wx, wz); }
    }
    else if (!this.story) {
      if (!this.pdir || this.timer <= 0) { this.timer = rnd(3, 8); this.pdir = Math.random() < 0.12 ? null : pick(CARDS); }
      if (this.pdir) { wx = this.pdir.x; wz = this.pdir.z; this.yaw = Math.atan2(wx, wz); }
    }
    const moving = !!(wx || wz);
    const nx = this.pos.x + wx * sp * dt, nz = this.pos.z + wz * sp * dt;
    let [cx, cz] = this.game.city.collide(nx, nz, 0.5);
    if (moving) [cx, cz] = this.game.pushOutOfCars(cx, cz, 0.4);
    // civilians walk the block in straight lines and turn a corner when they hit a curb or wall
    if (moving && !this.cop && this.flee <= 0 && this.pdir && (this.game.city.onRoad(nx, nz) || this.game.city.inBay(nx, nz) || nx > this.game.city.size / 2 + 4 || Math.hypot(cx - nx, cz - nz) > 0.02)) {
      const l = { x: this.pdir.z, z: -this.pdir.x }, r = { x: -this.pdir.z, z: this.pdir.x };
      const okL = !this.game.city.onRoad(this.pos.x + l.x, this.pos.z + l.z), okR = !this.game.city.onRoad(this.pos.x + r.x, this.pos.z + r.z);
      this.pdir = okL && okR ? (Math.random() < 0.5 ? l : r) : okL ? l : okR ? r : { x: -this.pdir.x, z: -this.pdir.z };
      this.timer = rnd(3, 8);
    } else { this.pos.x = cx; this.pos.z = cz; }
    if (!this.story && this.pos.distanceTo(p.pos) > 155) this.removeMe = true;
    // un-stick: if pinched between buildings while trying to walk, relocate to the sidewalk
    if (moving) {
      const md = Math.hypot(this.pos.x - (this._px != null ? this._px : this.pos.x), this.pos.z - (this._pz != null ? this._pz : this.pos.z));
      this.stuckT = md < sp * dt * 0.2 ? (this.stuckT || 0) + dt : 0;
      if (this.stuckT > 2.5) { const s2 = this.game.city.snapSidewalk(this.pos.x, this.pos.z); const [rx, rz] = this.game.city.collide(s2[0], s2[1], 0.55); this.pos.set(rx, 0, rz); this.stuckT = 0; this.errandPt = null; this.errandWait = null; }
    }
    this._px = this.pos.x; this._pz = this.pos.z;
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
    this.fig.update(dt, { state: moving ? (sp > 5 ? 'run' : 'walk') : 'idle' });
  }
}

// ---------------------------------------------------------------------------
// Car
// ---------------------------------------------------------------------------
