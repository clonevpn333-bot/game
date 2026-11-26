'use strict';
/* =====================================================================
   A REAL PASSING PERIOD
   The bell rings → you get a countdown to the SECOND BELL, sized to how
   far your class is (25 s + 9 s per hallway on the way). Walk there in
   time and you just walk in. Miss it: second bell, you're late (the owl
   heads at the door), and if you're still out there, you're skipping.
   While the countdown runs, nothing in the hall costs an apple, so the
   period can't end under you on the way.
   ===================================================================== */
const PASS2={};
function passSecs(from,cls){
 try{const ex=exitOf(cls);const th=ex?ex[0]:'corridor';const path=hallPath(from,th);return 25+9*Math.max(0,(path?path.length:2)-1)}catch(e){return 40}}
{const _wp=worldPlace;worldPlace=async function(){
 const i=D.period,p=PERIODS[i];
 D.pass=null;
 if(!TEST&&p&&p.lesson&&!D.weekend){const cls=myClassToday();
  if(cls){let from=D.lastRoom||'corridor';if(!HALLS.has(from)){const ex=exitOf(from);from=ex?ex[0]:'corridor'}
   const s=passSecs(from,cls);D.pass={to:cls,end:T+s,len:s,per:i,day:cal()}}}
 return _wp()}}
/* got there */
{const _er=enterRoom;enterRoom=async function(room){if(D&&D.pass&&room===D.pass.to){D.pass=null;D.lateTo=null}return _er(room)}}
/* the second bell */
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);
 const ps=D&&D.pass;if(!ps||TEST)return;
 if(D.period!==ps.per||cal()!==ps.day||D.inClass){D.pass=null;return}
 if(T<ps.end)return;
 D.pass=null;D.lateTo=ps.to;D.wander=D.period;
 SFX.bell&&SFX.bell();
 toast('🔔 Second bell. You’re late for '+shortName(ps.to)+'. Out here now, you’re skipping.');
}}
/* free hallway on the way */
{const _sa=spendApple;spendApple=async function(per,day){if(D&&D.pass&&T<D.pass.end)return;return _sa(per,day)}}
/* the countdown, top centre */
{const _do=HOOK.drawOver;HOOK.drawOver=()=>{_do&&_do();const ps=D&&D.pass;if(!ps||TEST||busy&&panelMode!=='roam')return;
 const left=Math.max(0,Math.ceil(ps.end-T)),m=Math.floor(left/60),s=String(left%60).padStart(2,'0');
 const txt='BELL '+m+':'+s+' '+shortName(ps.to).toUpperCase().replace(/^THE /,'').slice(0,11);
 const cx=199,w=txt.length*4+8;R(cx-w/2,3,w,9,'rgba(10,8,16,.8)');R(cx-w/2,3,Math.round(w*left/ps.len),1,left<10?'#ff5050':'#ffd27a');
 pxc(txt,cx,5,left<10&&Math.sin(T*10)>0?'#ff6060':'#f4ead8')}}
