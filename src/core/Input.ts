import * as THREE from 'three';

/**
 * Input intents shared by keyboard/mouse, gamepad and touch. Gameplay reads
 * intents only; it never inspects raw devices.
 */
export type Action = 'jump' | 'interact' | 'pulse' | 'attack' | 'pause' | 'crouch' | 'advance';

export class Input {
  readonly move = new THREE.Vector2();
  readonly look = new THREE.Vector2();
  sprint = false;
  jumpHeld = false;
  /** Set when the last input came from touch (to adapt prompts). */
  usingTouch = false;
  usingPad = false;
  sensitivity = 1;
  invertY = false;
  enabled = true;

  private readonly keys = new Set<string>();
  private readonly pressed = new Set<Action>();
  private readonly lookAccum = new THREE.Vector2();
  private pointerLocked = false;
  private dragId: number | null = null;
  private dragLast = new THREE.Vector2();
  private padPrev: boolean[] = [];
  private readonly touchMove = new THREE.Vector2();
  private touchSprint = false;
  private stickId: number | null = null;
  private stickCenter = new THREE.Vector2();
  private stickRadius = 50;
  private lookTouchId: number | null = null;
  private lookTouchLast = new THREE.Vector2();
  private readonly cleanup: Array<() => void> = [];

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.listen(window, 'keydown', (e) => this.onKey(e as KeyboardEvent, true));
    this.listen(window, 'keyup', (e) => this.onKey(e as KeyboardEvent, false));
    this.listen(window, 'blur', () => this.releaseAll());
    this.listen(document, 'visibilitychange', () => this.releaseAll());
    this.listen(document, 'pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });
    this.listen(canvas, 'mousedown', (e) => {
      const me = e as MouseEvent;
      this.usingTouch = false;
      if (!this.enabled) return;
      if (me.button === 0) this.press('attack');
      if (me.button === 2) this.press('pulse');
      this.press('advance');
    });
    this.listen(canvas, 'contextmenu', (e) => e.preventDefault());
    this.listen(window, 'mousemove', (e) => {
      const me = e as MouseEvent;
      if (this.pointerLocked) this.lookAccum.x += me.movementX, this.lookAccum.y += me.movementY;
    });
    // Drag-to-look fallback when pointer lock is unavailable (and for touch on the canvas).
    this.listen(canvas, 'pointerdown', (e) => {
      const pe = e as PointerEvent;
      if (pe.pointerType === 'touch') {
        this.usingTouch = true;
        if (this.lookTouchId === null) {
          this.lookTouchId = pe.pointerId;
          this.lookTouchLast.set(pe.clientX, pe.clientY);
        }
        return;
      }
      if (!this.pointerLocked) {
        this.dragId = pe.pointerId;
        this.dragLast.set(pe.clientX, pe.clientY);
      }
    });
    this.listen(window, 'pointermove', (e) => {
      const pe = e as PointerEvent;
      if (pe.pointerId === this.lookTouchId) {
        this.lookAccum.x += (pe.clientX - this.lookTouchLast.x) * 1.6;
        this.lookAccum.y += (pe.clientY - this.lookTouchLast.y) * 1.6;
        this.lookTouchLast.set(pe.clientX, pe.clientY);
      } else if (pe.pointerId === this.dragId && !this.pointerLocked) {
        this.lookAccum.x += pe.clientX - this.dragLast.x;
        this.lookAccum.y += pe.clientY - this.dragLast.y;
        this.dragLast.set(pe.clientX, pe.clientY);
      }
    });
    const endLook = (e: Event) => {
      const pe = e as PointerEvent;
      if (pe.pointerId === this.lookTouchId) this.lookTouchId = null;
      if (pe.pointerId === this.dragId) this.dragId = null;
    };
    this.listen(window, 'pointerup', endLook);
    this.listen(window, 'pointercancel', endLook);
  }

  requestPointerLock(): void {
    if (this.usingTouch) return;
    try {
      const p = this.canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
      if (p && typeof p.catch === 'function') p.catch(() => undefined);
    } catch {
      // Pointer lock is optional; drag-to-look remains.
    }
  }

  exitPointerLock(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  get isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  /** Bind touch controls (joystick + buttons) from the HUD DOM. */
  bindTouch(root: HTMLElement): void {
    const stick = root.querySelector<HTMLElement>('[data-touch="stick"]');
    const knob = root.querySelector<HTMLElement>('[data-touch="knob"]');
    if (stick && knob) {
      const update = (x: number, y: number) => {
        this.touchMove.set((x - this.stickCenter.x) / this.stickRadius, (y - this.stickCenter.y) / this.stickRadius);
        const len = this.touchMove.length();
        if (len > 1) this.touchMove.divideScalar(len);
        this.touchSprint = len > 0.98;
        knob.style.transform = `translate(${this.touchMove.x * 34}px, ${this.touchMove.y * 34}px)`;
      };
      const end = (e: Event) => {
        const pe = e as PointerEvent;
        if (pe.pointerId !== this.stickId) return;
        this.stickId = null;
        this.touchMove.set(0, 0);
        this.touchSprint = false;
        knob.style.transform = '';
      };
      this.listen(stick, 'pointerdown', (e) => {
        const pe = e as PointerEvent;
        pe.preventDefault();
        this.usingTouch = true;
        const r = stick.getBoundingClientRect();
        this.stickCenter.set(r.left + r.width / 2, r.top + r.height / 2);
        this.stickRadius = r.width * 0.42;
        this.stickId = pe.pointerId;
        try { stick.setPointerCapture(pe.pointerId); } catch { /* synthetic events */ }
        update(pe.clientX, pe.clientY);
      });
      this.listen(stick, 'pointermove', (e) => {
        const pe = e as PointerEvent;
        if (pe.pointerId === this.stickId) update(pe.clientX, pe.clientY);
      });
      this.listen(stick, 'pointerup', end);
      this.listen(stick, 'pointercancel', end);
      this.listen(stick, 'lostpointercapture', end);
    }
    root.querySelectorAll<HTMLElement>('[data-action]').forEach((btn) => {
      const action = btn.dataset.action as Action;
      const down = (e: Event) => {
        e.preventDefault();
        this.usingTouch = true;
        btn.classList.add('is-down');
        this.press(action);
        if (action === 'jump') this.jumpHeld = true;
        if (action !== 'pause') this.press('advance');
      };
      const up = (e: Event) => {
        e.preventDefault();
        btn.classList.remove('is-down');
        if (action === 'jump') this.jumpHeld = false;
      };
      this.listen(btn, 'pointerdown', down);
      this.listen(btn, 'pointerup', up);
      this.listen(btn, 'pointercancel', up);
      this.listen(btn, 'pointerleave', up);
    });
  }

  private listen(target: EventTarget, type: string, fn: (e: Event) => void): void {
    target.addEventListener(type, fn, { passive: false });
    this.cleanup.push(() => target.removeEventListener(type, fn));
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    if (e.repeat && down) return;
    this.usingTouch = false;
    this.usingPad = false;
    if (down) this.keys.add(e.code);
    else this.keys.delete(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    if (!down) {
      if (e.code === 'Space') this.jumpHeld = false;
      return;
    }
    switch (e.code) {
      case 'Space':
        this.press('jump');
        this.press('advance');
        this.jumpHeld = true;
        break;
      case 'KeyE':
      case 'Enter':
        this.press('interact');
        this.press('advance');
        break;
      case 'KeyQ':
      case 'KeyR':
        this.press('pulse');
        break;
      case 'KeyF':
        this.press('attack');
        break;
      case 'KeyC':
      case 'ControlLeft':
        this.press('crouch');
        break;
      case 'Escape':
      case 'KeyP':
        this.press('pause');
        break;
    }
  }

  private releaseAll(): void {
    this.keys.clear();
    this.jumpHeld = false;
    this.sprint = false;
    this.touchMove.set(0, 0);
    this.stickId = null;
    this.lookTouchId = null;
    this.dragId = null;
  }

  press(action: Action): void {
    this.pressed.add(action);
  }

  /** Edge-triggered: true once per press until endFrame(). */
  wasPressed(action: Action): boolean {
    return this.pressed.has(action);
  }

  consume(action: Action): boolean {
    const had = this.pressed.has(action);
    this.pressed.delete(action);
    return had;
  }

  /** Poll devices; call once at the start of each frame. */
  poll(): void {
    let mx = 0;
    let my = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) my += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) my -= 1;
    this.move.set(mx, my);
    this.sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

    // Touch stick (y is screen-down positive, so invert)
    if (this.touchMove.lengthSq() > 0.0001) {
      this.move.set(this.touchMove.x, -this.touchMove.y);
      this.sprint = this.sprint || this.touchSprint;
    }

    const sens = 0.0024 * this.sensitivity;
    this.look.set(this.lookAccum.x * sens, this.lookAccum.y * sens * (this.invertY ? -1 : 1));
    this.lookAccum.set(0, 0);

    this.pollGamepad();
    if (this.move.lengthSq() > 1) this.move.normalize();
    if (!this.enabled) {
      this.move.set(0, 0);
      this.sprint = false;
    }
  }

  private pollGamepad(): void {
    const pads = navigator.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (!pad) continue;
      const dz = (v: number) => (Math.abs(v) < 0.18 ? 0 : v);
      const lx = dz(pad.axes[0] ?? 0);
      const ly = dz(pad.axes[1] ?? 0);
      const rx = dz(pad.axes[2] ?? 0);
      const ry = dz(pad.axes[3] ?? 0);
      if (lx || ly) {
        this.move.set(lx, -ly);
        this.usingPad = true;
      }
      if (rx || ry) {
        this.look.x += rx * 0.045 * this.sensitivity;
        this.look.y += ry * 0.035 * this.sensitivity * (this.invertY ? -1 : 1);
        this.usingPad = true;
      }
      const b = pad.buttons.map((btn) => btn.pressed);
      const edge = (i: number) => b[i] && !this.padPrev[i];
      if (edge(0)) { this.press('jump'); this.press('advance'); }
      if (edge(2)) { this.press('interact'); this.press('advance'); }
      if (edge(1)) this.press('crouch');
      if (edge(3) || edge(5)) this.press('pulse');
      if (edge(4) || edge(7)) this.press('attack');
      if (edge(9)) this.press('pause');
      if (b[0]) this.jumpHeld = true;
      else if (this.padPrev[0]) this.jumpHeld = false;
      if (b[10] || b[6]) this.sprint = true;
      this.padPrev = b;
      break;
    }
  }

  endFrame(): void {
    this.pressed.clear();
  }

  dispose(): void {
    for (const fn of this.cleanup) fn();
  }
}
