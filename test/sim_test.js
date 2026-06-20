'use strict';
/* Dev sim check: loads the build/ simulation modules and runs every SHOW
   round to completion + a scripted Show win. (Throwaway; the shipped file
   is gated by test/artifact_test.js.) */
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const store = {};
const sandbox = { console, Math, Date, JSON,
    window: { addEventListener() {}, localStorage: {
        getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } } } };
const root = path.join(__dirname, '..', 'build');
let code = '';
for (const f of ['config.js', 'utils.js', 'input.js', 'save.js', 'entities.js', 'rounds.js', 'game.js'])
    code += fs.readFileSync(path.join(root, f), 'utf8') + '\n;\n';
code += `
(function(){
  function setI(ai){ Input.keys={}; if(ai.my<-0.3)Input.keys.ArrowUp=1; else if(ai.my>0.3)Input.keys.ArrowDown=1;
    if(ai.mx<-0.3)Input.keys.ArrowLeft=1; else if(ai.mx>0.3)Input.keys.ArrowRight=1;
    Input._justPressed={}; if(ai.jump)Input._justPressed.Space=1; if(ai.dive)Input._justPressed.ShiftLeft=1; }
  function field(){ const A={color:'#ff7eb6',pattern:'spots',upper:'cap',lower:'shoes',visor:'#3fd2ff'};
    const a=[new Bean({x:0,y:0,isPlayer:true,name:'You',appearance:A,emoteList:EMOTES.slice(0,4)})];
    for(let i=0;i<CFG.FIELD_SIZE-1;i++) a.push(new Bean({x:0,y:0,name:'B'+i,appearance:A,emoteList:EMOTES.slice(0,4)})); return a; }
  const out=[];
  for(const def of SHOW){ const r=Rounds.create(def,field()); const p=r.player; let f=0;
    while(!r.done && f<60*150){ if(r.live){r.thinkFn(p,r,1/60);setI(p.ai);} else {Input.keys={};Input._justPressed={};} r.update(1/60);
      if(Number.isNaN(p.x)||Number.isNaN(p.y)) throw new Error('NaN '+def.name); f++; }
    if(!r.done) throw new Error('timeout '+def.name);
    out.push('  '+def.name.padEnd(14)+' '+r.result.outcome+' q='+r.qualifiedSoFar()+' alive='+r.aliveSoFar()); }
  Game.init(); Game.startShow(); let g=0,seen=-1,tr=[];
  while((Game.screen==='playing' || Game.screen==='loading') && g++<60*360){ const r=Game.show.round;
    if(Game.show.index!==seen){seen=Game.show.index;tr.push(r.def.name+'/'+r.kind+'#'+r.beans.length+(r.player?'[a'+ +r.player.alive+'e'+ +r.player.eliminated+'x'+ +r.player.exited+'f'+ +r.player.falling+']':'[NOPLAYER]'));}
    if(r && !r.player) throw new Error('no player @ '+r.def.name+' | trace: '+tr.join('  '));
    if(r.live){ if(r.kind==='race'||r.kind==='tiptoe'||r.kind==='climb'){r.qualifyCount=1;r.player.falling=false;r.player.z=0;r.player.y=r.finishY-5;}
      else if(r.kind==='mountain'){r.player.falling=false;r.player.z=0;r.player.y=r.finishY-5;}
      else if(r.kind==='survival'){if(r.timer>0.06)r.timer=0.05;}
      else if(r.kind==='tag'){r.player.hasTail=true; if(r.timer>0.06)r.timer=0.05;}
      else if(r.kind==='final'){for(const b of r.beans)if(!b.isPlayer){b.alive=false;b.eliminated=true;}} }
    Input.keys={};Input._justPressed={}; Game.update(1/60); }
  if(Game.screen!=='victory') throw new Error('scripted win -> '+Game.screen+' ['+tr.join(' -> ')+']');
  out.push('  Scripted win -> victory ('+SHOW.length+' rounds, crowns='+Save.data.crowns+')');
  console.log('Sim ('+SHOW.length+' rounds):'); console.log(out.join('\\n')); console.log('SIM OK');
})();`;
try { vm.runInNewContext(code, sandbox, { filename: 'sim.js' }); }
catch (e) { console.error('SIM FAILED:', e && e.stack ? e.stack : e); process.exit(1); }
