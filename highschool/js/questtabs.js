'use strict';
/* =====================================================================
   HIGHSCHOOL — MAIN QUESTS vs SIDE & GIGS
   The quest log splits in two:
   • 📜 MAIN QUESTS: a curated set of big quests, each its own little
     game, grouped by what they're about. Only these (plus rescues and
     class secrets) put up "!" marks, walk up to you, or show as NEW in
     ⚡ Do Now.
   • 🎲 SIDE & GIGS: everything shorter: side quests (incl. 🔞 filthy),
     today's side hustles and daily challenges. Playable, never nagging.
   ===================================================================== */
/* REMASTERED: 14 main quests. Several old quests merge into one arc (they play as its chapters). */
const ARCS=[
 ['★ THE STORY','Tyler is missing. Inspection Day is coming.',[
  ['story','The Crew','★',['crew','crew_locker','crew_dark','crew_record','oldbat','upthere']]]],
 ['💀 THE TEACHERS','1987. The boiler. Ms. Sherman. Everything else is a symptom.',[
  ['miss','The Other Miss','🪞',['dopple']],['c87','Class of ’87','👻',['register']],['kim','Mr. Kim','🤡',['kim']],
  ['head','Head Case','💣',['headcase']],['fridge','The Back Fridge','🧪',['voss']]]],
 ['♥ LOVE','The couples. In the full game, they’re the story too.',[
  ['wseat','The Window Seat','🐦',['corey','window','brett','smallhours','mended']],
  ['ldist','Long Distance','⚾',['instella','striketwo','firstfight','toby','farewell','steal_stella']],
  ['steps','Eleven Steps','🥽',['hasanmia','darren','stepeleven','steptwelve']]]],
 ['🎮 BIG GAMES','Whodunit. Catfish. Heist.',[
  ['tea','@highgate.tea','☕',['tea']],['jess','Jess from Fair City','📱',['catfish']],['score','The Big Score','💎',['opps','bigscore']]]],
 ['👥 YOUR PEOPLE','The ones nobody else looks out for.',[
  ['paul','The Other Paul','🎒',['pauljones']],['giant','Giant','🧸',['jacob','jacobken','giant']]]]];
const arcMis=a=>a[3].filter(m=>MIS[m]&&MIS[m].parts);
const MAINQ=new Set(ARCS.flatMap(g=>g[2].flatMap(a=>a[3])));
const MAIN_GROUPS=ARCS.map(g=>[g[0],g[1],g[2].flatMap(a=>a[3])]);
const isMainQ=m=>MAINQ.has(m)||/^crew/.test(m);
/* focus follows the main list */
if(typeof FEATURED!=='undefined'){FEATURED.clear();for(const m of MAINQ)FEATURED.add(m)}
if(typeof HEADLINERS!=='undefined'){for(let i=HEADLINERS.length-1;i>=0;i--)if(!isMainQ(HEADLINERS[i]))HEADLINERS.splice(i,1)}
/* gigs and challenges are on by default now: they live in their own tab, not in your face */
{const _g=gigsToday;gigsToday=function(){if(P&&P.set&&P.set.gigs==null)P.set.gigs=true;return _g.apply(this,arguments)}}

/* tabs */
{const i=QTABS.findIndex(t=>t[0]==='quests');if(i>=0){QTABS[i]=['quests','📜','Main Quests'];QTABS.splice(i+1,0,['side','🎲','Side & Gigs'])}}
QL.sfilter=QL.sfilter||'open';
const qlState=m=>{if(D&&D.done[m.id])return'done';if(D&&(D.mp[m.id]||0)>0)return'active';if(D&&!D.weekend&&[0,1,2,3,4,5,6,7,8].some(p=>thingsAt(p).some(t=>t.mis===m.id)))return'open';return'later'};
const listable=m=>m&&m.parts&&!['passing','robbery','lockedroom','gigs'].includes(m.id)&&!(m.id||'').startsWith('wk_')&&!(m.id||'').startsWith('cq_')&&!(m.id||'').startsWith('ret_');
function qlFilterBar(body,list,key,extra){
 const groups={active:[],open:[],done:[],later:[]};for(const m of list)groups[qlState(m)].push(m);
 if(extra)Object.assign(groups,extra(list));
 const bar=qel('div','qfil');body.appendChild(bar);
 const names=[['active','In progress'],['open','Can start today'],['done','Done'],['later','Not yet']].concat(extra?Object.keys(extra(list)).map(k=>[k,k==='filthy'?'🔞 Filthy':k]):[]);
 for(const [k,n] of names){const b=qel('button','',n+' '+groups[k].length);b.setAttribute('aria-pressed',String(QL[key]===k));b.onclick=()=>{QL[key]=k;openQuest()};bar.appendChild(b)}
 return groups}

/* 📜 MAIN QUESTS: 14 arcs */
const arcState=a=>{const ms=arcMis(a).map(m=>MIS[m]);if(!ms.length)return null;const st=ms.map(qlState);
 if(st[st.length-1]==='done'||st.every(x=>x==='done'))return'done';if(st.includes('active')||st.includes('done'))return'active';if(st.includes('open'))return'open';return'later'};
function arcRow(a,grp){
 const ms=arcMis(a).map(m=>MIS[m]);if(ms.length===1)return questRow(ms[0],grp);
 const cur=ms.find(M=>qlState(M)==='active')||ms.find(M=>qlState(M)==='open')||ms.find(M=>qlState(M)!=='done')||ms[ms.length-1];
 const total=ms.reduce((n,M)=>n+M.parts.length,0);let got=0;for(const M of ms){const r=D?(D.mp[M.id]||0):0;got+=qlState(M)==='done'?M.parts.length:Math.min(r,M.parts.length)}
 const r=qel('div','qrow arc '+grp+(QL.open['arc_'+a[0]]?' open':''));const top=qel('div','qtop');r.appendChild(top);
 top.appendChild(qel('div','ic',a[2]));const mid=qel('div','m');top.appendChild(mid);
 const h4=qel('h4','',a[1]);h4.appendChild(chip(ms.length+' chapters',''));mid.appendChild(h4);
 const pips=qel('div','pips');for(let i=0;i<total;i++)pips.appendChild(qel('i',i<got?'ok':i===got&&grp==='active'?'cur':''));mid.appendChild(pips);
 if(D&&!D.weekend&&grp!=='done'){let line='';const st=qlState(cur);
  if(st==='active'&&typeof stepLine==='function'){const s=stepLine(cur.id);line=cur.name+' · '+s.when+': '+s.text}
  else{const n=typeof nextStep==='function'?nextStep(cur.id):null;line=cur.name+' · '+(n&&n.t?(n.now?'NOW':PERIODS[n.p].name+' '+PERIODS[n.p].time)+': '+(n.t.label||'')+' · '+shortName(n.t.room):((cur.tips||[])[D.mp[cur.id]||0]||'Comes later.'))}
  mid.appendChild(qel('div','nx',line));top.appendChild(trackBtn(cur.id))}
 top.onclick=()=>{QL.open['arc_'+a[0]]=!QL.open['arc_'+a[0]];openQuest()};
 if(QL.open['arc_'+a[0]]){const det=qel('div','qdet arcs');r.appendChild(det);for(const M of ms)det.appendChild(questRow(M,qlState(M)))}
 return r}
qlQuests=function(body){
 const arcs=ARCS.flatMap(g=>g[2]).filter(a=>arcMis(a).length);
 body.appendChild(qel('div','qlnote','The '+arcs.length+' main quests. Every one is its own kind of game, and every one ends up in the File on Inspection Day.'));
 const groups={active:[],open:[],done:[],later:[]};for(const a of arcs)groups[arcState(a)].push(a);
 const bar=qel('div','qfil');body.appendChild(bar);
 for(const [k,n] of[['active','In progress'],['open','Can start today'],['done','Done'],['later','Not yet']]){const b=qel('button','',n+' '+groups[k].length);b.setAttribute('aria-pressed',String(QL.filter===k));b.onclick=()=>{QL.filter=k;openQuest()};bar.appendChild(b)}
 if(!groups[QL.filter])QL.filter='open';
 const pick=new Set(groups[QL.filter]);let shown=0;
 for(const [title,sub,list] of ARCS){const as=list.filter(a=>pick.has(a));if(!as.length)continue;
  const h=qel('h3','qsec mg',title);h.appendChild(qel('small','',' '+sub));body.appendChild(h);
  for(const a of as){body.appendChild(arcRow(a,QL.filter));shown++}}
 if(!shown)body.appendChild(qel('p','qlnote',QL.filter==='active'?'Nothing in progress. Check “Can start today”.':QL.filter==='open'?'Nothing new to start today. Check “In progress” or come back tomorrow.':'Nothing here.'));
 body.appendChild(qel('div','qlnote',arcs.filter(a=>arcMis(a).every(m=>P.done[m])||P.done[arcMis(a).slice(-1)[0]]).length+' of '+arcs.length+' main quests finished across all runs.'));
};
{const st=document.createElement('style');st.textContent='#quest.ql2 .qdet.arcs{padding-left:14px;border-left:2px solid #3a3450;margin:6px 0 4px 18px}#quest.ql2 .qdet.arcs .qrow{margin:4px 0}';document.head.appendChild(st)}

/* 🎲 SIDE & GIGS */
function qlSide(body){P.set=P.set||{};const fo=P.set.focus;P.set.focus=false;try{qlSide2(body)}finally{P.set.focus=fo}}
function qlSide2(body){
 body.appendChild(qel('div','qlnote','Short stuff for when you’ve got a free minute. None of it nags you. Some of it is filthy.'));
 if(D&&!D.weekend){
  const ch=challToday();
  if(ch.length){const box=qel('div','qcard');box.style.borderLeftColor='#ffd27a';box.appendChild(qel('div','ic','🏆'));const m=qel('div','m');box.appendChild(m);
   m.appendChild(qel('h4','','TODAY’S CHALLENGES  ·  $5 + 🍎 each, $10 for all three'));
   for(const c of ch)m.appendChild(qel('div','act',(c.done?'✔ ':'▢ ')+c.t+'  ('+Math.min(c.c,c.n)+'/'+c.n+')'));body.appendChild(box)}
  const gl=gigsToday();
  if(gl.length){body.appendChild(qel('h3','qsec gig','💸 SIDE HUSTLES · $'+(D.money||0)));
   for(const g of gl){const r=qel('div','qcard gig'+(g.st==='paid'?' paid':''));r.appendChild(qel('div','ic',{deliver:'📦',shove:'✋',fight:'👊',plant:'🐟'}[g.kind]||'💸'));
    const m=qel('div','m');r.appendChild(m);const h=qel('h4','',g.st==='paid'?'Done':gigLabel(g));h.appendChild(chip('$'+g.pay,'go'));m.appendChild(h);
    m.appendChild(qel('div','act',g.text));
    if(g.st!=='paid'){const where=g.st==='get'?g.from:g.kind==='plant'?g.to:g.room;
     m.appendChild(qel('div','wh','📍 '+(D.room===where?'Right here':shortName(where))+(g.st==='get'||g.kind==='plant'?'':' · '+g.per.map(p=>PERIODS[p].name).join(' or '))));
     if(D.room!==where)m.appendChild(qel('div','rt','➜ '+routeText(D.room,where)))}
    body.appendChild(r)}}}
 body.appendChild(qel('h3','qsec','🎲 SIDE QUESTS'));
 const all=Object.values(MIS).filter(m=>listable(m)&&!isMainQ(m.id));
 const groups=qlFilterBar(body,all,'sfilter',l=>({filthy:l.filter(m=>m.filthy)}));
 const list=groups[QL.sfilter]||[];list.sort((a,b)=>a.name.localeCompare(b.name));
 if(QL.sfilter==='open'&&D&&!D.weekend){/* say where, since side quests never walk up to you */
  for(const M of list){const r=questRow(M,'open');const n=typeof nextStep==='function'?nextStep(M.id):null;if(n&&n.t){const nx=r.querySelector('.nx');if(!nx){const mid=r.querySelector('.m');mid&&mid.appendChild(qel('div','nx',(n.now?'NOW':PERIODS[n.p].name)+' · '+shortName(n.t.room)))}}body.appendChild(r)}}
 else for(const M of list)body.appendChild(questRow(M,QL.sfilter==='filthy'?qlState(M):QL.sfilter));
 if(!list.length)body.appendChild(qel('p','qlnote','Nothing here.'));
}

/* the window: same as before, plus the side tab */
openQuest=function(){
 let pre=null;if(!['now','quests','side','coll'].includes(questTab)){try{pre=qlLegacy(questTab)}catch(e){console.error(e)}}
 else if(questTab==='coll'){try{pre=qlLegacy(QL.sub)}catch(e){console.error(e)}}
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
  if(id==='now'&&D&&!D.weekend){const n=thingsAt(D.period).length;if(n)b.appendChild(qel('b','cnt',String(n)))}
  if(id==='side'&&D&&!D.weekend){const n=gigsToday().filter(g=>g.st!=='paid').length;if(n)b.appendChild(qel('b','cnt gigc',String(n)))}}
 const body=qel('div','qlb');wrap.appendChild(body);
 try{
  if(questTab==='now')qlNow(body);
  else if(questTab==='quests')qlQuests(body);
  else if(questTab==='side')qlSide(body);
  else if(questTab==='coll')qlColl(body,pre);
  else if(pre)body.appendChild(pre);
 }catch(e){console.error(e);body.appendChild(qel('p','qlnote','Something went wrong drawing this tab.'))}
};

/* ⚡ Do Now: gigs and challenges move out; one line points at them */
{const _qn=qlNow;qlNow=function(body){_qn(body);
 body.querySelectorAll('.qsec.gig,.qcard.gig').forEach(e=>e.remove());
 body.querySelectorAll('.qcard').forEach(e=>{const h=e.querySelector('h4');if(h&&/^TODAY’S CHALLENGES/.test(h.textContent))e.remove()});
 if(!D||D.weekend)return;
 const g=gigsToday().filter(x=>x.st!=='paid').length,c=challToday().filter(x=>!x.done).length;if(!g&&!c)return;
 const r=qel('button','qside','🎲 '+[g?g+' side hustle'+(g>1?'s':''):'',c?c+' challenge'+(c>1?'s':''):''].filter(Boolean).join(' · ')+'  →  Side & Gigs');
 r.onclick=()=>{questTab='side';openQuest()};
 const anchor=body.querySelector('.qsec.later')||body.querySelector('.qsec.day');anchor?body.insertBefore(r,anchor):body.appendChild(r)}}
{const st=document.createElement('style');st.textContent=`
#quest.ql2 .qsec.mg small{font-size:.7em;opacity:.6;letter-spacing:0;text-transform:none;margin-left:6px}
#quest.ql2 .qside{display:block;width:100%;text-align:left;margin:10px 0;padding:8px 12px;background:#1a2a1e;border:1px solid #3a6a4a;color:#9ad09a;font:inherit;cursor:pointer}
#quest.ql2 .qside:hover{background:#22382a}
#quest.ql2 .cnt.gigc{background:#2a6a3a}`;document.head.appendChild(st)}
