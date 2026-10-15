// In-game UI. The city stays the main interface: a slim top bar, a live event
// ticker, a concise inspector card, and a possession HUD with prompts + minimap.
import { SPEED_LABELS, SPEEDS } from '../game.js';
import { C, WEEKDAYS, SEASONS } from '../sim/config.js';
import { BTYPES } from '../sim/economy.js';
import { WEATHER } from '../sim/weather.js';
import { dist } from '../core/math.js';

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (n) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString();
const ICON = { robbery: '🔫', theft: '🚗', accident: '💥', medical: '🚑', fire: '🔥', fight: '👊', power: '⚡', signal: '🚦', riot: '📢', animal: '🐘', chase: '🚨', arrest: '🚓', business: '🏪', building: '🏗', weather: '🌦', blackout: '⚡', death: '🕯', record: '🏆', civic: '🏛', system: '◆', anomaly: '░', disaster: '☄', vandalism: '🧱', power2: '🔌' };

export class HUD {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('ui');
    this.W = game.world;
    this.build();
    this.ticker = [];
    this.toasts = [];
    this.panel = null;
    this.lastInspect = 0;
    this.seenLog = new Map();
    game.uiCapture = () => false;
    game.toast = (t, s) => this.toast(t, s);
    game.on('select', () => this.renderInspector(true));
    game.on('speed', () => this.renderSpeed());
    game.on('possess', () => this.onPossess());
    game.on('release', () => this.onRelease());
    game.on('possessStart', (c) => this.cinematic(c));
    const W = this.W;
    W.on('cityEvent', (e) => { if (!e.minor) this.pushTicker(e.text, e.type, e); });
    W.on('incident', (inc) => this.pushTicker(`${inc.title}${inc.b != null ? ' — ' + W.citizenAI.buildingName(inc.b) : ''}`, inc.type, { x: inc.x, z: inc.z, inc: inc.id, live: true }));
    W.on('pursuit', (e) => this.pushTicker(`Police chase underway${e.s ? ' — suspect ' + e.s.name : ''}`, 'chase', { x: e.inc.x, z: e.inc.z, inc: e.inc.id, who: e.s?.id, live: true }));
    W.on('bookmarkEvent', ({ c, entry }) => { if (entry.major) this.pushTicker(`★ ${c.name}: ${entry.text}`, 'bookmark', { who: c.id }); });
    W.on('anomalyLine', ({ c, text }) => this.toast(`${c.first}: “${text}”`, 4));
    W.on('playerArrested', ({ c }) => this.toast(`BUSTED. ${c.first} is going to jail.`, 4));
    W.on('playerInjured', ({ c }) => this.toast(`${c.first} is hurt. An ambulance has been called.`, 4));
  }

  build() {
    const R = this.root;
    // top bar
    this.top = h('div', 'topbar');
    this.top.innerHTML = `
      <div class="brand">CITY<span>.EXE</span></div>
      <div class="clock"><div class="time" id="h-time">--:--</div><div class="date" id="h-date"></div></div>
      <div class="weather" id="h-weather"></div>
      <div class="speeds" id="h-speeds"></div>`;
    R.appendChild(this.top);
    const sp = this.top.querySelector('#h-speeds');
    const sym = ['⏸', '◔', '▶', '▶▶', '▶▶▶', '⏩', '⏭'];
    SPEEDS.forEach((s, i) => {
      if (i === 0) return;
      const b = h('button', 'spd', sym[i]);
      b.title = `${SPEED_LABELS[i]} (${['', '0', '1', '2', '3', '4', '5'][i]})`;
      b.onclick = () => this.game.setSpeed(i);
      sp.appendChild(b);
    });
    const pb = h('button', 'spd pause', '⏸');
    pb.title = 'Pause (Space)';
    pb.onclick = () => this.game.togglePause();
    sp.prepend(pb);
    this.renderSpeed();
    // right tools
    this.tools = h('div', 'tools');
    const mk = (label, title, fn) => { const b = h('button', 'tool', label); b.title = title; b.onclick = fn; this.tools.appendChild(b); return b; };
    mk('🎬', 'Show me something interesting (N)', () => this.director());
    this.btnBook = mk('★', 'Bookmarked citizens (B)', () => this.togglePanel('bookmarks'));
    mk('📜', 'City Archive (H)', () => this.togglePanel('archive'));
    mk('⚡', 'God tools (G)', () => this.togglePanel('god'));
    mk('🔎', 'Find a citizen (/)', () => this.togglePanel('search'));
    mk('⚙', 'Settings', () => this.togglePanel('settings'));
    mk('?', 'Controls (F1)', () => this.togglePanel('help'));
    R.appendChild(this.tools);
    // ticker
    this.tick = h('div', 'ticker');
    R.appendChild(this.tick);
    // inspector
    this.insp = h('div', 'inspector hidden');
    R.appendChild(this.insp);
    // panel
    this.panelEl = h('div', 'panel hidden');
    R.appendChild(this.panelEl);
    // toasts
    this.toastEl = h('div', 'toasts');
    R.appendChild(this.toastEl);
    // possession HUD
    this.ph = h('div', 'phud hidden');
    this.ph.innerHTML = `
      <div class="p-obj" id="p-obj"></div>
      <div class="p-stars" id="p-stars"></div>
      <div class="p-weapon" id="p-weapon"></div>
      <div class="p-id" id="p-id"></div>
      <div class="p-prompts" id="p-prompts"></div>
      <div class="p-speed" id="p-speed"></div>
      <div class="p-keys" id="p-keys"></div>
      <canvas class="minimap" id="minimap" width="200" height="200"></canvas>`;
    R.appendChild(this.ph);
    this.mini = this.ph.querySelector('#minimap');
    this.cine = h('div', 'cine hidden');
    this.cine.innerHTML = '<div class="bar top"></div><div class="bar bottom"></div><div class="cine-name" id="cine-name"></div>';
    R.appendChild(this.cine);
    // hover tooltip
    this.tip = h('div', 'tip hidden');
    R.appendChild(this.tip);
    this.buildMinimapBase();
    addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') { if (e.code === 'Escape') this.closePanel(); return; }
      if (this.game.mode !== 'observe') return;
      if (e.code === 'KeyN') this.director();
      if (e.code === 'KeyB') this.togglePanel('bookmarks');
      if (e.code === 'KeyH') this.togglePanel('archive');
      if (e.code === 'KeyG') this.togglePanel('god');
      if (e.code === 'Slash') { e.preventDefault(); this.togglePanel('search'); }
      if (e.code === 'F1') { e.preventDefault(); this.togglePanel('help'); }
      if (e.code === 'KeyM' && this.game.selected && this.game.selected.kind === 'citizen') this.toggleBookmark(this.W.citizens[this.game.selected.id]);
    });
  }

  // ---------------------------------------------------------------- dialogs
  modal(html) {
    const m = h('div', 'modal');
    m.innerHTML = `<div class="modal-in">${html}<div class="btns"><button class="pri" data-ok>Continue</button></div></div>`;
    this.root.appendChild(m);
    m.querySelector('[data-ok]').onclick = () => m.remove();
    m.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => { this.act(b.dataset.act, b.dataset.id); m.remove(); });
    return m;
  }
  showAway(a) {
    const W = this.W;
    const d = Math.floor(a.gameMin / 1440), hh = Math.floor((a.gameMin % 1440) / 60);
    const span = d ? `${d} day${d > 1 ? 's' : ''}${hh ? ` and ${hh} hours` : ''}` : `${hh} hours`;
    const ev = a.events.slice(-12).reverse().map((e) => `<li><span>${W.history.dateStr(e.t)} ${W.history.timeStr(e.t)}</span>${ICON[e.type] || '•'} ${esc(e.text)}</li>`).join('');
    const bm = a.bookmarks.map(({ c, fresh }) => `<div class="bm"><div class="bm-h"><a data-act="sel" data-id="${c.id}">★ ${esc(c.name)}</a></div><ul class="log">${fresh.slice(-4).map((e) => `<li class="major">${esc(e.text)}</li>`).join('')}</ul></div>`).join('');
    this.modal(`<h2>While you were away</h2><p class="muted">The city kept living for ${span}.</p>${bm ? `<h3>Your bookmarked people</h3>${bm}` : ''}${ev ? `<h3>City news</h3><ul class="arch">${ev}</ul>` : ''}`);
  }
  showWelcome() {
    this.modal(`<h2>CITY<span style="color:var(--accent)">.EXE</span></h2>
      <p>This city runs on its own. ${this.W.citizens.length.toLocaleString()} people have homes, jobs, money, friends and plans — and they will keep living whether you watch or not.</p>
      <ul class="keys">
        <li><b>Watch.</b> Drag to pan, scroll to zoom, click anyone or anything to see who they are.</li>
        <li><b>Become anyone.</b> Double-click a person (or press <kbd>P</kbd>) to dive in and play as them. <kbd>Q</kbd> leaves their body; <kbd>R</kbd> lets them carry on while you ride along.</li>
        <li><b>Follow the stories.</b> The ticker (bottom-left) shows what is happening. Click an entry to fly there, or press <kbd>N</kbd> (🎬) to jump to the most interesting thing going on.</li>
        <li><b>Interfere.</b> God tools (<kbd>G</kbd>) start fires, blackouts, storms, riots, meteors…</li>
        <li><b>Come back later.</b> The city saves itself and remembers what happened.</li>
      </ul>`);
  }

  // ---------------------------------------------------------------- top bar
  renderSpeed() {
    const btns = this.top.querySelectorAll('.spd');
    const g = this.game;
    btns.forEach((b, i) => b.classList.toggle('on', i === 0 ? g.paused : !g.paused && g.speedIdx === i));
  }

  update(dt) {
    const g = this.game, W = this.W;
    // clock
    this.top.querySelector('#h-time').textContent = W.history.timeStr(W.time);
    this.top.querySelector('#h-date').textContent = `${WEEKDAYS[W.dow]} · ${SEASONS[W.season]} ${(W.day % C.SEASON_DAYS) + 1} · Year ${W.year}`;
    const wk = WEATHER[W.weather.kind];
    const blackout = Object.values(W.power.zones).filter((z) => !z.on).map((z) => z.name);
    this.top.querySelector('#h-weather').innerHTML = `${weatherIcon(W)} ${wk.label} · ${Math.round(W.weather.temp)}°${blackout.length ? ` <span class="warn">⚡ Blackout: ${esc(blackout.join(', '))}</span>` : ''}${W.economy.trend > 0.05 ? ' <span class="good">📈 Boom</span>' : W.economy.trend < -0.05 ? ' <span class="warn">📉 Recession</span>' : ''}`;
    // inspector refresh
    this.lastInspect += dt;
    if (this.lastInspect > 0.5) { this.lastInspect = 0; this.renderInspector(false); if (this.panel === 'bookmarks') this.renderPanel(); }
    // hover tooltip
    this.updateTip();
    // possession
    if (g.possession && g.possession.c) this.updatePossession(dt);
    // toasts
    for (const t of this.toasts) { t.t -= dt; if (t.t <= 0 && !t.gone) { t.gone = true; t.el.classList.add('out'); setTimeout(() => t.el.remove(), 400); } }
    this.toasts = this.toasts.filter((t) => t.t > -1);
    // ticker live markers fade
    this.updateTickerAges();
  }

  updateTip() {
    const g = this.game, W = this.W;
    const hv = g.mode === 'observe' ? g.hover : null;
    if (!hv || g.input.mouse.dragging) { this.tip.classList.add('hidden'); return; }
    let text = '';
    if (hv.kind === 'citizen') { const c = W.citizens[hv.id]; text = `<b>${esc(c.name)}</b><span>${esc(W.citizenAI.describe(c))}</span>`; }
    else if (hv.kind === 'vehicle') { const v = W.traffic.byId.get(hv.id); if (!v) return; const d = v.driver != null ? W.citizens[v.driver] : null; text = `<b>${esc(v.name || capital(v.T.label))}</b><span>${d ? esc(d.name) + ' — ' + esc(W.citizenAI.describe(d)) : v.owner != null ? 'Parked · owned by ' + esc(W.citizens[v.owner].name) : 'Parked'}</span>`; }
    else if (hv.kind === 'building') { const b = W.city.buildings[hv.id]; text = `<b>${esc(W.citizenAI.buildingName(b.id))}</b><span>${esc(b.district)} · ${b.occupants.size} inside</span>`; }
    this.tip.innerHTML = text;
    this.tip.style.left = (g.input.mouse.x + 16) + 'px';
    this.tip.style.top = (g.input.mouse.y + 14) + 'px';
    this.tip.classList.remove('hidden');
  }

  // ---------------------------------------------------------------- ticker
  pushTicker(text, type, data = {}) {
    const W = this.W;
    // merge repeats of the same headline within a short window
    const top = this.ticker[0];
    if (top && top.text === text && performance.now() - top.t < 45000) {
      top.n = (top.n || 1) + 1;
      top.el.querySelector('.tx').textContent = `${text} ×${top.n}`;
      top.t = performance.now();
      top.data = data;
      return;
    }
    const el = h('div', 'tk' + (data.live ? ' live' : '') + (type === 'bookmark' ? ' star' : ''));
    el.innerHTML = `<span class="ic">${ICON[type] || (type === 'bookmark' ? '★' : '•')}</span><span class="tt">${W.history.timeStr(W.time)}</span><span class="tx">${esc(text)}</span>`;
    el.onclick = () => {
      const entry = this.ticker.find((t) => t.el === el);
      if (entry) data = entry.data;
      if (data.who != null) { this.game.select({ kind: 'citizen', id: data.who }); this.game.followSelected(); }
      else if (data.x != null) this.game.flyTo(data.x, data.z, 90);
      if (data.inc != null) this.focusIncident(data.inc);
    };
    this.tick.prepend(el);
    this.ticker.unshift({ el, t: performance.now(), data, text });
    while (this.ticker.length > 6) { const o = this.ticker.pop(); o.el.remove(); }
  }
  updateTickerAges() {
    const now = performance.now();
    for (const t of this.ticker) t.el.style.opacity = Math.max(0.45, 1 - (now - t.t) / 60000);
  }
  // jump to the most interesting thing happening right now
  director() {
    const W = this.W;
    const score = (inc) => {
      if (!inc.reported || inc.closed) return 0;
      let s = { robbery: 6, theft: 5, accident: 4, fire: 5, riot: 9, animal: 7, medical: 3, fight: 4, power: 2, signal: 1 }[inc.type] || 1;
      if (inc.data.pursuitBy != null) s += 10;
      if (inc.type === 'fire') s += W.city.buildings[inc.b]?.fire * 5 || 0;
      s += inc.units.length * 0.5;
      s -= (W.time - inc.t) / 60;
      return s;
    };
    const list = W.incidents.active().map((i) => [i, score(i)]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]);
    this.dirIdx = ((this.dirIdx ?? -1) + 1) % Math.max(1, Math.min(3, list.length));
    const pick = list[this.dirIdx];
    if (pick) { this.focusIncident(pick[0].id); this.toast(`🎬 ${pick[0].title}${pick[0].b != null ? ' — ' + W.citizenAI.buildingName(pick[0].b) : ''}`); return; }
    for (const t of W.disasters.tornadoes) { this.game.flyTo(t.x, t.z, 220); return; }
    // nothing dramatic: follow someone with a story
    const cands = W.citizens.filter((c) => c.status === 'ok' && c.state !== 'inside' && c.state !== 'abstract' && (c.bookmarked || c.goal && ['meet', 'jobhunt', 'crime', 'drink'].includes(c.goal.type)));
    const c = cands[Math.floor(Math.random() * cands.length)] || W.citizens.find((c) => c.ped);
    if (c) { this.game.select({ kind: 'citizen', id: c.id }); this.game.followSelected(); this.toast(`🎬 ${c.name}: ${W.citizenAI.describe(c)}`); }
  }

  focusIncident(id) {
    const W = this.W;
    const inc = W.incidents.get(id);
    if (!inc) return;
    // select the most interesting participant
    const pick = inc.data.pursuitBy != null ? W.services.unit(inc.data.pursuitBy)?.crew[0] : inc.suspects[0] ?? inc.injured[0];
    if (pick != null && W.citizenPos(W.citizens[pick]) && !W.citizenPos(W.citizens[pick]).inside) { this.game.select({ kind: 'citizen', id: pick }); this.game.followSelected(); }
    else this.game.flyTo(inc.x, inc.z, 90);
  }

  toast(text, secs = 3.2) {
    const el = h('div', 'toast', esc(text));
    this.toastEl.appendChild(el);
    this.toasts.push({ el, t: secs });
    while (this.toastEl.children.length > 3) this.toastEl.firstChild.remove();
  }

  cinematic(c) {
    this.cine.classList.remove('hidden');
    const W = this.W;
    this.cine.querySelector('#cine-name').innerHTML = `<div class="cn">${esc(c.name.toUpperCase())}</div><div class="cr">${esc(W.citizenAI.jobTitle(c))} · ${esc(W.citizenAI.describe(c))}</div>`;
    clearTimeout(this.cineT);
    this.cineT = setTimeout(() => this.cine.classList.add('hidden'), 3200);
    this.insp.classList.add('hidden');
    this.closePanel();
  }

  // ---------------------------------------------------------------- inspector
  renderInspector(force) {
    const g = this.game, W = this.W;
    const sel = g.selected;
    if (!sel || g.mode !== 'observe') { this.insp.classList.add('hidden'); return; }
    if (!force && this.insp.matches(':hover') && this.insp.dataset.key === sel.kind + sel.id) { /* avoid re-render while hovering buttons */ }
    let html = '';
    if (sel.kind === 'citizen') html = this.citizenCard(W.citizens[sel.id]);
    else if (sel.kind === 'vehicle') html = this.vehicleCard(W.traffic.byId.get(sel.id));
    else if (sel.kind === 'building') html = this.buildingCard(W.city.buildings[sel.id]);
    if (!html) { this.insp.classList.add('hidden'); return; }
    const key = sel.kind + sel.id;
    if (!force && this.insp.dataset.key === key && this.insp.dataset.html === html) return;
    this.insp.dataset.key = key;
    this.insp.dataset.html = html;
    this.insp.innerHTML = html;
    this.insp.classList.remove('hidden');
    this.insp.querySelectorAll('[data-act]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); this.act(b.dataset.act, b.dataset.id); });
  }

  act(a, id) {
    const g = this.game, W = this.W;
    if (a === 'possess') g.possessSelected();
    if (a === 'follow') g.followSelected();
    if (a === 'close') g.select(null);
    if (a === 'book') { const c = W.citizens[+id]; this.toggleBookmark(c); this.renderInspector(true); }
    if (a === 'sel') { g.select({ kind: 'citizen', id: +id }); const c = W.citizens[+id]; const p = W.citizenPos(c); if (p) g.flyTo(p.x, p.z, 80); }
    if (a === 'possessId') { g.select({ kind: 'citizen', id: +id }); g.possessSelected(); }
    if (a === 'selB') { g.select({ kind: 'building', id: +id }); g.followSelected(); }
    if (a === 'selV') { g.select({ kind: 'vehicle', id: +id }); g.followSelected(); }
  }

  toggleBookmark(c) {
    const W = this.W;
    c.bookmarked = !c.bookmarked;
    if (c.bookmarked) { this.seenLog.set(c.id, c.log.length); this.toast(`★ Bookmarked ${c.name}. Major life events will be recorded.`); }
    W.emit('bookmarks');
  }

  citizenCard(c) {
    const W = this.W, ai = W.citizenAI;
    if (!c) return '';
    const friends = Object.values(c.rel).filter((r) => r.t === 'friend').length;
    const partner = ai.partner(c);
    const v = c.vehicle != null ? W.traffic.byId.get(c.vehicle) : null;
    const job = c.job ? `${ai.jobTitle(c)} at ${W.economy.biz[c.job.biz].name}` : ai.jobTitle(c);
    const traits = [];
    const T = c.traits;
    if (T.social > 0.75) traits.push('outgoing'); if (T.social < 0.2) traits.push('loner');
    if (T.ambition > 0.75) traits.push('ambitious'); if (T.caution < 0.2) traits.push('reckless'); if (T.caution > 0.8) traits.push('careful');
    if (T.honesty < 0.25) traits.push('shady'); if (T.honesty > 0.85) traits.push('upright'); if (T.thrift > 0.8) traits.push('frugal');
    if (c.record.arrests) traits.push(`${c.record.arrests} arrest${c.record.arrests > 1 ? 's' : ''}`);
    if (c.record.wanted) traits.push('WANTED');
    const pos = W.citizenPos(c);
    const can = c.status === 'ok' && c.state !== 'abstract' && !c.inTransit;
    const log = c.log.slice(-5).reverse().map((e) => `<li class="${e.major ? 'major' : ''}"><span>${W.history.dateStr(e.t)}</span>${esc(e.text)}</li>`).join('');
    const anomaly = c.flags.anomalyNote ? `<div class="anom">${esc(c.flags.anomalyNote)}</div>` : '';
    const ageTxt = c.flags.ageless ? `${c.age} <span class="glitch">?</span>` : c.age;
    return `
      <div class="ic-head"><div><div class="nm">${esc(c.name.toUpperCase())}</div><div class="sub">Age ${ageTxt} · ${esc(job)}</div></div>
        <button class="star ${c.bookmarked ? 'on' : ''}" data-act="book" data-id="${c.id}" title="Bookmark (M)">★</button><button class="x" data-act="close">×</button></div>
      ${anomaly}
      <div class="now">${esc(ai.describe(c))}</div>
      <dl>
        <dt>Home</dt><dd>${esc(ai.homeName(c))}</dd>
        <dt>Vehicle</dt><dd>${v ? `<a data-act="selV" data-id="${v.id}">${esc(v.T.label)}</a>${v.stolen ? ' (stolen)' : v.state === 'repair' ? ' (in the shop)' : ''}` : '—'}</dd>
        <dt>Money</dt><dd class="${c.money < 0 ? 'neg' : ''}">${money(c.money)}</dd>
        <dt>People</dt><dd>${friends} friend${friends === 1 ? '' : 's'}${partner ? ` · <a data-act="sel" data-id="${partner.id}">${esc(partner.first)}</a> ♥` : ''}</dd>
        <dt>Mood</dt><dd>${moodBar(c)}</dd>
      </dl>
      ${traits.length ? `<div class="traits">${traits.map((t) => `<span class="${t === 'WANTED' ? 'bad' : ''}">${t}</span>`).join('')}</div>` : ''}
      <ul class="log">${log}</ul>
      <div class="btns">
        <button class="pri" data-act="possess" ${can ? '' : 'disabled'}>Possess <kbd>P</kbd></button>
        <button data-act="follow" ${pos && !pos.inside ? '' : 'disabled'}>Follow <kbd>F</kbd></button>
      </div>`;
  }

  vehicleCard(v) {
    const W = this.W;
    if (!v) return '';
    const o = v.owner != null ? W.citizens[v.owner] : null;
    const u = v.unit != null ? W.services.unit(v.unit) : null;
    const crew = u ? u.crew.map((id) => `<a data-act="sel" data-id="${id}">${esc(W.citizens[id].first)}</a>`).join(', ') : '';
    return `
      <div class="ic-head"><div><div class="nm">${esc((v.name || capital(v.T.label)).toUpperCase())}</div><div class="sub">${esc(capital(v.T.label))} · plate ${esc(v.plate)}</div></div><button class="x" data-act="close">×</button></div>
      <div class="now">${v.state === 'parked' ? 'Parked' : v.state === 'wreck' ? 'Wrecked' : v.state === 'garage' ? 'In a garage' : v.speed > 0.5 ? `Moving at ${Math.round(v.speed * 3.6)} km/h` : 'Stopped'}${v.stolen ? ' · reported stolen' : ''}</div>
      <dl>
        ${o ? `<dt>Owner</dt><dd><a data-act="sel" data-id="${o.id}">${esc(o.name)}</a></dd>` : ''}
        ${u ? `<dt>Unit</dt><dd>${esc(u.callsign)} · ${esc(u.state)}</dd><dt>Crew</dt><dd>${crew || 'none on shift'}</dd>` : ''}
        <dt>Condition</dt><dd>${Math.round((1 - v.damage) * 100)}%</dd>
        <dt>Odometer</dt><dd>${(v.odometer / 1000).toFixed(1)} km</dd>
      </dl>
      <div class="btns">${u && u.crew.length ? `<button class="pri" data-act="possessId" data-id="${u.crew[0]}">Possess crew</button>` : ''}${o ? `<button data-act="sel" data-id="${o.id}">Select owner</button>` : ''}</div>`;
  }

  buildingCard(b) {
    const W = this.W, ai = W.citizenAI;
    if (!b) return '';
    const biz = b.bizId != null ? W.economy.biz[b.bizId] : null;
    const occ = Array.from(b.occupants).map((id) => W.citizens[id]).filter(Boolean);
    const staff = biz ? biz.jobs.map((j) => W.economy.jobs[j]).filter((j) => j.holder != null).length : 0;
    const open = biz ? W.economy.isOpen(biz, W.minuteOfDay) : false;
    const state = { ok: '', damaged: 'Damaged — awaiting repairs', ruin: 'Ruins', abandoned: 'Abandoned', construction: `Under construction (${Math.round((b.built || 0) * 100)}%)` }[b.state];
    const trend = biz && biz.history.length ? sparkline(biz.history.slice(-14)) : '';
    const people = occ.slice(0, 10).map((c) => `<li><a data-act="sel" data-id="${c.id}">${esc(c.name)}</a><span>${esc(c.activity === 'work' ? ai.jobTitle(c) : c.activity)}</span><button data-act="possessId" data-id="${c.id}" title="Possess">◉</button></li>`).join('');
    return `
      <div class="ic-head"><div><div class="nm">${esc(ai.buildingName(b.id).toUpperCase())}</div><div class="sub">${esc(b.district)}${biz ? ' · ' + esc(BTYPES[biz.type].label) : b.resUnits ? ' · Residential' : ''}</div></div><button class="x" data-act="close">×</button></div>
      ${state ? `<div class="now warn">${esc(state)}</div>` : ''}
      ${b.fire > 0 ? `<div class="now bad">🔥 On fire (${Math.round(b.fire * 100)}%)</div>` : ''}
      ${b.anomaly ? `<div class="anom">${esc(b.anomaly.note || 'This building is not in the city records.')}</div>` : ''}
      <dl>
        ${biz ? `<dt>Status</dt><dd>${biz.status === 'open' ? (open ? '<span class="good">Open</span>' : 'Closed now') : 'Out of business'}${!b.powered ? ' · <span class="warn">no power</span>' : b.backup ? ' · backup power' : ''}</dd>` : ''}
        ${biz && biz.owner != null ? `<dt>Owner</dt><dd><a data-act="sel" data-id="${biz.owner}">${esc(W.citizens[biz.owner].name)}</a></dd>` : ''}
        ${biz ? `<dt>Staff</dt><dd>${staff} employed${BTYPES[biz.type].civic ? '' : ` · cash ${money(biz.cash)}`}</dd>` : ''}
        ${biz && !BTYPES[biz.type].civic ? `<dt>Revenue</dt><dd>${trend}</dd>` : ''}
        ${b.resUnits ? `<dt>Residents</dt><dd>${b.residents.length} / ${b.resUnits} units</dd>` : ''}
        <dt>Inside now</dt><dd>${occ.length}</dd>
      </dl>
      ${people ? `<ul class="people">${people}</ul>` : ''}`;
  }

  // ---------------------------------------------------------------- panels
  togglePanel(name) { if (this.panel === name) this.closePanel(); else { this.panel = name; this.renderPanel(); } }
  closePanel() { this.panel = null; this.panelEl.classList.add('hidden'); }
  renderPanel() {
    const P = this.panelEl;
    P.classList.remove('hidden');
    const name = this.panel;
    let html = '';
    if (name === 'bookmarks') html = this.bookmarksPanel();
    if (name === 'archive') html = this.archivePanel();
    if (name === 'god') html = this.game.godTool ? this.game.godTool.panelHTML() : '<p>God tools unavailable</p>';
    if (name === 'settings') html = this.settingsPanel();
    if (name === 'help') html = this.helpPanel();
    if (name === 'search') html = this.searchPanel();
    P.innerHTML = `<button class="x close" data-close>×</button>` + html;
    P.querySelector('[data-close]').onclick = () => this.closePanel();
    P.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => { this.act(b.dataset.act, b.dataset.id); if (b.dataset.act === 'sel' || b.dataset.act === 'possessId') this.closePanel(); });
    P.querySelectorAll('[data-fly]').forEach((b) => b.onclick = () => { const [x, z] = b.dataset.fly.split(',').map(Number); this.game.flyTo(x, z, 120); });
    if (name === 'god' && this.game.godTool) this.game.godTool.bind(P);
    if (name === 'settings') this.bindSettings(P);
    if (name === 'search') this.bindSearch(P);
  }

  bookmarksPanel() {
    const W = this.W, ai = W.citizenAI;
    const list = W.citizens.filter((c) => c.bookmarked);
    if (!list.length) return `<h2>★ Bookmarks</h2><p class="muted">Select anyone in the city and press ★ (or M) to follow their life. Their major events get recorded here, and you'll be alerted when something happens to them.</p>`;
    return `<h2>★ Bookmarks</h2>` + list.map((c) => {
      const seen = this.seenLog.get(c.id) ?? c.log.length;
      const fresh = c.log.slice(seen);
      const recent = c.log.filter((e) => e.major).slice(-3).reverse().map((e) => `<li><span>${W.history.dateStr(e.t)}</span>${esc(e.text)}</li>`).join('');
      return `<div class="bm"><div class="bm-h"><a data-act="sel" data-id="${c.id}">${esc(c.name)}</a>${fresh.length ? `<span class="badge">${fresh.length} new</span>` : ''}<button data-act="possessId" data-id="${c.id}">Possess</button></div>
        <div class="sub">${c.age} · ${esc(ai.jobTitle(c))} · ${esc(ai.describe(c))}</div><ul class="log">${recent}</ul></div>`;
    }).join('');
  }

  archivePanel() {
    const W = this.W;
    const H = W.history;
    const byYear = H.byYear();
    const years = Array.from(byYear.keys()).sort((a, b) => b - a);
    let html = `<h2>📜 City Archive</h2><div class="stats">
      <div><b>${W.citizens.filter((c) => c.status === 'ok' || c.status === 'hospital' || c.status === 'jail').length}</b>citizens</div>
      <div><b>${W.economy.biz.filter((b) => b.status === 'open').length}</b>businesses</div>
      <div><b>${Math.round(W.economy.stats.unemployment * 100)}%</b>unemployed</div>
      <div><b>${H.counters.arrests}</b>arrests</div><div><b>${H.counters.fires}</b>fires</div><div><b>${H.counters.crashes}</b>crashes</div>
      <div><b>${H.counters.robberies}</b>robberies</div><div><b>${H.counters.chases}</b>chases</div><div><b>${H.counters.newBiz}/${H.counters.closedBiz}</b>opened/closed</div>
      <div><b>${H.counters.arrivals || 0}/${H.counters.departures || 0}</b>moved in/out</div><div><b>${H.counters.deaths}</b>deaths</div><div><b>${H.counters.blackouts}</b>blackouts</div></div>`;
    const recs = Object.values(H.records).filter(Boolean);
    if (recs.length) html += `<h3>Records</h3><ul class="recs">${recs.map((r) => `<li>🏆 ${esc(r.text)}</li>`).join('')}</ul>`;
    if (H.landmarks.length) html += `<h3>Places to remember</h3><ul class="recs">${H.landmarks.slice(-12).reverse().map((l) => `<li data-fly="${l.x},${l.z}" class="click">📍 ${esc(l.text)} <span class="muted">${H.dateStr(l.t)}</span></li>`).join('')}</ul>`;
    for (const y of years) {
      const evs = byYear.get(y).filter((e) => !e.minor).slice(-80).reverse();
      html += `<h3>Year ${y}</h3><ul class="arch">${evs.map((e) => `<li ${e.x != null ? `data-fly="${e.x},${e.z}" class="click ${e.anomaly ? 'anom' : ''}"` : `class="${e.anomaly ? 'anom' : ''}"`}><span>${H.dateStr(e.t).replace(/^Y\d+ /, '')} ${H.timeStr(e.t)}</span>${ICON[e.type] || '•'} ${esc(e.text)}</li>`).join('')}</ul>`;
    }
    return html;
  }

  searchPanel() {
    return `<h2>🔎 Find someone</h2><input id="srch" placeholder="Name, job or place…" autocomplete="off"><ul class="people" id="srch-res"></ul>
      <h3>Interesting right now</h3><ul class="people" id="srch-now"></ul>`;
  }
  bindSearch(P) {
    const W = this.W, ai = W.citizenAI;
    const inp = P.querySelector('#srch'), res = P.querySelector('#srch-res'), now = P.querySelector('#srch-now');
    const row = (c, extra = '') => `<li><a data-act="sel" data-id="${c.id}">${esc(c.name)}</a><span>${esc(extra || ai.jobTitle(c))}</span><button data-act="possessId" data-id="${c.id}" title="Possess">◉</button></li>`;
    const bindRows = (el) => el.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => { this.act(b.dataset.act, b.dataset.id); this.closePanel(); });
    const run = () => {
      const q = inp.value.trim().toLowerCase();
      if (!q) { res.innerHTML = ''; return; }
      const out = W.citizens.filter((c) => c.status !== 'dead' && c.status !== 'left' && (c.name.toLowerCase().includes(q) || ai.jobTitle(c).toLowerCase().includes(q) || ai.homeName(c).toLowerCase().includes(q))).slice(0, 14);
      res.innerHTML = out.map((c) => row(c, ai.describe(c))).join('');
      bindRows(res);
    };
    inp.oninput = run;
    setTimeout(() => inp.focus(), 0);
    // interesting people: chase participants, responders on calls, wanted, injured
    const items = [];
    for (const inc of W.incidents.active()) {
      if (!inc.reported) continue;
      for (const uid of inc.units) { const u = W.services.unit(uid); if (u) for (const cid of u.crew) items.push([W.citizens[cid], `${u.callsign}: ${inc.title}`]); }
      for (const cid of inc.suspects) items.push([W.citizens[cid], `Suspect: ${inc.title}`]);
      for (const cid of inc.injured) items.push([W.citizens[cid], `Injured: ${inc.title}`]);
    }
    const seen = new Set();
    now.innerHTML = items.filter(([c]) => c && !seen.has(c.id) && seen.add(c.id)).slice(0, 12).map(([c, t]) => row(c, t)).join('') || '<li class="muted">Quiet moment. Try fast-forwarding, or stir things up with god tools.</li>';
    bindRows(now);
  }

  settingsPanel() {
    const g = this.game, W = this.W;
    return `<h2>⚙ Settings</h2>
      <label class="row"><input type="checkbox" id="s-exe" ${W.exeMode ? 'checked' : ''}> <span><b>EXE Mode</b><br><span class="muted">Rare, subtle, unexplained things start happening underneath the simulation.</span></span></label>
      <label class="row"><span>Graphics</span><select id="s-q"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
      <label class="row"><span>Volume</span><input type="range" id="s-vol" min="0" max="1" step="0.05" value="${g.audio ? g.audio.volume : 0.7}"></label>
      <div class="btns"><button id="s-save">Save now</button><button id="s-new" class="danger">New city…</button></div>
      <p class="muted">The city autosaves every in-game day and when you close the tab. When you come back, it simulates what happened while you were away.</p>
      <p class="muted">FPS ${Math.round(g.fps)} · ${W.citizens.length} citizens · ${W.traffic.vehicles.length} vehicles</p>`;
  }
  bindSettings(P) {
    const g = this.game, W = this.W;
    P.querySelector('#s-exe').onchange = (e) => { W.exeMode = e.target.checked; this.toast(W.exeMode ? 'EXE Mode enabled. Nothing will seem different. At first.' : 'EXE Mode disabled.'); };
    const q = P.querySelector('#s-q'); q.value = g.renderer.quality; q.onchange = () => g.renderer.setQuality(q.value);
    P.querySelector('#s-vol').oninput = (e) => g.audio && g.audio.setVolume(+e.target.value);
    P.querySelector('#s-save').onclick = () => { g.save && g.save(); this.toast('City saved.'); };
    P.querySelector('#s-new').onclick = () => { if (confirm('Start a brand new city? The current city will be erased.')) { g.resetCity && g.resetCity(); } };
  }

  helpPanel() {
    return `<h2>Controls</h2>
      <h3>City view</h3><ul class="keys">
      <li><kbd>WASD</kbd>/<kbd>drag</kbd> pan · <kbd>wheel</kbd> zoom · <kbd>right-drag</kbd>/<kbd>Q</kbd><kbd>E</kbd> rotate</li>
      <li><kbd>click</kbd> inspect · <kbd>double-click</kbd> or <kbd>P</kbd> possess · <kbd>F</kbd> follow · <kbd>M</kbd> bookmark</li>
      <li><kbd>Space</kbd> pause · <kbd>1</kbd>–<kbd>5</kbd> speed · <kbd>0</kbd> slow-mo</li>
      <li><kbd>N</kbd> show me something interesting · <kbd>B</kbd> bookmarks · <kbd>H</kbd> archive · <kbd>G</kbd> god tools · <kbd>/</kbd> find someone</li></ul>
      <h3>Possessed</h3><ul class="keys">
      <li><kbd>WASD</kbd> move/drive · <kbd>mouse</kbd> look · <kbd>Shift</kbd> run · <kbd>Space</kbd> jump/handbrake</li>
      <li><kbd>E</kbd> interact · <kbd>F</kbd> enter/exit vehicle · <kbd>G</kbd> crime · <kbd>H</kbd> horn · <kbd>L</kbd> siren</li>
      <li><kbd>R</kbd> autopilot (let them live, keep watching) · <kbd>Q</kbd> leave body · <kbd>C</kbd> camera</li>
      <li>Firefighters: <kbd>hold mouse</kbd> to spray · Paramedics: <kbd>hold E</kbd> on the injured</li></ul>
      <p class="muted">Everything you see is simulated: if something is happening, you can usually dive in and take part.</p>`;
  }

  // ---------------------------------------------------------------- possession HUD
  onPossess() {
    this.ph.classList.remove('hidden');
    this.insp.classList.add('hidden');
    this.tick.classList.add('possessing');
    this.closePanel();
  }
  onRelease() {
    this.ph.classList.add('hidden');
    this.tick.classList.remove('possessing');
    this.renderInspector(true);
  }

  updatePossession(dt) {
    const g = this.game, W = this.W, P = g.possession, c = P.c;
    const ai = W.citizenAI;
    const obj = P.objective();
    const pos = W.citizenPos(c) || { x: 0, z: 0 };
    let dtxt = '';
    if (obj && obj.x != null) dtxt = ` <span class="d">${Math.round(dist(obj.x, obj.z, pos.x, pos.z))} m</span>`;
    const objHtml = obj ? `<div class="o ${obj.heat ? 'heat' : ''}">${esc(obj.label)}${dtxt}</div>` : '';
    if (this._obj !== objHtml) { this._obj = objHtml; this.ph.querySelector('#p-obj').innerHTML = objHtml; }
    const idHtml = `<div class="nm">${esc(c.name)}</div><div class="sub">${esc(ai.jobTitle(c))} · ${money(c.money)}${P.autopilot ? ' · <b>AUTOPILOT</b>' : ''}</div>`;
    if (this._id !== idHtml) { this._id = idHtml; this.ph.querySelector('#p-id').innerHTML = idHtml; }
    const pr = P.prompts.map((p) => `<div class="pr ${p.danger ? 'danger' : ''}">${p.key ? `<kbd>${p.key}</kbd>` : ''}${esc(p.text)}${p.progress != null ? `<i style="width:${Math.round(p.progress * 100)}%"></i>` : ''}</div>`).join('');
    if (this._pr !== pr) { this._pr = pr; this.ph.querySelector('#p-prompts').innerHTML = pr; }
    const v = P.veh;
    const spd = v ? `<b>${Math.round(v.speed * 3.6)}</b> km/h${v.siren ? ' <span class="siren">●</span>' : ''}<div class="dmg"><i style="width:${Math.round((1 - v.damage) * 100)}%"></i></div>` : P.heli ? `<b>${Math.round(Math.hypot(P.heli.vx, P.heli.vz) * 3.6)}</b> km/h · ${Math.round(P.heli.y - this.W.groundHeight(P.heli.x, P.heli.z, 0))} m AGL` : '';
    if (this._spd !== spd) { this._spd = spd; this.ph.querySelector('#p-speed').innerHTML = spd; }
    const keys = P.autopilot ? '<kbd>R</kbd> take control · <kbd>Q</kbd> leave' : P.mode === 'drive' ? '<kbd>WASD</kbd> drive · <kbd>Space</kbd> handbrake · <kbd>F</kbd> exit · <kbd>R</kbd> autopilot · <kbd>Q</kbd> leave' : P.mode === 'fly' ? '<kbd>W</kbd><kbd>S</kbd> pitch · <kbd>A</kbd><kbd>D</kbd> turn · <kbd>Space</kbd> climb · <kbd>C</kbd> descend · <kbd>Shift</kbd> boost' + (P.heli && P.heli.kind === 'police' ? ' · <kbd>L</kbd> searchlight' : '') + ' · <kbd>R</kbd> autopilot · <kbd>Q</kbd> leave' : P.mode === 'inside' ? '<kbd>WASD</kbd> move · <kbd>E</kbd> interact · <kbd>R</kbd> autopilot · <kbd>Q</kbd> leave' : '<kbd>WASD</kbd> move · <kbd>Shift</kbd> run · <kbd>E</kbd> interact · <kbd>R</kbd> autopilot · <kbd>Q</kbd> leave';
    if (this._keys !== keys) { this._keys = keys; this.ph.querySelector('#p-keys').innerHTML = keys; }
    // wanted level & weapon
    const heat = W.combat ? W.combat.heat : 0;
    const stars = heat > 0 ? `${'★'.repeat(Math.ceil(heat))}${'☆'.repeat(5 - Math.ceil(heat))}${W.time - W.combat.lastSeen > 20 ? '<small>searching</small>' : ''}` : '';
    if (this._st !== stars) { this._st = stars; const el = this.ph.querySelector('#p-stars'); el.innerHTML = stars; el.classList.toggle('flash', heat >= 3); }
    const wpn = g.weapons && g.weapons.cur ? `${g.weapons.cur === 'fists' ? '👊' : '🔫'} ${g.weapons.cur} ${g.weapons.cur !== 'fists' ? (g.weapons.ammo(c, g.weapons.cur) === Infinity ? '∞' : g.weapons.ammo(c, g.weapons.cur)) : ''}` : '';
    if (this._wp !== wpn) { this._wp = wpn; this.ph.querySelector('#p-weapon').textContent = wpn; }
    this.drawMinimap(pos, obj);
  }

  buildMinimapBase() {
    const W = this.W;
    const S = 600;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const g = cv.getContext('2d');
    const scale = S / (C.HALF * 2 + 160);
    this.mmScale = scale; this.mmSize = S;
    const tx = (x) => (x + C.HALF + 80) * scale;
    g.fillStyle = '#1a1f26'; g.fillRect(0, 0, S, S);
    for (const b of W.city.blocks) {
      g.fillStyle = b.water ? '#1d3a52' : b.park ? '#25402a' : '#232a33';
      g.fillRect(tx(b.X0), tx(b.Z0), (b.X1 - b.X0) * scale, (b.Z1 - b.Z0) * scale);
    }
    g.fillStyle = '#1d3a52';
    g.fillRect(tx(W.riverX[0]), 0, (W.riverX[1] - W.riverX[0]) * scale, S);
    for (const b of W.city.buildings) { g.fillStyle = '#39424e'; g.fillRect(tx(b.x0), tx(b.z0), (b.x1 - b.x0) * scale, (b.z1 - b.z0) * scale); }
    g.strokeStyle = '#6b7685'; g.lineCap = 'round';
    for (const r of W.city.net.roads) {
      g.lineWidth = (r.kind === 'highway' ? 9 : r.kind === 'ramp' ? 5 : 8) * scale;
      g.strokeStyle = r.kind === 'highway' || r.kind === 'ramp' ? '#8a7a5a' : '#5d6773';
      g.beginPath(); r.pts.forEach(([x, z], i) => (i ? g.lineTo(tx(x), tx(z)) : g.moveTo(tx(x), tx(z)))); g.stroke();
    }
    this.mmBase = cv;
  }

  drawMinimap(pos, obj) {
    const W = this.W;
    const cv = this.mini, g = cv.getContext('2d');
    const S = cv.width;
    const zoom = 2.4;
    const s = this.mmScale;
    const tx = (x) => (x + C.HALF + 80) * s;
    const yaw = this.game.rig.third.yaw;
    g.save();
    g.clearRect(0, 0, S, S);
    g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#12161c'; g.fillRect(0, 0, S, S);
    g.translate(S / 2, S / 2);
    g.rotate(Math.PI + yaw);
    g.scale(zoom, zoom);
    g.translate(-tx(pos.x), -tx(pos.z));
    g.drawImage(this.mmBase, 0, 0);
    const dot = (x, z, col, r = 2.2) => { g.fillStyle = col; g.beginPath(); g.arc(tx(x), tx(z), r / zoom * 2, 0, Math.PI * 2); g.fill(); };
    for (const inc of W.incidents.active()) if (inc.reported) dot(inc.x, inc.z, inc.type === 'fire' ? '#ff7a30' : '#ff4a4a', 3.2);
    for (const u of W.services.units) { if (u.kind !== 'police' || u.state === 'base') continue; const v = W.services.veh(u); if (v) dot(v.x, v.z, '#4a8aff', 2.4); }
    for (const inc of W.incidents.active()) for (const sid of inc.suspects) { const sp = W.citizenPos(W.citizens[sid]); if (sp && !sp.inside && inc.data.pursuitBy != null) dot(sp.x, sp.z, '#ff2020', 3); }
    if (obj && obj.x != null) dot(obj.x, obj.z, '#ffd040', 3.6);
    const ch = this.game.possession.carHint && this.game.possession.carHint();
    if (ch) { g.fillStyle = '#5fe3a0'; g.fillRect(tx(ch.x) - 2.2 / zoom * 2, tx(ch.z) - 1.4 / zoom * 2, 4.4 / zoom * 2, 2.8 / zoom * 2); }
    g.restore();
    // player arrow
    g.fillStyle = '#5fe3d0';
    g.beginPath(); g.moveTo(S / 2, S / 2 - 8); g.lineTo(S / 2 + 6, S / 2 + 6); g.lineTo(S / 2, S / 2 + 2); g.lineTo(S / 2 - 6, S / 2 + 6); g.closePath(); g.fill();
    // objective direction at the rim
    if (obj && obj.x != null) {
      const a = Math.atan2(obj.x - pos.x, obj.z - pos.z) - yaw;
      const d = Math.hypot(obj.x - pos.x, obj.z - pos.z) * s * zoom;
      if (d > S / 2 - 8) {
        const rx = S / 2 - Math.sin(a) * (S / 2 - 10), ry = S / 2 - Math.cos(a) * (S / 2 - 10);
        g.fillStyle = '#ffd040'; g.beginPath(); g.arc(rx, ry, 5, 0, Math.PI * 2); g.fill();
      }
    }
  }
}

function weatherIcon(W) {
  const k = W.weather.kind;
  const night = W.env.night > 0.5;
  return { clear: night ? '☾' : '☀', cloudy: '☁', rain: '🌧', storm: '⛈', fog: '🌫', snow: '🌨', blizzard: '❄', heatwave: '🔥' }[k] || '☀';
}
function moodBar(c) {
  const v = Math.round(c.happiness * 100);
  const col = v > 60 ? '#5fe3a0' : v > 35 ? '#ffd060' : '#ff6a5a';
  return `<span class="bar"><i style="width:${v}%;background:${col}"></i></span>`;
}
function sparkline(arr) {
  if (!arr.length) return '';
  const max = Math.max(...arr, 1);
  return `<span class="spark">${arr.map((v) => `<i style="height:${Math.max(2, Math.round((v / max) * 18))}px"></i>`).join('')}</span> <span class="muted">$${Math.round(arr[arr.length - 1])}/day</span>`;
}
function capital(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
