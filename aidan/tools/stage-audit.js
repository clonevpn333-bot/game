// Stage audit: plays every scene and checks that every narrated action is visibly acted out.
// Run:  node aidan/tools/stage-audit.js [index.html|lamp.html] [-v]
// Needs Playwright (preinstalled in the dev container). Exits 1 if any action line shows nothing.
// "scene"    = the scene code itself moved/posed someone for that line
// "rules"    = the staging engine recognised the action (fight, pile, chase, vomit, fire, ...)
// "fallback" = only the generic nudge animated it (works, but worth hand-staging)
const {chromium}=require('playwright');const path=require('path');
const file=process.argv.find(a=>/\.html$/.test(a))||'index.html',verbose=process.argv.includes('-v');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:960,height:600}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.NOAUTO=1;localStorage.clear()});await p.goto('file://'+path.resolve(__dirname,'..',file));await p.waitForTimeout(500);
const res=await p.evaluate(async()=>{FAST=true;window.STAGE_AUDIT=true;$('menu').style.display='none';menu=()=>new Promise(()=>{});offerRelic=async()=>{};
 const LOG={};let CUR='';STAGELOG=[];const flush=()=>{(LOG[CUR]??=[]).push(...STAGELOG.splice(0))};
 let PICK=0;choose=o=>Promise.resolve((PICK++)%o.length);
 const R0=ph=>{S=fresh();placeLiving();resetAidan();mode='house';S.phase=ph||'r2';S.play=true;busy=true;store.run={stories:Object.keys(FRIEND_STORIES)};S.secret=2;socialState().hidden.photo=true;for(const id of pals)A_[id].bag={x:A_[id].x,y:A_[id].y};S.stageResolve=()=>{};PREVSIG=''};
 const timed=(f,ms=15000)=>Promise.race([Promise.resolve().then(f),new Promise((_,rj)=>setTimeout(()=>rj(new Error('timeout')),ms))]);
 const go=async(name,f,ph)=>{CUR=name;R0(ph);try{await timed(f)}catch(e){(LOG['!! '+name]??=[]).push({t:'CRASH: '+e.message})}flush();mode='house';QS=null};
 for(const key of Object.keys(FRIEND_SCENES).filter(k=>k!=='pooldate')){for(let rep=0;rep<5;rep++){PICK=rep;R0();const s=socialState(),q=s[key];for(let st=0;st<FRIEND_SCENES[key].length;st++){CUR=key+'#'+st;try{const [f,x]=meetingFor(key);S.floor=f;A_.you.floor=f;A_.you.x=x;cam.x=clamp(x-160,0,WORLD-W);for(const id of FRIEND_STORIES[key].cast){A_[id].floor=f;A_[id].x=x+(Math.random()*30-15)}QS={key,cast:FRIEND_STORIES[key].cast};PREVSIG='';await timed(()=>FRIEND_SCENES[key][st](q,s))}catch(e){(LOG['!! '+CUR]??=[]).push({t:'CRASH: '+e.message})}flush();QS=null;mode='house'}}}
 for(const key of Object.keys(ACTS))await go('act:'+key,async()=>{S.floor=1;for(const id of pals){A_[id].floor=1;A_[id].x=360+pals.indexOf(id)*30}A_.you.floor=1;A_.you.x=480;cam.x=330;await ACTS[key][1]()},'late');
 for(const key of Object.keys(CHAOS)){R0();if(!CHAOS[key].ok())continue;await go('chaos:'+key,async()=>{const c=CHAOS[key];S.floor=c.f;A_.you.floor=c.f;A_.you.x=c.x;cam.x=clamp(c.x-160,0,WORLD-W);await c.go()})}
 const extra={royale:()=>royale(),parentCall:()=>parentCall(),crackQuest:()=>crackQuest(),poolChaos:()=>poolChaos({}),biteChapter:async()=>{S.monster=true;S.aidanIn=true;await biteChapter()},
  beatdown1:()=>seanBeatdown(1),beatdown2:()=>seanBeatdown(2),beatdown3:()=>seanBeatdown(3),
  intro:()=>intro(),act2:()=>act2(),sleepover:()=>sleepover(),transform:async()=>{S.aidanIn=true;AI.floor=0;AI.x=400;await transformScene()},monsterDeath:async()=>{S.monster=true;S.aidanIn=true;AI.floor=0;AI.x=400;await monsterDeath()},
  defend:()=>{stagePlay=async()=>'go';return defendHouse()},chair:async()=>{S.floor=1;for(const id of pals){A_[id].floor=1;A_[id].bag={x:A_[id].x,y:160}}await davidChair()},fb1:()=>FLASH.fb1(),fb2:()=>FLASH.fb2(),fb3:()=>FLASH.fb3(),fb4:()=>FLASH.fb4(),gHasan:()=>playGroup('gHasan'),gArjun:()=>playGroup('gArjun'),gDavid:()=>playGroup('gDavid'),gOmer:()=>playGroup('gOmer'),gNivaan:()=>playGroup('gNivaan'),gSean:()=>playGroup('gSean'),gCorey:()=>playGroup('gCorey'),epilogueAll:()=>epilogue([...pals]),epilogueFew:()=>{loseFriend(A_.david);loseFriend(A_.sean);return epilogue(livingFriends())}};
 stagePlay=async()=>'ready';
 for(const [k,f] of Object.entries(extra))await go(k,f);
 // every narration line in the file, fed straight to the engine with everyone on screen
 const SRC=[...document.querySelectorAll('script')].map(s=>s.textContent).join('\n');const lines=new Set();for(const m of SRC.matchAll(/\['',\s*'((?:[^'\\]|\\.)*)'\]|\bN\('((?:[^'\\]|\\.)*)'\)/g)){const t=(m[1]??m[2]).replace(/\\'/g,"'");if(!t.includes("'+"))lines.add(t)}
 const STAT=[];for(const t of lines){R0();FAST=false;S.floor=0;cam.x=300;for(const id of pals){A_[id].x=360+pals.indexOf(id)*22;A_[id].floor=0}A_.you.x=330;let did=0,fb=0;try{const s0=stageSig();autoStage(t);const au=stageSig()!==s0||AUTO.length;did=stageLine(t)||(au?1:0);if(!did&&stageFallbackFor(t))fb=stageFallback(t)}catch(e){}endBeats();FAST=true;STAT.push({t,did,fb,action:stageFallbackFor(t)})}
 window.__stat=STAT;
 window.__seen=Object.values(LOG).flat().map(x=>x.t);const out={};for(const [k,l] of Object.entries(LOG)){const act=l.filter(x=>x.action),crash=l.filter(x=>/^CRASH/.test(x.t||''));out[k]={lines:l.length,action:act.length,scene:act.filter(x=>x.explicit||x.auto).length,rules:act.filter(x=>!x.explicit&&!x.auto&&x.did).length,fallback:act.filter(x=>!x.explicit&&!x.auto&&!x.did&&x.fb).map(x=>x.t.slice(0,110)),dead:act.filter(x=>!x.explicit&&!x.auto&&!x.did&&!x.fb).map(x=>x.t.slice(0,110)+' ['+x.mode+'/'+x.scene+']'),crash:crash.map(x=>x.t)}}return {out,seen:window.__seen,stat:window.__stat}});const seen=new Set(res.seen.map(t=>t.trim()));const fs=require('fs');const src=fs.readFileSync(path.resolve(__dirname,'..',file),'utf8');const all=new Set();for(const m of src.matchAll(/\['',\s*'((?:[^'\\]|\\.)*)'\]|\bN\('((?:[^'\\]|\\.)*)'\)/g)){const t=(m[1]??m[2]).replace(/\\'/g,"'");if(!/['+]/.test(t.slice(-1))&&!t.includes("'+"))all.add(t.trim())}const unseen=[...all].filter(t=>!seen.has(t));
let T={lines:0,action:0,scene:0,rules:0,fallback:0,dead:0};const fb=[],dead=[],crash=[];
for(const [k,v] of Object.entries(res.out)){for(const n of ['lines','action','scene','rules'])T[n]+=v[n];T.fallback+=v.fallback.length;T.dead+=v.dead.length;for(const t of new Set(v.fallback))fb.push(k+': '+t);for(const t of new Set(v.dead))dead.push(k+': '+t);for(const t of v.crash)crash.push(k+': '+t)}
console.log(file+': '+T.lines+' narrated lines, '+T.action+' describe action → scene-staged '+T.scene+', engine rules '+T.rules+', fallback only '+T.fallback+', NOTHING '+T.dead);
if(verbose&&fb.length)console.log('\nFALLBACK ONLY (worth hand-staging):\n'+[...new Set(fb)].join('\n'));
if(dead.length)console.log('\nNOTHING MOVES:\n'+[...new Set(dead)].join('\n'));
if(crash.length)console.log('\nCRASHES:\n'+crash.join('\n'));
const st=res.stat||[],stA=st.filter(x=>x.action);console.log('engine check on all '+st.length+' narration lines in the file: '+stA.length+' describe action, '+stA.filter(x=>x.did).length+' matched a specific rule, '+stA.filter(x=>!x.did).length+' generic fallback only'+(process.argv.includes('-f')?'\n'+stA.filter(x=>!x.did).map(x=>'  '+x.t.slice(0,120)).join('\n'):''));console.log('coverage: '+(all.size-unseen.length)+'/'+all.size+' fixed narration lines reached'+(process.argv.includes('-u')?'\nUNSEEN:\n'+unseen.join('\n'):''));console.log(errs.slice(0,5).join('\n')||'no page errors');await b.close();process.exit(dead.length||crash.length?1:0)})();
