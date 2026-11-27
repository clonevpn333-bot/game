'use strict';
/* =====================================================================
   HIGHSCHOOL — THINGS CARRY OVER
   • Quest progress, items, money and finished quests carry from day to
     day. A quest picks up where you left it. It never starts over.
   • Deaths last for the rest of the week. Everyone is back after the
     weekend.
   • Die, and the day starts again exactly as it began.
   • Later quest steps at break are also open at lunch (and the other way
     round), so you don’t miss them.
   • In the morning, everyone gets off the bus and walks in. At home time,
     everyone walks to the bus.
   ===================================================================== */
const DAILY_F=['winToday','lockdownDone','vapers','vapeDone','passing','skipped','aidanSaid','darkTried','seatPick','late','thirdWheel','darShake','win4','infected','choir','arjR','inh1x','delPass','ictSpark','pitchCoach','talOrder'];
let CARRY=null;
const clone=o=>JSON.parse(JSON.stringify(o));
{const _fd=freshD;freshD=function(){
 const d=_fd();
 if(!CARRY){P.dayStart=clone(d);return d}
 const c=CARRY;CARRY=null;
 if(c.replay){const r=clone(c.state);r.day=d.day;P.dayStart=clone(r);return r}
 Object.assign(d.f,c.f);d.items=c.items.slice();d.done=Object.assign({},c.done);d.mp=Object.assign({},c.mp);d.money=c.money;d.dead=Object.assign({},c.dead);
 P.dayStart=clone(d);return d;
}}
function carryFrom(prev,died){
 if(died&&P.dayStart)return{replay:1,state:P.dayStart};
 if(!prev||!prev.f)return null;
 const f={};for(const k in prev.f)if(!DAILY_F.includes(k))f[k]=prev.f[k];
 const next=(P.cal||1)+1,weekend=isWeekend(next)&&!isWeekend(P.cal||1);
 return{f,items:(prev.items||[]).filter(i=>i!=='vape'),done:prev.done||{},mp:prev.mp||{},money:Math.max(prev.money||0,3),dead:weekend?{}:Object.assign({},prev.dead||{})};
}
{const _nd=newDay;newDay=async function(died){
 const prev=D;
 if(P.calStarted&&prev&&prev.f&&!(P.cal>=14&&!died))CARRY=carryFrom(prev,died);
 if(isWeekend((P.cal||1)+1)&&!died&&prev&&prev.dead&&Object.keys(prev.dead).length)P.backAfterWeekend=Object.keys(prev.dead).filter(k=>K[k]&&!K[k].adult);
 return _nd(died);
}}
/* a fresh start clears it all */
{const _t=title;title=async function(){CARRY=null;return _t()}}
/* tell the player who’s gone and who’s back */
{const _di=dayIntro;dayIntro=async function(died){
 await _di(died);
 if(died||!D)return;
 const gone=Object.keys(D.dead||{}).filter(k=>K[k]&&FRIENDS.includes(k));
 if(gone.length)await N('Still gone this week: '+gone.map(k=>K[k].n).join(', ')+'. Their seats are empty. Nobody sits in them.');
 if(P.backAfterWeekend&&P.backAfterWeekend.length&&dow()===0){await N('New week. Somehow, everybody is back. '+P.backAfterWeekend.filter(k=>FRIENDS.includes(k)).map(k=>K[k].n).join(', ')+(P.backAfterWeekend.length?' walk off the bus like nothing happened. Nobody asks. Nobody ever asks.':''));P.backAfterWeekend=null;save()}
}}

/* ---------- later steps: break ⇄ lunch ---------- */
{
 const free=[2,4],widened=new Set();
 for(const h of HOOKS){
  if(h.who==='auto'||h.who==='weekend'||h.who==='return'||Array.isArray(h.period)||!free.includes(h.period))continue;
  if(!h.cond||!/D\.f\.|has\(/.test(String(h.cond)))continue;
  const other=h.period===2?4:2;
  if(rosterFor(other,h.room).some(e=>e[0]===h.who)){h.period=[h.period,other];widened.add(h.mis)}
 }
 for(const m of widened){const M=MIS[m];if(!M||!M.tips)continue;M.tips=M.tips.map(t=>t.replace(/^(Even day, |Odd day, )?(Break|Lunch), /,(a,b)=>(b||'')+'Break or lunch, '))}
}

/* ---------- arrivals and departures ---------- */
{const _br=buildRoom;buildRoom=function(room){
 const r=_br(room);
 if(TEST||!D||room!=='bus'||D.period!==0)return r;
 let i=0;
 for(const id in A){const a=A[id];if(id==='you'||a.dead||(K[id]&&K[id].adult))continue;const tx=a.x,ty=a.y,fromLeft=tx<160;a.x=fromLeft?-16-i*6:336+i*6;a.y=ty;const delay=.15+i*.22;i++;timers.push({t:delay,r:()=>{if(A[id]===a)walk(id,tx,70+Math.random()*25)}})}
 return r;
}}
{const _bb=boardBus;boardBus=async function(fromMall){
 if(!TEST&&D&&(ROOM==='bus'||ROOM==='carpark'||ROOM==='foodcourt')){
  const ids=Object.keys(A).filter(id=>id!=='you'&&!A[id].dead&&!(K[id]&&K[id].adult));
  ids.forEach((id,i)=>timers.push({t:i*.15,r:()=>{if(A[id])walk(id,A[id].x<160?-20:340,80)}}));
  if(ids.length)await wait(1400);
  if(A.you)await walk('you',A.you.x<160?-20:340,90);
 }
 return _bb(fromMall);
}}
