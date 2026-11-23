'use strict';
/* =====================================================================
   HIGHSCHOOL — 🔞 FILTHY QUESTS
   The R-rated teacher quests are a feature now:
   • 🔞 FILTHY tag in ⚡ Do Now and the Quests tab, plus its own filter.
   • A PARENTAL ADVISORY card the first time each one starts:
     LET'S GO or NOPE, with a "don't warn me again" box.
   • The Filth-o-Meter: ranks for how many you've survived.
   • Settings: Filthy quests ON/OFF (on in the main game, off by
     default in the safe version).
   ===================================================================== */
const FILTHY=['hotmic','codebrown','keybowl','dungeon','eatit','replyall'];
for(const m of FILTHY)if(MIS[m])MIS[m].filthy=1;
function filthyOn(){P.set=P.set||{};if(P.set.filthy==null)P.set.filthy=window.EDITION==='safe'?0:1;return !!P.set.filthy}
/* off = they never show up */
for(const h of HOOKS)if(FILTHY.includes(h.mis)){const c=h.cond;h.cond=function(){return filthyOn()&&(!c||c.apply(this,arguments))}}
for(const s of SPOTS)if(FILTHY.includes(s.mis)){const c=s.cond;s.cond=function(){return filthyOn()&&(!c||c.apply(this,arguments))}}
/* the warning */
const ADVISORY=[
 ['PARENTAL ADVISORY','EXPLICIT TEACHERS','What happens next involves grown adults, a total lack of shame, and at least one bodily fluid. Highgate High is not responsible for any milk that comes out of your nose.'],
 ['⚠ CONTENT WARNING ⚠','THE STAFF ARE HORNY AND UNWELL','You are about to learn things about your teachers that you cannot unlearn. Your therapist will want to see this level.'],
 ['WARNING: FILTHY','SIT DOWN FOR THIS ONE','This quest is rated R for Really Disgusting. Keep your hands, feet and dignity inside the ride at all times.'],
 ['🔞 FILTH AHEAD 🔞','NO, SERIOUSLY','Coach is involved. That’s all we’re going to say. If you’re eating, stop. If you’re not eating, good.'],
 ['HEADS UP','YOUR TEACHERS HAVE SEX LIVES','And they are LOUD about it. The following contains filthy jokes, gross-out, and one (1) whistle that has seen things.'],
 ['VIEWER DISCRETION','IS ADVISED. ADVISED HARD.','Nobody in this scene has ever been told “no”. Mr. Adam has never been told “slow down”. Proceed with eye bleach.']];
function advisory(m){
 return new Promise(res=>{
  const [t1,t2,body]=ADVISORY[(Object.keys(P.filthOK||{}).length+FILTHY.indexOf(m))%ADVISORY.length];
  const o=document.createElement('div');o.id='advisory';
  o.innerHTML='<div class="pa"><div class="t1"></div><div class="t2"></div></div><div class="qn"></div><p></p><div class="b"><button class="go">LET’S GO <small>(I’m built different)</small></button><button class="no">NOPE <small>(take me back)</small></button></div><label><input type="checkbox"> don’t warn me again</label>';
  o.querySelector('.t1').textContent=t1;o.querySelector('.t2').textContent=t2;o.querySelector('.qn').textContent='🔞 '+(MIS[m]?MIS[m].name.toUpperCase():'');o.querySelector('p').textContent=body;
  const done=v=>{if(o.querySelector('input').checked){P.set.filthyNoWarn=1}removeEventListener('keydown',key,true);o.remove();save&&save();res(v)};
  const key=e=>{if(e.key==='Enter'||e.key===' '||e.key==='1'){e.preventDefault();e.stopImmediatePropagation();done(true)}if(e.key==='Escape'||e.key==='2'){e.preventDefault();e.stopImmediatePropagation();done(false)}};
  o.querySelector('.go').onclick=()=>done(true);o.querySelector('.no').onclick=()=>done(false);
  addEventListener('keydown',key,true);document.body.appendChild(o);SFX.sting&&SFX.sting();
 })}
{const st=document.createElement('style');st.textContent=`
#advisory{position:fixed;inset:0;z-index:70;background:radial-gradient(ellipse at 50% 40%,#2a0a12f4,#050307fa);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px;text-align:center;color:#f4ead8;animation:advIn .3s ease-out}
@keyframes advIn{from{opacity:0;transform:scale(1.06)}to{opacity:1;transform:none}}
#advisory .pa{border:4px solid #fff;background:#000;padding:8px 18px;min-width:240px;transform:rotate(-2deg);box-shadow:0 0 0 3px #000,0 0 40px #ff204080;animation:advShake 2.4s ease-in-out infinite}
@keyframes advShake{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(1deg) scale(1.03)}}
#advisory .t1{font-size:clamp(18px,4vw,30px);letter-spacing:.14em;color:#fff;border-bottom:3px solid #fff;padding-bottom:4px;margin-bottom:4px}
#advisory .t2{font-size:clamp(12px,2.4vw,17px);letter-spacing:.2em;color:#fff}
#advisory .qn{color:#ff6a8a;letter-spacing:.2em;font-size:14px}
#advisory p{max-width:30em;font-size:clamp(12px,1.8vw,15px);line-height:1.6;color:#e8d8e0;margin:0}
#advisory .b{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
#advisory button{font:inherit;font-size:15px;padding:10px 18px;border:2px solid #ff6a8a;background:#3a0a18;color:#fff;cursor:pointer;letter-spacing:.1em}
#advisory button.no{border-color:#6a5a7a;background:#1a1424;color:#cbbfd8}#advisory button small{display:block;font-size:10px;opacity:.7;letter-spacing:.05em}
#advisory button:hover{transform:translateY(-1px)}#advisory label{font-size:12px;color:#a99aa8;cursor:pointer}
#quest.ql2 .chip.filthy{background:#5a0a20;color:#ff9ab0}`;document.head.appendChild(st)}
{const _rh=runHook;runHook=async function(h){
 if(h&&FILTHY.includes(h.mis)&&!TEST&&!(P.filthOK&&P.filthOK[h.mis])&&!P.set.filthyNoWarn&&!h._inner){
  const ok=await advisory(h.mis);if(!ok){toast('Coward. (It’ll still be there.)');busy=false;if(panelMode!=='roam')roam();return}
  (P.filthOK=P.filthOK||{})[h.mis]=1;save&&save()}
 return _rh(h)}}
{const _us=useSpot;useSpot=async function(s){
 if(s&&FILTHY.includes(s.mis)&&!TEST&&!(P.filthOK&&P.filthOK[s.mis])&&!P.set.filthyNoWarn){
  const ok=await advisory(s.mis);if(!ok){toast('Coward. (It’ll still be there.)');return}(P.filthOK=P.filthOK||{})[s.mis]=1;save&&save()}
 return _us(s)}}
/* the Filth-o-Meter */
const FILTH_RANKS=[[0,'Innocent','You still think teachers go home and grade papers.'],[1,'Corrupted','You’ve heard things. You can’t un-hear them.'],[3,'Seen Things','You look at the staff room door differently now.'],[5,'Eye Bleach Subscriber','Your browser history is clean. Your soul is not.'],[6,'Certified Degenerate','You have seen every filthy thing Highgate has to offer. Coach salutes you. Please don’t salute back.']];
function filthCount(){return FILTHY.filter(m=>P.done[m]).length}
function filthRank(){let r=FILTH_RANKS[0];for(const x of FILTH_RANKS)if(filthCount()>=x[0])r=x;return r}
{const _cp=complete;complete=async function(m,v,big){const before=filthCount();const r=await _cp(m,v,big);try{if(FILTHY.includes(m)&&filthCount()>before&&!TEST){const k=filthRank();setTimeout(()=>toast('🔞 Filth-o-Meter: '+filthCount()+'/'+FILTHY.length+' · '+k[1].toUpperCase()),2800)}}catch(e){}return r}}
/* settings */
{const _os=openSettings;openSettings=function(){_os();const s=$('settings').querySelector('.set');if(!s)return;
 s.appendChild(Object.assign(document.createElement('div'),{textContent:'🔞 Filthy quests'}));const w=document.createElement('div');w.className='opts';
 [[1,'On'],[0,'Off']].forEach(([v,n])=>{const b=document.createElement('button');b.textContent=n;b.setAttribute('aria-pressed',String(+filthyOn()===v));b.onclick=()=>{P.set.filthy=v;save&&save();openSettings()};w.appendChild(b)});s.appendChild(w);
 s.appendChild(Object.assign(document.createElement('div'),{textContent:'🔞 Filth warnings'}));const w2=document.createElement('div');w2.className='opts';
 [[0,'Warn me'],[1,'I’m built different']].forEach(([v,n])=>{const b=document.createElement('button');b.textContent=n;b.setAttribute('aria-pressed',String(+(!!P.set.filthyNoWarn)===v));b.onclick=()=>{P.set.filthyNoWarn=v;save&&save();openSettings()};w2.appendChild(b)});s.appendChild(w2)}}
