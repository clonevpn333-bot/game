'use strict';
/* =====================================================================
   HIGHSCHOOL REMASTERED — THE CUT
   One place for every quest the remaster removes (approved list).
   The code for them still exists in the old files; this switches them
   off cleanly: no mission, no hooks, no spots, no jobs, no tips. To bring
   one back, take it off CUT_MIS.
   Kept on purpose as SIDE: Any Reaction (loach), The Staff Room, the
   teacher lessons, the filthy quests. Cheeks & Cheek-Clapper's quest is
   cut because they now live in the main story (js/cheeksmain.js).
   ===================================================================== */
const CUT_MIS=[
 /* mid one-offs */
 'seat','group','beep','alex','dheva','marcus','paul','kenneth','bully','alone','pits','phone','flimbus','inhaler',
 'ladle','shorts','vapes','emergency','roast','cheeks','kaivibes','groupchat','leaked','beef',
 /* fringe characters */
 'jade','stall','ringing','stain','steal_mia','bayonet','closet','ditch','lunchrun','hotsub','swipe','nursecal','gains','rave',
 /* family */
 'quiet','omermum','omerscarf','grandad','ohio',
 /* shops are places now, not quests */
 'angelo','armoury',
 /* the raccoon "lockdown" */
 'lockdown'];
const CUT_SET=new Set(CUT_MIS);
for(const m of CUT_MIS){
 delete MIS[m];
 for(let i=HOOKS.length-1;i>=0;i--)if(HOOKS[i].mis===m)HOOKS.splice(i,1);
 for(let i=SPOTS.length-1;i>=0;i--)if(SPOTS[i].mis===m)SPOTS.splice(i,1);
 if(typeof JOBS!=='undefined')delete JOBS[m];
}
/* the raccoon lockdown never fires */
if(typeof lockdownDue==='function')lockdownDue=function(){return false};
/* old code that still mentions a cut quest can't crash or resurrect it */
{const _c=complete;complete=async function(m){if(!MIS[m])return;return _c.apply(this,arguments)}}
{const _p=part;part=function(m){if(!MIS[m])return;return _p.apply(this,arguments)}}
if(typeof HEADLINERS!=='undefined')for(let i=HEADLINERS.length-1;i>=0;i--)if(CUT_SET.has(HEADLINERS[i]))HEADLINERS.splice(i,1);
if(typeof FEATURED!=='undefined')for(const m of CUT_MIS)FEATURED.delete(m);
/* hooks that start a cut quest without tagging it */
for(let i=HOOKS.length-1;i>=0;i--){const h=HOOKS[i];if(h.mis&&!MIS[h.mis]&&!/^(cq_|gig|rescue|crew)/.test(h.mis))HOOKS.splice(i,1)}
for(let i=SPOTS.length-1;i>=0;i--){const s=SPOTS[i];if(s.mis&&!MIS[s.mis]&&!/^(cq_|gig|rescue|crew)/.test(s.mis))SPOTS.splice(i,1)}

/* daily challenges are cut: a checklist that pulls you out of the story */
challToday=function(){return[]};

/* live roam events: rarer (every ~90-150 s instead of 30-45 s) */
{const _ls=liveSchedule;liveSchedule=function(s){_ls(s!=null?s:90+Math.random()*60)}}
