'use strict';
/* =====================================================================
   HIGHSCHOOL — THE LONG ONES
   • Big quests take days: one step per school day (D.f.pd_<mission>).
   • Corey & Abby: she has a boyfriend. Brett. Corey has a thought about
     him. It won’t leave. (“Intrusive Thoughts”, woven through The
     Window Seat, across both weeks.)
   • Sean & Stella: “Long Distance”, week two.
   • Hasan & Darren: “Step Eleven”, after the milkshake.
   • You see how quests turned out: couples together around school,
     posters, gossip, and people talk about what happened.
   • Quests reset every two weeks (a new run). Deaths reset every weekend.
   ===================================================================== */
const LONG=['window','brett','instella','striketwo','toby','farewell','darren','stepeleven','smallhours'];
const pdOf=m=>(D&&D.f)?D.f['pd_'+m]:null;
const stepToday=m=>pdOf(m)===cal();
const doneBefore=m=>!!(D&&D.done&&D.done[m]&&pdOf(m)!=null&&pdOf(m)<cal());
/* remember the day of every step */
{const _pt=part;part=function(mis,n,quiet){const before=(D&&D.mp&&D.mp[mis])||0;const r=_pt(mis,n,quiet);if(D&&D.f&&n>before)D.f['pd_'+mis]=cal();return r}}
/* the HUD says when it’s not today */
{const _an=activeNext;activeNext=function(){return _an().map(a=>LONG.includes(a.m)&&a.m!=='window'&&stepToday(a.m)?Object.assign({},a,{tip:'Not today. Next school day: '+a.tip}):a)}}

/* ---------- art ---------- */
{const _dh=drawHeld;drawHeld=function(it,x,y,d){
 if(it==='shovel'){R(x-1,y-14,2,16,'#7a5a3a');R(x-3,y-15,6,2,'#5a4a3a');R(x-3,y+2,6,6,'#8a8e98');R(x-2,y+7,4,1,'#6a6e78');return}
 if(it==='strip'){R(x-2,y-6,5,14,'#f4f0e6');for(let i=0;i<4;i++)R(x-1,y-5+i*3.4,3,3,['#c0408a','#e8a040','#5a7ac8','#3a3a48'][i]);return}
 if(it==='chalk'){R(x-1,y-2,3,5,'#f4f4f0');return}
 return _dh(it,x,y,d)}}
{const _dp=drawProp;drawProp=function(p){
 const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='poster'){R(x-9,y-12,18,24,'#f4f0e6');R(x-9,y-12,18,1,'#c8c4b8');pxc('MISSING',x,y-11,'#c02020');R(x-5,y-4,10,9,'#e0c0a0');R(x-5,y-4,10,3,'#c8a060');R(x-3,y,2,1,'#2a2a2a');R(x+1,y,2,1,'#2a2a2a');R(x-2,y+3,4,1,'#fff');if(p.stache)R(x-3,y+2,6,1,'#1a1a1a');R(x-6,y+7,12,1,'#8a8a8a');R(x-6,y+9,8,1,'#8a8a8a');return}
 if(p.t==='hole'){const w=Math.round(30*(p.k==null?1:p.k));if(w<2)return;g.globalAlpha=.9;for(let dy=-3;dy<=3;dy++){const hw=Math.round(w/2*Math.sqrt(1-(dy/3.5)**2));R(x-hw,y+dy,hw*2,1,dy<0?'#2a1a10':'#1a0e08')}g.globalAlpha=1;for(let i=0;i<w/3;i++)R(x-w/2-6+((i*7)%(w+12)),y-4+(i%3),3,2,'#5a3a22');return}
 if(p.t==='mound'){const k=p.k==null?1:p.k;if(k<=0)return;const w=Math.round(34*Math.min(1,k*1.2)),h=Math.max(1,Math.round(7*k));for(let dy=0;dy<h;dy++){const hw=Math.round(w/2*Math.sqrt(1-(dy/(h+.5))**2));R(x-hw,y-dy,hw*2,1,dy===h-1?'#b07a48':dy%2?'#8a5a34':'#7a4e2c')}g.globalAlpha=.35;R(x-w/2-2,y+1,w+4,1,'#000');g.globalAlpha=1;if(p.leaves)for(let i=0;i<14;i++)R(x-15+((i*11)%30),y-h+((i*5)%h)-1,2,1,['#a85a2a','#c8822a','#7a6a2a'][i%3]);return}
 if(p.t==='shovelg'){R(x-8,y,16,1,'#7a5a3a');R(x+8,y-2,6,4,'#8a8e98');return}
 if(p.t==='car'){const c=p.col||'#8a2030';R(x,y-12,62,12,c);R(x+12,y-20,34,9,c);R(x+14,y-19,14,7,'#8ab0d0');R(x+30,y-19,14,7,'#8ab0d0');
  if(p.driver){R(x+36,y-18,5,6,'#3a2a22');R(x+36,y-19,5,2,'#c8a040')}if(p.pass){R(x+18,y-18,5,6,'#f0c8a8');R(x+17,y-19,7,3,'#f0d070')}
  R(x+6,y-2,12,6,'#1a1a1a');R(x+44,y-2,12,6,'#1a1a1a');R(x+9,y,6,2,'#8a8a8a');R(x+47,y,6,2,'#8a8a8a');R(x+60,y-10,2,3,'#f0e0a0');return}
 if(p.t==='chalkwords'){const n=Math.floor((p.k||0)*(p.lines||6));g.globalAlpha=.85;for(let i=0;i<n;i++){const yy=y+i*4;for(let j=0;j<22;j++){if(hsh(i*31+j)<.25)continue;R(x+j*12+(i%2)*4,yy,8+((i+j)%3)*2,1,i===n-1&&p.last?'#f0a0c0':'#f4f4f0')}}g.globalAlpha=1;return}
 if(p.t==='list'){R(x-6,y-8,12,16,'#f4f8fa');R(x-6,y-8,12,16,'rgba(150,200,255,.25)');for(let i=0;i<6;i++)R(x-4,y-6+i*2.4,8-(i===4?6:0),1,'#3a6ad8');return}
 return _dp(p)}}

K.brett={n:'Brett',col:'#a83030',skin:'#f0c8a8',hair:'#c8a060',hs:'fade',top:'#9a1a20',pants:'#2a3050',zip:1,seed:131,v:190};K.brett.id='brett';
CHAT.brett=['What are you looking at? Keep walking.','Tell your little friend Curls to stop liking her posts. I see everything.','Babe, phone. Now. ...Oh. You’re not her.'];
K.stellamom={n:'Stella’s Mom',col:'#8a6a8a',skin:'#f0c8a8',hair:'#e0c060',hs:'bob',top:'#6a5a7a',pants:'#3a3a4a',adult:1,girl:1,seed:133,v:420};K.stellamom.id='stellamom';

/* one hook, several places */
function hooks(o,places){for(const [period,room,who] of places)hook(Object.assign({},o,{period,room,who:who||o.who}))}
/* the room you’re in, at a sensible size */
const here=()=>D.room||ROOM;

/* =====================================================================
   COREY & ABBY — INTRUSIVE THOUGHTS
   ===================================================================== */
dropHooks('corey');delete MIS.corey;
mission('brett',{name:'Intrusive Thoughts',icon:'🪦',who:['corey','abby'],
 blurb:'Abby has a boyfriend. His name is Brett. He has a car, a letterman jacket and a hand that is always somewhere on her. Corey has a thought about him. The thought won’t leave.',
 parts:['A break or lunch: the boyfriend','Another day: the thought','Another day: where Brett runs','Another day, home time: the woods','Another day: Abby, after'],
 tips:['After Corey’s first look in the Trailer (The Window Seat): break or lunch, the cafeteria. Abby is saving a seat.',
  'Break (cafeteria) or lunch (Chem Lab). Corey isn’t okay.',
  'Break or lunch, main corridor. Nivaan can find anyone. Then take the shovel from the groundskeeper’s shed on the field.',
  'Home time, bus loop. Walk into the woods with Corey. You need the shovel from the field shed (break or lunch).',
  'Before school (main corridor), break or lunch (cafeteria). Abby is sitting on her own.'],
 variants:{corey:'Corey did it',you:'You did it'}});
Object.assign(INTEL,{brettRun:'Brett runs the trail through the woods behind the field every day at home time. Alone. Earbuds in.'});
DEATHS.brett={name:'Lacrosse',desc:'Brett had a stick in his bag. He was faster than you.',hint:'Intrusive Thoughts. Don’t walk into the woods without the shovel.'};

/* 1. the boyfriend */
hook({mis:'brett',period:[2,4],room:'canteen',who:'abby',label:'Ask Abby who she’s saving the seat for',look:{pose:'sit',ex:'sad'},
 cond:()=>winStage()>=1&&!(D.f.br>=1)&&!D.dead.abby&&!D.dead.corey,run:async()=>{
 scene('canteen',{abby:[196,-1,{y:150,pose:'sit',hold:'book'}],corey:[60,1,{y:146,hold:'tray'}],you:[166,1,{y:154}]});cue('canteen');
 await N('Abby is at the end of a cafeteria table with her sketchbook. The chair next to her is empty. She keeps looking at the door.');
 await say('you','Who’s the seat for?');
 await say('abby','(not looking up) My boyfriend.','sad');
 hold('corey',null);SFX.thud();prop({t:'chips',x:64,y:150,layer:5});A.corey.ex='shock';
 await N('Across the cafeteria, Corey drops his tray. Nobody else hears it. He hears it.');
 put('brett',334,-1,{y:150});await walk('brett',214,80);A.brett.pose='sit';A.brett.y=150;face('brett',-1);
 await N('A tall junior in a red letterman jacket walks through the cafeteria like he owns it, skips the line and drops into the empty chair.');
 await say('brett','Babe. Phone.','smirk');
 hold('abby',null);await wait(200);hold('brett','phone');A.brett.pose='phone';
 await say('brett','Who’s “C”? Somebody called “C” liked your bird drawing. At one in the morning. Who’s up at one in the morning liking birds?','angry');
 await say('abby','Nobody. A kid from math.','scared');
 await say('brett','Block him.','smirk');
 pose('abby','reach');await wait(200);A.brett.pose='grab';A.abby.ex='hurt';
 await N('When she reaches for her phone, he catches her wrist and holds it. Not hard. Just long enough. He’s smiling the whole time.');
 const c=await choose(['Walk over and tell him to let go.','Stay out of it. Watch Corey.']);
 if(c===0){
  await walk('you',A.brett.x+16,80);face('you',-1);
  await say('you','Hey. Let go of her.');
  A.brett.pose='sit';pose('abby','sit');
  await say('brett','(letting go, laughing) Relax. It’s a joke. She knows it’s a joke. Right, babe?','smirk');
  await say('abby','(rubbing her wrist under the table) …It’s a joke.','sad');
  await say('brett','Who are you, her lawyer? Go sit with the freaks.','smirk');
 }else{
  A.brett.pose='sit';pose('abby','sit');
  await N('Corey has stopped in the middle of the cafeteria. His empty hands are still shaped like he’s holding a tray.');
 }
 hold('brett',null);hold('abby','phone');
 await say('brett','(standing up) Practice. Text me back this time. Every message. I count.','smirk');
 A.brett.pose=null;pose('brett','kiss');await wait(300);pose('brett',null);
 await walk('brett',334,80);remove('brett');
 face('abby',-1);A.abby.ex='sad';
 await N('Abby looks across the cafeteria at Corey. One second, same as in the Trailer. This time she doesn’t smile.');
 await walk('corey',140,60);face('corey',1);
 await say('corey','(quietly) Brett. His name is Brett. He’s a junior. He has a car. He’s had it two weeks and he already named it.','sad');
 await say('corey','She draws the bird and then she rubs it out. Every day. I thought it was for nobody. It’s because of HIM. She rubs it out before he can see it.','sad');
 const d=await choose(['“He grabbed her wrist, Corey.”','“She’s allowed a boyfriend.”']);
 if(d===0)await say('corey','(very calm) I saw. I saw.','angry');
 else{await say('corey','Yeah. She is.','sad');await N('He watches the red jacket go out through the doors.');await say('corey','She’s allowed a better one.','angry')}
 D.f.br=1;part('brett',1);
}});

/* 2. the thought */
hooks({mis:'brett',label:'Ask Corey if he’s okay',look:{ex:'sad'},cond:()=>D.f.br===1&&!D.dead.corey,run:async()=>{
 scene('toilets',{corey:[170,1,{y:148}],you:[130,1,{y:154}]});cue('tension');
 await N('You follow Corey into the bathroom. He stands at the sink and washes his hands. He’s been washing them for a long time.');
 await say('corey','Parking lot this morning. Brett was dropping her off. She was getting out and he wanted one more kiss and she didn’t. So he took her arm and pulled her back into the car. Like closing a door.','angry');
 await say('corey','She had her sleeve pulled down over her hand all morning.','sad');
 await say('corey','Can I tell you something? And you won’t look at me different?','scared');
 await N('He looks at himself in the mirror for a long time. Then he closes his eyes.');
 /* the thought */
 await tw(fxState,{dark:1},500);
 scene('forest',{corey:[90,1,{y:150,hold:'shovel'}]},true);fxState.dark=1;
 await tw(fxState,{dark:.35},500);flash('#a00010',.3);SFX.sting();
 put('brett',334,-1,{y:150,sp:90});await walk('brett',150,90);
 await N('It isn’t the bathroom anymore. It’s the woods behind school. Brett is jogging on the trail with his earbuds in. Corey is behind a tree, holding a shovel.');
 await walk('corey',136,90);pose('corey','overhead');await wait(250);SFX.crunch();shake(1.2);flash('#a00010',.5);
 blood(A.brett.x,A.brett.y-24,40,-1,100,A.brett.y+2);A.brett.pose='lie';A.brett.hurt=3;A.brett.ex='dead';pose('corey',null);
 await N('One swing. In the thought it’s always one swing. In the thought it’s always easy.');
 await tw(fxState,{dark:1},400);
 scene('toilets',{corey:[170,1,{y:148,ex:'scared'}],you:[130,1,{y:154}]},true);fxState.dark=1;await tw(fxState,{dark:0},400);
 await say('corey','(gripping the sink) That. Every time I close my eyes. I don’t let it in. It has a key.','scared');
 await say('corey','Everybody gets them, right? The bad thoughts? Like on a bridge, when you think “what if I jumped”? You’re not supposed to listen to them.','scared');
 const c=await choose(['“You’re not supposed to listen. So you don’t.”','“…What if you did?”','“I’ve had worse. About Arjun. Daily.”']);
 if(c===0){await say('corey','Yeah. I don’t. I won’t.','sad');await N('He dries his hands on his jeans and stares at the drain.');await say('corey','…I won’t.','sad')}
 if(c===1){await say('corey','Don’t say that. Don’t say it like it’s a real question.','angry');await N('He doesn’t move for a long time. He doesn’t tell you to take it back.');await say('corey','…Say it again tomorrow. If it still sounds like a real question tomorrow.','angry')}
 if(c===2){await say('corey','(laughing, nearly) Everybody has the Arjun one. That one’s normal. Mine has a shovel in it.','sad')}
 await walk('corey',334,70);remove('corey');
 pprop({t:'glassbird',x:170,y:60,n:1,a:.8,layer:-300});
 await N('Corey leaves first. In the steam on the mirror, where he was standing, he has drawn a little bird. He didn’t rub it out.');
 D.f.br=2;part('brett',2);
}},[[2,'canteen','corey'],[4,'chem','corey']]);

/* 3. where Brett runs */
hook({mis:'brett',period:[2,4],room:'corridor',who:'nivaan',label:'Ask Nivaan to look someone up',look:{pose:'phone'},cond:()=>D.f.br===2&&!D.dead.corey&&!D.dead.nivaan,run:async()=>{
 scene('corridor',{nivaan:[130,-1,{y:146,pose:'phone'}],corey:[160,-1,{y:148}],you:[96,1,{y:154}]});
 await say('corey','I didn’t sleep. I’m not doing anything. I just want to know where he goes. Knowing is allowed.','sad');
 await say('nivaan','(typing) Brett Kowalski. Junior. Lacrosse. Public running app, because he wants everyone to see his times.','smirk');
 await say('nivaan','Every day at home time he runs the trail behind the field. Through the woods. Alone. Earbuds in. Same route for two hundred days.','smirk');
 await say('nivaan','Why do you want to— (he looks at Corey’s face) …I’m not asking. Chat, we’re off. Chat is OFF.','scared');
 A.nivaan.pose=null;intel('brettRun');
 put('abby',334,-1,{y:146,hold:'book'});put('brett',350,-1,{y:146});
 await Promise.all([walk('abby',-20,45),walk('brett',-6,45)]);
 await N('Abby walks past with her books held against her chest. Brett is right behind her, one hand on the back of her neck, steering her down the corridor like a shopping cart. She doesn’t look up.');
 remove('abby');remove('brett');
 await say('corey','(watching the end of the corridor) The groundskeeper’s shed by the field is never locked. There’s a shovel in it.','angry');
 await say('corey','I’m just saying where things are.','angry');
 const c=await choose(['“If you go, you don’t go alone.”','“Home time. Another day. Not today. Sleep first.”']);
 if(c===0)await say('corey','…Okay.','sad');else await say('corey','Not today. Okay. Not today.','sad');
 await say('nivaan','(very quietly, to nobody) I didn’t hear any of this. I was reading. I can’t read.','scared');
 D.f.br=3;part('brett',3);
}});
spot({room:'field',period:[2,4],x:296,y:138,label:'Take the shovel from the groundskeeper’s shed',short:'SHED',cond:()=>D.f.br===3&&!D.f.shovel,run:async()=>{
 await walk('you',290,80);pose('you','reach');SFX.door();await wait(300);hold('you','shovel');pose('you',null);
 await N('The shed isn’t locked. It never is. You take the shovel.');
 await walk('you',12,90);pose('you','kneel');hold('you',null);await wait(400);pose('you',null);
 await N('You push it into the hedge at the edge of the woods, blade down, where nobody will look.');
 D.f.shovel=1;toast('Hidden: a shovel, in the hedge by the woods');
 return 'stay';
}});

/* 4. the woods */
hook({mis:'brett',period:7,room:'bus',who:'corey',label:'Walk into the woods with Corey',look:{ex:'sad'},cond:()=>D.f.br===3&&D.f.shovel&&!D.dead.corey,run:async()=>{
 scene('forest',{corey:[70,1,{y:150}],you:[44,1,{y:154,hold:'shovel'}]},true);cue('tension');fxState.dark=.25;
 await N('Home time. You and Corey walk past the 43, round the back of the field and into the woods. You pull the shovel out of the hedge on the way.');
 await say('corey','(whispering) He’s never late. He brags about never being late.','scared');
 put('brett',334,-1,{y:150,sp:95});await walk('brett',190,95);face('brett',-1);
 await say('brett','(taking out one earbud) …Curls? From the cafeteria? What are you doing in the woods, you freak? Sniffing her trail?','smirk');
 await say('corey','Let go of her.','angry');
 await say('brett','I’m not holding her. Oh, you mean in general? Bro. She does what I say because she likes it. She’s not allowed to talk to you, by the way.','smirk');
 await say('brett','She blocked you last night. I watched her do it. She cried. It was kind of cute.','smirk');
 A.corey.ex='angry';shake(.3);
 const c=await choose([{t:'Hand Corey the shovel.',tag:'🩸'},{t:'Do it yourself.',tag:'🩸'},{t:'“Corey. We can still walk away.”'}]);
 let who='corey';
 if(c===2){
  await say('corey','(not looking at you) I know.','sad');
  await say('brett','Yeah, walk away, Curls. Go draw her a little bird.','smirk');
  await N('Corey stops. He didn’t know Brett knew about the bird. Nobody is supposed to know about the bird.');
 }
 if(c===1)who='you';
 if(who==='corey'){hold('you',null);await walk('corey',A.you.x+10,60);hold('corey','shovel');await N('Corey takes the shovel out of your hands. His are completely steady.')}
 const k=who;
 await walk(k,A.brett.x-14,110);face(k,1);
 await say('brett','(laughing) What are you gonna do, dig me a—','smirk');
 pose(k,'overhead');await wait(220);SFX.crunch();shake(1.4);flash('#a00010',.4);
 blood(A.brett.x,A.brett.y-26,46,1,110,A.brett.y+2);A.brett.hurt=2;A.brett.pose='hurt';pose(k,null);
 await N('The first swing is the flat of the blade, across the side of his head. It makes a sound like a dropped pan. He doesn’t fall.');
 await say('brett','(spitting blood) My dad’s a COP— you’re DEAD, you’re both—','yell');
 pose(k,'overhead');await wait(220);SFX.crunch();SFX.squelch();shake(1.6);
 blood(A.brett.x,A.brett.y-20,60,1,120,A.brett.y+2);A.brett.pose='lie';A.brett.hurt=3;A.brett.ex='hurt';pose(k,null);
 await N('The second swing puts him on the ground. He’s still talking. Still saying her name like it’s his.');
 await walk(k,A.brett.x-8,40);pose(k,'stab');await wait(200);
 const head=await gHead('brett',1);pose(k,null);
 await N('The third swing is the edge. Straight down. Like you’re cutting turf.');
 await wait(600);fxState.dark=.4;
 await N('Then it’s quiet. Properly quiet. Even the birds have stopped.');
 hold(k,null);pprop({t:'shovelg',x:A[k].x+10,y:A[k].y+2,layer:3});
 pose('corey','kneel');A.corey.ex='cry';
 if(k==='corey')await say('corey','(very small) I did it. The thought came in and I let it sit down.','cry');
 else await say('corey','(very small) You did it. You did that. For me. Oh my god. Oh my god.','cry');
 pose('corey',null);
 /* the hole */
 props=props.filter(p=>p.t!=='shovelg');hold('you','shovel');
 const hx=120,hy=164,hole=pprop({t:'hole',x:hx,y:hy,k:0,layer:-50});
 await walk('you',hx-18,70);pose('you','kneel');
 const ok=await mash('Dig!',{need:24,time:7,info:'The ground is all roots. MASH!'});
 for(let i=0;i<6;i++){SFX.thud();await tw(hole,{k:(i+1)/6},ok?160:320)}
 pose('you',null);
 if(!ok)await N('It takes forever. Corey takes over when your hands blister. He digs like he’s trying to get to the other side of the world.');
 else await N('It takes twenty minutes. Neither of you says anything the whole time.');
 /* into it */
 await walk('corey',A.brett.x-12,60);face('corey',1);pose('corey','drag');
 {const dist=Math.abs(A.brett.x-hx);await Promise.all([walk('corey',hx-14,22),tw(A.brett,{x:hx},dist/22*1000+50)])}
 face('corey',1);
 pose('corey',null);
 await tw(A.brett,{y:hy+3},300);SFX.thud();
 if(head){await walk('you',head.x-8,60);pose('you','reach');await tw(head,{x:hx+4,y:hy+2},500);SFX.thud();pose('you',null);head.hide=1}
 await N('Corey drags him in by the ankles. You pick up the head and put it in after him. It’s heavier than you thought a head would be.');
 const m=pprop({t:'mound',x:hx,y:hy+4,k:0,layer:60});
 pose('you','kneel');for(let i=0;i<5;i++){SFX.thud();await tw(m,{k:(i+1)/5},260)}pose('you',null);
 remove('brett');delete A.brett;hole.hide=1;m.leaves=1;
 D.bodies=(D.bodies||[]).filter(b=>b.id!=='brett');
 await N('You fill it in. Corey kicks leaves over the top until it looks like every other bit of the woods. He keeps kicking long after it does.');
 SFX.blip(880,'sine');await wait(300);SFX.blip(990,'sine');
 await N('From under the leaves, very faintly, his earbud is still playing music.');
 await say('corey','She can never know. Not ever. Promise me.','cry');
 const p=await choose(['“I promise.”','“She won’t hear it from me.”']);
 await say('corey',p===0?'(nodding, fast) Okay. Okay.':'(wiping his face with the back of his wrist) Okay.','sad');
 hold('you','shovel');
 await Promise.all([walk('corey',-20,55),walk('you',-20,55)]);
 await N('You walk back out of the woods. The 43 has gone. Corey walks with his hands in his hoodie pocket the whole way and doesn’t take them out once.');
 fxState.dark=0;hold('you',null);
 D.f.br=4;D.f.brettDead=cal();D.f.brettBy=k;delete D.f.shovel;part('brett',4);
}});

/* 5. after */
hooks({mis:'brett',label:'Sit with Abby',look:{ex:'sad'},cond:()=>D.f.br===4&&D.f.brettDead<cal()&&!D.dead.abby&&!D.dead.corey,run:async()=>{
 scene('canteen',{abby:[196,-1,{y:150,pose:'sit'}],you:[166,1,{y:154}]},true);cue('sad');
 const pst=pprop({t:'poster',x:240,y:58,stache:1,layer:-200});
 await N('There’s a poster taped to the cafeteria wall now. MISSING. Brett’s yearbook photo, smiling with too many teeth. Somebody has already drawn a mustache on it.');
 await N('Abby sits at the end of the table on her own. Nobody sits near her. Everybody looks at her on the way past.');
 const n=cal()-D.f.brettDead;
 await say('abby','Everyone keeps saying sorry. Teachers. Girls who have never talked to me. His mom called me crying and asked if he’d seemed sad.','sad');
 await say('abby','He didn’t seem sad. He never seemed anything. He was like weather. You checked what he was like before you went outside.','sad');
 put('corey',334,-1,{y:150,hold:'mug'});await walk('corey',222,50);
 await say('corey','Pat had hot chocolate. I didn’t know if you— I got two. One’s for me. Both are for you if you want them.','blush');
 A.corey.pose='sit';A.corey.y=150;hold('corey',null);hold('abby','mug');
 await say('abby','(holding it in both hands, sleeves pulled down) …Thanks.','sad');
 await wait(600);
 await say('abby','Can I tell you something? And you won’t look at me different?','scared');
 A.corey.ex='shock';
 await N('Corey goes very still. It’s exactly what he said to you in the bathroom.');
 await say('corey','(quietly) Yeah.','sad');
 await say('abby','I’m not sad. I keep waiting to be sad. '+(n>1?n+' days':'All day yesterday')+' I’ve been waiting. And I just feel… light. Like I took off a backpack I forgot I was wearing.','cry');
 hold('abby',null);pose('abby','reach');await wait(500);pose('abby','sit');
 await N('She pushes her sleeve up, just for a second, so Corey can see her wrist. Then she pulls it back down.');
 const c=await choose(['Corey: “That’s not bad. That’s just true.”','Corey: “I would never grab you. Not even your hand. Not unless you grabbed mine first.”'],'Corey looks at you. Then at her.');
 if(c===0){await say('corey','That’s not bad. That’s just true.','sad');await say('abby','(laughing, wet) Nobody says true things to me. Everybody says nice things.','cry')}
 else{
  await say('corey','I would never grab you. Not even your hand. Not unless you grabbed mine first.','blush');
  pose('abby','reach');await wait(300);
  await N('Abby puts her hand on the table between them. Palm up. Corey looks at it for a long time.');
  await say('abby','That was me grabbing first.','love');
 }
 pose('corey','reach');pose('abby','reach');await tw(A.corey,{x:212},300);SFX.heart();
 await say('abby','(laughing a little) You’re shaking.','love');
 await say('corey','I’m always shaking near you. Since seventh grade. It’s a medical thing.','blush');
 await N('Under the MISSING poster, they sit there holding hands until the bell. Neither of them says Brett’s name again.');
 pose('corey','sit');pose('abby','sit');
 D.f.br=5;await complete('brett',D.f.brettBy||'corey');
 return 'stay';
}},[[0,'corridor','abby'],[2,'canteen','abby'],[4,'canteen','abby']]);

/* the Window Seat waits for the story */
function winReady(){const s=winStage();
 if(s===0)return true;
 if(s===1)return D.f.br>=1;
 if(s===2)return !!D.f.brettDead&&D.f.brettDead<cal();
 if(s===3)return doneBefore('brett');
 return false}
for(const h of HOOKS){if(h.mis!=='window'||h.who!=='auto')continue;const s=String(h.cond);if(/winStage\(\)===[123]/.test(s)){const c=h.cond;h.cond=()=>c()&&winReady()}}
Object.assign(MIS.window,{
 blurb:'Period 3 is in the Trailer. Abby sits by the window. Corey sits across the room, looking at her. He has looked at her every day since seventh grade. She has a boyfriend.',
 tips:['Odd day, Period 3, the Trailer. Watch the window.','The next odd day after you’ve met Brett (Intrusive Thoughts), Period 3, the Trailer. Corey needs to answer the bird.','The next odd day after Brett is gone, Period 3, the Trailer. The notes.','The next odd day after you’ve sat with Abby, Period 3, the Trailer. Ms. Sherman has a new seating plan.','Same day, home time, the 43. Back seat.']});

/* small hours, rebuilt: after the 43 */
dropHooks('smallhours');
Object.assign(MIS.smallhours,{blurb:'Abby plays guitar in the food court after school. Corey’s hand is still taped up from the window. She wants him to sing.',
 tips:['A day after the 43 (The Window Seat): after school, the food court.']});
hook({mis:'smallhours',period:8,room:'foodcourt',who:'abby',label:'Listen to Abby play',look:{hold:'guitar',pose:'sit'},cond:()=>doneBefore('window')&&!D.done.smallhours&&!D.dead.corey&&!D.dead.abby,run:async()=>{
 scene('foodcourt',{abby:[196,-1,{y:138,pose:'sit',hold:'guitar'}],corey:[170,1,{y:150,hurt:1}],you:[146,1,{y:156}]});
 cue('romance');
 await N('Abby sits on the edge of the fountain with her guitar. Somebody has dropped a bus ticket and a single Skittle into the open case.');
 await say('abby','This one’s called “Small Hours”. It’s about being awake when nobody else is.','happy');
 for(let i=0;i<6;i++){SFX.blip(330+i*40,'triangle');await wait(220)}
 await say('abby','Your turn. Second verse. You said you knew it.','smirk');
 await say('corey','(holding up his taped hand) I said I’d HEARD it.','scared');
 const c=await choose(['“Sing, Corey.”','“He can’t sing. Trust me.”']);
 if(c===0){await say('corey','(singing, terribly, like a fox being moved house) “…and the small hours… are the only ones… that are mine…”','closed');SFX.cheer();await N('Half the food court claps. The other half claps louder. Big Glen wipes his eye.')}
 else{await say('abby','Shut up. Let him try.','angry');await say('corey','(singing, so quietly only she can hear it)','closed')}
 await say('corey','I’m bad at this. I hate it. I want to keep being bad at it. With you.','blush');
 await say('abby','That’s the first thing you’ve said all day that wasn’t trying to be cool.','love');
 await say('abby','It was cooler than all the other stuff.','love');
 hold('abby',null);A.abby.pose=null;await tw(A.abby,{y:150},250);pose('abby','kiss');pose('corey','kiss');await tw(A.abby,{x:180},300);SFX.kiss();prop({t:'heart',x:176,y:120});
 await complete('smallhours');
 pose('abby',null);pose('corey',null);
 return 'stay';
}});

/* =====================================================================
   SEAN & STELLA — spread out, then LONG DISTANCE
   ===================================================================== */
Object.assign(MIS.instella,{blurb:'Sean and Stella have only ever been a voice on the phone. Now she has transferred to Highgate. In 3D. Sean is not okay.',
 parts:['Before school: Stella gets off the bus','Another day: get her lucky ball back','Another day, lunch: the field'],
 tips:['Before school, bus loop. Sean is hiding behind people.','Break or lunch, main corridor. Arjun has something that isn’t his.','Lunch, the field. Coach throws javelins at 12:40. Trees are safe.']});
Object.assign(MIS.striketwo,{blurb:'The day after the field, Sean and Stella go to the arcade. It’s their first date. It’s the first time either of them has said anything real out loud.',
 tips:['A day after “In Person”, after school: the Fair City Mall arcade.']});
for(const h of HOOKS){if(h.mis==='striketwo'&&h.period===8){const c=h.cond;h.cond=()=>doneBefore('instella')&&!D.done.striketwo&&c()}
 if(h.mis==='toby'&&h.period===0){const c=h.cond;h.cond=()=>doneBefore('striketwo')&&c()}}
MIS.toby.tips=MIS.toby.tips.map((t,i)=>i===0?'A day after Sean and Stella’s first date (Strike Two): before school, bus loop. Sit near Sean.':t);

ITEMS.strip='The photo strip (four pictures, nobody looking at the camera in the last one)';
mission('farewell',{name:'Long Distance',icon:'📞',who:['sean','stella'],
 blurb:'Stella’s mom got the job in Portland. They leave the Saturday after next. Stella moved schools for Sean two weeks ago. Sean has never practiced saying goodbye.',
 parts:['Week two: Portland','Another day: Sean’s plan','Another day, home time: forty-one'],
 tips:['Week two, after Strike Two: break (library) or lunch (field). Stella has been crying.','Break (library) or lunch (field). Sean has a plan. Then steal Coach’s bucket of field chalk from the gym.','Home time, the bus loop. You need the chalk (gym, break or lunch).'],
 variants:{all:'All forty-one',smudged:'Forty-one, smudged'}});
hooks({mis:'farewell',label:'Ask Stella why she’s been crying',look:{ex:'cry'},cond:()=>cal()>=8&&doneBefore('striketwo')&&!D.f.fw&&!D.dead.sean&&!D.dead.stella,run:async()=>{
 const r=here();scene(r,{stella:[150,1,{y:150,pose:'sit',ex:'cry'}],you:[120,1,{y:154}]},true);cue('sad');
 await say('stella','My mom got the job. The one in Portland. She’s been applying since I was eleven. She finally got it.','cry');
 await say('stella','We go the Saturday after next. There are boxes in our hall with my name on them. My mom wrote STELLA — FRAGILE on one as a joke and I couldn’t stop crying.','cry');
 await say('stella','I haven’t told Sean. I made my mom drive past this school every day for a year until she let me transfer. For him. Two weeks ago.','cry');
 put('sean',334,-1,{y:150,hold:'flower'});await walk('sean',190,70);
 await say('sean','Stella! I won Strike Two a brother. He has no eyes at all, he’s— (he sees her face) …What happened? Who do I fight? I can’t fight. Who do I get Omer to fight?','shock');
 await say('stella','Portland.','cry');
 await say('sean','…Portland. Like Oregon Portland? With the rain and the—','shock');
 await say('sean','Okay. Okay. Okay.','sad');
 hold('sean',null);
 await N('Sean says “okay” eleven more times. Then he walks away. Fast. Not running. Walking like if he runs he’ll fall apart.');
 await walk('sean',340,70);remove('sean');
 await say('stella','(to you) Go after him. Please. When he’s scared he doesn’t listen to me. He just says okay.','cry');
 await walk('you',340,90);
 scene('corridor',{sean:[210,-1,{y:146,ex:'cry'}],you:[-14,1,{y:154}]},true);await walk('you',176,80);
 await say('sean','I practiced everything. Hi. The speech. Strike one. Forty voicemails. I never practiced goodbye. I didn’t think we’d get to the part where you practice goodbye.','cry');
 const c=await choose(['“Then don’t practice goodbye. Practice the next thing.”','“Portland has phones. You two were a phone first.”']);
 if(c===0)await say('sean','The next thing. What’s the next thing after you can touch someone’s face and then you can’t?','cry');
 else await say('sean','A voice on the phone. We were a voice on the phone for a whole year.','sad');
 await say('sean','(wiping his face with his whole sleeve) I can’t go back to being a voice without doing something first. Something that isn’t on a phone. Something she can take with her.','sad');
 await say('sean','Find me tomorrow. I’ll have a plan. I’ll have eleven plans. One of them will be good.','sad');
 D.f.fw=1;part('farewell',1);
 return 'stay';
}},[[2,'library','stella'],[4,'field','stella']]);
hooks({mis:'farewell',label:'Ask Sean what the plan is',look:{hold:'paper'},cond:()=>D.f.fw===1&&!D.dead.sean&&!D.dead.stella,run:async()=>{
 const r=here();scene(r,{sean:[160,-1,{y:148,hold:'paper'}],you:[130,1,{y:154}]},true);
 await say('sean','I wrote out all forty voicemails last night. From memory. It’s eleven pages. My hand doesn’t work anymore.','happy');
 await say('sean','Home time. Her mom picks her up from the bus loop to go and sign the lease thing. When she walks out of the doors, every voicemail is going to be on the ground. In chalk. From the doors to the car.','happy');
 await say('sean','Forty. And at the end, number forty-one. The one I never left.','blush');
 await say('you','That’s a lot of chalk, Sean.');
 await say('sean','Coach keeps a whole bucket of field-line chalk in the gym. He’d kill us. He would literally kill us. With a javelin. That’s why I need you.','scared');
 D.f.fw=2;part('farewell',2);
}},[[2,'library','sean'],[4,'field','sean']]);
spot({room:'gym',period:[2,4],x:286,y:150,label:'Steal Coach’s bucket of field chalk',short:'CHALK',cond:()=>D.f.fw===2&&!D.f.chalk,run:async()=>{
 const b=pprop({t:'bucket',x:292,y:152,layer:2});
 await walk('you',280,70);
 if(A.coach&&!A.coach.dead){face('coach',-1);await N('Coach is on the other side of the gym, yelling at a climbing rope. You crouch.');pose('you','kneel');await wait(300)}
 pose('you','reach');await wait(200);b.hide=1;hold('you','chalk');pose('you',null);
 await walk('you',200,70);
 await N('You walk across the gym with a whole bucket of chalk under your arm like it’s yours. Confidence is most of stealing. You stuff it in your bag by the door.');
 D.f.chalk=1;toast('Got: Coach’s bucket of field chalk');hold('you',null);
 return 'stay';
}});
hook({mis:'farewell',period:7,room:'bus',who:'sean',label:'Help Sean write on the bus loop',look:{hold:'chalk'},cond:()=>D.f.fw===2&&D.f.chalk&&!D.dead.sean&&!D.dead.stella,run:async()=>{
 const cast={sean:[250,-1,{y:150,pose:'kneel',hold:'chalk'}],you:[120,1,{y:156,pose:'kneel',hold:'chalk'}]};
 const helpers=['hasan','nivaan','omer'].filter(n=>!D.dead[n]);helpers.forEach((n,i)=>cast[n]=[60+i*50,1,{y:146+(i%2)*6,pose:'kneel',hold:'chalk'}]);
 scene('bus',cast,true);cue('romance');
 const w=pprop({t:'chalkwords',x:6,y:166,k:0,lines:3,layer:-40});
 await N('Home time. The bus loop. Everybody you could find is on their knees with a stick of chalk.'+(helpers.length?' '+helpers.map(n=>K[n].n).join(', ')+'.':'')+(helpers.includes('omer')?' Omer said no four times and then wrote the most.':''));
 const ok=await mash('Write it all before she comes out!',{need:22,time:7,info:'Forty voicemails. MASH!'});
 await tw(w,{k:ok?1:.8},900);w.last=1;
 for(const n of[...helpers,'you'])if(A[n]){pose(n,null);hold(n,null)}
 await walk('sean',290,50);pose('sean',null);hold('sean','strip');
 if(!ok)await N('You don’t finish. Voicemails twenty-two to twenty-nine are one long smudge. Sean says it’s fine. Twenty-two to twenty-nine were mostly about a dog anyway.');
 put('stella',-14,1,{y:150});
 await walk('stella',70,30);
 await N('Stella walks out of the doors and stops. The whole loop is written on. In big, wobbly, chalk handwriting, from her feet all the way to the curb.');
 await say('stella','(reading) “Voicemail six. I saw a dog today that looked like it would really like you.”','happy');
 await walk('stella',140,30);
 await say('stella','(reading, slower) “Voicemail thirty-one. I’m not crying. It’s November.”','cry');
 await walk('stella',230,30);
 await say('stella','The last one’s pink. “Forty-one.” There’s only forty. I counted them every night.','cry');
 const car=pprop({t:'car',x:-80,y:170,col:'#5a6a8a',driver:1,layer:40});SFX.rumble();await tw(car,{x:20},1400,'out');
 await N('A blue car pulls into the loop. Stella’s mom. She doesn’t honk. She sees the ground and just waits.');
 await say('sean','I never said it. On any of the forty. Number forty is me breathing for a minute and then hanging up.','blush');
 await say('sean','I love you. That’s forty-one. I wanted to do one in person.','blush');
 await say('stella','(crying, laughing) That is SO unfair. You can’t do that in a bus loop.','cry');
 await say('stella','I love you too, idiot. I loved you at voicemail six.','love');
 hold('sean',null);hold('stella','strip');
 await say('sean','For the box. The fragile one.','cry');
 await walk('stella',40,40);A.stella.y=150;await tw(A.stella,{y:146},200);remove('stella');car.pass=1;
 await N('She gets in the car with the photo strip held against her chest. The car pulls away.');
 SFX.rumble();const go=tw(car,{x:340},3000,'in');
 const s=await choose(['“Run, Sean.”','Let it go. Let them have the bus loop.']);
 if(s===0){
  await Promise.all([go,walk('sean',330,130)]);
  SFX.thud();shake(.8);
  await N('Sean runs after the car the whole length of the loop and trips on the curb at the end. Face first. On voicemail twenty-two. His nose goes everywhere.');
  scene('bus',{sean:[260,1,{y:152,pose:'lie',hurt:2,bloody:1}],you:[200,1,{y:156}]},true);blood(262,140,24,null,60,152);
  const car2=pprop({t:'car',x:300,y:170,col:'#5a6a8a',driver:1,layer:40});
  put('stella',318,-1,{y:150});await walk('stella',276,90);
  pose('sean',null);A.sean.y=150;
  await say('stella','You absolute— you’re BLEEDING—','cry');
  await say('sean','(through his nose) Strike four.','happy');
  pose('stella','kiss');pose('sean','kiss');SFX.kiss();prop({t:'heart',x:268,y:116});fxState.romance=1;
  await N('She kisses him on the bus loop with blood on both of their faces. Her mom turns the radio up and looks the other way.');
  await wait(800);fxState.romance=0;pose('stella',null);pose('sean',null);
  await walk('stella',316,50);remove('stella');car2.pass=1;SFX.rumble();await tw(car2,{x:360},1600,'in');
 }else{
  await go;
  await N('Sean doesn’t run. He stands at the end of the chalk and waves until the car turns the corner. Then for a while after that.');
 }
 await N('On the 43 home, Sean’s phone rings before the bus has even left the loop. He doesn’t have to look to know who it is.');
 await say('sean','(answering) Hi. …Yeah. I know. Nine o’clock. Every night. Forty-two.','happy');
 hold('sean',null);
 await complete('farewell',ok?'all':'smudged');
}});

/* =====================================================================
   HASAN & DARREN — STEP ELEVEN
   ===================================================================== */
Object.assign(MIS.darren,{blurb:'Someone has left Hasan a note. It promises “eleven steps” and says “wear something blue”. It’s signed “D”. Hasan has read it forty times and gone a color you can see from space.',
 parts:['Before school: the note','Another day, break: step five','Another day, lunch: step nine'],
 tips:['Before school, bus loop. Hasan’s holding something.','Break or lunch, cafeteria. Stay near Hasan. Duck.','Lunch, cafeteria. Hasan’s been summoned to the field. If the Infected Choir exists today, bring it.']});
mission('stepeleven',{name:'Step Eleven',icon:'🏊',who:['hasan','darren'],
 blurb:'After the milkshake, Darren gave Hasan a laminated list of every step. Step ten is “meet the family”. Step eleven is blank. Darren says Hasan will know it when it happens.',
 parts:['Another day: the laminated list','Another day, home time: meet the family','Week two, lunch: the swim meet'],
 tips:['A day after the milkshake (Darren): break or lunch, the cafeteria. Hasan is holding something laminated.','Home time, bus loop. Hasan’s dad is coming. So is Darren.','Week two, lunch, the cafeteria. Darren has a swim meet. Hasan says he isn’t going.'],
 variants:{kiss:'Step eleven'}});
const darDate=()=>['shake','choirlove'].includes(D.done.darren);
hook({mis:'stepeleven',period:[2,4],room:'canteen',who:'hasan',label:'Ask Hasan what he’s holding',look:{hold:'paper',ex:'blush'},cond:()=>darDate()&&doneBefore('darren')&&!D.f.s11&&!D.dead.hasan&&!D.dead.darren,run:async()=>{
 const cast={hasan:[150,1,{y:148,hold:'paper'}],you:[124,1,{y:154}]};if(!D.dead.arjun)cast.arjun=[230,-1,{y:146,pose:'cross'}];
 scene('canteen',cast,true);cue('canteen');
 await say('hasan','He laminated it. Darren LAMINATED it. Every step. One to twelve.','blush');
 await say('hasan','Step seven was “bring him fries”. Step ten is “meet the family”. Step eleven is BLANK. He said I’d know it when it happened. What does THAT mean? I’ve never known anything when it happened!','scared');
 if(A.arjun){
  await walk('arjun',172,80);pose('arjun','grab');hold('hasan',null);hold('arjun','paper');pose('arjun',null);
  await say('arjun','(reading, loud) “Step four: accidentally be in the pool when he walks past.” “Step six: give him space when he runs to the bathroom.” Hasan. He PLANNED for you to run away. He KNEW you were a coward—','laugh');
  const c=await choose(['Take it off Arjun.','Wait. Let Hasan handle it.']);
  if(c===0){await walk('you',A.arjun.x-12,90);pose('you','grab');hold('arjun',null);pose('you',null);hold('hasan','paper');await say('arjun','Ow. OW. Fine. Fine.','angry')}
  else{
   await walk('hasan',A.arjun.x-12,60);
   await say('hasan','Give it.','angry');
   await say('arjun','Or what, gear-stick?','smirk');
   await say('hasan','(not loud, not moving) Give it back, Arjun. Someone wrote me a whole list. Twelve steps. It’s MINE.','angry');
   await wait(500);hold('arjun',null);hold('hasan','paper');
   await say('arjun','(taken aback, sort of impressed) …Okay. Okay. Jeez. Somebody got a boyfriend and a spine on the same day.','shock');
  }
  await walk('arjun',334,80);remove('arjun');
 }
 put('darren',334,-1,{y:150});await walk('darren',178,110);face('darren',-1);
 await say('darren','Hi! You’re holding it. You’re holding it the right way up. Step ten is tomorrow. Home time. Can I meet your dad?','love');
 await say('hasan','My dad sleeps. My dad’s a cab. My dad’s never met anyone I— nobody’s ever MET him—','scared');
 await say('darren','Step ten.','love');
 await say('hasan','(very small) …Step ten.','blush');
 D.f.s11=1;part('stepeleven',1);
}});
hook({mis:'stepeleven',period:7,room:'bus',who:'hasan',label:'Wait for the cab with Hasan and Darren',look:{ex:'scared'},cond:()=>D.f.s11===1&&!D.dead.hasan&&!D.dead.darren,run:async()=>{
 const cast={hasan:[130,1,{y:150}],darren:[150,1,{y:150,hold:'flower'}],you:[104,1,{y:154}]};if(!D.dead.brayden)cast.brayden=[250,-1,{y:146,hold:'vape'}];
 scene('bus',cast,true);
 await say('darren','I brought him a flower. Is a flower weird for a dad? I panicked. The other option was a fish.','scared');
 const cab=pprop({t:'taxi',x:-70,y:166,layer:30});SFX.rumble();await tw(cab,{x:150},1600,'out');
 put('hasandad',150,1,{y:150});
 await N('The yellow cab pulls into the bus loop again, which it still isn’t allowed to do. Hasan’s dad gets out in his driving cardigan.');
 await walk('darren',A.hasandad.x-18,60);face('darren',1);hold('darren',null);hold('hasandad','flower');
 await say('darren','Mr. Hasan’s dad. Sir. I’m Darren. I’m on the swim team. I have intentions.','love');
 await say('hasandad','(looking at the flower, then at Hasan, then at the flower) …Intentions.','shock');
 await say('hasan','DAD.','scared');
 await say('hasandad','Does he make you laugh?','smirk');
 await say('hasan','…Yeah. All the time. On purpose and by accident.','blush');
 await say('hasandad','Good. Your mother made me laugh for nineteen years. Everything else you can learn.','happy');
 await N('He puts the flower on the dashboard of the cab, carefully, like a passenger.');
 if(A.brayden){
  SFX.click();
  await N('Nobody put the handbrake on. The cab starts to roll. Backwards. Down the slope of the bus loop. Toward Brayden, who is vaping behind it with his eyes shut.');
  await tw(cab,{x:200},700,'in');SFX.thud();SFX.crunch();shake(1.4);flash('#a00010',.3);
  kill('brayden','lie',{pool:36,bleed:5});blood(A.brayden.x,A.brayden.y-12,50,1,100,A.brayden.y+2);D.dead.brayden=1;
  await say('hasandad','(after a long time) …He was vaping near my cab.','shock');
  await say('darren','Step ten and a half.','happy');
 }
 await say('hasandad','Get in. Both of you. Ten minutes to the mall, and then I’m going to work and you are going to tell me everything. Everything.','happy');
 pose('hasan','hug');pose('hasandad','hug');SFX.heart();await wait(700);pose('hasan',null);pose('hasandad',null);
 await N('Hasan hugs his dad, in front of everyone, for the second time in his life. Darren claps once, very quietly, like at a golf tournament.');
 D.f.s11=2;part('stepeleven',2);
}});
hook({mis:'stepeleven',period:4,room:'canteen',who:'hasan',label:'Ask Hasan why he’s not at Darren’s swim meet',look:{ex:'sad'},cond:()=>D.f.s11===2&&cal()>=8&&!D.dead.hasan&&!D.dead.darren,run:async()=>{
 scene('canteen',{hasan:[150,1,{y:148,ex:'sad'}],you:[124,1,{y:154}]},true);
 await say('hasan','He’s got the lunchtime swim meet. I said I’d go. I can’t go. It’s a pool. I can’t swim. What if he looks up and I’m just standing there, not swimming, being a guy who can’t swim?','scared');
 const c=await choose(['“He’s going to look up for you. Be there when he does.”','Drag him there.']);
 if(c===1){await walk('you',A.hasan.x-8,80);pose('you','grab');await walk('hasan',340,90);pose('you',null)}
 scene('pool',{darren:[160,1,{y:150,pose:'swim'}],tarn:[290,-1,{y:110,pose:'hips'}],hasan:[90,1,{y:110}],you:[64,1,{y:112}],kid1:[200,1,{y:150,pose:'swim'}],kid2:[240,1,{y:150,pose:'swim'}]},true);cue('pool');
 await N('The pool. The lunchtime swim meet. Darren is in lane two with his prescription goggles. He sees Hasan on the side and waves so hard he sinks.');
 SFX.whistle();await say('tarn','LANE TWO, NO WAVING! Waving is drowning with extra steps!','evil');
 await Promise.all([walk('darren',40,60),walk('kid1',30,70),walk('kid2',60,70)]);
 await Promise.all([walk('darren',20,40),walk('kid1',200,70),walk('kid2',240,70)]);
 await N('At the deep end, Darren goes down for his tumble turn. He doesn’t come back up.');
 await N('The drain at the bottom of the deep end. Highgate’s pool drain takes one kid a year. Everybody knows. It’s in the handbook, under “Clubs”.');
 pprop({t:'redwater',x:16,y:150,layer:5});A.darren.y=160;A.darren.ex='scared';
 await say('tarn','(not moving) Nobody touch the drain! It’s load-bearing!','evil');
 await say('hasan','I can’t swim. I can’t swim. I can’t—','scared');
 await N('Hasan jumps in anyway. In his clothes. Straight down, like a dropped bag of shopping.');
 SFX.splat();await walk('hasan',24,90);A.hasan.y=150;A.hasan.pose='swim';prop({t:'splash',x:24,y:128});
 const ok=await mash('Pull him off the drain!',{need:24,time:6,info:'Hasan can’t swim. He’s doing it anyway. MASH!'});
 if(!ok){
  await N('It isn’t enough. You go in after them. Between the three of you, kicking and pulling and swallowing half the pool, his ankle comes free with a sound you will hear for the rest of the week.');
  await walk('you',30,80);A.you.y=150;SFX.splat();
 }else await N('Hasan pulls. He pulls like his whole life is a rope. Darren’s ankle comes off the drain with a wet, awful sound and a cloud of red.');
 SFX.squelch();blood(20,150,30,null,60,160);
 await Promise.all([walk('hasan',70,40),tw(A.darren,{x:64,y:110},1400)]);A.hasan.y=110;A.hasan.pose='kneel';A.darren.pose='lie';A.darren.ex='dead';
 if(A.you&&A.you.y>140){A.you.y=112}
 await N('He gets Darren onto the side. Darren isn’t breathing. Hasan has done one CPR class. In sixth grade. On a doll called Gordon.');
 const r=await meter('Thirty compressions. Like Gordon.',{speed:1.1});
 SFX.thud();await wait(300);A.darren.ex='hurt';SFX.gasp();
 await N('Darren coughs up about half the deep end, and his goggles, and then opens his eyes.');
 await say('darren','(hoarse) …Step eleven.','hurt');
 await say('hasan','WHAT. WHAT IS STEP ELEVEN. Tell me. You have to tell me right now.','cry');
 await say('darren','It was blank because I didn’t know. I didn’t know what you’d do when it mattered.','hurt');
 await say('darren','You jumped in. You can’t swim.','love');
 await say('hasan','I can’t swim.','cry');
 A.darren.pose='sit';pose('hasan','kiss');pose('darren','kiss');SFX.kiss();prop({t:'heart',x:68,y:94});fxState.romance=1;
 await N('Hasan kisses him on the side of the pool, soaking wet, in front of the whole swim team, which bangs on the water with both hands like a drum.');
 await say('tarn','(blowing her whistle at the ceiling) NO KISSING ON THE DECK! Kissing is drowning with— oh, forget it.','evil');
 await wait(600);fxState.romance=0;pose('hasan',null);pose('darren',null);
 await say('hasan','(to you, shaking, grinning) I’m going to need new jeans. And a boyfriend. I’ve got one of those.','happy');
 await complete('stepeleven','kiss');
 return 'stay';
}});

/* =====================================================================
   OUTCOMES YOU CAN SEE
   ===================================================================== */
const PAIRS=[
 {a:'sean',b:'stella',on:()=>D.done.instella&&D.done.instella!=='javelin'},
 {a:'hasan',b:'darren',on:()=>darDate()||D.done.stepeleven},
 {a:'abby',b:'corey',on:()=>D.done.window},
 {a:'abby',b:'brett',on:()=>D.f.br>=1&&!D.f.brettDead&&!(D.f.br===1&&stepToday('brett')),periods:[2,4]},
];
const OUT_PER=[0,2,4,7,8];
{const _rf=rosterFor;rosterFor=function(per,room){
 let list=_rf(per,room);
 if(!D||!D.f||!OUT_PER.includes(per))return list;
 for(const pr of PAIRS){
  let on=false;try{on=!!pr.on()}catch(e){}
  if(!on||D.dead[pr.a]||D.dead[pr.b]||(pr.periods&&!pr.periods.includes(per)))continue;
  const homeA=list.find(e=>e[0]===pr.a);
  const hookHere=(id,r)=>HOOKS.some(h=>h.who===id&&h.room===r&&(h.period===per||(Array.isArray(h.period)&&h.period.includes(per))));
  if(homeA){
   list=list.filter(e=>e[0]!==pr.b);
   const x=homeA[1]+(homeA[1]>250?-14:14);
   list=list.concat([[pr.b,x,x>homeA[1]?-1:1,homeA[3]||null,homeA[4]||null]]);
  }else if(list.some(e=>e[0]===pr.b)&&!hookHere(pr.b,room)){
   /* b is with a somewhere else this period */
   let aRoom=false;for(const r in ROOMS){if(r!==room&&_rf(per,r).some(e=>e[0]===pr.a)){aRoom=true;break}}
   if(aRoom)list=list.filter(e=>e[0]!==pr.b);
  }
 }
 return list;
}}
{const _br=buildRoom;buildRoom=function(room){
 const r=_br(room);
 if(!D||!D.f)return r;
 for(const pr of PAIRS){let on=false;try{on=!!pr.on()}catch(e){}if(on&&A[pr.a]&&A[pr.b]&&!A[pr.a].dead&&!A[pr.b].dead){
  face(pr.a,pr.b);face(pr.b,pr.a);if(pr.b!=='brett'){A[pr.a].ex='love';A[pr.b].ex='love'}else{A[pr.b].pose=A[pr.b].pose||'cross';A[pr.a].ex='sad'}}}
 if(D.f.brettDead&&['corridor','canteen','bus','door','library'].includes(room)){
  const at={corridor:[250,52],canteen:[240,58],bus:[30,90],door:[60,60],library:[290,60]}[room];
  pprop({t:'poster',x:at[0],y:at[1],stache:cal()-D.f.brettDead>1,layer:-200});
 }
 return r;
}}

/* gossip that follows the week */
function MOREGOSSIP(){const g=[];if(!D||!D.f)return g;
 if(D.f.br>=1&&!D.f.brettDead)g.push('abby’s dating BRETT? brett with the car?','brett checks her phone like every period','brett named his car. his CAR');
 if(D.f.brettDead){const n=cal()-D.f.brettDead;if(n<=2)g.push('brett didn’t come home','his mom was on the news crying','his car’s still in the student lot');else g.push('still no brett','my mom says it was a drifter','nobody’s even looking in the woods lol');}
 if(D.done.window)g.push('corey and ABBY??','there’s two birds on the trailer window now. they don’t rub them out');
 if(D.done.instella)g.push('sean’s girlfriend transferred here for him. like a MOVIE');
 if(D.f.fw)g.push('stella’s moving?? to PORTLAND?');
 if(D.done.farewell)g.push('did you see the chalk on the bus loop','i read voicemail six and cried a little');
 if(darDate())g.push('hasan and the swim team guy?? the goggles guy??');
 if(D.done.stepeleven)g.push('hasan jumped in the deep end and he CAN’T SWIM','the pool drain took a whole ankle. almost');
 if(D.done.nightshift)g.push('hasan’s dad pulled up in a cab and HUGGED him');
 if(D.done.toby)g.push('toby from ohio is kind of iconic');
 return g}

/* people talk about what happened (once a day each), and the small talk changes from day to day */
const STATECHAT={
 corey:()=>D.done.window?['Two birds. On the glass. Every day now. Ms. Sherman hasn’t noticed. Or she has and she’s letting it happen, which is scarier.']:D.f.br===5?['She held my hand. Under the poster. I keep looking at my hand like it’s new.']:D.f.br===4?['I washed my hands nine times this morning. They’re clean. They’re so clean.']:D.f.br===3?['I’m fine. I slept. I didn’t sleep.']:D.f.br===2?['Don’t ask me about the thing. The thought. I’m not thinking it. I’m thinking about lunch.']:D.f.br===1?['Brett. His name is Brett. He named his car “The Beast”. The car is a Kia.']:null,
 abby:()=>D.done.window?['Corey’s hand is still taped up. He holds mine with the other one. He says it’s his good hand now.']:D.f.br===5?['I didn’t think I was allowed to feel light. Corey says I’m allowed.']:D.f.brettDead?['Brett didn’t text back. Brett always texts back. That’s the first night of my life my phone was quiet.']:D.f.br>=1?['Brett picks me up after school. Brett likes to know where I am. It’s fine. It’s nice. It’s fine.']:null,
 sean:()=>D.done.farewell?['Nine o’clock. Every night. That’s our time now. I set three alarms.']:D.f.fw?['Portland. Do you know how far Portland is? I looked it up. I wish I hadn’t.']:D.done.striketwo?['I keep the photo strip in my phone case. The fourth one. Where nobody’s looking at the camera.']:D.done.instella?['She goes to Highgate now. Every day. I see her EVERY DAY. I might die of it.']:null,
 stella:()=>D.done.farewell?['My mom keeps saying Portland has a great music scene. I keep saying Sean isn’t in it.']:D.f.fw?['Every box in my hall has my name on it. I keep wanting to write “and Sean” under it.']:D.done.instella?['He talks a lot more on the phone. In person he sort of vibrates. I like the vibrating.']:null,
 hasan:()=>D.done.stepeleven?['…He’s my boyfriend. I said it. Out loud. To you. I’m going to go lie down.']:D.f.s11?['What’s step eleven? WHAT IS STEP ELEVEN? I check the list every hour. It’s still blank.']:darDate()?['Darren texted me a picture of his goggle tan. No words. Just the tan. I’ve looked at it eleven times.']:null,
 darren:()=>D.done.stepeleven?['My ankle has eleven stitches. Step eleven. I counted. I think it means something.']:darDate()?['Step twelve was “be funny”. I’m still working on step twelve.']:['Hi! Sorry. I’m always a bit wet.'],
 nivaan:()=>D.f.brettDead?['Brett’s running app still has him on the trail. Same dot. It hasn’t moved in days. I closed the app. I closed my laptop. I closed my eyes.']:null,
 arjun:()=>D.done.window?['Corey and Abby. Window boy and the bird girl. Disgusting. Ten out of ten. Disgusting.']:D.done.stepeleven?['Hasan got a boyfriend AND a spine. In the same week. I’ve had neither since birth.']:null,
};
const DAYCHAT=[
 ['Monday. My body is here. My soul is still in bed.','It’s Monday and somebody already cried in the bathroom. It was me.'],
 ['Tuesday is just Monday that learned nothing.','Tuesday. The pizza is grey on Tuesdays. Nobody knows why.'],
 ['Wednesday. Halfway. Halfway to what, though.','Hump day. Marcus has said “hump day” forty times.'],
 ['Thursday is when the teachers get weird. Weirder.','Thursday. One more day. One more day of this.'],
 ['Friday. Everybody’s acting like they’ve already left.','It’s Friday. Act normal. Nobody is acting normal.'],
];
{const _c=chat;chat=async function(id){
 if(!D||!D.chat)return _c(id);
 if(D.chat[id]==null&&CHAT[id])D.chat[id]=(cal()*3+(id.length))%CHAT[id].length;
 const k='st_'+id;
 const f=STATECHAT[id];let lines=null;try{lines=f&&f()}catch(e){}
 if(lines&&!D.chat[k]&&!(D.dead&&D.dead[id])){D.chat[k]=1;await say(id,pick(lines));return}
 const dk='dy_'+id;
 if(FRIENDS.includes(id)&&!D.chat[dk]&&!D.weekend&&dow()<5&&Math.random()<.4){D.chat[dk]=1;await say(id,pick(DAYCHAT[dow()]));return}
 return _c(id);
}}
/* the old Friday lines */
CHAT.corey=CHAT.corey.map(l=>l.replace('Abby’s in my PE group.','Abby sits by the window in Period 3.').replace('too much for a Friday?','too much for a school day?'));
CHAT.stella=CHAT.stella.map(l=>l.replace('or is it a Friday thing?','or is it a Highgate thing?'));

/* =====================================================================
   ONE STEP A DAY — big quests take days
   ===================================================================== */
for(const h of HOOKS){
 if(!LONG.includes(h.mis)||h.mis==='window'||h.mis==='smallhours'||h.mis==='striketwo')continue;
 const src=String(h.run);
 if(!/\b(part|complete)\(/.test(src))continue;
 if(new RegExp("part\\('"+h.mis+"',1\\)").test(src))continue;
 const c=h.cond;h.cond=()=>!stepToday(h.mis)&&(!c||c());
}

/* the safe version has no Abby */
if(window.EDITION==='safe'){dropHooks('brett');delete MIS.brett;PAIRS.splice(2,2)}

/* two weeks are up: how did it go */
{const _twe=twoWeeksEnd;twoWeeksEnd=async function(){
 try{
  if(D&&D.done){
   if(D.done.window&&D.done.brett)await N('Corey and Abby still sit by the window in the Trailer. Nobody ever found Brett. The woods behind the field keep what you give them.');
   if(D.done.farewell)await N('Stella moved to Portland. Sean calls her every night at nine. The chalk on the bus loop lasted until the first rain. Somebody took a photo of voicemail six first.');
   if(D.done.stepeleven)await N('Darren walks with a limp now. Hasan walks slower so they match. Hasan’s dad keeps a dried flower on his dashboard.');
  }
 }catch(e){}
 return _twe();
}}
