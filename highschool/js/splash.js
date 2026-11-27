'use strict';
/* =====================================================================
   HIGHSCHOOL — SPLASH ZONE
   Gross-out that hits the audience, on screen:
     spew(from, [targets], kind)  an arcing stream of chunks from one
                                  person's mouth (or worse) onto others;
                                  every hit leaves a stain on the target
     pukeChain([ids])             each one heaves onto the next
   Stains stay on people for the rest of the scene.
   + EAT IT: Coach vs Mr. Voss, the Faculty Hot Dog Classic, Main Hall.
   (Gross, not sexual. The kids get drenched in puke, never anything else.)
   ===================================================================== */
const GOO={puke:['#a8b83a','#c8c050','#e0a080','#8a9a2a','#d8d070'],brown:['#5a3a12','#6a4a1a','#7a5a22','#4a2a0a'],milk:['#c89a6a','#f4ead8'],chili:['#a8301a','#c84a1a','#6a1a0a']};
let BLOBS=[];
function stain(id,kind,n){const a=A[id];if(!a)return;a.stain=a.stain||[];const c=GOO[kind]||GOO.puke;for(let i=0;i<(n||8);i++)a.stain.push({fx:rand(-.45,.45),fy:rand(.05,.95),c:c[i%c.length],w:Math.random()<.3?2:1});if(a.stain.length>70)a.stain.splice(0,a.stain.length-70)}
{const _da=drawActor;drawActor=function(a){_da(a);if(!a||!a.stain||!a.stain.length||!a.k||a.vis===false)return;
 let G;try{G=kidGeom(a.k,a)}catch(e){return}const h=G.legH+G.bodyH+G.hd,top=a.y-(a.z||0)-h,wd=a.k.wide?12:a.k.adult?10:9;
 for(const s of a.stain){const x=Math.round(a.x+s.fx*wd*(a.dir||1)),y=Math.round(top+s.fy*h);R(x,y,s.w,1+(s.w>1?1:0),s.c)}
 const drip=(T*3+a.x)%1;if(a.stain.length>12)R(Math.round(a.x+((a.x*7)%5)-2),Math.round(a.y-4+drip*4),1,1,a.stain[0].c)}}
{const _cs=clearStage;clearStage=function(){BLOBS=[];return _cs()}}
function mouthOf(id){const a=A[id];if(!a)return{x:160,y:100};let G;try{G=kidGeom(a.k,a)}catch(e){return{x:a.x,y:a.y-26}}return{x:a.x+(a.dir||1)*3,y:a.y-(a.z||0)-G.legH-G.bodyH-Math.round(G.hd*.35)}}
function spew(from,targets,kind,o){
 o=o||{};const src=typeof from==='string'?mouthOf(from):from,c=GOO[kind]||GOO.puke,n=o.n||46,dur=o.dur||1100;
 if(typeof from==='string'&&A[from]){const t0=A[targets[0]];if(t0)A[from].dir=t0.x>A[from].x?1:-1}
 targets=targets.filter(t=>A[t]);if(!targets.length&&!o.to)return Promise.resolve();
 SFX.squelch&&SFX.squelch();shake(o.shake||.7);
 if(TEST){for(const t of targets)stain(t,kind,10);return Promise.resolve()}
 return new Promise(res=>{const st=performance.now();let left=n;
  for(let i=0;i<n;i++){const tid=targets.length?targets[Math.floor(i/n*targets.length)]:null,ta=tid?A[tid]:null,tp=ta?{x:ta.x+rand(-4,4),y:ta.y-rand(6,24)}:{x:o.to.x+rand(-6,6),y:o.to.y};
   BLOBS.push({x0:src.x,y0:src.y,x1:tp.x,y1:tp.y,t0:st+i*(dur/n),d:Math.max(180,Math.abs(tp.x-src.x)*2.2+rand(-40,40)),arc:o.arc!=null?o.arc:rand(12,30),c:c[i%c.length],s:Math.random()<.35?2:1,tid,kind,done(){left--;if(!left)res()}})}
 })}
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{_do&&_do(...x);if(!BLOBS.length)return;const now=performance.now();
 for(let i=BLOBS.length-1;i>=0;i--){const b=BLOBS[i];if(now<b.t0)continue;const k=Math.min(1,(now-b.t0)/b.d);
  const x=b.x0+(b.x1-b.x0)*k,y=b.y0+(b.y1-b.y0)*k-Math.sin(k*Math.PI)*b.arc;R(x,y,b.s,b.s,b.c);R(x-(b.x1-b.x0)*.01,y+1,1,1,b.c);
  if(k>=1){if(b.tid&&A[b.tid])stain(b.tid,b.kind,1);decals.push({x:b.x1+rand(-3,3),y:(b.tid&&A[b.tid]?A[b.tid].y:b.y1)+rand(0,3),w:1+(Math.random()*3|0),h:1,c:b.c});
   for(let j=0;j<2;j++)parts.push({x:b.x1,y:b.y1,vx:rand(-30,30),vy:rand(-30,-5),c:b.c,s:1,fy:(b.tid&&A[b.tid]?A[b.tid].y:b.y1+10)+rand(-2,2),life:1.5});
   BLOBS.splice(i,1);b.done()}}}}
async function heave(id){const a=A[id];if(!a)return;a.ex='hurt';a.shake=1;const p=a.pose;a.pose='hurt';await wait(TEST?0:380);a.shake=0;a.pose=p==='sit'?'sit':null}
async function pukeChain(ids,o){o=o||{};for(let i=0;i<ids.length-1;i++){const a=ids[i],b=ids[i+1];if(!A[a]||!A[b])continue;await heave(a);await spew(a,[b],'puke',{n:18,dur:350,arc:8,shake:.4});if(o.lines&&o.lines[i])await say(a,o.lines[i],'hurt')}}

/* ================= EAT IT ================= */
Object.assign(ITEMS,{baddogs:'A box of hot dogs. Best before: 2019. The box is warm.'});
mission('eatit',{name:'Eat It',icon:'🌭',who:['paul','coach','voss','pat'],
 goal:'Rig the Faculty Hot Dog Classic so Coach AND Mr. Voss throw up. Paul bet on a tie.',
 blurb:'Coach says Mr. Voss eats “like a sick bird”. Mr. Voss says Coach has “the metabolism of a dead seal”. It’s been settled the only way grown men can settle things: a hot dog eating contest, on stage, in front of the whole school. Paul has forty bucks on a tie.',
 parts:['Paul’s bet','Pat’s expired hot dogs','The Faculty Hot Dog Classic'],
 tips:['Break or lunch, the gym. Paul’s taking bets.','Swipe the expired hot dogs from behind Pat’s counter (cafeteria), then swap them onto the stage table in the Main Hall.','Main Hall, break or lunch. Pull up a chair. Not the front row.'],
 variants:{tie:'Called it a tie',foodfight:'Food fight',bite:'You took a bite'}});
if(typeof OUTCOME_FIX!=='undefined')Object.assign(OUTCOME_FIX,{'eatit:tie':'good','eatit:foodfight':'good','eatit:bite':'messy'});
{const _dp=drawProp;drawProp=function(p){if(p.t==='dogtable'){const x=Math.round(p.x),y=Math.round(p.y);R(x-46,y-8,92,3,'#e8e2d6');R(x-44,y-5,2,9,'#6a5a4a');R(x+42,y-5,2,9,'#6a5a4a');
  for(const s of[-1,1]){const n=p[s<0?'l':'r'];for(let i=0;i<Math.min(12,n);i++){const px=x+s*30+((i%4)-1.5)*5,py=y-10-Math.floor(i/4)*2;R(px-2,py,5,2,'#d8a050');R(px-1,py,3,1,'#a83a2a')}}
  pxc(String(p.cl||0),x-30,y-30,'#ffd27a');pxc(String(p.cr||0),x+30,y-30,'#ffd27a');return}
 if(p.t==='baddogs'){const x=Math.round(p.x),y=Math.round(p.y);R(x-6,y-6,12,7,'#c8b080');R(x-6,y-6,12,1,'#e8d0a0');R(x-4,y-4,8,1,'#6a8a2a');return}
 return _dp(p)}}
hook({mis:'eatit',period:[2,4],room:'gym',who:'paul',label:'Ask Paul why he’s taking bets',look:{ex:'smirk',pose:'cross'},cond:()=>!D.f.ei1&&!D.dead.paul&&!D.dead.coach&&!D.dead.voss,_here:1,run:async()=>{
 scene('gym',{paul:[200,-1,{y:150,ex:'smirk'}],you:[172,1,{y:154}]});
 if(typeof beat==='function')await beat('EAT IT','PART ONE · THE BET');
 await say('paul','Coach versus Mr. Voss. Hot dog eating contest. Main Hall. Whole school watching.','smirk');
 await say('paul','Coach said Voss eats like a sick bird. Voss said Coach has the metabolism of a dead seal. Then they both said “I’ll kill you” and I don’t think either of them was joking.','smirk');
 await say('paul','I got forty bucks on a tie. Nobody ever bets on a tie. You know how you GET a tie?','evil');
 const c=await choose(['“They both stop eating at the same time.”','“They both die.”','“…Both of them throw up.”']);
 if(c===1)await say('paul','Close. Less murder. More puke.','smirk');
 await say('paul','Pat’s got a box of hot dogs behind her counter. Best before 2019. She keeps it as a “deterrent”. Swap ’em onto the stage table. I’ll cut you in.','evil');
 D.f.ei1=1;part('eatit',1);return 'stay';
}});
spot({room:'canteen',x:62,y:146,label:'Swipe the box of expired hot dogs behind Pat’s counter',short:'GRAB',sparkle:1,mis:'eatit',jdraw:{sh:'box'},cond:()=>D.f.ei1&&!D.f.ei2&&!has('baddogs'),run:async()=>{
 clearTalk();await walk('you',70,70);face('you',-1);pose('you','reach');await wait(250);pose('you','grab');give('baddogs');hold('you','J:box');await wait(400);hold('you',null);pose('you',null);
 await N('The box is warm. Nothing in this building has been warm since 2019. The box is warm.');
 toast('Now: swap them onto the stage table in the Main Hall');return 'stay'}});
spot({room:'hall',x:160,y:136,label:'Swap the contest hot dogs for Pat’s expired ones',short:'SWAP',mis:'eatit',cond:()=>D.f.ei1&&!D.f.ei2&&has('baddogs'),run:async()=>{
 clearTalk();await walk('you',150,70);face('you',1);pose('you','reach');await wait(350);pose('you',null);take('baddogs');
 await N('Eighty fresh hot dogs go in the trash. Eighty hot dogs from 2019 go on the stage table. One of them has a little bit of fur. You turn that one around.');
 D.f.ei2=1;part('eatit',2);return eatContest()}});
async function eatContest(){
 const row1=['arjun','hasan','omer','nivaan','jacob','kenneth'].filter(k=>K[k]&&!D.dead[k]),row2=['alex','dheva','mia','kayden','angelo'].filter(k=>K[k]&&!D.dead[k]);
 const cast={coach:[118,1,{y:100}],voss:[202,-1,{y:100}],you:[30,1,{y:162}]};
 if(!D.dead.adam)cast.adam=[160,1,{y:98,hold:'mic'}];if(!D.dead.paul)cast.paul=[290,-1,{y:162,pose:'cross'}];
 row1.forEach((k,i)=>cast[k]=[60+i*40,1,{y:128,pose:'sit'}]);row2.forEach((k,i)=>cast[k]=[80+i*40,1,{y:144,pose:'sit'}]);
 scene('hall',cast,true);
 const tb=prop({t:'dogtable',x:160,y:104,layer:-2,l:12,r:12,cl:0,cr:0});
 if(typeof beat==='function')await beat('EAT IT','PART TWO · THE FACULTY HOT DOG CLASSIC');
 if(A.adam)await say('adam','(into the mic) Welcome to the first annual Highgate Faculty Hot Dog Classic. All proceeds go to… my car. Gentlemen. Begin.','smirk');
 for(let i=0;i<8;i++){pose('coach','drink');pose('voss','drink');await wait(TEST?0:150);pose('coach',null);pose('voss',null);tb.cl+=4;tb.cr+=4;tb.l=Math.max(2,tb.l-1);tb.r=Math.max(2,tb.r-1);await wait(TEST?0:120)}
 await say('coach','(mouth full, spraying crumbs) THIRTY-TWO. I’M A MACHINE. I’M A MEAT MACHINE. YOUR MOTHER WAS A HOT DOG.','yell');
 await spew('coach',['arjun'],'puke',{n:6,dur:200,arc:4,shake:.1});
 await say('voss','(unhinging his jaw like a snake) Thirty-three. A party trick from grad school. It’s why I was never invited to a second party.','evil');
 for(let i=0;i<2;i++){pose('coach','drink');pose('voss','drink');await wait(TEST?0:150);pose('coach',null);pose('voss',null);tb.cl+=3;tb.cr+=3}
 await N('Hot dog thirty-eight: 2019 arrives. Coach turns the color of the gym floor. Mr. Voss sweats something that smells like vinegar and regret.');
 A.coach.ex='hurt';A.coach.shake=1;A.voss.ex='scared';
 await say('coach','(very, very quietly) …Front row. Lean back.','scared');
 A.coach.shake=0;pose('coach','hurt');
 if(typeof camZoom==='function')await camZoom(140,110,1.4,250);
 await spew('coach',row1,'puke',{n:120,dur:1800,arc:26,shake:1.3});
 if(typeof camZoom==='function')await camZoom();
 for(const k of row1)if(A[k]){A[k].ex='shock'}
 await N('It isn’t vomit. It’s a weather system. One unbroken arc, a fire hose with a grudge, swept left to right across the whole front row.');
 if(A.arjun)await say('arjun','WHY IS IT ALWAYS IN MY MOUTH. WHY IS IT EVERY TIME IN MY ACTUAL MOUTH.','hurt');
 if(A.hasan)await say('hasan','(dripping, very calm) I came in here to eat my sandwich in peace. My sandwich is ham now. It was cheese.','closed');
 await pukeChain(row1.slice(0,4).concat(row2.slice(0,3)).filter(k=>A[k]),{lines:['','I’m— hrrk— I’m fine— HRRRK','','Oh, it’s HOT. Why is it HOT.']});
 if(A.voss){A.voss.shake=1;await say('voss','Don’t look at me. Nobody look at me. I can hold it. I have a DOCT—','scared');A.voss.shake=0;
  if(A.adam){await spew('voss',['adam'],'puke',{n:60,dur:900,arc:10,shake:1});A.adam.ex='shock';await N('Mr. Voss turns his head, very politely, and empties himself into Mr. Adam’s microphone. Every speaker in the building goes “BLORRRP”.')}
  else await spew('voss',row2.slice(0,2),'puke',{n:60,dur:900})}
 if(A.nivaan)await say('nivaan','(phone up, dripping) Chat says this is the hardest thing they’ve ever seen. Chat is throwing up. Chat is throwing up IN chat.','laugh');
 /* Ms. Sherman takes control */
 put('shermian',336,-1,{y:150});await walk('shermian',290,90);
 await say('shermian','EVERYBODY. STAY. IN. YOUR—','angry');
 A.shermian.pose='lie';A.shermian.z=0;SFX.whoosh&&SFX.whoosh();
 await N('Ms. Sherman steps in the puddle. Heels up. Down she goes, flat on her back, sliding the length of the Main Hall like a curling stone.');
 await tw(A.shermian,{x:24},1400,'out');
 for(const k of row2)if(A[k]&&Math.random()<.6){A[k].pose='lie';A[k].hurt=1}
 stain('shermian','puke',40);
 await N('She takes out three kids at the ankles on the way past. She comes to a stop at the doors, completely coated, staring at the ceiling.');
 await say('shermian','(not moving) …Nobody. Saw. That.','cold');
 const c=await choose([{t:'Climb on stage. Raise both their hands. “IT’S A TIE.”',tag:'🏆'},{t:'Grab two fistfuls of leftover hot dogs. FOOD FIGHT.',tag:'🌭'},{t:'Walk up. Take a bite of hot dog thirty-nine.',tag:'🤢'}]);
 if(c===0){await walk('you',160,90);pose('you','up');if(A.paul){A.paul.ex='laugh';pose('paul','cheer')}
  await say('you','IT’S A TIE. IT’S A TIE. EVERYBODY GO HOME.');
  await N('Coach and Mr. Voss kneel in it, too weak to argue, and let you raise their hands. At the back, Paul wins forty dollars and gives you twenty. Damp.');
  D.money=(D.money||0)+20;updateLoc();pose('you',null);if(typeof repAdd==='function')repAdd('legend',1);await complete('eatit','tie');return 'stay'}
 if(c===1){hold('you','J:box');pose('you','throw');await wait(200);pose('you',null);hold('you',null);
  for(const k of row2.concat(row1))if(A[k]&&A[k].pose!=='lie'){A[k].pose='throw';A[k].ex='laugh'}
  await spew({x:A.you.x,y:A.you.y-30},['coach','voss'],'chili',{n:30,dur:800,arc:30});
  await N('Forty-one expired hot dogs go up at once. The whole school, coated in teacher, throws them at the stage. Coach takes one to the eye: “that’s fair”.');
  if(typeof repAdd==='function')repAdd('legend',2,'The Faculty Hot Dog Classic');await complete('eatit','foodfight');return 'stay'}
 await walk('you',150,80);pose('you','drink');await wait(400);A.you.ex='hurt';A.you.shake=1;
 await N('You don’t know why you did it. Nobody will ever know why you did it. You chew twice. It’s fizzy. A hot dog should not be fizzy.');
 A.you.shake=0;pose('you','hurt');
 if(A.adam)await spew({x:A.you.x+3,y:A.you.y-26},['adam'],'puke',{n:50,dur:800,arc:14,shake:1});
 await say('adam','(dripping, very quietly, into the dead microphone) …Assembly is dismissed.','closed');
 pose('you',null);if(typeof repAdd==='function')repAdd('feared',1);await complete('eatit','bite');return 'stay';
}
/* the people who start it turn up */
{const mine=HOOKS.filter(h=>h.mis==='eatit');const _hp=hookPresent;hookPresent=function(h,per){if(h&&h.mis==='eatit'&&h._here)return !D.dead[h.who];return _hp(h,per)};
 const _br=buildRoom;buildRoom=function(room){const r=_br(room);try{if(D&&!D.weekend)for(const h of mine){if(h.room!==room||A[h.who]||D.dead[h.who])continue;const ps=Array.isArray(h.period)?h.period:[h.period];if(!ps.includes(D.period))continue;let ok=false;try{ok=!h.cond||h.cond()}catch(e){}if(ok)put(h.who,200,-1,{y:150})}}catch(e){}return r}}
/* the swap table is on the stage when you've got the box */
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);try{if(room==='hall'&&D&&D.f.ei1&&!D.f.ei2&&!props.some(p=>p.t==='dogtable'))prop({t:'dogtable',x:160,y:104,layer:-2,l:12,r:12,keep:1})}catch(e){}return r}}
ON_PERIOD.push(async()=>{if(!D||TEST||!D.done||!D.done.eatit||Math.random()>.3||D.period===0)return;setTimeout(()=>toast('🗣 '+pick(['The front row of the Main Hall is roped off. Forever.','Arjun brushed his teeth eleven times. It’s still in there, he says.','Coach is eating salad now. Nobody’s ever seen Coach scared before.','They had to replace the microphone. And the curtains. And Mr. Adam.'])),5600)});
