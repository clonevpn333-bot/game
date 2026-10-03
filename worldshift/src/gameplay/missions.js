// Missions built around timeline mechanics. Each mission is a sequence of
// steps; steps can depend on the era, on position, and on Chronicle facts.
import * as THREE from 'three';
import { G, ERA_YEARS } from '../core/state.js';
import { blockRect, LANDMARKS, landmarkCenter, BRIDGES } from '../world/layout.js';
import { seedLotRect, spireRect, SPIRE } from '../world/landmarks.js';

const ERA_KEY = ['1', '2', '3'];
// keeps a story character cowering in place (no wandering off mid-mission)
const HOLD = { update(n) { n.speed = 0; n.state = 'cower'; }, pose() {} };
const sayQ = [];

function say(who, text, dur) {
  sayQ.push([who, text, dur || Math.max(3, text.length * 0.055)]);
}
function sayNow(who, text, dur) { sayQ.length = 0; say(who, text, dur); }

function block(id) { const l = LANDMARKS[id]; return blockRect(l.ci, l.cj); }

// world-space anchor points
function P() {
  const hb = block('home');
  const seed = seedLotRect(LANDMARKS.home.ci, LANDMARKS.home.cj);
  const S = spireRect(LANDMARKS.halvorsen.ci, LANDMARKS.halvorsen.cj);
  const qb = block('quinn');
  const kb = block('kessler_lot');
  const ch = block('cityhall');
  return {
    door: { x: hb.x0 + 12, z: hb.z0 - 1.5 },
    seed: { x: (seed.x0 + seed.x1) / 2, z: (seed.z0 + seed.z1) / 2 },
    arcade: { x: hb.x1 - 10, z: hb.z0 - 3 },
    spire: S,
    drop: { x: (S.x0 + S.x1) / 2 + 6, z: S.z0 + 6 },
    site: { x: (S.x0 + S.x1) / 2, z: S.b.z0 - 4 },
    pier: { x: (qb.x0 + qb.x1) / 2, z: (qb.z0 + qb.z1) / 2 },
    kessler: { x: (kb.x0 + kb.x1) / 2, z: (kb.z0 + kb.z1) / 2 - 10 },
    cityhall: { x: (ch.x0 + ch.x1) / 2, z: ch.z0 + 6 },
    bridge: { x: 480, z: BRIDGES.kessler.z + 4 },
  };
}

export class Missions {
  constructor() {
    this.state = {};      // id -> 'locked' | 'available' | 'active' | 'done'
    this.active = null;
    this.step = 0;
    this.stepT = 0;
    this.data = {};
    this.defs = {};
    this.beacon = this._makeBeacon();
    this.starters = [];
    this.sayT = 0;
    this.choice = null;
    this.pts = null;
    this._define();
    for (const id of Object.keys(this.defs)) this.state[id] = 'locked';
    this._globalInteractions();
  }

  _makeBeacon() {
    const g = new THREE.CylinderGeometry(0.6, 0.6, 400, 12, 1, true);
    g.translate(0, 200, 0);
    const m = new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const mesh = new THREE.Mesh(g, m);
    mesh.visible = false;
    mesh.frustumCulled = false;
    G.scene.add(mesh);
    return mesh;
  }

  // ------------------------------------------------------------- engine --
  unlock(id) {
    if (this.state[id] !== 'locked') return;
    this.state[id] = 'available';
    const d = this.defs[id];
    G.hud.toast(`New mission: ${d.title}${d.where ? ' — ' + d.where : ''}`, 'good', 4);
  }
  start(id) {
    if (this.active) return;
    this.active = id;
    this.state[id] = 'active';
    this.step = 0;
    this.stepT = 0;
    this.data = {};
    const d = this.defs[id];
    G.hud.showBanner(d.title.toUpperCase(), d.subtitle || '', 3.5);
    G.audio.play('objective');
    if (d.onStart) d.onStart(this);
    this._enterStep();
  }
  advance() {
    const d = this.defs[this.active];
    const s = d.steps[this.step];
    if (s && s.exit) s.exit(this);
    this.step++;
    this.stepT = 0;
    G.audio.play('objective');
    if (this.step >= d.steps.length) this.complete();
    else this._enterStep();
  }
  _enterStep() {
    const s = this.defs[this.active].steps[this.step];
    if (s.enter) s.enter(this);
  }
  complete(outcomeText) {
    const id = this.active;
    const d = this.defs[id];
    this.state[id] = 'done';
    this.active = null;
    this.beacon.visible = false;
    G.hud.setObjective(null);
    G.hud.showBanner('MISSION COMPLETE', outcomeText || d.title, 4, '#ffffff');
    G.progress.addXP(d.xp || 100);
    if (d.onComplete) d.onComplete(this);
    G.game.save();
  }
  fail(reason) {
    const id = this.active;
    G.hud.showBanner('MISSION FAILED', reason, 4, '#ff5050');
    this.state[id] = 'available';
    this.active = null;
    this.beacon.visible = false;
    G.hud.setObjective(null);
    const d = this.defs[id];
    if (d.cleanup) d.cleanup(this);
  }

  onInteract(id, it) {
    if (this.active) {
      const s = this.defs[this.active].steps[this.step];
      if (s && s.interact && s.interact(this, id, it)) return;
    }
    const g = this.global[id];
    if (g) g(it);
  }

  update(dt) {
    if (!this.pts) this.pts = P();
    // subtitles queue
    this.sayT -= dt;
    if (this.sayT <= 0 && sayQ.length) {
      const [who, text, dur] = sayQ.shift();
      G.hud.say(who, text, dur);
      this.sayT = dur + 0.2;
    }
    // mission starters
    G.hud.markers = [];
    for (const [id, st] of Object.entries(this.state)) {
      if (st !== 'available' || this.active) continue;
      const d = this.defs[id];
      if (!d.start) continue;
      const s = d.start();
      G.hud.markers.push({ x: s.x, z: s.z, era: s.era, color: '#ffffff', r: 9 });
      if (s.era === G.era && Math.hypot(G.player.pos.x - s.x, G.player.pos.z - s.z) < 4 && !G.player.vehicle) {
        G.hud.setPrompt(`<kbd>E</kbd>Start mission: ${d.title}`);
        G.interact.prompting = true;
        if (G.input.keyPressed('KeyE')) this.start(id);
      }
    }
    if (!this.active) { this.beacon.visible = false; return; }
    const d = this.defs[this.active];
    const s = d.steps[this.step];
    this.stepT += dt;
    const lines = d.steps.map((st, i) => ({ text: typeof st.text === 'function' ? st.text(this) : st.text, done: i < this.step })).slice(Math.max(0, this.step - 1), this.step + 1);
    const key = d.title + this.step + lines.map((l) => l.text).join();
    if (key !== this._objKey) { this._objKey = key; G.hud.setObjective(d.title, lines); }
    const tgt = s.target ? s.target(this) : null;
    if (tgt && (tgt.era === undefined || tgt.era === G.era)) {
      this.beacon.visible = true;
      this.beacon.position.set(tgt.x, tgt.y || 0, tgt.z);
      this.beacon.material.color.set(G.hud && getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#ffb347');
      G.hud.markers.push({ x: tgt.x, z: tgt.z, era: tgt.era, r: 10 });
    } else {
      this.beacon.visible = false;
      if (tgt) G.hud.markers.push({ x: tgt.x, z: tgt.z, r: 10, color: '#888' });
    }
    if (s.update && s.update(this, dt)) this.advance();
  }

  near(pt, r = 6, era = null) {
    const p = G.player.vehicle ? G.player.vehicle.pos : G.player.pos;
    return (era === null || G.era === era) && Math.hypot(p.x - pt.x, p.z - pt.z) < r;
  }

  serialize() { return { state: this.state, active: this.active, step: this.step }; }
  load(d) {
    if (!d) return;
    Object.assign(this.state, d.state);
    if (d.active) {
      // restart the active mission from its beginning (safe resume)
      this.state[d.active] = 'available';
      this.active = null;
    }
  }

  // ------------------------------------------------------------ globals --
  _globalInteractions() {
    const I = G.interact;
    I.on('capsule_dig', (it) => I.digCapsule(it));
    this.global = {
      clinic: () => {
        G.player.heal(999);
        if (!G.chronicle.has('clinic.upgrade', 1)) {
          G.chronicle.set('clinic.upgrade', true, 1);
          G.progress.apply();
          G.player.heal(999);
          sayNow('Dr. Ilse Quinn', 'You… my grandmother described you exactly. The stranger on Pier 9. On the house — and I tuned your harness while you were out.');
          G.hud.toast('Max health increased', 'good');
        } else sayNow('Dr. Ilse Quinn', 'Patched up again. Try not to get shot across three centuries.');
      },
      memorial: () => sayNow('Plaque', '“Mara Quinn, 1972–1996. Paramedic. Killed on Pier 9 helping strangers.”', 5),
      haven_trader: () => {
        const inv = G.inventory;
        if (inv.cash[2] >= 15) {
          inv.cash[2] -= 15;
          inv.add('seed', 2);
          G.combat.give('scrap', 10);
          sayNow('Mother Quinn', 'Seeds and shells. The Quinns pay their debts — even ones that are two hundred years old.');
        } else sayNow('Mother Quinn', 'You look like the stranger from our stories. Bring scrap (⚙15) and we can trade.');
      },
    };
    I.cond('canPlantHome', () => this.active === 'seed' && this.step === 1 && G.era === 0);
    I.cond('atCanopy', () => true);
    I.cond('canPlantDrop', () => this.active === 'deaddrop' && this.step === 1 && G.era === 0 && G.inventory.has('bypass'));
    I.cond('canRetrieveDrop', () => this.active === 'deaddrop' && this.step === 3 && G.era === 1);
    I.cond('vaultOpen', () => this.active === 'deaddrop' && this.step === 4 && G.era === 1);
    I.cond('trailerAvailable', () => G.era === 0 && !G.inventory.has('charges') && (this.active === 'bridge' || this.active === 'foundation'));
    I.cond('canSabotage', () => this.active === 'foundation' && this.step === 1 && G.era === 0);
    I.cond('kesslerUndecided', () => G.era === 0 && !G.chronicle.has('oldkessler.owner', 0));
    I.on('canopy', () => {
      if (this.active === 'seed' && this.step === 3) this.advance();
      else sayNow('', 'The canopy of your tree looks out over two centuries of ruin.');
    });
  }

  // ------------------------------------------------------------ defs ----
  _define() {
    const M = this;
    const pts = () => (M.pts || (M.pts = P()));

    // ======================= 1. THE SEED (tutorial) =======================
    this.defs.seed = {
      title: 'The Seed', subtitle: 'Calloway Block · 1996', xp: 120,
      steps: [
        {
          text: 'Open the package on the Calloway Apartments doorstep',
          target: () => ({ ...pts().door, era: 0 }),
          enter: () => {
            M.data.pkg = G.interact.addDynamic({ ...pts().door, y: 1, r: 3, id: 'pkg', label: 'Open the package', era: 0 });
            say('', 'A package with your name on it. No stamp. No return address. Just: "FOR ASH — OPEN IN 1996".');
          },
          interact: (m, id) => {
            if (id !== 'pkg') return false;
            G.interact.removeDynamic(M.data.pkg);
            G.inventory.add('seed', 3);
            G.inventory.add('spray', 3);
            G.inventory.add('capsule', 1);
            say('A.', 'If you are hearing this, the harness has bonded to you. Good. Listen carefully — you have very little time and all of it.');
            say('A.', 'The city you are standing in will exist for two hundred years. What you do here, in 1996, echoes forward. Everything echoes.');
            say('A.', 'There is a seed in the package. Plant it in the empty lot on this block. Then I will show you what an echo looks like.');
            m.advance();
            return true;
          },
        },
        {
          text: 'Plant the seed in the vacant lot',
          target: () => ({ ...pts().seed, era: 0 }),
          interact: (m, id) => {
            if (id !== 'plant_home') return false;
            G.inventory.take('seed');
            G.chronicle.set('home.tree', true, 0, {
              cause: 'Planted a seed in the Calloway lot (1996)',
              effects: [
                { era: 1, text: 'Calloway Memorial Garden grew around your 51-year-old oak — the tower planned here was never built', at: pts().seed },
                { era: 2, text: 'your seed became a colossus towering over the ruins of Calloway Block', at: pts().seed },
              ],
            });
            G.audio.play('plant', G.player.pos);
            say('A.', 'Done. Now step back from the sapling — give it room to grow — and press 3. Shift to 2189.');
            m.advance();
            return true;
          },
        },
        {
          text: 'Step back, then shift to 2189 [3]',
          update: () => G.era === 2 && !G.shift.active,
          exit: () => {
            say('A.', 'Look up.', 2.5);
            say('A.', 'One hundred and ninety-three years. That tree exists because of you. Nobody else in this world planted it.');
            say('A.', 'Hold Q at any time to peek through the walls of time. And when a path is blocked in one era… look for it in another.');
          },
        },
        {
          text: 'Climb the colossal tree to its canopy',
          target: () => ({ ...pts().seed, era: 2 }),
          update: () => G.era === 2 && G.player.pos.y > 38 && M.near(pts().seed, 12),
        },
      ],
      onComplete: () => {
        say('A.', 'From up here you can see what the city became. The Halvorsen Spire fell first — there, the broken needle. Everything went wrong from that point.');
        say('A.', 'I can\'t fix it. You can. Start small: in 1996, the Red Sevens are shaking down the Neon Galaxy arcade on your block. The owner\'s boy will matter.');
        M.unlock('tommy');
      },
    };

    // ======================= 2. GAME OVER, RED SEVENS =====================
    this.defs.tommy = {
      title: 'Game Over', subtitle: 'Neon Galaxy · 1996', where: 'Neon Galaxy, 1996', xp: 120,
      start: () => ({ ...pts().arcade, era: 0 }),
      onStart: () => {
        const a = pts().arcade;
        M.data.kid = G.crowd.spawn(a.x + 2, a.z - 1, 0, { persistent: true, noRing: true, state: 'cower', name: 'Tommy' });
        if (M.data.kid) { M.data.kid.scale = 0.66; M.data.kid.width = 0.9; M.data.kid.health = 9999; M.data.kid.ai = HOLD; }
        M.data.thugs = [];
        for (let i = 0; i < 3; i++) {
          const n = G.combat.spawnEnemy(a.x - 3 + i * 3, a.z - 5, 0, i === 2 ? 'gunman' : 'thug', { persistent: true, aware: false, colors: { top: new THREE.Color('#8a1010'), sleeve: new THREE.Color('#8a1010') } });
          if (n) M.data.thugs.push(n);
        }
        say('Red Sevens', 'Empty the register, kid. Seven percent, every week, or the machines get smashed.');
      },
      steps: [
        {
          text: 'Stop the Red Sevens shaking down the arcade',
          target: () => ({ ...pts().arcade, era: 0 }),
          update: () => M.data.thugs.every((n) => !n.alive || n.state === 'dead'),
          exit: () => {
            G.combat.give('bat');
            say('', 'One of the Red Sevens dropped a baseball bat. (Mouse wheel to switch weapons.)');
          },
        },
        {
          text: 'Check on the kid',
          target: () => { const k = M.data.kid; return k ? { x: k.pos.x, z: k.pos.z, era: 0 } : null; },
          update: () => M.near(M.data.kid ? M.data.kid.pos : pts().arcade, 3, 0),
          exit: () => {
            say('Tommy (8)', 'You… you beat all three of them! Are you a cop? You don\'t look like a cop. I\'m Tommy. My dad owns this place.');
            say('Tommy (8)', 'I\'m gonna remember you. Like, forever.');
            G.chronicle.set('tommy.saved', true, 0, {
              cause: 'Saved young Tommy Reyes from the Red Sevens (1996)',
              effects: [
                { era: 1, text: 'Tommy grew up to run Old Tom\'s — and he has been waiting 51 years for you', at: pts().arcade },
                { era: 2, text: 'Tom uploaded what was left of himself into a terminal: TOM.exe', at: pts().arcade },
              ],
            });
            if (M.data.kid) { M.data.kid.persistent = false; M.data.kid.ai = null; M.data.kid.state = 'walk'; M.data.kid.ring = null; }
          },
        },
      ],
      onComplete: () => M.unlock('deaddrop'),
    };

    // ======================= 3. DEAD DROP (the heist) =====================
    this.defs.deaddrop = {
      title: 'Dead Drop', subtitle: 'Halvorsen Spire · 1996 ⇄ 2047', where: "Old Tom's, 2047", xp: 300,
      start: () => ({ ...pts().arcade, era: 1 }),
      onStart: () => {
        say('Old Tom (59)', 'Fifty-one years. Same coat. Same face. I knew you\'d walk through that door eventually.');
        say('Old Tom (59)', 'The Halvorsen Spire. Floor three holds a vault — the Continuum core. AEGIS shields the whole block. You can\'t get in. Not in 2047.');
        say('Old Tom (59)', 'But in 1996 the Spire was a construction site. Floor three was bare concrete. Take this — an old bypass box. Hide it in the floor-three wall cavity, by the cable trunk.');
        say('Old Tom (59)', 'Then stand right there and shift forward. Floor three in 1996 is floor three in 2047. You\'ll be inside — and your box will have been waiting in that wall for half a century.');
        G.inventory.add('bypass', 1);
      },
      steps: [
        { text: 'Old Tom gave you the bypass box', update: (m) => m.stepT > 1 },
        {
          text: 'In 1996, climb the Halvorsen site to floor 3 and hide the box in the wall cavity',
          target: () => ({ x: pts().drop.x, y: SPIRE.f3, z: pts().drop.z, era: 0 }),
          interact: (m, id) => {
            if (id !== 'deaddrop_plant') return false;
            G.inventory.take('bypass');
            G.chronicle.set('deaddrop.planted', true, 0, {
              cause: 'Hid a bypass box inside the Spire\'s floor-3 wall (1996)',
              effects: [{ era: 1, text: 'the bypass box has sat inside the Spire\'s wall for 51 years, wired into the security trunk', at: pts().drop }],
            });
            say('', 'The box slides into the cavity next to the cable trunk. Tomorrow a bricklayer will seal it in without a second look.');
            m.advance();
            return true;
          },
        },
        {
          text: 'Stay on floor 3 — shift to 2047 [2]',
          target: () => ({ x: pts().drop.x, y: SPIRE.f3, z: pts().drop.z, era: 0 }),
          update: () => {
            const S = pts().spire;
            const p = G.player.pos;
            return G.era === 1 && !G.shift.active && p.y > SPIRE.f3 - 0.6 && p.x > S.x0 && p.x < S.x1 && p.z > S.z0 && p.z < S.z1;
          },
          exit: () => {
            say('', 'Inside the Halvorsen Spire. The shields hum outside the windows — you walked straight through them by walking through time.');
            const S = pts().spire;
            const cx = (S.x0 + S.x1) / 2, cz = (S.z0 + S.z1) / 2;
            M.data.guards = [
              G.combat.spawnEnemy(cx - 8, cz + 2, 1, 'enforcer', { persistent: true, patrol: [new THREE.Vector3(cx - 10, SPIRE.f3, cz + 2), new THREE.Vector3(cx + 10, SPIRE.f3, cz + 2)] }),
              G.combat.spawnEnemy(cx + 9, S.z1 - 6, 1, 'enforcer', { persistent: true }),
            ];
            for (const gd of M.data.guards) if (gd) gd.pos.y = SPIRE.f3;
          },
        },
        {
          text: 'Pry open the wall panel and recover the box',
          target: () => ({ x: pts().drop.x, y: SPIRE.f3, z: pts().drop.z, era: 1 }),
          interact: (m, id) => {
            if (id !== 'deaddrop_retrieve') return false;
            say('', 'Dust, mouse droppings, and your box — yellowed and corroded, but the indicator still blinks after 51 years.');
            G.chronicle.set('spire.security_down', true, 1, { cause: 'Your 51-year-old bypass box crashed Spire security (2047)' });
            G.chronicle.set('spire.vault_open', true, 1);
            G.audio.play('consequence');
            m.advance();
            return true;
          },
        },
        {
          text: 'Take the Continuum data core from the vault',
          target: () => { const S = pts().spire; return { x: (S.x0 + S.x1) / 2 - 8, y: SPIRE.f3, z: S.z1 - 4, era: 1 }; },
          interact: (m, id) => {
            if (id !== 'vault_core') return false;
            G.inventory.add('core', 1);
            G.chronicle.set('spire.core_taken', true, 1, { cause: 'Stole the Continuum core from the Halvorsen Spire (2047)' });
            G.authority.raise(1, 3, G.player.pos);
            G.hud.toast('ALARM — AEGIS lockdown', 'warn');
            say('Old Tom (59)', 'You did it! Now get out — AEGIS will flood that tower. And remember: they can\'t chase you into a year they don\'t exist in.');
            m.advance();
            return true;
          },
        },
        {
          text: () => `Escape — lose your AEGIS wanted level${G.authority.level(1) ? ` (${G.authority.level(1)})` : ''}`,
          update: () => { if (G.era !== 1 && !G.shift.active) { G.authority.clear(1); return true; } return G.authority.level(1) === 0; },
        },
      ],
      onComplete: () => {
        say('A.', 'The core is decrypting. It will take time. Meanwhile — the city has other wounds. Pier 9, 1996. A paramedic named Mara Quinn dies there tonight. She doesn\'t have to.');
        M.unlock('mara');
        M.unlock('kessler');
        M.unlock('bridge');
        setTimeout(() => M.unlock('foundation'), 45000);
      },
    };

    // ======================= 4. PIER 9 (save a person) =====================
    this.defs.mara = {
      title: 'Pier 9', subtitle: 'Waterfront · 1996', where: 'Pier 9, 1996', xp: 200,
      start: () => ({ ...pts().pier, era: 0 }),
      onStart: () => {
        const q = pts().pier;
        M.data.mara = G.crowd.spawn(q.x - 4, q.z + 2, 0, { persistent: true, noRing: true, state: 'cower', name: 'Mara', colors: { top: new THREE.Color('#d8e0e8'), sleeve: new THREE.Color('#d8e0e8'), legs: new THREE.Color('#2a3a5a') } });
        if (M.data.mara) { M.data.mara.health = 9999; M.data.maraHP = 100; M.data.mara.ai = HOLD; }
        M.data.gunmen = [];
        for (let i = 0; i < 4; i++) {
          const n = G.combat.spawnEnemy(q.x + 18 + i * 2, q.z - 14 + i * 4, 0, i % 2 ? 'gunman' : 'thug', { persistent: true, aware: true, colors: { top: new THREE.Color('#8a1010'), sleeve: new THREE.Color('#8a1010') } });
          if (n) M.data.gunmen.push(n);
        }
        say('Mara Quinn', 'Stay back! I\'m a paramedic — I just came to help that man, I didn\'t see anything!');
      },
      steps: [
        {
          text: () => `Protect Mara Quinn (${Math.max(0, Math.round(M.data.maraHP || 0))}%)`,
          target: () => ({ ...pts().pier, era: 0 }),
          update: (m, dt) => {
            const alive = M.data.gunmen.filter((n) => n.alive && n.state !== 'dead');
            const mara = M.data.mara;
            if (mara && G.era === 0) {
              for (const g of alive) if (g.pos.distanceTo(mara.pos) < 24) M.data.maraHP -= dt * 1.6;
            }
            if (M.data.maraHP <= 0) {
              mara.health = 1;
              G.crowd.damage(mara, 10, null);
              G.chronicle.set('mara.dead', true, 0, {
                cause: 'Mara Quinn died on Pier 9 (1996)',
                effects: [
                  { era: 1, text: 'only a memorial plaque remembers Mara Quinn on Pier 9', at: pts().pier },
                  { era: 2, text: 'with no Quinn line, raiders hold Pier 9', at: pts().pier },
                ],
              });
              M.complete('Mara Quinn did not survive. The future will remember that, too.');
              return false;
            }
            return alive.length === 0;
          },
          exit: () => {
            say('Mara Quinn', 'You saved my life. I— thank you. I\'m going to have a family someday, you know. I\'ll tell them about you.');
            G.chronicle.set('mara.saved', true, 0, {
              cause: 'Saved Mara Quinn on Pier 9 (1996)',
              effects: [
                { era: 1, text: 'Dr. Ilse Quinn — Mara\'s granddaughter — runs the Quinn Clinic on Pier 9', at: pts().pier },
                { era: 2, text: 'Haven, a settlement founded by the Quinn line, thrives on Pier 9', at: pts().pier },
              ],
            });
            if (M.data.mara) { M.data.mara.persistent = false; M.data.mara.ai = null; }
          },
        },
      ],
      cleanup: () => { for (const n of M.data.gunmen || []) n.persistent = false; },
    };

    // ======================= 5. COMMON GROUND (land ownership) =============
    this.defs.kessler = {
      title: 'Common Ground', subtitle: 'Old Kessler · 1996', where: 'Kessler Commons, 1996', xp: 180,
      start: () => ({ ...pts().kessler, era: 0 }),
      onStart: () => {
        say('Ruth Okafor (Kessler Trust)', 'Halvorsen Development wants the whole Commons. They filed a claim. Our deed is in the City Hall archive — if it\'s registered before Friday, the land stays ours. Forever.');
        say('Halvorsen agent', '(on the phone) …or, friend, you could lose that deed somewhere. Mr. Halvorsen pays well for misplaced paperwork.');
      },
      steps: [
        {
          text: 'Retrieve the Trust\'s deed from the City Hall archive (1996)',
          target: () => ({ ...pts().cityhall, era: 0 }),
          enter: () => { M.data.deed = G.interact.addDynamic({ ...pts().cityhall, y: 1, r: 4, id: 'deed', label: 'Collect the Kessler deed', era: 0 }); },
          interact: (m, id) => {
            if (id !== 'deed') return false;
            G.interact.removeDynamic(M.data.deed);
            G.inventory.add('deed');
            m.advance();
            return true;
          },
        },
        {
          text: 'Decide: deliver the deed to the Trust — or sell it to Halvorsen',
          target: () => ({ ...pts().kessler, era: 0 }),
          update: (m) => {
            if (!M.near(pts().kessler, 8, 0) || M.choice) return false;
            M.choice = true;
            G.menus.choice('Who gets Kessler Commons?', [
              { label: 'Deliver the deed to the Kessler Trust', fn: () => {
                G.chronicle.set('oldkessler.owner', 'trust', 0, {
                  cause: 'Secured Kessler Commons for the community Trust (1996)',
                  effects: [
                    { era: 1, text: 'Old Kessler became Kessler Gardens — terraces and vertical farms', at: pts().kessler },
                    { era: 2, text: 'the Rootfolk tend a living grove where the Commons stood', at: pts().kessler },
                  ],
                });
                say('Ruth Okafor', 'Registered. It\'s ours. Our grandchildren will grow up here.');
                G.inventory.take('deed');
                M.choice = null;
                m.advance();
              } },
              { label: 'Sell the deed to Halvorsen ($500)', fn: () => {
                G.chronicle.set('oldkessler.owner', 'halvorsen', 0, {
                  cause: 'Sold the Kessler deed to Halvorsen Development (1996)',
                  effects: [
                    { era: 1, text: 'Halvorsen megablocks swallowed Old Kessler', at: pts().kessler },
                    { era: 2, text: 'the megablocks of Old Kessler stand empty, haunted by machines', at: pts().kessler },
                  ],
                });
                G.inventory.addMoney(500, 0);
                G.inventory.take('deed');
                say('Halvorsen agent', 'Pleasure doing business. Mr. Halvorsen will build something magnificent.');
                M.choice = null;
                m.advance();
              } },
            ]);
            return false;
          },
        },
      ],
    };

    // ======================= 6. BURN THE BRIDGE ===========================
    this.defs.bridge = {
      title: 'Burn the Bridge', subtitle: 'Kessler Bridge · 1996 → 2189', where: 'TOM.exe, 2189', xp: 220,
      start: () => ({ ...pts().arcade, era: 2 }),
      onStart: () => {
        say('TOM.exe', 'H-hello, old friend. Tom is… mostly gone. I am what he saved of himself. I remember you saving a little boy.');
        say('TOM.exe', 'The Bridge Kings hold Kessler Bridge. They tax water, children, lives. They exist because that bridge exists.');
        say('TOM.exe', 'In 1996 the Halvorsen site trailer holds demolition charges. Three charges on the 1996 bridge piers. No bridge — no Kings.');
      },
      steps: [
        {
          text: 'Steal demolition charges from the Halvorsen site trailer (1996)',
          target: () => { const S = pts().spire; return { x: S.b.x0 + 8, z: S.b.z1 - 4, era: 0 }; },
          interact: (m, id) => {
            if (id !== 'trailer_charges') return false;
            G.inventory.add('charges', 3);
            G.events.emit('crime', { kind: 'trespass', pos: G.player.pos.clone() });
            m.advance();
            return true;
          },
        },
        {
          text: () => `Plant charges on the Kessler Bridge (${3 - (M.data.planted || 0)} left)`,
          target: () => ({ ...pts().bridge, era: 0 }),
          enter: () => {
            M.data.planted = 0;
            M.data.spots = [420, 480, 540].map((x, i) => G.interact.addDynamic({ x, y: 1, z: BRIDGES.kessler.z + 3, r: 3, id: 'charge' + i, label: 'Plant charge', era: 0 }));
          },
          interact: (m, id) => {
            if (!id.startsWith('charge')) return false;
            const i = +id.slice(6);
            G.interact.removeDynamic(M.data.spots[i]);
            G.inventory.take('charges');
            M.data.planted++;
            G.audio.play('click');
            return true;
          },
          update: () => M.data.planted >= 3,
        },
        {
          text: 'Get clear (60 m) and detonate [E]',
          update: (m) => {
            const far = Math.hypot(G.player.pos.x - 480, G.player.pos.z - BRIDGES.kessler.z) > 60;
            if (far && G.era === 0) {
              G.hud.setPrompt('<kbd>E</kbd>Detonate');
              G.interact.prompting = true;
              if (G.input.keyPressed('KeyE')) {
                for (const x of [420, 480, 540]) G.fx.explosion(new THREE.Vector3(x, 1, BRIDGES.kessler.z), 2);
                G.audio.play('explosion', G.player.pos);
                G.cam.shake(0.8);
                G.events.emit('crime', { kind: 'explosion', pos: new THREE.Vector3(480, 0, BRIDGES.kessler.z) });
                G.chronicle.set('kessler_bridge.destroyed', true, 0, {
                  cause: 'Blew up the Kessler Bridge (1996)',
                  effects: [
                    { era: 1, text: 'the Kessler Bridge was never rebuilt — only its piers remain', at: pts().bridge },
                    { era: 2, text: 'with no bridge to rule, the Bridge Kings never rose', at: pts().bridge },
                  ],
                });
                return true;
              }
            }
            return false;
          },
        },
      ],
    };

    // ======================= 7. FOUNDATION (finale) =======================
    this.defs.foundation = {
      title: 'Foundation', subtitle: 'Halvorsen Site · 1996', where: "Old Tom's, 2047", xp: 500,
      start: () => ({ ...pts().arcade, era: 1 }),
      onStart: () => {
        say('Old Tom (59)', 'The core cracked open. Continuum wasn\'t a product — it was an engine to fold the timeline. They\'ll run it in 2061. That\'s the Collapse.');
        say('Old Tom (59)', 'You can\'t stop them in 2047. But the Spire stands on a foundation poured in 1996.');
        say('Old Tom (59)', 'If there is no Spire… there is no Continuum. And maybe no AEGIS either. I don\'t know what the city becomes. Nobody does.');
      },
      steps: [
        {
          text: 'Steal demolition charges from the site trailer (1996)',
          target: () => { const S = pts().spire; return { x: S.b.x0 + 8, z: S.b.z1 - 4, era: 0 }; },
          update: () => G.inventory.has('charges'),
          interact: (m, id) => {
            if (id !== 'trailer_charges') return false;
            G.inventory.add('charges', 3);
            return true;
          },
        },
        {
          text: 'Set the charges on the foundation core',
          target: () => { const S = pts().spire; return { x: (S.x0 + S.x1) / 2, z: (S.z0 + S.z1) / 2 + 4, era: 0 }; },
          interact: (m, id) => {
            if (id !== 'foundation') return false;
            G.inventory.take('charges');
            M.data.timer = 12;
            m.advance();
            return true;
          },
        },
        {
          text: () => `Get clear! ${Math.max(0, Math.ceil(M.data.timer || 0))}s`,
          update: (m, dt) => {
            M.data.timer -= dt;
            if (M.data.timer > 0) return false;
            const S = pts().spire;
            const c = new THREE.Vector3((S.x0 + S.x1) / 2, 2, (S.z0 + S.z1) / 2);
            G.fx.explosion(c, 3);
            G.audio.play('explosion', c);
            G.combat.radialDamage(c, 25, 200, null);
            G.chronicle.set('spire.prevented', true, 0, {
              cause: 'Destroyed the Halvorsen Spire\'s foundation (1996)',
              effects: [
                { era: 1, text: 'the Halvorsen Spire was never built — Founders Green stands in its place', at: { x: c.x, z: c.z } },
                { era: 1, text: 'without Continuum money, AEGIS never existed: the Civic Police keep order', at: { x: c.x, z: c.z } },
                { era: 2, text: 'the Collapse never had an epicentre — a forest grows where the Spire would have fallen', at: { x: c.x, z: c.z } },
              ],
            });
            G.chronicle.set('aegis.gone', true, 1);
            return true;
          },
        },
        { text: 'See what you have done — shift to 2047 or 2189', update: () => G.era !== 0 && !G.shift.active },
      ],
      onComplete: () => {
        G.hud.showBanner('THE FUTURE IS UNWRITTEN', 'Keep exploring — every era remembers what you did.', 6, '#9dff6a');
        say('A.', 'There. Do you see it? The skyline is different. You did that. Not history. You.');
      },
    };
  }
}

export { say };
