// Keyboard, mouse (pointer lock) and gamepad input with per-frame edge detection.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.mouse = { dx: 0, dy: 0, x: 0, y: 0, buttons: 0, wheel: 0, down: new Set(), pressed: new Set(), released: new Set() };
    this.locked = false;
    this.wantLock = false;
    this.pad = null;
    this.sensitivity = 1;
    this.invertY = false;
    addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); this.released.add(e.code); });
    addEventListener('blur', () => this.keys.clear());
    addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX; this.mouse.y = e.clientY;
      if (this.locked) { this.mouse.dx += e.movementX; this.mouse.dy += e.movementY; }
    });
    canvas.addEventListener('mousedown', (e) => {
      this.mouse.down.add(e.button); this.mouse.pressed.add(e.button);
      if (this.wantLock && !this.locked) this.lock();
    });
    addEventListener('mouseup', (e) => { this.mouse.down.delete(e.button); this.mouse.released.add(e.button); });
    addEventListener('wheel', (e) => { this.mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
    addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; });
  }

  lock() { try { const p = this.canvas.requestPointerLock(); if (p?.catch) p.catch(() => {}); } catch {} }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
  setPointerLock(want) { this.wantLock = want; if (!want) this.unlock(); }

  down(code) { return this.keys.has(code); }
  hit(code) { return this.pressed.has(code); }
  any(...codes) { return codes.some((c) => this.keys.has(c)); }
  anyHit(...codes) { return codes.some((c) => this.pressed.has(c)); }

  poll() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    this.pad = null;
    for (const p of pads) if (p && p.connected) { this.pad = p; break; }
  }
  padAxis(i) { const v = this.pad?.axes[i] ?? 0; return Math.abs(v) < 0.15 ? 0 : v; }
  padBtn(i) { return this.pad?.buttons[i]?.value ?? 0; }

  // Unified axes
  get steer() { return (this.any('KeyD', 'ArrowRight') ? 1 : 0) - (this.any('KeyA', 'ArrowLeft') ? 1 : 0) + this.padAxis(0); }
  get throttle() { return Math.max(this.any('KeyW', 'ArrowUp') ? 1 : 0, this.padBtn(7)); }
  get brake() { return Math.max(this.any('KeyS', 'ArrowDown') ? 1 : 0, this.padBtn(6)); }
  get moveX() { return (this.any('KeyD') ? 1 : 0) - (this.any('KeyA') ? 1 : 0) + this.padAxis(0); }
  get moveY() { return (this.any('KeyW') ? 1 : 0) - (this.any('KeyS') ? 1 : 0) - this.padAxis(1); }
  lookDelta() {
    const s = 0.0022 * this.sensitivity;
    const lx = this.mouse.dx * s + this.padAxis(2) * 0.05;
    const ly = (this.mouse.dy * s + this.padAxis(3) * 0.05) * (this.invertY ? -1 : 1);
    return [lx, ly];
  }

  endFrame() {
    this.pressed.clear(); this.released.clear();
    this.mouse.dx = this.mouse.dy = 0; this.mouse.wheel = 0;
    this.mouse.pressed.clear(); this.mouse.released.clear();
  }
}
