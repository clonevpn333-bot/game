'use strict';
/* =====================================================================
   HIGHSCHOOL REMASTERED — THE FALLOUT (after you steal someone)
   You steal her, she picks you, she likes you. Then it falls apart,
   slowly, in public, one day at a time, and the whole school decides
   you're a loser. One part per day, starting the day after.
     1. THE TABLE       lunch, cafeteria   your friends move tables
     2. THE GROUP CHAT  break, corridor    removed from everything; SNAKE
                                           on your locker; she's texting him
     3. THE WRONG NAME  home time, bus     she calls you his name
     4. DUMPED          lunch, cafeteria   in front of everyone. LOSER.
   Works for every steal: Stella (from Sean), and Mia (Tez) and Jade
   (Brayden) if those come back. Full version only.
   ===================================================================== */
{
const FALL=[
 {gid:'stella',bf:'sean',steal:'steal_stella',id:'after_stella',title:'Foul Ball',icon:'🐍',friend:1,
  trophy:'I’m not a trophy. I play softball. I have a batting average. It’s .340.',
  text:'Not the breathing one. He did a whole voice note about “his patterns.” He’s been listening to podcasts.'},
 {gid:'mia',bf:'tez',steal:'steal_mia',id:'after_mia',title:'Curtain Call',icon:'🐍',friend:0,
  trophy:'I’m not a prop. I’m the lead. I’ve always been the lead.',
  text:'He’s growing it back. The mustache. He sent me a progress photo. It’s… honestly it’s coming in thicker.'},
 {gid:'jade',bf:'brayden',steal:'jade',id:'after_jade',title:'Rebound',icon:'🐍',friend:0,
  trophy:'I didn’t leave him to be somebody’s prize. I left him to be nobody’s.',
  text:'He wrote me a letter. By hand. He spelt “sorry” wrong in three different ways.'}
];
const day=()=>typeof cal==='function'?cal():0;
const alive_=k=>K[k]&&!D.dead[k];
for(const F of FALL){
 const {gid,bf,steal,id}=F,G=()=>K[gid].n.split(' ')[0],B=()=>K[bf].n.split(' ')[0];
 if(!K[gid]||!K[bf])continue;
 const f=k=>D.f[id+'_'+k],sf=k=>{D.f[id+'_'+k]=day()};
 const ok=()=>!TEST_SKIP()&&D.done[steal]==='you'&&!D.dead[gid]&&!D.done[id];
 const next=k=>f(k)!=null&&day()>f(k);
 mission(id,{name:F.title,icon:F.icon,who:[gid],goal:'You took '+K[gid].n+' from '+K[bf].n+'. Now live in it.',
  blurb:'You won. She picked you. Everybody saw. Now everybody has an opinion, and none of them are good.',
  parts:['The table','The group chat','The wrong name','Dumped'],
  tips:['The day after: lunch, the cafeteria. Sit with her.','The next day: break, Main Corridor. Check your phone.','The next day: home time, the bus loop.','The next day: lunch, the cafeteria. She wants to talk.'],
  variants:{begged:'You begged. On camera.',first:'You tried to dump her first. Nobody bought it.',took:'Dumped in the cafeteria'}});
 /* the steal finishing stamps the day */
 {const _c=complete;complete=async function(mis,v,big){if(mis===steal&&v==='you')D.f[id+'_s']=day();return _c(mis,v,big)}}

 /* 1 · THE TABLE */
 hook({mis:id,period:4,room:'canteen',who:'auto',cond:()=>ok()&&next('s')&&f('a')==null,run:async()=>{
  const cast={you:[110,1,{y:152,pose:'sit'}],[gid]:[134,-1,{y:152,pose:'sit',ex:'happy'}]};
  const crew_=(F.friend?['hasan','omer','arjun']:['kayden','jaxon']).filter(k=>K[k]&&!D.dead[k]);
  cast[bf]=[250,-1,{y:150,pose:'sit',ex:'sad'}];crew_.forEach((k,i)=>cast[k]=[190+i*22,1,{y:150}]);
  if(K.kaylee&&!D.dead.kaylee)cast.kaylee=[296,-1,{y:146,pose:'film'}];
  scene('canteen',cast,true);cue('sad');
  await beat(F.title.toUpperCase(),'PART ONE · THE TABLE');
  await N('Lunch. She sits next to you. Your old table is twenty feet away, and it has never been this quiet.');
  await say(gid,'Is it weird? It’s weird. Everyone’s looking.','blush');
  for(const k of crew_){await walk(k,226+crew_.indexOf(k)*14,50);pose(k,'sit');face(k,1)}
  if(crew_.length)await N(crew_.map(k=>K[k].n.split(' ')[0]).join(', then ')+'. They pick up their trays and sit either side of '+B()+' like bodyguards.');
  const c=await choose(['Wave at them.','Kiss her. Right here.','Eat. Look at nobody.']);
  if(c===0){if(A.arjun){pose('arjun','wave');await wait(500);await say('arjun','(lowering his hand very slowly) Sorry, man. I can’t be seen.','sad');pose('arjun','sit')}
   else await N('Nobody waves back. One kid at the next table waves, out of pity. That’s worse.')}
  else if(c===1){SFX.kiss&&SFX.kiss();fxState.romance=.4;await N('You kiss her in the middle of the cafeteria. The whole room goes “OHHHHHH” like a stadium.');fxState.romance=0;
   if(A[bf]){pose(bf,null);await walk(bf,350,80);remove(bf)}await say(gid,'(laughing into your shoulder) That was so mean. That was so mean to him.','blush')}
  else await N('The nuggets taste like nothing. Everybody watches you chew.');
  await say(gid,'They’ll get over it.','happy');
  await N('They will not get over it.');
  if(typeof repAdd==='function')repAdd('liked',-1,'snake');
  sf('a');part(id,1);return 'stay'}});

 /* 2 · THE GROUP CHAT */
 hook({mis:id,period:2,room:'corridor',who:'auto',cond:()=>ok()&&next('a')&&f('b')==null,run:async()=>{
  const cast={you:[100,1,{y:154}]};const kids=['kid1','kid2','kid3'].filter(k=>K[k]);kids.forEach((k,i)=>cast[k]=[200+i*24,-1,{y:146,ex:'laugh'}]);
  scene('corridor',cast,true);cue('tension');
  await beat(F.title.toUpperCase(),'PART TWO · THE GROUP CHAT');
  SFX.buzz?SFX.buzz():SFX.beep&&SFX.beep();
  await N('Your phone buzzes eleven times in a row.');
  await N('“'+B()+' removed you from THE BOYS 🏀.” “Hasan removed you from SATURDAY FIFA.” Then a group you didn’t know existed: “ppl who hate the snake (47).”');
  const snake=prop({t:'snakesign',x:150,y:104,layer:-1});
  await N('Someone has written SNAKE on your locker in silver Sharpie. Someone else has drawn the snake. It’s a good snake. That’s the worst part.');
  for(const k of kids)if(typeof bubbles!=='undefined')bubbles.push({id:k,txt:'SNAKE',t:2});
  const c=await choose(['Scrub it off.','Leave it. Own it.','“Who did this?”']);
  if(c===0){await mash('SCRUB',{need:16,time:3,info:'It’s silver Sharpie. It is not coming off.'});await N('It doesn’t come off. Now it’s a smudged snake. It looks angrier.')}
  else if(c===1)await N('You leave it. You walk past it six times a day. It does not become iconic. It stays a snake.');
  else{if(kids[0])await say(kids[0],'(not even pretending) Everyone. Everyone did this.','laugh');else await N('Nobody answers. Everybody did it.')}
  put(gid,-14,1,{y:150,hold:'phone',ex:'happy'});await walk(gid,124,70);face(gid,-1);
  await N(G()+' walks up, smiling at her phone. Not at you. At her phone.');
  await say(gid,'Sorry. It’s '+B()+'. '+F.text,'happy');
  const d=await choose(['“Block him.”','Say nothing.']);
  if(d===0)await say(gid,'(the smile going) Don’t do that. That’s his thing. Telling me who to talk to. Don’t become his thing.','cold');
  else await N('You say nothing. She keeps texting while you talk. She laughs once, at something you didn’t say.');
  {const i=props.indexOf(snake);if(i>=0)props.splice(i,1)}
  if(typeof repAdd==='function')repAdd('liked',-1,'snake');
  sf('b');part(id,2);return 'stay'}});

 /* 3 · THE WRONG NAME */
 hook({mis:id,period:7,room:'bus',who:'auto',cond:()=>ok()&&next('b')&&f('c')==null,run:async()=>{
  const cast={you:[130,1,{y:154}],[gid]:[160,-1,{y:150,ex:'sad'}]};if(K.kaylee&&!D.dead.kaylee)cast.kaylee=[270,-1,{y:146}];
  scene('bus',cast,true);cue('sad');
  await beat(F.title.toUpperCase(),'PART THREE · THE WRONG NAME');
  await say(gid,'Hey, '+B()+'— (stopping) …','shock');
  await N('She said '+B()+'. On the bus loop. Kaylee was in range.');
  if(A.kaylee){pose('kaylee','film');await wait(300)}
  await say(gid,'That’s just— muscle memory. It doesn’t mean anything.','scared');
  await say(gid,'(after a long time) Can I ask you something? Did you actually like me? Or did you like that he had me?','sad');
  const c=await choose(['“I liked you.”','“…Both?”','“Honestly? I don’t know.”']);
  if(c===0)await say(gid,'(nodding, not believing it) Okay.','sad');
  else if(c===1)await say(gid,'(a laugh with nothing in it) At least that’s honest.','cold');
  else await say(gid,'Yeah. Me neither. About you, I mean.','cold');
  await N('She gets on the 43. You get on the 43. She sits at the front. You sit at the back. It’s a long ride for two people on the same bus.');
  sf('c');part(id,3);return 'ended'}});

 /* 4 · DUMPED */
 hook({mis:id,period:4,room:'canteen',who:'auto',cond:()=>ok()&&next('c'),run:async()=>{
  const cast={you:[120,1,{y:152,pose:'sit'}],[gid]:[156,-1,{y:150,ex:'cold'}]};
  const watch=['kaylee','kid1','kid2','kid3','kid4'].filter(k=>K[k]&&!D.dead[k]);watch.forEach((k,i)=>cast[k]=[200+i*24,-1,{y:146+(i%2)*6,pose:k==='kaylee'?'film':null,ex:'shock'}]);
  if(!D.dead[bf])cast[bf]=[40,1,{y:150,ex:'cold'}];
  scene('canteen',cast,true);cue('tension');
  await beat(F.title.toUpperCase(),'PART FOUR · DUMPED');
  await say(gid,'I need to say this somewhere you can’t make it weird.','cold');
  await N('Two hundred kids stop eating at once. You can hear the vending machine.');
  await say(gid,'I left a guy who needed me to be his whole life. Then I picked a guy who needed me to be a trophy.','sad');
  await say(gid,F.trophy,'cold');
  await say(gid,'We’re done. I’m telling you here so you can’t make it a secret thing. Secret things are how you two operate.','cold');
  const c=await choose(['Beg.','Dump her first. Loudly.','“…Okay.”']);
  let v='took';
  if(c===0){v='begged';pose('you','beg');await mash('BEG',{need:18,time:3,info:'Out loud. In the cafeteria.'});
   await N('You beg. Out loud. On one knee, by the ketchup. Kaylee zooms in so hard the phone focuses on your nostril.');
   await say(gid,'(quietly) Get up. Please. You’re making it worse for both of us.','sad');pose('you',null)}
  else if(c===1){v='first';pose('you',null);await say('you','Actually, I’M breaking up with YOU.');
   await N('Nobody buys it. Somebody at the back actually says “nobody buys it” out loud.')}
  else await say('you','…Okay.');
  await walk(gid,350,60);remove(gid);
  await N('She doesn’t walk to '+B()+'’s table either. She walks out of the cafeteria and, as far as anyone can tell, out of both your lives.');
  SFX.crowd&&SFX.crowd();
  for(const k of watch)if(typeof bubbles!=='undefined')bubbles.push({id:k,txt:'LOSER',t:2.2});
  if(watch[1])pose(watch[1],'slowclap');
  await N('Somebody starts a slow clap.');
  for(const k of watch){pose(k,'slowclap');await wait(TEST?0:220)}
  await N('It catches. It goes round the whole cafeteria.');
  if(alive_('pat')){put('pat',-14,1,{y:146});await walk('pat',60,70);face('pat',1);pose('pat','slowclap');await N('Lunch Lady Pat comes out from behind the counter to join in.')}
  if(A[bf]){await walk(bf,96,60);face(bf,1);
   await say(bf,'You know the worst part? I’m not even happy. I wanted to be so happy about this.','sad');
   await say(bf,'She left both of us. We’re the same now. Me and you. Two idiots.','cold');
   await walk(bf,-20,60);remove(bf)}
  if(F.friend&&K.arjun&&!D.dead.arjun){put('arjun',340,-1,{y:150});await walk('arjun',144,90);pose('arjun','sit');
   await say('arjun','(taking one of your nuggets) You are, mathematically, the biggest loser in this school.','smirk');
   await say('arjun','I’ll sit here a bit. Not because I like you. The view’s funny.','smirk')}
  else await N('You eat lunch alone. The nuggets still taste like nothing.');
  if(typeof repAdd==='function'){repAdd('liked',-2,'loser');repAdd('legend',-1)}
  D.f['with_'+gid]=0;(P.dumped=P.dumped||{})[gid]=1;
  toast('🐍 Everyone in Highgate thinks you’re a loser now. Fair, honestly.');
  await complete(id,v);return 'stay'}});
 for(const v of['begged','first','took'])OUTCOME_FIX[id+':'+v]='bad';
}
function TEST_SKIP(){return false}

/* SNAKE on your locker */
{const _dp=drawProp;drawProp=function(p){if(p.t!=='snakesign')return _dp(p);const x=Math.round(p.x),y=Math.round(p.y);
 R(x-20,y-16,40,14,'rgba(0,0,0,.12)');pxc('SNAKE',x,y-14,'#d8d8e0');
 for(let i=0;i<14;i++)R(x-16+i*2,y-5+Math.round(Math.sin(i*.9)*2),2,2,'#c8c8d0');R(x+12,y-6,3,3,'#c8c8d0');R(x+15,y-5,2,1,'#e05050')}}

/* once she's dumped you, she stops turning up at your lunch table (every run) */
{const _br=buildRoom;buildRoom=function(room){const sw=[];
 for(const F of FALL)if((P.dumped||{})[F.gid]&&P.done[F.steal]==='you'){sw.push(F.steal);P.done[F.steal]='_'}
 try{return _br(room)}finally{for(const m of sw)P.done[m]='you'}}}

/* in the quest tab, it's a chapter of the same love arc */
if(typeof ARCS!=='undefined')for(const sec of ARCS)for(const a of (sec[2]||[]))if(a[0]==='ldist'&&!a[3].includes('after_stella'))a[3].push('after_stella');
if(typeof ARC_MIS!=='undefined')ARC_MIS.push('after_stella','after_mia','after_jade');
}
