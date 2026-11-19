'use strict';
/* =====================================================================
   HIGHSCHOOL — THE QUIET PARTS
   Longer, realer chapters for the romances and the people in the smaller
   quests. Nobody gets saved by one conversation. Things take a few goes.
     Mended — Corey fixes Abby’s dad’s guitar.
     The First Fight — Sean and Stella, after the honeymoon.
     Hasan’s Mom — the laminated list goes through the wash.
     Ohio — Toby and the friend who stopped answering.
     Voicemail — Arjun and his grandad.
     Something She Picked — Omer buys his mom something.
     Giant — Jacob and his little sister.
     Quiet at Home — Nivaan, when the stream is off.
   ===================================================================== */
K.hasanmom={n:'Hasan’s Mom',col:'#7a4a6a',skin:'#c99a6a',hair:'#1a1210',hs:'bun',top:'#7a4a6a',pants:'#2a2a33',skirt:1,adult:1,girl:1,seed:191,v:400};K.hasanmom.id='hasanmom';
K.nivdad={n:'Nivaan’s Dad',col:'#4a5a6a',skin:'#a87050',hair:'#1a1410',hs:'short',top:'#4a5a6a',pants:'#2a2a33',adult:1,tache:1,tacheC:'#1a1410',seed:193,v:200};K.nivdad.id='nivdad';
Object.assign(ITEMS,{shoebox:'Abby’s shoebox (the pieces of her dad’s guitar)',lassi:'A mango lassi',scarf:'A scarf (Omer picked it)'});
const notCut=id=>!(window.EDITION_CUT||[]).includes(id);
function tipsFrom(m,fn){MIS[m].tipNow=fn}

/* =====================================================================
   MENDED — Corey & Abby
   ===================================================================== */
mission('mended',{name:'Mended',icon:'🎸',who:['corey','abby','oakes'],goal:'Help Corey fix Abby’s dad’s guitar.',
 blurb:'Brett smashed the guitar Abby’s dad left her. She kept every piece in a shoebox. Corey has never fixed anything in his life.',
 parts:['The shoebox','Woodwork','Strings','Play it'],tips:['Break or lunch, the Cafeteria. Ask Abby about the shoebox.']});
hooks({mis:'mended',label:'Ask Abby what’s in the shoebox',look:{hold:'paper',ex:'sad'},cond:()=>D.f.il2&&!D.f.md1&&!D.dead.abby&&!D.dead.corey,run:async()=>{
 scene('canteen',{abby:[180,-1,{y:150,pose:'sit'}],corey:[214,-1,{y:150,pose:'sit'}],you:[150,1,{y:154}]},true);
 const bx=pprop({t:'shoebox',x:196,y:136,s:'DAD',layer:2});
 await N('Abby has a shoebox on the table in front of her. DAD, on the lid, in her handwriting. She keeps one hand on it the whole time, like it might leave.');
 await say('abby','It’s the guitar. The pieces. I swept them up. I couldn’t put them in the trash. It’s the last thing that had his hands on it.','sad');
 await say('abby','He used to tune it with his teeth. Like, hold the peg in his teeth. My mom hated it. I loved it.','sad');
 await say('corey','(quietly) Can I— could I try? To fix it?','scared');
 await say('abby','(a little laugh) Corey. You can’t fix your own curls without an emergency kit.','sad');
 await say('corey','I know. I know. I’d still like to try. If you let me.','blush');
 await N('She looks at him for a long time. Then she slides the box across the table to him. Very slowly. Like she’s handing him something alive.');
 bx.hide=1;hold('corey','paper');
 await say('abby','If you lose a single piece, I’ll actually kill you.','sad');
 await say('corey','I know you will. I’ve seen you.','blush');
 D.f.md1=1;part('mended',1);give('shoebox');
}},[[2,'canteen','abby'],[4,'canteen','abby']]);
hook({mis:'mended',period:ANYP,room:'woodwork',who:'auto',cond:()=>D.f.md1&&!D.f.md2&&has('shoebox')&&!D.dead.corey&&!(TEACH[D.period]&&TEACH[D.period].woodwork),run:async()=>{
 scene('woodwork',{oakes:[220,-1,{y:146,goggles:1}],corey:[150,1,{y:150}],you:[120,1,{y:154}]},true);cue('sad');
 await N('The Woodwork room. Corey is already here, standing in the doorway with the shoebox, like he’s waiting to be told off. Mr. Oakes is planing a coffin lid. He doesn’t look up.');
 await say('oakes','(not looking up) What.','angry');
 await say('corey','Sir. It’s a guitar. It got— somebody broke it. It was her dad’s. Can you— can wood be fixed?','scared');
 take('shoebox');await N('Mr. Oakes puts the plane down. He takes the lid off the box and looks at the pieces for a long, long time.');
 await say('oakes','…Spruce top. Old. Somebody loved this.','sad');
 await say('oakes','Wood remembers where it broke, kid. You glue it, it holds, but you’ll always see the line. That’s fine. People are the same.','sad');
 await say('oakes','I built my daughter’s crib in this room. Twenty years ago. She doesn’t call. I still know exactly which joint I got wrong.','sad');
 pose('corey','kneel');pose('oakes','kneel');
 const ok=await mash('Hold the clamps while it sets',{need:18,time:6,info:'Don’t let go. Don’t let go.'});
 pose('corey',null);pose('oakes',null);
 await N(ok?'You hold the clamps. Corey holds his breath. Mr. Oakes runs a thumb along the glue line and doesn’t say anything, which from him is a speech.':'Your hand slips once. Mr. Oakes catches the clamp without looking, like he’s been catching things his whole life.');
 await say('oakes','Leave it overnight. Strings after that. Don’t tell anybody I helped. I have a reputation.','smirk');
 await say('corey','(to you, outside, shaking) He said somebody loved it. He could TELL. From the wood.','cry');
 D.f.md2=1;part('mended',2);return 'stay';
}});
spot({room:'upper',x:160,y:150,label:'Ask Mr. Fenwick for guitar strings',short:'STRINGS',mis:'mended',cond:()=>D.f.md2&&!D.f.md3,run:async()=>{
 put('fenwick',-14,1,{y:146});await walk('fenwick',170,60);
 await say('fenwick','Strings? For an acoustic? Whose?','angry');
 await say('you','Abby’s. It was her dad’s. Corey glued it back together.');
 await say('fenwick','(a long pause) …Twelve gauge. Phosphor bronze. It’ll want to be tuned twice. Old wood is stubborn about pitch. So are people.','sad');
 hold('fenwick','cd');await wait(200);hold('fenwick',null);
 await N('He gives you a packet of strings out of his cardigan pocket. He’s had them in there a while. Like he was waiting for somebody to need them.');
 await walk('fenwick',-20,60);remove('fenwick');
 D.f.md3=1;part('mended',3);return 'stay';
}});
hook({mis:'mended',period:8,room:'foodcourt',who:'abby',label:'Watch Corey give Abby the guitar',look:{ex:'sad'},cond:()=>D.f.md3&&!D.done.mended&&!D.dead.corey&&!D.dead.abby,run:async()=>{
 scene('foodcourt',{abby:[196,-1,{y:150}],corey:[150,1,{y:150,hold:'guitar'}],you:[110,1,{y:156}]},true);cue('romance');
 await N('Corey walks up to Abby by the fountain holding the guitar in both arms like a baby he’s scared he’ll drop. There’s a pale line across the top where it broke. You can see it from here.');
 await say('corey','It’s got a scar. I’m sorry. I couldn’t make it go away. Mr. Oakes says it never goes away.','scared');
 hold('corey',null);hold('abby','guitar');A.abby.pose='sit';
 await N('Abby turns it over. She runs her thumb along the line. She doesn’t say anything for a really long time.');
 await say('abby','(very quietly) He’d have liked the scar. He had one just like it. On his hand. From a bottle. He used to say it made him easier to identify.','cry');
 for(let i=0;i<5;i++){SFX.blip(262+i*33,'triangle');await wait(TEST?0:260)}
 await N('She tunes it. With her teeth. Then she plays something slow and a bit wrong, and halfway through it stops being wrong.');
 await say('abby','That was his. The only song he finished. I’ve never been able to play it without his guitar.','cry');
 const c=await choose(['Leave them alone.','Stay.']);
 if(c===0){await walk('you',40,70);await N('From across the food court you watch her play it again, slower, for Corey. He’s got his face in his hands. He’s not embarrassed about it.')}
 await say('corey','I can’t fix stuff. I glued my own finger to the bench twice. Mr. Oakes had to use a chisel.','sad');
 await say('abby','You fixed the one thing that could be fixed, Corey. That’s all anybody can do.','love');
 await complete('mended');
 return 'stay';
}});
tipsFrom('mended',()=>!D.f.md1?'Break or lunch, the Cafeteria: Abby has a shoebox.':!D.f.md2?'Upstairs, Arts Wing: walk up into the Woodwork door (when there’s no lesson in it). Corey’s there.':!D.f.md3?'Upstairs Corridor, outside the Music room: Mr. Fenwick has strings.':'After school, Fair City Mall food court. Corey has the guitar.');

/* =====================================================================
   THE FIRST FIGHT — Sean & Stella
   ===================================================================== */
mission('firstfight',{name:'The First Fight',icon:'⚾',who:['sean','stella'],goal:'Get Sean and Stella through their first real fight.',
 blurb:'Sean and Stella were perfect on the phone. In person, for the first time, they’re not talking.',
 parts:['Sean, hiding','Stella, crying','The bus loop'],tips:['Break, the Library. Sean is hiding.']});
hooks({mis:'firstfight',label:'Ask Sean why he’s hiding',look:{ex:'sad'},cond:()=>D.done.striketwo&&!D.f.ff1&&!D.dead.stella,run:async()=>{
 scene('library',{sean:[200,-1,{y:146,pose:'sit',ex:'sad'}],you:[170,1,{y:154}]},true);
 await say('sean','I’m not hiding. I’m reading. About… (looks at the book) …Abraham Lincoln.','sad');
 await say('sean','She was on FaceTime with her old friend from her old school. A guy. He made her laugh so hard she snorted. I’ve never made her snort.','sad');
 await say('sean','On the phone I was funny. I had time to think of stuff. In person I just… say hi. Loud. I’m a voice on the phone that got lucky.','cry');
 const c=await choose(['“Have you told her any of this?”','“You don’t have to be funny. You have to be there.”']);
 if(c===0)await say('sean','No. I ignored her texts. All morning. Eleven of them. Oh no. Oh no, I’m the bad guy.','scared');
 else await say('sean','(quiet) …I wasn’t there. I ignored her texts all morning. Eleven of them. I’m the bad guy, aren’t I.','scared');
 D.f.ff1=1;part('firstfight',1);
 return 'stay';
}},[[2,'library','sean'],[4,'field','sean']]);
hooks({mis:'firstfight',label:'Ask Stella if she’s okay',look:{ex:'cry'},cond:()=>D.f.ff1&&!D.f.ff2,run:async()=>{
 const r=here();scene(r,{stella:[160,-1,{y:150,pose:'sit',ex:'cry',hold:'ball'}],you:[130,1,{y:154}]},true);
 await say('stella','He’s not answering. Eleven texts. He read them all. I can SEE he read them.','cry');
 await say('stella','I knew this would happen. On the phone I was perfect. I could hang up before I said something stupid. In person he’s seen me eat. I chew so loud. My mom says I chew like a horse.','cry');
 await say('stella','He’s bored. Now I’m real he’s bored of me.','cry');
 const c=await choose(['“He thinks you’re bored of HIM.”','“He’s scared. He’s hiding in the library reading about Abraham Lincoln.”']);
 await say('stella',c===0?'(staring at you) …What? That’s so stupid. That is the stupidest— that’s exactly what I thought.':'(laughing through crying) Abraham LINCOLN? Oh my god. He’s such an idiot. He’s MY idiot.','cry');
 await say('stella','Home time. Bus loop. Tell him to be there. If he isn’t there I’m throwing this ball at his head.','angry');
 D.f.ff2=1;part('firstfight',2);
 return 'stay';
}},[[2,'library','stella'],[4,'field','stella']]);
hook({mis:'firstfight',period:7,room:'bus',who:'sean',label:'Stand with Sean while Stella walks over',look:{ex:'scared'},cond:()=>D.f.ff2&&!D.done.firstfight&&!D.dead.stella&&!D.dead.sean,run:async()=>{
 scene('bus',{sean:[150,1,{y:150,ex:'scared'}],you:[124,1,{y:154}]},true);cue('sad');
 put('stella',334,-1,{y:150,hold:'ball'});await walk('stella',178,60);
 await N('They stand there. Neither of them says anything. The 43 pulls in. Neither of them gets on.');
 const c=await choose(['Nudge Sean.','Say nothing. Let them get there.']);
 if(c===0){await say('you','(under your breath) Sean.')}
 await say('sean','I thought you were bored of me. Your friend snorted you. I mean made you snort. I can’t do that. I can only do it on the phone.','cry');
 await say('stella','I thought YOU were bored of ME. You saw me eat a burrito. Nobody survives seeing me eat a burrito.','cry');
 await say('sean','I LOVED watching you eat the burrito.','yell');
 await say('stella','(laughing, snorting, actually snorting) …oh no.','laugh');
 await say('sean','(staring) You just snorted.','shock');
 await say('stella','Don’t you DARE.','laugh');
 pose('sean','hug');pose('stella','hug');SFX.heart();fxState.romance=1;
 await N('They hold onto each other in the bus loop with the 43 honking at them. It’s not a movie hug. It’s awkward and her ball is digging into his back. Neither of them lets go.');
 await say('stella','(into his shoulder) Next time just text me back. Even if it’s just “I’m being weird”.','cry');
 await say('sean','I’m being weird.','cry');
 await say('stella','I know, babe.','love');
 fxState.romance=0;pose('sean',null);pose('stella',null);
 await complete('firstfight');
}});
tipsFrom('firstfight',()=>!D.f.ff1?'Find Sean (Library at break, Playing Field at lunch). He’s hiding from Stella.':!D.f.ff2?'Find Stella (Library at break, Playing Field at lunch).':'Home time, the bus loop. Stand with Sean.');

/* =====================================================================
   HASAN’S MOM
   ===================================================================== */
mission('tellmom',{name:'Hasan’s Mom',icon:'🧺',who:['hasan','hasanmom','pat'],goal:'Help Hasan through his mom finding out about Darren.',
 blurb:'Hasan’s mom found Darren’s laminated list in the wash. Two days ago. She hasn’t said anything. Not one word.',
 parts:['The list in the wash','Pat','Pick-up'],tips:['Break or lunch, the Cafeteria. Hasan isn’t eating.']});
hook({mis:'tellmom',period:[2,4],room:'canteen',who:'hasan',label:'Ask Hasan why he isn’t eating',look:{ex:'sad'},cond:()=>typeof darDate==='function'&&darDate()&&!D.f.tm1,run:async()=>{
 scene('canteen',{hasan:[160,1,{y:148,ex:'sad'}],you:[134,1,{y:154}]},true);
 await say('hasan','My mom found the list. Darren’s list. It went through the wash in my jeans. Laminated. It came out perfect. That’s the problem with lamination.','sad');
 await say('hasan','She put it on my bed. Folded. On my pillow. She hasn’t said anything. Two days. She made my favorite dinner both nights. She just watches me eat it.','scared');
 await say('hasan','If she yelled I’d know. The quiet’s the worst part. The quiet could be anything.','cry');
 const c=await choose(['“Do you want to tell her first? Before she says anything?”','“Maybe the dinner IS what she’s saying.”']);
 await say('hasan',c===0?'I don’t know HOW. There’s no laminated list for this. Darren would make one. I can’t ask Darren. That’s too weird.':'(very still) …I didn’t think about that. I didn’t think about that at all.','sad');
 await say('hasan','Pat knows everybody’s mom. Pat knows everything. Ask Pat. Please. I can’t ask Pat. Pat scares me.','scared');
 D.f.tm1=1;part('tellmom',1);
}});
hook({mis:'tellmom',period:[2,4],room:'canteen',who:'pat',label:'Ask Pat about Hasan’s mom',look:{ex:'smirk'},cond:()=>D.f.tm1&&!D.f.tm2,run:async()=>{
 scene('canteen',{pat:[90,1,{y:140}],you:[120,-1,{y:150}]},true);
 await say('you','Pat. Hasan’s mom found out he likes a boy. She’s not saying anything. He’s scared.');
 await say('pat','(stopping the ladle) …Mm.','sad');
 await say('pat','My boy told me at the kitchen table when he was fifteen. Spaghetti night. I said the wrong thing. For one whole day, I said the wrong thing.','sad');
 await say('pat','Then I spent twenty years saying the right thing. He’s married now. Nice fella. Does my taxes.','happy');
 await say('pat','Tell Hasan his mom gets one day. Everybody’s mom gets one day. Then watch what she does, not what she says. Moms say stupid stuff. They do the dinners.','sad');
 hold('pat','cookie');await wait(200);hold('pat',null);
 await N('She gives you two cookies wrapped in a napkin. One for Hasan. One for you. She doesn’t say which is which.');
 D.f.tm2=1;part('tellmom',2);
 return 'stay';
}});
hook({mis:'tellmom',period:7,room:'bus',who:'hasan',label:'Wait with Hasan. His mom is picking him up.',look:{ex:'scared'},cond:()=>D.f.tm2&&!D.done.tellmom&&!D.dead.hasan,run:async()=>{
 scene('bus',{hasan:[150,1,{y:150,ex:'scared'}],you:[124,1,{y:154}]},true);cue('sad');
 await say('hasan','She texted. “I’m picking you up today.” Full stop. My mom never uses full stops. She uses six emojis per word.','scared');
 const car=pprop({t:'car',x:-80,y:170,col:'#8a6a4a',driver:1,layer:40});SFX.rumble();await tw(car,{x:200},1600,'out');
 put('hasanmom',230,-1,{y:150});
 await N('A brown car pulls in. A woman gets out in a long cardigan, holding something. It’s the list. Laminated. She’s holding it with both hands.');
 await walk('hasanmom',180,40);
 await say('hasanmom','(very carefully, like she practiced it in the car) Hasan. Step eleven is blank.','sad');
 await say('hasan','…Mom—','scared');
 await say('hasanmom','Does he know he can come for dinner? He should come for dinner. Does he eat lamb? I don’t know anything about him. I want to know things about him.','cry');
 await say('hasan','(very small) You’re not mad?','cry');
 await say('hasanmom','I was quiet because I was scared I’d say it wrong. Your grandmother said it wrong to your uncle and he didn’t come home for nine years. I wasn’t going to say it wrong.','cry');
 pose('hasan','hug');pose('hasanmom','hug');SFX.heart();
 await N('She holds him in the middle of the bus loop with the laminated list still in her hand, pressed flat against his back, and she doesn’t let go even when the 43 honks.');
 await say('hasanmom','(over his shoulder, squinting at you) And you. Whoever you are. Tell the swimmer: Sunday, six o’clock, shoes off. And if he breaks my son’s heart I will find out where he swims.','smirk');
 pose('hasan',null);pose('hasanmom',null);
 await complete('tellmom');
}});
tipsFrom('tellmom',()=>!D.f.tm1?'Break or lunch, the Cafeteria. Hasan isn’t eating.':!D.f.tm2?'Break or lunch, the Cafeteria: ask Lunch Lady Pat.':'Home time, the bus loop. Hasan’s mom is picking him up.');

/* =====================================================================
   OHIO — Toby
   ===================================================================== */
mission('ohio',{name:'Ohio',icon:'📮',who:['toby'],goal:'Help Toby talk to the friend who stopped answering.',
 blurb:'Toby is never quiet. Today he is. It’s his best friend’s birthday, back in Ohio. They haven’t talked since Toby told him the truth.',
 parts:['The quiet bus','The message','The answer'],tips:['Before school, the bus loop. Toby is on his own.']});
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);if(D&&!D.weekend&&D.done&&D.done.toby&&!D.done.ohio&&!A.toby&&!D.dead.toby&&((room==='bus'&&D.period===0)||(room==='library'&&[2,4].includes(D.period)))){put('toby',room==='bus'?250:230,-1,{y:146,pose:room==='library'?'sit':null})}return r}}
hook({mis:'ohio',period:0,room:'bus',who:'toby',label:'Ask Toby why he’s so quiet',look:{ex:'sad'},cond:()=>!D.f.oh1,run:async()=>{
 scene('bus',{toby:[200,-1,{y:146,pose:'phone',ex:'sad'}],you:[170,1,{y:154}]},true);
 await say('toby','It’s Marcus’s birthday. Not our Marcus. My Marcus. Ohio Marcus. We were best friends since we were five.','sad');
 await say('toby','I told him I liked boys in eighth grade. He said “cool”. Then he stopped sitting with me. Then he stopped answering. Then we moved.','sad');
 await say('toby','I keep typing happy birthday and deleting it. I’ve deleted it like thirty times. I’m on thirty-one.','cry');
 const c=await choose(['“Send it. Just happy birthday. Nothing else.”','“You don’t owe him anything.”']);
 await say('toby',c===0?'Just happy birthday. Nothing else. Okay. Okay. Help me write it later. Library, break or lunch. I can’t do it on the bus. The bus is too loud.':'I know. I know I don’t. I still want to. Is that stupid? Help me write it later. Library. Break or lunch.','sad');
 A.toby.pose=null;D.f.oh1=1;part('ohio',1);
}});
hook({mis:'ohio',period:[2,4],room:'library',who:'toby',label:'Help Toby write the message',look:{pose:'phone'},cond:()=>D.f.oh1&&!D.f.oh2,run:async()=>{
 scene('library',{toby:[180,-1,{y:146,pose:'phone'}],you:[150,1,{y:154}]},true);
 const c=await choose(['“happy birthday man. hope ohio is good. i miss u”','“happy birthday.”','“happy birthday. i’m not mad. i was never mad.”'],'What should Toby send?');
 const msg=['happy birthday man. hope ohio is good. i miss u','happy birthday.','happy birthday. i’m not mad. i was never mad.'][c];
 await dms('Marcus (Ohio)','last seen 2 years ago',[['me',msg,'10:41']],{live:1});
 await say('toby','(putting the phone face down on the table) Sent. Okay. Sent. I’m gonna be sick. I’m not gonna look at it. I’m gonna look at it at home time. Or never.','scared');
 D.f.oh2=1;part('ohio',2);
}});
hook({mis:'ohio',period:7,room:'bus',who:'auto',cond:()=>D.f.oh2&&!D.done.ohio&&!D.dead.toby,run:async()=>{
 const cast={toby:[180,-1,{y:146,pose:'phone'}],you:[150,1,{y:154}]};if(!D.dead.sean)cast.sean=[220,-1,{y:150}];if(!D.dead.stella)cast.stella=[240,-1,{y:150}];
 scene('bus',cast,true);cue('sad');SFX.beep();
 await N('Toby’s phone buzzes in the bus loop. He looks at it. He doesn’t move.');
 await dms('Marcus (Ohio)','online',[['me','happy birthday. i’m not mad.','10:41'],['them','toby','15:12'],['them','i was a coward. i was 13 and my dad was a dick about it and i was a coward','15:12'],['them','im sorry','15:13'],['them','i miss u too','15:13']],{live:3});
 A.toby.ex='cry';
 await say('toby','(holding the phone against his chest) He said sorry. Two years. He said sorry.','cry');
 if(A.sean&&A.stella){await walk('sean',200,60);hold('sean','note');await say('sean','(holding out a friendship bracelet, a bad one, clearly his first) I made this. It’s bad. It says TOBY 10/10. One of the beads is upside down.','blush');hold('sean',null);await say('toby','(laughing, crying) It’s perfect. It’s the worst one I’ve ever seen. It’s perfect.','cry')}
 await complete('ohio');
 return 'stay';
}});
tipsFrom('ohio',()=>!D.f.oh1?'Before school, the bus loop. Toby is on his own.':!D.f.oh2?'Break or lunch, the Library. Help Toby write it.':'Home time, the bus loop. Toby’s phone.');

/* =====================================================================
   VOICEMAIL — Arjun
   ===================================================================== */
mission('grandad',{name:'Voicemail',icon:'📼',who:['arjun','hasan'],goal:'Find out why Arjun is being even worse than usual, and be there.',
 blurb:'Arjun is meaner than usual today. Meaner than anyone has ever been. Hasan says that means something. Hasan says today’s a date.',
 parts:['The worst day','The woods','Mango lassi'],tips:['Lunch, the Cafeteria. Arjun is being awful.']});
hook({mis:'grandad',period:[2,4],room:'canteen',who:'hasan',label:'Ask Hasan why Arjun is being so cruel today',look:{ex:'sad'},cond:()=>(D.done.alone||D.done.phone||cal()>=4)&&!D.f.gd1&&!D.dead.arjun,run:async()=>{
 const cast={hasan:[150,1,{y:148,ex:'sad'}],you:[124,1,{y:154}]};if(!D.dead.arjun)cast.arjun=[240,-1,{y:146,pose:'cross'}];
 scene('canteen',cast,true);
 if(A.arjun){await say('arjun','(to a seventh grader walking past) Your haircut looks like your mom did it during an earthquake. Your mom’s a— forget it. Forget it.','angry');await walk('arjun',334,90);remove('arjun')}
 await say('hasan','He’s been like that since the bus. He made Paul cry. PAUL. Paul doesn’t have the thing in his brain that cries.','sad');
 await say('hasan','It’s today. It’s the day. His grandad died a year ago today. He doesn’t know I know the date. I know the date. I was at the funeral. He didn’t talk to anyone.','sad');
 await say('hasan','He goes to the woods when it’s bad. Behind the field. He thinks nobody knows that either.','sad');
 D.f.gd1=1;part('grandad',1);
}});
hook({mis:'grandad',period:ANYP,room:'forest',who:'auto',cond:()=>D.f.gd1&&!D.f.gd2&&!D.dead.arjun,run:async()=>{
 scene('forest',{arjun:[200,-1,{y:150,pose:'sit',hold:'phone'}],you:[60,1,{y:154}]},true);cue('sad');
 await N('The woods. Arjun is sitting on a log with his phone held up to his ear. He isn’t talking. He’s just listening to something. He plays it again.');
 await walk('you',150,40);
 await say('arjun','(not looking up) What. Go away. If you tell anybody you saw me I’ll tell everybody you cried at Toy Story.','angry');
 const c=await choose(['Sit down on the log. Don’t say anything.','“Hasan told me what today is.”']);
 if(c===1)await say('arjun','(very quiet) …Hasan has a big mouth and a big head.','sad');
 pose('you','sit');
 await N('After a while, he holds the phone out to you. One voicemail. One minute and four seconds. From GRANDAD.');
 await dms('Voicemail — Grandad','1:04',[['them','Arjun beta it’s your grandad. You didn’t answer, you never answer, that’s fine. I saw you on the field today when I drove past. You were the fastest one. I just wanted to say that. You were the fastest one. Okay. Bye. Call your mother.','3 Mar']],{live:1});
 await say('arjun','He drove past the school. On purpose. To watch PE. And I didn’t pick up. I was busy. I was busy being funny at somebody.','cry');
 await say('arjun','I’m mean so nobody gets close enough to die on me. That’s it. That’s the whole thing. It’s stupid. I know it’s stupid.','cry');
 pose('you',null);
 const d=await choose(['“It’s not stupid. It’s just lonely.”','“You were the fastest one.”']);
 await say('arjun',d===0?'(wiping his face with his whole sleeve) Shut up. Shut up. …Yeah.':'(laughing and crying at the same time) …I WAS the fastest one. I still am. Nobody can catch me.','cry');
 await say('arjun','He used to get me a mango lassi from the food court every Friday. Every single one. I haven’t had one since.','sad');
 D.f.gd2=1;part('grandad',2);
 return 'stay';
}});
spot({room:'foodcourt',period:8,x:240,y:150,label:'Buy a mango lassi',short:'LASSI',mis:'grandad',cond:()=>D.f.gd2&&!has('lassi')&&!D.done.grandad,run:async()=>{
 await walk('you',236,60);pose('you','reach');D.money=Math.max(0,(D.money||0)-3);updateLoc();await wait(200);pose('you',null);give('lassi');
 await N('Three dollars. Large. With the little umbrella, because the guy at the counter says mango lassis always come with the umbrella, that’s the rule.');
 return 'stay';
}});
hook({mis:'grandad',period:8,room:'carpark',who:'arjun',label:'Give Arjun the mango lassi',look:{ex:'sad'},cond:()=>D.f.gd2&&has('lassi')&&!D.done.grandad,run:async()=>{
 const cast={arjun:[200,-1,{y:150,pose:'sit'}],you:[160,1,{y:154}]};if(!D.dead.hasan)cast.hasan=[-14,1,{y:150}];
 scene('carpark',cast,true);cue('sad');take('lassi');
 await walk('you',186,50);hold('arjun','mug');
 await N('Arjun takes the lassi. He looks at the little umbrella for a long time.');
 if(A.hasan){await walk('hasan',220,60);await say('hasan','(sitting down on his other side) I said nothing. I’m saying nothing. I’m just sitting.','sad')}
 await say('arjun','(to Hasan, not looking at him) …Your head’s fine. It’s a normal head. I only say it because it’s the first thing I see. It’s a good head.','sad');
 if(A.hasan)await say('hasan','(very quietly) …Thanks, man.','cry');
 await say('arjun','Don’t make it weird. Nobody make it weird.','cry');
 await N('The three of you sit on the wall of the rooftop parking while the sun goes down over Fair City. Arjun drinks the whole lassi. He keeps the umbrella.');
 await say('arjun','Okay. That’s all the feelings I’m doing this year. Hasan, your head still looks like a thumb. A good thumb. Shut up.','smirk');
 hold('arjun',null);await complete('grandad');
 return 'stay';
}});
tipsFrom('grandad',()=>!D.f.gd1?'Break or lunch, the Cafeteria. Ask Hasan about Arjun.':!D.f.gd2?'The Woods (right from the bus loop, or right from the Walkway). Any time.':!has('lassi')?'After school, the Food Court: buy a mango lassi.':'After school, rooftop parking. Arjun.');

/* =====================================================================
   SOMETHING SHE PICKED — Omer
   ===================================================================== */
mission('omerscarf',{name:'Something She Picked',icon:'🧣',who:['omer','omermum','angelo'],goal:'Help Omer buy his mom a present with his own money.',
 blurb:'Omer’s mom picks all his clothes. She’s been working doubles since his dad left. Omer has never bought her anything. He has three dollars.',
 parts:['Three dollars','A job from Angelo','The scarf'],tips:['Break or lunch, the Playing Field. Omer is counting coins.']});
hooks({mis:'omerscarf',label:'Ask Omer what he’s counting',look:{ex:'sad'},cond:()=>D.done.omermum&&!D.f.os1,run:async()=>{
 scene('field',{omer:[160,-1,{y:150,ex:'sad'}],you:[130,1,{y:154}]},true);
 await say('omer','Three dollars and forty cents. That’s it. That’s all I got.','sad');
 await say('omer','My mom’s birthday is Sunday. She’s been doing doubles since my dad left. She falls asleep in her work shoes. I take them off her and she doesn’t even wake up.','sad');
 await say('omer','She buys everything I wear. Every single thing. I wanna buy her ONE thing. One. Something I picked. For once.','cry');
 await say('omer','Angelo’s hiring. I’d ask him myself but I punched his cousin. Long story. Not a long story. I punched his cousin.','angry');
 D.f.os1=1;part('omerscarf',1);
 return 'stay';
}},[[2,'field','omer'],[4,'field','omer']]);
hook({mis:'omerscarf',period:[0,2,4],room:'corridor',who:'angelo',label:'Ask Angelo for a job (for Omer)',look:{ex:'smirk'},cond:()=>D.f.os1&&!D.f.os2,run:async()=>{
 scene('corridor',{angelo:[150,-1,{y:146}],you:[120,1,{y:154}]},true);
 await say('angelo','A job? For Omer? He punched my cousin.','angry');
 await say('you','It’s for his mom’s birthday.');
 await say('angelo','(a long pause) …My mom works two jobs. I know about doubles.','sad');
 await say('angelo','One delivery. This bag goes to Tez in the end stall of the Boys’ Bathroom. Don’t open it. Don’t shake it. Don’t let Coach see it. Ten bucks.','smirk');
 hold('you','tape');
 const ok=await mash('Get it past Coach in the corridor',{need:14,time:4,info:'Walk normal. NORMAL.'});
 hold('you',null);
 if(ok)await N('You walk it to the bathroom like a normal person. Tez takes it without a word and gives you a ten-dollar bill that is very, very crumpled.');
 else await N('Coach stops you. He looks in the bag. He looks at you. He takes one thing out of the bag and puts it in his pocket and walks away. Tez pays you anyway. Tez says that’s “a tax”.');
 D.money=(D.money||0)+10;updateLoc();
 await say('angelo','(to you, later) Tell Omer we’re even. Tell him his mom raised him wrong but she raised him loyal.','smirk');
 D.f.os2=1;part('omerscarf',2);
}});
hook({mis:'omerscarf',period:8,room:'foodcourt',who:'omer',label:'Help Omer pick a scarf',look:{ex:'scared'},cond:()=>D.f.os2&&!D.done.omerscarf&&!D.dead.omer,run:async()=>{
 scene('foodcourt',{omer:[150,1,{y:150}],you:[120,1,{y:154}]},true);
 await say('omer','There’s a stall. Scarves. I don’t know what she likes. She always picks. I’ve never picked. What if I pick wrong?','scared');
 const c=await choose(['The red one. Loud. Like you.','The soft gray one. Like her.','Let Omer pick.']);
 await say('omer',c===2?'(very slowly, picking up a green one with little birds on it) …This one. She has a mug with birds. She drinks out of it every morning before work.':'(holding it up, then putting it down, then picking up a green one with little birds on it) No. This one. She has a mug with birds on it.','blush');
 hold('omer','paper');
 put('omermum',334,-1,{y:150});await walk('omermum',190,50);
 await N('Omer’s mom walks across the food court in her work uniform. She’s here to pick him up. She looks like she’s been standing up for twenty hours.');
 await walk('omer',176,50);hold('omer',null);hold('omermum','paper');
 await say('omer','(not looking at her) It’s early. For Sunday. I picked it. Don’t— if it’s bad you don’t have to wear it.','scared');
 await say('omermum','(opening it, very still) …Birds.','cry');
 await say('omermum','Your dad used to pick my scarves. Every winter. I haven’t had a new one since. I didn’t— I never said. How did you know?','cry');
 await say('omer','I didn’t. I just looked at what you look at.','sad');
 pose('omermum','hug');pose('omer','hug');SFX.heart();
 await N('She puts it on right there, over her work uniform, and holds onto Omer in the middle of the food court. He lets her. For about four seconds.');
 await say('omer','(over her shoulder, to a kid staring from the pretzel stand) Something funny? Something FUNNY? Look at your own mom.','angry');
 pose('omermum',null);pose('omer',null);
 await complete('omerscarf');
}});
tipsFrom('omerscarf',()=>!D.f.os1?'Break or lunch, the Playing Field. Omer is counting coins.':!D.f.os2?'Before school, break or lunch: Angelo in the Main Corridor.':'After school, the Food Court. Help Omer pick.');

/* =====================================================================
   GIANT — Jacob
   ===================================================================== */
mission('giant',{name:'Giant',icon:'🧸',who:['jacob','adam'],goal:'Find out why Jacob never pushes back, and help him get to his sister.',
 blurb:'Jacob is the biggest kid in the school and he lets everybody push him. Today he’s asleep standing up on the field.',
 parts:['Asleep on his feet','The phone call','A ride','What he said on the bus'],tips:['Break, the Playing Field. Jacob is asleep standing up.']});
hook({mis:'giant',period:2,room:'field',who:'jacob',label:'Wake Jacob up',look:{ex:'closed'},cond:()=>(D.done.jacob||D.done.jacobken||cal()>=3)&&!D.f.gi1,run:async()=>{
 scene('field',{jacob:[160,-1,{y:150,ex:'closed'}],you:[130,1,{y:154}]},true);
 await N('Jacob is standing in the middle of the field with his eyes closed. He’s asleep. Standing up. Like a horse.');
 await say('you','Jacob.');
 await say('jacob','(jolting awake) I’m awake. I’m awake. Sorry. I was up. My sister had a bad night.','sad');
 await say('jacob','Maddie. She’s seven. She has seizures. At night, mostly. Somebody has to sit with her. Mom does nights at the hospital, so it’s me.','sad');
 await say('jacob','I count her breathing. It’s fine. I like it, kind of. She holds my thumb.','sad');
 D.f.gi1=1;part('giant',1);
}});
hook({mis:'giant',period:4,room:'canteen',who:'jacob',label:'Ask Jacob who’s calling',look:{pose:'phone',ex:'scared'},cond:()=>D.f.gi1&&!D.f.gi2,run:async()=>{
 scene('canteen',{jacob:[160,-1,{y:148,pose:'phone',ex:'scared'}],you:[132,1,{y:154}]},true);SFX.beep();
 await say('jacob','(on the phone) Is she okay? Is she— okay. Okay. I can’t, I don’t have a— okay.','scared');
 await say('jacob','(hanging up) Maddie’s school. She had one in class. She’s okay. She’s asking for me. Mom’s in surgery, she can’t answer. I don’t have a ride. The bus doesn’t go there. It’s twenty minutes driving.','cry');
 await say('jacob','I’ll walk. It’s fine. It’s like two hours walking. It’s fine.','cry');
 const c=await choose(['“Wait here. I’m getting Mr. Adam.”','“I’ll walk with you.”']);
 if(c===1)await say('jacob','(standing up) …Okay. No. Wait. Get Mr. Adam. Mr. Adam has a car. Mr. Adam’s office. Front Hall.','scared');
 D.f.gi2=1;part('giant',2);
}});
spot({room:'hallb',x:220,y:146,label:'Knock on the VP office door for Mr. Adam',short:'ADAM',mis:'giant',cond:()=>D.f.gi2&&!D.f.gi3&&!D.dead.adam,run:async()=>{
 put('adam',220,1,{y:146});await say('adam','(opening the door, holding his tie) What is it, kiddo? Is it the inspection? Is it Sherman?','scared');
 await say('you','It’s Jacob. His little sister had a seizure at school. His mom’s in surgery. He needs a ride. Now.');
 await say('adam','(already grabbing his keys) Where is he? Go. Go get him. Bus loop. I’ll bring the car round.','yell');
 await walk('adam',-20,120);remove('adam');
 await N('Later you hear what happened. Mr. Adam drove Jacob there doing fifty in a thirty, with his hazard lights on the whole way, and sat in the school office with him for an hour. He missed a meeting with the district. He didn’t tell anybody that part. Jacob did.');
 D.f.gi3=1;part('giant',3);return 'stay';
}});
hook({mis:'giant',period:7,room:'bus',who:'jacob',label:'Sit with Jacob',look:{ex:'sad'},cond:()=>D.f.gi3&&!D.done.giant&&!D.dead.jacob,run:async()=>{
 scene('bus',{jacob:[160,-1,{y:150,pose:'sit'}],you:[130,1,{y:154,pose:'sit'}]},true);cue('sad');
 await say('jacob','She’s okay. She was sitting on the nurse’s bed eating a pudding. She said “you came in a PRINCIPAL CAR.” She’s gonna tell everybody for a year.','happy');
 await say('jacob','You know why I let them push me? Everybody wonders. I see them wonder.','sad');
 await say('jacob','I’m big. I’m like, really big. If I push back once, I’m scary. Then I’m scary forever. Maddie thinks I’m a giant teddy bear. I don’t want to be anything else. Not even for a second.','cry');
 const c=await choose(['“You can be a teddy bear AND push back.”','“You’re the strongest person in this school.”']);
 await say('jacob',c===0?'(thinking about it, slowly) …A teddy bear that pushes back. That’s just a bear.':'(laughing) Paul’s stronger. Paul can lift a car. …Thanks, though.','happy');
 await complete('giant');
}});
tipsFrom('giant',()=>!D.f.gi1?'Break, the Playing Field. Jacob is asleep standing up.':!D.f.gi2?'Lunch, the Cafeteria. Jacob’s phone.':!D.f.gi3?'The Front Hall: knock on the VP Office door for Mr. Adam.':'Home time, the bus loop. Sit with Jacob.');

/* =====================================================================
   QUIET AT HOME — Nivaan
   ===================================================================== */
mission('quiet',{name:'Quiet at Home',icon:'📴',who:['nivaan','nivdad'],goal:'Be there for Nivaan when the stream is off.',
 blurb:'Nivaan hit a hundred viewers. He should be losing his mind. He’s just staring at the number.',
 parts:['A hundred viewers','His dad','Stream off'],tips:['Break or lunch, the Main Corridor. Nivaan hit a hundred.']});
hook({mis:'quiet',period:[2,4],room:'corridor',who:'nivaan',label:'Ask Nivaan why he’s not celebrating',look:{pose:'phone',ex:'sad'},cond:()=>cal()>=3&&!D.f.qu1&&!D.dead.nivaan,run:async()=>{
 scene('corridor',{nivaan:[160,-1,{y:146,pose:'phone',ex:'sad'}],you:[130,1,{y:154}]},true);
 await say('nivaan','A hundred. A hundred people. Chat is going insane. I’m supposed to be going insane.','sad');
 await say('nivaan','My dad moved out last month. Into an apartment over the vape shop. It’s fine. Everybody’s parents split up. It’s basically a Highgate tradition.','sad');
 await say('nivaan','He’s picking me up after school. First time. At the mall. I don’t wanna go. I don’t not wanna go. I just wanna be live while it happens, so I don’t have to be in it.','cry');
 const c=await choose(['“I’ll be there. Off camera.”','“Maybe don’t stream this one.”']);
 await say('nivaan',c===0?'…Off camera. Yeah. Okay. Food court. After school.':'(staring at his phone) …I don’t know how to do stuff without chat. Will you come? Food court. After school.','sad');
 D.f.qu1=1;part('quiet',1);
}});
hook({mis:'quiet',period:8,room:'foodcourt',who:'nivaan',label:'Sit with Nivaan while he waits for his dad',look:{pose:'phone',ex:'scared'},cond:()=>D.f.qu1&&!D.f.qu2&&!D.dead.nivaan,run:async()=>{
 scene('foodcourt',{nivaan:[150,1,{y:150,pose:'sit'}],you:[124,1,{y:154,pose:'sit'}]},true);cue('sad');
 await N('Nivaan has his phone face down on the table. He keeps reaching for it and stopping.');
 put('nivdad',334,-1,{y:150});await walk('nivdad',200,50);
 await say('nivdad','(hands in his pockets, not sure where to stand) Hey, buddy. Hey. You hungry? I found a place that does those dumplings. The ones you like. With the— the crispy bottoms.','sad');
 A.nivaan.pose=null;
 await say('nivaan','(very small) You remembered the crispy bottoms.','sad');
 await say('nivdad','I remember everything, buddy. I just wasn’t home enough to say any of it. That’s on me. That’s on me, not you.','cry');
 const c=await choose(['Nod at Nivaan. Go on.','Squeeze his shoulder. Let him decide.']);
 await walk('nivaan',186,40);
 await N('Nivaan stands up. He leaves his phone on the table. He walks off with his dad toward the dumpling place, and halfway there his dad puts a hand on the back of his neck, and Nivaan doesn’t shrug it off.');
 hold('you','phone');await N('You keep his phone safe. It buzzes the whole time. Two hundred viewers, waiting. He doesn’t come back for it for an hour.');hold('you',null);
 D.f.qu2=1;part('quiet',2);
 return 'stay';
}});
hook({mis:'quiet',period:[0,2,4],room:'corridor',who:'nivaan',label:'Ask Nivaan how the dumplings were',look:{ex:'happy'},cond:()=>D.f.qu2&&!D.done.quiet&&!D.dead.nivaan,run:async()=>{
 scene('corridor',{nivaan:[160,-1,{y:146}],you:[130,1,{y:154}]},true);
 await say('nivaan','Crispy. The bottoms. Really crispy. He cried in the dumpling place. My dad. In public. Over a dumpling.','happy');
 await say('nivaan','I didn’t stream it. First time in like a year something happened and I didn’t stream it.','sad');
 await say('nivaan','(showing you his phone) Look. I turned it off. The whole stream. Chat’s gonna think I died.','happy');
 await say('nivaan','It’s really quiet. It’s… fine. It’s kind of nice actually. Don’t tell chat.','happy');
 await complete('quiet');
}});
tipsFrom('quiet',()=>!D.f.qu1?'Break or lunch, the Main Corridor. Nivaan hit a hundred viewers.':!D.f.qu2?'After school, the Food Court. Sit with Nivaan.':'Before school, break or lunch: Main Corridor. Ask how it went.');

/* nights */
if(typeof NIGHT!=='undefined')NIGHT.push(
 {cond:()=>D.done.tellmom&&!D.f.n13,set:()=>D.f.n13=1,from:'Hasan',msgs:[['them','darren is coming sunday','21:30'],['them','my mom bought a new tablecloth','21:30'],['them','we have never owned a tablecloth','21:31'],['them','im gonna throw up. good throw up','21:31']]},
 {cond:()=>D.done.giant&&!D.f.n14,set:()=>D.f.n14=1,from:'Jacob',msgs:[['them','maddie drew a picture of mr adams car','20:45'],['them','its just a rectangle with a sad man in it','20:45'],['them','shes giving it to him tomorrow','20:46']]},
 {cond:()=>D.done.mended&&!D.f.n15,set:()=>D.f.n15=1,from:'Abby',msgs:[['them','i played it til 3am','03:02'],['them','the neighbors banged on the wall','03:02'],['them','i played it louder','03:03'],['them','tell corey thank u. no dont. i’ll tell him','03:04']]},
 {cond:()=>D.done.grandad&&!D.f.n16,set:()=>D.f.n16=1,from:'Arjun',msgs:[['them','i called my mom','22:10'],['them','like grandad said','22:10'],['them','she cried for 20 min. annoying. anyway','22:11'],['them','tell anyone and ur dead','22:11']]}
);
/* safe version: no Abby, no Mended */
if(window.EDITION==='safe'){dropHooks('mended');delete MIS.mended}
