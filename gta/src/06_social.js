// ============================================================================
// NEON BAY · 06_social.js — wet-road planar reflection + the living-city social simulation (names, events, romance)
// Concatenated in order by build.mjs into one module (shared scope, no cross-imports).
// ============================================================================
class ReflectiveGround {
  constructor(renderer, scene, camera, size) {
    this.renderer = renderer; this.scene = scene; this.camera = camera; this.enabled = true;
    this.rt = new THREE.WebGLRenderTarget(512, 512, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.reflCam = new THREE.PerspectiveCamera(); this.textureMatrix = new THREE.Matrix4();
    this._t = { rwp: new THREE.Vector3(), cwp: new THREE.Vector3(), normal: new THREE.Vector3(), view: new THREE.Vector3(), target: new THREE.Vector3(), look: new THREE.Vector3(), rot: new THREE.Matrix4() };
    const geo = new THREE.PlaneGeometry(size, size); geo.rotateX(-Math.PI / 2);
    this.mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
      uniforms: { tRefl: { value: this.rt.texture }, texMat: { value: this.textureMatrix }, camPos: { value: new THREE.Vector3() }, intensity: { value: 0.16 }, wetness: { value: 1.0 } },
      vertexShader: `uniform mat4 texMat; varying vec4 vUvR; varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; vUvR = texMat * vec4(position,1.0); gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: `uniform sampler2D tRefl; uniform vec3 camPos; uniform float intensity, wetness; varying vec4 vUvR; varying vec3 vW;
        void main(){ vec3 vd = normalize(camPos - vW); float fres = 0.15 + 0.85 * pow(1.0 - clamp(vd.y, 0.0, 1.0), 4.0); vec3 r = texture2DProj(tRefl, vUvR).rgb * 0.8; float a = clamp(fres * wetness * intensity, 0.0, 0.5); gl_FragColor = vec4(r, a); }` });
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.position.y = 0.085; this.mesh.renderOrder = 3; this.mesh.frustumCulled = false; scene.add(this.mesh);
  }
  update() {
    if (!this.enabled) return;
    try {
      const s = this.mesh, cam = this.camera, V = this._t;
      s.position.x = cam.position.x; s.position.z = cam.position.z; s.updateMatrixWorld();
      V.rwp.setFromMatrixPosition(s.matrixWorld); V.cwp.setFromMatrixPosition(cam.matrixWorld); V.normal.set(0, 1, 0);
      V.view.subVectors(V.rwp, V.cwp); if (V.view.dot(V.normal) > 0) { s.visible = false; return; } s.visible = true;
      V.view.reflect(V.normal).negate().add(V.rwp);
      V.rot.extractRotation(cam.matrixWorld); V.look.set(0, 0, -1).applyMatrix4(V.rot).add(V.cwp);
      V.target.subVectors(V.rwp, V.look); V.target.reflect(V.normal).negate().add(V.rwp);
      const rc = this.reflCam; rc.position.copy(V.view); rc.up.set(0, 1, 0).applyMatrix4(V.rot).reflect(V.normal); rc.lookAt(V.target);
      rc.far = cam.far; rc.near = cam.near; rc.aspect = cam.aspect; rc.fov = cam.fov; rc.projectionMatrix.copy(cam.projectionMatrix); rc.updateMatrixWorld();
      this.textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
      this.textureMatrix.multiply(rc.projectionMatrix); this.textureMatrix.multiply(rc.matrixWorldInverse); this.textureMatrix.multiply(s.matrixWorld);
      this.mat.uniforms.camPos.value.copy(cam.position);
      s.visible = false; const oldRT = this.renderer.getRenderTarget();
      this.renderer.setRenderTarget(this.rt); this.renderer.clear(); this.renderer.render(this.scene, rc); this.renderer.setRenderTarget(oldRT); s.visible = true;
    } catch (e) { this.enabled = false; if (this.mesh) this.mesh.visible = false; }
  }
}

// ---------------------------------------------------------------------------
// A living population — names, ages, jobs, and a street-level social simulation
// that stages muggings, arguments, divorces and brawls with real ped actors.
// ---------------------------------------------------------------------------
const NAMES_M = ['Marco', 'Tariq', 'Dmitri', 'Ivan', 'Carlos', 'Omar', 'Kofi', 'Sven', 'Hassan', 'Diego', 'Noah', 'Viktor', 'Jin', 'Rashid', 'Pablo', 'Leon', 'Kenji', 'Andre', 'Boris', 'Ravi', 'Sami', 'Gio', 'Mateo', 'Amir', 'Dante'];
const NAMES_F = ['Lena', 'Yuki', 'Rosa', 'Aisha', 'Nadia', 'Mei', 'Bianca', 'Priya', 'Lucia', 'Greta', 'Fatima', 'Zara', 'Camila', 'Elena', 'Ingrid', 'Yara', 'Mira', 'Sofia', 'Nia', 'Tessa', 'Dana', 'Marisol', 'Wren', 'Amara', 'Selin'];
const FIRST_NAMES = NAMES_M.concat(NAMES_F);
const LAST_NAMES = ['Marenco', 'Greco', 'Vale', 'Salcido', 'Kowalski', 'Okafor', 'Nakamura', 'Reyes', 'Petrov', 'Haddad', 'Rossi', 'Silva', 'Novak', 'Costa', 'Bauer', 'Ferreira', 'Delgado', 'Ahmed', 'Larsen', 'Moreau', 'Vasquez', 'Romano', 'Khan', 'Jensen', 'Bianchi', 'Serrano', 'Volkov', 'Mendez', 'Park', 'Adeyemi', 'Flores', 'Bergström', 'Osei', 'Duarte'];
const JOBS = ['barista', 'mechanic', 'banker', 'dealer', 'nurse', 'cabbie', 'DJ', 'chef', 'clerk', 'longshoreman', 'realtor', 'bouncer', 'tattooist', 'fisher', 'courier', 'busker', 'bartender', 'vendor', 'line cook', 'loan shark', 'dockhand', 'florist', 'pawnbroker'];
const MOODS = ['content', 'tired', 'anxious', 'cheerful', 'grumpy', 'love-struck', 'broke', 'hopeful', 'heartbroken', 'wired'];
function makePerson() {
  const fem = Math.random() < 0.5, first = pick(fem ? NAMES_F : NAMES_M);
  return { first, fem, name: first + ' ' + pick(LAST_NAMES), age: 18 + (Math.random() * 54 | 0), job: pick(JOBS), mood: pick(MOODS), wealth: 20 + (Math.random() * 420 | 0), spouse: null, affinity: 0, grudge: 0, met: false };
}
class Social {
  constructor(game) { this.game = game; this.events = []; this.eventT = rnd(6, 12); this.news = []; this.rep = { 'Downtown': 0, 'Little Havana': 0, 'The Docklands': 0, 'Vice Beach': 0, 'Sunset Heights': 0, 'Starfish Island': 0 }; }
  log(msg) { this.news.unshift({ t: this.game.time, msg }); if (this.news.length > 26) this.news.pop(); }
  repFor(x, z) { return this.rep[this.game.city.districtAt(x, z)] || 0; }
  addRep(x, z, d) { const k = this.game.city.districtAt(x, z); if (this.rep[k] == null) this.rep[k] = 0; this.rep[k] = clamp(this.rep[k] + d, -100, 100); }
  // spawn a controlled actor ped that the sim drives instead of its own AI
  spawnActor(x, z, shirt) {
    const g = this.game, P = new Ped(g, x, z, false); P.story = true; P.socialRole = 'act'; P.socialState = 'idle'; P.timer = 1e9; P.wander = null; P.homeNode = null; P.jobNode = null; P.funNode = null;
    if (shirt != null) { P.persona.shirt = shirt; }
    g.npcs.push(P); return P;
  }
  _sidewalkNear(minR, maxR) {
    const g = this.game, p = g.player; for (let t = 0; t < 20; t++) { const a = rnd(TAU), r = rnd(minR, maxR), x = p.pos.x + Math.cos(a) * r, z = p.pos.z + Math.sin(a) * r; if (!g.city.net.isLand(x, z)) continue; const sw = g.city.snapSidewalk(x, z); if (g.city.net.isLand(sw[0], sw[1])) return { x: sw[0], z: sw[1] }; } return null;
  }
  _moveTo(ped, x, z, spd, dt) { const dx = x - ped.pos.x, dz = z - ped.pos.z, d = Math.hypot(dx, dz) || 1; if (d > 0.4) { ped.pos.x += (dx / d) * spd * dt; ped.pos.z += (dz / d) * spd * dt; ped.pos.y = this.game.city.groundH(ped.pos.x, ped.pos.z); ped.yaw = Math.atan2(dx, dz); ped.socialState = spd > 4 ? 'run' : 'walk'; return false; } return true; }
  _face(a, b) { a.yaw = Math.atan2(b.pos.x - a.pos.x, b.pos.z - a.pos.z); }
  hearts(pos, col) { const g = this.game, n = 10, geo = new THREE.BufferGeometry(), ps = new Float32Array(n * 3), vs = new Float32Array(n * 3); for (let i = 0; i < n; i++) { ps[i * 3] = pos.x + rnd(-0.4, 0.4); ps[i * 3 + 1] = pos.y; ps[i * 3 + 2] = pos.z + rnd(-0.4, 0.4); vs[i * 3] = rnd(-1, 1); vs[i * 3 + 1] = rnd(2, 4); vs[i * 3 + 2] = rnd(-1, 1); } geo.setAttribute('position', new THREE.BufferAttribute(ps, 3)); const m = new THREE.Points(geo, new THREE.PointsMaterial({ color: col || 0xff5fae, size: 0.4, transparent: true, depthWrite: false })); g.scene.add(m); g.fx.push({ m, g: geo, ps, vs, n, life: 1.2 }); }
  startEvent(type) {
    const loc = this._sidewalkNear(16, 34); if (!loc) return null;
    const e = { type, phase: 0, t: 0, actors: [], loc, done: false, extra: {} };
    if (type === 'mug') { const victim = this.spawnActor(loc.x, loc.z), rob = this.spawnActor(loc.x + rnd(-8, -4), loc.z + rnd(-2, 2), 0x22242c); rob.person.mood = 'wired'; e.actors = [victim, rob]; e.victim = victim; e.rob = rob; }
    else if (type === 'argue') { const a = this.spawnActor(loc.x, loc.z), b = this.spawnActor(loc.x + rnd(1.6, 2.4), loc.z + rnd(-0.6, 0.6)); a.person.spouse = b.person.name; b.person.spouse = a.person.name; e.actors = [a, b]; e.a = a; e.b = b; }
    else if (type === 'brawl') { const a = this.spawnActor(loc.x, loc.z, 0x883028), b = this.spawnActor(loc.x + rnd(1.8, 2.6), loc.z, 0x2a4a88); e.actors = [a, b]; e.a = a; e.b = b; e.crowd = []; for (let i = 0; i < 3; i++) { const c = this._sidewalkNear(3, 7); if (c) { const on = this.spawnActor(c.x, c.z); e.crowd.push(on); e.actors.push(on); } } }
    else if (type === 'wedding') { const a = this.spawnActor(loc.x, loc.z, 0xf0f0f4), b = this.spawnActor(loc.x + 1.4, loc.z, 0xffd9e8); e.actors = [a, b]; e.a = a; e.b = b; e.crowd = []; for (let i = 0; i < 4; i++) { const c = this._sidewalkNear(4, 8); if (c) { const on = this.spawnActor(c.x, c.z); e.crowd.push(on); e.actors.push(on); } }
      const arch = new THREE.Group(), mm = mat(0xf5e8c8, { emissive: 0xf0d890, emissiveIntensity: 0.35 }); for (const sx of [-1.2, 1.2]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.6, 8), mm); post.position.set(loc.x + sx, 1.3, loc.z - 0.9); arch.add(post); } const top = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.2, 0.2), mm); top.position.set(loc.x, 2.5, loc.z - 0.9); arch.add(top); for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), mat(pick([0xff5fae, 0xffe24a, 0xffffff]), { emissive: 0xff5fae, emissiveIntensity: 0.5 })); f.position.set(loc.x - 1.2 + i * 0.3, 2.42, loc.z - 0.9); arch.add(f); } this.game.scene.add(arch); e.arch = arch; }
    else if (type === 'propose') { const a = this.spawnActor(loc.x, loc.z), b = this.spawnActor(loc.x + 1.2, loc.z); e.actors = [a, b]; e.a = a; e.b = b; }
    this.events.push(e); return e;
  }
  _tick(e, dt) {
    e.t += dt; const g = this.game, p = g.player;
    if (e.type === 'mug') {
      const v = e.victim, r = e.rob; if (v.dead || r.dead) { if (r.dead && !e.rewarded) { e.rewarded = true; p.money += 120; g.moneyPop(120, r.pos.clone().setY(1.4)); this.addRep(p.pos.x, p.pos.z, 10); this.log('You stopped a mugging — the block owes you one'); } e.done = true; return; }
      if (e.phase === 0) { this._face(r, v); this._face(v, r); if (this._moveTo(r, v.pos.x + 0.9, v.pos.z, 5.5, dt)) { e.phase = 1; e.t = 0; g.ui.toast('💰 A mugging — ' + v.person.first + ' is being robbed!'); v.socialState = 'cower'; v.cowerT = 6; const cash = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.18), mat(0x3ae08a, { emissive: 0x2fe07a, emissiveIntensity: 1.2 })); cash.position.set(v.pos.x, 1.0, v.pos.z); g.scene.add(cash); e.cash = cash; } }
      else if (e.phase === 1) { r.socialState = 'talk'; this._face(r, v); if (e.t > 1.1) { e.phase = 2; e.t = 0; if (e.cash) { g.scene.remove(e.cash); e.cash = null; } this.log(r.person.first + ' snatched a wallet in ' + g.city.districtAt(v.pos.x, v.pos.z)); } }
      else { r.socialRole = 'act'; const away = { x: r.pos.x + (r.pos.x - v.pos.x), z: r.pos.z + (r.pos.z - v.pos.z) }; this._moveTo(r, e.loc.x + (r.pos.x - e.loc.x) * 3, e.loc.z + (r.pos.z - e.loc.z) * 3, 6.5, dt); r.socialState = 'run'; v.socialState = e.t > 2 ? 'idle' : 'cower'; if (e.t > 9 || r.pos.distanceTo(p.pos) > 90) e.done = true; }
    } else if (e.type === 'argue') {
      const a = e.a, b = e.b; if (a.dead || b.dead) { e.done = true; return; }
      this._face(a, b); this._face(b, a); a.socialState = 'argue'; b.socialState = 'argue';
      if (Math.sin(e.t * 6) > 0.9) { a.pos.x += Math.sin(a.yaw) * 0.02; } // little lunges
      if (e.t > 11 && !e.resolved) { e.resolved = true;
        if (Math.random() < 0.5) { this.log('💔 ' + a.person.first + ' and ' + b.person.first + ' split up for good'); a.person.spouse = null; b.person.spouse = null; g.ui.toast('💔 A couple just called it quits'); e.split = 0; }
        else { this.log('🥊 ' + a.person.first + ' and ' + b.person.first + ' came to blows'); e.brawl = true; }
      }
      if (e.resolved) { if (e.brawl) { if (Math.sin(e.t * 8) > 0.6 && (b._sc = (b._sc || 0) - dt) <= 0) { b._sc = 0.5; b.stunT = 0.3; b.hp -= 4; if (b.hp <= 0) b.die(); } a.socialState = 'talk'; if (e.t > 15) e.done = true; } else { if (this._moveTo(b, b.pos.x + Math.sin(b.yaw + Math.PI) * 12, b.pos.z + Math.cos(b.yaw + Math.PI) * 12, 3.4, dt)) e.done = true; b.socialState = 'walk'; a.socialState = 'idle'; if (e.t > 16) e.done = true; } }
    } else if (e.type === 'brawl') {
      const a = e.a, b = e.b; if (a.dead || b.dead) { if (!e.called) { e.called = true; this.log((a.dead ? b.person.first : a.person.first) + ' won a street fight in ' + g.city.districtAt(e.loc.x, e.loc.z)); } e.done = e.t > 3; return; }
      this._face(a, b); this._face(b, a); const near = a.pos.distanceTo(b.pos) < 2.0;
      if (!near) { this._moveTo(a, b.pos.x - Math.sin(a.yaw) * 1.3, b.pos.z - Math.cos(a.yaw) * 1.3, 3.2, dt); }
      else { a.socialState = 'talk'; b.socialState = 'talk'; e._sw = (e._sw || 0) - dt; if (e._sw <= 0) { e._sw = 0.6; const hit = Math.random() < 0.5 ? b : a; hit.stunT = 0.3; hit.hp -= 5; g.hitFx(hit.pos.clone().setY(1.2), 0xffd27a, 4); if (hit.hp <= 0) hit.die(); } }
      for (const c of (e.crowd || [])) { this._face(c, a); c.socialState = 'idle'; }
      if (e.t > 26) e.done = true;
    } else if (e.type === 'wedding') {
      const a = e.a, b = e.b; if (a.dead || b.dead) { e.done = true; return; } this._face(a, b); this._face(b, a); a.socialState = 'talk'; b.socialState = 'idle'; for (const c of (e.crowd || [])) { this._face(c, a); c.socialState = 'idle'; }
      if (e.t > 4 && !e.vowed) { e.vowed = true; this.hearts(a.pos.clone().lerp(b.pos, 0.5).setY(1.95), 0xffd23a); this._cheer(a.pos); a.person.spouse = b.person.name; b.person.spouse = a.person.name; this.log('💍 ' + a.person.first + ' married ' + b.person.first + ' in ' + g.city.districtAt(e.loc.x, e.loc.z)); g.ui.toast('💒 A wedding! ' + a.person.first + ' & ' + b.person.first); }
      if (e.t > 11) e.done = true;
    } else if (e.type === 'propose') {
      const a = e.a, b = e.b; if (a.dead || b.dead) { e.done = true; return; } this._face(a, b); this._face(b, a); a.socialState = 'cower'; b.socialState = 'talk';
      if (e.t > 4 && !e.answered) { e.answered = true; if (Math.random() < 0.7) { this.hearts(a.pos.clone().lerp(b.pos, 0.5).setY(1.85)); this._cheer(a.pos); a.person.spouse = b.person.name; b.person.spouse = a.person.name; this.log('💗 ' + b.person.first + ' said YES to ' + a.person.first); g.ui.toast('💗 ' + b.person.first + ' said yes!'); } else { this.log('💔 ' + b.person.first + ' turned down ' + a.person.first); g.ui.toast('💔 A proposal just crashed and burned'); e.rej = true; } }
      if (e.answered && e.rej) this._moveTo(b, b.pos.x + Math.sin(b.yaw + Math.PI) * 10, b.pos.z + Math.cos(b.yaw + Math.PI) * 10, 3.6, dt);
      if (e.t > 10) e.done = true;
    }
  }
  _cleanup(e) { for (const act of e.actors) { if (act && !act.dead) act.removeMe = true; } if (e.cash) this.game.scene.remove(e.cash); if (e.arch) this.game.scene.remove(e.arch); }
  // ---- the player's own social life: talk, flirt, date, marry, recruit, rob ----
  actions(ped) {
    const p = this.game.player, per = ped.person, list = [['greet', '👋 Greet'], ['compliment', '🙂 Compliment'], ['flirt', '❤️ Flirt'], ['gift', '🎁 Gift $50']];
    if (this.canPropose(ped)) list.push(['propose', '💍 Propose']);
    if (per.affinity >= 50 && !ped.ally) list.push(['recruit', '🤝 Recruit']);
    list.push(['insult', '😠 Insult'], ['rob', '🔪 Rob']);
    return list;
  }
  canPropose(ped) { return this.game.player.dating === ped && ped.person.affinity >= 70 && !this.game.player.spouse; }
  act(ped, action) {
    const g = this.game, p = g.player, per = ped.person; per.met = true; let msg = '';
    if (action === 'greet') { per.affinity += 5; ped.socialState = 'talk'; msg = pick(['“Evening.”', '“Rough night to be out.”', '“Stay dry.”', '“You from around here?”']); }
    else if (action === 'compliment') { per.affinity += 8; msg = per.affinity > 25 ? '“…you think so? That’s sweet.”' : '“Uh — thanks.”'; if (per.affinity > 25) this.hearts(ped.pos.clone().setY(1.7)); }
    else if (action === 'flirt') { if (per.affinity >= 15) { per.affinity += 12; this.hearts(ped.pos.clone().setY(1.7)); msg = '“…maybe you could get my number.”'; if (per.affinity >= 40 && p.dating !== ped && !p.spouse) { p.dating = ped; ped._keep = true; ped.story = true; g.ui.toast('❤️ You’re seeing ' + per.first + ' now'); this.log('❤️ You started seeing ' + per.name); } } else { per.affinity -= 6; msg = '“Easy, stranger.”'; } }
    else if (action === 'gift') { if (p.money >= 50) { p.money -= 50; per.affinity += 20; this.hearts(ped.pos.clone().setY(1.7)); msg = '“For me? You shouldn’t have.”'; } else msg = '(You’re broke.)'; }
    else if (action === 'insult') { per.affinity -= 18; msg = pick(['“What’s your problem?!”', '“Say that to my face.”', '“Get lost.”']); ped.socialRole = null; if (Math.random() < 0.5) { ped.fightT = 6; } else { ped.flee = 5; } }
    else if (action === 'rob') { const take = per.wealth | 0; p.money += take; g.moneyPop(take, ped.pos.clone().setY(1.4)); per.affinity -= 50; per.wealth = 0; ped.socialRole = null; ped.flee = 6; g.reportCrime(ped.pos, 2, { loud: true }); this.addRep(ped.pos.x, ped.pos.z, -8); msg = '(You took $' + take + '.)'; }
    else if (action === 'recruit') { if (per.affinity >= 50) { ped.ally = true; ped._keep = true; ped.story = true; ped.followPlayer = true; ped.socialRole = null; g.ui.toast(per.first + ' has your back now'); this.log(per.name + ' joined your crew'); return { close: true }; } else msg = '“I barely know you.”'; }
    else if (action === 'propose') { if (this.canPropose(ped)) { this.marry(ped); return { close: true }; } else msg = '“…we barely know each other.”'; }
    per.affinity = clamp(per.affinity, -100, 100); return { msg, close: action === 'rob' || action === 'insult' };
  }
  marry(ped) {
    const g = this.game, p = g.player, per = ped.person; p.spouse = per; p.dating = null; per.spouse = 'You'; p.maxHealth = 120; p.health = p.maxHealth;
    this.hearts(ped.pos.clone().setY(1.9), 0xffd23a); this.hearts(p.pos.clone().setY(1.9), 0xff5fae); this._cheer(ped.pos);
    g.ui.bigCard('JUST MARRIED', 'You & ' + per.name + ' — till death (or divorce) do you part'); this.log('💍 You married ' + per.name); g.ui.toast('💍 Married ' + per.first + '! +max HP, home stipend');
    ped.ally = true; ped._keep = true; ped.story = true; ped.followPlayer = true; ped.socialRole = null;
  }
  divorce() { const g = this.game, p = g.player; if (!p.spouse) return; const name = p.spouse.name, cost = (p.money * 0.5) | 0; p.money -= cost; p.maxHealth = 100; p.health = Math.min(p.health, 100); this.log('💔 You divorced ' + name + ' (−$' + cost + ')'); g.ui.toast('💔 Divorced ' + p.spouse.first + ' — they took $' + cost); p.spouse = null; for (const n of g.npcs) if (n.person && n.person.spouse === 'You' && n.followPlayer) { n.followPlayer = false; n.ally = false; n.flee = 4; } }
  haveKid() { const g = this.game, p = g.player; if (!p.spouse) { g.ui.toast('You need a spouse first'); return; } if (p.kids.length >= 4) { g.ui.toast('The house is already full of kids'); return; } const kid = { name: pick(FIRST_NAMES) + ' ' + (p.spouse.name.split(' ')[1] || 'Bay'), age: 0 }; p.kids.push(kid); this.log('👶 ' + kid.name + ' was born'); g.ui.bigCard('IT’S A KID', p.spouse.first + ' and you welcomed ' + kid.name + ' into the world'); }
  spouseStipend() { const p = this.game.player; if (p.spouse) { const s = 60 + p.kids.length * 25; p.money += s; return s; } return 0; }
  _cheer(pos) { const ac = this.game._actx(); if (!ac) return; try { const t = ac.currentTime; for (let i = 0; i < 5; i++) { const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = 400 + Math.random() * 500; const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t + i * 0.04); g.gain.exponentialRampToValueAtTime(0.06, t + i * 0.04 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.04 + 0.5); o.connect(g); g.connect(ac.destination); o.start(t + i * 0.04); o.stop(t + i * 0.04 + 0.5); } } catch (e) {} }
  onDeath(ped) {
    if (!ped || !ped.person) return; const g = this.game;
    if (g.player.spouse && ped.person.spouse === 'You') { g.player.spouse = null; g.player.maxHealth = 100; this.log('⚰️ Your spouse ' + ped.person.name + ' was killed'); g.ui.toast('⚰️ You lost your spouse'); }
    this.addRep(ped.pos.x, ped.pos.z, -6);
    // anyone nearby who knew them holds a grudge and turns on you if you did it
    for (const n of g.npcs) { if (n === ped || n.dead || n.cop) continue; if (n.pos.distanceTo(ped.pos) < 16 && Math.random() < 0.5) { n.grudgeAt = g.time; n.flee = 0; n.enemy = true; n.attackAlly = null; } }
    if (ped.person.spouse) this.log('⚰️ ' + ped.person.first + ' was killed — ' + ped.person.spouse + ' is now a widow(er)');
  }
  update(dt) {
    for (const e of this.events) this._tick(e, dt);
    this.events = this.events.filter(e => { if (e.done) { this._cleanup(e); return false; } return true; });
    this.eventT -= dt; if (this.eventT <= 0) { this.eventT = rnd(15, 28); if (this.events.length < 2 && !this.game.player.inCar) { const r = Math.random(); this.startEvent(r < 0.26 ? 'mug' : r < 0.46 ? 'argue' : r < 0.62 ? 'brawl' : r < 0.82 ? 'wedding' : 'propose'); } }
  }
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------
