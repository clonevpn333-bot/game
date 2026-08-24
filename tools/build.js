#!/usr/bin/env node
/*
 * build.js — concatenates src/*.js and src/shell.html into the single
 * self-contained deliverable, minecraft.html.
 *
 * Modules whose filename starts with "s_" are "shared": they must be free of
 * DOM access at load time, because they are emitted TWICE — once into the main
 * thread bundle and once into an inert <script type="text/js-worker"> block
 * that the runtime turns into a Blob-URL Worker for terrain generation.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.js')).sort();
const shared = files.filter(f => /^\d+_s_/.test(f));

function read(f) { return fs.readFileSync(path.join(SRC, f), 'utf8'); }
function banner(f) { return '\n/* ============================ ' + f + ' ============================ */\n'; }

const mainBundle = files.map(f => banner(f) + read(f)).join('\n');
const workerBundle = shared.map(f => banner(f) + read(f)).join('\n') +
  '\n' + read('worker_glue.txt');

const css = fs.readFileSync(path.join(SRC, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(SRC, 'body.html'), 'utf8');

const out = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>Voxelcraft</title>
<style>
${css}
</style>
</head>
<body>
${html}
<script type="text/js-worker" id="worker-src">
${workerBundle}
<\/script>
<script>
${mainBundle}
<\/script>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'minecraft.html'), out);
const kb = (Buffer.byteLength(out) / 1024).toFixed(1);
console.log('built minecraft.html  ' + kb + ' KB   (' + files.length + ' modules, ' + shared.length + ' shared)');
