#!/usr/bin/env node
/**
 * Bundle builder — §1.4 "Each game is one self-contained HTML file".
 *
 * Reads src/games/<id>/{game.json,index.html}, inlines every local <script src>
 * and <link rel=stylesheet> (including the shared modules in src/engine/),
 * writes games/<id>.html, and regenerates games.json with a content hash per
 * bundle so the service worker can cache-first on a versioned URL.
 *
 * Deterministic: same inputs -> byte-identical outputs, so CI can assert the
 * committed bundles match their sources.
 *
 *   node tools/build.mjs [--check]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_GAMES = join(ROOT, 'src', 'games');
const OUT_GAMES = join(ROOT, 'games');
const MANIFEST = join(ROOT, 'games.json');
const CHECK = process.argv.includes('--check');

const TIERS = ['canvas2d', 'webgl1', 'webgl2'];
const REQUIRED = ['id', 'title', 'minRendererTier', 'estMemoryMB', 'version'];

const problems = [];
const fail = (m) => problems.push(m);

/** Inline <script src> / <link rel=stylesheet> for local paths only. */
function inline(html, baseDir) {
    const seen = [];

    html = html.replace(
        /[ \t]*<link\b[^>]*rel=["']stylesheet["'][^>]*>[ \t]*\n?/gi,
        (tag) => {
            const m = /href=["']([^"']+)["']/i.exec(tag);
            if (!m || /^(https?:)?\/\//.test(m[1]) || m[1].startsWith('data:')) return tag;
            const file = resolve(baseDir, m[1]);
            if (!existsSync(file)) { fail(`missing stylesheet ${m[1]} referenced from ${relative(ROOT, baseDir)}`); return tag; }
            seen.push(relative(ROOT, file));
            const css = readFileSync(file, 'utf8').replace(/<\/style/gi, '<\\/style');
            return `<style>\n/* inlined from ${m[1]} */\n${css.trim()}\n</style>\n`;
        }
    );

    html = html.replace(
        /[ \t]*<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)><\/script>[ \t]*\n?/gi,
        (tag, pre, src, post) => {
            if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) return tag;
            const file = resolve(baseDir, src);
            if (!existsSync(file)) { fail(`missing script ${src} referenced from ${relative(ROOT, baseDir)}`); return tag; }
            seen.push(relative(ROOT, file));
            // A literal </script> inside a string would close the tag early.
            const js = readFileSync(file, 'utf8').replace(/<\/script/gi, '<\\/script');
            const attrs = (pre + post).replace(/\s*\b(defer|async)\b/gi, '').trim();
            return `<script${attrs ? ' ' + attrs : ''}>\n/* inlined from ${src} */\n${js.trim()}\n</script>\n`;
        }
    );

    return { html, seen };
}

/**
 * Scripts injected into a prebuilt bundle, in order. They go at the very top of
 * <head> so the shim's patches (devicePixelRatio, requestAnimationFrame,
 * getContext) are in place before any game code runs.
 */
const SHIM_SCRIPTS = ['teardown.js', 'bridge.js', 'shim.js'];

function injectShim(html, sources) {
    let payload = '';
    for (const name of SHIM_SCRIPTS) {
        const file = join(ROOT, 'src', 'engine', name);
        sources.push(`src/engine/${name}`);
        const js = readFileSync(file, 'utf8').replace(/<\/script/gi, '<\\/script');
        payload += `<script>\n/* portal shim: ${name} */\n${js.trim()}\n</script>\n`;
    }
    if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + '\n' + payload);
    if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + '\n<head>' + payload + '</head>');
    return payload + html;
}

/**
 * Replace an import map's remote entries with inlined data: modules.
 *
 * A single-file bundle that still fetches its engine from a CDN is not really
 * self-contained: it breaks offline, and it breaks anywhere that CDN is
 * blocked. Data-URL modules are resolved by the browser's own module loader,
 * so the game's `import * as THREE from 'three'` keeps working untouched.
 */
function inlineImportMap(html, mapping, sources) {
    return html.replace(/<script type="importmap"[^>]*>([\s\S]*?)<\/script>/i, (tag, body) => {
        let map;
        try { map = JSON.parse(body); } catch { fail('unparseable importmap'); return tag; }
        for (const [spec, file] of Object.entries(mapping)) {
            const abs = join(ROOT, file);
            if (!existsSync(abs)) { fail(`importmap vendor file missing: ${file}`); continue; }
            sources.push(file);
            const b64 = readFileSync(abs).toString('base64');
            map.imports = map.imports || {};
            map.imports[spec] = `data:text/javascript;base64,${b64}`;
        }
        return `<script type="importmap">${JSON.stringify(map)}</script>`;
    });
}

function buildGame(id) {
    const dir = join(SRC_GAMES, id);
    const metaPath = join(dir, 'game.json');
    if (!existsSync(metaPath)) { fail(`${id}: no game.json`); return null; }
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'));

    // A prebuilt bundle arrives already self-contained (imported from the hub);
    // it is copied through verbatim rather than assembled from parts.
    const htmlPath = join(dir, meta.prebuilt ? 'bundle.html' : 'index.html');
    if (!existsSync(htmlPath)) { fail(`${id}: no ${meta.prebuilt ? 'bundle.html' : 'index.html'}`); return null; }
    for (const k of REQUIRED) if (meta[k] === undefined) fail(`${id}: game.json missing "${k}"`);
    if (meta.id !== id) fail(`${id}: game.json id "${meta.id}" does not match directory name`);
    if (!TIERS.includes(meta.minRendererTier)) fail(`${id}: minRendererTier must be one of ${TIERS.join(', ')}`);

    let html, seen;
    if (meta.prebuilt) {
        html = readFileSync(htmlPath, 'utf8');
        seen = [`src/games/${id}/bundle.html`];
        if (meta.inlineImportMap) html = inlineImportMap(html, meta.inlineImportMap, seen);
        if (meta.shim !== false) html = injectShim(html, seen);
    } else {
        ({ html, seen } = inline(readFileSync(htmlPath, 'utf8'), dir));
    }
    const out = meta.prebuilt ? html : html.replace(/\n{3,}/g, '\n\n');
    const buf = Buffer.from(out, 'utf8');
    const hash = createHash('sha256').update(buf).digest('hex').slice(0, 10);
    const gzip = gzipSync(buf, { level: 9 }).length;

    const outPath = join(OUT_GAMES, `${id}.html`);
    const prev = existsSync(outPath) ? readFileSync(outPath) : null;
    const changed = !prev || !prev.equals(buf);
    if (changed) {
        if (CHECK) fail(`${id}: games/${id}.html is stale — run "node tools/build.mjs"`);
        else writeFileSync(outPath, buf);
    }

    const entry = {
        id: meta.id,
        title: meta.title,
        tagline: meta.tagline || '',
        description: meta.description || '',
        entry: `games/${id}.html`,
        version: meta.version,
        hash,
        bytes: buf.length,
        gzipBytes: gzip,
        minRendererTier: meta.minRendererTier,
        estMemoryMB: meta.estMemoryMB,
        pointerLock: !!meta.pointerLock,
        // Games carrying an `art` record get a generated SVG poster; the rest
        // use a captured screenshot. Guessing wrong here is what shipped a
        // library of broken images, so the file is verified below.
        thumbnail: meta.thumbnail || `portal/thumbs/${id}.${meta.art ? 'svg' : 'jpg'}`,
        controls: meta.controls || [],
        tags: meta.tags || [],
        hidden: !!meta.hidden,
        saves: meta.saves !== false,
        category: meta.category || 'action',
        players: meta.players || '1 player',
        duration: meta.duration || '',
        added: meta.added || '',
        featured: !!meta.featured,
        spotlight: !!meta.spotlight,
        art: meta.art || null,
        prebuilt: !!meta.prebuilt,
    };
    if (!existsSync(join(ROOT, entry.thumbnail))) {
        fail(`${id}: thumbnail missing at ${entry.thumbnail} — run "node tools/gen-art.mjs"` +
             ` (generated art) or "node tools/gen-thumbs.mjs ${id}" (screenshot)`);
    }
    if (meta.budgetKB) {
        entry.budgetKB = meta.budgetKB;
        if (buf.length / 1024 > meta.budgetKB) {
            fail(`${id}: bundle is ${(buf.length / 1024).toFixed(1)} KB, over its ${meta.budgetKB} KB budget`);
        }
    }
    return { entry, sources: seen, changed };
}

const ids = existsSync(SRC_GAMES)
    ? readdirSync(SRC_GAMES).filter((d) => statSync(join(SRC_GAMES, d)).isDirectory()).sort()
    : [];

const built = [];
for (const id of ids) {
    const r = buildGame(id);
    if (r) built.push(r);
}

// --- stamp the service worker with a hash of the shell it precaches -------
// A shell change must invalidate the shell cache; a game change must not.
const SW_PATH = join(ROOT, 'sw.js');
let swText = readFileSync(SW_PATH, 'utf8');
const shellList = /const SHELL_ASSETS = \[([\s\S]*?)\];/.exec(swText);
if (!shellList) fail('sw.js: could not find SHELL_ASSETS');
else {
    const files = [...shellList[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((f) => f !== './');
    const h = createHash('sha256');
    for (const f of files.sort()) {
        const abs = join(ROOT, f);
        if (!existsSync(abs)) { fail(`sw.js precaches ${f}, which does not exist`); continue; }
        h.update(f).update(readFileSync(abs));
    }
    const shellHash = h.digest('hex').slice(0, 10);
    const stamped = swText.replace(/const SHELL_VERSION = '[^']*';/, `const SHELL_VERSION = '${shellHash}';`);
    if (stamped !== swText) {
        if (CHECK) fail('sw.js SHELL_VERSION is stale — run "node tools/build.mjs"');
        else { writeFileSync(SW_PATH, stamped); swText = stamped; }
    }
    console.log(`shell ${shellHash} (${files.length} precached assets)`);
}

const manifest = {
    schemaVersion: 1,
    protocol: 1,
    generatedBy: 'tools/build.mjs',
    games: built.map((b) => b.entry),
};
const manifestText = JSON.stringify(manifest, null, 2) + '\n';
const prevManifest = existsSync(MANIFEST) ? readFileSync(MANIFEST, 'utf8') : '';
if (manifestText !== prevManifest) {
    if (CHECK) fail('games.json is stale — run "node tools/build.mjs"');
    else writeFileSync(MANIFEST, manifestText);
}

for (const b of built) {
    const e = b.entry;
    const mark = b.changed ? (CHECK ? 'STALE' : 'built') : 'clean';
    console.log(
        `${mark.padEnd(5)} ${e.id.padEnd(18)} ${(e.bytes / 1024).toFixed(1).padStart(7)} KB` +
        ` (${(e.gzipBytes / 1024).toFixed(1)} KB gz)  tier=${e.minRendererTier.padEnd(8)}` +
        ` est=${String(e.estMemoryMB).padStart(3)}MB  ${e.hash}  <- ${b.sources.length} source files`
    );
}

if (problems.length) {
    console.error('\nBuild problems:');
    for (const p of problems) console.error('  - ' + p);
    process.exit(1);
}
console.log(`\n${built.length} bundle(s), manifest ${CHECK ? 'verified' : 'written'}: games.json`);
