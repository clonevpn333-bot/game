# HOLLOW TIDE

An atmospheric miniature-horror puzzle-platformer for the browser. A 55 cm child
in an ember-orange raincoat crosses a half-sunken coastal rendering facility
built for owners four metres tall. No dialogue, no HUD — the story is staging,
scale and light.

**Play it:** download [`hollow_tide.html`](hollow_tide.html) and open it in any
modern browser. Three.js r160 loads from cdnjs; if you clone the repo, the
vendored copy in `vendor/` lets it run fully offline. No build step, no install.

## Controls

| | |
|---|---|
| Move | WASD / arrows |
| Sprint | Shift (she tires) |
| Sneak | C |
| Jump / mantle / release | Space |
| Grab, interact, climb, drag | E (hold to drag) |
| Raise the lantern | hold Q — brighter, but the Warden sees it |

## The rules of the dark

- **The Warden** hears. Metal grates ring, wet cloth is silent. Sprinting is loud,
  landings are louder. Hide under furniture and behind curtains; kick a can to
  send him elsewhere. He is faster than you in the open.
- **The Renderers** are blind and deaf. They feel your steps through the floor.
  Crawl, or move when steam masks the plates. They cannot feel what isn't
  touching the ground.
- **The Chorus** ignores you — until you stand in the queue's way.
- Black water is not water.

Five acts, thirteen rooms, ten hidden ember stubs. Checkpoints are silent and
automatic; the save lives in `localStorage`.

## Engineering notes

Single self-contained HTML file (~4,400 lines), organised into banner-commented
modules: CONFIG · UTILS · MERGE · TEXTURES · MATERIALS · GEO_FACTORY ·
CHARACTERS · INPUT · PHYSICS · CAMERA · FX · ROOMS · SAVE · AUDIO · POST ·
GAME_LOOP · SELF_TEST.

- All geometry procedural — lathe profiles (64 radial segments), seeded-fbm
  vertex displacement, static batching to one draw call per material per room.
- All textures painted on offscreen canvases (1024² for hero surfaces): wood
  grain, rust, grime, bandage wrap, raincoat wear.
- All audio synthesized in WebAudio: brown-noise drone filtered per room, rain,
  per-surface footsteps, the Warden's groans and a detuned string cluster that
  rises while he hunts.
- Custom post chain (no example-addon dependencies): linear HDR render target →
  bright pass → separable blur → composite with ACES, film grain, vignette,
  edge chromatic aberration and a breathing vignette when something is hunting.
- Rooms stream (current ± 1); geometry and textures are disposed on unload.
- Fixed side-on cinematic camera on a per-room rail with parallax drift,
  scripted push-ins and reveal holds.

## Self-test

Open `hollow_tide.html?test=1` — 183 assertions build every room, validate the
character rigs, physics, save round-trip, palette discipline and the post
pipeline, and print a pass/fail table to the console and the page.
