'use strict';
/* =====================================================================
   HIGHSCHOOL — THE DAY PLAYS OUT WITHOUT YOU
   Kindergarten's best idea: things happen at a set time whether you're
   there or not. Each school day one teacher takes one kid, at one place,
   at one free period. You get a tip in the morning (a text from the
   crew) that tells you where, when, and what might work.
   • Be there: a short scene and three choices. One saves them, one gets
     them taken anyway, one gets YOU killed (a new death to collect).
     Dying replays the day, so now you know.
   • Don't go: they're gone for the rest of the two weeks. A MISSING poster
     goes up.
   • Saved kids are allies, give evidence, and turn up to thank you.
   A report card closes every school day: who you saved, who's gone.
   ===================================================================== */
const VIC={
 priya:{n:'Priya',col:'#c0508a',skin:'#a8704a',hair:'#1a1010',hs:'long',top:'#c0508a',pants:'#2a2a3a',girl:1,seed:201,v:330},
 mateo:{n:'Mateo',col:'#3a8ac0',skin:'#c8946a',hair:'#2a1a10',hs:'crop',top:'#3a8ac0',pants:'#3a3a3a',seed:202,v:270},
 theo:{n:'Theo',col:'#8ac03a',skin:'#f0c8a8',hair:'#d8b060',hs:'messy',top:'#6a9a2a',pants:'#3a3048',seed:203,v:300},
 lily:{n:'Lily',col:'#e0a030',skin:'#f4d0b4',hair:'#c86a2a',hs:'ponytail',top:'#e0a030',pants:'#3a4a6a',girl:1,seed:204,v:350},
 noah:{n:'Noah',col:'#6a5ac0',skin:'#7a4a30',hair:'#140c08',hs:'crop',top:'#6a5ac0',pants:'#2a2a2a',seed:205,v:250},
 zara:{n:'Zara',col:'#20a090',skin:'#d8a878',hair:'#3a2418',hs:'bun',top:'#20a090',pants:'#2a2a3a',girl:1,seed:206,v:340},
 devon:{n:'Devon',col:'#c04030',skin:'#e8c0a0',hair:'#6a4020',hs:'messy',top:'#c04030',pants:'#30304a',seed:207,v:290}};
for(const [id,k] of Object.entries(VIC)){K[id]=Object.assign({},k,{id})}
const ALARM=(dead)=>prop({t:'alarm',x:28,y:96,dead:dead?1:0,layer:-80});
/* the two weeks: school day -> who, where, when, the tip, and the scene */
const ABD={
 2:{v:'priya',t:'voss',room:'chem',per:4,tip:[['them','priya says voss wants to “weigh her” at lunch. in the chem lab','7:52'],['them','also. voss is TERRIFIED of the fire alarm. like cries','7:53']],
    set:async()=>{prop({t:'jar2',x:206,y:132,layer:-20});prop({t:'jar2',x:220,y:132,big:1,layer:-20});ALARM();put('priya',150,1,{y:150,ex:'scared'});put('voss',178,-1,{y:146,hold:'clipboard',ex:'happy'});
     await say('voss','Stand very still, Priya. Very still. Forty-one kilos. Lovely. (writing) Lovely, lovely, lovely.','happy');await say('priya','(not moving at all) Sir, what’s the jar for?','scared');await say('voss','The jar is for later.','evil')},
    opts:[['Pull the fire alarm by the door.','save',async()=>{await walk('you',30,120);pose('you','reach');SFX.bell&&SFX.bell();shake(.5);pose('you',null);await say('voss','NO. NO NO NO. MY SPECIMENS. The SPRINKLERS—','shock');return 'flee'}],
          ['“Sir, stop. I’m telling.”','die',async()=>{face('voss','you');await say('voss','Telling who? (picking up the big jar) We have room for two.','evil');return 'die'}],
          ['Grab Priya and run.','mash',null]],death:'abd_jar'},
 3:{v:'mateo',t:'coach',room:'gym',per:2,tip:[['them','coach kept mateo back for “extra reps” at break','7:50'],['them','if coach hears a whistle he HAS to drop everything. its like a reflex','7:51']],
    set:async()=>{put('mateo',140,1,{y:152,pose:'kneel',ex:'hurt'});put('coach',164,-1,{y:146,pose:'hold',ex:'evil'});prop({t:'barbell',x:146,y:128,layer:40});
     await say('coach','ONE more, Mateo. Then another one more. Then we’ll talk about whether you get to stop being alive.','evil');await say('mateo','(gasping, under the bar) I can’t feel my arms—','hurt')},
    opts:[['Blow a whistle, loud.','save',async()=>{pose('you','mic');SFX.whistle&&SFX.whistle();await say('coach','(instantly dropping into a squat stance) …WHO BLEW THAT. WHO’S RUNNING DRILLS IN MY GYM.','yell');pose('you',null);return 'flee'}],
          ['Try to lift the bar off him yourself.','die',async()=>{await walk('you',132,90);pose('you','up');shake(.6);await N('It weighs more than you. A LOT more than you. It comes down slowly. Coach just watches. He counts.');return 'die'}],
          ['Shove Coach into the bleachers.','mash',null]],death:'abd_barbell'},
 4:{v:'theo',t:'shermian',room:'maths',per:4,tip:[['them','sherman told theo to “come stand on the rug” at lunch','7:49'],['them','say geralds name and she turns into a teenager. it’s disgusting. it works','7:50']],
    set:async()=>{prop({t:'rug2',x:150,y:151,layer:-90});put('theo',150,1,{y:150,ex:'scared'});put('shermian',182,-1,{y:146,pose:'reach',ex:'smirk'});prop({t:'lever',x:192,y:134,layer:-30});
     await say('shermian','On the rug, Theo. No — ON it. Feet together. Lovely. (her hand is on a little lever by the desk) Any last questions?','smirk');await say('theo','Is the rug… moving?','scared')},
    opts:[['Yell “MR. ADAM’S IN THE HALL ASKING FOR YOU!”','save',async()=>{await say('shermian','(hair, collar, lipstick, all at once) Gerald? NOW? Tell him I’m— no. I’ll tell him.','blush');return 'flee'}],
          ['Step onto the rug next to Theo.','die',async()=>{await walk('you',140,80);await say('shermian','Two for one.','evil');SFX.whoosh&&SFX.whoosh();shake(.7);await Promise.all([tw(A.you,{y:A.you.y+40,alpha:0},500),tw(A.theo,{y:A.theo.y+40,alpha:0},500)]);await N('The rug drops. So do you. It’s a long way down to the boiler room and it’s very, very warm.');return 'die'}],
          ['Tackle Theo off the rug.','mash',null]],death:'abd_chute'},
 6:{v:'lily',t:'kim',room:'corridor',per:0,tip:[['them','mr kim offered lily a ride to “math club” before school. we dont have a math club','7:40'],['them','call her mom. out loud. adults hate witnesses','7:41']],
    set:async()=>{put('lily',140,1,{y:150,ex:'scared'});put('kim',168,-1,{y:146,hold:'key',ex:'happy'});
     await say('kim','(jingling his car keys) Math club leaves from the parking lot, Lily. In my van. It’s a very good van. It has no windows, so you can concentrate.','happy');await say('lily','Mr. Kim, my mom said—','scared')},
    opts:[['Call Lily’s mom on speaker. LOUD.','save',async()=>{pose('you','phone');await N('“HI MRS. PARK! YEAH, LILY’S HERE WITH MR. KIM! HE WANTS TO DRIVE HER SOMEWHERE IN HIS VAN!” Every head in the hall turns.');pose('you',null);await say('kim','(smile frozen) …Math club is cancelled. Forever.','cold');return 'flee'}],
          ['“Can I come to math club too?”','die',async()=>{await say('kim','(delighted) Two volunteers! Front seat. Seatbelts. Locks.','happy');await Promise.all([walk('kim',350,70),walk('you',338,70),walk('lily',326,70)]);await N('The van smells like pennies. The doors lock with a sound like a gun cocking. Nobody ever finds the van.');return 'die'}],
          ['Throw your bag at him and grab Lily.','mash',null]],death:'abd_van'},
 7:{v:'noah',t:'grieve',room:'library',per:2,tip:[['them','grieve took noah into the library at break to read “the staff only book”','7:55'],['them','grieve can’t stand overdue books. return one and he forgets his own name','7:56']],
    set:async()=>{put('noah',140,1,{y:150,hold:'book',ex:'scared'});put('grieve',166,-1,{y:146,ex:'cold'});
     await say('grieve','Chapter four, Noah. Read it aloud. Every boy who reads chapter four aloud gets to stay in the library. Forever. Shhh.','cold');await say('noah','(the book is warm. it’s breathing) Sir, the pages are—','scared')},
    opts:[['Slam an overdue book on the desk.','save',async()=>{hold('you','book');pose('you','slam');SFX.thud&&SFX.thud();shake(.3);await wait(300);pose('you',null);hold('you',null);await say('grieve','(turning, trembling) Is that… THREE WEEKS OVERDUE? Come here. Come HERE. Fill in this form. Fill in ALL the forms.','yell');return 'flee'}],
          ['Read chapter four out loud yourself.','die',async()=>{hold('noah',null);hold('you','book');fxState.dark=0;await tw(fxState,{dark:.85},600);await N('“Again and again the cannon fired—” The lights go out. Something with a cardigan breathes on your neck. Shhhhhhhhhh.');return 'die'}],
          ['Rip the book out of Noah’s hands.','mash',null]],death:'abd_shush'},
 8:{v:'zara',t:'adam',room:'toilets',per:2,tip:[['them','adam is doing a “hall pass audit” in the bathroom at break. zara has no pass','7:47'],['them','flood the bathroom. he slipped on a mop once and cried for an hour','7:48']],
    set:async()=>{put('zara',140,1,{y:150,ex:'scared'});put('adam',168,-1,{y:146,pose:'hold',ex:'evil'});prop({t:'laminator',x:154,y:132,layer:40});
     await say('adam','No pass, Zara? No PASS? Then you’re NOT HERE. And if you’re not here… (holding up the laminator) …nobody minds if I laminate you.','evil');await say('zara','That doesn’t make sense!','angry')},
    opts:[['Flush every toilet at once.','save',async()=>{SFX.drip&&SFX.drip();shake(.4);prop({t:'water',x:0,y:0,layer:60});await N('Six toilets, all at once. The floor turns into a lake. Mr. Adam’s good shoes go out from under him and he lands flat on the laminator.');pose('adam','hurt');await say('adam','(on the floor, wet, quietly) …I just wanted things to be NEAT.','sad');pose('adam',null);return 'flee'}],
          ['Hand him your hall pass.','die',async()=>{hold('you','paper');await walk('you',150,80);await say('adam','(reading it) This pass expired in 1987. (warming up the laminator) Hold still. It’s like a hug. Forever.','evil');return 'die'}],
          ['Kick the laminator out of his hands.','mash',null]],death:'abd_laminated'},
 9:{v:'devon',t:'voss',room:'chem',per:4,tip:[['them','voss is doing a “taste test” with devon at lunch. purple stuff','7:51'],['them','he unplugged the fire alarm after last time btw. swap the beakers when he looks away','7:52']],
    set:async()=>{ALARM(true);put('devon',150,1,{y:150,hold:'flask',ex:'scared'});put('voss',178,-1,{y:146,hold:'flask',ex:'happy'});
     await say('voss','Bottoms up, Devon. Mine’s grape. Yours is… also grape. Mostly. Drink.','happy');await say('devon','Sir, mine’s smoking.','scared')},
    opts:[['Swap the beakers while he looks at the window.','swap',null],
          ['“I’ll drink it first. To prove it’s safe.”','die',async()=>{await walk('you',140,90);hold('devon',null);hold('you','flask');pose('you','drink');await N('It tastes like a battery and a birthday cake had a fight. Your fingers go see-through first. Then the rest of you.');return 'die'}],
          ['Pull the fire alarm.','lose',async()=>{await walk('you',30,120);pose('you','reach');await wait(300);pose('you',null);await N('You pull it. Nothing. A loose wire dangles. Mr. Voss smiles at you without turning round.');return 'lose'}]],death:'abd_beaker'}
};
Object.assign(DEATHS,{
 abd_jar:{name:'Pickled',desc:'He had a bigger jar the whole time. He always has a bigger jar.',hint:'Day 2, Chem Lab, lunch. The text said what he’s scared of.'},
 abd_barbell:{name:'Max Rep',desc:'Coach counted to a hundred. You did not make it to a hundred.',hint:'Day 3, gym, break. Coach has a reflex.'},
 abd_chute:{name:'The Rug',desc:'It’s not a rug. It was never a rug.',hint:'Day 4, Ms. Sherman’s room, lunch. Say his name.'},
 abd_van:{name:'Math Club',desc:'The van had no windows so you could concentrate.',hint:'Day 6, front hall, before school. Adults hate witnesses.'},
 abd_shush:{name:'Shushed',desc:'Chapter four. Every boy who reads it aloud stays.',hint:'Day 7, library, break. He hates one thing more than noise.'},
 abd_laminated:{name:'Laminated',desc:'Mr. Adam keeps you in a binder now. You’re very neat.',hint:'Day 8, bathroom, break. He slipped on a mop once.'},
 abd_beaker:{name:'Grape',desc:'It was not grape.',hint:'Day 9, Chem Lab, lunch. The alarm won’t work twice.'}});
{const _dp=drawProp;drawProp=function(p){const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='jar2'){const h=p.big?18:12,w=p.big?12:9;R(x-w/2,y-h,w,h,'rgba(180,220,200,.35)');R(x-w/2,y-h,w,1,'#c8e8e0');R(x-w/2-1,y-h-2,w+2,2,'#6a6a72');R(x-w/2+2,y-h+4,w-4,h-6,p.big?'rgba(120,160,120,.25)':'#d8c0a8');R(x-w/2+1,y-h+1,1,h-2,'rgba(255,255,255,.4)');return}
 if(p.t==='alarm'){R(x-4,y-6,9,11,'#c02020');R(x-3,y-5,7,4,'#e04040');R(x-2,y,5,3,p.dead?'#6a6a6a':'#f4f0e6');if(p.dead)R(x+4,y+4,1,6,'#d8c040');pxc('FIRE',x,y-12,'#e04040');return}
 if(p.t==='barbell'){R(x-16,y,32,2,'#9a9aa2');R(x-18,y-4,4,10,'#2a2a30');R(x+14,y-4,4,10,'#2a2a30');R(x-20,y-3,2,8,'#3a3a44');R(x+18,y-3,2,8,'#3a3a44');return}
 if(p.t==='laminator'){R(x-7,y-4,14,7,'#d8d8dc');R(x-7,y-4,14,1,'#f4f4f8');R(x-6,y-1,12,1,'#2a2a30');R(x+4,y-3,2,1,Math.sin(T*6)>0?'#ff4040':'#6a1a1a');return}
 if(p.t==='lever'){R(x-3,y,7,4,'#3a3a44');R(x,y-8,1,8,'#9a9aa2');R(x-1,y-10,3,3,'#c02020');return}
 if(p.t==='rug2'){R(x-14,y-2,28,5,'#7a2a3a');R(x-13,y-1,26,3,'#9a3a4a');R(x-14,y-2,28,1,'#c8a070');R(x-14,y+2,28,1,'#c8a070');return}
 return _dp(p)}}

const rc=()=>{const c=crew();c.saved=c.saved||{};c.gone=c.gone||{};return c};
const abdToday=()=>{if(typeof SDAY!=='function'||!D||D.weekend)return null;const a=ABD[SDAY()];if(!a||!K[a.t]||(window.EDITION_CUT||[]).includes(a.t))return null;const c=rc();if(c.saved[a.v]||c.gone[a.v])return null;return a};
const PNAME={0:'before school',2:'break',4:'lunch'},RNAME={chem:'the Chem Lab',gym:'the gym',maths:'Ms. Sherman’s room',corridor:'the front hall',library:'the library',toilets:'the bathroom'};
/* the morning tip, once you're at school and today's story beat is done */
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(TEST||!D||busy||panelMode!=='roam'||(typeof atHome==='function'&&atHome()))return;const a=abdToday();if(!a||D.f.abdTip||D.period>a.per||!D.f['esc'+cal()])return;
 D.f.abdTip=1;setTimeout(()=>{if(busy||panelMode!=='roam'){D.f.abdTip=0;return}runHook({run:async()=>{await dms('Nivaan','online',a.tip.concat([['me','where and when','7:58'],['them',RNAME[a.room]+'. '+PNAME[a.per]+'. if you dont go nobody will','7:58']]));return 'stay'}})},3500)}}
/* the bell for it, and what happens if you never show */
ON_PERIOD.push(async(i,res)=>{if(TEST||!D||D.weekend)return;const a=abdToday();if(!a)return;
 if(i===a.per&&!res)setTimeout(()=>toast('⏰ '+K[a.v].n+' is with '+K[a.t].n+' in '+RNAME[a.room]+'. Right now.'),1200);
 if(i>a.per&&!D.f.abdDone){D.f.abdDone=1;rc().gone[a.v]=cal();save&&save();setTimeout(()=>toast('😶 '+K[a.v].n+' never came back from '+RNAME[a.room]+'.'),2200)}});
/* walk in on it (random chaos is held back so the two never collide) */
{const _er=enterRoom;enterRoom=async function(room){
 let a=null;try{a=abdToday();if(a&&!TEST&&room===a.room&&D.period===a.per&&!D.f.abdDone){D.f.chaos=D.f.chaos||{};D.f.chaos['p'+cal()+'_'+D.period]=1}else a=null}catch(e){a=null}
 const r=await _er(room);
 if(a)setTimeout(()=>{if(!busy&&!D.f.abdDone&&D.room===a.room)runHook({run:()=>rescueScene(a)})},400);
 return r}}
async function rescueScene(a){
 D.f.abdDone=1;cue('tension',true);
 for(const id in A)if(id!=='you'&&A[id]&&!A[id].dead)walk(id,A[id].x<160?-30:350,90).then(()=>{if(A[id])remove(id)});
 await wait(TEST?0:500);
 if(!A.you)put('you',40,1,{y:156});else{await walk('you',60,90);A.you.dir=1}
 await a.set();
 const order=[0,1,2].sort(()=>Math.random()-.5);const c=await choose(order.map(i=>a.opts[i][0]),'What do you do?');const [,kind,fn]=a.opts[order[c]];
 let out=kind;
 if(kind==='mash'){await walk('you',A[a.v].x-12,110);const ok=await mash('GET '+K[a.v].n.toUpperCase()+' OUT',{need:26,time:4,info:'MASH!'});out=ok?'flee':'lose';if(ok){pose('you','punch');SFX.smack&&SFX.smack();shake(.4);await wait(300);pose('you',null)}}
 else if(kind==='swap'){const ok=await vgThrow('SWAP THE BEAKERS');out=ok?'drink':'lose'}
 else if(fn)out=await fn();
 if(out==='die'){A.you.ex='dead';await die(a.death);return 'stay'}
 if(out==='drink'){await N('He drinks his. Your swap. He licks his lips, frowns, and slowly turns a very interesting shade of purple.');A[a.t].topC='#8a4ac0';await say(a.t,'(purple) …Oh. Oh, that’s a SHAME.','shock');out='flee'}
 if(out==='flee'){await walk(a.t,350,140);remove(a.t);rc().saved[a.v]=cal();const cr=crew();cr.allies=cr.allies||{};cr.allies[a.v]=1;cr.ev=cr.ev||{};cr.ev['save_'+a.v]=1;save&&save();
  face(a.v,'you');A[a.v].ex='cry';await say(a.v,pick(['(shaking) I— thank you. Thank you. I’m not going in there again. Ever.','You came. Nobody comes. Why did you come?','(laughing and crying at the same time) I owe you. I owe you like my whole life.']),'cry');
  cue('romance');await walk(a.v,-30,100);remove(a.v);toast('🎁 '+K[a.v].n+' is safe. Ally + evidence against '+K[a.t].n+'.');return 'stay'}
 /* lost them */
 pose(a.t,'grab');A[a.v].ex='scared';SFX.smack&&SFX.smack();A.you.ex='hurt';pose('you','hurt');await say(a.t,'Run along. This one’s mine.','evil');
 await Promise.all([walk(a.t,350,90),walk(a.v,342,90)]);remove(a.t);remove(a.v);pose('you',null);
 rc().gone[a.v]=cal();save&&save();await N(K[a.v].n+' looks back at you once. Then the door shuts.');return 'stay'}
/* crew evidence counts the kids you saved */
{const _ce=crewEvidence;crewEvidence=function(){return _ce()+Math.floor(Object.keys(rc().saved).length/2)}}
/* MISSING posters for the ones you didn't save; saved kids hang around; tomorrow's kid is around today */
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);try{if(!D||D.weekend||TEST)return r;const c=rc();
 if(room==='corridor'||room==='hallb'){let i=0;for(const v in c.gone){prop({t:'mposter',x:40+i*34,y:110,who:K[v]?K[v].n.toUpperCase():v,layer:-60});i++}}
 const free=PERIODS[D.period]&&PERIODS[D.period].free;
 if(free&&['corridor','canteen','field','library'].includes(room)){const s=Object.keys(c.saved).filter(v=>!A[v]);if(s.length&&Math.random()<.5){const v=pick(s);put(v,60+Math.random()*200,Math.random()<.5?1:-1,{y:floorOf(room)[0]+6});
   const t=(Object.values(ABD).find(x=>x.v===v)||{}).t;if(typeof bubbles!=='undefined')setTimeout(()=>{if(A[v])bubbles.push({id:v,txt:pick(['hey. thanks again','i owe you lunch','never going back there']),t:3})},800)}}
 const nxt=typeof SDAY==='function'?ABD[SDAY()+1]:null;
 if(free&&nxt&&K[nxt.t]&&!c.gone[nxt.v]&&!c.saved[nxt.v]&&!A[nxt.v]&&['corridor','canteen'].includes(room)&&Math.random()<.6){put(nxt.v,200+Math.random()*80,-1,{y:floorOf(room)[0]+6});
   if(typeof bubbles!=='undefined')setTimeout(()=>{if(A[nxt.v])bubbles.push({id:nxt.v,txt:pick([K[nxt.t].n.split(' ').pop().toLowerCase()+' keeps staring at me','got a meeting tmrw. weird',K[nxt.t].n.split(' ').pop().toLowerCase()+' knows my weight??']),t:3.5})},900)}}catch(e){}return r}}
/* the Do Now headline */
{const _qn=qlNow;qlNow=function(body){_qn(body);const a=abdToday();if(!a||D.f.abdDone)return;const box=qel('div','qcard main');box.style.borderLeftColor='#ff3040';box.appendChild(qel('div','ic','🚨'));const m=qel('div','m');box.appendChild(m);
 m.appendChild(qel('h4','','SAVE '+K[a.v].n.toUpperCase()));m.appendChild(qel('div','act',K[a.t].n+' · '+RNAME[a.room]+' · '+PNAME[a.per]+'. If you don’t go, nobody will.'));const f=body.querySelector('.qcard');body.insertBefore(box,f||null)}}
/* end-of-day report card */
{const _nd=newDay;newDay=async function(died){try{if(!died&&!TEST&&D&&!D.weekend&&P.calStarted&&typeof SDAY==='function'&&SDAY()){const c=rc(),sv=Object.keys(c.saved),gn=Object.keys(c.gone);
  const found=Object.keys(P.deaths||{}).length,tot=Object.keys(DEATHS).length;
  await card('END OF DAY '+SDAY(),'SAVED '+sv.length+'   ·   GONE '+gn.length+'   ·   EVIDENCE '+crewEvidence()+'   ·   DEATHS FOUND '+found+'/'+tot,3800)}}catch(e){}return _nd(died)}}
