'use strict';
/* =====================================================================
   HIGHSCHOOL — Hasan's quests. He's the hero in these, not the joke.
   ===================================================================== */
Object.assign(K,{
 darren:{n:'Darren',col:'#3a6ad8',skin:'#f2d0b4',hair:'#d0703a',hs:'curly',top:'#2a4aa8',pants:'#2a2a33',hood:1,goggleUp:1,seed:91,v:380},
 hasandad:{n:'Hasan’s Dad',col:'#8a7a4a',skin:'#c99a6a',hair:'#5a5450',hs:'short',knob:1,top:'#3a3a40',pants:'#2a2a30',adult:1,tache:1,tacheC:'#4a4440',seed:92,v:210}
});
{const a=drawHead;drawHead=function(k,x,hy,d,o){a(k,x,hy,d,o);if(k.goggleUp&&!o.noHair){const hw=12,hx=x-6;R(hx-1,hy,hw+2,1,'#2a3a7a');R(hx+1,hy-1,4,2,'#8ad0ff');R(hx+7,hy-1,4,2,'#8ad0ff');R(hx+1,hy-1,4,1,'#c8eeff');R(hx+7,hy-1,4,1,'#c8eeff')}}}
{const _dh=drawHeld;drawHeld=function(it,x,y,d){if(it==='cupcake'){R(x-3,y-1,6,4,'#c8904a');R(x-3,y-1,6,1,'#a8703a');R(x-4,y-4,8,3,'#f4c8d8');R(x-2,y-6,4,2,'#f4c8d8');R(x,y-8,1,2,'#f0e070');R(x,y-9,1,1,'#ff9030');return}if(it==='card'){R(x-3,y-4,7,5,'#f4e8c8');R(x-2,y-3,5,1,'#c03050');R(x-1,y-1,3,1,'#9aa');return}if(it==='letter'){R(x-4,y-8,9,9,'#f4f0e6');R(x-4,y-8,9,1,'#c8c4b8');return}return _dh(it,x,y,d)}}
{const _dp=drawProp;drawProp=function(p){const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='taxi'){R(x,y-14,58,14,'#e8c030');R(x+10,y-22,34,9,'#e8c030');R(x+12,y-21,13,7,'#8ab0d0');R(x+27,y-21,15,7,'#8ab0d0');R(x+20,y-26,14,4,'#1a1a1a');px('CAB',x+22,y-25,'#f0e070');for(let i=0;i<58;i+=6)R(x+i,y-8,3,2,(i/6)%2?'#1a1a1a':'#e8c030');R(x+6,y-2,10,6,'#1a1a1a');R(x+42,y-2,10,6,'#1a1a1a');R(x+9,y,4,2,'#777');R(x+45,y,4,2,'#777');R(x+56,y-12,2,3,'#fff8c0');return}
 if(p.t==='sign'){R(x-5,y-12,10,10,'#f4f0e6');R(x-5,y-12,10,1,'#c8c4b8');px(p.s,x-3+(p.s==='?'?1:0),y-10,'#c02040');R(x,y-2,1,6,'#8a6a3a');return}
 if(p.t==='chips'){R(x-8,y-2,16,4,'#9aa0aa');px('HASAN',x-9,y-6,'#e8c04a');return}
 return _dp(p)}}

/* =================================================================
   DARREN
   ================================================================= */
mission('darren',{name:'Darren',icon:'🥽',who:['hasan','darren'],
 blurb:'Someone has left Hasan a note. It says 4pm, the mall, “wear something blue”. It’s signed “D”. Hasan has read it forty times and gone a color you can see from space.',
 parts:['Before school: the note','Break, cafeteria: the fries','Lunch, the field: the question'],
 tips:['Before school, bus loop. Hasan’s holding something.','Break, cafeteria. Stay near Hasan.','Lunch, cafeteria. Hasan’s been summoned to the field.'],
 variants:{friends:'Mates',shake:'A milkshake'}});
hook({mis:'darren',period:0,room:'bus',who:'hasan',label:'Ask Hasan what he’s holding',look:{hold:'letter',ex:'blush',pose:null},cond:()=>!D.f.dar1,run:async()=>{
 scene('bus',{hasan:[58,1,{y:146,hold:'letter',ex:'blush'}],you:[84,-1,{y:152}]});
 await say('hasan','(holding a folded note like it might explode) This was in my blazer pocket. On the bus. Someone put it IN my pocket. While I was IN the blazer.','scared');
 hold('hasan',null);
 await N('It’s written in blue gel pen, very neatly. “Hasan. Fair City Mall. 4pm. Wear something blue, it suits you. — D.”');
 await say('hasan','It suits me. SOMETHING suits me. Nobody has ever said anything suits me. My mom says I “carry clothes”.','blush');
 await say('hasan','What if it’s a prank. What if it’s ARJUN. Arjun’s middle name could be D. I don’t know Arjun’s middle name.','scared');
 const c=await choose(['“It’s not Arjun. Arjun doesn’t own a gel pen.”','“Whoever it is, they like you. That’s allowed.”','“Want me to find out who D is?”']);
 if(c===0)await say('hasan','…That’s true. Arjun writes in pencil so he can rub out compliments.','smirk');
 if(c===1)await say('hasan','(quietly) …Yeah. Yeah, okay. That’s allowed.','blush');
 if(c===2)await say('hasan','YES. No. Yes. Don’t make it weird. Make it a bit weird. Find out.','scared');
 D.f.dar1=1;part('darren',1);
}});
hook({mis:'darren',period:2,room:'canteen',who:'hasan',label:'Line with Hasan',look:{ex:'scared'},cond:()=>D.f.dar1&&!D.f.dar2,run:async()=>{
 scene('canteen',{pat:[90,1,{y:140}],hasan:[150,-1,{y:146}],you:[176,-1,{y:150}]});
 cue('canteen');
 await walk('hasan',112,50);
 await say('pat','(sliding a tray over without looking up) Here you go, love. Special order.','smirk');
 hold('hasan','tray');prop({t:'chips',x:112,y:118,layer:30});
 await N('His fries have been arranged, one by one, into letters. They spell HASAN. The ketchup is a heart. The heart has been done with care.');
 await say('hasan','Pat. PAT. Who did this.','shock');
 await say('pat','Can’t say. He paid in cash and he paid in respect.','smirk');
 put('darren',334,-1,{y:150});await walk('darren',140,60);
 await N('A boy with curly ginger hair and prescription swimming goggles pushed up on his forehead walks over like he’s been rehearsing the walk. He has.');
 await say('darren','Hi. It’s me. D. Darren. Swim team. seventh grade, at the pool, you went back into the deep end for my goggles when nobody else would.','blush');
 await say('hasan','I— I don’t— I mean I remember the goggles. I didn’t know they were— YOURS—','shock');
 await say('darren','You don’t have to remember. I remember for both of us. I’ve been building up to this for two years. The fries were step one.','happy');
 await say('hasan','How many steps ARE there?','scared');
 await say('darren','Eleven.','happy');
 props=props.filter(p=>p.t!=='chips');hold('hasan',null);
 await walk('hasan',-16,110);remove('hasan');
 await say('darren','(watching him go) …He’s going to the bathroom. That’s okay. That’s in the plan. That’s step four.','blush');
 const c=await choose(['Go after Hasan.','Talk to Darren.']);
 if(c===0){scene('toilets',{hasan:[150,1,{y:146,pose:'cover'}],you:[120,1,{y:152}]});await say('hasan','He went into the DEEP END for my— no, I went in for HIS— I don’t even like swimming. I just didn’t want him to lose his goggles.','scared');await say('you','So you’re just a nice person who got caught being nice.');await say('hasan','(through his hands) …I hate that that’s exactly it.','blush')}
 else{await say('darren','Is he okay? I can skip to step ten. Step ten is just a normal conversation. I wasn’t sure he’d want that.','sad');await say('you','Maybe lead with the normal conversation, bro.');await say('darren','(writing on his hand in gel pen) Lead. With. Normal.','happy')}
 D.f.dar2=1;part('darren',2);
}});
hook({mis:'darren',period:4,room:'canteen',who:'hasan',label:'Ask Hasan why he’s staring at his phone',look:{pose:'phone',ex:'shock'},cond:()=>D.f.dar2&&!D.done.darren,run:async()=>{
 scene('canteen',{hasan:[176,1,{y:146,pose:'phone',ex:'shock'}],you:[150,1,{y:152}]});
 await say('hasan','He’s texted. “Field. Now. Step nine.” What’s step nine. WHAT’S STEP NINE.','scared');
 scene('field',{hasan:[60,1,{y:150}],you:[40,1,{y:154}],darren:[150,-1,{y:146}],kid1:[180,-1,{y:146}],kid2:[200,-1,{y:146}],kid3:[220,-1,{y:146}],kid4:[240,-1,{y:146}],coach:[300,-1,{y:140,hold:'javelin'}]},true);
 cue('field');
 const letters=['H','A','S','A','N','?'];const signs=letters.map((s,i)=>prop({t:'sign',s,x:150+i*20,y:130,layer:20}));
 for(const k of['kid1','kid2','kid3','kid4'])pose(k,'up');pose('darren','up');
 await N('The swim team is standing on the field in a line, holding up one big letter each. H. A. S. A. N. And Darren, at the end, holding a question mark over his head with both arms, shaking a little.');
 await say('darren','(shouting across the field) Do you want to get a milkshake! As a thing! Or not as a thing! Either! The question mark covers both!','blush');
 await say('coach','JAVELIN PRACTICE.','yell');
 SFX.whoosh();const j=prop({t:'javelin',x:300,y:100,rot:.3});await tw(j,{x:252,y:124},260,'in');SFX.thud();
 signs[5].hide=1;props=props.filter(p=>p!==signs[5]);await tw(A.darren,{x:262},120);A.darren.pose=null;
 await N('A javelin goes straight through the question mark. Darren is fine. The question mark is not. The sign now just says HASAN, which somehow is worse.');
 await say('darren','(holding half a question mark) …That was step nine. There’s no step ten now. I panicked about step ten anyway.','sad');
 face('hasan',-1);
 await say('hasan','(very quietly, to you) What do I do. I’ve never been asked anything. Nobody’s ever asked me anything that wasn’t “can you move”.','scared');
 const c=await choose(['“Tell him the truth, whatever it is. He’s been brave. You can be too.”','“Say yes to a milkshake. As friends. See what happens.”','“Run.”']);
 if(c===2){await walk('hasan',-16,120);await N('Hasan runs. He gets about ten meters, stops, stands there for a second with his hands on his head, and walks back.');await walk('hasan',60,60);await say('hasan','I can’t run. He made me fries into my NAME.','sad')}
 await walk('hasan',140,50);face('hasan',1);
 if(c===0||c===2){
  await say('hasan','Darren. That’s the nicest anyone’s ever been to me. Ever. I mean it. But I don’t— I don’t think I like anyone like that. Yet. Or maybe ever. I don’t know.','sad');
  await say('darren','(nodding, very fast) That’s okay. That’s actually okay. I just wanted you to know you’re the kind of person someone does eleven steps for.','happy');
  await say('hasan','…Can we still be friends? You can teach me to swim. Properly. Without the deep end.','happy');
  await say('darren','(pulling the goggles off his head and holding them out) Lucky goggles. Prescription. You’ll see everything blurry. It’s great.','happy');
 }else{
  await say('hasan','A milkshake. Yeah. As friends. As… let’s just see. I don’t know what I am. I know I want a milkshake with someone who did eleven steps for me.','blush');
  await say('darren','(dropping the half question mark) STRAWBERRY. I mean. Whatever flavour. I mean strawberry.','love');
  D.f.darShake=1;
 }
 put('arjun',334,-1,{y:150});await walk('arjun',230,90);
 await say('arjun','OI, HASAN, WHAT’S THIS, A—','smirk');
 put('omer',334,-1,{y:150});await walk('omer',246,140);face('omer',-1);pose('omer','cross');
 await say('omer','Arjun.','angry');
 await say('arjun','…','scared');
 await say('omer','Nobody’s laughing at this. Nobody. Walk.','angry');
 await walk('arjun',340,80);remove('arjun');
 await say('hasan','(watching Arjun go) Omer just did that for me. Today’s the weirdest day of my life. And it’s ALWAYS today.','happy');
 bond('hasan',1);
 await complete('darren',D.f.darShake?'shake':'friends');
}});
/* after school: the milkshake */
hook({mis:'darren',period:8,room:'foodcourt',who:'hasan',label:'Wave at Hasan and Darren',look:{hold:'mug',ex:'happy'},cond:()=>D.f.darShake,run:async()=>{
 scene('foodcourt',{hasan:[150,1,{y:150,hold:'mug'}],darren:[172,-1,{y:150,hold:'mug'}],you:[120,1,{y:156}]});
 await N('Hasan and Darren are sharing a table at Noodle Box, with two milkshakes from somewhere else. Darren is explaining tumble turns with chopsticks.');
 await say('hasan','(spotting you, grinning) He’s actually really funny. Did you know he’s really funny? Nobody told me he was funny.','happy');
 await say('darren','Step twelve was “be funny”. I added it at lunch.','love');
 D.f.darShake=0;return 'stay';
}});

/* =================================================================
   NIGHT SHIFT — Hasan’s dad
   ================================================================= */
Object.assign(ITEMS,{cupcake:'A birthday cupcake with DAD on it'});
mission('nightshift',{name:'Night Shift',icon:'🎂',who:['hasan','pat'],
 blurb:'Hasan’s dad drives a cab at night. He’s asleep when Hasan’s up and gone when Hasan gets home. Today’s his birthday. Hasan hasn’t said happy birthday to his face in three years.',
 parts:['Break: Hasan’s quiet','Lunch: Pat’s kitchen','Home time: the cab'],
 tips:['Break, cafeteria. Hasan’s the quiet one.','Lunch, cafeteria. Ask Pat. She’s softer than she looks.','Home time, bus loop. Wait with Hasan.']});
hook({mis:'nightshift',period:2,room:'canteen',who:'hasan',label:'Ask Hasan why he’s quiet',look:{pose:'phone',ex:'sad'},cond:()=>!D.f.ns1,run:async()=>{
 scene('canteen',{hasan:[240,-1,{y:146,pose:'phone',ex:'sad'}],you:[214,1,{y:152}]});
 await say('hasan','(showing you his phone) He sends me one every morning. Same time. Before he goes to sleep.');
 await dms('Dad','last seen 06:04',[['them','Off to bed. Have a good day son. Dad','Thu 06:03'],['them','Off to bed. Have a good day son. Dad','Fri 06:03'],['me','have a good sleep','Fri 07:40']]);
 await say('hasan','It’s his birthday. He hasn’t said. He never says. He’ll get up at four, have a coffee standing up, and go and drive drunk people home till six.','sad');
 await say('hasan','I want to give him something. Before his shift. To his FACE. I haven’t said happy birthday to his face in three years. He’s always asleep.','sad');
 await say('hasan','Arjun says he works nights so he doesn’t have to look at me. I know that’s not true. It’s just… it sits there. You know?','sad');
 const c=await choose(['“Then we make him a cake and you give it to him. Today.”','“It’s not true. You know it’s not true.”']);
 if(c===1)await say('hasan','I know. I know. Help me make it really obviously not true.','sad');
 else await say('hasan','A cake. I can’t bake. I’ve set fire to toast. Twice. Same toast.','scared');
 D.f.ns1=1;part('nightshift',1);
}});
hook({mis:'nightshift',period:4,room:'canteen',who:'pat',label:'Ask Pat for a favour (for Hasan)',look:{pose:null,ex:'smirk'},cond:()=>D.f.ns1&&!has('cupcake')&&!D.done.nightshift,run:async()=>{
 scene('canteen',{pat:[90,1,{y:140}],you:[120,-1,{y:150}]});
 if(!D.dead.hasan)put('hasan',146,-1,{y:148});
 await say('you','Pat. Hasan’s dad works nights. It’s his birthday. Can we borrow your kitchen for ten minutes?');
 await say('pat','(very still, holding a cleaver) …Nights?','smirk');
 await say('pat','My dad worked nights. Down the pit. I used to leave him a jam sandwich on the stairs.','sad');
 await say('pat','Ten minutes. Touch my good knives and I’ll touch you back.','evil');
 await walk('pat',60,40);if(A.hasan)await walk('hasan',76,50);await walk('you',100,50);
 pose('you','saw');const r1=await meter('Mix the batter',{speed:1.05});pose('you',null);
 SFX.fire();await N('Pat puts them in the big oven. While you wait, she tells you about her dad’s jam sandwiches. You’ve never heard her say this many words. Nobody has.');
 const r2=await meter('Pipe DAD on the top',{speed:1.15,zone:.24});
 give('cupcake');
 await say('pat',r2?'(looking at it for a long time) …That’s a real one. He’ll keep that in the cab till it goes hard.':'It says DAB. It’s fine. He’ll know.','sad');
 if(A.hasan)await say('hasan','Thank you, Pat. Seriously. You’re… not what everyone says.','happy');
 await say('pat','Tell anyone and I’ll fry you.','smirk');
 part('nightshift',2);
}});
hook({mis:'nightshift',period:7,room:'bus',who:'hasan',label:'Wait with Hasan',look:{ex:'scared',hold:'cupcake'},cond:()=>has('cupcake')&&!D.done.nightshift&&!D.dead.hasan,run:async()=>{
 const cast={hasan:[140,1,{y:150,hold:'cupcake'}],you:[116,1,{y:154}]};if(!D.dead.arjun)cast.arjun=[230,-1,{y:146,pose:'cross'}];
 scene('bus',cast);take('cupcake');
 await say('hasan','He drives past here at quarter past three every day on his way to the rank. He doesn’t stop. He doesn’t know I know.','scared');
 const cab=prop({t:'taxi',x:-70,y:166,layer:30});SFX.rumble();await tw(cab,{x:90},1600,'out');
 await N('A yellow cab pulls in to the bus loop, which it isn’t allowed to do. The driver has the same head as Hasan, older, greyer, with a moustache.');
 put('hasandad',118,1,{y:150});await say('hasandad','(leaning out of the window) Hasan? Is everything okay? Did something happen?','shock');
 await walk('hasan',130,50);pose('hasan','hold');
 await say('hasan','Happy birthday, Dad.','closed');
 await N('His dad looks at the cupcake. Then at Hasan. Then he gets out of the cab, which you can tell is the first time he’s stopped this cab in daylight in a long time.');
 await say('hasandad','…You remembered.','cry');
 await say('hasan','I always remember. You’re just always asleep.','sad');
 pose('hasan','hug');pose('hasandad','hug');SFX.heart();
 await N('He hugs Hasan in the middle of the bus loop, in front of everyone. Hasan hugs him back with the cupcake still in one hand.');
 await say('hasandad','I drive nights so you can have days. That’s all it is. I’m sorry I miss them.','cry');
 await say('hasan','Can you come to the mall? For ten minutes? Before your shift?','happy');
 await say('hasandad','(checking his watch, then not checking it) …Get in. You too, bro.','happy');
 pose('hasan',null);pose('hasandad',null);
 if(A.arjun){await N('Across the loop, Arjun is watching. For once he doesn’t say anything. After a while he looks at the ground.');await say('arjun','(to nobody) …Happy birthday, Mr. Hasan’s dad.','sad')}
 bond('hasan',1);
 await complete('nightshift');
}});
