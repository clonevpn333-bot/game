'use strict';
/* =====================================================================
   HIGHSCHOOL — THE QUEST LOG, REBUILT
   Tabs down the side:
     ⚡ DO NOW    everything you can do THIS period (here first), your
                 class, then a timeline of what's on later today
     🗺 TODAY     the full tracker: classes, every started quest, people
     📜 QUESTS    compact cards, sorted: in progress · can start · done
     ★ STORY · 👥 PEOPLE · 🏆 COLLECTION
   📌 Track any quest. The tracked quest is the one line under the
   clock, and an arrow in the world points at the door/edge to take.
   ===================================================================== */
const QL={sub:'coll',filter:'active',open:{}};
const _QL_OLD=openQuest;
function qlLegacy(tab){
 const keep=questTab;questTab=tab;_QL_OLD();questTab=keep;
 const body=$('quest').querySelector('.qbody');const f=document.createDocumentFragment();
 if(body){const tb=$('quest').querySelector('.tabs');if(tb)tb.remove();while(body.firstChild)f.appendChild(body.firstChild)}
 return f;
}
const qel=(t,c,txt)=>{const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e};
const QTABS=[['now','⚡','Do Now'],['track','🗺','Today'],['quests','📜','Quests'],['story','★','Story'],['bonds','👥','People'],['coll','🏆','Collection']];
if(!QTABS.some(t=>t[0]===questTab))questTab='now';

/* ---------- what's tracked ---------- */
function trackedMis(){
 if(!D)return null;const m=D.f&&D.f.track;
 if(m&&MIS[m]&&!D.done[m])return m;
 return null;
}
function setTrack(m){D.f.track=(D.f.track===m?null:m);updateLoc();toast(D.f.track?'📌 Tracking: '+MIS[m].name:'Stopped tracking.')}
function trackTarget(){
 if(!D||D.weekend)return null;
 const m=trackedMis();
 if(m){const n=typeof nextStep==='function'?nextStep(m):null;
  if(n&&n.t)return{m,t:n.t,p:n.p,now:n.now};return{m,none:1}}
 const t=thingsAt(D.period).find(x=>x.main)||thingsAt(D.period).find(x=>x.started);
 return t?{m:t.mis,t,p:D.period,now:1,auto:1}:null;
}
/* the next door/edge on the way */
function nextHop(to){
 const from=D.room;if(!to||from===to)return null;
 if(!HALLS.has(from)){return{edge:-1,label:'EXIT'}}
 const door=!HALLS.has(to)&&DOORS[to];
 if(door&&door.hall===from)return{x:door.x,label:shortName(to)};
 const th=HALLS.has(to)?to:(exitOf(to)||[null])[0];if(!th)return null;
 if(th===from&&door)return{x:door.x,label:shortName(to)};
 const path=hallPath(from,th);if(!path||path.length<2)return null;
 const nx=path[1],w=WORLD[from];
 const st=w.doors.find(d=>d.stairs&&d.to===nx);if(st)return{x:st.x,label:shortName(nx)};
 if(from==='corridor'&&nx==='bus')return{edge:-1,label:'Bus loop'};
 if(from==='bus'&&nx==='corridor')return{edge:1,label:'Main Corridor'};
 return{edge:w.L===nx?-1:1,label:shortName(nx)};
}

/* ---------- the window ---------- */
openQuest=function(){
 const o=$('quest');o.hidden=false;o.classList.add('ql2');if(openQuest._last!==questTab)QL.allNew=0;openQuest._last=questTab;
 o.innerHTML='';
 const head=qel('div','qlh');o.appendChild(head);
 head.appendChild(qel('h2','','QUEST LOG'));
 head.appendChild(qel('span','qlsub',D?((window.dayLabel?dayLabel():'Day '+D.day)+(D.weekend?'':' · '+PERIODS[D.period].name+' · '+PERIODS[D.period].time)):''));
 const x=qel('button','tb x','CLOSE ✕');x.onclick=()=>{o.hidden=true};head.appendChild(x);
 const wrap=qel('div','qlw');o.appendChild(wrap);
 const rail=qel('nav','qlr');wrap.appendChild(rail);
 for(const [id,ic,nm] of QTABS){const b=qel('button','');b.innerHTML='<i></i><span></span>';b.querySelector('i').textContent=ic;b.querySelector('span').textContent=nm;
  b.setAttribute('aria-pressed',String(id===questTab));b.onclick=()=>{questTab=id;openQuest()};rail.appendChild(b);
  if(id==='now'&&D&&!D.weekend){const n=thingsAt(D.period).length;if(n){const c=qel('b','cnt',String(n));b.appendChild(c)}}}
 const body=qel('div','qlb');wrap.appendChild(body);
 try{
  if(questTab==='now')qlNow(body);
  else if(questTab==='quests')qlQuests(body);
  else if(questTab==='coll')qlColl(body);
  else body.appendChild(qlLegacy(questTab));
 }catch(e){console.error(e);body.appendChild(qel('p','qlnote','Something went wrong drawing this tab.'))}
};

function chip(t,c){return qel('span','chip '+(c||''),t)}
function trackBtn(m){const b=qel('button','pin'+(D.f.track===m?' on':''),D.f.track===m?'📌 Tracking':'📌 Track');b.onclick=e=>{e.stopPropagation();setTrack(m);openQuest()};return b}

/* ---------- ⚡ DO NOW ---------- */
function qlNow(body){
 if(!D){body.appendChild(qel('p','qlnote','No day in progress.'));return}
 if(D.weekend){body.appendChild(qel('p','qlnote','It’s the weekend. Pick something from the weekend menu.'));return}
 const per=D.period;
 const top=qel('div','qlnowhead');body.appendChild(top);
 top.appendChild(qel('div','big',PERIODS[per].name.toUpperCase()+' · '+PERIODS[per].time));
 top.appendChild(qel('div','sub','You’re in '+(D.room?shortName(D.room):'the school')+'.'+(D.money!=null?'  $'+D.money:'')+(D.apples!=null?'  🍎'+D.apples:'')+(D.items&&D.items.length?'  · Carrying: '+D.items.map(i=>ITEMS[i]||i).join(', '):'')));
 /* class */
 if(PERIODS[per].lesson){const c=myClassFor(per);if(c){const r=qel('div','qcard cls');
  r.appendChild(qel('div','ic','📚'));const t=qel('div','m');r.appendChild(t);
  t.appendChild(qel('h4','',(D.room===c?'You’re in class: ':'Your class: ')+shortName(c)+(TEACH[per]&&TEACH[per][c]&&K[TEACH[per][c]]?' · '+K[TEACH[per][c]].n:'')));
  t.appendChild(qel('div','rt',D.room===c?'Sit down. Stuff happens in class too.':'➜ '+routeText(D.room,c)+'  (or skip it, and watch for patrols)'));
  body.appendChild(r)}}
 const now=thingsAt(per);
 const sec=(title,list,cls)=>{if(!list.length)return;body.appendChild(qel('h3','qsec '+(cls||''),title));for(const t of list)body.appendChild(nowCard(t))};
 const rank=t=>(t.mis===D.f.track?0:t.main?1:t.started?2:3);
 const sorted=now.slice().sort((a,b)=>rank(a)-rank(b)||((a.room===D.room)?0:1)-((b.room===D.room)?0:1));
 const going=sorted.filter(t=>t.main||t.started||t.mis===D.f.track),fresh=sorted.filter(t=>!(t.main||t.started||t.mis===D.f.track));
 sec('▶ KEEP GOING',going,'here');
 const showN=QL.allNew?fresh.length:3;
 sec('＋ NEW THIS PERIOD'+(fresh.length?'  ('+fresh.length+')':''),fresh.slice(0,showN));
 if(fresh.length>showN){const b=qel('button','more','Show '+(fresh.length-showN)+' more new quests ▾');b.onclick=()=>{QL.allNew=1;openQuest()};body.appendChild(b)}
 if(!now.length)body.appendChild(qel('p','qlnote','Nothing that needs you this period. Wander, talk to people, cause trouble, or skip to the bell from the map (M).'));
 /* later */
 const later=[];for(let p=per+1;p<=8;p++){const l=thingsAt(p);if(l.length)later.push([p,l])}
 if(later.length){body.appendChild(qel('h3','qsec later','🕐 LATER TODAY'));
  const tl=qel('div','qtl');body.appendChild(tl);
  for(const [p,l] of later){const r=qel('div','tlrow');r.appendChild(qel('div','tlt',PERIODS[p].time+'\n'+PERIODS[p].name));const lst=qel('div','tll');
   for(const t of l.slice(0,6)){const d=describe(t);const e=qel('div','tli');e.appendChild(qel('b','',(MIS[t.mis]?MIS[t.mis].icon+' '+d.name:'★ '+d.name)));e.appendChild(document.createTextNode(' — '+(d.label?d.label+' · ':'')+d.where+(d.who?' ('+d.who+')':'')));lst.appendChild(e)}
   if(l.length>6)lst.appendChild(qel('div','tli more','+'+(l.length-6)+' more'));
   r.appendChild(lst);tl.appendChild(r)}}
 /* another day */
 const act=activeQuests().filter(m=>!thingsAt(per).some(t=>t.mis===m)&&!later.some(([p,l])=>l.some(t=>t.mis===m)));
 if(act.length){body.appendChild(qel('h3','qsec day','📅 ANOTHER DAY'));
  for(const m of act){const M=MIS[m],r=qel('div','tli');r.appendChild(qel('b','',M.icon+' '+M.name));r.appendChild(document.createTextNode(' — '+((M.tips||[])[D.mp[m]||0]||'Comes back on another day.')));body.appendChild(r)}}
}
function nowCard(t){
 const d=describe(t),M=MIS[t.mis],r=qel('div','qcard'+(t.main?' main':t.started?' go':' new'));
 r.appendChild(qel('div','ic',M?M.icon:'★'));
 const m=qel('div','m');r.appendChild(m);
 const h=qel('h4','',d.name);h.appendChild(chip(t.main?'MAIN STORY':t.started?'IN PROGRESS':'NEW',t.main?'main':t.started?'go':'new'));if(M&&M.filthy)h.appendChild(chip('🔞 FILTHY','filthy'));m.appendChild(h);
 if(d.label)m.appendChild(qel('div','act',/^[“"]/.test(d.label)?d.label:'“'+d.label+'”'));
 m.appendChild(qel('div','wh','📍 '+(D.room===t.room?'Right here':d.where)+(d.who?' · with '+d.who:'')));
 if(D.room!==t.room)m.appendChild(qel('div','rt','➜ '+d.route));
 if(M&&!t.main)r.appendChild(trackBtn(t.mis));
 return r;
}

/* ---------- 📜 QUESTS ---------- */
function qlQuests(body){
 const all=Object.values(MIS).filter(m=>m.parts&&!['passing','robbery','lockedroom','calling'].includes(m.id)&&!(m.id||'').startsWith('wk_'));
 const st=m=>{if(D&&D.done[m.id])return'done';if(D&&(D.mp[m.id]||0)>0)return'active';if(P.done[m.id])return'done';if(D&&!D.weekend&&[0,1,2,3,4,5,6,7,8].some(p=>thingsAt(p).some(t=>t.mis===m.id)))return'open';return'later'};
 const groups={active:[],open:[],done:[],later:[]};for(const m of all)groups[st(m)].push(m);
 const bar=qel('div','qfil');body.appendChild(bar);
 groups.filthy=all.filter(m=>m.filthy);
 for(const [k,n] of[['active','In progress'],['open','Can start today'],['done','Done'],['later','Not yet'],['filthy','🔞 Filthy']]){const b=qel('button','',n+' '+groups[k].length);b.setAttribute('aria-pressed',String(QL.filter===k));b.onclick=()=>{QL.filter=k;openQuest()};bar.appendChild(b)}
 const done=Object.keys(P.done).filter(m=>MIS[m]).length;
 body.appendChild(qel('div','qlnote',done+' of '+all.length+' quests finished across all runs. Tap a quest for its steps.'));
 const list=groups[QL.filter];
 if(QL.filter==='filthy'&&typeof filthRank==='function'){const k=filthRank(),bx=qel('div','qcard');bx.style.borderLeftColor='#ff6a8a';bx.appendChild(qel('div','ic','🔞'));const mm=qel('div','m');mm.appendChild(qel('h4','','FILTH-O-METER: '+filthCount()+'/'+FILTHY.length+' · '+k[1].toUpperCase()));mm.appendChild(qel('div','act',k[2]));if(!filthyOn())mm.appendChild(qel('div','rt','Filthy quests are OFF. Turn them on in Settings.'));bx.appendChild(mm);body.appendChild(bx)}
 if(!list.length)body.appendChild(qel('p','qlnote',QL.filter==='active'?'Nothing in progress. Check ⚡ Do Now for something to start.':'Nothing here.'));
 list.sort((a,b)=>a.name.localeCompare(b.name));
 for(const M of list)body.appendChild(questRow(M,QL.filter==='filthy'?st(M):QL.filter));
}
function questRow(M,grp){
 const reached=Math.max(P.parts[M.id]||0,D?(D.mp[M.id]||0):0),isDone=grp==='done',locked=grp==='later'&&M.hidden&&!reached;
 const r=qel('div','qrow '+grp+(QL.open[M.id]?' open':''));
 const top=qel('div','qtop');r.appendChild(top);
 top.appendChild(qel('div','ic',locked?'?':M.icon));
 const mid=qel('div','m');top.appendChild(mid);
 {const h4=qel('h4','',locked?'???':M.name);if(M.filthy&&!locked)h4.appendChild(chip('🔞 FILTHY','filthy'));mid.appendChild(h4)}
 const pips=qel('div','pips');for(let i=0;i<M.parts.length;i++)pips.appendChild(qel('i',i<reached||isDone?'ok':i===reached&&grp==='active'?'cur':''));mid.appendChild(pips);
 if(!locked&&D&&!D.weekend&&grp!=='done'){
  let line='';if(grp==='active'&&typeof stepLine==='function'){const s=stepLine(M.id);line=s.when+': '+s.text}
  else{const n=typeof nextStep==='function'?nextStep(M.id):null;line=n&&n.t?(n.now?'NOW':PERIODS[n.p].name+' '+PERIODS[n.p].time)+': '+(n.t.label||'')+' · '+shortName(n.t.room):((M.tips||[])[reached]||'')}
  if(line)mid.appendChild(qel('div','nx',line))}
 if(!locked&&grp!=='done'&&D)top.appendChild(trackBtn(M.id));
 top.onclick=()=>{QL.open[M.id]=!QL.open[M.id];openQuest()};
 if(QL.open[M.id]&&!locked){
  const det=qel('div','qdet');r.appendChild(det);
  if(M.who)det.appendChild(qel('div','who','With: '+M.who.map(i=>K[i]?K[i].n:i).join(', ')));
  if(M.goal)det.appendChild(qel('div','goal','Goal: '+M.goal));
  det.appendChild(qel('p','',M.blurb||''));
  const ol=qel('ol');M.parts.forEach((p,n)=>ol.appendChild(qel('li',n<reached||isDone?'ok':n===reached?'now':'',n<=reached||isDone?p:'???')));det.appendChild(ol);
  if(M.variants){const got=Object.keys(M.variants).filter(v=>P.best[M.id+':'+v]);det.appendChild(qel('div','who','Endings seen: '+(got.map(v=>M.variants[v]).join(' · ')||'none')+' ('+got.length+'/'+Object.keys(M.variants).length+')'))}
 }
 return r;
}

/* ---------- 🏆 COLLECTION ---------- */
function qlColl(body){
 const bar=qel('div','qfil');body.appendChild(bar);
 for(const [k,n] of[['coll','Collectibles'],['deaths','Deaths'],['endings','Endings'],['archive','Archive']]){const b=qel('button','',n);b.setAttribute('aria-pressed',String(QL.sub===k));b.onclick=()=>{QL.sub=k;openQuest()};bar.appendChild(b)}
 body.appendChild(qlLegacy(QL.sub));
}

/* ---------- under the clock: one tracked line instead of a list ---------- */
{const _ul=updateLoc;updateLoc=function(){_ul();
 const c=$('clock');if(!c||!D||D.weekend||panelMode==='talk')return;
 const nb=c.querySelector('.nowbox');if(nb)nb.remove();
 const tt=trackTarget();if(!tt)return;
 const box=qel('div','story trkbox');const M=MIS[tt.m];
 box.appendChild(qel('b','',(tt.auto?'➜ ':'📌 ')+(M?M.name:'Main story')+': '));
 if(tt.none)box.appendChild(document.createTextNode('nothing today. '+(((M&&M.tips)||[])[D.mp[tt.m]||0]||'')));
 else{const d=describe(tt.t);box.appendChild(document.createTextNode((tt.now?'':PERIODS[tt.p].name+', '+PERIODS[tt.p].time+' · ')+(d.label||'')+' · '+(D.room===tt.t.room?'here':d.where)))}
 const n=thingsAt(D.period).length;if(n>1)box.appendChild(qel('i','',' (+'+(n-1)+' more: Q)'));
 c.appendChild(box);
}}
{const st=document.createElement('style');st.textContent=`
#clock .nowbox{display:none!important}
#clock .trkbox{color:#ffd27a;font-size:10px}#clock .trkbox b{color:#fff;font-weight:normal}#clock .trkbox i{color:#a99aa8;font-style:normal}
#quest.ql2{padding:max(10px,env(safe-area-inset-top)) 10px 10px;align-items:stretch}
#quest.ql2 .qlh{display:flex;align-items:baseline;gap:12px;max-width:980px;width:100%;margin:0 auto 8px}
#quest.ql2 .qlh h2{margin:0;font-size:20px;letter-spacing:.18em;color:#ffd27a}
#quest.ql2 .qlh .qlsub{color:#a99aa8;font-size:12px;flex:1}
#quest.ql2 .qlh .x{position:static}
#quest.ql2 .qlw{display:flex;gap:10px;max-width:980px;width:100%;margin:0 auto;flex:1;min-height:0}
#quest.ql2 .qlr{display:flex;flex-direction:column;gap:4px;width:150px;flex:none}
#quest.ql2 .qlr button{display:flex;align-items:center;gap:8px;text-align:left;background:#171322;border:1px solid #2c2540;color:#cbbfd8;font:inherit;font-size:13px;padding:9px 10px;border-radius:6px;cursor:pointer;position:relative}
#quest.ql2 .qlr button i{font-style:normal;width:18px;text-align:center}
#quest.ql2 .qlr button[aria-pressed=true]{background:#2a2040;border-color:#ffd27a;color:#fff}
#quest.ql2 .qlr .cnt{position:absolute;right:8px;background:#e04040;color:#fff;font-size:10px;border-radius:8px;padding:1px 6px;font-weight:normal}
#quest.ql2 .qlb{flex:1;min-width:0;overflow:auto;background:#120f1c;border:1px solid #2c2540;border-radius:8px;padding:12px 14px}
#quest.ql2 .qlnote{color:#a99aa8;font-size:12px;margin:4px 0 10px}
#quest.ql2 .qlnowhead .big{font-size:17px;color:#fff;letter-spacing:.1em}#quest.ql2 .qlnowhead .sub{color:#a99aa8;font-size:12px;margin:2px 0 10px}
#quest.ql2 .qsec{font-size:12px;letter-spacing:.14em;margin:14px 0 6px;color:#9ad09a}#quest.ql2 .qsec.here{color:#ffd27a}#quest.ql2 .qsec.later{color:#bfe0ff}#quest.ql2 .qsec.day{color:#a99aa8}
#quest.ql2 .qcard{display:flex;gap:10px;align-items:flex-start;background:#1b1628;border:1px solid #2c2540;border-left:3px solid #9ad09a;border-radius:6px;padding:9px 10px;margin:0 0 6px}
#quest.ql2 .qcard.main{border-left-color:#ffd27a}#quest.ql2 .qcard.new{border-left-color:#8a7aa8}#quest.ql2 .qcard.cls{border-left-color:#6aa8e0;background:#151a28}
#quest.ql2 .ic{font-size:20px;width:26px;text-align:center;flex:none}
#quest.ql2 .m{flex:1;min-width:0}
#quest.ql2 h4{margin:0 0 3px;font-size:14px;color:#fff;font-weight:normal;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#quest.ql2 .chip{font-size:9px;letter-spacing:.12em;padding:2px 6px;border-radius:3px;background:#2c2540;color:#cbbfd8}#quest.ql2 .chip.main{background:#5a4510;color:#ffd27a}#quest.ql2 .chip.go{background:#1e3a24;color:#9ad09a}
#quest.ql2 .act{color:#f4ead8;font-size:13px}#quest.ql2 .wh{color:#ffd27a;font-size:12px;margin-top:2px}#quest.ql2 .rt{color:#9ab8d8;font-size:11px;margin-top:2px}
#quest.ql2 .pin{flex:none;background:#221c33;border:1px solid #3a3150;color:#cbbfd8;font:inherit;font-size:11px;padding:5px 8px;border-radius:5px;cursor:pointer}#quest.ql2 .pin.on{background:#5a4510;border-color:#ffd27a;color:#fff}
#quest.ql2 .qtl .tlrow{display:flex;gap:12px;border-left:2px solid #3a3150;padding:0 0 8px 10px;margin-left:4px}
#quest.ql2 .tlt{white-space:pre;color:#bfe0ff;font-size:11px;width:90px;flex:none}
#quest.ql2 .tli{font-size:12px;color:#cbbfd8;margin:0 0 3px}#quest.ql2 .tli b{color:#fff;font-weight:normal}#quest.ql2 .tli.more{color:#a99aa8}
#quest.ql2 button.more{background:none;border:1px dashed #3a3150;color:#cbbfd8;font:inherit;font-size:12px;padding:7px;width:100%;border-radius:6px;cursor:pointer;margin:0 0 6px}
#quest.ql2 .qfil{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px}
#quest.ql2 .qfil button{background:#171322;border:1px solid #2c2540;color:#cbbfd8;font:inherit;font-size:12px;padding:6px 10px;border-radius:14px;cursor:pointer}#quest.ql2 .qfil button[aria-pressed=true]{background:#2a2040;border-color:#ffd27a;color:#fff}
#quest.ql2 .qrow{background:#1b1628;border:1px solid #2c2540;border-radius:6px;margin:0 0 5px}#quest.ql2 .qrow.done{opacity:.7}#quest.ql2 .qrow.later{opacity:.55}
#quest.ql2 .qtop{display:flex;gap:10px;align-items:center;padding:8px 10px;cursor:pointer}
#quest.ql2 .pips{display:flex;gap:3px;margin:2px 0}#quest.ql2 .pips i{width:14px;height:5px;background:#2c2540;border-radius:2px}#quest.ql2 .pips i.ok{background:#9ad09a}#quest.ql2 .pips i.cur{background:#ffd27a}
#quest.ql2 .nx{font-size:11px;color:#9ab8d8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#quest.ql2 .qdet{padding:0 12px 10px 46px;font-size:12px;color:#cbbfd8}#quest.ql2 .qdet p{margin:6px 0;color:#f4ead8;font-size:13px}#quest.ql2 .qdet .who{color:#a99aa8}#quest.ql2 .qdet .goal{color:#ffd27a}
#quest.ql2 .qdet ol{margin:4px 0;padding-left:18px}#quest.ql2 .qdet li.ok{color:#9ad09a}#quest.ql2 .qdet li.now{color:#ffd27a}
@media (max-width:640px){#quest.ql2 .qlw{flex-direction:column}#quest.ql2 .qlr{flex-direction:row;width:auto;overflow-x:auto}#quest.ql2 .qlr button span{display:none}#quest.ql2 .qlr .cnt{position:static}}
`;document.head.appendChild(st)}

/* ---------- in the world: an arrow to the tracked step ---------- */
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{_do&&_do(...x);
 if(!D||D.weekend||panelMode!=='roam'||busy||!A.you||ROOM!==D.room)return;
 if(typeof CAM!=='undefined'&&CAM.z>1.01)return;
 const tt=trackTarget();if(!tt||tt.none||!tt.now||!tt.t)return;
 const bob=Math.sin(T*5)>0?1:0,col='#ffd27a';
 if(tt.t.room===D.room){const a=tt.t.who&&A[tt.t.who];if(a&&a.vis){const y=a.y-50-bob;R(a.x-1,y,3,5,col);R(a.x-3,y+3,7,1,col);R(a.x-2,y+4,5,1,col);R(a.x,y+5,1,1,col)}return}
 const h=nextHop(tt.t.room);if(!h)return;
 if(h.x!=null){const x=h.x,y=34+bob;R(x-4,y,9,2,col);R(x-3,y+2,7,2,col);R(x-2,y+4,5,2,col);R(x-1,y+6,3,2,col);
  const t='📌 '+h.label;const w=pxw(h.label)+6;R(x-w/2,y-11,w,9,'#141120');pxc(h.label,x,y-9,col);return}
 const lx=h.edge<0?6:W-6,y=118;
 for(let i=0;i<5;i++){const xx=lx+(h.edge<0?i:-i)+(h.edge<0?-bob:bob);R(xx,y-i,1,i*2+1,col)}
 const w=pxw(h.label)+6,bx=h.edge<0?12:W-12-w;R(bx,y-5,w,9,'#141120');pxc(h.label,bx+w/2,y-3,col);
}}

/* ---------- less noise: at most 2 brand-new quest "!" per room ---------- */
let _SM={k:'',set:null};
function showMark(id){
 const k=D.room+'|'+D.period+'|'+Object.keys(D.mp).length+'|'+Object.keys(D.done).length+'|'+(D.f.track||'');
 if(_SM.k!==k){_SM.k=k;const s=new Set(),fresh=[];
  for(const a in A){if(a==='you')continue;let hs;try{hs=availableHooks(D.room,a)}catch(e){continue}if(!hs.length)continue;
   if(hs.some(h=>!h.mis||(D.mp[h.mis]||0)>0||h.mis===D.f.track||/^crew/.test(h.mis)))s.add(a);else fresh.push(a)}
  fresh.slice(0,2).forEach(a=>s.add(a));_SM.set=s}
 return _SM.set.has(id);
}
