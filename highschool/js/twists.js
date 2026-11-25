'use strict';
/* =====================================================================
   HIGHSCHOOL — EVERY SNEAK IS DIFFERENT
   Each stealth set piece has its own scary rule on top of sneak mode:
   • count   (Sherman's desk)   she counts to twenty out loud; at twenty
                                she sweeps the whole room. Be behind a box
                                or up in the vent. Then again, faster.
   • hum     (Voss's fridge)    he hums while he works. When the humming
                                stops he's LISTENING: freeze. Broken glass
                                crunches unless you crouch.
   • sensors (Sherman's office) motion-sensor lights click on if you walk
                                upright under them, and she comes to look.
   • phone   (wiping the phones) your own phone buzzes. P to silence it
                                before it rings out loud.
   • breath  (the old hatch)    when Mr. Adam passes right by you, hold
                                SPACE to hold your breath. Run out: gasp.
   • traps   (the Break-In)     Voss's mousetraps. Crouch to step over.
   ===================================================================== */
const TW={id:null,s:{}};
const twId=()=>!SNK.on?null:(typeof BI!=='undefined'&&BI.on)?'traps':(typeof SPC!=='undefined'&&SPC&&SPC.cfg&&SPC.cfg.twist)||null;
const twT=()=>PAT&&A[PAT.id];
const twHe=id=>K[id]&&/^(Mr|Coach)/.test(K[id].n)?'HE':'SHE';
function twBanner(txt,col,bg,pri){SNK.twMsg={t:txt,c:col,bg:bg?bg.slice(0,7):null,pri:pri||2};SNK.twMsgT=T}
function twMoved(s,a){const m=Math.abs(a.x-(s.lx==null?a.x:s.lx))>.05||Math.abs(a.y-(s.ly==null?a.y:s.ly))>.05;s.lx=a.x;s.ly=a.y;return m}
function twSpot(s,x){const t=twT();if(!t||!PAT||PAT.state!=='walk')return;PAT.inv=x;t.dir=x>t.x?1:-1;PAT.pause=0}

const TWX={
/* ---------- 1. THE COUNT ---------- */
count:{
 start(s){s.ph='wait';s.round=0},
 update(s,rdt){const t=twT(),a=A.you;if(!t)return;
  if(s.ph==='wait'){if(SNK.blind>=.99&&PAT.state==='walk'){s.ph='count';s.n=0;s.max=20;s.step=1.1;s.next=T+1.4;snkSay(t.id,'I’m going to count to twenty. Anyone still in my room at twenty gets the RULER.');(SNK.intro=SNK.intro||[]).push({t:'AT TWENTY SHE SWEEPS. HIDE BEHIND A BOX OR IN A VENT',until:T+7})}return}
  if(s.ph==='count'){if(T>s.next){s.n++;s.next=T+s.step;SFX.click&&SFX.click();try{tone(s.n>=s.max-3?180:120,.08,'square',.06)}catch(_){}
    snkSay(t.id,s.n>=s.max?'…'+s.n+'. Ready or not.':s.n+'…');
    if(s.n>=s.max){s.ph='sweep';s.t0=T;s.seen=0;PAT.state='script';t.moving=false;SNK.coneLen=210;SNK.coneW=38;SFX.sting&&SFX.sting()}}return}
  if(s.ph==='sweep'){const el=T-s.t0;t.dir=Math.floor(el/1.1)%2===0?(a.x>t.x?1:-1):(a.x>t.x?-1:1);
   const hidden=SNK.vent||covered();const facing=Math.sign(a.x-t.x)===t.dir&&Math.abs(a.x-t.x)<210;
   if(!hidden&&facing){s.seen+=rdt;if(s.seen>.35){SNK.coneLen=0;SNK.coneW=0;PAT.state='walk';snkSay(t.id,'THERE you are.');return caughtBy(PAT.id)}}
   if(el>3.3){SNK.coneLen=0;SNK.coneW=0;PAT.state='walk';s.round++;s.ph='count';s.n=0;s.max=s.round===1?12:8;s.step=s.round===1?.95:.8;s.next=T+1.5;
    snkSay(t.id,s.round===1?'…Hm. Again. Twelve this time.':'Eight. I can do this all day, sweetheart.')}}},
 screen(s){if(s.ph==='count'||s.ph==='sweep'){const n=s.ph==='sweep'?s.max:s.n,col=s.ph==='sweep'?'#ff4a3a':n>=s.max-3?'#ff8a6a':'#ffe8d0';
   R(W-46,64,40,26,'#000000b8');px(String(n),W-40,68,col,3);px('/'+s.max,W-22,82,'#8a8090');
   if(s.ph==='sweep')twBanner(SNK.vent||covered()?'SWEEP. STAY DOWN.':'SWEEP. HIDE NOW: BOX OR VENT',Math.sin(T*12)>0?'#ff6a5a':'#ffd0c8','#300808e0')}}},
/* ---------- 2. HE HUMS ---------- */
hum:{
 start(s){s.ph='hum';s.t=T+4;s.glass=[];const gl=snkGoal();const a=A.you;const lo=Math.min(a.x,gl?gl.x:160),hi=Math.max(a.x,gl?gl.x:160);
  for(let i=1;i<=3;i++){let x=Math.round(lo+(hi-lo)*i/4);if(SNK.crates.some(c=>Math.abs(c.x-x)<12))x+=14;s.glass.push({x,y:floorOf(D.room)[0]+16,hit:0})}
  (SNK.intro=SNK.intro||[]).push({t:'WHEN THE HUMMING STOPS FREEZE. CROUCH OVER GLASS',until:T+7})},
 update(s,rdt){const t=twT(),a=A.you;if(!t)return;const mv=twMoved(s,a);
  if(PAT.state==='walk'||PAT.state==='script'){
   if(T>s.t){if(s.ph==='hum'){s.ph='listen';s.t=T+2+Math.random()*1.6;PAT.state='script';t.moving=false;snkSay(t.id,'(stops humming)');try{tone(90,.3,'sine',.12)}catch(_){}}
    else{s.ph='hum';s.t=T+3.5+Math.random()*3;PAT.state='walk';s.sus=0}}
   if(s.ph==='hum'&&Math.random()<rdt*2.2){try{tone(pick([262,294,330,349,392]),.32,'triangle',.05)}catch(_){}}
   if(s.ph==='listen'&&mv&&!SNK.vent){s.sus=(s.sus||0)+rdt;if(s.sus>.18){PAT.state='walk';PAT.alert=Math.min(1.05,PAT.alert+.6);t.dir=a.x>t.x?1:-1;s.ph='hum';s.t=T+2;snkSay(t.id,'I HEARD that.')}}}
  if(!SNK.vent)for(const gl of s.glass){const on=Math.abs(a.x-gl.x)<6;if(on&&mv&&!SNK.crouch&&!gl.hit){gl.hit=1;SFX.glass&&SFX.glass();shake(.15);if(PAT&&PAT.state!=='chase'){PAT.state='walk';PAT.alert=Math.min(1.05,PAT.alert+.5);twSpot(s,a.x);snkSay(t.id,'…Glass? Who’s walking on my glass?')}}if(!on)gl.hit=0}},
 draw(s){for(const gl of s.glass){const lit=Math.sin(T*3+gl.x)>.2;R(gl.x-5,gl.y,3,1,'#9ac8e0');R(gl.x-1,gl.y-1,2,1,'#c8e8f8');R(gl.x+2,gl.y+1,3,1,'#8ab0c8');if(lit)R(gl.x,gl.y-1,1,1,'#ffffff')}
  const t=twT();if(t&&!SNK.vent){const x=t.x+8,y=t.y-46+Math.round(Math.sin(T*3)*1);if(s.ph==='hum'){R(x,y,1,5,'#ffe8a0');R(x-2,y+4,3,2,'#ffe8a0');R(x+1,y,2,1,'#ffe8a0')}}},
 screen(s){if(SNK.vent)return;if(s.ph==='listen')twBanner(twHe(PAT&&PAT.id)+' STOPPED HUMMING. FREEZE.',Math.sin(T*10)>0?'#ff6a5a':'#ffd0c8','#300808e0');else twBanner(twHe(PAT&&PAT.id)+' IS HUMMING. MOVE NOW','#9ad09a',null,3)}},
/* ---------- 3. MOTION-SENSOR LIGHTS ---------- */
sensors:{
 start(s){s.sens=[56,128,200,272].map(x=>({x,on:0}));(SNK.intro=SNK.intro||[]).push({t:'SENSOR LIGHTS. CROUCH WHEN YOU PASS UNDER ONE',until:T+7})},
 update(s,rdt){const t=twT(),a=A.you;if(!t)return;const mv=twMoved(s,a);
  for(const z of s.sens){if(!SNK.vent&&mv&&!SNK.crouch&&Math.abs(a.x-z.x)<18&&T>z.on){z.on=T+4;SFX.click&&SFX.click();try{tone(1200,.04,'square',.04)}catch(_){}if(Math.abs(t.x-z.x)<180&&PAT.state==='walk'){twSpot(s,z.x);snkSay(t.id,pick(['Who’s there?','Somebody tripped my light.','I SEE that light.']))}}
   if(T<z.on&&!SNK.vent&&Math.abs(a.x-z.x)<22&&PAT.state==='walk'&&Math.sign(a.x-t.x)===t.dir&&Math.abs(a.x-t.x)<170)PAT.alert=Math.min(1.05,PAT.alert+.9*rdt)}
  if(PAT.inv!=null&&PAT.state==='walk'){t.dir=PAT.inv>t.x?1:-1;PAT.pause=0;if(Math.abs(t.x-PAT.inv)<6){PAT.inv=null;PAT.pause=1.6}}},
 draw(s){for(const z of s.sens){const on=T<z.on;R(z.x-4,70,9,4,'#2a2a30');R(z.x-3,71,7,2,'#3a3a44');R(z.x,73,1,1,on?'#9aff9a':(Math.sin(T*2+z.x)>0?'#ff3a3a':'#6a1a1a'));
   if(on){g.save();g.globalCompositeOperation='lighter';const lg=g.createLinearGradient(0,74,0,170);lg.addColorStop(0,'rgba(255,240,200,.45)');lg.addColorStop(1,'rgba(255,240,200,.05)');g.fillStyle=lg;g.beginPath();g.moveTo(z.x-4,74);g.lineTo(z.x+4,74);g.lineTo(z.x+28,170);g.lineTo(z.x-28,170);g.fill();g.restore()}}},
 screen(s){const a=A.you;if(SNK.vent||busy)return;const near=s.sens.find(z=>Math.abs(a.x-z.x)<26);if(near&&!SNK.crouch)twBanner('SENSOR LIGHT ABOVE YOU. CROUCH WITH C','#ffd890')}},
/* ---------- 4. YOUR PHONE ---------- */
phone:{
 start(s){s.next=T+9+Math.random()*5;s.count=0;(SNK.intro=SNK.intro||[]).push({t:'IF YOUR PHONE BUZZES PRESS P FAST',until:T+7})},
 update(s,rdt){const t=twT();if(!t)return;
  if(!s.ring&&T>s.next&&s.count<4&&PAT.state==='walk'){s.ring={t0:T,dur:2},s.count++;s.from=pick([['HASAN','yo where r u'],['NIVAAN','did u get it yet'],['MOM','pick up milk'],['KAYDEN','bro answer'],['DAVID','dont get caught lol']])}
  if(s.ring){const el=T-s.ring.t0;if(Math.floor(el*6)%2===0&&Math.random()<rdt*14){try{noise(.04,.05,140,3,'bandpass')}catch(_){}}
   if(el>s.ring.dur){s.ring=null;s.next=T+12+Math.random()*8;s.show=null;
    for(let i=0;i<6;i++)setTimeout(()=>{try{tone([659,784,880,784,659,523][i],.14,'square',.08)}catch(_){}},i*140);
    snkSay(t.id,'WHOSE. PHONE. IS. THAT.');
    if(SNK.vent){const g0=SNK.grates.slice().sort((p,q)=>Math.abs(p.x-SNK.vx)-Math.abs(q.x-SNK.vx))[0];snkPeek(g0,true)}else{PAT.state='chase';PAT.seen=true;PAT.alert=1.05;t.ex='angry'}}}},
 key(s){if(!s.ring)return false;s.ring=null;s.next=T+11+Math.random()*8;s.show={t:s.from,until:T+2.4};SFX.click&&SFX.click();return true},
 screen(s){if(s.ring){const left=Math.max(0,1-(T-s.ring.t0)/s.ring.dur);twBanner('YOUR PHONE IS BUZZING! PRESS P TO SILENCE IT',Math.sin(T*12)>0?'#ff6a5a':'#ffe8a0','#300808',1);R(W/2-50,50,Math.round(100*left),2,'#ff6a5a')}
  else if(s.show&&T<s.show.until)twBanner('SILENCED. '+s.show.t[0]+': '+s.show.t[1].toUpperCase(),'#cbbfd8',null,3)}},
/* ---------- 5. HOLD YOUR BREATH ---------- */
breath:{
 start(s){s.air=1;s.hold=false;(SNK.intro=SNK.intro||[]).push({t:'WHEN HE IS CLOSE HOLD SPACE TO HOLD YOUR BREATH',until:T+7})},
 update(s,rdt){const t=twT(),a=A.you;if(!t||PAT.state==='chase')return;const ax=SNK.vent?SNK.vx:a.x;s.zone=Math.abs(t.x-ax)<44;
  if(s.hold){s.air=Math.max(0,s.air-rdt*.26);if(s.air<=0){s.hold=false;SFX.gasp&&SFX.gasp();s.air=.25;if(s.zone){PAT.alert=Math.min(1.05,PAT.alert+.7);t.dir=ax>t.x?1:-1;snkSay(t.id,'…Was that a gasp?')}}}
  else s.air=Math.min(1,s.air+rdt*.32);
  if(s.zone&&!s.hold){s.heard=(s.heard||0)+rdt;if(s.heard>.5){PAT.alert=Math.min(1.05,PAT.alert+1.1*rdt);if(!s.said){s.said=1;snkSay(t.id,'(sniffing) …Is somebody BREATHING in here?')}}}else{s.heard=0;if(!s.zone)s.said=0}
  if(s.zone&&Math.random()<rdt*1.6){try{tone(48,.12,'sine',.22)}catch(_){}}},
 screen(s){if(busy)return;const a=A.you;if(s.zone||s.air<1){const x=8;R(x,148,70,9,'#000000c0');R(x+2,150,Math.round(66*s.air),5,s.air<.3?'#ff5a4a':'#8ac8f0');px('BREATH',x+2,140,'#cbe0f0')}
  if(s.zone&&!s.hold)twBanner('HE IS RIGHT THERE. HOLD SPACE TO HOLD YOUR BREATH',Math.sin(T*10)>0?'#ff6a5a':'#ffd0c8','#300808e0')}},
/* ---------- 6. MOUSETRAPS ---------- */
traps:{
 start(s){const f=floorOf(D.room);s.traps=[84,140,236].map(x=>({x,y:f[0]+14,shut:0}));(SNK.intro=SNK.intro||[]).push({t:'MOUSETRAPS. CROUCH TO STEP OVER THEM',until:T+7})},
 update(s,rdt){const a=A.you;if(SNK.vent||!a)return;const mv=twMoved(s,a);const t=A.voss;
  for(const tr of s.traps){if(tr.shut||!mv||Math.abs(a.x-tr.x)>4)continue;if(SNK.crouch){tr.over=T;continue}
   tr.shut=1;SFX.smack&&SFX.smack();shake(.35);a.ex='hurt';setTimeout(()=>{if(A.you)A.you.ex=null},700);
   if(t&&PAT&&PAT.state==='walk'){PAT.alert=Math.min(1.05,PAT.alert+.7);t.dir=a.x>t.x?1:-1;snkSay('voss','(far away, delighted) Oh! Did we catch one?')}}},
 draw(s){for(const tr of s.traps){const x=tr.x,y=tr.y;R(x-4,y-1,9,2,'#8a6038');R(x-4,y-1,9,1,'#a87848');if(tr.shut){R(x-3,y-3,7,1,'#c8c8c8');R(x-3,y-2,1,1,'#c8c8c8')}else{R(x-3,y-2,6,1,'#c8c8c8');R(x+3,y-5,1,4,'#c8c8c8');R(x-1,y-2,2,1,'#e8d070')}
  if(Math.sin(T*4+x)>.6)R(x+3,y-5,1,1,'#ffffff')}}}
};
/* run them */
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);const id=twId();
 if(id!==TW.id){if(TW.id){SNK.coneLen=0;SNK.coneW=0;if(PAT)PAT.inv=null}TW.id=id;TW.s={};if(id&&TWX[id].start)TWX[id].start(TW.s)}
 if(id&&!TEST&&snkFree()&&TWX[id].update)TWX[id].update(TW.s,rdt)}}
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{_do&&_do(...x);if(TW.id&&TWX[TW.id].draw&&!TEST&&ROOM===D.room)TWX[TW.id].draw(TW.s)}}
{const _ss=snkScreen;snkScreen=function(){_ss();if(TW.id&&TWX[TW.id].screen&&!TEST&&SNK.on){g.setTransform(1,0,0,1,0,0);TWX[TW.id].screen(TW.s)}}}
/* keys: P silences the phone, SPACE/H held = hold your breath */
addEventListener('keydown',e=>{if(!TW.id||busy||panelMode!=='roam')return;const k=e.key;
 if(TW.id==='phone'&&(k==='p'||k==='P')){if(TWX.phone.key(TW.s)){e.preventDefault();e.stopImmediatePropagation()}}
 if(TW.id==='breath'&&(k===' '||k==='h'||k==='H')&&TW.s.zone!=null&&(TW.s.zone||TW.s.hold)){e.preventDefault();e.stopImmediatePropagation();if(TW.s.air>.05)TW.s.hold=true}},true);
addEventListener('keyup',e=>{if(TW.id==='breath'&&(e.key===' '||e.key==='h'||e.key==='H'))TW.s.hold=false});
/* touch buttons */
{const _sb=snkBtns;snkBtns=function(on){_sb(on);const b=$('snkb');if(!b)return;if(!$('sbP')){const p=document.createElement('button');p.id='sbP';p.textContent='SILENCE';p.onclick=e=>{e.preventDefault();if(TW.id==='phone')TWX.phone.key(TW.s)};b.appendChild(p);
  const h=document.createElement('button');h.id='sbH';h.textContent='HOLD BREATH';h.addEventListener('pointerdown',e=>{e.preventDefault();if(TW.id==='breath'&&TW.s.air>.05)TW.s.hold=true});h.addEventListener('pointerup',()=>{if(TW.id==='breath')TW.s.hold=false});b.appendChild(h)}}}
