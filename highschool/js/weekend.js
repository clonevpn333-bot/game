'use strict';
/* =====================================================================
   HIGHSCHOOL — THE WEEKENDS. No school. Much worse.
   ===================================================================== */
K.jade={n:'Jade',col:'#c03050',skin:'#e8c0a0',hair:'#1a1018',hs:'long',top:'#a02838',pants:'#1a1a22',girl:1,seed:91,v:430,vw:'triangle'};K.jade.id='jade';
K.cop={n:'Officer Dunmore',col:'#2a3a6a',skin:'#c98e64',hair:'#4a3a2a',hs:'buzz',top:'#2a3a6a',pants:'#1a1a2a',adult:1,wide:1,tache:1,seed:92,v:150};K.cop.id='cop';
function weekend(o){
 const mis='wk_'+o.id;
 mission(mis,{name:'Weekend: '+o.name,icon:o.icon||'🎉',who:o.who||[],blurb:o.blurb,parts:[o.name],tips:['Saturday or Sunday. Pick it from the group chat when you wake up.'],variants:o.variants||{}});
 WEEKEND.push(Object.assign({mis},o));
 hook({mis,period:8,room:o.room,who:'weekend',cond:()=>false,run:o.run});
}
Object.assign(DEATHS,{
 shapeshifter:{name:'Doppelgänger',desc:'She looked better as you. She said so.',hint:'Weekend: the girl at the food court. Don’t fight her as yourself.'},
 cart:{name:'Off the Roof',desc:'Shopping carts don’t have brakes. Carparks have edges.',hint:'Weekend: the Grand Prix. Brake. There is no brake.'},
 cheeked:{name:'Cheeked',desc:'Slapped to death by two grown men’s cheeks. A one-star review.',hint:'Weekend: the premiere. Be kind to artists.'}
});

/* ---------------- rooms ---------------- */
ROOMS.party={name:'Marcus’s House',music:'arcade',bg(){
 R(0,0,W,112,'#3a2a3a');for(let i=0;i<W;i+=12)R(i,0,1,112,'rgba(0,0,0,.08)');R(0,0,W,5,'#2a1a2a');
 for(let i=0;i<14;i++){const c=['#ff4a7a','#4ac8ff','#f0e040','#6aff8a'][i%4];R(10+i*22,10+Math.sin(i)*3,2,2,c);if(Math.sin(T*4+i)>0){g.globalAlpha=.2;R(4+i*22,4,14,14,c);g.globalAlpha=1}}
 R(0,9,W,1,'#5a4a5a');
 for(let i=0;i<4;i++){R(16+i*28,24,22,18,'#c8a868');R(18+i*28,26,18,14,['#8aa0b0','#b08a70','#90a080','#a090b0'][i]);R(24+i*28,30,6,6,'#e8c8a0')}pxc('MARCUS',70,46,'#f0e0c0');pxc('(AGE 4)',70,52,'#c8b8a0');
 R(130,22,80,48,'#0a0a0a');R(132,24,76,44,'#1a2a4a');R(134,26,72,40,['#2a4a8a','#8a2a4a','#2a8a4a'][Math.floor(T*2)%3]);px('KARAOKE',150,40,'#fff');R(160,70,20,4,'#2a2a2a');
 R(226,16,90,90,'#1a2030');R(228,18,86,86,'#2a3a5a');g.globalAlpha=.3;for(let i=0;i<6;i++){const q=(T*.4+i/6)%1;R(240+i*12+Math.sin(T+i)*3,90-q*60,6,4,'#d8e8f0')}g.globalAlpha=1;R(240,80,62,24,'#3a6a8a');R(242,82,58,4,'#6ac8e8');R(270,18,2,86,'#8a8a9a');px('HOT TUB',248,70,'#e8f0ff');
 R(0,106,W,6,'#2a1a20');
 R(0,112,W,68,'#6a4a3a');for(let i=0;i<W;i+=18)R(i,112,1,68,'#5a3a2a');
 R(40,118,90,18,'#4a2a5a');R(40,114,90,6,'#5a3a6a');R(36,114,6,22,'#4a2a5a');R(128,114,6,22,'#4a2a5a');
 for(let i=0;i<14;i++)R(hsh(i+40)*W,150+hsh(i+41)*26,3,4,'#c02030');
 R(180,124,40,4,'#2a2a2a');R(184,128,2,10,'#2a2a2a');R(214,128,2,10,'#2a2a2a');for(let i=0;i<6;i++)R(186+i*5,120,3,4,'#c02030');
}};
ROOMS.lake={name:'Fair City Reservoir',music:'field',bg(){
 skyBands(['#f0b080','#f0c898','#e8d8b8','#c8d8e0'],0,60);
 R(250,16,14,14,'#fff0c0');g.globalAlpha=.3;R(244,10,26,26,'#fff0c0');g.globalAlpha=1;
 for(let i=0;i<8;i++){const x=i*48-10;R(x,46,60,16,'#7a8a7a');R(x+10,40,30,8,'#7a8a7a')}
 R(0,56,W,8,'#5a6a5a');R(120,48,90,14,'#9a9a90');for(let i=0;i<6;i++)R(124+i*15,50,10,10,'#7a7a72');
 R(0,62,W,60,'#5a7a8a');for(let y=64;y<122;y+=3){const o=Math.sin(T*1.2+y*.3)*4;for(let x=(y*7)%20;x<W;x+=26)R(x+o,y,10,1,y<80?'#8aaab8':'#6a8a9a')}
 g.globalAlpha=.25;R(244,64,24,40,'#fff0c0');g.globalAlpha=1;
 for(let i=0;i<14;i++){const x=hsh(i+20)*80;R(x,104+hsh(i)*10,1,16,'#5a6a3a');R(x+1,102+hsh(i)*10,1,4,'#8a6a3a')}
 R(0,122,W,58,'#5a5a3a');for(let i=0;i<W;i+=4)R(i,122,2,2,'#6a7a4a');
 R(100,128,220,26,'#7a5a3a');for(let i=0;i<220;i+=10){R(100+i,128,9,26,'#8a6a42');R(100+i,128,9,1,'#a88a5a')}for(let i=0;i<5;i++)R(110+i*48,154,4,20,'#4a3424');
 R(30,100,22,16,'#f4f0e6');R(40,116,2,12,'#6a4a2a');px('NO',34,102,'#c03030');px('SWIM',32,108,'#c03030');
}};
if(typeof LIGHT!=='undefined'){LIGHT.party={amb:.5,tint:[60,20,70],src:[[170,46,120,.4,[120,170,255]],[270,80,90,.3,[120,220,255]],[60,20,80,.2,[255,120,180]]],wallAO:1};LIGHT.lake={amb:.9,tint:[80,60,40],src:[[256,22,200,.3,[255,220,170]]]}}
{const _dp=drawProp;drawProp=function(p){const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='cart'){R(x-10,y-14,22,10,'#b8b8c0');for(let i=0;i<5;i++)R(x-9+i*4,y-14,1,10,'#8a8a90');R(x-10,y-4,22,1,'#8a8a90');R(x-8,y-2,3,3,'#1a1a1a');R(x+7,y-2,3,3,'#1a1a1a');R(x+12,y-18,2,8,'#8a8a90');return}
 if(p.t==='screen'){R(x-60,y-40,120,50,'#0a0a0a');R(x-58,y-38,116,46,'#e8e0d0');const f=Math.floor(T*6)%2;R(x-30+f*4,y-28,22,22,'#e8b890');R(x+4-f*4,y-28,22,22,'#d8a878');px('SLAP',x-10,y-4,'#c03030');return}
 if(p.t==='fish'){R(x-10,y-4,20,7,'#6a6a4a');R(x+10,y-6,6,11,'#5a5a3a');R(x-8,y-3,2,2,'#fff');R(x-12,y-1,3,1,'#3a3a2a');R(x-12,y+1,3,1,'#3a3a2a');return}
 return _dp(p)}}

/* ---------------- 1. THE GIRL AT THE FOOD COURT ---------------- */
weekend({id:'jade',name:'The Girl at the Food Court',icon:'🎭',room:'foodcourt',who:['jade','hasan','nivaan'],tag:'💘',
 text:'theres a girl at the food court asking about u. by name. nobody knows her. GO',who_:'nivaan',
 blurb:'Saturday night. A girl nobody has ever seen sits down at your table at the food court, steals a fry, and acts like she’s known you forever.',
 variants:{kissed:'Kissed her',ran:'Ran',fought:'Fought her'},run:async()=>{
 const cast={you:[150,1,{y:154}],jade:[176,-1,{y:150}]};if(!D.dead.hasan)cast.hasan=[60,1,{y:150}];if(!D.dead.nivaan)cast.nivaan=[84,1,{y:154,pose:'film'}];
 scene('foodcourt',cast,true);cue('romance');
 await N('Saturday night. Fair City Mall. You’re eating fries on your own. A girl in a red jacket sits down across from you without asking and takes one.');
 await say('jade','Hi. I’m Jade. You hate pickles, you cried at Toy Story 3, and your locker combination is 12-31-07. Is that weird? I feel like that’s weird.','love');
 await say('you','…How do you know my locker combination?');
 await say('jade','Lucky guess. I’m a good guesser. Want to go to the arcade?','smirk');
 if(A.hasan)await say('hasan','(from the next table, mouthing very clearly) GO. GO. WHAT THE FUCK ARE YOU DOING. GO.','happy');
 scene('arcade',{you:[120,1,{y:154}],jade:[150,-1,{y:150}]},true);
 await N('She plays the claw machine and wins every time. Without looking. She gives you a plush shark. Its eyes are stitched on slightly wrong.');
 await N('In a dead machine’s black screen, her reflection: a tall grey man with no face. You look back. She’s just Jade, smiling.');
 await say('jade','You’ve gone pale. Are you okay? Do you want to hold my hand? You can hold my hand.','love');
 if(!D.dead.nivaan){put('nivaan',-14,1,{y:150,pose:'film'});await walk('nivaan',90,80);await say('nivaan','Yo, chat wants to know who your friend—','happy');
  A.jade.k=K.nivaan;SFX.static();await N('Jade turns round. For one second, she has Nivaan’s face. Exactly his face. Down to the mustache he’s trying to grow.');
  await say('nivaan','(dropping his phone) WHY IS SHE ME. WHY IS SHE ME. CHAT, WHY IS SHE ME.','scared');A.jade.k=K.jade;await walk('nivaan',-20,140);remove('nivaan')}
 scene('carpark',{you:[120,1,{y:154}],jade:[170,-1,{y:150}]},true);cue('evil');
 await N('She takes you up to the roof of the carpark. The whole of Fair City is lit up orange below you. She’s quiet for a while.');
 await say('jade','I should tell you something. I’m not exactly a Jade.','sad');
 for(const [k,line] of[['hasan','I can be anyone.'],['shermian','I was Ms. Sherman’s husband for a while. He’s not at his mom’s, by the way.'],['coach','I was Coach for a whole week once. Nobody noticed. I ran the beep test.'],['you','And I can be you. I like being you. You’re easy.']]){A.jade.k=K[k];SFX.whoosh();flash('#fff',.25);await say('jade',line,k==='you'?'smirk':'happy')}
 A.jade.k=K.jade;
 await say('jade','But I like being Jade best. With you. So. What do you want to do?','love');
 const c=await choose(['Kiss her anyway.','Run.','Fight her.']);
 if(c===0){
  pose('you','kiss');pose('jade','kiss');SFX.kiss();fxState.romance=1;
  await wait(600);A.jade.k=K.aidan;SFX.static();
  await N('It’s a really good kiss. Halfway through, you open your eyes. It’s Aidan. You are kissing Aidan on the roof of the Fair City Mall carpark.');
  await say('jade','(as Aidan) Sorry. Reflex. I panic and turn into the last face I saw at school.','smirk');
  fxState.romance=0;pose('you',null);pose('jade',null);A.jade.k=K.jade;
  await say('jade','Same time next Saturday? I’ll try to stay Jade.','love');
  await complete('wk_jade','kissed');return;
 }
 if(c===1){
  await walk('you',-16,140);
  await N('Six floors of ramp. The guard at the barrier smiles at you. It’s Jade. The 43’s driver smiles at you. It’s Jade. Your mom opens the door. Your mom smiles.');
  await N('Your mom says, “Hi. Did you have a nice time?” Your mom has never once asked if you had a nice time.');
  await complete('wk_jade','ran');return;
 }
 const ok=await mash('Fight!',{need:22,time:5,info:'She keeps turning into people you can’t hit. MASH!'});
 if(!ok){A.jade.k=K.you;await N('She turns into you. Then she does it better. The last thing you see is your own face, looking down at you, disappointed.');SFX.squelch();blood(A.you.x,A.you.y-24,50,null,90,A.you.y+2);await die('shapeshifter');return}
 SFX.punch();shake(1.2);A.jade.k=K.cheeks;SFX.thud();
 await N('You land one good punch. In panic she turns into Cheeks from the food court movie, falls over, and rolls down the ramp like a dropped bowling ball.');
 await N('At the bottom she becomes a pigeon, then forty pigeons, and flies off over the Hollister. One of the pigeons looks back at you, sadly.');
 await complete('wk_jade','fought');
}});

/* ---------------- 2. MARCUS’S HOUSE PARTY ---------------- */
weekend({id:'party',name:'Marcus’s House Party',icon:'🎉',room:'party',who:['marcus','omer','jacob','paul','kayden'],
 text:'parents in cabo. party at mine. bring nothing. bring everything',who_:'marcus',
 blurb:'Marcus’s parents are in Cabo. Marcus has invited everyone. Marcus has also invited people he’s never met.',
 variants:{party:'Survived the party'},run:async()=>{
 const ids=['marcus','omer','jacob','paul','kayden','stella','sean','hasan','arjun'].filter(n=>!D.dead[n]);
 const cast={you:[30,1,{y:156}]};ids.forEach((n,i)=>cast[n]=[60+i*28,i%2?-1:1,{y:140+(i%3)*6,pose:i%3===0?'cheer':null}]);
 scene('party',cast,true);cue('arcade');
 await N('Marcus’s house. Every light on. Karaoke on. Dish soap in the hot tub, and the foam coming in the back door like a slow white wave.');
 await say('marcus','Welcome to my home. Touch nothing. Touch everything. I genuinely don’t care, my parents are in Cabo and I think they’ve left me.','smirk');
 for(let r=0;r<3;r++){
  const c=await choose(['Karaoke.','The kitchen.','The hot tub.'],'What now? ('+(r+1)+' of 3)');
  if(c===0){if(A.sean&&A.stella){pose('sean','sing');pose('stella','sing');await N('Sean and Stella do a duet of a song about a breakup, staring into each other’s eyes, completely missing the point of the song.');pose('sean',null);pose('stella',null)}else await N('You do karaoke alone. Nobody claps. Somebody throws a shoe. It’s a good throw.')}
  if(c===1){if(A.paul){pose('paul','grab');SFX.crunch();shake(1.2);await N('Paul decides he can lift the fridge. He can. He carries it outside and puts it in the hot tub. Nobody knows why. Paul doesn’t know why.');pose('paul',null)}else await N('The kitchen. There are four hundred cups and no drinks.')}
  if(c===2){if(A.jacob){await N('Jacob climbs onto the garage roof, shouts “WATCH THIS”, and backflips into the hot tub. The hot tub is two feet deep.');SFX.splat();blood(270,100,30,null,80,150);await say('jacob','(surfacing, face covered in blood) I’m FINE. I’m so fine. Is my nose on the front or the side?','happy')}else await N('The hot tub is full of strangers. One of them is a man in his forties. Nobody knows him. He seems happy.')}
 }
 if(A.kayden){await say('kayden','My cousin from Wales is here. He drove down. It’s an eleven-hour drive. He’s outside. He won’t come in. He’s just looking at the house.','smirk')}
 SFX.whistle();put('cop',-14,1,{y:150});await walk('cop',80,70);
 await N('A police officer walks in through the front door. Everyone freezes. It’s Coach, in a police uniform with a fake mustache.');
 await say('cop','Evening. Officer… Dunmore. Noise complaint. Also I need to see everyone run a lap of this house. For the complaint.','angry');
 const c=await choose(['Run the lap.','Hide in the hot tub.','“Coach?”']);
 if(c===0){await N('The whole party runs a lap of the house. Coach times it. He says it’s the best effort he’s seen all year. He leaves happy.')}
 else if(c===1){await N('You hide in the hot tub under the foam, next to the fridge and the mystery man. Nine minutes. When you come up, everybody’s gone. The fridge is still there.')}
 else{await say('cop','(peeling off the mustache) …I moonlight. Teachers don’t get paid. Tell anyone and I’ll make you do suicides till Christmas.','angry')}
 await say('marcus','(in the wreckage, at 2 a.m.) Best night of my life. My parents are going to come home and find a fridge in the hot tub and they’re going to feel SOMETHING.','happy');
 await complete('wk_party','party');
}});

/* ---------------- 3. THE RESERVOIR ---------------- */
weekend({id:'fish',name:'Fishing at the Reservoir',icon:'🎣',room:'lake',who:['hasan','hasandad','kenneth','paul'],
 text:'my dad is taking me fishing. he wants me to bring friends. he works nights so he will fall asleep. please come',who_:'hasan',
 blurb:'Hasan’s dad is taking him fishing on his one day off. He’ll be asleep within twenty minutes. Something in the reservoir is awake.',
 variants:{catfish:'The catfish'},run:async()=>{
 const cast={you:[200,1,{y:150}],hasan:[230,1,{y:148}],hasandad:[140,1,{y:146,pose:'sit'}]};if(!D.dead.kenneth)cast.kenneth=[262,-1,{y:150}];if(!D.dead.paul)cast.paul=[290,-1,{y:146}];
 scene('lake',cast,true);cue('field');
 await N('Sunday, 6 a.m. Fair City Reservoir. Hasan’s dad has set up two folding chairs and a flask of tea. He’s already asleep in one of them, holding a fishing rod.');
 await say('hasan','He works nights. This is his one day off. He wanted to spend it with me. (looking at his dad, snoring) This IS spending it with me. This counts.','happy');
 for(let i=0;i<2;i++){
  const r=await meter('Reel it in',{speed:1});
  if(i===0){await N(r?'You reel in a sneaker. There’s still a sock in it. There’s still a foot in the sock.':'You reel in a sneaker. You don’t look inside it. That’s a choice you make for your whole life.');if(r){SFX.squelch();if(A.kenneth)await say('kenneth','(throwing up into the reservoir) Who LOSES a foot? How do you lose a FOOT?','sick')}}
  else{await N(r?'You reel in a yearbook. Highgate High, 1987. The page with the seventh graders has four faces scratched out.':'You reel in a shopping cart. Someone from Fair City is going to have a bad day.');if(r)lore('photo')}
 }
 await N('Then the line goes tight. Really tight. The rod bends double. The reel starts screaming.');
 const big=await mash('SOMETHING HUGE',{need:24,time:6,info:'Hold on. MASH!'});
 const f=pprop({t:'fish',x:150,y:96});await tw(f,{y:118,x:180},400);
 await N('A catfish the size of a canoe comes up out of the water with its mouth open. It has a face like a disappointed uncle.');
 if(A.kenneth){SFX.scream();await tw(f,{x:A.kenneth.x},300);blood(A.kenneth.x,A.kenneth.y-6,30,null,80,A.kenneth.y+2);A.kenneth.hurt=3;await N('It lunges at the dock and takes Kenneth’s left shoe off. And the toes inside it. All of them.');await say('kenneth','(very calmly) It took my toes. My toes are in a fish.','shock')}
 SFX.splat();A.hasandad.pose=null;
 await N('Hasan’s dad wakes up. He looks at the fish. He looks at his son. He takes off his jacket, very calmly, and jumps into the reservoir.');
 await N('What follows takes eleven minutes and nobody will ever be able to fully describe it. There is a lot of water. Some screaming, mostly from the fish.');
 f.hide=1;await say('hasandad','(climbing back onto the dock, soaking wet, holding the catfish over his head) HASAN. LOOK. LOOK AT WHAT YOUR FATHER HAS DONE.','happy');
 await say('hasan','(crying, actually crying) THAT’S MY DAD. THAT’S MY DAD.','happy');
 if(A.paul)await say('paul','I’ve never seen anything like that. I want to be your dad when I grow up.','shock');
 bond('hasan',1);await complete('wk_fish','catfish');
}});

/* ---------------- 4. THE PREMIERE ---------------- */
weekend({id:'premiere',name:'The Premiere',icon:'🎬',room:'foodcourt',who:['cheeks','clapper'],
 text:'PREMIERE TONITE. FAIR CITY MALL. CHEEKS AND CHEEK-CLAPPER: THE MOVIE. RED CARPET (BLANKET). FREE NACHOS (WE ATE THEM)',who_:'cheeks',
 blurb:'Cheeks and Cheek-Clapper have finished their movie. The premiere is in the food court, projected onto the side of the Panda Express.',
 variants:{five:'Five stars',one:'One star'},run:async()=>{
 const cast={you:[100,1,{y:156}],cheeks:[220,-1,{y:150}],clapper:[246,-1,{y:150}]};for(const [n,x] of[['hasan',60],['arjun',130],['omer',160]])if(!D.dead[n])cast[n]=[x,-1,{y:158,pose:'sit'}];
 scene('foodcourt',cast,true);prop({t:'screen',x:160,y:70,layer:-100});cue('mall');
 await say('cheeks','Welcome. To the premiere. Of a film. That changed us. As men.','cry');
 await say('clapper','It’s three hours and forty minutes. There is no intermission. There is no plot. There is only the slap.','closed');
 await N('Three hours forty of two grown men slapping each other with their cheeks in slow motion, all over Fair City, set to classical music.');
 if(A.arjun)await say('arjun','(two hours in) I hate that I’m invested. I hate that I need to know who wins.','angry');
 await N('Final scene: Cheek-Clapper’s slap catches Cheeks with a fingernail. Blood sprays the lens. It was real. Nobody noticed on set.');
 if(A.omer)await say('omer','(wiping his face) Is this the 4D version?','shock');
 await N('The lights come up. Mr. Voss is in the back row taking notes. He gives a slow clap. Then he leaves very quickly.');
 const c=await choose(['“Five stars. A masterpiece.”','“One star. What was that.”']);
 if(c===0){await say('cheeks','(collapsing into Cheek-Clapper’s arms) Five. FIVE. We did it, brother.','cry');await say('clapper','(weeping) Sequel. We do a sequel. “Cheeks 2: Cheeks Harder.”','cry');await complete('wk_premiere','five');return}
 await say('clapper','(very quietly) One star.','angry');
 await walk('cheeks',A.you.x+14,70);await walk('clapper',A.you.x-14,70);
 for(let i=0;i<4;i++){SFX.smack();shake(.8);A.you.hurt=Math.min(3,i+1);await wait(300)}
 const ok=await mash('Get out from between the cheeks!',{need:18,time:4,info:'MASH before the cheeks close in!'});
 if(!ok){await N('The cheeks close in from both sides. Everything goes soft and dark and smells like body spray.');await die('cheeked');return}
 await N('You get out from between the cheeks and run. Behind you, Cheeks is shouting “WE’RE ARTISTS” at the closed Cinnabon.');
 await complete('wk_premiere','one');
}});

/* ---------------- 5. THE GRAND PRIX ---------------- */
weekend({id:'karts',name:'The Shopping Cart Grand Prix',icon:'🛒',room:'carpark',who:['kayden','omer','glen'],
 text:'HITTAZ VS U. CARPARK ROOF. SHOPPING CARTS. NO RULES. NO BRAKES. BRING A PUSHER',who_:'kayden',
 blurb:'Kayden and the Highgate Hittaz have challenged the crew to a shopping cart race on the roof of the carpark. Big Glen is on security. Big Glen has a taser.',
 variants:{won:'Won',lost:'Lost'},run:async()=>{
 const cast={you:[50,1,{y:150}],kayden:[50,1,{y:136}],omer:[30,1,{y:150}],glen:[300,-1,{y:150,pose:'cross'}]};
 scene('carpark',cast,true);const me=pprop({t:'cart',x:56,y:152}),him=pprop({t:'cart',x:56,y:138});cue('fight');
 await say('kayden','Three laps. First to the barrier wins. Loser has to say “the Hittaz are the best gang in Fair City” on Nivaan’s stream.','smirk');
 await say('omer','(gripping the handle of your cart) I’ll push. I’m the best pusher in the school. I don’t know how I know that.','angry');
 SFX.whistle();
 const r1=await mash('Lap 1: PUSH!',{need:18,time:4});
 await Promise.all([tw(me,{x:r1?200:150},900),tw(him,{x:r1?160:190},900),walk('you',r1?194:144,200),walk('kayden',r1?154:184,200)]);
 await say('glen','(walking towards you) OI. THAT’S PRIVATE PROPERTY. AND THOSE ARE TARGET’S CARTS.','angry');
 const r2=await meter('Lap 2: take the corner',{speed:1.2});
 if(!r2){
  await N('You take the corner too fast. The cart hits the edge of the roof. It doesn’t stop.');
  const save_=await mash('GRAB THE BARRIER',{need:16,time:3});
  if(!save_){SFX.scream();await tw(me,{y:200},500);await N('The cart goes off the roof. You go with it. Four floors. It turns out shopping carts don’t have brakes and the ground doesn’t have mercy.');await die('cart');return}
  await N('You grab the barrier. The cart goes off the roof without you. Four floors down, it lands on Big Glen’s car.');
 }
 SFX.crunch();await N('Kayden’s cart hits a speed bump and launches. He bounces off a Civic and lands face-first. He gets up. He has fewer teeth.');
 blood(A.kayden.x,A.kayden.y-20,30,null,80,A.kayden.y+2);
 await say('kayden','(spitting out a tooth) STILL HITTAZ. STILL RACING.','yell');
 await walk('glen',A.kayden.x+12,90);pose('glen','point');SFX.static();shake(.8);
 await N('Big Glen tasers Kayden. Kayden goes stiff as a plank and falls into his own cart, and Omer, out of pure instinct, pushes him over the finish line.');
 const won=r1;
 await say('omer',won?'WE WON. Wait. Did we push the wrong cart? Who won? WHO WON?':'Technically HE won. He was unconscious, but he won.','shock');
 await complete('wk_karts',won?'won':'lost');
}});
