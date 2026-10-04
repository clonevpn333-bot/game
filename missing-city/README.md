# THE MISSING CITY

A cinematic third-person story game built with Three.js. Eleven years ago, the city of Bellwether vanished with 2.3 million people. Tonight, at 2:17 AM, it came back, intact and empty. You play Elias Vale, the only person who ever got out.

## Run it

```bash
cd missing-city
npm install
npm run dev        # http://127.0.0.1:5188
npm run build      # production build in dist/
npm run preview    # serve the production build on http://127.0.0.1:4188
```

Click the game to capture the mouse. Desktop keyboard/mouse (standard gamepad layout also works).

| Action | Key |
| --- | --- |
| Move / look | WASD / mouse |
| Sprint · crouch | Shift · C (or Ctrl) |
| Jump · vault · mantle · climb | Space (contextual) |
| Interact / examine | E |
| Enter an Echo | Q |
| Flashlight | F |
| Aim · fire · reload | RMB · LMB · R |
| Melee · dodge roll | V (or LMB when not aiming) · X / Alt |
| Skip line · pause | Enter · Esc / P |

## Story structure

Prologue + 11 chapters + epilogue, each a hand-scripted location:

1. **The Return**: helicopter over the black earth, Orchard Street, the Quik-Stop security monitor, the first Echo
2. **Empty Streets**: the ringing phone, the Halvorsen lobby keypad Echo, the broken footbridge, the city walking to the centre
3. **The Subway**: power failure, the ghost train, the empty train, first Remnants
4. **Home**: Maple Row, the Vale house, "Eli?"
5. **The Hospital**: stealth past blind Remnants, an Echo through a door that used to be open, seventeen minutes of decay
6. **The Collapse**: Meridian Tower, the Echo elevator ride, four realities, the helicopter crash
7. **Project Orpheus**: the lab, the Structure, Voss's confession
8. **The Other Bellwether**: floating city, frozen millions, the repeating corridor, what the Remnants are
9. **Reyes**: between realities
10. **Ellie**: seventeen minutes, the memory, the truth
11. **The Way Back**: everything at once
12. **2:17**: the choice, and the sunrise

## Tech

- `src/core`: renderer + post (bloom, cinematic grade, Echo distortion), input, custom capsule/OBB physics
- `src/render`: procedural textures, material library with Echo dissolve variants, static batching, storm sky, GPU rain, pooled lights, procedural env maps, VFX
- `src/actors/Characters.ts`: GLB characters with layered `AnimationMixer` locomotion/aim, ghost/Remnant/frozen looks, blink and jaw morphs
- `src/game`: player controller and camera, Echo system, Remnant AI (7 behaviours), combat, companions, story-script API (`Script`)
- `src/levels`: one file per chapter (world build + script)
- `src/audio/AudioEngine.ts`: all sound synthesised with Web Audio (rain, hums, phones, EAS tones, subway, Remnant voices, music box theme, piano, pads)

### Characters

`tools/blender/build_cast.py` builds every character headlessly in Blender 4.x on the CC0 MakeHuman base mesh and morph targets: per-character body and face morphs, clothing (zone inflation plus fitted collars, cuffs, belts and gear), a hair cap grown from the scalp, a 49-bone armature with fingers, automatic weights, procedural materials baked to PBR maps, facial expression morphs, and about 40 keyframed animations.

```bash
tools/blender/fetch_makehuman.sh                  # CC0 base mesh + targets
blender -b --python tools/blender/build_cast.py -- public/assets/characters
```

### Tests

```bash
node scripts/shot.mjs ch1:street ch3:platform     # named-state screenshots
node scripts/playthrough.mjs 0                    # autopilot run through the whole script
node scripts/perf.mjs 1 5                         # per-chapter fps / draw calls
```
