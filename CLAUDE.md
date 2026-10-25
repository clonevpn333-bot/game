# Project rules (from the owner)

## MARCHLIGHT (`marchlight/`)

- **No pre-made human models, ever.** Do not use Blender, MakeHuman or any other downloaded
  or generated-elsewhere character meshes or assets. The owner hates the "fake human Blender
  model" look. Every character is built by us in code.
- **Characters are made of simple shapes** (the owner's call): rounded boxes and other basic
  primitives, one per body part, rigidly attached to the skeleton in `src/characters/rig.js` and
  animated procedurally in `src/characters/anim.js`. Faces are blocks too (block eyes that squash
  to blink, block brows, a block mouth that opens with the jaw). No sculpted or realistic bodies.
- The same goes for the rest of the game: no paid or downloaded assets, and no Blender. Textures,
  geometry, audio and animation are procedural.
- Test changes in the actual game before calling anything finished, and keep checks fast and
  cheap (the owner noticed hours-long test runs):
  - `node tools/poses.mjs` — one sheet of character poses from `dev/rig.html` (~10 s).
  - `node tools/scene.mjs <beat> --secs N --frames K [--use "Talk to X"]` — one contact sheet of a
    cutscene played in real game time at 640x360, plus a one-line-per-frame text log (~1-3 min).
  - `node tools/music.mjs [cue ...] --secs N` — renders score cues offline (WAV/MP3 + spectrogram + loudness
    per 5 s, plus render time: keep cues well under realtime). `dev/music.html` is a jukebox.
  - `tools/play.mjs tests/playthrough.mjs` for the full prologue; `tests/film.mjs` films every
    cutscene but is slow, so prefer `scene.mjs` per beat.
