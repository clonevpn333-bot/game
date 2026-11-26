'use strict';
/* =====================================================================
   HIGHSCHOOL — CHAOS
   The school doesn’t wait for you. Walk into a room and something might
   already be going off: a food fight, a goose, a vending machine
   eating a kid, fight club in the bathroom, Arjun on the PA. You can
   watch, join, or get out of the way. Free: no apples.
   ===================================================================== */
const CHX={},chaosDone=id=>(D.f.chaos||{})[id+cal()];
function chaos(id,rooms,periods,chance,run,cond){CHX[id]={rooms,periods,chance,run,cond}}
{const _dp=drawProp;drawProp=function(p){
 const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='goose'){const f=Math.sin(T*14)>0;R(x-5,y-6,10,6,'#f4f4f0');R(x+3,y-12,3,7,'#f4f4f0');R(x+5,y-12,4,2,'#f0a020');R(x+4,y-11,1,1,'#1a1a1a');R(x-6,y-5+(f?1:0),3,2,'#e8e8e4');R(x-2,y,1,3,'#f0a020');R(x+2,y,1,3,'#f0a020');return}
 if(p.t==='vending'){g.save();g.translate(x,y);g.rotate(p.rot||0);R(-10,-36,20,36,'#c02030');R(-8,-33,12,24,'#2a2a3a');for(let i=0;i<4;i++)for(let j=0;j<3;j++)R(-7+j*4,-31+i*6,3,4,['#e0c040','#40a0e0','#e06040'][(i+j)%3]);R(5,-30,3,10,'#8a8a8a');g.restore();return}
 if(p.t==='food'){const q=Math.min((T-p.t0)*2,p.land||1.6);const fy=Math.min(y+q*q*10-q*14,p.floor||170);R(x+(p.vx||0)*q,fy,3,2,p.c||'#e8c040');return}
 if(p.t==='water'){g.globalAlpha=.5;for(let i=0;i<30;i++){const q=(T*2+i/30)%1;R(hsh(i)*W,q*112,1,4,'#9ac8f0')}g.globalAlpha=1;return}
 if(p.t==='raccoons'){for(let i=0;i<(p.n||8);i++){const q=((T*.7+i/(p.n||8))%1);const rx=W-q*(W+40),ry=y+((i*7)%14);R(rx,ry-5,9,5,'#6a6a72');R(rx-3,ry-7,4,4,'#6a6a72');R(rx-2,ry-6,2,1,'#1a1a1a');R(rx+8,ry-4,4,2,'#3a3a3a');R(rx+11,ry-4,1,2,'#c8c8c8')}return}
 return _dp(p)}}

chaos('foodfight',['canteen'],[2,4],.3,async()=>{
 const ks=Object.keys(A).filter(k=>k!=='you'&&A[k]&&!A[k].dead&&!(K[k]&&K[k].adult));
 await N('Somebody throws a chicken nugget. Then somebody throws a tray. Then the whole cafeteria stands up at once and it’s war.');
 SFX.cheer();cue('fight');
 for(let i=0;i<14;i++){prop({t:'food',x:20+Math.random()*280,y:110+Math.random()*20,vx:(Math.random()-.5)*60,floor:140+Math.random()*30,land:1+Math.random()*1.5,c:pick(['#e8c040','#c04030','#f4f0e6','#6a9a3a'])});await wait(TEST?0:60)}
 for(const k of ks.slice(0,6)){A[k].ex=pick(['laugh','angry','shock']);A[k].pose=pick(['throw','cover','throw'])}
 if(A.pat){hold('pat','cleaver');await tw(A.pat,{z:16},300);pose('pat','up');await say('pat','(up on the counter with a cleaver) WHO THREW MY STEW. WHO THREW MY STEW.','yell')}
 const c=await choose(['Throw your tray at Arjun.','Get under a table.','Eat the dessert while nobody’s looking.']);
 if(c===0){pose('you','throw');SFX.smack();await N('Clean hit. Right in the back of the head. He turns round with spaghetti in his ear and points at Hasan. Hasan gets destroyed.');pose('you',null)}
 else if(c===1){pose('you','kneel');await N('Under the table it’s quiet. Jacob is already under here, eating calmly. He offers you a fry.');pose('you',null)}
 else await N('Six pudding cups. Nobody notices. Best lunch of your life.');
 const v=ks.find(k=>!FRIENDS.includes(k));if(v){SFX.squelch();blood(A[v].x,A[v].y-24,10,null,30,A[v].y+2);A[v].ex='hurt';await N('A '+K[v].n.toLowerCase()+' takes a fork in the cheek. It’s stuck there. He’s laughing about it. He’s in shock.')}
 for(const k of ks)if(A[k]){A[k].pose=null}
 if(A.pat){pose('pat',null);hold('pat',null);await tw(A.pat,{z:0},250)}
});
chaos('goose',['field','walkway'],[0,2,4],.2,async()=>{
 const gs=pprop({t:'goose',x:340,y:156,layer:4});SFX.scream();
 await N('There is a goose on the school field. Nobody knows where it came from. It is the angriest animal you have ever seen.');
 await tw(gs,{x:200},700);
 if(!D.dead.coach){put('coach',-14,1,{y:150});await walk('coach',170,120);await say('coach','GET OFF MY FIELD, YOU FEATHERED—','yell');SFX.smack();shake(.8);A.coach.pose='lie';await N('The goose takes Coach down in one hit. Grown man. Two hundred and forty pounds. On his back in the grass with a goose standing on his chest.')}
 const c=await choose(['Fight the goose.','Run.','Film it.']);
 if(c===0){const ok=await mash('Fight the goose!',{need:18,time:4});if(ok){await tw(gs,{x:-40},500);await N('You win. Barely. The goose leaves on its own terms. You will never be the same.')}else{SFX.squelch();A.you.hurt=2;await N('The goose wins. It bites your ear and doesn’t let go until you say sorry. Out loud.')}}
 else if(c===1){await walk('you',-20,140);await N('You run. The goose chases you exactly to the edge of the field and stops, like it has a property line.')}
 else{pose('you','film');await N('You film it. It gets eleven thousand views by home time. The goose becomes a school legend. Coach never talks about it.');pose('you',null)}
 if(A.coach)A.coach.pose=null;gs.hide=1;
});
chaos('vending',['corridor','hallb'],[0,2,4],.2,async()=>{
 const vm=pprop({t:'vending',x:230,y:150,rot:0,layer:2});
 const v=extra('kid1',210,1,{y:150});
 await N('A kid is shaking the vending machine. His Takis are stuck. He’s shaking it harder. Everybody in the hall knows exactly how this ends.');
 if(v){await say(v,'(shaking it) COME ON. COME ON YOU PIECE OF—','angry');
  await tw(vm,{rot:-.4},300);SFX.crunch();SFX.thud();shake(1.6);await tw(vm,{rot:-1.5,x:212},250);
  blood(A[v].x,A[v].y-4,40,null,70,A[v].y+2);kill(v,'crush',{pool:30});D.dead[v]=1;
  await N('It comes down on him like a tree. All of it. You hear something go that shouldn’t go.')}
 SFX.cheer();await N('Snacks everywhere. Then every kid in the hall is on their knees, grabbing chips, stepping over him, saying sorry with their mouths full.');
 const c=await choose(['Grab some chips.','Try to lift the machine off him.']);
 if(c===0){D.money=(D.money||0)+1;updateLoc();await N('Takis. Of course. The bag is a little bit wet. You don’t look at why.')}
 else{const ok=await mash('Lift!',{need:16,time:4});await N(ok?'You get it up an inch. Paul shows up from nowhere and lifts the rest. Too late. Paul says a prayer he made up himself.':'It’s six hundred pounds. You get it up nothing. Paul shows up and lifts it with one hand. Too late.')}
});
chaos('fightclub',['toilets'],[0,2,4,1,3,5,6],.3,async()=>{
 const p=!D.dead.paul?'paul':null,a=extra('kid4',180,-1,{y:150}),b=extra('jaxon',220,1,{y:150});
 if(p)put(p,140,1,{y:146});
 await N('Fight club. In the boys’ bathroom. Somebody has drawn a ring on the floor in toothpaste. Paul is refereeing with a toilet brush.');
 if(p)await say(p,'First rule of fight club: tell everyone. Second rule: no biting. Third rule: biting is fine actually.','happy');
 const c=await choose(['Bet two bucks on the sophomore.','Get in the ring.','Leave. This is stupid.']);
 if(c===1){await walk('you',200,80);const ok=await mash('FIGHT',{need:16,time:4});if(ok){await hit('you',a||'jaxon',{blood:6});await N('You win. You don’t know how. Somebody puts a paper towel crown on your head. You will remember this moment more than your own birthday.')}else{SFX.punch();A.you.hurt=2;blood(A.you.x,A.you.y-24,12,null,40,A.you.y+2);await N('You lose. Fast. In front of everyone. Your nose is somewhere slightly to the left of where it was.')}}
 else if(c===0){await hit(a||'kid4',b||'jaxon',{blood:5});const win=Math.random()<.5;if(win){D.money=(D.money||0)+2;updateLoc()}else{D.money=Math.max(0,(D.money||0)-2);updateLoc()}await N(win?'The sophomore wins with a headbutt that sounds like a dropped watermelon. You get four bucks.':'The sophomore slips on the toothpaste and knocks himself out on a sink. You’re down two bucks.')}
 else await N('You leave. Behind you, a cheer, a crunch, and Paul shouting “THAT’S A BITE. ALLOWED.”');
});
chaos('pa',['corridor','hallb','wing_sci','upper'],[0,2,4],.2,async()=>{
 if(D.dead.arjun)return;
 SFX.static();
 await say('arjun','(over the PA, every speaker in the building) Good morning, Highgate. This is Arjun. Mr. Adam is tied to his chair. He’s fine. He’s laughing. He’s crying. Both.','smirk');
 await say('arjun','(PA) Ms. Loach: your cardigan has had the same stain since 2009. It’s formed a society. It has a government.','smirk');
 await say('arjun','(PA) Coach: we all know about the protein shakes. We know what’s in them. It’s your own sweat, Coach.','smirk');
 await say('arjun','(PA) Mr. Voss: no.','smirk');
 SFX.door();await N('Over the speakers, a door opens. Heels. Very slow heels.');
 await say('arjun','(PA, much quieter) …Hi, Ms. Sherman. Love the… you look really— that’s a big stapler, Ms. Sherman—','scared');
 SFX.static();await N('The PA cuts out. Every kid in the hallway stands completely still. Then the bell rings, and somebody, somewhere, starts a slow clap.');
});
chaos('brawl',['corridor','hallb'],[0,2,4],.15,async()=>{
 if(D.dead.coach||D.dead.grieve)return;
 put('coach',60,1,{y:146,hold:'javelin'});put('grieve',260,-1,{y:146,hold:'sword'});
 await say('coach','That was MY parking space, Grieve.','yell');
 await say('grieve','I have parked in that space since the Falklands, soldier.','yell');
 cue('fight');await Promise.all([walk('coach',150,120),walk('grieve',170,120)]);
 pose('coach','stab');pose('grieve','overhead');SFX.smack();SFX.crunch();shake(1.4);
 await N('Two grown men fight with a javelin and a sword in the main hallway over a parking space. Kids press themselves flat against the lockers. Nivaan gets it in 4K.');
 const v=extra('kid3',160,1,{y:156});if(v){SFX.squelch();blood(A[v].x,A[v].y-22,20,null,50,A[v].y+2);A[v].ex='hurt';await N('A seventh grader walks right between them looking at her phone and loses the tip of her ponytail to the sword. And a bit of ear. She doesn’t look up.')}
 const c=await choose(['Break it up.','Cheer.','Steal Coach’s whistle while he’s busy.']);
 if(c===0){await N('You walk between them. They look at you. Then at each other. Then they shake hands and go to the staff room together. You did that.')}
 else if(c===1){SFX.cheer();await N('You cheer. Everybody cheers. Grieve wins on points. Coach demands a rematch. The rematch is scheduled for Friday in the gym. Tickets are a dollar.')}
 else{hold('you','whistle');await N('You get it. Coach doesn’t notice for two days. You blow it at random in the hallway and watch every kid drop and do push-ups.');hold('you',null)}
 pose('coach',null);pose('grieve',null);await Promise.all([walk('coach',-20,80),walk('grieve',340,80)]);remove('coach');remove('grieve');
});
chaos('raccoons',['corridor','hallb','upper','wing_arts','library'],[1,2,3,4,5,6],.12,async()=>{
 SFX.thud();shake(1);const r=pprop({t:'raccoons',x:0,y:150,n:14,layer:6});
 await N('A ceiling tile falls. Then all of them do. Fourteen raccoons come out of the ceiling and run down the hall like they’ve been planning it for a year.');
 for(const k in A)if(A[k]&&k!=='you'&&!A[k].dead){A[k].ex='scared';A[k].pose='cover'}
 await wait(TEST?0:1600);
 await N('One has a phone. One has a lanyard. One has a Highgate hoodie on. The office calls the police. The police laugh.');
 r.hide=1;for(const k in A)if(A[k]&&!A[k].dead)A[k].pose=null;
});
chaos('sprinklers',['corridor','hallb','wing_sci','wing_arts','upper'],[0,1,2,3,4,5,6],.12,async()=>{
 const w=pprop({t:'water',x:0,y:0,layer:200});SFX.bell();SFX.bell();
 await N('Somebody vaped right under a smoke detector. The sprinklers come on. The whole hallway gets soaked in old brown water that smells like a pond.');
 for(const k in A)if(A[k]&&k!=='you'&&!A[k].dead)A[k].ex=pick(['shock','angry','laugh']);
 if(!D.dead.voss){put('voss',334,-1,{y:146});await walk('voss',200,60);await say('voss','(holding out a jar, catching drops) Oh, this is wonderful water. Wonderful. Ninety years old. Nobody touch it. Nobody DRINK it.','happy');await walk('voss',-20,60);remove('voss')}
 await N('By the time the alarm stops, three kids have their hair turn faintly green. It doesn’t wash out until the weekend.');
 w.hide=1;
});
chaos('jar',['wing_sci'],[0,2,4],.25,async()=>{
 const j=pprop({t:'ball',x:340,y:156,layer:4});
 await N('A jar is rolling down the Science Wing. On its own. There’s an eye in it. A big one. Looking at everybody it rolls past.');
 await tw(j,{x:200},900);
 const kicker=!D.dead.alex&&!(typeof alexGone==='function'&&alexGone())?'alex':'kid2';put(kicker,170,1,{y:150});
 await say(kicker,'(stepping up to it) …I’m kicking it. I’m kicking the eye. Nobody stop me.','smirk');
 pose(kicker,'kick');SFX.punch();await tw(j,{x:-30,y:120},500);j.hide=1;pose(kicker,null);
 await N('Straight down the hall and through the open door of the Chem Lab. From inside, Mr. Voss shouts “GOAL!” and then, much quieter, “that was my FATHER’S.”');
});
chaos('dodge',['wing_sports'],[2,4],.25,async()=>{
 if(D.dead.coach)return;put('coach',300,-1,{y:146,hold:'medball'});
 await say('coach','RANDOM REFLEX TESTING. Anybody in this hallway is a participant.','yell');
 pose('coach','throw');SFX.whoosh();
 const ok=await mash('DODGE',{need:10,time:2});
 if(ok){await N('It misses you by an inch and takes a freshman off his feet behind you. Coach nods. Respect.');const v=extra('kid2',80,1,{y:150});if(v){A[v].pose='lie';SFX.thud()}}
 else{SFX.thud();A.you.hurt=2;A.you.pose='lie';await N('Medicine ball. Chest. You fold up like a lawn chair. Coach writes something on his clipboard. It’s an F.');A.you.pose=null}
 hold('coach',null);
});
chaos('trailerTip',['walkway'],[0,2,4],.15,async()=>{
 SFX.rumble();shake(1.6);
 await N('The Trailer tips. Not all the way. Just enough. From inside, the sound of every desk sliding to one side at once, and a lot of kids screaming, and Ms. Sherman humming.');
 const v=extra('kid3',250,-1,{y:150});
 if(v){A[v].pose='lie';await tw(A[v],{x:200,y:158},400);SFX.thud();await N('A seventh grader comes out of the Trailer’s window like toothpaste out of a tube, lands on the grass, gets up, and walks straight to the bus loop. She’s going home. She’s done.');A[v].pose=null;await walk(v,-20,80)}
});

/* when you walk in, maybe it’s already going off */
{const _er=enterRoom;enterRoom=async function(room){
 const r=await _er(room);
 if(TEST||!D||D.weekend||busy||panelMode!=='roam'||(typeof atHome==='function'&&atHome()))return r;
 D.f.chaos=D.f.chaos||{};
 if(D.f.chaos['p'+cal()+'_'+D.period])return r;
 const c=Object.entries(CHX).filter(([id,e])=>e.rooms.includes(room)&&e.periods.includes(D.period)&&!chaosDone(id)&&(!e.cond||e.cond())&&Math.random()<e.chance);
 if(!c.length)return r;
 const [id,e]=pick(c);D.f.chaos[id+cal()]=1;D.f.chaos['p'+cal()+'_'+D.period]=1;
 return runHook({run:async()=>{await e.run();return 'stay'}});
}}
if(typeof DAILY_F!=='undefined')DAILY_F.push('chaos');

/* kids, swearing like kids */
for(const [id,l] of Object.entries({
 hasan:['bro what the hell is going on in this school today','I’m so done. I’m SO done. Who put a goose on the field.'],
 arjun:['shut the hell up. no. not you. everyone. in general.','this school is a dumpster fire and I’m the only one who brought marshmallows'],
 omer:['If one more person says “nice shorts” I’m gonna lose my damn mind.','I’m not angry. I’m just gonna hit something. Not you. Probably.'],
 marcus:['Respectfully, what the actual hell.','This place is held together by spit and Ms. Sherman’s hairspray.'],
 kenneth:['bro I swear to god I’m taller than that','who keeps putting Vaseline on the basketballs. WHO.'],
 dheva:['don’t. touch. the hair. I’m being so for real right now.','this school smells like a wet dog had a panic attack'],
 paul:['I suplexed a kid into a trash can at break. He asked me to. Mostly.','my knuckles are bleeding and I feel great'],
 nivaan:['chat is literally losing it right now. LITERALLY.','I got the vending machine thing in 4K bro. I’m going to hell.']
}))if(CHAT[id])CHAT[id].push(...l);
