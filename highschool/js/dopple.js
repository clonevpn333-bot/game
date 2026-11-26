'use strict';
/* =====================================================================
   HIGHSCHOOL — THE OTHER MISS
   There are two Ms. Shermans. One of them is wrong.
   It wears her cardigan and her pearls and her face. Its arms and legs
   are being pulled too long, and they keep getting longer. It’s always
   hungry. When there’s nothing else to eat, it eats itself.
   It came up from the boiler room. It’s been down there since 1987.
   ===================================================================== */
K.dopple={n:'Ms. Sherman?',col:'#8a2a4a',skin:'#e8cab8',hair:'#3a2418',hs:'bun',top:'#e3a9bd',pants:'#2f2f3a',skirt:1,pearls:1,adult:1,girl:1,seed:666,v:120,vw:'sawtooth'};K.dopple.id='dopple';
VOICE.dopple={me:'Miss',pet:'sweetie',pets:'sweeties',his:'her',sir:'Miss'};
Object.assign(ITEMS,{meat:'A bucket of raw ground beef from Pat’s walk-in'});

/* ---------- what it looks like ---------- */
function drawDopple(a){
 const k=K.dopple,x0=Math.round(a.x),y=Math.round(a.y-(a.z||0)),d=a.dir||1;
 const jit=Math.random()<.06?Math.round(Math.random()*4-2):0,x=x0+jit;
 const st=Math.sin(T*1.3)*3+(a.stretch||0),crawl=a.pose==='crawl';
 const sk=k.skin,top=k.top,dark='#2a2030';
 g.globalAlpha=.25;R(x-14,y,28,2,'#000');g.globalAlpha=1;
 if(a.dead){R(x-18,y-4,36,4,top);R(x-22,y-2,8,2,sk);R(x+14,y-3,10,2,sk);R(x-26,y-5,6,6,sk);R(x-25,y-3,4,2,'#100008');R(x-20,y,40,2,BLOOD[1]);return}
 if(crawl){
  /* on all fours like a spider: knees high above the body, hands flat on the floor */
  const by=y-12-st*.3;
  const legs=[[-10,-24,0],[-6,-14,1.7],[8,16,.9],[12,26,2.6]];
  const seg=(x0,y0,x1,y1,c)=>{const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)));for(let i=0;i<=n;i++){const t=i/n;R(Math.round(x0+(x1-x0)*t),Math.round(y0+(y1-y0)*t),2,2,c)}};
  for(const [sx,fx,ph] of legs){const lift=Math.max(0,Math.sin(T*10+ph))*3,kx=x+sx+(fx-sx)*.35,ky=by-16-st-lift*1.5;seg(x+sx,by,kx,ky,sk);R(kx-1,ky-1,3,3,'#c8a090');seg(kx,ky,x+fx,y-lift,sk);R(x+fx-2,y-1-lift,5,1,sk);R(x+fx-1,y-lift,1,1,BLOOD[1])}
  R(x-11,by-4,24,6,top);R(x-11,by-4,24,1,'#f0c8d4');for(let i=0;i<5;i++)R(x-6+i*3,by-3,1,1,'#fff');R(x-13*d-2,by-3,5,5,k.pants);
  const hx=x+d*15,hy=by-4;g.save();g.translate(hx,hy);g.rotate(d*(1.1+Math.sin(T*7)*.12));drawHead(k,0,-6,d,{ex:'evil'});const jaw=3+Math.round(Math.abs(Math.sin(T*6))*3);R(-3,3,7,jaw,'#100008');for(let i=-2;i<4;i+=2)R(i,3,1,1,'#f4f0e6');R(-3,3+jaw,7,1,BLOOD[1]);g.restore();
  for(let i=0;i<3;i++){const q=(T*1.4+i/3)%1;R(hx+d*3,hy+6+q*(y-hy-6),1,2,BLOOD[1])}
  return;
 }
 const legH=30+st,bodyH=20+st*.5,bt=y-legH-bodyH;
 /* legs: too long, knees backwards */
 R(x-4,y-legH,2,legH/2,dark);R(x-6,y-legH/2,2,legH/2,dark);R(x+3,y-legH,2,legH/2,dark);R(x+5,y-legH/2,2,legH/2,dark);
 R(x-8,y-1,4,1,'#1a1418');R(x+5,y-1,4,1,'#1a1418');
 /* skirt and cardigan, stretched thin */
 R(x-5,y-legH-4,11,6,k.pants);R(x-4,bt,9,bodyH,top);R(x-4,bt,1,bodyH,'rgba(0,0,0,.2)');for(let i=0;i<5;i++)R(x-3+i*1.5,bt+1+(i===2?1:0),1,1,'#fff');
 /* one arm hangs to the floor, fingers dragging */
 const ax=x+(d>0?-6:6);R(ax,bt+2,2,bodyH+legH-6,sk);for(let i=0;i<3;i++)R(ax-2+i*2,y-4+(i%2),1,4,sk);
 /* the other arm is in its mouth. It’s eating it. */
 const mx=x+d*7,chew=Math.sin(T*10)>0?1:0;
 R(x+(d>0?5:-7),bt+2,2,7,sk);R(x+(d>0?5:-9),bt-4+chew,6,2,sk);
 R(x+(d>0?6:-9),bt-1,4,2,BLOOD[1]);R(x+(d>0?7:-8),bt-2,2,1,'#f4f0e6');
 for(let i=0;i<3;i++){const q=(T*1.1+i/3)%1;R(x+(d>0?7:-8),bt+q*(bodyH+legH),1,2,BLOOD[1])}
 /* neck, too long; head on one side */
 R(x,bt-10-st,2,11+st,sk);
 const hy=bt-22-st;g.save();g.translate(x+1,hy+6);g.rotate(d*(.45+Math.sin(T*.9)*.15)+(Math.random()<.04?(Math.random()-.5)*.8:0));
 drawHead(k,0,-6,d,{ex:'evil'});
 R(-3,3,7,4+chew*2,'#100008');R(-2,3,1,1,'#f4f0e6');R(0,3,1,1,'#f4f0e6');R(2,3,1,1,'#f4f0e6');R(-3,7+chew*2,7,1,BLOOD[1]);
 g.restore();
}
{const _da=drawActor;drawActor=function(a){if(a&&a.id==='dopple'&&a.vis!==false){if(a.alpha<1)g.globalAlpha=Math.max(0,a.alpha);drawDopple(a);g.globalAlpha=1;return}return _da(a)}}
/* the lights go wrong when it’s close */
{const _do=HOOK.drawOver;HOOK.drawOver=(...a)=>{_do&&_do(...a);if(A&&A.dopple&&!A.dopple.dead&&Math.sin(T*13)>.82){g.globalAlpha=.35;R(0,0,W,180,'#000');g.globalAlpha=1}}}

mission('dopple',{name:'The Other Miss',icon:'🫥',who:['shermian','pat','aidan'],goal:'Find out what the second Ms. Sherman is, and stop it before it eats the school.',
 blurb:'There are two Ms. Shermans in the building. One of them is standing wrong. Its arms are too long. It’s eating something. It’s eating itself.',
 parts:['Two of her','Pat’s walk-in','Under the stairs','The real one','It starts','The boiler room'],
 tips:['Before school, break or lunch: the Main Corridor.'],
 variants:{burned:'Burned',fed:'Fed until it burst',merged:'They’re one again'}});
DEATHS.hungry={name:'Hungry',desc:'It said “sorry, sweetie” the whole time it was eating you. It meant it.',hint:'The Other Miss. When it crawls, run. Don’t stop.'};
DEATHS.boiled={name:'Lunchbox',desc:'You went into the boiler room without food for it. You were the food.',hint:'The Other Miss. Bring Pat’s meat.'};
const dp=()=>D.f.dp||0;
const DPCH={on:false,t0:0};

/* 1 — two of her */
hook({mis:'dopple',period:[0,2,4],room:'corridor',who:'auto',cond:()=>cal()>=3&&!D.f.dp&&!D.dead.sherman,run:async()=>{
 const cast={you:[90,1,{y:156}],shermian:[130,-1,{y:146,pose:'hips'}]};if(!D.dead.hasan)cast.hasan=[64,1,{y:150}];
 scene('corridor',cast,true);cue('class');
 await say('shermian','Walk, don’t run, sweeties. Miss is watching.','smirk');
 await walk('shermian',-20,50);remove('shermian');
 await wait(400);cue('evil');SFX.sting();
 put('dopple',300,-1,{y:146});
 await N('Ms. Sherman just walked out of the left end of the corridor. Ms. Sherman is also standing at the right end of the corridor.');
 await N('The one at the right end is wrong. Too tall. Arms down past its knees. Its head is on one side, like it’s listening to something in the floor. It has its other hand in its mouth.');
 SFX.crunch();await wait(300);SFX.crunch();
 await N('It’s chewing. You can hear it from here.');
 if(A.hasan)await say('hasan','(not moving his lips) Bro. Bro. Do you see— tell me you see the second one. Tell me I’m not having a fucking stroke.','scared');
 await say('dopple','(in her voice, but slower, and wet) Hungry, sweeties. Miss is so… hungry.','evil');
 A.dopple.pose='crawl';SFX.scream();await walk('dopple',340,220);remove('dopple');
 await N('It drops onto all fours and goes round the corner faster than anything with that many joints should move. The lights flicker. Then everything is normal.');
 if(A.hasan)await say('hasan','I’m going home. I’m going home and getting in a bath and I’m never getting out.','scared');
 D.f.dp=1;part('dopple',1);return 'stay';
}});
/* 2 — Pat’s walk-in */
hook({mis:'dopple',period:[2,4],room:'canteen',who:'pat',label:'Ask Pat why the walk-in freezer door is bent',look:{ex:'scared'},cond:()=>dp()===1,run:async()=>{
 scene('canteen',{pat:[90,1,{y:140,ex:'scared'}],you:[120,-1,{y:150}]},true);
 await say('pat','Forty pounds of ground beef. Six frozen turkeys. Every mop head in the building. Gone. In one night.','scared');
 await say('pat','There’s teeth marks in the freezer door, love. In the METAL. And there’s lipstick on them. Coral. Ms. Sherman’s shade.','scared');
 await say('pat','I’ve worked here twenty-two years. I’ve seen things go in this kitchen that came out different. I’ve never seen something come IN to eat.','evil');
 await say('pat','It left a trail. Wet. Down the corridor and up the stairs. It went under the stairs.','scared');
 D.f.dp=2;part('dopple',2);intel('doppleTrail');
}});
/* 3 — under the stairs */
hook({mis:'dopple',period:[0,1,2,3,4,5,6],room:'stairwell',who:'auto',cond:()=>dp()===2,run:async()=>{
 scene('stairwell',{you:[30,1,{y:160}]},true);cue('evil');fxState.dark=.45;
 await N('The stairwell is dark. Somebody has unscrewed every bulb. Under the stairs, where the steps go up over your head, something is chewing.');
 put('dopple',112,-1,{y:166,pose:'crawl'});A.dopple.dir=1;
 for(let i=0;i<3;i++){SFX.crunch();await wait(TEST?0:350)}
 await N('It’s folded up under the bottom steps like a spider in a shoe. It has its own forearm in its mouth. There isn’t much forearm left. There’s bone, and it’s gnawing the bone.');
 await say('dopple','(not looking at you) Sorry, sweetie. Sorry. Miss can’t stop. Miss has to eat something. There was nothing else.','cry');
 await say('dopple','(turning its head all the way round to look at you) …There’s you.','evil');
 SFX.scream();shake(1.4);A.dopple.dir=-1;
 if(TEST){D.f.dp=3;part('dopple',3);fxState.dark=0;return 'stay'}
 /* a real chase: it crawls after you; sprint (Shift) out the far end of the stairwell */
 A.you.x=124;A.you.dir=1;A.dopple.x=40;A.dopple.dir=1;await N('It unfolds out from under the steps. Behind you. Between you and the way you came in. The only way out is up, at the far end.');
 A.dopple.pose='crawl';A.dopple.noPush=1;DPCH.on=true;DPCH.t0=T+0.3;PAT={id:'dopple',alert:1.05,state:'script',pause:0,turnT:T+99,sp:0,seen:true,knows:1};
 toast('RUN. Hold SHIFT. Out the far end of the stairwell. Don’t stop.');
 return 'stay';
}});
/* 4 — the real one */
spot({room:'hallb',x:220,y:146,label:'Knock on Ms. Sherman’s office (VP Office) about the other one',short:'SHERMAN',mis:'dopple',cond:()=>dp()===3&&!D.dead.sherman,run:async()=>{
 scene('office',{sherman:[158,1,{pose:'sit',y:128,layer:20}],you:[100,1,{y:160}]},true);cue('sad');
 await N('Ms. Sherman’s office. She’s sitting very still with the lights off. She looks pale. Paler than you’ve ever seen her. She doesn’t tell you to get out.');
 await say('sherman','You’ve seen her. The other one.','sad');
 await say('sherman','March 1987. The boiler room. I went to get a coffee. When I came back the door was too hot to touch, and I stood there, and I listened to them, and I did nothing.','sad');
 await say('sherman','The part of me that stood there listening never came back up the stairs. She stayed down there with them. Thirty-nine years. She’s been hungry the whole time.','cry');
 await say('sherman','She gets bigger when she eats a child, dear. Don’t let her eat a child.','scared');
 await say('sherman','Pat will give you meat. Take it down to the boiler room. She’ll follow food anywhere. Then… do what I couldn’t.','sad');
 D.f.dp=4;part('dopple',4);intel('doppleWhat');
 D.room='hallb';buildRoom('hallb');return 'stay';
}});
hook({mis:'dopple',period:[2,4],room:'canteen',who:'pat',label:'Ask Pat for the meat',look:{ex:'evil'},cond:()=>dp()>=4&&!has('meat')&&!D.done.dopple,run:async()=>{
 scene('canteen',{pat:[90,1,{y:140}],you:[120,-1,{y:150}]},true);
 await say('pat','(already holding a bucket) Ground beef. Twenty pounds. And I put my cleaver in the bottom. In case.','evil');
 give('meat');
 await say('pat','Don’t you get eaten, love. I’m not cleaning that up. I’ll clean it up. But I won’t like it.','sad');
}});
/* 5 — it starts */
hook({mis:'dopple',period:[0,1,2,3,4,5,6],room:'wing_sci',who:'auto',cond:()=>dp()===4&&!D.f.dpKill,run:async()=>{
 D.f.dpKill=1;
 const cast={you:[60,1,{y:156}],kid2:[180,-1,{y:146}],kid3:[210,-1,{y:146}]};if(!D.dead.aidan&&!D.f.aidanDead)cast.aidan=[270,-1,{y:146}];
 scene('wing_sci',cast,true);cue('evil');
 await N('The Science Wing. Kids at their lockers. Normal. Then the ceiling tile above the eyewash station bends down in the middle, like something heavy is lying on it.');
 SFX.crunch();shake(1.6);put('dopple',190,-1,{y:146,stretch:6});A.dopple.z=60;await tw(A.dopple,{z:0},300);SFX.thud();
 await N('It comes through the ceiling. Arms first. It lands on the freshman.');
 SFX.scream();SFX.squelch();SFX.crunch();shake(2);flash('#a00010',.5);
 for(let i=0;i<3;i++){blood(A.kid2.x,A.kid2.y-16,40,null,100,A.kid2.y+2);await wait(TEST?0:220)}
 kill('kid2','lie',{pool:44,bleed:6});D.dead.kid2=1;
 await N('It doesn’t kill him first. It just starts eating. The whole hallway screams. The seventh grader next to him doesn’t. Her mouth is open. Nothing comes out.');
 await say('dopple','(chewing, crying, polite) Thank you, sweetie. Thank you. Miss was so hungry. Miss is still so hungry.','cry');
 A.dopple.stretch=10;await N('You watch it get taller. Its arms crack and get longer. Its neck stretches like chewing gum. It doesn’t stop eating while it grows.');
 if(A.aidan){await say('aidan','(not scared at all, standing next to his locker) She comes to locker 217 at night. She sits in there with me. She sings. She’s nice to me.','sad');await say('aidan','She’s not nice to them.','sad')}
 const c=await choose(['Grab the seventh grader and run.','Throw something at it.','Run.']);
 if(c===0){await walk('you',A.kid3.x-10,140);pose('you','grab');const ok=await mash('Drag her out!',{need:18,time:4});pose('you',null);
  if(ok){await Promise.all([walk('you',-20,150),walk('kid3',-20,150)]);await N('You get her out. She still hasn’t made a sound. At the end of the corridor she says, very calmly, “that was my brother.”')}
  else{A.dopple.pose='crawl';await walk('dopple',A.kid3.x+8,220);SFX.crunch();blood(A.kid3.x,A.kid3.y-18,50,null,100,A.kid3.y+2);kill('kid3','lie',{pool:40});D.dead.kid3=1;await N('Too slow. Her hand comes out of yours. You don’t look back. You hear it, though.');await walk('you',-20,170)}}
 else if(c===1){pose('you','throw');SFX.thud();await N('Your bag hits it in the face. It doesn’t notice. It doesn’t notice anything that isn’t food.');pose('you',null);await walk('you',-20,170)}
 else await walk('you',-20,170);
 D.room='hallb';buildRoom('hallb');return 'stay';
}});
/* 6 — the boiler room */
spot({room:'corridor',x:40,y:150,label:'Go down the old hatch with Pat’s meat',short:'HATCH',mis:'dopple',cond:()=>dp()>=4&&D.f.dpKill&&!D.done.dopple,run:async()=>{
 const cast={you:[60,1,{y:156}]};if(!D.dead.sherman)cast.sherman=[-14,1,{y:150}];
 scene('boiler',cast,true);cue('evil');fxState.dark=.35;
 if(!has('meat')){
  await N('The boiler room. It’s waiting. It was always going to be waiting. You didn’t bring it anything.');
  put('dopple',300,-1,{y:150,pose:'crawl',stretch:12});await walk('dopple',A.you.x+8,240);SFX.crunch();SFX.squelch();shake(2);flash('#a00010',.6);blood(A.you.x,A.you.y-22,80,null,120,A.you.y+2);fxState.dark=0;await die('boiled');
 }
 take('meat');
 await N('Down the ladder. Under the pool. The old boiler, split open. On the wall, the four names. And all over the floor, in a circle, bones. Small ones. Some of them are very old.');
 await N('The circle of bones is in the middle of the floor. That’s where it eats. That’s where the meat has to land. Something in the coal chute is already moving.');
 if(!TEST){const ok=await vgThrow('THROW THE MEAT INTO THE CIRCLE');if(!ok){put('dopple',300,-1,{y:150,pose:'crawl',stretch:12});await N('It lands short. Right at your own feet. Something comes out of the coal chute, very fast, towards the smell. Towards you.');const ran=await mash('BACK AWAY. NOW.',{need:24,time:3.5});if(!ran){await walk('dopple',A.you.x+8,240);SFX.crunch();SFX.squelch();shake(2);flash('#a00010',.6);blood(A.you.x,A.you.y-22,80,null,120,A.you.y+2);fxState.dark=0;await die('boiled')}await walk('you',40,160);remove('dopple')}}
 pprop({t:'bucket',x:150,y:156,layer:2});
 await N('The bucket lands in the middle of the bones with a wet thump. You back away from it until your shoulders hit the ladder.');
 SFX.crunch();put('dopple',300,-1,{y:150,pose:'crawl',stretch:12});await walk('dopple',160,90);
 await N('It comes out of the coal chute. It’s huge now. Its back scrapes the ceiling. It goes straight to the bucket and pushes its whole head in.');
 if(A.sherman){await walk('sherman',70,50);await N('Behind you, someone comes down the ladder. Ms. Sherman. The real one. In her cardigan. Holding a coffee cup. Her hands are shaking so much the coffee is going everywhere.')}
 const opts=[{t:'Light the boiler. Burn it.',tag:'🔥'},{t:'Keep feeding it. All of it. Until it can’t.'}];
 if(A.sherman)opts.push({t:'Let Ms. Sherman go to it.'});
 const c=await choose(opts,'It’s eating. It isn’t watching you.');
 if(c===0){
  await walk('you',120,80);pose('you','reach');SFX.fire();prop({t:'fire',x:150,y:150,w:40,n:16});flash('#ff8030',.6);shake(1.5);
  A.dopple.pose=null;A.dopple.stretch=16;SFX.scream();
  await N('The old pilot light catches on the first try, after thirty-nine years. The fire goes up the walls. It goes up her.');
  await say('dopple','(standing up, all the way up, burning, in Ms. Sherman’s voice, very gently) …Thank you, sweetie. It’s warm. It’s finally warm down here.','cry');
  kill('dopple','lie',{pool:0});A.dopple.dead='burn';
  await N('It folds up in the fire like a deckchair. The smell is the worst thing you have ever smelled. The four names on the wall go black.');
  await complete('dopple','burned');
 }else if(c===1){
  props=props.filter(p=>p.t!=='bucket');
  await N('You kick the bucket over. It eats the meat. It eats the bucket. It eats Pat’s cleaver out of the bottom of the bucket. Then it starts on its own fingers. It doesn’t know how to stop.');
  A.dopple.stretch=22;await wait(500);SFX.squelch();SFX.splat();shake(2.2);flash('#a00010',.7);
  for(let i=0;i<4;i++)blood(A.dopple.x,A.dopple.y-20,70,null,140,A.dopple.y+2);
  kill('dopple','lie',{pool:60});
  await N('It eats until it bursts. All over the boiler. All over the names. All over you. Somewhere in the mess there’s a gold sticker that says GOOD JOB.');
  await complete('dopple','fed');
 }else{
  await walk('sherman',A.dopple.x-12,40);
  await say('sherman','(to it, very quietly) I’m sorry I left you down here. I’m sorry I left them. Come here. Come back.','cry');
  A.dopple.pose=null;await walk('dopple',A.sherman.x+6,40);pose('sherman','hug');pose('dopple','hug');
  SFX.crunch();shake(1.2);flash('#fff',.5);await tw(A.dopple,{alpha:0,x:A.sherman.x},900);delete A.dopple;
  await N('It folds itself around her. Arms, and arms, and arms. Then there’s just one Ms. Sherman, standing in the boiler room with her coffee on the floor.');
  A.sherman.ex='evil';pose('sherman',null);
  await say('sherman','(turning round, smiling, her eyes much too dark) Thank you, sweetie. Miss feels so much better.','evil');
  await N('Her stomach makes a noise. A long one. She looks down at it. Then she looks at you.');
  await say('sherman','…Lunch. Miss needs to get some lunch.','evil');
  await complete('dopple','merged');
 }
 fxState.dark=0;D.room='corridor';buildRoom('corridor');return 'stay';
}});
Object.assign(INTEL,{doppleTrail:'Something emptied Pat’s walk-in and left a wet trail to under the stairs. Coral lipstick on the teeth marks.',doppleWhat:'Ms. Sherman: the part of her that stood outside the boiler room in 1987 never came back up. It’s hungry.'});
MIS.dopple.tipNow=()=>{const s=dp();return s===0?'Before school, break or lunch: the Main Corridor.':s===1?'Break or lunch, the Cafeteria: ask Pat about the freezer.':s===2?'The Stairwell (right end of the Main Corridor). Something is under the stairs.':s===3?'The Front Hall: knock on the VP Office door. Ms. Sherman.':!has('meat')?'Break or lunch, the Cafeteria: get the meat from Pat.':!D.f.dpKill?'The Science Wing. Something is in the ceiling.':'Main Corridor, far left: the old hatch. Bring the meat.'};
if(typeof MOREGOSSIP==='function'){const _mg=MOREGOSSIP;MOREGOSSIP=function(){const g=_mg();if(D&&D.f.dp)g.push('there are two ms shermans. TWO','something ate the mop heads','i heard chewing in the stairwell');if(D&&D.f.dpKill)g.push('something came through the ceiling in science','they found a shoe. just a shoe. with a foot');return g}}

/* the stairwell chase: it's faster than walking, slower than sprinting */
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(!DPCH.on||TEST)return;const t=A.dopple;
 if(!t||ROOM!=='stairwell'){return}
 if(busy||panelMode!=='roam')return;
 if(T-DPCH.t0<1.2){if(PAT)PAT.state='script';return}
 if(PAT&&PAT.id==='dopple'){PAT.state='chase';PAT.knows=1}
 if(Math.random()<rdt*2.5){SFX.crunch&&SFX.crunch()}
 if(A.you&&PAT&&PAT.state==='chase'){const d=A.you.x-t.x;if(Math.abs(d)>4)t.x+=Math.sign(d)*30*rdt}
 if(A.you&&A.you.x>=304){DPCH.on=false;PAT=null;runHook({run:async()=>{fxState.dark=0;await N('You hit the top of the stairs at full speed. Behind you it stops at the bottom step, like there’s a line it can’t cross. It goes back under the stairs, and the chewing starts again.');remove('dopple');D.f.dp=3;part('dopple',3);D.room='upper';buildRoom('upper');return 'stay'}})}}}
{const _er=enterRoom;enterRoom=async function(r){if(DPCH.on&&r!=='stairwell'){DPCH.on=false;PAT=null;const res=await _er(r);D.f.dp=3;part('dopple',3);toast('It didn’t follow you out. Behind the door: chewing.');return res}return _er(r)}}
