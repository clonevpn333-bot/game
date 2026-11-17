'use strict';
/* =====================================================================
   HIGHSCHOOL — your own timetable, skipping class, the woods,
   and LOCKDOWN (the intruder).
   ===================================================================== */

/* ---------- your timetable: the bell takes you to YOUR class ---------- */
const MYCLASS={odd:{1:'english',3:'maths',5:'gym',6:'chem'},even:{1:'history',3:'ict',5:'pool',6:'hall'}};
function myClass(){const t=(D&&D.dayType)||'odd';return MYCLASS[t][D.period]}
{
 const _om=openMap;
 openMap=function(forced){
  if(forced&&D&&PERIODS[D.period]&&PERIODS[D.period].lesson&&!openMap.skip&&myClass())return bell();
  openMap.skip=0;return _om(forced);
 };
}
async function bell(){
 const r=myClass(),t=TEACH[D.period]&&TEACH[D.period][r];
 if(D.period===3&&lockdownDue()){D.room=r;return runHook(LOCKHOOK)}
 if(!TEST&&ROOM!=='corridor'){D.room='corridor';buildRoom('corridor');updateLoc()}
 const tname=t&&K[t]?K[t].n:'';
 const c=await choose([
  {t:'Go to class: '+ROOMS[r].name.split(' —')[0]+(tname?' with '+tname:'')+'.'},
  {t:'Skip class. Sneak around the school.',tag:'skip'},
  {t:'Skip class. Run out the back gate, into the woods.',tag:'run'}
 ],'The bell. '+PERIODS[D.period].name+'. You’re meant to be in '+ROOMS[r].name.split(' —')[0]+'.');
 if(c===0)return enterRoom(r);
 D.f.skipped=(D.f.skipped||0)+1;
 if(c===1){toast('Skipping '+ROOMS[r].name.split(' —')[0]+'. Don’t get caught.');openMap.skip=1;return openMap(true)}
 return runToWoods();
}
async function runToWoods(){
 D.room='forest';updateLoc();buildRoom('forest');
 A.you.x=-10;busy=true;setPanel('talk');
 await walk('you',60,90);
 busy=false;
 if(!D.f.woodsSeen){D.f.woodsSeen=1;toast('The woods behind the field. Nobody comes out here. Nobody can see you.')}
 roam();
}

/* ---------- the woods ---------- */
ROOMS.forest={name:'The Woods (behind school)',music:'sad',bg(){
 const p=D?D.period:0,eve=p>=7;
 skyBands(eve?['#2a1a3a','#5a2a4a','#8a3a4a']:['#7aa8c8','#9ab8c8','#b0c8c0'],0,40);
 R(0,36,W,26,'#26402a');for(let i=0;i<16;i++){const x=i*22-8+(i%3)*4,h=40+hsh(i)*30;R(x,40-h*.2,18,h,'#2a4a2a');R(x+4,32-h*.2,10,8,'#2a4a2a')}
 for(let i=0;i<12;i++){const x=i*28+(i%2)*10,y=20+hsh(i+3)*20;R(x,y,22,22,'#3a5a32');R(x+3,y-5,16,6,'#3a5a32');R(x+5,y+3,6,4,'#4a6a3a')}
 R(0,60,W,90,'#3a4a2a');for(let i=0;i<60;i++)R(hsh(i)*W,62+hsh(i+7)*86,2,1,i%3?'#4a5a32':'#5a4a2a');
 for(let i=0;i<7;i++){const x=10+i*48+(i%2)*14;R(x,24,8,128,'#4a3a2a');R(x+1,24,2,128,'#5a4a36');R(x+6,24,2,128,'#3a2a1e');R(x-6,40+i*3,8,2,'#4a3a2a');R(x+8,52+i*2,10,2,'#4a3a2a');R(x-14,20,36,22,'#2e4a28');R(x-10,14,28,10,'#36522e');R(x-4,24,10,6,'#40603a')}
 R(0,122,W,10,'#5a4a32');for(let i=0;i<W;i+=7)R(i,124+(i%3),4,1,'#6a5a3a');
 R(230,104,30,3,'#6a4a2a');R(232,107,2,10,'#4a3a2a');R(256,107,2,10,'#4a3a2a');R(226,112,38,2,'#6a4a2a');
 R(276,100,10,16,'#3a5a3a');R(276,100,10,2,'#5a7a5a');R(278,104,6,1,'#2a3a2a');px('BEAR',272,84,'#c8c8b0');px('PROOF?',268,90,'#c8c8b0');
 R(0,150,W,30,'#2e3a22');for(let i=0;i<40;i++)R(hsh(i+20)*W,152+hsh(i+30)*26,3,1,['#8a4a2a','#a86a2a','#6a3a1a'][i%3]);
 for(let i=0;i<5;i++){const q=(T*.3+i/5)%1;R((hsh(i)*W+Math.sin(T+i)*10)|0,(q*150)|0,2,1,'#a86a2a')}
}};
ROSTER.forEach((r,i)=>{if(r&&i>=1&&i<=6)r.forest=r.forest||[]});
ROSTER[1].forest=[['tez',250,-1,'smoke',150]];
if(typeof LIGHT!=='undefined')LIGHT.forest=()=>{const p=D?D.period:0;return p>=7?{amb:.6,tint:[60,20,60],src:[[160,20,200,.2,[255,190,140]]]}:{amb:.78,tint:[20,50,30],src:[[150,0,160,.25,[240,255,200]]]}};
spot({room:'forest',x:160,y:150,label:'Lie in the leaves until the bell',short:'LEAVES',run:async()=>{
 pose('you','lie');await N(pick(['You lie in the leaves and watch the branches. Somewhere a long way off, a bell. It isn’t for you.','You lie down. The leaves smell like rain and old cigarettes. For forty minutes nobody needs you to be anything.','The ground is cold. You don’t care. Up in the branches a bird is doing the same three notes over and over, like it’s also stuck on a Friday.']));
 pose('you',null);
}});
spot({room:'forest',x:280,y:150,label:'Read the sign',short:'SIGN',run:async()=>{
 await N('A sign nailed to a tree. Someone has crossed out BEAR PROOF and written RACCOON PROOF. Someone else has crossed that out and written “LOL NOTHING IS”.');return 'stay';
}});
{const _dp=drawProp;drawProp=function(p){const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='raccoon'){const d=p.dir||1,bob=p.still?0:(Math.sin(T*12)>0?1:0);
  R(x-7,y-8+bob,14,8,'#7a7a80');R(x-6,y-9+bob,12,2,'#8a8a90');R(x-5,y-1,2,2,'#2a2a2a');R(x+3,y-1,2,2,'#2a2a2a');
  for(let i=0;i<4;i++)R(x-d*(8+i*3),y-9+i%2,3,4,i%2?'#2a2a2a':'#9a9aa0');
  const hx=x+d*7;R(hx-4,y-12+bob,8,7,'#9a9aa0');R(hx-5,y-14+bob,3,3,'#7a7a80');R(hx+2,y-14+bob,3,3,'#7a7a80');R(hx-4,y-10+bob,8,2,'#1a1a1a');R(hx-2,y-10+bob,1,1,p.glow?'#f0f080':'#fff');R(hx+1,y-10+bob,1,1,p.glow?'#f0f080':'#fff');R(hx+d*4,y-8+bob,2,2,'#1a1a1a');
  if(p.food){R(hx+d*4-1,y-6+bob,6,3,'#c88a3a');R(hx+d*4,y-6+bob,4,1,'#e8b060')}
  return}
 if(p.t==='eyes'){if(Math.sin(T*1.3+x)>-.8){R(x,y,1,1,'#f0f080');R(x+3,y,1,1,'#f0f080')}return}
 if(p.t==='bangfx'){const q=(T-p.t0);if(q>.6)return;g.globalAlpha=Math.max(0,1-q/.6);g.save();g.translate(x,y);g.scale(3,3);px('BANG',-8,-3,'#fff');g.restore();g.globalAlpha=1;return}
 if(p.t==='under'){R(x,y,26,3,'rgba(0,0,0,.6)');R(x+4,y-1,16,1,'rgba(0,0,0,.4)');return}
 if(p.t==='barricade'){R(x-20,y-44,40,44,'#5a3a24');for(let i=0;i<4;i++){R(x-18,y-42+i*11,36,1,'#3a2414');for(let j=0;j<6;j++)R(x-17+j*6,y-40+i*11,4,8,['#8a2a2a','#2a4a8a','#3a6a3a','#c8a040'][(i+j)%4])}return}
 if(p.t==='machete'){g.save();g.translate(x,y);g.rotate(p.rot||0);R(-6,-1,4,3,'#2a2a2a');R(-2,-1,12,2,'#d0d4d8');R(8,0,2,1,'#fff');g.restore();return}
 return _dp(p)}}
{const _dh=drawHeld;drawHeld=function(it,x,y,d){
 if(it==='cleaver'||it==='machete'){R(x-1,y-1,2,3,'#2a2a2a');R(x+d*1,y-6,d*7,5,'#d0d4d8');R(x+d*1,y-6,d*7,1,'#fff');return}
 if(it==='katana'){R(x-1,y-2,2,4,'#2a2a2a');for(let i=0;i<14;i++)R(x+d*(i+1),y-2-(i>>2),1,1,'#e0e4e8');return}
 if(it==='bat'){for(let i=0;i<12;i++)R(x+d*i,y-1-(i>>1),i>6?2:1,i>6?2:1,'#b8b8c0');return}
 if(it==='scissors'){R(x-1,y-1,3,2,'#e04040');R(x+d*2,y-2,d*4,1,'#c8c8c8');return}
 if(it==='straps'){R(x-2,y-2,5,3,'#30a0e0');R(x+d*3,y-2,2,1,'#f0c020');R(x-1,y+1,2,2,'#30a0e0');return}
 if(it==='spray'){R(x-1,y-4,3,6,'#e0c020');R(x-1,y-5,3,1,'#2a2a2a');return}
 if(it==='light'){R(x-1,y-1,4,2,'#3a3a3a');return}
 return _dh(it,x,y,d)}}
SFX.bang=()=>{noise(.7,.55,160,1,'lowpass');tone(70,.5,'sawtooth',.14,28)};
async function bang(big){SFX.bang();shake(big?1.6:1);flash('#fff',big?.25:.12);prop({t:'bangfx',x:160,y:60,layer:999});await wait(500)}

/* ---------- LOCKDOWN ---------- */
mission('lockdown',{name:'Lockdown',icon:'🔒',who:['shermian','angelo','kayden','omer','marcus','arjun'],
 blurb:'On the Wednesdays, at the Period 3 bell, something gets into the school. Nobody sees it. Everybody hears it.',
 parts:['Period 3: lockdown'],
 tips:['It happens on Wednesday of each week (day 3 and day 10), at the Period 3 bell.','Run, fight, or hide. You won’t know what it is until the very end.'],
 variants:{woods:'Ran for the woods',fought:'Fought it',letgo:'Let it go',hid:'Hid'}});
Object.assign(DEATHS,{fence:{name:'Over the Fence',desc:'The top of the back fence is not decorative.',hint:'Lockdown. Run. Don’t be slow on the fence.'}});
function lockdownDue(){return !TEST&&D&&D.day>0&&D.day%3===0&&!D.f.lockdownDone}
const LOCKHOOK={mis:'lockdown',period:3,room:'library',who:'auto',cond:()=>false,run:async()=>{
 D.f.lockdownDone=1;
 const want=['shermian','arjun','angelo','kayden','omer','marcus','dheva','hasan','nivaan'],alive=want.filter(n=>!D.dead[n]);
 /* the corridor, between lessons */
 const cc={you:[160,1,{y:154}]};alive.forEach((n,i)=>cc[n]=[30+i*32,i%2?-1:1,{y:142+(i%3)*4}]);
 scene('corridor',cc,true);cue('class');
 await N('The bell for Period 3. The corridor is the usual river of backpacks. Somebody is eating a whole cucumber. Somebody is crying in a fun way.');
 await bang(true);
 for(const k in A)if(k!=='you'){A[k].ex='shock';face(k,-1)}
 await N('From somewhere further down the building: a BANG. Not a dropped-book bang. A bang you feel in your teeth.');
 await say('nivaan','…Chat, what was that.','scared');
 await bang(false);fxState.dark=.25;SFX.static();
 await say('adam','(on the PA, breathing hard) LOCKDOWN. LOCKDOWN. This is NOT a drill. There is an INTRUDER in the building. Get in a room. Lock the door. Lights off. Do NOT— (BANG) —oh my God it’s in the office— it’s in my— LOCKDOWN!','yell');
 cue('tension');
 for(const k in A)if(k!=='you')walk(k,-20,120+Math.random()*30);
 await walk('you',-20,110);
 /* the library */
 const lc={you:[150,1,{y:154}],shermian:[40,1,{y:146,hold:null}]};alive.filter(n=>n!=='shermian').forEach((n,i)=>lc[n]=[90+i*26,i%2?1:-1,{y:140+(i%4)*5,pose:i%3===0?'kneel':null}]);
 scene('library',lc,true);fxState.dark=.45;
 const bar=pprop({t:'barricade',x:-30,y:150,layer:10});
 if(A.shermian){hold('shermian',null);await walk('shermian',30,60);pose('shermian','grab');await tw(bar,{x:22},700);pose('shermian',null);face('shermian',1)}
 await N('Ms. Shermian drags a full bookshelf across the door. On her own. It weighs about four hundred pounds. She doesn’t even take her cardigan off.');
 if(A.shermian)await say('shermian','Lights off, sweeties. Nobody breathes unless Miss says breathe.','evil');
 fxState.dark=.6;
 await bang(false);
 await N('Silence. Then, out in the corridor: scratching. Low down. Something dragging itself along the lockers. Then a metal crash, like a trash can getting thrown.');
 const un=pprop({t:'under',x:-26,y:150,layer:-5});await tw(un,{x:20},1400);await tw(un,{x:-30},900);
 await N('A shadow passes under the door. It stops. It sniffs. You can hear it sniffing. Then it moves on.');
 if(A.hasan)await say('hasan','(whispering) It sniffed. Why did it SNIFF. People don’t sniff.','scared');
 if(A.arjun)await say('arjun','(whispering) Some people sniff. Kenneth sniffs.','angry');
 /* the contraband */
 await N('Then, very quietly, everybody starts unzipping their bags.');
 if(A.angelo){hold('angelo','machete');await say('angelo','(laying things out on a beanbag) Machete. Nunchucks. Brass knuckles, adult size, kid size. I sell them. I don’t USE them. Today I use them.','smirk')}
 if(A.omer){hold('omer','bat');await say('omer','(sliding an aluminum bat out of his gym bag) It’s for baseball.','angry');await say('you','You don’t play baseball.');await say('omer','I play baseball NOW.','angry')}
 if(A.marcus){hold('marcus','katana');await say('marcus','My uncle’s katana. He said never bring it to school. So I knew it was important.','smirk')}
 if(A.kayden){hold('kayden','straps');await say('kayden','Two straps. Water pistols. One’s got bleach in. I’m not saying which one. Even I don’t know which one.','smirk')}
 if(A.dheva){hold('dheva','spray');await say('dheva','Pepper spray. It’s for my hair. Don’t ask.','sad')}
 if(A.arjun){hold('arjun','scissors');await say('arjun','(holding up round-ended safety scissors) Shut up. SHUT UP. They were the only ones in the drawer.','angry')}
 if(A.shermian){hold('shermian','cleaver');await say('shermian','(taking a meat cleaver out of her handbag) Teachers are allowed, sweetie.','happy')}
 await bang(true);
 await N('BANG. Right outside. The door rattles in its frame. Something heavy hits the bookshelf, once, and books slide off the top.');
 const c=await choose([{t:'Run. Out the back window, over the field, into the woods.',tag:'run'},{t:'Fight. Arm up. Go and find it.',tag:'🩸'},{t:'Hide. Stay quiet. Wait.',tag:'hide'}],'It’s right outside.');
 if(c===0)return lockRun();
 if(c===1)return lockFight();
 return lockHide();
}};
HOOKS.push(LOCKHOOK);

async function reveal(x,y,food,line){
 fxState.dark=0;SFX.power();flash('#fff',.4);
 const r=pprop({t:'raccoon',x,y,dir:-1,food,layer:2});
 await wait(400);
 await N(line);
 return r;
}

async function lockRun(){
 await walk('you',300,90);
 await N('You climb out of the back window. Nobody follows you. Behind you, through the glass, you hear the bookshelf start to go.');
 scene('field',{you:[20,1,{y:150}]},true);cue('fight');
 await bang(false);
 await N('The field is empty. The whole school is in lockdown and you are running across the middle of the field like an idiot, in full view of every window.');
 await walk('you',290,120);
 const ok=await mash('Over the back fence!',{need:20,time:5,info:'The top of the fence is the pointy kind. MASH!'});
 if(!ok){
  SFX.squelch();blood(A.you.x,A.you.y-28,40,1,90,A.you.y+2);shake(1.2);
  await N('You get one leg over. The other one doesn’t. The pointy bit goes in just above the knee and comes out somewhere you didn’t know you had.');
  await N('You hang there for a long time. From up here you can see the whole school. Nothing comes out. Nothing ever comes out.');
  await die('fence');return;
 }
 scene('forest',{you:[20,1,{y:150}]},true);cue('sad');fxState.dark=.3;
 await walk('you',150,80);
 await N('The woods. You run until the school is just a roof through the trees. Your lungs are on fire. You sit down behind a log.');
 await N('It’s quiet out here. Birds. A plane. Your heartbeat, very loud.');
 const e=pprop({t:'eyes',x:236,y:116});
 await bang(false);
 await N('BANG. Right by the picnic table. The metal trash can goes over. Something is in the trash. Two little eyes in the dark under the bench, looking straight at you.');
 await say('you','(whispering) …Please. I have a family. I have a— I have a very small family.');
 e.hide=1;
 await reveal(236,128,1,'It steps into the light.');
 await N('It’s a raccoon. It’s holding a cinnamon roll from Fair City Mall in both hands like a steering wheel. It looks at you like YOU’RE the one who’s in the wrong place.');
 await say('you','…Was that you? Was the whole school… you?');
 await N('It takes a bite of the cinnamon roll, maintaining eye contact, and waddles back into the trees.');
 await say('adam','(very faint, from the school PA, across the field) …all clear… all clear… it was a… it was a RACCOON… Coach, put the javelin DOWN—','shock');
 await complete('lockdown','woods');
}

async function lockFight(){
 const fighters=['omer','angelo','marcus','kayden','shermian','arjun','hasan','dheva','nivaan'].filter(n=>A[n]);
 await N('Nobody votes. Everybody just stands up at once. Ms. Shermian pulls the bookshelf back like a curtain.');
 const cc={you:[60,1,{y:154}]};fighters.forEach((n,i)=>cc[n]=[20+i*14,1,{y:140+(i%3)*5,hold:A[n].hold}]);
 scene('corridor',cc,true);fxState.dark=.7;cue('fight');
 await N('The corridor lights are out. The only light is phone flashlights, swinging everywhere. Every locker is a person. Every person is a locker.');
 await bang(true);
 await N('BANG. Down the far end, by the cafeteria. A vending machine is lying on its face. Something is moving behind it. Fast. Low.');
 for(const n of fighters)walk(n,A[n].x+120,70);await walk('you',180,70);
 if(A.kayden&&A.hasan){pose('kayden','point');SFX.whoosh();await say('kayden','THERE IT IS— (fires)','yell');A.hasan.ex='shock';await say('hasan','IT’S ME. IT’S HASAN. WHY DOES IT SMELL LIKE A POOL. KAYDEN. WHICH ONE WAS THE BLEACH ONE.','yell');pose('kayden',null)}
 if(A.omer&&A.angelo){pose('omer','throw');SFX.crunch();shake(1);blood(A.angelo.x,A.angelo.y-26,30,null,80,A.angelo.y+2);A.angelo.hurt=3;A.angelo.ex='hurt';await N('Something moves behind Omer. He swings the bat without looking. It’s Angelo. It was always going to be Angelo.');await say('angelo','(holding his face together) I SELL YOU YOUR GUM, MAN.','hurt');pose('omer',null)}
 if(A.marcus){pose('marcus','throw');SFX.glass();flash('#fff',.5);await N('Marcus swings the katana at a noise and takes the top off a fire extinguisher. White powder everywhere. Now nobody can see anything at all.');pose('marcus',null)}
 fxState.dark=.8;
 if(A.shermian&&A.kayden){
  await N('In the white fog: a wet, short sound. Then Ms. Shermian’s voice, very calm.');
  kill('kayden','lie',{pool:40,bleed:4,spray:60});
  await say('shermian','Kayden ran at Miss. Kayden shouldn’t run in the corridor. I thought he was the intruder, sweeties.','happy');
  await say('shermian','(wiping the cleaver on her cardigan) I didn’t, but I thought it.','evil');
 }
 await bang(true);await bang(true);
 await N('BANG. BANG. The cafeteria. The big steel pots are coming off the shelves one at a time. Whatever it is, it is in the kitchen, and it is HUNGRY.');
 const left=Object.keys(A).filter(k=>k!=='you'&&!A[k].dead);
 const kc={you:[200,-1,{y:154}]};if(!D.dead.pat)kc.pat=[60,1,{y:140}];left.forEach((n,i)=>kc[n]=[210+i*12,-1,{y:142+(i%3)*5,hold:A[n].hold,hurt:A[n].hurt}]);
 scene('canteen',kc,true);fxState.dark=.75;
 const e=pprop({t:'eyes',x:96,y:96});
 await N('Behind the counter, in the dark, two little eyes catch the flashlights. Everybody raises everything they have.');
 await say('you','(whispering) On three. One… two…');
 e.hide=1;
 const r=await reveal(96,112,1,'Pat flips the cafeteria lights on.');
 await N('It’s a raccoon. It’s on the counter. It is holding a corn dog in both hands. It has knocked over eleven pots to get one corn dog. It is completely, perfectly calm.');
 await N('Everybody looks at each other. Everybody is covered in blood, bleach, and fire extinguisher. Most of the blood is from each other.');
 if(A.omer)await say('omer','…I hit Angelo for a RACCOON?','shock');
 if(A.arjun)await say('arjun','(lowering the safety scissors) Nobody is telling anyone about today. Ever.','angry');
 const c=await choose(['Fight it. It knows what it did.','Let it go. Open the fire exit.']);
 if(c===0){
  await N('You lunge. Everybody lunges. The raccoon doesn’t lunge. It doesn’t have to.');
  SFX.scream();shake(1.4);
  const vic=['omer','marcus','arjun','hasan','dheva','nivaan'].find(n=>A[n]&&!A[n].dead);
  if(vic){A[vic].pose='hurt';A[vic].hurt=3;blood(A[vic].x,A[vic].y-26,40,null,90,A[vic].y+2);await N('It goes for '+K[vic].n+'’s face first. It is a blur. It is mostly claws. '+K[vic].n+' screams a note nobody knew he could reach.')}
  if(A.marcus&&!A.marcus.dead){hold('marcus',null);await N('When it’s over, the raccoon is on top of the fridge, and it has the katana. Nobody knows how. It has the katana and the corn dog and it is looking at you.')}
  await tw(r,{x:-20},1400);
  await N('It drags the katana out of the fire exit like a little samurai going home. The door swings shut.');
  await complete('lockdown','fought');return;
 }
 await walk('you',40,70);SFX.door();
 await N('You prop the fire exit open. The raccoon looks at the door. Looks at you. Gets down off the counter, slowly, corn dog first, and waddles out into the sunshine.');
 await tw(r,{x:-20},2000);
 if(A.shermian&&!A.shermian.dead)await say('shermian','(putting the cleaver back in her handbag) Well! That was fun. Period 3 is cancelled, sweeties. Go and wash each other off.','happy');
 await complete('lockdown','letgo');
}

async function lockHide(){
 for(const k in A)if(k!=='you'&&!A[k].dead&&k!=='shermian')A[k].pose='kneel';pose('you','kneel');
 await N('You get down behind the reading beanbags. Everyone does. Ms. Shermian stands facing the door with the cleaver held behind her back, smiling at it.');
 await bang(false);
 await N('Twenty minutes. Thirty. The scratching comes back three times. Every time, it stops right outside the door. Every time, it sniffs.');
 if(A.arjun){await say('arjun','(not whispering enough) If it gets in, I’m pushing Nivaan at it. He’s the smallest. It’ll be full.','angry');if(A.nivaan)await say('nivaan','(whispering) Chat heard that. Chat’s got it saved.','angry')}
 await bang(true);
 const bar=props.find(p=>p.t==='barricade');
 await N('The door handle turns. Very slowly. Something on the other side is turning it.');
 if(bar&&A.dheva){
  SFX.crunch();shake(1.6);await tw(bar,{x:A.dheva.x},300,'in');bar.hide=1;
  kill('dheva','crush',{pool:36,bleed:3,spray:50});
  await N('The bookshelf comes down. It doesn’t fall towards the door. It falls the other way. Onto Dheva. Four hundred pounds of books, mostly about the Tudors.');
  await say('shermian','(not even looking round) Library books are heavy, sweeties. That’s why we RESPECT them.','happy');
 }
 await N('The handle stops turning. Something scampers away down the corridor. Then nothing. Nothing for a long time.');
 fxState.dark=.2;
 await say('adam','(on the PA, exhausted) All clear. All… clear. The intruder has been… detained. By Coach. With his bare hands.','sad');
 SFX.door();
 const r=pprop({t:'raccoon',x:-10,y:118,dir:1,still:1,layer:4});
 put('coach',-18,1,{y:150});await walk('coach',30,60);
 r.x=36;r.y=122;fxState.dark=0;SFX.power();flash('#fff',.3);
 await N('Coach walks past the library door with it in a headlock. It’s a raccoon. It’s a raccoon. The whole school was locked down for an hour and a half because of a raccoon.');
 await say('coach','(to the raccoon) Good HUSTLE. Good effort. You’d make the team.','smirk');
 await N('Coach and the raccoon go off down the corridor together. Nobody moves for a while. Then everybody, very quietly, puts their weapons back in their bags.');
 for(const k in A)if(k!=='you'&&A[k]&&!A[k].dead){A[k].pose=null;A[k].hold=null}
 pose('you',null);
 await complete('lockdown','hid');
}

/* ---------- the woods, drawn properly (static layers cached once) ---------- */
{
 const LEAF={far:['#5d7a70','#68857a','#74907f','#82a08a'],mid:['#22392a','#2c4a32','#3a5e3a','#4c7444'],near:['#16281a','#203a22','#2f5a2c','#4a7e3a'],sun:['#2a4a26','#3e6a32','#5e8e40','#94b858']};
 function blob(cx,cy,rx,ry,cols,seed){for(let y=-ry;y<=ry;y+=2)for(let x=-rx;x<=rx;x+=2){const d=x*x/(rx*rx)+y*y/(ry*ry),n=hsh(seed+x*3.1+y*7.7);if(d>1-n*.4)continue;const l=(-x/rx*.4-y/ry*.7)+n*.55;R(cx+x,cy+y,2,2,l>.75?cols[3]:l>.3?cols[2]:l>-.2?cols[1]:cols[0])}}
 function trunk(x,w,top,bot,seed,c){c=c||['#2a1e16','#3e2e22','#56422e','#6a5238'];
  R(x,top,w,bot-top,c[1]);R(x,top,Math.max(1,w>>2),bot-top,c[2]);R(x+1,top,1,bot-top,c[3]);R(x+w-Math.max(1,w>>2),top,Math.max(1,w>>2),bot-top,c[0]);
  for(let i=0;i<(bot-top)/5;i++){const yy=top+i*5+hsh(seed+i)*4,xx=x+1+hsh(seed+i*2)*(w-2);R(xx,yy,1,3+hsh(seed+i*3)*4,c[0])}
  for(let i=0;i<3;i++){const yy=top+hsh(seed+40+i)*(bot-top-10);R(x,yy,Math.ceil(w*.4),4+i,'#4a6a30');R(x,yy,1,3,'#6a8a40')}
  R(x-3,bot-5,w+6,5,c[1]);R(x-5,bot-2,w+10,2,c[1]);R(x-5,bot-2,3,2,c[0]);R(x+w+2,bot-2,3,2,c[0]);R(x-3,bot-5,2,3,c[2]);R(x,bot,w,1,'rgba(0,0,0,.35)');R(x-6,bot+1,w+12,2,'rgba(0,0,0,.25)')}
 function fern(x,y,s,cols){for(let a=-3;a<=3;a++){const len=(10-Math.abs(a)*1.6)*s;for(let i=0;i<len;i++){const fx=x+a*i*.55,fy=y-i*(1-Math.abs(a)*.12)+(i*i)/(len*1.6)*Math.abs(a)*.6;R(fx,fy,1,1,i%3?cols[1]:cols[2]);if(i%2&&i<len-2){R(fx-1,fy+1,1,1,cols[0]);R(fx+1,fy+1,1,1,cols[0])}}}}
 function shroom(x,y,c){R(x,y-3,1,3,'#e8dcc8');R(x-2,y-5,5,2,c);R(x-1,y-6,3,1,c);R(x-1,y-5,1,1,'#fff')}
 function drawStatic(){
  for(let y=0;y<112;y++){const t=y/112;R(0,y,W,1,`rgb(${Math.round(176-t*60)},${Math.round(204-t*56)},${Math.round(184-t*60)})`)}
  for(let i=0;i<26;i++){const x=hsh(i+300)*W,w=2+hsh(i+310)*3;R(x,10,w,100,'#7d9890');R(x,10,1,100,'#8aa49a')}
  for(let i=0;i<14;i++)blob(hsh(i+320)*W,8+hsh(i+330)*30,18+hsh(i)*10,10+hsh(i+1)*6,LEAF.far,i*13);
  g.globalAlpha=.3;R(0,40,W,72,'#c8dcd0');g.globalAlpha=1;
  for(let i=0;i<11;i++){const x=i*31+hsh(i+350)*14-6,w=4+hsh(i+360)*4;trunk(x,w,16,112,i*7,['#28322a','#34423a','#46564a','#52624f']);blob(x+w/2,14+hsh(i+370)*10,16,9,LEAF.mid,i*29)}
  g.globalAlpha=.14;R(0,60,W,52,'#c8dcd0');g.globalAlpha=1;
  /* forest floor */
  for(let y=104;y<H;y++){const t=(y-104)/76;R(0,y,W,1,`rgb(${Math.round(70-t*22)},${Math.round(78-t*26)},${Math.round(40-t*14)})`)}
  for(let i=0;i<70;i++){const x=hsh(i+400)*W,y=106+hsh(i+410)*70;R(x,y,3+hsh(i)*6,1,'#566a2e')}
  /* creek, back right */
  for(let y=106;y<116;y++){const x0=230+(y-106)*2.4;R(x0,y,W-x0,1,y<108?'#8aa8a8':'#5a7a86')}R(226,105,W,1,'#3a4a2a');R(230,116,W,1,'#5a4a32');
  for(let i=0;i<8;i++)R(240+i*10,112+(i%2),4,2,'#6a6a62');
  /* the side trail going back into the trees */
  for(let y=112;y<140;y++){const t=(y-112)/28,cx=200-t*24,w=6+t*34;R(cx-w/2,y,w,1,t<.15?'#6a5a40':'#74603f');if(y%3===0){R(cx-w/2,y,1,1,'#4e3e28');R(cx+w/2-1,y,1,1,'#4e3e28')}}
  /* the main trail */
  for(let y=136;y<164;y++){const wob=Math.sin(y*.35)*2;R(0,y,W,1,y<139||y>160?'#5c4a32':'#7a6544');R(0,y,W,1,'rgba(0,0,0,0)')}
  for(let x=0;x<W;x+=1){const e1=136+Math.round(Math.sin(x*.07)*2+hsh(x)*1.5),e2=161+Math.round(Math.sin(x*.05+2)*2+hsh(x+9)*1.5);R(x,e1-3,1,4,'#4c5a28');R(x,e1,1,1,'#5c4a32');R(x,e2,1,1,'#5c4a32');R(x,e2+1,1,3,'#3e4a22')}
  for(let i=0;i<120;i++){const x=hsh(i+500)*W,y=140+hsh(i+510)*20;R(x,y,hsh(i+520)<.3?2:1,1,hsh(i+530)<.5?'#8a7454':'#5a4830')}
  for(let i=0;i<14;i++){const x=hsh(i+540)*W,y=142+hsh(i+550)*16;R(x,y,3,2,'#8a8a80');R(x,y,2,1,'#a8a8a0')}
  R(0,148,W,1,'rgba(90,70,40,.35)');R(0,153,W,1,'rgba(90,70,40,.35)');
  /* fallen mossy log, back left */
  R(14,124,74,9,'#4a3626');R(14,124,74,2,'#5e4630');R(14,131,74,2,'#2e2018');for(let i=0;i<9;i++)R(18+i*8,125,4,1,'#3a2a1e');
  R(10,123,8,11,'#6a5238');R(12,125,4,7,'#8a6e4a');R(13,127,2,3,'#6a5238');
  for(let i=0;i<10;i++)R(20+i*7,122+(i%2),6,3,i%3?'#4e7a32':'#6a9a3a');shroom(40,124,'#c03028');shroom(46,124,'#c03028');shroom(70,124,'#d8a040');
  /* picnic area: table, can, sign tree */
  R(222,118,46,3,'#7a5a3a');R(222,118,46,1,'#9a7650');R(224,121,2,9,'#5a402a');R(264,121,2,9,'#5a402a');R(218,124,54,2,'#6a4c30');R(218,124,54,1,'#86643e');R(220,126,2,4,'#4a3422');R(268,126,2,4,'#4a3422');R(222,130,46,1,'rgba(0,0,0,.3)');
  R(274,112,11,16,'#2e5a3a');R(274,112,11,2,'#4a7a54');R(275,115,1,12,'#447050');R(283,115,1,12,'#1e4028');for(let i=0;i<3;i++)R(274,117+i*4,11,1,'#244a30');R(273,111,13,2,'#3a6a48');R(274,128,11,1,'rgba(0,0,0,.35)');
  /* the big near trees */
  const near=[[2,13],[96,9],[150,7],[296,15]];
  for(const [i,[x,w]] of near.entries())trunk(x,w,0,134+(i%2)*2,i*31+5);
  R(270,64,27,15,'#8a6a44');R(270,64,27,1,'#a88858');R(270,78,27,1,'#5a4428');R(272,66,1,1,'#ccc');R(294,66,1,1,'#ccc');
  px('BEAR',275,66,'#2a1e14');px('PROOF',273,72,'#2a1e14');R(274,68,16,1,'#a02020');px('?',292,72,'#a02020');
  /* canopy band across the top */
  for(let i=0;i<16;i++)blob(i*22+hsh(i+600)*10-6,6+hsh(i+610)*14,20,12,i%4===1?LEAF.sun:LEAF.near,i*41);
  for(let i=0;i<9;i++){const x=hsh(i+620)*W,l=18+hsh(i+630)*30;for(let y=10;y<10+l;y+=2)R(x+Math.sin(y*.3)*1.5,y,1,2,y%6?'#2e5a2c':'#4a7e3a')}
  /* ferns and undergrowth along the trail */
  const F=[['#1e3a1e','#2e5a2a','#4a7a36']];
  for(let i=0;i<12;i++){const x=hsh(i+700)*W,y=136+hsh(i+710)*2;fern(x,y,.9+hsh(i+720)*.5,F[0])}
  for(let i=0;i<6;i++)shroom(hsh(i+730)*W,136,i%2?'#c03028':'#d8b060');
  for(let i=0;i<60;i++){const x=hsh(i+800)*W,y=164+hsh(i+810)*15;R(x,y,2,1,['#8a4a2a','#a86a2a','#6a3a1a','#7a6a2a'][i%4])}
 }
 let cache=null;
 ROOMS.forest.bg=function(){
  if(!cache){const c=document.createElement('canvas');c.width=W;c.height=H;const og=g;g=c.getContext('2d');g.imageSmoothingEnabled=false;try{drawStatic()}finally{g=og}cache=c}
  g.drawImage(cache,0,0);
  /* light shafts, dust, creek glints, falling leaves */
  g.globalAlpha=.06;for(const [x0,w] of[[70,14],[178,10],[250,18]])for(let i=0;i<60;i++)R(x0-i*.9,20+i*2,w+i*.5,2,'#fff6c8');g.globalAlpha=1;
  for(let i=0;i<10;i++){const q=(T*.05+i/10)%1;g.globalAlpha=.5*Math.sin(q*Math.PI);R(70+hsh(i)*30-q*30,30+q*100,1,1,'#fff8d8');g.globalAlpha=1}
  for(let i=0;i<6;i++){if(Math.sin(T*3+i*2)>.6)R(240+i*13+Math.sin(T+i)*3,109+(i%3)*2,3,1,'#d8f0f0')}
  for(let i=0;i<7;i++){const q=(T*.12+i/7)%1,x=(hsh(i+900)*W+Math.sin(T*1.5+i)*8+q*40)%W;R(x,q*170,2,1,['#c8782a','#a85a22','#d8a040'][i%3])}
  if(D&&D.period>=7)for(let i=0;i<10;i++){if(Math.sin(T*2+i*1.7)>.2){g.globalAlpha=.8;R(hsh(i+950)*W+Math.sin(T*.7+i)*10,100+hsh(i+960)*50+Math.cos(T*.9+i)*6,1,1,'#f0f080');g.globalAlpha=1}}
 };
 ROOMS.forest.items=[
  {y:179,d:()=>{fern(8,180,1.6,['#0e1e10','#1a3018','#2a4a24']);fern(26,182,1.2,['#0e1e10','#1a3018','#2a4a24'])}},
  {y:179,d:()=>{fern(306,181,1.7,['#0e1e10','#1a3018','#2a4a24']);fern(288,183,1.1,['#0e1e10','#1a3018','#2a4a24'])}}
 ];
}
