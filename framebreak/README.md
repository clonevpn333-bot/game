# FRAMEBREAK

*One universe. Too many ways to exist.*

A browser action-adventure in which the format of the game itself changes chapter by chapter — pixel art, hand-drawn cartoon, papercraft, isometric physics, a 1996 raycaster, voxels, modern 3D, claymation, comics — as one continuous story about Rin, Vell and the Curator.

## Play

- **No install:** open `dist/framebreak.html` (whole game, with menu) or `dist/chapterN.html` (boots straight into chapter N). Each is one self-contained file.
- **From source:** `node tools/serve.mjs` → http://localhost:5180
- **Rebuild the single files:** `ESBUILD=/path/to/node_modules/esbuild node tools/build.mjs`

F3 toggles the performance overlay. Esc pauses and lists the current chapter's controls.

## Chapter status (honest)

All ten chapters are playable start to finish and hand over to the next one. They are not equally deep: 1–3 got the most design and verification time; 4–10 were built faster and tested with short scripted smoke runs only.

| # | Chapter | Format / renderer | State |
|---|---------|-------------------|-------|
| 1 | Pixel Panic | 320×180 palette pixel art, Canvas2D, integer scaled | Most complete. Full level, 4 enemy types, train set piece, 3-phase boss, grid-tear transformation. Each section verified by scripted play. ~7–9 min. |
| 2 | Ink & Violence | Vector cartoon with boiling lines, squash/stretch | Stretch-grab/throw, swing, flatten, punch, The Press boss, ink flood. Smoke-tested. ~5–7 min. |
| 3 | Fold the World | three.js papercraft, shadow-mapped | Fold tower, turntable, pop-up tabs, accordion bridge, rearranging theater. Smoke-tested. ~5–7 min. |
| 4 | Domino City | three.js isometric + cannon-es rigid bodies | Three-stage chain-reaction puzzle with several solutions. Dominoes use a constrained hinge model; the train smash is authored. ~3–5 min. |
| 5 | 1996 | Software raycaster: 64px textures, floor/ceiling casting, lamp-lit banded shading, 10-frame enemies | One level: doors, secret wall, rotating room, key, 3 enemy types. ~3–5 min. |
| 6 | Block Collapse | Chunked editable voxels with a texture atlas and per-vertex ambient occlusion; voxel-built characters | Dig, build, structural collapse, pursuing Leveler, 5 obstacles. ~3–5 min. |
| 7 | Full Resolution | three.js PBR with procedural albedo/normal/roughness maps, façade kit, jointed IK rig | Parkour course: slide, vault/mantle, moving roofs, grapple, Reframer chase. ~4–6 min. |
| 8 | Clay Heart | Sculpted clay meshes with fingerprint normal maps, 12 fps posing, jointed hands | Flat / tall / long / mass puzzles, sculptor's hands. ~3–4 min. |
| 9 | Break the Page | Inked comic: hatched sets, spot blacks, halftone screen, newsprint, Canvas2D | Four pages of panel-order causality puzzles. ~3–4 min. |
| 10 | Framebreak | three.js, shared post-FX (bloom, grade, MSAA) | Rebuilt as a three-act 3D finale: **The Getaway** (arcade driving with drift-boost through four format districts), **The Courier** (gliding between erased islands and restoring each one), **The Missing City** (exploration by pulse, no combat, then a held choice and three endings). Smoke-tested per act. ~12–15 min. |

Total is roughly 45–60 minutes, not the 80–100 the full design calls for.

## Asset fidelity (honest)

Everything is authored in code; there are no external art, audio or texture files.

- **Pixel art** is real palette-indexed pixel art: hand-typed stamps plus keyframed poses with pixel-exact limbs, baked to atlases at load. It is not painted in an art tool.
- **Cartoon and comic art** are procedural vector drawings with jittered "boil". Expressive, but not frame-by-frame hand animation.
- **Textures** in chapters 5–10 are generated in code at load time (pixel-painted 64px tiles for the raycaster; canvas height fields turned into normal and roughness maps for the 3D chapters). They are not photo-sourced or hand-painted in an art tool.
- **3D models** are assembled from primitives and extruded shapes. Chapter 7's Rin has a full joint hierarchy, IK legs, fingers, eyelids and layered clothing, but it is a stylised primitive-built figure, not a sculpted skinned mesh.
- **Textures** are procedural canvases (concrete, brushed metal, paper fibre, fingerprints). No scanned PBR materials are used.
- **Music** is original, written as note data and synthesised live with WebAudio. I could not listen to it in this environment — it was composed by theory and checked only for running without errors.
- **Lighting/post**: every 3D chapter renders through a shared HDR pipeline (MSAA, bloom, tilt-shift for the dioramas, vignette, grade, grain).
- **Performance** was only measured under software rendering in headless Chromium. Real-GPU frame rates are untested.

## Known gaps

- Chapters 4–10 are shorter than their 7–12 minute targets and have had no full human playthrough.
- Transformations 1→2 and 2→3 are playable set pieces; later ones are shorter authored hand-overs (frozen-frame dissolve plus an in-engine effect).
- Chapter 7 has no vehicles and only light combat. Chapter 6 has no enemy AI beyond turrets.
- Cross-format persistence is limited to story flags and the finale's shared objects.
- Fonts fall back to system faces; the cartoon lettering looks best where Comic Sans / Chalkboard is installed.

## Layout

```
src/core     game loop, input, save, director (chapter + transformation sequencing), dialogue
src/audio    synth engine, sequencer, SFX, songs
src/ui       menus
src/chN      one folder per reality, each with its own renderer, physics and controls
vendor       three.js (MIT), cannon-es (MIT)
tools        static server, single-file build, headless playtest driver
```
