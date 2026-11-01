// GETAWAY! — free roam: the open world with no mission active. Patrols, pickups, secrets, weather, respawns.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { rand, pick, clamp } from '../core/utils.js';
import { TrafficAI, edgePoint, laneOffset, edgeDir } from '../vehicles/traffic.js';
import { WEAPONS, makeWeaponMesh } from '../combat/combat.js';
import { WEATHERS } from '../world/sky.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// hidden golden hubcaps (secrets) — rooftops, under bridges, crane tops, pier ends...
export const SECRETS = [V(-20, 8.15, 125), V(-80, 16.15, 128), V(140, 70.2, -165), V(-44, 0.5, 920), V(400, -11.85, 300), V(166, 56.4, -170), V(-150, 16.15, 180), V(-1430, 40.2, -100), V(760, 10.6, -400), V(-50, 15.2, -36), V(395, 0.15, 0), V(-100, 12.2, -531)];
const PICKUPS = [{ id: 'smg', p: V(50, 0.15, -250) }, { id: 'shotgun', p: V(-50, 0.15, 150) }, { id: 'rifle', p: V(166, 44.4, -170) }, { id: 'heavy', p: V(745, 8, 0) }, { id: 'armor', p: V(-150, 0.15, 400) }, { id: 'armor', p: V(550, 0.15, 135) }, { id: 'armor', p: V(-600, 0.15, -100) }, { id: 'pistol', p: V(110, 0.15, 60) }];

export class FreeRoam {
  constructor(flow) { this.flow = flow; this.active = false; this.items = []; this.patrols = []; this.weatherT = 0; }
  start(carId = null, q = null) {
    this.active = true; const S = G.save; const P = G.player;
    const id = carId || (S.unlockedVehicles.includes('rostr') ? 'rostr' : 'saetta'); const mod = S.vehicleMods[id] || {};
    const x = q && q.get('x') ? +q.get('x') : 550, z = q && q.get('z') ? +q.get('z') : 96;
    P.teleport(x - 3, 0.15, z, Math.PI); P.setWeapon('pistol'); P.inv.pistol.res = Math.max(P.inv.pistol.res, 60);
    const v = G.vehicles.spawn(id, { x, y: 0, z: z - 1.75, yaw: -Math.PI / 2, color: mod.color, parked: false }); v.keep = true;
    if (!q || q.get('drive')) P.enterVehicle(v);
    G.sky.running = true; G.sky.dayScale = 1 / 60; if (q && q.get('h')) G.sky.setTime(+q.get('h')); if (q && q.get('w')) G.sky.setWeather(q.get('w'), true);
    const done = Object.keys(S.completed).length; G.police.reset(); G.police.setTier(Math.floor(done / 5)); G.police.tactics = { pit: true, roadblocks: true, heli: true };
    G.traffic.populate(); G.peds.populate();
    G.music.play(G.sky.isNight ? 'freeroam' : 'freeroam', { intensity: 1 });
    this.spawnItems(); this.patrolT = 0; this.weatherT = rand(150, 300); this.downT = 0;
    this.offs = [G.on('playerDied', () => { this.downT = 3.5; G.hud.bigText('DOWN', 'red', 3, 'Patching you up at Sol General'); }), G.on('busted', () => { this.downT = 3.5; this.busted = true; G.hud.bigText('BUSTED', 'blue', 3, 'Dez posted bail. Again.'); })];
    G.hud.notify('FREE ROAM — Port Sol is yours. Find the 12 golden hubcaps.', 'pickup');
    this.updater = this.flow.game.addUpdater((dt) => this.update(dt));
  }
  stop() { if (!this.active) return; this.active = false; for (const it of this.items) G.scene.remove(it.mesh); this.items = []; for (const v of this.patrols) if (!v.removed) G.vehicles.remove(v); this.patrols = []; if (this.offs) this.offs.forEach((f) => f()); if (this.updater) this.updater(); }
  spawnItems() {
    const found = new Set(G.save.secrets);
    SECRETS.forEach((p, i) => { if (found.has(i)) return; const m = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.12, 10, 24), new THREE.MeshStandardMaterial({ color: 0xffd36b, metalness: 1, roughness: 0.15, emissive: 0x5a3a00 })); m.position.copy(p).y += 0.8; G.scene.add(m); this.items.push({ kind: 'secret', i, mesh: m, p }); });
    for (const k of PICKUPS) { const m = k.id === 'armor' ? new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.25), new THREE.MeshStandardMaterial({ color: 0x3fa9ff, emissive: 0x0a2a5a })) : makeWeaponMesh(WEAPONS[k.id].kind); m.scale.multiplyScalar(k.id === 'armor' ? 1 : 2.5); m.position.copy(k.p).y += 1; G.scene.add(m); this.items.push({ kind: 'pickup', id: k.id, mesh: m, p: k.p, respawn: 0 }); }
  }
  update(dt) {
    if (!this.active || G.paused) return; const P = G.player; const f = P.focus;
    for (const it of this.items) {
      it.mesh.rotation.y += dt * 2; it.mesh.position.y = it.p.y + 1 + Math.sin(G.time * 2) * 0.15;
      if (it.respawn > 0) { it.respawn -= dt; it.mesh.visible = it.respawn <= 0; continue; }
      if (!it.mesh.visible) continue;
      if (f.distanceTo(it.p) < 2.2) {
        if (it.kind === 'secret') { G.save.secrets.push(it.i); G.game.saveNow(); it.mesh.visible = false; it.respawn = 1e9; G.stunts.award('GOLDEN HUBCAP', 500, `${G.save.secrets.length}/${SECRETS.length} FOUND`); if (G.save.secrets.length === SECRETS.length && !G.save.unlockedVehicles.includes('super')) { G.save.unlockedVehicles.push('super'); G.hud.bigText('ALL HUBCAPS', 'gold', 3, 'Vortice V12 unlocked in the garage'); } }
        else if (it.id === 'armor') { P.armor = 100; G.audio.ui('pickup'); G.hud.notify('Body armor', 'pickup'); it.mesh.visible = false; it.respawn = 60; }
        else { P.give(it.id, WEAPONS[it.id].mag * 3); it.mesh.visible = false; it.respawn = 60; }
      }
    }
    // police patrols cruising in traffic
    this.patrolT -= dt; this.patrols = this.patrols.filter((v) => !v.removed);
    if (this.patrolT <= 0) { this.patrolT = 3; if (this.patrols.length < 3 && G.police.state === 'none') { const tp = P.focus; for (let k = 0; k < 20; k++) { const e = pick(G.world.graph.live); if (e.hwy || e.tunnel) continue; const s = rand(10, e.len - 10); const p = edgePoint(e, s, laneOffset(e, 0), V(0, 0, 0)); const d = p.distanceTo(tp); if (d < 150 || d > 260) continue; const v = G.vehicles.spawn('police', { x: p.x, y: p.y, z: p.z, yaw: edgeDir(e, s) }); new TrafficAI(v, e, 0, s); v.hasDriver = true; v.ai.speedMul = 0.8; G.traffic.cars.push(v); this.patrols.push(v); break; } } }
    // weather & time
    this.weatherT -= dt; if (this.weatherT <= 0) { this.weatherT = rand(180, 360); const w = pick(['clear', 'clear', 'clear', 'cloudy', 'cloudy', 'rain', 'storm', 'fog']); G.sky.setWeather(w); }
    // respawn after down/busted
    if (this.downT > 0) { this.downT -= dt; if (this.downT <= 0) this.respawn(); }
    // music follows heat
    const s = G.police.stars; G.music.setIntensity(s >= 3 ? 4 : s >= 1 ? 3 : P.vehicle && P.vehicle.speed > 30 ? 2 : 1);
  }
  respawn() {
    const P = G.player; const bust = this.busted; this.busted = false; G.police.reset(); G.npcs.clear();
    const at = bust ? G.world.landmarks.police.exit : { x: 300 + 12, z: -200 }; P.revive(); P.money = Math.max(0, P.money - 500); P.teleport(at.x, 0.15, at.z, 0); if (bust) { P.inv = { fists: { mag: 0, res: 0 }, pistol: { mag: 15, res: 30 } }; P.setWeapon('pistol'); }
    G.traffic.populate(); G.peds.populate();
  }
}
