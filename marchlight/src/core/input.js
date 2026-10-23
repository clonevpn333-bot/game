// Keyboard / mouse / gamepad input mapped to game actions.
// Actions expose: down (held), pressed (this frame), released (this frame).

const BINDINGS = {
  forward: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  jump: ['Space'], sprint: ['ShiftLeft', 'ShiftRight'], crouch: ['KeyC', 'ControlLeft'],
  use: ['KeyF'], capture: ['KeyE'], release: ['KeyQ'], reload: ['KeyR'], melee: ['KeyV'],
  weapon1: ['Digit1'], weapon2: ['Digit2'], holster: ['KeyH'], swap: ['KeyX'],
  pause: ['Escape', 'KeyP'], journal: ['KeyJ', 'Tab'], skip: ['Enter'],
  choice1: ['Digit1'], choice2: ['Digit2'], choice3: ['Digit3'], choice4: ['Digit4'],
  fire: ['Mouse0'], aim: ['Mouse2'], zoom: ['KeyZ'],
};
// Standard gamepad layout
const PAD = { jump: 0, crouch: 1, use: 2, swap: 3, capture: 4, release: 5, aim: 6, fire: 7, journal: 8, pause: 9, sprint: 10, melee: 11, reload: 2 };

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.prev = new Set();
    this.now = new Set();
    this.mouseDX = 0; this.mouseDY = 0; this.wheel = 0;
    this.sensitivity = parseFloat(localStorage.getItem('marchlight.sens') || '1');
    this.invertY = localStorage.getItem('marchlight.invertY') === '1';
    this.locked = false;
    this.enabled = true;
    this.pad = null; this.padMove = { x: 0, y: 0 }; this.padLook = { x: 0, y: 0 };
    this.lastDevice = 'kbm';
    this.listeners = [];

    window.addEventListener('keydown', e => {
      if (e.code === 'Tab') e.preventDefault();
      if (e.code === 'Space' && document.pointerLockElement) e.preventDefault();
      this.keys.add(e.code); this.lastDevice = 'kbm';
      this.listeners.forEach(l => l(e.code));
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousedown', e => { this.keys.add('Mouse' + e.button); this.lastDevice = 'kbm'; if (this.wantLock && !this.locked) this.lock(); });
    window.addEventListener('mouseup', e => this.keys.delete('Mouse' + e.button));
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('mousemove', e => {
      if (!this.locked) return;
      this.mouseDX += e.movementX; this.mouseDY += e.movementY;
    });
    window.addEventListener('wheel', e => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked) this.keys.clear();
      this.onLockChange?.(this.locked);
    });
    this.wantLock = false;
  }

  onKey(fn) { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter(l => l !== fn); }; }

  lock() { try { const p = this.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch { /* ignore */ } }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }

  update() {
    // Gamepad
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    this.pad = null;
    for (const p of pads) if (p && p.connected) { this.pad = p; break; }
    this.prev = this.now;
    this.now = new Set(this.keys);
    if (this.pad) {
      const dz = v => (Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85);
      this.padMove.x = dz(this.pad.axes[0] || 0); this.padMove.y = dz(this.pad.axes[1] || 0);
      this.padLook.x = dz(this.pad.axes[2] || 0); this.padLook.y = dz(this.pad.axes[3] || 0);
      for (const [act, idx] of Object.entries(PAD)) {
        const b = this.pad.buttons[idx];
        if (b && (b.pressed || b.value > 0.4)) { this.now.add('Pad:' + act); this.lastDevice = 'pad'; }
      }
      const d = this.pad.buttons;
      if (d[12]?.pressed) this.now.add('Pad:choice1');
      if (d[13]?.pressed) this.now.add('Pad:choice2');
      if (d[14]?.pressed) this.now.add('Pad:choice3');
      if (d[15]?.pressed) this.now.add('Pad:choice4');
      if (Math.abs(this.padMove.x) + Math.abs(this.padMove.y) + Math.abs(this.padLook.x) + Math.abs(this.padLook.y) > 0) this.lastDevice = 'pad';
    } else { this.padMove.x = this.padMove.y = this.padLook.x = this.padLook.y = 0; }
  }

  endFrame() { this.mouseDX = 0; this.mouseDY = 0; this.wheel = 0; }

  _has(set, action) {
    const b = BINDINGS[action];
    if (b) for (const k of b) if (set.has(k)) return true;
    return set.has('Pad:' + action);
  }
  down(action) { return this.enabled && this._has(this.now, action); }
  pressed(action) { return this.enabled && this._has(this.now, action) && !this._has(this.prev, action); }
  released(action) { return this.enabled && !this._has(this.now, action) && this._has(this.prev, action); }
  // UI-level queries that ignore the gameplay enable flag
  uiPressed(action) { return this._has(this.now, action) && !this._has(this.prev, action); }

  moveVector() {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = 0, y = 0;
    if (this.down('forward')) y += 1; if (this.down('back')) y -= 1;
    if (this.down('right')) x += 1; if (this.down('left')) x -= 1;
    if (this.pad) { x += this.padMove.x; y -= this.padMove.y; }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }
  lookDelta(dt) {
    if (!this.enabled) return { x: 0, y: 0 };
    const s = 0.0022 * this.sensitivity;
    let x = this.mouseDX * s, y = this.mouseDY * s * (this.invertY ? -1 : 1);
    if (this.pad) { x += this.padLook.x * 2.6 * dt * this.sensitivity; y += this.padLook.y * 2.0 * dt * this.sensitivity * (this.invertY ? -1 : 1); }
    return { x, y };
  }
  label(action) {
    if (this.lastDevice === 'pad') {
      const m = { jump: 'Ⓐ', crouch: 'Ⓑ', use: 'Ⓧ', swap: 'Ⓨ', capture: 'LB', release: 'RB', aim: 'LT', fire: 'RT', sprint: 'L3', melee: 'R3', reload: 'Ⓧ', pause: 'Start', journal: 'Back', skip: 'Ⓐ' };
      return m[action] || action;
    }
    const m = { jump: 'Space', crouch: 'C', use: 'F', capture: 'E', release: 'Q', reload: 'R', melee: 'V', fire: 'LMB', aim: 'RMB', sprint: 'Shift', pause: 'Esc', journal: 'J', swap: 'X', zoom: 'Z', skip: 'Enter' };
    return m[action] || action;
  }
}
