import * as THREE from 'three';

export type Action = 'attack' | 'heavy' | 'roll' | 'lock' | 'interact' | 'flask' | 'pause' | 'skill';

const KEY_ACTIONS: Record<string, Action> = {
  KeyJ: 'attack',
  KeyK: 'heavy',
  Space: 'roll',
  KeyQ: 'lock',
  Tab: 'lock',
  KeyE: 'interact',
  KeyF: 'skill',
  KeyX: 'skill',
  KeyR: 'flask',
  Escape: 'pause',
  KeyP: 'pause',
};

const BUFFER_SECONDS = 0.28;

/**
 * Unified keyboard / mouse / touch input. Actions are edge-triggered and buffered
 * (~0.28 s) so an attack or roll pressed slightly early still fires: important for
 * weighty combat where the previous swing is still recovering.
 */
export class Input {
  private readonly keys = new Set<string>();
  private readonly buffered = new Map<Action, number>();
  private readonly lookAccum = new THREE.Vector2();
  private readonly stickVec = new THREE.Vector2();
  private stickId: number | null = null;
  private stickCenter = new THREE.Vector2();
  private stickRadius = 50;
  private lookId: number | null = null;
  private lookLast = new THREE.Vector2();
  private time = 0;
  private sprintTouch = false;
  pointerLocked = false;
  anyKeyPressed = false;
  usingTouch = false;
  enabled = true;

  private readonly listeners: Array<[EventTarget, string, EventListener]> = [];

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.on(window, 'keydown', (e) => this.onKeyDown(e as KeyboardEvent));
    this.on(window, 'keyup', (e) => this.keys.delete((e as KeyboardEvent).code));
    this.on(window, 'blur', () => this.keys.clear());
    this.on(canvas, 'mousedown', (e) => this.onMouseDown(e as MouseEvent));
    this.on(canvas, 'contextmenu', (e) => e.preventDefault());
    this.on(document, 'mousemove', (e) => {
      const m = e as MouseEvent;
      if (this.pointerLocked) this.lookAccum.add(new THREE.Vector2(m.movementX, m.movementY));
    });
    this.on(document, 'pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });

    const stick = document.getElementById('touch-stick');
    const knob = document.getElementById('touch-knob');
    if (stick && knob) {
      this.on(stick, 'pointerdown', (e) => {
        const p = e as PointerEvent;
        p.preventDefault();
        this.usingTouch = true;
        const r = stick.getBoundingClientRect();
        this.stickCenter.set(r.left + r.width / 2, r.top + r.height / 2);
        this.stickRadius = r.width * 0.42;
        this.stickId = p.pointerId;
        try {
          stick.setPointerCapture(p.pointerId);
        } catch {
          /* synthetic events */
        }
        this.updateStick(p.clientX, p.clientY, knob);
      });
      this.on(stick, 'pointermove', (e) => {
        const p = e as PointerEvent;
        if (p.pointerId !== this.stickId) return;
        this.updateStick(p.clientX, p.clientY, knob);
      });
      const release = (e: Event) => {
        const p = e as PointerEvent;
        if (p.pointerId !== this.stickId) return;
        this.stickId = null;
        this.stickVec.set(0, 0);
        knob.style.transform = 'translate(-50%, -50%)';
      };
      for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) this.on(stick, ev, release);
    }

    const lookZone = document.getElementById('touch-look');
    if (lookZone) {
      this.on(lookZone, 'pointerdown', (e) => {
        const p = e as PointerEvent;
        this.usingTouch = true;
        this.lookId = p.pointerId;
        this.lookLast.set(p.clientX, p.clientY);
      });
      this.on(lookZone, 'pointermove', (e) => {
        const p = e as PointerEvent;
        if (p.pointerId !== this.lookId) return;
        this.lookAccum.x += (p.clientX - this.lookLast.x) * 1.6;
        this.lookAccum.y += (p.clientY - this.lookLast.y) * 1.6;
        this.lookLast.set(p.clientX, p.clientY);
      });
      const end = (e: Event) => {
        if ((e as PointerEvent).pointerId === this.lookId) this.lookId = null;
      };
      for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) this.on(lookZone, ev, end);
    }

    document.querySelectorAll<HTMLElement>('[data-action]').forEach((btn) => {
      const action = btn.dataset.action as Action | 'sprint';
      this.on(btn, 'pointerdown', (e) => {
        e.preventDefault();
        this.usingTouch = true;
        this.anyKeyPressed = true;
        btn.classList.add('pressed');
        if (action === 'sprint') this.sprintTouch = !this.sprintTouch;
        else this.press(action);
        btn.classList.toggle('toggled', action === 'sprint' && this.sprintTouch);
      });
      const up = () => btn.classList.remove('pressed');
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) this.on(btn, ev, up);
    });
  }

  private on(target: EventTarget, type: string, fn: EventListener): void {
    target.addEventListener(type, fn, { passive: false });
    this.listeners.push([target, type, fn]);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
    this.anyKeyPressed = true;
    if (!e.repeat) {
      const action = KEY_ACTIONS[e.code];
      if (action) this.press(action);
    }
    this.keys.add(e.code);
  }

  private onMouseDown(e: MouseEvent): void {
    this.anyKeyPressed = true;
    if (!this.pointerLocked && this.enabled && !this.usingTouch) {
      this.canvas.requestPointerLock?.();
      return;
    }
    if (e.button === 0) this.press('attack');
    else if (e.button === 2) this.press('heavy');
    else if (e.button === 1) this.press('lock');
  }

  private updateStick(x: number, y: number, knob: HTMLElement): void {
    this.stickVec.set((x - this.stickCenter.x) / this.stickRadius, (y - this.stickCenter.y) / this.stickRadius);
    if (this.stickVec.lengthSq() > 1) this.stickVec.normalize();
    knob.style.transform = `translate(calc(-50% + ${this.stickVec.x * 40}px), calc(-50% + ${this.stickVec.y * 40}px))`;
  }

  press(action: Action): void {
    this.buffered.set(action, this.time);
  }

  /** Consume a buffered press. */
  consume(action: Action): boolean {
    const t = this.buffered.get(action);
    if (t === undefined) return false;
    if (this.time - t > BUFFER_SECONDS) {
      this.buffered.delete(action);
      return false;
    }
    this.buffered.delete(action);
    return true;
  }

  peek(action: Action): boolean {
    const t = this.buffered.get(action);
    return t !== undefined && this.time - t <= BUFFER_SECONDS;
  }

  clearBuffer(): void {
    this.buffered.clear();
  }

  update(dt: number): void {
    this.time += dt;
  }

  /** x = strafe right, y = forward. */
  readMove(target: THREE.Vector2): THREE.Vector2 {
    target.set(0, 0);
    if (!this.enabled) return target;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) target.x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) target.x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) target.y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) target.y -= 1;
    target.x += this.stickVec.x;
    target.y -= this.stickVec.y;
    if (target.lengthSq() > 1) target.normalize();
    return target;
  }

  /** Guard is held, not tapped: C, L or Ctrl. */
  guardHeld(): boolean {
    return this.enabled && (this.keys.has('KeyC') || this.keys.has('KeyL') || this.keys.has('ControlLeft') || this.guardTouch);
  }

  guardTouch = false;

  sprintHeld(): boolean {
    return this.enabled && (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.sprintTouch);
  }

  takeLook(target: THREE.Vector2): THREE.Vector2 {
    target.copy(this.lookAccum);
    this.lookAccum.set(0, 0);
    if (this.keys.has('KeyL')) target.x += 6;
    if (this.keys.has('KeyH')) target.x -= 6;
    return target;
  }

  releasePointer(): void {
    if (document.pointerLockElement) document.exitPointerLock?.();
  }

  dispose(): void {
    for (const [t, type, fn] of this.listeners) t.removeEventListener(type, fn);
  }
}
