import type { Action } from '../core/Input';

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const e = document.querySelector<T>(sel);
  if (!e) throw new Error(`Missing ${sel}`);
  return e;
};

const KEY_LABEL: Record<string, { kb: string; touch: string }> = {
  jump: { kb: 'Space', touch: 'Jump' },
  attack: { kb: 'J', touch: 'Strike' },
  dodge: { kb: 'Shift', touch: 'Dodge' },
  interact: { kb: 'E', touch: 'Act' },
  move: { kb: 'WASD', touch: 'Stick' },
  advance: { kb: 'Space', touch: 'Tap' },
};

/** DOM-side presentation. Holds no game rules; the director drives it. */
export class UI {
  readonly letterbox = $('#letterbox');
  readonly fadeEl = $('#fade');
  readonly hud = $('#hud');
  readonly objectiveEl = $('#objective');
  readonly resolveEl = $('#resolve');
  readonly progressEl = $('#progress');
  readonly promptEl = $('#prompt');
  readonly qteEl = $('#qte');
  readonly subtitleEl = $('#subtitle');
  readonly choicesEl = $('#choices');
  readonly cardEl = $('#chapter-card');
  readonly captionEl = $('#caption');
  readonly titleEl = $('#title-screen');
  readonly chapterSelectEl = $('#chapter-select');
  readonly pauseEl = $('#pause');
  readonly failEl = $('#fail');
  readonly creditsEl = $('#credits');
  readonly pauseBtn = $('#pause-button');
  device: 'keyboard' | 'touch' = matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard';
  private resolveMax = 0;

  keyLabel(a: Action | 'move'): string {
    const l = KEY_LABEL[a];
    if (!l) return a;
    return this.device === 'touch' ? l.touch : l.kb;
  }

  setLetterbox(on: boolean): void {
    this.letterbox.classList.toggle('on', on);
  }

  /** opacity 1 = black. */
  fade(to: number, seconds: number): Promise<void> {
    this.fadeEl.style.transition = `opacity ${seconds}s ease`;
    // force style flush so transitions always run
    void this.fadeEl.offsetWidth;
    this.fadeEl.style.opacity = String(to);
    return new Promise((r) => setTimeout(r, seconds * 1000));
  }

  setFadeInstant(v: number): void {
    this.fadeEl.style.transition = 'none';
    this.fadeEl.style.opacity = String(v);
  }

  objective(text: string | null): void {
    if (!text) {
      this.objectiveEl.classList.add('hidden');
      return;
    }
    const t = this.objectiveEl.querySelector('.text')!;
    if (t.textContent !== text || this.objectiveEl.classList.contains('hidden')) {
      t.textContent = text;
      this.objectiveEl.classList.remove('hidden', 'flash');
      void this.objectiveEl.offsetWidth;
      this.objectiveEl.style.animation = 'none';
      void this.objectiveEl.offsetWidth;
      this.objectiveEl.style.animation = '';
      this.objectiveEl.classList.add('flash');
    }
  }

  resolve(n: number | null, max = 4): void {
    if (n === null) {
      this.resolveEl.classList.add('hidden');
      return;
    }
    this.resolveEl.classList.remove('hidden');
    if (max !== this.resolveMax) {
      this.resolveMax = max;
      this.resolveEl.innerHTML = '';
      for (let i = 0; i < max; i++) {
        const p = document.createElement('div');
        p.className = 'pip';
        this.resolveEl.appendChild(p);
      }
    }
    const pips = this.resolveEl.children;
    let lost = false;
    for (let i = 0; i < pips.length; i++) {
      const was = pips[i].classList.contains('lost');
      const now = i >= n;
      if (now && !was) lost = true;
      pips[i].classList.toggle('lost', now);
    }
    if (lost) {
      this.resolveEl.classList.remove('hit');
      void this.resolveEl.offsetWidth;
      this.resolveEl.classList.add('hit');
    }
  }

  progress(v: number | null): void {
    if (v === null) {
      this.progressEl.classList.add('hidden');
      return;
    }
    this.progressEl.classList.remove('hidden');
    (this.progressEl.querySelector('.fill') as HTMLElement).style.width = `${Math.round(Math.min(1, Math.max(0, v)) * 1000) / 10}%`;
  }

  private promptKey = '';
  prompt(action: Action | 'move' | null, label = '', urgent = false): void {
    if (!action) {
      this.promptEl.classList.add('hidden');
      this.promptKey = '';
      return;
    }
    const key = `${action}|${label}|${urgent}`;
    if (key === this.promptKey) return;
    this.promptKey = key;
    this.promptEl.querySelector('.key')!.textContent = this.keyLabel(action);
    this.promptEl.querySelector('.label')!.textContent = label;
    this.promptEl.classList.toggle('urgent', urgent);
    this.promptEl.classList.remove('hidden');
  }

  qte(action: Action | null, fill = 0, danger = false): void {
    if (!action) {
      this.qteEl.classList.add('hidden');
      return;
    }
    this.qteEl.classList.remove('hidden');
    this.qteEl.classList.toggle('danger', danger);
    this.qteEl.querySelector('.key')!.textContent = this.keyLabel(action);
    (this.qteEl.querySelector('.ring') as SVGCircleElement).style.strokeDashoffset = String(276.5 * (1 - Math.min(1, Math.max(0, fill))));
  }

  subtitle(speaker: string | null, html = '', done = false): void {
    if (!speaker) {
      this.subtitleEl.classList.add('hidden');
      return;
    }
    this.subtitleEl.className = `s-${speaker}${done ? ' done' : ''}`;
    const names: Record<string, string> = { KAEL: 'Kael', LYRA: 'Lyra', MAREN: 'Captain Maren', VESK: 'High Cantor Vesk', CROWD: 'Crowd', GUARD: 'Guard', WARDEN: 'Bellwarden' };
    this.subtitleEl.querySelector('.speaker')!.textContent = names[speaker] ?? speaker;
    this.subtitleEl.querySelector('.line')!.innerHTML = html;
  }

  choices(list: string[] | null, onPick?: (i: number) => void): void {
    this.choicesEl.innerHTML = '';
    if (!list) {
      this.choicesEl.classList.add('hidden');
      return;
    }
    this.choicesEl.classList.remove('hidden');
    list.forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<span class="n">${this.device === 'touch' ? '◆' : i + 1}</span>${c}`;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        onPick?.(i);
      });
      this.choicesEl.appendChild(b);
    });
  }

  chapterCard(num: string | null, name = '', sub = ''): void {
    if (!num) {
      this.cardEl.classList.add('out');
      setTimeout(() => this.cardEl.classList.add('hidden'), 1000);
      return;
    }
    this.cardEl.classList.remove('hidden', 'out');
    this.cardEl.querySelector('.num')!.textContent = num;
    this.cardEl.querySelector('.name')!.textContent = name;
    this.cardEl.querySelector('.sub')!.textContent = sub;
    this.cardEl.style.animation = 'none';
    void this.cardEl.offsetWidth;
    this.cardEl.style.animation = '';
  }

  caption(text: string | null): void {
    if (!text) {
      if (!this.captionEl.classList.contains('hidden')) {
        this.captionEl.classList.add('out');
        setTimeout(() => this.captionEl.classList.add('hidden'), 1100);
      }
      return;
    }
    this.captionEl.classList.remove('hidden', 'out');
    this.captionEl.innerHTML = text;
    this.captionEl.style.animation = 'none';
    void this.captionEl.offsetWidth;
    this.captionEl.style.animation = '';
  }

  hudVisible(on: boolean): void {
    this.hud.classList.toggle('dim', !on);
  }

  clearGameplay(): void {
    this.objective(null);
    this.resolve(null);
    this.progress(null);
    this.prompt(null);
    this.qte(null);
    this.choices(null);
  }

  showScreen(el: HTMLElement, on: boolean): void {
    el.classList.toggle('hidden', !on);
  }

  rollCredits(lines: [string, string[]][], onDone: () => void): void {
    const roll = this.creditsEl.querySelector('.roll') as HTMLElement;
    roll.innerHTML = '<div class="big">The Last<br/>Procession</div>' + lines.map(([h, ps]) => `<h3>${h}</h3>${ps.map((p) => `<p>${p}</p>`).join('')}`).join('');
    roll.style.animation = 'none';
    void roll.offsetWidth;
    roll.style.animation = '';
    this.creditsEl.classList.remove('hidden');
    roll.onanimationend = () => onDone();
  }
}
