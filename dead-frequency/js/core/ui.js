'use strict';
// HUD, subtitles, choices, documents, computer screens, cards and fades.

const $ = id => document.getElementById(id);

const SPEAKER_COLORS = {
  EVAN: '#e8e2c8', MARCY: '#f0a8a8', RAY: '#a8c8f0', MOM: '#d8b0e8', JO: '#f0c890', DALE: '#c8d8a8', CALLER: '#9fb3c8',
  WALT: '#b8e0c8', DISPATCH: '#c0c0c0', RADIO: '#ffd9a0', '???': '#8899aa', DEPUTY: '#c8b090', HANK: '#d8c8a0', KAYLA: '#f0b8d8',
};

const UI = {
  subQueue: [],
  objText: '',
  choiceState: null,
  docOpen: false,
  pcOpen: false,
  toastT: 0,
  hintT: 0,

  init() {
    this.subsEl = $('subs');
    $('choices').addEventListener('mousemove', e => {
      const el = e.target.closest('.ch'); if (el && this.choiceState) { this.choiceState.sel = +el.dataset.i; this.renderChoices(); }
    });
    $('choices').addEventListener('click', e => { const el = e.target.closest('.ch'); if (el && this.choiceState) this.pickChoice(+el.dataset.i); });
  },
  blocking() { return this.docOpen || this.pcOpen || Phone.open || !!this.choiceState && this.choiceState.blocking; },

  // ---- prompt ----
  prompt(text, hold) {
    const el = $('prompt'), ch = $('crosshair');
    if (!text) { el.classList.remove('show'); ch.classList.remove('active'); this._lastPrompt = null; return; }
    if (this._lastPrompt !== text) {
      el.innerHTML = `<span class="key">E</span>${U.esc(text)}${hold ? ' <span class="dim">(hold)</span>' : ''}`;
      this._lastPrompt = text;
    }
    el.classList.add('show'); ch.classList.add('active');
  },
  holdRing(f) {
    const r = $('hold-ring');
    if (f <= 0) { r.style.display = 'none'; return; }
    r.style.display = 'block';
    r.querySelector('circle').style.strokeDashoffset = 100.5 * (1 - Math.min(1, f));
  },
  crosshair(on) { $('crosshair').classList.toggle('off', !on); },

  // ---- subtitles ----
  // kind: '' | 'thought' | 'radio' | 'phone'
  sub(who, text, dur, kind = '') {
    const el = this.subsEl;
    const line = document.createElement('div');
    line.className = 'line ' + kind;
    const col = SPEAKER_COLORS[who] || '#ddd';
    line.innerHTML = (who ? `<span class="who" style="color:${col}">${U.esc(who === 'THOUGHT' ? '' : who)}${who && who !== 'THOUGHT' ? ':' : ''}</span>` : '') + U.esc(text);
    const wrap = document.createElement('div'); wrap.appendChild(line);
    el.appendChild(wrap);
    while (el.children.length > 2) el.removeChild(el.firstChild);
    const rec = { wrap, until: G.time + dur };
    this.subQueue.push(rec);
    return rec;
  },
  clearSubs() { this.subsEl.innerHTML = ''; this.subQueue = []; },

  // ---- objective ----
  objective(text) {
    const el = $('objective');
    if (!text) { el.classList.remove('show'); this.objText = ''; return; }
    if (text === this.objText) return;
    this.objText = text;
    el.innerHTML = `<div class="lbl">SHIFT NOTES</div>${U.esc(text)}`;
    el.classList.add('show'); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  },
  toast(text, dur = 3) { const el = $('toast'); el.textContent = text; el.classList.add('show'); this.toastT = dur; },
  hint(text, dur = 5) { const el = $('hint'); if (!text) { el.classList.remove('show'); return; } el.innerHTML = text; el.classList.add('show'); this.hintT = dur; },

  // ---- choices ----
  // opts: { timeout, blocking }
  choices(list, o = {}) {
    return new Promise(res => {
      this.choiceState = { list, sel: 0, res, timeout: o.timeout || 0, t0: G.time, blocking: !!o.blocking, def: o.def == null ? list.length - 1 : o.def };
      this.renderChoices();
      $('choices').classList.add('show');
    });
  },
  renderChoices() {
    const s = this.choiceState; if (!s) return;
    $('choices').innerHTML = s.list.map((c, i) => `<div class="ch ${i === s.sel ? 'sel' : ''}" data-i="${i}"><span class="n">${i + 1}.</span>${U.esc(c)}</div>`).join('') + (s.timeout ? '<div class="timer" id="ch-timer"></div>' : '');
  },
  pickChoice(i) {
    const s = this.choiceState; if (!s) return;
    this.choiceState = null;
    $('choices').classList.remove('show'); $('choices').innerHTML = '';
    SND.sfx('uiSelect', { bus: 'ui' });
    s.res(i);
  },
  cancelChoices() { if (this.choiceState) { const s = this.choiceState; this.choiceState = null; $('choices').classList.remove('show'); s.res(-1); } },

  // ---- documents ----
  // html content; style: '' | 'hand' | 'lined' | 'flyer' | 'photo' | 'fax'
  doc(html, style = '') {
    return new Promise(res => {
      const p = $('doc-paper'); p.className = style; p.innerHTML = html; p.scrollTop = 0;
      $('doc').classList.remove('hidden'); this.docOpen = true; this._docRes = res;
      SND.sfx('paper', { bus: 'ui' });
    });
  },
  closeDoc() { if (!this.docOpen) return; $('doc').classList.add('hidden'); this.docOpen = false; SND.sfx('paper', { bus: 'ui' }); const r = this._docRes; this._docRes = null; if (r) r(); },

  // ---- computer ----
  pc(render) {
    return new Promise(res => {
      this.pcOpen = true; this._pcRes = res; this._pcRender = render;
      $('computer').classList.remove('hidden');
      Input.unlock();
      render($('pc-screen'));
    });
  },
  pcRefresh() { if (this.pcOpen && this._pcRender) this._pcRender($('pc-screen')); },
  closePc() { if (!this.pcOpen) return; this.pcOpen = false; $('computer').classList.add('hidden'); $('pc-screen').innerHTML = ''; const r = this._pcRes; this._pcRes = null; this._pcRender = null; Main.requestLock(); if (r) r(); },

  // ---- fades & cards ----
  fade(to, dur = 1) {
    const el = $('fade');
    el.style.transition = `opacity ${dur}s linear`;
    el.style.opacity = to;
    return Story.wait(dur);
  },
  fadeNow(v) { const el = $('fade'); el.style.transition = 'none'; el.style.opacity = v; },
  async card(html, dur = 4) {
    const c = $('card'), inner = $('card-inner');
    inner.innerHTML = `<div class="fadein">${html}</div>`;
    c.classList.remove('hidden');
    await Story.wait(dur);
    inner.style.transition = 'opacity 1s'; inner.style.opacity = 0;
    await Story.wait(1);
    c.classList.add('hidden'); inner.style.opacity = 1; inner.style.transition = '';
  },
  chapterCard(num, title, time) {
    return this.card(`<div class="ch-num">${U.esc(num)}</div><div class="ch-title">${U.esc(title)}</div><div class="ch-time">${U.esc(time)}</div>`, 4.2);
  },
  narr(text, sig, dur) { return this.card(`<div class="narr">${text}${sig ? `<span class="sig">${sig}</span>` : ''}</div>`, dur || Math.max(5, text.length * 0.055)); },
  bluescreen(text) {
    $('bs-text').innerHTML = text || '';
    $('bluescreen').classList.toggle('hidden', text == null);
  },

  osd(on) { $('osd').classList.toggle('hidden', !on); $('osd').classList.add('blink'); setTimeout(() => $('osd').classList.remove('blink'), 4000); },
  callUI(text) { const el = $('call-ui'); if (!text) { el.classList.remove('show'); return; } el.innerHTML = text; el.classList.add('show'); },
  qte(text, f) { const el = $('qte'); if (text == null) { el.classList.remove('show'); return; } el.innerHTML = `${U.esc(text)}<div class="bar"><div class="fill" style="width:${Math.round(f * 100)}%"></div></div>`; el.classList.add('show'); },

  update(dt) {
    // expire subtitles
    for (const s of this.subQueue.slice()) if (G.time > s.until) { s.wrap.remove(); this.subQueue.splice(this.subQueue.indexOf(s), 1); }
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) $('toast').classList.remove('show'); }
    if (this.hintT > 0) { this.hintT -= dt; if (this.hintT <= 0) $('hint').classList.remove('show'); }
    // choices keyboard
    const s = this.choiceState;
    if (s) {
      for (let i = 0; i < s.list.length && i < 4; i++) if (Input.pressed('Digit' + (i + 1))) { this.pickChoice(i); return; }
      if (Input.wheel) { s.sel = (s.sel + Input.wheel + s.list.length) % s.list.length; this.renderChoices(); }
      if (Input.pressed('ArrowUp')) { s.sel = (s.sel - 1 + s.list.length) % s.list.length; this.renderChoices(); }
      if (Input.pressed('ArrowDown')) { s.sel = (s.sel + 1) % s.list.length; this.renderChoices(); }
      if (Input.pressed('Enter') || (Input.locked && Input.mousePressed)) { this.pickChoice(s.sel); return; }
      if (s.timeout) {
        const f = 1 - (G.time - s.t0) / s.timeout; const tb = $('ch-timer'); if (tb) tb.style.transform = `scaleX(${Math.max(0, f)})`;
        if (f <= 0) this.pickChoice(s.def);
      }
    }
    if (this.docOpen && (Input.pressed('KeyE') || Input.pressed('Escape'))) { Input.consume('KeyE'); Input.consume('Escape'); this.closeDoc(); }
    if (this.pcOpen && Input.pressed('Escape')) { Input.consume('Escape'); this.closePc(); }
  },
};
