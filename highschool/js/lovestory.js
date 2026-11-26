'use strict';
/* =====================================================================
   HIGHSCHOOL — THE LOVE STORY IS THE MAIN STORY  (full version only)
   The three couples aren't side quests any more. Once a couple is
   together, they find a piece of the File, the teachers notice them,
   and on Inspection Day they're the ones who show up for you.
   • Corey & Abby   — THE MARGINS: Abby's sketchbook. Nineteen Fridays of
                      Coach carrying bin bags to the boiler hatch.
   • Sean & Stella  — FORTY-ONE: Sean's hourly voice notes for Portland
                      catch Mr. Kim picking his next "volunteer". It's her.
   • Hasan & Darren — STEP TEN POINT FIVE: Darren's mum is the lead
                      inspector. Someone on the inside.
   Finale hooks live in js/finale3.js (LOVE, loveOn, lovers).
   The safe edition cuts every one of these couples, so all of this
   checks window.EDITION at run time (edition-safe.js loads after us).
   ===================================================================== */
const fullEd=()=>window.EDITION!=='safe';
const dvL=m=>(D&&D.done&&D.done[m])||(P&&P.done&&P.done[m]);
const LOVE={
 corey:{a:'corey',b:'abby',ev:'sketchbook',name:'Corey & Abby',on:()=>dvL('window')||dvL('corey')==='kiss'||dvL('smallhours')||dvL('mended')},
 sean:{a:'sean',b:'stella',ev:'voicenote',name:'Sean & Stella',on:()=>dvL('instella')||dvL('striketwo')||dvL('farewell')},
 hasan:{a:'hasan',b:'darren',ev:'inside',name:'Hasan & Darren',on:()=>dvL('stepeleven')||dvL('darren')==='shake'}};
/* a couple counts when they're together, both alive, and this is the full game */
function loveOn(k){const l=LOVE[k];if(!l||!fullEd()||!K[l.a]||!K[l.b])return false;if(D&&D.dead&&(D.dead[l.a]||D.dead[l.b]))return false;if((window.EDITION_CUT||[]).includes(l.b))return false;return !!l.on()}
const lovers=()=>Object.keys(LOVE).filter(loveOn);
function loveJoin(k){const l=LOVE[k],c=crew();c.allies=c.allies||{};c.allies[l.a]=1;c.allies[l.b]=1;c.ev=c.ev||{};c.ev[l.ev]=1;c.love=c.love||{};c.love[k]=cal();save&&save()}
{const _ce=crewEvidence;crewEvidence=function(){const c=crew(),e=c.ev||{};return _ce()+(e.sketchbook?1:0)+(e.voicenote?1:0)+(e.inside?1:0)}}

/* ---------------- COREY & ABBY: THE MARGINS ---------------- */
spot({mis:'crew',room:'walkway',period:[2,4],x:150,y:148,label:'Abby is drawing on the Trailer steps',short:'♥',
 cond:()=>!D.weekend&&loveOn('corey')&&!(crew().ev||{}).sketchbook&&cal()<12,run:async()=>{
 scene('walkway',{you:[-14,1,{y:156}],abby:[140,1,{y:150,pose:'sit',hold:'paper'}],corey:[162,-1,{y:150,pose:'sit',ex:'happy'}]},true);
 await walk('you',108,80);face('you',1);
 await N('Abby is on the Trailer steps with her sketchbook on her knees. Corey is next to her, looking at absolutely anything except her.');
 await say('corey','She’s drawn the view out of the Trailer window every Period 3 since seventh grade. Every single one. I counted.','happy');
 await say('abby','He counted. That’s not weird at all.','smirk');
 await say('abby','(flipping pages) The walkway. The walkway in the rain. The walkway and the back of Corey’s head, because he sits in front of the window and won’t MOVE.','happy');
 await say('corey','…There’s a lot of the back of my head in here.','shock');
 await say('abby','It’s a good head.','happy');A.corey.ex='happy';
 await N('Then she goes quiet and flips to the back. The pages are dated. Fridays. Every Friday for two years, the same drawing: 3:20, the walkway, Coach, carrying black bin bags towards the old boiler hatch.');
 await say('abby','I thought it was rubbish. Then I counted the bags. Then I counted the kids who stopped coming to Period 3.','sad');
 await say('abby','Nineteen bags. Nineteen kids.','sad');
 cue('tension',true);SFX.whistle?SFX.whistle():SFX.click&&SFX.click();
 put('coach',334,-1,{y:146,ex:'cold'});await walk('coach',210,70);
 await say('coach','Art homework? I LOVE art. Hand it over, sweetheart.','smirk');
 const c=await choose(['Corey. Step in.','Grab the book and RUN.','Let him look. Bluff it.'],'COACH WANTS THE SKETCHBOOK');
 if(c===0){
  pose('corey',null);await walk('corey',186,60);face('corey',1);
  await say('corey','No.','angry');
  await N('Corey has never said no to an adult in his life. You can tell. His voice cracks right in the middle of the word.');
  pose('coach','grab');shake(.4);
  const ok=await mash('PULL COREY BACK',{need:22,time:4,info:'Coach has him by the collar. Grab Corey with Abby and PULL!'});
  pose('coach',null);
  if(ok){await N('You and Abby pull. Corey comes free. His collar doesn’t. Coach looks at the rag in his fist, then at the three of you, and blows his whistle very softly, once.');
   await say('coach','Friday, Corey.','evil');await walk('coach',340,60);remove('coach');
   await walk('abby',176,60);A.abby.ex='happy';
   await say('abby','(kissing him on the cheek, fast, like it’s nothing) Since seventh grade, Corey. You absolute idiot.','happy');
   A.corey.ex='shock';await N('Corey doesn’t say anything for the rest of lunch. He doesn’t need to. His ears say it.')}
  else{SFX.smack&&SFX.smack();shake(.8);stain('corey','blood',10);A.corey.ex='hurt';pose('corey','lie');
   await N('Coach puts Corey into the Trailer wall. Once. Almost gently. By the time Corey hits the floor, Abby has the sketchbook down the front of her hoodie.');
   await walk('coach',340,60);remove('coach');pose('corey','sit');
   await say('corey','(nose bleeding, grinning up at her) Worth it.','hurt');
   await say('abby','(kneeling, holding his face in both hands) Never do that again. …Thank you.','cry');crew().coreyHurt=1}}
 else if(c===1){
  const ok=await vgRace('coach');
  if(ok)await N('You hit the walkway at a sprint with nineteen Fridays under your arm. Coach doesn’t chase. Coach doesn’t need to. He knows where you sit.');
  else{await N('Coach has your hood in one fist before the end of the walkway. He takes the book and opens it. Then Abby walks up and takes it straight back out of his hand, and he lets her, because the whole walkway is filming.');
   await say('abby','(to Coach, very calm) It’s mine. My dad bought it.','cold')}
  remove('coach')}
 else{
  await N('Abby holds it up, open. Page after page of the walkway. And the back of Corey’s head. Fourteen pages of the back of Corey’s head.');
  await say('coach','…Is that the back of Corey’s head? All of these?','shock');
  await say('coach','(laughing all the way back to the gym) Get a room, Trailer kids. Get a ROOM.','laugh');
  await walk('coach',340,70);remove('coach');A.corey.ex='shock';
  await say('corey','(dying inside) I want to go into the sea.','sad');
  await say('abby','I said it was a good head.','smirk')}
 loveJoin('corey');cue('romance',true);
 await say('corey','Friday week. Whatever you’re doing. We’re in. Both of us.','cold');
 toast('🎁 EVIDENCE: Abby’s sketchbook. Nineteen Fridays. Corey & Abby join the crew.');
 return 'stay'}});

/* ---------------- SEAN & STELLA: FORTY-ONE ---------------- */
spot({mis:'crew',room:'field',period:[2,4],x:150,y:150,label:'Sean and Stella are sharing earbuds',short:'♥',
 cond:()=>!D.weekend&&loveOn('sean')&&!(crew().ev||{}).voicenote&&cal()<12,run:async()=>{
 scene('field',{you:[-14,1,{y:156}],sean:[140,1,{y:152,pose:'sit',hold:'phone'}],stella:[160,-1,{y:152,pose:'sit',ex:'happy'}]},true);
 await walk('you',108,80);face('you',1);
 await N('Sean and Stella are lying in the grass with one pair of earbuds between them. Sean’s phone is on his chest, playing voice notes.');
 await say('stella','He records me one every hour. For Portland. So when I’m there I can play Highgate at the right time of day.','happy');
 await say('sean','Ten a.m. is the bell and Kenneth sneezing. Eleven is Pat yelling about stew. It’s a whole system.','happy');
 await say('stella','It’s the most romantic thing anybody has ever done for me and it’s mostly Pat.','laugh');
 await N('Sean plays this morning’s. His own voice, whispering: “Library, ten fifteen. It smells like old crayons.” And behind him, quieter, on a phone, a voice everybody in this school knows.');
 SFX.sting&&SFX.sting();cue('tension',true);
 await N('Cheerful as a birthday: “Two more volunteers before the inspectors. The little one with the hair. And the new girl. The one who’s leaving. Nobody looks for a girl who’s leaving.”');
 A.stella.ex='scared';A.sean.ex='shock';pose('stella',null);pose('sean',null);
 await say('stella','(very quietly) …I’m the new girl.','scared');
 SFX.honk?SFX.honk():SFX.click&&SFX.click();
 put('kim',334,-1,{y:150,ex:'happy'});await walk('kim',230,70);
 await say('kim','Stella! THERE you are! Magic club needs a volunteer, and you, young lady, have a GIFT.','happy');
 const c=await choose(['Get Stella off the field. Now.','Play the note. Out loud. Full volume.','Look at Sean.'],'MR. KIM WANTS A VOLUNTEER');
 if(c===0){
  const ok=await vgRace('kim');
  if(ok)await N('Over the fence, Stella first, Sean behind, all the way to the bus loop. When you look back Mr. Kim is still standing in the middle of the field. Waving.');
  else{await N('A white cotton glove closes on Stella’s wrist. Very soft. Very strong.');
   const p=await mash('PULL HER BACK',{need:24,time:4,info:'He has her wrist. Pull her back!'});
   if(p)await N('She comes loose so fast all three of you fall over. Mr. Kim looks at his empty glove, sighs, and honks his own nose. “Another time.”');
   else{await walk('kim',340,50);await walk('stella',340,50);remove('kim');remove('stella');
    await N('He walks her towards the Main Hall, chatting about rabbits. Sean runs after them and the doors close in his face.');
    await N('Stella comes back at the end of lunch with a red nose painted on. She doesn’t remember where she was. Sean scrubs it off with his sleeve until her face is pink, and she lets him.');
    crew().stellaTaken=1}}
  remove('kim')}
 else if(c===1){
  await N('You turn it all the way up. Every kid on the field hears it. “The one who’s leaving. Nobody looks for a girl who’s leaving.” Forty heads turn to Mr. Kim.');
  await N('Mr. Kim’s smile doesn’t move a millimetre.');
  await say('kim','Ha! Kids and their phones. Another time, Stella.','happy');
  await walk('kim',340,60);remove('kim');crew().kimWarned=1}
 else{
  await walk('sean',200,60);face('sean',1);
  await say('sean','She’s not volunteering.','angry');
  await N('Sean has never practiced anything in his life. Not a goodbye, not a speech. He stands in Mr. Kim’s way, shaking, and doesn’t move.');
  await say('kim','(bending down, nose to nose) Brave boy. Brave boys volunteer TOO.','evil');
  await N('Mr. Kim honks his nose, right in Sean’s face, and walks away whistling.');
  await walk('kim',340,60);remove('kim');
  await walk('stella',186,80);A.stella.ex='happy';
  await say('stella','(grabbing his face and kissing him, in front of the whole field) You’re an idiot. I’m keeping you.','happy')}
 loveJoin('sean');cue('romance',true);
 if(A.sean)await say('sean','(holding her hand like it might leave) Whatever Friday week is, we’re in. Nobody’s making her a volunteer.','cold');
 toast('🎁 EVIDENCE: Sean’s voice note. Mr. Kim, choosing. Sean & Stella join the crew.');
 return 'stay'}});

/* ---------------- HASAN & DARREN: STEP TEN POINT FIVE ---------------- */
spot({mis:'crew',room:'library',period:[2,4],x:160,y:150,label:'Darren has a new laminated list',short:'♥',
 cond:()=>!D.weekend&&loveOn('hasan')&&!(crew().ev||{}).inside&&cal()<12,run:async()=>{
 scene('library',{you:[-14,1,{y:156}],hasan:[140,1,{y:150,ex:'scared'}],darren:[162,-1,{y:150,hold:'paper',ex:'happy'}]},true);
 await walk('you',108,80);face('you',1);
 await say('darren','(holding up a laminated sheet) Step ten was meet the family. Done. His mum hugged me for nine seconds. I timed it.','happy');
 await say('hasan','She hasn’t said ONE word to me about it. Not one. But she hugged him for nine seconds.','scared');
 await say('darren','So. Step ten point five. You meet MY family. Specifically my mother. Specifically: she’s coming here. Friday week. With a clipboard.','smirk');
 await say('hasan','…Your mum’s a SCHOOL INSPECTOR?','shock');
 await say('darren','Lead inspector. She’s read every report this school has sent since 1987. She says the numbers don’t add up. She says it at dinner. Every dinner.','cold');
 await N('Darren turns the laminated sheet over. On the back, in his tidy capitals: STEP THIRTEEN: GET HER THE TRUTH. And under that, a tiny heart, crossed out, and drawn again.');
 cue('tension',true);
 put('shermian',334,-1,{y:150,ex:'smirk'});await walk('shermian',212,60);
 await say('shermian','Did I hear the word INSPECTOR, boys? How exciting. Darren, is it? I would LOVE to meet your mother.','smirk');
 const c=await choose(['Hasan. Lie.','Darren. Say it with your chest.','Knock the shelf over.'],'MS. SHERMAN HEARD');
 if(c===0){
  await say('hasan','His mum’s a… dentist.','scared');
  await say('shermian','A dentist. Lovely. I have lovely teeth.','evil');
  await N('She smiles to show you. All of them. Then she walks away, and she doesn’t believe a word, and Hasan sits down on the floor between the shelves with his head between his knees.');
  await walk('shermian',340,60);remove('shermian');
  await walk('darren',146,50);await say('darren','(sitting down next to him, shoulder to shoulder) Step eleven still counts. You were brave for nine seconds. I timed it.','happy');
  crew().sherKnows=1}
 else if(c===1){
  await say('darren','My mum’s the lead inspector, miss. She’ll be in the hall on Friday week, front row. She reads everything. She’ll read you.','cold');
  await N('For one second, Ms. Sherman’s smile switches off. Like a light.');
  await say('shermian','Then I’ll make sure I look my best.','smirk');
  await walk('shermian',340,60);remove('shermian');
  A.hasan.ex='shock';await say('hasan','(staring at Darren) That was the hottest thing I’ve ever seen and I think we’re going to die.','shock');
  crew().sherKnows=1;crew().darrenBold=1}
 else{
  const ok=await vgThrow('KNOCK THE SHELF');SFX.thud&&SFX.thud();shake(.6);
  if(ok)await N('Biographies everywhere. Ms. Sherman has to step over Winston Churchill. By the time she looks up, the boys are gone. So are you.');
  else await N('You miss the shelf. You hit the globe. The globe hits Mrs. Byte. In the chaos the boys slip out anyway, which is honestly the plan working.');
  remove('shermian')}
 loveJoin('hasan');cue('romance',true);
 if(A.hasan)await say('hasan','Step thirteen. We’re in. He laminated it, so it’s legally binding.','happy');
 toast('🎁 EVIDENCE: someone on the inside. Darren’s mum leads the inspection. Hasan & Darren join the crew.');
 return 'stay'}});

/* the objective line points at a couple's scene when the main story is waiting */
{const _sn=storyNow;storyNow=function(){const s=_sn();if(!s||s.i>=98||!D||D.weekend)return s;
 const ev=crew().ev||{};
 const next=[['corey','sketchbook','Corey & Abby','Abby has been drawing something on the Trailer steps. Walkway, break or lunch.'],
  ['sean','voicenote','Sean & Stella','Sean recorded something he shouldn’t have. Playing Field, break or lunch.'],
  ['hasan','inside','Hasan & Darren','Darren has a new laminated list. Library, break or lunch.']].find(([k,e])=>!ev[e]&&loveOn(k));
 if(next&&(/crew is meeting|Everything’s ready/.test(s.goal||'')))return{i:s.i,t:next[2],goal:next[3]};
 return s}}

/* bolt cutters, gripped */
{const _dh=drawHeld;drawHeld=function(it,x,y,d){
 if(it==='cutters'){R(x-1,y-2,2,10,'#c03030');R(x+1,y-2,2,10,'#a02828');R(x-1,y-8,2,6,'#7a7a82');R(x+1,y-8,2,6,'#9a9aa2');R(x-1,y-10,4,2,'#5a5a62');return}
 return _dh(it,x,y,d)}}
