'use strict';
/* =====================================================================
   HIGHSCHOOL — MICKTHER. Arjun and Hasan's word.
   ===================================================================== */
mission('flimbus',{name:'Mickther',icon:'🤬',who:['arjun','hasan','shermian','adam'],
 blurb:'In sixth grade, Arjun and Hasan made up a word. It doesn’t mean anything. They say it like it’s the worst thing a person can say. Today a teacher hears it.',
 parts:['Break: the word','Lunch: what does it MEAN','Home time: the announcement'],
 tips:['Break, Main Corridor. Arjun wants to teach you something.','Lunch, Cafeteria. Arjun and Hasan have been summoned. Ms. Sherman is “concerned”.','Home time, the bus loop. Mr. Adam is about to make an announcement.'],
 variants:{legend:'Became legends',detention:'Five hundred lines'}});

hook({mis:'flimbus',period:2,room:'corridor',who:'arjun',label:'Ask Arjun why he’s grinning like that',look:{ex:'smirk',pose:'cross'},cond:()=>!D.f.flim1&&!D.dead.arjun,run:async()=>{
 const cast={arjun:[110,1,{y:146}],you:[86,1,{y:152}]};if(!D.dead.shermian)cast.shermian=[270,-1,{y:150,pose:'hips'}];
 scene('corridor',cast);
 await say('arjun','(very quietly, like it’s a state secret) Okay. I’m going to teach you a word. Me and Hasan made it up in sixth grade. Only eleven people know it. You’ll be twelve.','smirk');
 await say('arjun','…Mickther.','smirk');
 await say('you','What does it mean?');
 await say('arjun','It doesn’t MEAN anything. That’s what makes it so bad. You can’t look it up. You can’t defend yourself. Somebody calls you a mickther, it’s over. Your family is ashamed.','angry');
 if(!D.dead.hasan){put('hasan',-14,1,{y:150});await walk('hasan',64,90);
  await say('hasan','(arriving, out of breath) Did you teach them mickther? Without me? That’s OUR word.','shock');
  await say('arjun','Hasan, you’re late. Where were you?','angry');
  await say('hasan','I was in the bathroom. I dropped my phone in the sink. The sink was running.','sad');
  await say('arjun','(at full volume, right as the whole corridor goes quiet) YOU STUPID MICKTHER.','yell');
  await say('hasan','(gasping, hand on his chest) You can’t just CALL me that. In PUBLIC. My grandma could be here.','shock');
  await say('arjun','Then say it back. Properly. Like we did in sixth grade.','smirk');
  pose('arjun','point');pose('hasan','point');
  await say('arjun','(at full volume, both of them, at each other) YOU STUPID MIIIIIIICKTHER.','yell');
  await say('hasan','(at full volume) NO, YOU’RE THE STUPID MICKTHEEEEEEER.','yell');pose('arjun',null);pose('hasan',null)}
 if(A.shermian){
  await N('Every head in the corridor turns. At the far end, Ms. Sherman stops. She turns, very slowly, like a sprinkler.');
  await walk('shermian',150,60);
  await say('shermian','What did you just say, sweeties?','evil');
  await say('arjun','Nothing, Miss. A pasta. It’s a pasta.','scared');
  if(A.hasan)await say('hasan','It’s Italian. It’s a— it’s like a long one. With a hole in it. Mickther.','scared');
  const c=await choose(['“It’s a pasta, Miss. My nonna makes it.”','Say nothing. Look at the floor.','“Miss, they called YOU a mickther.”']);
  if(c===0){await say('you','It’s a pasta, Miss. My nonna makes it. Mickther alla vodka.');await say('shermian','(writing in a tiny notebook) Your nonna is going on a list too.','evil')}
  else if(c===2){D.f.flimSnitch=1;await say('arjun','(in pure betrayal) WHAT?','shock');await say('shermian','(smiling with ALL of her teeth) Did they. Did they, now.','evil')}
  else await N('You look at the floor. The floor is the only thing in this corridor that has never been called a mickther.');
  await say('shermian','Miss is going to find out what that word means. And when Miss finds out, somebody is going to have a very long lunch.','evil');
  await walk('shermian',334,60);remove('shermian');
 }
 await say('arjun','(the second she’s gone) She’s never going to find out. It doesn’t mean anything. That’s the beauty of it.','smirk');
 if(!D.dead.aidan&&!D.f.aidanDead){
  put('aidan',334,-1,{y:146});await walk('aidan',150,60);face('arjun',1);
  await N('Aidan walks down the middle of the corridor, slowly, and stops right next to Arjun for no reason. He just stands there. Breathing through his mouth.');
  await say('arjun','Move, Aidan. MOVE. You stupid mickther.','angry');
  await say('aidan','(very calmly) Mickther.','smirk');
  await say('aidan','I’ve been called a lot of things. Nobody’s ever called me that. I’m going to write it down.','smirk');
  pose('aidan','write');await wait(500);pose('aidan',null);
  if(A.hasan)await say('hasan','(whispering) Why is he writing it down. Why is he WRITING it DOWN.','scared');
  await say('aidan','(walking away) See you later, mickthers.','happy');
  await walk('aidan',-16,60);remove('aidan');
  await say('arjun','…He used it right. How did he use it right? He used it better than me.','shock');
 }
 D.f.flim1=1;part('flimbus',1);return 'stay';
}});

hook({mis:'flimbus',period:4,room:'canteen',who:'arjun',label:'Ask Arjun why Mr. Adam is walking towards him',look:{ex:'scared'},cond:()=>D.f.flim1&&!D.f.flim2&&!D.dead.arjun,run:async()=>{
 const cast={arjun:[204,-1,{y:146}],you:[228,-1,{y:152}]};if(!D.dead.hasan)cast.hasan=[176,1,{y:146}];if(!D.dead.pat)cast.pat=[90,1,{y:140}];if(!D.dead.shermian)cast.shermian=[140,1,{y:140,pose:'cross'}];
 scene('canteen',cast);
 put('adam',-14,1,{y:146,hold:'paper'});await walk('adam',150,80);
 await say('adam','Arjun. Hasan. Ms. Sherman has reported a WORD.','angry');
 if(A.shermian)await say('shermian','(reading from her tiny notebook) “You stupid mickther.” “No, YOU’RE the stupid mickther.” At ten twenty-two. In MY corridor.','evil');
 await say('adam','I looked it up. I looked it up on Urban Dictionary. Do you know what it says?','shock');
 await say('arjun','(very quietly, to Hasan) It shouldn’t say anything. Nobody’s ever written it down. Has anyone written it down?','scared');
 if(!D.dead.nivaan){put('nivaan',334,-1,{y:150,pose:'phone'});await walk('nivaan',280,60);await say('nivaan','(from the next table, not looking up) I wrote it down. Last night. Forty-one upvotes.','smirk')}
 await say('adam','(reading from the printout, in a shaking voice) “Mickther. Noun. A person so disgusting that even their own mom calls them by their last name.”','shock');
 SFX.cheer();await N('The whole cafeteria makes a noise like a stadium.');
 await say('adam','I am going to ask you ONE time. What. Does. Mickther. MEAN.','yell');
 const c=await choose(['“Sir, a mickther is when you sneeze and it goes back in.”','“Sir, it’s a type of pasta. Long. With a hole in it.”','“Sir, you can only understand it when you’re dead.”']);
 if(c===0){await say('arjun','(nodding, way too fast) Yes. That. When you sneeze and it goes back in. That’s a mickther. It’s medical.','scared');await say('adam','(after a long pause) …That HAS happened to me.','shock')}
 else if(c===1){await say('hasan','IT’S A PASTA. We told Ms. Sherman. It’s a pasta. My dad makes it. With a hole in it.','scared');await say('pat','(from behind the counter) We had mickther on the menu in 1998. Kids loved it.','happy')}
 else{await say('arjun','(dead serious) Sir. You can only understand mickther when you’re dead. That’s why we can’t tell you.','closed');if(A.shermian)await say('shermian','(very sweetly) Miss can arrange that, sweetie.','evil')}
 await N('Somewhere at the back of the cafeteria, a small boy whispers it. Then a table says it. Then the table next to that table.');
 for(let i=0;i<3;i++){SFX.cheer();shake(.3);await wait(260)}
 await N('In ten seconds, the whole cafeteria is banging on the tables and chanting it. MICK. THER. MICK. THER. MICK. THER. Pat is chanting it. Pat is banging a ladle.');
 await say('adam','(over the chanting, purple) THIS WORD. IS. BANNED.','yell');
 if(A.hasan)await say('hasan','(crying with laughter, face down on the table) We made it in SIXTH GRADE. We made it in a GROUP PROJECT.','laugh');
 D.f.flim2=1;part('flimbus',2);return 'stay';
}});

hook({mis:'flimbus',period:7,room:'bus',who:'arjun',label:'Ask Arjun why he’s staring at the speaker',look:{ex:'smirk'},cond:()=>D.f.flim2&&!D.done.flimbus&&!D.dead.arjun,run:async()=>{
 const cast={arjun:[110,1,{y:146}],you:[86,1,{y:152}]};if(!D.dead.hasan)cast.hasan=[134,-1,{y:146}];
 scene('bus',cast);
 await say('arjun','(eyes on the PA speaker on the wall) He’s going to make an announcement. About the word. I need to hear him try.','smirk');
 SFX.static();
 await say('adam','(on the PA) Highgate. A word has been going around today. A word I will not be saying. It begins with M, and ends with… I, C, K…','angry');
 await say('adam','(on the PA) No. It ends with T, H, E, R. The word is M-I-C-K— the word is MICK—','angry');
 await N('There is a very long pause on the PA. You can hear him breathing.');
 await say('adam','(on the PA, with his whole chest, by accident) MICKTHER IS BANNED.','yell');
 SFX.cheer();shake(.8);
 await N('The bus loop goes off like a football match. Kids are hugging. A seventh grader is crying. The bus driver honks the horn three times, then says it out of his window.');
 if(A.hasan){pose('arjun','hug');pose('hasan','hug');await say('hasan','(holding onto Arjun, sobbing) We did it. Sixth grade us would be SO proud.','cry')}
 const c=D.f.flimSnitch?1:0;
 if(c===1&&!D.dead.sherman){
  put('sherman',334,-1,{y:146,hold:'paper'});await walk('sherman',170,60);
  await say('sherman','Arjun. Hasan. Five hundred lines. “I will not say that word.” On my desk. Monday.','evil');
  await N('On Monday, Ms. Sherman receives five hundred lines. Every single one of them says “mickther”. In different fonts.');
  pose('arjun',null);pose('hasan',null);
  await complete('flimbus','detention');return 'stay';
 }
 await say('arjun','(wiping his eyes) We’re legends. We’re actual legends. They’re going to write about us on the bathroom walls.','happy');
 if(!D.dead.aidan&&!D.f.aidanDead){put('aidan',-14,1,{y:146});await walk('aidan',60,60);await say('aidan','(from right behind Arjun, very close) Bye, mickther.','smirk');await say('arjun','(jumping a foot in the air) AIDAN. YOU DON’T GET TO SAY IT. YOU STUPID MICKTHER.','yell');await walk('aidan',-16,60);remove('aidan')}
 pose('arjun',null);pose('hasan',null);
 bond('arjun',1);bond('hasan',1);
 await complete('flimbus','legend');return 'stay';
}});
