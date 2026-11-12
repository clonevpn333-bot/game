# BeatLab — make a beat in 10 seconds

A beat maker in the spirit of FL Studio, built so you can use it the first time you open it.
It runs in the browser with nothing to install: every drum, instrument and sample is synthesized in code, so it works offline.

```bash
cd beatlab
npm start            # http://localhost:5174   (Node 18+, no install needed)
```

You can also double-click `index.html`, or run `npm run build` to get one self-contained file at `dist/beatlab.html`.

## What's in the box

| | |
|---|---|
| **12 ready-made beats** | Chipmunk Soul, Rage, Dark Trap, Drill, 90s Boom Bap, Lo-Fi Study, Pluggnb, Pain Piano, Sunday Gospel, Jersey Club, Afrobeats, Villain Strings. Search by vibe or "type beat" tags (Kanye-type, Yeat-type, Carti-type, Future-type, Pop Smoke-type…). Each one loads and starts playing. |
| **38 drum sounds** | 7 kicks, 7 snares, 5 claps, 5 hats, 3 open hats, 7 percs (cowbell, congas, tambourine, vox "hey"…), 5 FX (crash, reverse crash, riser, down sweep, impact) |
| **20 instruments** | Grand Keys, Soul Rhodes, Gospel Organ, Nylon Guitar, Dark Pad, Movie Strings, Soul Choir, Pluck, Pluggnb Keys, Dark Bell, Music Box, Drill Flute, Rage Lead, Soul Horns, plus 808 Clean / Punchy / Distorted / Long, Smooth Sub and Reese |
| **10 records to sample** | Dusty Soul Keys, Soul Choir "Ooh", Vintage Strings, Church Organ, Soul Horn Stabs, Lo-Fi Guitar, Dark Bells, Rage Synth Arp, Drill Flute, Vocal "Ahh". Or load your own file, drag one in, or record with the mic. |

## Why it's easy

* **You can't play a wrong note.** The piano roll only shows notes in your key. Change the key or scale and every melody, 808 and matched sample moves with it.
* **Sampling is two sliders.** *Speed* (record-player style, so faster also means higher; tick *Keep pitch* to change only the tempo) and *Pitch*. **✦ Match my tempo** and **✦ Match my key** detect the sample's BPM and key and fit it to your beat. New samples are matched automatically.
* **Chop with one click.** Cut into 4 / 8 / 16 even pieces or *on the hits*, play them as pads (keys 1–0), then add them to the beat as a loop or as chops on the grid.
* **✦ on every track** writes a part for you: drum patterns for that sound, 9 chord progressions (Sad, Dark Trap, Heavenly, Soul Classic, Drill Menace…), a melody over your chords, an 808 that follows your kick, a fresh chop flip.
* **Trap-ready drums.** The Rolls tool turns a hit into a ×2 / ×3 / ×4 roll; Loudness makes hits soft or hard; Swing adds bounce.
* **808 slides.** Overlap two 808 notes and it glides between them.
* **Chord mode** places a whole in-key chord with one click.
* **A hint line** at the bottom explains whatever you point at. Undo/redo everything.
* **Song mode.** Four patterns (A–D), arranged in a strip of blocks.
* **Export WAV** with an ending: *Just stop*, *Slow-mo final hit* (one last hit that drops into slow motion and fades away) or *Tape stop*. Preview it before you export.
* **Your work saves itself** in the browser. *Save* writes a `.beatlab.json` project, including your own audio files.

## Keys

`Space` play/stop · `A`–`L` play notes in key (`Z`/`X` octave; turn on ● Rec while playing to record them) · `1`–`0` play chops in the Sample Lab · `Ctrl+Z` / `Ctrl+Y` undo/redo · `Ctrl+S` save

## Code map

| File | What it does |
|---|---|
| `js/theory.js` | scales, chords, progressions, key detection (Krumhansl profiles), key matching |
| `js/dsp.js` | FFT, phase-vocoder time stretch, resampling, speed/pitch, tempo + onset detection, WAV/ZIP encoders |
| `js/sounds.js` | synthesized drum kit (rendered once), live instruments, 808s with glide, the built-in records |
| `js/engine.js` | mixer, look-ahead scheduler, swing, rolls, sample loops/chops, offline bounce and endings |
| `js/beats.js` | the beat library |
| `js/magic.js` | the ✦ generators |
| `js/lab.js` | Sample Lab |
| `js/app.js` | the studio UI |

`npm test` checks the theory/DSP code: key detection, pitch shift, time stretch, tempo detection and the encoders.
