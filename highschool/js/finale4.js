'use strict';
/* =====================================================================
   HIGHSCHOOL REMASTERED — INSPECTION DAY, PLAYED NOT PICKED
   The finale (js/finale3.js) keeps its story, but its three menus are
   now things you do in the room:
   • finPickAlly: LOCKDOWN. Your people are standing in the room. Walk up
     to the one you want and press E, or walk up to the obstacle and do
     it yourself.
   • finWitness: SHOWDOWN. A teacher lies. The people who can prove it
     are in the crowd holding what they found (Abby's sketchbook, Paul's
     notebook, Cheeks's laptop, the kids you saved...). Run to the right
     one before the inspectors lose interest (a timer). Paper evidence is
     in David's File.
   • finHold: THE TURN. HOLD THE LINE, real time: three lanes, the
     teachers push, you run between them pressing E; your allies push
     with you, and everything you did over two weeks crashes in.
   While a stage is live the room's edges and doors are shut.
   ===================================================================== */
const FST={on:false,spots:[],res:null,timer:0,len:0,banner:'',sub:''};
function finClearSpots(){for(const s of FST.spots){const i=SPOTS.indexOf(s);if(i>=0)SPOTS.splice(i,1)}FST.spots=[]}
function finStage(room,list,opts){opts=opts||{};
 return new Promise(res=>{
  finClearSpots();FST.on=true;FST.banner=opts.banner||'';FST.sub=opts.sub||'';FST.len=opts.time||0;FST.timer=opts.time?T+opts.time:0;
  const done=v=>{if(!FST.on)return;FST.on=false;FST.timer=0;finClearSpots();res(v)};FST.res=done;
  for(const it of list){const s={room,period:[0,1,2,3,4,5,6,7,8],x:Math.round(it.x),y:it.y||150,label:it.label,short:it.short||'E',free:1,fin:1,fwho:it.who,
   run:async()=>{done(it.v);return 'ended'}};FST.spots.push(s);SPOTS.push(s)}
  D.room=room;busy=false;roam();
  if(opts.hint&&!TEST)toast(opts.hint);
  if(TEST&&list.length)setTimeout(()=>done(list[TEST.finPick?TEST.finPick(list):0].v),0)});
}
window.finStage=finStage;
/* the stage holds you in the room */
{const _e=edge;edge=function(s){if(FST.on||FH.on)return;return _e(s)}}
{const _td=throughDoor;throughDoor=async function(d){if(FST.on||FH.on)return;return _td(d)}}
/* the witness timer runs out */
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(FST.on&&FST.timer&&T>FST.timer&&!busy)FST.res&&FST.res(null)}}
{const _do=HOOK.drawOver;HOOK.drawOver=(...a)=>{_do&&_do(...a);if(!FST.on||TEST||!FST.banner)return;
 const w=Math.max(pxw?pxw(FST.banner):FST.banner.length*4,FST.sub.length*4)+14,x=160-w/2;R(x,26,w,FST.sub?20:12,'rgba(10,8,16,.82)');R(x,26,w,1,'#ff6a5a');
 pxc(FST.banner,160,29,'#ffd27a');if(FST.sub)pxc(FST.sub,160,37,'#f4ead8');
 if(FST.timer){const k=Math.max(0,(FST.timer-T)/FST.len);R(x,26+(FST.sub?20:12),Math.round(w*k),2,k<.3?'#ff4040':'#ffd27a')}}}

/* ---------- 1. LOCKDOWN: walk up to who you want ---------- */
async function finPickAlly(o,k,pool){
 const cands=[...new Set([k].concat(o.pref.filter(p=>pool.includes(p))).concat(pool))].filter(p=>p&&K[p]&&!FIN.used[p]&&!(D.dead&&D.dead[p])).slice(0,3);
 const xs=[58,82,106];
 for(let i=0;i<cands.length;i++){const id=cands[i];if(!A[id]){put(id,-14-i*14,1,{y:150});walk(id,xs[i],140)}}
 await wait(TEST?0:700);
 const ox=o.room==='corridor'?262:o.room==='hall'?210:196;
 const list=cands.map((id,i)=>({x:xs[i],y:150,label:'Send '+K[id].n,short:K[id].n.split(' ')[0].toUpperCase(),v:id,who:id}));
 list.push({x:ox,y:150,label:'Do it yourself',short:'YOU',v:null});
 const pick=await finStage(o.room,list,{banner:o.label,sub:'WALK UP TO SOMEONE · OR DO IT YOURSELF',hint:'Your people are here. Walk up to who you want, or to the obstacle.'});
 busy=true;setPanel('talk');
 for(const id of cands)if(id!==pick&&A[id]){walk(id,-30,120).then(()=>remove(id))}
 return pick}
window.finPickAlly=finPickAlly;

/* ---------- 2. SHOWDOWN: call the right witness ---------- */
function holderOf(k){
 if(k.startsWith('saved_'))return k.slice(6);
 return {sketchbook:'abby',voicenote:K.stella&&!(D.dead||{}).stella?'stella':'sean',seats:'pauljones',hatchkey:'jacob',timesheets:'adam',cheekscam:'cheeks',finch:'oliver'}[k]||'david'}
async function finWitness(o,evs){
 const spots=[],free=[24,44,276,300,256,64];let fi=0;
 const people={};evs.forEach((e,i)=>{const h=holderOf(e.k);if(h==='david'||!K[h]||(D.dead&&D.dead[h]))return;(people[h]=people[h]||[]).push(i)});
 for(const h in people){if(!A[h]){if(fi>=free.length)continue;put(h,free[fi++],1,{y:162})}}
 for(const h in people){if(!A[h])continue;const i=people[h][0],e=evs[i];
  spots.push({who:h,x:A[h].x,y:A[h].y,label:'Call '+K[h].n+' up ('+e.t+')',short:({sketchbook:'SKETCHES',voicenote:'VOICE',seats:'NOTEBOOK',hatchkey:'KEY',timesheets:'SHEETS',cheekscam:'FOOTAGE',finch:'1987'})[e.k]||(e.k.startsWith('saved_')?'WITNESS':K[h].n.split(' ')[0].toUpperCase()),v:i})}
 const paper=evs.map((e,i)=>[e,i]).filter(([e])=>holderOf(e.k)==='david');
 if(paper.length&&A.david)spots.push({who:'david',x:A.david.x,y:A.david.y,label:'Open the File with David',short:'FILE',v:'file'});
 /* the witnesses step forward into a front row so you can see who has what */
 {const row=spots.map(sp=>A[sp.who]).filter(a=>a&&a.y>128);
  row.sort((a,b)=>a.x-b.x);const n=row.length;row.forEach((a,i)=>{const nx=Math.round(n>1?30+i*(260/(n-1)):160);tw(a,{x:nx,y:164},450);a.noPush=1});
  await wait(TEST?0:500)}
 const lie=(o.line.split(/[.!?]/)[0]||'').toUpperCase().replace(/[’']/g,'').slice(0,40);
 let v=await finStage('hall',spots,{banner:K[o.t].n.toUpperCase()+' IS LYING',sub:'FIND WHO CAN PROVE IT',time:26,hint:'Run to whoever can prove it. The inspectors won’t wait.'});
 busy=true;setPanel('talk');
 if(v==='file'){const c=await choose(paper.map(([e])=>e.t).concat(['Close the File.']),'David opens the File. What goes on the screen?');v=c<paper.length?paper[c][1]:null}
 if(v==null){await N(pick(['Too slow. The inspectors are looking at their watches.','You hesitate. Somebody in the hall laughs.']));return evs.length}
 return v}
window.finWitness=finWitness;

/* ---------- 3. THE TURN: HOLD THE LINE ---------- */
const FH={on:false,P:[0,0,0],X:[96,160,224],t0:0,len:30,atk:0,nextAtk:0,freeze:0,lock:[0,0,0],rate:.09,help:0,ev:[],res:null,boss:false};
async function finHold(helpers){
 if(TEST)return true;
 const teachers=['coach','voss','kim','shermian'].filter(t=>A[t]&&!A[t].dead);
 teachers.forEach((t,i)=>{A[t].pose=null;tw(A[t],{x:FH.X[i%3]+(i>2?12:0),y:132},500)});
 const kids=(helpers||[]).filter(k=>A[k]);kids.forEach((k,i)=>tw(A[k],{x:FH.X[i%3]+(i%2?-10:10),y:150},500));
 Object.assign(FH,{on:true,P:[0,0,0],t0:T,atk:1,nextAtk:T+3,freeze:0,lock:[0,0,0],rate:.075+.012*teachers.length,help:Math.min(.05,.012*kids.length),boss:false,teachers});
 FH.ev=finCameos();
 A.you.x=160;A.you.y=156;cue('fight',true);
 return new Promise(res=>{FH.res=ok=>{FH.on=false;busy=true;setPanel('talk');for(const t of teachers)if(A[t])pose(t,null);res(ok)};busy=false;roam();toast('HOLD THE LINE. Run to whichever side they’re breaking. E to push.')});
}
window.finHold=finHold;
{const _act=INPUT.act;INPUT.act=function(){if(FH.on){const i=FH.X.reduce((b,x,j)=>Math.abs(x-A.you.x)<Math.abs(FH.X[b]-A.you.x)?j:b,0);
  if(Math.abs(FH.X[i]-A.you.x)<26){FH.P[i]=Math.max(0,FH.P[i]-.11);SFX.smack&&SFX.smack();pose('you','grab');A.you._pt=T+.15;shake(.15)}return}
 return _act.apply(this,arguments)}}
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(!FH.on||TEST)return;
 const el=T-FH.t0;
 if(A.you._pt&&T>A.you._pt){pose('you',null);A.you._pt=0}
 if(T>FH.nextAtk){FH.atk=(Math.random()*3)|0;FH.nextAtk=T+2.5+Math.random()*2.5}
 const fr=T<FH.freeze;
 for(let i=0;i<3;i++){let r=(i===FH.atk?FH.rate:FH.rate*.28)*(fr?0:1);if(FH.boss&&i===1)r*=1.8;FH.P[i]=Math.max(0,Math.min(1,FH.P[i]+dt*(r-FH.help)));if(FH.lock[i])FH.P[i]=Math.min(FH.P[i],.6)}
 FH.teachers.forEach((t,i)=>{if(A[t]){const l=i%3;A[t].pose=FH.P[l]>.35&&Math.sin(T*8+i)>0?'grab':null}});
 for(const e of FH.ev)if(!e.done&&el>=e.at){e.done=1;try{e.fn()}catch(x){console.error(x)}}
 if(FH.P.some(p=>p>=1)){FH.res(false);return}
 if(el>=FH.len)FH.res(true)}}
{const _do=HOOK.drawOver;HOOK.drawOver=(...a)=>{_do&&_do(...a);if(!FH.on||TEST)return;
 const left=Math.max(0,Math.ceil(FH.len-(T-FH.t0)));
 R(104,26,112,12,'rgba(10,8,16,.82)');R(104,26,112,1,'#ff6a5a');pxc('HOLD THE LINE  '+left,160,29,'#ffd27a');
 for(let i=0;i<3;i++){const x=FH.X[i],p=FH.P[i],hot=i===FH.atk,by=100;R(x-22,by,44,9,'#f4ead8');R(x-21,by+1,42,7,'#1a1418');R(x-21,by+1,Math.round(42*p),7,p>.7?'#ff3030':p>.4?'#ffb030':'#60d080');
  pxc(['LEFT','MIDDLE','RIGHT'][i],x,by-8,hot?'#ff6060':'#f4ead8');if(hot&&Math.sin(T*10)>0){R(x-24,by-1,48,1,'#ff3030');R(x-24,by+9,48,1,'#ff3030')}if(FH.lock[i])pxc('JACOB HOLDS',x,by+11,'#9ad09a')}
 const near=FH.X.findIndex(x=>Math.abs(x-A.you.x)<26);if(near>=0)R(FH.X[near]-15,114,30,1,'#ffd27a')}}

/* everything you did comes back, all at once */
function bub(id,txt){if(A[id]&&typeof bubbles!=='undefined'&&bubbles.push)bubbles.push({id,txt,t:2.4})}
function lane(t){const i=(FH.teachers||[]).indexOf(t);return i<0?(Math.random()*3|0):i%3}
function cameo(id,from,x,fn){if(!K[id])return;if(!A[id])put(id,from<0?-14:334,from<0?1:-1,{y:150});walk(id,x,170).then(fn)}
function finCameos(){
 const c=crew(),ev=c.ev||{},L=[],dv=m=>D.done&&D.done[m];
 if(c.cheeksIn)L.push(()=>cameo('clapper',1,FH.X[lane('coach')]+14,()=>{bub('clapper','CHEEK CLAP');SFX.smack&&SFX.smack();shake(.8);FH.P[lane('coach')]=0;if(A.coach)pose('coach','lie')}));
 if(!D.dead.pat&&K.pat)L.push(()=>cameo('pat',-1,FH.X[lane('kim')]-14,()=>{hold('pat','ladle');bub('pat','NOT IN MY HALL');SFX.smack&&SFX.smack();FH.P[lane('kim')]=0}));
 if(dv('loach')==='fortyeight'&&K.loach)L.push(()=>cameo('loach',-1,40,()=>{bub('loach','PAGE FORTY-EIGHT');FH.freeze=T+2.5;SFX.sting&&SFX.sting();for(const t of FH.teachers)if(A[t])A[t].ex='shock'}));
 if(dv('kim')&&K.alex&&!D.dead.alex)L.push(()=>cameo('alex',1,FH.X[lane('kim')]+12,()=>{bub('alex','HONK');SFX.honk&&SFX.honk();FH.P[lane('kim')]=Math.max(0,FH.P[lane('kim')]-.5)}));
 if(ev.hatchkey&&A.jacob)L.push(()=>{const l=lane('coach');FH.lock[l]=1;bub('jacob','NOT TODAY');tw(A.jacob,{x:FH.X[l]},300)});
 if(c.pjSafe&&K.pauljones)L.push(()=>cameo('pauljones',-1,FH.X[0]-12,()=>{bub('pauljones','IT’S PAUL');FH.P[0]=Math.max(0,FH.P[0]-.4)}));
 for(const k of(typeof lovers==='function'?lovers():[]))L.push(()=>{const l=LOVE[k];bub(l.a,{corey:'AND IF YOU WANT ME',sean:'I LOVE YOU. PUSH.',hasan:'STEP FIFTEEN'}[k]||'GO');bub(l.b,'GO');for(let i=0;i<3;i++)FH.P[i]=Math.max(0,FH.P[i]-.2)});
 if(Object.keys(c.saved||{}).length)L.push(()=>{for(const v of Object.keys(c.saved))if(A[v])bub(v,'SOMEBODY CAME');for(let i=0;i<3;i++)FH.P[i]=Math.max(0,FH.P[i]-.25)});
 if(!dv('dopple')&&K.dopple)L.unshift(()=>{if(!A.dopple)put('dopple',160,-1,{y:126,alpha:0});tw(A.dopple,{alpha:1},800);FH.boss=true;SFX.sting&&SFX.sting();shake(1);toast('There are two Ms. Shermans on the stage. One of them is hungry. The middle is breaking faster.')});
 const out=L.slice(0,6);const times=[4,9,13,17,21,25];
 return out.map((fn,i)=>({at:times[i],fn,done:0}))}

/* during a stage only the stage's choices are selectable; during HOLD THE LINE, nothing is */
{const _it=interactables;interactables=function(){const l=_it();if(FH.on)return[];if(FST.on)return l.filter(it=>it.spot&&it.spot.fin);return l}}
/* tags over the people you can pick */
{const _do=HOOK.drawOver;HOOK.drawOver=(...a)=>{_do&&_do(...a);if(!FST.on||TEST||busy)return;
 FST.spots.forEach((s,i)=>{const who=s.fwho&&A[s.fwho];if(who)s.x=Math.round(who.x);const top=who?(who.y<130?who.y+3:who.y-(who.k&&who.k.adult?46:40)-(i%2?9:0)):110;
  const t=String(s.short||'').slice(0,8),w=t.length*4+6,near=A.you&&Math.abs(A.you.x-s.x)<14;if(typeof roamTarget!=='undefined'&&roamTarget&&roamTarget.spot===s)return;
  R(s.x-w/2,top-1,w,8,near?'#ffd27a':'rgba(10,8,16,.85)');pxc(t,s.x,top,near?'#1a1410':'#ffd27a');if(!near&&Math.sin(T*5+s.x)>0)R(s.x-1,top+8,2,2,'#ffd27a')})}}
