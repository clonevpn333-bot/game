// FLOORS 2, 3, 5, 6, 7 — the first batch built on the procedural floor system (see proc.js).
// Story thread for this stretch: the "cleanup crews", the contestant lockers (98 is welded shut),
// the viewers that all come from one server, and the archive where every winner is "RETAINED".
import { makeFloor } from './proc.js';

const SMG_GIFT = { weapon: 'smg', label: 'AD-BREAK SMG', z: 6, pos: [-6, 1.2], hint: 'AD-BREAK SMG: hold <span class="key">LMB</span> · one-handed, so keep moving', line: ['halo', 'The AD-BREAK SMG! Brought to you by me. Everything is brought to you by me.', { mood: 'gleeful' }] };
const LAUNCHER_GIFT = { weapon: 'launcher', label: 'CONFETTI CANNON', z: 6, pos: [6, 1.2], hint: 'CONFETTI CANNON: lobbed party bombs · mind the splash', line: ['halo', 'The CONFETTI CANNON! It fires celebrations. Violently.', { mood: 'gleeful' }] };

// ------------------------------------------------------------------ FLOOR 2
export const FLOOR_2 = makeFloor({
  id: 2, name: 'THE CLEANUP CREW', sign: 'FLOOR 02 · SERVICE LEVEL', theme: 'backstage', tagline: 'Closed for cleaning. Reopened for violence.',
  introObjective: 'SURVIVE THE CLEANUP CREW',
  intro: [
    ['halo', 'Floor Two! Normally closed for cleaning. Today we are cleaning... YOU! Kidding. Mostly.', { mood: 'gleeful' }],
    ['iris', 'Service level. Nobody films down here. Which means nobody watches what the crews do.', {}, 3],
  ],
  rooms: [
    { type: 'arena', len: 34, waves: [[['clanker', 3]], [['clanker', 2], ['drone', 2]]], gift: SMG_GIFT,
      enter: [['halo', 'Meet the cleanup crew! They mop, they polish, they shoot. Union rules.', { mood: 'happy' }]],
      clear: [['iris', 'Those weren\'t janitors. Cleaners don\'t carry rifles.', {}, 3]] },
    { type: 'lasers', len: 30, modes: ['low', 'high', 'sweepZ', 'low', 'blink'],
      enter: [['halo', 'Security sweep! Please hold still while the lasers decide how much they like you.', { mood: 'gleeful' }]] },
    { type: 'targets', len: 38, count: 3, label: 'SCRUB-O-MATIC', color: '#3dff9a', first: [['clanker', 3]], reinforce: [['clanker', 2]], vote: true,
      enter: [['iris', 'Those cleaning stations. Look at the drains — that\'s not soap. Break them.', {}]],
      clear: [['iris', 'Scorch marks under the floor grates. Ninety-eight sets of them. They clean up after every season.', {}, 4.5], ['halo', 'Iris? IRIS? Who let the engineer on the radio?! ...Ha! Technical difficulties, folks!', { mood: 'nervous' }, 3.5]] },
  ],
  outro: [['halo', 'Spotless! Mostly. Elevator\'s that way, Ninety-Nine!', { mood: 'happy' }, 2.5]],
  exitLines: [['halo', 'FLOOR TWO... COMPLETE! The cleanup crew has been cleaned up! Irony!', { mood: 'gleeful' }], ['iris', 'One more floor and you hit the factory. Get some ammo.', {}]],
  elevatorLines: [['halo', 'Going down? No! Going UP! Floor Two, the SERVICE LEVEL!', 0.6], ['iris', 'Stay off the open channel. I\'ll talk when the cameras cut.', 4.2]],
  scoreTarget: 7000, rewards: [{ type: 'weapon', id: 'smg', label: 'AD-BREAK SMG' }],
  completeLine: 'Floor Three next: THE LOCKER ROOM! Wear deodorant!',
  votePool: ['barrels', 'lightsout', 'doublebots', 'freeze', 'lasers', 'lowgrav'],
});

// ------------------------------------------------------------------ FLOOR 3
export const FLOOR_3 = makeFloor({
  id: 3, name: 'THE LOCKER ROOM', sign: 'CONTESTANT LOCKERS 01–98', theme: 'lockers', tagline: 'Every contestant gets a locker. Nobody gets it back.',
  introObjective: 'GET THROUGH THE LOCKER ROOM',
  intro: [
    ['halo', 'The LOCKER ROOM! Every contestant gets one! Please do not open the others. Privacy is very important to the Halo family.', { mood: 'happy' }],
    ['iris', 'Ninety-eight lockers. They never cleared a single one.', {}, 3],
  ],
  rooms: [
    { type: 'arena', len: 34, waves: [[['clanker', 3], ['shield', 1]], [['clanker', 3], ['drone', 1]]],
      enter: [['halo', 'Ooh, a welcome party! I told them to bring towels. They brought guns. Close enough.', { mood: 'gleeful' }]] },
    { type: 'lasers', len: 32, modes: ['blink', 'low', 'spin', 'high', 'sweepZ'],
      enter: [['iris', 'Shower block\'s rigged. Jump the low beams, slide the high ones.', {}]] },
    { type: 'hold', len: 34, time: 22, radius: 4.5, objective: 'WARDROBE CHECK', first: [['clanker', 3]], every: 6, vote: true,
      enter: [['halo', 'WARDROBE CHECK! Stand in the light and look fabulous for twenty seconds! The robots will judge.', { mood: 'gleeful' }]],
      clear: [['iris', 'Locker ninety-eight is welded shut. From the inside, it looks like. ...Keep moving.', {}, 4]] },
    { type: 'arena', len: 36, catwalks: true, waves: [[['bruiser', 1], ['clanker', 2]], [['clanker', 3], ['drone', 2]]], music: 'disaster',
      enter: [['halo', 'Let us meet our BRUISER! He benches four contestants. Simultaneously.', { mood: 'gleeful' }]],
      clear: [['halo', 'You beat the Bruiser?! He had a CONTRACT!', { mood: 'annoyed' }, 3]] },
  ],
  outro: [['iris', 'Elevator. The factory\'s next — that\'s where they build everything that\'s been shooting at you.', {}, 4]],
  exitLines: [['halo', 'FLOOR THREE... COMPLETE! Your locker is ready whenever you are! Forever!', { mood: 'gleeful' }]],
  elevatorLines: [['halo', 'Floor Three! The LOCKER ROOM! Smells like victory. And fear.', 0.6], ['iris', 'Lockers are numbered by contestant. Don\'t look at the high numbers.', 4.4]],
  scoreTarget: 9000,
  completeLine: 'Floor Four: THE FACTORY! Mind the machinery!',
  votePool: ['barrels', 'lightsout', 'doublebots', 'freeze', 'lasers', 'lowgrav', 'meteors'],
});

// ------------------------------------------------------------------ FLOOR 5
export const FLOOR_5 = makeFloor({
  id: 5, name: 'THE FLOOR IS LAVA', sign: 'THE FLOOR IS LAVA!', theme: 'showfloor', tagline: 'A game-show classic. The lava is real. Legal made us say that.',
  introObjective: 'DON\'T TOUCH THE FLOOR',
  intro: [
    ['halo', 'It\'s a game-show CLASSIC! THE FLOOR IS LAVA! Except — fun twist — the lava is real!', { mood: 'gleeful' }],
    ['iris', 'Grapple rings over the pit. And the moving platforms are on a timer — don\'t wait on them.', {}, 3.5],
  ],
  rooms: [
    { type: 'lava', len: 38, movers: 2,
      enter: [['halo', 'Contestants who touch the floor will be... toasted! Lightly! Golden brown!', { mood: 'gleeful' }]] },
    { type: 'arena', len: 34, waves: [[['clanker', 3], ['drone', 2]], [['shield', 2], ['clanker', 2]]], gift: LAUNCHER_GIFT, vote: true,
      enter: [['halo', 'INTERMISSION! A word from our sponsors! The sponsors are robots! With guns!', { mood: 'happy' }]] },
    { type: 'lava', len: 46, movers: 3, waves: [[['drone', 2]]],
      enter: [['iris', 'Drones over the pit. Shoot them before they knock you off.', {}]] },
    { type: 'hold', len: 32, time: 20, objective: 'TAKE A BOW', first: [['clanker', 2], ['shield', 1]], every: 5,
      enter: [['halo', 'Stand on the winner\'s spot and take a bow! The audience insists! The robots insist harder!', { mood: 'gleeful' }]],
      clear: [['iris', 'You know the audience votes never change when the feed is down? Same numbers. Every time.', {}, 4]] },
  ],
  outro: [['halo', 'Not one toe in the lava! Disgusting. I mean — DELIGHTFUL!', { mood: 'annoyed' }, 3]],
  exitLines: [['halo', 'FLOOR FIVE... COMPLETE! Somebody tell the lava it lost.', { mood: 'gleeful' }]],
  elevatorLines: [['halo', 'Floor Five! Remember: the floor is lava! The walls are also lava! Kidding! ...Probably.', 0.6], ['iris', 'Fire sprinklers on that floor are decorative. I checked.', 4.8]],
  scoreTarget: 10000, rewards: [{ type: 'weapon', id: 'launcher', label: 'CONFETTI CANNON' }],
  completeLine: 'Floor Six: the NEON DISTRICT! Shop till you drop! Literally!',
  votePool: ['barrels', 'lightsout', 'doublebots', 'freeze', 'lowgrav', 'meteors', 'firestorm'],
});

// ------------------------------------------------------------------ FLOOR 6
export const FLOOR_6 = makeFloor({
  id: 6, name: 'NEON DISTRICT', sign: 'NEON DISTRICT · ALL ADS ALL DAY', theme: 'neon', tagline: 'Sponsors, billboards, and a lot of very loud robots.', width: 40,
  introObjective: 'TAKE THE DISTRICT',
  intro: [
    ['halo', 'Welcome to the NEON DISTRICT! Every billboard paid for your survival! Please look at them while you die!', { mood: 'gleeful' }],
    ['iris', 'Those ad towers relay the broadcast. Every one you break gives me more of the network.', {}, 3.5],
  ],
  rooms: [
    { type: 'arena', len: 38, waves: [[['clanker', 4]], [['clanker', 2], ['shield', 1], ['drone', 2]]], vote: true,
      enter: [['halo', 'Rush hour in the district! Mind the traffic! The traffic is armed!', { mood: 'happy' }]] },
    { type: 'targets', len: 40, count: 3, label: 'AD TOWER', shape: 'screen', color: '#ff2d6f', hp: 420, first: [['clanker', 3], ['drone', 1]], reinforce: [['shield', 1], ['clanker', 2]],
      enter: [['halo', 'Don\'t you DARE touch the ad towers! Those are our REVENUE!', { mood: 'furious' }]],
      clear: [['iris', 'Got it. The viewer messages on those boards? All from one server. Same address. Every single one.', {}, 4.5], ['halo', 'Our viewers are REAL, and they LOVE me!', { mood: 'nervous' }, 3]] },
    { type: 'lasers', len: 32, modes: ['spin', 'sweepZ', 'blink', 'spin', 'low'],
      enter: [['halo', 'The laser light show! Absolutely free! Like most things here, it kills you.', { mood: 'gleeful' }]] },
    { type: 'arena', len: 40, catwalks: true, waves: [[['bruiser', 1], ['shield', 2]], [['clanker', 3], ['drone', 2], ['stalker', 1]]], music: 'disaster', vote: true,
      enter: [['halo', 'Main event! Our BRUISER and his very good friends!', { mood: 'gleeful' }]] },
  ],
  outro: [['iris', 'With those relays down I can hear the network. Something above us is listening to every vote.', {}, 4]],
  exitLines: [['halo', 'FLOOR SIX... COMPLETE! The sponsors would like a word. Several words. Mostly legal ones.', { mood: 'annoyed' }]],
  elevatorLines: [['halo', 'Floor Six! The NEON DISTRICT! Bring your wallet. Leave your hopes.', 0.6], ['iris', 'Lot of signal noise on that floor. Good. Noise means I can hide.', 4.6]],
  scoreTarget: 12000,
  completeLine: 'Floor Seven: the ARCHIVE! Quiet, please!',
  votePool: ['barrels', 'lightsout', 'doublebots', 'freeze', 'lasers', 'meteors', 'firestorm', 'lowgrav'],
});

// ------------------------------------------------------------------ FLOOR 7
export const FLOOR_7 = makeFloor({
  id: 7, name: 'THE ARCHIVE', sign: 'RECORDS · AUTHORIZED STAFF ONLY', theme: 'archive', tagline: 'Every contestant has a file. Every file says the same thing.', ceiling: 12,
  introObjective: 'FIND THE CONTESTANT FILES', ambience: null,
  intro: [
    ['halo', 'Ah. The ARCHIVE. This floor is not on today\'s schedule. How did the elevator... never mind! Enjoy the shelves!', { mood: 'nervous' }],
    ['iris', 'I routed you here. The contestant records are on this floor. All of them.', {}, 3.5],
  ],
  rooms: [
    { type: 'arena', len: 36, cover: 1.4, waves: [[['stalker', 2], ['clanker', 2]], [['stalker', 2], ['drone', 2]]],
      enter: [['iris', 'Stalkers. They hunt by sound. Keep moving and keep shooting.', {}]] },
    { type: 'targets', len: 38, count: 3, label: 'DATA VAULT', color: '#ffb060', first: [['clanker', 3]], reinforce: [['stalker', 1], ['clanker', 1]],
      enter: [['iris', 'Crack the vaults. I\'ll pull the files while they\'re open.', {}]],
      clear: [['iris', 'Contestant files... one through ninety-eight. Every status field says the same word. RETAINED.', {}, 4.5]] },
    { type: 'hold', len: 34, time: 25, objective: 'DOWNLOAD IN PROGRESS', first: [['stalker', 2], ['clanker', 2]], every: 5, maxAlive: 7,
      enter: [['iris', 'Stand at the terminal. I need twenty-five seconds — don\'t let them unplug you.', {}]],
      clear: [['halo', 'That data is PRIVATE! The Halo family has a strict privacy policy! It is: MINE!', { mood: 'furious' }, 3.5]] },
    { type: 'arena', len: 36, cover: 1.2, waves: [[['bruiser', 1], ['stalker', 2]], [['clanker', 3], ['shield', 2], ['drone', 1]]], music: 'disaster', vote: true,
      enter: [['halo', 'You want to read the files? Then you can JOIN them!', { mood: 'furious' }]] },
  ],
  outro: [['iris', 'Retained. Not released. Not deceased. Retained. ...What does a game show retain?', {}, 4.5]],
  exitLines: [['halo', 'FLOOR SEVEN... complete. Let us all agree that we did NOT see anything in there.', { mood: 'nervous' }], ['iris', 'I saw it. Floors eight to eleven are locked — I\'m sending you straight to the aquarium.', {}]],
  elevatorLines: [['halo', 'Floor Seven? That floor is closed! Who pressed seven?!', 0.6], ['iris', 'I did. Don\'t tell him.', 3.4]],
  scoreTarget: 13000,
  completeLine: 'Next stop: Floor Twelve. The aquarium! Pack a towel!',
  votePool: ['barrels', 'lightsout', 'doublebots', 'freeze', 'meteors', 'lowgrav'],
});

export const BATCH01 = { 2: FLOOR_2, 3: FLOOR_3, 5: FLOOR_5, 6: FLOOR_6, 7: FLOOR_7 };
