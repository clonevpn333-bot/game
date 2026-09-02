#!/usr/bin/env node
/**
 * CI budgets (§4, Phase 4). Fails the build when the shell outgrows its
 * transfer budget, a bundle outgrows its declared budget, or the portal starts
 * hardcoding knowledge about individual games.
 *
 *   node tools/check-budgets.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const SHELL_FILES = [
  'index.html', 'arcade.html', 'portal/css/shell.css', 'manifest.webmanifest', 'games.json',
  ...readdirSync('portal/js').filter((f) => f.endsWith('.js')).map((f) => join('portal/js', f)),
];
const SHELL_TARGET_KB = 150;
const SHELL_FAIL_KB = 250;
const THUMB_FAIL_KB = 80;

const problems = [];
const notes = [];

// --- shell transfer budget ------------------------------------------------
let raw = 0, gz = 0;
for (const f of SHELL_FILES) {
  const buf = readFileSync(f);
  raw += buf.length;
  gz += gzipSync(buf, { level: 9 }).length;
}
const gzKB = gz / 1024;
notes.push(`shell: ${(raw / 1024).toFixed(1)} KB raw, ${gzKB.toFixed(1)} KB gzipped (target ${SHELL_TARGET_KB}, fail ${SHELL_FAIL_KB})`);
if (gzKB > SHELL_FAIL_KB) problems.push(`shell transfer ${gzKB.toFixed(1)} KB gzipped is over the ${SHELL_FAIL_KB} KB fail threshold`);
else if (gzKB > SHELL_TARGET_KB) notes.push(`  warning: shell is over its ${SHELL_TARGET_KB} KB target`);

// --- per-bundle budgets ---------------------------------------------------
const manifest = JSON.parse(readFileSync('games.json', 'utf8'));
for (const g of manifest.games) {
  const kb = g.bytes / 1024;
  notes.push(`${g.id}: ${kb.toFixed(1)} KB (${(g.gzipBytes / 1024).toFixed(1)} KB gz)` +
    (g.budgetKB ? ` / budget ${g.budgetKB} KB` : ' / no declared budget'));
  if (g.budgetKB && kb > g.budgetKB) problems.push(`${g.id} bundle is ${kb.toFixed(1)} KB, over its ${g.budgetKB} KB budget`);
  if (!g.budgetKB) problems.push(`${g.id} declares no budgetKB in src/games/${g.id}/game.json`);

  try {
    const thumbKB = statSync(g.thumbnail).size / 1024;
    if (thumbKB > THUMB_FAIL_KB) problems.push(`${g.id} thumbnail is ${thumbKB.toFixed(1)} KB, over ${THUMB_FAIL_KB} KB`);
  } catch {
    problems.push(`${g.id} thumbnail missing: ${g.thumbnail} (run tools/gen-thumbs.mjs)`);
  }
}

// --- the portal must stay manifest-driven ---------------------------------
// "Adding a game = one HTML file + one manifest entry, zero portal changes."
const portalSources = readdirSync('portal/js').map((f) => ({ f, src: readFileSync(join('portal/js', f), 'utf8') }));
for (const g of manifest.games) {
  for (const { f, src } of portalSources) {
    if (src.includes(`'${g.id}'`) || src.includes(`"${g.id}"`)) {
      // views.js names the pointer-lock probe on purpose: it is portal
      // diagnostics UI, not a game the catalog is expected to describe.
      if (f === 'views.js' && g.id === 'pointer-lock-probe') continue;
      problems.push(`portal/js/${f} hardcodes the game id "${g.id}" — the portal must stay manifest-driven`);
    }
  }
}

// --- service worker precache must match the shell -------------------------
const sw = readFileSync('sw.js', 'utf8');
for (const f of SHELL_FILES) {
  if (f === 'games.json') continue;                    // network-first, not precached
  if (!sw.includes(`'${f}'`)) problems.push(`sw.js does not precache ${f}`);
}

console.log(notes.join('\n'));
if (problems.length) {
  console.error('\nBudget problems:');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('\nAll budgets satisfied.');
