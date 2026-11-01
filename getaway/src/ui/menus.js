// GETAWAY! — menus: title, main, missions, garage, soundtrack, settings, controls, pause, results, fail, intro cards.
import { G } from '../core/context.js';
import { fmtTime, clamp } from '../core/utils.js';
import { CAMPAIGN, ACTS, isUnlocked, nextMission } from '../missions/campaign.js';
import { TRACKS } from '../core/music.js';
import { VEHICLES, GARAGE_ORDER } from '../vehicles/types.js';

const h = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };
export class Menus {
  constructor(root, flow) { this.root = root; this.flow = flow; this.cur = null; this.keyNav = (e) => this.onKey(e); addEventListener('keydown', this.keyNav); }
  clear() { if (this.cur) { this.cur.remove(); this.cur = null; } if (this.vizRAF) cancelAnimationFrame(this.vizRAF); this.vizRAF = null; }
  mount(node) { this.clear(); this.cur = node; this.root.appendChild(node); node.querySelectorAll('button,.mcard,.gi,.tr,.swatch').forEach((b) => b.addEventListener('mouseenter', () => G.audio.ui('hover'))); return node; }
  ui(k) { G.audio.ui(k); }
  onKey(e) {
    if (!this.cur) return; const btns = [...this.cur.querySelectorAll('.mbtn:not(:disabled)')]; if (!btns.length) return;
    let i = btns.findIndex((b) => b.classList.contains('sel'));
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { i = (i + 1) % btns.length; } else if (e.code === 'ArrowUp' || e.code === 'KeyW') { i = (i - 1 + btns.length) % btns.length; } else if ((e.code === 'Enter' || e.code === 'Space') && i >= 0) { btns[i].click(); return; } else return;
    btns.forEach((b) => b.classList.remove('sel')); btns[i].classList.add('sel'); this.ui('hover');
  }
  title() {
    const n = this.mount(h(`<div class="menu bg interactive" style="flex-direction:column;justify-content:center;padding-left:7vw">
      <div class="logo">GETAWAY<span>!</span></div><div class="tagline">Drive fast · Steal everything · Never look back</div>
      <div class="press">PRESS ENTER OR CLICK TO PLAY</div><div class="toast">Best with headphones · Keyboard & mouse or gamepad</div></div>`));
    const go = () => { removeEventListener('keydown', k); this.ui('click'); this.flow.onTitleContinue(); };
    const k = (e) => { if (e.code === 'Enter' || e.code === 'Space') go(); }; addEventListener('keydown', k); n.addEventListener('click', go);
  }
  main() {
    const S = G.save; const next = nextMission(S); const first = !Object.keys(S.completed).length;
    const n = this.mount(h(`<div class="menu bg interactive"><div class="mm-left"><div class="logo" style="font-size:96px">GETAWAY<span>!</span></div><div class="tagline">Port Sol · ${new Date().getFullYear()}</div>
      <button class="mbtn primary sel" data-a="play">${first ? 'PLAY' : 'CONTINUE'} <small>${String(next.num).padStart(2, '0')} · ${next.title}</small></button>
      <button class="mbtn" data-a="missions">MISSIONS <small>${Object.keys(S.completed).length}/30 COMPLETE</small></button>
      <button class="mbtn" data-a="free">FREE ROAM <small>PORT SOL, NO RULES</small></button>
      <button class="mbtn" data-a="garage">GARAGE <small>${S.unlockedVehicles.length} CARS</small></button>
      <button class="mbtn" data-a="music">SOUNDTRACK</button>
      <button class="mbtn" data-a="settings">SETTINGS</button>
      <button class="mbtn" data-a="controls">CONTROLS</button></div></div>`));
    n.querySelectorAll('.mbtn').forEach((b) => b.onclick = () => { this.ui('click'); const a = b.dataset.a; if (a === 'play') this.flow.startMission(next); else if (a === 'missions') this.missions(); else if (a === 'free') this.flow.startFreeRoam(); else if (a === 'garage') this.garage(); else if (a === 'music') this.soundtrack(); else if (a === 'settings') this.settings(() => this.main()); else if (a === 'controls') this.controls(() => this.main()); });
  }
  backBtn(n, fn) { const b = n.querySelector('.back'); if (b) b.onclick = () => { this.ui('back'); fn(); }; const esc = (e) => { if (e.code === 'Escape' && this.cur === n) { removeEventListener('keydown', esc); this.ui('back'); fn(); } }; addEventListener('keydown', esc); }
  missions() {
    const S = G.save; let html = `<div class="menu dim interactive"><div class="panel"><button class="back">BACK</button><h2>CAMPAIGN</h2><div class="sub">Thirty jobs. Every one an action movie. Completed missions can be replayed any time.</div>`;
    ACTS.forEach((act, ai) => {
      html += `<h3>${act}</h3><div class="missions">`;
      for (const m of CAMPAIGN.filter((x) => x.act === ai)) { const rec = S.completed[m.id]; const un = isUnlocked(m, S); html += `<div class="mcard ${un ? '' : 'locked'} ${m.impl ? '' : 'soon'}" data-id="${m.id}"><span class="n">${String(m.num).padStart(2, '0')}</span><div class="t">${m.title}</div><div class="d">${m.desc}</div>${rec ? `<div class="rec">BEST ${fmtTime(rec.bestTime).slice(0, -3)} · ${rec.bestScore.toLocaleString()} PTS</div><div class="grade">${rec.grade}</div>` : ''}</div>`; }
      html += '</div>';
    });
    const n = this.mount(h(html + '</div></div>'));
    n.querySelectorAll('.mcard').forEach((c) => c.onclick = () => { const m = CAMPAIGN.find((x) => x.id === c.dataset.id); if (!isUnlocked(m, S)) { this.ui('back'); return; } this.ui('click'); this.flow.startMission(m); });
    this.backBtn(n, () => this.main());
  }
  garage() {
    const S = G.save; let sel = GARAGE_ORDER.find((id) => S.unlockedVehicles.includes(id)) || 'saetta';
    const render = () => {
      const spec = VEHICLES[sel]; const mod = S.vehicleMods[sel] || {}; const col = mod.color ?? spec.colors[0];
      const st = (label, v) => `<div class="stat">${label}<div class="b"><i style="width:${clamp(v, 0.05, 1) * 100}%"></i></div></div>`;
      const n = this.mount(h(`<div class="menu interactive" style="background:linear-gradient(90deg,rgba(5,6,10,.9),rgba(5,6,10,.4) 45%,transparent 70%)"><div class="panel" style="margin:6vh auto auto 4vw;width:min(760px,92vw);background:rgba(10,12,16,.85)"><button class="back">BACK</button><h2>GARAGE</h2><div class="sub">Dez's place, Ironside Docks. Unlock rides by playing the campaign.</div>
        <div class="garage"><div class="list">${GARAGE_ORDER.map((id) => { const v = VEHICLES[id]; const un = S.unlockedVehicles.includes(id); return `<div class="gi ${un ? '' : 'locked'} ${id === sel ? 'sel' : ''}" data-id="${id}">${un ? v.name : '???'}<small>${un ? v.cls : 'LOCKED'}</small></div>`; }).join('')}</div>
        <div class="stats"><h3>${spec.name}</h3>${st('TOP SPEED', spec.top / 100)}${st('ACCELERATION', spec.accel / 14)}${st('GRIP', (spec.grip - 0.7) / 0.65)}${st('TOUGHNESS', spec.hp * (spec.armor || 1) / 500)}${st('WEIGHT', spec.mass / 10000)}
        <h3>PAINT</h3><div class="swatches">${[...new Set([...spec.colors, 0xe8e4da, 0x111111, 0xc0392b, 0x1e3a8a, 0xf39c12, 0x2ecc71, 0x8e44ad, 0xff6bd5, 0x00b3b3])].map((c) => `<div class="swatch ${c === col ? 'sel' : ''}" data-c="${c}" style="background:#${c.toString(16).padStart(6, '0')}"></div>`).join('')}</div>
        <div class="btnrow"><button class="bigbtn" data-a="drive">TAKE IT FOR A SPIN</button></div></div></div></div></div>`));
      n.querySelectorAll('.gi').forEach((g) => g.onclick = () => { if (!S.unlockedVehicles.includes(g.dataset.id)) { this.ui('back'); return; } this.ui('click'); sel = g.dataset.id; this.flow.garagePreview(sel); render(); });
      n.querySelectorAll('.swatch').forEach((s) => s.onclick = () => { this.ui('click'); S.vehicleMods[sel] = { ...(S.vehicleMods[sel] || {}), color: +s.dataset.c }; G.game.saveNow(); this.flow.garagePreview(sel); render(); });
      n.querySelector('[data-a=drive]').onclick = () => { this.ui('click'); this.flow.startFreeRoam(sel); };
      this.backBtn(n, () => { this.flow.endGarage(); this.main(); });
    };
    this.flow.garagePreview(sel); render();
  }
  soundtrack() {
    const S = G.save; const unlocked = (t) => S.tracks.includes(t.id) || Object.keys(S.completed).length * 2 + 2 > TRACKS.indexOf(t);
    const n = this.mount(h(`<div class="menu dim interactive"><div class="panel"><button class="back">BACK</button><h2>SOUNDTRACK</h2><div class="sub">Original music, composed and performed live by the game's procedural sequencer. Intensity layers react to gameplay — try them here.</div>
      <div class="viz">${'<i></i>'.repeat(48)}</div><div class="row"><label>INTENSITY</label><input type="range" min="0" max="4" step="1" value="${G.music.target}" data-k="int"><span id="intl"></span></div>
      <div class="tracks">${TRACKS.map((t) => `<div class="tr ${unlocked(t) ? '' : 'locked'} ${G.music.track === t ? 'playing' : ''}" data-id="${t.id}"><div class="tt">${unlocked(t) ? t.title : '— LOCKED —'}</div><div class="mm">${unlocked(t) ? t.mood + ' · ' + t.bpm + ' BPM' : 'Progress the campaign to unlock'}</div></div>`).join('')}</div></div></div>`));
    const lbl = n.querySelector('#intl'); const names = ['AMBIENT', 'CRUISING', 'POLICE ON YOU', 'PURSUIT', 'SET PIECE'];
    const sl = n.querySelector('[data-k=int]'); const upd = () => { lbl.textContent = names[sl.value]; G.music.setIntensity(+sl.value); this.musicIntensity = +sl.value; }; sl.oninput = upd; upd();
    n.querySelectorAll('.tr').forEach((r) => r.onclick = () => { const t = TRACKS.find((x) => x.id === r.dataset.id); if (!unlocked(t)) return; this.ui('click'); G.music.play(t.id, { intensity: +sl.value }); n.querySelectorAll('.tr').forEach((x) => x.classList.toggle('playing', x === r)); });
    const bars = [...n.querySelectorAll('.viz i')]; const loop = () => { const sp = G.music.spectrum(); if (sp) bars.forEach((b, i) => { b.style.height = (sp[Math.floor(i * 1.6)] / 255 * 100) + '%'; }); this.vizRAF = requestAnimationFrame(loop); }; loop();
    this.backBtn(n, () => { G.music.play('main', { intensity: 2 }); this.main(); });
  }
  settings(back) {
    const s = G.settings; const r = (k, label, min, max, step) => `<div class="row"><label>${label}</label><input type="range" min="${min}" max="${max}" step="${step}" value="${s[k]}" data-k="${k}"></div>`;
    const sel = (k, label, opts) => `<div class="row"><label>${label}</label><select data-k="${k}">${opts.map((o) => `<option ${String(s[k]) === String(o) ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
    const n = this.mount(h(`<div class="menu dim interactive"><div class="panel" style="width:min(720px,92vw)"><button class="back">BACK</button><h2>SETTINGS</h2>
      <h3>Audio</h3>${r('master', 'MASTER', 0, 1, 0.05)}${r('music', 'MUSIC', 0, 1, 0.05)}${r('sfx', 'EFFECTS', 0, 1, 0.05)}
      <h3>Graphics</h3>${sel('quality', 'QUALITY (RESTART)', ['low', 'medium', 'high', 'ultra'])}${sel('shadows', 'SHADOWS (RESTART)', ['true', 'false'])}${sel('bloom', 'BLOOM', ['true', 'false'])}${sel('motionBlurFx', 'SPEED BLUR', ['true', 'false'])}${r('fov', 'FIELD OF VIEW', 55, 95, 1)}${r('pedDensity', 'PEDESTRIAN DENSITY', 0.2, 1.4, 0.1)}${r('trafficDensity', 'TRAFFIC DENSITY', 0.2, 1.4, 0.1)}
      <h3>Controls</h3>${r('sensitivity', 'MOUSE SENSITIVITY', 0.3, 2.5, 0.05)}${sel('invertY', 'INVERT Y', ['false', 'true'])}${r('shake', 'CAMERA SHAKE', 0, 1.5, 0.05)}${sel('units', 'SPEED UNITS', ['kmh', 'mph'])}${sel('subtitles', 'SUBTITLES', ['true', 'false'])}
      </div></div>`));
    n.querySelectorAll('[data-k]').forEach((el) => el.oninput = el.onchange = () => { const k = el.dataset.k; let v = el.value; if (v === 'true' || v === 'false') v = v === 'true'; else if (el.type === 'range') v = +v; s[k] = v; this.flow.applySettings(); });
    this.backBtn(n, back);
  }
  controls(back) {
    const n = this.mount(h(`<div class="menu dim interactive"><div class="panel" style="width:min(820px,92vw)"><button class="back">BACK</button><h2>CONTROLS</h2>
      <h3>On foot</h3><div class="controls"><kbd>W A S D</kbd> move<br><kbd>Shift</kbd> sprint<br><kbd>Space</kbd> jump · vault · climb ledges<br><kbd>C</kbd> crouch (while sprinting: slide)<br><kbd>Mouse</kbd> look · <kbd>RMB</kbd> aim · <kbd>LMB</kbd> fire<br><kbd>R</kbd> reload · <kbd>V</kbd> melee<br><kbd>1-5</kbd> / <kbd>Q</kbd> / wheel weapons<br><kbd>F</kbd> enter / hijack vehicle (also from a moving roof)<br><kbd>E</kbd> interact</div>
      <h3>Driving</h3><div class="controls"><kbd>W</kbd> throttle · <kbd>S</kbd> brake / reverse<br><kbd>A D</kbd> steer<br><kbd>Space</kbd> handbrake (drift)<br><kbd>Shift</kbd> boost — earn it with stunts<br><kbd>W S A D</kbd> in the air: pitch & roll<br><kbd>RMB + LMB</kbd> drive-by<br><kbd>C</kbd> camera views · <kbd>B</kbd> look back<br><kbd>H</kbd> horn · <kbd>F</kbd> exit (at speed: bail out!)<br><kbd>E</kbd> flip an overturned car<br><kbd>Esc</kbd> pause</div>
      <h3>Gamepad</h3><div class="controls">RT/LT throttle/brake · L-stick steer · A handbrake · B boost · Y enter/exit · R-stick look · LT/RT aim/fire on foot</div></div></div>`));
    this.backBtn(n, back);
  }
  pause() {
    const inMission = !!(G.mission && G.mission.def);
    const n = this.mount(h(`<div class="menu dim interactive" style="flex-direction:column;justify-content:center;padding-left:8vw"><div class="logo" style="font-size:80px">PAUSED</div><div class="tagline">${inMission ? String(G.mission.def.num).padStart(2, '0') + ' · ' + G.mission.def.title : 'FREE ROAM'}</div>
      <div style="width:420px"><button class="mbtn sel" data-a="resume">RESUME</button>${inMission ? '<button class="mbtn" data-a="retry">RETRY CHECKPOINT</button><button class="mbtn" data-a="restart">RESTART MISSION</button>' : ''}<button class="mbtn" data-a="settings">SETTINGS</button><button class="mbtn" data-a="controls">CONTROLS</button><button class="mbtn" data-a="quit">QUIT TO MENU</button></div></div>`));
    n.querySelectorAll('.mbtn').forEach((b) => b.onclick = () => { this.ui('click'); const a = b.dataset.a; if (a === 'resume') this.flow.resume(); else if (a === 'retry') this.flow.retry(); else if (a === 'restart') this.flow.restart(); else if (a === 'settings') this.settings(() => this.pause()); else if (a === 'controls') this.controls(() => this.pause()); else if (a === 'quit') this.flow.quitToMenu(); });
  }
  results(r) {
    const next = CAMPAIGN[r.def.num]; const hasNext = next && next.impl;
    const n = this.mount(h(`<div class="menu dim interactive"><div class="panel results" style="width:min(820px,92vw)"><div class="grade">${r.grade}</div><div class="tagline" style="margin:0">MISSION ${String(r.def.num).padStart(2, '0')} COMPLETE</div><h2 style="font-size:64px">${r.def.title}</h2>
      ${r.newBest ? '<div class="best">★ NEW PERSONAL BEST ★</div>' : ''}
      <table><tr><td>TIME</td><td>${r.timeStr}${r.newTime ? ' ★' : ''}</td></tr><tr><td>STYLE POINTS</td><td>${r.style.toLocaleString()}</td></tr><tr><td>BIGGEST AIR</td><td>${r.air.toFixed(1)}s</td></tr><tr><td>NEAR MISSES</td><td>${r.nearMiss}</td></tr><tr><td>TAKEDOWNS</td><td>${r.takedowns}</td></tr><tr><td>ENEMIES DOWNED</td><td>${r.kills}</td></tr><tr><td>CHECKPOINT RETRIES</td><td>${r.retries}</td></tr><tr><td><b>TOTAL SCORE</b></td><td><b>${r.score.toLocaleString()}</b></td></tr></table>
      ${r.def.unlocks ? `<h3>Unlocked</h3><div class="sub">${r.def.unlocks.map((u) => u.vehicle ? 'Garage: ' + VEHICLES[u.vehicle].name : 'Track: ' + (TRACKS.find((t) => t.id === u.track) || {}).title).join(' · ')}</div>` : ''}
      <div class="btnrow"><button class="bigbtn" data-a="replay">REPLAY</button>${hasNext ? '<button class="bigbtn" data-a="next">NEXT MISSION</button>' : ''}<button class="bigbtn alt" data-a="free">FREE ROAM</button><button class="bigbtn alt" data-a="menu">MENU</button></div>
      ${!hasNext ? '<div class="sub" style="margin-top:16px">Mission 02 "BANKROLL" and beyond are in development — the open world is yours in the meantime.</div>' : ''}</div></div>`));
    n.querySelectorAll('.bigbtn').forEach((b) => b.onclick = () => { this.ui('click'); const a = b.dataset.a; if (a === 'replay') this.flow.startMission(r.def); else if (a === 'next') this.flow.startMission(next); else if (a === 'free') this.flow.startFreeRoam(); else this.flow.quitToMenu(); });
  }
  fail(reason) {
    const n = this.mount(h(`<div class="menu dim interactive fail" style="flex-direction:column;justify-content:center;align-items:center;text-align:center"><div class="tagline">MISSION FAILED</div><div class="logo" style="font-size:min(11vw,110px);background:none;-webkit-text-fill-color:#ff3b2f;color:#ff3b2f">${reason}</div>
      <div class="btnrow" style="justify-content:center"><button class="bigbtn" data-a="retry">RETRY <small style="font:600 13px Rajdhani">[ENTER]</small></button><button class="bigbtn alt" data-a="restart">RESTART</button><button class="bigbtn alt" data-a="quit">QUIT</button></div></div>`));
    const k = (e) => { if (e.code === 'Enter') { removeEventListener('keydown', k); this.flow.retry(); } }; addEventListener('keydown', k);
    n.querySelectorAll('.bigbtn').forEach((b) => b.onclick = () => { removeEventListener('keydown', k); this.ui('click'); const a = b.dataset.a; if (a === 'retry') this.flow.retry(); else if (a === 'restart') this.flow.restart(); else this.flow.quitToMenu(); });
  }
  intro(def) { const n = h(`<div class="intro"><div class="act">${ACTS[def.act]}</div><div class="num">${String(def.num).padStart(2, '0')}</div><div class="ttl">${def.title}</div><div class="skip"><kbd>ENTER</kbd> skip</div></div>`); this.root.appendChild(n); this.introEl = n; }
  hideIntro() { if (this.introEl) { this.introEl.remove(); this.introEl = null; } }
}
