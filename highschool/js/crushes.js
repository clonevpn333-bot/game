'use strict';
/* =====================================================================
   HIGHSCHOOL — Toby likes Sean. Arjun loses his phone.
   ===================================================================== */
Object.assign(K,{
 toby:{n:'Toby',col:'#3a9a8a',skin:'#d8a880',hair:'#2a1a12',hs:'curly',top:'#e8d8a8',cardigan:1,pants:'#4a5a3a',seed:61,v:340,vw:'triangle'}
});
K.toby.id='toby';
{const _dh=drawHeld;drawHeld=function(it,x,y,d){
 if(it==='bracelet'){R(x-2,y-2,5,3,'#e05a9a');R(x-1,y-1,3,1,'#f0e040');return}
 if(it==='onion'){R(x-2,y-4,5,5,'#c8a0c0');R(x-1,y-5,3,1,'#e0c8e0');R(x,y-7,1,2,'#6a9a3a');return}
 if(it==='ketchup'){R(x-1,y-6,3,8,'#c02020');R(x,y-8,1,2,'#f0f0f0');return}
 return _dh(it,x,y,d)}}
{const _dp=drawProp;drawProp=function(p){const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='mower'){R(x-14,y-12,28,10,'#3a8a3a');R(x-14,y-12,28,2,'#5aaa5a');R(x-10,y-2,6,6,'#1a1a1a');R(x+4,y-2,6,6,'#1a1a1a');R(x-16,y-22,2,12,'#444');R(x-18,y-22,6,2,'#444');px('MOW',x-5,y-10,'#f0e040');if(p.on)for(let i=0;i<3;i++)R(x+14+Math.random()*8,y-6+Math.random()*4,2,1,p.red?'#a01020':'#5aaa3a');return}
 if(p.t==='ketchup'){R(x-8,y,16,3,'#a01818');R(x-5,y-1,10,1,'#c02020');return}
 return _dp(p)}}

/* =================================================================
   TOBY LIKES SEAN
   ================================================================= */
mission('toby',{name:'Toby Likes Sean',icon:'🧶',who:['sean','toby','stella'],
 blurb:'There’s a new kid called Toby. He transferred from Ohio on Monday. It’s been Friday ever since, so it’s still his first week. He likes Sean. He’s not shy about it. Sean has a girlfriend and absolutely no idea what to do.',
 parts:['Before school: the bracelet','Break, library: forty tabs','Lunch, the field: the plan'],
 tips:['Before school, bus loop. Sit near Sean.','Break, the library. Sean is hiding from Stella behind the biography section.','Lunch, the field. Whatever plan Sean picked, he’s doing it now.'],
 variants:{honest:'Honest',third:'Third wheel',mower:'The mower'}});

hook({mis:'toby',period:0,room:'bus',who:'sean',label:'Sit with Sean',look:{ex:'happy'},cond:()=>!D.f.toby1&&!D.dead.sean,run:async()=>{
 scene('bus',{sean:[172,1,{y:146}],you:[150,1,{y:152}]});
 await say('sean','(doing the hair flip) Big day. Me and Stella. Two months on Monday. If Monday ever comes.','happy');
 put('toby',-14,1,{y:150});await walk('toby',196,70);face('toby',-1);
 await N('A kid you’ve seen exactly once before gets off a different bus and walks straight over. Cardigan. Curly hair. Walks like he’s already decided something.');
 await say('toby','Hey. Sean, right? I’m Toby. New. Ohio. I made you this.','happy');
 hold('toby','bracelet');await wait(300);hold('toby',null);hold('sean','bracelet');
 await N('A friendship bracelet. Pink and yellow. The beads spell SEAN 10/10.');
 await say('sean','Oh! Cool! Thanks, man. That’s— what’s the ten out of ten for?','happy');
 await say('toby','You. I like you. Like, LIKE like. Sorry, I don’t really do secrets. I spent all of eighth grade keeping one and it gave me a stomach ulcer.','love');
 await say('toby','No pressure. Genuinely. Have a good day. Your hair is incredible.','happy');
 await walk('toby',-16,70);remove('toby');
 A.sean.ex='shock';SFX.static();
 await N('Sean doesn’t move. He doesn’t blink. You can practically hear a fan spinning up inside his head, like a laptop running too many tabs.');
 await say('sean','(very quietly) …My hair IS incredible.','shock');
 await say('sean','Wait. No. That’s not the— I have a GIRLFRIEND. Do I tell Stella? Do I give it back? Do I wear it? If I don’t wear it is that rude? If I DO wear it does that mean something?','scared');
 await say('you','It’s a bracelet, Sean.');
 await say('sean','It’s not a BRACELET. It’s a DECISION.','yell');
 hold('sean',null);D.f.toby1=1;part('toby',1);
}});

hook({mis:'toby',period:2,room:'library',who:'sean',label:'Ask Sean why he’s hiding behind a shelf',look:{pose:'phone',ex:'scared'},cond:()=>D.f.toby1&&!D.f.toby2&&!D.dead.sean,run:async()=>{
 const cast={sean:[200,-1,{y:144,pose:'phone'}],you:[176,1,{y:152}]};if(!D.dead.stella)cast.stella=[290,-1,{y:144}];
 scene('library',cast);
 await say('sean','(whispering) Don’t look at me. Stella’s over there. If she looks at me she’ll KNOW.','scared');
 await say('you','Know what?');
 await say('sean','I don’t KNOW what she’ll know. That’s the problem.','scared');
 await N('He shows you his phone. Forty-one tabs. “what does it mean if a guy says you have nice hair”. “is a bracelet legally binding”. “ohio boys what are they like”. “how to tell your girlfriend a guy likes you without dying”. “fake your own death free no download”.');
 await say('sean','I’m forty tabs deep. Forty-one. I’ve watched a video of a man explaining feelings with a whiteboard. I took a quiz that said I’m a Capricorn. I’m not a Capricorn.','scared');
 await say('sean','I made a group chat. I need advice. Everyone’s answering at once.','sad');
 await dms('SEAN HELP (urgent)','Sean, Nivaan, Kenneth, Paul, Hasan, Arjun',[
  ['sean','guys a guy likes me. new kid. toby. he gave me a bracelet. i have a gf. what do i do'],
  ['nivaan','go live and ask chat. chat knows everything. chat once diagnosed my cousin'],
  ['kenneth','fake ur death. my uncle did it twice. he lives in arizona now with a different name'],
  ['paul','make urself ugly. eat a whole raw onion. nobody can like a guy who smells like onion'],
  ['arjun','LMAOOOOO'],
  ['arjun','10/10 for what. effort?'],
  ['hasan','just be honest with him?? he sounds nice. it was brave to say that'],
  ['kenneth','or fake ur death'],
  ['paul','or onion']
 ]);
 await say('sean','Okay. So my options are: be honest, fake my death, or eat an onion. Those are the options. What do I do?','scared');
 const c=await choose(['“Be honest. Tell Toby you’re with Stella. Nicely.”','“…The onion. Do the onion.”','“Fake your death.”','“Just tell Stella. Let her deal with it.”']);
 D.f.tobyPlan=['honest','onion','dead','stella'][c];
 if(c===0){await say('sean','Honest. Okay. Honest. I’m going to need a presentation.','scared');await say('you','You don’t need a—');await say('sean','I need a PRESENTATION.','yell')}
 else if(c===1){await say('sean','Okay. Okay. Pat’s got a whole bag of onions in the back. I’ll get one at lunch. For science. For love. For the opposite of love.','scared')}
 else if(c===2){await say('sean','Kenneth’s uncle did it TWICE. How hard can it be. I just need ketchup. Lots of ketchup. And a reason to be lying on the field.','smirk')}
 else{await say('sean','Yeah. Yeah, she’s my girlfriend, she should know. She’s also terrifying. Okay. Okay.','scared')}
 if(A.stella){await walk('stella',226,60);face('stella',-1);await say('stella','Why are you two hiding behind the biographies?','smirk');pose('sean',null);
  hold('sean','bracelet');SFX.click();await N('Sean drops his phone, then picks it up, and in the process the bracelet falls out of his hoodie pocket and lands right at Stella’s feet. SEAN 10/10.');hold('sean',null);
  await say('stella','(picking it up) …Ten out of ten. Who made you this?','shock');
  await say('sean','NOBODY. Me. I made it. For me. I’m… I rate myself. I’m doing a self-esteem thing.','scared');
  await say('stella','(narrowing her eyes, putting it in her own pocket) Interesting.','angry')}
 D.f.toby2=1;part('toby',2);return 'stay';
}});

hook({mis:'toby',period:4,room:'field',who:'sean',label:'Ask Sean what the plan is',look:{ex:'scared'},cond:()=>D.f.toby2&&!D.done.toby&&!D.dead.sean,run:async()=>{
 const plan=D.f.tobyPlan||'honest';
 const cast={sean:[140,1,{y:146}],you:[110,1,{y:152}]};
 if(!D.dead.stella)cast.stella=[220,-1,{y:146}];if(!D.dead.coach)cast.coach=[300,-1,{y:140,hold:'javelin'}];if(!D.dead.omer)cast.omer=[260,1,{y:150,pose:'cross'}];if(!D.dead.nivaan)cast.nivaan=[60,1,{y:154,pose:'film'}];
 scene('field',cast);cue('field');
 put('toby',334,-1,{y:146});await walk('toby',180,60);face('toby',-1);face('sean',1);
 await say('toby','Hey! I wasn’t going to come over, but you waved.','happy');
 await say('sean','I wasn’t waving, I was— okay. Okay. It’s happening. It’s happening now.','scared');
 if(plan==='honest'){
  pose('sean','phone');
  await N('Sean takes out his phone and turns the screen round. It is a slideshow. He has made a slideshow. The first slide says WHY I AM UNAVAILABLE: A PRESENTATION in WordArt.');
  await say('sean','Slide one. I have a girlfriend. Slide two: here she is. Slide three is just her baseball, because she always has it. Slide four—','scared');
  await say('toby','Did you make me a PowerPoint?','shock');
  await say('sean','It’s fourteen slides. There’s a transition. The transition is a star wipe.','scared');
  await say('toby','(hand on his chest) Sean. This is the nicest rejection I have ever had. I’ve had nine.','love');
  pose('sean',null);
  if(A.stella){await walk('stella',200,60);await say('stella','Why is there a presentation about me? Why is my BASEBALL in it?','angry')}
 }else if(plan==='onion'){
  hold('sean','onion');await N('Sean takes a whole raw onion out of his hoodie pocket, makes eye contact with Toby, and bites into it like an apple.');
  for(let i=0;i<3;i++){SFX.crunch();await wait(300)}
  A.sean.ex='cry';
  await N('His eyes start streaming immediately. He keeps going. He eats the whole thing, skin and all, crying, staring at Toby the entire time, like a man in a war film.');
  hold('sean',null);
  await say('toby','(slowly) …You’re crying. Are you… crying about me?','love');
  await say('sean','(sobbing, onion breath) NO. It’s the ONION. I’m being UNATTRACTIVE.','cry');
  await say('toby','That’s the most romantic thing anyone has ever done for me. In Ohio nobody cries for you. You just get a casserole.','love');
  if(A.stella){await walk('stella',200,60);await say('stella','Why do you smell like the inside of a sandwich shop? Why are you crying at the new kid?','angry')}
 }else if(plan==='dead'){
  hold('sean','ketchup');await N('Sean squeezes an entire bottle of ketchup down his front, screams “OH NO, MY HEART”, and falls face-first into the grass.');
  hold('sean',null);A.sean.pose='lie';SFX.thud();prop({t:'ketchup',x:144,y:150,layer:-1});
  if(A.stella){A.stella.ex='shock';await say('stella','SEAN? SEAN!','shock')}
  if(A.coach){await walk('coach',170,90);pose('coach','kneel');await wait(400);await say('coach','(two fingers on his neck, for one second) Yeah, he’s dead. I’ll start digging.','angry');pose('coach',null);await walk('coach',240,60);pose('coach','reach')}
  if(A.nivaan)await say('nivaan','(filming) Chat. CHAT. RIP Sean. Type F. TYPE F.','scared');
  pose('toby','kneel');
  await say('toby','(holding Sean’s hand) I only knew you for four hours. But they were the best four hours of my week. Which is also four hours. Because it’s still Friday.','cry');
  await say('toby','(singing, softly, beautifully) ♪ And I will always love yooou ♪','cry');
  await N('He can really sing. It’s not fair how well he can sing. Sean lasts eight seconds.');
  pose('toby',null);A.sean.pose=null;A.sean.bloody=1;
  await say('sean','(sitting up, covered in ketchup) STOP SINGING. YOU’RE REALLY GOOD AT IT AND IT’S MAKING IT WORSE.','yell');
  if(A.stella){await walk('stella',200,60);await say('stella','You faked your DEATH? In FRONT of me? Coach was getting a SHOVEL.','angry')}
 }else{
  if(A.stella){await walk('stella',200,60);face('stella',-1)}
  await say('sean','(very fast) Stella. This is Toby. He likes me. I like you. I didn’t know what to do so I’m telling you so you can do it.','scared');
 }
 if(A.stella){
  await say('stella','(taking the bracelet out of her pocket, holding it up) So YOU made this.','angry');
  await say('toby','I did. Sorry. I didn’t know he had a girlfriend. I don’t know anything. I’ve been here one Friday.','sad');
  await N('A long silence. Omer, from a distance, puts his hands up like he’s ready to referee a fight.');
  await say('stella','…The beads are really even. How did you get the beads so even?','smirk');
  await say('toby','Oh! There’s a trick. You thread from the back. I can show you. Do you like Taylor Swift?','happy');
  await say('stella','Do I LIKE— Sean, he likes Taylor Swift. Why didn’t you SAY he likes Taylor Swift.','happy');
  await N('In under a minute they are sitting on the grass together, talking about bridge lyrics, ignoring Sean completely.');
  await say('stella','(not looking up) He does the hair flip when he’s nervous. Have you noticed?','smirk');
  await say('toby','(not looking up) Constantly. It’s so much. I love it but it’s so much.','smirk');
 }
 const c=await choose(['Sean, just tell Toby the truth. Kindly.','Sean, RUN.','Sean, sit down. Let them be friends.']);
 if(c===0){
  await say('sean','Toby. You’re actually really cool. And I’m flattered. Like, genuinely. But I’m with Stella, and I’m staying with Stella. Can we just be friends?','sad');
  await say('toby','Yeah, of course. Respect. That was way better than the presentation. Can I still say your hair is a ten?','happy');
  if(A.stella)await say('stella','It’s an eight.','smirk');
  await say('sean','(hand in his hair, quietly) …It’s a nine.','smirk');
  bond('sean',1);await complete('toby','honest');return;
 }
 if(c===1){
  A.sean.ex='scared';
  const m=pprop({t:'mower',x:340,y:150,on:1,layer:2});
  await N('Sean makes a noise like a kettle and runs. Across the field. Away from all of it. Straight across the path of the big ride-on mower, which nobody is driving, because the groundskeeper is having his lunch.');
  await Promise.all([walk('sean',300,140),tw(m,{x:290},900)]);
  SFX.scream();m.red=1;shake(1.6);
  for(let i=0;i<5;i++){SFX.squelch();blood(296,130,40,1,140,152);await wait(220)}
  A.sean.x=300;kill('sean','lie',{pool:50,bleed:6,spray:80});
  await tw(m,{x:340},1500);
  await N('The mower goes on across the field like nothing happened. It leaves a stripe behind it. The stripe is not green.');
  if(A.toby)await say('toby','(very quietly) Ohio was never like this.','shock');
  if(A.coach)await say('coach','(still holding the javelin) That’s why we don’t run on the field at lunch.','angry');
  await complete('toby','mower');return;
 }
 A.sean.pose='sit';
 await say('sean','(sitting down on the grass next to them) …Do you guys want to talk to me, or—','sad');
 await say('stella','(to Toby) Wait, so what did the ex in Ohio SAY.','smirk');
 await N('Nobody answers him. Sean sits there for the rest of lunch, slightly behind them, like a bodyguard nobody hired. They have a group chat by the end of lunch. It’s called SEAN’S HAIR SUPPORT GROUP. He isn’t in it.');
 D.f.thirdWheel=1;await complete('toby','third');
}});
hook({mis:'toby',period:8,room:'arcade',who:'sean',label:'Ask Sean why he’s holding three bags',look:{ex:'sad'},cond:()=>D.f.thirdWheel&&!D.dead.sean,run:async()=>{
 scene('arcade',{sean:[60,1,{y:148}],you:[36,1,{y:154}]});
 put('toby',150,-1,{y:146,pose:'cheer'});if(!D.dead.stella)put('stella',172,-1,{y:146,pose:'cheer'});
 await N('Toby and Stella are on the dance machine together, absolutely destroying a song on Expert. Sean is holding both their backpacks and his own.');
 await say('sean','They’ve got a handshake now. It’s eleven moves. I’m not in the handshake.','sad');
 await say('sean','I wanted to not be in a love triangle. Now I’m not in a love triangle. I’m just next to one. Holding bags.','sad');
 D.f.thirdWheel=0;return 'stay';
}});

/* =================================================================
   CONFISCATED — Arjun’s phone
   ================================================================= */
mission('phone',{name:'Confiscated',icon:'📵',who:['arjun','shermian','kenneth','hasan','nivaan'],
 blurb:'Highgate has a strict no-phones policy. Arjun’s phone fell out of his pocket in front of Ms. Shermian. She took it. Simple, right? Arjun will do anything to get it back. He will also say anything.',
 parts:['Break, corridor: the drop','Lunch, cafeteria: the drawer'],
 tips:['Break, main corridor. Ms. Shermian is on duty and Arjun is standing right in front of her.','Lunch, cafeteria. She’s on cafeteria duty. Her keys are on her lanyard. How Arjun has treated people today decides who will help him.'],
 variants:{sorry:'He said sorry',got:'Got it back',policy:'Policy is policy',drawer:'The drawer'}});
function mean(line){D.f.arjMean=(D.f.arjMean||0)+1;toast(D.f.arjMean>=3?'😠 People are really going off Arjun now.':'😠 That one landed. People remember things like that.');return line}
const ARJUN_REACT={
 kenneth:[['kenneth','(not looking up) Is Arjun with you? Then I’m busy. I’m always busy now. Since break.','sad']],
 nivaan:[['nivaan','I clipped what Arjun said about my stream. 4K. Chat’s voting on what I do with it.','angry']],
 hasan:[['hasan','I know he’s stressed about his phone. I KNOW. But you can’t just say that stuff to people.','sad']],
 dheva:[['dheva','Arjun said my hair looks like a dead hamster wearing a wig. I’ve been in the bathroom for twenty minutes.','sad']],
 tyler:[['tyler','I laughed for ONE second. He’s been staring at me ever since. I can feel it on my neck.','scared']]
};
{const _c=chat;chat=async function(id){if(D&&D.f.arjMean>=2&&ARJUN_REACT[id]&&!(D.f.arjR||{})[id]&&!D.dead.arjun){D.f.arjR=D.f.arjR||{};D.f.arjR[id]=1;for(const l of ARJUN_REACT[id])await say(l[0],l[1],l[2])}return _c(id)}}

hook({mis:'phone',period:2,room:'corridor',who:'arjun',label:'Stand with Arjun',look:{ex:'smirk',pose:'cross'},cond:()=>!D.f.ph1&&!D.dead.arjun&&!D.dead.shermian,run:async()=>{
 const cast={arjun:[110,1,{y:146,pose:'cross'}],you:[86,1,{y:152}],shermian:[220,-1,{y:146,pose:'hips'}]};
 for(const [n,x] of[['nivaan',150],['kenneth',180],['dheva',250]])if(!D.dead[n])cast[n]=[x,-1,{y:150}];
 scene('corridor',cast);
 await say('arjun','So I told him, I said, bro, your mom’s Facebook is the most dangerous website on the internet—','smirk');
 SFX.click();pose('arjun',null);
 const ph=pprop({t:'phone',x:114,y:130});await tw(ph,{y:150},250,'in');SFX.glass();
 await N('His phone slips out of his pocket, bounces once on the tiles, and lands screen-up between his feet. The screen lights up. His alarm. The alarm is a recording of his own voice going “ARJUN. YOU ARE HIM.”');
 for(const n of['nivaan','kenneth','dheva'])if(A[n])A[n].ex='laugh';SFX.cheer();
 await walk('shermian',128,70);pose('shermian','reach');ph.hide=1;hold('shermian','phone');pose('shermian',null);
 await say('shermian','No phones, sweetie. Policy. Policy is love.','happy');
 await say('arjun','Miss, it FELL. It wasn’t out. It was falling. Falling isn’t out!','shock');
 await say('shermian','It’s going in Miss’s drawer. You can have it back at the end of the day.','happy');
 await say('shermian','(leaning in) Or the end of the year. Or the end of you. Miss hasn’t decided.','evil');
 await walk('shermian',336,70);remove('shermian');
 await say('arjun','(turning on everyone) What are you LAUGHING at?','angry');
 if(A.kenneth)await say('arjun',mean('Kenneth, you can’t laugh at ANYONE’S phone. The whole internet has YOUR dad’s name. Your dad’s name is the most-searched thing in our state.'),'angry');
 if(A.kenneth){A.kenneth.ex='sad';await N('Kenneth stops laughing. He doesn’t say anything. He just looks at his shoes.')}
 if(A.dheva)await say('arjun',mean('And Dheva, your hair looks like a dead hamster wearing a wig.'),'angry');
 if(A.dheva)A.dheva.ex='sad';
 const c=await choose(['“Bro. Calm down. That was too far.”','“We’ll get it back. I’ve got you.”','Say nothing.']);
 if(c===0){await say('arjun','Too far? TOO FAR? Everything I have is in that phone. My streak. My notes. My notes are VERY important. You don’t get it.','angry');await say('arjun','…Whatever. Fine. Sorry, Kenneth. Fine. Happy?','angry');if(A.kenneth)await say('kenneth','No.','sad')}
 else if(c===1){D.f.phHelp=1;await say('arjun','(grabbing your shoulders) Lunch. She’s on cafeteria duty. Her keys are on that lanyard. We get the keys. We get the phone. Easy.','smirk')}
 else{if(A.nivaan)await say('arjun',mean('And Nivaan, if you clip that I’ll tell everyone your stream has eleven viewers and four of them are your mom on different accounts.'),'angry');if(A.nivaan)A.nivaan.ex='angry'}
 await N('Arjun storms off. The corridor is quiet for a while after he goes.');
 await walk('arjun',-16,90);remove('arjun');
 D.f.ph1=1;part('phone',1);return 'stay';
}});

hook({mis:'phone',period:4,room:'canteen',who:'arjun',label:'Ask Arjun what the plan is',look:{ex:'angry'},cond:()=>D.f.ph1&&!D.done.phone&&!D.dead.arjun,run:async()=>{
 const m=D.f.arjMean||0;
 const cast={arjun:[204,-1,{y:146}],you:[228,-1,{y:152}]};if(!D.dead.shermian)cast.shermian=[140,1,{y:140,pose:'cross'}];if(!D.dead.pat)cast.pat=[90,1,{y:140}];
 for(const [n,x] of[['hasan',176],['kenneth',260],['jacob',290]])if(!D.dead[n])cast[n]=[x,-1,{y:146}];
 scene('canteen',cast);
 await say('arjun','(eyes fixed on the lanyard) Plan A: I ask nicely. Watch this. I’m very charming.','smirk');
 if(A.shermian){
  await walk('arjun',164,60);face('arjun',-1);
  await say('arjun','Miss! You look… very… is that a new cardigan? It really, um, it hides a lot.','smirk');
  await say('shermian','(smiling with her teeth) Does it, sweetie.','evil');
  await walk('arjun',204,90);
 }
 await say('arjun','Plan A has failed. Plan B: someone distracts her, I take the keys.','angry');
 const o=[
  {t:'Ask Kenneth to distract her.',dis:m>=1||!A.kenneth,why:'Kenneth isn’t speaking to Arjun'},
  {t:'Ask Hasan to distract her.',dis:m>=3||!A.hasan,why:'Hasan has had enough of Arjun today'},
  {t:'Ask her about Mr. Biscuits yourself.',dis:!P.intel.shermianCat,why:'you don’t know about the cat'},
  {t:'Let Arjun start a food fight.',tag:'🍝'}];
 const c=await choose(o,m>=2?'Nobody at the nearby tables will look at Arjun.':'Who’s going to distract her?');
 if(c===0){await walk('kenneth',160,60);await say('kenneth','Miss, I think someone’s doxxing me again. In real life. Can you help? Can you come and stand near me for a while?','scared');await say('arjun','(quietly, as he goes) …Thanks, Kenneth. Seriously.','sad')}
 else if(c===1){await walk('hasan',160,60);await say('hasan','Miss, quick question, is it true that a seating plan is a form of love? Because my dad and me were arguing about it.','happy')}
 else if(c===2){await walk('you',160,60);await say('you','Miss, how is Mr. Biscuits?');await say('shermian','Oh! He’s NINE! He has a croissant bed! Let me show you four hundred pictures!','happy')}
 else{
  await say('arjun',mean('(standing on a chair) JACOB EATS WITH HIS MOUTH OPEN AND I’M SICK OF IT. FOOD FIIIIGHT!'),'yell');
  SFX.splat();if(A.jacob){A.jacob.bloody=1;A.jacob.ex='angry'}
  await N('He throws a whole tray of spaghetti at Jacob. Jacob was not involved in anything. Jacob was just eating. Now the whole cafeteria is throwing things, and none of them are aimed at Arjun, because nobody wants to touch him.');
 }
 if(A.shermian){pose('arjun','reach');SFX.pick();await wait(300);pose('arjun',null)}
 await N('In the chaos, Arjun unclips the lanyard. He doesn’t even look at the keys. He just runs, and you run after him.');
 await walk('arjun',-16,110);
 /* the math room */
 const mc={arjun:[60,1,{y:146}],you:[30,1,{y:152}]};scene('maths',mc,true);cue('tension');
 await walk('arjun',56,60);pose('arjun','reach');SFX.locker();
 await N('Ms. Shermian’s desk. The forever drawer. The third key fits.');
 await N('Inside: Arjun’s phone. A cat collar that says MR. BISCUITS. A seating plan with eleven names crossed out in red pen. And phones. Dozens of them. Flip phones. A pager. A brick-sized thing with an antenna and a sticker dated 1987.');
 hold('arjun','phone');pose('arjun','phone');
 await say('arjun','(clutching it) Oh thank God. Oh, thank GOD. Hi, baby. Hi. Daddy’s here.','happy');
 await N('Then his face changes. He has 63 notifications. All from the same group chat. The class group chat.');
 await say('arjun','…Someone’s been on my phone. Someone posted from my phone.','shock');
 const lines=[['them','(screenshot of Arjun’s notes app: “PEOPLE I CAN’T STAND”, a list of 31 names)'],['them','(screenshot: “why kenneth looks like a thumb with glasses”)'],['them','(voice memo: Arjun practicing insults in the mirror)']];
 lines.push(['kenneth','wow']);if(m>=1)lines.push(['dheva','dead hamster wig. cool. glad it was in the notes first']);if(m>=2)lines.push(['nivaan','clipped. posted. 41k views']);lines.push(['hasan','arjun is this real']);lines.push(['them','Miss Shermian 💗: Sharing is caring, sweeties! 💗']);
 await dms('MATH P3 🧮','23 members',lines,{live:lines.length});
 SFX.door();put('shermian',-14,1,{y:146});await walk('shermian',24,60);
 await say('shermian','Did somebody touch Miss’s drawer?','happy');
 await evil('shermian');
 const ch=await choose(['RUN with the phone.','Give it back. “Policy is policy, Miss.”','Push Arjun towards her and run.']);
 if(ch===2){
  await say('arjun','WHAT ARE YOU— NO—','scared');
  await walk('you',300,110);
  await N('Behind you, the drawer opens and closes. Opens and closes. Opens and closes. It’s a heavy drawer. It wasn’t designed to fit a whole head. It does, eventually.');
  pose('shermian','slam');for(let i=0;i<4;i++){SFX.crunch();blood(A.arjun.x,A.arjun.y-24,30,null,90,A.arjun.y+2);shake(.8);await wait(320)}
  kill('arjun','lie',{pool:44,bleed:5,spray:40});pose('shermian',null);
  await say('shermian','(sweetly, to the drawer) There. Now it’s all in one place.','happy');
  await complete('phone','drawer');return;
 }
 if(ch===1){
  pose('arjun',null);hold('arjun',null);
  await say('arjun','(handing it over, very quietly) …Policy is policy, Miss.','sad');
  await sweet('shermian');
  await say('shermian','GOOD boy! Back at three-fifteen, sweetie. Maybe. Run along.','happy');
  await N('Arjun walks back to the cafeteria with no phone. Every single person in there has read the group chat. Nobody says anything. Nobody needs to.');
  await complete('phone','policy');return;
 }
 const ok=await mash('Out the door with the phone!',{need:20,time:5,info:'She’s between you and the door. MASH!'});
 if(!ok){
  SFX.crunch();shake(1.2);
  await N('She catches you both by the collars at the same time. One hand each. She’s very strong. She’s always been very strong.');
  await say('shermian','Everyone gets a seat in Miss’s drawer.','evil');
  kill('arjun','lie',{pool:44,bleed:5,spray:40});
  await die('seat');return;
 }
 scene('corridor',{arjun:[150,1,{y:146,hold:'phone'}],you:[176,-1,{y:152}]},true);
 await N('You get out. You get all the way to the corridor before either of you breathes. He has his phone back. He’s holding it in both hands, staring at the group chat.');
 const ap=await choose(['“Say sorry. In the chat. Properly.”','Leave it.']);
 if(ap===0){
  pose('arjun','phone');
  await say('arjun','(typing slowly, deleting, typing) …“sorry. it was me. i wrote all of that. i say stuff so people laugh at them before they can laugh at me. that’s not an excuse. i’m sorry kenneth. i’m sorry dheva. i’m sorry everyone.”','sad');
  const r=[['arjun','sorry. it was me. i say stuff so people laugh at them before they laugh at me. thats not an excuse. im sorry kenneth. im sorry dheva. im sorry everyone']];
  if(m>=3)r.push(['note','Seen by 22']);else{r.push(['kenneth','ok']);r.push(['kenneth','thanks for saying it']);r.push(['hasan','proud of u bro. still mad. but proud'])}
  await dms('MATH P3 🧮','23 members',r,{live:r.length});
  await N(m>=3?'Nobody replies. Seen by 22. It’ll take more than one message. He knows that.':'It’s not fixed. But it’s something. It’s the first true thing he’s typed all year.');
  pose('arjun',null);bond('arjun',1);
  await complete('phone','sorry');return;
 }
 await say('arjun','(pocketing it) Got it back. That’s all that matters. Right? That’s all that matters.','smirk');
 await N('He walks into lunch with his phone in his hand. Every table goes quiet as he walks past. He sits down on his own and scrolls, very fast, not reading anything.');
 await complete('phone','got');
}});
