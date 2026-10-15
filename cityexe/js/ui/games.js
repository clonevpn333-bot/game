// Casino games with real rules and real money. Winnings come out of the casino's
// cash and losses go into it; the house edge is the genuine one for each game.
import { openPanel, money } from './panels.js';
import { ensureLife, stat } from '../sim/lifeState.js';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const BETS = [5, 25, 100, 500];

function settle(game, biz, delta) {
  const c = game.possession.c;
  c.money += delta;
  if (biz) { biz.cash -= delta; biz.revToday -= delta; }
  const L = ensureLife(c, game.world);
  L.gambled = (L.gambled || 0) + Math.abs(delta);
  L.addictions.gambling = Math.min(100, (L.addictions.gambling || 0) + 0.6);
  if (delta > 0) stat(c, 'happy', Math.min(6, delta / 200)); else if (delta < 0) stat(c, 'happy', -Math.min(4, -delta / 300));
  if (delta >= 5000) game.world.history.citizenLog(c, `Won ${money(delta)} at ${biz ? biz.name : 'the casino'}`, true);
}
const card = (cd) => cd ? `<span class="card ${cd.s === '♥' || cd.s === '♦' ? 'red' : ''}">${cd.r}<i>${cd.s}</i></span>` : '<span class="card back"></span>';
const betRow = (cur, max) => `<div class="bets">${BETS.map((b) => `<button class="${b === cur ? 'pri' : ''}" data-bet="${b}" ${b > max ? 'disabled' : ''}>${money(b)}</button>`).join('')}</div>`;

function shoe(decks = 6) {
  const s = [];
  for (let d = 0; d < decks; d++) for (const su of SUITS) for (const r of RANKS) s.push({ r, s: su });
  for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; }
  return s;
}
const bjVal = (cs) => { let t = 0, a = 0; for (const c of cs) { if (c.r === 'A') { a++; t += 11; } else t += ['J', 'Q', 'K'].includes(c.r) ? 10 : +c.r; } while (t > 21 && a) { t -= 10; a--; } return { t, soft: a > 0 }; };

export function blackjack(game, biz) {
  const c = game.possession.c;
  let bet = 25, deck = shoe(), P = [], D = [], phase = 'bet', msg = 'Place your bet. Dealer stands on soft 17. Blackjack pays 3:2.', doubled = false;
  const draw = () => { if (deck.length < 60) deck = shoe(); return deck.pop(); };
  const render = () => {
    const pv = bjVal(P), dv = bjVal(D);
    return `<div class="table felt"><div class="hand"><b>Dealer</b> ${D.map((x, i) => (phase === 'play' && i === 1 ? card(null) : card(x))).join('')} ${phase !== 'play' && D.length ? `<em>${dv.t}</em>` : ''}</div>
      <div class="hand"><b>You</b> ${P.map(card).join('')} ${P.length ? `<em>${pv.t}</em>` : ''}</div></div>
      <p class="gmsg">${msg}</p><p class="muted">Cash: ${money(c.money)} · Bet: ${money(bet)}</p>
      ${phase === 'play' ? `<div class="btns"><button class="pri" data-a="hit">Hit</button><button data-a="stand">Stand</button>${P.length === 2 && c.money >= bet ? '<button data-a="double">Double</button>' : ''}</div>` : `${betRow(bet, c.money)}<div class="btns"><button class="pri" data-a="deal" ${c.money < bet ? 'disabled' : ''}>Deal</button></div>`}`;
  };
  const finish = () => {
    phase = 'done';
    while (bjVal(D).t < 17 || (bjVal(D).t === 17 && bjVal(D).soft)) D.push(draw());
    const p = bjVal(P).t, d = bjVal(D).t, b = bet * (doubled ? 2 : 1);
    let delta;
    if (p > 21) { delta = -b; msg = 'Bust.'; }
    else if (d > 21 || p > d) { delta = b; msg = d > 21 ? 'Dealer busts — you win!' : 'You win!'; }
    else if (p === d) { delta = 0; msg = 'Push.'; }
    else { delta = -b; msg = 'Dealer wins.'; }
    settle(game, biz, delta);
    if (delta) msg += ` (${delta > 0 ? '+' : ''}${money(delta)})`;
  };
  openPanel(game, {
    title: '♠ Blackjack', cls: 'game', html: render(),
    onBind(api) {
      api.el.querySelectorAll('[data-bet]').forEach((b) => b.onclick = () => { bet = +b.dataset.bet; api.set(render()); });
      api.el.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => {
        const a = b.dataset.a;
        if (a === 'deal') {
          P = [draw(), draw()]; D = [draw(), draw()]; doubled = false; phase = 'play'; msg = 'Hit or stand?';
          const pv = bjVal(P).t, dv = bjVal(D).t;
          if (pv === 21 || dv === 21) { phase = 'done'; const delta = pv === 21 && dv !== 21 ? Math.round(bet * 1.5) : pv === 21 ? 0 : -bet; msg = pv === 21 && dv !== 21 ? 'BLACKJACK!' : dv === 21 && pv !== 21 ? 'Dealer has blackjack.' : 'Push.'; settle(game, biz, delta); if (delta) msg += ` (${delta > 0 ? '+' : ''}${money(delta)})`; }
        }
        if (a === 'hit') { P.push(draw()); if (bjVal(P).t > 21) finish(); else if (bjVal(P).t === 21) finish(); }
        if (a === 'stand') finish();
        if (a === 'double') { doubled = true; P.push(draw()); finish(); }
        api.set(render());
      });
    },
  });
}

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export function roulette(game, biz) {
  const c = game.possession.c;
  let bet = 25, sel = 'red', last = [], msg = 'European wheel, single zero. Pick a bet and spin.', spinning = false, shown = null;
  const opts = [['red', 'Red', 1], ['black', 'Black', 1], ['odd', 'Odd', 1], ['even', 'Even', 1], ['low', '1–18', 1], ['high', '19–36', 1], ['d1', '1st 12', 2], ['d2', '2nd 12', 2], ['d3', '3rd 12', 2]];
  const wins = (n, s) => {
    if (s.startsWith('n')) return n === +s.slice(1) ? 35 : -1;
    if (n === 0) return -1;
    const o = { red: RED.has(n), black: !RED.has(n), odd: n % 2 === 1, even: n % 2 === 0, low: n <= 18, high: n >= 19, d1: n <= 12, d2: n > 12 && n <= 24, d3: n > 24 }[s];
    return o ? opts.find((x) => x[0] === s)[2] : -1;
  };
  const numCls = (n) => n === 0 ? 'g' : RED.has(n) ? 'r' : 'b';
  const render = () => `<div class="table felt"><div class="wheel"><span class="ball ${shown == null ? '' : numCls(shown)}">${shown ?? '–'}</span></div>
    <div class="hist">${last.map((n) => `<span class="${numCls(n)}">${n}</span>`).join('')}</div>
    <div class="rgrid">${opts.map(([k, l]) => `<button class="${sel === k ? 'pri' : ''}" data-s="${k}">${l}</button>`).join('')}</div>
    <div class="rnums">${Array.from({ length: 37 }, (_, n) => `<button class="${numCls(n)} ${sel === 'n' + n ? 'sel' : ''}" data-s="n${n}">${n}</button>`).join('')}</div></div>
    <p class="gmsg">${msg}</p><p class="muted">Cash: ${money(c.money)} · Bet: ${money(bet)} on ${sel.startsWith('n') ? 'number ' + sel.slice(1) + ' (35:1)' : opts.find((x) => x[0] === sel)[1]}</p>
    ${betRow(bet, c.money)}<div class="btns"><button class="pri" data-spin ${c.money < bet || spinning ? 'disabled' : ''}>Spin</button></div>`;
  openPanel(game, {
    title: '◎ Roulette', cls: 'game', html: render(),
    onBind(api) {
      api.el.querySelectorAll('[data-bet]').forEach((b) => b.onclick = () => { bet = +b.dataset.bet; api.set(render()); });
      api.el.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => { if (!spinning) { sel = b.dataset.s; api.set(render()); } });
      const sp = api.el.querySelector('[data-spin]');
      if (sp) sp.onclick = () => {
        spinning = true; msg = 'No more bets…';
        const n = Math.floor(Math.random() * 37);
        let k = 0;
        const iv = setInterval(() => { shown = Math.floor(Math.random() * 37); api.set(render()); if (++k > 14) { clearInterval(iv); shown = n; spinning = false; last = [n, ...last].slice(0, 12); const w = wins(n, sel); const delta = w > 0 ? bet * w : -bet; settle(game, biz, delta); msg = `${n} ${n === 0 ? 'green' : RED.has(n) ? 'red' : 'black'} — ${delta > 0 ? 'you win ' + money(delta) + '!' : 'you lose ' + money(-delta) + '.'}`; api.set(render()); } }, 90);
      };
    },
  });
}

const SYMS = [['🍒', 30, 4], ['🍋', 25, 7], ['🔔', 18, 14], ['⭐', 12, 28], ['💎', 6, 70], ['7', 3, 250]]; // ~93% return
export function slots(game, biz) {
  const c = game.possession.c;
  let bet = 5, reels = ['7', '7', '7'], msg = 'Three of a kind pays; any two cherries pay 1×.', spinning = false;
  const tot = SYMS.reduce((a, s) => a + s[1], 0);
  const roll = () => { let r = Math.random() * tot; for (const s of SYMS) { if ((r -= s[1]) < 0) return s[0]; } return SYMS[0][0]; };
  const render = () => `<div class="slots"><div class="reels">${reels.map((r) => `<span>${r}</span>`).join('')}</div>
    <div class="paytable">${SYMS.map(([s, , p]) => `<span>${s}${s}${s} = ${p}×</span>`).join('')}<span>🍒🍒 = 1×</span></div></div>
    <p class="gmsg">${msg}</p><p class="muted">Cash: ${money(c.money)} · Bet: ${money(bet)}</p>
    <div class="bets">${[1, 5, 25, 100].map((b) => `<button class="${b === bet ? 'pri' : ''}" data-bet="${b}" ${b > c.money ? 'disabled' : ''}>${money(b)}</button>`).join('')}</div>
    <div class="btns"><button class="pri" data-spin ${c.money < bet || spinning ? 'disabled' : ''}>Pull the lever</button></div>`;
  openPanel(game, {
    title: '🎰 Slots', cls: 'game', html: render(),
    onBind(api) {
      api.el.querySelectorAll('[data-bet]').forEach((b) => b.onclick = () => { bet = +b.dataset.bet; api.set(render()); });
      const sp = api.el.querySelector('[data-spin]');
      if (sp) sp.onclick = () => {
        spinning = true;
        const fin = [roll(), roll(), roll()];
        let k = 0;
        const iv = setInterval(() => {
          k++;
          reels = reels.map((r, i) => (k > 6 + i * 4 ? fin[i] : roll()));
          if (k > 15) {
            clearInterval(iv); spinning = false;
            let mult = 0;
            if (fin[0] === fin[1] && fin[1] === fin[2]) mult = SYMS.find((s) => s[0] === fin[0])[2];
            else if (fin.filter((x) => x === '🍒').length === 2) mult = 1;
            const delta = mult ? bet * mult : -bet;
            settle(game, biz, delta);
            msg = mult >= 25 ? `JACKPOT! ${money(delta)}!` : mult ? `Winner: ${money(delta)}` : 'No luck.';
          }
          api.set(render());
        }, 70);
      };
    },
  });
}

// Three Card Poker: ante, then play (= ante) or fold. Dealer qualifies with Q-high.
const rv = (r) => RANKS.indexOf(r) === 0 ? 14 : RANKS.indexOf(r) + 1;
function tcpRank(h) {
  const v = h.map((c) => rv(c.r)).sort((a, b) => b - a);
  const flush = h.every((c) => c.s === h[0].s);
  const straight = (v[0] - v[1] === 1 && v[1] - v[2] === 1) || (v[0] === 14 && v[1] === 3 && v[2] === 2);
  const trips = v[0] === v[1] && v[1] === v[2];
  const pair = v[0] === v[1] || v[1] === v[2];
  const cat = straight && flush ? 5 : trips ? 4 : straight ? 3 : flush ? 2 : pair ? 1 : 0;
  const pv = pair ? (v[0] === v[1] ? v[0] : v[1]) : 0;
  return { cat, key: cat * 1e6 + pv * 1e4 + v[0] * 400 + v[1] * 20 + v[2], name: ['High card', 'Pair', 'Flush', 'Straight', 'Three of a kind', 'Straight flush'][cat], hi: v[0] };
}
export function poker(game, biz) {
  const c = game.possession.c;
  let ante = 25, P = [], D = [], phase = 'bet', msg = 'Three Card Poker: ante, see your cards, then play or fold. Dealer needs queen-high.';
  const render = () => `<div class="table felt"><div class="hand"><b>Dealer</b> ${D.map((x) => (phase === 'play' ? card(null) : card(x))).join('')} ${phase === 'done' ? `<em>${tcpRank(D).name}</em>` : ''}</div>
    <div class="hand"><b>You</b> ${P.map(card).join('')} ${P.length ? `<em>${tcpRank(P).name}</em>` : ''}</div></div>
    <p class="gmsg">${msg}</p><p class="muted">Cash: ${money(c.money)} · Ante: ${money(ante)}</p>
    ${phase === 'play' ? `<div class="btns"><button class="pri" data-a="play" ${c.money < ante ? 'disabled' : ''}>Play (${money(ante)})</button><button data-a="fold">Fold</button></div>` : `${betRow(ante, c.money / 2)}<div class="btns"><button class="pri" data-a="deal" ${c.money < ante * 2 ? 'disabled' : ''}>Deal</button></div>`}`;
  openPanel(game, {
    title: '♣ Three Card Poker', cls: 'game', html: render(),
    onBind(api) {
      api.el.querySelectorAll('[data-bet]').forEach((b) => b.onclick = () => { ante = +b.dataset.bet; api.set(render()); });
      api.el.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => {
        const a = b.dataset.a;
        if (a === 'deal') { const d = shoe(1); P = [d.pop(), d.pop(), d.pop()]; D = [d.pop(), d.pop(), d.pop()]; phase = 'play'; msg = 'Play or fold?'; }
        else if (a === 'fold') { phase = 'done'; settle(game, biz, -ante); msg = `You fold and lose the ante (${money(-ante)}).`; }
        else if (a === 'play') {
          phase = 'done';
          const p = tcpRank(P), d = tcpRank(D);
          const bonus = p.cat === 5 ? 5 : p.cat === 4 ? 4 : p.cat === 3 ? 1 : 0;
          let delta;
          if (d.hi < 12 && d.cat === 0) { delta = ante + bonus * ante; msg = 'Dealer doesn\'t qualify — ante pays, play pushes.'; }
          else if (p.key > d.key) { delta = 2 * ante + bonus * ante; msg = `${p.name} beats ${d.name}!`; }
          else if (p.key === d.key) { delta = bonus * ante; msg = 'Tie.'; }
          else { delta = -2 * ante + bonus * ante; msg = `${d.name} beats your ${p.name.toLowerCase()}.`; }
          settle(game, biz, delta);
          msg += ` (${delta >= 0 ? '+' : ''}${money(delta)})`;
        }
        api.set(render());
      });
    },
  });
}
