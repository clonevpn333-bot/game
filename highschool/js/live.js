'use strict';
/* =====================================================================
   HIGHSCHOOL — RT (less boring)
   While you walk around, something happens to you every 30–45 seconds,
   in real time, no menus:
     INCOMING   a ball comes flying down your lane (⚠ on the edge first).
                Step up or down to dodge it, or get bonked.
     RUNNER     a kid sprints down the hall. Get out of the way or get
                flattened.
     SNEAK      a couple of 7th/8th graders creep up behind you. Spot them
                and walk off, or they grab you: MASH ← → to pull away,
                or get carried to the trash can.
     LOOSE CASH someone drops their wallet. Grab the coins before the
                other kid does.
   Dodges build a streak. Plus: you walk faster, text comes up faster.
   ===================================================================== */
/* faster walking (base was 62/40) */
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{const a=A.you,ox=a?a.x:0,oy=a?a.y:0;_hu&&_hu(dt,rdt);
 if(a&&panelMode==='roam'&&!busy&&!RT.grab&&(keys.l||keys.r||keys.u||keys.d)){const f=floorOf(D.room);a.x=clamp(a.x+(a.x-ox)*.38,10,310);a.y=clamp(a.y+(a.y-oy)*.3,f[0],f[1])}}}
/* faster text by default (one-time bump for old saves) */
if(P&&P.set&&!P.set._fastText){if(P.set.text===2)P.set.text=3;P.set._fastText=1;try{save()}catch(e){}}
DEFAULT_SET.text=3;

const RT={next:0,ev:null,grab:null,streak:0,objs:[]};
const RT_ROOMS=new Set(['corridor','hallb','upper','wing_sci','wing_arts','wing_sports','walkway','canteen','field','bus','gym','courtyard','toilets']);
const liveOk=()=>!TEST&&D&&!(typeof atHome==='function'&&atHome())&&!D.weekend&&panelMode==='roam'&&!busy&&A.you&&RT_ROOMS.has(D.room)&&ROOM===D.room&&!anyOverlay()&&!(typeof PAT!=='undefined'&&PAT);
function liveSchedule(s){RT.next=T+(s!=null?s:30+Math.random()*15)}
liveSchedule(12);
function liveToast(t){toast(t)}
function knock(dir,lie){const a=A.you;if(!a)return;SFX.smack&&SFX.smack();shake(.7);if(typeof squash==='function')squash('you','hit');a.ex='hurt';
 a.x=clamp(a.x+dir*10,10,310);if(lie){a.pose='lie';setTimeout(()=>{if(A.you===a&&a.pose==='lie')a.pose=null;a.ex=null},900)}else setTimeout(()=>{if(A.you===a)a.ex=null},500)}
function streakUp(){RT.streak++;if(RT.streak>=3&&RT.streak%3===0){liveToast('🔥 '+RT.streak+' dodge streak! +1 🍎');D.apples=(D.apples||0)+1;updateLoc();if(typeof repAdd==='function')repAdd('legend',1)}else liveToast(pick(['Dodged!','Too slow!','Nope!','Not today.']))}

/* ---------- the events ---------- */
function evBall(){const a=A.you,fromL=Math.random()<.5,y=a.y-14;
 RT.ev={k:'ball',warn:T+.9,x:fromL?-10:330,dir:fromL?1:-1,y,ly:a.y,spd:230,col:pick(['#b8202c','#e0702a','#f4f2ea']),hit:false};SFX.whoosh&&SFX.whoosh()}
function evRunner(){const ks=Object.keys(K).filter(k=>K[k]&&!K[k].adult&&!D.dead[k]&&!A[k]&&['paul','kenneth','alex','jacob','kayden','jaxon','brayden'].includes(k));const id=pick(ks);if(!id)return liveSchedule(10);
 const a=A.you,fromL=Math.random()<.5;put(id,fromL?-16:336,fromL?1:-1,{y:a.y});const r=A[id];r.noPush=1;r.fast=true;
 RT.ev={k:'runner',id,warn:T+.7,dir:fromL?1:-1,ly:a.y,spd:150,hit:false};
 setTimeout(()=>{if(A[id])bubbles&&bubbles.push&&bubbles.push({id,txt:pick(['MOVE MOVE MOVE','OUTTA THE WAY','LATE LATE LATE','I’M GONNA BE SICK']),t:1.6})},200)}
function evSneak(){const crew=YOUNG.filter(k=>K[k]&&!D.dead[k]&&!A[k]).slice(0,2);if(!crew.length)return liveSchedule(10);
 const a=A.you,behind=-(a.dir||1),f=floorOf(D.room);
 crew.forEach((k,i)=>{put(k,behind<0?-14-i*12:334+i*12,-behind,{y:clamp(a.y+(i?4:-3),f[0],f[1])});A[k].noPush=1;A[k].ex='evil'});
 RT.ev={k:'sneak',crew,t0:T}}
function evCash(){const a=A.you;const x=clamp(a.x+(Math.random()<.5?-1:1)*(70+Math.random()*60),24,296),f=floorOf(D.room);
 const coins=Array.from({length:5},(_,i)=>({x:x+(i-2)*7+Math.random()*4,y:clamp(a.y+(Math.random()-.5)*10,f[0]+2,f[1]),got:0}));
 const rival=pick(Object.keys(A).filter(k=>k!=='you'&&A[k]&&!A[k].dead&&K[k]&&!K[k].adult));
 RT.ev={k:'cash',coins,t0:T,rival};liveToast('💸 Somebody dropped their money! Grab it!');SFX.pick&&SFX.pick();
 if(rival){A[rival].noPush=1;walk(rival,x,46)}}

/* ---------- the grab: MASH ← → ---------- */
function startGrab(crew){RT.grab={crew,t0:T,pull:0,need:12,last:0};A.you.ex='shock';SFX.smack&&SFX.smack();
 crew.forEach((k,i)=>{if(A[k]){A[k].x=A.you.x+(i?8:-8);pose(k,'grab');face(k,'you')}});keys.l=keys.r=keys.u=keys.d=0}
addEventListener('keydown',e=>{if(!RT.grab)return;const k=e.key;const d=(k==='ArrowLeft'||k==='a'||k==='A')?-1:(k==='ArrowRight'||k==='d'||k==='D')?1:(k===' '||k==='e'||k==='E'||k==='x'||k==='X')?RT.grab.last*-1||1:0;
 if(!d)return;e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;if(d!==RT.grab.last){RT.grab.pull++;RT.grab.last=d;A.you.x=clamp(A.you.x+d*1.5,10,310);if(typeof squash==='function')squash('you','pop')}},true);
{const b=$('bShove');if(b){const _c=b.onclick;b.onclick=e=>{if(RT.grab){e.stopPropagation();RT.grab.pull++;RT.grab.last*=-1;return}return _c&&_c(e)}}}
function endGrab(free){const g=RT.grab;RT.grab=null;RT.ev=null;
 if(free){for(const k of g.crew)if(A[k]){pose(k,null);A[k].pose='lie';A[k].hurt=1;setTimeout(()=>{if(A[k]){A[k].pose=null;walk(k,A[k].x<160?-30:350,90).then(()=>remove(k))}},700)}
  if(typeof squash==='function')squash('you','jump');liveToast('💪 You ripped free!');if(typeof repAdd==='function')repAdd('feared',1);liveSchedule();return}
 /* carried to the bin */
 runHook({run:async()=>{
  const crew=g.crew.filter(k=>A[k]),f=floorOf(D.room);const can=prop({t:'bigcan',x:clamp(A.you.x<160?A.you.x+70:A.you.x-70,30,290),y:clamp(A.you.y+2,f[0]+4,f[1]),layer:6});
  for(const k of crew)pose(k,'up');await tw(A.you,{z:16},240);A.you.pose='lie';
  await Promise.all([tw(A.you,{x:can.x},600)].concat(crew.map((k,i)=>walk(k,can.x+(i?8:-8),70))));
  SFX.thud&&SFX.thud();shake(1);A.you.z=6;A.you.y=can.y-6;can.full=1;for(const k of crew){pose(k,'cheer');A[k].ex='laugh'}
  await say(crew[0],pick(['BIN DAY. BIN. DAY.','Should’ve pulled harder, trash.','Too slow! Welcome home!']),'laugh');
  await Promise.all(crew.map(k=>walk(k,A[k].x<160?-30:350,110)));for(const k of crew)remove(k);
  A.you.z=0;A.you.pose=null;A.you.y=can.y+4;can.full=0;if(typeof stain==='function')stain('you','brown',12);
  await N('You climb out of the bin. Somebody claps, slowly, from a window.');D.apples=Math.max(0,(D.apples||0)-1);updateLoc();liveSchedule();return 'stay'}});
}

/* ---------- the loop ---------- */
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);
 const ev=RT.ev,a=A.you;
 if(!liveOk()&&!RT.grab){if(ev&&(busy||panelMode!=='roam'||ROOM!==D.room)){if(ev.id&&A[ev.id])remove(ev.id);if(ev.crew)for(const k of ev.crew)if(A[k]&&!busy)remove(k);RT.ev=null}return}
 if(RT.grab){const g=RT.grab;for(const [i,k] of g.crew.entries())if(A[k])A[k].x=A.you.x+(i?8:-8);
  if(g.pull>=g.need)endGrab(true);else if(T-g.t0>3.4)endGrab(false);return}
 if(!ev){if(T>RT.next&&Math.random()<.55&&evApproach())return;if(T>RT.next){const outside=['field','bus','courtyard','walkway'].includes(D.room);
   const r=Math.random(),young=YOUNG.some(k=>K[k]&&!D.dead[k]&&!A[k]);
   if(young&&(outside?r<.4:r<.22))evSneak();else if(r<.5)evBall();else if(r<.75&&!['canteen'].includes(D.room))evRunner();else evCash();}
  return}
 if(ev.k==='ball'){if(T<ev.warn)return;ev.x+=ev.dir*ev.spd*rdt;
  if(!ev.hit&&Math.abs(ev.x-a.x)<6&&Math.abs(ev.ly-a.y)<7){ev.hit=true;knock(ev.dir,false);RT.streak=0;liveToast(pick(['BONK.','Right in the head.','Ow. Everybody saw that.']));
   for(const k of Object.keys(A))if(k!=='you'&&A[k]&&!A[k].dead&&Math.abs(A[k].x-a.x)<120&&Math.random()<.5)A[k].ex='laugh'}
  if(ev.x<-20||ev.x>340){if(!ev.hit)streakUp();RT.ev=null;liveSchedule()}return}
 if(ev.k==='runner'){const r=A[ev.id];if(!r){RT.ev=null;liveSchedule();return}if(T<ev.warn)return;r.x+=ev.dir*ev.spd*rdt;r.moving=true;r.walk=(r.walk||0)+rdt*18;r.dir=ev.dir;
  if(!ev.hit&&Math.abs(r.x-a.x)<7&&Math.abs(r.y-a.y)<7){ev.hit=true;knock(ev.dir,true);RT.streak=0;liveToast('Flattened.')}
  if(r.x<-30||r.x>350){remove(ev.id);if(!ev.hit)streakUp();RT.ev=null;liveSchedule()}return}
 if(ev.k==='sneak'){let close=false;for(const k of ev.crew){const c=A[k];if(!c)continue;const tx=a.x+(c.x<a.x?-7:7);c.x+=Math.sign(tx-c.x)*Math.min(Math.abs(tx-c.x),44*rdt);c.y+=Math.sign(a.y-c.y)*Math.min(Math.abs(a.y-c.y),20*rdt);c.moving=Math.abs(tx-c.x)>1;c.walk=(c.walk||0)+rdt*9;c.dir=Math.sign(a.x-c.x)||1;if(Math.abs(c.x-a.x)<9&&Math.abs(c.y-a.y)<6)close=true}
  if(close)return startGrab(ev.crew);
  if(T-ev.t0>14||a.x<14||a.x>306){for(const k of ev.crew)if(A[k]){walk(k,A[k].x<160?-30:350,70).then(()=>remove(k))}liveToast('You lost them.');RT.ev=null;liveSchedule()}return}
 if(ev.k==='cash'){let left=0;for(const c of ev.coins){if(c.got)continue;left++;if(Math.abs(c.x-a.x)<6&&Math.abs(c.y-a.y)<7){c.got=1;D.money=(D.money||0)+1;updateLoc();SFX.pick&&SFX.pick()}
   const r=ev.rival&&A[ev.rival];if(r&&Math.abs(c.x-r.x)<5&&T-ev.t0>1.5)c.got=2}
  if(!left||T-ev.t0>8){const mine=ev.coins.filter(c=>c.got===1).length;liveToast(mine?'+$'+mine+' snatched':'They got all of it.');if(ev.rival&&A[ev.rival])A[ev.rival].noPush=0;RT.ev=null;liveSchedule()}return}
}}
/* ---------- drawing ---------- */
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{_do&&_do(...x);const ev=RT.ev;if(!ev||TEST||ROOM!==(D&&D.room))return;
 const blink=Math.sin(T*20)>0;
 if((ev.k==='ball'||ev.k==='runner')&&T<ev.warn){const wx=ev.dir>0?4:W-16,wy=(ev.ly||A.you.y)-24;R(wx,wy,12,11,blink?'#ff6a5a':'#ffd27a');pxc('!',wx+6,wy+2,'#1a0a10');const ax=ev.dir>0?wx+14:wx-6;for(let i=0;i<4;i++)R(ax+(ev.dir>0?i:-i),wy+5-i,1,i*2+1,'#ffd27a')}
 if(ev.k==='ball'&&T>=ev.warn){const bx=Math.round(ev.x),by=Math.round(ev.y+Math.sin(ev.x*.08)*3);R(bx-3,by-3,6,6,ev.col);R(bx-2,by-3,2,1,'#fff');g.globalAlpha=.25;R(bx-3,ev.ly-1,6,2,'#000');g.globalAlpha=1}
 if(ev.k==='cash')for(const c of ev.coins)if(!c.got){R(c.x-1,c.y-2,3,3,'#f0c040');if(blink)R(c.x,c.y-2,1,1,'#fff')}
 if(RT.grab){const g=RT.grab,w=110,x0=W/2-w/2,y0=92,k=Math.min(1,g.pull/g.need),tl=Math.max(0,1-(T-g.t0)/3.4);
  R(x0-4,y0-14,w+8,28,'#141020');R(x0-4,y0-14,w+8,2,'#ff6a5a');pxc('GRABBED! MASH LEFT+RIGHT TO PULL AWAY',W/2,y0-10,blink?'#ffd27a':'#ffffff');
  R(x0,y0,w,5,'#3a1a1a');R(x0,y0,Math.round(w*k),5,'#9ad09a');R(x0,y0+7,Math.round(w*tl),3,'#ff6a5a')}
}}
{const st=document.createElement('style');st.textContent='';document.head.appendChild(st)}

/* ---------- quests come to YOU ---------- */
const HAIL=['Yo! YO! C’mere. I need you.','Hey. Hey! You. Don’t walk away. I need a favor.','Oh thank God, it’s you. Come here, come here.','Psst. Over here. No, HERE.','Wait up! WAIT UP!','Bro. Bro. You got a second? You got a second.'];
const HAIL_GO=['There you are. Okay. It’s happening. Come on.','Finally! We gotta go. Like, now.','You ready? Say you’re ready.'];
function approachCandidate(){
 const out=[];
 for(const id in A){if(id==='you'||!A[id]||A[id].dead||A[id].extra||!K[id])continue;
  let hs;try{hs=availableHooks(D.room,id)}catch(e){continue}
  if(D.f.noApproach&&D.f.noApproach[id]===cal())continue;
  for(const h of hs){const m=h.mis;if(!m||!MIS[m]||D.done[m]||/^(cq_|wk_|ret_)/.test(m)||['passing','gigs','robbery','lockedroom'].includes(m))continue;
   if(/^Shove|^Take|^Jump|^Get the powder|^Make .* pay/.test(h.label||''))continue;
   out.push({id,h,started:(D.mp[m]||0)>0,track:D.f.track===m})}}
 out.sort((a,b)=>(b.track-a.track)||(b.started-a.started)||(Math.random()-.5));
 return out[0]||null}
function evApproach(){
 if(RT.lastApproach&&T-RT.lastApproach<25)return false;
 const c=approachCandidate();if(!c)return false;
 const a=A[c.id],you=A.you;RT.lastApproach=T;
 RT.ev={k:'approach',id:c.id,h:c.h,t0:T,started:c.started};
 a.noPush=1;if(typeof bubbles!=='undefined')bubbles.push({id:c.id,txt:c.started?'Psst!':'Hey! YOU!',t:1.8});
 a.pose=null;walk(c.id,you.x+(a.x<you.x?-13:13),70);
 return true}
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);const ev=RT.ev;if(!ev||ev.k!=='approach')return;
 const a=A[ev.id];if(!a||!liveOk()){if(!busy)RT.ev=null;return}
 const you=A.you;
 if(a.tx!=null&&Math.abs(a.tx-you.x)>16)a.tx=you.x+(a.x<you.x?-13:13);   /* follow you if you walk off */
 if(T-ev.t0>12){RT.ev=null;liveSchedule();a.noPush=0;return}
 if(a.tx==null&&Math.abs(a.x-you.x)<20){face(ev.id,'you');pose(ev.id,'grab');a.ex=ev.started?'smirk':'happy';
  D.f.declined=D.f.declined||{};const n=D.f.declined[ev.id]||0;
  RT.ev={k:'held',id:ev.id,h:ev.h,t0:T,started:ev.started,x0:you.x,n};
  if(typeof bubbles!=='undefined')bubbles.push({id:ev.id,txt:pick(n?['YOU AGAIN. Listen to me.','Don’t you DARE walk off again.','I’m asking NICELY.']:ev.started?HAIL_GO:HAIL).slice(0,40),t:3.5})}}}
/* held by the arm: E = hear them out · walk away = pull free · X (2nd time) = slap */
function heldEnd(){const ev=RT.ev;RT.ev=null;const a=A[ev.id];if(a){pose(ev.id,null);a.noPush=0}liveSchedule()}
function heldListen(){const ev=RT.ev;heldEnd();
 runHook(Object.assign({},ev.h,{run:async()=>{face(ev.id,'you');face('you',ev.id);await say(ev.id,pick(ev.started?HAIL_GO:HAIL),ev.started?'smirk':'happy');return ev.h.run()}}))}
function heldPull(){const ev=RT.ev,a=A[ev.id];heldEnd();D.f.declined[ev.id]=(D.f.declined[ev.id]||0)+1;
 if(a){a.ex='angry';if(typeof squash==='function')squash('you','jump');if(typeof bubbles!=='undefined')bubbles.push({id:ev.id,txt:pick(['Fine. FINE.','Wow. Okay.','You’ll be back.','Rude!']),t:2.4})}}
function heldSlap(){const ev=RT.ev,a=A[ev.id];heldEnd();if(!a)return;
 runHook({run:async()=>{face('you',ev.id);pose('you','slam');SFX.smack&&SFX.smack();shake(.6);flash('#fff',.25);if(typeof squash==='function')squash(ev.id,'hit');await wait(TEST?0:200);pose('you',null);
  a.ex='cry';a._tears=T+12;a.dir=a.x<A.you.x?-1:1;
  await say(ev.id,pick(['(holding their cheek, eyes filling up) …You SLAPPED me. I just wanted to TALK to you.','(lip wobbling) …Okay. Okay. I get it. I won’t ask you for anything ever again.','(tears welling up, voice cracking) I was gonna give you a COOKIE. I had a COOKIE for you.']),'cry');
  (D.f.noApproach=D.f.noApproach||{})[ev.id]=cal();if(typeof repAdd==='function'){repAdd('feared',1);repAdd('liked',-1)}
  await walk(ev.id,a.x<160?-30:350,45);remove(ev.id);return 'stay'}})}
addEventListener('keydown',e=>{const ev=RT.ev;if(!ev||ev.k!=='held'||panelMode!=='roam'||busy)return;const k=e.key;
 if(k==='e'||k==='E'||k===' '||k==='Enter'){e.preventDefault();e.stopImmediatePropagation();heldListen()}
 else if((k==='x'||k==='X')&&ev.n>=1){e.preventDefault();e.stopImmediatePropagation();heldSlap()}},true);
{const b=$('bShove');if(b){const _c=b.onclick;b.onclick=e=>{const ev=RT.ev;if(ev&&ev.k==='held'&&ev.n>=1){e.stopPropagation();return heldSlap()}return _c&&_c(e)}}}
{const _act=INPUT.act;INPUT.act=function(){const ev=RT.ev;if(ev&&ev.k==='held')return heldListen();return _act.apply(this,arguments)}}
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);const ev=RT.ev;if(!ev||ev.k!=='held')return;const a=A[ev.id],you=A.you;
 if(!a||!you||busy||panelMode!=='roam'){RT.ev=null;return}
 face(ev.id,'you');
 /* no timer, no walking off: you're held. Wrestle free: alternate LEFT/RIGHT (A/D, arrows or the pad) */
 const dir=keys.l?-1:keys.r?1:0;if(dir&&dir!==ev.lastDir){ev.lastDir=dir;ev.pull=(ev.pull||0)+1;you.x=ev.x0+dir*2;if(typeof squash==='function'&&ev.pull%3===0)squash('you','jump');SFX.blip&&SFX.blip(300+ev.pull*30)}
 else you.x=clamp(you.x,ev.x0-2,ev.x0+2);
 if((ev.pull||0)>=10)return heldPull()}}
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{_do&&_do(...x);const ev=RT.ev;if(!ev||ev.k!=='held'||TEST)return;
 const t=ev.n>=1?'E: HEAR THEM OUT · A D A D: WRESTLE FREE · X: SLAP':'E: HEAR THEM OUT · A D A D: WRESTLE FREE';const w=pxw(t)+10;R(W/2-w/2,94,w,16,'#141020');R(W/2-w/2,94,w,1,'#ffd27a');pxc(t,W/2,97,Math.sin(T*6)>0?'#ffd27a':'#ffffff');const f=Math.min(1,(ev.pull||0)/10);R(W/2-w/2+4,106,w-8,2,'#3a3040');R(W/2-w/2+4,106,(w-8)*f,2,'#9ad09a')}}
/* tears */
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{_do&&_do(...x);if(TEST)return;for(const id in A){const a=A[id];if(!a||!a._tears||T>a._tears||!a.k||a.vis===false)continue;let G;try{G=kidGeom(a.k,a)}catch(e){continue}
 const ey=a.y-G.legH-G.bodyH-G.hd+Math.round(G.hd*.55);for(let i=0;i<2;i++){const q=((T*1.6+i*.5)%1);R(a.x+(i?2:-2)*(a.dir||1),ey+q*7,1,2,'#7ac8f0')}}}}
