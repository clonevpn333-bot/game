// Broadcast-style gameplay HUD.
import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const _v = new THREE.Vector3();
const KEYS = { revolver: 'REVOLVER', rifle: 'RIFLE', shotgun: 'SHOTGUN', rail: 'RAILGUN', gravity: 'GRAV-CANNON' };

export class HUD {
  constructor(app) {
    this.app = app;
    this.el = $('hud');
    this.cache = {};
    this.hintShown = new Set();
    this.dn = [];
    for (let i = 0; i < 24; i++) { const d = document.createElement('div'); d.className = 'dn'; d.style.opacity = 0; $('dmgnums').appendChild(d); this.dn.push({ el: d, t: 0, pos: new THREE.Vector3() }); }
    this.dnIdx = 0;
    this.viewers = 1.21;
    this.subPortrait = $('subPortrait');
  }
  show(on) { this.el.classList.toggle('active', on); }
  reset(game) {
    this.game = game;
    this.cache = {};
    $('hudFloor').textContent = 'FLOOR ' + String(game.floorDef.id).padStart(2, '0');
    $('hudFloorName').textContent = game.floorDef.name;
    $('killfeed').innerHTML = '';
    $('banners').innerHTML = '';
    $('toasts').innerHTML = '';
    this.hideVote();
    this.subtitle(null);
    this.hint(null);
    this.boss(null);
    this.setObjective('', '');
  }
  setObjective(text, sub) {
    const m = $('objMain');
    if (m.textContent !== text) { m.textContent = text; m.classList.remove('flash'); void m.offsetWidth; if (text) m.classList.add('flash'); }
    $('objSub').textContent = sub || '';
  }
  boss(name, frac) {
    const b = $('hudBoss');
    if (!name) { b.classList.remove('on'); return; }
    b.classList.add('on');
    $('bossName').textContent = name;
    $('bossFill').style.width = Math.max(0, frac * 100) + '%';
  }
  update(game, dt) {
    const pl = game.player;
    const C = this.cache;
    const set = (k, v, fn) => { if (C[k] !== v) { C[k] = v; fn(v); } };
    // clock / viewers
    const t = game.time;
    const tc = `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor(t / 60) % 60).padStart(2, '0')}:${String(Math.floor(t) % 60).padStart(2, '0')}`;
    set('clock', tc, (v) => { $('hudClock').textContent = v; });
    this.viewers += (1.05 + game.hype * 0.9 - this.viewers) * dt * 0.3 + (Math.random() - 0.5) * 0.002;
    set('viewers', this.viewers.toFixed(2), (v) => { $('hudViewers').textContent = v + 'B'; });
    // ratings
    const hp = Math.round(game.hype * 100);
    set('hype', hp, (v) => { $('rtFill').style.width = v + '%'; $('rtPct').textContent = v + '%'; });
    set('score', game.score, (v) => { $('hudScore').textContent = v.toLocaleString(); });
    const mult = 1 + Math.min(4, Math.floor(game.combo.count / 3)) * 0.5;
    set('mult', mult, (v) => { $('hudMult').textContent = v > 1 ? '×' + v : ''; });
    set('combo', game.combo.count, (v) => { const e = $('hudCombo'); e.textContent = v > 1 ? v + ' COMBO' : ''; e.classList.remove('pop'); void e.offsetWidth; if (v > 1) e.classList.add('pop'); });
    // health
    const hpp = Math.max(0, pl.hp / pl.maxHp);
    set('hp', Math.round(hpp * 200), () => {
      $('hpFill').style.width = (hpp * 100) + '%';
      $('hpGhost').style.width = (hpp * 100) + '%';
      $('hpFill').classList.toggle('low', hpp < 0.3);
      $('hpNum').textContent = Math.ceil(pl.hp);
    });
    set('o2on', pl.inWater > 1.6 || pl.oxygen < 1, (v) => $('o2').classList.toggle('on', v));
    set('o2', Math.round(pl.oxygen * 50), () => { $('o2Fill').style.width = pl.oxygen * 100 + '%'; });
    set('pd', pl.dodgeCool > 0, (v) => $('pipDodge').classList.toggle('cool', v));
    set('pg', pl.grapple.cool > 0 || pl.mode === 'grapple', (v) => $('pipGrapple').classList.toggle('cool', v));
    set('pj', pl.abilities.doubleJump, (v) => $('pipJump').classList.toggle('off', !v));
    set('pjc', pl.jumps >= 2, (v) => $('pipJump').classList.toggle('cool', v));
    // weapon
    const A = pl.arsenal;
    const w = A.current;
    if (w) {
      const melee = A.meleeT > 0;
      set('wname', melee ? A.melee.def.name : w.def.name, (v) => { $('wpName').textContent = v; });
      const ammo = w.def.energy ? Math.floor(w.ammo) + '%' : w.ammo;
      set('wammo', ammo, (v) => { $('wpAmmo').textContent = v; $('wpAmmo').parentElement.classList.toggle('low', !w.def.energy && w.ammo <= Math.ceil(w.def.mag * 0.25)); });
      set('wres', w.reserve, (v) => { $('wpRes').textContent = w.def.energy ? '' : '/ ' + (v === Infinity ? '∞' : v); });
      set('wrel', w.reloading > 0 || (w.charge > 0), (v) => { $('wpReload').classList.toggle('on', v); $('wpReload').textContent = w.charge > 0 ? 'CHARGING' : 'RELOADING'; });
      const slots = A.slots.map((s, i) => `${i}${s.id}${i === A.index}`).join('|') + A.melee.id;
      set('slots', slots, () => {
        $('wpSlots').innerHTML = A.slots.map((s, i) => `<div class="wp-slot ${i === A.index ? 'on' : ''}"><b>${i + 1}</b>${KEYS[s.id] || s.id}</div>`).join('') + `<div class="wp-slot"><b>F</b>${A.melee.def.short}</div>`;
      });
      // crosshair spread
      const spread = (w.def.spread || 0) + (w.bloom || 0) + (pl.aiming ? 0 : 0.01) + Math.min(0.03, Math.hypot(pl.vel.x, pl.vel.z) * 0.001);
      const px = Math.round(6 + spread * 600 * (w.def.pellets > 1 ? 0.6 : 1) + (w.recoil || 0) * (w.def.auto ? 5 : 12));
      set('xs', px, (v) => $('crosshair').style.setProperty('--s', v + 'px'));
    }
    set('xenemy', !!pl.aimEnemy, (v) => $('crosshair').classList.toggle('enemy', v));
    // grapple hint
    const gh = game._grappleHint;
    const ghEl = $('grappleHint');
    if (gh && pl.alive) {
      _v.copy(gh.pos).project(game.camera);
      if (_v.z < 1) {
        ghEl.classList.add('on');
        ghEl.style.transform = `translate(${(_v.x * 0.5 + 0.5) * innerWidth}px, ${(-_v.y * 0.5 + 0.5) * innerHeight}px)`;
      } else ghEl.classList.remove('on');
    } else ghEl.classList.remove('on');
    // damage numbers
    for (const d of this.dn) {
      if (d.t <= 0) continue;
      d.t -= dt;
      _v.copy(d.pos).project(game.camera);
      if (_v.z > 1 || d.t <= 0) { d.el.style.opacity = 0; continue; }
      const k = 1 - d.t / 0.8;
      d.el.style.left = ((_v.x * 0.5 + 0.5) * innerWidth) + 'px';
      d.el.style.top = ((-_v.y * 0.5 + 0.5) * innerHeight - k * 40) + 'px';
      d.el.style.opacity = Math.min(1, d.t * 3);
    }
    // vote timer tick
    // banners countdown
    for (const b of $('banners').children) {
      const left = (b._end - performance.now()) / 1000;
      if (b._bar) b._bar.style.width = Math.max(0, left / b._dur * 100) + '%';
      if (left <= 0) b.remove();
    }
  }
  damageNumber(pos, val, head) {
    const d = this.dn[this.dnIdx++ % this.dn.length];
    d.pos.copy(pos).add(_v.set((Math.random() - 0.5) * 0.4, 0.2, 0));
    d.t = 0.8;
    d.el.textContent = val;
    d.el.className = 'dn' + (head ? ' head' : '');
  }
  hitmarker(head, kill, armor) {
    const h = $('hitmarker');
    h.className = 'hm';
    void h.offsetWidth;
    h.className = 'hm show' + (head ? ' head' : '') + (kill ? ' kill' : '') + (armor ? ' armor' : '');
  }
  armorPing() { this.hitmarker(false, false, true); }
  flashCrosshair() { this.hitmarker(false, false, true); }
  damageIndicator(angle) {
    const a = document.createElement('div');
    a.className = 'dmg-arc';
    a.style.transform = `rotate(${-angle}rad)`;
    $('dmgRing').appendChild(a);
    setTimeout(() => a.remove(), 900);
  }
  killFeed(name, tags, pts, mult) {
    const kf = $('killfeed');
    const el = document.createElement('div');
    el.className = 'kf';
    el.innerHTML = `<b>+${pts}</b>${name}${tags.length ? '<i>' + tags.map((t) => t[0]).join(' · ') + '</i>' : ''}`;
    kf.prepend(el);
    while (kf.children.length > 6) kf.lastChild.remove();
    setTimeout(() => el.classList.add('out'), 3200);
    setTimeout(() => el.remove(), 3600);
  }
  banner(text, kind, dur) {
    const b = document.createElement('div');
    b.className = 'banner ' + (kind || '');
    b.innerHTML = `<span>⚠ ${text}</span><div class="bt"></div>`;
    b._end = performance.now() + dur * 1000;
    b._dur = dur;
    b._bar = b.querySelector('.bt');
    $('banners').appendChild(b);
  }
  clearBanners() { $('banners').innerHTML = ''; }
  toast(text, kind = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.textContent = text;
    $('toasts').appendChild(t);
    setTimeout(() => t.remove(), 2900);
  }
  // tutorial hints: html with <span class="key">..</span>
  hint(html, dur = 5, id) {
    const h = $('hint');
    clearTimeout(this._hintT);
    if (!html) { h.classList.remove('on'); return; }
    if (id) { if (this.hintShown.has(id)) return; this.hintShown.add(id); }
    h.innerHTML = html;
    h.classList.remove('on'); void h.offsetWidth; h.classList.add('on');
    this._hintT = setTimeout(() => h.classList.remove('on'), dur * 1000);
  }
  showVote(s) {
    $('voteTitle').textContent = s.title;
    $('voteOpts').innerHTML = s.options.map((o, i) => `<div class="vopt" id="vopt${i}"><div class="vf"></div><span class="vk">${o.kind === 'gift' ? 'GIFT' : o.kind === 'chaos' ? 'CHAOS' : 'DISASTER'}</span><span class="vl">${o.icon ? o.icon + ' ' : ''}${o.label}</span><span class="vp">0%</span></div>`).join('');
    $('vote').classList.add('on');
    $('voteFoot').textContent = 'Simulated studio audience — open spectator.html in another tab to cast live votes';
  }
  updateVote(s, p, tl) {
    s.options.forEach((o, i) => {
      const el = $('vopt' + i);
      if (!el) return;
      el.querySelector('.vf').style.width = (p[i] * 100).toFixed(1) + '%';
      el.querySelector('.vp').textContent = Math.round(p[i] * 100) + '%';
    });
    $('voteTimer').textContent = Math.ceil(tl);
    if (s.external) $('voteFoot').textContent = `${s.external} live spectator ballot${s.external > 1 ? 's' : ''} received`;
  }
  resolveVote(s, w, p) {
    this.updateVote(s, p, 0);
    $('voteTitle').textContent = 'THE AUDIENCE HAS SPOKEN!';
    s.options.forEach((o, i) => { const el = $('vopt' + i); if (el) el.classList.add(i === w ? 'win' : 'lose'); });
  }
  hideVote() { $('vote').classList.remove('on'); }
  subtitle(L) {
    const s = $('sub');
    if (!L) { s.classList.remove('on'); return; }
    s.classList.toggle('iris', L.who === 'iris');
    $('subWho').textContent = L.who === 'halo' ? 'MR. HALO' : L.who === 'iris' ? 'IRIS — ENCRYPTED CHANNEL' : L.who.toUpperCase();
    $('subLine').textContent = L.text;
    const cv = L.who === 'halo' ? this.app.host.canvas : L.who === 'iris' ? this.app.host.irisCanvas : null;
    if (cv && cv.parentElement !== this.subPortrait) { this.subPortrait.innerHTML = ''; this.subPortrait.appendChild(cv); }
    this.subPortrait.style.display = cv ? 'block' : 'none';
    s.classList.remove('on'); void s.offsetWidth; s.classList.add('on');
  }
}
