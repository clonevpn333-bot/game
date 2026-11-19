'use strict';
/* =====================================================================
   HIGHSCHOOL — rewrites, part B: Any Reaction, Group Project, Bake Off.
   ===================================================================== */

/* =================================================================
   ANY REACTION — Ms. Loach
   ================================================================= */
dropHooks('loach');
Object.assign(MIS.loach,{
 blurb:'Ms. Loach has said “page forty-seven” every lesson since 2009. The class has decided to find out what it takes to make her say anything else.',
 parts:['Period 3, Science: escalate','Period 7, Science: the worst thing possible'],
 tips:['Period 3, Science. Everyone gets a turn. So do you.','Period 7, Science. You know what she cares about now. Hasan doesn’t.']});

hook({mis:'loach',period:3,room:'science',who:'auto',run:async()=>{
 const c=await classIn('science',{kids:['paul','kenneth','jacob','angelo','abby'].filter(n=>!D.dead[n]),fixed:{paul:0,kenneth:1,angelo:2,jacob:3,abby:6},you:7});
 cue('class');hold('loach','mug');
 await N('Period 3. Science. Ms. Loach is marking at her desk with her mug in her left hand. She has been marking the same pile since you were in sixth grade.');
 await say('loach','Page forty-seven.');
 await scrawl('science',['P.47'],'#3a4a3a');
 await N('She sits back down. That’s the whole lesson plan. It’s always been the whole lesson plan.');
 await say('paul','I bet you a buck I can make her react.','smirk');
 await say('angelo','I’ll take that. I’ll take that bet and I’ll open a book on it. Odds are forty to one.','smirk');
 if(A.kenneth){
  await say('kenneth','Watch. Miss? Can I go to the bathroom?');
  await say('loach','Mm.');
  await walk('kenneth',-16,80);await wait(900);
  put('kenneth',-16,1,{y:133});A.kenneth.hs='cone';await walk('kenneth',c.seats[1].x,80);A.kenneth.dir=-1;
  await N('He comes back with a traffic cone on his head. Orange. Full size. It goes down past his ears.');
  await say('loach','Mm.');
  await say('kenneth','(from inside the cone) I can’t see. I went into the girls’. I think I’ve been barred.','sad');
 }
 if(A.paul&&A.kenneth){
  await say('paul','Amateur. Kenneth, come here.','smirk');
  await say('kenneth','(still in the cone) No.');
  await walk('paul',A.kenneth.x+12,70);pose('paul','grab');await wait(250);
  hop('paul',8,360);await hop('kenneth',16,420);A.kenneth.pose='lie';A.kenneth.y=128;SFX.thud();shake(.8);pose('paul','cheer');
  await N('Paul suplexes Kenneth onto the lab bench. The cone flies off and lands upright on the Bunsen burner.');
  await say('loach','Mm.');
  await say('kenneth','(lying in the sink) That was my spine. I’m fine. That was my whole spine.','hurt');
  pose('paul',null);await walk('paul',c.seats[0].x,70);
 }
 if(A.angelo){
  await say('angelo','Children. Watch a professional.','smirk');
  await walk('angelo',150,60);pose('angelo','reach');
  prop({t:'fire',x:150,y:148,w:12,n:9});prop({t:'smoke',x:150,y:132});SFX.fire();
  await N('Angelo lights the trash can. Then, with real care, he lights the trash can inside the trash can.');
  await say('loach','(turning a page) Mm-hm.');
  pose('angelo',null);await walk('angelo',c.seats[2].x,60);
 }
 if(A.jacob&&A.paul){
  await walk('paul',A.jacob.x-12,70);pose('paul','grab');await tw(A.jacob,{x:A.jacob.x+6},120);SFX.thud();pose('paul',null);
  await say('jacob','STOP. PUSHING. ME.','yell');
  hold('jacob','chair');pose('jacob','throw');await wait(260);SFX.glass();shake(1);hold('jacob',null);pose('jacob',null);
  await N('Jacob throws a lab stool through the window. It lands in the parking lot. A car alarm starts. Nobody laughs. You don’t laugh at Jacob.');
  await say('loach','Page forty-seven.');
  await walk('paul',c.seats[0].x,60);
 }
 if(A.abby)await say('abby','(whispering to you) She hasn’t looked up once. Not once. Not even at the fire.','shock');
 const p=await choose(['Smash the fire alarm.','“Miss. The school is on fire.”','Reach for her mug.'],'Your turn.');
 if(p===0){SFX.bell();SFX.bell();await N('You smash the fire alarm. The sprinklers come on. Everyone evacuates except Ms. Loach, who turns a damp page with a damp finger.');await say('loach','Page forty-seven.')}
 if(p===1){await say('you','Miss. The school is on fire.');await say('loach','It is.');await say('loach','Mm.')}
 if(p===2){
  A.you.pose=null;await Promise.all([walk('you',84,80),tw(A.you,{y:140},400)]);pose('you','reach');
  ex('loach','evil');SFX.sting();fxState.dark=.3;
  await N('Her hand is round your wrist before you finish the thought. She doesn’t squeeze. She doesn’t need to. She looks at you like she’s working out which drawer you’d fit in.');
  await say('loach','Don’t.','evil');
  fxState.dark=0;ex('loach',null);pose('you',null);
  await say('loach','Page forty-seven.');
  await Promise.all([walk('you',c.mine.x,80),tw(A.you,{y:c.mine.y},400)]);A.you.dir=-1;
 }else if(A.abby){await say('abby','(whispering) Wait. Earlier. Kenneth’s cone nearly knocked her mug. She LOOKED. Like, really looked.','shock')}
 intel('loachMug');
 await N('Under the dust on her desk there’s a ring where the mug always goes. It’s worn into the wood, perfectly round, like it’s been put back in exactly the same place ten thousand times.');
 if(typeof lore==='function')lore('mugring');
 await classOut(c);
 D.f.loach1=1;part('loach',1);
}});

hook({mis:'loach',period:6,room:'science',who:'auto',cond:()=>D.f.loach1,run:async()=>{
 const kids=['hasan','abby','sean','stella'].filter(n=>!D.dead[n]);
 const c=await classIn('science',{kids,fixed:Object.fromEntries(kids.map((n,i)=>[n,[0,1,6,7][i]])),you:2});
 cue('class');hold('loach','mug');
 await N('Period 7. Science. The window is still broken from Period 3. There’s a lab stool in the parking lot. Ms. Loach has not noticed. Her mug is back on the ring.');
 await say('loach','Page forty-seven.');
 if(A.hasan)await say('hasan','(leaning over) Paul told me about Period 3. The fire. The cone. I’ve got something worse.','smirk');
 const o=[{t:'Let Hasan drink from her mug.',dis:!A.hasan,why:'Hasan isn’t here'},{t:'Drink from her mug yourself.'},{t:'Flood the room from every tap.'}];
 const ch=await choose(o,'The worst thing possible.');
 if(ch===2){SFX.slurp();await N('Twenty minutes later the water is up to your knees. A textbook floats past like a little sad boat. It’s open at page forty-seven.');await say('loach','Page forty-seven.');await classOut(c);return}
 const who=ch===0?'hasan':'you';
 A[who].pose=null;await Promise.all([walk(who,84,70),tw(A[who],{y:140},400)]);
 hold('loach',null);hold(who,'mug');pose(who,'drink');SFX.slurp();
 if(who==='hasan')await say('hasan','Mmm. Earl Grey. Bit cold. FOUR sugars? Miss, that’s a cry for help.','happy');
 else await say('you','Mmm. Earl Grey.');
 hold(who,null);pose(who,null);D.f.mugGone=1;
 await evil('loach','evil');fxState.dark=.35;
 await N('Ms. Loach stands up. She opens her top drawer. She takes out the big orange scissors, the ones for cutting card, and she doesn’t hurry at all.');
 A.loach.pose=null;hold('loach','knife');await walk('loach',74,50);
 ex(who,'scared');
 if(who==='hasan')await say('hasan','Miss? Miss, why have you got the—','scared');
 pose('loach','slam');await wait(250);SFX.squelch();blood(A[who].x,A[who].y-24,70,1,120,A[who].y+2);wallSplat(100,70,12);shake(1.2);
 kill(who,'lie',{pool:36,bleed:3});
 await N('Three times. In the neck. She keeps the face she uses for page forty-seven the whole way through.');
 await N('Then she rinses the scissors in the sink, dries them on her cardigan, picks the mug up off the floor, and sits back down.');
 fxState.dark=0;pose('loach','sit');A.loach.x=66;A.loach.y=132;ex('loach',null);hold('loach','mug');
 SFX.slurp();
 await say('loach','Page forty-seven.');
 if(who==='you')await die('mug');
 if(A.abby)await say('abby','…That’s the most she’s ever done.','shock');
 if(A.sean)await say('sean','Are we… still doing page forty-seven?','shock');
 await say('loach','Mm.');
 await classOut(c);
 await complete('loach','hasan');
}});

/* =================================================================
   GROUP PROJECT — Ms. Balduf
   ================================================================= */
dropHooks('group');
Object.assign(MIS.group,{
 blurb:'Ms. Balduf wants a group presentation on “What Friendship Means”. Twenty minutes. Everybody has a job. Everybody has to have the RIGHT job.',
 parts:['Give everyone a job','Present it'],
 tips:['Period 3, English. Think about who everyone actually is.','']});
hook({mis:'group',period:3,room:'english',who:'auto',run:async()=>{
 const ppl=['hasan','david','nivaan','omer','sean','stella','aidan'].filter(n=>!D.dead[n]&&!(n==='aidan'&&D.f.aidanDead));
 const fixed={};ppl.forEach((n,i)=>fixed[n]=[0,1,2,3,5,6,7][i]);
 const c=await classIn('english',{kids:ppl,fixed,you:8});
 cue('class');
 await N('Period 3. English. Ms. Balduf has pushed the desks into one long table. That’s never good.');
 await say('balduf','Group project, darlings! “What Friendship Means.” You present in twenty minutes. In front of everyone. With feeling.','happy');
 await scrawl('english',['GROUP PROJECT','WHAT FRIENDSHIP','MEANS','20 MINUTES'],'#a02020');
 await say('balduf','If it is bad, I’ll know. I always know.','evil');fxState.red=1;SFX.sting();await wait(400);fxState.red=0;ex('balduf','happy');
 if(A.hasan)await say('hasan',(D.mp.bully?'(waving a bandaged hand) ':'')+'Right. Jobs. Nobody give me anything that needs hands.');
 if(A.aidan&&!D.f.bullied)await say('aidan','(very quietly) I’ve never been in a group before.');
 else if(A.aidan)await say('aidan','(from the end of the table, not looking up) Don’t give me a job. Nobody ever does.');
 const JOBS=[['Make the slides','david','David’s got a laminator at home. He’s laminated his birth certificate.'],['Film it','nivaan','Nivaan’s phone has never once not been recording.'],['Do the voice-over','sean','Sean’s voice is, annoyingly, gorgeous.'],['Write the jokes','hasan','Hasan has a joke for everything. Some of them are good.'],['Stand at the front and look scary','omer','Omer can make a room go quiet by folding his arms.'],['Write the poem','aidan','Aidan writes poems. You’ve heard one. It was good, which was the worst part.']];
 let score=0,used=new Set(),as={};
 for(const [job,right] of JOBS){const cands=ppl.filter(n=>!used.has(n)&&n!=='stella');if(!cands.length)break;const i=await choose(cands.map(n=>K[n].n),'Who should '+job.toLowerCase()+'?');const w=cands[i];used.add(w);as[job]=w;if(w===right)score++}
 const aidanIn=as['Write the poem']==='aidan';
 await N('Twenty minutes later.');
 const front=[...used];
 for(let i=0;i<front.length;i++){const a=A[front[i]];a.pose=null;tw(a,{y:146},400);walk(front[i],70+i*30,70)}
 if(A.stella){A.stella.pose=null;tw(A.stella,{y:150},400);walk('stella',70+front.length*30,70)}
 await settle(4);for(const n of front)face(n,1);
 await scrawl('english',['WHAT FRIENDSHIP','MEANS','BY 10B'],'#2a3a6a');
 for(const [job,right] of JOBS){
  const w=as[job];if(!w)continue;const good=w===right;
  if(job==='Make the slides'){pose(w,'point');await say(w,good?'Slide one. A graph of everyone we’ve ever fallen out with. It goes up. Slide two: it comes back down. That’s friendship.':'Slide one. It’s… it’s a picture of my thumb. I don’t know how that got in.',good?'happy':'shock');pose(w,null)}
  if(job==='Film it'){pose(w,'film');await say(w,good?'We’re live! Ninety viewers! Say hi to chat, Miss!':'I pressed record. I think. Is it the red one, or the other red one?',good?'happy':'shock');pose(w,null)}
  if(job==='Do the voice-over')await say(w,good?'(in a voice so deep and smooth the radiator stops knocking) “Friendship. It’s a Friday. And it’s forever.”':'(voice cracking) “FRIENDship— it’s, um—”',good?'closed':'shock');
  if(job==='Write the jokes')await say(w,good?'What do you call a group of friends with one brain cell between them? 10B. Thank you, I’ve been Hasan.':'Friendship is… when… knock knock?',good?'laugh':'sad');
  if(job==='Stand at the front and look scary'){pose(w,'cross');await say(w,good?'(standing at the front in shorts, arms folded, so scary that nobody heckles)':'(standing at the front, waving nervously)',good?'angry':'scared')}
  if(job==='Write the poem')await say(w,good?'“Friendship is a Friday that finally ends. Thank you for ending it with me.”':'“Roses are red. Er. Friends are also red. Sometimes.”',good?'sad':'shock');
 }
 if(score>=5){
  cue('romance');fxState.romance=.4;classLaugh(400);
  await say('balduf','(sobbing into a tissue) That was… BEAUTIFUL. A-PLUS. EVERYONE. Group hug. Not you, Hasan, you’re still bleeding.','cry');
  for(const n of front)pose(n,'cheer');
  if(aidanIn){await say('aidan','(to you, so quietly nobody else hears) Nobody’s ever given me a job before. In a group. With people.','happy');D.f.aidanIncluded=1}
  fxState.romance=0;await classOut(c);
  await complete('group',aidanIn?'aidan':'without');return;
 }
 if(score>=3){
  await say('balduf','…C-minus.','angry');
  const v=front[0];hold('balduf','pen');await walk('balduf',A[v].x-12,80);pose('balduf','slam');SFX.squelch();A[v].hurt=2;blood(A[v].x,A[v].y-16,14,1,50,A[v].y+2);hold('balduf',null);pose('balduf',null);
  await N('She writes the C on '+nameOf(v)+'’s hand. With the nib. She has lovely handwriting.');
  await classOut(c);part('group',1);return;
 }
 await evil('balduf');
 await say('balduf','That was a grammatical, emotional and spiritual WAR CRIME.','evil');
 await walk('balduf',A.you.x-14,160);hold('balduf','pen');pose('balduf','slam');
 SFX.squelch();A.you.hurt=3;blood(A.you.x,A.you.y-22,50,-1,90,A.you.y+2);shake(1.2);kill('you','lie',{pool:30});
 await N('F-minus. She writes it on your forehead. Then through it.');
 await die('fminus');
}});

/* =================================================================
   BAKE OFF — Mrs. Kettle
   ================================================================= */
dropHooks('bakeoff');
Object.assign(MIS.bakeoff,{blurb:'Mrs. Kettle runs Food Tech like a TV show. Star Baker gets a sticker. Worst Baker goes in the industrial oven. Brandon is already sweating.',tips:['Period 1, Food Tech. You’re on Kayden’s bench. Brandon’s is right behind you.']});
hook({mis:'bakeoff',period:1,room:'foodtech',who:'auto',run:async()=>{
 const c=await classIn('foodtech',{kids:['tez','mia','kayden','brandon'].filter(n=>!D.dead[n]),fixed:{tez:0,brandon:1,mia:2,kayden:4},you:5});
 cue('class');
 await N('Period 1. Food Tech. The industrial oven is already on. It’s always on. The little window glows orange, and it hums, and the hum sounds hungry.');
 await say('kettle','Welcome to the Bake Off, my little dumplings! Victoria sponge. Forty minutes. Star Baker gets a sticker!','happy');
 await scrawl('foodtech',['STAR BAKER','WORST = OVEN'],'#c03030');
 await say('kettle','And the worst baker goes in the oven. Not as a punishment. As an ingredient.','evil');fxState.red=1;SFX.sting();await wait(400);fxState.red=0;ex('kettle','happy');
 await say('kayden','On God, I’m too young to be a pie. I’ve got a mixtape coming out.','scared');
 await say('tez','Six years I’ve done this bake. Here’s the trick: make sure someone’s worse than you.','smirk');
 if(A.brandon){face('you',1);await N('Behind you, Brandon’s mixture has already split. He’s stirring it like stirring will make it apologise.');await say('brandon','(whispering) Is it meant to be grey?','scared')}
 const ch=await choose(['Help Brandon fix his.','Swap your tin with Brandon’s when she’s not looking.','Eyes on your own bowl.']);
 let score=0;
 for(const step of['Whisk it','Get it in the oven at the right time','Ice it']){pose('you','saw');const r=await meter(step,{speed:1.1});score+=r;pose('you',null)}
 if(ch===0&&A.brandon){
  await walk('you',A.brandon.x-14,60);face('you',1);pose('you','saw');
  const r=await meter('Save Brandon’s sponge',{speed:1.3,zone:.2});pose('you',null);
  if(r){await say('brandon','It… it rises. It’s RISING. Like a little sponge miracle.','happy');D.f.brandonSaved=1}else await say('brandon','It’s worse. You made it worse. How is it worse?','cry');
  await walk('you',c.mine.x,60);face('you',-1);
 }
 if(ch===1){await N('You swap the tins while she’s licking a spoon. Brandon looks down at your sponge like he’s been handed a baby that isn’t his.');score=Math.max(score,4)}
 await say('kettle','JUDGING!','happy');
 await walk('kettle',150,60);
 if(score<=1&&ch!==1){
  await say('kettle','Oh, sweetheart. This is a crime scene with icing.','evil');
  await walk('kettle',A.you.x-12,80);pose('kettle','grab');A.you.ex='scared';
  await walk('kettle',266,60);await walk('you',280,60);
  SFX.door();await tw(A.you,{alpha:0},400);A.you.vis=false;SFX.scream();await wait(300);SFX.fire();
  await N('The oven door shuts. Gas mark nine. Through the little window, you watch yourself go golden.');
  await say('kettle','Forty minutes and we’ll have a lovely crackling.','happy');
  await die('oven');
 }
 if(A.brandon&&(ch===1||!D.f.brandonSaved)){
  await say('kettle','Brandon. Darling. Brandon. This is soup.','evil');
  await say('brandon','It’s not MINE, Miss, I swear it’s not—','scared');
  await walk('kettle',A.brandon.x-12,70);pose('kettle','grab');
  await Promise.all([walk('kettle',266,50),walk('brandon',282,50)]);
  SFX.door();await tw(A.brandon,{alpha:0},300);A.brandon.vis=false;D.dead.brandon=1;
  SFX.scream();await wait(500);SFX.fire();prop({t:'smoke',x:276,y:60});
  await N('Brandon goes in. The little window glows a bit brighter. The screaming stops at about the same time the timer dings.');
  await say('tez','(not looking up from his icing) Every year. Every single year.','sad');
  await say('kayden','Bro got ratio’d by a cake.','shock');
  await say('kettle','Star Baker is… YOU! Here’s your sticker, petal!','happy');
  if(A.mia)await say('mia','(quietly, to you) If you swapped those tins, I saw. I won’t say anything. I’ll just remember.','angry');
  await say('kettle','Brandon pie at lunch, everyone! Tell Pat!','happy');
  await classOut(c);
  await complete('bakeoff','brandon');return;
 }
 await say('kettle','Hm. Hm. HM. Nobody’s bad enough. That’s never happened before.','evil');
 await say('kettle','Kayden. Your sponge is fine. Your little raps are an act of violence. In you go.','evil');
 await say('kayden','I FEAR NO— no— I fear THIS—','scared');
 await walk('kettle',A.kayden.x-12,70);pose('kettle','grab');await walk('kayden',266,60);
 await walk('tez',254,120);pose('tez','grab');SFX.door();
 await walk('kayden',236,80);A.kayden.hurt=1;
 await N('Tez pulls Kayden back out by the hood with a pair of oven gloves at the last second. Kayden is very slightly toasted. His eyebrows are a memory.');
 await say('kettle','Crispy! Seven out of ten.','happy');
 await say('kayden','(smoking gently) Highgate Hittaz… don’t die… we just get… browned.','hurt');
 await classOut(c);
 await complete('bakeoff','saved');
}});
