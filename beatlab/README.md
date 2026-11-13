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

Four packs built by measuring each reference song (official 30-second previews, used for analysis only):
tempo by grid-matching onsets, key from a pitch-class profile, the kick/snare/hat grid per frequency band,
the 808's pitch, length and overtones, the tonal balance in six bands, stereo width and loudness.
Each starter beat was then rendered and measured the same way, and tuned until the low end, width,
loudness and 808 behaviour landed near the reference. Every sound is synthesized by BeatLab and every melody
is newly written; nothing is sampled or copied from the records.

| Pack | Reference | What was measured → what's in the pack |
|---|---|---|
| **Yeat Pack** | “Monëy so big” | 138 BPM, C#, clipped 808 that rings ~0.3 s with odd overtones, dark and nearly mono → **Tonka Bell** (struck FM bell with tubular partials and stereo detune), 808 Rage, rage kick/clap/hats, laser zap, “yeah” ad-lib, ~30 sounds |
| **Drake Pack** | “God’s Plan”, “Nonstop” | 77 BPM with a short, heavily saturated 808 at C1; 155 BPM with a long warm 808, off-beat hats, very loud and mono → **Muted Keys**, **OVO Pad**, soft snaps/claps/shakers, 808 Short & Dirty, 808 Long Warm, two starter beats |
| **A$AP Rocky Pack** | “Jukebox Joints” | 74 BPM, G minor, no sub (bass guitar around A2–D2), mid-heavy soul sample → **Jukebox Soul** record (Rhodes + horn section + “ooh” vocal), **Trumpet**, **Horn Section**, **Bass Guitar**, dusty swung drums, vinyl scratch |
| **Fever Pack** | “Fever”, fakemink | 115 BPM, C major, a long bass that slides up into notes, warm low-mids, wide and airy → **Sliding Bass**, Air Pad, glass bells, bouncy drums, vox chops |

## Your own sounds (works like FL Studio's Browser)

* **Add Folder to Browser** (Mac app: Sounds tab, File menu or ⌘⇧F): link any folder of samples. It appears under **My Folders** with its real subfolders, nothing is copied, and right-click → Refresh picks up new files.
* **Import a pack** (.zip, folder or files): it keeps its own folder structure and is stored inside BeatLab.
* **Drag sounds anywhere:** from the Browser or straight from Finder.
  * Onto a row in **Beat** → that row plays the sound.
  * Onto empty space in **Beat** → a new channel per file.
  * Onto the **Song** timeline → an audio track.
  * Long loops become audio tracks automatically.

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
