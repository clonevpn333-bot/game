'use strict';
/* =====================================================================
   HIGHSCHOOL — INSPECTION DAY, REBUILT
   Not a judgement. A heist, a showdown and a payoff.
   1. LOCKDOWN  The teachers seal the school. You have to get the File
      from the library to the hall. Three obstacles. Every ally you earned
      over two weeks takes one for you, on screen. The rest you beat.
   2. SHOWDOWN  In the hall, each teacher stands up and lies. You present
      the evidence that breaks that lie. Right piece: they crack in front
      of everyone. Wrong piece: the hall laughs and the inspectors doubt you.
   3. THE TURN  When they're cornered, the smiles come off. Everyone you
      saved and everyone who owes you comes over the chairs to help.
   4. AFTER     Where they are now: a payoff for every story you finished.
   ===================================================================== */
const FIN={};
const EVL={cheekscam:'Fists of Fair City 4 (the background)',timesheets:'Mr. Adam’s sign-out sheets (Love, Miss)',seats:'Paul Jones’s seating plan of the 43',hatchkey:'Coach’s lanyard (the boiler hatch key)',sketchbook:'Abby’s sketchbook (nineteen Fridays)',voicenote:'Sean’s voice note to Stella',retainer:'Tyler’s retainer',jars:'The fourteen jars labelled AIDAN',ledger:'Mr. Voss’s ledger (GRAMS)',volunteers:'Mr. Kim’s VOLUNTEERS wall',boiler:'The four names from 1987',register:'The 1987 register',notebook:'Tyler’s notebook',footage:'The night camera footage',confession:'Mr. Adam, on the record',rota:'Pat’s staff rota',finch:'Oliver Finch, alive',sher87:'Ms. Sherman’s memory of 1987'};
const evList=()=>{const c=crew(),out=[];for(const k in EVL)if(c.ev&&c.ev[k])out.push({k,t:EVL[k]});for(const v in (c.saved||{}))if(K[v])out.push({k:'saved_'+v,t:K[v].n+', who you rescued'});return out};
const allyPool=()=>{const c=crew(),a=Object.keys(c.allies||{}).concat(Object.keys(c.saved||{}));return [...new Set(a)].filter(k=>K[k]&&!(D.dead&&D.dead[k])&&!(window.EDITION_CUT||[]).includes(k))};
const doneV=m=>(D.done&&D.done[m])||(P.done&&P.done[m]);

inspectionDay=async function(){
 const c=crew();FIN.score=0;FIN.used={};FIN.on=1;document.body.classList.add('finale');
 if(typeof CHX!=='undefined')for(const e of Object.values(CHX))if(!e._fin){const c=e.cond,r=e.run;e.cond=function(){return !FIN.on&&(!c||c.apply(this,arguments))};e.run=async function(){if(FIN.on)return 'stay';return r.apply(this,arguments)};e._fin=1}
updateLoc&&updateLoc();cue('tension',true);
 /* nothing random interrupts the finale: mark every period's chaos roll as used */
 D.f.chaos=D.f.chaos||{};for(let pd=0;pd<8;pd++)D.f.chaos['p'+cal()+'_'+pd]=1;if(typeof STARE!=='undefined')STARE.next=T+1e9;if(typeof HEADSHOWN!=='undefined')HEADSHOWN=cal();
 await card('INSPECTION DAY','WEEK 2 · FRIDAY · 8:41 AM',2200);
 /* ---------- 1. LOCKDOWN ---------- */
 scene('library',{you:[60,1,{y:156}],nivaan:[100,-1,{y:150,pose:'phone',ex:'scared'}],david:[130,-1,{y:150,hold:'paper'}]},true);
 if(typeof SLIDE!=='undefined')SLIDE.t='';
 await say('nivaan','(staring at his phone) They locked it. All of it. Every outside door. Adam’s on the PA saying it’s a “fire drill”. There’s no fire.','scared');
 await say('david','(holding up a thick folder) The File. Everything. If this gets to the hall projector before the inspectors leave, it’s over. For them.','scared');
 await say('nivaan','Three things between here and the hall. Coach on the stairs. The hall doors, chained. Mr. Voss in the projector booth. Pick your people.','cold');
 hold('you','paper');
 if(c.cheeksIn)await say('nivaan','(holding up his phone: a livestream, two huge men in tracksuits outside the front gate) And Cheeks and Cheek-Clapper are live from the bus loop. Nine hundred people watching. It’s 8:41 in the morning.','smirk');
 const pool=allyPool();if(pool.length)await N('Your phone buzzes. And buzzes. And buzzes. '+pool.slice(0,6).map(k=>K[k].n).join(', ')+(pool.length>6?' and more':'')+'. All the same message: “where do you need me”.');
 const OBS=[
  {room:'stairwell',t:'coach',label:'COACH ON THE STAIRS',pref:['jacob','mateo','paul','omer','kenneth'],ally:async(k)=>{await say(k,k==='mateo'?'(blowing a whistle right in his ear) EXTRA REPS, COACH.':'(walking straight at Coach) Hey, Coach. Remember me?','angry');pose('coach','hurt');await N(K[k].n+' takes Coach down the stairs in a heap. Neither of them gets up quickly. '+K[k].n+' gives you a thumbs-up from the bottom.')},
   solo:async()=>{await say('coach','(blocking the stairs, whistle in his teeth) Nobody leaves the building. Drill rules.','evil');return vgRace('coach')}},
  {room:'corridor',t:null,label:'THE HALL DOORS, CHAINED',pref:['angelo','theo','zara','lily','david'],ally:async(k)=>{await say(k,k==='angelo'?'(already kneeling at the padlock) Thirty seconds. Twenty if nobody talks.':'(arriving with bolt cutters from the caretaker’s closet) I borrowed these. Forever.','smirk');SFX.click&&SFX.click();await N('The chain drops. The hall doors swing open an inch. Inside: the whole school, the inspectors, and the teachers in a row along the wall.')},
   solo:async()=>{await N('A chain through both handles and a padlock the size of your fist.');return vgLock()}},
  {room:'hall',t:'voss',label:'MR. VOSS IN THE PROJECTOR BOOTH',pref:['priya','devon','noah','hasan','arjun'],ally:async(k)=>{await say(k,k==='priya'||k==='devon'?'(at the booth door, very calm) Hi, sir. Remember me? Everyone’s going to.':'(yanking the booth door open) Sir, your fridge is ON FIRE.','angry');await N('Mr. Voss is out of the booth and halfway down the aisle before he realises. The booth is yours.')},
   solo:async()=>{await N('Mr. Voss is in the booth, humming, with his hand on the cable. You need the projector code before he notices you.');return vgSimon(5,'THE PROJECTOR CODE')}}];
 for(const o of OBS){
  scene(o.room,{you:[40,1,{y:156}]},true);cue('tension',true);
  if(o.t&&K[o.t]&&!D.dead[o.t])put(o.t,200,-1,{y:146,ex:'evil'});
  if(o.room==='hall'&&typeof SLIDE!=='undefined'){SLIDE.t='NO SIGNAL';SLIDE.lock=1}
  const chainP=o.room==='corridor'?prop({t:'halldoors',x:286,y:108,layer:-60}):null;
  await card(o.label,'',900);
  const lv=typeof lovers==='function'?lovers():[];const lk={coach:'corey',null:'sean',voss:'hasan'}[String(o.t)];
  let k=(lk&&lv.includes(lk)&&!FIN.used[lk]&&pool.includes(lk)?lk:null)||o.pref.find(p=>pool.includes(p)&&!FIN.used[p])||pool.find(p=>!FIN.used[p]&&!o.pref.includes('x'));
  let ok;
  if(k){const pk=await finPickAlly(o,k,pool);if(pk){k=pk;FIN.used[k]=1;if(!A[k])put(k,-14,1,{y:152});await walk(k,o.room==='corridor'?248:150,140);if(k==='jacob'&&(crew().ev||{}).hatchkey&&o.t==='coach'){await say('jacob','(walking up the stairs, slowly) Hey, Coach.','cold');await N('Jacob doesn’t push. He just stands on the step below Coach, all of him, and doesn’t move. Coach looks at him for a long time. Then Coach walks back up the stairs and out of the way.');remove('coach')}else if(LOVE_ALLY[k]&&loveOn(k)){FIN.used[LOVE[k].b]=1;await LOVE_ALLY[k](o)}else await o.ally(k);ok=true;FIN.score++}}
  if(ok===undefined)ok=await o.solo();
  if(chainP){chainP.open=1;SFX.crunch&&SFX.crunch();shake(.3);await wait(TEST?0:500)}
  if(!ok){A.you.ex='hurt';await N(pick(['You get through. Barely. It costs you time, and the teachers know you’re coming now.','You make it, bleeding a bit, and late.']));FIN.late=(FIN.late||0)+1}
  else if(!k||!FIN.used[k])FIN.score++;
 }
 /* ---------- 2. SHOWDOWN ---------- */
 const kids=alive([...new Set((typeof lovers==='function'?lovers():[]).flatMap(k=>[LOVE[k].a,LOVE[k].b]).concat((crew().ev||{}).hatchkey?['jacob']:[]).concat(['david','hasan','arjun','stella','sean','omer','nivaan','kenneth','corey','abby','marcus','paul','jacob','angelo','dheva','alex']))]);
 const teachers=alive(['shermian','voss','coach','kim']).filter(t=>K[t]);
 const cast={adam:[160,1,{y:118,pose:'conduct'}],insp1:[186,-1,{y:118}],insp2:[206,-1,{y:118}],you:[40,1,{y:160,hold:'paper'}]};
 teachers.forEach((t,i)=>cast[t]=[236+i*16,-1,{y:126}]);kids.slice(0,10).forEach((n,i)=>cast[n]=[60+i*18,-1,{y:150+(i%2)*6}]);
 scene('hall',cast,true);crowd={n:14,cheer:false,phones:true,front:4,gap:[60,180]};cue('tension',true);
 if(typeof SLIDE!=='undefined'){SLIDE.t='THE FILE';SLIDE.lock=1}
 await N('The projector hums. The whole school turns round. The inspectors look up from their clipboards. Along the wall, every teacher is smiling the same smile.');
 await say('adam','(at the podium, shaking, but looking straight at you) …The floor is yours.','scared');
 const OBJ=[
  {t:'voss',line:'Those jars? Science. Pickled vegetables. Educational. I have the receipts. Mostly.',beat:['ledger','jars','saved_priya','saved_devon'],crack:'(a jar slips out of his coat pocket and smashes on the floor. Nobody looks at what was inside. Everybody looks at what was inside.)'},
  {t:'kim',line:'Magic club is a registered after-school activity! The children LOVE magic club.',beat:['voicenote','seats','volunteers','saved_lily'],crack:'(his smile stays exactly where it is while the rest of his face gives up)'},
  {t:'coach',line:'Kids get hurt in sport. It’s called building character. Some characters don’t make it.',beat:['sketchbook','cheekscam','hatchkey','seats','saved_mateo','footage','register','rota'],crack:'(he blows his whistle at the inspectors. Nobody moves. He blows it again, smaller.)'},
  {t:'shermian',line:'1987 was a tragedy. An ACCIDENT. Nobody could have known about that boiler.',beat:['timesheets','boiler','retainer','finch','sher87','notebook','saved_theo'],crack:'(for the first time in thirty-nine years, she has nothing to say)'}];
 const evs=evList();
 for(const o of OBJ){if(!A[o.t])continue;
  await walk(o.t,A[o.t].x-12,60);face(o.t,-1);await say(o.t,o.line,'smirk');
  const opts=evs.map(e=>e.t).concat(['Say nothing. Let it go.']);
  const pi=await finWitness(o,evs);
  if(pi>=evs.length){await N('You let it go. '+K[o.t].n+' sits back down. Somebody in the hall laughs. The inspectors write something down.');FIN.score--;continue}
  const e=evs[pi];if(typeof SLIDE!=='undefined')SLIDE.t=e.t.toUpperCase().replace(/[’']S\b/g,'').replace(/[’']/g,'');SFX.click&&SFX.click();
  if(o.beat.includes(e.k)){
   if(e.k.startsWith('saved_')){const v=e.k.slice(6);put(v,24,1,{y:160,ex:'angry'});await say(v,'(standing up on a chair) That’s a lie. I was there. '+K[o.t].n+' took me. Somebody came and got me out.','angry')}
   else if(e.k==='finch'&&K.oliver){put('oliver',334,-1,{y:150});await walk('oliver',280,70);await say('oliver','My name is Oliver Finch. I was supposed to be in that boiler room in 1987. Somebody told me to tell someone. I’m telling someone.','sad')}
   else if(e.k==='sketchbook'&&A.abby){A.abby.ex='cold';await say('abby','(standing up on her chair) I drew it. Every Friday for two years. Nineteen bags. Corey sat in front of that window every day so nobody would see me drawing it.','cold');if(A.corey)await say('corey','(standing up next to her, taking her hand, in front of the entire school) …I just liked the window.','cold')}
   else if(e.k==='voicenote'&&A.stella){await N('Click. Mr. Kim’s voice fills the hall. “Nobody looks for a girl who’s leaving.”');await say('stella',(crew().stellaTaken?'(standing up) He painted a clown nose on me. I don’t remember where I was for forty minutes. ':'(standing up) ')+'I’m the girl who’s leaving. I’m still here.','angry');if(A.sean){await walk('sean',A.stella.x+12,80);await say('sean','(not letting go of her hand) Look at her. Everybody look at her.','angry')}}
   else if(e.k==='timesheets'&&A.adam){await say('adam','(at the podium, holding up a stack of paper) Twenty-two years of sign-out sheets. Every kid who “transferred”. Every one authorised by the same two words: Love, Miss. I signed the front pages. I never turned one over. I’m turning them over.','cold');A.adam.ex='cold'}
   else if(e.k==='seats'){if(!A.pauljones)put('pauljones',-14,1,{y:160});await walk('pauljones',36,60);await say('pauljones','(from the back, hood down for once) Every Friday a seat on the 43 goes empty. I drew them. Nobody else noticed. I notice where everyone is.','cold')}
   else if(e.k==='cheekscam'){put('cheeks',334,-1,{y:150,hold:'laptop'});put('clapper',354,-1,{y:150});await walk('cheeks',270,120);walk('clapper',292,120);
    await say('cheeks','(bursting through the side door, laptop held high) FISTS OF FAIR CITY FOUR. Scene nine. Look at the BACKGROUND.','yell');
    await say('clapper','We ENHANCED it.','angry')}
   else if(e.k==='hatchkey'&&A.jacob){await say('jacob','(standing up, all of him) I took that off him. He was dragging a seventh grader to the cupboard. I pushed him. First time in my life.','cold')}
   else await N('Click. '+e.t+'. On the big screen, in front of everyone.');
   SFX.sting&&SFX.sting();shake(.5);A[o.t].ex='shock';await N(o.crack);FIN.score+=2;FIN['cracked_'+o.t]=1;
   if(o.t==='shermian'&&crew().ev&&crew().ev.sher87&&K.sherman&&!D.dead.sherman){FIN.confess=1}
  }else{SFX.bad&&SFX.bad();await say(o.t,pick(['(laughing) That proves nothing, sweetie.','And? AND?','Wrong. Sit down.']),'smirk');await N('The hall laughs. The inspectors look at each other. That one didn’t land.');FIN.score--}
 }
 if(typeof SLIDE!=='undefined'){SLIDE.t=FIN.score>=5?'THEY KNEW':'THE FILE';SLIDE.lock=1}
 /* ---------- 3. THE TURN ---------- */
 if(typeof loveOn==='function'&&loveOn('hasan')&&(crew().ev||{}).inside&&A.insp2){
  if(A.darren){await walk('darren',A.darren.x,40);A.darren.ex='scared'}
  await N('In the second row, Darren stands up. He doesn’t say anything. He just holds up a laminated sheet. STEP THIRTEEN.');
  const anyCrack=Object.keys(FIN).some(k=>k.startsWith('cracked_'));
  await say('insp2',anyCrack?'(putting her clipboard down) My son laminated me a summary. Forty pages. I read it on the train. I was waiting to see whether this school would show me the same thing. It just did.':'(putting her clipboard down) My son laminated me a summary. Forty pages. Nobody in this hall has said one word of it out loud. So I will.','cold');
  if(crew().sherKnows&&A.shermian)await say('shermian','(smiling very hard) Mrs. … we met! I mean, I meant to—','smirk');
  if(A.hasan)await N('Hasan reaches over and holds Darren’s hand. In the Main Hall. In front of everyone. Step fourteen.');
  FIN.score+=2}
 const win=FIN.score>=5;
 if(FIN.confess){put('sherman',334,-1,{y:126,ex:'cry'});await walk('sherman',A.insp1.x+30,50);face('sherman',-1);
  await say('sherman','(holding her wrists out to the inspectors) It was me. In 1987. I left them in the boiler room and went for a coffee. I went back. I was too late for one of them. I have been too late every Friday since.','cry');
  if(!(D.done.dopple||P.done.dopple))await N('Somewhere under the school, something that has been chewing for thirty-nine years stops. And doesn’t start again.');
  await N('Nobody moves. The smiles along the wall go out one by one, like someone walking down a corridor turning off lights. Nobody gets hurt. Not today.');
  return finEnd('confessed')}
 if(win){
  for(const t of teachers)if(A[t])A[t].ex='evil';cue('fight',true);
  await N('Along the wall, the smiles come off. All at once. Ms. Sherman takes one step towards the inspectors.');
  await say('insp2','(standing) Nobody leaves this hall.','angry');
  const helpers=allyPool().filter(k=>!A[k]).slice(0,5);let x=20;for(const k of helpers){put(k,x,1,{y:158,ex:'angry'});x+=14}
  if(helpers.length)await N('And then '+helpers.map(k=>K[k].n).join(', ')+' come over the chairs. Then the kids next to them. Then the whole hall. Everybody you helped for two weeks, all at once.');
  {const lv=lovers().map(k=>({corey:'Corey and Abby at the front, holding hands so hard their knuckles go white',sean:'Sean with Stella right behind him, for once not leaving',hasan:'Hasan and Darren, shoulder to shoulder, exactly as planned'}[k]));if(lv.length)await N(lv.join('. ')+'.')}
  const ok=await finHold(helpers);
  if(!ok&&!helpers.length){await N('You’re one kid against a wall of teachers. It doesn’t last.');return finEnd('bloodbath')}
  SFX.cheer&&SFX.cheer();shake(1);await N('It takes the whole school. It takes four minutes. When the police come in through the doors you unchained, the teachers are under a pile of kids two metres high, still smiling, underneath.');
  return finEnd('exposed')}
 await say('insp1','(looking at the screen, then at his clipboard) Some of this is… concerning. We’ll need more than this.','sad');
 await N('Behind the inspectors, Ms. Sherman closes the hall doors. Gently. And locks them.');cue('fight',true);
 if(crew().adamIn&&A.adam){await walk('adam',300,90);await N('Mr. Adam is already at the side door, holding it open with his whole body, his tie over his shoulder.')}
 const run=await mash('GET THEM OUT THE SIDE DOOR',{need:crew().adamIn?18:28,time:5,info:'The side door. Push everybody through it. MASH!'});
 if(run){await N('You get most of them out. Not all. The inspectors leave by the side door at 11:15 with a rating of “Requires Improvement”.')}
 else{const lb=(typeof lovers==='function'?lovers():[]).map(k=>LOVE[k].b).find(b=>A[b]);const v=lb||kids.find(k=>A[k]);if(v&&A.shermian){await walk('shermian',A[v].x+10,120);SFX.squelch();blood(A[v].x,A[v].y-24,40,null,100,A[v].y+2);kill(v,'lie',{pool:40,bleed:4,spray:50});await N(K.shermian.n+' gets to '+K[v].n+' first.');const lk=Object.keys(LOVE).find(k=>LOVE[k].b===v);if(lk&&A[LOVE[lk].a]){FIN.lost=lk;await N(K[LOVE[lk].a].n+' doesn’t scream. He just sits down on the floor next to '+K[v].n+' and holds on.')}}}
 return finEnd('bloodbath')};

/* ---------- 4. AFTER: where they are now ---------- */
async function finEnd(v){
 const c=crew();FIN.on=0;document.body.classList.remove('finale');c.finale=v;save&&save();crowd=null;
 await complete('crew',v);
 fxState.dark=0;await tw(fxState,{dark:1},900);cue(v==='bloodbath'?'sad':'romance',true);
 await card(v==='confessed'?'SHE CONFESSED':v==='exposed'?'EXPOSED':'NOT ENOUGH','',2000);
 const beats=[];
 const add=(room,cast,line,pri=2)=>beats.push({room,cast,line,pri});
 if(v!=='bloodbath')add('carpark',{you:[60,1,{y:156}],nivaan:[90,1,{y:152,pose:'phone'}],david:[118,1,{y:152}]},'Fourteen police cars in the bus loop by lunch. Highgate High is closed “pending investigation”. Nivaan’s livestream of it has four million views. David is in every frame.');
 else add('carpark',{you:[60,1,{y:156}],david:[100,1,{y:152,ex:'cry'}]},'The inspectors gave Highgate “Requires Improvement”. School carries on on Monday. Some desks are empty. David sits on the steps outside for a long time.');
 const saved=Object.keys(c.saved||{}).filter(k=>K[k]),gone=Object.keys(c.gone||{}).filter(k=>K[k]);
 if(saved.length){const cast={you:[50,1,{y:156}]};saved.slice(0,5).forEach((k,i)=>cast[k]=[90+i*22,-1,{y:150}]);add('field',cast,saved.map(k=>K[k].n).join(', ')+' '+(saved.length===1?'goes':'go')+' home. Every one of them, because somebody went. They start a group chat. It’s called “somebody came”. You’re in it.')}
 if(gone.length)add('corridor',{you:[60,1,{y:156}]},'The MISSING posters for '+gone.map(k=>K[k].n).join(', ')+' stay up in the main corridor. Somebody keeps replacing them when they fade. It’s you.');
 if(c.ev&&c.ev.finch&&K.oliver)add('carpark',{oliver:[160,-1,{y:150,hold:'book'}],you:[120,1,{y:156}]},'Oliver Finch’s daughter starts at Highgate next September. He still has the book. Rule one.');
 const tea=doneV('tea');if(tea&&K.david)add('library',{david:[150,-1,{y:150,pose:'sit'}],you:[110,1,{y:156}]},tea==='wrong'||tea==='gotaway'?'@highgate.tea is still posting. Nobody ever found out who ran it. You have a pretty good idea.':'David runs for class president again. He loses. He gets eleven votes. Nine more than his cousins. He says it’s the best day of his life.');
 const cat=doneV('catfish');if(cat&&K.kenneth&&K.arjun)add('arcade',{kenneth:[140,1,{y:150}],arjun:[166,-1,{y:150}]},'Kenneth and Arjun go to the arcade every Friday now. Arjun pays. Arjun will be paying for a very long time.');
 const big=doneV('bigscore');if(big&&K.kayden)add('foodcourt',{kayden:[150,1,{y:150}]},big==='clean'?'Kayden still wears the $4.99 necklace. Every day. The Highgate Hittaz have a clubhouse now. It’s his nan’s shed.':'Kayden is banned from Fair City Mall for life. He visits the food court in a disguise. It is the WORLD’S BEST GRANDPA beanie.');
 const kim=doneV('kim');if(kim&&K.alex)add('field',{alex:[150,1,{y:150}]},'Alex plays soccer again. He doesn’t laugh at clowns. Nobody asks him to.');
 const dop=doneV('dopple');if(dop)add('corridor',{you:[60,1,{y:156}]},dop==='merged'?'There’s only one Ms. Sherman now. She’s always hungry.':'The stairwell lights work again. Pat gets her walk-in back. Nobody ever finds out where the mop heads went.');
 {const lv=typeof lovers==='function'?lovers():[];
  if(FIN.lost==='corey')add('trailer',{corey:[140,1,{y:150,pose:'sit'}]},'Corey still sits by the window in the Trailer. Every Period 3 he draws the walkway. He’s not very good. He keeps going.',1);
  else if(lv.includes('corey'))add('trailer',{corey:[140,1,{y:150,pose:'sit'}],abby:[162,-1,{y:150,pose:'sit',hold:'guitar'}]},'Corey and Abby still sit by the window in the Trailer. Corey sings now. Badly. On purpose. Abby draws him doing it. The sketchbook’s back pages stay empty.',1);
  if(FIN.lost==='sean')add('field',{sean:[150,1,{y:150,pose:'sit',hold:'phone'}]},'Sean still records a voice note every hour. He doesn’t send them anywhere. He just keeps them.',1);
  else if(lv.includes('sean'))add('bus',{sean:[140,1,{y:150}],stella:[162,-1,{y:150}]},'Stella’s mom turned the Portland job down. She said she wasn’t moving her daughter away from the only school that ever fought for her. Sean has stopped recording voice notes. He doesn’t need them.',1);
  if(FIN.lost==='hasan')add('library',{hasan:[150,1,{y:150,hold:'paper'}]},'Hasan keeps the laminated list in his blazer pocket. Step fourteen is still blank. He won’t fill it in.',1);
  else if(lv.includes('hasan'))add('library',{hasan:[140,1,{y:150}],darren:[162,-1,{y:150,hold:'paper'}]},'Darren’s mum shut Highgate down in an afternoon. At dinner, she asks Hasan to pass the salt. Step fifteen.',1);}
 if(c.cheeksIn&&K.cheeks)add('carpark',{cheeks:[140,1,{y:150,hold:'laptop'}],clapper:[164,-1,{y:150,pose:'hips'}]},v==='bloodbath'?'Cheeks and Cheek-Clapper’s livestream got taken down after forty minutes. They still post the clips. Every Friday. Somebody has to.':'Fists of Fair City 5: Inspection Day gets eleven million views. Their channel still has 312 subscribers. Nobody can explain it.',1);
 if(c.pjSafe&&K.pauljones)add('bus',{pauljones:[120,1,{y:150,pose:'sit'}],you:[142,-1,{y:150,pose:'sit'}]},'Paul Jones sits at the front of the 43 now. Second seat. He still draws the bus from above. Nobody’s crossed out.',1);
 if((c.ev||{}).hatchkey&&K.jacob)add('field',{jacob:[150,1,{y:150}]},'Jacob still lets people bump into him in the corridor. He just doesn’t move out of the way any more.',1);
 if(c.adamIn&&K.adam&&v!=='bloodbath')add('foodcourt',{adam:[150,1,{y:150,pose:'sit'}]},'Mr. Adam gives evidence for eleven days straight. On the twelfth he eats noodles in the food court in a cardigan. Nobody has ever seen him look this calm.',1);
 const n=Object.keys(D.done||{}).length;
 const first=beats.shift();beats.sort((a,b)=>a.pri-b.pri);beats.unshift(first);
 for(const b of beats.slice(0,9)){scene(b.room,b.cast,true);fxState.dark=1;await tw(fxState,{dark:.15},700);await N(b.line);await tw(fxState,{dark:1},600)}
 await card('THE END','You finished '+n+' stories. You found '+Object.keys(P.deaths||{}).length+' ways to die. '+saved.length+' kids went home because of you.',4200);
 fxState.dark=0;
 toast('★ Main story: '+(v==='confessed'?'SHE CONFESSED':v==='exposed'?'EXPOSED':'not enough'));return 'ended'}

/* the objective line follows the finale, not the old chapter */
{const _sn=storyNow;storyNow=function(){if(FIN.on)return{i:98,t:'Inspection Day',goal:'Get the File onto the hall projector. Then make it stick.'};return _sn()}}

/* the couples' own lockdown scenes */
const LOVE_ALLY={
 corey:async()=>{put('abby',-14,1,{y:140,hold:'guitar'});await walk('abby',174,140);face('abby',1);
  await N('Abby goes up two stairs past Corey with her dad’s guitar. The one Corey glued back together. She plays one chord, very loud, and it fills the whole stairwell.');
  await say('corey','(singing. Badly. As loud as he has ever done anything) —AND IF YOU WANT ME YOU KNOW WHERE I’LL BE—','yell');
  await say('coach','NOISE. IN MY STAIRWELL.','angry');
  await N('Coach charges. They run. Corey keeps singing all the way down to the gym, and Abby keeps playing, and you hear the equipment cupboard door slam, and a padlock, and Corey still singing on the other side of it.');
  remove('coach');remove('corey');remove('abby')},
 sean:async()=>{put('stella',-14,1,{y:152,hold:'cutters'});await walk('stella',270,140);
  await say('stella','(with bolt cutters from the caretaker’s closet) I’m leaving on Saturday. I am not leaving THIS.','angry');
  await N('She hands Sean the cutters. The chain is thick. He leans on them. Nothing. He leans harder.');
  await say('sean','(through his teeth, not looking at her) I love you. I never practiced it. I love you.','angry');
  SFX.crunch&&SFX.crunch();shake(.5);
  await say('stella','(as the chain hits the floor) I KNOW. Open the door.','happy')},
 hasan:async()=>{put('darren',-14,1,{y:152,hold:'paper'});await walk('darren',170,140);
  await say('darren','(holding a laminated sheet up to Mr. Voss) Step fourteen. Mr. Voss, my mother will be reading your ledger in four minutes. Would you like to be in the room, or in the news?','cold');
  await N('Mr. Voss reads the sheet. Reads it again. Takes his hand off the cable.');
  await say('hasan','(yanking the PA plug out of the wall) And nobody’s calling it a fire drill.','angry');
  remove('voss')}};

/* no 'next quest' nag line during the finale */
{const _ul=updateLoc;updateLoc=function(){_ul();if(FIN.on){const c=$('clock');if(c)c.querySelectorAll('.story.next').forEach(e=>e.remove())}}}

/* the hall doors at the end of the corridor, chained shut until somebody cuts it */
{const _dp=drawProp;drawProp=function(p){if(p.t!=='halldoors')return _dp(p);
 const x=Math.round(p.x),y=Math.round(p.y);
 R(x-26,y-92,52,12,'#1a1a22');R(x-25,y-91,50,10,'#7a2030');pxc('MAIN HALL',x,y-89,'#f4e8d0');
 R(x-23,y-78,46,78,'#2a2026');R(x-22,y-77,21,77,'#6a4a3a');R(x+1,y-77,21,77,'#6a4a3a');
 R(x-19,y-70,15,22,'#3a4a5a');R(x+4,y-70,15,22,'#3a4a5a');R(x-4,y-40,3,10,'#c8c0a8');R(x+1,y-40,3,10,'#c8c0a8');
 if(!p.open){for(let i=0;i<9;i++){const cx=x-18+i*4.5,cy=y-36+Math.abs(i-4)*1.5;R(cx,cy,4,2,'#9a9aa4');R(cx+1,cy+1,2,1,'#3a3a44')}
  R(x-4,y-30,8,7,'#c8a030');R(x-3,y-34,6,4,'#8a8a92');R(x-1,y-28,2,2,'#3a2a10')}
 else{for(let i=0;i<9;i++)R(x-20+i*4,y-2+(i%2),4,2,'#8a8a94');R(x+16,y-4,7,6,'#c8a030')}}}

{const st=document.createElement('style');st.textContent='body.finale #clock .story.next,body.finale #clock .trkbox{display:none}';document.head.appendChild(st)}
