import type { AudioSys } from '../systems/Audio';
import type { SaveData, Settings } from '../game/Save';

export interface UiHost {
  newGame(): void;
  continueGame(): void;
  startChapter(i: number): void;
  resume(): void;
  restartCheckpoint(): void;
  quitToTitle(): void;
  applySettings(s: Settings): void;
  audio: AudioSys;
  getSave(): SaveData;
  chapters: Array<{ title: string; subtitle: string }>;
}

export interface DialogueLine {
  who: string;
  text: string;
  color?: string;
  pitch?: number;
  thought?: boolean;
  expr?: string;
}

const ICON = {
  petal: (on: boolean) => `<svg class="petal${on ? '' : ' is-lost'}" viewBox="0 0 32 32"><defs><radialGradient id="pg" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#fff4fb"/><stop offset=".6" stop-color="#ffb9dc"/><stop offset="1" stop-color="#c9a2ff"/></radialGradient></defs><path fill="url(#pg)" d="M16 3c5 4 8 9 8 14a8 8 0 0 1-16 0c0-5 3-10 8-14z"/><path fill="#fff" opacity=".55" d="M13 9c-1.6 2.3-2.4 4.6-2.2 7 .1.9-1.2 1-1.3.1-.3-2.8.6-5.5 2.4-8 .5-.7 1.6 0 1.1.9z"/></svg>`,
  parcel: `<svg class="parcel-icon" viewBox="0 0 32 32"><path fill="#ffe7b0" d="M4 10l12-6 12 6v13l-12 6-12-6z"/><path fill="#f2c27a" d="M16 16v13l12-6V10z"/><path fill="#fff6dc" d="M4 10l12 6 12-6-12-6z"/><path fill="#ff9fc2" d="M9 7.5l12 6v4l3-1.5v-4l-12-6z"/></svg>`,
  stamp: `<svg viewBox="0 0 32 32"><path fill="#ffd46b" d="M16 2.5l3.6 8.6 9.3.6-7.2 5.9 2.4 9.1L16 21.6l-8.1 5.1 2.4-9.1-7.2-5.9 9.3-.6z"/><circle cx="16" cy="15.5" r="3" fill="#fff6dc"/></svg>`,
  pause: `<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor"/></svg>`,
  waypoint: `<svg viewBox="0 0 34 34"><path fill="#ffe2a8" stroke="#fff" stroke-width="1.5" d="M17 2l5 10 10 5-10 5-5 10-5-10-10-5 10-5z"/></svg>`,
  next: `<svg class="next" viewBox="0 0 16 16"><path fill="#ffd46b" d="M8 1l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></svg>`,
  eye: (alert: boolean, fill: number) => `<svg viewBox="0 0 34 22"><defs><clipPath id="ec"><rect x="0" y="${22 - 22 * fill}" width="34" height="22"/></clipPath></defs><path d="M2 11C8 2 26 2 32 11 26 20 8 20 2 11z" fill="rgba(20,14,30,.7)" stroke="${alert ? '#ff6a7a' : '#ffd27a'}" stroke-width="2"/><path clip-path="url(#ec)" d="M2 11C8 2 26 2 32 11 26 20 8 20 2 11z" fill="${alert ? '#ff6a7a' : '#ffb05a'}" opacity=".85"/><circle cx="17" cy="11" r="4" fill="#1a1022"/></svg>`,
};

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

export class Ui {
  readonly root: HTMLElement;
  private hud: HTMLElement;
  private lucidityEl: HTMLElement;
  private objEl: HTMLElement;
  private objChapter: HTMLElement;
  private objText: HTMLElement;
  private stampsEl: HTMLElement;
  private promptEl: HTMLElement;
  private pulseEl: HTMLElement;
  private pulseRing: SVGCircleElement;
  private waypointEl: HTMLElement;
  private waypointDist: HTMLElement;
  private alertEl: HTMLElement;
  private barkLayer: HTMLElement;
  private barks = new Map<string, { el: HTMLElement; ttl: number }>();
  private eyes = new Map<string, HTMLElement>();
  private dlg: HTMLElement;
  private dlgName: HTMLElement;
  private dlgLine: HTMLElement;
  private dlgChoices: HTMLElement;
  private fadeEl: HTMLElement;
  private wakeEl: HTMLElement;
  private cardEl: HTMLElement;
  private menuLayer: HTMLElement;
  private touchEl: HTMLElement;
  private loadingEl: HTMLElement;
  private queue: DialogueLine[] = [];
  private current: DialogueLine | null = null;
  private shown = 0;
  private resolveDlg: (() => void) | null = null;
  private resolveChoice: ((i: number) => void) | null = null;
  private blipT = 0;
  dialogueOpen = false;
  menuOpen: 'title' | 'pause' | 'settings' | 'chapters' | 'controls' | 'ending' | null = null;
  private lucidity = -1;
  private settingsReturn: 'title' | 'pause' = 'title';

  constructor(private readonly host: UiHost) {
    this.root = document.getElementById('ui')!;
    this.root.innerHTML = '';
    this.hud = el('div', 'hud hidden');
    const tl = el('div', 'hud-tl');
    this.lucidityEl = el('div', 'lucidity');
    this.lucidityEl.setAttribute('aria-label', 'Lucidity');
    this.objEl = el('div', 'objective');
    this.objEl.innerHTML = `${ICON.parcel}<div><div class="chapter"></div><div class="text"></div></div>`;
    this.objChapter = this.objEl.querySelector('.chapter')!;
    this.objText = this.objEl.querySelector('.text')!;
    tl.append(this.lucidityEl, this.objEl);
    const tr = el('div', 'hud-tr');
    this.stampsEl = el('div', 'stamps', `${ICON.stamp}<span>0/3</span>`);
    this.stampsEl.title = 'Dream Stamps';
    const pauseBtn = el('button', 'icon-btn', ICON.pause);
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.addEventListener('click', () => this.onPauseButton?.());
    tr.append(this.stampsEl, pauseBtn);
    this.promptEl = el('div', 'prompt');
    this.pulseEl = el('div', 'pulse-meter', `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="4"/><circle class="ring" cx="32" cy="32" r="28" fill="none" stroke="var(--parcel,#ffd46b)" stroke-width="4" stroke-linecap="round" stroke-dasharray="176" stroke-dashoffset="0"/></svg><div class="core">Q</div>`);
    this.pulseRing = this.pulseEl.querySelector('.ring')!;
    this.waypointEl = el('div', 'waypoint', `${ICON.waypoint}<span></span>`);
    this.waypointDist = this.waypointEl.querySelector('span')!;
    this.alertEl = el('div', 'vignette-alert');
    this.barkLayer = el('div', '');
    this.hud.append(this.alertEl, this.barkLayer, tl, tr, this.promptEl, this.pulseEl, this.waypointEl);

    this.dlg = el('div', 'dialogue', `<div class="name"></div><div class="line"></div><div class="choices"></div>${ICON.next}`);
    this.dlg.setAttribute('data-interactive', '');
    this.dlg.setAttribute('role', 'dialog');
    this.dlgName = this.dlg.querySelector('.name')!;
    this.dlgLine = this.dlg.querySelector('.line')!;
    this.dlgChoices = this.dlg.querySelector('.choices')!;
    this.dlg.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      this.advance();
    });

    this.touchEl = el('div', 'touch', `<div class="stick" data-touch="stick"><div class="knob" data-touch="knob"></div></div>
      <div class="touch-btns"><button class="tbtn" data-action="jump">JUMP</button><button class="tbtn" data-action="interact">USE</button><button class="tbtn" data-action="pulse">PULSE</button><button class="tbtn" data-action="attack">SWING</button><button class="tbtn" data-action="crouch">SNEAK</button></div>`);

    this.cardEl = el('div', 'chapter-card', `<div><div class="num"></div><h1></h1><p></p><div class="rule"></div></div>`);
    this.fadeEl = el('div', 'fade');
    this.wakeEl = el('div', 'wake', `<div><h2>You woke up.</h2><p></p></div>`);
    this.menuLayer = el('div', '');
    this.loadingEl = el('div', 'loading', `<div class="dot"></div>`);
    this.root.append(this.hud, this.touchEl, this.dlg, this.cardEl, this.fadeEl, this.wakeEl, this.menuLayer, this.loadingEl);
  }

  onPauseButton?: () => void;
  onLine?: (l: DialogueLine) => void;

  get touchRoot(): HTMLElement {
    return this.touchEl;
  }

  loaded(): void {
    this.loadingEl.classList.add('is-off');
    setTimeout(() => this.loadingEl.remove(), 900);
  }

  setTouch(on: boolean): void {
    this.touchEl.classList.toggle('is-on', on && !this.menuOpen);
  }

  setDread(level: number): void {
    this.root.dataset.dread = String(level);
  }

  setHud(visible: boolean): void {
    this.hud.classList.toggle('hidden', !visible);
  }

  dimHud(dim: boolean): void {
    this.hud.classList.toggle('is-dim', dim);
  }

  setLucidity(n: number, max: number): void {
    if (n === this.lucidity && this.lucidityEl.childElementCount === max) return;
    const lost = n < this.lucidity;
    this.lucidity = n;
    this.lucidityEl.innerHTML = Array.from({ length: max }, (_, i) => ICON.petal(i < n)).join('');
    if (lost) this.lucidityEl.children[n]?.classList.add('is-pop');
  }

  setObjective(chapter: string, text: string, parcel: string): void {
    this.objChapter.textContent = chapter;
    if (this.objText.textContent !== text) {
      this.objText.textContent = text;
      this.objEl.classList.remove('is-new');
      void this.objEl.offsetWidth;
      this.objEl.classList.add('is-new');
    }
    this.root.style.setProperty('--parcel', parcel);
  }

  setStamps(n: number, total: number, pop = false): void {
    this.stampsEl.querySelector('span')!.textContent = `${n}/${total}`;
    if (pop) {
      this.stampsEl.classList.remove('is-pop');
      void this.stampsEl.offsetWidth;
      this.stampsEl.classList.add('is-pop');
    }
  }

  setPrompt(text: string | null, key = 'E'): void {
    if (!text) {
      this.promptEl.classList.remove('is-on');
      return;
    }
    const html = `<span class="key">${key}</span><span>${text}</span>`;
    if (this.promptEl.innerHTML !== html) this.promptEl.innerHTML = html;
    this.promptEl.classList.add('is-on');
  }

  setPulse(frac: number, visible: boolean): void {
    this.pulseEl.classList.toggle('hidden', !visible);
    this.pulseRing.style.strokeDashoffset = String(176 * (1 - frac));
    this.pulseEl.classList.toggle('is-ready', frac >= 1);
  }

  toast(text: string): void {
    const t = el('div', 'toast');
    t.textContent = text;
    this.hud.append(t);
    setTimeout(() => t.remove(), 2700);
  }

  setWaypoint(x: number, y: number, visible: boolean, dist: number): void {
    this.waypointEl.classList.toggle('is-on', visible);
    if (!visible) return;
    this.waypointEl.style.transform = `translate(${x}px, ${y}px)`;
    this.waypointDist.textContent = `${Math.round(dist)} m`;
  }

  setAlert(on: boolean): void {
    this.alertEl.classList.toggle('is-on', on);
  }

  bark(id: string, text: string): void {
    let b = this.barks.get(id);
    if (!b) {
      b = { el: el('div', 'bark'), ttl: 0 };
      this.barkLayer.append(b.el);
      this.barks.set(id, b);
    }
    b.el.textContent = text;
    b.ttl = 3.6;
    b.el.style.opacity = '1';
  }

  /** Position barks/eyes each frame via a projector returning screen coords or null. */
  updateWorldLabels(dt: number, project: (id: string) => { x: number; y: number } | null): void {
    for (const [id, b] of this.barks) {
      b.ttl -= dt;
      const p = project(id);
      if (b.ttl <= 0 || !p) {
        b.el.style.opacity = '0';
        if (b.ttl < -0.5) {
          b.el.remove();
          this.barks.delete(id);
        }
        continue;
      }
      b.el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
    }
  }

  setEye(id: string, p: { x: number; y: number } | null, amount: number, alert: boolean): void {
    let e = this.eyes.get(id);
    if (!p || amount <= 0.02) {
      if (e) e.style.display = 'none';
      return;
    }
    if (!e) {
      e = el('div', 'eye');
      this.barkLayer.append(e);
      this.eyes.set(id, e);
    }
    e.style.display = '';
    const q = Math.round(amount * 10) / 10;
    const key = `${q}${alert}`;
    if (e.dataset.k !== key) {
      e.innerHTML = ICON.eye(alert, q);
      e.dataset.k = key;
    }
    e.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
  }

  clearWorldLabels(): void {
    for (const b of this.barks.values()) b.el.remove();
    this.barks.clear();
    for (const e of this.eyes.values()) e.remove();
    this.eyes.clear();
  }

  // ---------------- dialogue ----------------
  say(lines: DialogueLine[]): Promise<void> {
    this.queue.push(...lines);
    this.dialogueOpen = true;
    this.dlg.classList.add('is-on');
    if (!this.current) this.nextLine();
    return new Promise((res) => {
      const prev = this.resolveDlg;
      this.resolveDlg = () => {
        prev?.();
        res();
      };
    });
  }

  choose(prompt: DialogueLine, options: string[]): Promise<number> {
    this.dialogueOpen = true;
    this.dlg.classList.add('is-on');
    this.showLine(prompt);
    this.shown = prompt.text.length;
    this.renderLine();
    this.dlgChoices.innerHTML = '';
    options.forEach((o, i) => {
      const b = el('button', 'btn');
      b.textContent = o;
      b.addEventListener('click', () => {
        this.host.audio.ui('select');
        this.dlgChoices.innerHTML = '';
        this.current = null;
        this.closeDialogue();
        this.resolveChoice?.(i);
      });
      this.dlgChoices.append(b);
    });
    (this.dlgChoices.firstElementChild as HTMLElement | null)?.focus();
    return new Promise((res) => (this.resolveChoice = res));
  }

  private showLine(l: DialogueLine): void {
    this.current = l;
    this.shown = 0;
    this.onLine?.(l);
    this.dlgName.textContent = l.who;
    this.dlgName.style.setProperty('--speaker', l.color ?? '#ffd46b');
    this.dlg.classList.remove('is-done');
    this.renderLine();
  }

  private nextLine(): void {
    const l = this.queue.shift();
    if (!l) {
      this.current = null;
      this.closeDialogue();
      const r = this.resolveDlg;
      this.resolveDlg = null;
      r?.();
      return;
    }
    this.showLine(l);
  }

  private closeDialogue(): void {
    this.dialogueOpen = false;
    this.dlg.classList.remove('is-on');
  }

  private renderLine(): void {
    if (!this.current) return;
    const t = this.current.text.slice(0, Math.floor(this.shown));
    this.dlgLine.innerHTML = this.current.thought ? `<span class="thought">${escapeHtml(t)}</span>` : escapeHtml(t);
  }

  advance(): void {
    if (!this.dialogueOpen || !this.current || this.dlgChoices.childElementCount) return;
    if (this.shown < this.current.text.length) {
      this.shown = this.current.text.length;
      this.renderLine();
      this.dlg.classList.add('is-done');
    } else {
      this.host.audio.ui('move');
      this.nextLine();
    }
  }

  update(dt: number): void {
    if (this.current && this.shown < this.current.text.length) {
      const prev = Math.floor(this.shown);
      this.shown = Math.min(this.current.text.length, this.shown + dt * 46);
      const now = Math.floor(this.shown);
      if (now !== prev) {
        this.renderLine();
        this.blipT -= now - prev;
        if (this.blipT <= 0 && this.current.text[now - 1] !== ' ') {
          this.host.audio.blip(this.current.pitch ?? 520);
          this.blipT = 2;
        }
      }
      if (this.shown >= this.current.text.length) this.dlg.classList.add('is-done');
    }
  }

  // ---------------- overlays ----------------
  fade(on: boolean, dark = false): Promise<void> {
    this.fadeEl.classList.toggle('is-dark', dark);
    this.fadeEl.classList.toggle('is-on', on);
    return new Promise((r) => setTimeout(r, 650));
  }

  wake(reason: string, on: boolean): void {
    this.wakeEl.querySelector('p')!.textContent = reason;
    this.wakeEl.classList.toggle('is-on', on);
  }

  async chapterCard(num: string, title: string, sub: string): Promise<void> {
    this.cardEl.querySelector('.num')!.textContent = num;
    this.cardEl.querySelector('h1')!.textContent = title;
    this.cardEl.querySelector('p')!.textContent = sub;
    this.cardEl.classList.add('is-on');
    await new Promise((r) => setTimeout(r, 3200));
    this.cardEl.classList.remove('is-on');
  }

  // ---------------- menus ----------------
  private openMenu(kind: NonNullable<Ui['menuOpen']>, node: HTMLElement): void {
    this.menuLayer.innerHTML = '';
    this.menuLayer.append(node);
    this.menuOpen = kind;
    this.touchEl.classList.remove('is-on');
    const first = node.querySelector<HTMLElement>('button:not(:disabled)');
    first?.focus({ preventScroll: true });
  }

  closeMenu(): void {
    this.menuLayer.innerHTML = '';
    this.menuOpen = null;
  }

  private button(label: string, onClick: () => void, o: { primary?: boolean; sub?: string; disabled?: boolean } = {}): HTMLButtonElement {
    const b = el('button', `btn${o.primary ? ' primary' : ''}`);
    b.innerHTML = `<span>${label}</span>${o.sub ? `<span class="sub">${o.sub}</span>` : ''}`;
    b.disabled = !!o.disabled;
    b.addEventListener('click', () => {
      this.host.audio.unlock();
      this.host.audio.ui('select');
      onClick();
    });
    b.addEventListener('mouseenter', () => this.host.audio.ui('move'));
    return b;
  }

  showTitle(): void {
    const save = this.host.getSave();
    const m = el('div', 'menu title-menu');
    m.innerHTML = `<h1 class="logo">Dream<br/>Courier<small>Every delivery goes deeper</small></h1>
      <p class="tagline">You are Ori, a courier on the Route — the network that carries humanity's dreams. Tonight the parcels are arriving already opened.</p>`;
    const list = el('div', 'menu-list');
    const hasSave = save.chapter > 0 || save.checkpoint > 0;
    if (hasSave) list.append(this.button('Continue', () => this.host.continueGame(), { primary: true, sub: `Ch. ${save.chapter + 1}` }));
    list.append(this.button(hasSave ? 'New Journey' : 'Begin Delivery', () => this.host.newGame(), { primary: !hasSave }));
    list.append(this.button('Chapters', () => this.showChapters('title')));
    list.append(this.button('Settings', () => this.showSettings('title')));
    list.append(this.button('Controls', () => this.showControls('title')));
    m.append(list);
    this.openMenu('title', m);
  }

  showPause(chapterLabel: string, stamps: string): void {
    const m = el('div', 'menu pause-menu');
    const p = el('div', 'panel');
    p.innerHTML = `<h2>Paused</h2><p class="hint">${chapterLabel} · Dream Stamps ${stamps}</p>`;
    const list = el('div', 'menu-list');
    list.style.width = '100%';
    list.append(
      this.button('Resume', () => this.host.resume(), { primary: true }),
      this.button('Restart from checkpoint', () => this.host.restartCheckpoint()),
      this.button('Settings', () => this.showSettings('pause')),
      this.button('Controls', () => this.showControls('pause')),
      this.button('Quit to title', () => this.host.quitToTitle()),
    );
    p.append(list);
    m.append(p);
    this.openMenu('pause', m);
  }

  private back(to: 'title' | 'pause'): void {
    if (to === 'title') this.showTitle();
    else this.onPauseButton?.();
  }

  showChapters(from: 'title' | 'pause'): void {
    const save = this.host.getSave();
    const m = el('div', 'menu sub-menu');
    const p = el('div', 'panel');
    p.innerHTML = `<h2>Chapters</h2><p class="hint">Every route you have travelled stays open.</p>`;
    const grid = el('div', 'chapters');
    this.host.chapters.forEach((c, i) => {
      const b = el('button', 'chapter-btn');
      const n = save.stamps[String(i)]?.length ?? 0;
      b.innerHTML = `<small>${i === 9 ? 'Final' : `Chapter ${i + 1}`}</small><span>${i <= save.unlocked ? c.title : '· · ·'}</span><em>${i <= save.unlocked ? `${n}/3 stamps` : 'not yet dreamt'}</em>`;
      b.disabled = i > save.unlocked;
      b.addEventListener('click', () => {
        this.host.audio.unlock();
        this.host.audio.ui('select');
        this.host.startChapter(i);
      });
      grid.append(b);
    });
    p.append(grid);
    const row = el('div', 'row-actions');
    row.append(this.button('Back', () => this.back(from)));
    p.append(row);
    m.append(p);
    this.openMenu('chapters', m);
  }

  showSettings(from: 'title' | 'pause'): void {
    this.settingsReturn = from;
    const s = { ...this.host.getSave().settings };
    const m = el('div', 'menu sub-menu');
    const p = el('div', 'panel');
    p.innerHTML = `<h2>Settings</h2><p class="hint">Saved automatically.</p>`;
    const slider = (label: string, key: 'master' | 'music' | 'sfx' | 'sensitivity', min: number, max: number) => {
      const row = el('label', 'setting');
      row.innerHTML = `<span>${label}</span>`;
      const inp = el('input');
      inp.type = 'range';
      inp.min = String(min);
      inp.max = String(max);
      inp.step = '0.05';
      inp.value = String(s[key]);
      inp.addEventListener('input', () => {
        s[key] = Number(inp.value);
        this.host.applySettings(s);
      });
      row.append(inp);
      p.append(row);
    };
    const toggle = (label: string, key: 'invertY' | 'reducedMotion' | 'highQuality' | 'hints') => {
      const row = el('div', 'setting');
      row.innerHTML = `<span>${label}</span>`;
      const t = el('button', 'toggle');
      t.setAttribute('aria-pressed', String(s[key]));
      t.setAttribute('aria-label', label);
      t.addEventListener('click', () => {
        s[key] = !s[key];
        t.setAttribute('aria-pressed', String(s[key]));
        this.host.audio.ui('select');
        this.host.applySettings(s);
      });
      row.append(t);
      p.append(row);
    };
    slider('Master volume', 'master', 0, 1);
    slider('Music', 'music', 0, 1);
    slider('Effects & ambience', 'sfx', 0, 1);
    slider('Camera sensitivity', 'sensitivity', 0.3, 2.5);
    toggle('Invert camera Y', 'invertY');
    toggle('Reduced motion (no shake / warp)', 'reducedMotion');
    toggle('High quality rendering', 'highQuality');
    toggle('Show hints', 'hints');
    const row = el('div', 'row-actions');
    row.append(this.button('Back', () => this.back(this.settingsReturn)));
    p.append(row);
    m.append(p);
    this.openMenu('settings', m);
  }

  showControls(from: 'title' | 'pause'): void {
    const m = el('div', 'menu sub-menu');
    const p = el('div', 'panel');
    const k = (x: string) => `<span class="key">${x}</span>`;
    p.innerHTML = `<h2>Controls</h2><p class="hint">Keyboard & mouse · gamepad · touch</p>
      <div class="controls-grid">
        <div>${k('W')}${k('A')}${k('S')}${k('D')}</div><div>Walk / run (stick)</div>
        <div>${k('Mouse')}</div><div>Look (click the view to capture the mouse)</div>
        <div>${k('Shift')}</div><div>Sprint — run into low obstacles to vault</div>
        <div>${k('Space')}</div><div>Jump — push into ledges to climb up</div>
        <div>${k('C')}</div><div>Sneak (toggle) — harder for Lost Couriers to see you</div>
        <div>${k('E')}</div><div>Talk · deliver · pick up · continue dialogue</div>
        <div>${k('Q')} / ${k('RMB')}</div><div>Dream Pulse — wake dream anchors, stun Husks</div>
        <div>${k('F')} / ${k('LMB')}</div><div>Swing courier bag</div>
        <div>${k('Esc')}</div><div>Pause</div>
      </div>`;
    const row = el('div', 'row-actions');
    row.append(this.button('Back', () => this.back(from)));
    p.append(row);
    m.append(p);
    this.openMenu('controls', m);
  }

  showEnding(): Promise<'restore' | 'shutdown'> {
    return new Promise((res) => {
      const m = el('div', 'ending');
      m.innerHTML = `<div><div class="chapter-card is-on" style="position:static;background:none"><div class="num">The Last Parcel</div><h1 style="font-size:clamp(34px,6vw,64px)">Where does it go?</h1><p>The Core is waiting. It does not mind which.</p></div></div>`;
      const choices = el('div', 'choices');
      const mk = (title: string, text: string, k: 'restore' | 'shutdown') => {
        const b = el('button', 'choice');
        b.innerHTML = `<h3>${title}</h3><p>${text}</p>`;
        b.addEventListener('click', () => {
          this.host.audio.ui('select');
          this.closeMenu();
          res(k);
        });
        return b;
      };
      choices.append(
        mk('Deliver it into the Core', 'Restore dreaming. New dreams will grow again — and the Route will keep running, forever, with someone to carry them.', 'restore'),
        mk('Seal the parcel', 'Shut the Route down. No more recycled rooms, no more loops. Everyone wakes up. Nobody knows what they will dream of next — or if they will.', 'shutdown'),
      );
      m.firstElementChild!.append(choices);
      this.openMenu('ending', m);
    });
  }

  showCredits(kind: 'restore' | 'shutdown', onDone: () => void): void {
    const m = el('div', 'ending');
    const epi = kind === 'restore'
      ? 'Somewhere a child dreams of a lighthouse made of clouds. Somewhere a commuter misses a train that was never late. The parcels arrive sealed again. Ori keeps the old badge in the bag — just in case.'
      : 'Morning comes for everyone at once. The Route goes quiet, room by room, until even the yellow halls are only a feeling. Ori wakes in a small bedroom, holding nothing, and for the first time remembers their own name.';
    m.innerHTML = `<div class="credits"><h2>Dream Courier</h2><p>${epi}</p><p style="margin-top:30px">Design, code, models, music and sound — built procedurally in Three.js.<br/>Thank you for carrying the dreams this far.</p></div>`;
    const row = el('div', 'row-actions');
    row.style.justifyContent = 'center';
    row.append(this.button('Return to title', onDone, { primary: true }));
    m.firstElementChild!.append(row);
    this.openMenu('ending', m);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}
