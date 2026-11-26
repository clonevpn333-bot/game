'use strict';
/* =====================================================================
   HIGHSCHOOL — QUESTS THAT ARE THEIR OWN LITTLE GAMES
   • @highgate.tea  → a whodunit. Four suspects, five clues hidden around
     school, an evidence board, an accusation that can go wrong, and an
     interrogation where you catch the lies with the right clue.
   • The Big Score  → a heist. Plan it on a board (distraction, way in,
     way out), then pull it off: crawl, pick the security cable, outrun
     Big Glen. The plan changes how hard each beat is.
   • Jess from Fair City → a texting game. Text "Jess" as Kenneth and bait
     her into slipping up without making her suspicious.
   ===================================================================== */
const killOld=(m,keep)=>{for(const h of HOOKS.concat(SPOTS))if(h.mis===m&&!(keep&&keep(h))){h.cond=()=>false}};
const DF=k=>D.f[k],DS=(k,v)=>{D.f[k]=v==null?1:v};
OUTCOME_FIX['tea:wrong']='bad';OUTCOME_FIX['tea:gotaway']='bad';OUTCOME_FIX['bigscore:clean']='good';OUTCOME_FIX['bigscore:caught']='bad';OUTCOME_FIX['catfish:turned']='good';

/* =================== 1. @HIGHGATE.TEA — WHODUNIT =================== */
{
const SUS={sean:'Sean',mia:'Mia',david:'David',omer:'Omer'};
const CLUES={
 pc:{room:'library',x:258,per:[2,4],label:'Check the library computers',icon:'🖥',txt:'Library PC 3 was logged into @highgate.tea at 10:21 at break, the minute the post went up. It’s the PC by the printer.',points:'david'},
 detention:{room:'corridor',x:238,per:[0,2,4],label:'Read the detention list on the notice board',icon:'📋',txt:'Ms. Sherman’s detention list: MIA, 10:15 to 10:45 at break. She was in Room 4 with no phone. She couldn’t have posted at 10:21.',clears:'mia'},
 phone:{room:'maths',x:240,per:[4],label:'Look in the confiscated-phones box',icon:'📵',txt:'Sean’s phone is in the confiscation box. Tag: “SEAN, MONDAY, LANGUAGE.” He hasn’t had it all week.',clears:'sean'},
 register:{room:'gym',x:262,per:[2,4],label:'Read Coach’s break register',icon:'🏀',txt:'Coach’s break-time register: OMER, PRESENT, “DETENTION LAPS (CRYING)”. He was running laps at 10:21.',clears:'omer'},
 draft:{room:'library',x:96,per:[2,4],label:'Check the printer tray',icon:'🖨',txt:'A printed page in the tray: three drafted posts. One says “vote DAVID for year rep 😇”. Another calls someone “bestie”. Somebody printed their drafts to proofread them.',points:'david'}};
const MT=MIS.tea;if(MT){MT.parts=['Break: Stella’s been posted about','Find clues around school (3 or more)','Accuse someone','Make them confess'];MT.tips=['Break, the library.','Free periods: library computers + printer, corridor notice board, gym register, Ms. Sherman’s confiscation box (lunch).','Any free period, wherever your suspect is. Open the evidence board first.','Catch the lies. Present the clue that proves it.'];
 MT.goal='Find out who runs @highgate.tea. Four people knew. Find the clues, clear the innocent, catch the liar.';MT.variants=Object.assign(MT.variants||{},{wrong:'Accused the wrong person',gotaway:'They got away with it'})}
killOld('tea',h=>/Ask Stella what’s wrong/.test(h.label||''));
/* after Stella's scene: the four names */
{const h=HOOKS.find(h=>h.mis==='tea'&&/Ask Stella/.test(h.label||''));if(h){const o=h.run;h.run=async function(){const r=await o.apply(this,arguments);if(TEST)return r;
 await say('stella','Sean. Mia. David. Omer. That’s it. That’s everyone I told. One of them is @highgate.tea.','cry');
 await N('Four names. Five places at school where somebody might have left a trace.');teaBoard(true);return r}}}
const found=()=>Object.keys(CLUES).filter(k=>DF('tc_'+k));
const cleared=()=>Object.values(CLUES).filter((c,i)=>c.clears&&DF('tc_'+Object.keys(CLUES)[i])).map(c=>c.clears);
for(const [k,c] of Object.entries(CLUES))spot({room:c.room,period:c.per,x:c.x,y:146,mis:'tea',label:c.label,short:c.icon,cond:()=>DF('tea1')&&!DF('tc_'+k)&&!D.done.tea&&!DF('teaAcc'),run:async()=>{
 pose('you','reach');SFX.pick&&SFX.pick();await wait(300);pose('you',null);await N(c.txt);DS('tc_'+k);
 const n=found().length;toast('🔎 Clue '+n+'/5'+(c.clears?' · '+SUS[c.clears]+' is cleared':''));if(n===1)part('tea',2);
 if(n>=3&&!DF('teaReady')){DS('teaReady');part('tea',3);await N('That’s enough to point a finger. Open the evidence board and decide who you’re accusing.')}
 teaBoard(true);return 'stay'}});
/* the evidence board */
function teaBoard(peek){if(TEST)return Promise.resolve(peek?null:'david');return new Promise(res=>{let o=$('teaboard');if(!o){o=document.createElement('div');o.id='teaboard';document.body.appendChild(o);const st=document.createElement('style');
 st.textContent='#teaboard{position:fixed;inset:0;z-index:60;background:#0a0710e8;display:flex;align-items:center;justify-content:center;font:inherit}#teaboard .bd{background:#3a2a1c;border:6px solid #6a4a2a;box-shadow:inset 0 0 40px #0008;padding:14px;max-width:760px;width:94%;color:#2a2030}#teaboard h2{margin:0 0 8px;color:#f4e0b0;letter-spacing:.2em;font-size:16px;text-align:center}#teaboard .row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}#teaboard .card{background:#f4f0e6;width:150px;padding:8px;transform:rotate(var(--r));box-shadow:2px 3px 0 #0006;position:relative}#teaboard .card b{display:block;font-size:14px}#teaboard .card.cl{opacity:.55}#teaboard .card .st{position:absolute;top:28px;left:8px;color:#c02020;border:2px solid #c02020;padding:1px 6px;transform:rotate(-12deg);font-size:12px;letter-spacing:.1em}#teaboard .card .pt{color:#c02020;font-size:11px}#teaboard .clue{background:#fff8c8;margin:6px 0 0;padding:6px 8px;font-size:11px;box-shadow:1px 2px 0 #0005}#teaboard .btns{display:flex;gap:8px;justify-content:center;margin-top:10px;flex-wrap:wrap}#teaboard button{font:inherit;padding:8px 12px;background:#2a1a10;color:#f4e0b0;border:2px solid #c8a070;cursor:pointer}#teaboard button.acc{background:#6a1010;border-color:#ff6a6a}';document.head.appendChild(st)}
 const f=found(),cl=cleared(),pts={};for(const k of f)if(CLUES[k].points)pts[CLUES[k].points]=(pts[CLUES[k].points]||0)+1;
 o.innerHTML='';const bd=document.createElement('div');bd.className='bd';o.appendChild(bd);const h=document.createElement('h2');h.textContent='@HIGHGATE.TEA · WHO KNEW';bd.appendChild(h);
 const row=document.createElement('div');row.className='row';bd.appendChild(row);let r=0;
 for(const [id,n] of Object.entries(SUS)){const c=document.createElement('div');c.className='card'+(cl.includes(id)?' cl':'');c.style.setProperty('--r',((r++%2?1:-1)*(1+r%3))+'deg');const b=document.createElement('b');b.textContent=n;c.appendChild(b);
  const s=document.createElement('div');s.textContent=cl.includes(id)?'':pts[id]?('🔴 '+pts[id]+' clue'+(pts[id]>1?'s':'')+' point here'):'no proof yet';s.className='pt';c.appendChild(s);if(cl.includes(id)){const st=document.createElement('div');st.className='st';st.textContent='CLEARED';c.appendChild(st)}row.appendChild(c)}
 for(const k of f){const d=document.createElement('div');d.className='clue';d.textContent=CLUES[k].icon+' '+CLUES[k].txt;bd.appendChild(d)}
 if(!f.length){const d=document.createElement('div');d.className='clue';d.textContent='No clues yet. Library computers, the printer, the notice board, Coach’s register, Ms. Sherman’s confiscation box.';bd.appendChild(d)}
 const btns=document.createElement('div');btns.className='btns';bd.appendChild(btns);
 const close=v=>{o.remove();res(v)};
 const cb=document.createElement('button');cb.textContent=peek?'Got it':'Close';cb.onclick=()=>close(null);btns.appendChild(cb);
 if(!peek&&f.length>=3)for(const [id,n] of Object.entries(SUS)){const b=document.createElement('button');b.className='acc';b.textContent='Accuse '+n;b.onclick=()=>close(id);btns.appendChild(b)}
 o.onkeydown=e=>{if(e.key==='Escape')close(null)}})}
/* accusing: any free period, wherever you can find the suspect */
const SUSAT={sean:[[2,'field'],[4,'field'],[0,'corridor']],mia:[[2,'canteen'],[4,'canteen'],[0,'corridor']],david:[[2,'library'],[4,'library'],[0,'corridor']],omer:[[2,'canteen'],[4,'field'],[0,'corridor']]};
for(const [id,pl] of Object.entries(SUSAT))for(const [p,room] of pl)hook({mis:'tea',period:p,room,who:id,label:'Accuse '+SUS[id]+' of running @highgate.tea',look:{ex:'cold'},cond:()=>DF('teaReady')&&!DF('teaAcc')&&!D.done.tea&&!D.dead[id]&&(!TEST||id==='david'),run:async()=>{
 const pickd=await teaBoard(false);if(!pickd)return 'stay';if(pickd!==id){await N('You open your mouth to accuse '+SUS[id]+'. Then you look at the board again. Your suspect isn’t here.');return 'stay'}
 DS('teaAcc');part('tea',4);if(id!=='david')return teaWrong(id);return teaTrial()}});
async function teaWrong(id){cue('sad');await say('you','It’s you. You’re @highgate.tea.');
 await say(id,pick(['(very quiet) …I was in DETENTION. Everybody knows I was in detention.','You think I’d do that to Stella? To STELLA?','Bro. I was literally somewhere else. Check.']),'angry');
 await N('By lunch, the account has posted again. A photo of you, from behind, mid-accusation. Caption: “local detective solves nothing 🕵️ seek help bestie”. 2,000 likes.');
 await say(id,'Don’t talk to me for a while.','cold');await complete('tea','wrong');return 'stay'}
async function teaTrial(){cue('tension',true);
 await say('you','David. It’s you. You’re @highgate.tea.');await say('david','(pushing his glasses up) That’s a very serious accusation. I’d like to respond. Point by point.','smirk');
 const ST=[{t:'“I was in the library at break. So what? Half the school was.”',lie:null},{t:'“I’ve never even logged into that account. I wouldn’t know how.”',lie:'pc'},{t:'“And I would NEVER say “bestie”. I don’t use emojis. I’m running for office.”',lie:'draft'}];
 let strikes=0;const caught={};const fc=found();
 while(Object.keys(caught).length<2&&strikes<3){
  const si=await choose(ST.map((s,i)=>({t:(caught[i]?'✔ ':'')+s.t,dis:!!caught[i]})).concat([{t:'Let it go. Walk away.'}]),'His statements. Which one’s a lie? (strikes: '+strikes+'/3)');
  if(si===3){await say('david','Thought so.','smirk');await complete('tea','gotaway');return 'stay'}
  const ci=await choose(fc.map(k=>CLUES[k].icon+' '+CLUES[k].label.replace(/^(Check|Read|Look in) the /,'').replace(/^(Check|Read|Look in) /,'')).concat(['Nothing. Just say it’s a lie.']),'Show him which clue?');const ck=fc[ci];
  if(ST[si].lie&&ck===ST[si].lie){caught[si]=1;SFX.sting&&SFX.sting();shake(.3);
   await say('you',ck==='pc'?'Library PC 3. Logged in as @highgate.tea at 10:21. The one by the printer. Your seat.':'Your drafts were in the printer tray. “Vote DAVID 😇”. “Bestie”. You printed them to PROOFREAD them, David.');
   await say('david',ck==='pc'?'(a bead of sweat runs into his VOTE DAVID badge) …Lots of people sit there.':'(very quietly) …The printer jams. It always jams. Why didn’t it JAM?','shock')}
  else{strikes++;SFX.bad&&SFX.bad();await say('david',pick(['That proves nothing. Next.','(smiling) Are you even listening to yourself?','Interesting. Wrong, but interesting.']),'smirk')}}
 if(Object.keys(caught).length<2){await N('Three strikes. David straightens his badge, picks up his laptop, and walks away. The account posts at the next bell. About you.');await complete('tea','gotaway');return 'stay'}
 await say('david','(crying, glasses fogging) FINE. It was me. Nobody votes for the nice guy! Nobody even LOOKS at the nice guy! I thought if everyone else looked worse, I’d just… be there.','cry');
 const c=await choose(['Make him delete it and tell Stella himself.','Screenshot the confession. Post it on HIS account.']);
 if(c===1){await N('You post it from his own account: “it was me. david. vote for literally anyone else.” 4,211 followers see it in eleven minutes.');await say('david','…That’s actually a very good post.','sad');await complete('tea','exposed');return 'stay'}
 await N('He deletes @highgate.tea while you watch. Then he goes to find Stella. You see them through the window: him talking, her not looking at him, then looking at him.');await complete('tea','apology');return 'stay'}
}

/* =================== 2. THE BIG SCORE — HEIST =================== */
{
const MB=MIS.bigscore;if(MB){MB.parts=['The plan','The masks','Plan the heist','The heist'];MB.tips=['After school, Fair City Mall rooftop parking. Kayden has a plan.','Lost Property, Main Corridor (far left): three beanies with holes in.','After school, the Food Court: plan it on Kayden’s whiteboard.','Pull it off.'];
 MB.variants=Object.assign(MB.variants||{},{clean:'Got away clean',caught:'Caught by Big Glen'})}
killOld('bigscore',h=>!(h.room==='foodcourt'));
const PLAN={dist:[['Paul fakes a seizure by the fountain',-2,'paul'],['Pull the arcade fire alarm',-1,null],['No distraction. Speed.',1,null]],
 entry:[['Crawl under the counter',0,'crawl'],['Walk up and ask to see the necklace',-1,'talk'],['Vault the counter',1,'vault']],
 exit:[['Escalator down to the parking lot',0,'race'],['Blend into the cinema queue',-1,'blend'],['Out past the fountain',1,'race']]};
hook({mis:'bigscore',period:8,room:'foodcourt',who:'auto',cond:()=>D.f.bs2&&!D.done.bigscore&&!D.dead.kayden,run:async()=>{
 scene('foodcourt',{you:[60,1,{y:156}],kayden:[90,1,{y:150,hold:'paper'}],kid4:[110,1,{y:150}]},true);pprop({t:'kiosk',x:220,y:146,layer:-5});cue('tension');
 await say('kayden','(holding a tiny whiteboard covered in arrows) Okay. The plan. Three decisions. You make them. I believe in you. Mostly.','smirk');
 let heat=2;const pk={};
 const d=await choose(PLAN.dist.map(p=>({t:p[0],dis:p[2]&&(!K[p[2]]||D.dead[p[2]]),why:'not around'})),'1/3 · THE DISTRACTION');heat+=PLAN.dist[d][1];pk.dist=d;
 const e=await choose(PLAN.entry.map(p=>p[0]),'2/3 · THE WAY IN');heat+=PLAN.entry[e][1];pk.entry=PLAN.entry[e][2];
 const x=await choose(PLAN.exit.map(p=>p[0]),'3/3 · THE WAY OUT');heat+=PLAN.exit[x][1];pk.exit=PLAN.exit[x][2];
 heat=clamp(heat,0,5);await say('kayden','HEAT: '+['ice cold','chill','warm','spicy','on fire','LITERALLY on fire'][heat]+'. '+(heat<=1?'This is a GOOD plan. I’ve never had a good plan.':heat>=4?'This is how I go to prison. Love it.':'Could be worse. Could be my plan.'),heat>=4?'shock':'smirk');
 hold('kayden',null);for(const id of['you','kayden','kid4'])pprop({t:'mask',follow:id,dy:-25,layer:1});
 await N('5:15. The Sparkle Hut girl goes on break. Three beanies come down. Kayden’s says WORLD’S BEST GRANDPA. He doesn’t know.');
 /* the distraction */
 if(pk.dist===0){put('paul',-14,1,{y:150});await walk('paul',40,120);pose('paul','hurt');A.paul.shake=1;await say('paul','(flopping onto the floor by the fountain) OH NO. MY LEGS. MY FAMOUS LEGS.','scream');}
 else if(pk.dist===1){SFX.bell&&SFX.bell();shake(.4);await N('The arcade fire alarm goes off. Half the food court stands up. The other half keeps eating.')}
 else await say('kayden','GO GO GO GO GO.','yell');
 /* way in */
 let ok=true;
 if(pk.entry==='crawl'){await walk('you',196,90);pose('you','crouch');ok=await vgSimon(3+Math.max(0,heat-1),'CRAWL. DON’T BUMP ANYTHING.');pose('you',null)}
 else if(pk.entry==='talk'){await walk('you',200,70);await say('you','Hi. Could I see the, uh, necklace? For my grandma. I am wearing a mask for medical reasons.');ok=Math.random()<(heat<=2?.85:.55);await N(ok?'The temp behind the counter is sixteen and has been awake for nineteen hours. He hands it over without looking up.':'The temp looks at your beanie. Your eye holes. The pencil marks. He reaches for the panic button.')}
 else{await walk('you',196,150);await hop('you',10,300);ok=await mash('VAULT THE COUNTER',{need:18+heat*2,time:3.5,info:'MASH!'})}
 if(ok){pose('you','grab');hold('you','necklace');await N('The necklace is still on a security cable. Of course it is.');ok=await vgLock();pose('you',null);if(!ok)await N('The cable alarm shrieks.')}
 /* Big Glen */
 put('glen',334,-1,{y:150});await walk('glen',270,ok?90:150);await say('glen','HITTAZ.','yell');
 if(pk.exit==='blend'&&ok){await Promise.all([walk('you',120,90),walk('kayden',134,90),walk('kid4',146,90)]);for(const id of['you','kayden','kid4'])face(id,-1);
  await N('You pull your beanies off and stand very still in the line for the 5:30 showing of a movie about a talking dog. Big Glen walks past you. Twice.');ok=heat<=3||Math.random()<.5}
 else if(ok){const raced=await vgRace('glen');ok=raced;if(raced)await Promise.all([walk('you',-30,170),walk('kayden',-30,170),walk('kid4',-30,170)])}
 if(!ok){pose('glen','grab');SFX.zap&&SFX.zap();SFX.static&&SFX.static();shake(.8);A.kayden.ex='hurt';pose('kayden','hurt');
  await N('Big Glen gets Kayden with the taser and you by the hood. You spend two hours in the mall office while your mom is called. Kayden is still saying “ow” when she arrives.');
  hold('you',null);await complete('bigscore',pk.exit==='race'?'tased':'caught');return 'stay'}
 await N('Outside, under the streetlight, breathing like you’ve run a marathon, you look at the necklace. On the back of the pendant, tiny: MADE IN CHINA $4.99.');
 await say('kayden','(staring at it) …Eight hundred dollars.','shock');await say('kayden','(slowly putting it on anyway) …The Hittaz are still going legit.','sad');
 hold('you',null);await complete('bigscore','clean');return 'stay'}});
}

/* =================== 3. JESS FROM FAIR CITY — TEXTING GAME =================== */
{
const MC=MIS.catfish;if(MC){MC.parts=['Break: Kenneth shows you the messages','Lunch: Nivaan runs the photos','Text “Jess” as Kenneth','After school: Jess arrives'];MC.tips=['Break, gym.','Lunch, main corridor. Nivaan can find anyone.','Any free period after Nivaan: Kenneth lets you take his phone (gym or field).','After school, the arcade.'];
 MC.variants=Object.assign(MC.variants||{},{turned:'Kenneth turned the tables'})}
const ROUNDS=[
 {jess:'heyyy ken 😊 u up?',opts:[['“yeah. what u doing”',0,0,'nm just thinking abt u 🥺'],['“send a pic of what ur doing rn”',2,1,'lol im shy 🙈 u know that'],['“bro u ever think about how fries are better than chips”',-1,2,'BRO fries are better that’s not even a debate']]},
 {jess:'what u doing after school tmrw?',opts:[['“meeting u obviously 😊”',0,0,'cant wait 🥺🔴'],['“my boy arjun said hes gonna be at the arcade too, u know him?”',2,1,'never heard of him. sounds ugly tbh'],['“basketball. probably gonna dunk on somebody”',-1,1,'lmaooo u cant dunk ur 5’7 bro']]},
 {jess:'wait how do u know im not tall',opts:[['“u just called me 5’7. i never told u that”',1,2,'…u did tell me tho. like a month ago'],['“lol ok send a voice note saying my name”',2,1,'my mic is broke 😭'],['“haha whatever”',-1,0,'😘']]},
 {jess:'anyway 😊 cant wait for tmrw',opts:[['“one question. who’s arjun.the.great@”',3,3,'…'],['“me neither. wear red ❤️”',-1,0,'always 🔴'],['“ur typing exactly like a guy i know”',1,2,'lots of ppl type like this bro']]},
 {jess:'…',opts:[['“bro.”',0,3,'BRO I MEAN. hello?? 😊'],['“say sorry to him”',0,2,'sorry for what lol'],['“arjun.”',1,3,'how did u know it was me']]}];
hook({mis:'catfish',period:[2,4],room:'gym',who:'kenneth',label:'Borrow Kenneth’s phone to text “Jess”',cond:()=>D.f.jess2&&!D.f.jessChat&&!D.done.catfish&&!D.dead.kenneth,run:async()=>catChat()});
hook({mis:'catfish',period:[2,4],room:'field',who:'kenneth',label:'Borrow Kenneth’s phone to text “Jess”',cond:()=>D.f.jess2&&!D.f.jessChat&&!D.done.catfish&&!D.dead.kenneth,run:async()=>catChat()});
async function catChat(){
 await say('kenneth','You want my phone? To text Jess? AS me? …Fine. But be nice. She’s fragile. She told me.','scared');pose('you','phone');
 const r=await chatGame('Jess 💕','Fair City · online',ROUNDS);pose('you',null);D.f.jessChat=1;part('catfish',3);
 if(r.win){D.f.jessProof=1;intel('jessArjun');await N('“how did u know it was me.” Screenshot. Kenneth reads it over your shoulder. His ears go red. Then his whole face goes very, very calm.');await say('kenneth','Okay. Okay. I know how this goes now. Arcade. After school. Leave it to me.','cold')}
 else{await N(r.sus>=5?'Jess blocks Kenneth’s number. Then unblocks it. Then sends “?? u ok”. You hand the phone back before you make it worse.':'Jess didn’t slip. Not this time. Kenneth takes his phone back very carefully, like it might break.')}
 return 'stay'}
/* a little texting game: each reply moves SUSPICION and SLIP; slip 5 = they crack, suspicion 5 = they block you */
function chatGame(title,sub,rounds){if(TEST)return Promise.resolve({win:true,sus:0});return new Promise(res=>{
 const o=$('phoneov');o.hidden=false;o.innerHTML='<div class="ph"><div class="phh"></div><div class="phm"></div><div class="chm" style="padding:6px 8px;font-size:11px;color:#cbbfd8;display:flex;gap:10px;justify-content:center"></div><div class="cho" style="display:flex;flex-direction:column;gap:5px;padding:6px"></div></div>';
 const h=o.querySelector('.phh');h.textContent=title;const sm=document.createElement('small');sm.textContent=sub;h.appendChild(sm);const box=o.querySelector('.phm'),meters=o.querySelector('.chm'),cho=o.querySelector('.cho');
 const bub=(w,t)=>{const d=document.createElement('div');d.className='bub'+(w==='me'?' me':'');d.textContent=t;box.appendChild(d);box.scrollTop=box.scrollHeight};
 let sus=0,slip=0,i=0;const bar=(n,v,c)=>'<span>'+n+' <b style="color:'+c+'">'+'■'.repeat(v)+'□'.repeat(Math.max(0,5-v))+'</b></span>';
 const draw=()=>{meters.innerHTML=bar('SLIP',slip,'#9ad09a')+bar('SUSPICION',sus,'#ff6a5a')};
 const end=win=>{setTimeout(()=>{o.hidden=true;o.innerHTML='';res({win,sus})},1400)};
 const round=()=>{draw();if(slip>=5)return end(true);if(sus>=5){bub('them','ok this is weird. bye 🙄');return end(false)}if(i>=rounds.length)return end(false);
  const R_=rounds[i++];setTimeout(()=>{bub('them',R_.jess);SFX.blip&&SFX.blip();cho.innerHTML='';
   R_.opts.forEach(([t,s,sl,rep])=>{const b=document.createElement('button');b.className='mb';b.style.cssText='font:inherit;font-size:11px;text-align:left;padding:6px 8px';b.textContent=t;b.onclick=()=>{cho.innerHTML='';bub('me',t.replace(/^“|”$/g,''));sus=Math.max(0,sus+s);slip+=sl;draw();setTimeout(()=>{bub('them',rep);round()},900)};cho.appendChild(b)})},600)};
 round()})}
/* the arcade: if you have the proof, Kenneth runs it */
{const h=HOOKS.find(h=>h.mis==='catfish'&&h.room==='arcade');if(h){const o=h.run;h.run=async function(){if(TEST||!D.f.jessProof)return o.apply(this,arguments);
 scene('arcade',{kenneth:[236,1,{y:150,topC:'#c8202c'}],jacob:[284,-1,{y:150}],nivaan:[60,1,{y:150,pose:'film'}],you:[210,1,{y:156}]});cue('tension');
 await N('Kenneth is in a red hoodie by the claw machine. Nivaan is filming from behind the air hockey table. Everyone at the arcade has been told. Everyone.');
 put('arjun',330,-1,{y:150,pose:'film'});await walk('arjun',270,60);
 await say('arjun','(filming, in red) HIIIII KEN. It’s me! Jess! From—','laugh');
 await say('kenneth','(turning round, holding up the screenshot) “how did u know it was me.”','cold');
 pose('arjun',null);A.arjun.ex='shock';SFX.cheer&&SFX.cheer();
 await N('The whole arcade turns round. Somebody plays the Price Is Right losing horn on a phone speaker. Nivaan zooms in on Arjun’s face.');
 await say('kenneth','Three months, Arjun. I told “Jess” about my mom. So now everyone gets to hear what you sound like when you’re caught.','cold');
 await say('arjun','(very small) …The nice messages were real. The three a.m. ones. I meant those.','cry');
 await say('kenneth','I know. That’s why you’re buying everyone fries. Everyone. The whole arcade.','smirk');
 await say('arjun','…That’s like forty people.','shock');await say('jacob','Forty-one.','cold');
 await complete('catfish','turned');return 'stay'}}}
}

/* =================== FOCUS: fewer, better quests on screen =================== */
const FEATURED=new Set(['crew','crew_locker','crew_dark','crew_record','kim','dopple','headcase','pauljones','brett','window','darren','stepeleven','tellmom','nightshift','jade','beef','giant','stall','upthere','tea','catfish','bigscore','voss','oldbat','staffroom','mended','toby','farewell','instella','firstfight','lockdown','steal_stella','steal_mia','flimbus','ringing','stain'].concat(typeof FILTHY!=='undefined'?FILTHY:[]));
const focusOn=()=>!P.set||P.set.focus!==false;
const isFeat=m=>FEATURED.has(m)||/^crew/.test(m);
/* new, unstarted side quests that aren't featured don't nag: no "!" marks, no walk-ups, not in the log */
if(typeof showMark==='function'){const _sm=showMark;showMark=function(id){if(focusOn()){let hs=[];try{hs=availableHooks(D.room,id)}catch(e){}if(hs.length&&hs.every(h=>h.mis&&MIS[h.mis]&&!isFeat(h.mis)&&!((D.mp||{})[h.mis]>0)))return false}return _sm.apply(this,arguments)}}
if(typeof approachCandidate==='function'){const _ac=approachCandidate;approachCandidate=function(){const c=_ac();if(c&&focusOn()&&c.h&&c.h.mis&&!isFeat(c.h.mis)&&!c.started)return null;return c}}
{const _th=thingsAt;thingsAt=function(per){const l=_th(per);if(!focusOn())return l;return l.filter(t=>!t.mis||isFeat(t.mis)||((D.mp||{})[t.mis]>0)||/^(cq_|gig|rescue)/.test(t.mis))}}
/* gigs and daily challenges are opt-in */
{const _g=gigsToday;gigsToday=function(){if(P.set&&P.set.gigs!==true)return[];return _g.apply(this,arguments)}}
{const _c=challToday;challToday=function(){if(P.set&&P.set.challenges!==true)return[];return _c.apply(this,arguments)}}
/* settings */
{const _os=openSettings;openSettings=function(){_os();const s=$('settings').querySelector('.set');if(!s)return;
 const row=(label,get,set,opts)=>{s.appendChild(Object.assign(document.createElement('div'),{textContent:label}));const w=document.createElement('div');w.className='opts';
  opts.forEach(([v,n])=>{const b=document.createElement('button');b.textContent=n;b.setAttribute('aria-pressed',String(get()===v));b.onclick=()=>{set(v);save&&save();openSettings()};w.appendChild(b)});s.appendChild(w)};
 row('🎯 Focused quests (only the best quests nag you)',()=>P.set.focus!==false,v=>P.set.focus=v,[[true,'On'],[false,'Show everything']]);
 row('💸 Side hustles',()=>P.set.gigs===true,v=>P.set.gigs=v,[[false,'Off'],[true,'On']]);
 row('🏆 Daily challenges',()=>P.set.challenges===true,v=>P.set.challenges=v,[[false,'Off'],[true,'On']])}}
/* no more walls of text: long narration is split at sentence breaks into short boxes */
{const _sy=say;say=async function(who,t,ex){if(TEST||who!==''||typeof t!=='string'||t.length<=150)return _sy(who,t,ex);
 const parts=t.match(/[^.!?…]+[.!?…]+[”’"']*\s*|[^.!?…]+$/g)||[t];const out=[];let cur='';
 for(const p of parts){if((cur+p).length>130&&cur){out.push(cur.trim());cur=p}else cur+=p}if(cur.trim())out.push(cur.trim());
 let res;for(const c of out)res=await _sy(who,c,ex);return res}}
