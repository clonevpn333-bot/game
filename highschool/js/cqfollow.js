'use strict';
/* =====================================================================
   HIGHSCHOOL — CLASS QUESTS, PART TWO
   Every class secret has a second part. The next time you’re in that
   class, it comes back: what you did has consequences, and the story
   goes somewhere. Everything here happens on screen.
   ===================================================================== */
const CQF={};
const fu=(id,need,run)=>{CQF[id]={need:need||[],run}};
const T_=c=>c.t;

/* ---------------- ENGLISH ---------------- */
fu('en_pens',[],async c=>{const j=prop({t:'jar',x:A[c.t].x+14,y:A[c.t].y-16,layer:5});
 await say(c.t,'(holding up a single small tooth between two fingers) Somebody has been in Ms. Balduf’s jar, darlings.','evil');
 await walk(c.t,A.you.x+12,60);await say(c.t,'(placing it on your desk, gently) A gift. For your curiosity. Write me a sonnet about it by Friday.','smirk');
 await N('You write the sonnet. It’s the best thing you’ve ever written. You hate that it’s the best thing you’ve ever written.');j.hide=1});
fu('en_haiku',['nivaan'],async c=>{await say('nivaan','(whispering) Rematch. I trained. I wrote forty haikus last night. My mom found them. She cried.','smirk');
 await say('nivaan','(standing up) “Mom found my notebook / she cried for forty minutes / we got pizza though”','happy');
 classLaugh(800);await say(c.t,'…Darling, that’s actually lovely. Sit down before I start respecting you.','sad')});
fu('en_aidanpoem',['aidan'],async c=>{await say('aidan','(sliding a second folded square onto your desk) Part two. It’s just about you.','smirk');
 await N('One line, in his tiny perfect writing: “The one who looked back. I’m keeping you.”');
 await N('You don’t know if it’s the nicest or the scariest thing anyone has ever written about you. You put it in your pocket anyway.')});
fu('en_lyrics',['sean','stella'],async c=>{await walk('sean',160,60);await tw(A.sean,{y:124},300);pose('sean','sing');
 await N('Sean stands up, uninvited, at the front of the class, and sings it. “And then you throw my soul.” All of it. His voice cracks twice. He doesn’t stop.');
 pose('sean',null);await say('stella','(head in her hands, red to the ears) I’m going to kill him. I’m going to marry him and then I’m going to kill him.','blush');
 await say(c.t,'(dabbing her eyes) A plus. A PLUS. Get out of my sight.','cry');await tw(A.sean,{y:146},300)});
fu('en_spit',['hasan'],async c=>{await say(c.t,'(sipping, then stopping) Someone has been seasoning my tea, darlings. Today I brought two mugs.','evil');
 hold(c.t,'mug');await walk(c.t,A.hasan.x+12,60);await say(c.t,'(handing Hasan a mug) Drink, Hasan. Drink the one you bet on.','evil');
 pose('hasan','drink');SFX.slurp();await wait(500);pose('hasan',null);A.hasan.ex='hurt';await say('hasan','(very quietly) It’s just tea. Why is it just tea. Why does that feel worse.','scared');hold(c.t,null)});
fu('en_nosebleed',['corey'],async c=>{await say('corey','(whispering, a tissue stuffed up each nostril) I can’t do a FAKE nosebleed now. Everyone’s seen the REAL one. I’ve peaked.','sad');
 await say(c.t,'Corey! Read the next chapter. With the same passion as last time.','happy');
 await N('Corey reads it. Halfway through, out of pure stress, his nose goes again. It’s like he trained it. The class gives him a standing ovation.');
 blood(A.corey.x,A.corey.y-26,16,null,50,A.corey.y+2);for(const k of(c.kids||[]))if(A[k]&&!A[k].dead)A[k].pose='cheer';await wait(700);for(const k of(c.kids||[]))if(A[k])A[k].pose='sit'});
fu('en_dict',[],async c=>{await walk(c.t,A.you.x+14,60);await say(c.t,'(very quietly, not looking at you) That book is older than me, darling. And I am very, very old.','sad');
 await say(c.t,'The boy who circled that word sat where you’re sitting. He wrote beautifully. He would have been a poet.','sad');
 await N('She goes back to the front. For the rest of the lesson, she doesn’t mark anything in red.');lore('again')});
fu('en_phone',['nivaan'],async c=>{await say('nivaan','(whispering) I called her. We got the pizza. My dad’s staying at his brother’s. It’s… okay. It’s not okay. It’s okay.','sad');
 await say('nivaan','I turned the stream off for three days. Chat thought I died. Chat had a funeral. Two hundred people came.','happy')});
fu('en_stache',['aidan'],async c=>{await N('Aidan still has the mustache. He’s gone over it in Sharpie again, thicker. He has given it a curl on each end.');
 await say('aidan','(twirling one end) People look at me now. They look at the mustache. But the mustache is ON me. So they look at me.','happy');
 await say(c.t,'Aidan, darling, is that… permanent?','shock');await say('aidan','Everything’s permanent if you want it enough.','smirk')});
fu('en_bin',[],async c=>{const b=prop({t:'bin',x:A[c.t].x+26,y:A[c.t].y+2,layer:2,lit:1});SFX.fire();
 await say(c.t,'(feeding pages into the burning bin, one at a time) Today we burn the bad essays together, darlings. As a class.','happy');
 for(const k of(c.kids||[]).slice(0,2))if(A[k]&&!A[k].dead){const x0=A[k].x;await walk(k,b.x-8,70);pose(k,'reach');await wait(200);pose(k,null);await walk(k,x0,70)}
 await N('One by one, people walk up and put their own essays in the fire. When it’s your turn, she hands you back the half you saved.');
 await say(c.t,'(quietly) Keep that one. The “No” is the only true thing I’ve ever written.','sad');b.lit=0});

/* ---------------- THE TRAILER ---------------- */
fu('tr_bucket',[],async c=>{const b=prop({t:'bucket',x:250,y:118,layer:3});
 await say(c.t,'(standing over the bucket, smiling) Somebody kicked Miss’s husband’s bucket, sweeties. He’s VERY upset.','evil');
 for(let i=0;i<2;i++)prop({t:'tooth',x:246+i*6,y:118});pose(c.t,'point');
 await N('Two more teeth beside the bucket now. She looks right at you and taps her wrist, like she’s timing how long you’ll live.');pose(c.t,null)});
fu('tr_jump',[],async c=>{await say(c.t,'Miss had the trailer bolted to the ground, sweeties. Four brackets. New rule four: don’t even THINK about it.','evil');
 await say(c.t,'(very quietly) Miss can hear you thinking about it.','evil')});
fu('tr_calc',['arjun'],async c=>{await say('arjun','(whispering, terrified) I ran it again. Days until she dies. It doesn’t say ERROR anymore.','scared');
 await say('arjun','It says “−4,180”. Negative. NEGATIVE. What does a negative mean? What DOES it MEAN?','scared')});
fu('tr_dead',[],async c=>{await say(c.t,'(at the board) We’re one short again, sweeties. Somebody in this room was very good at playing dead. Who taught them that?','evil');
 await N('Nobody answers. You realize she’s looking at the empty chair. And then at you.')});
fu('tr_drawer',[],async c=>{await say(c.t,'(very sweetly) Somebody read Miss’s staff chat. Who has the bone saw, sweetie? Do YOU have the bone saw?','evil');
 await walk(c.t,A.you.x+14,60);pose(c.t,'reach');await wait(400);pose(c.t,null);await N('She checks inside your backpack. Slowly. Item by item. She finds nothing. She looks disappointed.')});
fu('tr_arm',['marcus'],async c=>{await say('marcus','(rolling up his other sleeve) I started a new list. Teachers’ first names. And what they’re scared of.','smirk');
 await say('marcus','(very quietly) Ms. Sherman’s just says “Debra — 1987”. I didn’t write that. It was already on my arm when I woke up.','scared')});
fu('tr_cat',[],async c=>{await say(c.t,'(handing you a photo) Miss printed you a copy of Mr. Biscuits. For your wall. Look at him every night, sweetie.','happy');
 const ph=prop({t:'photo',x:A.you.x+6,y:A.you.y-30,layer:30});await N('In this copy, he’s looking right at the camera. In the original, he was looking left.');ph.hide=1});
fu('tr_division',['arjun'],async c=>{await say(c.t,'(at the board, smiling) Arjun. Question nine. Without the answer key.','evil');
 await N('Arjun walks up. He stares at the board for a really long time. He writes “DETENTION” as the answer. She gives him full marks.');
 await say('arjun','(walking back, shaking) I’ve never been more scared of being right.','scared')});
fu('tr_ac',[],async c=>{const ac=prop({t:'acfall',x:250,y:118,layer:3});await N('The AC unit is still on the floor where it fell. Nobody’s picked it up.');
 await say(c.t,'It’s colder this way, sweeties. Miss likes cold. Cold keeps things fresh.','happy')});
fu('tr_notes',[],async c=>{await N('You open the textbook again. There’s a new note, under Tyler’s, in fresh red pen. Ms. Sherman’s handwriting.');
 await N('“Stop reading, sweetie.”')});

/* ---------------- PE ---------------- */
fu('pe_rope',[],async c=>{prop({t:'rope',x:110,len:30,layer:-50});await N('The rope has been cut down. There’s just a short frayed end left up there, swinging a little, with no wind.');
 await say(c.t,'(not looking up) Bell’s retired. Like me. Like everybody.','sad')});
fu('pe_bricks',[],async c=>{hold(c.t,'dodge');await say(c.t,'(squeezing a dodgeball) No bricks today. Somebody complained.','angry');
 SFX.thud();await say(c.t,'(squeezing harder, frowning) …There’s still a brick in this one. I didn’t put that there.','shock');hold(c.t,null)});
fu('pe_bag',['hasan'],async c=>{await say('hasan','(holding up a brand new gym bag) My mom burned the old one. In the yard. The fire was GREEN. The neighbors called somebody.','sad');
 await say(c.t,'Good. Things like that need fire.','angry')});
fu('pe_whistle',[],async c=>{await walk(c.t,A.you.x+14,70);await say(c.t,'(handing you a kazoo) Yours now. Every time you blow it, think about what you almost did to my dad.','angry');
 await N('You keep the kazoo. You never blow it. You think about it a lot.')});
fu('pe_suplex',['paul'],async c=>{A.paul.k=Object.assign({},A.paul.k,{top:'#7a1a2a',coat:1});await N('Paul is wearing a red varsity jacket two sizes too big. According to Kenneth, he sleeps in it.');
 await say('paul','(very proud) Varsity what? Nobody told me. I don’t care. I’m varsity.','happy')});
fu('pe_pushups',['arjun'],async c=>{pose('arjun','lie');await say('arjun','(face down, counting) …Twelve. Thirteen. I’ve been training. In my room. In secret.','angry');
 await N('He gets to fourteen. Then he lies there for the rest of the lesson. But fourteen is three times more than four.');pose('arjun',null)});
fu('pe_hole',[],async c=>{prop({t:'wallhole',x:70,y:104,layer:-80});prop({t:'ballhole',x:100,y:96,layer:-79});
 await N('Someone has written names inside both holes. In the kid-shaped one: “DANNY M. 1987.” In the medicine-ball one: your name.')});
fu('pe_dunk',['kenneth'],async c=>{await say('kenneth','(pointing at his eyebrow) I drew a little net on my bandage. Because I’m a dunker. Look at it.','happy');
 await say('kenneth','(very serious) I’m a dunker now. That’s my identity. I don’t know who I was before.','happy')});
fu('pe_bars',[],async c=>{await say(c.t,'(holding a new box) Fresh protein bars. Expire in 2031. Everybody gets one. Mandatory.','angry');
 for(const k of(c.kids||[]).concat(['you']))if(A[k]&&!A[k].dead)pose(k,'hold');
 await N('Nobody eats them. Everybody holds them. Coach watches you all hold them for the whole lesson.')});
fu('pe_photo',[],async c=>{await walk(c.t,A.you.x+16,60);pose(c.t,'cheer');await wait(700);pose(c.t,null);
 await say(c.t,'(very quietly) You still haven’t told anyone. I checked. Good.','smirk');
 await say(c.t,'(louder) Laps. For keeping a secret. That’s how much I respect it.','yell')});

/* ---------------- CHEM ---------------- */
fu('ch_burner',['nivaan'],async c=>{A.nivaan.ex='shock';await say('nivaan','(eyebrows drawn back on in Sharpie, very high) I drew them back on. I look shocked at everything now. It’s a brand.','shock');
 await say('nivaan','(looking permanently surprised) Chat calls me “eyebrow king.” I have four thousand followers. I would burn them off again. I would burn off EVERYTHING.','happy')});
fu('ch_jars',[],async c=>{await walk('you',272,60);A.you.back=1;await wait(400);A.you.back=0;
 await N('The fifteenth jar is gone. In its place: a sticky note. “Not yet.” Underlined twice.');
 await say(c.t,'(right behind you again) I moved it to the good shelf. You should be honored.','happy')});
fu('ch_coffee',[],async c=>{hold(c.t,'flask');await say(c.t,'(holding out two identical beakers) Today, YOU pick which one I drink. Science is trust.','happy');
 const ch=await choose(['The left one.','The right one.']);pose(c.t,'drink');SFX.slurp();await wait(500);pose(c.t,null);hold(c.t,null);
 await N(ch?'He drinks. Nothing happens. Then his left eye turns very briefly green.':'He drinks. Nothing happens at all. He looks almost disappointed.');
 await say(c.t,'Trust! Lovely. A plus.','happy')});
fu('ch_vs',[],async c=>{await say(c.t,'(tapping the periodic table) I’ve added Vossium’s atomic mass. Forty-one. A lovely number. Do you know what else there are forty-one of, young scientist?','evil');await N('You do. Forty-one names in the DELETED folder. You don’t say it.')});
fu('ch_foam',['nivaan'],async c=>{prop({t:'foam',x:160,y:20,r:10,layer:-200});
 await N('Some of the foam never came off the ceiling. It’s gone hard, like plaster, in the shape of a wave.');
 await say('nivaan','(proudly, to chat) My art is permanent now. I’m in the building.','happy')});
fu('ch_mix',['david'],async c=>{A.david.k=Object.assign({},A.david.k,{goggles:1});await say('david','(wearing goggles from home) My mom bought me these. For science. She said “If it can blow up, protect your face. Your face is your future.”','sad');
 await say(c.t,'Wise woman. I’m adding her to the list of people I respect. It’s a short list. It’s mostly jars.','happy')});
fu('ch_rat',[],async c=>{const r=prop({t:'rat',x:286,y:118,layer:6});await walk('you',274,60);
 const id_=prop({t:'paper',x:284,y:118,layer:7});await tw(id_,{x:A.you.x+6},300);
 await N('The rat taps four times, then pushes something through the bars: a chewed, rolled-up school ID. D. MASON. 7F. 1987.');
 lore('kit')});
fu('ch_david',['david'],async c=>{await N('David’s lab report has one mistake on it. On purpose. He’s circled it himself, in red, and written next to it: “I’m allowed.”');
 await say('david','(whispering) My dad made me redo it. I redid it with the same mistake. Twice. We’re at a standoff.','smirk')});
fu('ch_mag',[],async c=>{await N('For the first ten minutes you still see a little white spot in the middle of everything. It’s shaped like a person. It goes away. Mostly.')});
fu('ch_acid',['nivaan'],async c=>{await say('nivaan','(holding up a bandaged finger) Double or nothing. Ten seconds. I’ll do it this time.','smirk');
 const ok=await mash('Cheer him on',{need:14,time:4});
 await N(ok?'He does eleven seconds. His finger is now the color of a cooked shrimp. He has never been happier.':'He does one. He screams a word you didn’t know he knew.');
 await say(c.t,'(not looking up) Mild. I keep saying.','happy')});

/* ---------------- HISTORY ---------------- */
fu('hi_cannon',[],async c=>{prop({t:'wallcrack',x:300,y:80,layer:-60});await N('The hole in the back wall is still there. You can feel the draft through it, and hear a car alarm that has never stopped.');
 await say(c.t,'(not turning round) Bertha is on probation. The hole stays. For ventilation.','smirk')});
fu('hi_sleep',['omer'],async c=>{await say('omer','(whispering) The Somme’s not done. We’re still at war. Hasan won’t look at me. I’m the Germans. I have to live with it.','sad');
 await say(c.t,'Treaty today, soldiers. Shake hands across the trench.','happy');
 if(A.hasan){face('omer','hasan');face('hasan','omer');pose('omer','grab');pose('hasan','grab')}await N('Omer and Hasan shake hands across the desks. It’s weirdly emotional. Mr. Grieve salutes.');pose('omer',null);if(A.hasan)pose('hasan',null)});
fu('hi_medals',[],async c=>{await say(c.t,'(pinning something to your hoodie) A medal. For asking. Nobody asks.','happy');
 await N('It’s old and heavy. On the back, scratched in tiny letters: “HIGHGATE 1987. FOR THE ONES WHO WAITED.”')});
fu('hi_aidanbook',['aidan'],async c=>{await say('aidan','(sliding his textbook across to you) I drew you in. Every photo. Next to me.','happy');
 await N('He has. The Moon. The Titanic. The 1987 school photo. In every one, you’re standing next to him. In the 1987 one, you’re smiling.')});
fu('hi_1987',[],async c=>{await say(c.t,'(at the timeline, going very still) Somebody has written 1987 back in. Not you. In pencil. In a child’s hand.','sad');
 await say(c.t,'…Leave it. Leave it there. Some years insist.','sad')});
fu('hi_helmet',['arjun','omer'],async c=>{prop({t:'helmetv',x:A.arjun.x,y:A.arjun.y-24,layer:30});await N('Arjun is wearing the Viking helmet. Omer has a bandage in the shape of a horn. They sit next to each other on purpose now. Nobody understands it.');
 await say('arjun','We’re blood brothers. Literally. His blood is on my helmet.','happy')});
fu('hi_france',[],async c=>{await say(c.t,'(pointing at the map) France has been annexed, troops. By a paper ball. It stays up there. Conquered by a child.','smirk')});
fu('hi_grandpa',['hasan'],async c=>{await say('hasan','(whispering) I showed my grandad a picture of Mr. Grieve. He went white. He said “He looks the same. He looks EXACTLY the same.”','scared');
 await say(c.t,'(at the board, not turning round) Tell Yusuf I said hello, Hasan. Tell him he still owes me an essay.','smirk')});
fu('hi_musket',[],async c=>{await say(c.t,'The musket is in a locked case now. The toe is in a jar next to it. I’ve labeled it “The Battle of Room 6.”','smirk');
 await say(c.t,'History is everything that happened. Even the stupid things. Especially the stupid things.','smirk')});
fu('hi_stairs',[],async c=>{await say(c.t,'(holding up a muddy, crumpled essay) This was found in the parking lot. Three streets away. It’s yours. A plus plus. I’ve framed a copy.','happy')});

/* ---------------- ICT ---------------- */
fu('it_webcam',[],async c=>{const s=prop({t:'screenmsg',x:160,y:46,s:'I CAN STILL',s2:'HEAR YOU',c:'#1a1a1a',layer:-40});
 await say(c.t,'(sweetly) HIGHGATE OS doesn’t need eyes, learner. It has ears. It has your keystrokes. It has your mother’s maiden name.','evil')});
fu('it_beat',['kayden'],async c=>{await say('kayden','(whispering) The beat got four hundred plays. The AI’s mad. It keeps deleting it. I keep putting it back. It’s a war now.','smirk');
 SFX.static();const wv=prop({t:'screenmsg',x:160,y:46,s:'~^~^~^~^~',s2:'KAYDEN BEAT',c:'#2a1a3a',layer:-40});await N('The big screen flickers to a waveform. Kayden’s beat, playing very quietly, from every speaker. Then gone.');wv.hide=1;
 await say(c.t,'(through gritted teeth) Two. Out of one hundred.','evil')});
fu('it_history',[],async c=>{const s=prop({t:'screenmsg',x:160,y:46,s:'HOW TO DELETE A',s2:'LEARNER WHO KNOWS',c:'#1a2a4a',layer:-40});
 await N('Her search history is open on the big screen again. On purpose this time. The newest search: “how to delete a learner who knows too much.”');
 await say(c.t,'(without turning round) Curiosity, learner. Lovely, isn’t it.','evil');s.hide=1});
fu('it_usb',[],async c=>{await N('The USB stick is back in your pocket. You never took it. It says something new in red marker: “THANK YOU.”');lore('chute')});
fu('it_type',['mia'],async c=>{await say('mia','(cracking her knuckles) Rematch. One hundred and forty. I’ve been practicing on my dad’s work laptop. He doesn’t know.','smirk');
 const ok=await mash('Type!',{need:30,time:5});await say('mia',ok?'…I quit typing. I’m going into the military properly. I need a WIN.':'One hundred and forty-three. Salute me.','shock')});
fu('it_rank',['arjun'],async c=>{const s=prop({t:'screenmsg',x:160,y:46,s:'#23 ARJUN',s2:'(UP ONE)',c:'#1a3a1a',layer:-40});
 await say('arjun','(very quietly, tears in his eyes) Twenty-third. I’m twenty-third. I beat Kayden. I BEAT KAYDEN.','happy');s.hide=1});
fu('it_printer',[],async c=>{await walk('you',290,60);const pp=prop({t:'paper',x:296,y:120});await tw(pp,{x:A.you.x+6,y:A.you.y-20},300);await N('The printer stops printing the photo. Every few minutes, one sheet: a 1987 seating plan. Four seats circled. One has your name.')});
fu('it_cable',[],async c=>{await say(c.t,'The blue cable has a padlock on it now, learner. And a sign. “TOUCH IT AGAIN.” Somebody drew a skull on the sign. Was that you?','evil')});
fu('it_stream',['nivaan'],async c=>{await dms('NIVAAN LIVE 🔴','1,204 watching',[['them','EYEBROW KING'],['them','is he ok now'],['them','he looks better'],['them','nivaan we love u. eat ur lunch']]);
 await say('nivaan','(quietly) I eat lunch on stream now. Just eating. Twelve hundred people watch me eat. I’ve never felt less alone.','happy')});
fu('it_deleted',[],async c=>{const s=prop({t:'screenmsg',x:160,y:46,s:'DELETED/',s2:'(EMPTY)',c:'#1a1a1a',layer:-40});
 await N('The DELETED folder is empty now. Every name, gone. Even the folder’s modified date is gone. It just says “1987”.');
 await say(c.t,'(not looking at you) There was never a folder, learner.','evil');s.hide=1});

/* ---------------- SWIMMING ---------------- */
fu('po_drain',[],async c=>{await say(c.t,'(dripping, holding a wrench) Miss has bolted the drain down, swimmers. New bolts. Nobody looks at the drain anymore.','evil')});
fu('po_cannon',['jacob'],async c=>{A.jacob.hurt=1;await say('jacob','(pointing at the stitches on his forehead) They’re shaped like a smile. Feel them. Don’t feel them.','happy');
 await say('jacob','I won. They told me I won. I don’t remember it. I remember the board. The board remembers me.','happy')});
fu('po_bleach',[],async c=>{A.you.hairC='#f0f0e8';await N('Your hair is still white. People call you “Gandalf” in the hallway now. One teacher called you “sir.”')});
fu('po_lifeguard',['kenneth'],async c=>{await say('kenneth','(at the edge of the pool) Mrs. Tarn says I have to be lifeguard today. I can’t swim. I CAN’T SWIM.','scared');
 await walk(c.t,A.you.x+12,80);pose(c.t,'grab');SFX.splat();prop({t:'splash',x:A.you.x,y:A.you.y-4});pose('you','swim');pose(c.t,null);
 await walk('kenneth',A.you.x+10,90);pose('kenneth','swim');
 await N('Mrs. Tarn pushes YOU in. Kenneth jumps in after you without thinking. He doggy-paddles over. He saves you. Badly. But he does.');pose('you',null);pose('kenneth',null);await say('kenneth','(spitting out water) I SAVED SOMEBODY. I SAVED A WHOLE PERSON.','happy')});
fu('po_chicken',['paul','omer'],async c=>{await say('paul','(showing everyone his ear) The bite’s healing into a perfect circle. I call it “the Omer.”','happy');await say('omer','(not looking) Stop showing people my teeth marks.','angry')});
fu('po_lane',[],async c=>{await say(c.t,'(handing you a stopwatch) Your turn. My lane. Beat nine minutes and eleven seconds.','evil');
 pose('you','swim');const ok=await mash('Hold your breath',{need:24,time:6});pose('you',null);
 await N(ok?'You make two minutes. You come up seeing every color at once. Mrs. Tarn writes something down. She looks impressed. She looks hungry.':'Forty seconds. You come up choking. She pats your head like a dog.')});
fu('po_float',['kenneth'],async c=>{pose('kenneth','swim');await N('Kenneth swims a full length, face out of the water like a dog in a lake. When he touches the wall, the whole class cheers.');
 pose('kenneth',null);await say('kenneth','(gripping the wall, crying a bit) I’m going to show my dad. I’m going to make him come and watch.','happy')});
fu('po_board',[],async c=>{await say(c.t,'(not looking at you) The high board’s gone, swimmer. Taken down. Just the ladder left. Going up to nothing.','evil')});
fu('po_red',[],async c=>{await say(c.t,'(pouring something in the pool from a brown bottle) New chemical, swimmers. It turns the water red around anyone who LIES.','evil');
 prop({t:'redwater',x:A.you.x,y:A.you.y+1,r:10,layer:-1});await N('The water around you goes very slightly pink. You haven’t said anything. Mrs. Tarn smiles.')});
fu('po_goggles',[],async c=>{if(!D.dead.darren){put('darren',334,-1,{y:146});await walk('darren',A.you.x+16,70);
 await say('darren','(holding the goggles to his chest, crying) They told me YOU found them. In the deep end. With the note still on.','cry');
 await say('darren','Hasan read the note. He said “…question mark?” and then he LAUGHED. A NICE laugh. Step thirteen.','love');await walk('darren',334,70);remove('darren')}});

/* ---------------- ASSEMBLY ---------------- */
fu('as_mic',[],async c=>{await say('adam','(at the podium, looking straight at you) Somebody used my microphone, Highgate. I want them to know: it was the most honest thing anyone has said in this hall in thirty years.','sad')});
fu('as_curtain',[],async c=>{prop({t:'paper',x:250,y:122,layer:5});await N('The curtain’s open. Nobody behind it. A library book on the stage floor, open to the last page. A little bird drawn in the margin.')});
fu('as_award',['aidan'],async c=>{prop({t:'photo',x:A.aidan.x+6,y:A.aidan.y-14,layer:30});await N('Aidan has the certificate framed. He brought the frame to assembly. He holds it on his lap the whole time, facing out, so everybody can see.');
 await say('aidan','(to you, very quietly) Nominate me again. For anything. I don’t care what.','happy')});
fu('as_pledge',['arjun'],async c=>{await say('adam','(at the podium, very calmly) Today, Arjun will lead the pledge. Alone. Into the microphone. Correctly.','evil');
 await walk('arjun',160,60);await tw(A.arjun,{y:124},300);
 await say('arjun','(into the mic, sweating) I pledge allegiance to the… to the flag… of the… mick— of the United States of—','scared');
 classLaugh(1000);await N('He gets through it. Barely. He sits down to the loudest round of applause of his life, and doesn’t understand it at all.');await tw(A.arjun,{y:150},300)});
fu('as_helium',[],async c=>{await say('adam','(in a tiny squeaky voice, over the PA, on purpose) GOOD MORNING, HIGHGATE.','happy');
 classLaugh(1400);await N('Mr. Adam has done the entire assembly on helium. It’s the first time anyone has seen him smile since September.')});
fu('as_cry',[],async c=>{await N('Mr. Adam doesn’t cry this time. He reads every name. Then he looks up: “We’re going to find out.” He’s looking at you.')});
fu('as_spot',[],async c=>{await say('marcus','(whispering) The spotlight’s been unplugged. Someone cut the cable. With something sharp. Like a cleaver.','scared')});
fu('as_chairs',[],async c=>{await say('adam','(at the podium) Every chair in this hall is now zip-tied to its neighbor. Physics is CANCELLED, Highgate.','angry')});
fu('as_tuba',[],async c=>{const t=D.dead.voss?'coach':'voss';put(t,230,-1,{y:146});
 await N(K[t].n+' is playing the tuba in the band again. Openly now. No hat. He winks at you between notes.');remove(t)});
fu('as_roof',[],async c=>{await walk('adam',A.you.x+14,60);await say('adam','(stopping by your row, very quietly) The roof door’s open after assembly. If you ever want to scream. You don’t have to say why.','sad')});

/* ---------------- running them ---------------- */
{const _cm=cqMark;cqMark=function(room,id){_cm(room,id);if(CQF[id]){P.cqF=P.cqF||{};P.cqF[id]='pending';save()}}}
{const _w=whisper;whisper=async function(c){
 const room=c&&c.room;
 if(c&&CQ[room]&&P.cqF&&!D.chat['cqf'+D.period]){
  const here=id=>A[id]&&!A[id].dead;
  const ready=CQ[room].filter(q=>P.cqF[q.id]==='pending'&&CQF[q.id].need.every(here));
  if(ready.length){D.chat['cqf'+D.period]=1;D.chat['cq'+D.period]=1;const q=ready[0];
   toast('🏫 '+q.name+' — part two');
   try{await CQF[q.id].run(c)}catch(e){if(TEST&&TEST.err)TEST.err(e)}
   P.cqF[q.id]='done';save();
  }
 }
 return _w(c);
}}
{const _twe=twoWeeksEnd;twoWeeksEnd=async function(){P.cqF={};return _twe()}}
/* the test harness runs every part two too */
for(const room in CQ)for(const q of CQ[room])if(CQF[q.id])hook({mis:'cq_'+room,period:8,room,who:'cqf',cond:()=>false,run:async()=>{const c={room,t:Object.keys(A).find(k=>K[k]&&K[k].adult),kids:Object.keys(A).filter(k=>k!=='you'&&!(K[k]&&K[k].adult)),nb:[]};if(!c.t){c.t=room==='hall'?'adam':'shermian';put(c.t,40,1,{y:146})}for(const id of CQF[q.id].need)if(!A[id]&&K[id]){put(id,120+Math.random()*120,-1,{y:146});c.kids.push(id)}return CQF[q.id].run(c)}});
