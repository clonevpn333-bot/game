// ============================================================================
// NEON BAY · 11_ui.js — UI: HUD, minimap, phone, social/life/elevator panels, dialogue, boot
// Concatenated in order by build.mjs into one module (shared scope, no cross-imports).
// ============================================================================
class UI {
  constructor(game) { this.game = game; this.modal = null; this.build(); }
  build() {
    const r = document.createElement('div'); r.id = 'ui'; r.innerHTML = `
      <div id="lbTop" class="lb"></div><div id="lbBot" class="lb"></div>
      <canvas id="map" width="190" height="190"></canvas>
      <div id="topright"><div id="money">$200</div><div id="wanted"></div><div id="clock"></div></div>
      <div id="gps"></div>
      <div id="district"></div>
      <div id="chevron"><div class="chv-arrow">➤</div><div class="chv-dist"></div></div>
      <div id="flash"></div>
      <div id="hp"><div id="hpfill"></div></div>
      <div id="weapon">Pistol</div>
      <div id="chapter"></div>
      <div id="obj"></div>
      <div id="toast"></div>
      <div id="dialogue" class="hidden"><div id="dspk"></div><div id="dtext"></div><div id="dhint">click / Space ▸</div></div>
      <div id="bigcard" class="hidden"><div class="bc1"></div><div class="bc2"></div></div>
      <div id="news" class="hidden"><span id="newstag">NB-24 NEWS</span><span id="newstxt"></span></div>
      <div id="introcap"></div>
      <div id="introskip" class="hidden">Space ▸ continue &nbsp;·&nbsp; Esc ▸ skip</div>
      <div id="crosshair"></div>
      <div id="overlay" class="hidden"></div>`;
    document.body.appendChild(r); this.root = r;
    this.el = { map: r.querySelector('#map').getContext('2d'), mapc: r.querySelector('#map'), money: r.querySelector('#money'), wanted: r.querySelector('#wanted'), clock: r.querySelector('#clock'), gps: r.querySelector('#gps'), district: r.querySelector('#district'), chevron: r.querySelector('#chevron'), flash: r.querySelector('#flash'), hp: r.querySelector('#hpfill'), obj: r.querySelector('#obj'), chapter: r.querySelector('#chapter'), toast: r.querySelector('#toast'), introcap: r.querySelector('#introcap'), introskip: r.querySelector('#introskip'), news: r.querySelector('#news'), newstxt: r.querySelector('#newstxt'), dialogue: r.querySelector('#dialogue'), dspk: r.querySelector('#dspk'), dtext: r.querySelector('#dtext'), big: r.querySelector('#bigcard'), weapon: r.querySelector('#weapon'), overlay: r.querySelector('#overlay'), lbTop: r.querySelector('#lbTop'), lbBot: r.querySelector('#lbBot') };
    r.querySelector('#dialogue').addEventListener('mousedown', () => this._advance());
    addEventListener('keydown', e => { if ((e.code === 'Space' || e.code === 'Enter') && this._dlg) { e.preventDefault(); this._advance(); } });
  }
  title() {
    this.modal = 'title'; this.el.overlay.className = 'menu';
    const sv = this.game.saveData, cont = sv && sv.ch > 0 ? `<button id="cont" class="bigbtn">CONTINUE — CH.${Math.min(sv.ch + 1, 8)}</button>` : '';
    this.el.overlay.innerHTML = `<div class="menuwrap"><div class="logo"><span class="l1">NEON</span><span class="l2">BAY</span></div><div class="tag">VICE • SUN • CHROME</div>${cont}<button id="play" class="bigbtn${cont ? ' ghost' : ''}">${cont ? 'NEW GAME' : 'START STORY'}</button><button id="free" class="bigbtn ghost">FREE ROAM</button><div class="ctrls"><span><b>WASD</b> move</span><span><b>Shift</b> sprint</span><span><b>Click</b> punch/shoot</span><span><b>1/2</b> holster/draw</span><span><b>E</b> use/rob/eat</span><span><b>B</b> buy</span><span><b>F</b> car</span><span><b>Space</b> jump / handbrake</span><span><b>P</b> phone</span></div><div class="note">An island city with a story — or pure free roam. Suburbs, beach, AMMU-BAY gun counter, Bay Mutual bank, county jail (escapable), day/night shifts with clerks who clock in and out, witnesses, tazers, drift physics. Your house is in the northwest 'burbs. Runs offline.</div></div>`;
    this.el.overlay.querySelector('#play').onclick = () => { this.modal = null; try { localStorage.removeItem('nb_save'); } catch (e) {} this.game.saveData = null; this.game.intro(); };
    this.el.overlay.querySelector('#free').onclick = () => { this.modal = null; this.game.startFreeRoam(); };
    const cb = this.el.overlay.querySelector('#cont'); if (cb) cb.onclick = () => { this.modal = null; this.game.start(); };
  }
  hideTitle() { this.el.overlay.className = 'hidden'; }
  pauseMenu(on) { if (on) { this.modal = 'pause'; this.el.overlay.className = 'menu'; this.el.overlay.innerHTML = `<div class="menuwrap"><div class="logo small"><span class="l1">PAUSED</span></div><button id="res" class="bigbtn">RESUME</button><button id="rl" class="bigbtn ghost">QUIT TO TITLE</button></div>`; this.el.overlay.querySelector('#res').onclick = () => this.game.resume(); this.el.overlay.querySelector('#rl').onclick = () => location.reload(); } else { this.modal = null; this.el.overlay.className = 'hidden'; } }
  bustedOrDead(word) { this.modal = 'dead'; this.game.input.unlock(); this.el.overlay.className = 'menu dead'; this.el.overlay.innerHTML = `<div class="menuwrap"><div class="logo small"><span class="wasted">${word}</span></div><button id="res" class="bigbtn">RESPAWN</button></div>`; this.el.overlay.querySelector('#res').onclick = () => location.reload(); }
  closeModal() { if (this.modal === 'pause') this.game.resume(); else if (this.modal === 'phone') this.phone(false); else if (this.modal === 'social' || this.modal === 'life') this.socialClose(); else { this.modal = null; this.el.overlay.className = 'hidden'; this.el.overlay.innerHTML = ''; } }
  // ---- your phone: clock, cash, GPS pins, cab dispatch ----
  phone(on) {
    if (!on) { this.modal = null; this.el.overlay.className = 'hidden'; this.el.overlay.innerHTML = ''; if (this.game.playing && !this.game.paused) this.game.input.lock(); return; }
    const g = this.game, p = g.player, hr = g.hour || 0, hh = ('' + (hr | 0)).padStart(2, '0'), mm = ('' + ((hr % 1) * 60 | 0)).padStart(2, '0');
    this.modal = 'phone'; g.input.unlock(); this.el.overlay.className = 'phone';
    const APPS = [['home', '🏠 Home'], ['mall', '🛍 Galleria'], ['gunshop', '🔫 Ammu-Bay'], ['motormax', '🚗 MotorMax'], ['bank', '🏦 Bay Mutual'], ['tonyDiner', "🍽 Tony's"], ['beach', '🌴 The Beach'], ['marina', '⚓ Marina'], ['privado', '🏝 Isla Privada']];
    this.el.overlay.innerHTML = `<div class="phoneui"><div class="pnotch"></div><div class="ptime">${hh}:${mm}</div><div class="pstat">$${p.money | 0} · ${p.wanted > 0 ? '★'.repeat(p.wanted) + ' heat' : 'no heat'}${g.jailed ? ' · JAILED' : ''}</div><div class="plabel">GPS PINS</div><div class="papps">${APPS.map(a => `<button data-gps="${a[0]}">${a[1]}</button>`).join('')}</div><button id="ptaxi" class="pwide">🚕 Call a cab — $50</button><button id="pclear" class="pwide pghost">✕ Clear GPS</button><div class="phint">P / ESC — pocket the phone</div></div>`;
    for (const b of this.el.overlay.querySelectorAll('[data-gps]')) b.onclick = () => { const pt2 = g.city.places[b.getAttribute('data-gps')]; if (pt2) { g.setGps(b.textContent.slice(2).trim(), pt2); this.toast('GPS set — follow the cyan beam'); } this.phone(false); };
    this.el.overlay.querySelector('#pclear').onclick = () => { g.clearGps(); this.phone(false); };
    this.el.overlay.querySelector('#ptaxi').onclick = () => {
      if (p.money < 50) { this.toast('Cab: you need $50'); return; }
      p.money -= 50; const c = g.city, sw = c.snapSidewalk(p.pos.x, p.pos.z);
      g._forceTaxi = true; const cab = new Car(g, sw[0], sw[1], new THREE.Vector3(0, 0, -1), 0xffd23a, true); g._forceTaxi = false; cab.speed = 0; g.cars.push(cab);
      this.toast('Cab dispatched — yellow ride on the nearest avenue (E to ride)'); this.phone(false);
    };
  }
  socialClose() { this.modal = null; this.el.overlay.className = 'hidden'; this.el.overlay.innerHTML = ''; if (this.game.playing && !this.game.paused) this.game.input.lock(); }
  elevatorMenu(el) {
    const g = this.game; this.modal = 'social'; g.input.unlock(); this.el.overlay.className = 'phone';
    const shown = Math.min(el.floors, 18), step = Math.max(1, Math.ceil(el.floors / shown));
    let btns = '<button data-fl="0">G · Lobby</button>';
    for (let f = 1; f <= el.floors; f += step) btns += `<button data-fl="${f}">Floor ${f}</button>`;
    btns += '<button data-fl="roof">☁ Roof</button>';
    this.el.overlay.innerHTML = `<div class="phoneui"><div class="pnotch"></div><div class="ptime">ELEVATOR</div><div class="pstat">${el.floors} floors · pick one</div><div class="papps">${btns}</div><button id="eclose" class="pwide pghost">✕ Stay here</button><div class="phint">E / ESC — close</div></div>`;
    for (const b of this.el.overlay.querySelectorAll('[data-fl]')) b.onclick = () => { const v = b.getAttribute('data-fl'); this.socialClose(); g.rideElevator(el, v === 'roof' ? 'roof' : (v | 0)); };
    this.el.overlay.querySelector('#eclose').onclick = () => this.socialClose();
  }
  socialMenu(ped, sayMsg) {
    if (!ped || !ped.person) return; const g = this.game, p = g.player, per = ped.person; this.modal = 'social'; g.input.unlock(); this.el.overlay.className = 'phone';
    const heart = per.affinity >= 70 ? '💞' : per.affinity >= 40 ? '❤️' : per.affinity >= 15 ? '🙂' : per.affinity <= -20 ? '😡' : '😐';
    const rel = p.dating === ped ? ' · dating' : (per.spouse === 'You' ? ' · your spouse' : (ped.ally ? ' · your crew' : ''));
    const acts = g.social.actions(ped);
    this.el.overlay.innerHTML = `<div class="phoneui"><div class="pnotch"></div><div class="ptime">${per.name}</div><div class="pstat">${per.age} · ${per.job} · ${per.mood}${rel}</div><div class="plabel">${heart} rapport ${per.affinity | 0}</div><div id="sline" class="pstat" style="min-height:18px">${sayMsg || (per.met ? '' : '“Do I know you?”')}</div><div class="papps">${acts.map(a => `<button data-act="${a[0]}">${a[1]}</button>`).join('')}</div><button id="sclose" class="pwide pghost">✕ Leave</button><div class="phint">E / ESC — walk away</div></div>`;
    for (const b of this.el.overlay.querySelectorAll('[data-act]')) b.onclick = () => { const res = g.social.act(ped, b.getAttribute('data-act')); if (res && res.close) this.socialClose(); else this.socialMenu(ped, res && res.msg); };
    this.el.overlay.querySelector('#sclose').onclick = () => this.socialClose();
  }
  lifePanel() {
    const g = this.game, p = g.player, s = g.social; this.modal = 'life'; g.input.unlock(); this.el.overlay.className = 'phone';
    const spouse = p.spouse ? '💍 ' + p.spouse.name : '— single —';
    const kids = p.kids.length ? p.kids.map(k => '👶 ' + k.name).join('<br>') : '— none —';
    const crew = g.npcs.filter(n => n.ally && n.followPlayer && n.person).map(n => '🤝 ' + n.person.name);
    const reps = Object.entries(s.rep).map(([k, v]) => `<div class="pstat" style="text-align:left">${k}: <b>${v > 0 ? '+' : ''}${v | 0}</b></div>`).join('');
    const news = s.news.slice(0, 7).map(n => `<div class="pstat" style="text-align:left">• ${n.msg}</div>`).join('');
    this.el.overlay.innerHTML = `<div class="phoneui"><div class="pnotch"></div><div class="ptime">YOUR LIFE</div><div class="pstat">Spouse: ${spouse}</div><div class="plabel">KIDS (${p.kids.length})</div><div class="pstat" style="text-align:left">${kids}</div>${crew.length ? '<div class="plabel">CREW</div><div class="pstat" style="text-align:left">' + crew.join('<br>') + '</div>' : ''}${p.spouse ? '<button id="lkid" class="pwide">👶 Start a family (at home)</button><button id="ldiv" class="pwide pghost">💔 Divorce</button>' : ''}<div class="plabel">REPUTATION</div>${reps}<div class="plabel">CITY NEWS</div>${news || '<div class="pstat">a quiet night in the Bay...</div>'}<button id="lclose" class="pwide pghost">✕ Close</button><div class="phint">L / ESC — close</div></div>`;
    const kd = this.el.overlay.querySelector('#lkid'); if (kd) kd.onclick = () => { const H = g.city.places.home; if (Math.hypot(p.pos.x - H.x, p.pos.z - H.z) < 9) { s.haveKid(); this.lifePanel(); } else this.toast('Go home to start a family'); };
    const dv = this.el.overlay.querySelector('#ldiv'); if (dv) dv.onclick = () => { s.divorce(); this.lifePanel(); };
    this.el.overlay.querySelector('#lclose').onclick = () => this.socialClose();
  }
  letterbox(on) { this.el.lbTop.style.height = on ? '11vh' : '0'; this.el.lbBot.style.height = on ? '11vh' : '0'; }
  introText(lines) { const el = this.el.introcap; el.innerHTML = lines.map(l => '<div>' + l + '</div>').join(''); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  introHide() { this.el.introcap.classList.remove('show'); this.el.introcap.innerHTML = ''; }
  introSkip(on) { this.el.introskip.classList.toggle('hidden', !on); }
  flash() { document.body.classList.add('hurt'); clearTimeout(this._ht); this._ht = setTimeout(() => document.body.classList.remove('hurt'), 160); }
  flashPhoto() { document.body.classList.add('snap'); clearTimeout(this._st); this._st = setTimeout(() => document.body.classList.remove('snap'), 200); }
  toast(t) { this.el.toast.textContent = t; this.el.toast.style.opacity = 1; clearTimeout(this._tt); this._tt = setTimeout(() => this.el.toast.style.opacity = 0, 1200); }
  news(t) { this.el.newstxt.textContent = t; this.el.news.classList.remove('hidden'); this.el.news.classList.add('on'); clearTimeout(this._nt); this._nt = setTimeout(() => { this.el.news.classList.remove('on'); this.el.news.classList.add('hidden'); }, 7000); }
  bigCard(a, b) { this.el.big.classList.remove('hidden'); this.el.big.querySelector('.bc1').textContent = a; this.el.big.querySelector('.bc2').textContent = b || ''; clearTimeout(this._bt); this._bt = setTimeout(() => this.el.big.classList.add('hidden'), 3800); }
  dialogue(lines, done) { this._dlg = { lines, i: 0, done }; this.modal = 'dlg'; this.game.input.unlock(); this.el.dialogue.classList.remove('hidden'); this._showLine(); }
  _showLine() { const d = this._dlg, l = d.lines[d.i]; if (!l) return; const ch = CHARS[l[0]] || { name: l[0], col: '#fff' }; this.el.dspk.textContent = ch.name; this.el.dspk.style.color = ch.col; this.el.dtext.textContent = l[1]; }
  _advance() { const d = this._dlg; if (!d) return; d.i++; if (d.i >= d.lines.length) { this.el.dialogue.classList.add('hidden'); this._dlg = null; this.modal = null; if (this.game.playing && !this.game.paused) this.game.input.lock(); d.done && d.done(); } else this._showLine(); }
  update() {
    const p = this.game.player, g = this.game; this.el.money.textContent = '$' + (p.money | 0); this.el.wanted.textContent = p.wanted > 0 ? '★'.repeat(p.wanted) : '';
    const hr = g.hour || 0, fat = g.player.fatigue || 0; this.el.clock.textContent = ('' + (hr | 0)).padStart(2, '0') + ':' + ('' + ((hr % 1) * 60 | 0)).padStart(2, '0') + (hr >= 6 && hr < 19 ? ' ☀' : ' ☾') + (fat > 0.6 ? (fat > 0.85 ? ' 😩' : ' 😴') : '');
    this.el.gps.textContent = g.gps ? '➤ ' + g.gps.name + ' — ' + Math.round(Math.hypot(p.pos.x - g.gps.x, p.pos.z - g.gps.z)) + 'm' : '';
    const dist = g.city.districtAt(p.pos.x, p.pos.z); if (dist !== this._lastDistrict) { this._lastDistrict = dist; const el = this.el.district; el.textContent = dist; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
    this.el.hp.style.width = clamp(p.health, 0, 100) + '%'; this.el.weapon.textContent = p.inCar ? '' : (p.weapon === 'pistol' && p.hasGun ? 'Pistol' : 'Fists');
    document.getElementById('crosshair').style.display = (!p.inCar && this.game.input.mR) ? 'block' : 'none'; this.minimap();
  }
  minimap() {
    const g = this.game, x = this.el.map, S = 190, sc = 0.42; x.clearRect(0, 0, S, S);
    x.save(); x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, TAU); x.clip(); x.fillStyle = '#160f24'; x.fillRect(0, 0, S, S);
    const px = g.player.pos.x, pz = g.player.pos.z, c = g.city, net = c.net, half = c.half;
    // water: sample the landmass field on a coarse grid, paint the sea cells
    x.fillStyle = '#16324a'; const step = 12, rng = (S / 2) / sc;
    for (let sy = 0; sy < S; sy += 6) for (let sx0 = 0; sx0 < S; sx0 += 6) { const wx = px + (sx0 - S / 2) / sc, wz = pz + (sy - S / 2) / sc; if (!net.isLand(wx, wz)) x.fillRect(sx0, sy, 6, 6); }
    // road network coloured by class
    const CW = { highway: ['#4a4f5a', 2.6], arterial: ['#40434c', 2.0], boulevard: ['#44414c', 2.0], collector: ['#3a3d45', 1.4], residential: ['#33353c', 1.0], alley: ['#2b2d33', 0.7] };
    for (const e of net.edges) { const a = net.nodes[e.a].position, b = net.nodes[e.b].position, cw = CW[e.class] || ['#3a3d45', 1]; x.strokeStyle = e.isBridge ? '#6a7280' : cw[0]; x.lineWidth = cw[1]; x.beginPath(); x.moveTo(S / 2 + (a.x - px) * sc, S / 2 + (a.z - pz) * sc); x.lineTo(S / 2 + (b.x - px) * sc, S / 2 + (b.z - pz) * sc); x.stroke(); }
    x.fillStyle = '#dfe6ef'; for (const car of g.cars) { const sx = S / 2 + (car.pos.x - px) * sc, sz = S / 2 + (car.pos.z - pz) * sc; x.fillRect(sx - 1.5, sz - 1.5, 3, 3); }
    for (const n of g.npcs) { if (n.dead) continue; x.fillStyle = n.cop ? '#5b8cff' : (n.story ? '#ffd23a' : '#5fe07f'); const sx = S / 2 + (n.pos.x - px) * sc, sz = S / 2 + (n.pos.z - pz) * sc; x.fillRect(sx - 1.5, sz - 1.5, 3, 3); }
    const pois = [[c.places.home, '#5fe07f'], [c.places.gunshop, '#ff9a3a'], [c.places.bank, '#ffd23a'], [c.places.motormax, '#2fe6ff'], [c.places.jail, '#9fb6c8']];
    for (const [pt2, col2] of pois) { const sx = S / 2 + (pt2.x - px) * sc, sz = S / 2 + (pt2.z - pz) * sc; if (sx < 8 || sx > S - 8 || sz < 8 || sz > S - 8) continue; x.fillStyle = col2; x.fillRect(sx - 2, sz - 2, 4, 4); }
    if (g.gps) { const sx = clamp(S / 2 + (g.gps.x - px) * sc, 8, S - 8), sz = clamp(S / 2 + (g.gps.z - pz) * sc, 8, S - 8); x.strokeStyle = '#2fe6ff'; x.lineWidth = 2; x.beginPath(); x.arc(sx, sz, 5, 0, TAU); x.stroke(); }
    if (g.story.marker && g.story.marker.visible) { const m = g.story.marker.position; let sx = clamp(S / 2 + (m.x - px) * sc, 8, S - 8), sz = clamp(S / 2 + (m.z - pz) * sc, 8, S - 8); x.fillStyle = '#ffcf3a'; x.beginPath(); x.arc(sx, sz, 4, 0, TAU); x.fill(); }
    x.translate(S / 2, S / 2); x.rotate(-g.player.camYaw); x.fillStyle = '#c39bff'; x.beginPath(); x.moveTo(0, -7); x.lineTo(5, 6); x.lineTo(-5, 6); x.closePath(); x.fill(); x.restore();
    x.strokeStyle = 'rgba(180,120,255,0.5)'; x.lineWidth = 3; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, TAU); x.stroke();
  }
}

function boot() { try { new Game(); const b = document.getElementById('boot'); if (b) b.style.display = 'none'; } catch (e) { const b = document.getElementById('boot'); if (b) { b.style.display = 'block'; b.style.color = '#f88'; b.textContent = 'Error: ' + e.message; } console.error(e); } }
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();

