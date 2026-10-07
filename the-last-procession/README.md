# The Last Procession

A third-person cinematic linear adventure built with Three.js, designed to play like an interactive animated movie.

Every three hundred years the **Processionals**, colossal ancient walking machines, wake and cross the world. This time the largest of them kneels in the capital, opens its chest, and a girl named **Lyra** falls out. You play **Kael**, the royal guard told to escort her while armies, a bell-cult and every giant on the planet converge.

## Run it

```bash
cd the-last-procession
npm install
npm run dev        # http://127.0.0.1:5188
npm run build      # production build -> dist/
npm run preview    # serves dist/ at http://127.0.0.1:4188
```

Add `?all` to the URL to unlock every chapter in **Chapters**. Progress is saved in `localStorage`.

## Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Move / steer / climb | WASD or arrow keys | left stick |
| Jump (and leap on horseback) | Space | Jump |
| Strike | J or left click | Strike |
| Dodge-roll / slide | Shift or K | Dodge |
| Interact / catch / hold on | E or F (hold during a giant's step) | Act |
| Advance dialogue | Space, E, Enter or click | tap |
| Dialogue choices | 1 / 2 / 3 or click | tap |
| Pause | Esc or P | pause button |

## The film (8 reels)

| # | Chapter | You play | Character beat |
| --- | --- | --- | --- |
| Prologue | The Kneeling | run through the crowd to catch the falling girl | first words: "Is this the outside?" |
| 1 | The City Walks | escape the avenue while the Pilgrim walks through the city: falling masonry, stomp shockwaves, an alley fight, running beneath its stride, a collapsing bridge | "Can you ride?" |
| 2 | Beneath the Antlered | horseback: dodge hoof-falls, jump rubble and a ravine, unseat Bellwarden riders, a slow-motion pass under the stag's belly | dusk on the ridge |
| 3 | Embers | short night exploration: gather wood, light the fire, look out at the lantern-lit procession | campfire conversation with choices |
| 4 | The Iron Pilgrimage | train-roof fight, jumping between cars, sliding under signal gantries, while two Processionals battle beside the line | observation-deck banter |
| 5 | The Carillon | climb the leg of a walking temple; hold on when it steps; dodge steam vents and a swinging bell | "It's letting us in." |
| 6 | The Fall | steer a free-fall through rotating gear rings, then the **reveal**: the world is one machine | "I was the note." |
| 7 | The Last Procession | cross the battlefield between armies and giants, duel High Cantor Vesk on the Pilgrim's palm, then the final walk | farewell (with a choice), epilogue, credits |

## How it is built

- **Everything is procedural.** No model, texture, image or audio files are downloaded or bundled. Characters, giants, cities, skies, music and SFX are all generated in code.
- `src/game/Chapter.ts` is the abort-safe async "film script" API: `say`, `choose`, `cut`, `animate`, `walkTo` and `segment` (playable beats that restage themselves instantly from a checkpoint on failure).
- `src/game/CameraDirector.ts` is the cinematographer: hard cuts or eased blends between fixed, dolly, orbit, follow and tracking shots, plus trauma shake and FOV punches. Set pieces map controls to the path direction, so camera cuts never flip "forward".
- `src/world/Processional.ts` contains the giants (the Pilgrim, the Antlered and the Carillon). They walk with a planted-foot gait, fire stomp events, and expose `predictLanding()`, which drives the exact footfall telegraphs.
- `src/actors/Character.ts` is the stylized toon character rig: per-bone merged meshes with ink outlines and procedural pose blending for about 20 animation modes.
- `src/core/Audio.ts` is a Web Audio score sequencer with 11 mood presets and a recurring leitmotif, plus synthesized SFX and ambience beds.

## QA hooks

- `window.__THREE_GAME_TEST_HOOKS__.setState(name)` fast-forwards to a named beat. Names include `title`, `kneeling`, `catch`, `city-escape`, `city-fight`, `city-bridge`, `horse-ride`, `campfire`, `campfire-talk`, `train-fight`, `climb`, `fall`, `reveal`, `battlefield`, `duel` and `finale`.
- `window.__LAST_PROCESSION_QA__.simulate(seconds, { stopAtChapter })` runs a headless fixed-step bot playtest. The bot plays with the same input intents a person uses.
- `npm run inspect:canvas -- --manifest artifacts/evidence.json --url http://127.0.0.1:4188` runs the canvas inspector. Set `PW_EXECUTABLE_PATH` if your Playwright Chromium build differs.

See `artifacts/final-evidence.md` for test results, captures and the visual scorecard.
