'use strict';
/* =====================================================================
   HIGHSCHOOL — LOCKDOWN (the level)
   Week two, once a run, in a hallway. Played serious. Long, scary, real.
     1. THE ALARM   PA, red flicker, heartbeat, kids sprinting, doors
                    slamming one by one, the camera pushing in on you.
     2. THE DOORS   cut to the fire doors: low on him, slow steps.
     3. THE HALL    real time. He patrols with a sight cone. Every exit
                    is locked. You can:
                    · hide in a doorway (E) and wait for the police
                    · creep to the fire alarm (far left wall, E)
                    · get BEHIND him and take him down (E)
                    If he sees you he comes for you: one last struggle.
     4. TAKEDOWN    slow motion, close-ups, the gun skidding across the
                    floor, him going down in slow motion, ringing ears.
                    Then: pin him, knock him out, or pick it up and shoot.
     5. AFTER       red and blue lights, police, classroom doors opening,
                    you sliding down the lockers. End card.
   Special falls: cineFall() (slow motion, close-up, impact hit-stop, dust).
   ===================================================================== */
/* ---------- slow motion ---------- */
const SLOW={v:1};
{const _sp=speed;speed=function(){return _sp()*SLOW.v}}
function slowmo(v,ms){SLOW.v=v;if(ms)setTimeout(()=>{SLOW.v=1},ms)}
async function cineFall(id,o){o=o||{};const a=A[id];if(!a)return;
 if(!TEST){slowmo(.3);if(typeof camZoom==='function')camZoom(a.x,a.y-16,o.zoom||2,350)}
 a.ex=o.ex||'hurt';a.pose='lie';await wait(TEST?0:220);
 SFX.thud&&SFX.thud();shake(1.2);if(typeof HITSTOP!=='undefined')HITSTOP=.14;
 for(let i=0;i<14;i++)parts.push({x:a.x+rand(-10,10),y:a.y-1,vx:rand(-30,30),vy:rand(-18,-4),c:'rgba(200,190,170,.6)',s:1,fy:a.y+rand(-1,2),life:.8});
 if(!TEST)await new Promise(r=>setTimeout(r,650));slowmo(1);if(typeof camZoom==='function'&&!o.keepZoom)await camZoom()}
/* ---------- atmosphere: heartbeat, flicker, police lights, ringing ---------- */
const LDS={on:false,rate:70,beat:0,police:false,phase:null,t0:0,hideT:0,obj:''};
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(!LDS.on||TEST)return;
 if(T>LDS.beat){LDS.beat=T+60/LDS.rate;try{tone(52,.09,'sine',.22);tone(46,.1,'sine',.18,null,.14)}catch(e){}}}}
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{_do&&_do(...x);if(!LDS.on||TEST)return;
 const fl=Math.random()<.012?.35:0;g.globalAlpha=.12+.06*Math.sin(T*2.2)+fl;R(0,0,W,H,'#4a0010');g.globalAlpha=1;
 if(LDS.police){const s=Math.sin(T*9)>0;g.save();g.globalCompositeOperation='lighter';g.globalAlpha=.16;R(s?0:W/2,0,W/2,H,s?'#ff2030':'#2050ff');g.restore()}
 if(LDS.phase==='hall'&&panelMode==='roam'&&!busy){const L=LDS.obj,w=Math.max(...L.map(t=>pxw(t)))+10,x0=W-w-6;R(x0,20,w,L.length*9+4,'#141020');R(x0,20,w,1,'#ff6a5a');L.forEach((t,i)=>px(t,x0+5,23+i*9,'#f4ead8'));
  /* the fire alarm on the far left wall */
  const ax=(LDS.alarmX||12)-4;R(ax,100,8,10,'#b81020');R(ax+1,101,6,3,'#f4ead8');R(ax+3,105,2,3,'#f4ead8');
  const t_=A.intruder;if(t_&&PAT&&PAT.state!=='chase'&&A.you){const behind=(A.you.x-t_.x)*t_.dir<0,d=Math.abs(A.you.x-t_.x);if(behind&&d<24&&Math.abs(A.you.y-t_.y)<10){const tt='E: TAKE HIM DOWN';const w2=pxw(tt)+8;R(t_.x-w2/2,t_.y-52,w2,10,'#141020');pxc(tt,t_.x,t_.y-50,Math.sin(T*10)>0?'#ff6a5a':'#ffd27a')}}
 }}}
function ringing(ms){if(!AC||TEST)return;try{const o=AC.createOscillator(),gn=AC.createGain();o.type='sine';o.frequency.value=3200;gn.gain.setValueAtTime(.05,AC.currentTime);gn.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+ms/1000);o.connect(gn).connect(SFXG);o.start();o.stop(AC.currentTime+ms/1000+.05)}catch(e){}}
function gunshot(){SFX.bang?SFX.bang():(noise(.3,.6,1200,.6,'lowpass'),tone(70,.25,'sine',.5));shake(1.8);flash('#ffffff',.65)}
{const _dp=drawProp;drawProp=function(p){if(p.t==='floorgun'){const x=Math.round(p.x),y=Math.round(p.y);g.save();g.translate(x,y);g.rotate(p.rot||0);R(-5,-1,9,3,'#2a2a2e');R(1,1,3,3,'#3a3a3e');g.restore();return}return _dp(p)}}

/* ---------- 1 + 2: the alarm and the doors ---------- */
async function lockdownIntro(){
 D.f.realLD=1;P.realLD=P.realLD||{};P.realLD[P.calStarted+':'+(P.runs||0)]=1;
 const f=floorOf(D.room);LDS.on=true;LDS.rate=72;LDS.t0=T;cue('tension',true);
 if(typeof camZoom==='function')camZoom(A.you.x,A.you.y-18,1.25,1800);
 SFX.static&&SFX.static();
 await N('The PA crackles. Mr. Adam’s voice, flat and fast and wrong: “LOCKDOWN. LOCKDOWN. This is NOT a drill. Teachers, lock your doors. Lock your doors NOW.”');
 LDS.rate=96;
 for(const id of Object.keys(A))if(id!=='you'&&A[id]&&!A[id].dead){A[id].ex='scared';A[id].pose=null;walk(id,A[id].x<A.you.x?-30:350,150+Math.random()*40).then(()=>{if(A[id]&&id!=='you')remove(id)})}
 await wait(TEST?0:700);
 const doors=((WORLD[D.room]||{}).doors||[]).filter(d=>!d.stairs&&!d.front);
 for(const d of doors){SFX.door&&SFX.door();shake(.35);if(typeof camZoom==='function'&&!TEST)camZoom(d.x,90,1.3,160);await wait(TEST?0:260)}
 if(typeof camZoom==='function')await camZoom(A.you.x,A.you.y-18,1.6,900);
 await N('Every door slams. Locks click, one after another, all the way down the hall. And you are on the wrong side of every single one of them.');
 A.you.ex='scared';LDS.rate=118;
 /* the doors */
 const fromL=A.you.x>160;put('intruder',fromL?-16:336,fromL?1:-1,{y:clamp(A.you.y-3,f[0],f[1]),hold:'pistol',ex:'cold'});
 const I=A.intruder;I.noPush=1;LDS.alarmX=fromL?308:12;
 if(typeof camZoom==='function')await camZoom(fromL?20:300,I.y-14,2.2,300);
 SFX.door&&SFX.door();await walk('intruder',fromL?60:260,22);
 await N('The fire doors at the end of the hall swing open. Somebody walks in. Older. Black hoodie, hood up. He is holding something low, down by his leg. He hasn’t seen you yet.');
 if(typeof camZoom==='function')await camZoom(A.you.x,A.you.y-18,1.5,500);
 await N('Your heart is so loud he must hear it. Every exit is locked. The fire alarm is at the far end. And he has to turn his back sometime.');
 if(typeof camZoom==='function')await camZoom();
}
/* ---------- 3: the hall, in real time ---------- */
function lockdownHall(){
 LDS.phase='hall';LDS.hideT=0;LDS.t0=T;LDS.obj=['E AT A DOOR: HIDE','E AT FAR '+(LDS.alarmX>160?'RIGHT':'LEFT')+': FIRE ALARM','E BEHIND HIM: TAKE HIM DOWN'];
 PAT={id:'intruder',alert:0,state:'walk',pause:0,turnT:T+3,sp:24,seen:false};
}
{const _ct=caughtBy;caughtBy=function(id){if(id!=='intruder')return _ct(id);PAT=null;unhide();LDS.phase='done';runHook({run:async()=>{await lastStruggle();return 'stay'}})}}
{const _e=edge;edge=function(s){if(LDS.phase==='hall'){toast('The doors are chained. Every exit is locked.');return}return _e(s)}}
{const _td=throughDoor;throughDoor=async function(d){if(LDS.phase==='hall'){toast('Locked. You can hear kids breathing on the other side.');busy=false;roam();return}return _td(d)}}
addEventListener('keydown',e=>{if(LDS.phase!=='hall'||panelMode!=='roam'||busy||!A.you)return;const k=e.key;if(!(k==='e'||k==='E'||k===' '||k==='Enter'))return;
 const t=A.intruder;
 if(Math.abs(A.you.x-(LDS.alarmX||12))<14&&!HIDE){e.preventDefault();e.stopImmediatePropagation();LDS.phase='done';PAT=null;return runHook({run:async()=>{await fireAlarm();return 'stay'}})}
 if(t&&PAT&&PAT.state!=='chase'&&(A.you.x-t.x)*t.dir<0&&Math.abs(A.you.x-t.x)<24&&Math.abs(A.you.y-t.y)<10){e.preventDefault();e.stopImmediatePropagation();LDS.phase='done';PAT=null;unhide();return runHook({run:async()=>{await takedown(false);return 'stay'}})}},true);
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(LDS.phase!=='hall'||TEST)return;
 if(PAT&&PAT.state==='chase')LDS.rate=150;else LDS.rate=HIDE?90:118;
 if(HIDE&&PAT&&PAT.state!=='chase')LDS.hideT+=rdt;
 if((LDS.hideT>14||T-LDS.t0>75)&&panelMode==='roam'&&!busy){LDS.phase='done';const hid=LDS.hideT>14;PAT=null;unhide();runHook({run:async()=>{await aftermath(hid?'hid':'waited',true);return 'stay'}})}}}

/* ---------- endings ---------- */
async function fireAlarm(){
 pose('you','reach');await wait(TEST?0:250);SFX.bell&&SFX.bell();shake(.8);pose('you',null);
 if(typeof camZoom==='function')await camZoom(A.you.x,A.you.y-18,1.6,250);
 await N('You yank the fire alarm. The whole building SCREAMS. Every classroom door bursts open at once.');
 if(typeof camZoom==='function')await camZoom();
 const f=floorOf(D.room);
 for(let i=0;i<10;i++){const id=makeExtra(950+i+cal()*13);put(id,30+i*28,Math.random()<.5?1:-1,{y:f[0]+2+(i%3)*4,ex:'scared'});A[id].extra=1;walk(id,Math.random()<.5?-30:350,140+Math.random()*40).then(()=>{if(A[id])remove(id)})}
 if(A.intruder){A.intruder.ex='shock';await walk('intruder',A.intruder.x+(A.intruder.x<160?-30:30),80)}
 await N('He panics in the crowd and turns for the side door. Right into Coach, who has been waiting for this moment his whole career.');
 put('coach',A.intruder.x<160?-16:336,A.intruder.x<160?1:-1,{y:A.intruder.y,ex:'angry'});await walk('coach',A.intruder.x+(A.intruder.x<160?-10:10),180);
 await hit('coach','intruder',{blood:3});hold('intruder',null);
 const gp=prop({t:'floorgun',x:A.intruder.x,y:A.intruder.y,rot:0,layer:2});tw(gp,{x:gp.x+40,rot:6.2},600,'out');
 await cineFall('intruder');
 await say('coach','(kneeling on his back, completely calm) Twenty-two years. TWENTY-TWO years I’ve been waiting for somebody to try it.','evil');
 return aftermath('alarm')}
async function takedown(fromStruggle){
 const I=A.intruder;if(!I)return aftermath('waited');
 LDS.rate=160;slowmo(.45);
 if(typeof camZoom==='function')await camZoom((A.you.x+I.x)/2,I.y-18,2.1,300);
 if(!fromStruggle){await walk('you',I.x+(A.you.x<I.x?-8:8),160);pose('you','choke');I.ex='shock'}
 slowmo(1);
 const ok=await mash('GET THE GUN',{need:fromStruggle?30:24,time:4.5,info:'Both hands on his wrist. MASH!'});
 if(!ok){pose('you',null);if(fromStruggle)return youFall();
  await N('He throws you off him. You hit the lockers. He turns around.');A.you.x=clamp(A.you.x+(A.you.x<I.x?-24:24),10,310);
  if(typeof camZoom==='function')await camZoom();PAT={id:'intruder',alert:1.05,state:'chase',pause:0,turnT:T+3,sp:24,seen:true};LDS.phase='hall';return}
 /* the gun goes */
 hold('intruder',null);pose('you',null);SFX.smack&&SFX.smack();
 const gp=prop({t:'floorgun',x:I.x,y:I.y+2,rot:0,layer:2});slowmo(.3);
 tw(gp,{x:clamp(I.x+(A.you.x<I.x?50:-50),20,300),rot:9},900,'out');
 await N('You twist his wrist until something in it gives. The gun spins out of his hand and goes skidding down the hall, round and round, and stops.');
 slowmo(1);await cineFall('intruder',{zoom:2.2});ringing(2200);LDS.rate=104;
 const c=await choose([{t:'Kick him onto his front and sit on him till the police come.',tag:'🚔'},{t:'Knock him out cold.',tag:'💥'},{t:'Pick up the gun. Pull the trigger.',tag:'🩸'}],'He’s on the floor. The gun is on the floor. You’re the only one standing.');
 if(c===0){pose('you','kneel');await walk('you',I.x+(A.you.x<I.x?-6:6),70);
  await N('You put a knee in his back and pin both his arms and you don’t let go. Six minutes. It is the longest six minutes there have ever been.');return aftermath('pinned')}
 if(c===1){await walk('you',I.x+(A.you.x<I.x?-10:10),80);pose('you','overhead');slowmo(.35);if(typeof camZoom==='function')await camZoom(I.x,I.y-8,2.4,200);await wait(TEST?0:250);
  SFX.smack&&SFX.smack();shake(1.4);if(typeof HITSTOP!=='undefined')HITSTOP=.18;I.ex='dead';pose('you',null);slowmo(1);if(typeof camZoom==='function')await camZoom();
  await N('One hit. His head bounces off the tile and he’s gone, out, breathing but gone. You back away from him until you hit the lockers.');return aftermath('ko')}
 await walk('you',gp.x+(A.you.x<gp.x?-6:6),90);pose('you','reach');await wait(TEST?0:300);gp.hide=1;hold('you','pistol');pose('you',null);
 face('you','intruder');LDS.rate=170;if(typeof camZoom==='function')await camZoom((A.you.x+I.x)/2,I.y-16,2,500);
 I.ex='scared';await say('intruder','(on his back, hands up, very small) …Wait. Wait.','scared');
 pose('you','point');slowmo(.25);await wait(TEST?0:500);gunshot();ringing(3500);
 kill('intruder','lie',{pool:42,bleed:4,spray:30});
 if(!TEST)await new Promise(r=>setTimeout(r,900));slowmo(1);pose('you',null);LDS.rate=0;LDS.beat=1e9;
 if(typeof camZoom==='function')await camZoom();
 await N('It’s so loud your ears stop working. When they come back there’s only ringing, and the hall, and him, and you. You don’t remember deciding. You only remember the sound.');
 hold('you',null);return aftermath('shot')}
async function lastStruggle(){
 const I=A.intruder;if(!I)return aftermath('waited');
 if(typeof camZoom==='function')await camZoom((A.you.x+I.x)/2,I.y-18,1.9,250);
 await N('He sees you. He comes at you fast. There is nowhere left to go. So you go AT him.');
 return takedown(true)}
async function youFall(){
 gunshot();ringing(4000);blood(A.you.x,A.you.y-24,40,null,90,A.you.y+2);
 await cineFall('you',{ex:'hurt',zoom:2.4,keepZoom:1});LDS.rate=40;
 await N('It goes off. The ceiling tiles swim. Somewhere far away, doors are opening and people are shouting your name.');
 LDS.on=false;LDS.phase=null;fxState.dark=.7;if(typeof camZoom==='function')await camZoom();
 await die('lockdown')}
/* ---------- 5: after ---------- */
const LD_END={hid:'You Waited',waited:'You Waited',alarm:'The Alarm',pinned:'Pinned',ko:'Out Cold',shot:'The Sound'};
async function aftermath(kind,cut){
 LDS.phase=null;LDS.police=true;LDS.rate=kind==='shot'?0:76;if(kind==='shot')LDS.beat=1e9;
 if(HIDE)unhide();
 const f=floorOf(D.room);
 if(cut&&A.intruder){await N('Boots on the stairs. Radios. “GUN DOWN! GUN DOWN!” A lot of shouting, very fast, at the far end of the hall, and then it stops.');remove('intruder')}
 K.cop2=Object.assign({},K.cop,{n:'Officer Reyes',seed:162});K.cop2.id='cop2';
 put('cop',-16,1,{y:f[0]+6,ex:'angry'});put('cop2',336,-1,{y:f[0]+10,ex:'angry'});
 await Promise.all([walk('cop',60,120),walk('cop2',260,120)]);
 if(A.intruder&&!A.intruder.dead){await walk('cop2',A.intruder.x+10,90);pose('cop2','kneel');await say('cop2','Hands. HANDS. I said HANDS.','yell')}
 await say('cop','(to you, gently, both hands up) Hey. Hey. You’re okay. It’s over. Can you hear me? You’re okay.','sad');
 /* the doors open, kids look out */
 const doors=((WORLD[D.room]||{}).doors||[]).filter(d=>!d.stairs&&!d.front).slice(0,4);
 for(const [i,d] of doors.entries()){const id=makeExtra(980+i+cal()*17);put(id,d.x,1,{y:f[0]+1,alpha:0,ex:'scared'});A[id].extra=1;tw(A[id],{alpha:1,y:f[0]+6},400);await wait(TEST?0:180)}
 await walk('you',clamp(A.you.x,40,280),40);A.you.dir=1;pose('you','sit');A.you.ex=kind==='shot'?'closed':'sad';
 if(typeof camZoom==='function')await camZoom(A.you.x,A.you.y-12,1.6,1800);
 const lines={
  hid:'You don’t move from the doorway until a police officer is crouched in front of you saying your name. Your legs don’t work for a while. That’s normal, they tell you.',
  waited:'You never found your moment. The police found theirs. You slide down the lockers and sit on the floor and nobody tells you to get up.',
  alarm:'Nine hundred kids in the parking lot in the rain, and every one of them is alive. Somebody tells Coach he’s a hero. Coach tells them to run a lap.',
  pinned:'They have to pry your hands off his arms. You didn’t know you were still holding on.',
  ko:'He’s alive. You made sure he’s alive. You keep asking them if he’s alive until somebody finally says yes, three times, slowly.',
  shot:'The police find you sitting against the lockers with the gun on the floor a long way from your hand. Everyone is very gentle with you, for weeks. It doesn’t help as much as they think.'};
 await N(lines[kind]||lines.waited);
 LDS.police=false;LDS.on=false;LDS.rate=70;fxState.tintA=0;if(typeof camZoom==='function')await camZoom();
 if(typeof repAdd==='function'){if(kind==='pinned'||kind==='alarm')repAdd('legend',3,'the lockdown');else if(kind==='ko')repAdd('legend',2,'the lockdown');else if(kind==='shot'){repAdd('feared',3,'the lockdown');repAdd('legend',1)}else repAdd('liked',1)}
 await card('LOCKDOWN',(LD_END[kind]||'Survived').toUpperCase(),2600);
 for(const k of['cop','cop2'])if(A[k])walk(k,A[k].x<160?-30:350,80).then(()=>{if(A[k])remove(k)});
 pose('you',null);cue(ROOMS[D.room]&&ROOMS[D.room].music||'corridor',true);
}
/* ---------- the trigger (replaces the short version; now in the safe version too) ---------- */
CHX.reallockdown.cond=()=>typeof cal==='function'&&cal()>=8&&!D.f.realLD&&!(P.realLD&&P.realLD[P.calStarted+':'+(P.runs||0)]);
CHX.reallockdown.run=async()=>{await lockdownIntro();lockdownHall();toast('Every exit is locked. Hide, reach the alarm, or get behind him.');return 'stay'};
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(LDS.phase==='hall'&&A.intruder&&!A.intruder.dead&&A.intruder.hold!=='pistol'){A.intruder.hold='pistol';A.intruder.noPush=1}}}

/* the takedown beats hiding when you're behind him; nobody wanders in during a lockdown */
function ldBehind(){const t=A.intruder;return LDS.phase==='hall'&&t&&PAT&&PAT.state!=='chase'&&A.you&&(A.you.x-t.x)*t.dir<0&&Math.abs(A.you.x-t.x)<24&&Math.abs(A.you.y-t.y)<10}
{const _hi=hideIn;hideIn=function(d){if(ldBehind()){LDS.phase='done';PAT=null;return runHook({run:async()=>{await takedown(false);return 'stay'}})}if(LDS.phase==='hall'&&A.you&&Math.abs(A.you.x-(LDS.alarmX||12))<14){LDS.phase='done';PAT=null;return runHook({run:async()=>{await fireAlarm();return 'stay'}})}return _hi(d)}}
{const _se=spawnExtras;spawnExtras=function(room,w){if(LDS.on)return;return _se(room,w)}}
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(LDS.phase!=='hall')return;for(const id of Object.keys(A)){const a=A[id];if(id==='you'||id==='intruder'||!a||a.dead||a._ldGone)continue;a._ldGone=1;a.noPush=1;walk(id,a.x<160?-30:350,150).then(()=>{if(A[id]&&LDS.on)remove(id)})}}}

{const _it=interactables;interactables=function(){return _it().filter(i=>i.id!=='intruder')}}
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);const t=A.intruder;if(LDS.phase==='hall'&&t&&PAT&&PAT.state==='walk'){if(t.x<50&&t.dir<0||t.x>270&&t.dir>0){t.dir*=-1;PAT.pause=1}}}}
