'use strict';
/* =====================================================================
   HIGHSCHOOL — rewrites, part A: Aidan's Bad Day, Seat Wars.
   Every line is something you can see happen. Things set up in one period
   come back in another.
   ===================================================================== */
function dropHooks(mis){for(let i=HOOKS.length-1;i>=0;i--)if(HOOKS[i].mis===mis)HOOKS.splice(i,1)}
async function talk(lines){for(const l of lines){if(typeof l==='function')await l();else await say(l[0],l[1],l[2])}}
function classLaugh(ms){SFX.cheer();const who=Object.keys(A).filter(k=>k!=='you'&&!A[k].dead&&!TEACHERS.includes(k));const old={};who.forEach(k=>{old[k]=A[k].ex;A[k].ex='laugh'});setTimeout(()=>who.forEach(k=>{if(A[k]&&A[k].ex==='laugh')A[k].ex=old[k]}),ms||1400)}
Object.assign(ITEMS,{watch:'Omer’s watch (his mom’s birthday present)'});

/* =================================================================
   AIDAN'S BAD DAY
   ================================================================= */
dropHooks('bully');
Object.assign(MIS.bully,{
 blurb:'Poetry week in Ms. Balduf’s English. You sit right behind Aidan. Hasan sits behind you, and Hasan has decided it’s Aidan’s turn.',
 parts:['Period 1, English: the ode','Break, the field: show Omer','Lunch, the corridor: locker 217'],
 tips:['Period 1, English. You sit directly behind Aidan.','Break, the field. Omer has no idea yet.','Lunch, main corridor. By the time you get there, everyone will be there.']});

hook({mis:'bully',period:1,room:'english',who:'auto',run:async()=>{
 const c=await classIn('english',{kids:['hasan','aidan','corey','nivaan','david','sean','stella'],fixed:{hasan:0,corey:2,nivaan:3,david:5,aidan:6,sean:7,stella:8},you:1});
 face('balduf',1);cue('class');
 await N('Period 1. English. The radiator knocks twice like it wants to be let out. Aidan is sitting directly in front of you. The back of his neck is very still.');
 await say('balduf','Poetry week, my darlings! This week: the ode. A poem of praise. For something you love. Or something you would like to.','happy');
 await scrawl('english',['THE ODE','A POEM OF PRAISE','NO \'COULD OF\'','EVER.'],'#a02020');
 hold('balduf','pen');
 await say('balduf','I’ll go first. So you know what good sounds like.','happy');
 await say('balduf','“Ode to My Red Pen.” “O little red pen, you never run dry. You’ve been through two hundred exercise books, and two hands. Both of them Hasan’s.”','closed');
 await say('hasan','That was ONE time.','angry');
 await say('balduf','Twice, darling. Twenty minutes. Write. Then everyone reads.','smirk');
 hold('balduf',null);
 for(const k of c.kids)if(A[k]&&A[k].pose==='sit')A[k].pose='write';
 A.aidan.pose='write';A.aidan.ex='smirk';
 await N('Everyone writes. Aidan writes faster than anyone. He has curled his arm round his page like it’s a hand of cards.');
 await say('hasan','(leaning forward over your shoulder) He’s SMILING. Aidan doesn’t smile. His face doesn’t have the muscles.','shock');
 A.hasan.pose='reach';await wait(400);
 A.aidan.pose='grab';A.aidan.dir=-1;SFX.smack();A.hasan.shake=1;
 await N('Aidan’s hand closes round Hasan’s wrist without Aidan turning his head.');
 await say('aidan','No.');
 A.aidan.pose='write';A.aidan.dir=-1;A.hasan.shake=0;A.hasan.pose='sit';
 await say('hasan','(rubbing his wrist) …He’s freezing. Like, fridge freezing. Bro’s been in a fridge.','scared');
 await say('corey','Leave it. He’s weird enough without help.');
 await say('hasan','It’s Friday. Friday Aidan gets a treat. Go on. Your desk’s right behind him.','smirk');
 const p=await choose(['Flick his ear. Keep flicking it.','Stick a note on his back: “KICK ME, I’M THE CALLING”.','Hook his chair with your foot for when he stands.','“Hasan. Leave him.”'],'Aidan is right in front of you.');
 D.f.prank=['flick','note','chair','none'][p];if(p<3)D.f.bullied=1;else D.f.kind=1;
 if(p===0){
  for(let i=0;i<3;i++){pose('you','point');SFX.click();A.aidan.shake=1;await wait(260);A.aidan.shake=0;pose('you','sit');await wait(450);if(i===1)await say('hasan','(wheezing into his sleeve)','laugh')}
  await N('On the fourth flick he speaks without turning round.');
  await say('aidan','Eight.');
  await say('you','…What?');
  await say('aidan','That’s eight. Last Friday you stopped at seven, because the bell went.','smirk');
  await say('hasan','What’s he on about? There was no last Friday. We had a training day last Friday.','scared');
 }else if(p===1){
  pose('you','write');hold('you','paper');
  await N('You write it in capitals. Hasan dictates the spelling of “Calling” three different ways, and you go with the worst one.');
  await say('hasan','Nobody knows what it means. That’s what makes it funny.','smirk');
  pose('you','reach');await wait(300);hold('you',null);
  prop({t:'note',follow:'aidan',dx:-3,dy:-18,y:A.aidan.y,layer:.2});SFX.click();pose('you','sit');
  await say('corey','(face in his sleeve) …I hate that I’m laughing.','laugh');
 }else if(p===2){
  await N('You slide your foot under the desk and hook it round the back leg of Aidan’s chair. Then you wait. You’re good at waiting.');
 }else{
  pose('you','grab');await say('you','Hasan. Leave him.');pose('you','sit');
  await say('hasan','You’re boring. You’re a boring, boring person.','sad');
  await N('Aidan’s pen stops. His head turns about three degrees towards you. Then it turns back.');
  await say('aidan','(very quietly) Thank you.');
 }
 for(const k of c.kids)if(A[k]&&A[k].pose==='write')A[k].pose='sit';
 await say('balduf','Pens DOWN. Aidan. You look inspired. You first.','happy');
 hold('aidan','paper');
 if(p===2){
  A.aidan.pose=null;await tw(A.aidan,{y:150},200);
  await say('aidan','Sorry, Miss. I’ve left my—');
  await N('He sits back down for his other sheet. You pull. He meets the floor at the speed of everyone’s favorite memory.');
  A.aidan.pose='lie';A.aidan.dir=1;SFX.thud();shake(.6);classLaugh();
  await wait(900);
  await N('He doesn’t use his hands to get up. He just sort of… unfolds, all in one piece, like someone pulling a sheet off a bed.');
  A.aidan.pose=null;A.aidan.ex='angry';
 }else{A.aidan.pose=null;await tw(A.aidan,{y:150},200)}
 await walk('aidan',76,40);A.aidan.y=146;face('aidan',1);A.aidan.ex=null;
 if(p===1){await wait(300);classLaugh(1800);await N('Half the room reads his back before he reaches the front. Nobody tells him.')}
 await say('aidan','“Ode to Omer.” By Aidan.');
 await say('nivaan','(whispering) Omer isn’t even in this class. This is a hate crime with extra steps.','shock');
 await say('aidan','“Omer, Omer, five foot two. Shorts in winter, legs gone blue.”');
 await say('aidan','“Your mother picks your clothes each day. She lays them out. You don’t get a say.”');
 await say('aidan','“She irons creases in your shorts. You think nobody knows. Of course.”','smirk');
 await say('aidan','“And every Friday is the same Friday. And every Friday, Omer loses.”','smirk');
 SFX.static();flash('#203060',.3);
 await N('The clock over the door ticks backwards. Once. Nobody else looks up. Aidan is looking straight at you.');
 intel('aidanPoem');if(typeof lore==='function')lore('poem');
 await say('balduf','Gorgeous rhythm, darling. A bit threatening. B-plus.','happy');
 A.hasan.pose='film';
 await say('hasan','(phone under the desk) Got it. ALL of it. Omer’s going to lose his MIND. Airdropping it to you.','smirk');
 give('video');
 await walk('aidan',140,40);A.aidan.pose='sit';A.aidan.y=158;A.aidan.dir=-1;hold('aidan',null);
 await say('balduf','Hasan.','smirk');
 A.balduf.pose=null;await Promise.all([walk('balduf',100,50),tw(A.balduf,{y:124},600)]);face('balduf',-1);
 A.hasan.pose='sit';
 await say('balduf','Hand.','smirk');
 await N('Hasan puts out his empty hand.');
 await say('balduf','Other hand.','evil');
 await N('He doesn’t move. She reaches down and takes the phone out of his lap like she’s picking a flower.');
 await say('balduf','Thank you. Now the first hand again, please. Flat on the desk.','evil');
 await evil('balduf');
 hold('balduf','pen');pose('balduf','slam');await wait(250);SFX.squelch();shake(.8);A.hasan.ex='yell';blood(A.hasan.x+6,A.hasan.y-10,16,1,36,A.hasan.y+4);
 await N('The red pen goes through the back of his hand and into the desk. It stays standing up, like a little flag.');
 await say('hasan','AAAAH— MY WRITING HAND—','cry');
 await say('balduf','Three, Hasan. That’s three. I’ll need a new ode.','evil');
 hold('balduf',null);pose('balduf',null);await sweet('balduf');
 await Promise.all([walk('balduf',40,60),tw(A.balduf,{y:146},600)]);face('balduf',1);A.balduf.pose='hips';
 await say('balduf','Next! You. Behind Aidan. Read yours.','happy');
 const r=await choose(['“Ode to Lunch.” Safe.','“I could of been a poet, but—”','“Ode to Ms. Balduf.” Suck up.']);
 if(r===1){
  await say('you','“I could of been a poet, but—”');
  await evil('balduf');
  A.balduf.pose=null;await Promise.all([walk('balduf',seatOf('back',1).x-14,120),tw(A.balduf,{y:126},400)]);
  hold('balduf','pen');pose('balduf','slam');SFX.squelch();A.you.ex='dead';A.you.hurt=3;blood(A.you.x,A.you.y-20,40,-1,80,A.you.y+3);shake(1);
  await N('The spare red pen goes in through your eye. She doesn’t even put her coffee down.');
  kill('you','lie',{pool:22});
  await say('balduf','“Could HAVE.” I did tell you, darling. It’s on the board.','evil');
  await die('redpen');
 }
 if(r===2){await say('you','“Ms. Balduf, your cardigan is green, like the leaves in a spring we’ll never deserve.”');await say('balduf','…That’s the most beautiful thing anyone has said to me since 1996. A-plus.','cry')}
 else{await say('you','“O lunch. Twelve-twenty. I think about you all morning.”');await say('balduf','Relatable. C.')}
 c.stay=['aidan'];await classOut(c);
 if(A.aidan){A.aidan.pose=null;await tw(A.aidan,{y:150},200);await walk('aidan',A.you.x-12,60);face('aidan',1)}
 await say('aidan',D.f.bullied?'(stopping at your desk on the way out) I remember who laughed. I remember all of it. Every time.':'(stopping at your desk on the way out) You stopped him. That’s new. That’s never happened.',D.f.bullied?'smirk':'sad');
 part('bully',1);
}});

hook({mis:'bully',period:2,room:'field',who:'omer',label:'Show Omer the video',cond:()=>has('video')&&!D.f.fight,run:async()=>{
 scene('field',{omer:[150,1,{pose:'cross',y:146}],jacob:[200,-1,{y:146}],you:[124,1,{y:152}]});
 await say('omer','What. You’ve got the face. The face people have when there’s something on their phone about me.','angry');
 pose('you','phone');await walk('omer',134,40);face('omer',-1);pose('omer',null);
 await N('He watches it once with no expression at all. Aidan’s voice comes out of your phone, tiny and flat: “shorts in winter, legs gone blue.”');
 await say('omer','Again.');
 await N('He watches it again. This time his jaw does something.');
 await say('omer','Again.','angry');
 await N('On the third time he mouths along with one line. The one about the creases.');
 pose('you',null);
 await say('omer','She does iron creases in my shorts. She does it on Sunday nights, while the soccer’s on. Nobody knows that.','sad');
 await say('omer','How does HE know that?','angry');
 await walk('jacob',170,40);
 await say('jacob','That’s about your mom. That’s out of order. I’m getting angry and it’s not even my mom.','angry');
 pose('omer','reach');await wait(300);pose('omer',null);
 await N('Omer takes his watch off. Carefully. Like it’s the only thing he owns that he’s scared of breaking.');
 await say('omer','Hold this. My mom got it me for my birthday. I don’t want anything on it.','sad');
 give('watch');
 A.omer.shake=1;SFX.crunch();await wait(300);A.omer.shake=0;
 await say('omer','Lunch. The lockers. Tell everyone.','angry');
 const opts=['I’ll tell everyone.','I’ll hold him for you.','“Omer, he’s weird. Leave it.”'];
 if(has('padlock'))opts.push('Give him the padlock in a sock.');
 const c=await choose(opts);
 D.f.fight=1;
 if(c===0){D.f.crowd=2;await say('omer','Good. I want an audience. I want it on the news.')}
 if(c===1){D.f.crowd=2;D.f.hold=1;await say('omer','You hold him. I do the rest. Like a team.')}
 if(c===2){D.f.crowd=1;await say('omer','Did he leave it? Did he leave my MOM out of it?','yell');await say('you','…No.');await say('omer','Then I’m not leaving it.')}
 if(c===3){D.f.crowd=2;D.f.padlock=1;take('padlock');hold('omer','padlock');await say('omer','…Where did you even get this.','shock');await say('you','Locker 13.');await say('omer','Angelo sells padlocks in socks. Of course he does.','smirk')}
 await say('jacob','(already walking off to tell people) Lockers. Lunch. Omer versus the bowl.','angry');
 await remove('jacob');
 part('bully',2);
}});

hook({mis:'bully',period:4,room:'corridor',who:'auto',cond:()=>D.f.fight,run:async()=>{
 D.f.bullied=1;const big=D.f.crowd>=2;
 scene('corridor',{aidan:[86,1,{y:140}],you:[170,-1,{y:158}]},true);
 cue('tension');
 crowd={n:2,cheer:false,phones:false,front:0,gap:[60,180]};
 await N('Lunch. The main corridor. Aidan is at locker 217 with the door open, standing very still, looking into it like it’s a window.');
 for(const n of[4,7,10,big?16:9]){crowd.n=n;await wait(350)}
 crowd.front=big?7:3;crowd.phones=true;
 await N(big?'It fills up fast. sixth graders on the radiators. tenth graders on the stairs. Somebody’s brought chips.':'A few people heard. A few people came.');
 put('nivaan',334,-1,{y:156,pose:'film'});walk('nivaan',236,80);
 await say('nivaan',big?'We are LIVE. Four hundred. Five hundred. Chat is feral. Chat wants blood.':'We’re live. Thirty-one viewers. Hi, Mom.','happy');
 put('omer',-14,1,{y:150});
 crowd.cheer=true;cue('fight');
 await crowdSay('FIGHT! FIGHT! FIGHT!');
 await walk('omer',66,60);
 await say('omer','“Ode to Omer”, yeah?','angry');
 face('aidan',-1);
 await say('aidan','You watched it three times.','smirk');
 await say('omer','…How do you know that?','shock');
 await say('aidan','Shorts in winter.','smirk');
 await hit('omer','aidan',{pose:'headbutt',sfx:SFX.crunch,blood:14,push:4});pose('omer',null);
 await crowdSay('OHHHHHHHH—');
 await N('Aidan’s nose is bleeding. He touches it and looks at the blood on his fingers like he’s never seen his own before. Then he smiles.');
 await say('aidan','Again.','smirk');
 const opts=[{t:'Grab Aidan’s arms from behind.'},{t:'Get in there yourself.'},{t:'Just watch.'}];
 if(D.f.padlock)opts.unshift({t:'Shout “OMER — THE SOCK!”',tag:'🔒'});
 const c=await choose(opts,'Aidan is smiling. Nobody else is.');const pk=opts[c].t;
 if(pk.startsWith('Get')){
  await walk('you',100,90);face('you',-1);
  await say('you','Oi, bowl cut—');
  face('aidan',1);ex('aidan','evil');fxState.red=1;SFX.sting();crowd.cheer=false;
  await N('He turns his head the way an owl does. All the way round. The chanting stops at the same moment, like somebody pulled a plug.');
  await walk('aidan',92,90);pose('aidan','choke');A.you.ex='scared';
  for(let i=0;i<4;i++){SFX.locker();shake(.8);A.you.hurt=Math.min(3,i+1);wallSplat(84+i,64+i*2,6);blood(A.you.x,A.you.y-22,12,-1,60,A.you.y+2);await wait(320)}
  kill('you','crush',{pool:30});
  await N('He puts your head through the door of locker 217 four times. Then he closes it on what’s left. Gently. Like he’s tucking you in.');
  await say('aidan','Same time next Friday.','smirk');
  await die('ring');
 }
 if(pk.startsWith('Just')){
  ex('aidan','evil');await N('Aidan stops smiling. That’s worse.');
  await hit('aidan','omer',{blood:12,push:10});await hit('aidan','omer',{blood:14,push:8});
  pose('aidan','grab');await walk('aidan',50,80);SFX.locker();shake(.9);wallSplat(30,70,8);
  A.omer.pose='lie';A.omer.hurt=3;SFX.thud();A.omer.bleed=1;crowd.cheer=false;
  await crowdSay('…oh.');
  await say('omer','(from the floor) …Mom…','cry');
  put('sherman',334,-1,{y:150});await walk('sherman',250,60);
  await say('sherman','WHAT is going ON in my corridor?','yell');
  await say('sherman','Omer. Lying down. On school property. Detention.','angry');
  face('aidan',1);await say('aidan','(walking past you, very close) Same time next Friday.','smirk');
  await N('You still have Omer’s watch in your pocket. It’s still ticking.');
  await complete('bully','omer');return;
 }
 let won;
 if(pk.startsWith('Grab')){
  await walk('you',100,90);face('you',-1);pose('you','hold');ex('you','angry');
  await say('you','GOT HIM— Omer, GO—');
  won=await mash('Hold Aidan’s arms!',{need:20,time:5,info:'He’s colder than he should be. And stronger. MASH!',onHit(){shake(.2)}});
 }else{
  await say('omer','(swinging a padlock in a sock) I’ve never felt more alive.','happy');
  won=await mash('Hype Omer up!',{need:16,time:5,info:'Get the crowd going!',onHit(){SFX.cheer()}});
 }
 if(!won){
  ex('aidan','evil');pose('you',null);
  await N('He shrugs you off like a coat. Omer swings and misses. Aidan doesn’t.');
  await hit('aidan','omer',{blood:14,push:10});await hit('aidan','omer',{blood:16,push:10});
  A.omer.pose='lie';A.omer.hurt=3;SFX.thud();crowd.cheer=false;
  await crowdSay('…oh no.');
  await say('aidan','(to you, with Omer’s blood on his cheek) You held me. I’ll remember that.','smirk');
  await complete('bully','omer');return;
 }
 await say('omer','She picks my clothes because she LOVES me—','yell');
 for(let i=0;i<3;i++)await hit('omer','aidan',{blood:12,push:0,ms:220});
 pose('you',null);await walk('you',130,80);
 pose('omer','grab');await N('Omer pulls the door of locker 217 all the way open, and holds it there.');
 A.aidan.dir=-1;
 for(let i=0;i<5;i++){pose('omer','slam');SFX.locker();shake(.9);A.aidan.hurt=3;wallSplat(84,70,7+i);blood(A.aidan.x,A.aidan.y-24,16,1,80,A.aidan.y+2);await wait(330)}
 kill('aidan','crush',{pool:34,bleed:4});pose('omer',null);
 cue('dead');crowd.cheer=false;
 await N('On the fifth slam something gives. It isn’t the locker door.');
 await say('nivaan','(very quietly) …Stream got banned. I’ve been banned from the internet.','shock');
 await say('omer','(looking at his hands) He shouldn’t have said that about my mom.','sad');
 await N('You hold out his watch. He looks at it for a long time. Then he puts it in his pocket instead of on his wrist.');
 take('watch');
 put('sherman',334,-1,{y:150});await walk('sherman',190,50);
 await say('sherman','WHAT is going on in my— oh.','shock');
 await say('sherman','…Who’s cleaning that?','angry');
 await say('sherman','You. With the face. Put him in the locker. Mop until it shines. Then mop again.','angry');
 await N('You fold Aidan into locker 217. It takes longer than it should. He’s cold already. Colder than anyone should get this fast.');
 D.f.aidanDead=1;P.killedAidan=1;save();SFX.locker();A.aidan.vis=false;
 await complete('bully','dead');
}});

/* =================================================================
   SEAT WARS
   ================================================================= */
dropHooks('seat');
Object.assign(MIS.seat,{
 blurb:'Ms. Sherman has a new seating plan. It splits up Corey, Arjun, Alex, Dheva and Marcus, which is the point. Her mood flips faster than the strip light.',
 parts:['Period 3, Math: the new plan','Lunch, Math: her drawer','Period 7, Math: the swap'],
 tips:['Period 3, Math. She’ll call you up one at a time.','Lunch, the Math room. She’s on cafeteria duty. Dheva and Marcus are already in there.','Period 7, Math. Keep her sweet. Do something about Arjun’s mouth (Angelo sells tape).']});

hook({mis:'seat',period:3,room:'maths',who:'auto',run:async()=>{
 const line=['corey','arjun','alex','dheva','marcus','tyler'].filter(n=>!D.dead[n]);
 const cast={shermian:[44,1,{pose:'hips',y:146,hold:'clipboard'}]};
 line.forEach((n,i)=>cast[n]=[96+i*24,-1,{y:126}]);cast.you=[96+line.length*24,-1,{y:126}];
 scene('maths',cast,true);cue('class');
 await N('Period 3. Math. The desks have been pushed into new rows. Nobody is allowed to sit down. Everyone stands along the back wall like it’s an identity parade.');
 await say('shermian','Good morning, my angels! NEW SEATING PLAN! Isn’t that exciting?','happy');
 await say('marcus','I love it when she rearranges things. Gets everyone worked up.','smirk');
 const send=async(id,row,i,line_,ex_)=>{await say('shermian',line_,ex_||'happy');if(!A[id])return;A[id].pose=null;await Promise.all([walk(id,seatOf(row,i).x,70),tw(A[id],{y:seatOf(row,i).y},600)]);sitAt(id,row,i,-1)};
 await send('corey','back',4,'Corey, sweetie. By the window. You look like a boy who needs a window.');
 await send('arjun','front',0,'Arjun. Front row. Right where Miss can LOVE you.');
 await send('alex','back',0,'Alex, back left. Dheva, front right. You two are never sitting together again, and you know why.');
 await send('dheva','front',4,'Dheva. Go.','smirk');
 if(A.tyler)await send('tyler','back',1,'Tyler, there. You, next to Tyler.');
 await send('you','back',2,'You.');
 await say('shermian','And Marcus…','smirk');
 await say('shermian','Marcus. Next to ME.','evil');
 await walk('marcus',74,40);A.marcus.pose='sit';A.marcus.y=150;face('marcus',-1);
 await say('marcus','Bold. I respect it. I’m frightened, but I respect it.','smirk');
 await say('dheva','Miss, can Alex and me just— we’re working on a—','sad');
 await evil('shermian');
 await say('shermian','Did I ASK what you WANTED, Dheva?','evil');
 await say('shermian','Did ANYONE in this room hear me ask what DHEVA WANTED?','evil');
 await N('Nobody breathes. A pen rolls off a desk and nobody picks it up. It rolls all the way to the radiator.');
 await sweet('shermian');
 await say('shermian','Lovely. Sit up straight, sweetie.','happy');
 face('arjun',1);
 await say('arjun','(to Dheva, across the front row) Should’ve used more powder, bro. Your hair’s louder than you are.','smirk');
 ex('dheva','sad');face('arjun',-1);
 await say('arjun','Miss. Is your husband still staying at his mom’s? Asking for the whole class.','smirk');
 await evil('shermian');
 await say('shermian','What. Did. You. Say.','evil');
 const c=await choose(['“Miss! Is that a picture of your cat?”','Say nothing.']);
 if(c===0){
  await say('you','Miss! Is that a picture of your cat? On the wall?');
  await sweet('shermian');
  await say('shermian','MR. BISCUITS! He’s nine. He has a little bed shaped like a croissant. He sleeps on his back like a man.','happy');
  intel('shermianCat');
  if(A.tyler){await say('tyler','(whispering, to you) Didn’t Mr. Biscuits die? Last year? She brought him in. In a box.','shock');await evil('shermian')}
 }else if(A.tyler){await say('tyler','(whispering) oh my god','shock');await evil('shermian')}
 if(A.tyler){
  await say('shermian','Tyler. Did you just speak?','evil');
  await say('tyler','N-no, Miss.','scared');
  A.shermian.pose=null;await Promise.all([walk('shermian',seatOf('back',1).x-14,70),tw(A.shermian,{y:126},400)]);face('shermian',1);
  await sweet('shermian','evil');pose('shermian','hug');
  await say('shermian','Come here, sweetie. Hugs.','happy');
  await wait(500);SFX.crunch();shake(1);flash('#fff',.3);
  kill('tyler','lie',{pool:10,bleed:0,spray:2});A.tyler.ex='dead';pose('shermian',null);
  await N('It sounds exactly like someone opening a bag of chips.');
  await say('shermian','Seat fourteen is available, everyone!','happy');
  await say('arjun','…Okay. That one’s on me. I accept that.','shock');
  await Promise.all([walk('shermian',44,70),tw(A.shermian,{y:146},400)]);face('shermian',1);A.shermian.pose='hips';
 }else await sweet('shermian');
 await say('shermian','Nobody. Touches. My drawer. The plan lives in my drawer. The plan is FOREVER.','evil');intel('shermianDrawer');
 await sweet('shermian');
 if(A.tyler&&A.tyler.dead)await N('You have to sit next to Tyler for the rest of the lesson. Nobody moves him. She teaches simultaneous equations around him like he’s a puddle.');
 else await N('You sit next to the empty chair. Tyler’s chair. She teaches simultaneous equations around it like it’s a puddle.');
 await say('corey','(across the room, mouthing) We need to get back together. Not like— you know what I mean.');
 await say('alex','(whispering to the wall) Five of us. Back row. That’s all I want from life.','sad');
 await classOut({seats:seatsFor('maths').map((s,i)=>Object.assign(s,{who:['alex','tyler','you','x','corey','arjun','x','x','x','dheva'][i]})),t:'shermian'});
 D.f.seat1=1;part('seat',1);
}});

hook({mis:'seat',period:4,room:'maths',who:'dheva',label:'Ask Dheva about the plan',look:{pose:'cover',ex:'sad'},cond:()=>D.f.seat1&&!D.f.seat2,run:async()=>{
 scene('maths',{dheva:[160,1,{y:146}],marcus:[200,-1,{y:146}],you:[124,1,{y:152}]});
 await say('dheva','She’s on cafeteria duty till quarter to. The drawer’s locked, but it’s a garbage lock. It’s a diary lock. It’s a lock you get free with a magazine.');
 await say('marcus','I’ve never been in a teacher’s drawers before.','smirk');
 await say('marcus','…I heard it as I said it. I’m keeping it.','smirk');
 const w=await choose(['Marcus watches the door.','Dheva watches the door.'],'Someone has to watch the door window.');
 const look_=w===0?'marcus':'dheva';
 await walk(look_,296,60);face(look_,1);
 await say(look_,w===0?'I’ve been watching doors my whole life. Doors and the people who walk through them.':'On it.',w===0?'smirk':null);
 if(w===1)await N('Dheva immediately starts checking his hair in the door window. Left side. Right side.');
 await walk('you',44,60);pose('you','kneel');
 const r=await meter('Pick the drawer lock with a compass point',{speed:1.25});
 if(r===0||w===1){
  SFX.door();
  await N(w===1?'The lock pops. Dheva is still fixing one strand of hair. You hear heels before he does.':'The compass point snaps off inside the lock. Marcus whistles. Too late.');
  put('shermian',334,-1,{y:150});await walk('shermian',90,130);
  await evil('shermian');
  await say('shermian','In. My. DRAWER?','evil');
  pose('you',null);A.you.ex='scared';
  pose('shermian','slam');SFX.locker();shake(1);wallSplat(44,92,8);
  await N('She slams the drawer shut on your head. Then she opens it, puts the plan back in, and shuts it on you again for luck.');
  kill('you','crush',{pool:24});
  await sweet('shermian');
  await say('shermian','There. Now you’re in the plan. Forever.','happy');
  await die('seat');
 }
 SFX.pick();pose('you',null);hold('you','plan');
 await N('Seating Plan, version fourteen. Every friend group split down the middle. Little hearts by the kids she’s watching. Tyler’s heart is crossed out. Different ink.');
 await walk(look_,190,60);
 await say('dheva','Right. Back row, five seats. Rules.');
 await say('dheva','I’m not sitting next to Corey. His curl cream smells like grape and it makes me hungry.');
 await say('marcus','I’m not sitting next to Alex. He blushes when I talk and it distracts us both.','smirk');
 await say('dheva','Alex has to be on an end. Sport legs. They need somewhere to go.');
 await say('marcus','Corey said window, seat five, “non-negotiable”. Then he went a bit quiet and looked at the window.');
 await say('dheva','And Arjun goes in the middle. So everyone can reach him with an elbow.');
 const names=['alex','dheva','arjun','marcus','corey'];let tries=0;
 while(true){
  const left=names.slice(),plan=[];
  for(let s=0;s<4;s++){const i=await choose(left.map(n=>K[n].n),'Back row, seat '+(s+1)+' of 5:');plan.push(left[i]);left.splice(i,1)}
  plan.push(left[0]);
  await N('You write it in her handwriting: '+plan.map((n,i)=>(i+1)+'. '+K[n].n).join('   '));
  if(plan.join()==='alex,dheva,arjun,marcus,corey')break;
  tries++;
  await say('dheva',pick(['No. That breaks a rule. Read the rules.','That’s wrong and you know it’s wrong.']),'angry');
  await say('marcus',pick(['I’m next to Alex. I can’t be held responsible.','Arjun has to be in the middle. It’s the one thing we agreed on as a society.','Corey said window. You saw his face.']));
  if(tries>=2){
   await N('Heels. In the corridor. Getting closer the way a storm does.');
   put('shermian',334,-1,{y:150});await walk('shermian',150,130);await evil('shermian');
   await say('shermian','My DRAWER. My PLAN. My ANGELS.','evil');
   await walk('shermian',A.you.x+12,140);pose('shermian','choke');A.you.ex='scared';SFX.crunch();shake(1);
   kill('you','lie',{pool:12,bleed:0});
   await sweet('shermian');await say('shermian','Shh. Sit. Forever.','happy');
   await die('seat');
  }
 }
 take('plan');give('newplan');
 await say('dheva','Perfect. She’ll never notice. She will absolutely notice. But perfect.','happy');
 D.f.seat2=1;part('seat',2);
}});

hook({mis:'seat',period:6,room:'maths',who:'auto',cond:()=>D.f.seat2&&!D.dead.arjun,run:async()=>{
 const order=['alex','dheva','arjun','marcus','corey'].filter(n=>!D.dead[n]);
 const cast={shermian:[44,1,{pose:'hips',y:146,hold:'plan'}],you:[seatOf('front',2).x,-1,{pose:'sit',y:SEATS.frontY}]};
 order.forEach((n,i)=>cast[n]=[96+i*24,-1,{y:126}]);
 scene('maths',cast,true);cue('class');
 if(D.dead.tyler){prop({t:'flower',x:seatOf('back',1).x,y:SEATS.backY-12,layer:20});await N('Period 7. Tyler’s seat has a pencil case on it and a single flower someone picked from the field. Ms. Sherman has put a sticker on the flower.')}
 else await N('Period 7. Math again. The same room, with the light coming in lower.');
 await say('shermian','New plan, angels! Let’s see… Alex. Dheva. Arjun. Marcus. Corey. All in the back row. Hm.','smirk');
 for(let i=0;i<order.length;i++){const n=order[i],s=seatOf('back',['alex','dheva','arjun','marcus','corey'].indexOf(n));A[n].pose=null;await Promise.all([walk(n,s.x,90),tw(A[n],{y:s.y},400)]);sitAt(n,'back',['alex','dheva','arjun','marcus','corey'].indexOf(n),-1)}
 await say('shermian','I don’t remember writing this.','smirk');
 await evil('shermian');await N('Her left eye has started to twitch. It twitches in time with the clock.');
 const c=await choose(['“You wrote it last night, Miss. After you fed Mr. Biscuits.”','“Miss, your handwriting’s got really pretty.”','Say nothing.'],'Her eye is twitching.');
 if(c===1){
  await say('you','Miss, your handwriting’s got really pretty.');
  await say('shermian','My handwriting has ALWAYS been pretty.','evil');
  A.shermian.pose=null;await walk('shermian',A.you.x-14,90);hold('shermian','pen');pose('shermian','slam');SFX.squelch();A.you.hurt=3;blood(A.you.x,A.you.y-20,30,-1,60,A.you.y+3);shake(1);
  await N('She takes the stapler off her desk and staples your mouth shut. Then, carefully, your forehead to the desk.');
  kill('you','lie',{pool:20});
  await say('shermian','Neat AND pretty.','happy');
  await die('seat');
 }
 if(c===0){await sweet('shermian');await say('shermian','I DID feed Mr. Biscuits! Salmon. He looked at me like I was the moon.','happy')}
 else{await N('She stares at the plan for a full minute. Then she shrugs and puts it in her drawer, and locks it, and pats it.');await sweet('shermian')}
 await say('corey','(whispering) We did it. We actually—','happy');
 await say('arjun','Best seat I’ve ever had, Miss. Better than your marriage.','smirk');
 await evil('shermian');
 const k=await choose([{t:'Tape Arjun’s mouth shut.',dis:!has('tape'),why:'no tape',tag:'🩹'},{t:'Kick Arjun’s chair.'},{t:'Let him talk. He’s earned this.'}],'Ms. Sherman is walking down the row.');
 if(k===0){
  take('tape');A.you.pose=null;await Promise.all([walk('you',A.arjun.x+12,120),tw(A.you,{y:SEATS.backY+2},300)]);face('you',-1);pose('you','hold');
  SFX.whoosh();await wait(200);SFX.whoosh();
  await say('arjun','MMMPH. MMMPHHH.','angry');
  pose('you',null);await Promise.all([walk('you',seatOf('front',2).x,120),tw(A.you,{y:SEATS.frontY},300)]);sitAt('you','front',2,-1);
  await sweet('shermian');
  await say('shermian','Oh! What a lovely, quiet boy.','happy');
  await say('shermian','What a lovely little family you all are. I could keep you forever.','happy');
  await N('She doesn’t blink once while she says it. Behind the tape, Arjun is, for the first time in his life, not talking. He looks almost peaceful.');
  for(const n of['alex','dheva','corey','marcus'])if(A[n])ex(n,'happy');
  await say('marcus','Seat four. Next to Arjun. Close. Warm. I’ve never been happier.','smirk');
  await complete('seat','perfect');return;
 }
 if(k===1){await N('You kick his chair. It only makes him louder.');await say('arjun','OW. And it’s TRUE, Miss, he’s at his mom’s because—','angry')}
 A.shermian.pose=null;await Promise.all([walk('shermian',A.arjun.x-14,70),tw(A.shermian,{y:126},400)]);face('shermian',1);
 await say('shermian','Arjun, sweetie. Look at me.','evil');
 hold('shermian','book');pose('shermian','slam');
 for(let i=0;i<3;i++){SFX.crunch();shake(.9);blood(A.arjun.x,A.arjun.y-18,14,1,60,A.arjun.y+3);A.arjun.hurt=3;await wait(320)}
 kill('arjun','crush',{pool:26});hold('shermian',null);pose('shermian',null);
 await N('She uses the ninth grade textbook. Hardback. Six hundred pages. She finds his page number afterwards and writes it on the board, so he can catch up.');
 await sweet('shermian');
 await say('shermian','Four little angels. Even better!','happy');
 await say('dheva','…We’re together.','shock');
 await say('corey','Minus one.','shock');
 await say('marcus','Morally, it’s a draw.','sad');
 await complete('seat','minus');
}});
