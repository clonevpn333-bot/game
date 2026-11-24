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
  const vol=(P.set.voiceVol!=null?P.set.voiceVol:1)*(up||ex?.2:.14);
  syl(AC.currentTime+.005,f,vol,'a',{kid:!k.adult,girl:!!k.girl,dur:.06,glide:q?.1:ex?.06:(Math.random()-.55)*.05})
 }catch(e){return _b(f,w)}}}
/* background: no voices, just a low crowd hum (a murmur that swells and dips) */
babble=function(){};
let MURM=null;
function murmEnsure(){if(MURM||!AC||!SFXG||!drumBuf)return;const len=AC.sampleRate*3,b=AC.createBuffer(1,len,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
 const src=AC.createBufferSource();src.buffer=b;src.loop=true;const bp=AC.createBiquadFilter();bp.type='bandpass';bp.frequency.value=330;bp.Q.value=1.4;const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=700;
 const am=AC.createGain();am.gain.value=.6;for(const f of[2.3,3.7,5.1]){const o=AC.createOscillator(),og=AC.createGain();o.frequency.value=f+Math.random()*.4;og.gain.value=.13;o.connect(og).connect(am.gain);o.start()}
 const out=AC.createGain();out.gain.value=0;src.connect(bp).connect(lp).connect(am).connect(out).connect(SFXG);src.start();MURM={out,type:null}}
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(TEST||!AC||AC.state!=='running')return;murmEnsure();if(!MURM)return;
 const ty=(!D||panelMode==='none'||P.set.ambOff)?null:RAMB_TYPE(ROOM),crowd=Object.keys(A).filter(k=>k!=='you'&&A[k]&&!A[k].dead).length;
 const base={hall:.27,cafe:.4,gym:.22,out:.1,arcade:.22}[ty]||0;const v=base*Math.min(1,.35+crowd*.07)*(P.set.ambVol!=null?P.set.ambVol:1)*(DL?.55:1);
 MURM.out.gain.setTargetAtTime(v,AC.currentTime,.4)}}
/* settings: voice and chatter loudness */
{const _os=openSettings;openSettings=function(){_os();const s=$('settings').querySelector('.set');if(!s)return;
 const add=(label,key,opts)=>{s.appendChild(Object.assign(document.createElement('div'),{textContent:label}));const w=document.createElement('div');w.className='opts';
  opts.forEach(([v,n])=>{const b=document.createElement('button');b.textContent=n;const cur=P.set[key]!=null?P.set[key]:1;b.setAttribute('aria-pressed',String(cur===v));b.onclick=()=>{P.set[key]=v;save&&save();openSettings()};w.appendChild(b)});s.appendChild(w)};
 add('🗣 Dialogue voices','voiceVol',[[.5,'Quiet'],[1,'Normal'],[1.6,'Loud']]);
 add('👥 Crowd hum','ambVol',[[.5,'Quiet'],[1,'Normal'],[1.6,'Loud']])}}
