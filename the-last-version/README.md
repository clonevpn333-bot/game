# THE LAST VERSION

*Every time you learn the rules, the world changes them.*

A browser-playable 3D action-adventure (three.js, plain ES modules, no build step) in which the
genre itself changes as reality rewrites around the player. This folder contains the **multi-genre
vertical slice**: the title screen and Chapters 1–3, played as one continuous adventure with no level
select between them.

| # | Chapter | Genre | What you actually do |
|---|---------|-------|----------------------|
| 1 | **WRONG TURN** | High-speed driving action | Escape Civic Security through a dusk city: traffic, ramming interceptors, roadblocks, the Air-1 helicopter and its searchlight, hiding under the Covered Market — until the avenue bends up into the sky and a wall of water takes the car. |
| 2 | **BELOW THE STORM** | Naval action / vehicle survival | The car is rewritten into a gunboat underwater. Ride Gerstner storm swells between drowned towers, survive a collapsing skyscraper, fight ATLAS patrol RIBs with a mouse-aimed bow gun (component damage: engine / gunner / hull), disable the research ship's turrets, jump the stern ramp, then cross the listing deck on foot to free Sera. |
| 3 | **ROOM 611** | First-person survival horror | Unarmed, in a hotel that used to be the ship's passageway. Physical doors you drag open with the mouse, a dying flashlight, a phone call through the walls, hiding in wardrobes and under beds, holding your breath — while the Clerk listens, looks, searches and hunts. Make a room that doesn't exist exist, and go through the door inside it. |

## Running it

Any static file server from this folder, then open `index.html`:

```bash
cd the-last-version
```

```bash
python3 -m http.server 8000
```

Then browse to `http://localhost:8000/`. Use headphones. A desktop browser with WebGL2 is required;
gamepads work for driving and the boat.

Developer shortcuts (URL parameters): `?chapter=2` jumps to a chapter, `&cp=hunters` to a checkpoint,
`&quality=low|medium|high|ultra` overrides the graphics preset.
Checkpoints: Ch1 `start, air, fold` · Ch2 `start, hunters, meridian, boarding` · Ch3 `start, phone, power, door611`.

## Controls

* **Driving** — W/S throttle & brake/reverse · A/D steer · Space handbrake · Shift nitrous · C camera · R flip around when stopped
* **Boat** — W/S throttle · A/D rudder · mouse look & aim · LMB fire (watch the heat) · Shift boost · Space trim / launch off a swell
* **On foot (deck)** — WASD · mouse · Shift run · E interact (hold E to pry)
* **Hotel** — WASD · mouse · Shift run (it hears you) · C crouch · F flashlight · E interact / hide · hold LMB on a door and move the mouse to swing it · hold Space to hold your breath while hidden · hold Q to raise the Anchor
* Dialogue choices: 1–4 or click. Esc pauses (restart from checkpoint, settings, save & quit).

## How it is built

```
src/
  engine/      renderer + post (bloom, grading, CA, speed blur, "rewrite" glitch), assets (PBR sets,
               triplanar, HDRI, glTF), input (KB/mouse/pad), UI (subtitles, choices, objectives), sky, FX
  audio/       Web Audio engine: buses, convolution reverb, synthesised SFX (engines, sirens, rotor,
               crashes, gunfire, splashes, thunder, footsteps, creaks, heartbeat) and an adaptive score
  characters/  SDF "digital clay" sculpting → surface nets → AO + bone weights; humanoid rig with face
               bones; procedural animator (planted-foot gait IK, moods, look-at, blinks, expressions,
               talking, hand poses, ponytail springs); garment details (raised seams, stitching, zippers,
               laces) projected onto the cloth surface; the cast (Kai, Sera, Venn, the Clerk)
  vehicles/    lofted car bodies with panel/glass textures and real wheel assemblies; slip-angle car
               physics + OBB collisions; deep-V boat hulls, RIBs, the research ship; rigid-body buoyancy
  chapters/    ch1 (city generator, facade & wet-road shaders, traffic, police, helicopter, the bend),
               ch2 (ocean, rain, combat), ch3 (hotel builder, doors, the Clerk)
  game/        director (chapter flow, checkpoints, fail/retry, pause), state & saves, menu
```

Notable techniques:

* **One reality warp for GPU and CPU.** In Chapter 1 the city literally curls up around a horizontal
  axis. City shaders bend vertices; cars, the camera and the helicopter are placed through the same
  function on the CPU, so physics stays simple while everything you see bends consistently.
* **Facade shader.** Every building window is drawn in-shader with frames, mullions, sills, blinds and
  an interior-mapped room behind the glass (lit or dark per room), over photo-scanned PBR walls.
* **Gerstner ocean shared with physics.** The same wave set drives the vertex shader and the boat's
  hull-point buoyancy (with horizontal-displacement inversion), so boats ride the waves you see.
* **The Clerk** hears footsteps, door slams and breath through walls; sees light and movement; walks a
  room/corridor graph; investigates, searches the hiding places nearest the noise (and goes straight to
  the one it watched you enter), opens doors, and chases.
* **Saves** are written at every checkpoint (localStorage); *Continue* resumes the exact checkpoint;
  story flags (e.g. how you answered Sera, whether you read Venn's log) persist across chapters.

## Honest status

What works end to end: title → Ch1 (cinematic intro, 3 gameplay phases, flood ending) → Ch2
(underwater rewrite intro, storm, two combat waves, ship assault, boarding, rescue with a dialogue
choice, escape) → Ch3 (transition-in, full puzzle chain, the Clerk, ending doorway) → end-of-slice
card. Checkpoints, retries, pause, settings and save/continue work. All three chapter transitions were
exercised in automated headless runs.

Known limitations, stated plainly:

* **Characters** are sculpted procedurally (no external character assets). They have modelled noses,
  lips, ears, eyelids, teeth, brows, sculpted hair, layered clothing with real seams/stitching/zippers
  and a face rig with expressions — but they are stylised and not yet at the level of a hand-sculpted
  premium game character; faces in particular share one base topology and read as caricatures up close.
  They are also heavy (~350–450k triangles each). The first time a character is built it costs a
  few seconds of CPU (≈7 s on the development container); the result is cached in IndexedDB, after
  which it builds in well under a second.
* **Animation** is fully procedural (IK gait, poses, springs). It avoids foot sliding and has weight
  shifts, but there are no authored mocap clips; climbing, getting-up and other contextual animations
  from the brief are not implemented.
* **Performance** has only been measured in a software renderer during development (where it is far
  below real-time); it has not yet been profiled on a real GPU at 1440p. Use the quality preset if needed.
* **Chapter length**: Ch1 and Ch2 each run roughly 6–9 minutes for a first playthrough, Ch3 roughly
  7–10. Some beats (e.g. the Ch2 ship interior) are compressed compared with the design brief.
* **Audio** is entirely synthesised at runtime — original, but it sounds synthetic rather than like a
  recorded orchestra. There is no voice acting; dialogue is subtitled.
* Chapters 4–15 are not built. The slice ends at the doorway into Chapter 4 (*The Fallen King*).

## Developer pages

`viewer.html?who=kai,sera,venn,clerk&view=face|full&expr=happy` (character viewer),
`carview.html?type=gt|police|sedan|hatch|van` and `citytest.html` render single assets for inspection.

## Assets and licences

All third-party assets are CC0 (Poly Haven) or MIT (three.js) and are listed per file with authors in
[`ASSETS.md`](ASSETS.md). `tools/fetch-assets.mjs` re-downloads them from the manifest and
`tools/compress-textures.py` recompresses them. Everything else — characters, vehicles, the city, the
ship, the hotel architecture, shaders, music and sound — is original work in `src/`.
