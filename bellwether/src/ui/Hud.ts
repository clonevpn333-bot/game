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
  private choiceEl = el('div', 'choice');
  /** index the autopilot picks in choice() */
  autoChoice = 0;
  private padEl = el('div', 'keypad');
  private hurtEl = el('div', 'hurt');
  private chipEl = el('div', 'chip');
  private hintEl = el('div', 'hint-bar');
  private loadingEl = el('div', 'loading', '<div class="l-in"><div class="l-clock">CIVIC</div><div class="l-bar"><i></i></div><div class="l-txt">LOADING BELLWETHER</div></div>');
  readonly titleEl = el('div', 'menu title-screen');
  readonly pauseEl = el('div', 'menu pause-screen');
  private creditsEl = el('div', 'credits');
  private subTimer = 0;
  private toastTimer = 0;
  private chipTimer = 0;
  private objTimer = 0;
  subtitlesOn = true;
  clock = '11:42 PM';
  private wpEl = el('div', 'waypoint', '<i></i><b></b>');
  private civicEl = el('div', 'civic');
  private hackEl = el('div', 'hack');
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
    for (const e of [this.hurtEl, this.barsEl, this.subsEl, this.objEl, this.promptEl, this.reticleEl, this.dotEl, this.clusterEl, this.toastEl, this.chipEl, this.hintEl, this.cardEl, this.fadeEl, this.docEl, this.choiceEl, this.padEl, this.hackEl, this.wpEl, this.civicEl, this.titleEl, this.pauseEl, this.creditsEl, this.loadingEl]) parent.appendChild(e);
  }

  get subBusy(): boolean {
    return this.subEl.classList.contains('on');
  }

  fpDot(on: boolean): void {
    this.dotEl.classList.toggle('fp', on);
  }

  // ---------------------------------------------------------------- waypoint
  /** Screen-space objective marker. x,y in px; behind=true pins it to the nearest edge with an arrow. */
  waypoint(on: boolean, x = 0, y = 0, dist = 0, behind = false, label = ''): void {
    this.wpEl.classList.toggle('on', on);
    if (!on) return;
    this.wpEl.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    this.wpEl.classList.toggle('edge', behind);
    const b = this.wpEl.querySelector('b') as HTMLElement;
    const txt = `${label ? label + ' · ' : ''}${Math.round(dist)} m`;
    if (b.textContent !== txt) b.textContent = txt;
  }

  /** CIVIC public-address banner. */
  civic(text: string | null, sub = ''): void {
    if (!text) {
      this.civicEl.classList.remove('on');
      return;
    }
    this.civicEl.innerHTML = `<div class="c-tag">CIVIC · PUBLIC ADDRESS</div><div class="c-txt">${text}</div>${sub ? `<div class="c-sub">${sub}</div>` : ''}`;
    this.civicEl.classList.add('on');
  }

  // ---------------------------------------------------------------- loading
  loading(p: number, text?: string): void {
    (this.loadingEl.querySelector('.l-bar i') as HTMLElement).style.width = `${Math.round(p * 100)}%`;
    if (text) (this.loadingEl.querySelector('.l-txt') as HTMLElement).textContent = text;
  }

  private loadingTimer = 0;

  showLoading(text: string): void {
    window.clearTimeout(this.loadingTimer);
    this.loadingEl.style.display = '';
    this.loadingEl.style.opacity = '1';
    this.loading(0.05, text);
  }

  hideLoading(): void {
    this.loadingEl.style.opacity = '0';
    this.loadingTimer = window.setTimeout(() => (this.loadingEl.style.display = 'none'), 1000);
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
    this.objEl.innerHTML = `<div class="loc">${loc}<i>${this.clock}</i></div><div class="obj">${text}</div>`;
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

  /** The closing question: lead lines fade in one by one over black, then the question itself. */
  async question(lead: string[], q: string, hold = 7): Promise<void> {
    if (this.autopilot) return;
    this.cardEl.innerHTML = `<div class="in qcard">${lead.map((l, i) => `<div class="qlead" style="animation-delay:${0.6 + i * 1.6}s">${l}</div>`).join('')}<div class="qmain" style="animation-delay:${1.2 + lead.length * 1.6}s">${q}</div></div>`;
    void this.cardEl.offsetWidth;
    this.cardEl.classList.add('on');
    await wait((1.2 + lead.length * 1.6 + hold) * 1000);
    this.cardEl.classList.remove('on');
    await wait(1600);
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

  // ---------------------------------------------------------------- choice
  /** A slow, heavy decision: two (or more) options, picked with 1/2, arrows + E, or a click. */
  choice(question: string, options: { title: string; sub: string }[], prompt = ''): Promise<number> {
    if (this.autopilot) return Promise.resolve(this.autoChoice);
    const el = this.choiceEl;
    el.innerHTML = `<div class="ch-in"><div class="ch-q">${question}</div>${prompt ? `<div class="ch-p">${prompt}</div>` : ''}<div class="ch-opts">${options.map((o, i) => `<button class="ch-o" data-i="${i}"><span class="ch-k">${i + 1}</span><b>${o.title}</b><span class="ch-s">${o.sub}</span></button>`).join('')}</div><div class="ch-h">1 / 2 · ← → AND E · OR CLICK</div></div>`;
    void el.offsetWidth;
    el.classList.add('on');
    document.exitPointerLock?.();
    const btns = [...el.querySelectorAll<HTMLButtonElement>('.ch-o')];
    let sel = -1;
    const mark = (i: number) => {
      sel = i;
      btns.forEach((b, j) => b.classList.toggle('sel', j === i));
    };
    return new Promise((res) => {
      const t0 = performance.now();
      const done = (i: number) => {
        if (performance.now() - t0 < 900) return;
        el.classList.remove('on');
        this.onKeyCapture?.(null);
        res(i);
      };
      btns.forEach((b, i) => {
        b.onmouseenter = () => mark(i);
        b.onclick = () => done(i);
      });
      this.onKeyCapture?.((code) => {
        const n = Number(code.replace('Digit', '').replace('Numpad', '')) - 1;
        if (n >= 0 && n < options.length) done(n);
        else if (code === 'ArrowLeft' || code === 'KeyA') mark(Math.max(0, sel - 1));
        else if (code === 'ArrowRight' || code === 'KeyD') mark(Math.min(options.length - 1, sel + 1));
        else if ((code === 'KeyE' || code === 'Enter' || code === 'Space') && sel >= 0) done(sel);
        return true;
      });
    });
  }

  // ---------------------------------------------------------------- keypad
  /**
   * CIVIC intrusion minigame: stop the sweeping marker inside the highlighted window (E / Space / click)
   * `stages` times. Misses just reset that stage; Esc gives up.
   */
  hack(title: string, stages = 3, onTick?: (ok: boolean) => void): Promise<boolean> {
    if (this.autopilot) return Promise.resolve(true);
    const el = this.hackEl;
    el.innerHTML = `<div class="hk"><div class="hk-t">${title}</div><div class="hk-s"></div><div class="hk-bar"><div class="hk-win"></div><div class="hk-mark"></div></div><div class="hk-log"></div><button class="hk-go">LOCK</button><div class="hk-hint">E · SPACE · CLICK TO LOCK &nbsp;·&nbsp; ESC TO ABORT</div></div>`;
    el.classList.add('on');
    const win = el.querySelector('.hk-win') as HTMLElement;
    const mark = el.querySelector('.hk-mark') as HTMLElement;
    const log = el.querySelector('.hk-log') as HTMLElement;
    const stEl = el.querySelector('.hk-s') as HTMLElement;
    let stage = 0;
    let pos = 0;
    let dir = 1;
    let speed = 0.55;
    let w0 = 0;
    let ww = 0.2;
    let raf = 0;
    let last = performance.now();
    let lockout = 0;
    const lines = ['> handshake: municipal records node', '> bypassing CIVIC trust layer', '> census index decrypted'];
    const newStage = () => {
      ww = 0.22 - stage * 0.04;
      w0 = 0.1 + Math.random() * (0.8 - ww);
      speed = 0.55 + stage * 0.25;
      win.style.left = `${w0 * 100}%`;
      win.style.width = `${ww * 100}%`;
      stEl.innerHTML = Array.from({ length: stages }, (_, i) => `<i class="${i < stage ? 'ok' : i === stage ? 'cur' : ''}"></i>`).join('');
    };
    newStage();
    return new Promise((res) => {
      const finish = (ok: boolean) => {
        cancelAnimationFrame(raf);
        this.onKeyCapture?.(null);
        window.setTimeout(() => {
          el.classList.remove('on');
          res(ok);
        }, ok ? 700 : 0);
      };
      const lock = () => {
        if (performance.now() < lockout) return;
        const ok = pos >= w0 && pos <= w0 + ww;
        onTick?.(ok);
        if (ok) {
          log.innerHTML += `<div>${lines[stage % lines.length]}</div>`;
          stage++;
          if (stage >= stages) {
            stEl.innerHTML = Array.from({ length: stages }, () => '<i class="ok"></i>').join('');
            win.classList.add('done');
            finish(true);
            return;
          }
          newStage();
        } else {
          el.querySelector('.hk')!.classList.add('bad');
          lockout = performance.now() + 450;
          window.setTimeout(() => el.querySelector('.hk')?.classList.remove('bad'), 300);
        }
      };
      const tick = () => {
        const now = performance.now();
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        pos += dir * speed * dt;
        if (pos > 1) {
          pos = 1;
          dir = -1;
        } else if (pos < 0) {
          pos = 0;
          dir = 1;
        }
        mark.style.left = `${pos * 100}%`;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      (el.querySelector('.hk-go') as HTMLElement).addEventListener('click', lock);
      this.onKeyCapture?.((codeK) => {
        if (codeK === 'KeyE' || codeK === 'Space' || codeK === 'Enter') lock();
        else if (codeK === 'Escape') finish(false);
        return true;
      });
    });
  }

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
      <div class="brand"><div class="clock">POPULATION · 2,103,488</div><h1>WELCOME TO<span>BELLWETHER</span></h1><div class="tag">ELEVEN YEARS AGO, EVERYONE HERE DISAPPEARED.</div></div>
      <div class="menu-list">
        <button data-a="continue" ${hasSave ? '' : 'disabled'}>Continue</button>
        <button data-a="new">New Game</button>
        <button data-a="chapters">Chapters</button>
        <button data-a="settings">Settings</button>
        <button data-a="controls">Controls</button>
      </div>
      ${this.panels(settings, unlocked, chapters)}`;
    this.pauseEl.innerHTML = `
      <div class="hdr">PAUSED<b>CIVIC</b></div>
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
      root.querySelectorAll('.panel-back').forEach((b) => b.addEventListener('click', () => show(null)));
      root.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Escape' && root.querySelector('.panel.on')) {
          e.stopPropagation();
          show(null);
        }
      });
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
      <div class="panel" data-p="settings"><button class="panel-back" aria-label="Back">✕</button><h4>SETTINGS</h4>
        <label>Master volume <input type="range" min="0" max="1" step="0.05" value="${s.master}" data-s="master"></label>
        <label>Music <input type="range" min="0" max="1" step="0.05" value="${s.music}" data-s="music"></label>
        <label>Effects &amp; ambience <input type="range" min="0" max="1" step="0.05" value="${s.sfx}" data-s="sfx"></label>
        <label>Mouse sensitivity <input type="range" min="0.2" max="2.5" step="0.05" value="${s.sensitivity}" data-s="sensitivity"></label>
        <label>Invert Y <input type="checkbox" ${s.invertY ? 'checked' : ''} data-s="invertY"></label>
        <label>Subtitles <input type="checkbox" ${s.subtitles ? 'checked' : ''} data-s="subtitles"></label>
        <label>Graphics <select data-s="quality"><option value="high" ${s.quality === 'high' ? 'selected' : ''}>High</option><option value="medium" ${s.quality === 'medium' ? 'selected' : ''}>Medium</option><option value="low" ${s.quality === 'low' ? 'selected' : ''}>Low</option></select></label>
      </div>
      <div class="panel" data-p="controls"><button class="panel-back" aria-label="Back">✕</button><h4>CONTROLS</h4><table>
        <tr><td>Move</td><td>W A S D</td></tr><tr><td>Look</td><td>Mouse</td></tr>
        <tr><td>Sprint</td><td>Shift</td></tr><tr><td>Crouch</td><td>C / Ctrl</td></tr>
        <tr><td>Jump · Vault · Mantle · Climb</td><td>Space</td></tr><tr><td>Interact · Talk</td><td>E</td></tr>
        <tr><td>Enter Echo</td><td>Q</td></tr><tr><td>Flashlight</td><td>F</td></tr>
        <tr><td>Aim / Fire</td><td>RMB / LMB</td></tr><tr><td>Melee</td><td>V / LMB</td></tr>
        <tr><td>Reload</td><td>R</td></tr><tr><td>Dodge roll</td><td>X / Alt</td></tr>
        <tr><td>Skip line</td><td>Enter</td></tr><tr><td>Pause</td><td>Esc / P</td></tr>
        <tr><td>Gamepad</td><td>Standard layout</td></tr></table></div>
      <div class="panel chapters" data-p="chapters"><button class="panel-back" aria-label="Back">✕</button><h4>CHAPTERS</h4>
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
    this.creditsEl.innerHTML = `<div class="roll"><h2>BELLWETHER</h2>${lines.map(([a, b]) => `<p>${a}<b>${b}</b></p>`).join('')}<p style="margin-top:140px">KEEP BELLWETHER ALIVE UNTIL ITS CITIZENS RETURN.</p><b style="margin-bottom:40vh">— when does the copy become a person? —</b></div>`;
    this.creditsEl.classList.add('on');
    const roll = this.creditsEl.querySelector('.roll') as HTMLElement;
    const h = roll.scrollHeight + window.innerHeight;
    roll.animate([{ transform: 'translateY(0)' }, { transform: `translateY(-${h}px)` }], { duration: sec * 1000, easing: 'linear', fill: 'forwards' });
    await wait(sec * 1000);
    this.creditsEl.classList.remove('on');
  }
}
