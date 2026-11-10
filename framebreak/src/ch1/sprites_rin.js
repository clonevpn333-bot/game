// RIN — pixel form. Every animation frame is an authored pose: joints are
// placed on exact pixel coordinates, the head/boots/hands are hand-typed
// stamps, and limbs are drawn with pixel-exact 2px strokes. The poses are
// baked into the sprite atlas at load.
import { Pix } from './pix.js';

export const RIN_W = 56, RIN_H = 48, RIN_OX = 28, RIN_OY = 43;

// --- hand-placed stamps ------------------------------------------------------
const HEADS = {
  n: [ // neutral
    '...WW.WW..',
    '..WWWWWWW.',
    '.WWiWWWWWW',
    'WWiWWWiWW.',
    '.oOOOOkyk.',
    'WiWfffKff.',
    '.iiSffKff.',
    '..SSfffff.',
    '...sSff...',
  ],
  b: [ // blink
    '...WW.WW..',
    '..WWWWWWW.',
    '.WWiWWWWWW',
    'WWiWWWiWW.',
    '.oOOOOkyk.',
    'WiWfffSff.',
    '.iiSfKKff.',
    '..SSfffff.',
    '...sSff...',
  ],
  a: [ // attack: brow down, mouth set
    '...WW.WW..',
    '..WWWWWWW.',
    '.WWiWWWWWW',
    'WWiWWWiWW.',
    '.oOOOOkyk.',
    'WiWffKKff.',
    '.iiSffKff.',
    '..SSffkk..',
    '...sSff...',
  ],
  h: [ // hurt: eye shut tight, mouth open
    '...WWWWW..',
    '.WWWWWWWW.',
    'WWWiWWWWW.',
    '.WiWWWiWWW',
    '.oOOOOkyk.',
    '.iWfKfKff.',
    '.iiSfKfff.',
    '..SSffrr..',
    '...sSfr...',
  ],
  u: [ // looking up (jump/launcher)
    '..WWWWW...',
    '.WWWWWWWW.',
    '.WiWWWWWWW',
    '.WWWiWOkyk',
    '.iOOOOfKf.',
    '.iWSffKff.',
    '..iSfffff.',
    '..SSfff...',
    '...sS.....',
  ],
};
const BOOT = { flat: ['.WW..', 'WWWWi', 'iiiih'], toe: ['WW.', 'WWi', '.Wi', '.ih'], back: ['..WW.', 'iWWWW', 'hiiii'] };

function limb(p, a, b, c, shade, light, t = 2) {
  p.line(a[0], a[1], b[0], b[1], shade, t); p.line(b[0], b[1], c[0], c[1], shade, t);
  p.line(a[0], a[1], b[0], b[1], light, 1); p.line(b[0], b[1], c[0], c[1], light, 1);
}
function boot(p, x, y, kind, dark) {
  const rows = BOOT[kind] || BOOT.flat, remap = dark ? { W: 'H', i: 'h', h: 'G' } : null;
  if (kind === 'toe') p.stamp(x - 1, y - 2, rows, { remap }); else if (kind === 'back') p.stamp(x - 3, y - 2, rows, { remap }); else p.stamp(x - 1, y - 2, rows, { remap });
}

const DEF = {
  hip: [0, -10], neck: [0, -8], head: [0, 0], expr: 'n',
  aF: [1, 4, 1, 8], aB: [-1, 4, -2, 8], lF: [1, 5, 2, 10], lB: [-1, 5, -2, 10],
  bF: 'flat', bB: 'flat', scarf: [[-3, 1], [-6, 3], [-8, 6]], blade: null,
};
export function pose(o) { return { ...DEF, ...o }; }

export function drawRin(ps) {
  const P = new Pix(RIN_W, RIN_H), X = RIN_OX, Y = RIN_OY;
  const hip = [X + ps.hip[0], Y + ps.hip[1]], neck = [hip[0] + ps.neck[0], hip[1] + ps.neck[1]];
  const sh = [neck[0], neck[1] + 2];
  const J = (base, a, i) => [base[0] + a[i], base[1] + a[i + 1]];

  // back arm
  { const L = new Pix(RIN_W, RIN_H), e = J(sh, ps.aB, 0), h = J(sh, ps.aB, 2);
    limb(L, [sh[0] - 1, sh[1]], e, h, 't', 'T'); L.rect(h[0], h[1], 2, 2, 'S'); P.blit(L); }
  // back leg
  { const L = new Pix(RIN_W, RIN_H), k = J(hip, ps.lB, 0), f = J(hip, ps.lB, 2);
    limb(L, [hip[0] - 1, hip[1]], k, f, 'n', 'N'); boot(L, f[0], f[1], ps.bB, true); P.blit(L, 0, 0, { sep: 'K' }); }
  // scarf tail (behind torso)
  { const L = new Pix(RIN_W, RIN_H); let a = [neck[0] - 2, neck[1] + 1];
    ps.scarf.forEach((s, i) => { const b = [neck[0] + s[0], neck[1] + s[1]]; L.line(a[0], a[1], b[0], b[1], i === ps.scarf.length - 1 ? 'o' : 'O', i === ps.scarf.length - 1 ? 1 : 2); a = b; });
    L.line(neck[0] - 2, neck[1] + 2, neck[0] + ps.scarf[0][0], neck[1] + ps.scarf[0][1] + 1, 'o', 1);
    P.blit(L, 0, 0, { sep: 'K' }); }
  // torso: jacket rows from neck to hip
  { const L = new Pix(RIN_W, RIN_H), rows = Math.max(3, hip[1] - neck[1]);
    for (let r = 1; r <= rows; r++) {
      const cx = Math.round(neck[0] + ((hip[0] - neck[0]) * r) / rows), y = neck[1] + r, wide = r < rows - 1;
      L.rect(cx - 3, y, wide ? 6 : 5, 1, 'c');
      L.rect(cx - 3, y, 2, 1, 'T');
      if (r <= 3 && r >= 2) L.set(cx + 2, y, 'C');
      if (r === rows) { L.rect(cx - 3, y, 5, 1, 'k'); L.set(cx + 1, y, 'y'); }
      if (r === rows - 1) L.rect(cx - 3, y, 5, 1, 'T');
    }
    // zipper line + scarf wrap
    L.rect(neck[0] - 3, neck[1], 7, 2, 'O'); L.rect(neck[0] - 3, neck[1] + 1, 3, 1, 'o'); L.set(neck[0] + 3, neck[1] + 1, 'o');
    P.blit(L, 0, 0, { sep: 'K' }); }
  // front leg
  { const L = new Pix(RIN_W, RIN_H), k = J(hip, ps.lF, 0), f = J(hip, ps.lF, 2);
    limb(L, [hip[0], hip[1]], k, f, 'b', 'B'); boot(L, f[0], f[1], ps.bF, false); P.blit(L, 0, 0, { sep: 'K' }); }
  // head
  { const L = new Pix(RIN_W, RIN_H); L.stamp(neck[0] - 4 + ps.head[0], neck[1] - 9 + ps.head[1], HEADS[ps.expr] || HEADS.n); P.blit(L, 0, 0, { sep: 'K' }); }
  // front arm (+ frame-blade)
  { const L = new Pix(RIN_W, RIN_H), e = J(sh, ps.aF, 0), h = J(sh, ps.aF, 2);
    limb(L, [sh[0], sh[1]], e, h, 'T', 'c'); L.rect(h[0], h[1], 2, 2, 'f'); L.set(h[0], h[1] + 1, 'S');
    P.blit(L, 0, 0, { sep: 't' });
    if (ps.blade) { const B = new Pix(RIN_W, RIN_H), b = ps.blade; B.line(h[0] + b[0], h[1] + b[1], h[0] + b[2], h[1] + b[3], 'C', 2); B.line(h[0] + b[0], h[1] + b[1], h[0] + b[2], h[1] + b[3], 'w', 1); P.blit(B); } }
  P.outline('K');
  return P;
}

// --- animation poses ---------------------------------------------------------
const S0 = [[-3, 1], [-6, 3], [-8, 6]], S1 = [[-3, 2], [-6, 4], [-7, 7]], S2 = [[-3, 1], [-6, 2], [-9, 4]];
const SB = [[-4, 0], [-8, 0], [-12, 1]], SB2 = [[-4, 0], [-8, 1], [-12, -1]];      // streaming back
const SU = [[-3, -2], [-5, -5], [-6, -9]], SU2 = [[-3, -2], [-6, -5], [-5, -9]];    // flying up (falling)
const SD = [[-3, 3], [-4, 7], [-5, 10]];                                           // hanging (rising)

const RUNL = [ // [lF, lB, hipY, bF, bB]
  [[3, 4, 6, 10], [-2, 4, -6, 5], -10, 'flat', 'toe'],
  [[2, 5, 2, 10], [0, 4, -5, 4], -9, 'flat', 'toe'],
  [[0, 5, -2, 10], [3, 3, 0, 6], -10, 'flat', 'toe'],
  [[-2, 5, -5, 9], [4, 3, 5, 7], -11, 'back', 'flat'],
];
const RUNA = [ // [aF, aB] — opposite phase to legs
  [[-2, 3, -4, 5], [3, 3, 6, 2]],
  [[-1, 4, -3, 6], [2, 3, 5, 3]],
  [[1, 4, 2, 6], [0, 4, 0, 7]],
  [[3, 3, 6, 2], [-2, 3, -4, 5]],
];
function runFrame(i) {
  const a = i % 4, swap = i >= 4, L = RUNL[a], A = RUNA[a];
  return pose({
    hip: [0, L[2]], neck: [2, -8], lF: swap ? L[1] : L[0], lB: swap ? L[0] : L[1], bF: swap ? L[4] : L[3], bB: swap ? L[3] : L[4],
    aF: swap ? A[1] : A[0], aB: swap ? A[0] : A[1], scarf: i % 2 ? SB : SB2, head: [0, a === 1 ? 1 : 0],
  });
}
const AIRLEGS = { lF: [2, 3, 1, 7], lB: [-1, 4, -4, 7], bF: 'toe', bB: 'toe' };
const FALLLEGS = { lF: [2, 4, 3, 9], lB: [-2, 4, -3, 8], bF: 'toe', bB: 'toe' };

export const RIN_FRAMES = {
  idle0: pose({ scarf: S0 }),
  idle1: pose({ scarf: S1, head: [0, 1], aF: [1, 4, 1, 9], aB: [-1, 4, -2, 9] }),
  idle2: pose({ scarf: S1, head: [0, 1], aF: [1, 4, 1, 9], aB: [-1, 4, -2, 9], expr: 'b' }),
  idle3: pose({ scarf: S2 }),
  ...Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7].map((i) => ['run' + i, runFrame(i)])),
  jump0: pose({ ...AIRLEGS, hip: [0, -11], aF: [2, 2, 5, -1], aB: [-2, 3, -4, 5], scarf: SD, expr: 'u' }),
  jump1: pose({ ...AIRLEGS, hip: [0, -11], lF: [2, 3, 2, 8], aF: [3, 1, 6, -2], aB: [-2, 3, -5, 4], scarf: SD, expr: 'u' }),
  fall0: pose({ ...FALLLEGS, hip: [0, -11], aF: [3, 0, 5, -4], aB: [-3, 0, -5, -4], scarf: SU }),
  fall1: pose({ ...FALLLEGS, hip: [0, -11], lB: [-2, 4, -4, 7], aF: [3, 0, 6, -3], aB: [-3, 0, -6, -3], scarf: SU2 }),
  land0: pose({ hip: [0, -7], neck: [1, -7], lF: [3, 3, 2, 7], lB: [-3, 3, -3, 7], aF: [3, 3, 5, 5], aB: [-3, 3, -5, 5], scarf: SU, head: [0, 1] }),
  dash0: pose({ hip: [-1, -8], neck: [6, -5], head: [1, 0], lF: [-3, 2, -8, 3], lB: [-3, 4, -7, 7], bF: 'back', bB: 'back', aF: [-3, 1, -6, 2], aB: [-2, 3, -5, 5], scarf: [[-5, 0], [-10, 1], [-15, 1]], expr: 'a' }),
  dash1: pose({ hip: [-1, -8], neck: [6, -5], head: [1, 0], lF: [-3, 2, -8, 4], lB: [-3, 4, -7, 6], bF: 'back', bB: 'back', aF: [-3, 1, -6, 3], aB: [-2, 3, -5, 4], scarf: [[-5, 0], [-10, -1], [-15, 0]], expr: 'a' }),
  slide0: pose({ hip: [-3, -5], neck: [-4, -6], head: [0, 0], lF: [5, 1, 10, 4], lB: [4, 3, 8, 5], bF: 'flat', bB: 'flat', aF: [2, 3, 5, 4], aB: [-2, 3, -3, 5], scarf: [[-4, -1], [-8, -2], [-12, -1]], expr: 'a' }),
  wall0: pose({ hip: [1, -10], neck: [-1, -8], lF: [3, 2, 4, 6], lB: [1, 5, 2, 10], bF: 'toe', bB: 'toe', aF: [3, -1, 5, -4], aB: [2, 2, 5, 1], scarf: SU, head: [-1, 0] }),
  // ground combo 1: horizontal cut
  atk1_0: pose({ neck: [-1, -8], aF: [-3, 1, -6, -1], aB: [1, 3, 3, 4], scarf: S1, expr: 'a', blade: [0, 0, -5, -4], lF: [2, 5, 4, 10], lB: [-2, 5, -3, 10] }),
  atk1_1: pose({ hip: [1, -10], neck: [3, -8], aF: [4, 1, 8, 1], aB: [-3, 2, -5, 4], scarf: SB, expr: 'a', blade: [1, 0, 8, -1], lF: [3, 5, 6, 10], lB: [-2, 5, -4, 10] }),
  atk1_2: pose({ hip: [1, -10], neck: [3, -8], aF: [3, 3, 6, 5], aB: [-3, 2, -5, 4], scarf: SB2, expr: 'a', blade: [1, 1, 6, 5], lF: [3, 5, 6, 10], lB: [-2, 5, -4, 10] }),
  atk1_3: pose({ neck: [1, -8], aF: [2, 4, 3, 7], scarf: S2, lF: [2, 5, 4, 10], lB: [-2, 5, -3, 10] }),
  // combo 2: rising backhand
  atk2_0: pose({ neck: [1, -8], aF: [0, 4, 3, 7], aB: [-2, 3, -4, 4], scarf: S1, expr: 'a', blade: [1, 1, 6, 4], lF: [2, 5, 4, 10], lB: [-2, 5, -3, 10] }),
  atk2_1: pose({ hip: [2, -10], neck: [3, -8], aF: [4, -1, 7, -5], aB: [-3, 2, -6, 3], scarf: SB, expr: 'a', blade: [1, -1, 6, -7], lF: [3, 5, 6, 10], lB: [-3, 5, -5, 10] }),
  atk2_2: pose({ hip: [2, -10], neck: [2, -8], aF: [1, -3, 0, -8], aB: [-3, 2, -6, 3], scarf: SB2, expr: 'a', blade: [0, -1, -4, -6], lF: [3, 5, 6, 10], lB: [-3, 5, -5, 10] }),
  atk2_3: pose({ hip: [1, -10], neck: [1, -8], aF: [-1, 2, -3, 5], scarf: S2, lF: [2, 5, 4, 10], lB: [-2, 5, -3, 10] }),
  // combo 3: overhead finisher
  atk3_0: pose({ hip: [-1, -11], neck: [-2, -8], aF: [-1, -3, -4, -7], aB: [-2, -2, -5, -5], scarf: SD, expr: 'a', blade: [0, -1, -6, -5], lF: [2, 5, 3, 11], lB: [-2, 5, -3, 11] }),
  atk3_1: pose({ hip: [-1, -12], neck: [-2, -8], aF: [0, -4, -3, -8], aB: [-1, -3, -4, -6], scarf: SD, expr: 'a', blade: [0, -1, -5, -6], lF: [2, 6, 3, 12], lB: [-2, 6, -3, 12], bF: 'toe', bB: 'toe' }),
  atk3_2: pose({ hip: [3, -8], neck: [4, -7], aF: [4, 3, 8, 6], aB: [3, 3, 6, 5], scarf: SU, expr: 'a', blade: [1, 1, 7, 4], lF: [4, 4, 6, 8], lB: [-4, 4, -6, 8], head: [0, 1] }),
  atk3_3: pose({ hip: [3, -7], neck: [4, -7], aF: [4, 4, 7, 6], aB: [3, 3, 6, 6], scarf: SU2, expr: 'a', blade: [1, 1, 6, 2], lF: [4, 3, 6, 7], lB: [-4, 3, -6, 7], head: [0, 1] }),
  atk3_4: pose({ hip: [1, -9], neck: [2, -8], aF: [3, 3, 4, 6], scarf: S1, lF: [3, 5, 4, 9], lB: [-3, 5, -4, 9] }),
  // launcher (rising uppercut)
  up_0: pose({ hip: [0, -7], neck: [2, -7], aF: [1, 4, 4, 7], aB: [-3, 2, -5, 4], scarf: SU, expr: 'a', blade: [1, 1, 6, 3], lF: [3, 3, 3, 7], lB: [-3, 3, -3, 7] }),
  up_1: pose({ hip: [1, -12], neck: [1, -8], aF: [3, -3, 4, -8], aB: [-2, 3, -4, 6], scarf: SD, expr: 'u', blade: [0, -1, 1, -9], lF: [1, 6, 2, 12], lB: [-2, 5, -4, 9], bF: 'toe', bB: 'toe' }),
  up_2: pose({ ...AIRLEGS, hip: [1, -12], neck: [0, -8], aF: [1, -4, -1, -8], aB: [-2, 3, -4, 6], scarf: SD, expr: 'u', blade: [0, -1, -4, -7] }),
  // air attacks
  air1_0: pose({ ...AIRLEGS, hip: [0, -11], neck: [-1, -8], aF: [-3, 0, -6, -2], aB: [1, 3, 3, 4], scarf: SU, expr: 'a', blade: [0, 0, -5, -4] }),
  air1_1: pose({ ...AIRLEGS, hip: [0, -11], neck: [2, -8], aF: [4, 1, 8, 2], aB: [-3, 2, -5, 3], scarf: SB, expr: 'a', blade: [1, 0, 8, 1] }),
  air1_2: pose({ ...AIRLEGS, hip: [0, -11], neck: [2, -8], aF: [3, 3, 5, 6], aB: [-3, 2, -5, 3], scarf: SB2, expr: 'a', blade: [1, 1, 4, 7] }),
  air2_0: pose({ ...AIRLEGS, hip: [0, -11], neck: [1, -8], aF: [1, 4, 4, 6], aB: [-2, 3, -4, 4], scarf: SU, expr: 'a', blade: [1, 1, 6, 4] }),
  air2_1: pose({ ...AIRLEGS, hip: [0, -11], neck: [2, -8], aF: [4, -1, 7, -5], aB: [-3, 2, -6, 3], scarf: SB, expr: 'a', blade: [1, -1, 6, -7] }),
  air2_2: pose({ ...AIRLEGS, hip: [0, -11], neck: [1, -8], aF: [1, -3, -1, -8], aB: [-3, 2, -6, 3], scarf: SB2, expr: 'a', blade: [0, -1, -5, -5] }),
  // dive slam
  dive0: pose({ hip: [0, -13], neck: [2, -7], head: [0, 1], aF: [2, 4, 3, 8], aB: [1, 4, 2, 7], lF: [-2, -1, -5, -4], lB: [-3, 1, -7, -1], bF: 'back', bB: 'back', scarf: SU, expr: 'a', blade: [0, 2, 1, 10] }),
  dive1: pose({ hip: [0, -13], neck: [2, -7], head: [0, 1], aF: [2, 4, 3, 8], aB: [1, 4, 2, 7], lF: [-2, -1, -5, -5], lB: [-3, 1, -7, -2], bF: 'back', bB: 'back', scarf: SU2, expr: 'a', blade: [0, 2, 1, 10] }),
  // frame-shot
  shoot0: pose({ neck: [0, -8], aF: [4, 0, 8, 0], aB: [-2, 3, -3, 6], scarf: S1, expr: 'a', lF: [2, 5, 3, 10], lB: [-2, 5, -4, 10] }),
  shoot1: pose({ hip: [-1, -10], neck: [-1, -8], aF: [3, -1, 7, -1], aB: [-2, 3, -3, 6], scarf: SB, expr: 'a', lF: [2, 5, 3, 10], lB: [-2, 5, -4, 10] }),
  ashoot0: pose({ ...AIRLEGS, hip: [0, -11], aF: [4, 0, 8, 0], aB: [-2, 3, -3, 6], scarf: SU, expr: 'a' }),
  hurt0: pose({ hip: [-1, -11], neck: [-3, -7], head: [-1, 0], aF: [3, 0, 6, -2], aB: [-2, 0, -5, -3], lF: [3, 3, 5, 7], lB: [0, 5, 1, 9], bF: 'toe', bB: 'toe', scarf: [[2, 1], [5, 0], [8, 2]], expr: 'h' }),
  hurt1: pose({ hip: [-1, -11], neck: [-3, -7], head: [-1, 1], aF: [3, 1, 6, 0], aB: [-2, 1, -5, -1], lF: [3, 3, 6, 6], lB: [0, 5, 2, 9], bF: 'toe', bB: 'toe', scarf: [[2, 1], [5, 2], [8, 1]], expr: 'h' }),
  down0: pose({ hip: [-2, -4], neck: [-7, -2], head: [-2, 1], aF: [2, 2, 5, 3], aB: [-1, 2, -3, 3], lF: [5, 1, 10, 3], lB: [4, 2, 8, 4], scarf: [[1, 2], [4, 3], [6, 3]], expr: 'h' }),
};

export const RIN_ANIMS = {
  idle: { f: ['idle0', 'idle0', 'idle1', 'idle1', 'idle3', 'idle3', 'idle1', 'idle2'], fps: 5, loop: true },
  run: { f: ['run0', 'run1', 'run2', 'run3', 'run4', 'run5', 'run6', 'run7'], fps: 14, loop: true },
  jump: { f: ['jump0', 'jump1'], fps: 10, loop: false },
  fall: { f: ['fall0', 'fall1'], fps: 10, loop: true },
  land: { f: ['land0'], fps: 12, loop: false },
  dash: { f: ['dash0', 'dash1'], fps: 20, loop: true },
  slide: { f: ['slide0'], fps: 10, loop: true },
  wall: { f: ['wall0'], fps: 10, loop: true },
  atk1: { f: ['atk1_0', 'atk1_1', 'atk1_1', 'atk1_2', 'atk1_3'], fps: 24, loop: false },
  atk2: { f: ['atk2_0', 'atk2_1', 'atk2_1', 'atk2_2', 'atk2_3'], fps: 24, loop: false },
  atk3: { f: ['atk3_0', 'atk3_1', 'atk3_1', 'atk3_2', 'atk3_2', 'atk3_3', 'atk3_3', 'atk3_4'], fps: 24, loop: false },
  up: { f: ['up_0', 'up_0', 'up_1', 'up_1', 'up_2', 'up_2'], fps: 20, loop: false },
  air1: { f: ['air1_0', 'air1_1', 'air1_1', 'air1_2'], fps: 24, loop: false },
  air2: { f: ['air2_0', 'air2_1', 'air2_1', 'air2_2'], fps: 24, loop: false },
  dive: { f: ['dive0', 'dive1'], fps: 16, loop: true },
  shoot: { f: ['shoot0', 'shoot1', 'shoot0'], fps: 16, loop: false },
  ashoot: { f: ['ashoot0', 'ashoot0'], fps: 12, loop: false },
  hurt: { f: ['hurt0', 'hurt1'], fps: 10, loop: true },
  down: { f: ['down0'], fps: 4, loop: false },
};

export function addRinFrames(atlas) {
  for (const name in RIN_FRAMES) atlas.add('rin_' + name, drawRin(RIN_FRAMES[name]), RIN_OX, RIN_OY);
}
