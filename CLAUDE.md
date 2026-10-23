# Project rules (from the owner)

## MARCHLIGHT (`marchlight/`)

- **No pre-made human models, ever.** Do not use Blender, MakeHuman or any other downloaded
  or generated-elsewhere character meshes or assets. The owner hates the "fake human Blender
  model" look. Every character is built by us in code: sculpted as signed distance fields
  (`src/characters/anatomy.js`, `src/characters/sculpt.js`), rigged in `src/characters/rig.js`
  and animated procedurally in `src/characters/anim.js`. Improve these rather than importing
  anything.
- The same goes for the rest of the game: no paid or downloaded assets, and no Blender. Textures,
  geometry, audio and animation are procedural.
- Test changes in the actual game (headless Playwright via `tools/play.mjs`, `tools/shot.mjs`,
  `tools/strip.mjs`, `dev/rig.html`) before calling anything finished.
