'use strict';
/* =====================================================================
   HIGHSCHOOL — CLARITY
   Calmer music · every teacher sounds like themselves · no stray Fridays
   · a clear start to every day · "Next:" for whatever you’re in the
   middle of, and the map shows where it happens.
   ===================================================================== */

/* ---------- music: slower, softer, no drums ---------- */
for(const k in SCORES){const m=SCORES[k];if(m._mellow)continue;m._mellow=1;m.beat*=1.6;m.drums=0;m.soft=1;m.lead=m.lead.map((n,i)=>i%2?-1:n)}

/* ---------- every teacher in their own voice ---------- */
const VOICE={shermian:{me:'Miss',pet:'sweetie',pets:'sweeties',his:'her',sir:'Miss'},balduf:{me:'Ms. Balduf',pet:'darling',pets:'darlings',his:'her',sir:'Miss'},sherman:{me:'Ms. Sherman',pet:'dear',pets:'children',his:'her',sir:'Miss'},loach:{me:'Ms. Loach',pet:'love',pets:'loves',his:'her',sir:'Miss'},voss:{me:'Mr. Voss',pet:'young scientist',pets:'young scientists',his:'his',sir:'Sir'},coach:{me:'Coach',pet:'champ',pets:'ladies',his:'his',sir:'Coach'},grieve:{me:'Mr. Grieve',pet:'soldier',pets:'troops',his:'his',sir:'Sir'},dahl:{me:'Miss Dahl',pet:'my little artist',pets:'my little artists',his:'her',sir:'Miss'},fenwick:{me:'Mr. Fenwick',pet:'songbird',pets:'songbirds',his:'his',sir:'Sir'},byte:{me:'Mrs. Byte',pet:'learner',pets:'learners',his:'her',sir:'Miss'},tarn:{me:'Mrs. Tarn',pet:'swimmer',pets:'swimmers',his:'her',sir:'Miss'},oakes:{me:'Mr. Oakes',pet:'son',pets:'lads',his:'his',sir:'Sir'},lyle:{me:'Dr. Lyle',pet:'patient',pets:'patients',his:'his',sir:'Sir'},adam:{me:'Mr. Adam',pet:'kiddo',pets:'kids',his:'his',sir:'Sir'},kettle:{me:'Mrs. Kettle',pet:'petal',pets:'petals',his:'her',sir:'Miss'},pratt:{me:'Mr. Pratt',pet:'darling',pets:'darlings',his:'his',sir:'Sir'},pat:{me:'Pat',pet:'love',pets:'loves',his:'her',sir:'Pat'}};
const voiceOf=t=>VOICE[t]||{me:'I',pet:'kid',pets:'kids',his:'their',sir:'Sir'};
function HIS(t){return voiceOf(t).his}
function SIRMISS(t){return voiceOf(t).sir}
{const _say=say;say=function(who,text,ex){if(typeof text==='string'&&text.includes('{')){const v=voiceOf(who);text=text.replace(/\{ME\}/g,v.me).replace(/\{PETS\}/g,v.pets).replace(/\{PET\}/g,v.pet).replace(/\{HIS\}/g,v.his)}return _say(who,text,ex)}}

/* ---------- the day, everywhere (Mr. Adam included) ---------- */
dayText=function(who,t){
 if(!/Friday/.test(t)||/1987|March|Ollie/.test(t)||who==='ollie')return t;
 t=t.replace(/[Ee]very Friday is the same Friday/g,m=>(m[0]==='E'?'Every':'every')+' day is the same day').replace(/the same Friday/g,'the same day').replace(/ALWAYS Friday/g,'ALWAYS the same day');
 const d=dayName();if(d==='Friday')return t;
 return t.replace(/\bFridays\b/g,'days').replace(/\bFriday\b/g,d).replace(/\bFRIDAY\b/g,d.toUpperCase());
};
{const _dm=dms;dms=function(title,sub_,msgs,opts){if(P&&P.calStarted&&Array.isArray(msgs))msgs=msgs.map(m=>Array.isArray(m)&&typeof m[1]==='string'?[m[0],dayText(m[0],m[1]),...m.slice(2)]:m);return _dm(title,sub_,msgs,opts)}}
{const _t=toast;toast=function(t){if(P&&P.calStarted&&typeof t==='string')t=dayText('',t);return _t(t)}}
{const _sb=sub;sub=function(t,s){if(P&&P.calStarted&&typeof t==='string')t=dayText('',t);return _sb(t,s)}}

/* ---------- a clear start to the run, and to every day ---------- */
{const _di=dayIntro;dayIntro=async function(died){
 await _di(died);
 if(cal()===1&&!died&&!P.day1Told){
  P.day1Told=1;save();
  await N('On Friday, Tyler, a kid from the math class in the Trailer, didn’t come home. His mom has been posting MISSING on Facebook since Saturday.');
  await say('adam','(on the PA, too loud) Good morning, Highgate! The STATE INSPECTION is in two weeks. Friday after next. Everybody will be normal. Everybody will be PRESENT. Everybody will be ALIVE.','scared');
  await N('Your friends are going to want to talk about Tyler. They’ll find you at break, in the library.');
 }
 const s=typeof storyNow==='function'?storyNow():null;
 if(s&&!died)await card(dayName().toUpperCase()+' · WEEK '+weekOf(),'MAIN STORY: '+s.t.toUpperCase(),1800);
}};

/* ---------- what’s next ---------- */
function activeNext(){
 if(!D||!D.mp)return[];
 const out=[];
 for(const m in D.mp){const M=MIS[m];if(!M||D.done[m]||P.done[m]&&!D.mp[m])continue;const n=D.mp[m];if(n>=M.parts.length)continue;const tip=M.tips&&M.tips[n];if(tip)out.push({m,name:M.name,tip})}
 return out;
}
{const _ul=updateLoc;updateLoc=function(){_ul();const c=$('clock');if(!c||!D||D.weekend)return;const a=activeNext();if(!a.length)return;const d=document.createElement('div');d.className='story next';d.textContent='→ '+a[0].name+': '+a[0].tip+(a.length>1?'  (+'+(a.length-1)+' more in Quests)':'');c.appendChild(d)}}
/* (part() should refresh the HUD) */
{const _pt=part;part=function(mis,n,quiet){const r=_pt(mis,n,quiet);try{updateLoc()}catch(e){}return r}}
/* map: mark rooms where your next step is */
function roomHasNext(r){
 const act=new Set(activeNext().map(a=>a.m));
 const per=D.period,inP=h=>h.period===per||(Array.isArray(h.period)&&h.period.includes(per));
 const hk=HOOKS.some(h=>act.has(h.mis)&&h.room===r&&inP(h)&&(!h.cond||(()=>{try{return h.cond()}catch(e){return false}})()));
 const sp=SPOTS.some(s=>s.room===r&&(s.period==null||s.period===per||(Array.isArray(s.period)&&s.period.includes(per)))&&(!s.cond||(()=>{try{return s.cond()}catch(e){return false}})())&&(s.item||/Pick|Grab|Dig|Climb/.test(s.label||'')));
 return hk||sp;
}
{const _om=openMap;openMap=function(f){const r=_om(f);setTimeout(()=>{try{const o=$('map');if(o.hidden)return;
 const byName={};for(const k in ROOMS)byName[ROOMS[k].name.split(' —')[0]]=k,byName[ROOMS[k].name]=k;
 for(const b of o.querySelectorAll('.loc')){const t=(b.querySelector('b')||{}).textContent||'';const key=t.replace(' (lesson)','');const room=byName[key]||byName[key.split(' —')[0]];if(!room||!roomHasNext(room))continue;const e=document.createElement('em');e.style.color='#ffd27a';e.textContent='→ Your next step is here';b.appendChild(e)}}catch(e){}},0);return r}}
