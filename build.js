#!/usr/bin/env node
/* VOLTHAVEN build: concatenates src/ modules into one self-contained HTML file. */
const fs = require('fs'), path = require('path'), cp = require('child_process');

const ROOT = __dirname, SRC = path.join(ROOT, 'src');

const ORDER = [
  '05_util.js',
  '10_core.js',
  '20_materials.js',
  '30_world.js',
  '40_chars.js',
  '50_combat.js',
  '60_ai.js',
  '70_story.js',
  '80_missions.js',
  '90_audio.js',
  '95_ui.js',
  '99_main.js',
];

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : def;
}

const outFile = arg('out', path.join(ROOT, 'volthaven.html'));
const quiet = process.argv.includes('--quiet');

const tolerant = process.argv.includes('--tolerant');
const STUBS = path.join(SRC, '.stubs');
const srcOf = {};

let failed = false;
for (const f of ORDER) {
  const p = path.join(SRC, f);
  srcOf[f] = p;
  let ok = fs.existsSync(p);
  if (ok) {
    try { cp.execSync(`node --check ${JSON.stringify(p)}`, { stdio: 'pipe' }); }
    catch (e) { ok = false; var err = (e.stderr || e.stdout || '').toString(); }
  }
  if (ok) continue;
  const stub = path.join(STUBS, f);
  if (tolerant && fs.existsSync(stub)) {
    srcOf[f] = stub;
    console.warn('WARN  ' + f + ' is broken or missing -> using stub (tolerant mode)');
  } else {
    console.error((fs.existsSync(p) ? 'SYNTAX ERROR in ' : 'MISSING ') + f + '\n' + (typeof err !== 'undefined' ? err : ''));
    failed = true;
  }
}
if (failed) process.exit(1);

const css = fs.readFileSync(path.join(SRC, '00_style.css'), 'utf8');
const bodyHtml = fs.readFileSync(path.join(SRC, '01_body.html'), 'utf8');

let js = '';
let lineMap = [];
let lineNo = 1;
for (const f of ORDER) {
  const code = fs.readFileSync(srcOf[f], 'utf8');
  const header = `\n/* ==================== ${f} ==================== */\n`;
  js += header + code + '\n';
  lineMap.push({ file: f, start: lineNo });
  lineNo += header.split('\n').length - 1 + code.split('\n').length;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>VOLTHAVEN</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<style>
${css}
</style>
</head>
<body>
${bodyHtml}
<script>
/* VOLTHAVEN - all systems generated in code. Source module map:
${lineMap.map(m => ' * ' + m.file).join('\n')}
 */
(function(){
'use strict';
${js}
})();
</script>
</body>
</html>
`;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, html);

// Mirror to the requested deliverable location (best effort).
if (outFile === path.join(ROOT, 'volthaven.html')) {
  try {
    fs.mkdirSync('/mnt/user-data/outputs', { recursive: true });
    fs.writeFileSync('/mnt/user-data/outputs/volthaven.html', html);
  } catch (e) { /* non-fatal */ }
}

if (!quiet) {
  const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
  console.log(`built ${outFile}  (${kb} KB, ${lineNo} lines of JS)`);
}
