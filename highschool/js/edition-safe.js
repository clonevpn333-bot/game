'use strict';
/* =====================================================================
   HIGHSCHOOL — the safe version.
   Abby doesn't exist, and Corey's love life never comes up.
   Only included by tools/build.py in dist/highschool-safe*.html.
   ===================================================================== */
window.EDITION='safe';
window.EDITION_CUT=['abby'];
window.EDITION_LINE={corey:'Corey — the curls survived every single day. Mostly.'};
const ROMANCE=/\babby\b|morrissey/i;

/* the two Corey romance missions are gone */
for(const m of['corey','smallhours','window','brett'])delete MIS[m];
if(typeof MYCLASS!=='undefined')MYCLASS.odd[3]='english';  /* your Period 3 is someone else’s: English */
for(let i=HOOKS.length-1;i>=0;i--)if(!MIS[HOOKS[i].mis])HOOKS.splice(i,1);
for(const m of Object.values(MIS))m.who=m.who.filter(w=>w!=='abby');
delete INTEL.kennethSwap;

/* nobody called Abby is anywhere in the school */
FRIENDS.splice(FRIENDS.indexOf('abby'),1);
for(const per of ROSTER)if(per)for(const r in per)per[r]=per[r].filter(e=>e[0]!=='abby');
for(const p in CLASS)for(const r in CLASS[p])CLASS[p][r]=CLASS[p][r].filter(x=>x!=='abby');
for(let i=ADAM_REACT.length-1;i>=0;i--)if(ADAM_REACT[i][0]==='abby')ADAM_REACT.splice(i,1);
delete CHAT.abby;delete BONDLINE.abby;delete ARJUN_AT.abby;
CHAT.corey=['I’m fine. My hair is fine. Everything’s fine.','Do you think purple curl cream is too much for a school day?','I give my seat up on the 43 every morning. Nobody’s ever said thanks. I don’t need thanks. I need someone to notice.','It’s not product. It’s maintenance.'];
ARJUN_AT.corey=['Corey, all that hair and still nothing upstairs.','Corey, you use more product than a hairdresser’s trash can.'];

/* Corey’s curl-cream prank is about the curls, not about anyone watching */
Object.assign(MIS.emergency,{who:['corey','tez'],
 blurb:'Corey keeps a tub of purple C.U.R.L. curl cream in his black zip-up hoodie. He says it’s “for emergencies”. He has an emergency every hour. Today, the emergency is you.',
 parts:['Before school: nick the tub out of his hoodie','Break: Tez helps you “improve” it','Home time: Corey’s last touch-up, in front of everyone']});

/* scenes that used to include her simply don’t */
const _putNA=put;
put=function(id,x,dir,o){if(id==='abby')return{id,k:K.abby,x:x||0,y:150,vis:false};return _putNA(id,x,dir,o)};
const _sayNA=say;
say=function(who,text,e){
 if(ROMANCE.test(String(text)))return Promise.resolve();
 if(who==='abby'){
  if(/corey|kiss|love|flower|like it/i.test(text))return Promise.resolve();
  const stand=['stella','paul','kenneth','jacob','angelo','hasan'].find(n=>A[n]&&A[n].vis&&!A[n].dead);
  return stand?_sayNA(stand,text,e):Promise.resolve();
 }
 return _sayNA(who,text,e);
};
/* even-day classes and class whispers too */
if(typeof DAYSET!=='undefined')for(const t in DAYSET)for(const i in DAYSET[t]){const s=DAYSET[t][i];if(s&&s.cls)for(const r in s.cls)s.cls[r]=s.cls[r].filter(x=>x!=='abby')}
if(typeof WHISPER!=='undefined')delete WHISPER.abby;
