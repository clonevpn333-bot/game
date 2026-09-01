#!/usr/bin/env node
/**
 * Single-file distribution build.
 *
 * Packs the shell, the catalog, the thumbnails and every game bundle into one
 * HTML file that runs from `file://`, an email attachment, or any host that
 * can serve a single page. The launcher populates its iframe from `srcdoc`
 * instead of a URL; everything else — sandbox flags, the handshake, saves,
 * teardown — is the same code path as the hosted portal.
 *
 * What it gives up: the service worker, so no precache and no versioned bundle
 * cache. There is nothing to cache — the whole library is already in the page.
 *
 *   node tools/build-single.mjs
 *     dist/portal.html           complete standalone document
 *     dist/portal-artifact.html  body-only, for hosts that supply their own shell
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const OUT_DIR = 'dist';
mkdirSync(OUT_DIR, { recursive: true });

// --- module bundling ------------------------------------------------------
// The shell is written as ES modules but a single file cannot serve them:
// data: and blob: module URLs are blocked by any strict CSP. Each module is
// wrapped in an IIFE returning its exports, and import statements become
// references to those objects — which is what a module namespace is anyway.

const MODULE_ORDER = ['capabilities', 'storage', 'router', 'catalog', 'launcher', 'views', 'shell'];

function collectExports(src) {
  const names = new Set();
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(m[1]);
  }
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (name) names.add(name);
    }
  }
  return [...names];
}

function transform(name, src) {
  const exports = collectExports(src);

  let body = src
    // `import * as x from './y.js'` -> `const x = __m_y;`
    .replace(/^import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+['"]\.\/([\w-]+)\.js['"];?$/gm,
      (_, alias, mod) => `const ${alias} = __m_${mod};`)
    // `import { a, b } from './y.js'` -> `const { a, b } = __m_y;`
    .replace(/^import\s*\{([^}]*)\}\s*from\s+['"]\.\/([\w-]+)\.js['"];?$/gm,
      (_, names, mod) => `const {${names}} = __m_${mod};`)
    // Declarations lose the keyword; re-export statements are redundant here.
    .replace(/^export\s*\{[^}]*\}\s*;?$/gm, '')
    .replace(/^export\s+/gm, '');

  const returned = exports.length ? `\n  return { ${exports.join(', ')} };\n` : '\n  return {};\n';
  return `const __m_${name} = (function () {\n'use strict';\n${body}${returned}})();\n`;
}

const modules = MODULE_ORDER.map((name) => {
  const src = readFileSync(`portal/js/${name}.js`, 'utf8');
  const out = transform(name, src);
  const leftover = out.match(/^\s*(import|export)\s/m);
  if (leftover) throw new Error(`portal/js/${name}.js has an import/export form the packer does not handle: ${leftover[0].trim()}`);
  return out;
}).join('\n');

// --- catalog, thumbnails and bundles -------------------------------------
const manifest = JSON.parse(readFileSync('games.json', 'utf8'));
const dataUri = (file, mime) => `data:${mime};base64,${readFileSync(file).toString('base64')}`;

const bundleTags = [];
let bundleBytes = 0;
const games = manifest.games.map((g) => {
  const html = readFileSync(g.entry);
  bundleBytes += html.length;
  bundleTags.push(
    `<script type="text/plain" id="bundle-${g.id}">${html.toString('base64')}</script>`
  );
  const thumb = existsSync(g.thumbnail) ? dataUri(g.thumbnail, 'image/jpeg') : g.thumbnail;
  return { ...g, thumbnail: thumb };
});

const catalogJson = JSON.stringify({ ...manifest, games })
  // A literal </script> inside JSON would close the tag early.
  .replace(/<\/script/gi, '<\\/script');

// --- assemble -------------------------------------------------------------
const shellHtml = readFileSync('index.html', 'utf8');
const criticalCss = /<style>([\s\S]*?)<\/style>/.exec(shellHtml)[1];
const shellCss = readFileSync('portal/css/shell.css', 'utf8');
const bodyInner = /<body[^>]*>([\s\S]*?)<\/body>/.exec(shellHtml)[1]
  .replace(/\s*<script type="module"[^>]*><\/script>/, '')
  .trim();

const head = `<title>Lowspec Arcade</title>
<style>
${criticalCss.trim()}
${shellCss.trim()}
</style>`;

const tail = `
<script type="application/json" id="catalog-data">${catalogJson}</script>
${bundleTags.join('\n')}
<script>
${modules}
</script>`;

const standalone = `<!DOCTYPE html>
<html lang="en" data-route="library">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark light">
${head}
</head>
<body data-route="library">
${bodyInner}
${tail}
</body>
</html>
`;

// Hosts that wrap the file in their own <html>/<head>/<body> get the same
// content without the document scaffolding.
const embeddable = `${head}
${bodyInner}
<script>document.body.dataset.route = 'library';</script>
${tail}
`;

writeFileSync(`${OUT_DIR}/portal.html`, standalone);
writeFileSync(`${OUT_DIR}/portal-artifact.html`, embeddable);

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log(`dist/portal.html           ${kb(Buffer.byteLength(standalone))}`);
console.log(`dist/portal-artifact.html  ${kb(Buffer.byteLength(embeddable))}`);
console.log(`  shell modules ${kb(Buffer.byteLength(modules))} · ${games.length} bundles ${kb(bundleBytes)} raw`);
