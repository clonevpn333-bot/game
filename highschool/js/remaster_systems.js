'use strict';
/* =====================================================================
   HIGHSCHOOL REMASTERED — SYSTEMS
   • STORY MOVES (Kindergarten-style scarcity): 4 a school day. Starting
     or continuing a chapter of one of the 13 main arcs (not The Crew,
     not rescues, not things that happen to you in class) costs a move.
     When they're gone, the arcs wait for tomorrow and the HUD says so.
     Ten school days, ~40 moves, ~70 chapters: you can't do everything.
   • TONE GUARD: after a serious scene (rescue, guns, the Other Miss,
     Closing Time, Paul, the checkpoint), filthy quests and the door-
     banging gag stay away for the rest of that period.
   ===================================================================== */
{
/* MERGED INTO APPLES: there are no separate story moves any more.
   A chapter of one of the 13 main arcs (not The Crew, not rescues, not
   things that happen to you) is a big scene: it costs TWO apples (one
   here, one by the normal apple rule after it). With fewer than two left
   it waits for next period. One currency, one bar in the HUD. */
const arcMis_=new Set(ARCS.flatMap(g=>g[2]).filter(a=>a[0]!=='story').flatMap(a=>a[3]));
window.movesLeft=()=>null;
const costs=h=>h&&h.mis&&arcMis_.has(h.mis)&&h.who!=='auto'&&!h._inner_free&&!(typeof TEST!=='undefined'&&TEST);
window.bigChapter=costs;
{const _rh=runHook;runHook=async function(h){
 if(costs(h)&&!(D.done&&D.done[h.mis])&&D&&!D.weekend&&D.apples!=null&&!(D.pass&&T<D.pass.end)){
  const need=Math.min(2,typeof applesFor==='function'?applesFor(D.period):2);
  if(D.apples<need){toast('🍎🍎 '+(MIS[h.mis]?MIS[h.mis].name:'That')+' is a big one: it needs two apples. Next period.');busy=false;if(panelMode!=='roam')roam();return}
  if(need>1){D.apples-=1;updateLoc&&updateLoc()}}
 return _rh.apply(this,arguments)}}
/* Do Now explains it once a day */
{const _qn=qlNow;qlNow=function(body){_qn(body);if(!D||D.weekend||D.apples==null)return;
 const r=qel('div','qlnote','🍎 Apples are your time this period. Doing anything costs one; a main-quest chapter is a big scene and costs two. Talking is free. Run out and the bell goes.');
 const first=body.querySelector('.qsec');body.insertBefore(r,first||null)}}

/* ---------------- TONE GUARD ---------------- */
const SERIOUS=/^(rescue|abd|pauljones|robbery|dopple|lockedroom|crew)/;
const seriousNow=()=>D&&D.f&&D.f.serious===cal()+':'+D.period;
window.markSerious=function(){if(D&&D.f)D.f.serious=cal()+':'+D.period};
{const _rh=runHook;runHook=async function(h){
 const filthy=h&&typeof FILTHY!=='undefined'&&FILTHY.includes(h.mis);
 if(filthy&&seriousNow()){toast('Not now. Not after that.');busy=false;if(panelMode!=='roam')roam();return}
 if(h&&h.mis&&SERIOUS.test(h.mis))markSerious();
 return _rh.apply(this,arguments)}}
{const _die=die;die=async function(){markSerious();return _die.apply(this,arguments)}}
if(typeof CHX!=='undefined'&&CHX.doorbang){const c=CHX.doorbang.cond;CHX.doorbang.cond=function(){return !seriousNow()&&(!c||c.apply(this,arguments))}}
for(const fn of['screening','clappening','dailies'])if(typeof window[fn]==='function'){const o=window[fn];window[fn]=async function(){if(fn==='screening'&&cal()>=9)markSerious();return o.apply(this,arguments)}}
}
