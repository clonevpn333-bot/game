'use strict';
// Shared story helpers: station phones, focus views, headphones, death, chapter utilities.

const Common = {
  // camera close-up on something until the player presses E/Esc
  async focus(pos, target, tag) {
    const prev = G.mode;
    G.mode = 'locked'; Interact.enabled = false;
    await Player.camTo(pos, target, 0.7);
    UI.hint('<b style="border:1px solid #777;padding:0 5px">E</b> step back', 30);
    Bus.emit('focus', tag, true);
    await Story.until(() => Input.pressed('KeyE') || Input.pressed('Escape') || Input.pressed('KeyS'));
    Input.consume('KeyE');
    UI.hint(null);
    Bus.emit('focus', tag, false);
    await Player.camTo(null, null, 0.6);
    G.mode = prev === 'locked' ? 'walk' : prev; Interact.enabled = true;
  },
  async listChoice(labels, title) {
    if (title) UI.toast(title, 2.5);
    return UI.choices(labels, { blocking: true, def: labels.length - 1 });
  },
  headphones(on) {
    const L = G.level; if (!L || !L.state) return;
    L.state.headphones = on;
    SND.sfx('click', { f: 1500, bus: 'ui' });
    if (on) {
      SND.muffle(500, 0.35, 0.3);
      if (!L.hpSpeaker) L.hpSpeaker = L.speaker({ direct: true, vol: 0.85, bus: 'radio' });
      L.hpSpeaker.volume(0.85, 0.2);
      if (Radio.ready) Radio.whisperIn.gain.setTargetAtTime((Story.flags.whisperLevel || 0) * 4, SND.now(), 0.3);
      UI.hint('Headphones on — you hear exactly what is going out on the air', 4);
    } else {
      SND.muffle(20000, 1, 0.3);
      if (L.hpSpeaker) L.hpSpeaker.volume(0, 0.2);
      if (Radio.ready) Radio.whisperIn.gain.setTargetAtTime(Story.flags.whisperLevel || 0, SND.now(), 0.3);
    }
    Bus.emit('headphones', on);
  },
  // place player in the level and fade in
  async enter(build, opts, spawn, o = {}) {
    UI.fadeNow(1);
    const L = Engine.loadLevel(build, opts);
    if (L.name === 'station') StationPhone.setup(L);
    if (spawn) { const sp = Array.isArray(spawn) ? spawn : L.spawns[spawn]; Player.place(sp[0], sp[1], sp[2] || 0, sp[3] || 0); }
    Player.setFlashlight(false, true);
    Player.hasFlashlight = !!Story.flags.hasFlashlight;
    if (o.flash && Player.hasFlashlight) Player.setFlashlight(true, true);
    G.mode = 'walk';
    await Story.wait(0.3);
    if (o.fade !== false) UI.fade(0, o.fadeTime || 1.6);
    return L;
  },
  // standard hourly station ID helper: sets mic handler until done
  async stationID(lines) {
    const F = Story.flags;
    return new Promise(res => {
      F.micPrompt = 'Open the mic — station ID';
      F.micHandler = async () => {
        F.micHandler = null; F.micPrompt = null;
        G.mode = 'locked';
        await Player.camTo(new THREE.Vector3(3, 1.25, 5.85), new THREE.Vector3(3.05, 1.2, 6.9), 0.7);
        SND.sfx('switch', { bus: 'ui' }); G.level.setOnAirLight(true); Radio.duck(0.15);
        for (const l of lines) await Story.say('EVAN', l, null, 'radio');
        SND.sfx('switch', { bus: 'ui' }); G.level.setOnAirLight(false); Radio.duck(0.9);
        await Player.camTo(null, null, 0.6);
        G.mode = 'walk';
        res();
      };
    });
  },
  describeEvan() {
    const L = G.level, out = [];
    const winPt = new THREE.Vector3(3, 1.4, 8);
    if (Player.crouching) out.push('Why are you crouching, Evan?');
    if (Player.facing(winPt, 0.6)) out.push('You\'re looking out the window now. You can\'t see me. It\'s the glare. You see yourself.');
    if (Player.holding('mug')) out.push('You\'re still holding your coffee. Your hand\'s not steady.');
    if (L && L.named.lights && !L.named.lights.studio.on) out.push('You turned the big light off. Just the little lamp now. Like Lacey used to.');
    if (L && L.state && L.state.headphones) out.push('You\'ve got the headphones on. One ear.');
    if (L && L.named.doors && L.named.doors.studio.isOpen) out.push('You left the studio door open behind you.');
    if (!out.length) out.push('You\'re standing at the desk. Phone in your left hand. Your right hand is on the edge of the board, by the faders.');
    return out;
  },
};

// ---------------------------------------------------------------------------
const StationPhone = {
  ringing: null,
  inCall: false,
  outgoing: {},
  setup(L) {
    this.ringing = null; this.inCall = false;
    const phones = [['studio', L.named.studioPhone], ['office', L.named.officePhone], ['break', L.named.breakPhone]];
    this.phones = phones;
    for (const [name, ph] of phones) {
      ph.name = name;
      Interact.add(ph.group, {
        prompt: () => this.ringing ? `Answer — LINE ${this.ringing.line}` : (this.inCall ? '' : 'Use the phone'),
        enabled: () => !this.inCall && !Story.flags.phonesDead,
        use: () => this.ringing ? this.answer(ph) : this.dialOut(ph),
      });
    }
    let blinkT = 0;
    L.onUpdate(dt => {
      blinkT += dt;
      for (const [, ph] of phones) {
        ph.lights.forEach((l, i) => {
          let on = false;
          if (this.ringing && this.ringing.line === i + 1) on = (blinkT % 0.6) < 0.3;
          if (this.inCall && this.inCall.line === i + 1) on = true;
          if (this.extraLit && this.extraLit.includes(i + 1)) on = (blinkT % 0.8) < 0.4;
          l.material.color.set(on ? 0xff3311 : 0x220000);
        });
      }
    });
  },
  // returns promise resolving with the phone that answered (or null on timeout)
  ring(line = 1, o = {}) {
    this.stop();
    const L = G.level;
    const loops = [];
    loops.push(L.loop('phoneRing', { pos: new THREE.Vector3(5.6, 1, 4.9), vol: 0.9 }));
    loops.push(L.loop('phoneRing', { pos: new THREE.Vector3(-4.0, 1, 6.0), vol: 0.8 }));
    loops.push(L.loop('oldRing', { pos: new THREE.Vector3(-5.1, 1.3, -4.0), vol: 0.35 }));
    return new Promise(res => {
      this.ringing = { line, loops, res, o };
      if (o.timeout) Story.wait(o.timeout).then(() => { if (this.ringing && this.ringing.res === res) { this.stop(); res(null); } }).catch(() => {});
    });
  },
  stop() { if (this.ringing) { this.ringing.loops.forEach(l => l.stop(0.05)); this.ringing = null; } },
  answer(ph) {
    const r = this.ringing; if (!r) return;
    this.stop();
    r.res(ph);
  },
  // wrap a call: lock player at the phone, show call UI, handset sounds
  async call(line, label, fn, o = {}) {
    this.inCall = { line };
    const prev = G.mode; G.mode = 'locked';
    SND.sfx('pickupPhone', { bus: 'ui' });
    const hiss = SND.loop('lineHiss', { bus: 'voice', vol: o.hiss || 0.6 });
    const t0 = G.time;
    const upd = setInterval(() => { const s = Math.floor(G.time - t0); UI.callUI(`☎ ${line ? 'LINE ' + line + ' — ' : ''}${U.esc(label)} <span class="dur">${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</span>`); }, 250);
    let res;
    try { res = await fn(); }
    finally {
      clearInterval(upd); UI.callUI(null); hiss.stop(0.05);
      if (o.theyHangUp !== false) SND.sfx('lineClick', { bus: 'ui' });
      if (!o.keepHandset) SND.sfx('hangup', { bus: 'ui' });
      this.inCall = false;
      G.mode = prev === 'locked' ? 'walk' : prev;
    }
    return res;
  },
  async dialOut(ph) {
    const F = Story.flags;
    if (F.phonesDead) { await Story.think('Dead. No dial tone. Nothing.'); return; }
    this.inCall = { line: 2 };
    G.mode = 'locked';
    SND.sfx('pickupPhone', { bus: 'ui' });
    const dt = SND.loop('dialTone', { bus: 'voice', vol: 0.5 });
    const names = ['Ray (cell)', 'Home (Mom)', 'Marcy', 'Sheriff (non-emergency)', '911', 'Gas-N-Go', '(hang up)'];
    const i = await UI.choices(names, { blocking: true, def: names.length - 1 });
    dt.stop(0.02);
    this.inCall = false;
    if (i < 0 || i === names.length - 1) { SND.sfx('hangup', { bus: 'ui' }); G.mode = 'walk'; return; }
    const key = ['ray', 'mom', 'marcy', 'sheriff', '911', 'gasngo'][i];
    SND.sfx('dtmf', { digits: ['5415551188', '5415550123', '5415550166', '5415550110', '911', '5415550188'][i], bus: 'voice', vol: 0.5 });
    await Story.wait(key === '911' ? 0.6 : 1.7);
    const h = this.outgoing[key] || DEFAULT_CALLS[key];
    const rb = SND.loop('ringback', { bus: 'voice', vol: 0.45 });
    await Story.wait(h.rings == null ? 4.5 : h.rings);
    rb.stop(0.02);
    G.mode = 'walk';
    await this.call(2, names[i], () => h.fn ? h.fn() : h());
  },
};

const DEFAULT_CALLS = {
  ray: { rings: 7, fn: async () => { await Story.say('RAY', 'This is Ray Tolliver. I\'m not answering. Leave it at the beep.', null, 'phone'); SND.sfx('beep', { bus: 'voice', f: 1000, dur: 0.4 }); await Story.say('EVAN', '...Hey Ray, it\'s Evan. Nothing\'s on fire. Never mind.'); } },
  mom: { rings: 3, fn: async () => {
    const F = Story.flags; F.momCalls = (F.momCalls || 0) + 1;
    if (F.momCalls === 1) await Story.lines([['MOM', 'Hi, sweetie! Everything okay?', null, 'phone'], ['EVAN', 'Yeah. Just bored. Did you call the business line earlier?'], ['MOM', 'Oh my god. Did Ray hear that? I panicked. Your dad made it to the motel, by the way.', null, 'phone'], ['EVAN', 'Good. Go to sleep, Mom.'], ['MOM', 'You go to sleep. Oh wait — you can\'t. Ha. Love you.', null, 'phone']]);
    else await Story.lines([['MOM', 'Hi honey. Can\'t sleep either. The house makes too many noises when your dad\'s gone.', null, 'phone'], ['EVAN', 'Lock the doors, okay?'], ['MOM', 'They\'re locked. Since when do you care about doors? ...Love you.', null, 'phone']]);
  } },
  marcy: { rings: 6, fn: async () => { await Story.say('MARCY', 'Hey, it\'s Marcy. I\'m either asleep or ignoring you. Leave a message, or don\'t, I\'m not your mom.', null, 'phone'); SND.sfx('beep', { bus: 'voice', f: 1000, dur: 0.4 }); await Story.say('EVAN', 'Hey, it\'s Evan... call me back. If you want. Never mind.'); } },
  sheriff: { rings: 3, fn: async () => { await Story.lines([['DISPATCH', 'Hollis County Sheriff\'s Office, this is Brenda. Is this an emergency?', null, 'phone'], ['EVAN', 'Uh — no. Sorry. Wrong number.'], ['DISPATCH', 'Mm-hm. Goodnight, hon.', null, 'phone']]); } },
  '911': { rings: 1, fn: async () => { await Story.lines([['DISPATCH', '911, what is the address of your emergency?', null, 'phone'], ['EVAN', 'Sorry — I hit the wrong — sorry. There\'s no emergency.'], ['DISPATCH', 'Okay. Please be careful dialing.', null, 'phone']]); } },
  gasngo: { rings: 3, fn: async () => { await Story.lines([['JO', 'Gas-N-Go on 9, this is Jo.', null, 'phone'], ['EVAN', 'Hey, it\'s Evan. From the station.'], ['JO', 'Radio boy! You should totally play something for me later. I\'ll call in. It\'s tradition.', null, 'phone']]); } },
};

// ---------------------------------------------------------------------------
Story.death = async function (o = {}) {
  const tok = Story.token;
  G.mode = 'cutscene';
  Player.canMove = false;
  const npc = Stalker.npc;
  SND.sfx('sting', { bus: 'ui', v: 1 });
  SND.sfx('hit', { bus: 'ui', delay: 0.35 });
  if (npc) { const h = npc.pos.clone(); h.y = 1.6; Player.lookAtPoint(h, 0.25).catch(() => {}); }
  Engine.shake(0.15, 0.8);
  Engine.glitch(2.5, 1.2);
  await Story.wait(0.6).catch(() => {});
  if (tok !== Story.token) return;
  UI.fadeNow(1);
  Stalker.reset();
  SND.stopLevelLoops(0.1);
  UI.bluescreen(o.text || U.pick([
    'You didn\'t make it home.',
    'Nobody heard you.',
    'Dead air.',
    'He was right there.',
  ]) + '<br><span style="font-size:24px;opacity:.7">rewinding…</span>');
  await new Promise(r => setTimeout(r, 3200));
  UI.bluescreen(null);
  Story.restart();
};

// convenience: wait until player is in a zone
Story.untilZone = (name) => Story.until(() => Player.zone() === name);
Story.untilNear = (x, z, r) => Story.until(() => U.dist2(Player.pos.x, Player.pos.z, x, z) < r);
Story.onBus = (ev, filter) => new Promise((res, rej) => {
  const tok = Story.token;
  const off = Bus.on(ev, (...a) => { if (tok !== Story.token) { off(); return; } if (!filter || filter(...a)) { off(); res(a); } });
  // cancellation: poll
  const chk = () => { if (tok !== Story.token) { off(); rej(CANCEL); } else setTimeout(chk, 500); };
  setTimeout(chk, 500);
});

// animate a prop (car) along a path of [x,z] points at speed m/s; turns to face travel direction
Common.drivePath = function (prop, pts, speed = 6, o = {}) {
  const path = pts.map(p => new THREE.Vector3(p[0], 0, p[1]));
  const tok = Story.token;
  let i = 0;
  const reverse = !!o.reverse;
  return new Promise(res => {
    const fn = (dt) => {
      if (tok !== Story.token) { G.level && G.level.updaters.splice(G.level.updaters.indexOf(fn), 1); return; }
      if (i >= path.length) { G.level.updaters.splice(G.level.updaters.indexOf(fn), 1); if (prop.userData.col) prop.userData.col.on = false; res(); return; }
      const t = path[i], p = prop.position;
      const dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz);
      if (d < 0.3) { i++; return; }
      const step = Math.min(d, speed * dt);
      p.x += dx / d * step; p.z += dz / d * step;
      if (G.level.groundFn) p.y = G.level.groundAt(p.x, p.z);
      const want = Math.atan2(dx, dz) + (reverse ? Math.PI : 0);
      prop.rotation.y += U.angDiff(prop.rotation.y, want) * Math.min(1, dt * 3);
      if (prop.userData.wheels) prop.userData.wheels.forEach(w => { w.rotation.x += step * 3; });
      if (o.sound && !prop.userData.snd) prop.userData.snd = G.level.loop('engine', { pos: p.clone(), vol: 0.5, ref: 4 });
      if (prop.userData.snd) { prop.userData.snd.setPos(new THREE.Vector3(p.x, 0.6, p.z)); prop.userData.snd.set('rpm', 900 + speed * 120); }
    };
    if (prop.userData.col) prop.userData.col.on = false;
    G.level.onUpdate(fn);
  });
};
// stop a prop's engine sound
Common.propSilence = function (prop) { if (prop.userData.snd) { prop.userData.snd.stop(1); prop.userData.snd = null; } };

// Standard station-segment setup
Common.station = async function (opts, spawn, o = {}) {
  Radio.setOnAir(o.onAir !== false);
  if (!Radio.playing) Radio.start();
  const L = await Common.enter(Levels.station, opts, spawn, o);
  L.setTxLed(Radio.onAir);
  L.backBolt = Common.deadbolt(L, L.named.doors.back, -10.5, 1.05, -7.75, { locked: !!opts.backLocked });
  L.frontBolt = Common.deadbolt(L, L.named.doors.front, -9.5, 1.05, 7.75, { locked: !!opts.frontLocked });
  return L;
};
// reflect a station-level door lock (deadbolt) with an interaction near the handle
Common.deadbolt = function (L, door, x, y, z, o = {}) {
  door.locked = !!o.locked;
  return Interact.volume(L.root, x, y, z, 0.15, 0.2, 0.15, {
    prompt: () => door.isOpen ? '' : (door.locked ? 'Unlock the deadbolt' : 'Lock the deadbolt'),
    enabled: () => !door.isOpen && (!o.enabled || o.enabled()),
    use: () => { door.locked = !door.locked; SND.sfx('click', { pos: door.pos, f: 1400, v: 1.2 }); Bus.emit('deadbolt', door.name, door.locked); },
  });
};

// ---------------------------------------------------------------------------
// Hiding spots: L.hides = [{name,pos,look,prompt,low}]
Common.setupHides = function (L) {
  L.hideIts = [];
  for (const h of (L.hides || [])) {
    const it = Interact.volume(L.root, h.pos.x, h.pos.y + 0.7, h.pos.z, 1.0, 1.4, 1.0, {
      prompt: h.prompt, range: 2.4, enabled: () => !Player.hidden && G.mode === 'walk',
      use: () => Common.hide(h),
    });
    L.hideIts.push(it);
  }
  L.onUpdate(() => {
    if (Player.hidden && G.mode === 'hide' && (Input.pressed('KeyE') || Input.pressed('Space'))) { Input.consume('KeyE'); Common.unhide(); }
  });
};
Common.hide = function (h) {
  const L = G.level;
  Player._preHide = { x: Player.pos.x, z: Player.pos.z, crouch: Player.crouching };
  SND.sfx('rustle', { v: 0.6 });
  Player.place(h.pos.x, h.pos.z, Player.yaw, 0);
  Player.crouching = !!h.low; Player.eyeCur = h.low ? 1.0 : Player.eye;
  const dx = h.look.x - h.pos.x, dz = h.look.z - h.pos.z;
  Player.yaw = Math.atan2(-dx, -dz);
  Player.lookLimit = { yaw: Player.yaw, pitch: -0.05, yawR: 0.7, pitchR: 0.5 };
  Player.hidden = true; G.mode = 'hide';
  SND.muffle(2500, 0.8, 0.3);
  UI.hint('Hiding — hold still. <b style="border:1px solid #777;padding:0 5px">E</b> leave', 5);
  Bus.emit('hid', h.name);
  void L;
};
Common.unhide = function () {
  const p = Player._preHide;
  Player.hidden = false; G.mode = 'walk'; Player.lookLimit = null;
  if (p) { Player.pos.x = p.x; Player.pos.z = p.z; Player.crouching = p.crouch; }
  SND.muffle(20000, 1, 0.3);
  SND.sfx('rustle', { v: 0.5 });
};
// a companion NPC that follows the player
Common.follow = function (npc, o = {}) {
  const tok = Story.token;
  let t = 0;
  const fn = dt => {
    if (tok !== Story.token || npc._stopFollow) { G.level.updaters.splice(G.level.updaters.indexOf(fn), 1); return; }
    t -= dt; if (t > 0) return; t = 0.4;
    const d = U.dist2(npc.pos.x, npc.pos.z, Player.pos.x, Player.pos.z);
    if (d > (o.near || 2.2)) { const back = new THREE.Vector3(Player.pos.x - npc.pos.x, 0, Player.pos.z - npc.pos.z).normalize().multiplyScalar(-1.4); npc.path = [new THREE.Vector3(Player.pos.x + back.x, 0, Player.pos.z + back.z)]; npc.speed = d > 6 ? (o.fast || 2.6) : (o.speed || 1.6); npc.pose = 'walk'; }
    else if (npc.path) { npc.path = null; npc.pose = 'stand'; }
    if (o.onFar && d > (o.far || 12)) o.onFar(d);
  };
  G.level.onUpdate(fn);
};

// mash-E quick time event. returns true on success
Common.qte = function (text, need = 10, time = 3.5, decay = 1.6) {
  return new Promise(res => {
    let f = 0.15, t = 0; const tok = Story.token;
    const fn = dt => {
      if (tok !== Story.token) { G.level.updaters.splice(G.level.updaters.indexOf(fn), 1); UI.qte(null); return; }
      t += dt; f = Math.max(0, f - dt * decay / need);
      if (Input.pressed('KeyE') || Input.mousePressed) { f += 1 / need; Engine.shake(0.04, 0.1); SND.sfx('thud', { v: 0.3, bus: 'ui' }); }
      UI.qte(text, Math.min(1, f));
      if (f >= 1 || t > time) { G.level.updaters.splice(G.level.updaters.indexOf(fn), 1); UI.qte(null); res(f >= 1); }
    };
    G.level.onUpdate(fn);
  });
};

// developer viewpoint segment: ?seg=view&lvl=station&x=..&z=..&yaw=..&pitch=..&flash=1&npc=dale
Story.define('view', {
  checkpoint: false,
  async setup() {
    const q = new URLSearchParams(location.search), n = k => Number(q.get(k) || 0);
    const lvl = q.get('lvl') || 'station';
    Story.setClock(23, 30);
    const L = await Common.enter(Levels[lvl], { road: q.get('road') || 'mountain', marcyCar: true, buick: q.get('buick') === '1', backpack: true }, [n('x'), n('z'), n('yaw'), n('pitch')]);
    if (lvl === 'station') Radio.start();
    if (q.get('flash')) { Player.hasFlashlight = true; Player.setFlashlight(true, true); }
    if (q.get('npc')) { const h = NPCs.spawn(q.get('npc'), { x: n('nx'), z: n('nz'), ry: n('nry') }); if (q.get('pose')) h.pose = q.get('pose'); }
    if (q.get('car') && L.road) { Car.start(L.road, { s: n('s') || 40, v: 0 }); }
    Player.canMove = !q.get('freeze');
  },
  async run() {},
});
