'use strict';
/* =====================================================================
   HIGHSCHOOL — STEALTH
   When you’re out of class during a lesson (skipping, sneaking out,
   wandering), teachers patrol the halls for real:
   • You can see where they’re looking: a cone in front of them. Stand
     in it and a “?” fills up over their head. Fill it and it’s a “!”.
   • Spotted: they come for you. Run (hold Shift to sprint) and get out
     of the hall, or duck into a doorway (E) where they can’t see you.
     Hiding right in front of them doesn’t work.
   • Caught: Ms. Sherman catches you her way (and it gets worse every
     time). Anybody else marches you to class.
   ===================================================================== */
const PATROLLER={corridor:['shermian','adam'],hallb:['shermian','adam'],upper:['shermian','balduf'],wing_sci:['voss','loach'],wing_sports:['coach'],field:['coach'],wing_arts:['dahl','fenwick'],walkway:['coach']};
let PAT=null,HIDE=null,SPRINT=false;
const outOfClass=()=>D&&!D.weekend&&PERIODS[D.period]&&PERIODS[D.period].lesson&&!D.inClass&&(D.wander===D.period||D.f.sneaking);
function spawnPatrol(room){
 PAT=null;HIDE=null;
 if(TEST||!outOfClass()||!PATROLLER[room])return;
 D.f.patSeen=D.f.patSeen||{};const key=room+D.period+cal();
 if(D.f.patSeen[key]!=null){if(!D.f.patSeen[key])return}else{D.f.patSeen[key]=Math.random()<.65?1:0;if(!D.f.patSeen[key])return}
 const id=PATROLLER[room].find(t=>K[t]&&!D.dead[t]&&!(t==='shermian'&&D.dead.sherman));if(!id)return;
 const fromL=A.you&&A.you.x>160;const x=fromL?-16:336;
 if(!A[id])put(id,x,fromL?1:-1,{y:146});const a=A[id];a.x=x;a.dir=fromL?1:-1;a.pose=null;a.ex='cold';a.noPush=1;
 PAT={id,alert:0,state:'walk',pause:0,turnT:T+3+Math.random()*3,sp:28,seen:false};
 if(!D.f.stealthTip){D.f.stealthTip=1;setTimeout(()=>toast('A teacher is patrolling. Stay out of their sight cone. Spotted? Run (hold Shift) or duck into a doorway (E).'),700)}
}
{const _er=enterRoom;enterRoom=async function(room){const r=await _er(room);try{if(!busy)spawnPatrol(room)}catch(e){}return r}}
{const _sc=scene;scene=function(room,cast,fresh){if(PAT&&(room!==D.room||busy))PAT=null;return _sc(room,cast,fresh)}}
/* sprint and hide keys */
addEventListener('keydown',e=>{if(e.key==='Shift')SPRINT=true;
 if(!PAT||busy||panelMode!=='roam'||!A.you)return;
 if(e.key==='e'||e.key==='E'||e.key===' '||e.key==='Enter'){
  if(HIDE){e.preventDefault();e.stopImmediatePropagation();unhide();return}
  const d=(WORLD[D.room]||{doors:[]}).doors.find(d=>!d.front&&!d.stairs&&Math.abs(d.x-A.you.x)<12);
  if(d){e.preventDefault();e.stopImmediatePropagation();hideIn(d)}
 }},true);
addEventListener('keyup',e=>{if(e.key==='Shift')SPRINT=false});
function hideIn(d){
 const a=A.you,t=A[PAT.id];
 const inFront=t&&((a.x-t.x)*t.dir>0)&&Math.abs(a.x-t.x)<110;
 HIDE={x:a.x,y:a.y,d};a.x=d.x;a.back=1;a.alpha=.3;a.y=floorOf(D.room)[0];
 if(PAT.state==='chase'&&inFront){toast('They saw you go in there.');PAT.knows=1}
 else toast('Hidden. E to come out.');
}
function unhide(){const a=A.you;if(!a||!HIDE)return;a.alpha=1;a.back=0;a.y=HIDE.y;HIDE=null}
/* the patrol */
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{
 const a=A.you;
 if(HIDE&&a&&panelMode==='roam'&&!busy){const sl=keys.l,sr=keys.r,su=keys.u,sd=keys.d;keys.l=keys.r=0;keys.u=keys.d=0;try{_hu&&_hu(dt,rdt)}finally{keys.l=sl;keys.r=sr;keys.u=su;keys.d=sd}}
 else{const ox=a?a.x:0;_hu&&_hu(dt,rdt);if(a&&SPRINT&&panelMode==='roam'&&!busy&&(keys.l||keys.r)&&!HIDE){a.x=clamp(a.x+(keys.r-keys.l)*30*rdt,10,310);a.walk+=rdt*6}}
 if(!PAT||!D||panelMode!=='roam'||busy||!a)return;
 const t=A[PAT.id];if(!t||t.dead){PAT=null;return}
 /* movement */
 if(PAT.state==='walk'){
  if(PAT.pause>0){PAT.pause-=rdt;t.moving=false;if(PAT.pause<=0&&Math.random()<.5)t.dir*=-1}
  else{t.x+=t.dir*PAT.sp*rdt;t.moving=true;t.walk=(t.walk||0)+rdt*8;
   if(T>PAT.turnT){PAT.turnT=T+3+Math.random()*4;PAT.pause=1+Math.random()*1.5}
   if(t.x>300&&t.dir>0||t.x<20&&t.dir<0){PAT.pause=1.2;t.dir*=-1}}
 }else if(PAT.state==='chase'){
  const tx=HIDE?(PAT.knows?HIDE.d.x:t.x):a.x;const d=tx-t.x;t.dir=Math.sign(d)||t.dir;t.moving=true;t.walk=(t.walk||0)+rdt*14;t.fast=true;
  t.x+=Math.sign(d)*Math.min(Math.abs(d),72*rdt);
  if(Math.abs(t.x-(HIDE?HIDE.d.x:a.x))<10&&(!HIDE||PAT.knows)){caughtBy(PAT.id);return}
  if(HIDE&&!PAT.knows){PAT.lost=(PAT.lost||0)+rdt;if(PAT.lost>2.5){PAT.state='walk';PAT.alert=0;PAT.lost=0;t.fast=false;toast('They lost you.')}}
 }
 /* sight */
 if(PAT.state==='walk'){
  const dx=(a.x-t.x)*t.dir,dy=Math.abs(a.y-t.y);
  const inCone=!HIDE&&dx>0&&dx<95&&dy<14+dx*.12;
  PAT.alert=clamp(PAT.alert+(inCone?(dx<40?1.6:.9):-0.5)*rdt,0,1.05);
  if(PAT.alert>=1){PAT.state='chase';PAT.seen=true;SFX.sting&&SFX.sting();t.ex='angry';
   toast(K[t.id].n+' spotted you. RUN.');}
 }
}}
function caughtBy(id){
 const t=A[id];PAT=null;unhide();
 runHook({mis:'passing',run:async()=>{
  if(id==='shermian'||id==='sherman'){const r=await sherCatch(false);return r||'stay'}
  face(id,'you');pose(id,'grab');A.you.ex='hurt';SFX.smack();
  await say(id,pick(['Out of class. In MY hallway. Do you know what happens to kids in my hallway?','Got you. Got you. Where are you supposed to be? Don’t answer. I know where.','(holding your collar) You’re coming with me, sunshine. To class. Then to the office. Then to God.']),'angry');
  D.apples=Math.max(0,(D.apples||0)-1);updateLoc();
  const cls=myClassFor(D.period);pose(id,null);
  await Promise.all([walk(id,-30,70),walk('you',-14,70)]);remove(id);
  if(cls){D.lateTo=cls;D.wander=null;setTimeout(()=>{busy=false;enterRoom(cls)},0);return 'ended'}
  return 'stay';
 }});
}
/* drawing: the cone and the ?/! */
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{_do&&_do(...x);
 if(!PAT||!D||panelMode!=='roam')return;const t=A[PAT.id];if(!t||ROOM!==D.room)return;
 if(typeof CAM!=='undefined'&&CAM.z>1.01)return;
 const ey=t.y-26,col=PAT.state==='chase'?'255,60,60':PAT.alert>.5?'255,170,60':'255,240,160';
 if(PAT.state==='walk'){for(let i=0;i<95;i+=2){const h=4+i*.24;g.globalAlpha=.3*(1-i/95);g.fillStyle='rgb('+col+')';g.fillRect(Math.round(t.x+t.dir*(6+i)),Math.round(ey+10-h/2+i*.12),2,Math.round(h*2))}g.globalAlpha=1}
 const mk=PAT.state==='chase'?'!':PAT.alert>.08?'?':'';
 if(mk){const y=t.y-42-(Math.sin(T*8)>0?1:0);R(t.x-4,y-1,9,10,'#141020');R(t.x-4,y-1,9,1,'rgb('+col+')');
  if(mk==='?'){g.globalAlpha=.35;R(t.x-3,y+1,7,7,'#ffffff');g.globalAlpha=1;R(t.x-3,y+8-Math.round(7*PAT.alert),7,Math.round(7*PAT.alert),'rgb('+col+')')}
  pxc(mk,t.x+1,y+1,mk==='!'?'#ffffff':'#2a2030')}
 if(HIDE){R(W/2-34,4,68,10,'#141020');pxc('HIDING · E TO LEAVE',W/2,6,'#9ad09a')}
}}
/* sneak-out quests count as being out of class */
{const _us=useSpot;useSpot=async function(s){if(s&&/fence/i.test(s.label||''))D.f.sneaking=1;return _us(s)}}
/* touch: the action button hides/unhides too */
{const _act=INPUT.act;INPUT.act=function(){if(PAT&&!busy&&panelMode==='roam'&&A.you){if(HIDE)return unhide();const d=(WORLD[D.room]||{doors:[]}).doors.find(d=>!d.front&&!d.stairs&&Math.abs(d.x-A.you.x)<12);if(d)return hideIn(d)}return _act.apply(this,arguments)}}
