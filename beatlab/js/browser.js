/* BeatLab — Browser sidebar (FL-style): templates, your projects, drums, instruments, records,
 * your audio tracks and imported sound packs. Click to preview, double-click or + to use, drag to place. */
(function (root) {
  const BL = (root.BL = root.BL || {});
  let A = null;
  let host = null;
  let query = '';
  let projects = [];
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CAT_COLORS = { Kick: '#ff453a', Snare: '#ff9f0a', Clap: '#ffb340', 'Hi-Hat': '#ffd60a', 'Open Hat': '#c7d93a', '808': '#ff375f', Perc: '#30d158', FX: '#64d2ff', Loops: '#40c8e0' };

  function init(api) { A = api; }
  async function refreshProjects() { projects = await BL.media.listProjects(); render(); }

  function isOpen(key, dflt) {
    const o = A.ui.open || (A.ui.open = {});
    return o[key] == null ? !!dflt : o[key];
  }

  function item(kind, id, name, meta, color, opts) {
    opts = opts || {};
    const draggable = ['drum', 'pack', 'audio', 'packloop', 'inst', 'disk'].includes(kind);
    return `<div class="bi" role="button" tabindex="0" data-kind="${kind}" data-id="${esc(id)}" ${draggable ? 'draggable="true"' : ''} data-hint="${esc(opts.hint || '')}">
      <i class="bi-dot" style="--c:${color || 'var(--muted)'}"></i><span class="bi-name">${esc(name)}</span>${meta ? `<span class="bi-meta">${esc(meta)}</span>` : ''}
      ${opts.add ? `<button class="bi-add" data-add aria-label="Add" tabindex="-1">${A.icon('plus')}</button>` : ''}${opts.del ? `<button class="bi-add bi-del" data-del aria-label="Delete" tabindex="-1">${A.icon('trash')}</button>` : ''}</div>`;
  }
  function folder(key, label, count, body, opts) {
    opts = opts || {};
    const open = query ? true : isOpen(key, opts.open);
    return `<section class="bf ${open ? 'is-open' : ''}" data-folder="${key}">
      <div class="bf-head" role="button" tabindex="0" data-toggle="${key}">
        <span class="bf-chev">${A.icon('chev')}</span><span class="bf-label">${label}</span><span class="bf-count">${count}</span>
        ${opts.action ? `<button class="bf-act" data-action="${opts.action}" data-hint="${esc(opts.actionHint || '')}">${A.icon(opts.actionIcon || 'plus')}</button>` : ''}
      </div>
      <div class="bf-body">${body}</div></section>`;
  }
  const match = (s) => !query || s.toLowerCase().includes(query);

  function render(el) {
    host = el || host;
    if (!host) return;
    const p = A.project();
    const S = BL.sounds;
    const parts = [];

    const presets = BL.beats.PRESETS.filter((pr) => match(pr.name + ' ' + pr.tags.join(' ')));
    if (presets.length) parts.push(folder('tpl', 'Templates', presets.length, presets.map((pr) => item('preset', pr.id, pr.name, pr.bpm + ' BPM', pr.color, { hint: pr.desc + ' Tags: ' + pr.tags.join(', ') })).join('')));

    const projs = projects.filter((x) => match(x.name));
    if (!query || projs.length) parts.push(folder('proj', 'My Projects', projs.length,
      projs.length ? projs.map((x) => item('project', x.id, x.name, ago(x.updated), 'var(--accent)', { del: true, hint: 'Open this saved project.' })).join('') : '<p class="bf-empty">Projects you save (⌘S) show up here.</p>',
      { open: true, action: 'save', actionIcon: 'save', actionHint: 'Save the current project' }));

    const kitBody = BL.beats.KITS.map((k) => {
      const list = S.DRUMS.filter((d) => d.kit === k.id && match(d.name + ' ' + d.cat + ' ' + k.name + ' ' + k.inspired));
      if (!list.length) return '';
      return folder('kit-' + k.id, k.name, list.length, item('preset', k.preset, 'Start a beat with this pack', '', k.color, { hint: 'Loads a starter beat built from this pack.' }) +
        list.map((d) => item('drum', d.id, d.name, d.cat, CAT_COLORS[d.cat] || k.color, { add: true, hint: 'Click to hear it. Double-click or + adds it as a channel. Drag it onto a row in Beat to swap sounds.' })).join(''));
    }).join('');
    if (kitBody) parts.push(folder('kits', 'BeatLab Packs', BL.beats.KITS.length, kitBody, { open: true }));

    const drumBody = S.DRUM_CATS.map((c) => {
      const list = S.DRUMS.filter((d) => d.cat === c && !d.kit && match(d.name + ' ' + c));
      if (!list.length) return '';
      return folder('d-' + c, c, list.length, list.map((d) => item('drum', d.id, d.name, '', CAT_COLORS[c] || '#888', { add: true, hint: 'Click to hear it. Double-click or + adds it as a channel. Drag it onto a channel to swap sounds.' })).join(''));
    }).join('');
    if (drumBody) parts.push(folder('drums', 'Drums', S.DRUMS.filter((d) => !d.kit).length, drumBody, { open: true }));

    const instBody = [...new Set(Object.values(S.INSTRUMENTS).map((i) => i.cat))].map((c) => {
      const list = Object.entries(S.INSTRUMENTS).filter(([k, i]) => i.cat === c && match(i.name + ' ' + c));
      if (!list.length) return '';
      return folder('i-' + c, c, list.length, list.map(([k, i]) => item('inst', k, i.name, '', i.bass ? '#ff375f' : '#bf5af2', { add: true, hint: 'Click to hear it. Double-click or + adds it as a channel.' })).join(''));
    }).join('');
    if (instBody) parts.push(folder('inst', 'Instruments', Object.keys(S.INSTRUMENTS).length, instBody));

    const recs = S.BUILTIN_SAMPLES.filter((s) => match(s.name + ' ' + s.desc));
    if (recs.length) parts.push(folder('recs', 'Records', recs.length, recs.map((s) => item('record', s.id, s.name, BL.theory.NOTE_NAMES[s.root] + (BL.theory.isMinorish(s.scale) ? 'm' : '') + ' · ' + s.bpm, '#40c8e0', { hint: s.desc + '. Opens in the Sample Lab.' })).join('')));

    const auds = Object.values(p.audio).filter((a) => match(a.name));
    if (!query || auds.length) parts.push(folder('audio', 'Audio Tracks', auds.length,
      auds.length ? auds.map((a) => item('audio', a.id, a.name, fmtDur(a.duration), '#5ac8fa', { add: true, hint: 'Your audio. Drag it onto the Playlist, or press + to add it at the start.' })).join('') : '<p class="bf-empty">Import songs, vocals or stems, or drop audio files on the Playlist.</p>',
      { open: true, action: 'importAudio', actionIcon: 'import', actionHint: 'Import audio tracks' }));

    // folders on your computer, linked like FL Studio's Browser (Mac app)
    const linked = (A.linkedFolders && A.linkedFolders()) || [];
    if (A.canLinkFolders && A.canLinkFolders()) {
      const body = linked.map((lf) => {
        const files = (lf.files || []).filter((f) => match(f.rel + ' ' + lf.name));
        if (!files.length && query) return '';
        const entries = files.map((f) => {
          const parts = f.rel.split('/');
          const nm = parts.pop().replace(BL.media.AUDIO_EXT, '');
          const cat = BL.media.classify(f.rel, f.size > 600000 ? 4 : 0.5);
          return { dir: parts.join('/'), html: item('disk', lf.path + '/' + f.rel, nm, '', CAT_COLORS[cat] || '#8e8e93', { add: true, hint: 'From your folder. Click to hear it, double-click or + to add it as a channel, or drag it onto a row in Beat or onto the Song timeline.' }) };
        });
        return `<div class="pack-wrap" data-linked="${esc(lf.path)}">${folder('lf-' + lf.path, esc(lf.name), files.length, treeHtml('lf-' + lf.path, entries) || '<p class="bf-empty">No audio files in this folder.</p>')}</div>`;
      }).join('');
      parts.push(folder('linked', 'My Folders', linked.length, body || '<p class="bf-empty">Add your sample folders, like FL Studio’s Browser. Nothing is copied: BeatLab reads them straight from your Mac.</p>',
        { open: true, action: 'linkFolder', actionIcon: 'plus', actionHint: 'Add a folder from your computer to the Browser' }));
    }

    const packBody = BL.media.packs.map((pk) => {
      const sounds = pk.sounds.filter((s) => match(s.name + ' ' + s.cat + ' ' + pk.name));
      if (!sounds.length) return '';
      if (sounds.some((s) => s.dir)) {
        // show the pack exactly as it was organised on disk
        const entries = sounds.map((s) => ({ dir: s.dir || '', html: item(s.cat === 'Loops' ? 'packloop' : 'pack', 'u:' + s.id, s.name, s.cat === 'Loops' ? fmtDur(s.dur) : '', CAT_COLORS[s.cat], { add: true, hint: s.cat + '. Click to hear it. Double-click or + adds it. Drag onto a row in Beat to swap sounds.' }) }));
        return `<div class="pack-wrap" data-pack="${pk.id}">${folder('pk-' + pk.id, esc(pk.name), sounds.length, treeHtml('pk-' + pk.id, entries))}</div>`;
      }
      const byCat = BL.media.CATS.map((c) => {
        const list = sounds.filter((s) => s.cat === c);
        if (!list.length) return '';
        return folder('pk-' + pk.id + '-' + c, c, list.length, list.map((s) => item(c === 'Loops' ? 'packloop' : 'pack', 'u:' + s.id, s.name, c === 'Loops' ? fmtDur(s.dur) : '', CAT_COLORS[c], { add: true, hint: c === 'Loops' ? 'Loop. Drag onto the Playlist, or double-click to open it in the Sample Lab.' : 'Click to hear it. Double-click or + adds it as a channel. Drag onto a channel to swap sounds.' })).join(''));
      }).join('');
      return `<div class="pack-wrap" data-pack="${pk.id}">${folder('pk-' + pk.id, esc(pk.name), sounds.length, byCat)}</div>`;
    }).join('');
    parts.push(folder('packs', 'Sound Packs', BL.media.packs.length,
      packBody || `<p class="bf-empty">Import a .zip, a folder, or a handful of WAV/MP3 one-shots. BeatLab sorts them into kicks, snares, hats, 808s, percs, FX and loops.</p>`,
      { open: true, action: 'importPack', actionIcon: 'import', actionHint: 'Import a sound pack' }));

    host.innerHTML = `<div class="br-search"><span class="br-search-ico">${A.icon('search')}</span><input id="brSearch" type="search" placeholder="Search sounds, beats, packs" value="${esc(query)}" aria-label="Search the browser"></div>
      <div class="br-tree">${parts.join('') || '<p class="bf-empty">Nothing matches.</p>'}</div>`;
    bind();
  }

  /** nested folders from "a/b/c" paths */
  function treeHtml(key, entries) {
    const root = { dirs: {}, items: [] };
    entries.forEach((e) => {
      let node = root;
      (e.dir ? e.dir.split('/') : []).forEach((d) => { node = node.dirs[d] = node.dirs[d] || { dirs: {}, items: [] }; });
      node.items.push(e.html);
    });
    const count = (n) => n.items.length + Object.values(n.dirs).reduce((a, d) => a + count(d), 0);
    const render = (n, k) => Object.keys(n.dirs).sort().map((d) => folder(k + '/' + d, esc(d), count(n.dirs[d]), render(n.dirs[d], k + '/' + d))).join('') + n.items.join('');
    return render(root, key);
  }

  function ago(t) {
    const s = (Date.now() - t) / 1000;
    if (s < 60) return 'now';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    return Math.floor(s / 86400) + 'd';
  }
  function fmtDur(d) { d = Math.round(d || 0); return Math.floor(d / 60) + ':' + String(d % 60).padStart(2, '0'); }

  function bind() {
    const s = $('#brSearch', host);
    s.addEventListener('input', () => {
      query = s.value.trim().toLowerCase();
      const pos = s.selectionStart;
      render();
      const s2 = $('#brSearch', host);
      s2.focus();
      s2.setSelectionRange(pos, pos);
    });
    $$('[data-toggle]', host).forEach((h) => {
      const toggle = (e) => {
        if (e.target.closest('[data-action]')) return;
        const k = h.dataset.toggle;
        A.ui.open[k] = !isOpen(k, h.parentElement.classList.contains('is-open'));
        h.parentElement.classList.toggle('is-open', A.ui.open[k]);
        A.savePrefs();
      };
      h.addEventListener('click', toggle);
      h.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); } });
    });
    $$('[data-action]', host).forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const a = b.dataset.action;
      if (a === 'importAudio') A.pickAudioFiles();
      else if (a === 'importPack') A.pickPack(e.currentTarget);
      else if (a === 'linkFolder') A.linkFolder();
      else if (a === 'save') A.saveToLibrary(false);
    }));
    $$('.bi', host).forEach((el) => {
      const kind = el.dataset.kind, id = el.dataset.id;
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-add]')) { use(kind, id); return; }
        if (e.target.closest('[data-del]')) { del(kind, id); return; }
        $$('.bi.is-sel', host).forEach((x) => x.classList.remove('is-sel'));
        el.classList.add('is-sel');
        preview(kind, id);
      });
      el.addEventListener('dblclick', (e) => { if (!e.target.closest('button')) use(kind, id); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') use(kind, id); });
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/beatlab', JSON.stringify({ kind, id }));
        e.dataTransfer.effectAllowed = 'copy';
        document.body.classList.add('is-dragging-item');
      });
      el.addEventListener('dragend', () => document.body.classList.remove('is-dragging-item'));
    });
    $$('.pack-wrap[data-linked]', host).forEach((w) => {
      $('.bf-head', w).addEventListener('contextmenu', (e) => {
        e.preventDefault();
        A.openPop(e.currentTarget, '<div class="menu"><button data-m="refresh">Refresh</button><button data-m="unlink" class="danger">Remove from Browser</button></div>', (pop) => {
          $('[data-m="refresh"]', pop).addEventListener('click', () => { A.closePop(); A.refreshLinked(w.dataset.linked); });
          $('[data-m="unlink"]', pop).addEventListener('click', () => { A.closePop(); A.unlinkFolder(w.dataset.linked); });
        });
      });
    });
    $$('.pack-wrap[data-pack]', host).forEach((w) => {
      $('.bf-head', w).addEventListener('contextmenu', (e) => {
        e.preventDefault();
        A.openPop(e.currentTarget, '<div class="menu"><button data-m="del" class="danger">Delete Pack</button></div>', (pop) => {
          $('[data-m="del"]', pop).addEventListener('click', async () => { A.closePop(); await BL.media.deletePack(w.dataset.pack); render(); A.toast('Pack deleted.'); });
        });
      });
    });
  }

  async function preview(kind, id) {
    const E = BL.engine;
    if (kind === 'drum') E.previewDrum(id);
    else if (kind === 'pack' || kind === 'packloop') {
      const buf = await BL.media.ensureSound(id);
      if (buf) E.previewBuffer(buf, 0, Math.min(buf.duration, 8));
    } else if (kind === 'inst') {
      const inst = BL.sounds.INSTRUMENTS[id];
      E.previewNote(id, (inst.bass ? 36 : inst.base) + A.project().key, 0.6);
    } else if (kind === 'audio') {
      const buf = await BL.media.ensureAudio(id);
      if (buf) E.previewBuffer(buf, 0, Math.min(buf.duration, 10));
    } else if (kind === 'disk') {
      const buf = await A.diskBuffer(id);
      if (buf) E.previewBuffer(buf, 0, Math.min(buf.duration, 10));
    } else if (kind === 'record') {
      A.openRecord(id);
    } else if (kind === 'preset') {
      A.loadPreset(id);
    } else if (kind === 'project') {
      A.openSaved(id);
    }
  }

  async function use(kind, id) {
    if (kind === 'drum' || kind === 'pack') {
      if (kind === 'pack') await BL.media.ensureSound(id);
      A.addChannel('drum', id);
    } else if (kind === 'inst') A.addChannel('synth', id);
    else if (kind === 'audio') BL.playlist.placeAudio(id, A.firstFreeLane(), A.project().pos || 0);
    else if (kind === 'packloop') A.openPackLoopInLab(id);
    else if (kind === 'disk') A.useDiskFile(id);
    else if (kind === 'record') A.openRecord(id);
    else if (kind === 'preset') A.loadPreset(id);
    else if (kind === 'project') A.openSaved(id);
  }

  async function del(kind, id) {
    if (kind === 'project') {
      await BL.media.deleteProject(id);
      A.toast('Project deleted from this computer.');
      refreshProjects();
    }
  }

  BL.browser = { init, render, refreshProjects };
})(typeof window !== 'undefined' ? window : globalThis);
