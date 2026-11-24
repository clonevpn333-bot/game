'use strict';
/* =====================================================================
   HIGHSCHOOL — SIDE HUSTLES
   Three new gigs every school day, texted to you before school. Made
   from parts, so they're different every day:
     DELIVERY  grab something cursed in one room, hand it to someone
     REVENGE   shove somebody for somebody else's grudge
     DEBT      fight somebody until they pay up
     PRANK     plant something in a teacher's room
   They pay cash, they move your reputation, and they're in ⚡ Do Now.
   Same day replayed (after dying) = same gigs.
   ===================================================================== */
mission('gigs',{name:'Side Hustles',icon:'💸',who:[],goal:'Do favors nobody else will do. Get paid.',
 blurb:'Every morning your phone buzzes with three gigs from kids who can’t do it themselves. Deliveries nobody should open, grudges, debts, and pranks on teachers. Cash on completion. No refunds.',
 parts:['Do a gig'],tips:['Check ⚡ Do Now (Q). Three new gigs every school day.']});
const GIG_KIDS=['arjun','hasan','omer','nivaan','kenneth','paul','alex','dheva','jacob','marcus','angelo','david','mia','kayden','tez','brayden','jaxon','kaylee','brandon','sean','corey','jade','ollie'];
const GIG_MEET=[['canteen',[2,4]],['field',[2,4]],['library',[2,4]],['gym',[2,4]],['courtyard',[2,4]],['toilets',[0,2,4]],['corridor',[0,2,4]],['hallb',[0,2,4]]];
const GIG_FROM=[['foodtech',150],['art',120],['science',200],['chem',230],['music',110],['drama',200],['woodwork',90],['ict',160],['nurse',120],['weightroom',170],['pool',40],['office',200],['library',60]];
const GIG_ITEMS=[['a sealed envelope that is definitely not a love letter','paper'],['a frog in a Pringles can','can'],['a whole rotisserie chicken','bag'],['a single AirPod in a ziplock','phone'],['a mixtape called SONGS TO CRY TO VOL. 9','box'],['forty loose Skittles in a sock','cloth'],['a burner phone','phone'],['a jar of something that’s still moving','jar'],['a fake doctor’s note signed “Dr. Doctor”','paper'],['Mr. Voss’s spare dentures','box'],['a bag of “oregano” (it’s literally oregano, it’s for pizza)','bag'],['a lock of hair in an envelope','paper'],['a hamster named Lawsuit','box'],['a jar of mayo with a name written on it','jar'],['a single, warm sock','cloth'],['a signed photo of Coach (he signed it himself, to himself)','paper']];
const GIG_THX=['(snatching it) You didn’t open it, right? RIGHT?','Finally. Tell them we’re even. Actually don’t tell them anything.','(sniffing it) Yeah. That’s the stuff.','Why are you giving this to ME? …Oh. OH. Okay. Thank you. Walk away.','(hiding it in their hoodie) You never saw me. I never saw you. We never saw this.','Is it still warm? Why is it still warm? Don’t answer that.'];
const GIG_REASONS=['told everyone I cried at Toy Story 4','ate my lunch and LEFT THE WRAPPER in my bag','keeps saying “bruh” at me in a specific way','hit reply-all to the whole grade with my essay','called my mom “pretty fine” on a livestream','sneezed in my Takis and said “that’s seasoning”','posted my baby photo with the caption “before the surgery”','sat in my seat AND my vibe','told Ms. Sherman where I was hiding','said my haircut looks like a lamp'];
const GIG_REACT=['WHAT DID I DO. …Okay, I know what I did.','Tell them I’m not even mad. I’m a LITTLE mad.','(from the floor) This is about the Takis, isn’t it.','Who sent you? WHO SENT YOU?','My dad’s a lawyer. He’s not. But he could be.'];
const GIG_DEBTS=['five bucks for a bag of Takis from September','a PS5 controller he “borrowed”','twenty bucks from a bet on whether Coach has a neck','eight dollars and an apology','the money from the fake raffle'];
const GIG_PRANKS=[['history',60,'a dead fish','Mr. Grieve’s desk drawer','bag'],['gym',50,'a whoopee cushion','Coach’s office chair','bag'],['library',70,'a glitter bomb','Ms. Balduf’s returns cart','box'],['chem',60,'a live cricket in a matchbox','Mr. Voss’s beaker rack','box'],['english',60,'a phone set to ring every ten minutes','the bottom of the English teacher’s desk','phone'],['maths',60,'a jar of mayo','the math teacher’s mug','jar'],['science',70,'a fake severed hand','the science teacher’s coat pocket','cloth']];
function gRnd(n){return hsh(cal()*97+n*13.7)}
function gPick(a,n){return a[Math.floor(gRnd(n)*a.length)%a.length]}
function gigsToday(){
 if(!D||D.weekend)return[];
 if(D.f.gigs&&D.f.gigsDay===cal())return D.f.gigs;
 const kids=GIG_KIDS.filter(k=>K[k]&&!D.dead[k]&&!(window.EDITION_CUT||[]).includes(k));
 const out=[],kinds=['deliver','shove','fight','plant'].map((k,j)=>[k,gRnd(j*7+1)]).sort((a,b)=>a[1]-b[1]).map(x=>x[0]);
 const pool=kids.map((k,j)=>[k,gRnd(j*3+40)]).sort((a,b)=>a[1]-b[1]).map(x=>x[0]);
 for(let i=0;i<3;i++){
  const kind=kinds[i];
  const client=pool[i],tgt=pool[(i+3)%pool.length];
  const [room,per]=gPick(GIG_MEET,i*5+3);
  const g={i,kind,client,tgt,room,per,st:'get',pay:4+Math.floor(gRnd(i*3+9)*7)};
  if(kind==='deliver'){const [it,sh]=gPick(GIG_ITEMS,i*17+4),[from,fx]=gPick(GIG_FROM,i*19+6);Object.assign(g,{it,sh,from,fx});
   g.text=K[client].n+': “Get '+it+' from '+shortName(from)+' and give it to '+K[tgt].n+'. Don’t open it. Don’t ask.”';g.st='get'}
  if(kind==='shove'){g.why=gPick(GIG_REASONS,i*23+7);g.text=K[client].n+': “Shove '+K[tgt].n+' for me. They '+g.why+'.”';g.st='do'}
  if(kind==='fight'){g.debt=gPick(GIG_DEBTS,i*29+8);g.pay+=4;g.text=K[client].n+': “'+K[tgt].n+' owes me '+g.debt+'. Get it back. However.”';g.st='do'}
  if(kind==='plant'){const [to,tx,it,where,sh]=gPick(GIG_PRANKS,i*31+9),[from,fx]=gPick(GIG_FROM,i*37+10);Object.assign(g,{to,tx,it,where,sh,from,fx});
   g.text=K[client].n+': “Put '+it+' in '+where+'. Why? Because it’s funny. Get it from '+shortName(from)+'.”';g.st='get'}
  out.push(g);
 }
 D.f.gigs=out;D.f.gigsDay=cal();return out;
}
const G=i=>{const l=gigsToday();return l[i]&&l[i].st!=='paid'?l[i]:null};
function gigLabel(g){
 if(g.kind==='deliver')return g.st==='get'?'Grab '+g.it+' (gig for '+K[g.client].n+')':'Give '+K[g.tgt].n+' '+g.it;
 if(g.kind==='plant')return g.st==='get'?'Grab '+g.it+' (prank for '+K[g.client].n+')':'Put '+g.it+' in '+g.where;
 if(g.kind==='shove')return'Shove '+K[g.tgt].n+' (gig for '+K[g.client].n+')';
 return'Make '+K[g.tgt].n+' pay up (gig for '+K[g.client].n+')';
}
function gigPay(g){
 g.st='paid';D.money=(D.money||0)+g.pay;D.mp.gigs=Math.max(D.mp.gigs||0,1);P.gigs=(P.gigs||0)+1;save&&save();updateLoc();
 toast('💸 +$'+g.pay+' from '+K[g.client].n+'. ('+gigsToday().filter(x=>x.st==='paid').length+'/3 gigs today)');
 if(typeof repAdd==='function'){if(g.kind==='deliver')repAdd('liked',1);if(g.kind==='fight'||g.kind==='shove')repAdd('feared',1);if(g.kind==='plant')repAdd('legend',1);
  if(gigsToday().every(x=>x.st==='paid'))repAdd('legend',1,'three gigs in one day')}
}
for(let i=0;i<3;i++){
 const S=SPOTS.length;
 /* pick-up */
 SPOTS.push({_gig:1,mis:'gigs',short:'GRAB',sparkle:1,y:150,
  get room(){const g=G(i);return g&&g.st==='get'?g.from:null},get x(){const g=G(i);return g?g.fx:0},get label(){const g=G(i);return g?gigLabel(g):''},set label(v){},
  get jdraw(){const g=G(i);return g&&g.st==='get'?{sh:g.sh}:null},
  cond:()=>{const g=G(i);return !!(g&&g.st==='get'&&(g.kind==='deliver'||g.kind==='plant'))},
  run:async()=>{const g=G(i);if(!g||g.st!=='get'||g.fx==null||!A.you||!PERIODS[D.period])return 'stay';clearTalk();await walk('you',g.fx+(A.you.x<g.fx?-6:6),70);pose('you','reach');await wait(220);pose('you','grab');SFX.pick&&SFX.pick();
   hold('you','J:'+g.sh);await wait(380);hold('you',null);pose('you',null);g.st=g.kind==='plant'?'plant':'give';
   toast('Now: '+gigLabel(g)+' · '+shortName(g.kind==='plant'?g.to:g.room));return 'stay'}});
 /* the prank */
 SPOTS.push({_gig:1,mis:'gigs',short:'PLANT',y:150,
  get room(){const g=G(i);return g&&g.kind==='plant'&&g.st==='plant'?g.to:null},get x(){const g=G(i);return g?g.tx:0},get label(){const g=G(i);return g?gigLabel(g):''},set label(v){},
  cond:()=>{const g=G(i);return !!(g&&g.kind==='plant'&&g.st==='plant')},
  run:async()=>{const g=G(i);if(!g||g.kind!=='plant'||g.tx==null||!A.you||!PERIODS[D.period])return 'stay';clearTalk();await walk('you',g.tx+(A.you.x<g.tx?-6:6),70);hold('you','J:'+g.sh);pose('you','kneel');await wait(320);pose('you','reach');await wait(250);hold('you',null);pose('you',null);
   await N(pick(['Done. You step back and admire it. Art.','Planted. Somewhere a teacher’s day just got worse and they don’t know it yet.','It’s in. You wipe your prints off with your sleeve, like in the movies, which does nothing.']));
   gigPay(g);return 'stay'}});
 /* the person: hand-over, shove, or fight */
 HOOKS.push({_gig:1,mis:'gigs',
  get period(){const g=G(i);return g?g.per:-1},get room(){const g=G(i);return g?g.room:null},get who(){const g=G(i);return g?g.tgt:null},get label(){const g=G(i);return g?gigLabel(g):''},set label(v){},
  cond:()=>{const g=G(i);return !!(g&&!D.dead[g.tgt]&&((g.kind==='deliver'&&g.st==='give')||((g.kind==='shove'||g.kind==='fight')&&g.st==='do')))},
  run:async()=>{const g=G(i);if(!g||!A.you||!PERIODS[D.period])return 'stay';
   if(g.kind==='deliver'){await handOver(g.tgt,{sh:g.sh,thx:pick(GIG_THX)});gigPay(g);return 'stay'}
   if(g.kind==='shove'){await doShove(g.tgt,{react:pick(GIG_REACT)});gigPay(g);return 'stay'}
   const won=await doFight(g.tgt,{why:K[g.tgt].n+' owes '+K[g.client].n+' '+g.debt+'.',win:K[g.tgt].n+' hands over the cash from the floor, one bill at a time, without making eye contact.',lose:K[g.tgt].n+' is stronger than they look. A LOT stronger.'});
   if(won)gigPay(g);return 'stay'}});
}
/* gig people are where the gig says */
{const _hp=hookPresent;hookPresent=function(h,per){if(h&&h._gig)return true;return _hp(h,per)}}
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);try{if(D&&!D.weekend)for(let i=0;i<3;i++){const g=G(i);if(!g||g.room!==room||!g.per.includes(D.period)||A[g.tgt]||D.dead[g.tgt]||!K[g.tgt])continue;
 if(!((g.kind==='deliver'&&g.st==='give')||((g.kind==='shove'||g.kind==='fight')&&g.st==='do')))continue;const f=floorOf(room);put(g.tgt,70+i*70,1,{y:clamp(f[0]+10,f[0],f[1])})}}catch(e){}return r}}
/* the morning text */
ON_PERIOD.push(async(i,resume)=>{if(resume||!D||D.weekend||TEST||i!==0)return;const l=gigsToday();if(!l.length)return;setTimeout(()=>toast('📱 3 new gigs: '+l.map(g=>K[g.client].n).join(', ')+'. Q → ⚡ Do Now.'),3200)});
/* ⚡ Do Now: its own section */
{const _qn=qlNow;qlNow=function(body){
 const _ta=thingsAt;thingsAt=function(p,o){return _ta(p,o).filter(t=>t.mis!=='gigs')};
 try{_qn(body)}finally{thingsAt=_ta}
 if(!D||D.weekend)return;const l=gigsToday();if(!l.length)return;
 const anchor=body.querySelector('.qsec.later')||body.querySelector('.qsec.day');const add=e=>anchor?body.insertBefore(e,anchor):body.appendChild(e);
 add(qel('h3','qsec gig','💸 SIDE HUSTLES · $'+(D.money||0)));
 for(const g of l){const r=qel('div','qcard gig'+(g.st==='paid'?' paid':''));r.appendChild(qel('div','ic',{deliver:'📦',shove:'✋',fight:'👊',plant:'🐟'}[g.kind]));
  const m=qel('div','m');r.appendChild(m);const h=qel('h4','',g.st==='paid'?'Done':gigLabel(g));h.appendChild(chip('$'+g.pay,'go'));m.appendChild(h);
  m.appendChild(qel('div','act',g.text));
  if(g.st!=='paid'){const where=g.st==='get'?g.from:g.kind==='plant'?g.to:g.room;
   m.appendChild(qel('div','wh','📍 '+(D.room===where?'Right here':shortName(where))+(g.st==='get'?'':(g.kind==='plant'?'':' · '+g.per.map(p=>PERIODS[p].name).join(' or ')))));
   if(D.room!==where)m.appendChild(qel('div','rt','➜ '+routeText(D.room,where)))}
  add(r)}
}}
{const st=document.createElement('style');st.textContent='#quest.ql2 .qsec.gig{color:#9ad09a}#quest.ql2 .qcard.gig{border-left-color:#4ab86a}#quest.ql2 .qcard.paid{opacity:.45}';document.head.appendChild(st)}
if(typeof DAILY_F!=='undefined')DAILY_F.push('gigs','gigsDay');
