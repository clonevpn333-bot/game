// Drama: the BitLife side of life. Spend the night with people (fade to
// black), cheat and maybe get caught, surprise pregnancies and child support,
// a workday full of decisions (bribes, credit thieves, unattended cash,
// office crushes), and random chaos that finds you whether you want it or not.
import { ensureLife, stat } from './lifeState.js';
import { rand } from '../core/rng.js';
import { formOf } from '../core/names.js';
import { money } from '../ui/panels.js';

export class Drama {
  constructor(W) {
    this.W = W;
    this.t = 0;
    this.lastShiftEv = 0;
    W.on('day', () => this.daily());
  }
  get player() { return this.W.life?.player; }
  get Ls() { return this.W.life; }
  partner(c) { return this.W.citizenAI.partner(c); }
  push(ev) { const P = this.Ls.pending; if (P.length < 4 && !P.some((p) => p.text === ev.text)) P.push(ev); }

  // ------------------------------------------------------------ nights together (off screen)
  canHookUp(c, o) { return c.age >= 18 && o.age >= 18 && (c.rel[o.id]?.a ?? 0) > 0.3 && o.status === 'ok' && !(c.parents || []).includes(o.id) && !(c.siblings || []).includes(o.id) && !(c.kids || []).includes(o.id); }
  hookUp(c, o) {
    const W = this.W, L = ensureLife(c, W), p = this.partner(c);
    W.citizenAI.addAff(c, o, 0.12);
    stat(c, 'happy', 6); c.needs.fun = Math.min(1, c.needs.fun + 0.4); c.needs.social = Math.min(1, c.needs.social + 0.4);
    let out = rand.pick([`You and ${o.first} spend the night together.`, `One thing leads to another. The next morning ${o.first} makes coffee.`, `A long night with ${o.first}. Neither of you regrets it.`]);
    // cheating: on your partner, or with someone else's
    const theirs = this.partner(o);
    if (p && p !== o) { L.affairs = [...(L.affairs || []).filter((a) => a.id !== o.id), { id: o.id, since: W.day, n: ((L.affairs || []).find((a) => a.id === o.id)?.n || 0) + 1 }]; out += ` (${p.first} can never find out.)`; W.history.citizenLog(c, `Cheated on ${p.name} with ${o.name}`, false); }
    if (theirs && theirs !== c) { L.homewrecker = [...(L.homewrecker || []), { id: o.id, partner: theirs.id }].slice(-4); out += ` ${o.first} is with ${theirs.first}, though.`; }
    // no one planned this
    const fertile = Math.max(c.age, o.age) < 46 && formOf(c) !== formOf(o) && !L.pregnant;
    if (fertile && rand.chance(p === o ? 0.15 : 0.12)) {
      const carrier = formOf(c) === 1 ? c.id : o.id;
      L.pregnant = { days: 9, with: o.id, carrier, surprise: p !== o };
      setTimeout(() => this.Ls.msg('🍼', carrier === c.id ? `You're pregnant. ${o.first} is the other parent.${p && p !== o ? ` ${p.first} is going to have questions.` : ''}` : `${o.first} calls: "So… I'm pregnant. It's yours."${p && p !== o ? ` You think about ${p.first}.` : ''}`), 3000);
    }
    return out;
  }

  // ------------------------------------------------------------ getting caught
  daily() {
    const W = this.W, c = this.player;
    if (!c || c.status === 'dead') return;
    const L = ensureLife(c, W), p = this.partner(c);
    // child support for kids who don't live with you
    for (const s of L.support || []) { const kid = W.citizens[s.kid]; if (!kid || kid.status === 'dead' || kid.age >= 18) continue; this.Ls.pay ? this.Ls.pay(c, s.daily, 'child support') : (c.bank = (c.bank || 0) - s.daily); }
    if (p && (L.affairs || []).length) {
      const drama = W.love && W.love.vibe(p) === 'drama';
      for (const a of L.affairs) {
        const o = W.citizens[a.id];
        if (!o || o.status !== 'ok') continue;
        const risk = 0.06 + a.n * 0.04 + (drama ? 0.1 : 0) + (o.home === p.home ? 0.2 : 0) + (L.pregnant && L.pregnant.with === o.id ? 0.3 : 0);
        if (rand.chance(risk)) { this.caught(c, p, o, rand.pick(['found the texts on your phone', 'saw you two together at the bar', 'heard it from a friend of a friend', 'found a jacket that isn\'t yours'])); break; }
      }
    }
    // your Spark profile is still up…
    if (p && W.love && W.love.S(c).matches.length && rand.chance(0.04)) this.caught(c, p, null, 'found your Spark profile, still active');
    // chaos, every few days
    if (rand.chance(0.35)) this.chaos(c, L);
  }
  caught(c, p, o, how) {
    if (this.Ls.pending.some((e) => e.text.startsWith('💥'))) return;
    const W = this.W, L = ensureLife(c, W), married = L.married === p.id;
    const leave = () => {
      const div = married ? Math.round(Math.max(0, (c.bank || 0)) * 0.5) : 0;
      if (div) { c.bank -= div; p.bank = (p.bank || 0) + div; }
      const kids = (c.kids || []).filter((k) => W.citizens[k] && W.citizens[k].parents?.includes(p.id) && W.citizens[k].age < 18);
      if (kids.length) L.support = [...(L.support || []), ...kids.map((k) => ({ kid: k, daily: 30 }))];
      this.Ls.breakUp(c, p, married ? `${p.first} filed for divorce.` : `${p.first} dumped you.`);
      L.affairs = []; W.goals && W.goals.rep(c, -4);
      for (const id of c.parents || []) if (W.citizens[id]) W.citizenAI.addAff(c, W.citizens[id], -0.1);
      return `${married ? `The divorce takes half your savings (${money(div)}).` : 'It\'s over.'}${kids.length ? ` You owe child support for ${kids.length} kid${kids.length > 1 ? 's' : ''}.` : ''}`;
    };
    this.push({
      text: `💥 ${p.first} ${how}${o ? ` — you and ${o.first}` : ''}. ${p.first} is standing in front of you, shaking.`,
      choices: [
        ['Beg for forgiveness', () => { if (rand.chance(0.25 + Math.max(0, p.rel[c.id]?.a ?? 0) * 0.5)) { W.citizenAI.addAff(c, p, -0.3); L.affairs = []; stat(c, 'happy', -6); return `${p.first} forgives you. Barely. One more time and it's over.`; } return leave(); }],
        ['Deny everything', () => { if (rand.chance(o ? 0.3 : 0.5)) { W.citizenAI.addAff(c, p, -0.15); return `"…Fine. I believe you." (They don't. Not really.)`; } return `${p.first} doesn't buy it. ${leave()}`; }],
        ...(o ? [[`Leave ${p.first} for ${o.first}`, () => { const r = leave(); W.citizenAI.setRel(c, o, Math.max(0.65, c.rel[o.id]?.a ?? 0.6), 'partner'); return `${r} You and ${o.first} make it official.`; }]] : []),
      ],
    });
  }
  // a baby that lives with the other parent costs you
  onBirth(c, kid, withId, carrier) {
    const W = this.W, L = ensureLife(c, W), o = W.citizens[withId];
    if (!o || carrier === c.id || o.home === c.home) return;
    W.citizenAI.setHome(kid, o.home); kid.unit = o.unit; W.citizenAI.placeInside(kid, o.home);
    L.support = [...(L.support || []), { kid: kid.id, daily: 30 }];
    this.Ls.msg('⚖', `${kid.first} lives with ${o.first}. The court sets child support at ${money(30)} a day.`);
  }

  // ------------------------------------------------------------ random chaos
  chaos(c, L) {
    const W = this.W;
    const evs = [
      { text: '💼 You find a wallet on the sidewalk with $400 and an ID inside.', choices: [['Keep the cash', () => { c.money += 400; W.goals && W.goals.rep(c, -2); return 'Finders keepers.'; }], ['Return it', () => { W.goals && W.goals.rep(c, 4); stat(c, 'happy', 3); return 'The owner nearly cries. Word gets around: you\'re a good one.'; }]] },
      { text: '🥊 A loud guy at the bar shoves you and says you looked at his girlfriend.', choices: [['Throw hands', () => { const win = rand.chance(0.35 + (L.stats.fitness || 50) / 200); if (win) { W.goals && W.goals.rep(c, -2); L.kos = (L.kos || 0) + 1; stat(c, 'happy', 4); return 'One punch. He\'s on the floor. The bar goes quiet, then cheers.'; } L.stats.health = Math.max(0, L.stats.health - 18); stat(c, 'happy', -6); return 'He was bigger than he looked. You wake up outside with a black eye.'; }], ['Walk away', () => { stat(c, 'happy', -2); return 'You leave. He yells something about you being scared.'; }]] },
      { text: '📱 Your ex posted a long video about you. It\'s getting views.', choices: [['Post a reply', () => { if (rand.chance(0.5)) { L.fame = (L.fame || 0) + 1; return 'Your reply goes viral. People are on your side.'; } W.goals && W.goals.rep(c, -4); return 'It backfires. Now you\'re the villain.'; }], ['Ignore it', () => 'It blows over in a few days.']] },
      { text: '🕶 A gang member says your block needs "protection." $200 a week.', choices: [['Pay up', () => { c.money -= 200; return 'He takes the cash and pats your cheek.'; }], ['Tell him to get lost', () => { if (rand.chance(0.4)) { const car = c.vehicle != null ? W.traffic.byId.get(c.vehicle) : null; if (car) car.damage = Math.min(1, (car.damage || 0) + 0.4); return 'The next morning your car windows are smashed.'; } return 'He laughs and leaves. You don\'t see him again.'; }]] },
      { text: '🎰 A guy outside the casino offers to sell you a "guaranteed" betting system for $300.', choices: [['Buy it', () => { c.money -= 300; return 'It\'s a photocopied page that says "bet on red." You got scammed.'; }], ['No thanks', () => 'Smart.']] },
      { text: '🍾 You get invited to a rooftop party full of strangers.', choices: [['Go wild', () => { c.needs.fun = 1; stat(c, 'happy', 8); L.stats.health = Math.max(0, L.stats.health - 6); if (rand.chance(0.3)) { const o = rand.pick(W.citizens.filter((x) => x.status === 'ok' && x.age >= 18 && Math.abs(x.age - c.age) < 10 && !this.partner(x))); if (o) { W.citizenAI.addAff(c, o, 0.45); return `Best night in months. You leave with ${o.first}'s number.`; } } return 'Best night in months. Your head disagrees the next morning.'; }], ['Stay home', () => 'You hear about it for weeks.']] },
    ];
    this.push(rand.pick(evs));
  }

  // ------------------------------------------------------------ the workday
  shiftEvent(c) {
    const W = this.W, L = ensureLife(c, W), role = c.job.role, biz = W.economy.biz[c.job.biz];
    const perf = (d) => { L.perf = Math.max(0, Math.min(100, (L.perf || 50) + d)); };
    const fired = (why) => { W.citizenAI.loseJob(c, why); W.goals && W.goals.rep(c, -4); return ` You're fired.`; };
    const mates = biz.jobs.map((j) => W.economy.jobs[j].holder).filter((id) => id != null && id !== c.id).map((id) => W.citizens[id]).filter(Boolean);
    const mate = rand.pick(mates);
    const evs = [
      { text: `🕗 Your boss at ${biz.name} asks you to stay two hours late. Unpaid.`, choices: [['Stay', () => { perf(6); stat(c, 'happy', -3); return 'The boss notices. Your back doesn\'t thank you.'; }], ['Say no', () => { perf(-5); return '"Noted," says the boss, writing something down.'; }]] },
      { text: '💵 Someone left $300 in an envelope in the break room. No name on it.', choices: [['Pocket it', () => { c.money += 300; if (rand.chance(0.3)) { c.record.crimes++; return `Security footage. Busted.${fired('fired for stealing')}`; } return 'Nobody saw. Probably.'; }], ['Hand it in', () => { perf(4); W.goals && W.goals.rep(c, 2); return 'The manager thanks you in front of everyone.'; }]] },
      { text: '😤 A customer is screaming at you over something that isn\'t your fault.', choices: [['Stay professional', () => { perf(3); stat(c, 'happy', -2); return 'You smile through it. Inside, you scream.'; }], ['Scream back', () => { perf(-8); c.needs.fun = Math.min(1, c.needs.fun + 0.3); return 'It feels AMAZING. Your manager does not agree.'; }], ['Throw them out', () => { if (rand.chance(0.3)) return `They file a complaint.${fired('fired after a customer complaint')}`; perf(-2); return 'They leave. Your coworkers slow-clap.'; }]] },
    ];
    if (mate) {
      evs.push({ text: `🧠 ${mate.first} presented YOUR idea to the boss as their own.`, choices: [['Call them out', () => { if (rand.chance(0.55)) { perf(8); W.citizenAI.addAff(c, mate, -0.4); return 'You have the emails. The boss believes you.'; } perf(-4); return 'It looks like sour grapes. Awkward.'; }], ['Let it slide', () => { stat(c, 'happy', -4); return 'You stew about it all afternoon.'; }], [`Settle it in the parking lot`, () => { W.citizenAI.setRel(c, mate, -0.8, 'enemy'); L.kos = (L.kos || 0) + 1; return rand.chance(0.6) ? `You and ${mate.first} go at it behind the building.${fired('fired for fighting a coworker')}` : `You and ${mate.first} trade punches. Nobody reports it. You both show up the next day pretending nothing happened.`; }]] });
      if (mate.age >= 18) evs.push({ text: `😏 ${mate.first} keeps finding reasons to stop by your desk.`, choices: [['Flirt back', () => { W.citizenAI.addAff(c, mate, 0.3); return this.partner(c) ? `It's harmless. Right? (${this.partner(c).first} wouldn't think so.)` : `You get ${mate.first}'s number.`; }], ['Keep it professional', () => 'You keep it professional. They get the hint.']] });
    }
    if (role === 'officer') evs.push({ text: '🚔 A suspect slides you $800 to look the other way.', choices: [['Take the money', () => { c.money += 800; if (rand.chance(0.2)) { c.record.crimes++; return `Internal Affairs was watching.${fired('fired for corruption')}`; } return 'You pocket it. Nobody needs to know.'; }], ['Arrest them', () => { perf(10); W.goals && W.goals.rep(c, 3); return 'Clean bust. The captain is impressed.'; }]] });
    if (['cashier', 'clerk', 'bartender', 'server'].includes(role)) evs.push({ text: '🧾 The register is $60 over and nobody is counting.', choices: [['Skim it', () => { c.money += 60; return rand.chance(0.15) ? `Your manager counts after all.${fired('fired for skimming')}` : 'Easy money.'; }], ['Leave it', () => { perf(2); return 'Honest work.'; }]] });
    if (role === 'teacher' || role === 'professor') evs.push({ text: '🎓 A parent offers you a $500 "gift card" to change a grade.', choices: [['Change the grade', () => { c.money += 500; return rand.chance(0.25) ? `Another parent finds out.${fired('fired for grade fixing')}` : 'Nobody notices.'; }], ['Refuse', () => { perf(4); return 'You report it. The principal backs you.'; }]] });
    if ((L.perf || 50) > 70) evs.push({ text: '📈 A senior spot just opened up. Your boss hints you should go for it.', choices: [['Go for it', () => { if (rand.chance((L.perf || 50) / 120)) { c.job.wage = Math.round(c.job.wage * 1.3); c.job.title = `Senior ${c.job.title || role}`; stat(c, 'happy', 10); return `Promoted! Now ${money(c.job.wage)}/h.`; } return 'They give it to someone else. Next time.'; }], ['Not yet', () => 'You stay where you are.']] });
    this.push(rand.pick(evs));
  }

  update(dt) {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 2;
    const W = this.W, c = this.player;
    if (!c || !c.job || !c.working || !c.possessed) return;
    if (W.time - this.lastShiftEv > 70 && rand.chance(0.5)) { this.lastShiftEv = W.time; this.shiftEvent(c); }
  }
}
