import * as THREE from 'three';
import type { Game } from './Game';
import type { Action } from '../core/Input';

/**
 * Scripted "player" for automated playtests. It only drives the same input intents a
 * person would (keys / actions), reading the HUD prompt and a little scene state to
 * choose them. Used by the QA hook `simulate()` — never active in normal play.
 */
export class Bot {
  private t = 0;
  private lastAdvance = 0;
  private lastAttack = 0;
  private held = new Set<string>();

  constructor(private readonly g: Game) {}

  private key(code: string, on: boolean): void {
    if (on) this.held.add(code);
    else this.held.delete(code);
    this.g.input.setKey(code, on);
  }

  private press(a: Action): void {
    this.g.input.press(a);
  }

  private steerToward(target: THREE.Vector3, from: THREE.Vector3, basisYaw: number, stopDist = 0.8): void {
    const d = target.clone().sub(from).setY(0);
    if (d.length() < stopDist) return;
    d.normalize();
    const fwd = new THREE.Vector3(Math.sin(basisYaw), 0, Math.cos(basisYaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const f = d.dot(fwd);
    const r = d.dot(right);
    if (f > 0.3) this.key('KeyW', true);
    if (f < -0.3) this.key('KeyS', true);
    if (r > 0.3) this.key('KeyD', true);
    if (r < -0.3) this.key('KeyA', true);
  }

  step(dt: number): void {
    this.t += dt;
    const g = this.g;
    const c = g.chapter as unknown as Record<string, any> | null;
    const ui = g.ui;
    for (const k of this.held) g.input.setKey(k, false);
    this.held.clear();
    g.input.setHeld('interact', false);
    if (!c) return;
    // dialogue + choices
    if (!ui.choicesEl.classList.contains('hidden')) this.press('choice1');
    if (this.t - this.lastAdvance > 0.45) {
      this.lastAdvance = this.t;
      if (!ui.subtitleEl.classList.contains('hidden')) this.press('advance');
    }
    const promptOn = !ui.promptEl.classList.contains('hidden');
    const action = promptOn ? (ui.promptEl.querySelector('.key')?.textContent ?? '') : '';
    const label = promptOn ? (ui.promptEl.querySelector('.label')?.textContent ?? '') : '';
    const hero = c.hero;
    const id = c.id as string;
    const cp = c.lastCheckpoint as string;
    if (!g.input.enabled && id !== 'climb') return;

    // ---- per set piece driving
    if (id === 'ride') {
      this.key('KeyW', true);
      const hp = c.hp as THREE.Vector3;
      // avoid the nearest obstacle/hoof by steering to a free lane
      let goal = 0;
      for (const o of c.obstacles as { x: number; z: number; r: number; hit: boolean; kind: string }[]) {
        if (o.hit || o.z < hp.z || o.z - hp.z > 30) continue;
        if (o.kind === 'rock' && Math.abs(o.x - hp.x) < o.r + 2) goal = o.x > hp.x ? o.x - o.r - 4 : o.x + o.r + 4;
      }
      const stag = c.stag;
      for (let i = 0; i < 4; i++) {
        const pr = stag.predictLanding(i);
        if (pr && pr.progress > 0.2 && Math.abs(pr.pos.z - hp.z) < 30 && Math.abs(pr.pos.x - hp.x) < 15) goal = pr.pos.x > hp.x ? pr.pos.x - 18 : pr.pos.x + 18;
      }
      if (goal - hp.x > 1.5) this.key('KeyA', true);
      if (goal - hp.x < -1.5) this.key('KeyD', true);
      if (/jump|leap/i.test(label)) this.press('jump');
      if (/strike/i.test(label) && this.t - this.lastAttack > 0.25) {
        this.lastAttack = this.t;
        this.press('attack');
      }
      return;
    }
    if (id === 'climb') {
      if (!ui.qteEl.classList.contains('hidden')) {
        g.input.setHeld('interact', true);
        return;
      }
      // dodge vents by sidestepping when one is about to blow nearby
      const th = c.th as number;
      const cy = c.cy as number;
      let side = 0;
      for (const v of c.vents as { th: number; y: number; t: number }[]) {
        const ph = v.t % 4.2;
        if (ph > 1.8 && Math.abs(v.y - cy) < 6 && Math.abs(((v.th - th + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.45) side = v.th > th ? -1 : 1;
      }
      const bellPh = (c.bellT as number) % 7;
      const bandY = (c.kneeY as number) - 30;
      if (bellPh > 4 && Math.abs(cy - bandY) < 8 && Math.abs(th) < 0.9) side = th >= 0 ? 1 : -1;
      if (side > 0) this.key('KeyD', true);
      else if (side < 0) this.key('KeyA', true);
      else this.key('KeyW', true);
      if (bellPh > 4 && Math.abs(cy - bandY) < 8 && Math.abs(th) < 0.9) this.key('KeyW', false);
      return;
    }
    if (id === 'fall') {
      const fx = c.fx as number;
      const fz = c.fz as number;
      const fy = c.fy as number;
      const ring = (c.rings as { y: number; group: THREE.Group; gap: number; gaps: number; passed: boolean }[]).find((r) => !r.passed && r.y < fy);
      let target = new THREE.Vector2(0, 0);
      if (ring) {
        // aim for the gap centre where it will be when we arrive
        const tArr = (fy - ring.y) / 25;
        const ang = ring.group.rotation.y + (c.rings.indexOf(ring) % 2 ? 1 : -1) * (0.25 + c.rings.indexOf(ring) * 0.03) * tArr;
        target = new THREE.Vector2(Math.cos(ang) * 16, -Math.sin(ang) * 16);
      }
      const dx = target.x - fx;
      const dz = target.y - fz;
      if (dx < -1) this.key('KeyD', true);
      if (dx > 1) this.key('KeyA', true);
      if (dz > 1) this.key('KeyW', true);
      if (dz < -1) this.key('KeyS', true);
      return;
    }
    if (!hero || !c.heroActive) {
      if (/hold|walk|climb/i.test(label)) this.key('KeyW', true);
      return;
    }
    const basis = hero.basisYaw() as number;
    // fights take priority
    const wardens = (c.wardens as { alive: boolean; pos: THREE.Vector3; state: string }[]).filter((w) => w.alive);
    if (id === 'prologue') {
      this.steerToward(new THREE.Vector3(0, 0, 24), hero.pos, basis, 0.6);
      if (/catch/i.test(label)) this.press('interact');
      return;
    }
    if (id === 'embers') {
      const wood = (c.wood as { mesh: THREE.Group; taken: boolean }[]).find((w) => !w.taken);
      let target: THREE.Vector3;
      if (wood) target = wood.mesh.position;
      else if ((c.fireOn as number) <= 0) target = new THREE.Vector3(0, 0, 0);
      else target = c.lyra.root.position;
      this.steerToward(target, hero.pos, basis, 1.2);
      if (/gather|light|sit/i.test(label)) this.press('interact');
      return;
    }
    if (id === 'finale' && cp === 'duel') {
      const v = c.vPos as THREE.Vector3;
      const vs = c.vState as string;
      const d = hero.pos.distanceTo(v);
      if (vs.startsWith('wind') && d < 5.5) {
        this.press('dodge');
        this.steerToward(hero.pos.clone().multiplyScalar(2).sub(v), hero.pos, basis, 0.1);
      } else if (vs === 'recover' || vs === 'stagger' || vs === 'approach') {
        this.steerToward(v, hero.pos, basis, 2.2);
        if (d < 3 && this.t - this.lastAttack > 0.2) {
          this.lastAttack = this.t;
          this.press('attack');
        }
      }
      if (/jump/i.test(label)) this.press('jump');
      return;
    }
    if (wardens.length && wardens.some((w) => w.pos.distanceTo(hero.pos) < 14)) {
      const near = wardens.reduce((a, b) => (a.pos.distanceTo(hero.pos) < b.pos.distanceTo(hero.pos) ? a : b));
      if (near.state === 'windup' && near.pos.distanceTo(hero.pos) < 3.4) this.press('dodge');
      this.steerToward(near.pos, hero.pos, basis, 1.6);
      if (near.pos.distanceTo(hero.pos) < 2.6 && this.t - this.lastAttack > 0.22) {
        this.lastAttack = this.t;
        this.press('attack');
      }
      if (/jump/i.test(label)) this.press('jump');
      return;
    }
    // default: run the set piece forward, reacting to prompts
    this.key('KeyW', true);
    if (/jump|leap/i.test(label)) this.press('jump');
    if (/slide|dodge|clear/i.test(label)) this.press('dodge');
    if (/catch/i.test(label)) this.press('interact');
    // sidestep telegraphed footfalls/debris in rail sections
    const tele: THREE.Vector3[] = [];
    const deb = c.debris as { rocks?: { target: THREE.Vector3; landed: boolean }[] } | undefined;
    for (const r of (deb as unknown as { rocks: { target: THREE.Vector3; landed: boolean }[] })?.rocks ?? []) if (!r.landed) tele.push(r.target);
    for (const t of tele) {
      const rel = t.clone().sub(hero.pos);
      const fwd = new THREE.Vector3(Math.sin(basis), 0, Math.cos(basis));
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      if (rel.dot(fwd) > -1 && rel.dot(fwd) < 8 && Math.abs(rel.dot(right)) < 3.5) this.key(rel.dot(right) > 0 ? 'KeyA' : 'KeyD', true);
    }
    void action;
  }

  release(): void {
    for (const k of this.held) this.g.input.setKey(k, false);
    this.held.clear();
  }
}
