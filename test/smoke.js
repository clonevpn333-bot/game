'use strict';

/* =====================================================================
   Headless smoke test for Bean Royale.
   Mocks a 2D canvas + DOM, loads every game module into one VM context,
   then drives the player like an AI through:
     1. each round builder to completion, and
     2. a full Game show flow.
   Exits non-zero on any thrown error, timeout, or NaN position.
   Run:  node test/smoke.js
   ===================================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---- canvas 2D mock -------------------------------------------------
function makeCtx() {
    const grad = { addColorStop() {} };
    const noop = () => {};
    return {
        canvas: { width: 1280, height: 720 },
        save: noop, restore: noop, translate: noop, rotate: noop, scale: noop, clip: noop,
        beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop, arc: noop, arcTo: noop,
        ellipse: noop, quadraticCurveTo: noop, rect: noop, fill: noop, stroke: noop,
        fillRect: noop, strokeRect: noop, clearRect: noop, setLineDash: noop,
        fillText: noop, strokeText: noop,
        measureText: (s) => ({ width: (s ? s.length : 0) * 7 }),
        createLinearGradient: () => grad, createRadialGradient: () => grad,
        fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '', textAlign: 'left',
        textBaseline: 'top', globalAlpha: 1, lineCap: 'butt', lineJoin: 'miter',
        imageSmoothingEnabled: false,
    };
}

function makeEl() {
    return {
        width: 1280, height: 720, style: {},
        getContext: () => makeCtx(),
        addEventListener: () => {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
    };
}

const store = {};
const sandbox = {
    console,
    Date, Math, JSON,
    requestAnimationFrame: () => 0,
    window: {
        addEventListener: () => {},
        localStorage: {
            getItem: (k) => (k in store ? store[k] : null),
            setItem: (k, v) => { store[k] = String(v); },
        },
    },
    document: { getElementById: () => makeEl() },
};
sandbox.window.requestAnimationFrame = sandbox.requestAnimationFrame;

// ---- extract the inlined game scripts from the single-file index.html
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('<!-- GAME:START');
const end = html.indexOf('<!-- GAME:END');
if (start < 0 || end < 0) throw new Error('GAME markers not found in index.html');
const region = html.slice(start, end);
let code = '';
const re = /<script>([\s\S]*?)<\/script>/g;
let m, blocks = 0;
while ((m = re.exec(region))) { code += m[1] + '\n;\n'; blocks++; }
if (blocks < 8) throw new Error('expected >=8 inlined game scripts, found ' + blocks);
if (!code.includes('const CFG') || !code.includes('class Bean'))
    throw new Error('inlined scripts missing core definitions');

// ---- driver appended into the same scope ----------------------------
code += `
(function driver(){
  const ctx = document.getElementById('gc').getContext('2d');
  const APP = { color:'#ff7eb6', pattern:'spots', upper:'cap', lower:'shoes', visor:'#3fd2ff' };

  function setInput(ai){
    Input.keys = {};
    if (ai.my < -0.3) Input.keys.ArrowUp = true; else if (ai.my > 0.3) Input.keys.ArrowDown = true;
    if (ai.mx < -0.3) Input.keys.ArrowLeft = true; else if (ai.mx > 0.3) Input.keys.ArrowRight = true;
    Input._justPressed = {};
    if (ai.jump) Input._justPressed.Space = true;
    if (ai.dive) Input._justPressed.ShiftLeft = true;
  }
  function clearInput(){ Input.keys = {}; Input._justPressed = {}; }

  function field(){
    const arr = [];
    const p = new Bean({ x:0,y:0,isPlayer:true,name:'You',appearance:APP,emoteList:EMOTES.slice(0,4) });
    arr.push(p);
    for (let i=0;i<CFG.FIELD_SIZE-1;i++)
      arr.push(new Bean({ x:0,y:0,name:'B'+i,appearance:APP,emoteList:EMOTES.slice(0,4) }));
    return arr;
  }

  const out = [];

  // 1) each builder to completion
  for (const def of SHOW){
    const beans = field();
    const r = Rounds.create(def, beans);
    const p = r.player;
    let f = 0; const cap = 60*150;
    while (!r.done && f < cap){
      if (r.live){ r.thinkFn(p, r, 1/60); setInput(p.ai); } else clearInput();
      r.update(1/60);
      r.draw(ctx);
      if (Number.isNaN(p.x) || Number.isNaN(p.y) || Number.isNaN(p.z))
        throw new Error('NaN on player in ' + def.name);
      f++;
    }
    if (!r.done) throw new Error('Round timed out: ' + def.name + ' (frames=' + f + ')');
    out.push('  ' + def.name.padEnd(14) + ' done in ' + String(f).padStart(4) +
             ' frames | outcome=' + r.result.outcome +
             ' qualified=' + r.qualifiedSoFar() + ' alive=' + r.aliveSoFar());
  }

  // 2) full Game show flow (menu -> rounds -> result screen)
  Game.init();
  // exercise menu render + a customise round-trip
  Game._render();
  Game.screen = 'customize'; Game._render();
  Game.screen = 'trophies';  Game._render();
  Game.screen = 'howto';     Game._render();
  Game.toMenu();
  Game.startShow();
  let f = 0; const cap = 60*400;
  while (f < cap){
    if (Game.screen === 'playing'){
      const r = Game.show.round, p = r.player;
      if (r.live){ r.thinkFn(p, r, 1/60); setInput(p.ai); } else clearInput();
    } else clearInput();
    Game._update(1/60);
    Game._render();
    if (Game.screen === 'eliminated' || Game.screen === 'victory') break;
    f++;
  }
  if (Game.screen !== 'eliminated' && Game.screen !== 'victory')
    throw new Error('Show flow never reached a result screen (frames=' + f + ', screen=' + Game.screen + ')');
  out.push('  Show flow      ended on "' + Game.screen + '" after ' + f + ' frames');

  // 2b) scripted win through the REAL pipeline (race -> survival -> final -> victory)
  Game.toMenu(); Game.startShow();
  let g = 0; const trace = []; let seen = -1;
  while (Game.screen === 'playing' && g++ < 60 * 200) {
    const r = Game.show.round;
    if (Game.show.index !== seen) { seen = Game.show.index; trace.push('R' + seen + ' ' + r.def.name + '/' + r.kind + ' beans=' + r.beans.length); }
    if (r.live) {
      if (r.kind === 'race') { r.qualifyCount = 1; r.player.y = r.finishY - 5; }
      else if (r.kind === 'survival') { if (r.timer > 0.06) r.timer = 0.05; }
      else if (r.kind === 'final') { for (const b of r.beans) if (!b.isPlayer) { b.alive = false; b.eliminated = true; } }
    }
    if (r.result && trace[trace.length - 1].indexOf('=>') < 0) trace[trace.length - 1] += ' => ' + r.result.outcome;
    clearInput();
    Game._update(1/60); Game._render();
  }
  if (Game.screen !== 'victory') throw new Error('Scripted win never reached victory (got ' + Game.screen + ')\\nTrace:\\n' + trace.join('\\n'));
  out.push('  Scripted win   reached "victory" ✔  (crowns=' + Save.data.crowns + ')');

  // 3) explicit coverage of result screens + trophy logic
  Save.recordWin(true);                                  // crowned + flawless
  for (let k = 0; k < 5; k++) Save.recordWin(false);     // streak -> infallible
  Game.info = {}; Game.screen = 'victory'; Game._render();
  Game.info = { roundName: 'Door Dash', place: 8, roundsCleared: 1, totalRounds: SHOW.length };
  Game.screen = 'eliminated'; Game._render();
  Save.data.color     = COLORS.findIndex(c => c.rarity === 'legendary');
  Save.data.pattern   = PATTERNS.findIndex(c => c.rarity === 'legendary');
  Save.data.faceplate = FACEPLATES.findIndex(c => c.rarity === 'legendary');
  Save.data.upper     = COSTUMES_UPPER.findIndex(c => c.rarity === 'legendary');
  Save.checkHeadTurner();
  Game.screen = 'customize'; Game._render();
  if (!Save.has('head_turner')) throw new Error('head_turner did not unlock with all-legendary loadout');
  if (!Save.has('infallible'))  throw new Error('infallible did not unlock after a 5+ win streak');
  if (!Save.has('crowned'))     throw new Error('crowned did not unlock after a win');

  // 4) render every cosmetic / emote combo so no switch-case throws
  const lowers = COSTUMES_LOWER.map(c => c.prop);
  for (const pat of PATTERNS.map(p => p.type))
    for (const up of COSTUMES_UPPER.map(c => c.prop)) {
      const b = new Bean({ x: 200, y: 200, isPlayer: true, name: 'C',
        appearance: { color: '#6cc6ff', pattern: pat, upper: up, lower: U.pick(lowers), visor: '#ffd23f' } });
      b.drawShadow(ctx, { x: 0, y: 0 }); b.draw(ctx, { x: 0, y: 0 });
    }
  for (const lo of lowers) {
    const b = new Bean({ x: 0, y: 0, name: 'L',
      appearance: { color: '#fff', pattern: 'solid', upper: 'none', lower: lo, visor: '#fff' } });
    b.draw(ctx, { x: 0, y: 0 });
  }
  for (const em of EMOTES) {
    const b = new Bean({ x: 0, y: 0, name: 'E',
      appearance: { color: '#fff', pattern: 'solid', upper: 'none', lower: 'none', visor: '#fff' } });
    b.emoteAnim = em.anim; b.emoteName = em.name; b.emoteT = 1; b.draw(ctx, { x: 0, y: 0 });
  }
  out.push('  Cosmetics      rendered ' + PATTERNS.length + ' patterns x ' +
           COSTUMES_UPPER.length + ' uppers, ' + lowers.length + ' lowers, ' + EMOTES.length + ' emotes ✔');

  console.log('Round + show simulation:');
  console.log(out.join('\\n'));
  console.log('Trophies unlocked: ' + Object.keys(Save.data.achievements).join(', ') || '(none)');
  console.log('SMOKE OK');
})();
`;

try {
    vm.runInNewContext(code, sandbox, { filename: 'beanroyale-bundle.js' });
} catch (e) {
    console.error('SMOKE FAILED:', e && e.stack ? e.stack : e);
    process.exit(1);
}
