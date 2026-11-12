/* BeatLab — Sample Lab: load a sample, then speed / pitch / match key / match tempo / chop it. */
(function (root) {
  const BL = (root.BL = root.BL || {});
  const T = BL.theory, D = BL.dsp;
  const rts = {}; // sampleId -> { raw, processed, slices, sig }
  let A = null; // app api
  const el = {};
  let cropSel = null; // {a,b} in seconds while picking part of a long file
  const MAX_SECONDS = 30;

  // ---------- storage for your own audio files ----------
  const idb = {
    _db: null,
    open() {
      if (this._db) return Promise.resolve(this._db);
      return new Promise((res, rej) => {
        try {
          const r = indexedDB.open('beatlab', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('samples');
          r.onsuccess = () => { this._db = r.result; res(r.result); };
          r.onerror = () => rej(r.error);
        } catch (e) { rej(e); }
      });
    },
    async put(k, v) {
      try {
        const db = await this.open();
        await new Promise((res, rej) => { const tx = db.transaction('samples', 'readwrite'); tx.objectStore('samples').put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
      } catch (e) { /* storage unavailable: sample lives for this session only */ }
    },
    async get(k) {
      try {
        const db = await this.open();
        return await new Promise((res, rej) => { const r = db.transaction('samples').objectStore('samples').get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      } catch (e) { return null; }
    },
  };
  const memBytes = {}; // fallback when IndexedDB is blocked

  // ---------- helpers ----------
  function modeOf(scale) { return T.isMinorish(scale) ? 'minor' : 'major'; }

  /** speed that makes the sample's tempo match the beat (allows half/double time) */
  function fitSpeed(srcBpm, bpm) {
    if (!srcBpm) return 1;
    let best = 1, bestD = 9;
    for (const m of [0.5, 1, 2]) {
      const s = bpm / (srcBpm * m);
      const d = Math.abs(Math.log2(s));
      if (d < bestD) { bestD = d; best = s; }
    }
    return Math.round(best * 1000) / 1000;
  }

  function tapeShift(cfg) {
    return cfg.keepPitch ? 0 : 12 * Math.log2(cfg.speed || 1);
  }

  /** extra semitones so the sample lands in the beat's key, keeping the speed's own pitch change if it's close */
  function autoKeySemis(cfg, p) {
    if (cfg.keyRoot == null) return cfg.semis || 0;
    const d = T.semitonesToKey(cfg.keyRoot, cfg.keyMode, p.key, p.scale);
    const ts = tapeShift(cfg);
    let bestT = d, bestDist = 99;
    for (let k = -2; k <= 2; k++) {
      const Tt = d + 12 * k;
      if (Math.abs(Tt - ts) < bestDist) { bestDist = Math.abs(Tt - ts); bestT = Tt; }
    }
    return Math.round((bestT - ts) * 100) / 100;
  }

  function currentKeyLabel(cfg) {
    if (cfg.keyRoot == null) return 'unknown key';
    const shift = tapeShift(cfg) + (cfg.semis || 0);
    const r = Math.round(cfg.keyRoot + shift);
    const off = cfg.keyRoot + shift - r;
    return T.NOTE_NAMES[((r % 12) + 12) % 12] + ' ' + cfg.keyMode + (Math.abs(off) > 0.15 ? ' (slightly off)' : '');
  }

  let decoder = null;
  function decodeCtx() {
    // an offline context can decode audio before the user has clicked anything
    if (!decoder) decoder = new (root.OfflineAudioContext || root.webkitOfflineAudioContext)(1, 1, 44100);
    return decoder;
  }
  function bufferFrom(ctx, channels, sr) {
    const b = new AudioBuffer({ numberOfChannels: channels.length, length: Math.max(1, channels[0].length), sampleRate: sr });
    channels.forEach((c, i) => b.getChannelData(i).set(c));
    return b;
  }

  async function loadRaw(cfg) {
    if (cfg.builtin) return BL.sounds.renderSample(cfg.builtin);
    let bytes = memBytes[cfg.id] || (await idb.get(cfg.id));
    if (!bytes) return null;
    return decodeCtx().decodeAudioData(bytes.slice(0));
  }

  function trimmedChannels(raw, cfg) {
    const sr = raw.sampleRate;
    const a = cfg.trim ? Math.floor(cfg.trim[0] * sr) : 0;
    const b = cfg.trim ? Math.floor(cfg.trim[1] * sr) : raw.length;
    const out = [];
    for (let c = 0; c < Math.min(2, raw.numberOfChannels); c++) out.push(raw.getChannelData(c).slice(a, b));
    return out;
  }

  function sigOf(cfg) {
    return [cfg.speed, cfg.keepPitch, cfg.semis, cfg.reverse, cfg.chops, cfg.chopMode, cfg.trim && cfg.trim.join(',')].join('|');
  }

  async function ensure(p, id) {
    const cfg = p.samples[id];
    if (!cfg) return null;
    let rt = rts[id];
    if (!rt) rt = rts[id] = { raw: null, processed: null, slices: [], sig: '' };
    if (!rt.raw) {
      rt.raw = await loadRaw(cfg);
      if (!rt.raw) { rt.missing = true; return rt; }
    }
    const sig = sigOf(cfg);
    if (rt.processed && rt.sig === sig) return rt;
    if (rt.pending) { rt.queued = true; return rt.pending; }
    rt.pending = (async () => {
      await new Promise((r) => setTimeout(r, 15)); // let the UI paint "processing…"
      const ctx = null;
      const src = trimmedChannels(rt.raw, cfg);
      const outs = src.map((ch) => D.processChannel(ch, cfg));
      rt.processed = bufferFrom(ctx, outs, rt.raw.sampleRate);
      rt.sig = sig;
      rt.slices = computeSlices(rt.processed, cfg);
      rt.pending = null;
      if (rt.queued) { rt.queued = false; return ensure(p, id); }
      return rt;
    })();
    return rt.pending;
  }

  function computeSlices(buf, cfg) {
    const n = cfg.chops || 8;
    const dur = buf.duration;
    let starts;
    if (cfg.chopMode === 'hits') {
      const mono = D.mono([...Array(buf.numberOfChannels)].map((_, i) => buf.getChannelData(i)));
      starts = D.detectOnsets(mono, buf.sampleRate, n).map((s) => s / buf.sampleRate);
      while (starts.length < n) starts.push((starts.length / n) * dur);
      starts.sort((a, b) => a - b);
    } else {
      starts = [...Array(n)].map((_, i) => (i / n) * dur);
    }
    return starts.map((s, i) => ({ s, e: i + 1 < starts.length ? starts[i + 1] : dur }));
  }

  async function analyze(buf) {
    const ch = [...Array(Math.min(2, buf.numberOfChannels))].map((_, i) => buf.getChannelData(i));
    const mono = D.mono(ch);
    const key = T.detectKey(D.chroma(mono, buf.sampleRate));
    const bpm = D.detectBPM(mono, buf.sampleRate);
    return { key, bpm };
  }

  async function importFile(file) {
    const p = A.project();
    const bytes = await file.arrayBuffer();
    const ctx = null;
    let raw;
    try {
      raw = await decodeCtx().decodeAudioData(bytes.slice(0));
    } catch (e) {
      A.toast("That file isn't audio this browser can read. Try a WAV or MP3.");
      return null;
    }
    const id = 'usr_' + Date.now().toString(36);
    memBytes[id] = bytes;
    idb.put(id, bytes);
    const cfg = {
      id, name: file.name.replace(/\.[^.]+$/, '').slice(0, 40), builtin: null,
      speed: 1, keepPitch: false, semis: 0, reverse: false, chops: 8, chopMode: 'hits',
      bpm: 0, keyRoot: null, keyMode: 'minor',
    };
    if (raw.duration > MAX_SECONDS) cfg.trim = [0, MAX_SECONDS];
    A.toast('Listening to your sample to find its key and tempo…');
    const part = cfg.trim ? bufferFrom(ctx, trimmedChannels(raw, cfg), raw.sampleRate) : raw;
    const info = await analyze(part);
    cfg.bpm = info.bpm;
    cfg.keyRoot = info.key.root;
    cfg.keyMode = info.key.mode;
    rts[id] = { raw, processed: null, slices: [], sig: '' };
    A.edit((pp) => { pp.samples[id] = cfg; });
    A.ui.labSample = id;
    if (raw.duration > MAX_SECONDS) {
      cropSel = { a: 0, b: MAX_SECONDS };
      A.ui.labCrop = true;
      A.toast(`That's a long file (${Math.round(raw.duration)}s). Drag across the waveform to pick the part you want.`);
    } else {
      A.toast(`Found it: ${T.NOTE_NAMES[cfg.keyRoot]} ${cfg.keyMode}${cfg.bpm ? ', about ' + cfg.bpm + ' BPM' : ''}.`);
    }
    await ensure(A.project(), id);
    render();
    void p;
    return id;
  }

  /** for recording from the microphone */
  async function importBlob(blob, name) {
    const f = new File([blob], name || 'Recording.webm');
    return importFile(f);
  }

  // ---------- UI ----------
  function init(api) {
    A = api;
  }

  function selectedCfg() {
    const p = A.project();
    return p.samples[A.ui.labSample] || null;
  }

  function pickBuiltin(bid) {
    const p = A.project();
    let id = Object.keys(p.samples).find((k) => p.samples[k].builtin === bid);
    if (!id) {
      const meta = BL.sounds.SAMPLE_BY_ID[bid];
      id = 'smp_' + bid;
      const cfg = {
        id, name: meta.name, builtin: bid, speed: 1, keepPitch: false, semis: 0, reverse: false,
        chops: 8, chopMode: 'equal', bpm: meta.bpm, keyRoot: meta.root, keyMode: modeOf(meta.scale),
      };
      if (A.ui.labAuto !== false) {
        cfg.speed = fitSpeed(cfg.bpm, p.bpm);
        cfg.semis = autoKeySemis(cfg, p);
      }
      A.edit((pp) => { pp.samples[id] = cfg; }, { quiet: true });
    }
    A.ui.labSample = id;
    A.ui.labCrop = false;
    BL.engine.stopPreviewBuffer();
    process();
  }

  let procTimer = null;
  function process(immediate) {
    clearTimeout(procTimer);
    const cfg = selectedCfg();
    render();
    if (!cfg) return;
    const run = async () => {
      setBusy(true);
      await ensure(A.project(), cfg.id);
      setBusy(false);
      render();
      A.rackChanged();
    };
    if (immediate) run(); else procTimer = setTimeout(run, 180);
  }

  function setBusy(b) {
    if (el.busy) el.busy.hidden = !b;
  }

  function setCfg(fn, label) {
    const cfg = selectedCfg();
    if (!cfg) return;
    A.edit((p) => fn(p.samples[cfg.id], p), { quiet: true, label });
    process();
  }

  function fmtSpeed(s) { return (Math.round(s * 100) / 100).toFixed(2).replace(/\.?0+$/, '') + '×'; }
  function fmtSemis(v) { const r = Math.round(v * 10) / 10; return (r > 0 ? '+' : '') + r + ' st'; }

  function render() {
    const host = A && A.labHost();
    if (!host) return;
    const p = A.project();
    const cfg = selectedCfg();
    const userSamples = Object.values(p.samples).filter((s) => !s.builtin);
    const sel = A.ui.labSample;
    const builtinList = BL.sounds.BUILTIN_SAMPLES.map((s) => {
      const active = cfg && cfg.builtin === s.id;
      return `<button class="lab-item ${active ? 'is-on' : ''}" data-builtin="${s.id}" data-hint="${s.desc}. Original: ${T.NOTE_NAMES[s.root]} ${modeOf(s.scale)}, ${s.bpm} BPM.">
        <span class="lab-item-name">${s.name}</span><span class="lab-item-meta">${T.NOTE_NAMES[s.root]}${modeOf(s.scale) === 'minor' ? 'm' : ''} · ${s.bpm}</span></button>`;
    }).join('');
    const userList = userSamples.map((s) => `<button class="lab-item ${sel === s.id ? 'is-on' : ''}" data-user="${s.id}" data-hint="Your sample">
        <span class="lab-item-name">${esc(s.name)}</span><span class="lab-item-meta">${s.keyRoot != null ? T.NOTE_NAMES[s.keyRoot] + (s.keyMode === 'minor' ? 'm' : '') : '?'}${s.bpm ? ' · ' + s.bpm : ''}</span></button>`).join('');

    const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && root.MediaRecorder);
    host.innerHTML = `
      <div class="lab">
        <aside class="lab-side">
          <div class="lab-side-head">Records in the crate</div>
          <div class="lab-list">${builtinList}</div>
          <div class="lab-side-head">Your sounds</div>
          <div class="lab-list">${userList || '<p class="lab-empty">Drop any MP3 or WAV here, or load one below.</p>'}</div>
          <label class="btn btn-wide" data-hint="Load any audio file from your computer or phone. You can also drag a file onto the window.">
            Load audio file<input type="file" id="labFile" accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac" hidden>
          </label>
          ${canRecord ? `<button class="btn btn-wide" id="labRec" data-hint="Record your voice or anything around you with the microphone.">${A.ui.recordingMic ? '■ Stop recording' : '● Record with mic'}</button>` : ''}
          <label class="check" data-hint="When on, any sample you pick is automatically sped up or slowed down to your BPM and moved into your key.">
            <input type="checkbox" id="labAuto" ${A.ui.labAuto !== false ? 'checked' : ''}> Auto-match new samples to my beat
          </label>
        </aside>
        ${cfg ? mainHtml(cfg, p) : `<div class="lab-main lab-placeholder"><h3>Pick a record on the left</h3><p>Every sample can be sped up, slowed down, pitched and chopped with one click.</p></div>`}
      </div>`;
    bind(host, cfg);
    drawWave();
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function mainHtml(cfg, p) {
    const rt = rts[cfg.id];
    const n = cfg.chops || 8;
    const speedChips = [[0.5, 'Half'], [0.75, 'Slow'], [1, 'Normal'], [1.25, 'Fast'], [1.5, 'Chipmunk'], [2, 'Double']];
    const pitchChips = [-12, -7, -5, 0, 5, 7, 12];
    const newBpm = cfg.bpm ? Math.round(cfg.bpm * cfg.speed) : 0;
    const inKey = cfg.keyRoot != null && Math.abs(autoKeySemis(cfg, p) - (cfg.semis || 0)) < 0.05;
    const tempoMatch = cfg.bpm && Math.abs(fitSpeed(cfg.bpm, p.bpm) - cfg.speed) < 0.01;
    if (A.ui.labCrop) {
      return `<div class="lab-main">
        <div class="lab-title"><h3>${esc(cfg.name)}</h3><span class="lab-busy" id="labBusy" hidden>Processing…</span></div>
        <p class="lab-help">Drag across the waveform to choose up to ${MAX_SECONDS} seconds, then press <b>Use this part</b>.</p>
        <div class="wave-wrap"><canvas id="labWave" class="wave" data-hint="Drag to select the part of the song you want to sample."></canvas></div>
        <div class="lab-actions">
          <button class="btn" id="cropPlay">▶ Hear selection</button>
          <button class="btn btn-accent" id="cropUse">Use this part</button>
          ${cfg.trim ? '<button class="btn" id="cropCancel">Cancel</button>' : ''}
        </div></div>`;
    }
    return `<div class="lab-main">
      <div class="lab-title">
        <h3>${esc(cfg.name)}</h3>
        <span class="lab-busy" id="labBusy" hidden>Processing…</span>
      </div>
      <div class="lab-facts">
        <span class="fact"><b>Key</b> ${cfg.keyRoot != null ? T.NOTE_NAMES[cfg.keyRoot] + ' ' + cfg.keyMode : '—'} → <em>${currentKeyLabel(cfg)}</em> ${inKey ? '<i class="ok">matches your beat</i>' : ''}</span>
        <span class="fact"><b>Tempo</b> ${cfg.bpm || '—'} → <em>${newBpm || '—'} BPM</em> ${tempoMatch ? '<i class="ok">matches your beat</i>' : ''}</span>
      </div>
      <div class="wave-wrap"><canvas id="labWave" class="wave" data-hint="Click anywhere to play from there. Colored blocks are your chops."></canvas></div>
      <div class="lab-knobs">
        <div class="knob-card">
          <div class="knob-head"><span>Speed</span><output id="speedOut">${fmtSpeed(cfg.speed)}</output></div>
          <input type="range" id="speed" min="0.25" max="2.5" step="0.01" value="${cfg.speed}" data-hint="Drag to speed up or slow down the sample.">
          <div class="chips">${speedChips.map(([v, l]) => `<button class="chip ${Math.abs(cfg.speed - v) < 0.005 ? 'is-on' : ''}" data-speed="${v}">${l}</button>`).join('')}</div>
          <label class="check" data-hint="Off: like a record player, faster also means higher (that's the chipmunk-soul sound). On: speed changes but the notes stay the same.">
            <input type="checkbox" id="keepPitch" ${cfg.keepPitch ? 'checked' : ''}> Keep pitch when changing speed
          </label>
        </div>
        <div class="knob-card">
          <div class="knob-head"><span>Pitch</span><output id="pitchOut">${fmtSemis(cfg.semis || 0)}</output></div>
          <input type="range" id="semis" min="-12" max="12" step="0.01" value="${cfg.semis || 0}" data-hint="Drag to pitch the sample up or down without changing its speed.">
          <div class="chips">${pitchChips.map((v) => `<button class="chip ${Math.abs((cfg.semis || 0) - v) < 0.005 ? 'is-on' : ''}" data-semis="${v}">${v > 0 ? '+' + v : v}</button>`).join('')}</div>
          <label class="check"><input type="checkbox" id="reverse" ${cfg.reverse ? 'checked' : ''}> Play it backwards</label>
        </div>
        <div class="knob-card knob-magic">
          <button class="btn btn-magic" id="matchTempo" ${cfg.bpm ? '' : 'disabled'} data-hint="Speeds the sample up or down so it locks to your beat's BPM.">✦ Match my tempo (${p.bpm})</button>
          <button class="btn btn-magic" id="matchKey" ${cfg.keyRoot != null ? '' : 'disabled'} data-hint="Finds the sample's key and moves it into your beat's key, so it never clashes with your 808 or melody.">✦ Match my key (${T.keyName(p.key, p.scale)})</button>
          <button class="btn" id="resetSample" data-hint="Back to how the record originally sounded.">Reset to original</button>
          ${cfg.builtin ? '' : '<button class="btn" id="recrop">Pick a different part</button>'}
        </div>
      </div>
      <div class="lab-chop">
        <div class="seg" role="group" aria-label="Number of chops">
          <span class="seg-label">Chop into</span>
          ${[4, 8, 16].map((v) => `<button class="${n === v ? 'is-on' : ''}" data-chops="${v}">${v}</button>`).join('')}
        </div>
        <div class="seg" role="group" aria-label="How to chop">
          ${[['equal', 'Even pieces'], ['hits', 'On the hits']].map(([v, l]) => `<button class="${(cfg.chopMode || 'equal') === v ? 'is-on' : ''}" data-chopmode="${v}" data-hint="${v === 'hits' ? 'Cuts right where notes or drums start. Best for most samples.' : 'Cuts the sample into equal pieces. Great for loops that are on tempo.'}">${l}</button>`).join('')}
        </div>
      </div>
      <div class="pads" id="pads">${(rt && rt.slices.length ? rt.slices : [...Array(n)].map(() => null)).map((s, i) => `<button class="pad" data-pad="${i}" style="--h:${(i * 37) % 360}" data-hint="Chop ${i + 1}. Press ${i < 9 ? i + 1 : i === 9 ? 0 : '—'} on your keyboard to play it.">${i + 1}</button>`).join('')}</div>
      <div class="lab-actions">
        <button class="btn" id="labPlay">▶ Play whole sample</button>
        <button class="btn btn-accent" id="addLoop" data-hint="Adds a track that plays this sample as a loop under your beat.">Add to beat as loop</button>
        <button class="btn btn-accent" id="addChops" data-hint="Adds a track where you place chops on the grid, like an MPC.">Add to beat as chops</button>
      </div>
    </div>`;
  }

  function bind(host, cfg) {
    el.busy = host.querySelector('#labBusy');
    host.querySelectorAll('[data-builtin]').forEach((b) => b.addEventListener('click', () => pickBuiltin(b.dataset.builtin)));
    host.querySelectorAll('[data-user]').forEach((b) => b.addEventListener('click', () => {
      A.ui.labSample = b.dataset.user; A.ui.labCrop = false; process(true);
    }));
    const f = host.querySelector('#labFile');
    if (f) f.addEventListener('change', () => { if (f.files[0]) importFile(f.files[0]); });
    const auto = host.querySelector('#labAuto');
    if (auto) auto.addEventListener('change', () => { A.ui.labAuto = auto.checked; });
    const rec = host.querySelector('#labRec');
    if (rec) rec.addEventListener('click', toggleMic);
    if (!cfg) return;

    const wave = host.querySelector('#labWave');
    if (wave) bindWave(wave, cfg);
    if (A.ui.labCrop) {
      host.querySelector('#cropPlay').addEventListener('click', () => {
        const rt = rts[cfg.id];
        if (rt && rt.raw && cropSel) BL.engine.previewBuffer(rt.raw, cropSel.a, cropSel.b - cropSel.a, () => drawWave());
        animatePreview();
      });
      host.querySelector('#cropUse').addEventListener('click', async () => {
        const sel = cropSel || { a: 0, b: MAX_SECONDS };
        A.ui.labCrop = false;
        const rt = rts[cfg.id];
        setCfg((c) => { c.trim = [sel.a, sel.b]; });
        // re-detect key and tempo on the chosen part
        const ctx = null;
        const part = bufferFrom(ctx, trimmedChannels(rt.raw, { trim: [sel.a, sel.b] }), rt.raw.sampleRate);
        const info = await analyze(part);
        A.edit((p) => { const c = p.samples[cfg.id]; c.bpm = info.bpm; c.keyRoot = info.key.root; c.keyMode = info.key.mode; }, { quiet: true });
        render();
      });
      const cc = host.querySelector('#cropCancel');
      if (cc) cc.addEventListener('click', () => { A.ui.labCrop = false; render(); });
      return;
    }

    const speed = host.querySelector('#speed');
    speed.addEventListener('input', () => { host.querySelector('#speedOut').textContent = fmtSpeed(+speed.value); });
    speed.addEventListener('change', () => setCfg((c) => { c.speed = +speed.value; }));
    const semis = host.querySelector('#semis');
    semis.addEventListener('input', () => { host.querySelector('#pitchOut').textContent = fmtSemis(+semis.value); });
    semis.addEventListener('change', () => setCfg((c) => { c.semis = Math.round(+semis.value * 2) / 2; }));
    host.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => setCfg((c) => { c.speed = +b.dataset.speed; })));
    host.querySelectorAll('[data-semis]').forEach((b) => b.addEventListener('click', () => setCfg((c) => { c.semis = +b.dataset.semis; })));
    host.querySelector('#keepPitch').addEventListener('change', (e) => setCfg((c) => { c.keepPitch = e.target.checked; }));
    host.querySelector('#reverse').addEventListener('change', (e) => setCfg((c) => { c.reverse = e.target.checked; }));
    host.querySelector('#matchTempo').addEventListener('click', () => {
      setCfg((c, p) => { c.speed = fitSpeed(c.bpm, p.bpm); });
      A.toast(`Sample now runs at ${A.project().bpm} BPM.`);
    });
    host.querySelector('#matchKey').addEventListener('click', () => {
      setCfg((c, p) => { c.semis = autoKeySemis(c, p); });
      const p = A.project();
      A.toast(`Sample moved into ${T.keyName(p.key, p.scale)}.`);
    });
    host.querySelector('#resetSample').addEventListener('click', () => setCfg((c) => { c.speed = 1; c.semis = 0; c.reverse = false; c.keepPitch = false; }));
    const rc = host.querySelector('#recrop');
    if (rc) rc.addEventListener('click', () => { cropSel = cfg.trim ? { a: cfg.trim[0], b: cfg.trim[1] } : null; A.ui.labCrop = true; render(); });
    host.querySelectorAll('[data-chops]').forEach((b) => b.addEventListener('click', () => setCfg((c) => { c.chops = +b.dataset.chops; })));
    host.querySelectorAll('[data-chopmode]').forEach((b) => b.addEventListener('click', () => setCfg((c) => { c.chopMode = b.dataset.chopmode; })));
    host.querySelectorAll('[data-pad]').forEach((b) => b.addEventListener('pointerdown', () => playSlice(+b.dataset.pad)));
    host.querySelector('#labPlay').addEventListener('click', () => {
      const rt = rts[cfg.id];
      if (!rt || !rt.processed) return;
      BL.engine.previewBuffer(rt.processed, 0, rt.processed.duration, () => drawWave());
      animatePreview();
    });
    host.querySelector('#addLoop').addEventListener('click', () => A.addSampleTrack(cfg.id, 'loop'));
    host.querySelector('#addChops').addEventListener('click', () => A.addSampleTrack(cfg.id, 'chop'));
  }

  function playSlice(i) {
    const cfg = selectedCfg();
    const rt = cfg && rts[cfg.id];
    if (!rt || !rt.processed || !rt.slices[i]) return;
    const s = rt.slices[i];
    BL.engine.previewBuffer(rt.processed, s.s, s.e - s.s, () => drawWave());
    const pad = document.querySelector(`[data-pad="${i}"]`);
    if (pad) { pad.classList.add('is-hit'); setTimeout(() => pad.classList.remove('is-hit'), 140); }
    animatePreview();
  }

  let anim = 0;
  function animatePreview() {
    cancelAnimationFrame(anim);
    const loop = () => {
      drawWave();
      if (BL.engine.previewPosition() != null) anim = requestAnimationFrame(loop);
    };
    anim = requestAnimationFrame(loop);
  }

  function bindWave(canvas, cfg) {
    let dragging = false, startX = 0;
    canvas.addEventListener('pointerdown', (e) => {
      const rt = rts[cfg.id];
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      if (A.ui.labCrop) {
        if (!rt || !rt.raw) return;
        dragging = true;
        startX = x;
        canvas.setPointerCapture(e.pointerId);
        const t = x * rt.raw.duration;
        cropSel = { a: t, b: Math.min(rt.raw.duration, t + 0.1) };
        drawWave();
        return;
      }
      if (!rt || !rt.processed) return;
      const t = x * rt.processed.duration;
      const idx = rt.slices.findIndex((s) => t >= s.s && t < s.e);
      if (idx >= 0) playSlice(idx);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rt = rts[cfg.id];
      const r = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      let a = Math.min(startX, x) * rt.raw.duration, b = Math.max(startX, x) * rt.raw.duration;
      if (b - a > MAX_SECONDS) { if (x > startX) b = a + MAX_SECONDS; else a = b - MAX_SECONDS; }
      cropSel = { a, b: Math.max(b, a + 0.1) };
      drawWave();
    });
    canvas.addEventListener('pointerup', () => { dragging = false; });
  }

  const peakCache = new WeakMap();
  function peaks(buf, w) {
    let c = peakCache.get(buf);
    if (c && c.w === w) return c.p;
    const d0 = buf.getChannelData(0), d1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : d0;
    const per = Math.max(1, Math.floor(buf.length / w));
    const p = new Float32Array(w * 2);
    for (let x = 0; x < w; x++) {
      let mn = 0, mx = 0;
      const a = x * per;
      for (let i = 0; i < per; i += 4) {
        const v = (d0[a + i] + d1[a + i]) * 0.5;
        if (v < mn) mn = v; if (v > mx) mx = v;
      }
      p[x * 2] = mn; p[x * 2 + 1] = mx;
    }
    peakCache.set(buf, { w, p });
    return p;
  }

  function drawWave() {
    const canvas = document.getElementById('labWave');
    const cfg = selectedCfg();
    if (!canvas || !cfg) return;
    const rt = rts[cfg.id];
    const dpr = root.devicePixelRatio || 1;
    const w = Math.max(100, canvas.clientWidth), h = canvas.clientHeight || 120;
    if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(document.documentElement);
    const col = (n) => css.getPropertyValue(n).trim();
    g.fillStyle = col('--well');
    g.fillRect(0, 0, w, h);
    const buf = A.ui.labCrop ? rt && rt.raw : rt && rt.processed;
    if (!buf) {
      g.fillStyle = col('--muted');
      g.font = '13px ' + col('--font-body');
      g.fillText(rt && rt.missing ? 'This sample’s audio is not on this device. Load the file again.' : 'Loading…', 16, h / 2);
      return;
    }
    const dur = buf.duration;
    if (A.ui.labCrop) {
      if (cropSel) {
        g.fillStyle = col('--accent-soft');
        g.fillRect((cropSel.a / dur) * w, 0, ((cropSel.b - cropSel.a) / dur) * w, h);
      }
    } else {
      rt.slices.forEach((s, i) => {
        g.fillStyle = `hsla(${(i * 37) % 360}, 70%, 60%, 0.13)`;
        g.fillRect((s.s / dur) * w, 0, ((s.e - s.s) / dur) * w, h);
        g.fillStyle = `hsla(${(i * 37) % 360}, 80%, 65%, 0.9)`;
        g.fillRect((s.s / dur) * w, 0, 2, h);
        g.font = '600 11px ' + col('--font-mono');
        g.fillText(String(i + 1), (s.s / dur) * w + 5, 14);
      });
    }
    const pk = peaks(buf, Math.floor(w));
    g.fillStyle = col('--wave');
    const mid = h / 2;
    for (let x = 0; x < w; x++) {
      const mn = pk[x * 2], mx = pk[x * 2 + 1];
      g.fillRect(x, mid - mx * mid * 0.92, 1, Math.max(1, (mx - mn) * mid * 0.92));
    }
    const pos = BL.engine.previewPosition();
    if (pos != null) {
      g.fillStyle = col('--accent');
      g.fillRect((pos / dur) * w, 0, 2, h);
    }
  }

  // ---------- microphone ----------
  let rec = null, recChunks = [];
  async function toggleMic() {
    if (A.ui.recordingMic && rec) { rec.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recChunks = [];
      rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data.size) recChunks.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        A.ui.recordingMic = false;
        render();
        const blob = new Blob(recChunks, { type: rec.mimeType || 'audio/webm' });
        rec = null;
        await importBlob(blob, 'Mic recording ' + new Date().toLocaleTimeString().replace(/:\d\d\s?/, ' '));
      };
      rec.start();
      A.ui.recordingMic = true;
      A.toast('Recording… press Stop when you are done.');
      render();
    } catch (e) {
      A.toast('The microphone is not available here. You can load an audio file instead.');
    }
  }

  function keyPad(key) {
    if (A.ui.tab !== 'lab' || A.ui.labCrop) return false;
    const map = '1234567890';
    const i = map.indexOf(key);
    if (i < 0) return false;
    playSlice(i);
    return true;
  }

  BL.lab = {
    init, render, ensure, runtime: (id) => rts[id], fitSpeed, autoKeySemis, importFile, keyPad,
    drawWave, idb, memBytes, forget(id) { delete rts[id]; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
