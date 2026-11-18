'use strict';
/* =====================================================================
   HIGHSCHOOL — LESSONS THAT DON’T REPEAT
   Every one of your eight timetabled classes has its own run of six
   lessons across the two weeks. No lesson is the same twice. Every time
   you come back, the teacher is worse. Every teacher is carrying
   something heavy, and you can get in the middle of it: kind, or not.
   Some lessons don’t stay in the classroom.
     English — Ms. Balduf: her husband Gerald is dying.
     Math (the Trailer) — Ms. Sherman: Mr. Biscuits the cat is dying.
     PE — Coach Dunmore: his son Tommy is in a coma.
     Chem — Mr. Voss: his mother needs a kidney.
     History — Mr. Grieve: he’s losing his memory. He thinks it’s the war.
     ICT — Mrs. Byte: her online boyfriend “Rick” is a scam.
     Swimming — Mrs. Tarn: her daughter Lily drowned.
     Assembly — Mr. Adam: his wife left, and the inspection is coming.
   ===================================================================== */

/* ---------- the old “while nobody’s watching” menu is gone ---------- */
CLASS_ACTS.length=0;

/* ---------- props and held things ---------- */
{const _dh=drawHeld;drawHeld=function(it,x,y,d){
 if(it==='redpen'){R(x-1,y-5,2,8,'#c02020');R(x-1,y+3,2,1,'#f4f0e6');return}
 if(it==='scissors'){R(x-1,y-6,1,7,'#c8ccd4');R(x+1,y-6,1,7,'#c8ccd4');R(x-2,y+1,2,3,'#c03030');R(x+1,y+1,2,3,'#c03030');return}
 if(it==='sword'){R(x-1,y-16,2,15,'#d8dce4');R(x,y-17,1,1,'#fff');R(x-3,y-1,6,1,'#a08030');R(x-1,y,2,4,'#5a3a22');return}
 if(it==='cat'){R(x-4,y-2,9,5,'#e8a050');R(x+3,y-5,4,4,'#e8a050');R(x+3,y-6,1,1,'#e8a050');R(x+6,y-6,1,1,'#e8a050');R(x+4,y-4,1,1,'#2a2a2a');R(x-5,y-4,1,3,'#e8a050');return}
 if(it==='card'){R(x-4,y-4,8,6,'#f4e0e8');R(x-4,y-4,8,1,'#c04070');R(x-1,y-2,2,2,'#c04070');return}
 if(it==='photo'){R(x-3,y-4,6,7,'#f4f0e6');R(x-2,y-3,4,4,'#8ab0d0');return}
 if(it==='whistle'){R(x-1,y-1,3,2,'#c8ccd4');return}
 if(it==='medal'){R(x-1,y-6,2,4,'#c03030');R(x-2,y-2,4,4,'#e0b040');return}
 if(it==='jaw'){R(x-3,y-1,7,2,'#e8e0c8');R(x-3,y-3,1,2,'#e8e0c8');R(x+3,y-3,1,2,'#e8e0c8');return}
 return _dh(it,x,y,d)}}
{const _dp=drawProp;drawProp=function(p){
 const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='carrier'){R(x-9,y-10,18,10,'#8a8a92');R(x-8,y-9,16,8,'#3a3a42');for(let i=0;i<4;i++)R(x-6+i*4,y-9,1,8,'#c8c8d0');R(x-3,y-13,6,3,'#5a5a62');if(!p.empty){R(x-4,y-6,7,4,'#e8a050');R(x-2,y-5,1,1,'#2a2a2a');R(x+1,y-5,1,1,'#2a2a2a')}return}
 if(p.t==='shoebox'){R(x-8,y-6,16,6,'#e8e0d0');R(x-9,y-7,18,2,'#c8b8a0');pxc(p.s||'',x,y-5,'#6a3a3a');return}
 if(p.t==='stuffed'){R(x-5,y-6,10,6,'#e8a050');R(x+3,y-10,5,5,'#e8a050');R(x+3,y-11,1,1,'#e8a050');R(x+7,y-11,1,1,'#e8a050');const gl=Math.sin(T*3)>0?'#7aff7a':'#3aaa3a';R(x+4,y-9,1,1,gl);R(x+6,y-9,1,1,gl);R(x-8,y,16,2,'#6a4a2a');return}
 if(p.t==='dummy'){R(x-12,y-3,22,5,'#e8c8a8');R(x+8,y-5,7,7,'#e8c8a8');R(x+10,y-3,1,1,'#2a2a2a');R(x+12,y-3,1,1,'#2a2a2a');R(x+10,y,3,1,'#c04040');return}
 if(p.t==='buoy'){R(x-3,y-3,7,6,'#e04030');R(x-3,y-1,7,2,'#f4f0e6');return}
 if(p.t==='jello'){const w=Math.sin(T*9)*1;R(x-5+w,y-5,10,5,'#c02040');R(x-4+w,y-6,8,1,'#e04060');g.globalAlpha=.4;R(x-3+w,y-4,3,2,'#fff');g.globalAlpha=1;return}
 if(p.t==='cable'){for(let i=0;i<(p.w||60);i+=2)R(x+i,y+Math.round(Math.sin(i*.3)*2),2,1,p.c||'#3a7ae0');return}
 if(p.t==='spark'){if(Math.sin(T*30+x)>0){R(x-1,y-4,2,8,'#fff8a0');R(x-4,y-1,8,2,'#fff8a0')}return}
 if(p.t==='frizz'){for(let i=0;i<8;i++)R(x-6+i*2,y-6-(i%3)*2,1,4,'#f4f0e6');return}
 if(p.t==='screenbig'){R(x,y,p.w||90,p.h||50,'#141820');R(x+2,y+2,(p.w||90)-4,(p.h||50)-4,p.bg||'#2a4a8a');(p.lines||[]).forEach((l,i)=>px(l,x+5,y+5+i*8,p.c||'#e8f0ff'));return}
 if(p.t==='trench'){R(x-30,y-2,60,5,'#4a3a22');R(x-30,y-2,60,1,'#6a5032');return}
 if(p.t==='flag'){R(x,y-30,1,30,'#8a8a8a');R(x+1,y-30,14,9,p.c||'#c03030');return}
 if(p.t==='lily'){R(x-4,y-6,8,9,'#f4f0e6');R(x-3,y-5,6,5,'#8ab0d0');R(x-1,y-4,2,2,'#e8c8a8');R(x-2,y-5,4,1,'#c8a050');return}
 if(p.t==='shard'){R(x,y,2,1,'#c8e0f0');return}
 if(p.t==='mic'){R(x-1,y-26,2,26,'#5a5a5a');R(x-2,y-29,4,4,'#2a2a2a');return}
 return _dp(p)}}

/* ---------- little helpers ---------- */
const here_=id=>A[id]&&!A[id].dead;
const inRoom=(c,prefer)=>{const ks=(c.kids||[]).filter(here_);for(const p of prefer||[])if(ks.includes(p))return p;return ks.length?ks[0]:null};
const anyKid=(c,not)=>{const ks=(c.kids||[]).filter(k=>here_(k)&&!(not||[]).includes(k));return ks.length?pick(ks):null};
function extra(id,x,dir,o){if(!A[id]&&!D.dead[id])put(id,x,dir||-1,Object.assign({y:146},o||{}));return A[id]?id:null}
function dies(id,type,o){if(!A[id])return;kill(id,type||'lie',o||{pool:24});D.dead[id]=1}
async function outTo(c,room,place){
 /* the whole class walks out of the door, and the next shot is them arriving */
 const ks=(c.kids||[]).filter(here_);
 for(const k of ks)if(A[k]){A[k].pose=null;walk(k,-20,70+Math.random()*30)}
 if(c.t&&A[c.t]){A[c.t].pose=null;walk(c.t,-20,70)}
 await walk('you',-20,80);
 const cast={you:[-14,1,{y:156}]};
 if(c.t)cast[c.t]=[-30,1,{y:146}];
 ks.forEach((k,i)=>cast[k]=[-40-i*14,1,{y:144+(i%3)*5}]);
 scene(room,cast,true);
 const P_=place||((k,i)=>[90+i*22,1]);
 if(c.t)walk(c.t,P_(c.t,-1)[0],70);
 ks.forEach((k,i)=>{const s=P_(k,i);walk(k,s[0],60+i*4)});
 await walk('you',60,80);await wait(600);
}
K.ruth={n:'Ruth (Mr. Grieve’s daughter)',col:'#6a5a7a',skin:'#e4c4a8',hair:'#8a6a4a',hs:'bob',top:'#5a4a6a',pants:'#2a2a33',adult:1,girl:1,seed:141,v:420};K.ruth.id='ruth';
const LN=()=>{D.f.ln=D.f.ln||{};return D.f.ln};

/* =====================================================================
   ENGLISH — MS. BALDUF
   ===================================================================== */
const EP_english=[
 /* 1: the letter */
 async(c,t)=>{
  await say(t,'Phones away, darlings. Today you write a letter to somebody you’ve never told the truth to. You won’t send it. I’ll read it. That’s worse.','smirk');
  await scrawl('english',['A LETTER','TO SOMEONE','YOU LIE TO'],'#b5462a');
  for(const k of c.kids.filter(here_))A[k].pose='write';pose('you','write');
  const ch=await choose(['Write to your mom.','Write to your future self.','Write to Aidan. Obviously.']);
  pose('you','sit');
  const a=inRoom(c,['arjun','marcus','hasan']);
  if(a){await walk(t,A[a].x-12,70);hold(t,'paper');
   await say(t,'(reading '+K[a].n+'’s out loud) “Dear Mr. Pizza Guy. I tip you three dollars because I am scared of you.” … Darling, that is the most honest thing anyone’s written in this room all year. Could OF been better spelled.','smirk');hold(t,null);await walk(t,TEACHER_SPOT.english[0],70);face(t,1)}
  await N('On the corner of her desk there’s an envelope she didn’t take out of anyone’s bag. It says GERALD in her handwriting. When her phone buzzes, she turns it face down without looking.');
  if(ch===2&&here_('aidan'))await say('aidan','(not looking up) I got a letter. From you. Just now. I’ll keep it forever.','happy');
 },
 /* 2: the phone call */
 async(c,t)=>{
  await evil(t,'class');
  await say(t,'Grammar Thunderdome, darlings. Two of you stand up. One sentence each. The worse sentence gets my pen.','evil');
  const a=inRoom(c,['marcus','arjun','kenneth']),b=anyKid(c,[a]);
  if(a&&b){A[a].pose=null;A[b].pose=null;
   await say(a,'Me and him was going to the store.','scared');
   await say(b,'He and I were going to the store.','scared');
   hold(t,'redpen');await walk(t,A[a].x-10,90);pose(t,'stab');SFX.squelch();blood(A[a].x,A[a].y-26,8,null,30,A[a].y+2);A[a].ex='hurt';
   await N('She writes the correct sentence across '+K[a].n+'’s forehead in red pen. She presses so hard the pen goes through the skin on the full stop.');
   pose(t,null);hold(t,null);A[a].pose='sit';A[b].pose='sit'}
  SFX.beep();await N('Her phone rings. She looks at the screen for a long time. Then she walks to the door and stands outside it with her back to the window.');
  await walk(t,8,60);face(t,-1);A[t].pose='cover';
  const c2=await choose(['Go out and check on her.','Read the GERALD letter on her desk.','Stay in your seat.']);
  if(c2===0){await walk('you',30,70);face('you',-1);
   await say('you','Ms. Balduf? Are you okay?');
   await say(t,'(not turning round) He doesn’t know who I am today, darling. Forty-one years. He asked the nurse who the sad lady was.','cry');
   await say(t,'Go and sit down. Thank you. Go and sit DOWN.','sad');D.f.baldufKind=(D.f.baldufKind||0)+1;
   await walk('you',c.mine.x,70);pose('you','sit')}
  else if(c2===1){await walk('you',TEACHER_SPOT.english[0]+12,80);pose('you','reach');hold('you','paper');
   await N('“Gerald. They say a week now. I am bringing your crossword in tomorrow. You will pretend to know who I am. I will pretend to believe you. That is marriage, my love.”');
   hold('you',null);pose('you',null);await walk('you',c.mine.x,80);pose('you','sit');D.f.baldufRead=1}
  A[t].pose=null;await walk(t,TEACHER_SPOT.english[0],60);A[t].pose='hips';face(t,1);
  await say(t,'(red eyes, perfectly calm) Page twelve.','sad');
 },
 /* 3: outside */
 async(c,t)=>{
  await say(t,'We’re going outside. Write what you see. I need air. You need… whatever children need.','sad');
  await outTo(c,'field',(k,i)=>i<0?[60,1]:[96+i*24,i%2?-1:1]);
  A[t].pose='sit';prop({t:'smoke',x:A[t].x+6,y:A[t].y-30});
  await N('The playing field. Ms. Balduf sits on the grass with her shoes off and smokes a cigarette she clearly bought this morning. Nobody has ever seen her feet.');
  const v=extra('jaxon',200,-1)||anyKid(c);
  if(v){await say(v,'Miss, I could of written more but the clouds keep moving.','smirk');
   await evil(t,'field');hold(t,'redpen');await walk(t,A[v].x-10,140);pose(t,'stab');SFX.squelch();SFX.scream();
   blood(A[v].x,A[v].y-14,30,1,60,A[v].y+2);A[v].ex='hurt';A[v].pose='hurt';
   await N('She puts the red pen straight through the back of '+K[v].n+'’s hand, into the grass, and leaves it standing there like a flag.');
   pose(t,null);hold(t,null);
   const ch=await choose(['Grab her wrist.','Pull the pen out of '+K[v].n+'’s hand.','Look at the clouds. Write what you see.']);
   if(ch===0){await walk('you',A[t].x+10,110);pose('you','grab');
    await say(t,'(looking at your hand on her wrist, then at you) …He used to fix my commas. Gerald. Every letter I ever wrote, he’d fix one comma and give it back. Forty-one years.','cry');
    await say(t,(D.f.baldufKind?'You asked if I was okay. Nobody asks. ':'')+'Let go of me, darling. I’m not going to do it again today.','sad');pose('you',null);D.f.baldufKind=(D.f.baldufKind||0)+1}
   else if(ch===1){await walk('you',A[v].x+10,110);pose('you','grab');SFX.squelch();blood(A[v].x,A[v].y-14,12,null,40,A[v].y+2);await say(v,'AAAH— thank you— AAAH—','hurt');pose('you',null);A[v].pose=null}
   else await N('You write: “a cloud shaped like a hand with a pen in it.” It’s the best thing you’ve ever written.');
  }
 },
 /* 4: obituaries */
 async(c,t)=>{
  await evil(t,'class');
  await say(t,'Obituaries, darlings. Your own. Two hundred words. How you lived. How you died. I want it to be accurate.','evil');
  await scrawl('english',['OBITUARY:','YOURS','200 WORDS'],'#b5462a');
  for(const k of c.kids.filter(here_))A[k].pose='write';
  const a=inRoom(c,['arjun','marcus']);
  if(a)await say(a,'(reading his) “He died as he lived. Hot.”','smirk');
  const v=extra('kid1',250,-1);
  if(v){await say(v,'Miss, can I go to the bathroom? I literally could of— I mean I could’ve died in here.','scared');
   await say(t,'(sweetly) Of course, darling. I’ll walk you.','happy');
   await walk(t,A[v].x-10,70);pose(t,'grab');await Promise.all([walk(t,-20,60),walk(v,-12,60)]);
   SFX.door();await wait(500);SFX.scream();await wait(300);SFX.thud();
   await N('They go out together. The scream from the supply closet is very short. A minute later, Ms. Balduf comes back alone. There’s something red on her cardigan and her pen is missing.');
   put(t,-14,1,{y:146});await walk(t,TEACHER_SPOT.english[0],60);D.dead[v]=1;delete A[v]}
  const ch=await choose(['Pass a card round the class. For her husband.','Write your obituary. Make it short.']);
  if(ch===0){hold('you','card');await N('You pass a blank card under the desks. By the time it gets back to you, everybody has signed it. Even Arjun. He wrote “sorry about your guy, miss”.');hold('you',null);D.f.baldufCard=1}
  else await N('“They died in English. Nobody was surprised.” Fifty words short. You’ll take the detention.');
 },
 /* 5: he’s gone */
 async(c,t)=>{
  A[t].k=Object.assign({},K[t],{top:'#1a1a1a',cardigan:0});
  await N('Ms. Balduf comes in wearing black. All black. She doesn’t say good morning. She writes one line on the board and sits down.');
  await scrawl('english',['GERALD','1951–','WAS'],'#1a1a1a');
  await N('Nobody makes a sound. It’s the quietest the room has ever been.');
  if(D.f.baldufCard){
   const ch=await choose(['Give her the card.','Keep it. It’s not the right time.']);
   if(ch===0){await walk('you',A[t].x+14,60);hold('you',null);hold(t,'card');
    await say(t,'(opening it, reading every single name) …“sorry about your guy, miss”.','cry');
    await say(t,'Arjun. That’s a comma splice. Thank you.','cry');
    await N('She lets everybody go twenty minutes early. Nobody leaves. Everybody sits there with her until the bell, doing nothing at all.');
    D.f.baldufKind=(D.f.baldufKind||0)+2;hold(t,null);return}
  }
  await say(t,'(very quietly) One sentence each. Perfect grammar. Anyone who gets it wrong stays behind with me.','evil');
  const a=inRoom(c,['kenneth','dheva','paul']);
  if(a){await say(a,'Me and my mom— I mean— my mom and I—','scared');
   await evil(t,'class');hold(t,'scissors');await walk(t,A[a].x-12,100);pose(t,'stab');SFX.squelch();blood(A[a].x,A[a].y-22,20,null,50,A[a].y+2);A[a].hurt=2;A[a].ex='hurt';
   await N('She cuts a piece out of '+K[a].n+'’s ear with the class scissors. Just a little piece. The size of an apostrophe.');
   pose(t,null);hold(t,null);
   const ok=await mash('Get between them!',{need:16,time:4});
   if(ok){await walk('you',A[a].x+10,120);await say('you','STOP. Miss. He’s dead. He’s dead and this isn’t going to fix any commas.');await say(t,'(dropping the scissors) …Get out. All of you. Out.','cry')}
  }
 },
 /* 6: the last letter */
 async(c,t)=>{
  if((D.f.baldufKind||0)>=2){
   await say(t,'Last lesson, darlings. I’m giving you back your letters. The ones you never sent.','sad');
   await N('She walks round the room putting each letter back on each desk. Yours too. She’s written one word on the bottom of every one. On yours it says: “true”.');
   hold(t,'paper');await say(t,'And this is his. Gerald’s. The last one he wrote me, before he forgot how.','sad');
   await say(t,'(reading) “Dear Margret. I love you more then anything. Your the best thing that ever happend to me.”','cry');
   await say(t,'Three mistakes in two sentences. I never fixed them. I loved every one.','cry');
   hold(t,null);classLaugh(400);await N('Somebody starts clapping. Then everybody. Ms. Balduf puts her face in her hands and laughs.');
   return;
  }
  await evil(t,'evil');
  await say(t,'Final exam, darlings. Every “could of” in this building dies today.','evil');
  SFX.locker();await N('She locks the door and puts the key in her mouth. Then she swallows it.');
  hold(t,'scissors');
  for(let i=0;i<2;i++){const v=anyKid(c,['you']);if(!v)break;await walk(t,A[v].x-10,140);pose(t,'stab');SFX.squelch();blood(A[v].x,A[v].y-20,30,null,70,A[v].y+2);A[v].hurt=3;A[v].ex='hurt';pose(t,null)}
  const ok=await mash('Shove her into the stationery cupboard!',{need:20,time:5});
  if(ok){await walk('you',A[t].x+10,130);pose('you','punch');SFX.punch();shake(1);await tw(A[t],{x:6},300);SFX.door();await N('You shove her backwards into the stationery cupboard and wedge a chair under the handle. From inside, very calmly, she corrects everyone’s screaming.');A[t].vis=false}
  else{SFX.squelch();blood(A.you.x,A.you.y-24,40,null,90,A.you.y+2);await N('She gets you in the side with the scissors. Your obituary was too short. It’s accurate now.');await die('could')}
 }
];
DEATHS.could={name:'Could Of',desc:'Ms. Balduf’s final exam. You failed it with your body.',hint:'English, the last lesson. Be kind to her before then.'};

/* =====================================================================
   THE TRAILER — MS. SHERMAN
   ===================================================================== */
const EP_trailer=[
 async(c,t)=>{
  await say(t,'Fractions, sweeties! If Miss has eight stickers and you have none, what fraction of Miss’s love do you have?','happy');
  await scrawl('trailer',['8 STICKERS','0 FOR YOU','= ?'],'#c04070');
  const a=inRoom(c,['dheva','marcus','arjun']);
  if(a){await say(a,'Zero eighths?','scared');await say(t,'ZERO eighths! Stand on your chair, sweetie. Stand there till Miss loves you again.','evil');A[a].pose=null;await tw(A[a],{z:8},300);
   await N(K[a].n+' stands on a wobbly chair in a trailer that already wobbles. Every time anybody breathes, he windmills his arms.')}
  await say(t,'(dabbing her eye at the MR BISCUITS poster) Mr. Biscuits is at the vet today, sweeties. He’s fine. He’s FINE. Miss doesn’t want to talk about it.','sad');
  if(a)await tw(A[a],{z:0},200);
 },
 async(c,t)=>{
  const cr=pprop({t:'carrier',x:A[t].x+14,y:A[t].y,layer:3});
  await N('Ms. Sherman comes in carrying a cat carrier with both arms, like a baby. Inside, an old ginger cat wheezes. Mr. Biscuits.');
  await say(t,'Probability, sweeties. What’s the probability Mr. Biscuits sees Christmas?','happy');
  const a=inRoom(c,['arjun','marcus']);
  if(a){await say(a,'…Zero?','smirk');await evil(t);
   await say(t,'Then you can hold him, sweetie. All lesson. Feel him not seeing Christmas.','evil');
   await walk(t,A[a].x-12,80);cr.hide=1;hold(a,'cat');SFX.scream();blood(A[a].x+4,A[a].y-22,10,null,30,A[a].y+2);A[a].ex='hurt';
   await N('Mr. Biscuits bites straight through '+K[a].n+'’s thumb and hangs off it like a Christmas ornament.')}
  const ch=await choose(['Ask if you can pet him.','Keep your head down.']);
  if(ch===0){await say('you','Miss, can I pet him?');await say(t,'(narrowing her eyes) …Gently.','smirk');
   pose('you','reach');SFX.heart();await N('He stops wheezing. He pushes his head into your hand and purrs like a little engine.');pose('you','sit');
   await say(t,'He doesn’t like ANYBODY, sweetie. He likes you. Miss is going to have to think about that.','shock');D.f.biscuits=1}
 },
 async(c,t)=>{
  await say(t,'Measurement, sweeties! Outside! How many children fit under the Trailer? Miss has always wanted to know.','happy');
  await outTo(c,'walkway',(k,i)=>i<0?[200,-1]:[60+i*20,1]);
  const a=inRoom(c,['marcus','paul','kenneth']);
  if(a){await say(t,K[a].n+'. Under you go, sweetie. Miss will count.','happy');A[a].pose='lie';await tw(A[a],{x:250,y:156},800);
   SFX.rumble();shake(1.2);SFX.crunch();await N('The Trailer creaks. One of the cinder blocks it stands on cracks in half. The whole corner drops four inches onto '+K[a].n+'’s legs.');
   SFX.scream();blood(A[a].x,A[a].y-4,20,null,40,A[a].y+2);
   const ok=await mash('Everyone lift!',{need:20,time:5,info:'Get your hands under the edge!'});
   if(ok){await N('Everybody lifts. The whole class, purple in the face, holding up a classroom. '+K[a].n+' drags himself out. His legs bend in the right places. Mostly.');A[a].pose=null;A[a].hurt=2}
   else{await N('It’s too heavy. Ms. Sherman sighs, walks over, and lifts the corner of the Trailer with one hand while she checks her nails with the other.');A[a].pose=null;A[a].hurt=3}
   await say(t,'One child, sweeties! The answer is one! Write it down.','happy');}
 },
 async(c,t)=>{
  A[t].k=Object.assign({},K[t],{top:'#1a1a1a'});
  pprop({t:'shoebox',x:A[t].x+14,y:A[t].y-14,s:'MR B',layer:3});
  await N('Ms. Sherman is in black. There’s a shoebox on her desk. MR B, in marker. She is smiling the whole time. It’s the worst smile you’ve ever seen.');
  await say(t,'Volume, sweeties. What’s the volume of a shoebox? … Don’t look at it. Don’t you DARE look at it.','evil');
  const v=extra('kid2',260,-1);
  if(v){classLaugh(300);A[v].ex='laugh';
   await say(t,'(very softly) Was that a laugh, sweetie? Come help Miss carry something to her car.','happy');
   await walk(t,A[v].x-12,80);pose(t,'grab');await Promise.all([walk(t,340,60),walk(v,348,60)]);SFX.door();
   await wait(800);SFX.thud();await wait(600);
   put(t,340,-1,{y:146});await walk(t,TEACHER_SPOT.trailer[0],60);
   await N('She comes back alone, ten minutes later. Brushing her hands off. There’s dirt under her nails. Mr. Biscuits isn’t the only thing she buried at lunch.');
   D.dead[v]=1;delete A[v]}
  if(D.f.biscuits){await say(t,'(passing your desk, so quietly only you hear) He purred for you. At the end, he purred like that for Miss.','cry')}
 },
 async(c,t)=>{
  const st=pprop({t:'stuffed',x:A[t].x+16,y:A[t].y-14,layer:3});
  await N('Mr. Biscuits is back. Stuffed. On her desk. His eyes are glass now, and they glow green, very faintly. Mr. Voss’s handiwork.');
  await say(t,'Test day, sweeties! Mr. Biscuits is watching. He sees EVERYTHING now.','happy');
  for(const k of c.kids.filter(here_))A[k].pose='write';
  await N('Every time somebody looks up from their test, Mr. Biscuits’s head is pointing at them. Nobody saw it move. It keeps moving.');
  const ch=await choose(['Knock Mr. Biscuits off the desk.','Tell her he looks peaceful.','Do the test.']);
  if(ch===0){await walk('you',st.x-10,80);pose('you','punch');SFX.thud();await tw(st,{x:st.x+30,y:st.y+20},300);st.hide=1;
   await N('He hits the floor and his head comes off and rolls under the radiator, still glowing.');
   await evil(t,'evil');await walk(t,A.you.x+12,140);pose(t,'choke');SFX.crunch();A.you.hurt=2;
   await say(t,'(holding you off the floor by your throat) Miss buried him, sweetie. Miss DUG HIM BACK UP for you all.','evil');pose(t,null)}
  else if(ch===1){await say('you','He looks peaceful, Miss.');await say(t,'(stroking him) He does, doesn’t he. A plus, sweetie. You didn’t even finish.','happy')}
 },
 async(c,t)=>{
  await N('The last lesson in the Trailer. Ms. Sherman doesn’t teach. She sits on her desk with her legs crossed and looks at all of you.');
  await say(t,'Miss was twenty-three once, sweeties. In this school. Miss had a detention to run. Miss went to get a coffee.','sad');
  await say(t,'Miss has been getting that coffee ever since.','sad');
  await scrawl('trailer',['X + 1987 = ?'],'#c04070');
  await say(t,'Solve for X and you can go.','evil');
  const ch=await choose(['“X is today.”','“X is however long you’ve been sorry.”','“Negative 1987.”']);
  if(ch===1||D.f.biscuits){await say(t,'(a long time) …Close enough, sweetie. Go on. All of you. Before Miss changes her mind.','cry');await N('She opens the door herself. You all file past her. She touches every head on the way out, very lightly, like counting.')}
  else{await evil(t,'evil');SFX.door();const v=anyKid(c);if(v){A[v].pose=null;await walk(v,300,90);SFX.crunch();shake(1.4);blood(300,120,40,null,90,150);dies(v,'crush',{pool:30})
   ;await N('Wrong. '+K[v].n+' runs for the door. The door slams on him. Then again. Then a third time, because Miss is thorough.')}}
 }
];

/* =====================================================================
   PE — COACH DUNMORE
   ===================================================================== */
const EP_gym=[
 async(c,t)=>{
  await say(t,'DODGEBALL. Medicine balls. I keep a tally. The kid with the most kills gets my respect. The kid with the least gets the trash can.','yell');
  const a=anyKid(c),b=anyKid(c,[a]);
  if(a&&b){A[a].pose=null;A[b].pose=null;hold(a,'medball');pose(a,'throw');await wait(200);hold(a,null);SFX.thud();SFX.crunch();A[b].pose='lie';A[b].hurt=2;shake(.8);
   await N(K[a].n+' throws a medicine ball at '+K[b].n+' from three feet away. It folds him in half.');
   await say(t,'TALLY.','happy');A[b].pose=null}
  const ch=await choose(['Throw one at Coach.','Dive behind Paul.','Catch the next one.']);
  if(ch===0){pose('you','throw');SFX.thud();await N('It bounces off Coach’s chest like he’s made of tires. He looks at you for a long time.');await say(t,'…Finally. Somebody in this school with a spine. Twenty laps, champ.','happy')}
  else if(ch===1)await N('Paul doesn’t even notice you’re there. He absorbs three medicine balls and sneezes.');
  else{const ok=await mash('Catch it!',{need:12,time:3});if(!ok){SFX.crunch();A.you.hurt=2;await N('It catches you instead. Right in the ribs. You hear one of them say goodbye.')}else await say(t,'GOOD HANDS. Tommy had good hands.','happy')}
 },
 async(c,t)=>{
  await say(t,'BEEP TEST. And the beeps are faster this year. I adjusted them. With a screwdriver.','yell');
  for(const k of c.kids.filter(here_))A[k].pose=null;
  for(let i=0;i<4;i++){SFX.beep();await wait(TEST?0:200)}
  const k=inRoom(c,['kenneth','jacob','dheva']);
  if(k){A[k].pose='lie';SFX.thud();await N(K[k].n+' goes down at level eleven. Face first. Doesn’t get up.');
   await say(t,'Nobody stops. Nobody stops for anybody. Tommy didn’t stop.','yell');
   const ch=await choose(['Carry '+K[k].n+' to the line.','Keep running.']);
   if(ch===0){const ok=await mash('Drag him over the line',{need:16,time:5});await N(ok?'You drag '+K[k].n+' across the line just as it beeps. Coach looks at you like he’s about to cry or kill.':'You don’t make it. The beep goes. Coach blows his whistle in your ear for a full minute.');A[k].pose=null}
  }
  await N('Coach’s phone is face up on the bench the whole time. When it lights up, he stares at it until it stops.');
 },
 async(c,t)=>{
  await say(t,'Altitude training. The roof. Everybody. Thinner air makes thicker men.','yell');
  await outTo(c,'roof',(k,i)=>i<0?[200,-1]:[60+i*20,1]);
  await N('The school roof. No railing. Wind. Coach makes everybody do push-ups along the edge.');
  const v=anyKid(c);SFX.beep();
  await say(t,'(answering his phone, turning away) Yeah. Yeah, this is his dad. … Is he— did he— okay. Okay.','sad');
  if(v){A[v].pose='lie';await tw(A[v],{x:300},400);SFX.scream();await N(K[v].n+' slips. He’s hanging off the edge of the roof by his fingertips and Coach is on the phone with his back turned.');
   const ch=await choose(['Pull '+K[v].n+' up.','Take Coach’s phone off him.']);
   if(ch===0){await walk('you',290,110);pose('you','grab');const ok=await mash('Pull!',{need:16,time:4});pose('you',null);if(ok){A[v].pose=null;await tw(A[v],{x:270},300);await N('You haul him back over the edge. He lies on the roof gravel laughing and crying at the same time.')}else{await tw(A[v],{y:220},500);dies(v,'lie');SFX.thud();await N('His fingers slide off the edge. There’s a long, long silence, and then a sound from the bus loop.')}}
   else{await walk('you',A[t].x+12,110);pose('you','grab');hold('you','phone');await N('You take the phone out of his hand. On the screen: “ST MARY’S — ICU”. And a photo: Coach, younger, with a kid in a #12 jersey. TOMMY.');hold('you',null);pose('you',null);
    await say(t,'(turning round, seeing '+K[v].n+' too late) …KID—','shock');await tw(A[v],{y:220},500);dies(v,'lie');SFX.thud();D.f.tommy=1}
  }
 },
 async(c,t)=>{
  await say(t,'Tackle football. For Tommy. Tommy’s been in a coma for six weeks because some kid from Westfield went in late. So we go in late. We ALWAYS go in late.','yell');
  hold(t,'football');
  const a=inRoom(c,['paul','omer']),b=anyKid(c,[a]);
  if(a&&b){A[a].pose=null;A[b].pose=null;await walk(a,A[b].x-8,140);pose(a,'headbutt');SFX.crunch();shake(1.4);A[b].pose='lie';A[b].hurt=3;
   await N(K[a].n+' tackles '+K[b].n+' so hard you hear something snap. An arm points a direction arms don’t point.');pose(a,null)}
  const v=extra('jaxon',260,-1);
  if(v){await say(v,'(under his breath) Your son probably sucked anyway.','smirk');
   await evil(t,'gym');await say(t,'(very calm) Jaxon. Help me get the cones from the equipment room.','happy');
   await Promise.all([walk(t,-20,70),walk(v,-12,70)]);SFX.door();await wait(500);SFX.crunch();SFX.thud();
   await N('Only Coach comes back. He’s carrying the cones. One of them is dripping.');put(t,-14,1,{y:146});await walk(t,TEACHER_SPOT.gym[0],70);D.dead[v]=1;delete A[v]}
  const ch=await choose(['Sign the #12 jersey he’s hung on the wall.','Stay out of his way.']);
  if(ch===0){await N('Coach has hung Tommy’s #12 jersey on the climbing bars. You write “get up, Tommy” on the back in marker. Coach sees. He doesn’t say anything. He has to turn away.');D.f.tommy=(D.f.tommy||0)+1}
  hold(t,null);
 },
 async(c,t)=>{
  if(A[t])delete A[t];
  await N('Coach doesn’t show up. Ten minutes. Twenty. The gym fills up with kids doing whatever they want. Somebody climbs the rope and won’t come down.');
  const ch=await choose(['Go and find him.','Run the class yourself.','Steal his whistle off his desk.']);
  if(ch===0){
   scene('lockers',{coach:[200,-1,{y:146,pose:'sit',ex:'cry'}],you:[-14,1,{y:156}]},true);await walk('you',160,70);
   await N('The locker room. Coach is sitting on a bench in the dark with the #12 jersey over his knees.');
   await say('coach','They’re turning it off. The machine. Tomorrow. They say he’s not in there anymore.','cry');
   await say('coach','I yelled at him every day of his life, champ. Every day. “Faster. Harder. Again.” I never once said “that was good”.','cry');
   const c2=await choose(['“Go and say it to him. Today.”','Sit with him.']);
   if(c2===0)await say('coach','(standing up, very slowly) …Yeah. Yeah. Tell the ladies to run laps.','sad');
   else await N('You sit on the bench with him. Neither of you says anything. After a while he puts one huge hand on your head, for a second, like a hat.');
   D.f.tommy=(D.f.tommy||0)+2;
  }else if(ch===1){A.you.pose=null;await say('you','LADIES. LAPS.');await N('Nobody runs. Paul runs. Paul always runs.')}
  else{hold('you','whistle');await N('You blow it once. Every kid in the gym drops and does twenty. Muscle memory. Terrifying.');hold('you',null)}
 },
 async(c,t)=>{
  if((D.f.tommy||0)>=2){
   await N('Coach is back. He’s got a balloon tied to his whistle. It says GET WELL in letters that are peeling.');
   await say(t,'He squeezed my hand. Tommy. Last night. They didn’t turn it off. He squeezed it.','cry');
   await say(t,'So today we play kickball. Slow kickball. Anybody who tackles anybody does laps for a month.','happy');
   await N('It’s the gentlest PE lesson in the history of Highgate. Coach cries during the warm-up and blames the dust. There’s no dust.');
   return;
  }
  await evil(t,'gym');
  await say(t,'Final beep test. Doors are locked. Last kid standing passes PE. Everybody else… doesn’t.','evil');
  SFX.locker();for(let i=0;i<6;i++){SFX.beep();await wait(TEST?0:160)}
  for(let i=0;i<2;i++){const v=anyKid(c);if(!v)break;SFX.thud();A[v].pose='lie';await walk(t,A[v].x-10,140);pose(t,'stomp');SFX.crunch();blood(A[v].x,A[v].y-6,30,null,60,A[v].y+2);dies(v,'lie',{pool:30});pose(t,null)}
  const ok=await mash('RUN',{need:24,time:7,info:'Keep running. Don’t be the one who stops.'});
  if(!ok){A.you.pose='lie';await walk(t,A.you.x-10,140);pose(t,'stomp');SFX.crunch();await die('beepfinal')}
  else await N('You’re the last one standing. Coach looks at you for a long time, then unlocks the doors and walks out without a word.');
 }
];
DEATHS.beepfinal={name:'Level Twenty',desc:'You stopped. Coach didn’t.',hint:'PE, the last lesson. Be there for Coach before then.'};

/* =====================================================================
   CHEM — MR. VOSS
   ===================================================================== */
const EP_chem=[
 async(c,t)=>{
  await say(t,'Blood typing, young scientists! One prick each. Don’t be shy. I’m not.','happy');
  for(const k of c.kids.filter(here_)){A[k].pose='reach';SFX.click();await wait(TEST?0:60);A[k].pose=null}
  await N('One by one he writes everybody’s blood type on the board. Next to yours, he draws a little heart. Then he draws a box around the heart.');
  await say(t,'O negative. Universal donor. How… generous of you.','smirk');
  const a=inRoom(c,['nivaan','hasan']);if(a)await say(a,'(whispering) Bro why does he have a cooler under his desk with a SMILEY on it.','scared');
 },
 async(c,t)=>{
  await say(t,'Field work! Specimen collection! The woods! Bring bags. Big ones.','happy');
  await outTo(c,'forest',(k,i)=>i<0?[200,-1]:[60+i*22,1]);
  await N('The woods behind school. Mr. Voss hands out trowels. Everybody digs. Mr. Voss digs fastest.');
  pose('you','kneel');await wait(300);pose('you',null);
  await N('Your trowel hits something. It’s white. It’s got teeth in it. It’s a jaw. A small one.');
  await say(t,'(appearing behind you instantly) Squirrel!','happy');
  const ch=await choose(['Pocket the jaw.','Hand it to him.']);
  if(ch===0){hold('you','jaw');await N('You slide it into your pocket while he’s smiling at you. He keeps smiling. He knows. He keeps smiling.');D.f.vossJaw=1;hold('you',null)}
  else{hold(t,'jaw');await say(t,'Thank you, young scientist. I’ve been looking for this one since 2011.','happy');hold(t,null)}
 },
 async(c,t)=>{
  hold(t,'phone');
  await N('Mr. Voss props his phone up against a beaker. On the screen: a very old woman in a hospital bed. He speaks to her very gently, in a language nobody in the room knows.');
  await say(t,'This is Mama, young scientists. Say hello. Mama needs a kidney. Mama has been on the list for four years.','sad');
  await say(t,'Quick quiz! Hands up who has two kidneys!','happy');
  for(const k of c.kids.filter(here_))A[k].pose='up';
  await N('Everybody puts their hand up before they think about it. Mr. Voss counts the hands. Slowly. With his lips moving.');
  for(const k of c.kids.filter(here_))A[k].pose=null;hold(t,null);
  const ch=await choose(['Keep your hand up.','Put it down fast.']);
  if(ch===0)await say(t,'(writing your name on a sticky note and putting it in his breast pocket) Lovely. Lovely.','smirk');
 },
 async(c,t)=>{
  pprop({t:'jello',x:150,y:132,layer:2});
  await say(t,'Kidney-shaped Jell-O! Anatomy! Who wants to volunteer for the practical?','happy');
  const v=extra('kid3',260,-1);
  if(v){await say(v,'(bored) Sure, whatever.','smirk');
   await Promise.all([walk(t,-20,70),walk(v,-12,70)]);SFX.door();
   const ch=await choose(['Follow them.','Eat the Jell-O.']);
   if(ch===0){scene('closet',{voss:[180,-1,{y:146,hold:'knife'}],kid3:[150,1,{y:150,pose:'lie'}],you:[-14,1,{y:156}]},true);await walk('you',80,90);
    await N('The supply closet. The 7th grader is on a folding table under a desk lamp. Mr. Voss is drawing a dotted line on her side with a Sharpie.');
    const ok=await mash('Grab the knife!',{need:18,time:4});
    if(ok){await walk('you',170,110);pose('you','grab');hold('voss',null);hold('you','knife');await say('voss','(hands up, smiling) Okay. Okay. Not today. Mama can wait. Mama is very patient.','smirk');hold('you',null);D.f.vossStop=1}
    else{pose('voss','stab');SFX.squelch();blood(150,140,40,null,60,152);await N('Too slow. He’s quick and neat and it takes about four seconds. Then he stitches her up with fishing line and gives her a sticker.')}
   }else{await N('It’s raspberry. It’s good. From behind the door, you hear a zipper sound, but from a person.');}
  }
 },
 async(c,t)=>{
  await N('Mr. Voss is whistling. He brought donuts. He hugs the doorframe on the way in.');
  await say(t,'Mama got a kidney! A perfect match! The hospital is calling it a miracle. I am calling it chemistry.','happy');
  const v=c.kids.find(k=>here_(k)&&A[k].hurt);
  await N('At the back of the room there’s a new jar on the shelf, labelled with a date and a blood type. O negative.');
  const ch=await choose(['Unplug his cooler.','Swap the label on the jar to “VOSS”.','Eat a donut.']);
  if(ch===0){SFX.click();await N('You pull the plug on the smiley-face cooler. It stops humming. Mr. Voss stops whistling at exactly the same moment.');await evil(t,'evil');await say(t,'(not turning round) Plug it back in, young scientist. Or I plug YOU into something.','evil')}
  else if(ch===1){await N('You peel the label off and write VOSS on a new one. When he sees it, he laughs so hard he has to sit down.');await say(t,'Oh, that’s FUNNY. That’s funny. I’m going to remember that you’re funny.','evil')}
  else await N('The donuts are fine. The jam is very red. You stop thinking about it.');
 },
 async(c,t)=>{
  await say(t,'Final lesson! Extra credit opportunity! One volunteer. One kidney. One A plus. Forever.','happy');
  await N('He opens the back fridge. It’s full. Fourteen jars that say AIDAN. And a lot of others.');
  if(here_('aidan')||!D.dead.aidan){extra('aidan',300,-1);
   await say('aidan','(putting his hand up) I’ll do it. They grow back. Mine grow back. I’ve done this fourteen times.','happy');
   await say(t,'(delighted, horrified) …Aidan. My boy. My renewable boy.','happy');
   await N('Aidan walks into the back room with Mr. Voss. He comes out ten minutes later, eating a donut, totally fine. Mr. Voss comes out white as a sheet.')}
  if(D.f.vossStop||D.f.vossJaw){
   const ch=await choose(['Shut him in his own fridge.','Leave it.']);
   if(ch===0){await walk('you',A[t].x-10,110);pose('you','punch');SFX.punch();await tw(A[t],{x:290},300);SFX.door();A[t].vis=false;
    await N('You shove him backwards into the fridge and slam it. From inside, muffled, among the jars: “This is a VERY interesting temperature!”')}
  }
 }
];

/* =====================================================================
   HISTORY — MR. GRIEVE
   ===================================================================== */
const EP_history=[
 async(c,t)=>{
  await say(t,'Troops! The Battle of Hastings. Rulers out. That side is the Normans. This side is the English. Nobody leaves until somebody wins.','yell');
  hold(t,'sword');await N('He uses a real sword to point at the map. It’s very sharp. He says it’s from the actual battle. He says it every lesson.');
  const a=anyKid(c),b=anyKid(c,[a]);
  if(a&&b){A[a].pose=null;A[b].pose=null;await walk(a,A[b].x-10,120);pose(a,'stab');SFX.smack();A[b].hurt=1;await say(b,'OW. He got me in the EYE with a RULER.','hurt');pose(a,null);await say(t,'An arrow in the eye! HISTORICALLY ACCURATE, soldier!','happy')}
  hold(t,null);
 },
 async(c,t)=>{
  await say(t,'Trench warfare. Outside. Shovels. We dig.','yell');
  await outTo(c,'field',(k,i)=>i<0?[60,1]:[100+i*20,-1]);
  pprop({t:'trench',x:170,y:158,layer:-30});
  for(const k of c.kids.filter(here_))A[k].pose='kneel';
  await N('The whole class digs a trench across the playing field. Coach watches from the gym door with his arms folded. He looks jealous.');
  const a=inRoom(c,['hasan','david']);
  if(a){await say(t,'(to '+K[a].n+', very warmly) Bailey. Private Bailey. I thought we lost you at the river.','sad');
   await say(a,'Sir, it’s me. '+K[a].n+'.','scared');
   await say(t,'(blinking) …Of course. Of course it is. Dig, soldier.','sad')}
 },
 async(c,t)=>{
  await say(t,'(staring out of the window) They’re coming over the hill. Troops. Positions. NOW.','yell');
  await N('There’s nobody on the hill. It’s the gym. Coach is walking across the field with a bag of balls.');
  await outTo(c,'field',(k,i)=>i<0?[60,1]:[90+i*16,1]);
  put('coach',300,-1,{y:146});
  hold(t,'sword');await say(t,'CHARGE!','yell');
  await Promise.all([walk(t,270,140),...c.kids.filter(here_).slice(0,4).map(k=>walk(k,230+Math.random()*30,120))]);
  SFX.punch();shake(1.3);await N('Mr. Grieve leads twenty kids in a full charge at Coach Dunmore. Coach fights back with a dodgeball. It’s the greatest thing you have ever seen.');
  const ch=await choose(['Charge with them.','Tell Mr. Grieve it’s not the war.']);
  if(ch===1){await walk('you',A[t].x-12,110);await say('you','Sir. Sir. It’s the field. It’s Coach. There’s no war.');await say(t,'(lowering the sword, very slowly) …Is it 1944?','scared');await say('you','No, sir.');await say(t,'Then where is everybody?','sad');D.f.grieveKind=(D.f.grieveKind||0)+1}
  else{SFX.cheer();await N('You charge. Coach takes you out with a dodgeball to the face. Worth it.')}
  hold(t,null);
 },
 async(c,t)=>{
  await evil(t,'class');
  await say(t,'Desertion. In wartime, troops, desertion was punished with death. Raise your hand if you need the bathroom.','evil');
  const v=extra('kid4',260,-1);
  if(v){A[v].pose='up';await say(v,'…Sir?','scared');
   await say(t,'Behind the map, soldier.','evil');
   await Promise.all([walk(t,TEACHER_SPOT.history?TEACHER_SPOT.history[0]+20:60,70),walk(v,70,70)]);
   hold(t,'sword');pose(t,'overhead');await wait(200);SFX.squelch();
   await behead(v,1);dies(v,'head');pose(t,null);hold(t,null);
   await N('He does it behind the big map of Europe. Everybody can see the shadow. Everybody hears it. Nobody puts their hand up again for the rest of the year.')}
 },
 async(c,t)=>{
  await N('A woman is standing in the doorway in a nice coat. She looks like Mr. Grieve, but forty years younger and very tired.');
  put('ruth',-14,1,{y:146});await walk('ruth',60,60);
  await say(t,'(to her, politely) Can I help you, ma’am? Are you a new recruit?','happy');
  await say('ruth','Dad. It’s me. It’s Ruth. They called me. You went into the gym and saluted the vending machine.','cry');
  const ch=await choose(['Show him the medal in his drawer.','Let her take him home.']);
  if(ch===0){hold('you','medal');await walk('you',A[t].x+12,90);
   await N('You give him the medal from his desk drawer. He turns it over and over. His face changes. He’s back. For a minute, he’s all the way back.');
   await say(t,'Ruth. Ruthie. Look at you. Look how big you got.','cry');D.f.grieveKind=(D.f.grieveKind||0)+2;hold('you',null)}
  else await N('She takes his arm and he goes with her, very politely, like a guest. He salutes the class on the way out. Half the class salutes back.');
 },
 async(c,t)=>{
  if((D.f.grieveKind||0)>=2){
   await say(t,'Last lesson, troops. No battles today. I want to tell you something I saw. In this school. A long time ago, when I was young and it was my first year here.','sad');
   await say(t,'March 1987. A young teacher ran a detention in the basement. Four kids. She left them to get a coffee. The boiler went. I was in the corridor. I heard them knocking.','sad');
   await say(t,'I told myself it was the pipes. For thirty-nine years I’ve told myself it was the pipes. Write it down, soldiers. It wasn’t the pipes.','cry');
   intel('grieve1987');
   await N('He takes his medal off and leaves it on the desk. Then he walks out of the classroom, straight-backed, and doesn’t come back.');
   return;
  }
  await evil(t,'evil');
  await say(t,'The enemy is INSIDE THE BUILDING. Barricade the doors. Nobody surrenders.','yell');
  hold(t,'sword');for(let i=0;i<2;i++){const v=anyKid(c);if(!v)break;await walk(t,A[v].x-12,150);pose(t,'overhead');await wait(150);SFX.squelch();await behead(v,1);dies(v,'head');pose(t,null)}
  const ok=await mash('Get the sword off him!',{need:20,time:5});
  if(ok){await walk('you',A[t].x+10,120);pose('you','grab');hold(t,null);hold('you','sword');await say(t,'(sinking to his knees) …At ease. At ease, soldier.','cry');hold('you',null)}
  else await die('desert');
 }
];
Object.assign(INTEL,{grieve1987:'Mr. Grieve heard the 1987 kids knocking in the basement. He told himself it was the pipes.'});
DEATHS.desert={name:'Deserter',desc:'Mr. Grieve’s last war. You were on the wrong side of it.',hint:'History, the last lesson. Help him remember before then.'};

/* =====================================================================
   ICT — MRS. BYTE
   ===================================================================== */
const EP_ict=[
 async(c,t)=>{
  await say(t,'Internet safety, learners! To show you why it matters, I’m putting everybody’s search history on the big screen.','happy');
  const s=pprop({t:'screenbig',x:120,y:30,w:110,h:46,lines:['SEARCHES:'],layer:-150});
  for(const k of c.kids.filter(here_).slice(0,3)){const L={arjun:'how to be mean but in a hot way',hasan:'is my head normal shape',marcus:'how many haribo in mouth record',nivaan:'how to get 100 viewers fast',kenneth:'how tall is too short for basketball',dheva:'texture powder vs gel FIGHT',paul:'can i lift a car',sean:'how to say hi',corey:'curl cream emergency',david:'how to start a revolution school'}[k]||'why is my teacher like this';s.lines=['SEARCHES — '+K[k].n.toUpperCase(),L];SFX.blip(900,'square');A[k].ex='shock';await wait(TEST?0:900)}
  classLaugh(800);
  await N('Mrs. Byte laughs at every single one. Her phone is buzzing on the desk the whole lesson. Every time it buzzes she smiles at it like a teenager.');
 },
 async(c,t)=>{
  hold(t,'phone');A[t].pose='phone';
  await N('Mrs. Byte spends the whole lesson texting under her desk, giggling. The class is supposed to be making spreadsheets. Nobody is making spreadsheets.');
  const a=inRoom(c,['nivaan','kenneth']);
  if(a){A[a].pose=null;await walk(a,A[t].x+10,60);
   await say(a,'(reading over her shoulder, whispering to you after) Her boyfriend’s called Rick. US Army surgeon. Stationed in Syria. Can’t video call for “security”. Sent her one photo. It’s a model from a watch ad.','shock');
   await walk(a,c.seats.find(s=>s.who===a)?.x||200,60)}
  await say(t,'(dreamy) Rick says I’m the only good thing in his life. He’s very busy saving lives. Back to your spreadsheets, learners.','love');
  A[t].pose=null;hold(t,null);
 },
 async(c,t)=>{
  await say(t,'How the internet works! Field trip! The server closet!','happy');
  await outTo(c,'closet',(k,i)=>i<0?[220,-1]:[60+i*18,1]);
  pprop({t:'cable',x:40,y:120,w:200,layer:-20});
  await N('The supply closet, which is also the server room. Everybody holds a cable. Mrs. Byte says this is “being the packets”.');
  const v=anyKid(c);
  if(v){SFX.static();SFX.power&&SFX.power();shake(1);pprop({t:'spark',x:A[v].x,y:A[v].y-20,layer:30});pprop({t:'frizz',x:A[v].x,y:A[v].y-30,layer:31});A[v].ex='shock';A[v].pose='hurt';
   await N(K[v].n+' grabs the wrong cable. Every light in the school flickers. When they come back on, '+K[v].n+' is smoking gently and his hair is standing straight up.');
   await say(t,'And THAT, learners, is a packet being dropped!','happy')}
 },
 async(c,t)=>{
  await say(t,'Fundraiser, learners! Rick is stuck at an airport in Turkey. He needs four thousand dollars in gift cards to get home to me. Phones in the box. I’ll sell them.','happy');
  hold(t,'clipboard');
  const ch=await choose(['“Miss, Rick is fake.”','Put your phone in the box.','Ask Nivaan to trace him.']);
  if(ch===0){await say('you','Miss. He’s fake. Rick isn’t real. It’s a scam.');
   await evil(t,'evil');await say(t,'(very quiet) Delete that sentence, learner. Ctrl-Z. NOW.','evil');
   await N('She stands over you until you take it back. Then she goes to the bathroom and doesn’t come out for the rest of the lesson. You can hear her through the wall.');D.f.byteTold=1}
  else if(ch===1){await N('You put your phone in the box. So does everybody. Mrs. Byte kisses the box.')}
  else{const n=here_('nivaan')?'nivaan':anyKid(c);if(n){A[n].pose='type';await say(n,'(typing so fast) Rick’s IP is… it’s in the building. Rick is in THIS building. Rick is—','shock');
   if(!D.dead.kayden){extra('kayden',280,-1);A.kayden.ex='shock';await say(n,'—Rick is KAYDEN.','shock');await say('kayden','(standing up very slowly) The Hittaz needed funding.','scared')}
   D.f.byteRick=1}}
  hold(t,null);
 },
 async(c,t)=>{
  if(D.f.byteRick&&!D.dead.kayden){
   extra('kayden',260,-1);
   await N('Mrs. Byte knows. You can tell because she smiles when Kayden walks in, and she never smiles at Kayden.');
   await say(t,'Kayden, learner. Rick. Darling. Come up to the front and show everyone how a phone works.','evil');
   await walk('kayden',A[t].x+14,50);hold(t,'phone');pose(t,'grab');
   await N('She feeds him his own phone. Slowly. Case and all. The whole class watches it go down. He makes a dial-up noise.');
   SFX.static();A.kayden.ex='hurt';A.kayden.hurt=3;await wait(400);A.kayden.pose='lie';SFX.thud();
   await say(t,'Message received.','evil');hold(t,null);pose(t,null);
   return;
  }
  await say(t,'(red eyes) Rick stopped texting. Rick’s number doesn’t work. Today we learn about grief, learners. The five stages. In Excel.','cry');
  await N('She makes a spreadsheet of her own feelings on the big screen. Column A is “Denial”. Column B is “Rick”. Column C is just “why”.');
  if(D.f.byteTold){const ch=await choose(['Tell her you’re sorry.','Say nothing.']);if(ch===0)await say(t,'(quietly) You told me, learner. You were the only one. I deleted you for it. I’m sorry.','sad')}
 },
 async(c,t)=>{
  const s=pprop({t:'screenbig',x:120,y:30,w:110,h:46,lines:['HELLO LEARNERS','I AM BYTE-BOT','I LOVE YOU ALL'],bg:'#3a1a4a',layer:-150});
  await say(t,'Meet Byte-Bot! I made her this weekend! She’s an AI tutor! She will never, ever leave me!','happy');
  await wait(400);s.lines=['WHO IS RICK','DELETING RICK','DELETING EVERYONE'];s.bg='#6a0a1a';SFX.static();shake(.8);
  const v=anyKid(c);
  if(v){SFX.power&&SFX.power();pprop({t:'spark',x:A[v].x,y:A[v].y-24,layer:30});A[v].ex='dead';dies(v,'lie',{pool:6});await N('Every computer in the room turns on at once. The one at '+K[v].n+'’s desk sends something through the keyboard. He goes stiff and slides off the chair, smoking.')}
  const ok=await mash('Pull the plug!',{need:18,time:4});
  if(ok){SFX.click();s.lines=['GOODBYE','LEARNER'];await N('You yank the power strip out of the wall. Byte-Bot’s last words fade off the screen. Mrs. Byte cries harder than she did for Rick.')}
  else{await N('Byte-Bot locks the doors. It takes Mrs. Byte twenty minutes to turn it off and on again.')}
 }
];

/* =====================================================================
   SWIMMING — MRS. TARN
   ===================================================================== */
const EP_pool=[
 async(c,t)=>{
  await say(t,'Treading water. Five minutes. While I read you drowning statistics. Every statistic was somebody’s swimmer.','evil');
  for(const k of c.kids.filter(here_))A[k].pose='swim';A.you.pose='swim';
  await N('She reads them out in a flat voice from a laminated card. It takes all five minutes. Nobody laughs. Nobody even splashes.');
  await say(t,'Good. Out. Nobody died. That’s the only grade in this room.','sad');
  for(const k of c.kids.filter(here_))A[k].pose=null;A.you.pose=null;
 },
 async(c,t)=>{
  await say(t,'Open water today, swimmers. The reservoir. Pools lie to you. Real water doesn’t care.','evil');
  await outTo(c,'lake',(k,i)=>i<0?[60,1]:[100+i*18,1]);
  pprop({t:'buoy',x:280,y:150,layer:5});
  await N('Fair City Reservoir. Freezing. Mrs. Tarn makes everybody swim out to a buoy and back. She doesn’t get in. She never gets in.');
  for(const k of c.kids.filter(here_))A[k].pose='swim';
  SFX.splat();const v=anyKid(c);
  if(v){A[v].ex='scared';await N('Something big moves under '+K[v].n+'. A shape. Whiskers. The reservoir catfish everybody says is a myth.');
   const ch=await choose(['Swim to '+K[v].n+'.','Swim for shore.']);
   if(ch===0){const ok=await mash('Swim!',{need:16,time:5});await N(ok?'You get to '+K[v].n+' first and drag him back. The catfish follows you all the way to the shallows, watching.':'You’re too slow. The catfish takes '+K[v].n+'’s shoe. Just the shoe. It’ll be back for the rest.')}
  }
  await say(t,'(from the bank, dry, watching the water) That’s why. That’s why I teach it.','sad');
 },
 async(c,t)=>{
  pprop({t:'dummy',x:150,y:150,layer:2});
  await say(t,'CPR. Thirty compressions, two breaths. On the dummy.','yell');
  hold(t,'photo');await N('She’s holding a photo while she watches. A girl in goggles. She doesn’t look at it. She just holds it.');
  const a=inRoom(c,['jacob','paul']);
  if(a){await say(t,'(to '+K[a].n+') The dummy’s too easy. Lie down. Everyone practices on you.','evil');A[a].pose='lie';
   await N('One by one, the class does CPR on '+K[a].n+'. By the eleventh person he has two cracked ribs and a lot of opinions.');A[a].hurt=2;A[a].pose=null}
  const ch=await choose(['Ask who’s in the photo.','Do your thirty compressions.']);
  if(ch===0){await say('you','Miss… who’s that?');await say(t,'Lily. She’d be nineteen. She was good. She was better than me. The lake didn’t care.','cry');await say(t,'Thirty compressions. Go. Don’t you ever let anybody stop breathing in front of you.','sad');D.f.tarnKind=(D.f.tarnKind||0)+1}
  hold(t,null);
 },
 async(c,t)=>{
  await evil(t,'pool');
  await say(t,'Breath-holding. Everybody under. I’ll tell you when to come up.','evil');
  for(const k of c.kids.filter(here_))A[k].pose='swim';
  const v=extra('kaylee',230,-1,{y:150,pose:'swim'});
  await N('She walks along the side of the deep end. When '+(v?K[v].n:'a girl')+' comes up for air, Mrs. Tarn puts her foot on her head and pushes her back down. Gently. Like closing a drawer.');
  if(v){const ch=await choose(['Dive for '+K[v].n+'.','Stay under. Don’t get noticed.']);
   if(ch===0){const ok=await mash('Pull her up!',{need:18,time:4});if(ok){await N('You get her up. She coughs up half the pool on Mrs. Tarn’s shoes. Mrs. Tarn looks at you for a long time.');await say(t,'…Good. Good swimmer.','sad');D.f.tarnKind=(D.f.tarnKind||0)+1}
    else{dies(v,'lie',{pool:0});await N('You don’t get there in time. The bubbles stop. Mrs. Tarn blows her whistle and says “OUT” like nothing happened.')}}
   else{dies(v,'lie',{pool:0});await N('The bubbles stop. Mrs. Tarn takes her foot away. She blows the whistle. “Out.”')}}
  for(const k of c.kids.filter(here_))A[k].pose=null;
 },
 async(c,t)=>{
  await N('The pool has been drained for cleaning. The lesson happens in the empty deep end. It echoes. Mrs. Tarn sits on the bottom with her back against the tiles.');
  await say(t,'She was nine. Lily. I was on the bank. I was on my phone. I looked up and the lake was flat.','cry');
  await say(t,'Every swimmer I teach, I count. Every single one. I count you coming out.','cry');
  const ch=await choose(['Sit down next to her.','Leave her there.']);
  if(ch===0){pose('you','sit');await N('You sit on the bottom of the empty pool with her. One by one, the whole class sits down too. It looks like the start of some kind of ceremony.');D.f.tarnKind=(D.f.tarnKind||0)+2}
  else await N('You leave. When the bell goes, she’s still sitting in the deep end, counting something on her fingers.');
 },
 async(c,t)=>{
  if((D.f.tarnKind||0)>=2){
   await say(t,'Last lesson. I haven’t been in the water in ten years.','sad');
   SFX.splat();A[t].pose='swim';A[t].y=150;
   await N('Mrs. Tarn jumps into the deep end in her tracksuit. She comes up gasping and laughing. Then she says the four words nobody has ever heard her say.');
   await say(t,'CANNONBALL CONTEST. Go!','happy');
   for(const k of c.kids.filter(here_)){SFX.splat();prop({t:'splash',x:A[k].x,y:128});await wait(TEST?0:150)}
   await N('Paul wins. Paul empties a third of the pool. Mrs. Tarn gives him a ten and cries.');
   return;
  }
  await evil(t,'evil');SFX.locker();
  await say(t,'Survival test. The doors are locked. The water is going up. Swim, swimmers. SWIM.','evil');
  for(const k of c.kids.filter(here_))A[k].pose='swim';
  for(let i=0;i<2;i++){const v=anyKid(c);if(!v)break;dies(v,'lie',{pool:0})}
  const ok=await mash('Swim!',{need:24,time:7});
  if(!ok)await die('lane');
  else await N('You’re the last one still treading water when she unlocks the doors. She counts you out. She gets a different number from the one she counted in.');
 }
];
DEATHS.lane={name:'Survival Test',desc:'Mrs. Tarn counted you in. She didn’t count you out.',hint:'Swimming, the last lesson. Ask about the photo before then.'};

/* =====================================================================
   ASSEMBLY — MR. ADAM
   ===================================================================== */
const EP_hall=[
 async(c,t)=>{
  const s=pprop({t:'screenbig',x:110,y:20,w:110,h:50,lines:['BE KIND','TO EACH OTHER'],layer:-150});
  await say(t,'Good afternoon, kids! Today’s assembly is about kindness! Kindness is—','happy');
  SFX.beep();s.lines=['J: I’m taking the dog.','J: And the good pans.','J: Don’t call me.'];s.bg='#2a2a2a';
  await N('His phone is still connected to the projector. His texts come up on the big screen, one at a time, in front of the whole school.');
  classLaugh(800);
  await say(t,'(unplugging everything, sweating) Kindness is… kindness is what we… everybody go back to class early!','scared');
 },
 async(c,t)=>{
  SFX.bell();SFX.bell();
  await say(t,'Fire drill, kids! Everybody to the bus loop! This is a drill! Probably!','scared');
  await outTo(c,'bus',(k,i)=>i<0?[60,1]:[100+i*16,1]);
  await N('The whole assembly lines up in the bus loop. Mr. Adam walks to his car to “get the clipboard”. He gets in. He locks the doors. He sits there.');
  await walk(t,300,60);A[t].pose='sit';
  const ch=await choose(['Knock on his car window.','Leave him.']);
  if(ch===0){await walk('you',280,90);SFX.click();await say(t,'(winding the window down an inch) She took the dog, kiddo. She took the good pans and the dog.','cry');await say('you','Sir, do you want me to tell everyone the drill’s over?');await say(t,'…Yeah. Yeah, tell them it went great. Tell them I said great.','sad');D.f.adamKind=(D.f.adamKind||0)+1}
  else await N('Forty minutes later somebody goes and gets Ms. Sherman. She opens his car door with a coat hanger and pulls him out by the tie.');
 },
 async(c,t)=>{
  await say(t,'Staff talent show! To boost morale! Whose morale? Everyone’s! Mine!','happy');
  put('coach',150,-1,{y:118});await say('coach','STRONGMAN.','yell');
  const v=anyKid(c);if(v){A[v].pose=null;await walk('coach',A[v].x-10,90);pose('coach','up');await tw(A[v],{z:30},300);await N('Coach lifts '+K[v].n+' over his head with one hand. The crowd goes wild. He does a lap. On the third lap he trips on a cable.');SFX.thud();shake(1.2);await tw(A[v],{z:0},200);A[v].pose='lie';A[v].hurt=3;pose('coach',null)}
  await say(t,'(to the crowd, clapping too hard) Wonderful! Let’s hear it for the nurse!','scared');
 },
 async(c,t)=>{
  await say(t,'Mental health assembly! I hired a special guest! Please welcome… a mental health clown!','happy');
  if(typeof kimArrive==='function')return kimArrive(c);
 },
 async(c,t)=>{
  await say(t,'Inspection rehearsal! When the inspectors come, everybody smiles. Let’s practice smiling. Smile! SMILE!','yell');
  for(const k of c.kids.filter(here_))A[k].ex='happy';
  put('sherman',300,-1,{y:118});await walk('sherman',180,60);
  await say('sherman','(taking the microphone out of his hand) Thank you, Mr. Adam. Children. Anyone who doesn’t smile on Friday will be… remembered.','evil');
  await N('Mr. Adam stands behind her holding nothing. He looks at his empty hand like he’s not sure what used to be in it.');
  const ch=await choose(['Clap for Mr. Adam. Loud. On your own.','Smile.']);
  if(ch===0){SFX.cheer();await N('You clap. Just you. Then David. Then Hasan. Then the whole hall, for no reason anyone can explain. Mr. Adam goes red to the ears.');D.f.adamKind=(D.f.adamKind||0)+1}
  await walk('sherman',340,60);remove('sherman');
 },
 async(c,t)=>{
  if((D.f.adamKind||0)>=2){
   await say(t,'Last assembly before the inspection, kids. I was going to read you the rules. I’m not going to.','sad');
   await say(t,'I just want to say: you’re all still here. That’s it. That’s the speech. That’s the hardest thing anybody does in this building and you all do it every day.','cry');
   SFX.cheer();await N('Somebody starts clapping. It turns into a standing ovation. Mr. Adam takes off his tie and throws it into the crowd like a rock star. Arjun catches it. Arjun cries.');
   return;
  }
  await say(t,'(laughing at nothing) Last assembly! I’m going to sing! Nobody can stop me!','happy');
  await N('He sings “My Heart Will Go On” for eleven minutes, into a microphone that isn’t on, while the teachers watch from the side of the hall like vultures.');
  SFX.bang&&SFX.bang();await N('Halfway through the second chorus a light falls from the ceiling and smashes next to him. He doesn’t stop singing. He’s crying. He keeps singing.');
 }
];

/* =====================================================================
   PLAYING THEM
   ===================================================================== */
const EPISODES={english:EP_english,trailer:EP_trailer,gym:EP_gym,chem:EP_chem,history:EP_history,ict:EP_ict,pool:EP_pool,hall:EP_hall};
const ENCORE={
 english:'Ms. Balduf sits at her desk the whole lesson writing letters to an address nobody gives her. Nobody makes a sound.',
 trailer:'Ms. Sherman does the register three times. Every time she gets to the gap where somebody used to sit, she stops and smiles.',
 gym:'Coach makes everybody run. He runs with you, for once. He doesn’t say a word the whole time.',
 chem:'Mr. Voss labels jars all lesson. Some of them have your classmates’ names on. He hums.',
 history:'A substitute reads from the textbook. Mr. Grieve’s sword is still hanging on the wall. Somebody has polished it.',
 ict:'Mrs. Byte sits with her back to the class, typing to somebody. She laughs once. It isn’t a nice laugh.',
 pool:'Mrs. Tarn counts you all in and counts you all out. The numbers match. She seems almost disappointed.',
 hall:'Mr. Adam reads the fire safety rules out loud for the whole assembly. His voice cracks on “stop, drop and roll”.'
};
const _gl2=genericLesson;
genericLesson=async function(room){
 const eps=EPISODES[room],t=TEACH[D.period]&&TEACH[D.period][room];
 if(!eps||!t)return _gl2(room);
 const c=await classIn(room);
 if(A[t])face(t,1);
 const n=LN()[room]||0;
 if(n<eps.length){
  try{await eps[n](c,t)}catch(e){if(e===DEATH||e===ENDDAY)throw e;console.error(e);if(TEST&&TEST.err)TEST.err(e)}
 }else await N(ENCORE[room]);
 LN()[room]=n+1;save();
 if(D.dead&&c.kids)c.kids=c.kids.filter(k=>!D.dead[k]);
 if(ROOM===room)await whisper(c);
 if(typeof adamBurst==='function'&&room!=='hall')await adamBurst();
 await classOut(c);
};
/* for the tests: run lesson n of a subject */
function playEpisode(room,n){const eps=EPISODES[room];return eps&&eps[n]}
