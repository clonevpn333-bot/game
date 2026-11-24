'use strict';
/* =====================================================================
   HIGHSCHOOL — VOICES
   Talking sounds like talking now, not beeps. A buzzing “voice box”
   (sawtooth at the speaker's pitch) goes through vowel filters (the
   formants of a, e, i, o, u), with consonant clicks and hisses in
   between and a natural rise and fall of pitch.
   • Dialogue: the vowel follows the letters actually being typed, so
     every line sounds like itself. Each character keeps their own pitch.
   • Background chatter: whole crowds of distant, overlapping voices,
     with the odd laugh, in a bit of room echo.
   ===================================================================== */
const VOW={a:[730,1090,2440],e:[530,1840,2480],i:[300,2250,3000],o:[570,840,2410],u:[330,870,2240],y:[300,2250,3000]};
let VBUS=null,VECHO=null;
function vbus(){if(VBUS||!AC||!SFXG)return VBUS;VBUS=AC.createGain();VBUS.gain.value=1;VBUS.connect(SFXG);
 try{VECHO=AC.createConvolver();VECHO.buffer=musicRoom&&musicRoom.buffer;const w=AC.createGain();w.gain.value=.35;VECHO.connect(w).connect(SFXG)}catch(e){VECHO=null}return VBUS}
/* one syllable. f0 = pitch, v = loudness, vowel = a/e/i/o/u, o: {kid,girl,dur,glide,cons,far} */
function syl(t,f0,v,vowel,o){o=o||{};if(!AC||!vbus())return;
 const dur=o.dur||.09,F=VOW[vowel]||VOW.a,sc=o.kid?1.18:o.girl?1.1:1;
 const src=AC.createOscillator();src.type='sawtooth';
 const g0=f0*(1+(o.glide||0));src.frequency.setValueAtTime(f0*(1-(o.glide||0)*.3),t);src.frequency.linearRampToValueAtTime(g0,t+dur);
 const vib=AC.createOscillator(),vg=AC.createGain();vib.frequency.value=5.5;vg.gain.value=f0*.012;vib.connect(vg).connect(src.frequency);
 const env=AC.createGain();env.gain.setValueAtTime(.0001,t);env.gain.linearRampToValueAtTime(v,t+.012);env.gain.setValueAtTime(v*.85,t+dur*.7);env.gain.exponentialRampToValueAtTime(.0001,t+dur+.03);
 const out=o.far?(()=>{const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1700;lp.connect(VBUS);if(VECHO)lp.connect(VECHO);return lp})():VBUS;
 env.connect(out);
 [[F[0]*sc,8,1],[F[1]*sc,11,.55],[F[2]*sc,14,.22]].forEach(([fq,q,lv])=>{const bp=AC.createBiquadFilter();bp.type='bandpass';bp.frequency.value=fq;bp.Q.value=q;const gg=AC.createGain();gg.gain.value=lv*3.2;src.connect(bp).connect(gg).connect(env)});
 src.start(t);src.stop(t+dur+.05);vib.start(t);vib.stop(t+dur+.05);
 if(!o.far){const sq=AC.createOscillator(),sl=AC.createBiquadFilter(),sg=AC.createGain();sq.type='square';sq.frequency.setValueAtTime(f0,t);sl.type='lowpass';sl.frequency.value=2200;sg.gain.value=.05;sq.connect(sl).connect(sg).connect(env);sq.start(t);sq.stop(t+dur+.05)}
 /* consonants: a click or a hiss in front */
 if(o.cons){const s=AC.createBufferSource(),f=AC.createBiquadFilter(),a=AC.createGain();s.buffer=drumBuf;f.type=o.cons==='s'?'highpass':'bandpass';f.frequency.value=o.cons==='s'?4200:o.cons==='k'?1800:2600;f.Q.value=1;
  a.gain.setValueAtTime(v*(o.cons==='s'?.5:.8),t-.025);a.gain.exponentialRampToValueAtTime(.0001,t+(o.cons==='s'?.05:.018));s.connect(f).connect(a).connect(out);s.start(Math.max(AC.currentTime,t-.025));s.stop(t+.06)}
}
const CONS={s:'s',z:'s',f:'s',h:'s',c:'k',k:'k',g:'k',q:'k',t:'t',d:'t',p:'t',b:'t'};
/* dialogue: replace the beep with a syllable that matches the text */
{const _b=SFX.blip;SFX.blip=function(f,w){
 if(TEST||!AC||!DL||!DL.who||($('phoneov')&&!$('phoneov').hidden))return _b(f,w);
 try{const k=K[DL.who]||{},tx=DL.text||'',i=Math.max(0,Math.floor(DL.i)-1);let vw='a',cons=null;
  for(let j=i;j>=Math.max(0,i-3);j--){const ch=(tx[j]||'').toLowerCase();if(VOW[ch]){vw=ch;break}if(!cons&&CONS[ch])cons=CONS[ch]}
  const up=tx[i]&&tx[i]===tx[i].toUpperCase()&&/[A-Z]/.test(tx[i]),q=/[?]/.test(tx.slice(i,i+6)),ex=/!/.test(tx.slice(i,i+4));
  const vol=(P.set.voiceVol!=null?P.set.voiceVol:1)*(up||ex?.4:.3);
  syl(AC.currentTime+.005,f,vol,'a',{kid:!k.adult,girl:!!k.girl,dur:.06,glide:q?.1:ex?.06:(Math.random()-.55)*.05})
 }catch(e){return _b(f,w)}}}
/* background: no voices, just a low crowd hum (a murmur that swells and dips) */
babble=function(){};
let MURM=null;
/* the crowd: six distant people humming-talking (“mm-ah-mm”), each with
   their own pitch, rising and falling, taking turns, muffled and echoey */
function murmEnsure(){if(MURM||!AC||!SFXG)return;
 const out=AC.createGain();out.gain.value=0;const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1300;const hp=AC.createBiquadFilter();hp.type='highpass';hp.frequency.value=150;lp.connect(hp).connect(out);out.connect(SFXG);
 if(vbus()&&VECHO)out.connect(VECHO);
 const people=[];
 for(let i=0;i<14;i++){const kid=i<11,girl=i%2===0;const f0=kid?(girl?240+Math.random()*70:170+Math.random()*60):(girl?185:115)+Math.random()*30;
  const o=AC.createOscillator();o.type='sawtooth';o.frequency.value=f0;
  const vib=AC.createOscillator(),vg=AC.createGain();vib.frequency.value=4.5+Math.random()*2;vg.gain.value=f0*.015;vib.connect(vg).connect(o.frequency);vib.start();
  const sc=kid?1.15:1;const f1=AC.createBiquadFilter(),f2=AC.createBiquadFilter(),m=AC.createGain();
  f1.type='bandpass';f1.frequency.value=420*sc;f1.Q.value=5;f2.type='bandpass';f2.frequency.value=1000*sc;f2.Q.value=6;
  const g2=AC.createGain();g2.gain.value=.45;o.connect(f1).connect(m);o.connect(f2).connect(g2).connect(m);
  /* syllables: the voice pulses at talking speed */
  const syl=AC.createGain();syl.gain.value=.38;const s1=AC.createOscillator(),s1g=AC.createGain();s1.frequency.value=3+Math.random()*2.5;s1g.gain.value=.16;s1.connect(s1g).connect(syl.gain);s1.start();
  /* turns: each person talks for a few seconds, then listens */
  const turn=AC.createGain();turn.gain.value=0;
  m.connect(syl).connect(turn).connect(lp);o.start();
  people.push({o,f0,turn,f1,f2,next:0,kid})}
 if(drumBuf){const len=AC.sampleRate*4,b=AC.createBuffer(1,len,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  const n=AC.createBufferSource();n.buffer=b;n.loop=true;const bp=AC.createBiquadFilter();bp.type='bandpass';bp.frequency.value=520;bp.Q.value=.8;const bp2=AC.createBiquadFilter();bp2.type='lowpass';bp2.frequency.value=1500;
  const wg=AC.createGain();wg.gain.value=.9;const am=AC.createOscillator(),amg=AC.createGain();am.frequency.value=.23;amg.gain.value=.2;am.connect(amg).connect(wg.gain);am.start();n.connect(bp).connect(bp2).connect(wg).connect(lp);n.start()}
 try{const ir=AC.createBuffer(2,AC.sampleRate*2.6|0,AC.sampleRate);for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2.2)}
  const hall=AC.createConvolver();hall.buffer=ir;const wet=AC.createGain();wet.gain.value=.28;lp.connect(hall).connect(wet).connect(out)}catch(e){}
 MURM={out,type:null,people}}
function murmTick(){if(!MURM)return;const now=AC.currentTime;
 for(const p of MURM.people){if(now<p.next)continue;
  const talking=Math.random()<.85,len=1.5+Math.random()*3.5;p.next=now+len;
  p.turn.gain.setTargetAtTime(talking?.3+Math.random()*.25:.06,now,.6);
  /* intonation: drift the pitch and the vowel */
  const nf=p.f0*(.88+Math.random()*.3);p.o.frequency.setTargetAtTime(nf,now,.4);
  const sc=p.kid?1.15:1,v=pick([[420,1000],[330,900],[600,1150],[500,1500],[360,1900]]);p.f1.frequency.setTargetAtTime(v[0]*sc,now,.3);p.f2.frequency.setTargetAtTime(v[1]*sc,now,.3)}}
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(TEST||!AC||AC.state!=='running')return;murmEnsure();if(!MURM)return;murmTick();
 const ty=(!D||panelMode==='none'||P.set.ambOff)?null:RAMB_TYPE(ROOM),crowd=Object.keys(A).filter(k=>k!=='you'&&A[k]&&!A[k].dead).length;
 const base={hall:.11,cafe:.16,gym:.09,out:.045,arcade:.09}[ty]||0;const v=base*Math.min(1,.35+crowd*.07)*(P.set.ambVol!=null?P.set.ambVol:1)*(DL?.3:1);
 MURM.out.gain.setTargetAtTime(v,AC.currentTime,.4)}}
/* settings: voice and chatter loudness */
{const _os=openSettings;openSettings=function(){_os();const s=$('settings').querySelector('.set');if(!s)return;
 const add=(label,key,opts)=>{s.appendChild(Object.assign(document.createElement('div'),{textContent:label}));const w=document.createElement('div');w.className='opts';
  opts.forEach(([v,n])=>{const b=document.createElement('button');b.textContent=n;const cur=P.set[key]!=null?P.set[key]:1;b.setAttribute('aria-pressed',String(cur===v));b.onclick=()=>{P.set[key]=v;save&&save();openSettings()};w.appendChild(b)});s.appendChild(w)};
 add('🗣 Dialogue voices','voiceVol',[[.5,'Quiet'],[1,'Normal'],[1.6,'Loud']]);
 add('👥 Crowd hum','ambVol',[[.5,'Quiet'],[1,'Normal'],[1.6,'Loud']])}}

/* ---------- students you can HEAR: mm's and ahh's from the kids on screen ---------- */
VOW.m=[260,1050,2300];
let KIDTALK_T=0;
function kidMumble(id,n){const a=A[id],k=K[id];if(!a||!k||!AC||!vbus()||P.set.ambOff)return;
 const f0=(k.v||300)*(.85+Math.random()*.15),t0=AC.currentTime+.02,dist=A.you?Math.abs(a.x-A.you.x):100;
 const vol=.16*(P.set.ambVol!=null?P.set.ambVol:1)*(DL?.35:1)*Math.max(.35,1-dist/260);
 let t=t0;const N_=n||3+(Math.random()*4|0);
 for(let i=0;i<N_;i++){const v=i%2?'a':(Math.random()<.6?'m':'u');const d=v==='m'?.09+Math.random()*.06:.07+Math.random()*.05;
  syl(t,f0*(1+(i===N_-1?-.08:Math.sin(i*1.9)*.06)),vol*(v==='m'?.8:1),v,{kid:!k.adult,girl:!!k.girl,dur:d,glide:(Math.random()-.5)*.1});
  t+=d+.03+Math.random()*.05;if(Math.random()<.15)t+=.12}}
/* gossip bubbles speak */
if(typeof bubbles!=='undefined'){const _push=bubbles.push;bubbles.push=function(...b){for(const x of b)try{if(!TEST&&x&&x.id)kidMumble(x.id)}catch(e){}return _push.apply(this,b)}}
/* and kids on screen mumble now and then */
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(TEST||!AC||AC.state!=='running'||!D||panelMode==='none'||T<KIDTALK_T)return;
 KIDTALK_T=T+1.4+Math.random()*2.2;
 const ks=Object.keys(A).filter(id=>id!=='you'&&A[id]&&!A[id].dead&&A[id].vis!==false&&K[id]&&!K[id].adult&&A[id].x>-5&&A[id].x<325&&!(DL&&DL.who===id));
 if(ks.length)kidMumble(pick(ks))}}
