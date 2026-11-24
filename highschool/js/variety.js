'use strict';
/* =====================================================================
   HIGHSCHOOL — VARIETY (so quests stop feeling the same)
   COMPLICATIONS: when you go to do a step of a quest you've started,
   there's a good chance something gets in the way first, and you have
   to PLAY through it. Five mini-games, all real-time, on the canvas:
     CHASE     a kid snatches your stuff and legs it: catch them
     LOCKPICK  a jammed locker/door: stop the spinner in the notch ×3
     SIMON     repeat the sequence (a handshake, a patrol pattern)
     THROW     hit a moving target to cause a distraction
     RACE      mash LEFT/RIGHT to beat a rival there
   Win = a bonus. Lose = it costs you, but the quest still goes on.
   DAILY CHALLENGES: three goals a day, top of ⚡ Do Now, with payouts.
   ===================================================================== */
/* ---------- input of our own (works while busy) ---------- */
const VK={l:0,r:0,u:0,d:0,hit:0,last:null};
addEventListener('keydown',e=>{if(!VG)return;const k=e.key;let used=1;
 if(k==='ArrowLeft'||k==='a'||k==='A'){VK.l=1;VK.last='L'}else if(k==='ArrowRight'||k==='d'||k==='D'){VK.r=1;VK.last='R'}
 else if(k==='ArrowUp'||k==='w'||k==='W'){VK.u=1;VK.last='U'}else if(k==='ArrowDown'||k==='s'||k==='S'){VK.d=1;VK.last='D'}
 else if(k===' '||k==='Enter'||k==='e'||k==='E'){VK.hit=1;VK.last='E'}else used=0;
 if(used){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat&&VG.key)VG.key(VK.last)}},true);
addEventListener('keyup',e=>{const k=e.key;if(k==='ArrowLeft'||k==='a'||k==='A')VK.l=0;if(k==='ArrowRight'||k==='d'||k==='D')VK.r=0;if(k==='ArrowUp'||k==='w'||k==='W')VK.u=0;if(k==='ArrowDown'||k==='s'||k==='S')VK.d=0},true);
/* touch: tap left/right half of the canvas, tap = hit */
{const c=$('c');if(c)c.addEventListener('pointerdown',e=>{if(!VG)return;const r=c.getBoundingClientRect(),fx=(e.clientX-r.left)/r.width,fy=(e.clientY-r.top)/r.height;
 const k=fy<.3?'U':fy>.75?'D':fx<.33?'L':fx>.66?'R':'E';VK.last=k;if(VG.key)VG.key(k);if(k==='L'){VK.l=1;setTimeout(()=>VK.l=0,180)}if(k==='R'){VK.r=1;setTimeout(()=>VK.r=0,180)}},true)}
let VG=null;
function vgRun(g){if(TEST)return Promise.resolve(Math.random()<.6);if(typeof wipeTalk==='function')wipeTalk();return new Promise(res=>{g.res=res;g.t0=T;VG=g;VK.l=VK.r=VK.u=VK.d=0})}
function vgEnd(ok){const g=VG;VG=null;if(g&&g.cleanup)g.cleanup();SFX[ok?'pick':'bad']&&SFX[ok?'pick':'bad']();if(g)g.res(ok)}
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(VG&&VG.tick)VG.tick(rdt||dt)}}
function vgPanel(title,sub,tl){const w=Math.max(pxw(title),pxw(sub))+16;R(W/2-w/2,22,w,22,'#141020');R(W/2-w/2,22,w,2,'#ffd27a');pxc(title,W/2,26,'#ffd27a');pxc(sub,W/2,35,'#cbbfd8');if(tl!=null){R(W/2-w/2,44,Math.round(w*Math.max(0,tl)),2,'#ff6a5a')}}
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{_do&&_do(...x);if(VG&&VG.draw&&!TEST)VG.draw()}}

/* ---------- CHASE ---------- */
function vgChase(id,what){const a=A[id],you=A.you;if(!a||!you)return Promise.resolve(false);const dir=a.x<you.x?-1:1;let jk=T+1+Math.random();a.noPush=1;
 return vgRun({tick(rdt){const t=T-this.t0;you.x=clamp(you.x+(VK.r-VK.l)*92*rdt,6,314);you.moving=!!(VK.r||VK.l);if(VK.r!==VK.l)you.dir=VK.r?1:-1;you.walk=(you.walk||0)+rdt*14;you.fast=true;
   if(T>jk){jk=T+.8+Math.random()*1.2;a._v=(Math.random()<.25?-1:1)}a.x+=dir*(a._v||1)*68*rdt;a.dir=dir*(a._v||1);a.moving=true;a.fast=true;a.walk=(a.walk||0)+rdt*16;
   if(Math.abs(a.x-you.x)<8){you.moving=false;you.fast=false;return vgEnd(true)}if(a.x<-20||a.x>340||t>9){you.moving=false;you.fast=false;return vgEnd(false)}},
  draw(){vgPanel('CHASE! GET '+(what||'YOUR STUFF').toUpperCase()+' BACK','LEFT / RIGHT TO RUN · CATCH THEM',1-(T-this.t0)/9)}})}
/* ---------- LOCKPICK ---------- */
function vgLock(){let ang=0,notch=Math.random()*6.28,hits=0,spd=2.6;
 return vgRun({tick(rdt){ang=(ang+spd*rdt)%(Math.PI*2);if(T-this.t0>12)vgEnd(false)},
  key(k){if(k!=='E')return;let d=Math.abs(((ang-notch+Math.PI*3)%(Math.PI*2))-Math.PI);if(d<.32){hits++;SFX.click&&SFX.click();shake(.15);notch=Math.random()*6.28;spd*=1.3;if(hits>=3)vgEnd(true)}else{SFX.bad&&SFX.bad();spd*=1.05;hits=Math.max(0,hits-1)}},
  draw(){vgPanel('LOCKPICK','PRESS E WHEN THE PICK IS IN THE NOTCH · '+hits+'/3',1-(T-this.t0)/12);const cx=W/2,cy=86,r=22;
   for(let i=0;i<48;i++){const a=i/48*6.28;R(cx+Math.cos(a)*r,cy+Math.sin(a)*r,2,2,'#5a4a6e')}
   for(let i=-2;i<=2;i++){const a=notch+i*.08;R(cx+Math.cos(a)*r-1,cy+Math.sin(a)*r-1,4,4,'#9ad09a')}
   for(let i=0;i<r;i+=2)R(cx+Math.cos(ang)*i,cy+Math.sin(ang)*i,2,2,'#ffd27a');R(cx-3,cy-3,6,6,'#2a2a30')}})}
/* ---------- SIMON ---------- */
function vgSimon(len,label){const DIRS=['LEFT','RIGHT','UP','DOWN'],seq=Array.from({length:len||4},()=>DIRS[Math.random()*4|0]);let shown=-1,i=0,phase='show',st=T,flash=null;
 return vgRun({tick(){if(phase==='show'){const k=Math.floor((T-st)/.7);if(k>=seq.length){phase='input';st=T}else shown=k}else if(T-st>8)vgEnd(false)},
  key(k){if(phase!=='input')return;const m={L:'LEFT',R:'RIGHT',U:'UP',D:'DOWN'}[k];if(!m)return;flash={m,t:T};if(m===seq[i]){i++;SFX.click&&SFX.click();if(i>=seq.length)vgEnd(true)}else vgEnd(false)},
  draw(){vgPanel(label||'REPEAT IT',phase==='show'?'WATCH...':'YOUR TURN · '+i+'/'+seq.length,phase==='input'?1-(T-st)/8:null);
   const cx=W/2,cy=88,P_={UP:[0,-16],DOWN:[0,16],LEFT:[-22,0],RIGHT:[22,0]};
   for(const d of DIRS){const [dx,dy]=P_[d],on=(phase==='show'&&seq[shown]===d&&((T-st)%.7)<.5)||(flash&&flash.m===d&&T-flash.t<.25);R(cx+dx-14,cy+dy-5,28,10,on?'#ffd27a':'#2a2238');pxc(d,cx+dx,cy+dy-2,on?'#1a0a10':'#8a7aa8')}}})}
/* ---------- THROW ---------- */
function vgThrow(label){let tx=W/2,hits=0,shots=0,throws=[];
 return vgRun({tick(rdt){tx=W/2+Math.sin((T-this.t0)*2.4)*70;for(const t of throws)t.k+=rdt*2.2;throws=throws.filter(t=>t.k<1);if(T-this.t0>12)vgEnd(hits>=2)},
  key(k){if(k!=='E'||shots>=3)return;shots++;const hit=Math.abs(tx-W/2)<12;throws.push({k:0,hit});SFX.whoosh&&SFX.whoosh();if(hit){hits++;setTimeout(()=>{SFX.smack&&SFX.smack();shake(.3)},250)}if(shots>=3)setTimeout(()=>vgEnd(hits>=2),500)},
  draw(){vgPanel(label||'THROW IT','E WHEN THE TARGET IS IN THE MIDDLE · '+hits+'/2 HITS · '+(3-shots)+' LEFT',1-(T-this.t0)/12);
   R(W/2-1,58,2,48,'rgba(255,210,122,.4)');R(tx-6,74,12,12,'#b81020');R(tx-3,77,6,6,'#f4ead8');R(tx-1,79,2,2,'#b81020');
   for(const t of throws){const y=150-t.k*70;R(W/2-2,y,4,4,'#e8c040')}}})}
/* ---------- RACE ---------- */
function vgRace(rival){let me=0,them=0,last=null;const rs=.13+Math.random()*.05;
 return vgRun({tick(rdt){them+=rs*rdt;if(me>=1)vgEnd(true);else if(them>=1)vgEnd(false)},
  key(k){if((k==='L'||k==='R')&&k!==last){last=k;me+=.045}},
  draw(){vgPanel('RACE '+(K[rival]?K[rival].n.toUpperCase():'THEM')+' THERE','MASH LEFT + RIGHT',null);const x0=60,w=200;
   R(x0,62,w,6,'#2a2238');R(x0,62,Math.round(w*Math.min(1,me)),6,'#9ad09a');px('YOU',x0-22,62,'#9ad09a');
   R(x0,74,w,6,'#2a2238');R(x0,74,Math.round(w*Math.min(1,them)),6,'#ff6a5a');px(K[rival]?K[rival].n.split(' ')[0].toUpperCase():'THEM',x0-4-pxw(K[rival]?K[rival].n.split(' ')[0].toUpperCase():'THEM'),74,'#ff6a5a');R(x0+w,58,2,26,'#f4ead8')}})}

/* ---------- complications ---------- */
const COMP=[
 {k:'snatch',w:3,run:async()=>{const ks=['jaxon','brayden','kaylee','kayden','tez'].filter(k=>K[k]&&!D.dead[k]&&!A[k]);const id=pick(ks);if(!id)return null;
   const f=floorOf(D.room);put(id,A.you.x+(A.you.x<160?-30:30),A.you.x<160?1:-1,{y:clamp(A.you.y,f[0],f[1]),ex:'evil'});await walk(id,A.you.x+(A.you.x<160?-8:8),140);
   const what=pick(['phone','wallet','bag','hall pass','headphones']);SFX.whoosh&&SFX.whoosh();await say(id,pick(['YOINK.','Thanks for the '+what+', loser!','Finders keepers!']),'laugh');
   const ok=await vgChase(id,'your '+what);
   if(ok){await hit('you',id,{blood:2});A[id].pose='lie';await N('You tackle them into the lockers and rip your '+what+' back. A kid nearby says “daaaamn”.');if(typeof repAdd==='function')repAdd('feared',1)}
   else{const m=Math.min(3,D.money||0);D.money=(D.money||0)-m;updateLoc();await N('Gone. Out the door, around the corner, '+(what==='wallet'?'with $'+m+'.':'with your '+what+'. It turns up later in a trash can, sticky.'))}
   if(A[id]){A[id].pose=null;walk(id,A[id].x<160?-30:350,100).then(()=>{if(A[id])remove(id)})}return ok}},
 {k:'lock',w:2,run:async()=>{await N(pick(['The door’s jammed. Somebody jammed it with gum. On purpose.','The lock’s been glued. It’s always glued. Somebody in this school just glues locks.','It’s locked, and you need to be on the other side of it. You have a bobby pin and no shame.']));pose('you','kneel');
   const ok=await vgLock();pose('you',null);if(ok){await N('Click. You’re in. You feel like a movie.');D.apples=(D.apples||0)+1;updateLoc();toast('+1 🍎 (smooth)')}else{await N('The pick snaps off in the lock. Now NOBODY gets in that way. You find another way round. It takes forever.');D.apples=Math.max(0,(D.apples||0)-1);updateLoc()}return ok}},
 {k:'simon',w:2,run:async()=>{const id=pick(Object.keys(A).filter(k=>k!=='you'&&A[k]&&K[k]&&!K[k].adult&&!A[k].dead));
   if(id&&Math.random()<.5){await say(id,pick(['Wait. You can’t just walk up. You gotta do the handshake.','Nah nah nah. Handshake first. That’s the rule.']),'smirk');const ok=await vgSimon(4+(Math.random()*2|0),'THE HANDSHAKE');
    await say(id,ok?'…Okay. Okay, you’re cool. You’re actually cool.':'That was the WORST handshake I have ever seen. I’m telling everyone.',ok?'happy':'laugh');if(typeof repAdd==='function')repAdd(ok?'liked':'legend',ok?1:0);return ok}
   await N('Ms. Sherman is doing her patrol loop at the end of the hall. Same pattern every time. If you can remember it, you can slip past.');const ok=await vgSimon(5,'HER PATROL PATTERN');
   await N(ok?'You move when she moves. She never sees you.':'You go left when she goes left. She looks right at you, and writes something down, and keeps walking. That’s worse.');if(!ok){D.apples=Math.max(0,(D.apples||0)-1);updateLoc()}return ok}},
 {k:'throw',w:2,run:async()=>{const t=['coach','voss','shermian','adam','balduf'].find(k=>K[k]&&!D.dead[k]);await N('There’s a teacher right where you need to be. You need them looking the other way. You’ve got a handful of grapes.');
   const ok=await vgThrow('HIT THE FIRE ALARM SIGN');await N(ok?'Splat, splat. '+(t?K[t].n:'The teacher')+' spins round to see who’s throwing grapes at the sign. You walk straight past.':'You miss so badly a grape hits a sixth grader. The sixth grader starts crying. Everyone looks at YOU.');if(!ok)D.apples=Math.max(0,(D.apples||0)-1);updateLoc();return ok}},
 {k:'race',w:2,run:async()=>{const ks=['paul','kenneth','alex','jacob','arjun'].filter(k=>K[k]&&!D.dead[k]);const id=pick(ks);if(!id)return null;
   await N(K[id].n+' heard about it too, and wants it first. ('+pick(['The last slice.','The good seat.','The only working charger.','First dibs.'])+')');await say(id,'Race you. Loser buys snacks.','smirk');
   const ok=await vgRace(id);if(ok){D.money=(D.money||0)+2;updateLoc();await N('You get there first, wheezing. '+K[id].n+' owes you snacks. +$2.')}else{D.money=Math.max(0,(D.money||0)-2);updateLoc();await N(K[id].n+' wins by a mile and does a little dance. You owe snacks. -$2.')}return ok}}];
let COMP_T=-99;
{const _rh=runHook;runHook=async function(h){
 try{if(!TEST&&h&&h.mis&&MIS[h.mis]&&!h._comp&&(D.mp[h.mis]||0)>0&&!D.done[h.mis]&&!/^(cq_|wk_|ret_)/.test(h.mis)&&!['passing','gigs','robbery','lockedroom','crew'].includes(h.mis)&&!(typeof FILTHY!=='undefined'&&FILTHY.includes(h.mis))&&!busy&&D&&!D.weekend&&T-COMP_T>50&&Math.random()<.45&&panelMode==='roam'){
  COMP_T=T;const tot=COMP.reduce((s,c)=>s+c.w,0);let r=Math.random()*tot,c=COMP[0];for(const x of COMP){r-=x.w;if(r<=0){c=x;break}}
  await _rh({_comp:1,run:async()=>{await c.run();D.f.compDone=(D.f.compDone||0)+1;return 'stay'}});
  if(busy)return}}catch(e){console.error(e)}
 return _rh(h)}}

/* ---------- daily challenges ---------- */
const CHALL=[
 {id:'dodge',t:'Dodge 3 things in the halls',n:3,ev:'dodge'},{id:'grab',t:'Rip free from a grab',n:1,ev:'free'},{id:'quests',t:'Finish 2 quest steps',n:2,ev:'part'},
 {id:'gig',t:'Finish a side hustle',n:1,ev:'gig'},{id:'shove',t:'Shove 4 people',n:4,ev:'shove'},{id:'comp',t:'Beat 2 complications',n:2,ev:'compwin'},
 {id:'cash',t:'Snatch 5 loose coins',n:5,ev:'coin'},{id:'apple',t:'End a period with 6+ apples',n:1,ev:'apples'},{id:'fight',t:'Get into a hall fight',n:1,ev:'fight'}];
function challToday(){if(!D||D.weekend)return[];if(D.f.chall&&D.f.challDay===cal())return D.f.chall;
 const pool=CHALL.slice().sort(()=>Math.random()-.5).slice(0,3);D.f.chall=pool.map(c=>({id:c.id,t:c.t,n:c.n,ev:c.ev,c:0,done:0}));D.f.challDay=cal();return D.f.chall}
function challEv(ev,k){if(TEST||!D)return;for(const c of challToday()){if(c.done||c.ev!==ev)continue;c.c+=k||1;if(c.c>=c.n){c.done=1;D.money=(D.money||0)+5;D.apples=(D.apples||0)+1;updateLoc();
  setTimeout(()=>toast('🏆 Daily challenge done: '+c.t+' · +$5 +1🍎'),600);if(challToday().every(x=>x.done)){setTimeout(()=>toast('🏆🏆🏆 ALL THREE! +$10'),3200);D.money+=10;if(typeof repAdd==='function')repAdd('legend',1)}}}}
if(typeof DAILY_F!=='undefined')DAILY_F.push('chall','challDay');
/* hooks into the game */
if(typeof streakUp==='function'){const _s=streakUp;streakUp=function(){challEv('dodge');return _s()}}
if(typeof endGrab==='function'){const _g=endGrab;endGrab=function(free){if(free)challEv('free');return _g(free)}}
{const _pt=part;part=function(m,n,q){const was=D&&D.mp?(D.mp[m]||0):0;const r=_pt(m,n,q);try{if(D&&(D.mp[m]||0)>was&&!['passing','gigs'].includes(m))challEv('part')}catch(e){}return r}}
if(typeof gigPay==='function'){const _gp=gigPay;gigPay=function(g){challEv('gig');return _gp(g)}}
{const _ds=doShove;doShove=async function(id,o){challEv('shove');return _ds(id,o)}}
{const _vc=vgEnd;vgEnd=function(ok){if(ok)challEv('compwin');return _vc(ok)}}
ON_PERIOD.push(async()=>{if(D&&(D.apples||0)>=6)challEv('apples')});
if(CHX.hallfight){const _r=CHX.hallfight.run;CHX.hallfight.run=async()=>{challEv('fight');return _r()}}
{const _hu=HOOK.update;let lastM=null;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(!D)return;if(lastM!=null&&RT&&RT.ev&&RT.ev.k==='cash'&&(D.money||0)>lastM)challEv('coin',(D.money||0)-lastM);lastM=D.money||0}}
/* show them in ⚡ Do Now, on top */
{const _qn=qlNow;qlNow=function(body){_qn(body);if(!D||D.weekend)return;const l=challToday();if(!l.length)return;
 const box=qel('div','qcard');box.style.borderLeftColor='#ffd27a';box.appendChild(qel('div','ic','🏆'));const m=qel('div','m');box.appendChild(m);
 m.appendChild(qel('h4','','TODAY’S CHALLENGES  ·  $5 + 🍎 each, $10 for all three'));
 for(const c of l)m.appendChild(qel('div','act',(c.done?'✔ ':'▢ ')+c.t+'  ('+Math.min(c.c,c.n)+'/'+c.n+')'));
 const first=body.querySelector('.qsec');body.insertBefore(box,first||null)}}
ON_PERIOD.push(async(i,resume)=>{if(resume||!D||D.weekend||TEST||i!==0)return;const l=challToday();setTimeout(()=>toast('🏆 Today: '+l.map(c=>c.t).join(' · ')),6000)});
