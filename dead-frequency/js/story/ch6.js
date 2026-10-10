'use strict';
// PART SIX — DEAD AIR. Back down the mountain, back to the station, and out.

Story.define('ch6a', {
  card: ['PART SIX', 'DEAD AIR', '2:21 AM'],
  chapterSelect: 'Part Six — Dead Air',
  defaultFlags: { hasFlashlight: true, didBroadcast: true, broadcastMom: 0, hasBuickKey: true, joDedication: 'full' },
  async setup() {
    Story.setClock(26, 21);
    Radio.setOnAir(true); Radio.setWhisper(0); Radio.musicIn.gain.setTargetAtTime(0.9, SND.now(), 0.2);
    Phone.signal = 0;
    const L = await Common.enter(Levels.road, { road: 'descent' }, null, { fade: false });
    Car.start(L.road, { s: 8, v: 6, endS: L.road.length - 20, onEnd: () => Story.goto('ch6b'), radioVol: 0.45, color: 0x3a1418, maxSpeed: 20, radioOn: false });
    Car.setTune(94.1);
    const jo = NPCs.spawn('jo', { x: 0, z: 0, ry: 0, pose: 'sit' });
    Car.group.add(jo.root); jo.root.position.set(-0.37, 0.08, -0.12); jo.root.rotation.y = 0;
    jo.managed = false;
  },
  async run() {
    const F = Story.flags, L = G.level;
    const jo = NPCs.get('jo');
    UI.fade(0, 1.2);
    Story.objective('Get down the mountain');
    // the tape in his deck
    await Story.wait(2);
    const hiss = SND.loop('tapeHiss', { bus: 'radio', vol: 1.2 });
    SND.sfx('tapePlay', { bus: 'radio' });
    await Story.wait(1.5);
    await Story.say('LACEY', '(on tape, warm, a little tired) ...It\'s midnight in the Gap. If you\'re still up, you\'re not alone.', 4.2, 'radio');
    await Story.say('LACEY', 'I\'m right here.', 2.6, 'radio');
    jo.lookAt(G.camera.position);
    await Story.say('JO', 'Turn it off. Please. Please turn it off.', 2.2);
    SND.sfx('tapeIn', { bus: 'radio' }); hiss.stop(0.05);
    await Story.think('Eject. Eject. The tape\'s warm. He\'s been playing it.');
    Car.radioOn = true; Car.radio.volume(0.4, 1);
    await Story.wait(2);
    await Story.think('KTLR\'s still on. The generator\'s still running up there. Automation doesn\'t know anything happened.');
    const ev = (s, fn) => Car.events.push({ s, fn: () => Story.spawn(fn) });
    ev(160, async () => {
      await Story.lines([
        ['JO', 'He came in every night. Every single night for three years.'],
        ['JO', 'He\'d ask if I was by myself tonight. I thought he was being nice. Like a dad.'],
        ['EVAN', 'He was writing it down.'],
        ['JO', '...What?'],
        ['EVAN', 'Every dedication. Every time anybody called in and said they were alone. He wrote it in a notebook. You. Me. Lacey Harmon.'],
        ['JO', '(long silence)'],
      ]);
    });
    ev(320, async () => {
      Phone.signal = 2; UI.toast('Signal: 2 bars', 2);
      const msgs = ['evan was that u on the radio', 'EVAN', 'answer ur phone', 'i called the sheriff, they said theyre sending everyone to the ridge', 'ray called me. hes driving back from bend', 'im going to the station. thats where ull go', 'im here. door was unlocked. nobodys here. where are u'];
      if (F.broadcastMom === 1) msgs.splice(2, 0, 'i locked the doors. evan who knows where we live');
      for (const m of msgs) { Phone.receive('Mom', m); await Story.wait(1.4); }
      await Story.think('No. No no no.');
      Story.objective('Call Mom (TAB → Contacts)');
      Phone.onCall('Mom', { quick: false, fn: async () => {
        F.calledMomCh6 = true;
        await Story.say('', '"Hi, you\'ve reached Diane — leave a message!"', 2.5, 'phone');
        SND.sfx('beep', { bus: 'voice', f: 1000, dur: 0.4 });
        await Story.say('EVAN', 'Mom — MOM. Get out of the station. Get in your car and drive. Don\'t wait for me. Please.');
      } });
      await Story.until(() => F.calledMomCh6, 40);
      Story.objective('Get to the station');
      await Story.lines([
        ['JO', 'Why would she go there?'],
        ['EVAN', 'Because that\'s where I\'d go. That\'s where I always am. Every Friday.'],
        ['EVAN', '...And he knows that. It\'s on his clipboard.'],
      ]);
    });
    ev(560, async () => {
      const t = L.spawnTraffic({ s: Car.s + 140, d: -1.8, dir: -1, v: 24, color: 0x1a1a1a });
      const red = new THREE.PointLight(0xff1a10, 30, 25, 1.3), blue = new THREE.PointLight(0x2040ff, 30, 25, 1.3);
      red.position.set(-0.4, 1.6, 0); blue.position.set(0.4, 1.6, 0); t.g.add(red, blue);
      const sir = SND.loop('siren', { pos: t.g.position.clone(), vol: 1.2, ref: 8 }); L.loops.push(sir);
      t.update = (tt) => { const ph = (G.time * 2.6) % 1 < 0.5; red.intensity = ph ? 40 : 0; blue.intensity = ph ? 0 : 40; sir.setPos(tt.g.position); };
      await Story.wait(1.5);
      await Story.think('Lights. Coming up the mountain.');
      await Story.until(() => !t.alive || Math.abs(t.s - Car.s) < 8, 20);
      SND.sfx('horn', { dur: 1.2 });
      await Story.say('EVAN', 'HEY — HEY! WE\'RE HERE —', 1.6);
      await Story.wait(2);
      sir.stop(2);
      await Story.say('JO', 'They\'re going up. We\'re going down.', 2.4);
      await Story.think('Everyone\'s going to the ridge. Because I told them to.');
    });
    ev(820, async () => {
      await Story.think('My car. He has the coil wire. He can put it back in two minutes.');
      await Story.think('If he took the logging road down...');
      const t = L.spawnTraffic({ s: Car.s - 220, d: 1.8, dir: 1, follow: true, gap: 220, color: 0x4d5b4a, beams: true });
      await Story.wait(14);
      t.alive = false; t.g.visible = false;
    });
  },
});

// ---------------------------------------------------------------------------
async function stationFinale() {
  const F = Story.flags, L = G.level, N = L.named, D = N.doors;
  // Mom hides; Dale on the air
  await Story.wait(2);
  Radio.stop();
  SND.sfx('click', { bus: 'radio', v: 1.4 });
  L.setOnAirLight(true);
  await Story.wait(2.5);
  const DR = (t, d) => Story.say('DALE', t, d, 'radio');
  await DR('Good morning, Kessler Gap. It\'s two fifty-one. You\'re listening to KTLR, 94.1 FM.', 4.5);
  await Story.wait(1);
  await DR('Evan\'s mother is with us tonight. Hi, Diane.', 3.2);
  await Story.wait(1.2);
  await DR('Evan. The logger in the engineering room has been recording the air all night. Everything Jo said. Everything you said.', 5);
  await DR('I want that tape. Bring it to the studio, and I walk out the front door. You never hear my voice again.', 5);
  await Story.wait(0.8);
  await DR('I have never once lied on the radio.', 3);
  F.wantLoggerTape = true;
  Story.objective('Get the logger tape (engineering room)');
  // intercom
  Story.spawn(async () => {
    await Story.wait(6);
    const ring = StationPhone.ring(4, { timeout: 25 });
    const ph = await ring;
    if (!ph) return;
    await StationPhone.call(4, 'Intercom — STUDIO A', async () => {
      await Story.lines([
        ['DALE', 'You\'re in the hall. I can hear you breathing on the line.', null, 'phone'],
        ['DALE', 'You left the coffee on, Evan. Six hours. Ray\'s going to be so angry.', null, 'phone'],
        ['DALE', 'Lacey made coffee too. Every night at midnight. She\'d tell everyone. "Fresh pot, if you\'re still up."', null, 'phone'],
      ]);
    });
  });
  await Story.onBus('loggerTape');
  Story.objective(null);
  await Story.think('Everything. Jo\'s voice. Mine. His. It\'s all on here.');
  await Story.think('If I give him this, he still won\'t leave.');
  // he comes out of the studio
  L.setOnAirLight(false);
  Stalker.spawn({ x: 0.2, z: 2.6, ry: Math.PI, nodes: L.nav, patrol: [[0.1, 0], [5.5, 0], [8.6, 0], [10.8, 0], [10.8, -2.2]], lines: ['Diane? You can come out. I\'m not going to hurt your boy.', 'Evan. Bring me the tape.', 'This building has eleven doors. I hung every one of them.', 'Lacey hid in the storage room too. Did you know that?'], state: 'script' });
  Stalker.setFlashlight(true);
  SND.sfx('doorOpen', { pos: D.studio.pos }); D.studio.open(1, 2, true);
  await Stalker.walk([[0.2, 0.2], [5.5, 0.2], [9.8, 0.0]], 1.25);
  Stalker.state = 'idle';
  Stalker.npc.face(10.8, -1.2);
  await Story.say('DALE', '(at the storage room door) Diane?', 2);
  SND.sfx('knock', { pos: D.storage.pos, n: 3, gap: 0.4, v: 0.8 });
  await Story.wait(1);
  await Story.say('DALE', '...I can hear you.', 2.2);
  await Story.think('Mom.');
  await Story.think('The mic. Make him come to me. Everybody\'s listening — make him come to ME.');
  Story.objective('Draw him away from Mom — the studio mic');
  // keep him at the storage door until the broadcast
  let rattle = Story.spawn(async () => { while (Stalker.state === 'idle') { await Story.wait(4 + Math.random() * 3); if (Stalker.state !== 'idle') break; SND.sfx('doorLocked', { pos: D.storage.pos }); } });
  // if Evan walks right up to him, he turns around
  Story.spawn(async () => {
    await Story.until(() => Stalker.state !== 'idle' || (U.dist2(Player.pos.x, Player.pos.z, Stalker.npc.pos.x, Stalker.npc.pos.z) < 4.5 && Phys.lineOfSight(Player.pos.x, Player.pos.z, Stalker.npc.pos.x, Stalker.npc.pos.z, 1.5)));
    if (Stalker.state === 'idle') { F.micHandler = null; F.micPrompt = null; Story.say('DALE', 'Evan.', 1.2); Stalker.state = 'chase'; Stalker.alert = 1; Stalker.startChase(); Story.checkpoint('ch6c'); await stationChase(); }
  });
  void rattle;
  Stalker.state = 'idle';
  await new Promise(res => {
    F.micPrompt = 'Open the mic';
    F.micHandler = async () => {
      F.micHandler = null; F.micPrompt = null;
      SND.sfx('switch', {}); L.setOnAirLight(true);
      await Story.lines([
        ['EVAN', 'This is Evan Mercer at KTLR. Dale Pruitt is inside the station. Right now. He\'s at the storage room door —', null, 'radio'],
        ['EVAN', 'If you can hear this, send them HERE. Not the ridge. KTLR. Route 9.', null, 'radio'],
        ['EVAN', 'Dale. I\'m in the studio. I have your tape. Come get it.', null, 'radio'],
      ]);
      L.setOnAirLight(false);
      res();
    };
  });
  F.secondBroadcast = true;
  Story.checkpoint('ch6c');
  Bus.emit('noise', 3, 4, 60, 'mic');
  Stalker.state = 'chase'; Stalker.alert = 1; Stalker.lastSeen.set(3, 0, 4); Stalker.path = Stalker.route(2, 3.5);
  Stalker.startChase();
  await stationChase();
}

async function stationChase() {
  const F = Story.flags, L = G.level, N = L.named, D = N.doors;
  Story.objective('RUN — out the back door (break room)');
  D.back.locked = false; D.back.sticky = 1; D.back.close(true); D.back.isOpen = false; D.back.angle = 0; D.back.pivot.rotation.y = 0; D.back.col.on = true;
  Stalker.speed = 3.6;
  // back door: stuck, grabbed, coffee pot
  let stuck = false;
  D.back.o.onStuck = () => { stuck = true; };
  await Story.until(() => stuck);
  D.back.o.onStuck = null;
  G.mode = 'cutscene';
  Stalker.active = false;
  const dn = Stalker.npc;
  dn.pos.set(Player.pos.x + 0.3, 0, Player.pos.z + 1.1); dn.pose = 'stand'; dn.face(Player.pos.x, Player.pos.z);
  Player.lookAtPoint(new THREE.Vector3(dn.pos.x, 1.6, dn.pos.z), 0.25);
  SND.sfx('sting', { bus: 'ui', v: 1 }); Engine.glitch(1.2, 0.6); Engine.shake(0.12, 0.6);
  await Story.say('DALE', 'There you are.', 1.2);
  const ok = await Common.qte('BREAK FREE — MASH  E', 9, 3.4);
  if (!ok) { Stalker.active = true; Story.death({ text: 'He had you by the collar.' }); return; }
  // coffee pot
  SND.sfx('glassPot', { pos: dn.pos.clone().setY(1.6) }); SND.sfx('scream', { pos: dn.pos.clone().setY(1.6), v: 1.4, dur: 1.1 });
  Engine.shake(0.2, 0.6); Engine.glitch(1.6, 0.8);
  await Story.think('The coffee pot. Six hours on the burner.');
  dn.pose = 'crouch';
  D.back.sticky = 0;
  G.mode = 'walk';
  Story.objective('PULL HARD, THEN LIFT — get out!');
  await Story.until(() => D.back.isOpen);
  Story.objective('Around the building — to the front lot!');
  await Story.wait(2.5);
  dn.pose = 'stand';
  Stalker.active = true; Stalker.state = 'chase'; Stalker.alert = 1; Stalker.speed = 3.1; Stalker._repath = 0;
  Stalker.lines = ['EVAN.', 'You don\'t get to leave.', 'Nobody leaves the overnight early.'];
  // the end: reach the front lot
  await Story.until(() => Player.pos.z > 10.5 && Math.abs(Player.pos.x) < 16);
  Stalker.active = false;
  await finale();
}

async function finale() {
  const F = Story.flags, L = G.level, N = L.named;
  G.mode = 'cutscene';
  Player.canMove = false;
  const dn = Stalker.npc;
  // sirens
  const sir = L.loop('siren', { pos: new THREE.Vector3(10, 1, 37), vol: 1.5, ref: 15 });
  const c1 = cruiser(L, 40, 37.5, -Math.PI / 2), c2 = cruiser(L, -40, 37.5, Math.PI / 2);
  Common.drivePath(c1, [[18, 37.5], [17, 32], [8, 22]], 14, {});
  Common.drivePath(c2, [[18, 37.5], [16, 31], [-2, 21]], 13, {});
  c1.userData.setLights(true, true); c2.userData.setLights(true, true);
  dn.managed = false;
  dn.pos.set(-13.8, 0, 9.5); dn.pose = 'stand'; dn.face(Player.pos.x, Player.pos.z);
  await Player.lookAtPoint(new THREE.Vector3(-13.8, 1.5, 9.5), 0.8);
  await Story.wait(1.5);
  const spot = new THREE.SpotLight(0xffffff, 300, 60, 0.18, 0.4, 1.0); spot.position.set(8, 1.6, 22); spot.target.position.set(-13.8, 1, 9.5); L.add(spot); L.add(spot.target);
  await Story.say('DEPUTY', 'SHERIFF\'S OFFICE! GET ON THE GROUND! GET ON THE GROUND, NOW!', 3.5);
  await Story.wait(1);
  await Story.think('He\'s just standing there. In the light. Looking at me.');
  Stalker.setFlashlight(false);
  SND.sfx('click', { pos: new THREE.Vector3(-13.8, 1.4, 9.5), f: 2600 });
  await Story.wait(1.2);
  dn.pose = 'crouch';
  await Story.wait(1.5);
  await Story.say('DALE', '(quietly) ...You read it very well, Evan.', 3);
  sir.volume(0.6, 2);
  await Story.wait(1.5);
  // Mom
  const mom = NPCs.spawn('mom', { x: -9.5, z: 9.5, ry: Math.PI });
  N.doors.front.open();
  mom.walkTo([[Player.pos.x - 0.8, Player.pos.z - 0.6]], 3).then(() => { mom.pose = 'stand'; });
  await Story.say('MOM', 'EVAN —', 1.2);
  await Player.lookAtPoint(new THREE.Vector3(mom.pos.x, 1.6, mom.pos.z), 0.6);
  await Story.wait(1.6);
  await Story.lines([
    ['MOM', 'Oh my god. Oh my god. You\'re okay. You\'re okay.'],
    ['EVAN', 'I\'m okay. Mom. I\'m okay.'],
  ]);
  SND.sfx('horn', { pos: new THREE.Vector3(8, 1, 18), dur: 0.3 });
  await Story.say('JO', '(from the Buick, through the open door) ...Is it over?', 2.4);
  await UI.fade(1, 3);
  sir.stop(3);
  await Story.wait(2);
  Story.goto('epilogue');
}

Story.define('ch6b', {
  defaultFlags: { hasFlashlight: true, didBroadcast: true, calledMomCh6: true },
  async setup() {
    Car.stop();
    Story.setClock(26, 44);
    Radio.setOnAir(true); Phone.signal = 3;
    if (!Radio.playing) Radio.start();
    const L = await Common.station({ backpack: true, coffee: 'done', momCar: true, frontLocked: false, backLocked: false, haveFlashlight: true }, [8, 16, Math.PI], { fade: false });
    L.named.buick = P.car(L.root, 8.5, 17.5, Math.PI - 0.2, { color: 0x3a1418, len: 5.0, wid: 1.85, lights: true, beams: true });
  },
  async run() {
    const F = Story.flags, L = G.level, N = L.named, D = N.doors;
    Car.park(N.buick, { color: 0x3a1418, engine: true, headlights: true, yaw: 0.4 });
    UI.fade(0, 1.5);
    await Story.wait(1.5);
    await Story.think('Mom\'s car. Engine running. Driver\'s door wide open.');
    await Story.say('JO', 'Go. Get her. I\'ll lean on the horn if anything moves. I swear to God.', 3);
    UI.hint('<b style="border:1px solid #777;padding:0 5px">E</b> get out', 4);
    await Story.until(() => Input.pressed('KeyE'));
    Input.consume('KeyE');
    SND.sfx('carDoorOpen', {});
    await UI.fade(1, 0.4);
    Car.unpark(1.5);
    N.buick.userData.setLights(true, true);
    UI.fade(0, 0.8);
    Story.objective('Find Mom');
    // phones ringing: listeners
    StationPhone.extraLit = [1, 2, 3];
    let ringing = true;
    Story.spawn(async () => { while (ringing) { const l = L.loop('phoneRing', { pos: new THREE.Vector3(U.pick([5.6, -4]), 1, U.pick([4.9, 6])), vol: 0.5 }); await Story.wait(3 + Math.random() * 3); l.stop(0.05); await Story.wait(1 + Math.random() * 2); } });
    // Mom's purse
    const purse = B.group(L.root, -8.0, 1.09, 5.4, 0.3); B.box(purse, 0, 0, 0, 0.32, 0.22, 0.12, B.col(0x5a2a1a));
    Interact.add(purse, { prompt: 'Mom\'s purse', use: () => Story.think('Her purse. Her keys aren\'t in it. She left the car running.') });
    const mom = NPCs.spawn('mom', { x: -3.6, z: 5.0, ry: Math.PI, pose: 'phone' });
    await Story.untilZone('office');
    mom.pose = 'stand'; mom.face(Player.pos.x, Player.pos.z); mom.lookAt(G.camera.position);
    SND.sfx('hangup', { pos: new THREE.Vector3(-4, 1, 6) });
    await Story.lines([
      ['MOM', 'Evan — oh my God — EVAN —'],
      async () => { await UI.fade(1, 0.4); await Story.wait(1.2); await UI.fade(0, 0.6); },
      ['MOM', 'You were on the radio. You said a man — you said "Mom," I heard you —'],
      ['EVAN', 'Why are you HERE? I told you — I left you a message —'],
      ['MOM', 'I didn\'t — I was driving, I just came — the dispatcher says everyone went up the mountain. She said stay here and lock the doors.'],
      ['EVAN', 'He\'s coming. He\'s got my car.'],
    ]);
    ringing = false;
    // the horn
    await Story.wait(0.5);
    SND.sfx('horn', { pos: new THREE.Vector3(8.5, 1, 17.5), dur: 3 });
    await Story.say('MOM', 'What is that —', 1.4);
    // Evan's car rolls in dark
    const ec = P.car(L.root, 60, 37.5, -Math.PI / 2, { color: 0x4d5b4a });
    Common.drivePath(ec, [[19, 37.5], [17, 32], [20, 26]], 7, { sound: true }).then(() => Common.propSilence(ec));
    Story.objective('Look outside');
    await Story.wait(3);
    await Story.think('My car. Lights off. Rolling into the lot.');
    await Story.wait(3);
    await Story.think('It stopped. Nobody\'s getting out.');
    await Story.wait(2.5);
    // power cut
    SND.sfx('breakerOff', { pos: new THREE.Vector3(-8.6, 1, -8.3) });
    L.setPower(false);
    SND.sfx('powerDown', {});
    N.buick.userData.setLights(false, false);
    await Story.wait(1.5);
    await Story.say('MOM', '(whispering) Evan —', 1.4);
    await Story.lines([
      ['EVAN', '(whispering) Mom. Listen to me. The storage room at the end of the hall. We go now. Quiet.'],
    ]);
    Story.objective('Get Mom to the storage room (end of the hall)');
    Common.follow(mom, { speed: 1.6, fast: 2.4, near: 1.8 });
    await Story.until(() => Player.zone() === 'storage' && U.dist2(mom.pos.x, mom.pos.z, 10.8, -1.6) < 3.5);
    mom._stopFollow = true;
    await mom.walkTo([[11.6, -6.6]], 1.3);
    mom.pose = 'crouch';
    await Story.lines([
      ['EVAN', 'Don\'t open it for anyone but me. Not if he says my name. Not if it sounds like me.'],
      ['MOM', 'Evan. Evan, come in here with me —'],
      ['EVAN', 'He\'ll find both of us. I love you.'],
    ]);
    Story.objective('Leave the storage room');
    await Story.until(() => Player.zone() === 'hall');
    D.storage.close(); D.storage.locked = true; mom.setVisible(false);
    F.momHidden = true;
    await stationFinale();
  },
});

Story.define('ch6c', {
  defaultFlags: { hasFlashlight: true, didBroadcast: true, momHidden: true, secondBroadcast: true },
  async setup() {
    Story.setClock(26, 56);
    Radio.setOnAir(true); Radio.stop();
    const L = await Common.station({ backpack: true, coffee: 'done', momCar: true, frontLocked: true, backLocked: false, haveFlashlight: true }, [3, 4.2, 0], { fade: true });
    L.setPower(false);
    L.named.doors.storage.locked = true;
    L.named.doors.studio.set(1);
    L.named.buick = P.car(L.root, 8.5, 17.5, Math.PI - 0.2, { color: 0x3a1418, len: 5.0, wid: 1.85 });
    Player.hasFlashlight = true;
  },
  async run() {
    const L = G.level;
    Stalker.spawn({ x: 5.5, z: 0, ry: -Math.PI / 2, nodes: L.nav, lines: ['EVAN.', 'Give me the tape.'], state: 'chase' });
    Stalker.setFlashlight(true);
    Stalker.alert = 1; Stalker.startChase();
    await stationChase();
  },
});

// ---------------------------------------------------------------------------
Story.define('epilogue', {
  async setup() { Engine.unloadLevel(); Stalker.reset(); NPCs.clear(); SND.stopAll(1); Radio.stop(); UI.objective(null); UI.fadeNow(1); },
  async run() {
    const F = Story.flags;
    UI.osd(false);
    const card = (t, d) => UI.narr(t, null, d);
    await Story.wait(2);
    await card('The Hollis County Sheriff\'s Office received forty-one calls in the eleven minutes after the broadcast from Kessler Ridge.<br><br>The first was from Walt Ferrin, 71, of Route 9.', 8);
    await card('Dale Pruitt, 54, was arrested in the parking lot of KTLR at 2:58 AM.<br><br>He did not resist. He asked the deputy if he could listen to the end of the song.', 8);
    await card('In a storage unit in Hollis rented under Pruitt\'s name, investigators found more than four hundred VHS tapes — eleven years of KTLR\'s overnight broadcasts — and a request log from 2002 that Ray Tolliver had reported missing.', 9);
    await card('The remains of five people were recovered on and around Kessler Ridge in the spring of 2005.<br><br>Among them was Lacey Harmon, KTLR\'s overnight host, missing since March 14, 1997.', 9);
    await card('Jolene Park recovered from her injuries. She still works nights.<br><br>She has never called a radio station again.', 7);
    await card(F.joDedication === 'full' ? 'Evan read Jo\'s dedication on the air exactly the way she wrote it.<br><br>It took him a long time to understand that it wouldn\'t have mattered. Dale had already been listening to her for three years.' : 'Evan didn\'t read where Jo worked.<br><br>It wouldn\'t have mattered. Dale had already been listening to her for three years.', 9);
    await card('KTLR ended its late-night request show in November 2004.<br><br>The station no longer reads dedications on the air.', 7);
    await UI.narr('People ask me if I still listen to the radio at night.<br><br>I don\'t.<br><br>It\'s not the music. It\'s that every single person who calls in is telling somebody they\'re alone.<br><br>I just never thought about who else was listening.', '— Evan Mercer', 13);
    await UI.card('<div class="ch-title">DEAD FREQUENCY</div><div class="ch-time">a story that never made the news</div>', 6);
    await UI.card('<div class="narr">All characters, places, stations and songs in this story are fictional.<br><br>Written and built with Claude Code.<br><br>Thank you for listening.</div><span class="sig" style="display:block;margin-top:20px;color:#888">— KTLR 94.1 FM, signing off</span>', 8);
    try { localStorage.setItem('df_save', JSON.stringify({ seg: null, flags: {}, reached: Story.reached.concat(['epilogue']) })); } catch (e) { /* */ }
    UI.bluescreen('■ STOP');
    await Story.wait(3);
    location.reload();
  },
});
