// GETAWAY! — unified keyboard / mouse / gamepad input
const BINDS = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  jump: ['Space'], sprint: ['ShiftLeft', 'ShiftRight'], crouch: ['KeyC', 'ControlLeft'],
  enter: ['KeyF'], interact: ['KeyE'], melee: ['KeyV'], reload: ['KeyR'],
  handbrake: ['Space'], horn: ['KeyH'], boost: ['ShiftLeft', 'ShiftRight'], camera: ['KeyC'], lookBack: ['KeyB'],
  nextWeapon: ['KeyQ'], w1: ['Digit1'], w2: ['Digit2'], w3: ['Digit3'], w4: ['Digit4'], w5: ['Digit5'], w6: ['Digit6'],
  pause: ['Escape', 'KeyP'], confirm: ['Enter', 'NumpadEnter'], skip: ['Enter', 'Space'], map: ['KeyM'],
  airUp: ['ArrowUp'], airDown: ['ArrowDown'], flyUp: ['Space'], flyDown: ['ControlLeft', 'KeyC'],
  yawL: ['KeyQ'], yawR: ['KeyE'],
};
// standard gamepad mapping
const PAD = { jump: 0, enter: 3, interact: 2, melee: 1, reload: 2, crouch: 11, sprint: 10, handbrake: 0, boost: 1,
  horn: 10, camera: 8, lookBack: 11, nextWeapon: 5, pause: 9, confirm: 0, skip: 0, flyUp: 5, flyDown: 4 };

export class Input {
  constructor(el) {
    this.el = el;
    this.keys = new Set(); this.prev = new Set();
    this.mouseDX = 0; this.mouseDY = 0; this.wheel = 0;
    this.mouseButtons = 0; this.prevMouse = 0;
    this.locked = false; this.pad = null; this.padPrev = []; this.padNow = [];
    this.usingPad = false; this.sensitivity = 1; this.invertY = false;
    this.anyKeyCallbacks = [];
    addEventListener('keydown', (e) => {
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      this.keys.add(e.code); this.usingPad = false;
      for (const cb of this.anyKeyCallbacks) cb(e);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mouseButtons = 0; });
    el.addEventListener('mousedown', (e) => { this.mouseButtons |= (1 << e.button); this.usingPad = false; });
    addEventListener('mouseup', (e) => { this.mouseButtons &= ~(1 << e.button); });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => {
      if (this.locked) { this.mouseDX += e.movementX; this.mouseDY += e.movementY; }
    });
    addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === el; });
  }
  requestLock() { if (!this.locked && this.el.requestPointerLock) { try { const p = this.el.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} } }
  releaseLock() { if (document.exitPointerLock) document.exitPointerLock(); }

  poll() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    this.pad = null;
    for (const p of pads) if (p && p.connected) { this.pad = p; break; }
    this.padPrev = this.padNow;
    this.padNow = this.pad ? this.pad.buttons.map((b) => b.value > 0.5) : [];
    if (this.pad && (this.padNow.some((b) => b) || this.pad.axes.some((a) => Math.abs(a) > 0.3))) this.usingPad = true;
  }
  endFrame() {
    this.prev = new Set(this.keys); this.prevMouse = this.mouseButtons;
    this.mouseDX = 0; this.mouseDY = 0; this.wheel = 0;
  }
  _padBtn(i) { return !!this.padNow[i]; }
  down(action) {
    const b = BINDS[action]; if (b) for (const k of b) if (this.keys.has(k)) return true;
    const p = PAD[action]; if (p !== undefined && this._padBtn(p)) return true;
    return false;
  }
  pressed(action) {
    const b = BINDS[action]; if (b) for (const k of b) if (this.keys.has(k) && !this.prev.has(k)) return true;
    const p = PAD[action]; if (p !== undefined && this.padNow[p] && !this.padPrev[p]) return true;
    return false;
  }
  key(code) { return this.keys.has(code); }
  keyPressed(code) { return this.keys.has(code) && !this.prev.has(code); }
  mouse(btn) { return (this.mouseButtons & (1 << btn)) !== 0; }
  mousePressed(btn) { return (this.mouseButtons & (1 << btn)) !== 0 && (this.prevMouse & (1 << btn)) === 0; }
  // analog axes in [-1,1]
  moveX() { let v = (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0); if (this.pad) { const a = this.pad.axes[0]; if (Math.abs(a) > 0.15) v = a; } return v; }
  moveY() { let v = (this.down('up') ? 1 : 0) - (this.down('down') ? 1 : 0); if (this.pad) { const a = -this.pad.axes[1]; if (Math.abs(a) > 0.15) v = a; } return v; }
  lookX() { let v = this.mouseDX * 0.0022 * this.sensitivity; if (this.pad) { const a = this.pad.axes[2]; if (Math.abs(a) > 0.12) v += a * 0.05 * this.sensitivity; } return v; }
  lookY() { let v = this.mouseDY * 0.0022 * this.sensitivity; if (this.pad) { const a = this.pad.axes[3]; if (Math.abs(a) > 0.12) v += a * 0.04 * this.sensitivity; } return this.invertY ? -v : v; }
  throttle() { let v = this.down('up') ? 1 : 0; if (this.pad) v = Math.max(v, this.pad.buttons[7] ? this.pad.buttons[7].value : 0); return v; }
  brake() { let v = this.down('down') ? 1 : 0; if (this.pad) v = Math.max(v, this.pad.buttons[6] ? this.pad.buttons[6].value : 0); return v; }
  aim() { return this.mouse(2) || (this.pad && this.pad.buttons[6] && this.pad.buttons[6].value > 0.4); }
  fire() { return this.mouse(0) || (this.pad && this.pad.buttons[7] && this.pad.buttons[7].value > 0.4); }
  firePressed() { return this.mousePressed(0) || (this.pad && this.padNow[7] && !this.padPrev[7]); }
  rumble(strong = 0.5, weak = 0.5, ms = 120) {
    const p = this.pad; if (!p || !p.vibrationActuator) return;
    try { p.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: Math.min(1, strong), weakMagnitude: Math.min(1, weak) }); } catch (e) {}
  }
}
