// node --test test/  — checks the pure music/DSP code that the Sample Lab relies on
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const T = require('../js/theory.js');
const D = require('../js/dsp.js');
const SR = 44100;

function chordTone(midis, secs) {
  const x = new Float32Array(Math.floor(SR * secs));
  for (let i = 0; i < x.length; i++) {
    let s = 0;
    for (const m of midis) {
      const f = 440 * 2 ** ((m - 69) / 12);
      s += Math.sin((2 * Math.PI * f * i) / SR) + 0.3 * Math.sin((4 * Math.PI * f * i) / SR);
    }
    x[i] = s * 0.1;
  }
  return x;
}
function concat(parts) {
  const out = new Float32Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
// D minor: Dm  Bb  F  C
const dMinor = concat([[62, 65, 69], [58, 62, 65], [53, 57, 60], [60, 64, 67]].map((n) => chordTone(n, 1.2)));
const sameNotes = (a, b) => {
  const set = (k) => new Set(T.SCALES[k.mode === 'major' ? 'major' : 'minor'].steps.map((s) => (s + k.root) % 12));
  const A = set(a), B = set(b);
  return [...A].every((x) => B.has(x));
};

test('scale degrees map to the right semitones', () => {
  assert.equal(T.degreeToSemi(0, 'minor'), 0);
  assert.equal(T.degreeToSemi(2, 'minor'), 3);
  assert.equal(T.degreeToSemi(7, 'major'), 12);
  assert.equal(T.degreeToSemi(-1, 'minor'), -2);
  assert.equal(T.degreeToSemi(6, 'harmonicMinor'), 11);
});

test('key detection finds D minor (or its relative F major)', () => {
  const k = T.detectKey(D.chroma(dMinor, SR));
  assert.ok(sameNotes(k, { root: 2, mode: 'minor' }), JSON.stringify(k));
});

test('pitch shift keeps the length and moves the key', () => {
  const y = D.processChannel(dMinor, { speed: 1, semis: 5 });
  assert.ok(Math.abs(y.length - dMinor.length) < 64);
  const k = T.detectKey(D.chroma(y, SR));
  assert.ok(sameNotes(k, { root: 7, mode: 'minor' }), JSON.stringify(k)); // D + 5 = G
});

test('keep-pitch speed change shortens without changing the key', () => {
  const y = D.processChannel(dMinor, { speed: 1.5, keepPitch: true });
  assert.ok(Math.abs(y.length / dMinor.length - 1 / 1.5) < 0.01);
  assert.ok(sameNotes(T.detectKey(D.chroma(y, SR)), { root: 2, mode: 'minor' }));
});

test('tape speed-up raises the pitch (chipmunk)', () => {
  const y = D.processChannel(dMinor, { speed: 2 ** (7 / 12) });
  assert.ok(sameNotes(T.detectKey(D.chroma(y, SR)), { root: 9, mode: 'minor' })); // up a fifth: A minor
});

test('semitonesToKey picks the smallest move and respects relative keys', () => {
  assert.equal(T.semitonesToKey(2, 'minor', 9, 'minor'), -5);
  assert.equal(T.semitonesToKey(0, 'major', 9, 'minor'), 0); // C major = A minor's notes
  assert.equal(T.semitonesToKey(9, 'minor', 9, 'minor'), 0);
});

test('tempo detection', () => {
  const x = new Float32Array(SR * 8);
  const per = (60 / 93) * SR;
  for (let k = 0; k * per < x.length; k++) {
    const s = Math.floor(k * per);
    for (let i = 0; i < 2000 && s + i < x.length; i++) x[s + i] = Math.sin(i * 0.05) * Math.exp(-i / 300) * (k % 2 ? 0.5 : 1);
  }
  assert.ok(Math.abs(D.detectBPM(x, SR) - 93) <= 1);
});

test('WAV and ZIP encoders produce valid headers', () => {
  const wav = D.encodeWAV([new Float32Array(100), new Float32Array(100)], SR);
  assert.equal(new TextDecoder().decode(wav.slice(0, 4)), 'RIFF');
  assert.equal(wav.length, 44 + 400);
  const zip = D.makeZip([{ name: 'a.wav', bytes: wav }]);
  assert.equal(new DataView(zip.buffer).getUint32(0, true), 0x04034b50);
  assert.equal(D.crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});
