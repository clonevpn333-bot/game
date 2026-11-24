'use strict';
/* =====================================================================
   HIGHSCHOOL — THE DEFINITIVE SOUNDTRACK
   Creepy-cute and CALM: music-box and toy-piano nursery tunes (minor,
   with wrong notes in the right places) over a soft pulse, a warm pad
   and a low sub. Slow. Every melody here is original.
   Settings → Soundtrack: Definitive (this) or Classic (the old mellow one).
   Also: room ambience (hallway murmur, cafeteria clatter, birds, gym
   squeaks, the hum of an empty office) and little one-shot sounds.
   ===================================================================== */
const KG={
 /* the main theme: a playground rhyme that went wrong */
 theme:{beat:.5,roots:[45,41,48,40],ch:[[0,3,7],[0,4,7],[0,4,7],[0,4,7]],lead:'box',drums:'boom',bass:'808',creep:6,
  A:[69,-1,72,-1,76,-1,74,72,71,-1,72,-1,69,-1,-1,-1],B:[76,-1,77,-1,76,74,72,-1,71,-1,68,-1,69,-1,-1,-1],C:[81,-1,-1,80,81,-1,76,-1,77,-1,76,74,72,-1,71,-1]},
 /* hallways: toy piano over a trap beat */
 hall:{beat:.46,roots:[38,34,36,33],ch:[[0,3,7],[0,4,7],[0,4,7],[0,4,7]],lead:'toy',drums:'trap',bass:'808',creep:4,
  A:[74,-1,74,77,-1,76,74,-1,73,-1,74,-1,69,-1,70,-1],B:[74,-1,77,-1,81,-1,80,-1,77,76,74,-1,73,-1,-1,-1],C:[69,70,69,-1,74,-1,73,-1,70,-1,69,-1,65,-1,64,-1]},
 /* cafeteria: bouncy, sticky, slightly sick */
 lunch:{beat:.42,roots:[43,48,45,38],ch:[[0,4,7],[0,4,7],[0,3,7],[0,4,7]],lead:'toy',drums:'boom',bass:'808',creep:8,
  A:[79,-1,76,-1,79,-1,76,-1,78,79,81,-1,79,-1,-1,-1],B:[74,-1,76,-1,78,-1,79,-1,81,-1,79,-1,75,-1,74,-1],C:[79,81,79,76,74,-1,72,-1,71,-1,72,-1,74,-1,-1,-1]},
 /* class: a music box nobody wound all the way */
 class:{beat:.62,roots:[40,36,39,35],ch:[[0,3,7],[0,4,7],[0,4,7],[0,4,7]],lead:'box',drums:'soft',bass:'sub',creep:14,pad:1,
  A:[76,-1,-1,79,-1,-1,78,-1,75,-1,-1,76,-1,-1,-1,-1],B:[71,-1,72,-1,71,-1,67,-1,66,-1,-1,-1,63,-1,-1,-1],C:[79,-1,-1,78,-1,-1,76,-1,75,-1,74,-1,71,-1,-1,-1]},
 /* gym: a nursery rhyme drill sergeant */
 drill:{beat:.38,roots:[40,40,43,38],ch:[[0,3,7],[0,3,7],[0,4,7],[0,4,7]],lead:'toy',drums:'march',bass:'808',creep:3,
  A:[64,-1,64,-1,67,-1,64,-1,62,-1,62,-1,64,-1,-1,-1],B:[64,-1,64,67,69,-1,67,-1,64,-1,62,-1,59,-1,-1,-1],C:[71,-1,71,-1,69,-1,67,-1,66,-1,67,-1,64,-1,-1,-1]},
 /* creep: offices, chem, toilets, the library at the wrong time */
 creep:{beat:.66,roots:[37,36,34,32],ch:[[0,3,6],[0,3,7],[0,3,6],[0,4,7]],lead:'box',drums:'pulse',bass:'sub',creep:22,pad:1,
  A:[73,-1,-1,76,-1,-1,75,-1,-1,-1,73,-1,72,-1,-1,-1],B:[68,-1,69,-1,-1,72,-1,71,-1,-1,68,-1,67,-1,-1,-1],C:[80,-1,79,-1,-1,-1,76,-1,75,-1,-1,-1,73,-1,-1,-1]},
 /* evil/fight: the hard one */
 evil:{beat:.36,roots:[36,36,32,31],ch:[[0,3,7],[0,3,6],[0,4,7],[0,4,7]],lead:'box',drums:'hard',bass:'808',creep:10,
  A:[72,-1,72,-1,75,-1,74,-1,73,-1,72,-1,67,-1,66,-1],B:[72,73,72,-1,79,-1,78,-1,75,-1,74,-1,73,-1,72,-1],C:[84,-1,83,-1,79,-1,78,-1,75,74,73,-1,72,-1,71,-1]},
 /* lullaby: romance, sad, dawn */
 lullaby:{beat:.72,roots:[41,38,34,36],ch:[[0,4,7],[0,3,7],[0,4,7],[0,4,7]],lead:'box',drums:'soft',bass:'sub',creep:5,pad:1,
  A:[77,-1,-1,76,74,-1,72,-1,74,-1,-1,72,70,-1,-1,-1],B:[69,-1,72,-1,77,-1,76,-1,74,-1,72,-1,72,-1,-1,-1],C:[81,-1,-1,79,77,-1,76,-1,74,-1,76,-1,77,-1,-1,-1]},
 /* finale: everything at once */
 finale:{beat:.4,roots:[38,41,36,43],ch:[[0,3,7],[0,4,7],[0,4,7],[0,4,7]],lead:'both',drums:'hard',bass:'808',creep:6,pad:1,
  A:[74,-1,72,74,-1,77,-1,76,74,-1,72,-1,69,-1,72,-1],B:[77,-1,79,-1,81,-1,79,77,76,-1,74,-1,73,-1,-1,-1],C:[86,-1,84,-1,81,-1,79,-1,77,-1,76,-1,74,-1,-1,-1]},
 /* dead: the music box winds down */
 dead:{beat:.9,roots:[38,37,38,33],ch:[[0,3,7],[0,4,7],[0,3,7],[0,4,7]],lead:'box',drums:'none',bass:'sub',creep:30,
  A:[74,-1,-1,-1,73,-1,-1,-1,69,-1,-1,-1,-1,-1,-1,-1],B:[70,-1,-1,-1,69,-1,-1,-1,65,-1,-1,-1,-1,-1,-1,-1],C:[74,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]}
};
for(const k in KG){const t=KG[k];t.beat=Math.min(.95,t.beat*1.35);t.drums=(k==='evil'||k==='finale')?'pulse':(k==='dead'?'none':'soft');t.bass='sub';t.pad=1;t.creep=Math.min(t.creep,9)}
const KGMAP={title:'theme',curtain:'theme',bus:'theme',field:'theme',corridor:'hall',canteen:'lunch',class:'class',library:'class',gym:'drill',office:'creep',chem:'creep',toilets:'creep',tension:'creep',evil:'evil',fight:'evil',romance:'lullaby',sad:'lullaby',dawn:'lullaby',dead:'dead',finale:'finale'};
const kgOn=()=>!(P&&P.set&&P.set.classicMusic);
function kgTrack(){return KG[KGMAP[scoreName]]||KG.hall}
let kgStep=0,kgNext=0,kgShaper=null;
function kgShape(){if(kgShaper)return kgShaper;const n=1024,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i/n*2-1;c[i]=Math.tanh(x*2.4)}kgShaper=c;return c}
function kgOut(node,echo){node.connect(scoreBus);if(echo&&scoreDelay)node.connect(scoreDelay)}
function kgBox(t,n,v,creep){
 const g1=AC.createGain();g1.gain.setValueAtTime(.0001,t);g1.gain.linearRampToValueAtTime(v,t+.003);g1.gain.exponentialRampToValueAtTime(.0001,t+1.5);kgOut(g1,true);
 const det=(Math.random()*2-1)*creep;
 for(const [type,off,lv] of[['sine',0,1],['triangle',0,.35],['sine',12,.28],['sine',24,.08]]){const o=AC.createOscillator(),a=AC.createGain();o.type=type;o.frequency.setValueAtTime(midi(n+off),t);o.detune.value=det+(off?3:0);a.gain.value=lv;o.connect(a).connect(g1);o.start(t);o.stop(t+1.55)}}
function kgToy(t,n,v){
 const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(3200,t);f.frequency.exponentialRampToValueAtTime(900,t+.4);
 const a=AC.createGain();a.gain.setValueAtTime(.0001,t);a.gain.linearRampToValueAtTime(v,t+.004);a.gain.exponentialRampToValueAtTime(.0001,t+.5);
 const o=AC.createOscillator();o.type='square';o.frequency.setValueAtTime(midi(n),t);o.connect(f).connect(a);kgOut(a,true);o.start(t);o.stop(t+.52);
 const b=AC.createOscillator(),bg=AC.createGain();b.type='sine';b.frequency.setValueAtTime(midi(n+19),t);bg.gain.setValueAtTime(v*.25,t);bg.gain.exponentialRampToValueAtTime(.0001,t+.25);b.connect(bg);kgOut(bg,false);b.start(t);b.stop(t+.27)}
function kgKick(t,v){const o=AC.createOscillator(),a=AC.createGain(),s=AC.createWaveShaper();s.curve=kgShape();o.type='sine';o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.14);
 a.gain.setValueAtTime(v,t);a.gain.exponentialRampToValueAtTime(.0001,t+.36);o.connect(s).connect(a);kgOut(a);o.start(t);o.stop(t+.38)}
function kgNoise(t,v,type,fq,q,dec){const s=AC.createBufferSource(),f=AC.createBiquadFilter(),a=AC.createGain();s.buffer=drumBuf;f.type=type;f.frequency.value=fq;f.Q.value=q;a.gain.setValueAtTime(v,t);a.gain.exponentialRampToValueAtTime(.0001,t+dec);s.connect(f).connect(a);kgOut(a);s.start(t);s.stop(t+dec+.02)}
function kgSnare(t,v){kgNoise(t,v,'bandpass',1900,.7,.17);const o=AC.createOscillator(),a=AC.createGain();o.type='triangle';o.frequency.setValueAtTime(200,t);o.frequency.exponentialRampToValueAtTime(140,t+.08);a.gain.setValueAtTime(v*.6,t);a.gain.exponentialRampToValueAtTime(.0001,t+.09);o.connect(a);kgOut(a);o.start(t);o.stop(t+.1)}
function kgClap(t,v){for(let i=0;i<3;i++)kgNoise(t+i*.011,v*(i===2?1:.6),'bandpass',1250,1.1,i===2?.16:.03)}
function kgHat(t,v,open){kgNoise(t,v,'highpass',8200,.7,open?.16:.035)}
function kgBass(t,n,len,v){const o=AC.createOscillator(),a=AC.createGain(),s=AC.createWaveShaper(),f=AC.createBiquadFilter();s.curve=kgShape();f.type='lowpass';f.frequency.value=420;
 o.type='sine';o.frequency.setValueAtTime(midi(n+3),t);o.frequency.exponentialRampToValueAtTime(midi(n),t+.05);a.gain.setValueAtTime(.0001,t);a.gain.linearRampToValueAtTime(v,t+.01);a.gain.setValueAtTime(v,t+len*.7);a.gain.exponentialRampToValueAtTime(.0001,t+len);
 o.connect(s).connect(f).connect(a);kgOut(a);o.start(t);o.stop(t+len+.02)}
function kgPad(t,n,len,v){for(const off of[0,7,12]){const o=AC.createOscillator(),a=AC.createGain();o.type='triangle';o.frequency.value=midi(n+off);o.detune.value=(Math.random()*2-1)*9;a.gain.setValueAtTime(.0001,t);a.gain.linearRampToValueAtTime(v,t+len*.4);a.gain.exponentialRampToValueAtTime(.0001,t+len);o.connect(a);kgOut(a);o.start(t);o.stop(t+len+.05)}}
const DRUMS={
 none:{},
 soft:{k:[0],h:[8],hv:.006,kv:.12},
 pulse:{k:[0,8],h:[],sn:[],hv:0,kv:.16,tick:[12]},
 boom:{k:[0,7,10],s:[4,12],h:[0,2,4,6,8,10,12,14],hv:.02,kv:.55,sv:.16},
 trap:{k:[0,6,10],s:[8],h:[0,2,4,6,8,10,12,13,14,15],hv:.022,kv:.55,sv:.18,clap:1,open:[11]},
 march:{k:[0,4,8,12],s:[4,12,14,15],h:[2,6,10,14],hv:.018,kv:.5,sv:.15},
 hard:{k:[0,3,6,10,12],s:[4,12],h:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],hv:.016,kv:.62,sv:.2,clap:1,open:[14]}};
{const _c=cue;cue=function(name,force){const before=scoreName;_c(name,force);if(scoreName!==before||force){kgStep=0;kgNext=AC?AC.currentTime+.06:0;try{if(scoreDelay&&kgOn())scoreDelay.delayTime.value=kgTrack().beat*.75}catch(e){}}}}
{const _mt=musicTick;musicTick=function(){
 if(!kgOn())return _mt();
 if(!scoreBus||!AC||AC.state!=='running')return;
 const m=kgTrack(),t0=AC.currentTime;if(kgNext<t0-.2)kgNext=t0+.02;
 const dr=DRUMS[m.drums]||{};
 while(kgNext<t0+.17){
  const t=kgNext,i=kgStep%16,bar=(kgStep>>4)%4,sect=(kgStep>>6)%4,n=m.roots[bar];
  /* melody: A A B C over four bars, varied each time round */
  const mel=[m.A,m.A,m.B,m.C][bar];const ln=mel[i];
  const lv=m.lead==='toy'?.042:.055;
  if(ln>=0){const nn=ln+(sect===2&&bar===1?12:0);if(m.lead==='toy')kgToy(t,nn,lv);else kgBox(t,nn,lv,m.creep);if(m.lead==='both')kgToy(t,nn-12,.05)}
  /* music box arpeggio under the tune */
  if(i%4===2&&m.drums!=='none'){const c=m.ch[bar];kgBox(t,n+24+c[(i>>2)%3],.013,m.creep)}
  /* chords and pad */
  if(i===0&&m.pad)kgPad(t,n+12,m.beat*4.2,.014);
  /* bass */
  if(m.bass==='808'){if(i===0||i===7||i===10)kgBass(t,n-12,m.beat*(i===0?1.6:.7),.22)}else if(m.bass==='sub'&&i===0)kgBass(t,n-12,m.beat*3.6,.085);
  /* drums (they drop out on the first bar of every fourth phrase, then hit back) */
  const drop=sect===3&&bar===0;
  if(!drop){if((dr.k||[]).includes(i))kgKick(t,dr.kv||.5);if((dr.s||[]).includes(i)){if(dr.clap)kgClap(t,dr.sv||.16);else kgSnare(t,dr.sv||.16)}
   if((dr.h||[]).includes(i))kgHat(t,dr.hv||.02,(dr.open||[]).includes(i));if((dr.tick||[]).includes(i))kgNoise(t,.03,'highpass',5000,.8,.02);
   if(m.drums==='trap'&&bar===3&&i>=12){kgHat(t+m.beat/8,dr.hv*.8,false)}}
  kgStep++;kgNext+=m.beat/4;
 }
}}

/* ---------------- ambience ---------------- */
const RAMB_TYPE=r=>{if(!r)return null;if(['corridor','hallb','upper','wing_sci','wing_arts','wing_sports','walkway','stairwell'].includes(r))return'hall';
 if(r==='canteen'||r==='foodcourt')return'cafe';if(['field','bus','courtyard','carpark','forest','lake'].includes(r))return'out';if(r==='gym'||r==='weightroom')return'gym';
 if(r==='arcade')return'arcade';if(r==='titlescreen')return null;return'room'};
const RAMB_SET={hall:{type:'lowpass',f:560,v:.05},cafe:{type:'bandpass',f:900,v:.06},out:{type:'highpass',f:1400,v:.03},gym:{type:'lowpass',f:700,v:.035},arcade:{type:'bandpass',f:1400,v:.05},room:{type:'lowpass',f:220,v:.015}};
let RAMB=null;
function ambEnsure(){if(RAMB||!AC||!SFXG)return;const len=AC.sampleRate*2,b=AC.createBuffer(1,len,AC.sampleRate),d=b.getChannelData(0);let last=0;for(let i=0;i<len;i++){last=last*.97+(Math.random()*2-1)*.03;d[i]=last*6}
 const s=AC.createBufferSource();s.buffer=b;s.loop=true;const f=AC.createBiquadFilter(),gn=AC.createGain();gn.gain.value=0;s.connect(f).connect(gn).connect(SFXG);s.start();RAMB={f,gn,type:null,t:0}}
function ambTick(){if(TEST||!AC||AC.state!=='running')return;ambEnsure();if(!RAMB)return;
 const ty=(panelMode==='none'||!D)?null:RAMB_TYPE(ROOM),now=AC.currentTime;
 if(ty!==RAMB.type){RAMB.type=ty;const s=RAMB_SET[ty];if(s){RAMB.f.type=s.type;RAMB.f.frequency.setTargetAtTime(s.f,now,.3)}RAMB.gn.gain.setTargetAtTime(s?s.v*(P.set.ambOff?0:1):0,now,.5)}
 if(ty==='hall'||ty==='cafe'){const s=RAMB_SET[ty];RAMB.gn.gain.setTargetAtTime(s.v*(.7+Math.sin(T*.7)*.2+Math.sin(T*1.9)*.15),now,.4)}
 /* one-shots */
 if(T-RAMB.t<.25)return;RAMB.t=T;const r=Math.random();
 try{
  if(ty==='hall'&&r<.07){noise(.12,.12,260,1,'bandpass');setTimeout(()=>noise(.05,.03,1800,1,'bandpass'),60)}           /* a locker */
  else if(ty==='hall'&&r<.11){for(let i=0;i<3;i++)setTimeout(()=>noise(.03,.07,700,1.3,'bandpass'),i*180)}             /* footsteps going past */
  else if(ty==='cafe'&&r<.18){noise(.02,.07,3200+Math.random()*1500,2,'bandpass')}                                       /* cutlery */
  else if(ty==='cafe'&&r<.22){tone(220+Math.random()*60,.08,'triangle',.02)}                                             /* a tray */
  else if(ty==='out'&&r<.28){const b=2200+Math.random()*1200;for(let i=0;i<2+(Math.random()*4|0);i++)setTimeout(()=>tone(b+Math.random()*500,.05+Math.random()*.04,'sine',.06,b+900+Math.random()*600),i*(90+Math.random()*70))} /* birds */
  else if(ty==='gym'&&r<.12){tone(1700,.05,'sine',.05,2300)}                                                              /* sneaker squeak */
  else if(ty==='gym'&&r<.18){tone(90,.12,'sine',.1,60)}                                                                  /* ball bounce */
  else if(ty==='arcade'&&r<.2){tone(600+Math.random()*900,.05,'square',.012)}
  else if(ty==='room'&&r<.03){tone(58,.6,'sine',.015)}                                                                    /* the hum */
 }catch(e){}}
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);ambTick()}}

/* ---------------- settings ---------------- */
{const _os=openSettings;openSettings=function(){_os();const s=$('settings').querySelector('.set');if(!s)return;
 const add=(label,key,opts)=>{s.appendChild(Object.assign(document.createElement('div'),{textContent:label}));const w=document.createElement('div');w.className='opts';
  opts.forEach(([v,n])=>{const b=document.createElement('button');b.textContent=n;b.setAttribute('aria-pressed',String(+(!!P.set[key])===v));b.onclick=()=>{P.set[key]=v;save&&save();if(key==='classicMusic')cue(scoreName,true);if(key==='ambOff'&&RAMB)RAMB.type='x';openSettings()};w.appendChild(b)});
  const ver=s.parentNode.querySelector('p:last-child');s.appendChild(w)};
 add('🎵 Soundtrack','classicMusic',[[0,'Definitive (music box)'],[1,'Classic']]);
 add('🔊 Room ambience','ambOff',[[0,'On'],[1,'Off']])}}

/* ---------------- chatter + everyone's footsteps ---------------- */
let CHAT_T=0;
function babble(v){/* one distant voice: a little run of syllables */const base=140+Math.random()*180,n=3+(Math.random()*6|0);let t=0;
 for(let i=0;i<n;i++){const d=.05+Math.random()*.08;setTimeout(()=>{try{tone(base*(.85+Math.random()*.35),d,'triangle',v)}catch(e){}},t*1000);t+=d+.02+Math.random()*.05}}
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);
 if(TEST||!AC||AC.state!=='running'||!D||P.set.ambOff||panelMode==='none')return;
 const ty=RAMB_TYPE(ROOM);
 /* talking: halls, cafeteria, gym, outside at break */
 if((ty==='hall'||ty==='cafe'||ty==='gym'||ty==='out'&&!['forest','lake'].includes(ROOM))&&T>CHAT_T){
  const crowd=Object.keys(A).filter(k=>k!=='you'&&A[k]&&!A[k].dead).length;
  CHAT_T=T+(ty==='cafe'?.35:.7)+Math.random()*(crowd>4?.6:1.6);babble(ty==='cafe'?.022:.016)}
 /* everyone's feet */
 for(const id in A){const a=A[id];if(id==='you'||!a||!a.moving||a.dead||a.x<-10||a.x>330)continue;
  const s=Math.floor((a.walk||0)/Math.PI);if(a._stp!==s){a._stp=s;try{noise(.025,a.fast?.05:.03,450+Math.random()*350,1.3,'bandpass')}catch(e){}}}}}
