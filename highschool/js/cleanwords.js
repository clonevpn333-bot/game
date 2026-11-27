'use strict';
/* =====================================================================
   HIGHSCHOOL — CLEAN WORDS (Settings → "Swearing"; safe version only,
   ON by default there). Swaps the swears for softer ones everywhere text
   comes from: dialogue and narration, choices, toasts, phone threads and
   texts, and pixel text drawn on the canvas. The full version never
   filters.
   ===================================================================== */
{
const SW=[
 [/jesus fucking christ/gi,'jeez louise'],[/motherfuckers/gi,'mother-truckers'],[/motherfucker/gi,'mother-trucker'],
 [/fucking/gi,'freaking'],[/fuckin\b/gi,'freakin'],[/fucked/gi,'freaked'],[/fucker/gi,'freaker'],[/fuck/gi,'frick'],
 [/bullshit/gi,'bull-crap'],[/shitty/gi,'crappy'],[/shitting/gi,'crapping'],[/shitshow/gi,'mess'],[/shithole/gi,'dump'],[/shits\b/gi,'craps'],[/shit/gi,'crap'],
 [/goddamn/gi,'gosh-darn'],[/\bdamn/gi,'dang'],[/\bhell\b/gi,'heck'],[/asshole/gi,'butthead'],[/\bbitch(es)?\b/gi,'jerk$1'],
 [/\bdickhead\b/gi,'dork'],[/\bdick\b/gi,'dork'],[/bastard/gi,'jerk'],[/pissed/gi,'ticked'],[/pissing/gi,'peeing'],[/\bpiss\b/gi,'pee']
];
const matchCase=(src,rep)=>src===src.toUpperCase()&&/[A-Z]/.test(src)?rep.toUpperCase():/^[A-Z]/.test(src)?rep[0].toUpperCase()+rep.slice(1):rep;
const on=()=>window.EDITION==='safe'&&(P&&P.set&&P.set.clean!=null?!!P.set.clean:true);
function clean(t){if(typeof t!=='string'||!on())return t;for(const [re,rep] of SW)t=t.replace(re,m=>matchCase(m,rep.replace('$1',/es$/i.test(m)?'s':'')));return t}
window.cleanWords=clean;
{const _s=say;say=function(who,t,e){return _s.call(this,who,clean(t),e)}}
{const _c=choose;choose=function(opts,title){if(on()&&Array.isArray(opts))opts=opts.map(o=>typeof o==='string'?clean(o):(o&&o.t?Object.assign({},o,{t:clean(o.t)}):o));return _c.call(this,opts,clean(title))}}
{const _t=toast;toast=function(t){return _t.call(this,clean(t))}}
{const _d=dms;dms=function(title,sub,msgs,o){if(on()&&Array.isArray(msgs))msgs=msgs.map(m=>[m[0],clean(m[1])].concat(m.slice(2)));return _d.call(this,title,sub,msgs,o)}}
if(typeof px==='function'){const _p=px;px=function(t,...a){return _p.call(this,clean(t),...a)}}
if(typeof pxc==='function'){const _p=pxc;pxc=function(t,...a){return _p.call(this,clean(t),...a)}}
/* the phone and the quest log build their own DOM: clean text nodes as they appear */
const mo=new MutationObserver(ms=>{if(!on())return;for(const m of ms)for(const n of m.addedNodes){const w=document.createTreeWalker(n.nodeType===3?n.parentNode||n:n,NodeFilter.SHOW_TEXT);let x;while((x=w.nextNode())){const c=clean(x.nodeValue);if(c!==x.nodeValue)x.nodeValue=c}}});
addEventListener('load',()=>{for(const id of['gram','quest','phoneov'])if($(id))mo.observe($(id),{childList:true,subtree:true})});
setTimeout(()=>{for(const id of['gram','quest','phoneov'])if($(id))mo.observe($(id),{childList:true,subtree:true})},1500);
/* Settings: only in the safe version */
{const _os=openSettings;openSettings=function(){_os();if(window.EDITION!=='safe')return;const s=$('settings').querySelector('.set');if(!s)return;
 s.appendChild(Object.assign(document.createElement('div'),{textContent:'🤬 Swearing'}));const w=document.createElement('div');w.className='opts';
 [[1,'Clean words (freaking, crap)'],[0,'The real ones']].forEach(([v,n])=>{const b=document.createElement('button');b.textContent=n;b.setAttribute('aria-pressed',String(+on()===v));b.onclick=()=>{P.set.clean=v;save&&save();openSettings()};w.appendChild(b)});s.appendChild(w)}}
}
