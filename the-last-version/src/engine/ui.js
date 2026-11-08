// DOM overlay: fades, letterbox, chapter cards, subtitles, choices, objectives, prompts, menus.
const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const SPEAKERS = {
  KAI: { name: 'Kai', color: 'var(--kai)' },
  SERA: { name: 'Sera', color: 'var(--sera)' },
  VENN: { name: 'Dr. Venn', color: 'var(--venn)' },
  DISPATCH: { name: 'Dispatch', color: '#ffd27a', radio: true },
  PILOT: { name: 'Air-1', color: '#ffd27a', radio: true },
  ANCHOR: { name: 'Anchor', color: 'var(--sys)', radio: true },
  RADIO: { name: 'Radio', color: '#ffd27a', radio: true },
  MARA: { name: 'Mara', color: '#ffe08a', radio: true },
  CLERK: { name: '???', color: '#c9c9c9' },
  CAPTAIN: { name: 'Captain Bren', color: '#9fc0ff' },
  KING: { name: 'The Fallen King', color: '#ffb347' },
  ODILE: { name: 'Odile', color: '#f2d0a0' }, HALVARD: { name: 'Mr. Halvard', color: '#b8d0a0' }, JUNA: { name: 'Juna', color: '#a0c0f0' },
  PIM: { name: 'Pim', color: '#f0d870' }, WREN: { name: 'Old Wren', color: '#d8b8f0' }, TOBI: { name: 'Tobi', color: '#f0a080' },
};

export class UI {
  constructor(root, audio) {
    this.root = root; this.audio = audio;
    this.letter = el('div', 'letterbox', root); this.letter.style.cssText = 'position:absolute;inset:0;';
    this.hudRoot = el('div', '', root); this.hudRoot.style.cssText = 'position:absolute;inset:0;';
    this.subs = el('div', 'subs', root);
    this.choiceBox = el('div', 'choices interactive', root);
    this.obj = el('div', 'objective', root, '<div class="label">OBJECTIVE</div><div class="text"></div><div class="detail"></div>');
    this.promptEl = el('div', 'prompt', root);
    this.toastEl = el('div', 'toast', root);
    this.hintEl = el('div', 'hint', root);
    this.skipEl = el('div', 'skip', root, 'HOLD SPACE TO SKIP');
    this.card = el('div', 'chapter-card', root);
    this.noteEl = el('div', 'note-view', root);
    this.fadeEl = el('div', 'fade', root);
    this.menuRoot = el('div', '', root); this.menuRoot.style.cssText = 'position:absolute;inset:0;';
    this.fpsEl = el('div', 'fps', root);
    this.lineQueue = Promise.resolve();
    this.choiceResolve = null;
    this.subtitleSpeed = 1;
    this.skipRequested = false;
    addEventListener('keydown', (e) => {
      if (this.choiceResolve && /^Digit[1-4]$/.test(e.code)) this.pickChoice(+e.code.slice(5) - 1);
    });
  }

  fade(to, seconds = 1) {
    this.fadeEl.style.setProperty('--t', seconds + 's');
    this.fadeEl.style.opacity = to;
    return wait(seconds * 1000);
  }
  fadeColor(c) { this.fadeEl.style.background = c; }
  letterbox(on) { this.letter.classList.toggle('on', on); }
  showSkip(on) { this.skipEl.classList.toggle('show', on); }

  async chapterCard(num, name, genre, hold = 3.2) {
    this.card.innerHTML = `<div class="num">CHAPTER ${num}</div><div class="name">${name}</div><div class="genre">${genre}</div><div class="rule"></div>`;
    await wait(50);
    this.card.classList.add('show');
    await wait(hold * 1000);
    this.card.classList.remove('show');
    await wait(900);
  }

  /** Show one subtitle line. Lines can overlap (dialogue during action). Returns when it finishes. */
  say(speaker, text, opts = {}) {
    const sp = SPEAKERS[speaker] || { name: speaker, color: '#fff' };
    const line = el('div', 'sub-line' + (sp.radio ? ' radio' : '') + (opts.thought ? ' thought' : ''), this.subs);
    line.innerHTML = speaker === 'NONE' ? text : `<b style="color:${sp.color}">${sp.name}</b>${text}`;
    const dur = (opts.duration ?? Math.max(1.8, text.length * 0.058 + 0.8)) / this.subtitleSpeed;
    requestAnimationFrame(() => line.classList.add('show'));
    if (this.audio?.ctx && !opts.silent) this.audio.tone({ type: 'sine', freq: sp.radio ? 1800 : 520, dur: 0.03, vol: sp.radio ? 0.02 : 0.012, reverb: 0 });
    while (this.subs.children.length > 3) this.subs.firstChild.remove();
    return wait(dur * 1000).then(() => { line.classList.remove('show'); setTimeout(() => line.remove(), 400); });
  }

  /** Queue lines in sequence: [[speaker, text, opts?], ...] */
  async conversation(lines, isCancelled = () => false) {
    for (const l of lines) {
      if (isCancelled()) return;
      if (typeof l === 'function') { await l(); continue; }
      if (typeof l === 'number') { await wait(l * 1000); continue; }
      await this.say(l[0], l[1], l[2]);
    }
  }

  choice(question, options, { timeout = 0 } = {}) {
    this.choiceBox.innerHTML = '';
    if (question) el('div', 'q', this.choiceBox, question);
    options.forEach((o, i) => {
      const b = el('button', '', this.choiceBox, `<span class="k">${i + 1}</span>${o}`);
      b.onclick = () => this.pickChoice(i);
      b.onmouseenter = () => this.audio?.ui('hover');
    });
    let bar = null;
    if (timeout) { bar = el('div', 'timer', this.choiceBox); bar.style.transition = `transform ${timeout}s linear`; requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transform = 'scaleX(0)'; })); }
    this.audio?.ui('choice');
    this.choiceOpen = true;
    return new Promise((res) => {
      this.choiceResolve = res;
      if (timeout) this.choiceTimer = setTimeout(() => this.pickChoice(-1), timeout * 1000);
    });
  }
  pickChoice(i) {
    if (!this.choiceResolve) return;
    clearTimeout(this.choiceTimer);
    const r = this.choiceResolve; this.choiceResolve = null; this.choiceOpen = false;
    this.choiceBox.innerHTML = '';
    this.audio?.ui('click');
    r(i);
  }

  objective(text, detail = '') {
    if (!text) { this.obj.classList.remove('show'); return; }
    const t = this.obj.querySelector('.text'), d = this.obj.querySelector('.detail');
    const changed = t.textContent !== text;
    t.textContent = text; d.textContent = detail;
    this.obj.classList.add('show');
    if (changed) this.audio?.ui('objective');
  }
  objectiveDetail(detail) { this.obj.querySelector('.detail').textContent = detail; }

  prompt(html) {
    if (!html) { this.promptEl.classList.remove('show'); return; }
    if (this.promptEl.innerHTML !== html) this.promptEl.innerHTML = html;
    this.promptEl.classList.add('show');
  }

  toast(text, ms = 2500) {
    this.toastEl.textContent = text; this.toastEl.classList.add('show');
    clearTimeout(this.toastT); this.toastT = setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }

  hint(html, ms = 6000) {
    this.hintEl.innerHTML = html; this.hintEl.classList.add('show');
    clearTimeout(this.hintT); if (ms) this.hintT = setTimeout(() => this.hintEl.classList.remove('show'), ms);
  }
  clearHint() { this.hintEl.classList.remove('show'); }

  showNote(title, body, foot = '') {
    this.noteEl.innerHTML = `<div class="paper"><h3>${title}</h3>${body}<div class="foot">${foot || 'E / CLICK — PUT DOWN'}</div></div>`;
    this.noteEl.classList.add('show');
    this.noteOpen = true;
  }
  hideNote() { this.noteEl.classList.remove('show'); this.noteOpen = false; }

  /** Create a chapter HUD container. */
  hud(html) {
    const h = el('div', 'hud', this.hudRoot, html);
    requestAnimationFrame(() => h.classList.add('show'));
    return h;
  }
  clearHud() { this.hudRoot.innerHTML = ''; this.objective(null); this.prompt(null); this.clearHint(); this.subs.innerHTML = ''; }

  setFps(v) { this.fpsEl.textContent = v; }
}

export { el, wait };
