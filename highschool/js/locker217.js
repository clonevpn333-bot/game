'use strict';
/* =====================================================================
   HIGHSCHOOL — LOCKER 217  (a wild secret, grown out of the 1987 lore)
   Aidan keeps saying locker 217 is very cold. It is. The combination is
   the date: 13-3-87 (scratched in a stall in the boys' toilets, or
   worked out from the Archive). Open it and you're in the main corridor
   on Friday 13 March 1987 at 3:05 PM, ten minutes before the boiler.
   Every action costs minutes. You can't save everyone. You can change
   something, and the present remembers:
   • give Ollie his library book → a grown man called Oliver Finch is
     waiting at the bus loop one day, and he remembers you
   • stop young Miss Sherman leaving them → present-day Ms. Sherman
     finds you in the hall and says the thing she's never said
   • still be there at 3:15 → you're in the netball photo now
   ===================================================================== */
K.ollie87=Object.assign({},K.ollie,{id:'ollie87',ghost:0,n:'Ollie'});
K.y87a=Object.assign({},K.ghost1||K.kid1,{id:'y87a',ghost:0,n:'Year 7'});
K.y87b=Object.assign({},K.ghost2||K.kid3,{id:'y87b',ghost:0,n:'Year 7'});
K.y87c=Object.assign({},K.ghost3||K.kid2,{id:'y87c',ghost:0,n:'Boy with a bowl cut',hs:'bowl'});
K.sher87=Object.assign({},K.shermian,{id:'sher87',n:'Miss Sherman',hs:'perm',top:'#c86aa0',old:0});
K.oliver=Object.assign({},K.ollie,{id:'oliver',ghost:0,n:'Oliver Finch',adult:1,h:0,hair:'#7a6a5a',top:'#5a6a5a',tie:0,coat:1});
DEATHS.class87={name:'Class of ’87',desc:'3:15. The boiler. They put up a photo afterwards. You’re in it now: back row, end, half out of frame.',hint:'Locker 217. Every minute counts. Get out before 3:15.'};
const Y87={on:false,min:5,log:[]};
function y87Dress(){prop({t:'disco',x:15,y:52,layer:-60});prop({t:'disco',x:248,y:52,layer:-60});prop({t:'clock87',x:290,y:26,layer:-60});document.body.classList.add('y87')}
{const st=document.createElement('style');st.textContent='body.y87 #hud,body.y87 #hudbox,body.y87 .hud{visibility:hidden}';document.head.appendChild(st)}
{const _dp=drawProp;drawProp=function(p){const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='frost'){g.globalAlpha=.55+Math.sin(T*2)*.1;R(x-7,y-30,14,30,'#cfe6f4');for(let i=0;i<8;i++)R(x-6+(i*5)%12,y-28+((i*7)%26),2,1,'#ffffff');g.globalAlpha=1;pxc('217',x,y-38,'#9ac8e8');return}
 if(p.t==='disco'){R(x-11,y-22,22,36,'#2a1040');R(x-10,y-21,20,34,'#5a2a8a');for(let i=0;i<5;i++)R(x-8+i*4,y-11+(i%2)*3,2,2,['#ff6ad0','#6ae8ff','#ffe86a'][i%3]);pxc('DISCO',x,y-2,'#ffe86a');pxc('FRI 13',x,y+5,'#ff9ad8');return}
 if(p.t==='clock87'){R(x-7,y-7,14,14,'#3a2a1a');R(x-6,y-6,12,12,'#f4ecd8');R(x,y-5,1,5,'#1a1a1a');R(x,y,4,1,'#1a1a1a');return}
 if(p.t==='boiler87'){R(x-22,y-38,44,10,'#2a1a10');pxc('BOILER ROOM',x,y-36,'#e8c890');pxc('DETENTION',x,y-26,'#c86a4a');return}
 return _dp(p)}}
/* the clue in the stall */
spot({room:'toilets',period:[0,2,4],x:150,y:140,label:'Read the scratches on the stall door',short:'?',cond:()=>!D.weekend&&!P.f87combo,run:async()=>{
 pose('you','reach');await wait(250);pose('you',null);
 await N('Scratched deep into the paint, the oldest thing on the door: 13 · 3 · 87. Under it, in a different hand: DON’T OPEN 217. Under THAT, in pencil, newer: “or do lol”.');
 (P.f=P.f||{}).f87=1;P.f87combo=1;save&&save();return 'stay'}});
/* the locker */
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);try{if(room==='corridor'&&!TEST&&!Y87.on)prop({t:'frost',x:18,y:132,layer:-70})}catch(e){}return r}}
spot({room:'corridor',period:[0,2,4],x:18,y:140,label:'Locker 217 (it’s frosted over)',short:'217',cond:()=>!D.weekend&&!D.f.l217,run:async()=>{
 const knows=P.f87combo||(P.lore&&(P.lore.gazette||P.lore.again));
 await walk('you',26,60);pose('you','reach');await N('The metal is so cold it burns. Frost grows back over your handprint while you watch. There’s a combination dial.');
 if(!knows){pose('you',null);await N('You try some numbers. Nothing. Somebody, somewhere in this school, wrote the combination down.');return 'stay'}
 await N('13. 3. 87.');const ok=await vgLock();pose('you',null);if(!ok){await N('The dial sticks. The frost creeps up your sleeve. Not today.');return 'stay'}
 D.f.l217=1;return y87Go()}});
/* ---------------- 1987 ---------------- */
async function y87Go(){
 SFX.whoosh&&SFX.whoosh();await tw(fxState,{dark:1},500);
 Y87.on=true;Y87.min=5;Y87.sherGone=false;Y87.ollieOK=false;Y87.sherStay=false;Y87.down=false;
 scene('corridor',{you:[30,1,{y:154}],ollie87:[150,1,{y:146,ex:'scared'}],y87a:[176,1,{y:146}],y87b:[198,1,{y:148}],y87c:[222,-1,{y:146,ex:'cold'}],sher87:[262,-1,{y:146,hold:'mug',ex:'cold'}]},true);
 for(const id in A)if(!['you','ollie87','y87a','y87b','y87c','sher87'].includes(id))remove(id);
 prop({t:'boiler87',x:290,y:112,layer:-60});y87Dress();
 fxState.tint='#8a6030';fxState.tintA=.32;cue('sad',true);await tw(fxState,{dark:0},600);
 await N('The corridor, but wrong. Brown carpet tiles. A poster for a disco. A clock over the stairs door that says five past three. Friday. Somebody’s Walkman is playing very quietly.');
 await say('sher87','(young, tired, a perm) Downstairs, all four of you. Boiler room. My office is being painted and I am NOT giving up my Friday. Wait for me. I’m getting a coffee.','cold');
 await walk('sher87',-30,60);remove('sher87');Y87.sherGone=true;Y87.min=6;
 while(Y87.min<15){
  const left=15-Y87.min;
  const opts=[
   {t:'Talk to Ollie. (1 min)',k:'ollie'},
   {t:'Give Ollie “How to Be Brave”. (1 min)',k:'book',dis:!(P.coll&&P.coll.overdue)||Y87.ollieOK,why:'you don’t have it'},
   {t:'Talk to the boy with the bowl cut. (1 min)',k:'bowl'},
   {t:'Go after Miss Sherman. (2 min)',k:'sher',dis:Y87.sherStay},
   {t:'Pull the fire alarm. (1 min)',k:'alarm'},
   {t:'Go down to the boiler room. (2 min)',k:'down'},
   {t:'Back through locker 217. Now.',k:'out'}];
  const c=await choose(opts.map(o=>({t:o.t,dis:o.dis,why:o.why})),'3:'+String(Y87.min).padStart(2,'0')+' PM. '+left+' minute'+(left===1?'':'s')+' left.');const k=opts[c].k;
  if(k==='out')return y87Out();
  if(k==='ollie'){Y87.min+=1;face('ollie87','you');await say('ollie87','(looking at you, then through you) Are you new? You’re dressed weird. Miss Sherman says I have to bring my library book to detention. I lost it. I lose everything.','scared')}
  if(k==='book'){Y87.min+=1;hold('you','book');await walk('you',134,90);face('you','ollie87');hold('you',null);hold('ollie87','book');Y87.ollieOK=true;
   await say('ollie87','(opening it) “How to Be Brave”. How did you— (reading the first page) “Rule 1. Tell someone.”','shock');
   await say('ollie87','…I’m going to tell someone. About the boiler. It’s been making the noise all week.','scared');await walk('ollie87',-30,120);remove('ollie87')}
  if(k==='bowl'){Y87.min+=1;await walk('you',206,90);face('y87c','you');await say('y87c','(the only one who looks right at you) You’re not from today. Nobody’s from today. It’s always going to be today now.','cold');await N('He goes back to staring at the stairs door. He has a bowl cut. You’ve seen his face before. In a photo in the trophy cabinet.')}
  if(k==='alarm'){Y87.min+=1;await walk('you',40,110);pose('you','reach');SFX.bell&&SFX.bell();shake(.4);pose('you',null);
   if(!Y87.sherStay){put('sher87',-14,1,{y:146,ex:'angry'});await walk('sher87',90,140);await say('sher87','It’s a DRILL. It’s ALWAYS a drill. Downstairs, the lot of you, NOW, where it’s quiet.','yell');await walk('sher87',-30,140);remove('sher87');Y87.min+=2;
    await N('It made it worse. They go down early. The stairs door bangs shut behind them.');for(const id of['y87a','y87b','y87c','ollie87'])if(A[id]){await walk(id,300,110);remove(id)}}
   else await N('The alarm rings and rings. Nobody comes. In 1987, nobody comes.')}
  if(k==='sher'){Y87.min+=2;await walk('you',-20,120);scene('staffroom',{you:[40,1,{y:154}],sher87:[180,-1,{y:146,hold:'mug',pose:'drink'}]},true);fxState.tint='#8a6030';fxState.tintA=.32;
   await N('The staff room. 1987. A kettle the size of a fire hydrant. Miss Sherman, alone, holding a mug, staring at nothing.');
   const s=await choose(['“Don’t leave them down there. Please. Go back.”','Knock the mug out of her hand.','Say nothing. Watch her.']);
   if(s===0){await say('sher87','(slowly) …Who are you? Whose kid are you?','shock');await say('you','Go back. Right now. The boiler.');await say('sher87','(putting the mug down, very pale) …I hear it too. I’ve heard it all week.','scared');Y87.sherStay=true;await walk('sher87',-30,150);remove('sher87')}
   else if(s===1){SFX.glass&&SFX.glass();await say('sher87','My MUG. That was my MOTHER’S mug. Get OUT. Get out of my staff room!','yell');Y87.min+=1}
   else await N('She drinks the coffee in six slow sips. You watch the clock. She watches the clock. Neither of you moves.');
   scene('corridor',{you:[60,1,{y:154}]},true);for(const id in A)if(id!=='you')remove(id);fxState.tint='#8a6030';fxState.tintA=.32;prop({t:'boiler87',x:290,y:112,layer:-60});y87Dress();
   await N('Back in the corridor. The four of them are gone. The stairs door is swinging.')}
  if(k==='down'){Y87.min+=2;Y87.down=true;await walk('you',300,110);await tw(fxState,{dark:.6},400);await N('The boiler room. It’s so hot the air bends. The boiler is ticking like it’s counting. The kids are sitting in a row on the coal chute steps, swinging their legs.');
   if(Y87.sherStay){put('sher87',330,-1,{y:146,ex:'scared'});await walk('sher87',250,160);await say('sher87','Up. UP. Everyone up the chute, out, NOW—','scream');await N('She gets them moving. She’s pushing the last one up when the clock over the door says 3:14.');Y87.min=Math.max(Y87.min,14)}
   else await N('The boy with the bowl cut looks at you and shakes his head. Go, he mouths. Go.');
   await tw(fxState,{dark:0},300)}
 }
 /* 3:15 */
 shake(2);SFX.crunch&&SFX.crunch();fxState.flash=1;fxState.flashC='#fff';await wait(600);
 Y87.on=false;fxState.tint=null;fxState.tintA=0;document.body.classList.remove('y87');await die('class87')}
async function y87Out(){
 await walk('you',18,140);SFX.whoosh&&SFX.whoosh();await tw(fxState,{dark:1},400);
 Y87.on=false;fxState.tint=null;fxState.tintA=0;document.body.classList.remove('y87');
 if(Y87.ollieOK)P.ollie87=1;if(Y87.sherStay)P.sher87=1;save&&save();
 buildRoom('corridor');D.room='corridor';put('you',22,1,{y:154});await tw(fxState,{dark:0},500);
 await N('You fall out of locker 217 onto the floor of the main corridor. It’s now. It’s loud. Frost on your eyelashes. Your phone says you’ve been gone four seconds.');
 if(Y87.ollieOK||Y87.sherStay)await N('Something feels different. Like a song you know with one note changed.');
 return 'stay'}
/* the clock on screen */
{const _dr=draw;draw=function(){_dr();if(!Y87.on||TEST)return;g.setTransform(1,0,0,1,0,0);const m=Math.min(15,Y87.min),red=m>=12;
 R(6,10,80,20,'#000000c8');R(6,10,80,1,red?'#ff6a5a':'#e8c890');pxc('13 MARCH 1987',46,13,'#e8c890');pxc('3:'+String(m).padStart(2,'0')+' PM',46,21,red?(Math.sin(T*8)>0?'#ff6a5a':'#ffd0c8'):'#ffffff')}}
/* ---------------- what the present remembers ---------------- */
hook({mis:null,period:7,room:'bus',who:'auto',cond:()=>!TEST&&P.ollie87&&!P.oliverMet&&!D.weekend,run:async()=>{
 P.oliverMet=1;save&&save();put('oliver',334,-1,{y:146});await walk('oliver',A.you?A.you.x+24:200,70);face('oliver','you');
 await say('oliver','(a man in his forties, holding a library book in a plastic sleeve) Sorry. This is going to sound mad. Were you ever… no. You can’t have been. You’d be my age.','shock');
 await say('oliver','When I was eleven, a kid in a hoodie gave me my library book back, on a Friday, and I went and told the caretaker about the boiler. I never saw that kid again.','sad');
 await say('oliver','I’m Oliver. Finch. My daughter starts here next year. (holding up the book) I still read it. Rule one.','happy');
 const cr=crew();cr.ev=cr.ev||{};cr.ev.finch=1;save&&save();toast('🎁 EVIDENCE: Oliver Finch remembers the boiler. The file gets thicker.');
 await walk('oliver',-30,70);remove('oliver');return 'stay'}});
hook({mis:null,period:[0,2,4],room:'corridor',who:'auto',cond:()=>!TEST&&P.sher87&&!P.sherRemembers&&!D.weekend&&K.shermian&&!D.dead.shermian,run:async()=>{
 P.sherRemembers=1;save&&save();put('shermian',334,-1,{y:146,ex:'cold'});await walk('shermian',A.you?A.you.x+22:200,60);face('shermian','you');
 await say('shermian','(stopping dead, staring) …You.','shock');
 await say('shermian','You were in the staff room. In 1987. You told me to go back. I’ve seen your face every night for thirty-nine years.','scared');
 await say('shermian','I went back. I got three of them up the chute. Not the fourth. Never the fourth.','cry');
 await say('shermian','(composing herself, all at once, terribly) Detention. Friday. My room. …No. No, I’m not going to say that to you. Go. Go to class.','cold');
 const cr=crew();cr.ev=cr.ev||{};cr.ev.sher87=1;save&&save();toast('🎁 EVIDENCE: Ms. Sherman remembers 1987. The file gets thicker.');
 await walk('shermian',-30,60);remove('shermian');return 'stay'}});
{const _ce=crewEvidence;crewEvidence=function(){const c=crew();return _ce()+(c.ev&&c.ev.finch?1:0)+(c.ev&&c.ev.sher87?1:0)}}
