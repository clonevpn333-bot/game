'use strict';
// PART THREE — HARBOR LIGHTS. A song nobody has played since 1997, a woman whispering under the broadcast, dead air.

function cruiser(L, x, z, ry) {
  const c = P.car(L.root, x, z, ry, { color: 0x1a1a1a, len: 4.9, collide: true });
  B.box(c, 0, 0.3, 0.9, 1.78, 0.56, 1.6, B.col(0xe8e8e8)); // white doors
  const bar = B.box(c, 0, 1.36, -0.1, 1.2, 0.1, 0.25, B.col(0x222222)); void bar;
  const red = new THREE.PointLight(0xff1a10, 0, 25, 1.3), blue = new THREE.PointLight(0x1a40ff, 0, 25, 1.3);
  red.position.set(-0.4, 1.6, 0); blue.position.set(0.4, 1.6, 0); c.add(red, blue);
  const rm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.22), new THREE.MeshBasicMaterial({ color: 0x330000 })); rm.position.set(-0.32, 1.42, -0.1); c.add(rm);
  const bm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.22), new THREE.MeshBasicMaterial({ color: 0x000033 })); bm.position.set(0.32, 1.42, -0.1); c.add(bm);
  c.userData.flash = true;
  L.onUpdate(() => { if (!c.userData.flash || !c.visible) { red.intensity = blue.intensity = 0; return; } const ph = (G.time * 2.6) % 1; const r = ph < 0.5; red.intensity = r ? 40 : 0; blue.intensity = r ? 0 : 40; rm.material.color.set(r ? 0xff2010 : 0x220000); bm.material.color.set(r ? 0x000022 : 0x2040ff); });
  return c;
}

Story.define('ch3', {
  card: ['PART THREE', 'HARBOR LIGHTS', '12:06 AM'],
  chapterSelect: 'Part Three — Harbor Lights',
  seamless: true,
  defaultFlags: { hasFlashlight: true, backLocked: true, coffeeMade: true, metJo: true, metDale: true, joDedication: 'full', firstCall: true, prodBOpened: true, called911: true },
  async setup(o) {
    Story.setClock(24, 6);
    Radio.setWhisper(0); Radio.setOnAir(true);
    if (o.restart || !G.level || G.level.name !== 'station') {
      await Common.station({ backpack: true, coffee: 'done', backLocked: true, haveFlashlight: true, frontLocked: true, prodLamp: true }, [3, 5.0, Math.PI]);
      G.level.named.doors.prodb.locked = false;
    } else UI.fade(0, 1.5);
    G.level.named.doors.front.locked = true;
    ch2CallHandlers();
  },
  async run() {
    const F = Story.flags, L = G.level, N = L.named, D = N.doors;
    Player.hasFlashlight = true;
    await Story.wait(2);
    await Story.think('Midnight. I missed the midnight ID. Ray is going to kill me.');
    await Story.think('...That\'s the least of my problems.');
    Phone.receive('Mom', 'u still up? cant sleep. watching a infomercial for a knife that cuts shoes. why would u need to cut a shoe');
    Phone.offerReplies('Mom', ['lol. go to bed', 'mom are the doors locked', 'i love you'], (i) => { F.momReply3 = i; if (i === 1) Story.spawn(async () => { await Story.wait(6); Phone.receive('Mom', 'yes?? why. whats wrong'); Phone.offerReplies('Mom', ['nothing. just checking', 'nothing. go to sleep'], () => {}); }); });
    await Story.wait(14);

    // --- Harbor Lights request ---
    await StationPhone.ring(1);
    await StationPhone.call(1, 'Request line', async () => {
      await Story.say('EVAN', '...KTLR.');
      await Story.wait(1.6);
      await Story.lines([
        ['???', 'Hello. I\'m sorry to call so late.', null, 'phone'],
        ['???', 'Could you play "Harbor Lights"? Marian Tell.', null, 'phone'],
        ['???', 'It was her favorite.', null, 'phone'],
        ['EVAN', 'Whose favorite? Hello?'],
        ['???', 'Thank you, Evan.', null, 'phone'],
      ]);
    });
    F.harborRequested = true;
    Story.setClock(24, 9);
    await Story.think('Same voice. Calm. Polite. Like he\'s asking for a weather report.');
    Story.objective('Find "Harbor Lights" — Marian Tell (Library)');
    const tookLP = Story.onBus('tookLP');
    Story.spawn(async () => { await Story.onBus('catalogHarbor'); await Story.think('Last played March 14th, 1997. One-oh-two in the morning. "L.H."'); await Story.think('...Lacey Harmon. The night she disappeared.'); });
    await tookLP;
    Story.objective('Decide what to do with the record (turntable in the studio)');
    const r = await Promise.race([Story.onBus('lpOnTable').then(() => 'play'), Story.wait(150).then(() => 'no')]);
    Story.objective(null);
    if (r === 'play') {
      F.playedHarbor = true;
      await Story.think('If I play it, he stops calling. Maybe. That\'s the deal, right?');
      Radio.playNow('harbor_lights');
      L.setOnAirLight(false);
      await Story.wait(6);
      await Story.think('...It\'s beautiful. That\'s the worst part. It\'s actually beautiful.');
      await Story.wait(8);
      StationPhone.extraLit = [1, 2, 3];
      SND.sfx('lineClick', { pos: N.studioPhone.group.position.clone() });
      await Story.wait(3);
      StationPhone.extraLit = null;
      await Story.think('All three lines just lit up. And went dark. Nobody rang.');
    } else {
      F.playedHarbor = false;
      if (Player.holding('lp')) Player.drop();
      await StationPhone.ring(1);
      await StationPhone.call(1, 'Request line', async () => {
        await Story.say('EVAN', '...KTLR.');
        await Story.wait(2);
        await Story.say('???', 'You didn\'t play it.', null, 'phone');
        await Story.wait(2.5);
        await Story.say('???', 'That\'s alright.', null, 'phone');
        await Story.say('???', 'Someone else will.', null, 'phone');
      });
    }
    Story.setClock(24, 28);
    await Story.wait(10);

    // --- Jo doesn't call back ---
    Story.setClock(24, 31);
    if (F.joDedication) {
      await Story.think('Twelve thirty-one. Jo said she\'d call back at twelve-thirty. "It\'s tradition."');
      Story.objective('(Optional) Call the Gas-N-Go');
      StationPhone.outgoing.gasngo = { rings: 0.5, fn: async () => {
        F.calledGas = true;
        UI.callUI('☎ Gas-N-Go — ringing…');
        const rb = SND.loop('ringback', { bus: 'voice', vol: 0.45 });
        await Story.wait(14); rb.stop(0.02);
        await Story.think('Nobody\'s answering. ...She\'s probably in the back. Restocking. Smoking.');
      } };
      await Promise.race([Story.until(() => F.calledGas && !StationPhone.inCall), Story.wait(70)]);
      Story.objective(null);
    }
    // --- deputy ---
    Story.setClock(24, 40);
    const cr = cruiser(L, -2, 19, Math.PI - 0.3);
    SND.sfx('carDoorClose', { pos: new THREE.Vector3(-2, 1, 19) });
    await Story.wait(2.5);
    const dep = NPCs.spawn('deputy', { x: -9.4, z: 9.6, ry: Math.PI, pose: 'stand' });
    SND.sfx('knock', { pos: new THREE.Vector3(-9.5, 1.3, 8), n: 3, v: 1.4 });
    await Story.think('...Someone at the front door.');
    Story.objective('The front door');
    await Story.wait(4);
    SND.sfx('knock', { pos: new THREE.Vector3(-9.5, 1.3, 8), n: 4, v: 1.6 });
    await Story.say('DEPUTY', '(through the door) Sheriff\'s office!', 2.2);
    await Story.until(() => D.front.isOpen || (U.dist2(Player.pos.x, Player.pos.z, -9.5, 7.2) < 1.6 && !D.front.locked));
    D.front.locked = false; if (!D.front.isOpen) D.front.open();
    Story.objective(null);
    dep.lookAt(G.camera.position);
    await Story.lines([
      ['DEPUTY', 'Evening. Deputy Pratt, Hollis County. You the one who called?'],
      ['EVAN', 'Yeah. Yes. Somebody was in the building.'],
      ['DEPUTY', 'I walked the lot and around back. Nobody out there. Back door\'s locked, front\'s locked. No sign anybody forced anything.'],
      ['EVAN', 'He didn\'t force anything. He had a key. Or he got in when I was gone.'],
      ['DEPUTY', 'Who else has keys?'],
      ['EVAN', 'Ray — the owner. Marcy. Dale, the engineer.'],
      ['DEPUTY', 'Mm-hm.'],
      ['DEPUTY', 'Look. I\'ve got a domestic in Hollis I need to get to. Could\'ve been one of your coworkers messing with the new guy. Could be kids. You got my card.'],
    ]);
    const c = await Story.choose(['Can you stay? Just for a little while?', 'Okay. Thanks.']);
    if (c === 0) await Story.say('DEPUTY', 'Son, I\'m one guy for the whole county tonight. Lock up behind me. You call if he shows his face.');
    else await Story.say('DEPUTY', 'Lock up behind me.');
    F.deputyCame = true;
    dep.walkTo([[-9.4, 12], [-3, 17]], 1.5).then(() => dep.setVisible(false));
    await Story.wait(3);
    D.front.close();
    await Story.wait(2);
    SND.sfx('carDoorClose', { pos: new THREE.Vector3(-2, 1, 19) });
    SND.sfx('engineStartup', { pos: new THREE.Vector3(-2, 1, 19), delay: 0.8 });
    await Story.wait(1.5);
    cr.userData.setLights(true, true);
    Common.drivePath(cr, [[2, 26], [17, 33], [17, 37.5], [-40, 37.5], [-160, 37.5]], 8, { sound: true }).then(() => { cr.visible = false; Common.propSilence(cr); });
    Story.objective('Lock the front door');
    await Story.until(() => D.front.locked && !D.front.isOpen, 40);
    Story.objective(null);
    await Story.think('Gone. Forty minutes to get here, four minutes to leave.');
    Story.setClock(24, 50);
    await Story.wait(8);

    // --- the whisper ---
    Radio.setWhisper(0.03); F.whisperLevel = 0.03;
    if (Radio.player && Radio.player.id === 'harbor_lights') Radio.next();
    await Story.wait(10);
    await requestCall({ talk: async () => {
      await Story.lines([
        ['EVAN', 'KTLR.'],
        ['HANK', 'Hey kid, Hank again. Up on the pass.', null, 'phone'],
        ['HANK', 'You got somebody talkin\' under the music? Like a lady whispering? I got it cranked in the cab and it\'s... man, it\'s creeping me out.', null, 'phone'],
        ['EVAN', 'I — no. There\'s nobody here but me.'],
        ['HANK', 'Well, somebody\'s on there. Okay. Just — okay. Night.', null, 'phone'],
      ]);
    } });
    Radio.setWhisper(0.05); F.whisperLevel = 0.05;
    await Story.wait(6);
    await requestCall({ talk: async () => {
      await Story.lines([
        ['EVAN', 'KTLR.'],
        ['CALLER', 'Hi — I\'m sorry, this is going to sound crazy. I\'m a nurse at Hollis General, I\'m on break in my car.', null, 'phone'],
        ['CALLER', 'There\'s someone whispering on your station. Under the song. I thought it was my radio. It isn\'t my radio.', null, 'phone'],
      ]);
      const c2 = await Story.choose(['What are they saying?', 'It\'s interference.']);
      if (c2 === 0) await Story.say('CALLER', 'I can\'t — it\'s too quiet. It sounds like "please." Over and over.', null, 'phone');
      else await Story.say('CALLER', 'Okay. Okay. Sorry. I just — okay.', null, 'phone');
    } });
    Radio.setWhisper(0.07); F.whisperLevel = 0.07;
    await Story.wait(4);
    await requestCall({ talk: async () => {
      await Story.lines([
        ['EVAN', 'KTLR.'],
        ['WALT', 'Son? It\'s Walt. Is everything alright down there?', null, 'phone'],
        ['WALT', 'There\'s a woman on your station. Crying, almost. Is that part of the show?', null, 'phone'],
      ]);
      const c3 = await Story.choose(['I don\'t know, Walt.', 'It\'s just interference.']);
      if (c3 === 1) await Story.say('WALT', 'That\'s not interference, son. I did thirty years of ham radio.', null, 'phone');
      else await Story.say('WALT', 'I did thirty years of ham radio, son. I know what that is.', null, 'phone');
      await Story.lines([
        ['WALT', 'That\'s a microphone. Somebody\'s got a mic open somewhere on your chain. Your studio, or your transmitter site.', null, 'phone'],
        ['EVAN', '...The transmitter.'],
        ['WALT', 'You be careful, son.', null, 'phone'],
      ]);
    } });
    Story.setClock(25, 0);
    Story.objective('Listen to the air signal — put on the headphones (studio)');
    await Story.until(() => L.state.headphones);
    Story.objective(null);
    Radio.setWhisper(0.09); F.whisperLevel = 0.09;
    Radio.whisperIn.gain.setTargetAtTime(0.4, SND.now(), 0.5);
    Radio.duck(0.35);
    SND.sfx('swell', { bus: 'ui', dur: 8, v: 0.5 });
    const W = (t, d) => Story.say('', t, d || 3.4, 'radio');
    await Story.wait(2);
    await W('(whispering) ...please... is anybody...');
    await Story.wait(1.5);
    await W('(whispering) ...I\'m at the... the tower... he put me in the... the old...');
    await Story.wait(1);
    await Story.think('That\'s not CB. That\'s a person. That\'s a real person.');
    await W('(whispering) ...he\'s coming back... please... someone call...');
    await Story.wait(1.5);
    await W('(whispering) ...my name is... Jo... I work at the...', 4);
    await Story.wait(0.8);
    await Story.think('...Jo?');
    // the click
    SND.sfx('relay', { bus: 'radio', v: 1.4 });
    Radio.setWhisper(0); F.whisperLevel = 0;
    Radio.duck(0.9);
    await Story.wait(2);
    await Story.think('It stopped. Like someone flipped a switch.');
    await Story.think('Jo said she\'d call at twelve-thirty. She didn\'t call.');
    if (L.state.headphones) Common.headphones(false);
    await Story.wait(6);

    // --- dead air ---
    Story.setClock(25, 5);
    SND.sfx('powerDown', { bus: 'radio' });
    Radio.setOnAir(false);
    L.setTxLed(false);
    F.offAir = true;
    const alarm = L.loop('silenceAlarm', { pos: new THREE.Vector3(1.3, 1.1, 6.9), vol: 1.0 });
    await Story.wait(2);
    await Story.think('...Dead air. The monitors are just hiss.');
    F.readingsDue = true;
    Story.objective('Check the transmitter remote panel (studio wall)');
    await Story.onBus('readings');
    const remoteTry = Interact.add(N.txPanel, { prompt: 'Dial the transmitter remote control', use: async () => {
      if (F.triedRemote) return; F.triedRemote = true;
      SND.sfx('dtmf', { digits: '5415551340', bus: 'ui' }); await Story.wait(1.8); SND.sfx('modem', { bus: 'ui' }); await Story.wait(2.2);
      await UI.doc(`<b>KTLR REMOTE — KESSLER RIDGE</b>\n\n> STATUS\n  FILAMENT .... OFF\n  PLATE ....... OFF\n  TX BREAKER .. OFF\n  CONTROL ..... <span class="red">LOCAL</span>\n\n> PLATE ON\n  <span class="red">COMMAND REJECTED — SITE IN LOCAL CONTROL</span>`, 'fax');
    } });
    F.readingsDue = false;
    Story.objective('Try the transmitter remote control (same panel)');
    await Story.until(() => F.triedRemote && !UI.docOpen);
    Interact.remove(remoteTry);
    Story.objective(null);
    await Story.think('Local control. Breaker off. That doesn\'t just happen.');
    await Story.think('Somebody switched it off. Up there. By hand.');
    await Story.wait(2);
    // Ray
    await StationPhone.ring(3);
    alarm.stop(0.1);
    await StationPhone.call(3, 'Hotline — Ray', async () => {
      await Story.lines([
        ['RAY', 'We\'re OFF THE AIR, Evan. Off the air! The silence alarm\'s going off on my phone like a damn smoke detector.', null, 'phone'],
        ['EVAN', 'Ray — the transmitter\'s in local control. The breaker\'s off. And before that there was a woman on the air. Whispering. Callers heard it. She said "the tower." Ray, I think she said her name was Jo —'],
        ['RAY', 'What? ...That\'s CB bleed. It happens when the STL drifts. Truckers on channel 19.', null, 'phone'],
        ['EVAN', 'Walt said it was a microphone.'],
        ['RAY', 'Walt also thinks the moon landing was in Nevada.', null, 'phone'],
        ['RAY', 'Listen to me. Dale\'s not answering — he never answers after ten. I\'m three hours away. Every minute we\'re dark is a minute the FCC can fine me into the ground.', null, 'phone'],
        ['RAY', 'I need you to drive up to the Ridge and reset it. You\'ve been up there with me. Lockbox code is one-nine-seven-four.', null, 'phone'],
        ['RAY', 'Transmitter breaker, filament, wait for warm-up, plate. Flip it back to remote. You could do it in your sleep.', null, 'phone'],
      ]);
      const c4 = await Story.choose(['Ray, somebody was in the building tonight.', 'Ray, I don\'t want to go up there alone.', 'Okay.']);
      if (c4 === 0) await Story.lines([['RAY', 'And the deputy came and went and found nothing. Right? Evan. Please. I\'m begging you. I\'ll owe you.', null, 'phone']]);
      if (c4 === 1) await Story.lines([['RAY', 'Kid. It\'s a cinderblock building on a hill. The scariest thing up there is a raccoon.', null, 'phone']]);
      await Story.say('RAY', 'Take the flashlight. Text me when we\'re back up. And — thank you.', null, 'phone');
    });
    F.lockboxCode = true;
    Story.setClock(25, 12);
    await Story.wait(1);
    await Story.think('One-nine-seven-four.');
    await Story.think('If she\'s up there — if that was Jo — nobody else is going. The deputy\'s in Hollis. Ray thinks it\'s truckers.');
    Phone.receive('Mom', 'evan is ur station broken?? it went quiet. and before that there was a lady whispering. i got goosebumps');
    Phone.offerReplies('Mom', ['transmitter broke. ray needs me to fix it', 'its fine. go to sleep'], () => { Story.spawn(async () => { await Story.wait(5); Phone.receive('Mom', 'be careful. text me when ur back. love u'); }); });
    Story.objective('Drive to the transmitter site on Kessler Ridge (your car, out front)');
    D.front.locked = false;
    let go = false;
    const ci = Interact.add(N.evanCar, { prompt: 'Drive to Kessler Ridge', use: () => { go = true; } });
    await Story.until(() => go);
    Interact.remove(ci);
    SND.sfx('carDoorOpen', {});
    await UI.fade(1, 0.8);
    Story.goto('ch4a');
  },
});
