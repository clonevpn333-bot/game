# MARCHLIGHT

*Nothing stays still. Not even home.*

A cinematic third-person action-adventure that runs in the browser. You play Rook, a Runner living on **Meridian**, a city that walks across a dying world on four 300-metre legs.

This folder holds the first playable slice: **the Prologue, "The City That Never Sleeps"**. It runs from Rook waking up in their apartment to the MARCHLIGHT title card. Chapter One ("Underfoot") hasn't been built yet. When the prologue ends, the game says so.

## Running it

Everything is static: no build step and no downloads at runtime. Three.js and the Rapier physics engine are vendored in `vendor/`.

```bash
cd marchlight
node tools/serve.mjs 8080      # or any static file server
# open http://localhost:8080/
```

Use a desktop browser with WebGL2 (Chrome, Edge, Firefox or Safari 16+). Headphones are recommended, since all audio is synthesized live.

### Controls

| Key | Action |
|---|---|
| W A S D · Mouse | Move · look |
| Shift | Hurry / sprint |
| Space | Jump, climb a ledge, mantle. Airborne with a charged cell: **Kinetic Leap** |
| C | Crouch / drop from a ledge |
| F | Talk / use / **latch** the tether line onto a blue-ring anchor |
| E (hold) | **Tether: capture** momentum from anything with an amber ring |
| Q | **Tether: release** all stored momentum into your target, along your aim |
| RMB · LMB · R · V | Aim · fire · reload · melee |
| 1 / 2 · X · wheel | Switch weapon |
| Z (hold) | Visor zoom |
| J | Journal (objective, people, story so far) |
| Esc | Pause |

Gamepads are supported through the standard mapping.

### The Kinetic Tether's rules

- You can only take momentum from things that are actually moving: pistons, flywheels, swinging weights, charging machines, falling trams. Machinery fills cells fast; loose objects give only what they were carrying.
- The tether stores up to **3 cells**. Release dumps every cell into the aimed target as an impulse along your aim. With no target, it becomes a short kinetic blast.
- A cell spent in mid-air is a Kinetic Leap.
- Latching is separate. You fire a line at an anchor and get reeled in, and anything you latch onto carries you with it.

## What's in the slice

- **Meridian.** Four animated legs with real IK walk a lateral-sequence gait. Every footfall is heard, felt as camera shake (delayed by the speed of sound), and leaves a footprint crater that trails behind the city on the scrolling terrain. There is also a hull, a skyline, the Crown, and the suspended engine.
- **Playable districts.**
  - Rook's apartment, with a customization mirror.
  - The Residential Terraces, with neighbours and kids playing with a physics ball.
  - The Market: Odile's Kitchen, a busker whose tune is the game's theme, vendors and crowds.
  - The tram line, which dives through the deck. You ride it.
  - The Lower Decks: the piston hall, the Underwell, and Tomas's Engine Control gallery.
  - The Runner Bay and the firing range.
  - The exterior Spine, Pylon 7 on Leg Two's hip, and the Undercroft.
- **Characters.** Rook (customizable), Nia, Bram, Tomas, Odile, Sefa, Mrs. Okafor, the kids Pell and Juno, the tram crew, and Commander Harrow on the radio. All are procedural skinned rigs with expressive faces (blinks, brows, talking mouths, look-at) and procedural animation for locomotion, climbing, aiming, conversation gestures and ambient activities.
- **Choices.** Choices change dialogue and are tracked silently through hidden trust, warmth and spark values; there are no meters. Some examples: buying Nia a honey knot, how you talk to Tomas, whether you push him to come to dinner, and whether you or Dace catches Ivo.
- **Combat.** There are two weapons with recoil, reloads and procedural sound. There are three scavenger machines:
  - **Gnats** strafe, dodge when aimed at, and telegraph their bursts.
  - **Leeches** have armored fronts and lunge; you can fling them off the hull.
  - **Shearers** charge. Capture the charge with the tether to stall one.
- **The emergency.** A cable snaps, and saving the work tram is fully playable in three stages: brake clamps, redirecting the fall into a crane, and getting the crew out. Then comes Callow Reach.

## Code map

```
src/core/       engine (renderer + post), input, procedural audio & score, Rapier wrapper, textures, materials
src/characters/ rig (skinned procedural humanoid), anim (procedural animator), npc (actors, crowds)
src/player/     player controller, camera rig, kinetic tether
src/combat/     weapons, enemies, fx
src/world/      city (gait, legs, exterior), ground, sky, districts (city, lower decks, spine), tram, props/light pool
src/story/      director (cutscenes), dialogue, interact, state/save, cast, prologue, rescue set piece
src/ui/         hud, menus (title, creator, pause, settings, journal)
tests/          headless Playwright scenarios (arena, world tour, full prologue playthrough)
```

## Tests

`tools/play.mjs` runs a scenario in headless Chromium using SwiftShader. Scenarios step the game deterministically through `__game.advance(seconds)`.

```bash
node tools/play.mjs tests/arena.mjs "http://localhost:8080/index.html?test=arena"
node tools/play.mjs tests/playthrough.mjs "http://localhost:8080/index.html?beat=wake"
```

`?beat=<name>` jumps straight to a prologue beat. The beats are `wake`, `terraces`, `market`, `tram`, `lower`, `hangar`, `range`, `spine`, `galleryB`, `relay`, `rescue` and `title`.
