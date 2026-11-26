'use strict';
/* =====================================================================
   HIGHSCHOOL — ANY REACTION, REMASTERED (side mission, insane)
   Ms. Loach has said "page forty-seven" every lesson since 2009.
   Act 1 (Period 3, the old stunts) stays. Then it turns into a heist:
   2. Break/lunch, Cafeteria: Angelo sells you a replica of her mug.
   3. Period 7, Science: THE SWAP. She ignores everything except the mug,
      and the only time she looks down is when she says "page forty-seven"
      and turns the page. So: get a classmate to ask her something, and
      swap the mugs while she turns it (meter). Fail = her hand on your
      wrist; try another day.
   4. Lunch, Cafeteria: THE HOSTAGE. You on a table, her real mug over
      your head, the whole cafeteria chanting. Hand it back (she says
      "page forty-eight" and the entire cafeteria, Coach included, sits
      down and learns photosynthesis), drop it (the scream: every window
      comes in), or drink it (the scissors).
   ===================================================================== */
ITEMS.fakemug='Angelo’s replica of Ms. Loach’s mug (aged with a teabag and a hairdryer)';
ITEMS.realmug='MS. LOACH’S MUG. The real one. Still warm.';
Object.assign(DEATHS,{mug:DEATHS.mug||{name:'Earl Grey',desc:'You drank from Ms. Loach’s mug.',hint:'Never drink from the mug.'}});
if(MIS.loach){
 Object.assign(MIS.loach,{
  goal:'Get ANY reaction out of Ms. Loach. Anything except “page forty-seven”.',
  parts:['Period 3, Science: escalate','Break or lunch, Cafeteria: Angelo’s replica','Period 7, Science: the swap','Lunch, Cafeteria: the hostage'],
  tips:['Period 3, Science. Everyone gets a turn. So do you.','Break or lunch, the Cafeteria. Angelo has something “for collectors”.','Period 7, Science. She only looks down when she turns the page.','Lunch, the Cafeteria. Get up on a table. Hold it high.'],
  variants:{fortyeight:'Page forty-eight',scream:'The scream',drink:'Earl Grey'}});
 /* the old Period 7 ending is folded into act 4 */
 for(let i=HOOKS.length-1;i>=0;i--)if(HOOKS[i].mis==='loach'&&HOOKS[i].period===6)HOOKS.splice(i,1);
}
OUTCOME_FIX['loach:fortyeight']='good';OUTCOME_FIX['loach:scream']='messy';OUTCOME_FIX['loach:drink']='bad';
const arHere=n=>K[n]&&!(D.dead&&D.dead[n])&&!(window.EDITION_CUT||[]).includes(n);

/* ---- 2. the replica ---- */
spot({mis:'loach',room:'canteen',period:[2,4],x:176,y:150,label:'Angelo is selling something “for collectors”',short:'ANGELO',
 cond:()=>MIS.loach&&D.f.loach1&&!has('fakemug')&&!has('realmug')&&!D.f.loach3&&!D.done.loach&&arHere('angelo'),run:async()=>{
 scene('canteen',{angelo:[176,-1,{y:150,ex:'smirk',hold:'mug'}],you:[-14,1,{y:156}]},true);
 await walk('you',148,90);face('you',1);
 await say('angelo','Heard you want her mug. Everybody wants her mug. I’ve got the only replica in Fair City.','smirk');
 await say('angelo','Same chip on the handle. Same tea ring inside. I aged it with a teabag and a hairdryer. Five bucks. I’ve sold eleven.','smirk');
 const c=await choose([{t:'Pay $5.',dis:(D.money||0)<5,why:'you’re broke'},'Haggle.','Grab it and walk.'],'THE REPLICA');
 if(c===0){D.money-=5;updateLoc&&updateLoc();await say('angelo','Pleasure. Don’t tell her where you got it. She knows where I live. Everybody knows where I live.','smirk')}
 else if(c===1){await say('you','Three.');await say('angelo','(looking at you for a long time) …Three. And you never saw me.','smirk');D.money=Math.max(0,(D.money||0)-3);updateLoc&&updateLoc()}
 else{hold('angelo',null);hold('you','mug');const ok=await vgRace('angelo');
  if(ok)await N('You’re out of the cafeteria before he’s off his chair. From behind you, quite proud: “That’s my boy.”');
  else{await N('Angelo catches you at the door and takes five dollars out of your pocket without asking. Then he lets you keep the mug. Business is business.');D.money=Math.max(0,(D.money||0)-5);updateLoc&&updateLoc()}}
 hold('angelo',null);hold('you',null);give('fakemug');part('loach',2);
 return 'stay'}});

/* ---- 3. the swap ---- */
hook({mis:'loach',period:6,room:'science',who:'auto',cond:()=>MIS.loach&&has('fakemug')&&!D.f.loach3&&D.f.loachTry!==cal(),run:async()=>{
 D.f.loachTry=cal();
 const kids=['hasan','sean','stella','abby'].filter(arHere);
 const c=await classIn('science',{kids,fixed:Object.fromEntries(kids.map((n,i)=>[n,[0,1,6,7][i]])),you:2});
 cue('class');hold('loach','mug');
 await N('Period 7. Science. Angelo’s replica is in your hoodie pocket. Her real mug is in her hand. It goes back on the ring, every time.');
 await say('loach','Page forty-seven.');
 await N('Then you see it. When she says it, she turns a page. And for one second, she looks down.');
 const asks={hasan:['Hasan','(hand up) Miss, is God real?'],sean:['Sean','(hand up) Miss, my house is on fire. Like, right now. I can see it from here.'],stella:['Stella','(hand up) Miss, what page are we on?'],abby:['Abby','(hand up, very calm) Miss, there’s someone standing behind you.']};
 const who=kids.filter(k=>asks[k]);
 const opts=who.map(k=>'Get '+asks[k][0]+' to ask her something.').concat(['Ask her yourself.']);
 const pi=await choose(opts,'MAKE HER TURN THE PAGE');
 let asker='you',easy=1;if(pi<who.length){asker=who[pi];easy=0.85}
 await Promise.all([walk('you',96,70),tw(A.you,{y:140},400)]);
 if(asker==='you')await say('you','Miss? What page are we on?');else await say(asker,asks[asker][1],'happy');
 hold('loach',null);const dm=prop({t:'mug',x:66,y:122,layer:3});
 await say('loach','Page forty-seven.');
 pose('you','reach');
 const ok=await meter('SWAP IT WHILE SHE TURNS THE PAGE',{speed:1.15*easy});
 pose('you',null);
 if(!ok){ex('loach','evil');SFX.sting();fxState.dark=.3;
  await N('Her hand is round your wrist before the page lands. She doesn’t squeeze. She doesn’t need to.');
  {const i=props.indexOf(dm);if(i>=0)props.splice(i,1)}hold('loach','mug');
  await say('loach','Don’t.','evil');fxState.dark=0;ex('loach',null);
  await Promise.all([walk('you',c.mine.x,80),tw(A.you,{y:c.mine.y},400)]);A.you.dir=-1;
  await N('Not today. The replica is still in your pocket. There’s always another Period 7.');
  await classOut(c);return}
 SFX.click&&SFX.click();take('fakemug');give('realmug');{const i=props.indexOf(dm);if(i>=0)props.splice(i,1)}
 await Promise.all([walk('you',c.mine.x,80),tw(A.you,{y:c.mine.y},400)]);A.you.dir=-1;
 hold('loach','mug');
 await N('Swapped. Her real mug is in your hoodie, warm against your stomach. She picks up Angelo’s replica and takes a sip.');
 await N('She stops. She looks into it for a very long time.');
 await say('loach','…Page forty-seven.');
 if(A.hasan)await say('hasan','(whispering, ashen) Bro. She knows. She KNOWS.','scared');
 D.f.loach3=1;part('loach',3);await classOut(c);
}});

/* ---- 4. the hostage ---- */
spot({mis:'loach',room:'canteen',period:4,x:160,y:148,label:'Get up on the middle table with her mug',short:'MUG',
 cond:()=>MIS.loach&&has('realmug')&&!D.done.loach,run:async()=>{
 const crowd=['hasan','paul','kenneth','angelo','stella','sean','abby','jacob','arjun','david'].filter(arHere).slice(0,8);
 const cast={you:[160,1,{y:146}],pat:[290,-1,{y:132}]};crowd.forEach((n,i)=>cast[n]=[i<4?30+i*24:214+(i-4)*22,i<4?1:-1,{y:150+(i%2)*4}]);
 scene('canteen',cast,true);
 await tw(A.you,{z:16},350);hold('you','mug');pose('you','up');cue('fight',true);
 await N('You climb up on the middle table and hold the mug over your head. The real one. The chip. The ring.');
 SFX.cheer&&SFX.cheer();for(const n of crowd)if(A[n]){A[n].ex='laugh';pose(n,'cheer')}
 await say(crowd[0]||'pat','MUG! MUG! MUG! MUG!','yell');
 put('loach',-14,1,{y:150,ex:null,hold:'mug'});for(const n of crowd)if(A[n]){pose(n,null);A[n].ex='shock'}
 await walk('loach',132,40);face('loach',1);cue('tension',true);
 await N('Ms. Loach walks in. She doesn’t hurry. She’s holding Angelo’s replica. She has known since Period 7.');
 await say('you','Say something else. Anything. And you get it back.');
 await wait(1200);
 const c=await choose(['Hand it back.','Drop it.','Drink from it.'],'MS. LOACH IS WAITING');
 if(c===0){await tw(A.you,{z:0},300);pose('you',null);await walk('you',146,40);hold('you',null);hold('loach','mug');
  SFX.sting&&SFX.sting();loachCover(false);A.loach.ex='happy';flash('#ffffff',.3);fxState.dark=.2;
  await N('She takes it with both hands. Then she reaches up and pulls off the big satin cover. Her cornrows are a week past saving. For the first time since 2009, Ms. Loach smiles.');
  await say('loach','Page forty-eight.','happy');fxState.dark=0;
  if(!D.dead.coach){put('coach',334,-1,{y:150,hold:'cup'});await walk('coach',250,60)}
  for(const n of Object.keys(A))if(n!=='loach'&&n!=='you'&&A[n]&&!A[n].dead){pose(n,'sit');hold(n,'book');A[n].ex=null}
  pose('you','sit');hold('you','book');
  await N('Every kid in the cafeteria sits down on the floor. Then Pat. Then Coach, who only came in for a yogurt. Nobody decided to. Everybody has a notebook. Nobody brought a notebook.');
  await say('loach','Photosynthesis.','happy');
  await N('For eleven minutes, the entire cafeteria learns photosynthesis. It is the best lesson anyone in this building has ever had. Nobody ever mentions it again.');
  for(const n of Object.keys(A)){pose(n,null);hold(n,null)}
  await walk('loach',-20,40);remove('loach');
  take('realmug');await complete('loach','fortyeight');return 'stay'}
 if(c===1){hold('you',null);SFX.glass&&SFX.glass();
  for(let i=0;i<14;i++)parts.push({x:A.you.x,y:A.you.y-20,vx:rand(-60,60),vy:rand(-80,-10),c:'#e8e0d0',s:2,fy:158,life:1.2});
  await wait(500);A.loach.ex='scream';hold('loach',null);
  SFX.scream&&SFX.scream();flash('#ffffff',.9);shake(2.2);
  for(let i=0;i<60;i++)parts.push({x:rand(10,310),y:rand(10,60),vx:rand(-40,40),vy:rand(20,120),c:i%3?'#c8e0f0':'#ffffff',s:2,fy:rand(140,170),life:1.6});
  for(const n of Object.keys(A))if(n!=='loach'&&A[n]&&!A[n].dead){pose(n,'cover');A[n].ex='scared'}
  await N('Ms. Loach screams. It’s the first sound she’s made since 2009 that isn’t a page number. Every window in the cafeteria comes in at once.');
  if(A.pat)await say('pat','(from under the counter, hairnet gone) MY GRAVY.','yell');
  await wait(600);A.loach.ex=null;pose('loach','kneel');
  await N('Then silence. She kneels down and picks up the pieces of the mug, one at a time, in no hurry, while forty kids pick glass out of their hair.');
  await say('loach','(standing up, holding the pieces) Page forty-seven.');
  await walk('loach',-20,40);remove('loach');for(const n of Object.keys(A))pose(n,null);
  await tw(A.you,{z:0},300);pose('you',null);take('realmug');await complete('loach','scream');return 'stay'}
 /* drink */
 pose('you','drink');SFX.slurp&&SFX.slurp();
 await say('you','(sipping) Mmm. Earl Grey. Four sugars.');
 hold('you',null);pose('you',null);A.loach.ex='evil';fxState.dark=.35;
 await N('Ms. Loach puts the replica down on the next table. From her cardigan pocket she takes the big orange scissors. She climbs onto the table with you. She doesn’t hurry at all.');
 hold('loach','knife');await tw(A.loach,{z:16,x:A.you.x-12},500);pose('loach','slam');await wait(250);
 SFX.squelch&&SFX.squelch();blood(A.you.x,A.you.y-24-16,70,1,120,A.you.y+2);shake(1.2);
 take('realmug');fxState.dark=0;await die('mug');
}});

/* her mug, set down on the desk while she turns the page */
{const _dp=drawProp;drawProp=function(p){if(p.t!=='mug')return _dp(p);const x=Math.round(p.x),y=Math.round(p.y);
 R(x-3,y-6,6,6,'#e8e2d4');R(x-3,y-6,6,1,'#5a3a22');R(x+3,y-5,2,3,'#e8e2d4');R(x+4,y-4,1,1,'#2a2a2a');R(x-2,y-1,1,1,'#b0a898')}}
