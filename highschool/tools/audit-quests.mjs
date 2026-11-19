// Plays every 3+ step quest on its own over simulated days and reports quests that stall.
// Usage: node tools/audit-quests.mjs [mission] [otherMissionsToPlayAlongside,comma,separated]
import { createRequire } from 'module';const require=createRequire(import.meta.url);const {chromium}=require('playwright');
const b=await chromium.launch();const p=await b.newPage();
await p.addInitScript(()=>{localStorage.clear();window.HS_TEST={errs:[],logs:[],auto:0,err(e){this.errs.push(String(e&&e.stack||e))},log(){}}});
await p.goto('file://'+process.cwd()+'/index.html');await p.waitForFunction(()=>window.HS&&HS.MIS);
const only=process.argv[2];const group=(process.argv[3]||'').split(',').filter(Boolean);
const res=await p.evaluate(async([only,group])=>{
 const out=[];const ids=Object.keys(HS.MIS).filter(m=>HS.MIS[m].parts.length>=3&&!/^wk_/.test(m)&&!['passing','robbery','lockedroom','calling'].includes(m)&&(!only||m===only));
 for(const m of ids){
  HS.reset();P.cal=1;P.calStarted=1;let D0=HS.freshD();D0.dayType='odd';HS.D=D0;
  const log=[];let stall=0,maxStall=0,steps=0,deaths=0,err=null,firstSeen=false;
  for(let day=1;day<=13&&!HS.D.done[m];day++){
   P.cal=day;const D=HS.D;D.dayType=day%2?'odd':'even';D.weekend=false;if(typeof applyDay==='function')applyDay(D.dayType);
   for(const k of DAILY_F)delete D.f[k];D.dead={};
   let did=0;
   for(let per=0;per<=8&&!D.done[m];per++){
    D.period=per;
    for(let tries=0;tries<3&&!D.done[m];tries++){
     const list=thingsAt(per).filter(t=>t.mis===m||group.includes(t.mis));
     if(!list.length)break;
     const t=list[0];
     const mm=t.mis;const h=t.spot?HS.SPOTS.find(s=>s.mis===mm&&s.room===t.room&&(!s.cond||s.cond())):HS.HOOKS.find(h=>h.mis===mm&&h.room===t.room&&(h.period==null||h.period===per||(Array.isArray(h.period)&&h.period.includes(per)))&&(!h.cond||h.cond())&&hookPresent(h,per));
     if(!h)break;
     D.room=h.room;try{HS.buildRoom(h.room)}catch(e){}
     const before=JSON.stringify([D.mp[m],D.f]);
     try{await Promise.race([h.run(),new Promise((_,r)=>setTimeout(()=>r(new Error('TIMEOUT')),8000))])}catch(e){if(e&&e.death){deaths++;}else{err=String(e).slice(0,200);break}}
     firstSeen=true;did=1;steps++;
     if(JSON.stringify([D.mp[m],D.f])===before)break;
    }
   }
   if(firstSeen&&!D.done[m]){if(!did){stall++;maxStall=Math.max(maxStall,stall)}else stall=0}
   log.push((D.mp[m]||0));
  }
  out.push({m,done:!!HS.D.done[m],mp:HS.D.mp[m]||0,parts:HS.MIS[m].parts.length,maxStall,steps,deaths,err,never:!firstSeen,log:log.join(',')});
 }
 return out},[only,group]);
for(const r of res)if(!r.done||r.maxStall>=1||r.err||only)console.log(JSON.stringify(r));
console.log('audited',res.length,'done',res.filter(r=>r.done).length);
await b.close();
