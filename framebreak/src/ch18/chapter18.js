// CHAPTER 18 — FRAMEBREAK. The finale. Act I, THE BLEED: the worlds collapse
// into each other and you outrun it. Act II: the quiet walk through every way
// to exist, the choice, and one of three endings.
import * as THREE from 'three';
import { getRenderer } from '../ch3/chapter3.js';
import { renderFX } from '../fx/post.js';
import { buildVell, buildHud } from './kit.js';
import { Bleed } from './bleed.js';
import { Atelier } from './atelier.js';

const SONG = (() => { const bars = {}, ch = [['A2', 'A3+C4+E4', 'A4 . . E5 . . D5 . C5 . D5 . E5 . . .'], ['F2', 'F3+A3+C4', 'C5 . . A4 . . F4 . A4 . C5 . F5 . E5 .'], ['G2', 'G3+B3+D4', 'D5 . . B4 . . G4 . B4 . D5 . G5 . . .'], ['E2', 'E3+G#3+B3', 'E5 . . C5 . . A4 . B4 . . . G#4 . B4 .']]; const A = ch.map(([b, c, m], i) => { bars['a' + i] = { sub: `${b} . ${b} . ${b} ${b} . ${b} . ${b} ${b} . ${b} . ${b} ${b}`, str: `${c} - - - - - - - - - - - - - - -`, chip: m, brass: m.replace(/5/g, '4').replace(/4 \. \./g, '4 - .'), box: m.replace(/5/g, '6'), horn: i % 2 ? '. . . . . . . . E5 . D5 . C5 . . .' : '. . . . . . . . . . . . . . . .', drums: i === 3 ? 'k . h k s . k k k h s k t t l l' : 'k . h . s . h k . k h . s . h h' }; return 'a' + i; }); return { bpm: 150, gain: 1, reverb: 0.3, start: 'A', tracks: { sub: { inst: 'subbass', vol: 0.9 }, str: { inst: 'strings', vol: 0.8, send: 0.5 }, chip: { inst: 'lead', vol: 0.7, pan: -0.3 }, brass: { inst: 'brass', vol: 0.6, pan: 0.25, layer: 2 }, box: { inst: 'musicbox', vol: 0.5, pan: 0.4, send: 0.5, layer: 1 }, horn: { inst: 'mute', vol: 0.5, layer: 2 }, drums: { kit: 'electro', vol: 0.9, layer: 1 } }, bars, sections: { A }, next: { A: 'A' } }; })();
export { SONG as SONG_CH18 };

const ENDS = {
  one: { name: 'ONE FRAME', sub: 'the Curator\'s ending', lines: ['Everything becomes one format. Clean lines. No seams.', 'It is very quiet. Rin has one shape, and keeps it.', 'Nobody remembers there were ever other ways to exist. Except Rin.'], text: 'One frame. One format. It is tidy, and Rin is the only one who knows what it cost.' },
  seal: { name: 'SEAL THE FRAMES', sub: 'the Keeper\'s ending', lines: ['The frames close. Every world is whole again, and alone again.', 'Rin fits in none of them now. Neither does a first sketch.', '"I remember you," says Vell. "That\'s the one thing I\'m good at."'], text: 'Every world safe behind its frame. Two things that belong to none of them keep each other company in the gutter between panels.' },
  open: { name: 'LEAVE IT OPEN', sub: 'the framebreak', lines: ['The frames come down. Pixels wander into paper towns. Clay learns to be ink.', 'It is a mess. It is ALIVE. The Curator is given a broom and, eventually, a hobby.', 'Rin never does settle on a shape. Vell says that was always the point.'], text: 'One universe. Too many ways to exist. Rin kept all of them.' },
};


const ACTS = [Bleed, Atelier], IDS = [null, 'act4'];
export default class Chapter18 {
  constructor(game) { this.game = game; this.id = 18; this.compositesOutgoing = true; this.ENDS = ENDS; }
  async load() {}
  controlsHelp() { return this.act?.help() || ''; }
  start({ checkpoint, handoff } = {}) {
    const g = this.game; this.r = getRenderer(g); this.r.shadowMap.enabled = g.settings.shadows > 0; this.r.toneMappingExposure = 1.0; g.c2d.style.imageRendering = ''; g.gl.style.imageRendering = '';
    this.hud = buildHud(g); this.vell = buildVell(); this.noPause = false; this.sting = [{ inst: 'bell', notes: 'A5 E6 D6 C6 E6 - -', step: 0.11, vol: 0.5, send: 0.5 }];
    this.sw = 0; this.song = SONG; this.snap0 = handoff ? g.snapshot() : null; this.go(Math.max(0, IDS.indexOf(checkpoint || null)));
    g.show3d(true); if (handoff) g.fadeFrozen(1600, () => g.director.releaseOutgoing()); else g.clear2d();
    g.audio.muffle(0);
  }
  go(i) { this.i = i; this.act = new ACTS[i](this); this.act.build(); if (i) this.game.save.setCheckpoint(18, IDS[i]); }
  stop() { this.hud?.remove(); this.game.input.exitLock(); this.act = null; }
  respawn() { this.act?.respawn?.(); }
  update(dt, outgoing) { if (outgoing || !this.act) return; this.act.update(dt); if (this.act.done && this.i < ACTS.length - 1 && !this.swap) this.swap = true; }
  render(dt) {
    if (!this.act) return; const g = this.game, r = this.r; if (r.domElement.width !== g.W || r.domElement.height !== g.H) r.setSize(g.W, g.H, false);
    const f = this.act.frame(dt); renderFX(g, r, f.scene, f.cam, f.fx); this.hud.tick();
    if (this.swap) { this.swap = false; g.freezeFrame(); g.dialogue.clear(); this.go(this.i + 1); g.fadeFrozen(1300); }
  }
  perfInfo() { const i = this.r.info.render; return `act ${this.i + 1} · calls ${i.calls} · tris ${i.triangles}`; }
}
