'use strict';
/* =====================================================================
   HIGHSCHOOL — two weeks at Highgate.
   Days 1–14. Monday picks odd/even; the week alternates from there.
   Saturday and Sunday: no school, pick something stupid to do.
   Die, and you live the same day again.
   ===================================================================== */
const DOW=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
function cal(){return P.cal||1}
function dow(c){return((c||cal())-1)%7}
function dayName(c){return DOW[dow(c)]}
function weekOf(c){return(c||cal())<=7?1:2}
function isWeekend(c){return dow(c)>=5}
function dayLabel(){return dayName().toUpperCase()+(D&&D.weekend?'':' ('+((D&&D.dayType)||'odd').toUpperCase()+')')}
function nextDayCard(){const n=cal()+1;if(n>14)return['THAT’S IT','TWO WEEKS'];return[dayName(n).toUpperCase(),isWeekend(n)?'NO SCHOOL':'WEEK '+weekOf(n)]}
{const _fd=freshD;freshD=function(){const d=_fd();d.day=cal();return d}}

/* Monday decides the week */
pickDay=async function(){
 const w=weekOf();P.weekType=P.weekType||{};
 if(dow()===0||!P.weekType[w]){
  let t;
  if(TEST)t=Math.random()<.5?'odd':'even';
  else{const i=await choose([{t:'Odd — Periods 1, 3, 5 and 7 today',tag:'1·3·5·7'},{t:'Even — Periods 2, 4, 6 and 8 today',tag:'2·4·6·8'}],dayName()+'. What kind of day is it? (Today decides the rest of the week: it alternates.)');t=i?'even':'odd'}
  P.weekType[w]=t;save();
 }
 const first=P.weekType[w];return dow()%2===0?first:(first==='odd'?'even':'odd');
};

dayIntro=async function(died){
 scene('bus',{you:[180,1,{y:160}]},true);setHud(false);
 fxState.dark=1;tw(fxState,{dark:0},1500);
 if(cal()===1&&!died&&!P.calSeen){
  P.calSeen=1;save();
  await card('HIGHSCHOOL','A CALLING OF AIDAN STORY',2600);
  await N('Monday. Week one. The 43 drops you at Highgate High at 8:25.');
  await N('Two weeks until the school inspection. Two weeks of a normal school with normal teachers. Until it isn’t.');
  await N('Tip: the bell sends you to class, but you can skip. Talk to people. Do what they need. Die, and you live the day again. Only you remember.');
 }else if(died){
  await N(pick(['You gasp awake on the 43, both hands on your neck. Still attached.','You wake up on the bus. The radio’s playing the same song. Your body remembers how it died.','The bus. The bell. Your mouth tastes like pennies.']));
  await N('It’s still '+dayName()+'. The building gave you the day back. It does that.');
 }else{
  await N(pick([dayName()+'. The 43 smells like Axe and wet coats.',dayName()+'. Hasan is already laughing at something.',dayName()+'. Week '+weekOf()+'. '+(14-cal())+' days left of this.']));
 }
 D.dayType=await pickDay();applyDay(D.dayType);
 toast(D.dayType==='even'?'Even day: History or Art, Music or ICT, Swimming or Woodwork, Psychology or Assembly.':'Odd day: Periods 1, 3, 5 and 7.');
 if(P.intel.aidanLocker&&!D.f.aidanSaid){D.f.aidanSaid=1;put('aidan',260,-1,{y:146});await say('aidan','Locker 217 is very cold. Did you know? You know.','smirk');remove('aidan')}
};

newDay=async function(died){
 busy=false;closeOverlays();
 if(!P.calStarted){P.cal=1;P.calStarted=1}
 else if(!died)P.cal=(P.cal||1)+1;
 if(P.cal>14){save();return twoWeeksEnd()}
 P.loops++;D=freshD();P.cur=null;save();
 setPanel('talk');setHud(false);
 if(isWeekend())return weekendDay(died);
 await dayIntro(died);
 return startPeriod(0);
};

/* ---------------- the weekend ---------------- */
const WEEKEND=[];  /* filled by weekend.js: {id,name,blurb,room,run} */
ROOMS.bedroom={name:'Your Bedroom',music:'sad',bg(){
 R(0,0,W,120,'#5a6a8a');for(let i=0;i<W;i+=16)R(i,0,1,120,'rgba(0,0,0,.05)');R(0,0,W,6,'#4a5a7a');
 windowPane(30,22,58,44,{frame:'#e8e4dc'});R(26,20,6,52,'#c86a5a');R(86,20,6,52,'#c86a5a');for(let i=0;i<6;i++)R(26,22+i*8,6,1,'#a85a4a');
 R(104,20,30,40,'#1a1a2a');R(106,22,26,36,'#3a2a6a');px('METAL',108,26,'#f0d040');R(110,36,18,16,'#c04040');
 R(140,26,24,32,'#f4f0e6');R(142,28,20,20,'#5aa0d0');px('NBA',144,50,'#c04040');
 R(170,18,40,28,'#2a2a2a');R(172,20,36,24,'#d0a040');px('HIGHGATE',172,24,'#2a2a2a');px('MOVIE',176,32,'#c03030');px('NIGHT',176,38,'#c03030');
 R(222,40,80,4,'#7a5a3a');for(let i=0;i<8;i++)R(226+i*9,30,7,10,['#c04040','#4060c0','#40a060','#e0c040'][i%4]);
 R(250,56,60,4,'#6a4a2a');R(254,60,4,40,'#5a3a22');R(302,60,4,40,'#5a3a22');R(262,40,30,16,'#1a1a1a');R(264,42,26,12,'#3a6aa0');R(266,44,10,4,'#a0d0f0');R(274,56,6,2,'#333');R(258,54,16,3,'#2a2a2a');
 R(0,112,W,68,'#4a3a5a');for(let i=0;i<120;i++)R(hsh(i)*W,114+hsh(i+5)*64,2,1,'#5a4a6a');
 R(0,110,W,3,'#e8e4dc');
 R(110,96,120,18,'#7a5a3a');R(110,96,120,3,'#9a7a50');R(114,86,112,12,'#e8e8f0');R(118,82,30,10,'#f4f4f8');R(150,90,76,10,'#4a6ac0');R(150,90,76,2,'#6a8ae0');R(110,114,4,8,'#5a3a22');R(226,114,4,8,'#5a3a22');R(110,122,120,2,'rgba(0,0,0,.3)');
 R(20,140,40,10,'#3a3a5a');R(24,136,30,6,'#c04040');R(30,134,16,4,'#e0e0e0');R(270,150,30,6,'#2a2a2a');R(274,146,10,4,'#4a4a4a');
},items:[]};
if(typeof LIGHT!=='undefined')LIGHT.bedroom=()=>({amb:.72,tint:[50,40,80],src:[[59,44,140,.45,[255,236,200]],[278,48,70,.25,[140,190,255]]],wallAO:1});
const weekendDone=id=>(P.wkRun||{})[id];
async function weekendDay(died){
 D.weekend=1;D.period=8;D.room='bedroom';
 P.cur=JSON.parse(JSON.stringify(D));save();
 scene('bedroom',{you:[170,1,{y:156}]},true);setHud(true);updateLoc();
 fxState.dark=1;tw(fxState,{dark:0},1200);
 await card(dayName().toUpperCase(),'WEEK '+weekOf()+' · NO SCHOOL',1800);
 if(died)await N('You wake up in your own bed, gasping. It’s still '+dayName()+'. You died, and you got the day back. Even on weekends.');
 else await N(pick(['No alarm. No 43. No Ms. Sherman. Your phone is going off like a fire alarm.','You wake up at 11:40. You’ve never felt so alive. Your phone has 63 messages.','The weekend. Your mom has left a note on the door that just says “CLEAN”. Your phone is buzzing.']));
 const open=WEEKEND.filter(q=>!weekendDone(q.id)&&(!q.cond||q.cond()));
 const list=(open.length?open:WEEKEND).slice().sort(()=>Math.random()-.5).slice(0,4);
 await dms('THE GROUP CHAT','weekend plans',list.map(q=>[q.who_||'hasan',q.text||q.blurb]),{live:list.length});
 const opts=list.map(q=>({t:q.name+' — '+q.blurb,tag:q.tag||'🎉'}));opts.push({t:'Stay in bed. All day. Don’t talk to anyone.',tag:'💤'});
 const c=await choose(opts,dayName()+'. What are you doing today?');
 if(c<list.length){
  const q=list[c];P.wkRun=P.wkRun||{};
  return runHook({mis:q.mis,run:async()=>{await q.run();P.wkRun[q.id]=1;save();await endWeekendDay();return 'ended'}});
 }
 return runHook({run:async()=>{pose('you','lie');await N('You stay in bed. You watch eleven hours of videos of people restoring old tools. It’s the best day you’ve had in weeks.');pose('you',null);await endWeekendDay();return 'ended'}});
}
async function endWeekendDay(){
 cue('sad');await N(pick(['You get home after dark and lie on the floor of your room for a while.','You get home. You don’t tell your mom anything. You couldn’t if you tried.','Back home. You look at your ceiling for an hour. What a day.']));
 fxState.dark=0;await tw(fxState,{dark:1},900);
 const nc=nextDayCard();await card(nc[0],nc[1],1600);
 fxState.dark=0;busy=false;
 return newDay();
}
{const _ul=updateLoc;updateLoc=function(){_ul();if(D&&D.weekend){const c=$('clock');if(c){const r=ROOMS[D.room];c.innerHTML=dayLabel()+' · WEEK '+weekOf()+'<small>No school — '+(r?r.name:'')+'</small>'}}}}

/* ---------------- the end of the two weeks ---------------- */
ENDINGS.twoweeks={name:'Two Weeks',desc:'You got to the end of the two weeks at Highgate.',hint:'Live all fourteen days.'};
async function twoWeeksEnd(){
 busy=true;setPanel('talk');setHud(false);
 scene('bus',{you:[160,1,{y:156}]},true);cue('sad');
 await card('TWO WEEKS','THE END',2400);
 const ev=typeof crewEvidence==='function'?crewEvidence():0;
 await N('Two weeks. Fourteen days. '+P.stats.deaths+' deaths, give or take. You lived some of them more than once.');
 if(P.crew&&P.crew.finale)await N(P.crew.finale==='exposed'?'Highgate is closed “pending investigation”. The crew still has the group chat. Nobody has left it.':'Highgate is still open. The crew doesn’t talk about Inspection Day. They still sit together at lunch.');
 P.endings.twoweeks=(P.endings.twoweeks||0)+1;
 P.cal=0;P.calStarted=0;P.weekType={};P.crew={};P.win={};P.wkRun={};P.calSeen=0;save();
 return curtainCall('twoweeks');
}

/* ---------------- the title screen ---------------- */
title=async function(){
 closeOverlays();setHud(false);setPanel('none');busy=true;
 D=D||freshD();
 const saveD=D;D=Object.assign(freshD(),{period:0});
 scene('bus',{hasan:[70,1,{y:146}],arjun:[96,-1,{pose:'cross',y:144}],omer:[120,1,{y:150,pose:'cross'}],corey:[148,1,{y:146}],sean:[176,1,{y:144}],stella:[196,-1,{y:146}],aidan:[246,-1,{y:140}],paul:[220,-1,{y:148,pose:'hips'}],dheva:[274,-1,{y:150}],marcus:[296,-1,{y:146}]},true);
 D=saveD;cue('title');
 const m=$('menu');m.hidden=false;
 const done=Object.keys(P.done).length,total=Object.keys(MIS).length;
 m.innerHTML='<div class="eyebrow">A Calling of Aidan story</div><h1>HIGHSCHOOL</h1><p>Two weeks at Highgate High. The teachers are serial killers. The inspection is in fourteen days. Your friends have a plan. Aidan is not in the group chat.</p><p class="eyebrow" style="font-size:11px;letter-spacing:.14em">'+(P.calStarted?'Week '+weekOf()+' · '+dayName()+' · ':'')+done+'/'+total+' missions · '+Object.keys(P.endings).length+' endings</p><div class="actions"></div>';
 const a=m.querySelector('.actions');
 const btn=(t,f,alt,fs)=>{const b=document.createElement('button');b.className='mb'+(alt?' alt':'');b.textContent=t;b.onclick=()=>{audio();SFX.click();if(fs&&!TEST)goFullscreen(true);f()};a.appendChild(b)};
 if(P.cur)btn('Continue — '+dayName()+', week '+weekOf(),()=>{m.hidden=true;D=P.cur;busy=false;if(D.weekend){weekendDay(false)}else startPeriod(D.period,true)},false,true);
 if(P.calStarted&&!P.cur)btn('Next day — '+(cal()+1>14?'the end':dayName(cal()+1)),()=>{m.hidden=true;busy=false;newDay()},false,true);
 if(!P.calStarted)btn('Start — Week 1, Monday',()=>{m.hidden=true;busy=false;newDay()},false,true);
 else btn('Start the two weeks over',()=>{P.cal=0;P.calStarted=0;P.weekType={};P.crew={};P.win={};P.wkRun={};P.cur=null;save();m.hidden=true;busy=false;newDay()},1,true);
 btn('Quest log',()=>{D=D||freshD();openQuest()},1);
 btn('Settings',openSettings,1);
};

/* lockdown happens on the Wednesdays */
lockdownDue=function(){return !TEST&&D&&[3,10].includes(cal())&&!D.f.lockdownDone};

/* old lines that assumed it was always Friday now say what day it actually is
   (the 1987 story, Ollie and Mr. Adam’s madness keep their Fridays) */
function dayText(who,t){
 if(!/Friday/.test(t)||/1987|March|Ollie/.test(t)||who==='ollie'||(who==='adam'&&/ALWAYS|WEEKS/.test(t)))return t;
 t=t.replace(/[Ee]very Friday is the same Friday/g,m=>(m[0]==='E'?'Every':'every')+' day is the same day').replace(/the same Friday/g,'the same day');
 const d=dayName();if(d==='Friday')return t;
 return t.replace(/\bFridays\b/g,'days').replace(/\bFriday\b/g,d);
}
{const _say=say;say=function(who,text,ex){if(typeof text==='string'&&P&&P.calStarted)text=dayText(who,text);return _say(who,text,ex)}}
