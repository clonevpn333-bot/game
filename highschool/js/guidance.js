'use strict';
/* =====================================================================
   HIGHSCHOOL — WHAT TO DO, WHERE, AND WHEN
   • Under the clock: up to three things you can do RIGHT NOW, with the
     room, the person and how to walk there.
   • Each period starts with a heads-up of what’s going on.
   • The quest log has a “Right Now” tab and a “Later Today” list.
   • The floor plan (M) lists what’s happening, room by room.
   • More apples: you get to do more each period.
   ===================================================================== */
Object.assign(APPLES,{0:3,1:3,2:4,3:3,4:5,5:3,6:3,7:2,8:4});

const SPAWNED=new Set(['toby','kim','stellamom','darren','brett','cop','pauljones','hasanmom','nivdad','ruth','fenwick']);
function hookPresent(h,per){
 if(h.who==='auto')return true;
 if(SPAWNED.has(h.who))return true;
 if(D.dead[h.who])return false;
 if(h.who==='alex'&&typeof alexGone==='function'&&alexGone())return false;
 const t=TEACH[per]&&TEACH[per][h.room];if(t===h.who)return true;
 return rosterFor(per,h.room).some(e=>e[0]===h.who||(SHER&&SHER.includes(e[0])&&SHER.includes(h.who)));
}
function thingsAt(per,opts){
 opts=opts||{};const out=[],seen=new Set(),ok=o=>{try{return !o.cond||o.cond()}catch(e){return false}};
 const inP=x=>x==null?true:(Array.isArray(x)?x.includes(per):x===per);
 const keep=m=>MIS[m]&&!['passing','robbery','lockedroom'].includes(m)&&!D.done[m]&&!(MIS[m].id||'').startsWith('wk_');
 for(const h of HOOKS){
  if(!keep(h.mis)||!inP(h.period))continue;
  if(h.day&&h.day!==(D.dayType||'odd'))continue;
  if(!ok(h)||!hookPresent(h,per))continue;
  if(h.who==='auto'&&TEACH[per]&&TEACH[per][h.room]&&h.room!==myClassFor(per)&&!((D.mp[h.mis]||0)>0))continue;
  const k=h.mis+'|'+h.room;if(seen.has(k))continue;seen.add(k);
  out.push({mis:h.mis,room:h.room,who:h.who,label:h.label,started:!!D.mp[h.mis],main:h.mis.startsWith('crew')});
 }
 for(const s of SPOTS){
  if(!s.mis||!keep(s.mis)||!inP(s.period)||!ok(s))continue;
  const k=s.mis+'|'+s.room;if(seen.has(k))continue;seen.add(k);
  out.push({mis:s.mis,room:s.room,label:s.label,started:!!D.mp[s.mis],spot:1,main:false});
 }
 /* the main story’s own objectives are spots without a mission tag */
 for(const s of SPOTS){if(s.mis||!inP(s.period)||/^Go through|^Try locker|coin|vending/i.test(s.label||'')||!ok(s))continue;if(/Ms\. Sherman’s desk|back fridge|lock on Ms\. Sherman|phones in Ms\. Sherman|old hatch|Mr\. Adam’s office|locker 214/.test(s.label||'')){const k='crew|'+s.room+s.label;if(seen.has(k))continue;seen.add(k);out.push({mis:'crew',room:s.room,label:s.label,started:true,main:true,spot:1})}}
 const MALL=['foodcourt','arcade','carpark'];
 const fine=out.filter(t=>per===8?MALL.includes(t.room):per===7?t.room==='bus':!MALL.includes(t.room));
 fine.sort((a,b)=>(b.main-a.main)||(b.started-a.started));
 return fine;
}
function myClassFor(per){try{const t=(D&&D.dayType)||'odd';return MYCLASS[t][per]}catch(e){return null}}
function describe(t){
 const who=t.who&&t.who!=='auto'&&K[t.who]?K[t.who].n:null;
 const where=shortName(t.room);
 return{name:MIS[t.mis]?MIS[t.mis].name:'Main story',where,who,label:t.label||'',route:routeText(D.room,t.room)};
}

/* under the clock */
{const _ul=updateLoc;updateLoc=function(){_ul();
 const c=$('clock');if(!c||!D||D.weekend||panelMode==='talk')return;
 const now=thingsAt(D.period).slice(0,3);
 if(!now.length)return;
 const box=document.createElement('div');box.className='story nowbox';
 box.innerHTML='<b>RIGHT NOW</b>'+now.map(t=>{const d=describe(t);return '<div>'+(t.main?'★ ':t.started?'▸ ':'＋ ')+'<u></u> — <i></i></div>'}).join('');
 [...box.querySelectorAll('div')].forEach((el,i)=>{const d=describe(now[i]);el.querySelector('u').textContent=d.name;el.querySelector('i').textContent=(D.room===now[i].room?'here':d.where)+(d.who?' ('+d.who+')':'')});
 c.appendChild(box);
}}
{const st=document.createElement('style');st.textContent=`#clock .nowbox{margin-top:3px;font-size:10px;line-height:1.35;color:#d8f0c8}#clock .nowbox b{color:#9ad09a;letter-spacing:.06em}#clock .nowbox u{text-decoration:none;color:#fff}#clock .nowbox i{font-style:normal;color:#ffd27a}
@media (max-width:700px){#clock .nowbox{font-size:9px}#clock .nowbox div:nth-child(n+3){display:none}}`;document.head.appendChild(st)}

/* the start of every period: a heads-up */
ON_PERIOD.push(async(i,resume)=>{
 if(resume||!D||D.weekend||TEST)return;
 const now=thingsAt(i);const cls=PERIODS[i].lesson?myClassFor(i):null;
 const parts=[];
 if(cls)parts.push('Class: '+shortName(cls));
 if(now.length)parts.push(now.length+' thing'+(now.length>1?'s':'')+' going on — '+now.slice(0,2).map(t=>describe(t).name+' ('+describe(t).where+')').join(', '));
 if(parts.length)setTimeout(()=>toast(parts.join(' · ')+(now.length>2?' · M for the rest':'')),1700);
});

/* the floor plan lists it */
{const _op=openPlan;openPlan=function(){
 _op();
 const o=$('map'),box=o.querySelector('.box');if(!box)return;
 const now=thingsAt(D.period);
 const div=document.createElement('div');div.style.cssText='margin:8px 0 0;border-top:1px solid #3a3248;padding-top:8px';
 div.innerHTML='<div class="plan-t">Happening right now</div>'+(now.length?'':'<p style="color:#a99aa8;font-size:12px;margin:0">Nothing big right now. Talk to people. Wait for the bell.</p>');
 for(const t of now.slice(0,8)){const d=describe(t);const p=document.createElement('p');p.style.cssText='margin:0 0 5px;font-size:12px;color:#f4ead8';p.innerHTML='<b style="color:#ffd27a"></b> — <span></span><br><small style="color:#a99aa8"></small>';p.querySelector('b').textContent=(t.main?'★ ':'')+d.name;p.querySelector('span').textContent=(d.label?d.label+' · ':'')+d.where+(d.who?' ('+d.who+')':'');p.querySelector('small').textContent=d.route;div.appendChild(p)}
 box.appendChild(div);
}}

/* the quest log: Right Now + Later Today */
{const _oq=openQuest;openQuest=function(){
 _oq();
 const o=$('quest'),tb=o.querySelector('.tabs');if(!tb||!D)return;
 if(!tb.querySelector('[data-now]')){const b=document.createElement('button');b.textContent='Right now';b.dataset.now=1;b.setAttribute('aria-pressed',String(questTab==='now'));b.onclick=()=>{questTab='now';openQuest()};tb.insertBefore(b,tb.firstChild)}
 if(questTab!=='now')return;
 for(const b of tb.querySelectorAll('button'))b.setAttribute('aria-pressed',String(!!b.dataset.now));
 const body=o.querySelector('.qbody');body.innerHTML='';
 const el=(t,c,txt)=>{const e=document.createElement(t);if(c)e.style.cssText=c;if(txt!=null)e.textContent=txt;return e};
 const per=D.period;
 body.appendChild(el('p','color:#a99aa8;font-size:13px;margin:0 0 8px',PERIODS[per].name+' · '+PERIODS[per].time+' · you’re in '+(D.room?shortName(D.room):'the school')+(PERIODS[per].lesson?' · your class: '+shortName(myClassFor(per)||''):'')));
 const now=thingsAt(per);
 body.appendChild(el('h3','color:#9ad09a;font-size:13px;margin:6px 0','Right now'));
 if(!now.length)body.appendChild(el('div','font-size:13px;color:#6a5a6a','Nothing right now.'));
 for(const t of now){const d=describe(t);const r=el('div','font-size:13px;color:#f4ead8;margin:0 0 6px');r.appendChild(el('b','color:#ffd27a',(t.main?'★ ':'')+d.name));r.appendChild(document.createTextNode(' — '+(d.label||'')+' · '+d.where+(d.who?' ('+d.who+')':'')));r.appendChild(el('div','color:#a99aa8;font-size:12px',(MIS[t.mis]&&MIS[t.mis].goal?'Goal: '+MIS[t.mis].goal+' · ':'')+d.route));body.appendChild(r)}
 body.appendChild(el('h3','color:#cbbfd8;font-size:13px;margin:10px 0 6px','Later today'));
 let any=0;
 for(let p=per+1;p<=8;p++){const list=thingsAt(p).filter(t=>t.started||t.main);if(!list.length)continue;any=1;body.appendChild(el('div','font-size:13px;color:#f4ead8;margin:0 0 4px',PERIODS[p].name+': '+list.slice(0,4).map(t=>describe(t).name+' ('+describe(t).where+')').join(' · ')))}
 if(!any)body.appendChild(el('div','font-size:13px;color:#6a5a6a','Nothing else lined up today.'));
}}
