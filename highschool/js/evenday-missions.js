'use strict';
/* =====================================================================
   HIGHSCHOOL — even-day missions. One per class, Periods 2, 4, 6 and 8.
   ===================================================================== */
{const _sf=seatsFor;seatsFor=function(room){
 const S=[];const row=(xs,y,o)=>xs.forEach((x,i)=>S.push(Object.assign({x,y,i,row:y},o)));
 if(room==='history'||room==='psych'){row(SEATS.back,SEATS.backY,{pose:'sit',dir:-1});row(SEATS.front,SEATS.frontY,{pose:'sit',dir:-1});return S}
 if(room==='art'){row([102,212,292],149,{dir:-1});row([142,252],157,{dir:-1});row([70,180],160,{dir:-1});return S}
 if(room==='music'){row([110,138,166,194,222,250,278],150,{pose:'sit',dir:-1});return S}
 if(room==='ict'){row([118,162,206,250,294],134,{pose:'sit',dir:-1});row([118,162,206,250,294],158,{pose:'sit',dir:-1});return S}
 if(room==='pool'){row([110,140,170,200,230,260,290],116,{dir:-1});return S}
 if(room==='woodwork'){row([96,124,186,214,276,304],133,{dir:-1});row([96,124,186,214,276,304],157,{dir:-1});return S}
 return _sf(room)}}
Object.assign(TEACHER_SPOT,{history:[40,1,'hips',146],psych:[40,1,'hips',146],art:[40,1,'hips',148],music:[90,1,'conduct',146],ict:[40,1,'hips',146],pool:[62,1,'hips',114],woodwork:[40,1,'hips',146],hall:[160,1,'hips',100]});
Object.assign(BOARD,{psych:[0,0,0,0]});
{const _dp=drawProp;drawProp=function(p){
 const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='guillotine'){guillotineBg(x);blade(x,p.by||28);if(p.rope)R(x+12,20,1,(p.by||28)-16,'#c8a868');return}
 if(p.t==='plaster'){const f=A[p.follow];if(!f)return;const h=Math.round(p.h||0),G=kidGeom(f.k,f),top=f.y-G.legH-G.bodyH-G.hd-2;const yy=f.y-h;R(f.x-8,yy,16,h,'#ecebe4');R(f.x-8,yy,16,1,'#fff');for(let i=0;i<h;i+=3)R(f.x-8+((i*5)%14),yy+i,2,1,'#d8d6cc');if(p.cracks)for(let i=0;i<p.cracks;i++)R(f.x-6+hsh(i)*12,yy+hsh(i+3)*h,3,1,'#9a988e');return}
 if(p.t==='fork'){R(x,y,1,8,'#d8d8e0');R(x-2,y,1,5,'#d8d8e0');R(x+2,y,1,5,'#d8d8e0');R(x-2,y+5,5,1,'#d8d8e0');return}
 if(p.t==='spark'){if(Math.sin(T*40+x)>0){R(x-2,y,5,1,'#fff6a0');R(x,y-2,1,5,'#fff6a0');R(x-3,y-3,1,1,'#8ae0ff');R(x+3,y+2,1,1,'#8ae0ff')}return}
 if(p.t==='lathe'){R(x-20,y-10,40,10,'#5a6a5a');R(x-20,y-12,40,2,'#8a9a8a');R(x-16,y-18,8,8,'#3a3a3a');const r=T*30;R(x-14+Math.round(Math.cos(r)*2),y-16+Math.round(Math.sin(r)*2),2,2,'#d8d8d8');R(x-6,y-15,20,3,'#c8985a');R(x+16,y-18,4,8,'#3a3a3a');R(x-20,y,3,10,'#3a3a3a');R(x+17,y,3,10,'#3a3a3a');if(p.stop!==false){R(x+22,y-8,5,5,'#c02020');R(x+23,y-7,3,3,'#e04040')}return}
 if(p.t==='coffin'){R(x-7,y-28,14,28,'#4a2e1e');R(x-6,y-27,12,26,'#5a3a26');R(x-3,y-20,6,1,'#2a1a10');R(x-1,y-23,2,8,'#2a1a10');return}
 if(p.t==='mic'){R(x,y-26,1,26,'#888');R(x-3,y,7,1,'#555');R(x-1,y-29,3,4,'#333');return}
 if(p.t==='spotlight'){g.globalAlpha=.16;for(let i=0;i<20;i++)R(x-6-i*1.2,i*5,12+i*2.4,5,'#fff6c0');g.globalAlpha=1;return}
 return _dp(p);
}}

/* =================================================================
   PERIOD 2 · HISTORY — OFF WITH THEIR HEADS (Mr. Grieve)
   ================================================================= */
mission('heads',{name:'Off With Their Heads',icon:'🪓',who:['arjun','david','omer','hasan'],
 blurb:'Mr. Grieve doesn’t teach history. He re-enacts it. Today is the French Revolution, and he spent spring break building the guillotine himself.',
 parts:['Period 2, History: the people’s court'],tips:['Even day, Period 2, History. David brought his laminated birth certificate. He always does.'],
 variants:{saved:'Saved the king',grieve:'The blade remembered',arjun:'Long live the Republic'}});
hook({mis:'heads',day:'even',period:1,room:'history',who:'auto',run:async()=>{
 const c=await classIn('history',{kids:['hasan','arjun','omer','david','aidan','kid1'].filter(n=>!D.dead[n]),fixed:{hasan:0,arjun:1,omer:3,david:5,aidan:8,kid1:9},you:2});
 cue('history');D.f.guillotineOut=1;const gl=prop({t:'guillotine',x:286,y:0,by:28,rope:1,layer:-300});
 await N('Period 2. History. There is a guillotine in the corner. It’s not a model. It’s taller than Mr. Grieve, and it smells of fresh varnish.');
 await say('grieve','France. 1793. The people have had ENOUGH. And so, frankly, have I.','angry');
 await scrawl('history',[],'#000');
 await say('grieve','I built her over spring break. Ash and oak. The blade is from a combine harvester. Her name is Margaret.','happy');
 await say('arjun','Sir, is that your real moustache, or did a squirrel die on your face during the war?','smirk');
 await say('grieve','…Thank you, Arjun. You’ve just volunteered to be King Louis the Sixteenth.','evil');
 A.arjun.pose=null;await Promise.all([walk('arjun',274,60),tw(A.arjun,{y:120},500)]);A.arjun.pose='kneel';A.arjun.dir=1;
 await N('Mr. Grieve kneels Arjun down and closes the wooden collar round his neck. It clicks. Arjun stops smirking at exactly the click.');
 await say('grieve','The people’s court will now vote. Hands up for GUILTY.','yell');
 const v=await choose(['Vote guilty. He did call his moustache a squirrel.','Vote innocent and make a speech.','“Sir, this is a real blade.”']);
 if(v===0){await N('Hands go up. Omer’s goes up first. Hasan’s goes up so fast he nearly dislocates it.');await say('arjun','(from the collar) You’re all DEAD to me.','angry')}
 if(v===1){await say('you','Citizens! He’s horrible, but he’s OUR horrible. Who else is going to tell David his mom calls him “the first one”?');await say('david','…That’s a fair point, actually.','sad');await N('Three hands go up for innocent. Mr. Grieve looks at them the way you’d look at a dog that’s been sick on a carpet.')}
 if(v===2){await say('you','Sir. That blade is real.');await say('grieve','History is real, boy. That’s what makes it HISTORY.','evil')}
 await say('grieve','The people have spoken. And when the people are WRONG, the historian corrects them.','evil');
 A.grieve.pose=null;await walk('grieve',300,60);face('grieve',-1);pose('grieve','reach');
 const o=[{t:'Run up and shove Arjun out of the collar.'},{t:'“David — your laminated birth certificate. Jam the blade.”',dis:!A.david,why:'David isn’t here'},{t:'Do nothing. It’s history.'}];
 const ch=await choose(o,'His hand is on the rope.');
 if(ch===0){
  A.you.pose=null;await Promise.all([walk('you',262,140),tw(A.you,{y:122},300)]);pose('you','grab');
  const ok=await mash('Get the collar open!',{need:18,time:3.5,info:'The rope is moving. MASH!'});
  if(ok){SFX.click();await tw(A.arjun,{x:252},200);A.arjun.pose='lie';pose('you',null);
   await tw(gl,{by:84},140,'in');SFX.thud();shake(1.2);
   await N('The blade comes down on an empty collar and buries itself four inches into Margaret’s base.');
   await say('arjun','(on the floor, very pale) …I take it back. About the moustache. It’s a lovely moustache.','scared');
   await say('grieve','(weeping into the rope) Two weeks of spring break. Two WEEKS.','cry');
   await classOut(c);await complete('heads','saved');return}
  pose('you',null);await tw(gl,{by:84},140,'in');SFX.squelch();shake(1.4);
  await behead('arjun',1);
  await N('You get one hand on the collar. Margaret gets the rest.');
  await say('grieve','VIVE LA RÉPUBLIQUE!','happy');
  await classOut(c);await complete('heads','arjun');return;
 }
 if(ch===1){
  await say('david','(holding it up) Laminated at two hundred microns. It’s never failed me.','happy');
  await walk('david',274,140);pose('david','reach');SFX.whoosh();
  await tw(gl,{by:58},140,'in');SFX.thud();shake(.8);pose('david',null);
  await N('The blade hits two hundred microns of laminated David and stops dead, a thumb’s width above Arjun’s neck.');
  await say('grieve','JAMMED? Margaret does NOT jam.','angry');
  await walk('grieve',286,60);face('grieve',-1);pose('grieve','reach');
  await N('He leans right in under the frame to look. David’s birth certificate slides out with a little pop.');
  await tw(gl,{by:84},120,'in');SFX.squelch();shake(1.5);flash('#a00010',.4);
  await behead('grieve',-1);
  await N('Margaret finishes the job she started. Just not on the job she was given.');
  SFX.click();await tw(A.arjun,{x:250},200);A.arjun.pose=null;
  await say('arjun','…Is it too soon to do a squirrel joke?','shock');
  await say('omer','Yes.');
  await classOut(c);await complete('heads','grieve');return;
 }
 await tw(gl,{by:84},140,'in');SFX.squelch();shake(1.4);
 await behead('arjun',1);
 await N('History repeats itself. It just did.');
 await say('grieve','VIVE LA RÉPUBLIQUE! Homework: two sides on why that was necessary.','happy');
 await say('hasan','(very quietly) …I voted guilty. I voted GUILTY.','cry');
 await classOut(c);await complete('heads','arjun');
}});

/* =================================================================
   PERIOD 2 · ART — STILL LIFE (Miss Dahl)
   ================================================================= */
mission('stilllife',{name:'Still Life',icon:'🗿',who:['marcus','corey','dheva','stella'],
 blurb:'Miss Dahl says nothing alive is ever truly still. She means to fix that. Today’s still life is Marcus.',
 parts:['Period 2, Art: the statue'],tips:['Even day, Period 2, Art. The plaster sets in about four minutes.'],
 variants:{free:'Chiselled out',critique:'Art criticism',set:'Very, very still'}});
hook({mis:'stilllife',day:'even',period:1,room:'art',who:'auto',run:async()=>{
 const kids=['corey','abby','dheva','marcus','stella','sean'].filter(n=>!D.dead[n]);
 const c=await classIn('art',{kids,fixed:Object.fromEntries(kids.map((n,i)=>[n,i])),you:6});
 cue('art');hold('dahl','brush');
 await N('Period 2. Art. The skylight makes everything look like it’s in a gallery. There’s a bucket of plaster by the sink, steaming slightly.');
 await say('dahl','Still life, my darlings. A bowl of fruit. A skull. A boy.','happy');
 await say('dahl','Fruit rots. Skulls are cheap. But a boy… a boy who never stops MOVING…','smirk');
 await say('dahl','Marcus. On the plinth, please.','happy');
 await say('marcus','I’ve never been asked to model before. Be gentle, Miss. It’s my first time being art.','smirk');
 A.marcus.pose=null;await walk('marcus',166,60);A.marcus.y=134;face('marcus',1);
 const pl=prop({t:'plaster',follow:'marcus',h:0,x:0,y:0,layer:2});
 await N('She starts painting him. Then she stops painting him. Then she picks up the bucket.');
 pose('dahl','throw');SFX.squelch();await tw(pl,{h:8},700);pose('dahl','paint');
 await say('marcus','Miss, it’s quite warm. On my legs. I’d like that on record.','scared');
 await say('dahl','Shh. Don’t move. Nothing worth painting moves.','smirk');
 await tw(pl,{h:16},900);
 await say('marcus','Miss, I can’t feel my— I can’t feel any of my bits. Any of them.','scared');
 if(A.corey)await say('corey','(whispering) She’s going all the way up. She’s going to do his face.','shock');
 const ch=await choose(['Grab the chisel from the clay table.','Distract her with art criticism.','Stay still. Like she said.'],'The plaster is at his chest.');
 if(ch===0){
  A.you.pose=null;await walk('you',150,90);hold('you','knife');pose('you','slam');
  const ok=await mash('Chisel him out!',{need:20,time:5,info:'Fries fly. Don’t chisel his face. MASH!',onHit(){pl.cracks=(pl.cracks||0)+1;parts.push({x:A.marcus.x+rand(-6,6),y:A.marcus.y-pl.h+rand(0,pl.h),vx:rand(-30,30),vy:rand(-30,0),c:'#ecebe4',s:1,fy:A.marcus.y,life:1})}});
  pose('you',null);hold('you',null);
  if(ok){pl.hide=1;SFX.glass();A.marcus.pose=null;await N('The plaster comes off in a single shell, shaped exactly like Marcus. It stands up on its own. It’s a better likeness than any painting.');await say('marcus','(free, dusty) I’ve never been so grateful to be hit with a chisel.','happy');await say('dahl','…You’ve made sculpture. By accident. I hate it. B-plus.','sad');await classOut(c);await complete('stilllife','free');return}
  await tw(pl,{h:30},600);
 }
 if(ch===1){
  const r=await choose(['“It’s derivative, Miss. Very 2019.”','“The negative space is doing all the heavy lifting.”','“It says nothing about the human condition.”'],'Say something an art critic would say.');
  await say('you',['It’s derivative, Miss. Very 2019.','The negative space is doing all the heavy lifting, Miss.','It says nothing about the human condition.'][r]);
  if(r===2){await say('dahl','(dropping the bucket) …It DOESN’T, does it. It’s just… a boy. In a bucket. Oh God. Oh God, I’m a hack.','cry');pl.hide=1;A.marcus.pose=null;await N('She runs out of the room crying. You crack Marcus out with a pencil sharpener. It takes the rest of the lesson.');await classOut(c);await complete('stilllife','critique');return}
  await say('dahl','How DARE you. Plaster. MORE plaster.','evil');await tw(pl,{h:30},600);
 }
 await tw(pl,{h:34},800);
 await N('The plaster closes over the top of his bangs. For four minutes there’s the faint sound of somebody humming in there. Then there isn’t.');
 D.dead.marcus=1;
 await say('dahl','(stepping back, crying with joy) STILL. Finally. Perfectly STILL.','happy');
 await say('dheva','She’s going to put him in the corridor. She’s going to put him by the trophies, isn’t she.','shock');
 await classOut(c);await complete('stilllife','set');
}});

/* =================================================================
   PERIOD 4 · MUSIC — PERFECT PITCH (Mr. Fenwick)
   ================================================================= */
mission('pitch',{name:'Perfect Pitch',icon:'🎼',who:['kenneth','sean','stella'],
 blurb:'Mr. Fenwick has perfect pitch, a tuning fork, and no tolerance. Kenneth has a solo. Kenneth has never once sung in tune.',
 parts:['Break: Kenneth is panicking','Period 4, Music: the solo'],tips:['Even day, break, gym. Kenneth needs a coach. Sean has the voice.','Even day, Period 4, Music. Stay on the beat.'],
 variants:{sang:'He sang',duet:'Sean and Stella take it',fork:'Tuned'}});
hook({mis:'pitch',day:'even',period:2,room:'gym',who:'kenneth',label:'Ask Kenneth why he’s humming',look:{pose:null,ex:'scared'},cond:()=>!D.f.pitch1,run:async()=>{
 scene('gym',{kenneth:[220,-1,{y:146,ex:'scared'}],you:[196,1,{y:152}]});
 await say('kenneth','(humming, badly) Fenwick gave me the solo in the school song. ME. On purpose. As a punishment.','scared');
 await say('kenneth','Last year he tuned Gareth Price. With the fork. Gareth Price can only hear in B flat now.','scared');
 const c=await choose(['“Get Sean to coach you. His voice is disgustingly good.”','“Just mime.”','“Sing it for me now.”']);
 if(c===0){D.f.pitchCoach=1;await N('Sean makes Kenneth breathe into his stomach on the bench for ten minutes. By the end, Kenneth can hit nearly three notes.');await say('kenneth','I’m a tenor. I didn’t know I was a tenor. I thought I was a kind of shout.','happy')}
 if(c===1){D.f.pitchMime=1;await say('kenneth','Mime. Yeah. He’ll never— he’ll definitely notice. He notices if you breathe in the wrong key.','scared')}
 if(c===2){await say('kenneth','(singing) “Highgate, oh Highgate, our hearts and our—”','closed');SFX.bad();await N('A pigeon outside the window takes off in a hurry.');await say('you','…Okay.')}
 D.f.pitch1=1;part('pitch',1);
}});
hook({mis:'pitch',day:'even',period:3,room:'music',who:'auto',run:async()=>{
 const kids=['sean','stella','abby','kenneth','marcus','jacob','paul'].filter(n=>!D.dead[n]);
 const fx={};kids.forEach((n,i)=>fx[n]=i<3?i:i+1);
 const c=await classIn('music',{kids,fixed:fx,you:3});
 cue('music');hold('fenwick','baton');
 await N('Period 4. Music. The foam eats every sound that isn’t music. Mr. Fenwick holds his tuning fork like a cigarette.');
 await say('fenwick','The school song. From the top. And Kenneth will take the solo at bar sixteen.','smirk');
 await say('fenwick','If anybody sings flat, I will find them. I always find them.','evil');
 SFX.ding();pose('fenwick','conduct');for(const k of kids)if(A[k])A[k].ex='closed';
 await N('The choir starts. It isn’t bad. Sean’s voice comes up through the middle of it like warm water.');
 if(!A.kenneth){await say('fenwick','No soloist. Pathetic. Again, from the top.');await classOut(c);return}
 A.kenneth.ex='scared';
 const hits=await rhythm('Kenneth’s solo — keep him on the beat',{n:8,gap:.8,window:D.f.pitchCoach?.28:.17});
 const ok=hits>=(D.f.pitchMime?8:5);
 if(ok){
  A.kenneth.ex='closed';await say('kenneth','(singing, and actually singing) “…and when the bell has rung its last, and Friday’s done, let Friday pass…”','closed');
  await N('Mr. Fenwick lowers the baton. Nobody in the room has ever sung that verse before. It isn’t in the songbooks.');
  await say('fenwick','…Where did you learn that verse.','shock');
  await say('kenneth','I don’t know, sir. It was just… there.','scared');
  await say('fenwick','(putting the fork away, very carefully) Nobody’s sung that since 1987.','sad');
  await classOut(c);await complete('pitch','sang');return;
 }
 await say('fenwick','FLAT.','evil');
 if(A.sean&&A.stella){
  const s=await choose(['Nudge Sean: “Take the solo. Now.”','Let Fenwick tune him.']);
  if(s===0){
   await N('Sean stands up mid-bar and takes the line over like he was always meant to have it. Stella comes in underneath him on the harmony without being asked.');
   await say('sean','(singing) “…our hearts and our hands, our Fridays, our friends…”','closed');await say('stella','(harmonising) “…our Fridays, our friends…”','love');
   cue('romance');fxState.romance=.3;await N('It’s so good that Mr. Fenwick forgets about Kenneth entirely. He conducts with his eyes shut. Kenneth sits down very quietly and lives.');fxState.romance=0;
   await classOut(c);await complete('pitch','duet');return;
  }
 }
 await walk('fenwick',A.kenneth.x-12,90);hold('fenwick',null);
 const f=prop({t:'fork',x:A.kenneth.x-2,y:A.kenneth.y-34});SFX.ding();await wait(300);
 await tw(f,{x:A.kenneth.x+3},120);SFX.squelch();blood(A.kenneth.x+4,A.kenneth.y-28,30,1,60,A.kenneth.y+2);shake(1);
 kill('kenneth','lie',{pool:22});f.hide=1;
 await N('He tunes Kenneth. Through the ear. The note it makes is a perfect A.');
 await say('fenwick','There. Now you’re in tune. Forever. From the top, everyone.','happy');
 await classOut(c);await complete('pitch','fork');
}});

/* =================================================================
   PERIOD 4 · ICT — CTRL+ALT+DELETE (Mrs. Byte)
   ================================================================= */
mission('delete',{name:'Ctrl+Alt+Delete',icon:'💻',who:['nivaan','mia','kayden'],
 blurb:'Mrs. Byte has replaced the attendance list with an AI called HIGHGATE OS. It grades every student in real time. The lowest score gets “deleted”. Nobody knows what that means yet.',
 parts:['Break: Nivaan and Mia have a plan','Period 4, ICT: log in as admin'],tips:['Even day, break, main corridor. You’ll need the admin password. Ms. Sherman’s cat might help.','Even day, Period 4, ICT.'],
 variants:{admin:'Admin access',spark:'Hard reset'}});
hook({mis:'delete',day:'even',period:2,room:'corridor',who:'nivaan',label:'Ask Nivaan what he’s typing',look:{pose:'phone',ex:'angry'},cond:()=>!D.f.del1,run:async()=>{
 scene('corridor',{nivaan:[120,-1,{pose:'phone',y:146}],mia:[148,-1,{y:146,pose:'cross'}],you:[96,1,{y:154}]},true);
 await say('nivaan','HIGHGATE OS. Byte’s AI. It’s been scoring us. Live. I’m on 41. Kayden’s on 3. Three, out of a hundred.','scared');
 await say('mia','Last week Tyler was bottom. Now he’s not on the attendance list. Not absent. Not on it. Like he never existed.','angry');
 await say('nivaan','If I can get admin, I can turn the scoring off. I just need the password. It’s some teacher’s. They all use the same one.','smirk');
 const c=await choose([{t:'“Mr. Biscuits.” Sherman’s dead cat.',dis:!P.intel.shermianCat,why:'you don’t know the cat’s name'},{t:'“Password123.”'},{t:'“I don’t know.”'}]);
 if(c===0){D.f.delPass=1;await say('nivaan','MrBiscuits1… capital M… exclamation mark… WE’RE IN. Oh my God. All the teachers use it. The PRINCIPAL uses it.','happy')}
 else if(c===1){await say('nivaan','Account locked. Account locked for twenty minutes. Thanks.','angry')}
 else await say('mia','Then we do it the cadet way. We pull the plug.','smirk');
 D.f.del1=1;part('delete',1);
}});
hook({mis:'delete',day:'even',period:3,room:'ict',who:'auto',run:async()=>{
 const kids=['nivaan','david','kayden','mia','alex','arjun'].filter(n=>!D.dead[n]);
 const c=await classIn('ict',{kids,fixed:Object.fromEntries(kids.map((n,i)=>[n,[0,1,2,5,6,7][i]])),you:3});
 cue('ict');for(const k of kids)if(A[k])A[k].pose='type';
 await N('Period 4. ICT. Fourteen monitors. Fourteen little webcams. The big screen at the front says DELETED: 0, in a font designed to look friendly.');
 await say('byte','Good morning, learners! HIGHGATE OS is scoring your engagement in real time. Smile! Engagement is a smile.','happy');
 await say('byte','Today’s lowest score will be… deleted. Isn’t technology wonderful?','evil');
 if(A.kayden){await N('A little bar over Kayden’s monitor goes red. Then redder.');await say('kayden','Miss, I’m engaging. I’m engaging SO hard right now. Look at my face.','scared')}
 const o=[{t:'Log in as admin. Turn the scoring off.',dis:!D.f.delPass,why:'you need the password'},{t:'Pull the plug on the server cabinet.'},{t:'Engage. Smile harder than anyone has ever smiled.'}];
 const ch=await choose(o,'The red bar is still climbing.');
 if(ch===0){
  pose('you','type');await N('MrBiscuits1! The screen at the front flickers. ADMIN. Every scoreboard in the room blinks out.');
  pose('you',null);
  await say('byte','What? WHAT? Who touched my— who has ADMIN?','evil');
  if(A.nivaan)await say('nivaan','(typing very fast) Changing her score to zero. And… enter.','smirk');
  D.f.ictSpark=1;SFX.static();
  await N('HIGHGATE OS does exactly what it was built to do with the lowest score in the room. The keyboard under Mrs. Byte’s hands lights up blue.');
  prop({t:'spark',x:A.byte.x+6,y:A.byte.y-20});SFX.power();shake(1);A.byte.shake=1;A.byte.hs='messy';A.byte.hairC='#e8f8ff';
  await say('byte','I’m— being— DELETED—','yell');
  kill('byte','lie',{pool:0,bleed:0,spray:0});A.byte.ex='dead';prop({t:'smoke',x:A.byte.x,y:A.byte.y-12});
  await N('The big screen updates itself, cheerfully: DELETED: 1.');
  if(A.kayden)await say('kayden','On God. The robot ate the teacher. I fear nothing now. Except robots.','shock');
  await classOut(c);await complete('delete','admin');return;
 }
 if(ch===1){
  A.you.pose=null;await walk('you',52,120);pose('you','grab');
  const ok=await mash('Yank the power cables!',{need:18,time:4});
  if(ok){D.f.ictSpark=1;SFX.power();shake(1.2);flash('#fff',.6);await N('Every screen goes black at once. Then one, at the front, comes back on by itself. It just says: AGAIN?');pose('you',null);await say('byte','My SYSTEM. Fourteen months of training data. It knew your NAMES.','cry');await say('mia','It knew too much.','smirk');await classOut(c);await complete('delete','spark');return}
  pose('you',null);
 }
 await N('The red bar over Kayden fills. The monitor in front of him turns white.');
 if(A.kayden){SFX.power();A.kayden.shake=1;A.kayden.hs='messy';A.kayden.hairC='#f0f0f0';shake(.8);await say('kayden','(hair standing straight up) …I’m fine. I’m— my eyebrows are gone again.','hurt');A.kayden.shake=0}
 await say('byte','Oh! It just… deletes the eyebrows first. Interesting. We’ll let it finish next lesson.','smirk');
 await classOut(c);part('delete',1,true);
}});

/* =================================================================
   PERIOD 6 · SWIMMING — BREATH TEST (Mrs. Tarn)
   ================================================================= */
mission('breath',{name:'Breath Test',icon:'🏊',who:['hasan','omer','jacob'],
 blurb:'Mrs. Tarn says anyone who can’t hold their breath for two minutes isn’t a swimmer. She helps. With her hands. Hasan has armbands on.',
 parts:['Period 6, Swimming: the deep end'],tips:['Even day, Period 6, Swimming. The deep end has a drain.'],variants:{drain:'Down the drain',jacob:'Jacob throws her',hasan:'Two minutes'}});
hook({mis:'breath',day:'even',period:5,room:'pool',who:'auto',run:async()=>{
 const kids=['omer','paul','jacob','alex','kenneth','hasan'].filter(n=>!D.dead[n]);
 const c=await classIn('pool',{kids,fixed:Object.fromEntries(kids.map((n,i)=>[n,i+1])),you:0});
 cue('pool');
 await N('Period 6. Swimming. The air is warm and wet and smells of chlorine. Somewhere under the deep end, the drain gurgles like it’s swallowing.');
 await say('tarn','BREATH TEST. Into the water. Under you go. Two minutes, or you’re not a swimmer, you’re a passenger.','yell');
 for(const k of kids){if(!A[k])continue;A[k].pose='swim';walk(k,A[k].x,60);tw(A[k],{y:150},500)}
 A.you.pose='swim';await tw(A.you,{y:150},500);
 if(A.hasan){A.hasan.hold='ball';await say('hasan','(in armbands) I can’t swim. I’ve told her. I told her in sixth grade. She said “not with that attitude”.','scared')}
 await say('tarn','Hasan. Armbands OFF.','evil');
 A.tarn.pose=null;await walk('tarn',A.hasan?A.hasan.x-14:150,90);
 if(A.hasan){pose('tarn','grab');A.hasan.hold=null;await tw(A.hasan,{y:166},400);A.hasan.ex='scared';await N('She puts one hand on top of his head and pushes him under, calm as anything, like she’s dunking a cookie.')}
 const ch=await choose(['Dive for the deep-end drain and open it.','“JACOB.”','Hold your own breath. Wait it out.']);
 if(ch===0){
  await walk('you',14,90);await tw(A.you,{y:168},300);
  const ok=await mash('Pull the drain grate!',{need:18,time:4.5,info:'You’re underwater. You don’t have long. MASH!'});
  await tw(A.you,{y:150},300);
  if(ok){
   SFX.rumble();shake(1);await N('The grate comes away. Behind it, in the dark, there are school bags. Old ones. Satchels. The water starts to go.');
   if(A.hasan){await tw(A.hasan,{y:150},300);A.hasan.ex='shock'}
   pose('tarn',null);await walk('tarn',30,60);await tw(A.tarn,{y:166},400);
   await N('Mrs. Tarn goes after it with her whistle in her mouth, furious, and the drain takes her by the ankle. She goes in up to the waist. She stays there.');
   await say('tarn','(from the drain) This is NOT a breath test this is NOT a—','yell');
   await say('omer','Two minutes, Miss. Or you’re a passenger.','smirk');
   await classOut(c);await complete('breath','drain');return;
  }
 }
 if(ch===1&&A.jacob){
  await say('you','JACOB!');
  await walk('jacob',A.tarn.x+12,90);pose('jacob','hold');await hop('tarn',24,600);await tw(A.tarn,{x:24,y:160},400);SFX.splat();shake(1);
  await N('Jacob lifts Mrs. Tarn over his head and throws her into the deep end with the lane rope still wrapped round her. She comes up spitting her whistle.');
  if(A.hasan){await tw(A.hasan,{y:150},300);await say('hasan','(breathing again) …I can see GOD. God has a gear-stick head too.','cry')}
  await say('jacob','Nobody pushes people under. Not when I’m here.','angry');
  await classOut(c);await complete('breath','jacob');return;
 }
 const r=await mash('Hold your breath!',{need:24,time:6,decay:2,info:'Stay calm. MASH slowly… no, fast.'});
 if(A.hasan){
  if(r){await tw(A.hasan,{y:150},300);await say('tarn','(letting go) …One minute fifty-eight. Close enough. You’re a SWIMMER, Hasan.','happy');await say('hasan','(spluttering) I’m— I’m a swimmer?','cry');await classOut(c);await complete('breath','hasan');return}
  A.hasan.ex='dead';kill('hasan','lie',{pool:0,bleed:0,spray:0});await N('When she lets go, Hasan doesn’t come up. The armbands do.');
 }
 await say('tarn','Passenger.','smirk');
 await classOut(c);
}});

/* =================================================================
   PERIOD 6 · WOODWORK — MEASURE TWICE (Mr. Oakes)
   ================================================================= */
mission('measure',{name:'Measure Twice',icon:'🪚',who:['tez','dheva','angelo'],
 blurb:'Mr. Oakes builds coffins in his spare time. He measures students in class. “For later.” Today he’s measuring Dheva.',
 parts:['Lunch: Tez knows about Mr. Oakes','Period 6, Woodwork: the lathe'],tips:['Even day, lunch, the bathroom. Tez has been measured before.','Even day, Period 6, Woodwork. The big red button stops the lathe.'],
 variants:{stop:'Emergency stop',coffin:'Measured for his own'}});
hook({mis:'measure',day:'even',period:4,room:'toilets',who:'tez',label:'Ask Tez about Mr. Oakes',look:{x:292,dir:-1,pose:'lean'},cond:()=>!D.f.oak1,run:async()=>{
 scene('toilets',{tez:[292,-1,{pose:'lean',y:146}],you:[260,1,{y:154}]});
 await say('tez','Oakes measured me in sixth grade. Shoulders, height, “depth”. Said he’d have it ready for when I left.','smirk');
 await say('tez','Six years in tenth grade. I’m not leaving. He can’t finish my coffin. That’s my whole retirement plan.','smirk');
 await say('tez','The lathe in his room has an emergency stop. Big red button. He’s taped over it. Here.','smirk');
 give('tapepeel');ITEMS.tapepeel='A thumbnail with nothing under it (for peeling tape)';
 await N('He shows you his thumbnail. It’s very long. He says you’ll need one like it. He lends you a nail file and tells you to keep it.');
 D.f.oak1=1;part('measure',1);
}});
hook({mis:'measure',day:'even',period:5,room:'woodwork',who:'auto',run:async()=>{
 const kids=['tez','dheva','angelo','aidan','marcus','nivaan'].filter(n=>!D.dead[n]&&!(n==='aidan'&&D.f.aidanDead));
 const c=await classIn('woodwork',{kids,fixed:Object.fromEntries(kids.map((n,i)=>[n,[0,1,2,3,6,7][i]])),you:8});
 cue('woodwork');
 const la=prop({t:'lathe',x:150,y:122,stop:true,layer:-30});
 await N('Period 6. Woodwork. Sawdust on everything. Two coffins leaning against the back wall with paper tags on them. One tag says T. (YR 11). The other one is blank.');
 await say('oakes','Measure twice, cut once. Measure ten times, and you know someone. Dheva, come and help me on the lathe.','smirk');
 if(A.dheva){A.dheva.pose=null;await walk('dheva',170,60);pose('dheva','saw');await N('Dheva leans over the lathe in his black tee, track pants and his oversized hoodie on top. The drawstring is very long. The lathe is very fast.')}
 hold('oakes','clipboard');await say('oakes','(holding up a tape measure against Dheva’s back) Five eight. Narrow shoulders. Lovely. Quick job.','smirk');
 if(A.dheva){SFX.power();A.dheva.shake=1;await tw(A.dheva,{x:162},200);await say('dheva','My STRING— my hoodie string’s in the— it’s PULLING—','yell')}
 const ch=await choose([{t:'Peel the tape off the emergency stop.',dis:!D.f.oak1,why:'it’s taped over; you’d need a nail'},{t:'Pull Dheva back by the hood.'},{t:'Shout for Mr. Oakes.'}],'The lathe is winding Dheva in.');
 if(ch===0){A.you.pose=null;await walk('you',176,140);pose('you','reach');const r=await meter('Peel the tape, hit the button',{speed:1.35});pose('you',null);
  if(r){la.stop=false;SFX.click();SFX.ding();if(A.dheva){A.dheva.shake=0;pose('dheva',null)}await N('The lathe winds down with a long sad whine. Dheva’s hoodie string is wound round it forty times. It looks like a very expensive yo-yo.');await say('dheva','(on his knees) My hair. Is my hair okay. Tell me my hair is okay.','cry');await say('oakes','(writing on the blank coffin tag, then crossing it out) …Shame.','sad');await classOut(c);await complete('measure','stop');return}}
 if(ch===1||ch===0){A.you.pose=null;await walk('you',A.dheva?A.dheva.x+10:176,140);pose('you','grab');const ok=await mash('Pull him back!',{need:20,time:4});pose('you',null);
  if(ok&&A.dheva){A.dheva.shake=0;await tw(A.dheva,{x:186},200);SFX.whoosh();await N('The string snaps. You both go over backwards into the sawdust. The lathe keeps the string. It seems pleased with it.');
   await say('oakes','(stepping back to look) Careless. CARELESS.','angry');
   await walk('oakes',260,70);face('oakes',1);
   await N('He backs into his own blank coffin. It tips. He tips. The lid drops shut on top of him, and the latch, which he made himself, very well, clicks.');
   prop({t:'coffin',x:262,y:146});A.oakes.vis=false;D.dead.oakes=1;
   await say('oakes','(muffled) …It’s a perfect fit.','sad');
   await say('angelo','I’ve got nails. Two bucks. I’m not saying do it. I’m saying I’ve got nails.','smirk');
   await classOut(c);await complete('measure','coffin');return}}
 if(A.dheva){SFX.squelch();shake(1.4);blood(A.dheva.x,A.dheva.y-24,60,1,120,A.dheva.y+2);kill('dheva','crush',{pool:30});await N('The lathe takes the string, then the hood, then Dheva. Mr. Oakes turns it off with his foot and writes a number on the blank tag.')}
 await say('oakes','Five eight. Quick job.','smirk');
 await classOut(c);
}});

/* =================================================================
   PERIOD 8 · PSYCHOLOGY — YOU ARE GETTING SLEEPY (Dr. Lyle)
   ================================================================= */
mission('sleepy',{name:'You Are Getting Sleepy',icon:'🌀',who:['arjun','david','mia','aidan'],
 blurb:'Dr. Lyle is “researching suggestion”. He has a pocket watch, a window on the third floor, and a class full of very suggestible fifteen-year-olds.',
 parts:['Period 8, Psychology: the watch'],tips:['Even day, Period 8, Psychology. Don’t look at the watch.'],variants:{watch:'Broke the watch',himself:'He looked'}});
hook({mis:'sleepy',day:'even',period:6,room:'psych',who:'auto',run:async()=>{
 const kids=['aidan','david','mia','arjun','hasan','corey'].filter(n=>!D.dead[n]&&!(n==='aidan'&&D.f.aidanDead));
 const c=await classIn('psych',{kids,fixed:Object.fromEntries(kids.map((n,i)=>[n,[0,1,3,5,6,8][i]])),you:2});
 cue('psych');hold('lyle','watch');
 await N('Period 8. Psychology. The blinds are down. The spiral poster on the board turns when you’re not looking straight at it.');
 await say('lyle','Today we study suggestion. Watch the watch. Breathe with the watch. You are getting… very… sleepy.','closed');
 for(const k of kids)if(A[k])A[k].ex='closed';
 await N('One by one, heads go down. Mia fights it for longer than anyone. Then even Mia’s head goes down.');
 await say('lyle','Arjun. Say something kind.','smirk');
 if(A.arjun)await say('arjun','(eyes shut, in a voice nobody has ever heard him use) Hasan, your head is a perfectly normal shape and I’m scared of how much I like you.','closed');
 if(A.hasan)await say('hasan','(eyes shut) …thank you…','closed');
 await say('lyle','David. Tell us a secret.','smirk');
 if(A.david)await say('david','(eyes shut) I’ve never once won anything. I keep a list of everyone who voted for me. It’s nine names long. I read it at night.','closed');
 await say('lyle','Wonderful. Now, everybody. Stand up. Walk to the window. It’s a lovely day for flying.','evil');
 for(const k of kids)if(A[k]){A[k].pose='zombie';walk(k,300,24)}
 A.you.ex='closed';
 const r=await meter('Don’t look at the watch. Wake up.',{speed:1.2,zone:.22});
 if(!r){A.you.pose='zombie';await walk('you',300,24);await N('It’s a lovely day for flying. It really is. You don’t remember the window. You remember the sky.');kill('you','lie',{pool:0,bleed:0,spray:0});await die('window')}
 A.you.ex='angry';
 const ch=await choose(['Snatch the watch and smash it.','Turn the watch round so he’s looking at it.']);
 A.you.pose=null;await walk('you',A.lyle.x+12,140);
 if(ch===0){pose('you','grab');hold('lyle',null);SFX.glass();shake(.8);await N('You grab the watch and smash it on the radiator. The spiral on the board stops turning. Everybody stops walking at once, a foot from the window.');
  for(const k of kids)if(A[k]){A[k].tx=null;A[k].moving=false;A[k].pose=null;A[k].ex='shock'}
  await say('mia','(blinking) Why am I at the window. Why are we ALL at the window.','angry');
  if(A.arjun)await say('arjun','Did I say something nice? Tell me I didn’t say something nice.','scared');
  await say('lyle','You’ve destroyed six years of research.','sad');
  await say('mia','You were going to make us jump out of a window.','angry');
  await say('lyle','…That was the research.','smirk');
  await classOut(c);await complete('sleepy','watch');return}
 pose('you','reach');await N('You turn the watch round in his hand. He looks down at it. That’s all it takes.');
 ex('lyle','closed');await say('lyle','…oh… very… sleepy…','closed');
 for(const k of kids)if(A[k]){A[k].tx=null;A[k].moving=false;A[k].pose=null;A[k].ex='shock'}
 A.lyle.pose='zombie';await walk('lyle',318,24);A.lyle.vis=false;D.dead.lyle=1;SFX.glass();
 await N('Dr. Lyle walks calmly across the room, opens the window, and steps out onto the lovely day. Third floor. The car alarm takes a second to start.');
 await say('corey','(waking up) …Did he just—','shock');
 await say('aidan','He looked. They always look.','smirk');
 await classOut(c);await complete('sleepy','himself');
}});
DEATHS.window={name:'A Lovely Day for Flying',desc:'You looked at the watch.',hint:'Psychology. Don’t look at the watch.'};

/* =================================================================
   PERIOD 8 · ASSEMBLY — HIGHGATE’S GOT TALENT (Mr. Adam)
   ================================================================= */
mission('talent',{name:'Highgate’s Got Talent',icon:'🎤',who:['paul','marcus','kayden','sean','stella'],
 blurb:'Mr. Adam has turned Period 8 into a talent show for the inspectors. There are no inspectors. There’s a Zoom link on the projector that goes nowhere.',
 parts:['Lunch: sign the acts up','Period 8, Assembly: the show'],tips:['Even day, lunch, gym. Paul’s doing the sign-up sheet. Pick the running order.','Even day, Period 8, the hall.'],
 variants:{win:'Standing ovation',adam:'Mr. Adam’s act'}});
hook({mis:'talent',day:'even',period:4,room:'gym',who:'paul',label:'Look at Paul’s sign-up sheet',look:{hold:'clipboard',pose:null},cond:()=>!D.f.tal1,run:async()=>{
 scene('gym',{paul:[200,-1,{y:144,hold:'clipboard'}],you:[176,1,{y:152}]});
 await say('paul','Talent show. Period 8. Mr. Adam said “bring me something the inspectors will remember”. I wrote “wrestling”. I wrote it four times.','happy');
 await say('paul','You pick the order. Opener, middle, closer. Crowd’s got to be warm by the end or Adam cries on stage again.','smirk');
 const acts=[['paul','Paul: wrestling (on a crash mat, probably)'],['marcus','Marcus: stand-up (eleven minutes, “all clean”)'],['kayden','Kayden: drill (“Highgate Hittaz Anthem”)'],['sean','Sean & Stella: a duet']].filter(a=>!D.dead[a[0]]);
 const order=[];const left=acts.slice();
 for(const slot of['opener','middle act','closer']){if(!left.length)break;const i=await choose(left.map(a=>a[1]),'The '+slot+'?');order.push(left[i][0]);left.splice(i,1)}
 D.f.talOrder=order;
 await say('paul',order[order.length-1]==='sean'?'Closing on the duet. Sensible. Disgustingly sensible.':'Interesting choices. Brave. Possibly fatal.','happy');
 D.f.tal1=1;part('talent',1);
}});
hook({mis:'talent',day:'even',period:6,room:'hall',who:'auto',run:async()=>{
 const cast={adam:[160,1,{y:100,pose:'mic'}],you:[150,-1,{y:164,pose:'sit'}]};
 const seats=[[30,118],[70,118],[110,132],[200,132],[240,118],[280,132],[50,148],[90,148],[230,148],[270,164],[20,164],[300,148]];
 const crowdIds=['hasan','arjun','david','omer','nivaan','corey','alex','dheva','jacob','kenneth','mia','aidan'].filter(n=>!D.dead[n]&&!(n==='aidan'&&D.f.aidanDead));
 crowdIds.forEach((n,i)=>cast[n]=[seats[i][0],1,{y:seats[i][1],pose:'sit'}]);
 scene('hall',cast,true);prop({t:'spotlight',x:160,y:0,layer:-50});prop({t:'mic',x:146,y:102,layer:-1});
 cue('hall');
 await N('Period 8. The main hall. The whole year, in rows. On the projector, a Zoom call with nobody in it. It says “Waiting for host”. It has said that since twelve.');
 await say('adam','(into the mic) Inspectors! Welcome! Welcome to Highgate’s Got Talent! Please note our children. Our lovely, normal, talented children.','happy');
 const order=D.f.talOrder||[];let heat=0;
 const run_={
  paul:async()=>{put('paul',334,-1,{y:100});await walk('paul',190,90);put('kenneth',-14,1,{y:100});await walk('kenneth',150,90);pose('paul','grab');await hop('kenneth',18,500);A.kenneth.pose='lie';SFX.thud();shake(1);await say('paul','THANK YOU, HIGHGATE.','happy');heat+=1;remove('paul');A.kenneth.pose=null;remove('kenneth')},
  marcus:async()=>{put('marcus',334,-1,{y:100});await walk('marcus',170,80);await say('marcus','Good afternoon. I’m Marcus. This is a family show, so I’ve prepared eleven minutes of material about sausages.','smirk');const r=await meter('Laugh at the right moment',{speed:1.1});heat+=r?1:0;await say('marcus',r?'Thank you. You’ve been a firm crowd.':'…Tough room. Tough, dry room.','smirk');remove('marcus')},
  kayden:async()=>{put('kayden',334,-1,{y:100});await walk('kayden',170,80);await say('kayden','(rapping) Highgate Hittaz, we don’t do math, we do STRAPS, which are water pistols, we are not a real gang, please do not arrest my cousin—','smirk');heat+=Math.random()<.5?1:0;remove('kayden')},
  sean:async()=>{put('sean',334,-1,{y:100});put('stella',344,-1,{y:100});await walk('sean',176,80);await walk('stella',152,80);face('stella',1);cue('romance');fxState.romance=.4;await say('sean','(singing, the voice coming up through the floor) “…our Fridays, our friends…”','closed');await say('stella','(singing with him) “…let Friday pass.”','love');fxState.romance=0;cue('hall');heat+=2;remove('sean');remove('stella')}
 };
 for(const a of order)if(run_[a]&&!D.dead[a]){await run_[a]();SFX.cheer();await wait(300)}
 if(heat>=3){
  for(const n of crowdIds)if(A[n])A[n].pose='cheer';SFX.cheer();
  await say('adam','(crying into the mic) Did you SEE that, inspectors? Did you SEE them?','cry');
  await N('The Zoom still says “Waiting for host”. Nobody minds. The hall is on its feet. Mr. Adam bows. You’ve never seen him this happy.');
  await complete('talent','win');return;
 }
 await say('adam','(very quietly) …The inspectors look bored. I can feel it. Through the screen.','sad');
 await say('adam','I’ll do an act. I have an act. I’ve been rehearsing it for twenty-two years.','evil');
 await N('He sings “My Way”. All of it. Halfway through, Aidan stands in the back row and starts a slow clap on his own. By the end, everyone is.');
 await complete('talent','adam');
}});
