'use strict';
/* =====================================================================
   HIGHSCHOOL — missions F: catfishing and school drama
   @highgate.tea, "Jess from Fair City", Kai Vibes, the group chat,
   Kenneth's leak
   ===================================================================== */
ROSTER[8].foodcourt.push(['nivaan',120,1,'phone',156]);
Object.assign(INTEL,{teaDavid:'@highgate.tea is run from David’s laptop.',jessArjun:'“Jess from Fair City” is a perfume model from Spain. The recovery email starts with “a” and ends in “n.the.great”.'});

/* ---------- @highgate.tea posts something every period, until somebody stops it ---------- */
const TEA=[
 'morning highgate ☕ new day new tea. inspection in two weeks. act natural lol',
 'SPOTTED: corey buying purple CURL CREAM at the mall like it’s contraband 🧴😭',
 'stella’s dad walked out when she was 9 and she STILL carries his ball around everywhere 😭 seek help bestie',
 'aidan has been standing at locker 217 for 40 minutes. not opening it. just standing 👀',
 'omer’s mom DOES pick his clothes. we have the receipts 🩳🧾',
 'kenneth’s “girlfriend” jess from fair city types EXACTLY like someone we know 👀',
 'vote DAVID for year rep. he’s the only one we’ve got nothing on 😇',
 'see u all monday!!! (jk there’s no monday)',
 ''
];
ON_PERIOD.push(async(i,resume)=>{if(resume||!TEA[i]||D.done.tea)return;D.f['tea'+i]=1;BACKLOG.push({n:'📱 @highgate.tea',t:TEA[i],c:'#c0408a'});setTimeout(()=>{toast('📱 @highgate.tea: '+TEA[i]);toastT=5.5},TEST?0:900)});

/* =================================================================
   HIGHGATE TEA — who runs the gossip account?
   ================================================================= */
mission('tea',{name:'@highgate.tea',icon:'☕',who:['stella','sean','david'],
 blurb:'Somebody runs an anonymous account that posts everybody’s worst secrets, every period, all day. Today it got Imani. Today somebody finds out who it is.',
 parts:['Break: Imani’s just seen the post','Lunch: find the proof','Home time: confront them'],
 tips:['Break, the library.','Lunch, the library. Someone always leaves their laptop open when they go to the printer.','Home time, bus loop. In front of everyone, or not.'],
 variants:{exposed:'Exposed in front of everyone',apology:'Said sorry to her face'}});

hook({mis:'tea',period:2,room:'library',who:'stella',label:'Ask Imani what’s wrong',cond:()=>!D.f.tea1&&!D.dead.stella,run:async()=>{
 const cast={stella:[246,-1,{y:144,ex:'cry'}],you:[220,1,{y:154}],david:[140,1,{pose:'sit',y:150}]};if(!D.dead.sean)cast.sean=[200,1,{y:144}];
 scene('library',cast);cue('sad');
 await say('stella','Somebody posted about my dad. On that account. With a crying emoji. A CRYING emoji.','cry');
 await dms('@highgate.tea','4,211 followers',[['them','stella’s dad walked out when she was 9 and she STILL carries his ball around everywhere 😭 seek help bestie','10:20'],['note','1,402 likes · 213 comments'],['them','(top comment, from an account with no picture) “this is so true lmaooo”']]);
 if(A.sean)await say('sean','When I find out who runs that account I’m going to do something I’ll have to explain to a judge.','angry');
 await say('stella','I only ever told, like, four people that. In the whole school. Four.','cry');
 await say('david','(from his desk, without looking up) That’s awful. Truly awful. That’s why I’m running for class president. For a kinder Highgate.','smirk');
 await N('He has a VOTE DAVID badge on. He’s had it on since seventh grade. He’s never once lost the badge.');
 D.f.tea1=1;part('tea',1);
}});

spot({room:'library',period:4,x:112,y:150,label:'Look at David’s laptop',short:'LAPTOP',cond:()=>D.f.tea1&&!D.f.teaProof,run:async()=>{
 scene('library',{david:[140,1,{pose:'sit',y:150}],mia:[60,1,{y:146}],you:[112,1,{y:154}]});
 await say('david','Printer’s jammed again. Don’t touch my stuff.','smirk');
 await walk('david',300,50);remove('david');
 await N('His laptop is open. Two tabs. One is the class president election page. The other one is logged in as @highgate.tea.');
 await dms('Drafts — @highgate.tea','not posted yet',[
  ['them','omer’s mom DOES pick his clothes. we have the receipts 🩳🧾'],['them','kenneth’s “girlfriend” jess from fair city types EXACTLY like someone we know 👀'],['them','vote DAVID for year rep. he’s the only one we’ve got nothing on 😇'],
  ['note','— Notes: “CAMPAIGN STRATEGY.docx” —'],['them','1. Make everyone else look worse.\n2. Be the only one left who looks normal.\n3. class president.\n4. Be liked (??)']]);
 intel('teaDavid');
 if(A.mia)await say('mia','(looking over your shoulder) Huh. The nerd’s the villain. That’s actually quite good writing.','smirk');
 await N('You take a photo of the screen with your phone. Your hand is shaking a bit. You didn’t expect it to be David.');
 D.f.teaProof=1;part('tea',2);
 put('david',330,-1,{y:150,pose:null});await walk('david',140,60);A.david.pose='sit';
 await say('david','Did you touch my stuff?','smirk');
 await say('you','No.');
 return 'stay';
}});

hook({mis:'tea',period:7,room:'bus',who:'david',label:'Confront David about @highgate.tea',cond:()=>D.f.teaProof&&!D.dead.david,run:async()=>{
 const cast={david:[150,1,{y:146}],you:[176,-1,{y:154}]};for(const [n,x] of [['stella',210],['sean',232],['omer',100],['hasan',76],['corey',254],['arjun',52]])if(!D.dead[n])cast[n]=[x,x<150?1:-1,{y:146}];
 scene('bus',cast);cue('tension');
 const c=await choose(['Hold up your phone in front of everyone.','Pull David aside. Just you and him.'],'You’ve got the photo of his laptop.');
 if(c===0){
  await say('you','Everyone. Look at this. @highgate.tea. It’s David’s laptop.');
  await N('You hold up the photo. It goes round the bus loop phone by phone. You can watch it travel by the faces.');
  if(A.omer)await say('omer','You posted about my MOM? You came to my HOUSE. She made you LASAGNE.','angry');
  if(A.hasan)await say('hasan','You’ve been in our group chat for four years. Four years! You’ve been taking NOTES?','shock');
  if(A.stella){await walk('stella',162,80);SFX.smack();A.david.hurt=1;shake(.5);await say('stella','That one was for my dad. He doesn’t deserve it, but I do.','angry')}
  await say('david','(crying, glasses fogging) Nobody votes for the nice guy! Nobody even LOOKS at the nice guy! I thought if everyone else looked worse, I’d just… be there.','cry');
  if(A.arjun)await say('arjun','And I’M the one people call cruel. Bro. BRO. You’re the final boss.','shock');
  await N('Nobody sits with David on the 43. He sits at the back with his VOTE DAVID badge in his hand.');
  await N('He deletes the account before the roundabout. You see him do it. It doesn’t fix anything.');
  await complete('tea','exposed');return;
 }
 await say('you','David. Bins. Now.');
 await walk('david',290,60);await walk('you',270,60);face('you',1);face('david',-1);
 await say('you','I saw your laptop.');
 await N('He doesn’t ask what you mean. He takes his glasses off and cleans them for a long time.');
 await say('david','I’ve run for class president every year since sixth grade. I’ve never got more than nine votes. Nine. Four are my cousins.','sad');
 await say('david','Nobody votes for the nice guy. So I thought, if everyone else looked worse…','sad');
 await say('you','You posted about Imani’s dad. She cried in the library. You watched her do it.');
 await say('david','I know. I was RIGHT THERE. I said “that’s awful”. I meant it. I still posted the next one.','cry');
 const k=await choose(['“Delete it. Then go and tell her yourself.”','“Delete it. I’ll never tell anyone.”']);
 await N('He deletes @highgate.tea. 4,211 followers, gone with one tap. He looks smaller afterwards. Or maybe just his actual size.');
 if(k===0&&A.stella){
  await walk('david',200,50);face('david',1);
  await say('david','Imani. It was me. The account. The post about your dad. I’m sorry. I’m not going to explain it because the explanation is pathetic.','cry');
  await say('stella','…','angry');
  await say('stella','Thank you for saying it to my face. Most people wouldn’t. I still hate you a little bit.','sad');
  await say('david','That’s fair. That’s very fair. That’s more than nine votes’ worth of fair.','sad');
 }else await say('david','Thank you. I don’t deserve that. I’m going to be really, really nice for, like, a year.','sad');
 D.done.tea=1;
 await complete('tea','apology');
}});

/* =================================================================
   JESS FROM FAIR CITY — Kenneth gets catfished
   ================================================================= */
mission('catfish',{name:'Jess from Fair City',icon:'🎣',who:['kenneth','arjun','nivaan'],
 blurb:'Kenneth has been texting “Jess, 16, Fair City” every night for three months. She’s perfect. She’s meeting him at the arcade after school. She has never once sent a voice note.',
 parts:['Break: Kenneth shows you the messages','Lunch: Nivaan runs the photos','After school: Jess arrives'],
 tips:['Break, gym.','Lunch, main corridor. Nivaan can find anyone.','After school, the arcade. Get there before the punchline does.'],
 variants:{chips:'Fries with Arjun',claw:'The claw machine'}});

hook({mis:'catfish',period:2,room:'gym',who:'kenneth',label:'Ask Kenneth who he keeps texting',cond:()=>!D.f.jess1,run:async()=>{
 scene('gym',{kenneth:[220,-1,{pose:'phone',y:146}],paul:[150,1,{y:144,pose:'hips'}],you:[196,1,{y:152}]});
 await say('kenneth','Her name’s Jess. She’s sixteen. She lives in Fair City. She likes basketball AND tall men.','happy');
 await say('paul','You’re five foot seven.','smirk');
 await say('kenneth','She doesn’t KNOW that, Paul.','angry');
 await dms('Jess 💕','Fair City · online 3 min ago',[
  ['them','hey ken 😊 cant stop thinking abt ur free throws','Thu 23:41'],['me','haha yh i’m pretty good tbh','Thu 23:42'],['them','ur not pretty good ur the best in highgate. everyone says ur hairline is unique','Thu 23:52'],
  ['me','thank u?? 😳','Thu 23:52'],['them','meet me at the arcade after school?? 4pm. by the claw machine. i’ll wear red 🔴','Fri 07:02'],['me','100%','Fri 07:03'],['them','cant wait 2 see u in person. finally 🥺','Fri 07:04'],
  ['note','She has never sent a voice note. Or a video. Or a photo that wasn’t taken on a beach in Spain.']]);
 await say('you','Has she ever video called you?');
 await say('kenneth','She’s shy. Shy people don’t video call. Shy people type “ur” instead of “your”. It’s cute.','happy');
 await say('paul','Arjun types “ur”.','smirk');
 await say('kenneth','LOADS of people type “ur”, Paul. I can’t live my life afraid of “ur”.','angry');
 D.f.jess1=1;part('catfish',1);
}});

hook({mis:'catfish',period:4,room:'corridor',who:'nivaan',label:'Ask Nivaan to look into “Jess”',cond:()=>D.f.jess1&&!D.f.jess2,run:async()=>{
 scene('corridor',{nivaan:[150,-1,{pose:'phone',y:146}],you:[124,1,{y:154}]});
 await say('nivaan','Reverse image search. Easy. Give me ten seconds and a reason to live.','smirk');
 await wait(600);SFX.ding();
 await say('nivaan','Oh. Oh no. Jess is a perfume model from Spain. Her name’s Lucía. She’s thirty-four. She’s married to a guy who looks like a horse in a nice way.','shock');
 await say('nivaan','And the account recovery email starts with “a” and ends in “n.the.great”.','shock');
 await N('There is exactly one person at Highgate who would call himself “the great” in an email address.');
 intel('jessArjun');
 await say('nivaan','Do we tell Kenneth? He’s so happy. He bought a new hoodie. It’s red. To match.','sad');
 D.f.jess2=1;part('catfish',2);
}});

hook({mis:'catfish',period:8,room:'arcade',who:'kenneth',label:'Wait for Jess with Kenneth',cond:()=>D.f.jess1&&!D.dead.kenneth,run:async()=>{
 scene('arcade',{kenneth:[236,1,{y:150,topC:'#c8202c'}],jacob:[284,-1,{y:150}],you:[210,1,{y:156}]});
 await say('kenneth','(in a brand-new red hoodie, next to the claw machine) Do I look tall? Be honest. Lie.','scared');
 const c=await choose([{t:'Tell him the truth before she “arrives”.',dis:!D.f.jess2,why:'you don’t know anything yet'},{t:'Let it play out.'}]);
 if(c===0){
  await say('you','Ken. Jess is a perfume model from Spain. She’s thirty-four. The account’s Arjun’s.');
  await N('Kenneth doesn’t say anything for a second. Then he takes his phone out and reads three months of messages back, scrolling up, very fast, like he can find the part where it was real.');
  put('arjun',330,-1,{y:150,pose:'film'});await walk('arjun',270,60);
  await say('arjun','(filming) Kenneth! Over here! Jess couldn’t make it, she’s in SPAIN—','laugh');
  await walk('kenneth',258,60);face('kenneth',1);
  await say('kenneth','I know.','sad');
  pose('arjun',null);ex('arjun','shock');
  await say('kenneth','Who wrote the nice ones? The three in the morning ones. About my mom being ill. About being scared of being short forever.','sad');
  await say('arjun','…','sad');
  await say('arjun','Me. I did. I meant those ones. That’s the worst bit. I meant them and I still did the bit.','cry');
  await say('kenneth','…That’s the saddest thing anyone’s ever said to me. And I’ve been catfished by you for three months.','sad');
  await say('kenneth','Do you want to get fries?','sad');
  await say('arjun','(wiping his face on his sleeve) …Yeah. Yeah. I’ll pay. Obviously I’ll pay.','cry');
  await complete('catfish','chips');return;
 }
 SFX.blip(880,'sine');
 await dms('Jess 💕','online now',[['them','see u at 4 😘','15:12'],['note','— now —'],['them','im here 👀'],['them','turn around 🔴']],{live:2});
 put('arjun',330,-1,{y:150,pose:'film'});await walk('arjun',270,60);
 await say('arjun','(filming, in a red sweater) HIIIII KEN. It’s me! Jess! From Fair City! I love your HAIRLINE—','laugh');
 await N('Arjun is wearing red. He planned the red. He planned it three months ago.');
 ex('kenneth','cry');
 await say('kenneth','…Three months.','cry');
 await say('arjun','Three months, Ken! You told “Jess” about your MOM! You told her you sleep with a—','laugh');
 ex('jacob','angry');A.jacob.shake=1;
 await say('jacob','Stop.','angry');
 await walk('jacob',280,90);pose('jacob','hold');await hop('arjun',16,400);
 await tw(A.arjun,{x:246,y:110},300);SFX.glass();shake(1.2);A.arjun.vis=false;
 await N('Jacob picks Arjun up and posts him through the top of the claw machine. He lands among the stuffed animals. The claw comes down and gently takes his phone.');
 await say('arjun','(from inside the claw machine) …That’s fair. Every single part of that is fair.','hurt');
 await say('kenneth','(very quietly) Thanks, Jacob.','sad');
 await say('jacob','Nobody does that to you. Not on my watch. Not in an arcade.','angry');
 await complete('catfish','claw');
}});

/* =================================================================
   KAI VIBES — Nivaan’s big collab
   ================================================================= */
mission('kaivibes',{name:'Kai Vibes',icon:'📡',who:['nivaan','kayden'],
 blurb:'KAI VIBES — 1.2 million followers — has DMed Nivaan for a collab at the mall. Nivaan has screamed for eleven minutes.',
 parts:['Before school: the DM','After school: the collab'],
 tips:['Before school, bus loop.','After school, the food court. Bring snacks. Kai asked for snacks.']});
hook({mis:'kaivibes',period:0,room:'bus',who:'nivaan',label:'Ask Nivaan why he’s screaming',cond:()=>!D.f.kai1,run:async()=>{
 scene('bus',{nivaan:[122,-1,{pose:'phone',y:146}],hasan:[96,1,{y:146}],you:[150,-1,{y:154}]});
 await say('nivaan','KAI VIBES. KAI VIBES DMED ME. ONE POINT TWO MILLION FOLLOWERS. HE KNOWS MY NAME.','yell');
 await dms('KAI VIBES ✔','1.2M followers',[
  ['them','yo nivaan 🔥 been watching ur streams fr fr','07:58'],['them','u got that dawg in u no cap','07:58'],['me','OMG HI KAI. BIG FAN. HUGE. MASSIVE.','08:01'],
  ['them','collab?? fair city mall food court 4pm. bring snacks','08:02'],['them','specifically haribo. specifically the tangfastics','08:02'],['me','i will bring every tangfastic in the country','08:03'],
  ['them','also dont tell anyone. especially not kayden from year 8. hes a hater','08:04'],['note','The blue tick is slightly the wrong blue.']]);
 await say('hasan','Why would a man with a million followers specifically hate a seventh grader called Kayden?','shock');
 await say('nivaan','Because Kayden is a HATER, Hasan. Keep up.','happy');
 D.f.kai1=1;part('kaivibes',1);
}});
hook({mis:'kaivibes',period:8,room:'foodcourt',who:'nivaan',label:'Go to the collab with Nivaan',cond:()=>D.f.kai1&&!D.dead.nivaan,run:async()=>{
 scene('foodcourt',{nivaan:[150,1,{y:150,hold:'cookie'}],you:[124,1,{y:156}]});
 cue('mall');
 await say('nivaan','Four o’clock. He’s late. Famous people are always late. It’s a power move. I respect it.','scared');
 put('kayden',330,-1,{y:152});await walk('kayden',182,50);
 await N('Somebody very short sits down opposite Nivaan in a puffer jacket, sunglasses, and a stick-on moustache that’s already peeling off one side.');
 await say('kayden','(in the deepest voice he can do) Yo. It’s ya boy. Kai. Vibes. Did you bring the Tangfastics.','smirk');
 await say('nivaan','…Kayden.','shock');
 await say('kayden','Who is Kayden. I don’t know a Kayden. Kayden is a hater.','smirk');
 await N('The moustache falls off into the Tangfastics.');
 await say('nivaan','You made a fake account with a million followers to get me to come to the mall?','cry');
 await say('kayden','(normal voice, very small) I bought the followers. Two pound fifty. I just wanted to be on a stream with someone who’d actually say yes.','sad');
 const c=await choose(['“Just stream together, you idiots.”','“That’s actually really messed up, Kayden.”']);
 if(c===1){await say('you','That’s actually really messed up, Kayden.');await say('kayden','I know. I know it is. I’ve got nobody, man. The Hittaz is me and my cousin. In Wales.','cry');await say('nivaan','…Okay. Okay. One stream.','sad')}
 else await say('you','Just stream together, you idiots.');
 pose('nivaan','film');
 await say('nivaan','We’re live! Chat, this is Kai Vibes. He’s four foot eleven and he lied to me. Say hi.','happy');
 await say('kayden','Highgate Hittaz till I die. Also sorry. Both.','happy');
 await wait(400);
 await say('nivaan','Ninety-one viewers. NINETY-ONE.','happy');
 await N('It’s the most viewers he’s ever had. Kayden is trending at number forty in Fair City for “moustache in candy”.');
 await complete('kaivibes');
}});

/* =================================================================
   SCREENSHOTS — the group chat
   ================================================================= */
mission('groupchat',{name:'Screenshots',icon:'💬',who:['omer','arjun','hasan'],
 blurb:'Arjun said something about Omer’s mom in the group chat. Someone screenshotted it. Omer has seen it. Lunch is in two hours.',
 parts:['Break: Omer has seen the screenshot','Lunch: get to Arjun first'],
 tips:['Break, the field.','Lunch, the cafeteria. If you know why Arjun is the way he is, you might be able to use it.'],
 variants:{sorry:'A real apology',nose:'The cafeteria table'}});
hook({mis:'groupchat',period:2,room:'field',who:'omer',label:'Ask Omer why he’s staring at his phone',cond:()=>!D.f.gc1,run:async()=>{
 scene('field',{omer:[150,1,{pose:'phone',y:146}],jacob:[200,-1,{y:146}],you:[124,1,{y:154}]});
 await say('omer','Someone sent me this. Look.','angry');
 await dms('THE GUYS 🚫AIDAN','8 members',[
  ['hasan','who’s going mall after','Thu 21:03'],['corey','me','21:03'],['david','me. campaigning','21:04'],['arjun','omer’s mom dresses him like she’s getting him ready to be sold at auction 💀','21:16'],
  ['david','😂😂','21:16'],['hasan','bro','21:17'],['corey','not cool man','21:17'],['arjun','what it’s a joke he’s not even in this chat','21:19'],['note','Omer is in the chat. Omer has always been in the chat.']]);
 await say('omer','“He’s not even in this chat.” I MADE the chat. I made it in sixth grade. I named it.','angry');
 await say('omer','And David laughed. Two crying emojis. Two.','angry');
 await say('jacob','That’s out of order. That’s really out of order.','angry');
 await say('omer','Cafeteria. Lunch. Arjun’s done. I’m going to put him through the table and then I’m going to put the table through him.','angry');
 D.f.gc1=1;part('groupchat',1);
}});
hook({mis:'groupchat',period:4,room:'canteen',who:'arjun',label:'Warn Arjun before Omer gets here',cond:()=>D.f.gc1&&!D.dead.arjun&&!D.dead.omer,run:async()=>{
 scene('canteen',{pat:[90,1,{y:140}],shermian:[140,1,{pose:'cross',y:140}],arjun:[204,-1,{pose:'cross',y:146}],hasan:[176,1,{y:146}],you:[230,-1,{y:154}]});
 await say('you','Omer’s seen the chat. The thing about his mom.');
 await say('arjun','It was a JOKE. He knows it’s a joke. Everyone knows I’m joking. That’s my whole personality.','smirk');
 const o=[{t:'“Then apologise properly. Like you mean it.”'},{t:'Let Omer handle it.'}];
 if(P.done.alone)o.unshift({t:'“You told me what your dad says to you. You know exactly what that feels like.”',tag:'🌇'});
 const c=await choose(o);
 const real=P.done.alone&&c===0, tried=real||(c===(P.done.alone?1:0));
 if(real){await say('you','You told me what your dad says to you at dinner. You know exactly what that feels like. You’re doing it to Omer.');ex('arjun','sad');await say('arjun','…That’s a low blow. That’s a really low blow. That’s… fair.','sad')}
 else if(tried){await say('you','Then apologise. Properly. Like you mean it.');await say('arjun','I don’t do “properly”. I do “jokes”. Properly is for people with nice dads.','smirk')}
 put('omer',330,-1,{y:150});await walk('omer',230,110);ex('omer','angry');
 await say('omer','“He’s not even in this chat.”','angry');
 if(real){
  await say('arjun','Omer. I’m sorry. Not a joke sorry. A real one.','sad');
  await say('arjun','Your mom’s nice. She made me a sandwich in seventh grade when I didn’t have lunch, and she cut it into triangles, and I never said thank you. I say horrible stuff about everyone’s parents because mine are horrible about me.','cry');
  await N('The whole table goes quiet. Hasan puts his chips down. Nobody has ever heard Arjun say anything true out loud before.');
  await say('omer','…Triangles?','shock');
  await say('arjun','Triangles.','cry');
  await say('omer','(sitting down next to him) She always does triangles. She says squares are for people who’ve given up.','sad');
  await complete('groupchat','sorry');return;
 }
 if(tried)await say('arjun','Look, bro, it was a joke, I’m sorry you were offended—','smirk');
 await say('omer','“Sorry you were offended.”','yell');
 pose('omer','grab');await walk('omer',214,120);
 await hop('arjun',10,300);SFX.crunch();shake(1.3);A.arjun.hurt=3;A.arjun.pose='lie';blood(A.arjun.x,A.arjun.y-10,30,1,70,A.arjun.y+2);
 await N('Omer puts Arjun’s face into the cafeteria table. The table wins. Arjun’s nose goes somewhere noses don’t go.');
 await evil('shermian');await say('shermian','OMER!','evil');await sweet('shermian','canteen');await say('shermian','…Good form, sweetie.','happy');
 await say('arjun','(from the floor, nose pouring) …It was a joke…','hurt');
 await say('omer','So’s your nose now.','angry');
 await complete('groupchat','nose');
}});

/* =================================================================
   LEAKED — Kenneth told a stranger everything, and the stranger posted it
   ================================================================= */
mission('leaked',{name:'Leaked',icon:'🔓',who:['kenneth','nivaan','kayden'],
 blurb:'Last night a guy online said “yo it’s me, new account” and Kenneth believed him. He told him everything. Then the guy realised Kenneth wasn’t who he thought, got angry, and posted all of it.',
 parts:['Before school: Kenneth’s seen the post','Lunch: trace the account','After school: make them take it down'],
 tips:['Before school, bus loop.','Lunch, main corridor. Nivaan can trace anything.','After school, the rooftop parking. Someone there knows the guy.'],
 variants:{reported:'Reported and deleted',dad:'Told his dad'}});

hook({mis:'leaked',period:0,room:'bus',who:'kenneth',label:'Ask Kenneth why he looks sick',cond:()=>!D.f.leak1&&!D.dead.kenneth,run:async()=>{
 scene('bus',{kenneth:[236,-1,{pose:'phone',y:146,ex:'scared'}],paul:[212,1,{y:142}],you:[258,-1,{y:154}]});
 await say('kenneth','Don’t look at my phone. Actually look at my phone. I need someone to look at my phone and tell me it’s fine.','scared');
 await dms('xX_V1PER_Xx','Block Wars · last night',[
  ['them','yo kenny its me new account lol. got banned on the old one','Thu 23:58'],['me','oh hey!! wait who','23:58'],['them','bruh. from school. remember','23:59'],['me','ohhh yeah haha sorry','23:59'],
  ['them','remind me ur full name again for the clan form','Fri 00:03'],['me','kenneth duncan bramble 💀 dont laugh at duncan','00:03'],['them','and ur dads name for the parent thing','00:04'],['me','graham. why does the clan need my dad','00:04'],
  ['them','what school u at now','00:06'],['me','highgate high obviously lol. year 10. ms loach for science','00:06'],['them','where do u live again','00:09'],['me','fair city. same as always','00:10'],
  ['them','wait. ur not kenny B. kenny B is from cardiff','00:11'],['me','who’s kenny b??','00:11'],['them','u wasted my time. watch this','02:14'],
  ['note','— 2:14am —'],['them','(posted publicly) KENNETH DUNCAN BRAMBLE. HIGHGATE HIGH, FAIR CITY. YEAR 10. DAD: GRAHAM BRAMBLE. SCIENCE TEACHER: MS LOACH. 5FT 7. SLEEPS WITH A NIGHTLIGHT. SPAM HIM 😂'],['note','312 shares']]);
 await say('kenneth','He said he was my bro. I thought he was someone from school who got a new account. People do that. People DO that.','cry');
 await say('kenneth','I told him my middle name. Nobody knows my middle name. My middle name is DUNCAN.','cry');
 await say('paul','I won’t tell anyone about Duncan. I’ll take it to my grave. I’ll take it to YOUR grave if anyone else finds out.','angry');
 await say('kenneth','People are messaging me. Strangers. They know my dad’s name. One of them said “see you at Highgate”.','scared');
 D.f.leak1=1;part('leaked',1);
}});

hook({mis:'leaked',period:4,room:'corridor',who:'nivaan',label:'Ask Nivaan to trace the guy who leaked Kenneth',cond:()=>D.f.leak1&&!D.f.leak2,run:async()=>{
 scene('corridor',{nivaan:[150,-1,{pose:'phone',y:146}],you:[124,1,{y:154}]});
 await say('nivaan','xX_V1PER_Xx. Account’s two days old. Profile picture’s… hang on.','smirk');
 await wait(500);SFX.ding();
 await say('nivaan','It’s a drawing of a Super Soaker with “HGH” on it. Highgate Hittaz.','shock');
 await say('nivaan','And the IP’s in Wales.','shock');
 await N('There is exactly one member of the Highgate Hittaz who lives in Wales.');
 await say('nivaan','Kayden’s cousin. Kayden’s cousin doxxed Kenneth because he thought Kenneth was a different Kenny who owes him twenty bucks in Cardiff.','shock');
 await say('nivaan','Kayden’s always at the mall parking lot after school. Make him ring his cousin.');
 D.f.leak2=1;part('leaked',2);
}});

hook({mis:'leaked',period:8,room:'carpark',who:'kayden',label:'Make Kayden ring his cousin',cond:()=>D.f.leak2&&!D.dead.kayden,run:async()=>{
 scene('carpark',{kayden:[60,1,{y:150}],you:[90,-1,{y:156}]});
 await say('you','Your cousin doxxed Kenneth. Full name, his dad, his school, where he lives. Ring him. Now.');
 await say('kayden','RHYS? Rhys did that? Rhys cries at Bambi.','shock');
 pose('kayden','phone');
 await say('Rhys (on speaker)','alright kay. what','smirk');
 await say('kayden','Did you post a kid’s whole life online last night? Kenneth? From MY school?','angry');
 await say('Rhys (on speaker)','he pretended to be kenny B. kenny B owes me twenty bucks','smirk');
 await say('kayden','He didn’t pretend anything! YOU messaged HIM! You said “it’s me”! He’s just nice! He thought you were a bro!','yell');
 await say('Rhys (on speaker)','…oh','shock');
 await say('kayden','Take it down. Now. Or you’re out of the Hittaz. And I’m telling Grandma.','angry');
 await say('Rhys (on speaker)','not grandma. bro. not grandma','scared');
 await N('Thirty seconds later the post is gone. The account is gone. The screenshots aren’t. Screenshots never are.');
 pose('kayden',null);
 if(!D.dead.kenneth){put('kenneth',330,-1,{y:150});await walk('kenneth',120,60)}
 if(A.kenneth){
  await say('kenneth','Is it gone?','scared');
  await say('kayden','It’s gone, bro. I’m sorry. On God. He’s my cousin and he’s an idiot. Hittaz don’t do that.','sad');
  await say('kenneth','I told him everything because he said he was my bro. I just… I wanted someone to message me back at two in the morning.','sad');
 }
 const c=await choose(['“Report the screenshots. All of them.”','“Tell your dad, Ken. Tonight.”']);
 if(c===0){
  await N('The three of you sit on the parking lot floor and report every screenshot you can find. It takes forty minutes. Twelve get taken down. Kayden reports one of his own posts by accident and doesn’t say anything.');
  await say('kenneth','Next time someone online says “it’s me”, I’m going to say “prove it” and then I’m going to log off and go outside.','sad');
  await complete('leaked','reported');return;
 }
 await say('kenneth','My dad? He’ll go mental. His NAME was on there.','scared');
 await say('you','He’s going to find out anyway. Better from you than from a stranger who says “see you at Highgate”.');
 if(A.kenneth){pose('kenneth','phone');await say('kenneth','(on the phone) Dad? Yeah. No, I’m fine. I did something stupid. Can you pick me up from the mall?','cry');await N('You hear his dad’s voice, very small, through the phone. It doesn’t sound angry. It sounds like someone getting his keys.')}
 await complete('leaked','dad');
}});

/* =================================================================
   EMERGENCIES ONLY — mess with Corey’s purple C.U.R.L. curl cream
   ================================================================= */
Object.assign(ITEMS,{curl:'Corey’s purple C.U.R.L. tub (stolen)'});
mission('emergency',{name:'Emergencies Only',icon:'🧴',who:['corey','tez','abby'],
 blurb:'Corey keeps a tub of purple C.U.R.L. curl cream in his black zip-up hoodie. He says it’s “for emergencies”. He has an emergency every hour. Today, the emergency is you.',
 parts:['Before school: nick the tub out of his hoodie','Break: Tez helps you “improve” it','Home time: Corey fixes his hair in front of Abby'],
 tips:['Before school, main corridor. He checks his curls in the door window.','Break, the bathroom. Tez has supplies.','Home time, bus loop. He always does a last touch-up before the 43.'],
 variants:{mayo:'Mayonnaise',glue:'Superglue',paint:'Purple paint'}});

hook({mis:'emergency',period:0,room:'corridor',who:'corey',label:'Nick Corey’s curl cream',cond:()=>!has('curl')&&!D.f.curlSwap,run:async()=>{
 scene('corridor',{corey:[150,1,{y:146}],kayden:[196,-1,{y:152}],abby:[240,-1,{y:146}],you:[176,-1,{y:154}]});
 face('corey',-1);
 await N('Corey is checking his curls in the window of the English door. Left side. Right side. Left side again. The tub of C.U.R.L. sits in the front pocket of his black hoodie, the zip half open.');
 await say('corey','It’s not product. It’s maintenance.','smirk');
 await say('kayden','(whispering) Bro’s about to take the man’s lifeblood. I respect it. I fear for you.','shock');
 await walk('you',160,30);pose('you','reach');
 const r=await meter('Lift the tub out of his hoodie pocket',{speed:1.2});
 pose('you',null);
 if(!r){
  face('corey',1);
  await say('corey','…That’s for emergencies.','angry');
  await N('He zips the hoodie all the way up, looks at you like you’ve let him down personally, and walks off without a word. That’s worse than shouting. Corey knows it’s worse.');
  bond('corey',-1);
  return;
 }
 SFX.pick();give('curl');
 await walk('you',200,60);
 await say('corey','(patting his pocket, not looking down) Emergency kit: check. Curls: perfect. Today: mine.','smirk');
 await say('abby','(passing him) Morning, Corey.','happy');
 await say('corey','(to the door, very quietly, after she’s gone) Morning, Abby.','blush');
 part('emergency',1);
}});

hook({mis:'emergency',period:2,room:'toilets',who:'tez',label:'Ask Tez to help with Corey’s curl cream',cond:()=>has('curl')&&!D.f.curlSwap,run:async()=>{
 scene('toilets',{tez:[200,-1,{pose:'lean',y:146}],you:[170,1,{y:154,hold:'powder'}]});
 await say('tez','C.U.R.L.? Corey’s C.U.R.L.? Oh, you’re evil. I like you. I’m twenty-one and I like you.','smirk');
 await say('tez','Options. I’ve got a mayonnaise sachet from 2019. I’ve got superglue. And I’ve got purple poster paint from the sixth grade art closet. Same color as the tub. He’ll never know.','smirk');
 const c=await choose(['Mayonnaise.','Superglue.','Purple poster paint.']);
 D.f.curlSwap=['mayo','glue','paint'][c];
 await N(['You scoop out the curl cream and fill the tub with very old mayonnaise. It smells like a car boot sale.','Tez stirs half a tube of superglue into the curl cream with a lolly stick. It goes a bit shiny. It goes very shiny.','You fill the tub with purple poster paint. It looks exactly the same. It is not the same.'][c]);
 take('curl');hold('you',null);
 await say('tez','Put it back in his locker. He does a last touch-up before the bus every day. Every day. I’ve been watching him do it for three years.','smirk');
 part('emergency',2);
}});

hook({mis:'emergency',period:7,room:'bus',who:'corey',label:'Watch Corey do his last touch-up',cond:()=>D.f.curlSwap&&!D.done.emergency&&!D.dead.corey,run:async()=>{
 const cast={corey:[166,1,{y:150}],you:[140,1,{y:156}]};for(const [n,x] of [['abby',192],['hasan',100],['arjun',78],['paul',236],['nivaan',120]])if(!D.dead[n])cast[n]=[x,x<166?1:-1,{y:146}];
 scene('bus',cast);
 await say('corey','One second. Emergency.','smirk');
 hold('corey','powder');pose('corey','reach');await wait(700);hold('corey',null);pose('corey',null);
 const v=D.f.curlSwap;
 if(v==='mayo'){
  A.corey.hs='wetcurl';SFX.squelch();
  await N('The curls collapse. Slowly. One at a time. They glisten. A seagull lands on the bus shelter and stares at Corey with real interest.');
  if(A.abby)await say('abby','…Corey, why do you smell like a chicken sandwich?','shock');
  if(A.arjun)await say('arjun','CURL-FIL-A! Ha! HA! I’ve been waiting my whole life for this!','laugh');
  if(A.hasan)await say('hasan','(crying, on the floor) He’s— he’s seasoned—','laugh');
  await say('corey','It’s… a new formula.','blush');
 }else if(v==='glue'){
  A.corey.hs='helmet';SFX.thud();
  await N('The curls set. All of them, at once, in one solid shiny shape. Corey taps it. It goes tok.');
  if(A.paul){await walk('paul',180,60);await say('paul','Can I— (he knocks on it like a door)','happy');SFX.thud();await say('paul','Somebody’s home.','laugh')}
  if(A.abby){await say('abby','Can I knock?','smirk');SFX.thud();await say('abby','…I kind of like it, actually. You look like a Lego man. A sad one.','laugh');ex('corey','blush')}
  await say('corey','I can’t move my head. I physically cannot turn my head.','scared');
 }else{
  A.corey.hairC='#9a4ae0';SFX.drip();
  await N('His hair goes purple. Properly purple. It runs down his forehead in two neat stripes like war paint.');
  if(A.nivaan){pose('nivaan','film');await say('nivaan','PURPLE COREY. We’re live. We are SO live. Chat is spamming grapes.','laugh')}
  if(A.abby)await say('abby','(trying very hard not to laugh) …It matches your little flower. The one by the kerb. That you water.','smirk');
  await say('corey','What flower? I don’t know about a flower.','blush');
 }
 await walk('corey',152,40);face('corey',-1);
 await say('corey','(quietly, just to you) Was this you?','sad');
 const c=await choose(['“Yeah. It was me.”','“No idea, bro. Probably Arjun.”']);
 if(c===0){
  await say('corey','…','sad');
  await say('corey','My grandma bought me my first tub. seventh grade. She said “you’ve got your grandpa’s hair, look after it”. I’ve been looking after it ever since.','sad');
  await say('corey','…It’s fine. It was a good one. I’d have done it to you.','smirk');
  await say('corey','(zipping his hoodie up to his chin) I’m going to get you back, though. Not today. When you don’t expect it. Like the Curlfather.','smirk');
 }else{
  if(A.arjun)await say('arjun','For ONCE in my life it wasn’t me! I’ve got witnesses! I was being nice all day!','angry');
  await say('corey','(looking at you a beat too long) …Right.','sad');
  bond('corey',-1);
 }
 await complete('emergency',v);
}});
