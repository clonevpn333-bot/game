'use strict';
/* =====================================================================
   HIGHSCHOOL — MAYHEM
   • Ms. Sherman in the hallway gets worse every time she catches you:
     a warning, then she takes your stuff, then she drags you by the ear,
     then the ruler, then the supply closet, then she stops talking.
   • Home time is a choice: the 43 home, or Fair City Mall. After the
     mall it’s dark: the late 43 (sketchy) or call home for a ride.
   • Nobody stands inside anybody: people step aside.
   • People don’t all stand the same: arms crossed, hands on hips, on
     their phones, chatting, looking round, fidgeting.
   • The students are worse than the teachers.
   ===================================================================== */

/* ---------- props and held things ---------- */
{const _dp=drawProp;drawProp=function(p){
 const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='fire'){const n=p.n||5,bg=p.big?2:1;for(let i=0;i<n;i++){const f=Math.sin(T*13+i*2.1),h=(8+((i*7)%6)+f*3)*bg;R(x-n*2+i*4,y-h,3,h,'#e8501a');R(x-n*2+i*4,y-h*.6,3,h*.6,'#f0a020');R(x-n*2+i*4+1,y-h*.3,1,h*.3,'#fff0a0')}
  g.globalAlpha=.25;for(let i=0;i<4;i++){const q=(T*.5+i/4)%1;R(x-6+Math.sin(i+T)*4,y-18-q*30,8+q*8,6,'#3a3a3a')}g.globalAlpha=1;return}
 if(p.t==='tripwire'){R(Math.min(x,p.x2),y,Math.abs(p.x2-x),1,'rgba(220,220,230,.7)');R(x-1,y-2,2,3,'#5a5a5a');R(p.x2-1,y-2,2,3,'#5a5a5a');return}
 if(p.t==='trashcan'){g.save();g.translate(x,y-6);g.rotate(p.rot||0);R(-6,-7,12,14,'#5a6a5a');R(-6,-7,12,2,'#7a8a7a');R(-6,-2,12,1,'#4a5a4a');R(-6,3,12,1,'#4a5a4a');
  if(p.head){R(-3,-12,6,6,p.skin||'#f0c8a8');R(-3,-13,6,2,p.hair||'#3a2418');R(-2,-10,1,1,'#1a1a1a');R(1,-10,1,1,'#1a1a1a')}g.restore();return}
 if(p.t==='duffel'){const w=Math.sin(T*9)*(p.wig||1);R(x-9,y-6+w*.5,18,7,'#3a4a3a');R(x-7,y-7+w,14,2,'#4a5a4a');R(x-2,y-9,4,2,'#2a2a2a');return}
 if(p.t==='ferret'){const s=Math.sin(T*20)>0;R(x-5,y-3,10,3,'#e8dcc8');R(x+4,y-4,3,3,'#e8dcc8');R(x+5,y-3,1,1,'#1a1a1a');R(x-7,y-2+(s?1:0),3,1,'#c8bca8');return}
 if(p.t==='auctiontable'){R(x-26,y-12,52,3,'#8a6a4a');R(x-24,y-9,2,9,'#5a4a3a');R(x+22,y-9,2,9,'#5a4a3a');R(x-20,y-16,6,4,'#e8e2d6');R(x-10,y-15,4,3,'#c03030');R(x,y-17,7,5,'#3a3a5a');R(x+12,y-15,5,3,'#f0d070');return}
 return _dp(p)}}
{const _dh=drawHeld;drawHeld=function(it,x,y,d){
 if(it==='chicken'){R(x-5,y-4,10,7,'#b8743a');R(x-4,y-5,8,2,'#d08a48');R(x+(d>0?4:-7),y-6,3,3,'#c88040');R(x-2,y-3,2,1,'#f0b070');return}
 if(it==='glasses'){R(x-4,y-2,3,3,'#9ac8e8');R(x+1,y-2,3,3,'#9ac8e8');R(x-4,y-2,8,1,'#2a2a2a');R(x-1,y-1,2,1,'#2a2a2a');return}
 if(it==='gavel'){R(x-1,y-1,1,6,'#8a5a3a');R(x-3,y-3,6,3,'#6a3a1a');return}
 if(it==='marsh'){R(x,y-9,1,10,'#c8a070');R(x-1,y-11,3,3,'#f4f0e6');return}
 return _dh(it,x,y,d)}}
if(typeof GRIP_W!=='undefined')GRIP_W.ruler={rest:1.2,draw:(x,y,c,s)=>{gLine(x,y,c,s,-2,13,2,2,'#c8a060');for(let t=0;t<13;t+=3)gPerp(x,y,c,s,t,0,0,'#5a4a2a')}};
Object.assign(K,{
 lb_chicken:{n:'Man with a Chicken',col:'#8a7a5a',skin:'#e0b090',hair:'#5a4a3a',hs:'messy',top:'#6a6a4a',pants:'#3a3a3a',adult:1,beard:1,seed:91,v:150},
 lb_knife:{n:'Guy with a Knife',col:'#5a5a6a',skin:'#c89068',hair:'#141010',hs:'buzz',top:'#2a2a2a',pants:'#2a2a33',adult:1,seed:92,v:120},
 lb_sleeper:{n:'Sleeping Man',col:'#7a6a8a',skin:'#f0c8a8',hair:'#9a9a9a',hs:'short',top:'#5a4a6a',pants:'#3a3a48',adult:1,old:1,seed:93,v:110},
 lb_bag:{n:'Woman with a Bag',col:'#8a5a7a',skin:'#a87048',hair:'#141010',hs:'bun',top:'#7a3a5a',pants:'#2a2a33',adult:1,girl:1,skirt:1,seed:94,v:380},
 sub:{n:'Substitute',col:'#6a7a8a',skin:'#f0d0b8',hair:'#c8a060',hs:'side',top:'#8a9aaa',pants:'#4a4a5a',adult:1,glasses:1,seed:95,v:260}
});
for(const id of['lb_chicken','lb_knife','lb_sleeper','lb_bag','sub'])K[id].id=id;
DEATHS.hallmonitor={name:'Hall Monitor',desc:'Ms. Sherman caught you one time too many. She didn’t say anything this time.',hint:'Get caught skipping by Ms. Sherman. A lot.'};

/* =====================================================================
   1. MS. SHERMAN, EVERY TIME WORSE
   ===================================================================== */
const sherN=()=>(D&&D.f.sherC)||0;
function sherChance(){return Math.min(.5,.18+.07*sherN())}
async function sherCatch(fromPass){
 const n=sherN();D.f.sherC=n+1;save();
 const sid=A.sherman?'sherman':A.shermian?'shermian':'sherman';
 if(!A[sid])put(sid,334,-1,{y:146});
 const S=A[sid];if(n>=3)hold(sid,'ruler');
 if(Math.abs(S.x-A.you.x)>20)await walk(sid,A.you.x+(A.you.x>280?-16:16),n>=4?150:n>=2?110:90);
 face(sid,'you');face('you',sid);
 const leave=async()=>{hold(sid,null);S.pose=null;await walk(sid,S.x<160?-30:350,70);remove(sid)};
 const flee=async()=>{const to=A.you.x<160?300:20;await walk('you',to,150)};
 const runFrom=async(need)=>{const ok=await mash('RUN',{need,time:3,info:'Ms. Sherman is '+(n>=4?'sprinting':'coming')+'. MASH!'});if(ok){SFX.whoosh();await flee()}return ok};
 if(n===0){
  await say(sid,fromPass?'Hall pass, sweetie.':'Shouldn’t you be in class, sweetie?','evil');
  const c=await choose(['“Bathroom, Miss.”','Show her the back of a gum wrapper.','Run.']);
  if(c===0)await say(sid,'For forty minutes? Miss will be checking on your bladder, sweetie. Personally.','evil');
  else if(c===1)await say(sid,'(holding it up to the light for a long time) …Miss will allow it. Once. Miss writes everything down.','smirk');
  else if(!(await runFrom(14)))await say(sid,'(holding your hood) Miss has your face now, sweetie. Miss keeps faces.','evil');
  await leave();return 'stay';
 }
 if(n===1){
  await say(sid,'Again. Miss has a list, sweetie. You’re on it twice. Pockets.','evil');
  const c=await choose(['Empty your pockets.','“I literally just—”','Run.']);
  let take=c!==2||!(await runFrom(17));
  if(take){
   const it=D.items.find(i=>!['key','padlock','video','plan','newplan'].includes(i));
   pose(sid,'grab');await wait(300);
   if(it){D.items=D.items.filter(i=>i!==it);hold(sid,'paper');await N('She takes '+(ITEMS[it]||it).replace(/^./,m=>m.toLowerCase())+' out of your hand and drops it into her cardigan pocket. It doesn’t make a sound when it lands. Her pocket goes a long way down.')}
   else{const m=Math.min(D.money||0,3);D.money=(D.money||0)-m;updateLoc();await N(m?'She takes $'+m+' out of your hand, folds it twice and tucks it into her bra. “Lunch money tax, sweetie.”':'Your pockets are empty. She pats your face anyway. Her hand is cold like a fridge door.')}
   pose(sid,null);
  }
  await say(sid,'Three strikes, sweetie. Miss loves baseball.','smirk');
  await leave();return 'stay';
 }
 if(n===2){
  await say(sid,'Three times. Miss is starting to think you WANT to spend time with Miss.','evil');
  const c=await choose(['Let her take you to class.','Run.']);
  if(c===1&&await runFrom(20)){await say(sid,'(not chasing, just watching) Miss doesn’t run, sweetie. Miss doesn’t have to.','evil');await leave();return 'stay'}
  pose(sid,'grab');A.you.ex='hurt';SFX.smack();
  await N('She gets you by the ear. The whole ear. Every kid you pass gets very interested in their locker.');
  const per=D.period,cls=PERIODS[per].lesson?myClassFor(per):null;
  await Promise.all([walk(sid,-30,60),walk('you',-14,60)]);remove(sid);
  D.apples=Math.max(0,(D.apples||0)-1);updateLoc();
  if(cls){D.lateTo=cls;D.wander=null;toast('Dragged to class by the ear. Late.');setTimeout(()=>{busy=false;enterRoom(cls)},0);return 'ended'}
  A.you.x=20;A.you.ex=null;await N('She leaves you outside the staff room with your ear on fire. It’s still ringing at lunch.');return 'stay';
 }
 if(n===3){
  await say(sid,'Hands out, sweetie.','evil');
  const c=await choose(['Hold your hands out.','“My dad’s a lawyer.”','Run.']);
  if(c===2&&await runFrom(22)){await say(sid,'(slapping the ruler into her palm) Next time, sweetie. Next time it’s not the ruler.','evil');await leave();return 'stay'}
  if(c===1)await say(sid,'Miss ate a lawyer once. 1994. Very chewy. Hands.','smirk');
  pose('you','hold');
  for(let i=0;i<3;i++){pose(sid,'overhead');await wait(TEST?0:220);pose(sid,'stab');SFX.smack();shake(.4);await wait(TEST?0:160)}
  A.you.hurt=Math.max(A.you.hurt||0,1);blood(A.you.x+6,A.you.y-18,6,1,40,A.you.y+2);pose('you',null);A.you.ex='hurt';
  D.apples=Math.max(0,(D.apples||0)-2);updateLoc();
  await N('Three on each hand. Edge of the ruler, not the flat. Your knuckles split. She wipes the ruler on her skirt and checks it for damage. Not you. The ruler.');
  await say(sid,'Miss was a nun once. For a week. Nobody ever checked why it was only a week.','smirk');
  await leave();return 'stay';
 }
 if(n===4){
  SFX.sting();await N('Ms. Sherman doesn’t say anything. She just starts running at you. She runs like a person who learned running from a video of a spider.');
  if(await runFrom(23)){await N('You make it round the corner. Behind you, her shoes stop. You hear her say, very calm, from very close: “Next time.”');await leave();return 'stay'}
  pose(sid,'grab');SFX.door();fxState.dark=0;await tw(fxState,{dark:1},500);
  await N('The supply closet. The door locks from the outside. It smells like bleach and pencil shavings, and something in the back is breathing slower than you are.');
  await N('She lets you out when the bell goes. She doesn’t say a word. There are long scratches on the inside of the door, low down, kid height. Some of them are yours now.');
  remove(sid);hold(sid,null);await tw(fxState,{dark:0},400);busy=false;setTimeout(()=>endPeriod(),0);return 'ended';
 }
 await N('Ms. Sherman is at the end of the hallway. She isn’t smiling. She isn’t anything. Her jaw starts to open, and it keeps opening.');
 if(await runFrom(25)){await N('You don’t stop running until you’re somewhere with people in it. Your heart doesn’t stop for an hour.');await leave();return 'stay'}
 SFX.crunch();blood(A.you.x,A.you.y-24,40,1,90,A.you.y+2);A.you.ex='dead';await wait(400);
 await die('hallmonitor');
}
/* her catch now goes through sherCatch, more often the more she knows you */
{const old=PASS&&PASS.find(p=>p.id==='monitor');if(old)old.run=async()=>{await sherCatch(true)}}
{const _er=enterRoom;enterRoom=async function(room){
 const r=await _er(room);
 if(TEST||!D||D.weekend||busy||D.dead.sherman||D.dead.shermian||room==='forest'||panelMode!=='roam')return r;
 const skipping=D.wander===D.period;
 const hunted=HALLS.has(room)&&sherN()>=3&&PERIODS[D.period].free&&D.period>0&&D.period<7;
 if(!(skipping||hunted))return r;
 if(Math.random()>=(skipping?sherChance():.06*(sherN()-2)))return r;
 return runHook({mis:'passing',run:async()=>{const x=await sherCatch(false);return x||'stay'}});
}}

/* =====================================================================
   2. HOME TIME: THE 43, OR FAIR CITY
   ===================================================================== */
async function afterSchool(noStay){
 if(TEST&&!TEST.auto){busy=true;return endPeriod()}
 busy=true;setPanel('talk');
 const opts=['Get on the 43 home.','Walk to Fair City Mall. (Get home later: the late bus, or a ride.)'];if(!noStay)opts.push('Not yet. Stay at the bus loop.');
 const c=await choose(opts,'Home time. The 43, or Fair City?');
 if(c===0){busy=false;const bus=SPOTS.find(s=>s.label&&s.label.startsWith('Get on the 43'));if(bus)return useSpot(bus);busy=true;return boardBus()}
 if(c===1){D.f.mallToday=1;toast('Fair City Mall. Everyone’s going.');return endPeriod()}
 busy=false;roam();
}
ON_PERIOD.push(async(i,resume)=>{if(i===7&&!resume&&!TEST&&D&&!D.weekend)setTimeout(()=>toast('Home time. Get on the 43 (middle), or walk left to Fair City Mall.'),1800)});

const PARENT_TALKS=[
 async()=>{await N('Mom: “How was school?”');const c=await choose(['“Fine.”','“A teacher ate a kid.”','“Can we get food?”']);
  if(c===0)await N('Mom: “Good. Good good good.” She turns the radio up. That’s the whole conversation.');
  else if(c===1)await N('Mom, not looking away from the road: “Mm. Did you eat your lunch though? I put a yogurt in.”');
  else await N('Mom: “We have food at home.” The food at home is a frozen lasagna from 2019 and a jar of olives.')},
 async()=>{await N('Dad is driving. Dad is singing along to a song he doesn’t know the words to, with total confidence.');
  await N('Dad: “You know I met your mom in detention? Right there. Highgate. Ms. Sherman’s detention, 1994.”');
  const c=await choose(['“Dad. Ms. Sherman is still there.”','“Please stop talking.”']);
  if(c===0)await N('Dad, after a long time: “…No she isn’t. She was old in 1994.” He drives the rest of the way home with both hands on the wheel and the doors locked.');
  else await N('Dad: “And she said, ‘Is that a hall pass or a gum wrapper?’ and I said—” You put your headphones in. You can still hear him. He’s doing the voices.')},
 async()=>{await N('Mom’s on speakerphone the whole ride. She mouths “sorry” and hands you one cold fry from the cupholder. You don’t know how old it is. You eat it.');
  await N('Grandma, on speaker: “Is that the baby? Is the baby still going to that school? The school with the boiler?” Mom hangs up on her.')},
 async()=>{await N('Mom checks the rearview mirror at every light.');await N('Mom: “Don’t look. There’s a man following us. Oh— no, it’s just your principal. He waves at me at every light. Every day. I don’t know how he knows my car.”');
  const c=await choose(['Wave back at Mr. Adam.','Slide down in your seat.']);
  if(c===0)await N('He waves back with both hands. He isn’t holding the wheel. His car keeps going perfectly straight anyway.');
  else await N('You slide down until you can only see the roof. Mom: “Sit up, he’s nice.” He is not nice. He is something.')}
];
async function parentRide(){
 setPanel('talk');busy=true;closeOverlays();
 if(D.room!=='carpark'||ROOM!=='carpark'){D.room='carpark';buildRoom('carpark');for(const id in A)if(id!=='you'&&A[id]&&!A[id].dead)remove(id)}
 else{const ids=Object.keys(A).filter(id=>id!=='you'&&!A[id].dead);ids.forEach((id,i)=>timers.push({t:i*.15,r:()=>{if(A[id])walk(id,A[id].x<160?-24:344,80).then(()=>remove(id))}}));if(ids.length)await wait(1200)}
 if(!A.you)put('you',140,1,{y:156});
 Object.assign(A.you,{pose:null,hold:null,alpha:1,y:156});
 cue('sad');await tw(fxState,{dark:.3},500);
 pose('you','phone');await N('You call home. It rings six times. Then: “…Yeah. Yeah, I’m coming. Stand under a light.”');pose('you',null);
 await walk('you',150,60);
 await N('You stand under the one working light in the parking lot for twenty minutes. A shopping cart rolls past on its own.');
 const car=pprop({t:'car',x:340,y:157,col:'#4a5a7a',driver:1,layer:-2});SFX.rumble();
 await tw(car,{x:126},1600,'out');
 await walk('you',150,50);pose('you','reach');await wait(200);SFX.door();await tw(A.you,{alpha:0,y:150},300);pose('you',null);car.pass=1;
 await pick(PARENT_TALKS)();
 SFX.rumble();await tw(car,{x:-90},1500,'in');car.hide=1;
 {const dn=Object.keys(D.done).filter(m=>MIS[m]);if(dn.length)await N('Today you: '+dn.map(m=>MIS[m].name).join(', ')+'.')}
 try{await nightPhone()}catch(e){console.error(e)}
 fxState.dark=0;await tw(fxState,{dark:1},900);
 {const nc=window.nextDayCard?nextDayCard():['TOMORROW',''];await card(nc[0],nc[1],1600)}
 fxState.dark=0;busy=false;
 return newDay();
}
{const _bb=boardBus;boardBus=async function(fromMall){
 if(!fromMall||TEST||!D||D.period!==8||!['foodcourt','arcade','carpark'].includes(D.room))return _bb(fromMall);
 setPanel('talk');busy=true;closeOverlays();
 const c=await choose(['Take the late 43. (It gets sketchy after dark.)','Call home. Get picked up.'],'It’s dark out. How are you getting home?');
 if(c===1)return parentRide();
 D.f.lateBus=1;return _bb(true);
}}

/* ---------- the late 43 ---------- */
function lateScene(extra){
 const cast={};const take=(sl,id)=>{if(!sl)return;cast[id]=[sl.x,sl.side<0?1:-1,{y:sl.y,pose:'sit'}];cast[id].slot=sl};
 take(slotAt(3,-1,'a'),'you');
 take(slotAt(2,-1,'w'),'lb_chicken');take(slotAt(3,1,'w'),'lb_knife');take(slotAt(4,1,'a'),'lb_sleeper');take(slotAt(1,1,'a'),'lb_bag');
 for(const [id,sl] of (extra||[]))take(sl,id);
 cast.driver=[140,1,{y:84,pose:'sit'}];
 scene('busride',cast,true);ROOM='busride';
 for(const id in cast){const a=A[id];if(!a)continue;a.back=1;a.bslot=cast[id].slot||null;a.sitHigh=1}
 if(A.driver){A.driver.bs=.4;A.driver.back=1}
 if(A.lb_knife){A.lb_knife.back=0;A.lb_knife.dir=-1}
}
const LATE=[
 {id:'chicken',run:async()=>{
  hold('lb_chicken','chicken');A.lb_chicken.back=0;A.lb_chicken.dir=1;
  await N('One row back, a man is eating a whole rotisserie chicken with his hands. No bag. No napkin. He’s been looking at you since the mall.');
  hold('lb_chicken',null);await sitBeside('lb_chicken','you');hold('lb_chicken','drumstick');A.lb_chicken.back=0;A.lb_chicken.ex='happy';
  await say('lb_chicken','(holding out a leg) Drumstick? Growing kid. You look like a drumstick kid.','happy');
  const c=await choose(['Take the drumstick.','“I’m good, thanks.”','“Do I know you?”']);
  if(c===0){hold('lb_chicken',null);hold('you','drumstick');await N('It’s warm. It’s honestly really good. That’s the worst part.')}
  else if(c===1)await say('lb_chicken','Suit yourself. More for me. (he eats the whole leg, bone and all, crunching)','smirk');
  else await say('lb_chicken','Your hoodie says Highgate. I went there. 1987. I got out early. (he taps the window) Not everybody did.','sad');
  await N('At the stop by the cemetery he stands up, wipes his hands on the seat, and gets off. He waves at you through the window with a bone.');
  hold('lb_chicken',null);await busMove('lb_chicken',{x:140,y:88},70);await tw(A.lb_chicken,{alpha:0},300);remove('lb_chicken');hold('you',null);
 }},
 {id:'knife',run:async()=>{
  hold('lb_knife','knife');A.lb_knife.ex='smirk';
  await N('Across the aisle, a guy is picking his teeth with a knife that’s way too big for teeth. He hasn’t blinked since you sat down.');
  await say('lb_knife','What stop you getting off at?','smirk');
  const c=await choose(['Lie. Say a stop way before yours.','Tell him.','Go up front and stand by the driver.']);
  if(c===0){await say('lb_knife','(nodding slowly) Cool. Cool cool.','smirk');await N('Your fake stop comes. You don’t move. He doesn’t move either. He smiles like he knew the whole time. He goes back to his teeth.')}
  else if(c===1){await say('lb_knife','Same.','happy');await N('At your stop he stands up when you stand up.');
   const ok=await mash('RUN',{need:18,time:3.5,info:'Off the bus. Down the street. MASH!'});
   if(ok)await N('You’re off the bus and gone before the doors finish opening. When you look back, he’s still on the bus, waving the knife at you like a little flag.');
   else{const m=D.money||0;D.money=0;updateLoc();await N('He catches your hood on the steps. He takes your wallet'+(m?' ($'+m+')':'')+' and your left shoe. He leaves the right one. “Professional courtesy,” he says.')}}
  else{await busMove('you',{x:150,y:96},80);await say('driver','Sit down.','angry');await say('driver','He rides every night. He’s harmless. Mostly. Last kid who stood up here, I had to clean the windshield. Sit down.','smirk');await busMove('you',slotAt(3,-1,'a'),70);A.you.pose='sit'}
  hold('lb_knife',null);
 }},
 {id:'sleeper',run:async()=>{
  await N('At the next stop, the old man in front of you moves to the seat next to you. There are thirty empty seats. He picks yours.');
  await sitBeside('lb_sleeper','you');A.lb_sleeper.ex='closed';A.lb_sleeper.blean=A.lb_sleeper.x<A.you.x?.35:-.35;
  await N('He falls asleep in about two seconds. Then he falls asleep sideways. Onto your shoulder. He smells like a church basement.');
  const c=await choose(['Wriggle out.','Let him sleep.','Wake him up.']);
  if(c===0){const ok=await mash('Wriggle',{need:14,time:3});if(ok){await busMove('you',slotAt(1,-1,'a'),70);A.you.pose='sit';await N('You slide out from under him. He doesn’t wake up. He slowly tips over onto the seat you were in and starts snoring into it.')}else await N('You’re stuck. He’s heavy like wet sand. You ride the whole way home as his pillow.')}
  else if(c===1)await say('lb_sleeper','(asleep, mumbling) …don’t go in the boiler room, Ollie… Ollie, the door’s stuck…','sad');
  else{A.lb_sleeper.ex='shock';A.lb_sleeper.blean=0;await say('lb_sleeper','(grabbing your arm, wide awake) What year is it? Is it still 1987? Is she still there? Is SHERMAN still THERE?','scared');await N('You don’t answer. That’s an answer. He gets off at the next stop and runs.');await busMove('lb_sleeper',{x:140,y:88},100);await tw(A.lb_sleeper,{alpha:0},250);remove('lb_sleeper')}
  if(A.lb_sleeper){A.lb_sleeper.blean=0}
 }},
 {id:'bag',run:async()=>{
  const bag=pprop({t:'duffel',x:A.lb_bag.x+10,y:A.lb_bag.y-2,layer:30,wig:1});A.lb_bag.back=0;A.lb_bag.dir=-1;
  await N('Two rows up, a woman is whispering to a duffel bag on the seat next to her. The bag is moving.');
  await say('lb_bag','Shh. Shh. Almost home, babies. Almost home.','happy');
  const c=await choose(['Ask what’s in the bag.','Pretend you didn’t see.','Tell the driver.']);
  if(c===0){await say('lb_bag','Ferrets. Forty-one. (she counts with her finger) …Forty.','shock');
   const f=pprop({t:'ferret',x:bag.x,y:bag.y,layer:31});await tw(f,{x:A.you.x,y:A.you.y-20},700);f.hide=1;
   await N('Something long and warm runs down the aisle, up your leg and into your hood. It turns round three times and goes to sleep in there.');
   await say('lb_bag','(looking at your hood, then at you) …It likes you. Keep him. His name is Kevin.','happy');P.ferret=1;save()}
  else if(c===1)await N('You look out the window. Behind you, the bag says, in a very small voice: “help.” The woman pats it. Nobody else on the bus heard it. You heard it.');
  else await say('driver','She’s a regular. Don’t open the bag. Last kid who opened the bag, we’re still finding bits of him in the heater.','smirk');
  bag.wig=c===0?.4:1;
 }},
 {id:'rob',cond:()=>!D.dead.kayden&&!D.dead.jaxon,run:async()=>{
  put('kayden',140,1,{y:88});put('jaxon',140,1,{y:86});A.kayden.sitHigh=1;A.jaxon.sitHigh=1;hold('jaxon','knife');hold('kayden','soaker');
  await N('At the mall stop, Kayden and Jaxon get on in ski masks. They’re not even trying. You can see Kayden’s whole face through the mouth hole. He’s holding a Super Soaker painted black.');
  await Promise.all([busMove('kayden',{x:165,y:A.you.y-4},70),busMove('jaxon',{x:150,y:A.you.y-10},60)]);face('kayden','you');A.kayden.back=0;A.jaxon.back=0;
  await say('kayden','PHONES AND WALLETS. Phones and wallets. Not you, you’re cool. …Actually yeah, you too. Times are hard.','yell');
  const c=await choose(['Hand over a dollar.','“Kayden. I can see your whole face.”','Point at the guy with the knife.']);
  if(c===0){D.money=Math.max(0,(D.money||0)-1);updateLoc();await say('kayden','(taking it) Respect. You want a phone case? I got forty phone cases.','happy')}
  else if(c===1)await say('kayden','(pulling the mask down further, which makes it worse) No you can’t.','angry');
  else{await N('Kayden turns round. The guy with the knife smiles at him with all of his teeth.');await say('jaxon','Bro. Bro. Bro. BRO. Holy shit.','scared');}
  SFX.door();await N('They get off at the next stop and sprint into the dark. The driver doesn’t even turn round. He’s seen it. He sees it every night.');
  hold('kayden',null);hold('jaxon',null);
  await Promise.all([busMove('kayden',{x:140,y:88},110),busMove('jaxon',{x:140,y:86},110)]);await Promise.all([tw(A.kayden,{alpha:0},250),tw(A.jaxon,{alpha:0},250)]);remove('kayden');remove('jaxon');
 }}
];
{const _br=busRide;busRide=async function(fromMall){
 if(!fromMall||TEST||!D||!D.f.lateBus)return _br(fromMall);
 D.f.lateBus=0;
 lateScene();cue('tension');fxState.dark=0;
 await N('The late 43. Nobody from school takes the late 43. The lights flicker. The heater smells like hair. Every seat has a person in it you don’t want to sit next to.');
 const pool=LATE.filter(e=>!e.cond||e.cond()).sort(()=>Math.random()-.5).slice(0,2);
 for(const e of pool){try{await e.run()}catch(err){if(err===DEATH||err===ENDDAY)throw err;console.error(err)}await wait(300)}
 for(const k in A)if(A[k]&&!A[k].dead&&k!=='you')A[k].ex=null;
}}

/* =====================================================================
   3. NOBODY STANDS INSIDE ANYBODY
   ===================================================================== */
const CLOSE_POSES=new Set(['hug','kiss','carry','drag','choke','grab','punch','stab','headbutt','kick','lie','zombie','overhead','slam']);
const SEATED=new Set(['sit','write','type','swim']);
function unoverlap(){
 if(!D||ROOM==='busride'||ROOM==='door'||fxState.dark>.6)return;
 const L=Object.values(A).filter(a=>a&&a.k&&a.vis!==false&&!a.dead&&!(a.z>2)&&!(a.alpha<.5)&&!CLOSE_POSES.has(a.pose)&&a.x>-4&&a.x<324&&!a.noPush);
 for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){
  const a=L[i],b=L[j];if(a.tx!=null||b.tx!=null)continue;
  const dy=Math.abs(a.y-b.y);if(dy>18)continue;
  const dx=b.x-a.x,ad=Math.abs(dx),need=12;if(ad>=need)continue;
  if(a.id==='you'||b.id==='you')continue;
  const aFix=a.id==='you'||SEATED.has(a.pose)||a.sit||a.sitHigh,bFix=b.id==='you'||SEATED.has(b.pose)||b.sit||b.sitHigh;
  if(aFix&&bFix)continue;
  const m=aFix?b:bFix?a:(hsh((a.id||'').length*31+(b.id||'').length)<.5?a:b);
  if(a.moving||b.moving)continue;
  if(m._unov&&T-m._unov<2.5)continue;m._unov=T;
  const o=m===a?b:a;let s=Math.sign(m.x-o.x)||((m.id||'').length%2?1:-1);
  let to=o.x+s*(need+1);if(to<10||to>310){s=-s;to=o.x+s*(need+1)}
  to=clamp(to,10,310);
  const d0=m.dir,p0=m.pose;
  m._keepDir=d0;walk(m.id,to,30).then(()=>{m._keepDir=null;if(A[m.id]===m&&m.tx==null){m.dir=d0;if(p0&&!m.pose)m.pose=p0}});
 }
}
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(!TEST)try{unoverlap()}catch(e){}}}

/* =====================================================================
   4. PEOPLE STAND LIKE PEOPLE
   ===================================================================== */
const IDLE_BASE={arjun:'cross',nivaan:'phone',hasan:'phone',dheva:'hips',marcus:'cross',omer:'cross',stella:'hips',abby:'cross',sean:'hips',david:'phone',paul:'cross',angelo:'cross',kenneth:null,corey:null,alex:'hips',jacob:null,aidan:null,
 shermian:'hips',sherman:'hips',coach:'cross',voss:'cross',loach:'cross',pat:'hips',adam:null,kayden:'phone',jaxon:'cross',jade:'phone',kaylee:'phone',brayden:'cross',tez:'phone',mia:'hips'};
const IDLE_ANY=['cross','hips','phone',null,'cross',null,'phone'];
const FIDGET=['shrug','facepalm','wave','shrug'];
function idleOf(a){
 const id=a.id||'',sd=hsh(id.length*17+(id.charCodeAt(0)||0)*3+(id.charCodeAt(1)||0));
 const base=id in IDLE_BASE?IDLE_BASE[id]:IDLE_ANY[Math.floor(sd*IDLE_ANY.length)];
 const per=8+sd*6,q=((T+sd*40)/per)%1;
 if(q<.58)return{p:base};
 if(q<.62)return{p:FIDGET[Math.floor(sd*13)%FIDGET.length],look:0};
 if(q<.8)return{p:null,look:q>.7};
 if(q<.92)return{p:base==='phone'?'cross':(sd<.5?'phone':'hips')};
 return{p:null};
}
{const _da=drawActor;drawActor=function(a){
 if(!a||TEST||a.id==='you'||a.dead||a.pose||a.moving||a.tx!=null||a.hold||a.sit||a.sitHigh||a.z>0||a.back||!D||busy||panelMode!=='roam'||ROOM==='busride'||ROOM==='door'||(K[a.id]&&K[a.id].ghost))return _da(a);
 const st=idleOf(a);let od=a.dir;const ot=a.talk;
 /* someone close by? face them and talk sometimes */
 let mate=null;for(const k in A){const b=A[k];if(b&&b!==a&&b.vis!==false&&!b.dead&&b.id!=='you'&&!b.moving&&b.tx==null&&Math.abs(b.x-a.x)<34&&Math.abs(b.y-a.y)<10){mate=b;break}}
 if(mate){const nd=mate.x>a.x?1:-1;if(nd!==od&&(!a._faceT||T-a._faceT>4)){a._faceT=T;od=nd}a.dir=od;const sd=hsh((a.id||'').length*7+mate.x);a.talk=Math.sin(T*.9+sd*9)>.35&&Math.sin(T*.37+sd*5)>0}
 a.pose=st.p;
 try{return _da(a)}finally{a.pose=null;a.dir=od;a.talk=ot}
}}

/* =====================================================================
   5. THE STUDENTS ARE WORSE THAN THE TEACHERS
   ===================================================================== */
const kidsHere=()=>Object.keys(A).filter(k=>k!=='you'&&A[k]&&!A[k].dead&&!(K[k]&&K[k].adult));
chaos('tripwire',['upper','wing_arts','hallb'],[0,2,4],.22,async()=>{
 const t=D.dead.fenwick?'dahl':'fenwick';if(D.dead[t])return;
 const a=extra('brayden',60,1,{y:150}),b=extra('jade',250,-1,{y:150});
 const w=pprop({t:'tripwire',x:150,x2:190,y:148,layer:2});
 if(a){A.brayden.pose='kneel'}if(b){A.jade.pose='kneel'}
 await N('Two kids are crouched at either end of the hallway holding a length of fishing line at ankle height. They’re giggling. They’ve done this before. They have a tally on the wall.');
 put(t,334,-1,{y:150});await walk(t,190,70);
 SFX.whoosh();A[t].pose='lie';shake(1);SFX.thud();blood(A[t].x-12,A[t].y-6,10,-1,50,A[t].y+2);A[t].ex='hurt';
 await N(K[t].n+' goes down face-first like a tree. His keys go one way. A tooth goes the other. The kids are already on him, going through his pockets like raccoons.');
 if(a){A.brayden.pose='kneel';await walk('brayden',A[t].x-14,120)}if(b){A.jade.pose='kneel';await walk('jade',A[t].x+14,120)}
 const c=await choose(['Help him up.','Grab his lanyard while they’re busy.','Walk away. Not your business.']);
 if(c===0){await say(t,'(spitting a tooth) Thank you. I’ll remember who helped. (looking at the kids) I’ll remember who didn’t.','evil');}
 else if(c===1){SFX.pick();D.money=(D.money||0)+2;updateLoc();await N('His lanyard has a staff keycard, two dollars and a photo of a woman with the face scratched out. You keep the two dollars. You put the photo back. You don’t want it.')}
 else await N('Behind you, the tally on the wall goes up by one.');
 if(a)pose('brayden',null);if(b)pose('jade',null);
 await Promise.all([a?walk('brayden',-20,120):0,b?walk('jade',340,120):0]);if(a)remove('brayden');if(b)remove('jade');
 A[t].pose=null;A[t].ex='angry';await walk(t,-30,50);remove(t);w.hide=1;
});
chaos('lockersub',['corridor','hallb','upper'],[1,2,3,4],.22,async()=>{
 const a=extra('jaxon',140,1,{y:148}),b=extra('kaylee',176,-1,{y:148});
 if(a)hold('jaxon','padlock');
 await N('The locker between Jaxon and Kaylee is knocking. From the inside. They’re leaning on it, eating chips.');
 SFX.thud();shake(.3);await wait(200);SFX.thud();
 await N('From inside the locker, a muffled voice: “I have a master’s degree. I have a MASTER’S DEGREE.”');
 if(b)await say('kaylee','It’s the sub. He said “alright, settle down” to us. Nobody tells us to settle down.','smirk');
 const c=await choose(['Open the locker.','Add your own padlock.','Slide a granola bar through the vents.']);
 if(c===0){put('sub',158,1,{y:150,pose:'lie'});SFX.locker();await N('You yank it open. The substitute pours out of the locker like laundry. He crawls three feet, gets up, and runs without looking back. He leaves his lanyard and his dignity.');
  A.sub.pose=null;A.sub.ex='scared';await walk('sub',-30,130);remove('sub');
  if(a)await say('jaxon','(very quietly) You’re next, you know that? You’re on the list now.','angry')}
 else if(c===1){SFX.click();await N('Click. Two padlocks now. Jaxon gives you a slow nod of deep respect. The knocking gets faster.');D.f.subLocked=1}
 else await N('A hand takes the granola bar through the vents. Then a small voice says “…thank you.” Then: “Is it raisin? I’m allergic to raisin.” It’s raisin.');
 if(a)hold('jaxon',null);
 await Promise.all([a?walk('jaxon',-20,80):0,b?walk('kaylee',340,80):0]);if(a)remove('jaxon');if(b)remove('kaylee');
});
chaos('auction',['canteen'],[2,4],.25,async()=>{
 if(D.dead.angelo)return;
 const t=pprop({t:'auctiontable',x:170,y:150,layer:2});
 if(!A.angelo)put('angelo',150,1,{y:146});await walk('angelo',170,80);await tw(A.angelo,{z:12},250);hold('angelo','gavel');pose('angelo','up');
 await N('Angelo is standing on a cafeteria table with a gavel he stole from the debate club. On the table: a backpack, a retainer, a pair of headphones, and a phone with a cracked lock screen.');
 await say('angelo','LOT FOUR. Dead kid’s stuff. Everything must go. These headphones belonged to a seventh grader who looked at Mr. Voss wrong. Mint condition. One ear works. Do I hear a dollar.','yell');
 for(const k of kidsHere().slice(0,4))if(k!=='angelo'){A[k].pose='up';A[k].ex='laugh'}
 SFX.cheer();
 const c=await choose(['Bid a dollar on the mystery backpack.','Ask whose stuff this is.','Tell Pat.']);
 if(c===0&&(D.money||0)>=1){D.money--;updateLoc();SFX.pick();await say('angelo','SOLD. To the kid with the face.','happy');await N('Half a sandwich. A permission slip for a trip that already happened. A note: “if you’re reading this i didn’t make it to friday.” You close the backpack.')}
 else if(c===0)await say('angelo','No money, no bid. This is capitalism, not a hug.','angry');
 else if(c===1)await say('angelo','(checking a list) Tyler M., Ryan, the kid who sat by the window in Chem… Look. They’re not using it. That’s the whole pitch.','smirk');
 else{if(A.pat)await say('pat','(from the counter) Is there a ladle? I lost a ladle. If there’s a ladle I want it.','angry');else await N('Pat leans out of the kitchen, looks at the table, and puts in a bid on the retainer.')}
 for(const k of kidsHere())if(A[k]){A[k].pose=null;A[k].ex=null}
 pose('angelo',null);hold('angelo',null);await tw(A.angelo,{z:0},250);t.hide=1;
});
chaos('carfire',['bus'],[0],.25,async()=>{
 if(D.dead.voss)return;
 const car=pprop({t:'car',x:200,y:141,col:'#3a3a3a',layer:-8});const f=pprop({t:'fire',x:232,y:127,n:9,big:1,layer:-7});SFX.fire();
 const ks=kidsHere().slice(0,4);await Promise.all(ks.map((k,i)=>A[k]?walk(k,[180,286,196,272][i],110):0));ks.forEach((k,i)=>{if(A[k]){A[k].hold='marsh';A[k].pose='hold';face(k,A[k].x<232?1:-1)}});
 await N('Mr. Voss’s car is on fire in the bus loop. Not a little. All the way. A circle of kids is standing round it roasting marshmallows on pencils.');
 if(ks[0])await say(ks[0],'He gave everybody a zero. EVERYBODY. Even the kid in the coma.','angry');
 put('voss',-20,1,{y:150});await walk('voss',130,60);A.voss.ex='cold';
 await N('Mr. Voss walks out of the front doors with his coffee. He looks at his car for a long time. He doesn’t say anything. He takes out a little notebook and starts writing down names.');
 const c=await choose(['Roast a marshmallow.','Leave before he writes your name.','Film it.']);
 if(c===0){hold('you','marsh');pose('you','hold');D.apples=(D.apples||0)+1;updateLoc();await N('Golden brown. Perfect. Best marshmallow of your life. +1 🍎. Mr. Voss writes something down while looking straight at you.');pose('you',null);hold('you',null)}
 else if(c===1)await walk('you',20,110);
 else{pose('you','film');await N('You get it all. The fire, the notebook, the moment he licks his pencil. It gets four thousand views by lunch.');pose('you',null)}
 for(const k of ks)if(A[k]){A[k].hold=null;A[k].pose=null}
 await walk('voss',-30,60);remove('voss');f.n=3;
});
chaos('trashbowl',['wing_sports','corridor'],[0,2,4],.2,async()=>{
 const ks=['paul','kenneth'].filter(k=>!D.dead[k]);
 for(const [i,k] of ks.entries())extra(k,40+i*20,1,{y:150});
 const pins=[];for(let i=0;i<6;i++){const id=['kid1','kid2','kid3','tez','mia','ollie'][i];if(!D.dead[id]&&extra(id,250+(i%3)*12,-1,{y:144+Math.floor(i/3)*8}))pins.push(id)}
 const can=pprop({t:'trashcan',x:70,y:156,head:1,rot:0,layer:3,skin:'#f0d0b0',hair:'#c8a050'});
 await N('A sixth grader in a trash can, head out the top. At the other end, six kids in a triangle like bowling pins. They volunteered. They’re thrilled.');
 if(ks[0])await say(ks[0],'TRASH. CAN. BOWLING. Three points for a strike. Minus one if he cries.','yell');
 const c=await choose(['Roll him.','Get the kid out of the can.','Put money on a strike.']);
 if(c===1){can.head=0;put('kid4',72,1,{y:150});SFX.thud();await N('You tip the can and the kid slides out, pale, dizzy, holding his lunch box. He says “I was gonna win” and walks into a wall.');await walk('kid4',-20,60);remove('kid4')}
 else{if(c===2){D.money=Math.max(0,(D.money||0)-1);updateLoc()}
  if(c===0){pose('you','throw');await wait(200);pose('you',null)}
  SFX.rumble();await Promise.all([tw(can,{x:250,rot:Math.PI*6},900)]);SFX.smack();shake(.8);
  for(const p of pins)if(A[p]){A[p].pose='lie';A[p].ex='laugh'}
  await N('STRIKE. Every pin goes down.');can.head=0;put('kid4',can.x,1,{y:150});A.kid4.ex='laugh';await N('The sixth grader climbs out of the can, dizzy, and does a victory lap.');await walk('kid4',60,110);await walk('kid4',340,110);remove('kid4');
  if(c===2){D.money=(D.money||0)+3;updateLoc();await N('You win $3. The kid in the can wins nothing. He seems fine with it.')}
  for(const p of pins)if(A[p])A[p].pose=null}
 can.hide=1;
 await Promise.all(pins.map((p,i)=>A[p]?walk(p,i%2?340:-20,90):0));pins.forEach(p=>remove(p));
});
chaos('glasses',['wing_sci','hallb'],[0,2,4],.2,async()=>{
 if(D.dead.loach)return;
 put('jaxon',-20,1,{y:150});hold('jaxon','glasses');
 put('loach',-50,1,{y:148,pose:'zombie'});
 await N('Jaxon sprints down the hallway holding a pair of glasses over his head like a trophy. Behind him, arms straight out, comes Ms. Loach, who cannot see.');
 await Promise.all([walk('jaxon',160,130),walk('loach',110,55)]);
 await say('jaxon','Forty dollar bounty! Somebody put forty bucks on her glasses! It’s on the group chat!','laugh');
 await say('loach','(walking into a fire extinguisher) Jaxon. I can smell you, Jaxon. I can smell your body spray.','cold');
 const c=await choose(['Trip Jaxon.','Give Ms. Loach her glasses back.','Catch the glasses and run.']);
 if(c===0){SFX.thud();A.jaxon.pose='lie';hold('jaxon',null);hold('you','glasses');await N('Down he goes. The glasses skid across the floor to your feet.');await walk('loach',A.you.x-12,50);hold('you',null);hold('loach',null);A.loach.pose=null;await say('loach','(putting them on, looking at Jaxon on the floor) Thank you. Jaxon, stay. Stay there. I’m going to get something from my room.','evil');A.jaxon.ex='scared';A.jaxon.pose=null;await walk('jaxon',340,150)}
 else if(c===1){await walk('you',A.jaxon.x-10,80);hold('jaxon',null);A.loach.pose=null;await say('loach','(squinting at you) I will mark you present. Forever. Even when you’re not. Even if you’re dead.','smirk');await walk('jaxon',340,120)}
 else{hold('jaxon',null);hold('you','glasses');await walk('you',300,140);D.money=(D.money||0)+3;updateLoc();await N('You sell them to Kayden for three bucks. Kayden sells them back to Ms. Loach for forty. Everybody learns something.');hold('you',null)}
 remove('jaxon');A.loach.pose=null;await walk('loach',-30,50);remove('loach');
});
chaos('gradewar',['field'],[2,4],.2,async()=>{
 const seven=['kid3','mia','tez'].filter(k=>!D.dead[k]),eight=['kid1','kid2','brayden'].filter(k=>!D.dead[k]);
 seven.forEach((k,i)=>extra(k,40+i*14,1,{y:150}));eight.forEach((k,i)=>extra(k,280-i*14,-1,{y:150}));
 seven.forEach(k=>A[k]&&hold(k,'mop'));eight.forEach(k=>A[k]&&hold(k,'shovel'));
 await N('Seventh grade and eighth grade, facing off across the field. Seventh has mops. Eighth has the groundskeeper’s shovels. Nobody remembers why.');
 SFX.chant();await Promise.all([...seven.map((k,i)=>A[k]?walk(k,140-i*6,120):0),...eight.map((k,i)=>A[k]?walk(k,175+i*6,120):0)]);
 for(const k of [...seven,...eight])if(A[k])A[k].pose='overhead';
 SFX.smack();shake(1.2);cue('fight');
 const c=await choose(['Join the seventh grade.','Join the eighth grade.','Sell snacks from the sidelines.']);
 if(c===2){D.money=(D.money||0)+2;updateLoc();await N('You sell four bags of chips at a dollar markup to kids with blood on their mops. War is business.')}
 else{pose('you','punch');SFX.punch();await N('You charge in. Someone hits you with a mop. You hit someone with your backpack. A shovel whistles past your face close enough to shave you.');pose('you',null);A.you.hurt=Math.max(A.you.hurt||0,1)}
 const v=pick([...seven,...eight].filter(k=>A[k]));if(v){A[v].pose='lie';A[v].ex='hurt';blood(A[v].x,A[v].y-6,12,null,40,A[v].y+2);await N((/Grader/.test(K[v].n)?'A '+K[v].n.toLowerCase():K[v].n)+' goes down and stays down for a worrying amount of time. Then gets up, says “I’m good,” and charges back in.');A[v].pose=null}
 for(const k of [...seven,...eight])if(A[k]){A[k].pose=null;hold(k,null)}
 await Promise.all([...seven.map(k=>A[k]?walk(k,-20,100):0),...eight.map(k=>A[k]?walk(k,340,100):0)]);[...seven,...eight].forEach(k=>remove(k));
});
