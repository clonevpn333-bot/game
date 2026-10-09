'use strict';
// Keyboard + mouse with pointer lock.

const Input = {
  down: {},
  pressedSet: {},
  releasedSet: {},
  mdx: 0, mdy: 0,
  wheel: 0,
  mouseDown: false,
  mousePressed: false,
  locked: false,
  wantLock: false,

  init(el) {
    this.el = el;
    window.addEventListener('keydown', e => {
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (!this.down[e.code]) this.pressedSet[e.code] = true;
      this.down[e.code] = true;
      Bus.emit('keydown', e.code, e);
    });
    window.addEventListener('keyup', e => {
      this.down[e.code] = false;
      this.releasedSet[e.code] = true;
    });
    window.addEventListener('blur', () => { this.down = {}; });
    document.addEventListener('mousemove', e => {
      if (this.locked) { this.mdx += e.movementX || 0; this.mdy += e.movementY || 0; }
    });
    document.addEventListener('mousedown', e => {
      if (e.button === 0) { this.mouseDown = true; this.mousePressed = true; }
    });
    document.addEventListener('mouseup', e => { if (e.button === 0) this.mouseDown = false; });
    document.addEventListener('wheel', e => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.el;
      Bus.emit('lockchange', this.locked);
    });
  },
  lock() {
    if (!this.locked && this.el.requestPointerLock) {
      try { const p = this.el.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ }
    }
  },
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); },
  held(code) { return !!this.down[code]; },
  pressed(code) { return !!this.pressedSet[code]; },
  released(code) { return !!this.releasedSet[code]; },
  consume(code) { this.pressedSet[code] = false; },
  anyPressed(...codes) { return codes.some(c => this.pressedSet[c]); },
  flush() { this.pressedSet = {}; this.releasedSet = {}; this.mdx = 0; this.mdy = 0; this.wheel = 0; this.mousePressed = false; },
  axis(neg, pos) { return (this.held(pos) ? 1 : 0) - (this.held(neg) ? 1 : 0); },
};
