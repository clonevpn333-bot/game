#!/usr/bin/env node
/* =============================================================
 * Breachpoint build — concatenates src/ into a single index.html
 *
 *   node build.js
 *
 * Sources live in src/ for readability; the shipped artefact is one
 * self-contained file with no external requests of any kind.
 * ============================================================= */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const OUT = path.join(__dirname, 'index.html');

const order = fs.readdirSync(SRC)
  .filter(f => f.endsWith('.js'))
  .sort();

const css = fs.readFileSync(path.join(SRC, 'style.css'), 'utf8');

let js = '';
for (const f of order) {
  const body = fs.readFileSync(path.join(SRC, f), 'utf8');
  js += '\n/* ===== ' + f + ' ===== */\n' + body;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b0e13">
<meta name="description" content="Breachpoint — a browser-based 5v5 tactical shooter. Bomb defusal, buy phase, recoil patterns, bots and peer-to-peer multiplayer. No downloads, no plugins.">
<title>Breachpoint — 5v5 Tactical FPS</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%230b0e13'/%3E%3Cpath d='M16 5v22M5 16h22' stroke='%23ff7a2f' stroke-width='2.5'/%3E%3Ccircle cx='16' cy='16' r='7' fill='none' stroke='%2339ff6a' stroke-width='2'/%3E%3C/svg%3E">
<style>
${css}
</style>
</head>
<body>

<canvas id="gl"></canvas>

<div id="loading">
  <div class="logo">Breachpoint</div>
  <div class="bar"><i id="loadBar"></i></div>
  <div class="status" id="loadStatus">Loading</div>
  <div class="tip" id="loadTip">Attackers plant, defenders defuse. Stand still to shoot straight —
    movement wrecks your accuracy, and every rifle has a spray pattern worth learning.</div>
</div>

<div id="ui"></div>

<noscript>
  <div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
    background:#0b0e13;color:#e7edf5;font-family:system-ui;text-align:center;padding:24px">
    Breachpoint needs JavaScript enabled.
  </div>
</noscript>

<script>
${js}
</script>
</body>
</html>
`;

fs.writeFileSync(OUT, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log('Built index.html — ' + kb + ' KB from ' + order.length + ' modules');
for (const f of order) {
  const size = (fs.statSync(path.join(SRC, f)).size / 1024).toFixed(1);
  console.log('  ' + f.padEnd(16) + size + ' KB');
}
