'use strict';
/* =====================================================================
   HIGHSCHOOL — STEAL HIS GIRL
   A whole arc for taking somebody’s girlfriend, in five parts, and it
   doesn’t stop when she says yes:
     1. The opening — she’s fed up with him, you make her laugh.
     2. The moment — the two of you, alone, too close.
     3. He finds out — and he comes for you.
     4. The fallout — everybody picks a side.
     5. Fair City — he tries one big last thing to win her back.
   Endings: she stays with you · she goes back to him · you give her
   back (and maybe keep your friend).
   Built once, used for:
     Stella, from Sean (your friend — this one costs you)
     Mia, from Tez
   ===================================================================== */
const STEAL={
 stella:{bf:'sean',name:'Stella',icon:'🥎',title:'Strike Three',friend:1,
  places:{a:[[2,'field'],[4,'field']],b:[[4,'library'],[2,'library']],d:[[2,'corridor'],[4,'corridor']],e:[8,'arcade']},
  blurb:'Sean calls Stella forty times a day. She moved schools for him. She’s starting to look at the exits. And at you.',
  l1:['He called me eleven times during third period. ELEVEN. I was in a test. He left a voicemail that was just him breathing and saying “babe”.','I moved schools for him. I moved my whole life two hours east for a boy who can’t let me pee without a status update.'],
  l2:'Okay, stand behind me. Hands on the bat. No— higher. You’re so bad at this. You’re SO bad at this. (she’s laughing) Don’t move.',
  bf3:['I SAW IT. Kaylee sent it to the whole grade. You and her. At the field. You were my BOY.','We had a handshake. We had a HANDSHAKE, man. Eleven parts. I taught you the eleven parts.'],
  gesture:'Sean is at the claw machine. He’s been at the claw machine for three hours. Eighty-one dollars in quarters. There’s a stuffed bear in there holding a softball. He’s crying a bit.',
  bfAsk:'Stella. Stel. I got it. Eighty-one dollars. I’ll stop calling. I’ll call ONCE a day. Twice. Once. I’m saying it in front of everybody.'},
 mia:{bf:'tez',name:'Mia',icon:'🎭',title:'Exit, Pursued',friend:0,
  places:{a:[[2,'canteen'],[4,'canteen']],b:[[4,'library'],[2,'library']],d:[[2,'corridor'],[4,'corridor']],e:[8,'foodcourt']},
  blurb:'Tez grew a mustache to impress Mia. It did not impress Mia. Mia is in Drama. Mia wants someone who can at least act like they care.',
  l1:['He grew the mustache for me. I didn’t ask for the mustache. Nobody asked for the mustache.','He calls me “m’lady”. Out loud. In public. Like a medieval disease.'],
  l2:'Run lines with me. You’re Romeo. I’m Juliet. You don’t have to be good. You just have to look at me like— yeah. Like that. Oh no.',
  bf3:['You think I don’t know? I KNOW. I grew this mustache for nothing. For NOTHING, man.','Three months I’ve been growing this. Do you know how itchy this is? Do you KNOW?'],
  gesture:'Tez is standing on a food court table. He has shaved off the mustache. He is holding it in his hand, in a ziplock bag, like an offering.',
  bfAsk:'Mia. I shaved it. For you. I kept it, in case you want to see it. I’m a new man. A smooth man. Please.'}
};
function stealArc(gid,S){
 const bf=S.bf,mis='steal_'+gid,G=S.name,B=()=>K[bf].n;
 const f=k=>D.f[mis+'_'+k],sf=(k,v)=>{D.f[mis+'_'+k]=v==null?1:v};
 const ok=()=>!D.dead[gid]&&!D.dead[bf];
 mission(mis,{name:S.title,icon:S.icon,who:[gid,bf],goal:'Take '+G+' from '+K[bf].n+'. Then live with it.',
  blurb:S.blurb,parts:['The opening','The moment','He finds out','Everybody picks a side','Fair City'],
  tips:['Break or lunch, '+shortName(S.places.a[0][1])+'. '+G+' is venting.','Break or lunch, '+shortName(S.places.b[0][1])+'. She asked you to come.','Home time, the bus loop. '+K[bf].n+' knows.','Break or lunch, Main Corridor. Everybody’s heard.','After school, Fair City Mall, '+shortName(S.places.e[1])+'. '+K[bf].n+' has a plan.'],
  variants:{you:'She chose you',back:'She went back to him',bros:'You gave her back'}});
 /* 1 */
 for(const [p,room] of S.places.a)hook({mis,period:p,room,who:gid,label:'Ask '+G+' what’s wrong',look:{ex:'sad',pose:'cross'},cond:()=>ok()&&!f('a'),run:async()=>{
  scene(room,{[gid]:[170,-1,{y:146,ex:'sad',pose:'cross'}],you:[140,1,{y:154}]});
  await beat(S.title.toUpperCase(),'PART ONE · THE OPENING');
  for(const l of S.l1)await say(gid,l,'cold');
  await say(gid,'(seeing your face) Not you. God. Him. You’re the first person who’s asked.','sad');
  const c=await choose(['Make a joke about him. A mean one.','“He’s just like that, he loves you.”','“Sounds like you need a break from him.”']);
  if(c===1){await say(gid,'(cold) Yeah. Everybody says that. It’s always somebody’s job to say that.','cold');sf('a');sf('cold');part(mis,1);await N(G+' walks off. Whatever that was, it’s over.');await complete(mis,'cold');return 'stay'}
  if(c===0){await say('you',bf==='sean'?'Does he do the breathing on the phone? The “babe…” one? Like a haunted doorbell?':'Does the mustache have its own Instagram yet? It looks like it has opinions.');await say(gid,'(snorting, covering her mouth) Oh my god. Oh my GOD. You can’t say that. Say it again.','laugh')}
  else await say(gid,'(looking at you for a long second) …Yeah. Yeah, maybe I do.','blush');
  await camZoom(155,112,1.7,400);await N('She doesn’t walk away. She stands there a second too long. Then she steals a fry off your tray and says “come find me later” like it’s nothing.');await camZoom();
  sf('a');part(mis,1);return 'stay'}});
 /* 2 */
 for(const [p,room] of S.places.b)hook({mis,period:p,room,who:gid,label:'Meet '+G,look:{ex:'happy'},cond:()=>ok()&&f('a')&&!f('cold')&&!f('b'),run:async()=>{
  scene(room,{[gid]:[170,-1,{y:146,ex:'happy',hold:gid==='stella'?'bat':'paper'}],you:[146,1,{y:150}]},true);
  await beat(S.title.toUpperCase(),'PART TWO · THE MOMENT');
  await say(gid,S.l2,'blush');
  await walk('you',160,40);face('you',gid);
  await camZoom(166,108,2.1,600);
  await N('It goes quiet. Not school-quiet. The other kind. She looks at you. You look at her. Somewhere far away, a bell rings for nobody.');
  const c=await choose(['Kiss her.','Pull back. “He’s my— this is a bad idea.”','Tell her you like her. Out loud.']);
  await camZoom();
  if(c===1){await say(gid,'(stepping back, laughing too loud) Right. Yeah. Totally. That’s— I was kidding. Obviously.','cold');sf('b');sf('cold');part(mis,2);await N(G+' doesn’t text you after that. It’s over before it started.');await complete(mis,'cold');return 'stay'}
  if(c===0){SFX.kiss&&SFX.kiss();fxState.romance=.6;await N('It’s quick. It’s on the mouth. It’s a terrible idea. You both know it’s a terrible idea, which is somehow the best part.');fxState.romance=0}
  else await say(gid,'(very quietly) …Say it again. No. Don’t. I’ll do something stupid.','blush');
  put('kaylee',334,-1,{y:146,pose:'film'});await walk('kaylee',290,40);
  await N('Behind the shelves, very slowly, Kaylee lowers her phone. Then she runs.');await walk('kaylee',350,140);remove('kaylee');
  await say(gid,'(going pale) …That was Kaylee. Kaylee has forty thousand followers and no soul.','scared');
  sf('b');part(mis,2);return 'stay'}});
 /* 3 */
 hook({mis,period:7,room:'bus',who:bf,label:K[bf].n+'’s waiting for you',look:{ex:'angry',pose:'cross'},cond:()=>ok()&&f('b')&&!f('cold')&&!f('c'),run:async()=>{
  const cast={[bf]:[200,-1,{y:146,ex:'yell'}],you:[140,1,{y:154}],kid1:[250,-1,{y:144,pose:'film'}],kid3:[270,-1,{y:146}]};
  scene('bus',cast,true);cue('fight');
  await beat(S.title.toUpperCase(),'PART THREE · HE FINDS OUT');
  for(const l of S.bf3)await say(bf,l,'yell');
  await walk(bf,162,90);
  await camZoom(152,108,1.9,300);
  const c=await choose([{t:'Hit him first.',tag:'👊'},{t:'Let him hit you. You earned it.'},{t:'“She’s not yours, man. She never was.”'}]);
  await camZoom();
  if(c===0){const won=await mash('FIGHT',{need:20,time:4});
   if(won){await hit('you',bf,{blood:8});await hit('you',bf,{blood:6});A[bf].pose='lie';A[bf].hurt=2;await N('He goes down on the curb. The whole bus watches through the windows. Nobody cheers. That’s how you know it was bad.');sf('won')}
   else{await hit(bf,'you',{blood:10});await hit(bf,'you',{blood:8});A.you.hurt=3;A.you.pose='lie';await N('He’s not a fighter. It doesn’t matter. He’s angrier than you. He keeps going until a bus driver pulls him off.')}}
  else if(c===1){await hit(bf,'you',{blood:10});A.you.hurt=2;await N('He hits you once. You don’t move. He looks at his hand like it belongs to someone else.');await say(bf,'(crying now) Why won’t you hit back. Hit me back. HIT ME BACK.','cry');sf('won')}
  else{await say(bf,'(very quiet) …Yeah? Okay. Okay. Then she’s not anybody’s. Watch.','evil');sf('vow')}
  if(S.friend)(P.grudge=P.grudge||{})[bf]=cal()+5;
  sf('c');part(mis,3);return 'ended'}});
 /* 4 */
 for(const [p,room] of S.places.d)hook({mis,period:p,room,who:gid,label:'Walk the corridor with '+G,look:{ex:'scared'},cond:()=>ok()&&f('c')&&!f('d'),run:async()=>{
  const cast={[gid]:[120,1,{y:150,ex:'scared'}],you:[100,1,{y:154}]};const side=S.friend?['hasan','omer','arjun']:['kayden','jaxon'];
  side.filter(k=>!D.dead[k]&&K[k]).forEach((k,i)=>cast[k]=[220+i*24,-1,{y:146,pose:'cross',ex:'angry'}]);
  scene('corridor',cast,true);
  await beat(S.title.toUpperCase(),'PART FOUR · EVERYBODY PICKS A SIDE');
  await N('The whole corridor knows. You can tell because it goes quiet in a wave, ahead of you, like you’re a shark fin.');
  if(S.friend&&A.hasan)await say('hasan','Bro. BRO. Sean’s been crying in the band room since first period. He’s playing the tuba. He doesn’t PLAY the tuba.','angry');
  if(S.friend&&A.omer)await say('omer','You don’t do that to a friend. You just don’t. I don’t care how good the girl is.','cold');
  if(S.friend&&A.arjun)await say('arjun','(slow clap) Honestly? Iconic. Evil. Ten out of ten. I’ve never respected you more and I’ll never trust you again.','smirk');
  if(!S.friend&&A.kayden)await say('kayden','Bro you got the mustache kid crying in the drama room. That’s crazy. I’d never. (he would)','laugh');
  await say(gid,'(grabbing your sleeve, low) I need to know this is real. Not a thing to make him feel bad. Not a thing to win. Real.','scared');
  const c=await choose(['Hold her hand. In front of all of them.','“It’s real.”','“…I don’t know yet.”']);
  if(c===2){await say(gid,'(letting go) Okay. Good to know. Really good to know.','cold');sf('doubt')}
  else{if(c===0)await N('You take her hand in front of the whole corridor. It is the bravest and dumbest thing you’ve done this year.');await say(gid,'(squeezing) Okay. Okay. Fair City. After school. He’ll do something. He always does something.','blush')}
  if(S.friend)for(const k of['hasan','omer'])(P.grudge=P.grudge||{})[k]=cal()+2;
  sf('d');part(mis,4);return 'stay'}});
 /* 5 */
 hook({mis,period:8,room:S.places.e[1],who:'auto',cond:()=>ok()&&f('d')&&!D.done[mis],run:async()=>{
  scene(S.places.e[1],{[gid]:[130,1,{y:150,ex:'happy'}],you:[110,1,{y:152}],[bf]:[230,-1,{y:146,ex:'cry'}],kaylee:[280,-1,{y:148,pose:'film'}]},true);
  await beat(S.title.toUpperCase(),'PART FIVE · FAIR CITY');
  await N(S.gesture);
  await camZoom(230,108,1.8,500);await say(bf,S.bfAsk,'cry');await camZoom();
  const c=await choose(['Take her hand. Stay.','Let her choose. Say nothing.','“Go. Go back to him. I’m sorry, man.”']);
  if(c===2){await say(gid,'(staring at you) …You’re serious.','shock');await say('you','He’s '+(S.friend?'my boy. He was my boy before any of this.':'a mess. But he’s a mess for you.'));
   await walk(gid,206,60);await N('She goes to him. He doesn’t even look at her at first. He’s looking at you. '+(S.friend?'Then he does the first part of the handshake. Just the first part. You do the second.':'Then he gives you a very small nod. Mustache-less. Honorable.'));
   if(S.friend)delete (P.grudge=P.grudge||{})[bf];await complete(mis,'bros');return 'stay'}
  /* she likes you. She only goes back if you hesitated at every chance you had. */
  const you=!(c===1&&f('doubt'));
  if(you){await say(gid,'(not letting go of your hand) '+B()+'. Go home.','cold');await N('He stands there a long time. Then he walks out, alone, past everybody who filmed it. The mall plays a song about summer over the speakers. It’s November.');
   await walk(bf,350,60);remove(bf);await say(gid,'(quietly, leaning on you) I picked you. Don’t make me look stupid for it.','blush');D.f['with_'+gid]=1;await complete(mis,'you')}
  else{await say(gid,'(slowly letting go) …He did something stupid for me. In front of everybody. You never did anything stupid for me.','sad');
   await walk(gid,214,60);await N('She walks over to him. Kaylee gets the whole thing. By tonight it’s a sound. By tomorrow people are dancing to it.');
   await Promise.all([walk(gid,350,60),walk(bf,355,60)]);remove(gid);remove(bf);await complete(mis,'back')}
  return 'stay'}});
}
for(const id in STEAL)if(K[id]&&K[STEAL[id].bf])stealArc(id,STEAL[id]);
OUTCOME_FIX['steal_stella:cold']='bad';OUTCOME_FIX['steal_mia:cold']='bad';OUTCOME_FIX['steal_stella:you']='messy';OUTCOME_FIX['steal_stella:bros']='good';OUTCOME_FIX['steal_stella:back']='bad';
OUTCOME_FIX['steal_mia:you']='good';OUTCOME_FIX['steal_mia:bros']='good';OUTCOME_FIX['steal_mia:back']='bad';
ARC_MIS.push('steal_stella','steal_mia');
/* if she’s with you now, their couple stuff stops, and she’s with you around school */
{const SS=['instella','striketwo','firstfight','farewell','toby'];for(const h of HOOKS)if(SS.includes(h.mis)){const c=h.cond;h.cond=()=>!(P.done.steal_stella==='you')&&(!c||c())}}
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);if(!D||D.weekend)return r;
 for(const gid in STEAL){if(P.done['steal_'+gid]!=='you'||D.dead[gid])continue;
  if(room==='canteen'&&[2,4].includes(D.period)&&A.you){if(!A[gid])put(gid,(A.you.x||40)+18,-1,{y:150,ex:'happy'});else{A[gid].ex='happy'}}}
 return r}}
