/* BeatLab — the studio UI: transport, step sequencer, piano roll, mixer, song mode, presets, save/export. */
(function () {
  const BL = window.BL;
  const T = BL.theory, S = BL.sounds, E = BL.engine, M = BL.magic;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LETTERS = 'ABCD';
  const STORE_KEY = 'beatlab.project.v1';

  const ui = {
    tab: 'roll', sel: null, tool: 'draw', brush: 2, chordMode: false, kbOct: 0,
    recording: false, labSample: null, labAuto: true, labCrop: false, playStep: -1, lastEv: null,
    chopBrush: {},
  };
  let P = null;
  const undoStack = [], redoStack = [];

  // ---------- project model ----------
  const uid = () => 't' + Math.random().toString(36).slice(2, 9);
  const nSteps = () => P.bars * 16;
  const curPat = () => P.patterns[P.current];

  function newProject(o) {
    return Object.assign({
      v: 1, name: 'My beat', bpm: 140, key: 0, scale: 'minor', swing: 0, bars: 2, current: 0,
      songMode: false, song: [0], master: { vol: 0.85, punch: 0.5, lofi: false },
      tracks: [], patterns: LETTERS.split('').map((n) => ({ name: n, data: {} })), samples: {},
    }, o || {});
  }

  function catOf(track) {
    if (track.type === 'drum') return (S.DRUM_BY_ID[track.sound] || {}).cat || 'Perc';
    if (track.type === 'sample') return 'Sample';
    return (S.INSTRUMENTS[track.inst] || {}).bass ? '808' : 'Melody';
  }
  const CAT_COLORS = {
    Kick: '#ff453a', Snare: '#ff9f0a', Clap: '#ffb340', 'Hi-Hat': '#ffd60a', 'Open Hat': '#c7d93a',
    Perc: '#30d158', FX: '#64d2ff', Melody: '#bf5af2', '808': '#ff375f', Sample: '#40c8e0',
  };
  const colorOf = (t) => CAT_COLORS[catOf(t)] || '#aaa';

  function makeTrack(type, o) {
    const t = Object.assign({ id: uid(), type, name: '', vol: 0.8, pan: 0, rev: 0, mute: false, solo: false }, o || {});
    if (type === 'drum') { t.sound = t.sound || 'kick_trap'; t.pitch = t.pitch || 0; t.name = t.name || S.DRUM_BY_ID[t.sound].name; }
    if (type === 'synth') { t.inst = t.inst || 'piano'; t.octave = t.octave || 0; t.name = t.name || S.INSTRUMENTS[t.inst].name; }
    if (type === 'sample') { t.mode = t.mode || 'loop'; t.name = t.name || 'Sample'; }
    return t;
  }

  /** get (and lazily create / resize) a track's data in a pattern */
  function patData(pat, t) {
    const n = nSteps();
    let d = pat.data[t.id];
    if (!d) {
      if (t.type === 'drum') d = { steps: new Array(n).fill(0), rolls: new Array(n).fill(1) };
      else if (t.type === 'synth') d = { notes: [] };
      else d = { steps: new Array(n).fill(-1), on: true };
      pat.data[t.id] = d;
    }
    if (d.steps && d.steps.length !== n) {
      const fill = t.type === 'drum' ? 0 : -1;
      d.steps = Array.from({ length: n }, (_, i) => (i < d.steps.length ? d.steps[i] : fill));
      if (d.rolls) d.rolls = Array.from({ length: n }, (_, i) => (i < d.rolls.length ? d.rolls[i] : 1));
    }
    if (t.type === 'sample' && !d.steps) d.steps = new Array(n).fill(-1);
    return d;
  }

  // ---------- edits, undo, save ----------
  function snapshot() {
    undoStack.push(JSON.stringify(P));
    if (undoStack.length > 100) undoStack.shift();
    redoStack.length = 0;
  }
  function changed(opts) {
    opts = opts || {};
    scheduleSave();
    E.refreshMix();
    if (!opts.noRender) renderAll();
  }
  function edit(fn, opts) {
    snapshot();
    fn(P);
    changed(opts);
  }
  function undo() {
    if (!undoStack.length) return toast('Nothing to undo.');
    redoStack.push(JSON.stringify(P));
    P = JSON.parse(undoStack.pop());
    afterLoad(false);
  }
  function redo() {
    if (!redoStack.length) return toast('Nothing to redo.');
    undoStack.push(JSON.stringify(P));
    P = JSON.parse(redoStack.pop());
    afterLoad(false);
  }
  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(P)); } catch (e) { /* storage blocked */ }
    }, 400);
  }

  // ---------- presets ----------
  function projectFromPreset(pr) {
    const p = newProject({ name: pr.name, bpm: pr.bpm, key: pr.key, scale: pr.scale, swing: pr.swing || 0, bars: pr.bars || 2 });
    p.master.lofi = !!pr.lofi;
    const prev = P;
    P = p; // helpers below read P
    const smap = {};
    for (const [k, sc] of Object.entries(pr.samples || {})) {
      const meta = S.SAMPLE_BY_ID[sc.builtin];
      const id = 'smp_' + sc.builtin;
      const cfg = {
        id, name: meta.name, builtin: sc.builtin, speed: 1, keepPitch: false, semis: 0, reverse: false,
        chops: sc.chops || 8, chopMode: 'equal', bpm: meta.bpm, keyRoot: meta.root, keyMode: T.isMinorish(meta.scale) ? 'minor' : 'major',
      };
      if (sc.fit) cfg.speed = BL.lab.fitSpeed(cfg.bpm, p.bpm);
      if (sc.autoKey) cfg.semis = BL.lab.autoKeySemis(cfg, p);
      p.samples[id] = cfg;
      smap[k] = id;
    }
    const n = p.bars * 16;
    const fit = (arr, fill) => Array.from({ length: n }, (_, i) => (i < arr.length ? arr[i] : arr.length ? arr[i % arr.length] : fill));
    for (const tr of pr.tracks) {
      const t = makeTrack(tr.type, { sound: tr.sound, inst: tr.inst, name: tr.name, vol: tr.vol || 0.8, rev: tr.rev || 0, octave: tr.octave || 0, mode: tr.mode });
      if (tr.type === 'sample') t.sampleId = smap[tr.sample];
      p.tracks.push(t);
      ['A', 'B'].forEach((L, pi) => {
        const src = tr[L] != null ? tr[L] : tr.A;
        let d;
        if (tr.type === 'drum') {
          const row = BL.beats.drumRow(src || '');
          d = { steps: fit(row.steps, 0), rolls: fit(row.rolls, 1) };
        } else if (tr.type === 'synth') {
          d = BL.beats.notes(src || []);
        } else if (tr.mode === 'chop') {
          d = { steps: fit(BL.beats.chopRow(src || '').steps, -1), on: true };
        } else {
          d = { steps: new Array(n).fill(-1), on: tr[L] === false ? false : true };
        }
        p.patterns[pi].data[t.id] = d;
      });
    }
    p.song = (pr.song || 'A').split('').map((c) => LETTERS.indexOf(c));
    P = prev;
    return p;
  }

  function blankProject() {
    const p = newProject({ name: 'New beat', bpm: 140, key: 0, scale: 'minor' });
    P = p;
    [['drum', { sound: 'kick_trap', name: 'Kick' }], ['drum', { sound: 'snare_trap', name: 'Snare' }], ['drum', { sound: 'clap_trap', name: 'Clap' }],
      ['drum', { sound: 'hat_trap', name: 'Hi-Hat' }], ['drum', { sound: 'ohat', name: 'Open Hat' }],
      ['synth', { inst: 'b808', name: '808' }], ['synth', { inst: 'piano', name: 'Keys', rev: 0.3 }]]
      .forEach(([type, o]) => p.tracks.push(makeTrack(type, o)));
    return p;
  }

  let enterTimer = null;
  async function loadProject(p, opts) {
    opts = opts || {};
    if (E.state.playing) E.stop();
    if (opts.undoable && P) snapshot();
    P = p;
    R.rack.classList.remove('enter');
    void R.rack.offsetWidth;
    R.rack.classList.add('enter');
    clearTimeout(enterTimer);
    enterTimer = setTimeout(() => R.rack.classList.remove('enter'), 1200);
    await afterLoad(true);
    if (opts.play) E.play();
  }

  async function afterLoad(full) {
    if (!P.tracks.find((t) => t.id === ui.sel)) {
      const synths = P.tracks.filter((t) => t.type === 'synth');
      const busy = synths.find((t) => { const d = curPat().data[t.id]; return d && d.notes && d.notes.length; });
      ui.sel = (busy || synths[0] || P.tracks[0] || {}).id || null;
    }
    if (ui.labSample && !P.samples[ui.labSample]) ui.labSample = null;
    if (!ui.labSample) ui.labSample = Object.keys(P.samples)[0] || null;
    E.refreshMix();
    renderAll();
    scheduleSave();
    const ids = Object.keys(P.samples);
    if (ids.length && full) {
      showLoading('Spinning up the records…');
      await Promise.all(ids.map((id) => BL.lab.ensure(P, id).catch(() => null)));
      hideLoading();
      renderAll();
    } else if (ids.length) {
      ids.forEach((id) => BL.lab.ensure(P, id).then(() => { drawLanes(); BL.lab.drawWave(); }));
    }
  }

  // ---------- DOM refs ----------
  const R = {};
  function cacheDom() {
    ['playBtn', 'bpm', 'bpmDown', 'bpmUp', 'tapBtn', 'keySel', 'scaleSel', 'swing', 'swingOut', 'barsSeg', 'undoBtn', 'redoBtn',
      'beatsBtn', 'newBtn', 'saveBtn', 'openBtn', 'openFile', 'exportBtn', 'helpBtn', 'patBtns', 'songToggle', 'songStrip',
      'rack', 'addBar', 'dock', 'dockBody', 'hint', 'toast', 'modal', 'pop', 'loading', 'loadingMsg', 'projName', 'toolSeg', 'copyPat', 'clearPat']
      .forEach((id) => { R[id] = document.getElementById(id); });
  }

  // ---------- top bar ----------
  function renderTop() {
    R.bpm.value = P.bpm;
    R.keySel.value = P.key;
    R.scaleSel.value = P.scale;
    R.swing.value = P.swing;
    R.swingOut.textContent = Math.round(P.swing * 100) + '%';
    $$('button', R.barsSeg).forEach((b) => b.classList.toggle('is-on', +b.dataset.bars === P.bars));
    R.playBtn.classList.toggle('is-playing', E.state.playing);
    document.body.classList.toggle('is-playing', E.state.playing);
    document.documentElement.style.setProperty('--beat', (60 / P.bpm).toFixed(3) + 's');
    R.playBtn.setAttribute('aria-label', E.state.playing ? 'Stop' : 'Play');
    R.playBtn.innerHTML = E.state.playing ? '<span class="ico-stop"></span>' : '<span class="ico-play"></span>';
    R.projName.value = P.name;
    $$('button', R.toolSeg).forEach((b) => b.classList.toggle('is-on', b.dataset.tool === ui.tool));
  }

  function bindTop() {
    R.keySel.innerHTML = T.NOTE_NAMES.map((n, i) => `<option value="${i}">${n}</option>`).join('');
    R.scaleSel.innerHTML = Object.entries(T.SCALES).map(([k, s]) => `<option value="${k}">${s.name} · ${s.vibe.split(',')[0]}</option>`).join('');
    R.playBtn.addEventListener('click', togglePlay);
    const setBpm = (v) => {
      v = Math.max(50, Math.min(220, Math.round(v)));
      if (v === P.bpm) return;
      const followers = samplesInSync();
      edit((p) => { p.bpm = v; }, { noRender: true });
      renderTop();
      resyncSamples(followers, true);
    };
    R.bpm.addEventListener('change', () => setBpm(+R.bpm.value || P.bpm));
    R.bpmDown.addEventListener('click', () => setBpm(P.bpm - 1));
    R.bpmUp.addEventListener('click', () => setBpm(P.bpm + 1));
    let taps = [];
    R.tapBtn.addEventListener('click', () => {
      const now = performance.now();
      taps = taps.filter((t) => now - t < 2500);
      taps.push(now);
      if (taps.length >= 3) {
        const iv = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
        setBpm(60000 / iv);
      } else toast('Keep tapping along…');
    });
    R.keySel.addEventListener('change', () => {
      const followers = samplesInSync();
      edit((p) => { p.key = +R.keySel.value; });
      resyncSamples(followers, false);
      toast(`Everything moved to ${T.keyName(P.key, P.scale)}. Notes stay in key automatically.`);
    });
    R.scaleSel.addEventListener('change', () => {
      const followers = samplesInSync();
      edit((p) => { p.scale = R.scaleSel.value; });
      resyncSamples(followers, false);
    });
    R.swing.addEventListener('input', () => { R.swingOut.textContent = Math.round(R.swing.value * 100) + '%'; });
    R.swing.addEventListener('change', () => edit((p) => { p.swing = +R.swing.value; }, { noRender: true }));
    $$('button', R.barsSeg).forEach((b) => b.addEventListener('click', () => setBars(+b.dataset.bars)));
    R.undoBtn.addEventListener('click', undo);
    R.redoBtn.addEventListener('click', redo);
    R.beatsBtn.addEventListener('click', openBeats);
    R.newBtn.addEventListener('click', () => {
      loadProject(blankProject(), { undoable: true });
      toast('Fresh start. Click the squares to add drums, or use ✦ on any track.');
    });
    R.saveBtn.addEventListener('click', saveProjectFile);
    R.openBtn.addEventListener('click', () => R.openFile.click());
    R.openFile.addEventListener('change', () => { if (R.openFile.files[0]) openProjectFile(R.openFile.files[0]); R.openFile.value = ''; });
    R.exportBtn.addEventListener('click', openExport);
    R.helpBtn.addEventListener('click', openHelp);
    R.projName.addEventListener('change', () => edit((p) => { p.name = R.projName.value.trim() || 'My beat'; }, { noRender: true }));
    $$('button', R.toolSeg).forEach((b) => b.addEventListener('click', () => { ui.tool = b.dataset.tool; renderTop(); }));
  }

  /** samples that currently match tempo / key, so they can keep matching after a change */
  function samplesInSync() {
    return Object.values(P.samples).map((c) => ({
      id: c.id,
      tempo: c.bpm && Math.abs(BL.lab.fitSpeed(c.bpm, P.bpm) - c.speed) < 0.01,
      key: c.keyRoot != null && Math.abs(BL.lab.autoKeySemis(c, P) - (c.semis || 0)) < 0.05,
    }));
  }
  let resyncTimer = null;
  function resyncSamples(list, delay) {
    clearTimeout(resyncTimer);
    const run = () => {
      let any = false;
      list.forEach((f) => {
        const c = P.samples[f.id];
        if (!c) return;
        if (f.tempo) { c.speed = BL.lab.fitSpeed(c.bpm, P.bpm); any = true; }
        if (f.key || f.tempo) { c.semis = BL.lab.autoKeySemis(c, P); any = true; }
      });
      if (!any) return;
      scheduleSave();
      Object.keys(P.samples).forEach((id) => BL.lab.ensure(P, id).then(() => { drawLanes(); if (ui.tab === 'lab') BL.lab.render(); }));
    };
    if (delay) resyncTimer = setTimeout(run, 350); else run();
  }

  function setBars(n) {
    if (n === P.bars) return;
    const old = P.bars * 16;
    edit((p) => {
      p.bars = n;
      const nn = n * 16;
      for (const pat of p.patterns) {
        for (const t of p.tracks) {
          const d = pat.data[t.id];
          if (!d) continue;
          if (d.steps) {
            const fill = t.type === 'drum' ? 0 : -1;
            d.steps = Array.from({ length: nn }, (_, i) => (i < old ? d.steps[i] : d.steps[i % old] != null ? d.steps[i % old] : fill));
          }
          if (d.rolls) d.rolls = Array.from({ length: nn }, (_, i) => (i < old ? d.rolls[i] : d.rolls[i % old] || 1));
          if (d.notes) {
            if (nn > old) {
              const extra = [];
              for (let off = old; off < nn; off += old) d.notes.forEach((x) => { if (x.s + off < nn) extra.push(Object.assign({}, x, { s: x.s + off })); });
              d.notes = d.notes.concat(extra);
            } else d.notes = d.notes.filter((x) => x.s < nn).map((x) => Object.assign(x, { l: Math.min(x.l, nn - x.s) }));
          }
        }
      }
    });
    toast(n * 16 > old ? `Loop is now ${n} bars. Your pattern was copied to fill it.` : `Loop is now ${n} bar${n > 1 ? 's' : ''}.`);
  }

  function togglePlay() {
    if (E.state.playing) E.stop(); else E.play(P.songMode ? songStartIdx() : 0);
    renderTop();
  }
  function songStartIdx() { return 0; }

  // ---------- pattern bar & song ----------
  function renderPatBar() {
    R.patBtns.innerHTML = LETTERS.split('').map((L, i) => {
      const used = Object.values(P.patterns[i].data).some((d) => (d.notes && d.notes.length) || (d.steps && d.steps.some((v) => v > 0)));
      return `<button class="pat ${P.current === i ? 'is-on' : ''} ${used ? 'has' : ''}" data-pat="${i}" data-hint="Pattern ${L}. Each pattern is its own loop. Click to edit it.">${L}</button>`;
    }).join('');
    $$('[data-pat]', R.patBtns).forEach((b) => b.addEventListener('click', () => { P.current = +b.dataset.pat; scheduleSave(); renderAll(); }));
    R.songToggle.classList.toggle('is-on', P.songMode);
    R.songToggle.setAttribute('aria-pressed', P.songMode);
    R.songStrip.innerHTML = P.song.map((pi, i) => `<button class="blk" data-blk="${i}" style="--c:${['#0a84ff', '#bf5af2', '#30d158', '#ff9f0a'][pi]}" data-hint="Click to change which pattern plays here. Right-click (or long-press) to remove.">${LETTERS[pi]}</button>`).join('') +
      `<button class="blk blk-add" id="blkAdd" data-hint="Add another block to your song.">+</button>`;
    $$('[data-blk]', R.songStrip).forEach((b) => {
      const i = +b.dataset.blk;
      b.addEventListener('click', () => edit((p) => { p.song[i] = (p.song[i] + 1) % 4; }));
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); if (P.song.length > 1) edit((p) => { p.song.splice(i, 1); }); });
      let lp = null;
      b.addEventListener('touchstart', () => { lp = setTimeout(() => { if (P.song.length > 1) edit((p) => { p.song.splice(i, 1); }); }, 600); }, { passive: true });
      b.addEventListener('touchend', () => clearTimeout(lp));
    });
    $('#blkAdd').addEventListener('click', () => edit((p) => { p.song.push(p.song.length ? p.song[p.song.length - 1] : 0); }));
  }
  function bindPatBar() {
    R.songToggle.addEventListener('click', () => {
      edit((p) => { p.songMode = !p.songMode; });
      toast(P.songMode ? 'Song mode: plays your blocks in order, left to right.' : 'Pattern mode: loops the pattern you are editing.');
      if (E.state.playing) { E.stop(); E.play(); renderTop(); }
    });
    R.copyPat.addEventListener('click', (e) => {
      openPop(e.currentTarget, `<div class="menu"><div class="menu-head">Copy pattern ${LETTERS[P.current]} to…</div>${LETTERS.split('').map((L, i) => i === P.current ? '' : `<button data-copyto="${i}">Pattern ${L}</button>`).join('')}</div>`, (pop) => {
        $$('[data-copyto]', pop).forEach((b) => b.addEventListener('click', () => {
          const to = +b.dataset.copyto;
          edit((p) => { p.patterns[to].data = JSON.parse(JSON.stringify(p.patterns[p.current].data)); p.current = to; });
          closePop();
          toast(`Copied. You are now editing pattern ${LETTERS[to]}, so change it up.`);
        }));
      });
    });
    R.clearPat.addEventListener('click', () => {
      edit((p) => { p.patterns[p.current].data = {}; });
      toast(`Pattern ${LETTERS[P.current]} cleared. Undo with Ctrl+Z.`);
    });
  }

  // ---------- rack ----------
  function soundOptions(t) {
    if (t.type === 'drum') {
      return S.DRUM_CATS.map((c) => `<optgroup label="${c}">${S.DRUMS.filter((d) => d.cat === c).map((d) => `<option value="${d.id}" ${d.id === t.sound ? 'selected' : ''}>${d.name}</option>`).join('')}</optgroup>`).join('');
    }
    if (t.type === 'synth') {
      const cats = [...new Set(Object.values(S.INSTRUMENTS).map((i) => i.cat))];
      return cats.map((c) => `<optgroup label="${c}">${Object.entries(S.INSTRUMENTS).filter(([, i]) => i.cat === c).map(([k, i]) => `<option value="${k}" ${k === t.inst ? 'selected' : ''}>${i.name}</option>`).join('')}</optgroup>`).join('');
    }
    return Object.values(P.samples).map((s) => `<option value="${s.id}" ${s.id === t.sampleId ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  }

  function laneHtml(t) {
    const n = nSteps();
    const pat = curPat();
    const d = patData(pat, t);
    const cls = (i) => `${i % 4 === 0 ? 'b4' : ''} ${i % 16 === 0 ? 'b16' : ''} ${Math.floor(i / 4) % 2 ? 'odd' : ''}`;
    if (t.type === 'drum') {
      let h = '';
      for (let i = 0; i < n; i++) {
        const v = d.steps[i], r = d.rolls[i] || 1;
        h += `<button class="cell ${cls(i)} ${v ? 'on' : ''}" data-step="${i}" style="--v:${v || 0}" aria-label="Step ${i + 1}">${v && r > 1 ? `<i class="rollx">×${r}</i>` : ''}</button>`;
      }
      return `<div class="lane lane-steps" style="--n:${n}">${h}</div>`;
    }
    if (t.type === 'synth') {
      let h = '';
      for (let i = 0; i < n; i++) h += `<span class="cell ghost ${cls(i)}" data-step="${i}"></span>`;
      return `<div class="lane lane-notes" style="--n:${n}" data-hint="Click to open this track in the piano roll below.">${h}<canvas class="lane-canvas"></canvas></div>`;
    }
    if (t.mode === 'chop') {
      let h = '';
      for (let i = 0; i < n; i++) {
        const v = d.steps[i];
        h += `<button class="cell chop ${cls(i)} ${v >= 0 ? 'on' : ''}" data-step="${i}" style="--h:${v >= 0 ? (v * 37) % 360 : 0}">${v >= 0 ? v + 1 : ''}</button>`;
      }
      return `<div class="lane lane-steps" style="--n:${n}">${h}</div>`;
    }
    let h = '';
    for (let i = 0; i < n; i++) h += `<span class="cell ghost ${cls(i)}" data-step="${i}"></span>`;
    const rt = BL.lab.runtime(t.sampleId);
    return `<div class="lane lane-loop ${d.on === false ? 'off' : ''}" style="--n:${n}">${h}<canvas class="lane-canvas"></canvas>
      <button class="loop-toggle" data-hint="Turn this loop on or off in this pattern.">${d.on === false ? 'Loop off in this pattern — click to turn on' : esc((P.samples[t.sampleId] || {}).name || 'Sample') + (rt && rt.processed ? '' : ' (loading…)')}</button></div>`;
  }

  function trackRow(t) {
    const sel = ui.sel === t.id;
    const chopSel = t.type === 'sample' && t.mode === 'chop' ? `<span class="chop-brush" data-hint="The chop you'll place when you click an empty square. Use ◀ ▶ to change it.">
      <button data-act="chopPrev" aria-label="Previous chop">◀</button><b>${(ui.chopBrush[t.id] || 0) + 1}</b><button data-act="chopNext" aria-label="Next chop">▶</button></span>` : '';
    return `<div class="trk ${sel ? 'is-sel' : ''} ${t.mute ? 'is-mute' : ''}" data-id="${t.id}" style="--c:${colorOf(t)};--i:${P.tracks.indexOf(t)}">
      <div class="trk-head">
        <div class="trk-top">
          <button class="trk-name" data-act="select" data-hint="Select this track. Double-click to rename it.">${esc(t.name)}</button>
          <button class="mini ${t.mute ? 'is-on' : ''}" data-act="mute" aria-pressed="${t.mute}" data-hint="Mute: silence this track.">M</button>
          <button class="mini ${t.solo ? 'is-on' : ''}" data-act="solo" aria-pressed="${t.solo}" data-hint="Solo: hear only this track (and other soloed ones).">S</button>
          <button class="mini magic" data-act="magic" data-hint="✦ Let BeatLab write a part for this track.">✦</button>
          <button class="mini more" data-act="menu" aria-label="Track options" data-hint="More options: pitch, octave, reverb, clear, duplicate, delete.">⋯</button>
        </div>
        <div class="trk-bot">
          <select class="trk-sound" data-act="sound" aria-label="Sound" data-hint="${t.type === 'drum' ? 'Pick a different drum sound. You hear it right away.' : t.type === 'synth' ? 'Pick an instrument. Your notes stay the same.' : 'Which sample this track plays.'}">${soundOptions(t)}</select>
          ${chopSel || `<input type="range" class="trk-vol" data-act="vol" min="0" max="1" step="0.01" value="${t.vol}" aria-label="Volume" data-hint="Volume for ${esc(t.name)}.">`}
        </div>
      </div>
      ${laneHtml(t)}
    </div>`;
  }

  function renderRack() {
    const sl = R.rack.scrollLeft;
    R.rack.innerHTML = P.tracks.map(trackRow).join('') +
      `<div class="add-row">
        <button class="btn" data-add="drum" data-hint="Add a drum sound: kick, snare, hat, perc or FX.">+ Drum sound</button>
        <button class="btn" data-add="synth" data-hint="Add a melody instrument: piano, keys, bells, strings, synths…">+ Instrument</button>
        <button class="btn" data-add="bass" data-hint="Add an 808 or bass line.">+ 808 / Bass</button>
        <button class="btn" data-add="sample" data-hint="Open the Sample Lab to flip a record or your own audio.">+ Sample</button>
      </div>`;
    R.rack.scrollLeft = sl;
    sizeSteps();
    bindRack();
    cacheColumns();
    drawLanes();
  }

  /** stretch the step squares to fill wide screens; keep them tappable on phones */
  function sizeSteps() {
    const n = nSteps();
    const head = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--head-w')) || 236;
    const avail = R.rack.clientWidth - head - 30;
    const gaps = (n - 1) * 3 + (n / 4 - 1) * 3 + (n / 16 - 1) * 6;
    const w = Math.max(24, Math.min(64, Math.floor((avail - gaps) / n)));
    R.rack.style.setProperty('--step-w', w + 'px');
  }

  let columns = [];
  function cacheColumns() {
    columns = [];
    $$('.lane [data-step]', R.rack).forEach((c) => { const i = +c.dataset.step; (columns[i] = columns[i] || []).push(c); });
  }

  function drawLanes() {
    $$('.trk', R.rack).forEach((row) => {
      const t = P.tracks.find((x) => x.id === row.dataset.id);
      const cv = $('.lane-canvas', row);
      if (!t || !cv) return;
      const lane = cv.parentElement;
      const cells = $$('[data-step]', lane);
      if (!cells.length) return;
      const w = lane.scrollWidth, h = lane.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      const g = cv.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const color = colorOf(t);
      const xOf = (i) => (i < cells.length ? cells[i].offsetLeft : cells[cells.length - 1].offsetLeft + cells[cells.length - 1].offsetWidth);
      if (t.type === 'synth') {
        const d = patData(curPat(), t);
        if (!d.notes.length) return;
        let mn = Infinity, mx = -Infinity;
        d.notes.forEach((n) => { mn = Math.min(mn, n.d); mx = Math.max(mx, n.d); });
        const range = Math.max(6, mx - mn + 1);
        const nh = Math.max(3, Math.min(8, (h - 10) / range));
        g.fillStyle = color;
        d.notes.forEach((n) => {
          const x0 = xOf(n.s), x1 = xOf(Math.min(cells.length, n.s + n.l)) - 2;
          const y = h - 5 - ((n.d - mn + 1) / range) * (h - 10);
          g.globalAlpha = 0.9;
          roundRect(g, x0 + 1, y, Math.max(3, x1 - x0 - 1), nh, 2);
        });
      } else if (t.type === 'sample') {
        const rt = BL.lab.runtime(t.sampleId);
        if (!rt || !rt.processed) return;
        const sd = 60 / P.bpm / 4;
        const steps = Math.min(cells.length, rt.processed.duration / sd);
        const x1 = xOf(Math.floor(steps)) + (steps % 1) * cells[0].offsetWidth;
        const buf = rt.processed, data = buf.getChannelData(0);
        g.fillStyle = color;
        g.globalAlpha = 0.55;
        const cols = Math.max(1, Math.floor(x1));
        const per = Math.max(1, Math.floor(data.length / cols));
        for (let x = 0; x < cols; x += 2) {
          let mx = 0;
          for (let i = 0; i < per; i += 8) mx = Math.max(mx, Math.abs(data[x * per + i] || 0));
          const bh = mx * (h - 8);
          g.fillRect(x, h / 2 - bh / 2, 1.5, Math.max(1, bh));
        }
      }
    });
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
    g.fill();
  }

  let paint = null; // drag-painting state for drum steps
  function bindRack() {
    $$('.trk', R.rack).forEach((row) => {
      const t = P.tracks.find((x) => x.id === row.dataset.id);
      const act = (a) => $(`[data-act="${a}"]`, row);
      act('select').addEventListener('click', () => selectTrack(t.id, true));
      act('select').addEventListener('dblclick', () => renameTrack(t));
      act('mute').addEventListener('click', () => edit((p) => { tr(p, t).mute = !tr(p, t).mute; }));
      act('solo').addEventListener('click', () => edit((p) => { tr(p, t).solo = !tr(p, t).solo; }));
      act('menu').addEventListener('click', (e) => openTrackMenu(t, e.currentTarget));
      act('magic').addEventListener('click', (e) => openMagic(t, e.currentTarget));
      const snd = act('sound');
      snd.addEventListener('change', () => {
        const v = snd.value;
        edit((p) => {
          const x = tr(p, t);
          if (x.type === 'drum') { const old = S.DRUM_BY_ID[x.sound]; if (!x.name || (old && x.name === old.name)) x.name = S.DRUM_BY_ID[v].name; x.sound = v; }
          else if (x.type === 'synth') { const old = S.INSTRUMENTS[x.inst]; if (old && x.name === old.name) x.name = S.INSTRUMENTS[v].name; x.inst = v; }
          else x.sampleId = v;
        });
        if (t.type === 'drum') E.previewDrum(v, t.pitch);
        else if (t.type === 'synth') E.previewNote(v, E.noteMidi(P, tr(P, t), 0), 0.5);
      });
      const vol = act('vol');
      if (vol) {
        vol.addEventListener('pointerdown', () => snapshot());
        vol.addEventListener('input', () => { tr(P, t).vol = +vol.value; E.refreshMix(); scheduleSave(); });
      }
      const cp = act('chopPrev'), cn = act('chopNext');
      if (cp) {
        const n = () => ((P.samples[t.sampleId] || {}).chops || 8);
        cp.addEventListener('click', () => { ui.chopBrush[t.id] = ((ui.chopBrush[t.id] || 0) - 1 + n()) % n(); renderRack(); previewChop(t, ui.chopBrush[t.id]); });
        cn.addEventListener('click', () => { ui.chopBrush[t.id] = ((ui.chopBrush[t.id] || 0) + 1) % n(); renderRack(); previewChop(t, ui.chopBrush[t.id]); });
      }
      const lane = $('.lane', row);
      if (t.type === 'drum') bindDrumLane(lane, t);
      else if (t.type === 'synth') lane.addEventListener('click', () => { selectTrack(t.id, true); });
      else if (t.mode === 'chop') bindChopLane(lane, t);
      else {
        $('.loop-toggle', lane).addEventListener('click', () => edit((p) => { const d = patData(p.patterns[p.current], tr(p, t)); d.on = d.on === false; }));
        lane.addEventListener('dblclick', () => { ui.labSample = t.sampleId; setTab('lab'); });
      }
    });
    $$('[data-add]', R.rack).forEach((b) => b.addEventListener('click', (e) => addTrackMenu(b.dataset.add, e.currentTarget)));
  }

  const tr = (p, t) => p.tracks.find((x) => x.id === t.id);

  function bindDrumLane(lane, t) {
    lane.addEventListener('contextmenu', (e) => e.preventDefault());
    lane.addEventListener('pointerdown', (e) => {
      const cell = e.target.closest('.cell');
      if (!cell) return;
      e.preventDefault();
      const i = +cell.dataset.step;
      const d = patData(curPat(), tr(P, t));
      snapshot();
      if (e.button === 2 || ui.tool === 'vel') {
        // cycle loudness: soft → normal → loud
        const v = d.steps[i];
        d.steps[i] = !v ? 0.8 : v < 0.6 ? 0.8 : v < 0.95 ? 1 : 0.45;
        paint = null;
      } else if (ui.tool === 'roll') {
        if (!d.steps[i]) { d.steps[i] = 0.75; d.rolls[i] = 2; }
        else d.rolls[i] = (d.rolls[i] || 1) >= 4 ? 1 : (d.rolls[i] || 1) + 1;
        paint = null;
      } else {
        const turnOn = !d.steps[i];
        d.steps[i] = turnOn ? 0.8 : 0;
        d.rolls[i] = 1;
        paint = { t, on: turnOn };
        if (e.pointerType !== 'mouse') paint = null;
      }
      if (d.steps[i]) E.previewDrum(t.sound, t.pitch);
      updateCell(cell, d, i);
      changed({ noRender: true });
      renderPatBar();
    });
    lane.addEventListener('pointerover', (e) => {
      if (!paint || paint.t.id !== t.id || !(e.buttons & 1)) return;
      const cell = e.target.closest('.cell');
      if (!cell) return;
      const i = +cell.dataset.step;
      const d = patData(curPat(), tr(P, t));
      if (!!d.steps[i] === paint.on) return;
      d.steps[i] = paint.on ? 0.8 : 0;
      d.rolls[i] = 1;
      updateCell(cell, d, i);
      changed({ noRender: true });
    });
  }
  window.addEventListener('pointerup', () => { paint = null; });

  function updateCell(cell, d, i) {
    const v = d.steps[i], r = d.rolls[i] || 1;
    cell.classList.toggle('on', !!v);
    cell.style.setProperty('--v', v || 0);
    if (v) { cell.classList.remove('pop'); void cell.offsetWidth; cell.classList.add('pop'); }
    cell.innerHTML = v && r > 1 ? `<i class="rollx">×${r}</i>` : '';
  }

  function previewChop(t, idx) {
    const rt = BL.lab.runtime(t.sampleId);
    if (rt && rt.processed && rt.slices[idx]) E.previewBuffer(rt.processed, rt.slices[idx].s, rt.slices[idx].e - rt.slices[idx].s);
  }

  function bindChopLane(lane, t) {
    lane.addEventListener('contextmenu', (e) => e.preventDefault());
    lane.addEventListener('pointerdown', (e) => {
      const cell = e.target.closest('.cell');
      if (!cell) return;
      e.preventDefault();
      const i = +cell.dataset.step;
      const n = (P.samples[t.sampleId] || {}).chops || 8;
      edit((p) => {
        const d = patData(p.patterns[p.current], tr(p, t));
        if (e.button === 2) d.steps[i] = d.steps[i] < 0 ? 0 : (d.steps[i] + 1) % n;
        else if (d.steps[i] >= 0) d.steps[i] = -1;
        else d.steps[i] = ui.chopBrush[t.id] || 0;
      });
      const d = patData(curPat(), t);
      if (d.steps[i] >= 0) previewChop(t, d.steps[i]);
    });
  }

  function selectTrack(id, openEditor) {
    ui.sel = id;
    const t = P.tracks.find((x) => x.id === id);
    if (openEditor && t) {
      if (t.type === 'synth') ui.tab = 'roll';
      else if (t.type === 'sample') { ui.tab = 'lab'; ui.labSample = t.sampleId; }
    }
    $$('.trk', R.rack).forEach((r) => r.classList.toggle('is-sel', r.dataset.id === id));
    renderDock();
  }

  function renameTrack(t) {
    const btn = $(`.trk[data-id="${t.id}"] .trk-name`, R.rack);
    const input = document.createElement('input');
    input.className = 'trk-rename';
    input.value = t.name;
    btn.replaceWith(input);
    input.focus();
    input.select();
    const done = () => edit((p) => { tr(p, t).name = input.value.trim() || t.name; });
    input.addEventListener('blur', done);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { input.value = t.name; input.blur(); } });
  }

  function addTrackMenu(kind, anchor) {
    if (kind === 'sample') { setTab('lab'); toast('Pick a record (or load your own), then press “Add to beat”.'); return; }
    let html = '<div class="menu menu-scroll">';
    if (kind === 'drum') {
      S.DRUM_CATS.forEach((c) => {
        html += `<div class="menu-head">${c}</div>` + S.DRUMS.filter((d) => d.cat === c).map((d) => `<button data-pick="${d.id}">${d.name}</button>`).join('');
      });
    } else {
      Object.entries(S.INSTRUMENTS).filter(([, i]) => (kind === 'bass' ? i.bass : !i.bass)).forEach(([k, i], idx, arr) => {
        if (!idx || arr[idx - 1][1].cat !== i.cat) html += `<div class="menu-head">${i.cat}</div>`;
        html += `<button data-pick="${k}">${i.name}</button>`;
      });
    }
    html += '</div>';
    openPop(anchor, html, (pop) => {
      $$('[data-pick]', pop).forEach((b) => {
        b.addEventListener('mouseenter', () => { if (kind === 'drum') E.previewDrum(b.dataset.pick); });
        b.addEventListener('click', () => {
          const t = kind === 'drum' ? makeTrack('drum', { sound: b.dataset.pick }) : makeTrack('synth', { inst: b.dataset.pick, rev: kind === 'bass' ? 0 : 0.25 });
          edit((p) => { p.tracks.push(t); });
          closePop();
          selectTrack(t.id, t.type === 'synth');
          toast(t.type === 'drum' ? `Added ${t.name}. Click squares to place hits, or press ✦.` : `Added ${t.name}. Draw notes in the piano roll below, or press ✦.`);
        });
      });
    });
  }

  function addSampleTrack(sampleId, mode) {
    const cfg = P.samples[sampleId];
    const t = makeTrack('sample', { sampleId, mode, name: cfg.name + (mode === 'chop' ? ' chops' : ''), vol: 0.75 });
    edit((p) => {
      p.tracks.push(t);
      for (const pat of p.patterns) {
        const d = patData(pat, t);
        if (mode === 'chop' && pat === p.patterns[p.current]) d.steps = M.chopPattern(cfg.chops || 8, nSteps());
      }
    });
    toast(mode === 'chop' ? 'Chops added. Click squares to place chops; ◀ ▶ picks which one.' : 'Loop added under your beat. Press play!');
    ui.sel = t.id;
    renderAll();
  }

  // ---------- popovers & menus ----------
  let popClose = null;
  function openPop(anchor, html, bind) {
    closePop();
    R.pop.innerHTML = html;
    R.pop.hidden = false;
    const r = anchor.getBoundingClientRect();
    const pw = Math.min(280, window.innerWidth - 24);
    R.pop.style.width = pw + 'px';
    let left = Math.min(window.innerWidth - pw - 12, Math.max(12, r.left));
    R.pop.style.left = left + 'px';
    const below = window.innerHeight - r.bottom;
    R.pop.style.maxHeight = Math.max(200, Math.max(below, r.top) - 24) + 'px';
    if (below > 260 || below > r.top) { R.pop.style.top = r.bottom + 6 + 'px'; R.pop.style.bottom = ''; }
    else { R.pop.style.bottom = window.innerHeight - r.top + 6 + 'px'; R.pop.style.top = ''; }
    if (bind) bind(R.pop);
    const h = (e) => { if (!R.pop.contains(e.target) && e.target !== anchor) closePop(); };
    setTimeout(() => document.addEventListener('pointerdown', h), 0);
    popClose = () => document.removeEventListener('pointerdown', h);
  }
  function closePop() {
    if (popClose) popClose();
    popClose = null;
    R.pop.hidden = true;
  }

  function openTrackMenu(t, anchor) {
    const isBass = t.type === 'synth' && (S.INSTRUMENTS[t.inst] || {}).bass;
    let h = `<div class="menu"><div class="menu-head">${esc(t.name)}</div>`;
    if (t.type === 'drum') h += stepper('pitch', 'Pitch', t.pitch || 0, (v) => (v > 0 ? '+' + v : v) + ' st');
    if (t.type === 'synth') h += stepper('octave', 'Octave', t.octave || 0, (v) => (v > 0 ? '+' + v : v));
    h += `<label class="menu-row">Pan<input type="range" min="-1" max="1" step="0.05" value="${t.pan || 0}" data-m="pan"></label>`;
    h += `<label class="menu-row">Reverb<input type="range" min="0" max="1" step="0.05" value="${t.rev || 0}" data-m="rev"></label>`;
    if (isBass) h += `<label class="menu-row check"><input type="checkbox" data-m="glide" ${t.glide !== false ? 'checked' : ''}> Slide when notes overlap</label>`;
    if (t.type === 'sample') h += `<button data-m="mode">${t.mode === 'chop' ? 'Switch to loop' : 'Switch to chops'}</button><button data-m="lab">Open in Sample Lab</button>`;
    h += `<button data-m="clear">Clear in this pattern</button><button data-m="dup">Duplicate track</button>
      <button data-m="up">Move up</button><button data-m="down">Move down</button><button data-m="del" class="danger">Delete track</button></div>`;
    openPop(anchor, h, (pop) => {
      $$('[data-step-btn]', pop).forEach((b) => b.addEventListener('click', () => {
        const [k, dir] = b.dataset.stepBtn.split(':');
        edit((p) => { const x = tr(p, t); x[k] = Math.max(k === 'octave' ? -3 : -24, Math.min(k === 'octave' ? 3 : 24, (x[k] || 0) + +dir)); }, { noRender: true });
        const x = tr(P, t);
        $(`[data-val="${k}"]`, pop).textContent = k === 'pitch' ? (x.pitch > 0 ? '+' : '') + x.pitch + ' st' : (x.octave > 0 ? '+' : '') + x.octave;
        if (t.type === 'drum') E.previewDrum(x.sound, x.pitch); else E.previewNote(x.inst, E.noteMidi(P, x, 0), 0.4);
        renderRack();
      }));
      $$('input[type=range][data-m]', pop).forEach((inp) => {
        inp.addEventListener('pointerdown', () => snapshot());
        inp.addEventListener('input', () => { tr(P, t)[inp.dataset.m] = +inp.value; E.refreshMix(); scheduleSave(); });
      });
      const gl = $('[data-m="glide"]', pop);
      if (gl) gl.addEventListener('change', () => edit((p) => { tr(p, t).glide = gl.checked; }, { noRender: true }));
      const on = (k, fn) => { const b = $(`[data-m="${k}"]`, pop); if (b) b.addEventListener('click', () => { closePop(); fn(); }); };
      on('mode', () => edit((p) => { const x = tr(p, t); x.mode = x.mode === 'chop' ? 'loop' : 'chop'; if (x.mode === 'chop') { const d = patData(p.patterns[p.current], x); if (!d.steps.some((v) => v >= 0)) d.steps = M.chopPattern((p.samples[x.sampleId] || {}).chops || 8, nSteps()); } }));
      on('lab', () => { ui.labSample = t.sampleId; setTab('lab'); });
      on('clear', () => edit((p) => { delete p.patterns[p.current].data[t.id]; }));
      on('dup', () => edit((p) => {
        const x = tr(p, t);
        const c = JSON.parse(JSON.stringify(x));
        c.id = uid(); c.name = x.name + ' 2';
        p.tracks.splice(p.tracks.indexOf(x) + 1, 0, c);
        p.patterns.forEach((pat) => { if (pat.data[x.id]) pat.data[c.id] = JSON.parse(JSON.stringify(pat.data[x.id])); });
      }));
      on('up', () => edit((p) => { const i = p.tracks.findIndex((x) => x.id === t.id); if (i > 0) p.tracks.splice(i - 1, 0, p.tracks.splice(i, 1)[0]); }));
      on('down', () => edit((p) => { const i = p.tracks.findIndex((x) => x.id === t.id); if (i < p.tracks.length - 1) p.tracks.splice(i + 1, 0, p.tracks.splice(i, 1)[0]); }));
      on('del', () => {
        edit((p) => { p.tracks = p.tracks.filter((x) => x.id !== t.id); p.patterns.forEach((pat) => delete pat.data[t.id]); });
        toast(`Deleted ${t.name}. Changed your mind? Ctrl+Z.`);
      });
    });
  }
  function stepper(k, label, v, fmt) {
    return `<div class="menu-row">${label}<span class="stepper"><button data-step-btn="${k}:-1" aria-label="${label} down">−</button><b data-val="${k}">${fmt(v)}</b><button data-step-btn="${k}:1" aria-label="${label} up">+</button></span></div>`;
  }

  function openMagic(t, anchor) {
    const isBass = t.type === 'synth' && (S.INSTRUMENTS[t.inst] || {}).bass;
    let h = '<div class="menu"><div class="menu-head">✦ Write it for me</div>';
    if (t.type === 'drum') h += `<button data-g="drum">New ${esc(catOf(t).toLowerCase())} pattern</button><button data-g="drum">Another one</button>`;
    else if (isBass) h += `<button data-g="bass">808 follows the kick and chords</button>` + T.PROGRESSIONS.slice(0, 4).map((pr) => `<button data-g="bassprog" data-prog="${pr.id}">Root notes: ${pr.name}</button>`).join('');
    else if (t.type === 'synth') {
      h += `<button data-g="melody">Write a melody over my chords</button><div class="menu-head">Chord progressions</div>` +
        T.PROGRESSIONS.map((pr) => `<button data-g="chords" data-prog="${pr.id}">${pr.name} <small>${T.SCALES[pr.scale].name}</small></button>`).join('');
    } else if (t.mode === 'chop') h += '<button data-g="chop">Flip the chops for me</button>';
    else h += '<p class="menu-note">Loops play the whole sample. Switch this track to chops (⋯ menu) to rearrange it.</p>';
    h += '</div>';
    openPop(anchor, h, (pop) => {
      $$('[data-g]', pop).forEach((b) => b.addEventListener('click', () => {
        const g = b.dataset.g;
        const prog = T.PROGRESSIONS.find((x) => x.id === b.dataset.prog);
        edit((p) => {
          const x = tr(p, t);
          const pat = p.patterns[p.current];
          const d = patData(pat, x);
          if (g === 'drum') Object.assign(d, M.drumPattern(catOf(x), p.bpm, nSteps()));
          else if (g === 'melody') d.notes = M.melody(p, pat, nSteps(), x.id);
          else if (g === 'chords') { d.notes = M.progressionNotes(prog, nSteps(), prog.id === 'soul' || prog.id === 'smooth' ? 4 : 3); if (p.scale !== prog.scale) p.scale = prog.scale; }
          else if (g === 'bassprog') { const block = nSteps() / 4; d.notes = prog.degs.map((dd, i) => ({ s: i * block, d: dd > 3 ? dd - 7 : dd, l: block })); }
          else if (g === 'bass') {
            const kick = p.tracks.find((k) => k.type === 'drum' && catOf(k) === 'Kick');
            d.notes = kick ? M.bassFromKick(p, pat, kick, nSteps(), x.id) : [{ s: 0, d: 0, l: 8 }];
          } else if (g === 'chop') d.steps = M.chopPattern((p.samples[x.sampleId] || {}).chops || 8, nSteps());
        });
        if (g === 'chords' && prog) toast(`${prog.name} — scale set to ${T.SCALES[prog.scale].name}. Every track follows.`);
        if (g === 'bass' && !P.tracks.some((k) => k.type === 'drum' && catOf(k) === 'Kick')) toast('Add a kick first so the 808 has something to follow.');
        if (!E.state.playing) E.play();
        renderTop();
        closePop();
      }));
    });
  }

  // ---------- dock: piano roll / lab / mixer ----------
  function setTab(tab) {
    const changedTab = ui.tab !== tab;
    ui.tab = tab;
    renderDock();
    if (changedTab) {
      R.dockBody.classList.add('switching');
      clearTimeout(setTab.t);
      setTab.t = setTimeout(() => R.dockBody.classList.remove('switching'), 400);
    }
  }
  function renderDock() {
    $$('[data-tab]').forEach((b) => b.classList.toggle('is-on', b.dataset.tab === ui.tab));
    const body = R.dockBody;
    const sw = body.classList.contains('switching');
    body.className = 'dock-body tab-' + ui.tab + (sw ? ' switching' : '');
    if (ui.tab === 'roll') renderRoll(body);
    else if (ui.tab === 'lab') BL.lab.render();
    else renderMixer(body);
  }

  const ROW_H = 20;
  let COL_W = 28;
  function rollRange(t) {
    return (S.INSTRUMENTS[t.inst] || {}).bass ? [-7, 10] : [-7, 14];
  }
  function renderRoll(body) {
    const t = P.tracks.find((x) => x.id === ui.sel && x.type === 'synth') || P.tracks.find((x) => x.type === 'synth');
    if (!t) {
      body.innerHTML = `<div class="empty-dock"><h3>No melody tracks yet</h3><p>Add an instrument or an 808 to start writing notes. Every note you place is locked to your key, so nothing sounds wrong.</p>
        <button class="btn btn-accent" id="emptyAddSynth">+ Add an instrument</button></div>`;
      $('#emptyAddSynth').addEventListener('click', (e) => addTrackMenu('synth', e.currentTarget));
      return;
    }
    ui.sel = t.id;
    COL_W = Math.max(18, Math.min(48, Math.floor((body.clientWidth - 100) / nSteps())));
    const [lo, hi] = rollRange(t);
    const rows = [];
    for (let d = hi; d >= lo; d--) rows.push(d);
    const n = nSteps();
    const inst = S.INSTRUMENTS[t.inst];
    const lens = [[1, '1/16'], [2, '1/8'], [4, '1/4'], [8, '1/2'], [16, '1 bar']];
    const scaleLen = T.SCALES[P.scale].steps.length;
    body.innerHTML = `
      <div class="roll-tools">
        <span class="roll-title" style="--c:${colorOf(t)}">${esc(t.name)}</span>
        <select id="rollInst" aria-label="Instrument">${soundOptions(t)}</select>
        <div class="seg" role="group" aria-label="Note length"><span class="seg-label">Note</span>${lens.map(([v, l]) => `<button class="${ui.brush === v ? 'is-on' : ''}" data-brush="${v}">${l}</button>`).join('')}</div>
        ${inst.bass ? '' : `<button class="btn ${ui.chordMode ? 'is-on' : ''}" id="chordMode" aria-pressed="${ui.chordMode}" data-hint="Chord mode: one click places a full chord that fits your key.">Chord mode</button>`}
        <button class="btn btn-magic" id="rollMagic" data-hint="✦ Chords, melodies and 808 lines written for you.">✦ Write it for me</button>
        <button class="btn ${ui.recording ? 'is-rec' : ''}" id="recBtn" data-hint="Record: press play, then play notes on your keyboard (A S D F G H J K L). They land on the grid.">● Rec</button>
        <span class="roll-keys" data-hint="Your computer keyboard is a piano that can only play notes in your key. Z / X change octave.">Keys: A S D F G H J K L · Z/X octave ${ui.kbOct > 0 ? '+' + ui.kbOct : ui.kbOct}</span>
      </div>
      <div class="roll" id="roll">
        <div class="roll-keyscol">${rows.map((d) => {
          const midi = E.noteMidi(P, t, d);
          const isRoot = ((d % scaleLen) + scaleLen) % scaleLen === 0;
          return `<button class="rk ${isRoot ? 'root' : ''}" data-deg="${d}" style="height:${ROW_H}px">${T.noteName(midi)}</button>`;
        }).join('')}</div>
        <div class="roll-scroll" id="rollScroll">
          <div class="roll-grid" id="rollGrid" style="width:${n * COL_W}px;height:${rows.length * ROW_H}px;--cw:${COL_W}px;--rh:${ROW_H}px">
            ${rows.map((d, i) => `<div class="rrow ${((d % scaleLen) + scaleLen) % scaleLen === 0 ? 'root' : ''}" style="top:${i * ROW_H}px"></div>`).join('')}
            <div class="roll-notes" id="rollNotes"></div>
            <div class="roll-head" id="rollHead" hidden></div>
          </div>
        </div>
      </div>
      <p class="roll-help">Click to add a note · drag a note to move it · drag its right edge to make it longer · click a note to delete it${inst.bass ? ' · overlap two notes to make the 808 slide' : ''}</p>`;
    drawRollNotes(t, rows);
    bindRoll(t, rows);
    const sc = $('#rollScroll');
    // scroll so the root area is visible
    const rootRow = rows.indexOf(0);
    if (sc && rootRow >= 0) sc.scrollTop = Math.max(0, rootRow * ROW_H - sc.clientHeight / 2);
  }

  function drawRollNotes(t, rows) {
    const host = $('#rollNotes');
    if (!host) return;
    const d = patData(curPat(), t);
    const top = rows[0];
    host.innerHTML = d.notes.map((nt, i) => {
      const r = top - nt.d;
      if (r < 0 || r >= rows.length) return '';
      const fresh = nt._fresh ? ' fresh' : '';
      if (nt._fresh) delete nt._fresh;
      return `<div class="note${fresh}" data-i="${i}" style="left:${nt.s * COL_W + 1}px;top:${r * ROW_H + 1}px;width:${nt.l * COL_W - 2}px;height:${ROW_H - 2}px;--c:${colorOf(t)}"><span class="note-grip"></span></div>`;
    }).join('');
  }

  function bindRoll(t, rows) {
    $('#rollInst').addEventListener('change', (e) => {
      const v = e.target.value;
      edit((p) => { const x = tr(p, t); const old = S.INSTRUMENTS[x.inst]; if (old && x.name === old.name) x.name = S.INSTRUMENTS[v].name; x.inst = v; });
      E.previewNote(v, E.noteMidi(P, tr(P, t), 0), 0.5);
    });
    $$('[data-brush]').forEach((b) => b.addEventListener('click', () => { ui.brush = +b.dataset.brush; renderDock(); }));
    const cm = $('#chordMode');
    if (cm) cm.addEventListener('click', () => { ui.chordMode = !ui.chordMode; renderDock(); });
    $('#rollMagic').addEventListener('click', (e) => openMagic(tr(P, t), e.currentTarget));
    $('#recBtn').addEventListener('click', () => {
      ui.recording = !ui.recording;
      if (ui.recording && !E.state.playing) { E.play(); renderTop(); }
      toast(ui.recording ? 'Recording. Play notes with A S D F G H J K L.' : 'Recording stopped.');
      renderDock();
    });
    $$('.rk').forEach((k) => k.addEventListener('pointerdown', () => E.previewNote(t.inst, E.noteMidi(P, t, +k.dataset.deg), 0.4)));
    const grid = $('#rollGrid');
    const top = rows[0];
    let drag = null;
    const pos = (e) => {
      const r = grid.getBoundingClientRect();
      return { step: Math.max(0, Math.min(nSteps() - 1, Math.floor((e.clientX - r.left) / COL_W))), deg: top - Math.max(0, Math.min(rows.length - 1, Math.floor((e.clientY - r.top) / ROW_H))), x: e.clientX - r.left };
    };
    grid.addEventListener('pointerdown', (e) => {
      if (e.button === 2) return;
      e.preventDefault();
      grid.setPointerCapture(e.pointerId);
      const p0 = pos(e);
      const d = patData(curPat(), tr(P, t));
      snapshot();
      const noteEl = e.target.closest('.note');
      if (noteEl) {
        const i = +noteEl.dataset.i;
        const nt = d.notes[i];
        const right = (nt.s + nt.l) * COL_W;
        const resize = right - p0.x < 10 || e.target.classList.contains('note-grip');
        drag = { mode: resize ? 'resize' : 'move', notes: [nt], orig: [{ s: nt.s, d: nt.d }], p0, moved: false };
      } else {
        const instNow = S.INSTRUMENTS[tr(P, t).inst];
        const degs = ui.chordMode && !instNow.bass ? T.chordDegrees(p0.deg) : [p0.deg];
        const len = Math.min(ui.brush, nSteps() - p0.step);
        const added = degs.map((dd) => ({ s: p0.step, d: dd, l: len }));
        d.notes.push(...added);
        added.forEach((x) => { x._fresh = true; });
        degs.forEach((dd) => E.previewNote(t.inst, E.noteMidi(P, tr(P, t), dd), 0.3));
        drag = { mode: 'resize', notes: added, p0, moved: true, created: true };
      }
      drawRollNotes(tr(P, t), rows);
    });
    grid.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const p1 = pos(e);
      if (drag.mode === 'move') {
        const ds = p1.step - drag.p0.step, dd = p1.deg - drag.p0.deg;
        if (ds || dd) drag.moved = true;
        drag.notes.forEach((nt, i) => {
          const ns = Math.max(0, Math.min(nSteps() - nt.l, drag.orig[i].s + ds));
          const nd = Math.max(rows[rows.length - 1], Math.min(top, drag.orig[i].d + dd));
          if (nd !== nt.d) E.previewNote(t.inst, E.noteMidi(P, tr(P, t), nd), 0.2);
          nt.s = ns; nt.d = nd;
        });
      } else {
        drag.notes.forEach((nt) => { nt.l = Math.max(1, Math.min(nSteps() - nt.s, p1.step - nt.s + 1)); });
        drag.moved = true;
      }
      drawRollNotes(tr(P, t), rows);
    });
    const end = () => {
      if (!drag) return;
      if (drag.mode === 'move' && !drag.moved) {
        const d = patData(curPat(), tr(P, t));
        d.notes = d.notes.filter((x) => x !== drag.notes[0]);
      } else if (drag.created && drag.notes[0]) ui.brush = Math.min(16, drag.notes[0].l) || ui.brush;
      drag = null;
      drawRollNotes(tr(P, t), rows);
      changed({ noRender: true });
      drawLanes();
    };
    grid.addEventListener('pointerup', end);
    grid.addEventListener('pointercancel', end);
  }

  function renderMixer(body) {
    const m = P.master;
    body.innerHTML = `<div class="mixer">
      <div class="mix-master">
        <div class="mix-title">Master</div>
        <canvas id="meter" class="meter" width="240" height="60" aria-label="Level meter"></canvas>
        <label class="mix-row">Volume<input type="range" min="0" max="1.2" step="0.01" value="${m.vol}" data-master="vol"></label>
        <label class="mix-row" data-hint="Glues the mix together and makes it louder. More = harder hitting.">Punch<input type="range" min="0" max="1" step="0.01" value="${m.punch}" data-master="punch"></label>
        <label class="check" data-hint="Muffles the whole beat like an old tape. Great for lo-fi."><input type="checkbox" data-master="lofi" ${m.lofi ? 'checked' : ''}> Lo-fi tape filter</label>
      </div>
      <div class="mix-strips">
        <div class="mix-strip mix-headrow"><span>Track</span><span>Volume</span><span>Pan</span><span>Reverb</span><span></span></div>
        ${P.tracks.map((t) => `<div class="mix-strip" data-id="${t.id}" style="--c:${colorOf(t)}">
          <span class="mix-name">${esc(t.name)}</span>
          <input type="range" min="0" max="1" step="0.01" value="${t.vol}" data-k="vol" aria-label="${esc(t.name)} volume">
          <input type="range" min="-1" max="1" step="0.05" value="${t.pan || 0}" data-k="pan" aria-label="${esc(t.name)} pan">
          <input type="range" min="0" max="1" step="0.05" value="${t.rev || 0}" data-k="rev" aria-label="${esc(t.name)} reverb">
          <span class="mix-btns"><button class="mini ${t.mute ? 'is-on' : ''}" data-k="mute">M</button><button class="mini ${t.solo ? 'is-on' : ''}" data-k="solo">S</button></span>
        </div>`).join('')}
      </div></div>`;
    $$('[data-master]', body).forEach((inp) => {
      inp.addEventListener('pointerdown', () => snapshot());
      inp.addEventListener(inp.type === 'checkbox' ? 'change' : 'input', () => {
        P.master[inp.dataset.master] = inp.type === 'checkbox' ? inp.checked : +inp.value;
        E.refreshMix(); scheduleSave();
      });
    });
    $$('.mix-strip[data-id]', body).forEach((row) => {
      const t = P.tracks.find((x) => x.id === row.dataset.id);
      $$('input', row).forEach((inp) => {
        inp.addEventListener('pointerdown', () => snapshot());
        inp.addEventListener('input', () => { t[inp.dataset.k] = +inp.value; E.refreshMix(); scheduleSave(); if (inp.dataset.k === 'vol') renderRackVol(t); });
      });
      $$('button', row).forEach((b) => b.addEventListener('click', () => { edit((p) => { tr(p, t)[b.dataset.k] = !tr(p, t)[b.dataset.k]; }); }));
    });
    meterLoop();
  }
  function renderRackVol(t) {
    const v = $(`.trk[data-id="${t.id}"] .trk-vol`, R.rack);
    if (v) v.value = t.vol;
  }
  let meterRaf = 0;
  function meterLoop() {
    cancelAnimationFrame(meterRaf);
    const cv = $('#meter');
    if (!cv) return;
    const g = cv.getContext('2d');
    const buf = new Float32Array(2048);
    const css = getComputedStyle(document.documentElement);
    let peakHold = 0;
    const loop = () => {
      if (!document.body.contains(cv)) return;
      const an = E.analyser();
      let rms = 0, peak = 0;
      if (an) {
        an.getFloatTimeDomainData(buf);
        for (let i = 0; i < buf.length; i++) { rms += buf[i] * buf[i]; peak = Math.max(peak, Math.abs(buf[i])); }
        rms = Math.sqrt(rms / buf.length);
      }
      peakHold = Math.max(peak, peakHold * 0.96);
      const w = cv.width, h = cv.height;
      g.fillStyle = css.getPropertyValue('--well').trim();
      g.fillRect(0, 0, w, h);
      const lvl = Math.min(1, rms * 3.2);
      const grad = g.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#3ee0c8'); grad.addColorStop(0.7, '#ffd166'); grad.addColorStop(1, '#ff5c5c');
      g.fillStyle = grad;
      g.fillRect(0, 12, lvl * w, h - 24);
      g.fillStyle = peakHold > 0.98 ? '#ff5c5c' : css.getPropertyValue('--text').trim();
      g.fillRect(Math.min(w - 2, peakHold * w), 8, 2, h - 16);
      meterRaf = requestAnimationFrame(loop);
    };
    loop();
  }

  // ---------- playhead ----------
  let lastCol = -1;
  E.onStep((ev) => {
    if (lastCol >= 0 && columns[lastCol]) columns[lastCol].forEach((c) => c.classList.remove('now'));
    const head = $('#rollHead');
    if (!ev) {
      lastCol = -1; ui.playStep = -1;
      if (head) head.hidden = true;
      $$('.blk.now').forEach((b) => b.classList.remove('now'));
      renderTop();
      return;
    }
    ui.lastEv = ev;
    if (P.songMode && ev.patIdx !== P.current) {
      P.current = ev.patIdx;
      renderRack();
      renderPatBar();
      if (ui.tab === 'roll') renderDock();
    }
    ui.playStep = ev.step;
    lastCol = ev.step;
    if (columns[ev.step]) columns[ev.step].forEach((c) => c.classList.add('now'));
    if (head) { head.hidden = false; head.style.left = ev.step * COL_W + 'px'; }
    if (P.songMode) $$('.blk[data-blk]').forEach((b) => b.classList.toggle('now', +b.dataset.blk === ev.songIdx));
  });

  // ---------- keyboard ----------
  const KB = 'asdfghjkl;';
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' && e.target.type !== 'range' && e.target.type !== 'checkbox') return;
    if (tag === 'textarea' || tag === 'select') return;
    if (!R.modal.hidden && e.key !== 'Escape') return;
    if (e.key === 'Escape') { closeModal(); closePop(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveProjectFile(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); return; }
    if (e.repeat) return;
    if (BL.lab.keyPad(e.key)) return;
    const k = e.key.toLowerCase();
    if (k === 'z') { ui.kbOct = Math.max(-2, ui.kbOct - 1); toast('Keyboard octave ' + ui.kbOct); if (ui.tab === 'roll') renderDock(); return; }
    if (k === 'x') { ui.kbOct = Math.min(2, ui.kbOct + 1); toast('Keyboard octave +' + ui.kbOct); if (ui.tab === 'roll') renderDock(); return; }
    const idx = KB.indexOf(k);
    if (idx < 0) return;
    const t = P.tracks.find((x) => x.id === ui.sel && x.type === 'synth') || P.tracks.find((x) => x.type === 'synth');
    if (!t) return;
    const scaleLen = T.SCALES[P.scale].steps.length;
    const deg = idx + ui.kbOct * scaleLen;
    E.previewNote(t.inst, E.noteMidi(P, t, deg), 0.4);
    if (ui.recording && E.state.playing && ui.lastEv) {
      const sd = 60 / P.bpm / 4;
      const frac = (E.ctx.currentTime - ui.lastEv.time) / sd;
      const s = (ui.lastEv.step + Math.round(frac)) % nSteps();
      const d = patData(curPat(), t);
      if (!d.notes.some((n) => n.s === s && n.d === deg)) {
        snapshot();
        d.notes.push({ s, d: deg, l: Math.min(ui.brush, nSteps() - s) });
        changed({ noRender: true });
        if (ui.tab === 'roll') { const [lo, hi] = rollRange(t); const rows = []; for (let x = hi; x >= lo; x--) rows.push(x); drawRollNotes(t, rows); }
        drawLanes();
      }
    }
  });

  // ---------- hints, toast, modal, loading ----------
  const DEFAULT_HINT = 'Space = play/stop · Click squares to add drums · Right-click a square to change how loud it is · Ctrl+Z = undo';
  function bindHints() {
    document.addEventListener('pointerover', (e) => {
      const h = e.target.closest && e.target.closest('[data-hint]');
      R.hint.textContent = h ? h.dataset.hint : DEFAULT_HINT;
    });
    R.hint.textContent = DEFAULT_HINT;
  }
  let toastTimer = null;
  function toast(msg) {
    R.toast.textContent = msg;
    R.toast.hidden = false;
    R.toast.classList.remove('show');
    void R.toast.offsetWidth;
    R.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { R.toast.classList.remove('show'); }, 3600);
  }
  function openModal(html, bind, wide) {
    clearTimeout(modalTimer);
    R.modal.classList.remove('closing');
    R.modal.innerHTML = `<div class="modal-card ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><button class="modal-x" id="modalX" aria-label="Close">×</button>${html}</div>`;
    R.modal.hidden = false;
    $('#modalX').addEventListener('click', closeModal);
    R.modal.onclick = (e) => { if (e.target === R.modal) closeModal(); };
    if (bind) bind(R.modal);
  }
  let modalTimer = null;
  function closeModal() {
    if (R.modal.hidden || R.modal.classList.contains('closing')) return;
    R.modal.classList.add('closing');
    clearTimeout(modalTimer);
    modalTimer = setTimeout(() => { R.modal.hidden = true; R.modal.innerHTML = ''; R.modal.classList.remove('closing'); }, 200);
  }
  function showLoading(msg) { R.loadingMsg.textContent = msg; R.loading.hidden = false; }
  function hideLoading() { R.loading.hidden = true; }

  function openBeats() {
    const cards = BL.beats.PRESETS.map((pr, i) => `<button class="beat-card" data-preset="${pr.id}" style="--c:${pr.color};--i:${i}" data-tags="${esc((pr.name + ' ' + pr.tags.join(' ') + ' ' + pr.desc).toLowerCase())}">
        <span class="beat-name">${pr.name}</span>
        <span class="beat-meta">${pr.bpm} BPM · ${T.keyName(pr.key, pr.scale)}</span>
        <span class="beat-desc">${pr.desc}</span>
        <span class="beat-tags">${pr.tags.slice(0, 3).map((t) => `<i>${t}</i>`).join('')}</span>
      </button>`).join('');
    openModal(`<div class="beats-head"><h2>Start from a beat</h2><p>Pick a vibe. It loads and starts playing, then make it yours: change sounds, notes, key or tempo.</p>
        <input type="search" id="beatSearch" placeholder="Search: soul, rage, drill, lo-fi, Kanye-type…" aria-label="Search beats"></div>
      <div class="beat-grid">${cards}
        <button class="beat-card beat-blank" id="blankBeat" style="--i:${BL.beats.PRESETS.length}"><span class="beat-name">Empty beat</span><span class="beat-desc">Kick, snare, hats, 808 and keys, ready for you to fill in. Every ✦ button writes a part for you.</span></button>
      </div>`, (m) => {
      $$('[data-preset]', m).forEach((b) => b.addEventListener('click', async () => {
        const pr = BL.beats.PRESETS.find((x) => x.id === b.dataset.preset);
        closeModal();
        await loadProject(projectFromPreset(pr), { undoable: true, play: true });
        renderTop();
        toast(`${pr.name} loaded. Try changing the Key or BPM up top. Everything follows.`);
      }));
      $('#blankBeat', m).addEventListener('click', () => { closeModal(); loadProject(blankProject(), { undoable: true }); });
      const s = $('#beatSearch', m);
      s.addEventListener('input', () => {
        const q = s.value.trim().toLowerCase();
        $$('[data-preset]', m).forEach((b) => { b.hidden = q && !b.dataset.tags.includes(q); });
      });
    }, true);
  }

  function openHelp() {
    openModal(`<h2>How BeatLab works</h2>
      <ol class="help-list">
        <li><b>Drums.</b> Each row is one sound. Click squares to add hits. Right-click (or the Loudness tool) changes how loud a hit is. The Rolls tool turns a hi-hat into a ×2 / ×3 / ×4 roll.</li>
        <li><b>Melody & 808.</b> Click an instrument row and draw notes in the piano roll. You can only place notes in your key, so it always sounds right. Chord mode places a whole chord with one click. Overlap two 808 notes to make it slide.</li>
        <li><b>Key & tempo.</b> Change the Key or BPM at the top and every note, 808 and matched sample follows on its own.</li>
        <li><b>Sampling.</b> Open the Sample Lab, pick a record or load your own audio. Speed and Pitch are plain sliders. “Match my tempo” and “Match my key” do it for you. Chop it into pieces and play them like pads.</li>
        <li><b>Song.</b> Make up to four patterns (A–D), then line them up in the Song strip and turn on Song mode.</li>
        <li><b>✦ buttons.</b> On any track, ✦ writes a part for you: drum patterns, chord progressions, melodies, 808s that follow your kick, chop flips.</li>
        <li><b>Export.</b> Saves a WAV file of your beat. Save project keeps everything so you can come back later.</li>
      </ol>
      <h3>Keyboard</h3>
      <table class="keys"><tbody>
        <tr><td><kbd>Space</kbd></td><td>Play / stop</td></tr>
        <tr><td><kbd>A</kbd>–<kbd>L</kbd></td><td>Play notes in key on the selected instrument (<kbd>Z</kbd>/<kbd>X</kbd> octave)</td></tr>
        <tr><td><kbd>1</kbd>–<kbd>0</kbd></td><td>Play sample chops (in the Sample Lab)</td></tr>
        <tr><td><kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd></td><td>Undo / redo</td></tr>
        <tr><td><kbd>Ctrl</kbd>+<kbd>S</kbd></td><td>Save project file</td></tr>
      </tbody></table>`);
  }

  // ---------- save / open / export ----------
  async function saveFile(filename, bytes) {
    const inClaude = !!(window.claude && typeof window.claude.use === 'function');
    if (inClaude) {
      let dl = null;
      try { dl = await window.claude.use('downloads'); } catch (e) { dl = null; }
      if (dl) {
        let name = filename, data = bytes;
        if (/\.wav$/i.test(filename)) { data = BL.dsp.makeZip([{ name: filename, bytes }]); name = filename.replace(/\.wav$/i, '.zip'); }
        try {
          await dl.save({ filename: name, data: new Blob([data]) });
          toast(`Saved ${name}${name !== filename ? ' (your WAV is inside)' : ''}.`);
        } catch (e) {
          if (!e || e.code !== 'declined') toast('Saving is not available in this view.');
        }
        return;
      }
    }
    const url = URL.createObjectURL(new Blob([bytes]));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(`Saved ${filename}.`);
  }
  const fileSafe = (s) => (s || 'beat').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'beat';

  async function saveProjectFile() {
    const out = JSON.parse(JSON.stringify(P));
    out.audio = {};
    for (const s of Object.values(P.samples)) {
      if (s.builtin) continue;
      const bytes = BL.lab.memBytes[s.id] || (await BL.lab.idb.get(s.id));
      if (bytes) out.audio[s.id] = b64(new Uint8Array(bytes));
    }
    await saveFile(fileSafe(P.name) + '.beatlab.json', new TextEncoder().encode(JSON.stringify(out)));
  }
  function b64(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function unb64(str) {
    const s = atob(str);
    const u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u.buffer;
  }
  async function openProjectFile(file) {
    try {
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.tracks) || !Array.isArray(data.patterns)) throw new Error('bad');
      for (const [id, str] of Object.entries(data.audio || {})) {
        const bytes = unb64(str);
        BL.lab.memBytes[id] = bytes;
        BL.lab.forget(id);
        await BL.lab.idb.put(id, bytes);
      }
      delete data.audio;
      await loadProject(Object.assign(newProject(), data), { undoable: true });
      toast(`Opened ${data.name || 'project'}.`);
    } catch (e) {
      toast("That file isn't a BeatLab project.");
    }
  }

  function openExport() {
    const songLen = P.song.length;
    if (!ui.ending) ui.ending = 'none';
    openModal(`<h2>Export your beat</h2>
      <p>Makes a WAV audio file you can upload, send to an artist, or drop into any other app.</p>
      <div class="export-opts">
        <label class="radio"><input type="radio" name="exp" value="loop" ${P.songMode ? '' : 'checked'}> Pattern ${LETTERS[P.current]}, looped 4 times</label>
        <label class="radio"><input type="radio" name="exp" value="song" ${P.songMode ? 'checked' : ''}> The whole song (${songLen} block${songLen > 1 ? 's' : ''}: ${P.song.map((i) => LETTERS[i]).join(' ')})</label>
      </div>
      <h3>Ending</h3>
      <div class="ending-row">
        <div class="seg" role="group" aria-label="Ending">${Object.entries(E.ENDINGS).map(([k, v]) => `<button data-ending="${k}" class="${ui.ending === k ? 'is-on' : ''}">${v.name}</button>`).join('')}</div>
        <button class="btn" id="hearEnding">▶ Hear the ending</button>
      </div>
      <p class="ending-note" id="endingNote"></p>
      <div class="modal-actions"><button class="btn btn-accent" id="doExport">Export WAV</button><span id="expStatus" class="muted"></span></div>`, (m) => {
      const notes = {
        none: 'The beat ends on the last step, with the reverb ringing out.',
        slowmo: 'One last hit (kick, 808, chord and a boom) that drops into slow motion and fades away.',
        tapestop: 'The beat winds down to a halt, like someone stopped the record with their hand.',
      };
      const setNote = () => { $('#endingNote', m).textContent = notes[ui.ending]; };
      setNote();
      $$('[data-ending]', m).forEach((b) => b.addEventListener('click', () => {
        ui.ending = b.dataset.ending;
        $$('[data-ending]', m).forEach((x) => x.classList.toggle('is-on', x === b));
        setNote();
      }));
      $('#hearEnding', m).addEventListener('click', async () => {
        $('#expStatus', m).textContent = 'Rendering the ending…';
        await Promise.all(Object.keys(P.samples).map((id) => BL.lab.ensure(P, id)));
        if (E.state.playing) { E.stop(); renderTop(); }
        const buf = await E.renderEndingPreview(P, ui.ending);
        $('#expStatus', m).textContent = '';
        E.previewBuffer(buf, 0, buf.duration);
      });
      $('#doExport', m).addEventListener('click', async () => {
        const song = $('input[name=exp]:checked', m).value === 'song';
        $('#expStatus', m).textContent = 'Rendering…';
        $('#doExport', m).disabled = true;
        E.stopPreviewBuffer();
        try {
          await Promise.all(Object.keys(P.samples).map((id) => BL.lab.ensure(P, id)));
          const out = await E.render(P, { song, loops: 4, ending: ui.ending });
          const wav = BL.dsp.encodeWAV(out.channels, out.sampleRate);
          closeModal();
          await saveFile(fileSafe(P.name) + '.wav', wav);
        } catch (e) {
          $('#expStatus', m).textContent = 'Export failed: ' + (e && e.message ? e.message : e);
          $('#doExport', m).disabled = false;
        }
      });
    });
  }

  // ---------- drag & drop audio anywhere ----------
  function bindDrop() {
    let depth = 0;
    window.addEventListener('dragenter', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { depth++; document.body.classList.add('dropping'); } });
    window.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) document.body.classList.remove('dropping'); });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      depth = 0;
      document.body.classList.remove('dropping');
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      if (/\.json$/i.test(f.name)) return openProjectFile(f);
      setTab('lab');
      await BL.lab.importFile(f);
    });
  }

  function renderAll() {
    renderTop();
    renderPatBar();
    renderRack();
    renderDock();
  }

  // ---------- Apple-style control polish ----------
  /** slide a thumb under the selected option of every segmented control */
  function updateSegs() {
    $$('.seg').forEach((seg) => {
      const on = $('button.is-on', seg);
      let thumb = $(':scope > .seg-thumb', seg);
      if (!on) { if (thumb) thumb.style.opacity = '0'; return; }
      if (!thumb) { thumb = document.createElement('span'); thumb.className = 'seg-thumb'; seg.prepend(thumb); }
      thumb.style.opacity = '';
      thumb.style.width = on.offsetWidth + 'px';
      thumb.style.transform = `translateX(${on.offsetLeft}px)`;
      if (!thumb.classList.contains('ready')) requestAnimationFrame(() => thumb.classList.add('ready'));
    });
  }
  function paintRange(r) {
    const min = +r.min || 0, max = r.max === '' ? 100 : +r.max;
    r.style.setProperty('--fill', (((+r.value - min) / (max - min)) * 100).toFixed(1) + '%');
  }
  function polish() { updateSegs(); $$('input[type=range]').forEach(paintRange); }
  let polishQueued = false;
  function queuePolish() {
    if (polishQueued) return;
    polishQueued = true;
    requestAnimationFrame(() => { polishQueued = false; polish(); });
  }
  function bindPolish() {
    document.addEventListener('input', (e) => { if (e.target.type === 'range') paintRange(e.target); });
    new MutationObserver((muts) => {
      for (const m of muts) {
        const t = m.target;
        if (m.type === 'childList' && t.nodeType === 1 && !t.closest('.lane') && !t.classList.contains('roll-notes')) { queuePolish(); return; }
        if (m.type === 'attributes' && t.parentElement && t.parentElement.classList.contains('seg')) { queuePolish(); return; }
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', queuePolish);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queuePolish);
  }

  // ---------- boot ----------
  async function boot() {
    cacheDom();
    E.setProjectGetter(() => P);
    BL.lab.init({
      project: () => P, edit, toast, ui,
      labHost: () => (ui.tab === 'lab' ? R.dockBody : null),
      rackChanged: () => { renderRack(); },
      addSampleTrack,
    });
    bindPolish();
    bindTop();
    bindPatBar();
    bindHints();
    bindDrop();
    $$('[data-tab]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
    let rsz = null;
    window.addEventListener('resize', () => { clearTimeout(rsz); rsz = setTimeout(() => { sizeSteps(); drawLanes(); BL.lab.drawWave(); if (ui.tab === 'roll') renderDock(); }, 120); });
    showLoading('Building the drum kits…');
    await S.renderDrums();
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { saved = null; }
    hideLoading();
    if (saved && saved.tracks) {
      await loadProject(Object.assign(newProject(), saved));
      toast('Welcome back. Your last beat is right where you left it.');
    } else {
      await loadProject(projectFromPreset(BL.beats.PRESETS[0]));
      openBeats();
    }
  }

  window.BL.app = { get project() { return P; }, ui, toast, renderAll, loadProject, projectFromPreset };
  boot();
})();
