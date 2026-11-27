'use strict';
/* =====================================================================
   HIGHSCHOOL REMASTERED — THE FIRST THREE DAYS OPEN UP
   Day 1 is small: apples, your classes, lunch, The Crew, Corey, and a
   phone with just Messages and Highgram. Day 2 opens the main quests
   (their "!" marks and walk-ups) and the rest of the phone. Day 3 opens
   the DMs with the girls, side hustles and your reputation title.
   Each unlock is announced once, in one line.
   Also: your REP shows. Kids react to your title as you walk in.
   ===================================================================== */
{
const day=()=>typeof cal==='function'?cal():99;
/* day 1: only The Crew, rescues and class things nag you */
let FULL=null;
const narrow=()=>{if(typeof FEATURED==='undefined')return;if(!FULL)FULL=new Set(FEATURED);
 const keep=[...FULL].filter(m=>/^crew|^rescue|^cq_|^ret_/.test(m)||(D&&D.done&&D.done[m])||(D&&D.mp&&D.mp[m]>0));
 if(day()<=1){FEATURED.clear();for(const m of keep)FEATURED.add(m)}else if(FEATURED.size<FULL.size){for(const m of FULL)FEATURED.add(m)}};
ON_PERIOD.push(async(i,resume)=>{try{narrow()}catch(e){}});
/* side hustles and the rep title wait for day 3 */
if(typeof gigsToday==='function'){const _g=gigsToday;gigsToday=function(){return day()<3?[]:_g.apply(this,arguments)}}
if(typeof repTitle==='function'){const _r=repTitle;repTitle=function(){return day()<3?null:_r.apply(this,arguments)}}
/* one line per unlock */
const UNLOCK={2:'🔓 NEW TODAY: every main quest is open (Q). Your phone has Searchy, Arcade, Camera and a Shop now.',
 3:'🔓 NEW TODAY: side hustles pay cash (Side & Gigs tab), your reputation shows under the clock, and some people at school might slide into your DMs.'};
ON_PERIOD.push(async(i,resume)=>{if(resume||!D||D.weekend||TEST||i!==0)return;const d=day(),k='unl'+d;
 if(UNLOCK[d]&&!(P.seenUnl||{})[d]){(P.seenUnl=P.seenUnl||{})[d]=1;save&&save();setTimeout(()=>toast(UNLOCK[d]),3500)}});

/* REP you can see: one kid reacts when you walk into a busy room */
const LINES={
 feared:['(stepping out of your way) …my bad','don’t look at him','(whispering) that’s the one','(pressed against a locker) hi. hi. hello.'],
 liked:['YO!','hey!! save me a seat','ur actually so nice','(waving) hiii'],
 snitch:['snitch','(coughs) snitch','watch what you say','(zipping his mouth shut at you)'],
 legend:['THAT’S HIM','yo you’re the one who—','legend','(starts a tiny slow clap)']
};
{const _er=enterRoom;enterRoom=async function(room){const r=await _er(room);
 try{if(!D||D.weekend||busy||TEST||typeof repTitle!=='function')return r;const t=repTitle();if(!t||!LINES[t])return r;
  if(Math.random()>.45)return r;const kids=Object.keys(A).filter(k=>k!=='you'&&K[k]&&!K[k].adult&&A[k].vis!==false);if(!kids.length)return r;
  const k=kids[Math.floor(Math.random()*kids.length)];const L=LINES[t];
  if(typeof bubbles!=='undefined')setTimeout(()=>{if(A[k])bubbles.push({id:k,txt:L[Math.floor(Math.random()*L.length)],t:2.2})},600);
  if(t==='feared'&&A[k]&&A.you)A[k].x+=A[k].x<A.you.x?-10:10}catch(e){}
 return r}}
}
