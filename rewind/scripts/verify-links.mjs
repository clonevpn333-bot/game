#!/usr/bin/env node
// Checks every library entry against TikTok's public oEmbed endpoint and records the result.
//   node scripts/verify-links.mjs            # check everything, write results
//   node scripts/verify-links.mjs --dry      # report only
//   node scripts/verify-links.mjs --only=unverified
// "verified" = oEmbed says the post exists publicly. It does NOT prove audio plays in your browser;
// use the in-app Health panel + scripts/apply-health.mjs to record real playback.
import { core, readLib, writeLib, rebuild, checkOembed } from './lib.mjs';
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const lib = readLib();
const targets = lib.videos.filter((v) => !args.only || v.status === args.only);
const today = new Date().toISOString().slice(0, 10);
let i = 0; const tally = { ok: 0, gone: 0, unknown: 0 };
async function worker() {
  while (i < targets.length) {
    const v = targets[i++];
    const r = await checkOembed(v);
    tally[r.state]++;
    if (r.state === 'ok') {
      v.status = 'verified'; v.lastChecked = today;
      if (r.author && r.author !== v.creator) { console.log(`  ${v.id}: creator ${v.creator ?? '(none)'} -> ${r.author}`); v.creator = r.author; }
      if (r.title && (!v.title || v.title.length < 3)) v.title = r.title.slice(0, 90);
    } else if (r.state === 'gone') { v.status = 'broken'; v.lastChecked = today; }
    console.log(`${r.state.padEnd(7)} ${v.id} ${v.creator ? '@' + v.creator : ''} ${r.reason || r.http || ''}`);
    await new Promise((r) => setTimeout(r, 250));
  }
}
await Promise.all(Array.from({ length: 3 }, worker));
console.log(`\nverified ${tally.ok} · gone ${tally.gone} · inconclusive ${tally.unknown} (left unchanged)`);
if (tally.unknown === targets.length && targets.length) console.log('Every check was inconclusive: this network probably cannot reach tiktok.com. Nothing was changed.');
else if (!args.dry) { writeLib(lib); rebuild(); }
