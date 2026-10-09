'use strict';
// PART FIVE — THE RIDGE. The transmitter, the hidden car, Jo, and the hunt.

const DALE_TAUNTS = [
  'I\'ve listened to you for three weeks, Evan. You read the weather like you\'re apologizing for it.',
  'Everybody who calls that station is telling somebody they\'re alone. I\'m just the one who listens.',
  'Lacey used to talk to me. On the air. "If you\'re still up, you\'re not alone." She meant it.',
  'Nobody\'s coming. The deputy\'s in Hollis. I listen to the scanner too.',
  'Your mother sits on the porch at night. Did you know that? She waits up for you.',
  'Come out and we\'ll talk. Like we\'re on the radio.',
  'It\'s so quiet up here. That\'s why I like it.',
  'You were supposed to stay at the station. Why didn\'t you stay?',
  'I fixed that transmitter forty times. I know every sound this hill makes.',
];

// ---------------------------------------------------------------------------
// Ridge site mechanics shared by every Part Five segment.
const Ridge = {
  setup(L, st = {}) {
    const F = Story.flags, N = L.named, D = N.doors;
    L.tx = Object.assign({ breaker: false, fil: false, warm: false, plate: false, local: true, localAudio: false, countdown: null }, st.tx || {});
    L.power = st.power !== false;
    L.monitor = L.speaker({ kind: 'radio', pos: new THREE.Vector3(4, 2.2, -5.4), vol: 0.35, small: true, ref: 1.5 });
    Ridge.redraw(L);
    if (!L.power) Ridge.setPower(L, false, true);
    // lights start off inside the building unless told otherwise
    if (!st.lightsOn) { N.lights.main.setOn(false); N.lights.main2.setOn(false); }
    Interact.volume(L.root, 2.25, 1.3, -0.25, 0.12, 0.15, 0.12, { prompt: () => N.lights.main.on ? 'Light switch (off)' : 'Light switch (on)', use: () => { const on = !N.lights.main.on; N.lights.main.setOn(on); N.lights.main2.setOn(on); SND.sfx('switch', { pos: new THREE.Vector3(2.25, 1.3, -0.2) }); } });
    B.box(L.root, 2.25, 1.22, -0.13, 0.08, 0.14, 0.02, B.col(0xe0dccc));
    // lockbox
    Interact.add(N.lockbox, {
      prompt: () => F.hasSiteKeys ? 'Lockbox (empty)' : 'Lockbox — enter the code',
      use: async () => {
        if (F.hasSiteKeys) return;
        if (!F.lockboxCode) { await Story.think('Four digits. Ray told me... no. I don\'t know it.'); return; }
        SND.sfx('dtmf', { digits: '1974', pos: new THREE.Vector3(4, 1.4, 0.2) });
        await Story.wait(0.9);
        SND.sfx('click', { pos: new THREE.Vector3(4, 1.4, 0.2), f: 1200, v: 1.5 }); SND.sfx('keys', { delay: 0.2 });
        F.hasSiteKeys = true; D.front.locked = false;
        UI.toast('Key ring: FRONT · BACK · GEN', 4);
        Bus.emit('ridge', 'keys');
      },
    });
    // breaker
    Interact.add(N.breaker.group, {
      prompt: () => L.tx.breaker ? 'TX breaker — ON' : 'Turn the transmitter breaker ON',
      use: () => { if (L.tx.breaker) return; L.tx.breaker = true; N.breaker.handle.position.y = 0.4; SND.sfx('contactor', { pos: new THREE.Vector3(4.4, 1.2, -0.2) }); Ridge.redraw(L); Bus.emit('ridge', 'breaker'); },
    });
    // transmitter control panel
    Interact.add(N.tx, {
      prompt: () => {
        const t = L.tx;
        if (!L.power) return 'Transmitter — no power';
        if (!t.breaker) return 'Transmitter — dead. Check the breaker panel by the door';
        if (!t.fil) return 'Press FILAMENT ON';
        if (!t.warm) return `Warming up… ${t.countdown}`;
        if (!t.plate) return 'Press PLATE ON';
        if (F.needLocalAudio && !t.localAudio) return 'Flip LOCAL AUDIO up';
        if (t.local && !F.needLocalAudio) return 'Set control back to REMOTE';
        return 'Transmitter — on the air';
      },
      use: async () => {
        const t = L.tx;
        if (!L.power || !t.breaker) return;
        if (!t.fil) {
          t.fil = true; SND.sfx('relay', { pos: new THREE.Vector3(1, 1.2, -3) }); L.txHum.volume(0.35, 2);
          Bus.emit('ridge', 'filament');
          for (let c = (Story.flags.fastTx ? 5 : 30); c > 0; c--) { if (!L.power) return; t.countdown = c; Ridge.redraw(L); await Story.wait(1); }
          t.countdown = null; t.warm = true; Ridge.redraw(L); SND.sfx('beep', { pos: new THREE.Vector3(1, 1.2, -3), f: 1600, dur: 0.3 });
          Bus.emit('ridge', 'warm'); return;
        }
        if (!t.warm) return;
        if (!t.plate) {
          t.plate = true; SND.sfx('contactor', { pos: new THREE.Vector3(1, 1.2, -3) }); L.txHum.volume(1, 1.5);
          Ridge.redraw(L); Engine.shake(0.02, 0.4);
          Radio.musicIn.gain.setTargetAtTime(0.9, SND.now(), 0.3);
          Radio.setOnAir(true); Bus.emit('ridge', 'plate'); return;
        }
        if (Story.flags.needLocalAudio && !t.localAudio) { t.localAudio = true; SND.sfx('switch', { pos: new THREE.Vector3(1, 1.2, -3) }); Ridge.redraw(L); Bus.emit('ridge', 'localAudio'); return; }
        if (t.local && !Story.flags.needLocalAudio) { t.local = false; SND.sfx('switch', { pos: new THREE.Vector3(1, 1.2, -3) }); Ridge.redraw(L); Bus.emit('ridge', 'remote'); }
      },
    });
    // site log
    Interact.volume(L.root, 9.0, 0.95, -1.4, 0.3, 0.1, 0.35, { prompt: 'Site log', use: () => UI.doc(`<h2>KESSLER RIDGE — SITE LOG</h2><span style="font-size:15px">10/08  9:40P  DP  STL align. gen load test OK.\n10/11  8:15P  DP  gen load test.\n10/13 10:50P  DP  gen load test. replaced coil on old AM bldg lock.\n10/14  9:30P  DP  gen load test.\n10/15  ——    DP  (blank)\n\n</span><i>"Generator load test" four nights out of seven. Ray told me the generator gets tested once a month.</i>`, 'lined') });
    // tools: bolt cutters
    Interact.add(N.cutters, { prompt: 'Bolt cutters', enabled: () => N.cutters.visible, use: () => { N.cutters.visible = false; F.hasCutters = true; SND.sfx('pickup', {}); UI.toast('Took the bolt cutters', 2.5); } });
    // the old building padlock
    Interact.add(D.old.panel, {
      prompt: () => D.old.locked ? (F.hasOldKey ? 'Unlock the padlock (OLD XMTR key)' : (F.hasCutters ? 'Cut the padlock' : 'Padlocked')) : (D.old.isOpen ? 'Close' : 'Open'),
      use: async () => {
        if (D.old.locked) {
          if (F.oldBarred) { SND.sfx('knock', { pos: D.old.pos, n: 3 }); Bus.emit('ridge', 'knockOld'); return; }
          if (F.hasOldKey || F.hasCutters) { SND.sfx(F.hasOldKey ? 'keys' : 'bang', { pos: D.old.pos, metal: true, v: 0.5 }); D.old.locked = false; F.oldUnlocked = true; Bus.emit('noise', D.old.pos.x, D.old.pos.z, 8); await Story.wait(0.4); D.old.open(); Bus.emit('ridge', 'oldOpen'); }
          else { SND.sfx('doorLocked', { pos: D.old.pos }); Story.think(F.searchedGlove ? 'The keys from his glovebox. "OLD XMTR."' : 'Padlocked. New lock — shiny. Something to cut it... the tool bench inside.'); }
          return;
        }
        D.old.isOpen ? D.old.close() : D.old.open();
      },
    });
    Ridge.setupGenerator(L);
    // the gen-pen gate (padlocked)
    D.genGate.o.onUse = () => { if (D.genGate.locked) { if (F.hasSiteKeys) { D.genGate.locked = false; SND.sfx('keys', { pos: D.genGate.pos }); Bus.emit('noise', D.genGate.pos.x, D.genGate.pos.z, 6); return false; } Story.think('Padlocked. The key\'s on Ray\'s lockbox ring.'); } return true; };
    Common.setupHides(L);
  },
  redraw(L) {
    const t = L.tx, on = L.power && t.plate;
    L.txTex.redraw({ fil: L.power && t.fil, plate: on, ready: L.power && t.warm, local: t.local, localAudio: t.localAudio, countdown: t.countdown, pv: on ? 0.72 : 0, pi: on ? 0.6 : 0, fwd: on ? 0.8 : 0, ref: on ? 0.06 : 0 });
  },
  setPower(L, on, silent) {
    L.power = on;
    L.setPower(on, 'site');
    L.beaconsOn = on;
    if (L.rackLoop) L.rackLoop.volume(on ? 0.8 : 0, 0.5);
    if (!on) { L.tx.fil = false; L.tx.warm = false; L.tx.plate = false; L.tx.localAudio = false; L.tx.countdown = null; L.txHum.volume(0, 1.5); Radio.setOnAir(false); if (!silent) SND.sfx('powerDown', {}); }
    Ridge.redraw(L);
  },
  setupGenerator(L) {
    const F = Story.flags, gen = L.named.generator, pos = new THREE.Vector3(15, 0.8, -3.3);
    L.genState = 'off'; L.genPrimes = 0; L.genPulls = 0;
    const steps = {
      off: ['Open the generator housing', () => { SND.sfx('click', { pos, f: 1800 }); return 'open'; }],
      open: ['Fuel valve ON', () => { SND.sfx('switch', { pos }); return 'fuel'; }],
      fuel: ['Close the choke', () => { SND.sfx('switch', { pos }); return 'choke'; }],
      choke: ['Press the primer bulb', () => { SND.sfx('prime', { pos }); return ++L.genPrimes >= 3 ? 'primed' : 'choke'; }],
      primed: ['Pull the starter cord', () => {
        SND.sfx('zip', { pos }); Engine.shake(0.03, 0.2); L.genPulls++;
        Bus.emit('noise', pos.x, pos.z, 28, 'generator');
        if (L.genPulls < 3) { SND.sfx('sputter', { pos, delay: 0.3, n: 3 + L.genPulls * 2 }); return 'primed'; }
        SND.sfx('sputter', { pos, delay: 0.3, n: 8 });
        L.genLoop = L.loop('generator', { pos: pos.clone(), vol: 1.0, fadeIn: 1.2 });
        return 'running';
      }],
      running: ['Open the choke', () => { SND.sfx('switch', { pos }); return 'chokeOpen'; }],
      chokeOpen: ['Throw the transfer switch to GENERATOR', () => { SND.sfx('contactor', { pos }); Ridge.setPower(L, true); SND.sfx('fluoroStart', { pos: new THREE.Vector3(5, 2.5, -3) }); Bus.emit('noise', pos.x, pos.z, 40, 'generator'); return 'done'; }],
    };
    Interact.add(gen.group, {
      prompt: () => F.genTaskRidge && steps[L.genState] ? steps[L.genState][0] : 'Propane generator',
      use: async () => {
        const s = steps[L.genState];
        if (!F.genTaskRidge || !s) { await Story.think(L.genState === 'done' ? 'Running. Loud. He can hear it from anywhere on this hill.' : 'Same kind as Old Faithful back at the station. Housing, valve, choke, prime, pull.'); return; }
        L.genState = s[1]();
        Bus.emit('genStep', L.genState);
      },
    });
  },
};

// Buick search: items placed relative to the car
function setupBuickSearch(L) {
  const F = Story.flags, car = L.named.buick;
  car.updateMatrixWorld();
  const at = (x, y, z) => car.localToWorld(new THREE.Vector3(x, y, z));
  const item = (local, size, prompt, fn, need) => {
    const p = at(...local);
    const it = Interact.volume(L.root, p.x, p.y, p.z, size, size * 0.6, size, { prompt, range: 2.6, enabled: () => F.tarpOff && !it._done, use: async () => { if (!need) it._done = true; await fn(); } });
    return it;
  };
  item([-0.45, 0.7, 0.3], 0.5, 'Shoebox on the passenger seat', async () => {
    F.sawPhotos = true;
    await UI.doc(`<h2>PHOTOGRAPHS</h2><i>Dozens of them. Some Polaroids, some drugstore prints. Dates in neat block capitals on the back.</i>\n\n<div class="ph">KTLR at night, from the far corner of the lot — "3/9/97"</div>The studio window, lit. A woman with long dark hair at the board, laughing at something. — <b>"LACEY 3/12/97"</b>\n\n<div class="ph">The same window — a red-haired woman, younger — "MARCY 11/2002"</div>The Pine Hollow Diner through the windshield. A waitress flipping the sign to CLOSED. — <b>"C. 3/1/03"</b>\n\nA girl behind a gas station counter, reading a magazine. — <b>"JO — 9/30/04"</b>\n\n<div class="ph">The studio window. A teenage boy in a KTLR hoodie, headphones around his neck. — "E. 10/8/04"</div>A green sedan in the KTLR lot. — <b>"E. — CAR"</b>\n\n<div class="ph">A small white house. Porch light on. A woman in a robe on the steps, holding a mug, looking at the street. — "E. — HOUSE — MOTHER — 10/13"</div>`, 'photo');
    await Story.think('That\'s my house. That\'s my mom. That was Wednesday.');
  });
  item([0.45, 0.7, 0.3], 0.5, 'Notebook on the driver\'s seat', async () => {
    F.sawNotebook = true;
    await UI.doc(`<i>A spiral notebook, fat with use. The first pages are yellow. Every entry is copied from the radio, word for word, with the time.</i><span style="font-size:15px">

03/13/97  1:05A  KTLR  — Lacey: "told him just me & the coffee pot"  ✓
08/19/99 11:30P  KTLR  — Ana: "the one stuck in the ER lot waiting on her ride"  ✓
11/02/01  1:14A  KTLR  — Tom: "anybody else drivin' the ridge alone tonight" — turnout  ✓
03/02/03 12:31A  KTLR  — Carrie: "everyone closing up alone tonight" — Pine Hollow  ✓
  ...
10/01/04 11:40P  KTLR  — Jo, Gas-N-Go: "for everybody working alone tonight"
10/08/04 12:12A  KTLR  — Jo, Gas-N-Go: "anyone else stuck on night shift"
10/15/04 11:39P  KTLR  — Jo: "working the night counter at the Gas-N-Go on Route 9 all by herself"  ✓
10/15/04  —      KTLR  — E. — FRI OVNT — ONE OPERATOR. BUILDING EMPTY.  ?
</span>`, 'lined');
    await Story.think('He listens. Every night. Every dedication. Everybody who calls in and says they\'re alone...');
    await Story.think('...and we READ it. On the air. We tell him where they are.');
    if (F.joDedication === 'full') await Story.think('I read it. Word for word. "All by herself." I read it to him.');
    else if (F.joDedication) await Story.think('He already had her. He\'d had her for weeks. Every time she called.');
  });
  item([0, 0.95, 1.1], 0.5, 'Clipboard on the dashboard', async () => {
    F.sawSchedules = true;
    await UI.doc(`<h2>KTLR — STAFF SCHEDULES</h2><i>Years of them, faxed from the station. "TO: DALE PRUITT — PRUITT BROADCAST SVC." The newest one is on top.</i>\n\nOCTOBER 2004 — OVNT FRIDAY: <span class="red">EVAN</span>\n<i>circled twice in ballpoint. Next to it, in block capitals:</i> <b>ALONE.</b>\n\nMARCH 1997 — OVNT: <span class="red">L. HARMON</span>  <i>(circled)</i>`, 'fax');
  });
  item([-0.45, 0.75, 0.95], 0.4, 'Glovebox', async () => {
    F.searchedGlove = true; F.hasOldKey = true;
    SND.sfx('keys', {});
    await UI.doc(`<i>Registration:</i> 1989 BUICK LeSABRE — <b>DALE A. PRUITT</b>, 14 Coldwater Rd., Hollis\n\n<i>A ring with one padlock key. A paper tag:</i> <b>"OLD XMTR"</b>\n\n<i>A scanner radio, tuned to the sheriff\'s frequency.</i>`, 'fax');
  });
  item([0.45, 1.25, 0.6], 0.35, 'Sun visor', async () => {
    F.hasBuickKey = true; SND.sfx('keys', {});
    await Story.think('A spare key. Rubber-banded to the visor. GM. It\'s the key to this car.');
  });
  item([0, 0.75, -0.9], 0.6, 'Back seat — a box of cassettes', async () => {
    F.sawTapes = true;
    await UI.doc(`<i>A shoebox of cassettes, labeled in the same neat capitals.</i>\n\nKTLR 03/14/97\nKTLR 08/19/99\nKTLR 11/02/01\nKTLR 03/02/03\nKTLR 10/01/04\nKTLR 10/08/04\n<b>KTLR 10/15/04</b>\n\n<i>Under them: a roll of duct tape, mostly used. And a KTLR request log — "2002" on the spine.</i>`, 'fax');
  });
  item([-0.45, 0.35, 0.4], 0.35, 'Something on the floor mat', async () => {
    F.sawNametag = true;
    await UI.doc(`<div class="ph">[ a red plastic name badge, the pin bent ]</div><b>GAS-N-GO</b>\nHi! I'm <b>JO</b>\n\n<i>"Ask me about our Fresh Coffee!"</i>`, 'photo');
    await Story.think('Jo.');
  });
}

// ---------------------------------------------------------------------------
Story.define('ch5a', {
  card: ['PART FIVE', 'THE RIDGE', '1:46 AM'],
  chapterSelect: 'Part Five — The Ridge',
  defaultFlags: { hasFlashlight: true, joDedication: 'full', lockboxCode: true, sawReplay: true, heardVoice: true },
  async setup() {
    Car.stop();
    Story.setClock(25, 46);
    Radio.setOnAir(false); Phone.signal = 0;
    Player.hasFlashlight = true;
    const L = await Common.enter(Levels.tower, { frontLocked: true, genGateLocked: true }, [12.2, 9.4, 0], { fade: false });
    Ridge.setup(L, { power: true });
  },
  async run() {
    const F = Story.flags, L = G.level, N = L.named, D = N.doors;
    Car.park(N.evanCar, { engine: true, headlights: true, yaw: 0 });
    UI.fade(0, 2);
    await Story.wait(2);
    await Story.think('The building\'s dark. No truck. Nobody.');
    await Story.think('The tower lights are still blinking. Red. Like it\'s breathing.');
    UI.hint('<b style="border:1px solid #777;padding:0 5px">E</b> get out &nbsp; <b style="border:1px solid #777;padding:0 5px">F</b> flashlight', 6);
    await Story.until(() => Input.pressed('KeyE'));
    Input.consume('KeyE');
    SND.sfx('carDoorOpen', {});
    await UI.fade(1, 0.4);
    Car.unpark(1.5);
    N.evanCar.userData.setLights(true, true);
    const idle = L.loop('engine', { pos: N.evanCar.position.clone().setY(0.6), vol: 0.5, ref: 3 }); idle.set('rpm', 800);
    UI.fade(0, 0.8);
    Story.objective('Open the lockbox by the door (code 1-9-7-4)');
    await Story.onBus('ridge', e => e === 'keys');
    Story.objective('Restore the transmitter — breaker panel first (inside, by the door)');
    await Story.onBus('ridge', e => e === 'breaker');
    await Story.think('The breaker was off. Breakers don\'t flip themselves.');
    Story.objective('Transmitter: press FILAMENT ON');
    await Story.onBus('ridge', e => e === 'filament');
    Story.objective('Wait for the warm-up');
    Story.spawn(async () => { await Story.wait(9); SND.sfx('twig', { pos: new THREE.Vector3(14, 1, -9), v: 0.7 }); await Story.wait(1); await Story.think('...Branch. Wind. It\'s windy up here.'); await Story.wait(8); SND.sfx('rustle', { pos: new THREE.Vector3(-2, 1, 4), v: 1.0 }); });
    await Story.onBus('ridge', e => e === 'warm');
    Story.objective('Press PLATE ON');
    await Story.onBus('ridge', e => e === 'plate');
    Story.objective('Set control back to REMOTE');
    await Story.wait(1.5);
    await Story.think('Meters are up. Forward power four-point-eight. We\'re on the air.');
    await Story.onBus('ridge', e => e === 'remote');
    Story.objective(null);
    Story.setClock(25, 54);
    await Story.wait(3);
    // wall phone
    const ring = L.loop('oldRing', { pos: new THREE.Vector3(1.6, 1.3, -0.2), vol: 0.9 });
    let answered = false;
    const wpi = Interact.add(N.wallPhone, { prompt: () => answered ? 'Wall phone' : 'Answer the wall phone', use: () => { if (!answered) answered = true; else Story.think(F.phoneDead ? 'Dead. No dial tone.' : 'The site phone.'); } });
    Story.objective('Answer the phone');
    await Story.until(() => answered);
    ring.stop(0.05);
    await StationPhone.call(0, 'Ridge site phone — Ray', async () => {
      await Story.lines([
        ['RAY', 'WE\'RE BACK! I\'m looking at the remote right now. Kid, you\'re a lifesaver.', null, 'phone'],
        ['EVAN', 'Ray — the gate was open. The breaker was off. Somebody did this by hand. And on the way up, on the radio, someone —'],
        ['RAY', 'What? You\'re — breaking up —', null, 'phone'],
        ['RAY', '— Dale\'s probably — tomorrow — go home, Evan, just go h—', 3, 'phone'],
      ]);
      SND.sfx('lineClick', { bus: 'ui', v: 2 });
      await Story.wait(1.5);
      await Story.think('...Ray? Dead. The line\'s dead.');
    });
    F.phoneDead = true;
    Story.objective('Go home');
    await Story.think('"Go home." Okay. Okay. I\'m going home.');
    // the car is dead
    idle.stop(0.3);
    N.evanCar.userData.setLights(false, false);
    let tries = 0;
    const carIt = Interact.add(N.evanCar, { prompt: () => tries < 2 ? 'Get in and start the car' : 'Pop the hood', use: async () => {
      tries++;
      if (tries <= 2) { SND.sfx('ignition', { pos: N.evanCar.position.clone(), dur: 1.3 }); await Story.wait(1.4); await Story.think(tries === 1 ? 'Come on. Come ON.' : 'It turns over. It won\'t catch. It was RUNNING ten minutes ago.'); return; }
      SND.sfx('click', { pos: N.evanCar.position.clone(), f: 900 });
      await UI.doc(`<i>Flashlight on the engine. Everything looks normal. Then you see it.</i>\n\nThe thick black wire that runs from the coil to the distributor cap is <b>gone</b>. Not loose. Not burned.\n\nGone. Both ends unclipped, neatly.\n\nSomeone took it.`, 'photo');
      F.carDead = true;
    } });
    await Story.until(() => F.carDead);
    Interact.remove(carIt);
    SND.sfx('swell', { bus: 'ui', dur: 6, v: 1 });
    await Story.think('Someone was at my car. While I was inside. Ten feet from me.');
    await Story.think('Someone\'s HERE.');
    Story.objective(null);
    await Story.think('No signal. Phone line\'s dead. Car\'s dead. Six miles of mountain road.');
    // tire tracks
    const tracks = [[9, 8], [13, 3], [13.5, -5], [11, -9.5], [6.5, -11]];
    const tm = B.col(0x1a1612);
    for (let i = 0; i < tracks.length - 1; i++) { const a = tracks[i], b = tracks[i + 1]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]); for (const off of [-0.75, 0.75]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.28, len), tm); const ang = Math.atan2(b[0] - a[0], b[1] - a[1]); m.rotation.set(-Math.PI / 2, 0, ang); m.position.set((a[0] + b[0]) / 2 + Math.cos(ang) * off, L.groundAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) + 0.025, (a[1] + b[1]) / 2 - Math.sin(ang) * off); L.add(m); } }
    await Story.wait(2);
    await Story.think('...Tire tracks. In the gravel. Fresh. Going around the back of the building.');
    Story.objective('Follow the tire tracks');
    await Story.untilNear(5.5, -9.5, 5);
    // the Buick under the tarp
    let tarp = false;
    const ti = Interact.add(N.tarp, { prompt: 'Pull back the tarp', use: () => { tarp = true; } });
    await Story.until(() => tarp);
    Interact.remove(ti);
    SND.sfx('rustle', { v: 1.5 }); N.tarp.visible = false; F.tarpOff = true;
    SND.sfx('sting', { bus: 'ui', v: 0.5 });
    await Story.wait(0.8);
    await Story.think('The car. From the lot. From the Gas-N-Go.');
    await Story.think('...The coffee guy. "I keep your stick standing up there on the ridge."');
    await Story.think('Dale.');
    setupBuickSearch(L);
    Story.objective('Search the car');
    await Story.until(() => F.sawNotebook && F.sawPhotos && F.sawNametag);
    Story.objective(null);
    await Story.wait(1);
    await Story.think('Lacey. Ana. Tom. Carrie. Jo.');
    await Story.think('Me.');
    await Story.think('Nobody\'s been calling the station to request songs. He\'s been calling to see who answers alone.');
    await Story.wait(2);
    // the bang from the old building
    SND.sfx('bang', { pos: new THREE.Vector3(-21, -1, 18), metal: true, v: 1.4 });
    await Story.wait(1.4);
    SND.sfx('scream', { pos: new THREE.Vector3(-21, -1, 18), muffle: 700, v: 1.2 });
    SND.sfx('bang', { pos: new THREE.Vector3(-21, -1, 18), metal: true, v: 1.2, delay: 0.6 });
    await Story.wait(1);
    await Story.think('Down the hill. The old building. Someone\'s in there.');
    Story.objective('The old AM building — down the slope');
    await Story.until(() => F.oldUnlocked);
    // Jo
    const jo = NPCs.spawn('jo', { x: -21.5, z: 18.15, ry: 0, pose: 'tied', y: L.groundAt(-21.5, 18.3) });
    jo.look = Object.assign({}, jo.look);
    await Story.wait(0.8);
    SND.sfx('scream', { pos: new THREE.Vector3(-21.5, -1, 18.3), muffle: 900, v: 1 });
    await Story.say('EVAN', 'Jo! Jo — it\'s me, it\'s Evan, the radio — it\'s okay, it\'s okay —');
    let freed = false;
    const ji = Interact.add(jo.root, { prompt: 'Free Jo (peel the tape)', hold: 2.5, use: () => { freed = true; } });
    Story.objective('Free Jo');
    await Story.until(() => freed);
    Interact.remove(ji);
    SND.sfx('zipper', {}); SND.sfx('gasp', { pos: jo.pos.clone().setY(L.groundAt(-21.5, 18.3) + 1) });
    jo.pose = 'crouch'; jo.lookAt(G.camera.position);
    Story.objective(null);
    await Story.lines([
      ['JO', '(gasping) He\'s here. He\'s HERE. He didn\'t leave —'],
      ['JO', 'When your headlights came up the road he went into the trees. He was watching you.'],
      ['EVAN', 'Who — is it —'],
      ['JO', 'Dale. It\'s Dale. He said his car wouldn\'t start. He asked me to come out and hold the flashlight.'],
      ['JO', 'I\'ve known him for three years. He fixed my car stereo.'],
      ['JO', 'There\'s a mic. On that desk. I found the button with my elbow. I was whispering. I didn\'t know if anybody —'],
      ['EVAN', 'Everybody heard you. Hank. Walt. A nurse. Everybody heard you, Jo.'],
    ]);
    await Story.wait(1);
    // the power dies
    SND.sfx('breakerOff', { pos: new THREE.Vector3(13, 1.2, 4.3) });
    Ridge.setPower(L, false);
    SND.sfx('swell', { bus: 'ui', dur: 5, v: 0.9 });
    await Story.wait(2.5);
    await Story.say('JO', '(whispering) ...That\'s him.');
    await Story.wait(2);
    await Story.say('DALE', '(from somewhere up the hill) Evan.', 2.5);
    await Story.wait(2.5);
    await Story.say('DALE', 'You found my car.', 2.5);
    await Story.wait(2);
    await Story.say('DALE', 'I\'m not angry.', 2.5);
    await Story.wait(1.5);
    Story.goto('ch5b');
  },
});

// ---------------------------------------------------------------------------
function ridgeHunter(o = {}) {
  return Stalker.spawn(Object.assign({
    x: 8, z: 6, ry: Math.PI,
    nodes: G.level.nav,
    patrol: [[3, 3], [13, 2], [17, -7], [10, -9.5], [-1, -8.5], [-4, 4], [-10, 9], [-17, 16], [-10, 9], [0, 8], [10, 10]],
    lines: DALE_TAUNTS,
  }, o));
}

Story.define('ch5b', {
  chapterSelect: 'Part Five — Dead Air',
  defaultFlags: { hasFlashlight: true, joDedication: 'full', hasSiteKeys: true, carDead: true, tarpOff: true, sawNotebook: true, sawPhotos: true, sawNametag: true, oldUnlocked: true, phoneDead: true },
  async setup(o) {
    Story.setClock(26, 8);
    Radio.setOnAir(false); Phone.signal = 0;
    Player.hasFlashlight = true;
    let L = G.level;
    if (o.restart || !L || L.name !== 'tower') {
      L = await Common.enter(Levels.tower, { frontLocked: false, genGateLocked: true, oldBulb: false, tarp: false }, [-21.0, 17.2, Math.PI / 2], { fade: true });
      Ridge.setup(L, { power: false, tx: { breaker: true } });
      L.named.doors.old.locked = false; L.named.doors.old.set(0.0);
      L.named.doors.front.locked = false;
      setupBuickSearch(L);
    }
  },
  async run(o) {
    const F = Story.flags, L = G.level, N = L.named, D = N.doors;
    let jo = NPCs.get('jo');
    if (!jo) { jo = NPCs.spawn('jo', { x: -21.8, z: 18.6, ry: 0.5, pose: 'crouch', y: L.groundAt(-21.5, 18.3) }); }
    jo.pose = 'crouch';
    if (D.old.isOpen) D.old.close(true);
    Player.setFlashlight(false, true);
    await Story.lines([
      ['EVAN', '(whispering) My car\'s dead. He took a wire out of it. The phone line\'s dead. There\'s no signal up here.'],
      ['JO', '(whispering) The transmitter. When it was on, everybody could hear me. Can you — is there a way to —'],
      ['EVAN', 'There\'s a mic. In the transmitter building. For emergencies. If I get the power back on — there\'s a generator —'],
      ['EVAN', 'I can put us on the air. The whole county\'s listening. Half of them are probably still up because of you.'],
      ['JO', 'Then go. My ankle — I can\'t run, he twisted it when I — just go. There\'s a bar on this door. I\'ll lock it from inside.'],
      ['EVAN', 'I\'ll come back for you.'],
      ['JO', 'You better, radio boy.'],
    ]);
    ridgeHunter({ x: 9, z: 7 });
    Stalker.setFlashlight(true);
    Story.objective('Get to the generator pen (east of the transmitter building). Stay out of his light.');
    UI.hint('<b style="border:1px solid #777;padding:0 5px">C</b> crouch &nbsp; flashlight OFF keeps you hidden &nbsp; <b style="border:1px solid #777;padding:0 5px">SHIFT</b> run', 8);
    F.genTaskRidge = true;
    // Jo bars the door once Evan is out
    Story.spawn(async () => { await Story.until(() => Player.zone() !== 'oldb'); await Story.wait(0.6); D.old.close(); D.old.locked = true; F.oldBarred = true; D.old.barricaded = true; SND.sfx('thud', { pos: D.old.pos, v: 0.6 }); });
    const gObj = { open: 'Fuel valve ON', fuel: 'Close the choke', choke: 'Press the primer bulb (3x)', primed: 'Pull the starter cord — it will be LOUD', running: 'Open the choke', chokeOpen: 'Throw the transfer switch to GENERATOR' };
    const offG = Bus.on('genStep', st => { if (gObj[st]) Story.objective(gObj[st]); });
    Story.spawn(async () => { await Story.until(() => Player.zone() === 'genpen'); Story.objective('Open the generator housing'); });
    await Story.until(() => L.genState === 'done');
    offG();
    Story.checkpoint('ch5b2');
    // power's back — he heard it
    Stalker.state = 'investigate'; Stalker.goTo(15, 0.5, 2.4);
    Story.objective('Get inside the transmitter building and lock the door!');
    await Story.say('DALE', 'There it is.', 1.8);
    await Story.until(() => Player.zone() === 'newb');
    // front door deadbolt from inside
    const bolt = Common.deadbolt(L, D.front, 3, 1.05, -0.25, { locked: false });
    Story.objective('Lock the door (deadbolt)');
    await Story.until(() => D.front.locked && !D.front.isOpen, 25);
    if (!D.front.locked) { D.front.close(); D.front.locked = true; SND.sfx('click', { pos: D.front.pos, f: 1400, v: 1.2 }); }
    D.front.barricaded = true;
    Interact.remove(bolt);
    // he arrives at the door
    Stalker.walk([[3, 1.6]], 2.2).then(async () => {
      SND.sfx('doorLocked', { pos: D.front.pos }); await Story.wait(0.6); SND.sfx('doorLocked', { pos: D.front.pos });
      await Story.say('DALE', '(through the door) Evan.', 2);
      await Story.wait(1);
      await Story.say('DALE', 'That\'s my building you\'re in.', 2.5);
      await Stalker.walk([[11, 1.2], [11.2, -3]], 1.2);
      await Story.say('DALE', '(at the window) Filament takes thirty seconds. I wired it that way. Twenty years ago.', 3.5);
      await Stalker.walk([[11, -7], [8.3, -7.2]], 1.2);
    });
    Story.objective('Transmitter: FILAMENT ON');
    await Story.onBus('ridge', e => e === 'filament');
    Story.objective('Warming up… (30 seconds)');
    await Story.onBus('ridge', e => e === 'warm');
    Story.objective('PLATE ON');
    await Story.onBus('ridge', e => e === 'plate');
    F.needLocalAudio = true;
    Story.objective('Flip LOCAL AUDIO up (transmitter panel)');
    await Story.onBus('ridge', e => e === 'localAudio');
    Story.objective('Key the emergency mic (desk by the window)');
    // the mic
    let keyed = false;
    const mi = Interact.add(N.mic.group, { prompt: 'Key the mic — go on the air', use: () => { keyed = true; } });
    await Story.until(() => keyed);
    Interact.remove(mi);
    Story.objective(null);
    N.mic.btn.material.color.set(0xff2020);
    SND.sfx('switch', {});
    G.mode = 'locked';
    await Player.camTo(new THREE.Vector3(8.6, 1.35, -1.05), new THREE.Vector3(8.6, 1.1, -1.8), 0.6);
    Radio.musicIn.gain.setTargetAtTime(0, SND.now(), 0.1);
    F.broadcast = [];
    await Story.say('EVAN', 'This is — this is Evan Mercer. I work at KTLR. I\'m at the transmitter on Kessler Ridge.', null, 'radio');
    const b1 = await Story.choose(['"There\'s a man up here. His name is Dale Pruitt. He\'s the station\'s engineer."', '"A man named Dale Pruitt. He drives a maroon Buick."'], { blocking: true });
    await Story.say('EVAN', b1 === 0 ? 'There\'s a man up here. His name is Dale Pruitt. He\'s the station engineer.' : 'There\'s a man up here named Dale Pruitt. He drives a maroon Buick LeSabre.', null, 'radio');
    const b2 = await Story.choose(['"He took Jo Park from the Gas-N-Go. She\'s up here with me."', '"He has pictures of missing people. Carrie Lindqvist. Lacey Harmon."'], { blocking: true });
    await Story.say('EVAN', b2 === 0 ? 'He took Jo Park from the Gas-N-Go tonight. She\'s up here with me. She\'s alive.' : 'He has pictures of missing people in his car. Carrie Lindqvist. Lacey Harmon. And Jo Park. She\'s alive. She\'s up here.', null, 'radio');
    await Story.say('EVAN', 'If you can hear this — call the sheriff. Call 911. Tell them Kessler Ridge. Please. Anybody.', null, 'radio');
    // back door deadbolt
    SND.sfx('keys', { pos: D.back.pos }); SND.sfx('click', { pos: D.back.pos, f: 1200, v: 1.4, delay: 0.5 });
    const b3 = await Story.choose(['"Mom — if you\'re listening — I\'m okay. I\'m going to be okay."', '"Mom, lock the doors. He knows where we live."', '[Say nothing more]'], { blocking: true, timeout: 7, def: 2 });
    F.broadcastMom = b3;
    if (b3 === 0) await Story.say('EVAN', 'Mom... if you\'re listening. I\'m okay. I\'m going to be okay.', null, 'radio');
    if (b3 === 1) await Story.say('EVAN', 'Mom, lock the doors. He knows where we live. Lock the—', null, 'radio');
    D.back.locked = false; D.back.open(1, 3);
    SND.sfx('doorSlam', { pos: D.back.pos });
    Stalker.npc.pos.set(8, 0, -6.6); Stalker.npc.root.rotation.y = Math.PI;
    await Player.camTo(null, null, 0.3);
    await Player.lookAtPoint(new THREE.Vector3(8, 1.6, -6), 0.35);
    G.mode = 'walk';
    await Story.say('DALE', '...That\'s how you read it, Evan. That\'s good.', 2.4);
    N.mic.btn.material.color.set(0x661111);
    Radio.musicIn.gain.setTargetAtTime(0.9, SND.now(), 1);
    F.didBroadcast = true;
    D.front.barricaded = false; D.front.locked = false;
    Stalker.hunt('chase'); Stalker.startChase();
    Story.objective('RUN — out the front door and into the trees');
    Story.checkpoint('ch5c');
    await Story.until(() => Player.pos.z > 1.5 || Player.zone() !== 'newb');
    await ch5cHunt();
  },
});

// restart point after the generator (skip the opening talk)
Story.define('ch5b2', {
  defaultFlags: { hasFlashlight: true, hasSiteKeys: true, carDead: true, tarpOff: true, oldBarred: true, genTaskRidge: true },
  async setup() {
    Story.setClock(26, 12);
    Phone.signal = 0; Player.hasFlashlight = true;
    const L = await Common.enter(Levels.tower, { frontLocked: false, genGateLocked: false, oldBulb: false, tarp: false }, [15, 1.0, Math.PI], { fade: true });
    Ridge.setup(L, { power: true, tx: { breaker: true }, lightsOn: true });
    L.genState = 'done'; L.genLoop = L.loop('generator', { pos: new THREE.Vector3(15, 0.8, -3.3), vol: 1.0 });
    L.named.doors.old.locked = true; L.named.doors.front.locked = false; L.named.doors.genGate.set(1);
    Story.flags.oldBarred = true; Story.flags.genTaskRidge = true;
    setupBuickSearch(L);
  },
  async run() {
    // re-enter the same flow as ch5b from "power's back"
    const seg = Story.segments.ch5b;
    void seg;
    const L = G.level;
    ridgeHunter({ x: 1, z: 10, state: 'investigate' });
    Stalker.goTo(15, 1.5, 2.4);
    await ch5bAfterGen(L);
  },
});

// shared tail of ch5b (used when restarting after the generator)
async function ch5bAfterGen(L) {
  const F = Story.flags, N = L.named, D = N.doors;
  Story.objective('Get inside the transmitter building and lock the door!');
  await Story.until(() => Player.zone() === 'newb');
  const bolt = Common.deadbolt(L, D.front, 3, 1.05, -0.25, { locked: false });
  Story.objective('Lock the door (deadbolt)');
  await Story.until(() => D.front.locked && !D.front.isOpen, 25);
  if (!D.front.locked) { D.front.close(); D.front.locked = true; }
  D.front.barricaded = true; Interact.remove(bolt);
  Stalker.walk([[3, 1.6]], 2.2).then(async () => {
    SND.sfx('doorLocked', { pos: D.front.pos });
    await Story.say('DALE', '(through the door) Evan.', 2);
    await Stalker.walk([[11, 1.2], [11.2, -3]], 1.2);
    await Story.say('DALE', '(at the window) Filament takes thirty seconds. I wired it that way.', 3);
    await Stalker.walk([[11, -7], [8.3, -7.2]], 1.2);
  });
  Story.objective('Transmitter: FILAMENT ON');
  await Story.onBus('ridge', e => e === 'filament');
  Story.objective('Warming up… (30 seconds)');
  await Story.onBus('ridge', e => e === 'warm');
  Story.objective('PLATE ON');
  await Story.onBus('ridge', e => e === 'plate');
  F.needLocalAudio = true;
  Story.objective('Flip LOCAL AUDIO up (transmitter panel)');
  await Story.onBus('ridge', e => e === 'localAudio');
  Story.objective('Key the emergency mic (desk by the window)');
  let keyed = false;
  const mi = Interact.add(N.mic.group, { prompt: 'Key the mic — go on the air', use: () => { keyed = true; } });
  await Story.until(() => keyed);
  Interact.remove(mi);
  G.mode = 'locked';
  await Player.camTo(new THREE.Vector3(8.6, 1.35, -1.05), new THREE.Vector3(8.6, 1.1, -1.8), 0.6);
  Radio.musicIn.gain.setTargetAtTime(0, SND.now(), 0.1);
  await Story.lines([
    ['EVAN', 'This is Evan Mercer, KTLR. I\'m at the transmitter on Kessler Ridge.', null, 'radio'],
    ['EVAN', 'There\'s a man here. Dale Pruitt. He took Jo Park from the Gas-N-Go. She\'s alive.', null, 'radio'],
    ['EVAN', 'Call the sheriff. Call 911. Kessler Ridge. Please.', null, 'radio'],
  ]);
  F.broadcastMom = 2; F.didBroadcast = true;
  SND.sfx('keys', { pos: D.back.pos });
  D.back.locked = false; D.back.open(1, 3); SND.sfx('doorSlam', { pos: D.back.pos });
  Stalker.npc.pos.set(8, 0, -6.6);
  await Player.camTo(null, null, 0.3);
  G.mode = 'walk';
  await Story.say('DALE', '...That\'s how you read it.', 2);
  Radio.musicIn.gain.setTargetAtTime(0.9, SND.now(), 1);
  D.front.barricaded = false; D.front.locked = false;
  Stalker.hunt('chase'); Stalker.startChase();
  Story.objective('RUN — out the front door and into the trees');
  Story.checkpoint('ch5c');
  await ch5cHunt();
}

// ---------------------------------------------------------------------------
// the woods: lose him, loop back to Jo, get to the Buick
async function ch5cHunt() {
  const F = Story.flags, L = G.level, N = L.named, D = N.doors;
  Stalker.lines = DALE_TAUNTS;
  Stalker.patrol = [[3, 3], [13, 2], [10, -9.5], [-1, -8.5], [-6, -24], [-18, -38], [-4, 4], [-12, 10], [-17, 16]].map(p => new THREE.Vector3(p[0], 0, p[1]));
  // phase 1: break line of sight
  await Story.until(() => Stalker.state === 'search' || Stalker.state === 'patrol');
  Story.objective('Stay hidden. Let him pass.');
  await Story.until(() => Stalker.state === 'patrol' || (Stalker.state === 'search' && U.dist2(Player.pos.x, Player.pos.z, Stalker.npc.pos.x, Stalker.npc.pos.z) > 35));
  await Story.think('He\'s moving away. ...He\'s going back up the hill. Toward the buildings.');
  Story.objective('Circle back to Jo — follow the trail along the creek, then up to the old building');
  // phase 2: reach the old building
  await Story.until(() => U.dist2(Player.pos.x, Player.pos.z, D.old.pos.x + 1.2, D.old.pos.z) < 2.2);
  Story.objective('Knock on the door — quietly');
  await Story.onBus('ridge', e => e === 'knockOld');
  await Story.say('EVAN', '(whispering) Jo. Jo, it\'s me.', 2);
  SND.sfx('thud', { pos: D.old.pos, v: 0.5 }); D.old.locked = false; F.oldBarred = false; D.old.barricaded = false; D.old.open();
  let jo = NPCs.get('jo');
  if (!jo) jo = NPCs.spawn('jo', { x: -20, z: 18, ry: Math.PI / 2, y: L.groundAt(-20, 18) });
  jo.pos.set(-19.8, L.groundAt(-19.8, 18), 18); jo.pose = 'stand'; jo.lookAt(G.camera.position);
  await Story.lines([
    ['JO', 'You did it. There\'s a little radio in here — I heard you. I heard you say my name. Everybody heard you.'],
    ['EVAN', 'We need a car.'],
  ]);
  if (!F.hasBuickKey) await Story.say('JO', 'His. He keeps a spare key in the sun visor. I watched him put it there.');
  else await Story.say('EVAN', 'I have his key. The spare. It was in the visor.');
  await Story.say('JO', 'I can walk. Slow. Just — don\'t leave me.');
  F.hasBuickKey = true;
  Story.objective('Get to the Buick behind the transmitter building — Jo is with you');
  jo.walkTo([[-18, 17.5]], 1.2);
  Common.follow(jo, { speed: 1.5, fast: 2.2, near: 2.0, far: 14, onFar: () => { if (!jo._warned) { jo._warned = true; Story.say('JO', 'Evan — wait. Wait for me.', 2); setTimeout(() => { jo._warned = false; }, 9000); } } });
  Stalker.state = 'patrol';
  // reach the car
  await Story.until(() => U.dist2(Player.pos.x, Player.pos.z, 5, -11.5) < 7 && U.dist2(jo.pos.x, jo.pos.z, 5, -11.5) < 12);
  Story.objective('Get in and start the car!');
  // he sees them
  Stalker.npc.pos.set(-3, L.groundAt(-3, -14), -14);
  Stalker.state = 'chase'; Stalker.alert = 1; Stalker.speed = 3.2; Stalker._repath = 0;
  SND.sfx('sting', { bus: 'ui', v: 0.8 });
  await Story.say('DALE', 'JO.', 1.2);
  let started = false;
  const ci = Interact.add(N.buick, { prompt: 'Start the car', hold: 1.4, use: () => { started = true; } });
  Stalker.catchDist = 0.9;
  await Story.until(() => started);
  Interact.remove(ci);
  Stalker.active = false;
  jo._stopFollow = true;
  // cinematic escape
  G.mode = 'cutscene';
  SND.sfx('carDoorClose', {}); SND.sfx('ignition', { dur: 0.9 });
  Car.park(N.buick, { color: 0x3a1418, engine: true, headlights: true, yaw: 0 });
  Car.lookLocked = true;
  jo.setVisible(false);
  await Story.wait(1.1);
  const dn = Stalker.npc; dn.managed = false; dn.pose = 'run';
  dn.pos.copy(N.buick.localToWorld(new THREE.Vector3(1.8, 0, 2.5)));
  dn.face(N.buick.position.x, N.buick.position.z);
  Engine.glitch(0.6, 0.5);
  await Story.say('JO', 'GO — GO — GO —', 1.4);
  SND.sfx('bang', { v: 1.6, metal: true }); Engine.shake(0.2, 0.5); Engine.glitch(1.5, 0.8);
  SND.sfx('glass', { delay: 0.05 });
  await Story.say('DALE', '(slamming his palm on the window) EVAN.', 1.6);
  Car.engine && Car.engine.set('rpm', 4500);
  Car.engine && Car.engine.set('load', 1);
  await UI.fade(1, 0.9);
  Car.lookLocked = false;
  Car.unpark(); G.mode = 'cutscene';
  SND.stopLevelLoops(0.5);
  await Story.wait(1);
  Story.goto('ch6a');
}

Story.define('ch5c', {
  chapterSelect: 'Part Five — The Woods',
  defaultFlags: { hasFlashlight: true, hasSiteKeys: true, carDead: true, tarpOff: true, oldBarred: true, didBroadcast: true },
  async setup() {
    Story.setClock(26, 20);
    Phone.signal = 0; Player.hasFlashlight = true;
    const L = await Common.enter(Levels.tower, { frontLocked: false, genGateLocked: false, oldBulb: false, tarp: false, cutters: false }, [3, 1.8, Math.PI], { fade: true });
    Ridge.setup(L, { power: true, tx: { breaker: true, fil: true, warm: true, plate: true, local: true }, lightsOn: true });
    Radio.setOnAir(true);
    L.genState = 'done'; L.genLoop = L.loop('generator', { pos: new THREE.Vector3(15, 0.8, -3.3), vol: 1.0 });
    L.named.doors.old.locked = true; L.named.doors.old.barricaded = true; L.named.doors.front.set(1);
    Story.flags.oldBarred = true;
    setupBuickSearch(L);
  },
  async run() {
    ridgeHunter({ x: 3, z: -3, state: 'chase' });
    Stalker.alert = 1; Stalker.startChase();
    Story.objective('RUN — into the trees');
    await ch5cHunt();
  },
});
