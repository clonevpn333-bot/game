// The people of the prologue. Looks are authored; Tomas shares Rook's skin and hair.
import * as THREE from 'three';
import { Actor } from '../characters/npc.js';

export function makeCast(game) {
  const rook = game.state.look || {};
  const C = {};
  C.bram = new Actor(game, { name: 'BRAM', collide: true, look: { hairStyle: 'shaved', beard: true, build: 1, frame: 0, hair: '#8f8b84', skin: '#e3b08c', primary: '#6a4a3a', secondary: '#c8692b', scarf: '#a14a52', height: 1.06, outfit: 'runner', brows: '#6a6660', eyes: '#3e5a2a', gloves: '#3a2a20', backpack: false } });
  C.nia = new Actor(game, { name: 'NIA', collide: true, look: { hairStyle: 'ponytail', outfit: 'casual', skin: '#8e5a3a', hair: '#1b1512', primary: '#c8692b', tank: true, tiedJacket: '#3d4f3a', goggles: true, frame: 0.82, build: 0.45, freckles: true, pants: '#33352f', boots: '#4a3a2a', eyes: '#2a2018', height: 0.99, earrings: true } });
  C.tomas = new Actor(game, { name: 'TOMAS', collide: true, look: { hairStyle: 'crop', outfit: 'engineer', glasses: true, coat: '#3b4a5a', build: 0.25, frame: 0.25, lid: 0.78, primary: '#55606a', skin: rook.skin || '#c58c64', hair: rook.hair || '#1b1512', eyes: rook.eyes || '#4a3424', height: 1.04 } });
  C.odile = new Actor(game, { name: 'ODILE', collide: true, look: { hairStyle: 'bun', hair: '#c8c4bc', skin: '#b7794f', outfit: 'vendor', apron: '#e8e0d0', primary: '#7a2b22', build: 0.8, frame: 0.85, height: 0.95, age: 1 } });
  C.sefa = new Actor(game, { name: 'SEFA', collide: true, look: { hairStyle: 'curls', hair: '#2a1a12', skin: '#6b4029', outfit: 'casual', primary: '#d8a040', secondary: '#3a6a8a', build: 0.3, height: 1.02, scarf: '#3a6a8a' } });
  C.okafor = new Actor(game, { name: 'MRS. OKAFOR', collide: true, look: { hairStyle: 'bun', hair: '#d8d4cc', skin: '#4a2c1d', outfit: 'casual', primary: '#5a3a6a', build: 0.7, frame: 0.9, height: 0.93, glasses: true, hood: false } });
  C.pell = new Actor(game, { name: 'PELL', collide: false, look: { kid: true, hairStyle: 'crop', hair: '#3a2618', skin: '#d29a72', outfit: 'casual', primary: '#3a6a8a', freckles: true } });
  C.juno = new Actor(game, { name: 'JUNO', collide: false, look: { kid: true, hairStyle: 'braid', hair: '#1b1512', skin: '#8e5a3a', outfit: 'casual', primary: '#c85a3a' } });
  for (const a of Object.values(C)) { game.addActor(a); a.hidden = true; a.char.group.visible = false; }
  game.cast = C;
  return C;
}
export function show(a, pos, yaw) { a.hidden = false; a.char.group.visible = true; a.place(pos, yaw); return a; }
export function hide(a) { a.hidden = true; a.char.group.visible = false; a.place(new THREE.Vector3(0, -900, 0)); }
