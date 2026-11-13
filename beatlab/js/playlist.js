/* BeatLab — Playlist: arrange patterns and audio tracks on a timeline (FL-style), with Logic-style lanes. */
(function (root) {
  const BL = (root.BL = root.BL || {});
  let A = null;
  const LANE_H = 54;
  const HEAD_W = 168;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let host = null;
  let sel = null; // selected clip id

  function init(api) { A = api; }
  const P = () => A.project();
  const barW = () => A.ui.barW || 56;
  const barDur = () => (60 / P().bpm) * 4;

  function clipLen(kind, ref) {
    if (kind === 'pattern') return P().bars;
    const meta = P().audio[ref];
    return meta ? Math.max(0.25, Math.round((meta.duration / barDur()) * 4) / 4) : 1;
  }
  function songBars() {
    let end = 0;
    for (const c of P().clips) end = Math.max(end, c.start + c.len);
    return end;
  }
  function brushLabel(b) {
    if (!b) return 'Nothing';
    if (b.kind === 'pattern') return (P().patterns[b.pat] || {}).name || 'Pattern';
    return (P().audio[b.audio] || {}).name || 'Audio';
  }

  function render(el) {
    host = el || host;
    if (!host) return;
    const p = P();
    const bars = Math.max(32, Math.ceil(songBars() / 8) * 8 + 16);
    const bw = barW();
    const brush = A.ui.brush;
    const opts = p.patterns.map((pt, i) => `<option value="p:${i}" ${brush && brush.kind === 'pattern' && brush.pat === i ? 'selected' : ''}>${esc(pt.name)}</option>`).join('') +
      (Object.keys(p.audio).length ? `<optgroup label="Audio tracks">${Object.values(p.audio).map((a) => `<option value="a:${a.id}" ${brush && brush.kind === 'audio' && brush.audio === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</optgroup>` : '');
    host.innerHTML = `
      <div class="pane-head">
        <span class="pane-title">Playlist</span>
        <label class="ph-field" data-hint="What a click in the Playlist paints. Click any clip to pick it up as your brush.">Paint
          <select id="plBrush" class="sel-sm">${opts}</select></label>
        <div class="seg seg-sm" role="group" aria-label="Snap" data-hint="Snap clips to whole bars or to beats.">
          <button data-snap="1" class="${(A.ui.snap || 1) === 1 ? 'is-on' : ''}">Bar</button><button data-snap="0.25" class="${A.ui.snap === 0.25 ? 'is-on' : ''}">Beat</button>
        </div>
        <span class="ph-spacer"></span>
        <button class="tbtn" id="plImport" data-hint="Bring in a song, vocal or any audio file as its own track.">${A.icon('import')}<span>Import Audio</span></button>
        <button class="tbtn" id="plAddLane" data-hint="Add another Playlist track.">${A.icon('plus')}<span>Track</span></button>
        <div class="zoom" data-hint="Zoom the timeline.">
          <button class="tbtn icon" id="plZoomOut" aria-label="Zoom out">${A.icon('minus')}</button>
          <button class="tbtn icon" id="plZoomIn" aria-label="Zoom in">${A.icon('plus')}</button>
        </div>
      </div>
      <div class="pl-scroll" id="plScroll">
        <div class="pl-inner" style="width:${HEAD_W + bars * bw}px;--bw:${bw}px;--lh:${LANE_H}px">
          <div class="pl-ruler" id="plRuler" data-hint="Click the ruler to choose where Song mode starts playing.">
            <div class="pl-corner">${p.songMode ? '<span class="dot-live"></span>Song mode' : 'Pattern mode'}</div>
            <div class="pl-bars" style="width:${bars * bw}px">${[...Array(bars)].map((_, i) => `<span style="left:${i * bw}px" class="${i % 4 === 0 ? 'major' : ''}">${i + 1}</span>`).join('')}
              <i class="pl-startmark" style="left:${(p.pos || 0) * bw}px"></i></div>
          </div>
          <div class="pl-lanes" id="plLanes">
            ${p.lanes.map((l, i) => `<div class="pl-lane ${l.mute ? 'is-mute' : ''}" data-lane="${l.id}" style="top:${i * LANE_H}px">
              <div class="pl-lhead">
                <span class="pl-lname" data-act="rename" data-hint="Double-click to rename.">${esc(l.name)}</span>
                <button class="mini ${l.mute ? 'is-on' : ''}" data-act="mute" data-hint="Mute this Playlist track.">M</button>
                <button class="mini ${l.solo ? 'is-on' : ''}" data-act="solo" data-hint="Solo this Playlist track.">S</button>
              </div>
              <div class="pl-grid" style="width:${bars * bw}px"></div>
            </div>`).join('')}
            <div class="pl-clips" id="plClips" style="left:${HEAD_W}px;width:${bars * bw}px;height:${p.lanes.length * LANE_H}px">
              ${p.clips.map(clipHtml).join('')}
              <div class="pl-head" id="plHead" hidden></div>
            </div>
          </div>
          <div class="pl-foot" style="height:${8}px"></div>
        </div>
      </div>`;
    bind();
    drawClips();
  }

  function clipHtml(c) {
    const p = P();
    const bw = barW();
    const li = p.lanes.findIndex((l) => l.id === c.lane);
    if (li < 0) return '';
    const color = c.kind === 'pattern' ? (p.patterns[c.pat] || {}).color || '#888' : '#5ac8fa';
    const name = c.kind === 'pattern' ? (p.patterns[c.pat] || {}).name : (p.audio[c.audio] || {}).name;
    return `<div class="clip ${c.kind} ${sel === c.id ? 'is-sel' : ''}" data-clip="${c.id}" style="left:${c.start * bw}px;top:${li * LANE_H + 2}px;width:${Math.max(6, c.len * bw - 1)}px;height:${LANE_H - 4}px;--c:${color}">
      <span class="clip-name">${esc(name || '')}</span><canvas class="clip-cv"></canvas><span class="clip-grip"></span></div>`;
  }

  /** mini previews: drum hits / notes for patterns, waveform for audio */
  function drawClips() {
    const p = P();
    const dpr = root.devicePixelRatio || 1;
    $$('.clip', host).forEach((el) => {
      const c = p.clips.find((x) => x.id === el.dataset.clip);
      const cv = $('canvas', el);
      if (!c || !cv) return;
      const w = el.clientWidth, h = el.clientHeight - 16;
      if (w < 4 || h < 4) return;
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      const g = cv.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = 'rgba(255,255,255,0.78)';
      const bw = barW();
      if (c.kind === 'pattern') {
        const pat = p.patterns[c.pat];
        if (!pat) return;
        const n = p.bars * 16;
        const sw = bw / 16;
        const rows = p.tracks.filter((t) => pat.data[t.id]);
        const rh = Math.max(1.5, Math.min(4, h / Math.max(1, rows.length)));
        rows.forEach((t, ri) => {
          const d = pat.data[t.id];
          const y = 2 + ri * ((h - 4) / Math.max(1, rows.length));
          for (let rep = 0; rep * n < c.len * 16; rep++) {
            const off = rep * n * sw;
            if (d.steps && t.type !== 'sample') d.steps.forEach((v, i) => { if (v) g.fillRect(off + i * sw, y, Math.max(1, sw - 1), rh); });
            else if (d.steps && t.mode === 'chop') d.steps.forEach((v, i) => { if (v >= 0) g.fillRect(off + i * sw, y, Math.max(1, sw - 1), rh); });
            else if (d.notes) d.notes.forEach((nt) => g.fillRect(off + nt.s * sw, y, Math.max(1, nt.l * sw - 1), rh));
            else if (t.type === 'sample' && d.on !== false) g.fillRect(off, y, n * sw - 1, rh * 0.6);
          }
        });
      } else {
        const buf = BL.media.audioBuffer(c.audio);
        if (!buf) return;
        const data = buf.getChannelData(0);
        const sr = buf.sampleRate;
        const secPerPx = barDur() / bw;
        const off = c.offset || 0;
        const mid = h / 2;
        for (let x = 0; x < w; x += 1) {
          const a = Math.floor((off + x * secPerPx) * sr), b = Math.floor((off + (x + 1) * secPerPx) * sr);
          if (a >= data.length) break;
          let mx = 0;
          const step = Math.max(1, Math.floor((b - a) / 32));
          for (let i = a; i < b && i < data.length; i += step) mx = Math.max(mx, Math.abs(data[i]));
          g.fillRect(x, mid - mx * mid, 1, Math.max(1, mx * h));
        }
      }
    });
  }

  function snap(v) { const s = A.ui.snap || 1; return Math.max(0, Math.round(v / s) * s); }
  function snapFloor(v) { const s = A.ui.snap || 1; return Math.max(0, Math.floor(v / s) * s); }

  function bind() {
    const p = P();
    const clipsEl = $('#plClips', host);
    $('#plBrush', host).addEventListener('change', (e) => {
      const [k, v] = e.target.value.split(':');
      A.ui.brush = k === 'p' ? { kind: 'pattern', pat: +v } : { kind: 'audio', audio: v };
    });
    $$('[data-snap]', host).forEach((b) => b.addEventListener('click', () => { A.ui.snap = +b.dataset.snap; render(); }));
    $('#plImport', host).addEventListener('click', () => A.pickAudioFiles());
    $('#plAddLane', host).addEventListener('click', () => A.edit((pp) => { pp.lanes.push(A.newLane(pp)); }));
    $('#plZoomIn', host).addEventListener('click', () => zoom(1.25));
    $('#plZoomOut', host).addEventListener('click', () => zoom(0.8));
    $('#plScroll', host).addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      zoom(e.deltaY < 0 ? 1.1 : 0.9);
    }, { passive: false });
    $('#plRuler', host).addEventListener('pointerdown', (e) => {
      const bars = $('.pl-bars', host);
      if (!bars.contains(e.target) && e.target !== bars) return;
      const r = bars.getBoundingClientRect();
      const bar = Math.max(0, Math.floor((e.clientX - r.left) / barW()));
      P().pos = bar;
      A.autosave();
      $('.pl-startmark', host).style.left = bar * barW() + 'px';
      if (A.engine.state.playing && P().songMode) { A.engine.stop(); A.engine.play(bar * 16); A.renderTransport(); }
    });
    $$('.pl-lane', host).forEach((row) => {
      const id = row.dataset.lane;
      const lane = () => P().lanes.find((l) => l.id === id);
      $('[data-act="mute"]', row).addEventListener('click', () => A.edit(() => { lane().mute = !lane().mute; }));
      $('[data-act="solo"]', row).addEventListener('click', () => A.edit(() => { lane().solo = !lane().solo; }));
      $('[data-act="rename"]', row).addEventListener('dblclick', (e) => A.inlineRename(e.currentTarget, lane().name, (v) => A.edit(() => { lane().name = v; })));
      $('.pl-lhead', row).addEventListener('contextmenu', (e) => { e.preventDefault(); laneMenu(id, e.currentTarget); });
    });

    // ---- clips: place, move, resize, delete
    let drag = null;
    const posOf = (e) => {
      const r = clipsEl.getBoundingClientRect();
      const x = (e.clientX - r.left) / barW();
      const li = Math.max(0, Math.min(P().lanes.length - 1, Math.floor((e.clientY - r.top) / LANE_H)));
      return { bar: x, li };
    };
    clipsEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const el = e.target.closest('.clip');
      if (el) removeClip(el.dataset.clip);
    });
    clipsEl.addEventListener('dblclick', (e) => {
      const el = e.target.closest('.clip');
      if (!el) return;
      const c = P().clips.find((x) => x.id === el.dataset.clip);
      if (c && c.kind === 'pattern') A.openPattern(c.pat);
    });
    clipsEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const pos = posOf(e);
      const el = e.target.closest('.clip');
      A.snapshot();
      if (el) {
        const c = P().clips.find((x) => x.id === el.dataset.clip);
        sel = c.id;
        A.ui.brush = c.kind === 'pattern' ? { kind: 'pattern', pat: c.pat } : { kind: 'audio', audio: c.audio };
        const right = (c.start + c.len) * barW();
        const px = pos.bar * barW();
        drag = { c, mode: right - px < 9 ? 'resize' : 'move', start: c.start, lane: c.lane, len: c.len, bar0: pos.bar, li0: pos.li, moved: false };
      } else {
        const b = A.ui.brush;
        if (!b || (b.kind === 'audio' && !P().audio[b.audio]) || (b.kind === 'pattern' && !P().patterns[b.pat])) { A.toast('Pick a pattern or audio track to paint first.'); return; }
        const c = { id: A.uid('c'), kind: b.kind, lane: P().lanes[pos.li].id, start: snapFloor(pos.bar), len: clipLen(b.kind, b.kind === 'pattern' ? b.pat : b.audio) };
        if (b.kind === 'pattern') c.pat = b.pat; else { c.audio = b.audio; c.offset = 0; }
        P().clips.push(c);
        sel = c.id;
        if (!P().songMode) { P().songMode = true; A.renderTransport(); A.toast('Song mode is on: Play now follows the Playlist.'); }
        drag = { c, mode: 'move', start: c.start, lane: c.lane, len: c.len, bar0: pos.bar, li0: pos.li, moved: true };
      }
      clipsEl.setPointerCapture(e.pointerId);
      refreshClips();
    });
    clipsEl.addEventListener('pointermove', (e) => {
      const el = e.target.closest && e.target.closest('.clip');
      if (!drag) {
        clipsEl.style.cursor = el && (() => { const c = P().clips.find((x) => x.id === el.dataset.clip); const r = el.getBoundingClientRect(); return c && r.right - e.clientX < 9; })() ? 'ew-resize' : '';
        return;
      }
      const pos = posOf(e);
      const d = drag;
      if (d.mode === 'move') {
        const nb = snap(d.start + (pos.bar - d.bar0));
        const nl = P().lanes[Math.max(0, Math.min(P().lanes.length - 1, P().lanes.findIndex((l) => l.id === d.lane) + (pos.li - d.li0)))].id;
        if (nb !== d.c.start || nl !== d.c.lane) d.moved = true;
        d.c.start = nb; d.c.lane = nl;
      } else {
        const s = A.ui.snap || 1;
        let nl = Math.max(s, snap(d.len + (pos.bar - d.bar0)));
        if (d.c.kind === 'audio') {
          const meta = P().audio[d.c.audio];
          if (meta) nl = Math.min(nl, Math.ceil(((meta.duration - (d.c.offset || 0)) / barDur()) / s) * s);
        }
        if (nl !== d.c.len) d.moved = true;
        d.c.len = nl;
      }
      refreshClips();
    });
    const end = () => {
      if (!drag) return;
      drag = null;
      A.changed({ noRender: true });
      render();
    };
    clipsEl.addEventListener('pointerup', end);
    clipsEl.addEventListener('pointercancel', end);

    // ---- drops from the Browser or the desktop
    const scroll = $('#plScroll', host);
    scroll.addEventListener('dragover', (e) => { e.preventDefault(); scroll.classList.add('is-drop'); });
    scroll.addEventListener('dragleave', () => scroll.classList.remove('is-drop'));
    scroll.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      scroll.classList.remove('is-drop');
      const pos = posOf(e);
      const raw = e.dataTransfer.getData('text/beatlab');
      if (raw) {
        const item = JSON.parse(raw);
        if (item.kind === 'audio' || item.kind === 'packloop') {
          let aid = item.id;
          if (item.kind === 'packloop') aid = await A.audioFromPackSound(item.id);
          if (aid) placeAudio(aid, pos.li, snapFloor(pos.bar));
        }
        return;
      }
      const files = [...(e.dataTransfer.files || [])].filter((f) => BL.media.AUDIO_EXT.test(f.name));
      for (let i = 0; i < files.length; i++) {
        const meta = await A.importAudioFile(files[i]);
        if (meta) placeAudio(meta.id, Math.min(P().lanes.length - 1, pos.li + i), snapFloor(pos.bar));
      }
    });
  }

  function refreshClips() {
    const clipsEl = $('#plClips', host);
    if (!clipsEl) return;
    const head = $('#plHead', host);
    clipsEl.innerHTML = P().clips.map(clipHtml).join('');
    if (head) clipsEl.appendChild(head);
    drawClips();
  }

  function placeAudio(aid, li, bar) {
    A.edit((p) => {
      while (p.lanes.length <= li) p.lanes.push(A.newLane(p));
      const c = { id: A.uid('c'), kind: 'audio', audio: aid, offset: 0, lane: p.lanes[li].id, start: bar, len: clipLen('audio', aid) };
      p.clips.push(c);
      sel = c.id;
      p.songMode = true;
    });
    A.ui.brush = { kind: 'audio', audio: aid };
    A.toast(`Added “${P().audio[aid].name}” to the Playlist. Press play.`);
  }

  function removeClip(id) {
    A.edit((p) => { p.clips = p.clips.filter((c) => c.id !== id); });
    if (sel === id) sel = null;
  }

  function laneMenu(id, anchor) {
    A.openPop(anchor, `<div class="menu"><button data-m="up">Move Up</button><button data-m="down">Move Down</button><button data-m="clear">Clear Track</button><hr><button data-m="del" class="danger">Delete Track</button></div>`, (pop) => {
      const on = (k, fn) => $(`[data-m="${k}"]`, pop).addEventListener('click', () => { A.closePop(); fn(); });
      on('up', () => A.edit((p) => { const i = p.lanes.findIndex((l) => l.id === id); if (i > 0) p.lanes.splice(i - 1, 0, p.lanes.splice(i, 1)[0]); }));
      on('down', () => A.edit((p) => { const i = p.lanes.findIndex((l) => l.id === id); if (i < p.lanes.length - 1) p.lanes.splice(i + 1, 0, p.lanes.splice(i, 1)[0]); }));
      on('clear', () => A.edit((p) => { p.clips = p.clips.filter((c) => c.lane !== id); }));
      on('del', () => A.edit((p) => { if (p.lanes.length > 1) { p.lanes = p.lanes.filter((l) => l.id !== id); p.clips = p.clips.filter((c) => c.lane !== id); } }));
    });
  }

  function zoom(f) {
    const sc = $('#plScroll', host);
    const centerBar = sc ? (sc.scrollLeft + sc.clientWidth / 2 - HEAD_W) / barW() : 0;
    A.ui.barW = Math.max(18, Math.min(220, Math.round(barW() * f)));
    render();
    const sc2 = $('#plScroll', host);
    if (sc2) sc2.scrollLeft = Math.max(0, centerBar * barW() + HEAD_W - sc2.clientWidth / 2);
    A.savePrefs();
  }

  /** move the playhead; abs = steps from the start of the song */
  function playhead(abs) {
    const head = $('#plHead', host);
    if (!head) return;
    if (abs == null) { head.hidden = true; return; }
    head.hidden = false;
    const x = (abs / 16) * barW();
    head.style.transform = `translateX(${x}px)`;
    const sc = $('#plScroll', host);
    if (sc && A.engine.state.playing) {
      const vx = x + HEAD_W - sc.scrollLeft;
      if (vx > sc.clientWidth - 60 || vx < HEAD_W) sc.scrollLeft = Math.max(0, x - 80);
    }
  }

  function deleteSelected() {
    if (!sel) return false;
    removeClip(sel);
    return true;
  }

  BL.playlist = { init, render, playhead, drawClips, deleteSelected, placeAudio, clipLen, songBars };
})(typeof window !== 'undefined' ? window : globalThis);
