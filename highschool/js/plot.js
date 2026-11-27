'use strict';
/* =====================================================================
   HIGHSCHOOL — THE CREW. The main story, over two weeks.
   Tyler is gone. The teachers are killing kids. The inspection is on
   the second Friday. Everyone works together to prove it. Everyone,
   except for freaking Aidan.
   ===================================================================== */
const crew=()=>{P.crew=P.crew||{};P.crew.ev=P.crew.ev||{};return P.crew};
const cut=id=>(window.EDITION_CUT||[]).includes(id);
const alive=ids=>ids.filter(n=>K[n]&&!cut(n)&&!(D&&D.dead[n]));
function evidence(id,label){const c=crew();if(c.ev[id])return;c.ev[id]=1;save();SFX.ding();toast('🗂️ Evidence for THE FILE: '+label+' ('+crewEvidence()+')')}
function crewEvidence(){const c=crew();return['retainer','jars','register','boiler','rota','notebook','footage','confession'].filter(k=>c.ev[k]).length+(P.intel.shermianList?1:0)}
Object.assign(INTEL,{crewRota:'Pat gave the crew the staff rota for Inspection Day.'});
K.insp1={n:'Inspector Hale',col:'#4a4a5a',skin:'#e0c0a0',hair:'#6a6a6a',hs:'short',top:'#2a2a33',pants:'#2a2a33',tie:1,adult:1,seed:81,v:200};
K.insp2={n:'Inspector Okafor',col:'#4a4a5a',skin:'#7a5034',hair:'#1a1412',hs:'bun',top:'#3a3a48',pants:'#3a3a48',skirt:1,adult:1,girl:1,seed:82,v:330};
K.insp1.id='insp1';K.insp2.id='insp2';

/* ---------------- the chapters ---------------- */
const CHAPTERS=[
 {day:1,t:'The Empty Seat',goal:'Lunch: search Ms. Sherman’s classroom (Math) for anything of Tyler’s.',done:()=>crew().ev.retainer},
 {day:2,t:'The File',goal:'Lunch: get a photo of Mr. Voss’s back fridge (Chem Lab).',done:()=>crew().ev.jars},
 {day:3,t:'Muscle',goal:'Break or lunch: get a lockpick from Angelo (Main Corridor).',done:()=>crew().pick},
 {day:4,t:'The Office',goal:'Lunch: pick the lock on Ms. Sherman’s office (Main Corridor).',done:()=>crew().ev.register},
 {day:5,t:'Mr. Adam Knows',goal:'Get to home time alive. Get on the 43.',done:()=>crew().fri1},
 {day:6,t:'The Weekend',goal:'No school. The crew is texting. Do something stupid.',done:()=>cal()>7},
 {day:8,t:'The Leak',goal:'Lunch: wipe the group chat off the phones in Ms. Sherman’s drawer (Math).',done:()=>crew().wiped},
 {day:9,t:'Lookouts',goal:'Lunch: get the Inspection Day rota from Lunch Lady Pat (Cafeteria).',done:()=>crew().ev.rota},
 {day:10,t:'The Boiler Room',goal:'Lunch: go down the old hatch by the pool doors (Main Corridor).',done:()=>crew().ev.boiler},
 {day:11,t:'The Plan',goal:'Break, the Library: give everyone a job. Then live until tomorrow.',done:()=>crew().roles},
 {day:12,t:'Inspection Day',goal:'Break. The Main Hall. Everything happens.',done:()=>crew().finale},
 {day:13,t:'After',goal:'The last weekend. It’s over. Or it isn’t.',done:()=>cal()>14}
];
STORY.length=0;STORY.push(...CHAPTERS);
storyNow=function(){
 const c=cal();let i=-1;for(let k=0;k<CHAPTERS.length;k++)if(CHAPTERS[k].day<=c)i=k;
 /* an older chapter you haven't finished still shows first */
 for(let k=0;k<i;k++)if(CHAPTERS[k].day<12&&!CHAPTERS[k].done()&&CHAPTERS[k].day!==6&&CHAPTERS[k].day!==5&&k>=i-2)return{i:k,...CHAPTERS[k],goal:'(still to do) '+CHAPTERS[k].goal};
 if(i<0)i=0;const ch=CHAPTERS[i];return{i,...ch,goal:ch.done()?'Done. '+(CHAPTERS[i+1]?'Next: '+dayName(CHAPTERS[i+1].day)+(weekOf(CHAPTERS[i+1].day)===2&&weekOf()===1?' next week':'')+'.':''):ch.goal};
};

/* ---------------- the beats: start of break, every school day ---------------- */
const BEATS={};
const BEAT_ORDER=[1,2,3,4,5,8,9,10,11];
const BEAT_PRE={1:()=>true,2:()=>crew().ev.retainer,3:()=>crew().ev.jars,4:()=>crew().pick,5:()=>crew().ev.register,8:()=>crew().fri1,9:()=>crew().wiped,10:()=>crew().ev.rota,11:()=>crew().ev.boiler};
function nextBeat(){for(const d of BEAT_ORDER){if(crew()['beat'+d])continue;return BEAT_PRE[d]()?d:null}return null}
ON_PERIOD.push(async(i,resume)=>{
 if(i===2&&!resume&&D&&!D.weekend&&cal()===12&&!crew().beat12&&!crew().finale){crew().beat12=1;save();await cutscene(BEATS[12]);busy=false;return}
 if(![0,2,4].includes(i)||resume||!D||D.weekend||cal()>=12)return;
 const d=nextBeat();if(d==null||(d>1&&crew().lastBeatDay===cal()&&crew().lastBeatP===i))return;
 crew()['beat'+d]=1;crew().lastBeatDay=cal();crew().lastBeatP=i;save();
 await cutscene(BEATS[d]);busy=false;
});
function crewScene(ids,room){
 const list=alive(ids),cast={you:[40,1,{y:156}]};
 list.forEach((n,i)=>cast[n]=[70+i*(230/Math.max(1,list.length)),i%2?-1:1,{y:140+(i%3)*5}]);
 scene(room||'library',cast,true);cue('tension');return list;
}
async function aidanTries(line,reply){
 if(D.dead.aidan||D.f.aidanDead)return;
 put('aidan',334,-1,{y:146});await walk('aidan',250,60);
 await say('aidan',line,'smirk');
 await say(reply[0],reply[1],reply[2]||'angry');
 await walk('aidan',334,60);remove('aidan');
}

BEATS[1]=async()=>{
 crewScene(['david','hasan','corey','nivaan','stella','sean','kenneth','arjun']);
 await N('Behind Biographies. David has called a meeting. David has never called a meeting. He has a clipboard he stole from the office.');
 await say('david','Tyler didn’t come home on Friday. He’s not in today. His mom posted on Facebook all weekend. “MISSING”. In capitals. With the crying emoji.','sad');
 await say('corey','He’s in my math class. In the Trailer. On Friday Ms. Sherman kept him behind after the bell. I waited for him by the steps. He never came out.','scared');
 await say('hasan','Never came out? It’s a TRAILER. It’s got one door.','scared');
 await say('stella','Bethany Cole last year. That kid with the trumpet the year before. Nobody ever says it out loud. Kids just… stop being here.','angry');
 await say('kenneth','It’s the teachers. It’s been the teachers the whole time. Everyone knows. We just say “haha, Ms. Sherman’s scary” like it’s a joke.','scared');
 await say('arjun','It IS a joke. It’s a joke where the punchline is Tyler.','angry');
 await say('david','There’s a school inspection in two weeks. Next Friday. Two people from the state, in suits, with clipboards bigger than this one.','happy');
 await say('david','If we can prove it by then. Real proof. In front of them. In front of everyone.','yell');
 await say('nivaan','I could stream it. Live. Chat would go insane. Chat would call the FBI. Chat has called the FBI before.','happy');
 await say('kenneth','We need a folder. Somewhere safe. I know what happens when stuff gets out on the internet. This time, it gets out on purpose.','angry');
 await say('sean','So we’re a crew. We’re a crew now? I’ve always wanted to be in a crew.','happy');
 await aidanTries('Hi. I heard “crew”. Can I be in the crew?',['Everyone','No.']);
 await say('david','Okay. First thing. Ms. Sherman’s classroom. Main Corridor, the MATH door. Next time she’s not in it, somebody go and look for anything of Tyler’s.','happy');
 await say('david','(looking at you) Somebody.','smirk');
 toast('★ Main story: The Crew. Two weeks until Inspection Day.');
};
BEATS[2]=async()=>{
 crewScene(['david','kenneth','nivaan','omer','hasan','stella']);
 await N('The library again. Kenneth has made a shared folder called THE FILE. The password is so long it took him the whole of Period 1 to type it.');
 await say('kenneth','Encrypted. Backed up three times. One copy is on a USB stick in my sock. Don’t ask which sock.','smirk');
 if(crew().ev.retainer)await say('hasan','Tyler’s retainer is in the File. It’s in a sandwich bag. I can’t stop looking at it.','sad');
 await say('omer','(walking in, sitting down without asking) I heard. I’m in. If anyone touches anyone, I’ll touch them back.','angry');
 await say('stella','Mr. Voss has a fridge at the back of the Chem Lab he never lets anyone near. Corey says it hums. Fridges don’t hum like that.','scared');
 await say('david','The Chem Lab. Science Wing. Get a photo of what’s in that fridge. Today.','happy');
 await aidanTries('(from the next table, writing in a notebook) I’ve been taking minutes. For the crew. Unofficially.',['omer','Give me the notebook, Aidan.']);
};
BEATS[3]=async()=>{
 crewScene(['david','angelo','marcus','omer','dheva','alex','paul']);
 await N('The crew is getting bigger. Angelo has brought his bag. The bag clanks.');
 await say('angelo','Crew discount. Lockpicks, two dollars. Nunchucks, five. Brass knuckles, adult size, I’ll throw them in free. Don’t tell my uncle.','smirk');
 await say('marcus','I’m in because this is the most interesting thing that has ever happened at this school. And because Sherman moved my seat. Twice.','smirk');
 await say('dheva','Alex and me are in. We’re a package. Don’t split us up. Everybody keeps splitting us up.','sad');
 await say('paul','I’m in. I don’t know what we’re doing. I’ll lift something. I’ll lift whatever.','happy');
 await say('david','Ms. Sherman’s office is next. We need to get in there. We need a lockpick. Angelo hangs out in the Main Corridor.','happy');
 await N('Something bangs in the ceiling vents. Everybody looks up. Then everybody decides it was nothing.');
 await aidanTries('I can pick locks. I’ve picked locker 217 about a thousand times.',['dheva','Aidan, that’s YOUR locker.']);
};
BEATS[4]=async()=>{
 crewScene(['david','stella','sean','alex','dheva','kenneth']);
 await say('stella','Ms. Sherman does lunch duty in the cafeteria from 12:20 to 12:45. I’ve timed it. For two years. For no reason. Until now.','smirk');
 await say('sean','If she comes back early, I’ll faint in the corridor. I’ve practiced fainting. I faint really well.','happy');
 await say('kenneth','In her office there’s a filing cabinet that’s older than our parents. If she’s hiding anything old, it’s in there.','scared');
 await say('david','The office. The far end of the Main Corridor. In and out. Nobody gets caught. Nobody dies.','yell');
 await aidanTries('Ms. Sherman keeps the old registers in the bottom drawer. The 1987 one’s on top. It always is.',['david','How do you KNOW that? …Don’t answer. Go away.']);
};
BEATS[5]=async()=>{
 crewScene(['david','hasan','stella','kenneth','omer','nivaan']);
 SFX.door();put('adam',-14,1,{y:146});await walk('adam',60,70);
 await N('Mr. Adam walks into the library and closes the door behind him. Then he locks it. Then he checks it’s locked. Three times.');
 await say('adam','I know what you’re doing. The File. The little meetings behind Biographies. I know.','scared');
 await say('david','Sir, we’re just a study group—','scared');
 await say('adam','THEY know too. Ms. Sherman reads everyone’s phones. She has a drawer full of them. Every phone she’s ever confiscated, she keeps. And she READS them.','yell');
 await say('adam','(quieter, almost crying) The inspection is next Friday. If you’re going to do it… do it then. In front of the state. Not before. Before, they’ll just… tidy you up.','sad');
 await say('hasan','Sir. Are you… helping us?','shock');
 await say('adam','I’m the principal. I’m not allowed to help you. (He leaves the library door unlocked on his way out.)','sad');
 await walk('adam',-20,70);remove('adam');
 await say('david','Okay. New rule. Nobody puts anything in the group chat. Nothing. Not even memes.','scared');
 await say('nivaan','(already typing) …What about one meme.','smirk');
};
BEATS[8]=async()=>{
 crewScene(['david','arjun','hasan','stella','kenneth','omer','nivaan']);
 cue('fight');
 await say('stella','Ms. Sherman stopped me in the corridor this morning. She said, “Nice FILE, sweetie.” She said File. With a capital F. You could HEAR the capital.','angry');
 await say('kenneth','Someone leaked. Someone’s phone. She’s got someone’s phone.','scared');
 await say('omer','(turning to Arjun) Whose phone does she ALWAYS take? Whose phone is in that drawer RIGHT NOW?','angry');
 await say('arjun',(D.done.phone||D.f.ph1)?'It FELL. It fell out of my pocket. That’s not leaking, that’s GRAVITY.':'She took it off my desk last week. I didn’t even have it OUT. It was RESTING.','angry');
 const c=await choose(['Defend Arjun. It wasn’t his fault.','“Arjun, it was your phone. Own it.”','Blame Aidan. Somehow.']);
 if(c===0){await say('you','Anyone’s phone could’ve fallen out. She takes everyone’s. This is on her, not him.');await say('arjun','(quietly, surprised) …Thanks.','sad');crew().arjunOk=1}
 else if(c===1){await say('arjun','Fine. FINE. It was my phone. I’m sorry. Okay? I’m sorry. I’ll fix it.','sad');crew().arjunOk=1}
 else{await say('you','…Has anyone considered that this is somehow Aidan’s fault?');await say('hasan','You know what? Yeah. Probably.','smirk');await say('arjun','It’s ALWAYS Aidan. I feel so much better.','happy')}
 await say('david','Her drawer. Math room, Main Corridor. Wipe every phone in it. Factory reset. All of them.','yell');
};
BEATS[9]=async()=>{
 const ids=['david','corey','jacob','paul','stella','sean'];if(!cut('abby'))ids.splice(2,0,'abby');
 crewScene(ids);
 await say('david','On Inspection Day we need eyes everywhere. Lookouts. Two by the hall doors. One on the roof.','happy');
 await say('corey','Me. I’ll do it. I’m good at looking at things for a long time without anyone noticing.','blush');
 if(!cut('abby'))await say('abby','(not looking up from her drawing) He really is. I’ll go with him. Someone has to stop him looking at me instead of the door.','smirk');
 else await say('jacob','I’ll go with Corey. I don’t know what we’re looking for. I’ll look at it.','happy');
 await say('paul','I’ll be on the roof. I’ve always wanted to be on the roof. I’ve been on the roof. I want to be on it officially.','happy');
 await say('david','We need to know where every teacher will be, minute by minute. Pat does the staff rota. Pat sees everything.','smirk');
 await aidanTries('I could be a lookout. I’m always looking.',['corey','…That’s actually terrifying, Aidan. No.']);
};
BEATS[10]=async()=>{
 crewScene(['david','kenneth','stella','hasan','omer','nivaan']);
 if(crew().ev.register){await say('kenneth','The register from Ms. Sherman’s office. Friday, March 13, 1987. Detention. Four names. Every one of them has a line through it in red pen.','scared');
  await say('stella','The boiler blew up that afternoon. It was in the paper. “NO ONE HURT.” Then they built the pool on top of it.','angry')}
 else await say('kenneth','Something happened here in 1987. Something with a boiler. Everyone’s grandma knows a version of it.','scared');
 await say('david','There’s an old hatch by the pool doors. It goes down to where the boiler room was. If there’s anything left of 1987, it’s down there.','scared');
 await say('omer','I’m not going down there. I’ll go down there. I’m not. I will.','scared');
 await say('david','The hatch. Main Corridor, by the far left lockers. Bring a flashlight. Bring a friend. Bring Omer.','happy');
};
BEATS[11]=async()=>{
 const ids=['david','stella','arjun','paul','omer','jacob','marcus','kenneth','nivaan','hasan'];
 crewScene(ids);cue('class');
 await N('Inspection Day is the Friday of week two. David has drawn a map of the hall on a pizza box. Everyone is crammed around it.');
 await say('david','Three jobs that matter. Who takes the PA? Who distracts the teachers? Who holds the hall doors shut?','happy');
 const roles={};
 const a=await choose(alive(['david','arjun','nivaan']).map(n=>'PA: '+K[n].n),'Who takes the PA mic?');roles.pa=alive(['david','arjun','nivaan'])[a];
 const b=await choose(alive(['stella','arjun','paul']).map(n=>'Distraction: '+K[n].n),'Who keeps the teachers busy?');roles.dis=alive(['stella','arjun','paul'])[b];
 const c=await choose(alive(['omer','jacob','marcus']).map(n=>'The doors: '+K[n].n),'Who holds the doors?');roles.door=alive(['omer','jacob','marcus'])[c];
 crew().roles=roles;save();
 if(roles.pa)await say(roles.pa,roles.pa==='david'?'I was born for this. I was literally class president for this.':roles.pa==='arjun'?'Finally. A microphone. You’re all going to regret this.':'Chat is going to LOSE it.','happy');
 if(roles.dis)await say(roles.dis,roles.dis==='stella'?'I’ll throw my ball at Coach. He has to chase it. It’s like a dog thing.':roles.dis==='arjun'?'I’m going to say the worst thing anyone has ever said to Ms. Sherman. I’ve been saving it.':'I’ll pick up Mr. Voss. Just pick him up. And walk.','smirk');
 if(roles.door)await say(roles.door,roles.door==='omer'?'Nobody gets through that door. Not teachers. Not wind.':roles.door==='jacob'?'I’ll hold it. I’m very heavy. I’ve been told.':'I’ll guard the door with my uncle’s katana. I’m legally not allowed to say that out loud.','angry');
 await aidanTries('What’s my job?',['Everyone','You don’t have one, Aidan.']);
 await say('david','(rolling up the pizza box) Friday, everybody. Don’t die before then.','happy');
};
BEATS[12]=async()=>{await inspectionDay()};

/* ---------------- the objectives ---------------- */
const onOrAfter=d=>!!crew()['beat'+d]&&!crew().finale&&!(D&&D.weekend);   /* once the crew meeting has happened, any free time */
spot({room:'maths',period:[0,1,2,3,4,5,6],x:60,y:150,label:'Search Ms. Sherman’s desk and bin',short:'DESK',cond:()=>onOrAfter(1)&&!crew().ev.retainer,run:async()=>{
 pose('you','reach');SFX.pick();await wait(400);pose('you',null);
 await N('Her desk is spotless. Her bin isn’t. Under the pen lids and shavings, a little retainer case. TYLER M., in Sharpie.');
 await N('The retainer is still inside. There’s dried blood on the wire.');
 evidence('retainer','Tyler’s retainer');
 if(A.dheva)await say('dheva','(from across the room, very quietly) Put it in a sandwich bag. Don’t let her see you leave.','scared');
 return 'stay';
}});
spot({room:'chem',period:[0,1,2,3,4,5,6],x:272,y:150,label:'Photograph the back fridge',short:'FRIDGE',cond:()=>onOrAfter(2)&&!crew().ev.jars,run:async()=>{
 if(A.voss&&!A.voss.dead){
  if(A.corey&&!A.corey.dead){await say('corey','(loudly, to Mr. Voss) Sir, is it true that curl cream is technically a chemical?','scared');await say('voss','(turning, delighted) EVERYTHING is technically a chemical, Corey! Come here. Look at this.','happy')}
  else{await N('Mr. Voss is right there. You wait until he bends down to look at something in a jar, then you move.')}
 }
 SFX.door();pose('you','phone');SFX.shutter();flash('#fff',.4);await wait(300);pose('you',null);
 await N('Fourteen jars. AIDAN. AIDAN. AIDAN. On the shelf below, a newer one: TYLER M. You take eleven photos. Your hands won’t stop.');
 evidence('jars','Mr. Voss’s fridge');intel('aidanJars');
 return 'stay';
}});
hook({mis:'crew',period:[2,4],room:'corridor',who:'angelo',label:'Ask Angelo for a lockpick (for the crew)',look:{ex:'smirk'},cond:()=>onOrAfter(3)&&!crew().pick,run:async()=>{
 await say('angelo','For the crew? No charge. Just bring it back. And if anyone asks, you found it in the library.','smirk');
 give('lockpick');crew().pick=1;save();
 await say('angelo','Turn left until it clicks. Then pray. Mostly the praying.','happy');
 return 'stay';
}});
Object.assign(ITEMS,{lockpick:'A lockpick from Angelo (for the crew)'});
spot({room:'corridor',period:[0,1,2,3,4,5,6],x:278,y:150,label:'Pick the lock on Ms. Sherman’s office',short:'OFFICE',cond:()=>onOrAfter(4)&&crew().pick&&!crew().ev.register,run:async()=>{
 if(A.sherman&&!A.sherman.dead){if(!D.dead.sean){put('sean',334,-1,{y:146});await walk('sean',200,90)}await N('Ms. Sherman patrols outside her own office. On cue, Sean walks past, says “Oh no,” and faints. Beautifully. Like a swan.');if(A.sean){A.sean.pose='lie';await walk('sherman',A.sean.x+12,60);pose('sherman','kneel')}}
 pose('you','reach');
 const ok=await mash('Pick the lock',{need:16,time:5,info:'Turn left until it clicks. Mash!'});
 pose('you',null);
 if(!ok){await N('The pick snaps off in the lock. You leave it there and walk away very fast, whistling, which you have never done before.');return 'stay'}
 scene('office',{you:[120,1,{y:156}]},true);cue('tension');
 await N('Ms. Sherman’s office. It smells like old perfume and pencil shavings. The filing cabinet is older than everyone you know.');
 SFX.locker();pose('you','reach');await wait(300);pose('you',null);
 await N('Bottom drawer, just like Aidan said: a detention register. FRIDAY 13 MARCH 1987. O. Finch. R. Patel. D. Mason. L. Okafor. All crossed out in red.');
 await N('In the margin, in very neat handwriting: “They were MY detention. My responsibility. I went to get a coffee.”');
 evidence('register','The 1987 detention register');lore('ollie');
 SFX.thud();await N('Heels in the corridor. You’re out the side door with the register under your hoodie and your heart trying to leave through your mouth.');
 D.room='corridor';buildRoom('corridor');return 'stay';
}});
ON_PERIOD.push(async(i)=>{if(i===7&&crew().beat5&&!D.weekend){crew().fri1=1;save()}});
spot({room:'maths',period:[0,1,2,3,4,5,6],x:84,y:150,label:'Wipe the phones in Ms. Sherman’s drawer',short:'DRAWER',cond:()=>onOrAfter(8)&&!crew().wiped,run:async()=>{
 pose('you','reach');SFX.locker();await wait(300);
 await N('Her drawer. Phones. Dozens of them. Flip phones, a pager, Arjun’s phone with the cracked case. They’re all still charged. She charges them.');
 const ok=await mash('Factory reset every phone',{need:18,time:6,info:'Hold power + volume on every single one. MASH!'});
 pose('you',null);
 if(ok){crew().wiped=1;save();await N('One by one the screens go black and come back saying “Hello” in fourteen languages. The File is gone. She’ll know. She won’t know what she knows.');toast('🗂️ The leak is plugged.')}
 else await N('You get through half of them before a sound in the corridor makes you shut the drawer. Half is better than nothing. It isn’t, really.');
 if(ok)return 'stay';crew().wiped=.5;save();return 'stay';
}});
hook({mis:'crew',period:[2,4],room:'canteen',who:'pat',label:'Ask Pat about the staff rota',look:{ex:'smirk'},cond:()=>onOrAfter(9)&&!crew().ev.rota,run:async()=>{
 await say('pat','(not looking up from the gravy) The rota. For Friday. Yeah, I’ve got it.','smirk');
 await say('pat','I’ve been serving these people for twenty-two years, love. I’ve seen what goes in the stew. I’ve seen who doesn’t come back for seconds.','angry');
 hold('pat','plan');await wait(300);hold('pat',null);
 await N('She hands it to you folded inside a napkin. Every teacher, every minute of Friday. Next to Ms. Sherman’s name, someone has drawn a tiny skull.');
 evidence('rota','The Inspection Day rota');intel('crewRota');
 await say('pat','Now take a cookie and go away. Smile. Look normal. Nobody looks at the dinner lady.','happy');
 return 'stay';
}});
spot({room:'corridor',period:[0,1,2,3,4,5,6],x:40,y:150,label:'Go down the old hatch by the pool doors',short:'HATCH',cond:()=>onOrAfter(10)&&!crew().ev.boiler,run:async()=>{
 const cast={you:[60,1,{y:156}]};if(!D.dead.omer)cast.omer=[36,1,{y:150,hold:'light'}];
 scene('boiler',cast,true);cue('evil');
 await N('Down the ladder, under the pool. Wet, warm air. Chlorine, and something much older. Your light finds the old boiler, split open like a burst can.');
 if(A.omer)await say('omer','(whispering) I said I wouldn’t come down here. I came down here. I hate that I came down here.','scared');
 await walk('you',220,50);
 await N('Scratched into the brick by the coal chute, at kid height: OLLIE. RAJ. DANNY. LOUISE. Smaller, underneath: “WE WAITED LIKE SHE SAID.”');
 SFX.drip();await wait(600);
 if(!cut('ollie'))put('ollie',280,-1,{y:150});
 await N('At the end of the room, a boy in an old uniform, holding a library book. He isn’t standing on the floor. He’s standing slightly above it.');
 await say('ollie','You found us. Nobody ever comes down here. They put a swimming pool on us.','sad');
 await say('ollie','Tell them. On Friday. Say our names. Out loud. Nobody’s said them in thirty-nine years.','sad');
 await N('You blink. He isn’t there. The book is, on the floor, open. HOW TO BE BRAVE.');if(A.ollie)delete A.ollie;
 SFX.shutter();flash('#fff',.4);
 evidence('boiler','The names in the boiler room');lore('chute');
 if(A.omer)await say('omer','(running for the ladder) NOPE. Nope. I’m good. I was never here. GHOSTS ARE REAL. I’M TELLING MY MOM.','yell');
 D.room='corridor';buildRoom('corridor');return 'stay';
}});
mission('crew',{name:'The Crew (main story)',icon:'🗂️',who:['david','hasan','kenneth','stella','omer','nivaan'],blurb:'Tyler is missing. The teachers are killing kids. The school inspection is on the second Friday. The crew has two weeks to fill THE FILE with proof. Everyone is in the crew. Except Aidan.',parts:['Inspection Day'],tips:['Every school day at break, the crew meets. The objective for each day is under the clock.'],variants:{exposed:'Exposed',bloodbath:'Not enough'}});

ROOMS.boiler={name:'The Old Boiler Room',music:'evil',bg(){
 R(0,0,W,112,'#2a1e1a');for(let y=0;y<112;y+=6)for(let x=(y/6%2)*8;x<W;x+=16){R(x,y,15,5,'#3a2a22');R(x,y,15,1,'#4a3a2e')}
 for(let i=0;i<5;i++){R(0,14+i*16,W,4,'#4a4a4a');R(0,14+i*16,W,1,'#6a6a6a')}
 R(110,30,80,76,'#1a1a1a');R(114,34,72,68,'#2a2624');R(120,40,60,40,'#141210');R(146,40,8,40,'#3a1a10');for(let i=0;i<6;i++)R(118,90+i*2,64,1,'#3a3430');R(150,20,10,14,'#2a2a2a');
 R(240,0,40,70,'#1a1210');R(250,0,20,70,'#0a0806');g.globalAlpha=.25;for(let i=0;i<30;i++)R(250-i,i*3,20+i*2,3,'#d8e8f0');g.globalAlpha=1;
 px('OLLIE',230,92,'#8a7a6a');px('RAJ',260,92,'#8a7a6a');px('DANNY',230,99,'#8a7a6a');px('LOUISE',258,99,'#8a7a6a');
 R(0,112,W,68,'#1e1814');for(let i=0;i<160;i++)R(hsh(i+90)*W,112+hsh(i+91)*68,2,1,i%3?'#2a221c':'#141010');
 for(let i=0;i<5;i++){const q=(T*.7+i/5)%1;R(60+i*50,q*112,1,2,'#6a8aa0')}
}};
if(typeof LIGHT!=='undefined')LIGHT.boiler={amb:.32,tint:[20,10,10],src:[[260,40,140,.55,[210,230,255]],[80,140,60,.2,[255,200,140]]]};

/* ---------------- INSPECTION DAY ---------------- */
async function inspectionDay(){
 const c=crew(),roles=c.roles||{};
 const kids=alive(['david','hasan','arjun','stella','sean','omer','nivaan','kenneth','corey','abby','marcus','paul','jacob','angelo','dheva','alex']);
 const teachers=alive(['shermian','voss','coach','loach','balduf','sherman']);
 const cast={adam:[160,1,{y:118,pose:'conduct'}],insp1:[186,-1,{y:118}],insp2:[206,-1,{y:118}],you:[40,1,{y:160}]};
 teachers.forEach((t,i)=>cast[t]=[236+i*14,-1,{y:126}]);
 kids.slice(0,10).forEach((n,i)=>cast[n]=[60+i*18,-1,{y:150+(i%2)*6}]);
 scene('hall',cast,true);cue('tension');crowd={n:14,cheer:false,phones:true,front:4,gap:[60,180]};
 await card('INSPECTION DAY','WEEK 2 · FRIDAY',2200);
 await N('Special assembly. Two state inspectors on the stage in grey suits. The teachers lined up along the wall, smiling. All of them. All at once.');
 await say('adam','(at the podium, sweating through his shirt) Welcome, inspectors, to Highgate High, where every child is… where every child…','scared');
 await say('insp1','Take your time, Mr. Adam.','happy');
 let score=crewEvidence();
 if(typeof bossFights==='function')score+=await bossFights(teachers);
 const pa=roles.pa||'david';
 if(P.intel.adamKey){score++;await N('Mr. Adam finds you in the crowd. Then he slides a little brass key across the podium. Towards the PA desk.')}
 if(c.wiped===1)score++;
 if(roles.pa==='david')score++;if(roles.dis==='stella'||(roles.dis==='arjun'&&c.arjunOk))score++;if(roles.door==='omer')score++;
 cue('fight');
 if(A[pa])await walk(pa,120,100);
 SFX.static();
 await say(pa,'(on the PA, voice booming through every speaker in the building) GOOD MORNING, INSPECTORS. WE HAVE A PRESENTATION.','yell');
 if(A.kenneth)await say('kenneth','(at the projector, typing very fast) The File is up. Everyone look at the wall.','smirk');
 if(A.nivaan)await say('nivaan','(phone up) We’re live. Three thousand people watching. Chat, say hi to the inspectors.','happy');
 const ev=c.ev;
 const shown=[];if(ev.retainer)shown.push('Tyler’s retainer, with blood on the wire, from Ms. Sherman’s bin');if(ev.jars)shown.push('Mr. Voss’s fridge: fourteen jars labelled AIDAN, and one labelled TYLER');if(P.intel.shermianList)shown.push('Ms. Sherman’s list: NOT PASSING, with names crossed out');if(ev.register)shown.push('the 1987 detention register: four names, crossed out in red');if(ev.boiler)shown.push('four names scratched into the boiler-room wall');if(ev.notebook)shown.push('Tyler’s notebook: “if I tell anyone she says I get a seat in her drawer”');if(ev.footage)shown.push('night camera footage: Mr. Voss wheeling a laundry cart into the chem lab at 3 a.m., and every teacher in the building sitting in the dark, not moving');if(ev.confession)shown.push(c.adamNamed?'a voice memo: Mr. Adam, crying, telling the whole story of 1987':'a voice memo: an anonymous adult, crying, telling the whole story of 1987');if(ev.rota)shown.push('the staff rota, with a little skull next to Ms. Sherman');
 if(!shown.length)shown.push('a slideshow that is mostly memes, because the File is nearly empty');
 for(const s of shown){SFX.click();await N('Click. On the wall: '+s+'.')}
 if(typeof finaleDiscoveries==='function')score+=await finaleDiscoveries(c);
 if(ev.boiler){await say('you','(standing up) '+(P.ollie87?'':'Ollie Finch. ')+'Raj Patel. Danny Mason. Louise Okafor. March 13, 1987. They were in detention in the boiler room. Ms. Sherman left them there.');
  if(A.sherman){A.sherman.ex='cry';await N('Ms. Sherman makes a sound nobody has ever heard a teacher make. She sits down on the floor of the hall, very slowly, with her hands over her face.')}}
 for(const t of teachers)if(A[t])A[t].ex='evil';
 await N('Along the side wall, the smiles come off. All of them. All at once.');
 if(A.shermian)await say('shermian','(very softly) Sweeties. Miss is going to need everyone to sit DOWN.','evil');
 if(roles.dis&&A[roles.dis]){
  if(roles.dis==='stella'){SFX.whoosh();await N('Stella’s baseball hits Coach right between the eyes from forty feet away. He takes off after her like a golden retriever. The doors open and shut behind them.')}
  else if(roles.dis==='arjun'){await say('arjun','(standing on a chair) MS. SHERMIAN. YOUR HUSBAND ISN’T STAYING AT HIS MOM’S. HE’S STAYING AT MR. VOSS’S.','yell');await N('For one full second, the two of them look at each other. That second is all anyone needs.')}
  else{await N('Paul walks up to Mr. Voss, picks him up like a sack of potatoes, and carries him out of a side door without saying a single word.')}
 }
 if(roles.door&&A[roles.door])await N(K[roles.door].n+' throws his whole body against the back doors. Something hits them from outside, hard, and they don’t open.');
 /* the twist: Aidan */
 if(!D.dead.aidan&&!D.f.aidanDead){
  put('aidan',-14,1,{y:146});await walk('aidan',150,90);
  await N('Then, completely uninvited, Aidan walks down the middle of the hall, climbs onto the stage, and takes the microphone off the podium.');
  await say('aidan','I’d just like to thank the crew.','happy');
  await say('hasan','YOU’RE NOT IN THE CREW.','yell');
  await say('aidan','(holding up a jar) I brought one of mine. From Mr. Voss’s fridge. It’s got my name on it. I’d like it entered into evidence.','smirk');
  score++;
  await N('He sets the jar in front of Inspector Okafor. She reads the name. She looks at Aidan, standing right there, alive. You can watch her brain fall over.');
 }
 if(c.adamNamed&&A.adam){score++;await say('adam','(into the microphone, steady for the first time in two weeks) It’s me on that recording. Everything on it is true. I was there in 1987. I was supposed to be in that room.','sad')}
 if(score>=8){
  c.finale='exposed';save();
  await say('insp2','(standing, very calm) Nobody leaves this hall. Mr. Hale, call the state police. And then call everybody else.','angry');
  if(c.ev.sher87&&K.sherman&&!D.dead.sherman){const who='sherman';if(typeof SLIDE!=='undefined')SLIDE.t='';if(!A.sherman){put('sherman',334,-1,{y:126,ex:'cry'});await walk('sherman',A.insp1.x+40,50)}
   await walk(who,A.insp1.x+16,60);face(who,-1);
   await say(who,'(holding her wrists out to the inspectors, very quietly) It was me. In 1987. I left them in the boiler room and went for a coffee. I went back. I was too late for one of them. I have been too late every Friday since.','cry');
   if(!D.done.dopple)await N('Somewhere under the school, under the pool, under the boiler, something that has been chewing for thirty-nine years stops. And doesn’t start again.');
   await N('Nobody moves. The smiles along the wall go out one by one, like someone walking down a corridor turning off lights.');
   c.finale='confessed';
  }else if(A.shermian){
   await walk('shermian',A.insp1.x+12,120);
   SFX.squelch();blood(A.insp1.x,A.insp1.y-24,50,null,100,A.insp1.y+2);kill('insp1','lie',{pool:40,bleed:4,spray:60});
   await N('Ms. Sherman reaches Inspector Hale in four seconds. His clipboard lands face-up in the blood. He’d given the school a “Good”.');
   if(A.omer){SFX.punch();shake(1.2);await N('Then Omer, Marcus, Paul and about forty other kids land on her at the same time. It takes all of them. It takes the whole school.')}
  }
  await say('adam','(on the floor of the stage, crying with relief, into the microphone) Thank you. Thank you. Thank you. Everybody gets the rest of the day off. Everybody gets the rest of the YEAR off.','cry');
  await N('By lunch, fourteen police cars in the bus loop. By home time, every teacher in that row is in one. Highgate is closed “pending investigation”.');
  await N('The crew sits on the wall and watches them go. Nobody talks for a long time. Then Hasan starts laughing and can’t stop. Then nobody can.');
 }else{
  c.finale='bloodbath';save();
  await say('insp1','(looking at the slideshow, then at his clipboard) Well. This is… some of this is concerning. Some of it is memes. We’ll need more than this.','sad');
  await N('Behind the inspectors, Ms. Sherman closes the hall doors. Gently. And locks them.');
  cue('fight');
  for(const t of teachers.slice(0,3)){const v=kids.find(k=>A[k]&&!A[k].dead&&k!==pa);if(!v||!A[t])continue;await walk(t,A[v].x+10,120);SFX.squelch();blood(A[v].x,A[v].y-24,40,null,100,A[v].y+2);kill(v,'lie',{pool:40,bleed:4,spray:50});await N(K[t].n+' gets to '+K[v].n+' first.')}
  await N('The inspectors leave at 11:15: “Requires Improvement”. The hall doors open at 11:40. Fewer of you walk out than walked in.');
  await say('david','(on the steps outside, shaking) We should’ve had more. We should’ve had more in the File.','cry');
 }
 crowd=null;await complete('crew',c.finale);
 toast('★ Main story: Inspection Day — '+(c.finale==='confessed'?'SHE CONFESSED':c.finale==='exposed'?'EXPOSED':'not enough evidence'));
}
