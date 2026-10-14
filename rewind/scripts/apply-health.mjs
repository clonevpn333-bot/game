#!/usr/bin/env node
// Merge the playback results exported from the app (Health panel -> "Export results") into the library.
//   node scripts/apply-health.mjs ~/Downloads/rewind-health.json
// ok     -> status "verified" + playback "ok" (it actually played in a real browser)
// invalid (TikTok error 1001) -> status "broken"
// timeouts / other errors are transient and are NOT written.
import { readFileSync } from 'node:fs';
import { readLib, writeLib, rebuild } from './lib.mjs';
const file = process.argv[2];
if (!file) { console.error('Usage: apply-health.mjs rewind-health.json'); process.exit(1); }
const health = JSON.parse(readFileSync(file, 'utf8')).results || {};
const lib = readLib(); let n = 0;
for (const v of lib.videos) {
  const h = health[v.id]; if (!h) continue;
  const day = (h.at || new Date().toISOString()).slice(0, 10);
  if (h.state === 'ok' && (v.status !== 'verified' || v.playback !== 'ok')) { v.status = 'verified'; v.lastChecked = v.lastChecked || day; v.playback = 'ok'; v.playbackChecked = day; n++; }
  else if ((h.state === 'broken' || h.state === 'error') && h.kind === 'invalid' && v.status !== 'broken') { v.status = 'broken'; v.lastChecked = day; n++; }
}
console.log(`Updated ${n} entries.`); if (n) { writeLib(lib); rebuild(); }
