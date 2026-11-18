'use strict';
/* =====================================================================
   HIGHSCHOOL — THINGS YOU FIND
   Look closely at the school and stuff starts. Each of these begins
   when you investigate something (a sparkle), and costs an apple.
   ===================================================================== */
Object.assign(ITEMS,{firstaid:'Pat’s first aid kit',bytephone:'A phone with a cracked pink case'});

/* ---------------- THE LAST STALL ---------------- */
mission('stall',{name:'The Last Stall',icon:'🚽',who:['brandon','pat','voss'],goal:'Keep Brandon alive.',
 blurb:'There’s blood coming out from under the last stall in the Boys’ Bathroom. Somebody is in there, and they really don’t want a teacher to know.',
 parts:['The blood under the stall','Pat’s first aid kit','Back to the stall'],
 tips:['Boys’ Bathroom (Main Corridor).','The Cafeteria: Pat keeps a first aid kit behind the counter.','Take it back to the Boys’ Bathroom.']});
spot({room:'toilets',x:270,y:150,label:'Look at the blood under the last stall',short:'BLOOD',sparkle:1,mis:'stall',cond:()=>!D.f.st1&&!D.done.stall&&!D.dead.brandon,run:async()=>{
 await walk('you',250,60);pose('you','kneel');
 await N('A red puddle is creeping out from under the last stall, very slowly, along the grout lines.');
 await say('brandon','(through the door) Go away. I’m fine. I’m— it’s fine. Don’t get a teacher. DON’T get a teacher.','scared');
 const c=await choose(['“Brandon? Open the door.”','Slide your hoodie under the door.']);
 pose('you',null);SFX.door();put('brandon',272,-1,{y:150,pose:'sit',hurt:2,ex:'hurt'});
 await N('He opens it. Brandon, from Food Tech, sitting on the toilet lid, holding his side. There’s a line of stitches under his shirt. Fishing line. Some of them have come out.');
 await say('brandon','Mr. Voss said it was extra credit. He said I’d get an A in chem for the rest of my life. I just woke up in here.','cry');
 await say('brandon','Pat. Pat has a first aid kit. A real one. Not the school one. Please. I can’t walk.','cry');
 D.f.st1=1;part('stall',1);return 'stay';
}});
spot({room:'canteen',x:60,y:146,label:'Ask for Pat’s first aid kit behind the counter',short:'KIT',mis:'stall',cond:()=>D.f.st1&&!has('firstaid')&&!D.done.stall,run:async()=>{
 const pat=A.pat&&!A.pat.dead;
 if(pat){await say('pat','(not looking up) What.','angry');await say('you','Pat. Somebody’s bleeding in the bathroom. Mr. Voss did it.');
  await say('pat','(putting the ladle down very slowly) …Voss.','evil');hold('pat','tray');await N('She reaches under the counter and slaps a big red tin on it. It’s heavier than it looks. It has a cleaver in it too, for some reason.');hold('pat',null);
  await say('pat','Tell the kid to bite down on something. Tell Voss I said hi.','evil')}
 else{pose('you','reach');await N('Nobody’s behind the counter. You reach under it. A big red tin: FIRST AID — PAT’S — TOUCH IT AND DIE.');pose('you',null)}
 give('firstaid');part('stall',2);return 'stay';
}});
spot({room:'toilets',x:270,y:150,label:'Patch Brandon up',short:'BRANDON',mis:'stall',cond:()=>D.f.st1&&has('firstaid')&&!D.done.stall,run:async()=>{
 put('brandon',272,-1,{y:150,pose:'sit',hurt:2,ex:'hurt'});take('firstaid');await walk('you',254,60);pose('you','kneel');
 const ok=await mash('Hold the stitches shut',{need:16,time:5,info:'Press. Tape. Press. Don’t look.'});
 pose('you',null);
 if(ok){await N('You tape him up with half a roll of Pat’s gauze and the tape off a sandwich. It’s ugly. It holds.');await say('brandon','(laughing, nearly crying) I owe you my whole kidney. My other one. The one he left.','happy');await complete('stall','saved')}
 else{await N('There’s too much. He goes very pale and very calm and asks you if his scones were good last week. You say yes. They weren’t.');A.brandon.dead='lie';D.dead.brandon=1;await complete('stall','lost')}
 return 'stay';
}});
MIS.stall.variants={saved:'Patched up',lost:'Too late'};

/* ---------------- RINGING ---------------- */
mission('ringing',{name:'Ringing',icon:'📱',who:['byte','kayden'],goal:'Find out who keeps calling the phone under the bench.',
 blurb:'A phone is ringing under a bench in the Front Hall. Nobody is picking it up. It’s been ringing all day.',
 parts:['The phone under the bench','Mrs. Byte’s desk'],
 tips:['The Front Hall.','Upstairs, the ICT room (when there’s no lesson): Mrs. Byte’s desk.']});
spot({room:'hallb',x:130,y:150,label:'Pick up the phone ringing under the bench',short:'PHONE',sparkle:1,mis:'ringing',cond:()=>!D.f.rg1&&!D.done.ringing,run:async()=>{
 SFX.beep();await walk('you',130,60);pose('you','kneel');await wait(200);pose('you','phone');
 await N('A phone with a cracked pink case. On the lock screen: a photo of a man in army uniform. It’s a stock photo. It still has the watermark on it. CALLING: RICK ❤️');
 const c=await choose(['Answer it.','Let it ring.']);
 if(c===0){await say('you','…Hello?');
  await say('kayden','(on the phone, in a VERY deep voice that cracks halfway) Bae. Baby. It’s Rick. From the war. I need another hundred bucks. For— for a helicopter part.','scared');
  await say('you','Kayden?');await N('There’s a long silence. Then the call ends. Somewhere downstairs, very faintly, somebody screams “NO” into a hoodie.')}
 pose('you',null);give('bytephone');D.f.rg1=1;part('ringing',1);return 'stay';
}});
spot({room:'ict',x:80,y:150,label:'Leave the pink phone on Mrs. Byte’s desk',short:'DESK',mis:'ringing',cond:()=>D.f.rg1&&has('bytephone')&&!D.done.ringing,run:async()=>{
 take('bytephone');await walk('you',80,60);pose('you','reach');
 const c=await choose(['Leave her a note: “Rick is Kayden.”','Text Rick back from her phone: “I know, Kayden.”','Just leave it.']);
 pose('you',null);
 if(c===0){await N('You write it on a sticky note and stick it to the screen. In capitals. You underline Kayden twice.');D.f.byteRick=1;await complete('ringing','note')}
 else if(c===1){await N('You type it. Send. Three dots appear. They disappear. They appear. A reply: “who is this”. Then: “pls dont tell her”. Then: “ill give u 20 bucks”.');D.f.byteRick=1;await complete('ringing','text')}
 else await complete('ringing','left');
 return 'stay';
}});
MIS.ringing.variants={note:'The sticky note',text:'Texted Rick',left:'Left it'};

/* ---------------- UP THERE ---------------- */
mission('upthere',{name:'Up There',icon:'🪜',who:['tyler'],goal:'Find out what’s on the roof.',
 blurb:'There’s a note taped to the roof hatch at the end of the upstairs corridor. It’s in a kid’s handwriting. “if ur reading this the roof is open. dont tell her.”',
 parts:['The note on the hatch','The roof'],tips:['Upstairs Corridor.','Go up through the hatch.']});
spot({room:'upper',x:300,y:140,label:'Read the note taped to the roof hatch',short:'NOTE',sparkle:1,mis:'upthere',cond:()=>!D.done.upthere,run:async()=>{
 await walk('you',296,60);A.you.back=1;pose('you','reach');
 await N('“if ur reading this the roof is open. dont tell her. — T”. The handwriting is the same as the notebook in locker 214. Tyler.');
 const c=await choose(['Climb up.','Not now.']);
 A.you.back=0;pose('you',null);
 if(c===1){D.f.ut1=1;if(!D.mp.upthere)part('upthere',1);return 'stay'}
 part('upthere',1);
 scene('roof',{you:[60,1,{y:156}]},true);cue('sad');
 await N('The roof. Wind. Gravel. In the corner, behind an air vent, somebody made a little camp. A sleeping bag. Empty juice boxes. A flashlight with dead batteries.');
 await walk('you',220,50);pose('you','kneel');
 await N('A math textbook with all the answers filled in. An inhaler. And a drawing of the Trailer from above, with an X on it, and the words “SHE KEEPS THE KEY IN HER BRA”.');
 pose('you',null);intel('tylerRoof');
 await N('He was hiding up here. Before. For a while. From her. He came down eventually. Everybody always has to come down eventually.');
 await complete('upthere','found');
 return 'stay';
}});
INTEL.tylerRoof='Tyler hid on the school roof before he went missing. He drew the Trailer with an X on it.';
MIS.upthere.variants={found:'Tyler’s camp'};

/* ---------------- THE STAIN ---------------- */
mission('stain',{name:'The Stain',icon:'🩸',who:['oakes','dheva'],goal:'Find out what’s dripping through the Science Wing ceiling.',
 blurb:'There’s a dark stain on the Science Wing ceiling. It drips. Every few seconds. Into a mop bucket somebody put under it and walked away from.',
 parts:['The drip','Woodwork, upstairs'],tips:['The Science Wing.','Upstairs, the Arts Wing: the Woodwork door.']});
spot({room:'wing_sci',x:110,y:150,label:'Look at the stain dripping from the ceiling',short:'DRIP',sparkle:1,mis:'stain',cond:()=>!D.f.sn1&&!D.done.stain,run:async()=>{
 await walk('you',110,60);pose('you','reach');
 for(let i=0;i<3;i++){SFX.drip();blood(110,60,2,null,10,150);await wait(TEST?0:300)}
 await N('It’s not water. It’s dark red, and it’s coming through the ceiling tile. Whatever’s above the Science Wing, on the second floor, is leaking.');
 await N('Above the Science Wing is the Woodwork room.');
 pose('you',null);D.f.sn1=1;part('stain',1);return 'stay';
}});
spot({room:'wing_arts',x:96,y:150,label:'Look under the Woodwork door',short:'GAP',mis:'stain',cond:()=>D.f.sn1&&!D.done.stain,run:async()=>{
 await walk('you',118,60);pose('you','kneel');
 await N('Through the gap under the door: sawdust, a lot of it, red in the middle. A long wooden box on two trestles. A lid leaning against it with a brass plate.');
 await N('Mr. Oakes’s boots walk past the gap. They stop. They turn toward the door.');
 const c=await choose(['Stay very still.','Run.']);
 if(c===0){SFX.door();put('oakes',118,-1,{y:146});A.oakes.ex='smirk';
  await say('oakes','(looking down at you on the floor) Don’t lie down there, kid. You’ll get measured.','smirk');
  await N('Behind him, on the brass plate on the coffin lid, there’s a name engraved. It isn’t finished yet. It just says D-H-E-V.');
  if(!D.dead.dheva)intel('oakesDheva');
  await walk('oakes',334,40);remove('oakes')}
 else{SFX.whoosh();await walk('you',20,140);await N('You get to the stairs before the door opens. Behind you, you hear it creak, and a long tape measure being pulled out, and pulled out, and pulled out.')}
 pose('you',null);await complete('stain',c===0?'stayed':'ran');return 'stay';
}});
INTEL.oakesDheva='Mr. Oakes is building a coffin with DHEV— on the lid.';
MIS.stain.variants={stayed:'Saw the name',ran:'Ran'};
