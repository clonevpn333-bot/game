'use strict';
/* =====================================================================
   HIGHSCHOOL — the day, the loop, the school, the quest log
   ===================================================================== */
const PERIODS=[
 {id:'bus',name:'Before School',time:'8:25',free:1,locs:['bus','corridor','toilets']},
 {id:'p1',name:'Period 1',time:'9:00',lesson:1,locs:['english','maths','science','library','toilets','corridor']},
 {id:'break',name:'Break',time:'10:20',free:1,locs:['corridor','canteen','field','gym','library','toilets']},
 {id:'p2',name:'Period 3',time:'10:40',lesson:1,locs:['english','maths','science','library','toilets']},
 {id:'lunch',name:'Lunch',time:'12:20',free:1,locs:['canteen','corridor','field','gym','library','maths','chem','toilets']},
 {id:'pe',name:'PE',time:'13:20',lesson:1,locs:['gym','field','toilets']},
 {id:'p3',name:'Period 7',time:'14:20',lesson:1,locs:['maths','science','gym','chem','office','library','toilets']},
 {id:'home',name:'Home Time',time:'15:15',free:1,locs:['bus']},
 {id:'mall',name:'After School',time:'15:50',free:1,mall:1,locs:['foodcourt','arcade','carpark']}
];
const ON_PERIOD=[];
const TEACH={1:{english:'balduf',maths:'shermian',science:'loach'},3:{english:'balduf',maths:'shermian',science:'loach'},5:{gym:'coach'},6:{maths:'shermian',science:'loach',gym:'coach',chem:'voss',office:'sherman'}};
/* Who is where. [id, x, dir, pose, y] */
const ROSTER=[
 {bus:[['hasan',58,1],['arjun',78,-1,'cross'],['omer',100,1,null,146],['nivaan',122,-1,'phone'],['david',146,1,null,144],['sean',172,1],['marcus',196,1,null,146],['paul',218,-1,null,142],['kenneth',236,-1],['aidan',256,-1,null,140],['alex',276,-1,null,146],['jacob',296,-1],['sherman',230,-1,'hips',156]],
  corridor:[['angelo',36,1,'lean'],['corey',150,1,'phone'],['abby',230,-1,null,146],['kid1',290,-1]],
  toilets:[['dheva',70,1,'cover']]},
 {english:[['balduf',40,1,'hips',148]],maths:[['shermian',40,1,'hips',148]],science:[['loach',60,1,'sit',132]],library:[['kid3',150,1,'sit',150]],toilets:[['angelo',100,1,'lean']],corridor:[['kid2',200,-1]]},
 {corridor:[['arjun',60,1,'cross'],['nivaan',120,-1,'phone'],['aidan',215,1,null,140],['angelo',38,1,'lean',148],['shermian',270,-1,'hips',150],['kid1',300,-1]],
  canteen:[['pat',90,1,null,140],['corey',150,1,null,146],['abby',200,-1,null,144],['hasan',240,-1],['marcus',280,-1,null,146]],
  field:[['omer',150,1,'cross'],['jacob',200,-1],['kid4',260,-1]],
  gym:[['coach',70,1,'hips',146],['alex',150,1,'dribble'],['paul',190,-1],['kenneth',230,-1,'dribble']],
  library:[['david',140,1,'sit',150],['sean',200,1,null,144],['stella',246,-1,null,144]],
  toilets:[['kid2',90,1]]},
 {english:[['balduf',40,1,'hips',148]],maths:[['shermian',40,1,'hips',148]],science:[['loach',60,1,'sit',132]],library:[['kid3',150,1,'sit',150]],toilets:[['angelo',100,1,'lean']]},
 {canteen:[['pat',90,1,null,140],['shermian',140,1,'cross',140],['hasan',176,1],['arjun',204,-1,'cross'],['jacob',240,-1,'carry',146],['abby',286,-1,null,142]],
  corridor:[['aidan',95,1,'lean',140],['nivaan',150,-1,'phone'],['angelo',38,1,'lean',148],['sherman',250,-1,'hips',146]],
  field:[['sean',120,1],['stella',200,-1,null,146],['coach',280,-1,'hold',140],['omer',240,1,'cross',150]],
  gym:[['kenneth',150,1,'dribble'],['paul',200,-1,'hips'],['alex',250,-1,'dribble']],
  library:[['david',140,1,'sit',150],['kid3',230,-1,'sit',150]],
  maths:[['dheva',160,1,'cover'],['marcus',200,-1]],
  chem:[['voss',180,-1,'hips',142],['corey',120,1,null,148]],
  toilets:[['kid2',90,1]]},
 {gym:[['coach',50,1,'hips',146],['corey',110,1],['abby',150,-1,null,146],['kenneth',190,-1],['paul',214,-1],['hasan',236,-1],['arjun',258,-1,'cross'],['dheva',280,-1],['marcus',300,-1]],
  field:[['alex',100,1,'dribble'],['jacob',140,-1],['omer',176,1],['sean',212,1],['stella',236,-1],['aidan',290,-1,null,140],['david',60,1],['nivaan',30,1,'film'],['angelo',264,1,'lean']],
  toilets:[]},
 {maths:[['shermian',40,1,'hips',148]],science:[['loach',60,1,'sit',132]],gym:[['coach',60,1,'hips',146]],chem:[['voss',190,-1,'hips',142]],office:[['sherman',158,1,'sit',128]],library:[['aidan',150,1,'sit',150]],toilets:[]},
 {bus:[['hasan',58,1],['arjun',78,-1,'cross'],['omer',100,1,null,146],['nivaan',122,-1,'phone'],['david',146,1,null,144],['corey',166,1,null,150],['abby',184,-1,null,146],['sean',204,1],['stella',222,-1,null,148],['marcus',244,1,null,146],['paul',262,-1,null,142],['aidan',280,-1,null,140],['jacob',300,-1],['kenneth',36,1],['alex',18,1,null,146],['dheva',300,-1,null,156],['angelo',10,1,'lean',156]]}
];
/* who sits in which lesson (used by generic lessons) */
const CLASS={1:{english:['hasan','aidan','corey','sean','stella','david','nivaan'],maths:['arjun','alex','dheva','marcus','tyler','abby'],science:['paul','kenneth','jacob','angelo','omer']},
 3:{english:['hasan','david','nivaan','omer','sean','stella','aidan'],maths:['corey','arjun','alex','dheva','marcus','tyler'],science:['paul','kenneth','jacob','angelo','abby']},
 6:{maths:['corey','arjun','alex','dheva','marcus','tyler'],science:['hasan','abby','sean','stella'],gym:['paul','kenneth','jacob','omer','angelo'],chem:['david','nivaan']}};
function seatAll(ids,rowFirst){const out={};ids.forEach((id,i)=>{const row=i<5?(rowFirst||'back'):(rowFirst==='back'?'front':'back');out[id]=[SEATS[row][i%5],1,{pose:'sit',y:row==='back'?SEATS.backY:SEATS.frontY}]});return out}

/* ---------------- missions, hooks, spots ---------------- */
const MIS={},HOOKS=[],SPOTS=[],COLL={},DEATHS={},ENDINGS={};
function mission(id,o){MIS[id]=Object.assign({id,parts:[],tips:[],who:[]},o)}
function hook(o){HOOKS.push(o)}
function spot(o){SPOTS.push(o)}
const DEATH={death:1},ENDDAY={endday:1};
let D=null;
function freshD(){return{day:P.loops,period:0,room:null,f:{},items:[],money:3,mp:{},done:{},chat:{},x:30,dead:{}}}
const has=it=>D.items.includes(it);
function give(it,label){if(!has(it))D.items.push(it);SFX.pick();toast('Got: '+(ITEMS[it]||it))}
function take(it){D.items=D.items.filter(i=>i!==it)}
const ITEMS={video:'Hasan’s video of Aidan’s poem',ball:'STRIKE ONE (Stella’s lucky ball)',powder:'Dheva’s texture powder',spare:'Dheva’s emergency powder',plan:'The seating plan (v14)',newplan:'The NEW seating plan',tape:'Duct tape',energy:'Monster energy (warm)',key:'Mr. Voss’s fridge key',cookies:'A tray of Pat’s cookies',note:'Sean’s note',swap:'Kenneth’s PE bib',detention:'Detention slip (P3, Office)',padlock:'A padlock'};
function intel(id){if(!P.intel[id]){P.intel[id]=1;save();toast('You’ll remember this: '+(INTEL[id]||id))}}
const INTEL={aidanPoem:'Aidan’s poem says every Friday is the same Friday.',aidanJars:'Voss has fourteen jars labelled AIDAN.',aidanLocker:'Aidan remembers locker 217.',loachMug:'Ms. Loach only cares about her mug.',shermianCat:'Ms. Shermian’s cat is called Mr. Biscuits.',shermianDrawer:'Shermian keeps the seating plan in her desk drawer.',shermanPit:'Ms. Sherman’s desk has a red button. The floor in front of it opens.',vossKey:'Voss keeps the fridge key on his lanyard.',beepDial:'The beep-test speed dial is in the PE cupboard.',patBlind:'Dinner Lady Pat is blind in her left eye.',arjunBall:'Arjun nicked Stella’s ball out of Sean’s bag.',arjunPowder:'Arjun stole Dheva’s powder for a laugh.',kennethSwap:'Kenneth will swap PE partners for a buzzer-beater.',javelin:'Coach throws javelins at the field at 12:40.'};
function part(mis,n,quiet){D.mp[mis]=Math.max(D.mp[mis]||0,n);const was=P.parts[mis]||0;P.parts[mis]=Math.max(was,n);save();if(!quiet)toast(MIS[mis].name+' — part '+n+' of '+MIS[mis].parts.length+' done')}
async function complete(mis,variant,big){
 const first=!P.done[mis];D.done[mis]=variant||1;P.done[mis]=P.done[mis]||variant||1;part(mis,MIS[mis].parts.length,true);
 if(first)for(const id of MIS[mis].who)P.bond[id]=Math.min(5,(P.bond[id]||0)+1);
 if(variant)P.best[mis+':'+variant]=1;
 save();SFX.good();
 await card('MISSION COMPLETE',MIS[mis].icon+'  '+MIS[mis].name.toUpperCase()+(variant&&MIS[mis].variants&&MIS[mis].variants[variant]?' — '+MIS[mis].variants[variant]:''),2300);
}
async function die(id){
 const d=DEATHS[id]||{name:id,desc:''};P.deaths[id]=(P.deaths[id]||0)+1;P.stats.deaths++;P.cur=null;save();
 fxState.bars=1;cue('dead');SFX.bad();
 await wait(500);
 await card('YOU DIED',d.name.toUpperCase()+(d.desc?'\n'+d.desc:''),3200,'death');
 throw DEATH;
}
function bond(id,n){P.bond[id]=clamp((P.bond[id]||0)+(n||1),0,5);save()}

/* ---------------- room building ---------------- */
let busy=false,roamTarget=null;
function rosterFor(period,room){return(ROSTER[period]&&ROSTER[period][room])||[]}
function buildRoom(room){
 scene(room,null,true);
 const per=D.period;
 const lesson=TEACH[per]&&TEACH[per][room];
 for(const [id,x,dir,ps,y] of rosterFor(per,room)){
  if(D.dead[id]&&!(id==='aidan'&&per===7))continue;
  if(id==='aidan'&&D.f.aidanDead&&per!==7)continue;
  if(lesson&&id!==lesson)continue;
  put(id,x,dir,{pose:ps||null,y:y||(ps==='sit'?150:146)});
 }
 if(TEACH[per]&&TEACH[per][room]){const t=TEACH[per][room];if(!D.dead[t]){const r=rosterFor(per,room).find(e=>e[0]===t);if(!A[t])put(t,r?r[1]:44,r?r[2]:1,{pose:r?r[3]:'hips',y:r&&r[4]||146})}}
 else for(const [id,x,dir,ps,y] of rosterFor(per,room))if(TEACHERS.includes(id)&&!A[id]&&!D.dead[id])put(id,x,dir,{pose:ps||null,y:y||146});
 if(A.aidan&&D.f.aidanDead){A.aidan.hurt=3;A.aidan.bloody=1;A.aidan.ex='evil';A.aidan.hs=null}
 if(A.dheva&&!D.f.dhevaFixed&&D.f.dheva1)A.dheva.hs='limp';
 for(const b of(D.bodies||[]))if(b.room===room){if(b.period===D.period&&!A[b.id]){const a=put(b.id,b.x,b.dir,{y:b.y,pose:'lie',dead:b.type,pool:b.pool,poolMax:b.pool,hurt:3})}else if(b.period!==D.period){splat(b.x,b.y+1,7)}}
 put('you',D.x||30,1,{y:160,sp:62});
 applyLooks();
}
/* whoever has something going on looks like it: the prompt always matches the picture */
function applyLooks(){for(const id in A){if(id==='you'||A[id].dead)continue;const h=availableHooks(D.room,id).find(h=>h.look);if(h){const L=typeof h.look==='function'?h.look():h.look;Object.assign(A[id],L)}}if(typeof roomDressing==='function')roomDressing()}
function roamHint(){
 const p=PERIODS[D.period],near=roamTarget;
 let s=near?('<b>'+(document.body.classList.contains('touch')?'TALK':'E')+'</b> '+near.label+' · '):'';
 s+=document.body.classList.contains('touch')?'◀ ▶ walk · MAP to move':'<b>←/→</b> walk · <b>M</b> map · <b>Q</b> quests';
 if(p.lesson&&!TEACH[D.period]?.[D.room])s+=' · <i style="color:#e9a">bunking</i>';
 $('hint').innerHTML=s;
}
function updateLoc(){
 const p=PERIODS[D.period],r=ROOMS[D.room||'bus'];
 $('clock').innerHTML='FRIDAY · '+p.time+'<small>'+p.name+' — '+(r?r.name:'')+'</small>';
 $('ploc').textContent='DAY '+D.day+' · £'+D.money+(D.items.length?' · '+D.items.length+' item'+(D.items.length>1?'s':''):'');
}
function availableHooks(room,who){return HOOKS.filter(h=>h.room===room&&(h.period===D.period||(Array.isArray(h.period)&&h.period.includes(D.period)))&&h.who===who&&(!h.cond||h.cond()))}
function interactables(){
 const list=[];
 for(const id in A){if(id==='you'||!A[id].vis||A[id].dead)continue;list.push({x:A[id].x,id,label:'Talk to '+nameOf(id)})}
 for(const s of SPOTS)if(s.room===D.room&&(s.period==null||s.period===D.period||(Array.isArray(s.period)&&s.period.includes(D.period)))&&(!s.cond||s.cond()))list.push({x:s.x,spot:s,label:s.label});
 return list;
}
HOOK.update=(dt,rdt)=>{
 if(panelMode!=='roam'||busy||!A.you)return;
 const a=A.you,v=(keys.r-keys.l);
 if(v){a.dir=v;a.moving=true;a.x=clamp(a.x+v*62*rdt,10,310);a.walk+=rdt*11;D.x=Math.round(a.x)}else a.moving=false;
 let best=null,bd=18;for(const it of interactables()){const d=Math.abs(it.x-a.x);if(d<bd){bd=d;best=it}}
 if(best!==roamTarget&&(!best||!roamTarget||best.label!==roamTarget.label||best.x!==roamTarget.x)){roamTarget=best;roamHint()}else roamTarget=best;
};
HOOK.drawOver=()=>{
 if(panelMode!=='roam'||busy)return;
 for(const s of SPOTS)if(s.sparkle&&s.room===D.room&&(s.period==null||s.period===D.period||(Array.isArray(s.period)&&s.period.includes(D.period)))&&(!s.cond||s.cond()))drawProp({t:'sparkle',x:s.x,y:s.y||140});
 if(roamTarget){const t=roamTarget,a=t.id?A[t.id]:null;let y=a?a.y-kidGeom(a.k,a).legH-kidGeom(a.k,a).bodyH-kidGeom(a.k,a).hd-14:(t.spot.y||140)-16;const txt=t.id?nameOf(t.id):t.spot.short||'LOOK';const w=pxw(txt)+6;const x=clamp(t.x-w/2,2,W-w-2);R(x,y,w,9,'#141120');R(x,y,w,1,'#cab38c');pxc(txt,x+w/2,y+2,'#f6cf8e');}
 // mission markers above heads
 for(const id in A){if(id==='you'||A[id].dead)continue;if(availableHooks(D.room,id).length){const a=A[id],G=kidGeom(a.k,a);const y=a.y-G.legH-G.bodyH-G.hd-(roamTarget&&roamTarget.id===id?24:9)+(Math.sin(T*5)>0?1:0);R(a.x-1,y,3,5,'#f6cf8e');R(a.x-1,y+6,3,2,'#f6cf8e')}}
};

/* ---------------- flow ---------------- */
function setHud(on){$('hud').hidden=!on}
async function cutscene(fn){
 busy=true;setPanel('talk');keys.l=keys.r=0;fxState.bars=1;
 try{const r=await fn();return r}
 finally{fxState.bars=0}
}
async function runHook(h){
 if(busy&&!h._inner)return;
 let r;
 try{r=await cutscene(h.run)}
 catch(e){if(e===DEATH){busy=false;return newDay(true)}if(e===ENDDAY){busy=false;return}console.error(e);if(TEST&&TEST.err)TEST.err(e);toast('Something broke. Ringing the bell.')}
 busy=false;
 if(r==='stay'){backToRoom();return}
 if(r==='ended')return;
 return endPeriod();
}
function backToRoom(){
 if(ROOM!==D.room||!A.you){const x=A.you?A.you.x:D.x;buildRoom(D.room);if(A.you)A.you.x=x;return roam()}
 for(const id in A){const a=A[id];if(id==='you'||a.dead)continue;if(a.x<-6||a.x>326||!a.vis){delete A[id];continue}const r=rosterFor(D.period,D.room).find(e=>e[0]===id);a.pose=r?r[3]||null:null;a.hold=null;a.ex=null;a.z=0;a.shake=0}
 Object.assign(A.you,{pose:null,hold:null,z:0,ex:null});D.x=Math.round(A.you.x);props=props.filter(p=>p.keep);applyLooks();roam()
}
function roam(){busy=false;setPanel('roam');setHud(true);fxState.bars=0;updateLoc();roamTarget=null;roamHint()}
async function enterRoom(room){
 D.room=room;D.x=24;updateLoc();buildRoom(room);
 const autos=availableHooks(room,'auto');
 if(autos.length){return runHook(autos[0])}
 const p=PERIODS[D.period];
 if(p.lesson&&TEACH[D.period]&&TEACH[D.period][room]){return runHook({run:()=>genericLesson(room)})}
 roam();
}
async function startPeriod(i,resume){
 D.period=i;D.room=null;P.cur=JSON.parse(JSON.stringify(D));save();
 const p=PERIODS[i];closeOverlays();setHud(true);
 if(!resume){SFX.bell();await card(p.name.toUpperCase(),'FRIDAY · '+p.time+(i===0?'  ·  DAY '+D.day:''),1500)}
 for(const f of ON_PERIOD)await f(i,resume);
 if(i===0)return enterRoom('bus');
 if(i===7)return enterRoom('bus');
 openMap(true);
}
async function endPeriod(){
 if(D.period>=PERIODS.length-1)return;
 return startPeriod(D.period+1);
}
async function newDay(died){
 busy=false;closeOverlays();
 P.loops++;D=freshD();P.cur=null;save();
 setPanel('talk');setHud(false);
 await dayIntro(died);
 return startPeriod(0);
}
async function boardBus(fromMall){
 setPanel('talk');busy=true;closeOverlays();
 cue('sad');
 await N(fromMall?'The mall lights go off one shop at a time. You get the last 43 home. You sit where you always sit.':'The 43 pulls in. You get on. You sit where you always sit.');
 if(Object.keys(D.done).length)await N('Today you: '+Object.keys(D.done).map(m=>MIS[m].name).join(', ')+'.');
 if(!D.done.headcase&&D.period>=7)await N('Somewhere behind you, back at school, something goes BANG. Nobody on the bus looks up. Nobody ever does.');
 await N('Somewhere around the roundabout you close your eyes for one second.');
 fxState.dark=0;await tw(fxState,{dark:1},900);
 await card('FRIDAY','AGAIN',1600);
 fxState.dark=0;busy=false;
 return newDay();
}

/* ---------------- talking ---------------- */
async function talkTo(id){
 if(busy)return;
 const hooks=availableHooks(D.room,id);
 const shop=id==='angelo'&&P.done.angelo;
 const opts=[{t:'Chat'}];
 for(const h of hooks)opts.push({t:h.label,tag:MIS[h.mis]?MIS[h.mis].icon:'★'});
 if(shop)opts.push({t:'Buy something',tag:'💰'});
 opts.push({t:'Leave'});
 busy=true;setPanel('talk');
 face('you',id);face(id,'you');
 let i=hooks.length||shop?await choose(opts,nameOf(id)):0;
 if(i===opts.length-1&&opts.length>1){busy=false;return roam()}
 if(i===0){await cutscene(()=>chat(id));busy=false;return roam()}
 if(shop&&i===opts.length-2){await cutscene(angeloShop);busy=false;return roam()}
 busy=false;return runHook(hooks[i-1]);
}
async function useSpot(s){if(busy)return;busy=true;try{await runHook(Object.assign({},s,{_inner:1}))}finally{busy=false}}
INPUT={
 act(){if(busy||!roamTarget)return;if(roamTarget.id)talkTo(roamTarget.id);else useSpot(roamTarget.spot)},
 map(){if(busy)return;openMap(false)},
 quest(){openQuest()},
 settings(){openSettings()}
};
$('bMap').onclick=()=>{audio();if(busy||panelMode!=='roam'){toast('You can’t walk off in the middle of this.');return}openMap(false)};
$('bQuest').onclick=()=>{audio();openQuest()};
$('bSet').onclick=()=>{audio();openSettings()};

/* ---------------- generic chats (flavour, bonds, Arjun being Arjun) ---------------- */
const CHAT={
 hasan:['I’ve had the weirdest déjà vu since the bus. Like I’ve already been bored of today.','If Ms. Balduf asks, I did the reading. I did not do the reading.','Don’t look at my head. I know you’re looking at my head.','I’ve got a phone full of evidence on everyone. Insurance.'],
 arjun:['What are you looking at? Oh, you. Never mind, I thought it was someone important.','I’m not mean. I’m accurate. There’s a difference and you’re on the wrong side of it.','Hasan’s dad works nights so he doesn’t have to look at Hasan. That’s not a joke. That’s a schedule.','David’s mum still introduces him as “the first one”. Like a practice go.','Nivaan’s got forty viewers and three of them are his mum on different accounts.','Sean’s only got a girlfriend because she’s never seen him in daylight.'],
 david:['I’m running for Year Rep. My policy is “no”.','I have a theory about today and I hate it.','My glasses keep fogging up near Ms. Shermian. I think it’s fear.'],
 omer:['Shorts in November. It’s a lifestyle. My legs don’t get cold, they get respect.','If anyone says anything about my mum today I’m going to do something I’ll be proud of.','I’ve been doing push-ups. Not for anything. Just in case.'],
 nivaan:['We’re live. Say hi to chat. Chat says you look like a thumb.','Ninety-one viewers. Ninety-one! That’s basically famous.','If anyone fights today I need a ten-second warning to get the angle.'],
 corey:['I’m fine. My hair is fine. Everything’s fine.','Abby’s in my PE group. That’s not information. That’s just a fact I said.','Do you think purple curl cream is too much for a Friday?'],
 sean:['She’s HERE. In PERSON. Like, with a body.','I practiced saying hi to the mirror. The mirror said it back better.','Strike one. That’s our thing. Don’t make it weird.'],
 stella:['Sean talks a lot more on the phone. In person he just sort of… vibrates.','I lost my lucky ball. If you see a ball that looks lucky, it’s mine.','Is your friend group always this loud or is it a Friday thing?'],
 abby:['Corey keeps walking past me and then walking past me again from the other direction.','I play guitar at three in the morning. My neighbours have stopped complaining. I think they’ve moved.','My dog’s called Morrissey. He bites. He has opinions.'],
 aidan:['…','You’ve said that to me before.','Locker 217 is very cold. I don’t know how I know that.','Every Friday is the same Friday. Have you noticed? I’ve noticed.','It’s nice that you talk to me. You won’t at lunch.'],
 angelo:['Locker 13. Open nine till half three. Cash, cookies or favours.','I don’t sell anything illegal. I sell things that are illegal in this building. Different.','You want a fake doctor’s note? I’ve got one signed by an actual dentist.'],
 alex:['Hat-trick at break or I’m quitting football. I won’t quit football.','Coach says my left foot is a weapon. He says it like he’s going to confiscate it.','I can run a 5k but I can’t ask anyone out. Weird how bodies work.'],
 dheva:['If one more person touches my hair I’m going to commit something.','It’s not gel. Never gel. Texture powder. It’s about the matte finish.','Track pants are formal wear if you commit.'],
 marcus:['Morning. Or as I call it: “the hard part”. Heh.','Ms. Shermian said “take it out” about my phone and I’ve been thinking about it ever since.','I could tell you about my weekend but there are children present. You. You’re the children.','I love Science. All that handling equipment.'],
 paul:['Do you want to wrestle? That was a warning, not a question.','I put Kenneth through a table this morning. It was his table. He was fine about it.','My arms are too long. My mum has to buy me shirts from a giraffe.'],
 kenneth:['I am six foot in my head and five foot seven everywhere else.','Basketball is just maths that makes girls look at you.','If Coach asks, I have asthma. I don’t have asthma.'],
 jacob:['Don’t push me. Everyone pushes me. I’m not a door.','Someone shoved me into a bin this morning. Nobody laughed, though. Which is respectful.','I’m calm. I’m so calm. Look at how calm I am.'],
 tyler:['Is Ms. Shermian in a good mood? I can never tell until it’s too late.'],
 balduf:['A comma splice is a crime, dear. Not metaphorically.','You could of done better — no. No. Say it right or don’t say it at all.'],
 shermian:['Hello, sweetie! Don’t run. Running makes me sad. You don’t want me sad.','Seating plans are love. Love is a seating plan.'],
 sherman:['Forty-one years in this building. I’ve outlived three heads, two fires and a boy called Gary.','Your mother rang. She wants a refund.','Walk. Don’t run. Don’t breathe so loud.'],
 loach:['Mm.','…','Mm-hm.','Page forty-seven.'],
 voss:['Volunteers are always welcome in the lab. Always. Always welcome.','Young bones are so… bendy.','Do you know your blood type? Write it down for me. For safety.'],
 coach:['DROP AND GIVE ME TWENTY. Not you. You’re not worth twenty.','Pain is weakness leaving the body. Death is the rest of it leaving.','The beep test separates the men from the dead.'],
 pat:['You want the nuggets or the stew, sweetheart? The stew bites back.','I’ve got eyes in the back of my head. Well. One.']
};
async function chat(id){
 const lines=CHAT[id]||['…'];
 if(!D.chat[id])D.chat[id]=0;
 let line=lines[D.chat[id]%lines.length];D.chat[id]++;
 if(id==='arjun'){const others=Object.keys(A).filter(k=>FRIENDS.includes(k)&&k!=='arjun');const t=others.length?pick(others):'you';line=ARJUN_AT[t]?pick(ARJUN_AT[t]):line}
 if(id==='aidan'&&P.intel.aidanLocker&&Math.random()<.5)line='You put me in locker 217. It was cold. Thanks for asking.';
 await say(id,line);
 if((P.bond[id]||0)>=3&&BONDLINE[id]&&D.chat[id]===1)await say(id,BONDLINE[id],'happy');
}
const ARJUN_AT={
 you:['You’ve got the face of someone who peaks at a Year 9 disco.','Do your parents still pretend you were planned?'],
 hasan:['Hasan, your dad works nights so he doesn’t have to look at you. Thought you should know why.','Hasan, your head’s shaped like a gear-stick and you still can’t get anywhere.'],
 david:['David, your mum still introduces you as “the first one”. Like a practice go.','David, your glasses are the only thing in your life that’s got a prescription for you.'],
 omer:['Omer, your mum buys you shorts because she can’t afford the rest of the trousers.','Omer, you’re short because God ran out of interest.'],
 nivaan:['Nivaan, forty viewers and three of them are your mum on different accounts.','Nivaan, your stream has a bigger following than you’ll ever have at your funeral.'],
 corey:['Corey, all that hair and still nothing upstairs.','Corey, she doesn’t look at you, mate. She looks through you. Like a window you forgot to clean.'],
 sean:['Sean, she only likes you because she hasn’t seen you in daylight yet.','Sean, your voice cracks like your parents’ marriage.'],
 stella:['Stella, you know he practised saying hi to a mirror? And lost?'],
 abby:['Abby, your songs are about being lonely and I can see why.'],
 aidan:['Aidan, your mum cut that fringe with her eyes closed so she didn’t have to look.','Aidan, even your shadow walks two steps behind you.'],
 angelo:['Angelo, you sell fake watches because a real one would remind you how long you’ve wasted.'],
 alex:['Alex, your dad comes to every match and still can’t tell which one you are.'],
 dheva:['Dheva, your hair looks like a wet doormat that gave up.','Dheva, that powder’s doing more work than your personality.'],
 marcus:['Marcus, you make sex jokes because it’s the closest you’ll get.'],
 paul:['Paul, your arms are so long your mum can’t hug you without a ladder. Not that she tries.'],
 kenneth:['Kenneth, five foot seven and you still look down on yourself. Correctly.'],
 jacob:['Jacob, move. Not a joke. Just move.']
};
const BONDLINE={hasan:'Real talk: you’re the only one who doesn’t laugh at my head. Well. Not first.',david:'If today keeps happening, at least it happens with you lot.',omer:'You ever need someone hit, I’m your guy. Free of charge. First one.',nivaan:'I’d stop streaming for you. For like an hour. Maybe.',corey:'Thanks for not telling the others about the curl cream. You’re a real one.',sean:'Strike one. Whatever happens. You helped.',stella:'Sean says you’re the reason he talks to me. So. Thanks, I guess.',abby:'Corey says you’re okay. Corey doesn’t say that about people.',angelo:'You’re on the list. The good list. Ten per cent off for life.',alex:'You’re my assist man. Every goal, I’m pointing at you.',dheva:'You saved my hair. I don’t forget that.',marcus:'You’re alright. In a manly way. Not in a— okay, in that way too, a bit.',paul:'I wouldn’t piledrive you. Not on concrete.',kenneth:'Buzzer beater forever, man.',jacob:'You never push me. I noticed.',arjun:'…Don’t tell anyone I said this. You’re alright. I hate it.',aidan:'You’re the only one who looks at me like I’m a person.'};

/* ---------------- generic lessons ---------------- */
async function genericLesson(room){
 const t=TEACH[D.period][room],kids=(CLASS[D.period]&&CLASS[D.period][room]||[]).filter(k=>!D.dead[k]&&!(k==='aidan'&&D.f.aidanDead));
 if(room==='office'){
  scene('office',{sherman:[158,1,{pose:'sit',y:128,layer:20}],you:[60,1,{y:160}]});
  await say('sherman','Did I SUMMON you? I don’t remember summoning you. I remember everyone I summon. I keep their teeth.','angry');
  await say('you','I just—');
  await say('sherman','OUT.','yell');
  await N('You spend the rest of Period 7 sitting outside her door. She coughs every few minutes, like a threat.');
  return;
 }
 const cast=seatAll(kids.slice(0,9));cast[t]=[40,1,{pose:'hips',y:146}];cast.you=[260,1,{pose:'sit',y:SEATS.frontY}];
 if(room==='gym'){const c={};kids.forEach((k,i)=>c[k]=[110+i*30,-1,{y:146}]);c.coach=[50,1,{pose:'hips',y:146}];c.you=[290,-1,{y:150}];scene('gym',c)}
 else if(room==='chem'){scene('chem',Object.assign({voss:[180,-1,{pose:'hips',y:142}],you:[120,1,{y:150}]},kids.length?{[kids[0]]:[100,1,{y:146}]}:{}))}
 else scene(room,cast);
 const L=LESSON[t]||LESSON.default;
 for(const [w,txt,e] of pick(L)){const who=w==='$'?(kids.length?pick(kids):'you'):w;if(who!=='you'&&!A[who])continue;await say(who,txt,e)}
 if(kids.includes('arjun')||A.arjun){const tg=kids.filter(k=>k!=='arjun');if(tg.length&&Math.random()<.7){const v=pick(tg);await say('arjun',pick(ARJUN_AT[v]||ARJUN_AT.you),'smirk');ex(v,'sad')}}
 await N(pick(['The lesson drags on like it has nowhere better to be.','You learn nothing. It feels familiar.','The clock ticks. You swear it ticks backwards once.']));
}
const LESSON={
 balduf:[[['balduf','Poetry. Feelings in a straight line. Open to page twelve.'],['$','Miss, could we just—'],['balduf','“Could we just”. Not “could of”. I’m watching you. I’m always watching your grammar.','evil']],[['balduf','Today we write an ode. An ode is love you’re not allowed to touch.'],['hasan','Miss, that’s just being single.'],['balduf','Detention, Hasan. With love.','smirk']]],
 shermian:[[['shermian','Good morning, my little angels!','happy'],['$','Morning, miss.'],['shermian','Did I say you could answer? DID I?','evil'],['shermian','…Sorry. Lovely. Page six, sweeties.','happy']],[['shermian','Who’s been touching my stapler? I count the staples. I count EVERY staple.','evil']]],
 loach:[[['loach','Page forty-seven.'],['$','Miss, Paul’s licking the Bunsen burner.'],['loach','Mm.']],[['loach','…'],['loach','Page forty-seven.']]],
 coach:[[['coach','LINE UP. Tallest at the back, weakest in the bin.','yell'],['$','Sir, there’s no bin.'],['coach','There will be.','evil']]],
 voss:[[['voss','Today we’re testing reactions. Your reactions. To me.','smirk'],['$','Sir, why is the fridge humming?'],['voss','It’s singing. It’s happy.','evil']]],
 default:[[['$','…']]]
};

/* ---------------- dawn: start of each loop ---------------- */
async function dayIntro(died){
 scene('bus',{you:[180,1,{y:160}]},true);setHud(false);
 fxState.dark=1;tw(fxState,{dark:0},1500);
 if(P.loops===1){
  await card('HIGHSCHOOL','A CALLING OF AIDAN STORY',2600);
  await N('Friday. The 43 drops you at Highgate High at 8:25, the same as every day.');
  await N('It’s a normal school with normal teachers. Until it isn’t.');
  await say('you','(Right. Last day before the weekend. Nothing’s going to happen.)');
  await N('Tip: talk to people, pick where to go each period, and do what they need. When the day ends — or you die — it starts again. You remember everything. Nobody else does.');
 }else if(died){
  await N(pick(['You gasp awake on the 43, both hands on your neck. Still attached.','You wake up on the bus. The radio’s playing the same song. Your body remembers how it died.','The bus. The bell. Friday. Your mouth tastes like pennies.']));
  if(D.day===3)await N('It’s Friday again. Maybe it always will be.');
 }else{
  await N(pick(['Friday. Again. The 43 smells like Lynx and wet coats.','Friday. Hasan is already laughing at something you know he’s about to say.','Friday. You could recite the next ten minutes. You do, under your breath.']));
 }
 if(P.intel.aidanLocker&&!D.f.aidanSaid){D.f.aidanSaid=1;put('aidan',260,-1,{y:146});await say('aidan','Locker 217 is very cold. Did you know? You know.','smirk');remove('aidan')}
}

/* ---------------- map ---------------- */
function openMap(forced){
 const o=$('map'),p=PERIODS[D.period];o.hidden=false;setPanel('none');
 o.innerHTML='<h2>'+p.name+' · '+p.time+'</h2><div class="box"><p style="color:#a99aa8;margin:0 0 10px;font-size:13px">'+(forced?'Where do you go?':'Walk somewhere else, or wait for the bell.')+'</p><div class="grid"></div></div>';
 if(!forced){const x=document.createElement('button');x.className='tb x';x.textContent='CLOSE ✕';x.onclick=()=>{o.hidden=true;roam()};o.appendChild(x)}
 const grid=o.querySelector('.grid');
 for(const r of p.locs){
  const b=document.createElement('button');b.className='loc'+(r===D.room?' here':'');
  const who=new Set(rosterFor(D.period,r).map(e=>e[0]));if(TEACH[D.period]&&TEACH[D.period][r])who.add(TEACH[D.period][r]);(CLASS[D.period]&&CLASS[D.period][r]||[]).forEach(k=>who.add(k));
  const names=[...who].filter(k=>!D.dead[k]&&!(k==='aidan'&&D.f.aidanDead)&&K[k]&&!/^kid/.test(k)).map(k=>K[k].n);
  const icons=new Set(HOOKS.filter(h=>(!h.day||h.day===(D.dayType||'odd'))&&h.room===r&&(h.period===D.period||(Array.isArray(h.period)&&h.period.includes(D.period)))&&(!h.cond||h.cond())).map(h=>MIS[h.mis]?MIS[h.mis].icon:'★'));
  const lesson=TEACH[D.period]&&TEACH[D.period][r];
  b.innerHTML='<b></b><span></span>'+(icons.size?'<em></em>':'');
  b.querySelector('b').textContent=ROOMS[r].name+(lesson?' (lesson)':'');
  b.querySelector('span').textContent=names.length?names.join(', '):'Nobody you know.';
  if(icons.size)b.querySelector('em').textContent='Something’s happening here: '+[...icons].join(' ');
  b.onclick=()=>{audio();SFX.door();o.hidden=true;enterRoom(r)};
  grid.appendChild(b);
 }
 if(D.period===7){const m=document.createElement('button');m.className='loc';m.innerHTML='<b>Walk to Fair City Mall</b><span>Everyone goes to the mall after school. Some of them have things to say.</span>';m.onclick=()=>{o.hidden=true;endPeriod()};grid.appendChild(m)}
 if(D.period===8){const m=document.createElement('button');m.className='loc';m.innerHTML='<b>Get the last 43 home</b><span>End the day.</span>';m.onclick=()=>{o.hidden=true;busy=true;boardBus(true)};grid.appendChild(m)}
 if(D.period<7){const w=document.createElement('button');w.className='loc';w.innerHTML='<b>Wait for the bell</b><span>Skip to '+(PERIODS[D.period+1]||{name:''}).name+'.</span>';w.onclick=()=>{o.hidden=true;endPeriod()};grid.appendChild(w)}
}

/* ---------------- quest log ---------------- */
let questTab='missions';
function openQuest(){
 const o=$('quest');o.hidden=false;
 const tabs=[['missions','Missions'],['today','Today'],['bonds','Bonds'],['coll','Collectibles'],['deaths','Deaths'],['endings','Endings']];
 o.innerHTML='<button class="tb x" id="qx">CLOSE ✕</button><h2>Quest Log</h2><div class="box"><div class="tabs"></div><div class="qbody"></div></div>';
 o.querySelector('#qx').onclick=()=>{o.hidden=true};
 const tb=o.querySelector('.tabs');
 for(const [id,nm] of tabs){const b=document.createElement('button');b.textContent=nm;b.setAttribute('aria-pressed',String(id===questTab));b.onclick=()=>{questTab=id;openQuest()};tb.appendChild(b)}
 const body=o.querySelector('.qbody'),el=(t,c,txt)=>{const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e};
 if(questTab==='missions'){
  const done=Object.keys(MIS).filter(m=>P.done[m]).length;
  body.appendChild(el('p','',done+' of '+Object.keys(MIS).length+' missions complete · Day '+(D?D.day:P.loops)));body.lastChild.style.cssText='margin:0 0 8px;color:#a99aa8;font-size:13px';
  const grid=el('div','qgrid');body.appendChild(grid);
  for(const m of Object.values(MIS)){
   const reached=P.parts[m.id]||0,today=D?(D.mp[m.id]||0):0,isDone=!!P.done[m.id],locked=m.hidden&&!reached&&!isDone;
   const q=el('div','q'+(isDone?' done':'')+(locked?' lock':''));
   q.appendChild(el('div','ic',locked?'?':m.icon));
   const t=el('div');t.style.minWidth='0';q.appendChild(t);
   t.appendChild(el('h3','',locked?'???':m.name+(isDone?'  ✓':'')));
   t.appendChild(el('div','who',locked?'':m.who.map(i=>K[i]?K[i].n:i).join(', ')));
   t.appendChild(el('p','',locked?m.lockText||'Keep living the day.':m.blurb));
   if(!locked){const pr=el('div','prog');const i=el('i');i.style.width=(isDone?100:reached/m.parts.length*100)+'%';pr.appendChild(i);t.appendChild(pr);
    const ol=el('ol');m.parts.forEach((p,n)=>{const li=el('li',n<reached||isDone?'ok':n===today&&today>0?'now':'',n<=reached||isDone?p:'???');if(n<today)li.textContent+=' (today)';ol.appendChild(li)});t.appendChild(ol);
    const tip=isDone?(m.doneTip||''):(m.tips[reached]||'');if(tip)t.appendChild(el('div','tip','➜ '+tip));
    if(m.variants&&isDone){const got=Object.keys(m.variants).filter(v=>P.best[m.id+':'+v]);t.appendChild(el('div','tip','Versions seen: '+got.map(v=>m.variants[v]).join(' · ')+' ('+got.length+'/'+Object.keys(m.variants).length+')'))}}
   grid.appendChild(q);
  }
 }else if(questTab==='today'){
  if(!D){body.appendChild(el('div','li no','No day in progress.'))}else{
  const l=el('div','list');body.appendChild(l);
  l.appendChild(el('div','li','Day '+D.day+' · '+PERIODS[D.period].name+' · £'+D.money));
  l.appendChild(el('div','li',D.items.length?'Carrying: '+D.items.map(i=>ITEMS[i]||i).join(', '):'Pockets: empty.'));
  const act=Object.keys(D.mp).filter(m=>!D.done[m]);l.appendChild(el('div','li',act.length?'In progress: '+act.map(m=>MIS[m].name+' ('+D.mp[m]+'/'+MIS[m].parts.length+')').join(', '):'Nothing started today.'));
  if(Object.keys(D.done).length)l.appendChild(el('div','li','Finished today: '+Object.keys(D.done).map(m=>MIS[m].name).join(', ')));
  const kn=Object.keys(P.intel);l.appendChild(el('h3','',''));
  const ik=el('div','li');ik.innerHTML='<b>Things you remember across days</b>';kn.forEach(k=>{const d=el('div','','• '+(INTEL[k]||k));ik.appendChild(d)});if(!kn.length)ik.appendChild(el('div','','Nothing yet.'));l.appendChild(ik)}
 }else if(questTab==='bonds'){
  for(const id of FRIENDS){const r=el('div','bond');r.appendChild(el('span','',K[id].n));const h=P.bond[id]||0;r.appendChild(el('span','h','♥'.repeat(h)+'·'.repeat(5-h)));body.appendChild(r)}
  body.appendChild(el('p','','Finish missions with someone to grow your bond. At three hearts they’ll tell you something real.'));body.lastChild.style.cssText='color:#a99aa8;font-size:13px';
 }else if(questTab==='coll'){
  const l=el('div','list');body.appendChild(l);const ids=Object.keys(COLL);
  l.appendChild(el('div','li',Object.keys(P.coll).length+' / '+ids.length+' found. Look for sparkles.'));
  for(const id of ids){const c=COLL[id],got=P.coll[id];const d=el('div','li'+(got?'':' no'));d.innerHTML='<b></b> ';d.querySelector('b').textContent=got?c.name:'???';d.appendChild(document.createTextNode(got?'— '+c.desc:'— '+c.hint));l.appendChild(d)}
 }else if(questTab==='deaths'){
  const l=el('div','list');body.appendChild(l);const ids=Object.keys(DEATHS);
  l.appendChild(el('div','li',Object.keys(P.deaths).length+' / '+ids.length+' ways to die discovered. Total deaths: '+P.stats.deaths+'.'));
  for(const id of ids){const c=DEATHS[id],got=P.deaths[id];const d=el('div','li'+(got?'':' no'));d.innerHTML='<b></b> ';d.querySelector('b').textContent=got?c.name:'???';d.appendChild(document.createTextNode(got?'— '+c.desc+(got>1?' (×'+got+')':''):'— '+c.hint));l.appendChild(d)}
 }else if(questTab==='endings'){
  const l=el('div','list');body.appendChild(l);
  for(const id in ENDINGS){const c=ENDINGS[id],got=P.endings[id];const d=el('div','li'+(got?'':' no'));d.innerHTML='<b></b> ';d.querySelector('b').textContent=got?c.name:'???';d.appendChild(document.createTextNode(got?'— '+c.desc:'— '+c.hint));l.appendChild(d)}
 }
}

/* ---------------- settings ---------------- */
function openSettings(){
 const o=$('settings');o.hidden=false;
 o.innerHTML='<button class="tb x" id="sx">CLOSE ✕</button><h2>Settings</h2><div class="box"><div class="set"></div><div class="actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px"></div></div>';
 o.querySelector('#sx').onclick=()=>{o.hidden=true};
 const s=o.querySelector('.set');
 const row=(label,key,vals,names,after)=>{s.appendChild(Object.assign(document.createElement('div'),{textContent:label}));const w=document.createElement('div');w.className='opts';vals.forEach((v,i)=>{const b=document.createElement('button');b.textContent=names[i];b.setAttribute('aria-pressed',String(P.set[key]===v));b.onclick=()=>{P.set[key]=v;save();after&&after();openSettings()};w.appendChild(b)});s.appendChild(w)};
 row('Text speed','text',[0,1,2,3,4],['Slow','Normal','Fast','Faster','Instant']);
 row('Auto speed','auto',[0,1,2,3],['Slow','Normal','Fast','Fastest']);
 row('Music','music',[0,.35,.7,1],['Off','Low','Mid','High'],setVolumes);
 row('Sound effects','sfx',[0,.4,.8,1],['Off','Low','Mid','High'],setVolumes);
 row('Voice blips','voice',[0,1],['Off','On']);
 row('Screen shake','shake',[0,1],['Off','On']);
 row('Gore','gore',[0,1],['Less','Full']);
 row('Lighting & shadows','light',[0,1],['Off','On']);
 row('Skip button skips','skipAll',[0,1],['Read text only','Everything']);
 const act=o.querySelector('.actions');
 const btn=(t,f,alt)=>{const b=document.createElement('button');b.className='mb'+(alt?' alt':'');b.textContent=t;b.onclick=f;act.appendChild(b)};
 btn('Fullscreen',()=>goFullscreen(),1);
 btn('Save & quit to title',()=>{o.hidden=true;if(D&&D.period!=null&&!busy){P.cur=P.cur||JSON.parse(JSON.stringify(D))}save();title()},1);
 btn('Erase all progress',()=>{if(confirm('Erase every loop, mission, collectible and ending?')){localStorage.removeItem(SAVE_KEY);loadP();o.hidden=true;title()}},1);
 const note=document.createElement('p');note.style.cssText='color:#a99aa8;font-size:12px;line-height:1.6;margin-top:14px';note.textContent='Keys: ←/→ walk · E/Space talk & advance · M map · Q quests · L backlog · A auto · S skip (or hold Ctrl) · Esc settings. The game saves at the start of every period.';o.querySelector('.box').appendChild(note);
}

/* ---------------- title ---------------- */
async function title(){
 closeOverlays();setHud(false);setPanel('none');busy=true;
 D=D||freshD();
 const saveD=D;D=Object.assign(freshD(),{period:0});
 scene('bus',{hasan:[70,1,{y:146}],arjun:[96,-1,{pose:'cross',y:144}],omer:[120,1,{y:150,pose:'cross'}],corey:[148,1,{y:146}],sean:[176,1,{y:144}],stella:[196,-1,{y:146}],aidan:[246,-1,{y:140}],paul:[220,-1,{y:148,pose:'hips'}],dheva:[274,-1,{y:150}],marcus:[296,-1,{y:146}]},true);
 D=saveD;
 cue('title');
 const m=$('menu');m.hidden=false;
 const done=Object.keys(P.done).length,total=Object.keys(MIS).length;
 m.innerHTML='<div class="eyebrow">A Calling of Aidan story</div><h1>HIGHSCHOOL</h1><p>One Friday. It keeps happening. The teachers are worse than you remember, and something is wrong with Aidan.</p><p class="eyebrow" style="font-size:11px;letter-spacing:.14em">'+(P.loops?'Day '+P.loops+' · '+done+'/'+total+' missions · '+Object.keys(P.endings).length+' endings':'')+'</p><div class="actions"></div>';
 const a=m.querySelector('.actions');
 const btn=(t,f,alt,fs)=>{const b=document.createElement('button');b.className='mb'+(alt?' alt':'');b.textContent=t;b.onclick=()=>{audio();SFX.click();if(fs&&!TEST)goFullscreen(true);f()};a.appendChild(b)};
 if(P.cur)btn('Continue',()=>{m.hidden=true;D=P.cur;busy=false;startPeriod(D.period,true)},false,true);
 btn(P.loops?'Start a new Friday':'Start',()=>{m.hidden=true;busy=false;newDay()},!!P.cur,true);
 btn('Quest log',()=>{D=D||freshD();openQuest()},1);
 btn('Settings',openSettings,1);
}

/* ---------------- curtain call ---------------- */
async function curtainCall(endingId){
 busy=true;setHud(false);setPanel('talk');cue('curtain');
 scene.keepMusic=1;scene('stage',{},true);scene.keepMusic=0;
 await card('CURTAIN CALL',ENDINGS[endingId]?ENDINGS[endingId].name.toUpperCase():'',2000);
 const cast=['hasan','arjun','david','omer','nivaan','corey','sean','stella','abby','aidan','angelo','alex','dheva','marcus','paul','kenneth','jacob','you'].filter(id=>!(window.EDITION_CUT||[]).includes(id));
 const teachers=['balduf','shermian','sherman','loach','voss','coach','pat'];
 const LINE={hasan:'Hasan — still has the video. Still won’t delete it.',arjun:'Arjun — said something unforgivable on every single day. Consistent, at least.',david:'David — ran for Year Rep on a policy of “no”. Won.',omer:'Omer — shorts. Every day. Every Friday. Every loop.',nivaan:'Nivaan — 91 viewers. Peak. Never again.',corey:'Corey — got it in PE. Both versions.',sean:'Sean — said hi in person. Eventually.',stella:'Stella — kept the ball. Kept the boy.',abby:'Abby — wrote a song called “Friday, again”.',aidan:'Aidan — kept the day. Gave it back. Maybe.',angelo:'Angelo — locker 13 is still open. Cash only.',alex:'Alex — hat-trick. Left foot. Weapon.',dheva:'Dheva — matte finish. Not gel. Never gel.',marcus:'Marcus — read the lunch menu like it owed him money.',paul:'Paul — wrestled everyone. Lost to no one. Lost to Kenneth once (fake).',kenneth:'Kenneth — five foot seven of buzzer beater.',jacob:'Jacob — got pushed around. Nobody laughed. Ever.',you:'You — lived the same Friday '+P.loops+' times. Died '+P.stats.deaths+'.'};
 for(let i=0;i<cast.length;i++){
  const id=cast[i];put(id,-14,1,{y:150});
  await walk(id,160,90);hop(id,4,240);pose(id,'wave');sub((window.EDITION_LINE||{})[id]||LINE[id]);SFX.blip(K[id].v||300);
  await wait(skipping()?60:1400);pose(id,null);
  const slot=12+i*(296/(cast.length-1));A[id].y=136+(i%2)*6;await walk(id,slot,120);face(id,1);
 }
 for(const id of teachers){put(id,340,-1,{y:166});}
 await Promise.all(teachers.map((id,i)=>walk(id,40+i*40,70)));
 for(const id of teachers)pose(id,'wave');
 for(const id of cast)pose(id,'cheer');
 SFX.cheer();
 await say('hasan','Same time next Friday?','happy');
 await say('arjun','Shut up, Hasan.','smirk');
 await card('HIGHSCHOOL','THANKS FOR PLAYING · '+Object.keys(P.endings).length+' / '+Object.keys(ENDINGS).length+' ENDINGS',3200);
 busy=false;P.cur=null;save();return title();
}

/* ---------------- Angelo’s shop ---------------- */
async function angeloShop(){
 await say('angelo','Locker 13 is open for business. What you need?','smirk');
 const stock=[['tape',2,'Duct tape (£2)'],['energy',2,'Monster energy, warm (£2)'],['padlock',1,'A padlock in a sock (£1)']];
 const o=stock.map(s=>({t:s[2],dis:D.money<s[1]||has(s[0]),why:has(s[0])?'got it':'skint'}));o.push({t:'Nothing'});
 const i=await choose(o,'You have £'+D.money);
 if(i<stock.length){D.money-=stock[i][1];give(stock[i][0]);await say('angelo',pick(['Pleasure doing business.','No refunds. No receipts. No questions.','Tell your friends. Don’t tell Ms. Sherman.']));updateLoc()}
 else await say('angelo','Window shopper. Respect.');
}
