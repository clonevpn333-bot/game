'use strict';
/* =====================================================================
   HIGHSCHOOL — CHEEKS & CHEEK-CLAPPER, IN THE MAIN STORY
   Not a quest any more (their quest is cut in js/cuts.js). They're part of
   the crew's plot: two grown men with 312 subscribers become the reason
   Inspection Day gets filmed.
   • THE CLAPPENING (week one, home time, bus loop, auto): they're filming
     in front of the school. Coach storms out. Cheek-Clapper reverses into
     him. Nivaan recruits them. → crew().cheeksIn
   • DAILIES (week two, before school, bus loop, auto): their footage has
     Coach in the background at the boiler hatch with bin bags, 3:20.
     → ev.cheekscam
   • INSPECTION DAY (js/finale3.js): they livestream it, crack Coach with
     the footage, clap him at the turn, and get a montage line.
   ===================================================================== */
{const _dp=drawProp;drawProp=function(p){const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='dailies'){/* their laptop footage, big enough to read */
  const w=96,h=56,l=x-w/2,t=y-h;R(l-3,t-3,w+6,h+12,'#1a1a1e');R(l,t,w,h,'#7a8aa0');
  R(l,t+30,w,26,'#8a8a8a');R(l,t+20,w,10,'#b86a4a');for(let i=0;i<6;i++)R(l+4+i*16,t+22,10,6,'#d8e0e8');
  R(l+60,t+40,16,6,'#2a2a2e');R(l+58,t+39,20,1,'#4a4a52');/* the hatch */
  const k=(T*.25)%1,cx=l+18+k*40;R(cx,t+34,4,9,'#c84a4a');R(cx-1,t+31,6,3,'#e8b890');R(cx+4,t+37,4,5,'#1a1a1a');R(cx+5,t+36,3,2,'#1a1a1a');/* Coach with a bin bag */
  R(l+4,t+38,22,8,'#5a5a6a');/* his car */
  R(l+2,t+2,30,6,'rgba(0,0,0,.5)');pxc('15:20',l+17,t+3,'#ff5050');if(Math.sin(T*6)>0)R(l+w-8,t+3,4,4,'#ff2020');
  R(l-3,t+h+2,w+6,7,'#2a2a30');return}
 return _dp(p)}}

const ckReady=()=>!TEST&&D&&!D.weekend&&!busy&&panelMode==='roam'&&!(typeof atHome==='function'&&atHome())&&!(typeof PAT!=='undefined'&&PAT)&&K.cheeks&&K.clapper;
{const _er=enterRoom;enterRoom=async function(room){const r=await _er(room);
 try{const c=crew();
  if(room==='bus'&&D.period===7&&cal()>=2&&cal()<=7&&!c.cheeksIn&&!D.dead.coach&&ckReady())return runHook({run:clappening});
  if(room==='bus'&&D.period===0&&cal()>=8&&cal()<12&&c.cheeksIn&&!(c.ev||{}).cheekscam&&ckReady())return runHook({run:dailies});
 }catch(e){console.error(e)}
 return r}}

async function clappening(){
 const cast={cheeks:[186,1,{y:150,hold:'clipboard'}],clapper:[226,-1,{y:150,pose:'hips'}],you:[-14,1,{y:156}]};
 if(!D.dead.nivaan)cast.nivaan=[120,1,{y:152,pose:'film'}];
 scene('bus',cast,true);const tri=prop({t:'tripod',x:160,y:152,layer:-1});cue('arcade',true);
 await walk('you',140,90);face('you',1);
 await N('Home time. Two enormous men in matching tracksuits, filming a movie in your bus loop.');
 if(A.nivaan)await say('nivaan','(filming them filming) Cheeks and Cheek-Clapper. IN OUR BUS LOOP. I’m going to cry.','laugh');
 await say('cheeks','You! Kid! You’ve got a steady face. Stand by the camera. Don’t breathe on it.','happy');
 await walk('you',152,50);
 prop({t:'clapboard',x:204,y:132});SFX.smack();
 await say('cheeks','FISTS OF FAIR CITY FOUR. Scene nine. The Bus Loop Showdown. ACTION!','yell');
 await say('clapper','(deep movie voice) This is MY bus loop, Cheeks.','angry');
 SFX.whistle?SFX.whistle():SFX.beep&&SFX.beep();
 put('coach',-14,1,{y:148,ex:'angry'});await walk('coach',96,120);
 await say('coach','NOT. IN. MY. BUS LOOP.','yell');
 await say('cheeks','(not turning round) Keep rolling. KEEP ROLLING. He’s perfect. He’s the villain.','happy');
 const c=await choose(['Keep rolling.','Grab the camera and hide it.','Run for the bus.'],'COACH IS COMING');
 if(c===2){await walk('you',40,140);face('you',1)}
 else if(c===1){pose('you','reach');await wait(250);pose('you',null);hold('you','laptop');{const i=props.indexOf(tri);if(i>=0)props.splice(i,1)}await walk('you',120,80);face('you',1)}
 await walk('coach',196,110);pose('coach','grab');
 await N('Coach goes for Cheeks. Cheek-Clapper turns round, plants his feet, and sticks his backside out like a battering ram.');
 await walk('clapper',214,60);face('clapper',1);
 let held=true;
 if(c===0){held=await mash('HOLD THE SHOT',{need:20,time:3,info:'Keep the camera on them. Don’t you dare wobble.'})}
 SFX.smack();shake(1.1);pose('coach','hurt');await tw(A.coach,{x:84,y:150},380);pose('coach','lie');SFX.thud();
 await N('BOOMF. Coach goes backwards into the side of the 43 and slides down it.');
 if(c===0)await say('cheeks',held?'(whispering, eyes wet) Did you get that. Tell me you got that.':'(watching you wobble) …It’s fine. It’s art. Shaky is art.','laugh');
 if(A.nivaan)await say('nivaan','I got it. I got it from the other side. I’m never going to be okay again.','laugh');
 pose('coach',null);A.coach.ex='evil';
 await say('coach','(getting up, very slowly, looking only at you) I know your bus number.','evil');
 await walk('coach',-20,70);remove('coach');cue('tension',true);
 if(A.nivaan){
  await say('nivaan','(walking up to Cheeks) You two want subscribers? Like, real ones?','cold');
  await say('cheeks','We have three hundred and twelve.','smirk');
  await say('nivaan','Friday week. Inspection Day. Something’s going to happen in that hall, and somebody needs to film it who can’t be stopped by a teacher.','cold');
  await say('cheeks','…Is there fighting?','shock');
  await say('you','Probably.');
  await say('clapper','(slowly, like a man seeing God) Then Fists of Fair City Five is a documentary.','happy')}
 else{await say('cheeks','(handing you a business card covered in fingerprints) Whatever that man is, kid, he needs to be on camera. Call us.','cold')}
 hold('you',null);
 crew().cheeksIn=1;save&&save();
 toast('🎬 Cheeks & Cheek-Clapper are in. Inspection Day is going to be filmed.');
 return 'stay'}

async function dailies(){
 scene('bus',{cheeks:[176,-1,{y:150,hold:'laptop',ex:'shock'}],clapper:[248,-1,{y:150,pose:'hips'}],you:[-14,1,{y:156}]},true);
 prop({t:'car',x:196,y:150,col:'#6a6a72',driver:1,layer:-3});
 await walk('you',140,90);face('you',1);
 await N('A grey Civic, one headlight, across two bus bays. Cheeks waves a laptop like a flare.');
 await say('cheeks','DAILIES. From the bus loop shoot. Don’t look at the clap. Look BEHIND the clap.','shock');
 const tv=prop({t:'dailies',x:160,y:96,layer:40});SFX.click&&SFX.click();
 await N('Behind the school, small and grainy: Coach’s car at the old boiler hatch. Boot open. Coach carrying a black bin bag. Then another. 15:20.');
 await say('clapper','We zoomed. We ENHANCED. Is that… is that a SHOE coming out of the bag?','scared');
 const c=await choose(['“Send me that file. Right now.”','“Delete it. They’ll come for you.”'],'THE FOOTAGE');
 if(c===1){await say('cheeks','DELETE it? This is our Citizen Kane. We’re putting it in the trailer.','angry');await say('you','…Send me a copy, then.')}
 await N('Across the bus loop, a pink cardigan. Ms. Sherman, crossing to the front doors with a coffee. She slows down.');
 put('shermian',-14,1,{y:148,ex:'smirk'});await walk('shermian',110,50);face('shermian',1);
 await say('shermian','Lovely morning, gentlemen.','smirk');
 const ok=await mash('ACT NATURAL',{need:14,time:3,info:'Get the laptop shut before she sees the screen!'});
 const i=props.indexOf(tv);if(i>=0)props.splice(i,1);
 if(ok){hold('cheeks',null);await say('cheeks','(very high voice) MORNING.','scared')}
 else{await N('She sees the screen. Just for a second. She smiles at it like it’s a baby photo.');await say('shermian','Coach always did have a lovely car.','evil');crew().sherSawCam=1}
 await walk('shermian',340,50);remove('shermian');
 await say('clapper','(watching her go) …I’ve been in four fights this year and I have never been that scared.','scared');
 crew().ev=crew().ev||{};crew().ev.cheekscam=1;save&&save();
 toast('🎁 EVIDENCE: the background of Fists of Fair City 4. Coach, the hatch, 3:20.');
 return 'stay'}
{const _ce=crewEvidence;crewEvidence=function(){return _ce()+((crew().ev||{}).cheekscam?1:0)}}
