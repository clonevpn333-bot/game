// Unified input: keyboard + mouse + gamepad mapped onto abstract actions.
// Edge detection (pressed/released) is resolved per fixed simulation step so
// that 60 Hz gameplay never misses a tap, whatever the display refresh rate.
const KEYMAP = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  jump: ['Space', 'KeyK', 'KeyZ'],
  attack: ['KeyJ', 'KeyX'],
  shoot: ['KeyL', 'KeyC'],
  dash: ['ShiftLeft', 'ShiftRight', 'KeyI'],
  interact: ['KeyE', 'KeyF'],
  special: ['KeyQ', 'KeyR'],
  confirm: ['Enter', 'Space', 'KeyJ', 'KeyX', 'KeyE'],
  back: ['Escape', 'Backspace'],
  pause: ['Escape', 'KeyP'],
};
const PADMAP = { jump: [0], attack: [2], shoot: [3], dash: [1, 5, 7], interact: [3], special: [4, 6], confirm: [0], back: [1], pause: [9] };

export class Input {
  constructor(target) {
    this.keys = new Set();
    this.down = {};      // action -> held
    this.pressed = {};   // action -> went down this step
    this.released = {};
    this._queuePress = new Set();
    this._queueRelease = new Set();
    this.mouse = { x: 0, y: 0, nx: 0.5, ny: 0.5, dx: 0, dy: 0, left: false, right: false, wheel: 0 };
    this._mousePress = new Set();
    this.locked = false;
    this.anyPressed = false;
    this._any = false;
    this.lastDevice = 'keyboard';
    this.target = target;
    this.padAxes = [0, 0, 0, 0];
    this._padPrev = {};

    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code); this._any = true; this.lastDevice = 'keyboard';
      for (const a in KEYMAP) if (KEYMAP[a].includes(e.code)) this._queuePress.add(a);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      for (const a in KEYMAP) if (KEYMAP[a].includes(e.code)) this._queueRelease.add(a);
    });
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse.left = this.mouse.right = false; });
    target.addEventListener('mousemove', (e) => {
      const r = target.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top;
      this.mouse.nx = this.mouse.x / r.width; this.mouse.ny = this.mouse.y / r.height;
      this.mouse.dx += e.movementX || 0; this.mouse.dy += e.movementY || 0;
    });
    target.addEventListener('mousedown', (e) => {
      this._any = true; this.lastDevice = 'keyboard';
      if (e.button === 0) { this.mouse.left = true; this._mousePress.add('mouseL'); }
      if (e.button === 2) { this.mouse.right = true; this._mousePress.add('mouseR'); }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) { this.mouse.left = false; this._queueRelease.add('mouseL'); }
      if (e.button === 2) { this.mouse.right = false; this._queueRelease.add('mouseR'); }
    });
    target.addEventListener('contextmenu', (e) => e.preventDefault());
    target.addEventListener('wheel', (e) => { this.mouse.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === target; });
  }

  requestLock() { if (!this.locked) this.target.requestPointerLock?.(); }
  exitLock() { if (document.pointerLockElement) document.exitPointerLock(); }

  _pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = [...pads].find((g) => g && g.connected);
    const held = {};
    if (p) {
      const dz = (v) => (Math.abs(v) < 0.22 ? 0 : v);
      this.padAxes = [dz(p.axes[0] || 0), dz(p.axes[1] || 0), dz(p.axes[2] || 0), dz(p.axes[3] || 0)];
      const b = (i) => !!p.buttons[i]?.pressed;
      held.left = this.padAxes[0] < -0.4 || b(14);
      held.right = this.padAxes[0] > 0.4 || b(15);
      held.up = this.padAxes[1] < -0.5 || b(12);
      held.down = this.padAxes[1] > 0.5 || b(13);
      for (const a in PADMAP) held[a] = PADMAP[a].some(b);
      if (Object.values(held).some(Boolean)) this.lastDevice = 'gamepad';
    } else this.padAxes = [0, 0, 0, 0];
    return held;
  }

  // Called once per fixed step.
  step() {
    const pad = this._pollPad();
    for (const a in KEYMAP) {
      const kb = KEYMAP[a].some((c) => this.keys.has(c));
      const was = !!this.down[a];
      const padNow = !!pad[a];
      const is = kb || padNow;
      this.pressed[a] = this._queuePress.has(a) || (padNow && !this._padPrev[a]) || (is && !was && !this._queueRelease.has(a));
      this.released[a] = (!is && was) || (this._queueRelease.has(a) && !is);
      this.down[a] = is;
    }
    this._padPrev = pad;
    this.pressed.mouseL = this._mousePress.has('mouseL');
    this.pressed.mouseR = this._mousePress.has('mouseR');
    this.released.mouseL = this._queueRelease.has('mouseL');
    this.released.mouseR = this._queueRelease.has('mouseR');
    this.down.mouseL = this.mouse.left; this.down.mouseR = this.mouse.right;
    this.anyPressed = this._any; this._any = false;
    this._queuePress.clear(); this._queueRelease.clear(); this._mousePress.clear();
  }
  // Called after all fixed steps of a frame consumed mouse deltas.
  endFrame() { this.mouse.dx = 0; this.mouse.dy = 0; this.mouse.wheel = 0; }

  get axisX() { const k = (this.down.right ? 1 : 0) - (this.down.left ? 1 : 0); return k || this.padAxes[0]; }
  get axisY() { const k = (this.down.down ? 1 : 0) - (this.down.up ? 1 : 0); return k || this.padAxes[1]; }
  // Consume a press so two systems don't both react to it.
  consume(a) { const p = this.pressed[a]; this.pressed[a] = false; return p; }
}
