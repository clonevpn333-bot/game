'use strict';
/* =====================================================================
   HIGHSCHOOL — APPLES. Like Kindergarten: you only get so many actions
   each period. Doing a quest step, investigating something, picking something up:
   one apple each. Just chatting is free. When the apples are gone, the bell goes.
   ===================================================================== */
const APPLES={0:2,1:2,2:3,3:2,4:4,5:2,6:2,7:1,8:3};
function applesFor(i){return APPLES[i]!=null?APPLES[i]:2}
{const _sp=startPeriod;startPeriod=async function(i,resume){
 if(D&&!(resume&&D.apples!=null))D.apples=applesFor(i);
 return _sp(i,resume);
}}
function appleBar(){if(!D||D.weekend||D.apples==null)return'';const max=Math.max(applesFor(D.period),D.apples);return' · '+'🍎'.repeat(Math.max(0,D.apples))+'<span style="opacity:.25">'+'🍎'.repeat(Math.max(0,max-D.apples))+'</span>'}
{const _ul=updateLoc;updateLoc=function(){_ul();const e=$('ploc');if(e&&D&&!D.weekend&&D.apples!=null)e.innerHTML=e.textContent+appleBar()}}
async function spendApple(per,day){
 if(!D||D.weekend||D.period!==per||cal()!==day||D.apples==null)return;
 D.apples=Math.max(0,D.apples-1);updateLoc();
 if(D.apples>0){if(D.apples===1)toast('🍎 One apple left this '+(PERIODS[D.period].lesson?'period':PERIODS[D.period].name.toLowerCase())+'.');return}
 toast('🍎 Out of apples. There goes the bell.');
 await wait(TEST?10:900);
 if(D.period!==per||cal()!==day||busy)return;
 if(D.period===8){busy=true;return boardBus(true)}
 if(D.period===7){return afterSchool(true)}
 return endPeriod();
}
{const _tt=talkTo;talkTo=async function(id){if(busy)return;const per=D.period,day=cal();D._acted=0;await _tt(id);if(D&&D._acted)return spendApple(per,day)}}
/* only DOING something costs an apple: starting or doing a quest step, not chatting */
{const _rh=runHook;runHook=async function(h){if(D&&h&&h.mis&&h.mis!=='passing')D._acted=1;return _rh(h)}}
{const _us=useSpot;useSpot=async function(s){if(busy)return;const per=D.period,day=cal();await _us(s);if(s&&s.free)return;return spendApple(per,day)}}
/* a few things shouldn’t cost an apple */
for(const s of SPOTS)if(s.label&&/^Get on the 43|^Read the sign|^Lie in the leaves/.test(s.label))s.free=1;
{const _r=roam;roam=function(){_r();if(D&&!D.weekend&&D.apples!=null&&D.apples<=0&&!busy){const per=D.period,day=cal();setTimeout(()=>{if(D.period===per&&cal()===day&&!busy&&D.apples<=0){if(D.period===8){busy=true;boardBus(true)}else if(D.period<7)endPeriod()}},TEST?10:1200)}}}
