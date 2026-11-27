'use strict';
/* =====================================================================
   HIGHSCHOOL — NIGHT FIXES (playtest batch)
   1. MS. SHERMIAN IS IN ONE PLACE. Each period she has a location
      (her classroom during lessons, one hall or the office otherwise).
      She only catches you THERE, never in a bathroom, never in your own
      class, at most twice a day, and she's on the floor plan + tracker.
   2. A CALM FIRST DAY. No bin grabs, flying balls, sprinting kids or
      random chaos on day 1 (and day 2 before break). Learn the place.
   3. PEOPLE COME TO YOU. Walk-ups have their own timer again (~40 s),
      before any hazard; new players always have someone pointing them on.
   4. HOME TELLS YOU WHAT TO DO. A drawn backpack and lunch bag with
      markers, and a HOME line under the clock: bag, lunch, front door.
   5. THE NEXT STEP IS NEVER A RIDDLE. If a quest is waiting on another
      quest, its tip says which one and what that one needs now. No more
      "the next odd day after you've met Brett".
   6. CLASS RECAP. After every lesson: what you did and what it got you.
   ===================================================================== */
{
const isDay=n=>(typeof cal==='function'?cal():1)===n;
const lesson=p=>!!(PERIODS[p]&&PERIODS[p].lesson);
const SHER=['shermian','sherman'];
const NO_SHER=new Set(['toilets','lockers','closet','boiler','roof','vent','stage','pool']);
const hallsF=['corridor','hallb','upper','wing_sci','wing_arts','wing_sports'];

/* ---------- 1. where she is ---------- */
function sherLoc(per){
 if(per==null)per=D&&D.period;if(!D||per==null)return'office';
 const t=TEACH[per]||{};for(const r in t)if(SHER.includes(t[r]))return r;
 const R0=(typeof ROSTER!=='undefined'&&ROSTER[per])||{};
 const rooms=Object.keys(R0).filter(r=>!NO_SHER.has(r)&&R0[r].some(e=>SHER.includes(e[0])));
 if(lesson(per))return rooms.find(r=>r==='office')||'office';
 /* free time: ONE place, the same all period (seeded by day+period) */
 const pref=rooms.filter(r=>hallsF.includes(r));const pool=pref.length?pref:rooms;
 if(!pool.length)return hallsF[((typeof cal==='function'?cal():1)*3+per)%3];
 return pool[((typeof cal==='function'?cal():1)+per)%pool.length]}
window.sherLoc=sherLoc;
const sherDay=()=>{const k='sherCatch'+(typeof cal==='function'?cal():0);return D.f[k]||0};
const sherBump=()=>{const k='sherCatch'+(typeof cal==='function'?cal():0);D.f[k]=(D.f[k]||0)+1};
function sherOK(fromPass){
 if(!D||sherDay()>=2)return false;
 const room=D.room,p=D.period;
 if(NO_SHER.has(room))return false;
 if(lesson(p)&&(D.inClass||room===myClassFor(p)))return false;  /* you're in class: she doesn't come in */
 if(fromPass)return HALLS.has(room);
 return room===sherLoc(p)}
if(typeof sherCatch==='function'){const _sc=sherCatch;sherCatch=async function(fromPass){
 if(!sherOK(fromPass)){if(A.shermian&&D.room!==sherLoc())try{remove('shermian')}catch(e){}return}
 sherBump();return _sc(fromPass)}}
if(typeof sherChance==='function'){const _sh=sherChance;sherChance=function(){return _sh()*.5}}
/* the stealth patrol: she only patrols the hall she's actually in */
if(typeof spawnPatrol==='function'&&typeof PATROLLER!=='undefined'){const _sp=spawnPatrol;spawnPatrol=function(room){
 const L=PATROLLER[room];if(!L)return _sp(room);const keep=L.slice();
 if(sherLoc()!==room||sherDay()>=2)PATROLLER[room]=L.filter(t=>!SHER.includes(t));
 try{return _sp(room)}finally{PATROLLER[room]=keep}}}
/* she isn't in rooms she isn't in */
const needsHer=room=>{try{return availableHooks(room,'shermian').length>0||SPOTS.some(s=>s.room===room&&(s.who==='shermian'||s.who==='sherman')&&(!s.cond||s.cond()))}catch(e){return true}};
function sherTidy(){
 if(!D||D.weekend||busy||panelMode!=='roam'||TEST)return;
 const a=A.shermian||A.sherman;if(!a||a.dead)return;
 const room=D.room;if(room===sherLoc()&&!NO_SHER.has(room))return;
 if(needsHer(room)&&!NO_SHER.has(room))return;
 if(typeof PAT!=='undefined'&&PAT&&SHER.includes(PAT.id))return;
 remove(A.shermian?'shermian':'sherman')}
{const _er=enterRoom;enterRoom=async function(room){const r=await _er(room);try{sherTidy()}catch(e){}return r}}
{const _hu=HOOK.update;let acc=0;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);acc+=rdt||dt||0;if(acc>1){acc=0;try{sherTidy()}catch(e){}}}}
/* tracker + floor plan say where she is */
if(typeof whereIs==='function'){const _w=whereIs;whereIs=function(id,per){
 if(SHER.includes(id)&&D&&!D.dead[id]){const r=sherLoc(per);return{room:r,teaching:!!(TEACH[per]&&TEACH[per][r])}}return _w(id,per)}}
{const _op=openPlan;openPlan=function(){_op();try{
 const o=$('map'),box=o.querySelector('.box');if(!box||!D||D.dead.shermian)return;
 const loc=sherLoc(),nm=shortName(loc);
 for(const el of box.querySelectorAll('.hall b, .hall span'))if(el.textContent.replace(' · YOU','')===nm){el.classList.add('sher');el.title='Ms. Shermian is here'}
 const p=document.createElement('p');p.className='sherline';p.textContent='MS. SHERMIAN: '+nm+(lesson(D.period)&&TEACH[D.period]&&TEACH[D.period][loc]?' (teaching)':'')+' · next: '+(D.period<7?shortName(sherLoc(D.period+1)):'home')+' · caught you '+sherDay()+'/2 today';
 box.insertBefore(p,box.firstChild)}catch(e){console.error(e)}}}
{const st=document.createElement('style');st.textContent=`#map .sher{outline:2px solid #ff5a6a!important;position:relative}#map .sher::after{content:'MS. S';position:absolute;top:-9px;right:-4px;background:#ff5a6a;color:#fff;font-size:8px;padding:0 2px;line-height:9px}
#map .sherline{margin:0 0 8px;color:#ff8a94;font-size:12px}`;document.head.appendChild(st)}

/* ---------- 2. a calm first day ---------- */
const calm=()=>D&&(isDay(1)||(isDay(2)&&D.period<2));
for(const fn of['evSneak','evBall','evRunner','evCash']){if(typeof window[fn]!=='function')continue;const _f=window[fn];window[fn]=function(){if(calm())return liveSchedule();return _f.apply(this,arguments)}}
if(typeof CHX!=='undefined')for(const id in CHX){const c=CHX[id],cd=c.cond;c.cond=()=>!calm()&&(!cd||cd())}

/* ---------- 3. walk-ups on their own clock ---------- */
let APN=0;
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);
 try{if(typeof RT==='undefined'||typeof liveOk!=='function'||typeof evApproach!=='function')return;
  if(!APN){APN=T+15;return}
  if(T<APN||RT.ev||RT.grab||!liveOk())return;
  APN=T+(evApproach()?35+Math.random()*10:8)}catch(e){}}}

/* ---------- 4. home: a bag you can SEE, a lunch you can SEE, and a line saying what to do ---------- */
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{_do&&_do(...x);
 if(!D||TEST||panelMode!=='roam'||busy)return;
 const bob=Math.sin(T*5)>0?1:0;
 const mark=(mx,my,txt)=>{R(mx-3,my+bob,7,2,'#ffd27a');R(mx-2,my+2+bob,5,2,'#ffd27a');R(mx-1,my+4+bob,3,2,'#ffd27a');pxc(txt,mx,my-9+bob,'#ffd27a')};
 if(ROOM==='bedroom'&&D.room==='bedroom'&&!D.f.packed){const bx=52,by=150;
  R(bx-6,by-12,12,12,'#2a5a9a');R(bx-6,by-12,12,2,'#3a7ac8');R(bx-4,by-8,8,5,'#1e4478');R(bx-1,by-7,2,1,'#c8c8d0');R(bx-4,by-15,8,3,'#1e4478');R(bx-3,by-14,6,1,'#0d0b14');R(bx-6,by,12,1,'rgba(0,0,0,.35)');
  mark(bx,by-34,'YOUR BAG')}
 if(ROOM==='kitchen'&&D.room==='kitchen'&&!D.f.lunchTaken){const lx=26,ly=150;
  R(lx-4,ly-11,8,11,'#c8a070');R(lx-4,ly-11,8,2,'#a8804a');R(lx-3,ly-7,6,1,'#8a6a3a');R(lx-1,ly-5,2,2,'#d03a4a');R(lx-4,ly,8,1,'rgba(0,0,0,.3)');
  mark(lx+2,ly-30,'LUNCH')}}}
function homeTodo(){
 if(!D||D.weekend||!(typeof atHome==='function'&&atHome()))return null;
 if(!D.f.packed)return'Pack your bag: the blue backpack by your desk (walk to it, press E).';
 if(!D.f.lunchTaken)return D.room==='kitchen'?'Grab the brown lunch bag on the far left of the kitchen.':'Lunch: walk right into the kitchen, the brown bag on the far left.';
 return'Out the FRONT DOOR (right side of the kitchen) to catch the 43.'}
{const _ul=updateLoc;updateLoc=function(){_ul();try{
 const c=$('clock');if(!c||!D)return;const t=homeTodo();if(!t)return;
 c.querySelectorAll('.story').forEach(e=>e.remove());
 const d=document.createElement('div');d.className='story homebox';d.innerHTML='<b>HOME</b> ';d.appendChild(document.createTextNode(t));
 c.insertBefore(d,c.querySelector('.tapnote'))}catch(e){}}}
{const st=document.createElement('style');st.textContent=`#clock .homebox{color:#ffd27a;font-size:10px}#clock .homebox b{color:#fff;font-weight:normal}`;document.head.appendChild(st)}
/* at school: when nothing is tracked, say the one thing you can do right now */
{const _ul=updateLoc;updateLoc=function(){_ul();try{
 const c=$('clock');if(!c||!D||D.weekend||panelMode==='talk'||homeTodo())return;
 const tb=c.querySelector('.trkbox');if(tb&&!/nothing today/.test(tb.textContent))return;
 const now=thingsAt(D.period).filter(t=>t.mis!=='passing');if(!now.length)return;
 const t=now.find(x=>x.main)||now.find(x=>x.started)||now[0];const d=describe(t);
 const box=document.createElement('div');box.className='story trkbox';box.innerHTML='<b>NOW: </b>';
 box.appendChild(document.createTextNode((d.label||d.name)+' · '+(D.room===t.room?'right here':d.where+' — '+(d.route||''))));
 if(tb)tb.replaceWith(box);else c.insertBefore(box,c.querySelector('.tapnote'))}catch(e){}}}

/* ---------- 5. next steps that say WHICH quest is in the way ---------- */
const oddNext=()=>{const t=(D&&D.dayType)||'odd';return t==='odd'&&D.period<=3?'today':'the next ODD day'};
if(MIS.window&&MIS.brett&&typeof winStage==='function'){
 const _bt=MIS.brett.tipNow;
 MIS.window.tipNow=()=>{const s=winStage();
  if(s>=1&&s<4&&typeof winReady==='function'&&!winReady()){
   const bn=(D.f.br||0);const bt=_bt?_bt():null;
   return 'Waiting on BRETT (Intrusive Thoughts). Do that quest first'+(bn?': '+(bt||'see its next step'):': find Abby with Brett in the Main Corridor before school, or the Cafeteria at break/lunch')+'. Then Period 3 in the Trailer, '+oddNext()+'.'}
  return 'Period 3 in the Trailer, '+oddNext()+'. Corey sits across from Abby.'};
 if(!_bt)MIS.brett.tipNow=()=>null;
 const s0=(MIS.brett.tips||[])[0];if(s0&&!/Abby/.test(s0))MIS.brett.tips[0]='Abby’s boyfriend Brett hangs around her: Main Corridor before school, Cafeteria at break or lunch.'}

/* ---------- 6. class recap ---------- */
let REC=null;
{const _ch=choose;choose=async function(opts,title){const r=await _ch.apply(this,arguments);
 try{if(REC&&Array.isArray(opts)&&opts[r]!=null){const t=String(opts[r]).replace(/^\(whisper\) /,'').replace(/[“”]/g,'').trim();REC.did.push(t.length>70?t.slice(0,68)+'…':t)}}catch(e){}return r}}
if(typeof genericLesson==='function'){const _gl=genericLesson;genericLesson=async function(room){
 const before={a:D.apples||0,m:D.money||0,dead:Object.keys(D.dead||{}).length};REC={did:[]};let out;
 try{out=await _gl(room)}finally{const r=REC;REC=null;
  try{if(!TEST&&r&&D&&!busyDeath()){
   const da=(D.apples||0)-before.a,dm=(D.money||0)-before.m;
   const bits=[];if(r.did.length)bits.push('You: '+r.did.slice(-3).join(' · '));
   const res=[];if(da)res.push((da>0?'+':'')+da+' apple'+(Math.abs(da)>1?'s':''));if(dm)res.push((dm>0?'+$':'−$')+Math.abs(dm));
   if(D.f.phoneTaken&&D.f.phoneTaken.day===cal())res.push('phone confiscated');
   const head='CLASS OVER: '+shortName(room).toUpperCase();
   if(ROOM===room||ROOM===D.room)await N(head+'. '+(bits.join(' ')||'You kept your head down.')+' '+(res.length?'Result: '+res.join(', ')+'.':'Result: nothing changed. You survived it.'));}}catch(e){}}
 return out}}
function busyDeath(){return false}
}
