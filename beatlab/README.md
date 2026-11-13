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

| | |
|---|---|
| **Control bar** | Transport (to start, play, stop, record), an LCD with position, tempo (drag, type or tap), key and scale, the Pattern/Song switch, master volume, Save and Export |
| **Browser** (B) | Templates, My Projects, Drums, Instruments, Records, your Audio Tracks and Sound Packs. Click to hear, double-click or **+** to use, drag onto a channel or the Playlist |
| **Playlist** | Arrange your song: paint patterns into the timeline and drop in audio tracks (songs, vocals, stems). Drag clips to move them, drag the right edge to lengthen, right-click to delete. Click the ruler to set where Song mode starts |
| **Channel Rack** (F6) | The step sequencer. Each channel has an on/off light, solo, ✦ "write it for me", options, sound picker and volume. Up to 32 patterns |
| **Piano Roll** (F7) | Notes locked to your key; chord mode; overlap 808 notes to slide; play your computer keyboard (A–L) and record |
| **Sample Lab** (F8) | Speed and pitch sliders, Match my tempo, Match my key, chop into 4/8/16 pads, reverse, record with the mic |
| **Mixer** (F9) | A vertical strip for every channel and audio track (volume, pan, reverb, mute, solo), plus master punch and lo-fi |

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
