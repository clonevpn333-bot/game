/* The airfield you walk around in before the flight — same movement code, flat
 * ground, and everyone's cosmetics on show. */
import * as THREE from '../../../../vendor/three/three.module.js';
import { Airfield } from './airfield.js';
import { ClimberSet } from '../play/climbers.js';
import { PHASE } from '../../shared/constants.js';
import { FLAG } from '../../shared/protocol.js';

const _v = new THREE.Vector3();

export class LobbyScene {
  constructor(app, flatWorld) {
    this.app = app;
    this.world = flatWorld;
    this.field = new Airfield(app.stage.scene);
    this.climbers = new ClimberSet(app.stage.scene, flatWorld);
    this.stepT = 0;
  }

  setVisible(v) {
    this.field.setVisible(v);
    for (const c of this.climbers.all()) c.group.visible = v;
  }

  dispose() { this.field.dispose(); this.climbers.dispose(); }

  update(dt) {
    const app = this.app;
    const net = app.net;
    const look = app.input.takeLook(dt);
    if (!app.uiBlocking()) app.cam.addLook(look.dx, look.dy);
    const mv = app.uiBlocking() ? { x: 0, y: 0 } : app.input.moveVector();
    const pred = net.advance(app.rawDt ?? dt, {
      mv, yaw: app.cam.yaw, pitch: app.cam.pitch,
      jump: !app.uiBlocking() && app.input.downOrTapped('jump'),
      sprint: !app.uiBlocking() && app.input.down('sprint'),
      grab: false, use: false,
    });

    const mePos = _v.set(pred.x + net.corr.x, pred.y + net.corr.y, pred.z + net.corr.z);
    const me = this.climbers.ensure(net.id, app.name, app.look, true);
    me.apply({ x: mePos.x, y: mePos.y, z: mePos.z, yaw: app.cam.yaw, pitch: app.cam.pitch, f: 0 }, dt);
    const sp = Math.hypot(pred.vx, pred.vz);
    me.setState(!pred.onGround ? 'air' : sp > 5.4 ? 'run' : sp > 0.5 ? 'walk' : 'idle');
    me.rig.mesh.visible = !app.cam.first;
    me.update(dt, { footIK: true, wind: null, tagFade: 0 });

    const others = net.sampleOthers(performance.now());
    const ids = new Set([net.id]);
    for (const p of others) {
      ids.add(p.i);
      const c = this.climbers.ensure(p.i, p.n, p.c, false);
      c.apply(p, dt);
      c.setState(p.e || 'idle');
      c.update(dt, { tagFade: 1 });
    }
    this.climbers.prune(ids);

    app.cam.update(dt, mePos, { speed: sp, dist: 3.6 });
    this.field.update(dt);
    if (pred.onGround && sp > 1.2) {
      this.stepT -= dt * sp;
      if (this.stepT <= 0) { this.stepT = 1.6; app.audio.step(sp > 5.5); }
    }
    app.audio.setAmbience(20, sp, false);
    app.stage.dayT = 0.30;
    return mePos;
  }
}

/** Flat ground the airfield simulates against — matches the server exactly. */
export function makeFlatWorld() {
  return {
    seed: 0,
    height: () => 0,
    normal: (x, z, out = { x: 0, y: 1, z: 0 }) => { out.x = 0; out.y = 1; out.z = 0; return out; },
    slope: () => 1,
    routeInfluence: () => 0,
    campfires: [], route: [],
    summitPos: { x: 0, y: 0, z: 0 },
    noise: null,
  };
}
