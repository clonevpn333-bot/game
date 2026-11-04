// FLOORS 8, 9, 10, 11, 13 — second batch on the procedural floor system.
// Story thread: the boiler that powers the show ("retention furnace"), the camera-free vents where
// Iris finally talks, the Act One finale against Halo's body double, the security floor's camera
// logs (Floor 13 is hidden, not skipped), and the machine level where the "audience" is generated.
import { makeFloor } from './proc.js';

const BEAM_GIFT = { weapon: 'beam', label: 'PRIME-TIME SPOTLIGHT', z: 6, pos: [0, 1.2], hint: 'PRIME-TIME SPOTLIGHT: hold <span class="key">LMB</span> · a continuous beam that never misses its mark', line: ['halo', 'That is MY spotlight! Give it back! ...Fine, keep it. It suits you. I hate that it suits you.', { mood: 'annoyed' }] };

// ------------------------------------------------------------------ FLOOR 8
export const FLOOR_8 = makeFloor({
  id: 8, name: 'THE BOILER ROOM', sign: 'BOILER ROOM · POWER FOR THE SHOW', theme: 'boiler', tagline: 'Everything that lights the show burns down here.',
  introObjective: 'GET THROUGH THE BOILER ROOM',
  intro: [
    ['halo', 'Floor Eight! The BOILER ROOM! It\'s a sauna! Complimentary! Mandatory!', { mood: 'gleeful' }],
    ['iris', 'Every light on the show runs off what burns down here. Ride against the belts — they feed the furnace.', {}, 4],
  ],
  rooms: [
    { type: 'conveyor', len: 38, lanes: 3, speed: 3.2, waves: [[['drone', 2]]],
      enter: [['halo', 'The fuel line! Please keep your arms, legs and dignity inside the conveyor at all times!', { mood: 'gleeful' }]] },
    { type: 'arena', len: 36, waves: [[['clanker', 3], ['shield', 1]], [['clanker', 2], ['drone', 2], ['stalker', 1]]], vote: true,
      enter: [['iris', 'Furnace crew. Same model as the cleaners on two. Same job, really.', {}]] },
    { type: 'targets', len: 40, count: 3, label: 'PRESSURE VALVE', color: '#ff9a3a', first: [['clanker', 3]], reinforce: [['clanker', 1], ['shield', 1]],
      enter: [['iris', 'Blow the pressure valves. If the boiler vents, the studio lights flicker — and the cameras lose you for a second.', {}]],
      clear: [['halo', 'Who turned off the LIGHTS?! Stay tuned, folks! Technical difficulties! Totally normal difficulties!', { mood: 'nervous' }, 3.5], ['iris', 'There\'s a furnace door back there labelled RETENTION. Don\'t open it. Please.', {}, 4]] },
  ],
  outro: [['halo', 'The lights are back! And so are YOU! Wonderful. Wonderful wonderful wonderful.', { mood: 'annoyed' }, 3]],
  exitLines: [['halo', 'FLOOR EIGHT... COMPLETE! Somebody send the boiler a get-well card!', { mood: 'gleeful' }]],
  elevatorLines: [['halo', 'Floor Eight! Bring sunscreen! The indoor kind!', 0.6], ['iris', 'Hot floor. Steam jets fire on a timer — watch for the hiss.', 4]],
  scoreTarget: 13000, completeLine: 'Floor Nine: THE VENTS! Mind your head! And your everything!',
  votePool: ['barrels', 'lightsout', 'doublebots', 'freeze', 'meteors', 'firestorm'],
});

// ------------------------------------------------------------------ FLOOR 9
export const FLOOR_9 = makeFloor({
  id: 9, name: 'THE VENTS', sign: 'VENTILATION · NO CAMERAS', theme: 'vents', tagline: 'No cameras. No audience. No rules.', ceiling: 10,
  introObjective: 'CRAWL THROUGH THE VENTS',
  intro: [
    ['halo', 'Wait. Where is he? Camera three? Camera FOUR? Why is my feed BLACK?!', { mood: 'nervous' }],
    ['iris', 'No cameras in the ducts. For once, he can\'t see you. Let\'s talk.', {}, 3.5],
  ],
  rooms: [
    { type: 'dark', len: 40, waves: [[['stalker', 3]]],
      enter: [['iris', 'Stalkers live in the ducts. They hunt by sound. Use the flashlight; follow the arrows.', {}]],
      clear: [['iris', 'I built the presses on four. The tanks on twelve. I thought I was building a game show.', {}, 4]] },
    { type: 'arena', len: 34, waves: [[['drone', 3]], [['drone', 2], ['clanker', 2]]],
      enter: [['halo', 'THERE you are! Don\'t DO that! The audience was worried sick! Statistically!', { mood: 'annoyed' }]] },
    { type: 'dark', len: 46, waves: [[['stalker', 3], ['clanker', 1]]],
      enter: [['iris', 'Dark again. Good. I had a brother. He signed up for season ninety-eight.', {}]],
      clear: [['iris', 'I came here to find him. That\'s all you need to know for now.', {}, 3.5]] },
    { type: 'lasers', len: 32, modes: ['blink', 'low', 'sweepZ', 'high', 'blink'],
      enter: [['halo', 'Exit lasers! A safety feature! For our safety! From you!', { mood: 'gleeful' }]] },
  ],
  outro: [['halo', 'Next floor is our ACT ONE FINALE, Ninety-Nine. I\'ve invited someone VERY special.', { mood: 'gleeful' }, 4]],
  exitLines: [['halo', 'FLOOR NINE... complete. And back on camera, where you BELONG.', { mood: 'annoyed' }]],
  elevatorLines: [['halo', 'Floor Nine: the VENTS! Cozy! Dark! Full of things!', 0.6], ['iris', 'When the feed drops, talk to me. Not before.', 4]],
  scoreTarget: 13000, completeLine: 'Floor Ten: our ACT ONE FINALE! Dress nicely!',
  votePool: ['barrels', 'doublebots', 'freeze', 'lowgrav', 'lasers'],
});

// ------------------------------------------------------------------ FLOOR 10
export const FLOOR_10 = makeFloor({
  id: 10, name: 'ACT ONE FINALE', sign: 'ACT ONE · FINALE', theme: 'finale', tagline: 'Halo\'s body double takes the stage.', width: 40, ceiling: 18,
  introObjective: 'GIVE THEM A FINALE',
  intro: [
    ['halo', 'Ladies, gentlemen and algorithms — it is our ACT ONE FINALE! Live! From the main stage!', { mood: 'gleeful' }],
    ['iris', 'Full studio. Full lighting. Whatever he\'s planned, he wants everyone watching.', {}, 3.5],
  ],
  rooms: [
    { type: 'arena', len: 36, waves: [[['clanker', 3], ['drone', 2]], [['shield', 2], ['clanker', 3]]], vote: true,
      enter: [['halo', 'The warm-up act! Give it up for... robots! Again! The audience never tires of them!', { mood: 'happy' }]] },
    { type: 'hold', len: 34, time: 20, objective: 'THE CROWD WANTS A SHOW', first: [['clanker', 3], ['drone', 1]], every: 5, vote: true,
      enter: [['halo', 'Center stage, Ninety-Nine! The crowd wants a SHOW!', { mood: 'gleeful' }]] },
    { type: 'boss', len: 52, boss: 'cohost', objective: 'DEFEAT THE CO-HOST', sub: 'break the pink speakers, then shoot the screen', hint: 'Jump the LOW beam · slide under the HIGH beam · jump the shockwave ring', music: 'boss',
      enter: [['halo', 'And now... the moment you\'ve been waiting for... my CO-HOST! Everything I am, in a body that can PUNCH!', { mood: 'gleeful' }]],
      clear: [['halo', 'Co-hosts are... replaceable. I am... not... replaceable. I am NOT—', { mood: 'furious' }, 3.5], ['iris', 'Did you hear that? His voice changed. For a second it was someone else.', {}, 4]] },
  ],
  outro: [['iris', 'Elevator\'s open. Act Two starts upstairs. So does the part he doesn\'t broadcast.', {}, 4]],
  exitLines: [['halo', 'ACT ONE... COMPLETE! Ratings: historic! Mood: complicated! See you after the break!', { mood: 'gleeful' }]],
  elevatorLines: [['halo', 'Floor Ten! Our ACT ONE FINALE! I\'m not nervous! YOU\'RE nervous!', 0.6], ['iris', 'Whatever comes out on that stage, it has his voice. Remember that.', 4.2]],
  elevatorDur: 8,
  scoreTarget: 16000, rewards: [{ type: 'weapon', id: 'beam', label: 'PRIME-TIME SPOTLIGHT' }],
  completeLine: 'The PRIME-TIME SPOTLIGHT is yours. Act Two awaits!',
  votePool: ['barrels', 'doublebots', 'freeze', 'meteors', 'lowgrav', 'firestorm'],
});

// ------------------------------------------------------------------ FLOOR 11
export const FLOOR_11 = makeFloor({
  id: 11, name: 'SECURITY', sign: 'TOWER SECURITY · ALL CAMERAS', theme: 'security', tagline: 'Every camera in the tower routes through here.',
  introObjective: 'BREAK THE SECURITY FLOOR',
  intro: [
    ['halo', 'SECURITY! We have a contestant OFF SCRIPT! Repeat: OFF! SCRIPT!', { mood: 'furious' }],
    ['iris', 'Every camera in the tower routes through this floor. Kill the turrets and I can loop the feeds.', {}, 3.5],
  ],
  rooms: [
    { type: 'turrets', len: 38, count: 4, first: [['clanker', 2], ['shield', 1]], gift: BEAM_GIFT,
      enter: [['halo', 'Automated security! They never sleep! They never blink! They never miss! ...Often.', { mood: 'gleeful' }]] },
    { type: 'lasers', len: 32, modes: ['spin', 'low', 'high', 'blink', 'spin'],
      enter: [['iris', 'Lockdown grid. Same pattern as the showers on three — they reuse everything.', {}]] },
    { type: 'turrets', len: 40, count: 5, ceiling: true, first: [['clanker', 3], ['drone', 1]], vote: true,
      enter: [['halo', 'Ceiling turrets! Look up! No — don\'t look up! Look FABULOUS!', { mood: 'gleeful' }]],
      clear: [['iris', 'Camera logs are mine. Floor thirteen isn\'t in any of them. It isn\'t skipped. It\'s hidden.', {}, 4.5]] },
    { type: 'arena', len: 38, catwalks: true, waves: [[['bruiser', 1], ['shield', 2]], [['clanker', 3], ['drone', 2], ['stalker', 2]]], music: 'disaster', vote: true,
      enter: [['halo', 'The SECURITY CHIEF! He has a badge! And a grudge!', { mood: 'furious' }]] },
  ],
  outro: [['iris', 'Feeds are looping. As far as the tower knows, you\'re still in the elevator.', {}, 4]],
  exitLines: [['halo', 'FLOOR ELEVEN... complete. Security will be... reviewing its options.', { mood: 'annoyed' }], ['iris', 'Next stop\'s the aquarium. Then we go somewhere he doesn\'t want you to go.', {}]],
  elevatorLines: [['halo', 'Floor Eleven: SECURITY! Please have your contestant number ready! It\'s ninety-nine! We know!', 0.6], ['iris', 'Turrets track movement. Don\'t stand still.', 4.6]],
  scoreTarget: 15000, completeLine: 'Floor Twelve: the AQUARIUM! Pack a towel!',
  votePool: ['barrels', 'lightsout', 'doublebots', 'freeze', 'lasers', 'meteors'],
});

// ------------------------------------------------------------------ FLOOR 13
export const FLOOR_13 = makeFloor({
  id: 13, name: 'THE MACHINE LEVEL', sign: 'FLOOR 13 · DOES NOT EXIST', theme: 'servers', tagline: 'Billions of viewers. All of them on these racks.', ceiling: 12,
  introObjective: 'FIND OUT WHAT FLOOR 13 IS',
  intro: [
    ['halo', 'Floor Thirteen does not EXIST! This is a... server room! For... ratings! Turn around!', { mood: 'nervous' }],
    ['iris', 'I looped the elevator logs. He can see you. He just can\'t stop you.', {}, 3.5],
  ],
  rooms: [
    { type: 'arena', len: 36, waves: [[['drone', 3], ['clanker', 2]], [['drone', 2], ['shield', 2]]],
      enter: [['iris', 'Listen to it. Every rack is talking. That\'s not cooling fans — that\'s the audience.', {}]] },
    { type: 'targets', len: 40, count: 3, label: 'VOTE SERVER', color: '#25f4ff', hp: 460, first: [['clanker', 3], ['drone', 1]], reinforce: [['drone', 2]], vote: true,
      enter: [['halo', 'Do NOT touch the vote servers! Democracy is FRAGILE!', { mood: 'furious' }]],
      clear: [['iris', 'The votes are generated here. Billions of "viewers", every one of them running on these racks.', {}, 4.5]] },
    { type: 'hold', len: 34, time: 25, objective: 'UPLOAD IN PROGRESS', first: [['drone', 2], ['clanker', 2]], every: 5, maxAlive: 7,
      enter: [['iris', 'Hold the terminal. I\'m pulling the training logs.', {}]],
      clear: [['iris', 'It\'s not counting votes. It\'s training something. Every vote, every cheer, every death — teaching it what an audience wants.', {}, 5]] },
    { type: 'arena', len: 38, catwalks: true, waves: [[['bruiser', 1], ['drone', 2]], [['stalker', 2], ['clanker', 3], ['shield', 1]]], music: 'disaster',
      enter: [['halo', 'You want to see how the show is made? Then you can BE the show. Forever. Like the others.', { mood: 'furious' }]] },
  ],
  outro: [['halo', 'You are going to be a WONDERFUL addition to the family, Ninety-Nine.', { mood: 'gleeful' }, 3.5]],
  exitLines: [['iris', 'Whatever they\'re training, it\'s upstairs. Every floor from here gets closer to it.', {}], ['halo', 'FLOOR... THIRTEEN... never happened. Smile for the camera!', { mood: 'nervous' }]],
  elevatorLines: [['halo', 'Floor... Thirteen? We don\'t have a Floor Thirteen. Why is the button lit?', 0.6], ['iris', 'Because I lit it.', 3.6]],
  elevatorDur: 8, scoreTarget: 17000,
  completeLine: 'Floor Fourteen: the GREENHOUSE! Stop and smell the robots!',
  votePool: ['barrels', 'lightsout', 'doublebots', 'freeze', 'lasers', 'meteors', 'lowgrav'],
});
