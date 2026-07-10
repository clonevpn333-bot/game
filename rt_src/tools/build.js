#!/usr/bin/env node
/* Assemble rolling_thunder.html from rt_src/parts/*.js + template.html.
 * Runs node --check on the concatenated JS before writing the HTML.
 * Usage: node rt_src/tools/build.js [--out <path>]
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const PARTS_DIR = path.join(ROOT, 'rt_src', 'parts');
const TEMPLATE = path.join(ROOT, 'rt_src', 'template.html');
const OUT = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : path.join(ROOT, 'rolling_thunder.html');

const parts = fs.readdirSync(PARTS_DIR).filter(f => f.endsWith('.js')).sort();
if (!parts.length) { console.error('no parts found'); process.exit(1); }

let js = '"use strict";\n(function(){\n';
for (const p of parts) {
  const body = fs.readFileSync(path.join(PARTS_DIR, p), 'utf8');
  js += `\n/* ==================== ${p} ==================== */\n` + body + '\n';
}
js += '\n})();\n';

if (js.includes('</scr' + 'ipt>')) {
  console.error('BUILD FAIL: game JS contains a closing script tag literal');
  process.exit(1);
}

const tmp = path.join(require('os').tmpdir(), 'rt_check_' + process.pid + '.js');
fs.writeFileSync(tmp, js);
const res = cp.spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
if (res.status !== 0) {
  console.error('SYNTAX CHECK FAILED:\n' + res.stderr);
  process.exit(1);
}
fs.unlinkSync(tmp);

const template = fs.readFileSync(TEMPLATE, 'utf8');
const marker = '/*__GAME_JS__*/';
if (!template.includes(marker)) { console.error('template missing marker'); process.exit(1); }
const html = template.split(marker).join(js);
fs.writeFileSync(OUT, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`BUILD OK -> ${OUT} (${kb} KB, ${parts.length} parts, syntax clean)`);
