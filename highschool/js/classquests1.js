'use strict';
/* =====================================================================
   HIGHSCHOOL — CLASS QUESTS (part 1): English, the Trailer, PE, Chem
   A classmate drops a line in the middle of a lesson. If you bite, it
   happens. One at most per lesson, and only some lessons, so every run
   is different. Each one happens once per two weeks.
   ===================================================================== */
const CQ={};
function cq(room,o){(CQ[room]=CQ[room]||[]).push(Object.assign({room},o))}
const inClass=(c,id)=>A[id]&&!A[id].dead&&(c.kids||[]).concat(c.t?[c.t]:[]).includes(id)||(A[id]&&!A[id].dead&&id===c.t);
{const _dp=drawProp;drawProp=function(p){const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='bin'){R(x-6,y-12,12,12,'#5a5a62');R(x-7,y-13,14,2,'#7a7a82');for(let i=0;i<3;i++)R(x-4+i*3,y-10,1,8,'#4a4a52');if(p.lit){for(let i=0;i<5;i++){const q=(T*2+i/5)%1;R(x-4+i*2,y-14-q*10,2,3,q<.5?'#f0a020':'#c03010')}}return}
 if(p.t==='jar'){R(x-3,y-8,7,8,'rgba(200,220,230,.7)');R(x-3,y-9,7,1,'#c8c8c8');for(let i=0;i<5;i++)R(x-2+(i%3)*2,y-6+Math.floor(i/3)*3,1,2,i===4?'#f4f0e0':'#c02020');return}
 if(p.t==='bucket'){R(x-5,y-7,10,7,'#7a8a9a');R(x-6,y-8,12,2,'#9aaaba');R(x-4,y-6,8,2,'#6a9a3a');return}
 if(p.t==='bell'){R(x,0,1,y-6,'#c8a868');R(x-3,y-6,7,5,'#d8b040');R(x-4,y-1,9,1,'#a88020');return}
 if(p.t==='ink'){g.globalAlpha=.85;for(let i=0;i<14;i++)R(x+hsh(i+p.s)*40-20,y+hsh(i+p.s+3)*20-10,2,2,'#2a3ab0');g.globalAlpha=1;return}
 if(p.t==='wallhole'){R(x-4,y-26,8,6,'#2a2420');R(x-6,y-20,12,10,'#2a2420');R(x-5,y-10,4,10,'#2a2420');R(x+1,y-10,4,10,'#2a2420');R(x-9,y-19,3,7,'#2a2420');R(x+6,y-19,3,7,'#2a2420');return}
 if(p.t==='ballhole'){R(x-5,y-5,10,10,'#2a2420');R(x-3,y-6,6,12,'#2a2420');return}
 if(p.t==='acfall'){R(x-13,y-7,26,14,'#d8d8d0');R(x-11,y-5,22,8,'#a8a8a0');for(let i=0;i<4;i++)R(x-10,y-4+i*2,20,1,'#888');return}
 if(p.t==='catblink'){if(T-p.t0<.5){R(x,y,3,1,'#5a3a2a');R(x+5,y,3,1,'#5a3a2a')}return}
 if(p.t==='foam'){const r=Math.round(p.r||6);for(let yy=-r;yy<=0;yy+=2)for(let xx=-r*2;xx<=r*2;xx+=2)if(xx*xx/4+yy*yy<r*r)R(x+xx,y+yy,2,2,(xx+yy)%4?'#f4f8f4':'#d8f0e0');return}
 if(p.t==='rat'){R(x-3,y-3,6,3,'#8a8078');R(x+3,y-3,2,2,'#8a8078');R(x+4,y-3,1,1,'#c02020');R(x-6,y-2,3,1,'#c8a0a0');return}
 if(p.t==='photo'){R(x-6,y-8,12,9,'#f4f0e6');R(x-5,y-7,10,6,'#c8a868');R(x-2,y-6,3,4,'#e8c0a0');return}
 return _dp(p)}}
/* Aidan’s mustache stays on him for the week */
{const dh=drawHead;drawHead=function(k,x,hy,d,o){dh(k,x,hy,d,o);if(k===K.aidan&&D&&D.f&&D.f.aidanStache&&!(o&&o.back)){const ex=x+d,my=hy+8;R(ex-3,my,6,1,'#1a1410');R(ex-4,my+1,2,1,'#1a1410');R(ex+2,my+1,2,1,'#1a1410')}}}

/* ================= ENGLISH — Ms. Balduf ================= */
cq('english',{id:'en_pens',name:'The Red Pen Jar',who:'david',hint:'(whispering) Balduf keeps every red pen she’s ever confiscated in that jar on her desk. Forty years of them. Some of them aren’t red from ink.',opt:'Sneak a look in the red pen jar.',run:async c=>{
 const j=prop({t:'jar',x:A[c.t].x+14,y:A[c.t].y-16,layer:5});
 await walk('you',j.x-8,70);pose('you','reach');await wait(300);pose('you',null);
 await N('Red pens. Hundreds. Under the pens, rattling at the bottom: baby teeth. A whole layer of them. Some still have a little bit of gum on.');
 face(c.t,1);await say(c.t,'(without turning round) Teeth are just pens that write in blood, darling. Put it back.','evil');
 await N('You put it back. You sit down. Your own teeth hurt for the rest of the lesson.');
}});
cq('english',{id:'en_haiku',name:'Haiku Battle',who:'nivaan',hint:'(whispering) Chat wants a haiku battle. Loser reads theirs out loud. I’ve been preparing since September.',opt:'Accept Nivaan’s haiku battle.',run:async c=>{
 const a=await choose(['“My crush looked at me / I looked away very fast / we are married now”','“Ms. Balduf’s red pen / has killed more people than war / please do not tell her”','“Nivaan’s mom called me / she said Nivaan is grounded / for streaming in class”']);
 await say('nivaan','(standing, very serious) “Chat is my real friend / chat has never said my name / chat, say my name. please.”','sad');
 classLaugh(900);
 if(a===2){await say('nivaan','THAT’S NOT A HAIKU THAT’S A HATE CRIME.','yell');await say(c.t,'It’s seventeen syllables of truth, darling. The point goes to the cruel one.','smirk')}
 else if(a===1){await evil(c.t);await say(c.t,'(reading over your shoulder) “Has killed more people than war.” …That’s an undercount, darling. Revise it.','evil');await sweet(c.t)}
 else await say(c.t,'Married? From one glance? That’s Shakespeare, darling. That’s also stalking. A minus.','happy');
}});
cq('english',{id:'en_aidanpoem',name:'Aidan’s New Poem',who:'aidan',need:['aidan'],hint:'(not whispering, not looking at you) I wrote a new poem. It’s about all of you. It’s very accurate.',opt:'Read Aidan’s poem over his shoulder.',run:async c=>{
 await walk('you',A.aidan.x-12,60);face('you',1);
 await N('His handwriting is tiny and perfect. Every line is about someone in the room.');
 const L=[];for(const k of(c.kids||[]).filter(k=>k!=='aidan'&&A[k]&&!A[k].dead).slice(0,3))L.push(K[k].n);
 await say('aidan','(reading it out, softly, to you) “'+(L[0]||'Hasan')+' laughs before the joke. '+(L[1]||'Corey')+' fixes his hair when he’s scared. '+(L[2]||'Sean')+' practices hello in the bathroom mirror. And nobody, ever, looks at the back row.”','closed');
 await N('It’s all true. Every bit. Somebody near the front quietly puts their head down on the desk.');
 await say('aidan','(folding it into a tiny square, giving it to you) Keep it. You’re the only one in it who looked.','smirk');
}});
cq('english',{id:'en_lyrics',name:'Margin Lyrics',who:'stella',need:['sean','stella'],hint:'(whispering) Sean writes song lyrics in the margins of his essays. Balduf grades them. He gets better grades for the lyrics.',opt:'Look at Sean’s essay margins.',run:async c=>{
 await walk('you',A.sean.x-12,60);
 await N('Down the margin of his essay about Of Mice and Men: “stella / stella / you throw the ball / and catch my soul / and then you throw my soul”.');
 face('sean',-1);await say('sean','(slapping his hand over it) That’s PRIVATE. That’s a ROUGH DRAFT.','shock');
 await say('stella','(reading it anyway, out loud, to the whole room) “And then you throw my soul.” Sean. SEAN.','blush');
 classLaugh(1000);await say(c.t,'Raw anguish. Plus five. Write more, darling. Suffer more.','happy');
}});
cq('english',{id:'en_spit',name:'The Tea',who:'hasan',hint:'(whispering) Twenty bucks says you can’t land a spitball in Balduf’s tea from back here.',opt:'Spitball. Balduf’s tea. Go.',run:async c=>{
 const r=await meter('Aim for the mug',{speed:1.25,zone:.2});
 const pb=prop({t:'plane',x:A.you.x,y:A.you.y-22,layer:30});await tw(pb,{x:A[c.t].x+8,y:A[c.t].y-20},360);pb.hide=1;
 if(r){SFX.splat();hold(c.t,'mug');pose(c.t,'drink');SFX.slurp();await N('Plop. Right in. She picks up the mug and drinks the whole thing in one go.');pose(c.t,null);hold(c.t,null);await say(c.t,'(smacking her lips) Mm. Notes of saliva. Who made this. Whoever made this, see me.','smirk');if(A.hasan)await say('hasan','(dying silently, sliding you a twenty under the desk)','laugh');D.money+=2;updateLoc()}
 else{const v=(c.kids||[]).find(k=>k==='corey'&&A[k])||((c.kids||[]).find(k=>A[k]&&k!=='you'));if(v){SFX.splat();A[v].ex='shock';await say(v,v==='corey'?'(touching his curls, horrified) It’s IN THE CURLS. It’s IN THE CURLS.':'(wiping their face) Why. Why would you.','shock')}}
}});
cq('english',{id:'en_nosebleed',name:'Read Aloud',who:'corey',need:['corey'],hint:'(whispering) If she picks me to read out loud I’m faking a nosebleed. I’ve practiced. I’m ready.',opt:'Volunteer Corey to read aloud.',run:async c=>{
 await say('you','Miss! Corey wants to read.');
 await say(c.t,'Corey! Chapter four. With FEELING, darling.','happy');
 await say('corey','(stands, puts his hand to his nose) Oh no. Oh no, I’ve got a—','scared');
 SFX.squelch();blood(A.corey.x,A.corey.y-26,30,null,70,A.corey.y+2);shake(.4);A.corey.bloody=1;A.corey.ex='shock';
 await N('It’s real. It’s a real one. It comes out like a tap. It goes on the book, the desk, the girl in front, the ceiling somehow.');
 await say(c.t,'(clapping slowly) THAT’S feeling. Finally. A plus, darling. Bleed on the next chapter too.','happy');
}});
cq('english',{id:'en_dict',name:'Page 217',who:'david',hint:'(whispering) The big dictionary on the shelf. Someone circled one word. Only one. Page 217.',opt:'Look up page 217 in the big dictionary.',run:async c=>{
 await walk('you',290,60);A.you.back=1;pose('you','reach');await wait(400);pose('you',null);A.you.back=0;
 await N('Page 217. One word, circled in old pencil, pressed so hard it tore the paper: “WAIT”. In the margin, in a child’s handwriting: “like she said. o.f. 13/3/87”.');
 intel('ollie');
 await N('When you turn round, Ms. Balduf is watching you. She isn’t smiling. She looks, for one second, like she might cry.');
}});
cq('english',{id:'en_phone',name:'Three Days',who:'nivaan',need:['nivaan'],hint:'(whispering) My phone’s been on silent for three days. I’m scared to look at it.',opt:'Get Nivaan to check his phone under the desk.',run:async c=>{
 pose('nivaan','phone');
 await dms('Mom','last seen 3 days ago',[['them','are you eating'],['them','your dad moved out today. i didnt want to tell you on the phone'],['them','come home after school. please. we can get the good pizza'],['them','i love you. more than chat does']]);
 await N('Nivaan looks at the screen for a long time. He doesn’t say anything to chat. He doesn’t say anything at all.');
 await walk(c.t,A.nivaan.x+14,60);
 await say(c.t,'(very quietly, not taking the phone) …Go and call her, darling. Take as long as you need. Nobody needs Chapter four today.','sad');
 await walk('nivaan',-16,60);remove('nivaan');
}});
cq('english',{id:'en_stache',name:'Sharpie',who:'hasan',need:['aidan'],hint:'(whispering) Aidan’s asleep. Face down on the desk. His face is just. Right there. And I have a Sharpie.',opt:'Draw a mustache on Aidan.',run:async c=>{
 await walk('you',A.aidan.x-10,60);pose('you','write');await wait(500);pose('you',null);D.f.aidanStache=1;
 A.aidan.ex='smirk';await say('aidan','(eyes open, not moving) I wasn’t asleep. I was waiting to see if anyone would.','smirk');
 await say('aidan','(looking at his reflection in the window) …I love it. I’m keeping it all week. Nobody touch it.','happy');
}});
cq('english',{id:'en_bin',name:'The Burn Bin',who:'stella',hint:'(whispering) Balduf puts every essay she hates in the bin by her desk. Then she sets it on fire.',opt:'Grab your essay out of Balduf’s bin.',run:async c=>{
 const b=prop({t:'bin',x:A[c.t].x+26,y:A[c.t].y+2,layer:2});
 await walk('you',b.x-6,70);pose('you','reach');
 await say(c.t,'(striking a match, not looking at you) Pull your hand out or don’t, darling. Both are lessons.','evil');
 b.lit=1;SFX.fire();
 const ok=await mash('Get your essay out!',{need:16,time:3,info:'It’s on fire. MASH!'});pose('you',null);
 if(ok){await N('You get it out. It’s half gone. The half that’s left has one word written on it in red: “No.”')}
 else{A.you.hurt=2;await N('You pull your hand back too late. Your sleeve catches. You slap it out on the desk. Your essay is ash.')}
}});

/* ================= THE TRAILER — Ms. Shermian ================= */
cq('trailer',{id:'tr_bucket',name:'The Bucket',who:'marcus',hint:'(whispering) The bucket under the AC unit. It’s never been emptied. Not once. It’s been there since the trailer.',opt:'Kick the bucket under the AC.',run:async c=>{
 const b=prop({t:'bucket',x:250,y:118,layer:3});
 await walk('you',238,70);pose('you','kick');SFX.splat();await tw(b,{x:262},160);pose('you',null);
 const tt=prop({t:'tooth',x:262,y:116});tw(tt,{x:A.you.x+6,y:A.you.y+1},500);
 await N('It tips over. Green water. Something solid rolls out across the carpet and stops by your foot. It’s a tooth. A grown-up tooth, with a gold filling.');
 await say(c.t,'(not turning round) That’s Miss’s husband’s, sweetie. Put it back in the bucket. He’s still using it.','happy');
}});
cq('trailer',{id:'tr_jump',name:'Four Inches',who:'alex',hint:'(whispering) If everyone jumps at the same time, the whole trailer moves. We measured it. Four inches.',opt:'Get the whole class to jump at once.',run:async c=>{
 await N('You hold up three fingers. Two. One.');
 for(const k of(c.kids||[]).concat(['you']))if(A[k]&&!A[k].dead){A[k].pose=null;hop(k,10,300)}
 SFX.thud();shake(1.6);await wait(400);SFX.crunch();shake(1);
 await N('The whole trailer lurches sideways. Four inches. Maybe five. Everybody grabs their desk at the same time.');
 for(const k of(c.kids||[]))if(A[k]&&!A[k].dead)A[k].pose='sit';
 await evil(c.t);await say(c.t,'(pointing at the board, which says 1. NO JUMPING) Who. Read me. Rule. One.','evil');
 await say('marcus','(very quietly) No jumping, Miss.','scared');await sweet(c.t);
}});
cq('trailer',{id:'tr_calc',name:'The Calculator',who:'dheva',need:['arjun'],hint:'(whispering) Arjun typed something on his calculator and he won’t show anyone. He keeps giggling.',opt:'Grab Arjun’s calculator.',run:async c=>{
 await walk('you',A.arjun.x-10,60);pose('you','grab');await wait(250);pose('you',null);
 await N('He’s calculated the number of days until Ms. Shermian retires. 4,180. Underneath, he’s worked out how many days until she dies. The calculator says ERROR.');
 await say('arjun','(snatching it back) It says ERROR every time. Every. Time. I’ve tried it four ways.','scared');
}});
cq('trailer',{id:'tr_dead',name:'Playing Dead',who:'alex',need:['tyler'],hint:'(whispering) Tyler hasn’t moved in twenty minutes. Is he okay? Should someone poke him?',opt:'Poke Tyler.',run:async c=>{
 await walk('you',A.tyler.x-10,60);pose('you','point');await wait(200);pose('you',null);
 await say('tyler','(not moving, lips barely moving) I’m playing dead. If I’m dead she can’t call on me. It’s been working since October.','closed');
 await say(c.t,'Tyler, sweetie. Question four.','happy');
 A.tyler.pose='lie';SFX.thud();await N('Tyler slides off his chair onto the carpet and lies there with his tongue out. It’s the most committed thing you’ve ever seen.');
 await say(c.t,'(looking at him for a long time) …Lovely. Next time, Miss will make it real.','evil');
 A.tyler.pose='sit';
}});
cq('trailer',{id:'tr_drawer',name:'The Forever Drawer',who:'corey',hint:'(whispering) Her drawer’s open a crack. There’s a phone in there that isn’t hers. It keeps lighting up.',opt:'Reach into the drawer while she writes on the board.',run:async c=>{
 await walk(c.t,60,60);A[c.t].back=1;pose(c.t,'reach');
 await walk('you',34,80);pose('you','reach');
 const ok=await mash('Reach in and out',{need:16,time:3,info:'Her back is turned. Quick. MASH!'});
 A[c.t].back=0;pose(c.t,null);
 if(ok){pose('you',null);await N('You pull out a phone. On the lock screen, sixty notifications from a group called HIGHGATE STAFF 🍎. The latest one says “who has the bone saw”.');await N('You put it back. Your hand is shaking so hard it takes two tries.')}
 else{SFX.crunch();shake(1);blood(A.you.x,A.you.y-20,20,null,60,A.you.y+2);A.you.hurt=2;pose('you','hurt');await say(c.t,'(slamming the drawer on your fingers, still looking at the board) Miss can hear fingers, sweetie.','evil');pose('you',null)}
}});
cq('trailer',{id:'tr_arm',name:'Marcus’s Arm',who:'dheva',need:['marcus'],hint:'(whispering) Marcus has been writing something on the inside of his arm all lesson. It goes up past his elbow.',opt:'Read what’s on Marcus’s arm.',run:async c=>{
 await walk('you',A.marcus.x-10,60);
 await N('It’s a list. Everybody in the class’s mom’s first name, in alphabetical order, with little stars next to some of them.');
 await say('marcus','(rolling his sleeve down) Knowledge is power. And power is knowing what to shout across a parking lot.','smirk');
 if(A.arjun)await say('arjun','(across the room) Why is my mom’s name underlined twice?','angry');
}});
cq('trailer',{id:'tr_cat',name:'Mr. Biscuits Is Watching',who:'marcus',hint:'(whispering) The cat photo on the wall. Look at it for a full minute. The eyes move. I swear on my life.',opt:'Stare at Mr. Biscuits for a full minute.',run:async c=>{
 await walk('you',56,70);A.you.back=1;
 await N('You stare. Ten seconds. Thirty. Fifty.');prop({t:'catblink',x:48,y:72,layer:999});await wait(300);
 await N('At fifty-eight seconds, the cat in the photo blinks. Slowly. Once.');
 A.you.back=0;
 await say(c.t,'(appearing right next to you) You like him. You LIKE him, sweetie.','happy');
 await say(c.t,'(pressing a gold star onto your forehead) Mr. Biscuits likes you back. That’s very rare. That might keep you alive.','happy');
 D.f.shermFav=1;
}});
cq('trailer',{id:'tr_division',name:'Long Division',who:'arjun',hint:'(whispering) Bet you a dollar she can’t do long division without the answer key. She keeps the answer key in her cardigan. Always.',opt:'Ask Ms. Shermian to do a problem without the answer key.',run:async c=>{
 await say('you','Miss, can you do question nine? Without the answer key?');
 await walk(c.t,90,60);pose(c.t,'reach');
 await N('She writes 7,482 ÷ 29 on the board. She stares at it. She stares at it for a really long time.');
 await evil(c.t);SFX.crunch();
 const ink=prop({t:'ink',x:110,y:50,s:7,layer:40});shake(.8);
 await N('She stabs the board with the marker. The marker explodes. Everybody in the front row is blue now.');
 pose(c.t,null);await say(c.t,'The answer, sweeties, is DETENTION.','evil');await sweet(c.t);
 if(A.arjun)await say('arjun','(blue, whispering) Worth a dollar. Worth ten dollars.','laugh');
}});
cq('trailer',{id:'tr_ac',name:'Rubber Band',who:'dheva',need:['corey'],hint:'(whispering) Corey took the rubber band off the AC unit to tie his hair up. The AC unit is now held up by nothing.',opt:'Tell Corey to put the rubber band back.',run:async c=>{
 await say('corey','It’s a HAIR emergency. The AC can wait.','angry');
 SFX.crunch();shake(1.4);
 const v=['marcus','alex','dheva'].find(k=>A[k]&&!A[k].dead);
 await N('Behind you, a long creak. The AC unit lets go of the wall all at once.');
 const ac=prop({t:'acfall',x:v?A[v].x:250,y:26,layer:40});await tw(ac,{y:v?A[v].y-10:140},380,'in');
 if(v){A[v].hurt=3;A[v].pose='lie';blood(A[v].x,A[v].y-20,24,null,70,A[v].y+2);await say(v,'(from under the AC unit, very calm) I’ve had worse. I’ve had worse on a Tuesday.','hurt')}
 await say('corey','(putting the rubber band back, quietly) …My bad.','sad');
}});
cq('trailer',{id:'tr_notes',name:'She Knows',who:'alex',hint:'(whispering) Someone keeps leaving notes in the textbooks. Old ones. They all say the same thing.',opt:'Flip through your textbook for the notes.',run:async c=>{
 pose('you','write');await wait(400);pose('you',null);
 await N('Page 12, in old blue pen: “she knows.” Page 30, in pencil: “don’t sit in seat 14.” Page 51: “the trailer is on top of something.”');
 await N('The last page, in fresh pen, in handwriting you recognize from the board this morning: Tyler’s. “help me.”');
 if(typeof crew==='function'){intel('shermianList')}
}});

/* ================= PE — Coach ================= */
cq('gym',{id:'pe_rope',name:'The Bell',who:'paul',hint:'(whispering) Nobody’s rung the bell at the top of the climbing rope since 1987. Coach says it’s cursed.',opt:'Climb the rope and ring the bell.',run:async c=>{
 const r=prop({t:'rope',x:110,len:118,layer:-50}),b=prop({t:'bell',x:111,y:20,layer:-49});
 await walk('you',110,70);pose('you','up');
 const ok=await mash('Climb!',{need:20,time:5,info:'Hand over hand. MASH!'});
 if(!ok){pose('you',null);SFX.thud();A.you.hurt=2;await N('You get halfway and fall flat on your back. The whole gym says “ooooh” at the same time.');return}
 await tw(A.you,{z:80},900);SFX.bell();
 fxState.dark=.5;await N('You ring it. It’s the loudest sound you’ve ever heard. The lights flicker out, then back on.');fxState.dark=0;
 await tw(A.you,{z:0},700);pose('you',null);
 await say(c.t,'(very quietly, looking up at the bell) …Last kid who rang that was in my class. I was eleven. He never came back from the showers.','sad');
 await say(c.t,'(louder, wiping his eyes) TWENTY LAPS. FOR RINGING A BELL. EVERYONE.','yell');
}});
cq('gym',{id:'pe_bricks',name:'Brick Ball',who:'arjun',hint:'(whispering) On Tuesdays Coach puts bricks in the dodgeballs. Today feels like a Tuesday.',opt:'Volunteer for dodgeball.',run:async c=>{
 pose(c.t,'throw');let hit=0;
 for(let i=0;i<3;i++){const r=await meter('Dodge!',{speed:1.2+i*.15});if(!r){hit++;SFX.thud();shake(.8);A.you.hurt=Math.min(3,hit)}else SFX.whoosh()}
 pose(c.t,null);
 const v=['kenneth','hasan','arjun'].find(k=>A[k]&&!A[k].dead);
 if(v){SFX.crunch();blood(A[v].x,A[v].y-24,18,null,70,A[v].y+2);for(let i=0;i<2;i++){const t_=prop({t:'tooth',x:A[v].x,y:A[v].y-24});tw(t_,{x:A[v].x+16+i*6,y:A[v].y+1},380)}await say(v,'(holding his mouth) It wath a BRICK. It had a BRICK in it.','hurt')}
 await say(c.t,'Dodge, duck, dip, dive and DODGE. Five D’s. You did zero. Laps.','angry');
}});
cq('gym',{id:'pe_bag',name:'The Bag',who:'marcus',need:['hasan'],hint:'(whispering) Hasan’s gym bag hasn’t been opened since September. It’s breathing. Listen.',opt:'Open Hasan’s gym bag.',run:async c=>{
 await walk('you',A.hasan.x+12,60);pose('you','kneel');await wait(300);
 prop({t:'cloud',x:A.you.x,y:A.you.y-16,r:14,layer:40});SFX.gasp();
 for(const k of(c.kids||[]).filter(k=>k!=='hasan'&&A[k]&&!A[k].dead).slice(0,2)){A[k].pose='sit';A[k].ex='hurt'}
 await N('A green smell comes out like a ghost. The two kids nearest you sit straight down on the floor without deciding to.');
 pose('you',null);await say('hasan','I FORGOT IT WAS IN THERE. I FORGOT. My mom thinks I’ve been washing it. I’ve been washing a DIFFERENT sock.','scared');
 await say(c.t,'EVERYBODY OUT. EVERYBODY ON THE FIELD. I’M CALLING SOMEBODY. I DON’T KNOW WHO YOU CALL FOR THIS.','yell');
}});
cq('gym',{id:'pe_whistle',name:'The Whistle',who:'kenneth',hint:'(whispering) Coach’s whistle was his dad’s. If anything happened to it he’d kill somebody. Like, for real.',opt:'Swap Coach’s whistle for a kazoo.',run:async c=>{
 await walk('you',A[c.t].x+10,70);pose('you','grab');await wait(200);pose('you',null);
 await walk('you',200,70);
 await N('Coach puts the kazoo to his lips and blows with his whole chest. It goes “bzzzzweeeeep.” The entire gym stops.');
 await say(c.t,'(very, very slowly turning round) …Where. Is. Dad.','evil');
 const ok=await mash('RUN',{need:20,time:4,info:'He’s coming. MASH!'});
 if(ok){await walk(c.t,A.you.x+12,120);await N('You hold the real whistle up over your head. He stops dead. Takes it. Holds it to his chest. Breathes. Everybody lives.')}
 else{SFX.punch();shake(1.2);A.you.hurt=3;pose('you','lie');await N('He catches you by the back of the shirt and throws you into the crash mats like a sack of laundry. Then he does it again, for his dad.')}
}});
cq('gym',{id:'pe_suplex',name:'Varsity',who:'paul',need:['paul'],hint:'(whispering) I can suplex anyone in this room. Anyone. Even Coach. Especially Coach.',opt:'Bet Paul he can’t suplex Coach.',run:async c=>{
 await walk('paul',A[c.t].x+10,80);pose('paul','grab');await wait(300);
 await Promise.all([tw(A[c.t],{z:30},250,'out').then(()=>tw(A[c.t],{z:0},250,'in')),tw(A[c.t],{x:A[c.t].x-16},500)]);
 SFX.crunch();shake(1.6);A[c.t].pose='lie';blood(A[c.t].x,A[c.t].y-6,14,null,50,A[c.t].y+2);pose('paul',null);
 await N('Coach lands on the back of his head. The sound echoes. Nobody breathes.');
 A[c.t].pose=null;await say(c.t,'(getting up, nose bleeding, very calm) …Good hips. Good form. Varsity. Report Monday.','smirk');
 await say('paul','(crying) I’ve never been on a team. I’ve never been ON something.','cry');
}});
cq('gym',{id:'pe_pushups',name:'A Hundred',who:'dheva',need:['arjun'],hint:'(whispering) Arjun says he can do a hundred push-ups. Arjun can do four.',opt:'Make Arjun prove it.',run:async c=>{
 pose('arjun','lie');await say('arjun','Fine. FINE. Count me. Somebody count.','angry');
 const r=await mash('Cheer him on (mash)',{need:18,time:5});
 await N(r?'He does nine. On the ninth his arms just stop, like a phone at 1%, and his face goes into the floor.':'He does four. On the fifth, he just lies down and stays there.');
 SFX.thud();await say('arjun','(face down) That was a warm-up. The real hundred is in my head. You can’t see it.','hurt');
 pose('arjun',null);
}});
cq('gym',{id:'pe_hole',name:'The Hole in the Wall',who:'hasan',hint:'(whispering) There’s a hole in the wall by the cupboard shaped exactly like a kid. Coach says it was a medicine ball.',opt:'Ask Coach about the hole in the wall.',run:async c=>{
 prop({t:'wallhole',x:70,y:104,layer:-80});
 await say(c.t,'(not looking at it) Medicine ball. 2009. Kid wasn’t paying attention.','angry');
 await say('you','It’s shaped like a person, Coach.');
 hold(c.t,'medball');pose(c.t,'throw');await wait(250);hold(c.t,null);
 const b=prop({t:'medball',x:A[c.t].x,y:118});await tw(b,{x:A.you.x+22,y:96},280,'in');b.hide=1;prop({t:'ballhole',x:A.you.x+22,y:96,layer:-79});SFX.crunch();shake(1.4);
 pose(c.t,null);await N('The medicine ball goes into the wall right next to your head. It leaves a hole. The hole is the exact shape of a medicine ball. The old hole is still the exact shape of a kid.');
 await say(c.t,'Pay attention.','angry');
}});
cq('gym',{id:'pe_dunk',name:'The Dunk',who:'corey',need:['kenneth'],hint:'(whispering) Kenneth says he can dunk. Kenneth is four foot eleven.',opt:'Give Kenneth a boost for the dunk.',run:async c=>{
 hold('kenneth','bball');await walk('kenneth',280,90);await walk('you',272,90);pose('you','up');
 await tw(A.kenneth,{z:44},300,'out');hold('kenneth',null);SFX.ding();
 await N('He DUNKS it. He actually dunks it. He hangs off the rim, screaming, until his hands slip.');
 SFX.crunch();await tw(A.kenneth,{z:0},300,'in');shake(1.2);blood(A.kenneth.x,A.kenneth.y-24,14,null,60,A.kenneth.y+2);A.kenneth.hurt=2;pose('you',null);
 await say('kenneth','(on the floor, holding the rim like a trophy, bleeding from the eyebrow) BEST DAY OF MY LIFE.','happy');
}});
cq('gym',{id:'pe_bars',name:'Protein Bars',who:'arjun',hint:'(whispering) Coach keeps protein bars in the equipment cupboard. They expired in 2009. They’re still good. Probably.',opt:'Raid the equipment cupboard for protein bars.',run:async c=>{
 await walk('you',160,70);A.you.back=1;pose('you','reach');await wait(400);pose('you',null);A.you.back=0;
 await N('You eat one. It tastes like a cardboard box that remembers being chocolate. Everybody watching you takes one too, because that’s how it works.');
 for(const k of(c.kids||[]).slice(0,3))if(A[k]&&!A[k].dead){A[k].ex='hurt';SFX.splat();await wait(250)}
 await N('A minute later they’re all bent over, one after another, like a wave going round a stadium.');
 await say(c.t,'WEAK STOMACHS. LAPS. Throw up on the move.','angry');
}});
cq('gym',{id:'pe_photo',name:'1994',who:'hasan',hint:'(whispering) There’s a framed photo in the equipment cupboard. Coach. In a cheerleading uniform. 1994.',opt:'Find Coach’s photo in the cupboard.',run:async c=>{
 await walk('you',160,70);A.you.back=1;pose('you','reach');await wait(400);A.you.back=0;pose('you','hold');
 const ph=prop({t:'photo',x:A.you.x+6,y:A.you.y-30,layer:30});
 await N('Coach, maybe nineteen, at the top of a human pyramid, pom-poms up, smiling like nothing bad has ever happened to anybody.');
 await walk(c.t,A.you.x+16,90);
 await say(c.t,'(taking it from you, looking at it for a long time) …I was happy. I was so happy, I didn’t even know.','sad');
 ph.hide=1;pose('you',null);pose(c.t,'cheer');await wait(600);pose(c.t,null);
 await say(c.t,'(putting it back) Tell anyone, and you’re running till you’re dead.','angry');
}});

/* ================= CHEM — Mr. Voss ================= */
cq('chem',{id:'ch_burner',name:'All the Way Up',who:'nivaan',need:['nivaan'],hint:'(whispering) Chat wants to see what happens if I turn the Bunsen burner all the way up. Chat is insisting.',opt:'Turn Nivaan’s Bunsen burner to max.',run:async c=>{
 const f=prop({t:'fire',x:A.nivaan.x+8,y:A.nivaan.y-6,w:8,n:10,layer:20});SFX.fire();shake(.6);
 await N('A column of fire hits the ceiling. Nivaan’s eyebrows are gone. Just gone. He looks permanently surprised now.');
 A.nivaan.ex='shock';await say('nivaan','(touching where his eyebrows were) CHAT. CHAT, LOOK AT ME. I’M A NEW PERSON.','shock');
 await say(c.t,'(applauding) SCIENCE! That’s the spirit. The fire department are on their way, so let’s look busy.','happy');f.hide=1;
}});
cq('chem',{id:'ch_jars',name:'Fifteen',who:'david',hint:'(whispering) There were fourteen jars in the back fridge. Today there are fifteen. I counted twice.',opt:'Count the jars in the back fridge.',run:async c=>{
 await walk('you',272,70);A.you.back=1;pose('you','reach');await wait(400);A.you.back=0;pose('you',null);
 await N('Fourteen jars that say AIDAN. And a new one, at the end, with the label still wet. It has your name on it. Today’s date.');
 await say(c.t,'(right behind you) Don’t worry. That’s just in case.','evil');
}});
cq('chem',{id:'ch_coffee',name:'Brisk',who:'nivaan',hint:'(whispering) Voss keeps his coffee in a beaker. The beaker next to it is the exact same color. It is not coffee.',opt:'Swap Mr. Voss’s coffee beaker.',run:async c=>{
 pose('you','reach');await wait(300);pose('you',null);
 hold(c.t,'flask');pose(c.t,'drink');SFX.slurp();await wait(600);
 await N('He drinks the whole thing. Smoke comes out of his nose. Then his ears. Then, for a second, his eyes.');
 pose(c.t,null);hold(c.t,null);await say(c.t,'(clearing his throat) Ah. Sodium hydroxide. Brisk. Who did that? That’s an A.','happy');
}});
cq('chem',{id:'ch_vs',name:'Element Vs',who:'david',hint:'(whispering) The periodic table on the wall has an extra element at the bottom. Symbol Vs. Nobody knows what it is.',opt:'Ask Mr. Voss about element Vs.',run:async c=>{
 await say(c.t,'(delighted, hand on your shoulder) Vossium! Atomic number 1987. I discovered it. Well. I MADE it.','happy');
 await say(c.t,'You make it from things you keep in jars for a very, very long time. Patience. That’s all science is. Patience, and jars.','evil');
 await N('He pats your shoulder twice and walks away. Where his hand was, your hoodie smells like formaldehyde for the rest of the day.');
}});
cq('chem',{id:'ch_foam',name:'Elephant Toothpaste',who:'nivaan',need:['nivaan'],hint:'(whispering) Elephant toothpaste. I’ve wanted to do it since sixth grade. Voss doesn’t check the hydrogen peroxide.',opt:'Make elephant toothpaste with Nivaan.',run:async c=>{
 pose('nivaan','film');const f=prop({t:'foam',x:160,y:140,r:4,layer:30});SFX.fire();
 await tw(f,{r:26},1400);
 await N('The foam comes up out of the flask like a white wave and keeps going. Over the desk. Over the floor. Up to your knees. It’s warm. Too warm.');
 await say('nivaan','(waist-deep, filming) CHAT. CHAT. 3,000 WATCHING. I’M MELTING A LITTLE BIT. 3,000!','happy');
 await say(c.t,'(wading through it, beaming) Exothermic! Isn’t it BEAUTIFUL? Don’t breathe it.','happy');
}});
cq('chem',{id:'ch_mix',name:'Blue and Clear',who:'david',hint:'(whispering) “NEVER MIX THE BLUE BOTTLE AND THE CLEAR BOTTLE.” Voss wrote it on the wall. In his own blood. Look at the color.',opt:'Mix the blue bottle and the clear bottle.',run:async c=>{
 pose('you','reach');await wait(300);
 SFX.fire();SFX.crunch();shake(2);flash('#fff',.7);prop({t:'smoke',x:A.you.x,y:A.you.y-20});
 A.you.hurt=3;A.you.bloody=1;pose('you','hurt');
 if(A.david)A.david.pose='cover';
 await N('White. Then a ringing. When you can see again, your eyebrows are gone and David is crouched with his arms over his head.');
 pose('you',null);await say(c.t,'(not even a little upset) Now you understand. Now you’re a scientist.','happy');
}});
cq('chem',{id:'ch_rat',name:'The Rat',who:'nivaan',hint:'(whispering) There’s a rat in a cage by the sink. It’s been alive since 1987. Voss feeds it things.',opt:'Feed the rat.',run:async c=>{
 const r=prop({t:'rat',x:286,y:118,layer:6});await walk('you',274,70);pose('you','reach');await wait(300);pose('you',null);
 await N('You push a pencil through the bars. The rat takes it in both hands and eats the whole thing, eraser first, staring at you. Its eyes are completely white. It’s very, very old.');
 await N('When it’s done, it lies down, faces the wall, and taps on the bars. Four taps. Pause. Four taps. Like it’s counting something.');
}});
cq('chem',{id:'ch_david',name:'Perfect',who:'nivaan',need:['david'],hint:'(whispering) David’s lab reports are perfect. Too perfect. I think he’s a robot. Pinch him.',opt:'Pinch David to see if he’s a robot.',run:async c=>{
 await walk('you',A.david.x-10,60);pose('you','grab');await wait(200);pose('you',null);
 await say('david','OW. Why would you— I’m not a ROBOT.','shock');
 await say('david','(quieter) I do them at 4 a.m. My dad checks them before he goes to work. If there’s one mistake he makes me do the whole thing again. So there’s never one mistake.','sad');
 await N('He goes back to his report. His hand is shaking a little. The report is perfect.');
}});
cq('chem',{id:'ch_mag',name:'Magnesium',who:'david',hint:'(whispering) Voss is burning magnesium today. It’s so bright it can blind you. He lets you look anyway.',opt:'Look straight at the burning magnesium.',run:async c=>{
 SFX.fire();flash('#fff',1);fxState.tint='#fff';fxState.tintA=.8;
 await N('It’s like looking at the inside of the sun. Everything goes white and stays white.');
 await tw(fxState,{tintA:0},2600);fxState.tint=null;
 await say(c.t,'(very softly, next to you) Pretty, isn’t it? It’s the last thing a lot of people see.','evil');
}});
cq('chem',{id:'ch_acid',name:'Five Seconds',who:'nivaan',need:['nivaan'],hint:'(whispering) Five bucks says you can’t keep your finger in the “mild” acid for five seconds. Voss says it’s mild. Voss lies.',opt:'Take Nivaan’s bet.',run:async c=>{
 prop({t:'flask',x:A.you.x+8,y:A.you.y-14,layer:30});pose('you','reach');
 const ok=await mash('Keep it in! Five seconds!',{need:20,time:5,info:'It burns. It REALLY burns. MASH!'});
 pose('you',null);
 if(ok){SFX.squelch();blood(A.you.x+4,A.you.y-18,10,null,40,A.you.y+2);A.you.hurt=2;await N('Five seconds. Your finger comes out pink and shiny and smoking slightly, like a sausage. Nivaan pays up.');D.money+=5;updateLoc()}
 else await N('Two seconds. You rip it out and stick it in your mouth, which is the worst possible thing you could have done.');
 await say(c.t,'(not looking up) Told you it was mild.','happy');
}});
