# GETAWAY!

A cinematic open-world action game for the browser, built from scratch on Three.js.
Steal cars, drive fast, fight on foot, run the rooftops and escape a police force that
learns how you escape. Every model, texture, sound effect and music track is generated
procedurally in code. There are no external art or audio assets.

## Run it

You need a local web server, because ES modules don't load from `file://`. Node 18 or later
is enough; there are no npm dependencies.

```bash
cd getaway
node tools/serve.mjs 8080
# open http://localhost:8080
```

Any static server also works, for example `python3 -m http.server`. Three.js r170 is vendored
in `vendor/three`, so the game runs offline. A recent Chrome, Edge or Firefox with WebGL2 is
recommended. Press **F3** in game to show the FPS and entity counters.

### Handy URL parameters (for testing)
| param | effect |
|---|---|
| `?mission=m01&cp=3` | jump straight into a mission (optionally at a checkpoint) |
| `?free=1&car=rostr&x=0&z=-100` | free roam at a position in a given car |
| `&h=21` / `&w=rain` | time of day / weather (`clear, cloudy, rain, storm, fog`) |

## Controls
**On foot:** WASD move · Shift sprint · Space jump/vault/climb · C crouch (slide while sprinting) ·
mouse look · RMB aim · LMB fire · R reload · V melee · 1–5/Q/wheel weapons · F enter/hijack (also from
the roof of a moving car) · E interact.

**Driving:** W throttle · S brake/reverse · A/D steer · Space handbrake · Shift boost (earned
by stunts) · WASD in the air for pitch and roll · RMB+LMB drive-by · C camera views · B look back ·
H horn · F exit (at speed you bail out) · E flip an overturned car · Esc pause.

Gamepads are supported (standard mapping, with rumble).

## What's in the build
- **Port Sol**, a procedural city of about 3.2 × 2.4 km. Districts: Meridian Downtown (glass
  towers), Galleria shopping, Palisade Heights suburbs, Ironside Docks, Sunstrip Beach and pier,
  Railside and the Crown Hills. Landmarks include a river with three bridges (one suspension
  bridge), a 12 m elevated highway with ramps, the Bayside tunnel under the river, a rail line
  with level crossings and a station, an international airport, a construction site with a
  tower crane, a 4-level parking garage, a rooftop parkour route with a skybridge, a
  drive-through mall, a bank with a vault, police HQ and Dez's garage.
- **Living streets**: around 35 traffic cars on a lane graph with signals, yielding,
  following distance and turn signals; about 20 parked cars; and up to 170 pedestrians. People
  wait for walk signals, flee gunfire, cower, put their hands up when you aim at them, phone
  the police, dive away from speeding cars, and ragdoll and get back up after a hit.
- **17 drivable vehicles** with lofted bodies, wheel arches, glass with pillars, interiors,
  opening doors and a light rig (head, brake, indicator, reverse and police bar). Handling uses
  a bicycle model with tire slip, weight transfer, gears, suspension, jumps with air control
  and rigid-body rollovers. Damage includes deformation, cracked and shattered glass, bumpers
  and doors that fly off, smoke, fire and explosions. The **ROSTR** hyper-EV has cold-gas
  thrusters that push even in mid-air.
- **On foot**: jog, sprint, crouch, slide, jump, vault, mantle, swim, ride on vehicle roofs,
  hijack and bail out.
- **Combat**: 5 weapons (pistol, SMG, shotgun, rifle, grenade launcher) plus fists. Includes
  hitscan, tracers, shell ejection, headshots, explosive barrels, and enemy AI that uses cover,
  peeks, flanks, retreats and shoots from car windows.
- **Police heat**: stars, witnesses, dispatch from out of sight, pursuit drivers that path the
  road graph and PIT, flank and block, plus roadblocks and a searchlight helicopter. Escapes run
  through a line-of-sight search zone, and arrests are fair. **Pursuit memory** records how you
  escape (highway, tunnel, car swaps and so on) and police tactics adapt across sessions.
- **Adaptive procedural soundtrack**: 13 original tracks across 5 intensity layers that follow
  gameplay, plus a soundtrack player. Every sound effect is also synthesized: engines with gear
  shifts and backfires, Doppler sirens, tires, glass, impacts, guns and explosions.
- **Stunts**: big air, flips, near misses, oncoming, drifts, takedowns and smash-throughs. They
  refill boost and feed a combo score.
- **UI**: title, main menu, campaign select, garage with paint, soundtrack, settings, controls,
  pause, results with grades and records, and fail/retry. In game there's a rotating minimap,
  speedometer and subtitles.

See **[PROGRESS.md](PROGRESS.md)** for exactly what is finished, how it was tested, and what
is still to come.

## Code map
```
src/core      context, input, audio (SFX synth), music (sequencer), camera, renderer, save, stunts
src/world     layout, city generator, infrastructure, landmarks, textures, static collision, sky, props, signals
src/vehicles  types (roster), models (procedural), vehicle (physics/damage), manager (collisions/wheels/audio), traffic
src/characters humanoid (rig/animation/ragdoll/instanced renderer), player, peds
src/combat    combat (weapons/hitscan/explosions), npcs (enemy AI)
src/police    police (heat, dispatch, pursuit AI, helicopter, memory)
src/missions  framework, campaign list, m01, freeroam
src/ui        hud, menus
tests/        headless Playwright probes (screenshots, physics scenarios, mission smoke test)
```
