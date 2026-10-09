'use strict';
// PART TWO — LINE ONE. Someone calls, and doesn't request a song.

// request call helper: ring LINE n, run dialogue, then fetch/cue/log flow
async function requestCall(o) {
  const F = Story.flags;
  await StationPhone.ring(o.line || 1);
  await StationPhone.call(o.line || 1, 'Request line', o.talk);
  if (!o.song) return;
  F.pendingLogEntry = o.log;
  Story.objective(o.find);
  const waitCue = Story.onBus('cued', id => id === o.song);
  if (o.optional) { const r = await Promise.race([waitCue.then(() => 'cued'), Story.wait(o.optional).then(() => 'timeout')]); if (r === 'timeout') { Story.objective(null); return false; } }
  else await waitCue;
  F.pendingLog = F.pendingLogEntry;
  Story.objective('Log the request in the request book');
  await Promise.race([Story.onBus('logged'), Story.wait(o.logTimeout || 90)]);
  F.pendingLog = null;
  Story.objective(null);
  return true;
}

function ch2CallHandlers() {
  const F = Story.flags;
  const ray = async () => {
    F.calledRay2 = true;
    await Story.lines([
      ['RAY', '...Mm. Ray.', null, 'phone'],
      ['EVAN', 'Ray, it\'s Evan. Somebody called the request line and — he was describing what I was doing. Like he could see me.'],
      ['RAY', 'What time is it? ...Kid. It\'s a prank. Kids from the high school hear your name on the air and they call. It happened to Marcy a hundred times.', null, 'phone'],
      ['EVAN', 'There was a car in the lot. With its lights off.'],
      ['RAY', 'People turn around in that lot all night. Lock the front door if it makes you feel better. Don\'t answer Line 1 for a while.', null, 'phone'],
      ['RAY', 'And Evan? Unless we\'re off the air, I\'m asleep. Okay? Okay.', null, 'phone'],
    ]);
  };
  const sheriff = async () => {
    F.calledSheriff = true;
    await Story.lines([
      ['DISPATCH', 'Hollis County Sheriff\'s Office, this is Brenda. Is this an emergency?', null, 'phone'],
      ['EVAN', 'I — I don\'t know. I work at KTLR. Somebody\'s been calling and describing what I\'m doing. There was a car parked outside.'],
      ['DISPATCH', 'Has anyone threatened you, hon?', null, 'phone'],
      ['EVAN', '...No. Not exactly.'],
      ['DISPATCH', 'Okay. I\'ve got one deputy for four hundred square miles tonight and he\'s at a rollover on 26. Lock your doors. I\'ll have him swing by when he can. Could be a while.', null, 'phone'],
    ]);
  };
  StationPhone.outgoing.ray = { rings: 5, fn: ray };
  StationPhone.outgoing.sheriff = { rings: 3, fn: sheriff };
  Phone.onCall('Ray', { fn: ray });
  StationPhone.outgoing['911'] = { rings: 1, fn: async () => {
      F.called911 = true;
      await Story.lines([
        ['DISPATCH', '911, what is the address of your emergency?', null, 'phone'],
        ['EVAN', 'KTLR — the radio station on Route 9. Someone was in the building. He\'s been calling me. He left a tape. I think he\'s outside.'],
        ['DISPATCH', 'Is the person inside the building right now?', null, 'phone'],
        ['EVAN', 'I don\'t... I don\'t think so.'],
        ['DISPATCH', 'Are you hurt? Are you somewhere safe?', null, 'phone'],
        ['EVAN', 'I\'m okay. I locked the doors.'],
        ['DISPATCH', 'Okay. Good. I have one deputy on tonight and he\'s at a rollover on 26. I\'m sending him to you as soon as he clears. Stay inside. Keep the doors locked.', null, 'phone'],
        ['EVAN', 'How long?'],
        ['DISPATCH', 'Could be forty minutes, hon. I\'m sorry. It\'s a big county.', null, 'phone'],
      ]);
    } };
}

Story.define('ch2', {
  card: ['PART TWO', 'LINE ONE', '11:24 PM'],
  chapterSelect: 'Part Two — Line One',
  defaultFlags: { hasFlashlight: true, backLocked: true, boughtCreamer: true, coffeeMade: true, metJo: true, metDale: true },
  async setup(o) {
    const F = Story.flags;
    Story.setClock(23, 24);
    Phone.signal = 3;
    Radio.setWhisper(0);
    const L = await Common.station({ backpack: true, coffee: 'done', backLocked: true, buick: true, haveFlashlight: F.hasFlashlight }, [6.4, 16, Math.PI], { fade: false });
    L.named.mugs.forEach(m => { m.visible = true; });
    ch2CallHandlers();
  },
  async run(o) {
    const F = Story.flags, L = G.level, N = L.named, D = N.doors;
    Player.hasFlashlight = !!F.hasFlashlight;
    // arrival: a car in the far corner of the lot turns its lights on and leaves
    Car.park(N.evanCar, { radio: true, radioVol: 0.4, engine: true, headlights: true, yaw: -0.5 });
    UI.fade(0, 2);
    await Story.wait(3);
    N.buick.userData.setLights(true, true);
    SND.sfx('engineStartup', { pos: N.buick.position.clone() });
    Engine.glitch(0.5, 0.8);
    await Story.wait(0.6);
    await Story.think('Jesus — high beams. Right in my eyes.');
    Common.drivePath(N.buick, [[20, 30], [17, 33], [17, 37.5], [40, 37.5], [160, 37.5]], 6, { sound: true }).then(() => { L.showBuick(false); Common.propSilence(N.buick); });
    await Story.wait(4);
    await Story.think('...Somebody turning around. People use the lot to turn around.');
    UI.hint('<b style="border:1px solid #777;padding:0 5px">E</b> get out of the car', 5);
    await Story.until(() => Input.pressed('KeyE'));
    Input.consume('KeyE');
    SND.sfx('carDoorOpen', {});
    await UI.fade(1, 0.4);
    Car.unpark(1.5);
    SND.sfx('carDoorClose', { pos: N.evanCar.position.clone() });
    const cr = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.16, 8), B.col(0xd8c8a0)); Player.hold(cr, 'creamer');
    UI.fade(0, 0.8);
    Story.objective('Put the creamer in the fridge (break room)');
    await Story.onBus('creamerStored');
    Story.objective(null);
    Story.setClock(23, 27);
    await Story.wait(5);

    // --- Walt ---
    await requestCall({
      talk: async () => {
        await Story.lines([
          ['EVAN', 'KTLR request line.'],
          ['WALT', 'Well, good evening! Is this the new fella? Marcy told me all about you.', null, 'phone'],
          ['WALT', 'This is Walt. Up on Route 9. She calls me Night Owl Walt, ha.', null, 'phone'],
          ['WALT', 'Could you play "Porch Light" for my Ellie? Shelby Cain. Ellie\'s been gone three years this December. I still put it on every night.', null, 'phone'],
        ]);
        const c = await Story.choose(['Of course, Walt.', 'You\'re up this late every night?']);
        if (c === 1) await Story.lines([['WALT', 'Don\'t sleep much since Ellie. The radio\'s good company. You\'re good company, son.', null, 'phone']]);
        else await Story.say('WALT', 'Thank you, son. You sound like a good kid. Your mother must be proud.', null, 'phone');
        await Story.say('WALT', 'Don\'t let the overnight get to you. It\'s just the dark. The dark never hurt anybody.', null, 'phone');
      },
      song: 'porch_light', find: 'Find "Porch Light" by Shelby Cain (Library — CDs A–F)', log: '11:28P  Walt  Porch Light — "for Ellie"',
    });
    Story.setClock(23, 33);
    await Story.wait(6);

    // --- Kayla ---
    await requestCall({
      talk: async () => {
        await Story.lines([
          ['EVAN', 'KTLR request line.'],
          ['KAYLA', 'Oh my god, hi. Okay. Can you play "Static Love" for Josh? Tell him I\'m sorry about the thing.', null, 'phone'],
          ['KAYLA', 'Don\'t say what thing. Actually don\'t say Josh. Say "for J." Oh my god. Okay. Bye.', null, 'phone'],
        ]);
        await Story.think('...Sure, Kayla.');
      },
      song: 'static_love', find: '(Optional) "Static Love" — Polaroid Kids (CDs M–R)', log: '11:34P  Kayla  Static Love — "for J"', optional: 75,
    });
    Story.setClock(23, 38);
    await Story.wait(4);

    // --- Jo ---
    await requestCall({
      talk: async () => {
        await Story.lines([
          ['EVAN', 'KTLR request line.'],
          ['JO', 'RADIO BOY. It\'s Jo. Gas-N-Go. I told you I\'d call.', null, 'phone'],
          ['JO', 'Okay. You have to read it exactly like this, I wrote it on a receipt:', null, 'phone'],
          ['JO', '"This one\'s for Jo, working the night counter at the Gas-N-Go on Route 9 all by herself — and for anybody else working alone tonight. You\'re not alone."', null, 'phone'],
          ['JO', 'And play "Turnpike Hearts." Mercy Lane. Okay? Okay. I\'ll call back at twelve-thirty for my second one. It\'s tradition.', null, 'phone'],
        ]);
      },
      song: 'turnpike_hearts', find: 'Find "Turnpike Hearts" by Mercy Lane (CDs G–L)', log: '11:39P  Jo (Gas-N-Go)  Turnpike Hearts — "for everyone working alone tonight"',
    });
    // dedication on the mic
    Story.objective('Read Jo\'s dedication on the air (the mic)');
    await new Promise(res => {
      F.micPrompt = 'Open the mic — read Jo\'s dedication';
      F.micHandler = async () => {
        F.micHandler = null; F.micPrompt = null;
        G.mode = 'locked';
        await Player.camTo(new THREE.Vector3(3, 1.25, 5.85), new THREE.Vector3(3.05, 1.2, 6.9), 0.7);
        const c = await Story.choose(['Read it exactly how she wrote it.', 'Leave out where she works.', 'Just play the song.']);
        if (c !== 2) { SND.sfx('switch', { bus: 'ui' }); L.setOnAirLight(true); Radio.duck(0.15); }
        if (c === 0) {
          F.joDedication = 'full';
          await Story.lines([['EVAN', 'This one goes out to Jo, working the night counter at the Gas-N-Go on Route 9, all by herself...', null, 'radio'], ['EVAN', '...and to anybody else working alone tonight. You\'re not alone. Here\'s Mercy Lane.', null, 'radio']]);
        } else if (c === 1) {
          F.joDedication = 'partial';
          await Story.lines([['EVAN', 'This one\'s for Jo, and for anybody else working alone tonight.', null, 'radio'], ['EVAN', 'You\'re not alone. Here\'s Mercy Lane.', null, 'radio']]);
          await Story.think('Ray would want it that way. She\'ll be mad.');
        } else { F.joDedication = 'none'; await Story.think('Ray\'s rule. No locations. She\'ll hear the song.'); }
        if (c !== 2) { SND.sfx('switch', { bus: 'ui' }); L.setOnAirLight(false); Radio.duck(0.9); }
        await Player.camTo(null, null, 0.6);
        G.mode = 'walk';
        res();
      };
    });
    Story.objective(null);
    Story.setClock(23, 41);
    await Story.wait(5);

    // --- THE CALL ---
    Story.objective(null);
    await Story.until(() => Player.zone() === 'studio', 40);
    await StationPhone.ring(1);
    Story.clockRunning = false;
    const hung = await StationPhone.call(1, 'Request line', async () => {
      await Story.say('EVAN', 'KTLR request line, what can I play for you?');
      await Story.wait(3.2);
      await Story.think('...Hello?');
      await Story.wait(2);
      const desc = Common.describeEvan();
      await Story.say('???', desc[0], null, 'phone');
      if (desc[1]) await Story.say('???', desc[1], null, 'phone');
      const c = await Story.choose(['Who is this?', 'Is this Kayla\'s boyfriend?', '[Hang up]'], { timeout: 12, def: 2 });
      if (c === 2) { SND.sfx('hangup', { bus: 'ui', v: 2 }); return true; }
      if (c === 1) await Story.say('EVAN', 'Is this — are you Josh? This isn\'t funny, man.');
      else await Story.say('EVAN', 'Who is this?');
      await Story.wait(1.5);
      const d2 = Common.describeEvan();
      await Story.say('???', d2[d2.length - 1] === desc[0] ? 'You read the ID very well tonight. A little nervous.' : d2[d2.length - 1], null, 'phone');
      await Story.say('???', 'Your coffee\'s getting cold, Evan.', null, 'phone');
      await Story.wait(1);
      return false;
    }, { theyHangUp: true });
    F.firstCall = true;
    Story.clockRunning = true;
    Story.setClock(23, 43);
    SND.sfx('swell', { bus: 'ui', dur: 5, v: 0.8 });
    await Story.think(hung ? 'I hung up on him. My hand is shaking. Why is my hand shaking.' : 'He hung up.');
    await Story.think('...He knows my name. — No. I said my name on the air. I said it at eleven. Anybody could know my name.');

    // --- the car in the lot ---
    L.showBuick(true, false);
    N.buick.position.set(23, 0, 27.5); N.buick.rotation.y = -2.4; N.buick.visible = true;
    Story.objective('Look out the window');
    let lookT = 0;
    await Story.until(() => { if (Player.zone() === 'studio' && Player.facing(new THREE.Vector3(3, 1.4, 8), 0.45)) lookT += G.dt; return lookT > 1.6; }, 40);
    Story.objective(null);
    await Story.think('There\'s a car. Out by the trees. Lights off.');
    await Story.wait(2.5);
    await Story.think('Is someone in it?');
    await Story.wait(2);
    N.buick.userData.setLights(true, true);
    SND.sfx('swell', { bus: 'ui', dur: 3, v: 0.6 });
    Engine.glitch(0.3, 0.5);
    await Story.wait(1.5);
    SND.sfx('engineStartup', { pos: N.buick.position.clone() });
    Common.drivePath(N.buick, [[20, 30], [17, 33], [17, 37.5], [-40, 37.5], [-160, 37.5]], 7, { sound: true }).then(() => { L.showBuick(false); Common.propSilence(N.buick); });
    await Story.wait(3);
    await Story.think('...And it\'s gone. Okay. Okay okay okay.');
    Story.objective('Call someone (studio phone, Ray\'s office, or your cell)');
    const before = (F.calledRay2 ? 1 : 0) + (F.calledSheriff ? 1 : 0) + (F['called_Ray'] || 0);
    await Story.until(() => (F.calledRay2 ? 1 : 0) + (F.calledSheriff ? 1 : 0) + (F['called_Ray'] || 0) > before || F.called_Mom || F.called_Marcy, 80);
    await Story.until(() => !StationPhone.inCall, 60);
    Story.objective(null);
    if (!F.calledRay2 && !F.calledSheriff) await Story.think('It\'s a prank. It\'s kids. Ray would say it\'s kids.');
    Story.setClock(23, 50);
    await Story.wait(7);

    // --- LINE 3 ---
    const p3 = StationPhone.ring(3);
    await Story.think('...Line three? That\'s the hotline. Nobody has that number. Ray, Dale, the sheriff.');
    await p3;
    await StationPhone.call(3, 'Hotline (unlisted)', async () => {
      await Story.say('EVAN', '...Ray?');
      await Story.wait(2.5);
      await Story.lines([
        ['???', 'There\'s a room at the end of the hall with a green door.', null, 'phone'],
        ['???', 'You haven\'t been in there. It\'s locked, and the key isn\'t on its hook.', null, 'phone'],
        ['???', 'There\'s a chair in the middle of the room. It\'s facing the wall.', null, 'phone'],
        ['???', 'There\'s a lamp on the floor.', null, 'phone'],
        ['???', 'It\'s on.', null, 'phone'],
      ]);
      await Story.wait(1.6);
      await Story.say('???', 'Go look, Evan.', null, 'phone');
    });
    Story.setClock(23, 52);
    // prepare Prod B
    D.prodb.locked = false; D.prodb.set(0.05);
    N.lights.prodb.setOn(true);
    N.tapeB.visible = true;
    Story.objective('Production B — the green door at the end of the hall');
    await Story.until(() => U.dist2(Player.pos.x, Player.pos.z, 5.5, -0.3) < 2.2);
    await Story.think('There\'s light under the door.');
    await Story.think('...It\'s open. It\'s supposed to be locked.');
    await Story.untilZone('prodb');
    F.prodBOpened = true;
    SND.sfx('swell', { bus: 'ui', dur: 4, v: 0.5 });
    await Story.wait(1);
    await Story.think('A chair. Facing the wall. The lamp.');
    await Story.think('Exactly like he said.');
    Story.objective('There\'s something on the chair');
    await Story.onBus('tookTapeB');
    D.back.locked = false;
    Story.objective('Play the tape (cassette deck on the table)');
    await Story.onBus('playTapeB');
    Story.objective(null);
    const hiss = L.loop('tapeHiss', { pos: new THREE.Vector3(6.7, 0.9, -7.2), vol: 1.5 });
    SND.sfx('tapePlay', { pos: new THREE.Vector3(6.7, 0.9, -7.2) });
    await Story.wait(2);
    await Story.say('EVAN', '(on tape) It\'s eleven o\'clock. You\'re listening to KTLR, 94.1 FM, Kessler Gap...', null, 'radio');
    await Story.say('EVAN', '(on tape) ...I\'m Evan. I\'ll be here all night.', null, 'radio');
    await Story.wait(1);
    await Story.think('That\'s me. That\'s tonight. That was forty minutes ago.');
    SND.sfx('carDoorClose', { pos: new THREE.Vector3(6.7, 0.9, -7.2), vol: 0.25 });
    await Story.wait(3.5);
    await Story.say('???', '(close to the mic) You read that very well.', 3.4, 'phone');
    await Story.wait(1.2);
    await Story.say('???', 'She used to say it almost the same way.', 3.2, 'phone');
    await Story.wait(1.4);
    await Story.say('???', '"I\'m right here."', 2.6, 'phone');
    SND.sfx('tapePlay', { pos: new THREE.Vector3(6.7, 0.9, -7.2) });
    hiss.stop(0.05);
    SND.sfx('swell', { bus: 'ui', dur: 5, v: 0.9 });
    await Story.wait(1.5);
    await Story.think('He was in here.');
    await Story.think('He was IN here. Tonight. While I was —');
    await Story.think('...The gas station. I was gone twenty minutes.');
    Story.objective('The back door');
    await Story.until(() => U.dist2(Player.pos.x, Player.pos.z, -10.5, -7.6) < 1.8);
    await Story.think('It\'s unlocked.');
    await Story.think('I locked this. I KNOW I locked this. I checked it twice.');
    Story.objective('Lock the back door');
    await Story.until(() => D.back.locked && !D.back.isOpen);
    Story.objective('Check the security cameras (monitor in Ray\'s office)');
    // the figure on camera 2
    let sawFigure = false;
    const offF = Bus.on('focus', (tag, on) => {
      if (tag !== 'cctv' || !on || sawFigure) return;
      sawFigure = true;
      Story.spawn(async () => {
        await Story.wait(3.5);
        const fig = NPCs.spawn('dale', { x: -8.5, z: -15.5, ry: 0.4, pose: 'stand' });
        fig.root.traverse(m => m.layers.set(1));
        fig.managed = true;
        await Story.wait(4.2);
        fig.remove();
        await Story.wait(0.5);
        await Story.think('...');
        await Story.think('There was someone. On camera two. By the trees behind the generator. There was someone standing there.');
      });
    });
    await Story.until(() => sawFigure);
    await Story.until(() => G.mode === 'walk' && !Player.override, 60);
    offF();
    Story.objective(null);
    await Story.wait(1.5);
    await Story.think('He\'s gone. He\'s not there. ...Was he there?');
    if (!F.called911) Story.objective('Call 911');
    await Story.until(() => F.called911, 120);
    await Story.until(() => !StationPhone.inCall, 60);
    Story.objective(null);
    await Story.think('Forty minutes. Forty minutes, and I still have to run the board.');
    await Story.wait(2);
    await UI.fade(1, 1.5);
    Story.goto('ch3');
  },
});
