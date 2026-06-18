'use strict';
/* Validates the SHIPPED single-file index.html: extracts its inlined ES
   module, swaps the Three CDN import for the local install, stubs WebGL +
   DOM, and drives a full Show through the real Engine loop (every round's
   3D scene, every UI screen, the customise preview, FX and camera). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const THREE = require('three');

function ctx2d() {
    const grad = { addColorStop() {} };
    return new Proxy({}, { get: (o, k) => {
        if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad;
        if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
        if (k === 'measureText') return () => ({ width: 10 });
        if (k === 'canvas') return { width: 128, height: 128 };
        return () => {};
    }});
}
class El {
    constructor(tag) { this.tagName = tag; this.children = []; this.style = {}; this.parentElement = null;
        this._html = ''; this.className = ''; this.width = 128; this.height = 128;
        this.clientWidth = 300; this.clientHeight = 430; this.onclick = null; this.textContent = '';
        this.classList = { add() {}, remove() {} }; }
    appendChild(c) { this.children.push(c); if (c) c.parentElement = this; return c; }
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); if (c) c.parentElement = null; }
    remove() { if (this.parentElement) this.parentElement.removeChild(this); }
    setAttribute() {} getAttribute() { return null; } addEventListener() {}
    getContext() { return ctx2d(); }
    set innerHTML(v) { this._html = v; this.children = []; } get innerHTML() { return this._html; }
}
const appEl = new El('div');
const documentMock = { head: new El('head'), body: new El('body'),
    createElement: t => new El(t), getElementById: () => appEl };
const store = {};
const windowMock = { addEventListener() {}, devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    requestAnimationFrame: () => 0 };

// ---- extract the inlined module from the shipped index.html ----------
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!m) throw new Error('no module script found in index.html');
let mod = m[1].replace(/import \* as THREE from ['"]three['"];?/, '');
if (!/class Bean|const CFG|class BeanView|Engine\.start/.test(mod))
    throw new Error('index.html module missing core definitions');

const driver = `
(function(){
  THREE.WebGLRenderer = function(){ this.domElement = document.createElement('canvas'); this.shadowMap = {};
    this.setPixelRatio = function(){}; this.setSize = function(){}; this.render = function(){}; };
  Engine.start();
  let ts = 16; const step = () => { ts += 16; Engine._loop(ts); };
  Engine._loop(ts);
  Game.screen = 'customize'; for (let i=0;i<4;i++) step();
  Game.cycleCosmetic('color',1); Game.cycleCosmetic('pattern',1); Game.cycleEmote(0,1); step();
  Game.screen='howto'; step(); Game.screen='trophies'; step(); Game.toMenu(); step();

  Game.startShow(); let g=0, seen=-1; const trace=[];
  while (Game.screen==='playing' && g++<60*200){
    const r=Game.show.round;
    if (Game.show.index!==seen){ seen=Game.show.index; trace.push(r.def.name+'/'+r.kind); }
    if (r.live){
      if (r.kind==='race'){ r.qualifyCount=1; r.player.y=r.finishY-5; }
      else if (r.kind==='survival'){ if (r.timer>0.06) r.timer=0.05; }
      else if (r.kind==='final'){ for (const b of r.beans) if (!b.isPlayer){ b.alive=false; b.eliminated=true; } }
    }
    step();
  }
  if (Game.screen!=='victory') throw new Error('show did not reach victory: '+Game.screen+' ['+trace.join(' -> ')+']');
  for (let i=0;i<3;i++) step();
  Game.toMenu(); step();

  // a few hundred AI-driven real frames (views + camera under motion, all states)
  Game.startShow();
  for (let i=0;i<260;i++){ const r=Game.show.round; if (Game.screen!=='playing') break; const p=r.player;
    if (r.live){ r.thinkFn(p,r,1/60); const ai=p.ai; Input.keys={};
      if (ai.my<-0.3) Input.keys.ArrowUp=true; else if (ai.my>0.3) Input.keys.ArrowDown=true;
      if (ai.mx<-0.3) Input.keys.ArrowLeft=true; else if (ai.mx>0.3) Input.keys.ArrowRight=true;
      Input._justPressed={}; if (ai.jump) Input._justPressed.Space=true; if (ai.dive) Input._justPressed.ShiftLeft=true; }
    step();
  }
  console.log('Show: '+trace.join(' -> '));
  console.log('ARTIFACT OK');
})();
`;

const sandbox = { THREE, console, Math, Date, JSON, document: documentMock, window: windowMock,
    requestAnimationFrame: () => 0, setTimeout: () => 0, clearTimeout: () => 0, performance: { now: () => Date.now() } };
try { vm.runInNewContext(mod + '\n;\n' + driver, sandbox, { filename: 'index-module.js' }); }
catch (e) { console.error('ARTIFACT TEST FAILED:', e && e.stack ? e.stack : e); process.exit(1); }
