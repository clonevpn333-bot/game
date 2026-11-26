'use strict';
/* =====================================================================
   HIGHSCHOOL — METAL DETECTORS (week two)
   For the inspection, Ms. Sherman puts a metal detector in the front
   doors. If it rings, the teachers deal with you on the spot.
   Everybody hates it. So everybody finds the back way in, through the
   woods, and everybody starts bringing something. One day, in a locked
   classroom, it goes off. The kids clean up after themselves.
   ===================================================================== */
const METAL=['lockpick','key','padlock','compass','chucks','extinguisher','firstaid','bytephone','knife','energy','ladle'];
const detectorsOn=()=>D&&!D.weekend&&cal()>=8&&cal()<=12;
const metalOn=()=>(D.items||[]).filter(i=>METAL.includes(i));
DEATHS.detector={name:'Random Screening',desc:'It rang. Coach was standing right there with a javelin.',hint:'Week two: the front doors have a metal detector. Stash your metal stuff in the hedge, or go round the back through the woods.'};
INTEL.backway='The back way into school: walk right from the bus loop, through the woods, onto the field, in through the Sports Wing. No detector.';

/* the arch */
{const _dp=drawProp;drawProp=function(p){
 if(p.t==='detector'){const x=Math.round(p.x),y=Math.round(p.y),l=p.light||0;
  R(x-16,y-44,4,44,'#6a6a72');R(x+12,y-44,4,44,'#6a6a72');R(x-16,y-48,32,5,'#4a4a52');
  R(x-4,y-47,8,3,l===2?'#ff2020':l===1?'#30e060':'#2a2a2a');if(l===2&&Math.sin(T*20)>0){g.globalAlpha=.25;R(x-30,y-60,60,60,'#ff2020');g.globalAlpha=1}
  pxc('SECURITY',x,y-56,'#e8e8e8');return}
 if(p.t==='hedge'){const x=Math.round(p.x),y=Math.round(p.y);for(let i=0;i<6;i++)R(x-14+i*5,y-14+(i%2)*2,8,14,i%2?'#2a5a2a':'#3a6a32');return}
 if(p.t==='mop'){const x=Math.round(p.x),y=Math.round(p.y);R(x,y-24,1,22,'#8a6a4a');R(x-3,y-2,7,3,'#d8d0c0');return}
 return _dp(p)}}
{const _dh=drawHeld;drawHeld=function(it,x,y,d){
 if(it==='pistol'){R(d>0?x:x-5,y-2,6,2,'#2a2a2e');R(d>0?x:x+3,y,2,3,'#3a3a3e');return}
 if(it==='mop'){R(x,y-14,1,18,'#8a6a4a');R(x-3,y+4,7,3,'#d8d0c0');return}
 return _dh(it,x,y,d)}}
{const _bg=ROOMS.bus.bg;ROOMS.bus.bg=function(){_bg.call(this);if(detectorsOn()){drawProp({t:'detector',x:160,y:140,light:D.mdLight||0})}if(D&&!D.weekend)drawProp({t:'hedge',x:290,y:150})}}

/* the back way round: right from the bus loop, into the woods */
WORLD.bus.R='forest';WORLD.forest.R='bus';
{const _edge=edge;edge=function(s){
 if(D&&D.room==='bus'&&s>0)return worldGo('forest',300,null,-1);
 if(D&&D.room==='forest'&&s>0)return worldGo('bus',300,null,-1);
 return _edge(s);
}}

/* the hedge */
spot({room:'bus',x:290,y:150,label:'Stash your metal stuff in the hedge',short:'HEDGE',free:1,cond:()=>detectorsOn()&&metalOn().length>0,run:async()=>{
 await walk('you',284,70);pose('you','kneel');const m=metalOn();D.f.stash=(D.f.stash||[]).concat(m);D.items=D.items.filter(i=>!m.includes(i));pose('you',null);
 toast('Stashed in the hedge: '+m.map(i=>ITEMS[i]||i).join(', '));updateLoc();return 'stay';
}});
spot({room:'bus',x:296,y:150,label:'Get your stuff out of the hedge',short:'HEDGE',free:1,cond:()=>(D.f.stash||[]).length>0,run:async()=>{
 await walk('you',290,70);pose('you','kneel');for(const i of (D.f.stash||[]))if(!D.items.includes(i))D.items.push(i);toast('Got your stuff back from the hedge.');D.f.stash=[];pose('you',null);updateLoc();return 'stay';
}});

/* the front doors */
async function screening(){
 busy=true;setPanel('talk');
 const cast={you:[90,1,{y:150}],coach:[200,-1,{y:146,hold:'javelin'}]};if(!D.dead.sherman)cast.sherman=[130,1,{y:146,pose:'hips'}];
 scene('bus',cast,true);cue('tension');
 if(!D.f.mdSeen){
  D.f.mdSeen=1;
  put('kid2',40,1,{y:150});
  await N('There’s a metal detector in the front doors. A big gray arch with a light on top. Coach is standing next to it holding a javelin. Ms. Sherman is holding a clipboard.');
  await say('sherman','New security for the inspection, children. Walk through. If it rings, Coach will help you.','evil');
  await walk('kid2',160,60);D.mdLight=2;SFX.beep();SFX.beep();
  await N('It rings. A freshman. His belt buckle.');
  pose('coach','throw');await wait(200);hold('coach',null);SFX.whoosh();SFX.squelch();shake(1.2);flash('#a00010',.4);
  blood(A.kid2.x,A.kid2.y-22,50,1,100,A.kid2.y+2);kill('kid2','impale',{pool:34});D.dead.kid2=1;
  await N('Coach doesn’t even blink. Nobody in the line makes a sound. The light on the arch goes back to off.');
  await say('sherman','Belts are metal, sweeties. Did nobody read the letter?','happy');
  D.mdLight=0;hold('coach','javelin');pose('coach',null);
  intel('backway');
  await N('Behind you in the line, a kid whispers to his friend: “back way. through the woods. tomorrow.” His friend nods.');
 }
 await walk('you',160,50);
 const m=metalOn();
 if(m.length){D.mdLight=2;SFX.beep();SFX.beep();
  await N('It rings. '+(ITEMS[m[0]]||m[0])+'.');
  pose('coach','throw');await wait(200);SFX.whoosh();SFX.squelch();shake(1.4);flash('#a00010',.5);blood(A.you.x,A.you.y-22,50,1,100,A.you.y+2);
  D.mdLight=0;await die('detector')}
 D.mdLight=1;SFX.ding();await wait(TEST?0:300);D.mdLight=0;
 await say('sherman','Clean. Good. Smile for the inspectors, sweetie.','smirk');
 busy=false;
}
{const _td=throughDoor;throughDoor=async function(d){
 if(d&&d.front&&detectorsOn()&&!TEST){try{await screening()}catch(e){if(e===DEATH){busy=false;return newDay(true)}throw e}}
 return _td(d);
}}

/* everybody brings something now */
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);
 if(D&&!D.weekend&&cal()>=9&&cal()<=12&&HALLS.has(room)){let n=0;for(const id in A){const a=A[id];if(a&&a.extra&&!a.hold&&n<2&&Math.random()<.35){a.hold=Math.random()<.7?'knife':'pistol';n++}}}
 return r}}
if(typeof MOREGOSSIP==='function'){const _mg=MOREGOSSIP;MOREGOSSIP=function(){const g=_mg();if(D&&cal()>=8&&cal()<=12)g.push('the detector killed a freshman. for a BELT','back way through the woods. everybody knows','my cousin brought a machete in his trombone case','angelo is selling knives in the bathroom now. like a lot of knives');if(D&&D.f.lockedRoom)g.push('did you hear about the lockdown drill','they cleaned it up so good though','like you can’t even tell');return g}}
CHAT.angelo=(CHAT.angelo||[]).concat(['Since the detector? Business is insane. Butterfly knives, two for ten. I can’t keep them in stock.']);

/* ---------- the locked room ---------- */
mission('lockedroom',{name:'Lockdown Drill',icon:'🔒',who:['jaxon','kid4'],goal:'Get through the lockdown drill alive.',
 blurb:'Week two. Everybody brings something now. Then a teacher locks you all in a classroom for a “drill” and leaves.',
 parts:['The locked door'],tips:['Week two, one of your lessons.'],variants:{hid:'Under the desk',stopped:'Stepped in',cleaned:'Helped clean up'}});
async function lockedRoom(room,t){
 const c=await classIn(room);
 const vA=extra('jaxon',230,-1,{y:146}),vB=extra('kid4',270,-1,{y:146});
 await say(t,'Lockdown drill, {PETS}. {ME} locks the door. {ME} goes to the staff room. You sit in perfect silence for forty minutes.','evil');
 await walk(t,-20,70);SFX.door();SFX.locker();if(A[t])delete A[t];
 await N('The key turns from the outside. Then footsteps going away. Then nothing.');
 await N('Everybody looks at each other. Then, one by one, everybody takes something out of their bag. A box cutter. Nunchucks. A screwdriver sharpened on a curb. They all came in the back way.');
 for(const k of c.kids.filter(here_).slice(0,4))hold(k,pick(['knife','chucks','tape']));
 if(A.jaxon){hold('jaxon','knife');A.jaxon.pose=null;await say('jaxon','(to the sophomore) That’s my vape you’re holding. That’s MY vape.','angry')}
 if(A.kid4){hold('kid4','pistol');A.kid4.pose=null;await say('kid4','It’s not your vape. Nothing in this room is yours. Sit DOWN, Jaxon.','angry')}
 const ch=await choose([{t:'Get under your desk.'},{t:'“Both of you, PUT IT AWAY.”',tag:'!'},{t:'Grab the fire extinguisher off the wall.'}],'There’s a gun and a knife and a locked door.');
 if(ch===1){A.you.pose=null;await walk('you',250,90);
  const ok=await mash('Get between them!',{need:18,time:4});
  if(!ok){SFX.squelch();blood(A.you.x,A.you.y-20,30,null,60,A.you.y+2);A.you.hurt=2;await N('Jaxon swings at the sophomore and gets you instead. Across the forearm. It doesn’t hurt yet. It will.')}
  else await N('You get your hands up between them. For one second it works. Then the sophomore shoves you out of the way.')}
 else if(ch===2){A.you.pose=null;await walk('you',20,90);hold('you','extinguisher');SFX.whoosh();prop({t:'smoke',x:240,y:130});await N('You empty the extinguisher at them. White everywhere. It doesn’t stop it. It just means nobody can see it.')}
 else{A.you.pose='kneel';await N('You get under your desk. Everybody near you gets under theirs. Somebody is praying. Somebody is filming.')}
 if(A.jaxon&&A.kid4){
  await walk('jaxon',A.kid4.x-10,140);pose('jaxon','stab');SFX.squelch();blood(A.kid4.x,A.kid4.y-20,40,null,80,A.kid4.y+2);
  SFX.bang&&SFX.bang();shake(1.4);flash('#fff',.4);blood(A.jaxon.x,A.jaxon.y-22,40,null,80,A.jaxon.y+2);
  kill('jaxon','lie',{pool:34});kill('kid4','lie',{pool:34});D.dead.jaxon=1;D.dead.kid4=1;pose('jaxon',null);
  await N('It takes about two seconds. The knife and the shot happen at the same time. Then there are two kids on the floor and the room is very, very quiet, and it smells like fireworks.');
 }
 for(const k of c.kids.filter(here_))hold(k,null);
 if(A.you)A.you.pose=null;
 await wait(600);
 const tidy=c.kids.filter(here_).slice(0,3);
 if(tidy[0]){hold(tidy[0],'mop');A[tidy[0]].pose=null}
 await N('Then, without anybody saying anything, everybody gets up and starts cleaning.');
 if(tidy[0]){await walk(tidy[0],240,50);await N(K[tidy[0]].n+' gets the mop out of the corner and does the floor. Properly. In the little figure eights, like his mom taught him.')}
 if(tidy[1]&&A.jaxon){pose(tidy[1],'drag');await Promise.all([walk(tidy[1],340,30),tw(A.jaxon,{x:330},2600)]);pose(tidy[1],null);A.jaxon.vis=false}
 if(tidy[2]&&A.kid4){pose(tidy[2],'drag');await Promise.all([walk(tidy[2],340,30),tw(A.kid4,{x:332},2600)]);pose(tidy[2],null);A.kid4.vis=false}
 await N('Two of them carry the bodies into the stationery cupboard and close the door gently, like they’re trying not to wake somebody. Somebody wipes the desks. Somebody straightens all the chairs. Somebody opens the window.');
 const c2=await choose(['Help them clean.','Sit there and shake.']);
 if(c2===0){hold('you','mop');await N('You do the bit by the door. It takes a long time. When you’re finished it looks better than it did before.');hold('you',null)}
 SFX.locker();SFX.door();if(t){put(t,-14,1,{y:146});await walk(t,60,60)}
 await say(t,'(looking round) Oh! What a lovely tidy room, {PETS}. Silent AND tidy. Gold stars for everybody.','happy');
 await N('Nobody says anything. Nobody ever does. At the bell, everybody files out in a line, past the stationery cupboard, and nobody looks at it.');
 await complete('lockedroom',c2===0?'cleaned':ch===1?'stopped':'hid');
 await classOut(c);
}
{const _gl=genericLesson;genericLesson=async function(room){
 const t=TEACH[D.period]&&TEACH[D.period][room];
 if(t&&typeof EPISODES!=='undefined'&&EPISODES[room]&&!D.weekend&&cal()>=9&&cal()<=12&&!D.done.lockedroom&&(Math.random()<.5||cal()>=11)){D.f.lockedRoom=cal();return lockedRoom(room,t)}
 return _gl(room);
}}
