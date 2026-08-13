#!/usr/bin/env node
/* Generates progress/index.html from progress/state.json, embedding every referenced
 * screenshot as a downscaled inline JPEG (the artifact host blocks external requests).
 * Downscaling is done in Chromium because there is no image library here.
 *   node tools/progress.js [--maxw 880] [--quality 0.72]
 */
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
function arg(n, d) { const i = process.argv.indexOf('--' + n); return i > -1 ? process.argv[i + 1] : d; }

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

(async () => {
  const maxw = +arg('maxw', 880), quality = +arg('quality', 0.72);
  const state = JSON.parse(fs.readFileSync(path.join(ROOT, 'progress/state.json'), 'utf8'));

  // gather every referenced image
  const refs = [];
  for (const p of state.pieces) for (const s of (p.shots || [])) if (s && s.src) refs.push(s.src);
  for (const l of (state.log || [])) if (l.shot) refs.push(l.shot);
  const uniq = [...new Set(refs)].filter(f => fs.existsSync(path.isAbsolute(f) ? f : path.join(ROOT, f)));

  const embedded = {};
  if (uniq.length) {
    const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const page = await browser.newPage();
    await page.goto('about:blank');
    for (const f of uniq) {
      const abs = path.isAbsolute(f) ? f : path.join(ROOT, f);
      try {
        const b64 = fs.readFileSync(abs).toString('base64');
        const out = await page.evaluate(async ({ b64, maxw, quality }) => {
          const img = new Image();
          img.src = 'data:image/png;base64,' + b64;
          await img.decode();
          const s = Math.min(1, maxw / img.naturalWidth);
          const c = document.createElement('canvas');
          c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
          const g = c.getContext('2d');
          g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
          g.drawImage(img, 0, 0, c.width, c.height);
          return c.toDataURL('image/jpeg', quality);
        }, { b64, maxw, quality });
        embedded[f] = out;
      } catch (e) { console.warn('skip ' + f + ': ' + e.message); }
    }
    await browser.close();
  }

  const statusColor = {
    building: '#ffb340', critiquing: '#7cbcff', rejected: '#ff2d6f',
    passed: '#7cff5a', blocked: '#ff2d6f', queued: '#5b6b76', integrating: '#c98bff',
  };

  const shotCard = s => `<figure class="shot">
  ${embedded[s.src] ? `<img src="${embedded[s.src]}" alt="${esc(s.label)}" loading="lazy">` : `<div class="missing">image not captured</div>`}
  <figcaption><b>${esc(s.label || '')}</b>${s.when ? `<span class="when">${esc(s.when)}</span>` : ''}${s.note ? `<span class="note">${esc(s.note)}</span>` : ''}</figcaption>
</figure>`;

  const pieceCard = p => `<section class="piece" id="p-${esc(p.id)}">
  <header>
    <span class="dot" style="--c:${statusColor[p.status] || '#5b6b76'}"></span>
    <h2>${esc(p.name)}</h2>
    <code>${esc(p.file)}</code>
    <span class="axis">${esc(p.axis)}</span>
    <span class="status" style="--c:${statusColor[p.status] || '#5b6b76'}">${esc(p.status)}</span>
    <span class="rounds">${p.rounds ? 'round ' + p.rounds : ''}</span>
  </header>
  ${p.verdict ? `<p class="verdict ${p.verdict.toLowerCase().indexOf('pass') === 0 ? 'pass' : 'fail'}"><b>${esc(p.verdict)}</b></p>` : ''}
  ${p.gap ? `<p class="gap"><span>largest remaining gap</span>${esc(p.gap)}</p>` : ''}
  ${p.history && p.history.length ? `<ul class="hist">${p.history.map(h => `<li><b>${esc(h.round)}</b> ${esc(h.verdict)} — ${esc(h.gap)}</li>`).join('')}</ul>` : ''}
  ${(p.shots || []).length ? `<div class="shots">${p.shots.map(shotCard).join('')}</div>` : ''}
</section>`;

  const html = `<title>Volthaven Build Board</title>
<style>
:root{
  --bg:#080b0e; --panel:#0d1216; --line:#1b262d; --ink:#cfe0e8; --dim:#728694;
  --cyan:#00e5ff; --amber:#ffb340; --mag:#ff2d6f; --green:#7cff5a;
}
/* Deliberately single-theme: this is a console for a game set at night in a wet city.
   Every colour is painted explicitly so it holds on either host ground. */
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
  font:15px/1.6 ui-sans-serif,-apple-system,"Segoe UI",system-ui,sans-serif;
  padding:22px 18px 80px;max-width:1080px;margin-inline:auto;-webkit-text-size-adjust:100%;
  font-variant-numeric:tabular-nums}
h1{font-size:clamp(26px,7vw,42px);letter-spacing:.16em;margin:0 0 2px;font-weight:600}
.sub{color:var(--dim);font-size:13px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px}
.meta{color:var(--dim);font-size:12.5px;margin-bottom:20px}
.legend{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 22px}
.legend span{font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--dim);
  border:1px solid var(--line);border-radius:99px;padding:3px 10px}
.legend i{display:inline-block;width:7px;height:7px;border-radius:99px;background:var(--c);margin-right:6px;vertical-align:middle}
.note{background:var(--panel);border:1px solid var(--line);border-left:2px solid var(--amber);
  padding:12px 14px;border-radius:5px;font-size:13.5px;margin-bottom:16px}
.blockers{background:var(--panel);border:1px solid var(--line);border-left:2px solid var(--mag);
  padding:12px 14px 12px 30px;border-radius:5px;font-size:13px;color:var(--dim);margin-bottom:26px}
.blockers li{margin:5px 0}
.piece{background:var(--panel);border:1px solid var(--line);border-radius:7px;padding:15px 16px;margin-bottom:14px}
.piece header{display:flex;flex-wrap:wrap;align-items:center;gap:9px}
.piece h2{font-size:16px;margin:0;font-weight:600;letter-spacing:.01em}
.dot{width:8px;height:8px;border-radius:99px;background:var(--c);box-shadow:0 0 9px var(--c);flex:none}
code{font:11.5px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dim);
  border:1px solid var(--line);border-radius:4px;padding:1px 6px}
.axis{font-size:10.5px;letter-spacing:.12em;color:var(--cyan);border:1px solid var(--line);border-radius:99px;padding:2px 8px}
.status{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--c);margin-left:auto}
.rounds{font-size:11px;color:var(--dim)}
.verdict{margin:11px 0 0;font-size:13.5px}
.verdict.pass b{color:var(--green)} .verdict.fail b{color:var(--mag)}
.gap{margin:7px 0 0;font-size:13.5px;color:var(--ink)}
.gap span{display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);margin-bottom:2px}
.hist{margin:10px 0 0;padding-left:16px;font-size:12.5px;color:var(--dim)}
.hist b{color:var(--ink);font-weight:600}
.shots{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:11px;margin-top:13px}
.shot{margin:0;border:1px solid var(--line);border-radius:5px;overflow:hidden;background:#000}
.shot img{display:block;width:100%;height:auto}
.shot .missing{padding:34px 10px;text-align:center;color:var(--dim);font-size:12px}
figcaption{padding:7px 9px;font-size:11.5px;background:var(--panel);color:var(--dim)}
figcaption b{color:var(--ink);font-weight:600;display:block}
figcaption .when{display:block;font-size:10.5px;opacity:.75}
figcaption .note{display:block;background:none;border:0;padding:4px 0 0;font-size:11.5px;color:var(--dim)}
.log{margin-top:34px}
.log h2{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin-bottom:10px}
.log ol{list-style:none;padding:0;margin:0;border-left:1px solid var(--line)}
.log li{padding:7px 0 7px 15px;position:relative;font-size:13px}
.log li::before{content:"";position:absolute;left:-3.5px;top:15px;width:6px;height:6px;border-radius:99px;background:var(--line)}
.log .t{color:var(--dim);font-size:11px;margin-right:8px;font-family:ui-monospace,monospace}
.log .who{color:var(--cyan);font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;margin-right:7px}
</style>

<div class="sub">build progress</div>
<h1>VOLTHAVEN</h1>
<div class="meta">Wave ${esc(state.wave)} · updated ${esc(state.updated)}</div>

${state.note ? `<div class="note">${esc(state.note)}</div>` : ''}

<div class="legend">
  ${['building', 'critiquing', 'rejected', 'passed', 'integrating', 'blocked'].map(s =>
    `<span><i style="--c:${statusColor[s]}"></i>${s}</span>`).join('')}
</div>

${state.pieces.map(pieceCard).join('\n')}

${(state.blockers || []).length ? `<ul class="blockers">${state.blockers.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}

${(state.log || []).length ? `<div class="log"><h2>Critic log — what was rejected and why</h2><ol>${
  state.log.slice().reverse().map(l => `<li><span class="t">${esc(l.ts)}</span><span class="who">${esc(l.piece)}</span>${esc(l.detail)}</li>`).join('')
}</ol></div>` : ''}
`;

  fs.writeFileSync(path.join(ROOT, 'progress/index.html'), html);
  const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
  console.log(`progress page -> progress/index.html (${kb} KB, ${Object.keys(embedded).length} images embedded)`);
})().catch(e => { console.error('FAIL ' + e.message); process.exit(1); });
