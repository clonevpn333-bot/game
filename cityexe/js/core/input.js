// Keyboard + mouse state with edge detection and pointer lock support.
export class Input {
  constructor(el) {
    this.el = el;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, buttons: 0, wheel: 0, clicked: false, dblclicked: false, rclicked: false, downX: 0, downY: 0, dragging: false, down: [false, false, false] };
    this.locked = false;
    this.enabled = true;
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const k = e.code;
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
    });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    addEventListener('blur', () => { this.keys.clear(); this.mouse.down = [false, false, false]; });
    el.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX; this.mouse.y = e.clientY;
      this.mouse.dx += e.movementX || 0; this.mouse.dy += e.movementY || 0;
      if (this.mouse.down[0] || this.mouse.down[2] || this.mouse.down[1]) {
        if (Math.abs(e.clientX - this.mouse.downX) + Math.abs(e.clientY - this.mouse.downY) > 5) this.mouse.dragging = true;
      }
    });
    el.addEventListener('mousedown', (e) => {
      this.mouse.down[e.button] = true;
      this.mouse.downX = e.clientX; this.mouse.downY = e.clientY;
      this.mouse.dragging = false;
      if (e.button === 1) e.preventDefault();
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0 && !this.mouse.dragging && e.target === el) this.mouse.clicked = true;
      if (e.button === 2 && !this.mouse.dragging && e.target === el) this.mouse.rclicked = true;
      this.mouse.down[e.button] = false;
      if (!this.mouse.down.some(Boolean)) this.mouse.dragging = false;
    });
    el.addEventListener('dblclick', () => { this.mouse.dblclicked = true; });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('wheel', (e) => { this.mouse.wheel += Math.sign(e.deltaY) * Math.min(3, Math.abs(e.deltaY) / 60 + 0.5); e.preventDefault(); }, { passive: false });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === el; });
  }
  down(k) { return this.enabled && this.keys.has(k); }
  hit(k) { return this.enabled && this.pressed.has(k); }
  axis(neg, pos) { return (this.down(pos) ? 1 : 0) - (this.down(neg) ? 1 : 0); }
  lock() { if (!this.locked && this.el.requestPointerLock) { try { const p = this.el.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } } }
  unlock() { if (this.locked) document.exitPointerLock(); }
  endFrame() {
    this.pressed.clear();
    this.mouse.dx = 0; this.mouse.dy = 0; this.mouse.wheel = 0;
    this.mouse.clicked = false; this.mouse.dblclicked = false; this.mouse.rclicked = false;
  }
}
