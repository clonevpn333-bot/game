'use strict';
/* =====================================================================
   HIGHSCHOOL — MR. KIM
   There’s a new math teacher in town. He does magic. He asks for a
   volunteer. Alex goes into the box. Mr. Kim wheels the box out of the
   room. Alex doesn’t come back for days. When he does, his clothes are
   ripped to shreds and he’s wearing clown makeup, and he won’t stop
   smiling.
   ===================================================================== */
K.kim={n:'Mr. Kim',col:'#c03050',skin:'#e8c8a0',hair:'#141010',hs:'short',top:'#e8e0c8',pants:'#3a3a48',tie:1,adult:1,seed:151,v:260,vw:'triangle'};K.kim.id='kim';
VOICE.kim={me:'Mr. Kim',pet:'little number',pets:'little numbers',his:'his',sir:'Sir'};
if(typeof TEACHERS!=='undefined'&&!TEACHERS.includes('kim'))TEACHERS.push('kim');
CHAT.kim=['Hello, little number! Did you know zero is the funniest number? It’s got nothing to lose!','Math is just magic that’s embarrassed about it.','(squeezing a little red rubber nose in his pocket, over and over) Honk.'];
ITEMS.nose='A red clown nose (from the bottom of Mr. Kim’s magic box)';

/* the box he wheels about */
{const _dp=drawProp;drawProp=function(p){
 if(p.t==='magicbox'){const x=Math.round(p.x),y=Math.round(p.y),o=p.open||0;
  R(x-10,y-34,20,34,'#1a1a3a');R(x-9,y-33,18,32,'#2a2a6a');for(let i=0;i<5;i++)R(x-7+((i*5)%14),y-30+i*6,2,2,'#f0d050');
  if(o>0){R(x-9,y-33,Math.round(18*o),32,'#0a0a14')}
  R(x-12,y,24,2,'#6a6a72');R(x-10,y+2,3,3,'#3a3a3a');R(x+7,y+2,3,3,'#3a3a3a');
  pxc('MATH',x,y-42,'#f0d050');pxc('MAGIC',x,y-50+0,'#f0d050');return}
 if(p.t==='van'){const x=Math.round(p.x),y=Math.round(p.y);R(x,y-28,88,26,'#e8e0d0');R(x+64,y-22,24,12,'#9ac0d8');R(x,y-28,88,2,'#c8c0b0');
  for(let i=0;i<6;i++)R(x+4+i*9,y-24,6,6,['#e04060','#40a0e0','#e0c040','#60c060'][i%4]);
  px('KIM’S KIDDIE PARTIES',x+3,y-16,'#c03050');px('MAGIC·MATH·BALLOONS',x+3,y-9,'#3a3a6a');
  R(x+8,y-3,12,6,'#1a1a1a');R(x+64,y-3,12,6,'#1a1a1a');if(p.rock)R(x,y-29,88,1,Math.sin(T*20)>0?'#c03050':'#e8e0d0');return}
 if(p.t==='balloondog'){const x=Math.round(p.x),y=Math.round(p.y);R(x-4,y-4,8,3,'#e04060');R(x+3,y-7,3,3,'#e04060');R(x-4,y-1,2,3,'#e04060');R(x+2,y-1,2,3,'#e04060');R(x-6,y-6,2,2,'#e04060');return}
 return _dp(p)}}
/* Alex, after */
{const _dh=drawHead;drawHead=function(k,x,hy,d,o){_dh(k,x,hy,d,o);if(!k.clown||(o&&(o.noHead||o.crushed)))return;
 const ex=x+d;g.globalAlpha=.85;R(x-5,hy+2,11,8,'#f4f4f0');g.globalAlpha=1;
 R(ex-4,hy+3,2,1,'#3a6ae0');R(ex-4,hy+5,2,1,'#3a6ae0');R(ex+2,hy+3,2,1,'#3a6ae0');R(ex+2,hy+5,2,1,'#3a6ae0');
 R(ex-1,hy+6,2,2,'#e02020');R(ex-3,hy+9,7,1,'#e02020');R(ex-4,hy+8,1,1,'#e02020');R(ex+4,hy+8,1,1,'#e02020');
 if(Math.sin(T*1.3+k.seed)>.97){R(ex+5,hy+5,1,3,'#f4f4f0')}}}
{const _dk=drawKid;drawKid=function(k,x,y,o){const r=_dk(k,x,y,o);if(k.ripped&&r&&o&&!(o.pose==='lie')){const G=kidGeom(k,o),bx=Math.round(x)-(G.bw>>1),by=r.by;
 R(bx+1,by+2,2,3,k.skin);R(bx+G.bw-3,by+5,2,2,k.skin);R(bx+2,by+8,3,1,k.skin);R(bx+G.bw-2,by+1,1,4,'#1a1a1a');R(bx,by+6,1,3,'#1a1a1a');
 R(bx+1,by+G.bodyH+2,1,3,k.skin);R(bx+G.bw-2,by+G.bodyH+4,2,2,k.skin);R(bx+3,by+4,1,1,BLOOD[1])}return r}}
const alexGone=()=>!!(D&&D.f&&D.f.alexGone&&!D.f.alexBack);
const alexClown=()=>!!(D&&D.f&&D.f.alexBack);
{const _put=put;put=function(id,x,dir,o){const a=_put(id,x,dir,o);if(id==='alex'&&a&&alexClown())a.k=Object.assign({},a.k||K.alex,{clown:1,ripped:1});return a}}
/* while he’s gone, he’s gone: no seat, no hallway, nothing */
{const _rf=rosterFor;rosterFor=function(per,room){const l=_rf(per,room);return alexGone()?l.filter(e=>e[0]!=='alex'):l}}
{const _ck=classKids;classKids=function(room){const l=_ck(room);return alexGone()?l.filter(k=>k!=='alex'):l}}

mission('kim',{name:'Mr. Kim',icon:'🤡',who:['alex','dheva','kim'],
 goal:'Find out what Mr. Kim did with Alex.',
 blurb:'There’s a new math teacher in town. Mr. Kim. He does magic tricks. He asked for a volunteer, and Alex got in the box.',
 parts:['Mr. Kim’s magic trick','Ask Dheva where Alex is','Look inside the magic box','Find Mr. Kim’s van','Alex comes back','Mr. Kim'],
 tips:['Break or lunch, the Front Hall. Mr. Kim is doing magic for a crowd.','Break or lunch, the cafeteria. Dheva hasn’t heard from Alex.','The Main Hall (Front Hall, walk up into the MAIN HALL door). The box is behind the stage.','After school, Fair City Mall rooftop parking. Look for a van with balloons on it.','Before school, break or lunch: the bus loop. Alex is back. Something’s wrong.','After school, rooftop parking. Alex wants to go back to the van. With you.'],
 variants:{pin:'Alex did it',nose:'Honk',police:'The police'}});
DEATHS.honk={name:'Honk',desc:'Mr. Kim had a balloon animal in one hand and a hammer in the other. You watched the wrong hand.',hint:'Mr. Kim. Don’t open the van on your own.'};

/* 1 — the trick (assembly, or the Front Hall) */
async function kimArrive(c){
 if(D.f.kim1||D.dead.alex)return;
 const box=pprop({t:'magicbox',x:170,y:150,layer:4});
 if(!A.kim)put('kim',-14,1,{y:146});await walk('kim',140,70);face('kim',1);
 extra('alex',220,-1);extra('dheva',240,-1);
 await say('kim','Hello, little numbers! I’m Mr. Kim! New math teacher! Math is MAGIC! And I need a volunteer!','happy');
 await N('Mr. Kim has a smile that goes further round his face than smiles are supposed to go. Nobody puts their hand up.');
 if(A.dheva){await say('dheva','(shoving Alex forward) He’ll do it. He’s brave. He’s a striker.','smirk');}
 await say('alex','(laughing, embarrassed) Bro. BRO. Okay. Fine. If I get sawed in half I want it on my headstone that Dheva did this.','laugh');
 await walk('alex',170,50);A.alex.back=1;await tw(box,{open:1},200);await tw(A.alex,{alpha:0},250);A.alex.back=0;await tw(box,{open:0},200);
 await N('Alex steps into the tall black box. Mr. Kim closes the door. He taps it three times with a wand that has a calculator on the end.');
 await say('kim','Seven times eight is… FIFTY-SIX! And Alex is… on his way to the NEXT DIMENSION! The dimension of MATH!','happy');
 pose('kim','drag');
 await Promise.all([walk('kim',340,50),tw(box,{x:356},Math.max(400,(340-A.kim.x)/50*1000))]);box.hide=1;remove('kim');
 if(A.alex)delete A.alex;
 SFX.cheer();await N('He wheels the box out of the room, still talking, and the door swings shut behind him. Everybody claps, because that’s what you do at the end of a magic trick.');
 await wait(600);
 await N('You wait for him to wheel the box back in. He doesn’t. Nobody does.');
 if(A.dheva)await say('dheva','(still clapping, slower) …That’s where they bring him back. Right? That’s the part where they bring him back.','scared');
 D.f.kim1=1;D.f.alexGone=cal();part('kim',1);
}
hook({mis:'kim',period:[2,4],room:'hallb',who:'kim',label:'Watch Mr. Kim’s magic trick',look:{hold:'flower'},cond:()=>cal()>=3&&!D.f.kim1&&!D.dead.alex,run:async()=>{
 const cast={you:[90,1,{y:156}],kim:[140,1,{y:146}]};
 for(const [k,x] of[['kid1',60],['kid2',260],['marcus',280],['kid3',300]])if(!D.dead[k])cast[k]=[x,-1,{y:146}];
 scene('hallb',cast,true);
 await N('A crowd in the Front Hall. A man in a sweater vest and a red tie is pulling a string of handkerchiefs out of a kid’s ear. They’re all the colors of a math textbook.');
 await kimArrive({kids:Object.keys(cast)});
 return 'stay';
}});
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);if(D&&!D.weekend&&room==='hallb'&&[2,4].includes(D.period)&&cal()>=3&&!D.f.kim1&&!A.kim&&!D.dead.alex){put('kim',150,1,{y:146,hold:'flower'})}return r}}

/* 2 — Dheva */
hook({mis:'kim',period:[2,4],room:'canteen',who:'dheva',label:'Ask Dheva where Alex is',look:{pose:'phone',ex:'scared'},cond:()=>D.f.kim1&&!D.f.kim2&&!D.dead.dheva,run:async()=>{
 scene('canteen',{dheva:[160,-1,{y:148,pose:'phone',ex:'scared'}],you:[132,1,{y:154}]},true);
 await say('dheva','He didn’t come home. His mom called MY mom. His phone’s going straight to voicemail. We’re a package. Packages don’t just— split up.','scared');
 await dms('Alex ⚽','last seen yesterday',[['them','bro this guy is so weird','yesterday 13:02'],['them','hes doing makeup on me??','yesterday 13:40'],['them','🤡','yesterday 14:15']],{});
 await say('dheva','That’s the last thing he sent. A clown. Just the clown. Alex doesn’t even USE emojis. He thinks they’re “for girls and dads”.','cry');
 await say('dheva','Mr. Kim left his magic box behind the stage in the Main Hall. I’m scared of it. You go look. Please. I’ll owe you forever.','scared');
 D.f.kim2=1;part('kim',2);
}});
/* 3 — the box (an investigation) */
spot({room:'hall',x:286,y:120,label:'Look inside Mr. Kim’s magic box',short:'BOX',sparkle:1,mis:'kim',cond:()=>D.f.kim2&&!D.f.kim3,run:async()=>{
 const box=pprop({t:'magicbox',x:286,y:122,layer:2});
 await walk('you',270,70);pose('you','reach');await tw(box,{open:1},300);
 await N('Behind the stage curtain, the black box. You open it. It’s empty. You knock on the floor of it. The floor knocks back hollow.');
 SFX.click();await N('A false bottom. A trapdoor down under the stage. Caught on a nail at the edge: a strip of blue soccer jersey, number 9. And a red rubber nose.');
 give('nose');pose('you',null);
 await N('Somewhere under the stage, very faint, something honks. Once.');
 D.f.kim3=1;part('kim',3);
 return 'stay';
}});
/* 4 — the van */
hook({mis:'kim',period:8,room:'carpark',who:'auto',cond:()=>D.f.kim3&&!D.f.kim4,run:async()=>{
 scene('carpark',{you:[30,1,{y:156}]},true);const v=pprop({t:'van',x:180,y:160,layer:5,rock:1});cue('tension');
 await N('Rooftop parking. In the corner, under a broken light, a white van with balloons painted on it. KIM’S KIDDIE PARTIES. MAGIC · MATH · BALLOONS.');
 await walk('you',170,50);
 await N('It’s rocking. Just a little. From inside, every few seconds: honk. Honk. And somebody humming the times tables.');
 const c=await choose(['Look through the back window.','Bang on the door and shout for Alex.','Call the police.']);
 if(c===0){pose('you','reach');await N('Through the dirty glass: a lightbulb mirror. A makeup kit. Soccer kit cut into strips. A row of photos of kids in clown makeup, all smiling the same smile.');pose('you',null)}
 else if(c===1){SFX.bang&&SFX.bang();await say('you','ALEX! ALEX!');await N('The honking stops. The humming stops. Everything inside the van goes completely still.')}
 else{await N('You call. A bored voice asks if it’s an emergency. You say a man has your friend in a van. She asks if the man is a relative. You hang up.')}
 put('kim',340,-1,{y:150,hold:'flower'});await walk('kim',A.you.x+16,70);face('kim','you');
 await say('kim','Hello, little number. Lost?','happy');
 hold('kim',null);const bd=pprop({t:'balloondog',x:A.kim.x-6,y:A.kim.y-24,layer:30});
 await say('kim','Here. A balloon dog. Alex is fine. Alex is LEARNING. Some kids are learners and some are… volunteers.','happy');
 const r=await choose(['Take the balloon dog. Walk away.','Hit him.']);
 if(r===1){await hit('you','kim',{blood:2});await say('kim','(not moving, still smiling, blood on his teeth) Seven times eight is fifty-six, little number. Count them. Fifty-six days till you’re forgotten.','evil');
  const ok=await mash('RUN',{need:14,time:3});if(!ok){SFX.crunch();await die('honk')}}
 bd.hide=1;await walk('you',-20,90);
 D.f.kim4=1;part('kim',4);
}});
/* 5 — he’s back */
hook({mis:'kim',period:[0,2,4],room:'bus',who:'auto',cond:()=>D.f.alexGone&&!D.f.alexBack&&(D.f.kim4||cal()>=D.f.alexGone+3)&&cal()>D.f.alexGone,run:async()=>{
 D.f.alexBack=cal();
 const cast={you:[60,1,{y:156}],alex:[200,-1,{y:150,pose:'sit'}]};if(!D.dead.dheva)cast.dheva=[-14,1,{y:150}];
 scene('bus',cast,true);cue('evil');
 await N('There’s somebody sitting on the curb of the bus loop. Kids are walking a long way round him.');
 await N('It’s Alex. His jersey is ripped to ribbons. His shorts are torn. His face is painted white, with a big red smile drawn over his real mouth, and little blue diamonds over his eyes.');
 A.alex.pose=null;await tw(A.alex,{y:146},200);
 await say('alex','(smiling, not blinking) Honk.','happy');
 if(A.dheva){await walk('dheva',170,110);await say('dheva','ALEX. Alex, it’s me. It’s Dheva. Where were you? Where WERE you?','cry');
  await say('alex','(head tilted, still smiling) Seven times eight is fifty-six. Seven times nine is sixty-three. Seven times ten is… honk.','happy');
  pose('dheva','hug');pose('alex','hug');await N('Dheva hugs him. Alex doesn’t hug back. Then, very slowly, he does. He holds on so hard his paint smears on Dheva’s hoodie.');pose('dheva',null);pose('alex',null)}
 await say('alex','(to you, very quietly, the smile not moving) He’s still got the others. In the van. Under the stage. I counted. I’m good at counting now.','scared');
 part('kim',5);
 return 'stay';
}});
/* the rest of the week, Alex is… like this */
CHAT.alex=(CHAT.alex||[]).slice();
{const _c=chat;chat=async function(id){if(id==='alex'&&alexClown()){const L=D.done.kim?['(the paint’s mostly off now, still a bit on his ears) I’m okay. I’m okay. Dheva won’t let me out of his sight. It’s nice, actually.','(kicking a ball against a wall) Still got my left foot. He didn’t get my left foot.']:['Honk.','(smiling) Did you know there are fifty-six ways to fold a person? He showed me forty.','(whispering) Don’t go in the Main Hall. Under the stage, it’s all balloons.'];await say('alex',pick(L),'happy');return}return _c(id)}}
/* 6 — Mr. Kim */
hook({mis:'kim',period:8,room:'carpark',who:'auto',cond:()=>D.f.alexBack&&D.f.alexBack<=cal()&&!D.done.kim&&!D.dead.alex&&(D.mp.kim||0)>=5,run:async()=>{
 const cast={you:[40,1,{y:156}],alex:[70,1,{y:150}]};if(!D.dead.dheva)cast.dheva=[20,1,{y:150}];
 scene('carpark',cast,true);const v=pprop({t:'van',x:180,y:160,layer:5});cue('tension');
 await N('Rooftop parking, after school. Alex walked here without saying a word. You and Dheva followed him. He’s still got the paint on.');
 put('kim',214,-1,{y:150});A.kim.ex='happy';
 await say('kim','(at the back of the van, unloading balloons) Alex! My best volunteer! You came back for an encore!','happy');
 await say('alex','(walking toward him, smiling exactly like him) Honk.','happy');
 const c=await choose([{t:'Let Alex do what he came to do.',tag:'🩸'},{t:'Pull Alex back. Call the police.'},{t:'Put the red nose on Mr. Kim.',tag:'🤡',dis:!has('nose'),why:'no nose'}]);
 if(c===0){
  await walk('alex',A.kim.x-12,60);hold('alex','plank');
  await N('There’s a giant wooden juggling pin in the back of the van. Alex picks it up the way he picks up nothing else: like a striker who has finally found the ball.');
  pose('alex','overhead');await wait(200);SFX.crunch();shake(1.5);flash('#a00010',.4);blood(A.kim.x,A.kim.y-26,60,1,120,A.kim.y+2);
  for(let i=0;i<8;i++)prop({t:'heart',x:A.kim.x+(i-4)*4,y:A.kim.y-30});
  kill('kim','lie',{pool:40,bleed:5});pose('alex',null);
  await N('The first swing knocks Mr. Kim’s smile off. The second sets off a confetti cannon in his pocket. Blood and confetti everywhere. A very bad birthday.');
  await say('alex','(dropping the pin, the paint running) …Fifty-six.','cry');
  if(A.dheva){await walk('dheva',A.alex.x-10,90);await N('Dheva gets a pack of baby wipes out of his bag, because Dheva always has baby wipes, and starts wiping Alex’s face. Under the white, Alex is crying.');await say('alex','I’m still in here, bro. I’m still in here.','cry');await say('dheva','I know. Package. We’re a package.','cry')}
  SFX.bang&&SFX.bang();await N('Inside the van, something bangs on the wall. Then something else. Then a lot of voices, all honking, all at once, and then one of them shouts “HELP”.');
  await complete('kim','pin');return;
 }
 if(c===2){take('nose');await walk('you',A.kim.x-10,90);pose('you','reach');
  await N('You walk right up to him and push the red nose onto his face. It squeaks.');
  await say('kim','(very quietly, the smile slipping for the first time) …Oh. Oh no. You’ve made me a volunteer.','scared');
  await N('Alex honks. Dheva honks. You honk. The van honks back. The back doors burst open and eleven kids in clown makeup pour out, like a magic trick in reverse.');
  await N('They don’t say anything. They just walk him into the van, very calmly, and close the doors. The van starts rocking. It doesn’t stop.');
  pose('you',null);await complete('kim','nose');return;
 }
 await walk('you',A.alex.x+6,110);pose('you','grab');
 await say('you','Alex. No. Not like this. We call somebody.');
 await N('The smile wobbles. Alex lets you pull him back. Mr. Kim waves and drives down the ramp, honking. Two police cars pass him going the other way.');
 await say('alex','(very small) He’ll do a new town. He does a new town every year.','cry');
 pose('you',null);await complete('kim','police');
}});
Object.assign(INTEL,{kimBox:'Mr. Kim’s magic box has a trapdoor under the Main Hall stage.'});
