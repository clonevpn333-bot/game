export type Action =
  | 'forward' | 'back' | 'left' | 'right'
  | 'sprint' | 'crouch' | 'jump' | 'interact' | 'flashlight' | 'echo'
  | 'aim' | 'fire' | 'melee' | 'reload' | 'dodge' | 'pause' | 'skip' | 'talk';

const KEYMAP: Record<string, Action[]> = {
  KeyW: ['forward'], ArrowUp: ['forward'],
  KeyS: ['back'], ArrowDown: ['back'],
  KeyA: ['left'], ArrowLeft: ['left'],
  KeyD: ['right'], ArrowRight: ['right'],
  ShiftLeft: ['sprint'], ShiftRight: ['sprint'],
  KeyC: ['crouch'], ControlLeft: ['crouch'],
  Space: ['jump', 'skip'],
  KeyE: ['interact'],
  KeyF: ['flashlight'],
  KeyQ: ['echo'],
  KeyV: ['melee'],
  KeyR: ['reload'],
  KeyX: ['dodge'], AltLeft: ['dodge'],
  Escape: ['pause'], KeyP: ['pause'],
  Enter: ['skip'],
  KeyT: ['talk'],
};

export class Input {
  private down = new Set<Action>();
  private pressed = new Set<Action>();
  private released = new Set<Action>();
  mouseDX = 0;
  mouseDY = 0;
  sensitivity = 1;
  invertY = false;
  locked = false;
  enabled = true;
  /** last raw key, used by menus/keypad */
  onKey: ((code: string, key: string) => boolean) | null = null;
  private gpPrev: boolean[] = [];
  gpMoveX = 0;
  gpMoveY = 0;
  usingGamepad = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', () => this.down.clear());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked) this.down.clear();
    });
  }

  requestLock(): void {
    if (document.pointerLockElement !== this.canvas) {
      const p = this.canvas.requestPointerLock?.() as unknown;
      if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => {});
    }
  }

  exitLock(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.onKey && this.onKey(e.code, e.key)) {
      e.preventDefault();
      return;
    }
    const acts = KEYMAP[e.code];
    if (!acts) return;
    if (e.code === 'AltLeft' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (e.repeat) return;
    this.usingGamepad = false;
    for (const a of acts) {
      if (!this.down.has(a)) this.pressed.add(a);
      this.down.add(a);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const acts = KEYMAP[e.code];
    if (!acts) return;
    for (const a of acts) {
      this.down.delete(a);
      this.released.add(a);
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.locked) return;
    this.mouseDX += e.movementX;
    this.mouseDY += e.movementY;
  };

  private onMouseDown = (e: MouseEvent) => {
    if (!this.locked) return;
    const a: Action | null = e.button === 0 ? 'fire' : e.button === 2 ? 'aim' : e.button === 1 ? 'melee' : null;
    if (!a) return;
    if (!this.down.has(a)) this.pressed.add(a);
    this.down.add(a);
  };

  private onMouseUp = (e: MouseEvent) => {
    const a: Action | null = e.button === 0 ? 'fire' : e.button === 2 ? 'aim' : e.button === 1 ? 'melee' : null;
    if (!a) return;
    this.down.delete(a);
    this.released.add(a);
  };

  /** Poll gamepad once per frame, before game update. */
  pollGamepad(): void {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = pads.find((p) => p && p.connected);
    if (!pad) return;
    const dz = (v: number) => (Math.abs(v) < 0.18 ? 0 : v);
    const lx = dz(pad.axes[0] ?? 0);
    const ly = dz(pad.axes[1] ?? 0);
    const rx = dz(pad.axes[2] ?? 0);
    const ry = dz(pad.axes[3] ?? 0);
    if (lx || ly || rx || ry || pad.buttons.some((b) => b.pressed)) this.usingGamepad = true;
    if (!this.usingGamepad) return;
    this.gpMoveX = lx;
    this.gpMoveY = ly;
    this.mouseDX += rx * 14;
    this.mouseDY += ry * 10;
    const map: [number, Action][] = [
      [0, 'jump'], [1, 'crouch'], [2, 'interact'], [3, 'flashlight'], [4, 'echo'],
      [5, 'melee'], [6, 'aim'], [7, 'fire'], [10, 'sprint'], [9, 'pause'], [12, 'reload'], [13, 'dodge'],
    ];
    for (const [i, a] of map) {
      const now = !!pad.buttons[i]?.pressed;
      const was = !!this.gpPrev[i];
      if (now && !was) {
        this.pressed.add(a);
        this.down.add(a);
        if (a === 'jump') this.pressed.add('skip');
      } else if (!now && was) {
        this.down.delete(a);
        this.released.add(a);
      }
      this.gpPrev[i] = now;
    }
  }

  isDown(a: Action): boolean {
    return this.enabled && this.down.has(a);
  }
  wasPressed(a: Action): boolean {
    return this.enabled && this.pressed.has(a);
  }
  wasReleased(a: Action): boolean {
    return this.released.has(a);
  }
  consume(a: Action): void {
    this.pressed.delete(a);
  }

  moveAxis(): { x: number; y: number } {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
    let y = (this.isDown('forward') ? 1 : 0) - (this.isDown('back') ? 1 : 0);
    if (this.usingGamepad) {
      x += this.gpMoveX;
      y -= this.gpMoveY;
    }
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    return { x, y };
  }

  takeLook(): { dx: number; dy: number } {
    const k = 0.0022 * this.sensitivity;
    const r = { dx: this.mouseDX * k, dy: this.mouseDY * k * (this.invertY ? -1 : 1) };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return this.enabled ? r : { dx: 0, dy: 0 };
  }

  endFrame(): void {
    this.pressed.clear();
    this.released.clear();
  }

  /** Inject actions programmatically (test hooks / bot playtest). */
  simulate(a: Action, down: boolean): void {
    if (down) {
      if (!this.down.has(a)) this.pressed.add(a);
      this.down.add(a);
    } else {
      this.down.delete(a);
      this.released.add(a);
    }
  }
}
