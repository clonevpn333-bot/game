/* BeatLab — the studio: toolbar + LCD, Browser, Playlist, Channel Rack, Piano Roll, Sample Lab, Mixer,
 * project library, export (mixdown / stems) and the Mac app bridge. */
(function () {
  const BL = window.BL;
  const T = BL.theory, S = BL.sounds, E = BL.engine, M = BL.magic, MD = BL.media;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const STORE_KEY = 'beatlab.project.v1';
  const PREFS_KEY = 'beatlab.prefs.v1';
  const NATIVE = window.beatlabNative || null;
  const IS_MAC = NATIVE ? NATIVE.platform === 'darwin' : /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const CMD = IS_MAC ? '⌘' : 'Ctrl+';

  const ui = {
    tab: 'rack', sel: null, tool: 'draw', brush: null, noteLen: 2, chordMode: false, kbOct: 0,
    recording: false, labSample: null, labAuto: true, labCrop: false, lastEv: null,
    chopBrush: {}, barW: 56, snap: 1, open: {}, browser: true, plH: 0, ending: 'none', dirty: false,
  };
  let P = null;
  const undoStack = [], redoStack = [];

  // ---------- icons (SF Symbols-like line icons) ----------
  const ICONS = {
    play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/>',
    rec: '<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/>',
    tostart: '<path d="M6 5v14" /><path d="M19 5.5v13L9 12z" fill="currentColor" stroke="none"/>',
    sidebar: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M9 4.5v15"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    import: '<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M5 19h14"/>',
    export: '<path d="M12 15V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
    save: '<path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M8 4v5h7V4"/><rect x="8" y="13" width="8" height="5" rx="1"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
    trash: '<path d="M5 7h14"/><path d="M10 11v6M14 11v6"/><path d="M6.5 7l1 12a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1l1-12"/><path d="M9.5 7V4.5h5V7"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.2-2.5 3.8"/><path d="M12 17.2h.01"/>',
    volume: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor" stroke="none"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    sparkle: '<path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2-5.2-1.8 5.2-1.8z" fill="currentColor" stroke="none"/>',
    more: '<circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
    left: '<path d="m15 6-6 6 6 6"/>',
    right: '<path d="m9 6 6 6-6 6"/>',
    tabSounds: '<rect x="3.5" y="5" width="7" height="14" rx="1.5"/><rect x="13.5" y="5" width="7" height="14" rx="1.5" transform="rotate(-12 17 12)"/><path d="M6 9h2M6 12h2"/>',
    tabBeat: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8" fill="currentColor"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8" fill="currentColor"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>',
    tabMelody: '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    tabSample: '<path d="M3 12h2l2-6 3 12 3-15 3 15 2-6h3"/>',
    tabSong: '<rect x="3" y="5" width="8" height="4" rx="1.2"/><rect x="9" y="11" width="9" height="4" rx="1.2"/><rect x="5" y="17" width="12" height="3" rx="1.2"/><path d="M3 3v18"/>',
    tabMix: '<path d="M6 4v16M12 4v16M18 4v16"/><rect x="4" y="13" width="4" height="3" rx="1" fill="currentColor"/><rect x="10" y="7" width="4" height="3" rx="1" fill="currentColor"/><rect x="16" y="11" width="4" height="3" rx="1" fill="currentColor"/>',
    folder: '<path d="M3.5 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
  };
  const icon = (n) => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

  // ---------- model ----------
  const uid = (p) => (p || 't') + Math.random().toString(36).slice(2, 9);
  const nSteps = () => P.bars * 16;
  const curPat = () => P.patterns[P.current] || P.patterns[0];
  const PAT_COLORS = ['#5e9cff', '#bf5af2', '#30d158', '#ff9f0a', '#ff453a', '#64d2ff', '#ffd60a', '#ff6ab3', '#a2845e', '#7d7aff'];
  const newPattern = (i) => ({ name: 'Pattern ' + (i + 1), color: PAT_COLORS[i % PAT_COLORS.length], data: {} });
  function newLane(p) {
    return { id: uid('L'), name: 'Track ' + (p.lanes.length + 1), vol: 0.8, pan: 0, rev: 0, mute: false, solo: false };
  }
  function newProject(o) {
    const p = Object.assign({
      v: 2, name: 'Untitled', bpm: 140, key: 0, scale: 'minor', swing: 0, bars: 2, current: 0, songMode: false, pos: 0,
      master: { vol: 0.85, punch: 0.5, lofi: false }, tracks: [], patterns: [newPattern(0)], samples: {}, audio: {}, lanes: [], clips: [],
    }, o || {});
    while (p.lanes.length < 6) p.lanes.push(newLane(p));
    return p;
  }
  /** bring older saves up to date (v1 had 4 lettered patterns and a song strip) */
  function migrate(raw) {
    const p = Object.assign(newProject(), raw);
    if (!p.lanes || !p.lanes.length) { p.lanes = []; while (p.lanes.length < 6) p.lanes.push(newLane(p)); }
    p.audio = p.audio || {};
    p.clips = p.clips || [];
    p.samples = p.samples || {};
    p.master = Object.assign({ vol: 0.85, punch: 0.5, lofi: false }, p.master || {});
    if (!p.v || p.v < 2) {
      p.patterns.forEach((pt, i) => { pt.name = 'Pattern ' + (i + 1); pt.color = PAT_COLORS[i % PAT_COLORS.length]; });
      if (Array.isArray(p.song)) p.song.forEach((pi, i) => p.clips.push({ id: uid('c'), kind: 'pattern', pat: pi, lane: p.lanes[0].id, start: i * p.bars, len: p.bars }));
      const used = (i) => Object.values(p.patterns[i].data).some((d) => (d.notes && d.notes.length) || (d.steps && d.steps.some((v) => v > 0)));
      while (p.patterns.length > 1 && !used(p.patterns.length - 1) && !p.clips.some((c) => c.pat === p.patterns.length - 1)) p.patterns.pop();
      delete p.song;
      p.v = 2;
    }
    p.patterns.forEach((pt, i) => { pt.color = pt.color || PAT_COLORS[i % PAT_COLORS.length]; pt.name = pt.name || 'Pattern ' + (i + 1); });
    if (p.current >= p.patterns.length) p.current = 0;
    return p;
  }

  function catOf(track) {
    if (track.type === 'drum') return MD.soundCat(track.sound);
    if (track.type === 'sample') return 'Sample';
    return (S.INSTRUMENTS[track.inst] || {}).bass ? '808' : 'Melody';
  }
  const CAT_COLORS = {
    Kick: '#ff453a', Snare: '#ff9f0a', Clap: '#ffb340', 'Hi-Hat': '#ffd60a', 'Open Hat': '#c7d93a',
    Perc: '#30d158', FX: '#64d2ff', Loops: '#40c8e0', Melody: '#bf5af2', '808': '#ff375f', Sample: '#40c8e0',
  };
  const colorOf = (t) => CAT_COLORS[catOf(t)] || '#8e8e93';

  function makeTrack(type, o) {
    const t = Object.assign({ id: uid('t'), type, name: '', vol: 0.8, pan: 0, rev: 0, mute: false, solo: false }, o || {});
    if (type === 'drum') { t.sound = t.sound || 'kick_trap'; t.pitch = t.pitch || 0; t.name = t.name || MD.soundName(t.sound); }
    if (type === 'synth') { t.inst = t.inst || 'piano'; t.octave = t.octave || 0; t.name = t.name || S.INSTRUMENTS[t.inst].name; }
    if (type === 'sample') { t.mode = t.mode || 'loop'; t.name = t.name || 'Sample'; }
    return t;
  }

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
  const tr = (p, t) => p.tracks.find((x) => x.id === t.id);

  // ---------- edits, undo, autosave ----------
  function snapshot() {
    undoStack.push(JSON.stringify(P));
    if (undoStack.length > 120) undoStack.shift();
    redoStack.length = 0;
  }
  function changed(opts) {
    opts = opts || {};
    ui.dirty = true;
    autosave();
    E.refreshMix();
    renderStatus();
    if (!opts.noRender) renderAll();
  }
  function edit(fn, opts) { snapshot(); fn(P); changed(opts); }
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
  function autosave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(P)); } catch (e) { /* storage blocked */ } }, 400);
  }
  function savePrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ open: ui.open, browser: ui.browser, barW: ui.barW, plH: ui.plH, tab: ui.tab })); } catch (e) { /* ignore */ }
  }
  function loadPrefs() {
    try { Object.assign(ui, JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')); } catch (e) { /* ignore */ }
    if (window.innerWidth < 900) ui.browser = false;
  }

  // ---------- presets ----------
  function projectFromPreset(pr) {
    const p = newProject({ name: pr.name, bpm: pr.bpm, key: pr.key, scale: pr.scale, swing: pr.swing || 0, bars: pr.bars || 2 });
    p.master.lofi = !!pr.lofi;
    p.patterns = [newPattern(0), newPattern(1)];
    const prev = P;
    P = p;
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
    for (const t0 of pr.tracks) {
      const t = makeTrack(t0.type, { sound: t0.sound, inst: t0.inst, name: t0.name, vol: t0.vol || 0.8, rev: t0.rev || 0, octave: t0.octave || 0, mode: t0.mode });
      if (t0.type === 'sample') t.sampleId = smap[t0.sample];
      p.tracks.push(t);
      ['A', 'B'].forEach((L, pi) => {
        const src = t0[L] != null ? t0[L] : t0.A;
        let d;
        if (t0.type === 'drum') { const row = BL.beats.drumRow(src || ''); d = { steps: fit(row.steps, 0), rolls: fit(row.rolls, 1) }; }
        else if (t0.type === 'synth') d = BL.beats.notes(src || []);
        else if (t0.mode === 'chop') d = { steps: fit(BL.beats.chopRow(src || '').steps, -1), on: true };
        else d = { steps: new Array(n).fill(-1), on: t0[L] !== false };
        p.patterns[pi].data[t.id] = d;
      });
    }
    p.lanes[0].name = 'Beat';
    (pr.song || 'A').split('').forEach((ch, i) => p.clips.push({ id: uid('c'), kind: 'pattern', pat: 'ABCD'.indexOf(ch), lane: p.lanes[0].id, start: i * p.bars, len: p.bars }));
    P = prev;
    return p;
  }

  function blankProject() {
    const p = newProject({ name: 'Untitled' });
    [['drum', { sound: 'kick_trap', name: 'Kick' }], ['drum', { sound: 'clap_trap', name: 'Clap' }], ['drum', { sound: 'snare_trap', name: 'Snare' }],
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
    P = migrate(p);
    ui.dirty = !!opts.dirty;
    ui.brush = null;
    document.body.classList.remove('enter');
    void document.body.offsetWidth;
    document.body.classList.add('enter');
    clearTimeout(enterTimer);
    enterTimer = setTimeout(() => document.body.classList.remove('enter'), 900);
    await afterLoad(true);
    if (opts.play) { E.play(P.songMode ? (P.pos || 0) * 16 : 0); renderTransport(); }
  }

  async function afterLoad(full) {
    P = migrate(P);
    if (!P.tracks.find((t) => t.id === ui.sel)) {
      const synths = P.tracks.filter((t) => t.type === 'synth');
      const busy = synths.find((t) => { const d = curPat().data[t.id]; return d && d.notes && d.notes.length; });
      ui.sel = (busy || synths[0] || P.tracks[0] || {}).id || null;
    }
    if (ui.labSample && !P.samples[ui.labSample]) ui.labSample = null;
    if (!ui.labSample) ui.labSample = Object.keys(P.samples)[0] || null;
    if (!ui.brush || (ui.brush.kind === 'pattern' && !P.patterns[ui.brush.pat])) ui.brush = { kind: 'pattern', pat: P.current };
    E.refreshMix();
    renderAll();
    autosave();
    const loads = [
      ...Object.keys(P.samples).map((id) => BL.lab.ensure(P, id).catch(() => null)),
      ...Object.keys(P.audio).map((id) => MD.ensureAudio(id)),
      ...P.tracks.filter((t) => t.type === 'drum' && /^u:/.test(t.sound)).map((t) => MD.ensureSound(t.sound)),
    ];
    if (!loads.length) return;
    if (full) showLoading('Loading sounds…');
    await Promise.all(loads);
    if (full) hideLoading();
    renderAll();
  }

  // ---------- DOM ----------
  const R = {};
  function buildShell() {
    $('#toolbar').innerHTML = `
      <div class="tb-group tb-left">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="tb-title" id="tbTitle" data-hint="Your project. Save with ${CMD}S."></span>
      </div>
      <div class="tb-group tb-center">
        <div class="transport" role="group" aria-label="Transport">
          <button class="tp" id="tpStart" aria-label="Go to start" data-hint="Back to the start (Return).">${icon('tostart')}</button>
          <button class="tp tp-play" id="tpPlay" aria-label="Play" data-hint="Play / stop (Space).">${icon('play')}</button>
          <button class="tp tp-rec" id="tpRec" aria-label="Record" data-hint="Record notes from your computer keyboard (A S D F G H J K L) into the Melody tab.">${icon('rec')}</button>
        </div>
        <div class="lcd" id="lcd">
          <button class="lcd-cell lcd-mode" id="lcdMode" data-hint="What Play plays: the pattern you're editing on a loop, or your whole song. Click to switch."><b id="lcdModeVal">LOOP</b><small>PLAYS</small></button>
          <div class="lcd-cell lcd-pos" data-hint="Where the playhead is: bar, beat, sixteenth."><b id="lcdPos">1  1  1</b><small>BAR · BEAT</small></div>
          <div class="lcd-cell lcd-tempo" data-hint="Tempo. Drag up or down, type a number, or tap TAP along to a song.">
            <input id="bpm" inputmode="numeric" aria-label="Tempo" autocomplete="off"><small><button id="tapBtn" class="lcd-tap">TAP</button> BPM</small></div>
          <div class="lcd-cell lcd-key" data-hint="Key and scale. Change them and every note, 808 and matched sample follows.">
            <div class="lcd-selects"><select id="keySel" aria-label="Key"></select><select id="scaleSel" aria-label="Scale"></select></div><small>KEY</small></div>
          <canvas class="lcd-viz" id="viz" width="150" height="34" aria-hidden="true"></canvas>
        </div>
      </div>
      <div class="tb-group tb-right">
        <button class="tbtn icon" id="tbUndo" aria-label="Undo" data-hint="Undo (${CMD}Z)">${icon('undo')}</button>
        <button class="tbtn icon" id="tbRedo" aria-label="Redo" data-hint="Redo (${CMD}⇧Z)">${icon('redo')}</button>
        <span class="tb-sep"></span>
        <button class="tbtn" id="tbTemplates" data-hint="Start a new beat (${CMD}N).">${icon('plus')}<span>New</span></button>
        <button class="tbtn" id="tbSave" data-hint="Save to My Projects (${CMD}S).">${icon('save')}<span>Save</span></button>
        <button class="tbtn tbtn-primary" id="tbExport" data-hint="Export a WAV or stems (${CMD}E).">${icon('export')}<span>Export</span></button>
        <button class="tbtn icon" id="tbHelp" aria-label="Help" data-hint="How BeatLab works.">${icon('help')}</button>
      </div>`;
    ['tbTemplates', 'tbUndo', 'tbRedo', 'tpStart', 'tpPlay', 'tpRec', 'lcdPos', 'lcdMode', 'lcdModeVal', 'viz', 'bpm', 'tapBtn', 'keySel', 'scaleSel',
      'tbTitle', 'tbSave', 'tbExport', 'tbHelp', 'bigTabs', 'panel', 'panelHead', 'edBody', 'status', 'hint', 'saveState',
      'toast', 'modal', 'pop', 'loading', 'loadingMsg', 'filePick']
      .forEach((id) => { R[id] = document.getElementById(id); });
  }

  // ---------- toolbar ----------
  function renderTransport() {
    if (!P) return;
    if (document.activeElement !== R.bpm) R.bpm.value = P.bpm;
    R.keySel.value = P.key;
    R.scaleSel.value = P.scale;
    R.lcdModeVal.textContent = P.songMode ? 'SONG' : 'LOOP';
    R.lcdMode.classList.toggle('is-song', !!P.songMode);
    R.tpPlay.classList.toggle('is-on', E.state.playing);
    R.tpPlay.innerHTML = icon(E.state.playing ? 'stop' : 'play');
    R.tpPlay.setAttribute('aria-label', E.state.playing ? 'Stop' : 'Play');
    R.tpRec.classList.toggle('is-on', ui.recording);
    document.body.classList.toggle('is-playing', E.state.playing);
    document.documentElement.style.setProperty('--beat', (60 / P.bpm).toFixed(3) + 's');
    if (!E.state.playing) setLcdPos(P.songMode ? (P.pos || 0) * 16 : 0);
    R.tbTitle.innerHTML = `${esc(P.name)}${ui.dirty || !P.libId ? '<em> — Edited</em>' : ''}`;
    if (NATIVE && NATIVE.setTitle) NATIVE.setTitle(P.name + (ui.dirty ? ' — Edited' : ''));
    document.title = P.name + ' — BeatLab';
  }
  function setLcdPos(abs) {
    const bar = Math.floor(abs / 16) + 1, beat = Math.floor((abs % 16) / 4) + 1, six = (abs % 4) + 1;
    R.lcdPos.textContent = `${bar}  ${beat}  ${six}`;
  }

  function setBpm(v) {
    v = Math.max(50, Math.min(220, Math.round(v)));
    if (v === P.bpm) { R.bpm.value = v; return; }
    const followers = samplesInSync();
    edit((p) => { p.bpm = v; }, { noRender: true });
    renderTransport();
    resyncSamples(followers, true);
    songRefresh();
  }

  function bindToolbar() {
    R.keySel.innerHTML = T.NOTE_NAMES.map((n, i) => `<option value="${i}">${n}</option>`).join('');
    R.scaleSel.innerHTML = Object.entries(T.SCALES).map(([k, s]) => `<option value="${k}">${s.name}</option>`).join('');
    R.tpPlay.addEventListener('click', togglePlay);
    R.tpStart.addEventListener('click', goToStart);
    R.tpRec.addEventListener('click', () => {
      ui.recording = !ui.recording;
      if (ui.recording) {
        if (P.songMode) setMode(false);
        if (ui.tab !== 'roll') setTab('roll');
        if (!E.state.playing) togglePlay();
        toast('Recording: play notes with A S D F G H J K L.');
      }
      renderTransport();
    });
    // tempo: type it, or drag up/down like Logic's LCD
    let drag = null;
    R.bpm.addEventListener('pointerdown', (e) => { drag = { y: e.clientY, v: P.bpm, moved: false }; R.bpm.setPointerCapture(e.pointerId); });
    R.bpm.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dy = drag.y - e.clientY;
      if (Math.abs(dy) > 3) drag.moved = true;
      if (drag.moved) { e.preventDefault(); R.bpm.value = Math.max(50, Math.min(220, Math.round(drag.v + dy / 3))); }
    });
    R.bpm.addEventListener('pointerup', () => { if (drag && drag.moved) { setBpm(+R.bpm.value); R.bpm.blur(); } else R.bpm.select(); drag = null; });
    R.bpm.addEventListener('change', () => setBpm(+R.bpm.value || P.bpm));
    R.bpm.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { setBpm(+R.bpm.value || P.bpm); R.bpm.blur(); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); setBpm(P.bpm + (e.key === 'ArrowUp' ? 1 : -1)); }
    });
    let taps = [];
    R.tapBtn.addEventListener('click', () => {
      const now = performance.now();
      taps = taps.filter((t) => now - t < 2500);
      taps.push(now);
      if (taps.length >= 3) setBpm(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)));
      else toast('Keep tapping along…');
    });
    R.keySel.addEventListener('change', () => {
      const f = samplesInSync();
      edit((p) => { p.key = +R.keySel.value; });
      resyncSamples(f, false);
      toast(`Everything moved to ${T.keyName(P.key, P.scale)}.`);
    });
    R.scaleSel.addEventListener('change', () => {
      const f = samplesInSync();
      edit((p) => { p.scale = R.scaleSel.value; });
      resyncSamples(f, false);
    });
    R.lcdMode.addEventListener('click', () => setMode(!P.songMode));
    R.tbTemplates.addEventListener('click', openTemplates);
    R.tbUndo.addEventListener('click', undo);
    R.tbRedo.addEventListener('click', redo);
    R.tbSave.addEventListener('click', () => saveToLibrary(false));
    R.tbExport.addEventListener('click', () => openExport());
    R.tbHelp.addEventListener('click', openHelp);
  }

  function setMode(song) {
    if (!!P.songMode === song) return;
    const was = E.state.playing;
    if (was) E.stop();
    edit((p) => { p.songMode = song; }, { noRender: true });
    renderTransport();
    songRefresh();
    if (song && !P.clips.length) toast('Song mode plays the Playlist. Paint some patterns into it first.');
    if (was) { E.play(song ? (P.pos || 0) * 16 : 0); renderTransport(); }
  }
  function togglePlay() {
    if (E.state.playing) stopAll();
    else { E.play(P.songMode ? (P.pos || 0) * 16 : 0); renderTransport(); }
  }
  function stopAll() {
    E.stop();
    ui.recording = false;
    renderTransport();
    BL.playlist.playhead(null);
  }
  function goToStart() {
    P.pos = 0;
    autosave();
    if (E.state.playing) { E.stop(); E.play(0); }
    renderTransport();
    songRefresh();
  }
  function toggleBrowser() { setTab(ui.tab === 'sounds' ? 'rack' : 'sounds'); }
  function songRefresh() { if (ui.tab === 'song') renderEditor(); }

  /** samples that currently match tempo / key, so they keep matching after a change */
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
      autosave();
      Object.keys(P.samples).forEach((id) => BL.lab.ensure(P, id).then(() => { drawLanes(); if (ui.tab === 'lab') BL.lab.render(); }));
    };
    if (delay) resyncTimer = setTimeout(run, 350); else run();
  }

  // ---------- editor tabs ----------
  const TABS = [
    { id: 'sounds', label: 'Sounds', sub: 'Packs & templates', icon: 'tabSounds', color: '#64d2ff', key: 'F4',
      help: 'Pick a pack or drop in your own. Click any sound to hear it, then drag it onto a row in Beat.' },
    { id: 'rack', label: 'Beat', sub: 'Drums & patterns', icon: 'tabBeat', color: '#ff9f0a', key: 'F6',
      help: 'Click the squares to place hits. Each row is one sound. Press Space to hear it.' },
    { id: 'roll', label: 'Melody', sub: 'Notes, chords & 808s', icon: 'tabMelody', color: '#bf5af2', key: 'F7',
      help: 'Click to draw notes. Only notes in your key are shown, so nothing sounds wrong.' },
    { id: 'lab', label: 'Sample', sub: 'Flip any sound', icon: 'tabSample', color: '#40c8e0', key: 'F8',
      help: 'Pick a record or load your own audio, then change its speed and pitch and chop it up.' },
    { id: 'song', label: 'Song', sub: 'Arrange the track', icon: 'tabSong', color: '#0a84ff', key: 'F5',
      help: 'Paint your patterns and audio along the timeline to build the full song.' },
    { id: 'mix', label: 'Mix', sub: 'Levels & export', icon: 'tabMix', color: '#30d158', key: 'F9',
      help: 'Balance how loud each sound is, then export your beat.' },
  ];
  function renderTabs() {
    R.bigTabs.innerHTML = TABS.map((t) => `<button role="tab" class="bigtab ${ui.tab === t.id ? 'is-on' : ''}" data-tab="${t.id}" style="--tc:${t.color}" aria-selected="${ui.tab === t.id}" data-hint="${t.label}: ${t.sub} (${t.key})">
      <span class="bt-ico">${icon(t.icon)}</span><span class="bt-text"><b>${t.label}</b><small>${t.sub}</small></span></button>`).join('');
    $$('[data-tab]', R.bigTabs).forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  }
  function renderPanelHead() {
    const t = TABS.find((x) => x.id === ui.tab) || TABS[1];
    const action = {
      sounds: `<button class="tbtn tbtn-primary big" data-ph="pack">${icon('import')}<span>Import a Beat Pack</span></button>`,
      rack: `<button class="tbtn tbtn-magic big" data-ph="drums">${icon('sparkle')}<span>Write Drums for Me</span></button>`,
      roll: `<button class="tbtn tbtn-magic big" data-ph="melody">${icon('sparkle')}<span>Write It for Me</span></button>`,
      lab: '',
      song: `<button class="tbtn tbtn-primary big" data-ph="audio">${icon('import')}<span>Import Audio</span></button>`,
      mix: `<button class="tbtn tbtn-primary big" data-ph="export">${icon('export')}<span>Export</span></button>`,
    }[t.id];
    R.panelHead.style.setProperty('--tc', t.color);
    R.panelHead.innerHTML = `<span class="ph-ico">${icon(t.icon)}</span><div class="ph-text"><h1>${t.label}</h1><p>${t.help}</p></div><span class="ph-spacer"></span>${action}`;
    const b = $('[data-ph]', R.panelHead);
    if (!b) return;
    b.addEventListener('click', (e) => {
      const k = b.dataset.ph;
      if (k === 'pack') pickPack(e.currentTarget);
      else if (k === 'drums') magicDrums();
      else if (k === 'melody') { const t2 = P.tracks.find((x) => x.id === ui.sel && x.type === 'synth') || P.tracks.find((x) => x.type === 'synth'); if (t2) openMagic(t2, e.currentTarget); else toast('Add an instrument first.'); }
      else if (k === 'audio') pickAudioFiles();
      else if (k === 'export') openExport();
    });
  }
  function magicDrums() {
    edit((p) => {
      const pat = p.patterns[p.current];
      p.tracks.filter((t) => t.type === 'drum').forEach((t) => Object.assign(patData(pat, t), M.drumPattern(catOf(t), p.bpm, nSteps())));
    });
    if (!E.state.playing) togglePlay();
    toast('Fresh drums written. Press it again for another idea, or ' + CMD + 'Z to go back.');
  }
  function setTab(tab) {
    const changedTab = ui.tab !== tab;
    ui.tab = tab;
    savePrefs();
    // Play follows what you're looking at: the Song tab plays the song, the editors loop the pattern
    const wantSong = tab === 'song' ? true : ['rack', 'roll', 'lab'].includes(tab) ? false : null;
    if (wantSong !== null && !!P.songMode !== wantSong && (!wantSong || P.clips.length)) {
      const was = E.state.playing;
      if (was) E.stop();
      P.songMode = wantSong;
      autosave();
      if (was) E.play(wantSong ? (P.pos || 0) * 16 : 0);
      renderTransport();
    }
    $$('[data-tab]', R.bigTabs).forEach((b) => { b.classList.toggle('is-on', b.dataset.tab === tab); b.setAttribute('aria-selected', b.dataset.tab === tab); });
    renderPanelHead();
    renderEditor();
    if (changedTab) {
      R.edBody.classList.remove('switching');
      void R.edBody.offsetWidth;
      R.edBody.classList.add('switching');
    }
  }
  function renderEditor() {
    const body = R.edBody;
    const sw = body.classList.contains('switching');
    body.className = 'ed-body tab-' + ui.tab + (sw ? ' switching' : '');
    if (ui.tab === 'rack') renderRack();
    else if (ui.tab === 'roll') renderRoll(body);
    else if (ui.tab === 'lab') BL.lab.render();
    else if (ui.tab === 'song') BL.playlist.render(body);
    else if (ui.tab === 'sounds') renderSounds(body);
    else renderMixer(body);
  }

  // ---------- sounds tab ----------
  function renderSounds(body) {
    const kits = BL.beats.KITS;
    const packCard = (pk) => {
      const counts = {};
      pk.sounds.forEach((x) => { counts[x.cat] = (counts[x.cat] || 0) + 1; });
      return `<div class="kit kit-user" style="--c:#8e8e93"><span class="kit-art">${icon('folder')}</span><div class="kit-text"><b>${esc(pk.name)}</b><small>${pk.sounds.length} sounds · ${Object.entries(counts).slice(0, 4).map(([c, n]) => n + ' ' + c.toLowerCase()).join(', ')}</small></div>
        <div class="kit-actions"><button class="tbtn" data-showpack="${pk.id}">Show Sounds</button></div></div>`;
    };
    body.innerHTML = `<div class="sounds">
      <div class="snd-main">
        <label class="dropzone" id="packDrop" data-hint="Drop a beat pack (.zip or folder) or audio files here.">
          <span class="dz-ico">${icon('import')}</span>
          <b>Drop a beat pack here</b>
          <small>A .zip, a folder, or a handful of WAV / MP3 files. BeatLab sorts them into kicks, snares, hats, 808s, percs, FX and loops.</small>
          <span class="dz-buttons"><button class="tbtn tbtn-primary" data-pick="files">Choose Files…</button><button class="tbtn" data-pick="folder">Choose Folder…</button></span>
        </label>
        <h2 class="snd-h">BeatLab Packs <small>Made for the sound of specific songs</small></h2>
        <div class="kit-grid">${kits.map((k) => `<div class="kit" style="--c:${k.color}">
          <span class="kit-art"><i></i><i></i><i></i><i></i></span>
          <div class="kit-text"><b>${k.name}</b><small>Inspired by ${esc(k.inspired)}</small><em>${k.blurb}</em></div>
          <div class="kit-actions"><button class="tbtn tbtn-primary" data-kitbeat="${k.preset}">${icon('play')}<span>Start a Beat</span></button><button class="tbtn" data-showkit="${k.id}">Show Sounds</button></div></div>`).join('')}</div>
        <h2 class="snd-h">Your Packs</h2>
        ${MD.packs.length ? `<div class="kit-grid">${MD.packs.map(packCard).join('')}</div>` : '<p class="snd-empty">Packs you import show up here, and in the list on the right.</p>'}
        <h2 class="snd-h">Templates <small>Finished beats to start from</small></h2>
        <div class="tpl-grid">${BL.beats.PRESETS.filter((pr) => !pr.kit).map((pr) => `<button class="tpl" data-preset="${pr.id}" style="--c:${pr.color}">
          <span class="tpl-art"><i></i><i></i><i></i><i></i></span><span class="tpl-text"><b>${pr.name}</b><small>${pr.bpm} BPM · ${T.keyName(pr.key, pr.scale)}</small><em>${pr.tags.slice(0, 3).join(' · ')}</em></span></button>`).join('')}</div>
      </div>
      <aside class="snd-browser browser" id="browserHost" aria-label="All sounds"></aside>
    </div>`;
    BL.browser.render($('#browserHost', body));
    const dz = $('#packDrop', body);
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('is-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('is-over'));
    dz.addEventListener('drop', () => dz.classList.remove('is-over'));
    $$('[data-pick]', dz).forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault();
      if (b.dataset.pick === 'folder') pickFile('', true, importPack, true);
      else pickFile('.zip,audio/*,.wav,.mp3,.aif,.aiff,.flac,.ogg,.m4a', true, importPack);
    }));
    $$('[data-kitbeat]', body).forEach((b) => b.addEventListener('click', () => loadPreset(b.dataset.kitbeat)));
    $$('[data-preset]', body).forEach((b) => b.addEventListener('click', () => loadPreset(b.dataset.preset)));
    const reveal = (keys) => {
      ui.open.kits = true;
      keys.forEach((k) => { ui.open[k] = true; });
      savePrefs();
      BL.browser.render($('#browserHost', body));
      const el = $(`[data-folder="${keys[keys.length - 1]}"]`, body);
      if (el) { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 900); }
    };
    $$('[data-showkit]', body).forEach((b) => b.addEventListener('click', () => reveal(['kits', 'kit-' + b.dataset.showkit])));
    $$('[data-showpack]', body).forEach((b) => b.addEventListener('click', () => reveal(['packs', 'pk-' + b.dataset.showpack])));
  }

  // ---------- channel rack ----------
  function soundOptions(t) {
    if (t.type === 'drum') {
      let h = S.DRUM_CATS.map((c) => `<optgroup label="${c}">${S.DRUMS.filter((d) => d.cat === c && !d.kit).map((d) => `<option value="${d.id}" ${d.id === t.sound ? 'selected' : ''}>${d.name}</option>`).join('')}</optgroup>`).join('');
      BL.beats.KITS.forEach((k) => { h += `<optgroup label="${k.name}">${S.DRUMS.filter((d) => d.kit === k.id).map((d) => `<option value="${d.id}" ${d.id === t.sound ? 'selected' : ''}>${d.name}</option>`).join('')}</optgroup>`; });
      MD.packs.forEach((pk) => {
        const list = pk.sounds.filter((s) => s.cat !== 'Loops' || 'u:' + s.id === t.sound);
        if (list.length) h += `<optgroup label="${esc(pk.name)}">${list.map((s) => `<option value="u:${s.id}" ${'u:' + s.id === t.sound ? 'selected' : ''}>${esc(s.cat + ' · ' + s.name)}</option>`).join('')}</optgroup>`;
      });
      if (/^u:/.test(t.sound) && !MD.packs.some((pk) => pk.sounds.some((s) => 'u:' + s.id === t.sound))) h += `<option value="${t.sound}" selected>${esc(MD.soundName(t.sound))}</option>`;
      return h;
    }
    if (t.type === 'synth') {
      const cats = [...new Set(Object.values(S.INSTRUMENTS).map((i) => i.cat))];
      return cats.map((c) => `<optgroup label="${c}">${Object.entries(S.INSTRUMENTS).filter(([, i]) => i.cat === c).map(([k, i]) => `<option value="${k}" ${k === t.inst ? 'selected' : ''}>${i.name}</option>`).join('')}</optgroup>`).join('');
    }
    return Object.values(P.samples).map((s) => `<option value="${s.id}" ${s.id === t.sampleId ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  }

  function laneHtml(t) {
    const n = nSteps();
    const d = patData(curPat(), t);
    const cls = (i) => `${i % 4 === 0 ? 'b4' : ''} ${i % 16 === 0 ? 'b16' : ''} ${Math.floor(i / 4) % 2 ? 'odd' : ''}`;
    if (t.type === 'drum') {
      let h = '';
      for (let i = 0; i < n; i++) {
        const v = d.steps[i], r = d.rolls[i] || 1;
        h += `<button class="cell ${cls(i)} ${v ? 'on' : ''}" data-step="${i}" style="--v:${v || 0}" aria-label="Step ${i + 1}">${v && r > 1 ? `<i class="rollx">×${r}</i>` : ''}</button>`;
      }
      return `<div class="lane lane-steps">${h}</div>`;
    }
    if (t.type === 'synth') {
      let h = '';
      for (let i = 0; i < n; i++) h += `<span class="cell ghost ${cls(i)}" data-step="${i}"></span>`;
      return `<div class="lane lane-notes" data-hint="Click to edit these notes in the Piano Roll.">${h}<canvas class="lane-canvas"></canvas></div>`;
    }
    if (t.mode === 'chop') {
      let h = '';
      for (let i = 0; i < n; i++) {
        const v = d.steps[i];
        h += `<button class="cell chop ${cls(i)} ${v >= 0 ? 'on' : ''}" data-step="${i}" style="--h:${v >= 0 ? (v * 37) % 360 : 0}">${v >= 0 ? v + 1 : ''}</button>`;
      }
      return `<div class="lane lane-steps">${h}</div>`;
    }
    let h = '';
    for (let i = 0; i < n; i++) h += `<span class="cell ghost ${cls(i)}" data-step="${i}"></span>`;
    const rt = BL.lab.runtime(t.sampleId);
    return `<div class="lane lane-loop ${d.on === false ? 'off' : ''}">${h}<canvas class="lane-canvas"></canvas>
      <button class="loop-toggle" data-hint="Turn this loop on or off in this pattern.">${d.on === false ? 'Off in this pattern' : esc((P.samples[t.sampleId] || {}).name || 'Sample') + (rt && rt.processed ? '' : ' · loading')}</button></div>`;
  }

  function trackRow(t, i) {
    const sel = ui.sel === t.id;
    const chopSel = t.type === 'sample' && t.mode === 'chop' ? `<span class="chop-brush" data-hint="Which chop a click places. ◀ ▶ to change.">
      <button data-act="chopPrev" aria-label="Previous chop">${icon('left')}</button><b>${(ui.chopBrush[t.id] || 0) + 1}</b><button data-act="chopNext" aria-label="Next chop">${icon('right')}</button></span>` : '';
    return `<div class="trk ${sel ? 'is-sel' : ''} ${t.mute ? 'is-mute' : ''}" data-id="${t.id}" style="--c:${colorOf(t)};--i:${i}">
      <div class="trk-head">
        <button class="led ${t.mute ? '' : 'on'}" data-act="mute" aria-label="Mute ${esc(t.name)}" data-hint="Channel on / off."></button>
        <div class="trk-main">
          <div class="trk-top">
            <button class="trk-name" data-act="select" data-hint="Select. Double-click to rename.">${esc(t.name)}</button>
            <button class="mini ${t.solo ? 'is-on' : ''}" data-act="solo" aria-pressed="${t.solo}" data-hint="Solo: hear only this channel.">S</button>
            <button class="mini magic" data-act="magic" aria-label="Write it for me" data-hint="Write a part for this channel.">${icon('sparkle')}</button>
            <button class="mini" data-act="menu" aria-label="Channel options" data-hint="Pitch, octave, pan, reverb, clear, duplicate, delete.">${icon('more')}</button>
          </div>
          <div class="trk-bot">
            <select class="trk-sound" data-act="sound" aria-label="Sound">${soundOptions(t)}</select>
            ${chopSel || `<input type="range" class="trk-vol" data-act="vol" min="0" max="1" step="0.01" value="${t.vol}" aria-label="Volume" data-hint="Volume for ${esc(t.name)}.">`}
          </div>
        </div>
      </div>
      ${laneHtml(t)}
    </div>`;
  }

  function rackEl() { return $('#rack', R.edBody); }

  function renderRack() {
    if (ui.tab !== 'rack') return;
    const body = R.edBody;
    const old = rackEl();
    const sl = old ? old.scrollLeft : 0, st = old ? old.scrollTop : 0;
    body.innerHTML = `
      <div class="ed-tools">
        <div class="patsel" data-hint="The pattern you're editing. Each pattern is a loop you can paint into the Playlist.">
          <button class="tbtn icon" id="patPrev" aria-label="Previous pattern">${icon('left')}</button>
          <i class="pat-swatch" style="--c:${curPat().color}"></i>
          <select id="patSel" aria-label="Pattern">${P.patterns.map((pt, i) => `<option value="${i}" ${i === P.current ? 'selected' : ''}>${esc(pt.name)}</option>`).join('')}</select>
          <button class="tbtn icon" id="patNext" aria-label="Next pattern">${icon('right')}</button>
          <button class="tbtn icon" id="patNew" aria-label="New pattern" data-hint="New empty pattern.">${icon('plus')}</button>
          <button class="tbtn icon" id="patMore" aria-label="Pattern options" data-hint="Rename, duplicate, clear or delete this pattern.">${icon('more')}</button>
        </div>
        <span class="tb-sep"></span>
        <div class="seg seg-sm" id="barsSeg" role="group" aria-label="Pattern length" data-hint="Pattern length. Longer copies what you have.">
          ${[1, 2, 4].map((b) => `<button data-bars="${b}" class="${P.bars === b ? 'is-on' : ''}">${b} bar${b > 1 ? 's' : ''}</button>`).join('')}
        </div>
        <label class="ph-field" data-hint="Swing pushes every other 16th late for bounce.">Swing <input type="range" id="swing" min="0" max="0.6" step="0.01" value="${P.swing}"><output id="swingOut">${Math.round(P.swing * 100)}%</output></label>
        <span class="ph-spacer"></span>
        <div class="seg seg-sm" id="toolSeg" role="group" aria-label="Step tool">
          <button data-tool="draw" class="${ui.tool === 'draw' ? 'is-on' : ''}" data-hint="Draw: click or drag to add or remove hits.">Draw</button>
          <button data-tool="roll" class="${ui.tool === 'roll' ? 'is-on' : ''}" data-hint="Rolls: click a hit for ×2, ×3, ×4 rolls.">Rolls</button>
          <button data-tool="vel" class="${ui.tool === 'vel' ? 'is-on' : ''}" data-hint="Velocity: click a hit to make it soft, normal or loud.">Velocity</button>
        </div>
      </div>
      <div class="rack" id="rack">
        ${P.tracks.map(trackRow).join('')}
        <div class="add-row">
          <button class="tbtn" data-add="drum" data-hint="Add a drum channel.">${icon('plus')}<span>Drum</span></button>
          <button class="tbtn" data-add="synth" data-hint="Add an instrument channel.">${icon('plus')}<span>Instrument</span></button>
          <button class="tbtn" data-add="bass" data-hint="Add an 808 or bass channel.">${icon('plus')}<span>808 / Bass</span></button>
          <button class="tbtn" data-add="sample" data-hint="Flip a sample in the Sample Lab.">${icon('plus')}<span>Sample</span></button>
          <span class="add-tip">Drag sounds from the Browser onto a channel to swap them.</span>
        </div>
      </div>`;
    const rk = rackEl();
    rk.scrollLeft = sl; rk.scrollTop = st;
    sizeSteps();
    bindRackTools();
    bindRack();
    cacheColumns();
    drawLanes();
  }

  function sizeSteps() {
    const rk = rackEl();
    if (!rk) return;
    const n = nSteps();
    const head = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--head-w')) || 230;
    const avail = rk.clientWidth - head - 28;
    const gaps = (n - 1) * 2 + (n / 4 - 1) * 3 + (n / 16 - 1) * 6;
    const w = Math.max(20, Math.min(46, Math.floor((avail - gaps) / n)));
    rk.style.setProperty('--step-w', w + 'px');
  }

  function bindRackTools() {
    const sel = $('#patSel');
    sel.addEventListener('change', () => openPattern(+sel.value));
    $('#patPrev').addEventListener('click', () => openPattern((P.current - 1 + P.patterns.length) % P.patterns.length));
    $('#patNext').addEventListener('click', () => openPattern((P.current + 1) % P.patterns.length));
    $('#patNew').addEventListener('click', () => {
      if (P.patterns.length >= 32) return toast('That’s the maximum of 32 patterns.');
      edit((p) => { p.patterns.push(newPattern(p.patterns.length)); p.current = p.patterns.length - 1; });
      ui.brush = { kind: 'pattern', pat: P.current };
      songRefresh();
      toast(`${curPat().name} is ready. Paint it into the Playlist when you like it.`);
    });
    $('#patMore').addEventListener('click', (e) => patternMenu(e.currentTarget));
    $$('[data-bars]').forEach((b) => b.addEventListener('click', () => setBars(+b.dataset.bars)));
    const sw = $('#swing');
    sw.addEventListener('input', () => { $('#swingOut').textContent = Math.round(sw.value * 100) + '%'; });
    sw.addEventListener('change', () => edit((p) => { p.swing = +sw.value; }, { noRender: true }));
    $$('[data-tool]').forEach((b) => b.addEventListener('click', () => {
      ui.tool = b.dataset.tool;
      $$('[data-tool]').forEach((x) => x.classList.toggle('is-on', x === b));
    }));
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
    toast(n * 16 > old ? `Patterns are now ${n} bars. What you had was copied to fill them.` : `Patterns are now ${n} bar${n > 1 ? 's' : ''}.`);
  }

  function openPattern(i) {
    P.current = i;
    ui.brush = { kind: 'pattern', pat: i };
    autosave();
    if (ui.tab !== 'rack' && ui.tab !== 'roll') ui.tab = 'rack';
    renderTabs();
    renderEditor();
    songRefresh();
  }

  function patternMenu(anchor) {
    openPop(anchor, `<div class="menu"><div class="menu-head">${esc(curPat().name)}</div>
      <button data-m="rename">Rename…</button><button data-m="dup">Duplicate</button><button data-m="clear">Clear</button>
      <button data-m="color">Change Color</button><hr><button data-m="del" class="danger" ${P.patterns.length < 2 ? 'disabled' : ''}>Delete Pattern</button></div>`, (pop) => {
      const on = (k, fn) => $(`[data-m="${k}"]`, pop).addEventListener('click', () => { closePop(); fn(); });
      on('rename', () => inlineRename($('#patSel'), curPat().name, (v) => edit((p) => { p.patterns[p.current].name = v; })));
      on('dup', () => {
        if (P.patterns.length >= 32) return toast('That’s the maximum of 32 patterns.');
        edit((p) => {
          const src = p.patterns[p.current];
          p.patterns.push({ name: src.name + ' copy', color: PAT_COLORS[p.patterns.length % PAT_COLORS.length], data: JSON.parse(JSON.stringify(src.data)) });
          p.current = p.patterns.length - 1;
        });
        ui.brush = { kind: 'pattern', pat: P.current };
        songRefresh();
        toast('Duplicated. Change it up for a hook or a verse.');
      });
      on('clear', () => { edit((p) => { p.patterns[p.current].data = {}; }); toast('Pattern cleared. Undo with ' + CMD + 'Z.'); });
      on('color', () => edit((p) => { const pt = p.patterns[p.current]; pt.color = PAT_COLORS[(PAT_COLORS.indexOf(pt.color) + 1) % PAT_COLORS.length]; }));
      on('del', () => {
        if (P.patterns.length < 2) return;
        edit((p) => {
          const i = p.current;
          p.patterns.splice(i, 1);
          p.clips = p.clips.filter((c) => !(c.kind === 'pattern' && c.pat === i));
          p.clips.forEach((c) => { if (c.kind === 'pattern' && c.pat > i) c.pat -= 1; });
          p.current = Math.max(0, i - 1);
        });
        ui.brush = { kind: 'pattern', pat: P.current };
      });
    });
  }

  let columns = [];
  function cacheColumns() {
    columns = [];
    const rk = rackEl();
    if (!rk) return;
    $$('.lane [data-step]', rk).forEach((c) => { const i = +c.dataset.step; (columns[i] = columns[i] || []).push(c); });
  }

  function drawLanes() {
    const rk = rackEl();
    if (!rk) return;
    $$('.trk', rk).forEach((row) => {
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
      const color = colorOf(t);
      const xOf = (i) => (i < cells.length ? cells[i].offsetLeft : cells[cells.length - 1].offsetLeft + cells[cells.length - 1].offsetWidth);
      if (t.type === 'synth') {
        const d = patData(curPat(), t);
        if (!d.notes.length) return;
        let mn = Infinity, mx = -Infinity;
        d.notes.forEach((n) => { mn = Math.min(mn, n.d); mx = Math.max(mx, n.d); });
        const range = Math.max(6, mx - mn + 1);
        const nh = Math.max(3, Math.min(5, (h - 10) / range));
        g.fillStyle = color;
        d.notes.forEach((n) => {
          const x0 = xOf(n.s), x1 = xOf(Math.min(cells.length, n.s + n.l)) - 2;
          const y = h - 5 - ((n.d - mn + 1) / range) * (h - 10);
          g.fillRect(x0 + 1, y, Math.max(3, x1 - x0 - 1), nh);
        });
      } else if (t.type === 'sample') {
        const rt = BL.lab.runtime(t.sampleId);
        if (!rt || !rt.processed) return;
        const sd = 60 / P.bpm / 4;
        const steps = Math.min(cells.length, rt.processed.duration / sd);
        const x1 = xOf(Math.floor(steps)) + (steps % 1) * cells[0].offsetWidth;
        const data = rt.processed.getChannelData(0);
        g.fillStyle = color;
        g.globalAlpha = 0.6;
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

  let paint = null;
  function bindRack() {
    const rk = rackEl();
    $$('.trk', rk).forEach((row) => {
      const t = P.tracks.find((x) => x.id === row.dataset.id);
      const act = (a) => $(`[data-act="${a}"]`, row);
      act('select').addEventListener('click', () => selectTrack(t.id, true));
      act('select').addEventListener('dblclick', (e) => inlineRename(e.currentTarget, t.name, (v) => edit((p) => { tr(p, t).name = v; })));
      act('mute').addEventListener('click', () => edit((p) => { tr(p, t).mute = !tr(p, t).mute; }));
      act('solo').addEventListener('click', () => edit((p) => { tr(p, t).solo = !tr(p, t).solo; }));
      act('menu').addEventListener('click', (e) => openTrackMenu(t, e.currentTarget));
      act('magic').addEventListener('click', (e) => openMagic(t, e.currentTarget));
      const snd = act('sound');
      snd.addEventListener('change', async () => {
        const v = snd.value;
        if (t.type === 'drum') await MD.ensureSound(v);
        setChannelSound(t, v);
      });
      const vol = act('vol');
      if (vol) {
        vol.addEventListener('pointerdown', () => snapshot());
        vol.addEventListener('input', () => { tr(P, t).vol = +vol.value; E.refreshMix(); autosave(); });
      }
      const cp = act('chopPrev'), cn = act('chopNext');
      if (cp) {
        const n = () => ((P.samples[t.sampleId] || {}).chops || 8);
        cp.addEventListener('click', () => { ui.chopBrush[t.id] = ((ui.chopBrush[t.id] || 0) - 1 + n()) % n(); renderRack(); previewChop(t, ui.chopBrush[t.id]); });
        cn.addEventListener('click', () => { ui.chopBrush[t.id] = ((ui.chopBrush[t.id] || 0) + 1) % n(); renderRack(); previewChop(t, ui.chopBrush[t.id]); });
      }
      // drop a Browser sound on a channel to swap it
      row.addEventListener('dragover', (e) => { if (t.type === 'drum' && e.dataTransfer.types.includes('text/beatlab')) { e.preventDefault(); row.classList.add('is-drop'); } });
      row.addEventListener('dragleave', () => row.classList.remove('is-drop'));
      row.addEventListener('drop', async (e) => {
        row.classList.remove('is-drop');
        const raw = e.dataTransfer.getData('text/beatlab');
        if (!raw || t.type !== 'drum') return;
        const item = JSON.parse(raw);
        if (item.kind !== 'drum' && item.kind !== 'pack') return;
        e.preventDefault();
        e.stopPropagation();
        await MD.ensureSound(item.id);
        setChannelSound(t, item.id);
      });
      const lane = $('.lane', row);
      if (t.type === 'drum') bindDrumLane(lane, t);
      else if (t.type === 'synth') lane.addEventListener('click', () => { selectTrack(t.id, true); });
      else if (t.mode === 'chop') bindChopLane(lane, t);
      else {
        $('.loop-toggle', lane).addEventListener('click', () => edit((p) => { const d = patData(p.patterns[p.current], tr(p, t)); d.on = d.on === false; }));
        lane.addEventListener('dblclick', () => { ui.labSample = t.sampleId; setTab('lab'); });
      }
    });
    rk.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('text/beatlab')) e.preventDefault(); });
    rk.addEventListener('drop', async (e) => {
      const raw = e.dataTransfer.getData('text/beatlab');
      if (!raw) return;
      e.preventDefault();
      e.stopPropagation();
      const item = JSON.parse(raw);
      if (item.kind === 'drum' || item.kind === 'pack') { await MD.ensureSound(item.id); addChannel('drum', item.id); }
      else if (item.kind === 'inst') addChannel('synth', item.id);
    });
    $$('[data-add]', rk).forEach((b) => b.addEventListener('click', (e) => addTrackMenu(b.dataset.add, e.currentTarget)));
  }

  function setChannelSound(t, v) {
    edit((p) => {
      const x = tr(p, t);
      if (x.type === 'drum') { const oldName = MD.soundName(x.sound); if (!x.name || x.name === oldName) x.name = MD.soundName(v); x.sound = v; }
      else if (x.type === 'synth') { const old = S.INSTRUMENTS[x.inst]; if (old && x.name === old.name) x.name = S.INSTRUMENTS[v].name; x.inst = v; }
      else x.sampleId = v;
    });
    if (t.type === 'drum') E.previewDrum(v, t.pitch);
    else if (t.type === 'synth') E.previewNote(v, E.noteMidi(P, tr(P, t), 0), 0.5);
  }

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
        const v = d.steps[i];
        d.steps[i] = !v ? 0.8 : v < 0.6 ? 0.8 : v < 0.95 ? 1 : 0.45;
        paint = null;
      } else if (ui.tool === 'roll') {
        if (!d.steps[i]) { d.steps[i] = 0.75; d.rolls[i] = 2; } else d.rolls[i] = (d.rolls[i] || 1) >= 4 ? 1 : (d.rolls[i] || 1) + 1;
        paint = null;
      } else {
        const turnOn = !d.steps[i];
        d.steps[i] = turnOn ? 0.8 : 0;
        d.rolls[i] = 1;
        paint = e.pointerType === 'mouse' ? { t, on: turnOn } : null;
      }
      if (d.steps[i]) E.previewDrum(t.sound, t.pitch);
      updateCell(cell, d, i);
      changed({ noRender: true });
      if (!paint) BL.playlist.drawClips();
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
  window.addEventListener('pointerup', () => { if (paint) { paint = null; BL.playlist.drawClips(); } });

  function updateCell(cell, d, i) {
    const v = d.steps[i], r = d.rolls[i] || 1;
    cell.classList.toggle('on', !!v);
    cell.style.setProperty('--v', v || 0);
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
      if (t.type === 'synth') return setTab('roll');
      if (t.type === 'sample') { ui.labSample = t.sampleId; return setTab('lab'); }
    }
    $$('.trk', rackEl() || document).forEach((r) => r.classList.toggle('is-sel', r.dataset.id === id));
  }

  function inlineRename(el, value, done) {
    const input = document.createElement('input');
    input.className = 'rename';
    input.value = value;
    const r = el.getBoundingClientRect();
    input.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${Math.max(140, r.width)}px;height:${Math.max(22, r.height)}px;z-index:100`;
    document.body.appendChild(input);
    input.focus();
    input.select();
    let finished = false;
    const finish = (keep) => {
      if (finished) return;
      finished = true;
      const v = input.value.trim();
      input.remove();
      if (keep && v && v !== value) done(v);
    };
    input.addEventListener('blur', () => finish(true));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') finish(true); if (e.key === 'Escape') finish(false); e.stopPropagation(); });
  }

  function addChannel(type, id) {
    const inst = type === 'synth' ? S.INSTRUMENTS[id] : null;
    const t = type === 'drum' ? makeTrack('drum', { sound: id }) : makeTrack('synth', { inst: id, rev: inst && inst.bass ? 0 : 0.25 });
    edit((p) => { p.tracks.push(t); }, { noRender: true });
    ui.sel = t.id;
    if (type === 'synth') setTab('roll'); else setTab('rack');
    toast(type === 'drum' ? `Added ${t.name}. Click the steps to place hits.` : `Added ${t.name}. Draw notes in the Piano Roll.`);
  }

  function addTrackMenu(kind, anchor) {
    if (kind === 'sample') { setTab('lab'); toast('Pick a record or load your own, then press “Add to beat”.'); return; }
    let html = '<div class="menu menu-scroll">';
    if (kind === 'drum') {
      S.DRUM_CATS.forEach((c) => { html += `<div class="menu-head">${c}</div>` + S.DRUMS.filter((d) => d.cat === c && !d.kit).map((d) => `<button data-pick="${d.id}">${d.name}</button>`).join(''); });
      BL.beats.KITS.forEach((k) => { html += `<div class="menu-head">${k.name}</div>` + S.DRUMS.filter((d) => d.kit === k.id).map((d) => `<button data-pick="${d.id}">${d.name} <small>${d.cat}</small></button>`).join(''); });
      MD.packs.forEach((pk) => { const l = pk.sounds.filter((s) => s.cat !== 'Loops'); if (l.length) html += `<div class="menu-head">${esc(pk.name)}</div>` + l.map((s) => `<button data-pick="u:${s.id}">${esc(s.name)} <small>${s.cat}</small></button>`).join(''); });
    } else {
      Object.entries(S.INSTRUMENTS).filter(([, i]) => (kind === 'bass' ? i.bass : !i.bass)).forEach(([k, i], idx, arr) => {
        if (!idx || arr[idx - 1][1].cat !== i.cat) html += `<div class="menu-head">${i.cat}</div>`;
        html += `<button data-pick="${k}">${i.name}</button>`;
      });
    }
    html += '</div>';
    openPop(anchor, html, (pop) => {
      $$('[data-pick]', pop).forEach((b) => {
        b.addEventListener('mouseenter', async () => { if (kind === 'drum') { await MD.ensureSound(b.dataset.pick); E.previewDrum(b.dataset.pick); } });
        b.addEventListener('click', async () => {
          closePop();
          if (kind === 'drum') await MD.ensureSound(b.dataset.pick);
          addChannel(kind === 'drum' ? 'drum' : 'synth', b.dataset.pick);
        });
      });
    });
  }

  function addSampleTrack(sampleId, mode) {
    const cfg = P.samples[sampleId];
    const t = makeTrack('sample', { sampleId, mode, name: cfg.name + (mode === 'chop' ? ' chops' : ''), vol: 0.75 });
    edit((p) => {
      p.tracks.push(t);
      const d = patData(p.patterns[p.current], t);
      if (mode === 'chop') d.steps = M.chopPattern(cfg.chops || 8, nSteps());
    }, { noRender: true });
    ui.sel = t.id;
    setTab('rack');
    toast(mode === 'chop' ? 'Chops added. Click steps to place chops; ◀ ▶ picks which one.' : 'Loop added under your beat. Press play.');
  }

  // ---------- popovers & menus ----------
  let popClose = null;
  function openPop(anchor, html, bind) {
    closePop();
    R.pop.innerHTML = html;
    R.pop.hidden = false;
    const r = anchor.getBoundingClientRect();
    const pw = Math.min(260, window.innerWidth - 24);
    R.pop.style.width = pw + 'px';
    R.pop.style.left = Math.min(window.innerWidth - pw - 12, Math.max(12, r.left)) + 'px';
    const below = window.innerHeight - r.bottom;
    R.pop.style.maxHeight = Math.max(180, Math.max(below, r.top) - 24) + 'px';
    if (below > 240 || below > r.top) { R.pop.style.top = r.bottom + 4 + 'px'; R.pop.style.bottom = ''; }
    else { R.pop.style.bottom = window.innerHeight - r.top + 4 + 'px'; R.pop.style.top = ''; }
    if (bind) bind(R.pop);
    const h = (e) => { if (!R.pop.contains(e.target) && !anchor.contains(e.target)) closePop(); };
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
    if (t.type === 'sample') h += `<button data-m="mode">${t.mode === 'chop' ? 'Play as Loop' : 'Play as Chops'}</button><button data-m="lab">Open in Sample Lab</button>`;
    h += `<hr><button data-m="clear">Clear in This Pattern</button><button data-m="dup">Duplicate Channel</button>
      <button data-m="up">Move Up</button><button data-m="down">Move Down</button><hr><button data-m="del" class="danger">Delete Channel</button></div>`;
    openPop(anchor, h, (pop) => {
      $$('[data-step-btn]', pop).forEach((b) => b.addEventListener('click', () => {
        const [k, dir] = b.dataset.stepBtn.split(':');
        edit((p) => { const x = tr(p, t); x[k] = Math.max(k === 'octave' ? -3 : -24, Math.min(k === 'octave' ? 3 : 24, (x[k] || 0) + +dir)); }, { noRender: true });
        const x = tr(P, t);
        $(`[data-val="${k}"]`, pop).textContent = k === 'pitch' ? (x.pitch > 0 ? '+' : '') + x.pitch + ' st' : (x.octave > 0 ? '+' : '') + x.octave;
        if (t.type === 'drum') E.previewDrum(x.sound, x.pitch); else E.previewNote(x.inst, E.noteMidi(P, x, 0), 0.4);
      }));
      $$('input[type=range][data-m]', pop).forEach((inp) => {
        inp.addEventListener('pointerdown', () => snapshot());
        inp.addEventListener('input', () => { tr(P, t)[inp.dataset.m] = +inp.value; E.refreshMix(); autosave(); });
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
        c.id = uid('t'); c.name = x.name + ' 2';
        p.tracks.splice(p.tracks.indexOf(x) + 1, 0, c);
        p.patterns.forEach((pat) => { if (pat.data[x.id]) pat.data[c.id] = JSON.parse(JSON.stringify(pat.data[x.id])); });
      }));
      on('up', () => edit((p) => { const i = p.tracks.findIndex((x) => x.id === t.id); if (i > 0) p.tracks.splice(i - 1, 0, p.tracks.splice(i, 1)[0]); }));
      on('down', () => edit((p) => { const i = p.tracks.findIndex((x) => x.id === t.id); if (i < p.tracks.length - 1) p.tracks.splice(i + 1, 0, p.tracks.splice(i, 1)[0]); }));
      on('del', () => {
        edit((p) => { p.tracks = p.tracks.filter((x) => x.id !== t.id); p.patterns.forEach((pat) => delete pat.data[t.id]); });
        toast(`Deleted ${t.name}. ${CMD}Z brings it back.`);
      });
    });
  }
  function stepper(k, label, v, fmt) {
    return `<div class="menu-row">${label}<span class="stepper"><button data-step-btn="${k}:-1" aria-label="${label} down">−</button><b data-val="${k}">${fmt(v)}</b><button data-step-btn="${k}:1" aria-label="${label} up">+</button></span></div>`;
  }

  function openMagic(t, anchor) {
    const isBass = t.type === 'synth' && (S.INSTRUMENTS[t.inst] || {}).bass;
    let h = '<div class="menu"><div class="menu-head">Write It for Me</div>';
    if (t.type === 'drum') h += `<button data-g="drum">New ${esc(catOf(t).toLowerCase())} pattern</button><button data-g="drum">Another one</button>`;
    else if (isBass) h += '<button data-g="bass">808 follows the kick and chords</button>' + T.PROGRESSIONS.slice(0, 4).map((pr) => `<button data-g="bassprog" data-prog="${pr.id}">Root notes: ${pr.name}</button>`).join('');
    else if (t.type === 'synth') h += '<button data-g="melody">Melody over my chords</button><div class="menu-head">Chord Progressions</div>' + T.PROGRESSIONS.map((pr) => `<button data-g="chords" data-prog="${pr.id}">${pr.name} <small>${T.SCALES[pr.scale].name}</small></button>`).join('');
    else if (t.mode === 'chop') h += '<button data-g="chop">Flip the chops</button>';
    else h += '<p class="menu-note">Loops play the whole sample. Switch to chops in the ⋯ menu to rearrange it.</p>';
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
          else if (g === 'chords') { d.notes = M.progressionNotes(prog, nSteps(), prog.id === 'soul' || prog.id === 'smooth' ? 4 : 3); p.scale = prog.scale; }
          else if (g === 'bassprog') { const block = nSteps() / 4; d.notes = prog.degs.map((dd, i) => ({ s: i * block, d: dd > 3 ? dd - 7 : dd, l: block })); }
          else if (g === 'bass') {
            const kick = p.tracks.find((k) => k.type === 'drum' && catOf(k) === 'Kick');
            d.notes = kick ? M.bassFromKick(p, pat, kick, nSteps(), x.id) : [{ s: 0, d: 0, l: 8 }];
          } else if (g === 'chop') d.steps = M.chopPattern((p.samples[x.sampleId] || {}).chops || 8, nSteps());
        });
        if (g === 'chords' && prog) toast(`${prog.name}: scale set to ${T.SCALES[prog.scale].name}.`);
        if (!E.state.playing) togglePlay();
        closePop();
      }));
    });
  }

  // ---------- piano roll ----------
  const ROW_H = 18;
  let COL_W = 26;
  const rollRange = (t) => ((S.INSTRUMENTS[t.inst] || {}).bass ? [-7, 10] : [-7, 14]);
  function rollRows(t) { const [lo, hi] = rollRange(t); const rows = []; for (let d = hi; d >= lo; d--) rows.push(d); return rows; }
  function renderRoll(body) {
    const t = P.tracks.find((x) => x.id === ui.sel && x.type === 'synth') || P.tracks.find((x) => x.type === 'synth');
    if (!t) {
      body.innerHTML = `<div class="empty-ed"><h3>No instrument channels yet</h3><p>Add an instrument or an 808. Every note you place is locked to your key.</p>
        <button class="tbtn tbtn-primary" id="emptyAdd">${icon('plus')}<span>Add Instrument</span></button></div>`;
      $('#emptyAdd').addEventListener('click', (e) => addTrackMenu('synth', e.currentTarget));
      return;
    }
    ui.sel = t.id;
    COL_W = Math.max(16, Math.min(44, Math.floor((body.clientWidth - 90) / nSteps())));
    const rows = rollRows(t);
    const n = nSteps();
    const inst = S.INSTRUMENTS[t.inst];
    const lens = [[1, '1/16'], [2, '1/8'], [4, '1/4'], [8, '1/2'], [16, '1']];
    const scaleLen = T.SCALES[P.scale].steps.length;
    const synths = P.tracks.filter((x) => x.type === 'synth');
    body.innerHTML = `
      <div class="ed-tools">
        <i class="pat-swatch" style="--c:${colorOf(t)}"></i>
        <select id="rollTrack" aria-label="Channel" data-hint="Which channel you're editing.">${synths.map((x) => `<option value="${x.id}" ${x.id === t.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        <select id="rollInst" aria-label="Instrument" data-hint="The instrument this channel plays.">${soundOptions(t)}</select>
        <span class="tb-sep"></span>
        <div class="seg seg-sm" role="group" aria-label="Note length"><span class="seg-label">Note</span>${lens.map(([v, l]) => `<button class="${ui.noteLen === v ? 'is-on' : ''}" data-len="${v}">${l}</button>`).join('')}</div>
        ${inst.bass ? '' : `<button class="tbtn ${ui.chordMode ? 'is-on' : ''}" id="chordMode" aria-pressed="${ui.chordMode}" data-hint="One click places a whole chord that fits your key.">Chords</button>`}
        <button class="tbtn tbtn-magic" id="rollMagic" data-hint="Chords, melodies and 808 lines written for you.">${icon('sparkle')}<span>Write It for Me</span></button>
        <span class="ph-spacer"></span>
        <span class="roll-keys" data-hint="Your keyboard is a piano that only plays notes in your key. Z / X change octave.">Keys A–L · Octave ${ui.kbOct > 0 ? '+' + ui.kbOct : ui.kbOct}</span>
      </div>
      <div class="roll" id="roll">
        <div class="roll-keyscol" id="rollKeys"><div>${rows.map((d) => {
          const midi = E.noteMidi(P, t, d);
          const isRoot = ((d % scaleLen) + scaleLen) % scaleLen === 0;
          return `<button class="rk ${isRoot ? 'root' : ''}" data-deg="${d}" style="height:${ROW_H}px">${T.noteName(midi)}</button>`;
        }).join('')}</div></div>
        <div class="roll-scroll" id="rollScroll">
          <div class="roll-grid" id="rollGrid" style="width:${n * COL_W}px;height:${rows.length * ROW_H}px;--cw:${COL_W}px;--rh:${ROW_H}px">
            ${rows.map((d, i) => `<div class="rrow ${((d % scaleLen) + scaleLen) % scaleLen === 0 ? 'root' : ''}" style="top:${i * ROW_H}px"></div>`).join('')}
            <div class="roll-notes" id="rollNotes"></div>
            <div class="roll-head" id="rollHead" hidden></div>
          </div>
        </div>
      </div>
      <p class="roll-help">Click to add · drag to move · drag the right edge to lengthen · click a note to delete${inst.bass ? ' · overlap two notes to make the 808 slide' : ''}</p>`;
    drawRollNotes(t, rows);
    bindRoll(t, rows);
    const sc = $('#rollScroll');
    const keys = $('#rollKeys');
    sc.addEventListener('scroll', () => { keys.scrollTop = sc.scrollTop; });
    const rootRow = rows.indexOf(0);
    if (rootRow >= 0) { sc.scrollTop = Math.max(0, rootRow * ROW_H - sc.clientHeight / 2); keys.scrollTop = sc.scrollTop; }
  }

  function drawRollNotes(t, rows) {
    const host = $('#rollNotes');
    if (!host) return;
    const d = patData(curPat(), t);
    const top = rows[0];
    host.innerHTML = d.notes.map((nt, i) => {
      const r = top - nt.d;
      if (r < 0 || r >= rows.length) return '';
      return `<div class="note" data-i="${i}" style="left:${nt.s * COL_W + 1}px;top:${r * ROW_H + 1}px;width:${nt.l * COL_W - 2}px;height:${ROW_H - 2}px;--c:${colorOf(t)}"><span class="note-grip"></span></div>`;
    }).join('');
  }

  function bindRoll(t, rows) {
    $('#rollTrack').addEventListener('change', (e) => { ui.sel = e.target.value; renderEditor(); });
    $('#rollInst').addEventListener('change', (e) => setChannelSound(t, e.target.value));
    $$('[data-len]').forEach((b) => b.addEventListener('click', () => { ui.noteLen = +b.dataset.len; $$('[data-len]').forEach((x) => x.classList.toggle('is-on', x === b)); }));
    const cm = $('#chordMode');
    if (cm) cm.addEventListener('click', () => { ui.chordMode = !ui.chordMode; cm.classList.toggle('is-on', ui.chordMode); });
    $('#rollMagic').addEventListener('click', (e) => openMagic(tr(P, t), e.currentTarget));
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
        const nt = d.notes[+noteEl.dataset.i];
        const resize = (nt.s + nt.l) * COL_W - p0.x < 9 || e.target.classList.contains('note-grip');
        drag = { mode: resize ? 'resize' : 'move', notes: [nt], orig: [{ s: nt.s, d: nt.d }], p0, moved: false };
      } else {
        const instNow = S.INSTRUMENTS[tr(P, t).inst];
        const degs = ui.chordMode && !instNow.bass ? T.chordDegrees(p0.deg) : [p0.deg];
        const len = Math.min(ui.noteLen, nSteps() - p0.step);
        const added = degs.map((dd) => ({ s: p0.step, d: dd, l: len }));
        d.notes.push(...added);
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
      } else if (drag.created && drag.notes[0]) ui.noteLen = Math.min(16, drag.notes[0].l) || ui.noteLen;
      drag = null;
      drawRollNotes(tr(P, t), rows);
      changed({ noRender: true });
      BL.playlist.drawClips();
    };
    grid.addEventListener('pointerup', end);
    grid.addEventListener('pointercancel', end);
  }

  // ---------- mixer ----------
  function renderMixer(body) {
    const m = P.master;
    const audioLanes = P.lanes.filter((l) => P.clips.some((c) => c.lane === l.id && c.kind === 'audio'));
    const strip = (o, kind, n) => `<div class="mx-strip" data-kind="${kind}" data-id="${o.id}" style="--c:${kind === 'lane' ? '#5ac8fa' : colorOf(o)}">
        <div class="mx-num">${n}</div>
        <label class="mx-knob" data-hint="Reverb send.">Verb<input type="range" min="0" max="1" step="0.05" value="${o.rev || 0}" data-k="rev"></label>
        <label class="mx-knob" data-hint="Pan left / right.">Pan<input type="range" min="-1" max="1" step="0.05" value="${o.pan || 0}" data-k="pan"></label>
        <div class="mx-btns"><button class="mini ${o.mute ? 'is-on mute' : ''}" data-k="mute">M</button><button class="mini ${o.solo ? 'is-on' : ''}" data-k="solo">S</button></div>
        <div class="mx-fader-wrap"><input type="range" class="mx-fader" min="0" max="1" step="0.01" value="${o.vol}" data-k="vol" aria-label="${esc(o.name)} volume"></div>
        <div class="mx-name" title="${esc(o.name)}">${esc(o.name)}</div>
      </div>`;
    body.innerHTML = `<div class="mixer">
      <div class="mx-strips">
        ${P.tracks.map((t, i) => strip(t, 'track', i + 1)).join('')}
        ${audioLanes.map((l, i) => strip(l, 'lane', 'A' + (i + 1))).join('')}
      </div>
      <div class="mx-master">
        <div class="mx-num">Out</div>
        <canvas id="meter" class="meter" width="44" height="150" aria-label="Level meter"></canvas>
        <label class="mx-knob" data-hint="Glues the mix together and makes it louder.">Punch<input type="range" min="0" max="1" step="0.01" value="${m.punch}" data-master="punch"></label>
        <label class="check" data-hint="Muffles the whole beat like old tape."><input type="checkbox" data-master="lofi" ${m.lofi ? 'checked' : ''}> Lo-fi</label>
        <div class="mx-fader-wrap"><input type="range" class="mx-fader" min="0" max="1.2" step="0.01" value="${m.vol}" data-master="vol" aria-label="Master volume"></div>
        <div class="mx-name">Stereo Out</div>
      </div></div>`;
    $$('[data-master]', body).forEach((inp) => {
      inp.addEventListener('pointerdown', () => snapshot());
      inp.addEventListener(inp.type === 'checkbox' ? 'change' : 'input', () => {
        P.master[inp.dataset.master] = inp.type === 'checkbox' ? inp.checked : +inp.value;
        E.refreshMix(); autosave(); renderTransport();
      });
    });
    $$('.mx-strip', body).forEach((row) => {
      const o = row.dataset.kind === 'lane' ? P.lanes.find((x) => x.id === row.dataset.id) : P.tracks.find((x) => x.id === row.dataset.id);
      $$('input', row).forEach((inp) => {
        inp.addEventListener('pointerdown', () => snapshot());
        inp.addEventListener('input', () => { o[inp.dataset.k] = +inp.value; E.refreshMix(); autosave(); });
      });
      $$('button', row).forEach((b) => b.addEventListener('click', () => edit(() => { o[b.dataset.k] = !o[b.dataset.k]; })));
    });
    meterLoop();
  }
  let meterRaf = 0;
  function meterLoop() {
    cancelAnimationFrame(meterRaf);
    const cv = $('#meter');
    if (!cv) return;
    const g = cv.getContext('2d');
    const buf = new Float32Array(2048);
    let hold = 0, lvl = 0;
    const loop = () => {
      if (!document.body.contains(cv)) return;
      const an = E.analyser();
      let rms = 0, peak = 0;
      if (an && E.state.playing) {
        an.getFloatTimeDomainData(buf);
        for (let i = 0; i < buf.length; i++) { rms += buf[i] * buf[i]; peak = Math.max(peak, Math.abs(buf[i])); }
        rms = Math.sqrt(rms / buf.length);
      }
      lvl = Math.max(rms * 3, lvl * 0.9);
      hold = Math.max(peak, hold * 0.97);
      const w = cv.width, h = cv.height;
      g.clearRect(0, 0, w, h);
      const segs = 28;
      for (let i = 0; i < segs; i++) {
        const frac = (i + 1) / segs;
        const on = frac <= Math.min(1, lvl);
        g.fillStyle = on ? (frac > 0.9 ? '#ff453a' : frac > 0.72 ? '#ffd60a' : '#30d158') : '#26262a';
        g.fillRect(w / 2 - 7, h - (i + 1) * (h / segs) + 1, 14, h / segs - 2);
      }
      g.fillStyle = hold > 0.98 ? '#ff453a' : '#e5e5ea';
      g.fillRect(w / 2 - 9, h - Math.min(1, hold) * h, 18, 2);
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
      lastCol = -1;
      if (head) head.hidden = true;
      BL.playlist.playhead(null);
      renderTransport();
      return;
    }
    ui.lastEv = ev;
    setLcdPos(ev.abs);
    let step = -1;
    if (ev.song) {
      BL.playlist.playhead(ev.abs);
      const c = P.clips.find((x) => x.kind === 'pattern' && x.pat === P.current && ev.abs >= Math.round(x.start * 16) && ev.abs < Math.round((x.start + x.len) * 16));
      if (c) step = (ev.abs - Math.round(c.start * 16)) % nSteps();
    } else step = ev.step;
    lastCol = step;
    if (step >= 0 && columns[step]) columns[step].forEach((c) => c.classList.add('now'));
    if (step >= 0) flashHits(step);
    if (head) { head.hidden = step < 0; head.style.transform = `translateX(${step * COL_W}px)`; }
  });

  // ---------- passive motion: channel lights that flash on hits + a live spectrum ----------
  function flashHits(step) {
    const rk = rackEl();
    if (!rk) return;
    const pat = curPat();
    for (const t of P.tracks) {
      const d = pat.data[t.id];
      if (!d || t.mute) continue;
      let hit = false;
      if (t.type === 'drum') hit = d.steps[step] > 0;
      else if (t.type === 'synth') hit = d.notes.some((n) => n.s === step);
      else if (t.mode === 'chop') hit = d.steps[step] >= 0;
      else hit = step === 0 && d.on !== false;
      if (!hit) continue;
      const row = rk.querySelector(`.trk[data-id="${t.id}"]`);
      if (!row) continue;
      row.classList.remove('hit');
      void row.offsetWidth;
      row.classList.add('hit');
    }
  }
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function vizLoop() {
    const cv = R.viz;
    if (!cv) return;
    const g = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth || 150, H = cv.clientHeight || 34;
    cv.width = W * dpr; cv.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const N = 24;
    const lv = new Float32Array(N), peak = new Float32Array(N);
    let data = null;
    const edges = [...Array(N + 1)].map((_, i) => 40 * Math.pow(14000 / 40, i / N));
    const frame = (time) => {
      if (document.hidden) { requestAnimationFrame(frame); return; }
      const an = E.analyser();
      const live = an && E.state.playing;
      if (live) {
        if (!data || data.length !== an.frequencyBinCount) data = new Uint8Array(an.frequencyBinCount);
        an.getByteFrequencyData(data);
      }
      g.clearRect(0, 0, W, H);
      const bw = W / N;
      for (let i = 0; i < N; i++) {
        let v = 0;
        if (live) {
          const nyq = an.context.sampleRate / 2;
          const a = Math.floor((edges[i] / nyq) * data.length), b = Math.max(a + 1, Math.floor((edges[i + 1] / nyq) * data.length));
          for (let k = a; k < b; k++) v = Math.max(v, data[k] / 255);
          v = Math.pow(v, 1.6);
        } else if (!reduceMotion) {
          v = 0.05 + 0.035 * Math.sin(time / 900 + i * 0.5); // idle "breathing" floor
        }
        lv[i] = v > lv[i] ? v : lv[i] * 0.86 + v * 0.14;
        peak[i] = Math.max(lv[i], peak[i] - 0.012);
        const h = Math.max(1.5, lv[i] * (H - 4));
        const x = i * bw + 1;
        const grad = g.createLinearGradient(0, H, 0, 0);
        grad.addColorStop(0, '#0a84ff'); grad.addColorStop(0.6, '#64d2ff'); grad.addColorStop(1, '#e8f6ff');
        g.fillStyle = grad;
        g.globalAlpha = live ? 0.95 : 0.45;
        g.fillRect(x, H - 2 - h, bw - 2, h);
        if (live) { g.globalAlpha = 0.9; g.fillStyle = '#e8f6ff'; g.fillRect(x, H - 3 - peak[i] * (H - 4), bw - 2, 1.5); }
      }
      g.globalAlpha = 1;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  // ---------- keyboard ----------
  const KB = 'asdfghjkl;';
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = (tag === 'input' && !['range', 'checkbox', 'radio'].includes(e.target.type)) || tag === 'textarea' || tag === 'select';
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === 'Escape') { closeModal(); closePop(); return; }
    if (mod) {
      const k = e.key.toLowerCase();
      const map = { z: e.shiftKey ? 'redo' : 'undo', y: 'redo', s: e.shiftKey ? 'saveAs' : 'save', o: 'open', e: e.shiftKey ? 'exportStems' : 'export', n: 'new', i: 'importAudio' };
      if (map[k] && !(typing && (k === 'z' || k === 'y'))) { e.preventDefault(); command(map[k]); }
      return;
    }
    if (typing || !R.modal.hidden) return;
    const fmap = { F4: 'sounds', F5: 'song', F6: 'rack', F7: 'roll', F8: 'lab', F9: 'mix' };
    if (fmap[e.key]) { e.preventDefault(); command(fmap[e.key]); return; }
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); return; }
    if (e.key === 'Enter') { goToStart(); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && BL.playlist.deleteSelected()) { e.preventDefault(); return; }
    if (e.repeat || e.altKey) return;
    if (BL.lab.keyPad(e.key)) return;
    const k = e.key.toLowerCase();
    if (k === 'b') { toggleBrowser(); return; }
    if (k === 'z' || k === 'x') {
      ui.kbOct = Math.max(-2, Math.min(2, ui.kbOct + (k === 'x' ? 1 : -1)));
      toast('Keyboard octave ' + (ui.kbOct > 0 ? '+' : '') + ui.kbOct);
      if (ui.tab === 'roll') renderEditor();
      return;
    }
    const idx = KB.indexOf(k);
    if (idx < 0) return;
    const t = P.tracks.find((x) => x.id === ui.sel && x.type === 'synth') || P.tracks.find((x) => x.type === 'synth');
    if (!t) return;
    const deg = idx + ui.kbOct * T.SCALES[P.scale].steps.length;
    E.previewNote(t.inst, E.noteMidi(P, t, deg), 0.4);
    if (ui.recording && E.state.playing && ui.lastEv && !ui.lastEv.song) {
      const sd = 60 / P.bpm / 4;
      const s = (ui.lastEv.step + Math.round((E.ctx.currentTime - ui.lastEv.time) / sd)) % nSteps();
      const d = patData(curPat(), t);
      if (!d.notes.some((n) => n.s === s && n.d === deg)) {
        snapshot();
        d.notes.push({ s, d: deg, l: Math.min(ui.noteLen, nSteps() - s) });
        changed({ noRender: true });
        if (ui.tab === 'roll') drawRollNotes(t, rollRows(t));
        drawLanes();
      }
    }
  });

  /** every command (toolbar, shortcuts, the Mac menu bar) goes through here */
  function command(cmd) {
    switch (cmd) {
      case 'new': return openTemplates();
      case 'open': return openProjects();
      case 'save': return saveToLibrary(false);
      case 'saveAs': return saveToLibrary(true);
      case 'export': return openExport();
      case 'exportStems': return openExport('stems');
      case 'exportProject': return downloadProjectFile();
      case 'importProject': return pickFile('.beatlab,.json,application/json', false, (f) => openProjectFile(f[0]));
      case 'importAudio': return pickAudioFiles();
      case 'importPack': return pickPack();
      case 'undo': return undo();
      case 'redo': return redo();
      case 'play': return togglePlay();
      case 'stop': return stopAll();
      case 'start': return goToStart();
      case 'browser': return toggleBrowser();
      case 'playlist': return setTab('song');
      case 'sounds': case 'song': case 'rack': case 'roll': case 'lab': case 'mix': return setTab(cmd);
      case 'patternMode': return setMode(false);
      case 'songMode': return setMode(true);
      case 'help': return openHelp();
      default: return null;
    }
  }

  // ---------- hints, toast, modal, loading ----------
  const DEFAULT_HINT = `Space play · Return to start · B Browser · F6 Channel Rack · F7 Piano Roll · F9 Mixer · ${CMD}S save · ${CMD}E export`;
  function bindHints() {
    document.addEventListener('pointerover', (e) => {
      const h = e.target.closest && e.target.closest('[data-hint]');
      R.hint.textContent = h ? h.dataset.hint : DEFAULT_HINT;
    });
    R.hint.textContent = DEFAULT_HINT;
  }
  function renderStatus() {
    if (!P) return;
    if (R.tbTitle) renderTitle();
    R.saveState.textContent = P.libId ? (ui.dirty ? 'Edited' : 'Saved') : 'Not saved';
    R.saveState.classList.toggle('is-dirty', ui.dirty || !P.libId);
  }
  function renderTitle() { R.tbTitle.innerHTML = `${esc(P.name)}${ui.dirty || !P.libId ? '<em> — Edited</em>' : ''}`; }
  let toastTimer = null;
  function toast(msg) {
    R.toast.textContent = msg;
    R.toast.hidden = false;
    R.toast.classList.remove('show');
    void R.toast.offsetWidth;
    R.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => R.toast.classList.remove('show'), 3400);
  }
  let modalTimer = null;
  function openModal(html, bind, cls) {
    clearTimeout(modalTimer);
    R.modal.classList.remove('closing');
    R.modal.innerHTML = `<div class="sheet ${cls || ''}" role="dialog" aria-modal="true">${html}</div>`;
    R.modal.hidden = false;
    R.modal.onclick = (e) => { if (e.target === R.modal) closeModal(); };
    $$('[data-close]', R.modal).forEach((b) => b.addEventListener('click', closeModal));
    if (bind) bind(R.modal);
    const f = $('[autofocus]', R.modal);
    if (f) setTimeout(() => f.focus(), 30);
  }
  function closeModal() {
    if (R.modal.hidden || R.modal.classList.contains('closing')) return;
    R.modal.classList.add('closing');
    clearTimeout(modalTimer);
    modalTimer = setTimeout(() => { R.modal.hidden = true; R.modal.innerHTML = ''; R.modal.classList.remove('closing'); }, 160);
  }
  function showLoading(msg) { R.loadingMsg.textContent = msg; R.loading.hidden = false; }
  function hideLoading() { R.loading.hidden = true; }

  // ---------- templates / projects ----------
  async function openTemplates() {
    const recents = (await MD.listProjects()).slice(0, 6);
    const tpl = BL.beats.PRESETS.map((pr) => `<button class="tpl" data-preset="${pr.id}" style="--c:${pr.color}">
        <span class="tpl-art"><i></i><i></i><i></i><i></i></span>
        <span class="tpl-text"><b>${pr.name}</b><small>${pr.bpm} BPM · ${T.keyName(pr.key, pr.scale)}</small><em>${pr.tags.slice(0, 3).join(' · ')}</em></span></button>`).join('');
    openModal(`<header class="sheet-head"><h2>New Project</h2><input type="search" id="tplSearch" placeholder="Search: soul, rage, drill, Kanye-type…" aria-label="Search templates" autofocus></header>
      <div class="sheet-body">
        ${recents.length ? `<div class="sheet-label">Recent</div><div class="recent-row">${recents.map((r) => `<button class="recent" data-open="${r.id}"><b>${esc(r.name)}</b><small>${new Date(r.updated).toLocaleDateString()} · ${r.bpm} BPM</small></button>`).join('')}</div>` : ''}
        <div class="sheet-label">Templates</div>
        <div class="tpl-grid">
          <button class="tpl tpl-empty" id="tplEmpty"><span class="tpl-art">${icon('plus')}</span><span class="tpl-text"><b>Empty Project</b><small>Kick, clap, snare, hats, 808, keys</small><em>Start from scratch</em></span></button>
          ${tpl}
        </div>
      </div>
      <footer class="sheet-foot"><button class="tbtn" data-act="openfile">${icon('folder')}<span>Open File…</span></button><span class="ph-spacer"></span><button class="tbtn" data-close>Cancel</button></footer>`, (m) => {
      $$('[data-preset]', m).forEach((b) => b.addEventListener('click', () => { closeModal(); loadPreset(b.dataset.preset); }));
      $$('[data-open]', m).forEach((b) => b.addEventListener('click', () => { closeModal(); openSaved(b.dataset.open); }));
      $('#tplEmpty', m).addEventListener('click', () => { closeModal(); loadProject(blankProject(), { undoable: true }); toast('Empty project. Click steps to add drums, or use the ✦ buttons.'); });
      $('[data-act="openfile"]', m).addEventListener('click', () => { closeModal(); command('importProject'); });
      const s = $('#tplSearch', m);
      s.addEventListener('input', () => {
        const q = s.value.trim().toLowerCase();
        $$('[data-preset]', m).forEach((b) => {
          const pr = BL.beats.PRESETS.find((x) => x.id === b.dataset.preset);
          b.hidden = q && !(pr.name + ' ' + pr.tags.join(' ') + ' ' + pr.desc).toLowerCase().includes(q);
        });
      });
    }, 'sheet-wide');
  }

  async function loadPreset(id) {
    const pr = BL.beats.PRESETS.find((x) => x.id === id);
    await loadProject(projectFromPreset(pr), { undoable: true, play: true });
    if (ui.tab === 'sounds') setTab('rack');
    toast(`${pr.name} loaded. Change the key or tempo up top and everything follows.`);
  }

  async function openSaved(id) {
    const data = await MD.loadProject(id);
    if (!data) return toast('That project could not be found.');
    await loadProject(data, { undoable: true });
    toast(`Opened ${P.name}.`);
  }

  async function openProjects() {
    const list = await MD.listProjects();
    openModal(`<header class="sheet-head"><h2>Open Project</h2></header>
      <div class="sheet-body">${list.length ? `<div class="proj-list">${list.map((r) => `<div class="proj-row" data-id="${r.id}">
          <span class="proj-ico">${icon('folder')}</span><span class="proj-text"><b>${esc(r.name)}</b><small>${new Date(r.updated).toLocaleString()} · ${r.bpm} BPM</small></span>
          <button class="tbtn" data-open>Open</button><button class="tbtn icon" data-del aria-label="Delete">${icon('trash')}</button></div>`).join('')}</div>`
        : `<p class="sheet-empty">No saved projects yet. Press Save (${CMD}S) to keep one here.</p>`}</div>
      <footer class="sheet-foot"><button class="tbtn" data-act="file">${icon('folder')}<span>Open File…</span></button><span class="ph-spacer"></span><button class="tbtn" data-close>Cancel</button></footer>`, (m) => {
      $$('.proj-row', m).forEach((row) => {
        $('[data-open]', row).addEventListener('click', () => { closeModal(); openSaved(row.dataset.id); });
        row.addEventListener('dblclick', () => { closeModal(); openSaved(row.dataset.id); });
        $('[data-del]', row).addEventListener('click', async () => { await MD.deleteProject(row.dataset.id); row.remove(); BL.browser.refreshProjects(); });
      });
      $('[data-act="file"]', m).addEventListener('click', () => { closeModal(); command('importProject'); });
    });
  }

  async function saveToLibrary(asNew) {
    if (!P.libId || asNew) {
      openModal(`<header class="sheet-head"><h2>${asNew ? 'Save As' : 'Save Project'}</h2></header>
        <div class="sheet-body"><label class="field-row">Name<input id="saveName" value="${esc(asNew ? P.name + ' copy' : P.name)}" autofocus></label>
        <p class="sheet-note">Saved projects live on this computer under My Projects in the Browser. “Download File” makes one .beatlab file with your audio and pack sounds inside, so you can back it up or move it to another computer.</p></div>
        <footer class="sheet-foot"><button class="tbtn" data-act="dl">${icon('import')}<span>Download File</span></button><span class="ph-spacer"></span><button class="tbtn" data-close>Cancel</button><button class="tbtn tbtn-primary" data-act="save">Save</button></footer>`, (m) => {
        const go = async () => {
          P.name = $('#saveName', m).value.trim() || 'Untitled';
          if (asNew) delete P.libId;
          closeModal();
          await doSave();
        };
        $('[data-act="save"]', m).addEventListener('click', go);
        $('#saveName', m).addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        $('[data-act="dl"]', m).addEventListener('click', () => { P.name = $('#saveName', m).value.trim() || P.name; closeModal(); downloadProjectFile(); });
      });
      return;
    }
    await doSave();
  }
  async function doSave() {
    await MD.saveProject(P);
    ui.dirty = false;
    autosave();
    renderTransport();
    renderStatus();
    BL.browser.refreshProjects();
    toast(`Saved “${P.name}”.`);
  }

  // ---------- files ----------
  function pickFile(accept, multiple, cb, folder) {
    const inp = R.filePick;
    inp.value = '';
    inp.accept = accept || '';
    inp.multiple = !!multiple;
    if (folder) inp.setAttribute('webkitdirectory', ''); else inp.removeAttribute('webkitdirectory');
    inp.onchange = () => { if (inp.files && inp.files.length) cb([...inp.files]); };
    inp.click();
  }
  function pickAudioFiles() {
    pickFile('audio/*,.wav,.mp3,.aif,.aiff,.flac,.ogg,.m4a', true, async (files) => {
      for (const f of files) {
        const meta = await importAudioFile(f);
        if (meta) BL.playlist.placeAudio(meta.id, firstFreeLane(), P.pos || 0);
      }
    });
  }
  async function importAudioFile(file) {
    showLoading(`Importing ${file.name}…`);
    try {
      const meta = await MD.importAudio(file);
      edit((p) => { p.audio[meta.id] = meta; }, { noRender: true });
      return meta;
    } catch (e) {
      toast(`“${file.name}” isn't audio this computer can read. Try WAV or MP3.`);
      return null;
    } finally { hideLoading(); }
  }
  function pickPack(anchor) {
    const choose = (kind) => {
      if (kind === 'folder') pickFile('', true, importPack, true);
      else pickFile('.zip,audio/*,.wav,.mp3,.aif,.aiff,.flac,.ogg,.m4a', true, importPack);
    };
    if (!anchor) return choose('files');
    openPop(anchor, `<div class="menu"><div class="menu-head">Import Sound Pack</div><button data-k="files">Zip or Audio Files…</button><button data-k="folder">Folder…</button></div>`, (pop) => {
      $$('[data-k]', pop).forEach((b) => b.addEventListener('click', () => { closePop(); choose(b.dataset.k); }));
    });
  }
  async function importPack(files) {
    showLoading('Importing sound pack…');
    try {
      const pack = await MD.importPackFiles(files, (i, n) => { R.loadingMsg.textContent = `Importing sound pack… ${i} of ${n}`; });
      const counts = {};
      pack.sounds.forEach((s) => { counts[s.cat] = (counts[s.cat] || 0) + 1; });
      ui.open.packs = true;
      ui.open['pk-' + pack.id] = true;
      savePrefs();
      if (ui.tab === 'sounds') renderEditor(); else setTab('sounds');
      toast(`Imported “${pack.name}”: ${Object.entries(counts).map(([c, n]) => `${n} ${c.toLowerCase()}`).join(', ')}.`);
    } catch (e) {
      toast(e.message || 'That pack could not be imported.');
    } finally { hideLoading(); }
  }
  async function audioFromPackSound(sid) {
    const existing = Object.values(P.audio).find((a) => a.src === sid);
    if (existing) return existing.id;
    const bytes = await MD.store.get('files', sid.slice(2));
    if (!bytes) return null;
    const meta = await MD.importAudioBytes(bytes, MD.soundName(sid));
    meta.src = sid;
    edit((p) => { p.audio[meta.id] = meta; }, { noRender: true });
    return meta.id;
  }
  async function openPackLoopInLab(sid) {
    const bytes = await MD.store.get('files', sid.slice(2));
    if (!bytes) return;
    setTab('lab');
    await BL.lab.importBytes(bytes, MD.soundName(sid));
  }
  function openRecord(id) {
    setTab('lab');
    BL.lab.pickBuiltin(id);
  }
  function firstFreeLane() {
    const used = new Set(P.clips.map((c) => c.lane));
    let i = P.lanes.findIndex((l) => !used.has(l.id));
    if (i < 0) { P.lanes.push(newLane(P)); i = P.lanes.length - 1; }
    return i;
  }

  async function saveFile(filename, bytes) {
    if (NATIVE && NATIVE.saveFile) {
      const res = await NATIVE.saveFile(filename, bytes);
      if (res && res.saved) toast(`Saved ${res.name || filename}.`);
      return;
    }
    if (window.claude && typeof window.claude.use === 'function') {
      let dl = null;
      try { dl = await window.claude.use('downloads'); } catch (e) { dl = null; }
      if (dl) {
        let name = filename, data = bytes;
        if (/\.wav$/i.test(filename)) { data = BL.dsp.makeZip([{ name: filename, bytes }]); name = filename.replace(/\.wav$/i, '.zip'); }
        if (/\.beatlab$/i.test(filename)) name = filename + '.json';
        try { await dl.save({ filename: name, data: new Blob([data]) }); toast(`Saved ${name}.`); } catch (e) { if (!e || e.code !== 'declined') toast('Saving files is not available here.'); }
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
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast(`Saved ${filename}.`);
  }
  const fileSafe = (s) => (s || 'beat').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'beat';
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
  /** one self-contained file: includes your audio tracks, samples and pack sounds */
  async function downloadProjectFile() {
    showLoading('Packing project…');
    try {
      const out = JSON.parse(JSON.stringify(P));
      delete out.libId;
      out.media = { samples: {}, files: {}, packSounds: {} };
      for (const s of Object.values(P.samples)) {
        if (s.builtin) continue;
        const bytes = BL.lab.memBytes[s.id] || (await MD.store.get('samples', s.id));
        if (bytes) out.media.samples[s.id] = b64(new Uint8Array(bytes));
      }
      for (const id of Object.keys(P.audio)) { const b = await MD.store.get('files', id); if (b) out.media.files[id] = b64(new Uint8Array(b)); }
      for (const t of P.tracks) {
        if (t.type === 'drum' && /^u:/.test(t.sound)) {
          const b = await MD.store.get('files', t.sound.slice(2));
          if (b) out.media.packSounds[t.sound] = { name: MD.soundName(t.sound), cat: MD.soundCat(t.sound), data: b64(new Uint8Array(b)) };
        }
      }
      hideLoading();
      await saveFile(fileSafe(P.name) + '.beatlab', new TextEncoder().encode(JSON.stringify(out)));
    } finally { hideLoading(); }
  }
  async function openProjectFile(file) {
    showLoading('Opening project…');
    try {
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.tracks) || !Array.isArray(data.patterns)) throw new Error('bad');
      const legacy = data.audio && Object.values(data.audio).some((v) => typeof v === 'string');
      const media = data.media || { samples: legacy ? data.audio : {} };
      for (const [id, str] of Object.entries(media.samples || {})) { const bytes = unb64(str); BL.lab.memBytes[id] = bytes; BL.lab.forget(id); await MD.store.put('samples', id, bytes); }
      for (const [id, str] of Object.entries(media.files || {})) await MD.store.put('files', id, unb64(str));
      for (const [sid, o] of Object.entries(media.packSounds || {})) {
        await MD.store.put('files', sid.slice(2), unb64(o.data));
        MD.soundMeta[sid] = MD.soundMeta[sid] || { name: o.name, cat: o.cat, pack: 'From project' };
      }
      delete data.media;
      if (legacy) data.audio = {};
      delete data.libId;
      hideLoading();
      await loadProject(data, { undoable: true, dirty: true });
      toast(`Opened ${P.name}. Press Save to keep it in My Projects.`);
    } catch (e) {
      hideLoading();
      toast("That file isn't a BeatLab project.");
    }
  }

  function openExport(mode) {
    const what = mode === 'stems' ? 'stems' : 'mix';
    const hasSong = P.clips.length > 0;
    openModal(`<header class="sheet-head"><h2>Export</h2></header>
      <div class="sheet-body">
        <div class="form-grid">
          <span class="form-label">Export</span>
          <div class="seg" id="expWhat"><button data-what="mix" class="${what === 'mix' ? 'is-on' : ''}">Mixdown</button><button data-what="stems" class="${what === 'stems' ? 'is-on' : ''}">Stems</button></div>
          <span class="form-label">Range</span>
          <div class="seg" id="expRange"><button data-range="pattern" class="${!P.songMode || !hasSong ? 'is-on' : ''}">${esc(curPat().name)} ×4</button><button data-range="song" class="${P.songMode && hasSong ? 'is-on' : ''}" ${hasSong ? '' : 'disabled'}>Whole Song</button></div>
          <span class="form-label">Ending</span>
          <div class="ending-row"><div class="seg" id="expEnd">${Object.entries(E.ENDINGS).map(([k, v]) => `<button data-ending="${k}" class="${ui.ending === k ? 'is-on' : ''}">${v.name}</button>`).join('')}</div>
            <button class="tbtn" id="hearEnding">${icon('play')}<span>Preview</span></button></div>
        </div>
        <p class="sheet-note" id="expNote"></p>
      </div>
      <footer class="sheet-foot"><span id="expStatus" class="muted"></span><span class="ph-spacer"></span><button class="tbtn" data-close>Cancel</button><button class="tbtn tbtn-primary" id="doExport">Export</button></footer>`, (m) => {
      const st = { what, range: !P.songMode || !hasSong ? 'pattern' : 'song' };
      const notes = {
        none: 'Ends on the last step with the reverb ringing out.',
        slowmo: 'One last hit (kick, 808, chord and a boom) drops into slow motion and fades away.',
        tapestop: 'The beat winds down to a halt, like a hand stopping the record.',
      };
      const note = () => {
        $('#expNote', m).textContent = (st.what === 'stems' ? 'Stems: every channel and audio track as its own WAV, all the same length, in one .zip, ready for any DAW. ' : 'A 44.1 kHz, 16-bit stereo WAV. ') + notes[ui.ending];
      };
      note();
      const segs = (sel, key, fn) => $$(`${sel} button`, m).forEach((b) => b.addEventListener('click', () => { if (b.disabled) return; $$(`${sel} button`, m).forEach((x) => x.classList.toggle('is-on', x === b)); fn(b.dataset[key]); note(); }));
      segs('#expWhat', 'what', (v) => { st.what = v; });
      segs('#expRange', 'range', (v) => { st.range = v; });
      segs('#expEnd', 'ending', (v) => { ui.ending = v; });
      $('#hearEnding', m).addEventListener('click', async () => {
        $('#expStatus', m).textContent = 'Rendering…';
        await ensureAllMedia();
        if (E.state.playing) stopAll();
        const buf = await E.renderEndingPreview(P, ui.ending);
        $('#expStatus', m).textContent = '';
        E.previewBuffer(buf, 0, buf.duration);
      });
      $('#doExport', m).addEventListener('click', async () => {
        const btn = $('#doExport', m);
        btn.disabled = true;
        E.stopPreviewBuffer();
        const status = (s) => { $('#expStatus', m).textContent = s; };
        try {
          await ensureAllMedia();
          const opts = { song: st.range === 'song', loops: 4, ending: ui.ending };
          if (st.what === 'mix') {
            status('Rendering mixdown…');
            const out = await E.render(P, opts);
            closeModal();
            await saveFile(fileSafe(P.name) + '.wav', BL.dsp.encodeWAV(out.channels, out.sampleRate));
          } else {
            const audioLanes = opts.song ? P.lanes.filter((l) => P.clips.some((c) => c.lane === l.id && c.kind === 'audio')) : [];
            const parts = [...P.tracks.map((t) => ({ kind: 'track', o: t })), ...audioLanes.map((l) => ({ kind: 'lane', o: l }))];
            const rendered = [];
            let len = 0;
            for (let i = 0; i < parts.length; i++) {
              status(`Rendering stem ${i + 1} of ${parts.length}…`);
              const q = JSON.parse(JSON.stringify(P));
              const part = parts[i];
              // each stem holds exactly one channel or one audio track
              q.tracks.forEach((t) => { t.solo = false; t.mute = !(part.kind === 'track' && t.id === part.o.id); });
              q.lanes.forEach((l) => { l.solo = false; l.mute = false; });
              q.clips = q.clips.filter((c) => (part.kind === 'track' ? c.kind === 'pattern' : c.kind === 'audio' && c.lane === part.o.id));
              const out = await E.render(q, opts);
              len = Math.max(len, out.channels[0].length);
              rendered.push({ name: part.o.name, out });
            }
            const files = rendered.map((r, i) => {
              const pad = (c) => { const x = new Float32Array(len); x.set(c); return x; };
              return { name: `${String(i + 1).padStart(2, '0')} ${r.name.replace(/[^\w\- ]+/g, '').trim() || 'Track'}.wav`, bytes: BL.dsp.encodeWAV(r.out.channels.map(pad), r.out.sampleRate) };
            });
            status('Zipping…');
            closeModal();
            await saveFile(fileSafe(P.name) + '-stems.zip', BL.dsp.makeZip(files));
          }
        } catch (e) {
          status('Export failed: ' + (e && e.message ? e.message : e));
          btn.disabled = false;
        }
      });
    });
  }
  async function ensureAllMedia() {
    await Promise.all([
      ...Object.keys(P.samples).map((id) => BL.lab.ensure(P, id)),
      ...Object.keys(P.audio).map((id) => MD.ensureAudio(id)),
      ...P.tracks.filter((t) => t.type === 'drum' && /^u:/.test(t.sound)).map((t) => MD.ensureSound(t.sound)),
    ]);
  }

  function openHelp() {
    openModal(`<header class="sheet-head"><h2>How BeatLab Works</h2></header>
      <div class="sheet-body help">
        <dl class="help-grid">
          <dt>Channel Rack</dt><dd>Each row is a sound. Click steps to add hits. Right-click (or Velocity) makes a hit softer or louder; Rolls turns a hat into ×2, ×3 or ×4. Drag any sound from the Browser onto a row to swap it.</dd>
          <dt>Piano Roll</dt><dd>Draw notes for instruments and 808s. Only notes in your key are shown, so nothing sounds wrong. Chords places a whole chord per click. Overlap two 808 notes to slide.</dd>
          <dt>Playlist</dt><dd>Paint patterns into the timeline to build your song, and drop in audio tracks such as songs, vocals or stems. Right-click a clip to delete it; drag its right edge to make it longer. Switch the toolbar to Song to play the Playlist.</dd>
          <dt>Sample Lab</dt><dd>Pick a record or load your own audio. Speed and Pitch are sliders; Match my tempo and Match my key do it for you. Chop it and place the chops on the grid.</dd>
          <dt>Sound Packs</dt><dd>Import a .zip, a folder or loose files from the Browser. BeatLab sorts them into kicks, snares, hats, 808s, percs, FX and loops.</dd>
          <dt>Saving</dt><dd>Save (${CMD}S) keeps the project in My Projects on this computer. Download File makes one .beatlab file with all your audio inside.</dd>
          <dt>Export</dt><dd>A WAV mixdown or stems (one WAV per channel), with an optional slow-mo or tape-stop ending.</dd>
        </dl>
        <table class="keys"><tbody>
          <tr><td><kbd>Space</kbd></td><td>Play / stop</td><td><kbd>Return</kbd></td><td>Back to start</td></tr>
          <tr><td><kbd>A</kbd>–<kbd>L</kbd></td><td>Play notes in key</td><td><kbd>Z</kbd> <kbd>X</kbd></td><td>Octave down / up</td></tr>
          <tr><td><kbd>B</kbd></td><td>Browser</td><td><kbd>F6</kbd>–<kbd>F9</kbd></td><td>Rack, Piano Roll, Lab, Mixer</td></tr>
          <tr><td><kbd>${CMD}S</kbd></td><td>Save</td><td><kbd>${CMD}E</kbd></td><td>Export</td></tr>
          <tr><td><kbd>${CMD}O</kbd></td><td>Open</td><td><kbd>${CMD}I</kbd></td><td>Import audio</td></tr>
        </tbody></table>
      </div>
      <footer class="sheet-foot"><span class="ph-spacer"></span><button class="tbtn tbtn-primary" data-close>Done</button></footer>`);
  }

  // ---------- drag & drop from the desktop ----------
  function bindDrop() {
    let depth = 0;
    const isFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
    window.addEventListener('dragenter', (e) => { if (isFiles(e)) { depth++; document.body.classList.add('dropping'); } });
    window.addEventListener('dragleave', (e) => { if (isFiles(e)) { depth = Math.max(0, depth - 1); if (!depth) document.body.classList.remove('dropping'); } });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      depth = 0;
      document.body.classList.remove('dropping');
      const files = [...(e.dataTransfer.files || [])];
      if (!files.length) return;
      if (files.length === 1 && /\.(json|beatlab)$/i.test(files[0].name)) return openProjectFile(files[0]);
      const overBrowser = e.target.closest && e.target.closest('.sounds');
      const overLab = e.target.closest && e.target.closest('.tab-lab');
      if (files.some((f) => /\.zip$/i.test(f.name)) || overBrowser || files.length > 4) return importPack(files);
      if (overLab) return BL.lab.importFile(files[0]);
      for (const f of files) {
        const meta = await importAudioFile(f);
        if (meta) BL.playlist.placeAudio(meta.id, firstFreeLane(), P.pos || 0);
      }
    });
  }

  // ---------- control polish: sliding segment thumbs + slider fills ----------
  function updateSegs() {
    $$('.seg').forEach((seg) => {
      const on = $(':scope > button.is-on', seg);
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
  let polishQueued = false;
  function queuePolish() {
    if (polishQueued) return;
    polishQueued = true;
    requestAnimationFrame(() => { polishQueued = false; updateSegs(); $$('input[type=range]').forEach(paintRange); });
  }
  function bindPolish() {
    document.addEventListener('input', (e) => { if (e.target.type === 'range') paintRange(e.target); });
    new MutationObserver((muts) => {
      for (const m of muts) {
        const t = m.target;
        if (m.type === 'childList' && t.nodeType === 1 && !t.closest('.lane') && !t.closest('#plClips') && t.id !== 'rollNotes' && t.id !== 'lcdPos') { queuePolish(); return; }
        if (m.type === 'attributes' && t.parentElement && t.parentElement.classList.contains('seg')) { queuePolish(); return; }
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', queuePolish);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queuePolish);
  }

  function renderAll() {
    if (!P) return;
    renderTransport();
    renderStatus();
    renderTabs();
    renderPanelHead();
    renderEditor();
  }

  // ---------- API for the Browser, Playlist and Sample Lab ----------
  const api = {
    project: () => P, ui, edit, changed, snapshot, toast, icon, uid, newLane,
    autosave, savePrefs, openPop, closePop, inlineRename, engine: E,
    renderTransport, openPattern, pickAudioFiles, importAudioFile, audioFromPackSound, pickPack,
    addChannel, firstFreeLane, openPackLoopInLab, openRecord, loadPreset, openSaved, saveToLibrary,
    labHost: () => (ui.tab === 'lab' ? R.edBody : null),
    rackChanged: () => { if (ui.tab === 'rack') renderRack(); else drawLanes(); BL.playlist.drawClips(); },
    addSampleTrack,
  };

  // ---------- boot ----------
  let booted = false, pendingFile = null;
  async function boot() {
    buildShell();
    loadPrefs();
    E.setProjectGetter(() => P);
    BL.lab.init(api);
    BL.browser.init(api);
    BL.playlist.init(api);
    bindPolish();
    bindToolbar();
    vizLoop();
    bindHints();
    bindDrop();
    if (NATIVE) {
      document.body.classList.add('native', 'native-' + (NATIVE.platform || 'darwin'));
      if (NATIVE.onMenu) NATIVE.onMenu((cmd) => command(cmd));
      if (NATIVE.onOpenFile) NATIVE.onOpenFile((f) => { const file = new File([f.data], f.name); if (booted) openProjectFile(file); else pendingFile = file; });
    }
    let rsz = null;
    window.addEventListener('resize', () => { clearTimeout(rsz); rsz = setTimeout(() => { sizeSteps(); drawLanes(); BL.lab.drawWave(); BL.playlist.drawClips(); }, 120); });
    window.addEventListener('beforeunload', () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(P)); } catch (e) { /* ignore */ } });
    showLoading('Building the drum kits…');
    await Promise.all([S.renderDrums(), MD.loadPacks()]);
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { saved = null; }
    hideLoading();
    BL.browser.refreshProjects();
    if (saved && saved.tracks) {
      await loadProject(saved, { dirty: false });
      toast('Welcome back. Your last session is right where you left it.');
    } else {
      if (!pendingFile) {
        await loadProject(projectFromPreset(BL.beats.PRESETS[0]));
        openTemplates();
      }
    }
    booted = true;
    if (pendingFile) { const f = pendingFile; pendingFile = null; await openProjectFile(f); }
  }

  window.BL.app = { get project() { return P; }, ui, toast, renderAll, loadProject, projectFromPreset, command, api };
  boot();
})();
