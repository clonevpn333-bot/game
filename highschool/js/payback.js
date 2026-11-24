'use strict';
/* =====================================================================
   HIGHSCHOOL — PAYBACK
   Shove the wrong kid and they get PISSED:
     • SWING BACK   they come at you right there (mash fight)
     • STRAPPED     they pull something out of their backpack (knife,
                    bat, a ruler sharpened into a shank) and come at you
                    to kill you: run, fight, or beg. Get it wrong and you die.
     • GRUDGE       “after school. watch your back.” They find you later
                    in another hallway, with backup.
   Hot-headed kids snap easily. Calm kids take one shove, not two.
   ===================================================================== */
const HOTHEAD=new Set(['arjun','brayden','jaxon','kayden','tez','omer','angelo','marcus','paul','kenneth','alex','kaylee','jade','dheva']);
DEATHS.shanked={name:'Shanked',desc:'You shoved the wrong kid. They had something in their backpack.',hint:'Some kids don’t take a shove. Watch who you push.'};
DEATHS.jumped={name:'Jumped',desc:'They said “after school”. They meant it. They brought friends.',hint:'Somebody you shoved is holding a grudge. Don’t walk the halls alone.'};
const PISSED=['You did NOT just put your hands on me.','Oh you’re DEAD. You’re actually dead.','(very quiet) …Okay. Okay. You wanna do this?','Say sorry. SAY SORRY. …Nah, too late.','Bro I’m gonna END you.','Touch me again. TOUCH ME AGAIN.'];
const PULL=['(unzipping the backpack slowly) You know what I got in here?','(pulling something out of the backpack) I’ve been WAITING for somebody to try me.','(reaching into the hoodie) I warned people. Didn’t I warn people?'];
const GRUDGE_LINE=['After school. Watch your back.','I know which bus you take.','You’re not gonna see it coming. Tomorrow, today, whenever. You won’t see it.','Me and my boys are gonna find you. Sleep with your eyes open.'];
const WEAPONS=['knife','bat','ruler','scissors','hammer'].filter(w=>typeof GRIP_W==='undefined'||GRIP_W[w]);
function grudgeOn(id,days){(P.grudge=P.grudge||{})[id]=cal()+(days||2);save&&save()}

async function strapped(id,opts){
 opts=opts||{};const a=A[id];if(!a)return;
 const wpn=pick(WEAPONS.length?WEAPONS:['knife']);opts.wpn=wpn;
 a.ex='evil';face(id,'you');await say(id,pick(PULL),'evil');
 pose(id,'grab');hold(id,wpn);SFX.whoosh&&SFX.whoosh();await wait(TEST?0:300);pose(id,null);
 for(const k of Object.keys(A))if(k!==id&&k!=='you'&&A[k]&&!A[k].dead&&K[k]&&!K[k].adult)A[k].ex='shock';
 if(typeof camZoom==='function')await camZoom((a.x+A.you.x)/2,a.y-24,1.5,300);
 await N(K[id].n+' has a '+(wpn==='ruler'?'metal ruler, filed down to a point':wpn)+'. Everybody around takes three steps back. Nobody tries to stop it.');
 const c=await choose([{t:'RUN.',tag:'🏃'},{t:'Fight for it.',tag:'👊'},{t:'Beg. Hands up. “I’m sorry, I’m SORRY.”',tag:'🙏'}],K[id].n+' is coming at you with a '+wpn+'.');
 if(c===0){
  const ok=await mash('RUN',{need:16,time:3,info:'MASH to get away!'});
  if(ok){if(typeof camZoom==='function')await camZoom();const ex=A.you.x<160?-24:344;await Promise.all([walk('you',ex,150),walk(id,A.you.x<160?40:280,110)]);
   await N('You make it out of the hall. Behind you, '+K[id].n+' stops, breathing hard, and yells something about tomorrow.');grudgeOn(id,2);
   A.you.x=ex<0?14:306;return 'ran'}
 }else if(c===1){
  const ok=await mash('FIGHT FOR IT',{need:26,time:4.2,info:'MASH! Get the '+wpn+' off them!'});
  if(ok){await hit('you',id,{blood:6});hold(id,null);a.pose='lie';a.hurt=3;
   if(typeof camZoom==='function')await camZoom();
   await N('You get both hands on their wrist and slam it into the lockers until the '+wpn+' drops. '+K[id].n+' goes down and stays down. The whole hall exhales.');
   if(typeof repAdd==='function')repAdd('feared',2,'took a '+wpn+' off '+K[id].n);delete (P.grudge||{})[id];return 'won'}
 }else{
  if(Math.random()<.5){await say(id,'(spitting at your shoes) …Pathetic. You’re not even worth it.','cold');hold(id,null);grudgeOn(id,1);if(typeof camZoom==='function')await camZoom();return 'spared'}
 }
 /* it goes wrong */
 SFX.squelch&&SFX.squelch();shake(1.4);flash('#a00010',.45);
 await hit(id,'you',{blood:14});A.you.hurt=3;
 if(typeof camZoom==='function')await camZoom();
 if((A.you._stabbed=(A.you._stabbed||0)+1)>=1){
  blood(A.you.x,A.you.y-20,50,null,90,A.you.y+2);A.you.pose='lie';A.you.dead=1;
  await N(opts.jump?'There’s too many of them. It’s over fast. Somebody films it.':({knife:'It goes in under your ribs. It doesn’t hurt at first. Then it’s all there is.',scissors:'Art-room scissors. Right in the side. You hear yourself make a sound you didn’t know you could make.',ruler:'The filed-down ruler goes in like it was made for it. It kind of was.',bat:'The bat catches you right on the temple. The field tilts. The grass comes up to meet you.',hammer:'One swing. Your knees go first. You don’t feel the second one.'})[opts.wpn]||'It’s over fast.');
  await die(opts.jump?'jumped':'shanked');
 }
}
async function swingBack(id){
 const a=A[id];a.ex='angry';face(id,'you');await say(id,pick(PISSED),'angry');
 await walk(id,A.you.x+(a.x<A.you.x?-12:12),110);
 const ok=await mash('THEY’RE SWINGING',{need:18,time:3.8,info:'MASH! Fight back!'});
 if(ok){await hit('you',id,{blood:4});a.pose='lie';a.hurt=2;await N(pick(['You catch them clean. They go down and decide that’s enough for today.','Two hits and they’re on the floor, holding their nose, swearing at the ceiling.']));if(typeof repAdd==='function')repAdd('feared',1);
  if(Math.random()<.4){await wait(TEST?0:400);a.pose=null;await say(id,pick(GRUDGE_LINE),'evil');grudgeOn(id,2)}return}
 await hit(id,'you',{blood:6});await hit(id,'you',{blood:6});A.you.hurt=Math.min(3,(A.you.hurt||0)+2);D.apples=Math.max(0,(D.apples||0)-1);updateLoc();
 await N(pick(['They put you into the lockers so hard a door pops open. Somebody’s gym clothes fall on your head.','They get you in a headlock and hold you there until you say sorry. You say sorry. Everybody hears it.']));
}
/* the new shove */
freeShove=async function(){
 if(!D||D.weekend||busy||panelMode!=='roam'||!A.you)return;
 const id=nearestPerson(24);if(!id){toast('Nobody close enough to shove.');return}
 const jh=availableHooks(D.room,id).find(h=>/^Shove|^Take|^Jump|^Get the powder|^Make .* pay/.test(h.label||''));
 if(jh)return runHook(jh);
 const adult=K[id]&&K[id].adult;
 runHook({run:async()=>{
  await doShove(id,{});
  D.f.shoved=D.f.shoved||{};const n=D.f.shoved[id]=(D.f.shoved[id]||0)+1;
  D.f.shoves=(D.f.shoves||0)+1;if(typeof repAdd==='function'&&D.f.shoves%3===0)repAdd('feared',1,'shoving people');
  const teacher=Object.keys(A).find(k=>k!==id&&K[k]&&K[k].adult&&A[k].vis&&!A[k].dead);
  if(adult){await say(id,pick(SHOVE_REACT.adult),'angry');face(id,'you');await say(id,'Detention. And I’m keeping your apple.','angry');D.apples=Math.max(0,(D.apples||0)-1);updateLoc();return 'stay'}
  const hot=HOTHEAD.has(id)||(A[id]&&A[id].extra&&hsh(id.length*13+(id.charCodeAt(1)||0))<.3);
  const chance=(hot?.55:.12)+(n-1)*.4-((typeof rep==='function'&&rep().feared>=3)?.15:0);
  A[id].pose=null;
  if(Math.random()>=chance||TEST&&!TEST.payback){await say(id,pick(SHOVE_REACT.kid),'hurt');
   if(teacher){face(teacher,'you');await say(teacher,'I SAW that. Lose an apple, and lose the attitude.','angry');D.apples=Math.max(0,(D.apples||0)-1);updateLoc()}return 'stay'}
  if(teacher&&Math.random()<.5){await say(id,pick(PISSED),'angry');await say(id,'(glancing at '+K[teacher].n+') …Not here. '+pick(GRUDGE_LINE),'evil');grudgeOn(id,3);return 'stay'}
  const r=Math.random(),armed=hot&&(n>=2||r<.28);
  if(armed){await strapped(id);return 'stay'}
  if(r<.7){await swingBack(id);return 'stay'}
  await say(id,pick(PISSED),'angry');await say(id,pick(GRUDGE_LINE),'evil');grudgeOn(id,2);return 'stay'}});
};
/* they come back for you */
chaos('payback',['corridor','hallb','upper','wing_sci','wing_arts','wing_sports','walkway','bus','toilets','field'],[0,2,4,7],.45,async()=>{
 const g=Object.keys(P.grudge||{}).filter(k=>grudging(k)&&K[k]&&!K[k].adult&&!D.dead[k]&&HOTHEAD.has(k));const id=pick(g);if(!id)return;
 const crew=['jaxon','brayden','kayden'].filter(k=>k!==id&&K[k]&&!D.dead[k]).slice(0,2);
 const fromL=A.you.x>160;
 for(const [k,i] of [[id,0]].concat(crew.map((c,i)=>[c,i+1]))){if(A[k])remove(k);put(k,fromL?-16-i*14:336+i*14,fromL?1:-1,{y:A.you.y-2+i*3,ex:'evil'});walk(k,A.you.x+(fromL?-14-i*12:14+i*12),120)}
 await wait(TEST?0:900);
 await say(id,pick(['Told you. Watch your back. You didn’t watch your back.','Remember me? Remember the shove?','(cracking knuckles) My boys wanted to meet you.']),'evil');
 if(crew[0])await say(crew[0],pick(['This the one?','Bro this kid is TINY. You let THEM push you?','Let’s get this over with, I got fourth period.']),'smirk');
 const c=await choose([{t:'“I’m sorry. For real. I was being an idiot.”',tag:'🙏'},{t:'Fight all of them.',tag:'👊'},{t:'Throw your lunch money and run.',tag:'💵'}],'They’ve got you surrounded.');
 if(c===0){if(Math.random()<.55){await say(id,'…Fine. Fine. But if you EVER—','cold');delete P.grudge[id];save&&save()}else{await say(id,'Sorry don’t cover it.','evil');return strapped(id,{jump:1})}}
 else if(c===1){const ok=await mash('FIGHT THEM ALL',{need:30,time:5,info:'There’s '+(crew.length+1)+' of them. MASH!'});
  if(ok){for(const k of[id].concat(crew))if(A[k]){await hit('you',k,{blood:4});A[k].pose='lie';A[k].hurt=2}await N('You don’t know how you did it. Neither do they. Three kids on the floor and you’re still standing. That’s going to be a story by lunch.');if(typeof repAdd==='function')repAdd('legend',2,'took on three');delete P.grudge[id]}
  else return strapped(id,{jump:1})}
 else{const m=D.money||0;D.money=0;updateLoc();await N('You throw $'+m+' in the air and run while they scramble for it. You hear them fighting over the coins behind you.');await walk('you',fromL?344:-24,150);A.you.x=fromL?300:20;delete P.grudge[id]}
 for(const k of[id].concat(crew))if(A[k]&&A[k].pose!=='lie')walk(k,fromL?-30:350,90);
},()=>Object.keys(P.grudge||{}).some(k=>typeof grudging==='function'&&grudging(k)&&HOTHEAD.has(k)));

/* ================= BIN DAY: the 7th and 8th graders ================= */
const YOUNG=['jaxon','kaylee','brayden'];
const OUTSIDE_R=['bus','field','courtyard','walkway'];
{const _dp=drawProp;drawProp=function(p){if(p.t==='bigcan'){const x=Math.round(p.x),y=Math.round(p.y);
  R(x-11,y-22,22,22,'#2f5a3a');R(x-11,y-22,22,2,'#4a7a52');for(let i=0;i<4;i++)R(x-9+i*6,y-19,1,17,'#264a30');R(x-12,y-24,24,3,'#3a6a44');
  if(p.full){R(x-8,y-27,4,3,'#c8c0a0');R(x-2,y-28,5,4,'#e8e0c8');R(x+4,y-26,3,2,'#a85a3a')}return}return _dp(p)}}
function youngCrew(id){const c=[id].concat(YOUNG.filter(k=>k!==id)).filter(k=>K[k]&&!D.dead[k]).slice(0,3);
 if(c.length<3){const n=3-c.length;for(let i=0;i<n;i++){const x=makeExtra(900+i+cal()*7);K[x].n=i?'Some 8th Grader':'Another 8th Grader';c.push(x)}}return c}
async function binDay(id,why,noWpn){
 const crew=youngCrew(id),fromL=A.you.x>160;
 const f=floorOf(D.room);
 crew.forEach((k,i)=>{if(A[k])remove(k);put(k,fromL?-16-i*14:336+i*14,fromL?1:-1,{y:clamp(A.you.y-2+i*3,f[0],f[1]),ex:'evil'});walk(k,A.you.x+(fromL?-14-i*11:14+i*11),120)});
 const can=prop({t:'bigcan',x:clamp(A.you.x<160?A.you.x+70:A.you.x-70,30,290),y:clamp(A.you.y+2,f[0]+4,f[1]),layer:6});
 await wait(TEST?0:900);
 await say(crew[0],why||pick(['The eighth grade had a meeting. You’re going in the bin.','We voted. It was unanimous. Well. It was three to nothing.','Bin Day. You know what day it is? It’s BIN DAY.']),'evil');
 await say(crew[1],pick(['Grab the legs. GRAB THE LEGS.','I call arms. I always do arms.','Somebody film this, I want it for my mom.']),'laugh');
 if(!noWpn&&Math.random()<.2&&HOTHEAD.has(crew[0])){await say(crew[0],'Actually. Nah. The bin’s too good for you.','cold');return strapped(crew[0])}
 const c=await choose([{t:'Fight them off.',tag:'👊'},{t:'Run for it.',tag:'🏃'},{t:'Accept your fate.',tag:'🗑️'}],'Three seventh and eighth graders. One trash can.');
 if(c===0){const ok=await mash('FIGHT THE EIGHTH GRADE',{need:22,time:4,info:'They’re small but there’s a lot of them. MASH!'});
  if(ok){for(const k of crew)if(A[k]){await hit('you',k,{blood:2});A[k].pose='lie'}await N('You put all three of them on the ground. They’re twelve. You feel great about it and also terrible about it.');if(typeof repAdd==='function')repAdd('feared',1);delete (P.grudge||{})[crew[0]];
   for(const k of crew)if(A[k]){A[k].pose=null;walk(k,fromL?-30:350,100)}return}}
 else if(c===1){const ok=await mash('RUN',{need:14,time:3});if(ok){await walk('you',fromL?344:-24,150);A.you.x=fromL?300:20;await N('You outrun a bunch of seventh graders. Barely. One of them threw a shoe.');return}}
 /* in the bin */
 A.you.pose=null;A.you.ex='shock';
 for(const k of crew)if(A[k])pose(k,'up');
 await Promise.all(crew.map((k,i)=>A[k]?walk(k,A.you.x+(i-1)*9,90):0));
 await tw(A.you,{z:16},260);A.you.pose='lie';
 await Promise.all([tw(A.you,{x:can.x},600)].concat(crew.map((k,i)=>A[k]?walk(k,can.x+(i-1)*9,70):0)));
 SFX.thud&&SFX.thud();shake(1);A.you.z=6;A.you.layer=-2;can.full=1;A.you.y=can.y-6;
 for(const k of crew)if(A[k]){pose(k,'cheer');A[k].ex='laugh'}
 await N('They carry you over their heads like a coffin at a very small funeral and drop you head-first into the big green trash bin. Your legs are sticking out. Somebody puts a juice box in your hand.');
 await say(crew[2]||crew[0],pick(['BIN. DAY.','Welcome home, trash.','Rate the bin. Five stars? Five stars.']),'laugh');
 await Promise.all(crew.map(k=>A[k]?walk(k,fromL?-30:350,110):0));
 await wait(TEST?0:500);A.you.z=0;A.you.pose=null;A.you.layer=0;A.you.y=can.y+4;can.full=0;
 if(typeof stain==='function')stain('you','brown',16);
 await N('You climb out. There’s a banana peel on your shoulder. You leave it there. It feels earned.');
 D.apples=Math.max(0,(D.apples||0)-1);updateLoc();if(typeof repAdd==='function')repAdd('liked',-1);delete (P.grudge||{})[crew[0]];
}
/* it can just happen outside */
chaos('binday',OUTSIDE_R,[0,2,4,7],.12,async()=>binDay(pick(YOUNG.filter(k=>K[k]&&!D.dead[k]))||'jaxon'),()=>YOUNG.some(k=>K[k]&&!D.dead[k]));
/* much likelier if you shoved one of them */
chaos('binday_payback',OUTSIDE_R,[0,2,4,7],.6,async()=>{const id=YOUNG.find(k=>grudging(k));return binDay(id,pick(['You remember shoving '+K[id].n+'? '+K[id].n+' remembers.','That’s the one. That’s who shoved '+K[id].n+'. BIN.']))},()=>YOUNG.some(k=>typeof grudging==='function'&&grudging(k)));
/* shoving a younger kid outside can set it off right there */
{const _fs=freeShove;freeShove=async function(){
 if(!D||D.weekend||busy||panelMode!=='roam'||!A.you)return _fs();
 const id=nearestPerson(24);
 if(id&&YOUNG.includes(id)&&OUTSIDE_R.includes(D.room)&&!TEST&&Math.random()<.45){
  return runHook({run:async()=>{await doShove(id,{});A[id].pose=null;await say(id,pick(PISSED),'angry');await binDay(id,'GUYS. GUYS. THIS KID PUSHED ME. BIN DAY. BIN DAY.');return 'stay'}})}
 if(id&&YOUNG.includes(id))setTimeout(()=>{if(!grudging(id)&&Math.random()<.5)grudgeOn(id,2)},4000);
 return _fs()}}
