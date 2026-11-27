'use strict';
/* =====================================================================
   HIGHSCHOOL — WILD STUFF (Kindergarten-style secrets)
   Not quests. Nothing in the log. You find them by poking around, and
   they go somewhere nobody expects.
   • THE BUCKET  (gym, break/lunch) a bucket of fake blood rigged over the
     gym doors. Who gets it is up to you. Coach is never the same.
   • LOCKER 217  (js/locker217.js) ten minutes in 1987.
   • VENT VICTOR (any vent) a kid has lived in the vents for three years.
   + Mr. Kim's magic box now goes DOWN: a playable crawl under the stage.
   ===================================================================== */
GOO.blood=GOO.blood||['#8a0d16','#b3121e','#d21f2b','#5e0a12'];
K.victor={id:'victor',n:'Vent Victor',col:'#6a7a6a',skin:'#d8c8b0',hair:'#3a3a2a',hs:'long',top:'#4a5a4a',pants:'#2a2a2a',seed:212,v:240};
Object.assign(DEATHS,{
 bucket:{name:'Drenched',desc:'Coach found out who pulled the rope. He did forty laps with you. You were the baton.',hint:'The bucket over the gym door. Pull it, then RUN.'}});
{const _dp=drawProp;drawProp=function(p){const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='wbucket'){if(p.tip){g.save();g.translate(x,y);g.rotate(p.tip*1.8);R(-5,-6,10,8,'#7a7a82');R(-5,-6,10,2,'#9a9aa2');R(-4,-5,8,2,'#b3121e');g.restore()}else{R(x-5,y-6,10,8,'#7a7a82');R(x-5,y-6,10,2,'#9a9aa2');R(x-4,y-5,8,2,'#b3121e')}R(x+5,y-4,30,1,'#c8b080');return}
 if(p.t==='bloodpool'){R(x-12,y-1,24,3,'#8a0d16');R(x-9,y,18,2,'#b3121e');return}
 return _dp(p)}}

/* ---------------- THE BUCKET ---------------- */
spot({room:'gym',period:[2,4],x:286,y:140,label:'Look up at the gym doors',short:'?',cond:()=>!D.weekend&&!D.f.bucketDone&&!D.dead.coach,run:async()=>{
 const bk=prop({t:'wbucket',x:292,y:78,layer:-50});
 put('kayden',250,1,{y:148,ex:'smirk'});await N('Above the gym doors, wedged on the frame: a paint bucket. A rope runs from its handle down to a hook by the bleachers. It’s full to the brim with something red.');
 await say('kayden','(whispering) Pig’s blood. Well. Ketchup, corn syrup and one actual pig’s heart from Pat’s freezer. It’s for Brayden. He’s coming through those doors in like a minute.','smirk');
 const c=await choose(['Let Kayden do it.','Warn Brayden.','Take the rope. Wait for somebody better.']);
 D.f.bucketDone=1;
 if(c===1){await N('Brayden listens. Then he goes in the other door, walks up behind Kayden, and pulls the rope himself. Kayden was standing under it, checking the aim.');
  stain('kayden','blood',14);A.kayden.ex='shock';SFX.squelch&&SFX.squelch();prop({t:'bloodpool',x:250,y:150,layer:-1});await say('kayden','(dripping, very calm) …There’s a heart in my hood.','shock');return 'stay'}
 if(c===0){put('brayden',334,-1,{y:150});await walk('brayden',292,70);bk.tip=1;SFX.squelch&&SFX.squelch();shake(.6);stain('brayden','blood',16);A.brayden.ex='scream';prop({t:'bloodpool',x:292,y:152,layer:-1});
  await say('brayden','AAAAAAAAAAAAAAAA','scream');await N('The whole gym goes silent. Then the whole gym films it. Brayden walks out with a pig’s heart on his shoulder like a parrot. By sixth period he’s a legend.');
  await walk('brayden',350,90);remove('brayden');return 'stay'}
 await N('Kayden hands you the rope like it’s a sacred duty. You wait. Footsteps. Heavy. A whistle, swinging.');
 put('coach',334,-1,{y:146,ex:'cold'});await walk('coach',292,60);
 const d=await choose(['Pull it.','Don’t. Let go of the rope very slowly.']);
 if(d===1){await walk('coach',200,60);await say('coach','(sniffing) …Why does my gym smell like a barbecue.','cold');await walk('coach',-30,60);remove('coach');return 'stay'}
 bk.tip=1;SFX.squelch&&SFX.squelch();shake(.8);stain('coach','blood',22);A.coach.ex='angry';A.coach.shake=1;prop({t:'bloodpool',x:292,y:152,layer:-1});D.f.coachBloody=cal();
 await N('It goes everywhere. His whistle. His perfect hair. The pig’s heart lands on his clipboard with a sound you will hear for the rest of your life.');
 await say('coach','(very, very quietly, dripping) …Who is holding. My rope.','evil');remove('kayden');
 const ok=await mash('RUN',{need:24,time:4,info:'He’s seen the rope in your hand. RUN!'});
 if(!ok){A.coach.shake=0;pose('coach','grab');await say('coach','Forty laps. You’re the baton.','evil');await die('bucket')}
 await walk('you',-30,180);await N('You make it out. He doesn’t chase. He just stands there, red, smiling, writing something on his clipboard.');return 'stay'}});
/* Coach is bloody the rest of the day */
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);try{if(D&&D.f&&D.f.coachBloody===cal()&&A.coach&&!(A.coach.stain&&A.coach.stain.length))stain('coach','blood',18)}catch(e){}return r}}

/* ---------------- VENT VICTOR ---------------- */
{const _vs=ventScreen;ventScreen=function(){_vs();if(D&&D.f&&D.f.victorMet!==undefined&&D.f.victorMet!==1)return;const v=VVIC;if(!v.on)return;const x=v.x;
 drawCopy({id:'victor',k:K.victor},{x,y:VF,dir:x>SNK.vx?-1:1,pose:'crouch',alpha:1,vis:true,moving:false,ex:'happy'});if(v.say&&T<v.until)pxc(v.say,x,VF-36,'#cbe0b0')}}
const VVIC={on:false,x:0,say:'',until:0};
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(TEST||!SNK.on||!SNK.vent||!D||D.f.victorMet)return;
 if(!VVIC.on){const lo=Math.min(...SNK.grates.map(q=>q.x));const hi=Math.max(...SNK.grates.map(q=>q.x));VVIC.on=true;VVIC.x=SNK.vx<160?Math.min(hi+14,300):Math.max(lo-14,20);return}
 if(Math.abs(SNK.vx-VVIC.x)<16&&!busy){D.f.victorMet=1;const lines=[['VICTOR','shhhh. hi. i live here. three years. dont tell']],gift=Math.random()<.5;
  VVIC.say='psst. hi. i live here.';VVIC.until=T+3;D.money=(D.money||0)+6;updateLoc&&updateLoc();
  toast(gift?'Vent Victor gives you $6 he found in the ducts. “For the vending machine. Don’t tell anyone I exist.”':'Vent Victor gives you $6. “I hear everything up here. Ms. Sherman calls Mr. Adam “Gerry-bear”. Don’t tell.”');
  setTimeout(()=>{VVIC.on=false},3500)}}}

/* ---------------- MR. KIM: the box goes DOWN ---------------- */
{const s=SPOTS.find(s=>s.mis==='kim'&&/magic box/.test(s.label||''));if(s){const o=s.run;s.run=async function(){const r=await o.apply(this,arguments);if(TEST)return r;
 const c=await choose(['Climb down the trapdoor.','Close the box. Don’t.']);if(c===1)return r;
 cue('evil',true);fxState.dark=0;await tw(fxState,{dark:.85},500);
 await N('You drop into the dark under the stage. Old props. A cardboard moon. A smell like popcorn left in a car.');
 await N('Above you: footsteps. Big shoes. Every third step, a honk.');
 await say('kim','(above you, through the floorboards, softly) Seven ones are seven. Seven twos are fourteen. Somebody’s in my basement. Seven threes…','happy');
 const ok=await vgSimon(5,'DON’T MAKE A SOUND');
 if(!ok){SFX.thud&&SFX.thud();await N('Your knee hits the cardboard moon. The honking stops. A strip of light: the trapdoor opening. A white-painted face, upside down, smiling.');
  const ran=await mash('CRAWL OUT THE OTHER SIDE',{need:24,time:4});if(!ran){fxState.dark=0;await die('honk')}
  await N('You squeeze out under the stage skirt and run. Behind you, very cheerfully: “Seven fours are twenty-eight!”');fxState.dark=0;return r}
 await N('Your light finds the back wall. Dozens of school photos, each with a red clown nose in marker. Across the top, neat teacher writing: VOLUNTEERS.');
 const names=Object.keys((typeof crew==='function'&&crew().gone)||{}).map(v=>K[v]&&K[v].n).filter(Boolean);
 await N('ALEX is there. TYLER is there.'+(names.length?' So are '+names.join(', ')+'. The kids from this week. The ones you didn’t get to.':' And there are empty spaces. With this week’s dates on them.'));
 if(typeof crew==='function'){const cr=crew();cr.ev=cr.ev||{};cr.ev.volunteers=1;save&&save();toast('🎁 EVIDENCE: Mr. Kim’s VOLUNTEERS wall. The file gets thicker.')}
 await tw(fxState,{dark:0},500);return r}}}
{const _ce=crewEvidence;crewEvidence=function(){const c=crew();return _ce()+(c.ev&&c.ev.volunteers?1:0)}}

/* The Other Miss stairwell chase: getting caught (lives here because stealth loads after dopple.js) */
{const _ct=caughtBy;caughtBy=function(id){if(id!=='dopple'||!DPCH.on)return _ct(id);DPCH.on=false;PAT=null;runHook({run:async()=>{SFX.squelch();SFX.crunch();shake(2);flash('#a00010',.6);blood(A.you.x,A.you.y-22,70,null,120,A.you.y+2);fxState.dark=0;await die('hungry')}})}}
