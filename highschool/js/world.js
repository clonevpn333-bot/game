'use strict';
/* =====================================================================
   HIGHSCHOOL — THE SCHOOL, FOR REAL
   No more picking rooms off a map. The school is one long building you
   walk through, left and right, with doors you walk up into and stairs
   to the second floor.

   GROUND FLOOR (left → right)
     Bus Loop ─ Main Corridor ─ Front Hall ─ Science Wing ─ Sports Wing ─ Playing Field ─ Walkway ─ The Woods
                 English, Math,   Cafeteria,   Chem Lab,     Pool, Gym                    Trailer
                 History, Boys’   Library, Main Science
                 Bathroom,        Hall, VP
                 STAIRS ↑         Office, Psych
   SECOND FLOOR
     Upstairs Corridor ─ Arts Wing
       STAIRS ↓, Art,      Woodwork,
       Music, ICT, Drama   Food Tech
   AFTER SCHOOL: Food Court ─ Arcade ─ Rooftop Parking (Fair City Mall)

   Walk off the edge of a hallway to go to the next one. Walk up into a
   door to go through it. Walk off either edge of a room to come back
   out of its door. M shows the floor plan (it doesn’t move you).
   ===================================================================== */
const WORLD={
 bus:{L:null,R:null,doors:[{x:160,to:'corridor',at:22,label:'SCHOOL',front:1}]},
 corridor:{L:'bus',Lx:160,R:'hallb',doors:[{x:50,to:'english'},{x:105,to:'maths'},{x:160,to:'history'},{x:215,to:'toilets',label:'BOYS'},{x:285,to:'stairwell',at:24,stairs:'up',label:'STAIRS'}]},
 hallb:{L:'corridor',R:'wing_sci',doors:[{x:40,to:'canteen'},{x:100,to:'library'},{x:160,to:'hall',label:'MAIN HALL'},{x:220,to:'office',label:'VP OFFICE'},{x:280,to:'psych',label:'PSYCH'}]},
 wing_sci:{L:'hallb',R:'wing_sports',doors:[{x:198,to:'chem',label:'CHEM LAB'},{x:272,to:'science'}]},
 wing_sports:{L:'wing_sci',R:'field',doors:[{x:120,to:'pool'},{x:272,to:'gym'}]},
 field:{L:'wing_sports',R:'walkway',doors:[]},
 walkway:{L:'field',R:'forest',doors:[{x:272,to:'trailer',label:'PORTABLE 4'}]},
 forest:{L:'walkway',R:null,doors:[]},
 upper:{L:null,R:'wing_arts',doors:[{x:30,to:'stairwell',at:296,stairs:'down',label:'STAIRS'},{x:90,to:'art'},{x:145,to:'music'},{x:200,to:'ict'},{x:255,to:'drama'}]},
 wing_arts:{L:'upper',R:null,doors:[{x:120,to:'woodwork'},{x:272,to:'foodtech',label:'FOOD TECH'}]},
 foodcourt:{L:null,R:'arcade',doors:[]},
 arcade:{L:'foodcourt',R:'carpark',doors:[]},
 carpark:{L:'arcade',R:null,doors:[]}
};
const HALLS=new Set(Object.keys(WORLD));
const DOORS={};for(const h in WORLD)for(const d of WORLD[h].doors)if(!d.stairs&&!d.front)DOORS[d.to]={hall:h,x:d.x};
/* rooms that aren’t on the plan, and which hallway they come out into */
const BACKDOOR={closet:['corridor',236],boiler:['corridor',40],staffroom:['hallb',250],roof:['upper',300],lockers:['wing_sports',272],door:['corridor',160],stage:['hallb',160]};
const exitOf=r=>DOORS[r]?[DOORS[r].hall,DOORS[r].x]:BACKDOOR[r]||null;
const FLOORNAME=r=>['upper','wing_arts'].includes(r)||['art','music','ict','drama','woodwork','foodtech'].includes(r)?'second floor':'ground floor';
const shortName=r=>ROOMS[r]?ROOMS[r].name.split(' —')[0].replace('Fair City Mall — ',''):r;

/* ---------- new hallways ---------- */
ROOMS.hallb={name:'Front Hall',music:'corridor',bg(){
 ROOMS.corridor._base();
 g.globalAlpha=.16;R(0,16,W,96,'#c08a4a');g.globalAlpha=1;
 R(0,36,W,3,'#8a3a3a');R(0,39,W,1,'#6a2a2a');
 R(120,18,80,12,'#2a2a3a');pxc('HIGHGATE PRIDE',160,21,'#f0d070');
}};
ROOMS.upper={name:'Upstairs Corridor',music:'corridor',bg(){
 ROOMS.corridor._base();
 g.globalAlpha=.18;R(0,16,W,96,'#6a7aa8');g.globalAlpha=1;
 R(0,36,W,3,'#5a3a7a');R(0,39,W,1,'#3a2a5a');
 for(const x of[60,172]){R(x,46,28,20,'#9ab8d8');R(x,46,28,1,'#fff');R(x+13,46,2,20,'#e8e4dc');R(x,55,28,1,'#e8e4dc')}
 R(118,18,84,12,'#2a2a3a');pxc('SECOND FLOOR',160,21,'#c8b8f0');
}};
{const cb=ROOMS.corridor.bg;ROOMS.corridor._base=cb;}
for(const r of['hallb','upper']){
 if(typeof LIGHT!=='undefined')LIGHT[r]=LIGHT.corridor;
 if(typeof FLOOR!=='undefined')FLOOR[r]=[136,168];
 if(typeof AMB!=='undefined')AMB[r]=Object.assign({},AMB.corridor);
 if(typeof EXTRA_SPOTS!=='undefined')EXTRA_SPOTS[r]=4;
}
if(typeof FLOOR!=='undefined'){FLOOR.bus=FLOOR.bus||[140,168];}

/* ---------- drawing the doors and stairs ---------- */
function drawStairs(x,dir){
 /* the stairwell: a pair of heavy fire doors with wired glass, steps visible through it */
 const up=dir==='up',open=D&&D.doorAnim&&D.doorAnim.x===x?D.doorAnim.k:0;
 R(x-24,28,48,78,'#4a5048');R(x-22,30,44,76,'#1e221e');
 /* through the glass: the stairs going up (or down) */
 const win=(wx)=>{R(wx,40,14,24,'#6a7468');for(let i=0;i<6;i++){const sy=up?60-i*4:44+i*4,sx=wx+i*2;R(sx,sy,14-i*2,1,'#c8c0a8');R(sx,sy+1,14-i*2,3,'#8a8470')}
  R(wx,40,14,1,'rgba(255,255,255,.35)');for(let k=0;k<14;k+=4)R(wx+k,40,1,24,'rgba(30,30,30,.35)');for(let k=0;k<24;k+=4)R(wx,40+k,14,1,'rgba(30,30,30,.35)')};
 const dw=Math.round(21*(1-open));
 if(dw>2){for(const side of[-1,1]){const dx=side<0?x-22:x+1+(21-dw);R(dx,30,dw,76,'#6a7a6a');R(dx+1,31,dw-2,74,'#7a8a78');R(dx,30,1,76,'rgba(255,255,255,.12)');if(dw>16){win(dx+3);R(dx+2,74,dw-4,3,'#c8ccc8');R(dx+2,77,dw-4,1,'#5a5a5a')}R(dx,98,dw,1,'rgba(0,0,0,.25)')}}
 else{g.globalAlpha=.3;R(x-22,30,44,76,'#fff2c8');g.globalAlpha=1}
 R(x-1,30,2,76,'#3a4038');
 /* sign */
 R(x-24,17,48,11,'#1a6a3a');R(x-24,17,48,1,'#3a9a5a');R(x-24,27,48,1,'rgba(0,0,0,.4)');pxc(up?'STAIRS ▲':'STAIRS ▼',x,19,'#e8f8e8');
 /* floor mat */
 R(x-20,106,40,3,'#3a3a3a');R(x-20,106,40,1,'#5a5a5a');
}
function myClassToday(){if(!D||D.weekend)return null;const p=PERIODS[D.period];if(!p||!p.lesson)return null;try{return myClass()}catch(e){return null}}
function drawWorldDoors(room){
 const w=WORLD[room];if(!w)return;
 for(const d of w.doors){
  if(d.front)continue;
  if(d.stairs){drawStairs(d.x,d.stairs);continue}
  const open=D&&D.doorAnim&&D.doorAnim.room===room&&D.doorAnim.x===d.x?D.doorAnim.k:0;
  const label=d.label||shortName(d.to).toUpperCase();
  classDoor(d.x,'',open,d.to==='toilets'?'#4a6a8a':null);
  const mine=d.to===myClassToday(),lw=Math.max(30,pxw(label.slice(0,12))+6);
  R(d.x-lw/2,22,lw,9,mine?'#ffd27a':'#f4f0e6');R(d.x-lw/2,30,lw,1,'rgba(0,0,0,.35)');pxc(label.slice(0,12),d.x,24,'#2a2a3a');
  if(mine&&Math.sin(T*4)>0){R(d.x-1,114,3,3,'#ffd27a')}
 }
}
for(const r of Object.keys(WORLD)){const R0=ROOMS[r];if(!R0||R0._doors)continue;const ob=R0.bg;R0.bg=function(){ob.call(this);if(D&&!D.weekend)drawWorldDoors(r)};R0._doors=1}

/* ---------- getting around ---------- */
let worldFade=0;
{const _do=HOOK.drawOver;HOOK.drawOver=(...a)=>{_do&&_do(...a);if(worldFade>0){g.globalAlpha=Math.min(1,worldFade);R(0,0,W,180,'#000');g.globalAlpha=1}
 /* door labels when you’re standing at one */
 if(panelMode==='roam'&&!busy&&A.you&&D&&!D.weekend){const d=nearDoor();if(d){const t='▲ '+(d.stairs?(d.stairs==='up'?'Upstairs':'Downstairs'):shortName(d.to));const w=pxw(t)+6,x=clamp(d.x-w/2,2,W-w-2);R(x,8,w,9,'#141120');R(x,8,w,1,'#ffd27a');pxc(t,x+w/2,10,'#ffd27a')}}
}}
function nearDoor(){if(!A.you||!D)return null;const w=WORLD[D.room];if(!w)return null;let b=null,bd=12;for(const d of w.doors){const dd=Math.abs(d.x-A.you.x);if(dd<bd){bd=dd;b=d}}return b}
function worldMove(room,x,y,dir){
 if(!ROOMS[room])return;
 D.spawn={room,x,y,dir};D.noDoor=1;D.moves=(D.moves||0)+1;
 return enterRoom(room);
}
async function worldGo(room,x,y,dir){
 if(busy&&!TEST)return;
 busy=true;keys.l=keys.r=keys.u=keys.d=0;
 if(!TEST){const s=performance.now();await new Promise(r=>{const f=()=>{worldFade=Math.min(1,(performance.now()-s)/140);if(worldFade<1)requestAnimationFrame(f);else r()};f()})}
 busy=false;
 const p=worldMove(room,x,y,dir);
 if(!TEST){const s=performance.now();const f=()=>{worldFade=Math.max(0,1-(performance.now()-s)/200);if(worldFade>0)requestAnimationFrame(f)};requestAnimationFrame(f)}else worldFade=0;
 return p;
}
/* where you appear */
{const _br=buildRoom;buildRoom=function(room){
 const r=_br(room);
 if(D&&D.spawn&&D.spawn.room===room&&A.you){const s=D.spawn;D.spawn=null;const f=floorOf(room);A.you.x=s.x!=null?s.x:A.you.x;A.you.y=s.y!=null?s.y:clamp(f[0]+6,f[0],f[1]);if(s.dir)A.you.dir=s.dir;A.you.back=0;A.you.alpha=1;D.x=Math.round(A.you.x)}
 if(D)D.lastRoom=room;
 return r;
}}
async function throughDoor(d){
 busy=true;setPanel('talk');keys.l=keys.r=keys.u=keys.d=0;
 const room=D.room;
 A.you.back=1;await walk('you',d.x,70);
 if(d.stairs){await tw(A.you,{y:A.you.y-10},260)}
 else{pose('you','reach');SFX.door();D.doorAnim={room,x:d.x,k:0};await tw(D.doorAnim,{k:1},TEST?0:320);pose('you',null);await tw(A.you,{y:A.you.y-8,alpha:0},TEST?0:260)}
 A.you.back=0;
 const to=d.to,arrive=d.at!=null?d.at:24;
 D.doorAnim=null;busy=false;
 if(HALLS.has(to))return worldGo(to,arrive,null,1);
 return worldGo(to,24,null,1);
}
/* the controls */
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{
 _hu&&_hu(dt,rdt);
 if(panelMode!=='roam'||busy||!A.you||!D||D.weekend)return;
 const a=A.you,room=D.room,w=WORLD[room];
 if(keys.l&&a.x<=10.5)return edge(-1);
 if(keys.r&&a.x>=309.5)return edge(1);
 if(keys.u&&w){const f=floorOf(room);if(a.y<=f[0]+1.5){const d=nearDoor();if(d&&Math.abs(d.x-a.x)<10)throughDoor(d)}}
}}
function edge(s){
 const room=D.room,w=WORLD[room];
 if(w){
  const to=s<0?w.L:w.R;
  if(room==='bus'&&s<0&&D.period===7){busy=true;return endPeriod()}
  if(!to){if(!edge.t||T-edge.t>1.2){edge.t=T;toast(room==='bus'?'The road. Not that way.':'That’s the end of the hall.')}return}
  if(to==='bus'&&D.period>=1&&D.period<=6&&!edge.warned){edge.warned=1;toast('Out the front doors. The bus loop.')}
  return worldGo(to,s<0?(w.Lx!=null?w.Lx:300):(w.Rx!=null?w.Rx:20),null,s);
 }
 const ex=exitOf(room);if(!ex)return;
 return worldGo(ex[0],ex[1],null,s);
}
/* the floor plan (M): look, don’t teleport */
function openPlan(){
 const o=$('map');o.hidden=false;setPanel('none');
 const here=D.room,cls=myClassToday();
 const exHall=(HALLS.has(here)?here:(exitOf(here)||['corridor'])[0]);
 const row=(title,list)=>'<div class="plan-row"><div class="plan-t">'+title+'</div><div class="plan-halls">'+list.map(h=>{
  const doors=WORLD[h].doors.filter(d=>!d.stairs&&!d.front).map(d=>'<span class="'+(d.to===cls?'cls':'')+(d.to===here?' here':'')+(typeof roomHasNext==='function'&&roomHasNext(d.to)?' q':'')+'">'+shortName(d.to)+'</span>').join('');
  const st=WORLD[h].doors.filter(d=>d.stairs).map(d=>'<span class="st">'+(d.stairs==='up'?'▲ stairs':'▼ stairs')+'</span>').join('');
  return '<div class="hall'+(h===exHall?' you':'')+(typeof roomHasNext==='function'&&roomHasNext(h)?' q':'')+'"><b>'+shortName(h)+(h===exHall?' · YOU':'')+'</b><div>'+doors+st+'</div></div>'}).join('<i>→</i>')+'</div></div>';
 const p=PERIODS[D.period];
 o.innerHTML='<h2>Floor plan · '+p.name+' · '+p.time+'</h2><div class="box">'+
  (D.period===8?row('Fair City Mall',['foodcourt','arcade','carpark']):row('Second floor',['stairwell','upper','wing_arts'])+row('Ground floor',['bus','corridor','hallb','wing_sci','wing_sports','field','walkway','forest']))+
  '<p class="plan-key"><em style="color:#ffd27a;font-style:normal">yellow = your class</em> · <em style="color:#f6cf8e;font-style:normal">outlined = something’s happening</em> · Walk off the edge of a hall to go to the next one. Walk up into a door to go in.</p></div>';
 const x=document.createElement('button');x.className='tb x';x.textContent='CLOSE ✕';x.onclick=()=>{o.hidden=true;roam()};o.appendChild(x);
 if(D.period<7){const wb=document.createElement('button');wb.className='tb loc';wb.style.cssText='position:absolute;right:14px;bottom:14px';wb.textContent='WAIT FOR THE BELL ⏭';wb.onclick=()=>{o.hidden=true;endPeriod()};o.appendChild(wb)}
}
{const st=document.createElement('style');st.textContent=`
#map .plan-row{margin:0 0 12px}#map .plan-t{font-size:11px;color:#a99aa8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
#map .plan-halls{display:flex;flex-wrap:wrap;gap:4px;align-items:stretch}#map .plan-halls i{align-self:center;color:#6a5a6a;font-style:normal}
#map .hall{background:#221d2e;border:1px solid #3a3248;border-radius:4px;padding:5px 7px;min-width:84px;font-size:12px}
#map .hall.you{border-color:#ffd27a}#map .hall.q{box-shadow:0 0 0 1px #f6cf8e inset}#map .hall b{display:block;color:#f4ead8;font-size:12px;margin-bottom:3px}
#map .hall span{display:inline-block;margin:1px 3px 1px 0;padding:1px 4px;border-radius:3px;background:#2e2740;color:#cbbfd8;font-size:11px}
#map span.cls{background:#5a4a1a;color:#ffd27a}#map span.here{outline:1px solid #fff}#map span.q{box-shadow:0 0 0 1px #f6cf8e}#map span.st{background:#1a2a3a;color:#9ac8f0}
#map .plan-key{color:#a99aa8;font-size:12px;margin:6px 0 0}`;document.head.appendChild(st)}

/* ---------- each period: where you are when the bell goes ---------- */
async function worldPlace(){
 const i=D.period,p=PERIODS[i];
 if(i===8){D.spawn={room:'foodcourt',x:30};return enterRoom('foodcourt')}
 if(i===3&&typeof lockdownDue==='function'&&lockdownDue()){D.room=myClass();return runHook(LOCKHOOK)}
 let r=D.lastRoom||'corridor',x=D.x||40;
 if(!HALLS.has(r)){
  const ex=exitOf(r);
  const prevTeach=TEACH[i-1]&&TEACH[i-1][r],nowTeach=TEACH[i]&&TEACH[i][r];
  const leave=!ex?true:(prevTeach||nowTeach||!ROOMS[r]||['door','lockers','closet','boiler','roof','stage','black'].includes(r));
  if(leave){const e=ex||['corridor',40];r=e[0];x=e[1]}
 }
 if(r==='bus'&&i>=1&&i<=6){r='corridor';x=40}
 D.hallEv=(typeof PASS!=='undefined'&&p.lesson)?PASS.filter(q=>!q.cond||q.cond()).sort(()=>Math.random()-.5).slice(0,2).map(q=>q.id):[];
 D.inClass=0;
 const cls=p.lesson?myClassToday():null;
 if(cls&&!TEST)setTimeout(()=>toast('🔔 '+p.name+': '+shortName(cls)+'. '+routeText(r,cls)),300);
 D.spawn={room:r,x,dir:1};D.noDoor=1;
 return enterRoom(r);
}
openMap=function(forced){if(forced)return worldPlace();return openPlan()};
/* you went to class */
{const _er=enterRoom;enterRoom=async function(room){
 if(D&&PERIODS[D.period]&&PERIODS[D.period].lesson&&room===myClassToday())D.inClass=1;
 return _er(room);
}}

/* ---------- directions ---------- */
function hallPath(a,b,outside){
 if(a===b)return[a];
 const adj=h=>{const w=WORLD[h];const o=[];if(w.L)o.push(w.L);if(w.R)o.push(w.R);for(const d of w.doors)if(d.stairs)o.push(d.to);if(h==='bus')o.push('corridor');if(h==='corridor')o.push('bus');
  return o.filter(n=>outside||!((h==='bus'&&n==='forest')||(h==='forest'&&n==='bus')))};
 const prev={[a]:null},q=[a];
 while(q.length){const h=q.shift();for(const n of adj(h))if(!(n in prev)){prev[n]=h;q.push(n)}}
 if(!(b in prev))return outside?null:hallPath(a,b,true);
 const p=[];for(let h=b;h;h=prev[h])p.unshift(h);return p;
}
function routeText(from,to){
 if(!to||from===to)return'You’re here.';
 const fh=HALLS.has(from)?from:(exitOf(from)||['corridor'])[0];
 const th=HALLS.has(to)?to:(exitOf(to)||[null])[0];
 if(!th)return'';
 const path=hallPath(fh,th);if(!path)return'';
 const door=HALLS.has(to)?null:(DOORS[to]||null);
 const steps=[];
 for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];
  if(a==='bus'&&b==='corridor')steps.push({s:'go in the front doors'});
  else if(a==='corridor'&&b==='bus')steps.push({s:'go out the front doors (left end of the Main Corridor)'});
  else if(a==='corridor'&&b==='stairwell')steps.push({s:'take the stairs (right end of the Main Corridor)'});
  else if(a==='stairwell'&&b==='upper')steps.push({s:'climb to the top'});
  else if(a==='upper'&&b==='stairwell')steps.push({s:'take the stairs down (left end of the Upstairs Corridor)'});
  else if(a==='stairwell'&&b==='corridor')steps.push({s:'walk down to the bottom'});
  else{const dir=WORLD[a].L===b||(a==='corridor'&&b==='bus')?'left':'right';const nm_=shortName(b).replace(/^The /,'');const last=steps[steps.length-1];if(last&&last.dir===dir)last.to.push(nm_);else steps.push({dir,to:[nm_]})}}
 const nm=shortName(to).replace(/^The /,'');
 const end=door?'the '+nm+' door':'the '+nm;
 if(!steps.length)return door?'The '+nm+' door is '+(A.you&&door.x<A.you.x?'to your left':'to your right')+'. Walk up into it.':'You’re here.';
 const txt=steps.map(x=>x.s||('go '+x.dir+(x.to.length>1?' through the '+x.to.slice(0,-1).join(', ')+' to the '+x.to[x.to.length-1]:' to the '+x.to[0]))).join(', then ');
 return txt.charAt(0).toUpperCase()+txt.slice(1)+(door?'. Walk up into '+end+'.':'.');
}
/* where a quest wants you next */
function questTarget(m){
 const per=D.period,ok=o=>{try{return !o.cond||o.cond()}catch(e){return false}};
 const cand=[];
 for(const h of HOOKS)if(h.mis===m&&ok(h)){const ps=Array.isArray(h.period)?h.period:[h.period];cand.push({room:h.room,ps,who:h.who})}
 for(const s of SPOTS)if((s.mis===m||(s.label&&MIS[m]&&false))&&ok(s))cand.push({room:s.room,ps:s.period==null?[per]:(Array.isArray(s.period)?s.period:[s.period])});
 if(!cand.length)return null;
 const now=cand.find(c=>c.ps.includes(per));if(now)return Object.assign({now:1},now);
 const later=cand.map(c=>Object.assign({},c,{nx:Math.min(...c.ps.map(p=>p>per?p:p+20))})).sort((a,b)=>a.nx-b.nx)[0];
 return later;
}

/* ---------- returns: walk into any empty classroom in odd Period 3 ---------- */
{const _er=enterRoom;enterRoom=async function(room){
 if(!TEST&&D&&!D.weekend&&D.period===3&&(D.dayType||'odd')==='odd'&&typeof RETURNS!=='undefined'&&!(TEACH[3]&&TEACH[3][room])&&!D.f.retToday&&!D.inClass){
  const list=RETURNS.filter(r=>r.room===room&&(!r.cond||r.cond())&&!(P.retRun||{})[r.id]);
  const all=list.length?list:RETURNS.filter(r=>r.room===room&&(!r.cond||r.cond()));
  if(all.length){D.f.retToday=1;D.spawn=null;return runReturn(pick(all))}
 }
 return _er(room);
}}
if(typeof DAILY_F!=='undefined')DAILY_F.push('retToday');

/* ---------- hallway moments between classes ---------- */
{const _br=buildRoom;buildRoom=function(room){
 const r=_br(room);
 if(D&&!D.weekend&&D.hallEv&&D.hallEv.length&&HALLS.has(room)&&room!=='bus'&&room!=='field'&&room!=='forest'&&PERIODS[D.period].lesson&&typeof PASS!=='undefined'){
  const id=D.hallEv[0],p=PASS.find(q=>q.id===id);
  if(p&&!A[p.who]&&!D.dead[p.who]){put(p.who,150+((D.moves||0)%3)*30,-1,{y:144,pose:id==='aidan'?'lean':id==='rating'?'write':id==='crying'?'sit':null})}
 }
 return r;
}}
for(const p of(typeof PASS!=='undefined'?PASS:[]))for(const w of['corridor','hallb','wing_sci','wing_sports','walkway','upper','wing_arts'])hook({mis:'passing',period:[1,3,5,6],room:w,who:p.who,label:p.label,cond:()=>!!(D&&D.hallEv&&D.hallEv[0]===p.id)&&(!p.cond||p.cond()),run:async()=>{
 if(!A[p.who])put(p.who,160,-1,{y:146});
 await p.run();D.hallEv=(D.hallEv||[]).filter(x=>x!==p.id);P.passN=(P.passN||0)+1;save();
 if(P.passN>=1)part('passing',1,true);if(P.passN>=6&&!P.done.passing)await complete('passing');
 return 'stay'}});
if(MIS.passing)Object.assign(MIS.passing,{tips:['Between classes, stop for something going on in a hallway.','Stop for six things in the hallways.']});

/* ---------- skipping: sometimes Ms. Sherman is in the hall ---------- */
{const _er=enterRoom;enterRoom=async function(room){
 const r=await _er(room);
 if(!TEST&&D&&!D.weekend&&HALLS.has(room)&&PERIODS[D.period].lesson&&!D.inClass&&(D.moves||0)>4&&!busy&&!D.dead.sherman&&Math.random()<.07&&!['bus','forest','field'].includes(room)){
  await runHook({mis:'passing',run:async()=>{
   put('sherman',334,-1,{y:146});await walk('sherman',A.you.x+16,90);face('sherman','you');
   await say('sherman','Shouldn’t you be in class, sweetie?','evil');
   const c=await choose(['“Bathroom, Miss.”','“I’m going. I’m literally going.”','Run.']);
   if(c===0)await say('sherman','The bathroom is THAT way, sweetie. Miss will be counting the minutes.','evil');
   else if(c===1)await say('sherman','Then go. Miss will be checking.','smirk');
   else{const ok=await mash('RUN',{need:16,time:3});if(!ok){D.apples=Math.max(0,(D.apples||1)-1);updateLoc();await say('sherman','(holding your hood) That’s an apple, sweetie. Miss eats apples.','evil')}else await N('You get round the corner before she can grab you. She doesn’t run. She never runs.')}
   await walk('sherman',334,70);remove('sherman');return 'stay';
  }});
 }
 return r;
}}

/* ---------- the mall ---------- */
spot({room:'foodcourt',period:8,x:14,y:150,label:'Get the last 43 home',short:'BUS',free:1,run:async()=>{if(TEST&&!TEST.auto)return 'ended';setTimeout(()=>{busy=true;boardBus(true)},0);return 'ended'}});
spot({room:'bus',period:7,x:14,y:150,label:'Walk to Fair City Mall',short:'MALL',free:1,run:async()=>{if(TEST&&!TEST.auto)return 'ended';setTimeout(()=>endPeriod(),0);return 'ended'}});

/* ---------- the hint line ---------- */
roamHint=function(){
 const near=roamTarget,touch=document.body.classList.contains('touch');
 let s=near?('<b>'+(touch?'TALK':'E')+'</b> '+near.label+' · '):'';
 const d=D&&!D.weekend?nearDoor():null;
 if(d)s+='<b>'+(touch?'▲':'↑')+'</b> '+(d.stairs?(d.stairs==='up'?'upstairs':'downstairs'):'go into '+shortName(d.to))+' · ';
 s+=touch?'◀ ▶ walk · MAP plan':'<b>←/→</b> walk · <b>M</b> floor plan · <b>Q</b> quests';
 const cls=D&&myClassToday();
 if(cls&&!D.inClass)s+=' · <b style="color:#ffd27a">class: '+shortName(cls)+'</b>';
 $('hint').innerHTML=s;
};
if(typeof window!=='undefined')window.worldGo=worldGo;
