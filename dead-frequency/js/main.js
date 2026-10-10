'use strict';
// Boot, main loop, title / pause menus, settings.

const Main = {
  last: 0,
  allowUnlock: false,

  init() {
    try { Object.assign(G.settings, JSON.parse(localStorage.getItem('df_settings') || '{}')); } catch (e) { /* */ }
    Engine.init();
    Input.init(G.renderer.domElement);
    Player.init();
    UI.init();
    Phone.init();
    Bus.on('lockchange', locked => this.onLock(locked));
    G.renderer.domElement.addEventListener('click', () => { if (G.running && !G.paused) this.requestLock(); });
    $('click-lock').addEventListener('click', () => { $('click-lock').classList.add('hidden'); this.requestLock(); });
    $('title-menu').innerHTML = '<div class="mi disabled">LOADING…</div>';
    requestAnimationFrame(t => this.loop(t));
    Humans.init().then(() => {
      this.buildTitle();
      // allow automated testing to skip straight into a segment: ?seg=id
      const q = new URLSearchParams(location.search);
      if (q.get('speed')) this.speed = +q.get('speed');
      if (q.get('norender')) this.noRender = true;
      if (q.get('seg')) { this.audio(); this.begin(q.get('seg'), q.get('nocard') === '1'); }
    });
  },

  audio() { SND.init(); SND.resume(); Radio.init(); },

  begin(seg, noCard) {
    $('title').classList.add('hidden');
    G.paused = false; G.running = true;
    UI.osd(true);
    this.requestLock();
    Story.start(seg, { noCard });
  },
  newGame() {
    Story.flags = {}; Story.reached = [];
    this.audio();
    this.begin('intro');
  },

  requestLock() {
    if (!G.running) return;
    Input.lock();
    setTimeout(() => { if (G.running && !G.paused && !Input.locked && !UI.pcOpen) $('click-lock').classList.remove('hidden'); }, 400);
  },
  onLock(locked) {
    if (locked) { $('click-lock').classList.add('hidden'); return; }
    if (!G.running || UI.pcOpen || this.allowUnlock) return;
    this.pause();
  },
  pause() {
    if (G.paused || !G.running) return;
    G.paused = true;
    if (UI.docOpen) UI.closeDoc();
    $('pause').classList.remove('hidden');
    this.buildPause();
    SND.setVolume(G.settings.volume * 0.35);
  },
  resume() {
    $('pause').classList.add('hidden');
    G.paused = false;
    SND.setVolume(G.settings.volume);
    this.requestLock();
  },

  menu(el, items) {
    el.innerHTML = '';
    for (const it of items) {
      const d = document.createElement('div');
      d.className = 'mi' + (it.disabled ? ' disabled' : '') + (it.small ? ' small' : '');
      d.textContent = it.label;
      if (!it.disabled) d.addEventListener('click', () => { SND.ready && SND.sfx('uiSelect', { bus: 'ui' }); it.fn(); });
      el.appendChild(d);
    }
  },
  buildTitle() {
    const save = Story.load();
    const items = [{ label: 'NEW TAPE', fn: () => this.newGame() }];
    if (save && save.seg) items.push({ label: 'CONTINUE', fn: () => { Story.flags = save.flags || {}; Story._savedFlags = JSON.parse(JSON.stringify(Story.flags)); this.audio(); this.begin(save.seg, true); } });
    if (save && save.reached && save.reached.length > 1) items.push({ label: 'CHAPTERS', fn: () => this.buildChapters(save) });
    items.push({ label: 'SETTINGS', small: true, fn: () => this.buildSettingsTitle() });
    this.menu($('title-menu'), items);
  },
  buildChapters(save) {
    const items = [];
    for (const id of Story.order) {
      const s = Story.segments[id]; if (!s.chapterSelect) continue;
      const ok = save.reached.includes(id);
      items.push({ label: ok ? s.chapterSelect : '— — —', small: true, disabled: !ok, fn: () => { Story.flags = Object.assign({}, s.defaultFlags || {}); this.audio(); this.begin(id); } });
    }
    items.push({ label: 'BACK', small: true, fn: () => this.buildTitle() });
    this.menu($('title-menu'), items);
  },
  buildSettingsTitle() {
    const el = $('title-menu'); el.innerHTML = '';
    const box = document.createElement('div'); box.id = 'settings-t'; el.appendChild(box);
    this.settingsUI(box);
    const back = document.createElement('div'); back.className = 'mi small'; back.textContent = 'BACK'; back.onclick = () => this.buildTitle(); el.appendChild(back);
  },
  buildPause() {
    this.menu($('pause-menu'), [
      { label: 'RESUME', fn: () => this.resume() },
      { label: 'RESTART CHECKPOINT', small: true, fn: () => { this.resume(); Story.restart(); } },
      { label: 'QUIT TO TITLE', small: true, fn: () => location.reload() },
    ]);
    this.settingsUI($('settings'));
  },
  settingsUI(el) {
    const S = G.settings;
    const rows = [['Mouse sensitivity', 'sens', 0.2, 3, 0.05], ['Volume', 'volume', 0, 1, 0.05], ['Brightness', 'brightness', 0.6, 1.8, 0.05], ['VHS effect', 'vhs', 0, 1.5, 0.05], ['Quality (0 low – 2 high)', 'quality', 0, 2, 1]];
    el.innerHTML = rows.map(r => `<div class="row"><span>${r[0]}</span><input type="range" min="${r[2]}" max="${r[3]}" step="${r[4]}" value="${S[r[1]]}" data-k="${r[1]}"></div>`).join('') + `<div class="row"><span>Invert mouse Y</span><input type="checkbox" data-k="invertY" ${S.invertY ? 'checked' : ''}></div>`;
    el.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => {
      const k = inp.dataset.k; S[k] = inp.type === 'checkbox' ? inp.checked : parseFloat(inp.value);
      if (k === 'volume') SND.setVolume(G.paused ? S.volume * 0.35 : S.volume);
      if (k === 'quality') Engine.resize();
      try { localStorage.setItem('df_settings', JSON.stringify(S)); } catch (e) { /* */ }
    }));
  },

  loop(ts) {
    const dt = Math.min(0.05, (ts - this.last) / 1000 || 0);
    this.last = ts;
    if (G.running && !G.paused) {
      const sp = this.speed || 1;
      G.time += dt * sp; G.dt = dt;
      // each system runs guarded: one bad frame in one system must never freeze the whole game
      const step = (name, f) => { try { f(); } catch (e) { if (!this._errs) this._errs = {}; if (!this._errs[name]) { this._errs[name] = 1; console.error('[' + name + ']', e && e.stack || e); } } };
      step('story', () => Story.update(dt * sp));
      step('move', () => { if (G.mode === 'car') Car.update(dt); else Player.update(dt); });
      step('stalker', () => Stalker.update(dt));
      step('npcs', () => NPCs.update(dt));
      step('level', () => { if (G.level) G.level.update(dt); });
      step('physics', () => Physics.update(dt));
      step('interact', () => Interact.update(dt));
      step('hands', () => Hands.update(dt));
      step('phone', () => Phone.update());
      step('hud', () => { if (Story.hud) Story.hud(dt); });
    }
    UI.update(dt);
    if (G.camera) SND.setListener(G.camera);
    SND.update(dt);
    if (G.level && !this.noRender) { try { Engine.render(G.paused ? 0 : dt); } catch (e) { if (!this._rerr) { this._rerr = 1; console.error('[render]', e && e.stack || e); } } }
    // camcorder clock
    if (G.running) { const t = Story.clockStr(); if (t !== this._osdT) { this._osdT = t; $('osd-time').textContent = t; } }
    Input.flush();
    requestAnimationFrame(t => this.loop(t));
  },
};

window.addEventListener('load', () => Main.init());
