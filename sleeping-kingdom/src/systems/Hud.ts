type Line = { speaker: string; text: string; duration: number; thought: boolean };

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`Missing ${sel}`);
  return el;
};

/** DOM HUD. Reads game state each frame; never owns gameplay rules. */
export class Hud {
  readonly root = $('#hud');
  private readonly hpFill = $('#hp-fill');
  private readonly hpGhost = $('#hp-ghost');
  private readonly hpFrame = $('.bar-frame.hp');
  private readonly stFill = $('#st-fill');
  private readonly stFrame = $('.bar-frame.st');
  private readonly flask = $('#flask');
  private readonly flaskCount = $('#flask-count');
  private readonly objective = $('#objective');
  private readonly objectiveText = $('#objective-text');
  private readonly hintEl = $('#hint');
  private readonly areaCard = $('#area-card');
  private readonly areaTitle = $('#area-title');
  private readonly areaSub = $('#area-sub');
  private readonly subtitle = $('#subtitle');
  private readonly subSpeaker = $('#sub-speaker');
  private readonly subLine = $('#sub-line');
  private readonly promptEl = $('#prompt');
  private readonly promptKey = $('#prompt-key');
  private readonly promptText = $('#prompt-text');
  private readonly boss = $('#boss');
  private readonly bossName = $('#boss-name');
  private readonly bossFill = $('#boss-fill');
  private readonly bossGhost = $('#boss-ghost');
  private readonly reticle = $('#reticle');
  private readonly fadeEl = $('#fade');
  private readonly letterbox = $('#letterbox');
  private readonly touchFlask = document.querySelector<HTMLElement>('.tbtn.flask');
  private readonly narration = $('#narration');
  private readonly bellRing = $('#bell-ring');
  private readonly comboEl = $('#combo');
  private readonly comboN = $('#combo-n');
  private readonly dmgLayer = $('#dmg-layer');
  private comboT = 0;
  private lastBell = -1;

  /** Bell Toll meter around the portrait (0-100). */
  setBell(v: number): void {
    const r = Math.round(v);
    if (r === this.lastBell) return;
    this.lastBell = r;
    this.bellRing.style.setProperty('--bell', String(r));
    this.bellRing.classList.toggle('ready', r >= 100);
  }

  /** Floating damage number at a screen position. */
  damage(x: number, y: number, amount: number, big: boolean): void {
    const el = document.createElement('span');
    el.className = `dmg${big ? ' big' : ''}`;
    el.textContent = String(Math.round(amount));
    el.style.left = `${x + (Math.random() - 0.5) * 30}px`;
    el.style.top = `${y}px`;
    this.dmgLayer.append(el);
    window.setTimeout(() => el.remove(), 900);
  }

  /** Hit counter: grows while you keep landing blows, fades when you stop. */
  combo(n: number): void {
    this.comboN.textContent = String(n);
    this.comboEl.classList.toggle('show', n >= 2);
    this.comboEl.classList.remove('pop');
    void this.comboEl.offsetWidth;
    this.comboEl.classList.add('pop');
    this.comboT = 2.4;
  }
  private narrQueue: string[] = [];
  private narrT = 0;
  private narrGap = 0;
  private readonly queue: Line[] = [];
  private current: Line | null = null;
  private lineT = 0;
  private hintT = 0;
  private areaT = 0;
  private lastHp = -1;
  private lastFlasks = -1;

  /** Cinematic mode: hide gameplay HUD, keep subtitles, cards and narration. */
  cinematic(on: boolean): void {
    this.root.classList.toggle('cinematic', on);
    if (on) this.root.classList.remove('hidden');
  }

  /** Storybook narration lines, shown one at a time in the centre of the screen. */
  narrate(lines: string[]): void {
    this.narrQueue = [...lines];
    this.narrT = 0;
    this.narrGap = 0.2;
    if (!lines.length) this.narration.classList.remove('show');
  }

  show(on: boolean): void {
    this.root.classList.toggle('hidden', !on);
  }

  setVitals(hp: number, maxHp: number, st: number, maxSt: number, flasks: number): void {
    const hpPct = `${Math.max(0, (hp / maxHp) * 100).toFixed(1)}%`;
    if (hp !== this.lastHp) {
      if (hp < this.lastHp) {
        this.hpFrame.classList.remove('pulse');
        void this.hpFrame.offsetWidth;
        this.hpFrame.classList.add('pulse');
      }
      this.hpFill.style.width = hpPct;
      this.hpGhost.style.width = hpPct;
      this.lastHp = hp;
    }
    this.stFill.style.width = `${Math.max(0, (st / maxSt) * 100).toFixed(1)}%`;
    this.stFrame.classList.toggle('exhausted', st <= 1);
    if (flasks !== this.lastFlasks) {
      this.flaskCount.textContent = String(flasks);
      this.flask.classList.toggle('empty', flasks <= 0);
      if (this.touchFlask) this.touchFlask.textContent = `⚱${flasks}`;
      this.lastFlasks = flasks;
    }
  }

  setObjective(text: string): void {
    if (this.objectiveText.textContent === text) return;
    this.objectiveText.textContent = text;
    this.objective.classList.remove('flash');
    void this.objective.offsetWidth;
    this.objective.classList.add('flash');
  }

  hint(html: string, seconds = 5): void {
    this.hintEl.innerHTML = html;
    this.hintEl.classList.add('show');
    this.hintT = seconds;
  }

  area(title: string, sub: string, seconds = 5): void {
    this.areaTitle.textContent = title;
    this.areaSub.textContent = sub;
    this.areaCard.classList.add('show');
    this.areaT = seconds;
  }

  say(speaker: string, text: string, duration = 0, thought = false): void {
    const d = duration || Math.max(2.4, text.length * 0.065);
    this.queue.push({ speaker, text, duration: d, thought });
  }

  clearSubtitles(): void {
    this.queue.length = 0;
    this.current = null;
    this.subtitle.classList.remove('show');
  }

  get talking(): boolean {
    return !!this.current || this.queue.length > 0;
  }

  prompt(text: string | null, key = 'E'): void {
    if (!text) {
      this.promptEl.classList.remove('show');
      return;
    }
    this.promptKey.textContent = key;
    this.promptText.textContent = text;
    this.promptEl.classList.add('show');
  }

  setBoss(name: string | null, hp01 = 1): void {
    if (!name) {
      this.boss.classList.add('hidden');
      return;
    }
    if (this.boss.classList.contains('hidden')) {
      this.boss.classList.remove('hidden');
      this.bossName.textContent = name;
    }
    const pct = `${Math.max(0, hp01 * 100).toFixed(1)}%`;
    this.bossFill.style.width = pct;
    this.bossGhost.style.width = pct;
  }

  setReticle(x: number | null, y = 0): void {
    if (x === null) {
      this.reticle.classList.add('hidden');
      return;
    }
    this.reticle.classList.remove('hidden');
    this.reticle.style.left = `${x}px`;
    this.reticle.style.top = `${y}px`;
  }

  fade(opacity: number, seconds = 1): void {
    this.fadeEl.style.transition = `opacity ${seconds}s ease`;
    this.fadeEl.style.opacity = String(opacity);
  }

  setLetterbox(on: boolean): void {
    this.letterbox.classList.toggle('on', on);
  }

  update(dt: number): void {
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.comboEl.classList.remove('show');
    }
    if (this.narrT > 0) {
      this.narrT -= dt;
      if (this.narrT <= 0) {
        this.narration.classList.remove('show');
        this.narrGap = 0.45;
      }
    } else if (this.narrQueue.length) {
      this.narrGap -= dt;
      if (this.narrGap <= 0) {
        const text = this.narrQueue.shift()!;
        this.narration.textContent = text;
        this.narration.classList.add('show');
        this.narrT = Math.max(3.2, text.length * 0.07);
      }
    }
    if (this.hintT > 0) {
      this.hintT -= dt;
      if (this.hintT <= 0) this.hintEl.classList.remove('show');
    }
    if (this.areaT > 0) {
      this.areaT -= dt;
      if (this.areaT <= 0) this.areaCard.classList.remove('show');
    }
    if (this.current) {
      this.lineT -= dt;
      if (this.lineT <= 0) {
        this.current = null;
        this.subtitle.classList.remove('show');
        this.lineT = -0.35; // short gap between lines
      }
    } else if (this.queue.length && this.lineT >= -0.001) {
      this.current = this.queue.shift() ?? null;
      if (this.current) {
        this.subSpeaker.textContent = this.current.speaker;
        this.subLine.textContent = this.current.text;
        this.subLine.classList.toggle('thought', this.current.thought);
        this.subtitle.classList.add('show');
        this.lineT = this.current.duration;
      }
    } else if (this.lineT < 0) {
      this.lineT = Math.min(0, this.lineT + dt);
    }
  }

  reset(): void {
    this.lastHp = -1;
    this.lastFlasks = -1;
    this.clearSubtitles();
    this.prompt(null);
    this.setBoss(null);
    this.setReticle(null);
    this.hintEl.classList.remove('show');
    this.areaCard.classList.remove('show');
  }
}
