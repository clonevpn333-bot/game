'use strict';
// PART ONE — TIMBERLINE AFTER DARK. A completely ordinary night shift.

const MARCY_SEAT = [3, 5.75];

function spawnMarcy() {
  const m = NPCs.spawn('marcy', { x: MARCY_SEAT[0], z: MARCY_SEAT[1], ry: 0, pose: 'sit' });
  return m;
}

Story.define('intro', {
  card: ['PART ONE', 'TIMBERLINE AFTER DARK', 'FRIDAY, OCTOBER 15, 2004 — 10:02 PM'],
  chapterSelect: 'Part One — Timberline After Dark',
  async setup(o) {
    Story.setClock(22, 2); Story.clockRate = 1 / 20;
    Phone.reset(); Phone.signal = 3; Phone.available = true;
    Story.flags.hasFlashlight = false;
    Radio.setWhisper(0);
    Radio.queue = [];
    if (!Radio.playing) Radio.start('porch_light');
    await Common.station({ marcyCar: true, backpack: true, coffee: 'old' }, [6.4, 16, Math.PI], { fade: false });
  },
  async run(o) {
    const F = Story.flags, L = G.level, N = L.named, D = N.doors;
    const marcy = spawnMarcy();
    marcy.lookAt(new THREE.Vector3(3, 1.1, 6.6));
    L.setOnAirLight(true);
    // --- in the car ---
    Car.park(N.evanCar, { radio: true, radioVol: 0.45 });
    if (!o.restart) {
      UI.fadeNow(1);
      await UI.narr('In the fall of 2004 I was seventeen, and I worked overnights at a radio station nobody listened to.<br><br>That\'s what I thought, anyway.', '— Evan Mercer', 7);
    }
    UI.fade(0, 3);
    await Story.wait(2.5);
    await Story.say('MARCY', '...and that was Shelby Cain, "Porch Light." It\'s two minutes after ten on a cold one here in the Gap.', null, 'radio');
    await Story.say('MARCY', 'Request line opens up right now, 555-0941. In a few minutes I\'m handing you over to the overnight kid. Be nice to him. He\'s new.', null, 'radio');
    await Story.wait(1.5);
    Phone.receive('Mom', 'have a good shift hon. dad made it to boise ok. lasagna is in ur bag. EAT IT. dont stay up after');
    Story.objective('Check your phone (TAB)');
    Phone.offerReplies('Mom', ['ok. thanks mom', 'love u. go to sleep', 'i will eat the lasagna. probably'], () => { F.repliedMom = true; });
    await Story.until(() => Phone.threads.Mom && Phone.threads.Mom.every(m => m.read), 25);
    await Story.until(() => !Phone.open, 30);
    await Story.wait(1);
    await Story.think('Ten o\'clock. Eight hours. You can do eight hours.');
    Story.objective('Head inside — Marcy\'s waiting to hand off the show');
    UI.hint('<b style="border:1px solid #777;padding:0 5px">E</b> get out of the car', 6);
    await Story.until(() => Input.pressed('KeyE'));
    Input.consume('KeyE');
    SND.sfx('carDoorOpen', {});
    await UI.fade(1, 0.4);
    Car.unpark(1.5);
    SND.sfx('carDoorClose', { pos: N.evanCar.position.clone() });
    UI.fade(0, 0.8);
    UI.hint('<b style="border:1px solid #777;padding:0 5px">WASD</b> move &nbsp; <b style="border:1px solid #777;padding:0 5px">SHIFT</b> walk faster &nbsp; <b style="border:1px solid #777;padding:0 5px">E</b> interact', 7);

    // --- inside: Marcy ---
    await Story.untilZone('studio');
    Story.objective(null);
    marcy.lookAt(G.camera.position);
    L.setOnAirLight(false);
    await Story.lines([
      ['MARCY', 'There he is. Mr. Overnight.'],
      ['EVAN', 'Hey, Marcy.'],
      ['MARCY', 'Do me a favor before I hand over the keys to the kingdom. The coffee in there has been on the burner since six. It\'s not coffee anymore. It\'s a geological layer.'],
      ['MARCY', 'Make a fresh pot? I\'ll love you forever. Or until Monday.'],
    ]);
    const c = await Story.choose(['On it.', 'Is that in my job description?']);
    if (c === 1) await Story.say('MARCY', 'Everything is in your job description. You\'re the overnight guy. You\'re also the janitor, the security guard, and the guy who talks to Walt.');
    else await Story.say('MARCY', 'Good man. Filters are in the cabinet over the coffee maker.');
    marcy.lookAt(new THREE.Vector3(3, 1.1, 6.6));

    // --- coffee ---
    const coffeeObj = {
      took: 'Dump the old coffee at the sink',
      filled: 'Pour the water into the coffee maker',
      water: 'Get a filter from the cabinet above the coffee maker',
      filter: 'Add coffee from the red can',
      grounds: 'Press BREW',
      brewing: 'Wait for it to brew — grab Marcy\'s blue mug off the rack',
      done: 'Pour a cup for Marcy',
    };
    Story.objective('Make a fresh pot of coffee (break room)');
    const offC = Bus.on('coffee', (st, who) => {
      if (coffeeObj[st]) Story.objective(coffeeObj[st]);
      if (st === 'poured') { if (who === 'marcy') { F.marcyMug = true; Story.objective('Bring Marcy her coffee'); } else Story.objective('That\'s your mug. Marcy\'s is the blue one'); }
    });
    // radio break while brewing
    Story.spawn(async () => {
      await Story.onBus('coffee', s => s === 'brewing');
      await Story.wait(6);
      await Story.say('MARCY', 'KTLR 94.1. Temperature at the Hollis County airport is thirty-four degrees, so if you\'re driving the pass tonight, watch for ice up past the turnout.', null, 'radio');
      await Story.say('MARCY', 'Here\'s the Northerlies.', null, 'radio');
    });
    await Story.until(() => F.marcyMug);
    // give coffee
    let given = false;
    const it = Interact.add(marcy.root, { prompt: () => Player.holding('mug') ? 'Give Marcy her coffee' : 'Talk to Marcy', use: () => { if (Player.holding('mug') && Player.held.userData.mugId === 'marcy') { given = true; } else Story.say('MARCY', 'I need caffeine before I can form sentences, Evan.'); } });
    await Story.until(() => given);
    offC();
    Interact.remove(it);
    Player.drop(); SND.sfx('mugClink', { pos: new THREE.Vector3(3.6, 0.9, 6.4) });
    const desk = P.mug(L.root, 3.7, 0.84, 6.4, { color: 0x2a4a7a, full: true }); void desk;
    Story.objective(null);
    F.coffeeMade = true;
    marcy.lookAt(G.camera.position);
    await Story.lines([
      ['MARCY', 'Oh, you beautiful child.'],
      ['MARCY', 'Okay. Crash course, since Ray\'s idea of "training" is handing you a binder and leaving for Bend.'],
      ['MARCY', 'Automation plays the music. It\'s on that computer. You don\'t touch it unless something\'s on fire.'],
      ['MARCY', 'Your job: station ID at the top of every hour — live, Ray\'s a freak about it. Transmitter readings off that panel on the wall. Write them down. And requests.'],
      ['MARCY', 'Request line is LINE 1. They call, you find the CD in the library, load it in CD-1, it plays after whatever\'s on. Log it in the book.'],
      ['MARCY', 'And for the love of God don\'t read people\'s addresses on the air. Ray will kill us both.'],
      ['EVAN', 'What if nobody calls?'],
      ['MARCY', 'Somebody always calls. Truckers. Night nurses. People who can\'t sleep. Walt.'],
      ['EVAN', 'Who\'s Walt?'],
      ['MARCY', 'Night Owl Walt. Sweetest old man alive, lives out on Route 9. Calls every night and asks for "Porch Light" for his wife. She passed in \'01. Be nice to Walt.'],
    ]);
    const c2 = await Story.choose(['That\'s kind of sad.', 'Does anybody creepy ever call?', 'Got it.']);
    if (c2 === 0) await Story.say('MARCY', 'It\'s the overnight. It\'s all kind of sad. That\'s why people call.');
    if (c2 === 1) {
      await Story.lines([
        ['MARCY', 'Oh, constantly. Breathers. Guys who want to know what I look like.'],
        ['MARCY', 'One guy last week just asked who works Fridays. Then hung up.'],
        ['MARCY', 'I told him Ray. Ray\'s sixty-one with a back brace. Let him come.'],
      ]);
      F.marcyCreepy = true;
    }
    await Story.wait(0.6);
    // Lacey story while she packs up
    marcy.pose = 'stand'; marcy.root.position.z = 5.2;
    await Story.lines([
      ['MARCY', 'You know you\'re sitting in Lacey\'s chair, right?'],
      ['EVAN', 'Who?'],
      ['MARCY', 'Before your time. Lacey Harmon. She did overnights in the nineties — I was the intern. Best voice this station ever had.'],
      ['MARCY', 'She used to sign on every night at midnight: "If you\'re still up, you\'re not alone. I\'m right here."'],
      ['MARCY', 'One night in \'97 she went out to her car on a break and just... didn\'t come back. Car was still in the lot. Engine running. Radio on.'],
      ['EVAN', 'That\'s messed up.'],
      ['MARCY', 'People around here swear that late at night you can still hear her under the music. Whispering.'],
      ['MARCY', '...Which is stupid. It\'s bleed from the trucker CB channels. But still. Don\'t stare out that window at one in the morning. It gets in your head.'],
    ]);
    await Story.wait(0.5);
    await Story.lines([
      ['MARCY', 'Okay. The Gap is yours. Ray left you a note in his office — read it, he\'ll quiz you.'],
      ['MARCY', 'Back door sticks. Pull hard, then lift. I went out there for a smoke earlier, so lock the deadbolt after me.'],
      ['MARCY', 'Night, kiddo. You\'ll be fine. It\'s the most boring job in the world.'],
    ]);
    F.marcyGone = true;
    // she leaves via the front door
    Story.objective('Read Ray\'s note (his office)');
    await marcy.walkTo([[2.6, 3.4], [0.2, 2.2], [0.2, 0], [-9.5, 0], [-9.5, 6.5], [-9.5, 9.5], [-4.4, 11.8]], 1.35);
    marcy.setVisible(false);
    SND.sfx('carDoorClose', { pos: N.marcyCar.position.clone() });
    await Story.wait(1.2);
    SND.sfx('engineStartup', { pos: N.marcyCar.position.clone() });
    N.marcyCar.userData.setLights(true, true);
    await Story.wait(1.5);
    Common.drivePath(N.marcyCar, [[-3.2, 17], [2, 24], [16, 31], [18, 37.5], [60, 37.5], [140, 37.5]], 5, { sound: true, reverse: false }).then(() => { N.marcyCar.visible = false; Common.propSilence(N.marcyCar); });
    Story.setClock(22, 34);
    await Story.until(() => F.read_raynote);
    await Story.wait(0.5);
    Story.goto('ch1b');
  },
});
Bus.on('read', k => { Story.flags['read_' + k] = true; });

// ---------------------------------------------------------------------------
Story.define('ch1b', {
  seamless: true,
  async setup(o) {
    Story.setClock(22, 36);
    Radio.setOnAir(true);
    if (o.restart || !G.level || G.level.name !== 'station') {
      await Common.station({ marcyCar: false, backpack: true, coffee: 'done' }, [-3.4, 5.0, 0]);
    }
  },
  async run() {
    const F = Story.flags, L = G.level, N = L.named, D = N.doors;
    Story.objective('Lock the back door (deadbolt)');
    await Story.until(() => D.back.locked && !D.back.isOpen);
    F.backLockedOnce = true;
    Story.objective(null);
    await Story.think('Locked. Okay. My show.');
    await Story.wait(6);

    // --- first request: Hank ---
    Story.objective(null);
    const ph = await StationPhone.ring(1);
    await StationPhone.call(1, 'Request line', async () => {
      await Story.lines([
        ['EVAN', 'KTLR request line.'],
        ['HANK', 'Yeah, hey, this the request line? It\'s Hank. I\'m on 26 heading for the pass.', null, 'phone'],
        ['HANK', 'Play "Diesel Prayer" for me. Colt Ramsey. For the boys on 26.', null, 'phone'],
        ['HANK', '...You\'re new. Where\'s the redhead?', null, 'phone'],
      ]);
      const c = await Story.choose(['Marcy went home. I\'m Evan.', 'She\'s off tonight.']);
      await Story.say('EVAN', c === 0 ? 'Marcy went home. I\'m Evan. I\'ve got the overnight.' : 'She\'s off tonight. I\'ll get your song on.');
      await Story.say('HANK', 'Well, alright, Evan. Keep it country. And keep me awake.', null, 'phone');
    });
    void ph;
    F.pendingLogEntry = '10:41P  Hank (trucker)  Diesel Prayer — "for the boys on 26"';
    Story.objective('Find "Diesel Prayer" by Colt Ramsey (Library — CDs M–R)');
    await Story.onBus('tookCD', id => id === 'diesel_prayer');
    Story.objective('Load the CD into CD-1 (studio, right side of the board)');
    await Story.onBus('cued', id => id === 'diesel_prayer');
    F.pendingLog = F.pendingLogEntry;
    Story.objective('Log the request in the request book');
    await Story.onBus('logged');
    Story.objective(null);
    await Story.think('One down. Hank is going to be my best friend.');
    await Story.wait(8);

    // --- power blip + Ray ---
    Story.setClock(22, 51);
    SND.sfx('powerDown', {});
    L.setPower(false);
    const ups = L.loop('upsBeep', { pos: new THREE.Vector3(-1, 1, -7), vol: 0.9 });
    await Story.wait(2.2);
    L.setPower(true);
    SND.sfx('fluoroStart', { pos: G.camera.position.clone() });
    await Story.wait(1.5);
    await Story.think('...Whoa.');
    await Story.wait(2);
    await StationPhone.ring(2);
    ups.stop();
    await StationPhone.call(2, 'Business — Ray', async () => {
      await Story.lines([
        ['RAY', 'Kid. Ray. The power just blipped at the station — I get the alarm on my phone at my sister\'s.', null, 'phone'],
        ['RAY', 'Generator didn\'t kick on, did it?', null, 'phone'],
        ['EVAN', 'I don\'t... think so? The lights went out for like two seconds.'],
        ['RAY', 'That auto-start\'s been fussy since August. Go out back and start it by hand, then flip it to AUTO.', null, 'phone'],
        ['RAY', 'Flashlight\'s on the shelf in engineering. Housing latch, fuel valve, choke, prime it three times, pull. Choke off. AUTO. Close it up.', null, 'phone'],
        ['RAY', 'Then lock the back door behind you. The deadbolt, not just the knob.', null, 'phone'],
        ['EVAN', 'Got it.'],
        ['RAY', 'And Evan — station ID at eleven. Live. Not the cart. I\'ll be listening.', null, 'phone'],
      ]);
    });
    Story.objective('Get the flashlight (engineering room)');
    if (!F.hasFlashlight) await Story.onBus('gotFlashlight');
    Story.objective('Start the generator behind the building (back door)');
    F.genTask = true;
    const genObj = { open: 'Turn the fuel valve ON', fuel: 'Close the choke', choke: 'Press the primer bulb (3 times)', primed: 'Pull the starter cord', running: 'Open the choke', chokeOpen: 'Set the switch to AUTO', auto: 'Close the housing' };
    const offG = Bus.on('genStep', st => { if (genObj[st]) Story.objective(genObj[st]); });
    // a little mundane fright outside: something in the dumpster
    Story.spawn(async () => {
      await Story.until(() => Player.pos.z < -9.5);
      await Story.wait(3);
      SND.sfx('bang', { pos: new THREE.Vector3(-13, 1, -11.5), metal: true, v: 0.6 });
      SND.sfx('rustle', { pos: new THREE.Vector3(-13, 1, -11.5), v: 1.2, delay: 0.3 });
      await Story.wait(1.2);
      await Story.think('...Raccoon. That\'s a raccoon. Ray said there\'s a raccoon.');
    });
    await Story.onBus('genDone');
    offG();
    L.genLoop && L.genLoop.stop(2);
    await Story.think('It\'ll run itself now if the power goes. Okay.');
    Story.objective('Lock the back door again');
    await Story.until(() => Player.pos.z > -7.8 && D.back.locked && !D.back.isOpen);
    F.backLocked = true;
    Story.objective(null);

    // --- 11:00 station ID ---
    Story.setClock(22, 58);
    await Story.wait(4);
    Story.objective('Top of the hour — station ID (open the mic at the board)');
    UI.toast('10:59 PM — ID in one minute', 4);
    await Common.stationID([
      'It\'s eleven o\'clock. You\'re listening to KTLR, 94.1 FM, Kessler Gap...',
      '...and this is Timberline After Dark. The request line\'s open till two — 555-0941.',
      'I\'m Evan. I\'ll be here all night.',
    ]);
    Story.setClock(23, 0);
    F.didID11 = true;
    F.readingsDue = true;
    Story.objective('Take the transmitter readings (panel on the studio wall)');
    await Story.onBus('readings');
    Story.objective(null);
    await Story.wait(3);
    Phone.receive('Marcy', 'OMG. forgot. we r OUT of creamer. ray will die in the morning. like actually. gas n go has the hazelnut. automation is fine for 20 min everyone does it ;)');
    await Story.until(() => Phone.threads.Marcy && Phone.threads.Marcy.every(m => m.read), 40);
    Phone.offerReplies('Marcy', ['on it', 'i\'m not supposed to leave', 'you owe me'], () => {});
    await Story.think('I\'m not supposed to leave the building. ...It\'s twenty minutes. Everybody does it.');
    Story.objective('Drive to the Gas-N-Go for creamer (your car, out front)');
    // car interaction
    let go = false;
    const ci = Interact.add(N.evanCar, { prompt: 'Drive to the Gas-N-Go', use: () => { go = true; } });
    await Story.until(() => go);
    Interact.remove(ci);
    SND.sfx('carDoorOpen', {});
    await UI.fade(1, 0.6);
    Story.goto('errand');
  },
});

// ---------------------------------------------------------------------------
Story.define('errand', {
  async setup() {
    Story.setClock(23, 6);
    const L = await Common.enter(Levels.road, { road: 'route9' }, null, { fade: false });
    Car.start(L.road, { s: 6, v: 0, endS: L.road.length - 30, onEnd: () => Story.goto('gas1'), radioVol: 0.5 });
    Car.setTune(94.1);
    SND.sfx('engineStartup', {});
  },
  async run() {
    UI.fade(0, 1.5);
    UI.hint('<b style="border:1px solid #777;padding:0 5px">W</b> gas &nbsp; <b style="border:1px solid #777;padding:0 5px">S</b> brake &nbsp; <b style="border:1px solid #777;padding:0 5px">A/D</b> steer &nbsp; <b style="border:1px solid #777;padding:0 5px">H</b> high beams &nbsp; <b style="border:1px solid #777;padding:0 5px">R</b> radio', 9);
    Story.objective('Gas-N-Go — one mile down Route 9');
    await Story.wait(8);
    await Story.think('Weird hearing it from out here. Like the station keeps going without me.');
    Car.events.push({ s: 380, fn: () => Story.think('The Pine Hollow Diner. Closed since that waitress went missing. Mom won\'t drive past it after dark.') });
    Car.events.push({ s: 600, fn: () => Story.say('', '"KTLR, 94.1. Timberline After Dark. Can\'t sleep? Neither can we."', 3.5, 'radio') });
  },
});

// ---------------------------------------------------------------------------
Story.define('gas1', {
  async setup() {
    Car.stop();
    Story.setClock(23, 9);
    const L = await Common.enter(Levels.gas, { dale: true }, [7.2, 14, Math.PI / 2]);
    void L;
  },
  async run() {
    const F = Story.flags, L = G.level, N = L.named;
    const jo = NPCs.spawn('jo', { x: 5.55, z: 1.6, ry: -Math.PI / 2, pose: 'stand' });
    const dale = NPCs.spawn('dale', { x: -5.9, z: 0.6, ry: -Math.PI / 2, pose: 'stand' });
    F.metJo = false; F.metDale = false;
    Story.objective('Buy creamer — after 10 PM you pay inside first');
    let talkedJo = 0, holdingCreamer = false, paid = false, daleDone = false;
    // cooler: creamer
    Interact.add(N.dairy, {
      prompt: () => holdingCreamer || F.boughtCreamer ? 'Dairy cooler' : 'Take hazelnut creamer',
      use: () => { if (holdingCreamer || F.boughtCreamer) { Story.think('Milk, eggnog already, and something called "Breakfast Cheese."'); return; } holdingCreamer = true; SND.sfx('doorOpen', { pos: new THREE.Vector3(-2.8, 1, -4.4), creak: false }); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.16, 8), B.col(0xd8c8a0)); Player.hold(b, 'creamer'); },
    });
    Interact.add(N.sodaCooler, { prompt: 'Soda cooler', use: () => Story.think('Mountain Dew Code Red. It\'s 2004. Of course it is.') });
    Interact.volume(L.root, N.chips.x, N.chips.y, N.chips.z, 2.2, 1.0, 0.3, { prompt: 'Chips', use: () => Story.think(F.boughtChips ? 'One bag is enough. Mom would say none is enough.' : (F.boughtChips = true, 'Sour cream & onion. For the long haul.')) });
    // Jo
    Interact.add(jo.root, {
      prompt: () => holdingCreamer && !paid ? 'Pay — creamer + $10 on pump 2' : 'Talk to the clerk',
      use: async () => {
        if (holdingCreamer && !paid) {
          paid = true; SND.sfx('register', { pos: new THREE.Vector3(4.5, 1.1, 1) });
          await Story.lines([['JO', 'Twelve thirty-nine with the gas. Pump two\'s on. Don\'t let it click off at nine ninety-eight like a psychopath.'], ['EVAN', 'I would never.']]);
          Story.objective(daleDone ? 'Pump $10 of gas (pump 2)' : 'Pump $10 of gas (pump 2)');
          return;
        }
        talkedJo++;
        if (talkedJo === 1) {
          jo.lookAt(G.camera.position);
          await Story.lines([
            ['JO', 'Hey. Pump two\'s yours? Prepay after ten, sorry, it\'s a whole thing. Some guy drove off with forty bucks of diesel in June.'],
            ['EVAN', 'Yeah, ten on two. And — creamer?'],
            ['JO', 'Back cooler, far left.'],
            ['JO', '...Wait. KTLR hoodie. You\'re the radio kid!'],
            ['EVAN', 'I\'m — the overnight guy. Yeah.'],
            ['JO', 'I listen to you guys all night. Literally all night. That radio is the only thing in here that talks back.'],
            ['JO', 'I\'m Jo. I call in sometimes. You guys never read my whole dedication, it drives me crazy.'],
          ]);
          const c = await Story.choose(['Call in tonight. I\'ll read it.', 'Marcy says no locations on air.', 'Cool.']);
          if (c === 0) { await Story.say('JO', 'Oh, you\'re gonna regret that. I\'ll call. It\'s tradition.'); F.promisedJo = true; }
          else if (c === 1) await Story.say('JO', 'Marcy is a coward. I\'ll call anyway.');
          else await Story.say('JO', '"Cool." Wow. Radio personality.');
          F.metJo = true;
        } else if (!daleDone) await Story.say('JO', 'Creamer\'s in the back, radio boy.');
        else await Story.say('JO', U.pick(['Go, you\'re on the clock. Kind of.', 'Tell Marcy she owes me a CD.', 'I\'ll call in. Don\'t you dare not read it.']));
      },
    });
    // Dale at the coffee station: talk triggers when the player approaches
    Story.spawn(async () => {
      await Story.until(() => U.dist2(Player.pos.x, Player.pos.z, -5.9, 0.6) < 2.6 || (talkedJo >= 1 && holdingCreamer));
      dale.face(Player.pos.x, Player.pos.z); dale.lookAt(G.camera.position);
      await Story.lines([
        ['DALE', 'KTLR.'],
        ['DALE', '(nods at your hoodie) You\'re Ray\'s new overnight.'],
        ['EVAN', 'Uh — yeah. Evan.'],
        ['DALE', 'Dale. I keep your stick standing up there on the ridge. Transmitter, the link, the whole mess.'],
        ['DALE', 'Heard your ID just now. Good voice. Little nervous.'],
        ['DALE', 'You\'ll settle in.'],
      ]);
      const c = await Story.choose(['Thanks. I guess.', 'You were listening?']);
      if (c === 1) await Story.say('DALE', 'I\'m always listening. Occupational hazard.');
      else await Story.say('DALE', 'It\'s a compliment. Take it.');
      await Story.say('DALE', 'Tell Ray the STL\'s drifting again. He\'ll know what it means.');
      F.metDale = true;
      await dale.walkTo([[-3.6, 3.0], [1.0, 3.8], [3.2, 3.95]], 1.2);
      dale.face(3.4, 3.0);
      SND.sfx('register', { pos: new THREE.Vector3(4.5, 1.1, 1) });
      await Story.lines([
        ['DALE', 'Coffee, and the tape.'],
        ['JO', 'Duct tape at eleven at night, Dale? Do I want to know?'],
        ['DALE', 'Heater hose on the truck. Night, Jo. You by yourself again tonight?'],
        ['JO', 'Always.'],
        ['DALE', 'Lock the door when you go in the back.'],
      ]);
      await dale.walkTo([[-1.2, 4.2], [-1.2, 6.5], [-8, 10]], 1.3);
      dale.setVisible(false);
      SND.sfx('carDoorClose', { pos: N.buick.position.clone() });
      await Story.wait(1.5);
      SND.sfx('engineStartup', { pos: N.buick.position.clone() });
      N.buick.userData.setLights(true, true);
      Common.drivePath(N.buick, [[-10, 18], [-14, 26], [-14, 30.5], [-60, 30.5], [-140, 30.5]], 6, { sound: true }).then(() => { N.buick.visible = false; Common.propSilence(N.buick); });
      daleDone = true;
      await Story.wait(2);
      jo.lookAt(G.camera.position);
      await Story.say('JO', 'Dale\'s sweet. He\'s in here basically every night. He fixed my car stereo for free.');
    });
    // pump
    const pump = N.pumps[1];
    let gal = 0;
    Interact.add(pump.group, {
      prompt: () => paid ? (F.pumped ? 'Pump 2' : 'Pump gas — hold E ($10 prepaid)') : 'Pay inside first after 10 PM',
      use: async () => {
        if (!paid || F.pumped || L._pumping) return;
        L._pumping = true;
                const pl = L.loop('fridge', { pos: new THREE.Vector3(3, 1, 14), vol: 1.2 });
        while (gal < 5.35 && Input.held('KeyE')) { gal = Math.min(5.35, gal + 0.12); pump.disp.redraw(gal, gal * 1.869); await Story.wait(0.08); }
        pl.stop(0.1); L._pumping = false;
        if (gal >= 5.35) { SND.sfx('click', { pos: new THREE.Vector3(3, 1, 14), f: 1500, v: 2 }); F.pumped = true; Story.objective('Head back to the station'); }
      },
    });
    await Story.until(() => paid && F.pumped && daleDone);
    F.boughtCreamer = true;
    const car = N.evanCar;
    let go = false;
    const ci = Interact.add(car, { prompt: 'Drive back to the station', use: () => { go = true; } });
    await Story.until(() => go);
    Interact.remove(ci);
    SND.sfx('carDoorOpen', {});
    await UI.fade(1, 0.8);
    Story.goto('ch2');
  },
});
