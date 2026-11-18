'use strict';
/* =====================================================================
   HIGHSCHOOL — ONE MS. SHERMAN · WANDERING · AMBIENCE · BACKGROUND KIDS
   ===================================================================== */

/* ---------- there is one Ms. Sherman ----------
   The math teacher in the Trailer and the vice principal are the same
   woman. She ran the 1987 detention at twenty-three. She has not aged a
   day since. Both ids ('shermian', 'sherman') are the same person on
   screen: never two of her at once. */
K.sherman=Object.assign({},K.shermian,{n:'Ms. Sherman'});K.sherman.id='sherman';
VOICE.sherman=VOICE.shermian;
const SHER=['shermian','sherman'];
{const _put=put;put=function(id,x,dir,o){
 if(SHER.includes(id)){const other=id==='sherman'?'shermian':'sherman';if(A[other]&&!A[other].dead){A[id]=A[other];return A[other]}}
 return _put(id,x,dir,o);
}}
{const _rm=remove;remove=function(id){if(SHER.includes(id)){const other=id==='sherman'?'shermian':'sherman';if(A[other]===A[id]){const r=_rm(id);delete A[other];return r}}return _rm(id)}}
{const _ah=availableHooks;availableHooks=function(room,who){if(SHER.includes(who))return _ah(room,'shermian').concat(_ah(room,'sherman'));return _ah(room,who)}}
{const _it=interactables;interactables=function(){const seen=new Set();return _it().filter(it=>{if(it.id&&A[it.id]){if(A[it.id].extra)return false;if(seen.has(A[it.id]))return false;seen.add(A[it.id])}return true})}}
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(D&&D.dead&&(D.dead.sherman||D.dead.shermian)){D.dead.sherman=1;D.dead.shermian=1}}}
/* draw her once even when she’s under both names */
{const _da=drawActor;drawActor=function(a){if(a.id==='sherman'&&A.shermian===a)return;return _da(a)}}
Object.assign(LORE.gazette||{},{text:'16 March 1987. “BOILER FIRE AT HIGHGATE: NO ONE HURT, SAYS HEAD.” In the photo, a young teacher is crying into her hands at the gate. It’s Ms. Sherman. She looks exactly the same as she does today.'});

/* ---------- skipping = wandering the whole school ---------- */
const WANDER=['corridor','canteen','field','gym','library','toilets'];
{const _bell=bell;bell=async function(){D.wander=null;return _bell()}}
{const _om=openMap;openMap=function(f){
 if(D&&openMap.skip&&PERIODS[D.period]&&PERIODS[D.period].lesson){D.wander=D.period;D.apples=Math.max(D.apples||0,4);updateLoc()}
 if(D&&D.wander===D.period&&PERIODS[D.period]){const p=PERIODS[D.period],old=p.locs;p.locs=[...new Set(old.concat(WANDER))].filter(r=>ROOMS[r]);try{return _om(f)}finally{p.locs=old}}
 return _om(f);
}}
/* sometimes you get caught */
{const _er=enterRoom;enterRoom=async function(room){
 const r=await _er(room);
 if(!TEST&&D&&D.wander===D.period&&!busy&&!D.dead.sherman&&Math.random()<.18&&room!=='forest'){
  await runHook({mis:'passing',run:async()=>{
   put('sherman',334,-1,{y:146});await walk('sherman',A.you.x+16,90);face('sherman','you');
   await say('sherman','Shouldn’t you be in class, sweetie?','evil');
   const c=await choose(['“Bathroom, Miss.”','“Ms. Sherman sent me.”','Run.']);
   if(c===0)await say('sherman','For forty minutes? Miss will be checking on your bladder, sweetie. Personally.','evil');
   else if(c===1)await say('sherman','(very slowly) …Miss IS Ms. Sherman. Go on, then. Miss will remember your face.','smirk');
   else{const ok=await mash('RUN',{need:16,time:3});if(!ok){D.apples=Math.max(0,(D.apples||1)-1);await say('sherman','(holding your hood) Detention. And a hug. Miss hasn’t decided which first.','evil')}else await walk('you',-16,140)}
   await walk('sherman',334,70);remove('sherman');return 'stay';
  }});
 }
 return r;
}}

/* ---------- ambient sound ---------- */
const AMB={
 corridor:{bed:.05,chat:.9,lockers:.35,steps:.5,scream:.04},
 canteen:{bed:.08,chat:1.4,trays:.5,steps:.3,scream:.03},
 field:{bed:.03,wind:.6,birds:.5,chat:.35,distant:1,scream:.04},
 bus:{bed:.04,traffic:.6,chat:.7,steps:.3},
 library:{bed:.02,chat:.15,pages:.4,clock:.3},
 gym:{bed:.05,chat:.5,squeak:.5,ball:.4},
 toilets:{bed:.03,drip:.6,dryer:.15,scream:.05},
 trailer:{bed:.04,ac:.6,clock:.3,chat:.1},
 forest:{bed:.03,wind:.7,birds:.8,creek:.6,distant:.4,scream:.02},
 foodcourt:{bed:.07,chat:1.2,trays:.3},arcade:{bed:.05,chat:.6,beeps:.7},carpark:{bed:.03,traffic:.7,wind:.4},
 pool:{bed:.04,splash:.6,chat:.4,drip:.3},boiler:{bed:.05,drip:.8,distant:.3,scream:.08},closet:{bed:.02,distant:.5,scream:.06},
 lockers:{bed:.04,lockers:.5,drip:.4,chat:.4},door:{bed:.04,chat:.6,steps:.4},bedroom:{bed:.02,traffic:.2,birds:.2},party:{bed:.06,chat:1.3,beeps:.3},lake:{bed:.03,wind:.5,birds:.7,creek:.8}
};
const AMB_CLASS={bed:.03,chat:.12,clock:.35,chair:.25,distant:.5,scream:.025};
let ambBus=null,ambBed=null,ambBedF=null;
function ambEnsure(){
 if(!AC||ambBus)return;
 ambBus=AC.createGain();ambBus.gain.value=.9;ambBus.connect(SFXG);
 const n=AC.sampleRate*2,b=AC.createBuffer(1,n,AC.sampleRate),d=b.getChannelData(0);let last=0;for(let i=0;i<n;i++){last=last*.97+(Math.random()*2-1)*.03;d[i]=last*6}
 ambBed=AC.createBufferSource();ambBed.buffer=b;ambBed.loop=true;ambBedF=AC.createBiquadFilter();ambBedF.type='lowpass';ambBedF.frequency.value=420;
 const g_=AC.createGain();g_.gain.value=0;ambBed.connect(ambBedF).connect(g_).connect(ambBus);ambBed.start();ambBed._g=g_;
}
function ambOut(v){return v*(P&&P.set?P.set.sfx:1)}
function ambNoise(dur,v,fq,q,type,when){if(!AC)return;const t=AC.currentTime+(when||0),n=AC.sampleRate*dur|0,b=AC.createBuffer(1,n,AC.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;const s=AC.createBufferSource();s.buffer=b;const f=AC.createBiquadFilter();f.type=type||'bandpass';f.frequency.value=fq;f.Q.value=q||1;const g_=AC.createGain();g_.gain.setValueAtTime(0,t);g_.gain.linearRampToValueAtTime(v,t+dur*.2);g_.gain.linearRampToValueAtTime(0,t+dur);s.connect(f).connect(g_).connect(ambBus);s.start(t);s.stop(t+dur+.05)}
function ambTone(f0,f1,dur,v,type,when,lp){if(!AC)return;const t=AC.currentTime+(when||0),o=AC.createOscillator(),g_=AC.createGain(),fl=AC.createBiquadFilter();o.type=type||'sine';o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);fl.type='lowpass';fl.frequency.value=lp||1800;g_.gain.setValueAtTime(0,t);g_.gain.linearRampToValueAtTime(v,t+Math.min(.05,dur*.3));g_.gain.linearRampToValueAtTime(0,t+dur);o.connect(fl).connect(g_).connect(ambBus);o.start(t);o.stop(t+dur+.05)}
/* distant voices: little formant-ish mumbles, never words */
function ambMumble(v){const syl=3+Math.random()*6|0,base=110+Math.random()*160;let w=0;for(let i=0;i<syl;i++){const d=.08+Math.random()*.14;ambTone(base*(.9+Math.random()*.4),base*(.8+Math.random()*.4),d,v*(.5+Math.random()*.5),'sawtooth',w,500+Math.random()*500);w+=d+Math.random()*.06}}
function ambScream(v){const f=600+Math.random()*500;ambTone(f,f*(.5+Math.random()*.3),1.2+Math.random(),v,'sawtooth',0,1400);ambNoise(1.4,v*.4,1200,2,'bandpass')}
let ambT=0;
function ambTick(rdt){
 if(!AC||TEST||!D)return;ambEnsure();
 const prof=(PERIODS[D.period]&&PERIODS[D.period].lesson&&TEACH[D.period]&&TEACH[D.period][D.room])?AMB_CLASS:(AMB[D.room]||AMB.corridor);
 const busyMul=DL?.55:1;
 ambBed._g.gain.setTargetAtTime(ambOut((prof.bed||0)*busyMul),AC.currentTime,.4);
 ambBedF.frequency.setTargetAtTime(prof.wind?900:prof.traffic?300:420,AC.currentTime,.5);
 ambT-=rdt;if(ambT>0)return;ambT=.18;
 const r=Math.random,o=v=>ambOut(v)*busyMul;
 if(prof.chat&&r()<.12*prof.chat){ambMumble(o(.012+r()*.012));if(r()<.25)ambTone(300+r()*200,500+r()*300,.25,o(.012),'sine',.1,1600)}
 if(prof.lockers&&r()<.04*prof.lockers)ambNoise(.12,o(.05),320,1.5,'bandpass');
 if(prof.steps&&r()<.08*prof.steps){for(let i=0;i<4;i++)ambNoise(.04,o(.025),180,1.2,'lowpass',i*.28)}
 if(prof.trays&&r()<.05*prof.trays){ambNoise(.08,o(.04),2400,3,'bandpass');ambTone(1800,1600,.15,o(.008),'triangle',0,4000)}
 if(prof.birds&&r()<.05*prof.birds){const f=2200+r()*1400;for(let i=0;i<3;i++)ambTone(f,f*1.3,.07,o(.012),'sine',i*.1,6000)}
 if(prof.wind&&r()<.03*prof.wind)ambNoise(2.4,o(.03),500,.5,'lowpass');
 if(prof.traffic&&r()<.03*prof.traffic)ambNoise(3,o(.04),160,.7,'lowpass');
 if(prof.drip&&r()<.06*prof.drip)ambTone(1400+r()*500,900,.08,o(.03),'sine',0,5000);
 if(prof.dryer&&r()<.01*prof.dryer)ambNoise(2.2,o(.05),900,.6,'bandpass');
 if(prof.clock&&r()<.25*prof.clock)ambNoise(.02,o(.02),3000,4,'bandpass');
 if(prof.chair&&r()<.03*prof.chair)ambTone(380,240,.22,o(.015),'sawtooth',0,900);
 if(prof.pages&&r()<.04*prof.pages)ambNoise(.2,o(.015),2600,1,'highpass');
 if(prof.squeak&&r()<.05*prof.squeak)ambTone(2400,3200,.06,o(.012),'sine',0,6000);
 if(prof.ball&&r()<.05*prof.ball)ambNoise(.06,o(.05),140,1,'lowpass');
 if(prof.ac&&r()<.06*prof.ac)ambTone(60,58,1.2,o(.012),'square',0,200);
 if(prof.creek&&r()<.2*prof.creek)ambNoise(.4,o(.015),1800,.7,'bandpass');
 if(prof.splash&&r()<.04*prof.splash)ambNoise(.4,o(.04),900,.6,'lowpass');
 if(prof.beeps&&r()<.08*prof.beeps)ambTone(600+r()*900,600+r()*900,.08,o(.012),'square',0,3000);
 if(prof.distant&&r()<.02*prof.distant){ambMumble(o(.006));ambNoise(.8,o(.01),400,1,'bandpass')}
 if(prof.scream&&r()<.02*prof.scream)ambScream(o(.02+r()*.015));
}
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);try{ambTick(rdt)}catch(e){}}}

/* ---------- background kids ---------- */
const EXTRA_SPOTS={corridor:4,canteen:5,field:4,bus:4,library:2,gym:3,toilets:1,foodcourt:5,arcade:3,carpark:2,door:2};
const EX_SK=['#f0d0b8','#e8c0a0','#c89068','#a87048','#7a5034','#5a3a24','#f2cfae'],EX_HR=['#1a1210','#3a2418','#7a4a2a','#c8a060','#e8d0a0','#2a1a12','#8a2a1a'],EX_TOP=['#3a5a8a','#8a3a3a','#3a7a4a','#c8a040','#5a4a7a','#2a2a2a','#e0e0e0','#c86a9a','#4a8aa8'],EX_HS=['short','messy','curly','long','ponytail','buzz','fade','side','bob','wavy'];
function makeExtra(i){const s=(cal()*31+i*17+(D.period||0)*7)>>>0,h=n=>Math.floor(hsh(s+n)*997);
 const girl=h(1)%2===0,hs=girl?pick(['long','ponytail','bob','curlyl']):pick(EX_HS.filter(x=>!['long','ponytail','bob'].includes(x)));
 const id='x'+i;K[id]={n:'Some kid',col:'#7a7a8a',skin:EX_SK[h(2)%EX_SK.length],hair:EX_HR[h(3)%EX_HR.length],hs,top:EX_TOP[h(4)%EX_TOP.length],pants:['#2a2a33','#34405a','#3a3a3a','#4a3a2a'][h(5)%4],girl:girl?1:0,seed:200+i,v:300+h(6)%200,h:(h(7)%5)-2};K[id].id=id;return id}
const GOSSIP=()=>{const g=['did you see the raccoon in the ceiling','my mom says this school is “a lot”','who keeps writing AIDAN WAS HERE on every desk','apparently the trailer moved four inches','bro the pizza today was green','i heard tyler’s mom came in. she was crying','don’t go in the library after lunch, the old kid is in there','mrs. tarn held her breath for nine minutes. i timed it','ms. sherman looked at me. i felt it in my teeth','mr. adam was screaming on the roof again','someone said the boiler room’s haunted','is it true about the jars in chem?','omer wears shorts in the SNOW','nivaan’s stream got 900 views. for a sandwich','i failed the beep test before it even started'];
 if(D&&D.done&&D.done.beef)g.push('did you SEE omer’s kick at the bus loop','i can’t stop thinking about the head. the HEAD');
 if(D&&D.done&&D.done.flimbus)g.push('mickther','you’re such a mickther','mr. adam said mickther on the PA lmao');
 if(D&&D.done&&D.done.pits)g.push('FEMA came. FEMA. for a SMELL','aidan’s pits are a war crime');
 if(D&&D.done&&D.done.darren)g.push('darren and hasan?? the drone thing?? I’M SICK');
 if(D&&D.done&&D.done.staffroom)g.push('ms. loach is out sick. like, OUT out','coach and pat. the supply closet. i’m just saying');
 if(D&&D.done&&D.done.vapes)g.push('somebody’s been killing the vape kids','i quit vaping. for my safety');
 if(D&&D.done&&D.done.lockdown)g.push('it was a RACCOON. the whole lockdown');
 if(D&&D.dead&&Object.keys(D.dead).some(k=>FRIENDS.includes(k)))g.push('is it true '+K[Object.keys(D.dead).find(k=>FRIENDS.includes(k))].n.toLowerCase()+' is… you know','where’s '+K[Object.keys(D.dead).find(k=>FRIENDS.includes(k))].n.toLowerCase()+'? he wasn’t on the bus');
 if(typeof crewEvidence==='function'&&crewEvidence()>2)g.push('somebody’s making a FILE on the teachers','i heard david’s got proof. like, real proof');
 if(typeof MOREGOSSIP==='function')g.push(...MOREGOSSIP());
 if(D&&D.f&&D.f.aidanStache)g.push('why does aidan have a mustache','aidan’s mustache is kind of working??');
 return g};
function spawnExtras(room,walkIn){
 if(TEST||!D||D.weekend&&!['foodcourt','arcade','carpark'].includes(room))return;
 const n=EXTRA_SPOTS[room]||0;if(!n)return;
 const lesson=PERIODS[D.period]&&PERIODS[D.period].lesson&&TEACH[D.period]&&TEACH[D.period][room];if(lesson)return;
 const have=Object.keys(A).filter(k=>A[k].extra).length;
 for(let i=have;i<n;i++){const id=makeExtra(i);const f=(typeof FLOOR!=='undefined'&&FLOOR[room])||[136,168];const y=f[0]+Math.random()*10;
  const x=walkIn?(Math.random()<.5?-14:334):30+Math.random()*260;const a=put(id,x,Math.random()<.5?1:-1,{y});a.extra=1;a.idle=1+Math.random()*3;
  if(walkIn)walk(id,40+Math.random()*240,40+Math.random()*20)}
}
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);spawnExtras(room,false);return r}}
{const _r=roam;roam=function(){_r();if(D&&D.room)spawnExtras(D.room,true)}}
/* wander, meet, talk */
const bubbles=[];
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);
 if(TEST||!D)return;
 const ex=Object.keys(A).filter(k=>A[k]&&A[k].extra&&!A[k].dead);
 for(const id of ex){const a=A[id];if(a.tx!=null||a.talking)continue;a.idle=(a.idle||0)-rdt;if(a.idle>0)continue;
  const mate=ex.find(o=>o!==id&&A[o].tx==null&&!A[o].talking&&Math.abs(A[o].x-a.x)<70);
  if(mate&&Math.random()<.5){const b=A[mate];const mid=(a.x+b.x)/2;const ax=mid-7,bx=mid+7;walk(id,ax,40);walk(mate,bx,40);a.talking=b.talking=1;
   timers.push({t:1.8,r:()=>{if(!A[id]||!A[mate])return;face(id,mate);face(mate,id);const g=GOSSIP();bubbles.push({id,txt:pick(g),t:3.2});timers.push({t:2.2,r:()=>{if(A[mate])bubbles.push({id:mate,txt:pick(['no WAY','bro','i KNOW','stop','that’s so messed up','LMAO','for real?','i’m telling everyone']),t:2.2})}});timers.push({t:5,r:()=>{if(A[id]){A[id].talking=0;A[id].idle=2+Math.random()*4}if(A[mate]){A[mate].talking=0;A[mate].idle=1+Math.random()*4}}})}});
  }else{walk(id,Math.max(16,Math.min(304,a.x+(Math.random()-.5)*160)),30+Math.random()*25);a.idle=2+Math.random()*5}
 }
 for(let i=bubbles.length-1;i>=0;i--){bubbles[i].t-=rdt;if(bubbles[i].t<=0||!A[bubbles[i].id])bubbles.splice(i,1)}
}}
{const _do=HOOK.drawOver;HOOK.drawOver=(...a_)=>{_do&&_do(...a_);if(TEST)return;
 for(const b of bubbles){const a=A[b.id];if(!a||a.vis===false)continue;const G=kidGeom(a.k,a),y=a.y-G.legH-G.bodyH-G.hd-12;const t=b.txt.length>26?b.txt.slice(0,25)+'…':b.txt;const w=pxw(t)+4;const x=Math.max(2,Math.min(W-w-2,a.x-w/2));
  g.globalAlpha=Math.min(1,b.t*2)*.85;R(x,y,w,8,'#f4f0e6');R(x+w/2-1,y+8,2,2,'#f4f0e6');px(t,x+2,y+1,'#3a3040');g.globalAlpha=1}
}}
/* they never block a scene: when a cutscene starts, they keep to the back */
{const _cs=cutscene;cutscene=function(fn){for(const k in A)if(A[k]&&A[k].extra){A[k].y=Math.min(A[k].y,140)}return _cs(fn)}}

/* Tyler is missing. For the whole two weeks he is not in any class, any
   corridor, any scene. His seat stays empty. */
{const _fd=freshD;freshD=function(){const d=_fd();d.dead=d.dead||{};d.dead.tyler=1;return d}}
