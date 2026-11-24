'use strict';
/* =====================================================================
   HIGHSCHOOL — DEFINITIVE EDITION (the remaster pass)
   ANIMATION
   • Squash & stretch: landing, jumping, getting hit, turning round.
   • People blink. Talkers gesture with their hands. Shock = a startle hop.
   • Running kicks up dust at the feet.
   CUTSCENES
   • The black bars slide in and out instead of snapping.
   QUESTS
   • NEW QUEST / QUEST UPDATED / QUEST COMPLETE banners with a stamp.
   LOOK
   • Time-of-day color grade, dust drifting in indoor light.
   • Settings → “Remaster effects” turns the look stuff off.
   ===================================================================== */
const REMASTER_VERSION='1.0';
const RM=()=>!TEST&&!(P&&P.set&&P.set.rmOff);

/* ---------------- squash & stretch ---------------- */
let BLITS=null;
{const _bk=blitKid;blitKid=function(dx,dy,al){if(!BLITS||(Math.abs(BLITS.sx-1)<.02&&Math.abs(BLITS.sy-1)<.02))return _bk(dx,dy,al);
 const fx=dx+OX,fy=dy+OY;g.save();g.translate(fx,fy);g.scale(BLITS.sx,BLITS.sy);g.translate(-fx,-fy);try{_bk(dx,dy,al)}finally{g.restore()}}}
function squash(id,kind){const a=A[id];if(!a)return;a._sq={t:T,kind}}
{const _da=drawActor;drawActor=function(a){
 if(!a||!a.k||TEST)return _da(a);
 /* track changes */
 const z=a.z||0;
 if(a._lz!=null){if(a._lz>1.5&&z<=.3&&!a.dead&&a.pose!=='lie')a._sq={t:T,kind:'land'};if(a._lz<.3&&z>1.5)a._sq={t:T,kind:'jump'}}a._lz=z;
 if(a._ld!=null&&a.dir!==a._ld&&!a.dead&&a.pose!=='lie')a._sq={t:T,kind:'turn'};a._ld=a.dir;
 let sx=1,sy=1;
 if(a._sq){const k=(T-a._sq.t)/({land:.16,jump:.18,hit:.14,turn:.11,pop:.16}[a._sq.kind]||.15);
  if(k>=1)a._sq=null;else{const e=Math.sin(k*Math.PI);
   if(a._sq.kind==='land'){sy=1-.22*e;sx=1+.16*e}else if(a._sq.kind==='jump'){sy=1+.14*e;sx=1-.1*e}
   else if(a._sq.kind==='hit'){sx=1+.14*e;sy=1-.1*e}else if(a._sq.kind==='turn'){sx=Math.max(.35,1-.65*e)}else if(a._sq.kind==='pop'){sy=1+.06*e;sx=1-.03*e}}}
 /* blink */
 let undo=null;
 if(!a.ex&&!a.k.adam&&!a.dead&&a.pose!=='lie'){const s=(a.k.seed||7)*.37,ph=(T+s)%(3.6+(s%1.7));if(ph<.11){undo=a._ex;a._ex='closed'}}
 BLITS=(sx!==1||sy!==1)?{sx,sy}:null;
 try{_da(a)}finally{BLITS=null;if(undo!==null)a._ex=undo}
 /* run dust */
 if(a.moving&&a.fast&&!a.dead&&!(a.z>1)&&RM()){a._dustT=(a._dustT||0)+1;if(a._dustT%6===0)parts.push({x:a.x-(a.dir||1)*3,y:a.y-1,vx:-(a.dir||1)*rand(6,16),vy:rand(-10,-3),c:'rgba(200,190,170,.55)',s:1,fy:a.y,life:.5})}
}}
{const _hit=hit;hit=async function(a,b,o){const r=_hit(a,b,o);if(A[b])setTimeout(()=>squash(b,'hit'),TEST?0:60);return r}}

/* ---------------- talking: gestures, startle hops ---------------- */
const GEST={angry:['point','slam','hips'],yell:['point','slam'],evil:['hips','point'],smirk:['hips','shrug','cross'],happy:['shrug','wave','hips'],laugh:['shrug','up'],sad:['hurt','cross'],scared:['cover','hurt'],shock:['cover','up'],love:['hips','shrug'],blush:['cover','hurt'],cold:['cross','hips'],closed:['cross'],hurt:['hurt']};
{const _s=say;say=function(who,text,ex){
 const a=who?A[who]:null;let gp=null;
 if(a&&!TEST&&RM()&&!a.dead&&a.vis!==false&&!a.pose&&a.tx==null&&!a.hold&&!(a.z>1)){
  const e=ex||a.ex||'',list=GEST[e]||(Math.random()<.5?['shrug','hips','point']:null);
  if(list&&Math.random()<.55){gp=list[Math.floor(Math.random()*list.length)];a.pose=gp;a._gest=gp}
  a._sq={t:T,kind:'pop'};
  if((e==='shock'||e==='scared')&&Math.random()<.7)hop(who,3,200);
 }
 const p=_s(who,text,ex);
 if(gp&&p&&p.then)p.then(()=>{if(A[who]===a&&a.pose===gp&&a._gest===gp){a.pose=null;a._gest=null}});
 return p}}

/* ---------------- cutscene bars slide ---------------- */
{let tgt=fxState.bars||0,shown=tgt;
 Object.defineProperty(fxState,'bars',{get(){return TEST?tgt:shown},set(v){tgt=v},configurable:true});
 const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);const r=rdt||dt;shown+=(tgt-shown)*Math.min(1,r*9);if(Math.abs(tgt-shown)<.01)shown=tgt}}

/* ---------------- quest banners ---------------- */
{const st=document.createElement('style');st.textContent=`
#qban{position:fixed;right:14px;top:calc(max(14px,env(safe-area-inset-top)) + 46px);transform:translateX(130%);z-index:40;pointer-events:none;min-width:240px;max-width:min(80vw,380px);
 background:linear-gradient(180deg,#1e1830f4,#120e1cf4);border:2px solid #ffd27a;box-shadow:0 0 0 1px #000,0 10px 30px #000a;padding:9px 16px 10px;text-align:center;transition:transform .45s cubic-bezier(.2,1.4,.4,1)}
#qban.on{transform:translateX(0)}
#qban .k{font-size:11px;letter-spacing:.32em;color:#ffd27a}#qban .n{font-size:19px;color:#fff;letter-spacing:.08em;margin:2px 0}#qban .s{font-size:12px;color:#cbbfd8;line-height:1.4}
#qban.done{border-color:#9ad09a}#qban.done .k{color:#9ad09a}#qban.upd{border-color:#8ab8e8}#qban.upd .k{color:#8ab8e8}
#qban .stamp{position:absolute;right:-14px;top:-12px;font-size:12px;letter-spacing:.14em;color:#9ad09a;border:2px solid #9ad09a;padding:2px 6px;background:#0e1a12;transform:rotate(12deg) scale(2.4);opacity:0;transition:transform .3s .35s cubic-bezier(.3,1.6,.5,1),opacity .2s .35s}
#qban.done .stamp{transform:rotate(12deg) scale(1);opacity:1}
#qban .ic{font-size:22px;display:block;margin-bottom:-2px}`;document.head.appendChild(st)}
const QBQ=[];let qbBusy=false;
function qBanner(kind,m,sub){if(TEST||!MIS[m])return;QBQ.push({kind,m,sub});if(!qbBusy)qbNext()}
function qbNext(){const q=QBQ.shift();if(!q){qbBusy=false;return}qbBusy=true;
 let e=$('qban');if(!e){e=document.createElement('div');e.id='qban';document.body.appendChild(e)}
 const M=MIS[q.m];e.className=q.kind==='done'?'done':q.kind==='upd'?'upd':'';
 e.innerHTML='<span class="ic"></span><div class="k"></div><div class="n"></div><div class="s"></div>'+(q.kind==='done'?'<div class="stamp">DONE</div>':'');
 e.querySelector('.ic').textContent=M.icon||'★';e.querySelector('.k').textContent=q.kind==='done'?'QUEST COMPLETE':q.kind==='upd'?'QUEST UPDATED':'NEW QUEST';
 e.querySelector('.n').textContent=M.name.toUpperCase();e.querySelector('.s').textContent=q.sub||'';
 requestAnimationFrame(()=>requestAnimationFrame(()=>e.classList.add('on')));
 if(q.kind==='done'){SFX.cheer?setTimeout(()=>SFX.pick&&SFX.pick(),350):0}else SFX.pick&&SFX.pick();
 setTimeout(()=>{e.classList.remove('on');setTimeout(qbNext,500)},q.kind==='done'?3000:2600)}
const QB_SKIP=['passing','gigs','robbery','lockedroom'];
{const _pt=part;part=function(m,n,quiet){const was=D&&D.mp?(D.mp[m]||0):0;const r=_pt(m,n,quiet);
 try{if(!QB_SKIP.includes(m)&&!/^(cq_|wk_|ret_)/.test(m)&&D&&(D.mp[m]||0)>was){const M=MIS[m];
  if(was===0)qBanner('new',m,M.goal||M.parts[0]||'');else qBanner('upd',m,'Next: '+((M.tips||[])[D.mp[m]]||M.parts[D.mp[m]]||'keep going'))}}catch(e){}return r}}
{const _cp=complete;complete=async function(m,v,big){const had=D&&D.done&&D.done[m];
 if(!had&&!QB_SKIP.includes(m)&&MIS[m]&&!/^(cq_|wk_)/.test(m)){const lab=MIS[m].variants&&MIS[m].variants[v];qBanner('done',m,lab?'Ending: '+lab:'')}
 return _cp(m,v,big)}}
{const _t=toast;toast=function(t){if(typeof t==='string'&&/ — part \d+ of \d+/.test(t)&&!TEST)return;return _t(t)}}

/* ---------------- the look ---------------- */
const GRADE={0:['#9ab8ff',.10],1:['#c8d8ff',.05],2:['#fff4d8',.05],3:['#fff0d0',.04],4:['#ffe0a0',.08],5:['#ffd8a0',.07],6:['#ffc890',.10],7:['#ff9a60',.13],8:['#c06aa0',.16]};
const OUTDOOR=new Set(['bus','field','carpark','forest','lake','courtyard','walkway','busride','titlescreen','party']);
const MOTES=Array.from({length:18},(_,i)=>({x:hsh(i*3.1)*W,y:30+hsh(i*7.7)*110,s:.3+hsh(i*1.9)*.7,p:hsh(i*5.3)*6.28}));
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{
 if(RM()&&D&&ROOM&&ROOM!=='titlescreen'){
  const gr=GRADE[D.weekend?4:D.period]||GRADE[2];
  g.save();g.globalCompositeOperation='soft-light';g.globalAlpha=gr[1]*2.2;g.fillStyle=gr[0];g.fillRect(0,0,W,H);g.restore();
  if(!OUTDOOR.has(ROOM)){for(const m of MOTES){const x=(m.x+T*4*m.s+Math.sin(T*.7+m.p)*6)%W,y=m.y+Math.sin(T*.5+m.p)*5;g.globalAlpha=.18+.18*Math.sin(T*1.3+m.p);R(x,y,1,1,'#fff6e0');g.globalAlpha=1}}
 }
 _do&&_do(...x)}}

/* ---------------- settings + version ---------------- */
{const _os=openSettings;openSettings=function(){_os();const s=$('settings').querySelector('.set');if(!s)return;
 s.appendChild(Object.assign(document.createElement('div'),{textContent:'✨ Remaster effects'}));const w=document.createElement('div');w.className='opts';
 [[0,'On'],[1,'Off']].forEach(([v,n])=>{const b=document.createElement('button');b.textContent=n;b.setAttribute('aria-pressed',String(+(!!P.set.rmOff)===v));b.onclick=()=>{P.set.rmOff=v;save&&save();openSettings()};w.appendChild(b)});s.appendChild(w);
 const ver=document.createElement('p');ver.style.cssText='color:#6a5a7a;font-size:11px;margin:10px 0 0;letter-spacing:.12em';ver.textContent='HIGHSCHOOL · DEFINITIVE EDITION · v'+REMASTER_VERSION;s.parentNode.appendChild(ver)}}
setInterval(()=>{try{const m=$('menu');if(m&&!m.hidden&&!m.querySelector('.defed')&&ROOM==='titlescreen'){const d=document.createElement('div');d.className='defed';d.textContent='DEFINITIVE EDITION · v'+REMASTER_VERSION;d.style.cssText='position:fixed;right:14px;bottom:12px;font-size:11px;letter-spacing:.28em;color:#ffd27a;opacity:.85;text-shadow:1px 1px #000;pointer-events:none';m.appendChild(d)}}catch(e){}},700);

/* ---------------- sprites: a rim of light on the top-left edge ---------------- */
{const RIM=document.createElement('canvas');RIM.width=ABW;RIM.height=ABH;const rg=RIM.getContext('2d');
 const _bkb=bufferKid;bufferKid=function(k,o){_bkb(k,o);if(!RM())return;
  rg.globalCompositeOperation='source-over';rg.clearRect(0,0,ABW,ABH);rg.drawImage(AB,0,0);
  rg.globalCompositeOperation='destination-out';rg.drawImage(AB,1,1);
  rg.globalCompositeOperation='source-in';rg.fillStyle='rgba(255,236,210,.55)';rg.fillRect(0,0,ABW,ABH);
  abg.globalCompositeOperation='source-atop';abg.drawImage(RIM,0,0);abg.globalCompositeOperation='source-over'}}

/* ---------------- footsteps ---------------- */
{let lastStep=0;const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);
 const a=A.you;if(!a||TEST||panelMode!=='roam'||!a.moving)return;
 const s=Math.floor((a.walk||0)/Math.PI);if(s!==lastStep){lastStep=s;try{noise(.03,a.fast?.07:.045,500+Math.random()*300,1.4,'bandpass')}catch(e){}
  if(RM()&&Math.random()<.35)parts.push({x:a.x-(a.dir||1)*2,y:a.y-1,vx:-(a.dir||1)*rand(3,8),vy:rand(-6,-2),c:'rgba(200,190,170,.4)',s:1,fy:a.y,life:.35})}}}
