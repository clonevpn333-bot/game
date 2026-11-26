'use strict';
/* =====================================================================
   HIGHSCHOOL — missions D: Mr. Adam losing it, insane lessons,
   Food Tech, Drama, Fair City Mall
   ===================================================================== */
Object.assign(K,{
 adam:{n:'Mr. Adam',col:'#5a6a9a',skin:'#e8c4a8',hair:'#6a5040',hs:'receding',top:'#33405e',pants:'#262d40',tie:1,adult:1,adam:1,seed:38,v:238},
 kettle:{n:'Mrs. Kettle',col:'#c87a3a',skin:'#efcfb4',hair:'#b8b0a8',hs:'bun',top:'#d88a4a',pants:'#4a3a3a',skirt:1,apron:1,adult:1,girl:1,wide:1,seed:39,v:330,vw:'triangle'},
 pratt:{n:'Mr. Pratt',col:'#8a3a9a',skin:'#e8c0a0',hair:'#3a2418',hs:'manbun',beard:1,top:'#5a2a6a',pants:'#1a1a1a',scarf:1,adult:1,thin:1,seed:40,v:272},
 glen:{n:'Big Glen',col:'#4a4a5a',skin:'#d0a080',hair:'#2a2020',hs:'buzz',top:'#2a2a3a',pants:'#1a1a22',hivis:1,adult:1,wide:1,seed:45,v:165},
 omermum:{n:'Omer’s Mom',col:'#a86a8a',skin:'#e0b088',hair:'#3a2418',hs:'long',top:'#c86a8a',pants:'#3a3a54',adult:1,girl:1,seed:46,v:420,vw:'triangle'},
 tez:{n:'Tez',col:'#7a7a3a',skin:'#d8a878',hair:'#2a1e16',hs:'short',tache:1,top:'#4a4a3a',pants:'#2a2a30',h:7,wide:1,seed:47,v:188},
 mia:{n:'Mia',col:'#3a8a7a',skin:'#c89068',hair:'#1a1412',hs:'ponytail',top:'#4a5a3a',pants:'#2a2f2a',girl:1,seed:48,v:440,vw:'triangle'},
 ollie:{n:'Ollie',col:'#8a9aba',skin:'#e8e4e0',hair:'#8a6a4a',hs:'side',top:'#5a6a8a',pants:'#4a4a5a',ghost:1,h:-3,tie:1,seed:49,v:525,vw:'sine'},
 kayden:{n:'Kayden',col:'#c8c8c8',skin:'#f0c8a0',hair:'#d8b060',hs:'buzz',top:'#1a1a1a',pants:'#2a2a3a',puffer:1,wide:1,chain:1,h:-5,seed:50,v:470},
 brandon:{n:'Brandon',col:'#7a8a5a',skin:'#f0c8a8',hair:'#c86a3a',hs:'short',top:'#5a6a7a',pants:'#2a2a33',seed:51,v:380}
});
FRIENDS.push('tez','mia','ollie','kayden');TEACHERS.push('adam','kettle','pratt','glen');
function adamLvl(){if(typeof D==='undefined'||!D)return 0;if(D.period>=8)return D.done.headcase?8:7;return D.period}

/* ---------- new places ---------- */
Object.assign(SCORES,{
 mall:{beat:.5,root:[45,50,43,48],mode:[[0,7,16],[0,7,15],[0,7,16],[0,7,16]],lead:[76,-1,79,-1,81,79,-1,76,74,-1,76,-1,72,-1,-1,-1],drums:2},
 arcade:{beat:.3,root:[40,40,43,38],mode:[[0,7,15],[0,7,15],[0,7,16],[0,7,15]],lead:[76,79,83,79,76,-1,74,-1,76,79,84,-1,83,79,76,-1],drums:3},
 sunset:{beat:.8,root:[41,38,43,36],mode:[[0,7,16],[0,7,15],[0,7,16],[0,7,16]],lead:[72,-1,-1,74,-1,-1,77,-1,-1,76,-1,-1,72,-1,-1,-1],soft:1},
 madness:{beat:.36,root:[38,44,37,43],mode:[[0,6,13],[0,6,15],[0,7,13],[0,6,14]],lead:[74,75,-1,80,74,-1,73,79,-1,74,-1,68,69,-1,62,63],drums:3}
});
function neon(x,y,s,c){const on=Math.sin(T*7+x)>-.85;if(on){g.globalAlpha=.25;R(x-3,y-2,pxw(s)+6,9,c);g.globalAlpha=1}px(s,x,y,on?'#fff':c)}
Object.assign(ROOMS,{
 foodtech:{name:'Food Tech — Mrs. Kettle',music:'class',bg(){
  wall('#e8d890','#a89850');lights(3);for(let i=0;i<W;i+=12)R(i,60,1,46,'rgba(0,0,0,.06)');for(let j=60;j<106;j+=12)R(0,j,W,1,'rgba(0,0,0,.06)');
  R(12,22,60,30,'#f4f0e6');pxc('STAR BAKER',42,26,'#c03030');pxc('WORST BAKER',42,36,'#3a3a3a');pxc('= OVEN',42,44,'#c03030');
  poster(86,22,40,26,'#4a7ab0',['WASH','HANDS'],'#fff');poster(132,22,40,26,'#c86a3a',['NO','CRYING'],'#fff');
  for(let i=0;i<9;i++){R(184+i*7,24,2,10,'#888');R(183+i*7,34,4,6,['#c8c8c8','#5a3a2a','#c8c8c8','#c8c8c8','#3a3a3a'][i%5])}pxc('KNIVES (COUNT THEM)',214,44,'#5a4a2a');
  R(240,56,74,56,'#7a7a82');R(244,60,66,40,'#2a2020');const gl=.6+Math.sin(T*4)*.15;g.globalAlpha=gl;R(246,62,62,36,'#f08a30');g.globalAlpha=1;R(244,60,66,2,'#9a9aa2');pxc('INDUSTRIAL',277,102,'#e8e8e8');R(300,70,6,14,'#c8c8c8');
  for(let i=0;i<3;i++){R(20+i*70,70,56,36,'#c8c8d0');R(22+i*70,72,52,6,'#3a3a3a');R(28+i*70,73,8,3,'#5a5a5a');R(48+i*70,73,8,3,'#5a5a5a');R(30+i*70,84,36,16,'#2a2a30')}
  tiles('#d8d0b8','#c8c0a8',16);
 },items:(()=>{const its=[];for(const [y] of [[138],[160]])for(const x of[90,190]){its.push({y:y+.5,d:()=>{R(x-34,y-13,68,3,'#8a8a90');R(x-34,y-10,68,10,'#d8d8e0');R(x-34,y-10,68,1,'#f0f0f4');R(x-20,y-16,8,3,'#c8c8c8');R(x+10,y-17,6,4,'#e8c890')}})}return its})()},
 drama:{name:'Drama Studio — Mr. Pratt',music:'tension',bg(){
  R(0,0,W,112,'#141018');R(0,0,W,6,'#0a080c');
  R(10,12,300,4,'#3a3a40');for(let i=0;i<6;i++){const x=30+i*52;R(x,16,8,8,'#2a2a2a');if(!(typeof D!=='undefined'&&D&&D.f.rigDown&&i===3)){g.globalAlpha=.08;R(x-20,24,48,88,'#fff2c0');g.globalAlpha=1;R(x+1,22,6,2,'#fff6c0')}}
  R(40,74,240,38,'#2a1e18');R(40,74,240,3,'#5a4030');for(let i=0;i<240;i+=20)R(40+i,77,1,35,'rgba(0,0,0,.3)');
  for(const cx of[0,280]){for(let i=0;i<40;i+=5){R(cx+i,6,4,106,'#7a1424');R(cx+i+1,6,1,106,'#9a2a3a')}}
  R(136,30,22,24,'#e8e4d8');R(140,36,4,4,'#141018');R(150,36,4,4,'#141018');R(142,46,10,2,'#141018');R(162,30,22,24,'#e8e4d8');R(166,36,4,4,'#141018');R(176,36,4,4,'#141018');R(168,48,10,2,'#141018');R(166,46,2,2,'#141018');R(176,46,2,2,'#141018');
  pxc('MACBETH',160,60,'#c8a050');pxc('(REAL DAGGERS)',160,67,'#a02020');
  R(0,112,W,68,'#1a161e');for(let i=0;i<8;i++)R(30+i*36,140+(i%2)*14,10,1,'#e8d040');
 }},
 foodcourt:{name:'Fair City Mall — Food Court',music:'mall',bg(){
  R(0,0,W,112,'#3a3450');for(let i=0;i<W;i+=40){R(i,0,2,40,'#2a2440');}R(60,0,200,14,'#5a5a8a');R(64,2,192,10,'#f0b880');for(let i=0;i<192;i+=24)R(64+i,2,2,10,'#3a3450');
  R(80,18,160,12,'#1a1a2a');pxc('FAIR CITY MALL',160,21,'#f0d070');
  const shop=(x,w,c,name)=>{R(x,36,w,70,'#2a2838');R(x+2,48,w-4,58,'#6a8aa0');R(x+2,48,w-4,58,'rgba(255,240,200,.15)');R(x,36,w,12,c);neon(x+w/2-pxw(name)/2,39,name,c)};
  shop(6,74,'#c03030','BURGER BARN');shop(84,70,'#e0a030','NOODLE BOX');shop(240,74,'#7a4ab0','BUBBLE T');
  R(160,40,76,72,'#4a4a5a');for(let i=0;i<9;i++){R(166+i*7,104-i*7,26,2,'#8a8a9a');}R(164,40,4,70,'#6a6a7a');pxc('UP',196,44,'#fff');
  R(0,112,W,68,'#c8c0b0');for(let i=0;i<W;i+=24)for(let j=0;j<4;j++)if((i/24+j)%2)R(i,112+j*17,24,17,'#b8b0a0');
  R(120,124,80,12,'#7a8aa8');R(122,122,76,4,'#9ab8d8');for(let i=0;i<5;i++){const q=(T*1.5+i*.2)%1;R(156+i*2,110+q*12,1,3,'rgba(200,230,255,.8)')}R(158,104,4,18,'#9a9aaa');
 },items:[{y:160,d:()=>{for(const x of[50,270]){R(x-22,146,44,3,'#e8e0d0');R(x-1,149,2,12,'#888');R(x-8,160,16,1,'#666')}}}]},
 arcade:{name:'Fair City Mall — Arcade',music:'arcade',bg(){
  R(0,0,W,112,'#140c22');for(let i=0;i<W;i+=6)R(i,0,1,112,'rgba(255,255,255,.02)');
  neon(120,10,'GAME ZONE','#ff3ab0');
  for(let i=0;i<6;i++){const x=8+i*36;R(x,40,30,72,['#2a2a8a','#8a2a2a','#2a7a2a','#7a2a8a','#2a6a8a','#8a6a2a'][i]);R(x+3,46,24,20,'#05050a');const fl=Math.sin(T*9+i*2)>0;R(x+5,48,20,16,fl?['#3a8aff','#ff5a3a','#5aff7a','#ff5aff','#5affff','#ffd03a'][i]:'#101020');R(x+6,72,4,4,'#e03030');R(x+14,73,3,3,'#3060e0');R(x+20,73,3,3,'#e0d030')}
  R(226,30,40,82,'#3a1a5a');R(230,34,32,40,'rgba(180,220,255,.25)');R(240,36,2,14,'#aaa');R(236,50,10,3,'#ccc');for(let i=0;i<6;i++)R(232+i*5,66,4,6,['#ff6a8a','#ffd03a','#6aff8a','#6ab0ff'][i%4]);pxc('CLAW',246,78,'#fff');
  R(272,22,42,90,'#1a1a1a');R(280,30,26,18,'#fff');R(286,48,14,2,'#e0502a');pxc('HOOPS',293,60,'#ff8a3a');
  R(0,112,W,68,'#2a1a3a');for(let i=0;i<W;i+=16)for(let j=0;j<5;j++){if((i+j*7)%3===0)R(i+4,116+j*13,3,3,['#ff3ab0','#3affff','#ffd03a'][(i+j)%3])}
 }},
 carpark:{name:'Fair City Mall — Rooftop Parking',music:'sunset',bg(){
  for(let i=0;i<112;i++)R(0,i,W,1,i<40?'#3a2a5a':i<70?'#a8506a':'#f0905a');
  R(240,70,26,26,'#ffd08a');R(236,82,34,6,'#f0905a');
  for(let i=0;i<14;i++){const h=20+hsh(i)*40;R(i*24,112-h,20,h,'#2a2038');for(let j=0;j<h-6;j+=6)if(hsh(i*7+j)>.5)R(i*24+4+(j%3)*5,112-h+3+j,2,2,'#ffe08a')}
  neon(20,86,'FAIR CITY','#ff8a3a');
  R(0,104,W,8,'#5a5a62');for(let i=0;i<W;i+=10)R(i,96,2,10,'#8a8a92');R(0,96,W,2,'#9a9aa2');
  R(0,112,W,68,'#4a4a52');for(let i=20;i<W;i+=60)R(i,120,2,40,'#e8e8e0');
  const car=(x,c)=>{R(x,128,46,14,c);R(x+8,120,28,9,c);R(x+10,121,10,6,'#8ab0d0');R(x+22,121,12,6,'#8ab0d0');R(x+4,140,8,6,'#1a1a1a');R(x+34,140,8,6,'#1a1a1a')};
  car(30,'#c03030');car(250,'#3a6aa0');
 }}
});
TEACH[1].foodtech='kettle';TEACH[3].drama='pratt';TEACH[6].foodtech='kettle';TEACH[6].drama='pratt';
PERIODS[1].locs.splice(3,0,'foodtech');PERIODS[3].locs.splice(3,0,'drama');PERIODS[6].locs.splice(3,0,'foodtech','drama');
CLASS[1].foodtech=['tez','mia','kayden','brandon'];CLASS[3].drama=['mia','kayden','kid1','kid3'];CLASS[6].foodtech=['tez','kayden','brandon'];CLASS[6].drama=['mia','kid1','kid3'];

/* ---------- who's where: the new kids, Mr. Adam, the mall ---------- */
ROSTER[0].bus.push(['mia',40,1,'cross',158],['adam',150,1,null,160]);ROSTER[0].toilets.push(['tez',200,-1,'lean']);ROSTER[0].corridor.push(['kayden',196,1,null,152]);
ROSTER[1].library.push(['ollie',250,-1,null,146]);
ROSTER[2].corridor.push(['adam',164,-1,null,138]);ROSTER[2].toilets=[['tez',200,-1,'lean']];ROSTER[2].field.push(['kayden',100,1,'cross',152]);ROSTER[2].canteen.push(['mia',40,1,null,152]);
ROSTER[3].library.push(['ollie',250,-1,null,146]);
ROSTER[4].library.push(['mia',60,1,null,146]);ROSTER[4].toilets=[['tez',200,-1,'lean']];ROSTER[4].corridor.push(['kayden',280,-1,null,152]);ROSTER[4].field.push(['adam',26,1,'slam',158]);
ROSTER[5].field.push(['mia',176,1,null,156],['kayden',130,1,null,158]);ROSTER[5].toilets=[['tez',200,-1,'lean']];
ROSTER[6].library.push(['ollie',230,-1,null,146]);
ROSTER[7].bus.push(['mia',50,1,null,158],['tez',270,-1,null,158],['kayden',232,-1,null,160],['adam',112,1,'mic',158]);
ROSTER[8]={foodcourt:[['omer',60,1,null,148],['omermum',82,-1,null,148],['hasan',150,1,null,150],['mia',176,-1,null,150],['corey',236,1,null,148],['abby',258,-1,null,148]],
 arcade:[['sean',60,1,null,148],['stella',80,-1,null,148],['marcus',140,1,null,146],['paul',190,-1,null,146],['jacob',284,-1,null,150],['kenneth',300,-1,'dribble',154]],
 carpark:[['arjun',160,1,'sit',104],['kayden',60,1,null,150],['kid1',230,-1,null,148],['kid2',252,-1,null,150],['glen',300,-1,'cross',150]]};
const _build=buildRoom;
buildRoom=function(room){_build(room);if(D.period===8&&room==='foodcourt'&&D.done.headcase&&!A.adam)put('adam',300,-1,{y:150,pose:'sit',hold:'cookie'});if(D.period===8&&room==='foodcourt'&&!D.done.corey){delete A.abby}};

/* ---------- Mr. Adam: every period he's a bit further gone ---------- */
const ADAM_PA=[
 'Good morning, Highgate! Reminder: the state inspection is coming. Act normal. Have a normal one. A NORMAL one.',
 'This is your principal. Please stop looking at me through the walls. I can feel it. I can feel all four hundred of you.',
 'Break time. The inspectors are coming. Please stop dying until then. Die AFTER. That is all.',
 'Would the boy who keeps laughing inside my head please report to my office. Bring a sandwich. I haven’t eaten since Tuesday.',
 'Lunch is served. I have eaten the attendance list. Attendance is now one hundred percent. You’re ALL inside me now.',
 'PE. Run. RUN. The inspectors can smell fear and lanyards.',
 'Final lesson. I have been on the roof. The roof understands me. The roof has never once asked for a data report.',
 'Home time. Go home. Please. Go home. I never go home.',
 ''
];
const ADAM_REACT=[
 ['hasan','He’s actually lost it. Like, properly. Like a guy in a film who’s about to be on the news.'],['arjun','Twenty-two years running this place and he’s finally become the building. Damp and falling apart.'],
 ['david','My mom says he’s been like this since the divorce. My mom says that about everyone. This time it’s true.'],['omer','I respect it. Going insane at work is the most honest thing an adult can do.'],
 ['nivaan','Chat says “bro’s speedrunning a breakdown”. Chat’s right.'],['corey','Should we… tell someone? Who do you tell when it’s the principal?'],
 ['sean','He called my mom this morning to tell her “the walls are listening”. She said “thank you”.'],['marcus','He’s been in that suit since Tuesday. It’s not a suit anymore. It’s a lifestyle.'],
 ['kenneth','He gave me a merit for “breathing correctly”. I’ll take it.'],['jacob','Nobody push him. He looks like he’d explode. Literally. Like, with a bang.'],
 ['paul','I offered him a hug and he wrestled me. I lost. To a principal. In a corridor.'],['mia','He’s bought forty meters of wire from the electronics shop at the mall. My cadet instructor says that’s “a sign”.'],
 ['tez','I’ve been in tenth grade for six years. I’ve seen three heads go mad. This one’s the best one.'],['kayden','Mr. Adam is a certified opp. On God. I fear no man but that man.'],
 ['dheva','He touched my hair at registration. He just said “real” and walked off.'],['alex','He tried to take a penalty at break and kicked the ball onto the roof, then climbed up after it, and didn’t come down.'],
 ['abby','He asked me to play a song for him in his office. I played him “Small Hours”. He cried and gave me a merit and a fire extinguisher.'],['stella','He stood outside the girls’ changing room shouting “I SEE NO CONCERNS” at the door. Then he left. Bizarre.'],
 ['angelo','He bought a fake doctor’s note off me. For himself. It says he’s “too tired to be the principal”.']
];
const ADAM_BURST=[
 null,
 ['(bursting in) Has anyone seen my wife? She’s about this tall and she left in 2019. As you were!','happy'],
 null,
 ['(in his suit jacket and boxer shorts) INSPECTION DRILL! Everybody look employable! You — look less like THAT.','yell'],
 null,
 ['(running through with a fire extinguisher) THE INSPECTORS CAN SMELL FEAR. I’M SPRAYING FOR FEAR.','yell'],
 ['(face covered in whiteboard marker) I’ve rewritten the school motto. It’s just “NO”. Carry on. Carry on forever.','evil']
];
ON_PERIOD.push(async(i,resume)=>{if(resume||!ADAM_PA[i]||(i===8))return;BACKLOG.push({n:'Mr. Adam (PA)',t:ADAM_PA[i],c:K.adam.col});SFX.static();sub('📢 Mr. Adam: “'+ADAM_PA[i]+'”',5.5)});
async function adamBurst(){
 const b=ADAM_BURST[D.period];if(!b||D.done.headcase||Math.random()<.4)return;
 put('adam',340,-1,{y:142,sp:120});cue('madness');
 await walk('adam',250,140);
 await say('adam',b[0],b[1]);
 await walk('adam',340,140);remove('adam');
 const present=ADAM_REACT.filter(r=>A[r[0]]&&!A[r[0]].dead);
 if(present.length){const r=pick(present);await say(r[0],r[1])}
}

/* ---------- every lesson goes wrong ---------- */
LESSON.balduf.push(
 [['balduf','Today we’re reading a poem about death. Hasan, read it like you mean it.'],['hasan','“Do not go gentle into that good—” miss, I’d go VERY gentle, I’m not a fighter.'],['balduf','Somebody hold his head still while I give him feedback.','evil']],
 [['balduf','Who wrote “could of” on my car?','evil'],['$','…'],['balduf','I’ll find out. I always find out. I have a red pen and a whole weekend.','evil']],
 [['balduf','Similes! Give me a simile!','happy'],['arjun','Your marriage is like this lesson, miss. Nobody wants to be here and it never ends.'],['balduf','…That’s a metaphor, Arjun. And it’s correct. Detention.','sad']]);
LESSON.shermian.push(
 [['shermian','Who wants a sticker?','happy'],['$','Me, miss!'],['shermian','Stickers are for children who don’t BREATHE SO LOUD.','evil'],['shermian','…Here’s your sticker, sweetie.','happy']],
 [['shermian','Mr. Biscuits says hello. He’s in my bag. He’s been in my bag since last year.','happy'],['$','…Is he alive, miss?'],['shermian','He’s RESTING.','evil']]);
LESSON.loach.push(
 [['loach','Page forty-seven.'],['paul','(doing a backflip off the desk) Miss! Miss! MISS!'],['loach','Mm.'],['paul','(lying on the floor) I think I broke something.'],['loach','Page forty-eight.']],
 [['$','Miss, Kenneth is on fire.'],['loach','Mm-hm.'],['kenneth','I’M ON FIRE.'],['loach','Page forty-seven.']]);
LESSON.coach.push(
 [['coach','Today: trust falls. Fall backwards. Somebody catches you or you learn something.','evil'],['$','(falls backwards; nobody catches; the floor teaches)']],
 [['coach','Who’s got a note?','angry'],['$','Me, sir, I’ve got asthma—'],['coach','Then breathe HARDER.','yell']]);
LESSON.voss.push([['voss','Hands up who’s an organ donor.','smirk'],['$','(no hands go up)'],['voss','Doesn’t matter. It’s an opt-out system in this room.','evil']]);
LESSON.kettle=[
 [['kettle','Today we’re making shortbread! Shortbread is like a child. You have to punch it until it stops crying.','happy'],['$','Miss, that’s just how you make bread—'],['kettle','THAT’S WHAT I SAID.','evil']],
 [['kettle','Who used the industrial oven without asking?','evil'],['tez','In my defence, miss, I’ve been here six years, I don’t ask anyone anything anymore.'],['kettle','Ten points from Tez. And a thumb.','evil']],
 [['kettle','Smell that? That’s the smell of a good bake. And Brandon. Brandon, step away from the oven.','smirk']]];
LESSON.pratt=[
 [['pratt','EMOTION. I want EMOTION. Mia — cry for me.','yell'],['mia','No.'],['pratt','THAT’S IT. THAT’S THE TRUTH. Bravo.','happy']],
 [['pratt','Today we do the death scene from Romeo and Juliet. The poison is real. That’s the craft.','smirk'],['kayden','Sir, I’m Romeo and I fear no man, but I fear THAT bottle.'],['pratt','Fear is just acting you haven’t paid for yet.','evil']],
 [['pratt','Improvisation! You’re all at a funeral. MY funeral. Grieve me.','happy'],['$','(stares)'],['pratt','PATHETIC. I’d come back from the dead just to give you notes.','angry']]];

/* teachers killing kids, in the background of an ordinary Friday */
const LESSON_KILLS={
 balduf:{victim:'kid1',line:'Miss, I could of— I mean—',kill:'pen',after:'Could HAVE. There. Now he’ll never forget. He’ll never do anything again, but he’ll never forget.'},
 shermian:{victim:'kid2',line:'(chewing gum very loudly)',kill:'neck',after:'Trash, sweetie. Gum goes in the trash can. You go in the other trash can.'},
 loach:{victim:'kid3',line:'(reaching for the mug to see what happens)',kill:'scissors',after:'Page forty-seven.'},
 coach:{victim:'kid4',line:'Sir, I’m tired—',kill:'ball',after:'TIRED is a word for people who are going to DIE. Like Darren.'},
 voss:{victim:'kid1',line:'Sir, I volunteer! For anything!',kill:'vat',after:'Lovely. Very… absorbent.'},
 kettle:{victim:'brandon',line:'Miss, mine’s a bit raw in the middle—',kill:'oven',after:'So are you, dear. Gas mark eight.'},
 pratt:{victim:'kid3',line:'Sir, this sword is really sharp—',kill:'sword',after:'And SCENE. That’s what commitment looks like. Somebody mop up the commitment.'}
};
async function lessonKill(t){
 const L=LESSON_KILLS[t];if(!L||Math.random()<.55||D.dead[L.victim]||!A[t])return;
 const v=put(L.victim,300,-1,{y:146});
 await say(L.victim,L.line,'scared');
 await evil(t);
 await walk(t,288,170);face(t,1);
 if(L.kill==='neck'){pose(t,'hug');await wait(300);SFX.crunch();kill(L.victim,'lie',{pool:8,bleed:0,spray:3})}
 else if(L.kill==='vat'||L.kill==='oven'){pose(t,'grab');SFX.whoosh();await tw(v,{alpha:0,x:316},500);v.vis=false;D.dead[L.victim]=1;SFX.scream();await wait(300);SFX.fire();prop({t:'smoke',x:306,y:120})}
 else if(L.kill==='ball'){pose(t,'throw');await wait(250);SFX.crunch();kill(L.victim,'crush',{pool:22})}
 else if(L.kill==='scissors'){hold(t,'knife');pose(t,'slam');SFX.squelch();await wait(250);kill(L.victim,'lie',{pool:30,bleed:3});hold(t,null)}
 else if(L.kill==='sword'){pose(t,'punch');A[t].punchT=T+.4;SFX.squelch();await behead(L.victim,1)}
 else{hold(t,'pen');pose(t,'slam');await wait(250);kill(L.victim,'lie',{pool:24})}
 pose(t,null);
 await say(t,L.after,'evil');
 await sweet(t,ROOMS[ROOM].music);
 const w=Object.keys(A).filter(k=>FRIENDS.includes(k)&&!A[k].dead);
 if(w.length)await say(pick(w),pick(['…Are we just not going to talk about that?','That’s the second one this week.','I’m going to need therapy and I’m going to need it to be free.','Write that down for the inspectors.','Bro got deleted.','Okay but did anyone get it on camera?']),'shock');
}
const _gl=genericLesson;
genericLesson=async function(room){
 await _gl(room);
 const t=TEACH[D.period]&&TEACH[D.period][room];
 if(t&&room!=='office')await lessonKill(t);
 if(room!=='office')await adamBurst();
};
const _chat=chat;
chat=async function(id){
 if(id==='adam'){await say('adam',pick({0:['Morning! Morning. Lovely morning. Is it morning? Good.'],2:['(talking to the trophy cabinet) You were all so shiny once.'],4:['(digging a hole on the field) It’s for the inspectors. To put their clipboards in. And then them.'],7:['Nobody goes HOME.'],8:['(eating noodles alone, very calm) Thank you. For yesterday. For today. For whatever this is.']}[D.period]||['…']),null);return}
 if(D.period>=1&&D.period<8&&Math.random()<.3){const r=ADAM_REACT.find(r=>r[0]===id);if(r){await say(id,r[1]);return}}
 return _chat(id);
};
const _dp=drawProp;
drawProp=function(p){
 if(p.t==='bomb'){const x=Math.round(p.x),y=Math.round(p.y);R(x-14,y-16,28,16,'#3a3a2a');R(x-14,y-16,28,2,'#5a5a4a');R(x-10,y-13,20,7,'#0a0a0a');const s=Math.max(0,Math.ceil(p.secs||0));px(String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'),x-9,y-12,Math.sin(T*8)>0?'#ff3030':'#a01010');['#d03030','#3060d0','#e0b030','#30a040'].forEach((c,i)=>{if(!(p.cut&&p.cut[i]))R(x-11+i*6,y-5,2,5,c)});pxc('ADAM',x,y-21,'#e0e0e0');return}
 if(p.t==='rig'){const x=Math.round(p.x),y=Math.round(p.y);R(x-20,y,40,4,'#3a3a40');for(let i=0;i<3;i++){R(x-16+i*14,y+4,8,8,'#2a2a2a');R(x-15+i*14,y+12,6,2,'#fff6c0')}return}
 if(p.t==='dagger'){R(Math.round(p.x),Math.round(p.y),8,1,'#e8e8f0');R(Math.round(p.x)-3,Math.round(p.y)-1,3,3,'#8a6a2a');return}
 return _dp(p);
};

/* =================================================================
   HEAD CASE — Mr. Adam
   ================================================================= */
mission('headcase',{name:'Head Case',icon:'💣',who:['mia','hasan','david'],
 blurb:'Mr. Adam, the principal, is losing his mind one period at a time. Everyone can see it. The inspectors come on Monday. He’s decided Monday isn’t coming.',
 parts:['Break: find out what’s wrong with Mr. Adam','Lunch: Mia found the receipts','Home time: the box at the bus loop'],
 tips:['Break, main corridor. He’s talking to the trophies.','Lunch, library. Mia’s in the cadets. She knows things she shouldn’t.','Home time, bus loop. Know which wire. (Or bring something cold.)'],
 variants:{wire:'Cut the right wire',ice:'Froze it'},doneTip:'After school you’ll find him in the food court, eating noodles. Calm. Finally.'});

hook({mis:'headcase',period:2,room:'corridor',who:'adam',label:'Ask Mr. Adam if he’s okay',cond:()=>!D.f.adam1,run:async()=>{
 scene('corridor',{adam:[164,-1,{y:138}],you:[196,-1,{y:154}],aidan:[230,-1,{y:140}]});
 cue('madness');
 await say('adam','(to the trophy cabinet) You were all so shiny once. 1998. County Netball. We were somebody.','sad');
 await say('you','Sir? Are you… okay?');
 face('adam',1);
 await say('adam','Am I OKAY? Ha. HA. That’s funny. Write that down. Somebody write that down for the inspectors.','yell');
 await say('adam','Twenty-two years. Twenty-two years and on Monday four people with lanyards walk in and tell me if I was any GOOD.','shock');
 await say('adam','My wife left me for a man who sells conservatories. My daughter calls me “Adam”. The photocopier has a restraining order against me.','sad');
 await say('adam','So no. Monday is not happening. I’ve made… arrangements.','evil');
 const c=await choose(['“Sir, you’re a good head. Genuinely.”','“Sir, you’re actually insane.”','“What arrangements?”']);
 if(c===0){await say('adam','…Nobody’s ever said that. Twenty-two years.','cry');await say('adam','Doesn’t change the arrangements, though. Lovely of you.','smirk');D.f.adamKind=1}
 if(c===1){await say('adam','INSANE? I’m the only SANE one! Every day in this building is the SAME day, and nobody else has NOTICED!','evil');await say('aidan','(very quietly, behind you) He’s noticed.','smirk')}
 if(c===2){await say('adam','Arrangements. In the boiler room. Ticking arrangements. Shh.','smirk');D.f.adamBoiler=1}
 intel('adamMonday');
 D.f.adam1=1;part('headcase',1);
}});

hook({mis:'headcase',period:4,room:'library',who:'mia',label:'Ask Mia what she knows',cond:()=>D.f.adam1&&!D.f.adam2,run:async()=>{
 scene('library',{mia:[60,1,{y:146,hold:'paper'}],david:[140,-1,{pose:'sit',y:150}],you:[90,-1,{y:154}]});
 await say('mia','I’m in the cadets. I know what forty meters of wire, a kitchen timer and a padlocked toolbox look like on a receipt. It looks like a sad man with a plan.','angry');
 await say('mia','I found his receipts in the trash can outside the staffroom. He bought them at the electronics place in Fair City Mall. He paid with a rewards card. He got the POINTS.','shock');
 await say('david','The principal is building a— in the— and he got rewards POINTS?','shock');
 await say('mia','He’s not a terrorist. He’s a sad man who watched YouTube. Which is worse. Sad men are thorough.');
 await say('mia','Rule one: never cut red. Red’s what they WANT you to cut.','smirk');
 await say('mia','Rule two: sad men wire it to the thing they love. What does Mr. Adam love?','smirk');
 const c=await choose(['His wife.','The 1998 County Netball trophy. It’s gold.','The photocopier.']);
 if(c===1){await say('mia','Gold. Cut the gold one. Good. You’re smarter than you look. Which isn’t hard.','smirk');intel('bombWire')}
 else{await say('mia',c===0?'His wife left him for a conservatory man. He doesn’t love her. He loves being sad about her. Think harder.':'He has a restraining order from the photocopier. Think harder.','angry');await say('mia','…It’s the gold trophy. Obviously. Gold wire. Don’t make me say it twice.');intel('bombWire')}
 await say('mia','I was going to ask Hasan to help me but he looked at me for too long and said “hey” in a voice.','smirk');
 D.f.adam2=1;part('headcase',2);
}});

hook({mis:'headcase',period:7,room:'bus',who:'adam',label:'What’s in the box, sir?',cond:()=>!D.done.headcase,run:async()=>{
 const cast={adam:[130,1,{y:150,pose:'mic'}],you:[180,-1,{y:156}]};for(const [n,x] of [['hasan',220],['mia',244],['omer',266],['jacob',290],['arjun',60],['david',40]])if(!D.dead[n])cast[n]=[x,x<130?1:-1,{y:146}];
 scene('bus',cast);
 const bomb=prop({t:'bomb',x:100,y:156,secs:120});
 cue('madness');fxState.red=.5;
 await say('adam','(through a megaphone) NOBODY. GOES. HOME.','evil');
 await say('adam','If nobody goes home, the weekend can’t start. If the weekend can’t start, Monday can’t come. If Monday can’t come, the INSPECTORS can’t come!','evil');
 await say('adam','And if anyone gets on that bus, this box goes off. Two minutes. I’ve been very clear in an email.','evil');
 if(A.hasan)await say('hasan','He’s actually got a bomb. Mr. Adam’s got an actual bomb. This is the most interesting assembly we’ve ever had.','shock');
 if(A.arjun)await say('arjun','Sir, with respect, your marriage blew up on its own. You didn’t need a kit.','smirk');
 if(A.jacob)await say('jacob','Nobody push me. Nobody PUSH me right now.','scared');
 const timer=setInterval(()=>{bomb.secs=Math.max(0,bomb.secs-1)},TEST?5:1000);
 try{
  const o=[{t:'Cut a wire.'},{t:'Talk him down.'},{t:'Freeze the timer with the fire extinguisher.',dis:!has('extinguisher'),why:'Tez sells those',tag:'🧯'},{t:'Run.'}];
  let c=await choose(o,'The timer is going down.');
  if(c===3){
   await walk('you',330,140);
   bomb.secs=0;await boom();
  }
  if(c===1){
   await say('you','Sir. You’re not doing this because of the inspectors. You’re doing it because nobody ever told you you did alright.');
   if(D.f.adamKind){await say('adam','…You said I was good. Earlier. You said it.','cry');await say('adam','I don’t know how to turn it OFF. I made it off YouTube. They never show the off bit.','cry')}
   else{await say('adam','Don’t you DARE be nice to me now. Where were you at break? Where was ANYONE?','evil');await say('adam','It doesn’t turn off anyway. They never show you the off bit.','evil')}
   c=0;
  }
  if(c===2){
   take('extinguisher');await walk('you',114,120);pose('you','hold');SFX.whoosh();
   for(let i=0;i<30;i++)parts.push({x:A.you.x-8,y:A.you.y-22,vx:rand(-60,-20),vy:rand(-20,10),c:'#e8f0ff',s:2,fy:158,life:1});
   await N('You empty the whole extinguisher into the box. It frosts over. The numbers on the timer slow down… and stop at 00:07.');
   bomb.secs=7;clearInterval(timer);pose('you',null);
   await finishHead('ice');return;
  }
  const wires=['Red','Blue','Gold','Green'];
  const w=await choose(wires.map((x,i)=>({t:'Cut the '+x.toLowerCase()+' wire.'})),'Four wires.'+(P.intel.bombWire?' Mia said: never red; the thing he loves.':''));
  await walk('you',114,120);pose('you','kneel');
  const steady=await meter('Hold the cutters steady',{speed:1.2});
  pose('you',null);
  bomb.cut=bomb.cut||[];bomb.cut[w]=1;SFX.click();
  if(w===2&&steady){clearInterval(timer);bomb.secs=Math.min(bomb.secs,3);SFX.ding();await N('Snip. The timer stops at 00:03. Somewhere a pigeon lands on the box and nothing happens to it. It’s the best moment of your life.');await finishHead('wire');return}
  await wait(400);bomb.secs=0;await boom();
 }finally{clearInterval(timer)}
}});
async function boom(){
 SFX.rumble();SFX.glass();flash('#fff',1.2);shake(2);cue('dead');
 for(const id in A){const a=A[id];if(id==='adam'||a.dead)continue;if(id!=='you')kill(id,'lie',{pool:16+Math.random()*20,spray:30});else{a.ex='dead';a.pose='lie';a.pool=0;a.poolMax=30;a.dead='lie'}}
 kill('adam','head',{spray:60});
 for(let i=0;i<5;i++){wallSplat(rand(20,300),rand(40,100),8);splat(rand(20,300),rand(146,160),6)}
 await N('The bus loop is gone. The 43 is on its side. Somewhere, a car alarm plays the same four notes forever.');
 await die('boom');
}
async function finishHead(v){
 cue('sad');fxState.red=0;
 ex('adam','cry');pose('adam',null);hold('adam',null);
 await walk('adam',120,40);A.adam.pose='sit';A.adam.y=158;
 await say('adam','(sitting on the kerb with the megaphone in his lap) I just didn’t want to be judged. Twenty-two years. Nobody ever told me I was good at it.','cry');
 const c=await choose(['“You were good at it. You’re bad at bombs.”','“Sir, you need help. Real help.”','Sit down next to him and say nothing.']);
 if(c===0){await say('adam','(laughing, crying) I’m TERRIBLE at bombs. I got reward points.','laugh')}
 if(c===1){await say('adam','I know. I know. I’ll call someone. I’ll call… Mia’s cadet instructor, he seems to know everything.','sad')}
 if(c===2){await N('You sit next to him on the kerb. The bus loop goes quiet. After a while he stops shaking.');await say('adam','…Thank you.','sad')}
 if(A.mia)await say('mia','(already holding the wires) I’ll take these. For the cadets. For science. For no reason.','smirk');
 if(A.hasan)await say('hasan','Best. Friday. EVER.','happy');
 await complete('headcase',v);
}

/* =================================================================
   BAKE OFF — Mrs. Kettle, Food Tech
   ================================================================= */
mission('bakeoff',{name:'Bake Off',icon:'🧁',who:['kayden','tez','mia'],
 blurb:'Mrs. Kettle runs Food Tech like a TV show. Star Baker gets a sticker. Worst Baker gets baked.',
 parts:['Period 1: Star Baker or bust'],tips:['Period 1, Food Tech. Help Brandon, or don’t.'],variants:{brandon:'Brandon was the worst',saved:'Nobody got baked (much)'}});
hook({mis:'bakeoff',period:1,room:'foodtech',who:'auto',run:async()=>{
 scene('foodtech',{kettle:[40,1,{pose:'hips',y:146}],tez:[90,-1,{y:134}],mia:[190,-1,{y:134}],kayden:[90,1,{y:156}],brandon:[190,1,{y:156}],you:[214,-1,{y:158}]});
 await N('Period 1. Food Tech. The industrial oven is already on. It’s always on. It hums like it’s hungry.');
 await say('kettle','Welcome to the Bake Off, my little dumplings! Victoria sponge. Forty minutes. Star Baker gets a sticker!','happy');
 await say('kettle','Worst Baker goes in the oven. Not as a punishment. As an ingredient.','evil');fxState.red=1;SFX.sting();await wait(300);fxState.red=0;ex('kettle','happy');
 await say('kayden','On God, I’m too young to be a pie. I’ve got a mixtape coming out.','scared');
 await say('tez','I’ve done this bake six years running. Here’s the trick: make sure there’s someone worse than you in the room.','smirk');
 await say('brandon','(his sponge has already collapsed into a sort of puddle) Is it meant to be wet?','scared');
 const c=await choose(['Help Brandon fix his sponge.','Swap your sponge with Brandon’s when she’s not looking.','Just bake. Eyes on your own work.']);
 let score=0;
 for(const step of['Whisk it','Get it in the oven','Ice it']){const r=await meter(step,{speed:1.1});score+=r}
 if(c===0){
  const r=await meter('Save Brandon’s sponge',{speed:1.3,zone:.2});
  if(r){await say('brandon','It… it RISES. It’s risen. Like Jesus. Like a little sponge Jesus.','happy');D.f.brandonSaved=1}
  else await say('brandon','It’s worse. You made it worse. How is it worse?','cry');
 }
 if(c===1){await N('You swap the trays. Brandon looks at your sponge with the face of a man who has just been handed a miracle he didn’t earn.');score=Math.max(score,4)}
 await say('kettle','JUDGING!','happy');
 await walk('kettle',150,60);
 if(score<=1&&c!==1){
  await say('kettle','Oh, sweetheart. This is a crime scene with icing.','evil');
  await walk('kettle',200,80);pose('kettle','grab');A.you.ex='scared';
  await walk('kettle',270,60);await walk('you',282,60);
  SFX.door();await tw(A.you,{alpha:0},400);A.you.vis=false;SFX.scream();await wait(300);SFX.fire();
  await N('The oven door shuts. Gas mark nine. Through the little window you watch yourself go golden brown.');
  await say('kettle','Forty minutes and we’ll have a lovely crackling.','happy');
  await die('oven');
 }
 if(c===1||!D.f.brandonSaved){
  await say('kettle','Brandon. Dear. Brandon. This is soup.','evil');
  await say('brandon','It’s not mine! I swear it’s not—','scared');
  pose('kettle','grab');await walk('kettle',270,60);
  await tw(A.brandon,{x:282},600);SFX.door();await tw(A.brandon,{alpha:0},300);A.brandon.vis=false;D.dead.brandon=1;
  SFX.scream();await wait(500);SFX.fire();prop({t:'smoke',x:276,y:60});
  await N('Brandon goes in. The little window glows orange. The screaming stops at about the same time the timer dings.');
  await say('tez','(not looking up from his icing) Every year. Every single year.','sad');
  await say('kayden','Bro just got ratio’d by a fucking cake.','shock');
  await say('kettle','Star Baker is… YOU! Here’s your sticker, petal!','happy');
  if(A.mia)await say('mia','(quietly, to you) If you swapped those trays, I saw. I’m not going to say anything. I’m just going to remember.','angry');
  await say('kettle','Brandon pie at lunch, everyone! Tell Pat!','happy');
  await complete('bakeoff','brandon');return;
 }
 await say('kettle','Hm. Hm. HM. Nobody’s bad enough. That’s never happened.','evil');
 await say('kettle','Kayden. Your sponge is fine but your little rap songs are an act of violence. In you go.','evil');
 await say('kayden','I FEAR NO— no— I fear this, I fear THIS—','scared');
 pose('kettle','grab');await tw(A.kayden,{x:270},500);
 await walk('tez',258,120);pose('tez','grab');SFX.door();
 await tw(A.kayden,{x:240},300);A.kayden.hurt=1;
 await N('Tez pulls Kayden back out with a pair of oven gloves at the last second. Kayden is very slightly toasted. His eyebrows are a memory.');
 await say('kettle','Crispy! Seven out of ten.','happy');
 await say('kayden','(smoking gently) Highgate Hittaz… don’t die… we just get… browned.','hurt');
 await complete('bakeoff','saved');
}});

/* =================================================================
   METHOD — Mr. Pratt, Drama
   ================================================================= */
mission('method',{name:'Method',icon:'🎭',who:['mia','kayden'],
 blurb:'Mr. Pratt doesn’t believe in fake blood, fake swords or fake deaths. He’s doing Macbeth. Everyone is going to remember it.',
 parts:['Period 3: survive Macbeth'],tips:['Period 3, Drama. The lighting rig is heavy. Mia can climb.'],variants:{rig:'Exit, pursued by a lighting rig',stab:'The critic'}});
hook({mis:'method',period:3,room:'drama',who:'auto',run:async()=>{
 scene('drama',{pratt:[160,1,{pose:'hips',y:150}],kid1:[200,-1,{y:104}],mia:[60,1,{y:150,pose:'cross'}],kayden:[90,1,{y:156}],kid3:[260,-1,{y:150}],you:[120,1,{y:158}]});
 cue('tension');
 await say('pratt','Macbeth. Act Two. The murder of King Duncan. And we are NOT using props, because props are for COWARDS and children’s TV.','yell');
 await say('kayden','Sir, is that a real dagger?','scared');
 await say('pratt','Is this a dagger which I see before me? YES. Sheffield steel. Forty bucks.','happy');
 await say('pratt','Our Duncan tonight is… you. eighth grade. Up on the stage. Lie down. Close your eyes. Trust the craft.','smirk');
 A.kid1.pose='lie';
 await walk('pratt',190,60);hold('pratt','knife');
 await say('kid1','Sir? Sir, it’s pointy—','scared');
 pose('pratt','slam');SFX.squelch();await wait(200);SFX.squelch();kill('kid1','lie',{pool:20});hold('pratt',null);pose('pratt',null);
 await say('pratt','And SCENE. Do you SEE? Do you FEEL it? THAT is theatre!','happy');
 await say('mia','He’s actually killed an eighth grader. In a lesson. Out loud.','shock');
 await walk('pratt',140,60);face('pratt',-1);
 await say('pratt','You. Next scene. You’re Macbeth. Mia’s Banquo. Banquo dies. Make me believe it.','evil');
 prop({t:'dagger',x:126,y:140});
 const o=[{t:'“I’m not killing Mia.” Refuse.'},{t:'Get Mia up the ladder to the lighting rig.'},{t:'Stab Mr. Pratt. Give him the realism he wants.'}];
 if(has('compass'))o[2]={t:'Stab Mr. Pratt with Tez’s compass shiv.',tag:'🗡️'};
 const c=await choose(o,'Mr. Pratt is holding the other dagger out to you, handle first.');
 if(c===0){
  await say('you','I’m not killing Mia.');
  await say('pratt','FAKE. FAKE! You’re not FEELING it! Let me show you how Banquo REALLY dies—','evil');
  await walk('pratt',134,120);hold('pratt','knife');pose('pratt','slam');
  SFX.squelch();shake(1);A.you.hurt=3;blood(A.you.x,A.you.y-22,40,-1,90,A.you.y+2);kill('you','lie',{pool:26});
  await say('pratt','…Hm. You were Banquo all along. Bold choice. Bit selfish.','smirk');
  await die('method');
 }
 if(c===1){
  await say('you','(whispering) Mia. Rig.');
  await say('mia','(already moving) Cadets. I climb things.','smirk');
  await walk('mia',40,90);await tw(A.mia,{y:20},500);
  await say('pratt','WHERE is my BANQUO?','yell');
  const r=await meter('Mia unclips the rig. Tell her when.',{speed:1.25});
  const rig=prop({t:'rig',x:186,y:18});
  if(r){
   await walk('pratt',186,40);
   await tw(rig,{y:118},350,'in');SFX.crunch();shake(1.6);flash('#fff',.5);D.f.rigDown=1;
   kill('pratt','crush',{pool:34,bleed:3});
   await N('The whole lighting rig comes down on Mr. Pratt. Six lamps. All of them still on. He gets the most beautiful light of his life.');
   await say('mia','(climbing down) Exit, pursued by a lighting rig.','smirk');
   await say('kayden','That’s a different play, though.','shock');
   await say('mia','He’d have wanted the reference.');
   await complete('method','rig');return;
  }
  await tw(rig,{y:118},350,'in');SFX.crunch();shake(1);
  await N('The rig drops two seconds early. It misses Pratt completely and lands on the stage, where it lights him perfectly.');
  await say('pratt','A SPOTLIGHT! For ME! Thank you, Banquo!','happy');
  await say('pratt','Right. Back to the murder.','evil');
  await walk('pratt',134,120);hold('pratt','knife');pose('pratt','slam');SFX.squelch();shake(1);kill('you','lie',{pool:26});
  await die('method');
 }
 await walk('you',150,120);pose('you','punch');A.you.punchT=T+.4;SFX.squelch();shake(1);blood(A.pratt.x,A.pratt.y-20,40,-1,90,A.pratt.y+2);
 await say('pratt','(looking down at it) YES. YES! THAT’S IT! FINALLY! A REAL ACTOR!','happy');
 kill('pratt','lie',{pool:30});pose('you',null);
 await say('pratt','(dying, thrilled) Five… stars…','dead');
 await say('kayden','Bro just stabbed a drama teacher and got a standing ovation. From the drama teacher.','shock');
 await say('mia','Self-defence. He literally handed you a knife and asked you to.','angry');
 await complete('method','stab');
}});
