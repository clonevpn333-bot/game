/* Procedural animation. Every pose is generated, blended and IK-corrected at
 * runtime — walk and run cycles, the alternating climb reach, ragdoll-adjacent
 * falling, carrying, downed crawling and the emote set. */
import * as THREE from '../../../../vendor/three/three.module.js';
import { solveTwoBone } from './ik.js';

const TAU = Math.PI * 2;
const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;

const REST_ARM = 1.28;      // shoulder drop from T-pose to arms-down

export class Animator {
  constructor(rig, world) {
    this.rig = rig;
    this.world = world;
    this.b = rig.byName;
    this.target = new Map();
    this.phase = 0;
    this.state = 'idle';
    this.prevState = 'idle';
    this.blend = 1;
    this.t = 0;
    this.handTargets = { L: new THREE.Vector3(), R: new THREE.Vector3() };
    this.handW = { L: 0, R: 0 };
    this.hipOffset = new THREE.Vector3();
    this.restHip = rig.root.position.clone();
    this.emote = null;
    this.emoteT = 0;
    this._v = new THREE.Vector3();
    for (const b of rig.bones) this.target.set(b.name, new THREE.Euler());
  }

  setState(s) {
    if (s === this.state) return;
    this.prevState = this.state;
    this.state = s;
    this.blend = 0;
  }

  playEmote(id) { this.emote = id; this.emoteT = 0; }

  set(name, x, y, z) {
    const e = this.target.get(name);
    if (e) e.set(x, y, z);
  }

  /** ctx: { speed, grounded, climbing, pitch, yaw, position, stamina, carrying, wallNormal } */
  update(dt, ctx) {
    this.t += dt;
    this.blend = Math.min(1, this.blend + dt * 5.5);
    for (const e of this.target.values()) e.set(0, 0, 0);

    const sp = ctx.speed || 0;
    const cad = this.state === 'run' ? 2.15 : this.state === 'climb' ? 0.72 : 1.55;
    this.phase = (this.phase + dt * cad * (sp > 0.2 ? Math.max(0.55, sp / 4.2) : 1)) % 1;

    POSES[this.state] ? POSES[this.state](this, ctx) : POSES.idle(this, ctx);
    if (this.emote) this.applyEmote(dt, ctx);

    // head follows the aim, within human limits
    const look = clamp(-(ctx.pitch || 0), -0.7, 0.6);
    const cur = this.target.get('head');
    cur.x += look * 0.55;
    this.target.get('neck').x += look * 0.3;

    const rate = 1 - Math.pow(0.0016, dt);
    for (const b of this.rig.bones) {
      const t = this.target.get(b.name);
      b.rotation.x = lerp(b.rotation.x, t.x, rate);
      b.rotation.y = lerp(b.rotation.y, t.y, rate);
      b.rotation.z = lerp(b.rotation.z, t.z, rate);
    }
    this.rig.root.position.lerp(this._v.copy(this.restHip).add(this.hipOffset), rate);
    this.rig.root.updateMatrixWorld(true);

    this.applyIK(ctx);
  }

  applyIK(ctx) {
    const b = this.b;
    if (this.handW.L > 0.01) {
      solveTwoBone(b.get('armL'), b.get('foreL'), b.get('handL'), this.handTargets.L, DOWN_L, this.handW.L);
    }
    if (this.handW.R > 0.01) {
      solveTwoBone(b.get('armR'), b.get('foreR'), b.get('handR'), this.handTargets.R, DOWN_R, this.handW.R);
    }
    // Foot planting only earns its keep on uneven ground; on a flat apron it just
    // fights the pose, so it stays off unless the ground under a foot differs.
    if (ctx.footIK && this.world && ctx.position && (this.state === 'idle' || this.state === 'tired' || this.state === 'walk')) {
      const baseY = this.world.height(ctx.position.x, ctx.position.z);
      for (const side of ['L', 'R']) {
        const foot = b.get('foot' + side);
        foot.updateWorldMatrix(true, false);
        const p = foot.getWorldPosition(this._v.clone());
        const h = this.world.height(p.x, p.z) + 0.075;
        if (Math.abs(h - baseY) > 0.055 && Math.abs(h - p.y) < 0.5) {
          p.y = h;
          solveTwoBone(b.get('thigh' + side), b.get('shin' + side), foot, p, FORWARD, 0.45);
        }
      }
    }
  }

  applyEmote(dt, ctx) {
    this.emoteT += dt;
    const e = EMOTES[this.emote];
    if (!e || this.emoteT > e.dur) { this.emote = null; return; }
    e.pose(this, this.emoteT / e.dur, ctx);
  }
}

const DOWN_L = new THREE.Vector3(-0.4, -1, 0.35).normalize();
const DOWN_R = new THREE.Vector3(0.4, -1, 0.35).normalize();
const FORWARD = new THREE.Vector3(0, 0, 1);

/* ---------------- pose library ---------------- */
function armsDown(a, extra = 0) {
  a.set('armL', 0, 0, -REST_ARM + extra);
  a.set('armR', 0, 0, REST_ARM - extra);
  a.set('foreL', 0, -0.25, 0);
  a.set('foreR', 0, 0.25, 0);
}

function legs(a, swing, bendL, bendR) {
  a.set('thighL', -swing, 0, 0.03);
  a.set('thighR', swing, 0, -0.03);
  a.set('shinL', bendL, 0, 0);
  a.set('shinR', bendR, 0, 0);
}

const POSES = {
  idle(a, ctx) {
    const s = Math.sin(a.t * 1.35);
    armsDown(a, 0.06 + s * 0.02);
    a.set('spine1', 0.02 + s * 0.012, 0, 0);
    a.set('chest', -0.03 + s * 0.015, 0, 0);
    a.set('thighL', 0.02, 0, 0.05);
    a.set('thighR', -0.02, 0, -0.05);
    a.hipOffset.set(0, s * 0.008, 0);
    a.handW.L = a.handW.R = 0;
  },
  tired(a) {
    const s = Math.sin(a.t * 2.6);
    a.set('armL', 0.2, 0, -REST_ARM + 0.22);
    a.set('armR', 0.2, 0, REST_ARM - 0.22);
    a.set('foreL', 0, -0.8, 0);
    a.set('foreR', 0, 0.8, 0);
    a.set('spine1', 0.34 + s * 0.05, 0, 0);
    a.set('spine2', 0.18, 0, 0);
    a.set('chest', 0.1, 0, 0);
    a.set('head', -0.25, 0, 0);
    a.set('thighL', -0.18, 0, 0.08);
    a.set('thighR', -0.18, 0, -0.08);
    a.set('shinL', 0.24, 0, 0);
    a.set('shinR', 0.24, 0, 0);
    a.hipOffset.set(0, -0.07 + s * 0.012, 0.02);
    a.handW.L = a.handW.R = 0;
  },
  walk(a, ctx) { cycle(a, ctx, 0.55, 0.9, 0.06, 0.10); },
  run(a, ctx) { cycle(a, ctx, 0.95, 1.35, 0.24, 0.20); },
  carrywalk(a, ctx) {
    cycle(a, ctx, 0.42, 0.8, 0.16, 0.06);
    a.set('armL', -0.4, 0, -REST_ARM + 0.85);
    a.set('armR', -0.4, 0, REST_ARM - 0.85);
    a.set('foreL', 0, -1.5, 0);
    a.set('foreR', 0, 1.5, 0);
  },
  carryidle(a, ctx) {
    POSES.idle(a, ctx);
    a.set('armL', -0.4, 0, -REST_ARM + 0.85);
    a.set('armR', -0.4, 0, REST_ARM - 0.85);
    a.set('foreL', 0, -1.5, 0);
    a.set('foreR', 0, 1.5, 0);
    a.set('spine1', 0.16, 0, 0);
  },
  air(a) {
    a.set('armL', -0.5, 0, -REST_ARM + 0.55);
    a.set('armR', -0.5, 0, REST_ARM - 0.55);
    a.set('foreL', 0, -0.9, 0);
    a.set('foreR', 0, 0.9, 0);
    a.set('thighL', -0.55, 0, 0.06);
    a.set('thighR', -0.2, 0, -0.06);
    a.set('shinL', 0.9, 0, 0);
    a.set('shinR', 0.35, 0, 0);
    a.set('spine1', 0.12, 0, 0);
    a.handW.L = a.handW.R = 0;
  },
  fall(a) {
    const f = Math.sin(a.t * 9);
    a.set('armL', -1.2 + f * 0.3, 0, -REST_ARM + 1.5);
    a.set('armR', -1.2 - f * 0.3, 0, REST_ARM - 1.5);
    a.set('foreL', 0, -1.2, 0);
    a.set('foreR', 0, 1.2, 0);
    a.set('thighL', -0.8 + f * 0.2, 0, 0.12);
    a.set('thighR', -0.5 - f * 0.2, 0, -0.12);
    a.set('shinL', 1.1, 0, 0);
    a.set('shinR', 0.8, 0, 0);
    a.set('spine1', -0.2, 0, 0);
    a.handW.L = a.handW.R = 0;
  },
  chute(a) {
    const s = Math.sin(a.t * 1.6);
    a.set('armL', -0.2, 0, -REST_ARM + 1.85 + s * 0.06);
    a.set('armR', -0.2, 0, REST_ARM - 1.85 - s * 0.06);
    a.set('foreL', 0, -0.55, 0);
    a.set('foreR', 0, 0.55, 0);
    a.set('thighL', -0.35 + s * 0.05, 0, 0.1);
    a.set('thighR', -0.35 - s * 0.05, 0, -0.1);
    a.set('shinL', 0.6, 0, 0);
    a.set('shinR', 0.6, 0, 0);
    a.set('spine1', -0.12, 0, 0);
    a.hipOffset.set(0, 0, 0);
    a.handW.L = a.handW.R = 0;
  },
  climb(a, ctx) { climbPose(a, ctx, true); },
  hang(a, ctx) { climbPose(a, ctx, false); },
  swim(a) {
    const p = a.phase * TAU;
    a.set('armL', -1.1 + Math.sin(p) * 1.1, 0, -REST_ARM + 1.5);
    a.set('armR', -1.1 + Math.sin(p + Math.PI) * 1.1, 0, REST_ARM - 1.5);
    a.set('thighL', -0.25 + Math.sin(p + 1) * 0.3, 0, 0.08);
    a.set('thighR', -0.25 + Math.sin(p + 1 + Math.PI) * 0.3, 0, -0.08);
    a.set('spine1', -0.5, 0, 0);
    a.hipOffset.set(0, -0.25, 0);
    a.handW.L = a.handW.R = 0;
  },
  downed(a) {
    const s = Math.sin(a.t * 1.7) * 0.06;
    a.set('spine1', 0.7 + s, 0, 0.2);
    a.set('spine2', 0.4, 0, 0.1);
    a.set('chest', 0.2, 0, 0);
    a.set('armL', 0.4, 0, -REST_ARM + 0.9);
    a.set('armR', 0.2, 0, REST_ARM - 0.4);
    a.set('foreL', 0, -1.4, 0);
    a.set('thighL', -1.1, 0, 0.3);
    a.set('thighR', -0.8, 0, -0.2);
    a.set('shinL', 1.4, 0, 0);
    a.set('shinR', 1.1, 0, 0);
    a.set('head', 0.3, 0.2, 0);
    a.hipOffset.set(0, -0.72, 0);
    a.handW.L = a.handW.R = 0;
  },
  dragged(a) {
    POSES.downed(a);
    a.set('armL', 1.1, 0, -REST_ARM + 1.7);
    a.set('armR', 1.1, 0, REST_ARM - 1.7);
    a.hipOffset.set(0, -0.78, 0);
  },
  plane(a) {
    a.set('spine1', 0.28, 0, 0);
    a.set('thighL', -1.45, 0, 0.12);
    a.set('thighR', -1.45, 0, -0.12);
    a.set('shinL', 1.5, 0, 0);
    a.set('shinR', 1.5, 0, 0);
    armsDown(a, 0.35);
    a.hipOffset.set(0, -0.42, 0);
    a.handW.L = a.handW.R = 0;
  },
  zip(a) {
    a.set('armL', -0.1, 0, -REST_ARM + 2.4);
    a.set('armR', -0.1, 0, REST_ARM - 2.4);
    a.set('foreL', 0, -0.4, 0);
    a.set('foreR', 0, 0.4, 0);
    a.set('thighL', -0.6, 0, 0.1);
    a.set('thighR', -0.4, 0, -0.1);
    a.set('shinL', 0.8, 0, 0);
    a.set('shinR', 0.5, 0, 0);
    a.handW.L = a.handW.R = 0;
  },
  grapple(a) {
    a.set('armL', -0.2, 0, -REST_ARM + 2.5);
    a.set('armR', -0.2, 0, REST_ARM - 1.2);
    a.set('foreL', 0, -0.6, 0);
    a.set('foreR', 0, 1.1, 0);
    a.set('spine1', -0.2, 0, 0);
    a.set('thighL', -0.5, 0, 0.1);
    a.set('thighR', -0.3, 0, -0.1);
    a.set('shinL', 0.9, 0, 0);
    a.set('shinR', 0.7, 0, 0);
    a.handW.L = a.handW.R = 0;
  },
  ghost(a) {
    const s = Math.sin(a.t * 1.1);
    armsDown(a, 0.4 + s * 0.08);
    a.set('spine1', -0.1 + s * 0.03, 0, 0);
    a.set('thighL', -0.35, 0, 0.1);
    a.set('thighR', -0.3, 0, -0.1);
    a.set('shinL', 0.5, 0, 0);
    a.set('shinR', 0.45, 0, 0);
    a.hipOffset.set(0, s * 0.05, 0);
    a.handW.L = a.handW.R = 0;
  },
};
POSES.land = POSES.air;

function cycle(a, ctx, swingAmt, kneeAmt, lean, armAmt) {
  const p = a.phase * TAU;
  const sL = Math.sin(p), sR = Math.sin(p + Math.PI);
  legs(a, sL * swingAmt, Math.max(0, -Math.sin(p - 0.7)) * kneeAmt, Math.max(0, -Math.sin(p + Math.PI - 0.7)) * kneeAmt);
  a.set('footL', -sL * 0.28, 0, 0);
  a.set('footR', -sR * 0.28, 0, 0);
  a.set('armL', sR * (0.6 + armAmt * 2), 0, -REST_ARM + 0.13 + armAmt);
  a.set('armR', sL * (0.6 + armAmt * 2), 0, REST_ARM - 0.13 - armAmt);
  a.set('foreL', 0, -0.45 - armAmt * 2, 0);
  a.set('foreR', 0, 0.45 + armAmt * 2, 0);
  a.set('spine1', lean, sL * 0.06, 0);
  a.set('chest', lean * 0.4, -sL * 0.1, 0);
  a.set('hips', 0, sL * 0.08, 0);
  a.hipOffset.set(0, Math.abs(Math.sin(p * 2)) * 0.035 - 0.02, 0);
  a.handW.L = a.handW.R = 0;
}

/** The climb: an alternating reach with both hands actually placed on the rock. */
function climbPose(a, ctx, moving) {
  const p = a.phase * TAU;
  const reachL = moving ? Math.max(0, Math.sin(p)) : 0.18;
  const reachR = moving ? Math.max(0, Math.sin(p + Math.PI)) : 0.24;
  a.set('spine1', 0.16, 0, 0);
  a.set('spine2', 0.1, 0, 0);
  a.set('chest', 0.08, 0, 0);
  a.set('armL', -1.0 - reachL * 0.55, 0, -REST_ARM + 1.75);
  a.set('armR', -1.0 - reachR * 0.55, 0, REST_ARM - 1.75);
  a.set('foreL', 0, -0.85, 0);
  a.set('foreR', 0, 0.85, 0);
  a.set('thighL', -0.55 - (1 - reachL) * 0.35, 0, 0.22);
  a.set('thighR', -0.55 - (1 - reachR) * 0.35, 0, -0.22);
  a.set('shinL', 0.9 + reachL * 0.3, 0, 0);
  a.set('shinR', 0.9 + reachR * 0.3, 0, 0);
  a.set('footL', -0.3, 0, 0);
  a.set('footR', -0.3, 0, 0);
  a.hipOffset.set(0, -0.12, 0.06);

  if (ctx.wallNormal && ctx.position) {
    const n = ctx.wallNormal;
    const side = new THREE.Vector3(-n.z, 0, n.x).normalize();
    const into = new THREE.Vector3(-n.x, 0, -n.z).normalize();
    const base = ctx.position;
    const set = (key, s, reach) => {
      const t = a.handTargets[key];
      t.copy(base)
        .addScaledVector(side, s * 0.34)
        .addScaledVector(into, 0.34)
        .add(new THREE.Vector3(0, 1.30 + reach * 0.42, 0));
      const h = ctx.world.height(t.x, t.z);
      if (t.y < h + 0.05) t.y = h + 0.05;
      a.handW[key] = 0.85;
    };
    set('L', 1, reachL);
    set('R', -1, reachR);
  }
}

/* ---------------- emotes ---------------- */
export const EMOTES = {
  wave: { name: 'Wave', dur: 2.0, pose: (a, k) => {
    a.set('armL', -1.6, 0, -REST_ARM + 2.35);
    a.set('foreL', 0, -0.5 + Math.sin(k * 18) * 0.55, 0);
    a.handW.L = 0;
  } },
  cheer: { name: 'Cheer', dur: 2.2, pose: (a, k) => {
    const b = Math.abs(Math.sin(k * 9));
    a.set('armL', -0.2, 0, -REST_ARM + 2.7);
    a.set('armR', -0.2, 0, REST_ARM - 2.7);
    a.set('spine1', -0.15 - b * 0.1, 0, 0);
    a.hipOffset.set(0, b * 0.09, 0);
    a.handW.L = a.handW.R = 0;
  } },
  point: { name: 'Point', dur: 1.8, pose: (a, k, ctx) => {
    a.set('armR', -1.35 + (ctx?.pitch || 0) * 0.8, 0, REST_ARM - 1.05);
    a.set('foreR', 0, 0.12, 0);
    a.handW.R = 0;
  } },
  sit: { name: 'Sit', dur: 6.0, pose: (a) => {
    a.set('thighL', -1.5, 0, 0.16);
    a.set('thighR', -1.5, 0, -0.16);
    a.set('shinL', 1.55, 0, 0);
    a.set('shinR', 1.55, 0, 0);
    a.set('spine1', 0.1, 0, 0);
    a.hipOffset.set(0, -0.44, 0);
    a.handW.L = a.handW.R = 0;
  } },
  horn: { name: 'Sound the horn', dur: 2.4, pose: (a, k) => {
    a.set('armR', -1.9, 0, REST_ARM - 1.2);
    a.set('foreR', 0, 1.9, 0);
    a.set('spine1', -0.12 - Math.sin(k * 6) * 0.05, 0, 0);
    a.handW.R = 0;
  } },
  flex: { name: 'Flex', dur: 2.6, pose: (a, k) => {
    a.set('armL', -0.2, 0, -REST_ARM + 1.55);
    a.set('armR', -0.2, 0, REST_ARM - 1.55);
    a.set('foreL', 0, -2.3, 0);
    a.set('foreR', 0, 2.3, 0);
    a.set('chest', 0, Math.sin(k * 5) * 0.18, 0);
    a.handW.L = a.handW.R = 0;
  } },
};
