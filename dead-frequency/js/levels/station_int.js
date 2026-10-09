'use strict';
// Interactive objects inside KTLR. Story scripts gate some of these with Story.flags.

const LIBRARY = {
  sections: {
    'A–F': [['Carly Ames', 'Northbound', 'northbound'], ['June Callaway', 'Paper Moon Motel', 'paper_moon'], ['Shelby Cain', 'Porch Light', 'porch_light'], ['The Dalton Brothers', 'Highway Hymnal', 'highway_hymnal'], ['Brenna Doyle', 'Wildflower Radio', null], ['Clint Easley', 'Red Dirt Sunday', null], ['The Fairlanes', 'Chrome & Cherry', null]],
    'G–L': [['Tommy Lee Harlan', 'Kerosene Summer', 'kerosene_summer'], ['The Halfway Kings', 'Slow Burn Avenue', 'slow_burn'], ['Wade Kimmel', 'Gravel Road Gospel', 'gravel_road'], ['Mercy Lane', 'Turnpike Hearts', 'turnpike_hearts'], ['Jolene Hart', 'Small Hours', null], ['Lonesome Pine Band', 'Live at the Grange', null]],
    'M–R': [['The Northerlies', 'Glass Houses in July', 'glass_houses'], ['Polaroid Kids', 'Static Love', 'static_love'], ['Colt Ramsey', 'Long Haul — "Diesel Prayer"', 'diesel_prayer'], ['Red Ash Revival', 'Whiskey & Wire', 'whiskey_wire'], ['Danielle Rourke', 'If You Call Tonight', 'if_you_call'], ['Miller Pratt', 'Ten Mile Night', null]],
    'S–Z': [['Sawtooth Ridge', 'High Desert', null], ['Marian Tell', '(see ARCHIVE LPs)', null], ['Wren Avenue', 'Cold Front', 'cold_front'], ['Tess Whitlow', 'Kitchen Light', null], ['Zane Yardley', 'Pickup Truck Psalms', null]],
  },
};

const REQUEST_BOOK_2004 = `<h2>REQUEST LOG — OCT 2004</h2><span style="font-size:15px">DATE   TIME    CALLER          SONG / DEDICATION
10/01  10:14P  Dwayne          Highway Hymnal — "for the night crew at the mill"
10/01  11:40P  Jo (Gas-N-Go)   anything — "for everybody working alone tonight"
10/01  12:31A  Walt            Porch Light — "for Ellie" (his wife, passed '01)
10/02  10:50P  Kayla           Static Love — "for Josh, sorry about the thing"
10/02  11:22P  Hank (trucker)  Diesel Prayer — "for the boys on 26"
10/08  10:31P  Walt            Porch Light — "for Ellie"
10/08  12:12A  Jo (Gas-N-Go)   Turnpike Hearts — "for anyone else stuck on night shift"
10/08  12:40A  ??? (hung up)   —
10/09  11:05P  Tasha           Northbound — "for my dad, drive safe"
10/14  10:44P  Walt            Porch Light — "for Ellie"
10/14  11:58P  Jo (Gas-N-Go)   Kerosene Summer — "for me lol. alone again!"
10/14  01:10A  ??? (no song)   — caller asked who works Fridays — M.D.
</span>`;

const ARCHIVE_BOOKS = {
  '1997': `<h2>REQUEST LOG — 1997 (Jan–Mar)</h2><span style="font-size:15px">Handwriting: loopy, purple ink. Lacey's.

03/12  12:20A  Dee (night nurse)   Paper Moon Motel
03/13  01:05A  "a fan"             Harbor Lights — "for Lacey" — played it, he hung up before I could say thanks :)
03/14  12:40A  Rusty (plow driver) Highway Hymnal — "for the plow guys up on the pass"
03/14  12:58A  "a fan"             Harbor Lights (Marian Tell) — "for Lacey, from your biggest fan. Is anybody else there with you tonight?"
               told him just me & the coffee pot :)
03/14  01:02A  played Harbor Lights

</span><i>The rest of the page is blank. The next entry, three days later, is in Ray's handwriting: "STATION ON AUTOMATION UNTIL FURTHER NOTICE."</i>`,
  '1999': `<h2>REQUEST LOG — 1999 (Aug)</h2><span style="font-size:15px">08/19  11:30P  Ana                 Porch Light — "for the night nurses at Hollis General, from the one stuck in the ER lot waiting on her ride"
08/19  11:52P  (no name)           asked if Ana was still at the hospital. Told him we don't give that out. — T.R.
08/20  12:10A  automation</span>

<i>Taped inside the cover, a newspaper clipping: "HOLLIS NURSE ANA RUIZ, 31, STILL MISSING — car found at General Hospital lot."</i>`,
  '2001': `<h2>REQUEST LOG — 2001 (Nov)</h2><span style="font-size:15px">11/02  10:40P  Marcy (testing)     lol hi
11/02  01:14A  Tom (trucker)       Diesel Prayer — "for anybody else drivin' the ridge alone tonight, keep me awake"
               — Rt 26, said he was pulling off at the scenic turnout to sleep
11/03  12:30A  automation</span>

<i>Someone has circled "scenic turnout" in pencil. Very lightly.</i>`,
  '2003': `<h2>REQUEST LOG — 2003 (Feb–Mar)</h2><span style="font-size:15px">02/28  11:15P  Walt               Porch Light — "for Ellie"
03/02  12:31A  Carrie (Pine Hollow Diner)  Glass Houses in July — "for everyone closing up alone tonight. this one's for us night owls"
03/02  12:50A  (hang up)
03/03  —       sheriff called re: Carrie. gave them this page. — Ray</span>`,
};

const EMAILS = [
  { from: 'Gwen Ostrander', subj: 'Oct traffic logs', date: 'Thu 10/14 3:02 PM', body: `Ray,\n\nOctober traffic logs are on the shared drive. Feed & Seed wants to add 4 spots/day through Halloween. I told them yes because you'd say yes.\n\nAlso the coffee situation is a crime.\n\n— Gwen` },
  { from: 'Dale Pruitt', subj: 'Ridge / STL', date: 'Wed 10/13 11:48 PM', body: `Ray —\n\nSTL is drifting again. I'll be up at the ridge Friday night running the generator load test, so if you see the remote blip that's me. No need to send anybody.\n\nI'll grab the logger tapes this weekend too. Archive's getting full.\n\nHow's the new kid working out? Sounds young on air. Nervous. He'll settle in.\n\n— D` },
  { from: 'Ray Tolliver', subj: 'RE: Ridge / STL', date: 'Thu 10/14 7:15 AM', sent: true, body: `Take the tapes, I don't care. But Gwen says the 2002 request book walked off too. If you've got it bring it back, we're supposed to keep those.\n\nKid's fine. Don't scare him.\n\n— R` },
  { from: 'Det. Kay Harlan — Hollis Co. SO', subj: 'Request logs / recordings', date: 'Mon 10/11 9:20 AM', body: `Mr. Tolliver,\n\nFollowing up on our phone call. As part of a review of the Lindqvist case (and two older cases) we'd like copies of your late-night request logs for the following periods, and any recordings you may have:\n\n  • Feb–Mar 2003\n  • Nov 2001\n  • Aug 1999\n\nSeveral family members mentioned that their loved ones were regular callers to your station's late show. It's very likely nothing. We're just being thorough.\n\nThank you,\nDet. Kay Harlan\nHollis County Sheriff's Office` },
  { from: 'Ray Tolliver', subj: 'DRAFT — RE: Request logs / recordings', date: '(unsent)', sent: true, body: `Det. Harlan —\n\nHappy to help. The paper logs are in our library. The air recordings are on VHS — our engineer, Dale Pruitt, keeps the archive at his place since we ran out of room. I'll have him pull the tapes for those dates and\n\n[draft — not sent]` },
  { from: 'FCC EAS Notices', subj: 'Required Monthly Test — October', date: 'Fri 10/1 6:00 AM', body: `This is a reminder that the October Required Monthly Test (RMT) for Oregon State EAS will be originated on Wednesday, October 20 between 0100 and 0400 local time. Stations must relay within 60 minutes.` },
  { from: 'Marcy Dunn', subj: 'Saturday', date: 'Fri 10/15 2:10 PM', body: `Ray can Evan cover my Saturday? Sister's wedding. Yes I know. Yes I'll bring you cake.\n\nAlso can we PLEASE stop doing dedications with locations, I get weird callers asking where the girls work.\n\nM` },
  { from: 'LOWER RATES NOW', subj: '!!! Refinance Today — Rates as Low as 3.9% !!!', date: 'Fri 10/15 4:44 AM', body: `Dear Homeowner,\n\nYou have been PRE-APPROVED...\n\n(you stop reading)` },
];

const ANSWERING = [
  ['Friday, 4:12 PM', 'BUD', 'Ray, it\'s Bud. Feed & Seed wants the harvest spots through Halloween, and — uh — they want Marcy to voice them, not you. No offense. Call me.'],
  ['Friday, 6:40 PM', 'DALE', 'Ray. Dale. I\'ll be up on the ridge tonight, running the generator test. If the transmitter blips, that\'s me. Don\'t send anybody up, I\'ve got it. ... Tell the new kid I said hi.'],
  ['Friday, 9:15 PM', 'MOM', 'Hi, um — sorry — is this the radio? This is the business line, isn\'t it. Okay. My husband\'s driving back from Boise tonight and I wanted to — never mind. Tell Evan his mom says hi. Bye. Sorry.'],
];

Levels.stationInteractions = function (L, o) {
  const N = L.named, F = Story.flags;
  L.state = { coffee: o.coffee || 'old', gen: o.genDone ? 'done' : 'off', vendTries: 0, mw: 'idle', headphones: false };
  const lookAt = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------------- coffee ----------------
  const cm = N.coffeeMaker;
  const potHeld = () => { const g = new THREE.Group(); const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.18, 10), new THREE.MeshStandardMaterial({ color: 0x99aabb, transparent: true, opacity: 0.4 })); g.add(glass); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.085, 0.05, 10), B.col(L.state.coffee === 'holdOld' ? 0x1a0c04 : 0x8aa0b0)); c.position.y = -0.06; g.add(c); g.scale.setScalar(0.9); g.rotation.z = 0.2; return g; };
  const setPotVisual = (state) => { // state: old | empty | full | water
    cm.pot.visible = state !== 'held';
    N.potCoffee.visible = state === 'old' || state === 'full';
    N.potCoffee.scale.y = state === 'full' ? 2.4 : 1;
  };
  setPotVisual(L.state.coffee === 'done' ? 'full' : (L.state.coffee === 'old' ? 'old' : 'empty'));
  if (L.state.coffee === 'done') cm.led.material.color.set(0xff2200);
  Interact.add(cm.group, {
    prompt: () => {
      const s = L.state.coffee;
      if (s === 'old') return 'Take the coffee pot';
      if (s === 'holdOld') return 'Put the pot back';
      if (s === 'holdWater') return 'Pour water into the reservoir';
      if (s === 'water') return Player.holding('filter') ? 'Put the filter in the basket' : 'Needs a filter';
      if (s === 'filter') return 'Needs coffee grounds';
      if (s === 'grounds') return 'Press BREW';
      if (s === 'brewing') return 'Brewing…';
      if (s === 'done') return Player.holding('mug') ? (Player.held.userData.coffee.visible ? 'Mug is full' : 'Pour a cup') : 'Fresh pot';
      return '';
    },
    use: () => {
      const s = L.state.coffee, pos = lookAt(-12.6, 1.1, -5);
      if (s === 'old') { L.state.coffee = 'holdOld'; setPotVisual('held'); Player.hold(potHeld(), 'pot'); SND.sfx('pickup', { pos }); Bus.emit('coffee', 'took'); }
      else if (s === 'holdOld') { L.state.coffee = 'old'; setPotVisual('old'); Player.drop(); SND.sfx('putdown', { pos }); }
      else if (s === 'holdWater') { L.state.coffee = 'water'; Player.drop(); setPotVisual('empty'); SND.sfx('pour', { pos, dur: 2.2 }); Bus.emit('coffee', 'water'); }
      else if (s === 'water' && Player.holding('filter')) { L.state.coffee = 'filter'; Player.drop(); SND.sfx('paper', { pos }); Bus.emit('coffee', 'filter'); }
      else if (s === 'grounds') {
        L.state.coffee = 'brewing'; SND.sfx('switch', { pos }); cm.led.material.color.set(0xff2200);
        const brew = L.loop('coffeeBrew', { pos, vol: 0.7 });
        Bus.emit('coffee', 'brewing');
        Story.spawn(async () => { await Story.wait(o.fastCoffee ? 4 : 28); brew.stop(1); L.state.coffee = 'done'; setPotVisual('full'); SND.sfx('beep', { pos, f: 2000, dur: 0.3 }); Bus.emit('coffee', 'done'); F.coffeeMade = true; });
      }
      else if (s === 'done' && Player.holding('mug') && !Player.held.userData.coffee.visible) { Player.held.userData.coffee.visible = true; SND.sfx('pour', { pos, dur: 1.4 }); Bus.emit('coffee', 'poured', Player.held.userData.mugId); }
    },
  });
  Interact.add(N.sink, {
    prompt: () => L.state.coffee === 'holdOld' ? 'Dump the old coffee and fill the pot' : 'Wash your hands',
    use: () => {
      const pos = lookAt(-12.55, 1, -3.4);
      if (L.state.coffee === 'holdOld') { SND.sfx('water', { pos, dur: 3 }); L.state.coffee = 'holdWater'; Player.hold(potHeld(), 'pot'); Story.say('THOUGHT', 'This has been on the burner since about six. It smells like a tire fire.', 3, 'thought'); Bus.emit('coffee', 'filled'); }
      else { SND.sfx('water', { pos, dur: 2 }); }
    },
  });
  Interact.add(N.filters, {
    prompt: () => L.state.coffee === 'water' && !Player.held ? 'Take a coffee filter' : 'Filters',
    enabled: () => L.state.coffee === 'water' && !Player.held,
    use: () => { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.04, 0.05, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0xf5f1e6, side: THREE.DoubleSide })); Player.hold(f, 'filter'); SND.sfx('paper', { pos: lookAt(-12.7, 1.6, -5.6) }); },
  });
  Interact.add(N.coffeeCan, {
    prompt: () => L.state.coffee === 'filter' ? 'Scoop coffee into the filter' : 'Coffee can — "Mountain Roast"',
    enabled: () => true,
    use: () => { if (L.state.coffee === 'filter') { L.state.coffee = 'grounds'; SND.sfx('rustle', { pos: lookAt(-12.55, 1, -5.7), v: 0.6 }); Bus.emit('coffee', 'grounds'); } else Story.think('Three scoops. Four if Marcy\'s having a bad day.'); },
  });
  N.mugs.forEach((m, i) => {
    m.userData.mugId = i === 0 ? 'marcy' : 'evan';
    Interact.add(m, {
      prompt: () => i === 0 ? 'Take mug ("WORLD\'S OKAYEST DJ")' : 'Take your mug',
      enabled: () => !Player.held && !m.userData.taken,
      use: () => { m.userData.taken = true; m.parent.remove(m); const hm = P.mug(new THREE.Group(), 0, 0, 0, { color: i === 0 ? 0x2a4a7a : 0xe8e4da }); hm.userData.mugId = m.userData.mugId; hm.userData.coffee = hm.children[2]; Player.hold(hm, 'mug'); SND.sfx('mugClink', { pos: lookAt(-12.5, 1, -2.7) }); },
    });
  });

  // ---------------- fridge / microwave / vending / backpack ----------------
  Interact.add(N.fridge, {
    prompt: 'Open fridge',
    use: async () => {
      SND.sfx('doorOpen', { pos: lookAt(-12.5, 1, -1.9), creak: false });
      if (F.boughtCreamer && Player.holding('creamer')) { Player.drop(); F.creamerStored = true; await Story.think('Hazelnut creamer, back where it belongs. Ray will never know there was a crisis.'); Bus.emit('creamerStored'); }
      else if (F.creamerStored) await Story.think('Creamer. Somebody\'s yogurt from September. A single pickle in a jar.');
      else await Story.think('Ketchup packets, somebody\'s yogurt from September, and an empty creamer bottle somebody put back in. Classic.');
      SND.sfx('doorClose', { pos: lookAt(-12.5, 1, -1.9), v: 0.5 });
    },
  });
  Interact.add(N.vending, {
    prompt: 'Buy a soda ($1.00)',
    enabled: () => !F.boughtSoda,
    use: async () => {
      const pos = lookAt(-5.6, 1, -2);
      L.state.vendTries++;
      SND.sfx('billFeed', { pos });
      await Story.wait(0.9);
      if (L.state.vendTries < 3) { SND.sfx('billFeed', { pos }); await Story.think(L.state.vendTries === 1 ? 'It spits the dollar back out. It\'s not even wrinkled.' : 'Flatten it on the edge of the machine... try again.'); }
      else { SND.sfx('vend', { pos }); F.boughtSoda = true; await Story.think('Dr. Thunder. The generic one. The machine has decided this is what I deserve.'); }
    },
  });
  Interact.add(N.backpack, {
    prompt: () => F.ateLasagna ? 'Backpack' : (F.lasagnaOut ? 'Backpack' : 'Get Mom\'s lasagna out of your backpack'),
    enabled: () => N.backpack.visible,
    use: async () => {
      SND.sfx('zipper', { pos: lookAt(-8.8, 0.9, -4.8) });
      if (!F.lasagnaOut && !Player.held) { F.lasagnaOut = true; const box = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.13), new THREE.MeshLambertMaterial({ color: 0xd84a2a, transparent: true, opacity: 0.85 })); Player.hold(box, 'lasagna'); await Story.think('Tupperware. A Post-it on the lid: "EAT A VEGETABLE TOO. love mom."'); }
      else await Story.think('Physics homework I\'m not going to do. Gum. A dead calculator.');
    },
  });
  Interact.add(N.microwave.group, {
    prompt: () => L.state.mw === 'idle' ? (Player.holding('lasagna') ? 'Heat lasagna (2:00)' : 'Microwave') : (L.state.mw === 'running' ? 'Heating…' : 'Take the lasagna'),
    enabled: () => L.state.mw !== 'running',
    use: async () => {
      const pos = lookAt(-12.55, 1.1, -6.3);
      if (L.state.mw === 'idle' && Player.holding('lasagna')) {
        Player.drop(); L.state.mw = 'running'; SND.sfx('beep', { pos, f: 1500, dur: 0.08 }); SND.sfx('beep', { pos, f: 1500, dur: 0.08, delay: 0.15 });
        N.microwave.win.material.color.set(0xffd27a);
        const hum = L.loop('microwave', { pos, vol: 0.6 });
        await Story.wait(o.fastCoffee ? 3 : 20); hum.stop(0.1); N.microwave.win.material.color.set(0x0c0c0c);
        SND.sfx('microDing', { pos }); SND.sfx('microDing', { pos, delay: 0.5 }); SND.sfx('microDing', { pos, delay: 1.0 });
        L.state.mw = 'done';
      } else if (L.state.mw === 'done') {
        L.state.mw = 'eaten'; F.ateLasagna = true;
        await UI.fade(1, 0.6); await Story.wait(1.2); await UI.fade(0, 0.8);
        await Story.think('Mom\'s lasagna. Burned my tongue on the first bite like I do every single time. Ten out of ten.');
      } else await Story.think('There\'s something orange baked onto the ceiling of this thing. It\'s been there since before I worked here.');
    },
  });

  // ---------------- bathroom ----------------
  Interact.add(N.toilet, { prompt: 'Flush', use: () => SND.sfx('flush', { pos: lookAt(-4.4, 0.6, -7.4) }) });
  Interact.add(N.bathSink, { prompt: 'Wash your face', use: async () => { SND.sfx('water', { pos: lookAt(-2.75, 1, -4), dur: 2.5 }); F.washedFace = (F.washedFace || 0) + 1; await Story.wait(2.4); Bus.emit('washedFace'); } });

  // ---------------- flashlight ----------------
  Interact.add(N.flashlight, {
    prompt: 'Take flashlight', enabled: () => N.flashlight.visible,
    use: () => { N.flashlight.visible = false; Player.hasFlashlight = true; F.hasFlashlight = true; SND.sfx('pickup', { pos: lookAt(-2.15, 1, -4.1) }); UI.hint('<b style="border:1px solid #777;padding:0 5px">F</b> flashlight', 5); Bus.emit('gotFlashlight'); },
  });

  // ---------------- key cabinet ----------------
  Interact.add(N.keyBox, {
    prompt: 'Key cabinet',
    use: async () => {
      await UI.doc(`<h2>KEY CABINET</h2>FRONT DOOR ........ ✓\nBACK DOOR ......... ✓\nGENERATOR ......... ✓\nPROD B ............ <span class="red">— empty hook —</span>\nRIDGE SITE ........ (lockbox — code on file w/ Ray)\nVAN ............... ✓\nSTORAGE ........... ✓\nSPARE ............. ✓`, 'hand');
      F.sawEmptyHook = true;
      if (!F.prodBOpened) await Story.think('The Prod B hook is empty. Probably in Ray\'s pocket. Or Dale\'s.');
    },
  });

  // ---------------- answering machine ----------------
  Interact.add(N.answering.group, {
    prompt: () => F.heardMessages ? 'Answering machine — replay' : 'Answering machine (3 new)',
    use: async () => {
      if (L._amBusy) return; L._amBusy = true;
      N.answering.light.material.color.set(0x220000);
      SND.sfx('button', { pos: lookAt(-4.5, 0.8, 6.3) });
      await Story.say('', '"You have... three... new messages."', 2.2, 'phone');
      for (const [when, who, text] of ANSWERING) { await Story.say('', `[${when}]`, 1.4, 'phone'); await Story.say(who, text, null, 'phone'); }
      await Story.say('', '"End of messages."', 1.5, 'phone');
      F.heardMessages = true; L._amBusy = false;
      if (!F.thoughtMom) { F.thoughtMom = true; await Story.think('...Mom. Oh my god.'); }
      Bus.emit('heardMessages');
    },
  });

  // ---------------- office computer (email) ----------------
  Interact.add(N.officePC.group, {
    prompt: 'Use Ray\'s computer',
    use: () => {
      let sel = -1;
      const render = el => {
        const list = EMAILS.map((m, i) => `<tr class="${sel === i ? 'sel' : ''} ${m.read ? '' : 'unread'}" data-i="${i}"><td>${m.sent ? '✉→ ' : ''}${U.esc(m.from)}</td><td>${U.esc(m.subj)}</td><td>${U.esc(m.date)}</td></tr>`).join('');
        const body = sel >= 0 ? `<div class="pc-msg"><b>From:</b> ${U.esc(EMAILS[sel].from)}\n<b>Subject:</b> ${U.esc(EMAILS[sel].subj)}\n<b>Date:</b> ${U.esc(EMAILS[sel].date)}\n\n${U.esc(EMAILS[sel].body)}</div>` : '<div class="pc-msg" style="color:#777">Select a message.</div>';
        el.innerHTML = `<div class="win" style="left:20px;top:16px;right:20px;bottom:44px"><div class="tb"><span>Inbox — Outlook Express — Ray Tolliver</span><span>_ □ ×</span></div>
          <div class="bd" style="display:flex;flex-direction:column;gap:4px;padding:4px">
            <div><span class="pc-btn">New Mail</span><span class="pc-btn">Reply</span><span class="pc-btn">Send/Recv</span></div>
            <div style="background:#fff;border:2px inset #fff;height:42%;overflow:auto"><table class="pc-list"><tr><th>From</th><th>Subject</th><th>Received</th></tr>${list}</table></div>
            <div style="background:#fff;border:2px inset #fff;flex:1;overflow:auto">${body}</div>
          </div></div>
          <div class="pc-taskbar"><span class="pc-start">Start</span><span>Outlook Express</span><span class="pc-clock">${Story.clockStr()}</span></div>`;
        el.querySelectorAll('tr[data-i]').forEach(tr => tr.onclick = () => { sel = +tr.dataset.i; EMAILS[sel].read = true; SND.sfx('click', { bus: 'ui' }); F['email_' + sel] = true; render(el); });
      };
      UI.pc(render).then(() => Bus.emit('usedOfficePC'));
    },
  });

  // ---------------- CCTV ----------------
  Interact.add(N.cctv.group, {
    prompt: 'Watch the security monitor',
    use: async () => {
      await Common.focus(lookAt(-1.75, 1.6, 6.6), lookAt(-1.3, 1.55, 6.6), 'cctv');
    },
  });

  // ---------------- fax ----------------
  Interact.add(N.fax, { prompt: 'Fax machine', use: () => Story.think(F.faxArrived ? 'The EAS test schedule. Again. Ray gets this fax every week.' : 'The fax machine. Last thing it printed was a pizza menu.') });

  // ---------------- library ----------------
  N.cdShelves.forEach(([x, z], i) => {
    const sec = Object.keys(LIBRARY.sections)[i];
    Interact.volume(L.root, x, 1.2, z, 0.5, 2.0, 1.2, {
      prompt: `Browse CDs (${sec})`,
      use: async () => {
        const list = LIBRARY.sections[sec];
        const labels = list.map(c => `${c[0]} — ${c[1]}`).concat(['(put it back)']);
        const idx = await Common.listChoice(labels, `CDs ${sec}`);
        if (idx < 0 || idx >= list.length) return;
        const c = list[idx];
        if (!c[2]) { await Story.think(U.pick(['Not tonight.', 'The case is empty. Somebody took the disc home.', 'Scratched to hell.'])); return; }
        if (Player.held && Player.heldName !== 'cd') { await Story.think('My hands are full.'); return; }
        const cdm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.012, 0.125), B.col(0x88aacc)); cdm.rotation.x = 0.5;
        Player.hold(cdm, 'cd'); Player.heldSong = c[2];
        SND.sfx('pickup', { bus: 'ui' });
        UI.toast(`Holding: ${c[0]} — ${SONGS[c[2]].title}`, 4);
        Bus.emit('tookCD', c[2]);
      },
    });
  });
  Interact.volume(L.root, N.lpShelf[0], 0.9, N.lpShelf[1], 0.5, 1.4, 2.2, {
    prompt: 'Archive LPs (pre-1985)',
    use: async () => {
      if (F.harborRequested && !F.hasHarborLP && !F.playedHarbor) {
        await Story.think('T... Tell. Marian Tell. "Harbor Lights." The sleeve is soft with age.');
        await UI.doc(`<div class="ph">[ LP sleeve: a woman in a yellow raincoat on a pier at night, looking back over her shoulder. ]</div><b>MARIAN TELL — HARBOR LIGHTS</b> (1979)\n\nA small sticker on the back: <i>KTLR LIBRARY — DO NOT REMOVE</i>\n\nTucked inside the sleeve, a pink request slip in purple ink:\n\n<span class="hand" style="font-family:cursive">"For whoever's still up.\nYou're not alone. I'm right here.\n— L."</span>`, 'photo');
        F.hasHarborLP = true;
        const lp = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.31, 0.01), B.col(0xd0b040)); lp.rotation.set(-0.6, 0.2, 0);
        Player.hold(lp, 'lp');
        Bus.emit('tookLP');
      } else await Story.think(U.pick(['Old country LPs. Ray won\'t let anyone throw them out.', 'A whole shelf of records nobody has played since vinyl went out.']));
    },
  });
  Interact.volume(L.root, 11.6, 0.6, 7.45, 0.75, 1.1, 0.5, {
    prompt: 'Card catalog',
    use: async () => {
      const opts = ['Search: Marian Tell', 'Search: Colt Ramsey', 'Search: Lacey Harmon', '(close)'];
      if (!F.harborRequested) opts.splice(0, 1);
      const i = await Common.listChoice(opts, 'Card catalog');
      const pick = opts[i];
      if (!pick || pick === '(close)') return;
      if (pick.includes('Tell')) { F.catalogHarbor = true; await UI.doc(`<b>TELL, MARIAN</b>\n"Harbor Lights" (1979, Westwind Records)\nFormat: LP only. Location: ARCHIVE LPs, shelf 3.\n\nAIR HISTORY:\n  11/02/96  1:10A  L.H.\n  01/18/97  12:44A L.H.\n  03/13/97  1:05A  L.H.\n  03/14/97  1:02A  L.H.\n  <span class="red">— no plays since —</span>`, 'fax'); Bus.emit('catalogHarbor'); }
      else if (pick.includes('Ramsey')) await UI.doc(`<b>RAMSEY, COLT</b>\n"Long Haul" (2000) — CD\nTracks in rotation: Diesel Prayer (3:41)\nLocation: CDs M–R\nRequests this month: 4 (Hank x3, "the boys on 26")`, 'fax');
      else await UI.doc(`<b>HARMON, LACEY</b>\n\nNo catalog entry.\n\nSomeone has written on the blank card in pencil:\n<i>"Lacey's sign-off: Harbor Lights. Every night at 1."</i>`, 'hand');
    },
  });
  Interact.volume(L.root, N.binders[0], 0.85, N.binders[1], 1.2, 0.3, 0.7, {
    prompt: 'Old request logs (binders)',
    use: async () => {
      const yrs = Object.keys(ARCHIVE_BOOKS);
      const i = await Common.listChoice(yrs.map(y => `Request log — ${y}`).concat(['(close)']), 'Binders');
      if (i < 0 || i >= yrs.length) return;
      F['readLog' + yrs[i]] = true;
      await UI.doc(ARCHIVE_BOOKS[yrs[i]], 'lined');
      Bus.emit('readArchive', yrs[i]);
    },
  });

  // ---------------- studio ----------------
  Interact.add(N.requestBook, {
    prompt: () => F.pendingLog ? 'Log the request' : 'Read the request book',
    use: async () => {
      if (F.pendingLog) { const e = F.pendingLog; F.pendingLog = null; F.logEntries = (F.logEntries || []).concat([e]); SND.sfx('paper', { bus: 'ui' }); UI.toast('Logged: ' + e, 3); Bus.emit('logged'); return; }
      const tonight = (F.logEntries || []).map(e => `10/15  ${e}`).join('\n');
      await UI.doc(REQUEST_BOOK_2004 + (tonight ? `<span style="font-size:15px;color:#22a">${U.esc(tonight)}</span>` : ''), 'lined');
      F.readRequestBook = true;
    },
  });
  Interact.add(N.txPanel, {
    prompt: () => F.readingsDue ? 'Take transmitter readings' : 'Transmitter remote control',
    use: async () => {
      const on = Radio.onAir;
      const r = on ? { pv: '4.25 kV', pi: '1.12 A', fwd: '4.81 kW', ref: '38 W' } : { pv: '0.00 kV', pi: '0.00 A', fwd: '0.00 kW', ref: '0 W' };
      await UI.doc(`<h2>KTLR — TRANSMITTER REMOTE</h2>Site: KESSLER RIDGE  ·  Status: ${on ? 'PLATE ON' : '<span class="red">OFF — NO RF</span>'}\n\nPLATE VOLTAGE ...... ${r.pv}\nPLATE CURRENT ...... ${r.pi}\nFORWARD POWER ...... ${r.fwd}\nREFLECTED POWER .... ${r.ref}\n\n${F.readingsDue ? '<i>You copy the numbers into the transmitter log with the time next to them.</i>' : '<i>Normal is about 4.8 kW forward. Ray says if it reads zero, the world is ending.</i>'}`, 'fax');
      if (F.readingsDue) { F.readingsDue = false; F.readingsDone = (F.readingsDone || 0) + 1; Bus.emit('readings'); }
    },
  });
  Interact.add(N.autoPC.group, {
    prompt: 'Automation computer',
    use: () => {
      const render = el => {
        const i = Radio.info();
        const up = Radio.upcoming(6).map((id, k) => `<tr class="${k < Radio.queue.length ? 'req' : ''}"><td>${k + 1}</td><td>${U.esc(SONGS[id].title)}</td><td>${U.esc(SONGS[id].artist)}</td><td>${k < Radio.queue.length ? 'REQUEST' : 'rotation'}</td></tr>`).join('');
        el.innerHTML = `<div class="ab"><div class="hdr"><span>AirBoss 3.1 — KTLR 94.1</span><span>${Story.clockStr()}</span></div>
          ${Radio.onAir ? '' : '<div class="warn">!!! SILENCE DETECTED — NO RF FROM TRANSMITTER !!!</div>'}
          <div class="np">${i ? `<div>NOW PLAYING</div><div class="t">${U.esc(i.title)}</div><div>${U.esc(i.artist)} (${i.year || ''})</div><div class="bar"><div style="width:${Math.min(100, i.elapsed / i.duration * 100)}%"></div></div><div>${Math.floor(i.remaining / 60)}:${String(Math.floor(i.remaining % 60)).padStart(2, '0')} remaining</div>` : 'STOPPED'}</div>
          <div>UP NEXT</div><table>${up}</table>
          <div style="margin-top:10px;color:#789">Requests: load the CD in CD-1 and it auto-inserts after the current track.</div></div>`;
      };
      UI.pc(render);
      const iv = setInterval(() => { if (!UI.pcOpen) clearInterval(iv); else UI.pcRefresh(); }, 1000);
    },
  });
  Interact.add(N.cdPlayer, {
    prompt: () => Player.holding('cd') ? 'Load CD into CD-1 and cue it' : 'CD players',
    use: async () => {
      if (Player.holding('cd')) {
        const id = Player.heldSong; Player.drop(); Player.heldSong = null;
        SND.sfx('cdTray', { pos: lookAt(5.5, 1, 5.9) });
        Radio.queueNext(id);
        UI.toast(`CUED: ${SONGS[id].title} — plays next`, 3.5);
        Bus.emit('cued', id);
      } else await Story.think('CD-1, CD-2, and a cart machine nobody has used since 1998.');
    },
  });
  Interact.add(N.turntable, {
    prompt: () => Player.holding('lp') ? 'Put "Harbor Lights" on the turntable' : 'Turntable',
    use: async () => {
      if (Player.holding('lp')) { Player.drop(); N.platter.material = B.col(0xd0b040); SND.sfx('needle', { pos: lookAt(0.3, 1, 5) }); Bus.emit('lpOnTable'); }
      else await Story.think('A Technics turntable. It still works. Mostly for Ray\'s Christmas specials.');
    },
  });
  Interact.add(N.headphones, {
    prompt: () => L.state.headphones ? 'Take off headphones' : 'Put on headphones',
    use: () => Common.headphones(!L.state.headphones),
  });
  Interact.add(N.board, {
    prompt: () => F.micPrompt || 'Mixing board',
    use: () => { if (F.micHandler) F.micHandler(); else Story.think(U.pick(['Twelve channels. I use three of them.', 'Everything\'s on automation. Don\'t touch anything you don\'t understand — Ray.'])); },
  });
  Interact.add(N.mic, { prompt: () => F.micPrompt || 'Microphone', use: () => { if (F.micHandler) F.micHandler(); else Story.think('Mic\'s off. Nothing to say yet.'); } });
  // studio light switch
  Interact.volume(L.root, -0.85, 1.2, 1.6, 0.1, 0.15, 0.1, {
    prompt: () => N.lights.studio.on ? 'Turn off overhead light' : 'Turn on overhead light',
    use: () => { N.lights.studio.setOn(!N.lights.studio.on); SND.sfx('switch', { pos: lookAt(-0.85, 1.2, 1.6) }); F.studioDark = !N.lights.studio.on; },
  });
  B.box(L.root, -0.88, 1.12, 1.6, 0.02, 0.14, 0.08, B.col(0xe8e4d8));

  // ---------------- engineering ----------------
  Interact.add(N.logger.group, {
    prompt: () => F.wantLoggerTape ? 'Eject the logger tape' : 'Logger VCR',
    use: async () => {
      if (F.wantLoggerTape && !F.hasLoggerTape) { F.hasLoggerTape = true; SND.sfx('tapeIn', { pos: lookAt(-0.14, 1.15, -7.2) }); N.logger.led.material.color.set(0x330000); const t = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.025, 0.1), B.col(0x111111)); Player.hold(t, 'vhs'); Bus.emit('loggerTape'); }
      else await Story.think('Recording. The counter says 0' + Math.floor(Story.clock / 60 % 24) + ':' + String(Math.floor(Story.clock % 60)).padStart(2, '0') + ':14. Every second of tonight is on this tape.');
    },
  });
  Interact.add(N.breaker, { prompt: 'Breaker panel', use: () => UI.doc(STATION_DOCS.breakers, 'fax') });

  // ---------------- prod B ----------------
  Interact.add(N.tapeB, {
    prompt: 'Take the cassette', enabled: () => N.tapeB.visible,
    use: async () => {
      N.tapeB.visible = false; F.hasTapeB = true;
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.016, 0.065), B.col(0x1a1a1a)); Player.hold(t, 'cassette');
      SND.sfx('pickup', { pos: lookAt(6, 0.5, -6.4) });
      await UI.doc(`<div class="ph">[ a plain black cassette, Maxell UR 60 ]</div>The label is handwritten in neat block capitals:\n\n<b>KTLR — 10/15/04 — E.</b>`, 'photo');
      Bus.emit('tookTapeB');
    },
  });
  Interact.add(N.deck, {
    prompt: () => Player.holding('cassette') ? 'Play the cassette' : 'Cassette deck',
    use: () => { if (Player.holding('cassette')) { Player.drop(); SND.sfx('tapeIn', { pos: lookAt(6.7, 0.9, -7.2) }); Bus.emit('playTapeB'); } else Story.think('A dusty Tascam deck. The power light is on.'); },
  });
  Interact.add(N.lamp, { prompt: () => N.lights.prodb.on ? 'Turn off the lamp' : 'Turn on the lamp', use: () => { N.lights.prodb.setOn(!N.lights.prodb.on); SND.sfx('switch', { pos: lookAt(5.6, 0.3, -5.2) }); } });
  Interact.add(N.chairB, { prompt: 'Chair', use: () => Story.think(F.prodBOpened ? 'Facing the wall. Like someone sat here and just... listened.' : 'An old chair.') });

  // ---------------- generator ----------------
  const gen = N.generator;
  const gpos = lookAt(-5.5, 0.8, -11);
  const GEN_STEPS = {
    off: ['Open the generator housing', () => { SND.sfx('click', { pos: gpos, f: 1800 }); return 'open'; }],
    open: ['Turn the fuel valve ON', () => { SND.sfx('switch', { pos: gpos }); return 'fuel'; }],
    fuel: ['Close the choke', () => { SND.sfx('switch', { pos: gpos }); return 'choke'; }],
    choke: ['Press the primer bulb', () => { SND.sfx('prime', { pos: gpos }); L.state.primes = (L.state.primes || 0) + 1; return L.state.primes >= 3 ? 'primed' : 'choke'; }],
    primed: ['Pull the starter cord', () => {
      SND.sfx('zip', { pos: gpos }); Engine.shake(0.03, 0.2);
      L.state.pulls = (L.state.pulls || 0) + 1;
      if (L.state.pulls < (o.genPulls || 3)) { SND.sfx('sputter', { pos: gpos, delay: 0.3, n: 3 + L.state.pulls * 2 }); return 'primed'; }
      SND.sfx('sputter', { pos: gpos, delay: 0.3, n: 8 });
      L.genLoop = L.loop('generator', { pos: gpos.clone(), vol: 0.9, fadeIn: 1.2 });
      Bus.emit('noise', gpos.x, gpos.z, 30, 'generator');
      return 'running';
    }],
    running: ['Open the choke', () => { SND.sfx('switch', { pos: gpos }); return 'chokeOpen'; }],
    chokeOpen: ['Set the switch to AUTO', () => { SND.sfx('switch', { pos: gpos }); return 'auto'; }],
    auto: ['Close the housing', () => { SND.sfx('doorClose', { pos: gpos, v: 0.5 }); Bus.emit('genDone'); F.genDone = true; return 'done'; }],
  };
  Interact.add(gen.group, {
    prompt: () => { const st = GEN_STEPS[L.state.gen]; return F.genTask && st ? st[0] : 'Standby generator'; },
    use: async () => {
      const st = GEN_STEPS[L.state.gen];
      if (!F.genTask || !st) { await Story.think(L.state.gen === 'done' ? 'Set to AUTO. It\'ll kick on by itself if the power drops.' : 'The backup generator. Ray calls it "Old Faithful." It is neither.'); return; }
      L.state.gen = st[1]();
      Bus.emit('genStep', L.state.gen);
    },
  });
  if (o.genRunning) { L.state.gen = 'done'; }
};
