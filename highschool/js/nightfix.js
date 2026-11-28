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
 if(fromPass)return false;                       /* no hall-pass checks while everyone's still walking to class */
 if(!lesson(p)||D.wander!==p)return false;       /* only once the second bell has gone and you're actually skipping */
 if(D.pass&&T<D.pass.end)return false;
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
 const tb=c.querySelector('.trkbox');if(tb&&!/nothing today|no step open/.test(tb.textContent))return;
 const keep=tb&&/nothing today|no step open/.test(tb.textContent);
 const now=thingsAt(D.period).filter(t=>t.mis!=='passing');if(!now.length)return;
 const t=now.find(x=>x.main)||now.find(x=>x.started)||now[0];const d=describe(t);
 const box=document.createElement('div');box.className='story trkbox';box.innerHTML='<b>NOW: </b>';
 box.appendChild(document.createTextNode((d.label||d.name)+' · '+(D.room===t.room?'right here':d.where+' — '+(d.route||''))));
 if(tb&&keep)tb.after(box);else if(tb)tb.replaceWith(box);else c.insertBefore(box,c.querySelector('.tapnote'))}catch(e){}}}

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

/* ---------- 7. tracking follows the arc ----------
   Track a quest and it stays tracked: when that chapter finishes, the pin moves
   to the next chapter of the same main quest. Tracking something new always
   replaces the old pin (HUD line, arrow, quest log). */
function arcOf(m){try{return ARCS.flatMap(g=>g[2]).find(a=>arcMis(a).includes(m))}catch(e){return null}}
if(typeof trackedMis==='function'){const _tm=trackedMis;trackedMis=function(){
 const r=_tm();if(r||!D||!D.f)return r;const m=D.f.track;if(!m||!MIS[m]||!D.done[m])return r;
 const a=arcOf(m);if(!a)return r;const nx=arcMis(a).find(x=>!D.done[x]);if(!nx)return r;
 D.f.track=nx;setTimeout(()=>{try{toast('Now tracking: '+MIS[nx].name+' (next chapter)')}catch(e){}},300);return nx}}
if(typeof setTrack==='function'){const _st=setTrack;setTrack=function(m){
 if(D&&D.f&&D.f.track&&D.f.track!==m){D.f.track=m;updateLoc();toast('Tracking: '+MIS[m].name+' (replaces the old one)');return}
 return _st(m)}}

/* ---------- 8. one Ms. Shermian per room ----------
   ambience.js merges the two ids, but the real one could still be put as a
   separate actor next to the teaching one. Unless a scene stages both on
   purpose (realmiss), only one of her is drawn. */
{const _da=drawActor;drawActor=function(a){if(a&&a.id!=='shermian'&&A.shermian&&A.shermian!==a&&!A.realmiss&&a.k&&(a.k===K.sherman||a.k===K.shermian||a.k.n==='Ms. Shermian'))return;return _da(a)}}
/* ---------- 9. no stuck sprint: Shift is read from the real key state ---------- */
for(const ev of['keydown','keyup'])addEventListener(ev,e=>{try{SPRINT=!!e.shiftKey}catch(_){}} ,true);
addEventListener('blur',()=>{try{SPRINT=false}catch(_){}});
document.addEventListener('visibilitychange',()=>{try{SPRINT=false}catch(_){}});

/* ---------- 10. Sean & Stella: she said no, but maybe not forever ---------- */
hook({mis:'instella',period:[2,4],room:'field',who:'stella',label:'Stella is sitting alone on the bleachers',
 cond:()=>D&&D.f.ssNo&&cal()>D.f.ssNo&&!D.done.instella&&K.stella&&!D.dead.sean&&!D.dead.stella,run:async()=>{
 scene('field',{stella:[200,-1,{y:148,pose:'sit',ex:'sad'}],you:[160,1,{y:154}]},true);
 await say('stella','(not looking up) I keep listening to voicemail thirty-one.','sad');
 await say('stella','He cried in it. Who cries in a voicemail. Who does that.','sad');
 const c=await choose(['“He cried in November too. It wasn’t hay fever.”','“He’s an idiot. A good one though.”','“Let it go. He’ll live.”']);
 const odds=[.65,.5,.15][c];
 if(c===0)await say('you','He cried in November too. It wasn’t hay fever.');else if(c===1)await say('you','He’s an idiot. A good one though.');else await say('you','Let it go. He’ll live.');
 if(Math.random()<odds){
  await say('stella','(standing up) …Where is he.','smirk');
  put('sean',-14,1,{y:152,ex:'scared'});await walk('sean',176,70);face('sean',1);pose('stella',null);face('stella',-1);
  await say('sean','I wasn’t following you. I was following the field. It’s a public field.','scared');
  await say('stella','Strike two.','happy');await say('sean','There’s no strike two. You said you only ever need—','shock');
  await say('stella','I lied. Shut up.','love');
  ex('sean','closed');ex('stella','closed');pose('sean','kiss');pose('stella','kiss');SFX.kiss&&SFX.kiss();
  for(let i=0;i<3;i++)prop({t:'heart',x:186+(i%2?6:-4),y:116,t0:T+i*.35});await wait(TEST?0:1200);pose('sean',null);pose('stella',null);
  D.f.ssYes=1;await complete('instella','kiss')}
 else{
  await say('stella','(shrugging) We’re better on the phone. Some people are just phone people.','cold');
  await walk('stella',340,60);remove('stella');
  await N('Across the field Sean is watching. He does a little wave. Nobody waves back.');
  await complete('instella','no')}
 return 'stay'}});
}

/* =====================================================================
   CLASS CHAOS (replaces the whisper-to-your-neighbour chats before the bell)
   Every lesson ends with something actually going wrong, staged in the room.
   ===================================================================== */
{
const kidsIn=c=>(c&&c.seats||[]).filter(s=>s.who&&s.who!=='you'&&A[s.who]&&!A[s.who].dead&&K[s.who]&&!K[s.who].adult).map(s=>s.who);
const tIn=()=>{const t=TEACH[D.period]&&TEACH[D.period][D.room];return t&&A[t]?t:(A.shermian?'shermian':null)};
const stand=ids=>{for(const k of ids)if(A[k]){A[k].pose=null;A[k].y=Math.max(A[k].y,140)}};
const EV=[
 /* 1. a raccoon drops out of the ceiling tile */
 async(c,ks,t)=>{SFX.crunch&&SFX.crunch();shake(.8);const r=prop({t:'raccoons',x:0,y:132,n:3,layer:5});
  stand(ks);for(const k of ks.slice(0,6)){A[k].pose=pick(['up','cover','cheer']);A[k].ex=pick(['shock','scared','laugh'])}
  await N('A ceiling tile drops. Then three raccoons drop. One of them has a juice box.');
  if(ks[0])await say(ks[0],'IT’S GOT A JUICE BOX. HOW DOES IT HAVE A JUICE BOX.','yell');
  if(t){hold(t,'ruler');pose(t,'slam');await say(t,'NOBODY. MOVE. They can smell fear and fractions.','angry');pose(t,null);hold(t,null)}
  const ch=await choose(['Stand on your desk and scream.','Throw your sandwich to distract them.','Film it.']);
  if(ch===0){pose('you','up');await say('you','AAAAAAAAAAAAA');pose('you',null)}
  else if(ch===1){pose('you','throw');prop({t:'food',x:A.you.x,y:120,vx:80,floor:160,c:'#e8c040'});await N('They go for the sandwich. All three. Like a pack. Like wolves with hands.');pose('you',null)}
  else{pose('you','film');D.f.clip=1;await N('Forty seconds of footage. Nivaan will pay for this. Nivaan will pay a lot for this.');pose('you',null)}
  r.hide=1;stand(ks)},
 /* 2. the chain puke */
 async(c,ks,t)=>{const chain=ks.slice(0,3);if(chain.length<2)return EV[2](c,ks,t);
  await say(chain[0],'(green) I ate the gas station sushi. On purpose. As a bit.','hurt');
  if(typeof pukeChain==='function')await pukeChain(chain);else SFX.squelch&&SFX.squelch();
  for(const k of ks.slice(3,8)){A[k].pose='cover';A[k].ex='shock'}
  if(t)await say(t,pick(['NOT ON THE WORKSHEETS.','Out. All of you. OUT. Not you. You stay and smell it.','This is why we don’t do group work.']),'angry');
  const ch=await choose(['Open a window.','Gag. Loudly.','Keep doing your worksheet.']);
  if(ch===0)await N('The window opens four inches. That’s all it does. It’s a school window.');
  else if(ch===1){A.you.ex='hurt';await say('you','(gagging) HHHUURK—');await say(ks[ks.length-1]||chain[0],'DON’T. DON’T START ANOTHER ONE.','scared')}
  else{await N('You finish question six. The kid next to you is looking at you like you’re a serial killer.');if(typeof repAdd==='function')repAdd('feared',1)}
  stand(ks)},
 /* 3. two kids throw hands over a pencil */
 async(c,ks,t)=>{const [a,b]=ks;if(!b)return EV[0](c,ks,t);stand([a,b]);
  await say(a,'That’s MY pencil. I chewed that. That’s my DNA.','angry');await say(b,'Then come get your DNA.','smirk');
  await walk(a,A[b].x-12,90);await hit(a,b,{blood:4});await hit(b,a,{pose:'headbutt',blood:6});
  for(const k of ks.slice(2,9)){A[k].pose='cheer';A[k].ex='laugh'}
  await say(ks[2]||a,'FIGHT FIGHT FIGHT FIGHT—','yell');
  const ch=await choose(['Break it up.','Bet a dollar on '+K[a].n.split(' ')[0]+'.','Steal the pencil while they fight.']);
  if(ch===0){const ok=await mash('PULL THEM APART',{need:14,time:3});if(ok){await walk('you',A[a].x+6,120);A[a].pose='lie';await N('You pull them apart. Somebody’s tooth is on your shoe now.');if(typeof repAdd==='function')repAdd('liked',1)}else{A.you.hurt=1;A.you.ex='hurt';await N('An elbow catches you in the eye. You were helping. Nobody cares.')}}
  else if(ch===1){const w=Math.random()<.5;A[w?b:a].pose='lie';D.money=Math.max(0,(D.money||0)+(w?-1:1));updateLoc&&updateLoc();await N(w?K[a].n.split(' ')[0]+' goes down. You lose a dollar.':K[b].n.split(' ')[0]+' goes down. +$1.')}
  else{give&&give('pencil');await N('You walk out of the fight with the pencil. It’s wet. You keep it anyway.')}
  if(t)await say(t,'(not even looking up) Detention. Both of you. And the pencil.','cold');stand(ks)},
 /* 4. the teacher's chair gives up */
 async(c,ks,t)=>{if(!t)return EV[0](c,ks,t);pose(t,'sit');await wait(TEST?0:300);SFX.crunch&&SFX.crunch();shake(1);
  pose(t,'lie');A[t].ex='hurt';for(const k of ks.slice(0,8)){A[k].ex='laugh';A[k].pose=pick(['cover','point',null])}
  await N('The chair folds up like a lawn chair. With '+K[t].n+' in it.');
  await say(t,'(from the floor, very calm) Whoever laughs gets a zero. For the year. For life.','angry');
  const ch=await choose(['Hold it in.','Laugh.','Help them up.']);
  if(ch===0){const ok=await mash('DON’T LAUGH',{need:12,time:3});if(!ok){A.you.ex='laugh';await say('you','(snorting) PFFFF—');await say(t,'You. Zero. Congratulations.','evil')}else await N('Your face is purple. You made it. Nobody else did.')}
  else if(ch===1){A.you.ex='laugh';await say('you','HAHAHAHA—');await say(t,'Zero.','evil');for(const k of ks.slice(0,4))A[k].ex='laugh'}
  else{await walk('you',A[t].x+10,90);pose('you','reach');pose(t,null);await say(t,'(standing up, brushing off) …Thank you. You’ll still fail. But thank you.','cold');pose('you',null);if(typeof repAdd==='function')repAdd('liked',1)}
  pose(t,null);stand(ks)},
 /* 5. somebody's phone goes off. it's not a ringtone */
 async(c,ks,t)=>{const k=ks[0];if(!k)return EV[0](c,ks,t);SFX.beep&&SFX.beep();
  await N('A phone goes off in '+K[k].n.split(' ')[0]+'’s bag. Full volume. It’s a voice memo of '+K[k].n.split(' ')[0]+' singing in the shower.');
  A[k].pose='cover';A[k].ex='shock';for(const o of ks.slice(1,8)){A[o].ex='laugh';A[o].pose=pick(['point','cover',null])}
  await say(k,'IT’S NOT ME. THAT’S SOMEONE WHO SOUNDS LIKE ME.','scared');
  if(t){await walk(t,A[k].x+12,70);pose(t,'grab');await say(t,'Phone. And next time, warm up first. You were flat.','cold');pose(t,null)}
  const ch=await choose(['Start singing along.','Record it for later.','“Bro it was kinda good.”']);
  if(ch===0){await say('you','(singing) AND I WILL ALWAAAYS—');await say(k,'I’M GOING TO KILL YOU.','angry')}
  else if(ch===1){pose('you','film');await N('Saved. Blackmail is a renewable resource.');pose('you',null)}
  else{await say('you','Bro. It was kinda good.');A[k].ex='blush';await say(k,'…Really?','blush');if(typeof bond==='function')bond(k,1)}
  stand(ks)},
 /* 6. fire alarm. someone pulled it. you know who */
 async(c,ks,t)=>{fxState.red=.6;SFX.alarm?SFX.alarm():SFX.scream&&SFX.scream();shake(.6);stand(ks);
  const k=ks[ks.length-1]||ks[0];
  await N('The fire alarm goes off. Through the door glass you can see '+(k?K[k].n.split(' ')[0]+' running away from it, laughing':'a seventh grader sprinting off, laughing')+'.');
  for(const o of ks.slice(0,8)){A[o].pose=pick(['cheer','up',null]);A[o].ex='laugh'}
  if(t)await say(t,'SIT. DOWN. It’s not a real fire. I can tell. I would know.','angry');
  const ch=await choose(['Run out anyway.','Stay in your seat.','Point at who did it.']);
  if(ch===0){await walk('you',330,140);await N('The whole hallway is outside. Nobody comes back for twenty minutes. Best class all year.');D.apples=(D.apples||0)+1;updateLoc&&updateLoc()}
  else if(ch===1)await N('You sit in a ringing room with a teacher who is glaring at the ceiling like it owes them money.');
  else{pose('you','point');if(k){await say(k,'(from the hall) SNITCH!','angry');if(typeof repAdd==='function')repAdd('liked',-1)}pose('you',null)}
  fxState.red=0;stand(ks)}
];
window.classChaos=async function(c){
 if(!D||D.weekend)return;const ks=kidsIn(c).sort(()=>Math.random()-.5),t=tIn();
 const key='cc'+cal();const used=D.f[key]=D.f[key]||[];
 let i=Math.floor(Math.random()*EV.length);for(let n=0;n<EV.length&&used.includes(i);n++)i=(i+1)%EV.length;used.push(i);
 try{await EV[i](c,ks,t)}catch(e){if(e===DEATH||(typeof ENDDAY!=='undefined'&&e===ENDDAY))throw e;console.error(e)}
 try{if(typeof cue==='function')cue(null)}catch(e){}};
}
