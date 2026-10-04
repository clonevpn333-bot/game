const el = (tag: string, cls = '', html = ''): HTMLElement => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export interface Settings {
  master: number;
  music: number;
  sfx: number;
  sensitivity: number;
  invertY: boolean;
  quality: 'low' | 'medium' | 'high';
  subtitles: boolean;
  subSize: number;
}

export interface MenuHandlers {
  onContinue: () => void;
  onNewGame: () => void;
  onChapter: (i: number) => void;
  onResume: () => void;
  onRestartCheckpoint: () => void;
  onQuitToTitle: () => void;
  onSettings: (s: Settings) => void;
}

export class Hud {
  readonly root: HTMLElement;
  private barsEl = el('div', 'bars');
  private subsEl = el('div', 'subs');
  private subEl = el('div', 'sub');
  private objEl = el('div', 'objective');
  private promptEl = el('div', 'prompt');
  private reticleEl = el('div', 'reticle', '<i></i><i></i><i></i><i></i>');
  private dotEl = el('div', 'dot');
  private clusterEl = el('div', 'cluster');
  private echoEl = el('div', 'echoRing');
  private ammoEl = el('div', 'ammo hide');
  private toastEl = el('div', 'toast');
  private cardEl = el('div', 'card');
  private fadeEl = el('div', 'fade');
  private docEl = el('div', 'doc');
  private padEl = el('div', 'keypad');
  private hurtEl = el('div', 'hurt');
  private chipEl = el('div', 'chip');
  private hintEl = el('div', 'hint-bar');
  private loadingEl = el('div', 'loading', '<div class="l-in"><div class="l-clock">2:17</div><div class="l-bar"><i></i></div><div class="l-txt">LOADING BELLWETHER</div></div>');
  readonly titleEl = el('div', 'menu title-screen');
  readonly pauseEl = el('div', 'menu pause-screen');
  private creditsEl = el('div', 'credits');
  private subTimer = 0;
  private toastTimer = 0;
  private chipTimer = 0;
  private objTimer = 0;
  subtitlesOn = true;
  autopilot = false;
  onKeyCapture: ((fn: ((code: string, key: string) => boolean) | null) => void) | null = null;
  private echoCircle!: SVGCircleElement;

  constructor(parent: HTMLElement) {
    this.root = parent;
    this.subsEl.appendChild(this.subEl);
    this.clusterEl.append(this.ammoEl, this.echoEl);
    this.echoEl.innerHTML = `<svg viewBox="0 0 62 62"><circle cx="31" cy="31" r="26" fill="none" stroke="rgba(127,227,255,0.15)" stroke-width="3"/><circle class="arc" cx="31" cy="31" r="26" fill="none" stroke="#7fe3ff" stroke-width="3" stroke-linecap="round" stroke-dasharray="163.4" stroke-dashoffset="0"/></svg><div class="lbl">ECHO</div>`;
    this.echoCircle = this.echoEl.querySelector('.arc') as SVGCircleElement;
    this.ammoEl.innerHTML = '<div class="wpn">M9 PISTOL</div><span class="mag">12</span><span class="res">/ 24</span>';
    for (const e of [this.hurtEl, this.barsEl, this.subsEl, this.objEl, this.promptEl, this.reticleEl, this.dotEl, this.clusterEl, this.toastEl, this.chipEl, this.hintEl, this.cardEl, this.fadeEl, this.docEl, this.padEl, this.titleEl, this.pauseEl, this.creditsEl, this.loadingEl]) parent.appendChild(e);
  }

  // ---------------------------------------------------------------- loading
  loading(p: number, text?: string): void {
    (this.loadingEl.querySelector('.l-bar i') as HTMLElement).style.width = `${Math.round(p * 100)}%`;
    if (text) (this.loadingEl.querySelector('.l-txt') as HTMLElement).textContent = text;
  }

  hideLoading(): void {
    this.loadingEl.style.opacity = '0';
    window.setTimeout(() => (this.loadingEl.style.display = 'none'), 1000);
  }

  // ---------------------------------------------------------------- dialogue
  async say(name: string, text: string, opts: { radio?: boolean; dur?: number } = {}): Promise<void> {
    const dur = opts.dur ?? Math.max(1.8, 0.9 + text.length * 0.058);
    this.showSub(name, text, opts.radio);
    await wait(dur * 1000);
    this.hideSub();
    await wait(180);
  }

  showSub(name: string, text: string, radio = false, holdSec = 0): void {
    window.clearTimeout(this.subTimer);
    if (!this.subtitlesOn && name) {
      this.subEl.classList.remove('on');
      return;
    }
    this.subEl.className = 'sub' + (radio ? ' radio' : '');
    this.subEl.innerHTML = name ? `<b>${name}</b>${text}` : `<i style="opacity:.85">${text}</i>`;
    void this.subEl.offsetWidth;
    this.subEl.classList.add('on');
    if (holdSec > 0) this.subTimer = window.setTimeout(() => this.hideSub(), holdSec * 1000);
  }

  hideSub(): void {
    this.subEl.classList.remove('on');
  }

  // ---------------------------------------------------------------- objective
  objective(loc: string, text: string, persist = 9): void {
    window.clearTimeout(this.objTimer);
    this.objEl.innerHTML = `<div class="loc">${loc}<i>02:17 AM</i></div><div class="obj">${text}</div>`;
    this.objEl.classList.remove('on');
    void this.objEl.offsetWidth;
    this.objEl.classList.add('on');
    if (persist > 0) this.objTimer = window.setTimeout(() => this.objEl.classList.remove('on'), persist * 1000);
  }

  showObjective(): void {
    window.clearTimeout(this.objTimer);
    this.objEl.classList.add('on');
    this.objTimer = window.setTimeout(() => this.objEl.classList.remove('on'), 4000);
  }

  prompt(text: string | null, key = 'E', echo = false): void {
    if (!text) {
      this.promptEl.classList.remove('on');
      return;
    }
    const html = `<span class="key">${key}</span><span>${text}</span>`;
    if (this.promptEl.innerHTML !== html) this.promptEl.innerHTML = html;
    this.promptEl.classList.toggle('echo', echo);
    this.promptEl.classList.add('on');
  }

  reticle(on: boolean, hit = false): void {
    this.reticleEl.classList.toggle('on', on);
    this.reticleEl.classList.toggle('hit', hit);
    this.dotEl.classList.toggle('on', !on && false);
  }

  cluster(on: boolean): void {
    this.clusterEl.classList.toggle('on', on);
  }

  echo(fill: number, ready: boolean, unlocked: boolean): void {
    this.echoEl.style.display = unlocked ? '' : 'none';
    this.echoCircle.setAttribute('stroke-dashoffset', `${163.4 * (1 - fill)}`);
    this.echoEl.classList.toggle('ready', ready);
  }

  ammo(show: boolean, mag = 0, res = 0): void {
    this.ammoEl.classList.toggle('hide', !show);
    if (show) {
      (this.ammoEl.querySelector('.mag') as HTMLElement).textContent = String(mag).padStart(2, '0');
      (this.ammoEl.querySelector('.res') as HTMLElement).textContent = `/ ${res}`;
    }
  }

  toast(title: string, sub = ''): void {
    window.clearTimeout(this.toastTimer);
    this.toastEl.innerHTML = `${sub ? `<small>${sub}</small>` : ''}${title}`;
    this.toastEl.classList.add('on');
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('on'), 3200);
  }

  chip(text: string | null, sec = 2): void {
    window.clearTimeout(this.chipTimer);
    if (!text) {
      this.chipEl.classList.remove('on');
      return;
    }
    this.chipEl.textContent = text;
    this.chipEl.classList.add('on');
    this.chipTimer = window.setTimeout(() => this.chipEl.classList.remove('on'), sec * 1000);
  }

  hints(items: [string, string][] | null): void {
    if (!items) {
      this.hintEl.classList.remove('on');
      return;
    }
    this.hintEl.innerHTML = items.map(([k, t]) => `<span><span class="key">${k}</span>${t}</span>`).join('');
    this.hintEl.classList.add('on');
  }

  hurt(v: number): void {
    this.hurtEl.style.opacity = String(Math.min(1, v));
  }

  bars(on: boolean): void {
    this.barsEl.classList.toggle('on', on);
  }

  async fade(to: number, sec = 1, white = false): Promise<void> {
    if (this.autopilot) sec = 0.02;
    this.fadeEl.classList.toggle('white', white);
    this.fadeEl.style.transition = `opacity ${sec}s`;
    void this.fadeEl.offsetWidth;
    this.fadeEl.style.opacity = String(to);
    await wait(sec * 1000);
  }

  setFade(v: number): void {
    this.fadeEl.style.transition = 'none';
    this.fadeEl.style.opacity = String(v);
  }

  async chapterCard(num: string, title: string, sub = '', hold = 3.2): Promise<void> {
    if (this.autopilot) return;
    this.cardEl.innerHTML = `<div class="in"><div class="num">${num}</div><div class="ttl">${title}</div><div class="line"></div>${sub ? `<div class="sub2">${sub}</div>` : ''}</div>`;
    void this.cardEl.offsetWidth;
    this.cardEl.classList.add('on');
    await wait(hold * 1000);
    this.cardEl.classList.remove('on');
    await wait(1200);
  }

  // ---------------------------------------------------------------- document reader
  doc(title: string, body: string): Promise<void> {
    if (this.autopilot) return Promise.resolve();
    this.docEl.innerHTML = `<div><div class="paper"><h3>${title}</h3>${body}</div><div class="hint">[E] / [ESC] CLOSE</div></div>`;
    this.docEl.classList.add('on');
    return new Promise((res) => {
      const t0 = performance.now();
      this.onKeyCapture?.((code) => {
        if (performance.now() - t0 < 250) return true;
        if (code === 'KeyE' || code === 'Escape' || code === 'Space' || code === 'Enter') {
          this.docEl.classList.remove('on');
          this.onKeyCapture?.(null);
          res();
        }
        return true;
      });
    });
  }

  // ---------------------------------------------------------------- keypad
  keypad(code: string, onDigit?: (d: string) => void): Promise<boolean> {
    if (this.autopilot) return Promise.resolve(true);
    let entry = '';
    this.padEl.innerHTML = `<div class="pad"><div class="disp">····</div><div class="keys">${'123456789C0E'.split('').map((k) => `<button data-k="${k}">${k === 'C' ? '⌫' : k === 'E' ? '✓' : k}</button>`).join('')}</div><div class="hint">TYPE DIGITS · ENTER · ESC</div></div>`;
    this.padEl.classList.add('on');
    const disp = this.padEl.querySelector('.disp') as HTMLElement;
    const render = () => (disp.textContent = (entry + '····').slice(0, 4).replace(/(.)/g, '$1'));
    return new Promise((res) => {
      const finish = (ok: boolean) => {
        this.onKeyCapture?.(null);
        window.setTimeout(() => {
          this.padEl.classList.remove('on');
          res(ok);
        }, ok ? 500 : 0);
      };
      const press = (k: string) => {
        if (/^\d$/.test(k) && entry.length < 4) {
          entry += k;
          onDigit?.(k);
        } else if (k === 'C') entry = entry.slice(0, -1);
        else if (k === 'E') {
          if (entry === code) {
            disp.textContent = 'OPEN';
            finish(true);
            return;
          }
          disp.classList.add('bad');
          disp.textContent = 'DENIED';
          window.setTimeout(() => {
            disp.classList.remove('bad');
            entry = '';
            render();
          }, 700);
          onDigit?.('x');
          return;
        }
        render();
        if (entry.length === 4 && entry === code) {
          disp.textContent = 'OPEN';
          finish(true);
        }
      };
      this.padEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => press((b as HTMLElement).dataset.k!)));
      this.onKeyCapture?.((codeK, key) => {
        if (/^\d$/.test(key)) press(key);
        else if (codeK === 'Backspace') press('C');
        else if (codeK === 'Enter') press('E');
        else if (codeK === 'Escape') finish(false);
        return true;
      });
    });
  }

  // ---------------------------------------------------------------- menus
  buildMenus(h: MenuHandlers, settings: Settings, hasSave: boolean, unlocked: number, chapters: { num: string; title: string }[]): void {
    this.titleEl.innerHTML = `
      <div class="brand"><div class="clock">BELLWETHER · 02:17 AM</div><h1>THE<span>MISSING CITY</span></h1><div class="tag">ELEVEN YEARS AGO, 2.3 MILLION PEOPLE VANISHED.</div></div>
      <div class="menu-list">
        <button data-a="continue" ${hasSave ? '' : 'disabled'}>Continue</button>
        <button data-a="new">New Game</button>
        <button data-a="chapters">Chapters</button>
        <button data-a="settings">Settings</button>
        <button data-a="controls">Controls</button>
      </div>
      ${this.panels(settings, unlocked, chapters)}`;
    this.pauseEl.innerHTML = `
      <div class="hdr">PAUSED<b>02:17</b></div>
      <div class="menu-list">
        <button data-a="resume">Resume</button>
        <button data-a="checkpoint">Restart Checkpoint</button>
        <button data-a="chapters">Chapters</button>
        <button data-a="settings">Settings</button>
        <button data-a="controls">Controls</button>
        <button data-a="quit">Quit to Title</button>
      </div>
      ${this.panels(settings, unlocked, chapters)}`;
    for (const root of [this.titleEl, this.pauseEl]) {
      const show = (id: string | null) => root.querySelectorAll('.panel').forEach((p) => p.classList.toggle('on', p.getAttribute('data-p') === id));
      root.querySelectorAll('.menu-list button').forEach((b) => {
        b.addEventListener('click', () => {
          const a = (b as HTMLElement).dataset.a;
          if (a === 'continue') h.onContinue();
          else if (a === 'new') h.onNewGame();
          else if (a === 'resume') h.onResume();
          else if (a === 'checkpoint') h.onRestartCheckpoint();
          else if (a === 'quit') h.onQuitToTitle();
          else show(a ?? null);
        });
        b.addEventListener('mouseenter', () => (b as HTMLElement).focus());
      });
      root.querySelectorAll('.chapters button').forEach((b) => b.addEventListener('click', () => h.onChapter(Number((b as HTMLElement).dataset.i))));
      root.querySelectorAll('.panel input, .panel select').forEach((inp) => {
        inp.addEventListener('input', () => {
          const s = settings;
          root.querySelectorAll<HTMLInputElement>('[data-s]').forEach((i) => {
            const key = i.dataset.s as keyof Settings;
            if (i.type === 'checkbox') (s as unknown as Record<string, unknown>)[key] = i.checked;
            else if (i.tagName === 'SELECT') (s as unknown as Record<string, unknown>)[key] = i.value;
            else (s as unknown as Record<string, unknown>)[key] = Number(i.value);
          });
          h.onSettings(s);
          // mirror into the other menu
          for (const other of [this.titleEl, this.pauseEl]) {
            if (other === root) continue;
            other.querySelectorAll<HTMLInputElement>('[data-s]').forEach((i) => {
              const v = (s as unknown as Record<string, unknown>)[i.dataset.s!];
              if (i.type === 'checkbox') i.checked = !!v;
              else i.value = String(v);
            });
          }
        });
      });
    }
  }

  private panels(s: Settings, unlocked: number, chapters: { num: string; title: string }[]): string {
    return `
      <div class="panel" data-p="settings"><h4>SETTINGS</h4>
        <label>Master volume <input type="range" min="0" max="1" step="0.05" value="${s.master}" data-s="master"></label>
        <label>Music <input type="range" min="0" max="1" step="0.05" value="${s.music}" data-s="music"></label>
        <label>Effects &amp; ambience <input type="range" min="0" max="1" step="0.05" value="${s.sfx}" data-s="sfx"></label>
        <label>Mouse sensitivity <input type="range" min="0.2" max="2.5" step="0.05" value="${s.sensitivity}" data-s="sensitivity"></label>
        <label>Invert Y <input type="checkbox" ${s.invertY ? 'checked' : ''} data-s="invertY"></label>
        <label>Subtitles <input type="checkbox" ${s.subtitles ? 'checked' : ''} data-s="subtitles"></label>
        <label>Graphics <select data-s="quality"><option value="high" ${s.quality === 'high' ? 'selected' : ''}>High</option><option value="medium" ${s.quality === 'medium' ? 'selected' : ''}>Medium</option><option value="low" ${s.quality === 'low' ? 'selected' : ''}>Low</option></select></label>
      </div>
      <div class="panel" data-p="controls"><h4>CONTROLS</h4><table>
        <tr><td>Move</td><td>W A S D</td></tr><tr><td>Look</td><td>Mouse</td></tr>
        <tr><td>Sprint</td><td>Shift</td></tr><tr><td>Crouch</td><td>C / Ctrl</td></tr>
        <tr><td>Jump · Vault · Mantle · Climb</td><td>Space</td></tr><tr><td>Interact · Talk</td><td>E</td></tr>
        <tr><td>Enter Echo</td><td>Q</td></tr><tr><td>Flashlight</td><td>F</td></tr>
        <tr><td>Aim / Fire</td><td>RMB / LMB</td></tr><tr><td>Melee</td><td>V / LMB</td></tr>
        <tr><td>Reload</td><td>R</td></tr><tr><td>Dodge roll</td><td>X / Alt</td></tr>
        <tr><td>Skip line</td><td>Enter</td></tr><tr><td>Pause</td><td>Esc / P</td></tr>
        <tr><td>Gamepad</td><td>Standard layout</td></tr></table></div>
      <div class="panel chapters" data-p="chapters"><h4>CHAPTERS</h4>
        ${chapters.map((c, i) => `<button data-i="${i}" ${i <= unlocked ? '' : 'disabled'}><small>${c.num}</small>${i <= unlocked ? c.title : '— — —'}</button>`).join('')}
      </div>`;
  }

  showTitle(on: boolean): void {
    this.titleEl.classList.toggle('on', on);
    if (on) this.titleEl.querySelectorAll('.panel').forEach((p) => p.classList.remove('on'));
  }

  showPause(on: boolean): void {
    this.pauseEl.classList.toggle('on', on);
    if (on) this.pauseEl.querySelectorAll('.panel').forEach((p) => p.classList.remove('on'));
  }

  async credits(lines: [string, string][], sec = 48): Promise<void> {
    if (this.autopilot) sec = 1;
    this.creditsEl.innerHTML = `<div class="roll"><h2>THE MISSING CITY</h2>${lines.map(([a, b]) => `<p>${a}<b>${b}</b></p>`).join('')}<p style="margin-top:140px">BELLWETHER, 2:17 AM</p><b style="margin-bottom:40vh">— for everyone still waiting for someone to come home —</b></div>`;
    this.creditsEl.classList.add('on');
    const roll = this.creditsEl.querySelector('.roll') as HTMLElement;
    const h = roll.scrollHeight + window.innerHeight;
    roll.animate([{ transform: 'translateY(0)' }, { transform: `translateY(-${h}px)` }], { duration: sec * 1000, easing: 'linear', fill: 'forwards' });
    await wait(sec * 1000);
    this.creditsEl.classList.remove('on');
  }
}
