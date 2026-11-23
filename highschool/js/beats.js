'use strict';
/* =====================================================================
   HIGHSCHOOL — STORY BEATS FOR EVERY QUEST
   Every quest with three or more steps now plays like the new arcs:
   each step opens on a chapter card (QUEST · PART n · what this part is),
   and if you’re coming back to a quest on a later day you get a one-line
   "Previously…" so you know where you left it.
   ===================================================================== */
const BEAT_SKIP=/^(passing|crew|cq_|ret_|wk_|robbery|lockedroom)/;
{const _rh=runHook;runHook=async function(h){
 try{
  if(!TEST&&h&&h.mis&&MIS[h.mis]&&!BEAT_SKIP.test(h.mis)&&!D.done[h.mis]){
   const M=MIS[h.mis],n=D.mp[h.mis]||0,parts=M.parts||[];
   const key=h.mis+':'+n;D.f.beatSeen=D.f.beatSeen||{};
   if(parts.length>=3&&n<parts.length&&!D.f.beatSeen[key]&&!String(h.run).includes('beat(')){
    D.f.beatSeen[key]=1;
    const pt=String(parts[n]||'').replace(/^[^:]{0,24}:\s*/,'');
    await card(M.name.toUpperCase(),'PART '+(n+1)+' OF '+parts.length+(pt?' · '+pt.toUpperCase():''),1300);
    const last=(P.lastStep||{})[h.mis];
    if(n>0&&last&&last.day!==cal()&&parts[n-1])await N('Previously: '+String(parts[n-1]).replace(/^[^:]{0,24}:\s*/,'')+'.');
   }
  }
 }catch(e){if(e===DEATH)throw e}
 return _rh(h);
}}
{const _pt=part;part=function(mis,n,quiet){P.lastStep=P.lastStep||{};P.lastStep[mis]={day:cal(),n};return _pt(mis,n,quiet)}}
