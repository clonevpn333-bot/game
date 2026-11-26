'use strict';
/* =====================================================================
   HIGHSCHOOL — CLOSING TIME (replaces the everyday mall robberies)
   Once per two weeks, at most. From day 4, any evening you're in the
   Fair City food court there's a chance; by day 10 it's certain.
   8:50 PM: the shutters slam down, three adults in rubber masks (pig,
   clown, president) take the food court. Big Glen goes down first.
   You: hide under the Noodle Box counter (DON'T MOVE), comply (and
   realise you know the president's voice), or run for the fire alarm
   (race the pig). Anything that goes wrong ends with the president's
   pistol in your face: talk him down by name, or grab for it.
   The president is Tez. He's twenty-one and in tenth grade.
   ===================================================================== */
for(let i=HOOKS.length-1;i>=0;i--)if(HOOKS[i].mis==='robbery')HOOKS.splice(i,1);
if(MIS.robbery)Object.assign(MIS.robbery,{name:'Closing Time',icon:'🎭',who:['tez','glen','noodle'],goal:'Survive closing time at Fair City Mall.',hidden:1,
 blurb:'8:50 PM. Fair City Mall closes in ten minutes. Three people in rubber masks have other plans.',parts:['Closing time'],tips:['After school, Fair City Mall. Late. Some nights.'],
 variants:{alarm:'Pulled the alarm',hid:'Stayed under the counter',name:'Said his name',shot:'Grabbed for it'}});
OUTCOME_FIX['robbery:alarm']='good';OUTCOME_FIX['robbery:name']='good';OUTCOME_FIX['robbery:hid']='messy';OUTCOME_FIX['robbery:shot']='bad';
DEATHS.closingtime={name:'Closing Time',desc:'You grabbed for the gun. The president was faster.',hint:'Closing Time. He’s scared too. Use his name.'};
K.robpig={n:'Pig Mask',col:'#3a3a42',skin:'#d8b898',hair:'#2a2a2a',hs:'short',top:'#2a2a30',pants:'#1a1a1e',adult:1,wide:1,h:6,mask:'pig',seed:311,v:120};K.robpig.id='robpig';
K.robclown={n:'Clown Mask',col:'#2a3a2a',skin:'#c89870',hair:'#3a2a1a',hs:'short',top:'#3a4a3a',pants:'#1a1a1e',adult:1,h:3,mask:'clown',seed:312,v:210};K.robclown.id='robclown';
K.robprez=Object.assign({},K.tez,{n:'President Mask',mask:'prez',top:'#1a1a22',adult:1});K.robprez.id='robprez';

/* masks over the face */
{const _dh=drawHead;drawHead=function(k,x,hy,d,o){_dh(k,x,hy,d,o);if(!k.mask||(o&&o.crushed)||(o&&o.back))return;
 const {hw,hd}=kidGeom(k,o),hx=x-(hw>>1);
 if(k.mask==='pig'){R(hx-1,hy-1,hw+2,hd+1,'#e8a0a8');R(hx-2,hy-2,3,3,'#e8a0a8');R(hx+hw-1,hy-2,3,3,'#e8a0a8');R(x+d*2-2,hy+5,5,3,'#d07888');R(x+d*2-1,hy+6,1,1,'#5a2a30');R(x+d*2+1,hy+6,1,1,'#5a2a30');R(hx+2,hy+3,2,1,'#1a1a1a');R(hx+hw-4,hy+3,2,1,'#1a1a1a')}
 else if(k.mask==='clown'){R(hx-1,hy-1,hw+2,hd+1,'#f4f0e6');R(hx-3,hy,3,4,'#e04020');R(hx+hw,hy,3,4,'#e04020');R(x+d-1,hy+5,3,3,'#e02020');R(hx+2,hy+3,2,1,'#1a1a1a');R(hx+hw-4,hy+3,2,1,'#1a1a1a');R(hx+2,hy+8,hw-4,1,'#c02030')}
 else if(k.mask==='prez'){R(hx-1,hy-1,hw+2,hd+1,'#e8cca8');R(hx-1,hy-3,hw+2,3,'#f0f0ec');R(hx+2,hy+3,2,1,'#1a1a1a');R(hx+hw-4,hy+3,2,1,'#1a1a1a');R(hx+2,hy+7,hw-4,2,'#f8f8f0');R(hx+2,hy+9,hw-4,1,'#8a5a4a');R(hx+1,hy+2,hw-2,1,'rgba(0,0,0,.15)')}
}}
/* the mall shutters, and the police lights at the end */
{const _dp=drawProp;drawProp=function(p){if(p.t!=='shutter')return _dp(p);const k=p.k||0;if(k<=0)return;const h=Math.round(104*k);
 R(0,0,W,h,'#6a6e76');for(let y=4;y<h;y+=5)R(0,y,W,1,'#4a4e56');for(let y=2;y<h;y+=5)R(0,y,W,1,'#8a8e96');R(0,h-3,W,3,'#3a3e46');
 for(const x of[50,160,270])R(x-6,h-6,12,3,'#c8a030')}}
const CT={police:false};
{const _do=HOOK.drawOver;HOOK.drawOver=(...a)=>{_do&&_do(...a);if(!CT.police||TEST)return;const s=Math.sin(T*9)>0;g.save();g.globalCompositeOperation='lighter';g.globalAlpha=.18;R(s?0:W/2,0,W/2,H,s?'#ff2030':'#2050ff');g.restore()}}

const ctDue=()=>{if(!D||D.weekend||crew().closing||cal()<4)return false;D.f.ctRoll=D.f.ctRoll||{};if(D.f.ctRoll[cal()]==null)D.f.ctRoll[cal()]=(cal()>=10||Math.random()<.3)?1:0;return D.f.ctRoll[cal()]===1};
hook({mis:'robbery',period:8,room:'foodcourt',who:'auto',cond:ctDue,run:async()=>{
 crew().closing=1;save&&save();
 const cast={you:[70,1,{y:156}],noodle:[214,-1,{y:140,pose:'hips'}],kid1:[100,1,{y:150,pose:'sit'}],kid3:[126,-1,{y:150,pose:'sit'}]};
 if(!D.dead.glen&&K.glen)cast.glen=[262,-1,{y:150}];
 scene('foodcourt',cast,true);
 const sh=prop({t:'shutter',k:0,layer:-40});prop({t:'alarmbox',x:172,y:118,layer:-30});cue('tension',true);
 await card('CLOSING TIME','FAIR CITY MALL · 8:50 PM',1800);
 await N('“Fair City Mall closes in ten minutes,” says the ceiling, in a voice that has said it ten thousand times.');
 SFX.crunch&&SFX.crunch();shake(1.2);await tw(sh,{k:1},500);fxState.dark=.35;
 await N('Then every shutter in the food court slams down at once. Not closing. Slamming.');
 for(const id of['kid1','kid3','noodle'])if(A[id]){A[id].ex='shock';pose(id,null)}
 put('robpig',334,-1,{y:150,hold:'hammer'});put('robclown',356,-1,{y:148,hold:'bag'});put('robprez',378,-1,{y:152,hold:'pistol'});
 await Promise.all([walk('robpig',236,90),walk('robclown',256,90),walk('robprez',200,90)]);
 await N('Three people in rubber masks. A pig with a sledgehammer. A clown with two empty duffel bags. A president, holding a pistol like he’s never held one before.');
 if(A.glen){await walk('glen',224,60);face('glen',1);await say('glen','(hands up, very calm) Fellas. Fellas. It’s a Tuesday.','cold');
  pose('robpig','overhead');await wait(TEST?0:200);SFX.smack&&SFX.smack();shake(1);pose('robpig',null);await tw(A.glen,{x:A.glen.x-14},200);pose('glen','lie');A.glen.ex='hurt';
  await N('The pig puts Big Glen down with the handle of the sledgehammer. Glen is a big man. He goes down like a wardrobe.')}
 await say('robprez','(voice cracking behind the mask) EVERYBODY ON THE FLOOR. PHONES IN THE BAG. NOBODY’S A HERO TONIGHT.','angry');
 for(const id of['kid1','kid3'])if(A[id]){pose(id,'kneel');A[id].ex='scared'}
 cue('fight',true);
 const c=await choose(['Get under the Noodle Box counter.','Phone in the bag. Do what they say.','Go for the fire alarm by the fountain.'],'THREE MASKS. ONE GUN.');
 let cornered=false;
 if(c===0){
  await walk('you',196,140);pose('you','crouch');
  await N('Under the counter. Old noodles, a mop bucket, and the Noodle Box guy’s knees, shaking. The clown is walking the counters with the bag open.');
  await walk('robclown',206,40);
  const ok=await vgSimon(5,'DON’T MOVE');
  if(ok){await N('The clown’s shoes stop right in front of your face. Squeak. Squeak. Then they move on to the Sparkle Hut.');
   await walk('robclown',260,60);pose('robpig','overhead');SFX.glass&&SFX.glass();shake(.8);pose('robpig',null);
   await N('Glass. Every case in the Sparkle Hut at once. Somebody laughs, too high, too long. Then it’s over and they’re gone through the service door, and nobody has moved for six minutes.');
   await Promise.all([walk('robpig',360,110),walk('robclown',360,110),walk('robprez',360,110)]);
   pose('you',null);return ctEnd('hid')}
  await N('Your sneaker squeaks on the tiles. The clown bends down, very slowly, and looks under the counter.');
  await say('robclown','(sing-song) Peekaboo.','evil');pose('robclown','grab');await walk('you',176,60);pose('you',null);cornered=true}
 else if(c===1){
  await walk('robclown',96,80);hold('you','phone');await wait(200);hold('you',null);pose('you','kneel');
  await say('robprez','(walking past you, gun shaking) Highgate hoodie. Highgate. Of course. Of COURSE.','scared');
  await N('You know that voice. You’ve bought a padlock from that voice, in the boys’ bathroom, for four dollars. It’s a voice that has been in tenth grade for six years.');
  const d=await choose(['Say it. “…Tez?”','Keep your head down.'],'YOU KNOW HIM');
  if(d===1){await N('You keep your head down. The pig empties the Sparkle Hut. The clown empties the tills. The president stands by you the whole time, breathing too fast through the plastic mouth.');
   await Promise.all([walk('robpig',360,110),walk('robclown',360,110),walk('robprez',360,110)]);pose('you',null);return ctEnd('hid')}
  await say('you','…Tez?');A.robprez.ex='shock';await say('robpig','(turning) TEZ? You said nobody KNEW you.','angry');cornered=true;pose('you',null)}
 else{
  await N('The fountain. The red box on the pillar beside it. Fifteen feet. The pig sees you look at it.');
  const ok=await vgRace('robpig');
  if(ok){await walk('you',168,160);A.you.back=1;pose('you','reach');SFX.bell&&SFX.bell();SFX.bell&&SFX.bell();shake(.6);pose('you',null);A.you.back=0;
   await N('You smash it. Every alarm in Fair City Mall goes off. The sprinklers come on. Somewhere, a long way away, a siren answers.');
   await say('robpig','(already running) GO. GO. LEAVE THE BAGS.','yell');
   await Promise.all([walk('robpig',360,140),walk('robclown',360,140)]);
   pose('robprez','hurt');await tw(A.robprez,{x:262},300);await N('The president goes the wrong way, trips over Big Glen’s legs, and lands on his face. The mask comes off in the fall.');
   pose('robprez','lie');A.robprez.k=Object.assign({},K.tez);A.robprez.ex='hurt';
   await N('It’s Tez. Twenty-one years old. In tenth grade. Still holding the gun, pointing it at the ceiling, crying.');
   hold('robprez',null);SFX.thud&&SFX.thud();await N('He lets it go. It skids across the wet floor and stops against your shoe.');
   return ctEnd('alarm')}
  else{await N('The pig gets there first. He doesn’t hit you. He just puts a hand on your chest and walks you backwards into the president.');cornered=true}
 }
 if(!cornered)return ctEnd('hid');
 /* the gun */
 cue('tension',true);await walk('robprez',A.you.x+22,60);face('robprez',-1);hold('robprez','pistol');pose('robprez',null);
 await N('The pistol is a foot from your face. His hand is shaking so badly the barrel draws little circles.');
 const g=await choose(['“Tez. It’s me. You sold me a padlock. You don’t want this.”','Grab for the gun.','Close your eyes.'],'HE’S POINTING IT AT YOU');
 if(g===0){
  await say('you','Tez. It’s me. You sold me a padlock. Four dollars. You threw in a gum.');
  await say('robprez','(the mask slipping) …Why did you have to say my name.','cry');
  A.robprez.k=Object.assign({},K.tez);hold('robprez',null);SFX.thud&&SFX.thud();prop({t:'gunfloor',x:A.robprez.x-11,y:A.robprez.y+1,layer:-1});pose('robprez','sit');
  await N('He pulls the mask off. It’s Tez. He puts the gun down on the floor between you, very carefully, like it’s asleep, and sits down next to it.');
  await say('robprez','(sitting on the tiles) They said it’d be easy. They said I was the face. I was literally the face.','cry');
  if(A.robpig)await Promise.all([walk('robpig',360,140),A.robclown?walk('robclown',360,140):0]);
  return ctEnd('name')}
 if(g===1){pose('you','grab');const ok=await mash('GRAB THE GUN',{need:26,time:3,info:'Push it UP. Get it away from your face!'});
  if(!ok){SFX.bang&&SFX.bang();shake(1.8);flash('#a00010',.6);blood(A.you.x,A.you.y-24,50,null,100,A.you.y+2);await N('It goes off. You don’t hear it. You see the ceiling, the shutters, the fountain, and then nothing.');await die('closingtime')}
  SFX.bang&&SFX.bang();shake(1.4);flash('#fff',.5);pose('you',null);hold('robprez',null);hold('you','pistol');
  await N('It goes off into the ceiling. A speaker falls out of it. “Fair City Mall,” it says, on the floor, “closes in ten minutes.” Then the gun is in your hands and you have no idea what to do with it.');
  hold('you',null);pose('robprez','lie');A.robprez.k=Object.assign({},K.tez);
  await N('You throw it into the fountain. The president is on his back. The mask came off in the struggle. It’s Tez.');
  return ctEnd('shot')}
 await N('You close your eyes. You hear him breathing. You hear the pig shouting his name: “TEZ. TEZ, COME ON.” You hear him not moving.');
 await say('robprez','(very quietly) …Sorry. Sorry. You’re a kid. Sorry.','cry');
 hold('robprez',null);await Promise.all([walk('robprez',360,110),A.robpig?walk('robpig',360,140):0,A.robclown?walk('robclown',360,140):0]);
 return ctEnd('hid');
}});
async function ctEnd(v){
 cue('sad',true);CT.police=true;SFX.siren?SFX.siren():SFX.static&&SFX.static();
 await N('Red and blue through the gaps in the shutters. The police come in through the service door twenty minutes after everyone who matters has gone.');
 if(A.robprez&&(v==='name'||v==='shot'||v==='alarm')){put('cop',334,-1,{y:150});await walk('cop',A.robprez.x+14,90);pose('cop','grab');
  await N('They take Tez out in handcuffs. On his way past, he looks at you and says, “Don’t tell anyone at school.” Everyone at school will know by first period.');
  await Promise.all([walk('cop',360,70),walk('robprez',350,70)]);remove('cop');remove('robprez');
  if(v!=='alarm'&&v!=='shot')v='name'}
 if(A.glen){pose('glen','sit');await say('glen','(sitting up, holding his head) …Nobody robs Noodle Box on my watch.','hurt')}
 if(A.noodle)await say('noodle','(sliding a bowl across the counter to you, hands still shaking) Free noodles for life. Actually for life this time.','sad');
 CT.police=false;fxState.dark=0;
 for(const p of props.filter(p=>p.t==='shutter'))p.k=0;
 await complete('robbery',v);return 'stay'}

{const _dp=drawProp;drawProp=function(p){const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='alarmbox'){R(x-5,y-8,10,12,'#b81020');R(x-4,y-7,8,4,'#f4ead8');R(x-1,y-2,2,4,'#f4ead8');R(x-5,y+4,10,1,'#5a0810');return}
 if(p.t==='gunfloor'){R(x-4,y-1,7,2,'#2a2a2e');R(x-4,y+1,2,2,'#2a2a2e');R(x+1,y-1,1,1,'#4a4a52');return}
 return _dp(p)}}
