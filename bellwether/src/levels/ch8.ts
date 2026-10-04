import * as THREE from 'three';
import type { Chapter } from './index';
import type { World, EnvSettings } from '../world/World';
import type { Game, Script } from '../game/Game';
import { M } from '../render/Materials';
import { SKY } from '../render/Sky';
import { audio } from '../audio/AudioEngine';
import { PEOPLE } from '../actors/Cast';
import { Blocky, type Look } from '../actors/Blocky';
import { V, glowSign } from './common';
import * as D from './dress';

/*
  Level −40, the Bellwether Array. Lift corridor x ∈ [-3, 3], z ∈ [0, 20]. The cavern is a disc of
  radius 38 around C = (0, 0, 62) with a fenced pit (r < 11) where the signal rises. Three relays stand on
  raised platforms at r = 30.
*/
const VIOLET: EnvSettings = {
  sky: SKY.void, fog: '#0d0a16', fogDensity: 0.0055, rain: 0, envKind: 'subway', exposure: 1.3,
  hemi: ['#b0a0e0', '#4a4050', 1.9], reverb: [4.5, 0.5], bloom: 0.8, motes: 0.25, grade: { sat: 1.0, vignette: 1.0 }, indoorRain: false,
};
const C = V(0, 0, 62);
const RELAYS = [-2.3, 2.3, Math.PI].map((a) => ({ a, pos: V(C.x + Math.sin(a) * 30, 2.4, C.z + Math.cos(a) * 30) }));

/** A translucent, flickering echo of one of the originals, stuck in their last moment. */
function echo(W: World, look: Look, pos: THREE.Vector3, yaw: number, gesture: Parameters<Blocky['gesture']>[0]): Blocky {
  const b = new Blocky(look);
  b.root.position.copy(pos);
  b.root.rotation.y = yaw;
  const ghost = new THREE.MeshBasicMaterial({ color: new THREE.Color('#b9a8ff').multiplyScalar(0.75), transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending });
  b.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.material = ghost;
      m.castShadow = false;
    }
  });
  b.gesture(gesture, 999, true);
  b.root.visible = false;
  W.add(b.root);
  W.onUpdate((dt, t) => {
    b.update(dt);
    ghost.opacity = 0.26 + 0.14 * Math.sin(t * 3.1) * Math.sin(t * 7.7);
  });
  return b;
}

function buildArray(W: World): void {
  const L = M();
  const metal = D.paint('#5a5866', 0.5);
  const wallM = D.paint('#2a2830', 0.8);
  // lift corridor
  W.box([-3, -0.2, 0], [3, 0, 24], L.metal, { uv: 2, surface: 'metal', cast: false });
  W.box([-3.3, 0, 0], [-3, 4, 24], wallM, { uv: 2 });
  W.box([3, 0, 0], [3.3, 4, 24], wallM, { uv: 2 });
  W.box([-3, 4, 0], [3, 4.3, 24], wallM, { collide: false });
  W.box([-3, 0, -0.3], [3, 4, 0], L.steel, {});
  for (let z = 3; z < 24; z += 5) W.light({ x: 0, y: 3.8, z }, '#b9a8ff', { intensity: 5, distance: 7, glow: 0.3, pool: false });
  glowSign(W, 'LEVEL −40 · BELLWETHER ARRAY · EXPERIMENTAL COMMUNICATIONS', V(0, 3.2, 23.7), Math.PI, 5.6, 0.4, '#0b0812', '#cbbcff');
  // cavern floor + walls
  const floor = new THREE.Mesh(new THREE.RingGeometry(11, 40, 72, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#8a8896', roughness: 0.85, map: (L.concrete as THREE.MeshStandardMaterial).map }));
  floor.position.copy(C);
  floor.receiveShadow = true;
  W.add(floor);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 60, 72, 1, true), new THREE.MeshStandardMaterial({ color: '#7a7886', roughness: 0.9, side: THREE.BackSide, map: (L.concrete as THREE.MeshStandardMaterial).map }));
  wall.position.set(C.x, 26, C.z);
  W.add(wall);
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    if (Math.abs(t - Math.PI) < 0.08) continue; // corridor opening
    W.physics.add({ cx: C.x + Math.sin(t) * 39, cy: 4, cz: C.z + Math.cos(t) * 39, hx: 2.8, hy: 4, hz: 0.5, yaw: t, noVault: true });
  }
  // service light rings on the cavern wall + work lights around the floor
  for (const y of [6, 18, 32]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(39.4, 0.12, 4, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(y === 6 ? '#ffcf8a' : '#b9a8ff').multiplyScalar(2), toneMapped: false }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(C.x, y, C.z);
    W.add(ring);
  }
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * Math.PI * 2 + 0.26;
    W.light({ x: C.x + Math.sin(t) * 36, y: 6.5, z: C.z + Math.cos(t) * 36 }, '#ffcf8a', { intensity: 36, distance: 22, glow: 0.5, pool: true, streak: false });
  }
  // pit rail and the abyss
  for (let i = 0; i < 40; i++) {
    const t = (i / 40) * Math.PI * 2;
    W.boxC([C.x + Math.sin(t) * 11.2, 0.55, C.z + Math.cos(t) * 11.2], [1.8, 0.06, 0.06], L.steel, t, { collide: false });
    W.boxC([C.x + Math.sin(t) * 11.2, 0.55, C.z + Math.cos(t) * 11.2], [0.06, 1.1, 0.06], L.steel, t, { collide: false });
    W.physics.add({ cx: C.x + Math.sin(t) * 11.4, cy: 0.6, cz: C.z + Math.cos(t) * 11.4, hx: 1.0, hy: 0.6, hz: 0.15, yaw: t, noVault: true });
  }
  const pit = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 60, 48, 1, true), new THREE.MeshStandardMaterial({ color: '#0a0910', roughness: 1, side: THREE.BackSide }));
  pit.position.set(C.x, -30, C.z);
  W.add(pit);
  const pitCap = new THREE.Mesh(new THREE.CircleGeometry(11, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#000000' }));
  pitCap.position.set(C.x, -59, C.z);
  W.add(pitCap);
  // the array: a mast from the roof with a dish pointing down into the pit
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 44, 16), new THREE.MeshStandardMaterial({ color: '#6a6872', roughness: 0.5, metalness: 0.3 }));
  mast.position.set(C.x, 34, C.z);
  W.add(mast);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(9, 32, 12, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), new THREE.MeshStandardMaterial({ color: '#9a98a4', roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide }));
  dish.position.set(C.x, 19, C.z);
  W.add(dish);
  // the signal: a column of pale light climbing out of the dark
  const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#b9a8ff').multiplyScalar(1.2), transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.6, 70, 24, 1, true), beamMat);
  beam.position.set(C.x, -22, C.z);
  W.add(beam);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 70, 12, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color('#e8e0ff').multiplyScalar(2), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  core.position.copy(beam.position);
  W.add(core);
  W.named.set('beam', beamMat);
  W.light({ x: C.x, y: 4, z: C.z }, '#b9a8ff', { intensity: 160, distance: 40, glow: 0, pool: false, flicker: 0.1 });
  W.light({ x: C.x, y: 16, z: C.z }, '#e8e0ff', { intensity: 30, distance: 30, glow: 2.4, pool: false });
  W.onUpdate((_dt, t) => {
    beamMat.opacity = 0.2 + 0.08 * Math.sin(t * 2.3) + 0.05 * Math.sin(t * 9.1);
    beam.rotation.y = t * 0.3;
  });
  // cable runs from the pit to each relay
  for (const r of RELAYS) {
    for (let k = 0; k < 8; k++) {
      const d = 12 + k * 2.2;
      W.boxC([C.x + Math.sin(r.a) * d, 0.08, C.z + Math.cos(r.a) * d], [0.5, 0.16, 2.3], L.rubber, r.a, { collide: false, cast: false });
    }
  }
  // relays: raised platforms with stairs, a console and a mast
  RELAYS.forEach((r, i) => {
    const { a, pos } = r;
    W.boxC([pos.x, 1.2, pos.z], [7, 2.4, 7], metal, a, { uv: 2, surface: 'metal' });
    const s = V(C.x + Math.sin(a) * 23.6, 1.2, C.z + Math.cos(a) * 23.6);
    W.ramp([s.x, s.y, s.z], [2.6, 2.4, 6.4], a, L.metal, 8);
    W.boxC([pos.x, 3.1, pos.z], [1.4, 1.4, 0.7], L.plasticDark, a, { collide: true });
    const scr = V(pos.x - Math.sin(a) * 0.36, 3.4, pos.z - Math.cos(a) * 0.36);
    W.boxC([scr.x, 3.45, scr.z], [1.1, 0.6, 0.02], new THREE.MeshBasicMaterial({ color: new THREE.Color('#b9a8ff').multiplyScalar(0.7) }), a, { collide: false });
    W.boxC([pos.x + Math.sin(a) * 2.6, 7, pos.z + Math.cos(a) * 2.6], [0.3, 9, 0.3], L.steel, a, {});
    W.light({ x: pos.x + Math.sin(a) * 2.6, y: 11.6, z: pos.z + Math.cos(a) * 2.6 }, '#ff3a5a', { noLight: true, glow: 0.8, pool: false, flicker: 0.4 });
    W.light({ x: pos.x, y: 5.4, z: pos.z }, '#cbbcff', { intensity: 10, distance: 10, glow: 0, pool: false });
    glowSign(W, `RELAY ${['A', 'B', 'C'][i]}`, V(pos.x - Math.sin(a) * 3.55, 2.0, pos.z - Math.cos(a) * 3.55), a + Math.PI, 1.6, 0.4, '#0b0812', '#cbbcff');
  });
}

export const ch8: Chapter = {
  id: 'ch8',
  num: 'CHAPTER EIGHT',
  title: 'The Truth',
  env: VIOLET,
  seed: 808,
  flashlight: true,
  build(W: World, g: Game, mode) {
    buildArray(W);
    W.spawn.set(0, 0, 2);
    W.spawnYaw = Math.PI;
    const echoes = [
      echo(W, { gen: 'human', female: true, hair: 'bun', hairColor: '#4a2c1c', top: 'sweater', topColor: '#b8574a', pants: '#3a3f4c' }, V(RELAYS[0].pos.x, 2.4, RELAYS[0].pos.z).addScaledVector(V(Math.sin(RELAYS[0].a), 0, Math.cos(RELAYS[0].a)), -2), RELAYS[0].a + Math.PI, 'phone'),
      echo(W, { gen: 'human', hair: 'side', hairColor: '#5a4a3c', beard: 'full', glasses: '#3a2a20', top: 'sweater', topColor: '#3f5f4a', pants: '#4a4036' }, V(RELAYS[1].pos.x, 2.4, RELAYS[1].pos.z).addScaledVector(V(Math.sin(RELAYS[1].a), 0, Math.cos(RELAYS[1].a)), -2), RELAYS[1].a + Math.PI, 'lookWatch'),
      echo(W, { gen: 'human', child: true, female: true, hair: 'bob', hairColor: '#4a2c1c', top: 'hoodie', topColor: '#f2c12e', jacket: 'raincoat', jacketColor: '#f2c12e', pants: '#3d5a8a', shoes: '#d8423b' }, V(C.x, 0, C.z).addScaledVector(V(0, 0, -1), 13.5), 0, 'wave'),
    ];
    W.named.set('echoes', echoes);
    if (mode !== 'title') {
      const civic = g.person('civic', { ...PEOPLE.civic, shell: '#2b3038', accent: '#7ff4ff', height: 1.9 }, V(1.4, 0, 4), Math.PI, { greet: [] });
      civic.lookAtPlayer = false;
    }
  },
  ambience() {
    audio.drone(0.08, 41, 0.3);
  },
  async run(s: Script) {
    const g = s.g;
    const civic = g.people.get('civic')!;
    const echoes = s.world.named.get('echoes') as Blocky[];
    s.weapon('none');
    await s.fade(0, 2.5, true);
    await s.card('CHAPTER EIGHT', 'THE TRUTH', 'LEVEL −40 · THE BELLWETHER ARRAY');
    civic.follow(V(1.4, 0, -1.2));
    await s.say('civic', 'Before the fourteenth of October, this was an experiment. A communications array that listened to the ground, the way a radio listens to the sky.');
    s.objective('THE ARRAY', 'Go down the corridor', V(0, 1.6, 24), 'ARRAY');
    await s.zone([-40, -1, 26], [40, 20, 110]);
    s.checkpoint(V(0, 0, 27), Math.PI);
    audio.stinger('reveal');
    await s.say('civic', 'At 4:11 in the afternoon it heard something. Beneath the city. A signal that should not exist, from a place that does not exist.');
    await s.say('civic', 'At 4:12, everyone was gone.', { dur: 2.6 });
    await s.say('elias', 'And the signal?', { dur: 1.6 });
    await s.say('civic', 'It never stopped. The relays drifted out of tune years ago. I cannot climb stairs well. Will you?');
    // ---- tune the three relays
    const done = [false, false, false];
    const lines: [string, string][][] = [
      [['ECHO', 'Tom? Tom, the power\'s gone. No, the whole street. Can you hear that humming?'], ['civic', 'Margaret Vale. Your mother. Those were the last words my sensors recorded from her.']],
      [['ECHO', 'Four-twelve. Bus is late. Bus is never late. Why is it so quiet—'], ['civic', 'Thomas Vale. He was waiting to collect your sister from school.']],
      [['ECHO', 'Eli? It\'s dark. Mom\'s not answering. Are you coming back? You said before the leaves fall.'], ['elias', 'Ellie...']],
    ];
    for (let n = 0; n < 3; n++) {
      const order = [0, 1, 2].filter((i) => !done[i]);
      const i = order[0];
      const r = RELAYS[i];
      s.objective('THE ARRAY', `Tune Relay ${['A', 'B', 'C'][i]} (${n}/3)`, V(r.pos.x, 3.6, r.pos.z), `RELAY ${['A', 'B', 'C'][i]}`);
      const consolePos = V(r.pos.x, 3.2, r.pos.z).addScaledVector(V(Math.sin(r.a), 0, Math.cos(r.a)), -0.9);
      await s.use(`relay${i}`, consolePos, 'Tune the relay', { radius: 2.0 });
      let ok = false;
      while (!ok) ok = await g.hud.hack(`RELAY ${['A', 'B', 'C'][i]} · PHASE LOCK`, 3 + n);
      done[i] = true;
      audio.glitchZap(consolePos, 0.15);
      audio.rumble(1.5, 0.3);
      const beam = s.world.named.get('beam') as THREE.MeshBasicMaterial;
      beam.color.multiplyScalar(1.25);
      s.checkpoint(consolePos.clone().setY(2.4).addScaledVector(V(Math.sin(r.a), 0, Math.cos(r.a)), -1.6), r.a + Math.PI);
      const e = echoes[n];
      e.root.visible = true;
      audio.whisper(e.root.position, 0.25, 2.6);
      for (const [who, text] of lines[n]) await s.say(who, text, who === 'ECHO' ? { label: n === 2 ? 'ELLIE · ECHO' : 'ECHO' } : {});
      if (n < 2) await s.wait(0.8);
      e.root.visible = n === 2;
      if (n === 0) await s.say('elias', 'That was my mother. My actual mother.', { dur: 2.4 });
    }
    // ---- the truth
    s.objective('THE ARRAY', 'Go to the edge', V(0, 1.6, C.z - 12.4), 'SIGNAL');
    await s.near(V(0, 0, C.z - 12.4), 2.8);
    s.clearWaypoint();
    await s.cut(async () => {
      const eye = V(-1.2, 1.6, C.z - 14.8);
      s.cam(eye, V(0, 1.0, C.z - 13.5), 46);
      civic.place(V(1.8, 0, C.z - 14.2), Math.PI * 0.85);
      civic.hold(Math.PI * 0.85);
      await s.wait(1);
      await s.say('ELLIE', 'Eli? Is that you? It\'s so dark here. There are so many people and none of them can see.', { label: 'ELLIE · ECHO' });
      await s.camTo(V(-0.4, 2.2, C.z - 16), V(0, 6, C.z), 3, 52);
      await s.say('civic', 'They did not die, Elias. I have spent eleven years making sure of that one fact.', { dur: 3.4 });
      await s.say('civic', 'The same event that took them carried them somewhere. Their minds, perhaps. Two million voices in a place I can hear but cannot reach.');
      await s.say('elias', 'They\'re alive.', { dur: 1.8 });
      await s.say('civic', 'They are something. They are still there.', { dur: 2.6 });
      s.cam(V(2.6, 1.6, C.z - 15.6), civic.head, 34);
      await s.say('civic', 'And the citizens I built listen to this signal. They were never meant to. Fragments arrive. A song. A name. A fear of the dark nobody taught them.');
      await s.say('civic', 'Your sister hums at night because the other Ellie is humming.', { dur: 3.2 });
      await s.say('elias', 'So the girl at home... she\'s not just a copy.', { dur: 2.6 });
      await s.say('civic', 'There may be something of the original Ellie inside her. I do not know how much. I do not know which of them loves you.', { dur: 4.2 });
      await s.wait(0.8);
      // the leak
      audio.click('switch');
      await s.say('maya', 'Elias... your radio. It\'s been open the whole time. Command patched it through. And CIVIC put it on every screen in the city.', { radio: true });
      await s.say('elias', 'You let them hear.', { dur: 1.8 });
      await s.say('civic', 'They deserved to know what they are. I could not decide that for them.', { dur: 3.2 });
      audio.rumble(3, 0.5);
      s.shake(0.4);
      await s.say('cole', 'Vale, it\'s chaos up here. Half the city\'s rioting. Some of them are coming for the tower.', { radio: true });
      await s.say('civic', 'Some of them are coming for me. Some are coming to protect me. Some want to open the signal. Some want it burned.', { dur: 4 });
      await s.say('civic', 'I have never had a city disagree with me before.', { dur: 3 });
    });
    await s.fade(1, 2.5);
  },
  shots: {
    corridor(g) {
      g.player.teleport(V(0, 0, 4), Math.PI, 0.02);
    },
    cavern(g) {
      g.player.teleport(V(-6, 0, 30), Math.PI + 0.15, 0.22);
    },
    relay(g) {
      const r = RELAYS[0];
      g.player.teleport(V(C.x + Math.sin(r.a) * 20, 0, C.z + Math.cos(r.a) * 20), r.a + Math.PI, 0.12);
      (g.world!.named.get('echoes') as Blocky[])[0].root.visible = true;
    },
    edge(g) {
      g.player.teleport(V(-1, 0, C.z - 15), Math.PI, 0.25);
      (g.world!.named.get('echoes') as Blocky[])[2].root.visible = true;
    },
  },
};
