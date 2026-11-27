'use strict';
/* =====================================================================
   HIGHSCHOOL — TWO OF HER
   There are two Ms. Shermians. The real one (`sherman`) is old and
   guilty and always has the coffee she went to get in 1987; no lipstick.
   The one who teaches Math (`shermian`) is the Other Miss: the part of
   her that stood outside the boiler room door and listened. Lipstick.
   This file makes that land WHILE you play, not just in the lore:
   • the real one always holds her coffee (the tell); she whispers to you
   • the Other Miss glitches for a few frames when you're near her
     (black eyes, a jaw that opens too far, arms that hang too long)
   • TWO OF HER: now and then in a hallway, both, at once
   • friends text you about the lipstick, the coffee, the two places
   ===================================================================== */
{
const day=()=>typeof cal==='function'?cal():1;
/* the tell: real one has her coffee; the face without lipstick */
K.realmiss=Object.assign({},K.sherman,{n:'Ms. Shermian'});K.realmiss.id='realmiss';if(window.OLD_IDS)OLD_IDS.add('realmiss');if(typeof VOICE!=='undefined')VOICE.realmiss=VOICE.sherman;
const REAL=k=>k===K.sherman||k===K.realmiss;
{const _dk=drawKid;drawKid=function(k,x,y,o){if(REAL(k)&&o&&!o.hold&&!['lie','sit','write','sob','beg','hug','kiss'].includes(o.pose))o=Object.assign({},o,{hold:'mug'});return _dk(k,x,y,o)}}
{const _dh=drawHead;drawHead=function(k,x,hy,d,o){_dh(k,x,hy,d,o);
 try{if(!REAL(k)||!o||o.back||o.crushed)return;const ex=x+d,ey=hy+(k.knob?6:5);
  R(ex-2,ey+4,4,1,k.skin);R(ex-2,ey+5,2,1,k.skin);R(ex-2,ey+4,4,1,'#9a6a5a');   /* no lipstick: a thin, tired mouth */
  R(ex-4,ey+2,2,1,'rgba(60,30,40,.45)');R(ex+2,ey+2,2,1,'rgba(60,30,40,.45)')}catch(e){}}}   /* she doesn’t sleep */
/* the Other Miss slips, for a few frames, when you're close and not in a cutscene */
let slip=0;window.otherMissSlip=t=>{slip=t};
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);
 try{const s=rdt||dt||.016;if(slip>0)slip-=s;
  if(!busy&&A.shermian&&A.you&&panelMode==='roam'&&Math.abs(A.shermian.x-A.you.x)<90&&slip<=0&&Math.random()<s*.06*(1+day()*.15))slip=.09+Math.random()*.06;
  /* the real one whispers when you pass */
  const r=A.sherman;if(r&&A.you&&!busy&&Math.abs(r.x-A.you.x)<26){r._wh=(r._wh||0)-s;if(r._wh<=0){r._wh=14;
   const L=['which one of us did you have for Math today?','don’t let her see you looking.','if she smiles with her teeth, run.','I only went for a coffee.','she’s hungrier on Fridays.','you can tell by the lipstick, dear.'];
   if(typeof bubbles!=='undefined')bubbles.push({id:'sherman',txt:L[Math.floor(Math.random()*L.length)],t:2.6})}}}catch(e){}}}
{const _dk=drawKid;drawKid=function(k,x,y,o){
 const sl=k===K.shermian&&slip>0&&!(o&&(o.back||o.pose==='lie'));
 /* she stops breathing and her head leans a pixel off true */
 const r=_dk(k,x,y,sl?Object.assign({},o,{still:1}):o);
 try{if(sl&&r){const G=kidGeom(k,o),d=(o&&o.dir)||1,ex=Math.round(x)+d,ey=r.hy+5,bx=Math.round(x)-(G.bw>>1),sk=k.skin;
  /* pinprick pupils, one eye set a pixel too low */
  R(ex-4,ey,2,2,sk);R(ex+2,ey,2,2,sk);R(ex-4,ey,1,1,'#1a1410');R(ex+3,ey+1,1,1,'#1a1410');
  /* the smile: one thin line, a little too wide, corners pulling up */
  R(ex-4,ey+4,9,1,'#5a1020');R(ex-5,ey+3,1,1,'#5a1020');R(ex+5,ey+3,1,1,'#5a1020');
  /* fingers that hang a little too long */
  R(bx-2,r.by+9,1,4,sk);R(bx-1,r.by+10,1,4,sk);R(bx+G.bw,r.by+9,1,4,sk);R(bx+G.bw+1,r.by+10,1,4,sk);
  /* a shadow comes down over her eyes */
  g.globalAlpha=.22;R(ex-6,r.hy,13,6,'#100008');g.globalAlpha=1}
 }catch(e){}return r}}

/* THE HALL: once a run (day 3+), both of her, a sixth grader between them */
const HALLS=new Set(['corridor','hallb','wing_sci','wing_arts','wing_sports','upper']);
const fed=()=>(D&&D.f&&D.f.missFed)||0;
/* every child she takes, she comes back a little taller and her lipstick a little redder */
{const _kg=kidGeom;kidGeom=function(k,o){const G=_kg(k,o);if(k===K.shermian&&fed()>0){const f=Math.min(4,fed());return Object.assign({},G,{legH:G.legH+f,bodyH:G.bodyH+Math.ceil(f/2)})}return G}}
{const _dh=drawHead;drawHead=function(k,x,hy,d,o){_dh(k,x,hy,d,o);try{if(k===K.shermian&&fed()>0&&o&&!o.back&&!o.crushed){const ex=x+d,ey=hy+5,f=Math.min(4,fed());R(ex-2-(f>2?1:0),ey+4,4+(f>2?2:0),1,f>1?'#e0001a':'#d0102a');R(ex-1,ey+5,2,1,'#b00018')}}catch(e){}}}
async function theHall(room){
 const kid=K.kid6?'kid6':(K.kid1?'kid1':null);if(!kid)return 'stay';
 const L=(A.you&&A.you.x)||60;
 scene(room,{you:[40,1,{y:156}],realmiss:[110,1,{y:150,ex:'scared'}],[kid]:[170,1,{y:152,ex:'shock'}],shermian:[240,-1,{y:148,ex:'smirk'}]},true);
 cue('dread',true);
 await N('Two of her. One grey and shaking, both hands round a coffee. One smiling. Both of them are Ms. Shermian.');
 for(let i=0;i<4;i++){face(kid,i%2?1:-1);await wait(TEST?0:520)}
 await N('The sixth grader looks from one to the other. Back. And forth.');
 face('shermian',-1);
 await say('shermian','(to the other one, mouthing, no sound) Get the fuck out of here.','evil');
 A.realmiss.ex='scared';pose('realmiss','cover');await wait(TEST?0:500);pose('realmiss',null);
 await walk('realmiss',-20,30);remove('realmiss');
 face('shermian',-1);pose('shermian','wave');
 await say('shermian','Come with Miss for a second, sweetie. Into class. It won’t take long.','smirk');
 pose('shermian',null);
 const c=await choose(['Grab his hood.','Say nothing.','Follow them.'],'SHE’S TAKING HIM');
 if(c===0){
  await walk('you',150,120);pose('you','grab');
  const ok=await mash('HOLD ON',{need:18,time:3,info:'Don’t let go of his hood.'});
  pose('you',null);
  if(ok){await N('You don’t let go. Neither does she. Then she does.');
   await say('shermian','(still smiling, looking only at you) Miss will remember your face.','evil');
   await walk('shermian',340,40);remove('shermian');await walk(kid,-20,120);remove(kid);
   if(window.gramPush)window.gramPush('corey','corey','someone said you grabbed a sixth grader off ms shermian in the hall??');
   return 'stay'}
  await N('His hood tears. She has his wrist now. He goes very quietly.')}
 else if(c===2){
  await walk('shermian',340,40);await walk(kid,340,60);await walk('you',340,60);
  await N('The classroom door shuts behind the three of you. She doesn’t turn on the lights.');
  await die('followed')}
 /* the door, the scream, and back */
 await Promise.all([walk('shermian',336,36),walk(kid,320,60)]);remove('shermian');remove(kid);
 await wait(TEST?0:900);
 SFX.scream&&SFX.scream();shake(.8);await wait(TEST?0:400);SFX.scream&&SFX.scream();
 await N('A scream from down the hall. Short. Then a door closing. Then nothing at all.');
 await wait(TEST?0:1200);
 D.f.missFed=(D.f.missFed||0)+1;
 put('shermian',336,-1,{y:148,ex:'smirk'});await walk('shermian',220,30);face('shermian','you');
 await N('She comes back alone. A little taller than before. Her lipstick is a little redder.');
 await say('shermian','(dabbing the corner of her mouth) Run along, sweetie.','smirk');
 await walk('shermian',340,40);remove('shermian');
 if(window.gramPush){window.gramPush('corey','corey','where is the kid in the blue jacket');window.gramPush('corey','corey','the little one. he was in the hall');window.gramPush('corey','corey','why is nobody saying his name')}
 return 'stay'}
DEATHS.followed={name:'Into Class',desc:'You followed her in. She didn’t turn on the lights.',hint:'The Hall. Grab his hood.'};
{const _er=enterRoom;enterRoom=async function(room){const r=await _er(room);
 try{if(!D||D.weekend||TEST||busy||day()<3||!HALLS.has(room)||(D.dead||{}).sherman||(D.dead||{}).shermian)return r;
  if(typeof atHome==='function'&&atHome())return r;
  if(D.f.hallDone||Math.random()>.2)return r;D.f.hallDone=1;
  if(typeof markSerious==='function')markSerious();
  return runHook({run:()=>theHall(room)})}catch(e){console.error(e)}
 return r}}
window.theHall=theHall;
/* friends notice */
const SEEDS={2:[['corey','did ms shermian have lipstick on in 2nd period?'],['corey','because she didn’t in 4th'],['corey','is that a thing teachers do'],['corey','reapply? be honest']],
 4:[['corey','ok weird question'],['corey','was she holding coffee when she yelled at you?'],['corey','because she was in maths. with us. the WHOLE time']],
 6:[['corey','nivaan says the real one is the one with the coffee'],['corey','the real WHAT. the real WHAT corey'],['corey','sorry. that was me asking myself']]};
ON_PERIOD.push(async(i,resume)=>{if(resume||!D||D.weekend||TEST||i!==2)return;const s=SEEDS[day()];if(!s||!window.gramPush)return;
 D.f.seed2=D.f.seed2||{};if(D.f.seed2[day()])return;D.f.seed2[day()]=1;s.forEach((m,k)=>setTimeout(()=>window.gramPush(m[0],m[0],m[1]),2500+k*1400))});
}
