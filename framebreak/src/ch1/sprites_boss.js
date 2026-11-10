// GRIDLOCK — the foreman of the pixel district. A gantry-hung mech with a CRT
// face, two chain fists and a magenta core. Authored as separate parts with
// three armour damage states and a set of face-screen expressions.
import { Pix } from './pix.js';
import { plate, STEEL, DARK, NAVY } from './sprites_world.js';

export const BOSS_W = 112, BOSS_H = 84, BOSS_OX = 56, BOSS_OY = 42;

function body(state) {
  const p = new Pix(BOSS_W, BOSS_H), X = 56;
  // trolley riding the ceiling rail
  plate(p, X - 26, 0, 52, 9, DARK, true); p.rect(X - 26, 0, 52, 1, 'h');
  for (const wx of [X - 20, X - 6, X + 8, X + 22]) { p.ellipse(wx - 0.5, 2.5, 3, 3, 'G'); p.ellipse(wx - 0.5, 2.5, 1, 1, 'i'); }
  // hydraulic neck
  p.rect(X - 7, 9, 14, 10, 'G'); p.rect(X - 7, 9, 3, 10, 'h'); p.rect(X - 3, 9, 2, 10, 'i'); p.rect(X + 4, 9, 3, 10, 'g'); for (let y = 11; y < 19; y += 3) p.rect(X - 7, y, 14, 1, 'K');
  // shoulder yoke
  const S = new Pix(BOSS_W, BOSS_H);
  S.poly([[X - 50, 22], [X + 50, 22], [X + 54, 34], [X + 44, 46], [X - 44, 46], [X - 54, 34]], 'N');
  S.poly([[X - 50, 22], [X + 50, 22], [X + 52, 27], [X - 52, 27]], 'b'); S.rect(X - 49, 22, 98, 1, 'L');
  S.poly([[X - 52, 36], [X + 52, 36], [X + 44, 46], [X - 44, 46]], 'n');
  // hazard chevrons on shoulders
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { const x0 = X + sx * (30 + i * 6); S.poly([[x0, 28], [x0 + sx * 3, 28], [x0 + sx * 7, 35], [x0 + sx * 4, 35]], 'y'); }
  // shoulder sockets (where the fist chains attach)
  for (const sx of [-1, 1]) { S.ellipse(X + sx * 47, 38, 7, 7, 'G'); S.ellipse(X + sx * 47, 38, 5, 5, 'g'); S.ellipse(X + sx * 47, 38, 2, 2, 'h'); S.set(X + sx * 47 - 3, 34, 'i'); }
  p.blit(S, 0, 0, { sep: 'K' });
  // chest block
  const C = new Pix(BOSS_W, BOSS_H);
  C.poly([[X - 30, 40], [X + 30, 40], [X + 24, 74], [X + 10, 82], [X - 10, 82], [X - 24, 74]], 'N');
  C.poly([[X - 30, 40], [X - 22, 40], [X - 17, 74], [X - 24, 74]], 'b'); C.poly([[X + 22, 40], [X + 30, 40], [X + 24, 74], [X + 17, 74]], 'n');
  C.rect(X - 22, 74, 44, 1, 'k');
  // ribs / pistons either side of the core
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { C.rect(X + sx * 19 - 2, 46 + i * 8, 5, 5, 'G'); C.rect(X + sx * 19 - 2, 46 + i * 8, 5, 1, 'i'); }
  // core housing
  C.ellipse(X, 61, 13, 13, 'K'); C.ellipse(X, 61, 11, 11, 'g');
  if (state === 0) { // armoured shutter closed
    C.ellipse(X, 61, 10, 10, 'h'); C.ellipse(X - 2, 59, 7, 7, 'H'); for (let i = -9; i <= 9; i += 3) C.rect(X + i, 52, 1, 19, 'G'); C.rect(X - 10, 60, 21, 2, 'K'); C.rect(X - 2, 59, 5, 4, 'y'); C.rect(X - 1, 60, 3, 2, 'K');
  } else if (state === 1) { // cracked shutter, glow leaking
    C.ellipse(X, 61, 10, 10, 'h'); for (let i = -9; i <= 9; i += 3) C.rect(X + i, 52, 1, 19, 'G');
    C.line(X - 7, 54, X - 1, 60, 'K', 2); C.line(X - 1, 60, X + 4, 57, 'K', 2); C.line(X - 1, 60, X + 2, 69, 'K', 2); C.line(X - 6, 55, X - 1, 60, 'M'); C.line(X - 1, 60, X + 3, 58, 'm'); C.line(X - 1, 61, X + 2, 68, 'M');
    C.rect(X + 5, 64, 4, 4, 'U'); C.set(X + 6, 65, 'W');
  } else { // exposed core
    C.ellipse(X, 61, 10, 10, 'V'); C.ellipse(X, 61, 8, 8, 'U'); C.ellipse(X, 61, 6, 6, 'm'); C.ellipse(X - 1, 60, 4, 4, 'M'); C.ellipse(X - 2, 59, 1.5, 1.5, 'W');
    for (const [a, b] of [[-11, -7], [9, -9], [10, 6], [-9, 9]]) { C.line(X + a, 61 + b, X + a * 0.6, 61 + b * 0.6, 'h', 2); }
    C.rect(X - 12, 50, 5, 3, 'G'); C.rect(X + 8, 69, 5, 3, 'G');
  }
  p.blit(C, 0, 0, { sep: 'K' });
  // head: a CRT monitor in an armoured hood
  const H = new Pix(BOSS_W, BOSS_H);
  H.poly([[X - 20, 12], [X + 20, 12], [X + 23, 18], [X + 21, 38], [X - 21, 38], [X - 23, 18]], 'h');
  H.poly([[X - 20, 12], [X + 20, 12], [X + 22, 16], [X - 22, 16]], 'i'); H.rect(X - 19, 12, 38, 1, 'W');
  H.poly([[X + 17, 16], [X + 23, 18], [X + 21, 38], [X + 16, 38]], 'G');
  H.rect(X - 16, 17, 32, 18, 'K'); H.rect(X - 15, 18, 30, 16, 'k');
  // antenna horns
  H.line(X - 18, 12, X - 24, 3, 'G', 2); H.line(X + 17, 12, X + 23, 3, 'G', 2); H.rect(X - 25, 1, 3, 3, 'R'); H.rect(X + 22, 1, 3, 3, 'R');
  // jaw grille
  H.rect(X - 12, 36, 24, 4, 'G'); for (let i = -11; i < 12; i += 3) H.rect(X + i, 37, 1, 3, 'K');
  if (state >= 1) { H.line(X + 9, 12, X + 14, 19, 'K'); H.line(X + 14, 19, X + 12, 24, 'K'); H.rect(X - 22, 26, 4, 5, 'g'); }
  if (state >= 2) { H.poly([[X - 23, 18], [X - 16, 12], [X - 20, 12]], 0); H.line(X - 20, 14, X - 14, 22, 'K'); H.rect(X + 17, 30, 5, 6, 'g'); H.set(X + 19, 32, 'y'); }
  p.blit(H, 0, 0, { sep: 'K' });
  // damage: scorch + torn plates
  if (state >= 1) { p.rect(X - 40, 30, 6, 3, 'k'); p.rect(X + 30, 41, 7, 2, 'k'); p.line(X + 20, 44, X + 25, 56, 'K'); }
  if (state >= 2) { p.rect(X - 28, 44, 6, 9, 'k'); p.set(X - 26, 47, 'O'); p.set(X - 25, 50, 'y'); p.line(X - 12, 76, X - 20, 66, 'K'); p.rect(X + 38, 24, 8, 4, 'k'); p.set(X + 41, 25, 'O'); }
  return p.outline('K');
}

// Face-screen contents (30x16), drawn as chunky "big pixels" — the boss is
// literally lower resolution than the world it guards.
const FACES = {
  idle: ['..............................', '....CCCCCC........CCCCCC......', '....CCCCCC........CCCCCC......', '....CCwwCC........CCwwCC......', '....CCwwCC........CCwwCC......', '....CCCCCC........CCCCCC......', '....CCCCCC........CCCCCC......', '..............................', '..............................', '..........cccccccccc..........', '..........cccccccccc..........', '..............................'],
  angry: ['..RR......................RR..', '..RRRR..................RRRR..', '....RRRR..............RRRR....', '....OORRRR..........RRRROO....', '....OOOOOO..........OOOOOO....', '....OOYYOO..........OOYYOO....', '....OOYYOO..........OOYYOO....', '..............................', '........RRRRRRRRRRRRRR........', '........RR..RR..RR..RR........', '........RRRRRRRRRRRRRR........', '..............................'],
  charge: ['..............................', '..YYYYYYYY........YYYYYYYY....', '..YYWWWWYY........YYWWWWYY....', '..YYWWWWYY........YYWWWWYY....', '..YYWWWWYY........YYWWWWYY....', '..YYWWWWYY........YYWWWWYY....', '..YYYYYYYY........YYYYYYYY....', '..............................', '..........YYYYYYYYYY..........', '..........YY......YY..........', '..........YYYYYYYYYY..........', '..............................'],
  hurt: ['..............................', '..MM....MM........MM....MM....', '....MMMM............MMMM......', '....MMMM............MMMM......', '..MM....MM........MM....MM....', '..............................', '..............................', '......mm..mm..mm..mm..mm......', '....mm..mm..mm..mm..mm..mm....', '..............................', '..............................', '..............................'],
  laugh: ['..............................', '....CCCCCC........CCCCCC......', '..CC......CC....CC......CC....', '..............................', '..............................', '......CCCCCCCCCCCCCCCCCC......', '......CCwwCCwwCCwwCCwwCC......', '......CC..............CC......', '........CCCCCCCCCCCCCC........', '..............................', '..............................', '..............................'],
  dead: ['..............................', '..W...W...W....W.....W...W....', '....W...W....W...W.....W......', '.W....W....W.....W..W.....W...', '...W.....W...W.......W..W.....', '..W..W.....W...W..W.......W...', '.....W..W.....W.....W..W......', '..W.......W.....W......W...W..', '....W..W.....W....W..W........', '.W.......W.....W........W..W..', '...W..W.....W.....W..W........', '..............................'],
};
function face(name) { const p = new Pix(30, 12); p.stamp(0, 0, FACES[name]); return p; }

function fist(kind) {
  const p = new Pix(44, 40), X = 22, Y = 20;
  // wrist cuff (top) with hazard band + chain eye
  const C = new Pix(44, 40);
  C.rect(X - 9, Y - 18, 18, 9, 'G'); C.rect(X - 9, Y - 18, 18, 2, 'h'); C.rect(X - 9, Y - 12, 18, 3, 'y'); for (let i = -9; i < 9; i += 6) C.poly([[X + i, Y - 10], [X + i + 3, Y - 10], [X + i + 5, Y - 12], [X + i + 2, Y - 12]], 'K');
  C.rect(X - 3, Y - 20, 6, 3, 'h');
  p.blit(C);
  const F = new Pix(44, 40);
  if (kind === 'open') { // splayed fingers
    plate(F, X - 13, Y - 9, 26, 12, STEEL, true);
    for (let i = 0; i < 4; i++) { const fx = X - 13 + i * 7; plate(F, fx, Y + 2, 6, 10, STEEL); F.rect(fx, Y + 7, 6, 1, 'G'); plate(F, fx + 1, Y + 11, 4, 6, DARK); }
    plate(F, X + 13, Y - 6, 6, 8, STEEL); plate(F, X + 15, Y + 1, 5, 7, DARK);
  } else { // clenched block
    plate(F, X - 15, Y - 9, 30, 24, STEEL, true);
    F.rect(X - 15, Y + 3, 30, 1, 'G'); for (let i = 1; i < 4; i++) F.rect(X - 15 + i * 7 + 1, Y + 4, 1, 11, 'G');
    for (let i = 0; i < 4; i++) { F.rect(X - 14 + i * 7 + 1, Y + 5, 5, 3, 'i'); F.rect(X - 14 + i * 7 + 1, Y + 5, 5, 1, 'W'); }
    plate(F, X + 11, Y - 4, 7, 12, STEEL); F.rect(X - 12, Y - 6, 24, 6, 'N'); F.rect(X - 12, Y - 6, 24, 1, 'b');
    // knuckle bottom: scuffed striking face
    F.rect(X - 15, Y + 13, 30, 2, kind === 'slam' ? 'W' : 'h'); if (kind === 'slam') F.rect(X - 15, Y + 11, 30, 2, 'Y');
  }
  p.blit(F, 0, 0, { sep: 'K' });
  return p.outline('K');
}
function link() { const p = new Pix(8, 10); p.ellipse(3.5, 4.5, 2.6, 3.8, 'h'); p.ellipse(3.5, 4.5, 0.8, 2, 0); p.set(2, 2, 'i'); return p.outline('K'); }
function tileChunk(v) { // a ripped-out floor tile the boss throws
  const p = new Pix(18, 18); plate(p, 1, 1, 16, 16, DARK, true); p.rect(1, 1, 16, 3, 'h'); p.rect(1, 1, 16, 1, 'W');
  if (v) { p.rect(12, 12, 5, 5, 0); p.rect(1, 9, 3, 3, 0); p.line(6, 4, 9, 10, 'K'); } else { p.rect(1, 13, 4, 4, 0); p.line(10, 4, 8, 12, 'K'); }
  return p.outline('K');
}
function voidTile(f) { // what is under the pixel grid: nothing, badly rendered
  const p = new Pix(16, 16); p.rect(0, 0, 16, 16, 'K');
  for (let i = 0; i < 6; i++) { const x = (i * 7 + f * 5) % 16, y = (i * 5 + f * 3) % 16; p.set(x, y, i % 2 ? 'm' : 'U'); if (i % 3 === 0) p.rect(x, y, 2, 1, 'M'); }
  return p;
}

export function addBossFrames(atlas) {
  for (let s = 0; s < 3; s++) atlas.add('boss_body' + s, body(s), BOSS_OX, BOSS_OY);
  for (const n in FACES) atlas.add('boss_face_' + n, face(n), 15, 6);
  for (const k of ['open', 'closed', 'slam']) atlas.add('boss_fist_' + k, fist(k), 22, 20);
  atlas.add('boss_link', link(), 4, 5);
  atlas.add('boss_chunk0', tileChunk(0), 9, 9); atlas.add('boss_chunk1', tileChunk(1), 9, 9);
  for (let i = 0; i < 3; i++) atlas.add('void' + i, voidTile(i), 0, 0);
}
