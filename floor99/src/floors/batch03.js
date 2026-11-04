// FLOORS 14–18 — Act Two: the floors that keep the show running.
// Story thread: food grown for nobody (or for the "family"), a casino where one server places every
// bet, cryo pods that are all empty, a cooking show judged by Halo, and broadcast control, where the
// feed is cut every time a contestant "wins".
import { makeFloor } from './proc.js';

const ARC_GIFT = { weapon: 'arc', label: 'ARC CASTER', z: 6, pos: [0, 1.2], hint: 'ARC CASTER: every bolt chains to the next three robots — shoot into crowds', line: ['iris', 'Arc caster. Cold storage keeps the coils happy. Point it at a crowd.', {}] };

// ------------------------------------------------------------------ FLOOR 14
export const FLOOR_14 = makeFloor({
  id: 14, name: 'THE GREENHOUSE', sign: 'HYDROPONICS · FRESH FOR THE FAMILY', theme: 'garden', tagline: 'Fresh food grown for a crew that doesn\'t exist.',
  introObjective: 'GET THROUGH THE GREENHOUSE',
  intro: [
    ['halo', 'Welcome to the GREENHOUSE! Our contestants deserve the freshest greens! Forever and ever!', { mood: 'happy' }],
    ['iris', 'There\'s no crew above floor twelve. So who eats all this?', {}, 3.5],
  ],
  rooms: [
    { type: 'arena', len: 36, waves: [[['clanker', 3], ['drone', 2]], [['stalker', 2], ['clanker', 2]]],
      enter: [['halo', 'Gardeners! With hedge trimmers! And guns! Gardening has evolved!', { mood: 'gleeful' }]] },
    { type: 'lava', len: 40, movers: 2, liquid: 'acid', objective: 'CROSS THE NUTRIENT VAT', waves: [[['drone', 2]]],
      enter: [['iris', 'Nutrient vat. It\'s acid. Don\'t ask what it dissolves.', {}]] },
    { type: 'hold', len: 34, time: 22, objective: 'POLLINATION CYCLE', first: [['clanker', 2], ['drone', 2]], every: 5, vote: true,
      enter: [['halo', 'Stand under the grow-lights for the POLLINATION CYCLE! It\'s good for your skin! Probably!', { mood: 'gleeful' }]],
      clear: [['iris', 'Shipping manifest. Every crate goes to "THE FAMILY SUITES". There are no family suites on the floor plan.', {}, 4.5]] },
    { type: 'targets', len: 38, count: 3, label: 'IRRIGATION PUMP', color: '#7dff4f', first: [['clanker', 3]], reinforce: [['stalker', 1], ['clanker', 1]],
      enter: [['iris', 'Kill the pumps. If the plants die, someone upstairs goes hungry, and they\'ll have to come down to fix it.', {}]] },
  ],
  outro: [['halo', 'You killed my PLANTS?! What kind of monster kills PLANTS?!', { mood: 'furious' }, 3]],
  exitLines: [['halo', 'FLOOR FOURTEEN... COMPLETE! The salad bar is closed. Permanently. Thanks to YOU.', { mood: 'annoyed' }]],
  elevatorLines: [['halo', 'Floor Fourteen! The GREENHOUSE! Stop and smell the robots!', 0.6], ['iris', 'Acid vats on that floor. Watch your footing.', 4]],
  scoreTarget: 17000, completeLine: 'Floor Fifteen: the CASINO! Feeling lucky? You shouldn\'t!',
  votePool: ['barrels', 'lightsout', 'doublebots', 'freeze', 'lowgrav', 'meteors'],
});

// ------------------------------------------------------------------ FLOOR 15
export const FLOOR_15 = makeFloor({
  id: 15, name: 'THE HOUSE ALWAYS WINS', sign: 'HALO\'S CASINO · ODDS ON YOU: 1,000,000 TO 1', theme: 'casino', tagline: 'Place your bets. Every bet is against you.', width: 38,
  introObjective: 'BEAT THE HOUSE',
  intro: [
    ['halo', 'Welcome to HALO\'S CASINO! The odds on you surviving this floor are a million to one! I bet against you! Twice!', { mood: 'gleeful' }],
    ['iris', 'Check the betting board. Every bet is placed from one address — the server you smashed on thirteen. He rebuilt it in an hour.', {}, 4.5],
  ],
  rooms: [
    { type: 'arena', len: 36, waves: [[['clanker', 3], ['shield', 1]], [['clanker', 3], ['drone', 2]]], vote: true,
      enter: [['halo', 'The pit bosses! They take cash, chips, and contestants!', { mood: 'gleeful' }]] },
    { type: 'lava', len: 42, movers: 3, liquid: 'plasma', objective: 'CROSS THE HIGH-ROLLER PIT',
      enter: [['halo', 'The HIGH ROLLER PIT! One bad roll and you\'re vapour! Literally!', { mood: 'gleeful' }]] },
    { type: 'hold', len: 34, time: 25, objective: 'SPIN THE WHEEL', first: [['clanker', 3]], every: 5, vote: true,
      enter: [['halo', 'Spin the WHEEL! Stand on the jackpot for twenty-five seconds! The house would like you not to!', { mood: 'gleeful' }]],
      clear: [['iris', 'Payout records. Ninety-eight "jackpot winners". Every single payout went back to the house.', {}, 4]] },
    { type: 'arena', len: 40, catwalks: true, waves: [[['bruiser', 1], ['shield', 2]], [['bruiser', 1], ['clanker', 3], ['drone', 2]]], music: 'disaster', vote: true,
      enter: [['halo', 'Security to the floor! We have a CARD COUNTER! He is counting ROBOTS!', { mood: 'furious' }]] },
  ],
  outro: [['halo', 'Nobody beats the house! ...Ninety-Nine beat the house. Somebody fire the house.', { mood: 'annoyed' }, 3.5]],
  exitLines: [['halo', 'FLOOR FIFTEEN... COMPLETE! I owe me a fortune!', { mood: 'annoyed' }]],
  elevatorLines: [['halo', 'Floor Fifteen! The CASINO! Remember: gambling is fun when you win! You won\'t!', 0.6], ['iris', 'Plasma pit on that floor. Don\'t trust the movers to wait.', 4.4]],
  scoreTarget: 18000, completeLine: 'Floor Sixteen: COLD STORAGE! Bring a jacket!',
  votePool: ['barrels', 'lightsout', 'doublebots', 'freeze', 'lasers', 'meteors', 'firestorm'],
});

// ------------------------------------------------------------------ FLOOR 16
export const FLOOR_16 = makeFloor({
  id: 16, name: 'COLD STORAGE', sign: 'CRYO STORAGE · WINNERS ONLY', theme: 'freezer', tagline: 'Ninety-eight pods. Ninety-eight winners. Not one body.',
  introObjective: 'FIND THE WINNERS',
  intro: [
    ['halo', 'Ooh, chilly! This is where our WINNERS rest between seasons! Shh! Don\'t wake them!', { mood: 'happy' }],
    ['iris', 'Ice on the floor — you\'ll slide. Use it.', {}, 3],
  ],
  rooms: [
    { type: 'arena', len: 36, waves: [[['clanker', 4]], [['clanker', 2], ['shield', 2]]], gift: ARC_GIFT,
      enter: [['halo', 'Careful! The floor is slippery and so am I!', { mood: 'gleeful' }]] },
    { type: 'dark', len: 40, waves: [[['stalker', 3]]],
      enter: [['iris', 'Power\'s low in the pod rows. Flashlight on.', {}]],
      clear: [['iris', 'I checked the pods. They\'re empty. All of them. Pod ninety-eight too.', {}, 4]] },
    { type: 'turrets', len: 38, count: 4, first: [['clanker', 2], ['drone', 1]], vote: true,
      enter: [['halo', 'Cryo-security! They keep things COLD! Things like YOU!', { mood: 'gleeful' }]] },
    { type: 'hold', len: 34, time: 25, objective: 'THAW THE CONSOLE', first: [['stalker', 2], ['clanker', 2]], every: 5, maxAlive: 7,
      enter: [['iris', 'Stand by the console while it thaws. I want the storage logs.', {}]],
      clear: [['iris', 'Storage logs say "bodies: not retained. Minds: retained." ...They don\'t keep the winners. They keep what\'s in their heads.', {}, 5.5], ['halo', 'Iris, darling, stop reading other people\'s mail!', { mood: 'nervous' }, 3]] },
  ],
  outro: [['iris', 'Minds retained. I don\'t like where this is going.', {}, 3]],
  exitLines: [['halo', 'FLOOR SIXTEEN... COMPLETE! Nobody saw anything! Everything is FINE!', { mood: 'nervous' }]],
  elevatorLines: [['halo', 'Floor Sixteen! COLD STORAGE! Our winners are resting! Don\'t knock!', 0.6], ['iris', 'The pods are numbered like the lockers. One to ninety-eight.', 4.2]],
  scoreTarget: 18000, rewards: [{ type: 'weapon', id: 'arc', label: 'ARC CASTER' }],
  completeLine: 'Floor Seventeen: the STUDIO KITCHEN! Our cooking segment!',
  votePool: ['barrels', 'lightsout', 'doublebots', 'freeze', 'meteors', 'lowgrav'],
});

// ------------------------------------------------------------------ FLOOR 17
export const FLOOR_17 = makeFloor({
  id: 17, name: 'STUDIO KITCHEN', sign: 'COOKING WITH HALO · LIVE', theme: 'kitchen', tagline: 'Halo judges. The robots are the ingredients.',
  introObjective: 'WIN THE COOK-OFF',
  intro: [
    ['halo', 'It\'s COOKING WITH HALO! Today\'s recipe: Contestant Flambé! Just kidding! ...Unless?', { mood: 'gleeful' }],
    ['iris', 'Lighter floor. Take the breather. He\'s saving something for twenty.', {}, 3.5],
  ],
  rooms: [
    { type: 'conveyor', len: 38, lanes: 4, speed: 3.6, objective: 'THE SUSHI BELTS', waves: [[['drone', 2]]],
      enter: [['halo', 'The sushi belts! Fresh fish! Fresh presses! Fresh YOU!', { mood: 'gleeful' }]] },
    { type: 'arena', len: 36, waves: [[['clanker', 3], ['shield', 1]], [['clanker', 2], ['drone', 2], ['stalker', 1]]], vote: true,
      enter: [['halo', 'Meet my sous-chefs! Michelin-starred! Michelin-ARMED!', { mood: 'gleeful' }]] },
    { type: 'presses', len: 32, cols: 4, objective: 'THE TENDERIZERS',
      enter: [['halo', 'And now we TENDERIZE! Mind your fingers! And your everything else!', { mood: 'gleeful' }]] },
    { type: 'hold', len: 34, time: 20, objective: 'PLATING', first: [['clanker', 3], ['drone', 1]], every: 5, vote: true,
      enter: [['halo', 'PLATING! Stand on the pass for twenty seconds while I judge your presentation!', { mood: 'gleeful' }]],
      clear: [['halo', 'Presentation: ten. Taste: ten. Attitude: MINUS ONE MILLION!', { mood: 'annoyed' }, 3]] },
  ],
  outro: [['iris', 'Broadcast control is next. That\'s where they edit the show. And where they cut it.', {}, 4]],
  exitLines: [['halo', 'FLOOR SEVENTEEN... COMPLETE! Clean up your station! ...Never mind. Leave.', { mood: 'annoyed' }]],
  elevatorLines: [['halo', 'Floor Seventeen! COOKING WITH HALO! Wash your hands! Of everything!', 0.6], ['iris', 'Belts and presses again. Factory leftovers.', 4]],
  scoreTarget: 18000, completeLine: 'Floor Eighteen: BROADCAST CONTROL! Where the magic is edited!',
  votePool: ['barrels', 'lightsout', 'doublebots', 'freeze', 'firestorm', 'lowgrav'],
});

// ------------------------------------------------------------------ FLOOR 18
export const FLOOR_18 = makeFloor({
  id: 18, name: 'BROADCAST CONTROL', sign: 'BROADCAST CONTROL · ON AIR', theme: 'control', tagline: 'Where the show is edited. And where the feed is cut.', ceiling: 12,
  introObjective: 'TAKE BROADCAST CONTROL',
  intro: [
    ['halo', 'Broadcast Control! Where the magic happens! Please don\'t touch anything! Especially the big red button!', { mood: 'nervous' }],
    ['iris', 'Every screen in here is him. Break the transmitters and he goes blind for a minute.', {}, 3.5],
  ],
  rooms: [
    { type: 'turrets', len: 38, count: 4, first: [['clanker', 3]],
      enter: [['halo', 'Studio security! They LOVE live television!', { mood: 'gleeful' }]] },
    { type: 'targets', len: 40, count: 3, label: 'TRANSMITTER', color: '#25f4ff', hp: 480, first: [['clanker', 3], ['drone', 1]], reinforce: [['shield', 1], ['drone', 1]], vote: true,
      enter: [['halo', 'Do NOT touch the transmitters! Billions of people are WATCHING!', { mood: 'furious' }]],
      clear: [['iris', 'Found the edit logs. Every winner walks into a white room at the top of the tower. The feed cuts. Ninety-eight times.', {}, 5]] },
    { type: 'lasers', len: 32, modes: ['spin', 'blink', 'sweepZ', 'spin', 'high'],
      enter: [['halo', 'Firewall! A real one! With real fire! And lasers! It\'s a party!', { mood: 'gleeful' }]] },
    { type: 'arena', len: 40, catwalks: true, waves: [[['bruiser', 1], ['shield', 2], ['drone', 1]], [['bruiser', 1], ['stalker', 2], ['clanker', 3]]], music: 'disaster', vote: true,
      enter: [['halo', 'You want the feed? You want the TRUTH? Truth doesn\'t RATE, Ninety-Nine!', { mood: 'furious' }]] },
  ],
  outro: [['iris', 'Two floors to the end of the act. Whatever\'s in that white room, he doesn\'t want you to see it yet.', {}, 4.5]],
  exitLines: [['halo', 'FLOOR EIGHTEEN... COMPLETE! And... we\'re back! Nothing happened! Smile!', { mood: 'nervous' }]],
  elevatorLines: [['halo', 'Floor Eighteen! BROADCAST CONTROL! Smile, you\'re on every camera!', 0.6], ['iris', 'Turrets and transmitters. Then they\'ll send the big ones.', 4]],
  scoreTarget: 19000, completeLine: 'Floors nineteen and up are being... rehearsed. Stay tuned!',
  votePool: ['barrels', 'lightsout', 'doublebots', 'freeze', 'lasers', 'meteors'],
});
