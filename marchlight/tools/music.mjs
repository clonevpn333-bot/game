// Offline score renderer: node tools/music.mjs [cue ...] [--secs N]
// Renders each cue with OfflineAudioContext in headless Chromium, writes WAV + MP3 + a spectrogram
// PNG to the scratchpad (OUT), and prints peak / loudness per 5 s so levels can be checked by eye.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const args = process.argv.slice(2); let secs = 40; const names = [];
for (let i = 0; i < args.length; i++) { if (args[i] === '--secs') secs = parseFloat(args[++i]); else names.push(args[i]); }
const out = process.env.OUT || '/tmp/claude-0/-home-user-game/d07be3d3-70a3-5fb5-b77a-ef8b8d9dfbe9/scratchpad/music';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
page.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.goto((process.env.BASE || 'http://localhost:8080') + '/dev/music.html');
await page.waitForFunction(() => window.renderCue);
const list = names.length ? names : await page.evaluate(() => window.CUES);
for (const name of list) {
  const r = await page.evaluate(([n, s]) => window.renderCue(n, s), [name, name.startsWith('sting:') ? 8 : secs]);
  const pcm = Buffer.from(r.b64, 'base64'), sr = r.sr;
  const hdr = Buffer.alloc(44); hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(sr, 24); hdr.writeUInt32LE(sr * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
  const base = path.join(out, name.replace(':', '_')); fs.writeFileSync(base + '.wav', Buffer.concat([hdr, pcm]));
  // loudness per 5 s window (RMS dBFS) to see the arc of the cue
  const s16 = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2), win = sr * 5 * 2, arc = [];
  for (let i = 0; i < s16.length; i += win) { let acc = 0, c = 0; for (let j = i; j < Math.min(s16.length, i + win); j++) { const v = s16[j] / 32768; acc += v * v; c++; } arc.push((10 * Math.log10(acc / c + 1e-12)).toFixed(0)); }
  console.log(`${name.padEnd(12)} peak ${r.peak.toFixed(2)} clip ${r.clip} sched ${r.sched.toFixed(0)}ms render ${(r.render / 1000).toFixed(1)}s  rms/5s: ${arc.join(' ')}`);
  try {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', base + '.wav', '-codec:a', 'libmp3lame', '-b:a', '160k', base + '.mp3']);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', base + '.wav', '-lavfi', 'showspectrumpic=s=1200x300:legend=0:scale=log:fscale=log', base + '.png']);
  } catch (e) { console.log('ffmpeg failed', e.message); }
}
await browser.close();
