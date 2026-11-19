'use strict';
/* =====================================================================
   HIGHSCHOOL — TRACKER
   • When the bell goes, people don't vanish. They run off to class.
   • Under the clock: where your next class is, always.
   • The quest log opens on TRACKER:
       – Your classes today, in order, with how to walk there.
       – Every quest you've started: what it's for, the step you're on,
         and exactly when and where the next step is (or which other
         quest it's waiting on).
       – People: where everyone in your quests is right now, and next.
   • T opens the tracker.
   ===================================================================== */

/* ---------- quest pickups that were invisible to the guidance ---------- */
{const TAG=[[/^Take the shovel from the groundskeeper/,'brett'],[/^Look at David’s laptop/,'tea'],[/^Steal Coach’s bucket of field chalk/,'farewell'],
 [/^Pick up the blue inhaler/,'inhaler'],[/^Dig the thermos out of Lost Property/,'thermos'],[/^Grab the ladle off Coach’s cart/,'ladle'],[/^Climb the goal and get Omer’s shorts/,'shorts'],
 [/^Listen to the teachers shouting in the parking lot/,'staffroom'],[/^Sneak into the staff room/,'staffroom']];
 for(const s of SPOTS){if(s.mis||!s.label)continue;for(const [re,m] of TAG)if(re.test(s.label)&&MIS[m]){s.mis=m;break}}}

/* ---------- quests whose next step lives in another quest ---------- */
const VIA={
 window:()=>typeof winStage==='function'&&winStage()>=1&&winStage()<4&&typeof winReady==='function'&&!winReady()?'brett':null,
 brett:()=>typeof winStage==='function'&&winStage()<1?'window':null
};

/* ---------- where is everyone ---------- */
function whereIs(id,per){
 if(!D)return null;
 if(D.dead[id])return{dead:1};
 if(id==='alex'&&typeof alexGone==='function'&&alexGone())return{gone:1};
 {const h=thingsAt(per).find(x=>x.who===id);if(h)return{room:h.room,quest:1}}
 const t=TEACH[per]||{};for(const r in t)if(t[r]===id||(SHER.includes(id)&&SHER.includes(t[r])))return{room:r,teaching:1};
 const R0=ROSTER[per]||{};const out=[];
 for(const r in R0)if(R0[r].some(e=>e[0]===id||(SHER.includes(id)&&SHER.includes(e[0]))))out.push(r);
 if(!out.length)return null;
 const free=out.filter(r=>!(PERIODS[per].lesson&&TEACH[per]&&TEACH[per][r]&&r!==myClassFor(per)));
 return{room:(free[0]||out[0]),all:out};
}
function whereText(id,per){
 const w=whereIs(id,per);
 if(!w)return PERIODS[per].lesson?'in class':'not around';
 if(w.dead)return'dead (back after the weekend)';
 if(w.gone)return'missing';
 return shortName(w.room)+(w.teaching?' (teaching)':'');
}

/* ---------- quests in progress and their next step ---------- */
function activeQuests(){
 if(!D)return[];
 return Object.keys(MIS).filter(m=>(D.mp[m]||0)>0&&!D.done[m]&&!['passing','robbery','lockedroom','calling'].includes(m)&&MIS[m].parts);
}
function nextStep(m){
 const per=D.period;
 for(let p=per;p<=8;p++){
  const t=thingsAt(p).find(x=>x.mis===m);
  if(t)return{p,t,now:p===per};
 }
 const via=VIA[m]&&VIA[m]();
 if(via&&MIS[via]&&!D.done[via]){for(let p=per;p<=8;p++){const t=thingsAt(p).find(x=>x.mis===via);if(t)return{p,t,via,now:p===per}}return{via}}
 return null;
}
function stepLine(m){
 const n=nextStep(m),mp=D.mp[m]||0,M=MIS[m];
 const tip=(M.tips&&M.tips[mp])||'';
 if(!n)return{when:'Not today',text:tip||'Keep living the day. It’ll come up.'};
 if(!n.t)return{when:'Waiting on '+MIS[n.via].name,text:'Do the next bit of '+MIS[n.via].name+' first. '+((MIS[n.via].tips||[])[D.mp[n.via]||0]||'')};
 const d=describe(n.t);
 return{when:(n.now?'NOW':PERIODS[n.p].name+' ('+PERIODS[n.p].time+')'),
  text:(n.via?'First: '+MIS[n.via].name+' — ':'')+(d.label?d.label+' · ':'')+(D.room===n.t.room&&n.now?'right here':d.where)+(d.who?' ('+d.who+')':''),
  route:n.now?routeText(D.room,n.t.room):'',now:n.now};
}

/* ---------- your classes ---------- */
function classesToday(){
 const out=[];
 for(let p=0;p<PERIODS.length;p++){if(!PERIODS[p].lesson)continue;const r=myClassFor(p);if(r)out.push({p,room:r,teacher:TEACH[p]&&TEACH[p][r]})}
 return out;
}
function nextClass(){
 if(!D||D.weekend)return null;
 const per=D.period;
 const list=classesToday();
 const now=list.find(c=>c.p===per);if(now)return{...now,now:1};
 return list.find(c=>c.p>per)||null;
}

/* ---------- under the clock: the class line ---------- */
{const _ul=updateLoc;updateLoc=function(){_ul();
 const c=$('clock');if(!c||!D||D.weekend||panelMode==='talk')return;
 const nc=nextClass();
 const box=document.createElement('div');box.className='story clsbox';
 if(!nc)box.textContent='📚 No more classes today.';
 else{const here=D.room===nc.room;
  box.innerHTML='📚 <b></b> <i></i>';box.querySelector('b').textContent=(nc.now?'Class now: ':'Next class: ')+shortName(nc.room);
  box.querySelector('i').textContent=nc.now?(here?'· you’re in it':'· '+routeText(D.room,nc.room)):'· '+PERIODS[nc.p].name+', '+PERIODS[nc.p].time+(here?' · here':' · '+(WORLD&&DOORS[nc.room]?shortName(DOORS[nc.room].hall):''));}
 const first=c.querySelector('.story');c.insertBefore(box,first||c.querySelector('.tapnote'));
}}
{const st=document.createElement('style');st.textContent=`#clock .clsbox{color:#bfe0ff;font-size:10px;-webkit-line-clamp:2!important}#clock .clsbox b{color:#fff;font-weight:normal}#clock .clsbox i{font-style:normal;color:#9ab8d8}
.trk h3{font-size:13px;margin:12px 0 6px;letter-spacing:.06em}.trk .row{font-size:13px;color:#f4ead8;margin:0 0 7px;line-height:1.4}.trk .sub{color:#a99aa8;font-size:12px}
.trk .now{color:#9ad09a;font-weight:bold}.trk .when{color:#ffd27a}.trk .cls{display:flex;gap:8px;align-items:baseline}.trk .cls.past{opacity:.45}.trk .cls.cur{color:#bfe0ff}
.trk .ppl{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:4px 14px}.trk .ppl div{font-size:12px;color:#f4ead8}.trk .ppl b{color:#ffd27a;font-weight:normal}`;document.head.appendChild(st)}

/* ---------- the tracker tab ---------- */
function renderTracker(body){
 const el=(t,c,txt)=>{const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e};
 const wrap=el('div','trk');body.appendChild(wrap);
 if(!D){wrap.appendChild(el('div','row','No day in progress.'));return}
 const per=D.period;
 wrap.appendChild(el('div','sub',(window.dayLabel?dayLabel():'')+' · '+PERIODS[per].name+' · '+PERIODS[per].time+' · you’re in '+(D.room?shortName(D.room):'the school')));

 /* classes */
 wrap.appendChild(el('h3','','📚 YOUR CLASSES TODAY')).style.color='#bfe0ff';
 if(D.weekend)wrap.appendChild(el('div','row','It’s the weekend. No classes.'));
 else for(const c of classesToday()){
  const r=el('div','cls row'+(c.p<per?' past':c.p===per?' cur':''));
  r.appendChild(el('span','when',PERIODS[c.p].time));
  const t=el('span','',PERIODS[c.p].name+' — '+shortName(c.room)+(c.teacher&&K[c.teacher]?' ('+K[c.teacher].n+')':''));r.appendChild(t);
  if(c.p>=per){const where=D.room===c.room?'you’re here':routeText(D.room,c.room);r.appendChild(el('span','sub',c.p===per?'· NOW · '+where:'· '+where))}
  wrap.appendChild(r);
 }

 /* main story */
 if(typeof storyNow==='function'&&!D.weekend){const s=storyNow();if(s){wrap.appendChild(el('h3','','★ MAIN STORY')).style.color='#ffd27a';
  const r=el('div','row');r.appendChild(el('b','',s.t+': '));r.appendChild(document.createTextNode(s.goal));wrap.appendChild(r);
  const n=thingsAt(per).find(t=>t.main);if(n){const d=describe(n);r.appendChild(el('div','sub','NOW: '+(d.label||'')+' · '+d.where+' · '+d.route))}}}

 /* quests */
 wrap.appendChild(el('h3','','▸ QUESTS YOU’VE STARTED')).style.color='#9ad09a';
 const act=activeQuests();
 if(!act.length)wrap.appendChild(el('div','row sub','None yet. Talk to people — anything with a ＋ under the clock starts one.'));
 const lines=act.map(m=>({m,s:stepLine(m)})).sort((a,b)=>(b.s.now?1:0)-(a.s.now?1:0));
 for(const {m,s} of lines){const M=MIS[m];
  const r=el('div','row');
  r.appendChild(el('b','',M.icon+' '+M.name));r.appendChild(el('span','sub','  step '+((D.mp[m]||0)+1)+' of '+M.parts.length));
  if(M.goal)r.appendChild(el('div','sub','Goal: '+M.goal));
  const nx=el('div','');nx.appendChild(el('span',s.now?'now':'when',s.when+': '));nx.appendChild(document.createTextNode(s.text));r.appendChild(nx);
  if(s.route)r.appendChild(el('div','sub','➜ '+s.route));
  wrap.appendChild(r);
 }
 /* things you could start */
 const fresh=thingsAt(per).filter(t=>!t.started&&!t.main&&!act.includes(t.mis)).slice(0,5);
 if(fresh.length){wrap.appendChild(el('h3','','＋ YOU COULD START')).style.color='#cbbfd8';
  for(const t of fresh){const d=describe(t);wrap.appendChild(el('div','row',d.name+' — '+(d.label?d.label+' · ':'')+(D.room===t.room?'right here':d.where)+(d.who?' ('+d.who+')':'')))}}

 /* people */
 wrap.appendChild(el('h3','','👥 WHERE PEOPLE ARE')).style.color='#f6cf8e';
 const ppl=new Set();for(const m of act)for(const id of MIS[m].who)if(K[id])ppl.add(id);
 for(const id of FRIENDS)ppl.add(id);
 const nxt=Math.min(8,per+1);
 const grid=el('div','ppl');wrap.appendChild(grid);
 for(const id of ppl){if(window.EDITION==='safe'&&id==='abby')continue;
  const d=el('div','');d.appendChild(el('b','',K[id].n+(act.some(m=>MIS[m].who.includes(id))?' ▸':'')));
  d.appendChild(document.createTextNode(': '+whereText(id,per)));
  if(nxt!==per&&!D.weekend)d.appendChild(el('span','sub',' · then '+whereText(id,nxt)));
  grid.appendChild(d);
 }
 wrap.appendChild(el('div','sub','▸ = in a quest you’ve started. “then” = where they’ll be next period.'));
}
questTab='track';
{const _oq=openQuest;openQuest=function(){
 _oq();
 const o=$('quest'),tb=o.querySelector('.tabs');if(!tb||!D)return;
 if(!tb.querySelector('[data-trk]')){const b=document.createElement('button');b.textContent='Tracker';b.dataset.trk=1;b.onclick=()=>{questTab='track';openQuest()};tb.insertBefore(b,tb.firstChild)}
 if(questTab==='track')for(const b of tb.querySelectorAll('button'))b.setAttribute('aria-pressed',String(!!b.dataset.trk));else tb.querySelector('[data-trk]').setAttribute('aria-pressed','false');
 if(questTab!=='track')return;
 const body=o.querySelector('.qbody');body.innerHTML='';renderTracker(body);
}}
document.addEventListener('keydown',e=>{if((e.key==='t'||e.key==='T')&&panelMode==='roam'&&!anyOverlay()&&!DL){e.preventDefault();questTab='track';openQuest()}});

/* ---------- the bell: everyone runs off to class ---------- */
let bellRungAt=-9;
{const _b=SFX.bell;SFX.bell=function(){if(T-bellRungAt<2.5&&T-bellRungAt>=0)return;return _b.apply(this,arguments)}}
{const _ep=endPeriod;endPeriod=async function(){
 if(TEST||!D||D.weekend||D.period>=7||ROOM!==D.room||fxState.dark>.5)return _ep();
 const teach=TEACH[D.period]||{};
 const crowd=Object.values(A).filter(a=>a.id!=='you'&&a.vis!==false&&!a.dead&&a.pose!=='lie'&&a.x>-8&&a.x<328&&!(a.k&&a.k.adult&&Object.values(teach).includes(a.id)&&!HALLS.has(ROOM)));
 if(!crowd.length)return _ep();
 busy=true;setPanel('talk');
 _bell();bellRungAt=T;
 toast('🔔 The bell. Everyone scatters.');
 const ps=[];
 crowd.forEach((a,i)=>{const off=a.x<160?-34:354;a.sit=false;a.sitHigh=false;if(a.pose&&a.pose!=='hold')a.pose=null;a.hold=a.hold&&/phone|book|paper|note|tray|bball|ball/.test(a.hold)?a.hold:null;
  const sp=(a.k&&a.k.adult)?85:100+((i*37)%40);
  ps.push(new Promise(r=>setTimeout(()=>{if(!A[a.id]){r();return}walk(a.id,off,sp).then(r)},(i%5)*90))) });
 await Promise.race([Promise.all(ps),wait(4200)]);
 for(const a of crowd)if(A[a.id]&&A[a.id]===a)a.vis=false;
 busy=false;
 return _ep();
}}
function _bell(){for(let i=0;i<10;i++){tone(1568,.09,'square',.035,0,i*.1);tone(1175,.09,'square',.03,0,i*.1+.05)}}
