'use strict';
/* =====================================================================
   HIGHSCHOOL — SNEAK MODE
   Every stealth event (main-story set pieces, the Break-In) switches to
   a different look and a toolkit:
   • The camera comes in close and follows you. Letterbox, grain, vignette.
   • C: crouch. Slower, much harder to spot, and a box between you and
     the teacher hides you completely.
   • E next to a box: grab it and drag it (it scrapes: they HEAR that).
   • Vent grates sit high on the wall. Drag a box under one, stand on it,
     UP: you climb into the vents. The view cuts to the duct: you crawl,
     the hall is below you. Crawling over a teacher makes noise; if they
     hear enough they stop, open the grate and shine a light in. BACK
     AWAY out of the beam or a hand comes in and pulls you down.
   • DOWN at a grate: drop out (thud: anyone near hears it). To get back
     up you need a box under that grate.
   • In the dark you hold a real flashlight (V toggles it: on, you see and
     they see you sooner; off, you’re nearly blind but nearly invisible).
     Teachers on patrol in the dark carry a flashlight (Voss a lantern),
     and their beam IS their sight.
   ===================================================================== */
const SNK={on:false,crouch:false,light:true,grab:null,side:1,vent:false,vx:0,crawl:0,crates:[],grates:[],hear:0,peek:null,cool:0,noise:0,anim:false,lastZ:1,wasFree:false,tip:0,line:null};
const snkDarkBase=()=>(typeof BI!=='undefined'&&BI.on)||(typeof LDS!=='undefined'&&LDS.on&&typeof SPC!=='undefined'&&SPC);
const snkDark=()=>snkDarkBase()||SNK.blind>.05;
const snkDA=()=>snkDarkBase()?1:SNK.blind;
const sneakActive=()=>!TEST&&D&&A.you&&ROOM===D.room&&((typeof SPC!=='undefined'&&SPC&&ROOM===SPC.room&&PAT)||(typeof BI!=='undefined'&&BI.on));
function snkSetup(){
 const f=floorOf(D.room),ox=typeof SPC!=='undefined'&&SPC?SPC.x:198,px_=A.you.x;
 const ga=clamp(ox+(ox<160?16:-16),24,296),gb=clamp(px_+(px_<160?34:-34),24,296);const xs=[ga];if(Math.abs(gb-ga)>=40)xs.push(gb);if(Math.abs(gb-ga)>=90)xs.splice(1,0,Math.round((ga+gb)/2));else xs.push(clamp(ga+(ga<160?110:-110),24,296));
 SNK.grates=xs.map(x=>prop({t:'grate',x,y:90,open:0,layer:-200}));
 const near=SNK.grates[SNK.grates.length-1],obj=SNK.grates[0];
 SNK.crates=[prop({t:'crate',x:clamp(near.x+(near.x<160?28:-28),18,302),y:f[0]+12}),prop({t:'crate',x:clamp(obj.x+(obj.x<160?30:-30),18,302),y:f[0]+12})];
}
function snkStart(){SNK.blind=0;SNK.blindDone=0;if(typeof SPC!=='undefined'&&SPC&&!snkDarkBase())setTimeout(snkBlinds,700);SNK.on=true;SNK.crouch=false;SNK.light=true;SNK.grab=null;SNK.vent=false;SNK.peek=null;SNK.hear=0;SNK.noise=0;SNK.cool=T+6;snkSetup();snkBtns(true);
 if(!P.f)P.f={};if(!P.f.snkTip){P.f.snkTip=1;setTimeout(()=>toast('SNEAK MODE: C crouch · E drag a box · stand on a box under a vent and press UP · V flashlight in the dark'),900)}}
function snkStop(){SNK.blind=0;SNK.blindDone=1;if(SNK.vent)snkUnvent();for(const p of SNK.crates.concat(SNK.grates))p.hide=1;
 for(const p of SNK.crates.concat(SNK.grates)){const i=props.indexOf(p);if(i>=0)props.splice(i,1)}
 SNK.crates=[];SNK.grates=[];SNK.on=false;SNK.grab=null;SNK.peek=null;if(A.you&&A.you.pose==='crouch')A.you.pose=null;snkBtns(false);
 CAM.z=1;if(A.you&&!SNK.vent)A.you.alpha=1}
function snkUnvent(){const a=A.you;SNK.vent=false;HIDE=null;if(a){a.alpha=1;a.back=0;a.x=SNK.vx;a.y=floorOf(D.room)[0]+10}}
/* ---------- drawing the bits ---------- */
{const _dp=drawProp;drawProp=function(p){
 if(p.t==='crate'){const x=Math.round(p.x),y=Math.round(p.y);R(x-9,y-1,18,2,'rgba(0,0,0,.3)');R(x-8,y-15,16,15,'#8a6038');R(x-8,y-15,16,2,'#b0804c');R(x-8,y-6,16,1,'#6a4628');R(x-8,y-11,16,1,'#6a4628');R(x-8,y-15,1,15,'#5a3a20');R(x+7,y-15,1,15,'#5a3a20');
  for(let i=0;i<12;i++)R(x-6+i,y-13+i,1,1,'#6a4628');if(SNK.grab===p){R(x-8,y-16,16,1,'#ffe8a0')}return}
 if(p.t==='grate'){const x=Math.round(p.x),y=Math.round(p.y);R(x-9,y-5,18,10,'#3a3e46');R(x-8,y-4,16,8,p.open>0?'#08080c':'#1c2026');
  if(p.open<=0)for(let i=0;i<4;i++)R(x-7,y-3+i*2,14,1,'#7a808a');
  else{const h=Math.round(8*p.open);R(x-8,y+4,16,1,'#3a3e46');for(let i=0;i<4;i++)R(x-7+i*0,y+5+Math.round(i*h/4),14,1,'#7a808a')}
  R(x-8,y-4,1,1,'#9aa0aa');R(x+7,y-4,1,1,'#9aa0aa');return}
 return _dp(p)}}
/* ---------- helpers ---------- */
const nearCrate=()=>SNK.crates.find(c=>Math.abs(c.x-A.you.x)<16);
const grateAt=x=>SNK.grates.find(g=>Math.abs(g.x-x)<11);
const canClimb=()=>{const g=grateAt(A.you.x);if(!g)return null;const c=SNK.crates.find(c=>Math.abs(c.x-g.x)<11&&Math.abs(c.x-A.you.x)<13);return c?g:false};
function covered(){if(!SNK.crouch||!PAT||SNK.grab)return false;const t=A[PAT.id];if(!t)return false;const s=Math.sign(t.x-A.you.x);return SNK.crates.some(c=>Math.abs(c.x-A.you.x)<19&&Math.sign(c.x-A.you.x)===s)}
function snkSay(id,t){SNK.line={id,t,until:T+2.6}}
async function snkClimb(g){const a=A.you;SNK.anim=true;SNK.crouch=false;a.pose='reach';a.dir=g.x>a.x?1:-1;await tw(a,{x:g.x,y:a.y-12},260,'out');SFX.locker&&SFX.locker();g.open=1;await tw(a,{alpha:0},200);
 SNK.vent=true;SNK.vx=g.x;HIDE={x:a.x,y:floorOf(D.room)[0]+10,d:{x:g.x}};a.pose=null;g.open=0;SNK.anim=false;
 if(PAT&&PAT.state==='chase'){const t=A[PAT.id];if(t&&Math.abs(t.x-a.x)<90){PAT.knows=1;snkPeek(g,true)}}}
async function snkDrop(g){const a=A.you;SNK.anim=true;g.open=1;SFX.locker&&SFX.locker();snkUnvent();a.x=g.x;const fy=a.y;a.y=fy-46;a.pose='reach';await tw(a,{y:fy},240,'in');a.pose=null;
 SFX.thud&&SFX.thud();shake(.25);a.ex='hurt';setTimeout(()=>{if(A.you)A.you.ex=null},600);g.open=0;SNK.anim=false;
 if(PAT&&PAT.state==='walk'){const t=A[PAT.id];if(t&&Math.abs(t.x-a.x)<110){PAT.alert=Math.min(.95,PAT.alert+.55);t.dir=a.x>t.x?1:-1;PAT.pause=1.4;snkSay(PAT.id,pick(['…What was that?','Hello?','Who’s there?']))}}}
function snkPeek(g,quick){const t=PAT&&A[PAT.id];if(!t||SNK.peek)return;SNK.peek={g,ph:'walk',t0:T,side:Math.sign(SNK.vx-g.x)||1,caught:0,quick};PAT.state='peek';t.fast=!!quick;
 snkSay(PAT.id,pick(['(stopping dead) …Something’s in the ceiling.','(looking up) Mice. Big mice.','I can HEAR you.']))}
function snkPeekEnd(){const p=SNK.peek,t=PAT&&A[PAT.id];SNK.peek=null;if(p)p.g.open=0;SNK.hear=0;SNK.cool=T+9;if(t){t.pose=null;t.fast=false}if(PAT){PAT.state='walk';PAT.alert=.3;PAT.knows=0;PAT.pause=1}
 if(t)snkSay(t.id,pick(['…Rats.','Must be the pipes.','I know you’re up there. I can wait.','(sniffing the grate) …Teenager.']))}
function snkCaughtVent(){const p=SNK.peek;if(!p)return;SNK.peek=null;const id=PAT.id;p.g.open=1;SFX.scream&&SFX.scream();shake(.5);toast('A hand comes through the grate and grabs your ankle.');
 snkUnvent();const a=A.you;a.x=p.g.x;const fy=a.y;a.y=fy-46;tw(a,{y:fy},220,'in').then(()=>{SFX.thud&&SFX.thud();p.g.open=0;if(PAT)caughtBy(id)})}
/* ---------- input ---------- */
const snkFree=()=>SNK.on&&!busy&&panelMode==='roam'&&!DL&&!CH&&A.you&&!SNK.anim;
function snkToggleGrab(){if(SNK.grab){SNK.grab=null;SFX.thud&&SFX.thud();return}const c=nearCrate();if(!c)return false;SNK.grab=c;SNK.side=Math.sign(c.x-A.you.x)||1;SNK.crouch=false;SFX.pick&&SFX.pick();return true}
function snkCrouch(){if(SNK.vent)return;SNK.crouch=!SNK.crouch;if(SNK.crouch)SNK.grab=null;if(!SNK.crouch&&A.you.pose==='crouch')A.you.pose=null}
function snkLight(){if(!snkDark())return toast('It’s daytime. You don’t need the flashlight.');SNK.light=!SNK.light;SFX.click&&SFX.click()}
function snkUp(){if(SNK.vent)return true;const g=canClimb();if(g){snkClimb(g);return true}if(g===false){toast('Too high. Drag a box under it.');return true}return false}
function snkDown(){if(!SNK.vent)return false;const g=grateAt(SNK.vx);if(g)snkDrop(g);else toast('No grate here. Crawl to one.');return true}
addEventListener('keydown',e=>{if(!snkFree())return;const k=e.key,stop=()=>{e.preventDefault();e.stopImmediatePropagation()};
 if(k==='c'||k==='C'){stop();snkCrouch()}
 else if(k==='v'||k==='V'){stop();snkLight()}
 else if(k==='ArrowUp'||k==='w'||k==='W'){if(snkUp())stop()}
 else if(k==='ArrowDown'||k==='s'||k==='S'){if(snkDown())stop()}
 else if(k==='e'||k==='E'||k===' '||k==='Enter'){if(e.repeat)return;if(SNK.vent){stop();snkDown()}else if(SNK.grab||nearCrate()){stop();snkToggleGrab()}}},true);
{const _uh=unhide;unhide=function(){if(SNK.vent){if(snkFree())snkDown();return}return _uh()}}
{const _hi=hideIn;hideIn=function(d){if(snkFree()&&(SNK.grab||nearCrate())){snkToggleGrab();return}return _hi(d)}}
{const _ct=caughtBy;caughtBy=function(id){if(SNK.vent)snkUnvent();SNK.peek=null;SNK.grab=null;return _ct(id)}}
{const _a=INPUT.act;INPUT.act=function(){if(snkFree()){if(SNK.vent)return snkDown();if(SNK.grab||nearCrate())return snkToggleGrab()}return _a.apply(this,arguments)}}
function snkBtns(on){let b=$('snkb');if(!b&&on){b=document.createElement('div');b.id='snkb';document.body.appendChild(b);const st=document.createElement('style');
  st.textContent='#snkb{position:fixed;right:10px;top:40%;z-index:30;display:flex;flex-direction:column;gap:6px}#snkb button{font:inherit;font-size:12px;padding:8px 10px;background:#141020dd;color:#e8e0f0;border:1px solid #6a5a8a;border-radius:6px;letter-spacing:.1em}#snkb button.on{background:#3a2a5add;border-color:#ffe8a0;color:#ffe8a0}';document.head.appendChild(st);
  for(const [id,l,f] of [['sbC','CROUCH',snkCrouch],['sbV','LIGHT',snkLight],['sbU','CLIMB',snkUp],['sbD','DROP',snkDown]]){const x=document.createElement('button');x.id=id;x.textContent=l;x.onclick=e=>{e.preventDefault();audio&&audio();if(snkFree())f()};b.appendChild(x)}}
 if(b)b.style.display=on&&document.body.classList.contains('touch')?'flex':'none'}
/* ---------- update ---------- */
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{
 const act=sneakActive();if(act&&!SNK.on)snkStart();else if(!act&&SNK.on)snkStop();
 if(!SNK.on){_hu&&_hu(dt,rdt);return}
 const a=A.you,free=snkFree(),ox=a.x,pa=PAT?PAT.alert:0,ps=PAT?PAT.state:null,cov=free&&!SNK.vent&&covered();
 if(cov&&PAT&&ps==='walk')PAT.alert=Math.min(PAT.alert,.9);
 _hu&&_hu(dt,rdt);
 if(!A.you||!SNK.on)return;
 /* camera */
 if(free){const tx=a.x,ty=SNK.vent?112:a.y-24;if(CAM.z!==2){CAM.z=2;CAM.x=tx;CAM.y=ty;fxState.flash=.35;fxState.flashC='#000'}const k=Math.min(1,rdt*5);CAM.x+=(tx-CAM.x)*k;CAM.y+=(ty-CAM.y)*k;SNK.lastZ=2}
 else if(SNK.wasFree&&CAM.z===2)CAM.z=1;
 SNK.wasFree=free;
 if(!free)return;
 /* in the vent */
 if(SNK.vent){const v=(keys.r-keys.l);if(v){SNK.vx=clamp(SNK.vx+v*32*rdt,Math.max(14,Math.min(...SNK.grates.map(g=>g.x))-20),Math.min(306,Math.max(...SNK.grates.map(g=>g.x))+20));SNK.crawl+=rdt*9;a.dir=v;
   if(Math.random()<rdt*3){try{noise(.05,.05,900+Math.random()*500,4,'bandpass')}catch(_){}}}
  a.x=SNK.vx;if(HIDE)HIDE.d.x=SNK.vx;
  const t=PAT&&A[PAT.id];
  if(SNK.peek&&t){const p=SNK.peek;
   if(p.ph==='walk'){const d=p.g.x-t.x;t.dir=Math.sign(d)||t.dir;t.moving=true;t.walk=(t.walk||0)+rdt*10;t.x+=Math.sign(d)*Math.min(Math.abs(d),(p.quick?70:42)*rdt);if(Math.abs(d)<2){p.ph='grip';p.t0=T;p.rt=0;t.moving=false;t.pose='reach'}}
   else if(p.ph==='grip'){if(T>p.rt){p.rt=T+.22;SFX.locker&&SFX.locker()}if(T-p.t0>1.1){p.ph='open';p.t0=T;SFX.door&&SFX.door()}}
   else if(p.ph==='open'){p.g.open=Math.min(1,(T-p.t0)/.5);if(T-p.t0>.6){p.ph='look';p.t0=T;p.side=-(Math.sign(SNK.vx-p.g.x)||1)}}
   else if(p.ph==='look'){const el=T-p.t0;if(Math.floor(el/1.3)%2===1&&!p.fl){p.fl=1;p.side*=-1}if(Math.floor(el/1.3)%2===0)p.fl=0;
    const dx=SNK.vx-p.g.x,inBeam=Math.abs(dx)<9||(Math.sign(dx)===p.side&&Math.abs(dx)<42);
    p.caught=inBeam?p.caught+rdt:Math.max(0,p.caught-rdt*.6);if(p.caught>.9)return snkCaughtVent();if(el>4.2)snkPeekEnd()}}
  else if(t&&PAT.state==='walk'){const moving=!!(keys.l||keys.r),dd=Math.abs(t.x-SNK.vx),overG=!!grateAt(SNK.vx);
   SNK.hear=clamp(SNK.hear+(moving&&dd<70?(overG?.75:.4)*rdt:-.2*rdt),0,1.2);
   if(T>SNK.cool&&SNK.hear>=1){const g=SNK.grates.slice().sort((x,y)=>Math.abs(x.x-SNK.vx)-Math.abs(y.x-SNK.vx))[0];snkPeek(g)}}
  else if(t&&PAT.state==='chase'&&PAT.knows&&!SNK.peek){const g=SNK.grates.slice().sort((x,y)=>Math.abs(x.x-SNK.vx)-Math.abs(y.x-SNK.vx))[0];snkPeek(g,true)}
  return}
 /* on the floor */
 for(const c of SNK.crates){c.layer=Math.min(0,a.y-c.y-1);if(SNK.crouch&&!SNK.grab&&Math.abs(c.x-a.x)<15){const t=PAT&&A[PAT.id];const away=t?(t.x>c.x?-1:1):(a.x<c.x?-1:1);a.x=c.x+away*15}}
 a.alpha=1;if(covered()&&!keys.l&&!keys.r){const c=SNK.crates.find(c=>Math.abs(c.x-a.x)<19);if(c)a.dir=c.x>a.x?1:-1}
 if(SNK.crouch){a.pose='crouch';a.x=ox+(a.x-ox)*.5}else if(a.pose==='crouch')a.pose=null;
 if(SNK.grab){const c=SNK.grab;a.x=ox+(a.x-ox)*.6;a.dir=SNK.side;if(Math.abs(a.x-ox)>.01){SNK.noise=Math.min(1,SNK.noise+rdt*1.4);if(Math.random()<rdt*7){try{noise(.08,.07,180+Math.random()*120,2,'bandpass')}catch(_){}}}
  c.x=clamp(a.x+SNK.side*13,14,306);c.y=a.y+2;if(c.x===14||c.x===306)a.x=c.x-SNK.side*13;a.pose='grab'}
 else if(a.pose==='grab')a.pose=null;
 SNK.noise=Math.max(0,SNK.noise-rdt*.5);
 if(PAT&&ps==='walk'&&PAT.state==='walk'){const t=A[PAT.id];const inc=PAT.alert-pa;
  if(cov)PAT.alert=Math.max(0,pa-.5*rdt);
  else if(inc>0)PAT.alert=pa+inc*.6*(SNK.crouch?.4:1)*(snkDark()?(SNK.light?.85:.35):1);
  if(t&&SNK.noise>.5&&Math.abs(t.x-a.x)<120){PAT.alert=Math.min(1.05,PAT.alert+.35*rdt);if(SNK.noise>.8&&!SNK.heard){SNK.heard=1;t.dir=a.x>t.x?1:-1;PAT.pause=1.2;snkSay(t.id,pick(['What’s that scraping?','Who’s moving furniture?','Hello?'] ))}}
  if(SNK.noise<.3)SNK.heard=0;
  if(PAT.alert>=1&&PAT.state==='walk'){PAT.state='chase';PAT.seen=true;SFX.sting&&SFX.sting();if(t)t.ex='angry';toast(K[PAT.id].n+' spotted you. RUN.')}}
}}
/* the push pose falls back to reach in art if unknown */
/* ---------- world-space drawing: cones, flashlights, darkness, hints ---------- */
const LCV=document.createElement('canvas');LCV.width=W;LCV.height=H;const lcx=LCV.getContext('2d');
function handOf(a){if(a._lensW&&T-a._lensT<.2)return a._lensW;const ad=K[a.id]&&K[a.id].adult;return{x:a.x+(a.dir||1)*(ad?7:6),y:a.y-(ad?19:15)}}
function cone(c,x,y,dir,len,spread,rgb,al){const gr=c.createRadialGradient(x,y,1,x,y,len);gr.addColorStop(0,'rgba('+rgb+','+al+')');gr.addColorStop(.7,'rgba('+rgb+','+(al*.6)+')');gr.addColorStop(1,'rgba('+rgb+',0)');
 c.fillStyle=gr;c.beginPath();c.moveTo(x,y-1.5);c.lineTo(x+dir*len,y-spread+4);c.lineTo(x+dir*len,y+spread+4);c.lineTo(x,y+1.5);c.closePath();c.fill()}
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{_do&&_do(...x);if(!SNK.on||!A.you||ROOM!==D.room)return;
 const a=A.you,t=(PAT&&A[PAT.id])||(typeof BI!=='undefined'&&BI.on&&A.voss)||null,dk=snkDark();
 const al=PAT?(PAT.state==='chase'?'255,70,60':PAT.alert>.5?'255,170,60':'255,236,170'):'255,236,170';
 if(dk){lcx.globalCompositeOperation='source-over';lcx.clearRect(0,0,W,H);lcx.fillStyle='rgba(4,3,10,'+(.92*snkDA())+')';lcx.fillRect(0,0,W,H);lcx.globalCompositeOperation='destination-out';
  if(!SNK.vent){const amb=lcx.createRadialGradient(a.x,a.y-14,1,a.x,a.y-14,16);amb.addColorStop(0,'rgba(0,0,0,.55)');amb.addColorStop(1,'rgba(0,0,0,0)');lcx.fillStyle=amb;lcx.fillRect(0,0,W,H)}
  if(SNK.light&&!SNK.vent&&a.torch==='on'){const h=handOf(a);cone(lcx,h.x,h.y,a.dir||1,92,22,'0,0,0',1)}
  const glow=(q,r)=>{const lg=lcx.createRadialGradient(q.x,q.y,1,q.x,q.y,r);lg.addColorStop(0,'rgba(0,0,0,.9)');lg.addColorStop(1,'rgba(0,0,0,0)');lcx.fillStyle=lg;lcx.fillRect(q.x-r,q.y-r,r*2,r*2)};
  if(!SNK.vent&&a.torch==='on')glow(handOf(a),9);if(t&&!t.dead)glow(handOf(t),10);
  if(t&&!t.dead){const h=handOf(t);if(t.id==='voss'){const lg=lcx.createRadialGradient(h.x,h.y,1,h.x,h.y,40);lg.addColorStop(0,'rgba(0,0,0,1)');lg.addColorStop(1,'rgba(0,0,0,0)');lcx.fillStyle=lg;lcx.fillRect(0,0,W,H)}
   if(SNK.peek&&SNK.peek.ph!=='walk'){const gq=SNK.peek.g;const lg=lcx.createRadialGradient(gq.x,gq.y,1,gq.x,gq.y,30);lg.addColorStop(0,'rgba(0,0,0,1)');lg.addColorStop(1,'rgba(0,0,0,0)');lcx.fillStyle=lg;lcx.fillRect(0,0,W,H)}
   else cone(lcx,h.x,h.y,t.dir||1,100,24,'0,0,0',1)}
  g.drawImage(LCV,0,0);
  /* things you can use stay readable in the dark */
  g.save();g.globalAlpha=.55*snkDA()+(1-snkDA());for(const q of SNK.grates)drawProp(q);for(const c of SNK.crates)drawProp(c);g.restore();
  if(!SNK.vent&&SNK.crates.some(c=>Math.abs(c.x-a.x)<22))drawActor(a);
  g.save();g.globalCompositeOperation='lighter';
  if(SNK.light&&!SNK.vent&&a.torch==='on'){const h=handOf(a);cone(g,h.x,h.y,a.dir||1,92,22,'255,230,160',.1*snkDA())}
  if(t&&!t.dead){const h=handOf(t);if(t.id==='voss'){const lg=g.createRadialGradient(h.x,h.y,1,h.x,h.y,40);lg.addColorStop(0,'rgba(255,170,80,.35)');lg.addColorStop(1,'rgba(255,170,80,0)');g.fillStyle=lg;g.fillRect(h.x-40,h.y-40,80,80)}
   if(!SNK.peek)cone(g,h.x,h.y,t.dir||1,100,24,al,.16*snkDA())}
  g.restore()}
 else if(t&&!t.dead&&PAT&&PAT.state!=='peek'){const ey=t.y-24;g.save();cone(g,t.x+(t.dir||1)*4,ey+8,t.dir||1,95,24,al,PAT.state==='chase'?.32:.24);g.restore()}
 /* ?/! */
 if(t&&PAT){const mk=PAT.state==='chase'?'!':PAT.state==='peek'?'?':PAT.alert>.08?'?':'';if(mk){const y=t.y-44-(Math.sin(T*8)>0?1:0);R(t.x-4,y-1,9,10,'#141020');R(t.x-4,y-1,9,1,'rgb('+al+')');
  if(mk==='?'&&PAT.state!=='peek'){g.globalAlpha=.35;R(t.x-3,y+1,7,7,'#ffffff');g.globalAlpha=1;R(t.x-3,y+8-Math.round(7*Math.min(1,PAT.alert)),7,Math.round(7*Math.min(1,PAT.alert)),'rgb('+al+')')}
  pxc(mk,t.x+1,y+1,mk==='!'?'#ffffff':'#2a2030')}}
 /* lines */
 if(SNK.line&&T<SNK.line.until&&A[SNK.line.id]&&!SNK.vent){const s=A[SNK.line.id],w=Math.min(150,pxw(SNK.line.t)+6),x=clamp(s.x-w/2,2,W-w-2),y=s.y-58;R(x,y,w,9,'#f4f0e6');R(x,y+9,w,1,'#2a2030');px(SNK.line.t,x+3,y+2,'#2a2030')}
}}
/* ---------- screen space: the different look, the vent cutaway, hints ---------- */
function crawler(sx,sy,s,dir,ph){const k=K.you,leg=Math.round(Math.sin(ph)*1.5),arm=Math.round(Math.sin(ph+Math.PI)*1.5);const P_=(x,y,w,h,c)=>R(Math.round(sx+(dir>0?x:-x-w)*s),Math.round(sy+y*s),w*s,h*s,c);
 P_(-9+leg,-3,4,3,k.pants);P_(-11+leg,-1,2,2,'#1a1a1a');P_(-6,-6,8,4,k.top);P_(-6,-6,8,1,'#e05a5a');P_(1+arm,-3,2,3,k.top);P_(2+arm,-1,2,1,k.skin);P_(2,-10,5,5,k.skin);P_(2,-11,5,2,k.top);P_(6,-10,2,1,k.top);P_(5,-8,1,1,'#1a1a1a')}
function snkScreen(){if(!SNK.on||!A.you||ROOM!==D.room||TEST)return;g.setTransform(1,0,0,1,0,0);
 const z=CAM.z,cx=clamp(CAM.x,W/2/z,W-W/2/z),cy=clamp(CAM.y,H/2/z,H-H/2/z),SX=wx=>Math.round(W/2-cx*z)+wx*z;
 if(SNK.vent){ventScreen();}
 /* film look */
 g.save();if(!REDV2){REDV2=document.createElement('canvas');REDV2.width=W;REDV2.height=H;const v=REDV2.getContext('2d');const gr=v.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.85);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.85)');v.fillStyle=gr;v.fillRect(0,0,W,H)}
 g.drawImage(REDV2,0,0);g.globalAlpha=.06;g.fillStyle='#4060a0';g.fillRect(0,0,W,H);g.globalAlpha=1;
 for(let i=0;i<60;i++){g.globalAlpha=.08;R(Math.random()*W|0,Math.random()*H|0,1,1,Math.random()<.5?'#fff':'#000')}g.globalAlpha=1;g.restore();
 R(0,0,W,8,'#000');R(0,H-8,W,8,'#000');
 /* hints */
 let h='';if(SNK.anim)h='';else if(SNK.vent)h=grateAt(SNK.vx)?'DOWN OR E: DROP OUT':'LEFT/RIGHT: CRAWL. QUIET NEAR THEM.';
 else if(SNK.grab)h='DRAGGING. IT SCRAPES. E TO LET GO';else{const gc=canClimb();if(gc)h='UP: CLIMB INTO THE VENT';else if(gc===false)h='VENT. TOO HIGH. DRAG A BOX UNDER IT';else if(nearCrate())h=SNK.crouch?'HIDE BEHIND THE BOX, OR E: GRAB IT':'E: GRAB THE BOX · C: CROUCH BEHIND IT';else h=(SNK.crouch?'CROUCHING':'C: CROUCH')+(snkDark()?' · V: FLASHLIGHT '+(SNK.light?'ON':'OFF'):'')}
 if(h&&!busy&&panelMode==='roam'){const w=pxw(h)+8;R(W/2-w/2,28,w,9,'#000000aa');pxc(h,W/2,30,'#ffe8a0')}
 if(covered()&&!busy){R(W/2-30,39,60,9,'#000000aa');pxc('HIDDEN',W/2,41,'#9ad09a')}}
let REDV2=null;
{const _dr=draw;draw=function(){_dr();try{snkScreen()}catch(e){if(TEST)throw e}}}
{const _er=enterRoom;enterRoom=async function(r){if(SNK.on)snkStop();return _er(r)}}
/* the close camera: cinema's zoom is reset by the engine every frame, so sneak mode draws its own */
{const _zd=zDraw;zDraw=function(){if(!SNK.on||TEST||Math.abs(CAM.z-1)<.01)return _zd();const z=CAM.z,cx=clamp(CAM.x,W/2/z,W-W/2/z),cy=clamp(CAM.y,H/2/z,H-H/2/z);
 g.imageSmoothingEnabled=false;g.setTransform(z,0,0,z,Math.round(W/2-cx*z),Math.round(H/2-cy*z));g._zm=1;try{_DRAW0()}finally{g._zm=0;g.setTransform(1,0,0,1,0,0)}}}

/* ---------- the vent, full screen ---------- */
const VF=138;   /* duct floor, screen y */
function ventScreen(){
 const vcx=clamp(SNK.vx,80,240),SV=wx=>Math.round(W/2+(wx-vcx)*2),dk=snkDark(),t=PAT&&A[PAT.id],p=SNK.peek;
 const lo=Math.max(14,Math.min(...SNK.grates.map(q=>q.x))-20),hi=Math.min(306,Math.max(...SNK.grates.map(q=>q.x))+20);
 /* shell */
 R(0,0,W,H,'#07080b');
 const wg=g.createLinearGradient(0,22,0,VF);wg.addColorStop(0,'#14171d');wg.addColorStop(.55,'#232832');wg.addColorStop(1,'#181b22');g.fillStyle=wg;g.fillRect(0,22,W,VF-22);
 R(0,8,W,14,'#2a2e36');R(0,20,W,2,'#3c414b');R(0,22,W,1,'#0c0d10');
 for(let wx=Math.floor((vcx-90)/24)*24;wx<vcx+90;wx+=24){const s=SV(wx);R(s,22,2,VF-22,'#11131a');R(s+2,22,1,VF-22,'#30353f');for(const yy of[13,30,VF-6])R(s-4,yy,2,2,'#5a606a');R(s-4,14,1,1,'#8a909a')}
 for(let i=0;i<40;i++){const wx=lo+((i*47.3)%(hi-lo)),s=SV(wx);R(s,VF-1-(i%2),2+(i%3),1,'#3a3f48')}
 for(let i=0;i<6;i++){const wx=lo+((i*83.1)%(hi-lo)),s=SV(wx);g.globalAlpha=.25;for(let k=0;k<8;k++)R(s+k,23+Math.round(Math.sin(k)*2)+k,1,1,'#9aa0aa');g.globalAlpha=1}
 /* ends of the duct */
 if(SV(lo)>0)R(0,8,SV(lo),VF+12,'#050507');if(SV(hi)<W)R(SV(hi),8,W-SV(hi),VF+12,'#050507');
 /* floor */
 R(0,VF,W,3,'#4a505a');R(0,VF+3,W,9,'#2a2e36');R(0,VF+12,W,1,'#0c0d10');
 /* teacher underneath: light and shadow leaking through the floor seams */
 if(t&&!t.dead){const s=SV(t.x);if(s>-30&&s<W+30){g.save();g.globalCompositeOperation='lighter';const lg=g.createRadialGradient(s,VF+6,1,s,VF+6,34);const c=dk?'255,220,150':'255,240,210';lg.addColorStop(0,'rgba('+c+','+(dk?.5:.22)+')');lg.addColorStop(1,'rgba('+c+',0)');g.fillStyle=lg;g.fillRect(s-34,VF-20,68,40);g.restore();
  for(let k=-10;k<=10;k+=4)R(s+k+Math.round(Math.sin(T*6+k)),VF+3,2,1,'#0a0a0c')}}
 /* grates */
 for(const q of SNK.grates){const s=SV(q.x);if(s<-24||s>W+24)continue;const hw=16;
  const under=t&&!t.dead&&Math.abs(t.x-q.x)<16;
  R(s-hw,VF,hw*2,12,dk?'#020203':'#2a2418');
  if(!dk){g.save();g.globalCompositeOperation='lighter';const lg=g.createLinearGradient(0,VF+12,0,VF-40);lg.addColorStop(0,'rgba(255,236,190,.28)');lg.addColorStop(1,'rgba(255,236,190,0)');g.fillStyle=lg;g.fillRect(s-hw-4,VF-40,hw*2+8,52);g.restore()}
  if(under&&(!p||p.g!==q||p.ph==='walk')){const hs=SV(t.x);const k=K[t.id]||{};R(hs-6,VF+4,12,8,k.hair||'#3a2a20');R(hs-4,VF+3,8,2,k.hair||'#3a2a20');if(dk){g.save();g.globalCompositeOperation='lighter';R(hs+(t.dir||1)*8-3,VF+6,6,4,'rgba(255,230,160,.6)');g.restore()}}
  const op=q.open||0,jit=p&&p.g===q&&p.ph==='grip'?Math.round(Math.sin(T*40)*1):0;
  if(op<1){const hh=Math.round(12*(1-op));for(let i=0;i<5;i++){const y=VF+1+Math.round(i*hh/5);if(i*hh/5<hh)R(s-hw+2+jit,y,hw*2-4,1,'#7a808a')}R(s-hw+jit,VF,1,12,'#5a606a');R(s+hw-1+jit,VF,1,12,'#5a606a')}
  else{R(s-hw,VF+10,hw*2,2,'#7a808a')}
  /* fingers through the slats */
  if(p&&p.g===q&&p.ph==='grip'){const k=K[t.id]||{};const sk=k.skin||'#e0b090';for(let f=0;f<4;f++){const fx=s-9+f*4+(f>1?4:0),up=Math.round(2+Math.abs(Math.sin(T*9+f))*3);R(fx+jit,VF-up+2,2,up,sk);R(fx+jit,VF-up+2,2,1,'#f4d0b0')}}
  /* face in the hole */
  if(p&&p.g===q&&(p.ph==='open'||p.ph==='look')&&t){const rise=p.ph==='open'?Math.min(1,(T-p.t0)/.5):1;
   g.save();g.beginPath();g.rect(s-hw,VF-40,hw*2,40+12);g.clip();
   g.setTransform(2,0,0,2,W/2-vcx*2,0);drawCopy(t,{x:q.x,y:Math.round((VF+12+70-26*rise)/2),dir:Math.sign(SNK.vx-q.x)||1,pose:p.ph==='look'?'reach':null,alpha:1,moving:false,ex:'cold',back:0,hold:null});g.setTransform(1,0,0,1,0,0);g.restore()}}
 /* the beam */
 if(p&&p.ph==='look'){const s=SV(p.g.x),len=42*2,bx=s+p.side*len,ey=VF-16;g.save();g.globalCompositeOperation='lighter';const lg=g.createLinearGradient(s,0,bx,0);lg.addColorStop(0,'rgba(255,240,190,.7)');lg.addColorStop(1,'rgba(255,240,190,0)');g.fillStyle=lg;g.beginPath();g.moveTo(s,ey-3);g.lineTo(bx,ey-34);g.lineTo(bx,VF+2);g.lineTo(s,ey+3);g.closePath();g.fill();g.restore()}
 /* you, crouch-crawling */
 const a=A.you;g.setTransform(2,0,0,2,W/2-vcx*2,0);drawCopy(a,{x:SNK.vx,y:Math.round(VF/2)+1,alpha:1,pose:'crouch',moving:!!(keys.l||keys.r),back:0,vis:true,hold:null,ex:p&&p.ph==='look'?'scared':a.ex});g.setTransform(1,0,0,1,0,0);
 /* where they are: the strip under the duct */
 const ry=VF+20,rx=v=>Math.round(24+(v-lo)/(hi-lo)*(W-48));R(18,ry-4,W-36,15,'#000000c0');R(24,ry+3,W-48,1,'#3a3e46');
 for(const q of SNK.grates){R(rx(q.x)-2,ry+1,5,5,'#5a606a');R(rx(q.x)-1,ry+2,3,3,'#1c2026')}
 R(rx(SNK.vx)-1,ry,3,7,'#ffe8a0');
 if(t&&!t.dead){const c=PAT.state==='peek'||PAT.state==='chase'?'#ff4a3a':'#ff9a6a';R(rx(clamp(t.x,lo,hi))-1,ry,3,7,c);px((K[t.id]?K[t.id].n:'').toUpperCase(),clamp(rx(clamp(t.x,lo,hi))-10,20,W-70),ry-11,c)}
 px('YOU',clamp(rx(SNK.vx)-6,20,W-40),ry+8,'#ffe8a0');
 if(t&&!t.dead){const s=SV(t.x);if(s<0||s>W){const L=s<0,x=L?6:W-12;R(x,VF-30,6,1,'#ff9a6a');for(let i=0;i<4;i++)R(L?x+i:x+5-i,VF-30-i,1,i*2+1,'#ff9a6a')}}
 /* noise */
 if(SNK.hear>.05&&!p){R(W-64,30,56,7,'#141020');R(W-63,31,Math.round(54*Math.min(1,SNK.hear)),5,SNK.hear>.7?'#ff5a4a':'#ffc860');px('NOISE',W-63,39,'#cbbfd8')}
 if(p&&p.ph==='look'&&p.caught>.15){const fl=Math.sin(T*14)>0;R(W/2-50,44,100,12,'#120206ee');pxc('GET OUT OF THE LIGHT',W/2,47,fl?'#ff6a6a':'#ffd0d0')}
}

function drawCopy(a,o){const c=Object.assign({},a,o);c._sx=c._sy=undefined;c._room=undefined;c._pose=c.pose;c._tr=null;c._lie=0;try{drawActor(c)}catch(e){if(TEST)throw e}}



/* ---------- the teacher closes the blinds / kills the lights ---------- */
const BLINDX={maths:268,chem:270,english:268,science:268,history:268,library:250};
async function snkBlinds(){if(!SNK.on||SNK.blindDone||!PAT)return;SNK.blindDone=1;const id=PAT.id,t=A[id];if(!t)return;PAT.state='script';
 const wx=BLINDX[D.room];
 if(wx!=null){t.ex='cold';await walk(id,wx,55);if(!SNK.on||!A[id])return;t.dir=1;pose(id,'reach');snkSay(id,pick(['Blinds down. Lights off.','Let’s make this… private.','(yanking the blinds shut) Nobody needs to see this.']));
  for(let i=0;i<3;i++){SFX.whoosh&&SFX.whoosh();await wait(180)}}
 else{pose(id,'reach');snkSay(id,'Lights off.');SFX.click&&SFX.click();await wait(250)}
 SFX.click&&SFX.click();await tw(SNK,{blind:1},900);if(A[id])pose(id,null);if(PAT&&PAT.id===id)PAT.state='walk';
 toast('The room goes dark. Your flashlight is on (V turns it off: harder to see, harder to be seen).')}
/* ---------- where to go ---------- */
function snkGoal(){if(typeof BI!=='undefined'&&BI.on)return BI.got?{x:20,t:'GET BACK TO THE CREW'}:{x:198,t:'GET INTO THE CHEM LAB'};
 if(typeof SPC!=='undefined'&&SPC)return{x:SPC.x,t:(SPC.cfg&&SPC.cfg.goal)||'GET TO THE OBJECTIVE, PRESS E'};return null}
/* goal marker + highlights drawn over the dark */
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{_do&&_do(...x);if(!SNK.on||SNK.vent||!A.you||ROOM!==D.room)return;const a=A.you,gl=snkGoal(),pu=(Math.sin(T*5)+1)/2;
 if(gl){const y=104+(pu>.5?1:0);R(gl.x-3,y,7,2,'#ff6a5a');R(gl.x-2,y+2,5,2,'#ff6a5a');R(gl.x-1,y+4,3,2,'#ff6a5a');pxc('GOAL',gl.x,y-8,'#ff8a7a')}
 const ring=(x0,y0,w,h)=>{g.globalAlpha=.4+.5*pu;R(x0,y0,w,1,'#ffe8a0');R(x0,y0+h-1,w,1,'#ffe8a0');R(x0,y0,1,h,'#ffe8a0');R(x0+w-1,y0,1,h,'#ffe8a0');g.globalAlpha=1};
 if(!busy){for(const c of SNK.crates)if(Math.abs(c.x-a.x)<34&&SNK.grab!==c)ring(Math.round(c.x)-10,Math.round(c.y)-17,20,18);
  const gc=canClimb();for(const q of SNK.grates)if(Math.abs(q.x-a.x)<12||gc===q)ring(q.x-11,q.y-7,22,14)}}}
/* the guide strip, edge arrows and a danger tip, on screen */
{const _ss=snkScreen;snkScreen=function(){_ss();if(!SNK.on||SNK.vent||!A.you||ROOM!==D.room||TEST||busy)return;g.setTransform(1,0,0,1,0,0);
 const a=A.you,t=PAT&&A[PAT.id],gl=snkGoal(),z=CAM.z,cx=clamp(CAM.x,W/2/z,W-W/2/z),SX=wx=>Math.round(W/2-cx*z)+wx*z;
 /* strip */
 const y=42,rx=v=>Math.round(24+(clamp(v,0,320))/320*(W-48));R(16,y-1,W-32,10,'#000000b8');R(24,y+6,W-48,1,'#3a3e46');
 for(const q of SNK.grates)R(rx(q.x)-2,y+1,5,2,'#7a808a');
 for(const c of SNK.crates)R(rx(c.x)-2,y+4,5,4,'#a8743c');
 if(gl){R(rx(gl.x)-1,y,3,8,'#ff6a5a');R(rx(gl.x)+2,y,3,2,'#ff6a5a')}
 if(t&&!t.dead){const tx=rx(t.x),c=PAT.state==='chase'?'#ff3a2a':'#ff9a6a';R(tx-1,y+1,3,7,c);g.globalAlpha=.5;R(t.dir>0?tx+2:tx-6,y+3,4,3,'#ffd890');g.globalAlpha=1}
 R(rx(a.x)-1,y+1,3,7,'#ffe8a0');
 /* goal line */
 if(gl){const dir=gl.x<a.x-8?'LEFT':gl.x>a.x+8?'RIGHT':'HERE';const txt='GOAL: '+gl.t+(dir==='HERE'?' · PRESS E':' · GO '+dir);const w=pxw(txt)+8;R(W/2-w/2,y+11,w,9,'#000000b0');pxc(txt,W/2,y+13,'#ff9a8a')}
 /* edge arrow to the goal */
 if(gl){const s=SX(gl.x);if(s<6||s>W-6){const L=s<6,x0=L?8:W-14;for(let i=0;i<5;i++)R(L?x0+i:x0+5-i,90-i,1,i*2+1,'#ff6a5a');pxc('GOAL',L?x0+10:x0-6,100,'#ff8a7a')}}
 /* danger tip */
 if(t&&PAT&&PAT.state==='walk'&&PAT.alert>.25&&!covered()){const tip=SNK.crates.some(c=>Math.abs(c.x-a.x)<40)?'SHE SEES SOMETHING. PRESS C, HIDE BEHIND THE BOX':'SHE SEES SOMETHING. GET OUT OF THE LIGHT';const tt=K[t.id]&&/^(Mr|Coach)/.test(K[t.id].n)?tip.replace('SHE','HE'):tip;const w=pxw(tt)+8;R(W/2-w/2,128,w,10,'#300808e0');pxc(tt,W/2,130,Math.sin(T*10)>0?'#ff7a6a':'#ffd0c8')}
 if(t&&PAT&&PAT.state==='chase'){const tt='SPOTTED. RUN. HIDE IN A DOORWAY WITH E, OR A VENT';const w=pxw(tt)+8;R(W/2-w/2,128,w,10,'#300808e0');pxc(tt,W/2,130,'#ff7a6a')}}}

/* who holds what: the flashlight is gripped in the sprite's hand and the beam starts at its lens */
{const _da=drawActor;drawActor=function(a){if(!a||!a.k)return _da(a);
 const want=SNK.on&&snkDark()&&ROOM===D.room?(a.id==='you'&&!SNK.vent?(SNK.light?'on':'off'):((PAT&&a.id===PAT.id)||(typeof BI!=='undefined'&&BI.on&&a.id==='voss')?(a.id==='voss'?'lantern':'on'):null)):null;
 if(want&&!a.dead&&a.pose!=='reach'&&a.pose!=='grab')a.torch=want;else if(a.torch)a.torch=null;
 drawKid._lens=null;const r=_da(a);
 if(a.torch&&drawKid._lens){a._lensW={x:Math.round(a.x)+drawKid._lens.dx,y:Math.round(a.y-(a.z||0))+drawKid._lens.dy};a._lensT=T}return r}}
