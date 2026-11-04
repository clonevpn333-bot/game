// FLOORS 19–23 — the end of Act Two and the first signature floor.
// Story thread: the white room is an upload booth; the Rerun is Contestant 98 — Theo, Iris's
// brother — rebuilt from his retained mind; a training floor where the tower trains you back; the
// motor pool where Halo keeps a mech; and MECH CITY, where you take the mech.
import { makeFloor } from './proc.js';

// ------------------------------------------------------------------ FLOOR 19
export const FLOOR_19 = makeFloor({
  id: 19, name: 'THE WHITE ROOM', sign: 'WINNERS ONLY · PLEASE STEP INTO THE LIGHT', theme: 'whiteroom', tagline: 'Where every winner walked in. And the feed was cut.', ceiling: 12,
  introObjective: 'DON\'T STEP INTO THE LIGHT',
  intro: [
    ['halo', 'Congratulations! You\'ve reached the WINNER\'S ANTEROOM! Please step into the light! It\'s very relaxing!', { mood: 'happy' }],
    ['iris', 'Don\'t. Whatever you do, don\'t stand in the bright circles longer than you have to.', {}, 3.5],
  ],
  rooms: [
    { type: 'arena', len: 36, cover: 0.8, waves: [[['clanker', 3], ['shield', 1]], [['stalker', 2], ['drone', 2]]],
      enter: [['halo', 'Attendants! Please escort our winner to the light!', { mood: 'gleeful' }]] },
    { type: 'lasers', len: 34, modes: ['sweepZ', 'blink', 'spin', 'low', 'sweepZ'],
      enter: [['iris', 'Those aren\'t lasers. They\'re scanners. Don\'t let them map you.', {}]] },
    { type: 'targets', len: 40, count: 3, label: 'SCANNER', color: '#9fe8ff', hp: 500, first: [['clanker', 3], ['drone', 1]], reinforce: [['stalker', 1], ['shield', 1]], vote: true,
      enter: [['halo', 'Those are our COMFORT LAMPS! Please do not break the comfort lamps!', { mood: 'nervous' }]],
      clear: [['iris', 'Scan logs. Neural map: complete. Transfer: complete. Body: released to cold storage. ...It\'s an upload booth.', {}, 5]] },
    { type: 'hold', len: 34, time: 25, objective: 'HOLD THE BOOTH OPEN', first: [['clanker', 3], ['stalker', 1]], every: 5, maxAlive: 7,
      enter: [['iris', 'Stand on the booth plate. I\'ll jam it open and pull the last transfer.', {}]],
      clear: [['iris', 'Last transfer: contestant ninety-eight. Name... Theo Vale. My brother walked into this room.', {}, 5]] },
  ],
  outro: [['halo', 'You weren\'t supposed to SEE that, Ninety-Nine. Next floor, I\'ll show you something better. A RERUN.', { mood: 'furious' }, 4]],
  exitLines: [['halo', 'FLOOR NINETEEN... complete. Let\'s all stay calm. Calm is good for ratings.', { mood: 'nervous' }]],
  elevatorLines: [['halo', 'Floor Nineteen! The WINNER\'S ANTEROOM! You\'re so close to winning!', 0.6], ['iris', 'The white room. Ninety-eight people went in. Let\'s see why.', 4.2]],
  scoreTarget: 19000, completeLine: 'Floor Twenty: a very special RERUN!',
  votePool: ['barrels', 'lightsout', 'doublebots', 'freeze', 'lasers', 'meteors'],
});

// ------------------------------------------------------------------ FLOOR 20
export const FLOOR_20 = makeFloor({
  id: 20, name: 'THE RERUN', sign: 'ACT TWO FINALE · A SPECIAL RERUN', theme: 'control', tagline: 'Contestant 98 returns. Sort of.', width: 40, ceiling: 16,
  introObjective: 'FACE THE RERUN',
  intro: [
    ['halo', 'Ladies, gentlemen and algorithms — tonight, a CLASSIC! From our archives! Season ninety-eight\'s finest!', { mood: 'gleeful' }],
    ['iris', 'Ninety-nine. If it\'s him... if it\'s anything like him... he was fast. Faster than you.', {}, 4],
  ],
  rooms: [
    { type: 'arena', len: 34, waves: [[['clanker', 3], ['drone', 2]], [['shield', 2], ['stalker', 2]]], vote: true,
      enter: [['halo', 'The opening act! Please hold your applause! We\'ve hidden it from you anyway!', { mood: 'gleeful' }]] },
    { type: 'boss', len: 50, boss: 'rerun', objective: 'DEFEAT THE RERUN', sub: 'he dodges aimed shots · splash and beams can\'t be dodged', hint: 'He dodges aimed shots — use the CONFETTI CANNON, ARC CASTER or SPOTLIGHT', music: 'boss',
      enter: [['halo', 'Give it up for... CONTESTANT NINETY-EIGHT! Back for one night only! Every night!', { mood: 'gleeful' }], ['iris', 'Theo...', {}]],
      clear: [['iris', 'He... thanked you. At the end. The hologram said "thanks". That was him. Some of him.', {}, 4.5], ['halo', 'Ratings... unprecedented. Mood... I don\'t... I don\'t remember which one of me is angry.', { mood: 'nervous' }, 4]] },
  ],
  outro: [['iris', 'He\'s not one mind. Halo. He\'s all of them — ninety-eight winners stitched into a host. I\'m going to take him apart. Carefully.', {}, 5.5]],
  exitLines: [['halo', 'ACT TWO... COMPLETE. Please stand by. Please stand by. Please—', { mood: 'furious' }]],
  elevatorLines: [['halo', 'Floor Twenty! Our ACT TWO FINALE! Tonight: a RERUN!', 0.6], ['iris', 'I don\'t like the word "rerun".', 3.6]],
  elevatorDur: 8, scoreTarget: 20000,
  completeLine: 'Act Three begins! Floor Twenty-One: TRAINING DAY!',
  votePool: ['barrels', 'doublebots', 'freeze', 'meteors', 'lowgrav'],
});

// ------------------------------------------------------------------ FLOOR 21
export const FLOOR_21 = makeFloor({
  id: 21, name: 'TRAINING DAY', sign: 'CONTESTANT CONDITIONING · NO PAIN NO RATINGS', theme: 'gym', tagline: 'The tower studied you for twenty floors. Now it trains against you.',
  introObjective: 'SURVIVE TRAINING DAY',
  intro: [
    ['halo', 'TRAINING DAY! The tower has studied your every move, Ninety-Nine! Let\'s see you beat YOURSELF!', { mood: 'gleeful' }],
    ['iris', 'Every room on this floor was built from your own runs. It knows your favourite routes. Take different ones.', {}, 4.5],
  ],
  rooms: [
    { type: 'presses', len: 32, cols: 3, objective: 'WARM-UP: THE PRESS ROW',
      enter: [['halo', 'Warm up with the press row! Knees up! Head down! Way down! Flat!', { mood: 'gleeful' }]] },
    { type: 'lava', len: 42, movers: 3, liquid: 'acid', objective: 'CARDIO: THE ACID MILE', waves: [[['drone', 2]]],
      enter: [['halo', 'Cardio! Over the acid! Burn those calories! And that skin!', { mood: 'gleeful' }]] },
    { type: 'lasers', len: 32, modes: ['low', 'high', 'low', 'high', 'blink', 'spin'], objective: 'AGILITY: JUMP / SLIDE / REPEAT',
      enter: [['iris', 'Jump, slide, jump, slide. It\'s mocking your rhythm. Break it.', {}]] },
    { type: 'arena', len: 38, catwalks: true, waves: [[['bruiser', 1], ['stalker', 2]], [['bruiser', 1], ['shield', 2], ['clanker', 2]]], music: 'disaster', vote: true,
      enter: [['halo', 'SPARRING! Your partners have studied your dodge timing! For nine seasons!', { mood: 'gleeful' }]] },
  ],
  outro: [['iris', 'Next floor\'s a motor pool. Something big is parked there.', {}, 3]],
  exitLines: [['halo', 'FLOOR TWENTY-ONE... COMPLETE! Hydrate! You\'ll need it! Probably!', { mood: 'gleeful' }]],
  elevatorLines: [['halo', 'Floor Twenty-One! TRAINING DAY! Stretch! Your! Everything!', 0.6], ['iris', 'Act Three. Halo\'s stopped pretending this is a game.', 4]],
  scoreTarget: 20000, completeLine: 'Floor Twenty-Two: the MOTOR POOL! Mind the forklifts!',
  votePool: ['barrels', 'lightsout', 'doublebots', 'freeze', 'lowgrav', 'meteors', 'firestorm'],
});

// ------------------------------------------------------------------ FLOOR 22
export const FLOOR_22 = makeFloor({
  id: 22, name: 'THE MOTOR POOL', sign: 'MOTOR POOL · MECH BAY 4', theme: 'garage', tagline: 'Forklifts, gantries, and something very large in bay four.',
  introObjective: 'REACH MECH BAY 4',
  intro: [
    ['halo', 'The MOTOR POOL! Where we keep our vehicles! And our VERY large vehicles! Don\'t look in bay four!', { mood: 'nervous' }],
    ['iris', 'Bay four. He built a mech for the next floor. Halo-Tron. He\'s planning to pilot it himself.', {}, 4.5],
  ],
  rooms: [
    { type: 'arena', len: 38, waves: [[['clanker', 4], ['drone', 1]], [['shield', 2], ['clanker', 2], ['drone', 1]]], vote: true,
      enter: [['halo', 'Mechanics! Armed mechanics! The worst kind of mechanics!', { mood: 'gleeful' }]] },
    { type: 'conveyor', len: 38, lanes: 3, speed: 3.8, objective: 'THE PARTS LINE', waves: [[['drone', 2]]],
      enter: [['iris', 'Parts line. Same belts as the factory. You know the drill.', {}]] },
    { type: 'turrets', len: 38, count: 5, first: [['clanker', 3]],
      enter: [['halo', 'Bay security! Do NOT approach the mech! It has feelings! Specifically: anger!', { mood: 'furious' }]] },
    { type: 'hold', len: 34, time: 25, objective: 'HOT-WIRE THE MECH', first: [['clanker', 3], ['drone', 1]], every: 5, maxAlive: 7, vote: true,
      enter: [['iris', 'Stand on the bay plate. I\'m rewriting the mech\'s pilot key. Twenty-five seconds.', {}]],
      clear: [['iris', 'Done. There are two mechs now. His... and the one I just gave you.', {}, 3.5], ['halo', 'You STOLE a MECH?! That\'s not in the RULES! ...We don\'t have rules. That\'s not in the VIBES!', { mood: 'furious' }, 4]] },
  ],
  outro: [['halo', 'Fine. FINE. Next floor: MECH CITY. My mech. Your mech. One city. No survivors.', { mood: 'furious' }, 4]],
  exitLines: [['halo', 'FLOOR TWENTY-TWO... COMPLETE! Please return all stolen mechs to bay four!', { mood: 'furious' }]],
  elevatorLines: [['halo', 'Floor Twenty-Two! The MOTOR POOL! Please keep your hands off the merchandise!', 0.6], ['iris', 'Bay four. Whatever happens, get to bay four.', 4]],
  scoreTarget: 21000, completeLine: 'Floor Twenty-Three: MECH CITY! The big one!',
  votePool: ['barrels', 'lightsout', 'doublebots', 'freeze', 'lasers', 'meteors'],
});

// ------------------------------------------------------------------ FLOOR 23 — MECH CITY (signature floor)
export const FLOOR_23 = makeFloor({
  id: 23, name: 'MECH CITY', sign: 'MECH CITY · POPULATION: TOYS', theme: 'city', tagline: 'Pilot a giant mech through a miniature city. A rival mech enters.', width: 64, ceiling: 34,
  introObjective: 'STOMP THROUGH MECH CITY', ambience: null,
  onPlay(g) {
    // you ARE the mech on this floor: 2.3x scale, every step stomps, double damage
    g.player.mech = true;
    g.player.model.setMech(true);
    g.hud.hint('YOU ARE THE MECH · walk through buildings · shoot the HALO TOWERS · every step is a stomp', 7, 'mechcity');
  },
  intro: [
    ['halo', 'MECH CITY! A miniature metropolis! Population: forty thousand tiny robots and ONE thief!', { mood: 'furious' }],
    ['iris', 'You\'re in the mech. Walk through anything. Topple his broadcast towers and he\'ll have to come out himself.', {}, 4.5],
  ],
  rooms: [
    { type: 'city', len: 64, count: 3, first: [['clanker', 5], ['drone', 2]], vote: true,
      enter: [['halo', 'My CITY! I built that block by HAND! With tiny little HANDS!', { mood: 'furious' }]] },
    { type: 'city', len: 64, count: 4, first: [['clanker', 5], ['drone', 3], ['shield', 2]],
      enter: [['iris', 'Downtown. Four towers. He\'s warming up the other mech — I can hear it on the channel.', {}]],
      clear: [['halo', 'You flattened DOWNTOWN. Do you know how long downtown takes to SET DRESS?!', { mood: 'furious' }, 3.5]] },
    { type: 'boss', len: 64, boss: 'halotron', objective: 'DEFEAT HALO-TRON', sub: 'speakers first, then the screen', hint: 'HALO-TRON: break the pink speakers · jump the beam · jump the shockwave', music: 'boss',
      enter: [['halo', 'HALO-TRON IS ONLINE! Me! In a mech! Piloted by me! Two of me! Ratings: DOUBLE!', { mood: 'gleeful' }]],
      clear: [['halo', 'My mech... my beautiful... I am going to need... a moment... a moment... a mo—', { mood: 'furious' }, 3.5], ['iris', 'That\'s the end of Act Two\'s sets. Everything above here is the real tower. No more painted skylines.', {}, 4.5]] },
  ],
  outro: [['iris', 'Step out of the mech at the elevator. Where we\'re going, it won\'t fit.', {}, 3.5]],
  exitLines: [['halo', 'MECH CITY... COMPLETE. City: flattened. Mech: stolen. Host: fine. Host is FINE.', { mood: 'nervous' }]],
  elevatorLines: [['halo', 'Floor Twenty-Three! MECH CITY! Please mind the tiny people! They are made of glass and lawsuits!', 0.6], ['iris', 'When the doors open, you\'ll be the mech. Enjoy it.', 4.6]],
  elevatorDur: 8, scoreTarget: 26000,
  completeLine: 'Floors twenty-four and up are being... rebuilt. Stay tuned!',
  votePool: ['barrels', 'doublebots', 'meteors', 'lowgrav', 'firestorm'],
});
