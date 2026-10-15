// What you can do at every interaction point inside a building: sleep, eat, cook,
// shower, watch TV, change clothes, shop, buy lottery tickets, bank, gamble, drink,
// dance, take classes, teach, work, work out, get treated, ride the metro, take the
// elevator up to your apartment... Effects land on the simulation (money, needs,
// business revenue, relationships) and on your life stats.
import { BTYPES } from '../sim/economy.js';
import { ensureLife, stat, skill } from '../sim/lifeState.js';
import { PRICE } from '../sim/lottery.js';
import { attend, PROGRAMS, enroll } from '../sim/careers.js';
import { openPanel, money, esc } from '../ui/panels.js';
import { blackjack, roulette, slots, poker } from '../ui/games.js';
import { clamp } from '../core/math.js';
import { rand } from '../core/rng.js';

const SHOP = {
  grocery: [['Weekly groceries (7 meals)', 68, { groceries: 7 }], ['Snack', 4, { hunger: 0.25 }], ['Coffee', 3, { energy: 0.15 }], ['Flowers', 18, { gift: 'flowers' }], ['Cigarettes', 11, { smoke: 1 }], ['Six-pack of beer', 12, { beer: 1 }]],
  convenience: [['Snack', 4, { hunger: 0.3 }], ['Energy drink', 4, { energy: 0.25 }], ['Sandwich', 7, { hunger: 0.55 }], ['Groceries (3 meals)', 32, { groceries: 3 }], ['Cigarettes', 11, { smoke: 1 }], ['Six-pack of beer', 12, { beer: 1 }]],
  gas: [['Snack', 4, { hunger: 0.3 }], ['Hot dog', 5, { hunger: 0.45 }], ['Coffee', 3, { energy: 0.15 }], ['Fill up the tank', 45, { fuel: 1 }], ['Cigarettes', 11, { smoke: 1 }]],
  pharmacy: [['Painkillers', 14, { health: 6 }], ['Vitamins', 22, { health: 3, vit: 1 }], ['First-aid kit', 35, { health: 12, heal: 1 }], ['Cold medicine', 12, { health: 4 }], ['Toiletries', 18, { hygiene: 1 }]],
  clothing: [['New outfit', 120, { outfit: 1, looks: 2 }], ['Designer jacket', 420, { outfit: 1, looks: 5, fame: 1 }], ['Sneakers', 160, { looks: 2 }], ['Accessories', 60, { looks: 1 }]],
  electronics: [['Smartphone', 699, { item: 'phone' }], ['Laptop', 1199, { item: 'laptop' }], ['Headphones', 149, { happy: 3 }], ['Game console', 499, { item: 'console', happy: 5 }]],
  mall: [['Clothes', 90, { outfit: 1, looks: 2 }], ['Food court meal', 14, { hunger: 0.7 }], ['Movie ticket', 15, { fun: 0.4, happy: 4 }], ['Gift', 40, { gift: 'gift' }]],
  restaurant: [['Burger & fries', 18, { hunger: 0.8 }], ['Steak dinner', 48, { hunger: 1, happy: 4 }], ['Pasta', 24, { hunger: 0.85 }], ['Glass of wine', 12, { drink: 1 }]],
  cafe: [['Coffee', 5, { energy: 0.25 }], ['Latte & croissant', 11, { energy: 0.2, hunger: 0.35 }], ['Tea', 4, { energy: 0.1, happy: 1 }]],
  bar: [['Beer', 7, { drink: 1 }], ['Cocktail', 13, { drink: 1.2 }], ['Whiskey', 11, { drink: 1.4 }], ['Round for the bar', 80, { drink: 1, social: 0.6, fame: 1 }]],
  nightclub: [['Beer', 9, { drink: 1 }], ['Cocktail', 16, { drink: 1.2 }], ['Shots', 24, { drink: 2 }], ['Bottle service', 400, { drink: 1.5, fame: 2, social: 0.7 }]],
  lounge: [['Cocktail', 18, { drink: 1.2 }], ['Champagne', 90, { drink: 1.2, fame: 1 }]],
  casino: [['Cocktail', 14, { drink: 1.2 }], ['Champagne', 90, { drink: 1.2 }]],
  gym: [['Day pass', 14, { pass: 1 }], ['Protein shake', 7, { hunger: 0.2, fitness: 0.5 }], ['Monthly membership', 49, { pass: 30 }]],
  hotel: [['Room for the night', 120, { room: 1 }]],
};

export class Activities {
  constructor(game) {
    this.game = game;
    this.timed = null;
  }
  get W() { return this.game.world; }
  get c() { return this.game.possession.c; }
  biz(I) { const b = I.b; return b && b.bizId != null ? this.W.economy.biz[b.bizId] : null; }
  isHome(I) { const c = this.c; return I.b && (c.home === I.b.id || (I.unitOf != null && this.W.citizens[I.unitOf] && this.W.citizenAI.partner(c)?.id === I.unitOf)); }

  label(a, I) {
    const W = this.W, c = this.c, biz = this.biz(I);
    switch (a.kind) {
      case 'exit': return `Leave ${W.citizenAI.buildingName(I.b.id)}`;
      case 'bed': return this.isHome(I) ? (this.timed?.kind === 'sleep' ? 'Wake up' : 'Sleep') : null;
      case 'fridge': return this.isHome(I) ? `Eat something (${c.life?.groceries ?? 3} meals left)` : null;
      case 'stove': return this.isHome(I) ? 'Cook a meal' : null;
      case 'counter': return biz && SHOP[biz.type] ? `${a.label}` : a.label;
      case 'lottery': return `Lottery tickets — jackpot ${money(W.lottery.jackpot)}`;
      case 'class': { const L = c.life; return L?.edu.enrolled ? `Attend class (${L.edu.credits}/${L.edu.need} credits)` : 'Sit in on a class'; }
      case 'teach': return c.job && ['teacher', 'professor'].includes(c.job.role) && c.working ? 'Teach the class' : null;
      case 'work': return c.job && W.economy.biz[c.job.biz]?.b === I.b.id ? (c.working ? 'Work (do a task)' : 'Clock in first (C)') : null;
      case 'armory': return c.job && c.job.role === 'officer' ? a.label : null;
      case 'vault': return W.heists ? W.heists.vaultLabel(I.b, c) : 'Vault door (locked)';
      case 'vaultCash': return W.heists && W.heists.vaultOpen(I.b.id) ? 'Grab the cash' : null;
      case 'elevator': return 'Take the elevator';
      default: return a.label;
    }
  }

  extraPrompts(a, I) {
    const out = [];
    const W = this.W, c = this.c, biz = this.biz(I);
    if (a.kind === 'counter' && biz && BTYPES[biz.type].robbable && c.duty == null) out.push({ key: 'G', code: 'KeyG', text: 'Rob the register', danger: true, fn: () => this.robRegister(I, biz) });
    if (a.kind === 'teller' && W.heists) out.push({ key: 'G', code: 'KeyG', text: 'Hold up the teller', danger: true, fn: () => W.heists.tellerRobbery(c, I.b, this.game) });
    if (a.kind === 'metro') {
      const others = (W.city.special.metro || []).filter((id) => id !== I.b.id && W.city.buildings[id].state === 'ok');
      others.forEach((id, i) => out.push({ key: String(i + 1), code: 'Digit' + (i + 1), text: W.city.buildings[id].name, fn: () => this.rideMetro(I, id) }));
    }
    return out;
  }

  use(a, I) {
    const g = this.game, W = this.W, c = this.c, biz = this.biz(I);
    const L = ensureLife(c, W);
    const N = c.needs;
    const p = I.player;
    switch (a.kind) {
      case 'bed':
        if (this.timed?.kind === 'sleep') { this.stopTimed(); return; }
        p.x = a.x; p.z = a.z - 1.2; p.action = 'sleep'; p.y = 0.45;
        this.startTimed('sleep', this.untilWake(c), { speed: 6, onDone: () => { p.action = ''; p.y = 0; const rested = N.energy; g.toast(`${c.first} wakes up. ${W.history.timeStr(W.time)} — ${rested > 0.8 ? 'well rested' : 'still tired'}.`, 4); g.emit('wake', c); } });
        c.activity = 'sleep';
        return;
      case 'fridge':
        if ((L.groceries ?? 0) <= 0) { g.toast('The fridge is empty. Buy groceries at a store.'); return; }
        L.groceries--; this.startTimed('eat', 20, { onDone: () => { N.hunger = clamp(N.hunger + 0.6, 0, 1); g.toast('You eat something from the fridge.'); } });
        return;
      case 'stove':
        if ((L.groceries ?? 0) <= 0) { g.toast('Nothing to cook — buy groceries first.'); return; }
        L.groceries--; p.action = 'carry';
        this.startTimed('cook', 45, { onDone: () => { p.action = ''; const good = rand.float() < 0.4 + (L.skills.cooking || 0) / 100; N.hunger = clamp(N.hunger + 0.8, 0, 1); N.fun = clamp(N.fun + 0.1, 0, 1); skill(c, 'cooking', 2); stat(c, good ? 'happy' : 'health', good ? 2 : 0.5); g.toast(good ? 'You cook a great meal.' : 'Edible. Mostly.'); } });
        return;
      case 'shower':
        this.startTimed('shower', 15, { onDone: () => { L.hygiene = 1; stat(c, 'happy', 1); g.toast('Fresh and clean.'); } });
        return;
      case 'toilet': g.toast('Much better.'); return;
      case 'tv':
        p.action = 'sit';
        this.startTimed('tv', 60, { speed: 5, onDone: () => { p.action = ''; N.fun = clamp(N.fun + 0.35, 0, 1); stat(c, 'happy', 1.5); g.toast(rand.pick(['You binge a crime drama.', 'Channel 6 News covers the city.', 'A cooking show. You feel inspired.', 'Reality TV. You regret nothing.'])); } });
        return;
      case 'wardrobe': this.wardrobe(); return;
      case 'computer': if (g.lifeUI) g.lifeUI.openComputer(I); else g.toast('Your computer boots up. (Play Life mode to use it.)'); return;
      case 'counter': case 'bar': this.shop(biz, a); return;
      case 'lottery': this.lottery(); return;
      case 'atm': this.bankPanel(false, biz); return;
      case 'teller': this.bankPanel(true, biz); return;
      case 'banker': this.loanPanel(biz); return;
      case 'slots': if (this.casinoOpen(biz)) slots(g, biz); return;
      case 'blackjack': if (this.casinoOpen(biz)) blackjack(g, biz); return;
      case 'roulette': if (this.casinoOpen(biz)) roulette(g, biz); return;
      case 'poker': if (this.casinoOpen(biz)) poker(g, biz); return;
      case 'cage': g.toast(`The cashier counts out your chips. You have ${money(c.money)} in cash.`); return;
      case 'dance':
        p.action = p.action === 'dance' ? '' : 'dance';
        if (p.action === 'dance') { this.dancing = true; g.toast('You hit the dance floor.'); }
        return;
      case 'dj': if (c.money >= 20) { c.money -= 20; if (biz) biz.cash += 20; N.fun = clamp(N.fun + 0.15, 0, 1); g.toast('The DJ drops your request. The floor goes wild.'); } return;
      case 'vip':
        if (L.vipDay === W.day) { g.toast('You\'re already on the VIP list tonight.'); return; }
        if (c.money < 200) { g.toast('VIP is $200. Not tonight.'); return; }
        c.money -= 200; if (biz) { biz.cash += 200; biz.revToday += 200; } L.vipDay = W.day; L.fame = (L.fame || 0) + 1; stat(c, 'happy', 4); N.social = clamp(N.social + 0.4, 0, 1);
        this.meetSomeone(I, true); return;
      case 'stage':
        if (c.money < 20) { g.toast('You need $20 to tip.'); return; }
        c.money -= 20; if (biz) { biz.cash += 20; biz.revToday += 20; } N.fun = clamp(N.fun + 0.2, 0, 1); stat(c, 'happy', 2);
        g.toast('You tip the performers. They blow you a kiss.'); return;
      case 'class': this.takeClass(I); return;
      case 'teach': this.startTimed('teach', 90, { onDone: () => { L.perf = clamp((L.perf || 50) + 4, 0, 100); stat(c, 'happy', 1); g.toast('Class went well. Your students actually listened.'); } }); p.action = 'talk'; return;
      case 'work': if (c.working) this.workTask(I); return;
      case 'meeting': if (c.working) { this.startTimed('meeting', 60, { onDone: () => { L.perf = clamp((L.perf || 50) + 2, 0, 100); g.toast(rand.pick(['The meeting could have been an email.', 'You pitch an idea. The boss nods.', 'Quarterly numbers. Everyone pretends to understand.'])); } }); p.action = 'sit'; } else g.toast('You don\'t work here.'); return;
      case 'reception': this.reception(I, biz); return;
      case 'treadmill': case 'weights': this.workout(a.kind, biz); return;
      case 'guns': if (W.heists) W.heists.gunStore(c, biz, g); else g.toast('Weapons need a gun licence.'); return;
      case 'armory': g.toast('You check out a sidearm and vest for your shift.'); L.inv.weapons = Array.from(new Set([...(L.inv.weapons || []), 'service pistol'])); return;
      case 'vault': if (W.heists) W.heists.vaultUse(I, g); return;
      case 'vaultCash': if (W.heists) W.heists.grabCash(I, g); return;
      case 'elevator': this.elevator(I); return;
      case 'mailbox': g.toast(rand.pick(['Bills. Mostly bills.', 'A coupon for pizza and an electricity bill.', 'A postcard from someone you forgot.', 'Nothing today.'])); return;
      case 'metro': g.toast('Press a number key to pick your stop.'); return;
      default: g.toast(a.label);
    }
  }

  // ------------------------------------------------------------- timed actions
  untilWake(c) {
    const W = this.W;
    const mod = W.minuteOfDay;
    let wake = Math.round((c.wakeH || 7) * 60);
    if (c.job && c.job.shift) { const st = c.job.shift[0] - 60; if (st > 240 && st < wake + 120) wake = Math.min(wake, st); }
    let mins = wake - mod;
    if (mins < 60) mins += 1440;
    return Math.min(mins, 14 * 60);
  }
  startTimed(kind, minutes, opt = {}) {
    const g = this.game, W = this.W;
    this.timed = { kind, until: W.time + minutes, onDone: opt.onDone, prevSpeed: g.speedIdx };
    if (g.interiors) g.interiors.busy = kind !== 'sleep' ? true : true;
    g.setSpeed(opt.speed || (minutes > 30 ? 5 : 4));
  }
  stopTimed(done = false) {
    const g = this.game, T = this.timed;
    if (!T) return;
    this.timed = null;
    if (g.interiors) g.interiors.busy = false;
    g.setSpeed(2);
    if (T.kind === 'sleep' && this.c) this.c.activity = 'home';
    if (done && T.onDone) T.onDone();
    else if (!done && T.kind === 'sleep') { const p = g.interiors?.player; if (p) { p.action = ''; p.y = 0; } }
  }
  update(dt) {
    const W = this.W, c = this.c, T = this.timed;
    if (T) {
      if (!c || !this.game.interiors?.active) { this.timed = null; if (this.game.interiors) this.game.interiors.busy = false; this.game.setSpeed(2); return; }
      if (T.kind === 'sleep') { c.needs.energy = clamp(c.needs.energy + dt * 0.03 * (this.game.speed / 60), 0, 1); }
      if (W.time >= T.until) this.stopTimed(true);
      else if (this.game.input.hit('KeyE') && T.kind === 'sleep') this.stopTimed(false);
    }
    // dancing: fun & social rise; you catch people's eye
    const p = this.game.interiors?.player;
    if (c && p && p.action === 'dance' && this.game.interiors.active) {
      const N = c.needs;
      N.fun = clamp(N.fun + dt * 0.01, 0, 1); N.social = clamp(N.social + dt * 0.008, 0, 1); N.energy = clamp(N.energy - dt * 0.003, 0, 1);
      this.danceT = (this.danceT || 0) + dt;
      if (this.danceT > 25) { this.danceT = 0; if (rand.chance(0.5)) this.meetSomeone(this.game.interiors, false); }
    }
    if (c && c.life) {
      // sobering up, hygiene wearing off
      c.life.drunk = Math.max(0, (c.life.drunk || 0) - dt * 0.0015 * (this.game.speed || 1));
      c.life.hygiene = Math.max(0, (c.life.hygiene ?? 1) - dt * 0.00004 * (this.game.speed || 1));
    }
  }

  // ------------------------------------------------------------- shops
  shop(biz, a) {
    const g = this.game, c = this.c, W = this.W;
    if (!biz) return;
    if (!W.economy.isOpen(biz, W.minuteOfDay)) { g.toast(`${biz.name} is closed.`); return; }
    const items = SHOP[biz.type] || [['Something', BTYPES[biz.type].price || 10, { fun: 0.1 }]];
    const L = ensureLife(c, W);
    const render = () => `<p class="muted">${esc(biz.name)} · You have ${money(c.money)}${L.drunk > 0.5 ? ' · <b style="color:#f80">You\'re drunk</b>' : ''}</p>
      <div class="menu">${items.map(([n, pr], i) => `<button data-i="${i}" ${c.money < pr ? 'disabled' : ''}><span>${esc(n)}</span><b>${money(pr * biz.priceF)}</b></button>`).join('')}</div>`;
    openPanel(g, {
      title: a.kind === 'bar' ? '🍸 Bar' : '🛒 ' + esc(biz.name), html: render(),
      onBind(api) {
        api.el.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => {
          const [name, base, fx] = items[+b.dataset.i];
          const pr = Math.round(base * biz.priceF);
          if (c.money < pr) return;
          c.money -= pr; biz.cash += pr; biz.revToday += pr; biz.custToday++;
          const N = c.needs;
          if (fx.hunger) N.hunger = clamp(N.hunger + fx.hunger, 0, 1);
          if (fx.energy) N.energy = clamp(N.energy + fx.energy, 0, 1);
          if (fx.fun) N.fun = clamp(N.fun + fx.fun, 0, 1);
          if (fx.social) N.social = clamp(N.social + fx.social, 0, 1);
          if (fx.groceries) L.groceries = (L.groceries || 0) + fx.groceries;
          if (fx.health) stat(c, 'health', fx.health);
          if (fx.happy) stat(c, 'happy', fx.happy);
          if (fx.looks) stat(c, 'looks', fx.looks);
          if (fx.fitness) stat(c, 'fitness', fx.fitness);
          if (fx.fame) L.fame = (L.fame || 0) + fx.fame;
          if (fx.hygiene) L.hygiene = 1;
          if (fx.pass) L.passDay = W.day + fx.pass - 1;
          if (fx.item) L.inv[fx.item] = true;
          if (fx.gift) L.inv.gift = fx.gift;
          if (fx.outfit) { L.outfitDay = W.day; c.look.outfit = rand.pick(['tee', 'polo', 'suit', 'hoodie', ...(c.look.form ? ['dress'] : [])]); c.look.shirt = rand.pick(['#c04040', '#4060a0', '#e8e8e0', '#2a2a2a', '#d8a040', '#3a8a5a', '#a04080', '#5a3a2a']); }
          if (fx.smoke) { L.addictions.nicotine = Math.min(100, (L.addictions.nicotine || 0) + 6); stat(c, 'health', -0.6); stat(c, 'happy', 1); }
          if (fx.drink || fx.beer) { L.drunk = Math.min(1.5, (L.drunk || 0) + 0.18 * (fx.drink || 1)); L.addictions.alcohol = Math.min(100, (L.addictions.alcohol || 0) + 1.5); N.fun = clamp(N.fun + 0.12, 0, 1); N.social = clamp(N.social + 0.08, 0, 1); stat(c, 'happy', 1); stat(c, 'health', -0.3); }
          if (fx.room) { g.toast('You check in. Your room is upstairs.'); L.hotelDay = W.day; }
          if (fx.fuel) { const v = c.vehicle != null ? W.traffic.byId.get(c.vehicle) : null; if (v) v.fuel = 1; }
          g.toast(`Bought: ${name} (${money(pr)})`, 2);
          api.set(render());
        });
      },
    });
  }

  lottery() {
    const g = this.game, c = this.c, W = this.W, LT = W.lottery;
    const L = ensureLife(c, W);
    let picks = [];
    const mine = () => LT.tickets.filter((t) => t.cid === c.id);
    const render = () => {
      const last = LT.history[LT.history.length - 1];
      return `<p>Pick 6 numbers from 1–40 or take a quick pick. Draw every night at 20:00. <b>Jackpot: ${money(LT.jackpot)}</b></p>
        <p class="muted">Odds: 1 in 3,838,380 for all six · 5 = $25,000 · 4 = $400 · 3 = $15</p>
        <div class="lnums">${Array.from({ length: 40 }, (_, i) => `<button class="${picks.includes(i + 1) ? 'sel' : ''}" data-n="${i + 1}">${i + 1}</button>`).join('')}</div>
        <div class="btns"><button class="pri" data-buy="pick" ${picks.length !== 6 || c.money < PRICE ? 'disabled' : ''}>Buy my numbers (${money(PRICE)})</button><button data-buy="1">Quick pick ×1</button><button data-buy="5">×5</button><button data-buy="20">×20</button></div>
        <p class="muted">Your tickets for the next draw: ${mine().length ? mine().slice(-6).map((t) => t.nums.join('-')).join(' · ') + (mine().length > 6 ? ` (+${mine().length - 6})` : '') : 'none'}</p>
        ${last ? `<p class="muted">Last draw (day ${last.day + 1}): <b>${last.nums.join(' – ')}</b>${last.winners.some((w) => w.m === 6) ? ' — JACKPOT WON' : ''}</p>` : ''}`;
    };
    openPanel(g, {
      title: '🎟 City Lotto', html: render(),
      onBind(api) {
        api.el.querySelectorAll('[data-n]').forEach((b) => b.onclick = () => { const n = +b.dataset.n; picks = picks.includes(n) ? picks.filter((x) => x !== n) : picks.length < 6 ? [...picks, n] : picks; api.set(render()); });
        api.el.querySelectorAll('[data-buy]').forEach((b) => b.onclick = () => {
          const k = b.dataset.buy;
          const bought = k === 'pick' ? LT.buy(c, picks, 1) : LT.buy(c, null, +k);
          if (bought.length) { L.ticketsBought = (L.ticketsBought || 0) + bought.length; picks = []; }
          api.set(render());
        });
      },
    });
  }

  bankPanel(teller, biz) {
    const g = this.game, c = this.c, W = this.W;
    const fee = teller || (biz && biz.type === 'bank') ? 0 : 3;
    const render = () => `<p>Cash: <b>${money(c.money)}</b> · Account: <b>${money(c.bank || 0)}</b>${fee ? ` · ATM fee ${money(fee)}` : ''}</p>
      <div class="menu cols"><b>Deposit</b>${[50, 200, 1000].map((v) => `<button data-d="${v}" ${c.money < v ? 'disabled' : ''}>${money(v)}</button>`).join('')}<button data-d="all" ${c.money < 1 ? 'disabled' : ''}>All cash</button>
      <b>Withdraw</b>${[20, 100, 500].map((v) => `<button data-w="${v}" ${(c.bank || 0) < v + fee ? 'disabled' : ''}>${money(v)}</button>`).join('')}${teller ? `<button data-w="2000" ${(c.bank || 0) < 2000 ? 'disabled' : ''}>${money(2000)}</button>` : ''}</div>`;
    openPanel(g, {
      title: teller ? '🏦 Teller' : '🏧 ATM', html: render(),
      onBind(api) {
        api.el.querySelectorAll('[data-d]').forEach((b) => b.onclick = () => { const v = b.dataset.d === 'all' ? Math.floor(c.money) : +b.dataset.d; c.money -= v; c.bank = (c.bank || 0) + v; if (biz && biz.type === 'bank') W.economy.vaultChange(biz, v); api.set(render()); });
        api.el.querySelectorAll('[data-w]').forEach((b) => b.onclick = () => { const v = +b.dataset.w; c.bank -= v + fee; c.money += v; if (biz && biz.type === 'bank') W.economy.vaultChange(biz, -v); api.set(render()); });
      },
    });
  }

  loanPanel(biz) {
    const g = this.game, c = this.c, W = this.W;
    const L = ensureLife(c, W);
    const income = c.job ? c.job.wage * 8 * 5 : 0;
    const owed = L.loans.reduce((a, l) => a + l.left, 0);
    const limit = Math.max(0, Math.round((income * 12 - owed) / 500) * 500);
    const render = () => `<p>The manager looks over your file. Income: ${money(income)}/week · Debt: ${money(L.loans.reduce((a, l) => a + l.left, 0))} · Record: ${c.record.arrests ? c.record.arrests + ' arrest(s)' : 'clean'}</p>
      ${limit >= 1000 ? `<p>You qualify for up to <b>${money(limit)}</b> at 12% (repaid daily over 60 days).</p><div class="menu">${[1000, 5000, 20000, 50000].filter((v) => v <= limit).map((v) => `<button data-l="${v}"><span>Borrow</span><b>${money(v)}</b></button>`).join('')}</div>` : '<p>"I\'m sorry. With your income and history, we can\'t approve a loan right now."</p>'}
      ${L.loans.length ? `<div class="menu">${L.loans.map((l, i) => `<button data-p="${i}" ${c.money < l.left && (c.bank || 0) < l.left ? 'disabled' : ''}><span>Pay off ${l.kind} loan</span><b>${money(l.left)}</b></button>`).join('')}</div>` : ''}`;
    openPanel(g, {
      title: '💼 Loans', html: render(),
      onBind(api) {
        api.el.querySelectorAll('[data-l]').forEach((b) => b.onclick = () => { const v = +b.dataset.l; L.loans.push({ kind: 'personal', amt: v, left: Math.round(v * 1.12), daily: Math.round(v * 1.12 / 60), since: W.day }); c.bank = (c.bank || 0) + v; if (biz) W.economy.vaultChange(biz, -v); W.history.citizenLog(c, `Took out a ${money(v)} loan`, true); api.set(render()); });
        api.el.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => { const l = L.loans[+b.dataset.p]; if ((c.bank || 0) >= l.left) c.bank -= l.left; else c.money -= l.left; L.loans.splice(+b.dataset.p, 1); g.toast('Loan paid off.'); api.set(render()); });
      },
    });
  }

  casinoOpen(biz) { if (this.c.age < 21) { this.game.toast('Security checks your ID. You need to be 21.'); return false; } return true; }

  wardrobe() {
    const g = this.game, c = this.c;
    const L = c.look;
    const outfits = ['tee', 'polo', 'suit', 'hoodie', ...(L.form ? ['dress'] : [])];
    const cols = ['#c04040', '#4060a0', '#e8e8e0', '#2a2a2a', '#d8a040', '#3a8a5a', '#a04080', '#5a3a2a', '#f0c0c8', '#40a0b0', '#7a7a80', '#1a2a4a'];
    const pants = ['#2a2a36', '#3a4a6a', '#1a1a1a', '#6a5a4a', '#4a5a3a', '#8a8070', '#2a3a5a'];
    const render = () => `<div class="ward"><b>Outfit</b><div class="row">${outfits.map((o) => `<button class="${(L.outfit || 'tee') === o ? 'pri' : ''}" data-o="${o}">${o}</button>`).join('')}</div>
      <b>Top colour</b><div class="row">${cols.map((cc) => `<button class="sw ${L.shirt === cc ? 'sel' : ''}" style="background:${cc}" data-s="${cc}"></button>`).join('')}</div>
      <b>Trousers</b><div class="row">${pants.map((cc) => `<button class="sw ${L.pants === cc ? 'sel' : ''}" style="background:${cc}" data-p="${cc}"></button>`).join('')}</div>
      <b>Hair</b><div class="row">${[['0', 'Short'], ['1', 'Long'], ['2', 'Bun'], ['3', 'Curls'], ['5', 'Buzz'], ['6', 'Ponytail'], ['4', 'Bald']].map(([v, n]) => `<button class="${String(L.hairStyle) === v ? 'pri' : ''}" data-h="${v}">${n}</button>`).join('')}</div>
      <b>Hat</b><div class="row"><button class="${L.hat ? 'pri' : ''}" data-hat="1">Cap</button><button class="${!L.hat ? 'pri' : ''}" data-hat="0">None</button></div></div>`;
    openPanel(g, {
      title: '👔 Wardrobe', html: render(),
      onBind(api) {
        api.el.querySelectorAll('[data-o]').forEach((b) => b.onclick = () => { L.outfit = b.dataset.o; api.set(render()); });
        api.el.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => { L.shirt = b.dataset.s; api.set(render()); });
        api.el.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => { L.pants = b.dataset.p; api.set(render()); });
        api.el.querySelectorAll('[data-h]').forEach((b) => b.onclick = () => { L.hairStyle = +b.dataset.h; L.style6 = false; api.set(render()); });
        api.el.querySelectorAll('[data-hat]').forEach((b) => b.onclick = () => { L.hat = b.dataset.hat === '1'; api.set(render()); });
      },
    });
  }

  takeClass(I) {
    const g = this.game, c = this.c, W = this.W, L = ensureLife(c, W);
    const biz = this.biz(I);
    if (!biz || !W.economy.isOpen(biz, W.minuteOfDay)) { g.toast('No classes right now.'); return; }
    if (!L.edu.enrolled) {
      if (biz.type === 'college') { g.toast('You audit a lecture. Interesting, but you get no credit — enroll at Admissions or online.'); stat(c, 'smarts', 0.3); }
      else g.toast('You sit at the back of the classroom. It brings back memories.');
      return;
    }
    if (biz.type !== 'college') { g.toast('Your courses are at Silver River College.'); return; }
    const p = I.player; p.action = 'sit';
    this.startTimed('class', 120, { onDone: () => { p.action = ''; const r = attend(c, W); c.needs.energy = clamp(c.needs.energy - 0.1, 0, 1); if (r?.graduated) { g.toast(`🎓 You graduated: ${r.graduated.name}!`, 6); stat(c, 'happy', 15); g.emit('graduated', { c, prog: r.graduated }); } else if (r) g.toast(`Class done — ${r.credits}/${r.need} credits toward ${r.prog.name}.`); } });
  }

  workTask(I) {
    const g = this.game, c = this.c, W = this.W, L = ensureLife(c, W);
    const role = c.job.role;
    const tasks = { analyst: 'You crunch the quarterly numbers.', clerk: 'You file a mountain of paperwork.', manager: 'You run the team stand-up and approve budgets.', teller: 'You balance your drawer.', worker: 'You move pallets for an hour.', cashier: 'You run the register through the rush.', stocker: 'You restock the shelves.', reporter: 'You chase a story on the phone.' };
    I.player.action = role === 'worker' || role === 'stocker' ? 'carry' : 'type';
    this.startTimed('work', 60, { onDone: () => { I.player.action = ''; const gain = 2 + L.stats.smarts / 50 + (L.drunk > 0.3 ? -6 : 0); L.perf = clamp((L.perf || 50) + gain, 0, 100); c.needs.energy = clamp(c.needs.energy - 0.08, 0, 1); g.toast(`${tasks[role] || 'You get some work done.'} Performance ${Math.round(L.perf)}%.`); g.emit('workTask', c); } });
  }

  workout(kind, biz) {
    const g = this.game, c = this.c, W = this.W, L = ensureLife(c, W);
    if ((L.passDay ?? -1) < W.day) { g.toast('Buy a day pass at the front desk first.'); return; }
    if (c.needs.energy < 0.15) { g.toast('You\'re too exhausted to work out.'); return; }
    const p = g.interiors.player; p.action = kind === 'weights' ? 'carry' : '';
    this.startTimed('workout', 60, { onDone: () => { p.action = ''; stat(c, 'fitness', 2.5 - L.stats.fitness / 80); stat(c, 'health', 1); stat(c, 'happy', 2); skill(c, 'fitness', 2); if (kind === 'weights') skill(c, 'combat', 0.5); c.needs.energy = clamp(c.needs.energy - 0.25, 0, 1); c.needs.hunger = clamp(c.needs.hunger - 0.15, 0, 1); g.toast(kind === 'weights' ? 'You hit a new personal best.' : 'Five miles on the treadmill. Your legs are jelly.'); } });
    void biz;
  }

  reception(I, biz) {
    const g = this.game, c = this.c, W = this.W, L = ensureLife(c, W);
    const key = I.key;
    if (key === 'hospital') {
      const cost = Math.round(120 + (100 - L.stats.health) * 25);
      if (L.stats.health > 92 && !c.injured) { g.toast('The nurse says you look perfectly healthy.'); return; }
      const pay = c.job && c.job.wage > 20 ? Math.round(cost * 0.2) : cost;
      if (c.money + (c.bank || 0) < pay) { g.toast(`Treatment costs ${money(pay)}. You can't afford it.`); return; }
      this.startTimed('treat', 120, { onDone: () => { if (c.money >= pay) c.money -= pay; else c.bank -= pay - c.money, c.money = 0; L.stats.health = Math.max(L.stats.health, 90); c.health = 1; c.injured = 0; g.toast(`Treated and discharged. Bill: ${money(pay)}${pay < cost ? ' (insurance covered the rest)' : ''}.`); } });
      return;
    }
    if (key === 'police') { const fines = L.fines || 0; if (fines > 0 && c.money >= fines) { c.money -= fines; L.fines = 0; g.toast(`You pay ${money(fines)} in fines.`); } else g.toast(fines ? `You owe ${money(fines)} in fines.` : 'The desk sergeant asks if you want to report a crime. You don\'t.'); return; }
    if (key === 'school' && biz && biz.type === 'college') { this.admissions(); return; }
    if (key === 'gym' || key === 'hotel' || key === 'autoshop') {
      if (key === 'autoshop') { const v = c.vehicle != null ? W.traffic.byId.get(c.vehicle) : null; if (!v || v.damage < 0.05) { g.toast('Your car doesn\'t need repairs.'); return; } const cost = Math.round(200 + v.damage * 3000); if (c.money < cost) { g.toast(`Repairs would cost ${money(cost)}.`); return; } c.money -= cost; if (biz) biz.cash += cost; v.damage = 0; g.toast(`Your ${v.T.label} is fixed (${money(cost)}).`); return; }
      this.shop(biz, { kind: 'counter' }); return;
    }
    if (key === 'office') {
      const open = biz ? W.economy.openJobs((j) => j.biz === biz.id) : [];
      g.toast(open.length ? `"We're hiring ${open.length} position${open.length > 1 ? 's' : ''}. Apply online from home."` : '"No openings right now, sorry."', 5);
      return;
    }
    g.toast('"Can I help you?"');
  }

  admissions() {
    const g = this.game, c = this.c, W = this.W, L = ensureLife(c, W);
    const render = () => `<p>Education: <b>${L.edu.level}</b>${L.edu.degrees.length ? ' · ' + L.edu.degrees.map(esc).join(', ') : ''}${L.edu.enrolled ? ` · Enrolled: ${PROGRAMS.find((p) => p.id === L.edu.enrolled).name} (${L.edu.credits}/${L.edu.need})` : ''}</p>
      <div class="menu">${PROGRAMS.map((p) => `<div class="prog"><span><b>${p.name}</b><br><small>${p.credits} classes · ${money(p.tuition)}${p.minSmarts ? ` · smarts ${p.minSmarts}+` : ''}</small></span><button data-e="${p.id}">Pay</button><button data-l="${p.id}">Loan</button></div>`).join('')}</div><p class="gmsg"></p>`;
    openPanel(g, {
      title: '🎓 Silver River College — Admissions', html: render(),
      onBind(api) {
        const msg = (t) => { api.el.querySelector('.gmsg').textContent = t; };
        api.el.querySelectorAll('[data-e],[data-l]').forEach((b) => b.onclick = () => { const err = enroll(c, b.dataset.e || b.dataset.l, W, !!b.dataset.l); if (err) msg(err); else { api.set(render()); msg('Enrolled! Attend lectures here on weekdays to earn credits.'); } });
      },
    });
  }

  robRegister(I, biz) {
    const g = this.game, c = this.c, W = this.W;
    c.flags.crime = { type: 'robbery', biz: biz.id };
    W.incidents.executeCrime(c);
    g.toast('The clerk hits the alarm. Police are coming — run!');
    g.audio && g.audio.alarm();
    for (const f of I.figs.values()) if (I.room.spots[f.spot].type === 'staff') f.action = 'hail';
  }

  rideMetro(I, id) {
    const g = this.game, c = this.c, W = this.W;
    const b = I.b;
    if (!W.power.isPoweredAt(b.x, b.z)) { g.toast('Trains stopped — blackout.'); return; }
    if (!g.interiors.trainIn) { g.toast('Wait for the train to pull in.'); return; }
    W.citizenAI.placeInside(c, id);
    c.money -= 2.5;
    const nb = W.city.buildings[id];
    g.interiors.enter(nb, c, true);
    g.toast(`You ride the metro to ${nb.name}.`);
  }

  elevator(I) {
    const g = this.game, c = this.c, W = this.W;
    const b = I.b;
    const opts = [];
    if (b.residents.includes(c.id)) opts.push({ label: 'Your apartment', fn: () => g.interiors.enter(b, c, true, { home: true }) });
    for (const id of b.residents) {
      if (id === c.id) continue;
      const o = W.citizens[id];
      const r = c.rel[id];
      if (!o || !r || (r.t !== 'friend' && r.t !== 'partner' && r.t !== 'family' && r.a < 0.4)) continue;
      opts.push({ label: `Visit ${o.name}${o.at === b.id ? '' : ' (not home)'}`, fn: () => { if (o.at !== b.id) { g.toast(`${o.first} isn't home.`); return; } g.interiors.enter(b, c, true, { key: 'apartment', unitOf: o.id }); g.toast(`${o.first} lets you in.`); } });
    }
    if (!opts.length) { g.toast('You need a key fob — you don\'t know anyone who lives here.'); return; }
    if (opts.length === 1) { opts[0].fn(); return; }
    const api = openPanel(g, { title: '🛗 Elevator', html: `<div class="menu">${opts.map((o, i) => `<button data-i="${i}">${esc(o.label)}</button>`).join('')}</div>`, onBind(a) { a.el.querySelectorAll('[data-i]').forEach((bt) => bt.onclick = () => { a.close(); opts[+bt.dataset.i].fn(); }); } });
    void api;
  }

  // a stranger strikes up a conversation (clubs, bars, VIP)
  meetSomeone(I, rich) {
    const g = this.game, c = this.c, W = this.W;
    const figs = Array.from(I.figs.values()).map((f) => W.citizens[f.cid]).filter((o) => o && o.id !== c.id && o.age >= 18 && Math.abs(o.age - c.age) < 18 && (!rich || o.money > 3000));
    if (!figs.length) return;
    const o = rand.pick(figs);
    W.citizenAI.addAff(c, o, 0.12, 'acq');
    g.toast(`${o.first} ${rand.pick(['catches your eye and comes over', 'asks if you come here often', 'compliments your moves', 'buys you a drink'])}. (T to talk)`, 5);
  }
}
