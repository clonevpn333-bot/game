'use strict';
/* =====================================================================
   HIGHSCHOOL — the Highgate Archive, and the secret ending.

   What actually happened: on Friday 13 March 1987 a young Ms. Sherman ran
   Friday detention in the old boiler room, because her office was being
   painted. She told four Year 7s to wait there and went to get a coffee.
   The boiler went at 3:15. The kids were in the coal chute. The school said
   nobody was hurt, built a pool over the boiler room, and put a trapdoor
   over the chute. Nobody ever said their names out loud again.
   So the building kept the day. It keeps it for whichever kid it finds
   next who's alone enough on a Friday. Ollie was the first. Aidan is the
   latest. The teachers have lived the same Friday so many thousands of
   times that their bodies have gone strange with it, even though they
   don't remember. Mr. Adam half-remembers. That's why he's coming apart.
   ===================================================================== */
const LORE={
 poem:{title:'Ode to Omer',text:'Aidan’s poem ends: “And every Friday is the same Friday.” When he read it, the clock over the door went backwards. Nobody else noticed.',hint:'Period 1, English.'},
 again:{title:'Page forty-seven',text:'In the margin of the science textbook, page 47, in old ballpoint: “again again again again”. Underneath, in a different hand: “me too”. Under that: “1987”.',hint:'Actually read page forty-seven.'},
 kit:{title:'Lost property',text:'The oldest gym clothes in lost property has a name tag: O. FINCH, 7F. The shorts are from 1987. They’re still folded.',hint:'Forget your gym clothes.'},
 mugring:{title:'The ring on the desk',text:'Ms. Loach’s mug has worn a perfect ring into her desk. You’d have to put it down in the same place ten thousand times to do that. Maybe she has.',hint:'Push Ms. Loach as far as she’ll go.'},
 jars:{title:'Fourteen jars',text:'Mr. Voss keeps fourteen jars labelled AIDAN. The oldest label is yellow and dated 13/3/87. Aidan wasn’t born in 1987.',hint:'Open the back fridge.'},
 ollie:{title:'Ollie Finch, 7F',text:'Ollie signed out “How to Be Brave” on 13 March 1987. Ms. Sherman told him to bring it to detention. He’s been in Friday ever since.',hint:'Someone in the library needs his book back.'},
 chute:{title:'The trapdoor',text:'The trapdoor in front of Ms. Sherman’s desk isn’t a trapdoor. It’s the old coal chute down to the boiler room. It was boarded over in 1987, the week after.',hint:'Find out what’s under Ms. Sherman’s rug.'},
 adam:{title:'Mr. Adam knows',text:'“It’s FRIDAY! It’s been Friday for WEEKS and nobody else has NOTICED!” Mr. Adam is the only adult who half-remembers. It’s eating him alive.',hint:'Ask Mr. Adam if he’s okay. Tell him the truth about himself.'},
 locker:{title:'Locker 217',text:'When Aidan dies on a Friday, he still gets on the 43 the next morning. He remembers the locker. He says it’s cold.',hint:'Something has to happen at locker 217.'},
 photo:{title:'Netball, 1987',text:'The 1987 County Netball team photo in the trophy cabinet. Back row, end, half out of frame: a boy with a bowl cut, not in kit, not smiling, looking at the camera like it owes him something.',hint:'Look properly at the trophy cabinet.'},
 gazette:{title:'The Highgate Gazette',text:'16 March 1987. “BOILER FIRE AT HIGHGATE: NO ONE HURT, SAYS HEAD.” In the photo, a young teacher with a perm is crying into her hands at the gate. The caption doesn’t name her. It doesn’t name anyone.',hint:'The library keeps old newspapers.'},
 haiku:{title:'Your own poem',text:'You wrote “Friday comes again / the bell rings and nobody / ever gets to leave” without thinking. It came out of you like something you’d remembered.',hint:'Write Ms. Balduf a haiku.'}
};
function lore(id){if(!LORE[id]||P.lore&&P.lore[id])return;P.lore=P.lore||{};P.lore[id]=1;save();SFX.ding();toast('📜 Highgate Archive: '+LORE[id].title+' ('+Object.keys(P.lore).length+'/'+Object.keys(LORE).length+')')}
const loreCount=()=>Object.keys(P.lore||{}).filter(k=>LORE[k]).length;
{const _intel=intel;intel=function(id){_intel(id);const map={ollie:'ollie',aidanLocker:'locker',adamMonday:'adam',shermanPit:'chute',aidanJars:'jars',aidanPoem:'poem',loachMug:null};if(map[id])lore(map[id])}}

/* two things you can find just by looking properly */
spot({room:'corridor',period:[0,2,4],x:148,y:150,label:'Look properly at the trophy cabinet',short:'TROPHIES',cond:()=>!(P.lore&&P.lore.photo)&&!(D.period===4&&D.f.fight),run:async()=>{
 face('you',-1);pose('you','reach');
 await N('County Netball, 1987. Twelve girls in green, one teacher, a trophy that’s now in the middle of the cabinet. You’ve walked past it a thousand times.');
 await N('Back row, right at the end, half out of the frame: a boy. Bowl cut. Not in kit. Not smiling. Looking straight at the camera like it owes him something.');
 pose('you',null);lore('photo');return 'stay';
}});
spot({room:'library',x:290,y:150,label:'Look through the old newspapers',short:'PAPERS',cond:()=>!(P.lore&&P.lore.gazette),run:async()=>{
 hold('you','paper');
 await N('There’s a box of old Highgate Gazettes under the computers. Most are about bake sales. One from March 1987 has been folded so many times it’s gone soft.');
 await N('“BOILER FIRE AT HIGHGATE: NO ONE HURT, SAYS HEAD.” The photo is of the school gate. A young teacher with a big perm is crying into her hands. The caption doesn’t name her. It doesn’t name anyone.');
 hold('you',null);lore('gazette');return 'stay';
}});
/* the pit, the oldbat finale, and the Monday rant all feed the archive */
{const h=HOOKS.find(h=>h.mis==='oldbat'&&h.period===6);if(h){const run=h.run;h.run=async()=>{const r=await run();if(D.f.pitOpen||D.dead.sherman)lore('chute');return r}}}
{const h=HOOKS.find(h=>h.mis==='headcase'&&h.period===2);if(h){const run=h.run;h.run=async()=>{const r=await run();lore('adam');return r}}}

/* ---------- the archive in the quest log ---------- */
{const _oq=openQuest;openQuest=function(){
 _oq();
 const tb=$('quest').querySelector('.tabs'),body=$('quest').querySelector('.qbody');
 const b=document.createElement('button');b.textContent='Archive ('+loreCount()+'/'+Object.keys(LORE).length+')';b.setAttribute('aria-pressed',String(questTab==='archive'));b.onclick=()=>{questTab='archive';openQuest()};tb.appendChild(b);
 if(questTab!=='archive')return;
 body.innerHTML='';const l=document.createElement('div');l.className='list';body.appendChild(l);
 const intro=document.createElement('div');intro.className='li';intro.textContent=loreCount()===Object.keys(LORE).length?'Every page. You know what happened in 1987. At home time, tell Aidan.':'The Highgate Archive. Pages of what really happened. Find them all and something changes at home time.';l.appendChild(intro);
 for(const id in LORE){const got=P.lore&&P.lore[id],d=document.createElement('div');d.className='li'+(got?'':' no');const t=document.createElement('b');t.textContent=got?LORE[id].title:'???';d.appendChild(t);d.appendChild(document.createTextNode(' — '+(got?LORE[id].text:LORE[id].hint)));l.appendChild(d)}
}}

/* =================================================================
   SATURDAY — the secret ending
   ================================================================= */
Object.assign(K,{
 ghost1:Object.assign({},K.kid1,{n:'6th Grader, 1987',ghost:1,top:'#4a5a7a',hair:'#5a3a22',hs:'side',seed:61}),
 ghost2:Object.assign({},K.kid3,{n:'6th Grader, 1987',ghost:1,top:'#4a5a7a',seed:62}),
 ghost3:Object.assign({},K.kid2,{n:'6th Grader, 1987',ghost:1,top:'#4a5a7a',hs:'short',seed:63})
});
ENDINGS.saturday={name:'Saturday',desc:'You said what happened in 1987, out loud, in front of everyone. The building finally let go.',hint:'Find every page of the Highgate Archive. Then talk to Aidan at home time.'};
hook({mis:'calling',period:7,room:'bus',who:'aidan',label:'“I know what happened in 1987.”',cond:()=>!D.f.aidanDead&&loreCount()>=Object.keys(LORE).length,look:{ex:'sad'},run:async()=>{
 const present=['hasan','arjun','david','omer','nivaan','corey','sean','stella','paul','kenneth','jacob','mia'].filter(n=>!D.dead[n]);
 const cast={aidan:[170,-1,{y:146}],you:[146,1,{y:154}]};present.forEach((n,i)=>cast[n]=[i<6?20+i*18:216+(i-6)*16,i<6?1:-1,{y:140+(i%3)*4}]);
 scene('bus',cast);cue('sad');
 await say('you','I know what happened in 1987.');
 await say('aidan','…Nobody knows what happened in 1987. That’s the whole point. That’s why it keeps happening.','sad');
 await say('you','Friday the thirteenth of March. Detention in the boiler room, because Ms. Sherman’s office was being painted. Four sixth graders. She told them to wait and went to get a coffee.');
 await say('you','The boiler went at quarter past three. They were in the coal chute. The paper said nobody was hurt. They built a swimming pool on top and a trapdoor over the chute and never said their names again.');
 await say('aidan','(very quietly) Ollie Finch. Raj Patel. Danny Mason. Louise Okafor.','cry');
 if(A.hasan)await say('hasan','What are you two talking about? What’s— why is everyone being quiet?','shock');
 await say('aidan','It doesn’t keep the day because of me. It keeps it because nobody said it. It finds whoever’s alone enough on a Friday and it keeps them. Ollie was the first. I’m the latest.','sad');
 await say('aidan','It found me in sixth grade. The Friday you all laughed at my haircut. I went to the bathroom and I didn’t come out until Monday, except Monday never came.','cry');
 const c=await choose(['“Then we say it. Everyone. Right now.”','Say nothing. Hold his hand.']);
 if(c===1){pose('you','hold');await N('You take his hand. It’s cold. It stays cold. But he doesn’t let go.')}
 await say('you','Their names were Ollie Finch, Raj Patel, Danny Mason and Louise Okafor.');
 for(const n of present.slice(0,6))if(A[n]){await say(n,'Ollie Finch. Raj Patel. Danny Mason. Louise Okafor.','sad');}
 if(!D.dead.sherman){
  put('sherman',334,-1,{y:150});await walk('sherman',236,40);
  await say('sherman','…Where did you hear those names.','shock');
  await N('For the first time all day, she doesn’t have anything cruel to say. She just looks old. Older than the building.');
  await say('sherman','I told them to wait. I said “wait here, I’ll be five minutes.” I went to get a coffee. I was twenty-two.','cry');
  await say('sherman','I’ve been five minutes for thirty-nine years.','cry');
 }
 fxState.romance=.25;cue('dawn');
 const ghosts=['ollie','ghost1','ghost2','ghost3'];
 ghosts.forEach((g,i)=>put(g,330+i*14,-1,{y:150,alpha:0}));
 for(const g of ghosts){tw(A[g],{alpha:1},1200)}
 await Promise.all(ghosts.map((g,i)=>walk(g,250+i*14,30)));
 await N('Four kids in 1987 uniforms are standing at the bus stop. You can see the school gate through them.');
 await say('ollie','It’s three fifteen.','happy');
 SFX.bell();await wait(400);
 await N('The bell rings. It rings for a long time. Then, for the first time since 1987, it stops.');
 await say('ollie','(to Aidan) You can come. Or you can stay. Staying’s allowed now.','happy');
 await say('aidan','…I want to stay. I want to see what Monday’s like.','cry');
 await say('ollie','It’s garbage. You’ll love it.','laugh');
 await Promise.all(ghosts.map(g=>{walk(g,360,26);return tw(A[g],{alpha:0},3000)}));
 ghosts.forEach(g=>remove(g));fxState.romance=0;
 P.endings.saturday=(P.endings.saturday||0)+1;P.done.calling=P.done.calling||1;P.cur=null;save();
 scene('bus',{hasan:[60,1,{y:146}],arjun:[84,1,{y:144,pose:'cross'}],omer:[108,1,{y:150}],david:[132,1,{y:144}],aidan:[160,1,{y:146}],you:[186,-1,{y:154}],corey:[212,-1,{y:146}],sean:[236,-1,{y:146}],stella:[256,-1,{y:148}]},true);
 fxState.dark=1;await tw(fxState,{dark:0},1400);
 await card('SATURDAY','9:14 AM',2600,'love');
 await N('It’s Saturday. Nobody has school. Everyone came anyway, without arranging it, and stood at the bus stop like idiots.');
 await say('hasan','Why are we all here? It’s Saturday. I had a lie-in planned. A big one.','shock');
 await say('aidan','I don’t know. I think we just wanted to check.','happy');
 await say('arjun','Your bangs is still a crime, though.','smirk');
 await say('aidan','I know.','laugh');
 await card('SATURDAY','SECRET ENDING',2600,'love');
 await curtainCall('saturday');
 return 'ended';
}});
SCORES.dawn={beat:.8,root:[38,34,41,36],mode:[[0,7,15],[0,7,16],[0,7,14],[0,7,16]],lead:[62,-1,-1,65,-1,-1,69,-1,-1,67,-1,64,-1,-1,62,-1],soft:1};
