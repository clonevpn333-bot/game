'use strict';
/* =====================================================================
   HIGHSCHOOL — IMANI, NOT A GIRLFRIEND
   Imani took Stella's place in the story: the crew, the tea, the
   softball, the field. She is not Sean's girlfriend. Every Sean
   romance quest is gone, and any leftover line that treats them as a
   couple is dropped.
   ===================================================================== */
{const CUT=['instella','striketwo','firstfight','farewell','toby','steal_stella','ohio'];
 for(const m of CUT)delete MIS[m];
 for(let i=HOOKS.length-1;i>=0;i--)if(HOOKS[i].mis&&!MIS[HOOKS[i].mis])HOOKS.splice(i,1);
 for(let i=SPOTS.length-1;i>=0;i--)if(SPOTS[i].mis&&!MIS[SPOTS[i].mis])SPOTS.splice(i,1);
 if(typeof PASS!=='undefined')for(let i=PASS.length-1;i>=0;i--)if(PASS[i].id==='couple')PASS.splice(i,1);
 if(typeof NIGHT!=='undefined')for(let i=NIGHT.length-1;i>=0;i--)if(/imani|sean/i.test(NIGHT[i].from)&&/sean|imani|babe|portland|boxes|love/i.test(JSON.stringify(NIGHT[i].msgs)))NIGHT.splice(i,1);
 if(typeof RIDE!=='undefined')for(let i=RIDE.length-1;i>=0;i--){const s=String(RIDE[i].run)+String(RIDE[i].cond);if(/toby|firstfight|instella|striketwo|farewell|Sean and Imani|Imani and Sean/i.test(s))RIDE.splice(i,1)}
 for(const per of ROSTER)if(per)for(const r in per)per[r]=per[r].filter(e=>e[0]!=='toby');
 const COUPLE=/\btoby\b|Sean and Imani are|Sean and Imani’s|(sean|imani) (is|are) (holding|sharing)|(sean|imani)[^.!?]{0,40}(kiss|girlfriend|boyfriend|dating|first date|couple|in love|love you|making out|moved schools for|long.distance|portland|babe)|(kiss|girlfriend|boyfriend|dating|first date|couple|in love|making out|moved schools for|long.distance)[^.!?]{0,40}(sean|imani)/i;
 const _s=say;say=function(who,text,e){if(who==='toby')return Promise.resolve();if(typeof text==='string'&&COUPLE.test(text))return Promise.resolve();if((who==='sean'||who==='stella')&&typeof text==='string'&&/\b(babe|my girlfriend|my boyfriend|love you)\b/i.test(text))return Promise.resolve();return _s(who,text,e)};
 const _p=put;put=function(id,x,dir,o){if(id==='toby')return{id,k:K[id],x:x||0,y:150,vis:false};return _p(id,x,dir,o)};
 if(typeof CHAT!=='undefined')for(const id of['sean','stella'])if(CHAT[id])CHAT[id]=CHAT[id].filter(l=>!COUPLE.test(l)&&!/babe|girlfriend|boyfriend/i.test(l));
 for(const m of Object.values(MIS))if(m.blurb&&COUPLE.test(m.blurb))m.blurb=m.blurb.replace(COUPLE,'').replace(/\s+/g,' ');
}
