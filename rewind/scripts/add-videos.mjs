#!/usr/bin/env node
// Add real TikTok posts to the library.
//   node scripts/add-videos.mjs URL [URL ...] [--tags=memes,viral-chaos] [--sound="Name – Artist"] [--provenance=https://...] [--offline]
//   node scripts/add-videos.mjs --file=urls.txt --tags=cozy
// Every URL is parsed, the upload date is decoded from the ID and must fall in 2020 or Sep–Dec 2023.
// Unless --offline, oEmbed fills in creator/title. New entries are "verified" only if oEmbed confirmed them.
import { readFileSync } from 'node:fs';
import { core, readLib, writeLib, rebuild, checkOembed } from './lib.mjs';
const argv = process.argv.slice(2);
const flags = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split(/=(.*)/s).slice(0, 2)).map(([k, v]) => [k, v ?? true]));
let urls = argv.filter((a) => !a.startsWith('--'));
if (flags.file) urls.push(...readFileSync(flags.file, 'utf8').split(/\s+/).filter(Boolean));
if (!urls.length) { console.error('Usage: add-videos.mjs <tiktok urls...> [--tags=a,b] [--sound=..] [--provenance=url] [--offline]'); process.exit(1); }
const lib = readLib(); const have = new Set(lib.videos.map((v) => v.id));
const today = new Date().toISOString().slice(0, 10);
let added = 0;
for (const u of urls) {
  const p = core.parseTikTokUrl(u);
  if (p.error) { console.log(`skip  ${u}  (${p.error})`); continue; }
  if (have.has(p.id)) { console.log(`dupe  ${p.id}`); continue; }
  const date = core.dateFromId(p.id);
  if (!date || !core.inScope(date)) { console.log(`skip  ${p.id}  (uploaded ${date}, outside 2020 / Sep–Dec 2023)`); continue; }
  const v = { id: p.id, creator: p.creator, title: flags.title || 'Untitled post', date, trends: String(flags.tags || '').split(',').filter(Boolean),
    sound: flags.sound || null, status: 'unverified', lastChecked: null, provenance: flags.provenance || null, dateSource: 'tiktok-id' };
  if (!flags.offline) {
    const r = await checkOembed(v);
    if (r.state === 'ok') { v.status = 'verified'; v.lastChecked = today; v.creator = r.author || v.creator; if (r.title && !flags.title) v.title = r.title.slice(0, 90); }
    else if (r.state === 'gone') { console.log(`skip  ${p.id}  (TikTok reports it is gone: HTTP ${r.http})`); continue; }
    else console.log(`note  ${p.id}  oEmbed inconclusive (${r.reason}); adding as unverified`);
  }
  lib.videos.push(v); have.add(v.id); added++;
  console.log(`add   ${p.id}  ${date}  ${v.status}  @${v.creator ?? '?'}`);
}
if (added) { writeLib(lib); rebuild(); } else console.log('Nothing added.');
