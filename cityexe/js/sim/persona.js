// Personalities. Every citizen has a stable personality derived from their id and
// their simulated traits (no extra save data): Big Five scores, an archetype,
// interests and pet peeves, quirks, how they talk, where they came from, what
// they want out of life. Dialogue draws on all of it plus their mood, money,
// job, relationships and what happened to them recently.
import { hash01 } from '../core/rng.js';
import { clamp } from '../core/math.js';

const pickH = (arr, id, salt) => arr[Math.floor(hash01(id, salt) * arr.length) % arr.length];
const pickN = (arr, n, id, salt) => {
  const out = [];
  for (let i = 0; out.length < n && i < 40; i++) { const v = pickH(arr, id, salt + i * 7); if (!out.includes(v)) out.push(v); }
  return out;
};

export const INTERESTS = ['jazz records', 'basketball', 'cooking', 'video games', 'street photography', 'gardening', 'old cars', 'fishing', 'fashion', 'true-crime podcasts', 'stand-up comedy', 'chess', 'hiking', 'horror movies', 'poetry', 'boxing', 'astronomy', 'baking', 'vinyl hunting', 'tattoos', 'skateboarding', 'karaoke', 'history books', 'crypto', 'yoga', 'anime', 'dancing', 'sneakers', 'board games', 'birdwatching', 'motorcycles', 'thrift shopping', 'soccer', 'conspiracy forums', 'painting', 'wine', 'running', 'reality TV', 'woodworking', 'poker'];
const PEEVES = ['loud chewers', 'people who are late', 'bad tippers', 'small talk', 'slow walkers', 'landlords', 'rich people', 'cops', 'pineapple on pizza', 'the bus schedule', 'politicians', 'noisy neighbours', 'people on their phones', 'Mondays', 'the cold', 'tourists', 'gym bros', 'snobs', 'liars', 'traffic'];
const QUIRKS = ['hums when nervous', 'collects bottle caps', 'never sits with their back to a door', 'names every houseplant', 'talks to pigeons', 'quotes old movies', 'always carries snacks', 'checks the weather twice an hour', 'cannot whistle', 'keeps a dream journal', 'is terrified of escalators', 'has an encyclopedic memory for licence plates', 'tips 30% everywhere', 'reads the last page first', 'refuses to use elevators', 'mispronounces "espresso" on purpose', 'laughs at their own jokes before the punchline', 'knows every bus driver by name', 'wears sunglasses indoors', 'counts stairs'];
const HOMETOWNS = ['on a farm three hours north', 'on the coast', 'right here in the city', 'in a mining town nobody has heard of', 'overseas', 'in the suburbs', 'all over, in a military family that moved every two years', 'in a fishing village', 'in a big city out east', 'out in the desert', 'in a college town', 'up in the mountains'];
const WHY = ['for a job that fell through', 'chasing a girlfriend who left', 'to start over', 'for school', 'because it was the cheapest bus ticket', 'to be near family', 'for the music scene', 'to get away from a small town', 'after a divorce', 'with nothing but a suitcase', 'for a factory job', 'on a dare'];
const DREAMS = ['open their own restaurant', 'see the ocean again', 'buy a house in Maple Heights', 'retire early', 'become famous', 'pay off their debts', 'travel the world', 'start a band', 'write a novel', 'get out of this city', 'raise a big family', 'run for mayor', 'own a sports car', 'win the lottery', 'make their parents proud', 'just sleep in for once', 'open a tattoo parlour', 'become a detective'];
const MUSIC = ['jazz', 'hip-hop', 'country', 'metal', 'classical', 'house music', 'old soul', 'punk', 'pop', 'R&B', 'synthwave', 'folk', 'reggaeton', 'blues'];
const VALUES = ['family', 'money', 'freedom', 'loyalty', 'honesty', 'fun', 'respect', 'security', 'adventure', 'faith', 'success', 'friendship'];

const ARCHETYPES = [
  // [label, test(b5, t)]
  ['Social butterfly', (b) => b.E > 0.75 && b.A > 0.55],
  ['Hustler', (b, t) => t.ambition > 0.75 && t.honesty < 0.5],
  ['Hothead', (b) => b.N > 0.72 && b.A < 0.4],
  ['Bookworm', (b) => b.O > 0.7 && b.E < 0.35],
  ['Workaholic', (b, t) => b.C > 0.75 && t.ambition > 0.6],
  ['Free spirit', (b) => b.O > 0.72 && b.C < 0.4],
  ['Gentle soul', (b) => b.A > 0.78 && b.N < 0.5],
  ['Cynic', (b) => b.A < 0.3 && b.O < 0.5],
  ['Worrier', (b) => b.N > 0.75],
  ['Charmer', (b) => b.E > 0.65 && b.O > 0.55],
  ['Loner', (b) => b.E < 0.25],
  ['Steady hand', (b) => b.C > 0.65 && b.N < 0.35],
  ['Daydreamer', (b) => b.O > 0.6 && b.C < 0.5],
  ['Penny-pincher', (b, t) => t.thrift > 0.8],
  ['Thrill-seeker', (b, t) => t.caution < 0.2 && b.E > 0.5],
];

const STYLE = {
  warm: { hi: ['Hey, you!', 'Oh, hi there!', 'Well, look who it is!', 'Hi! How are you doing?'], yes: ['Aw, I love that.', 'That made my day.', 'You\'re sweet.'], no: ['Oh... okay.', 'That\'s a bit much.', 'Hm, I don\'t know about that.'] },
  blunt: { hi: ['Yeah?', 'What.', 'Hey.', 'You need something?'], yes: ['Fine. That\'s decent.', 'Huh. Not bad.', 'Okay, you\'re alright.'], no: ['No.', 'Don\'t push it.', 'Not interested.'] },
  slang: { hi: ['Yo, what\'s good?', 'Ayy, what\'s up!', 'Sup.', 'Look who pulled up!'], yes: ['Ayy, respect.', 'That\'s hard, I fw that.', 'Bet, bet.'], no: ['Nah, that ain\'t it.', 'You buggin\'.', 'Chill, chill.'] },
  formal: { hi: ['Good day.', 'Hello. Can I help you?', 'Pleasure to see you.', 'Ah, hello.'], yes: ['How kind of you.', 'I appreciate that.', 'That is very thoughtful.'], no: ['I\'d rather not.', 'That\'s inappropriate.', 'I must decline.'] },
  nervous: { hi: ['Oh! Um, hi.', 'H-hello?', 'Oh, sorry, hi.', 'Hi... do I know you?'], yes: ['Oh! Wow, thank you.', 'Really? That\'s, um, nice.', 'Haha, thanks...'], no: ['Oh no, I, um, no.', 'S-sorry, no.', 'I don\'t think so...'] },
  dramatic: { hi: ['Darling!', 'Finally, someone interesting!', 'Oh, it\'s YOU.', 'The legend arrives!'], yes: ['Stop it, you\'re making me blush!', 'Iconic. Truly.', 'I could kiss you!'], no: ['How DARE you.', 'I am wounded.', 'Absolutely not, the nerve!'] },
};

const cache = new Map();

export function persona(c) {
  let P = cache.get(c.id);
  if (P && P.v === c.traits) return P;
  const id = c.id + 1;
  const t = c.traits;
  const n = (s) => hash01(id, s);
  const B = {
    O: clamp(t.curiosity * 0.7 + n(1) * 0.3, 0, 1),
    C: clamp((t.ambition + t.caution) * 0.4 + n(2) * 0.2, 0, 1),
    E: clamp(t.social * 0.75 + n(3) * 0.25, 0, 1),
    A: clamp(t.honesty * 0.55 + (1 - t.ambition) * 0.15 + n(4) * 0.3, 0, 1),
    N: clamp((1 - t.caution) * 0.25 + n(5) * 0.75, 0, 1),
  };
  let arch = 'Ordinary soul';
  for (const [label, test] of ARCHETYPES) if (test(B, t)) { arch = label; break; }
  const style = B.E > 0.8 && B.O > 0.6 ? 'dramatic' : B.N > 0.75 && B.E < 0.45 ? 'nervous' : B.A < 0.35 ? 'blunt' : c.age < 30 && n(6) < 0.6 ? 'slang' : c.age > 55 || B.C > 0.8 ? 'formal' : 'warm';
  P = {
    v: t, big5: B, archetype: arch, style,
    likes: pickN(INTERESTS, 3, id, 10), peeves: pickN(PEEVES, 2, id, 30), quirk: pickH(QUIRKS, id, 50),
    hometown: pickH(HOMETOWNS, id, 60), why: pickH(WHY, id, 61), dream: pickH(DREAMS, id, 62), music: pickH(MUSIC, id, 63), value: pickH(VALUES, id, 64),
    temper: B.N * 0.6 + (1 - B.A) * 0.4, romance: clamp(B.E * 0.5 + B.O * 0.3 + n(7) * 0.4, 0, 1), humor: clamp(B.E * 0.4 + B.O * 0.4 + n(8) * 0.3, 0, 1),
    faith: n(9) < 0.35, smoker: n(11) < 0.18, drinker: n(12) < 0.3 + B.E * 0.2, pets: n(13) < 0.4 ? pickH(['a cat named Biscuit', 'an old dog', 'two goldfish', 'a parrot that swears', 'a rescue greyhound', 'a lizard'], id, 14) : null,
  };
  // the dark side a few people hide: rare, and mostly invisible until it isn't
  const dk = n(15), lowH = 1 - t.honesty;
  P.dark = dk < 0.004 + lowH * 0.004 ? 'killer' : dk < 0.014 + lowH * 0.01 ? 'stalker' : dk < 0.03 + lowH * 0.02 ? 'con artist' : dk < 0.036 + lowH * 0.01 ? 'arsonist' : dk < 0.06 + lowH * 0.03 && P.temper > 0.55 ? 'violent' : null;
  cache.set(c.id, P);
  return P;
}

export function personaSummary(c) {
  const P = persona(c);
  const traitWords = [];
  const B = P.big5;
  if (B.E > 0.7) traitWords.push('outgoing'); else if (B.E < 0.3) traitWords.push('reserved');
  if (B.A > 0.7) traitWords.push('kind'); else if (B.A < 0.3) traitWords.push('prickly');
  if (B.C > 0.7) traitWords.push('disciplined'); else if (B.C < 0.3) traitWords.push('scattered');
  if (B.O > 0.7) traitWords.push('curious'); else if (B.O < 0.3) traitWords.push('set in their ways');
  if (B.N > 0.7) traitWords.push('anxious'); else if (B.N < 0.3) traitWords.push('unflappable');
  return {
    archetype: P.archetype, traits: traitWords, likes: P.likes, peeves: P.peeves, quirk: P.quirk, music: P.music,
    backstory: `${P.hometown === 'right here in the city' ? 'Born and raised in the city' : `Grew up ${P.hometown} and came to the city ${P.why}`}. Dreams of being able to ${P.dream}. Values ${P.value} above all.`,
    pets: P.pets,
  };
}

// ---------------------------------------------------------------- dialogue
// topic: greet | chat | joke | compliment | flirt | insult | ask_money | ask_life | ask_job | gossip | hangout | apologize
// returns { line, d (affinity change), mood }
export function talk(W, c, player, topic, rng = Math.random) {
  const P = persona(c);
  const S = STYLE[P.style];
  const rel = c.rel[player.id];
  const aff = rel ? rel.a : 0;
  const pick = (a) => a[Math.floor(rng() * a.length)];
  const mood = c.happiness ?? 0.6;
  const B = P.big5;
  const pp = persona(player);
  const shared = P.likes.filter((x) => pp.likes.includes(x));
  const job = c.job ? (W.citizenAI.jobTitle(c)) : null;
  const recent = c.log.slice(-6).reverse().find((e) => e.major && W.time - e.t < 1440 * 4);
  let line = '', d = 0;
  switch (topic) {
    case 'greet': {
      line = aff > 0.6 ? pick(['Hey you! Good to see you.', 'There\'s my favourite person.', `${player.first}! What's going on?`]) : aff < -0.3 ? pick(['Oh. It\'s you.', 'What do you want?', '...']) : pick(S.hi);
      if (mood < 0.3) line += ' ' + pick(['Rough day, honestly.', 'Not the best week.', 'Don\'t ask how I\'m doing.']);
      break;
    }
    case 'chat': {
      const topics = [];
      topics.push(`I've been really into ${P.likes[0]} lately.`);
      if (shared.length) topics.push(`Wait, you're into ${shared[0]} too? No way!`);
      if (job) topics.push(c.working ? `Busy shift at ${W.economy.biz[c.job.biz]?.name || 'work'}.` : mood > 0.6 ? `Work's been alright. Being a ${job.toLowerCase()} has its moments.` : `Being a ${job.toLowerCase()} is wearing me down.`);
      else if (c.age < 66) topics.push(pick(['Still looking for work. It\'s brutal out there.', 'Between jobs right now. Know anyone hiring?']));
      topics.push(`Can't stand ${P.peeves[0]}, you know?`);
      if (P.pets) topics.push(`I've got ${P.pets} at home, they're my whole world.`);
      if (recent) topics.push(recent.text.startsWith('Lost') || recent.text.includes('fired') || recent.text.includes('Evicted') ? `Honestly? ${recent.text}. Still processing it.` : `Did you hear? ${recent.text}!`);
      topics.push(P.hometown === 'right here in the city' ? 'Born and raised here. I know every corner of this city.' : `I grew up ${P.hometown}. City's a whole different thing.`);
      if (W.weather.precip > 0.3) topics.push('This rain is not helping my mood.');
      line = pick(topics);
      d = 0.03 + (shared.length ? 0.05 : 0) + B.E * 0.02;
      break;
    }
    case 'joke': {
      const lands = rng() < 0.35 + P.humor * 0.5 + (aff > 0.3 ? 0.15 : 0);
      line = lands ? pick(['Hahaha! Okay, that was good.', 'Stop, I can\'t breathe!', 'Pfft. You\'re ridiculous.', 'Okay you got me, that\'s funny.']) : pick(['...I don\'t get it.', 'Was that supposed to be a joke?', 'Wow. Tough crowd, huh? Me, I\'m the tough crowd.', 'Yikes.']);
      d = lands ? 0.07 : -0.03;
      break;
    }
    case 'compliment': {
      const ok = B.A > 0.3 || aff > 0.2;
      line = ok ? pick(S.yes) : pick(['What are you after?', 'Flattery won\'t get you anywhere.', 'Uh-huh.']);
      d = ok ? 0.06 : 0;
      break;
    }
    case 'flirt': {
      const partner = W.citizenAI.partner(c);
      const ageOk = Math.abs(c.age - player.age) < 14 && c.age >= 18;
      const chance = (ageOk ? 0.25 : 0) + P.romance * 0.35 + aff * 0.35 - (partner ? 0.4 : 0) + (player.life?.looks ?? 0.5) * 0.2;
      const ok = rng() < chance;
      if (partner && partner.id === player.id) line = pick(['You\'re cute, you know that?', 'Stop, people are looking... don\'t stop.', 'Love you too.']);
      else if (ok) line = pick(['Oh? Well... aren\'t you smooth.', 'Haha, are you flirting with me?', 'Maybe you should buy me a drink sometime.', 'You\'re trouble. I like it.']);
      else line = partner ? pick([`I'm with ${partner.first}, sorry.`, 'I\'m taken, buddy.']) : pick(S.no);
      d = ok ? 0.1 : -0.06;
      break;
    }
    case 'insult': {
      const tough = P.temper > 0.6;
      line = tough ? pick(['Say that again. I dare you.', 'You want to go? Let\'s go.', 'Big mistake.']) : pick(['Wow. Okay.', 'Why would you say that?', 'That\'s really hurtful.']);
      d = -0.25 - P.temper * 0.1;
      break;
    }
    case 'ask_money': {
      const give = aff > 0.55 && c.money > 300 && rng() < 0.3 + (1 - P.big5.N) * 0.2 + (rel?.t === 'family' ? 0.35 : 0) - (W.citizens[c.id].traits.thrift * 0.3);
      if (give) { line = pick(['Fine, here. Pay me back.', 'Just this once.', 'Of course, don\'t worry about it.']); d = -0.04; }
      else { line = pick(['I\'m not a bank.', 'Can\'t, sorry. Money\'s tight.', 'Absolutely not.', 'Didn\'t you already borrow from me?']); d = -0.05; }
      return { line, d, give: give ? Math.round(Math.min(c.money * 0.15, 50 + aff * 450)) : 0 };
    }
    case 'ask_life': {
      line = pick([
        `Honestly? I want to ${P.dream}. One day.`,
        `I came here ${P.why}. Long story.`,
        `My friends say I'm the type who ${P.quirk}. They're not wrong.`,
        `I'm a big ${P.music} person. Can't live without it.`,
        `What matters most to me? ${P.value[0].toUpperCase() + P.value.slice(1)}. Always has been.`,
      ]);
      d = 0.05;
      break;
    }
    case 'ask_job': {
      if (!job || c.age >= 66) line = c.age >= 66 ? 'I\'m retired! Best job I ever had.' : 'Looking for work myself.';
      else {
        const biz = W.economy.biz[c.job.biz];
        const open = W.economy.openJobs((j) => j.biz === c.job.biz).length;
        line = `I work as a ${job.toLowerCase()} at ${biz?.name}. ${open ? `They're hiring, actually — ${open} open spot${open > 1 ? 's' : ''}. Apply online.` : 'No openings right now though.'}`;
      }
      d = 0.02;
      break;
    }
    case 'gossip': {
      const others = Object.entries(c.rel).filter(([id, r]) => +id !== player.id && (r.t === 'friend' || r.t === 'enemy' || r.t === 'partner')).map(([id, r]) => [W.citizens[id], r]).filter(([o]) => o && o.status !== 'dead');
      if (!others.length) { line = 'I keep to myself, honestly.'; break; }
      const [o, r] = others[Math.floor(rng() * others.length)];
      const ev = o.log.slice(-5).reverse().find((e) => e.major);
      line = r.t === 'enemy' ? `Don't get me started on ${o.name}. Total snake.` : ev ? `You know ${o.first}? ${ev.text}. Can you believe it?` : `${o.first} ${o.job ? `still works at ${W.economy.biz[o.job.biz]?.name}` : 'is still out of work'}. I worry about them.`;
      d = 0.03;
      break;
    }
    case 'hangout': {
      const yes = aff > 0.15 + B.N * 0.2 && rng() < 0.5 + B.E * 0.4;
      line = yes ? pick(['Sure, let\'s do it!', 'Yeah, I could use a night out.', 'Okay, but you\'re buying.']) : pick(['Can\'t tonight.', 'Maybe another time.', 'I barely know you.']);
      return { line, d: yes ? 0.05 : -0.01, yes };
    }
    case 'apologize': {
      const forgive = rng() < 0.4 + B.A * 0.5;
      line = forgive ? pick(['...Okay. Thanks for saying that.', 'Fine. We\'re good.', 'Apology accepted.']) : pick(['Too little, too late.', 'Whatever.', 'I\'m still mad.']);
      d = forgive ? 0.15 : 0.02;
      break;
    }
    default: line = pick(S.hi);
  }
  return { line, d };
}
