'use strict';
/* =====================================================================
   HIGHSCHOOL — engine: canvas, time, audio, dialogue, stage, mini-games
   ===================================================================== */
const $=id=>document.getElementById(id);
const W=320,H=180;
const cv=$('c');
let g=cv.getContext('2d');g.imageSmoothingEnabled=false;
const rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.random()*a.length|0],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hsh=i=>{const s=Math.sin(i*127.1+3.3)*43758.5;return s-Math.floor(s)};
function R(x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
const TEST=window.HS_TEST||null;          // automated test hooks (tools/test.mjs)
let T=0;                                   // game clock (seconds, scaled by speed)

/* ---------------- persistent save ---------------- */
const SAVE_KEY='highschool_v1';
const DEFAULT_SET={text:2,auto:2,music:.7,sfx:.8,voice:1,shake:1,gore:1,skipAll:0};
let P;
function freshP(){return{v:1,loops:0,intel:{},done:{},parts:{},coll:{},deaths:{},endings:{},bond:{},seen:[],set:Object.assign({},DEFAULT_SET),cur:null,best:{},stats:{deaths:0,kills:0}}}
function loadP(){P=freshP();try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));if(s&&s.v===1){P=Object.assign(P,s);P.set=Object.assign({},DEFAULT_SET,s.set||{})}}catch(e){}SEEN=new Set(P.seen)}
let SEEN=new Set();
function save(){try{P.seen=[...SEEN].slice(-6000);localStorage.setItem(SAVE_KEY,JSON.stringify(P))}catch(e){}}
loadP();

/* ---------------- audio ---------------- */
let AC=null,MG=null,MUS=null,SFXG=null,musicRoom=null,drumBuf=null;
function audio(){
 if(AC){AC.resume().catch(()=>{});return}
 if(TEST)return;
 try{
  AC=new(window.AudioContext||window.webkitAudioContext)();
  MG=AC.createGain();MG.gain.value=1;MG.connect(AC.destination);
  MUS=AC.createGain();MUS.gain.value=P.set.music;MUS.connect(MG);
  SFXG=AC.createGain();SFXG.gain.value=P.set.sfx;SFXG.connect(MG);
  const imp=AC.createBuffer(2,AC.sampleRate*1.8|0,AC.sampleRate);
  for(let ch=0;ch<2;ch++){const d=imp.getChannelData(ch);for(let i=300;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length)**3*.25}
  musicRoom=AC.createConvolver();musicRoom.buffer=imp;const wet=AC.createGain();wet.gain.value=.15;musicRoom.connect(wet).connect(MUS);
  drumBuf=AC.createBuffer(1,AC.sampleRate*.3|0,AC.sampleRate);const dd=drumBuf.getChannelData(0);for(let i=0;i<dd.length;i++)dd[i]=Math.random()*2-1;
  AC.resume().catch(()=>{});cue(scoreName,true);
 }catch(e){AC=null}
}
function setVolumes(){if(!AC)return;MUS.gain.setTargetAtTime(P.set.music,AC.currentTime,.05);SFXG.gain.setTargetAtTime(P.set.sfx,AC.currentTime,.05)}
function tone(f,d,type,v,f2,when){if(!AC||skipping())return;try{const t=AC.currentTime+(when||0),o=AC.createOscillator(),gn=AC.createGain();o.type=type||'square';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);gn.gain.setValueAtTime(v||.06,t);gn.gain.exponentialRampToValueAtTime(.0008,t+d);o.connect(gn);gn.connect(SFXG);o.start(t);o.stop(t+d+.02)}catch(e){}}
function noise(d,v,fq,q,type,f2,when){if(!AC||skipping())return;try{const t=AC.currentTime+(when||0),n=AC.sampleRate*d|0,b=AC.createBuffer(1,n,AC.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;const s=AC.createBufferSource();s.buffer=b;const f=AC.createBiquadFilter();f.type=type||'bandpass';f.frequency.setValueAtTime(fq||800,t);if(f2)f.frequency.exponentialRampToValueAtTime(f2,t+d);f.Q.value=q||1;const gn=AC.createGain();gn.gain.setValueAtTime(v||.2,t);gn.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(f);f.connect(gn);gn.connect(SFXG);s.start(t)}catch(e){}}
const SFX={
 blip:(f,w)=>tone(f,.04,w||'square',.026),
 click(){tone(240,.035,'square',.04)},
 bell(){for(let i=0;i<10;i++){tone(1568,.09,'square',.035,0,i*.1);tone(1175,.09,'square',.03,0,i*.1+.05)}},
 smack(){noise(.09,.7,1600,.8)},
 punch(){noise(.12,.9,500,1.2,'lowpass');tone(110,.12,'sine',.25,50)},
 crunch(){noise(.18,.8,2400,2,'bandpass',600);tone(80,.2,'square',.12,40)},
 squelch(){noise(.34,.5,220,7,'bandpass',700);tone(90,.3,'sine',.2,45)},
 splat(){noise(.22,.6,400,3,'bandpass',160)},
 scream(){tone(1100,.9,'sawtooth',.08,420);tone(1160,.9,'square',.04,380)},
 gasp(){noise(.3,.25,1800,3,'bandpass',900)},
 sting(){tone(180,.6,'sawtooth',.12,60);tone(190,.6,'square',.06,64);noise(.5,.3,90,1,'lowpass')},
 sweet(){[784,988,1175].forEach((f,i)=>tone(f,.18,'triangle',.06,0,i*.07))},
 whoosh(){noise(.25,.35,600,1,'bandpass',3000)},
 pick(){tone(660,.06,'square',.06);tone(990,.09,'square',.06,0,.07);tone(1320,.12,'square',.05,0,.15)},
 good(){[523,659,784,1047,1319].forEach((f,i)=>tone(f,.16,'square',.05,0,i*.1))},
 bad(){[392,330,262,196].forEach((f,i)=>tone(f,.22,'square',.06,0,i*.16))},
 door(){noise(.15,.4,300,1,'lowpass');tone(120,.1,'square',.08,70,.08)},
 locker(){noise(.3,.6,1300,6,'bandpass');tone(310,.4,'square',.06,290)},
 whistle(){tone(2600,.5,'sine',.12,2700);tone(2620,.5,'square',.03,2720)},
 beep(){tone(1046,.16,'square',.08)},
 kiss(){tone(1400,.06,'sine',.08,2000);noise(.05,.15,4000,2)},
 heart(){tone(58,.13,'sine',.5,40)},
 fire(){noise(1.2,.3,500,.6,'bandpass',1500)},
 thud(){noise(.2,.8,160,1,'lowpass');tone(60,.25,'sine',.3,35)},
 slurp(){tone(300,.4,'sawtooth',.05,900);noise(.4,.15,1200,4)},
 shutter(){noise(.05,.5,5000,1);noise(.05,.4,3000,1,'bandpass',0,.07)},
 cheer(){noise(1.6,.32,900,.5,'bandpass',1400)},
 chant(){for(let i=0;i<3;i++){noise(.18,.45,700,1.5,'bandpass',500,i*.36);tone(196,.16,'sawtooth',.05,180,i*.36)}},
 power(){tone(400,.8,'sawtooth',.1,30)},
 drip(){tone(1800,.05,'sine',.05,600)},
 glass(){for(let i=0;i<8;i++)tone(2000+Math.random()*3000,.15,'triangle',.04,1000,i*.03);noise(.4,.4,6000,1)},
 ding(){tone(1318,.4,'sine',.08);tone(1975,.5,'sine',.05,0,.05)},
 bounce(){tone(160,.08,'sine',.25,90)},
 rumble(){noise(1.4,.6,90,.6,'lowpass',40)},
 static(){noise(.5,.25,3000,.3)}
};
/* Original score. MIDI note numbers; -1 is a rest; sixteen steps per bar. */
const SCORES={
 title:{beat:.6,root:[45,41,43,40],mode:[[0,7,15],[0,7,16],[0,7,16],[0,7,15]],lead:[69,-1,72,-1,76,-1,74,72,-1,69,-1,67,69,-1,-1,-1],drums:1},
 bus:{beat:.55,root:[48,45,41,43],mode:[[0,7,16],[0,7,15],[0,7,16],[0,7,16]],lead:[72,-1,76,79,-1,76,-1,74,72,-1,69,-1,72,-1,-1,-1],drums:1,soft:1},
 corridor:{beat:.48,root:[43,40,36,38],mode:[[0,7,16],[0,7,15],[0,7,16],[0,7,16]],lead:[67,-1,71,74,-1,71,72,-1,74,-1,79,-1,76,74,-1,71],drums:2},
 class:{beat:.66,root:[41,38,43,36],mode:[[0,7,16],[0,7,15],[0,7,16],[0,7,16]],lead:[65,-1,-1,69,-1,72,-1,-1,70,-1,69,-1,67,-1,-1,-1],soft:1},
 canteen:{beat:.42,root:[48,43,45,41],mode:[[0,7,16],[0,7,16],[0,7,15],[0,7,16]],lead:[72,74,76,-1,79,-1,76,-1,74,72,-1,74,76,-1,72,-1],drums:2},
 gym:{beat:.38,root:[40,43,45,38],mode:[[0,7,15],[0,7,16],[0,7,15],[0,7,16]],lead:[64,-1,64,67,-1,69,-1,67,64,-1,62,-1,64,-1,-1,67],drums:3},
 field:{beat:.6,root:[43,48,45,41],mode:[[0,7,16],[0,7,16],[0,7,15],[0,7,16]],lead:[79,-1,-1,76,-1,74,-1,72,-1,74,-1,-1,76,-1,-1,-1],soft:1},
 library:{beat:.85,root:[38,41,36,43],mode:[[0,7,15],[0,7,16],[0,7,16],[0,7,16]],lead:[62,-1,-1,-1,65,-1,-1,69,-1,-1,67,-1,-1,-1,-1,-1],soft:1},
 office:{beat:.7,root:[38,37,34,33],mode:[[0,7,15],[0,6,15],[0,7,14],[0,6,13]],lead:[62,-1,-1,63,-1,-1,62,-1,58,-1,-1,57,-1,-1,-1,-1],drums:1},
 chem:{beat:.62,root:[37,36,34,32],mode:[[0,6,13],[0,7,15],[0,6,14],[0,7,13]],lead:[61,-1,64,-1,-1,67,-1,66,-1,-1,61,-1,60,-1,-1,-1],drums:1},
 toilets:{beat:.75,root:[40,39,40,36],mode:[[0,7,15],[0,6,15],[0,7,15],[0,7,16]],lead:[64,-1,-1,-1,63,-1,-1,-1,64,-1,-1,71,-1,-1,-1,-1],soft:1},
 evil:{beat:.4,root:[38,39,38,37],mode:[[0,6,13],[0,6,13],[0,7,14],[0,6,13]],lead:[74,-1,75,-1,74,-1,69,-1,70,-1,69,-1,63,-1,62,-1],drums:3},
 tension:{beat:.52,root:[38,38,35,37],mode:[[0,7,15],[0,6,13],[0,7,14],[0,6,13]],lead:[62,-1,-1,63,-1,62,69,-1,61,-1,65,-1,-1,63,-1,-1],drums:2},
 fight:{beat:.34,root:[38,34,35,37],mode:[[0,7,15],[0,7,16],[0,6,15],[0,7,13]],lead:[62,62,-1,63,69,-1,65,62,70,-1,69,65,63,61,-1,57],drums:3},
 romance:{beat:.72,root:[41,45,46,48],mode:[[0,7,16],[0,7,15],[0,7,16],[0,7,16]],lead:[77,-1,-1,76,-1,72,-1,-1,74,-1,76,-1,77,-1,-1,-1],soft:1},
 sad:{beat:.9,root:[38,34,41,36],mode:[[0,7,15],[0,7,16],[0,7,16],[0,7,16]],lead:[62,-1,-1,65,-1,-1,69,-1,-1,67,-1,64,-1,-1,62,-1],soft:1},
 dead:{beat:1.1,root:[33,32,33,31],mode:[[0,6,13],[0,7,13],[0,6,13],[0,7,14]],lead:[57,-1,-1,-1,-1,-1,56,-1,-1,-1,-1,-1,-1,-1,-1,-1],soft:1},
 finale:{beat:.46,root:[38,41,36,43],mode:[[0,7,15],[0,7,16],[0,7,16],[0,7,16]],lead:[74,-1,72,74,-1,77,-1,76,74,-1,72,-1,69,-1,72,-1],drums:3},
 curtain:{beat:.45,root:[48,45,41,43],mode:[[0,7,16],[0,7,15],[0,7,16],[0,7,16]],lead:[72,76,79,-1,84,-1,79,76,77,-1,74,-1,76,-1,72,-1],drums:2}
};
let scoreName='title',scoreBus=null,scoreDelay=null,scoreNext=0,scoreStep=0;
const midi=n=>440*2**((n-69)/12);
function cue(name,force){
 if(!SCORES[name])name='title';
 if(!force&&name===scoreName)return;scoreName=name;
 if(!AC||!musicRoom)return;
 const t=AC.currentTime,old=scoreBus,od=scoreDelay;
 if(old){old.gain.cancelScheduledValues(t);old.gain.setTargetAtTime(0,t,.13);setTimeout(()=>{try{old.disconnect();od.disconnect()}catch(e){}},1600)}
 scoreBus=AC.createGain();scoreBus.gain.setValueAtTime(0,t);scoreBus.gain.linearRampToValueAtTime(.8,t+.5);scoreBus.connect(MUS);scoreBus.connect(musicRoom);
 scoreDelay=AC.createDelay();scoreDelay.delayTime.value=SCORES[name].beat*.75;const e=AC.createGain();e.gain.value=.22;scoreDelay.connect(e).connect(scoreBus);
 scoreStep=0;scoreNext=t+.06;
}
function mvoice(t,n,len,v,shape,att,det,echo,tail){const o=AC.createOscillator(),a=AC.createGain();o.type=shape;o.frequency.setValueAtTime(midi(n),t);o.detune.value=det||0;if(tail)o.frequency.exponentialRampToValueAtTime(midi(n+tail),t+len);a.gain.setValueAtTime(.0001,t);a.gain.linearRampToValueAtTime(v,t+att);a.gain.exponentialRampToValueAtTime(.0001,t+len);o.connect(a).connect(scoreBus);if(echo)a.connect(scoreDelay);o.start(t);o.stop(t+len+.02)}
function mdrum(t,wide){const s=AC.createBufferSource(),f=AC.createBiquadFilter(),a=AC.createGain();s.buffer=drumBuf;f.type='bandpass';f.frequency.value=wide?1360:5750;f.Q.value=wide?1.1:.75;a.gain.setValueAtTime(wide?.12:.04,t);a.gain.exponentialRampToValueAtTime(.0001,t+(wide?.18:.06));s.connect(f).connect(a).connect(scoreBus);s.start(t);s.stop(t+.22)}
function musicTick(){
 if(!scoreBus||!AC||AC.state!=='running')return;
 const m=SCORES[scoreName],t0=AC.currentTime;if(scoreNext<t0-.2)scoreNext=t0+.02;
 while(scoreNext<t0+.17){
  const t=scoreNext,i=scoreStep%16,bar=(scoreStep>>4)%m.root.length,n=m.root[bar];
  if(!i){mvoice(t,n-12,m.beat*4.25,.15,'sine',.11);for(const v of m.mode[bar]){mvoice(t,n+v,m.beat*4.15,m.soft?.03:.026,'triangle',m.beat*.7,-4);if(!m.soft)mvoice(t,n+v,m.beat*4.1,.015,'sine',m.beat*1.1,9)}}
  if(i===0||i===7||i===10||(m.drums>=2&&i===14))mvoice(t,n+(i===10?7:0),m.beat*.65,m.drums>=2?.09:.06,'triangle',.02);
  if(m.lead[i]>=0){const sh=bar===1?-2:bar===2?2:bar===3?-1:0;mvoice(t,m.lead[i]+sh,m.beat*(m.drums>=3?.85:1.6),m.drums>=3?.062:.08,'triangle',.012,0,true);mvoice(t,m.lead[i]+sh+12,m.beat*.45,.02,'sine',.006,0,true)}
  if(m.drums){if(i===0||i===8||(m.drums>=2&&i===6)||(m.drums>=3&&i===11))mvoice(t,41,.21,.23,'sine',.008,0,false,-20);if(m.drums>=2&&i%4===2)mdrum(t,i===6||i===14);if(m.drums>=3&&i%4===3)mdrum(t,false)}
  scoreStep++;scoreNext+=m.beat/4;
 }
}

/* ---------------- toasts, captions, cards ---------------- */
let toastT=0;
function toast(t){const e=$('toast');e.textContent=t;e.style.opacity=1;toastT=2.6;if(TEST)TEST.log&&TEST.log('toast',t)}
let subT=0;
function sub(t,s){const e=$('sub');e.textContent=t;e.style.opacity=1;subT=s||3.2}
async function card(b,s,ms,cls){if(TEST){TEST.log&&TEST.log('card',b+' / '+(s||''));return}const c=$('card');c.className=cls||'';c.children[0].textContent=b;c.children[1].textContent=s||'';c.style.opacity=1;await realWait(skipping()?250:(ms||2200));c.style.opacity=0;await realWait(360)}
const realWait=ms=>new Promise(r=>setTimeout(r,TEST?0:ms));

/* ---------------- timers & tweens (run on game clock, so skip speeds them up) ---------------- */
let timers=[],tweens=[];
function wait(ms){return new Promise(r=>timers.push({t:ms/1000,r}))}
function tw(o,props,ms,ease){return new Promise(r=>{const from={};for(const k in props)from[k]=o[k];tweens.push({o,from,props,t:0,d:Math.max(.001,ms/1000),r,ease})})}
let skipOn=false,autoOn=false,ctrlHeld=false;
function skipping(){return skipOn||ctrlHeld||!!(TEST)}
function speed(){return TEST?60:(skipping()?7:1)}

/* ---------------- dialogue ---------------- */
let DL=null,CH=null,BACKLOG=[],speaker=null,panelMode='none';
const NAMECOL={};
function lineHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function setPanel(m){panelMode=m;$('pbody').style.display=m==='talk'?'flex':'none';$('roam').classList.toggle('on',m==='roam')}
function nameOf(who){const k=(typeof K!=="undefined")&&K[who];return k?k.n:who}
function say(who,text,ex){
 if(ex&&A[who])A[who].ex=ex;
 const k=(typeof K!=="undefined")&&K[who],name=who?nameOf(who):'',h=lineHash(name+'|'+text),seen=SEEN.has(h);
 BACKLOG.push({n:name,t:text,c:k?k.col:'#6b4a7a'});if(BACKLOG.length>400)BACKLOG.shift();
 if(TEST){TEST.lines=(TEST.lines||0)+1;SEEN.add(h);return Promise.resolve()}
 setPanel('talk');
 if(skipOn&&!seen&&!P.set.skipAll){setSkip(false)}
 return new Promise(res=>{
  DL={who,text,i:0,res,h,auto:0,done:false,blip:0};speaker=A[who]&&A[who].vis?who:null;
  const nm=$('name');nm.textContent=name;nm.style.background=k?k.col:'#6b4a7a';
  const tx=$('text');tx.className=who?'':'n';tx.textContent='';$('choices').innerHTML='';
  drawPortrait(who);
  if(skipping()&&(seen||P.set.skipAll))finishLine();
 });
}
const N=t=>say('',t);
function finishLine(){if(!DL)return;DL.i=DL.text.length;DL.done=true;$('text').innerHTML='';$('text').textContent=DL.text;const m=document.createElement('span');m.id='more';m.textContent='▼';m.style.visibility='visible';$('text').appendChild(m);if(A[DL.who])A[DL.who].talk=false;SEEN.add(DL.h)}
function advance(){
 if(!DL)return;
 if(!DL.done){finishLine();return}
 const r=DL.res;if(A[DL.who])A[DL.who].talk=false;DL=null;speaker=null;SFX.click();r();
}
function choose(opts,prompt){
 opts=opts.map(o=>typeof o==='string'?{t:o}:o);
 if(TEST){const i=TEST.pick?TEST.pick(opts,prompt):-1;const ok=opts.map((o,i)=>o.dis?-1:i).filter(i=>i>=0);const r=i>=0&&!opts[i].dis?i:pick(ok);BACKLOG.push({n:'',t:'→ '+opts[r].t,c:'#333'});return Promise.resolve(r)}
 setSkip(false);setPanel('talk');
 return new Promise(res=>{
  CH={opts,res,sel:opts.findIndex(o=>!o.dis)};
  $('name').textContent=prompt?'':'';$('text').className='n';$('text').textContent=prompt||'';drawPortrait(null);
  const box=$('choices');box.innerHTML='';
  opts.forEach((o,i)=>{const b=document.createElement('button');b.disabled=!!o.dis;b.innerHTML=(o.tag?'<span class="tag">'+o.tag+'</span>':'')+(i+1)+'. ';b.appendChild(document.createTextNode(o.t+(o.dis&&o.why?'  ('+o.why+')':'')));b.onclick=e=>{e.stopPropagation();pickChoice(i)};box.appendChild(b)});
  markSel();$('ptext').scrollTop=0;
 });
}
function markSel(){if(!CH)return;[...$('choices').children].forEach((b,i)=>{b.classList.toggle('sel',i===CH.sel);if(i===CH.sel&&b.scrollIntoView)b.scrollIntoView({block:'nearest'})})}
function pickChoice(i){if(!CH||CH.opts[i].dis)return;const c=CH;CH=null;$('choices').innerHTML='';$('text').textContent='';BACKLOG.push({n:'',t:'→ '+c.opts[i].t,c:'#333',choice:1});SFX.click();c.res(i)}
function setAuto(v){autoOn=v;$('bAuto').setAttribute('aria-pressed',String(v))}
function setSkip(v){skipOn=v;$('bSkip').setAttribute('aria-pressed',String(v));if(v&&DL&&(SEEN.has(DL.h)||P.set.skipAll))finishLine();if(v&&DL&&!SEEN.has(DL.h)&&!P.set.skipAll){skipOn=false;$('bSkip').setAttribute('aria-pressed','false');toast('Skip only skips lines you’ve already read (change in Settings).')}}
function textTick(rdt){
 if(!DL)return;
 if(!DL.done){
  const cps=[18,32,55,140,9999][P.set.text]||32;
  const before=DL.i|0;DL.i=Math.min(DL.text.length,DL.i+rdt*cps*(skipping()?20:1));const now=DL.i|0;
  if(now!==before){$('text').textContent=DL.text.slice(0,now);if(A[DL.who])A[DL.who].talk=true;
   if(P.set.voice&&DL.who&&!skipping()){DL.blip+=now-before;if(DL.blip>=2){DL.blip=0;const k=K[DL.who];const ch=DL.text[now-1];if(k&&ch&&/[a-z0-9]/i.test(ch))SFX.blip((k.v||300)*(1+(hsh(now+DL.h%97)-.5)*.12),k.vw)}}}
  if(DL.i>=DL.text.length)finishLine();
 }else{
  if(skipping()&&(SEEN.has(DL.h)||P.set.skipAll)){DL.auto+=rdt;if(DL.auto>.06)advance();return}
  if(autoOn){DL.auto+=rdt;const delay=[3.2,2.2,1.4,.8][P.set.auto]+DL.text.length*.028;if(DL.auto>delay)advance()}
 }
}
function openBacklog(){
 const o=$('backlog');o.hidden=false;
 o.innerHTML='<button class="tb x" id="blx">CLOSE ✕</button><h2>Backlog</h2><div class="box"></div>';
 const box=o.querySelector('.box');
 BACKLOG.slice(-250).forEach(l=>{const d=document.createElement('div');d.className='bl'+(l.n?'':' n');if(l.n){const b=document.createElement('b');b.textContent=l.n;b.style.color=l.c==='#333'?'#999':lighten(l.c);d.appendChild(b)}d.appendChild(document.createTextNode(l.t));if(l.choice)d.style.color='#ffe1a8';box.appendChild(d)});
 if(!BACKLOG.length)box.innerHTML='<div class="li no">Nothing yet.</div>';
 o.querySelector('#blx').onclick=()=>{o.hidden=true};
 setTimeout(()=>{o.scrollTop=o.scrollHeight},0);
}
function lighten(c){try{const n=parseInt(c.slice(1),16),r=n>>16,gg=n>>8&255,b=n&255,f=v=>Math.min(255,v+(255-v)*.45|0);return'rgb('+f(r)+','+f(gg)+','+f(b)+')'}catch(e){return'#fff'}}

/* ---------------- stage: actors, props, particles ---------------- */
const A={};
let ROOM='bus',decals=[],parts=[],props=[],fxState={shake:0,flash:0,flashC:'#fff',tint:null,tintA:0,bars:0,dark:0,red:0,romance:0},crowd=null;
function clearStage(){for(const k in A)delete A[k];decals=[];parts=[];props=[];crowd=null;fxState.tint=null;fxState.tintA=0;fxState.red=0;fxState.romance=0;fxState.dark=0}
function scene(room,cast){clearStage();ROOM=room;if(cast)for(const id in cast){const c=cast[id];if(Array.isArray(c))put(id,c[0],c[1],c[2]);else put(id,c.x,c.dir,c)}if((typeof ROOMS!=="undefined")&&ROOMS[room]&&!scene.keepMusic)cue(ROOMS[room].music)}
function put(id,x,dir,o){A[id]=Object.assign({id,k:K[id],x,y:150,z:0,dir:dir||1,pose:null,ex:null,vis:true,walk:0,moving:false,tx:null,sp:46,sit:false,dead:null,talk:false,hold:null,hurt:0,shake:0,rot:0,alpha:1,bleed:0,punchT:0},o||{});if(A[id].x==null)A[id].x=160;return A[id]}
function remove(id){delete A[id]}
function walk(id,x,sp){const a=A[id];if(!a)return Promise.resolve();return new Promise(r=>{a.tx=Math.round(x);a.wsp=sp||a.sp;a.res=r;a.pose=a.pose==='sit'?null:a.pose;a.sit=false})}
const walks=(...ws)=>Promise.all(ws.map(w=>walk(...w)));
function face(id,d){if(A[id])A[id].dir=typeof d==='string'?(A[d]&&A[d].x<A[id].x?-1:1):d}
function pose(id,p,ms){const a=A[id];if(!a)return Promise.resolve();a.pose=p;if(ms)return wait(ms).then(()=>{if(a.pose===p)a.pose=null});return Promise.resolve()}
function ex(id,e){if(A[id])A[id].ex=e}
function hold(id,it){if(A[id])A[id].hold=it}
function hop(id,h=6,ms=260){const a=A[id];if(!a)return Promise.resolve();return tw(a,{z:h},ms/2).then(()=>tw(a,{z:0},ms/2))}
function prop(o){props.push(Object.assign({t0:T},o));return o}
function shake(s){if(P.set.shake)fxState.shake=Math.max(fxState.shake,s)}
function flash(c,a){fxState.flashC=c||'#fff';fxState.flash=a||.8}
function blood(x,y,n,dir,spd,floorY){if(!P.set.gore)n=Math.ceil(n/4);const cols=BLOOD;for(let i=0;i<n;i++){const a=(dir==null?rand(-Math.PI,0):(dir>0?rand(-1.2,.2):rand(Math.PI-.2,Math.PI+1.2))),v=rand(.3,1)*(spd||60);parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-rand(0,25),c:P.set.gore?cols[i%4]:'#6a6a7a',s:Math.random()<.25?2:1,fy:(floorY||152)+rand(-3,4),life:3})}}
function splat(x,y,r){if(!P.set.gore)return;for(let i=0;i<r*3;i++){const a=hsh(x+i)*6.28,d=Math.pow(hsh(y+i*7),.7)*r;decals.push({x:x+Math.cos(a)*d*1.6,y:y+Math.sin(a)*d*.45,w:1+(hsh(i)*2|0),h:1,c:BLOOD[i%4]})}decals.push({x:x-r*.8,y:y-1,w:r*1.6,h:2,c:BLOOD[1]})}
function wallSplat(x,y,r){if(!P.set.gore)return;for(let i=0;i<r*4;i++){const a=hsh(x*3+i)*6.28,d=Math.pow(hsh(y+i*5),.6)*r;decals.push({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,w:1+(hsh(i+3)*2|0),h:1+(hsh(i+9)*2|0),c:BLOOD[i%4]})}for(let i=0;i<4;i++){const dx=x+(hsh(i+x)-.5)*r*1.4;decals.push({x:dx,y:y,w:1,h:4+hsh(i*3+y)*14|0,c:BLOOD[1]})}}
const BLOOD=['#5e0a12','#8a0d16','#b3121e','#d21f2b'];

/* ---------------- input ---------------- */
const keys={l:0,r:0};
let INPUT=null; // school.js sets {act,map,quest} handlers for roam mode
function anyOverlay(){return['quest','backlog','settings','map','menu','phoneov'].some(id=>!$(id).hidden)}
function closeOverlays(){for(const id of['quest','backlog','settings','map'])$(id).hidden=true}
addEventListener('keydown',e=>{
 audio();
 const k=e.key;
 if(k==='Control'){ctrlHeld=true;if(DL&&(SEEN.has(DL.h)||P.set.skipAll))finishLine()}
 if(MINI&&MINI.key&&(k===' '||k==='Enter'||k==='e'||k==='E')){e.preventDefault();if(!e.repeat)MINI.key();return}
 if(!$('phoneov').hidden){if(k===' '||k==='Enter'||k==='e'||k==='E'){e.preventDefault();if(!e.repeat&&PHONENEXT)PHONENEXT()}return}
 if(!$('menu').hidden){if(k==='Enter'){const b=$('menu').querySelector('.mb');if(b){e.preventDefault();b.click()}}return}
 if(anyOverlay()){if(k==='Escape'||((k==='q'||k==='Q')&&!$('quest').hidden)||((k==='l'||k==='L')&&!$('backlog').hidden)||((k==='m'||k==='M')&&!$('map').hidden)){e.preventDefault();closeOverlays()}return}
 if(CH){
  const n=parseInt(k,10);if(n>=1&&n<=CH.opts.length){e.preventDefault();pickChoice(n-1);return}
  if(k==='ArrowDown'||k==='ArrowUp'||k==='s'||k==='w'){e.preventDefault();const d=(k==='ArrowDown'||k==='s')?1:-1;let i=CH.sel;for(let j=0;j<CH.opts.length;j++){i=(i+d+CH.opts.length)%CH.opts.length;if(!CH.opts[i].dis)break}CH.sel=i;markSel();return}
  if(k==='Enter'||k===' '||k==='e'||k==='E'){e.preventDefault();if(CH.sel>=0)pickChoice(CH.sel);return}
 }
 if(k==='l'||k==='L'){openBacklog();return}
 if(k==='Escape'){INPUT&&INPUT.settings&&INPUT.settings();return}
 if(DL){
  if(k===' '||k==='Enter'||k==='e'||k==='E'||k==='ArrowRight'&&false){e.preventDefault();if(!e.repeat)advance();return}
  if(k==='a'||k==='A'){setAuto(!autoOn);return}
  if(k==='s'||k==='S'){setSkip(!skipOn);return}
  return;
 }
 if(panelMode==='roam'&&INPUT){
  if(k==='ArrowLeft'||k==='a'||k==='A'){keys.l=1;e.preventDefault()}
  if(k==='ArrowRight'||k==='d'||k==='D'){keys.r=1;e.preventDefault()}
  if((k===' '||k==='Enter'||k==='e'||k==='E')&&!e.repeat){e.preventDefault();INPUT.act()}
  if(k==='m'||k==='M')INPUT.map();
  if(k==='q'||k==='Q')INPUT.quest();
 }
});
addEventListener('keyup',e=>{const k=e.key;if(k==='Control')ctrlHeld=false;if(k==='ArrowLeft'||k==='a'||k==='A')keys.l=0;if(k==='ArrowRight'||k==='d'||k==='D')keys.r=0});
addEventListener('blur',()=>{keys.l=keys.r=0;ctrlHeld=false});
function tapAdvance(e){audio();if(MINI)return;if(DL){advance()}}
$('view').addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;tapAdvance(e)});
$('pbody').addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;tapAdvance(e)});
$('bLog').onclick=()=>{audio();openBacklog()};
$('bAuto').onclick=()=>{audio();setAuto(!autoOn)};
$('bSkip').onclick=()=>{audio();setSkip(!skipOn)};
function holdBtn(id,key){const b=$(id);const on=e=>{e.preventDefault();audio();keys[key]=1;b.classList.add('on')},off=()=>{keys[key]=0;b.classList.remove('on')};b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off)}
holdBtn('pL','l');holdBtn('pR','r');
$('pA').onclick=()=>{audio();INPUT&&INPUT.act()};
$('pMap').onclick=()=>{audio();INPUT&&INPUT.map()};
if(matchMedia('(pointer:coarse)').matches||'ontouchstart'in window)document.body.classList.add('touch');
addEventListener('touchstart',()=>document.body.classList.add('touch'),{once:true,passive:true});

/* ---------------- phone: DMs and group chats ---------------- */
let PHONENEXT=null;
function dms(title,sub_,msgs){
 msgs.forEach(m=>BACKLOG.push({n:'📱 '+(m[0]==='me'?'You':m[0]==='them'?title:m[0]==='note'?'':(K[m[0]]?K[m[0]].n:m[0])),t:m[1],c:'#6b4a7a'}));
 if(TEST)return Promise.resolve();
 setSkip(false);
 return new Promise(res=>{
  const o=$('phoneov');o.hidden=false;o.innerHTML='<div class="ph"><div class="phh"></div><div class="phm"></div><button class="mb phb">NEXT ▸</button></div>';
  const h=o.querySelector('.phh');h.textContent=title;const sm=document.createElement('small');sm.textContent=sub_||'';h.appendChild(sm);
  const box=o.querySelector('.phm'),b=o.querySelector('.phb');let i=0;
  const next=()=>{if(i>=msgs.length){o.hidden=true;PHONENEXT=null;SFX.click();res();return}const [w,t]=msgs[i++];const d=document.createElement('div');d.className='bub'+(w==='me'?' me':w==='note'?' nt':'');if(w!=='me'&&w!=='them'&&w!=='note'){const n=document.createElement('b');n.textContent=K[w]?K[w].n:w;d.appendChild(n)}d.appendChild(document.createTextNode(t));box.appendChild(d);box.scrollTop=box.scrollHeight;SFX.blip(w==='me'?620:880,'sine');b.textContent=i>=msgs.length?'CLOSE':'NEXT ▸'};
  PHONENEXT=next;b.onclick=next;o.onclick=e=>{if(e.target===o)next()};next();
 });
}

/* ---------------- mini-games (big buttons, keyboard or touch) ---------------- */
let MINI=null;
function miniBox(html){const m=$('mini');m.hidden=false;m.innerHTML='<div class="mbox">'+html+'</div>';return m}
function miniEnd(){$('mini').hidden=true;$('mini').innerHTML='';MINI=null}
/* Timing bar: stop the needle in the green. Resolves 2 (perfect), 1 (good) or 0 (miss). */
function meter(title,o){
 o=Object.assign({speed:1.1,zone:.26,hot:.08,info:'Tap STOP or press Space when the needle is in the green.'},o||{});
 if(TEST)return Promise.resolve(TEST.meter?TEST.meter(title):pick([0,1,2]));
 setSkip(false);
 return new Promise(res=>{
  const c=.2+Math.random()*.6,m=miniBox('<h4></h4><div class="bar"><div class="zone"></div><div class="zone hot"></div><div class="needle"></div></div><button class="mbtn">STOP</button><div class="info"></div>');
  m.querySelector('h4').textContent=title;m.querySelector('.info').textContent=o.info;
  const z=m.querySelectorAll('.zone');z[0].style.left=(c-o.zone/2)*100+'%';z[0].style.width=o.zone*100+'%';z[1].style.left=(c-o.hot/2)*100+'%';z[1].style.width=o.hot*100+'%';
  const nd=m.querySelector('.needle');let p=0,dir=1,done=false;
  MINI={tick(rdt){if(done)return;p+=dir*rdt*o.speed;if(p>1){p=1;dir=-1}if(p<0){p=0;dir=1}nd.style.left='calc('+p*100+'% - 2px)'},key:stop};
  function stop(){if(done)return;done=true;const d=Math.abs(p-c),r=d<=o.hot/2?2:d<=o.zone/2?1:0;(r?SFX.pick:SFX.bad)();setTimeout(()=>{miniEnd();res(r)},TEST?0:450)}
  m.querySelector('.mbtn').addEventListener('pointerdown',e=>{e.preventDefault();stop()});
 });
}
/* Mash: fill the bar before time runs out. */
function mash(title,o){
 o=Object.assign({need:22,time:5,decay:2.2,info:'Tap fast / mash Space!'},o||{});
 if(TEST)return Promise.resolve(TEST.mash?TEST.mash(title):Math.random()<.6);
 setSkip(false);
 return new Promise(res=>{
  const m=miniBox('<h4></h4><div class="bar"><div class="fill"></div></div><button class="mbtn">MASH!</button><div class="info"></div>');
  m.querySelector('h4').textContent=title;const fill=m.querySelector('.fill'),info=m.querySelector('.info');let v=0,t=o.time,done=false;
  const hit=()=>{if(done)return;v+=1;SFX.smack();shake(.15);if(o.onHit)o.onHit()};
  MINI={tick(rdt){if(done)return;t-=rdt;v=Math.max(0,v-o.decay*rdt);fill.style.width=Math.min(100,v/o.need*100)+'%';info.textContent=o.info+'  '+Math.max(0,t).toFixed(1)+'s';if(v>=o.need)end(true);else if(t<=0)end(false)},key:hit};
  function end(ok){done=true;(ok?SFX.good:SFX.bad)();setTimeout(()=>{miniEnd();res(ok)},TEST?0:400)}
  m.querySelector('.mbtn').addEventListener('pointerdown',e=>{e.preventDefault();hit()});
 });
}
/* Rhythm: press on each beep. Returns number of hits out of n. */
function rhythm(title,o){
 o=Object.assign({n:8,gap:.9,shrink:.94,window:.2,info:'Press STEP / Space right as the beep sounds.'},o||{});
 if(TEST)return Promise.resolve(TEST.rhythm?TEST.rhythm(title,o.n):Math.floor(Math.random()*(o.n+1)));
 setSkip(false);
 return new Promise(res=>{
  const m=miniBox('<h4></h4><div class="bar"><div class="zone hot" style="left:46%;width:8%"></div><div class="needle"></div></div><button class="mbtn">STEP</button><div class="info"></div>');
  m.querySelector('h4').textContent=title;const nd=m.querySelector('.needle'),info=m.querySelector('.info');
  let k=0,gap=o.gap,t=0,hits=0,pressed=false,done=false,lastMiss=0;
  MINI={tick(rdt){if(done)return;t+=rdt;const p=t/gap;nd.style.left='calc('+Math.min(100,p*50)+'% - 2px)';
    if(p>=1&&!MINI.beeped){MINI.beeped=1;SFX.beep()}
    if(t>gap+o.window){if(!pressed){lastMiss++;}k++;t=0;gap*=o.shrink;pressed=false;MINI.beeped=0;if(k>=o.n){done=true;setTimeout(()=>{miniEnd();res(hits)},TEST?0:300)}}
    info.textContent='Lap '+Math.min(k+1,o.n)+' / '+o.n+'  ·  hits '+hits},
   key(){if(done||pressed)return;pressed=true;if(Math.abs(t-gap)<=o.window){hits++;SFX.pick()}else SFX.click()}};
  m.querySelector('.mbtn').addEventListener('pointerdown',e=>{e.preventDefault();MINI.key()});
  info.textContent=o.info;
 });
}

/* ---------------- canvas fitting: whole-number device pixels per art pixel ---------------- */
function fit(){
 const dpr=window.devicePixelRatio||1,vw=innerWidth,vh=innerHeight,portrait=vw/vh<1.05,panel=$('panel'),view=$('view');
 const minPanel=portrait?200:150;
 let s=Math.max(1,Math.floor(Math.min(vw*dpr/W,(vh-minPanel)*dpr/H)));
 const hudRow=portrait?50:0;
 while(s>1&&vh-H*s/dpr-hudRow<minPanel)s--;
 const cw=W*s/dpr,ch=H*s/dpr;
 view.style.flex='0 0 '+Math.floor(ch+hudRow)+'px';panel.style.height=Math.max(minPanel,Math.floor(vh-ch-hudRow))+'px';
 cv.style.width=cw+'px';cv.style.height=ch+'px';
 document.documentElement.style.setProperty('--panelH',Math.max(minPanel,Math.floor(vh-ch-hudRow))+'px');
}
addEventListener('resize',fit);addEventListener('orientationchange',()=>setTimeout(fit,200));

/* ---------------- main loop ---------------- */
let last=performance.now(),HOOK={update:null,drawOver:null,drawUnder:null};
function update(dt,rdt){
 for(let i=timers.length-1;i>=0;i--){const t=timers[i];t.t-=dt;if(t.t<=0){timers.splice(i,1);t.r()}}
 for(let i=tweens.length-1;i>=0;i--){const w=tweens[i];w.t+=dt;let q=Math.min(1,w.t/w.d);const e=w.ease==='in'?q*q:w.ease==='out'?1-(1-q)*(1-q):q<.5?2*q*q:1-2*(1-q)*(1-q);for(const k in w.props)w.o[k]=w.from[k]+(w.props[k]-w.from[k])*e;if(q>=1){tweens.splice(i,1);w.r()}}
 for(const id in A){const a=A[id];
  if(a.tx!=null){const d=a.tx-a.x;if(Math.abs(d)<1){a.x=a.tx;a.tx=null;a.moving=false;const r=a.res;a.res=null;r&&r()}else{a.dir=Math.sign(d);a.moving=true;a.x+=Math.sign(d)*Math.min(Math.abs(d),(a.wsp||a.sp)*dt);a.walk+=dt*11}}
  if(a.bleed>0&&P.set.gore){a.bleedT=(a.bleedT||0)+dt;if(a.bleedT>.12){a.bleedT=0;a.bleed-=.12;parts.push({x:a.x+rand(-4,4),y:a.y-(a.dead?3:16),vx:rand(-8,8),vy:rand(-10,5),c:BLOOD[1+(Math.random()*3|0)],s:1,fy:a.y+rand(-1,3),life:2})}}
  if(a.pool!=null&&a.pool<a.poolMax)a.pool=Math.min(a.poolMax,a.pool+dt*5);
 }
 for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.vy+=150*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.y>=p.fy||p.life<=0){if(p.y>=p.fy&&decals.length<900)decals.push({x:p.x,y:p.fy,w:p.s+1,h:1,c:p.c});parts.splice(i,1)}}
 fxState.shake=Math.max(0,fxState.shake-dt*1.6);fxState.flash=Math.max(0,fxState.flash-dt*2.4);
 if(subT>0){subT-=rdt;if(subT<=0)$('sub').style.opacity=0}
 if(toastT>0){toastT-=rdt;if(toastT<=0)$('toast').style.opacity=0}
 if(MINI&&MINI.tick)MINI.tick(rdt);
 textTick(rdt);
 HOOK.update&&HOOK.update(dt,rdt);
}
function draw(){
 g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;
 const sx=fxState.shake?Math.round((Math.random()-.5)*fxState.shake*8):0,sy=fxState.shake?Math.round((Math.random()-.5)*fxState.shake*5):0;
 g.translate(sx,sy);
 const room=(typeof ROOMS!=="undefined")&&ROOMS[ROOM];
 R(-8,-8,W+16,H+16,'#000');
 if(room){room.bg()}
 HOOK.drawUnder&&HOOK.drawUnder();
 for(const d of decals)R(d.x,d.y,d.w,d.h,d.c);
 if(window.drawCrowdBack&&crowd)drawCrowdBack(crowd);
 const list=[];
 for(const id in A){const a=A[id];if(a.vis)list.push({y:a.y+(a.layer||0),d:()=>drawActor(a)})}
 if(room&&room.items)for(const it of room.items)if(!it.cond||it.cond())list.push({y:it.y,d:it.d});
 for(const p of props)if(!p.hide)list.push({y:(p.follow&&A[p.follow]?A[p.follow].y+.5:p.y+(p.layer||0)),d:()=>drawProp(p)});
 list.sort((a,b)=>a.y-b.y);for(const it of list)it.d();
 if(window.drawCrowdFront&&crowd)drawCrowdFront(crowd);
 for(const p of parts)R(p.x,p.y,p.s,p.s,p.c);
 if(room&&room.over)room.over();
 if(fxState.romance>0){g.globalAlpha=fxState.romance*.22;R(0,0,W,H,'#ff8fb8');g.globalAlpha=1;drawPetals(fxState.romance)}
 if(fxState.red>0){g.globalAlpha=fxState.red*.16;R(0,0,W,H,'#2a0a12');g.globalAlpha=fxState.red*.5;R(0,0,W,6,'#000');R(0,H-6,W,6,'#000');R(0,0,8,H,'#000');R(W-8,0,8,H,'#000');g.globalAlpha=1}
 if(fxState.dark>0){g.globalAlpha=fxState.dark;R(0,0,W,H,'#05040a');g.globalAlpha=1}
 if(fxState.tint&&fxState.tintA>0){g.globalAlpha=fxState.tintA;R(0,0,W,H,fxState.tint);g.globalAlpha=1}
 if(speaker&&A[speaker]&&A[speaker].vis&&!A[speaker].dead)drawTalkMark(A[speaker]);
 HOOK.drawOver&&HOOK.drawOver();
 if(DL&&window.portraitTick)portraitTick();
 if(fxState.bars>0){const b=Math.round(fxState.bars*9);R(0,0,W,b,'#000');R(0,H-b,W,b,'#000')}
 if(fxState.flash>0){g.globalAlpha=Math.min(1,fxState.flash);R(0,0,W,H,fxState.flashC);g.globalAlpha=1}
}
function frame(now){
 const rdt=Math.min(.05,(now-last)/1000);last=now;const dt=rdt*speed();
 T+=dt;
 try{update(dt,rdt);draw();musicTick()}catch(e){console.error(e);if(TEST)TEST.err&&TEST.err(e)}
 requestAnimationFrame(frame);
}
