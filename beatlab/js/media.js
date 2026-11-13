/* BeatLab — your stuff: uploaded audio tracks, imported sound packs and the saved-projects library.
 * Everything lives in IndexedDB on this computer (with an in-memory fallback). */
(function (root) {
  const BL = (root.BL = root.BL || {});
  const STORES = ['samples', 'files', 'packs', 'projects'];
  const AUDIO_EXT = /\.(wav|wave|mp3|aif|aiff|flac|ogg|oga|m4a|aac|caf|webm)$/i;

  // ---------- key/value store ----------
  const mem = {};
  STORES.forEach((s) => { mem[s] = new Map(); });
  let dbp = null;
  function db() {
    if (!dbp) {
      dbp = new Promise((res) => {
        try {
          const r = indexedDB.open('beatlab', 2);
          r.onupgradeneeded = () => STORES.forEach((s) => { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s); });
          r.onsuccess = () => res(r.result);
          r.onerror = () => res(null);
          r.onblocked = () => res(null);
        } catch (e) { res(null); }
      });
    }
    return dbp;
  }
  const store = {
    async put(s, k, v) {
      mem[s].set(k, v);
      const d = await db();
      if (!d) return;
      try { await new Promise((res, rej) => { const tx = d.transaction(s, 'readwrite'); tx.objectStore(s).put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); } catch (e) { /* keep in memory */ }
    },
    async get(s, k) {
      if (mem[s].has(k)) return mem[s].get(k);
      const d = await db();
      if (!d) return null;
      try { return await new Promise((res, rej) => { const r = d.transaction(s).objectStore(s).get(k); r.onsuccess = () => res(r.result == null ? null : r.result); r.onerror = () => rej(r.error); }); } catch (e) { return null; }
    },
    async del(s, k) {
      mem[s].delete(k);
      const d = await db();
      if (!d) return;
      try { await new Promise((res) => { const tx = d.transaction(s, 'readwrite'); tx.objectStore(s).delete(k); tx.oncomplete = res; tx.onerror = res; }); } catch (e) { /* ignore */ }
    },
    async all(s) {
      const d = await db();
      const out = new Map(mem[s]);
      if (d) {
        try {
          await new Promise((res) => {
            const r = d.transaction(s).objectStore(s).openCursor();
            r.onsuccess = () => { const c = r.result; if (c) { if (!out.has(c.key)) out.set(c.key, c.value); c.continue(); } else res(); };
            r.onerror = res;
          });
        } catch (e) { /* ignore */ }
      }
      return out;
    },
  };

  // ---------- decoding ----------
  let decoder = null;
  function decodeCtx() {
    if (!decoder) decoder = new (root.OfflineAudioContext || root.webkitOfflineAudioContext)(1, 1, 44100);
    return decoder;
  }
  function decode(bytes) {
    return decodeCtx().decodeAudioData(bytes.slice(0));
  }
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // ---------- zip reading (for sound packs) ----------
  async function inflateRaw(data) {
    if (!root.DecompressionStream) throw new Error('This browser cannot open zip files. Unzip the pack and import the folder instead.');
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function unzip(buf) {
    const u8 = new Uint8Array(buf);
    const dv = new DataView(buf);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('That zip file looks damaged.');
    const count = dv.getUint16(eocd + 10, true);
    let off = dv.getUint32(eocd + 16, true);
    const out = [];
    const dec = new TextDecoder();
    for (let n = 0; n < count; n++) {
      if (dv.getUint32(off, true) !== 0x02014b50) break;
      const method = dv.getUint16(off + 10, true);
      const csize = dv.getUint32(off + 20, true);
      const nlen = dv.getUint16(off + 28, true), elen = dv.getUint16(off + 30, true), clen = dv.getUint16(off + 32, true);
      const lho = dv.getUint32(off + 42, true);
      const name = dec.decode(u8.subarray(off + 46, off + 46 + nlen));
      off += 46 + nlen + elen + clen;
      if (name.endsWith('/') || /(^|\/)(__MACOSX|\.)/.test(name) || !AUDIO_EXT.test(name)) continue;
      const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
      const data = u8.subarray(start, start + csize);
      out.push({ name, read: async () => (method === 0 ? data.slice().buffer : (await inflateRaw(data)).buffer) });
    }
    return out;
  }

  // ---------- sound packs ----------
  const CATS = ['Kick', 'Snare', 'Clap', 'Hi-Hat', 'Open Hat', '808', 'Perc', 'FX', 'Loops'];
  function classify(path, dur) {
    const s = path.toLowerCase().replace(/[_\-.]+/g, ' ');
    if (/\bkick|\bkck|\bkik|\bbd\b|bass ?drum/.test(s)) return 'Kick';
    if (/\b808|\bsub\b|\bbass\b|reese/.test(s)) return '808';
    if (/open ?hat|\boh\b|\bohh?\b|open/.test(s)) return 'Open Hat';
    if (/hat|\bhh\b|\bhihat|\bch\b|\bchh\b/.test(s)) return 'Hi-Hat';
    if (/clap|\bclp\b|snap/.test(s)) return 'Clap';
    if (/snare|\bsnr\b|\bsd\b|\brim/.test(s)) return 'Snare';
    if (/loop|melod|\bbpm\b|\d{2,3} ?bpm|chord|piano|guitar|keys|vocal ?loop/.test(s) || dur > 3) return 'Loops';
    if (/perc|tom|conga|bongo|shaker|tamb|cowbell|bell|wood|block|click|clave|triangle/.test(s)) return 'Perc';
    if (/fx|riser|sweep|impact|crash|cymbal|ride|vox|chant|tag|transition|reverse|noise|whoosh|gun|scratch/.test(s)) return 'FX';
    return dur > 1.6 ? 'Loops' : 'Perc';
  }
  function cleanName(path) {
    return path.split('/').pop().replace(AUDIO_EXT, '').replace(/[_]+/g, ' ').trim().slice(0, 48);
  }

  const packs = []; // [{id, name, sounds:[{id, name, cat, dur}]}]
  const soundBuffers = {}; // 'u:<id>' -> AudioBuffer (also mirrored into BL.sounds.drumBuffers)
  const soundMeta = {}; // 'u:<id>' -> {name, cat, pack}

  async function loadPacks() {
    const all = await store.all('packs');
    packs.length = 0;
    [...all.values()].sort((a, b) => a.created - b.created).forEach((p) => {
      packs.push(p);
      p.sounds.forEach((s) => { soundMeta['u:' + s.id] = { name: s.name, cat: s.cat, pack: p.name, dur: s.dur }; });
    });
    return packs;
  }

  /** files: array of {name, read(): Promise<ArrayBuffer>} ; progress(n, total) */
  async function importPack(name, files, progress) {
    const pack = { id: uid('p'), name: name || 'My Pack', created: Date.now(), sounds: [] };
    let i = 0;
    for (const f of files) {
      i++;
      if (progress) progress(i, files.length);
      try {
        const bytes = await f.read();
        const buf = await decode(bytes);
        const id = uid('s');
        await store.put('files', id, bytes);
        const cat = classify(f.name, buf.duration);
        // keep the pack's own folder structure (like FL Studio's Browser shows it)
        const parts = f.name.split('/').filter(Boolean);
        const dir = parts.slice(0, -1).filter((p, i) => !(i === 0 && parts.length > 2 && p === pack.name)).join('/');
        pack.sounds.push({ id, name: cleanName(f.name), cat, dur: Math.round(buf.duration * 100) / 100, dir });
        soundBuffers['u:' + id] = buf;
        BL.sounds.drumBuffers['u:' + id] = buf;
        soundMeta['u:' + id] = { name: cleanName(f.name), cat, pack: pack.name, dur: buf.duration };
      } catch (e) { /* skip files the browser can't decode */ }
    }
    if (!pack.sounds.length) throw new Error('No playable audio was found in that pack.');
    // drop a single wrapping folder ("Pack Name/Drums/..." -> "Drums/...")
    const firsts = new Set(pack.sounds.map((x) => (x.dir || '').split('/')[0]));
    if (firsts.size === 1 && pack.sounds.every((x) => (x.dir || '').includes('/'))) pack.sounds.forEach((x) => { x.dir = x.dir.split('/').slice(1).join('/'); });
    pack.sounds.sort((a, b) => CATS.indexOf(a.cat) - CATS.indexOf(b.cat) || a.name.localeCompare(b.name));
    await store.put('packs', pack.id, pack);
    packs.push(pack);
    return pack;
  }

  /** accept a FileList / array of File objects: zips, folders or loose audio files */
  async function importPackFiles(fileList, progress) {
    const files = [...fileList];
    const entries = [];
    let name = '';
    for (const f of files) {
      if (/\.zip$/i.test(f.name)) {
        const list = await unzip(await f.arrayBuffer());
        list.forEach((e) => entries.push(e));
        name = name || f.name.replace(/\.zip$/i, '');
      } else if (AUDIO_EXT.test(f.name)) {
        const path = f.webkitRelativePath || f.name;
        entries.push({ name: path, read: () => f.arrayBuffer() });
        if (!name && f.webkitRelativePath) name = f.webkitRelativePath.split('/')[0];
      }
    }
    if (!entries.length) throw new Error('No audio files found. Packs can be a .zip, a folder, or a few WAV/MP3 files.');
    return importPack(name || (entries.length === 1 ? cleanName(entries[0].name) : 'My Pack'), entries, progress);
  }

  /** a single dropped one-shot: goes into a "Dropped Sounds" pack and returns its sound id */
  async function importSingleSound(bytes, fileName, packName) {
    const buf = await decode(bytes);
    const name = packName || 'Dropped Sounds';
    let pack = packs.find((p) => p.name === name);
    if (!pack) { pack = { id: uid('p'), name, created: Date.now(), sounds: [] }; packs.push(pack); }
    const id = uid('s');
    await store.put('files', id, bytes);
    const cat = classify(fileName, buf.duration);
    pack.sounds.push({ id, name: cleanName(fileName), cat, dur: Math.round(buf.duration * 100) / 100, dir: '' });
    await store.put('packs', pack.id, pack);
    soundBuffers['u:' + id] = buf;
    BL.sounds.drumBuffers['u:' + id] = buf;
    soundMeta['u:' + id] = { name: cleanName(fileName), cat, pack: name, dur: buf.duration };
    return 'u:' + id;
  }

  async function deletePack(id) {
    const i = packs.findIndex((p) => p.id === id);
    if (i < 0) return;
    const p = packs[i];
    packs.splice(i, 1);
    await store.del('packs', id);
    for (const s of p.sounds) { await store.del('files', s.id); delete soundMeta['u:' + s.id]; }
  }

  async function ensureSound(sid) {
    if (!sid || !sid.startsWith('u:')) return BL.sounds.drumBuffers[sid] || null;
    if (soundBuffers[sid]) return soundBuffers[sid];
    const bytes = await store.get('files', sid.slice(2));
    if (!bytes) return null;
    try {
      const buf = await decode(bytes);
      soundBuffers[sid] = buf;
      BL.sounds.drumBuffers[sid] = buf;
      return buf;
    } catch (e) { return null; }
  }

  function soundName(sid) {
    if (sid && sid.startsWith('u:')) return (soundMeta[sid] || {}).name || 'Missing sound';
    return (BL.sounds.DRUM_BY_ID[sid] || {}).name || sid;
  }
  function soundCat(sid) {
    if (sid && sid.startsWith('u:')) return (soundMeta[sid] || {}).cat || 'Perc';
    return (BL.sounds.DRUM_BY_ID[sid] || {}).cat || 'Perc';
  }

  // ---------- audio tracks (full songs, vocals, stems) ----------
  const audioBuffers = {}; // id -> AudioBuffer
  async function importAudio(file) {
    const bytes = await file.arrayBuffer();
    const buf = await decode(bytes); // throws if not audio
    const id = uid('a');
    await store.put('files', id, bytes);
    audioBuffers[id] = buf;
    return { id, name: cleanName(file.name), duration: buf.duration };
  }
  async function importAudioBytes(bytes, name) {
    const buf = await decode(bytes);
    const id = uid('a');
    await store.put('files', id, bytes);
    audioBuffers[id] = buf;
    return { id, name, duration: buf.duration };
  }
  async function ensureAudio(id) {
    if (audioBuffers[id]) return audioBuffers[id];
    const bytes = await store.get('files', id);
    if (!bytes) return null;
    try { audioBuffers[id] = await decode(bytes); } catch (e) { return null; }
    return audioBuffers[id];
  }

  // ---------- project library ----------
  async function listProjects() {
    const all = await store.all('projects');
    return [...all.values()].map((p) => ({ id: p.id, name: p.name, updated: p.updated, bpm: p.bpm, key: p.key })).sort((a, b) => b.updated - a.updated);
  }
  async function saveProject(project) {
    if (!project.libId) project.libId = uid('j');
    const rec = { id: project.libId, name: project.name, updated: Date.now(), bpm: project.bpm, key: project.key, data: JSON.stringify(project) };
    await store.put('projects', rec.id, rec);
    return rec;
  }
  async function loadProject(id) {
    const rec = await store.get('projects', id);
    return rec ? JSON.parse(rec.data) : null;
  }
  async function deleteProject(id) { await store.del('projects', id); }

  BL.media = {
    store, decode, unzip, classify, CATS, AUDIO_EXT,
    packs, loadPacks, importPack, importPackFiles, importSingleSound, deletePack, ensureSound, soundName, soundCat, soundMeta,
    importAudio, importAudioBytes, ensureAudio, audioBuffer: (id) => audioBuffers[id] || null,
    listProjects, saveProject, loadProject, deleteProject,
  };
})(typeof window !== 'undefined' ? window : globalThis);
