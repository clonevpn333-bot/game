// Audience events: every one of these physically changes the arena or the rules.
// Floors can add their own (hydraulics, rotating stages, shattering glass...).
import * as THREE from 'three';
import { FXColors } from '../engine/fx.js';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _hit = {};
const rand = (a, b) => a + Math.random() * (b - a);
const DOWN = new THREE.Vector3(0, -1, 0);

function groundAt(g, x, z) {
  const top = g.floor.ceilingY ?? 30;
  const r = g.physics.raycast(_v.set(x, top - 0.5, z), DOWN, top + 40, _hit, (c) => c.tag !== 'trigger' && !c.isCeiling);
  return r.hit ? r.point.y : null;
}
function randomPointNear(g, center, radius) {
  const b = g.floor.bounds;
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radius;
    const x = THREE.MathUtils.clamp(center.x + Math.cos(a) * r, b.minX + 2, b.maxX - 2);
    const z = THREE.MathUtils.clamp(center.z + Math.sin(a) * r, b.minZ + 2, b.maxZ - 2);
    const y = groundAt(g, x, z);
    if (y !== null && y > (g.floor.killY ?? -30) + 1) return new THREE.Vector3(x, y, z);
  }
  return null;
}
function warnMarker(g, pos, r, life, color = 0xff2020) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.85, r, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2;
  m.position.copy(pos).setY(pos.y + 0.06);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.add(fill);
  fill.position.z = 0.001;
  g.scene.add(m);
  let t = 0;
  g.addHazard({ update(dt) { t += dt; fill.scale.setScalar(Math.min(1, t / life)); m.material.opacity = 0.5 + 0.4 * Math.sin(t * 20); if (t >= life) { g.scene.remove(m); m.geometry.dispose(); m.material.dispose(); fill.geometry.dispose(); fill.material.dispose(); this.dead = true; } } });
  return m;
}

export const EVENTS = {
  // ------------------------------------------------------------------ DISASTERS
  flood: {
    label: 'FLOOD THE ARENA', kind: 'disaster', dur: 30, banner: 'FLOOD WARNING', icon: '🌊',
    can: (g) => g.floor.floodable !== false,
    start(g, s) {
      const b = g.floor.waterBounds || g.floor.bounds;
      const base = g.floor.groundY ?? 0;
      if (!g.water) g.setWater({ ...b, level: base - 3, deep: '#04324c', shallow: '#22b5d8' });
      s.prev = g.water.level < -50 ? base - 3 : g.water.level;
      if (g.water.level < base - 2) g.water.level = base - 2.5;
      g.floodTo(base + (g.floor.floodDepth ?? 1.35), 0.45);
      g.audio.play('waterBurst', { pos: g.player.pos });
      // water pours in from vents at the edges
      s.spouts = (g.floor.spouts || []).map((p) => new THREE.Vector3(...p));
    },
    update(g, dt, s) {
      for (const p of s.spouts) if (Math.random() < 0.9) { g.fx.glow.emit(p.x + rand(-0.5, 0.5), p.y, p.z + rand(-0.5, 0.5), rand(-1, 1), rand(-2, 0), rand(-1, 1), 0.8, 0.5, 0.9, [0.6, 0.9, 1.0, 0.6], [0.6, 0.9, 1.0, 0], -20, 0.5); }
    },
    end(g, s) { g.floodTo(s.prev, 0.5); },
  },
  lowgrav: {
    label: 'LOW GRAVITY', kind: 'chaos', dur: 24, banner: 'LOW GRAVITY', icon: '🪐',
    start(g) { g.gravityScalePlayer = 0.42; g.gravityScaleEnemies = 0.4; g.physics.gravityScaleBodies = 0.3; for (const p of g.props) { p.body.sleep = 0; p.body.vel.y += rand(2, 5); } },
    end(g) { g.gravityScalePlayer = 1; g.gravityScaleEnemies = 1; g.physics.gravityScaleBodies = 1; },
  },
  gravflip: {
    label: 'GRAVITY REVERSAL', kind: 'disaster', dur: 9, banner: 'GRAVITY REVERSAL', icon: '🙃',
    start(g, s) {
      s.t = 0;
      g.gravityScaleEnemies = -0.6; g.physics.gravityScaleBodies = -0.6; g.gravityScalePlayer = 0.35;
      for (const e of g.enemies) { if (!e.heavy) { e.grounded = false; e.vel.y = 3; } }
      for (const p of g.props) { p.body.sleep = 0; p.body.vel.y = 3; }
    },
    update(g, dt, s) {
      s.t += dt;
      const ceil = (g.floor.ceilingY ?? 20) - 1.5;
      if (s.t < 6.5) {
        for (const e of g.enemies) if (e.pos.y > ceil - e.height) { e.pos.y = ceil - e.height; e.vel.y = Math.min(0, e.vel.y); e.knock.y = Math.min(0, e.knock.y); }
        for (const p of g.props) if (p.body.pos.y > ceil) { p.body.pos.y = ceil; p.body.vel.y = Math.min(0, p.body.vel.y); }
      } else if (!s.slam) {
        s.slam = true;
        g.gravityScaleEnemies = 2.4; g.physics.gravityScaleBodies = 2.4;
        for (const e of g.enemies) { e.thrown = 2; }
        for (const p of g.props) { p.thrown = true; p.thrownT = 2; }
        g.say('halo', 'And... DOWN WE GO!', { mood: 'gleeful', priority: 1 });
      }
    },
    end(g) { g.gravityScaleEnemies = 1; g.physics.gravityScaleBodies = 1; g.gravityScalePlayer = 1; },
  },
  barrels: {
    label: 'RAIN EXPLOSIVE BARRELS', kind: 'disaster', dur: 14, banner: 'INCOMING BARRELS', icon: '🛢️',
    start(g, s) { s.t = 0; },
    update(g, dt, s) {
      s.t -= dt;
      if (s.t <= 0) {
        s.t = rand(0.35, 0.6);
        const p = randomPointNear(g, Math.random() < 0.5 ? g.player.pos : (g.floor.center ? new THREE.Vector3(...g.floor.center) : g.player.pos), 16);
        if (!p) return;
        warnMarker(g, p, 1.6, 1.0, 0xff5020);
        const top = Math.min((g.floor.ceilingY ?? 25) - 2, p.y + 22);
        const prop = g.addProp('barrel', new THREE.Vector3(p.x, top, p.z));
        prop.body.vel.set(0, -12, 0);
        prop.body.spin.set(rand(-4, 4), 0, rand(-4, 4));
        if (Math.random() < 0.7) { prop.thrown = true; prop.thrownT = 6; }
      }
    },
  },
  meteors: {
    label: 'METEOR SHOWER', kind: 'disaster', dur: 15, banner: 'METEOR SHOWER', icon: '☄️',
    start(g, s) { s.t = 0; s.rocks = []; s.geo = new THREE.DodecahedronGeometry(0.8, 0); s.mat = new THREE.MeshStandardMaterial({ color: '#3a1a10', emissive: '#ff5a10', emissiveIntensity: 1.6, roughness: 0.9 }); },
    update(g, dt, s) {
      s.t -= dt;
      if (s.t <= 0) {
        s.t = rand(0.5, 0.9);
        const p = randomPointNear(g, g.player.pos, 14);
        if (p) {
          warnMarker(g, p, 2.6, 1.3, 0xff8020);
          const from = p.clone().add(_v.set(rand(-12, 12), 30, rand(-12, 12)));
          const m = new THREE.Mesh(s.geo, s.mat);
          m.position.copy(from);
          g.scene.add(m);
          s.rocks.push({ m, from, to: p, t: 0, dur: 1.3 });
          g.audio.play('meteor', { pos: p });
        }
      }
      for (let i = s.rocks.length - 1; i >= 0; i--) {
        const r = s.rocks[i];
        r.t += dt;
        const k = Math.min(1, r.t / r.dur);
        r.m.position.lerpVectors(r.from, r.to, k * k);
        r.m.rotation.x += dt * 5; r.m.rotation.y += dt * 4;
        g.fx.fire(r.m.position, 2, 1.2, 0.4);
        g.fx.smokePuff(r.m.position, 1, 1.2, 1.2);
        if (k >= 1) {
          g.scene.remove(r.m);
          s.rocks.splice(i, 1);
          g.explode(r.to.clone().setY(r.to.y + 0.5), 1, 45, { source: 'env' });
        }
      }
    },
    end(g, s) { for (const r of s.rocks) g.scene.remove(r.m); },
  },
  lightsout: {
    label: 'DISABLE THE LIGHTS', kind: 'chaos', dur: 24, banner: 'LIGHTS OUT', icon: '🔦',
    start(g) { g.lightsOutTarget = 1; g.audio.play('tvOff'); },
    end(g) { g.lightsOutTarget = 0; g.audio.play('powerup'); },
  },
  doublebots: {
    label: 'DOUBLE THE ROBOTS', kind: 'disaster', dur: 3, banner: 'DOUBLE THE ROBOTS', icon: '🤖',
    start(g) {
      const n = Math.max(3, Math.min(6, g.aliveEnemies() + 2));
      const pts = g.floor.spawnPoints || [];
      for (let i = 0; i < n; i++) {
        const p = pts[(Math.random() * pts.length) | 0];
        if (!p) break;
        const t = Math.random() < 0.65 ? 'clanker' : 'drone';
        g.later(i * 0.3, () => g.spawnEnemy(t, new THREE.Vector3(p[0] + rand(-1, 1), p[1] + (t === 'drone' ? 3 : 0), p[2] + rand(-1, 1))));
      }
    },
  },
  beast: {
    label: 'RELEASE THE BEAST', kind: 'disaster', dur: 3, banner: 'THE BEAST IS LOOSE', icon: '🐺',
    can: (g) => !g.enemies.some((e) => e.type === 'beast' && e.alive) && !!g.floor.beastSpawn,
    start(g) {
      const p = g.floor.beastSpawn;
      g.audio.play('sting', { chord: [73.4, 110, 146.8, 174.6] });
      g.later(0.5, () => { const e = g.spawnEnemy('beast', new THREE.Vector3(...p)); e.spawnT = 1.5; g.player.shake(0.5); });
    },
  },
  freeze: {
    label: 'FREEZE THE FLOOR', kind: 'chaos', dur: 22, banner: 'FLOOR FROZEN', icon: '❄️',
    start(g, s) { g.ice = true; s.fogC = g.scene.fog.color.clone(); g.scene.fog.color.set('#9fd6ff'); g.audio.play('glassCrack', { pos: g.player.pos }); g.renderer.flash(0.5, 0xcff0ff, 2); },
    update(g, dt, s) {
      const p = g.player.pos;
      for (let i = 0; i < 6; i++) g.fx.glow.emit(p.x + rand(-20, 20), p.y + rand(6, 14), p.z + rand(-20, 20), rand(-0.5, 0.5), -2.5, rand(-0.5, 0.5), 4, 0.12, 0.08, [1, 1, 1, 0.8], [1, 1, 1, 0], 0, 0);
    },
    end(g, s) { g.ice = false; g.scene.fog.color.copy(s.fogC); },
  },
  firestorm: {
    label: 'FIRE STORM', kind: 'disaster', dur: 18, banner: 'FIRE STORM', icon: '🔥',
    start(g, s) { s.t = 0.5; s.jets = []; },
    update(g, dt, s) {
      s.t -= dt;
      if (s.t <= 0) {
        s.t = rand(0.35, 0.7);
        const p = randomPointNear(g, g.player.pos, 13);
        if (p) { warnMarker(g, p, 1.3, 0.9, 0xff4010); s.jets.push({ p, t: -0.9 }); }
      }
      g.audio.loop('fire', s.jets.length ? 0.4 : 0);
      for (let i = s.jets.length - 1; i >= 0; i--) {
        const j = s.jets[i];
        j.t += dt;
        if (j.t < 0) { if (Math.random() < 0.5) g.fx.smokePuff(j.p, 1, 0.6, 0.8); continue; }
        if (!j.played) { j.played = true; g.audio.play('fireJet', { pos: j.p }); }
        for (let k = 0; k < 4; k++) g.fx.glow.emit(j.p.x + rand(-0.3, 0.3), j.p.y + 0.2, j.p.z + rand(-0.3, 0.3), rand(-0.6, 0.6), rand(9, 14), rand(-0.6, 0.6), rand(0.35, 0.55), rand(0.7, 1.1), 0.2, FXColors.fire, FXColors.fireEnd, 0, 0.5);
        const pl = g.player;
        if (Math.hypot(pl.pos.x - j.p.x, pl.pos.z - j.p.z) < 1.25 && pl.pos.y - j.p.y < 5) { if (!j.hitT || j.hitT <= 0) { pl.damage(14, { from: j.p, type: 'fire', knock: new THREE.Vector3(0, 9, 0) }); j.hitT = 0.4; } }
        if (j.hitT > 0) j.hitT -= dt;
        for (const e of g.enemies) if (e.alive && Math.hypot(e.pos.x - j.p.x, e.pos.z - j.p.z) < 1.4 && Math.random() < dt * 4) e.takeDamage(12, { type: 'fire', env: true });
        if (j.t > 2.2) s.jets.splice(i, 1);
      }
    },
    end(g) { g.audio.loop('fire', 0); },
  },
  lasers: {
    label: 'MOVING LASER GRID', kind: 'disaster', dur: 22, banner: 'LASER GRID ACTIVE', icon: '🟥',
    start(g, s) {
      s.beams = [];
      s.t = 0;
      s.mat = new THREE.MeshBasicMaterial({ color: 0xff1040, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    },
    update(g, dt, s) {
      s.t -= dt;
      const b = g.floor.laserBounds || g.floor.bounds;
      const base = g.floor.groundY ?? 0;
      if (s.t <= 0) {
        s.t = 3.2;
        const alongX = Math.random() < 0.5;
        const low = Math.random() < 0.55;
        const h = low ? 0.55 : 1.45;
        const len = alongX ? b.maxZ - b.minZ : b.maxX - b.minX;
        const geo = new THREE.CylinderGeometry(0.05, 0.05, len, 6);
        const m = new THREE.Mesh(geo, s.mat);
        if (alongX) m.rotation.x = Math.PI / 2; else m.rotation.z = Math.PI / 2;
        const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, len, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xff1040, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
        m.add(glow);
        const dir = Math.random() < 0.5 ? 1 : -1;
        const start = alongX ? (dir > 0 ? b.minX : b.maxX) : (dir > 0 ? b.minZ : b.maxZ);
        m.position.set(alongX ? start : (b.minX + b.maxX) / 2, base + h, alongX ? (b.minZ + b.maxZ) / 2 : start);
        g.scene.add(m);
        s.beams.push({ m, alongX, dir, h, speed: 7.5, hitT: 0 });
        g.hud.toast(low ? 'LASER — JUMP!' : 'LASER — SLIDE!', 'warn');
        g.audio.play('laserHum', { pos: g.player.pos });
      }
      const pl = g.player;
      for (let i = s.beams.length - 1; i >= 0; i--) {
        const B = s.beams[i];
        if (B.alongX) B.m.position.x += B.dir * B.speed * dt; else B.m.position.z += B.dir * B.speed * dt;
        const coord = B.alongX ? B.m.position.x : B.m.position.z;
        const pc = B.alongX ? pl.pos.x : pl.pos.z;
        B.hitT -= dt;
        const top = pl.pos.y + (pl.mode === 'slide' ? 1.0 : 1.8);
        const by = B.m.position.y;
        if (Math.abs(pc - coord) < 0.4 && by > pl.pos.y + 0.05 && by < top && B.hitT <= 0 && Math.abs(pl.pos.y - base) < 3) {
          pl.damage(22, { from: B.m.position, type: 'laser' }); B.hitT = 0.6; g.fx.sparks(pl.pos.clone().setY(by), 14, null, 6, FXColors.pink, FXColors.pinkEnd);
        }
        for (const e of g.enemies) if (e.alive && !e.flying && Math.abs((B.alongX ? e.pos.x : e.pos.z) - coord) < 0.4 && Math.random() < 0.3) e.takeDamage(30, { type: 'laser', env: true });
        if (Math.random() < 0.6) g.fx.sparks(B.m.position.clone().setY(base + 0.05).add(B.alongX ? _v.set(0, 0, rand(-20, 20)) : _v.set(rand(-20, 20), 0, 0)), 1, null, 3, FXColors.pink, FXColors.pinkEnd);
        const lim = B.alongX ? [b.minX - 1, b.maxX + 1] : [b.minZ - 1, b.maxZ + 1];
        if (coord < lim[0] || coord > lim[1]) { g.scene.remove(B.m); B.m.geometry.dispose(); B.m.children[0].geometry.dispose(); B.m.children[0].material.dispose(); s.beams.splice(i, 1); }
      }
    },
    end(g, s) { for (const B of s.beams) g.scene.remove(B.m); },
  },
  speed: {
    label: 'DOUBLE PLAYER SPEED', kind: 'gift', dur: 20, banner: 'SPEED x2', icon: '⚡',
    start(g) { g.player.speedMult = 1.7; },
    update(g) { if (Math.random() < 0.5) g.fx.trail(g.player.pos.clone().setY(g.player.pos.y + 1), FXColors.cyan, 0.5, 0.3); },
    end(g) { g.player.speedMult = 1; },
  },
  // ------------------------------------------------------------------ GIFTS ("THE AUDIENCE LOVES YOU")
  weapon: {
    label: 'FREE WEAPON', kind: 'gift', dur: 1, banner: 'SPONSOR DROP', icon: '🎁',
    start(g) {
      const have = g.player.arsenal.slots.map((s) => s.id);
      const pool = ['shotgun', 'rifle', 'rail', 'gravity'].filter((w) => !have.includes(w));
      const id = pool.length ? pool[(Math.random() * pool.length) | 0] : null;
      const p = randomPointNear(g, g.player.pos, 6) || g.player.pos.clone();
      p.y += 14;
      g.addPickup('gift', p, { onPick: () => {
        if (id) { g.player.arsenal.addWeapon(id); g.hud.toast(`${id === 'rail' ? 'RAILGUN' : id.toUpperCase()} — ON LOAN FROM THE AUDIENCE`, 'gift'); g.emit('gotWeapon', id); }
        else { g.player.arsenal.refill(1); g.player.heal(50); g.hud.toast('FULL REFILL', 'gift'); }
      } });
    },
  },
  invincible: {
    label: 'TEMPORARY INVINCIBILITY', kind: 'gift', dur: 10, banner: 'INVINCIBLE', icon: '⭐',
    start(g) { g.player.invincible = 10; },
    update(g) { if (Math.random() < 0.6) g.fx.burst(g.player.pos.clone().setY(g.player.pos.y + 1), 1, [2, 1.6, 0.3, 1], [1, 0.6, 0, 0], 2, 0.3, 0.4); },
  },
  giant: {
    label: 'GIANT SIZE', kind: 'gift', dur: 14, banner: 'GIANT MODE', icon: '🦖',
    start(g) { g.player.giant = 14; g.audio.play('powerup'); },
  },
  superspeed: {
    label: 'SUPER SPEED', kind: 'gift', dur: 16, banner: 'SUPER SPEED', icon: '💨',
    start(g) { g.player.speedMult = 1.6; g.enemySpeedMult = 0.6; },
    update(g) { if (Math.random() < 0.5) g.fx.trail(g.player.pos.clone().setY(g.player.pos.y + 1), FXColors.cyan, 0.5, 0.3); },
    end(g) { g.player.speedMult = 1; g.enemySpeedMult = 1; },
  },
  ammo: {
    label: 'EXTRA AMMUNITION', kind: 'gift', dur: 1, banner: 'AMMO + REPAIRS', icon: '📦',
    start(g) { g.player.arsenal.refill(1); g.player.heal(60); g.audio.play('heal'); },
  },
};

export const DISASTER_POOL = ['flood', 'lowgrav', 'gravflip', 'barrels', 'meteors', 'lightsout', 'doublebots', 'beast', 'freeze', 'firestorm', 'lasers'];
export const GIFT_POOL = ['weapon', 'invincible', 'giant', 'superspeed', 'ammo', 'speed'];
