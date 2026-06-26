// ============================================================================
//  Input: keyboard + mouse with pointer lock and per-frame edge detection
// ============================================================================
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressedSet = new Set();
    this.mouseLeft = false; this.mouseRight = false;
    this.mLeftEdge = false; this.mRightEdge = false;
    this.mouseDX = 0; this.mouseDY = 0;
    this.wheel = 0;
    this.locked = false;
    this.enabled = true;
    this.sprintToggle = false;
    this._bind();
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.down.add(e.code);
      this.pressedSet.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code) && this.locked) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.down.delete(e.code); });
    window.addEventListener('blur', () => { this.down.clear(); this.mouseLeft = this.mouseRight = false; });

    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.locked) return;
      if (e.button === 0) { this.mouseLeft = true; this.mLeftEdge = true; }
      if (e.button === 2) { this.mouseRight = true; this.mRightEdge = true; }
      if (e.button === 1) { this.pressedSet.add('MouseMiddle'); }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseLeft = false;
      if (e.button === 2) this.mouseRight = false;
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('wheel', (e) => { if (this.locked) { this.wheel += Math.sign(e.deltaY); e.preventDefault(); } }, { passive: false });

    document.addEventListener('mousemove', (e) => {
      if (this.locked) { this.mouseDX += e.movementX || 0; this.mouseDY += e.movementY || 0; }
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (this.onLockChange) this.onLockChange(this.locked);
    });
  }

  requestLock() { if (this.canvas.requestPointerLock) this.canvas.requestPointerLock(); }
  exitLock() { if (document.exitPointerLock) document.exitPointerLock(); }

  key(code) { return this.enabled && this.down.has(code); }
  pressed(code) {
    if (code === 'mouseLeft') return this.mLeftEdge;
    if (code === 'mouseRight') return this.mRightEdge;
    return this.pressedSet.has(code);
  }
  consume(code) {
    if (code === 'mouseLeft') this.mLeftEdge = false;
    else if (code === 'mouseRight') this.mRightEdge = false;
    else this.pressedSet.delete(code);
  }
  takeWheel() { const w = this.wheel; this.wheel = 0; return w; }

  endFrame() {
    this.pressedSet.clear();
    this.mLeftEdge = false; this.mRightEdge = false;
  }
}
