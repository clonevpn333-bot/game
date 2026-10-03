// Keyboard + mouse input with pointer lock, per-frame edge detection.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
    this.buttons = [false, false, false];
    this.buttonsPressed = [false, false, false];
    this.buttonsReleased = [false, false, false];
    this.locked = false;
    this.enabled = true;
    this.onLockChange = null;
    this.lastKeyTime = {};

    window.addEventListener('keydown', (e) => {
      if (e.repeat) {
        if (this._shouldPrevent(e)) e.preventDefault();
        return;
      }
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
      this.lastKeyTime[e.code] = performance.now();
      if (this._shouldPrevent(e)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
      this.released.add(e.code);
    });
    window.addEventListener('blur', () => {
      this.down.clear();
      this.buttons = [false, false, false];
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button < 3) {
        this.buttons[e.button] = true;
        this.buttonsPressed[e.button] = true;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button < 3) {
        this.buttons[e.button] = false;
        this.buttonsReleased[e.button] = true;
      }
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      // Guard against occasional huge spikes some browsers emit on lock
      const dx = Math.max(-250, Math.min(250, e.movementX));
      const dy = Math.max(-250, Math.min(250, e.movementY));
      this.mouseDX += dx;
      this.mouseDY += dy;
    });
    window.addEventListener('wheel', (e) => {
      this.wheel += Math.sign(e.deltaY);
    }, { passive: true });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (this.onLockChange) this.onLockChange(this.locked);
    });
  }

  _shouldPrevent(e) {
    return ['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'AltLeft', 'AltRight', 'F1', 'Quote', 'Slash'].includes(e.code);
  }

  requestLock() {
    if (!this.locked && this.canvas.requestPointerLock) {
      try {
        const p = this.canvas.requestPointerLock({ unadjustedMovement: true });
        if (p && p.catch) p.catch(() => { try { this.canvas.requestPointerLock(); } catch (_) {} });
      } catch (_) {
        try { this.canvas.requestPointerLock(); } catch (__) {}
      }
    }
  }
  exitLock() {
    if (document.exitPointerLock) document.exitPointerLock();
  }

  key(code) { return this.enabled && this.down.has(code); }
  keyPressed(code) { return this.enabled && this.pressed.has(code); }
  keyReleased(code) { return this.enabled && this.released.has(code); }
  btn(i) { return this.enabled && this.buttons[i]; }
  btnPressed(i) { return this.enabled && this.buttonsPressed[i]; }
  btnReleased(i) { return this.enabled && this.buttonsReleased[i]; }

  axis(neg, pos) {
    return (this.key(pos) ? 1 : 0) - (this.key(neg) ? 1 : 0);
  }

  // Must be called at the end of each frame
  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
    this.buttonsPressed = [false, false, false];
    this.buttonsReleased = [false, false, false];
  }
}
