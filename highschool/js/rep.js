'use strict';
/* =====================================================================
   HIGHSCHOOL — REPUTATION
   What you do adds up. Every quest ending moves four bars:
     FEARED · LIKED · SNITCH · LEGEND
   Your biggest bar is your title, under the clock and in the Tracker.
   Kids react to it when you walk up to them, and each one changes the
   game once it gets big:
     LIKED 3+   friends whisper a warning when a teacher’s patrolling
     LEGEND 3+  kids hand you stuff in the cafeteria (+1 🍎 a day)
     FEARED 3+  Ms. Sherman catches you less, kids get out of your way
     SNITCH 3+  you get jumped at the bus loop
   (Lasts the two weeks. A new two weeks starts you at zero.)
   ===================================================================== */
const REP_AX=['feared','liked','snitch','legend'];
const REP_NAME={feared:'FEARED',liked:'LIKED',snitch:'SNITCH',legend:'LEGEND'};
const REP_COL={feared:'#ff6a5a',liked:'#9ad09a',snitch:'#a8a8b8',legend:'#ffd27a'};
function rep(){D.f.rep=D.f.rep||{feared:0,liked:0,snitch:0,legend:0};return D.f.rep}
function repTitle(){const r=rep();let best=null,bv=2;for(const k of REP_AX)if(r[k]>bv){bv=r[k];best=k}return best}
function repAdd(k,n,why){const r=rep();r[k]=Math.max(0,(r[k]||0)+n);if(!TEST&&n>0)setTimeout(()=>toast((n>0?'+':'')+n+' '+REP_NAME[k]+(why?' · '+why:'')),2200);updateLoc()}
const R_VIOLENT=/head|teeth|pole|javelin|brawl|blood|stab|kill|fought|fight|won the|wrecked|sprint|tased/i,R_SNITCH=/report|told|police|adam|snitch|confess|gave it back/i,R_LEGEND=/legend|ovation|viral|belt|escaped|statue|called it|bros|lunch is served|got out clean|survived/i;
{const _oc=outcomeCard;outcomeCard=async function(mis,v){
 await _oc(mis,v);
 try{const gr=gradeOf(mis,v),M=MIS[mis],lab=((M.variants&&M.variants[v])||'')+' '+v;
  if(gr==='good')repAdd('liked',1);if(gr==='bad')repAdd('liked',-1);
  if(R_VIOLENT.test(lab))repAdd('feared',1);if(R_SNITCH.test(lab))repAdd('snitch',1);if(R_LEGEND.test(lab)||gr==='good'&&/rave|ditch|lunchrun|hotsub|gains|jade|steal_/.test(mis))repAdd('legend',1);
 }catch(e){}
}}
/* under the clock */
{const _ul=updateLoc;updateLoc=function(){_ul();if(!D||D.weekend||panelMode==='talk')return;const c=$('clock');if(!c)return;const t=repTitle();if(!t)return;
 const r=rep(),d=document.createElement('div');d.className='story repbox';d.innerHTML='REP: <b></b> <i></i>';d.querySelector('b').textContent=REP_NAME[t];d.querySelector('b').style.color=REP_COL[t];d.querySelector('i').textContent='★'.repeat(Math.min(5,r[t]));
 const first=c.querySelector('.story');c.insertBefore(d,first)}}
{const st=document.createElement('style');st.textContent='#clock .repbox{font-size:10px;color:#cbbfd8}#clock .repbox b{font-weight:normal;letter-spacing:.12em}#clock .repbox i{font-style:normal;color:#ffd27a}';document.head.appendChild(st)}
/* the tracker shows all four */
{const _rt=renderTracker;renderTracker=function(body){_rt(body);const r=rep(),t=repTitle(),w=body.querySelector('.trk');if(!w)return;
 const box=document.createElement('div');box.style.cssText='display:flex;gap:14px;flex-wrap:wrap;margin:6px 0 2px;font-size:12px';
 for(const k of REP_AX){const s=document.createElement('span');s.style.color=REP_COL[k];s.textContent=REP_NAME[k]+' '+'■'.repeat(Math.min(8,r[k]))+'□'.repeat(Math.max(0,3-r[k]));if(k===t)s.style.textDecoration='underline';box.appendChild(s)}
 w.insertBefore(box,w.children[1]||null)}}
/* kids react */
const REACT={feared:['(stepping back) Hey. Hey, man. We’re good, right? We’re good.','(not making eye contact) I didn’t say nothing. Whatever you heard, I didn’t say it.'],
 liked:['Ayyy! There they are!','Yo, you’re actually cool. Don’t tell anyone I said that.'],
 snitch:['Snitch.','(turning their back) Nah. Talk to a teacher. You love teachers.','Careful what you say, everybody. The rat’s here.'],
 legend:['YO. It’s YOU. Can I get a picture? Not with me in it. Just you.','Bro, are you the one who— yeah. YEAH. Legend. Actual legend.']};
{const _tt=talkTo;talkTo=async function(id){
 const t=repTitle();
 if(!TEST&&t&&K[id]&&!K[id].adult&&!availableHooks(D.room,id).some(h=>h.mis)&&Math.random()<.45){
  busy=true;setPanel('talk');face(id,'you');await say(id,pick(REACT[t]),t==='feared'?'scared':t==='snitch'?'cold':t==='legend'?'laugh':'happy');busy=false;
  if(t==='snitch'&&Math.random()<.5){roam();return}
 }
 return _tt(id);
}}
/* LIKED: a warning */
{const _sp=spawnPatrol;spawnPatrol=function(room){_sp(room);if(PAT&&rep().liked>=3&&!TEST){PAT.alert=0;PAT.sp=22;setTimeout(()=>toast('A friend whispers: “'+K[PAT.id].n+' is coming. Stay low.”'),400)}if(PAT&&rep().feared>=3)PAT.sp=24}}
/* LEGEND: free stuff */
ON_PERIOD.push(async(i,resume)=>{if(resume||!D||D.weekend||TEST)return;if((i===2||i===4)&&rep().legend>=3&&!D.f.legendGift){D.f.legendGift=1;D.apples=(D.apples||0)+1;updateLoc();setTimeout(()=>toast('🍎 A kid you’ve never met hands you a cookie. “For the legend.” +1 apple'),2600)}});
if(typeof DAILY_F!=='undefined')DAILY_F.push('legendGift','snitchJump');
/* FEARED: Sherman thinks twice */
{const _ch=sherChance;sherChance=function(){return _ch()*(rep().feared>=3?.5:1)}}
/* SNITCH: get jumped */
chaos('snitches',['bus'],[7],.5,async()=>{
 if(D.f.snitchJump)return;D.f.snitchJump=1;
 const ks=['jaxon','kayden','brayden'].filter(k=>!D.dead[k]&&K[k]);ks.forEach((k,i)=>extra(k,340+i*14,-1,{y:150}));
 await Promise.all(ks.map((k,i)=>A[k]?walk(k,180+i*20,90):0));
 await say(ks[0]||'kid1','Heard you like talking to teachers. Talk to us.','evil');
 const c=await choose([{t:'Fight.',tag:'👊'},{t:'Run for the bus.'},{t:'Give them your money.'}]);
 if(c===0){const ok=await mash('FIGHT',{need:18,time:4});if(ok){await hit('you',ks[0],{blood:6});A[ks[0]].pose='lie';await N('You drop the first one. The others decide this isn’t worth it.');repAdd('feared',1);repAdd('snitch',-1)}else{for(const k of ks)if(A[k])await hit(k,'you',{blood:6});A.you.hurt=3;await N('Three on one. Snitches get stitches. It’s on a T-shirt somewhere now.')}}
 else if(c===1){await walk('you',-20,150);await N('You make the bus. They bang on the window all the way to the corner.')}
 else{const m=D.money||0;D.money=0;updateLoc();await N('$'+m+'. They take it. They tell you you’re lucky. You don’t feel lucky.')}
 for(const k of ks)if(A[k]){A[k].pose=null;walk(k,340,90)}
},()=>rep().snitch>=3);
