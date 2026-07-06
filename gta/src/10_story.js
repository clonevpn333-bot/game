// ============================================================================
// NEON BAY · 10_story.js — story mode: mission engine, campaign chapters, characters
// Concatenated in order by build.mjs into one module (shared scope, no cross-imports).
// ============================================================================
class Story {
  constructor(game) { this.game = game; this.mi = -1; this.state = 'idle'; this.marker = null; this.giver = null; this.targets = null; }
  begin() {
    this.chars = {}; const c = this.game.city, P = c.places;
    this.spawnChar('tony', P.tonyDiner.x + 8, P.tonyDiner.z + c.lot / 2 - 4, 0x7a4fb0);   // outside his diner, Little Havana
    this.spawnChar('sal', P.salGarage.x, P.salGarage.z + c.lot / 2 - 4, 0xc8a23a);        // the docklands garage
    this.spawnChar('dezzy', P.dezzyClub.x, P.dezzyClub.z + c.lot / 2 - 4, 0xff5aa0);      // her club on Ocean Drive
    this.marker = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 95, 14), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.28, depthWrite: false }));
    this.marker.visible = false; this.game.scene.add(this.marker);
    const sv = this.game.saveData; if (sv && sv.ch > 0) this.mi = Math.min(sv.ch, MISSIONS.length) - 1; // resume saved chapter
    if (this.freeRoam) { this.state = 'done'; this.setChapter(null); this.setObjective('Free roam — P phone · F cars · E shops'); setTimeout(() => { if (this.freeRoam) this.setObjective(''); }, 14000); return; }
    this.next();
  }
  spawnChar(id, x, z, shirt) { const p = new Ped(this.game, x, z, false); p.persona.shirt = shirt; p.story = true; p.timer = 1e9; p.wander = null; this.game.npcs.push(p); this.chars[id] = p; return p; }
  next() { this.mi++; this.game.saveGame(); const m = MISSIONS[this.mi]; if (!m) { this.state = 'done'; this.setObjective(''); this.setChapter(null); this.game.ui.bigCard('YOU RUN THIS TOWN', 'Free roam — Neon Bay is yours.'); return; } this.state = 'goMeet'; this._setupMeet(m); }
  setChapter(m) { const R = ['I', 'II', 'III']; if (this.game.ui.el.chapter) this.game.ui.el.chapter.textContent = m ? ('ACT ' + R[(m.act || 1) - 1] + ' · CH ' + (this.mi + 1) + '/' + MISSIONS.length + ' · ' + (m.title || '')) : 'THE BAY IS YOURS'; }
  _setupMeet(m) {
    this.setChapter(m);
    if (m.act && m.act !== this._act) { this._act = m.act; this.game.ui.bigCard('ACT ' + ['I', 'II', 'III'][m.act - 1], ACT_TITLES[m.act - 1]); }
    const g = this.chars[m.giver]; this.giver = g; if (g) { this.marker.position.set(g.pos.x, 48, g.pos.z); this.marker.visible = true; this.marker.material.color.set(0xffd23a); } this.setObjective('Go see ' + CHARS[m.giver].name + (m.where ? ' — ' + m.where : ''));
  }
  cleanupStep() {
    if (this.pickupMesh) { this.game.scene.remove(this.pickupMesh); this.pickupMesh = null; }
    if (this.chaseCar && !this.chaseCar.removeMe) { this.chaseCar.fleeing = false; } this.chaseCar = null;
    if (this.ally && !this.ally._keep) { this.ally.removeMe = true; } this.ally = null;
    this._armed = null; this._photoT = 0;
  }
  startStep() {
    const m = MISSIONS[this.mi], s = m.steps[this.si]; this.targets = null;
    if (s.at) { const wp = this.wp(s.at); this.marker.position.set(wp.x, 48, wp.z); this.marker.visible = true; this.marker.material.color.set(s.type === 'kill' || s.type === 'chase' ? 0xff5a5a : s.type === 'protect' ? 0x4dff9e : s.type === 'photo' ? 0x2fe6ff : 0xffd23a); this.stepPos = wp; } else { this.marker.visible = false; this.stepPos = null; }
    if (s.type === 'kill') { this.targets = []; for (let i = 0; i < (s.count || 1); i++) { const t = new Ped(this.game, this.stepPos.x + rnd(-4, 4), this.stepPos.z + rnd(-4, 4), false); t.persona.shirt = 0x882222; t.hp = 50; t.story = true; t.enemy = true; this.game.npcs.push(t); this.targets.push(t); } }
    else if (s.type === 'chase') {
      // spawn the target ON the road network (nearest lane to the waypoint), never inside a building plot
      const c = this.game.city, nn = c.net.nodes[c.nearestNode(this.stepPos.x, this.stepPos.z)];
      const sx = nn ? nn.position.x : this.stepPos.x, sz = nn ? nn.position.z : this.stepPos.z;
      const car = new Car(this.game, sx, sz, new THREE.Vector3(0, 0, 1), 0x1a1a22, true); car.fleeing = true; car.cruise = 26; car.maxSpd = 38; car._rams = 0; car.taxi = false; car._anchor();
      const dv = car.root.userData.driver; if (dv) { dv.visible = true; dv.children[0].material = mat(0x882222); } this.game.cars.push(car); this.chaseCar = car;
      this.marker.position.set(sx, 48, sz); this.stepPos = new THREE.Vector3(sx, 0, sz);
    }
    else if (s.type === 'pickup') { const pk = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.3), mat(s.color || 0xffd23a, { emissive: s.color || 0xd4a92f, emissiveIntensity: 1.3 })); pk.position.set(this.stepPos.x, 1.2, this.stepPos.z); this.game.scene.add(pk); this.pickupMesh = pk; }
    else if (s.type === 'protect') { const a = new Ped(this.game, this.stepPos.x, this.stepPos.z, false); a.persona.shirt = 0x2f8f6a; a.hp = 70; a.story = true; a.ally = true; this.game.npcs.push(a); this.ally = a; this.targets = []; for (let i = 0; i < (s.count || 3); i++) { const t = new Ped(this.game, this.stepPos.x + rnd(-8, 8), this.stepPos.z + rnd(-8, 8), false); t.persona.shirt = 0x882222; t.hp = 45; t.story = true; t.enemy = true; t.attackAlly = a; this.game.npcs.push(t); this.targets.push(t); } }
    this._stepT0 = this.game.time; this._photoT = 0;
    this.setObjective(s.text);
  }
  wp(at) { if (at.char) { const ch = this.chars[at.char]; return new THREE.Vector3(ch.pos.x, 0, ch.pos.z); } if (at.place) { const p = this.game.city.places[at.place]; return new THREE.Vector3(p.x, 0, p.z); } return new THREE.Vector3(at.x, 0, at.z); }
  _delay(sec, fn) { this._pendT = sec; this._pendFn = fn; }                    // game-time timer, not wall-clock — robust across hitches/pauses
  failStep(why) { this.game.ui.bigCard('MISSION FAILED', why || ''); this.game.ui.toast('Restarting from checkpoint...'); this.cleanupStep(); this._failing = true; this._delay(1.8, () => { this._failing = false; if (this.state === 'steps') this.startStep(); }); }
  update(dt) {
    if (this._pendT != null) { this._pendT -= dt; if (this._pendT <= 0) { const fn = this._pendFn; this._pendT = null; this._pendFn = null; if (fn) fn(); } }
    if (this.state === 'cutscene' || this.state === 'done' || this.state === 'idle') return;
    const g = this.game, p = g.player, m = MISSIONS[this.mi];
    if (!m) return;
    if (this.state === 'goMeet') { if (this.giver && p.pos.distanceTo(this.giver.pos) < 4.5) { this.game.ui.bigCard('CHAPTER ' + (this.mi + 1), m.title || ''); this.play(m.before, this.giver, () => { this.si = 0; if (m.steps && m.steps.length) { this.state = 'steps'; this.startStep(); } else this.finish(); }); } this._objDist(this.giver && this.giver.pos); return; }
    if (this.state === 'steps') {
      const s = m.steps[this.si]; if (!s || this._failing) return; let done = false;
      // per-step timer (soft fail → restart the step)
      if (s.limit) { const left = Math.ceil(s.limit - (this.game.time - this._stepT0)); if (left <= 0) { this.failStep('Out of time'); return; } this._stepTimeLeft = left; }
      if (s.type === 'goto') done = this.stepPos && dist2(p.pos, this.stepPos) < 5;
      else if (s.type === 'getcar') done = !!p.inCar && (!s.boat || p.inCar.boat) && (!s.needBoat || p.inCar.boat);
      else if (s.type === 'drive') done = p.inCar && this.stepPos && dist2(p.pos, this.stepPos) < 7;
      else if (s.type === 'evade') { if (this._armed == null) { this._armed = true; if (s.wanted) g.addWanted(s.wanted); } done = p.wanted <= 0; }
      else if (s.type === 'rob') done = (g.lastBankRobT || 0) > (this._stepT0 || 1e18);
      else if (s.type === 'kill') done = this.targets && this.targets.every(t => t.dead);
      else if (s.type === 'chase') { const c = this.chaseCar; if (c) { this.marker.position.set(c.pos.x, 48, c.pos.z); if (this.stepPos) this.stepPos.set(c.pos.x, 0, c.pos.z); if (c.dead || c._rams >= 2 || (c.hp != null && c.hp <= 0)) done = true; } else done = true; }
      else if (s.type === 'pickup') { if (this.pickupMesh) { this.pickupMesh.rotation.y += dt * 2; this.pickupMesh.position.y = 1.2 + Math.sin(this.game.time * 2.5) * 0.12; } done = this.stepPos && dist2(p.pos, this.stepPos) < 2.6; }
      else if (s.type === 'photo') { const near = this.stepPos && dist2(p.pos, this.stepPos) < 12; if (near && g.input.p('KeyE')) { this._photoT = 1; g.ui.flashPhoto && g.ui.flashPhoto(); g.ui.toast('📷 Snapshot taken'); } done = this._photoT > 0; }
      else if (s.type === 'protect') { if (this.ally && this.ally.dead) { this.failStep('Your contact was killed'); return; } done = this.targets && this.targets.every(t => t.dead); }
      // live objective text (distance / counters / timer)
      let label = s.text;
      if (s.type === 'kill' && this.targets) label = s.text + '  (' + this.targets.filter(t => t.dead).length + '/' + this.targets.length + ')';
      else if (s.type === 'protect' && this.targets) label = s.text + '  (' + this.targets.filter(t => t.dead).length + '/' + this.targets.length + ')';
      else if (s.type === 'photo' && this.stepPos && dist2(p.pos, this.stepPos) < 12) label = s.text + '  — press E';
      if (s.limit && this._stepTimeLeft != null) label += '  ⏱ ' + this._stepTimeLeft + 's';
      this.setObjective(label);
      if ((s.type === 'goto' || s.type === 'drive' || s.type === 'pickup' || s.type === 'chase') && this.stepPos) this._objDist(this.stepPos);
      if (done) { this.cleanupStep(); this.si++; if (m.steps[this.si]) this.startStep(); else this.finish(); }
    }
  }
  finish() { const m = MISSIONS[this.mi]; this.cleanupStep(); this.play(m.after, this.giver, () => { this.game.player.money += m.reward || 0; if (m.gun) { this.game.player.hasGun = true; this.game.player.weapon = 'pistol'; this.game.ui.toast('★ Pistol acquired — Left-click to fire, 1/2 to switch'); } this.game.ui.bigCard('MISSION PASSED', (m.reward ? '+$' + m.reward : '')); this.game.ui.news(m.news || ('Witnesses report a new name moving through the Bay after "' + (m.title || '').toLowerCase() + '" rumors — NBPD declines to comment')); this.marker.visible = false; this._delay(2.6, () => this.next()); }); }
  play(lines, who, done) { this.state = 'cutscene'; this.marker.visible = false; this.game.startCutscene(who); this.game.ui.dialogue(lines || [], () => { this.game.endCutscene(); this.state = 'steps'; done && done(); }); }
  _objDist(v) { if (!v) return; const d = Math.round(this.game.player.pos.distanceTo(v)); const base = this._lastObj || ''; this.game.ui.el.obj.textContent = base.replace(/\s+\d+m.*/, '') + '   ' + d + 'm →'; }
  setObjective(t) { this._lastObj = t; this.game.ui.el.obj.textContent = t; }
}
function dist2(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
const CHARS = { tony: { name: 'Tony Marenco', col: '#7fd0ff' }, sal: { name: 'Sal Greco', col: '#ffd23a' }, dezzy: { name: 'Dezzy Vale', col: '#ff7eb0' }, victor: { name: 'Victor Salcido', col: '#ff5a5a' }, you: { name: 'You', col: '#c39bff' } };
const ACT_TITLES = ['FRESH OFF THE PLANE', 'THE COST OF DOING BUSINESS', 'KING TIDE'];
// ---- Neon Bay: three acts, twelve chapters — chases, stakeouts, escorts, heists, a boat raid, a finale ----
const MISSIONS = [
  { act: 1, giver: 'tony', reward: 200, title: 'TOUCHDOWN', where: "his diner in Little Havana",
    before: [['you', "Tony. Ten years, and you still greet family like you owe them money."], ['tony', "Because I do, cuz. I'm into Victor Salcido for fifty grand and the man doesn't do payment plans."], ['tony', "Welcome to Neon Bay. Havana's home. The beach across the bay is where the money struts and the trouble tans."], ['you', "Family's family. Point me at the trouble."], ['tony', "Sal first. Docklands garage, south side. He turns hot cars into cold cash — and he'll size you up."]],
    steps: [], after: [['tony', "Go on. Sal's expecting Tony's famous cousin. Try not to disappoint him in the first minute."]] },
  { act: 1, giver: 'sal', reward: 500, title: "SAL'S CUT", gun: true, where: 'the docklands garage',
    before: [['sal', "So you're the cousin. Tony talks big, owes bigger — runs in the blood, I hear."], ['sal', "Prove your hands are worth feeding. Lift any ride, bring it to my bay. No scratches, no blues on your tail."], ['you', "One clean car, coming up."]],
    steps: [{ type: 'getcar', text: 'Steal any car — walk up and press F' }, { type: 'drive', text: "Deliver it clean to Sal's garage", at: { char: 'sal' }, limit: 90 }],
    after: [['sal', "Smooth. Barely a fingerprint on it. Here's your cut — and a little insurance."], ['sal', "A piece. This town bites; you bite back. Left-click fires, 1 holsters, 2 draws."]] },
  { act: 1, giver: 'tony', reward: 900, title: 'HOT WHEELS', where: 'Little Havana',
    before: [['tony', "One of Victor's bagmen is skipping town with a list of everyone who owes him — my name's on it, top of the page."], ['tony', "He's in a black coupe running the Havana blocks. Get a car and run him off the road before he reaches the causeway."], ['you', "He won't make the bridge."]],
    steps: [{ type: 'getcar', text: 'Grab a car for the chase' }, { type: 'chase', text: "Ram the bagman's black coupe until it's wrecked", at: { place: 'tonyDiner' } }, { type: 'evade', text: 'Ditch the wreck and lose any heat', wanted: 2 }],
    after: [['tony', "You drive like you were born running from something. The list burns, my name with it. For now."], ['tony', "Every job you pull chips at what I owe. Family pays family's debts — then we bury the collector."]] },
  { act: 2, giver: 'dezzy', reward: 1200, title: 'THE VELVET ROOM', where: 'her club on Ocean Drive',
    before: [['dezzy', "So you're the Havana boy they're whispering about. Dezzy Vale — my club, my rules, my ruined Friday."], ['dezzy', "Salcido's goons showed up early to 'tax' me and started breaking my people instead of my bottles."], ['you', "Stay behind me."], ['dezzy', "Charming AND useful. Keep me breathing and clear them out."]],
    steps: [{ type: 'protect', text: "Keep Dezzy alive — drop Salcido's crew", count: 3, at: { char: 'dezzy' } }],
    after: [['dezzy', "First quiet night in a year. Stick around, hotshot — Ocean Drive could use a new landlord."]] },
  { act: 2, giver: 'sal', reward: 1400, title: 'STAKEOUT', where: 'the docklands garage',
    before: [['sal', "Before we hit Victor we need to know his moves. His lieutenants meet on the north strip at dusk."], ['sal', "Get close, get pictures — quiet. Phone camera. You get spotted, they scatter and we're blind."], ['you', "Point, shoot, gone."]],
    steps: [{ type: 'goto', text: 'Get to the north strip', at: { place: 'strip' } }, { type: 'photo', text: 'Photograph the meeting — E when close', at: { place: 'strip' } }],
    after: [['sal', "Reyes, the accountant, two shooters. That's the whole rotten table. Now we know where to push."]] },
  { act: 2, giver: 'tony', reward: 1800, title: 'DOCK MONEY', where: 'Little Havana',
    before: [['tony', "Victor's cash sails out of the container yards every night. Hit the runners, take the bag."], ['tony', "It's not about the money — it's the message. The Bay isn't his anymore."]],
    steps: [{ type: 'kill', text: "Take out Victor's runners at the docks", count: 4, at: { place: 'docks' } }, { type: 'pickup', text: 'Grab the cash bag they dropped', at: { place: 'docks' }, color: 0x3ae08a }, { type: 'evade', text: 'Get the bag clear of the docks', wanted: 2 }],
    after: [['tony', "Ha! That'll sting him where he feels it. He's gonna come looking — be somewhere loud when he does."]] },
  { act: 2, giver: 'dezzy', reward: 2200, title: 'BAD BLOOD', where: 'Ocean Drive',
    before: [['dezzy', "They grabbed Tony outside the diner. He's alive — shaken, not sliced — but the message landed."], ['dezzy', "Reyes runs the north strip for Victor. Cut the head off and the crew loses its nerve."]],
    steps: [{ type: 'kill', text: 'Take down Reyes and his guards', count: 3, at: { place: 'strip' } }, { type: 'evade', text: 'Get clear before the heat lands', wanted: 3, limit: 75 }],
    after: [['dezzy', "War declared, first battle won. Victor won't send men next time. He'll come himself."]] },
  { act: 2, giver: 'sal', reward: 2600, title: 'WITHDRAWAL', where: 'the docklands garage',
    before: [['sal', "Victor launders his street money through Bay Mutual — a counter box under a shell name."], ['sal', "Walk in flashing that piece and empty the drawers. His whole month goes up in smoke."], ['you', "A withdrawal. My favorite kind of banking."]],
    steps: [{ type: 'goto', text: 'Get to Bay Mutual downtown', at: { place: 'bank' } }, { type: 'rob', text: 'Rob the counter — E inside with your pistol drawn', at: { place: 'bank' } }, { type: 'evade', text: 'Lose the heat before it sticks', wanted: 0, limit: 90 }],
    after: [['sal', "Beautiful. Victor's crews don't get paid this week — and unpaid muscle stops being muscle."], ['sal', "Tony's debt? Interest's frozen. The principal dies with Victor."]],
    news: 'Bay Mutual raided in daylight heist — NBPD reviewing how the alarm took eleven minutes' },
  { act: 3, giver: 'dezzy', reward: 3200, title: 'THE LEDGER', where: 'her club on Ocean Drive',
    before: [['dezzy', "Victor keeps a paper ledger on Isla Privada — his island east of the beach. Every bribe, every badge he owns."], ['dezzy', "Take a boat from Bayside Marina or the east sand. Bring me that book and his police protection evaporates."], ['you', "A pleasure cruise. Back before the ice melts."]],
    steps: [{ type: 'getcar', text: 'Get a boat — F at Bayside Marina or the east shore', needBoat: true }, { type: 'goto', text: 'Cross to Isla Privada', at: { place: 'privado' } }, { type: 'pickup', text: 'Take the ledger from the villa', at: { place: 'privado' }, color: 0xffd23a }, { type: 'goto', text: 'Bring the ledger back to Dezzy', at: { char: 'dezzy' } }],
    after: [['dezzy', "Names, dates, badge numbers. He's naked now — no bought cops left to hide behind."], ['dezzy', "Whatever comes next, it's a fair fight. Make it count."]],
    news: 'LEAKED LEDGER rocks NBPD — a dozen officers suspended over Salcido payroll allegations' },
  { act: 3, giver: 'sal', reward: 3600, title: 'STARFISH SITDOWN', where: 'the docklands garage',
    before: [['sal', "Victor wants a peace sit-down on Starfish Island. Old money, gated, one way in."], ['sal', "It's a trap, obviously. So walk in ready. His crew won't wait for handshakes."], ['you', "Neither will I."]],
    steps: [{ type: 'goto', text: 'Cross to Starfish Island', at: { place: 'starfish' } }, { type: 'kill', text: 'Fight through the ambush', count: 5, at: { place: 'starfish' } }, { type: 'evade', text: 'Escape Starfish before backup lands', wanted: 3 }],
    after: [['sal', "You walked into his trap and walked out over his men. He's out of moves — and out of friends."]] },
  { act: 3, giver: 'tony', reward: 4000, title: 'THE SETUP', where: 'Little Havana',
    before: [['tony', "Victor's cornered. He's massing what's left on the north causeway — water on both sides, nowhere to run."], ['tony', "Sal stashed a fast car for you. Get to the waterfront and we end this tonight."]],
    steps: [{ type: 'getcar', text: 'Grab wheels for the run' }, { type: 'drive', text: 'Drive to the bay waterfront', at: { place: 'waterfront' }, limit: 80 }],
    after: [['tony', "He's here. Whole crew. Everything you flew in for, kid — it's tonight."]] },
  { act: 3, giver: 'tony', reward: 10000, title: 'KING TIDE', where: 'Little Havana',
    before: [['tony', "Victor makes his stand on the north causeway. This is the one, cuz."], ['you', "Then let's finish what he started."], ['tony', "For the family. For the Bay."]],
    steps: [{ type: 'kill', text: "Wipe out Victor's guard", count: 4, at: { place: 'finale' } }, { type: 'kill', text: 'Finish Victor Salcido', count: 1, at: { place: 'finale' } }],
    after: [['dezzy', "It's over. Ocean Drive to the docklands — the Bay's ours now."], ['tony', "King of Neon Bay. Debt paid in full. Nobody's paved it with gold yet... give the man a week."]] },
];

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
