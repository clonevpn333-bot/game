# GETAWAY! — progress, testing and outstanding work

This file is the honest status of the project. A mission is only marked **playable** when
its full sequence exists as real gameplay and has been run end to end.

## Vertical slice: status

| Area | Status | Notes |
|---|---|---|
| Port Sol open world | ✅ built | ~3.2 × 2.4 km, 7 districts, landmarks listed in the README. Generates in about 1 s. |
| Traffic | ✅ | Lane graph, signals, following distance, yielding, turn signals, panic, stuck recovery, highway, streaming spawn and parked cars |
| Pedestrians | ✅ | Up to 170 instanced. Sidewalk loops, crosswalks that wait for walk signals, plaza wandering, flee/cower/hands-up/dive/phone-in, vehicle knockdowns with ragdoll and get-up |
| Vehicles | ✅ 17 types | Procedural models, bicycle-model physics, gears, suspension, jumps, air control, rollovers, damage and deformation, glass, detachable parts, fire and explosions |
| ROSTR hyper-EV | ✅ (available from the start) | Wedge body, full-width light bars, giant wing, cold-gas thrusters (boost works in the air), electric whine |
| On-foot controller | ✅ | Jog, sprint, crouch, slide, jump, vault, mantle, swim, roof riding, hijack (also from a moving roof), bail out |
| Combat | ✅ | Pistol, SMG, shotgun, rifle, grenade launcher, melee. Tracers, shells, headshots, explosive barrels, drive-bys |
| Enemy AI | ✅ | Cover search, peek and shoot, flank roles, retreat, warm-up accuracy, window shooters, arrests |
| Police heat | ✅ | Witnesses, stars, out-of-sight dispatch, graph-pathing pursuit (ram, PIT, flank, block), roadblocks, helicopter with searchlight, LOS search and evade, fair busts, campaign escalation tier |
| Pursuit memory | ✅ | Escape method saved (highway, tunnel, swaps, water, foot, off-road, alley). Effects: highway roadblock bias, tunnel portal blocking, smarter car-swap tracking, plus dispatch "intel" messages |
| Audio | ✅ | All synthesized: engines (by vehicle type, gear shifts, backfires), Doppler sirens, tires, impacts, glass, guns, explosions, rotor, ambience, rain and thunder |
| Music | ✅ 13 tracks | Live sequencer with 5 intensity layers driven by heat and set pieces, stingers, and a soundtrack player with visualizer |
| Sky | ✅ | Day/night cycle, sun/moon, stars, clouds, weather (clear, cloudy, rain, storm with lightning, fog), wet roads, night window lights |
| FX | ✅ | Pooled particles, debris, glass shards, shells, tracers, flashes, shockwaves, decals, skid marks, rigid-body debris and props |
| UI | ✅ | Title, menu, campaign, garage with paint, soundtrack, settings, controls, pause, results with grade and records, fail/retry, HUD |
| Free roam | ✅ | Patrols, weapon and armor pickups, 12 hidden golden hubcaps (all 12 unlock the Vortice V12), weather cycle, down/busted respawn |

## Campaign

| # | Mission | Status |
|---|---|---|
| 01 | WRONG CAR | ✅ **playable**: 7 checkpoints, about 8 minutes (details below) |
| 02 | BANKROLL | ✅ Playable. Bank job: guards, vault, cash pallets, SWAT, back-door escape, highway roadblock, lose the cops. Smoke-tested start to results. |
| 03 | SHOPPING SPREE | ✅ Playable. Galleria at night: lift the key from LUXE JEWELS, lockdown shutters, Halcyon rappels through the skylight, firefight, steal the Vortice off the showroom podium, drive down the promenade under the closing shutter and through the glass doors, street chase (Halcyon SUVs + police heli), drive off the end of Sunstrip Pier, swim to Juno's boat. Smoke-tested start to results (`tests/m03_smoke.js`). Not hand-played on a real GPU. |
| 04 | ARMORED DELIVERY | ✅ Playable. Rain. Tail Halcyon's armored convoy in the Strada SV (stay 25–110 m), the Marrow crew ambushes it (escort explodes), wreck 3 Marrow muscle cars and the last escort, pull alongside the moving truck and leap aboard, drive the 9-ton truck through a police roadblock into the river tunnel, 90 s kill-switch countdown to Dez's garage, reveal. Smoke-tested start to results (`tests/m04_smoke.js`). Not hand-played on a real GPU. |
| 05–30 | (see menu) | ⏳ **not built yet.** Listed in the campaign screen and marked "in development". Not playable, **not** counted as done. |

### Mission 01: WRONG CAR (what you actually play)
1. **Cold open.** A cinematic orbit of a pearl-white ROSTR double-parked downtown. Steal it.
2. **Drive to Dez's garage.** Twist: it's Halcyon's prototype, broadcasting a tracker. Three black
   SUVs converge, with gunmen leaning out of the windows. Police join in after the shooting.
3. **Set piece.** Hard left into the construction site, hit the dirt ramp in slow motion, and the
   tower crane drops a steel beam onto the closest pursuer.
4. **Second twist.** On the way to the Galleria garage, Halcyon hacks the car and kills the engine
   remotely. Bail out.
5. **On foot.** Grab the case from the trunk while two more SUVs unload rifle teams. Fight or run.
6. **Rooftops.** Climb the fire escape, jump the alleys, mantle up a crate stack and cross the
   glass skybridge while a sniper shatters it around you. A police helicopter is overhead.
7. **Garage run.** Take the orange Bruiser V8 down four levels of ramps and smash out of the
   entrance into a 3-star pursuit.
8. **Escape.** Lose the cops (Dez suggests the Bayside tunnel), drive into Dez's garage, and watch
   the ending scene: the case holds a counting-down encrypted drive.

Fail states: you go down, you get busted, or you wreck the prototype before the kill switch.
Retry restarts instantly from the last checkpoint. Results show time, style points, biggest air,
near misses, takedowns, enemies downed, a grade, and personal bests.

## ROSTR model
Hand-modelled faceted body (`src/vehicles/rostr.js`), matched against the user's reference photos with a same-camera comparison (`tests/showroom.html?ids=rostr&dark=1&fov=15&cy=0.95&cz=9.3&ly=0.62`). Knife-edge nose + light bar, hood trapezoid, V facets with emissive gradient headlights (own shader, warmed at boot), wrap-around glass canopy, active rear wing (stowed in the deck, rises above ~80 km/h or under hard braking).

## How this was tested
All testing ran in headless Chromium (SwiftShader software GL) through Playwright scripts in
`tests/`:
- `tests/shot.mjs`, `tests/probe.mjs`: boot the game, evaluate state, take screenshots. No console errors on boot, title, free roam or mission start.
- `tests/showroom.html`, `tests/humans.html`: visual checks of every vehicle model and character pose.
- `tests/drive_test.js`, `tests/ramp_test.js`: physics scenarios. 0–85 km/h in 2 s (ROSTR), 203 km/h top run, cornering, handbrake drift, a head-on wall crash with deformation and glass, a 1.15 s ramp jump at 4.4 m, and a 20 s traffic soak with no NaN or lost vehicles.
- `tests/profile.js`: CPU cost per frame in free roam with 35 cars and 170 pedestrians was **~7.6 ms** (without rendering).
- `tests/m01_smoke.js` + `tests/m01_tail.js`: step the Mission 01 script through every checkpoint, using teleports to satisfy objectives. **Result:** all 7 checkpoints advance in order (steal → ambush with 3 armed SUVs → construction jump/crane → kill switch → case → fire escape → rooftops/skybridge → garage loaner → 3-star pursuit → escape → hideout → ending scene). The mission completes, the results screen shows grade A, records save and unlocks apply. Starting directly at any checkpoint (`?mission=m01&cp=N`) also works.
- Bugs found and fixed by these tests: a camera scratch-vector clash, roads reported as off-road (lower grip), mission stats missing when starting at a checkpoint, and limb geometry rendering 3× too long.
- These tests check that the script **runs**; they don't check that it's **fun**. I haven't played it with a real keyboard, so tuning (difficulty, enemy accuracy, timing) still needs hands-on play. Enemy fire can kill the player during the teleport-based test, so the tail test uses god mode.

**Limitation:** the headless browser can't measure real GPU frame rate or audio output. That
needs a real desktop browser. The music and SFX code runs without errors, but I have not heard
it.

## Known limitations / next up
- Missions 05–30 are not built. Next group: **Act I (02–06)**, reusing the bank, mall, armored
  truck, construction tower and citywide pursuit systems already in the city.
- Regions outside Port Sol (desert, Italy, Alps and so on) aren't built yet.
- Aircraft and boats aren't drivable yet; models exist only for the police helicopter.
- Pedestrians don't drive cars. Drivers are implied, except when you hijack (the driver gets yanked out).
- Performance on weaker GPUs: use Settings → Quality Low/Medium and lower traffic and pedestrian density.
