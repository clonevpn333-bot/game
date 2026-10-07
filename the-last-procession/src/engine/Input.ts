import * as THREE from 'three';

export type Action = 'jump' | 'attack' | 'dodge' | 'interact' | 'advance' | 'pause' | 'choice1' | 'choice2' | 'choice3';

const KEY_MAP: Record<string, Action[]> = {
  Space: ['jump', 'advance'],
  KeyJ: ['attack'],
  KeyK: ['dodge'],
  ShiftLeft: ['dodge'],
  ShiftRight: ['dodge'],
  KeyE: ['interact', 'advance'],
  KeyF: ['interact'],
  Enter: ['advance'],
  Escape: ['pause'],
  KeyP: ['pause'],
  Digit1: ['choice1'],
  Digit2: ['choice2'],
  Digit3: ['choice3'],
};

/**
 * Converts keyboard, mouse and touch into game intents. Gameplay reads intents only,
 * never raw events, so every control scheme drives the same code paths.
 */
export class Input {
  readonly move = new THREE.Vector2();
  private readonly keys = new Set<string>();
  private readonly held = new Set<Action>();
  private readonly pressed = new Set<Action>();
  private readonly touchMove = new THREE.Vector2();
  private stickPointer: number | null = null;
  private stickCenter = new THREE.Vector2();
  private readonly cleanups: Array<() => void> = [];
  enabled = true;
  /** Set by the game when an overlay (title, pause) should swallow canvas clicks. */
  canvasClickAttacks = true;
  lastDevice: 'keyboard' | 'touch' = 'keyboard';

  constructor(canvas: HTMLCanvasElement, touchRoot: HTMLElement) {
    const kd = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      this.lastDevice = 'keyboard';
      for (const a of KEY_MAP[e.code] ?? []) {
        this.held.add(a);
        this.pressed.add(a);
      }
    };
    const ku = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
      for (const a of KEY_MAP[e.code] ?? []) this.held.delete(a);
    };
    const blur = () => {
      this.keys.clear();
      this.held.clear();
      this.releaseStick();
    };
    const md = (e: MouseEvent) => {
      if (e.button !== 0) return;
      this.pressed.add('advance');
      if (this.canvasClickAttacks) {
        this.pressed.add('attack');
        this.held.add('attack');
      }
    };
    const mu = () => this.held.delete('attack');
    addEventListener('keydown', kd);
    addEventListener('keyup', ku);
    addEventListener('blur', blur);
    document.addEventListener('visibilitychange', blur);
    canvas.addEventListener('mousedown', md);
    addEventListener('mouseup', mu);
    this.cleanups.push(() => {
      removeEventListener('keydown', kd);
      removeEventListener('keyup', ku);
      removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', blur);
      canvas.removeEventListener('mousedown', md);
      removeEventListener('mouseup', mu);
    });
    this.bindTouch(touchRoot);
  }

  private bindTouch(root: HTMLElement): void {
    const stick = root.querySelector<HTMLElement>('#touch-stick');
    const knob = root.querySelector<HTMLElement>('#touch-knob');
    if (stick && knob) {
      const down = (e: PointerEvent) => {
        e.preventDefault();
        this.lastDevice = 'touch';
        this.stickPointer = e.pointerId;
        stick.setPointerCapture(e.pointerId);
        const r = stick.getBoundingClientRect();
        this.stickCenter.set(r.left + r.width / 2, r.top + r.height / 2);
        moveH(e);
      };
      const moveH = (e: PointerEvent) => {
        if (e.pointerId !== this.stickPointer) return;
        const r = stick.getBoundingClientRect();
        const rad = r.width * 0.42;
        let dx = (e.clientX - this.stickCenter.x) / rad;
        let dy = (e.clientY - this.stickCenter.y) / rad;
        const len = Math.hypot(dx, dy);
        if (len > 1) {
          dx /= len;
          dy /= len;
        }
        this.touchMove.set(dx, -dy);
        knob.style.transform = `translate(${dx * rad}px, ${dy * rad}px)`;
      };
      const up = (e: PointerEvent) => {
        if (e.pointerId !== this.stickPointer) return;
        this.releaseStick();
        knob.style.transform = '';
      };
      stick.addEventListener('pointerdown', down);
      stick.addEventListener('pointermove', moveH);
      stick.addEventListener('pointerup', up);
      stick.addEventListener('pointercancel', up);
      stick.addEventListener('lostpointercapture', up);
    }
    root.querySelectorAll<HTMLElement>('[data-action]').forEach((btn) => {
      const action = btn.dataset.action as Action;
      const down = (e: PointerEvent) => {
        e.preventDefault();
        this.lastDevice = 'touch';
        btn.classList.add('pressed');
        this.held.add(action);
        this.pressed.add(action);
        if (action === 'jump' || action === 'interact') this.pressed.add('advance');
      };
      const up = () => {
        btn.classList.remove('pressed');
        this.held.delete(action);
      };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    });
  }

  private releaseStick(): void {
    this.stickPointer = null;
    this.touchMove.set(0, 0);
  }

  /** Call once per frame before gameplay reads intents. */
  poll(): void {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    this.move.set(x, y);
    if (this.move.lengthSq() > 1) this.move.normalize();
    if (this.touchMove.lengthSq() > 0.01) this.move.copy(this.touchMove);
    if (!this.enabled) this.move.set(0, 0);
  }

  isHeld(a: Action): boolean {
    return this.enabled && this.held.has(a);
  }

  /** Edge-triggered: true once per physical press. */
  consume(a: Action): boolean {
    if (!this.pressed.has(a)) return false;
    this.pressed.delete(a);
    return this.enabled || a === 'pause' || a === 'advance' || a.startsWith('choice');
  }

  peek(a: Action): boolean {
    return this.pressed.has(a);
  }

  /** Inject a synthetic press (used by the bot playtest and UI buttons). */
  press(a: Action): void {
    this.pressed.add(a);
  }

  setHeld(a: Action, on: boolean): void {
    if (on) this.held.add(a);
    else this.held.delete(a);
  }

  setKey(code: string, on: boolean): void {
    if (on) this.keys.add(code);
    else this.keys.delete(code);
  }

  endFrame(): void {
    this.pressed.clear();
  }

  dispose(): void {
    for (const c of this.cleanups) c();
  }
}
