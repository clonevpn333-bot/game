'use strict';
// PART FOUR — ROUTE 9 / KESSLER RIDGE ROAD.

Story.define('ch4a', {
  card: ['PART FOUR', 'ROUTE 9', '1:14 AM'],
  chapterSelect: 'Part Four — Route 9',
  defaultFlags: { hasFlashlight: true, joDedication: 'full', lockboxCode: true, deputyCame: true, offAir: true },
  async setup() {
    Story.setClock(25, 14);
    Radio.setOnAir(false); Radio.setWhisper(0);
    Phone.signal = 3;
    Player.hasFlashlight = true; Story.flags.hasFlashlight = true;
    const L = await Common.enter(Levels.road, { road: 'route9' }, null, { fade: false });
    Car.start(L.road, { s: 6, v: 0, endS: L.road.length - 30, onEnd: () => Story.goto('ch4gas'), radioVol: 0.45 });
    Car.setTune(94.1);
    SND.sfx('engineStartup', {});
  },
  async run() {
    UI.fade(0, 1.5);
    Story.objective('Kessler Ridge — Route 9, past the Gas-N-Go, then up the mountain');
    await Story.wait(5);
    await Story.think('Static. Even out here. We\'re just... gone.');
    Car.events.push({ s: 380, fn: () => Story.think('The diner. Carrie Lindqvist worked there. They found her car at mile fourteen with the radio on.') });
    Car.events.push({ s: 820, fn: () => Story.think('Gas-N-Go\'s coming up. I could just — drive past. Just look.') });
  },
});

Story.define('ch4gas', {
  async setup() {
    Car.stop();
    Story.setClock(25, 17);
    await Common.enter(Levels.gas, { joCar: true, backOpen: true, flicker: true, dale: false }, [7.2, 14, Math.PI / 2], { fade: false });
  },
  async run() {
    const F = Story.flags, L = G.level, N = L.named, D = N.doors;
    Car.park(N.evanCar, { engine: true, headlights: true, yaw: 0.9 });
    UI.fade(0, 1.5);
    await Story.wait(2);
    await Story.think('Her car\'s still here. The lights are on.');
    await Story.think('...There\'s nobody at the counter.');
    UI.hint('<b style="border:1px solid #777;padding:0 5px">E</b> get out', 5);
    await Story.until(() => Input.pressed('KeyE'));
    Input.consume('KeyE');
    SND.sfx('carDoorOpen', {});
    await UI.fade(1, 0.4);
    Car.unpark(1.4);
    UI.fade(0, 0.8);
    Story.objective('Find Jo');
    // Jo's phone on the counter, buzzing
    const jp = B.group(L.root, 4.45, 1.05, 2.0, 0.4);
    B.box(jp, 0, 0, 0, 0.05, 0.02, 0.1, B.col(0x6a2a5a));
    const jpLight = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.03), new THREE.MeshBasicMaterial({ color: 0x80c0ff })); jpLight.rotation.x = -Math.PI / 2; jpLight.position.y = 0.021; jp.add(jpLight);
    let buzzing = true;
    Story.spawn(async () => { while (buzzing) { SND.sfx('vibrate', { pos: new THREE.Vector3(4.45, 1.1, 2.0), n: 2 }); jpLight.visible = true; await Story.wait(1.3); jpLight.visible = false; await Story.wait(2.4); } });
    Interact.add(jp, { prompt: () => buzzing ? 'Jo\'s phone — "MOM calling"' : 'Jo\'s phone', use: async () => {
      if (!buzzing || F.answeredJoMom) { await Story.think('Six missed calls. All "MOM."'); return; }
      const c = await Story.choose(['Answer it.', 'Leave it.']);
      if (c === 1) return;
      buzzing = false; F.answeredJoMom = true;
      await StationPhone.call(0, 'Jo\'s phone — MOM', async () => {
        await Story.lines([
          ['', '(a woman, tired, worried)', 1.6, 'phone'],
          ['CALLER', 'Jolene? Honey, why aren\'t you answering? I\'ve called six times—', null, 'phone'],
          ['EVAN', '...This isn\'t Jo. I\'m — a friend. She\'s not here.'],
          ['CALLER', 'What do you mean she\'s not there? She\'s working. She\'s always there till six.', null, 'phone'],
          ['CALLER', 'Who is this? Where is my daughter?', null, 'phone'],
        ]);
        const c2 = await Story.choose(['I\'m going to find her.', 'Call the police. Please.', '[Hang up]']);
        if (c2 === 0) await Story.lines([['EVAN', 'I think I know where she is. I\'m going to find her.'], ['CALLER', 'What? What does that — who ARE you—', null, 'phone']]);
        if (c2 === 1) await Story.lines([['EVAN', 'Call the sheriff. Please. Tell them Jo\'s missing from the Gas-N-Go on 9.'], ['CALLER', 'Oh god. Oh god—', null, 'phone']]);
      });
    } });
    // radio on counter: static
    // receipt in the back room
    const rc = B.texPlane(L.root, TEX.get('paper', ['GAS-N-GO', '#4471', '', 'This ones for', 'Jo, working', 'the night', 'counter...'], { fs: 10, w: 96, h: 160 }), 5.6, 0.02, -6.6, 0.1, 0.17, { rx: -Math.PI / 2, rz: 0.6 });
    Interact.add(rc, { prompt: 'A receipt on the floor', use: async () => { F.joReceipt = true; await UI.doc(`GAS-N-GO #4471 · RT 9 · 10/15/04 11:31P\n1  COFFEE 20OZ      0.79\n1  DUCT TAPE 60YD   4.29\n   TOTAL            5.08\n   CASH\n\n<i>On the back, in purple pen:</i>\n\n<span style="font-family:cursive">"This one's for Jo, working the night counter at the Gas-N-Go on Route 9 all by herself — and for anybody else working alone tonight. You're not alone."</span>`, 'fax'); await Story.think('Coffee and duct tape. That\'s the coffee guy\'s receipt. She wrote her dedication on the back of it.'); } });
    B.box(L.root, 5.0, 0, -7.4, 0.5, 0.35, 0.4, B.col(0xa07850)); // spilled box
    const bk = new THREE.PointLight(0xfff0d0, 2.5, 6, 1.6); bk.position.set(5.5, 2.4, -7.2); L.add(bk);
    // back exit door open to the night
    B.box(L.root, 5.5, 0, -10.05, 1.0, 2.1, 0.1, B.col(0x05070a));
    // CCTV replay
    let replayed = false;
    Interact.add(L.named.cctv.group, { prompt: () => replayed ? 'Security monitor' : 'Rewind the security tape (VCR under the monitor)', use: async () => {
      if (replayed) { await Story.think('Live view. The store. Me, from above, looking small.'); return; }
      replayed = true; F.sawReplay = true;
      L.cctvForce = true;
      const ghostJo = NPCs.spawn('jo', { x: 5.55, z: 1.6, ry: -Math.PI / 2 });
      const ghostMan = NPCs.spawn('dale', { x: -1.2, z: 7.5, ry: Math.PI });
      [ghostJo, ghostMan].forEach(n => n.root.traverse(m => m.layers.set(1)));
      const focus = Common.focus(new THREE.Vector3(5.75, 2.2, 0.55), new THREE.Vector3(6.3, 2.35, 0.25), 'gascctv');
      UI.toast('◀◀ REW', 2.2); SND.sfx('tapeIn', { bus: 'ui' });
      await Story.wait(2.4);
      UI.toast('▶ PLAY — CAM 1 — 12:04 AM', 18);
      SND.sfx('tapePlay', { bus: 'ui' });
      await ghostMan.walkTo([[-1.2, 4.5], [1.0, 3.9], [3.2, 4.0]], 1.2);
      ghostMan.face(4.5, 2.5); ghostJo.lookAt(new THREE.Vector3(3.2, 1.6, 4.0)); ghostMan.talking = true; ghostJo.talking = true;
      await Story.wait(3.5);
      await Story.think('A man at the counter. Cap. I can\'t see his face. He\'s... talking. She laughs.');
      ghostMan.talking = false;
      await ghostJo.walkTo([[5.6, 4.4], [3.8, 4.5]], 1.1);
      await Story.wait(0.8);
      ghostMan.walkTo([[1.0, 4.6], [-1.2, 4.6], [-1.2, 8.5]], 1.2);
      await Story.wait(0.6);
      await ghostJo.walkTo([[1.0, 4.7], [-1.2, 4.7], [-1.0, 8.5]], 1.25);
      ghostJo.remove(); ghostMan.remove();
      await Story.wait(1);
      await Story.think('She went with him. She just... walked out with him. She knew him.');
      await Story.think('Twelve-oh-four. Right after her dedication.');
      UI.toast('■ STOP', 2);
      L.cctvForce = false;
      await focus;
    } });
    // the store phone / payphone: 911
    let called = false;
    const call911 = async () => {
      if (called) { await Story.think('They\'re not coming. Not in time.'); return; }
      called = true; F.called911Gas = true;
      SND.sfx('dtmf', { digits: '911', bus: 'voice' });
      await Story.wait(1.2);
      await StationPhone.call(0, '911', async () => {
        await Story.lines([
          ['DISPATCH', '911, what is the address of your emergency?', null, 'phone'],
          ['EVAN', 'The Gas-N-Go on Route 9. The clerk is gone. Jo — Jolene. Her car\'s here, her phone\'s here, and the camera shows her leaving with some guy.'],
          ['DISPATCH', 'Is there any sign of a struggle? Any injury?', null, 'phone'],
          ['EVAN', '...No. She walked out with him.'],
          ['DISPATCH', 'Sir, an adult leaving her place of work isn\'t something I can — she may have gone home sick, or with a friend.', null, 'phone'],
          ['EVAN', 'She was on the radio. Whispering. She said she was at the tower — the transmitter on Kessler Ridge —'],
          ['DISPATCH', 'Okay. Okay. I\'m making a note and I\'ll relay to the deputy as soon as he clears his call in Hollis. Is there anything else?', null, 'phone'],
          ['EVAN', 'How long?'],
          ['DISPATCH', 'I can\'t give you a time. Please don\'t go anywhere you shouldn\'t, okay? Let us handle it.', null, 'phone'],
        ]);
      });
      await Story.think('"Let us handle it." Nobody is handling it.');
    };
    Interact.add(L.named.payphone, { prompt: 'Payphone — call 911 (free)', use: call911 });
    Interact.add(L.named.register, { prompt: 'Store phone — call 911', use: call911 });
    Interact.add(L.named.doors.restroom.panel, { prompt: 'Restroom (locked)', use: async () => { SND.sfx('knock', { pos: L.named.doors.restroom.pos, n: 3 }); await Story.say('EVAN', 'Jo? Are you in there?'); await Story.wait(2); await Story.think('Nothing.'); } });
    await Story.until(() => (replayed && !L.cctvForce) || (G.time > 0 && F.called911Gas), 600);
    await Story.until(() => replayed && called && G.mode === 'walk', 600);
    buzzing = false;
    Story.objective('Kessler Ridge. Get back in the car.');
    await Story.think('If she\'s up there, nobody else is coming.');
    let go = false;
    const ci = Interact.add(N.evanCar, { prompt: 'Drive to Kessler Ridge', use: () => { go = true; } });
    await Story.until(() => go);
    Interact.remove(ci);
    SND.sfx('carDoorOpen', {});
    await UI.fade(1, 0.8);
    Story.goto('ch4b');
  },
});

Story.define('ch4b', {
  card: null,
  chapterSelect: 'Part Four — Kessler Ridge Road',
  defaultFlags: { hasFlashlight: true, joDedication: 'full', lockboxCode: true, sawReplay: true },
  async setup() {
    Story.setClock(25, 24);
    Radio.setOnAir(false);
    Phone.signal = 2;
    const L = await Common.enter(Levels.road, { road: 'mountain' }, null, { fade: false });
    Car.start(L.road, { s: 6, v: 4, endS: L.road.length - 25, onEnd: () => Story.goto('ch5a'), radioVol: 0.5, maxSpeed: 21 });
    Car.setTune(94.1);
  },
  async run() {
    const F = Story.flags, L = G.level, road = L.road;
    UI.fade(0, 1.5);
    Story.objective('Kessler Ridge transmitter — up the mountain road');
    const ev = (s, fn) => Car.events.push({ s, fn: () => Story.spawn(fn) });
    ev(200, async () => { await Story.think('Six miles up. Last time Ray drove. I held the flashlight and he complained about his back.'); });
    ev(420, async () => { Phone.signal = 1; });
    // deer
    ev(640, async () => {
      const deer = makeDeer(L.root); const m = road.sample(700); deer.position.copy(m.p.addScaledVector(m.r, 1.2)); deer.rotation.y = Math.atan2(-m.r.x, -m.r.z);
      await Story.until(() => Car.s > 680 || false, 12);
      if (Car.s > 690) { deer.visible = false; return; }
      SND.sfx('sting', { bus: 'ui', v: 0.4 });
      await Story.think('— DEER —');
      const start = deer.position.clone(), end = start.clone().addScaledVector(m.r, -14);
      for (let t = 0; t <= 1.0001; t += 0.04) { deer.position.lerpVectors(start, end, t); deer.position.y = start.y + Math.abs(Math.sin(t * 12)) * 0.4; await Story.wait(0.04); if (U.dist2(Car.group.position.x, Car.group.position.z, deer.position.x, deer.position.z) < 2.2) { SND.sfx('thud', { v: 1.2 }); Engine.shake(0.1, 0.4); Car.v *= 0.4; break; } }
      SND.sfx('rustle', { pos: end, v: 1.5 });
      deer.visible = false;
      await Story.think('Jesus. Jesus Christ. Breathe.');
    });
    ev(950, async () => { Phone.signal = 0; UI.toast('No Service', 3); await Story.think('No service. Of course.'); });
    ev(1150, async () => {
      if (F.readLog2001) await Story.think('The scenic turnout. ...Tom. The trucker in the 2001 log. "Pulling off at the turnout to sleep."');
      else await Story.think('Scenic turnout. Kids used to come up here to park. Mom made me promise never to.');
    });
    // THE VOICE
    ev(1350, async () => {
      if (Math.abs(Car.tune - 94.1) > 0.05) { await Story.think('...Back to 94.1. Habit.'); Car.setTune(94.1); }
      await Story.wait(2);
      // the transmitter comes on — but the studio isn't what's on the air
      Radio.musicIn.gain.setTargetAtTime(0, SND.now(), 0.05);
      Radio.setOnAir(true);
      Car.setReception(1);
      SND.sfx('relay', { bus: 'radio' });
      await Story.think('The static stopped.');
      await Story.wait(2.5);
      await Story.say('', '(dead air. A low hum. Someone breathing close to a microphone.)', 3.2, 'radio');
      Car.auto = { thr: 0, brk: 0.6 };
      await Story.say('DALE', 'You shouldn\'t have left the station, Evan.', 3.6, 'radio');
      await Story.wait(2);
      await Story.say('DALE', 'Everybody could hear you there.', 3.2, 'radio');
      await Story.wait(2.2);
      await Story.say('DALE', 'Out here it\'s just us.', 3.2, 'radio');
      await Story.wait(1);
      SND.sfx('relay', { bus: 'radio' });
      Radio.setOnAir(false);
      Radio.musicIn.gain.setTargetAtTime(0.9, SND.now(), 0.5);
      F.heardVoice = true;
      SND.sfx('swell', { bus: 'ui', dur: 6, v: 1 });
      await Story.until(() => Car.v < 0.4, 8);
      Car.auto = { thr: 0, brk: 1 };
      await Story.think('He\'s up there. He\'s up there right now and he knows I\'m coming.');
      await Story.think('Half the county just heard that. Hank. Walt. The nurse. ...Mom.');
      const c = await Story.choose(['Turn around.', 'Keep going.'], { blocking: true });
      if (c === 0) {
        await Story.think('Turn around and go where? The deputy\'s in Hollis. Dispatch thinks she went home sick. Ray thinks it\'s truckers.');
        await Story.think('If I turn around, nobody goes up there. Nobody.');
      } else await Story.think('Keep going. Keep going before you think about it.');
      Car.auto = null;
    });
    // headlights behind
    ev(1650, async () => {
      const t = L.spawnTraffic({ s: Car.s - 120, d: 1.8, dir: 1, follow: true, gap: 110, color: 0x222222 });
      await Story.wait(6);
      await Story.think('Headlights. Behind me.');
      for (let k = 0; k < 120; k++) { t.gap = U.lerp(t.gap, 18, 0.03); await Story.wait(0.15); }
      // high beams flash
      for (let k = 0; k < 3; k++) { t.g.userData.beams.forEach(b => { b.intensity = 220; }); await Story.wait(0.25); t.g.userData.beams.forEach(b => { b.intensity = 60; }); await Story.wait(0.3); }
      await Story.think('Back off. Back OFF.');
      await Story.wait(5);
      for (let k = 0; k < 60; k++) { t.gap += 4; await Story.wait(0.1); }
      t.g.userData.setLights(false, false); t.alive = false; t.g.visible = false;
      await Story.wait(1.5);
      await Story.think('...It\'s gone. There\'s a logging road back there. It just turned off.');
      await Story.think('Was it even following me?');
    });
    ev(2380, async () => { await Story.think('Private road. Almost there.'); });
    ev(road.length - 80, async () => { await Story.think('The gate\'s open. Ray always locks the gate.'); });
  },
});
