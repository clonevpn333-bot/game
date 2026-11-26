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
const MOVES_PER_DAY=4;
const arcMis_=new Set(ARCS.flatMap(g=>g[2]).filter(a=>a[0]!=='story').flatMap(a=>a[3]));
const movesLeft=()=>{if(!D||D.weekend)return null;if(D.movesDay!==cal()){D.movesDay=cal();D.moves=MOVES_PER_DAY}return D.moves};
window.movesLeft=movesLeft;
const costs=h=>h&&h.mis&&arcMis_.has(h.mis)&&h.who!=='auto'&&!h._inner_free&&!(typeof TEST!=='undefined'&&TEST);
{const _rh=runHook;runHook=async function(h){
 if(costs(h)&&!(D.done&&D.done[h.mis])){const m=movesLeft();
  if(m!=null&&m<=0){toast('★ No story moves left today. '+(MIS[h.mis]?MIS[h.mis].name:'That')+' will still be there tomorrow.');busy=false;if(panelMode!=='roam')roam();return}
  D.moves=m-1;updateLoc&&updateLoc();
  if(D.moves===0)setTimeout(()=>toast('★ That was your last story move today. Side stuff is still free.'),400)}
 return _rh.apply(this,arguments)}}
/* the HUD shows them */
{const _ul=updateLoc;updateLoc=function(){_ul();const m=movesLeft();const e=$('ploc');if(e&&m!=null&&!D.weekend){const st='★'.repeat(m)+'<span style="opacity:.25">'+'★'.repeat(Math.max(0,MOVES_PER_DAY-m))+'</span>';if(!/story-moves/.test(e.innerHTML))e.innerHTML+=' <span class="story-moves" title="Story moves left today" style="color:#ffd27a">'+st+'</span>'}}}
/* and Do Now explains them once */
{const _qn=qlNow;qlNow=function(body){_qn(body);const m=movesLeft();if(m==null)return;
 const r=qel('div','qlnote','★ '+m+' of '+MOVES_PER_DAY+' story moves left today. Each chapter of a main quest costs one. You won’t get to everything. Choose.');
 const first=body.querySelector('.qsec');body.insertBefore(r,first||null)}}
/* new day = fresh moves (handled lazily by movesLeft) */

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
