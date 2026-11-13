# BeatLab

A beat maker for Mac that's laid out like Logic Pro and works like FL Studio, built so you can use it the first time you open it.
Every drum, instrument and record in the library is synthesized in code, so it works offline. You can also import your own audio and sound packs.

## Get the Mac app

**Download it:** open the repository's **Actions** tab → **BeatLab Mac app** → the latest run → *Artifacts* → **BeatLab-mac**.
Unzip it, open `BeatLab-2.0.0-mac.dmg` and drag BeatLab into Applications.
It is a universal app for both Apple Silicon and Intel Macs.

The app isn't notarized by Apple (that needs a paid Developer ID), so the first time you open it, right-click BeatLab → **Open** → **Open**.
If macOS says the app "is damaged", run this once in Terminal:

```bash
xattr -cr /Applications/BeatLab.app
```

**Or build it yourself** on a Mac (Node 18+):

```bash
cd beatlab
npm install
npm run app          # run it
npm run mac          # build dist/BeatLab-2.0.0-mac.dmg
```

**Or use it in a browser** with nothing installed: run `npm start` (then open http://localhost:5174), or double-click `index.html`.

## The window

Big tabs, one job each, so you never see everything at once:

| Tab | What you do there |
|---|---|
| **Sounds** (F4) | Drop in a beat pack, start from a BeatLab Pack or a template, browse every sound |
| **Beat** (F6) | Click squares to place drums. **Write Drums for Me** fills in a pattern |
| **Melody** (F7) | Draw notes, chords and 808s; only notes in your key are shown |
| **Sample** (F8) | Speed and pitch sliders, Match my tempo / key, chop into pads |
| **Song** (F5) | Paint patterns and audio along the timeline. Play plays the whole song here |
| **Mix** (F9) | Volume, pan and reverb per sound, then Export |
| **Test** (F10) | Three finished demo songs made with the BeatLab Packs: *Bankroll Bells* (Big Money), *Static Heat* (Fever), *Coin Slot Soul* (Jukebox). Play them, open them to see how they're built, or export them |

The top bar has play, record and an LCD showing what Play plays (LOOP or SONG), the position, tempo and key, plus a live spectrum.
Channel lights flash on every hit, and the per-row buttons stay hidden until you hover a row.

## BeatLab Packs

Original kits and starter beats in the style of three songs. The sounds are synthesized by BeatLab, and the drums and melodies are newly written; nothing is sampled or copied from the records. Tempo and key are style estimates, not measured from the songs.

| Pack | Inspired by | What's in it |
|---|---|---|
| **Big Money** | “Money So Big”, Yeat | Blown-out kick and 808, bright clap, crispy hats, metal ping, rage riser, a shiny **Rage Bell** synth. 150 BPM |
| **Fever** | “Fever”, fakemink | Round kick, snap snare, ticking hats, air hat, vox chop, reverse air, an **Air Pad**, glass bells, sliding 808. 155 BPM |
| **Jukebox** | “Jukebox Joints”, A$AP Rocky & Kanye West | Dusty kick and snare, hats, rim, tambourine, crash, and a **Jukebox Soul** record (keys + high “ooh” vocal) that gets sped up like a chipmunk-soul flip. 90 BPM |

## Your own sounds

* **Audio tracks:** use *Import Audio* in the Playlist, ⌘I, or drag WAV/MP3/AIFF/FLAC/M4A files onto the Playlist. Each one becomes a clip on its own track with its own mixer strip.
* **Sound packs:** use the import button next to *Sound Packs* in the Browser. Import a `.zip`, a folder, or a handful of files. BeatLab sorts them into Kick, Snare, Clap, Hi-Hat, Open Hat, 808, Perc, FX and Loops from their names and lengths. One-shots work like any drum, and loops go on the Playlist or into the Sample Lab.

Your audio and packs are stored inside the app on your Mac, so they're there next time.

## Saving

* **Save** (⌘S) keeps the project in **My Projects** (in the Browser and under File → Open). The status bar and window title show whether there are unsaved changes.
* **Save Project File…** writes a single `.beatlab` file that includes your audio tracks, samples and pack sounds, so you can back it up or move it to another Mac. Double-click it in Finder to open it.
* Your last session also restores itself when you reopen the app.

## Export

* **Mixdown:** one 44.1 kHz, 16-bit stereo WAV of the pattern (×4) or the whole song.
* **Stems** (⌘⇧E): one WAV per channel and per audio track, all the same length, in a zip, ready for any DAW.
* **Endings:** *Just stop*, *Slow-mo final hit* or *Tape stop*, with a preview.

## Keys

`Space` play/stop · `Return` to start · `B` Browser · `F6` `F7` `F8` `F9` editors · `A`–`L` notes in key (`Z`/`X` octave) · `1`–`0` chops in the Sample Lab · `Delete` removes the selected Playlist clip · ⌘Z / ⌘⇧Z undo/redo · ⌘S save · ⌘O open · ⌘I import audio · ⌘E export

## Code map

| File | What it does |
|---|---|
| `js/theory.js` | scales, chords, progressions, key detection, key matching |
| `js/dsp.js` | FFT, phase-vocoder time stretch, resampling, tempo and onset detection, WAV/ZIP encoders |
| `js/sounds.js` | synthesized drums, instruments, 808s with glide, the built-in records |
| `js/engine.js` | mixer, look-ahead scheduler, Playlist playback, offline bounce, endings |
| `js/media.js` | IndexedDB storage: audio tracks, sound packs (zip reader, auto-sorting), project library |
| `js/playlist.js` · `js/browser.js` · `js/lab.js` | Playlist, Browser, Sample Lab |
| `js/beats.js` · `js/magic.js` | template library, the ✦ generators |
| `js/app.js` | control bar, Channel Rack, Piano Roll, Mixer, saving, export, Mac menu bridge |
| `desktop/` | the Mac app: Electron window, menu bar, Save dialogs, file opening, icon |

`npm test` checks the theory and DSP code. `.github/workflows/beatlab-mac.yml` builds the Mac app on every push.
