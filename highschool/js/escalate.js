'use strict';
/* =====================================================================
   HIGHSCHOOL — FOCUS & ESCALATION
   The main story leads, the tension never drops, quests pay off.
   1. THREAT rises every school day: red vignette deepens, halls go
      creepier musically, teachers STARE at you from the end of the hall.
   2. A STORY BEAT opens each school day, with a red headline.
   3. HEADLINES: ⚡ Do Now leads with the main story + 2 headliners;
      everything else folds away.
   4. PAYOFFS: finishing a quest gives an ALLY (they jump into your
      fights), a PERK (real upgrade for the two weeks) and, if a teacher
      was involved, EVIDENCE for Inspection Day.
   5. MAIN STORY CHAPTERS ARE SET PIECES: a teacher patrols with a sight
      cone, there's a mini-game at the objective, chaos, filthy teacher
      innuendo overheard, camera work, and the couples/best friend you've
      built up show up to help.
   6. BREAK-IN (week one, day five): the crew goes back in at night.
   ===================================================================== */
const SDAY=()=>{const c=cal();return c<=5?c:c>=8&&c<=12?c-2:0};            /* school day 1..10 */
const tension=()=>Math.min(1,Math.max(0,(SDAY()-1)/9));

/* ================= 1. THREAT ================= */
let REDV=null;
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{_do&&_do(...x);if(TEST||!D||D.weekend||ROOM==='titlescreen'||(P.set&&P.set.rmOff))return;const t=tension();if(t<.05)return;
 if(!REDV){REDV=document.createElement('canvas');REDV.width=W;REDV.height=H;const v=REDV.getContext('2d');const gr=v.createRadialGradient(W/2,H/2,H*.42,W/2,H/2,H*1.0);gr.addColorStop(0,'rgba(80,0,10,0)');gr.addColorStop(1,'rgba(80,0,10,1)');v.fillStyle=gr;v.fillRect(0,0,W,H)}
 g.globalAlpha=.12+.33*t+(Math.sin(T*1.1)*.04*t);g.drawImage(REDV,0,0);g.globalAlpha=1}}
if(typeof kgTrack==='function'){const _kt=kgTrack;kgTrack=function(){const t=D&&!D.weekend?tension():0;if(t>=.88&&['corridor','class','canteen','bus','field','gym','library'].includes(scoreName))return KG.creep;if(t>=.5&&['corridor','class','library'].includes(scoreName))return KG.creep;return _kt()}}
/* being watched */
const STARE={next:0,ev:null};
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(TEST||!D||D.weekend)return;const t=tension();
 if(STARE.ev){const e=STARE.ev,a=A[e.id];if(!a||busy||panelMode!=='roam'||ROOM!==D.room){if(a&&!busy)remove(e.id);STARE.ev=null;return}
  if(!e.leaving){a.dir=A.you.x>a.x?1:-1;a.ex='cold';a.pose=null;if(T>e.beat){e.beat=T+.55;try{tone(50,.09,'sine',.18)}catch(_){}}
   if(Math.abs(A.you.x-a.x)<70||T-e.t0>7){e.leaving=1;walk(e.id,a.x<160?-30:350,40).then(()=>{if(A[e.id])remove(e.id);STARE.ev=null})}}return}
 if(!STARE.next)STARE.next=T+40;
 if(T<STARE.next||busy||panelMode!=='roam'||!A.you||(typeof PAT!=='undefined'&&PAT)||(typeof RT!=='undefined'&&RT.ev)||!['corridor','hallb','upper','wing_sci','wing_arts','wing_sports','walkway','stairwell'].includes(D.room))return;
 STARE.next=T+Math.max(35,140-t*100)+Math.random()*40;if(Math.random()>.25+t*.6)return;
 const who=['shermian','voss','coach','adam','grieve'].filter(k=>K[k]&&!D.dead[k]&&!A[k]);const id=pick(who);if(!id)return;
 const side=A.you.x<160?300:20;put(id,side,A.you.x<side?-1:1,{y:A.you.y-4,ex:'cold'});A[id].noPush=1;STARE.ev={id,t0:T,beat:0};
 toast(pick([K[id].n+' is watching you.',K[id].n+' hasn’t blinked.','Don’t look at '+K[id].n+'. Don’t look.']))}}

/* ================= 2. DAILY STORY EBEATS ================= */
const EBEATS={
 1:{h:'WELCOME TO HIGHGATE',run:async()=>{await dms('Unknown number','',[['them','welcome to highgate','7:58'],['them','dont ask about tyler','7:58'],['them','we mean it','7:59']]);await N('You don’t know the number. You check twice. Nobody you know types without capitals that calm.')}},
 2:{h:'THE POSTER',run:async()=>{const f=floorOf(D.room);const pst=prop({t:'mposter',x:A.you.x<160?A.you.x+50:A.you.x-50,y:112,who:'TYLER',layer:-60});
   if(K.shermian&&!D.dead.shermian){put('shermian',A.you.x<160?336:-16,A.you.x<160?-1:1,{y:f[0]+4,ex:'cold'});await walk('shermian',pst.x,70);pose('shermian','reach');await wait(TEST?0:300);pst.hide=1;SFX.whoosh&&SFX.whoosh();pose('shermian',null);face('shermian','you');
    if(typeof camZoom==='function')await camZoom(A.shermian.x,A.shermian.y-26,2,300);await say('shermian','(crumpling the MISSING poster into a tiny ball, never looking away from you) Littering.','cold');if(typeof camZoom==='function')await camZoom();
    await walk('shermian',A.you.x<160?-30:350,60);remove('shermian')}else await N('The MISSING poster of Tyler by the doors has been torn down. Again.')}},
 3:{h:'RED PEN',run:async()=>{const ks=FRIENDS.filter(k=>K[k]&&!D.dead[k]);const id=pick(ks);if(id){const f=floorOf(D.room);put(id,A.you.x<160?A.you.x+40:A.you.x-40,1,{y:f[0]+6});face(id,'you');hold(id,'paper');
    await say(id,'This was in your bag. I wasn’t going through your bag. I was going through your bag.','scared');hold(id,null);}
   await N('A note. Red pen. Perfect teacher handwriting: “STOP ASKING QUESTIONS. WE SEE YOU AT LUNCH. — Staff”. There’s a gold star stuck on it.')}},
 4:{h:'OLLIE IS GONE',run:async()=>{const id=['nivaan','hasan','david'].find(k=>K[k]&&!D.dead[k]);if(id){const f=floorOf(D.room);put(id,A.you.x<160?A.you.x+30:A.you.x-30,1,{y:f[0]+6,ex:'scared'});face(id,'you');
    await say(id,'Ollie wasn’t in the library. Ollie’s ALWAYS in the library. Ollie LIVES in the library. His bag was on his chair and his chair was still warm.','scared')}
   await N('Somebody has already put up a new MISSING poster. Ollie’s school photo, smiling. The tape’s still wet.')}},
 5:{h:'TONIGHT',run:async()=>{await dms('Nivaan','online',[['them','tonight','8:01'],['them','we go back in','8:01'],['them','voss keeps a ledger. names dates weights','8:02'],['them','after school. dont get on the bus','8:02'],['me','weights??','8:03'],['them','dont','8:03']]);D.f.breakinDay=cal();toast('After school today: don’t get on the bus. Meet the crew.')}},
 6:{h:'THEY KNOW YOUR NAME',run:async()=>{const f=floorOf(D.room);if(K.coach&&!D.dead.coach){put('coach',A.you.x<160?336:-16,A.you.x<160?-1:1,{y:f[0]+4,ex:'smirk'});await walk('coach',A.you.x+(A.you.x<160?22:-22),80);
    await say('coach',crew().ev.ledger?'Heard somebody was in my building last Thursday night. Heard they were small. About your size. Funny that.':'Heard you’ve been asking questions. Questions are a contact sport here.','smirk');
    await say('coach','(leaning down, whistle swinging) Run a lap for me sometime. A long one. Somewhere quiet.','evil');await walk('coach',A.you.x<160?350:-30,70);remove('coach')}}},
 7:{h:'A CALL HOME',run:async()=>{await dms('Mom','online',[['them','a mr voss called the house??','7:41'],['them','he said you left something in his lab','7:41'],['them','he said he’d “hold onto it” for you','7:42'],['them','what did you leave in his lab','7:42'],['me','nothing','7:50'],['them','he sounded very nice','7:50']]);await N('You didn’t leave anything in his lab. You check your bag three times anyway.')}},
 8:{h:'HASAN DIDN’T TEXT BACK',run:async()=>{await dms('The Crew','4 online',[['them','NIVAAN: hasan’s not answering','7:30'],['them','NIVAAN: at all','7:30'],['them','DAVID: his mom says he left early','7:34'],['them','DAVID: he never leaves early','7:34']]);D.f.hasanBeat=1;
   ON_PERIOD.push(async i=>{if(i===4&&D.f.hasanBeat&&!D.f.hasanBack&&!TEST){D.f.hasanBack=1;setTimeout(()=>toast('Hasan turns up at lunch with a black eye and a bandaged hand. He won’t say. He won’t look at any of the teachers.'),2500)}})}},
 9:{h:'TOMORROW',run:async()=>{SFX.static&&SFX.static();await N('The PA, Mr. Adam, very cheerful: “Reminder that the STATE INSPECTORS arrive tomorrow. Any student found spreading… rumors… will be dealt with. Dealt WITH. Have a great day.”');
   if(typeof CHX!=='undefined'&&CHX.reallockdown&&!D.f.realLD)CHX.reallockdown.chance=.85}},
 10:{h:'INSPECTION DAY',run:async()=>{await N('Today. Everything happens today. Your hands haven’t stopped shaking since you woke up.')}}};
{const _dp=drawProp;drawProp=function(p){if(p.t==='mposter'){const x=Math.round(p.x),y=Math.round(p.y);R(x-8,y-12,16,20,'#f4f0e6');pxc('MISSING',x,y-10,'#a01010');R(x-5,y-3,10,7,'#8a8a90');pxc(p.who||'',x,y+5,'#2a2a30');return}return _dp(p)}}
function headline(t){if(TEST)return;let e=$('esch');if(!e){e=document.createElement('div');e.id='esch';document.body.appendChild(e);const st=document.createElement('style');st.textContent='#esch{position:fixed;left:50%;top:38%;transform:translate(-50%,-50%) scale(.9);z-index:45;pointer-events:none;padding:10px 26px;background:#120206ee;border-top:2px solid #ff3040;border-bottom:2px solid #ff3040;color:#ff6a6a;font-size:clamp(16px,3.4vw,30px);letter-spacing:.32em;opacity:0;transition:opacity .5s,transform .8s;text-shadow:0 0 12px #ff0020;white-space:nowrap}#esch.on{opacity:1;transform:translate(-50%,-50%) scale(1)}#esch small{display:block;font-size:11px;letter-spacing:.3em;color:#cbbfd8;margin-top:4px;text-align:center}';document.head.appendChild(st)}
 e.innerHTML='';e.appendChild(document.createTextNode('⚠ '+t));const s=document.createElement('small');s.textContent='DAY '+SDAY()+' OF 10';e.appendChild(s);requestAnimationFrame(()=>e.classList.add('on'));SFX.sting&&SFX.sting();setTimeout(()=>e.classList.remove('on'),2800)}
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(TEST||!D||D.weekend||busy||panelMode!=='roam'||D.period>2)return;const sd=SDAY();if(!sd||!EBEATS[sd]||D.f['esc'+cal()])return;
 D.f['esc'+cal()]=1;if(HEADSHOWN!==cal()){HEADSHOWN=cal();headline(EBEATS[sd].h)}setTimeout(()=>{if(!busy&&panelMode==='roam')runHook({run:async()=>{await EBEATS[sd].run();return 'stay'}});else D.f['esc'+cal()]=0},1600)}}
let HEADSHOWN=0;

/* ================= 4. PAYOFFS: allies, perks, evidence ================= */
const PERKS={quickfeet:['Quick Feet','you walk faster'],lockpro:['Lockpro','locks and lockpicks are easier'],tough:['Tough','every mash fight is easier'],ghost:['Ghost','teachers spot you slower'],hustler:['Hustler','+$3 every morning'],charm:['Charm','kids snap at you less']};
const PERK=k=>!!(crew().perks&&crew().perks[k]);
const ETEACH=['shermian','sherman','voss','coach','adam','balduf','grieve','nurse','loach','pat','kim','valentino','oakes','dahl'];
{const _cp=complete;complete=async function(m,v,big){const had=D&&D.done&&D.done[m];const r=await _cp(m,v,big);
 try{if(!had&&!TEST&&MIS[m]&&!/^(cq_|wk_|ret_)/.test(m)&&!['passing','gigs','robbery','lockedroom'].includes(m)){const c=crew(),M=MIS[m],got=[];
  c.allies=c.allies||{};c.perks=c.perks||{};c.ev=c.ev||{};
  const kid=(M.who||[]).find(k=>FRIENDS.includes(k)&&K[k]&&!c.allies[k]);if(kid){c.allies[kid]=1;got.push('ALLY: '+K[kid].n+' has your back in fights')}
  const left=Object.keys(PERKS).filter(k=>!c.perks[k]);if(left.length&&Math.random()<.6){const pk=left[Math.floor(hsh(m.length*7+(m.charCodeAt(0)||0))*left.length)%left.length];c.perks[pk]=1;got.push('PERK: '+PERKS[pk][0]+', '+PERKS[pk][1])}
  if((M.who||[]).some(k=>ETEACH.includes(k))&&!c.ev['q_'+m]){c.ev['q_'+m]=1;got.push('EVIDENCE: the file on '+K[(M.who||[]).find(k=>ETEACH.includes(k))].n+' gets thicker')}
  save&&save();got.forEach((t,i)=>setTimeout(()=>toast('🎁 '+t),3400+i*2600))}}catch(e){}return r}}
{const _ce=crewEvidence;crewEvidence=function(){const c=crew();return _ce()+Math.min(4,Math.floor(Object.keys(c.ev||{}).filter(k=>k.startsWith('q_')).length/2))+(c.ev&&c.ev.ledger?1:0)}}
/* allies jump into fights; perks do what they say */
{const _m=mash;mash=function(title,o){o=Object.assign({},o||{});try{const c=crew(),near=Object.keys(c.allies||{}).filter(k=>A[k]&&!A[k].dead&&A.you&&Math.abs(A[k].x-A.you.x)<120);
 let f=1;if(PERK('tough'))f*=.82;if(near.length){f*=Math.max(.6,1-.15*near.length);if(!TEST)toast('💪 '+near.map(k=>K[k].n).join(' + ')+' jump'+(near.length>1?'':'s')+' in!')}o.need=Math.max(6,Math.round((o.need||22)*f))}catch(e){}return _m(title,o)}}
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{const a=A.you,ox=a?a.x:0;_hu&&_hu(dt,rdt);if(a&&PERK('quickfeet')&&panelMode==='roam'&&!busy&&(keys.l||keys.r))a.x=clamp(a.x+(a.x-ox)*.15,10,310);
 if(PERK('ghost')&&typeof PAT!=='undefined'&&PAT&&PAT.state==='walk'){if(PAT._la!=null&&PAT.alert>PAT._la)PAT.alert=PAT._la+(PAT.alert-PAT._la)*.55;PAT._la=PAT.alert}}}
ON_PERIOD.push(async(i,res)=>{if(!res&&i===0&&D&&!D.weekend&&PERK('hustler')){D.money=(D.money||0)+3;updateLoc()}});
/* the Today tab lists them */
{const _rt=renderTracker;renderTracker=function(body){_rt(body);const w=body.querySelector('.trk');if(!w||!D)return;const c=crew();
 const h=document.createElement('h3');h.textContent='🎁 WHAT YOU’VE EARNED';h.style.color='#9ad09a';w.insertBefore(h,w.children[2]||null);
 const d=document.createElement('div');d.className='row';d.textContent='Allies: '+(Object.keys(c.allies||{}).map(k=>K[k]?K[k].n:k).join(', ')||'none yet, finish quests with people')+'  ·  Perks: '+(Object.keys(c.perks||{}).map(k=>PERKS[k][0]).join(', ')||'none yet')+'  ·  Evidence: '+crewEvidence();w.insertBefore(d,h.nextSibling)}}

/* ================= 3. HEADLINES ================= */
const HEADLINERS=['kim','dopple','headcase','brett','window','pauljones','darren','steptwelve','jade','steal_stella','beef','hotmic','codebrown','eatit','replyall','speeddate','pickupline','dungeon','keybowl','nursecal','swipe','bayonet','giant','grandad'];
function headlinersToday(){if(!D||D.weekend)return[];if(D.f.heads&&D.f.headsDay===cal())return D.f.heads;
 const started=Object.keys(D.mp||{}).filter(m=>MIS[m]&&!D.done[m]&&D.mp[m]>0&&HEADLINERS.includes(m));
 const avail=HEADLINERS.filter(m=>MIS[m]&&!D.done[m]&&!P.done[m]&&!started.includes(m)&&!(typeof FILTHY!=='undefined'&&FILTHY.includes(m)&&typeof filthyOn==='function'&&!filthyOn()));
 const pickN=started.concat(avail.sort(()=>Math.random()-.5)).slice(0,2);D.f.heads=pickN;D.f.headsDay=cal();return pickN}
if(typeof DAILY_F!=='undefined')DAILY_F.push('heads','headsDay');
{const _qn=qlNow;qlNow=function(body){_qn(body);if(!D||D.weekend)return;
 const box=qel('div','qcard main');box.style.borderLeftColor='#ff3040';box.appendChild(qel('div','ic','📰'));const m=qel('div','m');box.appendChild(m);
 const s=typeof storyNow==='function'?storyNow():null;m.appendChild(qel('h4','','TODAY’S HEADLINES  ·  DAY '+SDAY()+' OF 10'));
 if(s){const done=typeof CH_GOAL!=='undefined'?CH_GOAL.filter(c=>c.done()).length:0,tot=typeof CH_GOAL!=='undefined'?CH_GOAL.length:9;m.appendChild(qel('div','act','★ MAIN STORY: '+s.t+' ('+done+'/'+tot+'): '+s.goal));}
 for(const h of headlinersToday())m.appendChild(qel('div','act',(MIS[h].icon||'•')+' '+MIS[h].name+': '+(MIS[h].goal||((MIS[h].tips||[])[D.mp[h]||0])||'')));
 const first=body.querySelector('.qcard');body.insertBefore(box,first||null);
 /* side quests fold away unless asked */
 if(!QL.allNew){for(const sec of[...body.querySelectorAll('.qsec')])if(/NEW THIS PERIOD/.test(sec.textContent)){let n=sec.nextElementSibling;const hide=[];while(n&&!n.classList.contains('qsec')){hide.push(n);n=n.nextElementSibling}
   const cnt=hide.filter(e=>e.classList.contains('qcard')).length;hide.forEach(e=>e.remove());sec.textContent='＋ MORE SIDE QUESTS';const b=qel('button','more','Show side quests ▾');b.onclick=()=>{QL.allNew=1;openQuest()};sec.after(b)}}}}
if(typeof approachCandidate==='function'){const _ac=approachCandidate;approachCandidate=function(){const c=_ac();if(!c)return c;const hs=headlinersToday();if(c.started||c.track||hs.includes(c.h.mis)||/^crew/.test(c.h.mis))return c;return Math.random()<.35?c:null}}

/* ================= 5. MAIN STORY SET PIECES ================= */
function relPair(){const c=[['hasan','darren',()=>D.done.darren||P.done.darren],['corey','abby',()=>D.done.window||P.done.window||D.done.brett||P.done.brett],['sean','stella',()=>D.done.farewell||P.done.farewell||D.done.instella||P.done.instella],['hasan','mia',()=>D.done.hasanmia||P.done.hasanmia]];
 for(const [a,b,f] of c)if(K[a]&&K[b]&&!D.dead[a]&&!D.dead[b]&&!(window.EDITION_CUT||[]).includes(b)&&f())return[a,b];return null}
function bestFriend(){let b=null,bv=0;for(const k of FRIENDS)if(K[k]&&!D.dead[k]&&(P.bond[k]||0)>bv&&!A[k]){b=k;bv=P.bond[k]}return b||['hasan','nivaan','david'].find(k=>K[k]&&!D.dead[k]&&!A[k])}
let SPC=null;
function spEnd(){if(SPC){if(SPC.id&&A[SPC.id]&&SPC.spawned)walk(SPC.id,A[SPC.id].x<160?-30:350,60).then(()=>{if(A[SPC.id])remove(SPC.id)})}SPC=null;if(typeof PAT!=='undefined')PAT=null;if(typeof cue==='function')cue(ROOMS[D.room]&&ROOMS[D.room].music||'corridor',true)}
function spPatrol(id,sp){if(!A[id]&&K[id]){const f=floorOf(D.room);put(id,A.you.x<160?280:40,A.you.x<160?-1:1,{y:f[0]+6});SPC.spawned=1}const a=A[id];if(a){a.noPush=1;a.ex='cold';a.pose=null}PAT={id,alert:0,state:'walk',pause:0,turnT:T+3,sp:sp||24,seen:false};cue('tension',true)}
function setPiece(re,cfg){const s=SPOTS.find(s=>re.test(s.label||''));if(!s)return;const orig=s.run;
 s.run=async function(){if(TEST)return orig.apply(this,arguments);
  if(!SPC||SPC.cfg!==cfg){SPC={cfg,x:s.x,room:s.room,id:cfg.patrol};await cfg.intro();if(SPC&&cfg.patrol)spPatrol(cfg.patrol,cfg.sp);if(cfg.during){const go=()=>{if(!SPC||SPC.cfg!==cfg||SPC.did)return;if(busy||panelMode!=='roam'||(PAT&&PAT.state==='chase'))return setTimeout(go,800);SPC.did=1;runHook({run:async()=>{await cfg.during();return 'stay'}})};setTimeout(go,cfg.duringAt||7000)}toast(cfg.obj);return 'stay'}
  if(typeof PAT!=='undefined'&&PAT&&PAT.state==='chase')return 'stay';const saved=PAT;PAT=null;
  if(typeof camZoom==='function')await camZoom(A.you.x,A.you.y-18,1.6,300);
  const ok=await cfg.game();if(typeof camZoom==='function')await camZoom();
  if(!ok){PAT=saved;if(PAT){PAT.state='chase';PAT.alert=1.05}await N(cfg.failLine||'Too loud. They heard that.');return 'stay'}
  const id=SPC.id;spEnd();if(cfg.before)await cfg.before();const r=await orig.apply(this,arguments);if(cfg.after)await cfg.after();cue('romance');return r||'stay'}}
{const _er=enterRoom;enterRoom=async function(room){if(SPC&&room!==SPC.room){SPC=null}return _er(room)}}
{const _hi=hideIn;hideIn=function(d){if(SPC&&A.you&&Math.abs(A.you.x-SPC.x)<14){const s=SPOTS.find(s=>s.room===D.room&&s.x===SPC.x);if(s)return useSpot(s)}return _hi(d)}}
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{_do&&_do(...x);if(!SPC||TEST||ROOM!==SPC.room||panelMode!=='roam')return;const y=118+(Math.sin(T*5)>0?1:0);R(SPC.x-3,y,7,2,'#ff6a5a');R(SPC.x-2,y+2,5,2,'#ff6a5a');R(SPC.x-1,y+4,3,2,'#ff6a5a');const t='OBJECTIVE';pxc(t,SPC.x,y-9,'#ff6a5a')}}
/* chapter 1: the empty seat */
setPiece(/^Search Ms\. Sherman’s desk/,{patrol:'shermian',sp:22,obj:'Get to her desk without her seeing you. Then crack the bottom drawer.',
 intro:async()=>{scene('maths',{shermian:[200,-1,{y:146,pose:'phone',ex:'blush'}],you:[290,-1,{y:156}]},true);cue('tension',true);if(typeof camZoom==='function')await camZoom(200,120,1.8,500);
  await say('shermian','(into her phone, very low) No, Gerald. Not on the PHONE. …Because the stapler stays in the DRAWER, that’s why. …Fine. Fine. Wednesday. Bring the good tape.','blush');
  if(typeof camZoom==='function')await camZoom();pose('shermian',null);A.shermian.ex='cold';await N('She hangs up. She starts pacing the room, slowly, between you and her desk. The bottom drawer is the only one with a lock.')},
 duringAt:6500,during:async()=>{const p=relPair()||[bestFriend(),null];if(!p[0])return;const f=floorOf(D.room);for(const [i,k] of p.entries())if(k){put(k,-14-i*10,1,{y:f[0]+4});walk(k,40+i*12,90)}
  await wait(TEST?0:700);if(p[1]){await say(p[0],pick(['(loudly, at the door) I said I’m SORRY I liked his post!','(loudly) You KNOW why I was at the mall with her, it was for YOUR birthday—']),'angry');await say(p[1],'(even louder) Oh, so we’re doing this HERE? In MATH?','angry')}
  else await say(p[0],'(bursting in, at the top of their lungs) MISS! MISS! SOMEBODY’S CAR IS ON FIRE! …Maybe! Probably! Come look!','shock');
  face('shermian',-1);A.shermian.ex='angry';if(PAT){PAT.pause=5}await say('shermian','OUT. Take your HORMONES out of my classroom.','yell');for(const k of p)if(k&&A[k])walk(k,-30,120).then(()=>{if(A[k])remove(k)});toast('NOW. She’s looking the other way.')},
 game:()=>vgLock(),failLine:'The drawer bangs. Ms. Sherman’s head turns like an owl’s.',
 before:async()=>{slowmo(.5);await N('The drawer gives. Inside, under a stack of graded tests, something small and pink catches the light.');slowmo(1)}});
/* chapter 2: the file */
setPiece(/^Photograph the back fridge/,{patrol:'voss',sp:20,obj:'Get to the back fridge. Get the photos. Don’t let the flash go off near him.',
 intro:async()=>{scene('chem',{voss:[160,1,{y:146,hold:'mug',ex:'happy'}],you:[30,1,{y:156}]},true);cue('evil',true);if(typeof camZoom==='function')await camZoom(160,120,2,500);
  await say('voss','(humming, to a jar on the bench) Don’t look at me like that. You were delicious— delightful. DELIGHTFUL company.','happy');
  SFX.knock&&SFX.knock();await say('nurse','(through the door) Frederick? I brought the long gloves. And the other gloves.','smirk');
  await say('voss','(very fast) Not NOW, Pamela, I have a vis— I have NO visitors. No visitors at all. Wednesday.','shock');if(typeof camZoom==='function')await camZoom();hold('voss',null);
  await N('He starts walking the lab, slowly, labelling things. The back fridge hums in the corner. It’s padlocked. It always is. It isn’t today.')},
 during:async()=>{const al=Object.keys(crew().allies||{}).find(k=>K[k]&&!D.dead[k]&&!A[k]);if(!al)return;const f=floorOf(D.room);put(al,-14,1,{y:f[0]+4});await walk(al,30,90);SFX.glass&&SFX.glass();shake(.6);
  await say(al,'(knocking a whole rack of test tubes off the side) Oh NO. Oh no, sir, sorry, it SLIPPED!','shock');face('voss',-1);if(PAT)PAT.pause=5;await say('voss','THOSE WERE CALIBRATED.','yell');walk(al,-30,120).then(()=>{if(A[al])remove(al)})},
 game:()=>vgThrow('HOLD THE CAMERA STEADY'),failLine:'The flash goes off. The whole lab goes white for half a second.',
 before:async()=>{slowmo(.45);flash('#fff',.5);await wait(TEST?0:300);slowmo(1)}});
/* chapter 4: the office */
setPiece(/^Pick the lock on Ms\. Sherman’s office/,{patrol:'shermian',sp:26,obj:'Pick her office lock before she comes back down the hall.',
 intro:async()=>{cue('tension',true);SFX.knock&&SFX.knock();await say('adam','(through the office door) Doris said you borrowed the laminator again.','cold');
  await say('shermian','(through the door) I laminate what I want, Gerald. I laminated your LETTERS. Every single one. They’re on my FRIDGE.','evil');
  if(K.shermian&&!A.shermian){const f=floorOf(D.room);put('shermian',282,-1,{y:f[0]+4,ex:'cold'})}SFX.door&&SFX.door();await N('The door opens. Ms. Sherman comes out, locks it behind her, and starts her patrol. Down the hall. And, eventually, back.')},
 duringAt:8000,during:async()=>{const p=relPair();if(!p)return;const f=floorOf(D.room);put(p[0],-16,1,{y:f[0]+8});put(p[1],-28,1,{y:f[0]+8});await Promise.all([walk(p[0],70,80),walk(p[1],60,80)]);face(p[0],p[1]);face(p[1],p[0]);
  if(typeof cue==='function')cue('romance');await N('At the far end of the hall, '+K[p[0]].n+' and '+K[p[1]].n+' have stopped and are holding hands and looking at each other like a movie poster. On purpose. For you.');
  if(PAT)PAT.pause=6;await say('shermian','SIX INCHES. SIX INCHES OF AIR BETWEEN STUDENTS. I HAVE A RULER.','yell');await say(p[1],'(not letting go) Worth it.','love');cue('tension');walk(p[0],-30,90);walk(p[1],-30,90).then(()=>{for(const k of p)if(A[k])remove(k)})},
 game:()=>vgLock(),failLine:'The pick slips and scrapes. Down the hall, footsteps stop.'});
/* chapter 8: the leak */
setPiece(/^Wipe the phones in Ms\. Sherman’s drawer/,{patrol:'shermian',sp:24,obj:'Get to the drawer and wipe every phone. One wrong pattern and they all start buzzing.',
 intro:async()=>{scene('maths',{shermian:[150,1,{y:146,hold:'phone',ex:'shock'}],you:[290,-1,{y:156}]},true);cue('tension',true);if(typeof camZoom==='function')await camZoom(150,118,2.2,400);
  await N('Ms. Sherman is holding a confiscated phone. A text lights it up: “GERALD (VP): cant stop thinking about the budget meeting 😳🍆”.');
  await say('shermian','(very quietly) …Every. Single. Time.','closed');hold('shermian',null);if(typeof camZoom==='function')await camZoom();await N('She throws it in the drawer with the others and starts pacing. Fourteen phones in that drawer. Fourteen phones full of what everyone saw.')},
 game:()=>vgSimon(6,'UNLOCK PATTERN'),failLine:'Wrong pattern. Fourteen phones start buzzing at once in the drawer like a nest.'});
/* chapter 10: the boiler room */
setPiece(/^Go down the old hatch/,{patrol:'adam',sp:20,obj:'Get to the old hatch at the far left. Crack the padlock code. Mr. Adam is doing his rounds.',
 intro:async()=>{cue('evil',true);LDS.on=true;LDS.rate=96;await N('The hall lights are half off. Mr. Adam is walking the corridor with a flashlight, humming. It’s the song from the Hot Mic. Of course it is.');
  if(K.adam&&!A.adam){const f=floorOf(D.room);put('adam',280,-1,{y:f[0]+4,ex:'cold'})}},
 game:()=>vgSimon(6,'THE PADLOCK CODE'),failLine:'The padlock clanks against the hatch. The humming stops.',after:async()=>{LDS.on=false}});
/* chapter 3 (Angelo) and chapter 9 (Pat) get their own fights first */
{const h=HOOKS.find(h=>h.mis==='crew'&&/Ask Angelo for a lockpick/.test(h.label||''));if(h){const o=h.run;h.run=async function(){if(TEST)return o.apply(this,arguments);
 await say('angelo','A lockpick? For the crew? Prove you’re crew. Brayden owes me forty bucks and won’t look at me. Race him to the vending machine. Winner gets the last Takis and my respect.','smirk');
 const ok=await vgRace('brayden');if(!ok){await say('angelo','…Damn. Okay. I’ll give it to you anyway. But I’m disappointed. Like, PERSONALLY.','cold')}else{SFX.cheer&&SFX.cheer();await say('angelo','THAT’S crew. That’s CREW. Kayden owes me ten bucks on that.','laugh')}
 return o.apply(this,arguments)}}}
{const h=HOOKS.find(h=>h.mis==='crew'&&/Ask Pat about the staff rota/.test(h.label||''));if(h){const o=h.run;h.run=async function(){if(TEST)return o.apply(this,arguments);
 cue('fight',true);SFX.fire&&SFX.fire();shake(.6);await say('pat','(the deep fryer is ON FIRE behind her) Rota? I’ll give you the rota. After you help me with THIS. Throw that blanket. THROW IT.','yell');
 const ok=await vgThrow('THROW THE FIRE BLANKET');await N(ok?'The blanket lands right on the fryer. The fire goes out with a sad little “pff”. Pat lowers her cleaver.':'You miss. Pat puts it out herself by slamming a lid on it with her bare forearm and not reacting at all.');
 await say('pat','Coach used my walk-in freezer for “cardio” with the nurse again last night. Every surface. EVERY surface. I had to throw out the peas.','cold');
 return o.apply(this,arguments)}}}
/* caught by a set-piece teacher */
{const _ct=caughtBy;caughtBy=function(id){if(!SPC||id!==SPC.id)return _ct(id);const c=SPC.cfg;spEnd();cue('fight',true);return _ct(id)}}

/* ================= 6. BREAK-IN ================= */
const BINIGHT={on:false};
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{if(BINIGHT.on&&!TEST&&A.you){g.save();g.globalAlpha=.93;g.fillStyle='#04030a';g.beginPath();g.rect(0,0,W,H);
  const lx=A.you.x+(A.you.dir||1)*18,ly=A.you.y-16;g.moveTo(lx+40,ly);g.arc(lx,ly,40,0,Math.PI*2,true);const t=PAT&&A[PAT.id];if(t){g.moveTo(t.x+24,t.y-18);g.arc(t.x,t.y-18,24,0,Math.PI*2,true)}g.fill('evenodd');g.restore();
  g.globalAlpha=.25;g.fillStyle='#ffe8a0';g.beginPath();g.arc(lx,ly,40,0,Math.PI*2);g.fill();g.globalAlpha=1}
 _do&&_do(...x)}}
DEATHS.ledger={name:'Lab Rat',desc:'Mr. Voss caught you in the dark. He wrote your name down first. Then he weighed you.',hint:'The Break-In. Stay out of his lantern.'};
{const _as=afterSchool;afterSchool=async function(noStay){if(TEST||D.f.breakinDay!==cal()||crew().ev.ledger||D.f.brokeIn)return _as(noStay);
 busy=true;setPanel('talk');const c=await choose(['Meet the crew behind the gym. Break in tonight.','Chicken out. Get on the 43.'],'Nivaan said: don’t get on the bus.');
 if(c===1){busy=false;D.f.brokeIn=1;return _as(noStay)}D.f.brokeIn=1;busy=false;return runHook({run:breakIn})}}
async function breakIn(){
 const crewK=['nivaan','kenneth'].filter(k=>K[k]&&!D.dead[k]);
 cue('evil',true);await card('11:47 PM','THE BREAK-IN',1800);
 const cast={you:[30,1,{y:156}]};crewK.forEach((k,i)=>cast[k]=[14+i*10,1,{y:152,ex:'scared'}]);
 D.room='wing_sci';scene('wing_sci',cast,true);BINIGHT.on=true;LDS.on=true;LDS.rate=104;
 if(crewK[0])await say(crewK[0],'(whispering) Okay. Voss sleeps here. Like, actually sleeps here. The ledger’s in the Chem Lab. We stay here and watch. You go.','scared');
 if(crewK[1])await say(crewK[1],'(whispering) If he catches you, I’m telling everyone you were brave. I’ll lie. I’ll make it really good.','scared');
 put('voss',300,-1,{y:150,ex:'cold'});A.voss.noPush=1;await N('At the far end of the hall, a lantern. Mr. Voss, in a dressing gown, walking slowly, talking softly to something in his hand.');
 BI.on=true;BI.got=false;PAT={id:'voss',alert:0,state:'walk',pause:0,turnT:T+3,sp:20,seen:false};toast('Get into the CHEM LAB (E at its door). Then get back to your crew (far left).');return 'stay'}
const BI={on:false,got:false};
{const _ct=caughtBy;caughtBy=function(id){if(!BI.on||id!=='voss')return _ct(id);PAT=null;runHook({run:async()=>{cue('fight',true);await say('voss','(lantern right in your face, very pleased) Little mouse.','evil');
 const ok=await mash('RIP FREE',{need:24,time:4,info:'He’s got your collar. MASH!'});
 if(ok){await N('You twist out of your hoodie and leave it in his hand and RUN.');await walk('you',20,170);return breakInEnd()}
 await cineFall('you',{zoom:2.4,keepZoom:1});BINIGHT.on=false;BI.on=false;LDS.on=false;await die('ledger')}})}}
function biLedger(){if(busy||BI.got)return;const sp=PAT;PAT=null;runHook({run:async()=>{
   await N('The Chem Lab, in the dark. Jars glinting. The ledger is on his desk, open. Names. Dates. And a column that just says GRAMS.');
   const ok=await vgSimon(5,'THE DESK DRAWER');if(!ok){PAT=sp;if(PAT){PAT.state='chase';PAT.alert=1.05}await N('The drawer squeaks. The lantern stops moving.');return 'stay'}
   BI.got=true;crew().ev.ledger=1;save&&save();PAT=sp;toast('You’ve got the ledger. Get back to the crew. FAR LEFT.');return 'stay'}})}
{const _hi2=hideIn;hideIn=function(d){if(BI.on){if(!BI.got&&Math.abs(A.you.x-198)<18)return biLedger();toast(BI.got?'Back to the crew. FAR LEFT.':'The Chem Lab. The middle door.');return}return _hi2(d)}}
{const _it=interactables;interactables=function(){return BI.on?[]:_it()}}
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(!BI.on||busy||panelMode!=='roam'||!A.you)return;if(BI.got&&A.you.x<26){PAT=null;runHook({run:async()=>breakInEnd()})}}}
{const _e=edge;edge=function(s){if(BI.on){toast(BI.got?'The crew is right there. Far left.':'Not without the ledger.');return}return _e(s)}}
{const _td=throughDoor;throughDoor=async function(d){if(BI.on){busy=false;roam();if(!BI.got&&A.you&&Math.abs(A.you.x-198)<18)biLedger();return}return _td(d)}}
async function breakInEnd(){
 BI.on=false;PAT=null;const ks=['nivaan','kenneth'].filter(k=>A[k]);
 if(ks[0])await say(ks[0],crew().ev.ledger?'(seeing the ledger, whispering) You GOT it. You actually— okay. OKAY. Run. RUN.':'(whispering) Did you get it? You didn’t get it. RUN anyway.','shock');
 await Promise.all([walk('you',-30,160)].concat(ks.map(k=>walk(k,-30,160))));
 BINIGHT.on=false;LDS.on=false;
 await N(crew().ev.ledger?'You get home at 2 a.m. with Mr. Voss’s ledger under your shirt. You read one page in bed and then you don’t read any more. The word GRAMS is going to be in your head for the rest of your life.':'You get home at 2 a.m. with nothing but a heartbeat you can’t slow down.');
 if(crew().ev.ledger&&typeof repAdd==='function')repAdd('legend',2,'the Break-In');
 fxState.dark=0;await tw(fxState,{dark:1},900);await card('THE NEXT DAY','',1400);fxState.dark=0;busy=false;newDay();return 'ended'}
