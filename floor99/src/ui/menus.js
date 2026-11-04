// Panels: floor select, loadout, settings, soundtrack, credits, and the lounge tabs.
import { FLOORS, PLANNED, SHOP, CHALLENGES, PLAYABLE_ORDER } from '../config.js';
import { WEAPONS } from '../game/weapons.js';
import { LOOKS } from '../game/playerModel.js';
import { TRACKS, SOUNDTRACK } from '../audio/tracks.js';

const $ = (id) => document.getElementById(id);
const fmtTime = (s) => s ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '—';
const stars = (n) => '★'.repeat(n) + '<span style="color:#444">' + '★'.repeat(3 - n) + '</span>';

export function bindHover(root, audio) {
  root.querySelectorAll('button, .fl.playable, .wcard, .track, .sw, .tab').forEach((b) => {
    if (b._hov) return; b._hov = true;
    b.addEventListener('mouseenter', () => audio.play('uiHover'));
  });
}

// ------------------------------------------------------------------ FLOOR SELECT
export function floorSelect(app, el) {
  const S = app.save.data;
  let html = '<div class="floors-grid">';
  for (let f = 1; f <= 99; f++) {
    const def = FLOORS[f];
    const plan = PLANNED[f];
    const done = S.progress.completed[f];
    const unlocked = def && (f === 1 || isUnlocked(app, f));
    let cls = 'fl', small = '';
    if (def) { cls += unlocked ? ' playable' : ' locked'; small = unlocked ? (done ? 'REPLAY' : 'PLAY') : 'LOCKED'; if (done) cls += ' done'; }
    else if (plan) { cls += ' sig'; small = 'IN PROD.'; }
    else small = '';
    html += `<div class="${cls}" data-f="${f}">${f}<small>${small}</small></div>`;
  }
  html += '</div>';
  html += `<div class="fl-legend"><span><i style="background:#ff2d6f"></i>PLAYABLE</span><span><i style="background:#3dff9a"></i>COMPLETED</span><span><i style="background:#8a6"></i>SIGNATURE FLOOR — DESIGNED, NOT YET BUILT</span><span><i style="background:#333"></i>NOT YET BUILT</span></div>`;
  html += `<div class="fl-detail" id="flDetail">Hover a floor. This build contains <b>${Object.keys(FLOORS).length}</b> complete, playable floors (${Object.keys(FLOORS).join(', ')}). Every other floor is honestly marked as not yet built.</div>`;
  if (CHALLENGES.length) {
    html += '<h3 class="section-h">CHALLENGE VARIATIONS</h3><div class="opt-row" id="chal">';
    const total = app.save.totalStars();
    for (const c of CHALLENGES) {
      const ok = total >= c.stars;
      const on = S.challenges.includes(c.id);
      html += `<button data-c="${c.id}" class="${on ? 'on' : ''}" ${ok ? '' : 'disabled style="opacity:.35"'} title="${c.desc}">${c.name}${ok ? '' : ` (${c.stars}★)`}</button>`;
    }
    html += `</div><div class="note">Unlock variations by earning stars (you have ${total}★). Active variations apply to the next floor you play.</div>`;
  }
  el.innerHTML = html;
  el.querySelectorAll('.fl').forEach((d) => {
    const f = +d.dataset.f;
    d.addEventListener('mouseenter', () => {
      const def = FLOORS[f], plan = PLANNED[f], rec = S.records[f];
      const det = $('flDetail');
      if (def) det.innerHTML = `<h3>FLOOR ${f} — ${def.name}</h3>${def.tagline}<br>${rec ? `Best: ${rec.bestScore.toLocaleString()} pts · ${fmtTime(rec.bestTime)} · ${stars(rec.stars)}` : (d.classList.contains('locked') ? 'Complete the previous floor to unlock.' : 'Not yet completed.')}`;
      else if (plan) det.innerHTML = `<h3>FLOOR ${f} — ${plan.name}</h3>${plan.tagline}<br><span style="color:#ff2d6f">IN PRODUCTION — designed, not built in this version.</span>`;
      else det.innerHTML = `<h3>FLOOR ${f}</h3><span style="color:#888">Not yet built.</span>`;
    });
    if (d.classList.contains('playable')) d.addEventListener('click', () => { app.audio.play('uiClick'); app.startFloor(f); });
  });
  el.querySelectorAll('#chal button').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.c; const a = S.challenges;
    const i = a.indexOf(id); if (i >= 0) a.splice(i, 1); else a.push(id);
    b.classList.toggle('on'); app.save.write(); app.audio.play('uiClick');
  }));
  bindHover(el, app.audio);
}
export function isUnlocked(app, f) {
  if (f === 1) return true;
  const done = app.save.data.progress.completed;
  if (done[f]) return true;
  const i = PLAYABLE_ORDER.indexOf(f);
  return i > 0 && !!done[PLAYABLE_ORDER[i - 1]];
}

// ------------------------------------------------------------------ LOADOUT
export function loadout(app, el) {
  const S = app.save.data;
  const guns = Object.keys(WEAPONS).filter((id) => WEAPONS[id].kind === 'gun' || WEAPONS[id].kind === 'gravity');
  let html = '<h3 class="section-h">GUNS — PICK UP TO THREE (keys 1 · 2 · 3)</h3><div class="cards">';
  for (const id of guns) {
    const d = WEAPONS[id];
    const un = S.unlocked.weapons.includes(id);
    const slot = S.loadout.guns.indexOf(id);
    html += `<div class="wcard ${slot >= 0 ? 'on' : ''} ${un ? '' : 'locked'}" data-g="${id}">${slot >= 0 ? `<div class="slot">${slot + 1}</div>` : ''}<div class="kind">${un ? d.short : 'LOCKED'}</div><h4>${un ? d.name : '???'}</h4><p>${un ? d.blurb : unlockHint(id)}</p></div>`;
  }
  html += '</div><h3 class="section-h">MELEE (key F)</h3><div class="cards">';
  for (const id of ['blades', 'hammer']) {
    const d = WEAPONS[id];
    const un = S.unlocked.melee.includes(id);
    html += `<div class="wcard ${S.loadout.melee === id ? 'on' : ''} ${un ? '' : 'locked'}" data-m="${id}"><div class="kind">${un ? 'MELEE' : 'LOCKED'}</div><h4>${un ? d.name : '???'}</h4><p>${un ? d.blurb : unlockHint(id)}</p></div>`;
  }
  html += '</div><h3 class="section-h">MODS (equip up to 3)</h3><div class="cards">';
  const owned = SHOP.filter((s) => s.type === 'mod' && S.unlocked.shop.includes(s.id));
  if (!owned.length) html += '<div class="note">Buy mods in the Lounge shop with FANS earned on each floor.</div>';
  for (const m of owned) html += `<div class="wcard ${S.loadout.mods.includes(m.key) ? 'on' : ''}" data-mod="${m.key}"><div class="kind">MOD</div><h4>${m.name}</h4><p>${m.desc}</p></div>`;
  html += '</div>';
  el.innerHTML = html;
  el.querySelectorAll('[data-g]').forEach((c) => c.addEventListener('click', () => {
    const id = c.dataset.g;
    if (!S.unlocked.weapons.includes(id)) { app.audio.play('uiDeny'); return; }
    const g = S.loadout.guns;
    const i = g.indexOf(id);
    if (i >= 0) { if (g.length > 1) g.splice(i, 1); } else { if (g.length >= 3) g.shift(); g.push(id); }
    app.save.write(); app.audio.play('uiClick'); loadout(app, el);
  }));
  el.querySelectorAll('[data-m]').forEach((c) => c.addEventListener('click', () => {
    const id = c.dataset.m;
    if (!S.unlocked.melee.includes(id)) { app.audio.play('uiDeny'); return; }
    S.loadout.melee = id; app.save.write(); app.audio.play('uiClick'); loadout(app, el);
  }));
  el.querySelectorAll('[data-mod]').forEach((c) => c.addEventListener('click', () => {
    const k = c.dataset.mod; const a = S.loadout.mods;
    const i = a.indexOf(k); if (i >= 0) a.splice(i, 1); else { if (a.length >= 3) a.shift(); a.push(k); }
    app.save.write(); app.audio.play('uiClick'); loadout(app, el);
  }));
  bindHover(el, app.audio);
}
function unlockHint(id) {
  return { shotgun: 'Found on Floor 1.', rifle: 'Awarded for completing Floor 1.', gravity: 'Found on Floor 4.', rail: 'Found on Floor 12.', hammer: 'Awarded for completing Floor 4.' }[id] || 'Keep climbing.';
}

// ------------------------------------------------------------------ SETTINGS
export function settings(app, el) {
  const s = app.save.data.settings;
  const row = (label, input) => `<div class="set"><label>${label}</label>${input}</div>`;
  const range = (k, min, max, step) => `<span style="display:flex;align-items:center;gap:8px"><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${s[k]}"><span class="val" id="v_${k}">${s[k]}</span></span>`;
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button data-k="${k}" data-v="${v}" class="${String(s[k]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  el.innerHTML = `<div class="settings-grid">
    <div>
      <h3 class="section-h">VIDEO</h3>
      ${row('Quality', seg('quality', [['low', 'LOW'], ['medium', 'MED'], ['high', 'HIGH'], ['ultra', 'ULTRA']]))}
      ${row('Field of view', range('fov', 60, 100, 1))}
      ${row('Screen shake', range('shake', 0, 1.5, 0.1))}
      ${row('Damage numbers', seg('damageNumbers', [[true, 'ON'], [false, 'OFF']]))}
      <h3 class="section-h">CONTROLS</h3>
      ${row('Look sensitivity', range('sensitivity', 0.2, 3, 0.05))}
      ${row('Invert Y', seg('invertY', [[false, 'OFF'], [true, 'ON']]))}
      ${row('Difficulty', seg('difficulty', [['easy', 'STORY'], ['normal', 'NORMAL'], ['hard', 'BRUTAL']]))}
    </div>
    <div>
      <h3 class="section-h">AUDIO</h3>
      ${row('Master', range('master', 0, 1, 0.05))}
      ${row('Music', range('music', 0, 1, 0.05))}
      ${row('Effects & crowd', range('sfx', 0, 1, 0.05))}
      ${row('Voice', range('voiceVol', 0, 1, 0.05))}
      ${row('Spoken host voice (browser TTS)', seg('voice', [[true, 'ON'], [false, 'OFF']]))}
      <div class="note" style="margin-top:12px">Trackpad tip: two-finger click aims; use Look sensitivity ~1.4 on a MacBook. Press Esc for the pause menu at any time.</div>
      <h3 class="section-h">DATA</h3>
      <button class="btn" id="resetSave">RESET ALL PROGRESS</button>
    </div>
  </div>`;
  el.querySelectorAll('input[type=range]').forEach((i) => i.addEventListener('input', () => {
    const k = i.dataset.k; s[k] = parseFloat(i.value); $('v_' + k).textContent = s[k]; app.applySettings(); app.save.write();
  }));
  el.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.k; let v = b.dataset.v; if (v === 'true') v = true; else if (v === 'false') v = false;
    s[k] = v; app.applySettings(k); app.save.write(); app.audio.play('uiClick'); settings(app, el);
  }));
  $('resetSave').addEventListener('click', () => { if (confirm('Erase all FLOOR 99 progress?')) { app.save.reset(); app.applySettings(); app.audio.play('uiBack'); app.showMenu(); } });
  bindHover(el, app.audio);
}

// ------------------------------------------------------------------ SOUNDTRACK
export function soundtrack(app, el) {
  const S = app.save.data;
  const playing = app.music.track?.id;
  let html = `<div class="note">Original soundtrack composed for FLOOR 99 and synthesized live in your browser. Every in-game track is adaptive — switch the mix to hear how it responds to the action.</div>
  <div class="mix" id="mix">${['calm', 'combat', 'vote', 'disaster', 'boss', 'full'].map((m) => `<button data-mix="${m}" class="${app.music.state === m ? 'on' : ''}">${m.toUpperCase()}</button>`).join('')}</div><div class="tracks">`;
  SOUNDTRACK.forEach((tr, i) => {
    const T = TRACKS[tr.id];
    const un = !tr.unlock || S.unlocked.tracks.includes(tr.id) || S.progress.completed[tr.unlock] || tr.unlock === 1 && S.progress.started;
    html += `<div class="track ${playing === tr.id ? 'on' : ''} ${un ? '' : 'locked'}" data-t="${tr.id}"><div class="no">${String(i + 1).padStart(2, '0')}</div><div class="tt"><b>${un ? T.title : '???'}</b><span>${un ? T.subtitle + ' · ' + T.bpm + ' BPM' : 'Unlock by reaching floor ' + tr.unlock}</span></div><div class="eq"><i></i><i style="animation-delay:.2s"></i><i style="animation-delay:.4s"></i><i style="animation-delay:.1s"></i></div></div>`;
  });
  html += '</div>';
  el.innerHTML = html;
  el.querySelectorAll('.track').forEach((t) => t.addEventListener('click', () => {
    if (t.classList.contains('locked')) { app.audio.play('uiDeny'); return; }
    app.music.play(t.dataset.t, 'full'); app.audio.play('uiClick'); soundtrack(app, el);
  }));
  el.querySelectorAll('[data-mix]').forEach((b) => b.addEventListener('click', () => { app.music.setState(b.dataset.mix, 0.8); soundtrack(app, el); }));
  bindHover(el, app.audio);
}

// ------------------------------------------------------------------ CREDITS
export function credits(app, el) {
  el.innerHTML = `<div class="credits">
  <h3>FLOOR 99</h3>
  A cinematic third-person action game show. Built from scratch in JavaScript with three.js — every model, animation, texture, sound effect and piece of music is procedural and generated in your browser.
  <h3>CAST</h3>
  <b>MR. HALO</b> — your host. An artificial intelligence with a bow tie.<br>
  <b>IRIS</b> — former arena engineer. Encrypted channel. Trust pending.<br>
  <b>CONTESTANT 99</b> — you.
  <h3>ORIGINAL SOUNDTRACK</h3>
  "The Audience Wants A Show" · "Welcome To The Show" · "Assembly Line" · "Pressure Drop" · "Mr. Halo Will See You Now" · "Elevator To Heaven". Composed for this game; performed live by a WebAudio synthesizer orchestra.
  <h3>TECHNOLOGY</h3>
  three.js r170 (MIT). Fonts: Anton and Chakra Petch (SIL Open Font License). Custom physics, flow-field navigation, procedural animation and audio engine.
  <h3>STATUS OF THIS BUILD</h3>
  Playable floors: <b>1 — Welcome To The Show</b>, <b>4 — The Factory</b>, <b>12 — Aquarium Apocalypse</b>. Signature floors 23, 38, 51, 76, 90 and 99 are designed and listed as "in production"; they are not playable in this version.
  <h3>NO ROBOTS WERE HARMED</h3>
  Several hundred were, actually. They were insured.
  </div>`;
}

// ------------------------------------------------------------------ LOUNGE TABS
export function loungeTab(app, tab, el) {
  const S = app.save.data;
  if (tab === 'next') {
    const nf = app.nextFloor();
    const def = FLOORS[nf];
    const rec = S.records;
    el.innerHTML = def ? `<h3 class="section-h">NEXT UP</h3><div style="font-family:var(--head);font-size:64px;line-height:1">FLOOR ${nf}</div><div style="font-family:var(--head);font-size:30px;letter-spacing:2px;color:var(--pink)">${def.name}</div><p class="note" style="margin-top:10px;font-size:15px">${def.tagline}</p>
      <h3 class="section-h">YOUR RUN</h3><table class="rec-table"><tr><th>FLOOR</th><th>BEST SCORE</th><th>TIME</th><th>RATING</th></tr>${Object.keys(FLOORS).map((f) => `<tr><td>${f} — ${FLOORS[f].name}</td><td>${rec[f] ? rec[f].bestScore.toLocaleString() : '—'}</td><td>${rec[f] ? fmtTime(rec[f].bestTime) : '—'}</td><td class="stars">${rec[f] ? stars(rec[f].stars) : ''}</td></tr>`).join('')}</table>
      <p class="note" style="margin-top:12px">Floors beyond 12 are still in production. Completed floors can be replayed from Floor Select.</p>`
      : `<h3 class="section-h">THE ELEVATOR IS... UNDER CONSTRUCTION</h3><p class="note" style="font-size:15px">You have cleared every floor built so far. Floors 23, 38, 51, 76, 90 and 99 are designed and in production. Replay floors to raise your ratings, buy mods, and try Challenge Variations.</p>`;
  } else if (tab === 'loadout') loadout(app, el);
  else if (tab === 'wardrobe') {
    const L = S.look, U = S.unlocked.cosmetics;
    const sw = (slot) => LOOKS[slot].map((c, i) => `<div class="sw ${L[slot] === i ? 'on' : ''}" data-s="${slot}" data-i="${i}" style="background:${c};${U[slot].includes(i) ? '' : 'opacity:.2;cursor:not-allowed'}" title="${U[slot].includes(i) ? '' : 'Buy in the shop'}"></div>`).join('');
    el.innerHTML = `<h3 class="section-h">JUMPSUIT</h3><div class="swatches">${sw('suit')}</div>
      <h3 class="section-h">ARMOR</h3><div class="swatches">${sw('armor')}</div>
      <h3 class="section-h">VISOR GLOW</h3><div class="swatches">${sw('visor')}</div>
      <h3 class="section-h">HELMET</h3><div class="opt-row">${LOOKS.helmet.map((h, i) => `<button data-s="helmet" data-i="${i}" class="${L.helmet === i ? 'on' : ''}" ${U.helmet.includes(i) ? '' : 'disabled style="opacity:.3"'}>${h}</button>`).join('')}</div>
      <p class="note">Your contestant models every change live on the pedestal. Locked looks are sold in the shop.</p>`;
    el.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => {
      const slot = b.dataset.s, i = +b.dataset.i;
      if (!U[slot].includes(i)) { app.audio.play('uiDeny'); return; }
      L[slot] = i; app.save.write(); app.audio.play('uiClick'); app.lounge.setLook(L); app.lounge.spin = 0.3; loungeTab(app, tab, el);
    }));
  } else if (tab === 'shop') {
    el.innerHTML = `<div class="note">Spend FANS earned from your ratings. Mods equip from the Loadout tab.</div><div class="cards" style="margin-top:10px">${SHOP.map((it) => {
      const owned = S.unlocked.shop.includes(it.id);
      return `<div class="wcard ${owned ? 'on' : ''}" data-buy="${it.id}"><div class="kind">${it.type === 'mod' ? 'MOD' : 'COSMETIC'}</div><h4>${it.name}</h4><p>${it.desc || 'Look fabulous on camera.'}</p><div class="price">${owned ? 'OWNED' : it.price + ' FANS'}</div></div>`;
    }).join('')}</div>`;
    el.querySelectorAll('[data-buy]').forEach((c) => c.addEventListener('click', () => {
      const it = SHOP.find((s) => s.id === c.dataset.buy);
      if (S.unlocked.shop.includes(it.id)) return;
      if (S.fans < it.price) { app.audio.play('uiDeny'); return; }
      S.fans -= it.price;
      S.unlocked.shop.push(it.id);
      if (it.type === 'cosmetic') { S.unlocked.cosmetics[it.slot].push(it.idx); S.look[it.slot] = it.idx; app.lounge.setLook(S.look); }
      if (it.type === 'mod' && S.loadout.mods.length < 3) S.loadout.mods.push(it.key);
      app.save.write(); app.audio.play('purchase'); app.updateFans(); loungeTab(app, tab, el);
    }));
  } else if (tab === 'records') {
    const rows = Object.keys(FLOORS).map((f) => { const r = S.records[f]; return `<tr><td>${f}</td><td>${FLOORS[f].name}</td><td>${r ? r.plays : 0}</td><td>${r ? r.bestScore.toLocaleString() : '—'}</td><td>${r ? fmtTime(r.bestTime) : '—'}</td><td>${r ? r.bestCombo : '—'}</td><td>${r ? Math.round(r.accuracy * 100) + '%' : '—'}</td><td class="stars">${r ? stars(r.stars) : ''}</td></tr>`; }).join('');
    el.innerHTML = `<h3 class="section-h">REPLAY RECORDS</h3><table class="rec-table"><tr><th>#</th><th>FLOOR</th><th>PLAYS</th><th>BEST</th><th>FASTEST</th><th>COMBO</th><th>ACC.</th><th>RATING</th></tr>${rows}</table>
      <p class="note" style="margin-top:12px">Ratings: ★ complete · ★★ score target · ★★★ score target without dying. Replay any completed floor from Floor Select.</p>`;
  } else if (tab === 'jukebox') soundtrack(app, el);
  else if (tab === 'challenges') floorSelect(app, el);
  bindHover(el, app.audio);
}
