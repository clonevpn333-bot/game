/* Input built for a MacBook trackpad: pointer lock for looking, left-button hold
 * to grip, everything else on keys. No scroll wheel, no right-drag, ever. */
export const KEYMAP = {
  forward: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  jump: ['Space'], sprint: ['ShiftLeft', 'ShiftRight'],
  interact: ['KeyE'], ping: ['KeyQ'], rope: ['KeyR'], drop: ['KeyG'],
  help: ['KeyF'], horn: ['KeyH'], inventory: ['Tab'], view: ['KeyV'],
  emote: ['KeyC'], chat: ['KeyT'], map: ['KeyM'],
};

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { dx: 0, dy: 0, left: false, leftPressed: false };
    this.locked = false;
    this.sensitivity = Number(localStorage.getItem('summit.sens') || 1);
    this.invertY = localStorage.getItem('summit.invertY') === '1';
    this.enabled = true;
    this.slotPressed = -1;

    addEventListener('keydown', (e) => {
      if (e.code === 'Tab') e.preventDefault();
      if (e.repeat) return;
      if (this.blockKeys) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      const n = e.code.match(/^Digit([1-9])$/);
      if (n) this.slotPressed = Number(n[1]) - 1;
      if (e.code === 'Space') e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mouse.left = false; });

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (!this.locked) { this.requestLock(); return; }
      this.mouse.left = true; this.mouse.leftPressed = true;
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.left = false; });
    addEventListener('mousemove', (e) => {
      if (!this.locked || !this.enabled) return;
      this.mouse.dx += e.movementX * 0.0022 * this.sensitivity;
      this.mouse.dy += e.movementY * 0.0022 * this.sensitivity * (this.invertY ? -1 : 1);
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (!this.locked) { this.keys.clear(); this.mouse.left = false; this.onUnlock?.(); }
    });
  }

  requestLock() { this.canvas.requestPointerLock?.(); }
  releaseLock() { document.exitPointerLock?.(); }

  down(action) { return KEYMAP[action].some((k) => this.keys.has(k)); }
  hit(action) {
    for (const k of KEYMAP[action]) if (this.pressed.has(k)) return true;
    return false;
  }
  takeSlot() { const s = this.slotPressed; this.slotPressed = -1; return s; }

  /** Movement vector in local space: x = strafe, y = forward. */
  moveVector() {
    let x = (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0);
    let y = (this.down('forward') ? 1 : 0) - (this.down('back') ? 1 : 0);
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    return { x, y };
  }

  takeLook() {
    const d = { dx: this.mouse.dx, dy: this.mouse.dy };
    this.mouse.dx = 0; this.mouse.dy = 0;
    return d;
  }

  endFrame() { this.pressed.clear(); this.mouse.leftPressed = false; }
  setSensitivity(v) { this.sensitivity = v; localStorage.setItem('summit.sens', String(v)); }
  setInvert(v) { this.invertY = v; localStorage.setItem('summit.invertY', v ? '1' : '0'); }
}
