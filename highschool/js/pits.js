'use strict';
/* =====================================================================
   HIGHSCHOOL — PITS (Aidan's deodorant), the Infected Choir,
   and Darren, rebuilt to be a lot more chaotic.
   ===================================================================== */
Object.assign(K,{
 fema1:{n:'FEMA Agent',col:'#c8a020',skin:'#e0c0a0',hair:'#e8d040',hs:'net',top:'#e8d040',pants:'#e8d040',gasmask:1,adult:1,wide:1,seed:97,v:150,vw:'sawtooth'},
 fema2:{n:'FEMA Lead',col:'#c8a020',skin:'#c89060',hair:'#e8d040',hs:'net',top:'#d8c030',pants:'#d8c030',gasmask:1,adult:1,wide:1,seed:98,v:130,vw:'sawtooth'}
});
{const dh=drawHead;drawHead=function(k,x,hy,d,o){dh(k,x,hy,d,o);if(k.gasmask){const hx=x-6;R(hx,hy+2,12,8,'#3a3a3a');R(hx+1,hy+3,4,3,'#7ab8c8');R(hx+7,hy+3,4,3,'#7ab8c8');R(hx+1,hy+3,4,1,'#c8f0ff');R(hx+7,hy+3,4,1,'#c8f0ff');R(x-2+d,hy+8,5,4,'#2a2a2a');R(x-1+d,hy+9,3,2,'#555')}
 if(!k.gasmask&&!(o&&o.ex==='dead')&&typeof D!=='undefined'&&D&&D.f&&D.f.infected&&D.f.infected.includes(k.id)){g.globalAlpha=.32;R(x-6,hy+1,12,9,'#5ab030');g.globalAlpha=1;R(x-4,hy+8,1,2,'#3a8a20')}}}
for(const id in K)K[id].id=id;
/* infected kids get a green tint in their faces automatically */
const pprop=o=>{prop(o);return props[props.length-1]};
{const _dh=drawHeld;drawHeld=function(it,x,y,d){if(it==='can'){R(x-2,y-6,4,8,'#3ab8a8');R(x-2,y-6,4,1,'#c8c8c8');R(x-1,y-8,2,2,'#888');R(x-2,y-3,4,2,'#f0f0f0');return}if(it==='bonesaw'){R(x-1,y-1,3,4,'#3a3a3a');R(x-8,y-6,14,4,'#d0d4d8');for(let i=0;i<14;i+=2)R(x-8+i,y-2,1,1,'#888');return}return _dh(it,x,y,d)}}
{const _dp=drawProp;drawProp=function(p){const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='stink'){const f=p.follow&&A[p.follow];if(f){p.x=f.x;p.y=f.y}if(!f)return;for(let i=0;i<5;i++){const q=(T*.7+i/5)%1;g.globalAlpha=(1-q)*.7;const sx=Math.round(f.x+(i-2)*3+Math.sin(T*3+i)*2),sy=Math.round(f.y-30-q*22);R(sx,sy,1,3,'#7ad040');R(sx+1,sy-3,1,3,'#7ad040');g.globalAlpha=1}return}
 if(p.t==='cloud'){const r=Math.round(p.r||10);for(let yy=-r;yy<=r;yy+=2)for(let xx=-r*1.6;xx<=r*1.6;xx+=2){if(xx*xx/2.56+yy*yy<r*r&&hsh(xx*7+yy*13+Math.floor(T*6))>.35){g.globalAlpha=.55;R(x+xx,y+yy,2,2,(xx+yy)%4?'#7ad040':'#a8f060');g.globalAlpha=1}}return}
 if(p.t==='van'){R(x,y-26,70,26,'#1a1a22');R(x+2,y-24,22,10,'#3a5a7a');R(x+50,y-22,18,8,'#3a5a7a');px('FEMA',x+28,y-14,'#f0f0f0');R(x+6,y-2,10,6,'#0a0a0a');R(x+54,y-2,10,6,'#0a0a0a');if(Math.sin(T*10)>0){R(x+30,y-28,4,2,'#ff3030')}else R(x+36,y-28,4,2,'#3060ff');return}
 if(p.t==='drone'){R(x-5,y,10,3,'#2a2a2a');R(x-9,y-1,4,1,'#888');R(x+5,y-1,4,1,'#888');if(Math.sin(T*40)>0){R(x-10,y-2,6,1,'#ccc');R(x+4,y-2,6,1,'#ccc')}if(p.banner){R(x+10,y+2,1,1,'#555');R(x+11,y,34,8,'#f4f0e6');px('HASAN?',x+13,y+2,'#c02040')}return}
 return _dp(p)}}

/* =================================================================
   PITS — Aidan’s deodorant
   ================================================================= */
mission('pits',{name:'Pits',icon:'🦨',who:['aidan','hasan','nivaan','kenneth'],
 blurb:'Aidan found a can of 1987 “Fresh’n’Free” deodorant in lost property and used all of it. On himself. At once.',
 parts:['Before school: the can','Break: Aidan points at something'],
 tips:['Before school, bus loop. Aidan’s holding a can you’ve never seen in a shop.','Break, main corridor. Whatever happens, don’t stand under the vent.'],
 variants:{fema:'FEMA removed the source',escape:'You got Aidan out'}});
hook({mis:'pits',period:0,room:'bus',who:'aidan',label:'Ask Aidan what’s in the can',look:{hold:'can',ex:'smirk',pose:null},cond:()=>!D.f.pits1&&!D.f.aidanDead,run:async()=>{
 scene('bus',{aidan:[256,-1,{y:140,hold:'can'}],you:[232,1,{y:150}]});
 await say('aidan','Lost property. The box at the very bottom. “Fresh’n’Free. Limited edition. 1987.” It was still cold.','smirk');
 await say('you','Aidan, don’t—');
 pose('aidan','up');SFX.static();
 for(let i=0;i<40;i++)parts.push({x:A.aidan.x+rand(-8,8),y:A.aidan.y-rand(10,34),vx:rand(-20,20),vy:rand(-30,10),c:i%2?'#a8f060':'#e8f8d8',s:2,fy:A.aidan.y+2,life:1.2});
 await N('Under one arm. The other. All over. His hair. Then the last of the can up his sleeves, like he’s refilling them.');
 pose('aidan',null);hold('aidan',null);
 prop({t:'stink',follow:'aidan',x:0,y:0,dress:0});
 await N('It smells like the inside of a pumpkin that someone has been living in.');
 await say('aidan','(sniffing his own wrist) Fresh.','happy');
 await say('you','…You smell like a pond.');
 await say('aidan','I smell like 1987.','smirk');
 D.f.pits1=1;part('pits',1);
}});
hook({mis:'pits',period:2,room:'corridor',who:'aidan',label:'Ask Aidan why everyone’s walking away from him',look:{ex:'smirk'},cond:()=>D.f.pits1&&!D.f.aidanDead&&!D.f.pits2,run:async()=>{
 const cast={aidan:[150,-1,{y:140}],you:[178,-1,{y:150}]};for(const [n,x] of[['hasan',80],['nivaan',120],['kenneth',220],['arjun',60],['jacob',250],['paul',282]])if(!D.dead[n])cast[n]=[x,x<150?1:-1,{y:146}];
 scene('corridor',cast);prop({t:'stink',follow:'aidan',x:0,y:0});
 cue('tension');
 for(const k of Object.keys(A))if(k!=='aidan'&&k!=='you'){A[k].pose='cover';A[k].ex='scared'}
 await N('Hands over noses all down the corridor. A seventh grader has passed out against a locker. Nobody moves him. They’d have to breathe in.');
 await say('aidan','I don’t know why everyone keeps walking away. Look — look at the trophy cabinet. 1987. There’s a boy in the back row.','smirk');
 pose('aidan','point');SFX.whoosh();shake(.6);
 const cl=pprop({t:'cloud',x:A.aidan.x-6,y:A.aidan.y-26,r:6,layer:40});
 await tw(cl,{r:22},900);
 await N('He lifts his arm. The smell comes out of his armpit like it’s been waiting thirty-nine years for the door to open.');
 for(const k of Object.keys(A))if(k!=='aidan'&&k!=='you'){SFX.gasp();A[k].ex='shock';A[k].shake=1}
 if(A.hasan)await say('hasan','IT’S IN MY MOUTH. IT’S IN MY MOUTH AND I’M NOT EVEN OPENING MY MOUTH.','yell');
 if(A.arjun)await say('arjun','(gagging) It smells like your personality finally got out, Aidan.','angry');
 await tw(cl,{x:115,y:18},800);
 await N('The cloud goes straight up into the ceiling vent. You hear it travel. The vent goes to every room in the school.');
 SFX.bell();SFX.bell();fxState.red=.5;
 await say('adam','(on the PA, choking) THIS— is not a drill— this is a SMELL— evacuate— EVACUATE—','yell');
 D.f.infected=['hasan','nivaan','kenneth'].filter(n=>!D.dead[n]);
 for(const k of Object.keys(A))if(k!=='you'){A[k].shake=0;A[k].pose=null;walk(k,k==='aidan'?-16:(A[k].x<160?-16:336),130)}
 await wait(1200);
 /* the field: the whole school, FEMA */
 const fcast={aidan:[150,1,{y:150}],you:[180,-1,{y:154}],fema2:[260,-1,{y:146}],fema1:[290,-1,{y:150}]};
 for(const [n,x] of[['hasan',40],['nivaan',62],['kenneth',84],['arjun',106],['omer',206],['david',226]])if(!D.dead[n])fcast[n]=[x,1,{y:142}];
 scene('field',fcast,true);crowd={n:12,cheer:false,phones:true,front:4};fxState.red=0;
 prop({t:'van',x:236,y:122,layer:-40});prop({t:'stink',follow:'aidan',x:0,y:0});cue('evil');
 await N('Twenty minutes later the entire school is standing on the field. Two black vans have driven straight over the running track. People in yellow suits and gas masks are getting out.');
 await say('fema2','(through the mask) Federal Emergency Management. Nobody move. Who is patient zero?','angry');
 for(const n of['hasan','nivaan','kenneth','arjun','omer','david'])if(A[n]){A[n].pose='point';face(n,'aidan')}
 await N('Every single finger in the school points at Aidan. Even the teachers. Even Mrs. Loach, who looks up from her grading for the first time this year to do it.');
 for(const n of['hasan','nivaan','kenneth'])if(A[n]){A[n].pose='hurt';A[n].ex='hurt'}
 if(A.nivaan)await say('nivaan','(coughing green) Chat… I think I’m infected… my skin’s doing a thing… LIKE AND SUBSCRIBE—','scared');
 await say('aidan','(arm still half up) It’s just deodorant.','sad');
 await say('fema2','It’s not deodorant, son. It hasn’t been deodorant since 1987.','angry');
 const c=await choose(['Stand in front of Aidan.','“It’s his armpits. Do what you have to do.”','Grab Aidan and run for the fence.']);
 if(c===2){
  await walk('you',160,140);pose('you','grab');
  const ok=await mash('Drag Aidan to the fence!',{need:20,time:5,info:'He weighs nothing and smells like everything. MASH!'});
  pose('you',null);
  if(ok){await Promise.all([walk('aidan',-16,140),walk('you',-10,140)]);await N('You get him over the fence and into the hedge behind the houses. The vans can’t follow. He sits in the hedge and lowers his arms, very slowly, like a man putting down a bomb.');await say('aidan','(from the hedge) Thank you. Nobody’s ever smelled this bad for me before.','happy');await complete('pits','escape');return}
 }
 if(c===0){await walk('you',166,90);face('you',1);pose('you','hips');await say('you','He’s not a disease. He’s just Aidan.');await say('fema2','Step aside, kid, or you’re coming in the van too.','angry');A.you.pose=null;await tw(A.you,{x:200},300)}
 hold('fema1','bonesaw');await walk('fema1',A.aidan.x+12,70);face('fema1',-1);
 await say('fema2','Remove the source.','angry');
 cue('fight');pose('fema1','saw');A.aidan.ex='scared';
 for(let i=0;i<4;i++){SFX.squelch();blood(A.aidan.x+4,A.aidan.y-20,24,1,90,A.aidan.y+2);shake(.6);await wait(260)}
 SFX.scream();
 await N('They take his arms off at the pits. It isn’t quick. Bloodiest thing that’s ever happened on this field, and Coach has run javelin practice here for nineteen years.');
 kill('aidan','lie',{pool:46,bleed:5,spray:60});pose('fema1',null);
 await say('fema2','Source neutralized. Bag it. Bag the arms separately.','angry');
 await N('The smell lifts, slowly, like weather. Hasan, Nivaan and Kenneth are still green. They’re humming something. All three of them. The same tune. None of them know it.');
 await say('hasan','(humming, eyes unfocused) …lift your arms… lift them high…','closed');
 await say('kenneth','(humming) …smell the Friday… watch it die…','closed');
 D.f.choir=1;D.f.aidanDead=1;P.killedAidan=1;save();
 await N('The Infected Choir has formed. They’ll sing for the rest of the day. Whatever you point them at.');
 await complete('pits','fema');
}});

/* =================================================================
   DARREN — rebuilt, much more chaotic
   ================================================================= */
for(let i=HOOKS.length-1;i>=0;i--)if(HOOKS[i].mis==='darren'&&(HOOKS[i].period===2||HOOKS[i].period===4))HOOKS.splice(i,1);
Object.assign(MIS.darren,{variants:{friends:'Friends',shake:'A milkshake',choirlove:'The love song',javelin:'The javelin',choir:'The Pit Song'},
 parts:['Before school: the note','Break, cafeteria: step five','Lunch, the field: step nine'],
 tips:['Before school, bus loop. Hasan’s holding something.','Break, cafeteria. Stay near Hasan. Duck.','Lunch, cafeteria. Hasan’s been summoned to the field. If the Infected Choir exists today, bring it.']});
hook({mis:'darren',period:2,room:'canteen',who:'hasan',label:'Get in the lunch line with Hasan',look:{ex:'scared'},cond:()=>D.f.dar1&&!D.f.dar2,run:async()=>{
 scene('canteen',{pat:[90,1,{y:140}],hasan:[150,-1,{y:146}],you:[176,-1,{y:150}]});cue('canteen');
 await walk('hasan',112,50);
 await say('pat','(sliding a tray over without looking) Special order, love.','smirk');
 hold('hasan','tray');prop({t:'chips',x:112,y:118,layer:30});
 await N('His fries have been laid out one by one to spell HASAN. The ketchup is a heart. The heart has a ketchup arrow through it. The arrow has a ketchup feather.');
 await say('hasan','Pat. Who did this. PAT.','shock');
 await say('pat','He paid in cash and in respect.','smirk');
 SFX.whistle();
 for(const [n,x] of[['kid1',40],['kid2',70],['kid3',230],['kid4',260]]){put(n,x<160?-14:334,x<160?1:-1,{y:150});walk(n,x,120)}
 await wait(500);
 for(const n of['kid1','kid2','kid3','kid4'])if(A[n]){A[n].pose='swim';hop(n,10,500)}
 await N('The swim team bursts in, goggles on, and does synchronized swimming across the cafeteria tables. In silence. On top of people’s lunches.');
 await say('pat','NOT ON MY TABLES—','yell');
 put('darren',334,-1,{y:150});
 await walk('darren',170,140);A.darren.z=0;hop('darren',6,300);
 await N('A boy in prescription goggles slides the full length of the table on a lunch tray and stops exactly in front of Hasan. He practiced the stop. You can tell.');
 await say('darren','Hi. Darren. Swim team. Step five: the entrance. Eighth grade, the pool — you went into the deep end for my goggles when nobody else would.','love');
 await say('hasan','I don’t SWIM. I just didn’t want you to lose your goggles—','shock');
 await say('darren','Exactly. EXACTLY. There are eleven steps. This is five. Nine is at lunch.','love');
 props=props.filter(p=>p.t!=='chips');hold('hasan',null);
 await walk('hasan',-16,140);remove('hasan');
 for(const n of['kid1','kid2','kid3','kid4'])if(A[n]){A[n].pose=null;remove(n)}
 await say('darren','(calmly) He’s gone to the bathroom. That’s step six. It’s going perfectly.','happy');
 D.f.dar2=1;part('darren',2);
}});
hook({mis:'darren',period:4,room:'canteen',who:'hasan',label:'Ask Hasan why he’s staring at his phone',look:{pose:'phone',ex:'shock'},cond:()=>D.f.dar2&&!D.done.darren,run:async()=>{
 scene('canteen',{hasan:[176,1,{y:146,pose:'phone',ex:'shock'}],you:[150,1,{y:152}]});
 await say('hasan','He’s texted. “Field. Now. Step nine.” I don’t know what step nine is. I don’t know what any of the steps are. I’m scared of step eleven.','scared');
 const cast={hasan:[60,1,{y:150}],you:[40,1,{y:154}],darren:[150,-1,{y:146}],kid1:[180,-1,{y:146}],kid2:[200,-1,{y:146}],kid3:[220,-1,{y:146}],kid4:[240,-1,{y:146}],coach:[300,-1,{y:140,hold:'javelin'}]};
 if(!D.dead.arjun)cast.arjun=[120,1,{y:156,pose:'cross'}];
 if(D.f.choir)for(const [n,x] of[['nivaan',14],['kenneth',26]])if(!D.dead[n])cast[n]=[x,1,{y:146}];
 scene('field',cast,true);cue('field');
 const letters=['H','A','S','A','N','?'],signs=letters.map((s,i)=>pprop({t:'sign',s,x:150+i*20,y:130,layer:20}));
 for(const k of['kid1','kid2','kid3','kid4','darren'])pose(k,'up');
 const dr=pprop({t:'drone',x:340,y:30,banner:1});SFX.static();await tw(dr,{x:150},1600);
 await N('Step nine: the whole swim team holding letters that spell HASAN, and Darren at the end with a question mark. Subtle was step eight.');
 await say('darren','(shouting) DO YOU WANT TO GET A MILKSHAKE! AS A THING! OR NOT AS A THING! THE QUESTION MARK COVERS BOTH!','love');
 await say('coach','INCOMING AIRCRAFT. JAVELIN PRACTICE.','yell');
 SFX.whoosh();const j=pprop({t:'javelin',x:300,y:100,rot:-.5});await tw(j,{x:dr.x,y:dr.y},300,'in');j.hide=1;
 SFX.glass();shake(1);await Promise.all([tw(dr,{y:150,x:A.arjun?A.arjun.x:120},500,'in')]);dr.hide=1;
 if(A.arjun){SFX.crunch();A.arjun.hurt=3;blood(A.arjun.x,A.arjun.y-24,40,1,90,A.arjun.y+2);A.arjun.pose='lie';await say('arjun','(under a drone) WHY IS IT ALWAYS ME. I DIDN’T EVEN SAY ANYTHING YET.','hurt')}
 signs[5].hide=1;
 await N('The banner flutters down over Arjun like a little flag on a grave. It still says HASAN?');
 face('hasan',-1);
 await say('hasan','(to you, shaking) Everyone’s looking at me. Everyone. Even the drone. Especially the drone.','scared');
 const o=[{t:'Say yes. A milkshake. See where it goes.'},{t:'Let him down gently. Stay friends.'},{t:'Grab Coach’s javelin.',tag:'🩸'}];
 if(D.f.choir){o.push({t:'Infected Choir: sing Darren the Pit Song.',tag:'🦨'});o.push({t:'Infected Choir: sing Darren a love song.',tag:'💚'})}
 const c=await choose(o,'Hasan, it’s your call.');
 await walk('hasan',140,60);face('hasan',1);
 if(c===0){
  await say('hasan','A milkshake. As… let’s just see what it is. Nobody has ever done eleven steps for me. Nobody’s done ONE step.','love');
  await say('darren','(throwing the question mark into the air) STRAWBERRY. I mean, whatever flavor. I mean STRAWBERRY.','love');
  for(const k of['kid1','kid2','kid3','kid4'])pose(k,'cheer');SFX.cheer();D.f.darShake=1;
  await N('The swim team cannonballs into absolutely nothing, all at once, on the grass. It still makes a splash sound, somehow.');
 }else if(c===1){
  await say('hasan','Darren. That’s the nicest thing anyone’s ever done for me. I mean it. I just don’t feel like that. Can we be friends? Proper— real friends?','sad');
  await say('darren','(nodding very fast, crying a bit) Yes. Yes. Step ten was always “be okay”. I’m doing step ten.','happy');
 }else if(c===2){
  await N('Hasan panics. He grabs the javelin out of Coach’s hand, because it’s the nearest thing, and because he has had the most stressful day of his life.');
  await walk('hasan',280,160);hold('hasan','javelin');pose('hasan','throw');await wait(200);hold('hasan',null);
  SFX.whoosh();const j2=pprop({t:'javelin',x:270,y:118,rot:Math.PI});await tw(j2,{x:A.darren.x,y:A.darren.y-20},280,'in');j2.hide=1;
  SFX.squelch();shake(1.4);flash('#a00010',.5);
  A.darren.dead='impale';A.darren.pose='lie';A.darren.pool=0;A.darren.poolMax=40;A.darren.bleed=4;D.dead.darren=1;blood(A.darren.x,A.darren.y-20,60,-1,120,A.darren.y+2);
  await say('coach','…Two hundred and seventy feet. School record.','shock');
  await say('hasan','I PANICKED. HE HAD ELEVEN STEPS. I HAD ONE. I HAD ONE STEP AND IT WAS A JAVELIN.','yell');
  await N('Darren’s goggles roll off his forehead and come to rest on the grass, facing Hasan. Lucky goggles. Prescription. Not lucky.');
  await complete('darren','javelin');return;
 }else if(c===3){
  for(const n of['nivaan','kenneth'])if(A[n]){walk(n,A.hasan.x-20-(n==='kenneth'?14:0),90)}
  await say('hasan','(very quietly, not sure where it came from) …Choir.','closed');
  cue('evil');fxState.red=.6;
  for(const n of['hasan','nivaan','kenneth'])if(A[n]){A[n].ex='yell';A[n].pose='sing'}
  await say('hasan','♪ LIFT YOUR ARMS AND LIFT THEM HIGH ♪','yell');
  await say('nivaan','♪ SMELL THE FRIDAY, WATCH IT DIE ♪','yell');
  await say('kenneth','♪ NINETEEN-EIGHTY-SEVEN STINK ♪','yell');
  await say('hasan','♪ BLEED FROM EVERYWHERE YOU THINK ♪','yell');
  A.darren.shake=1;blood(A.darren.x,A.darren.y-26,20,null,40,A.darren.y+2);SFX.squelch();
  await N('Darren’s nose starts bleeding. Then his ears. Then his goggles fill up from the inside, slowly, like two little fish tanks.');
  for(let i=0;i<3;i++){SFX.squelch();blood(A.darren.x,A.darren.y-24,30,null,90,A.darren.y+2);shake(.7);await wait(300)}
  kill('darren','lie',{pool:44,bleed:5,spray:50});
  fxState.red=0;for(const n of['hasan','nivaan','kenneth'])if(A[n]){A[n].pose=null;A[n].ex='shock'}
  await say('hasan','(snapping out of it) …What did we just sing. WHAT THE HELL DID WE JUST SING.','shock');
  await say('nivaan','(green, wiping his mouth) Chat says that was hard. Chat is being weird about it.','scared');
  await complete('darren','choir');return;
 }else{
  for(const n of['nivaan','kenneth'])if(A[n])walk(n,A.hasan.x-20-(n==='kenneth'?14:0),90);
  cue('romance');fxState.romance=.6;
  for(const n of['hasan','nivaan','kenneth'])if(A[n]){A[n].pose='sing';A[n].ex='closed'}
  await say('hasan','♪ Darren with the goggles on, eleven steps and then some ♪','closed');
  await say('kenneth','♪ swim team on the cafeteria tables ♪','closed');
  await say('nivaan','(green, harmonizing) ♪ chat says yes ♪','love');
  await say('hasan','♪ …milkshake? ♪','love');
  await say('darren','(dropping to his knees on the grass, sobbing) THAT WAS STEP ELEVEN. HOW DID YOU KNOW STEP ELEVEN.','cry');
  pose('darren','hug');pose('hasan','hug');SFX.heart();prop({t:'heart',x:A.darren.x-6,y:120});fxState.romance=0;D.f.darShake=1;
  await complete('darren','choirlove');return;
 }
 if(A.arjun&&!A.arjun.dead){A.arjun.pose=null;await say('arjun','(still under the banner) If anybody laughs at Hasan right now I will personally— why am I defending him— I don’t know— I’ve had a drone on me—','angry')}
 bond('hasan',1);
 await complete('darren',D.f.darShake?'shake':'friends');
}});
