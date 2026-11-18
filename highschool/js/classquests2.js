'use strict';
/* =====================================================================
   HIGHSCHOOL — CLASS QUESTS (part 2): History, ICT, Swimming, Assembly
   + the bit that offers them during lessons.
   ===================================================================== */
{const _dp=drawProp;drawProp=function(p){const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='cannon'){R(x-14,y-10,22,7,'#2a2a2a');R(x+8,y-11,4,9,'#3a3a3a');R(x-12,y-4,8,8,'#5a3a22');R(x-11,y-3,6,6,'#7a5a3a');R(x+2,y-4,8,8,'#5a3a22');R(x+3,y-3,6,6,'#7a5a3a');return}
 if(p.t==='wallcrack'){R(x-8,y-8,16,16,'#2a2420');R(x-12,y-2,4,3,'#2a2420');R(x+8,y-6,5,2,'#2a2420');return}
 if(p.t==='helmetv'){R(x-5,y-4,10,5,'#8a8a92');R(x-7,y-7,2,5,'#e8e0c8');R(x+5,y-7,2,5,'#e8e0c8');return}
 if(p.t==='paper'){R(x-3,y-2,7,5,'#f4f0e6');R(x-2,y-1,5,1,'#9aa0b8');return}
 if(p.t==='screenmsg'){R(x-40,y-14,80,22,'#0a0a10');R(x-38,y-12,76,18,p.c||'#1a3a6a');px(p.s||'',x-36,y-10,'#e8f0ff');if(p.s2)px(p.s2,x-36,y-3,'#e8f0ff');return}
 if(p.t==='redwater'){g.globalAlpha=.45;R(x-p.r,y-2,p.r*2,4,'#c02020');R(x-p.r+3,y-4,p.r*2-6,2,'#c02020');g.globalAlpha=1;return}
 if(p.t==='splash'){const q=T-p.t0;if(q>.8)return;for(let i=0;i<10;i++){const a=i/10*Math.PI;R(x+Math.cos(a)*q*40,y-Math.sin(a)*q*40+q*q*40,2,2,'#bfe0f0')}return}
 if(p.t==='spot'){g.globalAlpha=.22;R(x-14,0,28,y,'#fff8d0');R(x-20,y-6,40,10,'#fff8d0');g.globalAlpha=1;return}
 if(p.t==='balloon'){R(x-3,y-8,7,8,'#c03060');R(x,y,1,10,'#aaa');return}
 return _dp(p)}}

/* ================= HISTORY — Mr. Grieve ================= */
cq('history',{id:'hi_cannon',name:'Decommissioned',who:'omer',hint:'(whispering) Grieve’s got a real cannon in the storeroom. He says it’s “decommissioned.” I’ve seen him clean it.',opt:'Wheel out Mr. Grieve’s cannon.',run:async c=>{
 const cn=prop({t:'cannon',x:-20,y:150,layer:4});await Promise.all([walk('you',60,60),tw(cn,{x:50},1200)]);
 await say(c.t,'(eyes lighting up) Ah. You’ve found Bertha. Stand clear, soldiers. FOR HISTORY.','happy');
 await walk(c.t,36,70);pose(c.t,'reach');SFX.crunch();shake(2);flash('#fff',.6);prop({t:'smoke',x:62,y:136});prop({t:'wallcrack',x:300,y:80,layer:-60});
 pose(c.t,null);await N('BOOM. The ball goes straight through the back wall. Through the wall behind that. You can see the parking lot. A car alarm starts.');
 await say(c.t,'(saluting the hole) Decommissioned, I said. Nobody listens.','happy');
}});
cq('history',{id:'hi_sleep',name:'War Footing',who:'arjun',hint:'(whispering) Every time somebody falls asleep, Grieve makes the whole class re-enact a battle. Somebody fall asleep. Please. I’m so bored.',opt:'Fall asleep on purpose.',run:async c=>{
 pose('you','sit');fxState.dark=.6;await wait(500);fxState.dark=0;
 await say(c.t,'(slamming a ruler on your desk) ASLEEP AT YOUR POST? BATTLE OF THE SOMME. EVERYONE. NOW.','yell');
 for(const k of(c.kids||[]))if(A[k]&&!A[k].dead){A[k].pose=null;hop(k,6,200)}
 await N('Desks get flipped into trenches. Hasan is the British. Omer is the Germans. Arjun is a horse, for some reason. The battle lasts eleven minutes.');
 const v=['omer','hasan','arjun'].find(k=>A[k]&&!A[k].dead);if(v){SFX.punch();blood(A[v].x,A[v].y-24,12,null,60,A[v].y+2);A[v].hurt=2;await say(v,'(holding his nose) Nobody said the trench was REAL desks.','hurt')}
 await say(c.t,'(misty-eyed) Beautiful. Just like I remember it.','happy');
}});
cq('history',{id:'hi_medals',name:'The Medals',who:'david',hint:'(whispering) Grieve’s medals on the wall are from three different wars. Two of them are from the same war. From different sides.',opt:'Ask Mr. Grieve about his medals.',run:async c=>{
 await say(c.t,'(touching each one) This one, I earned. This one, I took off the man who earned it. This one is from a cereal box.','happy');
 await say('you','Sir, how old are you?');
 await say(c.t,'(a long pause) Old enough to have taught your grandparents. Young enough to teach your grandchildren. Sit down.','evil');
}});
cq('history',{id:'hi_aidanbook',name:'Aidan’s Textbook',who:'hasan',need:['aidan'],hint:'(whispering) Aidan’s drawn himself into every old photo in his textbook. Every one. Even the Romans.',opt:'Look at Aidan’s textbook.',run:async c=>{
 await walk('you',A.aidan.x-10,60);
 await N('The Moon landing: Aidan, small, waving from behind the flag. The Titanic: Aidan, at a porthole. A school photo from 1987: Aidan, back row, end. That one isn’t drawn in. That one is printed.');
 await say('aidan','(not looking up) I didn’t draw that one.','smirk');lore('photo');
}});
cq('history',{id:'hi_1987',name:'The Missing Year',who:'omer',hint:'(whispering) The timeline on the wall goes 1986, then 1988. It just skips. Nobody’s ever noticed except me.',opt:'Write 1987 on the timeline.',run:async c=>{
 await walk('you',160,60);A.you.back=1;pose('you','write');await wait(500);pose('you',null);A.you.back=0;
 await N('You write it in the gap: 1987. The room goes quiet. The clock seems to stop.');
 await walk(c.t,170,60);
 await say(c.t,'(rubbing it out with his sleeve, very slowly) Some years are not taught in this room, soldier.','sad');
 await say(c.t,'(quietly, without turning round) I was here that year. I heard it from the staff room. You don’t forget the sound.','sad');
}});
cq('history',{id:'hi_helmet',name:'Horns',who:'arjun',need:['arjun','omer'],hint:'(whispering) There’s a Viking helmet in the cupboard. Real horns. I want it. I deserve it. Get it for me.',opt:'Steal the Viking helmet for Arjun.',run:async c=>{
 await walk('you',290,60);pose('you','reach');await wait(300);pose('you',null);
 const h=prop({t:'helmetv',x:A.you.x,y:A.you.y-30,layer:30});await walk('you',A.arjun.x+10,60);await tw(h,{x:A.arjun.x,y:A.arjun.y-30},300);
 await say('arjun','(wearing it) I AM ODIN. BOW TO ME, OMER.','yell');
 await walk('omer',A.arjun.x+12,90);pose('omer','headbutt');SFX.squelch();shake(1);blood(A.omer.x,A.omer.y-28,20,null,70,A.omer.y+2);A.omer.hurt=2;pose('omer',null);
 await N('Omer headbutts him, Viking-style. He forgets about the horns. The horns don’t forget about him.');
 await say('omer','(holding his forehead) Worth it. Completely worth it.','hurt');
}});
cq('history',{id:'hi_france',name:'Europe',who:'omer',hint:'(whispering) Bet you can’t hit France on the map on the first throw. Paper ball. No practice.',opt:'Throw a paper ball at France.',run:async c=>{
 const r=await meter('Aim for France',{speed:1.25,zone:.18});const pb=prop({t:'plane',x:A.you.x,y:A.you.y-22,layer:30});
 if(r){await tw(pb,{x:150,y:44},380);pb.hide=1;await say(c.t,'(not even turning round) France surrenders. A plus.','smirk')}
 else{await tw(pb,{x:A[c.t].x,y:A[c.t].y-24},380);pb.hide=1;SFX.thud();await evil(c.t);await say(c.t,'Prisoner of war. You. Corner. Hands on your head. Until the bell.','evil');await walk('you',300,60);pose('you','up')}
}});
cq('history',{id:'hi_grandpa',name:'Same Lesson',who:'hasan',need:['hasan'],hint:'(whispering) Grieve called me by my grandad’s name today. My grandad went to this school. In the seventies.',opt:'Ask Mr. Grieve about Hasan’s grandad.',run:async c=>{
 await say(c.t,'(smiling, far away) Yusuf. Sat right where you’re sitting, Hasan. Same face. Same laugh, before the joke.','happy');
 await say(c.t,'I gave him this exact lesson. 1979. Same jokes. Same date on the board. Everything in this room is the same lesson.','sad');
 await say('hasan','(very quietly, to you) …My grandad said his history teacher was old in 1979.','scared');
}});
cq('history',{id:'hi_musket',name:'The Musket',who:'omer',hint:'(whispering) Last year he let Jacob hold the musket. Jacob still has the bruise. It’s shaped like a musket.',opt:'Ask to hold the musket.',run:async c=>{
 hold('you','bat');pose('you','hold');await say(c.t,'Steady. Steady, soldier. It hasn’t been fired since—','happy');
 SFX.crunch();shake(1.4);flash('#fff',.4);prop({t:'smoke',x:A.you.x+12,y:A.you.y-22});
 const v=(c.kids||[]).find(k=>A[k]&&!A[k].dead);
 if(v){blood(A[v].x,A[v].y-4,16,null,50,A[v].y+2);A[v].hurt=2;await N('It goes off. It takes the toe off '+K[v].n+'’s sneaker. And, it turns out, the toe inside it.');prop({t:'toe',x:A[v].x+8,y:A[v].y+1,skin:K[v].skin,d:1});await say(v,'(staring at his foot) That’s mine. That was mine.','shock')}
 pose('you',null);hold('you',null);await say(c.t,'FIELD MEDIC! …We don’t have a field medic. Somebody get Pat.','yell');
}});
cq('history',{id:'hi_stairs',name:'Graded by Gravity',who:'david',hint:'(whispering) He grades essays by throwing them down the stairs. Furthest one gets an A. It’s the only fair system in this school.',opt:'Fold your essay into something aerodynamic.',run:async c=>{
 pose('you','write');await wait(400);pose('you',null);const r=await meter('Fold it perfectly',{speed:1.1});
 const pp=prop({t:'paper',x:A[c.t].x,y:A[c.t].y-24,layer:30});await tw(pp,{x:r?320:A[c.t].x+40,y:r?40:140},700);
 await say(c.t,r?'(watching it sail out of the window) …A plus. Out of the building. Nobody’s ever left the building.':'(watching it drop) D. It dropped like it was ashamed of itself.','happy');
}});

/* ================= ICT — Mrs. Byte ================= */
cq('ict',{id:'it_webcam',name:'The Light',who:'mia',hint:'(whispering) The webcam light on my monitor is on. It’s always on. Even when the computer’s off.',opt:'Tape over your webcam.',run:async c=>{
 pose('you','reach');await wait(300);pose('you',null);
 await N('You put a square of tape over the little green light. Across the room, fourteen other monitors turn, very slightly, on their stands. Towards you.');
 await say(c.t,'(without looking up) Learner. That’s tampering with a learning device. Your engagement score just went to zero.','evil');
}});
cq('ict',{id:'it_beat',name:'The Beat',who:'kayden',need:['kayden'],hint:'(whispering) I made a beat on the school computer. It goes illegally hard. I need someone to press play.',opt:'Play Kayden’s beat on the room speakers.',run:async c=>{
 SFX.static();cue('arcade',1);for(const k of(c.kids||[]))if(A[k]&&!A[k].dead){A[k].pose='cheer'}
 await N('The bass is so loud the monitors shake. Everybody is up. Even Mia. The beat is genuinely good.');
 await say(c.t,'(over the speakers, sweetly) HIGHGATE OS rates this… two out of one hundred.','happy');
 for(const k of(c.kids||[]))if(A[k])A[k].pose=null;cue('class',1);
 await say('kayden','(standing on his chair) TWO? That AI’s got no EARS. That AI listens to ELEVATOR MUSIC.','yell');
}});
cq('ict',{id:'it_history',name:'Search History',who:'arjun',hint:'(whispering) Byte forgot to log out. Her search history is RIGHT there on the big screen.',opt:'Look at Mrs. Byte’s search history.',run:async c=>{
 const s=prop({t:'screenmsg',x:160,y:46,s:'HOW TO REMOVE A CHILD',s2:'FROM A DATABASE',c:'#1a2a4a',layer:-40});
 await N('“how to remove a child from a database.” “is it illegal if nobody remembers.” “cats in tiny hats.” “cats in tiny hats 2.” “bone saw reviews.”');
 await say(c.t,'(appearing right behind you) Curiosity is engagement, learner. Too much engagement gets you… deleted.','evil');s.hide=1;
}});
cq('ict',{id:'it_usb',name:'DO NOT PLUG IN',who:'nivaan',hint:'(whispering) I found a USB stick in the parking lot. It says DO NOT PLUG IN. In red. I haven’t. Yet.',opt:'Plug the USB stick in.',run:async c=>{
 pose('you','reach');await wait(300);pose('you',null);SFX.static();
 const s=prop({t:'screenmsg',x:160,y:46,s:'WE WAITED',s2:'LIKE SHE SAID',c:'#3a0a0a',layer:-40});fxState.dark=.4;
 await N('Every screen in the room goes black, then shows the same thing in old green letters. The speakers play a sound like a boiler, very far away.');
 await say(c.t,'(pulling the plug out of the wall with both hands) Nobody saw that. HIGHGATE OS has deleted that.','scared');
 s.hide=1;fxState.dark=0;lore('chute');
}});
cq('ict',{id:'it_type',name:'120 WPM',who:'mia',need:['mia'],hint:'(whispering) Cadets taught me to type a hundred and twenty words a minute. Bet you can’t keep up.',opt:'Race Mia at typing.',run:async c=>{
 pose('you','type');pose('mia','type');
 const ok=await mash('Type!',{need:28,time:5,info:'Mia is at 120. MASH!'});
 pose('you',null);pose('mia',null);
 await say('mia',ok?'(staring at your screen) …You beat me. Nobody beats me. Who taught you? Was it the military? Tell me it was the military.':'(not even out of breath) A hundred and thirty-one. Cadets. Respect the cadets.','shock');
}});
cq('ict',{id:'it_rank',name:'The Ranking',who:'david',need:['arjun'],hint:'(whispering) The AI ranks everyone in the class. I’m first. Arjun’s last. Arjun doesn’t know yet.',opt:'Show Arjun his rank.',run:async c=>{
 const s=prop({t:'screenmsg',x:160,y:46,s:'#24 ARJUN',s2:'(LAST)',c:'#3a1a1a',layer:-40});
 await say('arjun','(very calm) Last. Last out of twenty-four. Behind KAYDEN. Kayden types with his ELBOWS.','angry');
 await walk('arjun',A.arjun.x,10);pose('arjun','throw');SFX.crunch();shake(1);
 await N('He rips the keyboard off the desk and throws it at the screen. Keys go everywhere. They rain down for a long time. Somebody finds a Q in their hair a week later.');
 pose('arjun',null);s.hide=1;
}});
cq('ict',{id:'it_printer',name:'The Printer',who:'alex',hint:'(whispering) The printer only prints one thing now. Over and over. It started on Monday.',opt:'Go and see what the printer is printing.',run:async c=>{
 await walk('you',290,60);
 for(let i=0;i<4;i++){const pp=prop({t:'paper',x:296,y:120});tw(pp,{x:300+i*4,y:150+i},300);await wait(150)}
 await N('Page after page. All the same. A school photo, old, gray. Four kids in front of a boiler room door. Their faces are scratched out with a pen. Over and over.');
}});
cq('ict',{id:'it_cable',name:'The Blue Cable',who:'kayden',hint:'(whispering) If you pull the blue cable under the front desk, the whole school’s WiFi dies. I’ve done it twice. They never find out.',opt:'Pull the blue cable.',run:async c=>{
 await walk('you',60,70);pose('you','kneel');await wait(300);pose('you',null);SFX.static();fxState.dark=.3;
 await N('Every screen goes blank. From somewhere down the corridor, a teacher screams like they’ve been stabbed. It’s just about the WiFi.');
 fxState.dark=0;await say(c.t,'(very, very calm) Whoever did that is going to be the lowest score. Forever. In every database. Everywhere.','evil');
}});
cq('ict',{id:'it_stream',name:'900 Viewers',who:'nivaan',need:['nivaan'],hint:'(whispering) My stream’s been running since break. I forgot to turn it off. Nine hundred people watched me eat a sandwich.',opt:'Read Nivaan’s chat with him.',run:async c=>{
 await dms('NIVAAN LIVE 🔴','912 watching',[['them','bro eats like a raccoon'],['them','why does he look so sad when nobody is talking to him'],['them','nivaan you ok?'],['them','we like you bro. genuinely'],['them','eat your sandwich king']]);
 await say('nivaan','(very quietly) …They like me. Chat likes me. Not the streams. Me.','cry');
}});
cq('ict',{id:'it_deleted',name:'DELETED',who:'alex',hint:'(whispering) There’s a folder on the school server called DELETED. It’s got names in it. Real names.',opt:'Open the DELETED folder.',run:async c=>{
 const s=prop({t:'screenmsg',x:160,y:46,s:'DELETED/ TYLER.M',s2:'BETHANY.C  …',c:'#1a1a1a',layer:-40});
 await N('Tyler M. Bethany C. The trumpet kid. Forty-one names. Each one has a file with a date. The newest one is from last Friday.');
 await walk(c.t,A.you.x+14,80);await say(c.t,'(very close behind you) Learners who look in the DELETED folder… go in the DELETED folder.','evil');
 s.hide=1;intel('shermianList');
}});

/* ================= SWIMMING — Mrs. Tarn ================= */
cq('pool',{id:'po_drain',name:'The Drain',who:'kenneth',hint:'(whispering) There’s a drain at the bottom of the deep end. Mrs. Tarn says don’t look at it. Don’t ever look at it.',opt:'Dive down and look at the drain.',run:async c=>{
 pose('you','swim');const ok=await mash('Hold your breath',{need:18,time:5,info:'Deeper. MASH!'});pose('you',null);
 if(!ok){SFX.gasp();await N('You come up coughing before you get there. Mrs. Tarn is standing over you. Smiling.');return}
 await N('At the bottom, in the drain grate, wedged in, something white. A sneaker. A kid’s sneaker. Old style. On the tongue, in faded marker: R. PATEL.');
 await say(c.t,'(when you come up, whispering into your ear) Told you not to look, swimmer.','evil');
}});
cq('pool',{id:'po_cannon',name:'Cannonball',who:'paul',need:['paul','jacob'],hint:'(whispering) Biggest splash. Me versus Jacob. You judge. It has to be you. Everyone else is scared of me.',opt:'Judge the cannonball contest.',run:async c=>{
 for(const k of['paul','jacob']){await tw(A[k],{z:30},250,'out');await tw(A[k],{z:0},250,'in');SFX.splat();prop({t:'splash',x:A[k].x,y:A[k].y-4})}
 SFX.crunch();blood(A.jacob.x,A.jacob.y-26,14,null,50,A.jacob.y+2);A.jacob.hurt=2;prop({t:'redwater',x:A.jacob.x,y:A.jacob.y+1,r:12,layer:-1});
 await N('Jacob clips the diving board with his head on the way down. The water around him turns pink. He comes up grinning.');
 await say('jacob','(bleeding into the pool, thumbs up) Who won? Did I win?','happy');
 await say(c.t,'OUT. EVERYONE OUT. Somebody’s leaking.','yell');
}});
cq('pool',{id:'po_bleach',name:'White Hair',who:'jacob',hint:'(whispering) Mrs. Tarn puts so much chlorine in the water that if you dunk your head for ten seconds your hair goes white. Permanent.',opt:'Dunk your head for ten seconds.',run:async c=>{
 pose('you','swim');const ok=await mash('Ten seconds under',{need:16,time:5});pose('you',null);
 if(ok){D.f.whitehair=1;A.you.hairC='#f0f0e8';await N('You come up. Everyone stares. Your hair is white. Not blond. White. Like a ghost. Like an old man ghost.');await say('jacob','(very sincere) You look like a wizard who lost his job.','happy')}
 else await N('Four seconds. Your eyes burn so badly you see colors that don’t exist.');
}});
cq('pool',{id:'po_lifeguard',name:'Lifeguard',who:'hasan',need:['kenneth'],hint:'(whispering) Mrs. Tarn makes someone be “lifeguard” every lesson. Then she “tests” them. Last week she tested Darren for twenty minutes.',opt:'Volunteer as lifeguard.',run:async c=>{
 await walk(c.t,A.kenneth.x+12,80);pose(c.t,'grab');SFX.splat();prop({t:'splash',x:A.kenneth.x,y:A.kenneth.y-4});A.kenneth.pose='swim';pose(c.t,null);
 await say(c.t,'Test! Lifeguard! Kenneth is drowning! Probably!','happy');
 const ok=await mash('Save Kenneth!',{need:20,time:5,info:'Kenneth can’t swim. MASH!'});
 if(ok){A.kenneth.pose=null;await N('You haul him out by his trunks. He coughs up what feels like half the pool onto your feet.');await say('kenneth','(lying on the tiles) …You saved me. My dad wouldn’t have. My dad’s never been in a pool.','cry')}
 else{A.kenneth.pose='lie';await N('You can’t get him. Mrs. Tarn fishes him out with the long pole, presses on his chest exactly once, very hard, and he spits up a jet of water three feet high.');await say(c.t,'Fail, lifeguard. He lives anyway. This time.','evil')}
}});
cq('pool',{id:'po_chicken',name:'Chicken Fight',who:'paul',need:['paul','omer'],hint:'(whispering) Chicken fight. Me and Jacob versus Omer and Hasan. Somebody has to referee. Somebody brave.',opt:'Referee the chicken fight.',run:async c=>{
 for(const k of['paul','omer'])if(A[k])await tw(A[k],{z:14},200);
 SFX.punch();shake(.8);await N('It gets violent within four seconds. Omer bites Paul’s ear. Paul throws Omer across two lanes. Omer comes back with a pool noodle he’s somehow made into a weapon.');
 blood(A.paul.x,A.paul.y-30,14,null,50,A.paul.y+2);for(const k of['paul','omer'])if(A[k])await tw(A[k],{z:0},200);
 await say('paul','(holding his ear, delighted) He BIT me. Nobody’s ever wanted to beat me enough to bite.','happy');
}});
cq('pool',{id:'po_lane',name:'Her Lane',who:'omer',hint:'(whispering) Mrs. Tarn’s lane is roped off. Nobody’s allowed in it. Sometimes she goes under and doesn’t come up for, like, nine minutes.',opt:'Swim into Mrs. Tarn’s lane.',run:async c=>{
 pose('you','swim');await N('You duck under the rope. The water is colder in her lane. Much colder.');
 await N('She’s at the bottom. Sitting cross-legged on the tiles, eyes open, holding her breath. Watching you. She waves, very slowly.');
 pose('you',null);await say(c.t,'(surfacing right in front of your face, not breathing hard at all) Nine minutes, eleven seconds. Want to try?','evil');
}});
cq('pool',{id:'po_float',name:'Doggy Paddle',who:'alex',need:['kenneth'],hint:'(whispering) Kenneth can’t actually swim. He’s been doing the doggy paddle for two years and calling it “a stroke.”',opt:'Teach Kenneth to swim.',run:async c=>{
 pose('kenneth','swim');const r=await meter('Hold him up at the right moment',{speed:1});
 await N(r?'He kicks. He kicks again. You let go. He swims. Five meters. Badly. But he swims.':'He sinks like a phone in a toilet. You pull him back up. He tries again. And again.');
 pose('kenneth',null);await say('kenneth','(gripping the wall, shaking) My dad was going to teach me. Every summer. He was always going to.','sad');
}});
cq('pool',{id:'po_board',name:'The High Board',who:'jacob',hint:'(whispering) The high diving board’s been closed since 1987. The ladder’s still there though. Nobody’s stopping you.',opt:'Climb the closed high board.',run:async c=>{
 await walk('you',40,60);pose('you','up');await tw(A.you,{z:60},1200);pose('you',null);
 await N('The board creaks. Then it cracks. Then you’re falling.');
 SFX.crunch();await tw(A.you,{z:0},400,'in');SFX.splat();prop({t:'splash',x:A.you.x,y:A.you.y-4});A.you.hurt=3;blood(A.you.x,A.you.y-20,20,null,60,A.you.y+2);
 await say(c.t,'(not moving) That’s why it’s closed, swimmer.','smirk');
}});
cq('pool',{id:'po_red',name:'The Red Water',who:'paul',hint:'(whispering) Mrs. Tarn says there’s a chemical in the pool that turns the water red around anyone who pees. Somebody should test it.',opt:'Find out if it’s true.',run:async c=>{
 const v=(c.kids||[]).find(k=>A[k]&&!A[k].dead);if(!v)return;
 prop({t:'redwater',x:A[v].x,y:A[v].y+1,r:14,layer:-1});SFX.gasp();
 await N('A red cloud blooms in the water around '+K[v].n+'. Everyone screams and gets out of the pool at once, like a stampede.');
 blood(A[v].x,A[v].y-26,10,null,40,A[v].y+2);
 await say(v,'(holding his nose) IT’S BLOOD. IT’S A NOSEBLEED. IT’S NOT WHAT YOU THINK. IT’S BLOOD.','yell');
 await say(c.t,'(writing something on her clipboard) Somehow that’s worse.','evil');
}});
cq('pool',{id:'po_goggles',name:'Lucky Goggles',who:'alex',hint:'(whispering) Darren left his lucky goggles at the bottom of the pool. He’s been texting the group chat about it all lesson.',opt:'Dive for Darren’s goggles.',run:async c=>{
 pose('you','swim');const ok=await mash('Dive',{need:16,time:5});pose('you',null);
 if(!ok){await N('Too deep. You come up empty-handed and seeing stars.');return}
 await N('You find them in the corner of the deep end. Prescription. Taped together on one side. A tiny piece of paper wrapped round the strap says “HASAN?”');
 D.f.dGoggles=1;if(!D.dead.darren)await N('You’ll give them back at the next break. Darren is going to cry. Darren cries at everything.');
}});

/* ================= ASSEMBLY — the Main Hall ================= */
cq('hall',{id:'as_mic',name:'Hot Mic',who:'nivaan',hint:'(whispering) Mr. Adam leaves the mic on after assembly. He talks to himself. Chat LIVES for it. Right now it’s still on.',opt:'Sneak to the mic.',run:async c=>{
 await walk('you',160,90);await tw(A.you,{y:124},400);pose('you','mic');
 const m=await choose(['“Mr. Adam has a secret crush on the lunch lady.”','“Free period for everyone, by order of the principal.”','“Tyler. If you can hear this. We’re looking.”']);
 SFX.static();
 await say('you',['(over the PA, to the whole school) Mr. Adam has a secret crush on the lunch lady.','(over the PA) Free period for everyone. By order of the principal.','(over the PA, quietly) Tyler. If you can hear this. We’re looking for you.'][m]);
 pose('you',null);
 if(m===0){await N('From the cafeteria, faintly, a ladle hits the floor.')}
 if(m===1){SFX.cheer();await N('Four hundred kids cheer through the walls. It takes the teachers twenty minutes to get everybody back.')}
 if(m===2){await N('The hall goes completely quiet. Even the teachers stop. Somewhere, down the hall, somebody starts crying.')}
 await tw(A.you,{y:156},400);
}});
cq('hall',{id:'as_curtain',name:'Behind the Curtain',who:'hasan',hint:'(whispering) There’s someone behind the stage curtain. There’s ALWAYS someone behind the stage curtain. Look at the bottom.',opt:'Look behind the stage curtain.',run:async c=>{
 await walk('you',250,80);await tw(A.you,{y:124},400);
 put('ollie',272,-1,{y:122});
 await N('Behind the curtain: a boy in an old school uniform, holding a library book. He isn’t standing on the stage. He’s standing slightly above it.');
 await say('ollie','(whispering) It’s too loud out there. I just like listening. Don’t tell.','sad');
 await N('You blink. He isn’t there. The curtain moves a little, as if someone walked past it.');
 delete A.ollie;await tw(A.you,{y:156},400);
}});
cq('hall',{id:'as_award',name:'Most Present',who:'david',need:['aidan'],hint:'(whispering) Mr. Adam is giving out awards. He lets students nominate. He has never once given an award to anyone who’s still here.',opt:'Nominate Aidan for an award.',run:async c=>{
 await say('adam','(at the podium, confused) An award for… Aidan. For… “being here.” Aidan, come up.','shock');
 await walk('aidan',160,60);await tw(A.aidan,{y:124},400);
 await say('aidan','(holding the certificate, very still) Most Present.','closed');
 await N('Nobody claps for a second. Then one person does. Then the whole hall does. It’s awkward and loud and Aidan stands there and takes all of it.');
 await say('aidan','(to you, coming back down, eyes wet) That’s the first thing anyone’s ever given me that wasn’t a punch.','cry');
}});
cq('hall',{id:'as_pledge',name:'The Pledge',who:'arjun',need:['arjun'],hint:'(whispering) I’m going to say the pledge wrong on purpose. Loud. Watch Mr. Adam’s face.',opt:'Say the pledge wrong with Arjun.',run:async c=>{
 await say('arjun','(at full volume) I PLEDGE ALLEGIANCE TO MICKTHER—','yell');await say('you','(at full volume) —AND TO THE REPUBLIC OF MICKTHERS—');
 classLaugh(1200);await say('adam','(gripping the podium) STOP. STOP. The INSPECTORS will hear about this. Somebody will DIE about this.','yell');
}});
cq('hall',{id:'as_helium',name:'Helium',who:'kenneth',hint:'(whispering) There’s a helium tank backstage for the inspection balloons. Nobody’s guarding it.',opt:'Do the announcements on helium.',run:async c=>{
 const b=prop({t:'balloon',x:220,y:130,layer:5});await walk('you',214,80);pose('you','drink');await wait(400);pose('you','mic');
 await say('you','(in a tiny squeaky voice, over the PA) GOOD MORNING, HIGHGATE. THE INSPECTORS ARE COMING. PLEASE STOP DYING.');
 SFX.cheer();classLaugh(1400);pose('you',null);
 await say('adam','(wiping tears of laughter, then tears of something else) That’s… that’s actually what I wanted to say.','cry');
}});
cq('hall',{id:'as_cry',name:'Five Minutes',who:'stella',hint:'(whispering) Mr. Adam cries at every assembly. Bet you a dollar he cries in the first five minutes.',opt:'Take Stella’s bet.',run:async c=>{
 await say('adam','(at the podium, reading) And now a moment for the students who… left us. This year. Bethany. The trumpet boy. Tyler. And… and…','sad');
 await N('He doesn’t finish the list. He folds it up very small and puts it in his pocket, and holds the podium with both hands.');
 await say('adam','(crying, quietly, into the mic) They didn’t leave. I’m sorry. They didn’t leave.','cry');
 await N('The whole hall sits very still. You don’t take the dollar.');
}});
cq('hall',{id:'as_spot',name:'The Spotlight',who:'marcus',hint:'(whispering) I can work the spotlight. I can put it on anyone. Anyone. Pick someone.',opt:'Put the spotlight on the teachers’ row.',run:async c=>{
 const t=['shermian','voss','coach'].find(k=>!D.dead[k]);if(!t)return;
 if(!A[t])put(t,290,-1,{y:140});hold(t,t==='shermian'?'cleaver':t==='voss'?'flask':'javelin');
 prop({t:'spot',x:A[t].x,y:A[t].y,layer:50});SFX.click();
 await N('The spotlight lands on '+K[t].n+'. Who is holding a '+(t==='shermian'?'meat cleaver':t==='voss'?'beaker of something steaming':'javelin')+' in the middle of an assembly. In the dark. For no reason.');
 await say(t,'(squinting into the light, smiling, not moving) …Turn it off, '+voiceOf(t).pet+'.','evil');
 hold(t,null);
}});
cq('hall',{id:'as_chairs',name:'Physics',who:'paul',hint:'(whispering) If you pull the end chair, the whole row goes down. Physics. I’ve seen it. I’ve BEEN it.',opt:'Pull the end chair of the row.',run:async c=>{
 pose('you','grab');SFX.crunch();
 const row=Object.keys(A).filter(k=>A[k]&&!A[k].dead&&k!=='you'&&!(K[k]&&K[k].adult)).slice(0,5);
 for(const k of row){A[k].pose='lie';SFX.thud();await wait(140)}shake(1.2);pose('you',null);
 if(row[0]){blood(A[row[0]].x,A[row[0]].y-6,10,null,40,A[row[0]].y+2);await say(row[0],'(from the floor, under four people) …Physics.','hurt')}
 for(const k of row)A[k].pose=null;
}});
cq('hall',{id:'as_tuba',name:'The Tuba',who:'sean',hint:'(whispering) The tuba player in the school band isn’t a student. Look at the hands. Those are adult hands.',opt:'Pull the hat off the tuba player.',run:async c=>{
 const t=D.dead.voss?'coach':'voss';put(t,230,-1,{y:146});
 await walk('you',218,80);pose('you','grab');await wait(250);pose('you',null);
 await N('It’s '+K[t].n+'. In a band uniform two sizes too small. He’s been in the band every assembly for six years. Nobody noticed.');
 await say(t,'(lowering the tuba, with great dignity) I contain multitudes. And a low B-flat.','smirk');
}});
cq('hall',{id:'as_roof',name:'The Roof',who:'alex',hint:'(whispering) The fire exit behind the stage goes up to the roof. Mr. Adam goes up there after every assembly. To scream.',opt:'Follow Mr. Adam to the roof.',run:async c=>{
 const back_={A:Object.assign({},A),room:ROOM,props:props.slice(),decals:decals.slice()};
 scene('roof',{you:[60,1,{y:156}],adam:[200,1,{y:150}]},true);
 await N('The roof. Wind. The whole of Fair City laid out under a gray sky. Mr. Adam is standing at the edge with his tie off, screaming at nothing, with his whole body.');
 await walk('you',170,50);
 await say('adam','(not turning round) You followed me. Nobody ever follows me.','sad');
 await say('adam','(sitting down on the gravel) I was going to be a marine biologist. I wanted to work with whales. Look what I work with.','cry');
 pose('you','sit');pose('adam','sit');
 await N('You sit with him for a while. Neither of you says anything. A seagull lands nearby and screams too. It helps, somehow.');
 pose('you',null);pose('adam',null);
 scene(back_.room,null,true);for(const k in back_.A)A[k]=back_.A[k];props=back_.props;decals=back_.decals;if(A.you){A.you.pose='sit'}
}});

ROOMS.roof={name:'The School Roof',music:'sad',bg(){
 skyBands(['#7a8a9a','#9aaab8','#b8c4cc'],0,80);
 for(let i=0;i<12;i++){const x=i*30-10,h=20+hsh(i)*30;R(x,80-h,24,h,'#6a7480');for(let j=0;j<3;j++)R(x+4+j*7,84-h+4,3,3,'#c8d0a0')}
 R(0,80,W,4,'#5a5a5a');R(0,84,W,96,'#7a7a74');for(let i=0;i<200;i++)R(hsh(i+30)*W,86+hsh(i+31)*94,1,1,i%2?'#6a6a64':'#8a8a84');
 R(240,96,40,30,'#a8a8b0');R(244,100,32,20,'#8a8a92');for(let i=0;i<5;i++)R(246,102+i*4,28,1,'#6a6a72');
 R(30,100,14,26,'#9a9aa0');R(28,96,18,4,'#b8b8c0');R(0,84,W,2,'#c8c8c0');
}};
if(typeof LIGHT!=='undefined')LIGHT.roof={amb:.86,tint:[60,70,90],src:[]};
/* ================= offering them ================= */
const CQ_NAMES={english:'English',trailer:'The Trailer',gym:'PE',chem:'Chemistry',history:'History',ict:'ICT',pool:'Swimming',hall:'Assembly'};
for(const room in CQ){
 const n=CQ[room].length;
 mission('cq_'+room,{name:'Class Secrets: '+CQ_NAMES[room],icon:'🏫',who:[],blurb:'Things that only happen in '+CQ_NAMES[room]+'. Listen to the people around you during the lesson. When somebody whispers something strange, follow it. '+n+' to find. They don’t all happen every day.',
  parts:['Find 1','Find 3','Find 6','Find all '+n],tips:['Go to '+CQ_NAMES[room]+'. Listen for whispers.','Keep going to '+CQ_NAMES[room]+'. Different lessons, different secrets.','Keep going. Some only show up when the right people are in class.','Almost. Keep listening.'],variants:{}});
 for(const q of CQ[room])hook({mis:'cq_'+room,period:8,room,who:'cq',cond:()=>false,run:async()=>{const c={room,t:(TEACH[D.period]&&TEACH[D.period][room])||Object.keys(A).find(k=>K[k]&&K[k].adult),kids:Object.keys(A).filter(k=>k!=='you'&&!(K[k]&&K[k].adult)),nb:[]};if(!c.t){c.t=room==='hall'?'adam':'shermian';put(c.t,40,1,{y:146})}for(const id of(q.need||[]).concat(q.who?[q.who]:[]))if(!A[id]&&K[id]){put(id,120+Math.random()*120,-1,{y:146});c.kids.push(id)}return q.run(c)}});
}
function cqDone(id){return!!(P.cq&&P.cq[id])}
function cqMark(room,id){P.cq=P.cq||{};P.cq[id]=1;save();const n=CQ[room].filter(q=>cqDone(q.id)).length,tot=CQ[room].length;
 toast('🏫 Class secret found: '+n+'/'+tot+' in '+CQ_NAMES[room]);
 const mis='cq_'+room;if(n>=tot)complete(mis);else if(n>=6)part(mis,3);else if(n>=3)part(mis,2);else part(mis,1)}
{const _w=whisper;whisper=async function(c){
 const room=c&&c.room;
 if(c&&CQ[room]&&!D.chat['cq'+D.period]&&Math.random()<(TEST?.9:.5)){
  D.chat['cq'+D.period]=1;
  /* assembly: make sure people are actually sitting in the hall */
  if(room==='hall'&&!(c.kids||[]).length){c.kids=[];['hasan','arjun','nivaan','david','stella','marcus','paul','kenneth','alex','sean','aidan'].filter(k=>!D.dead[k]&&!(k==='aidan'&&D.f.aidanDead)).slice(0,7).forEach((k,i)=>{put(k,70+i*30,i%2?-1:1,{y:150+(i%2)*6,pose:'sit'});c.kids.push(k)})}
  const here=id=>A[id]&&!A[id].dead;
  const open=CQ[room].filter(q=>!cqDone(q.id)&&here(q.who)&&(q.need||[]).every(here));
  if(open.length){
   const q=pick(open);
   face(q.who,'you');face('you',q.who);
   await say(q.who,q.hint);
   const ch=await choose([{t:q.opt,tag:'🏫'},{t:'Leave it.'}],'');
   if(ch===0){await q.run(c);cqMark(room,q.id)}
  }
 }
 return _w(c);
}}
/* a fresh two weeks resets the secrets so the next run is different */
{const _twe=twoWeeksEnd;twoWeeksEnd=async function(){P.cq={};return _twe()}}
