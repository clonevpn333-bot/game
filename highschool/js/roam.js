'use strict';
/* =====================================================================
   HIGHSCHOOL — WANDERING IS WORTH IT
   • Lockers: try them. Some open. Money, snacks (+1 apple), notes,
     the odd useful thing, and the odd mousetrap.
   • Teachers’ desks: in any empty classroom, go through the drawers.
     Things only the teachers know. Sometimes they come back.
   • Coins on the floor: look for the glint.
   • Eavesdrop: stand near kids who are gossiping and you’ll overhear
     something useful (who needs you, and where).
   • Vending machines: $1 for a sugar rush. +1 apple.
   Skipping class? The halls are empty. That’s the best time.
   ===================================================================== */
const rnd=(seed)=>hsh(seed*7.13+cal()*31.7+(D?D.period:0)*3.1);
const ROAMF=()=>{D.f.rm=D.f.rm||{};return D.f.rm};
if(typeof DAILY_F!=='undefined')DAILY_F.push('rm','stairCry','sugar');
function plusApple(n,why){D.apples=(D.apples||0)+(n||1);updateLoc();toast('🍎 +'+(n||1)+(why?' — '+why:''))}

/* ---------- lockers ---------- */
const LOCKER_NOTES=['A note folded into a tiny square: “if ms sherman asks, you never saw me. — T”','A list in pencil: “people who know about the boiler: me. ollie. that’s it.” It’s dated 1987.','A drawing of Mr. Voss with way too many arms. Very accurate.','A love letter to Coach. Unsigned. Lots of hearts. Lots of “sir”.','A receipt from the Sparkle Hut: one necklace, $4.99. Kayden’s handwriting on the back: “2 YEARS”.','Three pages of Wordle answers, all of them wrong, and the word TYLER written on the back.','A photo of Ms. Sherman in 1987. Twenty-three. Crying at the school gate. Exactly the same face.'];
const LOCKERS={corridor:[78,133,250],hallb:[70,130,190,250],upper:[60,117,172,228]};
for(const room in LOCKERS)for(const x of LOCKERS[room]){
 const num=(room==='upper'?300:room==='hallb'?100:200)+Math.round(x/5);
 spot({room,x,y:138,label:'Try locker '+num,short:'LOCKER',cond:()=>!ROAMF()['lk'+room+x]&&!(D.weekend),run:async()=>{
  ROAMF()['lk'+room+x]=1;
  await walk('you',x,70);A.you.back=1;pose('you','reach');SFX.locker();await wait(250);
  const locked=rnd(x+num)<.35&&!has('lockpick');
  if(locked){A.you.back=0;pose('you',null);await N(pick(['Locked. Somebody has carved “NICE TRY” into the door.','Locked. It’s humming. You don’t want it open anyway.','Locked. A note taped to it: “I KNOW IT WAS YOU, MARCUS.”']));return 'stay'}
  const r=rnd(num*3+x);A.you.back=0;pose('you',null);
  if(r<.28){const m=1+Math.floor(rnd(num)*3);D.money=(D.money||0)+m;updateLoc();await N(pick(['Loose change in a gym sock. ','A crumpled bill in a pencil case. ','Coins in a jar marked SWEAR JAR. It’s almost full. '])+'+$'+m+'.')}
  else if(r<.46){await N(pick(['A Monster. Warm. Unopened. You drink it in one go.','A family-size bag of Takis. You eat half standing up.','A Snickers that’s been in here since at least last year. Still good. Mostly.']));plusApple(1,'sugar')}
  else if(r<.58){const t=pick(LOCKER_NOTES);await N(t);if(/1987|Ms\. Sherman/.test(t))intel('lockerNote')}
  else if(r<.66){const it=pick(['tape','energy','compass']);give(it)}
  else if(r<.84){SFX.crunch();A.you.hurt=Math.max(A.you.hurt||0,1);await N(pick(['A mousetrap. On your fingers. Somebody put it there for exactly this.','A raccoon. It looks at you. You close the locker very slowly. You never open it again.','A whole wet lunch from three weeks ago. The smell gets into your clothes. You smell it for the rest of the day.']))}
  else await N(pick(['Empty except for a single shoe.','Empty. Somebody wrote “EMPTY” inside it, which feels unnecessary.','Just textbooks. Who keeps textbooks in a locker.']));
  return 'stay';
 }});
}
INTEL.lockerNote='Someone at Highgate kept notes about 1987 in their locker. Somebody else has been reading them.';

/* ---------- teachers’ desks (empty classrooms) ---------- */
const DESK={
 english:['balduf',['A stack of letters addressed to GERALD, all with the commas corrected in red.','A red pen with teeth marks all the way up it.','A class list. Three names crossed out this year. In red.'],'Ms. Balduf'],
 maths:['shermian',['Phones. A whole drawer of phones. All charged.','A seating plan with one desk drawn as a little coffin.','A gold sticker that says GOOD JOB on the front and a date on the back: 13/3/87.'],'Ms. Sherman'],
 trailer:['shermian',['A cat collar. MR BISCUITS. Still warm, somehow.','A key on a ribbon. It smells like perfume.','A photo of the Trailer in 1987, before they moved it here. Something is written on the back: “they stay where you put them.”'],'Ms. Sherman'],
 history:['grieve',['A medal in a box, polished every day by the look of it.','A letter from a hospital: “Memory clinic — appointment 3 of 6.”','A list of student names next to old army ranks. You’re a private.'],'Mr. Grieve'],
 chem:['voss',['A receipt: dry ice, twelve jars, one bone saw.','A donor card. Lots of donor cards. None of them in Mr. Voss’s name.','A photo of an old woman in a hospital bed. On the back: MAMA — 4 YEARS ON THE LIST.'],'Mr. Voss'],
 science:['loach',['A brown bottle with a skull on it. Half empty.','A yogurt. Not hers. Labelled VOSS. She’s been eating them.','Page forty-seven, torn out of forty copies of the textbook.'],'Ms. Loach'],
 ict:['byte',['A printout of a man in army uniform with a watermark on it.','Gift card receipts. Thousands of dollars of gift card receipts.','A sticky note: “Rick’s birthday — buy him a helicopter part???”'],'Mrs. Byte'],
 art:['dahl',['A sketch of Marcus, very still. Too still.','A jar of paint that is definitely not paint.','A list: things that are still. Bowl. Apple. Marcus?'],'Miss Dahl'],
 music:['fenwick',['A tuning fork with a bit of blood on the end.','Guitar strings. Lots of packets. Like he’s been waiting for someone to need them.','A setlist from a band in 1994 called FENWICK AND THE NOISE. Nobody came, by the look of it.'],'Mr. Fenwick'],
 woodwork:['oakes',['A tape measure with names on it instead of numbers.','A photo of a little girl in a wooden crib. On the back: JESS, 2004.','A brass name plate. Not finished. D-H-E-V.'],'Mr. Oakes'],
 psych:['lyle',['A pocket watch that’s always a little warm.','Case notes: “Subject AIDAN. Remembers everything. Recommend: everything.”','A drawing of an inkblot that looks exactly like you.'],'Dr. Lyle'],
 foodtech:['kettle',['A recipe for scones with a secret ingredient that is just a phone number.','A STAR BAKER sticker sheet. One star is missing. One kid is missing.','An oven thermometer that goes up to 900.'],'Mrs. Kettle'],
 drama:['pratt',['A real sword with STAGE PROP written on it in Sharpie.','A script for Macbeth with every death circled. They’re all circled.','A head. Fake. Probably. Very probably.'],'Mr. Pratt']
};
for(const room in DESK){
 const [t,finds,name]=DESK[room];
 spot({room,x:44,y:146,label:'Go through '+name+'’s desk',short:'DESK',cond:()=>!D.weekend&&!(TEACH[D.period]&&TEACH[D.period][room])&&!ROAMF()['dk'+room]&&!A[t],run:async()=>{
  ROAMF()['dk'+room]=1;
  await walk('you',44,70);pose('you','reach');SFX.locker();await wait(300);
  const f=pick(finds);await N('The top drawer. '+f);
  if(rnd(room.length*11)<.4){D.money=(D.money||0)+2;updateLoc();await N('And two dollars in a mug. Nobody’s going to miss it. Somebody is definitely going to miss it.')}
  pose('you',null);
  const late=PERIODS[D.period].lesson;
  if(rnd(room.length*5+7)<(late?.3:.18)&&!D.dead[t]){
   SFX.door();put(t,334,-1,{y:146});await walk(t,200,80);
   await say(t,'(very quietly) And what are we doing in {ME}’s desk, {PET}?','evil');
   const c=await choose(['Run.','“Looking for a pen.”']);
   if(c===0){const ok=await mash('RUN',{need:14,time:3});if(!ok){D.apples=Math.max(0,(D.apples||1)-1);updateLoc();await say(t,'(holding you by the hood) That’s an apple, {PET}. {ME} will be taking that.','evil')}else{await walk('you',-20,150);await N('You’re out of the door before '+K[t].n+' turns round. Behind you, the drawer slams. Then something else slams.')}}
   else await say(t,'(handing you a pen, not letting go of it for a second too long) Here, {PET}. Keep it. {ME} has lots of pens. {ME} has lots of everything.','smirk');
   if(A[t]){await walk(t,334,70);remove(t)}
  }
  return 'stay';
 }});
}

/* ---------- coins on the floor ---------- */
for(const room of['corridor','hallb','upper','wing_sci','wing_sports','wing_arts','canteen','field','library','stairwell','foodcourt','arcade','carpark'])for(const x of[40,170,290]){
 spot({room,x,y:160,label:'Pick up the coin on the floor',short:'COIN',sparkle:1,free:1,cond:()=>rnd(x+room.length*13)<.13&&!ROAMF()['cn'+room+x+D.period],run:async()=>{
  ROAMF()['cn'+room+x+D.period]=1;await walk('you',x,80);pose('you','kneel');await wait(200);pose('you',null);
  const m=rnd(x*3)<.15?5:1;D.money=(D.money||0)+m;updateLoc();toast(m>1?'A whole five dollar bill. On the floor. Highgate provides.':'+$1. A quarter and a sticky dime. Counts.');
  return 'stay';
 }});
}

/* ---------- vending machines ---------- */
for(const [room,x] of[['canteen',290],['hallb',300]])spot({room,x,y:146,label:'Buy something from the vending machine ($1, +1 🍎)',short:'SNACK',free:1,cond:()=>!D.weekend&&(D.money||0)>=1&&(D.f.sugar||0)<2,run:async()=>{
 await walk('you',x-6,70);pose('you','reach');SFX.thud();await wait(300);pose('you',null);
 D.money-=1;D.f.sugar=(D.f.sugar||0)+1;
 await N(pick(['A Monster. You drink it so fast your eyes water.','Cool Ranch Doritos. Breakfast of champions.','A honey bun older than you.']));
 plusApple(1,'sugar rush');return 'stay';
}});

/* ---------- eavesdropping ---------- */
const HEARD_TPL=[
 t=>'did you see '+t.who+' in the '+t.where+'? they look like they need someone',
 t=>'bro something is going on in the '+t.where+' right now',
 t=>t.who+' was asking for you. '+t.where+'. like actually asking',
 t=>'go to the '+t.where+'. trust. '+t.who+' is losing it'
];
let nearT=0;
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{
 _hu&&_hu(dt,rdt);
 if(TEST||panelMode!=='roam'||busy||!A.you||!D||D.weekend||typeof bubbles==='undefined')return;
 const b=bubbles.find(x=>A[x.id]&&A[x.id].extra&&Math.abs(A[x.id].x-A.you.x)<34);
 nearT=b?nearT+rdt:0;
 const key='hd'+D.period;const R_=ROAMF();
 if(nearT>1.2&&(R_[key]||0)<2){
  nearT=-6;R_[key]=(R_[key]||0)+1;
  const now=typeof thingsAt==='function'?thingsAt(D.period).filter(t=>t.room!==D.room):[];
  if(!now.length){toast('👂 Overheard: “'+pick(['mr voss asked me my blood type AGAIN','the trailer moved another inch','somebody saw aidan on the roof at like 6am'])+'”');return}
  const t=pick(now),d=describe(t);
  const line=pick(HEARD_TPL)({who:d.who||'somebody',where:d.where.toLowerCase()});
  toast('👂 Overheard: “'+line+'” → '+d.name+' · '+d.where);
  (R_.heard=R_.heard||[]).push(d.name+' — '+d.where);
 }
}}

/* ---------- the hint line mentions what’s around ---------- */
{const _rh=roamHint;roamHint=function(){_rh();if(!D||D.weekend)return;const h=$('hint');if(!h)return;
 const extras=Object.values(A).some(a=>a&&a.extra);
 if(extras&&!roamTarget)h.innerHTML+=' · <span style="color:#9ad09a">stand near gossip to overhear</span>';}}
