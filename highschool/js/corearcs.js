'use strict';
/* =====================================================================
   HIGHSCHOOL — THE CORE CAST CARRIES THE STORY
   Three arcs that used to end on their own now feed the File and pay
   off on Inspection Day (finale hooks live in js/finale3.js).
   • HEAD CASE → THE SIGN-OUT SHEETS (office): after the bomb, Mr. Adam
     wants to face the inspectors properly. A deduction puzzle over 22
     years of sign-out sheets: nobody was on duty every time, but every
     sheet is signed "Love, Miss" (it's on the Trailer whiteboard).
     → ev.timesheets, crew().adamIn
   • THE OTHER PAUL → THE SHOEBOX (bus loop, before school): if you've
     been kind, Paul brings you his dad's gun before the last day. Get
     rid of it and the last ride changes (variant 'safe'). He gives you
     his seating plan of the 43: the empty seats. → ev.seats, pjSafe
   • GIANT → PUSH (field, lunch): Coach drags a seventh grader towards
     the equipment cupboard. Jacob pushes back for the first time. The
     lanyard comes off: the boiler hatch key. → ev.hatchkey
   ===================================================================== */
const crewEv=()=>{const c=crew();c.ev=c.ev||{};return c.ev};
const joinCrew=(...ks)=>{const c=crew();c.allies=c.allies||{};for(const k of ks)c.allies[k]=1;save&&save()};
{const _ce=crewEvidence;crewEvidence=function(){const e=crew().ev||{};return _ce()+(e.timesheets?1:0)+(e.seats?1:0)+(e.hatchkey?1:0)}}

/* ---------------- HEAD CASE: THE SIGN-OUT SHEETS ---------------- */
spot({mis:'crew',room:'hallb',period:[2,4],x:238,y:146,label:'Mr. Adam’s door is open. He’s on the floor with boxes.',short:'ADAM',
 cond:()=>!D.weekend&&D.done&&D.done.headcase&&!crewEv().timesheets&&!D.dead.adam&&cal()<12,run:async()=>{
 scene('office',{adam:[262,-1,{y:142,pose:'sit',ex:'sad'}],you:[-14,1,{y:148}]},true);
 for(const [bx,by,n] of [[236,146,1],[250,134,2],[284,134,3],[294,148,4],[226,134,5],[304,124,6]])prop({t:'archbox',x:bx,y:by,n,layer:by>142?2:-2});
 await walk('you',206,80);face('you',1);
 await N('Mr. Adam, on the carpet, in his socks. Twenty-two archive boxes. One for every year.');
 await say('adam','(not looking up) You told me nobody ever told me I was good at it. So I thought: fine. Be good at it. Properly. Before the inspectors. Read everything I ever signed.','sad');
 await say('adam','Turns out I never read anything I ever signed. Sit. Help me. I don’t know what I’m looking for.','sad');
 pose('you','kneel');hold('adam','paper');
 await N('Sign-out sheets. Every kid who “transferred”. Friday, 3:20, every time.');
 await N('TYLER, 7th grade. Signed out Friday 3:20. On duty: Coach, Mr. Voss.');
 await N('ALEX, 8th grade. Signed out Friday 3:20. On duty: Mr. Kim, Ms. Loach.');
 await N('MADDOX, 6th grade, four years ago. Signed out Friday 3:20. On duty: Mr. Voss, Ms. Balduf.');
 let q1=await choose(['Coach.','Mr. Voss.','Mr. Kim.','Nobody. It’s different every time.'],'WHO WAS ON DUTY EVERY TIME?');
 if(q1!==3){await say('adam',q1===1?'Voss is on two. Not three. Look again. Maddox, Tyler… Alex was Kim and Loach.':'He’s on one of them. One. Look again.','scared');
  q1=await choose(['Mr. Voss. Close enough.','Nobody. It’s different every time.'],'LOOK AGAIN')===1?3:0}
 if(q1===3){await say('adam','Nobody. Different every time. So it’s not one of them. It’s all of them, taking turns. Like a… like a rota.','shock');crew().adamSharp=1}
 else await say('adam','No. No, it changes. Different names every time. It’s not one of them. It’s all of them. Taking turns.','shock');
 await N('At the bottom of every sheet: AUTHORISED BY. The same loopy handwriting. Two words.');
 const q2=await choose(['“Mr. Adam”. You signed them.','“Love, Miss”.','“Pat”. In capitals.','“Coach”, with a whistle drawn on it.'],'WHAT DOES THE SIGNATURE SAY?');
 if(q2!==1)await say('adam',q2===0?'Mine’s a squiggle and a full stop. That’s not mine. Look. Look at the little heart.':'No. Look. Little loopy letters. Two words. Where have you seen two words like that?','scared');
 await N('“Love, Miss.” Like the Trailer whiteboard. Every sheet. Since 1987.');
 A.adam.ex='cry';
 await say('adam','I signed the front pages. The covering letters. Twenty-two years. I never turned a single one over.','cry');
 await say('adam','(putting them in a folder, very carefully, like they might break) I’m turning them over now. All of them. On Friday. In front of the lanyards.','cold');
 crewEv().timesheets=1;crew().adamIn=1;save&&save();
 toast('🎁 EVIDENCE: Mr. Adam’s sign-out sheets. “Love, Miss.” Mr. Adam is with you.');
 /* and then she knocks */
 cue('tension',true);SFX.knock?SFX.knock():SFX.thud&&SFX.thud();
 await N('Three knocks on the office door. Soft. Friendly.');
 await say('shermian','(through the door) Gerry-bear? Everything all right in there? I heard crying.','smirk');
 const c=await choose(['Get down behind the desk. Don’t move.','Let Mr. Adam handle it.'],'MS. SHERMAN IS AT THE DOOR');
 if(c===0){await walk('you',150,90);face('you',1);pose('you','crouch');
  const ok=await vgSimon(4,'DON’T MOVE');
  put('shermian',-14,1,{y:152,ex:'smirk'});await walk('shermian',120,50);
  if(ok){await say('shermian','(looking round the room, slowly) …Just you, Gerald?','smirk');await say('adam','Just me. Just me and twenty-two years.','sad');
   await say('shermian','Don’t stay late, Gerry-bear. Inspections are SO tiring.','smirk');await walk('shermian',-20,50);remove('shermian')}
  else{await N('Your shoe squeaks on the carpet. She doesn’t walk round the desk. She doesn’t need to. She just smiles at the corner of it, right where you are.');
   await say('shermian','(to the desk) See you Friday, sweetie.','evil');await walk('shermian',-20,50);remove('shermian');crew().sherSeen=1}
  pose('you',null)}
 else{await say('adam','(wiping his face with his tie, very loud) Just NORMAL Friday crying, Mary! The usual!','scared');
  await say('shermian','(through the door, after a long pause) …See you Friday, Gerry-bear.','smirk');
  await say('adam','(whispering) She’s never once called me Gerry-bear to my face.','scared')}
 return 'stay'}});

/* ---------------- THE OTHER PAUL: THE SHOEBOX ---------------- */
spot({mis:'crew',room:'bus',period:0,x:200,y:150,label:'Paul Jones got off the 43 and is waiting for you',short:'PAUL',
 cond:()=>!D.weekend&&D.f&&D.f.pj3&&!(D.done&&D.done.pauljones)&&!crew().pjSafe&&!crew().pjKept&&(D.f.pjKind||0)>=2&&!D.dead.pauljones&&cal()<12,run:async()=>{
 scene('bus',{pauljones:[200,-1,{y:150,hold:'bag',ex:'sad'}],you:[-14,1,{y:156}]},true);
 await walk('you',170,80);face('you',1);
 await N('Paul Jones. Hood up. Backpack on his front, both arms round it.');
 await say('pauljones','You said I could talk to you. So. I’m talking.','sad');
 await say('pauljones','(opening the zip an inch) It’s my dad’s. From the shoebox. The code’s my birthday. That’s the only reason he remembers my birthday.','scared');
 await N('A shoebox, under a PE shirt. You don’t need to open it.');
 await say('pauljones','I took it Monday. I don’t know why. I keep bringing it. Every day it gets heavier. I don’t want to find out why I took it.','cry');
 cue('sad',true);
 const kind=(D.f.pjKind||0)>=3;
 const c=await choose([{t:'“Give it to me.”',dis:!kind,why:'he doesn’t trust you that much yet'},{t:'“We get rid of it. Right now. Together.”'},{t:'“Put it back tonight. Nobody has to know.”'}],'PAUL JONES HAS A GUN IN HIS BACKPACK');
 if(c===2){await say('pauljones','(zipping it up) …Yeah. Tonight. Okay.','sad');
  await N('He doesn’t look at you when he gets back on the bus. He’s still holding it like a baby.');crew().pjKept=1;return 'stay'}
 let gone=false;
 if(c===0){hold('pauljones',null);hold('you','bag');
  await N('He takes it off and holds it out. It’s heavier than anything you’ve ever held. Your arms know exactly what’s in it.');
  const d=await choose(['Take it to Pat. Pat will know what to do.','The storm drain. Now.'],'WHERE DOES IT GO');
  if(d===0){put('pat',-14,1,{y:150,ex:'cold'});await walk('pat',130,80);
   await say('pat','(taking the bag without opening it, not even a little bit surprised) I’ll handle it. I’ve handled worse in that kitchen. Go to class, sugar. Both of you.','cold');
   await walk('pat',-20,80);remove('pat');hold('you',null);gone=true}
  else gone=await drain()}
 else gone=await drain();
 async function drain(){
  await walk('you',260,60);await walk('pauljones',240,60);
  prop({t:'drain',x:276,y:160,layer:-3});
  await N('There’s a storm drain at the edge of the bus loop. Deep. You can hear water a long way down.');
  hold('you',null);hold('pauljones','bag');
  let ok=await vgThrow('DROP IT THROUGH THE GRATE');
  if(!ok){SFX.clank?SFX.clank():SFX.thud&&SFX.thud();await N('It catches on the grate. Half in, half out. A car door slams across the loop. Coach’s car.');
   ok=await mash('SHOVE IT THROUGH',{need:16,time:3,info:'Push it through before he sees!'})}
  SFX.splat&&SFX.splat();hold('pauljones',null);
  await N(ok?'A long drop. A splash. Gone.':'You both stamp on it until it drops. A long drop. A splash. Gone.');
  return true}
 if(gone){A.pauljones.ex='happy';
  await say('pauljones','(laughing, crying, both) I didn’t know what I was gonna do with it. Now I don’t have to know.','cry');
  hold('pauljones','book');
  await say('pauljones','(holding out his notebook) You should have this. The 43, from above. Look at the seats. Look at the red ones.','sad');
  await N('Red crosses. One empty seat a Friday. TYLER. ALEX. Older names. Two seats this week, already ringed.');
  await say('pauljones','Nobody noticed. I notice where everyone is. It’s the only thing I’m good at.','sad');
  crew().pjSafe=1;crewEv().seats=1;joinCrew('pauljones');
  toast('🎁 EVIDENCE: Paul Jones’s seating plan. The empty seats. Paul is with you.')}
 return 'stay'}});
/* the last ride, when the gun is already gone */
{const r=typeof RIDE!=='undefined'&&RIDE.find(x=>x.id==='pjLast');if(r){const run=r.run;r.run=async function(){
 if(!crew().pjSafe)return run.apply(this,arguments);
 cue('romance');
 await N('The last ride home. Inspection Day. Everyone is loud. Paul Jones gets up from the back seat and walks down the middle of the bus.');
 A.pauljones.pose=null;await walk('pauljones',A.you.x+16,40);A.pauljones.pose='sit';face('pauljones','you');
 await N('He sits down next to you. That’s it. That’s the whole thing. His backpack is empty and it flops on the floor like a dead fish.');
 if(onBus('arjun')){await say('arjun','(from the middle) Ayo, Off-Brand P—','smirk');
  await say('pauljones','(not loud, not looking round) It’s Paul.','cold');
  await say('arjun','(after a really long time) …Paul. My bad.','shock')}
 await say('pauljones','(looking out of the window) I think I’m gonna sit at the front on Monday.','happy');
 await complete('pauljones','safe')}}}
if(MIS.pauljones){MIS.pauljones.variants=Object.assign(MIS.pauljones.variants||{},{safe:'Nothing happened'})}
OUTCOME_FIX['pauljones:safe']='good';

/* ---------------- GIANT: PUSH ---------------- */
spot({mis:'crew',room:'field',period:4,x:200,y:150,label:'Coach is dragging a seventh grader off the field',short:'!',
 cond:()=>!D.weekend&&D.done&&D.done.giant&&!crewEv().hatchkey&&!D.dead.coach&&!D.dead.jacob&&cal()<12&&D.f.pushTry!==cal(),run:async()=>{
 D.f.pushTry=cal();
 scene('field',{coach:[230,-1,{y:148,pose:'grab',ex:'smirk'}],kid3:[246,-1,{y:150,ex:'scared'}],jacob:[150,1,{y:150}],you:[-14,1,{y:156}]},true);
 await walk('you',120,90);face('you',1);cue('tension',true);
 await N('Coach has a seventh grader by the hood. Two lines in the grass, towards the gym.');
 await say('coach','Extra practice, champ. Equipment cupboard. Very special drills.','smirk');
 await N('The kid looks at you. Then at Jacob. Jacob’s hands open and close.');
 await say('jacob','(very quietly) He’s little. He’s so little.','scared');
 const c=await choose(['“Jacob. Push.”','Go for the kid yourself.','Yell at the kid to RUN.'],'COACH HAS A SEVENTH GRADER');
 const push=async()=>{if(A.you.x>170)await walk('you',150,120);await walk('jacob',212,140);pose('jacob','grab');
  const ok=await mash('PUSH',{need:26,time:4,info:'Jacob is pushing. Push WITH him!'});
  if(ok){SFX.smack&&SFX.smack();shake(1.2);await tw(A.coach,{x:A.coach.x+18},180);pose('coach','lie');const kp=prop({t:'keys',x:A.coach.x-20,y:156,layer:-1});A.coach.ex='shock';pose('kid3',null);
   await walk('kid3',-20,140);remove('kid3');
   await N('Coach goes six feet backwards and lands flat on his back on the track. His lanyard snaps. Keys everywhere.');
   pose('jacob',null);A.jacob.ex='shock';
   await say('jacob','(looking at his own hands) I pushed. I pushed Coach. I’ve never… I’ve never.','shock');
   await say('coach','(on his back, sand in his hair, smiling at the sky) Big lad. Friday, big lad.','evil');
   await walk('you',A.coach.x-24,80);pose('you','kneel');await wait(300);pose('you',null);hold('you','key');{const i=props.indexOf(kp);if(i>=0)props.splice(i,1)}
   await N('You pick up the lanyard. A whistle. A car key. And an old iron key, black with age, stamped B.R. — the boiler room hatch.');
   crewEv().hatchkey=1;joinCrew('jacob');
   if(D.f.bear||(D.done&&D.done.giant))await say('jacob','(still looking at his hands, then at you) A teddy bear that pushes back. That’s just a bear.','happy');
   toast('🎁 EVIDENCE: Coach’s lanyard. The boiler hatch key. Jacob is with you.');return true}
  pose('jacob',null);
  await N('Jacob pushes. Coach doesn’t move. Coach just looks at Jacob’s hands on his chest, then at Jacob, and smiles.');
  await say('coach','Big lad. Not today, big lad.','evil');
  pose('kid3',null);await walk('kid3',-20,140);remove('kid3');
  await N('He lets the kid go to deal with Jacob, and the kid runs. Coach straightens his lanyard and walks away. Tomorrow. There’s always tomorrow.');
  await walk('coach',340,60);remove('coach');return false};
 if(c===0)await push();
 else if(c===1){await walk('you',220,120);pose('you','grab');
  const ok=await mash('PULL THE KID FREE',{need:30,time:4});pose('you',null);
  if(ok){pose('kid3',null);await walk('kid3',-20,140);remove('kid3');await N('The kid comes free. Coach turns round. Now he’s got your hood instead.');pose('coach','grab')}
  await say('jacob','(walking over, not fast) Let go of them, Coach.','cold');await push()}
 else{await say('you','RUN!');pose('kid3',null);await walk('kid3',-20,160);remove('kid3');
  await N('The kid twists out of the hoodie and runs. Coach is left holding an empty hood. He turns round slowly to see who yelled.');pose('coach',null);
  const ok=await vgRace('coach');
  if(ok){await N('You make it to the bus loop. Behind you, very faintly: a whistle. One long note.');remove('coach')}
  else{await N('He’s faster than he looks. His hand closes on your collar. And then Jacob is there.');pose('coach','grab');await push()}}
 return 'stay'}});

/* the objective line points at a core-cast scene when the main story is waiting */
{const _sn=storyNow;storyNow=function(){const s=_sn();if(!s||s.i>=98||!D||D.weekend)return s;
 if(!/crew is meeting|Everything’s ready/.test(s.goal||''))return s;const e=crew().ev||{};
 if(D.done&&D.done.headcase&&!e.timesheets&&!D.dead.adam)return{i:s.i,t:'Head Case',goal:'Mr. Adam is going through twenty-two years of boxes. Front Hall, his office, break or lunch.'};
 if(D.done&&D.done.giant&&!e.hatchkey&&!D.dead.coach)return{i:s.i,t:'Giant',goal:'Coach takes kids off the field at lunch. Jacob is watching. Playing Field, lunch.'};
 if(D.f&&D.f.pj3&&!crew().pjSafe&&!crew().pjKept&&(D.f.pjKind||0)>=2)return{i:s.i,t:'The Other Paul',goal:'Paul Jones wants to talk. Bus loop, before school.'};
 return s}}

/* focus: the featured set is the core cast. Fringe one-offs stay in the game but don't nag. */
if(typeof FEATURED!=='undefined')for(const m of['jade','stall','ringing','stain','steal_mia','flimbus'])FEATURED.delete(m);

/* props: archive boxes, the storm drain, Coach's dropped keys */
{const _dp=drawProp;drawProp=function(p){const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='archbox'){R(x-9,y-12,18,12,'#b89a6a');R(x-9,y-12,18,2,'#d8bc88');R(x-3,y-8,6,3,'#f4ecd8');R(x-9,y-1,18,1,'#6a5a3a');px(String(1998+p.n*4).slice(2),x-3,y-8,'#3a2a1a');return}
 if(p.t==='drain'){R(x-12,y-3,24,6,'#2a2a2e');for(let i=0;i<6;i++)R(x-11+i*4,y-2,2,4,'#5a5a62');R(x-12,y-3,24,1,'#7a7a82');return}
 if(p.t==='keys'){R(x-6,y,12,1,'#c8c0a0');R(x-7,y-2,3,3,'#e0c040');R(x+3,y-1,4,2,'#3a3a3a');R(x+6,y-2,2,3,'#9a9aa2');return}
 return _dp(p)}}
