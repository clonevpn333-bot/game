// CITY.EXE — game shell: boots the world, runs the loop, routes input between
// observe mode and possession, and wires the views, UI and audio together.
import * as THREE from 'three';
import { World, HYPER } from './sim/world.js';
import { C } from './sim/config.js';
import { Renderer } from './render/renderer.js';
import { CityView } from './render/cityView.js';
import { VehicleView } from './render/vehicleView.js';
import { PeopleView } from './render/peopleView.js';
import { FX } from './render/fx.js';
import { EventView } from './render/eventView.js';
import { Input } from './core/input.js';
import { CameraRig } from './play/cameraRig.js';
import { rand } from './core/rng.js';

export const SPEEDS = [0, 0.25, 1, 3, 8, 60, 240];
export const SPEED_LABELS = ['Paused', 'Slow-mo', '1×', '3×', '8×', 'Fast-forward', 'Skip time'];

export class Game {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.opts = opts;
    this.speedIdx = 2;
    this.selected = null; // {kind, id}
    this.hover = null;
    this.mode = 'observe';
    this.listeners = {};
    this.frame = 0;
    this.fps = 60;
    this.paused = false;
  }

  async boot(progress = () => {}) {
    progress('Generating city…', 0.1);
    await tick();
    const seed = this.opts.seed ?? 20261015;
    this.world = this.opts.world || new World(seed, {});
    if (!this.opts.world) {
      progress('Populating citizens…', 0.3);
      await tick();
      this.world.init();
    }
    progress('Building the skyline…', 0.55);
    await tick();
    this.renderer = new Renderer(this.canvas);
    this.input = new Input(this.canvas);
    this.rig = new CameraRig(this.renderer.camera, this.input, this.world);
    this.cityView = new CityView(this.renderer, this.world);
    progress('Starting traffic…', 0.75);
    await tick();
    this.cityView.buildTransitProps(this.world);
    this.vehicleView = new VehicleView(this.renderer, this.world);
    this.peopleView = new PeopleView(this.renderer, this.world);
    this.fx = new FX(this.renderer, this.world);
    this.eventView = new EventView(this.renderer, this.world, this.cityView);
    this.raycaster = new THREE.Raycaster();
    this.box = new THREE.Box3();
    progress('Compiling shaders…', 0.9);
    // warm the shader cache behind the loading screen (avoids hitches on the first frames)
    this.vehicleView.update(0); this.peopleView.update(0);
    try { if (this.renderer.r.compileAsync) await this.renderer.r.compileAsync(this.renderer.scene, this.renderer.camera); } catch (e) { /* not critical */ }
    progress('Ready', 1);
    // warm up the simulation a little so the streets are alive on first frame
    for (let i = 0; i < 90; i++) this.world.update(1 / 30, 3);
    this.last = performance.now();
    this.envFocus = new THREE.Vector3();
  }

  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, d) { for (const f of this.listeners[ev] || []) f(d); }

  get speed() { return this.paused ? 0 : SPEEDS[this.speedIdx]; }
  setSpeed(i) { this.speedIdx = Math.max(0, Math.min(SPEEDS.length - 1, i)); this.paused = this.speedIdx === 0; this.emit('speed', this.speedIdx); }

  start() {
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.fps = this.fps * 0.95 + (1 / Math.max(dt, 0.001)) * 0.05;
      try { this.update(dt); } catch (e) { console.error(e); this.emit('error', e); }
    };
    requestAnimationFrame(loop);
  }

  update(dt) {
    const W = this.world;
    const I = this.input;
    this.frame++;
    // global keys
    if (I.hit('Space') && this.mode === 'observe') this.togglePause();
    if (this.mode === 'observe') {
      if (I.hit('Digit1')) this.setSpeed(2);
      if (I.hit('Digit2')) this.setSpeed(3);
      if (I.hit('Digit3')) this.setSpeed(4);
      if (I.hit('Digit4')) this.setSpeed(5);
      if (I.hit('Digit5')) this.setSpeed(6);
    }
    if (I.hit('Digit0') || I.hit('Backquote')) this.setSpeed(this.speedIdx === 1 ? 2 : 1);
    if (I.hit('Equal') || I.hit('NumpadAdd')) this.setSpeed(this.speedIdx + 1);
    if (I.hit('Minus') || I.hit('NumpadSubtract')) this.setSpeed(this.speedIdx - 1);

    W._speed = this.speed;
    // simulation
    const simSpeed = this.speed;
    if (simSpeed > 0) W.update(dt, simSpeed);
    // control
    if (this.possession && this.possession.active) this.possession.update(dt);
    else this.updateObserve(dt);
    this.rig.apply(dt);
    // views
    const cam = this.renderer.camera;
    W.focus.x = this.rig.mode === 'observe' ? this.rig.target.x : cam.position.x;
    W.focus.z = this.rig.mode === 'observe' ? this.rig.target.z : cam.position.z;
    this.envFocus.set(W.focus.x, 0, W.focus.z);
    W.env.night = this.renderer.env.night;
    this.renderer.updateEnvironment(W.minuteOfDay, W.season, { cloud: W.weather.cloud, fog: W.weather.fog, precip: W.weather.precip, flash: W.weather.flash, heat: W.weather.heat }, this.envFocus, dt);
    const U = this.renderer.U;
    U.uWet.value = W.weather.wet;
    U.uSnow.value = W.weather.snowCover;
    if (W.signalsChanged || this.frame % 20 === 0) { this.cityView.updateSignals(this.renderer.U.uTime.value); W.signalsChanged = false; }
    if (this.frame % 15 === 0) this.cityView.updateBuildings(W);
    this.cityView.update(dt, W);
    if (this.cityView.season !== W.season) this.cityView.setSeasonColors(W.season);
    this.vehicleView.update(dt);
    this.peopleView.update(dt);
    if (this.interiors) { this.rig.indoors = this.interiors.active; if (this.interiors.active) this.interiors.update(dt); }
    const selP = this.selectionPos(this.selected), hovP = this.mode === 'observe' ? this.selectionPos(this.hover) : null;
    this.fx.update(dt, this.mode === 'observe' ? selP : null, hovP && (!this.selected || this.hover.id !== this.selected.id || this.hover.kind !== this.selected.kind) ? hovP : null, this.possession && this.possession.objective());
    this.eventView.update(dt, this.fx);
    this.renderer.render(dt);
    this.emit('frame', dt);
    I.endFrame();
  }

  togglePause() {
    if (this.paused) { this.paused = false; if (this.speedIdx === 0) this.speedIdx = 2; }
    else this.paused = true;
    this.emit('speed', this.speedIdx);
  }

  // ------------------------------------------------ observe mode
  updateObserve(dt) {
    const I = this.input;
    const uiBusy = this.uiCapture && this.uiCapture();
    this.rig.mode = 'observe';
    if (this.rig.trans) this.rig.updateTransition(dt);
    else this.rig.updateObserve(dt, !uiBusy);
    // hover & click picking
    if (!I.mouse.dragging && this.frame % 3 === 0) this.hover = this.pick(I.mouse.x, I.mouse.y, true);
    if (I.mouse.clicked && !uiBusy) {
      const p = this.pick(I.mouse.x, I.mouse.y);
      if (this.godTool && this.godTool.active) this.godTool.click(p, this.groundPoint(I.mouse.x, I.mouse.y));
      else this.select(p);
    }
    if (I.mouse.dblclicked && this.selected && (this.selected.kind === 'citizen' || this.selected.kind === 'vehicle')) this.possessSelected();
    if (I.hit('KeyF') && this.selected) this.followSelected();
    if (I.hit('KeyP') || I.hit('Enter')) this.possessSelected();
    if (I.hit('Escape')) { if (this.godTool && this.godTool.active) this.godTool.cancel(); else this.select(null); }
  }

  selectionPos(sel) {
    if (!sel) return null;
    const W = this.world;
    if (sel.kind === 'citizen') {
      const c = W.citizens[sel.id];
      if (c.dutyHeli && c.dutyHeli.state !== 'pad') { const h = c.dutyHeli; return { x: h.x, y: h.y, z: h.z, r: 7 }; }
      const p = W.citizenPos(c);
      if (!p) return null;
      if (p.inside) return null;
      return { x: p.x, y: p.y || 0, z: p.z, r: p.inCar ? 3 : 0.9 };
    }
    if (sel.kind === 'vehicle') {
      const v = W.traffic.byId.get(sel.id);
      if (!v || v.state === 'garage' || v.state === 'abstract') return null;
      return { x: v.x, y: v.y, z: v.z, r: v.len * 0.6 };
    }
    if (sel.kind === 'building') {
      const b = W.city.buildings[sel.id];
      return { x: b.x, y: 0.3, z: b.z, r: Math.max(b.w, b.d) * 0.62 };
    }
    return null;
  }

  pick(mx, my, hoverOnly = false) {
    const W = this.world;
    const cam = this.renderer.camera;
    const w = innerWidth, h = innerHeight;
    const v = new THREE.Vector3();
    let best = null, bd = 30 * 30;
    const consider = (x, y, z, obj, bias = 0) => {
      v.set(x, y, z).project(cam);
      if (v.z > 1 || v.z < -1) return;
      const sx = (v.x + 1) / 2 * w, sy = (1 - v.y) / 2 * h;
      const d = (sx - mx) ** 2 + (sy - my) ** 2 - bias;
      if (d < bd) { bd = d; best = obj; }
    };
    for (const p of this.peopleView.visible) consider(p.x, (p.y || 0) + 1, p.z, { kind: 'citizen', id: p.cid }, 120);
    for (const veh of this.vehicleView.visible) {
      if (veh.state === 'parked' && hoverOnly) continue;
      consider(veh.x, veh.y + 1, veh.z, veh.driver != null && veh.state !== 'parked' ? { kind: 'vehicle', id: veh.id } : { kind: 'vehicle', id: veh.id }, 0);
    }
    for (const hl of W.helis.list) if (hl.pilot != null) consider(hl.x, hl.y + 1, hl.z, { kind: 'citizen', id: hl.pilot }, 400);
    if (best) return best;
    // buildings via ray
    const ndc = new THREE.Vector2((mx / w) * 2 - 1, -(my / h) * 2 + 1);
    this.raycaster.setFromCamera(ndc, cam);
    const ray = this.raycaster.ray;
    let hit = null, hd = Infinity;
    const pt = new THREE.Vector3();
    for (const b of W.city.buildings) {
      const top = b.h * (W.buildingVisual(b).scaleY) + (b.kind === 'house' ? 2.5 : 0);
      this.box.min.set(b.x0, 0, b.z0); this.box.max.set(b.x1, Math.max(top, 1.5), b.z1);
      if (ray.intersectBox(this.box, pt)) { const d = pt.distanceToSquared(ray.origin); if (d < hd) { hd = d; hit = b; } }
    }
    if (hit) return { kind: 'building', id: hit.id };
    return null;
  }

  groundPoint(mx, my) {
    const cam = this.renderer.camera;
    const ndc = new THREE.Vector2((mx / innerWidth) * 2 - 1, -(my / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, cam);
    const ray = this.raycaster.ray;
    if (Math.abs(ray.direction.y) < 1e-4) return null;
    const t = -ray.origin.y / ray.direction.y;
    if (t < 0) return null;
    return { x: ray.origin.x + ray.direction.x * t, z: ray.origin.z + ray.direction.z * t };
  }

  select(p) {
    // clicking a car selects its driver (people are the main subject)
    if (p && p.kind === 'vehicle') {
      const v = this.world.traffic.byId.get(p.id);
      if (v && v.driver != null && v.state !== 'parked') p = { kind: 'citizen', id: v.driver, viaVehicle: v.id };
    }
    this.selected = p;
    this.emit('select', p);
  }

  followSelected() {
    const sel = this.selected;
    if (!sel) return;
    this.rig.userPitch = false;
    this.rig.setFollow(() => this.selectionPos(sel));
    this.rig.goal.dist = Math.min(this.rig.goal.dist, sel.kind === 'building' ? 160 : 70);
    if (sel.kind === 'building') { const b = this.world.city.buildings[sel.id]; this.rig.flyTo(b.x, b.z, Math.max(90, b.h * 2.5)); }
  }

  flyTo(x, z, dist = 160) { this.rig.flyTo(x, z, dist); this.rig.userPitch = false; }

  possessSelected() {
    if (!this.selected || !this.possession) return;
    this.possession.possess(this.selected);
  }
}

function tick() { return new Promise((r) => setTimeout(r, 0)); }
