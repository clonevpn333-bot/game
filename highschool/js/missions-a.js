'use strict';
/* =====================================================================
   HIGHSCHOOL — missions A: Balduf's English & the lockers fight,
   Seat Wars, The Old Bat, Any Reaction, Group Project
   ===================================================================== */
/* ---------- staging helpers ---------- */
const seatOf=(row,i)=>({x:SEATS[row][i],y:row==='back'?SEATS.backY:SEATS.frontY});
function sitAt(id,row,i,dir){const s=seatOf(row,i);const a=A[id]||put(id,s.x,dir||1);a.x=s.x;a.y=s.y;a.pose='sit';a.dir=dir||1;return a}
async function standTo(id,x,y,sp){const a=A[id];if(!a)return;a.pose=null;if(y!=null)await tw(a,{y},160);if(x!=null)await walk(id,x,sp)}
async function hit(a,b,o){o=o||{};const p=A[a],q=A[b];if(!p||!q)return;face(a,b);p.pose=o.pose||'punch';p.punchT=T+.25;(o.sfx||SFX.punch)();shake(o.shake||.45);q.hurt=Math.min(3,(q.hurt||0)+(o.dmg==null?1:o.dmg));if(!q.dead)q.ex=o.ex||'hurt';const d=Math.sign(q.x-p.x)||1;blood(q.x,q.y-22,o.blood==null?8:o.blood,d,70,q.y+2);if(o.push!==0)tw(q,{x:q.x+d*(o.push||5)},110);await wait(o.ms||300)}
function kill(id,type,o){const a=A[id];if(!a)return;o=o||{};if(id!=='you'&&D){(D.bodies=D.bodies||[]).push({room:ROOM,id,x:Math.round(a.x),y:a.y,dir:a.dir,type:type||'lie',pool:o.pool||26,period:D.period})}a.dead=type||'lie';a.pose='lie';a.pool=0;a.poolMax=o.pool||26;a.bleed=o.bleed==null?2:o.bleed;a.talk=false;if(id!=='you')D.dead[id]=1;P.stats.kills++;SFX.squelch();shake(.8);flash('#a00010',.35);blood(a.x,a.y-14,o.spray||26,null,90,a.y+2)}
async function behead(id,dir){const a=A[id];if(!a)return;const d=dir||1;const h=prop({t:'head',id,x:a.x,y:a.y-26,rot:0});kill(id,'head',{spray:40});blood(a.x,a.y-22,30,d,110,a.y+2);await Promise.all([tw(h,{x:a.x+d*40},700,'out'),tw(h,{y:a.y-46},350,'out').then(()=>tw(h,{y:a.y-2},350,'in')),tw(h,{rot:d*6},700)]);SFX.thud();splat(h.x,a.y+1,6)}
async function evil(id,music){ex(id,'evil');SFX.sting();cue(music||'evil');fxState.red=1;shake(.35);await wait(250)}
async function sweet(id,music){ex(id,'happy');SFX.sweet();fxState.red=0;cue(music||'class');await wait(200)}
async function crowdSay(t){SFX.chant();await say('Crowd',t)}
function lessonCast(teacher,tx,list,you){const c={};c[teacher]=[tx||40,1,{pose:'hips',y:146}];for(const [id,row,i] of list)c[id]=[seatOf(row,i).x,1,{pose:'sit',y:seatOf(row,i).y}];if(you)c.you=[seatOf(you[0],you[1]).x,1,{pose:'sit',y:seatOf(you[0],you[1]).y}];return c}

/* =================================================================
   AIDAN'S BAD DAY — Ms. Balduf's English, the video, the lockers
   ================================================================= */
mission('bully',{name:'Aidan’s Bad Day',icon:'🔒',who:['hasan','corey','omer','aidan','nivaan'],
 blurb:'English with Ms. Balduf. Hasan, Corey and Aidan. Somebody’s getting bullied, and it isn’t Hasan for once.',
 parts:['English: make Aidan’s morning worse','Break: show Omer the video','Lunch: the fight at the lockers'],
 tips:['Period 1, English. You sit right behind Aidan.','Break, the field. Omer hasn’t seen the video yet. Angelo sells padlocks.','Lunch, main corridor. Everyone will come.'],
 variants:{dead:'Locker 217',omer:'Omer’s bad day',kind:'You left him alone'},doneTip:'There’s more than one way the lockers fight ends.'});

hook({mis:'bully',period:1,room:'english',who:'auto',run:async()=>{
 scene('english',lessonCast('balduf',40,[['hasan','back',0],['aidan','back',1],['corey','back',3],['nivaan','back',4],['david','front',0],['sean','front',1],['stella','front',2]],['back',2]));
 A.aidan.dir=1;
 await N('Period 1. English. Ms. Balduf’s room smells of coffee, old paper and red ink.');
 await say('balduf','Poetry week, my darlings! Today: the ode. A poem of praise. You will each write one. You will each read it aloud.','happy');
 await say('balduf','And if I hear the words “could of” in this room, I will know. I always know.');
 await evil('balduf');await wait(500);await sweet('balduf');
 await say('hasan','(whispering) Psst. Look at Aidan. He’s already writing. He’s smiling at the paper.','smirk');
 pose('aidan','write');ex('aidan','smirk');
 await say('corey','Leave him. He’s weird enough on his own.');
 await say('hasan','Nah. It’s Friday. Friday Aidan gets a treat.');
 const c=await choose(['Flick his ear. Every thirty seconds. Forever.','Stick a note on his back: “KICK ME, I’M THE CALLING”.','Pull his chair when he stands up.','Leave him alone.'],'How do you make Aidan’s morning worse?');
 cue('class');
 if(c===0){
  D.f.bullied=1;
  for(let i=0;i<3;i++){pose('you','grab');SFX.click();A.aidan.shake=1;await wait(300);A.aidan.shake=0;pose('you','sit');await wait(400)}
  await say('hasan','(wheezing into his sleeve)','laugh');
  face('aidan',-1);ex('aidan','angry');
  await say('aidan','Do that again.');
  pose('you','grab');SFX.click();await wait(250);pose('you','sit');
  await standTo('aidan',null,146);SFX.thud();
  await say('balduf','Aidan! Since you’re standing up, you can read your ode first.','smirk');
 }else if(c===1){
  D.f.bullied=1;
  pose('you','reach');await wait(400);prop({t:'note',follow:'aidan',dx:-3,dy:-18,y:A.aidan.y,layer:.2});pose('you','sit');SFX.click();
  await say('corey','(snorting so hard he has to put his head on the desk)','laugh');
  await say('balduf','Aidan! You look inspired. Read your ode first.');
  await standTo('aidan',null,146);
 }else if(c===2){
  D.f.bullied=1;
  await say('balduf','Aidan, read your ode first, please.');
  await standTo('aidan',null,146);
  pose('you','grab');await wait(300);
  await say('aidan','Sorry, miss, I need my—',null);
  await tw(A.aidan,{y:150},120);A.aidan.pose='lie';A.aidan.dir=-1;SFX.thud();shake(.5);
  await N('He sits back down on a chair that isn’t there anymore.');
  await crowdSay('HAHAHAHAHA');
  await wait(300);A.aidan.pose=null;ex('aidan','angry');
  await say('aidan','…','angry');
 }else{
  D.f.kind=1;
  await say('you','(to Hasan) Leave it. Seriously.');
  await say('hasan','You’re boring. You’re a boring person.','sad');
  await say('balduf','Aidan, you look keen. Read your ode first.');
  await standTo('aidan',null,146);
 }
 hold('aidan','paper');await walk('aidan',76,40);face('aidan',1);
 await say('aidan','“Ode to Omer.” By Aidan.');
 await say('nivaan','(whispering) Omer isn’t even in this class. This is a hate crime with extra steps.','shock');
 await say('aidan','Omer, Omer, short and sad. Wears his shorts like his dad.');
 await say('aidan','Shorts in winter, shorts in snow. His mum still picks his clothes, you know.');
 await say('aidan','And every Friday is the same Friday. And every Friday, Omer will lose.','smirk');
 SFX.static();fxState.flash=.25;fxState.flashC='#203060';
 await N('For a second the clock on the wall ticks backwards. Nobody else notices.');
 intel('aidanPoem');
 await say('balduf','Lovely imagery. A bit threatening. B-plus.');
 if(c<3)await crowdSay(c===1?'(reading his back) “KICK ME, I’M THE CALLING”! HAHAHA':'HAHAHAHA');
 pose('hasan','film');
 await say('hasan','(whispering) Recording. I got ALL of that. Omer’s going to see this. Airdropping it to you.','smirk');
 give('video');
 await say('balduf','Hasan. Is that a phone?','smirk');
 await walk('balduf',94,50);
 await say('hasan','No, miss, it’s — sorry, miss, I could of put it away—');
 await evil('balduf');
 hold('balduf','pen');pose('balduf','slam');await wait(300);pose('balduf',null);
 SFX.squelch();A.hasan.hurt=1;ex('hasan','yell');blood(A.hasan.x+6,A.hasan.y-12,18,1,40,A.hasan.y+4);shake(.7);
 SFX.scream();
 await N('She drives the red pen through the back of Hasan’s hand and into the desk. It stands up on its own.');
 await say('balduf','Could HAVE, Hasan. Could. Have.','evil');
 await say('hasan','AAAAAAH— MY HAND— MY WRITING HAND—','cry');
 await sweet('balduf');hold('balduf',null);
 await walk('balduf',40,40);face('balduf',1);
 await say('balduf','Next ode! You, at the back. Yes, you. Read yours.','happy');
 const r=await choose(['“Ode to Lunch”. Safe. Boring.','“I could of been a poet, but—”','“Ode to Ms. Balduf”. Suck up.']);
 if(r===1){
  await say('you','“I could of been a poet, but—”');
  await evil('balduf');
  await walk('balduf',seatOf('back',2).x-14,140);
  hold('balduf','pen');pose('balduf','slam');SFX.squelch();A.you.ex='dead';A.you.hurt=3;blood(A.you.x,A.you.y-20,40,-1,80,A.you.y+3);shake(1);
  await N('The second red pen goes in through your eye. She doesn’t even put her coffee down.');
  kill('you','lie',{pool:22});
  await say('balduf','“Could HAVE.” I did warn you, darling.','evil');
  await die('redpen');
 }
 if(r===2){await say('you','“Ms. Balduf, your cardigan’s green, like the leaves in the spring that we’ll never deserve.”');await say('balduf','…That’s the most beautiful thing anyone has ever said to me. A-star.','cry');bond('hasan',0)}
 else{await say('you','“O lunch. You’re at twelve twenty. I think about you all morning.”');await say('balduf','Relatable. C.')}
 if(D.f.bullied){ex('aidan','smirk');await say('aidan','(walking past your desk) I remember who laughed. I always remember who laughed.','smirk')}
 else{await say('aidan','(quietly, walking past) You didn’t laugh. That’s new.')}
 part('bully',1);
}});

hook({mis:'bully',period:2,room:'field',who:'omer',label:'Show Omer the video',cond:()=>has('video')&&!D.f.fight,run:async()=>{
 scene('field',{omer:[150,1,{pose:'cross',y:146}],jacob:[200,-1,{y:146}],kid4:[262,-1,{y:144}],you:[120,1,{y:150}]});
 await say('you','Omer. You need to see something.');
 pose('you','phone');await walk('omer',134,40);face('omer',-1);
 await N('You play him the video. All of it. “Ode to Omer.”');
 await say('omer','Play it again.');
 await N('You play it again.');
 await say('omer','Again.','angry');
 await N('You play it a third time. On the third time he mouths along to “his mum still picks his clothes”.');
 pose('you',null);
 await say('omer','He said my MUM picks my CLOTHES.','yell');
 await say('omer','She DOES. But he doesn’t KNOW that.','angry');
 await walk('jacob',170,40);
 await say('jacob','That’s personal. I’m getting angry and it’s not even my mum.','angry');
 A.omer.shake=1;SFX.crunch();pose('omer','punch');A.omer.punchT=T+.3;await wait(400);A.omer.shake=0;
 await say('omer','Lunch. The lockers. Tell everyone.','angry');
 const opts=['I’ll tell EVERYONE.','I’ll hold him for you.','Omer, he’s weird. Maybe just leave it.'];
 if(has('padlock'))opts.push('Give Omer the padlock in a sock.');
 const c=await choose(opts);
 D.f.fight=1;
 if(c===0){D.f.crowd=2;await say('omer','Good. I want an audience. I want it on the news.')}
 if(c===1){D.f.crowd=2;D.f.hold=1;await say('omer','You hold him, I do the rest. Like a team. Like a family.')}
 if(c===2){D.f.crowd=1;await say('omer','Did HE leave it? Did he leave my MUM out of it?','yell');await say('you','…No.');await say('omer','Then I’m not leaving it.')}
 if(c===3){D.f.crowd=2;D.f.padlock=1;take('padlock');hold('omer','padlock');await say('omer','…What is this.');await say('you','Insurance.');await say('omer','I love you. Don’t tell anyone I said that.','happy')}
 await say('kid4','(already typing) FIGHT AT LUNCH. LOCKERS. OMER VS BOWL CUT.');
 part('bully',2);
}});

hook({mis:'bully',period:4,room:'corridor',who:'auto',cond:()=>D.f.fight,run:async()=>{
 D.f.bullied=1;
 const big=D.f.crowd>=2;
 scene('corridor',{aidan:[86,1,{y:140}],omer:[30,1,{y:150}],nivaan:[230,-1,{pose:'film',y:156}],hasan:[260,-1,{pose:'cheer',y:150}],paul:[200,-1,{pose:'cheer',y:146}],kenneth:[286,-1,{pose:'cheer',y:148}],corey:[300,-1,{y:142}],you:[170,-1,{y:158}]});
 crowd={n:big?16:8,cheer:true,phones:true,front:big?7:3,gap:[60,180]};
 cue('fight');
 await N(big?'Lunch. The main corridor. Word got round. Word got round the whole school.':'Lunch. The main corridor. A few people heard. A few people came.');
 await crowdSay('FIGHT! FIGHT! FIGHT!');
 await say('nivaan',big?'We are LIVE. Four hundred viewers. Five hundred. Chat is feral. Chat wants blood.':'We’re live. Thirty viewers. Thirty-one. Hi, Mum.','happy');
 await walk('omer',70,48);
 await say('omer','“Ode to Omer”, yeah?','angry');
 face('aidan',-1);await say('aidan','You watched it three times.','smirk');
 await say('omer','How do you know that?','shock');
 await say('aidan','Shorts in winter.','smirk');
 pose('omer','headbutt');await wait(200);
 await hit('omer','aidan',{pose:'headbutt',sfx:SFX.crunch,blood:14,push:4});
 pose('omer',null);
 await crowdSay('OHHHHHHHHH—');
 ex('aidan','smirk');
 await say('aidan','(wiping the blood off his lip and looking at it) Again.','smirk');
 const opts=[{t:'Grab Aidan’s arms from behind.'},{t:'Jump in yourself.'},{t:'Just watch.'}];
 if(D.f.padlock)opts.unshift({t:'Shout “OMER — THE SOCK!”',tag:'🔒'});
 const c=await choose(opts,'Aidan is smiling. Nobody else is.');
 const pick_=opts[c].t;
 if(pick_.startsWith('Jump')){
  await walk('you',100,90);face('you',-1);
  await say('you','Oi, bowl cut—');
  face('aidan',1);ex('aidan','evil');fxState.red=1;SFX.sting();
  await N('He turns his head the way an owl does. All the way. The crowd stops chanting.');
  await walk('aidan',92,90);pose('aidan','choke');A.you.ex='scared';
  for(let i=0;i<4;i++){SFX.locker();shake(.8);A.you.hurt=Math.min(3,i+1);wallSplat(84+i,64+i*2,6);blood(A.you.x,A.you.y-22,12,-1,60,A.you.y+2);await wait(320)}
  kill('you','crush',{pool:30});
  await N('He puts your head through locker 217 four times, then closes the door on what’s left, gently, like he’s tucking you in.');
  await say('aidan','Same time next Friday.','smirk');
  await die('ring');
 }
 if(pick_.startsWith('Just')){
  ex('aidan','evil');
  await N('Aidan stops smiling. That’s worse.');
  await hit('aidan','omer',{blood:12,push:10});await hit('aidan','omer',{blood:14,push:8});
  pose('aidan','grab');await walk('aidan',50,80);SFX.locker();shake(.9);wallSplat(30,70,8);
  A.omer.pose='lie';A.omer.hurt=3;SFX.thud();A.omer.bleed=1;
  await crowdSay('…oh.');
  await say('omer','(from the floor) Mum…','cry');
  await say('sherman','WHAT is going ON in my corridor?','yell');
  put('sherman',330,-1,{y:150});await walk('sherman',250,60);
  await say('sherman','Omer. Lying down. On school property. Detention.','angry');
  face('aidan',1);await say('aidan','(walking past you, very close) Same time next Friday.','smirk');
  await complete('bully','omer');return;
 }
 // you help — hold or padlock
 let won=false;
 if(pick_.startsWith('Grab')){
  await walk('you',100,90);face('you',-1);pose('you','hold');ex('you','angry');
  await say('you','GOT HIM— Omer, GO—');
  won=await mash('Hold Aidan’s arms!',{need:20,time:5,info:'He’s stronger than he looks. Mash!',onHit(){shake(.2)}});
 }else{
  pose('hasan','throw');await wait(200);
  await say('omer','(swinging a padlock in a sock) I’ve never felt more alive.','happy');
  won=await mash('Hype Omer up!',{need:16,time:5,info:'Get the crowd going!',onHit(){SFX.cheer()}});
 }
 if(!won){
  ex('aidan','evil');pose('you',null);
  await N('He shrugs you off like a coat. Omer swings and misses. Aidan doesn’t.');
  await hit('aidan','omer',{blood:14,push:10});await hit('aidan','omer',{blood:16,push:10});
  A.omer.pose='lie';A.omer.hurt=3;SFX.thud();
  await crowdSay('…oh no.');
  await say('aidan','(to you, with Omer’s blood on his cheek) You held me. I’ll remember that.','smirk');
  await complete('bully','omer');return;
 }
 await say('omer','My MUM picks my clothes because she LOVES me—','yell');
 for(let i=0;i<3;i++)await hit('omer','aidan',{blood:12,push:0,ms:220,weapon:D.f.padlock?'padlock':null});
 pose('you',null);await walk('you',130,80);
 pose('omer','grab');await N('Omer opens locker 217 and holds the door.');
 A.aidan.dir=-1;
 for(let i=0;i<5;i++){pose('omer','slam');SFX.locker();shake(.9);A.aidan.hurt=3;wallSplat(84,70,7+i);blood(A.aidan.x,A.aidan.y-24,16,1,80,A.aidan.y+2);await wait(330)}
 kill('aidan','crush',{pool:34,bleed:4});
 cue('dead');crowd.cheer=false;crowd.phones=true;
 await N('On the fifth slam something gives. It isn’t the locker door.');
 await say('paul','(very quietly) …fight? Fight?');
 await say('nivaan','Viewers went to zero. Stream got banned. I’ve been banned from the internet.','shock');
 await say('hasan','Bro. Bro. Bro. Bro.','shock');
 await say('omer','(looking at his hands) …He shouldn’t have said that about my mum.','sad');
 put('sherman',330,-1,{y:150});await walk('sherman',190,50);
 await say('sherman','WHAT is going on in my— oh.','shock');
 await say('sherman','…Who’s going to clean that?','angry');
 await say('sherman','You. With the face. Locker duty. Put him in a locker and mop till it shines. Then mop again.','angry');
 await N('You fold Aidan into locker 217. It takes longer than it should. He’s cold already. Colder than anyone should be this fast.');
 D.f.aidanDead=1;P.killedAidan=1;save();
 SFX.locker();A.aidan.vis=false;
 await complete('bully','dead');
}});

/* =================================================================
   SEAT WARS — Ms. Shermian
   ================================================================= */
mission('seat',{name:'Seat Wars',icon:'🪑',who:['corey','arjun','alex','dheva','marcus'],
 blurb:'Ms. Shermian loves a seating plan. She loves splitting up friends. Her mood flips faster than her ruler.',
 parts:['Period 3: survive Ms. Shermian’s seating plan','Lunch: steal and rewrite the plan','Period 7: get all five sat together'],
 tips:['Period 3, Maths. Watch her mood.','Lunch, maths room. She’s on canteen duty; the plan lives in her desk drawer. Pick your lookout carefully.','Period 7, Maths. Keep her sweet. Arjun’s mouth needs shutting — Angelo sells tape.'],
 variants:{perfect:'All five together',minus:'Together, minus one'}});

hook({mis:'seat',period:3,room:'maths',who:'auto',run:async()=>{
 scene('maths',{shermian:[44,1,{pose:'hips',y:146,hold:'clipboard'}],corey:[110,-1,{y:150}],arjun:[134,-1,{y:150,pose:'cross'}],alex:[158,-1,{y:150}],dheva:[182,-1,{y:150}],marcus:[206,-1,{y:150}],tyler:[230,-1,{y:150}],you:[254,-1,{y:150}]});
 await N('Period 3. Maths. Ms. Shermian’s room is pink, warm, and smells like a candle called “Patience”.');
 await say('shermian','Good morning, my little angels! New seating plan! Isn’t that EXCITING?','happy');
 await say('marcus','I love it when she rearranges things. Gets everyone all worked up.','smirk');
 await say('shermian','Corey, sweetie — by the window.','happy');
 await walk('corey',seatOf('back',4).x,60);sitAt('corey','back',4);
 await say('shermian','Arjun — right at the front, where I can LOVE you.','happy');
 await walk('arjun',seatOf('front',0).x,60);sitAt('arjun','front',0);
 await say('shermian','Alex, back left. Dheva, front right. Tyler, middle. You — back row, by Tyler.');
 await Promise.all([walk('alex',seatOf('back',0).x,60),walk('dheva',seatOf('front',4).x,60),walk('tyler',seatOf('back',1).x,60),walk('you',seatOf('back',2).x,60)]);
 sitAt('alex','back',0);sitAt('dheva','front',4,-1);sitAt('tyler','back',1);sitAt('you','back',2);
 await say('shermian','And Marcus…','smirk');
 await say('shermian','Marcus, next to ME.','evil');
 await walk('marcus',74,40);A.marcus.pose='sit';A.marcus.y=150;face('marcus',-1);
 await say('marcus','Bold. I respect it.','smirk');
 await say('dheva','Miss, can I sit with Alex? We’re—');
 await evil('shermian');
 await say('shermian','Did I ASK what you WANTED, Dheva?','evil');
 await say('shermian','Did ANYONE in this room hear me ask what DHEVA WANTED?','evil');
 await N('Nobody breathes. A pen rolls off a desk and nobody picks it up.');
 await sweet('shermian');
 await say('shermian','Lovely. Sit down properly, sweetie.','happy');
 face('arjun',1);
 await say('arjun','(to Dheva) Should’ve used more powder, mate. Your hair’s louder than you are.','smirk');
 ex('dheva','sad');
 face('arjun',-1);
 await say('arjun','Miss, is your husband still staying at his mum’s? Asking for the whole class.','smirk');
 await evil('shermian');
 await say('shermian','What. Did. You. Say.','evil');
 const c=await choose(['“Miss! Is that a picture of your cat?”','Say nothing.']);
 if(c===0){
  await say('you','Miss! Is that a picture of your cat? On the wall?');
  await sweet('shermian');
  await say('shermian','MR. BISCUITS! Yes! He’s nine! He has a little bed shaped like a croissant!','happy');
  intel('shermianCat');
  await say('tyler','(whispering) Didn’t Mr. Biscuits die last year?','shock');
  await evil('shermian');
 }else{
  await say('tyler','(whispering) oh my god','shock');
  await evil('shermian');
 }
 await say('shermian','Tyler. Did you just speak?','evil');
 await say('tyler','N-no, miss.','scared');
 await walk('shermian',seatOf('back',1).x-12,70);face('shermian',1);
 await sweet('shermian','evil');
 pose('shermian','hug');
 await say('shermian','Come here, sweetie. Hugs.','happy');
 await wait(400);
 SFX.crunch();shake(1);flash('#fff',.4);
 kill('tyler','lie',{pool:10,bleed:0,spray:2});A.tyler.ex='dead';
 pose('shermian',null);
 await N('It sounds exactly like a bag of crisps.');
 await say('shermian','Seat fourteen is now available, everyone!','happy');
 await say('arjun','…Okay. That one’s on me.','shock');
 await walk('shermian',44,60);face('shermian',1);
 await say('shermian','Now. Nobody touch my drawer. The plan lives in my drawer. The plan is FOREVER.','evil');
 intel('shermianDrawer');
 await sweet('shermian');
 await say('corey','(whispering) We need to get back together. Not like— you know what I mean.');
 await say('alex','(whispering) Five of us. Back row. That’s all I want from life.');
 D.f.seat1=1;part('seat',1);
}});

hook({mis:'seat',period:4,room:'maths',who:'dheva',label:'Steal the seating plan',cond:()=>D.f.seat1&&!D.f.seat2,run:async()=>{
 scene('maths',{dheva:[160,1,{y:146,hs:D.f.dhevaFixed?null:'limp'}],marcus:[200,-1,{y:146}],you:[120,1,{y:150}]});
 await say('dheva','She’s on canteen duty till quarter to. The drawer’s locked, but it’s a rubbish lock. Like a lock you get on a diary.');
 await say('marcus','I’ve never been in a teacher’s drawers before.','smirk');
 await say('marcus','…That came out wrong. Or right. I’ll let you decide.','smirk');
 const w=await choose(['Marcus keeps watch.','Dheva keeps watch.'],'Who keeps watch at the door?');
 const look=w===0?'marcus':'dheva';
 await walk(look,290,60);face(look,1);
 await say(look,w===0?'I’ve been watching doors my whole life. Doors and people who walk through them.':'On it. (He immediately starts checking his hair in the door window.)');
 await walk('you',44,60);pose('you','kneel');
 const r=await meter('Pick the drawer lock',{speed:1.25});
 if(r===0||w===1){
  SFX.door();
  if(w===1){await N('The lock finally pops. Dheva is still fixing one strand of hair in the window. He doesn’t see her coming. You hear her heels.')}else{await N('The pin snaps in the lock. Marcus whistles. Too late.')}
  put('shermian',330,-1,{y:150});
  await walk('shermian',90,110);
  await evil('shermian');
  await say('shermian','In. My. DRAWER?','evil');
  pose('you',null);A.you.ex='scared';
  pose('shermian','slam');SFX.locker();shake(1);wallSplat(44,92,8);
  await N('She slams the drawer on your head. Then again. Then she opens it, puts the seating plan back in, and closes it on you one more time for luck.');
  kill('you','crush',{pool:24});
  await sweet('shermian');
  await say('shermian','There. Now you’re in the plan forever.','happy');
  await die('seat');
 }
 SFX.pick();pose('you',null);hold('you','plan');
 await N('Seating Plan v14. Every friend group in Year 10 is split up. She’s drawn little hearts next to the kids she’s “keeping an eye on”. Some of the hearts are crossed out.');
 await walk(look,170,60);
 await say('dheva','Okay. Back row. Five seats. Let’s do this properly.');
 await say('dheva','Rules. I’m not sitting next to Corey. His curl cream smells like grape and it makes me hungry.');
 await say('marcus','Not next to Alex. He blushes when I talk and it’s distracting for both of us.','smirk');
 await say('dheva','Alex has to be on an end. He needs leg room. Sport legs.');
 await say('marcus','Corey is in seat five by the window. He said “non-negotiable” and then he cried a bit.');
 await say('dheva','And Arjun goes dead in the middle. So everyone can elbow him.');
 const names=['alex','dheva','arjun','marcus','corey'];
 let tries=0;
 while(true){
  const left=names.slice(),plan=[];
  for(let s=0;s<4;s++){const i=await choose(left.map(n=>K[n].n),'Back row, seat '+(s+1)+' (of 5):');plan.push(left[i]);left.splice(i,1)}
  plan.push(left[0]);
  const ok=plan.join()==='alex,dheva,arjun,marcus,corey';
  await N('You write: '+plan.map((n,i)=>(i+1)+'. '+K[n].n).join('  '));
  if(ok)break;
  tries++;
  await say('dheva',pick(['No. That breaks a rule. Read the rules.','That’s wrong and you know it’s wrong.','Marcus, tell them.']),'angry');
  await say('marcus',pick(['I’d be next to Alex. I can’t be held responsible.','Arjun has to be in the middle. It’s the only thing we agreed on as a society.','Corey said window. He cried.']));
  if(tries>=2){
   await N('Heels in the corridor.');
   put('shermian',330,-1,{y:150});await walk('shermian',150,120);await evil('shermian');
   await say('shermian','My DRAWER. My PLAN. My ANGELS.','evil');
   await walk('shermian',A.you.x+12,140);pose('shermian','choke');A.you.ex='scared';SFX.crunch();shake(1);
   kill('you','lie',{pool:12,bleed:0});
   await sweet('shermian');await say('shermian','Shh. Shh. Sit. Forever.','happy');
   await die('seat');
  }
 }
 take('plan');give('newplan');
 await say('dheva','Perfect. She’ll never know. She will absolutely know. But perfect.');
 D.f.seat2=1;part('seat',2);
}});

hook({mis:'seat',period:6,room:'maths',who:'auto',cond:()=>D.f.seat2&&!D.dead.arjun,run:async()=>{
 const cast={shermian:[44,1,{pose:'hips',y:146,hold:'plan'}],you:[seatOf('front',2).x,1,{pose:'sit',y:SEATS.frontY}]};
 const order=['alex','dheva','arjun','marcus','corey'];order.forEach((n,i)=>{if(!D.dead[n])cast[n]=[120+i*28,-1,{y:150}]});
 scene('maths',cast);
 await say('shermian','New plan, angels! Let’s see. Alex… Dheva… Arjun… Marcus… Corey. All in the back row. Hm.','smirk');
 for(let i=0;i<5;i++){const n=order[i];if(!A[n])continue;await walk(n,seatOf('back',i).x,90);sitAt(n,'back',i)}
 await say('shermian','I don’t remember writing this.','smirk');
 await evil('shermian');await wait(300);
 const c=await choose(['“You wrote it last night, miss. After you fed Mr. Biscuits.”','“Miss, your handwriting’s got really pretty.”','Say nothing.'],'Her eye is twitching.');
 if(c===1){
  await say('you','Miss, your handwriting’s got really pretty.');
  await say('shermian','My handwriting has ALWAYS been pretty.','evil');
  await walk('shermian',A.you.x-14,90);hold('shermian','pen');pose('shermian','slam');SFX.squelch();A.you.hurt=3;blood(A.you.x,A.you.y-20,30,-1,60,A.you.y+3);shake(1);
  await N('She takes the stapler off her desk and staples your mouth shut. Then your eyes. Then, carefully, your forehead to the desk.');
  kill('you','lie',{pool:20});
  await say('shermian','Neat AND pretty.','happy');
  await die('seat');
 }
 if(c===0){await sweet('shermian');await say('shermian','I DID feed Mr. Biscuits! He had salmon. He looked at me like I was the moon.','happy')}
 else{await N('She stares at the plan for a full minute. Then she shrugs and puts it in the drawer.');await sweet('shermian')}
 await say('corey','(whispering) We did it. We actually—','happy');
 await say('arjun','This is the best seat I’ve ever had, miss. Better than your marriage.','smirk');
 await evil('shermian');
 const o=[{t:'Tape Arjun’s mouth shut.',dis:!has('tape'),why:'no tape',tag:'🩹'},{t:'Kick Arjun under the desk.'},{t:'Let him talk. He’s earned this.'}];
 const k=await choose(o,'Ms. Shermian is walking down the row.');
 if(k===0){
  take('tape');await standTo('you',A.arjun.x+12,SEATS.backY+2,120);face('you',-1);pose('you','hold');
  SFX.whoosh();await wait(200);SFX.whoosh();
  await say('arjun','MMMPH— MMMPHHH—','angry');
  pose('you',null);sitAt('you','front',2);
  await sweet('shermian');
  await say('shermian','Oh! What a lovely, quiet boy.','happy');
  await say('shermian','What a lovely little family you all are. I could keep you forever.','happy');
  await N('She doesn’t blink once while she says it.');
  for(const n of['alex','dheva','corey','marcus'])if(A[n])ex(n,'happy');
  await say('marcus','Seat four. Next to Arjun. Sweaty, warm, close. I’ve never been happier.','smirk');
  await complete('seat','perfect');return;
 }
 if(k===1){await say('you','(kicks Arjun’s chair)');await say('arjun','OW. And it’s TRUE, miss. He’s at his mum’s because he can’t stand—','angry')}
 await walk('shermian',A.arjun.x-14,70);face('shermian',1);
 await say('shermian','Arjun, sweetie. Look at me.','evil');
 pose('shermian','slam');hold('shermian','book');
 for(let i=0;i<3;i++){SFX.crunch();shake(.9);blood(A.arjun.x,A.arjun.y-18,14,1,60,A.arjun.y+3);A.arjun.hurt=3;await wait(320)}
 kill('arjun','crush',{pool:26});hold('shermian',null);pose('shermian',null);
 await N('She uses the Year 10 textbook. Hardback. Six hundred pages.');
 await sweet('shermian');
 await say('shermian','Four little angels. Even better!','happy');
 await say('dheva','…We’re together.','shock');
 await say('corey','Minus one.','shock');
 await say('marcus','I mean. It’s still a win. Morally it’s a bit of a draw.');
 await complete('seat','minus');
}});

/* =================================================================
   THE OLD BAT — Ms. Sherman
   ================================================================= */
mission('oldbat',{name:'The Old Bat',icon:'👵',who:['david','nivaan'],
 blurb:'Ms. Sherman has run this school for forty-one years like a prison she personally hates. Survive her. Then get her back.',
 parts:['Before school: earn a detention','Lunch: rewire her office with David','Period 7: detention'],
 tips:['Before school, bus loop. Talk back to her.','Lunch, library. David knows wires. She’s on corridor duty.','Period 7, her office. Stand on the rug.']});

hook({mis:'oldbat',period:0,room:'bus',who:'sherman',label:'Talk back to Ms. Sherman',cond:()=>!D.f.detention,run:async()=>{
 scene('bus',{sherman:[230,-1,{pose:'hips',y:150}],nivaan:[150,1,{pose:'film',y:146}],david:[180,1,{y:144}],you:[205,1,{y:154}]});
 await say('sherman','You. Tuck your shirt in. Not you. Your SHIRT.','angry');
 await walk('sherman',164,40);face('sherman',-1);
 await say('sherman','Nivaan. Phone.','angry');
 await say('nivaan','I’m live, miss, there’s ninety people watching—','shock');
 pose('nivaan',null);hold('sherman','phone');SFX.whoosh();
 await say('sherman','Now there’s nobody watching. Like your funeral.','smirk');
 face('sherman',1);
 await say('david','(breathing)');
 await say('sherman','Are you BREATHING at me, David?','angry');
 await say('david','I— yes, miss. Constantly. Since birth.','scared');
 await say('sherman','Detention.','smirk');
 const c=await choose(['“Give Nivaan his phone back, you old bat.”','“Miss, is it true you were here when they built the school?”','Say nothing.']);
 if(c===2){await say('sherman','Good. Silence. Like a good little nothing.','smirk');return 'stay'}
 if(c===0){await say('you','Give Nivaan his phone back, you old bat.');await say('sherman','Old? OLD? I have outlived three headteachers, two fires and a boy called Gary.','evil')}
 else{await say('you','Miss, is it true you were here when they built the school?');await say('sherman','I was here BEFORE they built the school. They built it around me. Like a pearl.','evil')}
 face('sherman',1);
 await say('sherman','Detention. Period three. My office. Bring nothing. Leave nothing. Become nothing.','smirk');
 await say('sherman','And when you come in, stand on the rug. I LOVE it when they stand on the rug.','evil');
 give('detention');D.f.detention=1;
 await say('david','(whispering, when she’s gone) Nobody comes back from her office the same. Gary Pritchard came back as a rumour.','scared');
 part('oldbat',1);
}});

hook({mis:'oldbat',period:4,room:'library',who:'david',label:'Ask David to help rewire Sherman’s office',cond:()=>D.f.detention&&!D.f.rewired,run:async()=>{
 scene('library',{david:[140,1,{pose:'sit',y:150}],you:[110,1,{y:154}]});
 await say('you','David. Her office. Lunch. You know wires.');
 await say('david','Her office? During lunch? She’s on corridor duty, so… technically possible. Morally? Also possible.','smirk');
 scene('office',{david:[90,1,{y:150}],you:[60,1,{y:156}]});
 await N('Her office is cold. There are forty-one years of confiscated phones in a glass cabinet. Some of them are Nokias.');
 await walk('david',160,50);pose('david','kneel');
 await say('david','(under the desk) There’s a red button. Big. Glossy. Loved. It opens the floor. Right where students stand.','shock');
 intel('shermanPit');
 await say('david','If I swap these two wires, it opens the floor under HER chair instead. Hold the torch. Don’t breathe. She’d hear you breathe.');
 const r=await meter('Hold the torch steady while David swaps the wires',{speed:1.1});
 if(r===0){
  SFX.static();flash('#fff',.6);
  await say('david','Ah— no— that’s the wrong—','shock');
  D.f.pitOpen=1;SFX.rumble();shake(1);
  A.you.ex='scared';await tw(A.you,{y:200},500,'in');A.you.vis=false;
  await N('The floor opens under you. You fall for a long time. It’s a coal chute from when the school had a furnace. At the bottom there are other kids. Some of them have uniforms from the eighties. None of them are moving.');
  await die('pit');
 }
 SFX.ding();
 await say('david','Done. Her chair’s on the trapdoor now. We have committed a crime against an elderly woman and I feel GREAT.','happy');
 pose('david',null);
 D.f.rewired=1;part('oldbat',2);
}});

hook({mis:'oldbat',period:6,room:'office',who:'auto',cond:()=>D.f.detention,run:async()=>{
 scene('office',{sherman:[158,1,{pose:'sit',y:128,layer:20}],you:[158,1,{y:164}]});
 cue('office');
 await say('sherman','Ah. My appointment. Stand on the rug. No — ON it. Lovely. Feet together.','smirk');
 await say('sherman','Forty-one years. Do you know how many little shits I’ve disappeared?','evil');
 await say('sherman','Your handwriting is a hate crime. Your haircut is a cry for help. Your mother’s voicemail is the saddest thing I have ever heard, and I was at Woodstock.','smirk');
 await say('sherman','Any last words, dear?','evil');
 const c=await choose(['“You’re a jackass, Ms. Sherman.”','“Please, miss. I have so much to live for.”','“Press it.”']);
 await say('you',['You’re a jackass, Ms. Sherman. Everyone thinks so. Even the dinner ladies.','Please, miss. I have so much to live for.','Press it.'][c]);
 await say('sherman',['Everyone thinks so? Good. They’re meant to.','No, you don’t.','Oh, I will.'][c],'evil');
 SFX.click();await wait(300);
 if(!D.f.rewired){
  D.f.pitOpen=1;SFX.rumble();shake(1);A.you.ex='scared';
  await tw(A.you,{y:210},500,'in');A.you.vis=false;
  await say('sherman','(calling down the hole) Say hello to Gary!','happy');
  await N('At the bottom, under forty years of dust, there’s a pile of school bags. Some of them still have names on.');
  await die('pit');
 }
 SFX.rumble();shake(1.2);
 A.sherman.ex='shock';
 await say('sherman','What— THAT’S NOT—','shock');
 prop({t:'hole',x:158,y:141,layer:-2});
 const dent=prop({t:'tooth',x:158,y:118});
 A.sherman.layer=-40;await Promise.all([tw(A.sherman,{y:152},650,'in'),tw(A.sherman,{alpha:0},650)]);A.sherman.vis=false;
 await say('sherman','(falling) YOU LITTLE SHIIIIIIIII—','yell');
 await tw(dent,{y:162},500,'in');SFX.click();
 await wait(800);
 SFX.squelch();await N('A long way down there’s a crunch, and then nothing. Forty-one years of practice, and she never once checked the wiring.');
 cue('class');
 await N('Her dentures land at your feet, still clacking. The glass cabinet clicks open on its own. Forty-one years of phones.');
 if(!P.coll.dentures){P.coll.dentures=1;save();SFX.pick();toast('Collectible: Ms. Sherman’s dentures')}
 await N('You find Nivaan’s phone. It’s still streaming. Ninety-one viewers watched the whole thing. Chat is spamming “W”.');
 D.dead.sherman=1;
 await complete('oldbat');
}});

/* =================================================================
   ANY REACTION — Ms. Loach
   ================================================================= */
mission('loach',{name:'Any Reaction',icon:'☕',who:['paul','kenneth','jacob','angelo','abby','hasan'],
 blurb:'Ms. Loach doesn’t care what you do. So the class decides to do the worst thing possible, just to see what she does.',
 parts:['Period 3: escalate','Period 7: the worst thing possible'],
 tips:['Period 3, Science. Go big.','Period 7, Science. You know what she cares about. Hasan doesn’t.'],
 variants:{hasan:'Hasan drinks the tea'}});

hook({mis:'loach',period:3,room:'science',who:'auto',run:async()=>{
 scene('science',{loach:[66,1,{pose:'sit',y:132}],paul:[150,-1,{y:146}],kenneth:[176,-1,{y:146}],jacob:[204,-1,{y:150}],angelo:[232,-1,{y:146}],abby:[262,-1,{y:150}],you:[290,-1,{y:154}]});
 await N('Period 3. Science. Ms. Loach is marking. She has been marking since 2009.');
 await say('loach','Page forty-seven.');
 await say('paul','Bet I can make her react. Kenneth. Kenneth, come here.','smirk');
 await say('kenneth','No.');
 await walk('paul',170,60);pose('paul','grab');await wait(200);
 hop('paul',8,360);await hop('kenneth',14,360);A.kenneth.pose='lie';SFX.thud();shake(.8);
 await N('Paul suplexes Kenneth onto the lab bench. The bench makes a noise benches shouldn’t make.');
 await say('loach','Mm.');
 await say('kenneth','(lying in the sink) I’m fine. I’m fine. That was my spine but I’m fine.','hurt');
 await say('angelo','Amateurs. Watch a professional.','smirk');
 await walk('angelo',120,60);prop({t:'fire',x:112,y:150,w:14,n:10});prop({t:'smoke',x:112,y:136});SFX.fire();
 await N('Angelo lights a Bunsen burner, then the bin, then — with real care — the bin’s little bin.');
 await say('loach','Mm-hm.');
 await walk('paul',214,60);pose('paul','grab');await tw(A.jacob,{x:A.jacob.x+10},120);SFX.thud();
 await say('jacob','STOP. PUSHING. ME.','yell');
 hold('jacob','chair');pose('jacob','throw');await wait(250);SFX.glass();shake(1);hold('jacob',null);pose('jacob',null);
 await N('Jacob throws a stool through the window. Nobody laughs. You don’t laugh at Jacob. It isn’t a rule. It’s just a fact, like gravity.');
 await say('loach','Page forty-seven.');
 await say('abby','She hasn’t looked up once.','shock');
 const c=await choose(['Set off the fire alarm.','Tell her the school’s on fire.','Reach for her mug.'],'Your turn.');
 if(c===0){SFX.bell();SFX.bell();await N('You smash the fire alarm. The bell screams. The sprinklers come on. Everyone evacuates except Ms. Loach, who turns a damp page.');await say('loach','Page forty-seven.')}
 if(c===1){await say('you','Miss. The school is on fire.');await say('loach','It is.');await say('loach','Mm.')}
 if(c===2){
  await walk('you',82,80);pose('you','reach');
  ex('loach','evil');SFX.sting();fxState.dark=.3;
  await N('Her hand is round your wrist before you finish the thought. She doesn’t squeeze. She doesn’t need to. She looks at you like she’s deciding which drawer you’d fit in.');
  await say('loach','Don’t.','evil');
  fxState.dark=0;ex('loach',null);pose('you',null);
  await say('loach','Page forty-seven.');
 }else{
  await say('abby','(whispering) Wait. Kenneth’s elbow nearly touched her mug earlier and she LOOKED at him. Like, looked-looked.','shock');
 }
 intel('loachMug');
 D.f.loach1=1;part('loach',1);
}});

hook({mis:'loach',period:6,room:'science',who:'auto',cond:()=>D.f.loach1,run:async()=>{
 const cast={loach:[66,1,{pose:'sit',y:132}],you:[290,-1,{y:154}]};
 if(!D.dead.hasan)cast.hasan=[150,-1,{y:146}];if(!D.dead.abby)cast.abby=[190,-1,{y:150}];if(!D.dead.sean)cast.sean=[226,-1,{y:146}];if(!D.dead.stella)cast.stella=[256,-1,{y:150}];
 scene('science',cast);
 await N('Period 7. Science. Same room. The window is still broken from this morning. Ms. Loach has not noticed.');
 await say('loach','Page forty-seven.');
 const o=[{t:'Get Hasan to drink from her mug.',dis:!A.hasan,why:'Hasan isn’t here'},{t:'Drink from her mug yourself.'},{t:'Flood the room from every tap.'}];
 const c=await choose(o,'The worst thing possible.');
 if(c===2){SFX.slurp();await N('Twenty minutes later the water is up to your knees. A textbook floats past like a sad boat.');await say('loach','Page forty-seven.');return}
 if(c===1){
  await walk('you',84,80);hold('you','mug');pose('you','drink');SFX.slurp();
  await say('you','Mmm. Earl Grey.');
  hold('you',null);pose('you',null);
  await evil('loach','evil');fxState.dark=.4;
  await N('Ms. Loach stands up. She opens her desk drawer. She takes out a pair of scissors, the big orange ones, and she doesn’t hurry at all.');
  hold('loach','knife');await walk('loach',74,60);pose('loach','slam');A.you.ex='scared';
  SFX.scream();await wait(300);SFX.squelch();blood(A.you.x,A.you.y-24,60,1,120,A.you.y+2);wallSplat(96,70,10);
  kill('you','lie',{pool:30});
  await N('She does it the way she marks books. Neatly. Without looking up. When she’s done she rinses the scissors in the sink and dries them on her cardigan.');hold('loach',null);
  fxState.dark=0;pose('loach','sit');A.loach.x=66;A.loach.y=132;ex('loach',null);
  await say('loach','Page forty-seven.');
  await die('mug');
 }
 await say('hasan','Watch this. I’ve got no fear and no impulse control.','smirk');
 await walk('hasan',84,60);hold('hasan','mug');pose('hasan','drink');SFX.slurp();
 await say('hasan','Mmmm. Earl Grey. Bit cold. Four sugars? Miss, that’s a cry for help.','happy');
 D.f.mugGone=1;
 await evil('loach','evil');fxState.dark=.4;
 await N('Ms. Loach stands up. She opens her desk drawer. She takes out a pair of scissors, the big orange ones, and she doesn’t hurry at all.');
 hold('loach','knife');await walk('loach',74,60);
 hold('hasan',null);pose('hasan',null);ex('hasan','scared');
 await say('hasan','Miss? Miss, why have you got the scissors—','scared');
 pose('loach','slam');SFX.scream();await wait(250);
 SFX.squelch();blood(A.hasan.x,A.hasan.y-24,70,1,120,A.hasan.y+2);wallSplat(100,70,12);shake(1.2);
 kill('hasan','lie',{pool:36,bleed:3});
 await N('Three times, in the neck. She never changes her face. It’s the face she uses for page forty-seven.');
 await N('Then she rinses the scissors in the sink, picks her mug up off the floor, and sits back down.');hold('loach',null);
 fxState.dark=0;pose('loach','sit');A.loach.x=66;A.loach.y=132;ex('loach',null);hold('loach','mug');
 SFX.slurp();
 await say('loach','Page forty-seven.');
 if(A.abby)await say('abby','…That’s the most she’s ever done.','shock');
 if(A.sean)await say('sean','Are we… still doing page forty-seven?','shock');
 await say('loach','Mm.');
 await complete('loach','hasan');
}});

/* =================================================================
   GROUP PROJECT — the whole friend group, Ms. Balduf, Period 3
   ================================================================= */
mission('group',{name:'Group Project',icon:'📽️',who:['hasan','david','nivaan','omer','sean','stella','aidan'],
 blurb:'Ms. Balduf wants a presentation on “What Friendship Means”. Everybody has to do something. Everybody has to do the RIGHT something.',
 parts:['Give everyone a job','Present it before Ms. Balduf snaps'],
 tips:['Period 3, English. Who’s good at what? You’ve met them all.',''],
 variants:{aidan:'With Aidan',without:'Without Aidan'}});

hook({mis:'group',period:3,room:'english',who:'auto',run:async()=>{
 const ppl=['hasan','david','nivaan','omer','sean','stella','aidan'].filter(n=>!D.dead[n]&&!(n==='aidan'&&D.f.aidanDead));
 const cast={balduf:[40,1,{pose:'hips',y:146}],you:[seatOf('front',2).x,1,{pose:'sit',y:SEATS.frontY}]};
 ppl.forEach((n,i)=>{const row=i<5?'back':'front',ii=i<5?i:[0,4][i-5];cast[n]=[seatOf(row,ii).x,1,{pose:'sit',y:seatOf(row,ii).y}]});
 scene('english',cast);
 await N('Period 3. English. Ms. Balduf has pushed the desks together. That’s never good.');
 await say('balduf','Group project, darlings! “What Friendship Means.” You present in twenty minutes.','happy');
 await say('balduf','If it is bad… I’ll know.','evil');fxState.red=1;SFX.sting();await wait(300);fxState.red=0;ex('balduf','happy');
 if(A.hasan)await say('hasan',(D.mp.bully?'(waving a bandaged hand) ':'')+'Right. Jobs. Who does what. Don’t give me anything with my hands.');
 const JOBS=[['Make the slides','david'],['Film it','nivaan'],['Do the voice-over','sean'],['Write the jokes','hasan'],['Stand at the front and look scary','omer'],['Write the poem','aidan']];
 let score=0,used=new Set(),assigned={};
 for(const [job,right] of JOBS){
  const cands=ppl.filter(n=>!used.has(n)&&n!=='stella');if(!cands.length)break;
  const i=await choose(cands.map(n=>K[n].n),'Who should '+job.toLowerCase()+'?');
  const who=cands[i];used.add(who);assigned[job]=who;if(who===right)score++;
 }
 const aidanIn=assigned['Write the poem']==='aidan';
 await N('Twenty minutes later.');
 const front=[...used];front.forEach((n,i)=>{const a=A[n];a.pose=null;a.y=146;a.x=76+i*34;a.dir=1});
 if(A.stella){A.stella.pose=null;A.stella.y=150;A.stella.x=90+front.length*34;}
 for(const [job,right] of JOBS){
  const who=assigned[job];if(!who)continue;const good=who===right;
  if(job==='Make the slides')await say(who,good?'Slide one: a graph of everyone we’ve ever fallen out with. It goes up. Slide two: it comes back down.':'Slide one. It’s… it’s just a picture of my thumb.',good?'happy':'shock');
  if(job==='Film it'){if(good){pose(who,'film');await say(who,'We’re live! Ninety viewers! Say hi to chat, miss!','happy');pose(who,null)}else await say(who,'I pressed record. I think. Is it the red one or the other red one?','shock')}
  if(job==='Do the voice-over')await say(who,good?'(in a voice so deep and smooth the radiator stops ticking) “Friendship. It’s Friday. And it’s forever.”':'(voice cracking) “FRIENDship— it’s, um—”',good?'smirk':'shock');
  if(job==='Write the jokes')await say(who,good?'What do you call a group of friends with one brain cell? This group. Thank you, I’ve been Hasan.':'Friendship is… when… knock knock?',good?'laugh':'sad');
  if(job==='Stand at the front and look scary'){pose(who,'cross');await say(who,good?'(standing at the front in shorts, looking so scary that nobody heckles)':'(standing at the front, waving nervously)',good?'angry':'scared')}
  if(job==='Write the poem')await say(who,good?'“Friendship is a Friday that ends. Thank you for ending it with me.”':'“Roses are red. Er. Friends are also red. Sometimes.”',good?'sad':'shock');
 }
 if(score>=5){
  cue('romance');fxState.romance=.4;
  await say('balduf','(sobbing) That was… that was BEAUTIFUL. A-STAR. EVERYONE. Group hug. Except you, Hasan, you’re bleeding.','cry');
  for(const n of front)pose(n,'cheer');
  if(aidanIn){
   await say('aidan','(quietly, to you) Nobody’s ever given me a job before. In a group. With people.','happy');
   D.f.aidanIncluded=1;
  }
  fxState.romance=0;
  await complete('group',aidanIn?'aidan':'without');return;
 }
 if(score>=3){
  await say('balduf','…C-minus.','angry');
  hold('balduf','pen');await walk('balduf',front.length?A[front[0]].x-12:80,80);pose('balduf','slam');SFX.squelch();if(front[0]){A[front[0]].hurt=2;blood(A[front[0]].x,A[front[0]].y-16,14,1,50,A[front[0]].y+2)}hold('balduf',null);pose('balduf',null);
  await N('She stabs the C into '+(front[0]?nameOf(front[0]):'the desk')+'’s hand. Neatly. She has lovely handwriting.');
  part('group',1);return;
 }
 await evil('balduf');
 await say('balduf','That was a grammatical, emotional and spiritual WAR CRIME.','evil');
 await walk('balduf',seatOf('front',2).x-14,160);hold('balduf','pen');pose('balduf','slam');
 SFX.squelch();A.you.hurt=3;blood(A.you.x,A.you.y-22,50,-1,90,A.you.y+2);shake(1.2);kill('you','lie',{pool:30});
 await N('F-minus. She writes it on your forehead. Then through it.');
 await die('fminus');
}});
