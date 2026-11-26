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
for(const m of['corey','smallhours','window','brett','mended'])delete MIS[m];
if(typeof MYCLASS!=='undefined')MYCLASS.odd[3]='english';  /* your Period 3 is someone else’s: English */
for(let i=HOOKS.length-1;i>=0;i--)if(!MIS[HOOKS[i].mis])HOOKS.splice(i,1);
for(let i=SPOTS.length-1;i>=0;i--)if(SPOTS[i].mis&&!MIS[SPOTS[i].mis])SPOTS.splice(i,1);
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
Object.assign(MIS.emergency||{},{who:['corey','tez'],
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

/* no Hasan & Darren, and no Sean & Stella: they’re friends, that’s all */
{const CUT=['darren','steptwelve','steal_stella','after_stella','stepeleven','toby','instella','striketwo','firstfight','farewell'];
 for(const m of CUT)delete MIS[m];
 for(const m in MIS){const w=MIS[m].who||[];if(w.includes('darren')||w.includes('toby'))delete MIS[m]}
 for(let i=HOOKS.length-1;i>=0;i--){const h=HOOKS[i];if(h.who==='darren'||h.who==='toby'||/A\.(darren|toby)\b/.test(String(h.run)))HOOKS.splice(i,1)}
 for(let i=HOOKS.length-1;i>=0;i--)if(HOOKS[i].mis&&!MIS[HOOKS[i].mis])HOOKS.splice(i,1);
 for(let i=SPOTS.length-1;i>=0;i--)if(SPOTS[i].mis&&!MIS[SPOTS[i].mis])SPOTS.splice(i,1);
 if(typeof PASS!=='undefined')for(let i=PASS.length-1;i>=0;i--)if(PASS[i].id==='couple')PASS.splice(i,1);
 if(typeof NIGHT!=='undefined')for(let i=NIGHT.length-1;i>=0;i--)if(/darren|stella/i.test(JSON.stringify(NIGHT[i].msgs))&&/hasan|sean|stella/i.test(NIGHT[i].from))NIGHT.splice(i,1);
 if(typeof RIDE!=='undefined')for(let i=RIDE.length-1;i>=0;i--){const s=String(RIDE[i].run)+String(RIDE[i].cond);if(/darren|toby|firstfight|instella|striketwo|farewell/i.test(s))RIDE.splice(i,1)}
 for(const per of ROSTER)if(per)for(const r in per)per[r]=per[r].filter(e=>!['darren','toby'].includes(e[0]));
 window.EDITION_CUT.push('darren','toby');
 const LOVE=/darren|\btoby\b|(sean|stella|imani)[^.!?]{0,40}(kiss|girlfriend|boyfriend|dating|date|couple|in love|love you|making out)|(kiss|girlfriend|boyfriend|dating|first date|couple|in love|making out)[^.!?]{0,40}(sean|stella|imani)/i;
 const _s=say;say=function(who,text,e){if(who==='darren'||who==='toby'||LOVE.test(String(text)))return Promise.resolve();return _s(who,text,e)};
 const _p=put;put=function(id,x,dir,o){if(id==='darren'||id==='toby')return{id,k:K[id],x:x||0,y:150,vis:false};return _p(id,x,dir,o)};
 if(typeof CHAT!=='undefined')for(const id of['hasan','sean','stella'])if(CHAT[id])CHAT[id]=CHAT[id].filter(l=>!LOVE.test(l));
 if(typeof GOSSIP_EXTRA!=='undefined')GOSSIP_EXTRA.length=0;
}

/* In the safe version Stella is replaced by Imani: a softball pitcher,
   box braids, green team jacket. Same place in the story (the crew, the
   field, the tea), never anybody's girlfriend. */
{Object.assign(K.stella,{n:'Imani',col:'#2a7a4a',skin:'#8a5a3a',hair:'#1a1210',hs:'braids',top:'#2a7a4a',pants:'#2a2a33',h:3,v:470});
 const sw=t=>typeof t==='string'?t.replace(/\bStella\b/g,'Imani').replace(/\bSTELLA\b/g,'IMANI').replace(/\bStel\b/g,'Imani'):t;
 const deep=(o,d)=>{if(!o||d>5)return;for(const k in o){const v=o[k];if(typeof v==='string')o[k]=sw(v);else if(v&&typeof v==='object')deep(v,d+1)}};
 for(const m of Object.values(MIS)){for(const f of['name','blurb','goal','doneTip','lockText'])m[f]=sw(m[f]);deep(m.parts,0);deep(m.tips,0);deep(m.variants,0)}
 for(const h of HOOKS)h.label=sw(h.label);for(const s of SPOTS)s.label=sw(s.label);
 for(const o of[ITEMS,typeof CHAT!=='undefined'?CHAT:null,typeof INTEL!=='undefined'?INTEL:null,typeof NIGHT!=='undefined'?NIGHT:null,typeof BONDLINE!=='undefined'?BONDLINE:null,typeof WHISPER!=='undefined'?WHISPER:null,window.EDITION_LINE,typeof DEATHS!=='undefined'?DEATHS:null,typeof COLL!=='undefined'?COLL:null])deep(o,0);
 const _s=say;say=function(who,text,e){return _s(who,sw(text),e)};
 const _c=choose;choose=function(opts,prompt){return _c((opts||[]).map(o=>typeof o==='string'?sw(o):Object.assign({},o,{t:sw(o.t)})),sw(prompt))};
 const _t=toast;toast=function(t,...r){return _t(sw(t),...r)};
 const _cd=card;card=function(a,b,...r){return _cd(sw(a),sw(b),...r)};
}
