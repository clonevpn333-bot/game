// Spark, the city's dating app. Swipe on real single citizens, match, go on a
// date and find out who they really are. Everyone has a vibe: chill people
// want your time, drama queens/kings want constant attention and expensive
// proof of love (and look sweet until the first date), wild ones want you to
// pull off crazy stunts. Partners give you missions; doing them builds love,
// blowing them off costs you.
import { persona } from './persona.js';
import { ensureLife, stat } from './lifeState.js';
import { rand } from '../core/rng.js';
import { dist } from '../core/math.js';
import { money, esc } from '../ui/panels.js';

export const VIBES = { chill: ['😎', 'Chill'], drama: ['🔥', 'Drama'], wild: ['😈', 'Wild'] };
const BIOS = {
  chill: ['Looking for someone to get tacos with.', 'Dog person. Sunday mornings. Good playlists.', 'Not here for drama.', 'Will judge you by your coffee order.'],
  drama: ['I fall hard and fast 💕', 'Loyalty is everything.', 'Looking for my forever person 🥺', 'Text back fast or don\'t text at all.'],
  wild: ['Life is short, break the rules.', 'Bad decisions make good stories.', 'If you\'re boring, swipe left.', 'Ride or die.'],
};
const MISSIONS = {
  chill: [['date', ['restaurant', 'cafe', 'bar']], ['gift'], ['visit'], ['money', 80]],
  drama: [['curfew'], ['reply'], ['money', 400], ['date', ['nightclub', 'lounge', 'restaurant']], ['gift']],
  wild: [['crime'], ['car'], ['date', ['nightclub', 'casino', 'bar']], ['money', 150]],
};
const TEXT = {
  date: (v, t) => `Meet me at ${v} before ${t}.`,
  gift: () => 'Bring me flowers? 🌷 (buy some, then give them to me in person)',
  visit: () => 'Come see me today. I miss your face.',
  money: (a) => `Could you send me ${money(a)}? I'll explain later.`,
  curfew: () => 'Be home by 11pm tonight. I\'ll be checking.',
  reply: () => 'Tell me you love me. On Spark. Within the hour.',
  crime: () => 'Do something crazy for me. Rob a store, steal a car. Impress me.',
  car: (h) => `I want a new ride. Steal me one and bring it to my place (${h}).`,
};

export class Love {
  constructor(W) {
    this.W = W;
    this.tick = 0;
    W.on('hour', ({ hour }) => this.hourly(hour));
    W.on('day', () => this.daily());
  }
  get player() { return this.W.life?.player; }
  vibe(o) {
    const P = persona(o);
    if (P.temper > 0.6 || P.dark === 'stalker') return 'drama';
    if (o.gang || o.traits.honesty < 0.47 || P.dark === 'con artist') return 'wild';
    return 'chill';
  }
  S(c) { const L = ensureLife(c, this.W); return L.spark || (L.spark = { seen: [], matches: [], pref: 1, revealed: [], mission: null }); }
  rel(c, o) { return c.rel[o.id]?.a ?? 0; }
  shownVibe(c, o) { const v = this.vibe(o); return v === 'drama' && !this.S(c).revealed.includes(o.id) ? ['😇', 'Sweet'] : VIBES[v]; }

  // ------------------------------------------------------------ swiping
  pool(c) {
    const W = this.W, S = this.S(c);
    const fam = new Set([...(c.parents || []), ...(c.siblings || []), ...(c.kids || [])]);
    return W.citizens.filter((o) => o !== c && o.status === 'ok' && o.age >= 18 && Math.abs(o.age - c.age) <= 9 && !W.citizenAI.partner(o) && !fam.has(o.id)
      && (S.pref === 2 || (o.look.form ?? 0) === S.pref) && !S.seen.includes(o.id) && !S.matches.includes(o.id) && !o.visitor);
  }
  card(c) {
    const S = this.S(c), W = this.W;
    if (S.card == null || !W.citizens[S.card] || S.seen.includes(S.card)) { const p = this.pool(c); S.card = p.length ? p[Math.floor(rand.float() * p.length)].id : null; }
    return S.card != null ? W.citizens[S.card] : null;
  }
  swipe(c, like) {
    const W = this.W, S = this.S(c), o = this.card(c);
    if (!o) return null;
    S.seen.push(o.id); if (S.seen.length > 300) S.seen.shift();
    S.card = null;
    if (!like) return null;
    const L = ensureLife(c, W);
    const p = 0.22 + (L.stats.looks || 50) / 260 + (L.skills.charisma || 0) / 320 + (L.fame || 0) / 60 + (this.vibe(o) === 'drama' ? 0.15 : 0);
    if (rand.chance(Math.min(0.9, p))) { S.matches.push(o.id); W.citizenAI.addAff(c, o, 0.15, 'acq'); return o; }
    return false;
  }

  // ------------------------------------------------------------ missions
  give(c, o, firstDate = false) {
    const W = this.W, S = this.S(c), v = this.vibe(o);
    const [k, arg] = firstDate ? ['date', ['restaurant', 'cafe', 'bar']] : rand.pick(MISSIONS[v]);
    const M = { k, who: o.id, since: W.time, until: W.time + (k === 'reply' ? 60 : k === 'curfew' ? Math.max(120, (23 * 60 - W.minuteOfDay)) + 30 : 60 * 8), first: firstDate, crimes: c.record.crimes };
    if (k === 'date') {
      const biz = rand.pick(W.economy.biz.filter((b) => arg.includes(b.type) && b.status === 'open'));
      if (!biz) return null;
      M.b = biz.b;
      M.text = TEXT.date(biz.name, W.history.timeStr(M.until));
      W.citizenAI.go(o, biz.b, 'meet', { with: c.id });
    } else if (k === 'money') { M.amt = arg; M.text = TEXT.money(arg); }
    else if (k === 'car') M.text = TEXT.car(W.citizenAI.buildingName(o.home));
    else M.text = TEXT[k]();
    S.mission = M;
    W.life && W.life.msg(VIBES[v][0], `${o.first} (Spark): "${M.text}"`);
    return M;
  }
  complete(c, M, ok) {
    const W = this.W, S = this.S(c), o = W.citizens[M.who];
    S.mission = null;
    if (!o) return;
    const v = this.vibe(o);
    if (ok) {
      W.citizenAI.addAff(c, o, M.first ? 0.3 : 0.14);
      stat(c, 'happy', 4);
      if (M.first) {
        if (!S.revealed.includes(o.id)) S.revealed.push(o.id);
        W.citizenAI.setRel(c, o, Math.max(0.65, this.rel(c, o)), 'partner');
        W.history.citizenLog(c, `Started dating ${o.name} (met on Spark)`, true); W.history.citizenLog(o, `Started dating ${c.name}`, true);
        W.life && W.life.msg('💘', `Your date with ${o.first} went great. You're officially together.${v === 'drama' ? ' (They seem… intense.)' : ''}`);
      } else {
        if (v === 'wild') { const cut = 100 + rand.int(0, 400); c.money += cut; W.life && W.life.msg('😈', `${o.first}: "THAT'S what I'm talking about." (+${money(cut)})`); }
        else W.life && W.life.msg(VIBES[v][0], `${o.first}: "${rand.pick(['You\'re the best 💕', 'Love you.', 'This is why I keep you around.'])}"`);
      }
      return;
    }
    W.citizenAI.addAff(c, o, v === 'drama' ? -0.22 : -0.12);
    if (M.first) { S.matches = S.matches.filter((id) => id !== o.id); W.life && W.life.msg('💔', `${o.first} waited at the date, then unmatched you.`); return; }
    if (v === 'drama') {
      const r = rand.int(0, 2);
      if (r === 0 && c.vehicle != null) { const car = W.traffic.byId.get(c.vehicle); if (car) car.damage = Math.min(1, (car.damage || 0) + 0.3); W.life.msg('🔥', `${o.first} keyed your car. "You did this to yourself."`); }
      else if (r === 1) { const lose = Math.round(c.money * 0.25); c.money -= lose; W.life.msg('🔥', `${o.first} threw your stuff out the window. You lost ${money(lose)} of cash in the chaos.`); }
      else { stat(c, 'happy', -8); W.life.msg('🔥', `${o.first} posted about you on FriendFace. 147 comments. Your reputation takes a hit.`); }
    } else W.life && W.life.msg(VIBES[v][0], `${o.first}: "${v === 'wild' ? 'Boring. You\'re so boring.' : 'I guess you were busy. It\'s fine.'}"`);
    if (this.rel(c, o) < 0) { W.life.breakUp(c, o, `${o.first} broke up with you.`); }
  }
  check(c) {
    const W = this.W, S = this.S(c), M = S.mission;
    if (!M) return;
    const o = W.citizens[M.who];
    if (!o || o.status !== 'ok') { S.mission = null; return; }
    let ok = false;
    if (M.k === 'date') { if (o.at === M.b) { o.until = Math.max(o.until || 0, M.until); o.nextThink = o.until; } ok = c.at === M.b && o.at === M.b; }
    if (M.k === 'visit') ok = c.at != null && c.at === o.at;
    if (M.k === 'crime') ok = c.record.crimes > M.crimes;
    if (M.k === 'car') { const v = c.veh != null ? W.traffic.byId.get(c.veh) : null; const h = W.city.buildings[o.home]; ok = !!(v && v.owner !== c.id && h && dist(v.x, v.z, h.door[0], h.door[1]) < 35); }
    if (M.k === 'gift') ok = !!M.gave;
    if (M.k === 'curfew') { if (W.minuteOfDay >= 23 * 60 && W.minuteOfDay < 23 * 60 + 20 && c.at === c.home) ok = true; }
    if (ok) return this.complete(c, M, true);
    if (W.time > M.until) this.complete(c, M, false);
  }
  onGift(c, o) { const M = this.S(c).mission; if (M && M.k === 'gift' && M.who === o.id) M.gave = true; }

  // ------------------------------------------------------------ the clock
  update(dt) { this.tick -= dt; if (this.tick > 0) return; this.tick = 1.5; const c = this.player; if (c && c.status === 'ok') this.check(c); }
  hourly(hour) {
    const c = this.player;
    if (!c || c.status !== 'ok') return;
    const S = this.S(c), o = this.W.citizenAI.partner(c);
    if (!o || S.mission || hour < 9 || hour > 21) return;
    const v = this.vibe(o);
    if (rand.chance(v === 'drama' ? 0.12 : 0.06)) this.give(c, o);
    // drama partners text. A lot.
    if (v === 'drama' && rand.chance(0.25)) this.W.life.msg('🔥', `${o.first}: "${rand.pick(['Where are you?', 'Why aren\'t you answering??', 'Who were you talking to?', 'I miss you. Like, a lot.', '?', 'Call me.'])}"`);
  }
  daily() {
    const c = this.player;
    if (!c) return;
    const o = this.W.citizenAI.partner(c);
    if (o) this.W.citizenAI.addAff(c, o, -0.015);
  }

  // ------------------------------------------------------------ the app
  html(c) {
    const W = this.W, S = this.S(c), o = this.card(c);
    const partner = W.citizenAI.partner(c);
    const M = S.mission;
    const av = (p, big) => `<span class="av${big ? ' big' : ''}" style="background:${p.look.shirt}">${esc(p.first[0])}</span>`;
    let h = `<div class="spark"><p class="muted">🔥 Spark · show me <button data-pref="1" class="${S.pref === 1 ? 'sel' : ''}">Women</button><button data-pref="0" class="${S.pref === 0 ? 'sel' : ''}">Men</button><button data-pref="2" class="${S.pref === 2 ? 'sel' : ''}">Everyone</button></p>`;
    if (partner) {
      const v = VIBES[this.vibe(partner)], a = this.rel(c, partner);
      h += `<div class="job"><span>${av(partner)} <b>${esc(partner.name)}</b> ${v[0]} ${v[1]}<br><small>Love ${Math.round(Math.max(0, a) * 100)}%</small></span></div>`;
    }
    if (M) {
      const mo = W.citizens[M.who];
      h += `<div class="job"><span><b>${esc(mo.first)}:</b> "${esc(M.text)}"<br><small>Due ${W.history.timeStr(M.until)}</small></span>${M.k === 'money' ? `<button data-pay ${c.money + (c.bank || 0) < M.amt ? 'disabled' : ''}>Send ${money(M.amt)}</button>` : ''}${M.k === 'reply' ? '<button data-love>"I love you" ❤</button>' : ''}</div>`;
    }
    if (o) {
      const [ic, label] = this.shownVibe(c, o);
      const P = persona(o);
      h += `<div class="card">${av(o, true)}<div><b>${esc(o.first)}, ${o.age}</b> <small>${ic} ${label}</small><br><small>${esc(W.citizenAI.jobTitle(o))} · into ${esc(P.likes.slice(0, 2).join(' & '))}</small><p>"${esc(rand.pick(BIOS[this.vibe(o)]))}"</p></div></div>
        <div class="menu"><button data-swipe="0">✕ Nope</button><button data-swipe="1" class="pri">❤ Like</button></div>`;
    } else h += '<p class="muted">No one new nearby. Check back tomorrow.</p>';
    const ms = S.matches.map((id) => W.citizens[id]).filter((m) => m && m.status === 'ok' && m !== partner);
    if (ms.length) h += `<h4>Matches</h4>${ms.map((m) => `<div class="job"><span>${av(m)} <b>${esc(m.name)}</b> <small>${this.shownVibe(c, m).join(' ')}</small></span><button data-date="${m.id}" ${M || partner ? 'disabled' : ''}>Ask on a date</button><button data-unmatch="${m.id}">✕</button></div>`).join('')}`;
    return h + `<p class="gmsg">${esc(this.flash || '')}</p></div>`;
  }
  bind(a, c, re) {
    const W = this.W, S = this.S(c);
    const q = (s, f) => a.el.querySelectorAll(s).forEach((b) => b.onclick = () => { this.flash = ''; f(b); re(); });
    q('[data-pref]', (b) => { S.pref = +b.dataset.pref; S.card = null; });
    q('[data-swipe]', (b) => { const r = this.swipe(c, b.dataset.swipe === '1'); this.flash = r ? `It's a match with ${r.first}! 💘` : r === false ? 'No match this time.' : ''; });
    q('[data-date]', (b) => { const m = this.give(c, W.citizens[+b.dataset.date], true); this.flash = m ? 'Date set. Check your messages for where to meet.' : 'Nowhere open right now.'; });
    q('[data-unmatch]', (b) => { S.matches = S.matches.filter((id) => id !== +b.dataset.unmatch); });
    q('[data-pay]', () => { const M = S.mission; if (!M) return; let left = M.amt; const fromCash = Math.min(c.money, left); c.money -= fromCash; left -= fromCash; c.bank = (c.bank || 0) - left; W.citizens[M.who].money += M.amt; this.complete(c, M, true); });
    q('[data-love]', () => { const M = S.mission; if (M && M.k === 'reply') this.complete(c, M, true); });
  }
}
