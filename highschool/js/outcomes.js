'use strict';
/* =====================================================================
   HIGHSCHOOL — OUTCOMES
   How a quest ends matters now. Every ending is graded:
     GOOD   — the people in it like you more, you get something for it,
              and the school talks about it (the good kind).
     CRAPPY — the people in it hold a grudge for days (they won’t talk
              to you, they stand there with their arms crossed), you lose
              something, and the school talks about you.
     MESSY  — somewhere in between.
   You see a proper ending card the moment it happens, with what it
   cost you or got you.
   ===================================================================== */
P.grudge=P.grudge||{};
const BAD_RE=/dead|died|burnt|lost|banned|caught|detention|bailed|tased|killer|exposed|glen|shot|teeth|the head|javelin|himself|coffin|ran\b|fail|ruin|drain|merged|let it go|did nothing|shut down|minus|policy|smudged|drowned|wrecked|dumped|alone|laughed|grudge|crappy|worst|baked|pursued|critic/i;
const GOOD_RE=/peace|saved|won|legend|perfect|honest|sorry|apolog|kiss|friends|stopped|clean|calm|breathe|escape|surviv|together|picked you|ovation|admin|free|mates|milkshake|got it back|the key|smart|best|five stars|tested|passed|hands|two birds|you did it|corey did it|stepped in|helped|given|the song|cake|heard|tuned|sang|duet|cut the right|froze/i;
/* hand-graded where a keyword would get it wrong */
const OUTCOME_FIX={'brett:you':'bad','brett:corey':'messy','pauljones:shot':'bad','pauljones:grabbed':'messy','pauljones:given':'good','darren:javelin':'bad','darren:friends':'messy','lockers:kind':'good','lockers:dead':'bad','beef:peace':'good','beef:teeth':'messy','beef:head':'bad'};
function gradeOf(mis,v){const k=mis+':'+v;if(OUTCOME_FIX[k])return OUTCOME_FIX[k];
 const M=MIS[mis],lab=((M&&M.variants&&M.variants[v])||v||'')+'';
 if(BAD_RE.test(lab)||BAD_RE.test(v||''))return'bad';if(GOOD_RE.test(lab)||GOOD_RE.test(v||''))return'good';return'messy'}
const OUT_LINE={
 good:['People are talking about it. The good kind of talking.','Somebody you don’t even know nods at you in the hallway. Word got around.','For once, the thing you did is the thing people remember.'],
 bad:['Nobody’s talking to you about it. They’re talking about you.','It’s on somebody’s story already. Not the version that makes you look good.','You did that. Everybody saw you do that. That’s yours now.'],
 messy:['It worked. Kind of. Nobody’s sure how to feel about it, including you.','It could’ve gone worse. It could’ve gone a lot better.']};
const GRUDGE_LINES=['Don’t. I’m not talking to you.','Wow. You’ve got some nerve walking up to me.','(not looking at you) Keep walking.','After what you did? Fuck off. Seriously.','Nah. You know what you did.','I’m busy. Being disappointed in you.'];
async function outcomeCard(mis,v){
 const gr=gradeOf(mis,v),M=MIS[mis],lab=(M.variants&&M.variants[v])||'';
 const title=gr==='good'?'GOOD ENDING':gr==='bad'?'CRAPPY ENDING':'MESSY ENDING';
 SFX[gr==='good'?'good':gr==='bad'?'bad':'sting']&&SFX[gr==='good'?'good':gr==='bad'?'bad':'sting']();
 await card(title,(M.name+(lab?' — '+lab:'')).toUpperCase(),1700,gr==='bad'?'death':undefined);
 const who=(M.who||[]).filter(id=>K[id]&&id!=='you');
 if(gr==='good'){
  for(const id of who)P.bond[id]=Math.min(5,(P.bond[id]||0)+1);
  P.momentum=(P.momentum||0)+1;D.money=(D.money||0)+2;updateLoc();
  await N(pick(OUT_LINE.good)+' (+$2. Tomorrow you start with an extra 🍎.)');
 }else if(gr==='bad'){
  for(const id of who){(P.grudge=P.grudge||{})[id]=cal()+2;P.bond[id]=Math.max(0,(P.bond[id]||0)-1)}
  const lost=Math.min(D.money||0,2);D.money=(D.money||0)-lost;if(D.apples!=null)D.apples=Math.max(0,D.apples-1);updateLoc();
  await N(pick(OUT_LINE.bad)+(who.length?' '+who.slice(0,3).map(id=>K[id].n).join(', ')+(who.length>1?' aren’t':' isn’t')+' speaking to you for a couple of days.':'')+(lost?' (−$'+lost+', −1 🍎)':' (−1 🍎)'));
 }else await N(pick(OUT_LINE.messy));
 save();
}
{const _cm=complete;complete=async function(mis,variant,big){
 const r=await _cm(mis,variant,big);
 if(!TEST&&MIS[mis]&&MIS[mis].variants&&Object.keys(MIS[mis].variants).length&&variant&&!['passing','crew'].includes(mis)&&!/^cq_|^ret_|^wk_/.test(mis)){try{await outcomeCard(mis,variant)}catch(e){if(e===DEATH)throw e;console.error(e)}}
 return r;
}}
/* grudges: they won’t talk, and they look it */
const grudging=id=>P.grudge&&(P.grudge=P.grudge||{})[id]>=cal();
{const _tt=talkTo;talkTo=async function(id){
 if(!TEST&&grudging(id)&&!availableHooks(D.room,id).some(h=>h.mis)){busy=true;setPanel('talk');face(id,'you');A[id]&&(A[id].ex='angry');await say(id,pick(GRUDGE_LINES),'angry');busy=false;roam();return}
 return _tt(id);
}}
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);for(const id in A)if(grudging(id)&&A[id]&&!A[id].dead){A[id].ex='angry';if(!A[id].pose)A[id].pose='cross'}return r}}
/* a good ending carries into the next morning */
ON_PERIOD.push(async(i,resume)=>{if(i===0&&!resume&&P.momentum>0&&D){D.apples=(D.apples||0)+1;P.momentum--;save();setTimeout(()=>toast('🍎 Yesterday went well. +1 apple.'),2200)}});
