'use strict';
/* =====================================================================
   HIGHSCHOOL — classes.
   A lesson is a place: everyone's already sat down when you come in, you pick who
   to sit next to, the teacher actually teaches (on the board, out loud, badly),
   something goes wrong that could only go wrong with these kids in this room,
   your neighbour tells you something quietly, and the bell sends everyone out.
   ===================================================================== */

/* ---------- where people sit ---------- */
function seatsFor(room){
 const S=[];const row=(xs,y,o)=>xs.forEach((x,i)=>S.push(Object.assign({x,y,i,row:y},o)));
 if(room==='english'||room==='maths'){row(SEATS.back,SEATS.backY,{pose:'sit',dir:-1});row(SEATS.front,SEATS.frontY,{pose:'sit',dir:-1})}
 else if(room==='science'){row([108,132,188,212,268,292],133,{dir:-1});row([108,132,188,212,268,292],157,{dir:-1})}
 else if(room==='foodtech'){row([72,104,172,204],137,{dir:-1});row([72,104,172,204],159,{dir:-1})}
 else if(room==='chem'){row([112,136,160,184,208],150,{dir:1})}
 else if(room==='drama'){row([76,104,132,188,216,244],154,{pose:'sit'})}
 else row([110,136,162,188,214,240,266,292],146,{dir:-1});
 return S;
}
const BOARD={english:[98,24,120,52],maths:[98,24,120,52],science:[226,80,0,0],foodtech:[14,24,56,26]};
function classKids(room){
 let ids=(CLASS[D.period]&&CLASS[D.period][room])||rosterFor(D.period,room).map(e=>e[0]).filter(id=>!TEACHERS.includes(id));
 return ids.filter(k=>K[k]&&!D.dead[k]&&!(k==='aidan'&&D.f.aidanDead)&&k!=='you');
}
const neighbours=(c,seat)=>c.seats.filter(s=>s.row===seat.row&&Math.abs(s.i-seat.i)===1&&s.who&&s.who!=='you').map(s=>s.who);

/* everyone's already there; you come in late, the way you always do */
async function classIn(room,opts){
 opts=opts||{};
 const t=opts.teacher||(TEACH[D.period]&&TEACH[D.period][room]),kids=opts.kids||classKids(room),seats=seatsFor(room);
 const fixed=opts.fixed||{};
 for(const id in fixed){const s=seats[fixed[id]];if(s)s.who=id}
 let k=0;for(let i=0;i<seats.length&&k<kids.length;i++){if(seats[i].who)continue;if(i%3===2&&kids.length-k<seats.length-i-1)continue;while(k<kids.length&&Object.keys(fixed).includes(kids[k]))k++;if(k<kids.length)seats[i].who=kids[k++]}
 for(const s of seats)if(s.who&&s.who!=='you'){const a=put(s.who,s.x,s.dir||1,{y:s.y,pose:s.pose||null});if(room==='drama')a.dir=s.x<160?1:-1}
 if(t&&!A[t]){const L=TEACHER_SPOT[room]||[40,1,'hips',146];put(t,L[0],L[1],{pose:L[2],y:L[3]})}
 const c={room,t,kids:seats.filter(s=>s.who).map(s=>s.who),seats,nb:[]};
 if(!A.you)put('you',24,1,{y:160,sp:62});
 let mine=opts.you!=null?seats[opts.you]:null;
 if(!mine){
  const free=seats.filter(s=>!s.who);const opts_=[];const seen=new Set();
  for(const s of free){const n=neighbours(c,s);const key=n.slice().sort().join();if(seen.has(key))continue;seen.add(key);opts_.push({s,n})}
  opts_.sort((a,b)=>b.n.length-a.n.length);const pickList=opts_.slice(0,3);
  if(pickList.length>1){
   const i=await choose(pickList.map(o=>o.n.length===2?'Sit between '+nameOf(o.n[0])+' and '+nameOf(o.n[1])+'.':o.n.length?'Sit next to '+nameOf(o.n[0])+'.':'Sit on your own.'),'Where do you sit?');
   mine=pickList[i].s;
  }else mine=(pickList[0]&&pickList[0].s)||free[0]||seats[seats.length-1];
 }
 mine.who='you';c.mine=mine;c.nb=neighbours(c,mine);
 if(Math.abs(A.you.y-mine.y)>2)await Promise.all([walk('you',mine.x,62),tw(A.you,{y:mine.y},Math.max(200,Math.abs(A.you.x-mine.x)/62*1000))]);else await walk('you',mine.x,62);
 A.you.dir=mine.dir||1;A.you.pose=mine.pose||null;
 for(const n of c.nb)face(n,'you');
 return c;
}
const TEACHER_SPOT={english:[40,1,'hips',146],maths:[40,1,'hips',146],science:[66,1,'sit',132],foodtech:[40,1,'hips',146],chem:[220,-1,'hips',142],drama:[160,1,'hips',104],gym:[56,1,'hips',146]};
/* writing on the board, one letter at a time */
async function scrawl(room,lines,col){
 const b=BOARD[room];if(!b)return;const t=TEACH[D.period]&&TEACH[D.period][room];
 const stand=t&&A[t]&&A[t].pose!=='sit';if(stand){A[t].pose=null;await Promise.all([walk(t,b[0]+18,60),tw(A[t],{y:124},500)]);pose(t,'reach')}
 const p=prop({t:'scrawl',x:b[0],y:b[1],w:b[2],h:b[3],lines,c:col||'#2a3a6a',t0:T,cps:14,layer:-200});
 const n=lines.join('').length;for(let i=0;i<Math.min(8,n/3);i++){SFX.blip(1900+Math.random()*400,'triangle');await wait(110)}
 await wait(n/14*1000-800);
 if(stand){pose(t,null);const L=TEACHER_SPOT[room];await Promise.all([walk(t,L[0],60),tw(A[t],{y:L[3]},500)]);A[t].pose=L[2];face(t,1)}
 return p;
}
const _dpc=drawProp;
drawProp=function(p){
 if(p.t==='scrawl'){const shown=Math.floor((T-p.t0)*p.cps);let k=0;if(p.w)R(p.x,p.y,p.w,p.h||p.lines.length*8+2,'#f4f6f2');p.lines.forEach((l,i)=>{const s=l.slice(0,Math.max(0,shown-k));k+=l.length;px(s,p.x+3,p.y+2+i*8,p.c)});return}
 if(p.t==='plane'){const x=Math.round(p.x),y=Math.round(p.y);R(x-3,y,7,1,'#f4f0e6');R(x-2,y-1,4,1,'#f4f0e6');R(x,y+1,3,1,'#d8d4c8');return}
 if(p.t==='rope'){R(p.x,0,2,p.len||110,'#c8a868');for(let i=0;i<(p.len||110);i+=6)R(p.x,i,2,1,'#a8885a');return}
 return _dpc(p);
};
async function classOut(c,line){
 SFX.bell();
 if(line&&A[c.t])await say(c.t,line);
 await N(pick(['The bell. Chairs scrape. Everyone moves at once like they rehearsed it.','The bell goes. Nobody waits to be dismissed. Nobody ever has.','The bell. Bags on, chairs back, gone.']));
 const out=c.seats.filter(s=>s.who&&s.who!=='you'&&A[s.who]&&!A[s.who].dead);
 out.forEach((s,i)=>{const a=A[s.who];if(c.stay&&c.stay.includes(s.who))return;timers.push({t:i*.12,r:()=>{if(A[s.who]!==a||a.dead)return;a.pose=null;tw(a,{y:150},250);walk(s.who,-18,70+(i%3)*8)}})});
 await wait(900);
}

/* ---------- what your neighbour tells you when the teacher isn't looking ---------- */
const WHISPER={
 hasan:[[['hasan','(whispering) Do you ever feel like you’ve already laughed at every joke you’re going to hear today?'],['hasan','I laughed at Arjun’s joke this morning before he finished it. He hasn’t finished it yet. It’s nine o’clock.']],[['hasan','(whispering) My dad works nights. I know Arjun says that like it’s a joke. I just don’t see him much. That’s all.'],['hasan','Don’t make it a thing. I’m making it a thing by telling you. Forget it.']]],
 arjun:[[['arjun','(whispering) If you tell anyone I did the homework I’ll tell everyone you cried at the Toy Story bit.'],['you','Which bit?'],['arjun','All of them. You cried at all of them.']],[['arjun','(not whispering enough) Everyone in this room is a disappointment to somebody. I’m just the only one honest about it.'],['arjun','…Don’t look at me like that. Look at the board.']]],
 alex:[[['alex','(drawing soccer formations in the margin) If I don’t make the county squad, my dad’s going to say “next year” in the voice. You know the voice.'],['alex','Every dad’s got the voice.']],[['alex','(whispering) My left foot’s been twitching since Tuesday. Coach says it’s the weapon waking up.']]],
 dheva:[[['dheva','(fixing one strand of hair in his phone camera) People think it’s vanity. It’s not. It’s the only thing I get to decide about myself before school.'],['dheva','…That came out deep. Ignore that.']],[['dheva','(whispering) My mom calls the powder “that cocaine”. In front of guests.']]],
 marcus:[[['marcus','(whispering) I make jokes because if I’m the one being weird, nobody else gets to decide I’m weird.'],['marcus','Also because they’re funny. Mostly the second one.']],[['marcus','(whispering) Did you know you can fit nine Haribo in your mouth if you believe in yourself?'],['you','Why do you know that?'],['marcus','Belief.']]],
 tyler:[[['tyler','(whispering, eyes on the teacher) If she smiles with her teeth, don’t move. If she smiles without teeth, run.'],['tyler','I’ve never seen her smile without teeth.']],[['tyler','(whispering) I feel like I’ve been in this seat before. Like, a lot. Is that normal?']]],
 abby:[[['abby','(writing chords in the back of her exercise book) I wrote a song about the 43. It’s mostly about the boy who gives his seat up.'],['abby','Don’t tell him. He’d combust.']],[['abby','(whispering) Morrissey ate my homework. My dog. Not the singer. Although honestly, both would.']]],
 paul:[[['paul','(whispering, far too loudly) I could lift this desk with you on it. Not now. But I could.'],['paul','You’re very light. I mean that respectfully.']],[['paul','(whispering) My arms are too long for the desks. My elbows are in Kenneth’s lesson.']]],
 kenneth:[[['kenneth','(whispering) Five foot seven. Five foot SEVEN. My cousin’s five eleven and he can’t even catch.'],['kenneth','Height’s a social construct. Says me. Short people invented it.']],[['kenneth','(whispering) I talk to people online at night because nobody at school texts back after nine. That’s not sad. That’s a sleep schedule.']]],
 jacob:[[['jacob','(whispering) Someone pushed me into the trash cans this morning. Nobody laughed. That’s worse, somehow. Like they felt sorry for the trash cans.']],[['jacob','(whispering) I’m doing breathing. In for four. You do it too. I don’t want to do it alone.']]],
 angelo:[[['angelo','(sliding a price list across the desk) Friends and family rate. You’re not family. You’re friends rate.']],[['angelo','(whispering) My mom works two jobs. I work one. Locker thirteen. It’s not a joke to me, the business. It’s just funny to everyone else.']]],
 omer:[[['omer','(whispering) My mom picks my clothes because my dad used to, and then he didn’t. So she just kept doing it. That’s it. That’s the whole story.']],[['omer','(doing silent push-ups against the desk) For speed.']]],
 corey:[[['corey','(whispering) I give my seat up on the 43 because old Mrs. Reilly gets on at the hospital stop. Every day. Nobody else moves.'],['corey','Don’t make it a thing.']],[['corey','(checking his curls in the reflection of the window) Emergency. Not an emergency. Fine. It’s fine.']]],
 sean:[[['sean','(whispering) I practiced saying “hi” forty times on the bus. I’m going to say it zero times.']],[['sean','(whispering) Stella’s dad coaches softball. He’s terrifying. He shook my hand once and I heard a bone.']]],
 stella:[[['stella','(whispering) Sean thinks I don’t notice him practicing. I notice. It’s my favorite part of the day.']],[['stella','(whispering) My dad left the ball. The lucky one. Everything else, he took.']]],
 david:[[['david','(whispering) Class president. Nine votes last year. Four were cousins. One was a teacher who didn’t understand the form.']],[['david','(whispering) I have a theory about today. It keeps being today. Don’t laugh.'],['you','I’m not laughing.'],['david','…Oh no. You know too.']]],
 nivaan:[[['nivaan','(phone under the desk) Ninety-one viewers. Ninety-one people watching a math lesson. That’s community.']],[['nivaan','(whispering) I stream because when I stop, it’s quiet at home. That’s all. Don’t clip that.']]],
 aidan:[[['aidan','(not whispering, not looking at you) You sat next to me. Nobody sits next to me.'],['aidan','…Thank you. I’ll remember. I remember everything.']],[['aidan','(very quietly) The clock goes backwards at 10:14. Watch it. Everyone looks away right before.']]],
 tez:[[['tez','(whispering) Six years in tenth grade. Every year I think “this is the year”. Every year it’s Friday.']],[['tez','(whispering) Don’t tell anyone, but I actually like Food Tech. Kettle’s scones are evil and correct.']]],
 kayden:[[['kayden','(whispering) The Hittaz has two members. Me and my cousin. He lives in Wales. Recruitment is slow.']],[['kayden','(whispering) My puffer’s not for style. My house is cold. Okay, it’s also for style.']]],
 mia:[[['mia','(whispering) Cadets. Saturday mornings. I like it because someone tells you exactly what to do and then you do it and it’s right.']],[['mia','(whispering) I’ve counted the exits in every room. This one has two. Remember the window.']]],
 brandon:[[['brandon','(whispering) My sponges always collapse. My grandma says it’s because I’m anxious. I said “the sponge isn’t anxious, Grandma”. She said “isn’t it?”']]],
 ollie:[[['ollie','(whispering) Nobody else sits here. It’s been my seat since 1987.']]]
};
async function whisper(c){
 const n=c.nb.find(id=>WHISPER[id]&&!D.chat['w_'+id]);if(!n)return;
 D.chat['w_'+n]=1;const set=WHISPER[n][(P.loops+n.length)%WHISPER[n].length];
 face(n,'you');face('you',n);
 for(const [w,t] of set)await say(w,t,w===n?(t.includes('(')?null:null):null);
 const REAL=['“Honestly? I’m glad you sit here.”','“Same. I didn’t sleep either.”','“You’re not as annoying as everyone says.”','“If she calls on me I’m faking a nosebleed.”'];
 const JOKE=['“If this class was a person I’d fight it.”','“I think my pencil just gave up on life.”','“Blink twice if you’re being held here against your will.”','“The clock’s going backwards. I checked.”'];
 const real=REAL[(P.loops+n.length)%REAL.length],joke=JOKE[(P.loops+n.length*3)%JOKE.length];
 const r=await choose(['(whisper) '+real,'(whisper) '+joke,'“Shh. She’s looking.”'],'WHISPER BACK TO '+K[n].n.split(' ')[0].toUpperCase());
 if(r===0){await say('you','(whispering) '+real.replace(/[“”]/g,''));await say(n,pick(['…Thanks. Genuinely.','Yeah. Yeah, okay. Same time tomorrow?','You’re alright, you know.']),'happy');bond(n,1);toast('♥ '+K[n].n.split(' ')[0]+' likes you a bit more.')}
 else if(r===1){await say('you','(whispering) '+joke.replace(/[“”]/g,''));await say(n,pick(['(snorting into their sleeve)','Stop. STOP. I’m going to get detention.','That’s terrible. Do it again.']),'laugh')}
 else{await say('you','(whispering) Shh. She’s looking.');await say(n,'(sitting up straight, eyes front) …','sad');toast('Nobody got caught. Nobody had fun.')}
}

/* ---------- the teachers actually teach ---------- */
const PLANS={
 shermian:[{
  open:async c=>{await say('shermian','Good morning, my angels! Phones in the box, butts on seats, hearts on sleeves!','happy');await scrawl('maths',['FRACTIONS :)','1 PIZZA','8 ANGELS','= ?'],'#c04070');await say('shermian','If Miss has one pizza and eight little angels… how many angels go hungry?','happy')},
  q:['“None, miss. You cut it into eight.”','“Depends how much YOU eat, miss.”','“Arjun.”'],
  a:[async c=>{await say('shermian','CORRECT! Sticker!','happy');SFX.sweet();await say('shermian','(placing a gold star on your forehead, pressing very hard) There. Now everyone knows.','happy')},
     async c=>{await evil('shermian');await say('shermian','Are you calling Miss… GREEDY?','evil');await walk('shermian',A.you.x-14,90);pose('shermian','slam');SFX.smack();shake(.8);await N('She snaps a meter rule in half on your desk. Both halves land in your lap.');pose('shermian',null);await sweet('shermian');await say('shermian','Lovely. Keep those. A souvenir.','happy');await walk('shermian',40,70)},
     async c=>{await say('you','Arjun.');if(A.arjun){await say('arjun','…That’s actually fair. I’d eat all eight.','smirk');await say('shermian','Honesty! Sticker for Arjun!','happy')}else await say('shermian','Arjun isn’t HERE, sweetie. Are you seeing things? We don’t see things in Math.','evil')}]},{
  open:async c=>{await say('shermian','Simultaneous equations! Two things that are true at the same time. Like Miss. Nice AND watching you.','happy');await scrawl('maths',['X + Y = 10','X - Y = 2','X = ?  Y = ?'],'#2a3a6a')},
  q:['“X is six, Y is four.”','“X is love, Y is pain.”','Copy off your neighbor.'],
  a:[async c=>{await say('shermian','Six and four! Somebody give this angel a sticker. Somebody give them TWO.','happy');SFX.sweet()},
     async c=>{await say('shermian','…That’s beautiful, sweetie. That’s also my divorce.','sad');await say('shermian','Detention.','evil');fxState.red=1;await wait(400);await sweet('shermian')},
     async c=>{const n=c.nb[0];if(n){await say(n,'(sliding their book over) It’s six and four. You owe me.');bond(n,1)}else await say('you','(There’s nobody next to you. You copy the fire exit sign instead.)')}]}],
 loach:[{
  open:async c=>{await say('loach','Page forty-seven.');await scrawl('science',['P.47'],'#3a4a3a');await N('She sits back down. She doesn’t write anything else. She hasn’t written anything else since 2009.')},
  q:['Actually read page forty-seven.','Make a paper aeroplane.','Put your head down and sleep.'],
  a:[async c=>{hold('you','book');await N('Page forty-seven: a diagram of a mug. In the margin, old blue ballpoint: “again again again”. Under it: “me too”. Under that: “1987”.');hold('you',null);if(typeof lore==='function')lore('again')},
     async c=>{hold('you','paper');await wait(300);hold('you',null);pose('you','throw');const pl=prop({t:'plane',x:A.you.x,y:A.you.y-26});await Promise.all([tw(pl,{x:84},1300),tw(pl,{y:112},1300,'in')]);SFX.click();await N('It glides the length of the room and lands one inch from her mug.');ex('loach','evil');await wait(700);ex('loach',null);await N('She looks at the plane. She looks at you. She turns a page. Your heart doesn’t start again until the bell.');pl.hide=1;pose('you',null)},
     async c=>{A.you.ex='closed';await N('You sleep. You dream about a corridor where every clock says 3:15. When you wake up, there’s a sticky note on your arm in her handwriting: “Mm.”');A.you.ex=null}]}],
 coach:[{
  open:async c=>{await say('coach','CIRCUITS. Rope. Bench. Press-ups. You rotate when I blow the whistle. You stop when you die.','yell');SFX.whistle();prop({t:'rope',x:120,len:120,dress:1})},
  q:['Climb the rope.','Bench jumps.','“Sir, I forgot my kit.”'],
  a:[async c=>{await walk('you',120,80);const ok=await mash('Climb!',{need:18,time:5});if(ok){await tw(A.you,{z:40},900);await say('coach','…Hm. Not bad. For a civilian.','smirk');await tw(A.you,{z:0},500)}else{await tw(A.you,{z:12},400);await tw(A.you,{z:0},200);SFX.thud();A.you.pose='lie';await say('coach','Gravity: one. You: nil.','laugh');A.you.pose=null}},
     async c=>{const r=await rhythm('Bench jumps: jump on the whistle',{n:6,gap:.8});await say('coach',r>=4?'Acceptable.':'My NAN jumps better than that and she’s been dead since 2011.',r>=4?'smirk':'yell')},
     async c=>{await say('coach','Forgot your kit? Lost property. Go.','evil');await N('The lost property box is older than the school. You come back in gym clothes with a name tag that says O. FINCH, 7F, and shorts from 1987.');if(typeof lore==='function')lore('kit')}]}],
 voss:[{
  open:async c=>{await say('voss','Titration! Drop by drop, until the color changes. Like a person. Drop by drop, until they change.','smirk');hold('you','flask')},
  q:['Titrate carefully.','Pour the whole thing in.','Ask him what’s in the back fridge.'],
  a:[async c=>{const r=await meter('Stop the drip on pink',{speed:1.1});await say('voss',r?'Pink. Beautiful. Like a fresh… sample.':'Overshot. Purple. Like a bruise. I like bruises.','smirk');hold('you',null)},
     async c=>{SFX.fire();prop({t:'smoke',x:A.you.x,y:A.you.y-24});hold('you',null);await N('It foams, goes green, and eats a hole in the bench. Mr. Voss watches it with his whole face.');await say('voss','Oh, that’s WONDERFUL. Do it again. On something warmer.','evil')},
     async c=>{await say('voss','(very still) …Leftovers.','evil');await say('voss','From lunch. From many lunches.','smirk');hold('you',null)}]}],
 kettle:[{
  open:async c=>{await say('kettle','Scones, my little dumplings! Light, fluffy, and no crying in the dough. Tears make them heavy.','happy');await scrawl('foodtech',['SCONES','NO TEARS'],'#c03030')},
  q:['Knead it properly.','Let Tez do it.','Eat the dough.'],
  a:[async c=>{const ok=await mash('Knead!',{need:16,time:4.5});await say('kettle',ok?'Oh, that’s a scone with a SOUL.':'That’s a scone with a criminal record.',ok?'happy':'evil')},
     async c=>{if(A.tez){await say('tez','Six years. I can do these with my eyes shut. I DO do them with my eyes shut.','smirk');await say('kettle','Tez, petal. Eyes open. Last year you scone’d a thumb.','evil')}else await say('kettle','Tez isn’t in today. He’s twenty-one. He has errands.')},
     async c=>{await say('kettle','DID YOU JUST EAT RAW DOUGH IN MY KITCHEN?','evil');await N('She takes the dough off you the way you take something off a toddler, and puts it in the oven. Then she looks at you. Then the oven. For a long time.');await sweet('kettle')}]}],
 pratt:[{
  open:async c=>{await say('pratt','FREEZE FRAMES. When I clap, you freeze. If you move, you’re not an actor. You’re furniture.','yell');SFX.smack()},
  q:['Freeze like a statue.','Freeze mid-sneeze.','Don’t freeze. Dance.'],
  a:[async c=>{const r=await meter('Hold perfectly still',{speed:1.4,zone:.2});await say('pratt',r?'MAGNIFICENT. You’re a pillar. You’re a tomb. I could cry.':'You BLINKED. I saw it. The audience saw it. God saw it.',r?'happy':'yell')},
     async c=>{await say('pratt','A sneeze! A moment of pure animal TRUTH! Hold it! HOLD IT!','happy');await N('You hold it for ninety seconds. Mia times it on her watch without being asked.')},
     async c=>{await say('pratt','(staring) …You’ve broken the form. You’ve broken the FORM.','shock');await say('pratt','I’ve waited twenty years for someone to break the form. Detention. And an A.','happy')}]}],
 balduf:[{
  open:async c=>{await say('balduf','Haiku! Five, seven, five. Syllables, darlings. Count them like they owe you money.','happy');await scrawl('english',['HAIKU','5 - 7 - 5','NO \'COULD OF\''],'#a02020')},
  q:['“Friday comes again / the bell rings and nobody / ever gets to leave.”','“Ms. Balduf is nice / she has a lovely red pen / please do not stab me.”','“I could of written / a better one but I was / busy, ha ha ha.”'],
  a:[async c=>{await say('balduf','…That’s haunting, darling. That’s really haunting. A-minus.','sad');if(typeof lore==='function')lore('haiku')},
     async c=>{await say('balduf','(laughing, genuinely) Oh, that’s good. That’s VERY good. I won’t stab you. Today.','laugh')},
     async c=>{await evil('balduf');await say('balduf','“Could of.” In a HAIKU.','evil');await walk('balduf',A.you.x-14,100);hold('balduf','pen');pose('balduf','slam');SFX.squelch();A.you.hurt=2;blood(A.you.x+4,A.you.y-12,14,1,40,A.you.y+3);shake(.9);await N('The red pen goes through the back of your hand and into the desk. It stands up on its own, like a little flag.');await sweet('balduf');hold('balduf',null);await say('balduf','Could HAVE, darling. Ice it at break.','happy');await walk('balduf',40,80)}]}]
};

/* ---------- things that go wrong because of who's in the room ---------- */
const CHAOS=[
 {room:'maths',need:['arjun','dheva'],run:async c=>{face('arjun','dheva');await say('arjun','(flicking Dheva’s hair with a ruler) Is that powder or did a moth die on you?','smirk');A.dheva.shake=1;await N('Dheva stands up. Slowly. Like a man getting out of a bath he’s decided to burn down.');await evil('shermian');await say('shermian','SIT. DOWN.','evil');A.dheva.shake=0;await sweet('shermian');await say('dheva','(sitting) …After school. Parking lot.','angry');await say('arjun','I’ll be there. I’ll bring a hat for you.','smirk')}},
 {room:'maths',need:['marcus','tyler'],run:async c=>{await say('marcus','Miss, should we divide it up evenly between everyone who wants a slice? Asking for everyone who wants a slice.','smirk');await say('tyler','(giggling) heh—','laugh');await evil('shermian');await say('shermian','Tyler. Was that a LAUGH?','evil');await walk('shermian',A.tyler.x-12,90);hold('shermian','paper');await N('She takes Tyler’s pencil case, opens the window, and throws it out. It’s the first floor. You hear it hit a car.');hold('shermian',null);await sweet('shermian');await say('shermian','Lovely. Back to pizza!','happy');await walk('shermian',40,80)}},
 {room:'maths',need:['alex'],run:async c=>{await N('Alex is tapping his foot. Left, left, right. The free-kick rhythm. He doesn’t know he’s doing it.');await say('shermian','Alex, sweetie. Your foot.','happy');await say('alex','Sorry, miss, it’s the weapon—');await evil('shermian');await say('shermian','If I hear the weapon again, I’ll staple it to the floor.','evil');await N('He doesn’t move his foot for the rest of the lesson. You can see it suffering.');await sweet('shermian')}},
 {room:'science',need:['paul','kenneth'],run:async c=>{await say('paul','Kenneth. Arm wrestle. On the bench. Loser buys fries.','happy');await say('kenneth','I always buy fries.','sad');await walk('paul',A.kenneth.x+12,60);pose('paul','grab');pose('kenneth','grab');for(let i=0;i<5;i++){A.kenneth.shake=1;SFX.thud();await wait(220)}A.kenneth.shake=0;hop('kenneth',8,260);SFX.thud();await N('Kenneth goes over the bench, through a tray of test tubes, and lands in the sink. The tap turns on by itself.');A.kenneth.pose='lie';pose('paul','cheer');await say('loach','Mm.');await say('kenneth','(from the sink) …fries are on me.','hurt');A.kenneth.pose=null;pose('paul',null)}},
 {room:'science',need:['angelo'],run:async c=>{await N('Angelo has opened a shop. On the bench. Out of his blazer. There are price tags.');await say('angelo','Bunsen lighters, a buck. Goggles that aren’t scratched, two bucks. A pass to the bathroom signed by Ms. Loach—','smirk');await say('you','Did she sign it?');await say('angelo','She signs anything. Watch.');await walk('angelo',90,70);hold('angelo','paper');await say('loach','(signing it without looking) Mm.');await say('angelo','Three bucks. Market rate.','happy');hold('angelo',null);await walk('angelo',c.seats.find(s=>s.who==='angelo').x,70)}},
 {room:'science',need:['omer'],run:async c=>{await N('Omer is doing press-ups between the benches. Nobody asked. Nobody stops him.');await say('omer','Forty-one. For speed. Forty-two.','angry');await say('loach','Page forty-seven.');await say('omer','(still going) I KNOW, MISS.','angry')}},
 {room:'science',need:['jacob'],run:async c=>{await N('Someone behind Jacob leans back on their stool. It bumps him. His pen skids across the page.');A.jacob.shake=1;await say('jacob','(very quietly) In for four.','angry');await wait(800);A.jacob.shake=0;await say('jacob','(very quietly) Out for four.');await N('Nobody laughs. The whole bench breathes with him, just in case.')}},
 {room:'gym',need:['paul'],run:async c=>{prop({t:'rope',x:250,len:120});await walk('paul',250,80);await tw(A.paul,{z:80},1500);await say('paul','(from the ceiling) I’m not coming down. I live here now.','happy');await say('coach','PAUL. DOWN.','yell');await say('paul','Make me.','happy');await N('Coach doesn’t make him. Nobody has ever been able to make Paul do anything. He comes down at the bell, on his own, like weather.');await tw(A.paul,{z:0},600)}},
 {room:'gym',need:['marcus'],run:async c=>{await say('marcus','Sir, the rope’s very thick. And very long. I’m just observing. As a scientist.','smirk');await say('coach','Twenty press-ups for observing.','yell');await say('marcus','Worth it.','smirk')}},
 {room:'gym',need:['hasan','arjun'],run:async c=>{await say('arjun','Hasan, your head would make a great medicine ball. Shape’s already right.','smirk');await say('hasan','Arjun, your face would make a great dodgeball. Everyone already wants to throw something at it.','smirk');await say('coach','BOTH OF YOU. Suicides. Till one of you means it.','yell')}},
 {room:'foodtech',need:['kayden'],run:async c=>{await say('kayden','(rapping, quietly, over the mixer) Flour on my fit, sugar on my chain, Kettle in the kitchen and she— she—','smirk');await say('kettle','Finish the bar, Kayden.','evil');await say('kayden','…and she’s very nice and fair, miss.','scared')}},
 {room:'foodtech',need:['brandon'],run:async c=>{await N('Brandon’s scones are already collapsing. He hasn’t put them in the oven yet. They’re collapsing out of fear.');await say('brandon','(whispering to them) Please. Please rise. I’ll be good.','scared')}},
 {room:'chem',need:['nivaan'],run:async c=>{pose('nivaan','film');await say('nivaan','(whispering to his phone) Chat, he’s doing the blood type thing again—','scared');await say('voss','Is that a camera? Oh, film me. Film me ALL day.','happy');pose('nivaan',null)}},
 {room:'drama',need:['mia'],run:async c=>{await say('pratt','Mia. Weep for me.','yell');await say('mia','No.');await say('pratt','THAT. That’s the truth. Stand up. Everyone, look at Mia. That’s a woman who has never once done what a man in a scarf told her.','happy')}}
];

/* ---------- the lesson ---------- */
const _legacyLesson=genericLesson;
genericLesson=async function(room){
 if(room==='office')return _legacyLesson(room);
 const t=TEACH[D.period]&&TEACH[D.period][room];
 const c=await classIn(room);
 if(t&&A[t])face(t,1);
 const plans=PLANS[t];
 if(plans){
  const pl=plans[(D.period+P.loops)%plans.length];
  await pl.open(c);
  const i=await choose(pl.q,'Your turn.');
  await pl.a[i](c);
 }else await say(t||'you',pick(['…','Right. Settle down.']));
 const ev=CHAOS.filter(e=>e.room===room&&e.need.every(n=>A[n]&&!A[n].dead)&&!D.chat['ev'+CHAOS.indexOf(e)]);
 if(ev.length){const e=pick(ev);D.chat['ev'+CHAOS.indexOf(e)]=1;await e.run(c)}
 await whisper(c);
 if(t)await lessonKill(t);
 await adamBurst();
 await classOut(c);
};
