'use strict';
/* =====================================================================
   HIGHSCHOOL REMASTERED — LUNCH IS LUNCH
   Lunch is still free time (every lunch quest is untouched), but now:
   • Everyone eats. Kids in the cafeteria carry trays; kids anywhere else
     have a sandwich, crisps or a juice box, and actually eat them
     (hand to mouth every few seconds). The back bench of the cafeteria
     fills up with diners.
   • You can eat: "Get lunch from Pat" at the counter. FREE (no apple),
     and the food gives apples back. A short scene: today's menu (three
     dishes a day, rotating), something happening in the queue (a
     different thing each day), then where you sit (the crew table with
     table talk + a napkin hint for the story, Aidan, her if you're with
     someone, or alone and fast).
   • Skip it and your stomach growls through period 5. Flavour only.
   ===================================================================== */
{
const LUNCH=4;
const ate=()=>D&&D.f['ate'+cal()];
const lunchNow=()=>D&&!D.weekend&&D.period===LUNCH;
const alive=k=>K[k]&&!D.dead[k];
const pickBy=(arr,n,s)=>{const o=arr.slice(),r=[];let x=s;while(r.length<n&&o.length){x=(x*9301+49297)%233280;r.push(o.splice(x%o.length,1)[0])}return r};

/* ---- held food ---- */
{const _dh=drawHeld;drawHeld=function(it,x,y,d){
 if(it==='sandwich'){R(x-3,y-2,6,4,'#e8d0a0');R(x-3,y-1,6,1,'#6aa04a');R(x-3,y,6,1,'#d86a5a');R(x-3,y-2,6,1,'#f4e4c0');return}
 if(it==='crisps'){R(x-2,y-4,5,6,'#d83a3a');R(x-2,y-4,5,1,'#f0d040');R(x-1,y-2,3,2,'#f0d040');return}
 if(it==='juice'){R(x-2,y-4,4,6,'#f0a030');R(x-2,y-4,4,1,'#f4f0e6');R(x+1,y-6,1,2,'#f4f0e6');R(x-1,y-2,2,2,'#5ab04a');return}
 return _dh(it,x,y,d)}}

/* ---- the menu ---- */
const MENU=[
 {n:'Mystery Nuggets',a:1,line:'Eleven nuggets. Pat counts them out loud. You’re fairly sure one of them is a sponge.'},
 {n:'Grey Pasta',a:1,line:'It’s pasta. It’s grey. It tastes exactly like the colour grey.'},
 {n:'Pat’s Stew ?',a:2,line:'The question mark is part of the name. Pat won’t say what’s in it. It’s incredible. You feel strong and slightly afraid.'},
 {n:'Square Pizza',a:1,line:'Square pizza. You get the corner piece. Someone behind you swears about it, quietly, for a long time.'},
 {n:'Fish Fingers',a:1,line:'Six fish fingers and a scoop of peas Pat flicks onto the tray from a distance, like a dart.'},
 {n:'Chicken Burger',a:1,line:'A chicken burger. The bun is cold and the chicken is lava. It’s perfect. Nobody knows how she does it.'},
 {n:'Jacket Potato',a:1,line:'Pat hits the potato with a spoon until it opens. You’ve never seen her use a knife. You don’t want to.'},
 {n:'Curry Day',a:2,line:'Curry day. The one good day. The queue goes out the door and into the Front Hall.'},
 {n:'Tacos',a:1,line:'“Taco Tuesday,” Pat says. It isn’t Tuesday. Nobody brings it up.'},
 {n:'The Salad',a:1,line:'You take the salad. Pat looks at you like someone died. Nobody has ever taken the salad. She gives you a cookie, out of grief.'}
];
const menuToday=()=>pickBy(MENU,3,cal()*7+3);

/* ---- something happens in the queue (one per day) ---- */
const QUEUE=[
 async()=>{if(!alive('kayden'))return;put('kayden',-14,1,{y:150,ex:'smirk'});await walk('kayden',104,90);
  await N('Kayden walks straight past the whole queue and stands in front of you like he was always there.');
  const c=await choose(['Let it go.','“Back of the line, Kayden.”','Cut back in front of him.']);
  if(c===1){await say('kayden','(looking you up and down) …Fine. FINE. You got lucky.','angry');await walk('kayden',340,90);remove('kayden')}
  else if(c===2){const ok=await mash('CUT',{need:12,time:2.5,info:'Get in front. Elbows.'});await N(ok?'You slide in front of him. The queue makes a noise like a crowd at a boxing match.':'He blocks you with a hip. A practised hip.')}
  else await N('You let it go. He takes the last chocolate milk. He makes eye contact while he does it.')},
 async()=>{if(!alive('sherman'))return;put('sherman',-14,1,{y:148});await walk('sherman',150,60);face('sherman',1);
  await say('sherman','(taking a fry off your tray and eating it) Tax.','smirk');await walk('sherman',340,60);remove('sherman');
  await N('Nobody says anything. Ms. Sherman has been taxing trays since 1987.')},
 async()=>{const ok=await mash('CATCH IT',{need:12,time:2,info:'Your tray is sliding off the rail!'});
  if(ok)await N('You catch the tray one-handed. Not one pea falls. A Year 7 claps, alone.');
  else{SFX.thud&&SFX.thud();await N('The tray hits the floor. Everything on it hits the floor. The cafeteria does the “OHHHH.”');
   await say('pat','(sliding you a fresh one without looking) Don’t tell anybody I’m nice.','cold')}},
 async()=>{if(!alive('arjun'))return;put('arjun',340,-1,{y:150});await walk('arjun',150,80);face('arjun',-1);
  await say('arjun','I need your pudding. Legally. My grandad was in the war.','smirk');
  const c=await choose(['Give him the pudding.','“Which war?”']);
  if(c===1)await say('arjun','(walking off) …A war. That’s all you need to know.','cold');
  else await say('arjun','(already eating it with his fingers) A true patriot.','happy');
  await walk('arjun',350,80);remove('arjun')},
 async()=>{await N('The ice cream machine has a sign on it: OUT OF ORDER. The sign is yellow with age. The date on it says 1987.');
  await say('pat','Don’t touch it. It still hums at night.','cold')},
 async()=>{await N('The Year 7 in front of you pays for lunch entirely in 5p coins. He counts them out one at a time. The queue ages.');
  await say('pat','(counting with him, dead-eyed) …forty-one. Forty-two.','cold')},
 async()=>{await N('Pat gives the quiet kid in front of you a double portion and an extra cookie. Then she sees you watching.');
  await say('pat','You saw nothing. You’re seeing nothing now.','evil')},
 async()=>{if(!alive('nivaan'))return;put('nivaan',340,-1,{y:150,pose:'film'});await walk('nivaan',150,80);face('nivaan',-1);
  await say('nivaan','(filming your tray) Day nine of rating Pat’s food for my followers. What are we giving it?','happy');
  const c=await choose(['“Ten.”','“Two.”']);
  if(c===1){await say('pat','(from behind the counter, very calm) I heard that.','evil');await N('You will remember that she heard that.')}
  else await say('pat','(not looking up) Good boy.','smirk');
  await walk('nivaan',350,80);remove('nivaan')}
];

/* ---- table talk ---- */
const TALK=[
 ['Who would win: Coach, or a horse.','Which horse.','Any horse.','…The horse. Coach has bad knees.'],
 ['I put hot sauce in my yogurt. On purpose.','Why.','To feel something.'],
 ['If this school had a national anthem, what would it be?','The fire alarm.','…Yeah. The fire alarm.'],
 ['Rate Pat’s stew out of ten.','Eleven.','Out of TEN.','Eleven.'],
 ['Do teachers eat lunch?','I saw Mr. Voss eat a whole onion once. Like an apple.','That’s not lunch, that’s a warning.'],
 ['Fries for the table.','Whose fries?','Ours now. I took them off Kayden.'],
 ['What’s the actual plan for Inspection Day?','I thought you had the plan.','I thought YOU had the plan.','…We should get a plan.'],
 ['My cousin says in high school you get a locker AND a girlfriend.','You got the locker.','I got the locker.'],
 ['Why does the cafeteria smell like pennies today?','Don’t ask Pat.','I asked Pat.','…What did she say?','She said “don’t.”']
];
const CREW=['hasan','arjun','david','omer','nivaan','corey','sean','paul','kenneth'];

async function sitWith(who,talk){
 const cast={you:[150,1,{y:150,pose:'sit',hold:'tray'}]};const xs=[176,124,200];
 who.forEach((k,i)=>cast[k]=[xs[i],i===1?1:-1,{y:150,pose:'sit',hold:pick(['tray','sandwich','tray'])}]);
 scene('canteen',cast,true);
 const sp=[...who,...who,...who];
 for(let i=0;i<talk.length;i++)await say(sp[i%who.length]||who[0],talk[i],pick(['happy','smirk','shock','cold']));
}

async function lunchRun(){
 const menu=menuToday();
 const cast={pat:[90,1,{y:140}],you:[130,-1,{y:152}]};
 const q=['kid1','kid2'].filter(k=>K[k]);q.forEach((k,i)=>cast[k]=[108-i*18-40,1,{y:150,hold:'tray'}]);
 scene('canteen',cast,true);
 await say('pat','Today: '+menu.map(m=>m.n).join('. ')+'. '+pick(['Choose fast. I’ve got a hip.','Don’t ask what’s in anything.','Move it, sweetheart.']),'cold');
 /* the queue */
 try{await QUEUE[cal()%QUEUE.length]()}catch(e){if(e===DEATH)throw e;console.error(e)}
 const c=await choose(menu.map(m=>m.n),'LUNCH');const m=menu[c];
 hold('you','tray');await N(m.line);
 /* where to sit */
 const crew=CREW.filter(alive);const opts=[],acts=[];
 if(crew.length>=2){opts.push('Sit with the crew.');acts.push(async()=>{
  const who=pickBy(crew,Math.min(3,crew.length),cal()*13+1);
  await sitWith(who,TALK[(cal()+who.length)%TALK.length]);
  const s=typeof storyNow==='function'?storyNow():null;
  if(s&&s.goal)await N('Under the table, '+K[who[0]].n.split(' ')[0]+' slides you a napkin. On it, in ketchup-adjacent pen: “'+s.goal+'”')})}
 if(alive('aidan')){opts.push('Sit with Aidan.');acts.push(async()=>{
  scene('canteen',{aidan:[176,-1,{y:150,pose:'sit',ex:'sad'}],you:[150,1,{y:150,pose:'sit',hold:'tray'}]},true);
  await say('aidan',pick(['(not eating) I always sit here. The light’s good. It never changes.','(pushing a pea around) Pat used to give me two cookies. She doesn’t remember why.','You don’t have to sit with me. Nobody has to sit with me.']),'sad');
  await say('aidan','…Thanks, though.','happy')})}
 for(const g of['stella','mia','jade'])if(D.f['with_'+g]&&!(P.dumped||{})[g]&&alive(g)){opts.push('Sit with '+K[g].n.split(' ')[0]+'.');acts.push(async()=>{
  scene('canteen',{[g]:[176,-1,{y:150,pose:'sit',ex:'blush'}],you:[150,1,{y:150,pose:'sit',hold:'tray'}]},true);
  await say(g,pick(['(stealing your fries one at a time) You weren’t eating these.','People are staring. Let them.']),'blush')})}
 opts.push('Eat alone. Fast.');acts.push(async()=>{await N('You eat the whole thing in four minutes, standing up, like a raccoon. You have time for one more thing. (+1 🍎)');D.apples=(D.apples||0)+1});
 const w=await choose(opts,'WHERE DO YOU SIT?');await acts[w]();
 hold('you',null);D.f['ate'+cal()]=1;D.apples=(D.apples||0)+m.a;updateLoc&&updateLoc();
 toast('🍽 Lunch: '+m.n+'. +'+m.a+' 🍎');
 return 'stay'}
spot({room:'canteen',period:LUNCH,x:86,y:134,label:'Get lunch from Pat',short:'LUNCH',free:1,cond:()=>lunchNow()&&!ate(),run:lunchRun});

/* ---- everyone eats ---- */
const FOOD=['sandwich','crisps','juice','sandwich','cookie'];
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);
 if(!lunchNow()||busy)return;const s=rdt||dt||0.016;
 for(const id in A){const a=A[id];
  if(!a._lunchSet){a._lunchSet=1;if(id!=='you'&&K[id]&&!K[id].adult&&!a.hold&&!a.dead){a.hold=D.room==='canteen'?'tray':FOOD[(id.length+cal()+(id.charCodeAt(1)||0))%FOOD.length];a._lunch=1;a._eatT=Math.random()*3;if(['cross','hips','phone','lean','text'].includes(a.pose))a.pose=null}}
  if(!a._lunch)continue;
  if(a.pose&&a.pose!=='drink'){continue}
  a._eatT=(a._eatT||0)-s;
  if(a._eatT<=0){if(a.pose==='drink'){a.pose=null;a._eatT=2+Math.random()*3}else{a.pose='drink';a._eatT=.7}}}}}
/* the back bench fills with diners */
{const ob=ROOMS.canteen.bg;ROOMS.canteen.bg=function(){ob.apply(this,arguments);
 if(D&&!D.weekend){R(16,18,96,40,'#1e3a2c');R(16,18,96,1,'rgba(255,255,255,.15)');px('TODAY:',22,23,'#f0f0a0');
  menuToday().forEach((m,i)=>px(m.n.replace(/’/g,"'").toUpperCase(),22,31+i*8,i===2?'#e06a6a':'#ffffff'));
  if(ate())px('SERVED',78,23,'#8ad08a')}
 if(!lunchNow()||D.room!=='canteen'||typeof crowdKid!=='function')return;
 const xs=[58,84,192,226,262,292];
 xs.forEach((x,i)=>{const bob=Math.sin(T*5+i*1.7)>.7;drawKid(crowdKid(i+3),x,140,{dir:i%2?-1:1,pose:bob?'drink':'sit',hold:i%2?'sandwich':'tray',ex:i%3?'happy':null})});
 for(let i=0;i<4;i++){const q=(T*.5+i/4)%1;g.globalAlpha=.25*(1-q);R(70+i*60,124-q*10,3,2,'#fff');g.globalAlpha=1}}}

/* ---- toasts ---- */
ON_PERIOD.push(async(i,resume)=>{if(resume||!D||D.weekend||TEST)return;
 if(i===LUNCH)setTimeout(()=>toast('🍽 LUNCH. Pat’s serving: '+menuToday().map(m=>m.n).join(', ')+'. Cafeteria counter: free, +🍎.'),1800);
 if(i===LUNCH+1&&!D.f['ate'+cal()])setTimeout(()=>toast('🫃 You skipped lunch. Your stomach growls through all of period 5. The kid next to you moves their chair.'),2200)});
}
