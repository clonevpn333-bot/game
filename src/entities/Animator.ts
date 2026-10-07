import * as THREE from 'three';
import { clamp, easeOutCubic, lerp, smoothstep } from '../core/math';
import type { Rig } from './Rig';

export type ActionName =
  | 'none' | 'mantle' | 'vault' | 'attack' | 'pulse' | 'hurt' | 'interact' | 'wave'
  | 'talk' | 'sit' | 'cower' | 'point' | 'lookAround' | 'frozen' | 'reach' | 'sweep' | 'count' | 'stagger' | 'lunge' | 'sleep';

export interface AnimInput {
  speed: number;
  grounded: boolean;
  vy: number;
  crouch: boolean;
  sprint: boolean;
  action: ActionName;
  actionT: number;
  dread: number;
  inWater: boolean;
  turn: number;
  /** Walk cycle length multiplier (long-legged characters). */
  strideScale?: number;
  /** Extra stiffness override. */
  stiffness?: number;
}

const S = (e: THREE.Euler, x: number, y = 0, z = 0) => e.set(x, y, z);

export class Animator {
  phase = 0;
  private time = 0;
  private lookTimer = 0;
  private lookTarget = 0;

  constructor(readonly rig: Rig) {}

  update(dt: number, a: AnimInput): void {
    this.time += dt;
    const r = this.rig;
    const T = r.target;
    const t = this.time;
    const run = smoothstep(2.8, 6.2, a.speed);
    const sprint = smoothstep(6.8, 9.2, a.speed);
    const moving = smoothstep(0.15, 0.9, a.speed);
    const stride = lerp(1.25, 2.5, run) * (a.strideScale ?? 1) * (a.crouch ? 0.7 : 1);
    if (a.grounded) this.phase += (a.speed * dt / stride) * Math.PI * 2;
    const p = this.phase;
    const sp = Math.sin(p);
    const cp = Math.cos(p);

    r.stiffness = a.stiffness ?? (a.action !== 'none' ? 16 : 24);

    // ---------- base: idle ----------
    const breathe = Math.sin(t * 2.1);
    const dread = a.dread;
    const hug = smoothstep(0.55, 0.9, dread) * (1 - moving);
    S(T.hips, 0, 0, Math.sin(t * 1.1) * 0.025 * (1 - dread));
    S(T.spine, 0.02 + dread * 0.06, 0, 0);
    S(T.chest, 0.02 + breathe * 0.025, 0, dread > 0.7 ? Math.sin(t * 31) * 0.006 * dread : 0);
    S(T.neck, 0, 0, 0);
    S(T.head, -0.04 + dread * 0.12, 0, Math.sin(t * 0.7) * 0.03);
    S(T.shoulderL, lerp(0.05, -0.55, hug), 0, lerp(-0.1, 0.42, hug));
    S(T.shoulderR, lerp(0.05, -0.55, hug), 0, lerp(0.1, -0.42, hug));
    S(T.elbowL, lerp(-0.18, -1.75, hug), 0, 0);
    S(T.elbowR, lerp(-0.18, -1.75, hug), 0, 0);
    S(T.handL, 0, 0, 0);
    S(T.handR, 0, 0, 0);
    S(T.thighL, 0, 0, -0.03);
    S(T.thighR, 0, 0, 0.03);
    S(T.kneeL, 0.03, 0, 0);
    S(T.kneeR, 0.03, 0, 0);
    S(T.footL, 0, 0, 0);
    S(T.footR, 0, 0, 0);
    r.targetHipsOffsetY = breathe * 0.008 - dread * 0.02;

    // nervous glances when idle in later chapters
    this.lookTimer -= dt;
    if (this.lookTimer <= 0) {
      this.lookTimer = lerp(3.5, 1.2, dread) + ((t * 13.7) % 1.5);
      this.lookTarget = (((t * 7.1) % 2) - 1) * lerp(0.4, 1.0, dread) * (1 - moving);
    }
    T.head.y += this.lookTarget * (1 - moving);

    // ---------- locomotion ----------
    if (moving > 0 && a.grounded && !a.crouch) {
      const amp = lerp(0.42, 0.85, run) + sprint * 0.15;
      const kb = lerp(0.65, 1.45, run) + sprint * 0.2;
      const armAmp = lerp(0.35, 0.95, run) + sprint * 0.2;
      const m = moving;
      T.thighL.x += -amp * sp * m;
      T.thighR.x += amp * sp * m;
      T.kneeL.x += (kb * Math.max(0, cp) + 0.1 * run) * m;
      T.kneeR.x += (kb * Math.max(0, -cp) + 0.1 * run) * m;
      T.footL.x += (-0.25 * sp - 0.2 * Math.max(0, cp) * run) * m;
      T.footR.x += (0.25 * sp - 0.2 * Math.max(0, -cp) * run) * m;
      T.shoulderL.x = lerp(T.shoulderL.x, armAmp * sp, m);
      T.shoulderR.x = lerp(T.shoulderR.x, -armAmp * sp, m);
      T.shoulderL.z = lerp(T.shoulderL.z, -0.08 - run * 0.06, m);
      T.shoulderR.z = lerp(T.shoulderR.z, 0.08 + run * 0.06, m);
      const elbow = -(0.25 + run * 1.05 + sprint * 0.25);
      T.elbowL.x = lerp(T.elbowL.x, elbow + Math.max(0, -sp) * 0.3 * run, m);
      T.elbowR.x = lerp(T.elbowR.x, elbow + Math.max(0, sp) * 0.3 * run, m);
      T.chest.y += 0.16 * sp * m;
      T.hips.y += -0.12 * sp * m;
      T.hips.z += 0.04 * sp * m;
      T.spine.x += (0.05 + run * 0.16 + sprint * 0.16) * m;
      T.head.x -= (0.04 + run * 0.08) * m;
      T.chest.z += -a.turn * 0.12 * m;
      T.hips.z += a.turn * 0.06 * m;
      const bob = lerp(0.035, 0.07, run);
      r.targetHipsOffsetY += (bob * 0.5 * Math.cos(2 * p) - bob * 0.5) * m;
    }

    // ---------- crouch / sneak ----------
    if (a.crouch && a.grounded) {
      const m = moving;
      const sw = 0.35 * m;
      T.thighL.x += -0.85 - sw * sp;
      T.thighR.x += -0.85 + sw * sp;
      T.kneeL.x += 1.45 + 0.3 * Math.max(0, cp) * m;
      T.kneeR.x += 1.45 + 0.3 * Math.max(0, -cp) * m;
      T.footL.x += -0.55;
      T.footR.x += -0.55;
      T.spine.x += 0.42;
      T.chest.x += 0.1;
      T.head.x -= 0.4;
      T.shoulderL.x = -0.35 + 0.3 * sp * m;
      T.shoulderR.x = -0.35 - 0.3 * sp * m;
      T.elbowL.x = -1.1;
      T.elbowR.x = -1.1;
      T.shoulderL.z = -0.25;
      T.shoulderR.z = 0.25;
      r.targetHipsOffsetY += -0.27 + Math.abs(sp) * 0.02 * m;
    }

    // ---------- wading ----------
    if (a.inWater && a.grounded) {
      T.shoulderL.z -= 0.35;
      T.shoulderR.z += 0.35;
      T.elbowL.x -= 0.3;
      T.elbowR.x -= 0.3;
    }

    // ---------- air ----------
    if (!a.grounded) {
      const up = a.vy > 0 ? 1 : 0;
      const fall = clamp(-a.vy / 12, 0, 1);
      S(T.thighL, lerp(-0.45, -0.95, up) - fall * 0.2, 0, -0.08);
      S(T.thighR, lerp(-0.1, 0.25, up) + fall * 0.15, 0, 0.08);
      S(T.kneeL, lerp(0.6, 1.25, up), 0, 0);
      S(T.kneeR, lerp(0.35, 0.6, up) + fall * 0.3, 0, 0);
      S(T.footL, -0.3, 0, 0);
      S(T.footR, 0.2, 0, 0);
      const flail = Math.sin(t * 14) * 0.15 * fall;
      S(T.shoulderL, lerp(-0.35, -0.9, up) + flail, 0, -0.55 - fall * 0.8);
      S(T.shoulderR, lerp(0.35, -0.5, up) - flail, 0, 0.55 + fall * 0.8);
      S(T.elbowL, -0.5, 0, 0);
      S(T.elbowR, -0.5, 0, 0);
      T.spine.x = lerp(0.12, -0.08, fall);
      T.head.x = lerp(-0.05, 0.15, fall);
      r.targetHipsOffsetY = 0;
    }

    // ---------- actions ----------
    const k = a.actionT;
    switch (a.action) {
      case 'mantle': {
        // reach (0-0.3), pull (0.3-0.65), knee up and stand (0.65-1)
        const reach = smoothstep(0, 0.25, k) * (1 - smoothstep(0.55, 0.85, k));
        const knee = smoothstep(0.35, 0.65, k) * (1 - smoothstep(0.8, 1, k));
        S(T.shoulderL, lerp(0, -2.7, reach) + knee * 0.6, 0, -0.25);
        S(T.shoulderR, lerp(0, -2.7, reach) + knee * 0.6, 0, 0.25);
        S(T.elbowL, -0.3 - knee * 1.0, 0, 0);
        S(T.elbowR, -0.3 - knee * 1.0, 0, 0);
        S(T.thighL, -1.5 * knee, 0, 0);
        S(T.kneeL, 1.8 * knee + 0.2, 0, 0);
        S(T.thighR, 0.3 * reach, 0, 0);
        S(T.kneeR, 0.6 * reach + knee * 0.8, 0, 0);
        T.spine.x = 0.25 + knee * 0.35;
        T.head.x = -0.35 * reach;
        r.targetHipsOffsetY = -0.12 * knee;
        break;
      }
      case 'vault': {
        const mid = Math.sin(Math.PI * clamp(k, 0, 1));
        S(T.shoulderL, -1.2 * mid, 0, -0.9 * mid);
        S(T.shoulderR, -0.9 + 0.6 * k, 0, 0.3);
        S(T.elbowL, -0.2, 0, 0);
        S(T.thighL, -1.1 * mid, 0, -0.4 * mid);
        S(T.thighR, -0.9 * mid, 0, -0.5 * mid);
        S(T.kneeL, 1.0 * mid, 0, 0);
        S(T.kneeR, 0.5 * mid, 0, 0);
        T.hips.z = 0.45 * mid;
        T.spine.x = 0.35 * mid;
        T.chest.z = -0.25 * mid;
        break;
      }
      case 'attack': {
        const e = easeOutCubic(clamp(k * 1.3, 0, 1));
        T.chest.y = lerp(-0.9, 1.05, e);
        T.hips.y = lerp(0.35, -0.45, e);
        S(T.shoulderR, lerp(0.7, -1.3, e), 0, 1.25);
        S(T.elbowR, -0.25, 0, 0);
        S(T.shoulderL, lerp(-0.6, 0.4, e), 0, -0.5);
        T.spine.x = 0.18;
        T.thighL.x = -0.35;
        T.kneeL.x = 0.45;
        T.thighR.x = 0.3;
        r.targetHipsOffsetY = -0.08;
        break;
      }
      case 'pulse': {
        const lift = Math.sin(Math.PI * clamp(k, 0, 1));
        const spread = smoothstep(0.35, 0.6, k);
        S(T.shoulderL, -1.45 * lift, 0, -0.2 - spread * 0.9);
        S(T.shoulderR, -1.45 * lift, 0, 0.2 + spread * 0.9);
        S(T.elbowL, -0.35 * (1 - spread), 0, 0);
        S(T.elbowR, -0.35 * (1 - spread), 0, 0);
        T.chest.x = -0.18 * lift;
        T.head.x = -0.2 * lift;
        r.targetHipsOffsetY = 0.03 * lift;
        break;
      }
      case 'hurt':
      case 'stagger': {
        const h = 1 - k;
        T.spine.x = -0.4 * h;
        T.head.x = -0.35 * h;
        T.chest.z = 0.15 * h;
        S(T.shoulderL, -0.4 * h, 0, -0.9 * h);
        S(T.shoulderR, -0.4 * h, 0, 0.9 * h);
        r.targetHipsOffsetY -= 0.08 * h;
        break;
      }
      case 'interact':
      case 'reach': {
        const e = Math.sin(Math.PI * clamp(k, 0, 1));
        S(T.shoulderL, -1.15 * e, 0, -0.1);
        S(T.shoulderR, -1.15 * e, 0, 0.1);
        S(T.elbowL, -0.55 * e, 0, 0);
        S(T.elbowR, -0.55 * e, 0, 0);
        T.spine.x += 0.18 * e;
        break;
      }
      case 'wave': {
        S(T.shoulderR, -0.3, 0, 2.5);
        S(T.elbowR, -0.4, 0, Math.sin(t * 9) * 0.45);
        T.head.z = 0.1;
        break;
      }
      case 'talk': {
        T.shoulderR.x = -0.45 + Math.sin(t * 2.3) * 0.18;
        T.elbowR.x = -1.0 + Math.sin(t * 3.1) * 0.25;
        T.shoulderL.x = -0.15 + Math.sin(t * 1.7 + 1) * 0.12;
        T.elbowL.x = -0.6;
        T.head.x += Math.sin(t * 4.2) * 0.05;
        T.head.z += Math.sin(t * 1.4) * 0.06;
        break;
      }
      case 'point': {
        S(T.shoulderR, -1.5, 0, 0.15);
        S(T.elbowR, -0.05, 0, 0);
        break;
      }
      case 'sit': {
        S(T.thighL, -1.5, 0, -0.08);
        S(T.thighR, -1.5, 0, 0.08);
        S(T.kneeL, 1.5, 0, 0);
        S(T.kneeR, 1.5, 0, 0);
        S(T.shoulderL, -0.3, 0, -0.05);
        S(T.shoulderR, -0.3, 0, 0.05);
        S(T.elbowL, -0.9, 0, 0);
        S(T.elbowR, -0.9, 0, 0);
        r.targetHipsOffsetY = -(r.hipsBaseY * 0.42);
        break;
      }
      case 'cower': {
        S(T.thighL, -1.1, 0, -0.2);
        S(T.thighR, -1.1, 0, 0.2);
        S(T.kneeL, 1.9, 0, 0);
        S(T.kneeR, 1.9, 0, 0);
        T.spine.x = 0.7;
        T.head.x = 0.4;
        S(T.shoulderL, -2.4, 0, 0.3);
        S(T.shoulderR, -2.4, 0, -0.3);
        S(T.elbowL, -1.6, 0, 0);
        S(T.elbowR, -1.6, 0, 0);
        r.targetHipsOffsetY = -0.42;
        break;
      }
      case 'sweep': {
        const sw = Math.sin(t * 2.4);
        S(T.shoulderL, -0.7 + sw * 0.25, 0, 0.1);
        S(T.shoulderR, -0.9 + sw * 0.25, 0, -0.15);
        S(T.elbowL, -0.4, 0, 0);
        S(T.elbowR, -0.6, 0, 0);
        T.spine.x = 0.25;
        T.chest.y = sw * 0.25;
        break;
      }
      case 'count': {
        S(T.shoulderL, -2.0, 0, 0.45);
        S(T.shoulderR, -2.0, 0, -0.45);
        S(T.elbowL, -2.1, 0, 0);
        S(T.elbowR, -2.1, 0, 0);
        T.head.x = 0.35;
        T.spine.x = 0.2;
        break;
      }
      case 'lookAround': {
        T.head.y = Math.sin(t * 0.9) * 0.9;
        T.chest.y = Math.sin(t * 0.9) * 0.2;
        break;
      }
      case 'frozen': {
        // hold an odd mid-gesture
        S(T.shoulderR, -1.3, 0, 0.2);
        S(T.elbowR, -0.9, 0, 0);
        T.head.z = 0.35;
        T.head.x = 0.2;
        break;
      }
      case 'lunge': {
        const e = Math.sin(Math.PI * clamp(k, 0, 1));
        T.spine.x = 0.6 * e;
        S(T.shoulderL, -1.6 * e, 0, -0.2);
        S(T.shoulderR, -1.6 * e, 0, 0.2);
        T.thighL.x = -0.6 * e;
        T.kneeL.x = 0.4 * e;
        T.thighR.x = 0.5 * e;
        break;
      }
      case 'sleep': {
        T.head.x = 0.55;
        T.head.z = 0.2;
        T.spine.x = 0.2;
        S(T.shoulderL, 0.1, 0, -0.05);
        S(T.shoulderR, 0.1, 0, 0.05);
        break;
      }
      default:
        break;
    }
  }
}
