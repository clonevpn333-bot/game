'use strict';
/* =====================================================================
   HIGHSCHOOL — HIGHGRAM (the phone app). G or the 📱 button.
   • FEED: posts that react to what's happened (and some that are just
     the school being the school).
   • DMS: Corey (always overthinking), and four girls you can slide into.
     Each one is a BAD relationship, five steps, DM → in person → DM →
     in person → the end. One relationship at a time. Full version only
     for the girls; Corey is in both.
       Brielle  @brielle.4ever     soulmates after one message
       Destiny  @destiny.xo        dating three of you at once
       Mackenzie @kenz.wins        it's a competition and she's winning
       Willow   @willow.underneath the deep end; she’s been waiting since 1987 (jk)
   • COREY: texts through the day (curls, humidity, did-I-say-that-weird),
     buzzes you mid-class (check it under the desk and the teacher might
     take your phone till home time), and runs up to you in the hall to
     spiral about something tiny.
   ===================================================================== */
{
const GR=()=>{D.f.gr=D.f.gr||{rel:{},th:{},unread:{},seen:{}};return D.f.gr};
const fullEd=()=>window.EDITION!=='safe';
const day=()=>typeof cal==='function'?cal():0;
const perName=()=>(PERIODS[D.period]||{}).name||'';
const taken=()=>{const t=D.f.phoneTaken;return t&&t.day===day()&&D.period<7};
const alive=k=>K[k]&&!(D.dead||{})[k];

/* ---------------- the girls (new students) ---------------- */
Object.assign(K,{
 brielle:{n:'Brielle',col:'#e86aa8',skin:'#f4d0b8',hair:'#6a3a1a',hs:'ponytail',top:'#f4a8c8',pants:'#e8e8f0',girl:1,seed:71,v:560,vw:'triangle'},
 destiny:{n:'Destiny',col:'#b05ae0',skin:'#8a5a3a',hair:'#1a1210',hs:'braids',top:'#6a3a8a',pants:'#2a2a3a',girl:1,seed:72,v:500,vw:'triangle'},
 mackenzie:{n:'Mackenzie',col:'#3a9ad8',skin:'#f0c8a8',hair:'#e0b050',hs:'ponytail',top:'#2a6ab0',pants:'#1a1a2a',girl:1,seed:73,v:540,vw:'square'},
 willow:{n:'Willow',col:'#6a6a7a',skin:'#ece4e4',hair:'#141018',hs:'straight',top:'#241c2c',pants:'#141018',girl:1,seed:74,v:420,vw:'sine'},
 gavin:{n:'Gavin',col:'#8a8a5a',skin:'#e8c0a0',hair:'#c86a2a',hs:'messy',top:'#5a7a4a',pants:'#3a3a48',seed:75,v:300}
});
/* a matching couple hoodie with your face on it, and a matchbox */
{const _dh=drawHeld;drawHeld=function(it,x,y,d){
 if(it==='hoodie'){R(x-5,y-6,10,9,'#f4a8c8');R(x-7,y-5,2,6,'#f4a8c8');R(x+5,y-5,2,6,'#f4a8c8');R(x-2,y-4,4,4,'#f0c8a8');R(x-1,y-3,1,1,'#1a1a1a');R(x+1,y-3,1,1,'#1a1a1a');R(x-2,y+1,4,1,'#c02060');return}
 if(it==='matchbox'){R(x-3,y-2,6,4,'#c83a2a');R(x-3,y-2,6,1,'#f0d040');R(x-1,y-1,2,2,'#4a3a2a');return}
 if(it==='card'){R(x-3,y-3,6,5,'#f8e0e8');R(x-1,y-2,2,2,'#e0306a');R(x,y-1,1,1,'#e0306a');return}
 return _dh(it,x,y,d)}}

/* who is where, for the in-person steps: [room, periods, x] */
const GIRLS={
 brielle:{h:'@brielle.4ever',bio:'taken 🔒 (pending)',tag:'Soulmates, Speedrun'},
 destiny:{h:'@destiny.xo',bio:'loyal 💯 dm for collabs',tag:'One of Three'},
 mackenzie:{h:'@kenz.wins',bio:'state champ (self-declared) 🏆',tag:'Season Record'},
 willow:{h:'@willow.underneath',bio:'.',tag:'The Deep End'}
};
const STEPS={
 brielle:{open:['“hey”','“your hair looks like a shampoo commercial”','“u up” (it’s 10:40 in the morning)'],meet:['canteen',[4],150],m4:['corridor',[2,4],170],m5:['bus',[7],180]},
 destiny:{open:['“hey”','“ur in my history class right”','“i saw u at the vending machine. i also like snacks”'],meet:['library',[2,4],170],m4:['canteen',[4],160],m5:['field',[2,4],160]},
 mackenzie:{open:['“hey”','“bet you can’t beat me in a race”','“what’s your 40-yard time”'],meet:['gym',[2,4],170],m4:['field',[4],170],m5:['gym',[2,4],150]},
 willow:{open:['“hey”','“i like your… vibe?”','“are you real”'],meet:['pool',[2,4],150],m4:['pool',[4],150],m5:['bus',[7],170]}
};
const rel=g=>{const r=GR().rel;r[g]=r[g]||{s:0,d:-1};return r[g]};
const activeGirl=()=>Object.keys(GIRLS).find(g=>rel(g).s>=1&&rel(g).s<5);
/* what step is available right now: 'dm1','meet','dm3','m4','m5' or null */
function stepNow(g){if(!fullEd()||!alive(g))return null;const r=rel(g),a=activeGirl();
 if(r.s===0)return a&&a!==g?'busy':'dm1';
 if(r.s===1)return 'meet';
 if(r.s===2)return day()>r.d?'dm3':'wait';
 if(r.s===3)return 'm4';
 if(r.s===4)return day()>r.d?'m5':'wait';
 return null}

/* ---------------- threads ---------------- */
const push=(th,who,t)=>{const G=GR();(G.th[th]=G.th[th]||[]).push([who,t,perName()]);if(who!=='me'){G.unread[th]=(G.unread[th]||0)+1;badge()}};
function badge(){const b=$('bGram');if(!b)return;const n=Object.values(GR().unread).reduce((a,b)=>a+b,0)+(fullEd()?Object.keys(GIRLS).filter(g=>['dm1','dm3'].includes(stepNow(g))&&rel(g).s>0).length:0);b.textContent=n?'📱 '+n:'📱';b.classList.toggle('hot',!!n)}
function notify(th,t){if(TEST)return;toast('📱 '+(K[th]?K[th].n:th)+': '+t.slice(0,60))}

/* ---------------- COREY ---------------- */
const COREY=[
 'is it humid to you','be honest','BE HONEST','my curls are doing a thing','not a good thing',
 'someone laughed near me in the hall. like NEAR me. was it about me',
 'i said “you too” when the lunch lady said enjoy your meal. she wasn’t eating. she was serving. i said YOU TOO',
 'do you think teachers can tell when you’re thinking about them','not like that. like when ur thinking “i hope she doesn’t pick me”',
 'my zipper made a noise in the silent part of the test','the whole class heard it','i have to move schools',
 'is it weird to have a favorite stair','asking for me',
 'abby looked at me for 4 seconds in the hall. is that a good amount. what’s the normal amount',
 'i used the front camera and it was on the wrong setting and i saw myself from BELOW','i’m not ok',
 'humidity today: 71%. that’s a war crime against curls',
 'do u ever wave at someone and they were waving at the person behind u and then u have to pretend ur stretching',
 'i stretched for like 40 seconds',
 'what if my curls are the only thing people like about me','and they’re not even that good today',
 'hypothetically if someone said “love you” to the bus driver','by accident','is that something they’d remember',
 'mr adam said “nice try” to me today. what did he mean. what was i trying',
 'my hoodie strings are different lengths now. everyone can see it. i can feel them seeing it',
 'ok i’m fine now','i’m not fine','is it humid to you'
];
const COREY_BACK={
 calm:['ok ok ok ok','you’re right','…but are you SURE','ok i trust you. i don’t trust the weather but i trust you'],
 worse:['WHY WOULD YOU SAY THAT','i’m deleting my account','i’m in the bathroom now. i live here now','that’s it. i’m shaving my head. no. i can’t. the curls are all i have'],
 pic:['[photo: one curl, extremely close up, slightly out of focus]','rate it','be honest','NOT THAT HONEST']
};
const coreyOn=()=>alive('corey')&&!D.weekend;
function coreyText(){if(!coreyOn())return;const G=GR();G.ci=(G.ci||0);const t=COREY[G.ci%COREY.length];G.ci++;push('corey','corey',t);
 /* sometimes they come in a burst */
 if(Math.random()<.45){const t2=COREY[G.ci%COREY.length];G.ci++;push('corey','corey',t2)}
 G.cDay=day()+':'+D.period;notify('corey',t)}
ON_PERIOD.push(async(i,resume)=>{if(resume||!D||D.weekend||TEST)return;if(typeof atHome==='function'&&atHome())return;
 if(coreyOn()&&Math.random()<.7)setTimeout(()=>{try{coreyText()}catch(e){}},2500+Math.random()*4000);
 /* the girl you're seeing texts too */
 const a=activeGirl();if(a&&Math.random()<.5)setTimeout(()=>{try{const L=GIRL_PING[a];push(a,a,L[(day()+i)%L.length]);notify(a,L[(day()+i)%L.length])}catch(e){}},5000)});
const GIRL_PING={
 brielle:['goodmorning babe ☀️ (sent 5:02 AM)','where r u','where r u rn','i can see ur location is off. why is it off','i miss u (we have the same lunch)'],
 destiny:['hey stranger','sorry was at my grandma’s','lol','u up','my phone was dead (it wasn’t)'],
 mackenzie:['reply time: 4 min. unacceptable','texts today: me 9, you 2','i’m winning','gm (good match)'],
 willow:['i saw you walk past the pool','you looked nice','the water thinks so too','3:15']
};

/* mid-class: the buzz under the desk */
{const _w=whisper;whisper=async function(c){
 const G=GR();
 if(coreyOn()&&!taken()&&!TEST&&Math.random()<.55){
  const t=COREY[(G.ci||0)%COREY.length];G.ci=(G.ci||0)+1;push('corey','corey',t);
  SFX.beep&&SFX.beep();
  const ch=await choose(['Check your phone under the desk.','Ignore it.'],'📱 BZZT. BZZT. BZZT.');
  if(ch===0){
   await dms('COREY 🌀','under the desk',[['corey',t],['corey',pick(['be honest','BE HONEST','reply','i can feel you not replying']) ]]);
   const tch=c&&c.t||Object.keys(A).find(k=>K[k]&&K[k].adult);
   if(Math.random()<.35&&tch&&A[tch]){
    await walk(tch,A.you?A.you.x+14:160,90);face(tch,'you');pose(tch,'grab');
    await say(tch,pick(['Phone. Now. You get it back at home time.','Is that more important than my lesson? Don’t answer. Phone.','(holding out a hand, not even looking) Phone.']),'angry');
    pose(tch,null);D.f.phoneTaken={day:day()};toast('📵 Phone confiscated till home time. Corey is going to spiral.');
   }
  }else{push('corey','corey','u left me on read. IN CLASS. i can feel it')}
 }
 return _w(c)}}
/* home time: you get it back */
ON_PERIOD.push(async i=>{if(i===7&&D&&D.f.phoneTaken){D.f.phoneTaken=null;if(coreyOn()){const n=3+Math.floor(Math.random()*5);for(let k=0;k<n;k++)push('corey','corey',['?','??','hello','are u dead','if ur dead text me','be honest'][k%6]);setTimeout(()=>toast('📱 Your phone’s back. '+n+' texts from Corey.'),1500)}}});

/* in the hall: Corey runs up and spirals */
const SPIRAL=[
 ['(out of breath) Okay. Okay. Did I say “you too” to the lunch lady. When she said enjoy your meal.','She was serving. She wasn’t eating. I said YOU TOO.'],
 ['(checking his curls in his phone camera) Look at this. LOOK at this. That curl’s gone flat. In front of everyone.','It’s 71% humidity. That’s not weather, that’s an attack.'],
 ['Somebody laughed near me. Not AT me. Near me. But what if near is the new at.'],
 ['I waved at someone and they were waving at the person behind me. So I stretched. I’m still stretching. Inside. Forever.'],
 ['Mr. Adam said “nice try” to me. I wasn’t trying anything. What was I trying. WHAT DID HE SEE ME TRY.'],
 ['My hoodie strings are different lengths. Don’t look. You looked. Everyone looks.'],
 ['I said “love you” to the bus driver. By accident. He said “alright.” What does alright MEAN.'],
 ['Abby looked at me for four seconds. I counted. Is four good? What’s the normal number? Is there a chart?']
];
const SPIRAL_ROOMS=new Set(['corridor','hallb','canteen','field','library','wing_sci','wing_arts','wing_sports','upper','walkway']);
{const _er=enterRoom;enterRoom=async function(room){const r=await _er(room);
 try{const G=GR();
  if(SPIRAL_ROOMS.has(room)&&coreyOn()&&!busy&&panelMode==='roam'&&!TEST&&!(typeof atHome==='function'&&atHome())&&!(D.pass&&T<D.pass.end)&&!(PERIODS[D.period]||{}).lesson
   &&(G.spDay!==day()||(G.spN||0)<2)&&Math.random()<.22){G.spN=G.spDay===day()?(G.spN||0)+1:1;G.spDay=day();return runHook({run:coreySpiral})}
 }catch(e){console.error(e)}
 return r}}
async function coreySpiral(){
 const G=GR(),L=SPIRAL[(G.sp=(G.sp||0)+1)%SPIRAL.length];
 if(!A.corey){put('corey',-14,1,{y:152,ex:'scared'});await walk('corey',(A.you?A.you.x:150)-22,150)}else{await walk('corey',(A.you?A.you.x:150)-22,120)}
 face('corey','you');A.corey.ex='scared';
 if(/curls|curl/.test(L[0]))pose('corey','phone');
 for(const l of L)await say('corey',l,'scared');
 pose('corey',null);
 const c=await choose(['“You’re fine, bro. Genuinely.”','“…Now that you mention it.”','“Are your curls okay though?”'],'COREY IS SPIRALING');
 if(c===0){await say('corey','(breathing out) Okay. Okay. Yeah. You’re right. …Are you sure though.','sad');await say('you','I’m sure.');await say('corey','Okay. (walking off, then turning back) Be honest.','smirk')}
 else if(c===1){await say('corey','(going white) I KNEW IT. I KNEW IT. I’m going to the bathroom. I live there now.','scared');await walk('corey',-20,140);remove('corey')}
 else{pose('corey','phone');await say('corey','(staring at his own front camera, very quietly) …Why would you ask that. Why would you ask that unless they weren’t.','scared');await say('corey','I have the emergency kit. I have C.U.R.L. I’m going in.','cold');pose('corey',null);await walk('corey',340,120);remove('corey')}
 return 'stay'}
/* Corey checks his curls whenever he’s standing around */
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);
 if(!A.corey||busy||!D||D.weekend)return;const a=A.corey,s=rdt||dt||.016;a._cc=(a._cc==null?6+Math.random()*6:a._cc-s);
 if(a._cc<=0){if(a.pose==='phone'&&a._ccOn){a.pose=null;a._ccOn=0;a._cc=7+Math.random()*8}
  else if(!a.pose&&!a.moving){a.pose='phone';a._ccOn=1;a._cc=1.8;if(typeof bubbles!=='undefined')bubbles.push({id:'corey',txt:pick(['humidity 71%','curl count: low','be honest','why is it flat','ok ok ok']),t:1.6})}}}}

/* ---------------- the girls: the DM steps ---------------- */
const DM1={
 brielle:(o)=>[['brielle','omg'],['brielle','OMG'],['brielle','i literally KNEW u would text me'],['brielle','i manifested this'],['brielle','what should we name our dog'],['brielle','lunch. cafeteria. sit with me. don’t be weird about it 💕']],
 destiny:(o)=>[['destiny','who is this'],['destiny','jk i know who u are'],['destiny','ur cute in a sad way'],['destiny','library at break. come alone lol']],
 mackenzie:(o)=>[['mackenzie','opener: '+(o===1?'7':'4')+'/10'],['mackenzie','reply time: 12 seconds. weak'],['mackenzie','gym. break. we’re racing'],['mackenzie','winner decides if we’re dating']],
 willow:(o)=>[['willow','i know'],['willow','i’ve been waiting for you to text since 1987'],['willow','jk'],['willow','i’m fifteen'],['willow','the pool. deep end. break. bring nothing']]
};
const DM3={
 brielle:{intro:[['brielle','u didn’t text goodnight'],['brielle','i waited till 9:01'],['brielle','i posted a crying selfie. caption: “some people”'],['brielle','it has 400 likes'],['brielle','my mom says ur toxic']],
  opts:['“sorry my phone died”','“we’ve been dating for 22 hours”','“send me the selfie”'],
  back:[[['brielle','phones don’t just DIE'],['brielle','unless ur with someone else’s phone'],['brielle','corridor. break. we need to talk about US']],
        [['brielle','22 hours is basically a year in love time'],['brielle','google it'],['brielle','corridor. i have a surprise. ur going to love it. ur going to wear it']],
        [['brielle','[photo: Brielle crying in perfect lighting, ring light reflected in both eyes]'],['brielle','u like it?? 🥺'],['brielle','corridor. break. i made us something']]]},
 destiny:{intro:[['note','Seen 6h ago'],['destiny','sorry was at my grandma’s'],['note','@destiny.xo posted: mall w my fav 🛍️ (Jaxon’s elbow is in the photo)']],
  opts:['“whose elbow is that”','“how’s your grandma”','Like the post.'],
  back:[[['destiny','what elbow'],['destiny','that’s my grandma’s elbow'],['destiny','she works out'],['destiny','lunch tomorrow. cafeteria. i’ll explain everything (i won’t)']],
        [['destiny','she’s good!! she says hi'],['destiny','(my grandma lives in florida)'],['destiny','lunch. cafeteria. sit with me ok?']],
        [['destiny','❤️'],['destiny','lol u liked it'],['destiny','ur so chill'],['destiny','lunch. cafeteria. i have something for u']]]},
 mackenzie:{intro:[['mackenzie','[RELATIONSHIP SPREADSHEET v3]'],['mackenzie','texts sent: me 41, you 12'],['mackenzie','compliments: me 0, you 9 (good)'],['mackenzie','currently winning: me']],
  opts:['“this isn’t a competition”','“I’m going to win”','“can I see the formulas”'],
  back:[[['mackenzie','that’s what losers say'],['mackenzie','field. lunch. you’re arm-wrestling coach for my honor']],
        [['mackenzie','FINALLY some fight'],['mackenzie','field. lunch. you’re arm-wrestling coach for my honor']],
        [['mackenzie','no'],['mackenzie','they’re rigged'],['mackenzie','field. lunch. you’re arm-wrestling coach for my honor']]]},
 willow:{intro:[['willow','you snore'],['willow','your mom’s lasagna looked good'],['willow','don’t check under the bed. i left']],
  opts:['“HOW ARE YOU IN MY HOUSE”','“…that’s kind of sweet?”','Block her.'],
  back:[[['willow','i’m not in your house'],['willow','i was'],['willow','lunch. the boiler room. i want you to meet my family']],
        [['willow','nobody’s ever said that'],['willow','lunch. the boiler room. i want you to meet my family']],
        [['note','You blocked @willow.underneath.'],['willow','you can’t block me'],['willow','i’m not on the internet. i’m under it'],['willow','lunch. the boiler room. my family wants to meet you']]]}
};

/* ---------------- the girls: in person ---------------- */
const SCENE={};
SCENE.brielle={
 meet:async()=>{scene('canteen',{brielle:[166,-1,{y:150,pose:'sit',hold:'phone',ex:'happy'}],you:[110,1,{y:154}]},true);cue('love',true);
  await walk('you',146,60);pose('you','sit');
  await N('She’s already got two trays. One’s yours. She put ketchup on your fries in the shape of your initials. She got one initial wrong.');
  await say('brielle','Okay so I made a slideshow. Of us. Don’t freak out.','happy');
  await N('Slide one: OUR WEDDING (the reservoir). Slide two: OUR KIDS (Brayden Jr. and Kylie). Slide three: OUR DOG (unnamed).');
  const c=await choose(['“This is a lot.”','“Can the dog be called Pat?”','Eat your fries. Say nothing.']);
  if(c===0)await say('brielle','(smiling harder) It’s a normal amount. For soulmates.','happy');
  else if(c===1){await say('brielle','(gasping) PAT. Oh my god. Pat. We’re literally the same person.','love');if(alive('pat')){await say('pat','(from the counter) Don’t.','cold')}}
  else await say('brielle','(watching you chew) You eat like my dad. That’s a compliment. He left.','happy');
  await say('brielle','We’re official btw. I posted it. Don’t check. Okay check.','blush');
  return 'meet'},
 m4:async()=>{const cast={brielle:[150,-1,{y:150,hold:'hoodie',ex:'happy'}],you:[110,1,{y:154}]};if(alive('kayden'))cast.kayden=[250,-1,{y:146,pose:'film'}];if(alive('jaxon'))cast.jaxon=[274,-1,{y:148,pose:'film'}];
  scene('corridor',cast,true);cue('arcade',true);
  await say('brielle','SURPRISE. Matching hoodies. Mine says HIS QUEEN. Yours says HER KING. With my face on it.','happy');
  await N('Your hoodie has her face on it. Her hoodie also has her face on it.');
  await say('brielle','Put it on. People need to know. Put it on put it on put it on.','happy');
  const c=await choose(['Put it on.','“I’m not wearing your face.”','“…Wait. Do you even know my name?”']);
  if(c===0){hold('brielle',null);hold('you','hoodie');await N('You put it on. Kayden zooms in. Somewhere, a group chat changes your name to KING (DERISIVE).');pose('you','cross');rel('brielle').hood=1}
  else if(c===1){pose('brielle','sob');await say('brielle','(on her knees, sobbing) You’re EMBARRASSED of me. In the CORRIDOR. Where PEOPLE ARE.','cry');await N('The whole corridor turns to look at you. You did this. Technically.')}
  else{await say('brielle','(long pause) …Babe.','shock');await say('brielle','Your name is babe. That’s your name to me. Why are you making this about NAMES.','angry')}
  return 'm4'},
 m5:async()=>{const cast={brielle:[200,-1,{y:150,ex:'happy'}],you:[120,1,{y:154}]};if(alive('kayden'))cast.kayden=[222,-1,{y:150,hold:'hoodie',ex:'smirk'}];
  scene('bus',cast,true);cue('sad');
  await N('Home time. Brielle is holding hands with Kayden. Kayden is wearing your hoodie. Someone has sharpied his face over yours.');
  await say('brielle','Oh hey! So I broke up with you. It was a fourteen-slide story. You’d know if you watched my stories.','happy');
  if(A.kayden)await say('kayden','(holding up their hands) We’re soulmates. She knew in, like, a second.','smirk');
  const c=await choose(['“Cool.”','“It’s been four days.”','“Good luck, Kayden.”']);
  if(c===1)await say('brielle','Four days is basically a marriage in love time. Google it.','happy');
  if(c===2&&A.kayden){await say('kayden','(grinning) Thanks, bro.','happy');await say('brielle','(already) We named the dog.','happy');if(A.kayden)await say('kayden','(smile slowly going) …We have a dog?','shock')}
  return ['cool','marriage','kayden'][c]}
};
SCENE.destiny={
 meet:async()=>{scene('library',{destiny:[176,-1,{y:150,ex:'smirk'}],you:[120,1,{y:154}]},true);cue('love',true);
  await walk('you',152,60);
  await say('destiny','Hey. So we’re a thing now. But lowkey. My parents are strict.','smirk');
  await say('destiny','Can you hold my backpack? Just for, like, today.','happy');
  hold('you','paper');await N('It weighs about as much as a sixth grader. Three Valentine cards poke out of the top. All three say “to my one and only”.');
  const c=await choose(['“Who are the other two cards for?”','“Sure.”','“Why are there three?”']);
  if(c===1)await say('destiny','You’re so chill. I love that about you. Specifically you.','happy');
  else await say('destiny','(not looking up) Backups. In case one gets wet.','smirk');
  hold('you',null);return 'meet'},
 m4:async()=>{const cast={destiny:[160,-1,{y:150,pose:'sit',hold:'tray',ex:'smirk'}],you:[60,1,{y:154,hold:'card'}]};if(alive('jaxon'))cast.jaxon=[290,-1,{y:152,hold:'card'}];cast.gavin=[220,-1,{y:154,hold:'card'}];
  scene('canteen',cast,true);cue('tension',true);
  await N('Lunch. You walk up to Destiny’s table holding your card. So does Jaxon. So does a kid called Gavin you’ve never seen before.');
  await Promise.all([walk('you',130,60),A.jaxon?walk('jaxon',190,60):0,walk('gavin',206,40)]);face('gavin',-1);
  await say('destiny','(calmly eating) Okay so. This is awkward for YOU guys.','smirk');
  if(A.jaxon)await say('jaxon','(looking at his card, then yours) …She wrote the same poem in all of them.','shock');
  await say('gavin','I gave her my dad’s good pen for this.','sad');
  const c=await choose([{t:'Fight Jaxon and Gavin for her.',tag:'👊'},'“Boys. We should start a union.”','“I’m out. Keep the card.”']);
  if(c===0){const ok=await mash('FIGHT',{need:24,time:4,info:'Two of them. One of you.'});
   if(!ok){await N('There were three of you. Gavin bites. Jaxon has done this before.');await die('triangle')}
   await N('You win. Somehow. Destiny is filming. She posts it: “boys fighting over me 🙄❤️”.');rel('destiny').won=1}
  else if(c===1){if(A.jaxon)await say('jaxon','(slowly) …A union.','shock');await say('gavin','I’ve always wanted to be in a union.','happy');rel('destiny').union=1;await N('The three of you sit down at the next table. Destiny keeps eating. She seems fine about it.')}
  else{hold('you',null);await say('destiny','(not looking up) K.','cold')}
  return 'm4'},
 m5:async()=>{const R_=rel('destiny');const cast={you:[130,1,{y:154}]};if(R_.union){cast.gavin=[170,-1,{y:150,ex:'happy'}];if(alive('jaxon'))cast.jaxon=[196,-1,{y:150,ex:'happy'}]}else cast.destiny=[180,-1,{y:150,hold:'phone',ex:'smirk'}];
  scene('field',cast,true);cue(R_.union?'arcade':'sad',true);
  if(R_.union){await N('The group chat is called DESTINY SURVIVORS 💔. It has three members and four hundred messages.');
   await say('gavin','We’re getting matching bracelets. Not because of her. Because of us.','happy');
   if(A.jaxon)await say('jaxon','(quietly) I’ve never had friends who weren’t scared of me.','sad');
   await N('Destiny is dating a boy from the high school across town now. The union sends him a welcome pack.');
   if(typeof crew==='function'){const c=crew();c.allies=c.allies||{};c.allies.gavin=1;if(alive('jaxon'))c.allies.jaxon=1}
   return 'union'}
  await say('destiny','Hey. So. I’m seeing other people.','smirk');await say('you','You were always seeing other people.');
  await say('destiny','Yeah but now it’s official.','happy');
  return R_.won?'won':'out'}
};
SCENE.mackenzie={
 meet:async()=>{scene('gym',{mackenzie:[200,-1,{y:150,pose:'hips',ex:'smirk'}],you:[120,1,{y:154}]},true);cue('fight',true);
  await say('mackenzie','Baseline to baseline. Winner decides if we’re dating.','smirk');
  const won=await vgRace('mackenzie');
  if(won){await say('mackenzie','(breathing hard, furious) …Fine. You decide. You decide yes. Obviously.','angry')}
  else await say('mackenzie','(not even breathing hard) I decide yes. I’m up one-nil.','smirk');
  await N('She writes it on her hand in pen. 1-0. You’re not sure which side you are.');
  return won?'won':'lost'},
 m4:async()=>{const cast={mackenzie:[100,1,{y:150,pose:'cheer'}],you:[150,1,{y:154}]};if(alive('coach'))cast.coach=[176,-1,{y:150,pose:'hips',ex:'evil'}];
  scene('field',cast,true);cue('fight',true);
  if(!A.coach){await N('Coach is dead this week. She makes you arm-wrestle the goalpost. You lose.');return 'm4'}
  await say('mackenzie','COACH. My boyfriend says he can take you. For my honor.','yell');
  await say('coach','(cracking every knuckle he has, joyfully) Oh, I’ve been waiting nineteen years for a kid to say that.','evil');
  await N('A table appears. Nobody saw where it came from.');
  const ok=await mash('ARM WRESTLE',{need:30,time:4,info:'He’s fifty-six. He’s made of ham.'});
  if(ok){await N('You win. Coach stares at his own arm like it betrayed him. Then he gives you his whistle. You don’t want the whistle.');rel('mackenzie').beatCoach=1;await say('mackenzie','(dead serious) That’s 2-1 to you. I hate this. I love this.','blush')}
  else{SFX.thud&&SFX.thud();await N('Your arm makes a noise like a celery stick. Coach blows his whistle in your face as a victory lap.');A.you.hurt=1;await say('mackenzie','(writing on her hand) 2-0. Honestly a great season so far.','happy')}
  return 'm4'},
 m5:async()=>{scene('gym',{mackenzie:[170,-1,{y:150,ex:'cold'}],you:[130,1,{y:154}]},true);cue('sad');
  await say('mackenzie','So. Final score: one hundred and twelve to thirty-eight.','cold');
  await say('mackenzie','I’m breaking up with you. On points.','cold');
  pose('mackenzie','grab');await N('She shakes your hand. Firm. Two pumps. Like after a match.');pose('mackenzie',null);
  if(rel('mackenzie').beatCoach){await say('mackenzie','(at the door, not turning round) You beat Coach, though. Rematch next season.','smirk');return 'rematch'}
  await say('mackenzie','Good game. Genuinely. You were the worst boyfriend I’ve ever had and I’ve had four this month.','happy');
  return 'gg'}
};
SCENE.willow={
 meet:async()=>{scene('pool',{willow:[160,-1,{y:150,hold:'matchbox',ex:'n'}],you:[110,1,{y:154}]},true);cue('sad',true);
  await say('willow','I got you something.','n');
  await N('She opens the matchbox. Inside: a small dead bird, on a bed of cotton wool, very neat.');
  await say('willow','His name is Gerald. He fell off the gym roof. I think he wanted to.','n');
  const c=await choose(['Take Gerald.','Scream.','“…Why Gerald?”']);
  if(c===0){hold('willow',null);hold('you','matchbox');await say('willow','(something like a smile) You’re keeping him. Nobody keeps him.','happy')}
  else if(c===1){await say('willow','(nodding slowly) There it is.','n');await say('willow','Everyone screams. You screamed nicer than most.','happy')}
  else await say('willow','He looked like a Gerald. Everything looks like something, if you wait.','n');
  return 'meet'},
 m4:async()=>{scene('pool',{willow:[150,-1,{y:150,ex:'happy'}],you:[110,1,{y:154}]},true);cue('dread',true);
  await say('willow','Come down. I want you to meet my family.','happy');
  pose('willow','reach');await N('There’s a hatch at the bottom of the pool ladder. It was always there. You never looked.');pose('willow',null);
  await walk('willow',200,60);remove('willow');await walk('you',200,60);fxState.dark=1;await wait(TEST?0:400);
  scene('boiler',{willow:[150,-1,{y:150,ex:'happy'}],you:[100,1,{y:154}]},true);await tw(fxState,{dark:0},600);
  await say('willow','This is my family.','happy');
  await N('She means the wall. The four names scratched in at kid height. OLLIE. RAJ. DANNY. LOUISE.');
  await say('willow','(to the wall) This is the one I told you about. He snores.','happy');
  await say('willow','Stay. Till three fifteen. Then you never have to go home. None of us do.','n');
  const c=await choose(['Stay.','Run.','“…Can we just get pizza instead?”']);
  if(c===0){await N('You sit down next to her with your back to the warm brick. She holds your hand. It’s very cold. The boiler ticks like it’s counting.');await die('forever')}
  if(c===1){const ok=await vgRace('willow');if(!ok){await N('The door is further away than it was. It keeps being further away.');await die('forever')}await N('You make it up the ladder. Behind you, she’s laughing. Not mean. Like you told a good joke.');rel('willow').ran=1}
  else{await say('willow','(blinking) Pizza.','shock');await N('She laughs. Out loud. Somewhere behind the wall, something laughs with her.');rel('willow').pizza=1}
  return 'm4'},
 m5:async()=>{scene('bus',{willow:[150,1,{y:150,ex:'sad'}],you:[180,-1,{y:154}]},true);cue('sad');
  await say('willow','I don’t go past the gate.','sad');
  await say('you','What, like, your parents won’t let you?');
  await say('willow','Like I can’t. I tried in 1990. I tried in 2004. I just end up back at the deep end.','n');
  await say('willow',rel('willow').pizza?'The pizza was good though. That’s the first thing I’ve tasted since… a while.':'You’re allowed to leave. That’s why it won’t work.','happy');
  await say('willow','So. We’re breaking up. You can keep Gerald.','n');
  await N('The 43 pulls in between you. When it pulls out again, the bus stop is empty. There’s a dead bird in a matchbox on the bench.');
  return rel('willow').pizza?'pizza':'gate'}
};
DEATHS.triangle={name:'Love Triangle',desc:'There were three of you. Now there are two.',hint:'Destiny. You don’t have to fight. Unionize.'};
DEATHS.forever={name:'Forever',desc:'She wanted you to stay. You stayed.',hint:'Willow. Ask for something normal.'};

/* missions: one per girl, so the quest log can follow along */
const NAMES={brielle:'Soulmates, Speedrun',destiny:'One of Three',mackenzie:'Season Record',willow:'The Deep End'};
for(const g of Object.keys(GIRLS)){
 const S=STEPS[g];
 mission('gram_'+g,{name:NAMES[g],icon:'📱',who:[g],goal:'Slide into '+K[g].n+'’s DMs on Highgram (G). See how bad it gets.',
  blurb:K[g].n+' '+GIRLS[g].h+'. '+GIRLS[g].bio,parts:['Slide in','Meet up','The red flag','It gets worse','The end'],
  tips:['Open Highgram (G) and DM '+K[g].n+'.',shortName(S.meet[0])+', '+S.meet[1].map(p=>PERIODS[p].name).join(' or ')+'. She’s waiting.','The next day: check your DMs.',shortName(S.m4[0])+', '+S.m4[1].map(p=>PERIODS[p].name).join(' or ')+'.','The next day: '+shortName(S.m5[0])+', '+S.m5[1].map(p=>PERIODS[p].name).join(' or ')+'.'],
  variants:{}});
 for(const [step,key] of [['meet',S.meet],['m4',S.m4],['m5',S.m5]]){
  spot({mis:'gram_'+g,room:key[0],period:key[1],x:key[2],y:150,label:{meet:'Meet '+K[g].n,m4:K[g].n+' is waiting for you',m5:K[g].n+' wants to talk'}[step],short:'📱',
   cond:()=>D&&!D.weekend&&stepNow(g)===step,
   run:async()=>{const v=await SCENE[g][step]();const r=rel(g);
    if(step==='meet'){r.s=2;r.d=day();part('gram_'+g,2);push(g,g,{brielle:'best lunch of my LIFE 💕',destiny:'that was fun 😘 (don’t tell anyone)',mackenzie:'1-0',willow:'gerald says hi'}[g])}
    if(step==='m4'){r.s=4;r.d=day();part('gram_'+g,4)}
    if(step==='m5'){r.s=5;hold('you',null);await complete('gram_'+g,v);if(typeof repAdd==='function')repAdd('legend',1)}
    return 'stay'}});
 }
}
/* she stands where the step is, so you can see her */
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);
 try{if(D&&!D.weekend&&fullEd())for(const g of Object.keys(GIRLS)){const st=stepNow(g);const key=st&&STEPS[g][st==='meet'?'meet':st];
  if(key&&Array.isArray(key)&&key[0]===room&&key[1].includes(D.period)&&!A[g])put(g,key[2]+14,-1,{y:146,ex:'happy'})}}catch(e){}
 return r}}

/* ---------------- the app ---------------- */
const css=document.createElement('style');css.textContent=`
#gram{position:fixed;inset:0;z-index:22;background:#0b0912d9;display:flex;justify-content:center;align-items:center}
#gram[hidden]{display:none}
#gram .gp{width:min(380px,94vw);height:min(640px,88vh);background:#141018;border:4px solid #6b5a86;box-shadow:6px 6px #000;display:flex;flex-direction:column;font-size:14px}
#gram .gh{display:flex;align-items:center;gap:8px;padding:10px 12px;background:linear-gradient(90deg,#5a2a6a,#a83a6a,#e0a040);color:#fff;font-size:18px;letter-spacing:.04em}
#gram .gh b{flex:1;font-weight:normal}
#gram .gh button,#gram .gt button{background:#0006;color:#fff;border:0;padding:4px 10px;font:inherit;font-size:13px;cursor:pointer}
#gram .gt{display:flex;gap:4px;padding:6px;background:#1e1828}
#gram .gt button.on{background:#e0a040;color:#1a1010}
#gram .gb{flex:1;overflow:auto;padding:8px;display:flex;flex-direction:column;gap:8px}
#gram .post{background:#1e1828;border:2px solid #3a3050;padding:8px}
#gram .post .who{color:#f6cf8e;font-size:12px}
#gram .post .pic{margin:6px 0;padding:18px 8px;text-align:center;color:#d8c8e8;font-size:12px;background:repeating-linear-gradient(45deg,#2a2238,#2a2238 6px,#30283f 6px,#30283f 12px)}
#gram .post .lk{color:#8a7a92;font-size:11px}
#gram .row{display:flex;align-items:center;gap:10px;padding:8px;background:#1e1828;border:2px solid #3a3050;cursor:pointer;text-align:left;color:inherit;font:inherit}
#gram .row:hover{border-color:#e0a040}
#gram .av{width:30px;height:30px;border-radius:50%;flex:none;border:2px solid #e0a040}
#gram .row .t{flex:1;min-width:0}#gram .row .t i{display:block;font-style:normal;color:#8a7a92;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#gram .dot{background:#e0306a;color:#fff;font-size:11px;padding:1px 6px}
#gram .bub{max-width:82%;padding:6px 9px;border:2px solid #4e4266;background:#2a2238;align-self:flex-start;white-space:pre-wrap;overflow-wrap:anywhere}
#gram .bub.me{align-self:flex-end;background:#6b4a7a;border-color:#a98ac0}
#gram .bub.nt{align-self:center;background:none;border:0;color:#8a7a92;font-size:11px}
#gram .typing{color:#8a7a92;font-size:12px;align-self:flex-start}
#gram .opts{display:flex;flex-direction:column;gap:6px;padding:8px;background:#1e1828}
#gram .opts button{background:#2b2240;color:#ffe1a8;border:2px solid #6b5a86;padding:7px;font:inherit;text-align:left;cursor:pointer}
#gram .opts button:hover{border-color:#e0a040}
#bGram.hot{background:#e0306a;color:#fff}`;document.head.appendChild(css);
const ov=document.createElement('div');ov.id='gram';ov.hidden=true;document.body.appendChild(ov);
{const bq=$('bQuest');if(bq){const b=document.createElement('button');b.className='tb';b.id='bGram';b.title='Highgram (G)';b.textContent='📱';bq.parentNode.insertBefore(b,bq);b.onclick=()=>{audio&&audio();openGram()}}}
{const _ao=anyOverlay;anyOverlay=function(){return _ao()||!ov.hidden}}
{const _co=closeOverlays;closeOverlays=function(){_co();ov.hidden=true}}
addEventListener('keydown',e=>{if((e.key==='g'||e.key==='G')&&!e.repeat){if(!ov.hidden){ov.hidden=true;e.preventDefault();return}
 if(D&&!busy&&panelMode==='roam'&&!anyOverlay()&&!CH){e.preventDefault();openGram()}}
 else if(e.key==='Escape'&&!ov.hidden){ov.hidden=true}},true);
let VIEW='dms',THREAD=null;const TYPING={};
function openGram(v){if(!D)return;VIEW=v||VIEW;THREAD=null;ov.hidden=false;render()}
window.openGram=openGram;
const h=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
function render(){
 ov.innerHTML='';const p=h('div','gp');ov.appendChild(p);
 const hd=h('div','gh');hd.appendChild(h('b',null,THREAD?(K[THREAD]?K[THREAD].n:THREAD):'Highgram'));
 if(THREAD){const bk=h('button',null,'BACK');bk.onclick=()=>{THREAD=null;render()};hd.appendChild(bk)}
 const x=h('button',null,'✕');x.onclick=()=>{ov.hidden=true};hd.appendChild(x);p.appendChild(hd);
 if(taken()){const b=h('div','gb');b.appendChild(h('div','bub nt','📵 Confiscated. You get it back at home time.\nCorey doesn’t know. Corey is spiraling.'));p.appendChild(b);return}
 if(!THREAD){const t=h('div','gt');for(const [k,l] of [['feed','FEED'],['dms','DMS']]){const b=h('button',VIEW===k?'on':'',l);b.onclick=()=>{VIEW=k;render()};t.appendChild(b)}p.appendChild(t)}
 const body=h('div','gb');p.appendChild(body);
 if(THREAD)return renderThread(p,body);
 if(VIEW==='feed')return renderFeed(body);
 renderList(body)}
function renderList(body){
 const rows=[];
 if(K.corey)rows.push(['corey','@c.u.r.l.y','curls first. questions later']);
 if(fullEd())for(const g of Object.keys(GIRLS))if(alive(g))rows.push([g,GIRLS[g].h,GIRLS[g].bio]);
 const G=GR();
 for(const [id,hd,bio] of rows){const r=h('button','row');const av=h('div','av');av.style.background=K[id].col||K[id].top;r.appendChild(av);
  const t=h('div','t');t.appendChild(h('span',null,K[id].n+' '));t.appendChild(h('small',null,hd));const th=G.th[id]||[];
  const st=GIRLS[id]?stepNow(id):null;
  t.appendChild(h('i',null,th.length?th[th.length-1][1]:(st==='dm1'?'Slide in.':bio)));r.appendChild(t);
  const n=(G.unread[id]||0)+(st==='dm3'?1:0);if(n)r.appendChild(h('span','dot',n));
  if(GIRLS[id]&&rel(id).s===5)r.appendChild(h('span','dot','💔'));
  r.onclick=()=>{THREAD=id;G.unread[id]=0;badge();render()};body.appendChild(r)}
 if(!fullEd())body.appendChild(h('div','bub nt','(safe version: just Corey)'))}
function renderThread(p,body){
 const G=GR(),id=THREAD,th=G.th[id]||[];
 if(GIRLS[id]&&!th.length)body.appendChild(h('div','bub nt',GIRLS[id].h+' · '+GIRLS[id].bio));
 for(const [who,t,when] of th){const b=h('div','bub'+(who==='me'?' me':who==='note'?' nt':''),t);body.appendChild(b)}
 if(TYPING[id])body.appendChild(h('div','typing',(K[id]?K[id].n:'')+' is typing…'));
 setTimeout(()=>{body.scrollTop=body.scrollHeight},0);
 if(TYPING[id])return;
 const opts=h('div','opts');let any=false;
 const addOpt=(txt,fn)=>{any=true;const b=h('button',null,txt);b.onclick=fn;opts.appendChild(b)};
 if(id==='corey'&&th.length&&th[th.length-1][0]==='corey'){
  addOpt('“you’re fine. genuinely.”',()=>reply('corey','you’re fine. genuinely.',COREY_BACK.calm));
  addOpt('“…now that you mention it”',()=>reply('corey','…now that you mention it',COREY_BACK.worse));
  addOpt('“send a pic of the curls”',()=>reply('corey','send a pic of the curls',COREY_BACK.pic))}
 if(GIRLS[id]){const st=stepNow(id),r=rel(id);
  if(st==='busy')opts.appendChild(h('div','bub nt','You’re already in a whole thing with '+K[activeGirl()].n+'. One disaster at a time.'));
  if(st==='dm1')STEPS[id].open.forEach((o,i)=>addOpt(o,()=>{r.s=1;r.d=day();part('gram_'+id,1);reply(id,o.replace(/^“|”.*$/g,''),DM1[id](i).map(m=>m[1]),DM1[id](i))}));
  if(st==='dm3'){const D3=DM3[id];if(!G.seen[id+'3']){G.seen[id+'3']=1;for(const m of D3.intro)push(id,m[0],m[1]);G.unread[id]=0;render();return}
   D3.opts.forEach((o,i)=>addOpt(o,()=>{r.s=3;r.d=day();part('gram_'+id,3);reply(id,/^[A-Z]/.test(o)&&!/^“/.test(o)?null:o.replace(/^“|”$/g,''),null,D3.back[i])}))}
  if(st==='wait')opts.appendChild(h('div','bub nt','Nothing new. Give it a day.'));
 }
 if(any)p.appendChild(opts)}
/* you send, they type, they answer (Brielle answers instantly) */
function reply(id,mine,lines,pairs){
 if(mine)push(id,'me',mine);
 const seq=pairs||lines.map(t=>[id,t]);
 TYPING[id]=1;render();
 let i=0;const fast=id==='brielle'?120:id==='willow'?1400:700;
 const step=()=>{if(i>=seq.length){TYPING[id]=0;GR().unread[id]=0;badge();if(!ov.hidden)render();return}
  const [w,t]=seq[i++];push(id,w,t);GR().unread[id]=0;if(!ov.hidden)render();setTimeout(step,TEST?0:fast+Math.random()*300)};
 setTimeout(step,TEST?0:fast)}

/* ---------------- the feed ---------------- */
function renderFeed(body){
 const F=[],G=GR(),d=day();
 const post=(who,hd,pic,txt,lk)=>F.push({who,hd,pic,txt,lk});
 for(const g of Object.keys(GIRLS)){const r=rel(g);if(!fullEd())break;
  if(g==='brielle'&&r.s>=2)post('brielle','@brielle.4ever','[16 photos of your back, taken from behind, at lunch]','my king 👑 day 1 of forever',412);
  if(g==='brielle'&&r.s>=5)post('brielle','@brielle.4ever','[Brielle and Kayden. Kayden is wearing your hoodie]','HEALED 🦋 my REAL soulmate',988);
  if(g==='destiny'&&r.s>=2)post('destiny','@destiny.xo','[a mirror selfie; three different boys’ hoodies on the bed behind her]','loyal 💯',201);
  if(g==='mackenzie'&&r.s>=2)post('mackenzie','@kenz.wins','[her hand. it says 1-0 in pen]','undefeated',77);
  if(g==='willow'&&r.s>=2)post('willow','@willow.underneath','[the empty pool, at night. the timestamp says 3:15]','.',4);
  if(g==='willow'&&r.s>=5)post('willow','@willow.underneath','[a matchbox on a bus stop bench]','tell ollie i said hi',0)}
 if(K.corey)post('corey','@c.u.r.l.y','[a selfie, from below, by accident]',pick(['deleting in 5 min','do NOT screenshot','humidity: 71%. pray for me']),3+d);
 if(P.dumped&&Object.keys(P.dumped).length)post('kaylee','@kaylee.tea','[you, on one knee, in the cafeteria]','LMAOOO somebody got DUMPED at LUNCH 💀💀💀',2104);
 if(D.f.phoneTaken)post('arjun','@arjun.is.him','[your phone, in a teacher’s drawer]','RIP to my boy’s phone 🕊️ corey is texting it as we speak',61);
 const daily=[['nivaan','@nivaan.live','[the raccoon in the ceiling tile, eyes glowing]','he’s been here longer than mr adam',340],
  ['hasan','@hasan.official','[a lunch tray with one grey noodle on it]','pat really said “here’s ur pasta” and handed me a SINGLE noodle',122],
  ['kayden','@kayden.mp4','[Coach asleep in his car with the engine running]','bro’s been in there since 2nd period',733],
  ['arjun','@arjun.is.him','[a bathroom mirror, Arjun pointing at himself]','him.',19],
  ['kaylee','@kaylee.tea','[a blurry photo of Ms. Sherman holding something]','what is she holding. WHAT IS SHE HOLDING',1512],
  ['david','@david.clipboard','[a clipboard]','meeting at break. bring evidence. bring snacks',2],
  ['nivaan','@nivaan.live','[the sub, laughing, holding a coffee]','the sub is so fucking hot it should be illegal for him to teach fractions',890]];
 for(let i=0;i<4;i++){const p=daily[(d*3+i)%daily.length];if(K[p[0]])post(...p)}
 for(const f of F){const e=h('div','post');e.appendChild(h('div','who',(K[f.who]?K[f.who].n:f.who)+' '+f.hd));e.appendChild(h('div','pic',f.pic));e.appendChild(h('div',null,f.txt));e.appendChild(h('div','lk','♥ '+f.lk+' likes'));body.appendChild(e)}}

/* keep the badge fresh */
{const _ul=updateLoc;updateLoc=function(){_ul();try{badge()}catch(e){}}}
ON_PERIOD.push(async()=>{try{badge()}catch(e){}});
}
