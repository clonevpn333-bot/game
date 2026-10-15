// Life mode UI: title screen, character creator, the life HUD, your phone (P),
// your home computer (jobs, college, housing, cars, bank, social feed,
// underground board), conversations, life-event cards and the end of a life.
import { openPanel, money, esc } from './panels.js';
import { BACKGROUNDS, START_TRAITS } from '../sim/life.js';
import { ensureLife } from '../sim/lifeState.js';
import { persona, personaSummary, talk } from '../sim/persona.js';
import { meets, interviewChance, PROGRAMS, enroll } from '../sim/careers.js';
import { BTYPES, ROLE_TITLE } from '../sim/economy.js';
import { DISTRICTS } from '../sim/config.js';
import { formOf } from '../core/names.js';
import { rand } from '../core/rng.js';
import { clamp, dist } from '../core/math.js';

const SKINS = ['#f2d0b8', '#e8b896', '#d29a72', '#b07a52', '#8a5a3a', '#5e3a24', '#3e2618'];
const HAIRS = ['#1a1410', '#3a2618', '#6a4428', '#a8743a', '#d8b060', '#e8d8a8', '#8a2a1a', '#c8c8c4'];
const CARS = [['hatch', 'Hatchback', 14000], ['sedan', 'Sedan', 22000], ['suv', 'SUV', 34000], ['pickup', 'Pickup truck', 31000], ['sports', 'Sports car', 78000], ['oldsedan', 'Used sedan', 4500], ['oldpickup', 'Used pickup', 5200]];

export class LifeUI {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('ui');
    this.hud = document.createElement('div');
    this.hud.id = 'life-hud';
    this.hud.className = 'hidden';
    this.root.appendChild(this.hud);
    this.t = 0;
    this.W.on('lifeMsg', ({ icon, text }) => { if (this.game.lifeMode) this.game.toast(`${icon} ${text}`, 5); });
    this.W.on('playerDied', ({ c, cause }) => this.onDeath(c, cause));
    game.on('wake', (c) => this.wakeCard(c));
    addEventListener('keydown', (e) => {
      if (!this.game.lifeMode || document.querySelector('.panel-modal') || e.target.tagName === 'INPUT') return;
      if (e.code === 'KeyP' && this.game.mode === 'possess') { e.preventDefault(); this.openPhone(); }
    });
  }
  get W() { return this.game.world; }
  get L() { return this.W.life; }
  get c() { return this.L.player; }

  // ---------------------------------------------------------------- title & creator
  title(onSandbox) {
    const api = openPanel(this.game, {
      title: '', cls: 'title-screen', closable: false,
      html: `<div class="ttl">CITY<span>.EXE</span></div><p class="tsub">${this.W.citizens.length.toLocaleString()} people live here. Every one of them has a home, a family, a job or not, friends, enemies, a personality and a past. Now one of them is you.</p>
        <div class="tbtns"><button class="pri big" data-life>▶ Live a life</button><button class="big" data-sand>👁 Watch the city (sandbox)</button></div>
        <p class="muted small">Life mode: you are born into a real family in this city. Get a job (apply from your computer), go to college, fall in love, raise kids, get rich, go broke, win the lottery, rob a bank… or just watch everyone else live.</p>`,
      onBind: (a) => {
        a.el.querySelector('[data-life]').onclick = () => { a.close(); this.creator(); };
        a.el.querySelector('[data-sand]').onclick = () => { a.close(); onSandbox && onSandbox(); };
      },
    });
    return api;
  }

  creator() {
    const s = { first: '', form: rand.chance(0.5) ? 1 : 0, skin: rand.pick(SKINS), hair: rand.pick(HAIRS), hairStyle: rand.int(0, 3), background: 'working', age: 18, traits: [] };
    const render = () => `<div class="creator">
      <div class="crow"><label>First name</label><input id="cr-first" maxlength="16" placeholder="(random)" value="${esc(s.first)}"></div>
      <div class="crow"><label>Body</label>${[['0', 'Masculine'], ['1', 'Feminine']].map(([v, l]) => `<button class="${String(s.form) === v ? 'pri' : ''}" data-form="${v}">${l}</button>`).join('')}</div>
      <div class="crow"><label>Skin</label>${SKINS.map((c) => `<button class="sw ${s.skin === c ? 'sel' : ''}" style="background:${c}" data-skin="${c}"></button>`).join('')}</div>
      <div class="crow"><label>Hair</label>${HAIRS.map((c) => `<button class="sw ${s.hair === c ? 'sel' : ''}" style="background:${c}" data-hair="${c}"></button>`).join('')}</div>
      <div class="crow"><label>Style</label>${[['0', 'Short'], ['1', 'Long'], ['2', 'Bun'], ['3', 'Curls'], ['5', 'Buzz'], ['4', 'Bald']].map(([v, l]) => `<button class="${String(s.hairStyle) === v ? 'pri' : ''}" data-hs="${v}">${l}</button>`).join('')}</div>
      <div class="crow"><label>Age</label><input type="range" id="cr-age" min="18" max="30" value="${s.age}"><b id="cr-agev">${s.age}</b></div>
      <label class="clab">Where you start</label><div class="bgs">${Object.entries(BACKGROUNDS).map(([k, b]) => `<button class="bg ${s.background === k ? 'sel' : ''}" data-bg="${k}"><b>${b.label}</b><small>${b.desc}</small></button>`).join('')}</div>
      <label class="clab">Pick two traits</label><div class="trs">${Object.entries(START_TRAITS).map(([k, t]) => `<button class="${s.traits.includes(k) ? 'pri' : ''}" data-tr="${k}">${t.label}</button>`).join('')}</div>
      <div class="btns"><button data-rand>🎲 Random</button><button class="pri big" data-go>Begin this life →</button></div></div>`;
    openPanel(this.game, {
      title: 'Who are you?', cls: 'wide', closable: false, html: render(),
      onBind: (a) => {
        const q = (sel) => a.el.querySelectorAll(sel);
        a.el.querySelector('#cr-first').oninput = (e) => { s.first = e.target.value.replace(/[^A-Za-z' -]/g, ''); };
        a.el.querySelector('#cr-age').oninput = (e) => { s.age = +e.target.value; a.el.querySelector('#cr-agev').textContent = s.age; };
        q('[data-form]').forEach((b) => b.onclick = () => { s.form = +b.dataset.form; a.set(render()); });
        q('[data-skin]').forEach((b) => b.onclick = () => { s.skin = b.dataset.skin; a.set(render()); });
        q('[data-hair]').forEach((b) => b.onclick = () => { s.hair = b.dataset.hair; a.set(render()); });
        q('[data-hs]').forEach((b) => b.onclick = () => { s.hairStyle = +b.dataset.hs; a.set(render()); });
        q('[data-bg]').forEach((b) => b.onclick = () => { s.background = b.dataset.bg; a.set(render()); });
        q('[data-tr]').forEach((b) => b.onclick = () => { const t = b.dataset.tr; s.traits = s.traits.includes(t) ? s.traits.filter((x) => x !== t) : [...s.traits, t].slice(-2); a.set(render()); });
        a.el.querySelector('[data-rand]').onclick = () => { s.form = rand.chance(0.5) ? 1 : 0; s.skin = rand.pick(SKINS); s.hair = rand.pick(HAIRS); s.hairStyle = rand.int(0, 3); s.background = rand.pick(Object.keys(BACKGROUNDS)); s.age = rand.int(18, 26); s.traits = rand.shuffle(Object.keys(START_TRAITS)).slice(0, 2); a.set(render()); };
        a.el.querySelector('[data-go]').onclick = () => { a.close(); this.begin(s); };
      },
    });
  }

  begin(spec) {
    const c = this.L.createCharacter({ ...spec, first: spec.first.trim() || undefined });
    this.startLife(c, true);
  }

  // enter Life mode with this citizen (new life, resumed save, or an heir)
  startLife(c, intro = false) {
    const g = this.game;
    g.lifeMode = true;
    document.body.classList.add('life');
    this.hud.classList.remove('hidden');
    g.select({ kind: 'citizen', id: c.id });
    if (intro) { const p = this.W.citizenPos(c); if (p) g.rig.flyTo(p.x, p.z, 260); }
    setTimeout(() => g.possessSelected(), intro ? 900 : 50);
    if (intro) setTimeout(() => this.game.toast('Press P for your phone. Your computer is on the desk at home.', 7), 4000);
  }

  // ---------------------------------------------------------------- HUD
  update(dt) {
    if (!this.game.lifeMode) return;
    this.t += dt;
    if (this.t > 0.4) { this.t = 0; this.renderHud(); }
    // life events wait for a quiet moment
    if (this.L.pending.length && !document.querySelector('.panel-modal') && this.game.mode === 'possess' && !this.game.rig.trans && !this.game.activities.timed) {
      this.eventCard(this.L.pending.shift());
    }
  }
  renderHud() {
    const c = this.c;
    if (!c) { this.hud.innerHTML = ''; return; }
    this.hud.style.display = this.game.mode === 'possess' ? '' : 'none';
    const W = this.W, L = ensureLife(c, W), S = L.stats, N = c.needs;
    const bar = (v, col) => `<i style="width:${Math.round(clamp(v, 0, 100))}%;background:${col}"></i>`;
    const unread = this.L.inbox.filter((m) => !m.read).length;
    const job = c.job ? `${c.job.title || ROLE_TITLE[c.job.role] || c.job.role} · ${W.economy.biz[c.job.biz]?.name}` : L.edu.enrolled ? 'Student' : c.age >= 66 ? 'Retired' : 'Unemployed';
    const html = `<div class="lh-top"><div class="lh-av" style="background:${c.look.shirt}">${esc(c.first[0])}${esc(c.last[0])}</div><div><b>${esc(c.name)}</b><small>${c.age} · ${esc(job)}${this.L.gen > 1 ? ` · Gen ${this.L.gen}` : ''}</small></div></div>
      <div class="lh-money"><span>💵 ${money(c.money)}</span><span>🏦 ${money(c.bank || 0)}</span>${L.loans.length ? `<span class="neg">debt ${money(L.loans.reduce((a, l) => a + l.left, 0))}</span>` : ''}</div>
      <div class="lh-stats">${[['❤', S.health, '#e05a5a'], ['😊', S.happy, '#e8c040'], ['🧠', S.smarts, '#5aa0e8'], ['✨', S.looks, '#d070d0'], ['💪', S.fitness, '#50c080']].map(([ic, v, col]) => `<div title="${ic}"><em>${ic}</em><span class="b">${bar(v, col)}</span></div>`).join('')}</div>
      <div class="lh-needs">${[['Energy', N.energy], ['Hunger', N.hunger], ['Social', N.social], ['Fun', N.fun]].map(([n, v]) => `<div><em>${n}</em><span class="b">${bar(v * 100, v < 0.2 ? '#e05a5a' : '#8ab0c8')}</span></div>`).join('')}</div>
      <div class="lh-keys"><kbd>P</kbd> phone${unread ? ` <b class="badge">${unread}</b>` : ''} · <kbd>Q</kbd> watch the city</div>`;
    if (html !== this._h) { this._h = html; this.hud.innerHTML = html; }
  }

  wakeCard(c) {
    if (!this.game.lifeMode || c.id !== this.L.pid) return;
    const W = this.W;
    const today = [];
    if (c.job && c.job.days[W.day % 7]) today.push(`Work at ${W.economy.biz[c.job.biz].name} ${Math.floor(c.job.shift[0] / 60 % 24)}:00`);
    if (c.life.edu.enrolled && W.day % 7 < 5) today.push('Lectures at the college');
    const unread = this.L.inbox.filter((m) => !m.read).length;
    this.game.toast(`☀ ${W.history.dateStr(W.time)} · ${W.weather.label ? W.weather.label() : ''} ${today.length ? '· ' + today.join(' · ') : '· Day off'}${unread ? ` · ${unread} new message${unread > 1 ? 's' : ''} (P)` : ''}`, 7);
  }

  eventCard(ev) {
    const g = this.game;
    openPanel(g, {
      title: '', cls: 'event-card', closable: false,
      html: `<div class="ev-text">${esc(ev.text)}</div><div class="ev-ch">${ev.choices.map(([l], i) => `<button class="${i === 0 ? 'pri' : ''}" data-i="${i}">${esc(l)}</button>`).join('')}</div>`,
      onBind: (a) => {
        a.el.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => {
          const res = ev.choices[+b.dataset.i][1]();
          a.set(`<div class="ev-text">${esc(ev.text)}</div><div class="ev-res">${esc(res || '')}</div><div class="btns"><button class="pri" data-close>OK</button></div>`);
        });
      },
    });
  }

  // ---------------------------------------------------------------- phone
  openPhone(tab = 'home') {
    const g = this.game, W = this.W, c = this.c, Ls = this.L;
    if (!c) return;
    let cur = tab;
    const apps = [['messages', '💬', 'Messages'], ['contacts', '👥', 'Contacts'], ['gps', '🗺', 'GPS'], ['bank', '🏦', 'Bank'], ['lotto', '🎟', 'Lotto'], ['life', '📊', 'My life'], ['news', '📰', 'News']];
    const render = () => {
      let body = '';
      if (cur === 'home') body = `<div class="apps">${apps.map(([k, ic, n]) => `<button data-app="${k}"><span>${ic}</span>${n}${k === 'messages' && Ls.inbox.some((m) => !m.read) ? '<b class="badge">•</b>' : ''}</button>`).join('')}</div>`;
      if (cur === 'messages') { body = `<div class="msgs">${Ls.inbox.slice().reverse().map((m) => `<div class="msg ${m.read ? '' : 'new'}"><span>${m.icon}</span><div>${esc(m.text)}<small>${W.history.dateStr(m.t)} ${W.history.timeStr(m.t)}</small></div></div>`).join('') || '<p class="muted">No messages.</p>'}</div>`; for (const m of Ls.inbox) m.read = true; }
      if (cur === 'contacts') {
        const fam = Ls.family();
        const others = Object.entries(c.rel).filter(([id, r]) => (r.t === 'friend' || r.t === 'coworker' || r.t === 'ex' || r.t === 'enemy' || r.a > 0.3) && !fam.some((f) => f.o.id === +id)).map(([id, r]) => ({ o: W.citizens[id], role: r.t })).filter((x) => x.o && x.o.status !== 'dead' && x.o.status !== 'left').sort((a, b) => c.rel[b.o.id].a - c.rel[a.o.id].a).slice(0, 30);
        const row = ({ o, role }) => { const r = c.rel[o.id]; return `<button class="contact" data-call="${o.id}"><span class="av" style="background:${o.look.shirt}">${esc(o.first[0])}</span><span class="cn"><b>${esc(o.name)}</b><small>${esc(role)} · ${o.status === 'dead' ? 'deceased' : o.age}</small></span><span class="rb"><i style="width:${Math.round(clamp((r?.a ?? 0) * 100, 0, 100))}%"></i></span></button>`; };
        body = `<h4>Family</h4>${fam.map(row).join('') || '<p class="muted">—</p>'}<h4>People you know</h4>${others.map(row).join('') || '<p class="muted">Go meet people!</p>'}`;
      }
      if (cur === 'gps') {
        const p = W.citizenPos(c) || { x: 0, z: 0 };
        const near = (type, n = 1) => W.economy.ofType(type).map((b) => ({ biz: b, b: W.city.buildings[b.b] })).sort((a, b) => dist(a.b.x, a.b.z, p.x, p.z) - dist(b.b.x, b.b.z, p.x, p.z)).slice(0, n);
        const dest = [['Home', W.city.buildings[c.home]]];
        if (c.job) dest.push(['Work', W.city.buildings[W.economy.biz[c.job.biz].b]]);
        for (const [t, label] of [['college', 'College'], ['bank', 'Bank'], ['grocery', 'Grocery'], ['convenience', 'Convenience store'], ['nightclub', 'Nightclub'], ['lounge', 'Lounge'], ['casino', 'Casino'], ['bar', 'Bar'], ['gym', 'Gym'], ['hospital', 'Hospital'], ['police', 'Police station'], ['gunstore', 'Gun store'], ['clothing', 'Clothing store'], ['mall', 'Mall']]) for (const { b } of near(t)) dest.push([label, b]);
        body = `<div class="gps">${dest.filter(([, b]) => b).map(([l, b], i) => `<button data-wp="${i}"><b>${l}</b><small>${esc(W.citizenAI.buildingName(b.id))} · ${Math.round(dist(b.x, b.z, p.x, p.z))} m</small></button>`).join('')}${g.waypoint ? '<button data-wp="x" class="danger">Clear route</button>' : ''}</div>`;
        this._dest = dest;
      }
      if (cur === 'bank') {
        const L = ensureLife(c, W);
        body = `<div class="bankapp"><p>Checking: <b>${money(c.bank || 0)}</b></p><p>Cash on you: <b>${money(c.money)}</b></p>${L.loans.map((l) => `<p class="muted">${l.kind} loan: ${money(l.left)} left (${money(l.daily)}/day)</p>`).join('')}<p class="muted">Transfers to family:</p>${Ls.family().filter((f) => f.o.status !== 'dead').map((f) => `<button data-send="${f.o.id}">Send $100 to ${esc(f.o.first)} (${f.role})</button>`).join('')}</div>`;
      }
      if (cur === 'lotto') {
        const LT = W.lottery;
        const mine = LT.tickets.filter((t) => t.cid === c.id);
        body = `<p>Next draw 20:00 · Jackpot <b>${money(LT.jackpot)}</b></p><p class="muted">Your tickets: ${mine.length ? mine.map((t) => t.nums.join('-')).join(' · ') : 'none — buy at a convenience store or gas station'}</p>${LT.history.slice(-5).reverse().map((h) => `<p><b>Day ${h.day + 1}:</b> ${h.nums.join(' – ')} <small class="muted">${h.sold} tickets · ${h.winners.filter((w) => w.m >= 4).length} winners${h.winners.some((w) => w.m === 6) ? ' · JACKPOT' : ''}</small></p>`).join('')}`;
      }
      if (cur === 'life') body = this.lifeSummary(c);
      if (cur === 'news') body = `<div class="news">${W.history.events.slice(-14).reverse().map((e) => `<p><small>${W.history.dateStr(e.t)} ${W.history.timeStr(e.t)}</small> ${esc(e.text)}</p>`).join('')}</div>`;
      return `<div class="phone"><div class="ph-bar"><span>${W.history.timeStr(W.time)}</span><span>${cur !== 'home' ? '<button data-app="home">◀</button>' : ''}</span><span>🔋</span></div><div class="ph-body">${body}</div></div>`;
    };
    openPanel(g, {
      title: '', cls: 'phone-modal', html: render(),
      onBind: (a) => {
        a.el.querySelectorAll('[data-app]').forEach((b) => b.onclick = () => { cur = b.dataset.app; a.set(render()); });
        a.el.querySelectorAll('[data-call]').forEach((b) => b.onclick = () => { a.close(); this.openTalk(W.citizens[+b.dataset.call], null, true); });
        a.el.querySelectorAll('[data-wp]').forEach((b) => b.onclick = () => { if (b.dataset.wp === 'x') g.waypoint = null; else { const [l, bb] = this._dest[+b.dataset.wp]; g.waypoint = { x: bb.door[0], z: bb.door[1], b: bb.id, label: `${l} (${W.citizenAI.buildingName(bb.id)})` }; g.toast(`Route set: ${l}`); } a.close(); });
        a.el.querySelectorAll('[data-send]').forEach((b) => b.onclick = () => { const o = W.citizens[+b.dataset.send]; if ((c.bank || 0) >= 100) { c.bank -= 100; o.money += 100; W.citizenAI.addAff(c, o, 0.05); g.toast(`Sent $100 to ${o.first}.`); } a.set(render()); });
      },
    });
  }

  lifeSummary(c) {
    const W = this.W, L = ensureLife(c, W);
    const assets = [];
    if (c.vehicle != null) { const v = W.traffic.byId.get(c.vehicle); if (v) assets.push(`${v.T.label} (${v.plate || ''})`); }
    for (const id of L.owns || []) assets.push(W.citizenAI.buildingName(id));
    for (const k of ['phone', 'laptop', 'console']) if (L.inv[k]) assets.push(k);
    const P = persona(c);
    return `<div class="lifesum"><p><b>${esc(c.name)}</b>, ${c.age} · ${esc(P.archetype)}</p>
      <p>🏠 ${esc(W.citizenAI.homeName(c))}${L.withParents ? ' (with your parents)' : ''}</p>
      <p>🎓 ${esc(L.edu.degrees.join(', ') || 'No diploma')}${L.edu.enrolled ? ` · studying ${esc(PROGRAMS.find((p) => p.id === L.edu.enrolled)?.name || '')} (${L.edu.credits}/${L.edu.need})` : ''}</p>
      <p>💼 ${c.job ? `${esc(c.job.title || ROLE_TITLE[c.job.role] || c.job.role)} at ${esc(W.economy.biz[c.job.biz]?.name)} — $${Math.round(c.job.wage)}/h · performance ${Math.round(L.perf || 50)}%` : 'Unemployed'}</p>
      <p>⚖ Record: ${c.record.arrests} arrest(s), ${c.record.crimes} crime(s)${L.fines ? ` · fines owed ${money(L.fines)}` : ''}</p>
      <p>⭐ Karma ${Math.round(L.stats.karma)} · Fame ${L.fame || 0}</p>
      <p>📦 ${assets.map(esc).join(', ') || 'No assets'}</p>
      <h4>Skills</h4><div class="skills">${Object.entries(L.skills).map(([k, v]) => `<span>${k} <b>${Math.round(v)}</b></span>`).join('')}</div>
      <h4>Your story</h4><ul class="log">${c.log.slice(-12).reverse().map((e) => `<li class="${e.major ? 'major' : ''}"><small>${W.history.dateStr(e.t)}</small> ${esc(e.text)}</li>`).join('')}</ul></div>`;
  }

  // ---------------------------------------------------------------- talking
  openTalk(o, fig, remote = false) {
    const g = this.game, W = this.W, c = this.c || g.possession.c;
    if (!o || !c) return;
    if (o.status === 'dead') { g.toast(`${o.first} has passed away.`); return; }
    const Ls = this.L;
    const lines = [];
    const rel = () => c.rel[o.id];
    const say = (who, text) => lines.push({ who, text });
    const r0 = talk(W, o, c, 'greet');
    say(o.first, r0.line);
    o.talks = (o.talks || 0) + 1;
    const kid = (c.kids || []).includes(o.id);
    const render = () => {
      const r = rel(); const a = r ? r.a : 0;
      const P = personaSummary(o);
      const known = (r && (r.a > 0.25 || r.t === 'family' || r.t === 'partner')) || o.talks > 3;
      const pr = W.citizenAI.partner(c);
      const isPartner = pr && pr.id === o.id;
      const opts = [];
      if (kid && o.age < 13) opts.push(['play', 'Play together'], ['read', 'Read a story']);
      else opts.push(['chat', 'Chat'], ['joke', 'Tell a joke'], ['compliment', 'Compliment'], ['ask_life', 'Ask about their life'], ['ask_job', 'Ask about work'], ['gossip', 'Gossip']);
      if (!kid && o.age >= 18 && c.age >= 18 && r?.t !== 'family') opts.push(['flirt', 'Flirt']);
      if (!remote) opts.push(['hangout', 'Hang out']);
      if (!isPartner && o.age >= 18 && r?.t !== 'family' && a > 0.3) opts.push(['date', '💕 Ask out']);
      if (isPartner) {
        if (Ls.player?.life.married !== o.id) opts.push(['propose', '💍 Propose']);
        if (o.home !== c.home) opts.push(['movein', '🏠 Move in together']);
        else opts.push(['baby', '👶 Try for a baby']);
        opts.push(['breakup', '💔 Break up']);
      }
      if (c.life?.inv.gift) opts.push(['gift', '🎁 Give a gift']);
      opts.push(['ask_money', 'Ask for money'], ['insult', 'Insult'], ['apologize', 'Apologize']);
      return `<div class="talk"><div class="tk-head"><span class="av big" style="background:${o.look.shirt}">${esc(o.first[0])}</span><div><b>${esc(o.name)}</b> <small>${o.age} · ${esc(W.citizenAI.jobTitle(o))}</small><div class="rb wide"><i style="width:${Math.round(clamp((a + 1) / 2 * 100, 0, 100))}%;background:${a < 0 ? '#e05a5a' : '#5ad08a'}"></i></div><small>${esc(r ? r.t : 'stranger')}${remote ? ' · on the phone' : ''}</small></div></div>
        ${known ? `<div class="persona"><b>${esc(P.archetype)}</b> · ${esc(P.traits.join(', '))}<br><small>Into ${esc(P.likes.join(', '))}. Can't stand ${esc(P.peeves.join(' or '))}. ${esc(P.backstory)}</small></div>` : '<div class="persona muted"><small>You don\'t know much about them yet.</small></div>'}
        <div class="chat">${lines.slice(-6).map((l) => `<p class="${l.who === 'You' ? 'me' : ''}"><b>${esc(l.who)}:</b> ${esc(l.text)}</p>`).join('')}</div>
        <div class="topts">${opts.map(([k, l]) => `<button data-t="${k}">${l}</button>`).join('')}</div></div>`;
    };
    const act = (k) => {
      const r = rel();
      if (k === 'date') {
        const P = persona(o);
        const taken = W.citizenAI.partner(o);
        const ok = rand.float() < (r?.a ?? 0) * 0.7 + P.romance * 0.3 + (c.life?.stats.looks ?? 50) / 300 - (taken ? 0.35 : 0) - Math.abs(o.age - c.age) / 40;
        say('You', 'Would you want to go out sometime? Like, on a date?');
        if (ok) { if (taken) Ls.breakUp(o, taken, `${o.first} left ${taken.first} for you.`); W.citizenAI.setRel(c, o, Math.max(0.65, r?.a ?? 0.65), 'partner'); W.history.citizenLog(c, `Started dating ${o.name}`, true); W.history.citizenLog(o, `Started dating ${c.name}`, true); say(o.first, rand.pick(['I thought you\'d never ask.', 'Yes! Absolutely.', 'Okay… yeah. I\'d like that.'])); c.life && (c.life.stats.happy = Math.min(100, c.life.stats.happy + 8)); }
        else { W.citizenAI.addAff(c, o, -0.05); say(o.first, taken ? `I'm with ${taken.first}.` : rand.pick(['I like you, but not like that.', 'Sorry, I don\'t see us that way.', 'Let\'s just stay friends.'])); }
      } else if (k === 'propose') {
        if (!c.life?.inv.ring) { say('You', '(You need an engagement ring — the clothing stores sell them.)'); }
        else { say('You', 'Will you marry me?'); if (rand.float() < (r?.a ?? 0) - 0.05) { c.life.inv.ring = false; Ls.marry(c, o); say(o.first, 'YES! Yes yes yes!'); } else { W.citizenAI.addAff(c, o, -0.1); say(o.first, 'I… I\'m not ready. I\'m sorry.'); } }
      } else if (k === 'movein') {
        say('You', 'What if we moved in together?');
        if ((r?.a ?? 0) > 0.6) {
          const L = ensureLife(c, W);
          if (!L.withParents) { W.citizenAI.moveIn(o, c); say(o.first, 'I\'ll pack tonight!'); }
          else if (!(o.parents || []).some((id) => W.citizens[id]?.home === o.home)) { W.citizenAI.moveIn(c, o); c.unit = o.unit; say(o.first, 'Move in with me. It\'ll be cozy.'); Ls.msg('🏠', `You moved in with ${o.first} at ${W.citizenAI.homeName(c)}.`); }
          else say(o.first, 'We both live with our parents… let\'s get a place first. (Rent one on your computer.)');
        } else say(o.first, 'Isn\'t it a bit soon?');
      } else if (k === 'baby') { say('You', 'I think I\'m ready to start a family.'); const err = Ls.tryForBaby(c, o); say(o.first, err ? (err.includes('adoption') ? 'Maybe we should look into adoption…' : err) : 'Let\'s do it. 💕'); }
      else if (k === 'breakup') { say('You', 'I think we should break up.'); Ls.breakUp(c, o, `You broke up with ${o.first}.`); say(o.first, rand.pick(['…Wow. Okay.', 'Get out.', 'I saw this coming.'])); }
      else if (k === 'gift') { say('You', 'I got you something.'); c.life.inv.gift = null; W.citizenAI.addAff(c, o, 0.2); say(o.first, 'Aww, you didn\'t have to!'); }
      else if (k === 'play' || k === 'read') { W.citizenAI.addAff(c, o, 0.08); say(o.first, rand.pick(['Again! Again!', 'Hehe!', 'You\'re the best!', 'Can we get ice cream?'])); c.needs.fun = Math.min(1, c.needs.fun + 0.1); }
      else {
        say('You', { chat: 'So what\'s new?', joke: 'Okay, so a guy walks into a bar…', compliment: 'You look great today.', ask_life: 'Tell me about yourself.', ask_job: 'How\'s work?', gossip: 'Heard anything interesting?', flirt: 'Has anyone told you you\'re really cute?', insult: 'You know what? You\'re a joke.', ask_money: 'Could you spot me some cash?', hangout: 'Want to hang out?', apologize: 'Hey… I\'m sorry.' }[k] || '…');
        const res = talk(W, o, c, k);
        say(o.first, res.line);
        if (res.d) W.citizenAI.addAff(c, o, res.d, (r?.t === 'acq' || !r) && res.d > 0 && (c.rel[o.id]?.a ?? 0) > 0.55 ? 'friend' : undefined);
        if (res.give) { o.money -= res.give; c.money += res.give; say('', `(${o.first} gives you ${money(res.give)})`); }
        if (k === 'hangout' && res.yes) { c.needs.social = Math.min(1, c.needs.social + 0.4); c.needs.fun = Math.min(1, c.needs.fun + 0.2); g.activities.startTimed('hangout', 60); }
        if (k === 'insult' && persona(o).dark === 'violent' && rand.chance(0.5) && W.incidents) { say('', `(${o.first} swings at you!)`); W.incidents.fight(o, c, W.city.buildings[c.at] || null); }
      }
      if (c.rel[o.id]) c.rel[o.id].seen = W.day;
      c.needs.social = Math.min(1, c.needs.social + 0.03);
    };
    openPanel(g, {
      title: '', cls: 'talk-modal', html: render(),
      onBind: (a) => { a.el.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => { act(b.dataset.t); a.set(render()); }); },
    });
    if (fig) fig.action = 'talk';
  }

  // ---------------------------------------------------------------- the computer
  openComputer() {
    const g = this.game, W = this.W, c = this.c || g.possession.c;
    if (!c) return;
    const L = ensureLife(c, W);
    let app = 'desk', msg = '';
    const apps = [['jobs', '💼', 'JobLink'], ['school', '🎓', 'College'], ['homes', '🏠', 'HomeFinder'], ['cars', '🚗', 'AutoMart'], ['bank', '🏦', 'Online bank'], ['social', '📱', 'FriendFace'], ['lotto', '🎟', 'Lotto results']];
    if (L.gangContact || W.crime) apps.push(['under', '🕶', L.gangContact ? 'Underground' : '???']);
    const render = () => {
      let body = '';
      if (app === 'desk') body = `<div class="desk">${apps.map(([k, ic, n]) => `<button data-app="${k}"><span>${ic}</span>${n}</button>`).join('')}</div>`;
      if (app === 'jobs') {
        const open = W.economy.openJobs().filter((j) => j.role !== 'mayor');
        const seen = new Set();
        const list = [];
        for (const j of open) { const key = j.biz + j.role + j.shift[0]; if (seen.has(key)) continue; seen.add(key); list.push(j); }
        list.sort((a, b) => b.wage - a.wage);
        body = `<p class="muted">${list.length} openings in the city. You: ${esc(L.edu.level)}${c.record.arrests ? ` · ${c.record.arrests} arrest(s)` : ''}.</p><div class="jobs">${list.slice(0, 60).map((j) => { const biz = W.economy.biz[j.biz]; const f = meets(c, j.role, W); const ch = Math.round(interviewChance(c, j, W) * 100); return `<div class="job ${f.length ? 'no' : ''}"><span><b>${esc(ROLE_TITLE[j.role] || j.role)}</b> · ${esc(biz.name)}<br><small>$${Math.round(j.wage)}/h · ${Math.floor(j.shift[0] / 60 % 24)}:00–${Math.floor(j.shift[1] / 60 % 24)}:00 · ${j.days.filter(Boolean).length} days/wk · ${esc(DISTRICTS[W.city.buildings[biz.b].code]?.name || '')}${f.length ? ` · <em>${esc(f.join(', '))}</em>` : ` · ~${ch}% chance`}</small></span><button data-apply="${j.id}" ${f.length ? 'disabled' : ''}>Apply</button></div>`; }).join('')}</div>`;
      }
      if (app === 'school') body = `<p>Education: <b>${esc(L.edu.level)}</b> ${L.edu.degrees.length ? '· ' + esc(L.edu.degrees.join(', ')) : ''}</p>${L.edu.enrolled ? `<p>Enrolled: <b>${esc(PROGRAMS.find((p) => p.id === L.edu.enrolled).name)}</b> — ${L.edu.credits}/${L.edu.need} lectures. Attend at Silver River College on weekdays.</p>` : ''}<div class="menu">${PROGRAMS.map((p) => `<div class="prog"><span><b>${p.name}</b><br><small>${p.credits} lectures · ${money(p.tuition)}${p.minSmarts ? ` · smarts ${p.minSmarts}+` : ''}</small></span><button data-en="${p.id}">Pay</button><button data-enl="${p.id}">Student loan</button></div>`).join('')}</div>`;
      if (app === 'homes') {
        const listings = [];
        for (const b of W.city.buildings) { if (b.state !== 'ok' || b.resUnits <= b.residents.length || b.id === c.home) continue; listings.push(b); }
        rand.shuffle(listings);
        const show = listings.slice(0, 24).sort((a, b) => a.rent - b.rent);
        const price = (b) => Math.round(((b.rent || 25) * (b.kind === 'house' ? 1.8 : 1)) * (1 + (W.economy.multiplier - 1) * 0.5));
        const buyPrice = (b) => Math.round(price(b) * 900 / 1000) * 1000;
        body = `<p class="muted">Rent is charged daily. Buying needs 20% down (the rest becomes a mortgage).</p><div class="jobs">${show.map((b) => `<div class="job"><span><b>${esc(W.citizenAI.buildingName(b.id))}</b><br><small>${esc(DISTRICTS[b.code]?.name || '')} · ${b.kind === 'house' ? 'House' : 'Apartment'} · ${money(price(b))}/day · buy ${money(buyPrice(b))}</small></span><button data-rent="${b.id}">Rent</button><button data-buy="${b.id}" data-price="${buyPrice(b)}">Buy</button></div>`).join('')}</div>`;
      }
      if (app === 'cars') body = `<p>Current car: ${c.vehicle != null ? esc(W.traffic.byId.get(c.vehicle)?.T.label || '—') : 'none'}${L.license.driver ? '' : ' · <em>You have no driver\'s licence — take the test ($120)</em> <button data-lic>Take the driving test</button>'}</p><div class="menu">${CARS.map(([t, n, p]) => `<button data-car="${t}" data-p="${p}" ${c.money + (c.bank || 0) < p ? 'disabled' : ''}><span>${n}</span><b>${money(p)}</b></button>`).join('')}</div>`;
      if (app === 'bank') body = `<p>Checking: <b>${money(c.bank || 0)}</b> · Cash: <b>${money(c.money)}</b></p>${L.loans.map((l) => `<p class="muted">${l.kind} loan: ${money(l.left)} left (${money(l.daily)}/day)</p>`).join('')}<p class="muted">Deposits and withdrawals happen at a bank or ATM. Loans from a bank manager.</p>`;
      if (app === 'social') {
        const ppl = Object.entries(c.rel).filter(([, r]) => r.t !== 'acq' && r.a > 0.2).map(([id]) => W.citizens[id]).filter(Boolean);
        const feed = [];
        for (const o of ppl) for (const e of o.log.slice(-4)) if (W.time - e.t < 1440 * 6) feed.push({ o, e });
        feed.sort((a, b) => b.e.t - a.e.t);
        body = `<div class="feed">${feed.slice(0, 30).map(({ o, e }) => `<div class="post"><span class="av" style="background:${o.look.shirt}">${esc(o.first[0])}</span><div><b>${esc(o.name)}</b> <small>${W.history.dateStr(e.t)}</small><br>${esc(e.text)}</div></div>`).join('') || '<p class="muted">Your feed is empty. Make some friends.</p>'}</div>`;
      }
      if (app === 'lotto') body = W.lottery.history.slice(-10).reverse().map((h) => `<p><b>Day ${h.day + 1}</b>: ${h.nums.join(' – ')} · jackpot ${money(h.jackpot)}${h.winners.some((w) => w.m === 6) ? ' · WON' : ''}</p>`).join('') || '<p class="muted">No draws yet.</p>';
      if (app === 'under') body = W.crime ? W.crime.undergroundHTML(c) : '<p class="muted">An encrypted forum. Nobody answers yet.</p>';
      return `<div class="pc"><div class="pc-bar"><span>${app === 'desk' ? 'Desktop' : apps.find((a) => a[0] === app)?.[2] || ''}</span>${app !== 'desk' ? '<button data-app="desk">✕</button>' : ''}</div><div class="pc-body">${body}</div><p class="gmsg">${esc(msg)}</p></div>`;
    };
    openPanel(g, {
      title: '🖥 Home computer', cls: 'wide', html: render(),
      onBind: (a) => {
        const re = (m) => { msg = m || ''; a.set(render()); };
        a.el.querySelectorAll('[data-app]').forEach((b) => b.onclick = () => { app = b.dataset.app; msg = ''; a.set(render()); });
        a.el.querySelectorAll('[data-apply]').forEach((b) => b.onclick = () => {
          const j = W.economy.jobs[+b.dataset.apply];
          if (!j || j.holder != null) return re('That position was just filled.');
          if ((L.appliedDay || {})[j.id] === W.day) return re('You already applied there today.');
          L.appliedDay = { ...(L.appliedDay || {}), [j.id]: W.day };
          const biz = W.economy.biz[j.biz];
          if (rand.float() < interviewChance(c, j, W)) {
            if (c.job) W.citizenAI.quitJob(c, '', true);
            W.citizenAI.hire(c, j);
            L.perf = 55; L.strikes = 0;
            this.L.msg('📧', `${biz.name}: "We'd love to have you as ${ROLE_TITLE[j.role] || j.role}. You start your next shift (${Math.floor(j.shift[0] / 60 % 24)}:00). Clock in when you arrive."`);
            re(`🎉 Hired! ${ROLE_TITLE[j.role] || j.role} at ${biz.name}, $${Math.round(j.wage)}/h.`);
          } else re(`${biz.name} went with another candidate.`);
        });
        a.el.querySelectorAll('[data-en],[data-enl]').forEach((b) => b.onclick = () => { const err = enroll(c, b.dataset.en || b.dataset.enl, W, !!b.dataset.enl); re(err || 'Enrolled! Lectures are at Silver River College on weekdays, 8:00–21:00.'); });
        a.el.querySelectorAll('[data-rent]').forEach((b) => b.onclick = () => this.moveTo(+b.dataset.rent, false, 0, re));
        a.el.querySelectorAll('[data-buy]').forEach((b) => b.onclick = () => this.moveTo(+b.dataset.buy, true, +b.dataset.price, re));
        a.el.querySelectorAll('[data-car]').forEach((b) => b.onclick = () => {
          const p = +b.dataset.p, t = b.dataset.car;
          if (c.money + (c.bank || 0) < p) return re('Not enough money.');
          if (c.vehicle != null) { const old = W.traffic.byId.get(c.vehicle); if (old) { const trade = Math.round((old.fleet ? 0 : 3000) * (1 - old.damage)); c.bank = (c.bank || 0) + trade; if (old.state === 'parked' || old.state === 'garage') W.traffic.remove(old); } c.vehicle = null; }
          this.L.pay(c, p, 'car');
          const v = W.addCitizenCar(c, t, rand);
          W.history.citizenLog(c, `Bought a new ${v.T.label}`, true);
          re(`Your new ${v.T.label} is parked near your home.`);
        });
        const lic = a.el.querySelector('[data-lic]');
        if (lic) lic.onclick = () => { if (c.money < 120) return re('The test costs $120.'); c.money -= 120; if (rand.float() < 0.55 + (L.skills.driving || 0) / 150) { L.license.driver = true; re('You passed! You have a driver\'s licence.'); } else { L.skills.driving = (L.skills.driving || 0) + 8; re('You failed — parallel parking. Try again.'); } };
        if (W.crime) W.crime.bindUnderground(a, c, re);
      },
    });
  }

  moveTo(bid, buy, price, re) {
    const W = this.W, c = this.c, L = ensureLife(c, W);
    const b = W.city.buildings[bid];
    if (!b || b.resUnits <= b.residents.length) return re('No longer available.');
    if (buy) {
      const down = Math.round(price * 0.2);
      if (c.money + (c.bank || 0) < down) return re(`You need ${money(down)} for the down payment.`);
      this.L.pay(c, down, 'down payment');
      L.loans.push({ kind: 'mortgage', amt: price - down, left: Math.round((price - down) * 1.25), daily: Math.round((price - down) * 1.25 / 400), since: W.day });
      L.owns = [...(L.owns || []), bid];
    } else {
      const deposit = Math.round((b.rent || 25) * 7);
      if (c.money + (c.bank || 0) < deposit) return re(`You need ${money(deposit)} for the deposit.`);
      this.L.pay(c, deposit, 'deposit');
    }
    const old = c.home;
    const pr = W.citizenAI.partner(c);
    const kids = (c.kids || []).map((id) => W.citizens[id]).filter((k) => k && k.status === 'ok' && k.age < 18 && k.home === old);
    W.citizenAI.leaveHome(c);
    W.citizenAI.setHome(c, bid);
    c.unit = b.residents.length;
    if (pr && pr.home === old) { W.citizenAI.moveIn(pr, c); pr.unit = c.unit; }
    for (const k of kids) { W.citizenAI.leaveHome(k); W.citizenAI.setHome(k, bid); k.unit = c.unit; }
    L.withParents = false;
    W.history.citizenLog(c, `${buy ? 'Bought' : 'Moved into'} ${W.citizenAI.homeName(c)}`, true);
    this.L.msg('🔑', `${buy ? 'You bought' : 'You signed a lease on'} ${W.citizenAI.homeName(c)}. Your stuff is there.`);
    re(`${buy ? 'Bought' : 'Rented'}: ${W.citizenAI.buildingName(bid)}. Set GPS → Home to find it.`);
  }

  // ---------------------------------------------------------------- the end
  onDeath(c, cause) {
    const g = this.game, W = this.W;
    if (!g.lifeMode) return;
    if (g.possession.c === c) g.possession.release({ far: true });
    const L = c.life;
    const heirs = this.L.heirs().filter((k) => k.age >= 18);
    const kidsMinor = this.L.heirs().filter((k) => k.age < 18);
    const net = Math.round((c.money || 0) + (c.bank || 0));
    openPanel(g, {
      title: '', cls: 'event-card obit', closable: false,
      html: `<div class="obit-h">🕊 ${esc(c.name)}</div><p>${esc(W.history.dateStr(c.life.born * 1440 || 0))} – ${esc(W.history.dateStr(W.time))} · died aged ${c.age} (${esc(cause)})</p>
        <p>${c.job ? `Worked as ${esc(ROLE_TITLE[c.job.role] || c.job.role)}. ` : ''}${L?.edu.degrees.length ? `Education: ${esc(L.edu.degrees.join(', '))}. ` : ''}Left behind ${money(net)}${(c.kids || []).length ? ` and ${(c.kids || []).length} child${c.kids.length > 1 ? 'ren' : ''}` : ''}.</p>
        <ul class="log">${c.log.filter((e) => e.major).slice(-8).map((e) => `<li>${esc(e.text)}</li>`).join('')}</ul>
        <div class="btns">${heirs.map((k) => `<button class="pri" data-heir="${k.id}">Continue as ${esc(k.name)} (${k.age})</button>`).join('')}${!heirs.length && kidsMinor.length ? `<p class="muted">Your children are too young to continue as.</p>` : ''}<button data-new>Start a new life</button><button data-watch>Watch the city</button></div>`,
      onBind: (a) => {
        a.el.querySelectorAll('[data-heir]').forEach((b) => b.onclick = () => { a.close(); const k = this.L.continueAs(W.citizens[+b.dataset.heir]); this.startLife(k, true); });
        a.el.querySelector('[data-new]').onclick = () => { a.close(); this.L.pid = null; this.L.dead = null; this.creator(); };
        a.el.querySelector('[data-watch]').onclick = () => { a.close(); this.L.pid = null; this.L.dead = null; g.lifeMode = false; document.body.classList.remove('life'); this.hud.classList.add('hidden'); };
      },
    });
  }
}

void BTYPES; void formOf;
