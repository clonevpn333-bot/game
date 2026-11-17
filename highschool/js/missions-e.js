'use strict';
/* =====================================================================
   HIGHSCHOOL — missions E: the made-up kids (Tez, Ollie, Kayden),
   Fair City Mall after school, more collectibles and deaths
   ===================================================================== */
Object.assign(ITEMS,{compass:'Compass shiv (Tez)',chucks:'Ruler-chucks (Tez)',extinguisher:'A fire extinguisher (Tez)',soaker:'A Super Soaker full of Axe body spray'});
Object.assign(INTEL,{adamMonday:'Mr. Adam has “arrangements” for Monday’s inspection.',bombWire:'Never cut red. Cut the gold one — the thing he loves.',ollie:'Ollie Finch has been stuck in Friday since 1987.',tezPass:'Tez’s password is “I’m twenty-one, leave me alone”.'});

/* =================================================================
   THE ARMOURY — Tez
   ================================================================= */
mission('armoury',{name:'The Armoury',icon:'🗡️',who:['tez'],
 blurb:'Tez has been in tenth grade for six years. He’s twenty-one. He has a moustache and a business in the end cubicle: things that keep you alive when the teachers turn.',
 parts:['Before school: find Tez’s office','Pick your weapon'],
 tips:['Before school, the bathroom. End cubicle.','Break, lunch or PE, the bathroom. Bring $2 or be ready to do a favour.'],
 doneTip:'Weapons change how some deaths go. A compass for Voss or Pratt. Ruler-chucks for Coach. An extinguisher for Pat or a bomb.'});

hook({mis:'armoury',period:0,room:'toilets',who:'tez',label:'Knock on the end cubicle',cond:()=>!D.f.tez1,run:async()=>{
 scene('toilets',{tez:[200,-1,{pose:'lean',y:146}],you:[160,1,{y:154}]});
 await say('tez','Password.','smirk');
 await say('you','…I don’t know the password.');
 await say('tez','It’s “I’m twenty-one, leave me alone”. Everyone knows it. Teachers know it.','smirk');
 intel('tezPass');
 await say('tez','tenth grade. Six years running. I’ve seen things. I’ve seen Coach cut a lad in half over a beep. I’ve seen Kettle bake a prefect.','smirk');
 await say('tez','So I sell protection. Not drugs. I’m not an animal. Stationery. Weaponised.','happy');
 await say('tez','Come back at break and pick something. Two bucks, or a favour. I’m flexible. I’m twenty-one.');
 D.f.tez1=1;part('armoury',1);
}});

hook({mis:'armoury',period:[2,4,5],room:'toilets',who:'tez',label:'Buy a weapon off Tez',cond:()=>(D.f.tez1||P.intel.tezPass)&&!['compass','chucks','extinguisher'].some(has),run:async()=>{
 scene('toilets',{tez:[200,-1,{pose:'lean',y:146}],you:[160,1,{y:154}]});
 if(!D.f.tez1){await say('you','I’m twenty-one, leave me alone.');await say('tez','…Respect. You’ve been here before. You’ve got the eyes.','smirk')}
 await say('tez','Menu.','smirk');
 const c=await choose(['The Compass Shiv. (“Geometry, but personal.”)','Ruler-Chucks. (Two thirty-centimetre rulers and a shoelace.)','The Fire Extinguisher. (“It’s not a weapon. It’s a lifestyle.”)']);
 const it=['compass','chucks','extinguisher'][c];
 const pay=await choose([{t:'Pay $2.',dis:D.money<2,why:'skint'},{t:'“What’s the favour?”'}]);
 if(pay===0){D.money-=2;updateLoc()}
 else{
  await say('tez','Write my English essay. “Is Macbeth to blame?” Six years I’ve been doing that essay. I don’t know anymore. I don’t know if anyone’s to blame.','sad');
  await say('you','(writes “Yes, mostly” on a napkin and hands it over)');
  await say('tez','…That’s the best one yet.','happy');
 }
 give(it);
 await say('tez',['Stabby end goes in the teacher. Not in you. People get that wrong.','Wrist action. Like a helicopter, but angry.','Point it, squeeze it, don’t lick it. Kayden licked it.'][c],'smirk');
 await complete('armoury');
}});

/* =================================================================
   REGISTER — Ollie, the boy nobody else can see
   ================================================================= */
mission('register',{name:'Register',icon:'👻',who:['ollie','aidan'],hidden:1,lockText:'There’s a sixth grader in the library during lessons. Nobody else looks at him.',
 blurb:'Ollie Finch is in sixth grade. His uniform is from 1987. He’s always in the library. Nobody else ever looks at him.',
 parts:['Period 1: the boy in the library','Later: give him back what he lost'],
 tips:['Bunk Period 1 in the library.','Find the overdue book (it’s a collectible in the library), then come back in Period 3 or 7.']});

hook({mis:'register',period:1,room:'library',who:'ollie',label:'Ask the sixth grade if he’s lost',cond:()=>!D.f.ollie1,run:async()=>{
 scene('library',{ollie:[250,-1,{y:146}],kid3:[150,1,{pose:'sit',y:150}],you:[220,1,{y:154}]});
 cue('library');
 await say('ollie','You can see me? Nobody can see me. Well. One other person.','shock');
 await say('ollie','I’m Ollie. Ollie Finch. 7F. I’m looking for my library book. “How to Be Brave”. It’s overdue. Ms. Sherman said if I didn’t bring it back she’d see me in her office.','scared');
 await say('kid3','(looking up from her book, straight through Ollie) Who are you talking to?','shock');
 await say('ollie','See? Nobody.','sad');
 await say('ollie','I went to her office. She told me to stand on the rug.','sad');
 await N('His sweater has a name tag sewn into it. The name tag says 1987.');
 await say('ollie','It’s always Friday for me. It has been for ages. Is it always Friday for you, too?','sad');
 D.f.ollie1=1;part('register',1);
}});

hook({mis:'register',period:[3,6],room:'library',who:'ollie',label:'Give Ollie his book back',cond:()=>D.f.ollie1&&P.coll.overdue,run:async()=>{
 const cast={ollie:[230,-1,{y:146}],you:[200,1,{y:154}]};if(D.period===6&&!D.f.aidanDead)cast.aidan=[150,1,{pose:'sit',y:150}];
 scene('library',cast);cue('sad');
 await N('You found it on the bottom shelf, behind the encyclopedias. “How to Be Brave”. Due back 14th March 1987. Signed out by O. Finch. Signed in by nobody.');
 hold('you','book');pose('you','hold');await wait(400);hold('you',null);pose('you',null);hold('ollie','book');
 await say('ollie','You found it. You actually…','cry');
 if(A.aidan){face('aidan',1);await say('aidan','Hi, Ollie.','sad');await say('ollie','Hi, Aidan.','happy');await say('you','You two know each other?');await say('aidan','He was the first one. I’m just the latest.','sad')}
 else await say('ollie','There’s a boy with a bowl cut who can see me too. Aidan. He keeps the Fridays now. I told him it’s a terrible idea. Fridays are lonely.','sad');
 intel('ollie');
 await say('ollie','I think I can go now. I don’t know where. Somewhere it’s Saturday.','happy');
 await N('He opens the book. The first page says, in a child’s handwriting: “Rule 1. Tell someone.”');
 await tw(A.ollie,{alpha:0},2200);A.ollie.vis=false;D.dead.ollie=1;
 await N('The book drops onto the carpet. It isn’t overdue anymore. The return date says today.');
 await complete('register');
}});

/* =================================================================
   OPPS — Kayden and the Highgate Hittaz
   ================================================================= */
mission('opps',{name:'Opps',icon:'💦',who:['kayden'],
 blurb:'Kayden is four foot eleven, wears a puffer jacket in July, and runs a “gang” called the Highgate Hittaz. Membership: Kayden. Weapon: a Super Soaker.',
 parts:['Break: get jumped in to the Highgate Hittaz','After school: the drive-by at the mall'],
 tips:['Break, the field.','After school, Fair City Mall rooftop parking. Watch out for Big Glen.'],variants:{wet:'The eighth graders got soaked',glen:'Big Glen joined the gang'}});

hook({mis:'opps',period:2,room:'field',who:'kayden',label:'Ask Kayden what he’s doing',cond:()=>!D.f.kay1,run:async()=>{
 scene('field',{kayden:[100,1,{y:152,pose:'cross'}],omer:[150,-1,{pose:'cross',y:146}],jacob:[200,-1,{y:146}],you:[124,-1,{y:156}]});
 await say('kayden','Highgate Hittaz. HGH. We’re recruiting. Well. I’m recruiting. Currently it’s just me and my cousin, but he lives in Wales.','smirk');
 await say('kayden','The eighth graders are opps. They called my puffer “a sleeping bag with arms”. That’s violence. That’s a declaration of war.','angry');
 await say('omer','It does look like a sleeping bag with arms.');
 await say('kayden','I’ll put you in the dirt, Omer. Respectfully. Please don’t hit me.','scared');
 await say('kayden','You want in? Initiation’s simple. Say the oath.','smirk');
 const c=await choose(['“Highgate Hittaz till I die.”','“I am not saying that.”']);
 if(c===1){await say('kayden','Then you’re an opp. I’ve got your face in my notes app.','angry');return}
 await say('you','Highgate Hittaz till I die.');
 await say('kayden','WELCOME, brother. Here’s your strap.','happy');
 give('soaker');
 await N('It’s a Super Soaker. It’s full of Axe body spray and semi-skimmed milk. It smells like an eighth grader changing room’s worst nightmare.');
 await say('jacob','(quietly) That’s the most dangerous thing I’ve seen today, and I watched Coach do the beep test.','shock');
 await say('kayden','After school. The mall. Roof parking lot. We ride at four.','smirk');
 D.f.kay1=1;part('opps',1);
}});

hook({mis:'opps',period:8,room:'carpark',who:'kayden',label:'Ride out with Kayden',cond:()=>D.f.kay1&&has('soaker'),run:async()=>{
 scene('carpark',{kayden:[40,1,{y:150}],you:[20,1,{y:156}],kid1:[230,-1,{y:148}],kid2:[252,-1,{y:150}],glen:[300,-1,{pose:'cross',y:150}]});
 if(!D.dead.arjun)put('arjun',160,1,{pose:'sit',y:104});
 cue('arcade');
 await say('kayden','There they are. The opps. eighth grade. Look at them. Laughing. Existing.','angry');
 prop({t:'scooter',follow:'kayden',x:0,y:0,layer:.5});prop({t:'scooter',follow:'you',x:0,y:0,layer:.5});hold('kayden','soaker');hold('you','soaker');
 await say('kayden','We roll up on the scooters, we spray, we get out. Nobody gets hurt. Everybody gets moist.','smirk');
 await Promise.all([walk('kayden',190,140),walk('you',176,140)]);
 pose('you','hold');pose('kayden','hold');
 for(let i=0;i<20;i++)parts.push({x:180+rand(0,10),y:128,vx:rand(60,120),vy:rand(-40,0),c:i%2?'#f4f4f0':'#e8e070',s:2,fy:150,life:1.5});
 SFX.whoosh();await wait(300);SFX.whoosh();
 ex('kid1','shock');ex('kid2','yell');
 await say('kid1','MY EYES. IT’S MILK. WHY IS IT MILK.','yell');
 await say('kid2','It smells like my DAD.','cry');
 pose('you',null);pose('kayden',null);
 await say('glen','OI.','angry');
 await say('kayden','Uh oh. That’s Big Glen. Big Glen has never once been told no.','scared');
 await walk('glen',230,90);
 const ok=await mash('Scoot for your life!',{need:20,time:5,info:'Big Glen is surprisingly fast. MASH!'});
 if(!ok){
  await say('glen','You’re barred. From the mall. And from feeling things.','evil');
  SFX.static();shake(1.2);flash('#c8e8ff',.6);A.you.shake=1;
  await N('Big Glen tasers you. Then he keeps going, because he’s never been taught when to stop.');
  kill('you','lie',{pool:4,bleed:0,spray:0});
  await say('kayden','(from behind a trash can) Rest in peace, Hittaz Number Two. We ride for you.','cry');
  await die('taser');
 }
 await Promise.all([walk('you',20,160),walk('kayden',40,160)]);
 await say('glen','…','angry');
 await say('glen','…Was that a Super Soaker 3000?','shock');
 await say('kayden','The Super Soaker 3000. Limited edition. My cousin got it in Wales.','smirk');
 await say('glen','I had one of them. 1998. Best summer of my life.','sad');
 await say('kayden','You want in, big man? Highgate Hittaz. We need muscle. We’ve got none.','smirk');
 await say('glen','(after a very long pause) …Till I die.','happy');
 await complete('opps',Math.random()<.5?'wet':'glen');
}});

/* =================================================================
   FAIR CITY MALL — after school. The real stuff.
   ================================================================= */
mission('alone',{name:'Arjun, Alone',icon:'🌇',who:['arjun'],
 blurb:'Arjun says the worst things anyone has ever said to anyone. After school, he sits on the edge of the mall parking lot on his own.',
 parts:['After school: the rooftop parking'],tips:['After school, Fair City Mall rooftop parking. He’s on the wall.']});
hook({mis:'alone',period:8,room:'carpark',who:'arjun',label:'Sit with Arjun',cond:()=>!D.dead.arjun,run:async()=>{
 scene('carpark',{arjun:[160,1,{pose:'sit',y:104}],you:[178,-1,{pose:'sit',y:104}]});
 cue('sunset');
 await say('arjun','Come to watch me jump? Joking. I’m not going to jump. I’m too good-looking. The world needs this.','smirk');
 await N('The sun is going down over Fair City. From up here the whole town looks like it’s been switched off and on again.');
 await say('arjun','You lot think I’m just a dick, don’t you.');
 await say('arjun','…Fair.','sad');
 await say('arjun','My dad says worse. Every night. At dinner. Like seasoning. “Your forehead’s an embarrassment.” “Your marks are an embarrassment.” “I’m embarrassed when people ask how many kids I’ve got.”','sad');
 await say('arjun','So I say it first. To everyone. If I say it first, it’s a joke. If he says it, it’s just… true.','sad');
 const c=await choose(['“That doesn’t make it okay, bro.”','“You don’t have to do that with us.”','“You’re still a dick, though.”']);
 if(c===0){await say('you','That doesn’t make it okay. What you said to Hasan today. About his dad.');await say('arjun','…I know. I know it doesn’t. I’ll say sorry. I won’t say sorry. I’ll buy him a burger. That’s sorry in Hasan.','sad')}
 if(c===1){await say('you','You don’t have to do that with us. Nobody in the group’s your dad.');await say('arjun','(very quietly) Don’t be nice to me. I don’t know what to do with my face when people are nice to me.','cry')}
 if(c===2){await say('you','You’re still a dick, though.');ex('arjun','laugh');await say('arjun','(actually laughing, for the first time all day) Yeah. Yeah, I am. Thanks. Honestly. That’s the nicest thing anyone’s said.','laugh')}
 await N('You sit there until the parking lot lights come on. He doesn’t say anything cruel the whole time. It’s the longest he’s ever gone.');
 bond('arjun',1);
 await complete('alone');
}});

mission('hasanmia',{name:'Hasan’s Shot',icon:'🧋',who:['hasan','mia'],
 blurb:'Hasan has looked at Mia for too long, three times today, and said “hey” in a voice. He’s buying her a bubble tea. He’s going for it.',
 parts:['After school: the food court'],tips:['After school, Fair City Mall food court.']});
hook({mis:'hasanmia',period:8,room:'foodcourt',who:'hasan',label:'Help Hasan with Mia',cond:()=>!D.dead.hasan&&!D.dead.mia,run:async()=>{
 scene('foodcourt',{hasan:[140,1,{y:150}],mia:[200,-1,{y:150}],you:[110,1,{y:156}]});
 await say('hasan','(whispering) I bought her a bubble tea. Taro. Is taro romantic? It’s purple. Purple’s romantic.','scared');
 const c=await choose(['“Just be yourself.”','“Do a bit. Make her laugh.”','“Ask her straight. No jokes.”']);
 await say('you',['Just be yourself.','Do a bit. Make her laugh.','Ask her straight. No jokes.'][c]);
 hold('hasan','mug');await walk('hasan',184,40);
 if(c===1){await say('hasan','Mia. Are you a bomb? Because you’ve— you’ve— I didn’t think about this. You’ve been defused by me? That’s not—','scared');await say('mia','(trying very hard not to laugh) That was terrible.','smirk')}
 else if(c===0){await say('hasan','Hi. I’m Hasan. My head is shaped like a gear-stick. I got you a taro. I think you’re the coolest person I’ve ever seen.','blush')}
 else{await say('hasan','Do you want to go out with me? Like, properly. Not as a bit.','blush')}
 hold('hasan',null);hold('mia','mug');
 await say('mia','You’re funny, Hasan. You are. You’re just not my type.','happy');
 await say('mia','I like people who are scared of me.','smirk');
 await say('hasan','I’m VERY scared of you.','scared');
 await say('mia','(laughing, properly) …Friends?','laugh');
 await say('hasan','Friends who share bubble tea?','happy');
 await say('mia','Friends who share bubble tea.','happy');
 await walk('mia',330,50);remove('mia');
 await walk('hasan',130,40);face('hasan',1);
 await say('hasan','…That’s the first time a girl’s said no and I didn’t feel like a joke.','sad');
 await say('hasan','Is that growth? I think I just grew. Physically. I feel taller.','happy');
 await complete('hasanmia');
}});

mission('striketwo',{name:'Strike Two',icon:'📸',who:['sean','stella'],
 blurb:'After the field, after the kiss, Sean and Stella go to the arcade. It’s their first date. It’s the first time either of them has said anything real out loud.',
 parts:['After school: the arcade'],tips:['Finish “In Person” today, then go to the Fair City Mall arcade.']});
hook({mis:'striketwo',period:8,room:'arcade',who:'sean',label:'Hang out with Sean and Stella',cond:()=>D.done.instella&&!D.dead.sean&&!D.dead.stella,run:async()=>{
 scene('arcade',{sean:[220,1,{y:150}],stella:[244,-1,{y:150}],you:[180,1,{y:156}]});
 cue('romance');
 await say('sean','We’re doing the claw machine. I’ve spent eleven pounds. I will spend my entire inheritance.','happy');
 await N('On the twelfth pound, the claw closes on the ugliest stuffed duck in Fair City. It has one eye. Sean holds it up like the World Cup.');
 hold('sean','flower');
 await say('stella','It’s horrible. I love it. I’m calling it Strike Two.','laugh');
 await say('stella','My dad left when I was nine. He took everything except that ball. I think he forgot it.','sad');
 await say('stella','So I kept it. Like, if I kept the one thing he forgot, he’d have to come back for it.','sad');
 await say('sean','…He’s an idiot. Not for leaving. For forgetting you were the best thing in the house.','sad');
 await say('stella','You can’t just SAY things like that in an arcade.','cry');
 await say('sean','I practiced it on your voicemail.','blush');
 await say('stella','You did not.','laugh');
 await say('sean','Number thirty-four.','blush');
 await walk('sean',290,40);await walk('stella',300,40);
 for(let i=0;i<4;i++){SFX.shutter();flash('#fff',.7);await wait(500)}
 await N('Four photos. In the first one they’re pulling faces. In the second, Stella is laughing. In the third, Sean is looking at her and not the camera. In the fourth, nobody’s looking at the camera at all.');
 await complete('striketwo');
}});

mission('smallhours',{name:'Small Hours',icon:'🎸',who:['corey','abby'],
 blurb:'Abby busks in the food court on Fridays. Corey has a medicine ball-shaped bruise and a tissue up each nostril. She wants him to sing.',
 parts:['After school: the food court'],tips:['Finish “Corey Gets It” with the kiss, then find Abby in the food court.']});
hook({mis:'smallhours',period:8,room:'foodcourt',who:'abby',label:'Listen to Abby play',cond:()=>D.done.corey==='kiss'&&!D.dead.corey,run:async()=>{
 scene('foodcourt',{abby:[196,-1,{y:138,pose:'sit',hold:'guitar'}],corey:[170,1,{y:150,hurt:2}],you:[146,1,{y:156}]});
 cue('romance');
 await N('Abby sits on the edge of the fountain with a guitar case open in front of her. Somebody has put in a bus ticket and a single Skittle.');
 await say('abby','This one’s called “Small Hours”. It’s about being awake when nobody else is.','happy');
 for(let i=0;i<6;i++){SFX.blip(330+i*40,'triangle');await wait(220)}
 await say('abby','Your turn. Second verse. You said you knew it.','smirk');
 await say('corey','(through two tissues) I said I’d HEARD it.','scared');
 const c=await choose(['“Sing, Corey.”','“He can’t sing. Trust me.”']);
 if(c===0){await say('corey','(singing, terribly, like a fox being moved house) “…and the small hours… are the only ones… that are mine…”','closed');SFX.cheer();await N('Half the food court claps. The other half claps louder. Big Glen wipes his eye.')}
 else{await say('abby','Shut up. Let him try.','angry');await say('corey','(singing, so quietly only she can hear it)','closed')}
 await say('corey','I’m bad at this. I hate it. I want to keep being bad at it. With you.','blush');
 await say('abby','That’s the first thing you’ve said all day that wasn’t trying to be cool.','love');
 await say('abby','It was cooler than all the other stuff.','love');
 hold('abby',null);A.abby.pose=null;await tw(A.abby,{y:150},250);pose('abby','kiss');pose('corey','kiss');await tw(A.abby,{x:180},300);SFX.kiss();prop({t:'heart',x:176,y:120});
 await complete('smallhours');
}});

mission('omermum',{name:'Omer’s Mom',icon:'🛍️',who:['omer'],
 blurb:'Omer’s mom is buying him clothes in the mall. She picks them. Everyone knows. Nobody’s ever met her. Today you do.',
 parts:['After school: the food court'],tips:['After school, Fair City Mall food court.']});
hook({mis:'omermum',period:8,room:'foodcourt',who:'omermum',label:'Say hi to Omer’s mom',cond:()=>!D.dead.omer,run:async()=>{
 scene('foodcourt',{omer:[60,1,{y:150}],omermum:[86,-1,{y:150,hold:'paper'}],you:[110,-1,{y:156}]});
 await say('omermum','Oh! A FRIEND! Omer never brings friends! Omer, you said you had friends but I thought you meant online!','happy');
 await say('omer','Mom. MOM.','blush');
 await say('omermum','I’m buying him shorts. He only wears shorts. Since he was four. He says it’s “for speed”.','happy');
 await say('omer','It IS for speed.','angry');
 if(D.mp.bully>=3||D.f.aidanDead){
  await say('omermum','(taking his hand) What happened to your knuckles, love?','shock');
  await say('omer','…Nothing. Fell over.','sad');
  if(D.f.aidanDead){
   await N('Omer looks at you. You both know what happened at the lockers.');
   await say('omer','Mom… I did something really bad today.','cry');
   await N('She doesn’t ask what. She just puts her arms round him in the middle of the food court, shopping bags and all, and holds on.');
   await say('omermum','Then tomorrow you do something really good. That’s how it works. That’s the only way it works.','sad');
  }else{
   await say('omermum','You fought someone. Over me. Again.','sad');
   await say('omer','He said you pick my clothes.','angry');
   await say('omermum','I DO pick your clothes. You look very handsome. Next time, let them talk, eh?','happy');
  }
 }else{
  await say('omermum','Is he nice at school? Tell me the truth. He’s nice at home. He vacuums.','happy');
  const c=await choose(['“He’s the best one of us.”','“He hits people, Mrs. Omer’s Mom.”']);
  if(c===0)await say('omermum','(eyes filling up) I KNEW it.','cry');
  else await say('omermum','Only people who deserve it, I hope.','smirk');
 }
 await say('omer','(quietly, as she goes to pay) Don’t tell anyone she’s nice. It ruins my whole thing.','blush');
 await complete('omermum');
}});

mission('jacobken',{name:'Pushed Around',icon:'🏀',who:['jacob','kenneth'],
 blurb:'Arcade hoops. Jacob and Kenneth. One of them is going to say something real, and it isn’t Kenneth.',
 parts:['After school: the arcade'],tips:['After school, Fair City Mall arcade.']});
hook({mis:'jacobken',period:8,room:'arcade',who:'jacob',label:'Shoot hoops with Jacob',cond:()=>!D.dead.jacob&&!D.dead.kenneth,run:async()=>{
 scene('arcade',{jacob:[270,1,{y:150}],kenneth:[290,-1,{y:154,pose:'dribble'}],you:[244,1,{y:156}]});
 await say('kenneth','High score. Jacob. Eighty-one. I’ve never got over sixty. I hate him. I love him.','smirk');
 await say('jacob','(throwing a ball very hard) Everyone pushes me. You know why? Because I’m big. Big means you’re fine. Big means you can take it.','angry');
 await say('jacob','I CAN take it. I just don’t want to.','sad');
 await say('kenneth','…You know why nobody ever laughs at you?','sad');
 await say('jacob','Because I’d kill them.','angry');
 await say('kenneth','No. Because you’re the only one of us who’s actually a good person. It’s terrifying. Nobody knows what to do with it.','sad');
 await N('Jacob doesn’t say anything for a while. Then he throws the next ball so gently it barely touches the rim, and it goes in.');
 await say('jacob','…Eighty-two.','happy');
 await complete('jacobken');
}});

/* ---------- more collectibles & deaths ---------- */
coll('loyalty',{room:'foodcourt',period:8,x:300,y:160,name:'A Fair City Mall loyalty card',desc:'Stamped four hundred times. Every stamp is from a Friday. Free coffee on the next one. There isn’t a next one.',hint:'After school, the food court.'});
coll('goldticket',{room:'arcade',period:8,x:20,y:158,name:'A golden arcade ticket',desc:'Worth 10,000 points. The prize desk says it’s “not valid on Fridays”.',hint:'After school, the arcade.'});
coll('ring',{room:'carpark',period:8,x:300,y:158,name:'Mr. Adam’s wedding ring',desc:'Somebody threw it off the roof of the parking lot. Inside it says “Forever. — J.”',hint:'After school, rooftop parking.'});
coll('wire',{room:'library',period:4,x:290,y:150,name:'A store receipt',desc:'Forty meters of wire, a kitchen timer, one Twirl. Points earned: 312. Customer: ADAM.',hint:'Library, at lunch.'});
Object.assign(DEATHS,{
 oven:{name:'Star Baker',desc:'Gas mark nine. Lovely crackling.',hint:'Bake the worst sponge in Food Tech.'},
 method:{name:'Method',desc:'Mr. Pratt finally got a death scene he believed.',hint:'Refuse to play Macbeth properly.'},
 boom:{name:'Monday Cancelled',desc:'Mr. Adam’s arrangements went off. The 43 will never be on time again.',hint:'Cut the wrong wire. Or run.'},
 taser:{name:'Barred',desc:'Big Glen has never once been told when to stop.',hint:'Get caught by Big Glen.'}
});

/* ---------- Tez’s weapons change how other things go ---------- */
ON_PERIOD.push(async i=>{if(i===8&&!D.f.mallSeen){D.f.mallSeen=1;toast('Fair City Mall. Everyone ends up here after school.')}});
