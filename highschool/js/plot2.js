'use strict';
/* =====================================================================
   HIGHSCHOOL — THE CREW, more of it.
   Tyler's Locker · After Dark · On the Record
   ===================================================================== */
K.tylermom={n:'Tyler’s Mom',col:'#7a8a6a',skin:'#e8c4a0',hair:'#8a5a2a',hs:'bob',top:'#6a7a5a',pants:'#3a3a48',adult:1,girl:1,seed:83,v:330};K.tylermom.id='tylermom';
Object.assign(DEATHS,{afterdark:{name:'After Dark',desc:'Coach does night patrol. Nobody told you. Coach doesn’t tell anyone anything.',hint:'After Dark. When the javelin comes, run.'}});
const mainOpen=(d,beat)=>!(D&&D.weekend)&&!crew().finale&&!!crew()['beat'+(beat||d)];   /* only once the crew has talked about it */

/* the crew points you at them */
{const b2=BEATS[2];BEATS[2]=async()=>{await b2();await say('david','Oh, and Tyler’s mom is coming in to clear out his locker. Locker 214, Main Corridor. Somebody should be there. To help. And to look.','sad')}}
{const b4=BEATS[4];BEATS[4]=async()=>{await b4();await say('kenneth','The cameras. The school has cameras in every corridor and nobody has ever looked at what they record at night. After school. Meet Nivaan at the mall food court. Wear black.','smirk')}}
{const b8=BEATS[8];BEATS[8]=async()=>{await b8();await say('stella','Mr. Adam knows more than he’s saying. He nearly cried at the bus loop this morning. If we get him on the record, that’s worth more than a fridge full of jars.','smirk')}}

/* ---------------- TYLER’S LOCKER ---------------- */
mission('crew_locker',{name:'Tyler’s Locker',icon:'🔒',who:['tylermom','hasan','sherman'],
 blurb:'Tyler’s mom has come in before school to clear out his locker. She doesn’t know anything. Tyler might have known a lot.',
 parts:['Before school: locker 214'],tips:['Before school, break or lunch: Main Corridor, locker 214.'],variants:{kept:'Kept the notebook',gave:'Gave it back to her'}});
spot({room:'corridor',period:[0,2,4],x:96,y:150,label:'Help the woman at locker 214',short:'LOCKER',cond:()=>mainOpen(3,2)&&!crew().ev.notebook&&!D.dead.sherman,run:async()=>{
 const cast={tylermom:[92,1,{y:146,pose:'reach'}],you:[124,-1,{y:154}]};if(!D.dead.hasan)cast.hasan=[150,-1,{y:150}];
 scene('corridor',cast,true);cue('sad');
 await N('A woman in a green coat is taking things out of locker 214 one at a time and putting them in a supermarket bag. A gym shirt. A calculator. A photo of a dog.');
 await say('tylermom','(not looking round) The school says he ran away. Tyler won’t even sleep over at his cousin’s. He doesn’t run anywhere. He has asthma.','sad');
 if(A.hasan)await say('hasan','(quietly) Do you want help, Mrs. M? We know him. From the bus.','sad');
 await say('tylermom','He said he sat next to a nice boy in Math. Was that you? He said the nice boy shared his eraser.','cry');
 pose('tylermom',null);hold('tylermom','book');
 await N('At the bottom of the locker there’s a notebook. Math, on the cover. Inside, after the equations, the writing changes. Smaller. Pressed hard into the paper.');
 await N('“She keeps me after the bell. She says I’m her favorite. She says if I tell anyone I get a seat in her drawer.”');
 SFX.door();put('sherman',334,-1,{y:146});await walk('sherman',190,60);
 await say('sherman','Mrs. M! You should have come to the office. Come and have a cup of tea. I’ll take all of Tyler’s things. We’ll keep them safe.','happy');
 await say('sherman','(holding out her hand for the notebook) All of them.','evil');
 const c=await choose(['Slip the notebook into your hoodie before she sees it.','Give it to Tyler’s mom. Tell her to read the last page. Tonight.']);
 if(c===0){
  hold('tylermom',null);pose('you','reach');SFX.pick();await wait(300);pose('you',null);
  await N('You take it out of the bag while Ms. Sherman is still smiling at his mom. It’s warm from the locker. It weighs nothing. It weighs everything.');
  evidence('notebook','Tyler’s notebook');await complete('crew_locker','kept');
 }else{
  await say('you','(quietly, to Tyler’s mom) Read the last page. Tonight. Not here.');
  await N('She looks at you a long time. Then the notebook goes inside her coat. “No thank you,” she tells Ms. Sherman, and walks out without the tea.');
  crew().momKnows=1;evidence('notebook','Tyler’s mom has the notebook');await complete('crew_locker','gave');
 }
 await walk('sherman',334,60);remove('sherman');
 if(A.tylermom&&!A.tylermom.dead){await walk('tylermom',-16,50);remove('tylermom')}
 return 'stay';
}});

/* ---------------- AFTER DARK ---------------- */
mission('crew_dark',{name:'After Dark',icon:'🌙',who:['nivaan','kenneth','omer','coach'],
 blurb:'Every corridor has a camera. Nobody has ever checked what they record at night. The crew is going back in after dark to find out.',
 parts:['After school: back into the building'],tips:['From Thursday of week 1, after school, Food Court. Nivaan is waiting in a black hoodie.'],variants:{footage:'Got the footage'}});
hook({mis:'crew_dark',period:8,room:'foodcourt',who:'nivaan',label:'Ask Nivaan why he’s wearing all black',look:{ex:'smirk'},cond:()=>mainOpen(4,4)&&!crew().ev.footage&&!D.f.darkTried,run:async()=>{
 D.f.darkTried=1;
 await say('nivaan','(whispering, very loudly) Black hoodie. Black jeans. Black… I don’t have black shoes so I wore my mom’s. Let’s GO.','smirk');
 const cast={you:[40,1,{y:156}],nivaan:[64,1,{y:150}]};for(const [n,x] of[['kenneth',88],['omer',20]])if(!D.dead[n])cast[n]=[x,1,{y:148}];
 scene('corridor',cast,true);fxState.dark=.62;cue('evil');
 await N('9:40 p.m. Highgate High, through a window Paul left unlatched. The corridor lights are off. The fire exit signs make everything green.');
 await N('The classroom doors all have little windows in them. You don’t want to look. You look.');
 await N('In English, Ms. Balduf is sitting at her desk in the dark. Not marking. Not moving. Her eyes are open. Her red pen is tapping, once a second, on nothing.');
 if(A.kenneth)await say('kenneth','(barely breathing) They don’t go home. They don’t GO home.','scared');
 await N('In Math, Ms. Sherman is sitting in a student’s chair, Tyler’s chair, facing the wall. Smiling at it.');
 if(A.omer)await say('omer','(whispering) I want to go home. I’m not scared. I want to go home in a brave way.','scared');
 scene('office',{you:[120,1,{y:156}],kenneth:[150,1,{y:150,pose:'type'}]},true);fxState.dark=.5;
 if(!A.kenneth)put('nivaan',150,1,{y:150,pose:'type'});
 const tech=A.kenneth?'kenneth':'nivaan';
 await N('The security office. One monitor. A recorder the size of a microwave. '+K[tech].n+' plugs in a USB stick and starts copying.');
 await say(tech,'Last two weeks. Every camera. Every night. It’s going to take four minutes. Four very long minutes.','scared');
 await N('The nights flicker past while it copies. 3:12 a.m.: Mr. Voss wheels a dripping laundry cart into Chem. 4:40 a.m.: Coach, on the field, with a shovel.');
 await N('Every night, all night, every teacher in the building sits in their room in the dark, not moving. Like someone switched them off.');
 SFX.thud();await say(tech,'…Done. GO. Go go go.','yell');
 scene('corridor',{you:[60,1,{y:156}],coach:[300,-1,{y:146,hold:'javelin'}]},true);fxState.dark=.6;cue('fight');
 await say('coach','(from the far end, flashlight in your eyes) NIGHT PATROL. NOBODY IS IN THIS BUILDING. SO WHO AM I LOOKING AT?','yell');
 pose('coach','throw');
 const ok=await mash('RUN for the window',{need:20,time:4,info:'He’s already throwing. MASH!'});
 if(!ok){SFX.whoosh();SFX.squelch();blood(A.you.x,A.you.y-24,50,1,100,A.you.y+2);await N('The javelin catches you between the shoulders. Coach jogs over, pulls it out, and checks his stopwatch.');await die('afterdark');return}
 SFX.whoosh();await N('The javelin goes past your ear into a trophy cabinet. You go out the window, the USB stick in your fist the whole way to the bus stop.');
 fxState.dark=0;evidence('footage','The night footage');await complete('crew_dark','footage');
 await boardBus(true);return 'ended';
}});

/* ---------------- ON THE RECORD ---------------- */
mission('crew_record',{name:'On the Record',icon:'🎙️',who:['adam'],
 blurb:'Mr. Adam has been coming apart for two weeks. He knows something about 1987 that nobody else alive will say. The crew needs it on the record.',
 parts:['Lunch: Mr. Adam’s office'],tips:['Week 2, lunch, Main Corridor. Knock on Mr. Adam’s door. Record it.'],variants:{named:'He gave his name',anon:'Anonymous'}});
spot({room:'corridor',period:[0,1,2,3,4,5,6],x:206,y:150,label:'Knock on Mr. Adam’s office door',short:'ADAM',cond:()=>mainOpen(8,8)&&!crew().ev.confession&&!D.dead.adam,run:async()=>{
 scene('office',{adam:[158,1,{y:140,pose:'sit'}],you:[120,1,{y:156}]},true);cue('sad');
 await N('Mr. Adam’s office is full of things he hasn’t thrown away. A cold coffee for every day of the last two weeks. Fourteen mugs, in a line.');
 await say('adam','Come in. Shut the door. Is your phone recording? Good. Put it where I can see it.','sad');
 pose('you','phone');
 await say('adam','March 13th, 1987. I was twelve. I was in seventh grade. I had detention that Friday, with Ollie Finch and three other kids.','sad');
 await say('adam','I skipped it. I went to the arcade instead. Ollie went. He always did what he was told. He brought his library book so he’d have something to read.','cry');
 await say('adam','At 3:15 the boiler went. Ms. Sherman was getting a coffee. She was twenty-three. She came back and the door was too hot to open. She never said a word to anybody about it. Neither did I.','cry');
 await say('adam','(very quietly) Have you looked at her? Really looked? She was twenty-three that day. She’s still twenty-three. Thirty-nine years and not one gray hair. The building keeps her too.','scared');
 await say('adam','I came back to teach here because I thought if I stayed close I could… I don’t know. Then I got old here. Then they all got like they are. And I keep writing letters home that say “ran away.”','cry');
 await say('adam','(wiping his face) Do you want my name on it?','sad');
 const c=await choose(['“Yes. Your name. You have to stand behind it.”','“No. We’ll keep you anonymous.”']);
 if(c===0){await say('adam','…Yes. Yes. Thirty-nine years. Use my name. Mr. Adam. Principal of Highgate High. Write it down.','sad');crew().adamNamed=1;intel('adamKey')}
 else await say('adam','Thank you. I’m a coward. I know I’m a coward. Thank you.','sad');
 pose('you',null);
 SFX.door();await N('Ms. Sherman is right outside the door with a cup of tea. She smiles. You don’t know how long she’s been there. She doesn’t say a word.');
 evidence('confession','Mr. Adam’s confession');await complete('crew_record',c===0?'named':'anon');
 D.room='corridor';buildRoom('corridor');return 'stay';
}});
