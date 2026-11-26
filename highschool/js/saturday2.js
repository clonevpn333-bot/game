'use strict';
/* =====================================================================
   HIGHSCHOOL REMASTERED — SATURDAY (the secret ending), played
   Same story as js/lore.js, but you do it:
   1. Aidan is at the bus stop. Your friends are scattered round the bus
      loop. Walk to each one and bring them over (E). You need four.
   2. Say the names together: one timed beat per name (meter). Every
      friend in the line says it with you, and each name brings one of
      the four 1987 kids to the gate.
   3. Ms. Sherman, the bell, Ollie, Saturday morning: as before.
   ===================================================================== */
{const h=HOOKS.find(h=>h.mis==='calling'&&h.period===7&&/1987/.test(h.label||''));if(h)h.run=async()=>{
 const pool=['hasan','arjun','david','omer','nivaan','corey','sean','stella','paul','kenneth','jacob','mia'].filter(n=>K[n]&&!D.dead[n]&&!(window.EDITION_CUT||[]).includes(n));
 const spots=[24,58,92,226,262,296,40,280];
 const cast={aidan:[170,-1,{y:146}],you:[140,1,{y:154}]};pool.slice(0,8).forEach((n,i)=>cast[n]=[spots[i],i%2?-1:1,{y:142+(i%3)*5}]);
 scene('bus',cast,true);cue('sad');
 await say('you','I know what happened in 1987.');
 await say('aidan','…Nobody knows what happened in 1987. That’s the whole point. That’s why it keeps happening.','sad');
 await say('you','Detention in the boiler room. Four sixth graders. She told them to wait and went to get a coffee. The boiler went at quarter past three.');
 await say('aidan','(very quietly) Ollie Finch. Danny Shaw. Priya Lal. Michael Kerr.','cry');
 await say('aidan','It keeps the day because nobody ever said it. Not one person, out loud, all together. It needs more than me. It needs everyone.','sad');
 /* 1. bring them over */
 const line=[];const lineX=i=>188+Math.min(i,7)*16;
 while(true){
  const left=pool.slice(0,8).filter(n=>A[n]&&!line.includes(n));
  const list=left.map(n=>({x:A[n].x,y:A[n].y,label:'Ask '+K[n].n+' to stand at the bus stop',short:K[n].n.split(' ')[0].toUpperCase(),v:n,who:n}));
  if(line.length>=4)list.push({x:A.aidan.x,y:A.aidan.y,label:'Say the names ('+line.length+' with you)',short:'SAY IT',v:'say',who:'aidan'});
  if(!list.length)break;
  const v=await finStage('bus',list,{banner:line.length>=4?'SAY IT TOGETHER':'BRING THEM TO THE BUS STOP',sub:line.length+' OF 4'+(line.length>=4?' · OR BRING MORE':''),hint:line.length?'':'Walk to your friends. Bring them to Aidan.'});
  busy=true;setPanel('talk');
  if(v==='say'||v==null)break;
  await say(v,pick(['(confused) …Okay? Okay.','Why are we— fine. Fine.','(already walking) If this is a prank I’m going to be so mad.','…I had a dream about a boiler once.','Is this a TikTok thing?']),'shock');
  await walk(v,lineX(line.length),70);face(v,-1);line.push(v);
 }
 /* 2. the names */
 cue('dawn');fxState.romance=.15;
 const names=['OLLIE FINCH','DANNY SHAW','PRIYA LAL','MICHAEL KERR'],ghosts=['ollie','ghost1','ghost2','ghost3'];
 for(let i=0;i<4;i++){
  let ok=0;while(!ok){ok=await meter('Together: “'+names[i]+'”',{speed:.75,info:'Everyone says it at once. Hit it when they do.'});
   if(!ok){await N(pick(['It comes out ragged. Half the line is a beat behind. Again.','Somebody laughs, nervous. Again. Properly.']))}}
  for(const n of line)if(typeof bubbles!=='undefined')bubbles.push({id:n,txt:names[i],t:1.8});
  if(typeof bubbles!=='undefined')bubbles.push({id:'you',txt:names[i],t:1.8});
  SFX.chime?SFX.chime():SFX.ding&&SFX.ding();
  const g=ghosts[i];put(g,46+i*20,1,{y:150,alpha:0});tw(A[g],{alpha:.85},1200);
  await wait(TEST?0:900)}
 await N('Four kids in 1987 uniforms are standing by the bus. You can see the 43 through them.');
 if(!D.dead.sherman&&K.sherman){
  put('sherman',-14,1,{y:150});await walk('sherman',96,40);
  await say('sherman','…Where did you hear those names.','shock');
  await say('sherman','I told them to wait. I said “wait here, I’ll be five minutes.” I went to get a coffee. I was twenty-two.','cry');
  await say('sherman','I’ve been five minutes for thirty-nine years.','cry')}
 await say('ollie','It’s three fifteen.','happy');
 SFX.bell&&SFX.bell();await wait(400);
 await N('The bell rings. It rings for a long time. Then, for the first time since 1987, it stops.');
 await say('ollie','(to Aidan) You can come. Or you can stay. Staying’s allowed now.','happy');
 await say('aidan','…I want to stay. I want to see what Monday’s like.','cry');
 await say('ollie','It’s garbage. You’ll love it.','laugh');
 await Promise.all(ghosts.map(g=>{walk(g,-30,26);return tw(A[g],{alpha:0},3000)}));
 ghosts.forEach(g=>remove(g));fxState.romance=0;
 P.endings.saturday=(P.endings.saturday||0)+1;P.done.calling=P.done.calling||1;P.cur=null;save();
 const sat={aidan:[160,1,{y:146}],you:[186,-1,{y:154}]};line.slice(0,6).forEach((n,i)=>sat[n]=[i<3?60+i*24:212+(i-3)*22,i<3?1:-1,{y:146}]);
 scene('bus',sat,true);fxState.dark=1;await tw(fxState,{dark:0},1400);
 await card('SATURDAY','9:14 AM',2600,'love');
 await N('It’s Saturday. Nobody has school. Everyone who said the names came anyway, without arranging it, and stood at the bus stop like idiots.');
 if(A.hasan)await say('hasan','Why are we all here? It’s Saturday. I had a lie-in planned. A big one.','shock');
 await say('aidan','I don’t know. I think we just wanted to check.','happy');
 if(A.arjun)await say('arjun','Your bangs is still a crime, though.','smirk');
 await say('aidan','I know.','laugh');
 await card('SATURDAY','SECRET ENDING',2600,'love');
 await curtainCall('saturday');
 return 'ended'}}
