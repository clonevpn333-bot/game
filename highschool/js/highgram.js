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
const fullEd=()=>window.EDITION!=='safe'&&(typeof cal!=='function'||cal()>=3);
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
window.gramPush=(th,who,t)=>{push(th,who,t);if(who!=='me')notify(th,t)};
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
   &&(G.spDay!==day()||(G.spN||0)<(G.curl?1:2))&&Math.random()<(G.curl?.1:.22)){G.spN=G.spDay===day()?(G.spN||0)+1:1;G.spDay=day();return runHook({run:coreySpiral})}
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
#gram{position:fixed;inset:0;z-index:300;background:#0b0912d9;display:flex;justify-content:center;align-items:center;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif}
#gram[hidden]{display:none}
#gram .gp{position:relative;width:min(370px,94vw);height:min(720px,90vh);background:#000;border:10px solid #1c1c1e;border-radius:46px;box-shadow:0 0 0 2px #3a3a3c,0 20px 60px #000c;display:flex;flex-direction:column;overflow:hidden;font-size:15px;color:#fff}
#gram .sb{display:flex;justify-content:space-between;align-items:center;padding:12px 26px 4px;font-size:14px;font-weight:600;letter-spacing:.01em}
#gram .sb .isl{width:96px;height:26px;background:#000;border-radius:14px;box-shadow:0 0 0 1px #1c1c1e}
#gram .sb .bt{display:flex;gap:5px;align-items:center;font-size:12px}
#gram .sb .bat{width:24px;height:11px;border:1.5px solid #fffc;border-radius:3px;position:relative}
#gram .sb .bat i{position:absolute;left:1px;top:1px;bottom:1px;background:#fff;border-radius:1px}
#gram .gh{display:flex;align-items:center;gap:8px;padding:8px 16px 10px;border-bottom:.5px solid #2c2c2e;background:#000}
#gram .gh b{flex:1;font-size:22px;font-weight:700;letter-spacing:-.01em}
#gram .gh.th b{font-size:17px;font-weight:600;text-align:center}
#gram .gh button{background:none;color:#0a84ff;border:0;padding:4px 2px;font:inherit;font-size:16px;cursor:pointer}
#gram .gb{flex:1;overflow:auto;padding:10px 12px;display:flex;flex-direction:column;gap:6px;background:#000}
#gram .post{background:#1c1c1e;border-radius:14px;padding:10px 12px}
#gram .post .who{color:#fff;font-size:13px;font-weight:600}
#gram .post .who small{color:#8e8e93;font-weight:400}
#gram .post .pic{margin:8px -12px;padding:34px 14px;text-align:center;color:#d1d1d6;font-size:13px;font-style:italic;background:linear-gradient(135deg,#2c2c2e,#3a3a3c)}
#gram .post .lk{color:#8e8e93;font-size:12px;margin-top:4px}
#gram .row{display:flex;align-items:center;gap:12px;padding:10px 4px;background:none;border:0;border-bottom:.5px solid #2c2c2e;cursor:pointer;text-align:left;color:inherit;font:inherit;width:100%}
#gram .av{width:46px;height:46px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:18px;color:#fff}
#gram .row .t{flex:1;min-width:0}
#gram .row .t span{font-weight:600}
#gram .row .t small{color:#8e8e93;font-size:12px}
#gram .row .t i{display:block;font-style:normal;color:#8e8e93;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#gram .dot{background:#0a84ff;color:#fff;font-size:12px;font-weight:600;min-width:20px;height:20px;border-radius:10px;display:flex;align-items:center;justify-content:center;padding:0 6px}
#gram .bub{max-width:76%;padding:8px 13px;border-radius:19px;background:#3a3a3c;align-self:flex-start;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.3}
#gram .bub.me{align-self:flex-end;background:#0a84ff}
#gram .bub.nt{align-self:center;background:none;color:#8e8e93;font-size:12px;padding:4px}
#gram .typing{align-self:flex-start;background:#3a3a3c;border-radius:19px;padding:8px 14px;color:#8e8e93;font-size:13px}
#gram .opts{display:flex;flex-direction:column;gap:6px;padding:10px 12px;background:#0a0a0a;border-top:.5px solid #2c2c2e}
#gram .opts button{background:#1c1c1e;color:#0a84ff;border:0;border-radius:18px;padding:9px 14px;font:inherit;text-align:left;cursor:pointer}
#gram .opts button:hover{background:#2c2c2e}
#gram .tabs{display:flex;justify-content:space-around;padding:8px 0 4px;background:#0a0a0acc;border-top:.5px solid #2c2c2e}
#gram .tabs button{background:none;border:0;color:#8e8e93;font:inherit;font-size:11px;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer}
#gram .tabs button big{font-size:22px;line-height:1}
#gram .tabs button.on{color:#0a84ff}
#gram .home{height:22px;display:flex;justify-content:center;align-items:center;background:#000}
#gram .home i{width:130px;height:5px;border-radius:3px;background:#fff}
#gram .hs.cursed{background:radial-gradient(circle at 30% 20%,#8a1a1a,#300808 55%,#100000)}
#gram .hs{flex:1;display:flex;flex-direction:column;justify-content:space-between;background:radial-gradient(circle at 30% 20%,#5b3a8a,#1a1030 55%,#0a0614);padding:18px 14px 6px}
#gram .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px 6px}
#gram .app{background:none;border:0;color:#fff;font:inherit;font-size:11px;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer}
#gram .ico{position:relative;width:56px;height:56px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;box-shadow:0 2px 6px #0008}
#gram .badge{position:absolute;top:-5px;right:-5px;background:#ff3b30;color:#fff;font-size:12px;min-width:20px;height:20px;border-radius:10px;display:flex;align-items:center;justify-content:center;padding:0 5px;font-weight:600}
#gram .dock{display:flex;justify-content:space-around;padding:10px 6px;margin:10px 0 0;border-radius:26px;background:#ffffff26;backdrop-filter:blur(8px)}
#gram .dock .app span{display:none}
#gram .home{cursor:pointer}
#gram .photo{display:block;width:calc(100% + 24px);margin:8px -12px;image-rendering:pixelated;background:#222}
#gram .cm{font-size:13px;margin-top:2px}#gram .cm b{font-weight:600}
#gram .sbox{padding:4px 0 8px}#gram .sinp{width:100%;box-sizing:border-box;border:0;border-radius:10px;background:#1c1c1e;color:#fff;padding:9px 12px;font:inherit}
#gram .sugg{display:flex;flex-direction:column;gap:2px}#gram .sugg button{background:none;border:0;color:#fff;text-align:left;padding:8px 4px;font:inherit;border-bottom:.5px solid #2c2c2e;cursor:pointer}
#gram .res{padding:8px 2px;border-bottom:.5px solid #2c2c2e}#gram .res small{color:#30d158;font-size:11px}#gram .res b{display:block;color:#64a8ff;font-weight:500;font-size:16px;margin:2px 0}#gram .res p{margin:0;color:#c7c7cc;font-size:13px}
#gram .gcv{display:block;margin:6px auto;width:100%;max-width:280px;image-rendering:pixelated;border-radius:12px;touch-action:none}
#gram .gsc{text-align:center;color:#c7c7cc;font-size:13px}
#gram .again{display:block;margin:8px auto;background:#0a84ff;color:#fff;border:0;border-radius:18px;padding:8px 18px;font:inherit;cursor:pointer}
#gram .shutter{display:block;margin:10px auto;width:64px;height:64px;border-radius:50%;background:#fff;border:5px solid #3a3a3c;box-shadow:0 0 0 3px #fff;cursor:pointer}
#gram .note{padding:10px 4px;border-bottom:.5px solid #2c2c2e;color:#fff}
#gram .wx{text-align:center;padding:30px 10px;color:#fff}#gram .wx .big{font-size:64px;font-weight:200}#gram .wx .small{color:#8e8e93;font-size:13px;margin-top:6px}#gram .wd{display:flex;flex-direction:column;gap:6px;margin-top:18px;text-align:left}
#bGram.hot{background:#e0306a;color:#fff}`;document.head.appendChild(css);
const ov=document.createElement('div');ov.id='gram';ov.hidden=true;document.body.appendChild(ov);
{const bq=$('bQuest');if(bq){const b=document.createElement('button');b.className='tb';b.id='bGram';b.title='Highgram (G)';b.textContent='📱';bq.parentNode.insertBefore(b,bq);b.onclick=()=>{audio&&audio();openGram()}}}
{const _ao=anyOverlay;anyOverlay=function(){return _ao()||!ov.hidden}}
{const _co=closeOverlays;closeOverlays=function(){_co();ov.hidden=true}}
addEventListener('keydown',e=>{if(e.target&&e.target.tagName==='INPUT')return;if((e.key==='g'||e.key==='G')&&!e.repeat){if(!ov.hidden){ov.hidden=true;e.preventDefault();return}
 if(D&&!busy&&panelMode==='roam'&&!anyOverlay()&&!CH){e.preventDefault();openGram()}}
 else if(e.key==='Escape'&&!ov.hidden){ov.hidden=true}},true);
let VIEW='home',THREAD=null;const TYPING={};
function openGram(v){if(!D)return;VIEW=v||'home';THREAD=null;ov.hidden=false;render()}
window.openGram=openGram;
const h=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
const APPS=[['feed','📸','Highgram','linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)'],['dms','💬','Messages','linear-gradient(#5ff777,#1fbf3a)'],
 ['search','🔍','Searchy','linear-gradient(#fff,#dfe3ea)'],['arcade','🕹️','Arcade','linear-gradient(#ff7a59,#c2185b)'],['camera','📷','Camera','linear-gradient(#8e8e93,#3a3a3c)'],
 ['shop','🛍️','Shop','linear-gradient(#ffd60a,#ff9f0a)'],['notes','📝','Notes','linear-gradient(#ffe37a,#f7c600)'],['weather','🌧️','Weather','linear-gradient(#5ac8fa,#1e6fd9)'],['clock','⏰','Clock','linear-gradient(#2c2c2e,#000)']];
const TITLE={shop:'Shop',feed:'Highgram',dms:'Messages',search:'Searchy',arcade:'Arcade',camera:'Camera',notes:'Notes',weather:'Weather',clock:'Clock'};
function render(){
 if(GAME&&GAME.stop)GAME.stop();
 ov.innerHTML='';const p=h('div','gp');ov.appendChild(p);
 const sb=h('div','sb');sb.appendChild(h('span',null,(PERIODS[D.period]||{}).time||'9:41'));sb.appendChild(h('div','isl'));
 const bt=h('div','bt');bt.appendChild(h('span',null,'5G'));const bat=h('div','bat');const lvl=h('i');lvl.style.width=Math.max(10,90-D.period*9)+'%';bat.appendChild(lvl);bt.appendChild(bat);sb.appendChild(bt);p.appendChild(sb);
 if(taken()){const body=h('div','gb');p.appendChild(body);body.appendChild(h('div','bub nt','📵 Confiscated. You get it back at home time.\nCorey doesn’t know. Corey is spiraling.'));homeBar(p);return}
 if(VIEW==='home'&&!THREAD){renderHome(p);homeBar(p);return}
 const hd=h('div','gh'+(THREAD?' th':''));
 const bk=h('button',null,'‹ '+(THREAD?'Back':'Home'));bk.onclick=()=>{if(THREAD)THREAD=null;else VIEW='home';render()};hd.appendChild(bk);
 hd.appendChild(h('b',null,THREAD?(K[THREAD]?K[THREAD].n:THREAD):TITLE[VIEW]||''));
 const x=h('button',null,'Done');x.onclick=()=>{ov.hidden=true};hd.appendChild(x);p.appendChild(hd);
 const body=h('div','gb');p.appendChild(body);
 if(THREAD)renderThread(p,body);
 else ({shop:renderShop,feed:renderFeed,dms:renderList,search:renderSearch,arcade:renderArcade,camera:renderCamera,notes:renderNotes,weather:renderWeather,clock:renderClock}[VIEW]||renderList)(body,p);
 homeBar(p)}
function homeBar(p){const hm=h('div','home');const i=h('i');hm.appendChild(i);hm.title='Home';hm.onclick=()=>{THREAD=null;VIEW='home';render()};p.appendChild(hm)}
function renderHome(p){
 const wall=h('div','hs'+(GR().skin==='cursed'?' cursed':''));p.appendChild(wall);
 const grid=h('div','grid');wall.appendChild(grid);
 const G=GR();const unread=Object.values(G.unread).reduce((a,b)=>a+b,0);
 const unl=id=>['dms','feed'].includes(id)||day()>=2;
 for(const [id,ic,name,bg] of APPS.filter(a=>unl(a[0]))){const b=h('button','app');const icon=h('div','ico',ic);icon.style.background=bg;b.appendChild(icon);
  if(id==='dms'&&unread){const n=h('span','badge',unread);icon.appendChild(n)}
  b.appendChild(h('span',null,name));b.onclick=()=>{VIEW=id;render()};grid.appendChild(b)}
 const dock=h('div','dock');for(const id of['dms','feed','search','camera']){const A_=APPS.find(a=>a[0]===id);const b=h('button','app');const icon=h('div','ico',A_[1]);icon.style.background=A_[3];b.appendChild(icon);b.onclick=()=>{VIEW=id;render()};dock.appendChild(b)}
 wall.appendChild(dock)}
function renderList(body){
 const rows=[];
 if(K.corey)rows.push(['corey','@c.u.r.l.y','curls first. questions later']);
 if(fullEd())for(const g of Object.keys(GIRLS))if(alive(g))rows.push([g,GIRLS[g].h,GIRLS[g].bio]);
 const G=GR();
 for(const [id,hd,bio] of rows){const r=h('button','row');const av=h('div','av',K[id].n[0]);av.style.background=K[id].col||K[id].top;r.appendChild(av);
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

/* ---------------- photos: the game draws them ---------------- */
const SNAP={};
function snap(room,cast,key){
 key=key||room+JSON.stringify(cast);if(SNAP[key])return SNAP[key];
 const c=document.createElement('canvas');c.width=W;c.height=H;const cx=c.getContext('2d');cx.imageSmoothingEnabled=false;
 const sg=g;g=cx;
 try{cx.fillStyle='#222';cx.fillRect(0,0,W,H);if(ROOMS[room]&&ROOMS[room].bg)ROOMS[room].bg();
  for(const [id,x,y,dir,pose,ex,hold] of (cast||[])){const k=id==='you'?(A.you&&A.you.k||K.you):K[id];if(!k)continue;drawKid(k,x,y,{dir:dir||1,pose:pose||null,ex:ex||null,hold:hold||null,still:1})}
 }catch(e){}finally{g=sg}
 /* crop to the people, phone-photo shaped */
 const o=document.createElement('canvas');o.width=160;o.height=120;const oc=o.getContext('2d');oc.imageSmoothingEnabled=false;
 const xs=(cast||[]).map(c=>c[1]),ys=(cast||[]).map(c=>c[2]);const spread=xs.length?Math.max(...xs)-Math.min(...xs):0;
 const cw=xs.length?Math.min(W,Math.max(120,spread+80)):240,ch=cw*.75,mid=xs.length?(Math.min(...xs)+Math.max(...xs))/2:160,by_=ys.length?Math.max(...ys)+8:150;
 const sx=Math.max(0,Math.min(W-cw,mid-cw/2)),sy=Math.max(0,Math.min(H-ch,by_-ch));
 oc.drawImage(c,sx,sy,cw,ch,0,0,160,120);
 return SNAP[key]=o.toDataURL()}
const CAM=[];/* photos you took this session */
/* ---------------- the feed ---------------- */
function renderFeed(body){
 const F=[],G=GR(),d=day();
 const post=(who,hd,pic,txt,lk,shot)=>F.push({who,hd,pic,txt,lk,shot});
 for(const g of Object.keys(GIRLS)){const r=rel(g);if(!fullEd())break;
  if(g==='brielle'&&r.s>=2)post('brielle','@brielle.4ever','[16 photos of your back, taken from behind, at lunch]','my king 👑 day 1 of forever',412,['canteen',[['brielle',120,160,1,'phone','happy'],['you',170,160,1]]]);
  if(g==='brielle'&&r.s>=5)post('brielle','@brielle.4ever','[Brielle and Kayden. Kayden is wearing your hoodie]','HEALED 🦋 my REAL soulmate',988,['bus',[['brielle',140,165,1,'hug','love'],['kayden',162,165,-1,null,'smirk','hoodie']]]);
  if(g==='destiny'&&r.s>=2)post('destiny','@destiny.xo','[a mirror selfie]','loyal 💯',201,['toilets',[['destiny',160,165,1,'phone','smirk']]]);
  if(g==='mackenzie'&&r.s>=2)post('mackenzie','@kenz.wins','[her hand. it says 1-0 in pen]','undefeated',77,['gym',[['mackenzie',160,165,1,'cheer','smirk']]]);
  if(g==='willow'&&r.s>=2)post('willow','@willow.underneath','[the empty pool. 3:15]','.',4,['pool',[]]);
  if(g==='willow'&&r.s>=5)post('willow','@willow.underneath','[a matchbox on a bus stop bench]','tell ollie i said hi',0,['bus',[]])}
 if(K.corey)post('corey','@c.u.r.l.y','[a selfie, from below, by accident]',['deleting in 5 min','do NOT screenshot','humidity: 71%. pray for me'][d%3],3+d,['corridor',[['corey',160,168,1,'phone','scared']]]);
 if(P.dumped&&Object.keys(P.dumped).length)post('kaylee','@kaylee.tea','[you, on one knee, in the cafeteria]','LMAOOO somebody got DUMPED at LUNCH 💀💀💀',2104,['canteen',[['you',150,165,1,'beg','cry'],['stella',190,160,-1,'cross','cold']]]);
 if(D.f.phoneTaken)post('arjun','@arjun.is.him','[your phone, in a teacher’s drawer]','RIP to my boy’s phone 🕊️ corey is texting it as we speak',61,['corridor',[['arjun',160,165,1,'cry','cry']]]);
 const daily=[['nivaan','@nivaan.live','[the raccoon in the ceiling tile, eyes glowing]','he’s been here longer than mr adam',340,['corridor',[['nivaan',150,165,1,'point','shock']]]],
  ['hasan','@hasan.official','[a lunch tray with one grey noodle on it]','pat really said “here’s ur pasta” and handed me a SINGLE noodle',122,['canteen',[['pat',120,150,1,'cross','evil'],['hasan',170,165,-1,'shrug','shock','tray']]]],
  ['kayden','@kayden.mp4','[Coach asleep in his car]','bro’s been in there since 2nd period',733,['field',[['coach',160,165,1,'sit','closed']]]],
  ['arjun','@arjun.is.him','[a bathroom mirror, Arjun pointing at himself]','him.',19,['toilets',[['arjun',160,165,1,'point','smirk']]]],
  ['kaylee','@kaylee.tea','[a blurry photo of Ms. Sherman holding something]','what is she holding. WHAT IS SHE HOLDING',1512,['corridor',[['shermian',160,160,-1,'hold','evil','knife']]]],
  ['david','@david.clipboard','[a clipboard]','meeting at break. bring evidence. bring snacks',2,['library',[['david',160,165,1,'hold','cold','clipboard']]]],
  ['nivaan','@nivaan.live','[the sub, laughing, holding a coffee]','the sub is so fucking hot it should be illegal for him to teach fractions',890,['corridor',[['sub',160,160,1,null,'laugh','mug']]]]];
 const dn=m=>D.done&&D.done[m],cr=typeof crew==='function'?crew():{};
 if(dn('instella'))post('stella','@stell.a','[Sean and Stella on the field]','official 🥎❤️ (he cried)',801,['field',[['sean',150,165,1,'hug','love'],['stella',166,165,-1,'hug','love']]]);
 if(dn('window')||dn('mended'))post('abby','@abby.draws','[a bird drawn on a window, and a heart]','.',233,['trailer',[['corey',150,165,1,'sit','blush'],['abby',176,165,-1,'sit','smirk']]]);
 if(dn('kim'))post('dheva','@dheva.mp4','[Alex in clown makeup, giving a thumbs up]','he’s ok. he honks now but he’s ok',1990,['bus',[['alex',150,165,1,'up','happy'],['dheva',176,165,-1,'cross','smirk']]]);
 if(cr.cheeksIn)post('cheeks','@fistsoffaircity','[Coach on the ground, Cheek-Clapper standing over him]','FISTS OF FAIR CITY 5 COMING SOON 🍑👊 (we have 313 subscribers)',313,['bus',[['clapper',150,165,1,'hips','smirk'],['coach',180,168,-1,'hurt','shock']]]);
 if(cr.closing)post('nivaan','@nivaan.live','[the food court with the shutters down and police lights]','free noodles for life. FOR LIFE.',4021,['foodcourt',[['nivaan',160,165,1,'film','shock']]]);
 if(P.stats&&P.stats.deaths>0)post('kaylee','@kaylee.tea','[a chalk outline in the hallway]','rip to whoever that was. anyway there’s a sale at the mall',88+P.stats.deaths,['corridor',[['kaylee',170,165,-1,'film','smirk']]]);
 if(D.done&&D.done.headcase)post('arjun','@arjun.is.him','[the office, blown open, Mr. Adam crying on the floor]','not even the craziest thing that happened today',540,['office',[['adam',160,168,1,'sob','cry']]]);
 if(D.done&&D.done.pauljones)post('paul','@pauljones','[the 43 at sunset]','.',12,['bus',[['paul',160,165,1,null,'sad']]]);
 if(P.endings&&Object.keys(P.endings).length)post('david','@david.clipboard','[the Main Hall, chairs everywhere]','inspection day. we did that. (meeting at break)',777,['hall',[['david',150,165,1,'hold','happy','clipboard'],['nivaan',176,165,-1,'film','laugh']]]);
 if(D.f&&D.f['ate'+cal()])post('pat','@lunchladypat','[a tray of mystery nuggets]','eat your fucking vegetables',3,['canteen',[['pat',160,155,1,'cross','cold']]]);
 for(let i=0;i<3;i++){const p=daily[(d*3+i)%daily.length];if(K[p[0]])post(...p)}
 for(const c of CAM.filter(c=>c.posted))F.unshift({who:'you',hd:'@you',pic:'',txt:c.cap,lk:c.lk,img:c.url,com:c.com});
 for(const f of F){const e=h('div','post');{const w=h('div','who',(f.who==='you'?'You':K[f.who]?K[f.who].n:f.who)+' ');w.appendChild(h('small',null,f.hd));e.appendChild(w)}{let src=f.img;if(!src&&f.shot&&ROOMS[f.shot[0]])src=snap(f.shot[0],f.shot[1].filter(c=>c[0]==='you'||K[c[0]]));if(src){const im=document.createElement('img');im.className='photo';im.src=src;im.alt=f.pic;e.appendChild(im)}else e.appendChild(h('div','pic',f.pic))}e.appendChild(h('div',null,f.txt));e.appendChild(h('div','lk','♡ '+f.lk+' likes'));if(f.com)for(const c of f.com){const cm=h('div','cm');cm.appendChild(h('b',null,c[0]+' '));cm.appendChild(h('span',null,c[1]));e.appendChild(cm)}body.appendChild(e)}}

/* ---------------- SEARCHY ---------------- */
const EGGS=[
 [/1987|nineteen eighty/i,[['Highgate High boiler fire, 1987','fairctyarchive.org','“No one hurt,” says head. The caption names nobody. The photo shows four empty chairs.'],['People also ask: why does the bell ring so long on Fridays','highgateparents.forum','Locked thread.']]],
 [/ollie|finch|raj patel|danny mason|louise okafor/i,[['No results.','—','Some names don’t want to be found. Some names want you to say them out loud. Together.']],'ollie'],
 [/sherman/i,[['Ms. Sherman — Teacher of the Year 1987, 1988, 1989… 2026','highgate.edu','She has not aged. HR says that’s “a skincare thing”.'],['Is Ms. Sherman two people','reddit.com/r/highgate','[removed by moderator] [moderator removed]']]],
 [/coach|dunmore/i,[['Coach Dunmore — State Champion 1987','fairctysports.net','Javelin. Allegedly. Nobody has seen him throw one at a target.'],['coach dunmore bin bags 3:20','—','Did you mean: “none of your business”?']]],
 [/raccoon/i,[['How to get a raccoon out of your school','wikihow.com','Step 1: You don’t. He was here first. He has seniority.']],'raccoon'],
 [/humid|curl/i,[['Is it humid? (Corey asks)','weather.com','Yes. It is always humid to Corey.'],['C.U.R.L. — Curl Upkeep Rescue Lotion','curlshop.com','“Sold out in your area.” Corey bought all of it.']]],
 [/locker ?217|217/i,[['Locker 217','—','The combination isn’t on the internet. It’s on a wall. In a stall. Look down.']],'locker'],
 [/aidan/i,[['Aidan — Highgate High','highgate.edu/students','Enrolled since: [date not found]. Grade: [not found]. Photo: [it’s him. it’s been him in every photo.]']]],
 [/pat'?s? stew|stew recipe/i,[['Pat’s Stew (Official Recipe)','pat.cooks','Ingredients: ? ? ? ? Method: Don’t.'],['what is in pat’s stew','—','Pat is reading this search history.']]],
 [/kindergarten|kinder/i,[['Kindergarten','—','That was a different school. We don’t talk about that school.']]],
 [/fists of fair city|cheek.?clapper|cheeks/i,[['FISTS OF FAIR CITY 4 (2025)','imdb-ish.com','★ 1.2 (312 reviews, all from the same two IP addresses).']]],
 [/how to (get|make) (a )?girlfriend|how to rizz|rizz/i,[['How to talk to girls','wikihow.com','Step 1: Don’t DM four of them at once. Step 2: See step 1.']]],
 [/am i (a )?loser|loser/i,[['Are you a loser? Take the quiz','buzzquiz.com','Your result: “Searching it is the answer.”']]],
 [/inspection|inspector/i,[['State School Inspections: what inspectors look for','education.gov','Clean corridors. Accurate records. Teachers who are alive in the normal way.']]],
 [/ghost|haunted/i,[['Signs your school is haunted','buzzquiz.com','1. The bell rings longer on Fridays. 2. A teacher hasn’t aged since 1987. 3. You’re reading this at school.']]],
 [/how to (escape|leave) school|skip class/i,[['How to skip class','wikihow.com','The woods behind the bus loop. Don’t look at the trees too long.']]],
 [/mr\.? ?kim|clown/i,[['Mr. Kim — math teacher, magician','highgate.edu','“Volunteers needed.” Do not volunteer.']]],
 [/voss|fridge/i,[['Mr. Voss — Chemistry','highgate.edu','Office hours: never. The back fridge is not for students. The back fridge is not for anyone.']]],
 [/weather|rain/i,[['Fair City weather','weather.com','71% humidity. Corey has been notified.']]],
 [/sub|substitute/i,[['the sub','—','14,000 results. All of them are Nivaan’s posts. Calm down, Nivaan.']]],
 [/free money|money|cash/i,[['FREE MONEY CLICK HERE','totallylegit.biz','You clicked it. Somebody in Ohio now owns your lunch account.']],'scam'],
 [/porn|sex|nude/i,[['Search blocked','Highgate School Wi-Fi','This search has been sent to Mr. Adam. He has printed it. He has laminated it.']],'blocked']
];
function renderSearch(body){
 const box=h('div','sbox');const inp=document.createElement('input');inp.placeholder='Search or type URL';inp.className='sinp';box.appendChild(inp);body.appendChild(box);
 const out=h('div','sres');body.appendChild(out);
 const sugg=h('div','sugg');for(const q of['is it humid','1987','how to get rid of a raccoon','locker 217','am i a loser','pat’s stew recipe'])sugg.appendChild(Object.assign(h('button',null,'🔍 '+q),{onclick:()=>{inp.value=q;go()}}));out.appendChild(sugg);
 const go=()=>{const q=inp.value.trim();if(!q)return;out.innerHTML='';const G=GR();G.srch=G.srch||{};
  const hit=EGGS.find(e=>e[0].test(q));
  const res=hit?hit[1]:[[q+' — No results','—','Did you mean: “'+q.split('').reverse().join('')+'”? (We didn’t either.)'],['People also searched: “how to delete search history”','—','So did you, in a second.']];
  for(const [t,u,sn] of res){const r=h('div','res');r.appendChild(h('small',null,u));r.appendChild(h('b',null,t));r.appendChild(h('p',null,sn));out.appendChild(r)}
  if(hit&&hit[2]&&!G.srch[hit[2]]){G.srch[hit[2]]=1;
   if(hit[2]==='scam'){D.money=Math.max(0,(D.money||0)-3);toast('💸 −$3. You clicked the free money.')}
   else if(hit[2]==='blocked'){toast('📵 Mr. Adam has laminated your search.')}
   else{D.apples=(D.apples||0)+1;updateLoc&&updateLoc();toast('🔍 Easter egg found. +1 🍎')}}};
 inp.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter')go()};setTimeout(()=>inp.focus(),0)}

/* ---------------- ARCADE: two little games ---------------- */
let GAME=null;
function renderArcade(body){
 P.hi=P.hi||{};
 const list=[['curl','🌀','CURL KEEPER','Keep Corey’s curl up. Tap / SPACE to bounce. Dodge the humidity drops.'],['nug','🍗','NUGGET RUSH','Catch Pat’s nuggets on your tray. LEFT/RIGHT or tap a side. Not the stew.']];
 for(const [id,ic,name,info] of list){const r=h('button','row');const av=h('div','av',ic);av.style.background='#2c2c2e';r.appendChild(av);const t=h('div','t');t.appendChild(h('span',null,name));t.appendChild(h('i',null,info));r.appendChild(t);r.appendChild(h('span','dot','★ '+(P.hi[id]||0)));r.onclick=()=>playGame(body,id,name);body.appendChild(r)}
 body.appendChild(h('div','bub nt','Beat 15 in either one for +1 🍎 (once a day).'))}
function playGame(body,id,name){
 body.innerHTML='';const cv=document.createElement('canvas');cv.width=180;cv.height=260;cv.className='gcv';body.appendChild(cv);const sc=h('div','gsc','');body.appendChild(sc);
 const cx=cv.getContext('2d');let alive_=true,score=0,t0=performance.now(),last=t0,raf=0;
 const S={y:130,vy:0,x:90,drops:[],items:[],lives:3,keyL:0,keyR:0,spawn:0};
 const end=()=>{alive_=false;cancelAnimationFrame(raf);P.hi[id]=Math.max(P.hi[id]||0,score|0);save&&save();
  const G=GR();if(score>=15&&G.arcDay!==day()){G.arcDay=day();D.apples=(D.apples||0)+1;updateLoc&&updateLoc();toast('🕹️ New record energy. +1 🍎')}
  sc.textContent='GAME OVER · '+(score|0)+' · best '+P.hi[id];const again=h('button','again','Play again');again.onclick=()=>playGame(body,id,name);body.appendChild(again)};
 const tap=(e)=>{if(id==='curl'){S.vy=-150}else{const r=cv.getBoundingClientRect();const x=(e&&e.clientX!=null)?e.clientX-r.left:90;S.x+=(x<r.width/2?-24:24)}};
 cv.onpointerdown=e=>{e.preventDefault();tap(e)};
 const kd=e=>{if(!alive_)return;if(e.key===' '||e.key==='ArrowUp'||e.key==='w'){e.preventDefault();e.stopPropagation();if(id==='curl')tap()}
  if(e.key==='ArrowLeft'||e.key==='a'){S.keyL=1;e.stopPropagation()}if(e.key==='ArrowRight'||e.key==='d'){S.keyR=1;e.stopPropagation()}};
 const ku=e=>{if(e.key==='ArrowLeft'||e.key==='a')S.keyL=0;if(e.key==='ArrowRight'||e.key==='d')S.keyR=0};
 addEventListener('keydown',kd,true);addEventListener('keyup',ku,true);
 GAME={stop(){alive_=false;cancelAnimationFrame(raf);removeEventListener('keydown',kd,true);removeEventListener('keyup',ku,true);GAME=null}};
 const loop=(now)=>{if(!alive_||ov.hidden){if(GAME)GAME.stop();return}const dt=Math.min(.05,(now-last)/1000);last=now;
  cx.fillStyle='#101018';cx.fillRect(0,0,180,260);
  if(id==='curl'){
   S.vy+=320*dt;S.y+=S.vy*dt;score+=dt;
   S.spawn-=dt;if(S.spawn<=0){S.spawn=Math.max(.35,1.1-score*.03);S.drops.push({x:10+Math.random()*160,y:-6,v:60+Math.random()*50+score*3})}
   for(const d of S.drops){d.y+=d.v*dt;cx.fillStyle='#5ac8fa';cx.fillRect(d.x,d.y,3,6);if(Math.abs(d.x-90)<9&&Math.abs(d.y-S.y)<9)return end()}
   S.drops=S.drops.filter(d=>d.y<270);
   cx.fillStyle='#3a2a1a';for(let i=0;i<5;i++)cx.fillRect(84+Math.sin(now/120+i)*3,S.y-8+i*3,12,3);
   cx.fillStyle='#e8c8a8';cx.fillRect(86,S.y+8,8,10);
   if(S.y>250||S.y<0)return end();
   cx.fillStyle='#fff';cx.font='12px sans-serif';cx.fillText('humidity '+(60+Math.min(39,score|0))+'%',6,14)}
  else{
   if(S.keyL)S.x-=150*dt;if(S.keyR)S.x+=150*dt;S.x=Math.max(14,Math.min(166,S.x));
   S.spawn-=dt;if(S.spawn<=0){S.spawn=Math.max(.3,.9-score*.02);S.items.push({x:10+Math.random()*160,y:-6,v:70+Math.random()*40+score*2,bad:Math.random()<.25})}
   for(const it of S.items){it.y+=it.v*dt;cx.fillStyle=it.bad?'#8a8a7a':'#e8b04a';cx.fillRect(it.x-4,it.y-3,8,6);
    if(it.y>232&&it.y<246&&Math.abs(it.x-S.x)<16){it.done=1;if(it.bad){S.lives--;if(S.lives<=0)return end()}else score++}
    if(it.y>262&&!it.bad&&!it.done){it.done=1;S.lives--;if(S.lives<=0)return end()}}
   S.items=S.items.filter(i=>!i.done&&i.y<270);
   cx.fillStyle='#9aa0aa';cx.fillRect(S.x-16,240,32,4);cx.fillStyle='#fff';cx.font='12px sans-serif';cx.fillText('♥'.repeat(Math.max(0,S.lives)),6,14)}
  sc.textContent=name+' · '+(score|0);raf=requestAnimationFrame(loop)};
 raf=requestAnimationFrame(loop)}

/* ---------------- CAMERA ---------------- */
const CAPS=['no context','he doesn’t know','school is a war crime','caught in 4k','pov: highgate','this is my villain era','day '+(1)+' of being here against my will'];
const COMS=[['arjun','ratio'],['nivaan','reposting this'],['hasan','WHO TOOK THIS'],['kaylee','the lighting 😭'],['corey','is it humid in there'],['kayden','bro is not him'],['david','evidence. saving this.']];
function renderCamera(body){
 const snapB=h('button','shutter','');snapB.title='Take a photo of what’s around you';body.appendChild(h('div','bub nt','Take a picture of wherever you are. Post it. Feel something.'));
 snapB.onclick=()=>{try{const cv=$('c');const url=cv.toDataURL('image/jpeg',.8);
  const who=Object.keys(A).filter(k=>k!=='you'&&K[k]&&A[k].vis!==false);const teacher=who.find(k=>K[k].adult);
  CAM.unshift({url,who,teacher,cap:teacher?('caught '+K[teacher].n.toLowerCase()+' in 4k'):pick(CAPS),posted:0});SFX.click&&SFX.click();render()}catch(e){toast('📷 The camera app crashed. Like a real phone.')}};
 body.appendChild(snapB);
 for(const c of CAM){const card=h('div','post');const im=document.createElement('img');im.className='photo';im.src=c.url;card.appendChild(im);card.appendChild(h('div',null,c.cap));
  if(!c.posted){const b=h('button','again','Post to Highgram');b.onclick=()=>{c.posted=1;c.lk=Math.floor(3+Math.random()*30+(c.teacher?200:0)+c.who.length*12);c.com=[COMS[Math.floor(Math.random()*COMS.length)],COMS[Math.floor(Math.random()*COMS.length)]].filter(x=>K[x[0]]).map(x=>[K[x[0]].n,x[1]]);
    if(c.teacher&&typeof repAdd==='function')repAdd('legend',1,'posted a teacher');toast('📸 Posted. '+c.lk+' likes'+(c.teacher?'. A teacher is going to see this.':'.'));VIEW='feed';render()};card.appendChild(b)}
  else card.appendChild(h('div','lk','♡ '+c.lk+' likes'));
  body.appendChild(card)}}

/* ---------------- SHOP: what your money is for ---------------- */
const SHOP=[
 {id:'energy',ic:'🥤',n:'BLAST Energy (sugar free, somehow worse)',p:3,max:2,d:'+1 🍎 right now. Max two a day. Your heart has opinions.',buy(){D.apples=(D.apples||0)+1;updateLoc&&updateLoc();toast('🥤 +1 🍎. Your left eye is twitching.')}},
 {id:'pass',ic:'🎫',n:'Forged hall pass',p:4,max:1,d:'+90 seconds on the second bell, this period only.',ok:()=>D.pass&&T<D.pass.end,why:'only works while the bell is counting down',buy(){D.pass.end+=90;D.pass.len+=90;toast('🎫 +90 s. Mr. Adam signs everything without reading it.')}},
 {id:'curl',ic:'🧴',n:'C.U.R.L. (for Corey)',p:5,max:1,run:1,d:'He’ll calm down. A bit. For a while.',ok:()=>alive('corey'),why:'Corey isn’t here this week',buy(){GR().curl=1;push('corey','corey','YOU BOUGHT ME C.U.R.L.???');push('corey','corey','i’m crying. i’m actually crying in the bathroom');push('corey','corey','humidity cannot touch me now');toast('🧴 Corey is going to spiral a lot less.')}},
 {id:'snack',ic:'🍪',n:'Vending machine cookie (delivered by a seventh grader)',p:2,max:3,d:'Hold it. Eat it. Chew loudly.',buy(){if(A.you)A.you.hold='cookie';toast('🍪 A seventh grader slides you a cookie and runs.')}},
 {id:'skin',ic:'🎨',n:'Phone case: CURSED',p:6,max:1,run:1,d:'Your phone wallpaper turns blood red. Nothing else. That’s it.',buy(){GR().skin='cursed';toast('🎨 Your phone is cursed now. Purely cosmetic. Probably.')}}
];
function renderShop(body){
 const G=GR();G.shop=G.shop||{};
 body.appendChild(h('div','bub nt','You have $'+(D.money||0)+'. Money from gigs and side hustles goes here.'));
 for(const it of SHOP){const key=it.run?it.id:it.id+':'+day(),n=G.shop[key]||0,can=(D.money||0)>=it.p&&n<it.max&&(!it.ok||it.ok());
  const r=h('button','row');const av=h('div','av',it.ic);av.style.background='#2c2c2e';r.appendChild(av);
  const t=h('div','t');t.appendChild(h('span',null,it.n));t.appendChild(h('i',null,n>=it.max?'Sold out'+(it.run?'':' today'):(it.ok&&!it.ok())?'Can’t: '+it.why:it.d));r.appendChild(t);
  r.appendChild(h('span','dot','$'+it.p));if(!can)r.style.opacity=.45;
  r.onclick=()=>{if(!can)return;D.money-=it.p;G.shop[key]=n+1;it.buy();updateLoc&&updateLoc();render()};body.appendChild(r)}}
/* C.U.R.L. calms Corey: fewer hallway spirals */
/* ---------------- the little ones ---------------- */
function renderNotes(body){const N_=['☐ survive','☐ find out what’s in the back fridge','☐ do NOT text Corey back during a test','☐ stop DMing people','☑ eat lunch (sometimes)','☐ 13-3-87 ??? (from the stall)'];for(const n of N_)body.appendChild(h('div','note',n))}
function renderWeather(body){const w=h('div','wx');w.appendChild(h('div','big','71°'));w.appendChild(h('div',null,'Fair City · Humid'));w.appendChild(h('div','small','Humidity 71%. Corey has been notified.'));
 const days=h('div','wd');['Mon 🌧️','Tue 🌧️','Wed ☁️','Thu 🌧️','Fri 🔥 (inspection)'].forEach(d=>days.appendChild(h('div',null,d)));w.appendChild(days);body.appendChild(w)}
function renderClock(body){const w=h('div','wx');w.appendChild(h('div','big',(PERIODS[D.period]||{}).time||''));w.appendChild(h('div',null,(PERIODS[D.period]||{}).name||''));
 w.appendChild(h('div','small','Alarm: 3:15 PM · repeats every day · can’t be deleted'));body.appendChild(w)}


/* ---- Corey's curls pay off: Abby tells him it was never the hair (full version, once they're together) ---- */
spot({room:'walkway',period:[2,4],x:150,y:150,label:'Corey is hiding in his hood',short:'🌀',
 cond:()=>D&&!D.weekend&&fullEd()&&alive('corey')&&alive('abby')&&D.done&&(D.done.window||D.done.mended)&&!GR().curlPay&&((GR().sp||0)>=1||(GR().ci||0)>=6),
 run:async()=>{
  scene('walkway',{corey:[160,1,{y:150,pose:'cover',ex:'scared'}],you:[110,1,{y:154}]},true);cue('love',true);
  await N('Corey has his hood up and both hands on his head. It’s 71% humidity. He has given up.');
  await say('corey','(from inside the hood) Don’t look. It’s a curl emergency. Code red. Code FLAT.','scared');
  put('abby',340,-1,{y:150,ex:'n'});await walk('abby',180,70);face('abby',-1);
  pose('abby','reach');await wait(300);pose('corey',null);A.corey.ex='shock';pose('abby',null);
  await N('Abby pulls his hood down.');
  await say('abby','Corey. I don’t like you for your hair.','cold');
  await say('corey','(very small) …Then what for?','scared');
  await say('abby','(looking at him for a long time) You draw birds back. Badly. Every single time.','smirk');
  await say('corey','They’re not bad.','blush');
  await say('abby','They’re so bad.','smirk');
  const c=await choose(['Leave them to it.','“Corey. Text me less.”','Take a photo.']);
  if(c===1){await say('corey','(not taking his eyes off her) Yeah. Yeah. Sure. Totally. …Can I text you about it though.','happy')}
  else if(c===2){try{const url=$('c').toDataURL('image/jpeg',.8);CAM.unshift({url,who:['corey','abby'],cap:'they’re so annoying',posted:1,lk:612,com:[['Nivaan','reposting this'],['Corey','DELETE THIS'],['Abby','no']]})}catch(e){}SFX.click&&SFX.click();await N('Click. Abby looks right at the camera. Corey looks at Abby.')}
  else await walk('you',40,60);
  GR().curlPay=1;GR().curl=1;
  push('corey','corey','she said it’s not the hair');push('corey','corey','what does that MEAN');push('corey','corey','ok i know what it means');push('corey','corey','i’m fine. i’m so fine. it’s humid and i’m FINE');
  return 'stay'}});
/* keep the badge fresh */
{const _ul=updateLoc;updateLoc=function(){_ul();try{badge()}catch(e){}}}
ON_PERIOD.push(async()=>{try{badge()}catch(e){}});
}
