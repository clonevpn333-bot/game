/* The run itself: mountain, props, climbers, camera and HUD, driven by the
 * authoritative snapshots plus local prediction. */
import * as THREE from '../../../../vendor/three/three.module.js';
import { Terrain } from '../world/terrain.js';
import { Scatter } from '../world/scatter.js';
import { Water } from '../world/water.js';
import { WorldObjects } from '../world/worldobjects.js';
import { ClimberSet } from '../play/climbers.js';
import { Interact } from '../play/interact.js';
import { makePlane, makeHelicopter } from '../world/vehicles.js';
import { PHASE, BIOMES, biomeIndexAt, WORLD } from '../../shared/constants.js';
import { FLAG } from '../../shared/protocol.js';

const _v = new THREE.Vector3();

export class RunScene {
  constructor(app) {
    this.app = app;
    this.world = app.world;
    this.scene = app.stage.scene;
    this.terrain = new Terrain(this.world, this.scene, 2);
    this.scatter = new Scatter(this.world, this.scene);
    this.water = new Water(this.scene);
    this.objects = new WorldObjects(this.scene, this.world);
    this.climbers = new ClimberSet(this.scene, this.world);
    this.interact = new Interact(app.net, this.objects, this.climbers, this.world);
    this.plane = makePlane();
    this.plane.visible = false;
    this.heli = makeHelicopter();
    this.heli.visible = false;
    this.scene.add(this.plane, this.heli);
    this.stepT = 0;
    this.lastBiome = -1;
    this.wind = new THREE.Vector3(2.4, 0, 1.1);
    this.tagFade = 1;
    this.prevOnGround = true;
  }

  prime(pos) {
    this.terrain.prime(pos.x, pos.z);
    this.scatter.primeAll(pos.x, pos.z);
  }

  setVisible(v) {
    this.terrain.group.visible = v;
    this.terrain.far.visible = v;
    this.water.mesh.visible = v;
    this.objects.itemGroup.visible = v;
    this.objects.otherGroup.visible = v;
    this.objects.markGroup.visible = v;
    for (const c of this.objects.camps) { c.group.visible = v; c.fire.group.visible = v && c.lit; }
    for (const [, g] of this.scatter.groups) for (const m of g.meshes) m.visible = v;
  }

  dispose() {
    this.terrain.dispose(); this.scatter.dispose(); this.water.dispose();
    this.objects.dispose(); this.climbers.dispose();
    this.scene.remove(this.plane, this.heli);
  }

  /** One frame of the run. */
  update(dt) {
    const app = this.app;
    const net = app.net;
    const snap = net.latest();
    const phase = net.phase;

    /* ---- local intent ---- */
    const look = app.input.takeLook();
    if (!app.uiBlocking()) app.cam.addLook(look.dx, look.dy);
    const mv = app.uiBlocking() ? { x: 0, y: 0 } : app.input.moveVector();
    const intent = {
      mv, yaw: app.cam.yaw, pitch: app.cam.pitch,
      jump: !app.uiBlocking() && app.input.down('jump'),
      sprint: !app.uiBlocking() && app.input.down('sprint'),
      grab: !app.uiBlocking() && app.input.mouse.left,
      use: false,
    };
    const pred = net.tick(dt, intent);

    /* ---- the local climber ---- */
    const meState = net.meState();
    const inPlane = phase === PHASE.FLIGHT;
    const meId = net.id;
    let mePos;
    if (inPlane && meState) mePos = _v.set(meState.x, meState.y, meState.z);
    else mePos = _v.set(pred.x + net.corr.x, pred.y + net.corr.y, pred.z + net.corr.z);

    const look3 = app.roster.find((p) => p.i === meId);
    const me = this.climbers.ensure(meId, app.name, app.look, true);
    me.apply({ x: mePos.x, y: mePos.y, z: mePos.z, yaw: app.cam.yaw, pitch: app.cam.pitch, f: meState?.f ?? 0 }, dt);
    me.wallNormal = pred.climbing ? this.world.normal(mePos.x, mePos.z) : null;
    me.setState(inPlane ? 'plane' : localAnim(pred, meState, this.interact.carrying));
    me.rig.mesh.visible = !app.cam.first;
    me.update(dt, { footIK: true, wind: this.wind, tagFade: 0 });
    void look3;

    /* ---- everyone else ---- */
    const others = net.sampleOthers(performance.now());
    const ids = new Set([meId]);
    for (const p of others) {
      ids.add(p.i);
      const c = this.climbers.ensure(p.i, p.n, p.c, false);
      c.apply(p, dt);
      c.wallNormal = (p.f & FLAG.CLIMB) ? this.world.normal(p.x, p.z) : null;
      if (c.state !== 'ragdoll') c.setState(p.e || 'idle');
      c.update(dt, { wind: this.wind, tagFade: this.tagFade });
    }
    this.climbers.prune(ids);

    /* ---- camera ---- */
    const speed = Math.hypot(pred.vx, pred.vz);
    app.cam.update(dt, mePos, { speed: pred.chute || !pred.onGround ? speed * 0.5 : speed, dist: pred.climbing ? 2.7 : 3.4 });
    if (pred.impact > 6) {
      app.cam.kick(Math.min(1.1, pred.impact * 0.055));
      app.audio.land(pred.impact);
      if (pred.impact > 13 && me) me.startRagdoll(new THREE.Vector3(pred.vx, -pred.impact, pred.vz));
    }

    /* ---- world streaming ---- */
    this.terrain.update(mePos.x, mePos.z);
    this.scatter.update(mePos.x, mePos.z);
    this.water.update(mePos.x, mePos.z);
    this.objects.sync(snap, mePos);
    this.objects.update(dt);
    this.scatter.setWind(0.6 + Math.min(1.4, mePos.y / 900));

    /* ---- plane and helicopter ---- */
    if (snap?.pl) {
      this.plane.visible = true;
      this.plane.position.set(snap.pl.x, snap.pl.y, snap.pl.z);
      this.plane.rotation.y = snap.pl.yaw;
      this.plane.userData.update?.(dt);
    } else this.plane.visible = false;
    if (snap?.he) {
      this.heli.visible = true;
      this.heli.position.set(snap.he.x, snap.he.y, snap.he.z);
      this.heli.lookAt(this.world.summitPos.x, snap.he.y, this.world.summitPos.z);
      this.heli.userData.update?.(dt, app.stage.time, snap.he.s === 'landed');
      this.interact.helicopter = { state: snap.he.s, position: this.heli.position };
    } else { this.heli.visible = false; this.interact.helicopter = null; }

    /* ---- interaction ---- */
    if (!app.uiBlocking()) {
      const nearest = nearestMate(others, mePos);
      const prompt = this.interact.resolve(mePos, others, phase);
      this.interact.update(dt, app.input, { camera: app.stage.camera, nearestMateId: nearest?.i });
      app.hud.setPrompt(prompt, this.interact.reviveHold / 1.2);
    } else app.hud.setPrompt(null);

    /* ---- HUD ---- */
    app.hud.setVitals(meState, pred);
    app.hud.setAltitude(meState || { y: mePos.y }, others);
    app.hud.setTeam([...(meState ? [meState] : []), ...others], meId);
    app.hud.setBelt(net.inv, net.pack);
    app.hud.setNet(net.status, net.rtt, others.length + 1);
    app.hud.setCrosshair(!app.cam.first ? false : true);

    /* ---- biome banner ---- */
    const bi = biomeIndexAt(mePos.y);
    if (bi !== this.lastBiome && phase === PHASE.CLIMB) {
      if (this.lastBiome >= 0) app.hud.showBanner(BIOMES[bi].name, `${Math.round(mePos.y)} metres`);
      this.lastBiome = bi;
    }

    /* ---- footsteps and wind ---- */
    if (pred.onGround && speed > 1.2 && !pred.climbing) {
      this.stepT -= dt * speed;
      if (this.stepT <= 0) { this.stepT = 1.6; app.audio.step(speed > 5.5); }
    }
    if (pred.climbing && Math.random() < dt * 2.2) app.audio.grip();
    app.audio.setAmbience(mePos.y, speed, !pred.onGround && !pred.climbing);

    /* ---- day cycle: dawn at the beach, dusk near the summit ---- */
    const runT = snap ? Math.min(1, (Date.now() - (app.runStart || Date.now())) / (45 * 60 * 1000)) : 0;
    app.stage.dayT = 0.26 + runT * 0.5 + (mePos.y / WORLD.summit) * 0.08;

    return mePos;
  }
}

function localAnim(pred, meState, carrying) {
  if (meState && (meState.f & FLAG.DEAD)) return 'ghost';
  if (meState && (meState.f & FLAG.DOWNED)) return 'downed';
  if (pred.chute) return 'chute';
  if (!pred.onGround && !pred.climbing && pred.vy < -9) return 'fall';
  if (pred.climbing) return Math.hypot(pred.vx, pred.vz) > 0.15 ? 'climb' : 'hang';
  if (pred.swimming) return 'swim';
  if (!pred.onGround) return 'air';
  const sp = Math.hypot(pred.vx, pred.vz);
  if (carrying) return sp > 0.4 ? 'carrywalk' : 'carryidle';
  if (sp > 5.4) return 'run';
  if (sp > 0.5) return 'walk';
  return pred.exhausted ? 'tired' : 'idle';
}

function nearestMate(others, p) {
  let best = null, bd = 1e9;
  for (const o of others) {
    const d = (o.x - p.x) ** 2 + (o.y - p.y) ** 2 + (o.z - p.z) ** 2;
    if (d < bd) { bd = d; best = o; }
  }
  return bd < 900 ? best : null;
}
