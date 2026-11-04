// A Game is one live floor session: scene, physics, player, enemies, combat resolution,
// style/ratings, scripting (coroutines), water, events, checkpoints.
import * as THREE from 'three';
import { Physics } from '../engine/physics.js';
import { FX, FXColors } from '../engine/fx.js';
import { shaderClock, waterMaterial, setEnvMap } from '../engine/materials.js';
import { Player } from './player.js';
import { ENEMY_TYPES } from './enemies.js';
import { NavGrid } from './nav.js';
import { makeProp, Pickup } from './props.js';
import { UnderwaterAtmosphere } from './underwater.js';
import { Audience } from './audience.js';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _hit = {};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

export class Game {
  constructor(app, floorDef, opts = {}) {
    this.app = app;
    this.renderer = app.renderer;
    this.audio = app.audio;
    this.music = app.music;
    this.input = app.input;
    this.hud = app.hud;
    this.host = app.host;
    this.settings = app.settings;
    this.save = app.save;
    this.floorDef = floorDef;
    this.checkpointId = opts.checkpoint || 0;
    this.modifiers = opts.modifiers || {};
    setEnvMap(this.renderer.envMap);

    this.scene = new THREE.Scene();
    this.scene.environment = this.renderer.envMap;
    this.scene.environmentIntensity = 0.55; // keep IBL for metal reflections without washing out colour
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 700);
    this.physics = new Physics();
    this.physics.waterLevelAt = (x, z) => this.waterLevelAt(x, z);
    this.fx = new FX(this.scene, this.physics, this.renderer.q.particles);
    this.fx.onShellTink = (p, s, shot) => this.audio.play('shell', { pos: p, shot });

    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.props = [];
    this.hazards = [];
    this.grapplePoints = [];
    this.destructibles = [];
    this.fallingDrones = [];
    this.timers = [];
    this.scripts = [];
    this.listeners = {};
    this.dimmables = [];
    this.stats = { kills: 0, shots: 0, hits: 0, headshots: 0, damageTaken: 0, time: 0, style: 0, bestCombo: 0, envKills: 0, deaths: opts.deaths || 0 };
    this.combo = { count: 0, t: 0 };
    this.score = 0;
    this.hype = 0.45;
    this.boredT = 0;
    this.time = 0;
    this.timeScale = 1;
    this.slowT = 0;
    this.hitStopT = 0;
    this.lightsOut = 0;
    this.lightsOutTarget = 0;
    this.ice = false;
    this.gravityScalePlayer = 1;
    this.gravityScaleEnemies = 1;
    this.enemySpeedMult = 1;
    this.cinematic = false;
    this.camOverride = null;
    this.paused = false;
    this.ended = false;
    this.water = null;
    this.objective = { text: '', sub: '' };
    this.lastKillT = -10;
    this.multiKill = 0;
    this.difficultyDamage = this.settings.difficulty === 'easy' ? 0.6 : this.settings.difficulty === 'hard' ? 1.35 : 1;

    this.audience = new Audience(this);
    this.host.attach(this);

    // build the floor
    this.floor = floorDef.build(this, { checkpoint: this.checkpointId });
    this.scene.fog = this.scene.fog || new THREE.FogExp2(0x0a0c12, 0.012);

    // player
    const sv = app.save.data;
    this.player = new Player(this, {
      look: sv.look,
      loadout: { guns: (opts.loadout || sv.loadout.guns).filter((g) => sv.unlocked.weapons.includes(g)), melee: sv.loadout.melee },
      doubleJump: sv.unlocked.abilities.includes('doubleJump') || this.floor.forceDoubleJump,
      mods: Object.fromEntries((sv.loadout.mods || []).map((m) => [m, true])),
    });
    if (this.player.arsenal.slots.length === 0) { this.player.arsenal.addWeapon('revolver'); }
    const sp = this.floor.checkpoints?.[this.checkpointId] || this.floor.spawn;
    this.player.spawn(new THREE.Vector3(...sp.pos), sp.yaw || 0);
    this.player.updateCamera(1 / 60);

    // camera-relative fill: the third-person camera mostly sees the contestant's back, so a soft
    // light from over the camera's shoulder keeps the visible side of every model lit and readable
    this.camFill = new THREE.DirectionalLight(this.floor.camFill?.color || '#fff1e0', this.floor.camFill?.intensity ?? 1.1);
    this.scene.add(this.camFill, this.camFill.target);
    this.dim(this.camFill, 0.8);

    // nav
    if (this.floor.nav) this.nav = new NavGrid(this.physics, this.floor.nav);

    if (floorDef.script) this.runScript(floorDef.script(this, this.checkpointId));
    this.hud.reset(this);
    this.renderer.fx.uUnderwater.value = 0;
    this.renderer.fx.uLetterbox.value = 0;
    this.renderer.fx.uDamage.value = 0;
  }

  // -------------------------------------------------------------- events
  on(name, fn) { (this.listeners[name] ||= []).push(fn); }
  emit(name, data) {
    const L = this.listeners[name];
    if (L) for (const fn of L) fn(data);
    this.host.onEvent(name, data);
    this.audience.onEvent(name, data);
    this.app.chat?.onEvent(name, data, this);
  }
  later(t, fn) { this.timers.push({ t, fn }); }
  runScript(gen) { if (gen) this.scripts.push({ gen, wait: 0, until: null }); }
  _tickScripts(dt) {
    for (let i = this.scripts.length - 1; i >= 0; i--) {
      const s = this.scripts[i];
      if (s.wait > 0) { s.wait -= dt; continue; }
      if (s.until && !s.until()) continue;
      s.until = null;
      let r;
      try { r = s.gen.next(); } catch (e) { console.error('script error', e); this.scripts.splice(i, 1); continue; }
      if (r.done) { this.scripts.splice(i, 1); continue; }
      if (typeof r.value === 'number') s.wait = r.value;
      else if (typeof r.value === 'function') s.until = r.value;
    }
  }

  // -------------------------------------------------------------- world helpers
  say(who, text, o) { this.host.say(who, text, o); }
  setObjective(text, sub = '') { this.objective = { text, sub }; this.hud.setObjective(text, sub); }
  checkpoint(id) {
    if (id <= this.checkpointId) return;
    this.checkpointId = id;
    this.hud.toast('CHECKPOINT', 'checkpoint');
    this.audio.play('pickup');
  }
  addKeyLight(color = 0xffffff, intensity = 2.5, dir = [0.4, 1, 0.3], shadowRange = 38) {
    const L = new THREE.DirectionalLight(color, intensity);
    L.position.set(dir[0], dir[1], dir[2]).multiplyScalar(40);
    L.castShadow = this.renderer.q.shadows;
    L.shadow.mapSize.set(this.renderer.q.shadowSize, this.renderer.q.shadowSize);
    const c = L.shadow.camera;
    c.left = -shadowRange; c.right = shadowRange; c.top = shadowRange; c.bottom = -shadowRange; c.near = 1; c.far = 140;
    L.shadow.bias = -0.0004;
    L.shadow.normalBias = 0.03;
    L.userData.dir = new THREE.Vector3(...dir).normalize();
    this.scene.add(L, L.target);
    this.keyLight = L;
    this.dim(L);
    return L;
  }
  dim(light, factor = 0.92) { this.dimmables.push({ light, base: light.intensity, factor }); return light; }
  addCollider(o) { return this.physics.addBox(o); }
  addHazard(h) { this.hazards.push(h); return h; }
  addGrapplePoint(pos, o = {}) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 8, 24), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#25f4ff', emissiveIntensity: 2.5 }));
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveIntensity: 2 }));
    const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.6, 8), new THREE.MeshStandardMaterial({ color: '#2a2e36', metalness: 0.8, roughness: 0.4 }));
    mount.position.y = 0.55;
    g.add(ring, core, mount);
    g.position.copy(pos);
    (o.parent || this.scene).add(g);
    const gp = { obj: g, ring, pos: new THREE.Vector3().copy(pos), collider: o.collider || null, parent: o.parent || null, enabled: true };
    this.grapplePoints.push(gp);
    return gp;
  }
  addProp(kind, pos, o) { return makeProp(this, kind, pos instanceof THREE.Vector3 ? pos : new THREE.Vector3(...pos), o); }
  addPickup(kind, pos, o) { const p = new Pickup(this, kind, pos, o); this.pickups.push(p); return p; }
  spawnEnemy(type, pos, o = {}) {
    const C = ENEMY_TYPES[type] || o.cls;
    const e = new C(this, pos instanceof THREE.Vector3 ? pos : new THREE.Vector3(...pos), o);
    this.enemies.push(e);
    if (!o.silent) {
      this.fx.ring(_v.copy(e.pos).setY(e.pos.y + 0.05), 0.2, 2.2, 0.5, 0xff2d6f);
      this.fx.burst(_v.copy(e.pos).setY(e.pos.y + 1), 14, FXColors.pink, FXColors.pinkEnd, 3, 0.4, 0.5);
      this.audio.play('spawnHatch', { pos: e.pos });
    }
    return e;
  }
  aliveEnemies(filter) { let n = 0; for (const e of this.enemies) if (e.alive && (!filter || filter(e))) n++; return n; }

  // -------------------------------------------------------------- water
  setWater(o) {
    if (!this.water) {
      const w = (o.maxX - o.minX), d = (o.maxZ - o.minZ);
      const geo = new THREE.PlaneGeometry(w, d, Math.min(120, Math.ceil(w / 1.5)), Math.min(120, Math.ceil(d / 1.5)));
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, waterMaterial(o));
      mesh.position.set((o.minX + o.maxX) / 2, o.level, (o.minZ + o.maxZ) / 2);
      mesh.renderOrder = 5;
      this.scene.add(mesh);
      // underside so it reads from below
      this.water = { ...o, mesh, level: o.level, target: o.level, speed: 0 };
    }
    Object.assign(this.water, o);
    this.water.mesh.visible = this.water.level > -50;
    return this.water;
  }
  floodTo(target, speed) { if (!this.water) return; this.water.target = target; this.water.speed = speed; }
  waterLevelAt(x, z) {
    const w = this.water;
    if (!w || w.level < -50) return -Infinity;
    if (x < w.minX || x > w.maxX || z < w.minZ || z > w.maxZ) return -Infinity;
    return w.level;
  }

  // -------------------------------------------------------------- combat: queries
  raycastEnemies(origin, dir, maxDist, minDist = 0, all = null) {
    let best = null, bestT = maxDist;
    for (const e of this.enemies) {
      if (!e.alive || e.spawnT > 0.3) continue;
      // coarse
      const c = e.center(_v);
      const R = Math.max(e.height, e.radius * 2) * 0.9 + 1.2;
      _v2.subVectors(origin, c);
      const b = _v2.dot(dir), cc = _v2.lengthSq() - R * R;
      if (b * b - cc < 0) continue;
      for (const h of e.hitSpheres) {
        if (h.tag === 'shield' && !(e.shieldActive && e.shieldActive())) continue;
        const sc = e.sphereWorld(h, _v3);
        _v2.subVectors(origin, sc);
        const bb = _v2.dot(dir), c2 = _v2.lengthSq() - h.r * h.r;
        const disc = bb * bb - c2;
        if (disc < 0) continue;
        const sq = Math.sqrt(disc);
        let t = -bb - sq;
        if (t < minDist) t = -bb + sq;
        if (t < minDist) continue;
        if (all && t < maxDist) all.push({ enemy: e, dist: t, sphere: h });
        // prefer shield if hit nearly simultaneously
        if (t < bestT || (best && best.enemy === e && h.tag === 'shield' && t < bestT + 0.4)) {
          bestT = t;
          best = { enemy: e, dist: t, sphere: h, point: new THREE.Vector3().copy(origin).addScaledVector(dir, t) };
        }
      }
    }
    return best;
  }
  raycastProps(origin, dir, maxDist) {
    let best = null, bestT = maxDist;
    for (const p of this.props) {
      if (!p.alive) continue;
      _v2.subVectors(origin, p.body.pos);
      const b = _v2.dot(dir), c = _v2.lengthSq() - p.r * p.r;
      const disc = b * b - c;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t > 0 && t < bestT) { bestT = t; best = { prop: p, dist: t, point: new THREE.Vector3().copy(origin).addScaledVector(dir, t) }; }
    }
    return best;
  }

  // Hitscan shot with impacts, damage, tracers.
  shoot(origin, dir, o) {
    const range = o.range || 100;
    const wr = this.physics.raycast(origin, dir, range, {}, (c) => c.blocksBullets && c.tag !== 'trigger');
    let endDist = wr.hit ? wr.dist : range;
    let result = null;
    // pierce collects all enemies on the line
    if (o.pierce) {
      const hits = [];
      this.raycastEnemies(origin, dir, endDist, 0, hits);
      hits.sort((a, b) => a.dist - b.dist);
      const done = new Set();
      for (const h of hits) {
        if (done.has(h.enemy)) continue;
        done.add(h.enemy);
        if (h.sphere.tag === 'shield') { h.enemy.hitShield(o.damage, { weapon: o.weapon, point: origin.clone().addScaledVector(dir, h.dist), dir }); continue; }
        this._hitEnemy(h.enemy, h.sphere, origin.clone().addScaledVector(dir, h.dist), dir, o, h.dist);
        result = { enemy: h.enemy };
      }
      const pr = this.raycastProps(origin, dir, endDist);
      if (pr) this._hitProp(pr.prop, pr.point, dir, o);
    } else {
      const er = this.raycastEnemies(origin, dir, endDist);
      const pr = this.raycastProps(origin, dir, er ? er.dist : endDist);
      if (pr) {
        endDist = pr.dist;
        this._hitProp(pr.prop, pr.point, dir, o);
        result = { prop: pr.prop, point: pr.point };
      } else if (er) {
        endDist = er.dist;
        if (er.sphere.tag === 'shield' && er.enemy.hitShield(o.damage, { weapon: o.weapon, point: er.point, dir })) {
          result = { blocked: true, point: er.point };
        } else {
          this._hitEnemy(er.enemy, er.sphere, er.point, dir, o, er.dist);
          result = { enemy: er.enemy, point: er.point };
        }
      }
    }
    const end = new THREE.Vector3().copy(origin).addScaledVector(dir, endDist);
    if (wr.hit && (!result || o.pierce) && endDist >= wr.dist - 0.01) {
      // world impact
      this.fx.sparks(wr.point, o.quietImpact ? 3 : 7, wr.normal, 7);
      this.fx.decal(wr.point, wr.normal, o.weapon === 'rail' ? 0.6 : o.weapon === 'shotgun' ? 0.15 : 0.22);
      if (!o.quietImpact) {
        this.fx.smokePuff(wr.point, 1, 0.35, 0.6, FXColors.dust, 0.5);
        this.audio.play(wr.collider.surface === 'glass' ? 'glassCrack' : 'impactMetal', { pos: wr.point, vol: 0.6 });
      }
      const ow = wr.collider.owner;
      if (ow && ow.onShot) ow.onShot(o.damage, { point: wr.point, dir, weapon: o.weapon, normal: wr.normal });
    }
    if (o.tracer !== undefined && o.tracer !== null) {
      this.fx.tracer(origin, end, o.tracer, o.tracerWidth || 0.025, o.weapon === 'rail' ? 0.35 : 0.09);
      if (o.weapon === 'rail') {
        for (let i = 0; i < endDist; i += 0.8) this.fx.trail(_v.copy(origin).addScaledVector(dir, i), FXColors.cyan, 0.35, 0.5);
      }
    }
    return result;
  }
  _hitEnemy(e, sphere, point, dir, o, dist) {
    let dmg = o.damage;
    if (o.falloff && dist > o.falloff) dmg *= clamp(1 - (dist - o.falloff) / (o.falloff * 1.5), 0.25, 1);
    const head = sphere.tag === 'head' || sphere.tag === 'weak';
    const mult = sphere.tag === 'head' ? Math.max(sphere.mult, o.head || 1) : sphere.mult;
    const wasAlive = e.alive;
    const hpBefore = e.hp;
    const dealt = e.takeDamage(dmg, { dir, point, knock: o.knock, stagger: o.weapon === 'revolver' || o.weapon === 'rail' || (o.weapon === 'shotgun' && !o.quietImpact), weapon: o.weapon, tag: sphere.tag, mult, source: o.source, dist });
    if (dealt > 0) {
      this.stats.hits++;
      this.fx.sparks(point, o.weapon === 'shotgun' ? 7 : 12, dir.clone().negate(), 10);
      this.fx.electric(point, 3, 0.2);
      this.audio.play('robotHit', { pos: point });
      if (o.source === 'player') {
        this.hud.hitmarker(head, !e.alive && wasAlive);
        this.audio.play(head ? 'headshot' : 'hitmarker');
        if (this.settings.damageNumbers) this.hud.damageNumber(point, Math.round(dealt), head);
        if (head) this.stats.headshots++;
      }
    } else if (e.alive && o.source === 'player') this.hud.hitmarker(false, false, true);
    if (!e.alive && wasAlive) { e._killInfo = { head, weapon: o.weapon, dist }; }
    // impact ring: a crisp read of every landed shot (rate-limited for shotgun pellets)
    if (e.hp < hpBefore && o.source === 'player' && !o.quietImpact && this.time - (this.lastImpactVisual ?? -1) > 0.025) {
      this.lastImpactVisual = this.time;
      this.fx.ring(point, 0.045, 0.28, 0.13, sphere.tag === 'head' ? 0xffe000 : 0x8ff4ff, dir);
    }
  }
  _hitProp(p, point, dir, o) {
    p.body.vel.addScaledVector(dir, (o.knock || 4) * 0.6 / p.body.mass);
    p.body.spin.set(rand(-6, 6), rand(-6, 6), rand(-6, 6));
    p.body.sleep = 0;
    this.fx.sparks(point, 5, dir.clone().negate(), 5);
    this.audio.play(p.kind === 'barrel' ? 'impactMetal' : 'impactSoft', { pos: point });
    this.damageProp(p, o.damage, { dir, point });
    if (o.source === 'player') this.hud.hitmarker(false, false);
  }
  damageProp(p, dmg, info = {}) {
    if (!p.alive) return;
    p.hp -= dmg;
    if (p.explosive && p.hp > 0 && p.hp < p.maxHp * 0.99 && !p.fuse) {
      // leaking + burning: blows after a short fuse
      p.fuse = 0.9;
    }
    if (p.hp <= 0) this.destroyProp(p, info);
  }
  destroyProp(p, info = {}) {
    if (!p.alive) return;
    p.alive = false;
    this.physics.removeBody(p.body);
    this.scene.remove(p.mesh);
    const pos = p.body.pos.clone();
    if (p.explosive) {
      this.later(0.05, () => this.explode(pos, 1.2, 75, { source: info.source === 'player' ? 'player' : 'env', type: 'explosion', barrel: true }));
    } else {
      this.fx.spawnDebris(pos, 8, 6);
      this.fx.dust(pos, 6, 0.8);
      this.audio.play('impactSoft', { pos, vol: 1 });
      if (Math.random() < 0.3) this.addPickup(Math.random() < 0.5 ? 'ammo' : 'health', pos);
    }
    if (p.onDestroy) p.onDestroy(p);
    this.emit('propDestroyed', p);
  }
  explode(pos, scale = 1, damage = 70, o = {}) {
    this.fx.explosion(pos, scale);
    this.audio.play('explosion', { pos, big: scale });
    const d = this.player.pos.distanceTo(pos);
    this.player.shake(clamp(1.2 - d / 25, 0, 0.9) * scale);
    if (d < 20) this.renderer.kick(0.4 * scale);
    this.damageRadius(pos, 5.5 * scale, damage, 18 * scale, { ...o, type: 'explosion' });
    this.emit('explosion', { pos, scale, ...o });
  }
  damageRadius(pos, r, damage, force, o = {}) {
    for (const d of this.destructibles) {
      if (!d.alive) continue;
      const dist = d.pos.distanceTo(pos);
      if (dist < r + (d.radius || 1)) d.onShot(damage * (1 - Math.min(1, dist / (r + 2)) * 0.5), { point: pos.clone(), type: 'explosion', weapon: o.weapon || 'explosion' });
    }
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const c = e.center(_v);
      const d = c.distanceTo(pos);
      if (d > r + e.radius) continue;
      const k = 1 - clamp(d / (r + e.radius), 0, 1) * 0.6;
      const dir = _v2.subVectors(c, pos).normalize(); dir.y = Math.max(dir.y, 0.5); dir.normalize();
      const wasAlive = e.alive;
      e.takeDamage(damage * k, { dir: dir.clone(), knock: force * k, type: o.type || 'explosion', env: o.source !== 'player' || o.barrel, barrel: o.barrel, weapon: o.weapon || (o.barrel ? 'barrel' : 'explosion'), source: o.source });
      if (!e.alive && wasAlive) e._killInfo = { env: o.source !== 'player' || o.barrel, weapon: o.barrel ? 'barrel' : o.weapon };
      e.thrown = Math.max(e.thrown, 0.6);
    }
    for (const p of this.props) {
      if (!p.alive) continue;
      const d = p.body.pos.distanceTo(pos);
      if (d > r) continue;
      const k = 1 - d / r;
      const dir = _v2.subVectors(p.body.pos, pos).normalize(); dir.y += 0.6;
      p.body.vel.addScaledVector(dir, force * k * 1.2 / Math.sqrt(p.body.mass));
      p.body.spin.set(rand(-10, 10), rand(-10, 10), rand(-10, 10));
      p.body.sleep = 0;
      if (o.type === 'explosion') this.damageProp(p, damage * k * (p.explosive ? 0.6 : 1), { source: o.source });
    }
    const pl = this.player;
    const d = pl.pos.distanceTo(pos);
    if (d < r && o.source !== 'playerSafe') {
      const k = 1 - d / r;
      const dir = _v2.subVectors(pl.pos, pos).normalize(); dir.y = Math.max(0.6, dir.y);
      const self = o.source === 'player';
      pl.damage(damage * k * (self ? 0.25 : 0.45), { from: pos, type: 'explosion', knock: dir.clone().multiplyScalar(force * k * (self ? 1.1 : 0.8)) });
      if (self && pl.iframes <= 0) { pl.vel.addScaledVector(dir, force * k * 0.5); pl.grounded = false; }
    }
  }
  shockwave(pos, r, force, source) {
    for (const e of this.enemies) {
      if (!e.alive || e === source) continue;
      const d = e.pos.distanceTo(pos);
      if (d > r) continue;
      const dir = _v.subVectors(e.pos, pos).setY(0).normalize();
      e.knock.addScaledVector(dir, force * (1 - d / r) / (e.heavy ? 4 : 1));
      e.knock.y += force * 0.5 * (1 - d / r) / (e.heavy ? 4 : 1);
      if (source && !source.isPlayer) e.takeDamage(10, { type: 'shockwave', env: true, dir });
    }
    for (const p of this.props) {
      if (!p.alive) continue;
      const d = p.body.pos.distanceTo(pos);
      if (d > r) continue;
      const dir = _v.subVectors(p.body.pos, pos).normalize();
      p.body.vel.addScaledVector(dir, force * (1 - d / r)); p.body.vel.y += force * 0.5;
      p.body.sleep = 0;
    }
  }
  smashAround(pos, r, dir, force) {
    for (const p of this.props) {
      if (!p.alive) continue;
      const d = p.body.pos.distanceTo(pos);
      if (d > r + p.r) continue;
      const push = _v.subVectors(p.body.pos, pos).normalize();
      p.body.vel.addScaledVector(push, force).y += force * 0.4;
      p.body.spin.set(rand(-8, 8), rand(-8, 8), rand(-8, 8));
      p.body.sleep = 0;
      if (Math.random() < 0.5) this.damageProp(p, 15, {});
    }
  }
  stompDamage(pos, r, dmg) {
    for (const e of this.enemies) {
      if (!e.alive || e.flying) continue;
      if (e.pos.distanceTo(pos) < r + e.radius) {
        const wasAlive = e.alive;
        e.takeDamage(dmg, { type: 'stomp', dir: new THREE.Vector3(0, 1, 0), knock: 10, weapon: 'stomp', source: 'player' });
        if (!e.alive && wasAlive) e._killInfo = { weapon: 'stomp' };
      }
    }
  }
  groundPound(pos, player) {
    this.fx.ring(_v.copy(pos).setY(pos.y + 0.1), 0.5, 8, 0.45, 0xffd400);
    this.fx.ring(_v.copy(pos).setY(pos.y + 0.1), 0.3, 5, 0.35, 0x8ff6ff);
    this.fx.dust(pos, 20, 1.6);
    this.fx.electric(_v.copy(pos).setY(pos.y + 0.5), 20, 2);
    this.audio.play('hammer', { pos });
    this.audio.play('pressSlam', { pos });
    player.shake(0.6);
    this.renderer.kick(0.8);
    this.hitStop(0.08);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = e.pos.distanceTo(pos);
      if (d > 7) continue;
      const dir = _v.subVectors(e.pos, pos).setY(0).normalize().setY(0.9).normalize();
      const wasAlive = e.alive;
      e.takeDamage(110 * (1 - d / 9) * player.damageMult(), { type: 'melee', weapon: 'hammer', dir: dir.clone(), knock: 16, source: 'player', stagger: true, pound: true });
      if (!e.alive && wasAlive) e._killInfo = { weapon: 'hammer', pound: true };
    }
    this.shockwave(pos, 7, 14, player);
    this.emit('groundPound');
  }
  meleeStrike(player, o) {
    const fwd = _v3.set(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    const origin = _v.copy(player.pos).setY(player.pos.y + 1.1);
    let hits = 0;
    const range = o.range * (player.giant > 0 ? 1.8 : 1);
    for (const e of this.enemies) {
      if (!e.alive || e.spawnT > 0.3) continue;
      const c = e.center(_v2);
      const to = c.sub(origin);
      const dy = to.y; to.y = 0;
      const d = to.length();
      if (d > range + e.radius || Math.abs(dy) > 2.2 + e.height * 0.5) continue;
      if (d > 0.01 && to.normalize().dot(fwd) < Math.cos(o.arc)) continue;
      const dir = to.clone().setY(o.weapon === 'hammer' ? 0.6 : 0.25).normalize();
      // shield bots: frontal melee hits break the shield
      if (e.shieldActive && e.shieldActive()) {
        const ef = _v2.set(Math.sin(e.yaw), 0, Math.cos(e.yaw));
        if (ef.dot(dir) < -0.3) { e.hitShield(o.damage, { weapon: o.weapon, point: e.center(new THREE.Vector3()), dir }); hits++; continue; }
      }
      const wasAlive = e.alive;
      e.takeDamage(o.damage, { dir, knock: o.weapon === 'hammer' ? 18 : 9, weapon: o.weapon, type: 'melee', source: 'player', stagger: true, point: e.center(new THREE.Vector3()) });
      if (!e.alive && wasAlive) e._killInfo = { weapon: o.weapon, melee: true };
      this.fx.sparks(e.center(_v2), 22, dir, 12, o.weapon === 'blades' ? FXColors.pink : FXColors.spark, o.weapon === 'blades' ? FXColors.pinkEnd : FXColors.sparkEnd);
      hits++;
    }
    for (const p of this.props) {
      if (!p.alive) continue;
      const to = _v2.subVectors(p.body.pos, origin); to.y = 0;
      if (to.length() > range + p.r) continue;
      if (to.normalize().dot(fwd) < Math.cos(o.arc)) continue;
      p.body.vel.addScaledVector(to, 12 / p.body.mass).y += 5;
      p.body.spin.set(rand(-10, 10), rand(-10, 10), rand(-10, 10));
      p.body.sleep = 0; p.thrown = true;
      this.damageProp(p, o.damage * 0.5, { source: 'player' });
      hits++;
    }
    // reflect enemy projectiles with blades
    if (o.weapon === 'blades' || o.weapon === 'hammer') {
      for (const pr of this.projectiles) {
        if (pr.owner === 'player') continue;
        const to = _v2.subVectors(pr.pos, origin);
        if (to.length() > range + 1.2) continue;
        pr.owner = 'player';
        pr.damage *= 4;
        const dir = _v.subVectors(player.aimTarget, pr.pos).normalize();
        pr.vel.copy(dir).multiplyScalar(pr.vel.length() * 1.6);
        pr.mesh.material.color.set(0x8ff6ff);
        this.audio.play('bladeHit', { pos: pr.pos });
        this.emit('reflect');
        hits++;
      }
    }
    // hammer: AoE electric burst in front
    if (o.weapon === 'hammer') {
      const at = _v2.copy(player.pos).addScaledVector(fwd, 2);
      this.fx.ring(_v.copy(at).setY(player.pos.y + 0.1), 0.3, o.aoe, 0.35, 0xffd400);
      this.fx.electric(at.setY(player.pos.y + 0.5), 14, 1.5);
      this.audio.play('hammer', { pos: at });
      player.shake(0.35);
      this.renderer.kick(0.4);
    }
    // destructible world objects in front
    const wr = this.physics.raycast(origin, fwd, range, _hit, (c) => c.owner && c.owner.onShot);
    if (wr.hit) { wr.collider.owner.onShot(o.damage * 1.5, { point: wr.point, dir: fwd.clone(), weapon: o.weapon, melee: true }); hits++; }
    if (hits) {
      this.audio.play(o.weapon === 'hammer' ? 'hammer' : 'bladeHit', { pos: player.pos });
      this.hitStop(o.weapon === 'hammer' ? 0.075 : 0.04);
      player.shake(o.weapon === 'hammer' ? 0.38 : 0.2);
      this.hud.hitmarker(false, false);
    }
    return hits;
  }
  findMeleeTarget(pos, fwd, range) {
    let best = null, bd = range;
    const f = _v3.set(fwd.x, 0, fwd.z).normalize();
    for (const e of this.enemies) {
      if (!e.alive || e.spawnT > 0.3) continue;
      const to = _v.subVectors(e.pos, pos); const dy = to.y; to.y = 0;
      const d = to.length();
      if (d > bd || Math.abs(dy) > 3) continue;
      if (to.normalize().dot(f) < 0.5) continue;
      best = e; bd = d;
    }
    return best;
  }
  findGrapplePoint(camPos, fwd, range) {
    let best = null, bestScore = 0.16;
    for (const g of this.grapplePoints) {
      if (!g.enabled) continue;
      const p = g.obj.getWorldPosition(_v);
      const to = _v2.subVectors(p, camPos);
      const d = to.length();
      if (d > range || d < 3) continue;
      const ang = Math.acos(clamp(to.divideScalar(d).dot(fwd), -1, 1));
      const score = ang - 0.0 * d;
      if (score < bestScore && this.physics.lineOfSight(_v3.copy(camPos).addScaledVector(fwd, 2), _v.copy(p).addScaledVector(to, -0.8))) {
        bestScore = score; best = { pos: p.clone(), collider: g.collider, gp: g };
      }
    }
    return best;
  }
  findGrabTarget(camPos, fwd, range) {
    let best = null, bestScore = Infinity;
    const consider = (obj, pos, r) => {
      const to = _v.subVectors(pos, camPos);
      const t = to.dot(fwd);
      if (t < this.player.camDistActual + 0.5 || t > range + this.player.camDistActual) return;
      const perp = _v2.copy(camPos).addScaledVector(fwd, t).distanceTo(pos);
      if (perp > r + 1.4) return;
      const score = perp + t * 0.05;
      if (score < bestScore && this.physics.lineOfSight(_v3.copy(camPos).addScaledVector(fwd, this.player.camDistActual), pos)) { bestScore = score; best = obj; }
    };
    for (const e of this.enemies) if (e.alive && !e.heavy && e.spawnT <= 0) consider(e, e.center(new THREE.Vector3()), e.radius);
    for (const p of this.props) if (p.alive) consider(p, p.body.pos, p.r);
    return best;
  }
  grab(t, on) {
    if (t.body) { t.body.grabbed = on; if (!on) t.body.sleep = 0; }
    else { t.grabbed = on; if (on) { t.stagger = 1; } }
  }
  holdGrabbed(t, holdPos, dt) {
    if (t.body) {
      if (!t.alive) return false;
      t.body.pos.lerp(holdPos, 1 - Math.exp(-12 * dt));
      t.body.vel.set(0, 0, 0);
      t.mesh.position.copy(t.body.pos);
      t.mesh.rotation.y += dt * 3; t.mesh.rotation.x += dt * 2;
    } else {
      if (!t.alive) return false;
      const target = _v.copy(holdPos).setY(holdPos.y - t.height * 0.5);
      t.pos.lerp(target, 1 - Math.exp(-10 * dt));
      t.vel.set(0, 0, 0); t.knock.set(0, 0, 0);
      t.stagger = 0.5;
      t.root.rotation.x = Math.sin(this.time * 6) * 0.3;
    }
    if (Math.random() < 0.5) this.fx.electric(t.body ? t.body.pos : t.center(_v2), 2, 0.6);
    return true;
  }
  launchGrabbed(t, dir, speed) {
    if (t.body) {
      t.body.grabbed = false;
      t.body.vel.copy(dir).multiplyScalar(speed);
      t.body.spin.set(rand(-12, 12), rand(-12, 12), rand(-12, 12));
      t.body.sleep = 0;
      t.thrown = true;
      t.thrownT = 2.5;
    } else {
      t.grabbed = false;
      t.root.rotation.x = 0;
      t.knock.copy(dir).multiplyScalar(speed * (t.flying ? 0.8 : 1));
      t.vel.set(0, 0, 0);
      t.thrown = 2;
      t.thrownBy = 'player';
      if (t.flying && t.type === 'drone') t.takeDamage(20, { type: 'impact', dir: dir.clone() });
    }
    this.emit('launch', t);
  }
  gravityBlast(origin, fwd, range, force, dmg) {
    this.fx.ring(origin, 0.2, 4, 0.3, 0xa050ff, fwd);
    this.fx.burst(origin, 26, [1.2, 0.5, 2.0, 1], [0.5, 0.2, 1, 0], 10, 0.4, 0.4);
    for (let i = 0; i < 20; i++) this.fx.trail(_v.copy(origin).addScaledVector(fwd, i * 0.6).add(_v2.set(rand(-0.4, 0.4) * i * 0.1, rand(-0.4, 0.4) * i * 0.1, 0)), [1.2, 0.5, 2.0, 1], 0.4, 0.3);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const to = _v.subVectors(e.center(_v2), origin);
      const d = to.length();
      if (d > range || to.normalize().dot(fwd) < 0.6) continue;
      const k = 1 - d / range * 0.5;
      const dir = fwd.clone().add(_v2.set(0, 0.35, 0)).normalize();
      const wasAlive = e.alive;
      if (e.shieldActive && e.shieldActive()) { e.shieldDown = 3; e.shield.visible = false; e.stagger = 1; this.audio.play('zap', { pos: e.pos }); }
      e.takeDamage(dmg * k, { dir, knock: force * k * (e.heavy ? 0.6 : 1), weapon: 'gravity', type: 'gravity', source: 'player', stagger: true });
      if (!e.alive && wasAlive) e._killInfo = { weapon: 'gravity' };
      e.thrown = 1.5;
    }
    for (const p of this.props) {
      if (!p.alive) continue;
      const to = _v.subVectors(p.body.pos, origin);
      const d = to.length();
      if (d > range || to.normalize().dot(fwd) < 0.55) continue;
      p.body.vel.addScaledVector(fwd, force * (1 - d / range * 0.5) / Math.sqrt(p.body.mass)).y += 6;
      p.body.spin.set(rand(-12, 12), rand(-12, 12), rand(-12, 12));
      p.body.sleep = 0; p.thrown = true; p.thrownT = 2;
    }
    for (const d of this.destructibles) {
      if (!d.alive) continue;
      const to = _v.subVectors(d.pos, origin);
      const dist = to.length();
      if (dist < range && to.normalize().dot(fwd) > 0.6) d.onShot(dmg * 2.5, { point: d.pos.clone(), weapon: 'gravity' });
    }
    for (const pr of this.projectiles) {
      if (pr.owner === 'player') continue;
      const to = _v.subVectors(pr.pos, origin);
      if (to.length() < range * 0.6 && to.normalize().dot(fwd) > 0.5) { pr.owner = 'player'; pr.vel.copy(fwd).multiplyScalar(30); pr.damage *= 3; }
    }
  }
  // chain lightning: jumps from the struck robot to the nearest others, drawing a jagged arc each hop
  chainArc(first, damage, hops = 3, range = 8) {
    const hit = new Set([first]);
    let from = first;
    for (let h = 0; h < hops; h++) {
      const a = from.center(new THREE.Vector3());
      let best = null, bd = range;
      for (const e of this.enemies) { if (!e.alive || hit.has(e)) continue; const d = e.center(_v).distanceTo(a); if (d < bd) { bd = d; best = e; } }
      if (!best) break;
      hit.add(best);
      const b = best.center(new THREE.Vector3());
      let p0 = a.clone();
      for (let i = 1; i <= 4; i++) {
        const p1 = a.clone().lerp(b, i / 4);
        if (i < 4) p1.add(new THREE.Vector3(rand(-0.4, 0.4), rand(-0.4, 0.4), rand(-0.4, 0.4)));
        this.fx.tracer(p0, p1, 0x9fd8ff, 0.035, 0.14); p0 = p1;
      }
      const wasAlive = best.alive;
      best.takeDamage(damage * Math.pow(0.8, h), { dir: b.clone().sub(a).normalize(), knock: 3, weapon: 'arc', source: 'player', stagger: true, point: b });
      if (!best.alive && wasAlive) best._killInfo = { weapon: 'arc' };
      this.fx.electric(b, 10, 0.6);
      this.audio.play('zap', { pos: b });
      from = best;
    }
    return hit.size - 1;
  }
  yankEnemy(e, player) {
    const to = _v.subVectors(player.pos, e.pos);
    const d = to.length();
    to.normalize();
    const sp = Math.min(26, d * 2.2);
    e.knock.copy(to).multiplyScalar(sp);
    if (!e.flying) e.knock.y = 7;
    e.stagger = 1.0;
    e.thrown = 0.4;
    e.takeDamage(8, { type: 'chain', source: 'player', weapon: 'chain' });
    this.audio.play('grappleHit', { pos: e.pos });
    this.fx.electric(e.center(_v2), 10, 0.6);
  }

  // -------------------------------------------------------------- projectiles
  spawnProjectile(o) {
    const geo = this._projGeo || (this._projGeo = new THREE.SphereGeometry(1, 10, 8));
    this._projMats = this._projMats || {};
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: o.color || 0xff2d6f })); // per-bolt (reflections recolor it)
    mesh.scale.setScalar(o.radius || 0.2);
    const halo = new THREE.Sprite(this._projHalo || (this._projHalo = new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, map: this.fx.glow.mat.uniforms.uTex.value })));
    halo.scale.setScalar(4);
    mesh.add(halo);
    mesh.position.copy(o.pos);
    this.scene.add(mesh);
    const p = { pos: new THREE.Vector3().copy(o.pos), vel: new THREE.Vector3().copy(o.vel), damage: o.damage, r: o.radius || 0.2, owner: o.owner, life: o.life || 4, mesh, color: o.color, gravity: o.gravity || 0, explode: o.explode, weapon: o.weapon };
    this.projectiles.push(p);
    return p;
  }
  _updateProjectiles(dt) {
    const pl = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      const step = p.vel.length() * dt;
      const dir = _v.copy(p.vel).normalize();
      let dead = p.life <= 0;
      const wr = this.physics.raycast(p.pos, dir, step + p.r, _hit, (c) => c.blocksBullets && c.tag !== 'trigger');
      if (!dead && p.owner !== 'player') {
        // player capsule
        const a = _v2.copy(pl.pos).setY(pl.pos.y + 0.5), b = _v3.copy(pl.pos).setY(pl.pos.y + 1.5);
        const nearest = closestOnSeg(p.pos, a, b);
        if (nearest.distanceTo(p.pos) < p.r + 0.45 && pl.alive) {
          if (pl.damage(p.damage, { from: p.owner?.pos || p.pos, type: 'shot' })) this.fx.sparks(p.pos, 8, null, 5);
          else if (pl.iframes > 0) this.emit('nearMiss');
          dead = true;
        } else if (nearest.distanceTo(p.pos) < 1.4 && !p.nearMissed) { p.nearMissed = true; this.emit('nearMiss'); }
      } else if (!dead) {
        const er = this.raycastEnemies(p.pos, dir, step + p.r);
        if (er) {
          const wasAlive = er.enemy.alive;
          if (!p.explode) er.enemy.takeDamage(p.damage, { dir: dir.clone(), knock: 8, weapon: p.weapon || 'reflect', source: 'player', point: er.point });
          if (!er.enemy.alive && wasAlive) er.enemy._killInfo = { weapon: p.weapon || 'reflect' };
          this.hud.hitmarker(false, !er.enemy.alive);
          dead = true;
        }
      }
      if (!dead && wr.hit) { dead = true; this.fx.sparks(wr.point, 10, wr.normal, 6, p.owner === 'player' ? FXColors.cyan : FXColors.pink, FXColors.pinkEnd); this.fx.decal(wr.point, wr.normal, 0.35); }
      if (dead) {
        if (p.explode) {
          // party bomb: real explosion + a confetti shower
          this.explode(p.pos.clone(), p.explode.scale, p.explode.damage, { source: p.owner === 'player' ? 'player' : 'enemy', weapon: p.weapon });
          if (p.explode.confetti) for (const col of [FXColors.pink, FXColors.cyan, [2, 1.7, 0.2, 1]]) this.fx.burst(p.pos, 14, col, [col[0] * 0.4, col[1] * 0.4, col[2] * 0.4, 0], 9, 0.25, 1.1);
        }
        this.fx.burst(p.pos, 8, FXColors.pink, FXColors.pinkEnd, 3, 0.3, 0.3);
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }
      if (p.gravity) p.vel.y -= p.gravity * dt;
      p.pos.addScaledVector(p.vel, dt);
      p.mesh.position.copy(p.pos);
      if (Math.random() < 0.8) this.fx.trail(p.pos, p.owner === 'player' ? FXColors.cyan : FXColors.pink, p.r * 1.6, 0.18);
    }
  }

  // -------------------------------------------------------------- kills / style / hype
  onEnemyKilled(e, info = {}) {
    const ki = { ...info, ...(e._killInfo || {}) };
    ki.head = ki.head || info.tag === 'head';
    ki.melee = ki.melee || info.type === 'melee';
    ki.env = ki.env || info.env || info.barrel;
    const pl = this.player;
    this.stats.kills++;
    const now = this.time;
    if (now - this.lastKillT < 0.6) this.multiKill++; else this.multiKill = 1;
    this.lastKillT = now;
    this.combo.count++;
    this.combo.t = 4;
    this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo.count);
    const tags = [];
    const weapon = ki.weapon || info.weapon || e.lastHitBy;
    if (ki.head || info.tag === 'head') tags.push(['HEADSHOT', 60]);
    if (info.tag === 'weak') tags.push(['WEAK POINT', 80]);
    if (!pl.grounded && pl.mode !== 'swim') tags.push(['AIRBORNE', 70]);
    if (pl.mode === 'slide') tags.push(['SLIDE KILL', 80]);
    if (pl.mode === 'wallrun') tags.push(['WALL-RUNNER', 120]);
    if (pl.mode === 'grapple') tags.push(['ZIPLINE KILL', 120]);
    if (ki.melee || weapon === 'blades' || weapon === 'hammer') tags.push([weapon === 'hammer' ? 'HAMMERTIME' : 'SLICED', 70]);
    if (ki.pound) tags.push(['GROUND POUND', 120]);
    if (weapon === 'reflect') tags.push(['RETURN TO SENDER', 150]);
    if (weapon === 'gravity' || info.type === 'impact' || e.thrown > 0 && info.type === 'fall') tags.push(['SPECIAL DELIVERY', 110]);
    if (weapon === 'stomp') tags.push(['SQUASHED', 90]);
    if (ki.env || info.env || weapon === 'barrel') { tags.push(['ENVIRONMENTAL', 130]); this.stats.envKills++; }
    if (info.type === 'water') tags.push(['SHORT CIRCUIT', 120]);
    if (info.type === 'crush') tags.push(['FLATTENED', 150]);
    if ((ki.dist || 0) > 40) tags.push(['LONG SHOT', 100]);
    if (weapon === 'shotgun' && (ki.dist || 99) < 3) tags.push(['POINT BLANK', 60]);
    if (weapon === 'rail' && this.multiKill >= 2) tags.push(['SKEWERED', 150]);
    if (this.multiKill === 2) tags.push(['DOUBLE KILL', 100]);
    if (this.multiKill === 3) tags.push(['TRIPLE KILL', 200]);
    if (this.multiKill >= 4) tags.push(['MEGA KILL', 400]);
    if (pl.hp < 25) tags.push(['CLUTCH', 100]);
    const base = e.score;
    const styleSum = tags.reduce((s, t) => s + t[1], 0);
    const mult = 1 + Math.min(4, Math.floor(this.combo.count / 3)) * 0.5;
    const pts = Math.round((base + styleSum) * mult);
    this.score += pts;
    this.stats.style += styleSum;
    this.hype = clamp(this.hype + 0.035 + styleSum / 4000 + (e.heavy ? 0.08 : 0), 0, 1);
    this.boredT = 0;
    this.hud.killFeed(e.name, tags, pts, mult);
    if (tags.length >= 2 || e.heavy || this.multiKill >= 3) { this.audio.play('cheer', { big: e.heavy ? 1.5 : 1, vol: 0.8 }); }
    else if (Math.random() < 0.35) this.audio.play('cheer', { big: 0.4, vol: 0.5 });
    // drops
    const c = e.center(new THREE.Vector3());
    const melee = ki.melee || weapon === 'blades' || weapon === 'hammer';
    if (melee || Math.random() < (pl.hp < 50 ? 0.5 : 0.25)) this.addPickup('health', c, { data: { amount: melee ? 20 : 12 } });
    if (Math.random() < 0.35) this.addPickup('ammo', c);
    if (this.multiKill >= 3 || e.heavy) this.slowmo(0.35, 0.5);
    this.emit('kill', { enemy: e, tags, weapon, info, pts });
    // remove from list lazily
  }
  addHype(a, reason) { this.hype = clamp(this.hype + a, 0, 1); }
  slowmo(scale, dur) { this.timeScale = scale; this.slowT = dur; }
  hitStop(t) { this.hitStopT = Math.max(this.hitStopT, t); }

  // -------------------------------------------------------------- death / end
  onPlayerDeath(info) {
    if (this.ended) return;
    this.stats.deaths++;
    this.slowmo(0.25, 1.2);
    this.music.sting('death');
    this.audio.play('ooh', { vol: 1.2 });
    this.audience.cancel();
    this.emit('death', info);
    this.later(1.4, () => { this.ended = true; this.app.onDeath(this, info); });
  }
  completeFloor() {
    if (this.ended) return;
    this.ended = true;
    this.cinematic = true;
    this.stats.time = this.time;
    this.audience.cancel();
    this.app.onFloorComplete(this);
  }

  // -------------------------------------------------------------- frame
  update(rawDt) {
    let dt = Math.min(rawDt, 1 / 20);
    if (this.paused) return;
    this.frameDt = rawDt;
    if (this.hitStopT > 0) { this.hitStopT -= dt; dt *= 0.06; }
    if (this.slowT > 0) { this.slowT -= rawDt; if (this.slowT <= 0) this.timeScale = 1; }
    const tsTarget = this.slowT > 0 ? this.timeScale : 1;
    this._ts = (this._ts ?? 1) + (tsTarget - (this._ts ?? 1)) * Math.min(1, rawDt * 10);
    dt *= this._ts;
    this.time += dt;
    this.stats.time = this.time;
    shaderClock.value += dt;

    // timers
    for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); } }
    this._tickScripts(dt);
    // hazards / floor (move kinematic geometry)
    if (this.floor.update) this.floor.update(dt);
    for (let i = this.hazards.length - 1; i >= 0; i--) { const h = this.hazards[i]; if (h.dead) { this.hazards.splice(i, 1); continue; } h.update(dt); }
    this.physics.syncDynamic();
    // water
    if (this.water) {
      const w = this.water;
      if (w.speed && w.level !== w.target) {
        const d = w.target - w.level;
        w.level += Math.sign(d) * Math.min(Math.abs(d), w.speed * dt);
      }
      w.mesh.position.y = w.level;
      w.mesh.visible = w.level > -50;
      const flooding = w.speed && Math.abs(w.target - w.level) > 0.05;
      this.audio.loop('water', flooding ? 0.5 : (this.player.inWater > 0.2 ? 0.12 : 0.0));
    }
    // player
    this.player.update(dt, this.input);
    // enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.alive) { this.enemies.splice(i, 1); continue; }
      e.update(dt);
    }
    for (let i = this.fallingDrones.length - 1; i >= 0; i--) { const d = this.fallingDrones[i]; if (d.dead || !d.falling) { this.fallingDrones.splice(i, 1); continue; } d.update(dt); }
    if (this.nav) this.nav.update(dt, this.player.pos);
    // physics bodies
    this.physics.step(dt);
    this._updateThrown(dt);
    // explosive barrel fuses
    for (const p of this.props) {
      if (!p.alive) continue;
      if (p.fuse !== undefined && p.fuse !== null && p.fuse > 0) {
        p.fuse -= dt;
        if (Math.random() < 0.7) this.fx.fire(_v.copy(p.body.pos).setY(p.body.pos.y + 0.5), 1, 0.4, 0.1);
        if (p.fuse <= 0) this.destroyProp(p, { source: 'player' });
      }
    }
    if (this.props.length > 80) this.props = this.props.filter((p) => p.alive);
    this._updateProjectiles(dt);
    for (let i = this.pickups.length - 1; i >= 0; i--) { const p = this.pickups[i]; if (!p.alive) { this.pickups.splice(i, 1); continue; } p.update(dt); }
    // grapple point highlight
    this._grappleHint = this.player.alive ? this.findGrapplePoint(this.camera.position, this.player.camForward, 48) : null;
    for (const g of this.grapplePoints) {
      const hl = this._grappleHint && this._grappleHint.gp === g;
      g.ring.rotation.z += dt * (hl ? 6 : 1.5);
      g.ring.scale.setScalar(hl ? 1.35 + Math.sin(this.time * 12) * 0.1 : 1);
      g.ring.material.emissive.set(hl ? '#ffffff' : '#25f4ff');
    }
    // combo / hype
    if (this.combo.t > 0) { this.combo.t -= dt; if (this.combo.t <= 0) this.combo.count = 0; }
    this.boredT += dt;
    this.hype = clamp(this.hype - dt * (this.boredT > 18 ? 0.02 : 0.006), 0, 1);
    this.audio.crowdTarget = 0.2 + this.hype * 0.75;
    // lights out
    this.lightsOut += (this.lightsOutTarget - this.lightsOut) * Math.min(1, dt * 3);
    for (const d of this.dimmables) d.light.intensity = d.base * (1 - d.factor * this.lightsOut);
    // key light follows player for crisp shadows
    if (this.keyLight) {
      const L = this.keyLight;
      L.target.position.copy(this.player.pos);
      L.position.copy(this.player.pos).addScaledVector(L.userData.dir, 60);
    }
    this.audience.update(dt);
    this.fx.update(dt);
    // camera
    if (this.camOverride) this._updateCamOverride(rawDt); // otherwise the player updates the camera mid-update (see Player.update)
    { const c = this.camera; _v.set(1.6, 2.4, 0.5).applyQuaternion(c.quaternion); this.camFill.position.copy(c.position).add(_v); _v.set(0, 0, -6).applyQuaternion(c.quaternion); this.camFill.target.position.copy(c.position).add(_v); }
    // post fx
    const R = this.renderer.fx;
    const hpk = 1 - this.player.hp / this.player.maxHp;
    R.uDamage.value = Math.max(this.player.damageFlash * 0.8, hpk > 0.55 ? (hpk - 0.55) * 1.6 * (0.75 + 0.25 * Math.sin(this.time * 6)) : 0);
    R.uHeal.value = Math.max(0, R.uHeal.value - rawDt * 2);
    R.uUnderwater.value += ((this.player.underwater ? 1 : 0) - R.uUnderwater.value) * Math.min(1, rawDt * 8);
    { const pl = this.player, hs = Math.hypot(pl.vel.x, pl.vel.z), fast = pl.mode === 'grapple' || pl.mode === 'slide' || pl.mode === 'dodge' ? 1 : 0;
      R.uSpeed.value += (Math.min(1, Math.max(0, (hs - 11.5) / 9) + fast * 0.35) * (this.settings.motionBlur === false ? 0 : 1) - R.uSpeed.value) * Math.min(1, rawDt * 6); }
    R.uSat.value = 1 + this.hype * 0.15 - (this.player.alive ? 0 : 0.8) - (this.lightsOut * 0.2);
    this.audio.setMuffle(this.player.underwater ? 1 : 0);
    this.audio.loop('heartbeat', this.player.alive && this.player.hp < 30 ? 0.35 : 0);
    if (this.waterAtmosphere || this.water || this.player.inWater > 0.1) {
      this.waterAtmosphere ??= new UnderwaterAtmosphere(this);
      this.waterAtmosphere.update(Math.min(rawDt, 0.05));
    }
    this.hud.update(this, rawDt);
  }
  _updateThrown(dt) {
    // thrown props / enemies smash into enemies
    for (const p of this.props) {
      if (!p.alive || !p.thrown) continue;
      p.thrownT = (p.thrownT ?? 2) - dt;
      if (p.thrownT <= 0 || p.body.vel.length() < 6) { p.thrown = false; continue; }
      for (const d of this.destructibles) {
        if (d.alive && d.pos.distanceTo(p.body.pos) < (d.radius || 1) + p.r + 0.3) { d.onShot(80, { point: p.body.pos.clone(), weapon: 'gravity' }); if (p.explosive) this.destroyProp(p, { source: 'player' }); else this.damageProp(p, 50, {}); p.thrown = false; break; }
      }
      if (!p.alive || !p.thrown) continue;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (e.center(_v).distanceTo(p.body.pos) < e.radius + p.r + 0.3) {
          const dir = p.body.vel.clone().normalize();
          const wasAlive = e.alive;
          e.takeDamage(55 + p.body.vel.length() * 2, { dir, knock: 14, type: 'impact', weapon: 'gravity', source: 'player', stagger: true, point: p.body.pos.clone() });
          if (!e.alive && wasAlive) e._killInfo = { weapon: 'gravity' };
          this.audio.play('robotHit', { pos: p.body.pos });
          this.hud.hitmarker(false, !e.alive);
          p.body.vel.multiplyScalar(0.4);
          if (p.explosive) { this.destroyProp(p, { source: 'player' }); break; }
          this.damageProp(p, 40, { source: 'player' });
          p.thrown = false;
          break;
        }
      }
    }
    for (const e of this.enemies) {
      if (!e.alive || e.thrown <= 0 || e.knock.length() < 10) continue;
      for (const o of this.enemies) {
        if (o === e || !o.alive) continue;
        if (o.center(_v).distanceTo(e.center(_v2)) < e.radius + o.radius + 0.2) {
          const dir = e.knock.clone().normalize();
          const w1 = o.alive, w2 = e.alive;
          o.takeDamage(45, { dir, knock: e.knock.length() * 0.7, type: 'impact', weapon: 'gravity', source: 'player', stagger: true });
          e.takeDamage(30, { dir, type: 'impact', weapon: 'gravity', source: 'player' });
          if (!o.alive && w1) o._killInfo = { weapon: 'gravity' };
          if (!e.alive && w2) e._killInfo = { weapon: 'gravity' };
          e.knock.multiplyScalar(0.3);
          this.audio.play('clank', { pos: o.pos });
          this.fx.sparks(o.center(_v), 14, null, 8);
          break;
        }
      }
    }
  }
  // cinematic camera
  setCam(pos, look, fov = 60, lerp = 3) { this.camOverride = { pos: new THREE.Vector3(...pos), look: new THREE.Vector3(...look), fov, lerp, cur: null }; }
  releaseCam() { this.camOverride = null; }
  _updateCamOverride(dt) {
    const o = this.camOverride, cam = this.camera;
    if (!o.cur) { o.cur = { pos: cam.position.clone(), look: cam.position.clone().add(new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).multiplyScalar(10)) }; }
    const k = 1 - Math.exp(-o.lerp * dt);
    o.cur.pos.lerp(o.pos, k);
    o.cur.look.lerp(o.look, k);
    cam.position.copy(o.cur.pos);
    cam.lookAt(o.cur.look);
    cam.fov += (o.fov - cam.fov) * k;
    cam.updateProjectionMatrix();
    const sh = this.player.trauma * this.player.trauma;
    if (sh > 0) { cam.rotation.x += Math.sin(this.time * 37) * 0.02 * sh; cam.rotation.z += Math.sin(this.time * 41) * 0.02 * sh; this.player.trauma = Math.max(0, this.player.trauma - dt); }
    this.audio.setListener(cam.position, Math.atan2(-(o.cur.look.x - cam.position.x), -(o.cur.look.z - cam.position.z)));
  }

  dispose() {
    this.audio.stopLoops();
    this.audience.cancel();
    this.host.detach();
    this.waterAtmosphere?.dispose();
    this.scene.traverse((o) => { if (o.geometry && !o.geometry.userData?.shared) o.geometry.dispose?.(); });
    this.fx.dispose();
    this.keyLight?.shadow?.dispose();
  }
}

function closestOnSeg(p, a, b) {
  const ab = new THREE.Vector3().subVectors(b, a);
  const t = clamp(new THREE.Vector3().subVectors(p, a).dot(ab) / ab.lengthSq(), 0, 1);
  return a.clone().addScaledVector(ab, t);
}
